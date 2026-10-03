// Creator sim tests (2b_sim_creator + content/creator.js, v0.8 / Addendum 1 C2): the Part C2 part lists, unlock gates
// (start / era / fans / milestone / award, genre starts), knuckles (A–Z, 4 per hand), legacy LOOKs stay legacy, the stage
// look, the kit look (no gong, pyro arena-only), new careers (prepare/init), the week-end + event unlock hooks, the save
// migration (fills only lane-B fields, never state.v), carry-over per genre (storage wrapped), purity (no career RNG).
const load = require('./_load');
const { test, ok, eq, done } = require('./_t');

const fresh = (storage) => load({ localStorage: storage || load.fakeStorage() });
const career = (GG, o) => GG.career.newCareer(Object.assign({ seed: 5, player: { name: 'T' } }, o || {}));
const vals = (GG, cat) => GG.creator.partsIn(cat).map(p => p.value);

test('content: every Part C2 list is there, ids unique, gates well-formed, no gong on the kit', () => {
  const GG = fresh(), C = GG.creator, parts = GG.content.creator.parts;
  const ids = parts.map(p => p.id);
  eq(ids.length, new Set(ids).size, 'unique part ids');
  const cats = GG.content.creator.cats;
  parts.forEach(p => {
    ok(cats[p.cat], 'known cat ' + p.id);
    ok(p.id === p.cat + '.' + p.value && p.name, 'id/name ' + p.id);
    if (p.gate) {
      const k = Object.keys(p.gate).filter(x => x !== 'genreStart');
      ok(k.length === 1 && ['era', 'fans', 'milestone', 'award', 'gigs'].includes(k[0]), 'gate ' + p.id + ' ' + JSON.stringify(p.gate));
      ok(C.gateText(p.gate) && !/undefined/.test(C.gateText(p.gate)), 'gate text ' + p.id);
    }
  });
  Object.keys(cats).forEach(c => ok(C.partsIn(c).length >= 2, 'parts in ' + c));
  const need = {
    build: ['slim', 'average', 'stocky', 'big'], age: ['fresh', 'lived', 'grizzled'],
    facialHair: ['clean', 'stubble', 'goatee', 'full', 'handlebar', 'chops', 'viking'], glasses: ['none', 'round', 'aviators', 'shades'],
    hairStyle: ['buzz', 'mop', 'mullet', 'long', 'dreads', 'braids', 'mohawk', 'spikes', 'manbun', 'bald', 'curly', 'shaggy', 'slick', 'hathair'],
    hairColor: ['bleach', 'green', 'pink', 'blue'], top: ['tee', 'flannel', 'hoodie', 'jersey', 'tank', 'denim'], bottom: ['jeans', 'cargo', 'sweats', 'kilt'],
    shoes: ['skate', 'workboots', 'cowboy', 'crocs'], headwear: ['toque', 'trucker', 'cowboy', 'bandana', 'backcap'],
    outfit: ['leathervest', 'battlejacket', 'shirtless', 'spandex', 'cdntux', 'rhinestone'], stageExtra: ['cape', 'wristbands', 'corpsepaint'],
    tatSpot: ['sleeveL', 'sleeveR', 'halfL', 'halfR', 'neck', 'chest', 'knuckles', 'teardrop'],
    tatDesign: ['skull', 'maple', 'wheat', 'logo', 'mom', 'moose', 'flames', 'regerts'],
    piercing: ['studs', 'hoops', 'gauges', 'nosering', 'septum', 'eyebrow', 'lip'],
    shell: ['wood', 'black', 'sparkle', 'flames', 'camo'], hardware: ['chrome', 'black'], head: ['logo', 'face', 'moose', 'text'],
    throne: ['crate', 'leather'], kitExtra: ['cowbell', 'fan', 'pyro']
  };
  for (const c in need) need[c].forEach(v => ok(vals(GG, c).includes(v), c + ' has ' + v));
  eq(GG.content.creator.swatches.skin.length, 12, '12 skin tones');
  ok(!JSON.stringify(parts.filter(p => cats[p.cat].group === 'kit')).match(/gong/i), 'no gong anywhere on the kit');
  ok(C.partsIn('shell').some(p => !p.gate) && C.partsIn('hairStyle').filter(p => !p.gate).length >= 8, 'basics at the start');
  ok(C.part('kitExtra.pyro').gate.era === 'world' && C.part('stageExtra.cape').gate.award === 'loonie', 'pyro by era, the cape by award');
});

test('knuckles: four letters per hand, A–Z only (typed text is filtered)', () => {
  const GG = fresh(), C = GG.creator;
  eq(C.knuckles('lo ve!'), 'LOVE'); eq(C.knuckles('hàte123'), 'HTE'); eq(C.knuckles('abcdefg'), 'ABCD'); eq(C.knuckles(null), ''); eq(C.knuckles('ß'), 'SS');
  const L = C.sanitizeLook({ skin: '#ffffff', knuckles: { left: 'love!!', right: 'h8te', extra: 'x' } });
  eq(L.knuckles, { left: 'LOVE', right: 'HTE' });
  eq(C.sanitizeLook({ knuckles: 'nope' }).knuckles, { left: '', right: '' }, 'junk -> empty hands');
});

test('legacy LOOKs stay legacy (they render exactly as v0.7); expand maps them onto v0.8 parts', () => {
  const GG = fresh(), C = GG.creator;
  const looks = GG.content.presets.map(p => p.look);
  Object.values(GG.content.bands).forEach(b => b.members.forEach(m => looks.push(m.look)));
  for (let i = 0; i < 20; i++) looks.push(GG.drama.makeLook(GG.RNG(40 + i), ['metal', 'punk', 'rock', 'country'][i % 4]));
  looks.forEach(l => {
    ok(!C.isV8(l), 'content look is legacy ' + JSON.stringify(l));
    const s = C.sanitizeLook(l);
    ok(!C.isV8(s) && Object.keys(s).every(k => ['skin', 'hair', 'hairStyle', 'shirt', 'pants', 'height', 'build', 'extras', 'top', 'capColor'].includes(k)), 'sanitize adds no v0.8 field');
  });
  ok(!C.isV8({ hairStyle: 'weird', top: 'poncho' }), 'unknown ids are not v0.8');
  ok(C.isV8({ hairStyle: 'dreads' }) && C.isV8({ top: 'jersey' }) && C.isV8({ knuckles: { left: 'A' } }), 'v0.8 ids / fields are');
  const x = C.expand({ skin: '#e0b08a', hair: '#1c1c1c', hairStyle: 'cap', shirt: '#6b7f3a', pants: '#4a3f33', height: 1, build: 1, extras: ['sunglasses', 'beard', 'hat', 'tattoos'] });
  eq([x.hairStyle, x.headwear, x.glasses, x.facialHair, x.extras.length, x.tattoos.length, x.face.shape, x.bottom, x.outfit], ['short', 'backcap', 'shades', 'full', 0, 2, 'classic', 'jeans', 'none']);
  ok(C.isV8(x), 'expanded is v0.8');
  eq(C.expand({ extras: ['moustache', 'glasses'] }).facialHair + '/' + C.expand({ extras: ['glasses'] }).glasses, 'horseshoe/specs');
});

test('sanitizeLook: bad ids -> defaults, tattoos (a full sleeve beats a half), stage fields kept, colours validated', () => {
  const GG = fresh(), C = GG.creator;
  const L = C.sanitizeLook({ skin: 'red', hairStyle: 'dreads', face: { shape: 'triangle', eyes: 'big', eyeColor: 'blue' }, outfit: 'tutu', stageExtras: ['cape', 'gong', 'cape'],
    tattoos: [{ spot: 'halfL', design: 'moose' }, { spot: 'sleeveL', design: 'skull' }, { spot: 'chest', design: 'nope' }, { spot: 'teardrop' }, { spot: 'knuckles', design: 'mom' }],
    piercings: ['lip', 'tongue', 'lip'], height: 9, build: -1 });
  eq([L.skin, L.hairStyle, L.face.shape, L.face.eyes, L.face.eyeColor, L.outfit], ['#f0c9a4', 'dreads', 'classic', 'big', '#5a3a22', 'none']);
  eq(L.stageExtras, ['cape']); eq(L.piercings, ['lip']);
  eq(L.tattoos, [{ spot: 'sleeveL', design: 'skull' }, { spot: 'teardrop', design: 'tear' }]);
  eq([L.height, L.build], [1.15, 0.85]);
});

test('new career: stage look = everyday look, the milk-crate kit with the band logo, kitColor mirrors kit.color', () => {
  const GG = fresh(), s = career(GG, { player: { name: 'T', presetId: 'hockey_hair' } });
  const pl = s.player;
  eq(pl.stageLook, GG.creator.sanitizeLook(pl.look), 'stage look starts as the everyday look');
  eq([pl.kit.throne, pl.kit.head, pl.kit.shell, pl.kit.hardware, pl.kit.extras], ['crate', 'logo', 'paint', 'chrome', []]);
  eq(pl.kit.color, pl.kitColor, 'kitColor mirrors');
  ok(Array.isArray(s.unlocks.creator) && s.unlocks.creator.length === 0, 'nothing earned yet');
  ok(GG.creator.isUnlocked(s, 'hairStyle.buzz') && !GG.creator.isUnlocked(s, 'kitExtra.pyro') && !GG.creator.isUnlocked(s, 'hairStyle.mohawk'), 'basics only');
  ok(GG.creator.isUnlocked(s, 'outfit.battlejacket') && GG.creator.isUnlocked(s, 'facialHair.viking'), 'metal starts with the battle jacket + Viking beard');
});

test('prepare(): the creator\'s look/stage/kit go into the new career, locked parts are stripped', () => {
  const GG = fresh(), C = GG.creator;
  const look = C.expand(GG.content.presets[0].look);
  Object.assign(look, { hairStyle: 'mohawk', knuckles: { left: 'LOVE', right: 'HATE' }, piercings: ['studs', 'septum'], glasses: 'round' });
  const stage = Object.assign(C.expand(look), { outfit: 'leathervest', stageExtras: ['wristbands', 'cape', 'corpsepaint'] });
  C.prepare({ look, stageLook: stage, kit: { shell: 'flames', color: '#123456', throne: 'leather', head: 'text', headText: 'Moose Jaw!!', extras: ['pyro', 'cowbell', 'gong'] } });
  const s = career(GG);
  const pl = s.player;
  eq([pl.look.hairStyle, pl.look.glasses, pl.look.piercings, pl.look.knuckles], ['buzz', 'round', ['studs'], { left: '', right: '' }], 'mohawk + knuckles + septum locked at the start');
  ok(pl.look.outfit === undefined && pl.look.stageExtras === undefined, 'the everyday look has no stage outfit');
  eq([pl.stageLook.outfit, pl.stageLook.stageExtras, pl.stageLook.hairStyle], ['none', ['corpsepaint'], 'buzz'], 'leather vest (250 fans), wristbands, cape locked; corpse paint is a metal start');
  eq([pl.kit.shell, pl.kit.color, pl.kit.throne, pl.kit.head, pl.kit.headText, pl.kit.extras], ['paint', '#123456', 'crate', 'text', 'MOOSE JAW!!', []]);
  eq(pl.kitColor, '#123456');
  eq(C.pending(), null, 'pending consumed');
  const s2 = career(GG, { seed: 9 });
  eq(s2.player.kit.color, s2.player.kitColor, 'the next career gets defaults again');
});

test('unlock gates: fans, era, milestone, awards (platinum counts as gold), genre starts', () => {
  const GG = fresh(), C = GG.creator, s = career(GG);
  s.fans = 100; let got = C.checkUnlocks(s);
  ok(got.includes('facialHair.handlebar') && got.includes('hairStyle.dreads') && got.includes('stageExtra.wristbands') && !got.includes('outfit.leathervest'), '100 fans ' + got);
  eq(C.checkUnlocks(s), [], 'idempotent');
  s.milestones.firstGig = 3; got = C.checkUnlocks(s);
  ok(got.includes('tatSpot.knuckles') && got.includes('headwear.bandana') && got.includes('tatDesign.regerts'), 'first gig ' + got);
  s.era = 'signed'; got = C.checkUnlocks(s);
  ok(got.includes('outfit.rhinestone') && got.includes('outfit.cdntux') && got.includes('throne.leather') && !got.includes('kitExtra.pyro') && !got.includes('stageExtra.corpsepaint'), 'signed ' + got);
  s.trophies.push({ kind: 'platinum', title: 'X', year: 3 }); got = C.checkUnlocks(s);
  ok(got.includes('sticks.gold') && got.includes('head.face') && !got.includes('stageExtra.cape'), 'platinum -> gold sticks + face ' + got);
  s.trophies.push({ kind: 'loonie', title: 'Y', year: 3 }); s.era = 'world';
  got = C.checkUnlocks(s);
  ok(got.includes('stageExtra.cape') && got.includes('kitExtra.pyro') && got.includes('sticks.glow'), 'loonie + world ' + got);
  const G2 = fresh(), c2 = career(G2, { bandId: 'grid_road_ramblers' });
  ok(c2.genre === 'country' && G2.creator.isUnlocked(c2, 'headwear.cowboy') && G2.creator.isUnlocked(c2, 'shoes.cowboy') && !G2.creator.isUnlocked(c2, 'outfit.battlejacket'), 'country starts with the hat + boots');
});

test('week-end hook: new unlocks become one wrap milestone line (+ wrap.creator); events toast via creator:unlocked', () => {
  const GG = fresh(), s = career(GG);
  GG.state = s;
  const seen = [];
  GG.on('creator:unlocked', p => seen.push(p));
  GG.career.startWeek(s); if (s.card && !s.card.resolved) GG.career.resolveCard(s, 0);
  GG.career.setPlan(s, ['rest', 'rest', 'rest']); GG.career.runWeek(s, { autoGig: true });
  s.fans = Math.max(s.fans, 120);
  const w = GG.career.endWeek(s);
  ok(w.creator && w.creator.unlocked.includes('facialHair.handlebar') && w.creator.unlocked.includes('tatSpot.knuckles'), 'wrap.creator ' + JSON.stringify(w.creator));
  ok(w.milestones.some(m => /^New look unlocked: .*☰ → Look/.test(m)), 'milestone line ' + w.milestones.join(' | '));
  ok(seen.length && seen[seen.length - 1].source === 'week', 'week event');
  // Mid-week: a Loonie → unlocked now (toast), and listed on the next wrap.
  s.trophies.push({ kind: 'loonie', title: 'Z', year: 1 });
  GG.emit('loonies:result', { year: 1, results: [] });
  ok(GG.creator.isUnlocked(s, 'stageExtra.cape') && seen[seen.length - 1].source === 'event' && s.unlocks.news.includes('stageExtra.cape'), 'event unlock');
  GG.career.startWeek(s); if (s.card && !s.card.resolved) GG.career.resolveCard(s, 0);
  GG.career.setPlan(s, ['rest', 'rest', 'rest']); GG.career.runWeek(s, { autoGig: true });
  const w2 = GG.career.endWeek(s);
  ok(w2.creator && w2.creator.unlocked.includes('stageExtra.cape') && s.unlocks.news.length === 0, 'the cape is on the next wrap');
  GG.state = null;
});

test('no career RNG: a career plays the same with or without the creator hooks', () => {
  const run = (hook) => {
    const GG = fresh(), s = career(GG, { seed: 77 });
    if (hook) GG.state = s;
    for (let i = 0; i < 30; i++) { GG.career.botWeek(s, 'good'); }
    return { rng: s.rng, fans: s.fans, fund: s.fund, u: hook ? s.unlocks.creator.length : -1 };
  };
  const a = run(false), b = run(true);
  eq([a.rng, a.fans, a.fund], [b.rng, b.fans, b.fund], 'same career');
  ok(b.u > 0, 'the hooked career earned unlocks: ' + b.u);
});

test('save migration: fills stageLook / kit (the v0.7 kit) / unlocks only when missing, never state.v; idempotent', () => {
  const GG = fresh(), s = career(GG);
  s.fans = 300; s.milestones.firstGig = 2;
  delete s.player.stageLook; delete s.player.kit; delete s.unlocks; s.player.kitColor = '#1f8a4c';
  s.v = 8;
  const m = GG.save.migrate(JSON.parse(JSON.stringify(s)));
  eq(m.player.stageLook, s.player.look, 'stage look = everyday look');
  eq(m.player.kit, GG.creator.legacyKit('#1f8a4c'), 'the v0.7 kit');
  ok(m.unlocks.creator.includes('throne.stool') && m.unlocks.creator.includes('outfit.leathervest') && m.unlocks.creator.includes('tatSpot.knuckles'), 'earned quietly ' + m.unlocks.creator.length);
  eq(m.unlocks.news, [], 'no announcements for old unlocks');
  const again = GG.save.migrate(JSON.parse(JSON.stringify(m)));
  eq(again.player, m.player); eq(again.unlocks, m.unlocks);
  const keep = JSON.parse(JSON.stringify(s)); keep.player.kit = { shell: 'camo', color: '#000000' }; keep.player.stageLook = { skin: '#111111' }; keep.unlocks = { creator: ['hairStyle.dreads'] };
  const k2 = GG.creator.migrate(keep);
  eq([k2.player.kit.shell, k2.player.stageLook.skin, k2.unlocks.creator], ['camo', '#111111', ['hairStyle.dreads']], 'existing fields untouched');
  const v = GG.creator.migrate({ v: 3, player: { look: { skin: '#fff' } } });
  eq(v.v, 3, 'state.v is lane A\'s');
});

test('carry-over: unlocks saved per genre (this device), opt-in at a new career; storage failures never throw', () => {
  const store = load.fakeStorage(), GG = fresh(store), C = GG.creator, s = career(GG);
  s.fans = 300; C.checkUnlocks(s); ok(C.carry.write(s), 'written');
  ok(JSON.parse(store.getItem('gg.v1.unlocks.metal')).ids.includes('outfit.leathervest'), 'key gg.v1.unlocks.<genre>');
  ok(C.carry.count('metal') >= 5 && C.carry.count('punk') === 0, 'per genre');
  C.prepare({ carry: true }); const s2 = career(GG, { seed: 8 });
  ok(C.isUnlocked(s2, 'outfit.leathervest') && s2.fans < 250, 'carried into the new metal career (not earned: ' + s2.fans + ' fans)');
  const s3 = career(GG, { seed: 9 });
  ok(!C.isUnlocked(s3, 'outfit.leathervest'), 'only when the toggle is on');
  const bad = fresh(load.fakeStorage({ throwOnRead: true, throwOnWrite: true })), sb = career(bad);
  sb.fans = 300; bad.creator.checkUnlocks(sb);
  eq([bad.creator.carry.read('metal'), bad.creator.carry.write(sb)], [[], false], 'blocked storage: empty, false');
  bad.creator.prepare({ carry: true }); ok(career(bad, { seed: 3 }).unlocks, 'new career still works');
  const none = load({}); ok(none.creator.carry.read('metal').length === 0 && none.creator.carry.write(career(none)) === false, 'no storage at all');
});

test('kit: sanitize (no gong, ever), lock-check, legacy fallback, arena check for pyro', () => {
  const GG = fresh(), C = GG.creator, s = career(GG);
  const k = C.sanitizeKit({ shell: 'glitter', color: 'blue', hardware: 'gold', head: 'gong', throne: 'sofa', sticks: 'x', extras: ['gong', 'pyro', 'fan', 'pyro'] }, '#abcdef');
  eq(k, { shell: 'paint', hardware: 'chrome', head: 'plain', throne: 'stool', color: '#abcdef', headText: '', sticks: '#d8b27a', extras: ['pyro', 'fan'] });
  eq(C.lockKit(s, Object.assign({}, k, { throne: 'leather', shell: 'flames', sticks: '#e0b640' })), Object.assign({}, k, { throne: 'crate', shell: 'paint', extras: [] }), 'locked -> defaults');
  eq(C.kitLook({ kitColor: '#222222' }), C.legacyKit('#222222'), 'a v0.7 player gets the v0.7 kit');
  eq(C.kitLook({ presetId: 'farm_auction' }).color, '#d9a520', 'preset colour');
  eq(C.headText('  hail   damage!! <script>'), 'HAIL DAMAGE!!');
  const sad = GG.content.rivalry.venues.find(v => v.id === 'sad_dome'), bud = GG.content.world.venues.find(v => v.id === 'budokhan');
  ok(C.isArena(sad) && C.isArena(bud) && C.isArena({ tier: 4 }) && !C.isArena({ capacity: 400, tier: 2 }) && !C.isArena(null), 'arena shows');
});

test('stage looks: player stage look, members fall back to their look; apply keeps the person in sync', () => {
  const GG = fresh(), C = GG.creator, s = career(GG);
  const band = GG.content.bands.hail_damage, cm = band.members[0];
  eq(C.stageLookFor({ id: 'marcel' }, cm), cm.look, 'content look');
  eq(C.stageLookFor({ look: { skin: '#111111' } }), { skin: '#111111' });
  s.fans = 5000; s.era = 'signed'; C.checkUnlocks(s);
  let ev = 0; GG.on('creator:changed', () => ev++);
  const look = Object.assign(C.expand(s.player.look), { hairStyle: 'dreads', outfit: 'rhinestone' });
  const stage = Object.assign(C.expand(s.player.look), { outfit: 'rhinestone', stageExtras: ['wristbands'], hairStyle: 'bald' });
  const r = C.apply(s, { look, stageLook: stage, kit: { shell: 'sparkle', color: '#d45a8a', throne: 'leather', extras: ['cowbell', 'fan'] } });
  eq([r.look.outfit, r.stageLook.outfit, r.stageLook.hairStyle, r.look.hairStyle], [undefined, 'rhinestone', 'dreads', 'dreads'], 'person synced from the everyday look');
  eq(C.stageLookFor(s.player), s.player.stageLook);
  eq([s.player.kit.shell, s.player.kitColor, s.player.kit.extras, ev], ['sparkle', '#d45a8a', ['cowbell', 'fan'], 1]);
});

// v1.1 "Seats" (Lane C, plan_contract_1.1 §4.8): the string seats' "your gear" (player.gearLook).
test('v1.1 gear look: 3-4 shapes per seat with names, sanitize per seat, prepare/apply carry it, drums untouched', () => {
  const GG = fresh(), C = GG.creator, CT = GG.contracts;
  ['bass', 'rhythm', 'lead'].forEach(seat => {
    const shapes = C.gearShapes(seat), N = C.gearNames(seat);
    ok(shapes.length >= 3 && shapes.length <= 4 && shapes.join() === CT.GEAR_SHAPES[seat].join(), seat + ': 3-4 body shapes ' + shapes.join(','));
    shapes.forEach(id => ok(typeof N.shapes[id] === 'string' && N.shapes[id].length > 2 && N.shapes[id] !== id, seat + ' shape named: ' + id + ' = ' + N.shapes[id]));
    CT.GEAR_GUARDS.forEach(id => ok(N.guards[id], 'guard named ' + id));
    ok(N.stickers.none && N.stickers.logo, 'sticker names');
    ok(!/fender|gibson|ibanez|rickenbacker|hofner|höfner|gretsch|epiphone|jackson|esp|schecter|yamaha|martin|taylor|usa|america/i.test(Object.values(N.shapes).join(' ')), seat + ': parody names, no brands, no USA');
  });
  eq(C.gearDefault('rhythm', 'country'), 'acoustic', 'country rhythm defaults to the acoustic');
  eq(C.gearDefault('bass', 'metal'), 'plank');
  eq(C.sanitizeGearLook({ shape: 'vee', color: '#ABCDEF', guard: 'tortoise', sticker: 'logo', junk: 1 }, 'lead'), { shape: 'vee', color: '#abcdef', guard: 'tortoise', sticker: 'logo' }, 'a good look keeps every field (colour lowercased)');
  eq(C.sanitizeGearLook({ shape: 'vee', color: 'red', guard: 'gold', sticker: 'yes' }, 'bass'), { shape: null, color: null, guard: 'white', sticker: 'none' }, 'a shape from another seat, bad colour / guard / sticker -> defaults');
  eq(C.sanitizeGearLook(null, 'rhythm'), Object.assign({}, CT.GEAR_LOOK), 'missing -> C.GEAR_LOOK');
  eq(C.sanitizeGearLook({ shape: 'violin' }).shape, 'violin', 'no seat: any seat\'s shape id stays');
  // A new career from the creator: prepare({ gearLook }) is sanitised for the career's seat.
  C.prepare({ gearLook: { shape: 'arrow', color: '#1f8a4c', guard: 'black', sticker: 'logo' } });
  const s = career(GG, { seat: 'bass', bandId: 'hail_damage' });
  eq(s.player.gearLook, { shape: 'arrow', color: '#1f8a4c', guard: 'black', sticker: 'logo' }, 'prepare -> the career gear look');
  C.prepare({ gearLook: { shape: 'arrow' } });
  const s2 = career(GG, { seat: 'lead', bandId: 'frost_heave' });
  eq(s2.player.gearLook.shape, null, 'a bass shape on the lead seat -> the seat default');
  const r = C.apply(s2, { gearLook: { shape: 'pointy', color: '#d45a8a', guard: 'none', sticker: 'none' } });
  eq([r.gearLook.shape, s2.player.gearLook.guard, s2.player.gearLook.color], ['pointy', 'none', '#d45a8a'], 'apply (career mode) sets the gear look');
  // Drums: no gearLook in prepare -> the stage-0 default stays; apply without gearLook returns v1.0's three keys.
  const d = career(GG, { bandId: 'hail_damage' });
  eq(d.player.gearLook, Object.assign({}, CT.GEAR_LOOK), 'drum career: the stage-0 default, untouched');
  eq(Object.keys(C.apply(d, {})).sort(), ['kit', 'look', 'stageLook'], 'apply without gearLook = v1.0 result');
});

done('sim_creator');
