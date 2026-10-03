// content.test.js: validates src/content (bands, rivals, npcs, cards, lines, presets, song titles) against GG.contracts.
// Also: walks every branch of every card chain (the Cape Saga) and runs a 240-week draw to prove no year runs dry.
// v0.9 "Genres": band-aware (gap #9): a speaker / effect key must belong to the band(s) the content is gated to (members,
// role aliases, band- or rival-scoped npcs, 'rival_frontman'), pools are read as the sims read them (flat + byGenre +
// byBand), and nothing another band can see names Hail Damage's people. The per-band pack minimums are in
// tests/content_bands.test.js.
// Run: node tests/content.test.js   (or node tests/run.js content)
const { test, ok, eq, done } = require('./_t');
const load = require('./_load');
const GG = load({ localStorage: load.fakeStorage() });
const C = GG.contracts, K = GG.content;

// ---- Local constants (LOOK enums live only in a 02_contracts.js comment; see report "contract additions") ----
const HAIR_STYLES = ['short', 'long', 'mohawk', 'bald', 'bun', 'mullet', 'spiky', 'cap'];
const LOOK_EXTRAS = ['sunglasses', 'beard', 'moustache', 'glasses', 'headband', 'tattoos', 'hat', 'bandana', 'toque', 'bighat'];
const IDLES = ['mirror', 'noodle', 'lunch', 'corner', 'pace', 'phone', 'fiddle'];
const BOOKABLE = C.CARD_BOOKABLE;                   // v0.9: the contract list (Saskatoon's four + every band's home rooms)
const SIM_FLAGS = ['parentsLoan', 'label'];         // flags the sim sets that cards may gate on (v0.5: label = labelId)
const SIM_FLAG_VALUES = { parentsLoan: [true], label: C.LABELS };
const CAPE_VALUES = ['velvet', 'curtain', 'charred', 'fireproof', 'none'];
const LIMIT = { title: 32, text: 280, label: 38, outcome: 200, hint: 48, chat: 120, line: 140, rollPair: 300 };
// Effect magnitudes for the garage era: [lo, hi] on the value, or on |value| when abs is set (sign free).
const MAG = {
  fund: { lo: -250, hi: 200 }, fans: { lo: 0, hi: 30 }, drumSkill: { lo: 1, hi: 3 },
  buzz: { lo: 2, hi: 12, abs: true }, chemistry: { lo: 2, hi: 8, abs: true }, burnout: { lo: 3, hi: 15, abs: true },
  mood: { lo: 3, hi: 15, abs: true }, skill: { lo: 1, hi: 3 }
};
// v0.5: later eras allow bigger numbers. A card is held to the ranges of the EARLIEST era in its gate.
const MAG_BY_ERA = {
  garage: MAG,
  local: { fund: { lo: -500, hi: 400 }, fans: { lo: 0, hi: 80 }, drumSkill: { lo: 1, hi: 3 }, buzz: { lo: 2, hi: 15, abs: true },
    chemistry: { lo: 2, hi: 10, abs: true }, burnout: { lo: 3, hi: 18, abs: true }, mood: { lo: 3, hi: 18, abs: true }, skill: { lo: 1, hi: 3 } },
  signed: { fund: { lo: -1500, hi: 1200 }, fans: { lo: 0, hi: 400 }, drumSkill: { lo: 1, hi: 4 }, buzz: { lo: 2, hi: 18, abs: true },
    chemistry: { lo: 2, hi: 10, abs: true }, burnout: { lo: 3, hi: 20, abs: true }, mood: { lo: 3, hi: 20, abs: true }, skill: { lo: 1, hi: 4 } }
};
MAG_BY_ERA.world = MAG_BY_ERA.signed;
const earliestEra = gate => C.ERAS.find(e => !gate || !gate.era || gate.era.includes(e)) || 'garage';
const magFor = gate => MAG_BY_ERA[earliestEra(gate)];
const CARD_KEYS = ['id', 'type', 'speaker', 'title', 'text', 'gate', 'weight', 'once', 'cooldown', 'chain', 'step', 'forceWeek', 'choices',
  'cameo',   // v0.9 (owner Q8): cameo: true = a cross-band cameo card (it may name another playable band; career.cardOk passes it)
  'seat', 'swapped'];   // v1.1 "Seats" (plan_contract_1.1 §4.3): top-level seat / swapped gates (career.cardOk checks them)
// v1.1: the seat gate keys (C.SEAT_GATE_KEYS) are valid in every gate until the lead folds them into C.GATE_KEYS
const GATE_KEYS = C.GATE_KEYS.concat((C.SEAT_GATE_KEYS || []).filter(k => C.GATE_KEYS.indexOf(k) < 0));
// A seat / swapped gate value: seat = a non-empty list of C.SEATS; swapped = true | false | memberId | [memberIds] (of the bands)
function seatGateOk(o, bands) {
  if (!o) return true;
  if (o.seat != null && !(Array.isArray(o.seat) && o.seat.length && o.seat.every(x => C.SEATS.includes(x)))) return false;
  if (o.swapped != null && typeof o.swapped !== 'boolean') {
    const ids = [].concat(o.swapped), mem = (bands || Object.keys(K.bands)).map(b => K.bands[b]).filter(Boolean)
      .reduce((a, b) => a.concat(b.members.map(m => m.id)), []);
    if (!ids.length || !ids.every(id => mem.includes(id))) return false;
  }
  return true;
}
// v1.1: does a card fit a drum-seat career (the draw sim and the chain walk run as the drummer)?
const drumSeat = c => [c, c.gate || {}].every(o => (o.seat == null || o.seat.includes('drums')) && (o.swapped == null || o.swapped === false));
const CHOICE_KEYS = ['label', 'hint', 'effects', 'outcome', 'roll'];
const ROLL_KEYS = ['chance', 'stat', 'statScale', 'success', 'fail'];

const isHex = s => typeof s === 'string' && /^#[0-9a-f]{6}$/i.test(s);
const isInt = n => typeof n === 'number' && Number.isInteger(n);
const str = (s, max) => typeof s === 'string' && s.trim().length > 0 && s.length <= max;
const HD = K.bands && K.bands.hail_damage;
const HD_IDS = HD ? HD.members.map(m => m.id) : [];
const ALL_MEMBER_IDS = K.bands ? [].concat(...Object.values(K.bands).map(b => b.members.map(m => m.id))) : [];
const NPC_IDS = K.npcs ? Object.keys(K.npcs) : [];
const CARDS = K.cards || [];
const CHAIN_IDS = [...new Set(CARDS.filter(c => c.chain).map(c => c.chain))];

// ---- v0.9 "Genres" (plan_contract_0.9 §4.1-4.3): band-aware helpers --------------------------------------------------
// Content speaks for the bands its gate names: one band -> its members; any band -> role aliases ('@front'), npcs whose
// scope (band / rival) covers every such band, 'rival_frontman'. A card with a member speaker and no band gate belongs to
// that member's band (the sims' cardOk filters it the same way).
const ALIASES = C.ROLE_ALIASES;
const BAND_IDS = K.bands ? Object.keys(K.bands) : [];
const MEMBERS_OF = b => ((K.bands && K.bands[b] && K.bands[b].members) || []).map(m => m.id);
const BAND_OF_MEMBER = id => BAND_IDS.find(b => MEMBERS_OF(b).includes(id)) || null;
const rivalOf = b => K.bands[b] && K.bands[b].rival;
function impliedBands(c) {
  if (c && c.gate && c.gate.band && c.gate.band.length) return c.gate.band;
  const b = c && BAND_OF_MEMBER(c.speaker);
  return b ? [b] : BAND_IDS;
}
function npcFits(id, bands) {
  const n = K.npcs && K.npcs[id];
  if (!n) return false;
  if (n.band && !bands.every(b => [].concat(n.band).includes(b))) return false;
  if (n.rival && !bands.every(b => [].concat(n.rival).includes(rivalOf(b)))) return false;
  return true;
}
// '@deadpan' never speaks where Hail Damage can see it: its deadpan is Kenji, who never says a word.
function speakerFits(who, bands, extra) {
  if (who === '@deadpan' && bands.includes('hail_damage')) return false;
  if (ALIASES.includes(who) || who === 'rival_frontman' || (extra || []).includes(who)) return true;
  if (bands.length === 1 && MEMBERS_OF(bands[0]).includes(who)) return true;
  return npcFits(who, bands);
}
// mood / skill / member keys: 'all', a role alias, or a member of the one band the content belongs to
const memberKeyFits = (id, bands, extra) => id === 'all' || ALIASES.includes(id) || (extra || []).includes(id)
  || (bands.length === 1 && MEMBERS_OF(bands[0]).includes(id));
// A pool as the sims read it (career.pool): flat + byGenre[genre] + byBand[bandId], the layers at any level of the path.
function poolFor(obj, path, bandId) {
  const b = K.bands[bandId], dig = (o, p) => p.reduce((a, k) => (a == null ? a : a[k]), o);
  let out;
  const add = v => {
    if (v === undefined) return;
    if (out === undefined) { out = Array.isArray(v) ? v.slice() : v; return; }
    if (Array.isArray(out) || Array.isArray(v)) out = [].concat(Array.isArray(out) ? out : [], Array.isArray(v) ? v : []);
    else if (out && v && typeof out === 'object' && typeof v === 'object') out = Object.assign({}, out, v);
    else out = v;
  };
  add(dig(obj, path));
  ['byGenre', 'byBand'].forEach(layer => { for (let i = 0; i < path.length; i++) add(dig(obj, path.slice(0, i).concat([layer, layer === 'byGenre' ? b.genre : bandId], path.slice(i)))); });
  return out;
}
// Hail Damage's people and things: never in content another band can see (flat pools, cards gated to other bands).
const HD_LEAK = /\b(Marcel|Dana|Jaxon|Kenji|Baba|Lord Abyssus|Moose Hearse|Tundra Wraith|Gord|Grimnir|HALE DAMAGE|Lindqvist|Doreen)\b/;
const OTHER_BANDS = BAND_IDS.filter(b => b !== 'hail_damage');
const seenByOthers = c => impliedBands(c).some(b => b !== 'hail_damage');

function checkLook(look, where) {
  ok(look && typeof look === 'object', where + ': look missing');
  ['skin', 'hair', 'shirt', 'pants'].forEach(k => ok(isHex(look[k]), where + ': look.' + k + ' not #rrggbb'));
  ok(HAIR_STYLES.includes(look.hairStyle), where + ': bad hairStyle ' + look.hairStyle);
  ok(look.height >= 0.9 && look.height <= 1.1, where + ': height out of 0.9..1.1');
  ok(look.build >= 0.9 && look.build <= 1.2, where + ': build out of 0.9..1.2');
  ok(Array.isArray(look.extras) && look.extras.every(e => LOOK_EXTRAS.includes(e)), where + ': bad extras');
}

// Every string in a value, with a readable path: [[path, string], ...]
function strings(v, path, out) {
  out = out || [];
  if (typeof v === 'string') out.push([path, v]);
  else if (Array.isArray(v)) v.forEach((x, i) => strings(x, path + '[' + i + ']', out));
  else if (v && typeof v === 'object') for (const k in v) strings(v[k], path + '.' + k, out);
  return out;
}
// Every effects object on a card: [{ fx, where }] (choice-level plus roll branches)
function effectsOf(card) {
  const out = [];
  card.choices.forEach((ch, i) => {
    if (ch.effects) out.push({ fx: ch.effects, where: card.id + '#' + i });
    if (ch.roll) ['success', 'fail'].forEach(b => { if (ch.roll[b] && ch.roll[b].effects) out.push({ fx: ch.roll[b].effects, where: card.id + '#' + i + '.' + b }); });
  });
  return out;
}

// ---- Gate evaluation: mirrors the GATE_KEYS doc in 02_contracts.js (used by the chain walk + draw sim) ----
function gatePasses(gate, s) {
  if (!gate) return true;
  const inList = (list, v) => !list || list.includes(v);
  if (!inList(gate.era, s.era) || !inList(gate.genre, s.genre) || !inList(gate.region, s.region) || !inList(gate.band, s.bandId)) return false;
  const range = (lo, hi, v) => (lo == null || v >= lo) && (hi == null || v <= hi);
  if (!range(gate.minWeek, gate.maxWeek, s.totalWeek) || !range(gate.minYear, gate.maxYear, s.year)) return false;
  if (gate.weekOfYear && !range(gate.weekOfYear[0], gate.weekOfYear[1], s.week)) return false;
  if (!range(gate.minFans, gate.maxFans, s.fans) || !range(gate.minFund, gate.maxFund, s.fund)) return false;
  if (!range(gate.minBuzz, gate.maxBuzz, s.buzz) || !range(gate.minChemistry, gate.maxChemistry, s.chemistry)) return false;
  if (gate.flags && !gate.flags.every(f => s.flags[f])) return false;
  if (gate.notFlags && gate.notFlags.some(f => s.flags[f])) return false;
  if (gate.flagEquals && Object.keys(gate.flagEquals).some(f => s.flags[f] !== gate.flagEquals[f])) return false;
  if (gate.gigBooked != null && !!s.gig !== gate.gigBooked) return false;
  const mood = id => (s.members.find(m => m.id === id) || {}).mood;
  if (gate.moodBelow && Object.keys(gate.moodBelow).some(id => !(mood(id) < gate.moodBelow[id]))) return false;
  if (gate.moodAbove && Object.keys(gate.moodAbove).some(id => !(mood(id) > gate.moodAbove[id]))) return false;
  return true;
}
// Only the flag conditions of a gate: what routes a chain between branches.
function flagGatePasses(gate, flags) {
  return gatePasses({ flags: gate.flags, notFlags: gate.notFlags, flagEquals: gate.flagEquals }, { flags: flags });
}
// Applies only what routes cards: flags (false deletes) and chain steps.
function applyRouting(fx, s) {
  if (!fx) return;
  if (fx.flags) for (const f in fx.flags) { if (fx.flags[f] === false) delete s.flags[f]; else s.flags[f] = fx.flags[f]; }
  if (fx.chain) for (const c in fx.chain) s.chains[c] = { step: fx.chain[c].step, due: s.totalWeek + (fx.chain[c].delay || 1) };
}

// ======================================================================
test('content modules attach to GG.content', () => {
  ['bands', 'rivals', 'npcs', 'cards', 'lines', 'presets', 'songTitles',
    'labels', 'studios', 'producers', 'reviews', 'awards', 'albumWords', 'studioEvents'].forEach(k => ok(K[k], 'GG.content.' + k + ' missing'));
});

test('bands: four bands, one per genre, full schema', () => {
  eq(Object.keys(K.bands).sort(), ['frost_heave', 'gravel_kings', 'grid_road_ramblers', 'hail_damage']);
  eq(Object.values(K.bands).map(b => b.genre).sort(), C.GENRES.slice().sort(), 'one band per genre');
  const seen = new Set();
  for (const b of Object.values(K.bands)) {
    const w = 'band ' + b.id;
    ok(str(b.name, 40) && str(b.city, 40) && str(b.blurb, 240) && str(b.space, 40) && str(b.spaceName, 60), w + ': basic fields');
    ok(C.REGIONS.includes(b.region), w + ': region');
    ok(K.rivals[b.rival] && K.rivals[b.rival].genre === b.genre, w + ': rival must exist and share the genre');
    ok(K.map.rings.some(r => r.id === b.homeRing), w + ': homeRing is a map ring');
    ok(Object.values(K.map.cities).some(c => c.name === b.city && c.ring === b.homeRing), w + ': the home city sits in the home ring');
    ok(K.venues.some(v => v.id === b.firstGig && v.city === b.city && v.tier === 1), w + ': firstGig is a tier-1 room in the home city');
    eq(b.size, b.members.length + 1, w + ': size counts the player');
    ok(Array.isArray(b.coldOpen) && b.coldOpen.length >= 3 && b.coldOpen.length <= 5 && b.coldOpen.every(p => str(p, 160)), w + ': coldOpen 3–5 panels ≤160');
    ok(b.starterSongs.length === 2 && b.starterSongs.every(s => str(s.title, 60) && (s.titleEn === null || str(s.titleEn, 60))), w + ': 2 starter songs');
    eq(b.locked, false, w + ' playable (v0.9: all four bands from the start)'); eq(b.comingIn, null, w + ' comingIn');
    if (b.id === 'hail_damage') eq(b.space, 'parents_garage');
    ok(b.roles && b.homeRing && b.spaceShort && b.province && b.coldOpenFx && b.throne && b.firstGig, w + ': v0.9 band fields');
    for (const m of b.members) {
      const mw = w + ' member ' + m.id;
      ok(/^[a-z][a-z0-9_]*$/.test(m.id) && !seen.has(m.id), mw + ': id must be unique across all bands');
      seen.add(m.id);
      ok(str(m.name, 16) && str(m.fullName, 40) && str(m.nick, 20) && str(m.role, 24) && str(m.hometown, 40), mw + ': name/nick/role/hometown');
      ok(str(m.wants, 80) && str(m.bio, 240), mw + ': wants/bio');
      ok(isInt(m.skill) && m.skill >= 30 && m.skill <= 60, mw + ': skill 30–60');
      ok(isInt(m.mood) && m.mood >= 55 && m.mood <= 75, mw + ': mood 55–75');
      ok(IDLES.includes(m.idle), mw + ': idle');
      checkLook(m.look, mw);
    }
  }
});

test('Hail Damage: the four members, idles and readable looks', () => {
  eq(HD_IDS, ['marcel', 'dana', 'jaxon', 'kenji']);
  eq(HD.members.map(m => m.idle), ['mirror', 'noodle', 'lunch', 'corner']);
  const by = id => HD.members.find(m => m.id === id);
  eq(by('marcel').nick, 'Lord Abyssus');
  eq(by('marcel').look.hairStyle, 'long', 'Marcel has long hair');
  ok(by('kenji').look.extras.includes('sunglasses'), 'Kenji wears sunglasses');
  ok(by('jaxon').look.height < 1 && by('jaxon').look.hairStyle === 'cap', 'Jaxon reads young: shorter, cap');
  ok(/hail/i.test(HD.coldOpen.join(' ')) && /truck/i.test(HD.coldOpen.join(' ')) && /insurance|adjuster|claim/i.test(HD.coldOpen.join(' ')), 'cold open: hail, truck, insurance');
});

test('rivals: four, correct cities, members unnamed', () => {
  const want = { tundra_wraith: 'Winnipeg', mall_rats: 'Toronto', chartbusters: 'Vancouver', buckle_and_boot: 'Red Deer' };
  eq(Object.keys(K.rivals).sort(), Object.keys(want).sort());
  for (const id in want) {
    const r = K.rivals[id];
    eq(r.id, id); eq(r.city, want[id], id + ' city');
    ok(C.GENRES.includes(r.genre) && str(r.name, 30) && str(r.blurb, 240), id + ' shape');
  }
  ok(K.npcs.wraith_frontman && /Tundra Wraith's frontman/.test(K.npcs.wraith_frontman.name), 'frontman stays unnamed');
});

test('npcs: shape; ids never collide with member ids', () => {
  ok(NPC_IDS.length >= 8, 'at least 8 npcs');
  for (const id of NPC_IDS) {
    const n = K.npcs[id];
    eq(n.id, id); ok(str(n.name, 40) && str(n.blurb, 200), 'npc ' + id);
    ok(!ALL_MEMBER_IDS.includes(id), 'npc id collides with a member: ' + id);
    if (n.band) ok([].concat(n.band).length && [].concat(n.band).every(b => K.bands[b]), 'npc ' + id + ': band scope');   // v0.9
    if (n.rival) ok([].concat(n.rival).every(r => K.rivals[r]), 'npc ' + id + ': rival scope');
  }
  ['mom', 'dad', 'baba', 'neighbour', 'dj', 'wraith_frontman'].forEach(id => ok(K.npcs[id], 'npc ' + id + ' missing'));
  ['mom', 'dad', 'dj'].forEach(id => ok(!K.npcs[id].band && !K.npcs[id].rival, id + ' is everyone\'s'));
  ['baba', 'neighbour', 'doreen', 'gord', 'barb'].forEach(id => ok(K.npcs[id] && [].concat(K.npcs[id].band).join() === 'hail_damage', id + ' is Hail Damage\'s'));
  eq(K.npcs.wraith_frontman.rival, 'tundra_wraith', 'the frontman belongs to Tundra Wraith');
  Object.keys(K.rivals).forEach(r => ok(NPC_IDS.some(id => K.npcs[id].rival === r && K.npcs[id].frontman), r + ': a frontman npc (rival_frontman)'));
});

// ---- Cards ------------------------------------------------------------
test('cards: ids, types, keys, speakers, lengths', () => {
  const ids = new Set();
  for (const c of CARDS) {
    const w = 'card ' + c.id;
    ok(/^[a-z][a-z0-9_]*$/.test(c.id) && !ids.has(c.id), w + ': id bad or duplicate'); ids.add(c.id);
    Object.keys(c).forEach(k => ok(CARD_KEYS.includes(k), w + ': unknown key ' + k));
    if ('cameo' in c) ok(c.cameo === true && c.gate && c.gate.band && c.gate.band.length === 1, w + ': a cameo card is cameo: true and belongs to one band');
    ok(C.CARD_TYPES.includes(c.type), w + ': type');
    ok(speakerFits(c.speaker, impliedBands(c)), w + ': speaker ' + c.speaker + ' for ' + impliedBands(c));
    ok(str(c.title, LIMIT.title), w + ': title ≤' + LIMIT.title);
    ok(str(c.text, LIMIT.text), w + ': text ≤' + LIMIT.text + ' (is ' + (c.text || '').length + ')');
    if ('weight' in c) ok(typeof c.weight === 'number' && c.weight > 0, w + ': weight');
    if ('once' in c) ok(typeof c.once === 'boolean', w + ': once');
    if ('cooldown' in c) ok(isInt(c.cooldown) && c.cooldown >= 0, w + ': cooldown');
    if (c.once === false) ok(c.cooldown >= 4, w + ': repeatable cards need a cooldown ≥ 4');
    ok(!!c.chain === ('step' in c), w + ': chain and step go together');
    if (c.chain) ok(isInt(c.step) && c.step >= 1, w + ': step');
    if ('forceWeek' in c) ok(isInt(c.forceWeek) && c.forceWeek >= 1, w + ': forceWeek');
    ok(Array.isArray(c.choices) && c.choices.length >= 2 && c.choices.length <= 3, w + ': 2–3 choices');
    c.choices.forEach((ch, i) => {
      const cw = w + '#' + i;
      Object.keys(ch).forEach(k => ok(CHOICE_KEYS.includes(k), cw + ': unknown key ' + k));
      ok(str(ch.label, LIMIT.label), cw + ': label ≤' + LIMIT.label + ' (is ' + (ch.label || '').length + ')');
      ok(str(ch.outcome, LIMIT.outcome), cw + ': outcome ≤' + LIMIT.outcome + ' (is ' + (ch.outcome || '').length + ')');
      if ('hint' in ch) ok(str(ch.hint, LIMIT.hint), cw + ': hint ≤' + LIMIT.hint);
      ok(ch.effects || ch.roll, cw + ': a choice must do something');
    });
    ok(new Set(c.choices.map(ch => ch.label)).size === c.choices.length, w + ': duplicate labels');
  }
});

test('cards: gates use only GATE_KEYS with valid values; every card names its bands (Hail Damage\'s stay metal) with valid eras', () => {
  const bandIds = Object.keys(K.bands);
  for (const c of CARDS) {
    const g = c.gate, w = 'card ' + c.id + ' gate';
    ok(g && typeof g === 'object', w + ' missing');
    Object.keys(g).forEach(k => ok(GATE_KEYS.includes(k), w + ': unknown key ' + k));
    ok(Array.isArray(g.era) && g.era.length > 0 && g.era.every(e => C.ERAS.includes(e)), w + ': era');
    ok(seatGateOk(g, impliedBands(c)) && seatGateOk(c, impliedBands(c)), w + ': seat / swapped (v1.1)');
    // v0.9: every Monday card names the bands it is for; a genre gate must fit every one of them
    ok(Array.isArray(g.band) && g.band.length > 0 && g.band.every(b => bandIds.includes(b)), w + ': band');
    if (g.genre) ok(Array.isArray(g.genre) && g.genre.every(e => C.GENRES.includes(e)) && (g.band || []).every(b => g.genre.includes(K.bands[b].genre)), w + ': genre fits the bands');
    if ((g.band || []).includes('hail_damage')) ok(Array.isArray(g.genre) && g.genre.includes('metal'), w + ': Hail Damage\'s cards stay metal');
    if (g.region) ok(g.region.every(r => C.REGIONS.includes(r)), w + ': region');
    for (const [lo, hi] of [['minWeek', 'maxWeek'], ['minYear', 'maxYear'], ['minFans', 'maxFans'], ['minFund', 'maxFund'], ['minBuzz', 'maxBuzz'], ['minChemistry', 'maxChemistry']]) {
      if (lo in g) ok(typeof g[lo] === 'number', w + ': ' + lo);
      if (hi in g) ok(typeof g[hi] === 'number', w + ': ' + hi);
      if (lo in g && hi in g) ok(g[lo] <= g[hi], w + ': ' + lo + ' > ' + hi);
    }
    if (g.weekOfYear) ok(g.weekOfYear.length === 2 && isInt(g.weekOfYear[0]) && g.weekOfYear[0] >= 1 && g.weekOfYear[1] <= C.WEEKS_PER_YEAR && g.weekOfYear[0] <= g.weekOfYear[1], w + ': weekOfYear');
    ['flags', 'notFlags'].forEach(k => { if (g[k]) ok(Array.isArray(g[k]) && g[k].every(f => typeof f === 'string'), w + ': ' + k); });
    if (g.flagEquals) ok(Object.values(g.flagEquals).every(v => ['string', 'number', 'boolean'].includes(typeof v)), w + ': flagEquals');
    if ('gigBooked' in g) ok(typeof g.gigBooked === 'boolean', w + ': gigBooked');
    ['moodBelow', 'moodAbove'].forEach(k => { if (g[k]) for (const id in g[k]) ok(memberKeyFits(id, impliedBands(c)) && id !== 'all' && g[k][id] >= 0 && g[k][id] <= 100, w + ': ' + k + '.' + id); });
  }
});

test('cards: effects use only EFFECT_KEYS, with valid targets and era-appropriate magnitudes', () => {
  for (const c of CARDS) for (const { fx, where } of effectsOf(c)) {
    const MAG = magFor(c.gate);
    Object.keys(fx).forEach(k => ok(C.EFFECT_KEYS.includes(k), where + ': unknown effect ' + k));
    for (const k of ['fund', 'fans', 'buzz', 'chemistry', 'burnout', 'drumSkill']) {
      if (!(k in fx)) continue;
      const v = fx[k], m = MAG[k], mag = m.abs ? Math.abs(v) : v;
      ok(isInt(v) && v !== 0 && mag >= m.lo && mag <= m.hi, where + ': ' + k + ' ' + v + ' outside the ' + earliestEra(c.gate) + ' range');
    }
    for (const k of ['mood', 'skill']) {
      if (!(k in fx)) continue;
      ok(fx[k] && typeof fx[k] === 'object', where + ': ' + k + ' must be a map');
      for (const id in fx[k]) {
        ok(memberKeyFits(id, impliedBands(c)), where + ': ' + k + ' key ' + id + ' is not a member of ' + impliedBands(c));
        const v = fx[k][id], m = MAG[k], mag = m.abs ? Math.abs(v) : v;
        ok(isInt(v) && mag >= m.lo && mag <= m.hi, where + ': ' + k + '.' + id + ' ' + v + ' outside range');
      }
    }
    if (fx.flags) for (const f in fx.flags) {
      ok(/^[a-z][A-Za-z0-9]*$/.test(f), where + ': flag name ' + f);
      ok(['string', 'number', 'boolean'].includes(typeof fx.flags[f]), where + ': flag value ' + f);
    }
    if (fx.chain) for (const ch in fx.chain) {
      const v = fx.chain[ch];
      ok(CHAIN_IDS.includes(ch), where + ': chain ' + ch + ' has no cards');
      Object.keys(v).forEach(k => ok(['step', 'delay'].includes(k), where + ': chain key ' + k));
      ok(v.step === 'end' || (isInt(v.step) && v.step >= 1), where + ': chain step');
      if ('delay' in v) ok(isInt(v.delay) && v.delay >= 1 && v.delay <= 8, where + ': chain delay 1–8');
    }
    if ('book' in fx) ok(BOOKABLE.includes(fx.book), where + ': book ' + fx.book + ' not in the allowed list');
    if (K.venues && 'book' in fx) ok(K.venues.some(v => v.id === fx.book), where + ': book ' + fx.book + ' missing from venues');
    if (fx.chat) [].concat(fx.chat).forEach(x => {   // v1.1: a list of lines (each may carry seat / swapped gates)
      ok(x && speakerFits(x.who, impliedBands(c)), where + ': chat.who ' + (x && x.who));
      ok(x && str(x.text, LIMIT.chat), where + ': chat.text ≤' + LIMIT.chat + ' ' + (x && x.text));
      ok(seatGateOk(x, impliedBands(c)), where + ': chat seat / swapped');
    });
  }
});

test('cards: rolls are well-formed and always signal the gamble', () => {
  let rolls = 0;
  for (const c of CARDS) c.choices.forEach((ch, i) => {
    if (!ch.roll) return;
    rolls++;
    const r = ch.roll, w = c.id + '#' + i + ' roll';
    Object.keys(r).forEach(k => ok(ROLL_KEYS.includes(k), w + ': unknown key ' + k));
    ok(typeof r.chance === 'number' && r.chance >= 0.05 && r.chance <= 0.95, w + ': chance 0.05–0.95');
    if ('stat' in r) ok(C.STATS.includes(r.stat) && r.stat !== 'fund' && r.stat !== 'fans', w + ': stat must be a bounded band stat');
    if ('statScale' in r) ok('stat' in r && typeof r.statScale === 'number' && Math.abs(r.statScale) <= 0.02, w + ': statScale');
    ok(typeof ch.hint === 'string' && /^Gamble: /.test(ch.hint), w + ': hint must start with "Gamble: "');
    for (const b of ['success', 'fail']) {
      ok(r[b] && str(r[b].outcome, LIMIT.outcome), w + '.' + b + ': outcome ≤' + LIMIT.outcome + ' (is ' + ((r[b] || {}).outcome || '').length + ')');
      Object.keys(r[b] || {}).forEach(k => ok(['effects', 'outcome'].includes(k), w + '.' + b + ': unknown key ' + k));
      ok((ch.outcome + ' ' + r[b].outcome).length <= LIMIT.rollPair, w + '.' + b + ': set-up + result ≤' + LIMIT.rollPair);
    }
  });
  ok(rolls >= 8, 'expected at least 8 gambles, got ' + rolls);
});

test('cards: forced week-one card is lord_abyssus (one per band at most, each gated to its band)', () => {
  const forced = CARDS.filter(c => c.forceWeek === 1 && c.gate.band.includes('hail_damage'));
  eq(forced.map(c => c.id), ['lord_abyssus']);
  ok(/Lord Abyssus/.test(forced[0].text) && forced[0].speaker === 'marcel', 'Marcel answers only to Lord Abyssus');
  CARDS.filter(c => c.forceWeek != null).forEach(c => ok(c.gate.band.length === 1, c.id + ': a forced card belongs to one band'));
  BAND_IDS.forEach(b => ok(CARDS.filter(c => c.forceWeek === 1 && c.gate.band.includes(b)).length <= 1, b + ': at most one week-one card'));
});

test('cards: every gated flag is set by some card (or by the sim), with a matching value', () => {
  const set = {};                                      // flag -> Set of values cards assign (true for truthy)
  for (const c of CARDS) for (const { fx } of effectsOf(c)) if (fx.flags) for (const f in fx.flags) (set[f] = set[f] || new Set()).add(fx.flags[f]);
  for (const c of CARDS) {
    const g = c.gate;
    for (const f of (g.flags || []).concat(g.notFlags || [])) ok(set[f] || SIM_FLAGS.includes(f), c.id + ': gates on flag ' + f + ' that nothing sets');
    for (const f in (g.flagEquals || {})) ok((set[f] && set[f].has(g.flagEquals[f])) || (SIM_FLAG_VALUES[f] || []).includes(g.flagEquals[f]), c.id + ': flagEquals ' + f + '=' + g.flagEquals[f] + ' is never set');
  }
});

// ---- Chains -----------------------------------------------------------
test('chains: steps contiguous from 1; chain cards gate only on flags', () => {
  ok(CHAIN_IDS.includes('cape'), 'the Cape Saga chain exists');
  for (const id of CHAIN_IDS) {
    const cards = CARDS.filter(c => c.chain === id), steps = [...new Set(cards.map(c => c.step))].sort((a, b) => a - b);
    eq(steps, steps.map((_, i) => i + 1), id + ': steps must be 1..n');
    eq(cards.filter(c => c.step === 1).length, 1, id + ': exactly one step-1 card');
    const base = ['era', 'genre', 'band', 'region'];
    for (const c of cards.filter(c => c.step > 1)) Object.keys(c.gate).forEach(k => ok(base.includes(k) || ['flags', 'notFlags', 'flagEquals'].includes(k), c.id + ': later chain steps may only gate on flags (got ' + k + ')'));
    for (const c of cards) for (const { fx, where } of effectsOf(c)) if (fx.chain && fx.chain[id]) {
      const s = fx.chain[id].step;
      ok(s === 'end' || s === c.step + 1, where + ': chain must advance one step or end');
    }
  }
  const cape = CARDS.filter(c => c.chain === 'cape');
  ok(cape.length >= 5 && cape.length <= 7, 'Cape Saga has 5–7 cards');
  eq(Math.max(...cape.map(c => c.step)), 4, 'Cape Saga spans steps 1–4');
  ok(cape.some(c => c.choices.some(ch => ch.roll && ch.roll.stat === 'chemistry')), 'the spin debut is a chemistry roll');
});

test('chains: every branch of every chain reaches an end (cape flag valid, helper flags cleared)', () => {
  for (const id of CHAIN_IDS) {
    const cards = CARDS.filter(c => c.chain === id);
    const visited = new Set(), ends = [], problems = [];
    const g1 = (cards.find(c => c.step === 1) || {}).gate || {}, seed = Object.assign({}, g1.flagEquals || {});
    (g1.flags || []).forEach(f => { seed[f] = true; });   // a chain may start from a flag (moose: mooseMuse)
    (function visit(st, depth, path) {
      if (depth > 10) { problems.push('loop at ' + path); return; }
      const due = cards.filter(c => c.step === st.step && flagGatePasses(c.gate, st.flags));
      if (!due.length) { problems.push('dead end at step ' + st.step + ' via ' + path + ' flags ' + JSON.stringify(st.flags)); return; }
      if (due.length > 1) problems.push('ambiguous step ' + st.step + ' via ' + path + ': ' + due.map(c => c.id));
      for (const card of due) {
        visited.add(card.id);
        card.choices.forEach((ch, i) => {
          for (const br of ch.roll ? [ch.roll.success, ch.roll.fail] : [null]) {
            const s2 = Object.assign({}, st, { flags: Object.assign({}, st.flags), chains: {} });
            applyRouting(ch.effects, s2); if (br) applyRouting(br.effects, s2);
            const next = s2.chains[id], p = path + ' > ' + card.id + '#' + i + (br ? (br === ch.roll.success ? '+' : '-') : '');
            if (!next) problems.push('no chain effect at ' + p);
            else if (next.step === 'end') ends.push({ path: p, flags: s2.flags });
            else visit(Object.assign(s2, { step: next.step }), depth + 1, p);
          }
        });
      }
    })({ era: 'garage', genre: 'metal', region: 'canada', bandId: 'hail_damage', flags: seed, step: 1 }, 0, 'start');
    eq(problems, [], id + ': branch problems');
    eq(cards.filter(c => !visited.has(c.id)).map(c => c.id), [], id + ': unreachable chain cards');
    ok(ends.length >= 5, id + ': expected several endings, got ' + ends.length);
    if (id === 'cape') for (const e of ends) {
      ok(CAPE_VALUES.includes(e.flags.cape), 'cape ends without a valid cape flag: ' + e.path + ' -> ' + e.flags.cape);
      ok(!('capePlan' in e.flags) && !('capeSpin' in e.flags), 'helper flags left behind: ' + e.path);
    }
    if (id === 'cape') {
      const finals = new Set(ends.map(e => e.flags.cape));
      CAPE_VALUES.forEach(v => ok(finals.has(v), 'no branch ends with cape=' + v));
    }
  }
});

// ---- Year shape and the 240-week draw ------------------------------------
test('cards: year one has early, mid (fans) and late cards, all six types, and repeatables (Hail Damage)', () => {
  const normal = CARDS.filter(c => !c.chain && !c.forceWeek && c.gate.band.includes('hail_damage'));
  const early = normal.filter(c => c.gate.maxWeek && c.gate.maxWeek <= 16);
  const fans40 = normal.filter(c => c.gate.minFans >= 25 && c.gate.minFans < 100);
  const fans100 = normal.filter(c => c.gate.minFans >= 100);
  const late = normal.filter(c => c.gate.minWeek >= 12 || (c.gate.weekOfYear && c.gate.weekOfYear[0] >= 11));
  const repeat = normal.filter(c => c.once === false);
  ok(normal.length >= 20, '~20+ Monday cards, got ' + normal.length);
  ok(early.length >= 4, 'early cards: ' + early.length);
  ok(fans40.length >= 5, 'mid (fans 25–99) cards: ' + fans40.length);
  ok(fans100.length >= 3, 'mid (fans ≥100) cards: ' + fans100.length);
  ok(late.length >= 5, 'late cards: ' + late.length);
  ok(repeat.length >= 5, 'repeatable cards: ' + repeat.length);
  C.CARD_TYPES.forEach(t => ok(normal.filter(c => c.type === t).length >= 3, 'type ' + t + ' needs ≥3 cards'));
  HD_IDS.forEach(id => ok(normal.filter(c => c.speaker === id || c.id.startsWith(id + '_')).length >= 2, id + ' needs ≥2 signature cards'));
});

// v0.5: the draw walks the eras like a Steady career: garage → local at 250 fans → signed at week 64 (each label in turn).
function drawCareer(label, seed) {
  const rng = GG.RNG(seed);
  const s = { era: 'garage', genre: 'metal', region: 'canada', bandId: 'hail_damage', fund: 300, buzz: 20, chemistry: 50, gig: null,
    flags: {}, chains: {}, seen: {}, members: HD.members.map(m => ({ id: m.id, mood: m.mood })) };
  const eligible = c => {
    if (c.forceWeek || !drumSeat(c)) return false;
    if (c.chain && (c.step !== 1 || s.chains[c.chain])) return false;
    const last = s.seen[c.id];
    if (last != null && (c.once !== false || s.totalWeek - last < (c.cooldown || 0))) return false;
    return gatePasses(c.gate, s);
  };
  const out = { dry: [], year1: new Set(), counts: {}, byEra: { garage: new Set(), local: new Set(), signed: new Set() }, s };
  for (let w = 1; w <= C.CAREER_YEARS * C.WEEKS_PER_YEAR; w++) {
    s.totalWeek = w; s.year = Math.ceil(w / C.WEEKS_PER_YEAR); s.week = (w - 1) % C.WEEKS_PER_YEAR + 1;
    s.fans = w <= 24 ? 12 + w * 12 : w <= 64 ? 300 + (w - 24) * 10 : 700 + (w - 64) * 40;
    if (s.era === 'garage' && s.fans >= 250) s.era = 'local';
    if (w === 64) { s.era = 'signed'; s.flags.label = label; }
    if (w === 40) s.flags.parentsLoan = true;
    if (w === 100) delete s.flags.parentsLoan;          // the loan gets paid off: later eras must not lean on guilt cards
    if (w % 30 === 0) s.members[w / 30 % 4].mood = 30; else if (w % 30 === 5) s.members.forEach(m => { m.mood = 60; });
    let pool = CARDS.filter(c => c.forceWeek === w && s.seen[c.id] == null && drumSeat(c));
    if (!pool.length) pool = CARDS.filter(c => c.chain && s.chains[c.chain] && s.chains[c.chain].step === c.step && s.chains[c.chain].due <= w && gatePasses(c.gate, s) && drumSeat(c));
    if (!pool.length) pool = CARDS.filter(eligible);
    if (!pool.length) { out.dry.push(s.era + '@' + w); continue; }
    const card = rng.weighted(pool, c => c.weight || 1), ch = rng.pick(card.choices);
    s.seen[card.id] = w; out.counts[card.id] = (out.counts[card.id] || 0) + 1; out.byEra[s.era].add(card.id);
    if (s.year === 1) out.year1.add(card.id);
    applyRouting(ch.effects, s);
    if (ch.roll) applyRouting(rng.chance(0.5) ? ch.roll.success.effects : ch.roll.fail.effects, s);
  }
  return out;
}

test('a seeded 240-week draw never runs dry and stays varied, through garage, Local Heroes and Signed (each label)', () => {
  C.LABELS.forEach((label, i) => {
    const r = drawCareer(label, 20260929 + i), w = label + ': ';
    eq(r.dry, [], w + 'weeks with no eligible Monday card');
    ok(r.year1.size >= 18, w + 'year one should show ≥18 different cards, got ' + r.year1.size);
    ok(r.s.chains.cape && r.s.chains.cape.step === 'end', w + 'the Cape Saga finishes within the career');
    ok(Object.values(r.counts).every(n => n <= 30), w + 'no card repeats more than 30 times in 240 weeks');
    ok(r.byEra.local.size >= 12, w + 'Local Heroes should show ≥12 different cards, got ' + r.byEra.local.size);
    ok(r.byEra.signed.size >= 20, w + 'Signed should show ≥20 different cards, got ' + r.byEra.signed.size);
    const labelCards = CARDS.filter(c => c.gate.flagEquals && c.gate.flagEquals.label === label);
    ok(labelCards.length >= 2 && labelCards.filter(c => r.byEra.signed.has(c.id)).length >= 2, w + 'label cards show up once signed');
  });
});

// ---- Lines ------------------------------------------------------------
test('lines: every pool is present and big enough', () => {
  const L = K.lines;
  C.ACTIVITIES.forEach(a => ok(L.activity[a] && L.activity[a].length >= 5, 'activity.' + a + ' needs ≥5 lines'));
  Object.keys(L.activity).forEach(a => ok(C.ACTIVITIES.includes(a), 'unknown activity ' + a));
  for (const id of HD_IDS) {
    ['happy', 'ok', 'grumpy', 'sulking'].forEach(b => ok(L.chat[id] && L.chat[id][b] && L.chat[id][b].length >= 4, 'chat.' + id + '.' + b + ' needs ≥4'));
    ['great', 'ok', 'bad'].forEach(b => ok(L.gigReactions[id] && L.gigReactions[id][b] && L.gigReactions[id][b].length >= 3, 'gigReactions.' + id + '.' + b + ' needs ≥3'));
    ok(L.tap[id] && L.tap[id].length >= 5, 'tap.' + id + ' needs ≥5');
  }
  ok(L.guilt.length >= 6, 'guilt ≥6'); ok(L.yearEnd.length >= 4, 'yearEnd ≥4'); ok(L.quietWeek.length >= 6, 'quietWeek ≥6');
  ok(/night school/i.test(L.guilt.join(' ')), 'the night-school guilt line');
  for (const [p, s] of strings(L, 'lines')) ok(str(s, LIMIT.line), p + ': empty or longer than ' + LIMIT.line);
  (function noDupes(v, p) {                            // no line repeats inside one pool
    if (Array.isArray(v)) {
      const t = v.filter(x => typeof x === 'string');
      eq(t.length, new Set(t).size, p + ': duplicate line');
      v.forEach((x, i) => { if (x && typeof x === 'object') noDupes(x, p + '[' + i + ']'); });
    } else if (v && typeof v === 'object') for (const k in v) noDupes(v[k], p + '.' + k);
  })(L, 'lines');
  // v0.9: every band's own pools (flat + byGenre + byBand) are big enough and repeat nothing
  for (const b of BAND_IDS) {
    C.ACTIVITIES.forEach(a => { const p = poolFor(L, ['activity', a], b); ok(p.length >= 5 && p.length === new Set(p).size, b + ': activity.' + a); });
    [['guilt', 6], ['yearEnd', 4], ['quietWeek', 6], ['vanArrive', 3], ['genreClash', 3], ['venueUp', 3], ['venueBanned', 3], ['vanTired', 3], ['breakdown', 3]]
      .forEach(([k, n]) => { const p = poolFor(L, [k], b); ok(p.length >= n && p.length === new Set(p).size, b + ': ' + k + ' (' + p.length + ')'); });
  }
});

test('lines: Kenji never speaks', () => {
  const kenji = strings([K.lines.chat.kenji, K.lines.gigReactions.kenji, K.lines.tap.kenji, K.lines.songReactions.kenji], 'kenji');
  for (const [p, s] of kenji) ok(/^(…|\.|👍|\(.*\))$/u.test(s), p + ': Kenji said words: ' + s);
});

test('text tokens are only {player} {band} {city} {rival} {nick:id} {name:id} + the v0.9 C.TOKENS (+ v0.4 {recruit}; {who} {gripe} in drama.stageText)', () => {
  const bad = [];
  const CAST_PEOPLE = [];   // v0.9: {name:<castId>} (a rival cast member)
  Object.values((K.rivalry && K.rivalry.cast) || {}).forEach(c => [].concat(c.members || [], c.drummer || [], c.mascot || []).forEach(m => { if (m && m.id) CAST_PEOPLE.push(m.id); }));
  for (const [p, s] of strings(K, 'content')) {
    const re = /\{([^}]*)\}/g; let m;
    while ((m = re.exec(s))) {
      const t = m[1], parts = t.split(':');
      const good = ['player', 'band', 'city', 'recruit', 'rival'].includes(t) || C.TOKENS.includes(t)   // v0.9: §4.2 tokens everywhere
        || (/^content\.drama\.stageText/.test(p) && ['who', 'gripe'].includes(t))
        || (/^content\.reviews\./.test(p) && ['album', 'single'].includes(t)) || (/^content\.awards\./.test(p) && t === 'category')
        || (/^content\.albumWords\.(titles\.\w+|chartFiller)\.forms/.test(p) && ['adj', 'noun', 'place'].includes(t))   // (v0.9 fixer: + the Maple 100's neutral chartFiller pool, same slots)
        || (/^content\.rivalry\./.test(p) && ['rival', 'album', 'pos', 'fans', 'venue', 'name', 'prize', 'n'].includes(t))   // v0.6
        || (/^content\.calendar\.(holidays|byBand)/.test(p) && t === 'costume')   // v0.6.1: Halloween costume band (v0.9: + byBand holidayLines)
        || (/^content\.world\./.test(p) && ['region', 'song', 'festival', 'here', 'rival', 'venue'].includes(t))   // v0.7: GG.tour tokens
        || (/^content\.bandbook\./.test(p) && ['who', 'song', 'venue', 'gcity', 'views', 'n', 'money', 'rival'].includes(t))   // v0.6.1: GG.fans tokens
        || (/^content\.(licensing|licenseChoices|licenseCards)\b/.test(p) && ['brand', 'adwhat', 'adsong', 'adfee', 'adcounter', 'adtake', 'adodds', 'adleft'].includes(t))   // v0.8.1: GG.licensing tokens
        || (/^content\.recap\./.test(p) && ['rival', 'nth', 'next', 'n', 'target', 'name', 'award', 'album', 'cert', 'label', 'region', 'venue', 'brand', 'song', 'van'].includes(t))   // v0.8.1: GG.recap tokens
        || (parts.length === 2 && ['nick', 'name'].includes(parts[0]) && (ALL_MEMBER_IDS.includes(parts[1]) || CAST_PEOPLE.includes(parts[1])));
      if (!good) bad.push(p + ': {' + t + '}');
    }
    if (/[{}]/.test(s.replace(/\{[^{}]*\}/g, ''))) bad.push(p + ': stray brace');
  }
  eq(bad, [], 'bad tokens');
});

// ---- Presets and song titles ---------------------------------------------
test('presets: six valid drummer looks with kit colours', () => {
  ok(K.presets.length >= 6, 'need ≥6 presets');
  eq(new Set(K.presets.map(p => p.id)).size, K.presets.length, 'unique preset ids');
  for (const p of K.presets) {
    ok(/^[a-z][a-z0-9_]*$/.test(p.id) && str(p.name, 24) && str(p.blurb, 100), 'preset ' + p.id + ' shape');
    checkLook(p.look, 'preset ' + p.id);
    ok(isHex(p.kitColor), 'preset ' + p.id + ' kitColor');
  }
  eq(new Set(K.presets.map(p => p.kitColor)).size, K.presets.length, 'kit colours should differ');
});

// v0.7.2 (owner, 2026-09-30: "English, Marcel rarely French"): metal titles are English; each keeps Marcel's French
// original (he sneaks one in now and then). Every French title ever handed out (v0.1–v0.7.1 pool + starters) must stay
// in content so old saves can be renamed to English on load (GG.songs.migrateTitles matches by `fr`).
const V071_FR = ['Le Tombeau Vert', 'Sang sur le Gazon', "L'Hiver Dévore Mon Gazon", 'Chiendent Éternel', 'La Tondeuse des Ténèbres',
  'Arrosage Interdit', "Les Gaufres de l'Enfer", 'Engrais de la Nuit', 'Le Voisin a Coupé Trop Court', 'Pissenlit, Mon Ennemi',
  'Rosée Mortelle', 'Brûlé par le Soleil de Juillet', 'La Clôture du Désespoir', 'Racines Profondes, Âme Sombre', 'Grêle sur la Pelouse',
  "L'Aube du Gazon Mort", 'Sous la Neige, Mon Gazon Attend', 'Le Pacte du Semis', 'Arroseur du Chaos', 'Les Chiens du Voisin',
  'Trèfle Maudit', 'Messe Noire pour un Gazon Vert', "Le Râteau de l'Abîme", 'Trois Centimètres ou la Mort',
  "Le Tuyau d'Arrosage Sanglant", 'Chaume Éternel', 'Le Roi des Mauvaises Herbes', 'Gazon Synthétique: Blasphème',
  'Rituel de la Première Tonte', 'Les Vers de Terre Sont Mes Frères', 'Invocation de la Pluie', "Les Feuilles d'Automne Doivent Mourir",
  'Mon Gazon, Ma Reine', "L'Épouvantail de Gravelbourg", 'Tonte à Minuit', 'Le Dernier Brin', 'Bordures Tranchantes', 'Pelouse Interdite'];
const V071_STARTERS = ['Ma Pelouse, Mon Tombeau', "Les Pissenlits de l'Apocalypse"];
const LAWN = /lawn|grass|mow|turf|weed|dandelion|sprinkler|rake|hose|fertiliz|thatch|clover|seed|gopher|edging|dew|sod/i;
test('song titles: ≥30 English metal titles (Marcel keeps a French original for each), all secretly about the lawn', () => {
  const metal = K.songTitles.metal, starters = HD.starterSongs;
  ok(metal.length >= 30, 'need ≥30 metal titles, got ' + metal.length);
  eq(new Set(metal.map(t => t.en)).size, metal.length, 'duplicate English titles');
  eq(new Set(metal.map(t => t.fr)).size, metal.length, 'duplicate French titles');
  const taken = new Set(starters.flatMap(s => [s.title, s.fr]));
  for (const t of metal) {
    ok(str(t.en, 42) && str(t.fr, 42) && t.en !== t.fr, 'title shape/length (≤42: it is the headline now): ' + t.en);
    ok(!taken.has(t.en) && !taken.has(t.fr), 'starter song duplicated in pool: ' + t.en);
    ok(LAWN.test(t.en), 'English title not about the lawn: ' + t.en);
    ok(!/ (II|III|IV|V|VI|VII|VIII|IX|X|\d+)$/.test(t.en) && !/ (II|III|IV|V|VI|VII|VIII|IX|X|\d+)$/.test(t.fr), 'looks like a sequel: ' + t.en);
  }
  const fr = new Set(metal.map(t => t.fr));
  V071_FR.forEach(f => ok(fr.has(f), 'a v0.7.1 French title left the pool (old saves could not turn English): ' + f));
  // Hail Damage starters: English titles (titleEn null = already English) + Marcel's French original.
  eq(starters.map(s => s.fr), V071_STARTERS, 'starters keep their French originals (pattern seeds + old-save renames)');
  ok(starters.every(s => s.titleEn === null && str(s.title, 60) && s.title !== s.fr && LAWN.test(s.title)), 'starters are English and about the lawn');
  eq(starters[0].title, 'My Lawn, My Tomb');
  ['punk', 'rock', 'country'].forEach(g => ok(K.songTitles[g] && K.songTitles[g].length >= 5 && K.songTitles[g].every(t => str(t, 60)), g + ' titles are plain English strings'));
});

test('v0.7.2: cards and lines name songs by their English titles (no old French starter/pool title left in text)', () => {
  const fr = new Set(K.songTitles.metal.map(t => t.fr));
  Object.values(K.bands).forEach(b => (b.starterSongs || []).forEach(s => s.fr && fr.add(s.fr)));
  const offenders = [];
  for (const [p, s] of strings({ cards: K.cards, lines: K.lines }, 'content')) for (const f of fr) if (s.includes(f)) offenders.push(p + ': ' + f);
  eq(offenders, [], 'a card or line still uses a French title the player never sees');
});

test('v0.7.2: no content claims every song title is French; Marcel still sings in French', () => {
  const offenders = [];
  for (const [p, s] of strings(K, 'content')) {
    if (/content\.albumWords/.test(p)) continue;   // album titles: one French pitch among the options (24_sim_labels)
    if (/(A|a) French (name|title)\. I have it|French ones\. Nobody knows|do the French thing again|names? (every|each) song in French/.test(s)) offenders.push(p + ': ' + s);
  }
  eq(offenders, [], 'text still says titles are French');
  const L = K.lines.songReactions;
  ok(L.marcel.name.length >= 5 && L.marcel.nameFr.length >= 4, 'Marcel names songs (English) and insists on a French one now and then');
  ['dana', 'jaxon', 'kenji'].forEach(id => ok(L[id].frSigh && L[id].frSigh.length >= 3, id + ' sighs about the French title'));
  ok(L.kenji.frSigh.every(x => /^\(.*\)$/.test(x)), 'Kenji sighs without words');
  ok(/translat/i.test(CARDS.find(c => c.id === 'marcel_lawn_lyrics').text) && /French lyrics/.test(CARDS.find(c => c.id === 'marcel_lawn_lyrics').text), 'the fan still translates the (French) lyrics');
  ok(/screams every lyric in French/.test(HD.members.find(m => m.id === 'marcel').bio), 'Marcel still screams in French');
});

// ---- v0.3 world: venues, map, headliners, road cards, road lines -------------------------------------
const SASK_CORE = ['Saskatoon', 'Regina', 'Prince Albert', 'Moose Jaw', 'Swift Current', 'North Battleford', 'Yorkton', 'Warman', 'Martensville'];
// v0.6.1 (Addendum 1 C6): Canada in rings. v0.9 (owner Q1a): Alberta is its own ring (the Gravel Kings' home, Local Heroes
// for everyone else); south-west Saskatchewan (the Ramblers' country) joins the Sask ring.
const RINGS = {
  sask: SASK_CORE.concat(['Humboldt', 'Gravelbourg', 'Estevan', 'Maple Creek', 'Gull Lake', 'Shaunavon']),
  alberta: ['Edmonton', 'St. Albert', 'Sherwood Park', 'Leduc', 'Red Deer', 'Calgary', 'Lethbridge'],
  west: ['Winnipeg', 'Brandon', 'Kelowna', 'Vancouver', 'Victoria'],
  eastnorth: ['Thunder Bay', 'Toronto', 'Ottawa', 'Montréal', 'Québec City', 'Halifax', "St. John's", 'Whitehorse', 'Yellowknife']
};
test('map: Canada in rings (Sask from day one, Alberta + the West in Local Heroes, East & North in Signed), pins in the box, real-ish km, connected', () => {
  const M = K.map, ids = Object.keys(M.cities), ringIds = M.rings.map(r => r.id);
  eq(M.rings.map(r => r.id + ':' + r.era), ['sask:garage', 'alberta:local', 'west:local', 'eastnorth:signed'], 'owner decision: rings + eras');
  // every ring can be locked for some band (a band's home ring opens on day one), so every ring has a teaser
  M.rings.forEach(r => { ok(str(r.name, 24) && str(r.sub, 80) && str(r.lock, 120), 'ring ' + r.id); if (r.era !== 'garage') ok(r.home && r.home.w > 0 && str(r.home.label, 32), 'home box ' + r.id); });
  M.rings.forEach(r => {
    if (r.home && r.home.labels) Object.keys(r.home.labels).forEach(k => ok(ringIds.includes(k) && str(r.home.labels[k], 32), r.id + ': home.labels.' + k));
    if (r.homeBy) Object.keys(r.homeBy).forEach(k => ok(ringIds.includes(k) && r.homeBy[k].w > 0 && str(r.homeBy[k].label, 32), r.id + ': homeBy.' + k));
  });
  ok(!/Kenji/.test(JSON.stringify(M.rings)), 'lock texts without Kenji');
  for (const ring in RINGS) eq(ids.filter(id => M.cities[id].ring === ring).map(id => M.cities[id].name).sort(), RINGS[ring].slice().sort(), 'owner decision: ' + ring + ' cities');
  eq(ids.length, Object.values(RINGS).reduce((n, l) => n + l.length, 0), 'no stray cities');
  near2Alberta();
  ids.forEach(id => { const c = M.cities[id]; ok(c.id === id && c.x >= 0 && c.x <= 1 && c.y >= 0 && c.y <= 1 && str(c.blurb, 80) && (!c.climate || ['coast', 'north'].includes(c.climate)), 'city ' + id); });
  const ringOf = id => M.cities[id].ring;
  M.roads.forEach(r => ok(ids.includes(r[0]) && ids.includes(r[1]) && r[0] !== r[1] && isInt(r[2]) && r[2] >= 5 && r[2] <= (ringOf(r[0]) === 'sask' && ringOf(r[1]) === 'sask' ? 500 : 2000) && str(r[3], 30), 'road ' + r.join('-')));
  const near2 = (a, b, lo, hi) => { const k = GG.world.km(a, b); ok(k >= lo && k <= hi, a + '-' + b + ' ' + k + ' km'); };
  near2('saskatoon', 'calgary', 600, 640); near2('saskatoon', 'edmonton', 500, 560); near2('regina', 'winnipeg', 540, 600);
  near2('saskatoon', 'humboldt', 100, 125); near2('regina', 'estevan', 180, 220); near2('toronto', 'montreal', 500, 560);
  ok(K.venues.some(v => v.name === 'Commandant Ballroom' && v.city === 'Vancouver') && K.venues.some(v => v.name === 'The Hoofprint' && v.city === 'Toronto')
    && K.venues.some(v => v.name === 'Frostbite Lounge' && v.city === 'Winnipeg'), 'the contract parody venues');
  const W = GG.world;
  ids.forEach(a => ids.forEach(b => { ok(a === b || W.km(a, b) > 0, 'connected ' + a + '-' + b); eq(W.km(a, b), W.km(b, a)); }));
  const near = (a, b, lo, hi) => { const k = W.km(a, b); ok(k >= lo && k <= hi, a + '-' + b + ' ' + k + ' km'); };
  near('saskatoon', 'regina', 220, 260); near('regina', 'moose_jaw', 60, 80); near('saskatoon', 'prince_albert', 130, 150);
  near('saskatoon', 'north_battleford', 130, 150); near('regina', 'yorkton', 170, 200); near('saskatoon', 'warman', 15, 30);
});
// v0.9: the new satellites sit where they should (real-ish road km)
function near2Alberta() {
  const W = GG.world, near = (a, b, lo, hi) => { const k = W.km(a, b); ok(k >= lo && k <= hi, a + '-' + b + ' ' + k + ' km'); };
  near('edmonton', 'st_albert', 10, 25); near('edmonton', 'sherwood_park', 12, 30); near('edmonton', 'leduc', 25, 45);
  near('swift_current', 'gull_lake', 45, 65); near('swift_current', 'maple_creek', 110, 140); near('swift_current', 'shaunavon', 100, 135);
}

test('venues: v0.1 ids kept, Sask core cities, kinds, deals, pay ranges, quirk + catch, tiers', () => {
  const V = K.venues, ids = V.map(v => v.id), cities = Object.values(K.map.cities).map(c => c.name);
  const seasons = ['summer', 'fall', 'winter', 'spring'], holidays = K.calendar.holidays.map(h => h.id);
  ['buddys_house_party', 'gopher_hole_openmic', 'martensville_skatepark', 'legion_63', 'bingo_palace', 'warman_curling_lounge',
    'st_vlads_hall', 'gopher_hole'].concat(BOOKABLE).forEach(id => ok(ids.includes(id), 'kept ' + id));
  eq(new Set(ids).size, ids.length, 'unique ids');
  ok(V.length >= 18, 'enough venues: ' + V.length);
  V.forEach(v => {
    const w = 'venue ' + v.id;
    ok(/^[a-z][a-z0-9_]*$/.test(v.id) && str(v.name, 48) && cities.includes(v.city) && v.region === 'canada', w + ': basics');
    ok(C.VENUE_KINDS.includes(v.kind), w + ': kind ' + v.kind);
    ok(v.tier === 1 || v.tier === 2 || v.tier === 3, w + ': tier');   // v0.5: tier 3 theatres (500–2,000), Signed era
    ok(v.tier === 1 ? v.capacity >= 10 && v.capacity <= 150 : v.tier === 2 ? v.capacity >= 100 && v.capacity <= 400 : v.capacity >= 500 && v.capacity <= 2000, w + ': capacity ' + v.capacity);
    ok(v.tier === 1 ? v.setSize >= 2 && v.setSize <= 4 : v.setSize >= 4 && v.setSize <= 5, w + ': setSize');
    ok(isInt(v.minFans) && v.minFans >= 0 && isInt(v.walkIns) && v.walkIns >= 0 && v.walkIns < v.capacity, w + ': fans/walk-ins');
    ok(str(v.quirk, LIMIT.line) && str(v.catch, LIMIT.line), w + ': quirk + catch');
    C.GENRES.forEach(g => ok(v.genreFit[g] >= 0 && v.genreFit[g] <= 1, w + ': fit ' + g));
    ok(Array.isArray(v.deals) && v.deals.length && v.deals.every(d => C.DEALS.includes(d)) && v.deals.includes(v.deal), w + ': deals');
    v.deals.filter(d => d !== 'exposure').forEach(d => { const r = v.payRange[d]; ok(r && r[0] > 0 && r[0] <= r[1], w + ': payRange ' + d); });
    ok(v.deal === 'exposure' ? v.pay === 0 : v.pay > 0, w + ': default pay');
    // v0.6.1: outdoor rooms (weather turnout), seasonal rooms, holiday rooms (only listed while they're on)
    if ('outdoor' in v) ok(v.outdoor === true, w + ': outdoor');
    if (v.season) ok(Array.isArray(v.season) && v.season.length && v.season.every(x => seasons.includes(x)), w + ': season');
    if (v.weeks) ok(v.weeks.length === 2 && isInt(v.weeks[0]) && v.weeks[0] >= 1 && v.weeks[1] <= 24 && v.weeks[0] <= v.weeks[1], w + ': weeks');
    if (v.holiday) ok(holidays.includes(v.holiday), w + ': holiday ' + v.holiday);
  });
  for (const ring in RINGS) RINGS[ring].forEach(c => ok(V.some(v => v.city === c), 'a venue in ' + c + ' (' + ring + ')'));
  ok(V.some(v => v.holiday === 'canada_day' && v.outdoor) && V.some(v => v.holiday === 'christmas') && V.some(v => v.season && v.season.includes('summer') && v.outdoor)
    && V.some(v => v.weeks && v.weeks[0] >= 5 && v.weeks[1] <= 6) && V.some(v => v.season && v.season.includes('fall') && v.genreFit.country >= 1), 'Canada Day park shows, the party circuit, summer fairs, frosh week, harvest dances');
  const kinds = new Set(V.map(v => v.kind)); C.VENUE_KINDS.forEach(k => ok(kinds.has(k), 'some venue is a ' + k));
  const deals = new Set([].concat(...V.map(v => v.deals))); eq([...deals].sort(), ['door', 'exposure', 'flat']);
  SASK_CORE.forEach(c => ok(V.some(v => v.city === c), 'a venue in ' + c));
  ok(V.some(v => v.name === 'The Gopher Hole' && v.city === 'Saskatoon') && V.some(v => v.name === "Pile o' Bones Tavern" && v.city === 'Regina'), 'the A7 parody venues');
  ok(V.filter(v => v.tier === 1 && v.minFans === 0).length >= 3, 'a fresh band has at least three rooms');
  ok(V.some(v => v.tier === 1 && v.genreFit.metal < 0.45) && V.some(v => v.tier === 2 && v.genreFit.metal < 0.45), 'metal has clash rooms');
  // v0.9: every band's home ring has at least three small rooms a new band can play (26_sim_world homeRooms), a home city
  // with a room of its own, and clash rooms for its genre; the owner's new rooms exist
  const ringOfCity = name => (Object.values(K.map.cities).find(c => c.name === name) || {}).ring;
  for (const b of Object.values(K.bands)) {
    const home = V.filter(v => ringOfCity(v.city) === b.homeRing && v.tier === 1 && v.minFans <= 60);
    ok(home.length >= 3, b.id + ': small rooms in the home ring: ' + home.length);
    ok(V.some(v => v.city === b.city && v.tier === 1 && v.minFans <= 60), b.id + ': a small room in ' + b.city);
    ok(V.some(v => v.genreFit[b.genre] < 0.45), b.id + ': ' + b.genre + ' has clash rooms');
  }
  ['mill_woods_basement_party', 'quonset_yard_party', 'queen_city_skate_park', 'cypress_harvest_hall'].forEach(id => ok(ids.includes(id), 'owner Q1: ' + id));
  ok(V.find(v => v.id === 'queen_city_skate_park').kind === 'skatepark' && V.find(v => v.id === 'cypress_harvest_hall').season.includes('fall'), 'the Regina all-ages skate park, a harvest-dance hall');
  ok(V.filter(v => v.city === 'Edmonton' && v.tier <= 2).length >= 3, 'Edmonton tier 1-2 rooms');
  BOOKABLE.forEach(id => ok(ids.includes(id), 'C.CARD_BOOKABLE venue ' + id));
});

test('headliners: local parody bands for opening slots', () => {
  const H = K.headliners, cities = Object.values(K.map.cities).map(c => c.name);
  ok(H.length >= 5, 'headliners');
  H.forEach(h => ok(/^[a-z][a-z0-9_]*$/.test(h.id) && str(h.name, 32) && C.GENRES.includes(h.genre) && cities.includes(h.city)
    && isInt(h.draw) && h.draw >= 50 && h.draw <= 200 && str(h.blurb, LIMIT.line), 'headliner ' + h.id));
  C.GENRES.forEach(g => ok(H.some(h => h.genre === g), 'a ' + g + ' headliner'));
});

const ROAD_GATES = ['minKm', 'maxKm', 'season', 'driver', 'weather', 'holiday'], SEASONS = ['summer', 'fall', 'winter', 'spring'];
test('road cards: ~12, Monday-card schema, road gates, van effects, gamble hints, Kenji never speaks', () => {
  const R = K.roadCards, ids = new Set(), all = [];
  ok(R.length >= 12, 'road cards: ' + R.length);
  for (const c of R) {
    const w = 'road card ' + c.id;
    ok(/^road_[a-z0-9_]+$/.test(c.id) && !ids.has(c.id), w + ': id'); ids.add(c.id);
    ok(!CARDS.some(x => x.id === c.id), w + ': id collides with a Monday card');
    Object.keys(c).forEach(k => ok(CARD_KEYS.includes(k), w + ': key ' + k));
    ok(c.type === 'road' && speakerFits(c.speaker, impliedBands(c)) && c.speaker !== 'kenji', w + ': type/speaker');
    ok(str(c.title, LIMIT.title) && str(c.text, LIMIT.text), w + ': title/text length (' + c.text.length + ')');
    if (c.once === false) ok(isInt(c.cooldown) && c.cooldown >= 4, w + ': cooldown');
    if (c.gate) Object.keys(c.gate).forEach(k => ok(GATE_KEYS.includes(k) || ROAD_GATES.includes(k), w + ': gate ' + k));
    if (c.gate && c.gate.season) ok(c.gate.season.every(x => SEASONS.includes(x)), w + ': season');
    if (c.gate && c.gate.driver) ok(c.gate.driver.every(x => x === 'you' || (K.drivers[x] && K.drivers[x].band)), w + ': driver');
    if (c.gate && c.gate.weather) ok(c.gate.weather.every(x => C.WEATHER.includes(x)), w + ': weather');
    if (c.gate && c.gate.holiday) ok(c.gate.holiday.every(x => K.calendar.holidays.some(h => h.id === x)), w + ': holiday');
    if (/\bKenji (brakes|eases|pulls|sits at the wheel|drives)/.test(c.text + JSON.stringify(c.choices))) ok(c.gate && c.gate.driver && c.gate.driver.join() === 'kenji', w + ': Kenji at the wheel -> driver gate');
    ok(c.choices.length >= 2 && c.choices.length <= 3 && new Set(c.choices.map(x => x.label)).size === c.choices.length, w + ': choices');
    c.choices.forEach((ch, i) => {
      const cw = w + '#' + i;
      Object.keys(ch).forEach(k => ok(CHOICE_KEYS.includes(k), cw + ': key ' + k));
      ok(str(ch.label, LIMIT.label) && str(ch.outcome, LIMIT.outcome) && (!('hint' in ch) || str(ch.hint, LIMIT.hint)), cw + ': lengths');
      if (ch.roll) ok(/^Gamble: /.test(ch.hint || '') && ch.roll.success && ch.roll.fail && ch.roll.chance > 0 && ch.roll.chance < 1, cw + ': gamble');
      const fxs = [ch.effects, ch.roll && ch.roll.success.effects, ch.roll && ch.roll.fail.effects].filter(Boolean);
      ok(fxs.length, cw + ': does something');
      if (ch.effects && ch.effects.van) ok(ch.hint, cw + ': van effects need a hint');
      fxs.forEach(fx => {
        Object.keys(fx).forEach(k => ok(C.EFFECT_KEYS.includes(k) || k === 'van', cw + ': effect ' + k));
        ok(!fx.book && !fx.chain, cw + ': road cards neither book nor chain');
        for (const k of ['fund', 'fans', 'buzz', 'chemistry', 'burnout', 'drumSkill']) if (k in fx) {
          const m = MAG[k], mag = m.abs ? Math.abs(fx[k]) : fx[k]; ok(isInt(fx[k]) && fx[k] !== 0 && mag >= m.lo && mag <= m.hi, cw + ': ' + k + ' ' + fx[k]);
        }
        for (const k of ['mood', 'skill']) if (k in fx) for (const id in fx[k]) ok(memberKeyFits(id, impliedBands(c)) && isInt(fx[k][id]), cw + ': ' + k + '.' + id);
        if (fx.van) ok(Object.keys(fx.van).join() === 'condition' && isInt(fx.van.condition) && Math.abs(fx.van.condition) >= 1 && Math.abs(fx.van.condition) <= 10, cw + ': van');
      });
    });
    all.push(...strings(c, c.id).map(x => x[1]));
  }
  const talk = all.filter(s => /Kenji (says|said|asks|asked|shouts|whispers|yells|mutters)(?! nothing)|Kenji: /.test(s));
  eq(talk, [], 'Kenji never speaks');
  // v0.9: season, distance and anywhere cards (no trip restriction: a band gate only) for EVERY band; the you-drive pool too
  const TRIP = ROAD_GATES.concat(['region']);
  for (const b of BAND_IDS) {
    const mine = R.filter(c => impliedBands(c).includes(b) && !(c.gate && c.gate.driver && c.gate.driver.some(d => d !== 'you' && !MEMBERS_OF(b).includes(d))));
    ok(mine.some(c => c.gate && c.gate.season && c.gate.season.includes('winter')) && mine.some(c => c.gate && c.gate.minKm) && mine.some(c => !c.gate || !Object.keys(c.gate).some(k => TRIP.includes(k))), b + ': season, distance and anywhere cards');
    ok(mine.filter(c => c.gate && c.gate.driver && c.gate.driver.includes('you')).length >= 3, b + ': ≥3 you-drive cards');
  }
  ok(/moose/i.test(all.join(' ')) && /Yellowhead/.test(all.join(' ')) && /grain elevator/i.test(all.join(' ')) && /baba/i.test(all.join(' ')), 'the brief: moose, Yellowhead, grain elevators, Baba');
  ['road_cape_door', 'road_babas_lunch', 'road_mosquitoes', 'road_lead_foot', 'road_gas_argument', 'road_fowl_supper', 'road_banjo_hitchhiker', 'road_wrong_turn']
    .forEach(id => eq(R.find(c => c.id === id).gate.band, ['hail_damage'], id + ': Hail Damage\'s card (v0.9)'));
});

test('lines: van banter (Kenji silent), road + venue pools', () => {
  const L = K.lines;
  ['marcel', 'dana', 'jaxon'].forEach(id => ok(L.vanBanter[id] && L.vanBanter[id].length >= 5, 'vanBanter.' + id));
  ok(!L.vanBanter.kenji, 'Kenji has no banter');
  Object.keys(L.vanBanter).forEach(id => ok(ALL_MEMBER_IDS.includes(id), 'vanBanter member ' + id));   // v0.9: any band's member (gap #9)
  ok(L.vanKenji.length >= 4 && L.vanKenji.every(s => /^\(.*\)$/.test(s)), 'Kenji only gets stage directions');
  ['vanArrive', 'genreClash', 'venueUp', 'venueDown', 'venueBanned', 'vanTired', 'breakdown', 'openingSlot', 'sameCrowd']
    .forEach(k => ok(Array.isArray(L[k]) && L[k].length >= 3, 'lines.' + k + ' ≥3'));
});

// ---- v0.4 drama + recruits --------------------------------------------------
const DRAMA_CARDS = (K.dramaCards || []).concat(...((K.recruits && K.recruits.quirks) || []).map(q => q.cards || []));
// v0.9: + the new members' rules (plan_contract_0.9 §5 B2, 27_sim_drama RULES)
const RULES = ['spotlight', 'cape', 'solos', 'practice', 'freedom', 'baba', 'mystery', 'council', 'twoChords', 'van', 'eighties', 'lawsuit',
  'adulting', 'truck', 'stories', 'secretJoy', 'hat'];
const ACTS = ['settle', 'quit', 'return', 'later', 'rival'];
test('drama cards: schema, ids unique across all cards, speakers, lengths, effects (incl. member/payCut/repay)', () => {
  const ids = new Set(CARDS.map(c => c.id));
  ok(DRAMA_CARDS.length >= 25, 'drama + quirk cards: ' + DRAMA_CARDS.length);
  for (const c of DRAMA_CARDS) {
    const w = 'drama card ' + c.id;
    ok(/^[a-z][a-z0-9_]*$/.test(c.id) && !ids.has(c.id), w + ': id bad or duplicate'); ids.add(c.id);
    Object.keys(c).forEach(k => ok(CARD_KEYS.includes(k) && !['chain', 'step', 'forceWeek'].includes(k), w + ': key ' + k));
    ok(C.CARD_TYPES.includes(c.type), w + ': type');
    ok(speakerFits(c.speaker, impliedBands(c), ['recruit']), w + ': speaker ' + c.speaker);
    ok(str(c.title, LIMIT.title) && str(c.text, LIMIT.text), w + ': title/text length (' + c.text.length + ')');
    ok(c.choices.length >= 2 && c.choices.length <= 3, w + ': 2–3 choices');
    c.choices.forEach((ch, i) => {
      const cw = w + '#' + i;
      Object.keys(ch).forEach(k => ok(CHOICE_KEYS.includes(k), cw + ': key ' + k));
      ok(str(ch.label, LIMIT.label) && str(ch.outcome, LIMIT.outcome), cw + ': label/outcome length');
      if (ch.roll) ok(/^Gamble: /.test(ch.hint || '') && ['success', 'fail'].every(b => str(ch.roll[b].outcome, LIMIT.outcome)), cw + ': gamble');
    });
    for (const { fx, where } of effectsOf(c)) {
      Object.keys(fx).forEach(k => ok(C.EFFECT_KEYS.includes(k), where + ': unknown effect ' + k));
      // a drama card is forced for one member (its speaker's band) or for a recruit / any band (role aliases)
      const db = BAND_OF_MEMBER(c.speaker) ? [BAND_OF_MEMBER(c.speaker)] : impliedBands(c);
      for (const k of ['mood', 'skill']) if (fx[k]) for (const id in fx[k]) ok(memberKeyFits(id, db, ['recruit']), where + ': ' + k + ' key ' + id);
      if ('fund' in fx) ok(isInt(fx.fund) && fx.fund >= -250 && fx.fund <= 200, where + ': fund');
      if ('payCut' in fx) ok(fx.payCut === 0.05, where + ': payCut steps of +0.05');
      if (fx.member) (Array.isArray(fx.member) ? fx.member : [fx.member]).forEach(x =>
        ok(memberKeyFits(x.id, db, ['recruit']) && x.id !== 'all' && ACTS.includes(x.act), where + ': member ' + JSON.stringify(x)));
    }
  }
});

test('drama: every original has wants (valid rules), 3 grumble + 3 passive lines, an ultimatum, returns and an exit storyline', () => {
  const D = K.drama, byId = id => DRAMA_CARDS.find(c => c.id === id);
  ok(D && D.members && D.recruit && D.fillIns && D.stageText && D.gripes, 'drama content present');
  HD_IDS.forEach(id => ok(D.members[id], 'drama.' + id + ' missing'));
  // v0.9: every member in drama.members (Hail Damage's here, the packs add theirs) is a band member with the full shape
  for (const id of Object.keys(D.members)) {
    const m = D.members[id], w = 'drama.' + id, mine = MEMBERS_OF(BAND_OF_MEMBER(id));
    ok(ALL_MEMBER_IDS.includes(id), w + ': a band member');
    ok(m.wants.length >= 1 && m.wants.every(x => str(x.text, LIMIT.line) && str(x.gripe, 40) && RULES.includes(x.rule)), w + ': wants');
    ok(m.grumble.length >= 2 && m.passive.length >= 2 && m.grumble.concat(m.passive).every(t => str(t, LIMIT.chat)), w + ': stage lines');
    const u = byId(m.ultimatum);
    ok(u && u.choices.some(ch => ch.effects.member.act === 'quit') && u.choices.filter(ch => ch.effects.member.act === 'settle').length >= 1, w + ': ultimatum settles or quits');
    const x = m.exit;
    ok(x && str(x.status, LIMIT.line) && x.returnAfter[0] >= 6 && x.returnAfter[1] <= 40 && x.beats.length >= 2 && str(x.changed, LIMIT.line), w + ': exit storyline');
    ok(x.beats.every(b => isInt(b.at) && str(b.text, LIMIT.chat) && (mine.includes(b.who) || NPC_IDS.includes(b.who))), w + ': beats');
    ok(str(x.backLine.text, LIMIT.chat) && str(x.quitLine.text, LIMIT.chat) && str(m.epilogue, LIMIT.line), w + ': quit/back/epilogue');
    const rf = byId(m.returnFilled);
    ok(rf && ['return', 'rival'].every(a => rf.choices.some(ch => ch.effects.member.act === a && ch.effects.member.id === id)), w + ': keep-vs-original card');
    if (!x.away) ok(byId(m.return) && byId(m.return).choices.some(ch => ch.effects.member.act === 'return'), w + ': return card');
  }
  ok(D.members.kenji.exit.away, "Kenji's exit is a disappearance");
  ok(byId(D.recruit.ultimatum), 'recruit ultimatum');
  Object.keys(D.fillIns).forEach(r => ok(D.fillIns[r].length >= 1, 'fill-ins ' + r));
});

test('drama: Kenji never speaks in drama lines either', () => {
  const k = K.drama.members.kenji;
  for (const s of k.grumble.concat(k.passive, [k.exit.quitLine.text, k.exit.backLine.text])) ok(/^(…|\.|👍|\(.*\))$/u.test(s), 'Kenji said words: ' + s);
  for (const c of DRAMA_CARDS.filter(c => c.speaker === 'kenji')) ok(!/[“"']\s*[A-Z][a-z]+[^'"”]*[.!?]['"”]/.test(c.text), c.id + ': Kenji quoted');
});

test('recruits: name pools for all four genres, hometowns, 9 traits, ≥10 quirks with cards, chat', () => {
  const R = K.recruits;
  C.GENRES.forEach(g => ok(R.names[g] && R.names[g].first.length >= 8 && R.names[g].last.length >= 8 && R.names[g].nicks.length >= 6, 'names.' + g));
  C.REGIONS.forEach(r => ok(R.hometowns[r] && R.hometowns[r].length >= 3, 'hometowns.' + r));
  // v0.9: recruits come from around each band's home (hometownsByCity[city], its own city first); Saskatoon's list is the old one
  const HBC = R.hometownsByCity || {}, anyTown = n => R.hometowns.canada.includes(n) || Object.values(HBC).some(l => l.includes(n));
  Object.values(K.bands).forEach(b => ok(HBC[b.city] && HBC[b.city].length >= 8 && HBC[b.city][0] === b.city && new Set(HBC[b.city]).size === HBC[b.city].length, 'hometownsByCity.' + b.city));
  eq(HBC.Saskatoon, R.hometowns.canada, 'Hail Damage recruits from the same towns as before');
  const map = Object.values(K.map.cities).filter(c => c.ring === 'sask' || c.ring === 'alberta').map(c => c.name);   // the home rings
  ok(map.every(anyTown), 'every Saskatchewan and Alberta city is a possible hometown: ' + map.filter(n => !anyTown(n)));
  R.quirks.forEach(q => { if (q.genres) ok(q.genres.length && q.genres.every(g => C.GENRES.includes(g)), 'quirk ' + q.id + ' genres'); });
  C.GENRES.forEach(g => ok(R.quirks.filter(q => !q.genres || q.genres.includes(g)).length >= 4, g + ': ≥4 quirks'));
  eq(R.traits.map(t => t.id), ['reliable', 'road_warrior', 'showboat', 'studio_rat', 'hype_machine', 'fast_learner', 'party_animal', 'frugal', 'local_legend']);
  R.traits.forEach(t => ok(str(t.name, 20) && str(t.effect, 90) && isInt(t.chem), 'trait ' + t.id));
  ok(R.quirks.length >= 10, 'quirks ≥ 10');
  R.quirks.forEach(q => ok(str(q.text, 70) && q.cards.length >= 1 && q.cards.length <= 2 && q.cards.every(c => c.speaker === 'recruit'), 'quirk ' + q.id));
  ['happy', 'ok', 'grumpy'].forEach(b => ok(R.chat[b].length >= 4, 'recruit chat ' + b));
});

test('guilt cards: ≥5 gated on parentsLoan with repay choices (for every band)', () => {
  const guilt = CARDS.filter(c => (c.gate.flags || []).includes('parentsLoan') && c.choices.some(ch => ch.effects && ch.effects.repay));
  ok(guilt.length >= 5, 'guilt cards with repay: ' + guilt.length);
  guilt.forEach(c => c.choices.forEach(ch => { if (ch.effects && 'repay' in ch.effects) ok(isInt(ch.effects.repay) && ch.effects.repay >= 20 && ch.effects.repay <= 300, c.id + ': repay'); }));
  BAND_IDS.forEach(b => ok(guilt.filter(c => c.gate.band.includes(b) && !c.gate.weekOfYear).length >= 5, b + ': ≥5 guilt cards with repay'));
  eq(CARDS.filter(c => /^guilt_/.test(c.id)).map(c => c.gate.band.join()).filter(x => x !== 'hail_damage'), [], 'guilt_* stays Hail Damage\'s set (the other bands\' are loan_*)');
});

// ---- No USA, parody names only -------------------------------------------
test('no USA content anywhere in GG.content (places, words, real US brands)', () => {
  const states = 'Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|Wisconsin|Wyoming';
  const cities = 'Los Angeles|Chicago|Houston|Phoenix|Philadelphia|San Antonio|San Diego|Dallas|San Francisco|Seattle|Boston|Detroit|Nashville|Memphis|Las Vegas|Vegas|Miami|Atlanta|Denver|Minneapolis|Portland|New Orleans|Hollywood|Brooklyn|Manhattan|Fargo|Bismarck|Minot|Grand Forks|Spokane|Cleveland|Pittsburgh|Baltimore|Orlando|Tampa|Honolulu|Anchorage|Sacramento|Milwaukee|St\\. Louis|Kansas City|Salt Lake|Sturgis';
  const words = 'USA|U\\.S\\.|America|Americans?|United States|the States|Yankees?|Uncle Sam';
  const brands = 'Walmart|Costco|Starbucks|McDonald\'?s?|Home Depot|U-Haul|Fender|Gibson|Peavey|Harley|Budweiser|Coors|Jack Daniel\'?s?|Facebook|Instagram|TikTok|YouTube|Twitter|Tim Hortons|Timbits|StarPhoenix|Canadian Tire|Roughriders';
  const re = new RegExp('\\b(' + [states, cities, words, brands].join('|') + ')\\b');
  const hits = strings(K, 'content').filter(([, s]) => re.test(s)).map(([p, s]) => p + ': ' + s.match(re)[0]);
  eq(hits, [], 'USA or real-brand content found');
});

// ======================================================================
// v0.5 "Signed": labels, studios, producers, reviews, awards, album words, studio events, later-era cards
// ======================================================================
const KENJI_TALKS = /Kenji (says|said|asks|asked|shouts|whispers|yells|mutters|replies|answers)(?! nothing)|Kenji: /;
// Problems with one Monday-schema card outside K.cards (awards, studio events). extra = { gates: [], effects: [], mag }
function cardProblems(c, extra) {
  const bad = [], w = c.id;
  const push = (cond, msg) => { if (!cond) bad.push(w + ': ' + msg); };
  push(/^[a-z][a-z0-9_]*$/.test(c.id), 'id');
  Object.keys(c).forEach(k => push(CARD_KEYS.includes(k) && !['chain', 'step', 'forceWeek'].includes(k), 'key ' + k));
  push(C.CARD_TYPES.includes(c.type), 'type');
  const bands = impliedBands(c);   // v0.9: the bands the card speaks for
  push(speakerFits(c.speaker, bands), 'speaker ' + c.speaker);
  push(str(c.title, LIMIT.title) && str(c.text, LIMIT.text), 'title/text length (text ' + (c.text || '').length + ')');
  if (c.once === false) push(isInt(c.cooldown) && c.cooldown >= 4, 'cooldown');
  push(Array.isArray(c.choices) && c.choices.length >= 2 && c.choices.length <= 3 && new Set(c.choices.map(x => x.label)).size === c.choices.length, 'choices');
  Object.keys(c.gate || {}).forEach(k => push(GATE_KEYS.includes(k) || (extra.gates || []).includes(k), 'gate ' + k));
  (c.choices || []).forEach((ch, i) => {
    const cw = '#' + i;
    Object.keys(ch).forEach(k => push(CHOICE_KEYS.includes(k), cw + ' key ' + k));
    push(str(ch.label, LIMIT.label), cw + ' label ' + (ch.label || '').length);
    push(str(ch.outcome, LIMIT.outcome), cw + ' outcome ' + (ch.outcome || '').length);
    if ('hint' in ch) push(str(ch.hint, LIMIT.hint), cw + ' hint');
    if (ch.roll) {
      push(/^Gamble: /.test(ch.hint || '') && ch.roll.chance >= 0.05 && ch.roll.chance <= 0.95, cw + ' gamble');
      ['success', 'fail'].forEach(b => push(ch.roll[b] && str(ch.roll[b].outcome, LIMIT.outcome) && (ch.outcome + ' ' + ch.roll[b].outcome).length <= LIMIT.rollPair, cw + ' ' + b));
    }
    const fxs = [ch.effects, ch.roll && ch.roll.success.effects, ch.roll && ch.roll.fail.effects].filter(Boolean);
    push(fxs.length, cw + ' does nothing');
    fxs.forEach(fx => {
      Object.keys(fx).forEach(k => push(C.EFFECT_KEYS.includes(k) || (extra.effects || []).includes(k), cw + ' effect ' + k));
      push(!fx.book && !fx.chain, cw + ' no book/chain here');
      for (const k of ['fund', 'fans', 'buzz', 'chemistry', 'burnout', 'drumSkill']) if (k in fx) {
        const m = extra.mag[k], mag = m.abs ? Math.abs(fx[k]) : fx[k]; push(isInt(fx[k]) && fx[k] !== 0 && mag >= m.lo && mag <= m.hi, cw + ' ' + k + ' ' + fx[k]);
      }
      for (const k of ['mood', 'skill']) if (k in fx) for (const id in fx[k]) {
        const m = extra.mag[k], v = fx[k][id]; push(memberKeyFits(id, bands) && isInt(v) && Math.abs(v) >= m.lo && Math.abs(v) <= m.hi, cw + ' ' + k + '.' + id);
      }
      if (fx.chat) [].concat(fx.chat).forEach(x => push(x && speakerFits(x.who, bands) && str(x.text, LIMIT.chat) && seatGateOk(x, bands), cw + ' chat'));
      if (fx.flags) for (const f in fx.flags) push(/^[a-z][A-Za-z0-9]*$/.test(f) && ['string', 'number', 'boolean'].includes(typeof fx.flags[f]), cw + ' flag ' + f);
    });
  });
  const talk = strings(c, c.id).filter(([, t]) => KENJI_TALKS.test(t));
  push(!talk.length, 'Kenji speaks: ' + (talk[0] || [])[1]);
  return bad;
}
// v0.9: the Loonie speech cards are keyed by band ({ <bandId>: CARD }); packs add theirs
const SPEECHES = () => (K.awards ? [].concat(Object.values(K.awards.speech || {}), Object.values(K.awards.speechWorstVan || {})) : []);
const ALL_CARD_IDS = () => [].concat(CARDS, K.dramaCards || [], K.roadCards || [], K.studioEvents || [],
  (K.awards && K.awards.outfitCards) || [], SPEECHES()).map(c => c.id);

test('labels: Gopherwood, Monolith and DIY with the contract fields (no 360 deals); rival-only labels; per-band demands', () => {
  const L = K.labels;
  eq(Object.keys(L).filter(id => !L[id].rivalOnly).sort(), C.LABELS.slice().sort(), 'label ids');
  // v0.9: a rival cast's own label (never offered to you): { id, name, blurb, rivalOnly, rival, rep }
  const RO = Object.values(L).filter(l => l.rivalOnly);
  ok(RO.length >= 3, 'rival-only labels: ' + RO.length);
  RO.forEach(l => ok(L[l.id] === l && !C.LABELS.includes(l.id) && K.rivals[l.rival] && str(l.name, 32) && str(l.blurb, 200) && l.rep && str(l.rep.name, 40), 'rival-only label ' + l.id));
  eq(RO.map(l => l.rival).length, new Set(RO.map(l => l.rival)).size, 'one own label per rival');
  // v0.9: labels[id].demandsByBand[bandId] adds / replaces demands by kind; the flat demands are neutral
  const demandsFor = (l, b) => { const own = ((l.demandsByBand || {})[b]) || [], kinds = own.map(d => d.kind); return l.demands.filter(d => kinds.indexOf(d.kind) < 0).concat(own); };
  for (const id of C.LABELS) {
    Object.keys(L[id].demandsByBand || {}).forEach(b => ok(K.bands[b] && L[id].demandsByBand[b].every(d => /^[a-z][a-zA-Z]*$/.test(d.kind) && str(d.text, 120) && (!d.card || CARDS.some(c => c.id === d.card))), id + ': demandsByBand.' + b));
    ok(!HD_LEAK.test(JSON.stringify(L[id].demands)) && L[id].demands.every(d => !d.card || CARDS.find(c => c.id === d.card).gate.band.length === BAND_IDS.length), id + ': flat demands are everyone\'s');
  }
  for (const id of C.LABELS) {
    const l = L[id], w = 'label ' + id;
    ok(l.id === id && str(l.name, 32) && str(l.blurb, 200), w + ': id/name/blurb');
    ok(Array.isArray(l.advance) && l.advance.length === 2 && l.advance.every(isInt) && l.advance[0] >= 0 && l.advance[0] <= l.advance[1], w + ': advance [min,max]');
    ok(typeof l.royalty === 'number' && l.royalty > 0 && l.royalty <= 1, w + ': royalty 0..1');
    ['albums', 'deadlineWeeks', 'offerMinFans', 'offerMinBuzz', 'dropOnFlop'].forEach(k => ok(isInt(l[k]) && l[k] >= 0, w + ': ' + k));
    ok(Array.isArray(l.demands) && l.demands.every(d => /^[a-z][a-zA-Z]*$/.test(d.kind) && str(d.text, 120) && (!d.card || CARDS.some(c => c.id === d.card))), w + ': demands {kind,text,card?}');
    ok(l.rep && str(l.rep.name, 40) && str(l.rep.blurb, 200) && str(l.offer, 200), w + ': rep + offer');
    ok(Array.isArray(l.perks) && l.perks.length >= 2 && Array.isArray(l.catches) && l.catches.length >= 2, w + ': perks/catches');
    ok(!/\b360\b/.test(JSON.stringify(l)), w + ': no 360 deals, ever');
  }
  const g = L.gopherwood, m = L.monolith, d = L.diy;
  ok(m.advance[0] > g.advance[1] && g.royalty > m.royalty && m.offerMinFans > g.offerMinFans && m.offerMinBuzz > g.offerMinBuzz, 'indie: small advance, big cut, earlier; major: huge advance, tiny cut, later');
  ok(d.advance[1] === 0 && d.royalty === 1 && d.albums === 0 && d.demands.length === 0 && d.dropOnFlop === 0, 'DIY keeps everything, owes nothing, is never dropped');
  ok(g.albums >= 1 && m.albums > g.albums && g.deadlineWeeks > 0 && m.deadlineWeeks > 0 && m.dropOnFlop > g.dropOnFlop, 'deals set album counts, deadlines and flop lines');
  const mh = demandsFor(m, 'hail_damage');
  ok(mh.some(x => x.kind === 'english' && /sing in English/.test(x.text)) && mh.some(x => x.kind === 'radio') && mh.some(x => x.kind === 'image'), 'Monolith (Hail Damage): English, radio edit, image');
  ok(m.demands.some(x => x.kind === 'radio') && m.demands.some(x => x.kind === 'image'), 'Monolith (anyone): radio edit, image');
});

test('studios + producers: fields, the four studios, the brief\'s producer styles', () => {
  const S = K.studios, P = K.producers, ids = S.map(s => s.id);
  ['moms_basement', 'strip_mall_sound', 'grain_silo', 'abbot_lane'].forEach(id => ok(ids.includes(id), 'studio ' + id));
  for (const s of S) {
    const w = 'studio ' + s.id;
    ok(str(s.name, 32) && str(s.city, 24) && str(s.blurb, 200) && str(s.quirk, 160), w + ': words');
    ok(isInt(s.costPerWeek) && s.costPerWeek >= 0 && isInt(s.quality) && s.quality >= 0 && s.quality <= 100 && isInt(s.reverb) && s.reverb >= 0 && s.reverb <= 100, w + ': numbers');
    ok(C.ERAS.includes(s.era) && (!('locked' in s) || typeof s.locked === 'boolean'), w + ': era/locked');
  }
  const by = id => S.find(s => s.id === id);
  ok(by('moms_basement').costPerWeek === 0 && /dryer/i.test(by('moms_basement').quirk + by('moms_basement').blurb), "Mom's Basement is free and has the dryer");
  ok(/landlord|owns the strip mall/i.test(by('strip_mall_sound').blurb), 'the engineer is the landlord');
  ok(by('grain_silo').reverb === Math.max(...S.map(s => s.reverb)) && /grain elevator/i.test(by('grain_silo').blurb), 'the grain silo has the best reverb');
  ok(by('abbot_lane').city === 'London' && by('abbot_lane').era === 'world' && by('abbot_lane').locked === true, 'Abbot Lane waits for the World era');
  ok(S.filter(s => !s.locked).every(s => s.city !== 'London') && by('moms_basement').quality < by('strip_mall_sound').quality && by('strip_mall_sound').quality < by('grain_silo').quality, 'quality climbs with price');
  const pid = new Set();
  for (const p of P) {
    const w = 'producer ' + p.id;
    ok(/^[a-z][a-z0-9_]*$/.test(p.id) && !pid.has(p.id), w + ': id'); pid.add(p.id);
    ok(str(p.name, 32) && str(p.blurb, 200) && str(p.quirk, 160) && /^[a-z]+$/.test(p.style), w + ': words/style');
    ok(isInt(p.costPerWeek) && p.costPerWeek > 0 && C.ERAS.includes(p.era), w + ': cost/era');
    ['production', 'polish', 'hook'].forEach(k => ok(isInt(p[k]) && p[k] >= 0 && p[k] <= 10, w + ': ' + k + ' 0..10'));
    ok(isInt(p.weird) && p.weird >= 0 && p.weird <= 10, w + ': weird 0..10');
  }
  const styles = new Set(P.map(p => p.style));
  ['loud', 'cabin', 'pitch'].forEach(st => ok(styles.has(st), 'style ' + st));
  ok(styles.size >= 5 && P.length >= 5 && P.length <= 7, '3 required styles + 2–3 more, got ' + [...styles]);
  ok(/bear/i.test(P.find(p => p.style === 'cabin').blurb) && /pitch/i.test(P.find(p => p.style === 'pitch').blurb), 'the cabin has a bear; pitch fixes Marcel');
});

test('reviews: five outlets, scales, voices, quotes for every score band (Deci-Hell in caps)', () => {
  const R = K.reviews, O = R.outlets, BANDS = ['awful', 'meh', 'good', 'great'];
  eq(Object.keys(R.scoreBands), BANDS, 'score bands in order');
  ok(R.scoreBands.awful === 0 && BANDS.every((b, i) => !i || R.scoreBands[b] > R.scoreBands[BANDS[i - 1]]) && R.scoreBands.great < 100, 'score bands ascend from 0');
  eq(Object.keys(O).sort(), C.OUTLETS.slice().sort(), 'outlet ids');
  for (const id of C.OUTLETS) {
    const o = O[id], w = 'outlet ' + id;
    ok(o.id === id && str(o.name, 24) && str(o.critic, 48) && str(o.voice, 200) && str(o.unit, 8), w + ': words');
    ok([5, 10, 100].includes(o.scale) && [0, 1].includes(o.decimals) && typeof o.caps === 'boolean' && isInt(o.bias), w + ': scale/decimals/caps/bias');
    eq(Object.keys(o.genres).sort(), C.GENRES.slice().sort(), w + ': genre weights');
    ok(Object.values(o.genres).every(v => v >= 0 && v <= 1), w + ': weights 0..1');
    eq(Object.keys(o.weights).sort(), ['polish', 'production', 'quality', 'recycled'], w + ': judging weights');
    const all = [];
    for (const b of BANDS) {
      ok(Array.isArray(o.quotes[b]) && o.quotes[b].length >= 3, w + ': quotes.' + b + ' ≥3');
      const hd = ((o.byBand || {}).hail_damage || {})[b] || [];
      ok(o.quotes[b].length + hd.length >= 4, w + ': Hail Damage gets ≥4 quotes for ' + b);
      all.push(...o.quotes[b], ...hd);
    }
    Object.keys(o.byBand || {}).forEach(bid => ok(K.bands[bid], w + ': byBand ' + bid));
    ok(Array.isArray(o.recycled) && o.recycled.length >= 3, w + ': recycled quotes');
    all.push(...o.recycled);
    all.forEach(q => ok(str(q, 200), w + ': quote ≤200: ' + q));
    all.forEach(q => ok(!/\b\d+(\.\d)?\s*(\/|out of)\s*\d+\b/.test(q), w + ': quotes never state a score: ' + q));
    eq(all.length, new Set(all).size, w + ': duplicate quotes');
    if (o.caps) all.forEach(q => ok(!/[a-z]/.test(q.replace(/\{[^}]*\}/g, '')), w + ': ALL CAPS: ' + q));
  }
  ok(O.pitchspork.decimals === 1 && O.pitchspork.scale === 10 && O.pitchspork.bias < 0, 'Pitchspork: one decimal, out of ten, harsh');
  ok(O.deci_hell.caps && O.deci_hell.genres.metal === 1 && O.deci_hell.unit === 'skulls', 'Deci-Hell: caps, metal, skulls');
  ok(O.tailgate_weekly.genres.country === 1 && O.tailgate_weekly.genres.metal < 0.5, 'Tailgate Weekly is a country paper');
  ok(/hoedown|not sure|confused|what kind of music/i.test(JSON.stringify(O.tailgate_weekly.byBand.hail_damage)), 'Tailgate Weekly is confused by metal');
  ok(/record|vinyl|gatefold/i.test(JSON.stringify(O.rolling_scone.quotes)) && /!/.test(O.proclaim.quotes.great.join('')), 'Rolling Scone reveres vinyl; Proclaim! is breathless');
});

test('awards: Loonie categories, cape-aware outfit cards, the speech, Tundra Wraith thanks you personally', () => {
  const A = K.awards, mag = MAG_BY_ERA.signed;
  eq(Object.keys(A.categories).sort(), C.LOONIE_CATEGORIES.slice().sort(), 'categories');
  for (const id of C.LOONIE_CATEGORIES) {
    const c = A.categories[id], w = 'category ' + id;
    ok(c.id === id && str(c.name, 40) && str(c.short, 16) && str(c.blurb, 160), w + ': words');
    ok(c.reward && ['fund', 'fans', 'buzz'].every(k => isInt(c.reward[k]) && c.reward[k] > 0), w + ': reward {fund,fans,buzz}');
  }
  eq(Object.keys(A.categories.album.genreNames).sort(), C.GENRES.slice().sort(), 'Album of the Year per genre');
  ok(/Worst Van/.test(A.categories.worst_van.name) && A.categories.worst_van.reward.fund < A.categories.album.reward.fund, 'Worst Van is a joke award');
  ok(str(A.ceremony.name, 40) && str(A.ceremony.venue, 60) && A.ceremony.host && str(A.ceremony.host.blurb, 200), 'ceremony');
  ok(A.presenters.length >= 4 && A.presenters.every(p => str(p.name, 40) && str(p.blurb, 160)), 'presenters');
  ok(A.banter.length >= 4 && A.banter.every(t => str(t, 200) && /\{category\}/.test(t)), 'banter names the {category}');
  ok(A.envelope.length >= 3 && A.win.length >= 3 && A.lose.length >= 3, 'envelope/win/lose lines');
  [].concat(A.envelope, A.win, A.lose).forEach(t => ok(str(t, 200) && !KENJI_TALKS.test(t) && !HD_LEAK.test(t), 'line (neutral): ' + t));
  ['speech', 'speechWorstVan', 'carpet'].forEach(k => Object.keys(A[k] || {}).forEach(b => ok(K.bands[b], k + '.' + b + ': a band')));
  Object.keys(A.speech).concat(Object.keys(A.speechWorstVan)).forEach(b => {
    [A.speech[b], A.speechWorstVan[b]].filter(Boolean).forEach(c => eq(c.gate && c.gate.band, [b], c.id + ': gated to ' + b));
  });
  // Outfit cards: exactly one per cape state; every branch writes a known outfit.
  const outfitIds = Object.keys(A.outfits);
  ok(outfitIds.includes('cape') && outfitIds.length >= 3, 'outfits');
  const probs = [];
  for (const c of A.outfitCards) {
    probs.push(...cardProblems(c, { mag }));
    // v0.9: every band's outfit cards gate on one band + flags only (Hail Damage's on the cape, the packs' on their storylines)
    ok(Object.keys(c.gate).every(k => ['band', 'flags', 'notFlags', 'flagEquals'].includes(k)) && c.gate.band.length === 1 && K.bands[c.gate.band[0]], c.id + ': gates on one band + flags only');
    c.choices.forEach((ch, i) => {
      const branches = ch.roll ? [ch.roll.success.effects, ch.roll.fail.effects].map(fx => Object.assign({}, ch.effects, fx, { flags: Object.assign({}, (ch.effects || {}).flags, (fx || {}).flags) })) : [ch.effects];
      branches.forEach(fx => ok(fx && fx.flags && outfitIds.includes(fx.flags.loonieOutfit), c.id + '#' + i + ': sets flags.loonieOutfit'));
      branches.forEach(fx => { if ('cape' in fx.flags) ok(CAPE_VALUES.includes(fx.flags.cape), c.id + '#' + i + ': cape value'); });
    });
  }
  eq(probs, [], 'outfit card problems');
  const capeStates = [undefined].concat(CAPE_VALUES);
  for (const v of capeStates) {
    const st = { era: 'signed', genre: 'metal', region: 'canada', bandId: 'hail_damage', flags: v === undefined ? {} : { cape: v }, members: [] };
    const pass = A.outfitCards.filter(c => gatePasses(c.gate, st)).map(c => c.id);
    eq(pass.length, 1, 'cape=' + v + ' should match exactly one outfit card, got ' + pass);
  }
  // The speech: thank your mom / thank the moose / take a shot at the rival (Hail Damage's; every band's is a valid card).
  eq([].concat(...SPEECHES().map(c => cardProblems(c, { mag }))), [], 'speech card problems');
  const sp = A.speech.hail_damage, spv = A.speechWorstVan.hail_damage;
  const labels = sp.choices.map(ch => ch.label).join(' | ');
  ok(/mom/i.test(labels) && /moose/i.test(labels) && /Tundra Wraith|rival/i.test(labels), 'speech choices: mom, moose, rival: ' + labels);
  ok(sp.choices.some(ch => ch.effects && ch.effects.flags && ch.effects.flags.mooseMuse), 'thanking the moose wakes the moose muse');
  ok(spv.speaker === 'kenji' && /Moose Hearse/.test(spv.text), 'Worst Van: Kenji accepts, silently');
  ok(A.nominees && Object.keys(A.nominees).every(g => C.GENRES.includes(g)), 'nominees by genre');
  const th = A.rivalThanks.tundra_wraith, lo = A.rivalLoses.tundra_wraith;
  ok(th.length >= 5 && th.every(t => str(t, 200) && /\{band\}/.test(t)) && th.some(t => /buddy/.test(t)), 'Tundra Wraith thank you personally ({band}, buddy)');
  ok(lo.length >= 2 && lo.every(t => str(t, 200)) && /fruit basket/i.test(lo.join(' ')), 'losing to you, they send a fruit basket');
  Object.keys(A.rivalThanks).concat(Object.keys(A.rivalLoses)).forEach(r => ok(K.rivals[r], 'rival id ' + r));
});

test('album words: title pools for every genre, French metal titles, cover motifs/palettes/fonts', () => {
  const W = K.albumWords;
  for (const g of C.GENRES) {
    const t = W.titles[g], w = 'titles.' + g;
    ok(t && Array.isArray(t.forms) && t.forms.length >= 5, w + ': ≥5 forms');
    t.forms.forEach(f => {
      const slots = (f.match(/\{(\w+)\}/g) || []).map(x => x.slice(1, -1));
      ok(slots.length >= 1 && slots.every(sl => Array.isArray(t[sl]) && t[sl].length >= 6), w + ': form "' + f + '" slots need pools of ≥6');
      ok(f.length <= 24, w + ': form too long');
    });
    ['adj', 'noun', 'place'].forEach(k => { ok(Array.isArray(t[k]) && t[k].every(x => str(x, 22)), w + '.' + k); eq(t[k].length, new Set(t[k]).size, w + '.' + k + ' dupes'); });
  }
  const fr = W.titles.metal.fr;
  ok(fr.length >= 12 && fr.every(x => str(x.fr, 36) && str(x.en, 36)), 'metal: ≥12 French titles with translations');
  ok(fr.filter(x => /lawn|sod|rake|dandelion|fertilizer|watering|fence|garden|barbecue|mower/i.test(x.en)).length >= fr.length / 2, 'mostly secretly about the lawn');
  const M = W.covers;
  ok(M.motifs.length >= 8 && M.motifs.every(m => /^[a-z_]+$/.test(m.id) && str(m.name, 20) && str(m.desc, 80) && m.genres.length && m.genres.every(g => C.GENRES.includes(g))), 'motifs');
  C.GENRES.forEach(g => ok(M.motifs.filter(m => m.genres.includes(g)).length >= 3 && M.palettes.filter(p => p.genres.includes(g)).length >= 3 && M.fonts.filter(f => f.genres.includes(g)).length >= 2, g + ': enough cover options'));
  ok(M.palettes.length >= 8 && M.palettes.every(p => str(p.name, 20) && p.colors.length === 3 && p.colors.every(isHex)), 'palettes: [bg, fg, accent] hex');
  ok(M.fonts.length >= 4 && M.fonts.every(f => str(f.css, 80) && /(serif|sans-serif|monospace)$/.test(f.css) && isInt(f.weight) && typeof f.caps === 'boolean'), 'fonts: system stacks with a generic fallback');
  ['motifs', 'palettes', 'fonts'].forEach(k => eq(M[k].length, new Set(M[k].map(x => x.id)).size, k + ': unique ids'));
});

test('studio events: ≥10 Monday-schema cards, studio/producer gates, production effects, the brief', () => {
  const E = K.studioEvents, sids = K.studios.map(s => s.id), pids = K.producers.map(p => p.id), mag = MAG_BY_ERA.local;
  ok(E.length >= 10, 'studio events: ' + E.length);
  const probs = [];
  for (const c of E) {
    probs.push(...cardProblems(c, { gates: ['studio', 'producer'], effects: ['production'], mag }));
    ok(/^studio_[a-z0-9_]+$/.test(c.id), c.id + ': id prefix studio_');
    if (c.gate.studio) ok(c.gate.studio.length && c.gate.studio.every(id => sids.includes(id)), c.id + ': studio ids');
    if (c.gate.producer) ok(c.gate.producer.length && c.gate.producer.every(id => pids.includes(id)), c.id + ': producer ids');
    c.choices.forEach(ch => [ch.effects, ch.roll && ch.roll.success.effects, ch.roll && ch.roll.fail.effects].filter(Boolean).forEach(fx => {
      if ('production' in fx) ok(isInt(fx.production) && fx.production !== 0 && Math.abs(fx.production) <= 10, c.id + ': production ±1..10');
    }));
    ok(c.choices.some(ch => [ch.effects, ch.roll && ch.roll.success.effects].some(fx => fx && fx.production)), c.id + ': a studio event should touch production');
  }
  eq(probs, [], 'studio event problems');
  ['moms_basement', 'strip_mall_sound', 'grain_silo'].forEach(id => ok(E.filter(c => c.gate.studio && c.gate.studio.includes(id)).length >= 2, id + ': ≥2 events'));
  ['loud', 'cabin', 'pitch'].forEach(st => ok(E.some(c => c.gate.producer && c.gate.producer.includes(K.producers.find(p => p.style === st).id)), st + ' producer event'));
  ok(E.filter(c => !c.gate.studio && !c.gate.producer).length >= 3, '≥3 events for any session');
  // v0.9: every band gets ≥10 studio events and ≥3 for any session (Hail Damage's own, the other bands' neutral set)
  BAND_IDS.forEach(b => {
    const mine = E.filter(c => impliedBands(c).includes(b));
    ok(mine.length >= 10 && mine.filter(c => !c.gate.studio && !c.gate.producer).length >= 3, b + ': studio events ' + mine.length);
  });
  E.filter(seenByOthers).forEach(c => ok(!HD_LEAK.test(JSON.stringify(c)), c.id + ': no Hail Damage names in another band\'s studio'));
  const all = JSON.stringify(E);
  ok(/dryer/i.test(all) && /landlord/i.test(all) && /nine seconds|echo|reverb/i.test(all) && /bear/i.test(all), 'the brief: dryer, landlord-engineer, silo echo, cabin bear');
  const ids = ALL_CARD_IDS();
  eq(ids.length, new Set(ids).size, 'card ids unique across Monday, drama, road, studio and award cards');
});

test('v0.5 cards: ≥25 Local Heroes + Signed cards, label drama, the moose album, widened evergreen gates', () => {
  const later = CARDS.filter(c => !c.gate.era.includes('garage'));
  const local = later.filter(c => c.gate.era.includes('local')), signed = later.filter(c => c.gate.era.includes('signed'));
  ok(later.length >= 25, 'new later-era cards: ' + later.length);
  ok(local.length >= 12 && signed.length >= 25, 'local ' + local.length + ', signed ' + signed.length);
  C.CARD_TYPES.filter(t => t !== 'road').forEach(t => ok(signed.filter(c => c.type === t).length >= 1 && later.filter(c => c.type === t).length >= 2, 'later-era type ' + t));
  C.LABELS.forEach(l => ok(signed.filter(c => c.gate.flagEquals && c.gate.flagEquals.label === l).length >= 2, l + ': ≥2 label cards'));
  const byId = id => CARDS.find(c => c.id === id);
  ok(/sing in\s+English/.test(byId('signed_monolith_english').text), '"Marcel should sing in English"');
  ok(/radio edit/i.test(byId('signed_monolith_radio').text) && /image consultant/i.test(byId('signed_monolith_image').text), 'radio singles + image change');
  ok(later.some(c => /crowdfund|screen-print|mailer|hockey bag/i.test(c.text)), 'DIY hustle');
  // The moose concept album starts from the existing mooseMuse flag and leaves mooseAlbum for v0.7.
  const moose = CARDS.filter(c => c.chain === 'moose');
  ok(moose.length >= 3 && moose.find(c => c.step === 1).gate.flags.includes('mooseMuse'), 'moose chain starts from mooseMuse');
  const ends = new Set();
  moose.forEach(c => effectsOf(c).forEach(({ fx }) => { if (fx.flags && fx.flags.mooseAlbum) ends.add(fx.flags.mooseAlbum); }));
  ok(['shelved', 'song', 'ready', 'finland'].every(v => ends.has(v)), 'mooseAlbum outcomes: ' + [...ends]);
  ok(/Finland|Finnish/.test(moose.map(c => c.text).join(' ')), 'the Finland foreshadow');
  // Evergreen garage cards keep flowing in later eras; early/truck-era cards stay in the garage.
  const widened = CARDS.filter(c => c.gate.era.includes('garage') && c.gate.era.length > 1);
  ok(widened.length >= 30, 'widened garage cards: ' + widened.length);
  ok(CARDS.filter(c => c.chain === 'cape').every(c => c.gate.era.includes('local') && c.gate.era.includes('signed')), 'the Cape Saga can finish in any era');
  ['lord_abyssus', 'road_dads_truck', 'money_wedding_social', 'jaxon_baba_lunch'].forEach(id => eq(byId(id).gate.era, ['garage'], id + ' stays a garage card'));
  CARDS.filter(c => c.gate.maxWeek && c.gate.maxWeek <= 16).forEach(c => eq(c.gate.era, ['garage'], c.id + ': early cards stay garage-only'));
  const talk = strings(later, 'later').filter(([, t]) => KENJI_TALKS.test(t));
  eq(talk, [], 'Kenji never speaks');
});

test('lines (v0.5): signed-era pools present, Kenji silent in the studio', () => {
  const L = K.lines;
  ['eraLocal', 'offerExpired', 'labelDropped', 'releaseDay', 'chartDebut', 'chartClimb', 'chartDrop', 'recouped'].forEach(k => ok(Array.isArray(L[k]) && L[k].length >= 2, 'lines.' + k));
  C.LABELS.forEach(l => ok(L.eraSigned[l] && L.eraSigned[l].length >= 2, 'eraSigned.' + l));
  ['gopherwood', 'monolith'].forEach(l => ok(L.labelOffer[l] && L.labelOffer[l].length >= 2, 'labelOffer.' + l));
  ok(L.cert.gold.length >= 2 && L.cert.platinum.length >= 2 && L.loonies.nominated.length >= 2 && L.loonies.snubbed.length >= 2, 'cert + loonies');
  HD_IDS.forEach(id => ok(L.studioWeek[id] && L.studioWeek[id].length >= 3, 'studioWeek.' + id));
  L.studioWeek.kenji.forEach(s => ok(/^(…|\.|👍|\(.*\))$/u.test(s), 'Kenji said words in the studio: ' + s));
});

// ======================================================================
// v0.6.1 (WORLD, Addendum 1 C1/C6/C7): calendar, holidays, drivers
// ======================================================================
test('calendar: months, four seasons, weather tables over C.WEATHER, kinds, genre-season fit, the holidays on their weeks', () => {
  const Cal = K.calendar;
  ok(Cal, 'GG.content.calendar');
  eq(Object.keys(Cal.months), C.MONTHS, 'every month named');
  eq(Object.keys(Cal.seasons).sort(), ['fall', 'spring', 'summer', 'winter']);
  Object.values(Cal.seasons).forEach(x => ok(str(x.name, 12) && x.icon && str(x.blurb, 140) && x.fx, 'season ' + x.name));
  eq(Cal.temps.length, 12);
  for (const se in Cal.weather) Object.keys(Cal.weather[se]).forEach(k => ok(C.WEATHER.includes(k) && Cal.weather[se][k] > 0, se + ' ' + k));
  ok(!Cal.weather.winter.heat && !Cal.weather.summer.snow && !Cal.weather.summer.blizzard, 'seasonal weather');
  eq(Object.keys(Cal.kinds).sort(), C.WEATHER.slice().sort(), 'every weather kind described');
  Object.values(Cal.kinds).forEach(k => ok(str(k.label, 12) && k.icon && k.outdoor > 0 && k.outdoor <= 1.2 && k.road >= 1 && k.road <= 2, 'kind ' + k.label));
  C.GENRES.forEach(g => ok(Cal.genreSeason[g], 'genre-season fit for ' + g));
  ok(Cal.genreSeason.metal.winter === Math.max(...Object.values(Cal.genreSeason.metal)) && Cal.genreSeason.country.summer > 0 && Cal.genreSeason.punk.summer > 0,
    'owner: metal owns winter, country + punk the summer');
  const H = {}; Cal.holidays.forEach(h => { H[h.id] = h; ok(str(h.name, 24) && h.icon && str(h.blurb, 160) && h.weeks[0] >= 1 && h.weeks[1] <= 24, 'holiday ' + h.id); });
  eq([H.canada_day.weeks, H.thanksgiving.weeks, H.halloween.weeks, H.remembrance.weeks, H.grey_mug.weeks, H.christmas.weeks, H.nye.weeks, H.st_patricks.weeks, H.loonies.weeks],
    [[1, 1], [7, 7], [8, 8], [9, 9], [10, 10], [11, 12], [12, 12], [18, 18], [20, 20]], 'owner: holiday weeks (C7)');
  eq(H.remembrance.closed, ['legion'], 'no Legion gigs on Remembrance Day'); ok(H.nye.pay.all >= 2, 'NYE: the best-paying gig of the year');
  Cal.holidays.forEach(h => (h.cards || []).forEach(id => ok(CARDS.some(c => c.id === id), h.id + ': card ' + id)));
  // v0.9: the flat news is everyone's (aliases / unscoped npcs); byBand news belongs to that band; Kenji never posts it
  for (const w in Cal.news) ok(speakerFits(Cal.news[w].who, BAND_IDS) && Cal.news[w].who !== 'kenji' && str(Cal.news[w].text, LIMIT.chat) && !HD_LEAK.test(Cal.news[w].text), 'news ' + w);
  Cal.holidays.forEach(h => {
    if (h.news) ok(speakerFits(h.news.who, BAND_IDS) && str(h.news.text, LIMIT.chat) && !HD_LEAK.test(h.news.text), h.id + ': news');
    Object.keys(h.byBand || {}).forEach(b => { const n = h.byBand[b].news; ok(K.bands[b] && (!n || (speakerFits(n.who, [b]) && n.who !== 'kenji' && str(n.text, LIMIT.chat))), h.id + ': byBand.' + b); });
  });
  Object.keys(Cal.byBand || {}).forEach(b => {
    const x = Cal.byBand[b];
    ok(K.bands[b], 'calendar.byBand.' + b);
    for (const w in (x.news || {})) ok(speakerFits(x.news[w].who, [b]) && x.news[w].who !== 'kenji' && str(x.news[w].text, LIMIT.chat), b + ': news ' + w);
  });
  Object.values(Cal.lines).forEach(l => l.forEach(t => ok(str(t, LIMIT.line), 'line ' + t)));
  ok(Cal.costumes.length >= 5, 'costume bands');
});

test('holiday cards: once a year on their holiday week, the brief (guilt dinner, Christmas single, costumes, Grey Mug)', () => {
  const HC = CARDS.filter(c => /^holiday_/.test(c.id)), byId = id => HC.find(c => c.id === id);
  ok(HC.length >= 8, 'holiday cards: ' + HC.length);
  HC.forEach(c => {
    ok(c.gate.weekOfYear && K.calendar.holidays.some(h => (h.cards || []).includes(c.id) && h.weeks[0] <= c.gate.weekOfYear[0] && c.gate.weekOfYear[1] <= h.weeks[1]), c.id + ': on its holiday');
    ok(c.once === false ? c.cooldown >= 20 : /^holiday_grey_mug(_|$)/.test(c.id), c.id + ': yearly (cooldown 20) or once (the Grey Mug)');
  });
  // v0.9: every band has a card on every holiday that has cards (both sides of the Thanksgiving loan), listed after its gate
  const H = id => K.calendar.holidays.find(h => h.id === id);
  BAND_IDS.forEach(b => {
    K.calendar.holidays.filter(h => (h.cards || []).length).forEach(h => ok(h.cards.some(id => byId(id) && byId(id).gate.band.includes(b)), b + ': a ' + h.id + ' card'));
    const tg = H('thanksgiving').cards.map(byId).filter(c => c.gate.band.includes(b));
    ok(tg.some(c => (c.gate.flags || []).includes('parentsLoan') && c.choices.some(ch => ch.effects && ch.effects.repay)) && tg.some(c => (c.gate.notFlags || []).includes('parentsLoan')), b + ': Thanksgiving, owing and not');
    H('halloween').cards.map(byId).filter(c => c.gate.band.includes(b)).forEach(c => ok(c.choices.every(ch => (ch.effects && ch.effects.flags && ch.effects.flags.costume) || (ch.roll && ch.roll.success.effects.flags.costume && ch.roll.fail.effects.flags.costume)), c.id + ': every choice picks a costume'));
  });
  ok(byId('holiday_canada_day_park').gate.minWeek >= 2, 'week one of year one stays the band\'s opening card');
  ok(byId('holiday_thanksgiving_guilt').gate.flags.includes('parentsLoan') && byId('holiday_thanksgiving').gate.notFlags.includes('parentsLoan'), 'Thanksgiving guilt only if you owe');
  ok(byId('holiday_thanksgiving_guilt').choices.some(ch => ch.effects && ch.effects.repay), 'you can pay some back over pie');
  eq(byId('holiday_xmas_single').gate.era, ['signed']); ok(byId('holiday_xmas_single').gate.flags.includes('label'), 'the label pushes a Christmas single');
  ok(byId('holiday_halloween').choices.every(ch => (ch.effects && ch.effects.flags && ch.effects.flags.costume) || (ch.roll && ch.roll.success.effects.flags.costume)), 'every Halloween choice picks a costume');
  const gm = byId('holiday_grey_mug'); ok(gm.once !== false && gm.gate.era.join() === 'signed' && gm.gate.minFans >= 10000 && gm.gate.minYear >= 3, 'the Grey Mug: late career');
});

test('drivers: all four bands defined (C1) + you; dashboard items; Kenji never speaks', () => {
  const D = K.drivers;
  eq(Object.keys(D).sort(), ['earl', 'kenji', 'moth', 'tamara', 'you']);
  eq(Object.values(D).filter(d => d.band).map(d => d.band).sort(), Object.keys(K.bands).sort(), 'one per band');
  for (const id in D) {
    const d = D[id];
    if (d.band) ok(K.bands[d.band].members.some(m => m.id === id), id + ' is in ' + d.band);
    ok(str(d.name, 12) && str(d.blurb, 140) && str(d.effect, 60) && d.mods && typeof d.mods === 'object', 'driver ' + id);
    Object.keys(d.mods).forEach(k => ok(['breakdown', 'wear', 'burnout', 'comfort', 'repair', 'chemistry', 'roadChance'].includes(k) && isFinite(d.mods[k]), id + ' mod ' + k));
  }
  eq(['kenji', 'moth', 'tamara', 'earl'].map(id => D[id].dashboard), ['cactus', 'laundry', 'cassettes', 'atlas'], 'owner: dashboard items');
  ok(D.kenji.mods.breakdown < 1 && D.moth.mods.repair === 0 && D.moth.mods.comfort < 0 && D.tamara.mods.breakdown < 1 && D.tamara.mods.burnout > 1 && D.earl.mods.chemistry > 0, 'owner: driver effects');
  eq(strings(D, 'drivers').filter(([, t]) => KENJI_TALKS.test(t)), [], 'Kenji never speaks');
  const you = K.roadCards.filter(c => c.gate && c.gate.driver && c.gate.driver.includes('you'));
  ok(you.length >= 3 && you.some(c => /wrong turn/i.test(c.title)) && you.some(c => /gas station/i.test(c.title)), 'the you-drive pool: wrong turns, gas-station arguments');
  BAND_IDS.forEach(b => { const y = you.filter(c => impliedBands(c).includes(b)); ok(y.some(c => /wrong turn/i.test(c.title)) && y.some(c => /gas station/i.test(c.title)), b + ': a wrong turn and a gas-station fight'); });
  ok(str(D.you.takeOver, 140) && !/cactus|Kenji/.test(D.you.takeOver), 'v0.9: the neutral take-over line has no cactus');
  Object.keys(D.you.byBand || {}).forEach(b => ok(K.bands[b] && str(D.you.byBand[b].takeOver, 140), 'you.byBand.' + b + '.takeOver'));
  ok(/cactus/.test(((D.you.byBand || {}).hail_damage || {}).takeOver || '') && !/cactus/.test(D.you.takeOver), 'Hail Damage keeps its tiny cactus (the neutral line has none)');
  const all = strings(K.roadCards, 'road').map(x => x[1]).join(' ');
  ok(/deer/i.test(all) && /Yellowhead/.test(all) && /Whiteout on the Trans-Canada/.test(all) && /shotgun/i.test(all) && /cape/i.test(all) && /sliding door/i.test(all), 'C1 road events');
});

// ======================================================================
// v0.6.1 FANS: Bandbook (Addendum 1 C5)
// ======================================================================
test('bandbook: post kinds, comments, handles, lengths; Kenji never speaks; no stray tokens', () => {
  const B = K.bandbook;
  ok(B && B.name === 'Bandbook', 'one parody social app: Bandbook');
  eq(Object.keys(B.kinds).sort(), ['bts', 'exclusive', 'gig', 'meme', 'rehearsal', 'teaser']);
  for (const k of Object.keys(B.kinds)) ok(str(B.kinds[k].label, 24) && str(B.kinds[k].icon, 4), 'kind ' + k);
  // v0.9: every band reads flat + byGenre + byBand (GG.fans pools); each band's pool is big enough and repeats nothing
  for (const b of BAND_IDS) {
    for (const k of Object.keys(B.kinds)) {
      const p = poolFor(B, ['posts', k], b);
      ok(Array.isArray(p) && p.length >= 4 && p.every(t => str(t, 140)) && new Set(p).size === p.length, b + ': posts.' + k + ' ≥4 lines ≤140');
      if (k === 'gig') ok(p.every(t => /\{venue\}/.test(t)), b + ': gig announcements name the venue');
      if (k === 'teaser') ok(p.every(t => /\{song\}/.test(t)), b + ': teasers name the song');
    }
    const vg = poolFor(B, ['viral', 'good'], b), vc = poolFor(B, ['viral', 'cringe'], b);
    ok(vg.length >= 4 && vg.every(t => str(t, 140) && /\{views\}/.test(t)) && vg.some(t => /falls off the drum riser/.test(t)), b + ': good viral lines (owner: you falling off the riser)');
    ok(vc.length >= 4 && vc.every(c => (c.who === 'any' || speakerFits(c.who, [b])) && c.who !== 'kenji' && c.who !== '@deadpan' && str(c.text, 140)), b + ': cringe viral: a member (never Kenji)');
    const MIN = { good: 6, mixed: 4, bad: 3, hater: 5, rival: 5, rivalExclusive: 2 };
    for (const k in MIN) { const p = poolFor(B, ['comments', k], b); ok(Array.isArray(p) && p.length >= MIN[k] && p.every(t => str(t, 120)) && new Set(p).size === p.length, b + ': comments.' + k); }
    const hf = poolFor(B, ['handles', 'fan'], b), hh = poolFor(B, ['handles', 'hater'], b);
    ok(hf.length >= 10 && hh.length >= 4 && hf.concat(hh).every(h => /^[\w]{3,20}$/.test(h)) && new Set(hf.concat(hh)).size === hf.length + hh.length, b + ': handles');
  }
  ok(poolFor(B, ['viral', 'cringe'], 'hail_damage').some(c => c.who === 'marcel' && /dance tutorial/.test(c.text)), "owner: Marcel's cringe dance tutorial");
  const CM = B.comments;
  ok(CM.good.includes('saw them at a Legion hall, 12 people and a dog, I was the dog'), 'owner: the dog comment');
  Object.keys(B.byBand || {}).forEach(b => ok(K.bands[b], 'bandbook.byBand.' + b));
  Object.keys(B.byGenre || {}).forEach(g => ok(C.GENRES.includes(g), 'bandbook.byGenre.' + g));
  eq(strings(B, 'bandbook').filter(([, t]) => KENJI_TALKS.test(t)), [], 'Kenji never speaks');
  ok(Object.values(B.gigLines).every(l => Array.isArray(l) && l.length >= 2 && l.every(t => str(t, 140))), 'gig lines');
  ok(B.gigLines.dale.every(t => /Dale from Warman/.test(t) && /\{n\}|speed limit/.test(t)), 'Dale at every show');
});

test('bandbook: superfans (Dale from start, the trucker by story, the Japanese president met in Japan, v0.7)', () => {
  const S = K.bandbook.superfans, ids = S.map(x => x.id);
  eq(ids, ['dale', 'trucker', 'japan']);
  const [dale, trk, jp] = S;
  ok(dale.start && dale.name === 'Dale from Warman' && /every show/.test(dale.blurb), 'Dale from Warman, at every show');
  ok(trk.story && /jumper cables/.test(trk.blurb), 'the trucker from the jumper-cable story');
  ok(!jp.reserved && !jp.start && jp.story && jp.region === 'japan' && jp.comments.length >= 4, 'Japanese fan-club president: met in Japan (v0.7)');
  S.forEach(x => ok(str(x.name, 44) && str(x.short, 16) && str(x.icon, 4) && str(x.blurb, 140) && Array.isArray(x.comments) && (x.reserved || x.comments.length >= 4) && x.comments.every(t => str(t, 120)), 'superfan ' + x.id));
  ok(K.npcs.dale_warman && K.npcs.wendell, 'npcs for the superfan cards');
  // v0.9 (owner Q5): each band's home superfan sits in the 'dale' slot; Hail Damage's is Dale from Warman, as before
  const HS = K.bandbook.homeSuperfan || {};
  Object.keys(HS).forEach(b => {
    const x = HS[b], w = 'homeSuperfan.' + b;
    ok(K.bands[b] && str(x.name, 44) && str(x.short, 16) && str(x.from, 60) && str(x.blurb, 160), w + ': shape');
    ok(x.gigLines.length >= 3 && x.gigLinesFar.length >= 2 && x.comments.length >= 4 && [].concat(x.gigLines, x.gigLinesFar, x.comments).every(t => str(t, 140)), w + ': lines');
    ok(!x.gift || K.bandbook.scriptedGifts[x.gift], w + ': gift');
  });
  ok(HS.hail_damage && HS.hail_damage.name === dale.name && JSON.stringify(HS.hail_damage.comments) === JSON.stringify(dale.comments), 'Hail Damage\'s home superfan is Dale from Warman');
});

test('bandbook: mail, gifts (macaroni Kenji), Patreeon tiers', () => {
  const B = K.bandbook, ids = new Set();
  const layers = o => [].concat(...Object.values(o || {}).map(x => [].concat(x.mail || [], x.gifts || [])));
  [].concat(B.mail, B.gifts, layers(B.byGenre), layers(B.byBand)).forEach(g => { ok(/^[a-z][a-z0-9_]*$/.test(g.id) && str(g.from, 44) && str(g.text, 140), 'gift/mail ' + g.id); ids.add(g.id); });
  // ids are unique in every band's own mail + gifts (flat + byGenre + byBand; a genre layer may reuse a stand-in's id)
  BAND_IDS.forEach(b => { const own = poolFor(B, ['mail'], b).concat(poolFor(B, ['gifts'], b)).map(g => g.id); eq(own.length, new Set(own).size, b + ': mail/gift ids unique'); });
  ok(B.mail.length >= 5 && B.gifts.length >= 5, 'enough mail + gifts');
  // v0.9: every band gets ≥5 of each (band-gated items only reach their band)
  const fits = (x, b) => !x.band || x.band.includes(b);
  BAND_IDS.forEach(b => ['mail', 'gifts'].forEach(k => ok(poolFor(B, [k], b).filter(x => fits(x, b)).length >= 5, b + ': ' + k)));
  OTHER_BANDS.forEach(b => ['mail', 'gifts'].forEach(k => poolFor(B, [k], b).filter(x => fits(x, b)).forEach(x => ok(!HD_LEAK.test(x.text + x.from) && !/\bBarb\b/.test(x.from), b + ': ' + x.id + ' is not Hail Damage\'s'))));
  Object.keys(B.scriptedGifts).forEach(id => ok(!ids.has(id) && str(B.scriptedGifts[id].from, 44) && str(B.scriptedGifts[id].text, 140), 'scripted gift ' + id));
  ok(/macaroni portrait of Kenji/.test(B.scriptedGifts.macaroni_kenji.text), 'owner: the macaroni portrait of Kenji');
  eq(B.tiers.map(t => t.name), ['Drumstick', 'Snare', 'Full Kit'], 'owner: tiers');
  eq(B.tiers.map(t => t.id), ['drumstick', 'snare', 'full_kit']);
  ok(B.tiers.every((t, i) => isInt(t.price) && t.price > 0 && isInt(t.minMembers) && str(t.perk, 90) && (!i || (t.price > B.tiers[i - 1].price && t.minMembers > B.tiers[i - 1].minMembers))), 'prices + unlocks ascend');
  ok(B.club.name === 'Patreeon' && /van repairs/.test(B.club.pitch), "owner: Patreeon, 'support your favourite band's van repairs'");
  ok(B.club.payoutChat.every(t => /\{money\}/.test(t) && str(t, 120)) && B.club.grumbleChat.every(t => str(t, 120)), 'club chat lines');
  const E = K.economy.fans;
  ok(E && E.club && E.club.cut > 0 && E.club.cut < 0.3 && Object.keys(E.club.tierShare).sort().join() === 'drumstick,full_kit,snare', 'economy.fans.club');
  ok(Math.abs(E.shares.start.super + E.shares.start.casual + E.shares.start.hater - 1) < 1e-9, 'start shares sum to 1');
});

test('bandbook: fan cards (scandals, superfans, Patreeon) are valid, unique and forced-only', () => {
  const B = K.bandbook, probs = [], all = new Set(ALL_CARD_IDS());
  const FANS = ['hater', 'super', 'superfan', 'gift', 'club', 'clubHappy'];
  const SF = B.superfans.filter(x => !x.reserved).map(x => x.id), GIFTS = Object.keys(B.scriptedGifts).concat(B.gifts.map(g => g.id));
  ok(B.cards.length >= 10, 'fan cards: ' + B.cards.length);
  B.cards.forEach(c => {
    ok(!all.has(c.id), c.id + ': id clashes with another card'); all.add(c.id);
    ok(!CARDS.includes(c), c.id + ': never in the Monday pool');
    probs.push(...cardProblems(c, { effects: ['fan'], mag: magFor(c.gate) }));
    c.choices.forEach((ch, i) => [ch.effects, ch.roll && ch.roll.success.effects, ch.roll && ch.roll.fail.effects].filter(Boolean).forEach(fx => {
      const f = fx.fan; if (!f) return;
      Object.keys(f).forEach(k => ok(FANS.includes(k), c.id + '#' + i + ' fan.' + k));
      ['hater', 'super'].forEach(k => { if (k in f) ok(typeof f[k] === 'number' && f[k] && Math.abs(f[k]) <= 0.05, c.id + ' fan.' + k); });
      if (f.superfan) Object.keys(f.superfan).forEach(id => ok(SF.includes(id) && isInt(f.superfan[id]), c.id + ' superfan ' + id));
      if (f.gift) ok(GIFTS.includes(f.gift), c.id + ' gift ' + f.gift);
      if (f.club) eq(f.club, 'open');
      if ('clubHappy' in f) ok(isInt(f.clubHappy) && f.clubHappy, c.id + ' clubHappy');
    }));
  });
  eq(probs, [], 'fan card problems');
  const byId = id => B.cards.find(c => c.id === id);
  B.scandals.forEach(x => ok(byId(x.card) && (ALL_MEMBER_IDS.includes(x.who) || ALIASES.includes(x.who) || ['player', 'band'].includes(x.who)), 'scandal ' + x.card));
  ok(/artificial turf/.test(byId('scandal_turf').text) && byId('scandal_turf').speaker === 'marcel', "owner: Marcel's beloved lawn is artificial turf");
  ok(byId('fans_macaroni').choices.every(ch => ch.effects.fan.gift === 'macaroni_kenji'), 'every macaroni choice hangs it in the garage');
  ok(byId('fans_trucker').choices.every(ch => ch.effects.fan.superfan.trucker > 0) && /jumper cables/.test(byId('fans_trucker').text), 'the jumper-cable story makes Wendell a superfan');
  eq(byId('fans_patreeon').gate.era, ['signed', 'world'], 'Patreeon unlocks in the Signed era');
  ok(byId('fans_patreeon').choices.filter(ch => ch.effects.fan && ch.effects.fan.club === 'open').length === 2, 'two ways to open it, one to wait');
});

// ======================================================================
// v0.9 "Genres" (plan_contract_0.9 §4.1): the flat pools are neutral; Hail Damage's voice lives in byBand / band gates
// ======================================================================
// Every string another band could be shown: skips byBand layers, member-keyed pools (a key that is a member id), items
// gated to Hail Damage only (x.band / x.gate.band), the rival casts and scene rows owned by a rival or band, and the
// Hail Damage-only fields listed in SKIP.
function othersSee(v, path, out, skip) {
  out = out || [];
  if (typeof v === 'string') { out.push([path, v]); return out; }
  if (!v || typeof v !== 'object') return out;
  const onlyHD = x => x && typeof x === 'object' && ((x.band && ![].concat(x.band).some(b => b !== 'hail_damage'))
    || (x.gate && x.gate.band && !x.gate.band.some(b => b !== 'hail_damage')) || x.rivalId === 'tundra_wraith' || x.bandId === 'hail_damage'
    || (Array.isArray(x.genres) && x.genres.length && x.genres.every(g => g === 'metal')));   // (a metal-only recruit quirk)
  if (onlyHD(v) || v.cameo === true) return out;   // (a Q8 cameo card may name Hail Damage's people: that is the joke)
  if (!Array.isArray(v) && v.speaker && BAND_OF_MEMBER(v.speaker) === 'hail_damage' && !(v.gate && v.gate.band)) return out;   // a member's own card
  for (const k in v) {
    // byBand layers, member-keyed pools, band-keyed maps (vanNames.hail_damage, demandsByBand.hail_damage, ...) and
    // Hail Damage's own start space (upgrades[].bySpace.parents_garage) are that band's alone
    if (k === 'byBand' || k === 'hail_damage' || k === HD.space || ALL_MEMBER_IDS.includes(k) || (skip || []).includes(k)) continue;
    othersSee(v[k], path + '.' + k, out, skip);
  }
  return out;
}
test('v0.9: nothing another band can see names Hail Damage\'s people, van or rival', () => {
  const src = {
    lines: [K.lines, ['vanKenji']], calendar: [K.calendar], bandbook: [K.bandbook, ['superfans', 'scriptedGifts', 'homeSuperfan', 'scandals', 'gigLines']],
    world: [K.world, ['gongCarpet', 'callHome']], shop: [K.shop], awards: [K.awards, ['speech', 'speechWorstVan', 'carpet', 'rivalThanks', 'rivalLoses']],
    rivalry: [K.rivalry, ['cast']], reviews: [K.reviews], labels: [K.labels], drama: [K.drama, ['members']], venues: [K.venues], map: [K.map],
    recap: [K.recap, ['goodYear']], licensing: [K.licensing], creator: [K.creator], recruits: [K.recruits], cards: [K.cards], roadCards: [K.roadCards],
    studioEvents: [K.studioEvents], dramaCards: [K.dramaCards], licenseCards: [K.licenseCards], albumWords: [K.albumWords, ['titles']], drivers: [K.drivers, ['kenji']]
  };
  const hits = [];
  for (const name in src) { const [obj, skip] = src[name]; othersSee(obj, name, [], skip).forEach(([p, t]) => { if (HD_LEAK.test(t)) hits.push(p + ': ' + t.slice(0, 90)); }); }
  eq(hits, [], 'Hail Damage names in shared content');
});

test('v0.9: lines keyed for every band (§4.1, UI ports): byBand shape, moments for every §4.4 kind, banter, reactions', () => {
  const L = K.lines, LB = L.byBand || {};
  Object.keys(LB).forEach(b => ok(K.bands[b], 'lines.byBand.' + b));
  const hd = LB.hail_damage;
  // (the UI reads a string or a list for countIn / noSolo / recruitAd / banter: 54, 56, 58, 55)
  const strs = (v, max) => [].concat(v == null ? [] : v).length > 0 && [].concat(v).every(t => str(t, max));
  ok(hd && strs(hd.countIn, 60) && hd.empty && str(hd.empty.chat, LIMIT.line) && str(hd.empty.catalog, LIMIT.line) && strs(hd.noSolo, LIMIT.line), 'Hail Damage: countIn, empty{chat,catalog}, noSolo');
  ok(hd.exposure && str(hd.exposure.pitch, LIMIT.line) && str(hd.exposure.toast, LIMIT.line) && strs(hd.recruitAd, LIMIT.line), 'Hail Damage: exposure{pitch,toast}, recruitAd');
  // gig moments: every genre moment has lines (+ a label for the UI); band signatures have labels
  const GENRE_MOMENTS = ['mosh', 'headbang', 'wallOfDeath', 'pogo', 'gangShout', 'circlePit', 'fistPump', 'singAlong', 'lighters', 'clapAlong', 'yeehaw', 'lineDance'];
  GENRE_MOMENTS.forEach(m => ok(Array.isArray(L.moments[m]) && L.moments[m].length >= 2 && L.moments[m].every(t => str(t, LIMIT.line)), 'moments.' + m));
  Object.keys(L.moments).forEach(m => ok(C.MOMENTS.includes(m), 'moment kind ' + m));
  C.MOMENTS.filter(m => !['boo', 'drinks'].includes(m)).forEach(m => ok(str((L.momentLabels || {})[m], 24), 'momentLabels.' + m));
  // live lines: members' solo / fill / signature / flub lines (Hail Damage's here, the packs add theirs)
  Object.keys(L.live || {}).forEach(id => { ok(ALL_MEMBER_IDS.includes(id), 'live.' + id); Object.keys(L.live[id]).forEach(k => ok(['solo', 'fill', 'signature', 'flub'].includes(k) && L.live[id][k].every(t => str(t, LIMIT.line)), 'live.' + id + '.' + k)); });
  ok(L.live.marcel && L.live.dana && L.live.jaxon, 'Hail Damage\'s live lines');
  // banter: member-keyed + 'any'; label / review reactions: member-keyed + 'any'
  ok(L.banter && Array.isArray(L.banter.any) && L.banter.any.length >= 4, 'banter.any');
  Object.keys(L.banter).forEach(k => ok(k === 'any' || ALL_MEMBER_IDS.includes(k), 'banter.' + k));
  ['labelReact', 'reviewReact'].forEach(p => { ok(L[p] && L[p].any, p + '.any'); Object.keys(L[p]).forEach(k => ok(k === 'any' || ALL_MEMBER_IDS.includes(k), p + '.' + k)); });
  ok(!HD_LEAK.test(JSON.stringify([L.banter.any, L.labelReact.any, L.reviewReact.any, L.moments])), 'the shared banter, reactions and moments are neutral');
});

test('v0.9: rivalry cast (Tundra Wraith in cast.tundra_wraith), scene rows owned by rival / band (Q8), festivals by genre', () => {
  const R = K.rivalry, tw = R.cast && R.cast.tundra_wraith;
  ok(tw && tw.frontman && Array.isArray(tw.members) && tw.members.length === 4 && tw.news && Object.keys(R.news).every(k => Array.isArray(tw.news[k]) && tw.news[k].length), 'Tundra Wraith: frontman, the four accountants, news for every key');
  ok(Array.isArray(tw.cards) && tw.cards.every(c => /^rv_[a-z_]+_tundra_wraith$/.test(c.id) && (R.cards || []).some(x => c.id === x.id + '_tundra_wraith')), 'Tundra Wraith\'s cards are variants of the neutral rv_* cards');
  ok((R.cards || []).every(c => !HD_LEAK.test(JSON.stringify(c)) && speakerFits(c.speaker, BAND_IDS)), 'the neutral rival cards speak for any rival');
  Object.keys(R.cast).forEach(r => ok(K.rivals[r], 'cast.' + r));
  const scene = R.scene, names = scene.map(x => x.id);
  eq(names.length, new Set(names).size, 'scene ids unique');
  ok(scene.some(x => x.rivalId === 'tundra_wraith'), 'Tundra Wraith has a scene row (skipped when it is your rival)');
  BAND_IDS.forEach(b => ok(scene.some(x => x.bandId === b), b + ': a cameo row on the scene board (Q8)'));
  scene.forEach(x => { if (x.rivalId) ok(K.rivals[x.rivalId], x.id + ': rivalId'); if (x.bandId) ok(K.bands[x.bandId], x.id + ': bandId'); ok(K.logo.rivals[x.id], x.id + ': a fixed logo'); });
});

test('v0.9: shop spaces by city (Q7), upgrades by space, misprints by band; world ring + gong carpet; recap and awards per band', () => {
  const S = K.shop;
  ok(S.spaces.filter(x => x.tier > 0).every(x => x.byCity && Object.values(K.bands).every(b => x.byCity[b.city] && str(x.byCity[b.city].name, 40) && str(x.byCity[b.city].blurb, 160))), 'rented spaces for every home city (spaces[tier].byCity)');
  ok(S.upgrades.filter(u => u.tier === 0).every(u => u.bySpace && Object.values(K.bands).every(b => u.bySpace[b.space] && str(u.bySpace[b.space].name, 40) && str(u.bySpace[b.space].blurb, 160))), 'tier-0 upgrades for every band\'s start space (upgrades[].bySpace)');
  S.upgrades.forEach(u => Object.keys(u.bySpace || {}).forEach(sp => ok(Object.values(K.bands).some(b => b.space === sp), u.id + '.bySpace.' + sp + ': a band\'s start space')));
  const mis = (S.merch || []).find(m => m.id === 'misprint') || (S.merch && S.merch.misprint);
  ok(mis && mis.byBand && BAND_IDS.every(b => mis.byBand[b]), 'a misprint for every band');
  ok(K.world.gongCarpet && K.world.gongCarpet.hail_damage && K.world.gongCarpet.hail_damage.length >= 3, 'the Global Gong carpet (Hail Damage)');
  Object.keys(K.world.gongCarpet).forEach(b => ok(K.bands[b], 'gongCarpet.' + b));
  ok(K.awards.carpet && K.awards.carpet.hail_damage, 'the Loonies carpet (Hail Damage)');
});

// ---- v0.6.2 songwriter: groove presets, modifiers, tempo labels, coach lines -------------------------------------------
test('grooves: every preset validates for its gear; each signature preset grooves >= 70 in its genre; mods are pure', () => {
  const GR = K.grooves, GENRES = ['metal', 'punk', 'rock', 'country'], NO = { lanes: 4, doubleKick: false }, DK = { lanes: 6, doubleKick: true };
  const whole = (g, id, gear) => { let p = GG.songs.starter(g, gear); C.SECTIONS.forEach(sec => { p = GG.songs.applyPreset(p, sec, id, gear, g); }); p.bpm = GG.songs.genre(g).tempo[2]; return p; };
  GENRES.forEach(g => {
    const G = GR[g], ids = new Set();
    ok(G && G.presets.length >= 5 && G.mods.length >= 4, g + ': 5+ presets, 4+ mods');
    ok(G.presets.filter(x => x.signature).length === 1, g + ': one signature preset');
    G.presets.forEach(x => {
      ok(!ids.has(x.id) && ids.add(x.id), g + ' unique id ' + x.id);
      ok(x.name && x.desc && x.desc.length <= 100 && !/\n/.test(x.desc), g + '/' + x.id + ': a one-line plain description');
      ok(x.bar.length >= 4 && x.bar.every(l => /^[x.]{16}$/.test(l)), g + '/' + x.id + ': one bar');
      [NO, DK].forEach(gear => {
        const list = GG.songs.presets(g, gear), pr = list.find(y => y.id === x.id);
        eq(pr.locked, !!x.pedal && !gear.doubleKick, x.id + ' locked only without the pedal');
        const p = whole(g, x.id, gear);
        eq(GG.songs.validate(p, gear), [], g + '/' + x.id + ' validates' + (gear.doubleKick ? ' (pedal)' : ''));
        if (!pr.locked) eq(GG.songs.presetOf(p, 'chorus', g, gear), x.id, x.id + ' is recognised');
        if (!gear.doubleKick && !x.pedal) ok(!/xx/.test(pr.bar[0]), x.id + ': no back-to-back kicks without the pedal');
      });
      if (x.signature) [NO, DK].forEach(gear => { const r = GG.songs.rate(whole(g, x.id, gear), g, gear); ok(r.groove >= 70, g + ' signature ' + x.id + ' groove ' + r.groove); });
    });
    const base = GG.songs.applyPreset(GG.songs.starter(g, NO), 'chorus', G.presets[1].id, NO, g);
    G.mods.forEach(m => {
      ok(m.name && m.desc && m.ops.length, g + ' mod ' + m.id);
      C.SECTIONS.forEach(sec => {
        const a = GG.songs.modify(base, sec, m.id, NO, g), b = GG.songs.modify(base, sec, m.id, NO, g);
        eq(JSON.stringify(a), JSON.stringify(b), m.id + ' deterministic');
        eq(GG.songs.validate(a.pattern, NO), [], g + ' ' + m.id + ' on ' + sec + ' stays valid');
        ok(['groove', 'hook', 'difficulty'].every(k => a.before[k] >= 0 && a.after[k] <= 100), 'before/after ratings');
        C.SECTIONS.filter(o => o !== sec).forEach(o => eq(a.pattern.sections[o], GG.songs.sanitize(base, NO).sections[o], 'only ' + sec + ' changes'));
      });
    });
    const more = GG.songs.modify(GG.songs.starter(g, NO), 'verse', 'more', NO, g);
    ok(more.after.groove > more.before.groove, g + ': "More ' + g + '" grooves harder on the starter ' + more.before.groove + '→' + more.after.groove);
    const T = GG.songs.genre(g).tempo;
    ok(GG.songs.tempoLabel(g, T[0]) && GG.songs.tempoLabel(g, T[1]) && G.tempo.every((x, i) => i === 0 || x[0] > G.tempo[i - 1][0]), g + ': tempo labels cover the range');
  });
  eq(GG.songs.tempoLabel('metal', 110), 'Headbang'); eq(GG.songs.tempoLabel('metal', 150), 'Mosh'); eq(GG.songs.tempoLabel('metal', 230), 'Blast');
  ['verse', 'chorus', 'bridge', 'tempo', 'order', 'name'].forEach(st => ok(GR.coach[st] && GR.coach[st].length && GR.coach[st].every(l => l.text.length <= 120 && new RegExp(l.role)), 'coach line for ' + st));
  const txt = JSON.stringify(GR);
  ok(!/\b(USA|U\.S\.|America|American|United States|Texas|Nashville|Las Vegas|New York|California)\b/i.test(txt), 'no USA content');
});

done('content');
