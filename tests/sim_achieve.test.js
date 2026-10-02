// sim_achieve.test.js (v1.0 "Glory", Lane M; plan_contract_1.0 §4.6): GG.achieve (2g_sim_achieve.js) + content/achievements.js.
// Every row of the §4.6 table true and false on synthetic states; per-career dedupe across save / reload; retroactive
// state kinds on 'career:loaded' with a v0.9 fixture (counters from 0); the seat gate; bots over 6 years per band; the career
// RNG untouched; purity; content rules (ids unique, kinds, drum words gated, no US places, no other band's names).
const { test, eq, ok, done } = require('./_t');
const load = require('./_load');
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const fixture = name => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'fixtures', name + '.json.gz'))).toString('utf8'));
const BANDS = ['hail_damage', 'frost_heave', 'gravel_kings', 'grid_road_ramblers'];
const fresh = () => load({ localStorage: load.fakeStorage() });
const GG = fresh();
const A = GG.achieve;
function base(bandId, extra) {
  const s = GG.career.newCareer({ seed: 77, bandId: bandId || 'hail_damage', player: { name: 'T' } });
  A.ensure(s);
  return Object.assign(s, extra || {});
}
const def = id => A.def(id);
const T = (s, id, ctx) => A.test(s, def(id).test, ctx);

test('content: ~33+ rows, unique ids, known kinds and whens, nameBySize, gates valid', () => {
  const D = A.defs(), ids = D.map(a => a.id);
  ok(D.length >= 33, 'rows: ' + D.length);
  eq(new Set(ids).size, ids.length, 'unique ids');
  const WHEN = GG.contracts.ACH_WHEN;
  D.forEach(a => {
    ok(a.id && a.name && a.blurb && a.icon, a.id + ': name, blurb, icon');
    ok(A.KINDS.includes(a.test.kind), a.id + ': kind ' + a.test.kind);
    ok(WHEN.includes(a.when), a.id + ': when ' + a.when);
    (a.band || []).forEach(b => ok(BANDS.includes(b), a.id + ': band ' + b));
    (a.seat || []).forEach(x => ok(['drums', 'bass', 'rhythm', 'lead'].includes(x), a.id + ': seat ' + x));
  });
  ok(GG.contracts.ACH_KINDS.every(k => A.KINDS.includes(k)) && A.KINDS.every(k => GG.contracts.ACH_KINDS.includes(k)), 'GG.achieve.KINDS = the advisory C.ACH_KINDS');
  // every §4.6 table id is present
  ['twelve_people', 'the_wall', 'ma_pelouse', 'original_lineup', 'kijiji_all_stars', 'sold_out', 'worst_van', 'block_heater', 'buddy', 'big_in_japan',
    'frostbite', 'chugging_along', 'grey_mug', 'night_school', 'sad_dome', 'read_the_minutes', 'legally_distinct', 'truck_song', 'sponsored_content',
    'power_ballad_blues', 'tailgated', 'overtime', 'statue_season', 'mom_needs_the_garage', 'hat_trick', 'between_periods', 'whos_opening_now',
    'prodigal_bandmate', 'pitchspork_proof', 'moms_basement_tapes', 'gas_station_sushi', 'minus_forty', 'prairie_grand_slam', 'brutal_honesty', 'lifer',
    'global_gonger'].forEach(id => ok(def(id), 'row ' + id));
  eq([A.name(def('original_lineup'), 'hail_damage'), A.name(def('original_lineup'), 'frost_heave'), A.name(def('original_lineup'), 'grid_road_ramblers')],
    ['The Original Five', 'The Original Four', 'The Original Five'], 'nameBySize reads the lineup size');
  eq(['ma_pelouse', 'buddy', 'read_the_minutes', 'sponsored_content', 'legally_distinct', 'power_ballad_blues', 'truck_song', 'tailgated'].map(id => def(id).band[0]),
    ['hail_damage', 'hail_damage', 'frost_heave', 'frost_heave', 'gravel_kings', 'gravel_kings', 'grid_road_ramblers', 'grid_road_ramblers'], 'band twins gated');
});

test('content: drum words only in seat-gated rows; no US places; band-gated text names no other band; no gong on a kit', () => {
  const DRUM = /\b(kit|kits|drum|drums|drummer|sticks|snare|kick|cymbals?|hi-?hat)\b/i;
  const US = /\b(USA|U\.S\.|America|American|United States|New York|Los Angeles|Nashville|Texas|California|Chicago|Seattle|Las Vegas|Hollywood|Florida|Boston|Detroit|Memphis)\b/i;
  const B = GG.content.bands, names = {};
  BANDS.forEach(b => {
    const band = B[b], cast = (GG.content.rivalry && GG.content.rivalry.cast && GG.content.rivalry.cast[band.rival]) || {};
    names[b] = [band.name.replace(/^The /, '')].concat(band.members.map(m => m.name.split(' ')[0]), band.members.map(m => m.nick).filter(Boolean),
      [GG.content.rivals[band.rival].name], (cast.members || []).map(m => String(m.name || '').split(' ')[0]).filter(n => n.length > 2));
  });
  A.defs().forEach(a => {
    const text = a.name + ' ' + a.blurb + ' ' + Object.values(a.nameBySize || {}).join(' ');
    if (DRUM.test(text)) ok(a.seat && a.seat.length === 1 && a.seat[0] === 'drums', a.id + ': drum words need seat: [drums]: ' + text.match(DRUM)[0]);
    ok(!US.test(text), a.id + ': no US places');
    ok(!/gong/i.test(text.replace(/Global Gong(er)?/g, '')), a.id + ': no gong except the Global Gong award');
    const own = a.band || [];
    BANDS.filter(b => !own.includes(b)).forEach(b => {
      if (!own.length && !a.band) {   // a general row names no band's people at all
        names[b].forEach(n => ok(!new RegExp('\\b' + n + '\\b').test(text), a.id + ': general text names ' + n));
      } else names[b].forEach(n => ok(!new RegExp('\\b' + n + '\\b').test(text), a.id + ' (' + own + '): names ' + b + "'s " + n));
    });
  });
});

test('kinds: milestone, bannedInYear, releasedFr, originals, award', () => {
  let s = base();
  ok(!T(s, 'sold_out') && !T(s, 'twelve_people'), 'milestones: false on a fresh career');
  s.milestones.soldOut = 30; ok(T(s, 'sold_out'), 'milestone soldOut');
  s.stats.gigs = 1; ok(T(s, 'twelve_people'), 'firstGig from the gig count (the milestone lands at the wrap)');
  s = base(); s.year = 3; s.ach.t.bans = { 3: 2 }; ok(!T(s, 'the_wall'), 'two bans in a year: no');
  s.ach.t.bans[3] = 3; ok(T(s, 'the_wall'), 'three bans in a year');
  s.ach.t.bans = { 2: 3 }; ok(!T(s, 'the_wall'), 'three bans in another year: no');
  s = base(); const song = s.songs[0];
  s.albums = [{ id: 'A1', status: 'released', tracks: [song.id], studioId: 'x' }];
  song.fr = false; song.title = 'Plain English Song'; ok(!T(s, 'ma_pelouse'), 'no French title released');
  song.fr = true; ok(T(s, 'ma_pelouse'), 'a released song with one of Marcel\'s French titles');
  s.albums[0].status = 'recorded'; ok(!T(s, 'ma_pelouse'), 'recorded is not released');
  s = base(); ok(T(s, 'original_lineup') && !T(s, 'kijiji_all_stars'), 'everyone still here: Original Five, not Kijiji');
  s.members[1].returns = 1; ok(!T(s, 'original_lineup'), 'a quit-and-return counts as lost');
  s = base(); s.members.forEach(m => { if (m.original) m.status = 'quit'; }); ok(T(s, 'kijiji_all_stars') && !T(s, 'original_lineup'), 'no originals left: Kijiji All-Stars');
  s = base(); s.legacy = { raw: { originals: { start: 4, kept: 0, everQuit: 4 } } }; ok(T(s, 'kijiji_all_stars'), 'reads Lane E\'s legacy.raw.originals when there');
  s = base(); s.awards = [{ year: 2, category: 'worst_van', won: false }]; ok(!T(s, 'worst_van'), 'nominated is not won');
  s.awards.push({ year: 3, category: 'worst_van', won: true }); ok(T(s, 'worst_van'), 'won Worst Van');
});

test('kinds: winterNoBreakdown, rivalLoonieStreak (through gig() / weekly())', () => {
  const run = (bd, protectedOn, n) => {
    const s = base(); s.protected = !!protectedOn; s.year = 2;
    for (let i = 0; i < (n || 3); i++) { s.week = 12 + i; A.gig(s, { km: 220, travel: { breakdown: bd && i === 1 ? { cost: 100 } : null } }, {}); }
    s.week = 16; A.weekly(s, { week: 16, year: 2 });
    return !!s.ach.got.block_heater;
  };
  ok(run(false), 'three away gigs in winter, no breakdown');
  ok(!run(true), 'a breakdown');
  ok(!run(false, true), 'still protected: no');
  ok(!run(false, false, 2), 'two away gigs: no');
  const s0 = base(); s0.protected = false; s0.year = 2;
  for (let i = 0; i < 3; i++) { s0.week = 12 + i; A.gig(s0, { km: 220, travel: {} }, {}); }
  s0.week = 14; A.weekly(s0, { week: 14, year: 2 }); ok(!s0.ach.got.block_heater, 'judged only once the winter is over');
  const streak = (years, bandId) => {
    const s = base(bandId);
    years.forEach((won, i) => { s.year = i + 1; s.loonies = { year: i + 1, done: true, results: [{ rivalWon: won }] }; A.weekly(s, { week: 24, year: i + 1, yearEnd: true }); });
    return Object.keys(s.ach.got);
  };
  ok(streak([true, true, true]).includes('buddy'), 'three years running: Buddy (Hail Damage)');
  ok(!streak([true, false, true, true]).includes('buddy'), 'a gap breaks the run');
  ok(streak([false, true, true, true], 'frost_heave').includes('sponsored_content') && !streak([true, true, true], 'frost_heave').includes('buddy'), 'band twins: Frost Heave gets Sponsored Content, never Buddy');
  ok(streak([true, true, true], 'gravel_kings').includes('power_ballad_blues') && streak([true, true, true], 'grid_road_ramblers').includes('tailgated'), 'Gravel Kings / Ramblers twins');
});

test('kinds: special, tier, final, bonus, difficulty, venuePlayed, flag, stat', () => {
  let s = base();
  ok(!T(s, 'big_in_japan') && !T(s, 'statue_season'), 'no legacy: no ending rows');
  s.legacy = { tier: 'arena_legends', specials: ['big_in_japan'] }; ok(T(s, 'big_in_japan') && T(s, 'statue_season') && !T(s, 'mom_needs_the_garage'), 'special + tier');
  s.legacy = { tier: 'still_in_the_garage', specials: [] }; ok(T(s, 'mom_needs_the_garage') && !T(s, 'big_in_japan'), 'Mom Needs the Garage');
  s = base(); s.finalShowdown = { headliner: 'rival' }; ok(!T(s, 'sad_dome'), 'the rival headlined'); s.finalShowdown.headliner = 'you'; ok(T(s, 'sad_dome'), 'you headlined the Sad Dome');
  s = base(); ok(!T(s, 'overtime')); s.bonusYears = 2; ok(T(s, 'overtime'), 'bonus years');
  s = base(); ok(!T(s, 'brutal_honesty')); s.careerDifficulty = 'brutal'; ok(T(s, 'brutal_honesty'), 'brutal');
  s = base(); ok(!T(s, 'frostbite')); ok(T(s, 'frostbite', { r: { venueId: 'siberian_frostfest' } }), 'played Siberian Frostfest (the gig)');
  s.venuePlays = { siberian_frostfest: 1 }; ok(T(s, 'frostbite'), 'played it (state, retroactive)');
  s = base(); s.flags.greyMug = 'planned'; ok(!T(s, 'grey_mug')); s.flags.greyMug = 'done'; ok(T(s, 'grey_mug'), 'Grey Mug played / done');
  s = base('frost_heave'); s.flags.council = 'lost'; ok(!T(s, 'read_the_minutes')); s.flags.council = 'won'; ok(T(s, 'read_the_minutes'), 'council won');
  s = base('gravel_kings'); s.flags.riff = 'settled'; ok(!T(s, 'legally_distinct')); s.flags.riff = 'original'; ok(T(s, 'legally_distinct'), 'riff original');
  s = base('grid_road_ramblers'); s.flags.truckStory = 'mine'; ok(!T(s, 'truck_song')); s.flags.truckStory = 'famous'; ok(T(s, 'truck_song'), 'truck famous');
  s = base(); s.stats.parentsLoans = 2; ok(!T(s, 'night_school')); s.stats.parentsLoans = 3; ok(T(s, 'night_school'), 'three loans');
});

test('kinds: botbInYear, licensedBrand, crack, returned, reviewBelow, studio, km, weatherGig, gongWon, songKickShare', () => {
  let s = base(); s.year = 4;
  [10, 12].forEach(w => { s.totalWeek = w; A.gig(s, { showdown: { kind: 'botb', won: true, week: w } }, {}); });
  A.gig(s, { showdown: { kind: 'botb', won: true, week: 12 } }, {});   // the same showdown twice counts once
  ok(!s.ach.got.hat_trick && s.ach.t.botb[4] === 2, 'two BotB wins this year');
  s.totalWeek = 14; A.gig(s, { showdown: { kind: 'botb', won: false, week: 14 } }, {}); ok(!s.ach.got.hat_trick, 'a lost BotB does not count');
  s.totalWeek = 16; s.showdowns = [{ kind: 'botb', won: true, week: 16 }]; A.gig(s, {}, {});   // resolved before settleGig: read from state.showdowns
  ok(s.ach.got.hat_trick === 16, 'three BotB wins in one year: Hat Trick');
  s = base(); s.licensing = { deals: [{ brandId: 'truck' }] }; ok(!T(s, 'between_periods')); s.licensing.deals.push({ brandId: 'hockey' }); ok(T(s, 'between_periods'), 'licensed to the hockey package');
  s = base(); s.rival.cracked = 'breakup'; ok(!T(s, 'whos_opening_now')); s.rival.cracked = 'opener'; ok(T(s, 'whos_opening_now'), 'the rival opens for you');
  s = base(); s.members[1].returns = 1; s.members[1].status = 'quit'; ok(!T(s, 'prodigal_bandmate'), 'still gone'); s.members[1].status = 'active'; ok(T(s, 'prodigal_bandmate'), 'came back');
  s = base(); s.albums = [{ id: 'A1', status: 'released', tracks: [], cert: null, reviews: [{ outlet: 'pitchspork', score: 2.4, scale: 10 }] }];
  ok(!T(s, 'pitchspork_proof'), 'not certified'); s.albums[0].cert = 'gold'; ok(T(s, 'pitchspork_proof'), 'gold with a 2.4 from Pitchspork');
  s.albums[0].reviews[0].score = 6.1; ok(!T(s, 'pitchspork_proof'), 'a 6.1 is no proof');
  s.albums[0].reviews[0] = { outlet: 'pitchspork', score: 28, scale: 10 }; ok(T(s, 'pitchspork_proof'), 'a 0..100 score on the 10 scale is converted (2.8)');
  s = base(); s.albums = [{ id: 'A1', status: 'released', studioId: 'garage_rec', tracks: [] }]; ok(!T(s, 'moms_basement_tapes'));
  s.albums.push({ id: 'A2', status: 'released', studioId: 'moms_basement', tracks: [] }); ok(T(s, 'moms_basement_tapes'), "a record from Mom's Basement");
  s = base(); const min = def('gas_station_sushi').test.min;
  A.gig(s, { km: min - 1 }, {}); ok(!s.ach.got.gas_station_sushi, 'just short'); A.gig(s, { km: 1 }, {}); ok(s.ach.got.gas_station_sushi != null, 'the km counter crosses ' + min);
  s = base(); ok(!T(s, 'minus_forty', { r: { temp: -10, weather: 'snow' } }), '-10 and snow: no');
  ok(T(s, 'minus_forty', { r: { temp: -31, weather: 'clear' } }) && T(s, 'minus_forty', { r: { temp: -5, weather: 'blizzard' } }), '-31 or a blizzard');
  ok(!T(s, 'minus_forty'), 'never without a gig');
  s = base(); s.tour.gongs = [{ year: 3, won: false }]; ok(!T(s, 'global_gonger')); s.tour.gongs.push({ year: 4, won: true }); ok(T(s, 'global_gonger'), 'won the Global Gong');
  s = base(); const sg = GG.songs.create(s, GG.songs.starter('metal'), 'Chug', { auto: false });
  sg.pattern.sections.verse = ['xxxxxxxxxxxxxxxx', 'x...x...x...x...', '................', '................'];
  sg.pattern.sections.chorus = sg.pattern.sections.bridge = sg.pattern.sections.verse;
  ok(A.kickShare(sg) >= 0.5 && T(s, 'chugging_along'), 'a kick-heavy metal song you wrote: ' + A.kickShare(sg).toFixed(2));
  sg.auto = true; ok(!T(s, 'chugging_along'), 'one the band jammed does not count');
  sg.auto = false; sg.pattern.sections.verse = sg.pattern.sections.chorus = sg.pattern.sections.bridge = ['x...x...x...x...', 'xxxxxxxxxxxxxxxx', 'xxxxxxxxxxxxxxxx', '................'];
  ok(!T(s, 'chugging_along'), 'a snare-heavy song: no');
});

test('gates: band and seat (a bass seat never earns Chugging Along; another band\'s row never evaluates)', () => {
  const mk = seat => { const s = base(); if (seat) s.seat = seat; const sg = GG.songs.create(s, GG.songs.starter('metal'), 'Chug', { auto: false });
    sg.pattern.sections.verse = sg.pattern.sections.chorus = sg.pattern.sections.bridge = ['xxxxxxxxxxxxxxxx', '................', '................', '................']; return s; };
  const d = mk(), b = mk('bass');
  A.check(d, 'week'); A.check(b, 'week');
  ok(d.ach.got.chugging_along != null, 'drums (state.seat missing = drums): earned');
  ok(b.ach.got.chugging_along == null, 'seat bass: never');
  const s = base('hail_damage'); s.flags.council = 'won'; s.flags.riff = 'original'; s.flags.truckStory = 'famous';
  A.check(s, 'week');
  ok(!['read_the_minutes', 'legally_distinct', 'truck_song'].some(id => s.ach.got[id] != null), 'another band\'s storyline rows never fire in a Hail Damage career');
  eq(A.view(s, 'read_the_minutes').open, false, 'view(): another band\'s row is not open here');
});

test('dedupe per career across save / reload; ach:earned once; the views', () => {
  const G = fresh(), evs = [];
  G.on('ach:earned', p => evs.push(p.ids.join()));
  const s = G.career.newCareer({ seed: 9, bandId: 'hail_damage', player: { name: 'D' } });
  s.milestones.soldOut = 3; s.stats.parentsLoans = 3;
  const first = G.achieve.check(s, 'week');
  eq(first.sort(), ['night_school', 'sold_out'], 'two rows earned');
  const back = G.save.fromCode(G.save.toCode(s));
  eq(back.ach.got, s.ach.got, 'got survives a save code');
  eq(G.achieve.check(back, 'week'), [], 'nothing twice after a reload');
  eq(G.achieve.check(back, 'load'), [], 'nor on load');
  eq(evs.length, 1, 'ach:earned once');
  const v = G.achieve.list(s);
  ok(v.length === G.achieve.defs().length && v.find(x => x.id === 'sold_out').got === s.totalWeek && v.find(x => x.id === 'the_wall').got === null, 'list(): every row with got');
  eq(G.achieve.earned(s).sort(), ['night_school', 'sold_out']);
});

test('retroactive on career:loaded (v0.9 fixtures): state kinds yes, counters from 0, no counter kinds', () => {
  const G = fresh();
  ['v09_world_y9', 'v09_y10w14', 'v09_ended'].forEach(name => {
    const s = G.save.migrate(fixture(name).state);
    eq(s.ach, { got: {}, t: {} }, name + ': migrate leaves the stage-0 default');
    G.emit('career:loaded', { state: s });
    const got = Object.keys(s.ach.got);
    ok(got.includes('twelve_people'), name + ': Twelve People and a Dog, retroactively (' + got.join(',') + ')');
    ok(!got.some(id => ['the_wall', 'block_heater', 'hat_trick', 'gas_station_sushi', 'minus_forty'].includes(id) || G.achieve.def(id).band && !G.achieve.def(id).band.includes(s.bandId)),
      name + ': no counter / gig-moment kinds, no other band\'s rows');
    ok(s.ended || !got.some(id => G.achieve.def(id).when === 'end'), name + ': no end rows before the end');
    eq([s.ach.t.km, Object.keys(s.ach.t.bans).length, Object.keys(s.ach.t.botb).length], [0, 0, 0], name + ': counters start at 0');
  });
});

test('bots: 6 years per band earn >= 5, never another band\'s row; the career RNG is untouched', () => {
  BANDS.forEach((b, i) => {
    const G = fresh(), seed = 300 + i * 11;
    const s = G.career.newCareer({ seed, bandId: b, player: { name: 'Bot' } });
    for (let w = 0; w < 144; w++) G.career.botWeek(s, 'avg');
    const got = Object.keys(s.ach.got);
    ok(got.length >= 5, b + ': ' + got.length + ' earned (' + got.join(',') + ')');
    ok(got.every(id => !G.achieve.def(id).band || G.achieve.def(id).band.includes(b)), b + ': only its own band rows');
    // the same career without the achievements sim: identical apart from `ach`
    const H = fresh(); delete H.achieve;
    const t = H.career.newCareer({ seed, bandId: b, player: { name: 'Bot' } });
    for (let w = 0; w < 144; w++) H.career.botWeek(t, 'avg');
    const strip = x => { const y = JSON.parse(JSON.stringify(x)); delete y.ach; delete y.wrap; delete y.lastWeek; delete y.lastGig; return JSON.stringify(y); };
    ok(t.rng === s.rng && strip(t) === strip(s), b + ': same career RNG and state with or without GG.achieve');
  });
});

test('purity: 2g_sim_achieve.js has no Math.random, Date, DOM', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', '2g_sim_achieve.js'), 'utf8');
  ok(!/Math\.random|\bDate\b|document\.|window\.(?!GG)/.test(src), '2g_sim_achieve.js is pure');
  const rnd = Math.random; Math.random = () => { throw new Error('Math.random in a sim'); };
  try { const s = base(); A.check(s, 'end'); A.gig(s, { km: 10 }, {}); A.weekly(s, { week: 24, year: 1, yearEnd: true }); } finally { Math.random = rnd; }
});

test('meta rows: allBands and careers evaluate from META.careers (metaIds)', () => {
  const s = base();
  eq(A.metaIds({ finished: 2, byBand: { hail_damage: 1, frost_heave: 1 } }, s), [], 'two careers, two bands: nothing');
  eq(A.metaIds({ finished: 3, byBand: { hail_damage: 2, frost_heave: 1 } }, s), ['lifer'], 'three careers: Lifer');
  eq(A.metaIds({ finished: 4, byBand: { hail_damage: 1, frost_heave: 1, gravel_kings: 1, grid_road_ramblers: 1 } }, s).sort(), ['lifer', 'prairie_grand_slam'], 'all four bands: Prairie Grand Slam');
  eq(A.check(s, 'end').filter(id => A.def(id).when === 'meta'), [], 'check() never evaluates meta rows');
});

done('sim_achieve');
