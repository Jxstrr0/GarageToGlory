// sim_shop.test.js (v0.8 "Kit", KITSIM): gear (lanes 5–6, the pedal, kit quality), Outro/Solo, spaces + rent + perks +
// upgrades, van tiers / names / rename / upgrades / stickers, the merch table (unlocks, stock, prices, van space, sales,
// the box pile, the misprint -> collector's item), the forced shop cards, the v8 -> v9 migration, bots and determinism.
const { test, ok, eq, done } = require('./_t');
const load = require('./_load');

function fresh() { return load({ localStorage: load.fakeStorage() }); }
function career(GG, seed, extra) {
  const s = GG.career.newCareer({ seed: seed || 7, player: { name: 'T' } });
  return Object.assign(s, extra || {});
}
const AUTO = { autoGig: true };
function week(GG, s, plan) {   // one quick week: resolve any card with choice 0, run, wrap
  const st = GG.career.startWeek(s);
  if (st.card) GG.career.resolveCard(s, 0);
  if (plan) GG.career.setPlan(s, plan);
  GG.career.runWeek(s, AUTO);
  return GG.career.endWeek(s);
}

test('content: gear, kit tiers, spaces, upgrades, vans (Part C1 names), van upgrades, merch per genre; no gong', () => {
  const GG = fresh(), K = GG.content.shop, C = GG.contracts;
  eq(K.gear.map(g => g.id), ['toms', 'ride', 'pedal']);
  ok(K.gear[0].lane === 5 && K.gear[1].lane === 6 && K.gear[1].needs === 'toms' && K.gear[2].pedal && !K.gear[2].lane, 'lanes 5/6 + pedal');
  eq(K.kit.map(k => k.id), C.KIT_QUALITY); eq(K.kit.map(k => k.tier), [0, 1, 2, 3]);
  ok(K.kit.every((k, i) => !i || (k.cost > K.kit[i - 1].cost && C.ERAS.indexOf(k.era) >= C.ERAS.indexOf(K.kit[i - 1].era))), 'kit tiers cost more, open later');
  eq(K.spaces.map(x => x.tier), [0, 1, 2, 3]); eq(K.spaces.slice(1).map(x => x.id), C.SPACE_TIERS.slice(1));
  eq(K.spaces.map(x => x.era), C.ERAS); eq(K.spaces[0].rent, 0);
  ok(K.spaces.every((x, i) => !i || x.rent > K.spaces[i - 1].rent), 'rent grows with the space');
  ok(K.spaces[1].perk.rehearse > 0 && K.spaces[2].perk.write > 0 && K.spaces[2].perk.record > 0 && K.spaces[3].perk.rest > 0, 'perks: jam room rehearse, pro studio write + record, arena rest');
  [0, 1, 2, 3].forEach(t => ok(K.upgrades.filter(u => u.tier === t).length >= 4, 'upgrades for space tier ' + t));
  ok(['curb_couch', 'egg_foam', 'beer_fridge', 'xmas_lights'].every(id => K.upgrades.some(u => u.id === id)), 'couch, egg-crate foam, beer fridge, lights');
  const ids = new Set(); K.upgrades.concat(K.vanUpgrades, K.merch).forEach(u => { ok(/^[a-z][a-z0-9_]*$/.test(u.id) && !ids.has(u.id), 'unique id ' + u.id); ids.add(u.id); ok(u.cost > 0 && u.name && u.blurb, u.id + ' shape'); });
  eq(K.vanTiers.map(v => v.id), C.VAN_TIERS);
  ok(K.vanTiers.every((v, i) => !i || (v.price > K.vanTiers[i - 1].price && v.space > K.vanTiers[i - 1].space && v.comfort >= K.vanTiers[i - 1].comfort)), 'bigger vans: pricier, more space');
  eq(K.vanNames, {
    hail_damage: ['The Moose Hearse', 'The Claim Adjuster', 'Black Ice', 'Doom Coach'],
    frost_heave: ['The Pothole', 'Squat Van', 'The Eviction Notice', 'Frost Heave One'],
    gravel_kings: ['The Mullet Wagon', 'Night Rider', 'The Power Ballad', 'Thunderdome'],
    grid_road_ramblers: ["Grandpa's Suburban", 'The Hay Wagon', 'The Combine', 'The Prairie Palace'] });
  ok(K.vanUpgrades.every(u => u.tiers.length && u.tiers.every(t => t >= 0 && t <= 3)), 'van upgrades fit tiers');
  eq(K.merchTiers.map(t => t.id), C.MERCH_TIERS);
  const forGenre = g => K.merch.filter(m => !m.hidden && (!m.genre || m.genre.includes(g))).map(m => m.id);
  ok(['longsleeve', 'patch'].every(x => forGenre('metal').includes(x)), 'metal: longsleeves, patches');
  ok(['patch', 'tape'].every(x => forGenre('punk').includes(x)), 'punk: patches, DIY tapes');
  ok(forGenre('rock').includes('tourshirt') && forGenre('country').includes('trucker'), 'rock tour shirts, country trucker hats');
  C.MERCH_TIERS.forEach(t => ok(K.merch.some(m => m.tier === t && !m.hidden), 'merch in tier ' + t));
  ok(K.merch.some(m => m.id === 'bobblehead' && m.tier === 'limited'), 'the Marcel bobblehead');
  K.merch.forEach(m => ok(m.cost > 0 && m.price > m.cost && m.perBox > 0 && m.appeal > 0 && C.MERCH_TIERS.includes(m.tier), m.id + ' numbers'));
  ok(!/\bgong\b/i.test(JSON.stringify(K.gear) + JSON.stringify(K.kit) + JSON.stringify(K.upgrades)), 'no gong on the drum kit, ever');
});

test('shop cards: forced-only schema (ids unique vs the deck, gates, effects, lengths, gamble hints)', () => {
  const GG = fresh(), C = GG.contracts, cards = GG.content.shopCards, deck = new Set(GG.content.cards.map(c => c.id));
  const npcs = Object.keys(GG.content.npcs || {}), members = [].concat(...Object.values(GG.content.bands).map(b => b.members.map(m => m.id)));
  ok(cards.length >= 8, 'space offers x3, misprint, solo, merch, kit, van');
  ok(!deck.has('money_merch_misprint') && cards.some(c => c.id === 'money_merch_misprint'), 'the misprint card moved to the forced shop cards');
  const ids = new Set();
  for (const c of cards) {
    ok(/^[a-z][a-z0-9_]*$/.test(c.id) && !ids.has(c.id) && !deck.has(c.id), c.id + ': unique id'); ids.add(c.id);
    ok(C.CARD_TYPES.includes(c.type) && (members.includes(c.speaker) || npcs.includes(c.speaker)), c.id + ': type + speaker');
    ok(c.title.length <= 32 && c.text.length <= 280 && c.choices.length >= 2 && c.choices.length <= 3, c.id + ': lengths');
    Object.keys(c.gate).forEach(k => ok(C.GATE_KEYS.includes(k), c.id + ': gate key ' + k));
    c.choices.forEach((ch, i) => {
      ok(ch.label.length <= 38 && ch.outcome.length <= 200 && (!ch.hint || ch.hint.length <= 48), c.id + '#' + i + ': lengths');
      const fxs = [ch.effects].concat(ch.roll ? [ch.roll.success.effects, ch.roll.fail.effects] : []).filter(Boolean);
      fxs.forEach(fx => Object.keys(fx).forEach(k => ok(C.EFFECT_KEYS.includes(k) || k === 'shop', c.id + '#' + i + ': effect key ' + k)));
      if (ch.roll) ok(/^Gamble: /.test(ch.hint || ''), c.id + '#' + i + ': gamble hint');
    });
  }
  eq(['shop_space_1', 'shop_space_2', 'shop_space_3'].map(id => cards.find(c => c.id === id).choices[0].effects.shop.move), [1, 2, 3]);
});

test('new career: gear, space, van and merch defaults', () => {
  const GG = fresh(), s = career(GG);
  eq(s.gear, { lanes: 4, doubleKick: false, owned: [], sections: [], quality: 0 });
  eq([s.spaceTier, s.space, s.spaceUpgrades], [0, 'parents_garage', []]);
  eq([s.van.tier, s.van.baseName, s.van.name, s.van.stickers, s.van.upgrades, s.van.space, s.van.comfort], [0, 'The Moose Hearse', 'The Moose Hearse', [], [], 3, 2]);
  eq(s.merch.unlocked, ['sticker', 'shirt', 'patch', 'longsleeve'], 'metal basics only');
  eq([s.merch.stock, s.merch.table, s.merch.earned, s.merch.misprint], [{}, [], 0, null]);
  eq(GG.shop.rent(s), 0);
});

test('gear: toms before ride, the pedal, funds and era gates; kit tiers in order', () => {
  const GG = fresh(), s = career(GG), S = GG.shop, evs = [];
  GG.on('shop:buy', e => evs.push(e.kind + ':' + e.id));
  s.fund = 5000;
  ok(!S.canBuyGear(s, 'ride').ok && /floor tom/i.test(S.canBuyGear(s, 'ride').why), 'ride needs the toms: ' + S.canBuyGear(s, 'ride').why);
  ok(S.buyGear(s, 'toms').ok && s.gear.lanes === 5 && s.fund === 4550, 'toms: lane 5');
  ok(S.buyGear(s, 'ride').ok && s.gear.lanes === 6, 'ride: lane 6');
  ok(S.buyGear(s, 'pedal').ok && s.gear.doubleKick && s.gear.lanes === 6, 'pedal: no new lane');
  ok(!S.buyGear(s, 'pedal').ok, 'owned once');
  eq(S.gearItems(s).map(g => g.name), ['Rack tom + floor tom', 'China cymbal', 'Double-kick pedal'], 'metal gets a china on lane 6');
  ok(!S.canBuyKit(s, 2).ok && S.buyKit(s, 1).ok && s.gear.quality === 1, 'kit tiers in order');
  ok(/Local Heroes/.test(S.canBuyKit(s, 2).why), 'pro kit gated by era: ' + S.canBuyKit(s, 2).why);
  s.era = 'local'; ok(S.buyKit(s, 2).ok && s.gear.quality === 2, 'pro kit in Local Heroes');
  s.fund = 10; ok(!S.buyGear(Object.assign(career(GG, 8), { fund: 10 }), 'toms').ok, 'no money, no toms');
  eq(evs, ['gear:toms', 'gear:ride', 'gear:pedal', 'kit:pawn_shop', 'kit:pro']);
  const a = S.gigBonus(career(GG, 9)), b = S.gigBonus(s);
  ok(b >= a + 1.5 && S.writeBonus(s) > 0 && S.crowdBonus(s) > 0, 'gear shows on stage and in new songs: ' + a + ' -> ' + b);
});

test('two-thumb rule holds with 6 lanes + the pedal + extras on every difficulty; lanes 5–6 chart', () => {
  const GG = fresh(), gear = { lanes: 6, doubleKick: true, sections: ['outro', 'solo'] };
  let lanes56 = 0, auto = 0;
  for (const genre of GG.contracts.GENRES) for (let i = 1; i <= 12; i++) {
    const p = GG.songs.generate(genre, GG.RNG(i * 31), { gear, wild: 0.8 });
    p.sections.chorus[4] = 'x.x.x.x.x.x.x.x.'; p.sections.chorus[5] = 'xxxxxxxxxxxxxxxx';   // worst case: all six lanes at once
    eq(GG.songs.validate(p, gear), [], genre + ' valid');
    for (const d of Object.keys(GG.gig.DIFFICULTIES)) {
      const ch = GG.gig.chart({ id: 's', pattern: p }, { difficulty: d }), at = {};
      ch.notes.filter(n => !n.free).forEach(n => { const k = n.t.toFixed(4); at[k] = (at[k] || 0) + 1; });
      ok(Object.values(at).every(n => n <= 2), genre + ' ' + d + ': never more than 2 at once');
      lanes56 += ch.notes.filter(n => n.li >= 4).length; auto += ch.auto.length;
    }
  }
  ok(lanes56 > 0 && auto > 0, 'toms/ride notes chart; dropped hits still auto-play (' + lanes56 + ', ' + auto + ')');
});

test('Outro/Solo: owned-only, sanitize/validate/rate/generate, chart (solo eased, outro big finish), reactions', () => {
  const GG = fresh(), S = GG.songs, none = { lanes: 4 }, both = { lanes: 4, sections: ['outro', 'solo'] };
  let p = S.addSection(S.addSection(S.signature('metal', both), 'solo', both), 'outro', both);
  eq(p.arrangement.slice(-3), ['solo', 'chorus', 'outro'], 'solo before the last chorus, outro last');
  eq(S.validate(p, both), []);
  ok(S.validate(p, none).some(e => /not unlocked/.test(e)), 'not unlocked without the gear');
  eq(S.sanitize(p, none).arrangement.indexOf('outro'), -1, 'sanitize drops unowned extras');
  ok(!S.sanitize(p, none).sections.outro, 'and their bars');
  eq(S.sectionsOf(p), ['verse', 'chorus', 'bridge', 'solo', 'outro']);
  const base = S.rate(S.signature('metal', both), 'metal', both), withX = S.rate(p, 'metal', both);
  ok(withX.hook > base.hook && withX.sections.outro != null && withX.sections.solo != null, 'hook bonus + section grooves: ' + base.hook + ' -> ' + withX.hook);
  eq(S.rate(S.signature('metal'), 'metal'), S.rate(S.signature('metal'), 'metal', none), '4-lane songs rate exactly as before');
  const notes = S.toNotes(p);
  ok(notes.some(n => n.section === 'outro') && notes.some(n => n.section === 'solo'), 'toNotes includes extras');
  const ch = GG.gig.chart({ id: 'x', pattern: p }, { solo: true });
  ok(ch.notes.filter(n => n.section === 'solo').every(n => n.step % 4 === 0), 'solo: quarter notes only (stripped kit)');
  ok(ch.solos.length === 1 && ch.sections[ch.solos[0].entry].name === 'solo', 'Dana takes the solo section, not the bridge');
  ok(ch.fills.some(f => ch.sections[f.entry].name === 'outro'), 'the outro ends on a big-finish fill');
  let extras = 0;
  for (let i = 0; i < 60; i++) { const g = S.generate('rock', GG.RNG(i + 1), { gear: both }); if (g.arrangement.includes('outro') || g.arrangement.includes('solo')) extras++; eq(S.validate(g, both), [], 'jam valid'); }
  ok(extras > 30, 'jams use owned sections: ' + extras + '/60');
  const s = career(GG); s.gear.sections = ['solo'];
  const song = S.create(s, S.addSection(S.signature('metal', s.gear), 'solo', s.gear), 'Solo Test');
  const re = S.reactions(s, song, GG.RNG(3)).find(r => r.who === 'dana');
  ok(re && !/Where does my solo go/.test(re.text), 'Dana is happy about a solo: ' + (re && re.text));
});

test('Outro unlocks after a few songs (chat moment); Dana\'s solo card in Local Heroes', () => {
  const GG = fresh(), s = career(GG, 21), evs = [];
  GG.on('shop:unlock', e => evs.push(e.kind + ':' + (e.id || e.ids)));
  s.stats.songsWritten = 3;
  week(GG, s, ['rest', 'rest', 'rest']);
  ok(s.gear.sections.includes('outro') && s.wrap.shop.unlocks.some(u => u.id === 'outro'), 'outro unlocked at the wrap');
  ok(s.wrap.chat.length >= 0 && s.chat.some(m => /ended/.test(m.text)), 'Jaxon/Dana chat moment');
  s.era = 'local'; s.stats.songsWritten = 5; s.totalWeek = 30; s.seenCards = {};
  GG.content.cards = []; s.weekStart = null; s.phase = 'monday';
  const st = GG.career.startWeek(s);
  eq(st.card && st.card.id, 'shop_space_1', 'the space offer comes first');
  GG.career.resolveCard(s, 1); GG.career.runWeek(s, AUTO); GG.career.endWeek(s);
  for (let i = 0; i < 4 && !s.gear.sections.includes('solo'); i++) {
    const w = GG.career.startWeek(s);
    if (w.card && w.card.id === 'shop_solo') GG.career.resolveCard(s, 0); else if (w.card) GG.career.resolveCard(s, 0);
    GG.career.runWeek(s, AUTO); GG.career.endWeek(s);
  }
  ok(s.gear.sections.includes('solo') && s.seenCards.shop_solo, 'Dana insists -> solo unlocked');
  ok(evs.includes('section:outro') && evs.includes('section:solo'), 'unlock events ' + evs);
});

test('spaces: era opens tiers, moving is a choice, rent in the bills, perks, upgrades once per space (couch moves)', () => {
  const GG = fresh(), S = GG.shop, s = career(GG, 31);
  s.fund = 20000;
  eq(S.availableTier(s), 0); ok(!S.canMove(s, 1).ok, 'garage era: stay home');
  const bills0 = GG.career.upkeep(s);
  ok(S.buyUpgrade(s, 'curb_couch').ok && S.buyUpgrade(s, 'egg_foam').ok && !S.buyUpgrade(s, 'curb_couch').ok, 'upgrades once');
  ok(!S.canBuyUpgrade(s, 'real_pa').ok, 'jam-room upgrades wait for the jam room');
  eq([S.perkFactor(s, 'rest'), S.perkFactor(s, 'rehearse')], [1.05, 1.03]);
  s.era = 'local';
  eq(S.availableTier(s), 1);
  const evs = []; GG.on('shop:move', e => evs.push(e.to));
  ok(S.move(s, 1).ok && s.spaceTier === 1 && s.space === 'jam_room', 'moved to the jam room');
  eq(s.spaceUpgrades, ['curb_couch'], 'the couch came along, the foam stayed on the old walls');
  eq(GG.career.upkeep(s) - bills0, 60 + 6, 'rent $60 + the Local Heroes era upkeep');
  ok(S.perkFactor(s, 'rehearse') >= 1.08, 'jam room: rehearsals count more');
  ok(S.buyUpgrade(s, 'real_pa').ok && S.perks(s).write === 1, 'PA: +write');
  s.era = 'world';
  ok(S.move(s, 3).ok && S.perks(s).rest >= 0.2 && S.perks(s).recover >= 1, 'arena backstage: rest');
  ok(S.move(s, 0).ok && S.rent(s) === 0 && s.space === 'parents_garage', 'you can always move home');
  eq(evs, ['jam_room', 'arena_backstage', 'parents_garage']);
  // perks reach the week: a rehearse block in the jam room beats the garage (same RNG)
  const a = career(GG, 40), b = career(GG, 40);
  [a, b].forEach(x => { x.era = 'local'; x.fund = 5000; x.drumSkill = 10; });
  S.move(b, 1);
  [a, b].forEach(x => { GG.career.startWeek(x); if (x.card && !x.card.resolved) GG.career.resolveCard(x, 0); GG.career.setPlan(x, ['rehearse', 'rest', 'rest']); GG.career.runWeek(x, AUTO); });
  ok((b.lastWeek.blocks[0].deltas.drumSkill || 0) >= (a.lastWeek.blocks[0].deltas.drumSkill || 0), 'jam-room rehearse >= garage');
});

test('van: tiers by era, trade-in, Part C1 names, rename, upgrades, travel mods', () => {
  const GG = fresh(), S = GG.shop, s = career(GG, 51);
  s.fund = 50000;
  ok(!S.canBuyVan(s, 1).ok && /Local Heroes/.test(S.canBuyVan(s, 1).why), 'era gate');
  ok(S.buyVanUpgrade(s, 'roof_rack').ok && s.van.space === 4, 'roof rack: +1 box');
  s.era = 'signed';
  const q = S.vanQuote(s, 2);
  ok(q.tradeIn >= 150 && q.net === q.price - q.tradeIn, 'trade-in ' + JSON.stringify(q));
  const f0 = s.fund;
  ok(S.buyVan(s, 2).ok && s.fund === f0 - q.net, 'bought the sprinter');
  eq([s.van.tier, s.van.name, s.van.baseName, s.van.space, s.van.comfort, s.van.upgrades, s.van.condition], [2, 'Black Ice', 'Black Ice', 9, 4, [], 92]);
  ok(!S.canBuyVan(s, 1).ok, 'no downgrades');
  S.renameVan(s, '  The <b>Grain</b>\n Wagon of Doom and Also Destiny ');
  eq(s.van.name, 'The bGrain/b Wagon of Doom a', 'trimmed, no markup, 28 chars');
  S.renameVan(s, '   '); eq(s.van.name, 'Black Ice', 'empty -> preset name');
  ok(S.buyVanUpgrade(s, 'bunks').ok && s.van.comfort === 5 && !S.canBuyVanUpgrade(s, 'roof_rack').ok, 'bunks; roof racks do not fit a sprinter');
  const m = S.vanMods(s); ok(m.wear < 1 && m.breakdown < 1, 'newer vehicle: less wear, fewer breakdowns');
  const fk = career(GG, 52); fk.bandId = 'frost_heave';
  eq([0, 1, 2, 3].map(t => S.vanName('frost_heave', t)), ['The Pothole', 'Squat Van', 'The Eviction Notice', 'Frost Heave One']);
});

test('stickers: one per venue played, banned venues crossed out, kept across vans', () => {
  const GG = fresh(), s = career(GG, 61), evs = [];
  GG.on('shop:sticker', e => evs.push(e.venueId + (e.banned ? ' X' : '')));
  week(GG, s, ['rest', 'rest', 'rest']);                        // week one: Buddy's house party (pre-booked)
  eq(s.van.stickers.map(x => x.venueId), ['buddys_house_party']);
  GG.shop.sticker(s, { venueId: 'buddys_house_party', name: "Buddy's" }); eq(s.van.stickers.length, 1, 'once per venue');
  s.venueRep.legion_63 = -3; s.banned.push('legion_63'); GG.shop.sticker(s, { venueId: 'legion_63', name: 'Legion Branch 63' });
  ok(GG.shop.stickers(s).find(x => x.venueId === 'legion_63').banned, 'banned: crossed out');
  s.era = 'local'; s.fund = 9000; GG.shop.buyVan(s, 1);
  eq(s.van.stickers.length, 2, 'moved to the new van');
  ok(evs[0] === 'buddys_house_party', 'sticker events ' + evs);
});

test('merch: unlock tiers, stock + table + prices, van space caps hauling, sales, unsold boxes stay home', () => {
  const GG = fresh(), S = GG.shop, s = career(GG, 71);
  s.fund = 5000;
  ok(!S.buyStock(s, 'hoodie', 1).ok, 'hoodies wait for Local Heroes');
  ok(!S.canBuyStock(s, 'shirt', 0).ok, 'at least a box');
  const r0 = S.buyStock(s, 'sticker', 1);
  ok(r0.ok && r0.cost === 80 && s.merch.stock.sticker === 200 && s.fund === 4920 && s.merch.table.includes('sticker'), 'stickers: $80 a box of 200');
  S.buyStock(s, 'patch', 2); S.buyStock(s, 'longsleeve', 2);
  eq(S.setPrice(s, 'patch', 999).price, 24, 'price clamps to 3x suggested');
  eq(S.setPrice(s, 'patch', 0.2).price, 4, 'and half of it');
  S.setPrice(s, 'patch', 8);
  const haul = S.hauling(s, null);
  eq([haul.space, haul.boxes], [3, 3], 'the minivan hauls 3 boxes');
  eq(haul.items, { sticker: 200, patch: 100, longsleeve: 20 }, 'round-robin down the table');
  eq(S.pile(s).boxes, 5, '1 + 2 + 2 boxes at home');
  const r = { venueId: 'x', name: 'X', crowd: 400, capacity: 500, grade: 'A' }, before = JSON.stringify(s.merch.stock);
  const out = S.gigMerch(s, { venueId: 'x', fit: 0.9 }, r);
  ok(out.sold > 0 && out.earned > 0 && r.merch === out, 'sold ' + out.sold + ' for $' + out.earned);
  Object.keys(out.items).forEach(id => ok(out.items[id].sold <= out.items[id].hauled, id + ' capped by what was hauled'));
  ok(s.merch.stock.longsleeve >= 20, 'the second box of longsleeves never left the garage');
  eq(s.merch.last.earned, out.earned); ok(before !== JSON.stringify(s.merch.stock), 'stock went down');
  ok(S.gigMerch(s, {}, r) === out, 'idempotent per result');
  s.era = 'local'; S.unlockMerch(s);
  ok(s.merch.unlocked.includes('hoodie') && s.merch.unlocked.includes('toque') && !s.merch.unlocked.includes('vinyl'), 'warm tier in Local Heroes; vinyl waits for a record');
  s.albums = [{ status: 'released' }]; S.unlockMerch(s); ok(s.merch.unlocked.includes('vinyl'), 'vinyl with a record out');
  s.era = 'signed'; s.fans = 6000; S.unlockMerch(s); ok(s.merch.unlocked.includes('bobblehead') && !s.merch.unlocked.includes('duke_hat'), 'limited: this band only');
  const v = S.merchView(s); ok(v.items.length >= 9 && v.space === 3 && v.pile.boxes > 0 && v.estimate.crowd > 0, 'merch view');
  const t = career(GG, 72), evs = []; GG.on('shop:unlock', e => evs.push(e.kind + ':' + (e.ids || []).join('+')));
  t.era = 'local'; week(GG, t, ['rest', 'rest', 'rest']);
  ok(t.wrap.shop.unlocks.some(u => u.kind === 'merch' && u.ids.includes('hoodie')) && evs.includes('merch:hoodie+toque'), 'a new merch tier arrives at the wrap, with news');
});

test('merch sales follow crowd, grade, price and superfans; deterministic; earnings reach the fund', () => {
  const GG = fresh(), S = GG.shop;
  function sell(opts) {
    const s = career(GG, 81); s.fund = 5000; S.buyStock(s, 'shirt', 1); s.merch.misprint = null; s.merch.stock.shirt = 24; s.merch.table = ['shirt'];
    if (opts.price) S.setPrice(s, 'shirt', opts.price);
    if (opts.super) s.fanTypes.super = opts.super;
    return S.gigMerch(s, { venueId: 'v' }, { venueId: 'v', crowd: opts.crowd || 200, grade: opts.grade || 'B' }).sold;
  }
  const base = sell({});
  eq(sell({}), base, 'deterministic');
  ok(sell({ crowd: 600 }) > base && sell({ grade: 'S' }) > sell({ grade: 'D' }), 'bigger crowds and better gigs sell more');
  ok(sell({ price: 45 }) < base && sell({ price: 12 }) >= base, 'price curve');
  ok(sell({ super: 0.18 }) > base, 'superfans buy more');
  ok(S.priceCurve(1) === 1 && S.priceCurve(2) < 0.3 && S.priceCurve(0.5) > 1.5, 'curve shape');
  const s = career(GG, 82); s.fund = 2000; S.buyStock(s, 'sticker', 1);
  GG.career.startWeek(s); if (s.card && !s.card.resolved) GG.career.resolveCard(s, 2);
  GG.career.setPlan(s, ['rest', 'rest', 'rest']); GG.career.runWeek(s, AUTO);
  const g = s.lastGig;
  ok(g && g.merch && g.merch.sold > 0, 'week one: the merch table at Buddy\'s');
  eq(g.deltas.fund, g.pay - g.cut - g.fillInCost - g.gas + g.merch.earned, 'merch earnings join the gig\'s fund change');
});

test('the misprint: first shirt order -> HALE DAMAGE card -> boxed -> collector\'s item that sells', () => {
  const GG = fresh(), S = GG.shop, s = career(GG, 91), evs = [];
  GG.on('shop:misprint', e => evs.push(e.status));
  s.fund = 3000;
  week(GG, s, ['rest', 'rest', 'rest']); week(GG, s, ['rest', 'rest', 'rest']); week(GG, s, ['rest', 'rest', 'rest']);
  const r = S.buyStock(s, 'shirt', 2);
  ok(r.misprint && s.merch.misprint.status === 'pending' && s.merch.misprint.units === 48 && !s.merch.stock.shirt, 'the whole first order says HALE');
  const st = GG.career.startWeek(s);
  eq(st.card && st.card.id, 'money_merch_misprint', 'forced next Monday');
  GG.career.resolveCard(s, 0);
  eq(s.merch.misprint.status, 'boxed'); eq(S.pile(s).items.find(x => x.misprint).units, 48);
  GG.career.runWeek(s, AUTO); GG.career.endWeek(s);
  s.fans = 500;
  for (let i = 0; i < 9; i++) week(GG, s, ['rest', 'rest', 'rest']);
  eq(s.merch.misprint.status, 'collector', 'a fan page later: collector\'s item');
  ok(s.merch.unlocked.includes('misprint') && s.merch.table[0] === 'misprint' && s.merch.stock.misprint > 0 && S.priceOf(s, 'misprint') === 60, 'on the table at $60');
  const out = S.gigMerch(s, { venueId: 'q' }, { venueId: 'q', crowd: 150, grade: 'B' });
  ok(out.items.misprint && out.items.misprint.sold > 0, 'collectors buy: ' + JSON.stringify(out.items.misprint));
  eq(evs, ['boxed', 'collector']);
  const s2 = career(GG, 92); s2.fund = 3000; s2.totalWeek = 5;
  S.buyStock(s2, 'shirt', 1); S.apply(s2, { misprint: 'reprint' }, {});
  eq([s2.merch.misprint, s2.merch.stock.shirt], [null, 24], 'reprint: normal shirts');
  S.buyStock(s2, 'shirt', 1); eq(s2.merch.stock.shirt, 48, 'only the first order is misprinted');
});

test('forced shop cards: space offer per new tier, merch intro, pawn kit, church van; one at a time', () => {
  const GG = fresh(), S = GG.shop, s = career(GG, 101);
  s.totalWeek = 5; s.fund = 300;
  eq(S.forcedCard(s).id, 'shop_merch_start');
  s.seenCards.shop_merch_start = 5;
  eq(S.forcedCard(s), null, 'cardGap');
  s.totalWeek = 9; s.fund = 900;
  eq(S.forcedCard(s), null, 'the pawn kit waits for money to spare');
  s.fund = 1200;
  eq(S.forcedCard(s).id, 'shop_pawn_kit');
  const d = {}; S.afterCard(s, S.card('shop_pawn_kit'), 0, null, d);
  eq([s.gear.quality, d.shop], [1, { kit: 1 }]);
  s.seenCards.shop_pawn_kit = 9; s.totalWeek = 20; s.era = 'signed'; s.fund = 4000;
  eq(S.forcedCard(s).id, 'shop_space_2', 'signed era: the pro studio offer (newest tier)');
  S.afterCard(s, S.card('shop_space_2'), 0, null, {}); eq(s.spaceTier, 2);
  s.seenCards.shop_space_2 = 20; s.totalWeek = 24; s.fund = 4500;
  eq(S.forcedCard(s).id, 'shop_van_deal');
  S.afterCard(s, S.card('shop_van_deal'), 0, null, {}); eq([s.van.tier, s.van.name], [1, 'The Claim Adjuster']);
  ok(/Move in/.test(GG.career.effectSummary(S.card('shop_space_1').choices[0].effects, s)), 'hint text for shop effects');
  ok(GG.career.botChoice(s, S.card('money_merch_misprint'), 'good') >= 0, 'bots can answer shop cards');
});

test('save v8 -> v9: lane-A fields filled only when missing, stickers from venues played, idempotent, codes load', () => {
  const GG = fresh(), s = career(GG, 111);
  for (let i = 0; i < 6; i++) GG.career.botWeek(s, 'avg');
  const old = JSON.parse(JSON.stringify(s));
  old.v = 8; delete old.spaceTier; delete old.spaceUpgrades; delete old.merch;
  old.gear = { lanes: 5, doubleKick: true };
  ['tier', 'baseName', 'stickers', 'upgrades'].forEach(k => delete old.van[k]);
  old.venueLast = { legion_63: 3, buddys_house_party: 1 }; old.banned = ['legion_63'];
  const m = GG.save.migrate(JSON.parse(JSON.stringify(old)));
  eq(m.v, GG.contracts.SAVE_SCHEMA); ok(GG.contracts.SAVE_SCHEMA >= 9, "schema 9 or later");
  eq(m.gear, { lanes: 5, doubleKick: true, owned: ['toms', 'pedal'], sections: [], quality: 0 }, 'owned gear read off the old kit');
  eq([m.spaceTier, m.space, m.spaceUpgrades, m.van.tier, m.van.baseName, m.van.name, m.van.upgrades], [0, 'parents_garage', [], 0, 'The Moose Hearse', 'The Moose Hearse', []]);
  eq(m.van.stickers.map(x => x.venueId + (x.banned ? ' X' : '')), ['buddys_house_party', 'legion_63 X'], 'the scrapbook from venueLast, banned crossed out');
  ok(m.merch && Array.isArray(m.merch.unlocked) && m.merch.unlocked.includes('shirt') && m.merch.misprint === null, 'merch defaults');
  eq(JSON.stringify(GG.save.migrate(JSON.parse(JSON.stringify(m)))), JSON.stringify(m), 'idempotent');
  const kept = JSON.parse(JSON.stringify(m)); kept.van.name = 'Rusty'; kept.merch.stock = { shirt: 12 }; kept.gear.quality = 2;
  const k2 = GG.save.migrate(kept); eq([k2.van.name, k2.merch.stock, k2.gear.quality], ['Rusty', { shirt: 12 }, 2], 'existing values kept');
  const back = GG.save.fromCode(GG.save.toCode(m)); eq(JSON.stringify(back), JSON.stringify(m), 'save code round-trip');
});

test('bots shop sensibly and careers stay deterministic', () => {
  const GG = fresh(), runs = [1, 2].map(() => { const s = career(GG, 121); for (let i = 0; i < 72; i++) GG.career.botWeek(s, 'good'); return s; });
  eq(JSON.stringify(runs[0]), JSON.stringify(runs[1]), 'same seed, same career');
  const s = runs[0];
  ok(s.gear.owned.length >= 2, 'good bot bought gear by year 3: ' + s.gear.owned);
  ok(s.merch.earned > 0 && s.merch.spent > 0, 'good bot runs a merch table: earned ' + s.merch.earned + ' spent ' + s.merch.spent);
  ok(s.fund >= 0 && isFinite(s.fund), 'solvent');
  const a = career(GG, 122); for (let i = 0; i < 48; i++) GG.career.botWeek(a, 'avg');
  ok(a.fund >= 0 && a.merch && isFinite(a.merch.earned), 'avg bot fine');
});

test('v0.9: every band\'s van, misprint (Q6) and forced cards through their band variants', () => {
  const GG = fresh(), S = GG.shop, K = GG.content.shop;
  Object.keys(GG.content.bands).forEach(id => {
    const s = GG.career.newCareer({ seed: 3, bandId: id });
    eq(s.van.name, (K.vanNames[id] || [])[0] || 'The Van', id + ' tier-0 van');
    ok(S.misprintInfo(s).typo && S.misprintInfo(s).name.indexOf(S.misprintInfo(s).typo) === 0, id + ' misprint ' + S.misprintInfo(s).typo);
  });
  eq(['hail_damage', 'frost_heave', 'gravel_kings', 'grid_road_ramblers'].map(id => S.misprintInfo({ bandId: id }).typo),
    ['HALE DAMAGE', 'FROST HEAVY', 'GRAVY KINGS', 'THE GRID ROAD RUMBLERS'], 'owner Q6');
  eq(S.vanName('no_such_band', 0), 'The Van', 'no borrowed Moose Hearse');
  // Frost Heave: the Hail Damage misprint card never fits; a band variant does
  const fh = GG.career.newCareer({ seed: 3, bandId: 'frost_heave' });
  fh.fund = 5000; S.unlockMerch(fh, true);
  const shirt = S.merchItems(fh).find(x => x.id === 'shirt');
  if (shirt && shirt.unlocked) {
    eq(S.buyStock(fh, 'shirt', 1).misprint, false, 'no misprint card for this band: a normal order');
    const base = S.card('money_merch_misprint');
    // a band variant voices and moves its own band (Hail Damage mood keys -> role aliases; career.cardOk rejects others')
    const own = JSON.parse(JSON.stringify(base.choices).replace(/"(marcel|dana|jaxon|kenji)":/g, '"@front":'));
    GG.content.shopCards.push(Object.assign({}, base, { id: 'money_merch_misprint_frost_heave', speaker: 'rox', gate: { band: ['frost_heave'] }, choices: own }));
    try {
      const f2 = GG.career.newCareer({ seed: 4, bandId: 'frost_heave' }); f2.fund = 5000; S.unlockMerch(f2, true);
      eq(S.buyStock(f2, 'shirt', 1).misprint, true, 'the band variant misprints the first order');
      f2.totalWeek = 10;
      const c = S.forcedCard(f2);
      eq(c && c.id, 'money_merch_misprint_frost_heave', 'the variant is dealt');
      eq(S.merchItems(f2).find(x => x.id === 'misprint') ? S.merchItems(f2).find(x => x.id === 'misprint').name : S.misprintInfo(f2).name, 'FROST HEAVY shirts (misprint)');
    } finally { GG.content.shopCards.pop(); }
  }
  // the solo card is the soloist's: Hail Damage's (Dana's) never goes to another band; the auto path still unlocks it
  const gk = GG.career.newCareer({ seed: 5, bandId: 'gravel_kings' });
  gk.era = 'local'; gk.eraHistory.push({ era: 'local', week: 2 }); gk.stats.songsWritten = 9; gk.totalWeek = 30;
  ok(!S.forcedCard(gk) || !/^shop_solo/.test(S.forcedCard(gk).id), 'no Dana card for Gravel Kings');
  gk.totalWeek = 2 + GG.content.economy.shop.soloAutoWeeks + 1;
  S.weekly(gk, GG.rngFor(gk), {});
  ok(S.ownsSection(gk, 'solo'), 'the solo arrives on its own');
});

done('sim_shop');
