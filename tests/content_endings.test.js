// content_endings.test.js (v1.0 "Glory", Lane E; plan_contract_1.0 §4.2–4.4, §5 E): src/content/endings.js is complete and
// valid: tiers + specials match the contract ids, test kinds and gates are real, every original of every band has an
// epilogue variant beyond the shipped default (the A14 `when`s exactly), the recruit pool covers every trait and quirk, the
// player card covers every tier (seat-keyed, drums in v1.0), the bonus-year lines and cards are per band, tokens are only
// the career ones, no USA content, parody names only, no gong but the Global Gong, no share/screenshot talk, and no band's
// text names another band's people. The Monday deck: a seeded 312-week draw per band (the content_bands.test.js walk, two
// more years) never runs dry, and in a World-era bonus career every band's bonus cards come up.
// Run: node tests/content_endings.test.js
const { test, ok, eq, done } = require('./_t');
const load = require('./_load');
const GG = load({ localStorage: load.fakeStorage() });
const C = GG.contracts, K = GG.content, E = K.endings;
const BANDS = K.bands, BAND_IDS = Object.keys(BANDS);
const MEMBERS = b => BANDS[b].members.map(m => m.id);
const ORIGINALS = [].concat(...BAND_IDS.map(MEMBERS));
const str = (s, max) => typeof s === 'string' && s.trim().length > 0 && s.length <= (max || 280);
const WHEN_KEYS = ['flag', 'values', 'notValues', 'minTier', 'special', 'status', 'inLineup', 'minYearsIn', 'seatRole'];
const LIMIT = { title: 32, text: 280, label: 38, outcome: 200, hint: 48, chat: 120 };

// every string under a value, with its path
function strings(o, p, out) {
  out = out || [];
  if (typeof o === 'string') out.push([p, o]);
  else if (Array.isArray(o)) o.forEach((x, i) => strings(x, p + '[' + i + ']', out));
  else if (o && typeof o === 'object') for (const k in o) strings(o[k], p + '.' + k, out);
  return out;
}
// The text one band's career can show (its own layers only).
function bandText(b) {
  const B = BANDS[b], rv = B.rival, quirks = K.recruits.quirks.filter(q => !q.genres || q.genres.includes(B.genre)).map(q => q.id);
  const out = [];
  E.tiers.forEach(t => { out.push(t.line, t.lineLostFinal, t.lineZero, t.nameZero, t.name); const bb = t.byBand && t.byBand[b]; if (bb) out.push(bb.line, bb.lineLostFinal, bb.lineZero); });
  E.specials.filter(sp => !sp.band || sp.band.includes(b)).forEach(sp => out.push(sp.name, sp.line, ...Object.values(sp.lineByCount || {}), ...Object.values(sp.nameBySize || {})));
  MEMBERS(b).forEach(id => (E.epilogues[id] || []).forEach(v => out.push(v.text)));
  Object.values(E.recruits.byTrait).forEach(l => out.push(...l)); quirks.forEach(q => out.push(...(E.recruits.byQuirk[q] || []))); out.push(...E.recruits.any);
  out.push(...E.defectors.any, ...((E.defectors.byRival || {})[rv] || []));
  ['you', 'rival', 'none'].forEach(k => out.push(...(E.rival[k] || []), ...(((E.rival.byRival || {})[rv] || {})[k] || [])));
  [2, 3].forEach(y => out.push(...(E.bonus.milestone[y] || []), ...(E.bonus.chat[y] || []), ...((((E.bonus.byBand || {})[b] || {}).chat || {})[y] || [])));
  Object.values(E.player.drums).forEach(t => out.push(t));
  E.bonusCards.filter(c => c.gate.band.includes(b)).forEach(c => strings(c, c.id).forEach(([, s]) => out.push(s)));
  return out.filter(Boolean);
}
// Other bands' names (members, band names, rivals, their rival casts) for a band's career.
function foreignNames(b) {
  const names = [];
  BAND_IDS.filter(x => x !== b).forEach(x => {
    const B = BANDS[x]; names.push(B.name);
    B.members.forEach(m => { names.push(m.name); if (m.fullName) names.push(m.fullName); });
    const r = K.rivals[B.rival]; if (r) names.push(r.name);
    const cast = ((K.rivalry || {}).cast || {})[B.rival] || {};
    (cast.members || []).forEach(m => [m.name, m.fullName].forEach(w => { if (w && w.length > 3 && !['Steve', 'Dusty', 'Colt', 'Boot', 'Buckle', 'Dex', 'Rex'].includes(w)) names.push(w); }));
  });
  if (b !== 'hail_damage') names.push('Lord Abyssus', 'Baba', 'Moose Hearse', 'Grimnir', 'Moose Opera');
  return [...new Set(names.filter(Boolean))];
}
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test('tiers: the five contract tiers, best first, thresholds 800/600/400/200/0, lines (+ lost-final and zero-album variants), unlocks', () => {
  eq(E.tiers.map(t => t.id), C.ENDING_TIERS);
  eq(E.tiers.map(t => t.min), [800, 600, 400, 200, 0]);
  E.tiers.forEach(t => {
    ok(str(t.name, 32) && str(t.line), t.id + ': name + line');
    ok(t.unlock && typeof t.unlock.palette === 'string', t.id + ': unlocks a palette (Q5)');
    Object.keys(t.byBand || {}).forEach(b => ok(BANDS[b] && str(t.byBand[b].line), t.id + '.byBand.' + b));
  });
  ok(str(E.tiers[0].lineLostFinal) && /\{city\}/.test(E.tiers[0].line) && /\{rival\}/.test(E.tiers[0].lineLostFinal), 'Arena Legends: the statue in {city}; the variant when the rival headlined');
  const oa = E.tiers.find(t => t.id === 'one_album_wonders'), sg = E.tiers.find(t => t.id === 'still_in_the_garage');
  ok(oa.nameZero === 'Zero-Album Wonders' && str(oa.lineZero), 'the Zero-Album Wonders line');
  ok(sg.name === 'Still in the Garage' && /\{space\}/.test(sg.line) && BAND_IDS.every(b => /\{space\}/.test((sg.byBand && sg.byBand[b] || sg).line)), '"Still in the Garage" names the band\'s own {space}');
});

test('specials: the eight contract ids, real test kinds, band gates (the four World payoffs), lines, unlocks, size/count texts', () => {
  eq(E.specials.map(s => s.id), C.SPECIAL_ENDINGS);
  E.specials.forEach(sp => {
    ok(str(sp.name, 32) && str(sp.line), sp.id + ': name + line');
    ok(sp.test && GG.legacy.TESTS[sp.test.kind], sp.id + ': test kind ' + (sp.test && sp.test.kind));
    if (sp.band) ok(sp.band.every(b => BANDS[b]), sp.id + ': band gate');
    ok(sp.unlock && (typeof sp.unlock.emblem === 'string' || typeof sp.unlock.palette === 'string'), sp.id + ': unlocks a look (Q5)');
  });
  const by = id => E.specials.find(s => s.id === id);
  eq(by('big_in_japan').test, { kind: 'bigIn', region: 'japan', share: 0.2 });
  eq([by('moose_opera').band, by('moose_opera').test], [['hail_damage'], { kind: 'flag', flag: 'mooseOpera', values: ['platinum'] }]);
  eq([by('big_in_berlin').band, by('big_in_berlin').test], [['frost_heave'], { kind: 'flag', flag: 'squatAnthemPayoff' }]);
  eq([by('mudstonbury_legends').band, by('mudstonbury_legends').test], [['gravel_kings'], { kind: 'flag', flag: 'mudHeadlinePayoff' }]);
  eq([by('outback_legends').band, by('outback_legends').test], [['grid_road_ramblers'], { kind: 'flag', flag: 'outbackPayoff' }]);
  eq(by('band_of_strangers').test, { kind: 'originals', kept: 0 });
  eq(by('original_lineup').test, { kind: 'originals', neverQuit: true });
  eq(by('side_project').test, { kind: 'rivalOriginals', min: 2 });
  eq(by('original_lineup').nameBySize, { 4: 'The Original Four', 5: 'The Original Five' });
  ok([0, 1, 2, 3, 4].every(n => str(by('band_of_strangers').lineByCount[n])) && /three strangers/.test(by('band_of_strangers').lineByCount[3])
    && !/three/.test(by('band_of_strangers').lineByCount[2]), 'Band of Strangers reads the count ("three strangers" only with three)');
  eq(E.specials.filter(s => s.unlock.emblem === 'globe_record').map(s => s.id), ['moose_opera', 'big_in_berlin', 'mudstonbury_legends', 'outback_legends'], 'globe_record: every World-payoff special');
});

test('epilogues: every original of every band has a variant beyond the shipped default; WHEN keys valid; the A14 + storyline whens', () => {
  ORIGINALS.forEach(id => {
    const d = K.drama.members[id];
    ok(d && str(d.epilogue), id + ': the shipped default stays (drama.members[id].epilogue)');
    const list = E.epilogues[id] || [];
    ok(list.length >= 1, id + ': at least one variant');
    list.forEach((v, i) => {
      const w = id + '#' + i;
      ok(v.when && Object.keys(v.when).length && Object.keys(v.when).every(k => WHEN_KEYS.includes(k)), w + ': WHEN keys');
      if (v.when.minTier) ok(C.ENDING_TIERS.includes(v.when.minTier), w + ': minTier');
      if (v.when.special) ok(C.SPECIAL_ENDINGS.includes(v.when.special), w + ': special');
      ok(!('seatRole' in v.when), w + ': no seatRole variants in v1.0 (v1.1 Seats adds them)');
      ok(str(v.text) && v.text !== d.epilogue, w + ': text');
    });
  });
  Object.keys(E.epilogues).forEach(id => ok(ORIGINALS.includes(id), 'epilogues.' + id + ' is an original'));
  const first = id => E.epilogues[id][0].when;
  eq(first('marcel'), { flag: 'cape', notValues: ['none'] }, 'Marcel: the cape shop');
  eq(first('dana'), { inLineup: true, minTier: 'cult_heroes' }, 'Dana: the solo finally ends');
  eq(first('jaxon'), { minTier: 'canadian_institution' }, 'Jaxon: Baba becomes the manager');
  eq(first('kenji'), { minTier: 'cult_heroes' }, 'Kenji: a new bass every Christmas (else the shipped blank postcard)');
  ok(/bass/.test(E.epilogues.kenji[0].text) && /Christmas/.test(E.epilogues.kenji[0].text) && /cape shop/i.test(E.epilogues.marcel[0].text), 'the A14 lines');
  ok(E.epilogues.rox.some(v => v.when.flag === 'council') && E.epilogues.lenny.some(v => v.when.flag === 'riff') && E.epilogues.travis.some(v => v.when.flag === 'truckStory'),
    'storyline variants: council (Rox), riff (Lenny), truckStory (Travis Lee)');
});

test('recruits (>= 2 per trait, 1 per quirk, 4 generic), defectors (any + per rival), player card per tier (drums), rival lines', () => {
  K.recruits.traits.forEach(t => ok((E.recruits.byTrait[t.id] || []).filter(x => str(x)).length >= 2, 'trait ' + t.id + ' >= 2'));
  K.recruits.quirks.forEach(q => ok((E.recruits.byQuirk[q.id] || []).filter(x => str(x)).length >= 1, 'quirk ' + q.id + ' >= 1'));
  Object.keys(E.recruits.byTrait).forEach(k => ok(K.recruits.traits.some(t => t.id === k), 'byTrait.' + k + ' is a trait'));
  Object.keys(E.recruits.byQuirk).forEach(k => ok(K.recruits.quirks.some(q => q.id === k), 'byQuirk.' + k + ' is a quirk'));
  ok(E.recruits.any.length >= 4 && E.recruits.any.every(x => str(x)), '4 generic');
  ok(E.defectors.any.length >= 2 && E.defectors.any.every(x => /\{rival\}/.test(x)), 'defectors name {rival}');
  BAND_IDS.forEach(b => ok((E.defectors.byRival[BANDS[b].rival] || []).length >= 1, b + ': its rival\'s defector lines'));
  eq(Object.keys(E.player), ['drums'], 'player cards keyed by seat (drums only in v1.0)');
  eq(Object.keys(E.player.drums).sort(), C.ENDING_TIERS.slice().sort(), 'a player card for every tier');
  ['you', 'rival', 'none'].forEach(k => ok(E.rival[k].length >= 1 && E.rival[k].every(x => str(x)), 'rival.' + k));
  BAND_IDS.forEach(b => ok(E.rival.byRival[BANDS[b].rival], b + ': rival.byRival.' + BANDS[b].rival));
});

test('bonus years: milestone + chat lines for +2 and +3, per band; 4-6 bonus cards per band (World era, year 11 on)', () => {
  [2, 3].forEach(y => ok(E.bonus.milestone[y].length && E.bonus.chat[y].length, 'generic +' + y));
  BAND_IDS.forEach(b => {
    const bb = E.bonus.byBand[b];
    ok(bb && [2, 3].every(y => bb.chat[y] && bb.chat[y].length && bb.chat[y].every(x => str(x, LIMIT.chat))), b + ': chat lines for +2 and +3 (<= 120)');
    const n = E.bonusCards.filter(c => c.gate.band.length === 1 && c.gate.band[0] === b).length;
    ok(n >= 4 && n <= 6, b + ': ' + n + ' bonus cards');
  });
});

test('bonus cards: Monday-card shape, ids unique, speakers of the band (Kenji never), gates (World, year 11+, band + genre), effects + magnitudes', () => {
  const MAG = { fund: [-1500, 1200], fans: [0, 400], buzz: [2, 18, 1], chemistry: [2, 10, 1], burnout: [3, 20, 1], mood: [3, 20, 1], skill: [1, 4] };
  const ids = new Set(K.cards.map(c => c.id));
  E.bonusCards.forEach(c => {
    const w = 'bonus card ' + c.id, b = c.gate.band[0], talkers = BANDS[b].members.filter(m => !m.silent).map(m => m.id);
    ok(/^bonus_[a-z_]+_\d$/.test(c.id) && !ids.has(c.id), w + ': id unique'); ids.add(c.id);
    ok(C.CARD_TYPES.includes(c.type), w + ': type');
    ok((C.ROLE_ALIASES.includes(c.speaker) && !(b === 'hail_damage' && ['@deadpan', '@bassist'].includes(c.speaker))) || talkers.includes(c.speaker), w + ': speaker ' + c.speaker);
    ok(str(c.title, LIMIT.title) && str(c.text, LIMIT.text), w + ': title / text lengths');
    eq(c.gate, { era: ['world'], genre: [BANDS[b].genre], band: [b], minYear: 11 }, w + ': gate');
    ok(c.choices.length >= 2 && c.choices.length <= 3 && new Set(c.choices.map(x => x.label)).size === c.choices.length, w + ': 2-3 distinct choices');
    c.choices.forEach((ch, i) => {
      ok(str(ch.label, LIMIT.label) && str(ch.outcome, LIMIT.outcome) && (!ch.hint || str(ch.hint, LIMIT.hint)), w + '#' + i + ': lengths');
      Object.keys(ch.effects || {}).forEach(k => {
        ok(C.EFFECT_KEYS.includes(k), w + '#' + i + ': effect ' + k);
        const m = MAG[k], v = ch.effects[k];
        if (!m) return;
        const vals = typeof v === 'object' ? Object.entries(v).map(([id, x]) => { ok(id === 'all' || C.ROLE_ALIASES.includes(id) || MEMBERS(b).includes(id), w + ': ' + k + ' key ' + id); return x; }) : [v];
        vals.forEach(x => { const a = m[2] ? Math.abs(x) : x; ok(Number.isInteger(x) && a >= m[0] && a <= m[1], w + '#' + i + ': ' + k + ' ' + x + ' in the World-era range'); });
      });
    });
  });
});

test('text: only the career tokens (no {n}), no USA, parody names only, no gong but the Global Gong, no share/screenshot talk', () => {
  const all = strings(E, 'endings'), bad = [];
  const TOK = ['player', 'band', 'city', 'recruit', 'rival'].concat(C.TOKENS);
  all.forEach(([p, s]) => {
    const re = /\{([^}]*)\}/g; let m;
    while ((m = re.exec(s))) { const parts = m[1].split(':'); if (!(TOK.includes(m[1]) || (parts.length === 2 && ['name', 'nick'].includes(parts[0]) && ORIGINALS.includes(parts[1])))) bad.push(p + ': {' + m[1] + '}'); }
    if (/[{}]/.test(s.replace(/\{[^{}]*\}/g, ''))) bad.push(p + ': stray brace');
  });
  eq(bad, [], 'tokens');
  const usa = /\b(USA|U\.S\.|America|Americans?|United States|the States|Texas|Nashville|Las Vegas|Vegas|New York|California|Hollywood|Chicago|Seattle|Detroit|Minneapolis|Fargo|Walmart|Costco|Starbucks|McDonald'?s?|Fender|Gibson|Tim Hortons|Canadian Tire|Facebook|Instagram|TikTok|YouTube|Twitter)\b/;
  eq(all.filter(([, s]) => usa.test(s)).map(([p, s]) => p + ': ' + s.match(usa)[0]), [], 'no USA / real brands');
  eq(all.filter(([, s]) => /gong/i.test(s.replace(/Global Gong/g, ''))).map(([p]) => p), [], 'no gong (the Global Gong award may be named)');
  eq(all.filter(([, s]) => /\b(share|screenshot|download)\b/i.test(s)).map(([p]) => p), [], 'no share / screenshot / download');
});

test('per band: no other band\'s people, band or rival names in the text its career can show', () => {
  BAND_IDS.forEach(b => {
    const re = new RegExp('\\b(' + foreignNames(b).map(esc).join('|') + ')\\b');
    const hits = bandText(b).filter(s => re.test(s)).map(s => s.match(re)[0] + ' in "' + s.slice(0, 60) + '"');
    eq(hits, [], b + ' leaks');
  });
});

// ---- The Monday deck over 312 weeks (tests/content_bands.test.js's walk: garage -> Local at 250 fans -> Signed at week 64) ----
function gatePasses(gate, s) {
  if (!gate) return true;
  const inList = (list, v) => !list || list.includes(v), range = (lo, hi, v) => (lo == null || v >= lo) && (hi == null || v <= hi);
  if (!inList(gate.era, s.era) || !inList(gate.genre, s.genre) || !inList(gate.region, s.region) || !inList(gate.band, s.bandId)) return false;
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
function applyRouting(fx, s) {
  if (!fx) return;
  if (fx.flags) for (const f in fx.flags) { if (fx.flags[f] === false) delete s.flags[f]; else s.flags[f] = fx.flags[f]; }
  if (fx.chain) for (const c in fx.chain) s.chains[c] = { step: fx.chain[c].step, due: s.totalWeek + (fx.chain[c].delay || 1) };
}
function drawCareer(b, label, seed, cards, opts) {
  opts = opts || {};
  const rng = GG.RNG(seed), B = BANDS[b];
  const s = { era: 'garage', genre: B.genre, region: 'canada', bandId: b, fund: 300, buzz: 20, chemistry: 50, gig: null,
    flags: {}, chains: {}, seen: {}, members: B.members.map(m => ({ id: m.id, mood: m.mood })) };
  const eligible = c => {
    if (c.forceWeek) return false;
    if (c.chain && (c.step !== 1 || s.chains[c.chain])) return false;
    const last = s.seen[c.id];
    if (last != null && (c.once !== false || s.totalWeek - last < (c.cooldown || 0))) return false;
    return gatePasses(c.gate, s);
  };
  const out = { dry: [], year1: new Set(), counts: {}, late: new Set(), byEra: { garage: new Set(), local: new Set(), signed: new Set(), world: new Set() } };
  for (let w = 1; w <= 13 * C.WEEKS_PER_YEAR; w++) {
    s.totalWeek = w; s.year = Math.ceil(w / C.WEEKS_PER_YEAR); s.week = (w - 1) % C.WEEKS_PER_YEAR + 1;
    s.fans = w <= 24 ? 12 + w * 12 : w <= 64 ? 300 + (w - 24) * 10 : 700 + (w - 64) * 40;
    if (s.era === 'garage' && s.fans >= 250) s.era = 'local';
    if (w === 64) { s.era = 'signed'; s.flags.label = label; }
    if (opts.world && w === opts.world) s.era = 'world';
    if (w === 40) s.flags.parentsLoan = true;
    if (w === 100) delete s.flags.parentsLoan;
    if (w % 30 === 0) s.members[w / 30 % s.members.length].mood = 30; else if (w % 30 === 5) s.members.forEach(m => { m.mood = 60; });
    let pool = cards.filter(c => c.forceWeek === w && s.seen[c.id] == null && gatePasses(c.gate, s));
    if (!pool.length) pool = cards.filter(c => c.chain && s.chains[c.chain] && s.chains[c.chain].step === c.step && s.chains[c.chain].due <= w && gatePasses(c.gate, s));
    if (!pool.length) pool = cards.filter(eligible);
    if (!pool.length) { out.dry.push(s.era + '@' + w); continue; }
    const card = rng.weighted(pool, c => c.weight || 1), ch = rng.pick(card.choices);
    s.seen[card.id] = w; out.counts[card.id] = (out.counts[card.id] || 0) + 1; out.byEra[s.era].add(card.id);
    if (s.year === 1) out.year1.add(card.id);
    if (w > 240) out.late.add(card.id);
    applyRouting(ch.effects, s);
    if (ch.roll) applyRouting(rng.chance(0.5) ? ch.roll.success.effects : ch.roll.fail.effects, s);
  }
  return out;
}
function drawProblems(b, cards) {
  const bad = [];
  C.LABELS.forEach((label, i) => {
    const r = drawCareer(b, label, 20260930 + i, cards), w = label + ': ';
    if (r.dry.length) bad.push(w + 'weeks with no Monday card: ' + r.dry.slice(0, 8).join(' '));
    if (r.year1.size < 18) bad.push(w + 'year one shows ' + r.year1.size + ' different cards (<18)');
    if (r.byEra.local.size < 12) bad.push(w + 'Local Heroes shows ' + r.byEra.local.size + ' (<12)');
    if (r.byEra.signed.size < 20) bad.push(w + 'Signed shows ' + r.byEra.signed.size + ' (<20)');
    if (r.late.size < 12) bad.push(w + 'years 11-13 show ' + r.late.size + ' different cards (<12)');
    const most = Object.entries(r.counts).sort((x, y) => y[1] - x[1])[0];
    if (most && most[1] > 30) bad.push(w + most[0] + ' repeats ' + most[1] + ' times');
  });
  return bad;
}
const DECK = K.cards.concat(E.bonusCards);   // the deck a bonus-year career draws from (GG.legacy.deck adds the bonus cards)
BAND_IDS.forEach(b => test(b + ': a seeded 312-week draw never runs dry and stays varied (each label)', () => eq(drawProblems(b, DECK), [], b + ' draw')));
test('every band\'s bonus cards come up in a World-era career\'s years 11-13 (and never before year 11)', () => {
  BAND_IDS.forEach(b => {
    const r = drawCareer(b, 'monolith', 777, DECK, { world: 110 }), own = E.bonusCards.filter(c => c.gate.band[0] === b).map(c => c.id);
    ok(own.every(id => r.late.has(id)), b + ': ' + own.filter(id => !r.late.has(id)).join(' ') + ' never drawn in years 11-13');
    ok(own.every(id => !r.byEra.signed.has(id)) && Object.keys(r.counts).filter(id => id.startsWith('bonus_')).every(id => own.includes(id)), b + ': only its own, only in the bonus years');
  });
});

done('content_endings');
