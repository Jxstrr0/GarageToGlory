// v1.1 "Seats" (plan/plan_contract_1.1.md §4; handoff Part E) — the stage-0 skeleton. Lane B owns this file after stage 0
// and adds: roles by seatRole, quits/returns into the drum seat, PART + sanitize + rate, seat charts (contour lanes, holds,
// chords on Hard+, runs, thinning), perfect bot 100 % per seat × difficulty, determinism.
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

test('stub: gig.chart({ seat }) is the drum chart for every seat (Lane B replaces it); no seat = the v1.0 chart', () => {
  const s = career('hail_damage', 'drums'), song = s.songs[0];
  const base = GG.gig.chart(song, { difficulty: 'hard' });
  ok(!('seat' in base) && !('stub' in base), 'a chart without opts.seat has no new keys');
  C.SEATS.forEach(seat => {
    const c = GG.gig.chart(song, { difficulty: 'hard', seat });
    eq([c.seat, c.stub, c.total, c.lanes], [seat, seat !== 'drums', base.total, base.lanes], seat);
    eq(c.notes, base.notes, seat + ' notes = the drum notes');
  });
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
  eq([A.pluck(40, 0, { len: 1 }), A.strum(40, 0), A.lead(64, 0, { hold: true }), A.release(null, 0)], [null, null, null, null]);
});

done('sim_seats');
