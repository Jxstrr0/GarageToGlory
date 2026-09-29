// content.test.js: validates src/content (bands, rivals, npcs, cards, lines, presets, song titles) against GG.contracts.
// Also: walks every branch of every card chain (the Cape Saga) and runs a 240-week draw to prove no year runs dry.
// Run: node tests/content.test.js   (or node tests/run.js content)
const { test, ok, eq, done } = require('./_t');
const load = require('./_load');
const GG = load({ localStorage: load.fakeStorage() });
const C = GG.contracts, K = GG.content;

// ---- Local constants (LOOK enums live only in a 02_contracts.js comment; see report "contract additions") ----
const HAIR_STYLES = ['short', 'long', 'mohawk', 'bald', 'bun', 'mullet', 'spiky', 'cap'];
const LOOK_EXTRAS = ['sunglasses', 'beard', 'moustache', 'glasses', 'headband', 'tattoos', 'hat', 'bandana'];
const IDLES = ['mirror', 'noodle', 'lunch', 'corner', 'pace', 'phone'];
const BOOKABLE = ['st_vlads_hall', 'bingo_palace', 'legion_63', 'warman_curling_lounge'];
const SIM_FLAGS = ['parentsLoan'];                  // flags the sim sets that cards may gate on
const CAPE_VALUES = ['velvet', 'curtain', 'charred', 'fireproof', 'none'];
const LIMIT = { title: 32, text: 280, label: 38, outcome: 200, hint: 48, chat: 120, line: 140, rollPair: 300 };
// Effect magnitudes for the garage era: [lo, hi] on the value, or on |value| when abs is set (sign free).
const MAG = {
  fund: { lo: -250, hi: 200 }, fans: { lo: 0, hi: 30 }, drumSkill: { lo: 1, hi: 3 },
  buzz: { lo: 2, hi: 12, abs: true }, chemistry: { lo: 2, hi: 8, abs: true }, burnout: { lo: 3, hi: 15, abs: true },
  mood: { lo: 3, hi: 15, abs: true }, skill: { lo: 1, hi: 3 }
};
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
  ['bands', 'rivals', 'npcs', 'cards', 'lines', 'presets', 'songTitles'].forEach(k => ok(K[k], 'GG.content.' + k + ' missing'));
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
    if (b.id === 'hail_damage') { eq(b.locked, false, w + ' playable'); eq(b.space, 'parents_garage'); }
    else { eq(b.locked, true, w + ' locked'); eq(b.comingIn, 'v0.9', w + ' comingIn'); }
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

test('cards: gates use only GATE_KEYS with valid values; every card is garage/metal', () => {
  const bandIds = Object.keys(K.bands);
  for (const c of CARDS) {
    const g = c.gate, w = 'card ' + c.id + ' gate';
    ok(g && typeof g === 'object', w + ' missing');
    Object.keys(g).forEach(k => ok(C.GATE_KEYS.includes(k), w + ': unknown key ' + k));
    ok(Array.isArray(g.era) && g.era.includes('garage') && g.era.every(e => C.ERAS.includes(e)), w + ': era');
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

test('cards: effects use only EFFECT_KEYS, with valid targets and garage-era magnitudes', () => {
  for (const c of CARDS) for (const { fx, where } of effectsOf(c)) {
    Object.keys(fx).forEach(k => ok(C.EFFECT_KEYS.includes(k), where + ': unknown effect ' + k));
    for (const k of ['fund', 'fans', 'buzz', 'chemistry', 'burnout', 'drumSkill']) {
      if (!(k in fx)) continue;
      const v = fx[k], m = MAG[k], mag = m.abs ? Math.abs(v) : v;
      ok(isInt(v) && v !== 0 && mag >= m.lo && mag <= m.hi, where + ': ' + k + ' ' + v + ' outside garage range');
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
    for (const f in (g.flagEquals || {})) ok(set[f] && set[f].has(g.flagEquals[f]), c.id + ': flagEquals ' + f + '=' + g.flagEquals[f] + ' is never set');
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
    })({ era: 'garage', genre: 'metal', region: 'canada', bandId: 'hail_damage', flags: {}, step: 1 }, 0, 'start');
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

test('a seeded 240-week draw never runs dry and stays varied', () => {
  const rng = GG.RNG(20260929);
  const s = { era: 'garage', genre: 'metal', region: 'canada', bandId: 'hail_damage', fund: 300, buzz: 20, chemistry: 50, gig: null,
    flags: {}, chains: {}, seen: {}, members: HD.members.map(m => ({ id: m.id, mood: m.mood })) };
  const eligible = c => {
    if (c.forceWeek) return false;
    if (c.chain && (c.step !== 1 || s.chains[c.chain])) return false;
    const last = s.seen[c.id];
    if (last != null && (c.once !== false || s.totalWeek - last < (c.cooldown || 0))) return false;
    return gatePasses(c.gate, s);
  };
  let dry = [], year1 = new Set(), counts = {};
  for (let w = 1; w <= C.CAREER_YEARS * C.WEEKS_PER_YEAR; w++) {
    s.totalWeek = w; s.year = Math.ceil(w / C.WEEKS_PER_YEAR); s.week = (w - 1) % C.WEEKS_PER_YEAR + 1;
    s.fans = Math.round(12 + Math.min(w, 24) * 12 + Math.max(0, w - 24) * 6);   // ~300 by year end, then slow growth
    if (w === 40) s.flags.parentsLoan = true;
    if (w % 30 === 0) s.members[w / 30 % 4].mood = 30; else if (w % 30 === 5) s.members.forEach(m => { m.mood = 60; });
    let pool = CARDS.filter(c => c.forceWeek === w && s.seen[c.id] == null);
    if (!pool.length) pool = CARDS.filter(c => c.chain && s.chains[c.chain] && s.chains[c.chain].step === c.step && s.chains[c.chain].due <= w && gatePasses(c.gate, s));
    if (!pool.length) pool = CARDS.filter(eligible);
    if (!pool.length) { dry.push(w); continue; }
    const card = rng.weighted(pool, c => c.weight || 1), ch = rng.pick(card.choices);
    s.seen[card.id] = w; counts[card.id] = (counts[card.id] || 0) + 1;
    if (s.year === 1) year1.add(card.id);
    applyRouting(ch.effects, s);
    if (ch.roll) applyRouting(rng.chance(0.5) ? ch.roll.success.effects : ch.roll.fail.effects, s);
  }
  eq(dry, [], 'weeks with no eligible Monday card');
  ok(year1.size >= 18, 'year one should show ≥18 different cards, got ' + year1.size);
  ok(s.chains.cape && s.chains.cape.step === 'end', 'the Cape Saga finishes within the career');
  ok(Object.values(counts).every(n => n <= 30), 'no card repeats more than 30 times in 240 weeks');
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
  const kenji = strings([K.lines.chat.kenji, K.lines.gigReactions.kenji, K.lines.tap.kenji], 'kenji');
  for (const [p, s] of kenji) ok(/^(…|\.|👍|\(.*\))$/u.test(s), p + ': Kenji said words: ' + s);
});

test('text tokens are only {player} {band} {city} {nick:id} {name:id}', () => {
  const bad = [];
  for (const [p, s] of strings(K, 'content')) {
    const re = /\{([^}]*)\}/g; let m;
    while ((m = re.exec(s))) {
      const t = m[1], parts = t.split(':');
      const good = ['player', 'band', 'city'].includes(t) || (parts.length === 2 && ['nick', 'name'].includes(parts[0]) && ALL_MEMBER_IDS.includes(parts[1]));
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

test('song titles: ≥30 metal titles in French, all secretly about the lawn', () => {
  const metal = K.songTitles.metal, starters = HD.starterSongs.map(s => s.title);
  ok(metal.length >= 30, 'need ≥30 metal titles, got ' + metal.length);
  eq(new Set(metal.map(t => t.fr)).size, metal.length, 'duplicate French titles');
  for (const t of metal) {
    ok(str(t.fr, 48) && str(t.en, 60), 'title shape/length: ' + t.fr);
    ok(!starters.includes(t.fr), 'starter song duplicated in pool: ' + t.fr);
    ok(/lawn|grass|mow|turf|weed|dandelion|sprinkler|rake|hose|fertiliz|thatch|clover|seed|gopher|edging|dew/i.test(t.en), 'English title not about the lawn: ' + t.en);
  }
  ['punk', 'rock', 'country'].forEach(g => ok(K.songTitles[g] && K.songTitles[g].length >= 5 && K.songTitles[g].every(t => str(t, 60)), g + ' titles are plain English strings'));
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

done('content');
