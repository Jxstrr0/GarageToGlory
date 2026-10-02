// v1.1 "Seats" (plan/plan_contract_1.1.md §4; handoff Part E). Stage 0 (lead) + Lane B: roles by seatRole, quits/returns
// into the drum seat, PART (sanitize / suggest / rate / similarity / modifiers), seat charts (contour lanes, holds, chords on
// Hard+, runs, thinning, two thumbs, spotlight), the session (holds, release, chords), the perfect bot 100 % per band x seat
// x difficulty + the avg bot's parity with drums, 3-year bot careers per band x seat (determinism), seat gear, seat
// achievements, seat reactions.
// Here: the contracts, the swap table (4 bands × 4 seats, E3), newCareer({ seat }), seat roles, the lineup, the six seat
// tokens (the drum seat reads exactly as v1.0), the seat / swapped gates and '@drummer', and the stage-0 stubs
// (gig.chart({ seat }) = the drum chart, GG.audio.seatKinds against the real timeline, no-op seat voices).
const fs = require('fs'), path = require('path');
const load = require('./_load');
const { test, ok, eq, done } = require('./_t');

const GG = load({ localStorage: load.fakeStorage() });
new Function('window', fs.readFileSync(path.join(__dirname, '..', 'src', '30_audio.js'), 'utf8'))({ GG: GG });   // the pure parts (no Web Audio)
const C = GG.contracts, K = GG.career, A = GG.audio;
const BANDS = ['hail_damage', 'frost_heave', 'gravel_kings', 'grid_road_ramblers'];
const SWAP = {   // handoff E3
  hail_damage: { drums: null, bass: 'kenji', rhythm: 'jaxon', lead: 'dana' },
  frost_heave: { drums: null, bass: 'moth', rhythm: 'rox', lead: 'benny' },
  gravel_kings: { drums: null, bass: 'tamara', rhythm: 'chase', lead: 'lenny' },
  grid_road_ramblers: { drums: null, bass: 'duke', rhythm: 'travis', lead: 'earl' }
};
const SINGS_FROM_KIT = ['rox', 'chase', 'travis'];   // S5 / S6: they sing from the kit
const career = (bandId, seat, seed) => K.newCareer({ seed: seed || 7, bandId, seat, player: { name: 'Seat Tester', nick: 'ST' } });
const TOK = '{instrument}|{drummer}|{gear}|{sticks}|{yourPart}|{seat}';

test('contracts: seats, lane caps, kinds per genre (confirmed against 30_audio), tokens, gates, aliases, gear looks', () => {
  eq(C.SEATS, ['drums', 'bass', 'rhythm', 'lead']);
  eq(C.SEAT_MAX_LANES, { drums: 6, bass: 5, rhythm: 6, lead: 6 });
  eq(C.SEAT_KINDS, {
    metal: { drums: ['drum'], bass: ['bass'], rhythm: ['gtr', 'gtr2'], lead: ['gtr', 'lead'] },
    punk: { drums: ['drum'], bass: ['bass'], rhythm: ['gtr'], lead: ['gtr', 'lead'] },
    rock: { drums: ['drum'], bass: ['bass'], rhythm: ['gtr2', 'clean'], lead: ['gtr', 'lead'] },
    country: { drums: ['drum'], bass: ['bass'], rhythm: ['clean'], lead: ['twang'] }
  });
  ['instrument', 'drummer', 'gear', 'sticks', 'yourPart', 'seat'].forEach(t => ok(C.TOKENS.includes(t), 'token ' + t));
  C.SEATS.forEach(s => eq(Object.keys(C.SEAT_TOKENS[s]), ['instrument', 'gear', 'sticks', 'yourPart', 'seat'], 'SEAT_TOKENS.' + s));
  eq(C.SEAT_TOKENS.drums, { instrument: 'drums', gear: 'kit', sticks: 'sticks', yourPart: 'the beat', seat: 'drums' });
  eq(C.SEAT_GATE_KEYS, ['seat', 'swapped']);
  ok(C.ROLE_ALIASES.includes('@drummer'), '@drummer alias');
  C.SEATS.slice(1).forEach(s => ok(C.GEAR_SHAPES[s].length >= 3 && new Set(C.GEAR_SHAPES[s]).size === C.GEAR_SHAPES[s].length, s + ' has 3+ unique body shapes (E14)'));
  ok(C.GEAR_SHAPES.rhythm.includes('acoustic'), 'country rhythm can hold the acoustic');
  eq(Object.keys(C.GEAR_LOOK), ['shape', 'color', 'guard', 'sticker']);
  ok(C.GEAR_GUARDS.includes(C.GEAR_LOOK.guard), 'default guard is a guard');
});

test('the swap table: 4 bands × 4 seats (E3), the data in bands.js, nobody else ever moves', () => {
  BANDS.forEach(b => C.SEATS.forEach(s => eq(K.seatSwap(b, s), SWAP[b][s], b + ' / ' + s)));
  eq(K.seatSwap('gravel_kings', 'rhythm'), 'chase', 'Gravel Kings rhythm: Chase drums + sings (S5)');
  BANDS.forEach(b => {
    const band = GG.content.bands[b], ids = band.members.map(m => m.id);
    eq(band.seats, { bass: SWAP[b].bass, rhythm: SWAP[b].rhythm, lead: SWAP[b].lead }, b + ' seats table');
    Object.values(band.seats).forEach(id => ok(ids.includes(id), b + ': ' + id + ' is a member'));
  });
  ['clementine', 'marcel'].forEach(id => ok(!BANDS.some(b => Object.values(GG.content.bands[b].seats).includes(id)), id + ' never swaps'));
  eq([K.seatSwap('hail_damage', 'vocals'), K.seatSwap('hail_damage', null), K.seatSwap('no_such_band', 'bass')], [null, null, null], 'unknown seat / band');
});

test('newCareer({ seat }): seat, seat roles, seat gear (string seats only), gearLook; the drum seat swaps nobody', () => {
  BANDS.forEach(b => C.SEATS.forEach(seat => {
    const s = career(b, seat), sw = SWAP[b][seat], w = b + '/' + seat;
    eq(s.seat, seat, w);
    s.members.forEach(m => eq(m.seatRole, m.id === sw ? (SINGS_FROM_KIT.includes(m.id) ? 'drums/vocals' : 'drums') : m.role, w + ' ' + m.id));
    eq(s.members.filter(m => /^drums/.test(m.seatRole)).length, sw ? 1 : 0, w + ': one member on the kit (none on drums)');
    eq(s.members.length, GG.content.bands[b].members.length, w + ': band size never changes');
    if (seat === 'drums') eq(s.gear, { lanes: 4, doubleKick: false, owned: [], sections: [], quality: 0 }, w + ': v1.0 gear, exactly');
    else eq([s.gear.seatLanes, s.gear.runs], [{ bass: 4, rhythm: 4, lead: 4 }, { bass: false, rhythm: false, lead: false }], w + ' seat gear');
    eq(s.player.gearLook, C.GEAR_LOOK, w + ' gearLook default');
    eq([K.seatLanes(s), K.seatRuns(s)], [4, false], w + ' seat lanes / runs');
  }));
  eq(K.newCareer({ seed: 3, player: { name: 'x' } }).seat, 'drums', 'default seat');
  eq(K.newCareer({ seed: 3, seat: 'vocals', player: { name: 'x' } }).seat, 'drums', 'no vocals seat (E13)');
  const rngs = C.SEATS.map(seat => career('frost_heave', seat, 99).rng);
  ok(rngs.every(r => r === rngs[0]), 'the seat never touches the career RNG at newCareer: ' + rngs);
});

test('lineup: the player first, then the active members with their stage role', () => {
  eq(K.lineup(career('hail_damage', 'drums')), [{ id: 'player', seatRole: 'drums' }, { id: 'marcel', seatRole: 'vocals' },
    { id: 'dana', seatRole: 'lead guitar' }, { id: 'jaxon', seatRole: 'rhythm guitar' }, { id: 'kenji', seatRole: 'bass' }]);
  eq(K.lineup(career('hail_damage', 'bass')).map(x => x.id + ':' + x.seatRole), ['player:bass', 'marcel:vocals', 'dana:lead guitar', 'jaxon:rhythm guitar', 'kenji:drums']);
  const gk = career('gravel_kings', 'rhythm');
  eq(K.lineup(gk).map(x => x.id + ':' + x.seatRole), ['player:rhythm', 'chase:drums/vocals', 'lenny:guitar', 'tamara:bass'], 'still four (E3)');
  eq([K.drummerId(career('hail_damage', 'drums')), K.drummerId(gk), K.swapped(gk)], [null, 'chase', 'chase']);
  const hd = career('hail_damage', 'lead'); hd.members.find(m => m.id === 'dana').status = 'quit';
  eq([K.drummerId(hd), K.swapped(hd), K.lineup(hd).length], [null, 'dana', 4], 'the swapped drummer quit: nobody on the kit (Lane B: the drum-seat hole)');
});

test('tokens: the drum seat reads exactly as v1.0; string seats read their seat and the drummer', () => {
  const drums = career('hail_damage', 'drums');
  eq(K.fillText(drums, TOK), 'drums|you|kit|sticks|the beat|drums', 'drum seat');
  const old = JSON.parse(JSON.stringify(drums)); delete old.seat;
  eq(K.fillText(old, TOK), 'drums|you|kit|sticks|the beat|drums', 'a state with no seat field');
  eq(K.fillText({}, TOK), 'drums|you|kit|sticks|the beat|drums', 'no state');
  eq(K.fillText(career('hail_damage', 'bass'), TOK), 'bass|Kenji|bass rig|picks|the bass line|bass');
  eq(K.fillText(career('gravel_kings', 'rhythm'), TOK), 'guitar|Chase|rig|picks|the riff|rhythm guitar');
  eq(K.fillText(career('grid_road_ramblers', 'lead'), TOK), 'guitar|Earl|rig|picks|the lead|lead guitar');
  const fh = career('frost_heave', 'rhythm'); fh.members.find(m => m.id === 'rox').status = 'away';
  eq(K.fillText(fh, '{drummer}'), 'the drummer', 'nobody on the kit');
  BANDS.forEach(b => eq(K.tokenValue(career(b, 'drums'), 'drummer'), 'you', b + ' {drummer} on drums'));
});

test('gates: seat / swapped in gatePasses, cardOk (gate or top level, cameo too), speakerOk(line), @drummer', () => {
  const drums = career('hail_damage', 'drums'), bass = career('hail_damage', 'bass'), P = (s, g) => K.gatePasses(s, g);
  const cases = [[{ seat: ['drums'] }, true, false], [{ seat: ['bass', 'lead'] }, false, true], [{ seat: 'bass' }, false, true],
    [{ swapped: true }, false, true], [{ swapped: 'kenji' }, false, true], [{ swapped: 'dana' }, false, false],
    [{ swapped: ['dana', 'kenji'] }, false, true], [{ swapped: false }, true, false], [{ seat: ['bass'], swapped: 'kenji' }, false, true]];
  cases.forEach(([g, d, b]) => eq([P(drums, g), P(bass, g)], [d, b], JSON.stringify(g)));
  const card = (x) => Object.assign({ id: 'seat_t_' + Math.random().toString(36).slice(2), type: 'weird', speaker: 'marcel', title: 't', text: 't', choices: [] }, x);
  const dOnly = card({ gate: { seat: ['drums'] } }), sOnly = card({ seat: ['bass', 'rhythm', 'lead'] }), cam = card({ cameo: true, gate: { swapped: true } });
  eq([K.cardOk(drums, dOnly), K.cardOk(bass, dOnly)], [true, false], 'gate.seat');
  eq([K.cardOk(drums, sOnly), K.cardOk(bass, sOnly)], [false, true], 'top-level seat');
  eq([K.cardOk(drums, cam), K.cardOk(bass, cam)], [false, true], 'a cameo card still honours the seat gates');
  eq([K.cardOk(drums, card({})), K.cardOk(bass, card({}))], [true, true], 'ungated cards are unchanged');
  const line = { who: 'marcel', text: 'Hit the {gear}.', seat: ['drums'] };
  eq([K.speakerOk(drums, 'marcel', line), K.speakerOk(bass, 'marcel', line), K.speakerOk(bass, 'marcel')], [true, false, true], 'speakerOk(line)');
  eq([K.speakerOk(drums, 'kenji', { swapped: 'kenji' }), K.speakerOk(bass, 'kenji', { swapped: 'kenji' })], [false, true], 'a swapped-drummer line');
  eq([K.roleOf(drums, '@drummer'), K.roleOf(bass, '@drummer')], [null, 'kenji']);
  eq([K.speakerOk(drums, '@drummer'), K.speakerOk(bass, '@drummer')], [false, true], "'@drummer' speaks only when someone is on the kit");
  eq(K.cardRoles(bass, card({ speaker: '@drummer' })), { '@drummer': 'kenji' });
  eq([K.seatOk(bass, null), K.seatOk(bass, {}), K.seatOk(drums, { seat: [] })], [true, true, false]);
});

test('audio: seatKinds = C.SEAT_KINDS (copies), every listed kind is one the timeline writes, seat voices are no-op stubs', () => {
  C.GENRES.forEach(g => C.SEATS.forEach(seat => eq(A.seatKinds(g, seat), C.SEAT_KINDS[g][seat], g + '/' + seat)));
  eq([A.seatKinds('polka', 'bass'), A.seatKinds('metal', 'vocals')], [['bass'], ['drum']], 'unknown genre -> metal, unknown seat -> drums');
  const k = A.seatKinds('metal', 'rhythm'); k.push('x'); eq(C.SEAT_KINDS.metal.rhythm, ['gtr', 'gtr2'], 'a copy');
  C.GENRES.forEach(g => {
    const p = JSON.parse(JSON.stringify(GG.songs.signature(g)));
    p.sections.solo = p.sections.verse.slice(); p.sections.outro = p.sections.chorus.slice();
    p.arrangement = ['verse', 'chorus', 'bridge', 'solo', 'chorus', 'outro'];
    const seen = new Set();
    [undefined, 'ballad'].forEach(style => A.timeline(p, { genre: g, songId: 's1', style }).events.forEach(e => seen.add(e.kind)));
    C.SEATS.forEach(seat => C.SEAT_KINDS[g][seat].forEach(kind => ok(seen.has(kind), g + '/' + seat + ': the timeline writes ' + kind)));
  });
  const strums = A.timeline(GG.songs.signature('country'), { genre: 'country', songId: 's1' }).events.filter(e => e.kind === 'clean');
  ok(strums.length && strums.every(e => Array.isArray(e.strum)), "country 'clean' = the acoustic strum (ev.strum)");
  eq([A.pluck(40, 0, { len: 1 }), A.strum(40, 0), A.lead(64, 0, { hold: true }), A.release(null, 0)], [null, null, null, null], 'no Web Audio in node: the voices return null');
});

// ---- Lane B (plan_contract_1.1 §5 Lane B acceptance) ----------------------------------------------------------------
const GENRE = { hail_damage: 'metal', frost_heave: 'punk', gravel_kings: 'rock', grid_road_ramblers: 'country' };
const STR = ['bass', 'rhythm', 'lead'], DIFFS = ['easy', 'normal', 'hard', 'expert'];
const jammed = (b, seat, seed) => { const s = career(b, seat, seed || 7); for (let i = 0; i < 2; i++) GG.songs.jam(s, GG.RNG((seed || 7) * 10 + i)); return s; };
// Rock rhythm and country lead are too sparse on today's timeline (§1.4 #1/#3): Lane D's seat layers (opts.seat) fill
// them. The density / avg-bot parity checks cover a band x seat once its timeline has the layer (>= 1 event per bar).
function layered(b, seat) {
  const s = career(b, seat), song = s.songs[0], c = GG.gig.chart(song, { seat, genre: GENRE[b], difficulty: 'hard', thumbs: false });
  return (c.total + c.auto.length) >= song.pattern.arrangement.length * C.BARS_PER_SECTION;
}

test('roles by seatRole: front / solo (the player on lead) / fill (never the drummer, never you) / drummer, per band x seat', () => {
  BANDS.forEach(b => C.SEATS.forEach(seat => {
    const s = career(b, seat), r = GG.gig.roles(s), w = b + '/' + seat, sw = SWAP[b][seat];
    ok(r.front && s.members.some(m => m.id === r.front && /vocals/.test(m.seatRole)), w + ': a singer fronts (from the kit too) ' + r.front);
    if (seat === 'lead') eq(r.solo, 'player', w + ': the solo is yours');
    else ok(r.solo && r.solo !== sw, w + ': the soloist is not on the kit ' + r.solo);
    ok(r.fill && r.fill !== 'player' && r.fill !== sw && r.fill !== r.solo, w + ': fill ' + r.fill);
    eq(r.drummer, seat === 'drums' ? 'player' : sw, w + ': roles.drummer');
    ok(!('drummer' in JSON.parse(JSON.stringify(r))), w + ': roles.drummer is not enumerable (v1.0 shape)');
    eq(K.tokenValue(s, 'bassist'), seat === 'bass' ? 'you' : K.memberName(s, K.roleOf(s, '@bassist')), w + ': {bassist}');
    if (seat === 'bass') eq(K.roleOf(s, '@bassist'), 'player', w + ': @bassist = you');
    if (seat === 'lead') eq([K.roleOf(s, '@soloist'), K.tokenValue(s, 'soloist')], ['player', 'you'], w + ': @soloist = you');
  }));
  const hd = career('hail_damage', 'drums');
  eq(GG.gig.roles(hd), { front: 'marcel', solo: 'dana', fill: 'jaxon' }, 'the drum seat: exactly v1.0');
  // an alias that resolves to you never speaks (no card / chat voiced by "you")
  const lead = career('grid_road_ramblers', 'lead');
  eq([K.speakerOk(lead, '@soloist'), K.speakerOk(career('hail_damage', 'bass'), '@bassist'), K.speakerOk(lead, '@front')], [false, false, true], 'speakerOk: your own seat never speaks');
  const n0 = lead.chat.length; K.postChat(lead, '@soloist', 'hi'); eq(lead.chat.length, n0, 'postChat: no message from yourself');
  eq(K.effectSummary({ mood: { '@soloist': 5 } }, lead), '', 'a mood effect on your own seat moves nobody');
});

test('quits / returns into the drum seat: the hole is the drums, a drummer recruit, the swapped drummer comes back to the kit', () => {
  const D = GG.drama, s = career('hail_damage', 'bass', 31);
  eq(D.roles(s), ['vocals', 'lead guitar', 'rhythm guitar', 'drums'], 'roles: your seat is never a hole, Kenji’s spot is the drums');
  eq(D.holes(s), [], 'no holes');
  eq(D.holder(s, 'drums').id, 'kenji', 'Kenji holds the drums');
  s.fund = 5000; s.protected = false;
  D.applyMember(s, { id: 'kenji', act: 'quit' });
  eq([D.holes(s), K.drummerId(s), K.fillText(s, '{drummer}')], [['drums'], null, 'the drummer'], 'Kenji quits: the hole is the drums');
  const fill = D.hireFillIn(s, 'drums');
  ok(fill && fill.name, 'a fill-in drummer');
  D.dismissFillIn(s, 'drums');
  const ad = D.postAd(s);
  eq(ad.role, 'drums', 'the ad is for a drummer');
  ok(ad.candidates.length === 3 && ad.candidates.every(c => c.role === 'drums'), 'three drummer candidates');
  const rec = D.hire(s, 0);
  eq([rec.role, rec.seatRole, K.drummerId(s), D.holes(s)], ['drums', 'drums', rec.id, []], 'hired: role + seatRole drums, on the kit');
  eq(K.fillText(s, '{drummer}'), K.memberName(s, rec.id), '{drummer} = the recruit');
  eq(GG.gig.roles(s).drummer, rec.id, 'roles.drummer = the recruit');
  const kenji = s.members.find(m => m.id === 'kenji');
  D.applyMember(s, { id: 'kenji', act: 'return' });
  eq([kenji.status, kenji.seatRole, K.drummerId(s), s.members.some(m => m.id === rec.id)], ['active', 'drums', 'kenji', false], 'Kenji returns to the drums; the recruit steps aside');
  // the drum seat: a quit leaves its content role (v1.0)
  const d = career('hail_damage', 'drums', 31); d.protected = false;
  D.applyMember(d, { id: 'kenji', act: 'quit' });
  eq(D.holes(d), ['bass'], 'drum seat: Kenji’s hole is the bass, as in v1.0');
  // Gravel Kings rhythm: Chase (vocals) on the kit: the hole is the drums
  const gk = career('gravel_kings', 'rhythm', 5); gk.protected = false;
  D.applyMember(gk, { id: 'chase', act: 'quit' });
  eq(D.holes(gk), ['drums'], 'Chase quits from the kit: the drums');
});

test('PART: sanitize keeps the part (rows clipped / padded, indexes clamped), suggest is deterministic, rate + similarity read it', () => {
  const P = GG.songs.part;
  eq(P.ROWS, { bass: 3, rhythm: 2, lead: 5 });
  C.GENRES.forEach(g => STR.forEach(seat => ['verse', 'chorus', 'bridge', 'solo', 'outro'].forEach(sec => {
    const a = P.suggest(g, seat, sec), b = P.suggest(g, seat, sec);
    eq(a, b, g + '/' + seat + '/' + sec + ' deterministic');
    eq(a.rows.length, P.ROWS[seat], 'rows');
    ok(a.rows.every(r => /^[x.]{16}$/.test(r)) && a.rows.join('').includes('x'), 'suggested rows have notes');
    ok(P.key(seat) in a, 'prog / hook index');
    const r1 = P.suggest(g, seat, sec, GG.RNG(9)), r2 = P.suggest(g, seat, sec, GG.RNG(9));
    eq(r1, r2, 'seeded suggest is reproducible');
  })));
  const pat = JSON.parse(JSON.stringify(GG.songs.signature('metal')));
  pat.part = { seat: 'bass', sections: { verse: { prog: 99, rows: ['x.x', 'xxxxxxxxxxxxxxxxxxxxxx', 'abc', 'extra'] }, chorus: { prog: -3, rows: [] } } };
  const s1 = GG.songs.sanitize(pat, null, 'metal');
  const list = GG.songs.genre('metal').backing.progressions;
  eq(s1.part.sections.verse.rows, ['x.x.............', 'xxxxxxxxxxxxxxxx', '................'], 'rows clipped / padded to 16 and to 3');
  eq([s1.part.sections.verse.prog, s1.part.sections.chorus.prog], [list.verse.length - 1, 0], 'indexes clamped');
  eq(s1.part.sections.bridge, P.suggest('metal', 'bass', 'bridge'), 'a missing section = the suggestion');
  eq(GG.songs.sanitize(s1, null, 'metal'), s1, 'idempotent');
  ok(!('part' in GG.songs.sanitize(GG.songs.signature('metal'))), 'a drum pattern never grows a part');
  eq(GG.songs.sanitize({ bpm: 120, part: { seat: 'drums', sections: {} } }).part, undefined, 'a drum "part" is dropped');
  // rate: seat signatures per genre
  const sig = (g, seat, rows, sec) => { const p = JSON.parse(JSON.stringify(GG.songs.signature(g))); p.part = P.full(g, seat, p); if (rows) p.part.sections[sec || 'verse'].rows = rows; return GG.songs.partRating(p, g); };
  const kickV = GG.songs.signature('metal').sections.verse[0];
  ok(sig('metal', 'rhythm', [kickV, '................']).groove > sig('metal', 'rhythm', ['.x.x.x.x.x.x.x.x', '................']).groove, 'metal rhythm: chugs locked to the kick score');
  ok(sig('punk', 'rhythm', ['................', 'x.x.x.x.x.x.x.x.']).groove > sig('punk', 'rhythm', ['................', 'x..x.xx..x.x.xx.']).groove, 'punk rhythm: steady 8ths');
  ok(sig('country', 'bass', ['x...............', '........x.......', '................']).groove > sig('country', 'bass', ['....x...........', '............x...', '................']).groove, 'country bass: root on 1, fifth on 3');
  ok(sig('rock', 'lead', ['x.......x.......', '..x.......x.....', '....x.......x...', '................', '................'], 'chorus').groove
    > sig('rock', 'lead', ['x...............', '..........x.....', '.....x..........', '................', '................'], 'chorus').groove, 'rock lead: a hook that repeats in the chorus');
  const r0 = GG.songs.rate(GG.songs.signature('metal'), 'metal'), rp = GG.songs.rate(s1, 'metal');
  ok(!('part' in r0) && rp.part && rp.part.groove >= 0, 'rate: part keys only with a part');
  // similarity: parts compare too
  const a = GG.songs.sanitize(Object.assign(GG.songs.signature('metal'), { part: P.full('metal', 'bass', GG.songs.signature('metal')) }), null, 'metal');
  const b = JSON.parse(JSON.stringify(a)); Object.values(b.part.sections).forEach(x => { x.rows = x.rows.map(() => 'x.x.x.x.x.x.x.x.'); x.prog = (x.prog + 1) % 3; });
  eq(GG.songs.similarity(a, a), 1, 'same song, same part');
  ok(GG.songs.similarity(a, b) < GG.songs.similarity(a, a) && GG.songs.similarity(a, b) >= 0.6, 'the same drums with a new part read less recycled ' + GG.songs.similarity(a, b));
  const c2 = JSON.parse(JSON.stringify(a)); c2.sections.verse = c2.sections.verse.map(() => 'x...............');
  ok(GG.songs.similarity(a, c2) <= GG.songs.similarity(GG.songs.sanitize(Object.assign({}, a, { part: undefined })), GG.songs.sanitize(Object.assign({}, c2, { part: undefined }))) + 1e-9, 'a part never makes a song read more recycled than its drums');
  eq(GG.songs.similarity(GG.songs.signature('metal'), GG.songs.signature('metal')), 1, 'drum songs: v1.0');
  // careers: every string-seat song carries a part (jams, starters), deterministic per song id
  STR.forEach(seat => {
    const s = jammed('frost_heave', seat), t = jammed('frost_heave', seat);
    ok(s.songs.every(x => x.pattern.part && x.pattern.part.seat === seat), seat + ': every song has your part');
    eq(s.songs.map(x => x.pattern.part), t.songs.map(x => x.pattern.part), seat + ': deterministic');
  });
  ok(jammed('frost_heave', 'drums').songs.every(x => !x.pattern.part), 'drum careers: no parts');
  // modifiers
  const m = P.modify(a, 'verse', 'lock', null, 'metal');
  const kick = a.sections.verse[0];
  ok(m.pattern.part.sections.verse.rows.every(r => [...r].every((ch, i) => ch === '.' || kick[i] === 'x')), 'lock to the kick: every note on a kick');
  ['double', 'ring', 'call'].forEach(id => ok(JSON.stringify(P.modify(a, 'chorus', id, null, 'metal').pattern.part.sections.chorus) !== JSON.stringify(a.part.sections.chorus), id + ' changes the part'));
  eq(P.choices('metal', 'bass', 'verse').length, list.verse.length, 'a choice per progression');
  ok(P.choices('metal', 'lead', 'chorus').every(c => typeof c.name === 'string' && c.name.length > 2), 'hooks in plain words');
});

test('charts per band x string seat x difficulty: seat kinds only, lanes <= cap, same pitch = same lane, holds, chords Hard+, runs with the gear, two thumbs, thinning, spotlight', () => {
  BANDS.forEach(b => STR.forEach(seat => {
    const s = jammed(b, seat, 11), g = GENRE[b], kinds = A.seatKinds(g, seat), cap = C.SEAT_MAX_LANES[seat];
    s.songs.forEach(song => {
      const counts = {};
      [4, cap].forEach(L => DIFFS.forEach(d => [false, true].forEach(runs => {
        const c = GG.gig.chart(song, { seat, genre: g, lanes: L, runs, difficulty: d }), w = b + '/' + seat + '/' + song.id + '/' + d + '/L' + L + (runs ? '/runs' : '');
        eq([c.seat, c.lanes, !!c.stub], [seat, L, false], w + ' chart');
        ok(c.notes.every(n => kinds.includes(n.kind)) && c.auto.every(n => kinds.includes(n.kind)), w + ': only ' + kinds);
        ok(c.notes.every(n => n.li >= 0 && n.li < L && n.lane === 'str' + n.li), w + ': lanes str0..' + (L - 1));
        const at = {};   // same pitch = same lane within an entry (judged + auto)
        c.notes.concat(c.auto).forEach(n => { const k = n.entry + '|' + n.midi; if (at[k] == null) at[k] = n.li; ok(at[k] === n.li, w + ': pitch ' + n.midi + ' entry ' + n.entry + ' one lane'); });
        ok(c.notes.every(n => !n.chord || ((d === 'hard' || d === 'expert') && seat === 'rhythm' && n.chord.length === 2 && n.chord[1] === n.li + 1 && n.chord[1] < L)), w + ': chords Hard+ (rhythm) only');
        ok(runs || c.notes.every(n => !n.run), w + ': no runs without the gear');
        ok(c.notes.every(n => !n.run || (n.hold && n.t2 > n.t && n.seq.length >= 1)), w + ': runs are holds with their notes');
        const hb = (d === 'easy' ? 2 : 1) * c.spb;
        ok(c.notes.every(n => !n.hold || n.run || n.len >= hb - 1e-6), w + ': holds >= ' + (d === 'easy' ? 2 : 1) + ' beat(s)');
        // two thumbs: at any head, the heads there + the holds still sounding <= 2
        c.notes.forEach(n => {
          if (n.free) return;
          const heads = c.notes.filter(x => !x.free && Math.abs(x.t - n.t) < 1e-6).reduce((t, x) => t + (x.chord ? 2 : 1), 0);
          const held = c.notes.filter(x => x.hold && !x.free && x.t < n.t - 1e-6 && x.t + x.len > n.t + 1e-6).length;
          ok(heads + held <= 2, w + ': two thumbs at ' + n.t.toFixed(2) + ' (' + heads + ' + ' + held + ' held)');
        });
        eq(c.total, c.notes.filter(n => !n.free).length, w + ': total');
        if (L === 4 && !runs) counts[d] = c.total;
        if (seat === 'lead' && c.solos.length) {   // the spotlight: only the solo kind in the solo bars
          const solo = A.soloFor(g, 'player') || 'lead';
          c.solos.forEach(x => ok(c.notes.filter(n => n.t >= x.t0 - 1e-6 && n.t < x.t1 - 1e-6 && !n.free).every(n => !kinds.includes(solo) || n.kind === solo), w + ': solo bars chart the solo kind'));
        }
      })));
      ok(counts.easy <= counts.normal && counts.normal <= counts.hard && counts.hard === counts.expert, b + '/' + seat + ': thinning easy <= normal <= hard = expert ' + JSON.stringify(counts));
    });
  }));
  // the drum seat (and no seat) charts exactly as v1.0; a node sim without 30_audio gets the stub
  const s = career('hail_damage', 'drums'), song = s.songs[0], base = GG.gig.chart(song, { difficulty: 'hard' });
  ok(!('seat' in base) && !('stub' in base), 'no opts.seat: no new keys');
  eq(GG.gig.chart(song, { difficulty: 'hard', seat: 'drums' }).notes, base.notes, 'seat drums = the drum chart');
  const tl = A.timeline; A.timeline = undefined;
  const st = GG.gig.chart(song, { difficulty: 'hard', seat: 'bass' }); A.timeline = tl;
  eq([st.stub, st.notes], [true, base.notes], 'without the timeline: the drum chart, stub: true');
  // runs: metal tremolo / punk 8ths merge with the gear
  const p = career('frost_heave', 'rhythm', 3), ps = p.songs[0];
  const withG = GG.gig.chart(ps, { seat: 'rhythm', genre: 'punk', runs: true, difficulty: 'hard' }), noG = GG.gig.chart(ps, { seat: 'rhythm', genre: 'punk', runs: false, difficulty: 'hard' });
  ok(withG.runs > 0 && withG.total < noG.total, 'punk 8ths: runs with the gear, thinned to the beat without ' + JSON.stringify([withG.runs, withG.total, noG.total]));
  ok(noG.notes.every(n => n.step % 4 === 0 || !noG.notes.some(x => x !== n && x.midi === n.midi && Math.abs(x.t - n.t) <= GG.gig.RUN_GAP + 1e-6)), 'without the gear a run keeps its on-beat onsets');
  // density: a first gig is playable (layered timelines: >= one judged note every 2 s on Easy, no dead bars on Hard)
  BANDS.forEach(b => STR.forEach(seat => {
    if (!layered(b, seat)) return;
    const s = jammed(b, seat, 5), c = GG.gig.chart(s.songs[0], { seat, genre: GENRE[b], difficulty: 'easy' });
    ok(c.total / c.duration >= 0.5, b + '/' + seat + ': Easy density ' + (c.total / c.duration).toFixed(2) + ' notes/s');
  }));
});

test('the session: holds (release gates, ring at the end, a new head ends a hold), 2-lane chords, gig:hold, results', () => {
  const s = jammed('hail_damage', 'rhythm', 17); s.songs.forEach(x => { x.pattern.bpm = 90; });
  const g = GG.gig.makeGig(s, 'legion_63', 'book'), S = GG.gig.session(s, g, null, { emit: true, difficulty: 'hard' }), ev = [];
  const off = GG.on('gig:hold', p => ev.push(p));
  const ch = S.startSong(), hold = ch.notes.find(n => n.hold && !n.run && !n.chord && n.len > 0.6), chord = ch.notes.find(n => n.chord && !n.hold);
  ok(hold && chord, 'a doom-tempo rhythm chart has holds and chords');
  // hold: tap, lift at 40 % -> held 0.4, no ring, no miss
  S.tick(hold.t - 0.01);
  const j = S.judge(hold.li, hold.t);
  ok(j && j.judgement === 'perfect' && S.holding(hold.li) === hold, 'the head judges like a tap and the lane holds');
  const r = S.release(hold.li, hold.t + hold.len * 0.4);
  ok(r && !r.ring && Math.abs(r.held - 0.4) < 0.01 && ev.length === 1 && ev[0].lane === 'str' + hold.li, 'an early lift: held 0.4, no ring, gig:hold ' + JSON.stringify(r));
  ok(!S.holding(hold.li) && hold.j === 1, 'the note stays a hit');
  eq(S.release(hold.li, hold.t + hold.len), null, 'nothing to release twice');
  // chord: one lane -> partial (no judgement), the other -> one hit
  S.tick(chord.t - 0.02);
  const c1 = S.judge(chord.chord[0], chord.t), c2 = S.judge(chord.chord[1], chord.t + 0.01);
  ok(c1.partial && c1.judgement === null && c2.judgement === 'perfect' && chord.j === 1, 'a chord: both lanes in the window = one Perfect');
  off();
  // a fresh song by the perfect bot: every head hit, the holds ring out
  const s3 = jammed('hail_damage', 'rhythm', 17); s3.songs.forEach(x => { x.pattern.bpm = 90; });
  const res = GG.gig.botPlay(GG.gig.session(s3, GG.gig.makeGig(s3, 'legion_63', 'book'), null, { emit: false, difficulty: 'hard' }), { accuracy: 1, jitterMs: 0, one: true }, GG.RNG(3));
  ok(res.accuracy === 1 && res.seat === 'rhythm' && res.holds > 0 && res.rings >= res.holds - 1, 'perfect bot: 100 %, the holds ring ' + JSON.stringify({ acc: res.accuracy, holds: res.holds, rings: res.rings }));
  // a chord tapped on one lane only = a Good, never a miss
  const s2 = jammed('hail_damage', 'rhythm', 17); s2.songs.forEach(x => { x.pattern.bpm = 90; });
  const S2 = GG.gig.session(s2, GG.gig.makeGig(s2, 'legion_63', 'book'), null, { emit: false, difficulty: 'hard' }), ch2 = S2.startSong();
  const cd = ch2.notes.find(n => n.chord);
  S2.tick(cd.t - 0.01); S2.judge(cd.chord[0], cd.t); S2.tick(cd.t + 1);
  eq(cd.j, 2, 'one lane of a chord = a Good');
  // drums: no new SONG_RESULT keys
  const d = GG.gig.botPlay(GG.gig.session(jammed('hail_damage', 'drums'), GG.gig.makeGig(s, 'legion_63', 'book'), null, { emit: false }), { accuracy: 1, one: true }, GG.RNG(1));
  ok(!('holds' in d) && !('seat' in d), 'drum song results: v1.0 keys');
});

test('perfect bot = 100 % on every band x seat x difficulty; the avg bot within 3 points of the drum seat (layered seats)', () => {
  BANDS.forEach(b => {
    const base = {};
    C.SEATS.forEach(seat => {
      const lay = seat === 'drums' || layered(b, seat), avg = [];
      DIFFS.forEach(d => {
        [[1, 0], [0.9, 40]].forEach(([acc, jit], k) => {
          let sc = 0, ac = 0, n = 0;
          for (let seed = 1; seed <= 3; seed++) {
            const s = jammed(b, seat, seed); s.drumSkill = 30; s.members.forEach(m => { m.mood = 70; });
            const r = GG.gig.botPlay(GG.gig.session(s, GG.gig.makeGig(s, 'legion_63', 'book'), null, { emit: false, difficulty: d }), { accuracy: acc, jitterMs: jit }, GG.RNG(seed));
            r.songResults.forEach(x => { sc += x.score; ac += x.accuracy; n++; });
          }
          if (k === 0) ok(ac / n === 1, b + '/' + seat + '/' + d + ': perfect bot ' + (ac / n));
          else avg.push(sc / n);
        });
      });
      const mean = avg.reduce((t, x) => t + x, 0) / avg.length;
      if (seat === 'drums') base.v = mean;
      else if (lay) ok(Math.abs(mean - base.v) <= 3, b + '/' + seat + ': avg bot ' + mean.toFixed(1) + ' vs drums ' + base.v.toFixed(1));
    });
  });
});

test('a 3-year bot career per band x seat: no exceptions, invariants, deterministic; seat gear follows the band’s kit', () => {
  BANDS.forEach(b => C.SEATS.forEach(seat => {
    const one = () => {
      const s = K.newCareer({ seed: 4242, bandId: b, seat, player: { name: 'Bot' } });
      for (let w = 0; w < 3 * C.WEEKS_PER_YEAR && !s.ended; w++) GG.career.botWeek(s, w % 2 ? 'good' : 'avg');
      return s;
    };
    let s, t;
    try { s = one(); t = one(); } catch (e) { ok(false, b + '/' + seat + ' threw ' + (e.stack || e).split('\n').slice(0, 3).join(' | ')); return; }
    const w = b + '/' + seat;
    ok(isFinite(s.fund) && isFinite(s.fans) && s.fund >= 0, w + ': sane numbers');
    eq(JSON.stringify(s), JSON.stringify(t), w + ': deterministic');
    if (seat !== 'drums') {
      const max = C.SEAT_MAX_LANES[seat];
      eq(K.seatLanes(s), Math.min(max, Math.max(4, s.gear.lanes)), w + ': your lanes follow the kit (capped)');
      eq(K.seatRuns(s), !!s.gear.doubleKick, w + ': runs follow the pedal');
      ok(s.songs.every(x => x.pattern.part && x.pattern.part.seat === seat), w + ': every song has your part');
    }
  }));
});

test('seat gear in the shop: the drum economy renamed per seat, one purchase sets both', () => {
  const SH = GG.shop;
  BANDS.forEach(b => STR.forEach(seat => {
    const s = career(b, seat, 3), d = career(b, 'drums', 3); s.fund = d.fund = 20000; s.era = d.era = 'local';
    const gi = SH.gearItems(s), gd = SH.gearItems(d);
    eq(gi.map(x => [x.id, x.cost, x.era, x.needs]), gd.map(x => [x.id, x.cost, x.era, x.needs]), b + '/' + seat + ': same ids, prices, eras');
    ok(gi.every((x, i) => x.name !== gd[i].name && x.name.length > 3), b + '/' + seat + ': parody names per seat ' + gi.map(x => x.name).join(' / '));
    eq(SH.kitTiers(s).map(k => k.cost), SH.kitTiers(d).map(k => k.cost), 'amp tiers cost the kit’s');
    ['toms', 'ride', 'pedal'].forEach(id => ok(SH.buyGear(s, id).ok && SH.buyGear(d, id).ok, id));
    eq([s.gear.lanes, s.gear.doubleKick, s.gear.owned], [d.gear.lanes, d.gear.doubleKick, d.gear.owned], b + '/' + seat + ': the band’s kit grows as on drums');
    eq([K.seatLanes(s), K.seatRuns(s)], [seat === 'bass' ? 5 : 6, true], b + '/' + seat + ': your rig');
    eq(SH.gigBonus(s), SH.gigBonus(d), 'gigBonus unchanged');
  }));
  const lead = career('hail_damage', 'lead'); lead.gear.quality = 2;
  ok(SH.whammy(lead) && !SH.whammy(career('hail_damage', 'rhythm')), 'the lead’s whammy comes with amp tier 2');
  // bends score with the whammy: a rock lead gig with a solo at amp tier 2 counts its bends (and only then)
  const bend = q => { const x = jammed('gravel_kings', 'lead', 6); x.gear.quality = q; x.gear.sections = ['outro', 'solo'];
    let pp = GG.songs.signature('rock', x.gear); pp.arrangement = GG.songs.ARRANGEMENTS.classic.slice(); pp = GG.songs.addSection(pp, 'solo', x.gear);
    x.songs = [GG.songs.create(x, pp, 'Bend It')];
    return GG.gig.botPlay(GG.gig.session(x, GG.gig.makeGig(x, 'legion_63', 'book'), null, { emit: false, difficulty: 'hard' }), { accuracy: 1 }, GG.RNG(4)).songResults[0]; };
  const b2 = bend(2), b0 = bend(0);
  ok(b2.bends > 0 && !('bends' in b0) && b2.crowdAvg >= b0.crowdAvg, 'whammy: bends score (' + b2.bends + ') ' + JSON.stringify([b2.crowdAvg, b0.crowdAvg]));
  eq(SH.gearName(career('hail_damage', 'drums'), 'ride'), 'China cymbal', 'the drum seat’s names: v1.0');
});

test('seat achievements: kinds evaluate (finished seat careers, a lead solo longer than the song, all four seats)', () => {
  const AC = GG.achieve;
  eq(AC.SEAT_KINDS, ['seatCareer', 'soloTooLong', 'allSeats']);
  const bass = career('hail_damage', 'bass'), lead = career('hail_damage', 'lead');
  eq([AC.test(bass, { kind: 'seatCareer', seat: 'bass' }), AC.test(Object.assign(bass, { ended: true }), { kind: 'seatCareer', seat: 'bass' }), AC.test(bass, { kind: 'seatCareer', seat: 'rhythm' })], [false, true, false], 'Low End on a finished bass career');
  eq([AC.test(lead, { kind: 'soloTooLong' }, { r: { songResults: [{ soloNotes: 64, notes: 119 }] } }), AC.test(lead, { kind: 'soloTooLong' }, { r: { songResults: [{ soloNotes: 30, notes: 120, allNotes: 140 }] } }),
    AC.test(bass, { kind: 'soloTooLong' }, { r: { songResults: [{ soloNotes: 70, notes: 120 }] } }), AC.test(lead, { kind: 'soloTooLong', by: 'time', min: 0.15 }, { r: { songResults: [{ solo: 30, dur: 120 }] } })],
    [true, false, false, true], 'Solo Too Long: more of your notes in the solo than in the rest of the song (lead only; by time too)');
  eq([AC.test({}, { kind: 'allSeats' }, { careers: { bySeat: { drums: 1, bass: 2, rhythm: 1, lead: 1 } } }), AC.test({}, { kind: 'allSeats' }, { careers: { bySeat: { drums: 3, bass: 1, lead: 1 } } })], [true, false], 'Musical Chairs');
  // a lead gig's song results carry the spotlight time
  const s = jammed('hail_damage', 'lead', 4);
  const r = GG.gig.botPlay(GG.gig.session(s, GG.gig.makeGig(s, 'legion_63', 'book'), null, { emit: false, difficulty: 'hard' }), { accuracy: 1 }, GG.RNG(2));
  ok(r.songResults.every(x => x.dur > 0 && x.solo >= 0 && x.soloNotes >= 0 && x.soloNotes <= x.notes), 'lead song results: solo / dur / soloNotes ' + JSON.stringify(r.songResults.map(x => [x.solo, x.dur, x.soloNotes, x.notes])));
  // a short metal song with a solo section: the solo has more of your notes than the rest (the achievement is reachable)
  s.gear.sections = ['outro', 'solo'];
  let p = GG.songs.signature('metal', s.gear); p.arrangement = GG.songs.ARRANGEMENTS.short.slice(); p = GG.songs.addSection(p, 'solo', s.gear);
  s.songs = [GG.songs.create(s, p, 'Shred Too Long')]; s.liveGig = null;
  const r2 = GG.gig.botPlay(GG.gig.session(s, GG.gig.makeGig(s, 'legion_63', 'book'), null, { emit: false, difficulty: 'hard' }), { accuracy: 1 }, GG.RNG(2));
  ok(AC.test(s, { kind: 'soloTooLong' }, { r: r2 }), 'Solo Too Long is reachable: ' + JSON.stringify(r2.songResults.map(x => [x.soloNotes, x.allNotes])));
});

test('songs.reactions by seat: the swapped drummer reacts from the kit, never on the drum seat; the career RNG never moves for it', () => {
  const s = jammed('hail_damage', 'lead', 8), song = s.songs[s.songs.length - 1];
  const a = GG.songs.reactions(s, song, GG.RNG(5)), b = GG.songs.reactions(s, song, GG.RNG(5));
  eq(a, b, 'deterministic');
  ok(a.every(x => x.who !== 'player'), 'you never react to your own song');
  const many = s.songs.map(x => GG.songs.reactions(s, x, GG.RNG(1))).reduce((t, x) => t.concat(x), []);
  ok(many.some(x => x.seat === 'kit' && x.who === 'dana'), 'Dana reacts from the kit');
  const d = jammed('hail_damage', 'drums', 8);
  ok(d.songs.map(x => GG.songs.reactions(d, x, GG.RNG(1))).every(l => l.every(x => !x.seat)), 'the drum seat: no seat reactions');
});

done('sim_seats');
