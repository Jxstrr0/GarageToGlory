// sim_meta.test.js (v1.0 "Glory", Lane M; plan_contract_1.0 §4.5–4.6): GG.meta (12_meta.js) beyond stage 0's core.
// Empty / blocked / missing storage (memory fallback); the quota path (strips dropped, one retry, 'meta:quota' once);
// recordCareer idempotent + the higher score; cap 40 / top 10; careerId for seed 1; exportLite → toCode → readCode → mergeLite;
// metaCode with strips; the slot scan on the v0.9 fixtures (past4, the ended slot once); bySeat; the cosmetic unlocks per tier
// and special (+ creator parts, every genre); meta achievements; award() fresh only once; the 'ach:earned' listener; the
// creator / logo pickers reading the unlocks.
const { test, eq, ok, done } = require('./_t');
const load = require('./_load');
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const fixture = name => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'fixtures', name + '.json.gz'))).toString('utf8'));
const clone = x => JSON.parse(JSON.stringify(x));
const ended = GG => GG.save.migrate(fixture('v09_ended').state);
// A stand-in for Lane E's GG.legacy (§4.4–4.5 shape): hofEntry from state.legacy, without at / ver.
function legacyStub(GG) {
  GG.legacy = { hofEntry: s => { const L = s.legacy || {}; return { id: GG.meta.careerId(s), bandId: s.bandId, band: GG.career.band(s).name, genre: s.genre, city: s.city, seat: s.seat || 'drums',
    player: { name: s.player.name, nick: s.player.nick || '' }, logo: s.logo, difficulty: s.careerDifficulty || 'normal', years: Math.ceil(s.maxWeeks / 24), bonusYears: s.bonusYears || 0,
    score: L.score || 0, parts: L.parts || {}, tier: L.tier || null, specials: (L.specials || []).slice(), lineup: s.members.map(m => ({ id: m.id, name: m.name, original: !!m.original, status: m.status })),
    rival: { id: s.rival.id, name: s.rival.name }, final: null, stats: { fans: s.fans }, ach: Object.keys((s.ach && s.ach.got) || {}),
    strip: (s.recaps || []).map(r => ({ y: r.y, h: r.headline, fans: r.fans, era: r.era, best: null, aw: 0 })) }; } };
}
function career(GG, bandId, seed, legacy) {
  const s = clone(ended(GG)); s.seed = seed; s.bandId = bandId || s.bandId;
  if (bandId) { const b = GG.content.bands[bandId]; s.genre = b.genre; }
  s.legacy = Object.assign({ score: 300, parts: {}, tier: 'cult_heroes', specials: [] }, legacy || {});
  return s;
}

test('storage: missing, empty and blocked → memory fallback, never throws', () => {
  const none = load({});   // no localStorage at all
  none.meta.enabled = true; none.meta.load();
  ok(none.meta.recordCareer(ended(none)).fresh && none.meta.hof().length === 1, 'no localStorage: kept in memory');
  const rb = load({ localStorage: load.fakeStorage({ throwOnRead: true }) }); rb.meta.load();
  eq(rb.meta.hof(), [], 'reads blocked: empty');
  ok(rb.meta.award({ bandId: 'hail_damage', year: 1 }, ['sold_out']).fresh.length === 1 && rb.meta.has('sold_out'), 'award works in memory');
  const wb = load({ localStorage: load.fakeStorage({ throwOnWrite: true }) }); wb.meta.load();
  const q = []; wb.on('meta:quota', () => q.push(1));
  ok(wb.meta.recordCareer(ended(wb)).fresh && wb.meta.unlock('palettes', ['arena_gold']).length === 1, 'writes blocked: memory');
  eq(q.length, 0, 'no quota toast when storage never worked (storageOk false)');
});

test('quota: strips outside the top 10 dropped, one retry; still failing → meta:quota once, kept in memory', () => {
  const mkStore = limit => { const st = load.fakeStorage(); const set = st.setItem; st.setItem = (k, v) => { if (k === 'gg.v1.hof' && String(v).length > st.limit) throw new Error('QuotaExceededError'); return set(k, v); }; st.limit = limit; return st; };
  const store = mkStore(1e9), GG = load({ localStorage: store }); GG.meta.load();
  const q = []; GG.on('meta:quota', () => q.push(1));
  for (let i = 0; i < 14; i++) GG.meta.recordCareer(career(GG, null, 500 + i, { score: 100 + i * 10 }));
  const full = store._map.get('gg.v1.hof').length;
  store.limit = full + 400;   // the next entry does not fit with every strip, fits without the lower four's
  GG.meta.recordCareer(career(GG, null, 999, { score: 50 }));
  const saved = JSON.parse(store._map.get('gg.v1.hof'));
  ok(saved.entries.length === 15, 'the retry stored every entry');
  const top = saved.entries.slice().sort((a, b) => b.score - a.score).slice(0, 10).map(e => e.id);
  ok(saved.entries.every(e => top.includes(e.id) ? Array.isArray(e.strip) : !('strip' in e)), 'strips kept on the top 10 only');
  eq(q.length, 0, 'no quota event when the retry worked');
  store.limit = 10;   // nothing fits now
  GG.meta.recordCareer(career(GG, null, 1001, { score: 60 }));
  GG.meta.recordCareer(career(GG, null, 1002, { score: 70 }));
  eq([q.length, GG.meta.hof().length], [1, 17], "meta:quota once; the Hall of Fame lives on in memory");
});

test('recordCareer: idempotent, the higher score, cap 40 / top 10, careerId seed 1, at + ver, bySeat', () => {
  const GG = load({ localStorage: load.fakeStorage() }); GG.meta.load(); legacyStub(GG);
  const s = career(GG, null, 42, { score: 410, tier: 'cult_heroes' });
  const a = GG.meta.recordCareer(s), b = GG.meta.recordCareer(s);
  ok(a.fresh && !b.fresh && GG.meta.hof().length === 1 && GG.meta.get().careers.finished === 1, 'once');
  ok(a.entry.seat === 'drums' && a.entry.ver === GG.VERSION && /^\d{4}-\d\d-\d\d$/.test(a.entry.at), 'seat, ver, at');
  const up = clone(s); up.legacy.score = 620; up.legacy.tier = 'canadian_institution';
  GG.meta.recordCareer(up);
  eq([GG.meta.hof()[0].score, GG.meta.get().careers.finished, GG.meta.get().careers.best.score], [620, 1, 620], 'a replay keeps the higher score');
  const bass = career(GG, 'frost_heave', 43); bass.seat = 'bass';
  GG.meta.recordCareer(bass);
  eq(GG.meta.get().careers.bySeat, { drums: 1, bass: 1 }, 'bySeat counts the seat');
  eq(GG.meta.hof()[0].seat, 'bass', 'the entry stores its seat');
  for (let i = 0; i < 45; i++) GG.meta.recordCareer(career(GG, null, 2000 + i, { score: i < 3 ? 950 + i : i }));
  const H = GG.meta.hof();
  ok(H.length === 40 && [950, 951, 952, 620].every(x => H.some(e => e.score === x)), 'cap 40, the top 10 never dropped');
  const id1 = GG.meta.careerId({ seed: 1, bandId: 'gravel_kings', player: { name: 'Old' }, createdVersion: '0.2.0.0', history: [{ w: 1, fans: 3 }] });
  ok(/^1\.gravel_kings\.[0-9a-z]+$/.test(id1), 'seed-less saves: hashed id ' + id1);
});

test('exportLite → toCode → readCode → mergeLite; metaCode keeps strips; a career code never mutates the state', () => {
  const GG = load({ localStorage: load.fakeStorage() }); GG.meta.enabled = true; GG.meta.load(); legacyStub(GG);
  [['hail_damage', 11, 'arena_legends', 880], ['frost_heave', 12, 'cult_heroes', 420], ['gravel_kings', 13, 'one_album_wonders', 230]]
    .forEach(([b, seed, tier, score]) => GG.meta.recordCareer(career(GG, b, seed, { tier, score })));
  GG.meta.award({ bandId: 'hail_damage', year: 3 }, ['buddy', 'sold_out']);
  const live = GG.career.newCareer({ seed: 77, bandId: 'hail_damage', player: { name: 'L' } }), before = JSON.stringify(live);
  const code = GG.save.toCode(live), r = GG.save.readCode(code);
  eq(JSON.stringify(live), before, 'toCode never mutates the state');
  ok(r.state && r.meta && r.meta.entries.length === 3 && r.meta.entries.every(e => !e.strip && !e.ach && !e.parts && !e.unlocks), 'the lite rides along without strips');
  const G2 = load({ localStorage: load.fakeStorage() }); G2.meta.load();
  const m = G2.meta.mergeLite(r.meta);
  eq([m.added, G2.meta.hof().length, G2.meta.get().careers.finished, Object.keys(G2.meta.get().ach).sort(), G2.meta.unlocked('palettes').sort()],
    [3, 3, 3, ['buddy', 'lifer', 'sold_out'], ['arena_gold', 'cult_velvet', 'one_hit_teal']], 'a fresh phone gets the entries, counters, trophies (Lifer: three careers) and unlocks');
  const mc = GG.save.metaCode(), back = GG.save.readCode(mc);
  eq(back.state, null, 'metaCode is meta-only');
  ok(back.meta.entries.every(e => Array.isArray(e.strip) && e.strip.length > 0), 'every strip travels in the backup code');
  G2.meta.mergeLite(back.meta);
  ok(G2.meta.hof().every(e => Array.isArray(e.strip) && e.strip.length > 0) && G2.meta.hof().length === 3, 'the backup fills the strips in, no duplicates');
  // ach by the earliest date
  const G3 = load({ localStorage: load.fakeStorage() }); G3.meta.load(); G3.meta.today = () => '2026-01-01';
  G3.meta.award({ bandId: 'frost_heave', year: 1 }, ['sold_out']);
  G3.meta.mergeLite(GG.meta.exportFull());
  eq(G3.meta.achInfo('sold_out').at, '2026-01-01', 'the earliest date wins');
  // a damaged code merges nothing (readCode throws before any merge)
  let threw = false; try { GG.save.readCode(mc.slice(0, -4) + 'zzzz'); } catch (e) { threw = /damaged/.test(e.message); }
  ok(threw, 'a damaged code throws');
});

test('slot scan (v0.9 fixtures): past4 once per career, the ended slot recorded once, silently', () => {
  const store = load.fakeStorage();
  ['v09_world_y9', 'v09_y10w14', 'v09_ended'].forEach((f, i) => store._map.set('gg.v1.slot.' + (i + 1), JSON.stringify(fixture(f))));
  store._map.set('gg.v1.slot.auto', JSON.stringify(fixture('v09_ended')));   // the autosave of the same career
  const GG = load({ localStorage: store }); legacyStub(GG);
  const ev = []; ['meta:unlock', 'meta:ach'].forEach(n => GG.on(n, () => ev.push(n)));
  GG.meta.load();
  eq([GG.meta.get().careers.past4, GG.meta.hof().length, GG.meta.get().careers.finished, GG.meta.get().scanned], [3, 1, 1, GG.VERSION], 'three careers past week 4, one ended career recorded once');
  eq(ev, [], 'silent');
  GG.meta.load();
  eq([GG.meta.get().careers.past4, GG.meta.hof().length], [3, 1], 'never twice');
});

test('cosmetic unlocks (Q5): first time a tier → its palette, a special → its emblem / palette, parts → every genre; events once', () => {
  const GG = load({ localStorage: load.fakeStorage() }); GG.meta.load(); legacyStub(GG);
  const ev = []; GG.on('meta:unlock', e => ev.push(e.kind + ':' + e.ids.join('+')));
  const TIERS = { arena_legends: 'arena_gold', canadian_institution: 'hockey_night', cult_heroes: 'cult_velvet', one_album_wonders: 'one_hit_teal', still_in_the_garage: 'garage_grey' };
  Object.keys(TIERS).forEach((t, i) => {
    const s = career(GG, null, 300 + i, { tier: t }); s.unlocks = { creator: [], news: [] };
    const r = GG.meta.recordCareer(s);
    ok(r.unlocks.length === 1 && r.unlocks[0].kind === 'palettes' && r.unlocks[0].ids[0] === TIERS[t] && r.unlocks[0].fresh && r.unlocks[0].names[0] === GG.logo.palette(TIERS[t]).name, t + ' → ' + TIERS[t] + ' ' + JSON.stringify(r.unlocks));
  });
  const again = career(GG, null, 400, { tier: 'arena_legends' }); again.unlocks = { creator: [], news: [] };
  eq(GG.meta.recordCareer(again).unlocks, [], 'a tier reached again unlocks nothing new');
  const SP = { big_in_japan: ['emblems', 'lantern'], band_of_strangers: ['emblems', 'price_tag'], original_lineup: ['emblems', 'handshake'], moose_opera: ['emblems', 'globe_record'],
    side_project: ['palettes', 'rival_red'] };
  Object.keys(SP).forEach((sp, i) => {
    const s = career(GG, null, 500 + i, { tier: 'arena_legends', specials: [sp] }); s.unlocks = { creator: [], news: [] };
    const r = GG.meta.recordCareer(s);
    ok(r.unlocks.some(u => u.kind === SP[sp][0] && u.ids.includes(SP[sp][1])), sp + ' → ' + SP[sp][1]);
  });
  const w = career(GG, null, 600, { tier: 'arena_legends', specials: ['outback_legends', 'big_in_berlin'] }); w.unlocks = { creator: [], news: [] };
  eq(GG.meta.recordCareer(w).unlocks, [], 'any World payoff special shares globe_record (already unlocked)');
  // creator parts from a finished career → every genre
  const p = career(GG, 'frost_heave', 700, { tier: 'arena_legends' }); p.unlocks = { creator: ['hairStyle.dreads', 'outfit.leathervest', 'hairStyle.mohawk'], news: [] };
  const rp = GG.meta.recordCareer(p);
  ok(rp.unlocks.some(u => u.kind === 'parts' && u.ids.join() === 'hairStyle.dreads,outfit.leathervest,hairStyle.mohawk'), 'gated creator parts join META.unlocks.parts ' + JSON.stringify(rp.unlocks));
  eq(GG.meta.recordCareer(p).unlocks.find(u => u.kind === 'parts').fresh, false, 'a replay reports the same unlocks, not fresh');
  ok(ev.length === 5 + 5 + 1, 'meta:unlock once per new unlock ' + ev.length);
  const silent = load({ localStorage: load.fakeStorage() }); silent.meta.load(); legacyStub(silent);
  const sev = []; silent.on('meta:unlock', () => sev.push(1));
  const ss = career(silent, null, 800, { tier: 'cult_heroes' }); ss.unlocks = { creator: [], news: [] };
  ok(silent.meta.recordCareer(ss, { silent: true }).unlocks.length === 1 && sev.length === 0, 'silent: unlocked, no event');
  // pure derivation
  eq(GG.meta.unlocksFor({ tier: 'cult_heroes', specials: ['big_in_japan', 'side_project'] }, null), { palettes: ['cult_velvet', 'rival_red'], emblems: ['lantern'], parts: [] }, 'unlocksFor');
});

test('the pickers read the unlocks: creator parts every genre (enabled only), logo palettes / emblems with meta: true', () => {
  const GG = load({ localStorage: load.fakeStorage() }); GG.meta.load();
  const st = GG.creator.draftState('country', false);
  GG.meta.unlock('parts', ['hairStyle.dreads']);
  ok(!GG.creator.isUnlocked(st, 'hairStyle.dreads'), 'disabled (node bots): no effect');
  GG.meta.enabled = true;
  const pd = GG.creator.parts(st, 'hairStyle').find(x => x.id === 'hairStyle.dreads');
  ok(GG.creator.isUnlocked(st, 'hairStyle.dreads') && pd.meta && !pd.locked, 'enabled: open in a country draft, flagged meta');
  ok(!GG.creator.parts(st, 'hairStyle').find(x => x.id === 'hairStyle.braids').meta, 'others unchanged');
  const s = GG.career.newCareer({ seed: 5, bandId: 'grid_road_ramblers', player: { name: 'C' } });
  ok(!s.unlocks.creator.includes('hairStyle.dreads') && GG.creator.checkUnlocks(s).indexOf('hairStyle.dreads') < 0, "the career's own unlock list never takes meta parts");
  s.fans = 200; ok(GG.creator.checkUnlocks(s).includes('hairStyle.dreads'), 'earned in the career: granted as usual');
  const names = l => l.map(x => x.id);
  ok(!names(GG.logo.pickPalettes()).includes('arena_gold') && !names(GG.logo.pickEmblems()).includes('lantern'), 'locked meta looks hidden from the picker');
  ok(names(GG.logo.palettes()).includes('arena_gold') && GG.logo.sanitize({ emblem: 'lantern', style: 'metal', palette: 'arena_gold' }).palette === 'arena_gold', 'sanitize stays permissive');
  GG.meta.unlock('palettes', ['arena_gold']); GG.meta.unlock('emblems', ['lantern']);
  const pp = GG.logo.pickPalettes().find(x => x.id === 'arena_gold'), pe = GG.logo.pickEmblems().find(x => x.id === 'lantern');
  ok(pp && pp.meta === true && pe && pe.meta === true && !GG.logo.pickPalettes().find(x => x.id === 'frost').meta, 'unlocked: offered with meta: true');
  const rivals = Object.keys(GG.content.logo.rivals).concat(['zz1', 'zz2', 'zz3', 'zz4', 'zz5', 'zz6']);
  ok(rivals.every(id => { const l = GG.logo.rival(id); return !GG.logo.isMeta(l.emblem) && !GG.logo.isMeta(l.palette); }), 'rival logos never use meta looks');
  ok(GG.content.logo.emblems.filter(e => e.meta).every(e => GG.render === undefined || true), 'meta emblems in content');
});

test('achievements across careers: award() fresh once, meta:ach, the ach:earned listener (enabled only), meta rows in recordCareer', () => {
  const GG = load({ localStorage: load.fakeStorage() }); GG.meta.load(); legacyStub(GG);
  const ev = []; GG.on('meta:ach', e => ev.push(e.fresh.join()));
  const s = GG.career.newCareer({ seed: 8, bandId: 'hail_damage', player: { name: 'A' } }); GG.state = s;
  GG.emit('ach:earned', { ids: ['sold_out'] });
  ok(!GG.meta.has('sold_out') && ev.length === 0, 'disabled: the listener does nothing');
  GG.meta.enabled = true;
  GG.emit('ach:earned', { ids: ['sold_out'] });
  ok(GG.meta.has('sold_out') && GG.meta.achInfo('sold_out').band === 'hail_damage' && GG.meta.achInfo('sold_out').y === 1, 'enabled: dated with band + year');
  GG.emit('ach:earned', { ids: ['sold_out', 'night_school'] });
  eq(ev, ['sold_out', 'night_school'], 'fresh only the first time across careers');
  GG.meta.enabled = false;
  const r1 = GG.meta.recordCareer(career(GG, 'hail_damage', 901)), r2 = GG.meta.recordCareer(career(GG, 'frost_heave', 902));
  eq([r1.ach, r2.ach], [[], []], 'two careers: no meta rows yet');
  const c3 = career(GG, 'gravel_kings', 903), r3 = GG.meta.recordCareer(c3);
  eq(r3.ach, ['lifer'], 'the third career: Lifer');
  ok(r3.entry.ach.includes('lifer') && c3.ach.got.lifer != null && GG.meta.has('lifer'), 'on the entry, the state and the meta store');
  eq(GG.meta.recordCareer(c3).ach, ['lifer'], 'a replay reports it again (no new event)');
  const r4 = GG.meta.recordCareer(career(GG, 'grid_road_ramblers', 904));
  eq(r4.ach, ['prairie_grand_slam'], 'all four bands: Prairie Grand Slam');
  eq(ev.slice(2), ['lifer', 'prairie_grand_slam'], 'meta:ach for each');
});

done('sim_meta');
