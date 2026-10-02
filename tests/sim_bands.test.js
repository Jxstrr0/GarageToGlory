// v0.9 "Genres" (plan_contract_0.9 §5 B acceptance): every band plays. The §4.2/4.3 helpers (tokens, pool, variant,
// speakerOk, talkers, roleOf, role aliases), then per band 3 seeds x 3 years x (avg, good) bot careers: no exceptions,
// invariants, the band's own driver / van / space / city / first gig (week-1 km <= 60), a band-gated week-one card, a save
// that round-trips, loans that can be repaid, an original who comes back, and a LEAK SCAN over every piece of
// player-visible text the sims produce (chat, cards, outcomes, wraps, news, comments, recaps, reviews, awards, licensing,
// road cards). Strict since the v0.9 integration: Hail Damage names in another band's career, another new band's names
// in a new band's career (Q8 cameo cards with cameo: true excepted) and other bands' names in a Hail Damage career all
// fail; missing rival lineups fail too. LEAK_STRICT=0 turns the non-Hail-Damage checks back into warnings.
const load = require('./_load');
const { test, ok, eq, done } = require('./_t');

const GG = load({ localStorage: load.fakeStorage() });
const C = GG.contracts, K = GG.content, WPY = C.WEEKS_PER_YEAR;
const LEAK_STRICT = true;   // v0.9 integration: Lane A's content has merged; LEAK_STRICT=0 reports leaks as warnings instead
const STRICT = process.env.LEAK_STRICT === '0' ? false : LEAK_STRICT || !!process.env.LEAK_STRICT;
const BANDS = Object.keys(K.bands);
const LEAK_YEARS = Math.max(1, parseInt(process.env.LEAK_YEARS, 10) || 3);   // LEAK_YEARS=10: a full-career scan (slow)
// (fixer: + Cousin Dale / Dale from Warman / Hwy 11 / the Moose Opera; not bare 'Warman': the Warman Curling Rink Lounge is
// a shared venue other bands play)
const HD_LEAK = /Marcel|Dana|Jaxon|Kenji|Baba|Lord Abyssus|Moose Hearse|Tundra Wraith|Gord|Grimnir|HALE DAMAGE|Cousin Dale|Dale from Warman|Hwy 11|Moose Opera/;
// A band's world beyond its members (fixer): its home superfan, tier-0 van, space, and its rival's cast (cast nicknames that
// are plain words are left out: Dusty, Colt, Boot, The Jaw ...).
// (Lorne: the Ramblers' coffee row has its own Lorne; Tundra Wraith's is caught as Lorne Dueck / Frostgrave)
const PLAIN = ['Dusty', 'Colt', 'Boot', 'Buckle', 'Unplugged', 'The Solo', 'The Board', 'The Jaw', 'Steve', 'Dex', 'Rex', 'Lorne'];
function worldOf(id) {
  const b = K.bands[id], out = [], hs = (K.bandbook.homeSuperfan || {})[id], cast = ((K.rivalry || {}).cast || {})[b.rival] || {};
  if (hs && id !== 'hail_damage') out.push(hs.short || String(hs.name).split(' ')[0], hs.name);
  if (GG.shop && GG.shop.vanName && id !== 'hail_damage') out.push(GG.shop.vanName(id, 0));
  if (id !== 'hail_damage') out.push(b.spaceName);
  (cast.members || []).forEach(m => [m.name, m.fullName, m.nick].forEach(w => { if (w && w.length > 2 && PLAIN.indexOf(w) < 0) out.push(w); }));
  return out;
}
// Other bands' own names (members, bands, rivals, + their world) in a Hail Damage career. Short member names use word boundaries.
function otherNames() {
  const names = [];
  BANDS.filter(id => id !== 'hail_damage').forEach(id => {
    const b = K.bands[id];
    names.push(b.name);
    b.members.forEach(m => { names.push(m.name); if (m.fullName) names.push(m.fullName); });
    const r = K.rivals[b.rival]; if (r) names.push(r.name);
    names.push(...worldOf(id));
  });
  return names.filter(Boolean);
}
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const INVERSE = new RegExp('\\b(' + otherNames().map(esc).join('|') + ')\\b');
// v0.9 strict: in a non-Hail-Damage career, the other two new bands' names (members, band, rival) never show up either
// (Q8 cameo sources excepted).
function crossNames(id) {
  const names = [];
  BANDS.filter(x => x !== id && x !== 'hail_damage').forEach(x => {
    const b = K.bands[x];
    names.push(b.name);
    b.members.forEach(m => { names.push(m.name); if (m.fullName) names.push(m.fullName); });
    const r = K.rivals[b.rival]; if (r) names.push(r.name);
    names.push(...worldOf(x));
  });
  return names.concat(worldOf('hail_damage')).filter(Boolean);   // (+ Tundra Wraith's accountants: HD_LEAK has Gord)
}
const CROSS = {};
BANDS.filter(id => id !== 'hail_damage').forEach(id => { CROSS[id] = new RegExp('\\b(' + crossNames(id).map(esc).join('|') + ')\\b'); });
const warnings = [];
function warn(msg) { if (warnings.length < 400 && warnings.indexOf(msg) < 0) warnings.push(msg); }

/* ---- the §4.2 / §4.3 helpers ------------------------------------------------------------------------------------- */
test('helpers: talkers, roleOf, role aliases, tokens per band', () => {
  const expect = {
    hail_damage: { front: 'marcel', soloist: 'dana', filler: 'jaxon', bassist: 'kenji', namer: 'marcel', grumbler: 'marcel', deadpan: 'kenji', driver: 'kenji' },
    frost_heave: { front: 'rox', soloist: 'benny', filler: 'moth', bassist: 'moth', namer: 'rox', grumbler: 'benny', deadpan: 'moth', driver: 'moth' },
    gravel_kings: { front: 'chase', soloist: 'lenny', filler: 'tamara', bassist: 'tamara', namer: 'chase', grumbler: 'chase', deadpan: 'tamara', driver: 'tamara' },
    grid_road_ramblers: { front: 'travis', soloist: 'earl', filler: 'clementine', bassist: 'duke', namer: 'travis', grumbler: 'earl', deadpan: 'clementine', driver: 'earl' }
  };
  BANDS.forEach(id => {
    const s = GG.career.newCareer({ seed: 11, bandId: id });
    const tk = GG.career.talkers(s).map(m => m.id);
    ok(tk.length === s.members.length - (id === 'hail_damage' ? 1 : 0) && (id !== 'hail_damage' || tk.indexOf('kenji') < 0), id + ' talkers ' + tk);
    const E = expect[id];
    Object.keys(E).forEach(r => eq(GG.career.roleOf(s, '@' + r), E[r], id + ' @' + r));
    ok(tk.indexOf(GG.career.roleOf(s, '@any')) >= 0, id + ' @any is a talker');
    eq(GG.career.roleOf(s, '@any'), GG.career.roleOf(s, 'any'), 'the week pick is stable');
    const b = K.bands[id];
    const t = GG.career.fillText(s, '{front}|{soloist}|{bassist}|{namer}|{grumbler}|{space}|{spaceName}|{door}|{province}|{van}|{driver}|{city}|{rival}|{band}');
    eq(t.split('|'), [E.front, E.soloist, E.bassist, E.namer, E.grumbler].map(x => GG.career.memberName(s, x))
      .concat([b.spaceShort, b.spaceName, b.door, b.province, s.van.name, GG.career.memberName(s, E.driver), b.city, K.rivals[b.rival].name, b.name]), id + ' tokens');
    ok(!/\{/.test(GG.career.fillText(s, '{homeVenue} {superfan} {rivalFront} {deadpan} {filler}')), id + ' every token resolves');
    // the {deadpan} fallback, and nobody at all for an alias whose member is gone
    const d = s.members.find(m => m.id === E.deadpan); d.status = 'quit';
    const dp = GG.career.roleOf(s, '@deadpan');
    ok(dp && dp !== E.deadpan && tk.indexOf(dp) >= 0 && dp !== GG.career.roleOf(s, '@front'), id + ' deadpan falls back to another talker: ' + dp);
    s.members.forEach(m => { if (/bass/.test(m.role)) m.status = 'quit'; });
    eq(GG.career.roleOf(s, '@bassist'), null, id + ' no bassist');
    eq(GG.career.fillText(s, '{bassist}'), 'the bassist', id + ' bassist fallback');
  });
  const s0 = GG.career.newCareer({ seed: 1 });
  eq(GG.career.fillText({}, '{city}|{rival}|{front}|{driver}'), 'town|the other band|the singer|you', 'fallbacks without a career');
  eq(GG.career.fillText(s0, '{name:marcel} {nick:kenji} {player}'), 'Marcel Blackbird You', 'old tokens unchanged');
  const tl = GG.career.newCareer({ seed: 1, bandId: 'grid_road_ramblers' });
  eq(GG.career.memberName(tl, 'travis'), 'Travis Lee', 'a two-word short name stays whole');
});

test('helpers: role aliases in effects, chat, member; card roles at draw time', () => {
  const s = GG.career.newCareer({ seed: 5, bandId: 'frost_heave' });
  const d = GG.career.applyEffects(s, { mood: { '@front': 5, '@soloist': -3, '@bassist': 2 }, skill: { '@filler': 1 },
    chat: { who: '@grumbler', text: '{grumbler} here. {front} is loud.' } }, {});
  ok(d.mood.rox === 5 && d.mood.benny === -3 && d.mood.moth === 2 && d.skill.moth === 1, 'mood/skill aliases ' + JSON.stringify(d));
  eq(d.chat.length, 1); eq(d.chat[0].who, 'benny'); eq(d.chat[0].text, 'Benny here. Rox is loud.');
  s.members.forEach(m => { m.stage = 3; });
  s.protected = false;
  GG.career.applyEffects(s, { member: { id: '@soloist', act: 'settle' } }, {});
  eq(s.members.find(m => m.id === 'benny').stage, 2, 'member alias');
  eq(GG.career.effectSummary({ mood: { '@front': 9 } }, s), 'Rox ↑↑');
  const card = { id: 'x_alias', speaker: '@deadpan', title: 't', text: '{deadpan}', choices: [{ label: 'a', effects: { mood: { '@any': 1 } }, outcome: 'o' }] };
  const roles = GG.career.cardRoles(s, card);
  eq(Object.keys(roles).sort(), ['@any', '@deadpan']); eq(roles['@deadpan'], 'moth');
  ok(GG.career.speakerOk(s, '@deadpan') && GG.career.speakerOk(s, '@driver'), 'aliases are fine speakers');
});

test('helpers: speakerOk guards other bands, other rivals, scoped npcs; postChat drops a foreign speaker', () => {
  const fh = GG.career.newCareer({ seed: 3, bandId: 'frost_heave' }), hd = GG.career.newCareer({ seed: 3 });
  ['rox', 'mom', 'dj', 'recruit', 'player', null, '@front', 'fill_bass'].forEach(w => ok(GG.career.speakerOk(fh, w), 'fh ok: ' + w));
  ['marcel', 'kenji', 'baba', 'gord', 'wraith_frontman', 'dale_warman', 'travis', 'nobody_at_all'].forEach(w => ok(!GG.career.speakerOk(fh, w), 'fh not: ' + w));
  ['marcel', 'baba', 'gord', 'wraith_frontman', 'dale_warman'].forEach(w => ok(GG.career.speakerOk(hd, w), 'hd ok: ' + w));
  ['rox', 'earl'].forEach(w => ok(!GG.career.speakerOk(hd, w), 'hd not: ' + w));
  const tw = K.rivalry.cast.tundra_wraith;
  if (tw && tw.members && tw.members[0]) { ok(GG.career.speakerOk(hd, tw.members[0].id) && !GG.career.speakerOk(fh, tw.members[0].id), 'cast ids belong to their rival'); }
  const n = fh.chat.length;
  eq(GG.career.postChat(fh, 'marcel', 'Bonjour', null), null); eq(fh.chat.length, n, 'nothing posted');
  ok(GG.career.postChat(fh, '@front', 'Council!', null).who === 'rox', 'alias posts as the member');
});

test('helpers: pool (flat + byBand), variant (band > rival > base, gate + speaker)', () => {
  const s = GG.career.newCareer({ seed: 9, bandId: 'gravel_kings' });
  const obj = { a: ['x'], o: { 1: 'one', 2: 'two' }, str: 'flat', byBand: { gravel_kings: { a: ['y'], o: { 2: 'TWO' }, str: 'band', deep: { k: ['z'] } } } };
  eq(GG.career.pool(s, obj, 'a'), ['x', 'y']); eq(GG.career.pool(s, obj, 'o'), { 1: 'one', 2: 'TWO' });
  eq(GG.career.pool(s, obj, 'str'), 'band'); eq(GG.career.pool(s, obj, 'deep.k'), ['z']); eq(GG.career.pool(s, obj, ['deep', 'k']), ['z']);
  eq(GG.career.pool(GG.career.newCareer({ seed: 9 }), obj, 'a'), ['x'], 'another band: flat only');
  const saved = K.shopCards.slice(), hd = GG.career.newCareer({ seed: 9 });
  hd.era = 'local';   // the real shop_solo: Hail Damage, Local Heroes on
  K.shopCards.push({ id: 'shop_solo_gravel_kings', speaker: 'lenny', gate: { band: ['gravel_kings'] }, choices: [] });
  K.rivalry.cards.push({ id: 'rv_poach_chartbusters', speaker: '@front', choices: [] });
  try {
    eq(GG.career.variant(s, 'shop_solo').id, 'shop_solo_gravel_kings', 'band variant first');
    eq(GG.career.variant(hd, 'shop_solo').id, 'shop_solo', 'base for its own band');
    eq(GG.career.variant(GG.career.newCareer({ seed: 9, bandId: 'frost_heave' }), 'shop_solo'), null, 'fails closed');
    eq(GG.career.variant(s, 'rv_poach').id, 'rv_poach_chartbusters', 'rival variant for rv_*');
    ok(GG.career.isVariantId('shop_solo_gravel_kings') && !GG.career.isVariantId('shop_solo'), 'variant ids never join the Monday draw');
  } finally { K.shopCards.length = 0; saved.forEach(c => K.shopCards.push(c)); K.rivalry.cards.pop(); }
});

test('helpers: cardOk (speaker + effects aimed at another band), Q8 cameo cards, pool byGenre layer', () => {
  const fh = GG.career.newCareer({ seed: 8, bandId: 'frost_heave' }), hd = GG.career.newCareer({ seed: 8 });
  const mk = (id, fx, extra) => Object.assign({ id: id, title: 't', text: 'x', choices: [{ label: 'a', effects: fx, outcome: 'o' }] }, extra || {});
  const marcelMood = mk('t_marcel_mood', { mood: { marcel: 3 } }), roxMood = mk('t_rox_mood', { mood: { rox: 3 } });
  const rollKenji = mk('t_roll', { fund: 5 }); rollKenji.choices[0].roll = { chance: 0.5, success: { effects: { skill: { kenji: 1 } } }, fail: { effects: {} } };
  const chatDana = mk('t_chat', { chat: { who: 'dana', text: 'hi' } }), memberJ = mk('t_member', { member: { id: 'jaxon', act: 'settle' } });
  ok(!GG.career.cardOk(fh, marcelMood) && GG.career.cardOk(hd, marcelMood), 'a card that moves Marcel is Hail Damage\'s');
  ok(GG.career.cardOk(fh, roxMood) && !GG.career.cardOk(hd, roxMood), 'and the inverse');
  ok(!GG.career.cardOk(fh, rollKenji) && !GG.career.cardOk(fh, chatDana) && !GG.career.cardOk(fh, memberJ), 'roll branches, chat speakers, member ids');
  ok(GG.career.cardOk(fh, mk('t_alias', { mood: { '@front': 2, all: 1 }, member: { id: 'recruit', act: 'settle' } })), 'aliases, all, recruit are fine');
  ok(!GG.career.cardOk(fh, mk('t_sp', {}, { speaker: 'marcel' })), 'the speaker guard is part of it');
  ok(GG.career.cardOk(fh, mk('t_cameo', { mood: { marcel: 1 } }, { speaker: 'marcel', cameo: true })), 'a Q8 cameo card passes');
  const obj = { a: ['x'], byGenre: { punk: { a: ['g'] } }, byBand: { frost_heave: { a: ['b'] } } };
  eq(GG.career.pool(fh, obj, 'a'), ['x', 'g', 'b'], 'flat + genre + band');
  eq(GG.career.pool(hd, obj, 'a'), ['x'], 'metal: flat only');
  const nested = { lines: { depart: { japan: ['flat'] }, byBand: { frost_heave: { depart: { japan: ['mid'] } } } }, byBand: { frost_heave: { lines: { depart: { japan: ['top'] } } } } };
  eq(GG.career.pool(fh, nested, ['lines', 'depart', 'japan']), ['flat', 'top', 'mid'], 'byBand at any level along the path');
  const news = { news: { 3: { who: 'dj', text: 'flat' }, 4: { who: 'dj', text: 'four' }, byBand: { frost_heave: { 3: { who: 'rox', text: 'band' } } } } };
  eq(GG.career.pool(fh, news, 'news'), { 3: { who: 'rox', text: 'band' }, 4: { who: 'dj', text: 'four' } }, 'the pool object\'s own byBand (news by week)');
  eq(GG.career.pool(hd, news, 'news'), { 3: { who: 'dj', text: 'flat' }, 4: { who: 'dj', text: 'four' } }, 'meta keys stripped');
});

test('content keying reads (§4.1): shop spaces byCity (Q7) + upgrades bySpace, bandbook pools and gates, goodYear voices, holiday byBand', () => {
  const S = GG.shop, K2 = K.shop, fh = GG.career.newCareer({ seed: 12, bandId: 'frost_heave' }), hd = GG.career.newCareer({ seed: 12 });
  const sp1 = K2.spaces.find(x => x.tier === 1), up0 = K2.upgrades.find(x => x.tier === 0);
  const keep = { by: sp1.byCity, ub: up0.bySpace };
  try {
    sp1.byCity = Object.assign({}, sp1.byCity || {}, { Regina: { name: 'The Rink Annex', blurb: 'Behind the Brandt Centre.' } });
    up0.bySpace = Object.assign({}, up0.bySpace || {}, { laundromat_basement: { name: 'The pop machine', blurb: 'Coins only.' } });
    eq([S.spaceDef(fh, 1).name, S.spaceDef(fh, 1).blurb], ['The Rink Annex', 'Behind the Brandt Centre.'], 'Regina gets its own room name');
    eq(S.spaceDef(hd, 1).name, keep.by && keep.by.Saskatoon ? keep.by.Saskatoon.name : K2.spaces.find(x => x.tier === 1).name, 'Saskatoon keeps its own');
    eq(S.spaceDef(fh, 0).name, K.bands.frost_heave.spaceName, 'tier 0 is the band\'s own space');
    eq(S.upgrades(fh).find(u => u.id === up0.id).name, 'The pop machine', 'tier-0 upgrade per start space');
    eq(S.upgrades(hd).find(u => u.id === up0.id).name, keep.ub && keep.ub.parents_garage ? keep.ub.parents_garage.name : up0.name, 'the garage keeps its fridge');
  } finally { sp1.byCity = keep.by; up0.bySpace = keep.ub; if (keep.by === undefined) delete sp1.byCity; if (keep.ub === undefined) delete up0.bySpace; }
  // bandbook: posts + byBand, mail/gifts with band gates
  const B = K.bandbook, bb0 = B.byBand;
  try {
    B.byBand = Object.assign({}, bb0 || {}, { frost_heave: { posts: { meme: ['FH_ONLY_POST'] }, mail: [{ id: 'fh_mail', from: 'x', text: 'FH mail' }] } });
    const P = GG.fans.pool;
    ok(P(fh, ['posts', 'meme'], []).indexOf('FH_ONLY_POST') >= 0 && P(hd, ['posts', 'meme'], []).indexOf('FH_ONLY_POST') < 0, 'posts + byBand');
    ok(P(fh, ['mail'], []).some(m => m.id === 'fh_mail') && !P(hd, ['mail'], []).some(m => m.id === 'fh_mail'), 'mail + byBand');
    const gated = [{ id: 'g1', gate: { band: ['hail_damage'] } }, { id: 'g2', band: ['frost_heave'] }, { id: 'g3' }];
    B.byBand.frost_heave.gifts = gated;
    eq(P(fh, ['gifts'], []).filter(g => /^g\d$/.test(g.id)).map(g => g.id), ['g2', 'g3'], 'gift gates (gate or band)');
  } finally { if (bb0 === undefined) delete B.byBand; else B.byBand = bb0; }
  // recap goodYear: a line voiced only by another band's members is theirs
  const rec = { y: 1, fans: 100, songs: 3, gigs: 4, loans: 0, chem: 60 };
  const gy = GG.recap.goodYear(fh, rec);
  ok(gy.every(g => GG.career.speakerOk(fh, g.who)), 'every goodYear speaker belongs here: ' + gy.map(g => g.who));
  ok(!gy.some(g => /Baba|Marcel|Kenji|Dana|Jaxon/.test(g.text)), 'no Hail Damage voices: ' + gy.map(g => g.text).join(' | '));
  eq(GG.recap.goodYear(hd, rec).length, GG.recap.goodYearList(hd).length, 'Hail Damage keeps all of its lines');
});

test('home rings (Q1): the home ring is open from day one; other rings from Local Heroes; far = outside home', () => {
  const W = GG.world, rings = W.rings().map(r => r.id);
  BANDS.forEach(id => {
    const s = GG.career.newCareer({ seed: 2, bandId: id }), home = W.homeRing(s), b = K.bands[id];
    ok(rings.indexOf(home) >= 0, id + ' home ring exists: ' + home);
    eq(home, rings.indexOf(b.homeRing) >= 0 ? b.homeRing : W.ring(W.home(s)), id + ' home ring (band.homeRing, else the home city\'s ring)');
    ok(W.ringOpen(s, home) && W.cityOpen(s, s.city), id + ' home open in the garage era');
    const thin = W.homeRooms(s) < W.cfg().homeRooms.min;   // no rooms at home yet (map/venue content missing): garage rings open too
    if (thin) warn(id + ': home ring ' + home + ' has ' + W.homeRooms(s) + ' small rooms; the garage-era rings stay open');
    W.rings().forEach(r => {
      if (r.id === home) return;
      if (thin && (r.era || 'garage') === 'garage') ok(W.ringOpen(s, r.id), id + ' ' + r.id + ' open (thin home ring)');
      else ok(!W.ringOpen(s, r.id), id + ' ' + r.id + ' closed in the garage era');
    });
    s.era = 'local';
    W.rings().forEach(r => { if (r.id !== home && (r.era || 'garage') !== 'signed' && (r.era || 'garage') !== 'world') ok(W.ringOpen(s, r.id), id + ' ' + r.id + ' open at Local Heroes'); });
    eq(W.ringsFor(s)[0].id, home, id + ' ring order starts at home');
  });
});

test('home rings (Q1) with an Alberta ring on the map: Gravel Kings home = alberta, Saskatchewan + West at Local; others: Alberta at Local', () => {
  const W = GG.world, M = K.map, V = K.venues, ed = M.cities.edmonton, was = ed.ring;
  // The mock ring is injected only when the map has none (v0.9 content ships the real Alberta ring).
  const mock = !M.rings.some(r => r.id === 'alberta');
  const rooms = mock ? [0, 1, 2].map(i => ({ id: 't_ab_room' + i, name: 'Test Room ' + i, city: 'Edmonton', tier: 1, minFans: 0, capacity: 80, kind: 'bar', pay: 50, deal: 'door' })) : [];
  try {
    if (mock) { M.rings.push({ id: 'alberta', name: 'Alberta', era: 'local' }); ed.ring = 'alberta'; }
    rooms.forEach(v => V.push(v));
    const gk = GG.career.newCareer({ seed: 2, bandId: 'gravel_kings' }), hd = GG.career.newCareer({ seed: 2 });
    eq(W.homeRing(gk), 'alberta', 'band.homeRing');
    ok(W.homeRooms(gk) >= 3, 'rooms at home');
    ok(W.ringOpen(gk, 'alberta') && !W.ringOpen(gk, 'sask') && !W.ringOpen(gk, 'west'), 'garage era: Alberta only');
    eq(W.ringsFor(gk).map(r => r.id).slice(0, 3), ['alberta', 'sask', 'west'], 'home first, then the Local rings');
    gk.era = 'local';
    ok(W.ringOpen(gk, 'sask') && W.ringOpen(gk, 'west'), 'Local Heroes: Saskatchewan + the West');
    ok(W.ringOpen(hd, 'sask') && !W.ringOpen(hd, 'alberta'), 'Hail Damage: Alberta is closed in the garage era');
    hd.era = 'local'; ok(W.ringOpen(hd, 'alberta'), 'and opens at Local Heroes');
  } finally {
    if (mock) { M.rings.pop(); ed.ring = was; } rooms.forEach(() => V.pop());
  }
});

test('gig moments (§4.4) and band signatures', () => {
  const table = { metal: ['mosh', 'headbang', 'wallOfDeath'], punk: ['pogo', 'gangShout', 'circlePit'], rock: ['fistPump', 'singAlong', 'lighters'], country: ['clapAlong', 'yeehaw', 'lineDance'] };
  Object.keys(table).forEach(g => { const m = GG.gig.moments(g); eq([m.combo, m.chorus, m.peak], table[g], g); table[g].forEach(k => ok(C.MOMENTS.indexOf(k) >= 0, k + ' in C.MOMENTS')); });
  const sig = { frost_heave: 'stageDive', gravel_kings: 'kneeSlide', grid_road_ramblers: 'hatTip' };
  Object.keys(sig).forEach(id => {
    const s = GG.career.newCareer({ seed: 4, bandId: id });
    for (let i = 0; i < 6; i++) GG.career.botWeek(s, 'good');
    const v = K.venues.find(x => x.city === s.city && x.minFans < 99999) || K.venues[0];
    s.liveGig = null;
    const seen = [], acts = [], off1 = GG.on('crowd:moment', e => seen.push(e.kind)), off2 = GG.on('gig:band', e => acts.push(e.who + ':' + e.action));
    const r = GG.gig.botPlay(GG.gig.session(s, GG.gig.makeGig(s, v.id, 'book'), null, {}), { accuracy: 1 }, GG.RNG(1));
    off1(); off2();
    const who = GG.gig.signatures(s)[0];
    ok(who && who.action === sig[id], id + ' signature ' + JSON.stringify(who));
    eq(r.moments.filter(k => k === sig[id]).length, 1, id + ' once per gig');
    eq(acts.filter(a => a === who.id + ':' + sig[id]).length, 1, id + ' gig:band once');
    ok(seen.indexOf('mosh') < 0 || s.genre === 'metal', id + ' no metal mosh for ' + s.genre);
    ok(r.moments.indexOf(GG.gig.moments(s.genre).combo) >= 0, id + ' combo moment ' + r.moments);
  });
  const hd = GG.career.newCareer({ seed: 4 });
  eq(GG.gig.signatures(hd), [], 'no cape, no cape spin'); hd.flags.cape = 'velvet';
  eq(GG.gig.signatures(hd).map(x => x.action), ['capeSpin']);
});

test('rivals: fair-fight curves per rival, the kickflip, cast fallbacks, scene rows', () => {
  const R = GG.rival;
  BANDS.forEach(id => {
    const s = GG.career.newCareer({ seed: 6, bandId: id }), k = R.cfg(s), rid = K.bands[id].rival;
    ok(k.fansCurve[0] <= 50 && k.fansCurve[1] <= 460, id + ' underdog curve ' + k.fansCurve.slice(0, 2));
    const sd = R.showdown(s, 'botb');
    ok(sd.setlist.length === 3 && sd.setlist.every(x => x.title && !/Eternal Winter/.test(x.title) || rid === 'tundra_wraith'), id + ' setlist ' + sd.setlist.map(x => x.title));
    const G = K.genres[s.rival.genre], tempo = G && G.tempo;
    if (tempo) ok(sd.setlist.every(x => x.bpm >= tempo[0] && x.bpm <= tempo[1]), id + ' bpm from the rival genre');
    eq(sd.actions.map(a => a.action), rid === 'mall_rats' ? ['kickflip'] : [], id + ' actions');
    const rows = R.leaderboard(s);
    ok(!rows.some(r => !r.rival && !r.you && (r.rivalId === rid || r.name === s.rival.baseName)), id + ' the rival is listed once');
    ok(!rows.some(r => r.bandId === id), id + ' your own cameo row is skipped');
    if (!STRICT && !(s.rival.members || []).length) warn(id + ': rival ' + rid + ' has no lineup yet (cast content)');
    if (STRICT) ok((s.rival.members || []).length > 0, id + ' rival lineup');
    ok(s.rival.members.every(m => m.corpsePaint === (rid === 'tundra_wraith' ? m.corpsePaint : false)), id + ' corpse paint only when the cast says so');
  });
  const cb = GG.career.newCareer({ seed: 6, bandId: 'gravel_kings' });
  ok(R.cfg(cb).chartBias > 1 && cb.rival.legacy > 0 && R.cfg(cb).style === 'ballad', 'Chartbusters own the radio');
  ok(R.cfg(GG.career.newCareer({ seed: 6 })).chartBias === undefined, 'Tundra Wraith keeps the defaults');
});

/* ---- careers ------------------------------------------------------------------------------------------------- */
function invariants(s, tag) {
  C.STATS.forEach(k => { ok(isFinite(s[k]), tag + ' ' + k + ' finite'); const r = C.RANGES[k]; if (r) ok(s[k] >= r[0] && s[k] <= r[1], tag + ' ' + k + ' in range ' + s[k]); });
  s.members.forEach(m => C.MEMBER_STATS.forEach(k => { const r = C.RANGES[k]; ok(isFinite(m[k]) && m[k] >= r[0] && m[k] <= r[1], tag + ' ' + m.id + '.' + k); }));
  ok(s.fund >= 0, tag + ' fund >= 0 after the wrap: ' + s.fund);
}
// Every player-visible string a career produced, from events + the state at the end.
function collector(s) {
  const out = [], seenCard = {};
  function add(src, t) { if (t != null && t !== '') out.push({ src: src, t: String(t) }); }
  function card(src, c) {
    if (!c || seenCard[c.id + src]) return; seenCard[c.id + src] = 1;
    if (c.cameo) src = 'cameo:' + src;   // Q8 cross-band cameo cards may name another band (allow-listed below)
    add(src + ':' + c.id, GG.career.fillText(s, c.title)); add(src + ':' + c.id, GG.career.fillText(s, c.text));
    (c.choices || []).forEach(ch => { add(src + ':' + c.id, GG.career.fillText(s, ch.label)); add(src + ':' + c.id, GG.career.choiceHint(s, ch)); });
  }
  function strings(src, o, depth) {
    if (o == null || depth > 6) return;
    if (typeof o === 'string') { add(src, o); return; }
    if (Array.isArray(o)) { o.forEach(x => strings(src, x, depth + 1)); return; }
    if (typeof o === 'object') Object.keys(o).forEach(k => { if (k !== 'members' && k !== 'who' && k !== 'id' && k !== 'venueId' && k !== 'songId') strings(src + '.' + k, o[k], depth + 1); });
  }
  const offs = [
    GG.on('week:start', e => { if (e.card) card('monday', GG.career.cardById(e.card)); add('quiet', e.quiet); }),
    GG.on('card:resolved', e => { const c = GG.career.cardById(e.cardId); add((c && c.cameo ? 'cameo:' : '') + 'outcome:' + e.cardId, e.outcome); }),
    GG.on('week:wrap', e => strings('wrap', e.wrap, 0)),
    GG.on('gig:done', e => { strings('gig', { lines: e.result.lines, reactions: (e.result.reactions || []).map(r => r.text) }, 0); }),
    GG.on('song:written', e => strings('song', (e.reactions || []).map(r => r.text), 0)),
    GG.on('rival:news', e => add('rivalNews', e.text)),
    GG.on('road:resolved', e => { card('road', GG.world.roadCardById(e.cardId)); add('road:' + e.cardId, e.outcome); }),
    GG.on('fans:post', e => { add('post', e.post.text); (e.post.comments || []).forEach(c => { add('comment:' + c.who, c.name); add('comment:' + c.who, c.text); }); })
  ];
  return {
    out: out,
    finish: function () {
      offs.forEach(f => f());
      (s.chat || []).forEach(m => add('chat:' + m.who, m.text));
      // v1.0 Lane Q: the lessons, the achievement rows this band can see, and the ending (tier text + epilogues; computed
      // for a live career, the recorded one for an ended career)
      if (GG.lessons) GG.lessons.LESSONS.forEach(id => (GG.lessons.steps(s, id) || []).forEach(st => add('lesson:' + id, GG.career.fillText(s, st.text))));
      if (GG.achieve) GG.achieve.list(s).filter(a => !a.band || a.band.indexOf(s.bandId) >= 0).forEach(a => { add('ach:' + a.id, a.name); add('ach:' + a.id, a.blurb); });
      if (GG.legacy) {
        const lg = s.legacy && s.legacy.tier ? s.legacy : GG.legacy.compute(s);
        strings('ending', GG.legacy.text(s, lg), 0);
        (lg.epilogues || []).forEach(e => { add('epilogue:' + e.id, e.name); add('epilogue:' + e.id, e.text); });
      }
      (s.albums || []).forEach(a => (a.reviews || []).forEach(r => add('review', r.quote)));
      if (s.loonies) strings('loonies', (s.loonies.results || []).map(r => [r.thanks, r.rivalLine, r.bandLine]), 0);
      if (GG.labels) { card('speech', GG.labels.speechCard(s)); card('outfit', GG.labels.outfitCard(s)); }
      (s.recaps || []).forEach(r => { add('recap', r.headline); strings('recap', GG.recap.goodYear(s, r), 0); });
      (s.rival && s.rival.news || []).forEach(n => add('rivalNews', n.text));
      add('van', s.van && s.van.name);
      return out;
    }
  };
}
// Names bots gave recruits (random names can be anything, e.g. a recruit called Travis) and allowed Q8 cameo sources.
let recruitNames = [];
GG.on('recruit:hired', e => { if (e.member && e.member.name) recruitNames.push(e.member.name, String(e.member.name).split(' ')[0]); });
function scrub(s, text) {
  let t = text;
  recruitNames.concat((s.members || []).filter(m => !m.original).map(m => m.name)).forEach(n => { if (n) t = t.split(n).join('~'); });
  Object.keys(s.fillIns || {}).forEach(r => { const f = s.fillIns[r]; if (f && f.name) t = t.split(f.name).join('~'); });
  return t;
}
const CAMEO_SRC = /^(scene|cameo)/;
const results = {};
BANDS.forEach(id => {
  test('career: ' + id + ' (3 seeds x 3 years, avg + good)', () => {
    const b = K.bands[id], leaks = [];
    const firstGigVenue = GG.gig.venue(b.firstGig) ? b.firstGig : null;
    for (const style of ['avg', 'good']) {
      for (let seed = 1; seed <= 3; seed++) {
        const s = GG.career.newCareer({ seed: seed * 101 + 7, bandId: id, player: { name: 'Bot' } }), tag = id + '/' + style + '#' + seed;
        // start: band, city, space, van, driver, first gig
        eq([s.bandId, s.genre, s.city, s.space], [id, b.genre, b.city, b.space], tag + ' band fields');
        eq(s.van.name, GG.shop.vanName(id, 0), tag + ' van name');
        const drv = GG.world.driverFor(id);
        eq(GG.world.driver(s).id, drv || 'you', tag + ' driver');
        if (K.drivers[drv]) eq(K.drivers[drv].band, id, tag + ' the band\'s own driver');
        ok(s.gig, tag + ' a first gig');
        if (firstGigVenue) eq(s.gig.venueId, firstGigVenue, tag + ' band.firstGig');
        else warn(id + ': firstGig ' + b.firstGig + ' is not in venues yet; fallback ' + s.gig.venueId);
        ok((s.gig.km || 0) <= 60, tag + ' week-1 km ' + s.gig.km);
        const col = collector(s); recruitNames = [];
        let week1 = null;
        const off = GG.on('week:start', e => { if (e.totalWeek === 1) week1 = e.card; });
        for (let w = 0; w < LEAK_YEARS * WPY && !s.ended; w++) { GG.career.botWeek(s, style); invariants(s, tag + ' w' + s.totalWeek); }
        off();
        const c1 = week1 && GG.career.cardById(week1);
        if (c1 && c1.forceWeek === 1) ok(c1.gate && c1.gate.band && c1.gate.band.indexOf(id) >= 0, tag + ' the forced week-one card is band-gated: ' + c1.id);
        else if (id !== 'hail_damage') warn(id + ': no forced week-one card yet (drew ' + (week1 || 'nothing') + ')');
        // leaks
        col.finish().forEach(x => {
          if (CAMEO_SRC.test(x.src)) return;
          const t = scrub(s, x.t);
          if (id !== 'hail_damage' && HD_LEAK.test(t)) leaks.push(x.src + ': ' + t.slice(0, 140));
          if (id !== 'hail_damage' && CROSS[id].test(t)) leaks.push(x.src + ' [' + t.match(CROSS[id])[0] + ']: ' + t.slice(0, 140));
          if (id === 'hail_damage' && INVERSE.test(t)) leaks.push(x.src + ': ' + t.slice(0, 140));
        });
        // a save round-trips (slot + code)
        eq(GG.save.write('1', s), true, tag + ' saved');
        ok(JSON.stringify(GG.save.read('1')) === JSON.stringify(s), tag + ' read back identical');
        ok(JSON.stringify(GG.save.fromCode(GG.save.toCode(s))) === JSON.stringify(s), tag + ' save code round-trip');
        results[tag] = { fans: s.fans, fund: s.fund, loans: s.stats.parentsLoans, quits: s.stats.quits, returns: s.stats.returns, cards: s.stats.cards };
      }
    }
    const uniq = Array.from(new Set(leaks));
    if (id === 'hail_damage') ok(!uniq.length, 'another band leaked into a Hail Damage career:\n  ' + uniq.slice(0, 12).join('\n  '));
    else if (STRICT) ok(!uniq.length, id + ' leaks (Hail Damage or another band):\n  ' + uniq.slice(0, 30).join('\n  '));
    else if (uniq.length) warn(id + ': ' + uniq.length + ' Hail Damage leak(s), e.g. ' + uniq.slice(0, 3).join(' || '));
  });
});

test('loans can be repaid; an original comes back (every band)', () => {
  BANDS.forEach(id => {
    const s = GG.career.newCareer({ seed: 77, bandId: id });
    s.fund = 900; s.debtToParents = 300; s.flags.parentsLoan = true;
    const d = GG.career.applyEffects(s, { repay: 200 }, {});
    eq([d.repay, s.debtToParents], [200, 100], id + ' repay');
    GG.career.applyEffects(s, { repay: 500 }, {});
    ok(s.debtToParents === 0 && !s.flags.parentsLoan, id + ' paid off');
    const loose = g => { const o = Object.assign({}, g || {}); ['minWeek', 'maxWeek', 'weekOfYear', 'minFans', 'maxFans', 'minFund', 'maxFund', 'minYear', 'maxYear', 'era', 'gigBooked', 'moodBelow', 'moodAbove', 'minBuzz', 'maxBuzz', 'minChemistry', 'maxChemistry'].forEach(k => delete o[k]); return o; };
    const repayCards = (K.cards || []).filter(c => (c.choices || []).some(ch => ch.effects && ch.effects.repay) && GG.career.gatePasses(Object.assign({}, s, { flags: { parentsLoan: true } }), loose(c.gate)) && GG.career.speakerOk(s, c.speaker));
    if (!repayCards.length) warn(id + ': no guilt card with a repay choice fits this band yet');
    // an original quits, then comes back through their return card
    s.protected = false; s.totalWeek = 40;
    const m = s.members.find(x => x.original && !GG.career.isSilent(s, x.id)) || s.members[0];
    GG.drama.applyMember(s, { id: m.id, act: 'quit' });
    ok(m.status !== 'active' && m.exit && m.exit.returnDue != null, id + ' ' + m.id + ' is on an exit storyline');
    s.totalWeek = m.exit.returnDue;
    const fc = GG.drama.forcedCard(s, GG.rngFor(s));
    ok(fc && fc.card, id + ' a return card for ' + m.id);
    s.card = { id: fc.card.id, resolved: false, who: fc.who };
    const i = fc.card.choices.findIndex(ch => ch.effects && [].concat(ch.effects.member || []).some(x => x.act === 'return'));
    ok(i >= 0, id + ' the card can take them back');
    GG.career.resolveCard(s, i);
    eq(m.status, 'active', id + ' ' + m.id + ' is back');
    ok(s.stats.returns >= 1, id + ' counted');
  });
});

test('Hail Damage keeps its flavour (the baseline band)', () => {
  const s = GG.career.newCareer({ seed: 1 });
  eq(s.gig.venueId, 'buddys_house_party'); eq(s.van.name, 'The Moose Hearse'); eq(GG.world.driver(s).id, 'kenji');
  eq(GG.world.homeRing(s), 'sask');
  const sd = GG.rival.showdown(s, 'botb');
  ok(sd.rival.name === 'Tundra Wraith' && sd.setlist.length === 3, 'Tundra Wraith');
  ok(GG.songs.namerFr(s), 'Marcel still names songs in French now and then');
  eq(GG.rival.frontSpeaker(s), 'wraith_frontman', 'Gord still posts as the frontman npc');
  const fh = GG.career.newCareer({ seed: 1, bandId: 'frost_heave' }), fs = GG.rival.frontSpeaker(fh);
  ok(fs !== 'wraith_frontman' && GG.career.speakerOk(fh, fs), 'another rival posts as its own frontman (or the DJ): ' + fs);
  eq(GG.world.nearRing(s, 'west'), false, 'the West is far from Saskatoon');
});

done('sim_bands');
if (warnings.length) {
  console.log('WARN (' + warnings.length + (STRICT ? '' : ', strict after Lane A: LEAK_STRICT=1') + '):');
  warnings.slice(0, 40).forEach(w => console.log('  ' + w));
}
