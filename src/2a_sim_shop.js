// 2a_sim_shop.js (v0.8 "Kit", KITSIM): the shop side of the career. Pure sim: no DOM, no audio; the merch table rolls its
// own RNG (career seed + week + venue + item) so it never shifts the career RNG. Content: content/shop.js (catalogue,
// prices, perks, names); numbers: economy.shop; cards: content/cards.js GG.content.shopCards (forced only, never drawn).
//  - Gear: toms (lane 5), ride/china (lane 6, needs the toms), the double-kick pedal; kit quality tiers 0..3
//    (C.KIT_QUALITY, bought in order, gated by era; the audio reads state.gear.quality). Extra sections (C.EXTRA_SECTIONS):
//    Outro unlocks free after a few songs (a Jaxon/Dana chat moment at the wrap), Solo in Local Heroes (Dana insists: card).
//    Gear shows on stage (gigBonus), in new songs (writeBonus), in the studio (recordBonus) and in the live crowd.
//  - Spaces (C.SPACE_TIERS): each era opens the next tier; moving is your choice (an offer card + GG.shop.move from the
//    garage door); weekly rent goes into career.upkeep; perks: jam room rehearse, pro studio write + record, arena
//    backstage rest. Upgrades are bought once per space (the couch and the beer fridge move with you).
//  - The van (C.VAN_TIERS): minivan -> 15-passenger + trailer -> sprinter -> tour bus (trade-in), preset names per band per
//    tier (Part C1), rename, upgrades (space / comfort / wear / breakdowns / chemistry), a sticker for every venue played
//    (banned venues crossed out). van.space = merch boxes the van hauls to a gig.
//  - Merch: items unlock by C.MERCH_TIERS; pick items for the table + prices, buy stock up front (boxes), the van hauls
//    what fits; sales = crowd x gig grade x appeal x price curve (+ genre fit, superfans, season); unsold stock stays home
//    as the box pile. The first shirt order comes back misprinted (money_merch_misprint) -> boxed -> a collector's item.
// API (GG.shop):
//   cfg() · content() · init(s) · ensure(s) · migrate(s) (v8 -> v9 fill, idempotent)
//   Gear: gearItems(s) · gearDef(id) · gearName(s, def) · ownsGear(s, id) · canBuyGear(s, id) · buyGear(s, id)
//         kitTiers(s) · kitDef(tier) · canBuyKit(s, tier) · buyKit(s, tier) · ownsSection(s, id) · unlockSection(s, id, why)
//         gigBonus(s) · writeBonus(s) · crowdBonus(s)
//   Spaces: spaces(s) · spaceDef(s, tier) · availableTier(s) · canMove(s, tier) · move(s, tier) · rent(s) · perks(s)
//         perkFactor(s, activity) · upgrades(s) · upgradeDef(id) · canBuyUpgrade(s, id) · buyUpgrade(s, id)
//         (2 wraps in a row with < 2 weeks' rent in the fund: evicted one tier down, wrap.shop.evicted, state.rentLate)
//   Van: vans(s) · vanTierDef(tier) · vanName(bandId, tier) · vanQuote(s, tier) · canBuyVan(s, tier) · buyVan(s, tier)
//         renameVan(s, name) · vanUpgrades(s) · vanUpgradeDef(id) · canBuyVanUpgrade(s, id) · buyVanUpgrade(s, id) · vanMods(s) · stickers(s)
//         sticker(s, gigOrResult) · banSticker(s, venueId)
//   Merch: merchDef(id) · merchItems(s) · merchView(s) · tierUnlocked(s, tierId) · unlockMerch(s) · setTable(s, ids)
//         toggleTable(s, id, on) · setPrice(s, id, $) · priceOf(s, id) · priceRange(s, id) · stockCost(s, id, boxes)
//         canBuyStock(s, id, boxes) · buyStock(s, id, boxes) · pile(s) · hauling(s, g) · priceCurve(ratio) · sales(s, ids, o)
//         demand(s, id, o) · estimate(s, g)
//         gigMerch(s, g, r) (GG.gig.applyResult -> r.merch) · misprint(s)
//   Week: forcedCard(s) · afterCard(s, card, i, success, d) · apply(s, shopEffect, d) · weekly(s, rng, wrap) (wrap.shop =
//         { rent, unlocks: [{ kind, id|ids }], misprint, perks, evicted, rentLate }) · cards() · card(id)
//         effectText(v) · botValue(s, v) · botWeek(s, style)
//   v0.9: spaceDef localises rented rooms (spaces[tier].byCity[city] = { name, blurb }, owner Q7) · upgradeView(s, id)
//         (upgrades[id].bySpace[spaceId] = { name, blurb }) · misprintInfo(s) -> { typo, find, replace, stash, name } (owner
//         Q6) · lineList(s, key) (shop.lines + byBand) · variantCard(s, id) ('<id>_<bandId>' first; gate + speaker)
//   Every buy returns { ok: true, cost, deltas } or { ok: false, why } (why: plain words for the UI).
// Events: 'shop:buy' { kind: 'gear'|'kit'|'upgrade'|'van'|'vanUpgrade'|'stock', id, cost } · 'shop:unlock' { kind:
//   'section'|'merch', id|ids, why } · 'shop:move' { from, to, tier, evicted? } · 'shop:rename' { name } · 'shop:sticker' { venueId,
//   name, banned } · 'shop:misprint' { status: boxed|reprint|wear|collector, units } · 'shop:merch' { venueId, sold, earned } (every gig).
(function (GG) {
  var C = GG.contracts, U = GG.util;
  var S = GG.shop = GG.shop || {};

  var DEF = {
    cardFrom: 3, cardGap: 3, outroSongs: 3, soloSongs: 4, soloRetry: 10, soloAutoWeeks: 16, rentLateWeeks: 2,
    gigBonus: { quality: [0, 0.5, 1, 2], lane: 0.25, pedal: 0.25 }, writeBonus: [0, 0.5, 1, 1.5], recordBonus: [0, 0.25, 0.5, 1],
    crowdBonus: [0, 0.5, 1, 2], songs: { fillHook: 3, rideHook: 2, outroHook: 4, soloHook: 3, soloWeight: 0.5, outroWeight: 0.5 },
    jam: { outro: 0.6, solo: 0.5, tomFill: 0.6, ride: 0.5, pedalRun: 0.85 }, soloCrowd: 3, tradeIn: 0.3, tradeInMin: 150, stickersMax: 160,
    merch: { buyRate: 0.04, crowdRef: 50, crowdExp: 0.7, variety: 0.1, varietyMax: 5, grade: { S: 1.5, A: 1.25, B: 1, C: 0.75, D: 0.45 },
      fit: [0.6, 0.4], elasticity: 1.6, curveMax: 2.2, noise: [0.85, 1.15], superfan: 1.5, superfanRef: 0.06, opening: 0.6, flyBoxes: 2, priceRange: [0.5, 3],
      misprint: { units: 50, weeks: 8, minFans: 300 } },
    bot: { good: { cushion: 1200, kitCushion: 1500, vanCushion: 1500, rentWeeks: 20, downsize: 8, upgradeCushion: 1500, merchCushion: 400, merchGigs: 3 },
      avg: { chance: 0.3, cushion: 900, kitCushion: 2500, vanCushion: 6000, rentWeeks: 40, downsize: 5, upgradeCushion: 3000, merchCushion: 700, merchGigs: 2 } }
  };
  function isObj(o) { return o && typeof o === 'object' && !Array.isArray(o); }
  function merge(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in b) o[k] = isObj(a[k]) && isObj(b[k]) ? merge(a[k], b[k]) : b[k]; return o; }
  var cache = { src: null, val: DEF };
  S.cfg = function () {
    var e = GG.content.economy && GG.content.economy.shop;
    if (!e) return DEF;
    if (cache.src !== e) { cache.src = e; cache.val = merge(DEF, e); }
    return cache.val;
  };
  var EMPTY = { gear: [], kit: [{ tier: 0, id: 'milk_crate', name: 'Kit', cost: 0, era: 'garage' }], sections: {}, spaces: [{ tier: 0, id: 'start', name: 'Home', rent: 0, era: 'garage', perk: {} }],
    upgrades: [], vanTiers: [{ tier: 0, id: 'minivan', kind: 'Van', price: 0, era: 'garage', space: 3, comfort: 2, condition: 72, wear: 1, breakdown: 1 }],
    vanNames: {}, vanUpgrades: [], merchTiers: [{ id: 'basics', era: 'garage' }], merch: [], lines: {} };
  S.content = function () { return GG.content.shop || EMPTY; };
  function K() { return S.content(); }
  function Q() { return S.cfg(); }

  /* ---- Small helpers --------------------------------------------------------------------------------------------- */
  function eraIdx(e) { var i = C.ERAS.indexOf(e); return i < 0 ? 0 : i; }
  function eraOk(s, era) { return eraIdx(s && s.era) >= eraIdx(era || 'garage'); }
  function eraName(e) { return { garage: 'the Garage era', local: 'Local Heroes', signed: 'the Signed era', world: 'the World stage' }[e] || e; }
  function money(n) { return U.fmtMoney(n); }
  function has(list, v) { return Array.isArray(list) && list.indexOf(v) >= 0; }
  function find(list, id) { for (var i = 0; i < (list || []).length; i++) if (list[i].id === id) return list[i]; return null; }
  function changed(s) { GG.emit('stats:changed', { state: s }); }
  function fail(why) { return { ok: false, why: why }; }
  function spend(s, cost) { var d = {}; if (cost) GG.career.applyEffects(s, { fund: -cost }, d); return d; }
  function active(s) { return (s.members || []).filter(function (m) { return m.status === 'active'; }); }
  function isActive(s, id) { return active(s).some(function (m) { return m.id === id; }); }
  function seeded(s, tag) { return GG.RNG(GG.hashSeed((s.seed >>> 0) + '|shop|' + tag + '|' + s.totalWeek)); }
  function upkeepMul(s) { return GG.difficulty ? GG.difficulty.mul(s, 'upkeep') : 1; }
  // Group-chat lines from content: shop.lines[key] + shop.byBand[bandId].lines[key] (v0.9). A role alias resolves; a line
  // whose speaker isn't an active bandmate (or an npc/cast the band may hear from) is skipped.
  function lineList(s, key) {
    var v = GG.career && GG.career.pool ? GG.career.pool(s, K(), ['lines', key]) : (K().lines || {})[key];
    return Array.isArray(v) ? v : [];
  }
  S.lineList = lineList;
  function chat(s, list, d) {
    if (!GG.career || !GG.career.postChat) return [];
    return (list || []).map(function (x) {
      if (!x || !x.text) return null;
      var who = GG.career.isAlias && GG.career.isAlias(x.who) ? GG.career.roleOf(s, x.who) : x.who;
      if (!who) return null;
      var member = (s.members || []).some(function (m) { return m.id === who; });
      if (member ? !isActive(s, who) : GG.career.speakerOk && !GG.career.speakerOk(s, who)) return null;
      return GG.career.postChat(s, who, x.text, d || null);
    }).filter(Boolean);
  }

  /* ---- State ----------------------------------------------------------------------------------------------------- */
  function defaultMerch(s) {
    return { unlocked: [], stock: {}, price: {}, sold: {}, earned: 0, spent: 0, table: [], last: null, misprint: null, shirtsOrdered: false };
  }
  // Fills every lane-A field that is missing (idempotent). Old saves: owned gear is read off gear.lanes/doubleKick,
  // the van gets its tier-0 name for the band, and the venues you already played become stickers.
  S.ensure = function (s) {
    if (!s || typeof s !== 'object') return s;
    var g = s.gear && typeof s.gear === 'object' && !Array.isArray(s.gear) ? s.gear : (s.gear = { lanes: 4, doubleKick: false });
    if (!isFinite(g.lanes)) g.lanes = 4;
    g.lanes = U.clamp(Math.round(g.lanes), 4, C.LANES.length);
    g.doubleKick = !!g.doubleKick;
    if (!Array.isArray(g.owned)) {
      g.owned = [];
      if (g.lanes >= 5) g.owned.push('toms');
      if (g.lanes >= 6) g.owned.push('ride');
      if (g.doubleKick) g.owned.push('pedal');
    }
    if (!Array.isArray(g.sections)) g.sections = [];
    g.sections = C.EXTRA_SECTIONS.filter(function (x) { return g.sections.indexOf(x) >= 0; });
    if (!isFinite(g.quality)) g.quality = 0;
    g.quality = U.clamp(Math.round(g.quality), 0, C.KIT_QUALITY.length - 1);
    if (!isFinite(s.spaceTier)) s.spaceTier = 0;
    s.spaceTier = U.clamp(Math.round(s.spaceTier), 0, C.SPACE_TIERS.length - 1);
    if (typeof s.space !== 'string') s.space = S.spaceDef(s, s.spaceTier).id;
    if (!Array.isArray(s.spaceUpgrades)) s.spaceUpgrades = [];
    if (!s.van || typeof s.van !== 'object' || Array.isArray(s.van)) s.van = GG.world ? GG.world.defaultVan(s) : { name: '', condition: 72, space: 3, comfort: 2, km: 0 };
    var v = s.van;
    if (!isFinite(v.tier)) v.tier = 0;
    v.tier = U.clamp(Math.round(v.tier), 0, C.VAN_TIERS.length - 1);
    if (typeof v.baseName !== 'string' || !v.baseName) v.baseName = S.vanName(s.bandId, v.tier);
    if (typeof v.name !== 'string' || !v.name) v.name = v.baseName;
    if (!Array.isArray(v.upgrades)) v.upgrades = [];
    if (!Array.isArray(v.stickers)) {
      v.stickers = [];
      var last = s.venueLast && typeof s.venueLast === 'object' ? s.venueLast : {};
      Object.keys(last).sort(function (a, b) { return last[a] - last[b] || (a < b ? -1 : 1); }).forEach(function (id) {
        var vd = GG.gig && GG.gig.venue ? GG.gig.venue(id) : null;
        v.stickers.push({ venueId: id, name: vd ? vd.name : id, week: isFinite(last[id]) ? last[id] : 0, banned: has(s.banned, id) });
      });
    }
    syncVan(s);
    var freshMerch = !s.merch || typeof s.merch !== 'object' || !Array.isArray(s.merch.unlocked) || !s.merch.unlocked.length;
    if (!s.merch || typeof s.merch !== 'object' || Array.isArray(s.merch)) s.merch = defaultMerch(s);
    var m = s.merch, dm = defaultMerch(s);
    Object.keys(dm).forEach(function (k) {
      if (k === 'misprint' || k === 'last') { if (m[k] === undefined) m[k] = null; return; }
      if (typeof dm[k] === 'boolean') { m[k] = !!m[k]; return; }
      if (Array.isArray(dm[k])) { if (!Array.isArray(m[k])) m[k] = []; }
      else if (typeof dm[k] === 'number') { if (!isFinite(m[k])) m[k] = 0; }
      else if (!isObj(m[k])) m[k] = {};
    });
    if (freshMerch) S.unlockMerch(s, true);   // a new career / an old save: everything its era has opened, quietly (later: weekly, with news)
    seatGearSync(s);   // v1.1: a string seat's rig follows the gear the band owns (no-op on drums)
    return s;
  };
  // A new career: the band's own tier-0 vehicle name (world.defaultVan names every van The Moose Hearse).
  S.init = function (s) {
    S.ensure(s);
    if (s.van && !s.van.tier) { s.van.baseName = S.vanName(s.bandId, 0); s.van.name = s.van.baseName; }
    return s;
  };
  S.migrate = function (s) { return S.ensure(s); };

  /* ---- Gear: lanes, the pedal, kit quality, extra sections ------------------------------------------------------- */
  // v1.1 "Seats" (plan_contract_1.1 §4.6, owner E14b): a string seat buys the same three items at the same prices and eras,
  // renamed for its rig (content shop.gear[i].bySeat[seat] = { name, names: { <genre>: name }, blurb } and shop.kit[i].bySeat;
  // the parody fallbacks below until content has them). One purchase sets both: the band's kit grows exactly as today
  // (gear.owned / lanes / doubleKick: the swapped drummer gets the matching drum piece, a chat line) AND your rig
  // (gear.seatLanes[seat] 5 / 6, capped by C.SEAT_MAX_LANES: bass's 'ride' is the fridge, a cab with no lane;
  // gear.runs[seat] from the 'pedal'). Amp tier 2 adds the lead's whammy (bends score a bonus). gigBonus, botWeek, merch
  // and balance are unchanged.
  var SEAT_GEAR = {
    bass: { toms: { names: { metal: 'Low B of Doom', punk: 'Five-String (Duct-Taped)', rock: 'The Thunder-Plank V', country: 'The Five-String Boomer' },
        blurb: 'A fifth string, lower than your opinions. Lane 5: the bottom of the bottom end.' },
      ride: { names: { metal: 'The Cryo-Fridge 8x10', punk: 'A Church-Basement Fridge Cab', rock: 'The Walk-In Freezer', country: 'The Grain-Bin Cab' },
        blurb: 'Eight ten-inch speakers in a box the size of a fridge. No new lane. Everyone feels it in their fillings.' },
      pedal: { names: { metal: 'Gallop Finger Tape', punk: 'Downstroke Wrist Brace', rock: 'Slap-Happy Tape', country: 'Walking-Boots Finger Picks' },
        blurb: 'Fast fingers: hold a run and it plays itself. Without them a run is thinned to the beat.' } },
    rhythm: { toms: { names: { metal: 'The Drop-Tune Neck', punk: 'Fresh Strings, All Six', rock: 'The Big Chord Neck', country: 'The Capo of Destiny' },
        blurb: 'More neck, more chords. Lane 5: higher voicings for the big moments.' },
      ride: { names: { metal: 'Seven-String of the Abyss', punk: 'A Second Pickup (Unwired)', rock: 'The Twelve-String Shimmer', country: 'Nashville Strings' },
        blurb: 'Lane 6: the top of the neck, for the shimmer and the shout.' },
      pedal: { names: { metal: 'The Chug Glove', punk: 'The 8th-Note Wristband', rock: 'Turbo Shark-Fin Picks', country: 'Boom-Chick Thumb Pick' },
        blurb: 'Fast picking: hold a run and the chugs keep coming. Without it a run is thinned to the beat.' } },
    lead: { toms: { names: { metal: 'Jumbo Frets of Woe', punk: 'Frets Filed Flat', rock: 'The Fret Job Supreme', country: 'Earl-Approved Frets' },
        blurb: 'Big frets, easy bends. Lane 5: higher notes for the hook.' },
      ride: { names: { metal: 'Twenty-Four Frets of Fury', punk: 'The Extra Fret Nobody Uses', rock: 'Dive-Bomb Neck', country: 'The Pedal-Steel Wannabe' },
        blurb: 'Lane 6: the very top of the neck. Dogs in three townships hear the solo.' },
      pedal: { names: { metal: 'Shred Picks', punk: 'Fast Picks (Stolen)', rock: 'The Sweep Kit', country: 'Chicken-Pickin\u2019 Picks' },
        blurb: 'Shred picks: hold a run and it rips. Without them a run is thinned to the beat.' } }
  };
  var SEAT_KIT = ['Practice Amp With the Hum', 'Pawn Shop Combo', 'The Maple Leaf Stack', 'The Arena Rig'];
  var SEAT_KIT_BLURB = ['It hums in E-flat. You tuned to it.', 'Two knobs work. The third one is for show.',
    'A half-stack with a maple leaf on the grille. It does not go to eleven; it goes to "pardon?"',
    'A wall of cabinets and an amp tech named Doug. Doug has opinions.'];
  function seatOf(s) { return GG.career && GG.career.seatOf ? GG.career.seatOf(s) : 'drums'; }
  function seatInfo(s, def) {
    var seat = seatOf(s);
    if (seat === 'drums' || !def) return null;
    var c = def.bySeat && def.bySeat[seat], fb = SEAT_GEAR[seat] && SEAT_GEAR[seat][def.id];
    if (def.tier != null) fb = { name: SEAT_KIT[def.tier] || def.name, blurb: SEAT_KIT_BLURB[def.tier] || def.blurb };
    var g = s && s.genre;
    return { name: (c && c.names && c.names[g]) || (c && c.name) || (fb && fb.names && fb.names[g]) || (fb && fb.name) || def.name,
      blurb: (c && c.blurb) || (fb && fb.blurb) || def.blurb };
  }
  // What a gear item adds to a string seat's rig: { lane: 5|6|null, runs: bool, cab: bool } (null on drums).
  S.seatGearEffect = function (s, id) {
    var def = typeof id === 'string' ? S.gearDef(id) : id, seat = seatOf(s);
    if (!def || seat === 'drums') return null;
    var max = C.SEAT_MAX_LANES[seat] || 6, lane = def.lane && def.lane <= max ? def.lane : null;
    return { lane: lane, runs: !!def.pedal, cab: !!def.lane && !lane };
  };
  function seatGearSync(s) {
    var seat = seatOf(s), g = s.gear;
    if (seat === 'drums' || !g || !isObj(g.seatLanes)) return;
    var max = C.SEAT_MAX_LANES[seat] || 6, n = 4;
    (g.owned || []).forEach(function (id) { var d = S.gearDef(id); if (d && d.lane && d.lane <= max) n = Math.max(n, d.lane); });
    g.seatLanes[seat] = U.clamp(Math.max(isFinite(g.seatLanes[seat]) ? g.seatLanes[seat] : 4, n), 4, max);
    if (!isObj(g.runs)) g.runs = { bass: false, rhythm: false, lead: false };
    if (has(g.owned, 'pedal')) g.runs[seat] = true;
  }
  S.seatGearSync = seatGearSync;
  S.gearDef = function (id) { return find(K().gear, id); };
  S.gearName = function (s, def) {
    def = typeof def === 'string' ? S.gearDef(def) : def;
    var si = seatInfo(s, def);
    return si ? si.name : def ? (def.names && def.names[s && s.genre]) || def.name : '';
  };
  S.ownsGear = function (s, id) { return has(s.gear && s.gear.owned, id); };
  S.canBuyGear = function (s, id) {
    var def = S.gearDef(id);
    if (!def) return fail('Not in the shop.');
    if (S.ownsGear(s, id)) return fail(seatOf(s) === 'drums' ? 'Already on the kit.' : 'Already in your rig.');
    if (!eraOk(s, def.era)) return fail('Unlocks in ' + eraName(def.era) + '.');
    if (def.needs && !S.ownsGear(s, def.needs)) return fail('Needs the ' + S.gearName(s, def.needs).toLowerCase() + ' first.');
    if (s.fund < def.cost) return fail('Not enough in the fund (' + money(def.cost) + ').');
    return { ok: true, cost: def.cost };
  };
  S.buyGear = function (s, id) {
    var q = S.canBuyGear(s, id);
    if (!q.ok) return q;
    var def = S.gearDef(id), d = spend(s, def.cost), g = s.gear;
    g.owned.push(id);
    if (def.lane) g.lanes = Math.max(g.lanes, Math.min(def.lane, C.LANES.length));
    if (def.pedal) g.doubleKick = true;
    if (seatOf(s) !== 'drums') {   // v1.1: your rig grows too; the swapped drummer gets the matching drum piece
      seatGearSync(s);
      chat(s, lineList(s, 'drummerGear').length ? lineList(s, 'drummerGear') : DRUMMER_GEAR, d);
    }
    GG.emit('shop:buy', { kind: 'gear', id: id, cost: def.cost });
    changed(s);
    return { ok: true, cost: def.cost, deltas: d };
  };
  var DRUMMER_GEAR = [{ who: '@drummer', text: 'The shop threw in a drum piece with your {gear} upgrade. I am keeping it. It is mine now.' }];
  S.gearItems = function (s) {
    return K().gear.map(function (def) {
      var c = S.canBuyGear(s, def.id), si = seatInfo(s, def), se = S.seatGearEffect(s, def);
      var o = { id: def.id, name: S.gearName(s, def), blurb: si ? si.blurb : def.blurb, cost: def.cost, lane: se ? se.lane : def.lane || null, pedal: !!def.pedal,
        era: def.era, needs: def.needs || null, owned: S.ownsGear(s, def.id), can: c.ok, why: c.ok ? '' : c.why };
      if (se) { o.seat = seatOf(s); o.runs = se.runs; o.cab = se.cab; }   // v1.1: what it does for your rig
      return o;
    });
  };
  S.kitDef = function (tier) { var k = K().kit; for (var i = 0; i < k.length; i++) if (k[i].tier === tier) return k[i]; return null; };
  S.canBuyKit = function (s, tier) {
    var def = S.kitDef(tier), q = s.gear.quality;
    if (!def) return fail('Not in the shop.');
    if (tier <= q) return fail(seatOf(s) === 'drums' ? 'You already play a better kit.' : 'You already play a better amp.');
    if (tier !== q + 1) return fail((seatOf(s) === 'drums' ? 'One kit at a time: ' : 'One amp at a time: ') + S.kitName(s, S.kitDef(q + 1)) + ' first.');
    if (!eraOk(s, def.era)) return fail('Unlocks in ' + eraName(def.era) + '.');
    if (s.fund < def.cost) return fail('Not enough in the fund (' + money(def.cost) + ').');
    return { ok: true, cost: def.cost };
  };
  S.buyKit = function (s, tier) {
    var q = S.canBuyKit(s, tier);
    if (!q.ok) return q;
    var def = S.kitDef(tier), d = spend(s, def.cost);
    s.gear.quality = tier;
    GG.emit('shop:buy', { kind: 'kit', id: def.id, tier: tier, cost: def.cost });
    changed(s);
    return { ok: true, cost: def.cost, deltas: d };
  };
  // v1.1: the kit tier's name for your seat (amp tiers on string seats; content kit[i].bySeat[seat] wins).
  S.kitName = function (s, k) { var si = seatInfo(s, k); return si ? si.name : k ? k.name : ''; };
  S.whammy = function (s) { return seatOf(s) === 'lead' && !!s.gear && (s.gear.quality || 0) >= 2; };   // lead: amp tier 2 adds the whammy
  S.kitTiers = function (s) {
    var q = s.gear.quality, seat = seatOf(s);
    return K().kit.map(function (k) {
      var c = S.canBuyKit(s, k.tier), si = seatInfo(s, k);
      var o = { tier: k.tier, id: k.id, name: si ? si.name : k.name, blurb: si ? si.blurb : k.blurb, cost: k.cost, era: k.era, owned: k.tier <= q, current: k.tier === q,
        next: k.tier === q + 1, can: c.ok, why: c.ok || k.tier <= q ? '' : c.why };
      if (si) { o.seat = seat; if (seat === 'lead' && k.tier >= 2) o.whammy = true; }
      return o;
    });
  };
  S.ownsSection = function (s, id) { return has(s.gear && s.gear.sections, id); };
  // Unlocks an extra section (outro | solo). Returns true when it was new. Emits 'shop:unlock'.
  S.unlockSection = function (s, id, why) {
    if (C.EXTRA_SECTIONS.indexOf(id) < 0 || S.ownsSection(s, id)) return false;
    s.gear.sections.push(id);
    s.gear.sections = C.EXTRA_SECTIONS.filter(function (x) { return s.gear.sections.indexOf(x) >= 0; });
    GG.emit('shop:unlock', { kind: 'section', id: id, why: why || null });
    return true;
  };
  function laneCount(s) { return (S.ownsGear(s, 'toms') ? 1 : 0) + (S.ownsGear(s, 'ride') ? 1 : 0); }
  // Gear on stage: + gig performance (the band's number before noise). Kit tier dominates; every lane and the pedal help.
  S.gigBonus = function (s) {
    var G = Q().gigBonus, q = s.gear ? s.gear.quality || 0 : 0;
    return (G.quality[q] || 0) + laneCount(s) * G.lane + (s.gear && s.gear.doubleKick ? G.pedal : 0);
  };
  S.writeBonus = function (s) { return (Q().writeBonus[s.gear ? s.gear.quality || 0 : 0] || 0) + (S.perks(s).write || 0); };
  S.crowdBonus = function (s) { return Q().crowdBonus[s.gear ? s.gear.quality || 0 : 0] || 0; };

  /* ---- Spaces: tiers by era, rent, perks, upgrades --------------------------------------------------------------- */
  // v0.9 (owner Q7): a rented room keeps its geometry but gets a local name + blurb: spaces[tier].byCity[<city name | city
  // id>] = { name, blurb }. Tier 0 is the band's own space (bands.js spaceName).
  function localOf(s, by) {
    if (!by || !s || !s.city) return null;
    var cid = GG.world && GG.world.cityId ? GG.world.cityId(s.city) : null;
    return by[s.city] || (cid && by[cid]) || by[String(s.city).toLowerCase()] || null;
  }
  S.spaceDef = function (s, tier) {
    var list = K().spaces, def = null;
    for (var i = 0; i < list.length; i++) if (list[i].tier === tier) def = list[i];
    def = def || list[0] || EMPTY.spaces[0];
    var loc = localOf(s, def.byCity) || {};
    if (tier !== 0) return Object.assign({}, def, { id: def.id || C.SPACE_TIERS[tier], name: loc.name || def.name, blurb: loc.blurb || def.blurb });
    var b = GG.career && GG.career.band ? GG.career.band(s) : null;
    return Object.assign({}, def, { id: (b && b.space) || 'parents_garage', name: (b && b.spaceName) || loc.name || def.name, blurb: loc.blurb || def.blurb });
  };
  // The biggest space tier your era has opened (garage 0, Local Heroes 1, Signed 2, World 3).
  S.availableTier = function (s) {
    var best = 0;
    K().spaces.forEach(function (x) { if (eraOk(s, x.era) && x.tier > best) best = x.tier; });
    return Math.min(best, C.SPACE_TIERS.length - 1);
  };
  S.rent = function (s) { return S.spaceDef(s, s.spaceTier || 0).rent || 0; };
  S.canMove = function (s, tier) {
    var def = K().spaces.filter(function (x) { return x.tier === tier; })[0];
    if (!def) return fail('No such space.');
    if (tier === (s.spaceTier || 0)) return fail('You rehearse here already.');
    if (tier > S.availableTier(s)) return fail('Opens in ' + eraName(def.era) + '.');
    if (def.rent && s.fund < def.rent) return fail('You need the first week\'s rent (' + money(def.rent) + ').');
    return { ok: true, cost: 0, rent: def.rent || 0 };
  };
  S.move = function (s, tier) {
    var q = S.canMove(s, tier);
    if (!q.ok) return q;
    var from = s.space, def = S.spaceDef(s, tier), first = !(s.milestones && s.milestones.firstMove);
    s.spaceTier = tier; s.space = def.id;
    s.spaceUpgrades = s.spaceUpgrades.filter(function (id) { var u = find(K().upgrades, id); return u && u.moves; });
    if (s.milestones && first && tier > 0) s.milestones.firstMove = s.totalWeek;
    if (first && tier > 0) chat(s, lineList(s, 'move'));
    GG.emit('shop:move', { from: from, to: def.id, tier: tier });
    changed(s);
    return { ok: true, cost: 0, rent: def.rent || 0, deltas: {} };
  };
  S.spaces = function (s) {
    var avail = S.availableTier(s);
    return K().spaces.map(function (x) {
      var def = S.spaceDef(s, x.tier), c = S.canMove(s, x.tier);
      return { tier: x.tier, id: def.id, name: def.name, blurb: def.blurb, rent: def.rent || 0, era: def.era, perk: U.clone(def.perk || {}),
        current: x.tier === (s.spaceTier || 0), available: x.tier <= avail, can: c.ok, why: c.ok || x.tier === s.spaceTier ? '' : c.why };
    });
  };
  S.upgradeDef = function (id) { return find(K().upgrades, id); };
  S.canBuyUpgrade = function (s, id) {
    var u = S.upgradeDef(id);
    if (!u) return fail('Not in the shop.');
    if (has(s.spaceUpgrades, id)) return fail('Already here.');
    if (u.tier !== (s.spaceTier || 0)) return fail('Not for this space.');
    if (s.fund < u.cost) return fail('Not enough in the fund (' + money(u.cost) + ').');
    return { ok: true, cost: u.cost };
  };
  S.buyUpgrade = function (s, id) {
    var q = S.canBuyUpgrade(s, id);
    if (!q.ok) return q;
    var u = S.upgradeDef(id), d = spend(s, u.cost);
    s.spaceUpgrades.push(id);
    GG.emit('shop:buy', { kind: 'upgrade', id: id, cost: u.cost });
    changed(s);
    return { ok: true, cost: u.cost, deltas: d };
  };
  // v0.9: an upgrade's name + blurb for this band's space: upgrades[id].bySpace[<space id>] = { name, blurb } (the tier-0
  // space is the band's own: the garage's beer fridge is the laundromat's pop machine).
  S.upgradeView = function (s, id) {
    var u = S.upgradeDef(id);
    if (!u) return null;
    var b = GG.career && GG.career.band && s ? GG.career.band(s) : null, by = u.bySpace || null;
    var x = by && ((s && s.space && by[s.space]) || (b && b.space && by[b.space])) || null;
    return x ? Object.assign({}, u, { name: x.name || u.name, blurb: x.blurb || u.blurb }) : u;
  };
  // The upgrades for this space (+ the ones that moved in with you).
  S.upgrades = function (s) {
    return K().upgrades.filter(function (u) { return u.tier === (s.spaceTier || 0) || has(s.spaceUpgrades, u.id); }).map(function (u0) {
      var u = S.upgradeView(s, u0.id) || u0, c = S.canBuyUpgrade(s, u.id), own = has(s.spaceUpgrades, u.id);
      return { id: u.id, name: u.name, blurb: u.blurb, cost: u.cost, perk: U.clone(u.perk || {}), moves: !!u.moves, owned: own, can: c.ok, why: c.ok || own ? '' : c.why };
    });
  };
  // Sum of the space's perk and every upgrade in it: { rehearse, rest, write, record, chemistry, mood, recover }.
  S.perks = function (s) {
    var out = { rehearse: 0, rest: 0, write: 0, record: 0, chemistry: 0, mood: 0, recover: 0 };
    function add(p) { for (var k in p || {}) if (out[k] != null && isFinite(p[k])) out[k] += p[k]; }
    if (!s) return out;
    add(S.spaceDef(s, s.spaceTier || 0).perk);
    (s.spaceUpgrades || []).forEach(function (id) { var u = S.upgradeDef(id); if (u) add(u.perk); });
    return out;
  };
  // Multiplier on an activity's gains at home (career.runActivity): rehearse / rest.
  S.perkFactor = function (s, activity) {
    var p = S.perks(s);
    return activity === 'rehearse' ? 1 + p.rehearse : activity === 'rest' ? 1 + p.rest : 1;
  };

  /* ---- The van: tiers, names, upgrades, stickers ----------------------------------------------------------------- */
  S.vanTierDef = function (tier) { var t = K().vanTiers; for (var i = 0; i < t.length; i++) if (t[i].tier === tier) return t[i]; return t[0] || EMPTY.vanTiers[0]; };
  S.vanName = function (bandId, tier) {
    var V = K().vanNames || {}, n = V[bandId || 'hail_damage'] || [];
    return n[tier] || (tier === 0 ? 'The Van' : S.vanTierDef(tier).kind);   // v0.9: no borrowed Moose Hearse
  };
  S.vanUpgradeDef = function (id) { return find(K().vanUpgrades, id); };
  // The van's space and comfort follow its tier + upgrades (world.travel / the burnout math read van.comfort).
  function syncVan(s) {
    var v = s.van, t = S.vanTierDef(v.tier || 0), space = t.space, comfort = t.comfort;
    (v.upgrades || []).forEach(function (id) { var u = S.vanUpgradeDef(id); if (u) { space += u.space || 0; comfort += u.comfort || 0; } });
    v.space = space; v.comfort = Math.min(5, comfort);
  }
  // { wear, breakdown, chemistry } multipliers / bonus for world.travel.
  S.vanMods = function (s) {
    var v = s.van || {}, t = S.vanTierDef(v.tier || 0), out = { wear: t.wear || 1, breakdown: t.breakdown || 1, chemistry: 0 };
    (v.upgrades || []).forEach(function (id) {
      var u = S.vanUpgradeDef(id); if (!u) return;
      if (u.wear) out.wear *= u.wear;
      if (u.breakdown) out.breakdown *= u.breakdown;
      if (u.chemistry) out.chemistry += u.chemistry;
    });
    return out;
  };
  S.vanQuote = function (s, tier) {
    var def = S.vanTierDef(tier), cur = S.vanTierDef(s.van.tier || 0), R = Q();
    var trade = Math.max(R.tradeInMin, Math.round((cur.price || 0) * R.tradeIn * (s.van.condition || 0) / 100));
    return { price: def.price, tradeIn: trade, net: Math.max(0, def.price - trade) };
  };
  S.canBuyVan = function (s, tier) {
    var def = K().vanTiers.filter(function (x) { return x.tier === tier; })[0];
    if (!def) return fail('No such vehicle.');
    if (tier <= (s.van.tier || 0)) return fail(tier === s.van.tier ? 'That is your van.' : 'You already drive something bigger.');
    if (!eraOk(s, def.era)) return fail('Unlocks in ' + eraName(def.era) + '.');
    var q = S.vanQuote(s, tier);
    if (s.fund < q.net) return fail('Not enough in the fund (' + money(q.net) + ' after the trade-in).');
    return { ok: true, cost: q.net, quote: q };
  };
  S.buyVan = function (s, tier) {
    var c = S.canBuyVan(s, tier);
    if (!c.ok) return c;
    var def = S.vanTierDef(tier), v = s.van, d = spend(s, c.cost);
    v.tier = tier; v.id = tier === 0 ? v.id : def.id;
    v.baseName = S.vanName(s.bandId, tier); v.name = v.baseName;
    v.condition = def.condition; v.upgrades = [];
    syncVan(s);
    chat(s, lineList(s, 'van'));
    GG.emit('shop:buy', { kind: 'van', id: def.id, tier: tier, cost: c.cost, tradeIn: c.quote.tradeIn });
    changed(s);
    return { ok: true, cost: c.cost, tradeIn: c.quote.tradeIn, deltas: d };
  };
  S.vans = function (s) {
    return K().vanTiers.map(function (t) {
      var c = S.canBuyVan(s, t.tier), q = S.vanQuote(s, t.tier);
      return { tier: t.tier, id: t.id, kind: t.kind, name: S.vanName(s.bandId, t.tier), blurb: t.blurb, price: t.price, era: t.era,
        space: t.space, comfort: t.comfort, current: t.tier === s.van.tier, quote: q, can: c.ok, why: c.ok || t.tier === s.van.tier ? '' : c.why };
    });
  };
  // Any name, trimmed to 28 characters (no markup, no control characters). Empty = back to the preset name.
  S.renameVan = function (s, name) {
    var clean = String(name == null ? '' : name).replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 28).trim();
    s.van.name = clean || s.van.baseName;
    GG.emit('shop:rename', { name: s.van.name });
    changed(s);
    return { ok: true, name: s.van.name };
  };
  S.canBuyVanUpgrade = function (s, id) {
    var u = S.vanUpgradeDef(id);
    if (!u) return fail('Not in the shop.');
    if (has(s.van.upgrades, id)) return fail('Already fitted.');
    if (!has(u.tiers, s.van.tier || 0)) return fail('Doesn\'t fit this vehicle.');
    if (s.fund < u.cost) return fail('Not enough in the fund (' + money(u.cost) + ').');
    return { ok: true, cost: u.cost };
  };
  S.buyVanUpgrade = function (s, id) {
    var q = S.canBuyVanUpgrade(s, id);
    if (!q.ok) return q;
    var u = S.vanUpgradeDef(id), d = spend(s, u.cost);
    s.van.upgrades.push(id);
    syncVan(s);
    GG.emit('shop:buy', { kind: 'vanUpgrade', id: id, cost: u.cost });
    changed(s);
    return { ok: true, cost: u.cost, deltas: d };
  };
  S.vanUpgrades = function (s) {
    return K().vanUpgrades.filter(function (u) { return has(u.tiers, s.van.tier || 0) || has(s.van.upgrades, u.id); }).map(function (u) {
      var c = S.canBuyVanUpgrade(s, u.id), own = has(s.van.upgrades, u.id);
      return { id: u.id, name: u.name, blurb: u.blurb, cost: u.cost, owned: own, can: c.ok, why: c.ok || own ? '' : c.why,
        space: u.space || 0, comfort: u.comfort || 0 };
    });
  };
  // Stickers: one per venue ever played, oldest first; banned venues are crossed out (synced from state.banned).
  S.stickers = function (s) {
    var list = (s.van && s.van.stickers) || [];
    list.forEach(function (x) { x.banned = has(s.banned, x.venueId); });
    return list;
  };
  S.sticker = function (s, g) {
    var id = g && g.venueId;
    if (!id || !s.van) return null;
    if (!Array.isArray(s.van.stickers)) s.van.stickers = [];
    var list = s.van.stickers;
    for (var i = 0; i < list.length; i++) if (list[i].venueId === id) return null;
    var x = { venueId: id, name: g.name || id, week: s.totalWeek, banned: has(s.banned, id) };
    list.push(x);
    if (list.length > Q().stickersMax) list.splice(0, list.length - Q().stickersMax);
    GG.emit('shop:sticker', { venueId: id, name: x.name, banned: x.banned });
    return x;
  };
  S.banSticker = function (s, id) {
    var hit = null;
    ((s.van && s.van.stickers) || []).forEach(function (x) { if (x.venueId === id) { x.banned = true; hit = x; } });
    if (hit) GG.emit('shop:sticker', { venueId: id, name: hit.name, banned: true });
    return hit;
  };

  /* ---- Merch --------------------------------------------------------------------------------------------------- */
  S.merchDef = function (id) { return find(K().merch, id); };
  function forBand(s, def) {
    return (!def.genre || has(def.genre, s.genre)) && (!def.band || has(def.band, s.bandId));
  }
  function hasRelease(s) { return (s.albums || []).some(function (a) { return a && (a.status === 'released' || a.released); }); }
  S.tierUnlocked = function (s, tierId) {
    var t = find(K().merchTiers, tierId);
    if (!t) return false;
    return eraOk(s, t.era) && (!t.release || hasRelease(s)) && (!t.minFans || s.fans >= t.minFans);
  };
  // Adds every newly unlocked item for this band (quiet: no event/chat, e.g. new careers and loads). -> [new ids]
  S.unlockMerch = function (s, quiet) {
    var m = s.merch, out = [];
    if (!m) return out;
    K().merch.forEach(function (def) {
      if (def.hidden || has(m.unlocked, def.id) || !forBand(s, def) || !S.tierUnlocked(s, def.tier)) return;
      m.unlocked.push(def.id); out.push(def.id);
    });
    if (out.length && !quiet) {
      GG.emit('shop:unlock', { kind: 'merch', ids: out });
      if (s.totalWeek > 1) chat(s, lineList(s, 'merchUnlock'));
    }
    return out;
  };
  function suggested(def) { return def.price; }
  S.priceOf = function (s, id) { var def = S.merchDef(id), p = s.merch && s.merch.price && s.merch.price[id]; return isFinite(p) && p > 0 ? p : def ? suggested(def) : 0; };
  S.priceRange = function (s, id) {
    var def = S.merchDef(id), R = Q().merch.priceRange;
    if (!def) return [1, 1];
    return [Math.max(1, Math.round(def.price * R[0])), Math.max(2, Math.round(def.price * R[1]))];
  };
  S.setPrice = function (s, id, price) {
    var def = S.merchDef(id);
    if (!def) return fail('Not an item.');
    var r = S.priceRange(s, id), p = U.clamp(Math.round(Number(price) || def.price), r[0], r[1]);
    s.merch.price[id] = p;
    changed(s);
    return { ok: true, price: p };
  };
  function unlockedItem(s, id) { return has(s.merch.unlocked, id); }
  S.setTable = function (s, ids) {
    s.merch.table = (ids || []).filter(function (id, i, a) { return unlockedItem(s, id) && a.indexOf(id) === i; });
    changed(s);
    return s.merch.table.slice();
  };
  S.toggleTable = function (s, id, on) {
    var t = s.merch.table, i = t.indexOf(id);
    if (on == null) on = i < 0;
    if (on && i < 0 && unlockedItem(s, id)) t.push(id);
    if (!on && i >= 0) t.splice(i, 1);
    changed(s);
    return t.indexOf(id) >= 0;
  };
  S.stockCost = function (s, id, boxes) { var def = S.merchDef(id); return def ? Math.round((boxes || 0) * def.perBox * def.cost) : 0; };
  S.canBuyStock = function (s, id, boxes) {
    var def = S.merchDef(id);
    boxes = Math.floor(boxes || 0);
    if (!def || def.hidden) return fail('Not an item.');
    if (!unlockedItem(s, id)) return fail('Not unlocked yet.');
    if (boxes < 1) return fail('Pick at least one box.');
    var cost = S.stockCost(s, id, boxes);
    if (s.fund < cost) return fail('Not enough in the fund (' + money(cost) + ').');
    return { ok: true, cost: cost, units: boxes * def.perBox };
  };
  // The first shirt order of a band whose misprint card exists (v0.9: money_merch_misprint_<bandId>, else the base card when
  // it fits the band) comes back misprinted: HALE DAMAGE, FROST HEAVY, GRAVY KINGS, THE GRID ROAD RUMBLERS (owner Q6).
  function misprintDue(s) {
    var m = s.merch, c = variantCard(s, 'money_merch_misprint');
    return !!c && !m.misprint && !m.shirtsOrdered && seen(s, c.id) == null;
  }
  var MISPRINT = { hail_damage: 'HALE DAMAGE', frost_heave: 'FROST HEAVY', gravel_kings: 'GRAVY KINGS', grid_road_ramblers: 'THE GRID ROAD RUMBLERS' };
  // v0.9: the band's misprint: shop merch 'misprint'.byBand[bandId] (or shop.misprint.byBand) = { typo, find, replace, stash }.
  S.misprintInfo = function (s) {
    var def = S.merchDef('misprint') || {}, M = K().merch, alt = (M && M.misprint) || K().misprint || {};
    var by = (def.byBand && def.byBand[s && s.bandId]) || (alt.byBand && alt.byBand[s && s.bandId]) || null;
    var b = GG.career && GG.career.band ? GG.career.band(s) : null, typo = (by && by.typo) || MISPRINT[s && s.bandId] || ((b && b.name) || 'THE BAND').toUpperCase();
    return { typo: typo, find: (by && by.find) || ((b && b.name) || '').toUpperCase(), replace: (by && by.replace) || typo, stash: (by && by.stash) || null,
      name: typo + ' shirts (misprint)' };
  };
  // Buys `boxes` boxes of an item (paid up front). The item goes on the table if it wasn't. The very first shirt
  // order comes back misprinted (HALE DAMAGE): the batch waits for next Monday's card.
  S.buyStock = function (s, id, boxes) {
    var q = S.canBuyStock(s, id, boxes);
    if (!q.ok) return q;
    var m = s.merch, d = spend(s, q.cost), misprint = null;
    m.spent += q.cost;
    if (id === 'shirt' && misprintDue(s)) {
      var n = Math.min(q.units, Q().merch.misprint.units);
      m.misprint = misprint = { merchId: 'shirt', week: s.totalWeek, status: 'pending', units: n };
      m.stock.shirt = (m.stock.shirt || 0) + q.units - n;
    } else m.stock[id] = (m.stock[id] || 0) + q.units;
    if (id === 'shirt') m.shirtsOrdered = true;
    if (m.table.indexOf(id) < 0) m.table.push(id);
    GG.emit('shop:buy', { kind: 'stock', id: id, boxes: Math.floor(boxes), units: q.units, cost: q.cost });
    changed(s);
    return { ok: true, cost: q.cost, units: q.units, misprint: !!misprint, deltas: d };
  };
  // Boxes at home (the garage pile): per item, ceil(units / perBox), plus the boxed misprint batch.
  S.pile = function (s) {
    var m = s.merch || defaultMerch(s), items = [], boxes = 0, units = 0;
    Object.keys(m.stock).forEach(function (id) {
      var def = S.merchDef(id), n = m.stock[id] || 0;
      if (!def || n <= 0) return;
      var b = Math.ceil(n / def.perBox);
      items.push({ id: id, units: n, boxes: b }); boxes += b; units += n;
    });
    if (m.misprint && (m.misprint.status === 'boxed' || m.misprint.status === 'pending') && m.misprint.units > 0) {
      items.push({ id: 'misprint', units: m.misprint.units, boxes: 1, misprint: true }); boxes += 1; units += m.misprint.units;
    }
    return { boxes: boxes, units: units, items: items };
  };
  // What goes to a gig: van space in boxes (abroad: a few boxes as luggage), filled round-robin down the table order.
  // -> { space, boxes, items: { id: units } }
  S.hauling = function (s, g) {
    var m = s.merch, space = g && g.tour ? Q().merch.flyBoxes : (s.van ? s.van.space : 3), left = {}, out = {}, boxes = 0;
    (m.table || []).forEach(function (id) { var def = S.merchDef(id), n = m.stock[id] || 0; if (def && n > 0) left[id] = n; });
    var ids = Object.keys(left).sort(function (a, b) { return m.table.indexOf(a) - m.table.indexOf(b); }), more = true;
    while (boxes < space && more) {
      more = false;
      for (var i = 0; i < ids.length && boxes < space; i++) {
        var id = ids[i], def = S.merchDef(id);
        if (left[id] <= 0) continue;
        var take = Math.min(left[id], def.perBox);
        out[id] = (out[id] || 0) + take; left[id] -= take; boxes++; more = true;
      }
    }
    return { space: space, boxes: boxes, items: out };
  };
  // Demand multiplier for price / suggested price (1 at the suggested price; cheaper sells more, capped).
  S.priceCurve = function (ratio) { var M = Q().merch; return Math.min(M.curveMax, Math.exp(-M.elasticity * ((ratio > 0 ? ratio : 1) - 1))); };
  function seasonMul(s, def) {
    if (!def.season) return 1;
    var se = GG.calendar ? (GG.calendar.seasonAt ? GG.calendar.seasonAt(s) : GG.calendar.season(s.week)) : 'summer';
    return def.season[se] != null ? def.season[se] : 1;
  }
  // The sales model (expected units per item on a table of `ids`). Buyers = crowdEff x buyRate x grade x (fit) x superfans
  // x variety (a fuller table sells a bit more); they split across the table by appeal x season x price curve.
  // crowdEff = the crowd up to crowdRef, then ref x (crowd / ref)^crowdExp (a packed theatre doesn't buy per head like a
  // basement). o: { crowd, grade (default 'B'), fit (0..1, default 0.8), fanMult (default from GG.fans), prices: { id: $ } }.
  // Pure. -> { id: units }
  S.sales = function (s, ids, o) {
    o = o || {};
    var M = Q().merch, out = {}, list = (ids || []).filter(function (id, i, a) { return S.merchDef(id) && a.indexOf(id) === i; });
    if (!list.length) return out;
    var crowd = Math.max(0, o.crowd || 0), eff = crowd <= M.crowdRef ? crowd : M.crowdRef * Math.pow(crowd / M.crowdRef, M.crowdExp);
    var fit = o.fit != null ? o.fit : 0.8, fan = o.fanMult != null ? o.fanMult : fanMult(s);
    var base = eff * M.buyRate * (M.grade[o.grade || 'B'] || 1) * (M.fit[0] + M.fit[1] * fit) * fan;
    var n = list.length, variety = 1 + M.variety * (Math.min(n, M.varietyMax) - 1);
    list.forEach(function (id) {
      var def = S.merchDef(id), price = o.prices && o.prices[id] != null ? o.prices[id] : S.priceOf(s, id);
      out[id] = Math.max(0, base * variety / n * def.appeal * seasonMul(s, def) * S.priceCurve(price / def.price));
    });
    return out;
  };
  // Expected units of one item: alone, or as part of o.items (the table). o as S.sales + price (this item's price).
  S.demand = function (s, id, o) {
    o = o || {};
    var ids = o.items && o.items.indexOf(id) >= 0 ? o.items : [id], pr = {};
    if (o.price != null) pr[id] = o.price;
    return S.sales(s, ids, Object.assign({}, o, { prices: pr }))[id] || 0;
  };
  function fanMult(s) {
    var M = Q().merch, sh = GG.fans && GG.fans.merchMods ? GG.fans.merchMods(s).share : M.superfanRef;
    return Math.max(0.5, 1 + M.superfan * (sh - M.superfanRef));
  }
  function crowdGuess(s, g) {
    if (g && GG.gig && GG.gig.expectCrowd && g.venueId) { try { return GG.gig.expectCrowd(s, g); } catch (e) { /* fall through */ } }
    var G = GG.content.economy.gig;
    return Math.max(15, Math.round(15 + s.fans * G.fanDraw + s.buzz * G.buzzDraw));
  }
  // A preview for the merch screen: expected sales at the next gig (the booked one, else a typical night) at a B grade.
  S.estimate = function (s, g) {
    g = g || s.gig || null;
    var crowd = crowdGuess(s, g), haul = S.hauling(s, g), out = { crowd: crowd, sold: 0, earned: 0, items: {}, haul: haul };
    var want = S.sales(s, Object.keys(haul.items), { crowd: crowd, fit: g && g.fit != null ? g.fit : 0.8 });
    Object.keys(haul.items).forEach(function (id) {
      var n = Math.min(haul.items[id], Math.round(want[id] || 0)), p = S.priceOf(s, id);
      out.items[id] = { units: n, earned: n * p }; out.sold += n; out.earned += n * p;
    });
    return out;
  };
  // The merch table at a gig (GG.gig.applyResult, before the fund changes): hauls what fits in the van, sells (S.sales x a
  // little noise, own seeded RNG; named superfans buy one each), unsold goes home. Adds r.merch =
  // { sold, earned, boxes, space, items: { id: { hauled, sold, price, earned } }, named: [superfan ids who bought one] }
  // and state.merch.last. The earnings join the gig's fund change (applyResult). Idempotent per result.
  S.gigMerch = function (s, g, r) {
    if (!r || r.merch || !s.merch) return r && r.merch;
    S.ensure(s);
    var M = Q().merch, m = s.merch, haul = S.hauling(s, g), rng = GG.RNG(GG.hashSeed([s.seed >>> 0, 'merch', s.totalWeek, r.venueId || '', r.grade || ''].join('|')));
    var slice = g && g.opening ? Math.min(r.crowd || 0, Math.round(g.opening.draw * ((GG.world && GG.world.cfg().opening.slice) || 0.45))) : 0;
    var crowd = Math.max(0, (r.crowd || 0) - slice) + slice * M.opening, fit = g && g.fit != null ? g.fit : (r.fit != null ? r.fit : 0.8);
    var out = { sold: 0, earned: 0, boxes: haul.boxes, space: haul.space, items: {}, named: [] };
    var want = S.sales(s, Object.keys(haul.items), { crowd: crowd, grade: r.grade, fit: fit, fanMult: fanMult(s) });
    var named = GG.fans && GG.fans.merchMods ? GG.fans.merchMods(s, r).named : [];
    Object.keys(haul.items).forEach(function (id) {
      var price = S.priceOf(s, id), n = Math.min(haul.items[id], Math.floor((want[id] || 0) * rng.range(M.noise[0], M.noise[1]) + rng.next()));
      out.items[id] = { hauled: haul.items[id], sold: n, price: price, earned: n * price };
    });
    // Named superfans each buy one of the best thing on the table (Dale: every home show).
    named.forEach(function (who) {
      var best = null;
      Object.keys(out.items).forEach(function (id) { var it = out.items[id]; if (it.sold < it.hauled && (!best || it.price > out.items[best].price)) best = id; });
      if (best) { out.items[best].sold++; out.items[best].earned += out.items[best].price; out.named.push(who); }
    });
    Object.keys(out.items).forEach(function (id) {
      var it = out.items[id];
      m.stock[id] = Math.max(0, (m.stock[id] || 0) - it.sold);
      m.sold[id] = (m.sold[id] || 0) + it.sold;
      out.sold += it.sold; out.earned += it.earned;
    });
    out.earned = Math.round(out.earned);
    m.earned += out.earned;
    m.last = { week: s.totalWeek, venueId: r.venueId || null, name: r.name || '', crowd: r.crowd || 0, grade: r.grade || null,
      sold: out.sold, earned: out.earned, boxes: out.boxes, space: out.space, items: U.clone(out.items) };
    if (m.misprint && m.misprint.status === 'collector') m.misprint.units = m.stock.misprint || 0;
    r.merch = out;
    if (out.sold > 0) {
      r.lines = r.lines || [];
      var hs = out.named.indexOf('dale') >= 0 && GG.fans && GG.fans.homeSuperfan ? GG.fans.homeSuperfan(s) : null;   // v0.9: the band's home superfan
      r.lines.push('Merch table: ' + out.sold + ' sold, ' + money(out.earned) + (out.named.indexOf('dale') >= 0 ? ' (' + ((hs && (hs.short || hs.name)) || 'Your first superfan') + ' bought one, as always).' : '.'));
    }
    GG.emit('shop:merch', { venueId: r.venueId || null, sold: out.sold, earned: out.earned });
    return out;
  };
  S.misprint = function (s) { return s.merch ? s.merch.misprint : null; };
  S.merchItems = function (s) {
    var m = s.merch;
    return K().merch.filter(function (def) { return forBand(s, def) && (!def.hidden || has(m.unlocked, def.id)); }).map(function (def) {
      var n = m.stock[def.id] || 0, un = has(m.unlocked, def.id), t = find(K().merchTiers, def.tier) || {};
      return { id: def.id, name: def.id === 'misprint' ? S.misprintInfo(s).name : def.name, blurb: def.blurb, tier: def.tier, cost: def.cost, suggested: def.price, price: S.priceOf(s, def.id),
        range: S.priceRange(s, def.id), perBox: def.perBox, boxCost: S.stockCost(s, def.id, 1), appeal: def.appeal, stock: n,
        boxes: Math.ceil(n / def.perBox), onTable: has(m.table, def.id), sold: m.sold[def.id] || 0, unlocked: un,
        why: un ? '' : 'Unlocks in ' + eraName(t.era) + (t.release ? ', with a record out' : '') + (t.minFans ? ', at ' + U.fmtNum(t.minFans) + ' fans' : '') + '.' };
    });
  };
  // Everything the merch screen needs in one call.
  S.merchView = function (s) {
    var m = s.merch;
    return { items: S.merchItems(s), table: m.table.slice(), space: s.van ? s.van.space : 3, haul: S.hauling(s, s.gig), pile: S.pile(s),
      estimate: S.estimate(s), earned: m.earned, spent: m.spent, last: m.last ? U.clone(m.last) : null, misprint: m.misprint ? U.clone(m.misprint) : null };
  };

  /* ---- Monday cards (forced; content/cards.js GG.content.shopCards) ------------------------------------------------ */
  S.cards = function () { return GG.content.shopCards || []; };
  S.card = function (id) { return find(S.cards(), id); };
  function seen(s, id) { return s.seenCards && s.seenCards[id] != null ? s.seenCards[id] : null; }
  function lastShopCard(s) {
    var w = -1e9;
    S.cards().forEach(function (c) { var x = seen(s, c.id); if (x != null && x > w) w = x; });
    return w;
  }
  function gateOk(s, c) { return !!c && (!GG.career || GG.career.gatePasses(s, c.gate)); }
  // v0.9: the speaker must belong to this band (career.speakerOk); the solo card's speaker must be in the band right now
  // (Hail Damage's is Dana's).
  function speakerHere(s, c) {
    if (!c) return false;
    var sp = c.speaker;
    if (/^shop_solo(_|$)/.test(c.id) && (s.members || []).some(function (m) { return m.id === sp; })) return isActive(s, sp);
    return !GG.career || !GG.career.cardOk || GG.career.cardOk(s, c);
  }
  // '<id>_<bandId>' first (content packs), else the base card; the gate passes and the speaker is here.
  function variantCard(s, id) {
    var v = S.card(id + '_' + s.bandId);
    if (v && gateOk(s, v) && speakerHere(s, v)) return v;
    var c = S.card(id);
    return c && gateOk(s, c) && speakerHere(s, c) ? c : null;
  }
  S.variantCard = variantCard;
  function due(s, id, again) {   // unseen (or seen `again`+ weeks ago) and its gate passes
    var c = variantCard(s, id), w = c ? seen(s, c.id) : null;
    return c && (w == null || (again && s.totalWeek - w >= again)) ? c : null;
  }
  function soloist(s) { return GG.gig && GG.gig.roles ? GG.gig.roles(s).solo : null; }   // v0.9: whoever takes the solos
  // This Monday's shop card, or null: the misprint (after the first shirt order), the space offer for the newest tier
  // your era opened, the soloist's solo, the first merch order, the pawn-shop kit, a used-van deal. At most one every cardGap weeks.
  S.forcedCard = function (s) {
    var R = Q(), w = s.totalWeek, c;
    if (w < R.cardFrom || w - lastShopCard(s) < R.cardGap || (GG.tour && GG.tour.away(s))) return null;
    var m = s.merch || {};
    if (m.misprint && m.misprint.status === 'pending' && (c = due(s, 'money_merch_misprint'))) return c;
    var avail = S.availableTier(s);
    if (avail > (s.spaceTier || 0) && (c = due(s, 'shop_space_' + avail))) return c;
    if (!S.ownsSection(s, 'solo') && eraOk(s, 'local') && s.stats && s.stats.songsWritten >= R.soloSongs && soloist(s)
      && (c = due(s, 'shop_solo', R.soloRetry))) return c;
    if (!m.spent && !m.shirtsOrdered && (c = due(s, 'shop_merch_start'))) return c;
    if ((s.gear.quality || 0) === 0 && (c = due(s, 'shop_pawn_kit'))) return c;
    if ((s.van.tier || 0) === 0 && (c = due(s, 'shop_van_deal'))) return c;
    return null;
  };
  // Shop effects of a resolved card (choice.effects.shop and the roll branch's): { move: tier, kit: tier, van: tier,
  // gear: id, section: id, stock: { id: boxes }, misprint: 'boxed'|'reprint'|'wear' }. Money is in the card's own `fund`.
  S.afterCard = function (s, card, i, success, d) {
    if (!card || !card.choices) return;
    var ch = card.choices[i]; if (!ch) return;
    var list = [ch.effects && ch.effects.shop];
    if (ch.roll) { var b = success ? ch.roll.success : ch.roll.fail; list.push(b && b.effects && b.effects.shop); }
    list.forEach(function (v) { if (v) S.apply(s, v, d); });
  };
  S.apply = function (s, v, d) {
    S.ensure(s);
    var out = {}, m = s.merch;
    if (v.move != null && v.move !== s.spaceTier && v.move <= S.availableTier(s)) {
      var from = s.space, def = S.spaceDef(s, v.move);
      s.spaceTier = v.move; s.space = def.id;
      s.spaceUpgrades = s.spaceUpgrades.filter(function (id) { var u = S.upgradeDef(id); return u && u.moves; });
      if (s.milestones && !s.milestones.firstMove) s.milestones.firstMove = s.totalWeek;
      GG.emit('shop:move', { from: from, to: def.id, tier: v.move });
      out.move = v.move;
    }
    if (v.kit != null && v.kit > s.gear.quality) { s.gear.quality = U.clamp(v.kit, 0, C.KIT_QUALITY.length - 1); out.kit = s.gear.quality; GG.emit('shop:buy', { kind: 'kit', id: C.KIT_QUALITY[s.gear.quality], tier: s.gear.quality, cost: 0, card: true }); }
    if (v.van != null && v.van > s.van.tier) {
      var t = S.vanTierDef(v.van);
      s.van.tier = v.van; s.van.id = t.id; s.van.baseName = S.vanName(s.bandId, v.van); s.van.name = s.van.baseName;
      s.van.condition = t.condition; s.van.upgrades = []; syncVan(s);
      GG.emit('shop:buy', { kind: 'van', id: t.id, tier: v.van, cost: 0, card: true });
      out.van = v.van;
    }
    if (v.gear && !S.ownsGear(s, v.gear) && S.gearDef(v.gear)) {
      var gd = S.gearDef(v.gear);
      s.gear.owned.push(v.gear);
      if (gd.lane) s.gear.lanes = Math.max(s.gear.lanes, gd.lane);
      if (gd.pedal) s.gear.doubleKick = true;
      out.gear = v.gear;
    }
    if (v.section && S.unlockSection(s, v.section, 'card')) {
      out.section = v.section;
      if (v.section === 'solo') chat(s, lineList(s, 'solo'), null);
    }
    if (v.stock) Object.keys(v.stock).forEach(function (id) {
      var def = S.merchDef(id);
      if (!def || !has(m.unlocked, id)) return;
      var units = v.stock[id] * def.perBox;
      if (id === 'shirt' && misprintDue(s)) {
        var n = Math.min(units, Q().merch.misprint.units);
        m.misprint = { merchId: 'shirt', week: s.totalWeek, status: 'pending', units: n };
        m.stock.shirt = (m.stock.shirt || 0) + units - n;
      } else m.stock[id] = (m.stock[id] || 0) + units;
      if (id === 'shirt') m.shirtsOrdered = true;
      if (m.table.indexOf(id) < 0) m.table.push(id);
      m.spent += S.stockCost(s, id, v.stock[id]);
      (out.stock = out.stock || {})[id] = v.stock[id];
    });
    if (v.misprint && m.misprint && m.misprint.status === 'pending') {
      var mp = m.misprint;
      if (v.misprint === 'boxed') mp.status = 'boxed';
      else if (v.misprint === 'reprint') { m.stock.shirt = (m.stock.shirt || 0) + mp.units; m.misprint = null; }
      else m.misprint = null;   // 'wear': the band wears them
      out.misprint = v.misprint;
      GG.emit('shop:misprint', { status: v.misprint === 'boxed' ? 'boxed' : v.misprint, units: mp.units });
    }
    if (d && Object.keys(out).length) d.shop = out;
    changed(s);
    return out;
  };
  // Short hint text for a shop effect (career.effectSummary).
  S.effectText = function (v) {
    if (!v) return '';
    var p = [];
    if (v.move != null) p.push('Move in');
    if (v.kit != null) p.push('Kit upgrade');
    if (v.van != null) p.push('New van');
    if (v.gear) p.push('New gear');
    if (v.section) p.push((K().sections[v.section] || {}).name ? K().sections[v.section].name + ' unlocked' : 'New section');
    if (v.stock) Object.keys(v.stock).forEach(function (id) { var def = S.merchDef(id); p.push('+' + v.stock[id] + ' box' + (v.stock[id] > 1 ? 'es' : '') + ' of ' + (def ? def.name.toLowerCase() : id)); });
    if (v.misprint === 'boxed') p.push('Box them up');
    return p.join(' · ');
  };
  // How much a bot likes a shop effect (career.effectValue).
  S.botValue = function (s, v) {
    if (!v) return 0;
    var val = 0, W = GG.content.economy.bot.value;
    if (v.move != null) {   // a move is only worth it when the rent is comfortably covered
      var rent = S.spaceDef(s, v.move).rent || 0, bills = GG.career && GG.career.upkeep ? GG.career.upkeep(s) : 0;
      val += s.fund > rent * 24 + bills * 4 ? 6 : -20;
    }
    if (v.kit != null) val += 8;
    if (v.van != null) val += 10;
    if (v.gear) val += 5;
    if (v.section) val += 6;
    if (v.stock) val += 3;
    if (v.misprint === 'boxed') val += 2;
    if (v.misprint === 'reprint') val += s.fund > (W.broke || 150) * 3 ? 2 : -1;
    return val;
  };

  /* ---- The week wrap -------------------------------------------------------------------------------------------- */
  // career.endWeek: Outro/Solo unlocks, merch tier unlocks, space perks (chemistry, moods, burnout, studio production),
  // the misprint turning collectable, stickers crossed out. -> wrap.shop = { rent, unlocks: [{ kind, id|ids }], misprint }
  S.weekly = function (s, rng, wrap) {
    S.ensure(s);
    var R = Q(), out = { rent: S.rent(s), unlocks: [], misprint: null, perks: null, evicted: null, rentLate: 0 }, d = {};
    if (!S.ownsSection(s, 'outro') && s.stats && s.stats.songsWritten >= R.outroSongs && S.unlockSection(s, 'outro', 'songs')) {
      out.unlocks.push({ kind: 'section', id: 'outro' });
      chat(s, lineList(s, 'outro'), null);
    }
    // No solo card for this band (or no soloist): the solo section still arrives a while into Local Heroes.
    var local = (s.eraHistory || []).filter(function (x) { return x.era === 'local'; })[0];
    if (!S.ownsSection(s, 'solo') && local && s.totalWeek - local.week >= R.soloAutoWeeks && !(soloist(s) && variantCard(s, 'shop_solo'))
      && S.unlockSection(s, 'solo', 'auto')) {
      out.unlocks.push({ kind: 'section', id: 'solo' });
      chat(s, lineList(s, 'solo'), null);
    }
    var ids = S.unlockMerch(s, false);
    if (ids.length) out.unlocks.push({ kind: 'merch', ids: ids });
    var away = !!(GG.tour && GG.tour.away(s)), p = S.perks(s);
    if (!away) {   // chemistry / mood perks land every other week (a fridge is nice, not a therapist)
      if (p.chemistry && s.totalWeek % 2 === 0) GG.career.applyEffects(s, { chemistry: p.chemistry }, d);
      if (p.mood && s.totalWeek % 2 === 1) GG.career.applyEffects(s, { mood: { all: p.mood } }, d);
      if (p.recover) GG.career.applyEffects(s, { burnout: -p.recover }, d);
    }
    var rec = (p.record || 0) + (R.recordBonus[s.gear.quality] || 0);
    if (rec && GG.labels && GG.labels.inSession && GG.labels.inSession(s) && GG.labels.applyProduction) GG.labels.applyProduction(s, rec, d);   // the studio perk + your kit on the takes
    out.perks = d;
    // Rent arrears: `rentLateWeeks` weeks in a row with less than two weeks' rent in the fund and the landlord changes the
    // locks: the band moves down a tier (the couch comes along). Keeps a bad move from snowballing into parents' loans.
    if ((s.spaceTier || 0) > 0) {
      var rent = S.rent(s);
      s.rentLate = s.fund < rent * 2 ? (s.rentLate || 0) + 1 : 0;
      if (s.rentLate >= R.rentLateWeeks) {
        var from = s.space, down = S.spaceDef(s, s.spaceTier - 1);
        s.spaceTier -= 1; s.space = down.id; s.rentLate = 0;
        s.spaceUpgrades = s.spaceUpgrades.filter(function (id) { var u = S.upgradeDef(id); return u && u.moves; });
        out.evicted = { from: from, to: down.id };
        chat(s, lineList(s, 'evicted'), null);
        GG.emit('shop:move', { from: from, to: down.id, tier: s.spaceTier, evicted: true });
      }
    } else s.rentLate = 0;
    var m = s.merch, mp = m.misprint, MP = R.merch.misprint;
    if (mp && mp.status === 'pending' && (!variantCard(s, 'money_merch_misprint') || s.totalWeek - mp.week > 6)) mp.status = 'boxed';   // no card came: into the box
    if (mp && mp.status === 'boxed' && s.totalWeek - mp.week >= MP.weeks && s.fans >= MP.minFans) {
      mp.status = 'collector';
      if (!has(m.unlocked, 'misprint')) m.unlocked.push('misprint');
      m.stock.misprint = (m.stock.misprint || 0) + mp.units;
      if (m.table.indexOf('misprint') < 0) m.table.unshift('misprint');
      out.misprint = 'collector';
      chat(s, lineList(s, 'misprintCollector'), null);
      GG.emit('shop:misprint', { status: 'collector', units: mp.units });
    }
    S.stickers(s);
    out.rentLate = s.rentLate || 0;
    if (wrap) wrap.shop = out;
    return out;
  };

  /* ---- Bots (tools/balance.js, tests) ----------------------------------------------------------------------------- */
  function cushion(s, base) { return Math.max(base, GG.career && GG.career.upkeep ? GG.career.upkeep(s) * 6 : base); }
  // Big buys (a van, a kit) keep 8 weeks of bills and wait while a studio session is running (it bills every week).
  function bigCushion(s, base) {
    return s.session ? Infinity : Math.max(cushion(s, base), GG.career && GG.career.upkeep ? GG.career.upkeep(s) * 8 : base);
  }
  // The merch the bot wants on the table: the best money-makers per box of van space.
  function botTable(s) {
    var m = s.merch, crowd = crowdGuess(s, null);
    var list = m.unlocked.filter(function (id) { return id !== 'misprint'; }).map(function (id) {
      var def = S.merchDef(id), n = S.demand(s, id, { crowd: crowd, price: def.price });
      return { id: id, v: Math.min(n, def.perBox) * (def.price - def.cost) };
    }).sort(function (a, b) { return b.v - a.v || (a.id < b.id ? -1 : 1); });
    var want = list.slice(0, Math.max(1, Math.min(list.length, s.van.space))).map(function (x) { return x.id; });
    if (has(m.unlocked, 'misprint') && (m.stock.misprint || 0) > 0) want.unshift('misprint');
    return want;
  }
  function botMerch(s, B) {
    var m = s.merch;
    m.table = botTable(s);
    var crowd = crowdGuess(s, null);
    m.table.forEach(function (id) {
      if (id === 'misprint') return;
      var def = S.merchDef(id), per = S.demand(s, id, { crowd: crowd, items: m.table });
      var wantUnits = Math.max(def.perBox, Math.min(per * B.merchGigs, def.perBox * s.van.space));
      var boxes = Math.ceil((wantUnits - (m.stock[id] || 0)) / def.perBox);
      if (boxes <= 0 || (m.stock[id] || 0) >= per * 1.2 && (m.stock[id] || 0) > 0) return;
      boxes = Math.min(boxes, Math.max(1, Math.floor((s.fund - cushion(s, B.merchCushion)) / Math.max(1, S.stockCost(s, id, 1)))));
      if (boxes >= 1 && s.fund - S.stockCost(s, id, boxes) >= cushion(s, B.merchCushion)) S.buyStock(s, id, boxes);
    });
  }
  // One bot shopping trip (career.botWeek, before the plan): gear, the kit, the van, a move, upgrades, merch.
  S.botWeek = function (s, style) {
    S.ensure(s);
    var B = Q().bot[style === 'good' ? 'good' : 'avg'], rng = seeded(s, 'bot');
    if ((s.spaceTier || 0) > 0 && s.fund < S.rent(s) * B.downsize) S.move(s, s.spaceTier - 1);   // broke: downsize (every week)
    if (style !== 'good' && !rng.chance(B.chance)) return;
    var order = s.genre === 'metal' ? ['pedal', 'toms', 'ride'] : ['toms', 'ride', 'pedal'];
    for (var i = 0; i < order.length; i++) {
      var g = S.gearDef(order[i]);
      if (g && S.canBuyGear(s, g.id).ok && s.fund - g.cost >= cushion(s, B.cushion)) { S.buyGear(s, g.id); break; }
    }
    var vt = (s.van.tier || 0) + 1, vq = S.vanTierDef(vt);   // a bigger van first (merch space, comfort, fewer breakdowns)...
    if (vt < C.VAN_TIERS.length && vq.tier === vt && S.canBuyVan(s, vt).ok && s.fund - S.vanQuote(s, vt).net >= bigCushion(s, B.vanCushion)) S.buyVan(s, vt);
    var next = S.kitDef((s.gear.quality || 0) + 1);   // ...then the kit
    if (next && S.canBuyKit(s, next.tier).ok && s.fund - next.cost >= bigCushion(s, B.kitCushion)) S.buyKit(s, next.tier);
    var avail = S.availableTier(s), sd = S.spaceDef(s, avail);
    if ((s.spaceTier || 0) > 0 && s.fund < S.rent(s) * B.downsize) S.move(s, s.spaceTier - 1);   // a sensible band downsizes before the landlord does
    else if (avail > (s.spaceTier || 0) && s.fund >= (sd.rent || 0) * B.rentWeeks + cushion(s, B.cushion)) S.move(s, avail);
    var ups = S.upgrades(s).filter(function (u) { return !u.owned && u.can; }).sort(function (a, b) { return a.cost - b.cost; });
    if (ups.length && s.fund - ups[0].cost >= cushion(s, B.upgradeCushion)) S.buyUpgrade(s, ups[0].id);
    botMerch(s, B);
  };

  // Saves: v8 -> v9 is 10_save's MIGRATIONS[8] (-> S.migrate); this wrapper also runs S.ensure after every other
  // module's migration (eras, labels, the van, tours) on every load, so the fill sees the final era and stays idempotent.
  if (GG.save && GG.save.migrate && !GG.save.migrate.shop) {
    var prevMigrate = GG.save.migrate;
    GG.save.migrate = function (s) { return S.migrate(prevMigrate(s)); };
    GG.save.migrate.shop = true;
    Object.keys(prevMigrate).forEach(function (k) { if (GG.save.migrate[k] === undefined) GG.save.migrate[k] = prevMigrate[k]; });   // keep the other modules' flags
  }

  GG.registerDebug('shop', function () {
    var s = GG.state; if (!s || !s.gear) return { state: null };
    return { gear: U.clone(s.gear), spaceTier: s.spaceTier, space: s.space, spaceUpgrades: (s.spaceUpgrades || []).slice(),
      van: s.van ? { tier: s.van.tier, name: s.van.name, space: s.van.space, comfort: s.van.comfort, stickers: (s.van.stickers || []).length, upgrades: (s.van.upgrades || []).slice() } : null,
      merch: s.merch ? { table: s.merch.table.slice(), stock: U.clone(s.merch.stock), earned: s.merch.earned, pile: S.pile(s).boxes, misprint: s.merch.misprint && s.merch.misprint.status } : null,
      rent: S.rent(s) };
  });
})(window.GG);
