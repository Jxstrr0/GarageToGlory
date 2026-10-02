// Save tests: slots, broken storage, save codes (compression, checksum, phone copy-paste), migration, settings.
const load = require('./_load');
const { test, ok, eq, done } = require('./_t');

function career(GG, weeks) {
  GG.content.cards = GG.content.cards || [];
  const s = GG.career.newCareer({ seed: 2024, slot: '1', player: { name: 'Zoë Côté', nick: 'Crash' } });
  for (let i = 0; i < (weeks || 0); i++) GG.career.botWeek(s, 'avg');
  return s;
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

test('write/read/list/remove round-trip', () => {
  const store = load.fakeStorage(), GG = load({ localStorage: store });
  ok(GG.save.storageOk, 'storage ok');
  const s = career(GG, 30), evs = [];
  GG.on('save:done', e => evs.push(e.slot));
  eq(GG.save.write('2', s), true); eq(evs, ['2']);
  ok(store._map.has('gg.v1.slot.2'), 'key gg.v1.slot.2');
  const rec = JSON.parse(store._map.get('gg.v1.slot.2'));
  ok(rec.savedAt > 0 && rec.version === load.VERSION, 'record header');
  eq(rec.summary, { band: 'Hail Damage', player: 'Zoë Côté', year: s.year, week: s.week, fans: s.fans, fund: s.fund });
  ok(same(GG.save.read('2'), s), 'read back identical');
  const list = GG.save.list();
  eq(list.map(x => x.slot), ['auto', '1', '2', '3']); eq(list.map(x => x.exists), [false, false, true, false]);
  eq(list[2].summary.fans, s.fans);
  GG.save.remove('2'); eq(GG.save.read('2'), null); eq(GG.save.list()[2].exists, false);
  eq(GG.save.write('9', s), false, 'unknown slot refused');
  store._map.set('gg.v1.slot.3', '{not json'); eq(GG.save.read('3'), null, 'corrupt slot reads as empty');
  eq(GG.save.autosave(s), true); ok(GG.save.read('auto'));
});

test('v1.0: a quota miss is not "no storage" (storageOk stays true, lastError quota)', () => {
  const st = load.fakeStorage(); let full = false; const set = st.setItem;
  st.setItem = (k, v) => { if (full) { const e = new Error('full'); e.name = 'QuotaExceededError'; throw e; } set(k, v); };
  const GG = load({ localStorage: st }), s = career(GG);
  eq([GG.save.storageOk, GG.save.write('1', s)], [true, true]);
  full = true;
  eq([GG.save.write('2', s), GG.save.storageOk, GG.save.lastError], [false, true, 'quota'], 'quota: kept as working storage');
  full = false;
  eq([GG.save.write('2', s), GG.save.lastError], [true, null], 'a later write clears it');
});

test('v1.0: after a quota miss, reads of that slot return this session\'s newer copy, not the older stored one', () => {
  const st = load.fakeStorage(); let full = false; const set = st.setItem;
  st.setItem = (k, v) => { if (full) { const e = new Error('full'); e.name = 'QuotaExceededError'; throw e; } set(k, v); };
  const GG = load({ localStorage: st }), s = career(GG, 10);
  eq(GG.save.write('1', s), true);
  const wk = s.totalWeek; GG.career.botWeek(s, 'avg'); full = true;
  eq([GG.save.write('1', s), GG.save.lastError], [false, 'quota'], 'the second write misses');
  eq([GG.save.read('1').totalWeek, GG.save.list()[1].summary.week], [wk + 1, s.week], 'read + list give the newer week');
  full = false; GG.career.botWeek(s, 'avg');
  eq(GG.save.write('1', s), true); eq(GG.save.read('1').totalWeek, wk + 2, 'a write that persists reads from storage again');
  ok(JSON.parse(st._map.get('gg.v1.slot.1')).state.totalWeek === wk + 2, 'stored');
  full = true; GG.save.write('2', s); GG.save.remove('2'); eq(GG.save.read('2'), null, 'remove clears the session copy too');
});

test('storage throwing on read / on write / missing: memory fallback, no throws', () => {
  for (const opts of [{ throwOnRead: true }, { throwOnWrite: true }]) {
    const GG = load({ localStorage: load.fakeStorage(opts) });
    eq(GG.save.storageOk, false, JSON.stringify(opts));
    const s = career(GG), fails = [];
    GG.on('save:failed', e => fails.push(e.slot));
    eq(GG.save.write('1', s), false, 'not persisted'); eq(fails, ['1']);
    ok(same(GG.save.read('1'), s), 'session copy readable');
    eq(GG.save.list()[1].exists, true);
    eq(GG.save.settings().muted, false); GG.save.saveSettings({ muted: true }); eq(GG.save.settings().muted, true);
  }
  const GG = load({});   // no localStorage at all
  eq(GG.save.storageOk, false); const s = career(GG); GG.save.write('auto', s); ok(same(GG.save.read('auto'), s));
  // storage that starts working and then breaks mid-session
  const flaky = load.fakeStorage(), G2 = load({ localStorage: flaky });
  ok(G2.save.storageOk); const t = career(G2);
  flaky.setItem = () => { throw new Error('QuotaExceededError'); };
  eq(G2.save.write('3', t), false); eq(G2.save.storageOk, false); ok(same(G2.save.read('3'), t));
});

test('settings default + merge', () => {
  const store = load.fakeStorage(), GG = load({ localStorage: store });
  eq(GG.save.settings(), GG.save.SETTINGS_DEFAULTS); eq(GG.save.settings().muted, false);   // v0.6.1: + the C4 defaults
  GG.save.saveSettings({ muted: true, extra: 1 });
  eq(JSON.parse(store._map.get('gg.v1.settings')), { muted: true, extra: 1 });
  GG.save.saveSettings({ extra: 2 }); eq(GG.save.settings(), Object.assign({}, GG.save.SETTINGS_DEFAULTS, { muted: true, extra: 2 }));
  eq(JSON.parse(store._map.get('gg.v1.settings')), { muted: true, extra: 2 });   // only what the player changed is stored
});

test('compression round-trips unicode and repetitive text', () => {
  const GG = load({ localStorage: load.fakeStorage() });
  const cases = ['', 'a', 'abababababababababab', 'Ma Pelouse, Mon Tombeau — “Éternels” 🤘 ñ 中文 𝄞',
    JSON.stringify({ x: Array.from({ length: 3000 }, (_, i) => i % 97) })];
  let big = '', x = 1; for (let i = 0; i < 400000; i++) { x = (x * 1103515245 + 12345) % 2147483648; big += String.fromCharCode(32 + (x >>> 16) % 90); }
  ok(GG.save.compress(big).length * 6 / 16 > 70000, 'more than 65536 LZW codes: the full-dictionary path runs');
  cases.push(big);
  cases.forEach(c => eq(GG.save.decompress(GG.save.compress(c)) === c, true, 'len ' + c.length));
  ok(/^[A-Za-z0-9_-]*$/.test(GG.save.compress(cases[3])), 'base64url alphabet');
});

test('save code round-trip, phone copy-paste tolerant', () => {
  const GG = load({ localStorage: load.fakeStorage() });
  const s = career(GG, 100), code = GG.save.toCode(s);
  ok(code.indexOf('GG1:') === 0 && /^GG1:[A-Za-z0-9_-]+$/.test(code), 'format');
  ok(code.length < JSON.stringify(s).length * 0.75, 'compressed: ' + code.length + ' vs ' + JSON.stringify(s).length);
  ok(same(GG.save.fromCode(code), s), 'plain');
  const messy = '  "' + code.replace(/(.{37})/g, '$1\n').replace(/(.{11})/g, '$1 ​') + '"\r\n';
  ok(same(GG.save.fromCode(messy), s), 'whitespace, zero-width, quotes');
  ok(same(GG.save.fromCode('My save: ' + code + '.'), s), 'surrounding text');
});

test('damaged codes throw a friendly error', () => {
  const GG = load({ localStorage: load.fakeStorage() });
  const code = GG.save.toCode(career(GG, 5));
  const flip = (c, i) => c.slice(0, i) + (c[i] === 'A' ? 'B' : 'A') + c.slice(i + 1);
  const bad = [null, '', 'hello', 'GG1:', 'GG2:' + code.slice(4), code.slice(0, -1), code.slice(0, code.length >> 1),
    flip(code, 10), flip(code, code.length - 3), code + 'x'];
  // a valid checksum around a payload that is not a career
  const body = GG.save.compress(JSON.stringify({ hello: 1 }));
  const withSum = GG.save.toCode({ hello: 1 });
  bad.push(withSum);
  bad.forEach((b, i) => {
    let msg = null; try { GG.save.fromCode(b); } catch (e) { msg = e.message; }
    ok(msg && /^That save code is damaged/.test(msg), 'case ' + i + ' -> ' + msg);
  });
  ok(body.length > 0);
});

test('migrate fills defaults and is idempotent', () => {
  const GG = load({ localStorage: load.fakeStorage() });
  const s = career(GG, 10);
  const m1 = GG.save.migrate(JSON.parse(JSON.stringify(s)));
  ok(same(m1, s), 'current state unchanged');
  ok(same(GG.save.migrate(JSON.parse(JSON.stringify(m1))), m1), 'idempotent');
  const old = { bandId: 'hail_damage', totalWeek: 30, fund: 5, members: [{ id: 'marcel', name: 'Marcel Fontaine', skill: 40, mood: 60 }],
    songs: [{ id: 's1', title: 'Ma Pelouse' }] };
  const m = GG.save.migrate(old);
  eq([m.v, m.year, m.week, m.phase, m.era, m.protected], [GG.contracts.SAVE_SCHEMA, 2, 6, 'monday', 'garage', true]);
  ok(Array.isArray(m.chat) && m.flags && m.chains && m.seenCards && m.stats.gigs === 0 && m.plan.length === 3, 'containers');
  eq([m.members[0].status, m.songs[0].plays, m.songs[0].titleEn, m.songs[0].stale, m.songs[0].classic], ['active', 0, 'Ma Pelouse', 0, false]);
  eq(GG.songs.validate(m.songs[0].pattern, m.gear), [], 'migrated song has a valid pattern');
  ok(same(GG.save.migrate(JSON.parse(JSON.stringify(m))), m), 'idempotent on old saves');
  let threw = false; try { GG.save.migrate(null); } catch (e) { threw = true; } ok(threw, 'null is not a career');
  // a migrated old save can keep playing
  GG.career.startWeek(m); GG.career.setPlan(m, ['rest', 'rest', 'rest']); GG.career.runWeek(m); GG.career.endWeek(m);
  eq(m.totalWeek, 31);
});

test('v0.9: every band saves and loads (slot, code, migrate); a partial save takes its band\'s defaults', () => {
  const GG = load({ localStorage: load.fakeStorage() });
  Object.keys(GG.content.bands).forEach(id => {
    const s = GG.career.newCareer({ seed: 99, bandId: id, slot: '1', player: { name: 'Bot' } });
    for (let i = 0; i < 30; i++) GG.career.botWeek(s, 'avg');
    eq(GG.save.write('1', s), true, id + ' written');
    ok(same(GG.save.read('1'), s), id + ' read back identical');
    ok(same(GG.save.fromCode(GG.save.toCode(s)), s), id + ' save code');
    ok(same(GG.save.migrate(JSON.parse(JSON.stringify(s))), s), id + ' migrate leaves a current save alone');
    const b = GG.content.bands[id], part = JSON.parse(JSON.stringify(s));
    ['genre', 'region', 'city', 'space'].forEach(k => delete part[k]);
    const m = GG.save.migrate(part);
    eq([m.genre, m.region, m.city, m.space], [b.genre, b.region, b.city, b.space], id + ' band defaults, not Hail Damage\'s');
    GG.career.startWeek(m); GG.career.setPlan(m, ['rest', 'book', 'write']); GG.career.runWeek(m, { autoGig: true }); GG.career.endWeek(m);
    eq(m.totalWeek, 32, id + ' keeps playing');
  });
});

// ---- v1.0 stage 0: the five new state fields, save codes with _meta, the meta-only code, 12_meta core -------------------
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const FIX = ['v09_world_y9', 'v09_y10w14', 'v09_ended'];
const fixture = name => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'fixtures', name + '.json.gz'))).toString('utf8'));
const V10 = s => ({ bonusYears: s.bonusYears, legacyTrack: s.legacyTrack, legacy: s.legacy, ach: s.ach, tutorial: s.tutorial });

test('v1.0: v0.9 fixtures (and the v0.1 save) fill all five fields, idempotent, rng untouched, no events', () => {
  const GG = load({ localStorage: load.fakeStorage() });
  const evs = []; const emit = GG.emit; GG.emit = function (n, p) { evs.push(n); return emit.apply(this, arguments); };
  FIX.forEach(name => {
    const rec = fixture(name);
    eq(rec.version, '0.9.0.0', name + ' is a 0.9.0.0 slot record');
    ok(['bonusYears', 'legacyTrack', 'legacy', 'ach', 'tutorial'].every(k => !(k in rec.state)), name + ' has none of the v1.0 fields');
    const m = GG.save.migrate(JSON.parse(JSON.stringify(rec.state)));
    eq(V10(m), { bonusYears: 0, legacyTrack: { bigHead: null }, legacy: null, ach: { got: {}, t: {} }, tutorial: { on: false, done: {}, past4: true } }, name + ' defaults');
    eq([m.rng, m.seed, m.totalWeek, m.maxWeeks, m.ended], [rec.state.rng, rec.state.seed, rec.state.totalWeek, 240, rec.state.ended], name + ' career untouched');
    ok(same(GG.save.migrate(JSON.parse(JSON.stringify(m))), m), name + ' idempotent');
  });
  eq(fixture('v09_ended').state.phase, 'ended'); ok(fixture('v09_y10w14').state.rival.finalNews, 'v09_y10w14 has rival.finalNews');
  const w9 = fixture('v09_world_y9').state, ww = (w9.eraHistory.find(e => e.era === 'world') || {}).week;
  ok(w9.year === 9 && ww <= 120, 'v09_world_y9: World at wk ' + ww + ' (<= 120), year ' + w9.year);
  const v01 = GG.save.migrate(JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'save_v01.json'), 'utf8')).state);
  eq(V10(v01).tutorial, { on: false, done: {}, past4: true }, 'v0.1 save (week 15): past week 4');
  const young = JSON.parse(JSON.stringify(v01)); delete young.tutorial; young.totalWeek = 3;
  eq(GG.save.migrate(young).tutorial.past4, false, 'a save before week 4 is not past4');
  const kept = JSON.parse(JSON.stringify(v01)); kept.bonusYears = 3; kept.tutorial = { on: true, done: { w1_card: 1 }, past4: false }; kept.ach = { got: { the_wall: 9 } };
  const km = GG.save.migrate(kept);
  eq([km.bonusYears, km.tutorial, km.ach], [3, { on: true, done: { w1_card: 1 }, past4: false }, { got: { the_wall: 9 }, t: {} }], 'existing values are never overwritten');
  eq(evs, [], 'migrate emits nothing');
  const fresh = GG.career.newCareer({ seed: 5, bandId: 'frost_heave', player: { name: 'New' } });
  eq(V10(fresh), { bonusYears: 0, legacyTrack: { bigHead: null }, legacy: null, ach: { got: {}, t: {} }, tutorial: { on: false, done: {}, past4: false } }, 'new careers start with the same fields');
});

test('v1.0: old codes restore unchanged; node codes carry no _meta; readCode / fromCode', () => {
  const GG = load({ localStorage: load.fakeStorage() });
  eq(GG.meta.enabled, false, 'meta is off in node');
  const st = GG.save.migrate(fixture('v09_y10w14').state), code = GG.save.toCode(st);
  eq(JSON.parse(GG.save.decompress(code.slice(4, -6))), JSON.parse(JSON.stringify(st)), 'a node code is the plain state JSON (no _meta)');
  const old = fixture('v09_world_y9').state, oldCode = GG.save.toCode(old);   // the 0.9.0.0 code format: GG1 + LZW of the bare state
  const r = GG.save.readCode(oldCode);
  eq(r.meta, null); ok(same(r.state, GG.save.migrate(JSON.parse(JSON.stringify(old)))), 'a v0.9 code restores as its migrated state');
  ok(same(GG.save.fromCode(oldCode), r.state), 'fromCode = readCode().state');
  let threw = 0; ['', 'GG1:', oldCode.slice(0, -3), oldCode.slice(0, 40) + 'x' + oldCode.slice(41)].forEach(c => { try { GG.save.readCode(c); } catch (e) { if (/damaged/.test(e.message)) threw++; } });
  eq(threw, 4, 'damaged codes throw the DAMAGED message');
});

test('v1.0: _meta rides along in browser codes without mutating the state; the meta-only code', () => {
  const store = load.fakeStorage(), GG = load({ localStorage: store });
  GG.meta.enabled = true; GG.meta.load();
  const ended = GG.save.migrate(fixture('v09_ended').state);
  const out = GG.meta.recordCareer(ended);
  ok(out && out.fresh && out.entry.id === GG.meta.careerId(ended) && out.entry.seat === 'drums' && out.entry.ver === GG.VERSION && /^\d{4}-\d\d-\d\d$/.test(out.entry.at), 'an entry with id, seat, ver, at');
  const s = career(GG, 40), before = JSON.stringify(s), code = GG.save.toCode(s);
  eq(JSON.stringify(s), before, 'toCode never mutates the state'); ok(!('_meta' in s), 'no _meta key on the state');
  const r = GG.save.readCode(code);
  eq(r.meta, GG.meta.exportLite(), '_meta = exportLite()'); ok(same(r.state, s), 'the state comes back without _meta');
  ok(r.meta.entries.length === 1 && !('strip' in r.meta.entries[0]) && !('seen' in r.meta.meta) && !('lessons' in r.meta.meta), 'lite: no strip / seen / lessons');
  ok(same(GG.save.fromCode(code), s), 'fromCode ignores _meta');
  const mc = GG.save.metaCode(), m = GG.save.readCode(mc);
  eq(m.state, null, 'meta-only code: no state'); eq(m.meta, GG.meta.exportFull(), 'meta-only code = exportFull()');
  ok(Array.isArray(m.meta.entries[0].strip) && m.meta.entries[0].strip.length === ended.recaps.length, 'full: the year strip travels');
  let threw = false; try { GG.save.fromCode(mc); } catch (e) { threw = /damaged/.test(e.message); } ok(threw, 'fromCode refuses a meta-only code');
  GG.meta.enabled = false; ok(!('_meta' in JSON.parse(GG.save.decompress(GG.save.toCode(s).slice(4, -6)))), 'disabled: no _meta');
});

test('v1.0: 12_meta core: empty/blocked storage, idempotent recordCareer, careerId, lessons, merge, listeners only when enabled', () => {
  const blocked = load({ localStorage: load.fakeStorage({ throwOnWrite: true }) });
  blocked.meta.enabled = true; blocked.meta.load();
  eq(blocked.meta.hof(), []); eq(blocked.meta.get().careers.started, 0);
  const quota = []; blocked.on('meta:quota', () => quota.push(1));
  ok(blocked.meta.recordCareer(blocked.save.migrate(fixture('v09_ended').state)).fresh, 'blocked storage: kept in memory');
  eq([blocked.meta.hof().length, quota.length], [1, 0], 'memory fallback (no quota event without working storage)');

  const store = load.fakeStorage(), GG = load({ localStorage: store });
  GG.legacy = null;   // this test pins the basic (no-Legacy) entry mechanics; the real GG.legacy scores are covered in sim_legacy/sim_meta
  GG.meta.load();
  eq(GG.meta.get().scanned, GG.VERSION, 'an empty install scans once');
  const ended = GG.save.migrate(fixture('v09_ended').state), added = [];
  GG.on('hof:added', e => added.push(e.entry.id));
  const a = GG.meta.recordCareer(ended), b = GG.meta.recordCareer(ended);
  ok(a.fresh && !b.fresh, 'the same career twice: fresh once');
  eq([GG.meta.hof().length, GG.meta.get().careers.finished, GG.meta.get().careers.byBand, GG.meta.get().careers.bySeat], [1, 1, { gravel_kings: 1 }, { drums: 1 }]);
  eq(added.length, 2, 'hof:added each time');
  const better = JSON.parse(JSON.stringify(ended)); better.legacy = { v: 1, score: 640, parts: {}, tier: 'canadian_institution', specials: [] };
  GG.meta.recordCareer(better);
  eq([GG.meta.hof().length, GG.meta.hof()[0].score, GG.meta.get().careers.finished, GG.meta.get().careers.best.score], [1, 640, 1, 640], 'a replay keeps the higher score, counted once');
  GG.meta.recordCareer(ended); eq(GG.meta.hof()[0].score, 640, 'a lower replay never lowers it');
  eq(GG.meta.careerId({ seed: 7919, bandId: 'hail_damage' }), (7919).toString(36) + '.hail_damage');
  const legacyId = GG.meta.careerId({ seed: 1, bandId: 'hail_damage', player: { name: 'Robin' }, createdVersion: '0.1.0.0', history: [{ w: 0 }] });
  ok(/^1\.hail_damage\.[0-9a-z]+$/.test(legacyId) && legacyId !== GG.meta.careerId({ seed: 1, bandId: 'hail_damage', player: { name: 'Kim' }, history: [{ w: 0 }] }), 'seed-less saves get a hashed id: ' + legacyId);
  ok(!GG.meta.lessonSeen('w1_card') && GG.meta.markLesson('w1_card') && GG.meta.lessonSeen('w1_card') && !GG.meta.markLesson('w1_card'), 'lessons');
  ok(JSON.parse(store._map.get('gg.v1.hof')).entries.length === 1 && JSON.parse(store._map.get('gg.v1.meta')).lessons.w1_card === 1, 'stored under gg.v1.hof / gg.v1.meta');
  // cap 40, the top 10 by score kept
  for (let i = 0; i < 45; i++) { const x = JSON.parse(JSON.stringify(ended)); x.seed = 1000 + i; x.legacy = { score: i < 5 ? 900 + i : i, parts: {}, specials: [] }; GG.meta.recordCareer(x); }
  const H = GG.meta.hof();
  ok(H.length === 40 && [900, 901, 902, 903, 904, 640].every(sc => H.some(e => e.score === sc)) && H[0].score === 44, 'cap 40, top 10 never dropped, newest first');
  // lite merge into a fresh install
  const G2 = load({ localStorage: load.fakeStorage() }); G2.meta.load();
  const res = G2.meta.mergeLite(GG.meta.exportLite());
  ok(res.added === G2.meta.hof().length && G2.meta.hof().length >= 10 && G2.meta.hof().length <= 20, 'lite = top 10 ∪ newest 10: ' + res.added);
  eq(G2.meta.get().careers.finished, GG.meta.get().careers.finished, 'counters by max');
  G2.meta.mergeLite(GG.meta.exportFull());
  eq(G2.meta.hof().length, 40, 'a full backup restores every entry'); ok(G2.meta.hof().every(e => Array.isArray(e.strip)), 'strips filled in');
  // listeners: no-ops unless enabled (node bots never write meta)
  const G3store = load.fakeStorage(), G3 = load({ localStorage: G3store }); G3.meta.load();
  const before = G3store._map.get('gg.v1.meta');
  const s = G3.career.newCareer({ seed: 4, player: { name: 'Bot' } }); G3.state = s;
  for (let i = 0; i < 6; i++) G3.career.botWeek(s, 'avg');
  eq([G3store._map.get('gg.v1.meta'), s.tutorial.past4], [before, false], 'disabled: nothing written');
  G3.meta.enabled = true;
  const t = G3.career.newCareer({ seed: 5, player: { name: 'Bot' } }); G3.state = t;
  for (let i = 0; i < 5; i++) G3.career.botWeek(t, 'avg');
  eq([G3.meta.get().careers.started, G3.meta.get().careers.past4, t.tutorial.past4], [1, 1, true], 'enabled: career:new counts, week 4 passed once');
});

test('v1.0: the one-time slot scan (v0.9 fixtures): past4 once per career, ended slots once GG.legacy exists', () => {
  const store = load.fakeStorage();
  ['1', '2', '3'].forEach((slot, i) => store._map.set('gg.v1.slot.' + slot, JSON.stringify(fixture(FIX[i]))));
  const GG = load({ localStorage: store });
  GG.legacy = null;   // simulate the pre-Legacy boot; the stub below stands in for GG.legacy
  GG.meta.load();
  eq([GG.meta.get().careers.past4, GG.meta.get().scanned, GG.meta.hof().length], [3, null, 0], 'no GG.legacy yet: past4 counted, the ended slot waits');
  GG.meta.load();
  eq([GG.meta.get().careers.past4, GG.meta.get().scanned], [3, null], 'a second boot never counts past4 twice');
  GG.legacy = { hofEntry: s => ({ id: GG.meta.careerId(s), bandId: s.bandId, seat: 'drums', score: 321, tier: 'one_album_wonders' }) };   // a stub of Lane E's API
  const unlocks = []; GG.on('meta:unlock', e => unlocks.push(e));
  GG.meta.load();
  eq([GG.meta.get().careers.past4, GG.meta.get().scanned, GG.meta.hof().length, GG.meta.hof()[0].score, GG.meta.get().careers.finished], [3, GG.VERSION, 1, 321, 1], 'the ended slot is recorded once');
  GG.meta.load(); eq([GG.meta.hof().length, GG.meta.get().careers.finished, unlocks.length], [1, 1, 0], 'scanned: never again; silent');
  ok(['1', '2', '3'].every((slot, i) => same(JSON.parse(store._map.get('gg.v1.slot.' + slot)), fixture(FIX[i]))), 'the slots themselves are untouched');
});

test('v1.0: graphics defaults to auto (normalized to high until Lane P adds auto)', () => {
  const GG = load({ localStorage: load.fakeStorage() });
  eq(GG.save.SETTINGS_DEFAULTS.graphics, 'auto');
  eq(GG.prefs.get().graphics, GG.prefs.GRAPHICS.indexOf('auto') >= 0 ? 'auto' : 'high');
  GG.prefs.set({ graphics: 'high' }); eq(GG.prefs.get().graphics, 'high', 'a stored pick stays');
});

test('v1.0: a long career slot is stored packed (LZ1 + header) and reads back; small slots stay JSON', () => {
  const store = load.fakeStorage(), GG = load({ localStorage: store }), s = career(GG);
  GG.save.write('1', s); ok(store._map.get('gg.v1.slot.1').charAt(0) === '{', 'a short career: plain JSON');
  const big = JSON.parse(JSON.stringify(s)); let r = 7; big.history = Array.from({ length: 30000 }, (_, i) => ({ w: i, n: (r = (r * 48271) % 2147483647) % 1000 }));
  eq(GG.save.write('2', big), true);
  const raw = store._map.get('gg.v1.slot.2');
  ok(raw.slice(0, 4) === 'LZ1:' && raw.length < JSON.stringify(big).length / 2, 'packed: ' + raw.length + ' < ' + JSON.stringify(big).length);
  ok(same(GG.save.read('2'), GG.save.migrate(JSON.parse(JSON.stringify(big)))), 'reads back identical');
  const row = GG.save.list().find(x => x.slot === '2');
  eq([row.exists, row.summary.year], [true, big.year], 'list() reads the header only');
  store._map.set('gg.v1.slot.3', 'LZ1:5:{"a"}garbage'); eq(GG.save.read('3'), null, 'a damaged packed slot reads as empty');
});

test('v1.0: an autosave of a long career (auto + its slot) compresses the state once', () => {
  const store = load.fakeStorage(), GG = load({ localStorage: store }), s = career(GG);
  let r = 11; s.history = Array.from({ length: 30000 }, (_, i) => ({ w: i, n: (r = (r * 48271) % 2147483647) % 1000 }));
  const n0 = GG.save.packStats.compress;
  eq([GG.save.write('auto', s), GG.save.write('1', s)], [true, true]);
  eq(GG.save.packStats.compress - n0, 1, 'one compression for two writes of the same state');
  ok(same(GG.save.read('auto'), GG.save.read('1')), 'both slots read back the same career');
  s.fans += 1; GG.save.write('auto', s); eq(GG.save.packStats.compress - n0, 2, 'a changed state compresses again');
  eq(GG.save.read('auto').fans, s.fans, 'and reads back the change');
});

test('v1.0: a code with _meta stays under CODE_MAX by carrying fewer Hall of Fame entries', () => {
  const GG = load({ localStorage: load.fakeStorage() }); GG.legacy = null; GG.meta.load(); GG.meta.enabled = true;
  const ended = GG.save.migrate(fixture('v09_ended').state);
  for (let i = 0; i < 25; i++) { const x = JSON.parse(JSON.stringify(ended)); x.seed = 500 + i; x.player = { name: 'P' + i * 7919 }; x.legacy = { score: 100 + i * 31, parts: {}, specials: [] }; GG.meta.recordCareer(x); }
  const s = career(GG), full = GG.save.toCode(s), fullN = GG.save.readCode(full).meta.entries.length;
  GG.meta.enabled = false; const bare = GG.save.toCode(s).length; GG.meta.enabled = true;
  GG.save.CODE_MAX = bare + Math.round((full.length - bare) / 3);
  const cut = GG.save.toCode(s), m = GG.save.readCode(cut).meta;
  ok(cut.length <= GG.save.CODE_MAX && m.entries.length < fullN && m.entries.length >= 0, 'trimmed: ' + fullN + ' -> ' + m.entries.length + ' entries, ' + cut.length + ' chars');
  const top = GG.meta.hof().map(e => e.score).sort((a, b) => b - a).slice(0, m.entries.length);
  eq(m.entries.map(e => e.score).sort((a, b) => b - a), top, 'the best by score are the ones kept');
  ok(same(GG.save.readCode(cut).state, GG.save.readCode(full).state), 'the career itself is untouched');
});

done('save');
