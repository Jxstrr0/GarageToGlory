// content_bands.test.js (v0.9 "Genres", plan_contract_0.9 §5 Lane A): the completeness matrix for the four bands.
//  - Base checks (always run): the shared structures every band pack fills (§4.1), the Q1 Alberta ring and the new rooms,
//    Tundra Wraith's cast (the model the other casts follow) and Hail Damage's voice (no pool shrank: it is the baseline).
//  - Pack checks, per band: every A1 minimum (deck, drama, lines, band lines, World, road, studio, Bandbook, songs and
//    reviews, the rival cast) plus a seeded 240-week draw that never runs dry. A band whose pack file
//    (src/content/zz_band_<bandId>.js) is not in this tree yet is SKIPPED (the pack lanes merge one by one); the skip is
//    named in the result line. Once all three packs land nothing is skipped and every check must pass.
// Run: node tests/content_bands.test.js   (or node tests/run.js content_bands)
const fs = require('fs'), path = require('path');
const { test, ok, eq, done } = require('./_t');
const load = require('./_load');
const GG = load({ localStorage: load.fakeStorage() });
const C = GG.contracts, K = GG.content;

const PACK_BANDS = ['frost_heave', 'gravel_kings', 'grid_road_ramblers'];
const packFile = b => path.join(__dirname, '..', 'src', 'content', 'zz_band_' + b + '.js');
const HAS_PACK = {}; PACK_BANDS.forEach(b => { HAS_PACK[b] = fs.existsSync(packFile(b)); });
const SKIPPED = PACK_BANDS.filter(b => !HAS_PACK[b]);

const BANDS = K.bands, BAND_IDS = Object.keys(BANDS);
const MEMBERS = b => BANDS[b].members.map(m => m.id);
const TALKERS = b => BANDS[b].members.filter(m => !m.silent).map(m => m.id);
const CARDS = K.cards || [];
const str = (s, max) => typeof s === 'string' && s.trim().length > 0 && s.length <= (max || 280);
const strs = (v, max) => [].concat(v == null ? [] : v).length > 0 && [].concat(v).every(t => str(t, max));
const arr = (v, n) => Array.isArray(v) && v.length >= (n || 1);
const only = (c, b) => !!(c && c.gate && Array.isArray(c.gate.band) && c.gate.band.length === 1 && c.gate.band[0] === b);
const dig = (o, p) => p.reduce((a, k) => (a == null ? a : a[k]), o);
const effectsOf = c => [].concat(...(c.choices || []).map(ch => [ch.effects, ch.roll && ch.roll.success && ch.roll.success.effects, ch.roll && ch.roll.fail && ch.roll.fail.effects])).filter(Boolean);
// A pool as the sims read it (career.pool): flat + byGenre[genre] + byBand[bandId], at any level of the path.
function poolFor(obj, p, bandId) {
  const b = BANDS[bandId]; let out;
  const add = v => {
    if (v === undefined) return;
    if (out === undefined) { out = Array.isArray(v) ? v.slice() : v; return; }
    if (Array.isArray(out) || Array.isArray(v)) out = [].concat(Array.isArray(out) ? out : [], Array.isArray(v) ? v : []);
    else if (out && v && typeof out === 'object' && typeof v === 'object') out = Object.assign({}, out, v);
    else out = v;
  };
  add(dig(obj, p));
  ['byGenre', 'byBand'].forEach(layer => { for (let i = 0; i < p.length; i++) add(dig(obj, p.slice(0, i).concat([layer, layer === 'byGenre' ? b.genre : bandId], p.slice(i)))); });
  return out;
}
// Collects problems instead of stopping at the first, so a pack lane sees everything that is missing at once.
function checker() { const bad = []; return { bad, need: (cond, msg) => { if (!cond) bad.push(msg); } }; }

// ======================================================================
// Base checks (A2)
// ======================================================================
test('base: every band has the v0.9 fields, a card-bookable first-gig room in its home city and a home ring on the map', () => {
  const rings = K.map.rings.map(r => r.id), { bad, need } = checker();
  BAND_IDS.forEach(b => {
    const B = BANDS[b], v = K.venues.find(x => x.id === B.firstGig);
    need(B.roles && MEMBERS(b).includes(B.roles.namer) && MEMBERS(b).includes(B.roles.grumbler) && MEMBERS(b).includes(B.roles.deadpan), b + ': roles');
    need(v && v.city === B.city && v.tier === 1, b + ': firstGig ' + B.firstGig + ' is a tier-1 room in ' + B.city);
    if (b !== 'hail_damage') need(C.CARD_BOOKABLE.includes(B.firstGig), b + ': firstGig is in C.CARD_BOOKABLE (its week-one card may book it)');
    need(rings.includes(B.homeRing) && Object.values(K.map.cities).some(c => c.name === B.city && c.ring === B.homeRing), b + ': homeRing ' + B.homeRing);
    need(C.SPACE_KINDS[B.space] && str(B.spaceShort, 30) && str(B.door, 40) && str(B.province, 4) && B.coldOpenFx && B.throne, b + ': space / door / province / fx / throne');
  });
  eq(bad, [], 'band fields');
});

test('base: the shared structures the packs fill (§4.1): lines, awards, Bandbook, shop (Q6, Q7), labels (gap #8), World, calendar, recap', () => {
  const { bad, need } = checker(), L = K.lines, A = K.awards, BB = K.bandbook, S = K.shop, W = K.world, LB = K.labels;
  need(L.byBand && L.live && L.banter && L.labelReact && L.reviewReact && L.moments && L.momentLabels && L.milestones, 'lines: byBand, live, banter, labelReact, reviewReact, moments, momentLabels, milestones');
  // every §4.4 moment + action has a line pool (crowd kinds) or a label (band actions)
  ['mosh', 'headbang', 'wallOfDeath', 'pogo', 'gangShout', 'circlePit', 'fistPump', 'singAlong', 'lighters', 'clapAlong', 'yeehaw', 'lineDance']
    .forEach(k => need(arr(L.moments[k], 2), 'lines.moments.' + k));
  ['capeSpin', 'stageDive', 'kneeSlide', 'hatTip', 'kickflip'].forEach(k => need(str((L.momentLabels || {})[k], 24), 'lines.momentLabels.' + k));
  ['speech', 'speechWorstVan', 'carpet'].forEach(k => need(A[k] && typeof A[k] === 'object' && !Array.isArray(A[k]) && !A[k].id && A[k].hail_damage, 'awards.' + k + ' is keyed by band'));
  need(A.nominees && arr(A.nominees.metal, 8) && !Array.isArray(A.nominees), 'awards.nominees[genre]');
  need(BB.homeSuperfan && BB.homeSuperfan.hail_damage && BB.byBand && BB.byGenre, 'bandbook: homeSuperfan, byBand, byGenre');
  S.spaces.filter(x => x.tier > 0).forEach(x => BAND_IDS.forEach(b => need(x.byCity && x.byCity[BANDS[b].city], 'shop.spaces[' + x.tier + '].byCity.' + BANDS[b].city + ' (Q7)')));
  S.upgrades.filter(u => u.tier === 0).forEach(u => BAND_IDS.forEach(b => need(u.bySpace && u.bySpace[BANDS[b].space], 'shop.upgrades.' + u.id + '.bySpace.' + BANDS[b].space)));
  const TYPO = { hail_damage: 'HALE DAMAGE', frost_heave: 'FROST HEAVY', gravel_kings: 'GRAVY KINGS', grid_road_ramblers: 'THE GRID ROAD RUMBLERS' };
  BAND_IDS.forEach(b => { const m = S.merch.misprint.byBand[b]; need(m && m.typo === TYPO[b] && str(m.find, 40) && str(m.replace, 40) && str(m.stash, 60), 'misprint.byBand.' + b + ' (Q6: ' + TYPO[b] + ')'); });
  need(S.byBand && S.byBand.hail_damage && S.byBand.hail_damage.lines, 'shop.byBand[bandId].lines');
  ['gopherwood', 'monolith'].forEach(id => need(LB[id].demandsByBand && LB[id].demandsByBand.hail_damage, 'labels.' + id + '.demandsByBand'));
  const ro = Object.values(LB).filter(l => l && l.rivalOnly);
  ['mall_rats', 'chartbusters', 'buckle_and_boot'].forEach(r => need(ro.some(l => l.rival === r && str(l.name, 32)), 'a rival-only label for ' + r));
  need(W.gongCarpet && arr(W.gongCarpet.hail_damage, 3) && W.byBand && W.byBand.hail_damage && W.lines && W.cityLines, 'world: gongCarpet, byBand, lines, cityLines');
  need(K.calendar.byBand && K.calendar.byBand.hail_damage && K.calendar.byBand.hail_damage.news, 'calendar.byBand[bandId].news');
  need(K.recap.byBand && K.recap.byBand.hail_damage, 'recap.byBand');
  need(K.drivers.you.byBand && K.drivers.you.byBand.hail_damage && str(K.drivers.you.byBand.hail_damage.takeOver, 160), 'drivers.you.byBand[bandId].takeOver');
  BAND_IDS.forEach(b => need(Object.values(K.drivers).some(d => d.band === b), b + ': a driver'));
  need(K.recruits.hometownsByCity && BAND_IDS.every(b => arr(K.recruits.hometownsByCity[BANDS[b].city], 8)), 'recruits.hometownsByCity');
  eq(bad, [], 'shared structures');
});

test('base: the rivalry: every rival has a scene row it skips, every band a cameo row (Q8); neutral fallbacks; festivals per genre', () => {
  const R = K.rivalry, { bad, need } = checker();
  Object.keys(K.rivals).forEach(r => need(R.scene.some(x => x.rivalId === r), r + ': a scene row with rivalId'));
  BAND_IDS.forEach(b => need(R.scene.some(x => x.bandId === b), b + ': a cameo row with bandId'));
  need(!/Tundra Wraith|Gord|veggie tray|accountant/i.test(JSON.stringify([R.news, R.showdowns, R.cards])), 'the flat news / showdowns / cards are the neutral {rival} fallback');
  C.SHOWDOWNS.forEach(k => need(R.showdowns[k], 'neutral showdown ' + k));
  ['rv_poach', 'rv_crack_breakup', 'rv_crack_rebrand', 'rv_crack_opener', 'rv_final_eve'].forEach(id => need(R.cards.some(c => c.id === id && c.speaker === 'rival_frontman'), 'neutral ' + id));
  C.GENRES.forEach(g => need(R.venues.some(v => v.festival && v.genreFit[g] >= 1), g + ': a festival that loves it'));
  need(R.venues.some(v => v.dome && C.GENRES.every(g => v.genreFit[g] === 1)), 'the Sad Dome fits everyone');
  Object.keys(K.rivals).forEach(r => need(Object.values(K.npcs).some(n => n.rival === r && n.frontman), r + ': a frontman npc'));
  eq(bad, [], 'rivalry');
});

test('base: Q1 Alberta ring and the new rooms (gap #3): Edmonton area, south-west Saskatchewan, a Regina all-ages skate park', () => {
  const { bad, need } = checker(), V = K.venues, city = n => Object.values(K.map.cities).find(c => c.name === n);
  const alberta = Object.values(K.map.cities).filter(c => c.ring === 'alberta').map(c => c.name).sort();
  eq(alberta, ['Calgary', 'Edmonton', 'Leduc', 'Lethbridge', 'Red Deer', 'Sherwood Park', 'St. Albert'], 'owner Q1a: the Alberta ring');
  need(K.map.rings.find(r => r.id === 'alberta').era === 'local', 'Alberta opens at Local Heroes (a home ring opens on day one)');
  const edm = V.filter(v => ['Edmonton', 'St. Albert', 'Sherwood Park', 'Leduc'].includes(v.city) && v.tier <= 2 && v.minFans < 99999);
  need(edm.length >= 6 && ['St. Albert', 'Sherwood Park', 'Leduc'].every(c => edm.some(v => v.city === c)), 'Edmonton tier 1-2: ' + edm.length);
  const sw = V.filter(v => ['Swift Current', 'Maple Creek', 'Gull Lake', 'Shaunavon'].includes(v.city) && v.minFans < 99999);
  need(sw.length >= 5 && ['Maple Creek', 'Gull Lake', 'Shaunavon'].every(c => sw.some(v => v.city === c)), 'south-west Saskatchewan rooms: ' + sw.length);
  need(sw.some(v => v.kind === 'curling') && sw.some(v => v.kind === 'legion' || v.kind === 'church') && sw.some(v => (v.season || []).includes('fall') && v.genreFit.country >= 1)
    && sw.concat(K.rivalry.venues.filter(v => ['Maple Creek', 'Swift Current'].includes(v.city))).some(v => /rodeo|stampede|fair/i.test(v.name)), 'halls, a rink, a harvest dance, a rodeo or fair');
  need(V.some(v => v.city === 'Regina' && v.kind === 'skatepark' && v.tier === 1 && v.minFans < 99999), 'a Regina all-ages skate park');
  ['maple_creek', 'gull_lake', 'shaunavon', 'st_albert', 'sherwood_park', 'leduc'].forEach(id => need(K.map.cities[id] && K.map.cities[id].ring === city(K.map.cities[id].name).ring, 'map city ' + id));
  eq(bad, [], 'rooms');
});

// Hail Damage is the regression baseline: no pool it reads may shrink (flat + byGenre.metal + byBand.hail_damage).
// The numbers are the v0.8.1 pool sizes (branch point b97f9a6).
const HD_MIN = {
  'lines.activity.rehearse': 7, 'lines.activity.write': 6, 'lines.activity.promote': 6, 'lines.activity.book': 5, 'lines.activity.hustle': 6,
  'lines.activity.rest': 6, 'lines.guilt': 8, 'lines.yearEnd': 6, 'lines.quietWeek': 7, 'lines.vanArrive': 4, 'lines.genreClash': 4,
  'lines.venueUp': 3, 'lines.venueDown': 3, 'lines.venueBanned': 3, 'lines.vanTired': 3, 'lines.breakdown': 3, 'lines.sameCrowd': 3,
  'lines.openingSlot': 3, 'lines.eraLocal': 3, 'lines.eraSigned.gopherwood': 2, 'lines.eraSigned.monolith': 2, 'lines.eraSigned.diy': 2,
  'lines.labelOffer.gopherwood': 2, 'lines.labelOffer.monolith': 2, 'lines.offerExpired': 2, 'lines.labelDropped': 3, 'lines.releaseDay': 3,
  'lines.chartDebut': 3, 'lines.chartClimb': 2, 'lines.chartDrop': 2, 'lines.recouped': 2, 'lines.cert.gold': 2, 'lines.cert.platinum': 2,
  'lines.loonies.nominated': 3, 'lines.loonies.snubbed': 2,
  'bandbook.posts.rehearsal': 5, 'bandbook.posts.gig': 4, 'bandbook.posts.teaser': 4, 'bandbook.posts.meme': 5, 'bandbook.posts.bts': 5,
  'bandbook.posts.exclusive': 5, 'bandbook.viral.good': 4, 'bandbook.comments.good': 8, 'bandbook.comments.mixed': 6, 'bandbook.comments.bad': 4,
  'bandbook.comments.hater': 6, 'bandbook.handles.fan': 16, 'bandbook.handles.hater': 6, 'bandbook.mail': 6, 'bandbook.gifts': 6,
  'awards.win': 4, 'awards.lose': 4, 'world.lines.home': 2, 'calendar.costumes': 7
};
test('base: Hail Damage keeps every line (no pool it reads is smaller than in v0.8.1)', () => {
  const { bad, need } = checker();
  Object.keys(HD_MIN).forEach(k => { const [file, ...p] = k.split('.'), n = (poolFor(K[file], p, 'hail_damage') || []).length; need(n >= HD_MIN[k], k + ': ' + n + ' < ' + HD_MIN[k]); });
  // the Bandbook cringe list reads as one object (GG.fans pool('viral')): Hail Damage's own five, in their old order
  const hc = K.bandbook.byBand.hail_damage.viral.cringe;
  need(hc.length === 5 && hc.map(c => c.who).join() === 'marcel,marcel,dana,jaxon,any', 'bandbook.byBand.hail_damage.viral.cringe (the v0.8.1 five, in order)');
  need(K.lines.byBand.hail_damage && ['countIn', 'empty', 'noSolo', 'exposure'].every(k => K.lines.byBand.hail_damage[k]), 'lines.byBand.hail_damage: countIn, empty, noSolo, exposure (UI ports)');
  need(['marcel', 'dana', 'jaxon', 'kenji'].every(id => K.lines.banter[id]) && K.lines.live.marcel.signature && K.lines.live.dana.solo && K.lines.live.jaxon.fill, 'the UI pools (banter, live lines) keep Hail Damage\'s');
  eq(bad, [], 'Hail Damage pools');
});

// ======================================================================
// The rival casts (§4.1 rival cast extension; A1 item 10). Tundra Wraith always; the others with their pack.
// ======================================================================
function castProblems(rid) {
  const R = K.rivalry, c = R.cast && R.cast[rid], { bad, need } = checker();
  if (!c) return ['rivalry.cast.' + rid + ' missing'];
  const w = 'cast.' + rid + ': ';
  const people = [].concat(c.members || [], c.drummer || [], c.mascot || []);
  need(arr(c.members, 2) && c.members.every(m => m && /^[a-z][a-z0-9_]*$/.test(m.id) && str(m.name, 30) && str(m.role, 30) && str(m.bio, 240) && typeof m.corpsePaint === 'boolean' && m.stageShirt), w + 'members { id, name, role, bio, corpsePaint, stageShirt }');
  need(typeof c.frontman === 'string' && (c.members || []).some(m => m.id === c.frontman), w + 'frontman is a member');
  need(rid === 'tundra_wraith' ? people.every(m => m.corpsePaint) : people.every(m => m.corpsePaint === false), w + 'corpse paint only for Tundra Wraith');
  need(arr(c.songs, 12) && new Set(c.songs).size === c.songs.length && c.songs.every(t => str(t, 60)), w + '≥12 songs');
  need(arr(c.albums, 10) && c.albums.every(a => a && str(a.title, 60)), w + '≥10 albums');
  need(arr(c.rebrands, 4) && c.rebrands.every(t => str(t, 60)), w + '≥4 rebrands');
  need(K.labels[c.label] && (rid === 'tundra_wraith' ? C.LABELS.includes(c.label) : K.labels[c.label].rivalOnly && K.labels[c.label].rival === rid), w + 'label (a rival-only label of its own)');
  need(str(c.vehicle, 160), w + 'vehicle');
  Object.keys(R.news).forEach(k => need(arr((c.news || {})[k]) && c.news[k].every(t => str(t, 240)), w + 'news.' + k));
  C.SHOWDOWNS.forEach(k => need(c.showdowns && c.showdowns[k] && (arr(c.showdowns[k].win) || arr(c.showdowns[k].lose) || str(c.showdowns[k].text)), w + 'showdowns.' + k));
  const cards = (c.cards || []).concat(R.cards, CARDS), has = id => cards.some(x => x.id === id);
  ['rv_poach', 'rv_crack_breakup', 'rv_crack_rebrand', 'rv_crack_opener', 'rv_final_eve'].forEach(id => need(has(id + '_' + rid), w + 'card ' + id + '_' + rid));
  need(c.banter && ['open', 'mid', 'final'].every(k => arr(c.banter[k])), w + 'banter { open, mid, final }');
  need(c.ui && arr(c.ui.heatLabels, 5) && ['vehicleLine', 'emptyNews', 'pass', 'finalWin', 'finalLose'].every(k => str(c.ui[k], 200)) && c.ui.crack && C.CRACKS.every(k => arr(c.ui.crack[k], 2)), w + 'ui { heatLabels[5], vehicleLine, emptyNews, pass, finalWin, finalLose, crack }');
  need(c.carpet && str(c.carpet.intro, 200) && ['polite', 'sponsor', 'scarf', 'tailgate'].includes(c.carpet.wave) && c.carpet.count >= 1, w + 'carpet { intro, wave, count }');
  need(c.defector && str(c.defector.line, 200) && ['corpse', 'stylist', 'rhinestone', 'denim'].includes(c.defector.look), w + 'defector { line, look }');
  need(arr(c.comments, 5), w + '≥5 Bandbook comments');
  if (rid === 'buckle_and_boot') need(c.furyBrand === 'truck', w + "furyBrand 'truck'");
  if (rid === 'mall_rats') need(JSON.stringify(c).includes('kickflip'), w + 'sponsor kickflips');
  return bad;
}
test('rival cast: Tundra Wraith (cast.tundra_wraith, the model every pack follows)', () => eq(castProblems('tundra_wraith'), [], 'Tundra Wraith'));

// ======================================================================
// Pack checks (A1 minimums), per band
// ======================================================================
const RULES = ['spotlight', 'cape', 'solos', 'practice', 'freedom', 'baba', 'mystery', 'council', 'twoChords', 'van', 'eighties', 'lawsuit',
  'adulting', 'truck', 'stories', 'secretJoy', 'hat'];
const SHOP_VARIANTS = ['shop_space_1', 'shop_space_2', 'shop_space_3', 'shop_solo', 'shop_merch_start', 'shop_pawn_kit', 'shop_van_deal'];
const FAN_VARIANTS = ['fans_dale_hello', 'fans_macaroni', 'fans_patreeon', 'fans_hater_page', 'fans_club_grumble'];

function deckProblems(b) {
  const { bad, need } = checker(), mine = CARDS.filter(c => only(c, b)), g = BANDS[b].genre;
  const era = c => c.gate.era || [], normal = mine.filter(c => !c.chain && !c.forceWeek);
  need(mine.length >= 70, 'Monday deck ≥70 (' + mine.length + ')');
  need(mine.every(c => (c.gate.genre || [g]).join() === g), 'every card gated to the band\'s genre');
  const n = (label, list, min) => need(list.length >= min, label + ' ≥' + min + ' (' + list.length + ')');
  n('early garage cards', normal.filter(c => era(c).join() === 'garage'), 8);
  n('GLS evergreen cards', normal.filter(c => ['garage', 'local', 'signed'].every(e => era(c).includes(e))), 25);
  n('Local / Local+Signed cards', normal.filter(c => era(c)[0] === 'local'), 12);
  n('Signed cards', normal.filter(c => era(c)[0] === 'signed'), 12);
  n('repeatables', normal.filter(c => c.once === false), 12);
  eq(mine.filter(c => c.forceWeek === 1).length, 1, b + ': one forced week-one card');
  const chains = [...new Set(mine.filter(c => c.chain).map(c => c.chain))].map(id => mine.filter(c => c.chain === id));
  need(chains.some(cs => { const top = Math.max(...cs.map(c => c.step)); return top >= 5 && top <= 8 && cs.length > top; }), 'the Q2 storyline: a chain of 5-8 steps with branches');
  C.LABELS.forEach(l => need(mine.some(c => c.gate.flagEquals && c.gate.flagEquals.label === l), 'label card for ' + l));
  n('guilt / repay cards', mine.filter(c => (c.gate.flags || []).includes('parentsLoan') && c.choices.some(ch => ch.effects && ch.effects.repay)), 2);
  K.calendar.holidays.filter(h => arr(h.cards)).forEach(h => need(h.cards.some(id => only(CARDS.find(c => c.id === id), b)), 'holiday ' + h.id + ': the band\'s own card in its list'));
  ['gopherwood', 'monolith'].forEach(l => {
    const d = (K.labels[l].demandsByBand || {})[b];
    need(arr(d), 'labels.' + l + '.demandsByBand.' + b);
    (d || []).filter(x => x.card).forEach(x => need(only(CARDS.find(c => c.id === x.card), b), 'demand card ' + x.card + ' gated to the band'));
  });
  SHOP_VARIANTS.concat(['money_merch_misprint']).forEach(id => need((K.shopCards || []).some(c => c.id === id + '_' + b && only(c, b)), 'shop variant ' + id + '_' + b));
  FAN_VARIANTS.forEach(id => need((K.bandbook.cards || []).some(c => c.id === id + '_' + b && only(c, b)), 'fan variant ' + id + '_' + b));
  const sc = (K.bandbook.scandals || []).filter(x => MEMBERS(b).includes(x.who));
  need(sc.length >= 4 && sc.every(x => (K.bandbook.cards || []).some(c => c.id === x.card)), 'scandal cards ≥4 (' + sc.length + ')');
  need((K.licensing.brands || []).some(x => (x.band || []).includes(b)), 'an "employer" licensing brand gated to the band');
  need((K.licenseScandals || []).some(x => MEMBERS(b).includes(x.who) && (K.licenseCards || []).some(c => c.id === x.card && only(c, b))), 'a licensing sellout scandal');
  return bad;
}
function dramaProblems(b) {
  const { bad, need } = checker(), D = K.drama, DC = K.dramaCards || [], has = id => DC.some(c => c.id === id);
  MEMBERS(b).forEach(id => {
    const m = D.members[id], w = 'drama.' + id + ': ';
    if (!m) { bad.push(w + 'missing'); return; }
    need(arr(m.wants) && m.wants.every(x => RULES.includes(x.rule) && str(x.text, 140) && str(x.gripe, 40)), w + 'wants (rules ' + RULES.join('/') + ')');
    need(arr(m.grumble, 2) && arr(m.passive, 2), w + 'grumble + passive');
    const x = m.exit || {};
    need(str(x.id || id, 40) && Array.isArray(x.returnAfter) && str(x.status, 140) && x.quitLine && x.backLine && arr(x.beats, 2) && str(x.changed, 140), w + 'exit { returnAfter, status, quitLine, beats, changed, backLine }');
    need(str(m.epilogue, 200), w + 'epilogue');
    need(has(m.ultimatum) && has(m.returnFilled) && (x.away || has(m.return)), w + 'ult_ / ret_ / ret_*_filled cards');
  });
  return bad;
}
function memberLineProblems(b) {
  const { bad, need } = checker(), L = K.lines, W = K.world;
  const custom = [];
  TALKERS(b).forEach(id => {
    const w = id + ': ';
    need(L.chat[id] && ['happy', 'ok', 'grumpy', 'sulking'].every(k => arr(L.chat[id][k], 4)), w + 'chat 4 moods x 4');
    need(L.gigReactions[id] && ['great', 'ok', 'bad'].every(k => arr(L.gigReactions[id][k], 3)), w + 'gigReactions x 3');
    need(arr(L.tap[id], 6), w + 'tap ≥6');
    need(L.songReactions[id] && typeof L.songReactions[id] === 'object', w + 'songReactions');
    custom.push(...((L.songReactions[id] || {}).custom || []));
    need(arr(L.writeTips[id], 2), w + 'writeTips ≥2');
    need(arr(L.vanBanter[id], 6), w + 'vanBanter ≥6');
    need(arr(W.callHome[id], 3), w + 'callHome ≥3');
    need(arr(L.banter[id], 3), w + 'banter ≥3');
    const lv = L.live[id] || {};
    need(Object.keys(lv).length && Object.keys(lv).every(k => arr(lv[k], 3)), w + 'live lines, 3 each');
    const sig = BANDS[b].members.find(m => m.id === id).signature;
    if (sig) need(arr(lv.signature, 3), w + 'live.signature ≥3 (' + sig.action + ')');
    ['picked', 'rebrand'].forEach(k => {
      const ll = (K.logo.lines || {})[k], own = Array.isArray(ll) ? ll.filter(x => x && x.who === id) : ((ll || {})[id] || []);
      need(own.length >= 2, w + 'logo.lines.' + k + ' ≥2');
    });
  });
  need(custom.length >= 2 && custom.every(x => ['difficultyHigh', 'similarityHigh', 'any'].includes(x.when) && str(x.text, 140)), 'songReactions: ≥2 custom { when, text }');
  need(MEMBERS(b).some(id => L.live[id] && arr(L.live[id].solo, 3)) && MEMBERS(b).some(id => L.live[id] && arr(L.live[id].fill, 3)), 'live: a solo and a fill voice');
  [['labelReact', ['monolith', 'gopherwood', 'diy', 'signed']], ['reviewReact', ['great', 'meh', 'awful']]].forEach(([p, keys]) =>
    keys.forEach(k => need(MEMBERS(b).some(id => L[p][id] && arr(L[p][id][k])), p + '.' + k + ' voiced by a member')));
  return bad;
}
function bandLineProblems(b) {
  const { bad, need } = checker(), LB = (K.lines.byBand || {})[b] || {}, A = K.awards, g = BANDS[b].genre;
  C.ACTIVITIES.forEach(a => need(arr((LB.activity || {})[a], 6), 'lines.byBand.activity.' + a + ' ≥6'));
  [['quietWeek', 10], ['yearEnd', 6], ['genreClash', 4]].forEach(([k, n]) => need(arr(LB[k], n), 'lines.byBand.' + k + ' ≥' + n));
  need(LB.milestones && Object.keys(LB.milestones).length >= 1, 'lines.byBand.milestones');
  // (the UI takes a string or a list: countIn / noSolo / empty.chat / empty.catalog; exposure { pitch, toast } or [pitch, toast])
  const ex = LB.exposure, exOk = Array.isArray(ex) ? ex.length >= 2 && strs(ex, 140) : !!ex && str(ex.pitch, 140) && str(ex.toast, 140);
  need(strs(LB.countIn, 90) && LB.empty && strs(LB.empty.chat, 140) && strs(LB.empty.catalog, 140) && strs(LB.noSolo, 140) && exOk, 'lines.byBand: countIn, empty, noSolo, exposure');
  need(Object.keys(((K.calendar.byBand || {})[b] || {}).news || {}).length >= 8, 'calendar.byBand.news: 8 weeks');
  need(Object.keys(((K.shop.byBand || {})[b] || {}).lines || {}).length >= 3, 'shop.byBand.lines');
  const gy = (((K.recap.byBand || {})[b] || {}).goodYear) || (!Array.isArray(K.recap.goodYear) && K.recap.goodYear[b]) || (K.recap.goodYear || {})[b];
  need(arr(gy, 4) && gy.every(x => x.topic && x.good && x.bad), 'recap goodYear');
  need(arr((K.world.gongCarpet || {})[b], 3), 'world.gongCarpet ≥3 lines');
  const sp = (A.speech || {})[b], wv = (A.speechWorstVan || {})[b], driver = Object.values(K.drivers).find(d => d.band === b);
  need(sp && sp.id && only(sp, b) && arr(sp.choices, 2), 'awards.speech (a card gated to the band)');
  need(wv && wv.id && only(wv, b) && driver && wv.speaker === driver.id, 'awards.speechWorstVan accepted by the driver (' + (driver && driver.id) + ')');
  need(arr((A.carpet || {})[b], 3), 'awards.carpet');
  need((A.outfitCards || []).filter(c => only(c, b) && (c.gate.flags || c.gate.flagEquals || c.gate.notFlags)).length >= 2, 'outfitCards ≥2 (flag-gated)');
  const ab = (A.byBand || {})[b] || {};
  need(arr(ab.win, 2) && arr(ab.lose, 2), 'awards.byBand win / lose');
  need(arr((A.nominees || {})[g], 8), 'awards.nominees.' + g + ' ≥8');
  return bad;
}
function worldProblems(b) {
  const { bad, need } = checker(), W = K.world, mine = (W.cards || []).filter(c => only(c, b));
  ['uk_europe', 'japan', 'australia', 'russia'].forEach(r => need(mine.some(c => (c.gate.region || []).includes(r)), 'a World region card for ' + r));
  need((W.cards || []).some(c => c.id === 'wt_homesick_' + b), 'wt_homesick_' + b);
  const pk = (W.packages || []).filter(p => p.needs && p.needs.flag && (!p.needs.band || p.needs.band.includes(b)));
  const all = CARDS.concat(W.cards || []), sets = f => all.filter(c => (only(c, b) || (c.gate && !c.gate.band)) && effectsOf(c).some(fx => fx.flags && f in fx.flags && fx.flags[f] !== false));
  need(pk.some(p => sets(p.needs.flag).some(c => c.chain && all.filter(x => x.chain === c.chain).length >= 3)), 'the Q3 payoff: a package needing a flag that a ≥3-card chain sets');
  return bad;
}
function roadProblems(b) {
  const { bad, need } = checker(), R = K.roadCards, drv = Object.values(K.drivers).find(d => d.band === b);
  need(drv && R.filter(c => c.gate && (c.gate.driver || []).includes(drv.id)).length >= 8, 'the driver\'s pool ≥8 (' + (drv && drv.id) + ')');
  need(R.filter(c => only(c, b) && (c.gate.driver || []).includes('you')).length >= 4, 'you-drive cards ≥4');
  need(R.filter(c => only(c, b) && !c.gate.driver).length >= 6, 'band road cards ≥6');
  need(K.drivers.you.byBand && K.drivers.you.byBand[b] && str(K.drivers.you.byBand[b].takeOver, 160), 'drivers.you.byBand.takeOver');
  need((K.studioEvents || []).filter(c => only(c, b)).length >= 6, 'studio events ≥6');
  return bad;
}
function bandbookProblems(b) {
  const { bad, need } = checker(), BB = K.bandbook, own = (BB.byBand || {})[b] || {}, hs = (BB.homeSuperfan || {})[b];
  need(hs && str(hs.name, 44) && str(hs.from, 60) && str(hs.blurb, 160) && arr(hs.gigLines, 3) && arr(hs.gigLinesFar, 2) && arr(hs.comments, 4), 'homeSuperfan (Q5)');
  need(hs && hs.gift && BB.scriptedGifts[hs.gift], 'homeSuperfan.gift: a scripted gift');
  need([].concat(...Object.values(own.posts || {})).length >= 12, 'posts ≥12');
  need(arr(dig(own, ['viral', 'good']), 2), 'viral.good ≥2');
  const cr = dig(own, ['viral', 'cringe']) || [];
  TALKERS(b).forEach(id => need(cr.filter(c => c.who === id).length >= 2, 'viral.cringe for ' + id + ' ≥2'));
  const items = (own.mail || []).concat(own.gifts || [], (BB.mail || []).concat(BB.gifts || []).filter(x => (x.band || []).includes(b)));
  need(items.length >= 4, 'mail / gifts ≥4');
  return bad;
}
function songProblems(b) {
  const { bad, need } = checker(), g = BANDS[b].genre, T = K.songTitles[g] || [], AW = (K.albumWords.titles || {})[g] || {};
  const titles = T.map(t => (typeof t === 'string' ? t : t.en));
  need(titles.length >= 40 && new Set(titles).size === titles.length, g + ' song titles ≥40, unique (' + titles.length + ')');
  ['adj', 'noun', 'place'].forEach(k => need(arr(AW[k], 20), 'album words ' + g + '.' + k + ' ≥20'));
  Object.values(K.reviews.outlets).forEach(o => Object.keys(o.quotes || {}).forEach(grade => need(arr(dig(o, ['byBand', b, grade]), 2), 'reviews.' + o.id + '.byBand.' + grade + ' ≥2')));
  return bad;
}

// v0.5 draw walk (as content.test.js does for Hail Damage), for any band: garage -> Local at 250 fans -> Signed at week 64.
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
function drawCareer(b, label, seed) {
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
  const out = { dry: [], year1: new Set(), counts: {}, byEra: { garage: new Set(), local: new Set(), signed: new Set() } };
  for (let w = 1; w <= C.CAREER_YEARS * C.WEEKS_PER_YEAR; w++) {
    s.totalWeek = w; s.year = Math.ceil(w / C.WEEKS_PER_YEAR); s.week = (w - 1) % C.WEEKS_PER_YEAR + 1;
    s.fans = w <= 24 ? 12 + w * 12 : w <= 64 ? 300 + (w - 24) * 10 : 700 + (w - 64) * 40;
    if (s.era === 'garage' && s.fans >= 250) s.era = 'local';
    if (w === 64) { s.era = 'signed'; s.flags.label = label; }
    if (w === 40) s.flags.parentsLoan = true;
    if (w === 100) delete s.flags.parentsLoan;
    if (w % 30 === 0) s.members[w / 30 % s.members.length].mood = 30; else if (w % 30 === 5) s.members.forEach(m => { m.mood = 60; });
    let pool = CARDS.filter(c => c.forceWeek === w && s.seen[c.id] == null && gatePasses(c.gate, s));
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
function drawProblems(b) {
  const bad = [];
  C.LABELS.forEach((label, i) => {
    const r = drawCareer(b, label, 20260930 + i), w = label + ': ';
    if (r.dry.length) bad.push(w + 'weeks with no Monday card: ' + r.dry.slice(0, 8).join(' '));
    if (r.year1.size < 18) bad.push(w + 'year one shows ' + r.year1.size + ' different cards (<18)');
    if (r.byEra.local.size < 12) bad.push(w + 'Local Heroes shows ' + r.byEra.local.size + ' (<12)');
    if (r.byEra.signed.size < 20) bad.push(w + 'Signed shows ' + r.byEra.signed.size + ' (<20)');
    const most = Object.entries(r.counts).sort((x, y) => y[1] - x[1])[0];
    if (most && most[1] > 30) bad.push(w + most[0] + ' repeats ' + most[1] + ' times');
  });
  return bad;
}

const SECTIONS = [['Monday deck', deckProblems], ['drama', dramaProblems], ['member lines', memberLineProblems], ['band lines', bandLineProblems],
  ['World', worldProblems], ['road + studio', roadProblems], ['Bandbook', bandbookProblems], ['songs + reviews', songProblems]];
PACK_BANDS.forEach(b => {
  if (!HAS_PACK[b]) return;
  SECTIONS.forEach(([name, fn]) => test(b + ' pack: ' + name, () => eq(fn(b), [], b + ' ' + name)));
  test(b + ' pack: rival cast ' + BANDS[b].rival, () => eq(castProblems(BANDS[b].rival), [], BANDS[b].rival));
  test(b + ' pack: a seeded 240-week draw never runs dry and stays varied (each label)', () => eq(drawProblems(b), [], b + ' draw'));
});
test('Hail Damage: a seeded 240-week draw never runs dry and stays varied (each label; the baseline deck)', () => eq(drawProblems('hail_damage'), [], 'hail_damage draw'));

done('content_bands' + (SKIPPED.length ? '; packs not in this tree, skipped: ' + SKIPPED.join(' ') : ''));
