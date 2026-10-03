// tests/content_seats.test.js (v1.1 "Seats", Lane A; plan_contract_1.1 §5 A acceptance): the string-seat content.
//   - the three role arcs walk to their end flag in a synthetic run for every band (each step's card passes its gates and
//     cardOk on that band's seat; every decision value is reachable), and the 12 band finales (one per band x string seat)
//     draw after the arc
//   - every swapped member (12): a first-week card, Monday cards, a song-reaction layer from the kit, a drummer-gear line,
//     an epilogue variant; every band: seatLines for all four seats; recruits.drummers + drama.fillIns.drums
//   - shop bySeat names (every gear item x string seat x genre, every amp tier), creator gear names, coach lines per seat
//   - the seat achievements (Lane B's kinds, no drum words)
//   - tokens are C.TOKENS (+ name:/nick:), gates use the known keys, no USA content, no other band's names, no gong on a kit
// Run: node tests/content_seats.test.js
const { test, ok, eq, done } = require('./_t');
const load = require('./_load');
const GG = load({ localStorage: load.fakeStorage() });
const C = GG.contracts, K = GG.content;
const SCAN = require('./seat_scan');
const BANDS = Object.keys(K.bands).filter(b => !K.bands[b].locked && K.bands[b].seats);
const STRING = ['bass', 'rhythm', 'lead'];
const ARC = { bass: 'bassArc', rhythm: 'rhythmArc', lead: 'leadArc' };
const VALUES = { bass: ['legend', 'secret', 'quiet'], rhythm: ['credited', 'unsung', 'engine'], lead: ['guitarHero', 'bandFirst', 'soloAlbum'] };
const SWAPPED = [].concat(...BANDS.map(b => STRING.map(s => ({ band: b, seat: s, id: K.bands[b].seats[s] }))));
const GATE_KEYS = C.GATE_KEYS.concat(C.SEAT_GATE_KEYS || []);
const USA = /\b(USA|U\.S\.|America|Americans?|United States|the States|Texas|Nashville|Las Vegas|Vegas|New York|California|Hollywood|Chicago|Seattle|Detroit|Minneapolis|Fargo|Walmart|Costco|Starbucks|McDonald'?s?|Fender|Gibson|Tim Hortons|Canadian Tire|Facebook|Instagram|TikTok|YouTube|Twitter)\b/;
const str = (s, max) => typeof s === 'string' && s.trim().length > 0 && s.length <= max;
const card = id => K.cards.find(c => c.id === id);
const seatCards = K.cards.filter(c => /^(arc_|fin_|sw_)/.test(c.id));
function strings(v, out, path) {
  out = out || []; path = path || '';
  if (typeof v === 'string') out.push([path, v]);
  else if (Array.isArray(v)) v.forEach((x, i) => strings(x, out, path + '[' + i + ']'));
  else if (v && typeof v === 'object') Object.keys(v).forEach(k => strings(v[k], out, path + '.' + k));
  return out;
}
const MEMBERS = {}; BANDS.forEach(b => { MEMBERS[b] = K.bands[b].members.map(m => m.name.split(' ')[0]); });
const otherNames = b => new RegExp('\\b(' + [].concat(...BANDS.filter(x => x !== b).map(x => MEMBERS[x])).join('|') + ')\\b');
const anyName = new RegExp('\\b(' + [].concat(...BANDS.map(x => MEMBERS[x])).join('|') + ')\\b');
function career(band, seat, seed) { return GG.career.newCareer({ seed: seed || 7, bandId: band, seat, player: { name: 'Test' } }); }

test('the three arcs: six steps each, hints on every choice, a byBand line per band, the decision flag at step 5', () => {
  STRING.forEach(seat => {
    const steps = K.cards.filter(c => c.chain === 'arc_' + seat).sort((a, b) => a.step - b.step);
    eq(steps.map(c => c.step), [1, 2, 3, 4, 5, 6], seat + ': six steps');
    steps.forEach(c => {
      eq(c.seat, [seat], c.id + ': top-level seat');
      eq(c.gate.band.slice().sort(), BANDS.slice().sort(), c.id + ': every band');
      c.choices.forEach((ch, i) => {
        ok(str(ch.hint, 48), c.id + '#' + i + ': a hint');
        const lines = [].concat(ch.effects.chat || []);
        eq(lines.map(l => l.swapped).sort(), BANDS.map(b => K.bands[b].seats[seat]).sort(), c.id + '#' + i + ': one byBand line per band (swapped-gated)');
        ok(lines.every(l => l.who === '@drummer' && str(l.text, 120)), c.id + '#' + i + ': the swapped drummer speaks, ≤120');
      });
      // shared by every band: tokens only, never a member's name
      const txt = strings(c).filter(([p]) => !/\.chat\[/.test(p)).map(([, s]) => s).join(' ');
      ok(!anyName.test(txt), c.id + ': names a member (' + (txt.match(anyName) || [])[0] + '); use tokens');
    });
    const decide = steps[4].choices.map(ch => ch.effects.flags && ch.effects.flags[ARC[seat]]);
    eq(decide.slice().sort(), VALUES[seat].slice().sort(), seat + ': step 5 sets every ' + ARC[seat] + ' value (E7)');
    ok(steps[5].choices.every(ch => ch.effects.flags && ch.effects.flags[ARC[seat] + 'Done'] === true && ch.effects.chain['arc_' + seat].step === 'end'), seat + ': step 6 sets ' + ARC[seat] + 'Done and ends the chain');
    eq(GG.career.ARCS[seat].flag, ARC[seat], seat + ': career.ARCS agrees');
    eq(GG.career.ARCS[seat].values.slice().sort(), VALUES[seat].slice().sort(), seat + ': career.ARCS values agree');
  });
});

test('synthetic run per band x seat: every arc step draws on its seat (gates + cardOk), the arc ends, the finale draws', () => {
  BANDS.forEach(band => STRING.forEach(seat => VALUES[seat].forEach((value, vi) => {
    const s = career(band, seat, 11 + vi), tag = band + '@' + seat + '/' + value, chain = 'arc_' + seat;
    // a drum career never sees the arc
    const drum = career(band, 'drums');
    ok(!GG.career.cardOk(drum, card(chain + '_1_' + { bass: 'unmiked', rhythm: 'compliment', lead: 'too_long' }[seat])) ||
      !GG.career.gatePasses(drum, { seat: [seat] }), tag + ': hidden on the drum seat');
    for (let step = 1; step <= 6; step++) {
      const c = K.cards.find(x => x.chain === chain && x.step === step);
      s.era = c.gate.era[c.gate.era.length - 1] === 'world' && step > 3 ? 'signed' : c.gate.era[0];
      ok(GG.career.gatePasses(s, c.gate) && GG.career.cardOk(s, c), tag + ': step ' + step + ' passes its gates on this seat');
      if (step > 1) ok(s.chains[chain] && s.chains[chain].step === step, tag + ': the chain points at step ' + step);
      const ch = step === 5 ? c.choices.find(x => x.effects.flags && x.effects.flags[ARC[seat]] === value) : c.choices[(step + vi) % c.choices.length];
      const before = s.chat.length;
      GG.career.applyEffects(s, ch.effects);
      const posted = s.chat.slice(before);
      eq(posted.map(m => m.who), [GG.career.drummerId(s)], tag + ': step ' + step + ': exactly the swapped drummer posts the byBand line');
      if (s.chains[chain] && s.chains[chain].due) s.totalWeek = Math.max(s.totalWeek, s.chains[chain].due);
    }
    eq(s.flags[ARC[seat]], value, tag + ': the arc flag');
    eq(s.flags[ARC[seat] + 'Done'], true, tag + ': the arc ends');
    eq(s.chains[chain].step, 'end', tag + ': chain at end');
    eq(GG.career.arcOf(s) && GG.career.arcOf(s).value, value, tag + ': career.arcOf reads it');
    const fin = card('fin_' + seat + '_' + band);
    ok(fin, tag + ': a band finale');
    s.era = 'signed';
    ok(fin && GG.career.gatePasses(s, fin.gate) && GG.career.cardOk(s, fin), tag + ': the finale draws after the arc');
    const other = career(BANDS.find(b => b !== band), seat);
    other.flags[ARC[seat] + 'Done'] = true; other.era = 'signed';
    ok(fin && !GG.career.gatePasses(other, fin.gate), tag + ': never in another band');
  })));
});

test('the 12 band finales: one per band x string seat, once, band + seat + arcDone gated, the band\'s own people only', () => {
  const fins = K.cards.filter(c => /^fin_/.test(c.id));
  eq(fins.length, BANDS.length * STRING.length, '12 finales');
  BANDS.forEach(b => STRING.forEach(seat => {
    const c = card('fin_' + seat + '_' + b), w = 'fin_' + seat + '_' + b;
    ok(c && c.once === true && c.seat.join() === seat && c.gate.band.join() === b && c.gate.flags.includes(ARC[seat] + 'Done'), w + ': gates');
    const txt = strings(c).map(([, s]) => s).join(' ');
    ok(!otherNames(b).test(txt), w + ': names another band\'s member ' + (txt.match(otherNames(b)) || [])[0]);
  }));
});

test('every swapped member: first-week card, ≥4 Monday cards with chat, a kit song reaction, a drummer-gear line, an epilogue variant', () => {
  eq(SWAPPED.length, 12, 'twelve swapped members');
  SWAPPED.forEach(({ band, seat, id }) => {
    const w = id + ' (' + band + '@' + seat + ')';
    const first = card('sw_' + id + '_first_week');
    ok(first && first.forceWeek === 2 && first.swapped === id && first.seat.join() === seat && first.gate.band.join() === band, w + ': the first-week card (forced week 2)');
    const s = career(band, seat);
    s.totalWeek = 2;
    ok(first && GG.career.gatePasses(s, first.gate) && GG.career.cardOk(s, first), w + ': the first-week card draws on that seat');
    const drum = career(band, 'drums');
    ok(first && !GG.career.cardOk(drum, first), w + ': never on the drum seat');
    const monday = K.cards.filter(c => c.swapped === id && !c.forceWeek);
    ok(monday.length >= 4 && monday.length <= 6, w + ': 4-6 Monday cards (' + monday.length + ')');
    ok(monday.every(c => c.seat.join() === seat && c.gate.band.join() === band && c.choices.some(ch => ch.effects && ch.effects.chat)), w + ': gated + a chat line');
    ok(monday.every(c => GG.career.cardOk(s, c)), w + ': speakers and effects fit');
    const kit = (K.lines.songReactions[id] || {}).kit;
    ok(Array.isArray(kit) && kit.length >= 3 && kit.every(t => str(t, 140)), w + ': songReactions.kit');
    if (id === 'kenji') ok(kit.every(t => /^\(.*\)$/.test(t)), 'Kenji never speaks (kit reactions are stage directions)');
    const gear = GG.shop.lineList(s, 'drummerGear').filter(x => GG.career.seatOk(s, x));
    eq(gear.map(x => x.who), [id], w + ': exactly one drummer-gear line, theirs');
    const ep = (K.endings.epilogues[id] || []).find(v => v.when && v.when.seatRole);
    ok(ep && /^drums/.test([].concat(ep.when.seatRole)[0]) && str(ep.text, 240), w + ': an epilogue variant on the kit');
    const card1 = GG.legacy.epilogues(s, 'cult_heroes', []).find(e => e.id === id);
    eq(card1 && card1.text, GG.career.fillText(s, ep.text), w + ': the ending shows the kit variant');
  });
});

test('seatLines, bySeat reactions, drummer recruits and fill-ins', () => {
  BANDS.forEach(b => {
    const L = K.bands[b].seatLines;
    ok(L && C.SEATS.every(seat => str(L[seat], 160)), b + ': seatLines for all four seats');
    STRING.forEach(seat => ok(new RegExp(K.bands[b].members.find(m => m.id === K.bands[b].seats[seat]).name.split(' ')[0]).test(L[seat]), b + '@' + seat + ': the line names who moves'));
    ok(!otherNames(b).test(C.SEATS.map(x => L[x]).join(' ')), b + ': seatLines name only this band');
    STRING.forEach(seat => {
      const s = career(b, seat), dr = GG.career.drummerId(s);
      const voiced = s.members.filter(m => m.id !== dr && ((K.lines.songReactions[m.id] || {}).bySeat || {})[seat]);
      ok(voiced.length >= 1, b + '@' + seat + ': a bandmate reacts to your part (songReactions.bySeat)');
    });
  });
  const R = K.recruits.drummers;
  ok(R && C.GENRES.every(g => Array.isArray(R.nicks[g]) && R.nicks[g].length >= 3), 'recruits.drummers.nicks per genre');
  ok(Array.isArray(K.drama.fillIns.drums) && K.drama.fillIns.drums.length >= 3, 'drama.fillIns.drums');
  ok(GG.drama.fillPool('drums') === K.drama.fillIns.drums || (GG.drama.fillPool('drums') || []).join() === K.drama.fillIns.drums.join(), 'the drum hole draws the drum fill-ins');
});

test('shop names per seat, creator gear names, coach lines per seat', () => {
  const PRICE = {};
  K.shop.gear.forEach(g => {
    STRING.forEach(seat => {
      const bs = g.bySeat && g.bySeat[seat];
      ok(bs && C.GENRES.every(gen => str(bs.names[gen], 36)) && str(bs.blurb, 140), g.id + '@' + seat + ': names per genre + blurb');
      ok(bs && !SCAN.drumWords(Object.values(bs.names).join(' ')), g.id + '@' + seat + ': no drum words in the names');
    });
    PRICE[g.id] = g.cost;
  });
  K.shop.kit.forEach(k => STRING.forEach(seat => ok(k.bySeat && str(k.bySeat[seat].name, 36) && str(k.bySeat[seat].blurb, 140) && !SCAN.drumWords(k.bySeat[seat].name), 'kit tier ' + k.tier + '@' + seat)));
  ok(/Low B of Doom|Five-String/.test(K.shop.gear.find(g => g.id === 'toms').bySeat.bass.names.metal), 'the bass lane-5 item is a five-string');
  ok(/whammy/i.test(K.shop.kit.find(k => k.tier === 2).bySeat.lead.blurb), 'the lead\'s amp tier 2 mentions the whammy');
  BANDS.forEach(b => STRING.forEach(seat => {
    const s = career(b, seat);
    ok(GG.shop.gearItems(s).every(x => x.cost === PRICE[x.id]), b + '@' + seat + ': the drum prices');
  }));
  const G = K.creator.gear;
  STRING.forEach(seat => C.GEAR_SHAPES[seat].forEach(id => ok(str(G.shapes[seat][id], 32), 'creator gear shape ' + seat + '.' + id)));
  C.GEAR_GUARDS.forEach(id => ok(str(G.guards[id], 24), 'creator guard ' + id));
  ok(str(G.stickers.none, 24) && str(G.stickers.logo, 24), 'creator stickers');
  const CO = K.grooves.coach, steps = ['drums', 'verse', 'chorus', 'bridge'];
  const okLine = l => l && str(l.text, 120) && typeof l.role === 'string' && new RegExp(l.role) && !(l.role !== 'drummer' && /drummer/.test(l.role));
  STRING.forEach(seat => steps.forEach(st => ok((CO.bySeat[seat][st] || []).length && CO.bySeat[seat][st].every(okLine), 'coach.bySeat.' + seat + '.' + st)));
  C.GENRES.forEach(g => STRING.forEach(seat => steps.forEach(st => ok((CO[g].bySeat[seat][st] || []).length && CO[g].bySeat[seat][st].every(okLine), 'coach.' + g + '.bySeat.' + seat + '.' + st))));
  ok(C.GENRES.every(g => STRING.every(seat => CO[g].bySeat[seat].drums.some(l => l.role === 'drummer'))), 'the drummer suggests the groove on every seat');
});

test('the seat achievements: Low End, The Engine Room, Solo Too Long, Musical Chairs (Lane B kinds, no drum words)', () => {
  const A = K.seatAchievements || [];
  eq(A.map(a => a.id), ['low_end', 'the_engine_room', 'solo_too_long', 'musical_chairs'], 'the four E12 rows');
  eq(A.map(a => a.name), ['Low End', 'The Engine Room', 'Solo Too Long', 'Musical Chairs'], 'names');
  const kinds = (GG.achieve && GG.achieve.SEAT_KINDS) || [];
  A.forEach(a => {
    ok(kinds.includes(a.test.kind) && C.ACH_WHEN.includes(a.when) && str(a.blurb, 140) && a.icon, a.id + ': kind / when / blurb');
    ok(!SCAN.drumWords(a.name + ' ' + a.blurb) && !a.seat, a.id + ': no drum words, no seat gate');
  });
  eq(A.find(a => a.id === 'low_end').test.seat, 'bass', 'Low End = a bass career');
  eq(A.find(a => a.id === 'the_engine_room').test.seat, 'rhythm', 'The Engine Room = a rhythm career');
  // they join content.achievements exactly when the contracts list the seat kinds (the lead's fold at integration)
  const listed = ['seatCareer', 'soloTooLong', 'allSeats'].every(k => (C.ACH_KINDS || []).includes(k));
  eq(A.every(a => K.achievements.some(x => x.id === a.id)), listed, 'in content.achievements iff C.ACH_KINDS lists the seat kinds');
  if (GG.achieve && GG.achieve.test) {
    const s = career('hail_damage', 'bass'); s.ended = true;
    ok(GG.achieve.test(s, A[0].test, {}) === true, 'Low End evaluates on an ended bass career');
    ok(GG.achieve.test(career('hail_damage', 'rhythm'), A[0].test, {}) === false, 'Low End: not on rhythm');
  }
});

test('tokens, gates, lengths; no USA, no gong on a kit, nobody from another band', () => {
  const TOK = C.TOKENS.concat(['player', 'band', 'city', 'rival', 'recruit', 'views', 'venue', 'song', 'space']);
  const bad = [];
  seatCards.forEach(c => {
    Object.keys(c.gate).forEach(k => ok(GATE_KEYS.includes(k), c.id + ': gate key ' + k));
    strings(c).forEach(([p, s]) => {
      let m; const re = /\{([A-Za-z]+)(?::[\w-]+)?\}/g;
      while ((m = re.exec(s))) if (!TOK.includes(m[1]) && !['name', 'nick'].includes(m[1])) bad.push(c.id + p + ': {' + m[1] + '}');
      if (USA.test(s)) bad.push(c.id + p + ': USA ' + s.match(USA)[0]);
      if (/\bgong\b/i.test(s)) bad.push(c.id + p + ': gong');
    });
    if (c.gate.band.length === 1) { const t = strings(c).map(([, s]) => s).join(' '); if (otherNames(c.gate.band[0]).test(t)) bad.push(c.id + ': names ' + t.match(otherNames(c.gate.band[0]))[0]); }
  });
  const extra = strings({ shop: K.shop.gear.map(g => g.bySeat), kit: K.shop.kit.map(k => k.bySeat), creator: K.creator.gear, coach: K.grooves.coach.bySeat,
    coachG: C.GENRES.map(g => K.grooves.coach[g].bySeat), player: [K.endings.player.bass, K.endings.player.rhythm, K.endings.player.lead], ach: K.seatAchievements });
  extra.forEach(([p, s]) => { if (USA.test(s)) bad.push(p + ': USA ' + s.match(USA)[0]); if (/\bgong\b/i.test(s)) bad.push(p + ': gong'); if (anyName.test(s) && !/coachG|ach/.test(p)) bad.push(p + ': a member name ' + s.match(anyName)[0]); });
  eq(bad, [], 'token / USA / gong / name problems');
});

test('the seat leak scan pieces: [left] phrases are not leaks, a drum word aimed at the player is', () => {
  const aware = SCAN.seatAware(GG);
  ok(aware.length > 50, 'seat-aware lines found: ' + aware.length);
  eq(SCAN.leak('You tape your sticks to the wall.', []), 'your sticks', 'HARD: "your sticks" aimed at the player');
  eq(SCAN.leak('The drummer counts us in.', []), null, 'LEFT: the band\'s drummer');
  eq(SCAN.leak('You set up your kit by the till.', []), 'your kit', 'HARD: your kit');
  ok(SCAN.leak(card('sw_tamara_3').text, aware) === null, 'a swapped card\'s text (title inside it) is seat-aware');
});

done('content_seats');
