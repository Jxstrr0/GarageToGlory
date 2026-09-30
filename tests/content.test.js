// content.test.js: validates src/content (bands, rivals, npcs, cards, lines, presets, song titles) against GG.contracts.
// Also: walks every branch of every card chain (the Cape Saga) and runs a 240-week draw to prove no year runs dry.
// Run: node tests/content.test.js   (or node tests/run.js content)
const { test, ok, eq, done } = require('./_t');
const load = require('./_load');
const GG = load({ localStorage: load.fakeStorage() });
const C = GG.contracts, K = GG.content;

// ---- Local constants (LOOK enums live only in a 02_contracts.js comment; see report "contract additions") ----
const HAIR_STYLES = ['short', 'long', 'mohawk', 'bald', 'bun', 'mullet', 'spiky', 'cap'];
const LOOK_EXTRAS = ['sunglasses', 'beard', 'moustache', 'glasses', 'headband', 'tattoos', 'hat', 'bandana', 'toque', 'bighat'];
const IDLES = ['mirror', 'noodle', 'lunch', 'corner', 'pace', 'phone', 'fiddle'];
const BOOKABLE = ['st_vlads_hall', 'bingo_palace', 'legion_63', 'warman_curling_lounge'];
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
const CARD_KEYS = ['id', 'type', 'speaker', 'title', 'text', 'gate', 'weight', 'once', 'cooldown', 'chain', 'step', 'forceWeek', 'choices'];
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
  }
  ['mom', 'dad', 'baba', 'neighbour', 'dj', 'wraith_frontman'].forEach(id => ok(K.npcs[id], 'npc ' + id + ' missing'));
});

// ---- Cards ------------------------------------------------------------
test('cards: ids, types, keys, speakers, lengths', () => {
  const ids = new Set();
  for (const c of CARDS) {
    const w = 'card ' + c.id;
    ok(/^[a-z][a-z0-9_]*$/.test(c.id) && !ids.has(c.id), w + ': id bad or duplicate'); ids.add(c.id);
    Object.keys(c).forEach(k => ok(CARD_KEYS.includes(k), w + ': unknown key ' + k));
    ok(C.CARD_TYPES.includes(c.type), w + ': type');
    ok(HD_IDS.includes(c.speaker) || NPC_IDS.includes(c.speaker), w + ': speaker ' + c.speaker);
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

test('cards: gates use only GATE_KEYS with valid values; every card is metal with valid eras', () => {
  const bandIds = Object.keys(K.bands);
  for (const c of CARDS) {
    const g = c.gate, w = 'card ' + c.id + ' gate';
    ok(g && typeof g === 'object', w + ' missing');
    Object.keys(g).forEach(k => ok(C.GATE_KEYS.includes(k), w + ': unknown key ' + k));
    ok(Array.isArray(g.era) && g.era.length > 0 && g.era.every(e => C.ERAS.includes(e) && e !== 'world'), w + ': era (world arrives in v0.7)');
    ok(Array.isArray(g.genre) && g.genre.includes('metal') && g.genre.every(e => C.GENRES.includes(e)), w + ': genre');
    if (g.region) ok(g.region.every(r => C.REGIONS.includes(r)), w + ': region');
    if (g.band) ok(g.band.every(b => bandIds.includes(b)), w + ': band');
    for (const [lo, hi] of [['minWeek', 'maxWeek'], ['minYear', 'maxYear'], ['minFans', 'maxFans'], ['minFund', 'maxFund'], ['minBuzz', 'maxBuzz'], ['minChemistry', 'maxChemistry']]) {
      if (lo in g) ok(typeof g[lo] === 'number', w + ': ' + lo);
      if (hi in g) ok(typeof g[hi] === 'number', w + ': ' + hi);
      if (lo in g && hi in g) ok(g[lo] <= g[hi], w + ': ' + lo + ' > ' + hi);
    }
    if (g.weekOfYear) ok(g.weekOfYear.length === 2 && isInt(g.weekOfYear[0]) && g.weekOfYear[0] >= 1 && g.weekOfYear[1] <= C.WEEKS_PER_YEAR && g.weekOfYear[0] <= g.weekOfYear[1], w + ': weekOfYear');
    ['flags', 'notFlags'].forEach(k => { if (g[k]) ok(Array.isArray(g[k]) && g[k].every(f => typeof f === 'string'), w + ': ' + k); });
    if (g.flagEquals) ok(Object.values(g.flagEquals).every(v => ['string', 'number', 'boolean'].includes(typeof v)), w + ': flagEquals');
    if ('gigBooked' in g) ok(typeof g.gigBooked === 'boolean', w + ': gigBooked');
    ['moodBelow', 'moodAbove'].forEach(k => { if (g[k]) for (const id in g[k]) ok(HD_IDS.includes(id) && g[k][id] >= 0 && g[k][id] <= 100, w + ': ' + k + '.' + id); });
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
        ok(id === 'all' || HD_IDS.includes(id), where + ': ' + k + ' key ' + id + ' is not a member');
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
    if (fx.chat) {
      ok(HD_IDS.includes(fx.chat.who) || NPC_IDS.includes(fx.chat.who), where + ': chat.who ' + fx.chat.who);
      ok(str(fx.chat.text, LIMIT.chat), where + ': chat.text ≤' + LIMIT.chat);
    }
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

test('cards: forced week-one card is lord_abyssus', () => {
  const forced = CARDS.filter(c => c.forceWeek === 1);
  eq(forced.map(c => c.id), ['lord_abyssus']);
  ok(/Lord Abyssus/.test(forced[0].text) && forced[0].speaker === 'marcel', 'Marcel answers only to Lord Abyssus');
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
test('cards: year one has early, mid (fans) and late cards, all six types, and repeatables', () => {
  const normal = CARDS.filter(c => !c.chain && !c.forceWeek);
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
    if (c.forceWeek) return false;
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
    let pool = CARDS.filter(c => c.forceWeek === w && s.seen[c.id] == null);
    if (!pool.length) pool = CARDS.filter(c => c.chain && s.chains[c.chain] && s.chains[c.chain].step === c.step && s.chains[c.chain].due <= w && gatePasses(c.gate, s));
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
    if (Array.isArray(v)) eq(v.length, new Set(v).size, p + ': duplicate line');
    else for (const k in v) noDupes(v[k], p + '.' + k);
  })(L, 'lines');
});

test('lines: Kenji never speaks', () => {
  const kenji = strings([K.lines.chat.kenji, K.lines.gigReactions.kenji, K.lines.tap.kenji, K.lines.songReactions.kenji], 'kenji');
  for (const [p, s] of kenji) ok(/^(…|\.|👍|\(.*\))$/u.test(s), p + ': Kenji said words: ' + s);
});

test('text tokens are only {player} {band} {city} {nick:id} {name:id} (+ v0.4 {recruit}; {who} {gripe} in drama.stageText)', () => {
  const bad = [];
  for (const [p, s] of strings(K, 'content')) {
    const re = /\{([^}]*)\}/g; let m;
    while ((m = re.exec(s))) {
      const t = m[1], parts = t.split(':');
      const good = ['player', 'band', 'city', 'recruit'].includes(t) || (/^content\.drama\.stageText/.test(p) && ['who', 'gripe'].includes(t))
        || (/^content\.reviews\./.test(p) && ['album', 'single'].includes(t)) || (/^content\.awards\./.test(p) && t === 'category')
        || (/^content\.albumWords\.titles\.\w+\.forms/.test(p) && ['adj', 'noun', 'place'].includes(t))
        || (/^content\.rivalry\./.test(p) && ['rival', 'album', 'pos', 'fans', 'venue', 'name', 'prize', 'n'].includes(t))   // v0.6
        || (/^content\.calendar\.holidays/.test(p) && t === 'costume')   // v0.6.1: Halloween costume band
        || (/^content\.world\./.test(p) && ['region', 'song', 'festival', 'here', 'rival', 'venue'].includes(t))   // v0.7: GG.tour tokens
        || (/^content\.bandbook\./.test(p) && ['who', 'song', 'venue', 'gcity', 'views', 'n', 'money', 'rival'].includes(t))   // v0.6.1: GG.fans tokens
        || (/^content\.(licensing|licenseChoices|licenseCards)\b/.test(p) && ['brand', 'adwhat', 'adsong', 'adfee', 'adcounter', 'adtake', 'adodds', 'adleft'].includes(t))   // v0.8.1: GG.licensing tokens
        || (/^content\.recap\./.test(p) && ['rival', 'nth', 'next', 'n', 'target', 'name', 'award', 'album', 'cert', 'label', 'region', 'venue', 'brand', 'song', 'van'].includes(t))   // v0.8.1: GG.recap tokens
        || (parts.length === 2 && ['nick', 'name'].includes(parts[0]) && ALL_MEMBER_IDS.includes(parts[1]));
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
// v0.6.1 (Addendum 1 C6): Canada in rings.
const RINGS = {
  sask: SASK_CORE.concat(['Humboldt', 'Gravelbourg', 'Estevan']),
  west: ['Winnipeg', 'Brandon', 'Calgary', 'Edmonton', 'Red Deer', 'Lethbridge', 'Kelowna', 'Vancouver', 'Victoria'],
  eastnorth: ['Thunder Bay', 'Toronto', 'Ottawa', 'Montréal', 'Québec City', 'Halifax', "St. John's", 'Whitehorse', 'Yellowknife']
};
test('map: Canada in rings (Sask from day one, the West in Local Heroes, East & North in Signed), pins in the box, real-ish km, connected', () => {
  const M = K.map, ids = Object.keys(M.cities);
  eq(M.rings.map(r => r.id + ':' + r.era), ['sask:garage', 'west:local', 'eastnorth:signed'], 'owner decision: rings + eras');
  M.rings.forEach(r => { ok(str(r.name, 24) && str(r.sub, 80), 'ring ' + r.id); if (r.era !== 'garage') ok(str(r.lock, 120) && r.home && r.home.w > 0, 'locked ring teaser + home box ' + r.id); });
  for (const ring in RINGS) eq(ids.filter(id => M.cities[id].ring === ring).map(id => M.cities[id].name).sort(), RINGS[ring].slice().sort(), 'owner decision: ' + ring + ' cities');
  eq(ids.length, RINGS.sask.length + RINGS.west.length + RINGS.eastnorth.length, 'no stray cities');
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
    ok(c.type === 'road' && (HD_IDS.includes(c.speaker) || NPC_IDS.includes(c.speaker)) && c.speaker !== 'kenji', w + ': type/speaker');
    ok(str(c.title, LIMIT.title) && str(c.text, LIMIT.text), w + ': title/text length (' + c.text.length + ')');
    if (c.once === false) ok(isInt(c.cooldown) && c.cooldown >= 4, w + ': cooldown');
    if (c.gate) Object.keys(c.gate).forEach(k => ok(C.GATE_KEYS.includes(k) || ROAD_GATES.includes(k), w + ': gate ' + k));
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
        for (const k of ['mood', 'skill']) if (k in fx) for (const id in fx[k]) ok((id === 'all' || HD_IDS.includes(id)) && isInt(fx[k][id]), cw + ': ' + k + '.' + id);
        if (fx.van) ok(Object.keys(fx.van).join() === 'condition' && isInt(fx.van.condition) && Math.abs(fx.van.condition) >= 1 && Math.abs(fx.van.condition) <= 10, cw + ': van');
      });
    });
    all.push(...strings(c, c.id).map(x => x[1]));
  }
  const talk = all.filter(s => /Kenji (says|said|asks|asked|shouts|whispers|yells|mutters)(?! nothing)|Kenji: /.test(s));
  eq(talk, [], 'Kenji never speaks');
  ok(R.some(c => c.gate && c.gate.season && c.gate.season.includes('winter')) && R.some(c => c.gate && c.gate.minKm) && R.some(c => !c.gate), 'season, distance and anywhere cards');
  ok(/moose/i.test(all.join(' ')) && /Yellowhead/.test(all.join(' ')) && /grain elevator/i.test(all.join(' ')) && /baba/i.test(all.join(' ')), 'the brief: moose, Yellowhead, grain elevators, Baba');
});

test('lines: van banter (Kenji silent), road + venue pools', () => {
  const L = K.lines;
  ['marcel', 'dana', 'jaxon'].forEach(id => ok(L.vanBanter[id] && L.vanBanter[id].length >= 5, 'vanBanter.' + id));
  ok(!L.vanBanter.kenji, 'Kenji has no banter');
  Object.keys(L.vanBanter).forEach(id => ok(HD_IDS.includes(id), 'vanBanter member ' + id));
  ok(L.vanKenji.length >= 4 && L.vanKenji.every(s => /^\(.*\)$/.test(s)), 'Kenji only gets stage directions');
  ['vanArrive', 'genreClash', 'venueUp', 'venueDown', 'venueBanned', 'vanTired', 'breakdown', 'openingSlot', 'sameCrowd']
    .forEach(k => ok(Array.isArray(L[k]) && L[k].length >= 3, 'lines.' + k + ' ≥3'));
});

// ---- v0.4 drama + recruits --------------------------------------------------
const DRAMA_CARDS = (K.dramaCards || []).concat(...((K.recruits && K.recruits.quirks) || []).map(q => q.cards || []));
const RULES = ['spotlight', 'cape', 'solos', 'practice', 'freedom', 'baba', 'mystery'];
const ACTS = ['settle', 'quit', 'return', 'later', 'rival'];
test('drama cards: schema, ids unique across all cards, speakers, lengths, effects (incl. member/payCut/repay)', () => {
  const ids = new Set(CARDS.map(c => c.id));
  ok(DRAMA_CARDS.length >= 25, 'drama + quirk cards: ' + DRAMA_CARDS.length);
  for (const c of DRAMA_CARDS) {
    const w = 'drama card ' + c.id;
    ok(/^[a-z][a-z0-9_]*$/.test(c.id) && !ids.has(c.id), w + ': id bad or duplicate'); ids.add(c.id);
    Object.keys(c).forEach(k => ok(CARD_KEYS.includes(k) && !['chain', 'step', 'forceWeek'].includes(k), w + ': key ' + k));
    ok(C.CARD_TYPES.includes(c.type), w + ': type');
    ok(HD_IDS.includes(c.speaker) || NPC_IDS.includes(c.speaker) || c.speaker === 'recruit', w + ': speaker ' + c.speaker);
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
      for (const k of ['mood', 'skill']) if (fx[k]) for (const id in fx[k]) ok(id === 'all' || id === 'recruit' || HD_IDS.includes(id), where + ': ' + k + ' key ' + id);
      if ('fund' in fx) ok(isInt(fx.fund) && fx.fund >= -250 && fx.fund <= 200, where + ': fund');
      if ('payCut' in fx) ok(fx.payCut === 0.05, where + ': payCut steps of +0.05');
      if (fx.member) (Array.isArray(fx.member) ? fx.member : [fx.member]).forEach(x =>
        ok((x.id === 'recruit' || HD_IDS.includes(x.id)) && ACTS.includes(x.act), where + ': member ' + JSON.stringify(x)));
    }
  }
});

test('drama: every original has wants (valid rules), 3 grumble + 3 passive lines, an ultimatum, returns and an exit storyline', () => {
  const D = K.drama, byId = id => DRAMA_CARDS.find(c => c.id === id);
  ok(D && D.members && D.recruit && D.fillIns && D.stageText && D.gripes, 'drama content present');
  for (const id of HD_IDS) {
    const m = D.members[id], w = 'drama.' + id;
    ok(m, w + ' missing');
    ok(m.wants.length >= 1 && m.wants.every(x => str(x.text, LIMIT.line) && str(x.gripe, 40) && RULES.includes(x.rule)), w + ': wants');
    ok(m.grumble.length >= 2 && m.passive.length >= 2 && m.grumble.concat(m.passive).every(t => str(t, LIMIT.chat)), w + ': stage lines');
    const u = byId(m.ultimatum);
    ok(u && u.choices.some(ch => ch.effects.member.act === 'quit') && u.choices.filter(ch => ch.effects.member.act === 'settle').length >= 1, w + ': ultimatum settles or quits');
    const x = m.exit;
    ok(x && str(x.status, LIMIT.line) && x.returnAfter[0] >= 6 && x.returnAfter[1] <= 40 && x.beats.length >= 2 && str(x.changed, LIMIT.line), w + ': exit storyline');
    ok(x.beats.every(b => isInt(b.at) && str(b.text, LIMIT.chat) && (HD_IDS.includes(b.who) || NPC_IDS.includes(b.who))), w + ': beats');
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
  const map = Object.values(K.map.cities).filter(c => c.ring === 'sask').map(c => c.name);   // v0.6.1: the home ring
  ok(map.every(n => R.hometowns.canada.includes(n)), 'every Saskatchewan city is a possible hometown');
  eq(R.traits.map(t => t.id), ['reliable', 'road_warrior', 'showboat', 'studio_rat', 'hype_machine', 'fast_learner', 'party_animal', 'frugal', 'local_legend']);
  R.traits.forEach(t => ok(str(t.name, 20) && str(t.effect, 90) && isInt(t.chem), 'trait ' + t.id));
  ok(R.quirks.length >= 10, 'quirks ≥ 10');
  R.quirks.forEach(q => ok(str(q.text, 70) && q.cards.length >= 1 && q.cards.length <= 2 && q.cards.every(c => c.speaker === 'recruit'), 'quirk ' + q.id));
  ['happy', 'ok', 'grumpy'].forEach(b => ok(R.chat[b].length >= 4, 'recruit chat ' + b));
});

test('guilt cards: ≥5 gated on parentsLoan with repay choices', () => {
  const guilt = CARDS.filter(c => (c.gate.flags || []).includes('parentsLoan') && c.choices.some(ch => ch.effects && ch.effects.repay));
  ok(guilt.length >= 5, 'guilt cards with repay: ' + guilt.length);
  guilt.forEach(c => c.choices.forEach(ch => { if (ch.effects && 'repay' in ch.effects) ok(isInt(ch.effects.repay) && ch.effects.repay >= 20 && ch.effects.repay <= 300, c.id + ': repay'); }));
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
  push(HD_IDS.includes(c.speaker) || NPC_IDS.includes(c.speaker), 'speaker ' + c.speaker);
  push(str(c.title, LIMIT.title) && str(c.text, LIMIT.text), 'title/text length (text ' + (c.text || '').length + ')');
  if (c.once === false) push(isInt(c.cooldown) && c.cooldown >= 4, 'cooldown');
  push(Array.isArray(c.choices) && c.choices.length >= 2 && c.choices.length <= 3 && new Set(c.choices.map(x => x.label)).size === c.choices.length, 'choices');
  Object.keys(c.gate || {}).forEach(k => push(C.GATE_KEYS.includes(k) || (extra.gates || []).includes(k), 'gate ' + k));
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
        const m = extra.mag[k], v = fx[k][id]; push((id === 'all' || HD_IDS.includes(id)) && isInt(v) && Math.abs(v) >= m.lo && Math.abs(v) <= m.hi, cw + ' ' + k + '.' + id);
      }
      if (fx.chat) push((HD_IDS.includes(fx.chat.who) || NPC_IDS.includes(fx.chat.who)) && str(fx.chat.text, LIMIT.chat), cw + ' chat');
      if (fx.flags) for (const f in fx.flags) push(/^[a-z][A-Za-z0-9]*$/.test(f) && ['string', 'number', 'boolean'].includes(typeof fx.flags[f]), cw + ' flag ' + f);
    });
  });
  const talk = strings(c, c.id).filter(([, t]) => KENJI_TALKS.test(t));
  push(!talk.length, 'Kenji speaks: ' + (talk[0] || [])[1]);
  return bad;
}
const ALL_CARD_IDS = () => [].concat(CARDS, K.dramaCards || [], K.roadCards || [], K.studioEvents || [],
  (K.awards && K.awards.outfitCards) || [], K.awards ? [K.awards.speech, K.awards.speechWorstVan] : []).map(c => c.id);

test('labels: Gopherwood, Monolith and DIY with the contract fields (no 360 deals)', () => {
  const L = K.labels;
  eq(Object.keys(L).sort(), C.LABELS.slice().sort(), 'label ids');
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
  ok(m.demands.some(x => x.kind === 'english' && /sing in English/.test(x.text)) && m.demands.some(x => x.kind === 'radio') && m.demands.some(x => x.kind === 'image'), 'Monolith: English, radio edit, image');
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
  [].concat(A.envelope, A.win, A.lose).forEach(t => ok(str(t, 200) && !KENJI_TALKS.test(t), 'line: ' + t));
  // Outfit cards: exactly one per cape state; every branch writes a known outfit.
  const outfitIds = Object.keys(A.outfits);
  ok(outfitIds.includes('cape') && outfitIds.length >= 3, 'outfits');
  const probs = [];
  for (const c of A.outfitCards) {
    probs.push(...cardProblems(c, { mag }));
    ok(Object.keys(c.gate).every(k => ['band', 'flags', 'notFlags', 'flagEquals'].includes(k)) && c.gate.band.includes('hail_damage'), c.id + ': gates on band + cape only');
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
  // The speech: thank your mom / thank the moose / take a shot at the rival.
  eq(cardProblems(A.speech, { mag }).concat(cardProblems(A.speechWorstVan, { mag })), [], 'speech card problems');
  const labels = A.speech.choices.map(ch => ch.label).join(' | ');
  ok(/mom/i.test(labels) && /moose/i.test(labels) && /Tundra Wraith|rival/i.test(labels), 'speech choices: mom, moose, rival: ' + labels);
  ok(A.speech.choices.some(ch => ch.effects && ch.effects.flags && ch.effects.flags.mooseMuse), 'thanking the moose wakes the moose muse');
  ok(A.speechWorstVan.speaker === 'kenji' && /Moose Hearse/.test(A.speechWorstVan.text), 'Worst Van: Kenji accepts, silently');
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
  for (const w in Cal.news) ok((HD_IDS.includes(Cal.news[w].who) || NPC_IDS.includes(Cal.news[w].who)) && Cal.news[w].who !== 'kenji' && str(Cal.news[w].text, LIMIT.chat), 'news ' + w);
  Object.values(Cal.lines).forEach(l => l.forEach(t => ok(str(t, LIMIT.line), 'line ' + t)));
  ok(Cal.costumes.length >= 5, 'costume bands');
});

test('holiday cards: once a year on their holiday week, the brief (guilt dinner, Christmas single, costumes, Grey Mug)', () => {
  const HC = CARDS.filter(c => /^holiday_/.test(c.id)), byId = id => HC.find(c => c.id === id);
  ok(HC.length >= 8, 'holiday cards: ' + HC.length);
  HC.forEach(c => {
    ok(c.gate.weekOfYear && K.calendar.holidays.some(h => (h.cards || []).includes(c.id) && h.weeks[0] <= c.gate.weekOfYear[0] && c.gate.weekOfYear[1] <= h.weeks[1]), c.id + ': on its holiday');
    ok(c.once === false ? c.cooldown >= 20 : c.id === 'holiday_grey_mug', c.id + ': yearly (cooldown 20) or once');
  });
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
  for (const k of Object.keys(B.kinds)) {
    ok(str(B.kinds[k].label, 24) && str(B.kinds[k].icon, 4), 'kind ' + k);
    ok(Array.isArray(B.posts[k]) && B.posts[k].length >= 4 && B.posts[k].every(t => str(t, 140)), 'posts.' + k + ' ≥4 lines ≤140');
  }
  ok(B.posts.gig.every(t => /\{venue\}/.test(t)), 'gig announcements name the venue');
  ok(B.posts.teaser.every(t => /\{song\}/.test(t)), 'teasers name the song');
  ok(B.viral.good.length >= 4 && B.viral.good.every(t => str(t, 140) && /\{views\}/.test(t)), 'good viral lines');
  ok(B.viral.good.some(t => /falls off the drum riser/.test(t)), 'owner: you falling off the riser');
  ok(B.viral.cringe.length >= 4 && B.viral.cringe.every(c => (c.who === 'any' || HD_IDS.includes(c.who)) && c.who !== 'kenji' && str(c.text, 140)), 'cringe viral: a member (never Kenji)');
  ok(B.viral.cringe.some(c => c.who === 'marcel' && /dance tutorial/.test(c.text)), "owner: Marcel's cringe dance tutorial");
  const CM = B.comments, MIN = { good: 6, mixed: 4, bad: 3, hater: 5, rival: 5, rivalExclusive: 2 };
  for (const k in MIN) ok(Array.isArray(CM[k]) && CM[k].length >= MIN[k] && CM[k].every(t => str(t, 120)) && new Set(CM[k]).size === CM[k].length, 'comments.' + k);
  ok(CM.good.includes('saw them at a Legion hall, 12 people and a dog, I was the dog'), 'owner: the dog comment');
  ok(B.handles.fan.length >= 10 && B.handles.hater.length >= 4 && B.handles.fan.concat(B.handles.hater).every(h => /^[\w]{3,20}$/.test(h)), 'handles');
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
});

test('bandbook: mail, gifts (macaroni Kenji), Patreeon tiers', () => {
  const B = K.bandbook, ids = new Set();
  [].concat(B.mail, B.gifts).forEach(g => { ok(/^[a-z][a-z0-9_]*$/.test(g.id) && !ids.has(g.id) && str(g.from, 44) && str(g.text, 140), 'gift/mail ' + g.id); ids.add(g.id); });
  ok(B.mail.length >= 5 && B.gifts.length >= 5, 'enough mail + gifts');
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
  B.scandals.forEach(x => ok(byId(x.card) && (HD_IDS.includes(x.who) || ['player', 'band'].includes(x.who)), 'scandal ' + x.card));
  ok(/artificial turf/.test(byId('scandal_turf').text) && byId('scandal_turf').speaker === 'marcel', "owner: Marcel's beloved lawn is artificial turf");
  ok(byId('fans_macaroni').choices.every(ch => ch.effects.fan.gift === 'macaroni_kenji'), 'every macaroni choice hangs it in the garage');
  ok(byId('fans_trucker').choices.every(ch => ch.effects.fan.superfan.trucker > 0) && /jumper cables/.test(byId('fans_trucker').text), 'the jumper-cable story makes Wendell a superfan');
  eq(byId('fans_patreeon').gate.era, ['signed', 'world'], 'Patreeon unlocks in the Signed era');
  ok(byId('fans_patreeon').choices.filter(ch => ch.effects.fan && ch.effects.fan.club === 'open').length === 2, 'two ways to open it, one to wait');
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
