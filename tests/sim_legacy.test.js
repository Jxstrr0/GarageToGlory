// sim_legacy.test.js (v1.0 "Glory", Lane E; plan_contract_1.0 §4.1–4.4, §5 E): GG.legacy (2f_sim_legacy.js).
// The seven Legacy parts on synthetic states, tier boundaries, every special ending true and false, epilogue cards for all four
// bands (lineup, quit, defector, recruit, Kenji silent, the player card, the seatRole hook), a seat-neutral score, the bonus-year
// rule (+3 / +2 / none, once, refused after the Sad Dome is announced or played or from year 10; the v0.9 fixtures), the
// headline tracker's exclusions, finish() idempotent, hofEntry, the career RNG untouched, purity, and one 312-week bonus career
// per band (the Sad Dome in the last year, the bonus cards drawn, an ending with no other band's names in it).
// Run: node tests/sim_legacy.test.js
const load = require('./_load');
const { test, ok, eq, done } = require('./_t');
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const fixture = name => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'fixtures', name + '.json.gz'))).toString('utf8'));
function fresh() { return load({ localStorage: load.fakeStorage() }); }
// A blank career to shape: nothing earned yet.
function blank(GG, band, extra) {
  const s = GG.career.newCareer({ seed: 4242, bandId: band || 'hail_damage', player: { name: 'Pat Doe', nick: 'Patty' } });
  s.fans = 0; s.chemistry = 0; s.finalShowdown = null; s.gig = null;
  Object.assign(s.stats, { units: 0, loonieWins: 0, certs: 0 });
  return Object.assign(s, extra || {});
}
function reg(s, id) { s.tour.regions[id] = s.tour.regions[id] || {}; return s.tour.regions[id]; }
const mem = (s, id) => s.members.find(m => m.id === id);
function quit(s, id, since) { const m = mem(s, id); m.status = 'quit'; m.exit = { storyline: 'gone', since: since || 100, returnDue: null, beat: 0 }; return m; }
function defect(s, id) { quit(s, id); s.rivalDefectors = (s.rivalDefectors || []).concat(id); }
const BANDS = ['hail_damage', 'frost_heave', 'gravel_kings', 'grid_road_ramblers'];

test('the seven parts on synthetic states (fans, units, awards, venue, regions, unity, final); the score is their sum', () => {
  const GG = fresh(), L = GG.legacy, s = blank(GG);
  eq(L.parts(s).parts, { fans: 0, units: 0, awards: 0, venue: 0, regions: 0, unity: 50, final: 0 }, 'nothing earned (chemistry 0; the originals still in: unity 50)');
  const gone = blank(GG); gone.members.forEach(m => quit(gone, m.id));
  eq(L.parts(gone).parts.unity, 0, 'chemistry 0 and every original gone: unity 0');
  const T = GG.content.endings.legacy;
  s.fans = T.fans.full; s.stats.units = T.units.full; s.stats.loonieWins = 2; s.stats.certs = 3; s.flags.greyMug = 'played';
  s.tour.gongs = [{ year: 6, won: true }, { year: 7, won: false }];
  s.legacyTrack.bigHead = { id: 'x', name: 'X', cap: 19000, week: 9 };
  reg(s, 'uk_europe').broken = 50; reg(s, 'japan').broken = 60; reg(s, 'canada').broken = 10;   // home never counts
  s.chemistry = 100; s.finalShowdown = { week: 237, won: true, headliner: 'you', score: 90, rivalScore: 80, rival: 'Tundra Wraith' };
  const p = L.parts(s).parts;
  eq(p, { fans: 250, units: 200, awards: 2 * 8 + 20 + 3 * 4 + 10, venue: 100, regions: 50, unity: 100, final: 100 }, 'full marks where earned');
  eq(L.compute(s).score, Object.values(p).reduce((a, b) => a + b, 0), 'score = the sum of the parts');
  s.fans = T.fans.full / 4; s.stats.units = T.units.full / 4; eq([L.parts(s).parts.fans, L.parts(s).parts.units], [Math.round(250 * Math.pow(0.25, 0.6)), 100], 'fans^0.6, units^0.5');
  s.stats.loonieWins = 30; eq(L.parts(s).parts.awards, 150, 'awards cap at 150');
  s.finalShowdown = null; s.legacyTrack.bigHead.cap = 500;
  eq(L.parts(s).parts.venue, Math.round(100 * Math.log(500 / 15) / Math.log(19000 / 15)), 'venue: log scale from 15 to the Sad Dome\'s 19,000');
  s.legacyTrack.bigHead.cap = 15; eq(L.parts(s).parts.venue, 0); s.legacyTrack.bigHead = null; eq(L.parts(s).parts.venue, 0, 'never headlined: 0');
  s.chemistry = 50; quit(s, 'dana'); quit(s, 'jaxon');
  eq(L.parts(s).parts.unity, 50, 'unity: half chemistry, half originals kept (2 of 4)');
  s.finalShowdown = { headliner: 'rival', won: false }; eq(L.parts(s).parts.final, 40, 'the rival headlined: 40');
  reg(s, 'australia').broken = 3; reg(s, 'russia').broken = 4; eq(L.parts(s).parts.regions, 100, 'regions: 25 each abroad');
});

test('the Sad Dome counts only through finalShowdown; old careers get an estimated biggest room (est), never the Sad Dome or a festival', () => {
  const GG = fresh(), L = GG.legacy, s = blank(GG);
  s.legacyTrack.bigHead = { id: 'legion_63', name: 'Legion', cap: 200, week: 20 };
  s.finalShowdown = { headliner: 'you', won: true };
  eq([L.raw(s).venue.id, L.raw(s).venue.cap], ['sad_dome', 19000], 'headlined the Sad Dome');
  s.finalShowdown = { headliner: 'rival', won: false };
  eq(L.raw(s).venue.id, 'legion_63', 'opened at the Sad Dome: no credit');
  const old = blank(GG); old.createdVersion = '0.9.0.0';
  const vs = GG.content.venues.filter(v => v.minFans < 99999).sort((a, b) => b.capacity - a.capacity);
  old.venueLast = { [vs[vs.length - 1].id]: 4, [vs[3].id]: 90, sad_dome: 237, mudstonbury_fest: 150 };
  const est = L.raw(old).venue;
  ok(est && est.est === true && est.id === vs[3].id && est.cap === vs[3].capacity, 'an old career: the largest room played, est: true (' + JSON.stringify(est) + ')');
  const now = blank(GG); now.venueLast = old.venueLast;
  eq(L.raw(now).venue, null, 'a v1.0 career never estimates (its tracker ran from week one)');
});

test('the headline tracker: openings, domestic festival slots, tour festivals and the final never count; Mudstonbury only when headlined', () => {
  const GG = fresh(), L = GG.legacy, s = blank(GG);
  const g = (o) => Object.assign({ venueId: 'legion_63', name: 'Legion Hall', capacity: 300, source: 'book' }, o);
  L.gig(s, {}, g()); eq(s.legacyTrack.bigHead && s.legacyTrack.bigHead.cap, 300, 'a normal gig counts');
  eq(s.legacyTrack.bigHead.week, s.totalWeek);
  L.gig(s, {}, g({ capacity: 200 })); eq(s.legacyTrack.bigHead.cap, 300, 'a smaller room never replaces it');
  L.gig(s, { opening: { name: 'Big Act' } }, g({ capacity: 5000 })); eq(s.legacyTrack.bigHead.cap, 300, 'an opening slot never counts');
  L.gig(s, {}, g({ capacity: 6000, headliner: 'Tundra Wraith', showdown: { kind: 'festival' } })); eq(s.legacyTrack.bigHead.cap, 300, 'a domestic festival slot under a headliner never counts');
  L.gig(s, {}, g({ venueId: 'wackelstein_fest', capacity: 75000, festival: true, tour: true })); eq(s.legacyTrack.bigHead.cap, 300, 'a tour festival stop never counts');
  L.gig(s, {}, g({ venueId: 'sad_dome', capacity: 19000, source: 'final', showdown: { kind: 'final' } })); eq(s.legacyTrack.bigHead.cap, 300, 'the Sad Dome never counts here (finalShowdown does)');
  L.gig(s, {}, g({ venueId: 'mudstonbury_fest', capacity: 60000, festival: true, tour: true })); eq(s.legacyTrack.bigHead.cap, 300, 'Mudstonbury: not unless headlined');
  s.flags.mudstonbury = 'headlined';
  L.gig(s, {}, g({ venueId: 'mudstonbury_fest', capacity: 60000, festival: true, tour: true })); eq(s.legacyTrack.bigHead.cap, 60000, 'Mudstonbury headlined counts');
  const t = blank(GG); t.flags.mudstonbury = 'headlined'; eq(L.raw(t).venue.id, 'mudstonbury_fest', 'and compute() credits it even when the flag landed after the gig');
  const big = blank(GG), v = GG.content.venues.filter(x => x.minFans < 99999).sort((a, b) => b.capacity - a.capacity)[0];
  L.gig(big, { score: 80 }, GG.gig.makeGig(big, v.id, 'book')); eq(big.legacyTrack.bigHead.id, v.id, 'a real board gig (makeGig)');
});

test('tiers by the score alone: 800 / 600 / 400 / 200 boundaries; difficulty is only a badge', () => {
  const GG = fresh(), L = GG.legacy;
  eq([1000, 800, 799, 600, 599, 400, 399, 200, 199, 0].map(L.tier), ['arena_legends', 'arena_legends', 'canadian_institution', 'canadian_institution', 'cult_heroes',
    'cult_heroes', 'one_album_wonders', 'one_album_wonders', 'still_in_the_garage', 'still_in_the_garage']);
  const s = blank(GG); s.fans = 50000; s.stats.units = 300000; s.chemistry = 70;
  const a = L.compute(s), b = L.compute(Object.assign(JSON.parse(JSON.stringify(s)), { careerDifficulty: 'brutal' }));
  ok(a.score === b.score && a.tier === b.tier && a.difficulty === 'normal' && b.difficulty === 'brutal', 'brutal: the same score and tier, a different badge');
  const lost = blank(GG, 'hail_damage', { finalShowdown: { headliner: 'rival', won: false } }); lost.fans = 100000; lost.stats.units = 800000; lost.stats.loonieWins = 20; lost.chemistry = 100;
  reg(lost, 'japan').broken = 1; lost.legacyTrack.bigHead = { id: 'x', name: 'X', cap: 15000, week: 3 };
  const lg = L.compute(lost), tx = L.text(lost, lg);
  ok(lg.tier === 'arena_legends' && /\{rival\}|Tundra Wraith/.test(tx.tier.line) && /asterisk/.test(tx.tier.line), 'losing the Sad Dome changes the text, not the tier: ' + tx.tier.line);
  const zero = blank(GG); zero.fans = 20000; zero.stats.units = 0; zero.chemistry = 80; zero.legacyTrack.bigHead = { id: 'x', name: 'X', cap: 500, week: 3 };
  const zl = L.compute(zero);
  if (zl.tier === 'one_album_wonders') eq(L.text(zero, zl).tier.name, 'Zero-Album Wonders', 'no album: Zero-Album Wonders');
  ok(['one_album_wonders', 'still_in_the_garage', 'cult_heroes'].includes(zl.tier), 'a small career: ' + zl.tier + ' ' + zl.score);
});

test('special endings: every one true and false on synthetic states (band gates, Big in Japan formula, originals, Side Project)', () => {
  const GG = fresh(), L = GG.legacy, has = (s, id) => L.specials(s).includes(id);
  // Big in Japan = broken && (a song blew up there || >= 20 % of all fans there)
  const j = blank(GG); j.fans = 10000;
  ok(!has(j, 'big_in_japan'), 'Japan not broken: no');
  Object.assign(reg(j, 'japan'), { broken: 50, big: null, fans: 2500 }); ok(has(j, 'big_in_japan'), 'broken + 25 % of fans there: yes');
  reg(j, 'japan').fans = 1500; ok(!has(j, 'big_in_japan'), 'broken + 15 %, no song: no');
  reg(j, 'japan').big = { songId: 's1', week: 70 }; ok(has(j, 'big_in_japan'), 'broken + a song blew up: yes');
  reg(j, 'japan').broken = null; ok(!has(j, 'big_in_japan'), 'a big song without breaking Japan: no');
  // the four World payoffs, each its own band only
  [['moose_opera', 'hail_damage', 'mooseOpera', 'platinum'], ['big_in_berlin', 'frost_heave', 'squatAnthemPayoff', 'wackelstein'],
    ['mudstonbury_legends', 'gravel_kings', 'mudHeadlinePayoff', 'mudstonbury'], ['outback_legends', 'grid_road_ramblers', 'outbackPayoff', 'tumbleworth']].forEach(([id, band, flag, val]) => {
    const s = blank(GG, band); ok(!has(s, id), id + ': no flag, no');
    s.flags[flag] = val; ok(has(s, id), id + ': ' + flag + ' set, yes');
    const other = blank(GG, band === 'hail_damage' ? 'frost_heave' : 'hail_damage'); other.flags[flag] = val; ok(!has(other, id), id + ': another band, never');
  });
  const mo = blank(GG); mo.flags.mooseOpera = 'gold'; ok(!has(mo, 'moose_opera'), 'Moose Opera needs platinum');
  // originals
  const o = blank(GG); ok(has(o, 'original_lineup') && !has(o, 'band_of_strangers'), 'nobody ever quit: the Original Five');
  eq(L.text(o, L.compute(o)).specials.find(x => x.id === 'original_lineup').name, 'The Original Five', 'Hail Damage: five');
  const fh = blank(GG, 'frost_heave'); eq(L.text(fh, L.compute(fh)).specials.find(x => x.id === 'original_lineup').name, 'The Original Four', 'Frost Heave: four');
  mem(o, 'kenji').returns = 1; ok(!has(o, 'original_lineup'), 'a quit-and-return counts as lost');
  const st = blank(GG); ['marcel', 'dana', 'jaxon', 'kenji'].forEach(id => quit(st, id));
  st.members.push({ id: 'rec1', name: 'Wade Friesen', role: 'vocals', status: 'active', original: false, mood: 60, skill: 50, recruit: { trait: 'reliable', quirk: 'toque' } });
  st.members.push({ id: 'rec2', name: 'Tara Olson', role: 'lead guitar', status: 'active', original: false, mood: 60, skill: 50, recruit: { trait: 'frugal', quirk: 'hockey' } });
  ok(has(st, 'band_of_strangers') && !has(st, 'original_lineup'), 'no originals left: Band of Strangers');
  ok(/two strangers/.test(L.text(st, L.compute(st)).specials.find(x => x.id === 'band_of_strangers').line), 'the text reads the count (two)');
  mem(st, 'kenji').status = 'active'; ok(!has(st, 'band_of_strangers'), 'one original left: no');
  // Side Project: >= 2 originals play for the rival at the end
  const sp = blank(GG); defect(sp, 'dana'); ok(!has(sp, 'side_project'), 'one defector: no');
  defect(sp, 'jaxon'); ok(has(sp, 'side_project'), 'two defectors: yes');
  ok(/\{rival\}|Tundra Wraith/.test(L.text(sp, L.compute(sp)).specials.find(x => x.id === 'side_project').line), 'names the rival');
});

test('epilogues for all four bands: lineup, a recruit, an original who left, a defector, then the player card; Kenji silent; filled', () => {
  const GG = fresh(), L = GG.legacy;
  BANDS.forEach(band => {
    const s = blank(GG, band), ids = s.members.map(m => m.id);
    quit(s, ids[1], 120); defect(s, ids[2]);
    s.members.push({ id: 'rec1', name: 'Wade Friesen', role: s.members[1].role, status: 'active', original: false, mood: 60, skill: 50, recruit: { trait: 'road_warrior', quirk: 'toque' } });
    const ep = L.compute(s).epilogues, kinds = ep.map(e => e.kind + ':' + e.id);
    const lineup = s.members.filter(m => m.status === 'active').map(m => (m.original ? 'member:' : 'recruit:') + m.id);
    eq(kinds, lineup.concat(['gone:' + ids[1], 'defector:' + ids[2], 'player:player']), band + ' order');
    ok(ep.every(e => e.text && e.text.length > 10 && !/[{}]/.test(e.text) && e.name), band + ': every card filled');
    ok(ep.find(e => e.kind === 'defector').text.includes(GG.rival.name(s)), band + ': the defector now plays for the rival');
    eq(ep[ep.length - 1].name, 'Patty', band + ': the player card uses the nick');
    ok([].concat(GG.content.endings.recruits.byTrait.road_warrior, GG.content.endings.recruits.byQuirk.toque).map(t => GG.career.fillText(s, t)).includes(ep.find(e => e.kind === 'recruit').text), band + ': the recruit card comes from its trait / quirk pool');
  });
  const hd = blank(GG); eq(L.compute(hd).epilogues.filter(e => e.silent).map(e => e.id), ['kenji'], 'Kenji is narration only (silent); nobody else');
});

test('the A14 variants pick by state (cape, solo, Baba, Kenji\'s Christmas bass) and fall back to the shipped line', () => {
  const GG = fresh(), L = GG.legacy, D = GG.content.drama.members;
  const text = (s, id, tier, sp) => L.epilogues(s, tier, sp || []).find(e => e.id === id).text;
  const s = blank(GG);
  eq(text(s, 'marcel', 'cult_heroes'), D.marcel.epilogue, 'no cape storyline: the shipped line');
  s.flags.cape = 'none'; eq(text(s, 'marcel', 'cult_heroes'), D.marcel.epilogue, 'cape none: shipped');
  s.flags.cape = 'velvet'; ok(/cape shop/i.test(text(s, 'marcel', 'still_in_the_garage')), 'a cape: the cape shop');
  ok(/solo finally ends/.test(text(s, 'dana', 'cult_heroes')) && text(s, 'dana', 'one_album_wonders') === D.dana.epilogue, 'Dana: the solo ends at Cult Heroes or better');
  ok(/Baba/.test(text(s, 'jaxon', 'canadian_institution')) && text(s, 'jaxon', 'cult_heroes') === D.jaxon.epilogue, 'Jaxon: Baba manages at Canadian Institution or better');
  ok(/bass/.test(text(s, 'kenji', 'arena_legends')) && text(s, 'kenji', 'one_album_wonders') === D.kenji.epilogue, 'Kenji: a new bass every Christmas, else the blank postcard');
  quit(s, 'dana'); ok(/new band/.test(text(s, 'dana', 'arena_legends')), 'Dana gone: her own line');
  const fh = blank(GG, 'frost_heave'); fh.flags.council = 'won'; ok(/council/.test(text(fh, 'rox', 'cult_heroes')), 'Rox: council won');
  const gk = blank(GG, 'gravel_kings'); gk.flags.riff = 'settled'; ok(/settlement/.test(text(gk, 'lenny', 'cult_heroes')), 'Lenny: the riff settled');
  const gr = blank(GG, 'grid_road_ramblers'); gr.flags.truckStory = 'famous'; ok(/taught in schools/.test(text(gr, 'travis', 'cult_heroes')), 'Travis Lee: the truck song famous');
});

test('seat: the score is seat-neutral; the player card is keyed by seat (falls back to drums); the seatRole matcher (never true in v1.0)', () => {
  const GG = fresh(), L = GG.legacy, s = blank(GG);
  s.fans = 30000; s.stats.units = 200000; s.chemistry = 66; reg(s, 'japan').broken = 3;
  const bass = Object.assign(JSON.parse(JSON.stringify(s)), { seat: 'bass' });
  const a = L.compute(s), b = L.compute(bass);
  ok(a.score === b.score && a.tier === b.tier && JSON.stringify(a.parts) === JSON.stringify(b.parts), 'the same score with seat: bass');
  eq([a.seat, b.seat], ['drums', 'bass']);
  const bassCard = GG.content.endings.player.bass, bt = b.epilogues.pop().text, at = a.epilogues.pop().text;
  ok(bassCard && bassCard[b.tier], 'v1.1: endings.player.bass has a card for every tier (contract §5 A4)');
  eq(bt, GG.career.fillText(bass, bassCard[b.tier]), 'the bass seat gets its own player card');
  ok(bt !== at, 'the bass card differs from the drums one');
  // the matcher, with a synthetic member and a synthetic v1.1-style variant
  const kenji = mem(s, 'kenji');
  ok(!L.whenOk(s, kenji, { seatRole: 'drums' }) && L.whenOk(s, kenji, { seatRole: 'bass' }), 'seatRole matches member.role');
  ok(L.whenOk(s, Object.assign({}, kenji, { seatRole: 'drums' }), { seatRole: 'drums' }), 'seatRole matches member.seatRole first');
  const list = GG.content.endings.epilogues.kenji;
  list.unshift({ when: { seatRole: 'drums' }, text: 'A new drum kit arrives every Christmas.' });
  const real = L.epilogues(s, 'arena_legends', []).find(e => e.id === 'kenji').text;
  kenji.seatRole = 'drums';
  const swapped = L.epilogues(s, 'arena_legends', []).find(e => e.id === 'kenji').text;
  list.shift(); delete kenji.seatRole;
  ok(!/drum kit/.test(real) && /drum kit/.test(swapped), 'the swapped-drummer variant fires only for a member in the drum seat');
  // v1.1: the swapped drummers' variants use seatRole (Lane A); they never fire on the drum seat (nobody's seatRole is drums)
  const drumSeat = Object.keys(GG.content.endings.epilogues).filter(id => mem(s, id)).every(id => {
    const t = L.epilogues(s, 'arena_legends', []).find(e => e.id === id); return !t || !/drum kit arrives/.test(t.text); });
  ok(drumSeat, 'on the drum seat no swapped-drummer variant fires');
});

test('bonus years: World by week 120 → +3 (312), 121..144 → +2 (288), 145 → none; once; refused after the Sad Dome news / final / from year 10; noBonus', () => {
  const GG = fresh(), L = GG.legacy, evs = [];
  GG.on('legacy:bonus', e => evs.push(e));
  function at(ww, extra) {
    const s = blank(GG); s.totalWeek = Math.max(ww, 60); s.year = Math.floor((s.totalWeek - 1) / 24) + 1; s.week = (s.totalWeek - 1) % 24 + 1;
    s.eraHistory = [{ era: 'garage', week: 1 }, { era: 'local', week: 20 }, { era: 'signed', week: 50 }, { era: 'world', week: ww }]; s.era = 'world';
    return Object.assign(s, extra || {});
  }
  const s = at(120), wrap = { milestones: [], chat: [] }, rng0 = s.rng, chat0 = s.chat.length;
  eq(L.bonusFor(s), 3);
  eq(L.weekly(s, wrap), { years: 3, maxWeeks: 312 }, 'granted on the spot');
  ok(s.bonusYears === 3 && s.maxWeeks === 312 && L.finalYear(s) === 13 && GG.rival.finalAt(s).year === 13 && GG.rival.finalAt(s).week === 21, 'the career runs 13 years; the Sad Dome moves to year 13 week 21');
  ok(wrap.milestones.length === 1 && /thirteen years/i.test(wrap.milestones[0]) && wrap.bonus && wrap.bonus.years === 3, 'a wrap milestone line');
  ok(s.chat.length === chat0 + 1 && s.chat[s.chat.length - 1].who === GG.career.roleOf(s, '@front') && wrap.chat.length === 1, 'a bandmate\'s message (@front)');
  eq(evs, [{ years: 3, maxWeeks: 312 }], "'legacy:bonus' once");
  eq(L.yearsText(s), 'Thirteen years.');
  eq(L.weekly(s, {}), null, 'once only'); eq([s.bonusYears, s.maxWeeks, evs.length], [3, 312, 1]);
  eq(s.rng, rng0, 'the career RNG untouched');
  eq([L.bonusFor(at(121)), L.bonusFor(at(144)), L.bonusFor(at(145))], [2, 2, 0], '121 and 144 → +2, 145 → none');
  const two = at(130); L.weekly(two, {}); eq([two.bonusYears, two.maxWeeks, L.yearsText(two)], [2, 288, 'Twelve years.']);
  const none = at(145); eq([L.weekly(none, {}), none.maxWeeks, L.yearsText(none)], [null, 240, 'Ten years.']);
  const news = at(100); news.rival.finalNews = true; eq([L.weekly(news, {}), news.maxWeeks], [null, 240], 'refused once the Sad Dome is announced');
  const fin = at(100, { finalShowdown: { headliner: 'you' } }); eq([L.weekly(fin, {}), fin.maxWeeks], [null, 240], 'refused after the final');
  const y10 = at(100); y10.totalWeek = 220; y10.year = 10; y10.week = 4; eq([L.weekly(y10, {}), y10.maxWeeks], [null, 240], 'refused from year 10 on');
  const ready = blank(GG); ready.milestones.worldReady = 110; ready.totalWeek = 110; ready.year = 5; eq(L.bonusFor(ready), 3, 'milestones.worldReady when the World era never came');
  L.noBonus = true; const nb = at(90); eq([L.bonusFor(nb), L.weekly(nb, {}), nb.maxWeeks], [0, null, 240], 'noBonus: never'); L.noBonus = false;
});

test('the v0.9 fixtures: World at week 103 saved in year 9 → +3 at the next wrap; year 10 with the Sad Dome announced → none', () => {
  const GG = fresh(), L = GG.legacy;
  const a = GG.save.migrate(fixture('v09_world_y9').state);
  eq([a.bonusYears, a.maxWeeks], [0, 240], 'migrate never grants');
  GG.career.botWeek(a, 'good');
  ok(a.bonusYears === 3 && a.maxWeeks === 312 && GG.rival.finalAt(a).year === 13, 'v09_world_y9: granted at its next wrap (+3, 312, the Sad Dome in year 13)');
  const b = GG.save.migrate(fixture('v09_y10w14').state);
  for (let i = 0; i < 3; i++) GG.career.botWeek(b, 'good');
  ok(b.bonusYears === 0 && b.maxWeeks === 240 && GG.rival.finalAt(b).year === 10 && L.worldWeek(b) <= 144, 'v09_y10w14: none (the Sad Dome already announced), the final stays in year 10');
  const c = GG.save.migrate(fixture('v09_ended').state), lg = L.compute(c);
  ok(lg.score > 0 && lg.score <= 1000 && lg.years === 10 && lg.raw.venue, 'v09_ended: an ending from the old save (' + lg.score + ', ' + lg.tier + ')');
});

test('compute is pure, finish is idempotent (one legacy:done), hofEntry (seat, no at/ver, difficulty), the career RNG untouched by every call', () => {
  const GG = fresh(), L = GG.legacy, done = [];
  GG.on('legacy:done', e => done.push(e.legacy.score));
  const s = GG.save.migrate(fixture('v09_ended').state);
  s.careerDifficulty = 'brutal';
  const before = JSON.stringify(s);
  const lg = L.compute(s); L.text(s, lg); L.hofEntry(s); L.parts(s); L.specials(s); L.epilogues(s, lg.tier, lg.specials); L.bonusFor(s); L.worldWeek(s); L.finalYear(s); L.yearsText(s);
  eq(JSON.stringify(s), before, 'compute / text / hofEntry / parts / specials / epilogues write nothing');
  const f1 = L.finish(s), f2 = L.finish(s);
  ok(f1 === f2 && s.legacy === f1 && done.length === 1 && f1.score === lg.score, 'finish: stored once, one legacy:done');
  eq(s.rng, JSON.parse(before).rng, 'the career RNG untouched');
  const e = L.hofEntry(s);
  ok(e.seat === 'drums' && !('at' in e) && !('ver' in e) && e.difficulty === s.careerDifficulty && e.id === GG.meta.careerId(s) && e.score === lg.score && e.tier === lg.tier, 'hofEntry: seat drums, no at / ver, the difficulty badge, the stored score');
  ok(e.strip.length === s.recaps.length && e.lineup.length === s.members.length && e.stats.fans === s.fans && e.rival.name && e.bandId === 'gravel_kings', 'hofEntry: strip, lineup, stats, rival');
  const g = GG.save.migrate(fixture('v09_ended').state); g.legacy = { v: 1, score: 640, parts: {}, specials: [] };
  ok(L.hofEntry(g).score === 640 && L.hofEntry(g).tier === 'canadian_institution', 'a stored partial legacy wins (tier from its score)');
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', '2f_sim_legacy.js'), 'utf8');
  ok(!/Math\.random|\bDate\b|document\.|window\.(?!GG)/.test(src), '2f_sim_legacy.js is pure');
});

test("bonus chat: a band's own line speaks as its original; if that member is gone, the generic '@front' line", () => {
  const GG = fresh(), L = GG.legacy, E_GENERIC = [].concat(...Object.values(GG.content.endings.bonus.chat));
  [['hail_damage', 'marcel', /Mes amis|cape|lawn|Abyssus/], ['gravel_kings', 'chase', /babies|1985/], ['frost_heave', 'benny', /council|motion/],
   ['grid_road_ramblers', 'travis', /truck|broken heart/]].forEach(([band, who, voice]) => {
    const mk = gone => {
      const s = blank(GG, band); s.totalWeek = 120; s.year = 5; s.week = 24; s.era = 'world';
      s.eraHistory = [{ era: 'garage', week: 1 }, { era: 'local', week: 20 }, { era: 'signed', week: 50 }, { era: 'world', week: 120 }];
      if (gone) s.members.find(m => m.id === who).status = 'quit';
      const wrap = { chat: [] }; L.weekly(s, wrap); return wrap.chat[0];
    };
    const kept = mk(false), left = mk(true);
    ok(kept && kept.who === who && voice.test(kept.text), band + ': ' + who + ' posts the band line');
    ok(left && left.who !== who && !voice.test(left.text) && E_GENERIC.includes(left.text), band + ': ' + who + ' gone, the generic line (' + (left && left.who) + ': ' + (left && left.text) + ')');
  });
});

test('one 312-week bonus career per band (good bot): no exceptions, the Sad Dome in the last year, bonus cards drawn, a clean ending', () => {
  const GG = fresh(), K = GG.content;
  BANDS.forEach(band => {
    const s = GG.career.newCareer({ seed: 7919, bandId: band, player: { name: 'Bot' } }), diff = s.careerDifficulty;
    let weeks = 0;
    while (!s.ended && weeks++ < 400) GG.career.botWeek(s, 'good');
    const lg = s.legacy, fy = GG.legacy.finalYear(s);
    ok(s.ended && [2, 3].includes(s.bonusYears) && s.maxWeeks === 240 + 24 * s.bonusYears && s.totalWeek === s.maxWeeks && weeks === s.maxWeeks, band + ': ' + s.maxWeeks + ' weeks (+' + s.bonusYears + ')');
    ok(s.finalShowdown && s.finalShowdown.week === (fy - 1) * 24 + 21, band + ': the Sad Dome in year ' + fy + ' week 21 (' + (s.finalShowdown && s.finalShowdown.week) + ')');
    ok(s.careerDifficulty === diff, band + ': careerDifficulty unchanged');
    ok(Object.keys(s.seenCards).some(id => id.startsWith('bonus_' + band)) && !Object.keys(s.seenCards).some(id => /^bonus_/.test(id) && !id.startsWith('bonus_' + band)), band + ': its own bonus cards came up in the bonus years');
    ok(lg && lg.v === 1 && lg.score === Object.values(lg.parts).reduce((a, b) => a + b, 0) && lg.years === fy && lg.bonusYears === s.bonusYears, band + ': the ending (' + lg.score + ', ' + lg.tier + ')');
    ok(s.recaps.length === fy, band + ': a recap per year (' + s.recaps.length + ')');
    // nothing in this ending names another band
    const others = [];
    Object.values(K.bands).filter(b => b.id !== band).forEach(b => { others.push(b.name, K.rivals[b.rival].name); b.members.forEach(m => others.push(m.name)); });
    const tx = GG.legacy.text(s, lg), all = [tx.tier.name, tx.tier.line, tx.rival].concat(tx.specials.map(x => x.name + ' ' + x.line), lg.epilogues.map(e => e.name + ' ' + e.text)).join(' | ');
    const re = new RegExp('\\b(' + others.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\b');
    ok(!re.test(all), band + ': no other band in the ending ' + (all.match(re) || [''])[0]);
  });
});

done('sim_legacy');
