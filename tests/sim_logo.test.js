// Logo sim tests (2e_sim_logo + content/logo.js, v0.8.1 / Addendum 2 D2): the lists (the owner's twelve emblems, four
// lettering styles, ~10+ colour pairs), every band's default, a fixed logo for every rival + scene band, sanitising, new
// careers (the picker's pick via prepare, band defaults otherwise), the save migration (fills state.logo only; never
// state.v), Rebrand (fee + a little buzz, refusals), carry-over per genre (storage wrapped), no career RNG.
const load = require('./_load');
const { test, ok, eq, done } = require('./_t');

const fresh = (storage) => load({ localStorage: storage || load.fakeStorage() });
const career = (GG, o) => GG.career.newCareer(Object.assign({ seed: 5, player: { name: 'T' } }, o || {}));
const HEX = /^#[0-9a-f]{6}$/i;

test('content: the owner\'s twelve emblems (+ additions), four styles, 10+ palettes, no gong', () => {
  const GG = fresh(), L = GG.logo, K = GG.content.logo, C = GG.contracts;
  const em = L.emblems().map(e => e.id);
  C.LOGO_EMBLEMS.forEach(id => ok(em.includes(id), 'emblem ' + id));
  ok(em.length >= 12 && em.length === new Set(em).size, 'emblems unique, at least the starting twelve: ' + em.length);
  eq(K.emblems.slice(0, 12).map(e => e.id), C.LOGO_EMBLEMS, 'the starting set first, in contract order');
  K.emblems.forEach(e => ok(e.name && e.art && typeof e.art.scale === 'number', 'emblem art params ' + e.id));
  eq(L.styles().map(s => s.id), C.LOGO_STYLES, 'the four lettering styles');
  L.styles().forEach(s => ok(s.name && s.blurb && C.LOGO_STYLES.includes(s.genre), 'style ' + s.id));
  const pals = L.palettes();
  ok(pals.length >= 10 && pals.length === new Set(pals.map(p => p.id)).size, 'palettes: ' + pals.length);
  pals.forEach(p => ok(HEX.test(p.fg) && HEX.test(p.em) && HEX.test(p.ground) && p.name, 'palette ' + p.id));
  ok(!/gong/i.test(JSON.stringify(K)), 'no gong');
  ok(K.rebrand.cost.garage > 0 && K.rebrand.cost.garage <= K.rebrand.cost.world && K.rebrand.cost.world <= 1500 && K.rebrand.buzz > 0 && K.rebrand.buzz <= 6, 'Rebrand is small');
});

test('every band has a default logo in its own genre\'s lettering; every rival + scene band has a fixed one', () => {
  const GG = fresh(), L = GG.logo;
  const valid = lg => !!(L.emblem(lg.emblem) && L.style(lg.style) && L.palette(lg.palette));
  Object.values(GG.content.bands).forEach(b => {
    const d = GG.content.logo.bands[b.id];
    ok(d && valid(d), 'band default ' + b.id);
    eq(d.style, b.genre, b.id + ' letters in its genre');
    eq(L.defaultFor(b.id), { emblem: d.emblem, style: d.style, palette: d.palette });
  });
  const keys = new Set(Object.values(GG.content.bands).map(b => L.key(L.defaultFor(b.id))));
  eq(keys.size, 4, 'four different band logos');
  const ids = Object.keys(GG.content.rivals).concat(GG.content.rivalry.scene.map(s => s.id));
  ids.forEach(id => {
    const r = GG.content.logo.rivals[id];
    ok(r, 'fixed logo for ' + id);
    ok(valid(L.rival(id)), 'valid rival logo ' + id);
  });
  eq(L.rival('mall_rats_scene'), L.rival('mall_rats'), 'the scene copy aliases the rival');
  eq(L.rival('tundra_wraith'), { emblem: 'skull', style: 'metal', palette: 'ice' });
  const h1 = L.rival('nobody_band', 'punk'), h2 = L.rival('nobody_band', 'punk');
  ok(valid(h1) && L.same(h1, h2) && h1.style === 'punk', 'unknown ids hash to a stable logo');
  eq(L.findRival('Tundra Wraith'), 'tundra_wraith'); eq(L.findRival('Canola Coven'), 'canola_coven'); eq(L.findRival('Nobody'), null);
});

test('sanitize: junk -> the band default, one bad field is fixed alone, genre fallback', () => {
  const GG = fresh(), L = GG.logo;
  eq(L.sanitize(null, 'frost_heave'), L.defaultFor('frost_heave'));
  eq(L.sanitize('nope', 'gravel_kings'), L.defaultFor('gravel_kings'));
  eq(L.sanitize({ emblem: 'moose', style: 'kazoo', palette: 'gold' }, 'hail_damage'), { emblem: 'moose', style: 'metal', palette: 'gold' });
  eq(L.sanitize({ emblem: 'gong', style: 'country', palette: 'frost' }, 'hail_damage').emblem, 'hailstone', 'no gong emblem');
  eq(L.defaultFor('country').style, 'country', 'a genre gets its band\'s default');
  eq(L.defaultFor('some_new_band').style, 'metal', 'an unknown band still gets a logo');
  ok(L.same(L.sanitize({ emblem: 'toque', style: 'punk', palette: 'slime' }), { emblem: 'toque', style: 'punk', palette: 'slime' }), 'additions are valid');
});

test('new careers: the band default, or the picker\'s pick (prepare) for that band only', () => {
  const GG = fresh(), L = GG.logo;
  ['hail_damage', 'frost_heave', 'gravel_kings', 'grid_road_ramblers'].forEach(id => {
    const s = career(GG, { bandId: id });
    eq(s.logo, L.defaultFor(id), 'default logo ' + id);
  });
  L.prepare({ emblem: 'moose', style: 'country', palette: 'gold' }, 'hail_damage');
  eq(L.pending('hail_damage'), { emblem: 'moose', style: 'country', palette: 'gold' });
  eq(L.pending('frost_heave'), null, 'pending only for its band');
  const s1 = career(GG, { bandId: 'hail_damage' });
  eq(s1.logo, { emblem: 'moose', style: 'country', palette: 'gold' }, 'the pick lands in the career');
  ok(s1.chat.some(m => /logo/i.test(m.text)), 'a group-chat line about the logo');
  eq(L.pending(), null, 'consumed');
  eq(career(GG, { bandId: 'hail_damage' }).logo, L.defaultFor('hail_damage'), 'the next career is back to the default');
  L.prepare({ emblem: 'moose', style: 'country', palette: 'gold' }, 'frost_heave');
  eq(career(GG, { bandId: 'hail_damage' }).logo, L.defaultFor('hail_damage'), 'another band\'s pick is ignored');
  eq(L.pending(), null, 'and cleared');
});

test('saves: migrate fills state.logo only when missing or broken, never state.v; the save code keeps it', () => {
  const GG = fresh(), L = GG.logo;
  const s = career(GG, { bandId: 'gravel_kings' });
  delete s.logo;
  const v = s.v; L.migrate(s);
  eq(s.logo, L.defaultFor('gravel_kings'), 'filled'); eq(s.v, v, 'L.migrate never touches v');
  s.logo = { emblem: 'anvil', style: 'wat', palette: 'rider' }; L.migrate(s);
  eq(s.logo, { emblem: 'anvil', style: 'rock', palette: 'rider' }, 'broken field fixed, the rest kept');
  s.logo = { emblem: 'toque', style: 'punk', palette: 'pink' };
  const snap = JSON.stringify(s); L.migrate(s); eq(JSON.stringify(s), snap, 'a valid logo is untouched (idempotent)');
  ok(GG.save.migrate.logo, 'chained onto GG.save.migrate');
  const old = JSON.parse(JSON.stringify(s)); delete old.logo; old.v = 9;
  const m = GG.save.migrate(old);
  eq(m.logo, L.defaultFor('gravel_kings'), 'an old (v9) save gets the band default');
  eq(m.v, GG.contracts.SAVE_SCHEMA, 'the save module sets v, as always');
  const back = GG.save.fromCode(GG.save.toCode(s));
  eq((back.state || back).logo, s.logo, 'save-code round trip');
});

test('Rebrand: a small fee + a little buzz, refusals, a chat line, an event; no career RNG', () => {
  const GG = fresh(), L = GG.logo;
  const s = career(GG, { bandId: 'hail_damage' });
  eq(L.rebrandCost(s), { fund: GG.content.logo.rebrand.cost.garage, buzz: GG.content.logo.rebrand.buzz });
  s.era = 'world'; eq(L.rebrandCost(s).fund, GG.content.logo.rebrand.cost.world); s.era = 'garage';
  const next = { emblem: 'moose', style: 'metal', palette: 'blood' };
  eq(L.canRebrand(s, s.logo).ok, false, 'same logo refused');
  ok(/already/.test(L.canRebrand(s, s.logo).why), 'why: same');
  s.fund = 10; const poor = L.rebrand(s, next);
  ok(!poor.ok && /fund/i.test(poor.why), 'not enough money');
  eq(s.logo, L.defaultFor('hail_damage'), 'nothing changed');
  s.fund = 1000; s.buzz = 20;
  const rng = s.rng, chats = s.chat.length, evs = [];
  GG.on('logo:changed', e => evs.push(e));
  const r = L.rebrand(s, next);
  ok(r.ok && r.cost === 150, 'rebranded: ' + JSON.stringify(r));
  eq(s.logo, next); eq(s.fund, 850); eq(s.buzz, 20 - GG.content.logo.rebrand.buzz);
  eq(r.deltas.fund, -150, 'deltas'); ok(s.chat.length === chats + 1, 'a chat line');
  eq(evs.length, 1); eq(evs[0].source, 'rebrand');
  eq(s.rng, rng, 'no career RNG');
  s.buzz = 1; ok(L.rebrand(s, { emblem: 'toque', style: 'metal', palette: 'blood' }).ok && s.buzz === 0, 'buzz never below 0');
});

test('carry-over: this device remembers the last logo per genre; broken storage never throws', () => {
  const store = load.fakeStorage(), GG = fresh(store), L = GG.logo;
  eq(L.carry.read('metal'), null, 'nothing yet');
  ok(/^gg\.v1\.unlocks\.metal\.logo$/.test(L.carry.key('metal')), 'next to the creator\'s carry key: ' + L.carry.key('metal'));
  L.prepare({ emblem: 'gopher', style: 'punk', palette: 'pink' }, 'hail_damage');
  career(GG, { bandId: 'hail_damage' });
  eq(L.carry.read('metal'), { emblem: 'gopher', style: 'punk', palette: 'pink' }, 'the pick is remembered for metal');
  eq(L.carry.read('punk'), null, 'per genre');
  const s = career(GG, { bandId: 'hail_damage' }); s.fund = 999;
  L.rebrand(s, { emblem: 'anvil', style: 'metal', palette: 'gold' });
  eq(L.carry.read('metal').emblem, 'anvil', 'a rebrand updates it');
  store.setItem(L.carry.key('metal'), '{broken'); eq(L.carry.read('metal'), null, 'junk -> null');
  store.setItem(L.carry.key('metal'), JSON.stringify({ emblem: 'gong', style: 'metal', palette: 'gold' })); eq(L.carry.read('metal'), null, 'invalid ids -> null');
  const G2 = fresh(load.fakeStorage({ throwOnRead: true, throwOnWrite: true }));
  eq(G2.logo.carry.read('metal'), null, 'read throws -> null');
  const s2 = career(G2); eq(G2.logo.carry.write(s2), false, 'write throws -> false');
  const G3 = load({});   // no localStorage at all
  eq(G3.logo.carry.read('metal'), null); ok(career(G3).logo, 'careers still get logos');
});

done('sim_logo');
