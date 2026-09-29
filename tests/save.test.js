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

done('save');
