// Rival sim tests (v0.6): content, the rival's deterministic career (never touches the career RNG), heat math, every
// showdown kind (BotB prize + fan swing, same-night crowd split, stolen slot, festival, Loonies, poach keep/defect),
// cracking, the year-10 Sad Dome final, defectors in the lineup, the leaderboard, the v5 -> v6 migration, bots.
// Run: node tests/sim_rival.test.js
const load = require('./_load');
const { test, ok, eq, done } = require('./_t');
const fs = require('fs'), path = require('path');
const AUTO = { autoGig: true };

function fresh(noCards) {
  const GG = load({ localStorage: load.fakeStorage() });
  if (noCards) GG.content.cards = [];
  return GG;
}
function career(GG, seed) { return GG.career.newCareer({ seed: seed || 606, player: { name: 'Pat' } }); }
const mem = (s, id) => s.members.find(m => m.id === id);
function week(GG, s, o) {
  o = o || {};
  const r = GG.career.startWeek(s);
  if (o.monday) o.monday(s);
  if (s.card && !s.card.resolved) GG.career.resolveCard(s, o.choice != null ? o.choice : 0);
  GG.career.setPlan(s, o.plan || ['rest', 'rest', 'rest']);
  GG.career.runWeek(s, AUTO);
  return GG.career.endWeek(s);
}
// A local-heroes band past the protection, at `fans`, week `w` (no normal Monday cards unless the deck is loaded).
function band(GG, fans, w, seed) {
  const s = career(GG, seed);
  week(GG, s); s.gig = null;
  s.fans = fans || 600; s.buzz = 30; s.fund = 3000; s.protected = false; s.era = 'local';
  if (w) { s.totalWeek = w; s.year = Math.floor((w - 1) / 24) + 1; s.week = (w - 1) % 24 + 1; }
  s.weekStart = null;
  return s;
}
function monday(GG, s) { GG.career.startWeek(s); if (s.card && !s.card.resolved) GG.career.resolveCard(s, 0); }

test('content: Tundra Wraith = Gord "Grimnir" Penner + three polite accountants in corpse paint; cards, scene, venues', () => {
  const GG = fresh(), K = GG.content, C = GG.contracts, R = K.rivalry;
  ok(R && R.cast && R.cast.tundra_wraith, 'content.rivalry.cast.tundra_wraith');
  const tw = R.cast.tundra_wraith, gord = tw.members.find(m => m.id === tw.frontman);
  eq(tw.members.length, 4, 'four accountants');
  ok(gord && gord.fullName === 'Gord Penner' && gord.nick === 'Grimnir' && gord.role === 'vocals', 'Gord "Grimnir" Penner fronts');
  ok(/minivan/i.test(gord.gags.join(' ')) && /Jets/.test(gord.gags.join(' ')) && /veggie tray/i.test(gord.bio + gord.gags.join(' ')) && /buddy/i.test(gord.bio), 'minivan, Jets sticker, veggie tray, buddy');
  ok(/eternal winter/i.test(gord.bio), 'screams about eternal winter');
  const ids = new Set(Object.values(K.bands).flatMap(b => b.members.map(m => m.id)).concat(Object.keys(K.npcs)));
  tw.members.forEach(m => {
    ok(m.corpsePaint === true && /^#[0-9a-f]{6}$/i.test(m.stageShirt), m.id + ': corpse paint + stage shirt');
    ok(/accountant|payroll|tax|audit/i.test(m.dayJob), m.id + ': an accountant by day');
    ok(!ids.has(m.id), m.id + ': id collides with a member/npc');
    ok(m.look && C.HAIR_STYLES.includes(m.look.hairStyle) && m.look.extras.every(e => C.LOOK_EXTRAS.includes(e)) && m.look.height >= 0.9 && m.look.height <= 1.1, m.id + ': LOOK');
  });
  ok(tw.songs.length >= 10 && tw.albums.length >= 10 && tw.rebrands.length >= 3, 'songs, records, rebrands');
  // cards: Monday-card schema, EFFECT_KEYS only, member acts incl. poach
  const need = ['rv_poach', 'rv_crack_breakup', 'rv_crack_rebrand', 'rv_crack_opener', 'rv_final_eve'];
  need.forEach(id => ok(R.cards.some(c => c.id === id), 'card ' + id));
  R.cards.forEach(c => {
    ok(C.CARD_TYPES.includes(c.type) && c.title && c.text && c.choices.length >= 2 && c.choices.length <= 3, c.id + ': shape');
    c.choices.forEach(ch => [ch.effects, ch.roll && ch.roll.success.effects, ch.roll && ch.roll.fail.effects].filter(Boolean).forEach(fx => {
      Object.keys(fx).forEach(k => ok(C.EFFECT_KEYS.includes(k), c.id + ': effect ' + k));
      if (fx.member) ok(['settle', 'quit', 'return', 'later', 'rival', 'poach'].includes(fx.member.act), c.id + ': member act');
    }));
  });
  ok(R.cards.find(c => c.id === 'rv_poach').choices.some(ch => ch.roll && ch.roll.fail.effects.member.act === 'poach'), 'a poach can defect');
  C.SHOWDOWNS.forEach(k => ok(R.showdowns[k] && R.showdowns[k].title && R.showdowns[k].win.length && R.showdowns[k].lose.length, 'showdown texts ' + k));
  ok(R.scene.length >= 10 && R.scene.every(f => f.name && f.city && f.peak > f.base), 'scene filler bands');
  const fests = R.venues.filter(v => v.festival), dome = R.venues.find(v => v.id === 'sad_dome');
  ok(fests.length >= 2 && fests.every(v => K.map.cities[GG.world.cityId(v.city)]), 'festivals on the map');
  ok(dome && dome.city === 'Calgary' && dome.capacity > 10000, 'the Sad Dome, Calgary');
  ok(K.economy.rival && K.economy.rival.kinds && K.economy.rival.heat, 'economy.rival tunables');
  ok(/Gord/.test(K.rivals.tundra_wraith.blurb), 'the rival blurb names Gord');
});

test('their career: deterministic per seed, never draws from the career RNG, paced ahead early and catchable', () => {
  const GG = fresh(true), a = career(GG, 77), b = career(GG, 77);
  b.rng = 12345;   // a different career RNG: the rival must not care
  const rngA = a.rng;
  for (let w = 1; w <= 120; w++) {
    [a, b].forEach(s => { s.totalWeek = w; s.year = Math.floor((w - 1) / 24) + 1; s.week = (w - 1) % 24 + 1; GG.rival.weekly(s, null, {}); });
    if (w === 24) { ok(a.rival.fans > 300 && a.rival.fans < 700, 'year 1: ' + a.rival.fans + ' fans'); eq(a.rival.era, 'local', 'local by year 1'); }
  }
  eq(JSON.stringify(a.rival), JSON.stringify(b.rival), 'same seed => same rival');
  eq(a.rng, rngA, 'career RNG untouched');
  const rv = a.rival;
  eq(rv.era, 'signed', 'signed by year 5'); ok(rv.label === 'monolith', 'Monolith');
  ok(rv.fans > 6000 && rv.fans < 16000, 'year 5 fans ' + rv.fans);
  ok(rv.albums.length === 5 && rv.albums.every(x => x.critic >= 30 && x.critic <= 97), 'one record a year: ' + rv.albums.length);
  ok(rv.albums.slice(2).every(x => x.peak >= 1 && x.peak <= 100), 'later records chart on the Maple 100');
  ok(rv.albums.every(x => (x.released - 1) % 24 + 1 < GG.contracts.LOONIES_WEEK - 4), 'released before Loonie nominations');
  ok(GG.rival.skill(a) > 75 && GG.rival.skill(a) < 88, 'set strength ' + GG.rival.skill(a));
  ok(rv.news.length > 0 && rv.news.every(n => n.text && !/\{/.test(n.text)), 'news lines with tokens filled');
  const c = career(GG, 78);
  ok(JSON.stringify(c.rival.members) === JSON.stringify(career(GG, 79).rival.members), 'the lineup is hand-made (not seeded)');
});

test('heat: clamps 0..100, emits heat:changed, decays slowly, drives the showdown chance and buzz for both', () => {
  const GG = fresh(true), s = band(GG, 600, 30), R = GG.rival, ev = [];
  GG.on('heat:changed', e => ev.push(e));
  s.rival.heat = 50;
  R.addHeat(s, 80, 'test'); eq(s.rival.heat, 100); R.addHeat(s, -500); eq(s.rival.heat, 0);
  ok(ev.length === 2 && ev[0].delta === 50 && ev[0].why === 'test', 'events carry the delta');
  s.rival.heat = 10; const lo = R.next(s).chance; s.rival.heat = 90; const hi = R.next(s).chance;
  ok(hi > lo * 2, 'more heat, more showdowns: ' + lo + ' -> ' + hi);
  const K = GG.content.economy.rival.heat;
  s.rival.heat = 80; s.buzz = 20; s.rival.w = 0;
  const wrap = {}; R.weekly(s, null, wrap);
  ok(Math.abs(wrap.rival.heat - (80 - Math.max(K.decayMin, 80 * K.decay))) < 0.11, 'decay: ' + wrap.rival.heat);
  ok(s.buzz > 20 && wrap.rival.heatBuzz > 0, 'hot rivalry feeds your buzz');
  R.weekly(s, null, {}); eq(s.rival.heat, wrap.rival.heat, 'once per week');
  const h = s.rival.heat; R.resolve(s, 'sameNight', 60, { them: 40 });
  ok(Math.abs(s.rival.heat - Math.min(100, h + GG.content.economy.rival.heat.clash.sameNight)) < 0.11, 'a clash adds heat');
});

test('Battle of the Bands: a Monday offer, their set first, prize + stolen fans to the winner, forfeits', () => {
  const GG = fresh(true), s = band(GG, 800, 40), R = GG.rival;
  monday(GG, s);
  const p = R.schedule(s, 'botb');
  ok(p && p.kind === 'botb' && s.offer && s.offer.showdown.kind === 'botb' && s.offer.prize > 0, 'offer with a prize');
  ok(/Battle of the Bands/.test(s.offer.name) && /Tundra Wraith/.test(s.offer.quirk), 'offer reads as a battle: ' + s.offer.quirk);
  const set = R.showdown(s);
  ok(set.kind === 'botb' && set.setlist.length === 3 && set.score === R.setScore(s, 'botb'), 'setup: their setlist + set score');
  eq(Math.round(set.setlist.reduce((t, x) => t + x.score, 0) / 3), set.score, 'song scores average to the set score');
  ok(set.rival.members.length === 4 && set.rival.members.every(m => m.corpsePaint), 'their lineup in corpse paint');
  ok(R.enter(s) && s.gig && s.gig.showdown && !s.offer && R.pending(s).status === 'entered', 'enter = book it');
  const fans0 = s.fans, rf0 = s.rival.fans, fund0 = s.fund;
  GG.career.setPlan(s, ['rest', 'rest', 'rest']); GG.career.runWeek(s, AUTO);
  const r = s.lastGig, sd = r.showdown;
  ok(sd && sd.kind === 'botb' && s.showdowns.includes(sd) && sd.them === set.score && sd.you === r.score, 'resolved with your score vs theirs');
  eq(sd.won, r.score > set.score);
  if (sd.won) ok(r.prize === sd.prize && sd.fansSwing > 0 && s.rival.fans === rf0 - sd.fansSwing, 'winner takes the prize + fans');
  else ok(sd.fansSwing < 0 && s.rival.fans === rf0 - sd.fansSwing, 'loser loses fans to them');
  ok(r.lines.some(l => /Gord|Tundra Wraith|crowd/.test(l)), 'a verdict line in the gig result');
  GG.career.endWeek(s);
  // direct resolve: forced win and loss (the player side applied to the state)
  const w = band(GG, 1000, 40, 5); monday(GG, w); R.schedule(w, 'botb');
  const f0 = w.fund, n0 = w.fans, win = R.resolve(w, 'botb', 100);
  ok(win.won && win.prize > 0 && w.fund === f0 + win.prize && w.fans === n0 + win.fansSwing && win.fansSwing > 0, 'win: prize + fans');
  eq(JSON.stringify(R.resolve(w, 'botb', 0)), JSON.stringify(win), 'idempotent per week + kind');
  const l = band(GG, 1000, 40, 6); monday(GG, l); R.schedule(l, 'botb');
  const lf = l.fans, loss = R.resolve(l, 'botb', 1);
  ok(!loss.won && loss.fansSwing < 0 && l.fans === lf + loss.fansSwing && l.rival.losses === 0 && l.rival.wins === 1, 'loss: fans stolen, their win');
  // pass: a forfeit at the wrap (news, not a showdown)
  const q = band(GG, 800, 40, 7); monday(GG, q); R.schedule(q, 'botb');
  ok(R.pass(q) && !q.offer, 'pass declines the offer');
  const n = q.showdowns.length; week(GG, q);
  ok(q.showdowns.length === n && q.rival.news.some(x => x.kind === 'forfeit'), 'forfeit news, no showdown');
});

test('same-night: the crowd splits on buzz (pay and fans follow); winner by share', () => {
  const GG = fresh(true), R = GG.rival;
  const run = (yb, rb) => {
    const s = band(GG, 800, 40); monday(GG, s); R.schedule(s, 'sameNight');
    s.buzz = yb; s.rival.buzz = rb;
    const g = { deal: 'door', pay: 2, capacity: 300, venueId: 'x' }, r = { crowd: 100, fans: 20, score: 70, pay: 200, lines: [] };
    R.shape(s, g, r);
    return { r, s };
  };
  const a = run(10, 50);
  eq([a.r.crowd, a.r.pay, a.r.fans, a.r.showdown.you, a.r.showdown.won, a.r.showdown.crowdLost], [55, 110, 11, 25, false, 45], 'low buzz: they take most of the room');
  const b = run(90, 10);
  eq([b.r.crowd, b.r.showdown.you, b.r.showdown.won], [90, 83, true], 'high buzz: you keep most of it');
  const c = run(10, 50); const again = R.shape(c.s, {}, c.r); eq(again.crowd, c.r.crowd, 'once per result');
  // no gig this week: quiet news at the wrap, no showdown
  const q = band(GG, 800, 40, 9); monday(GG, q); R.schedule(q, 'sameNight'); week(GG, q);
  ok(!q.showdowns.some(x => x.kind === 'sameNight') && q.rival.news.some(x => x.kind === 'sameNightQuiet'), 'no gig, no clash');
});

test('stolen slot: they take the best listing (not bookable, a news line); a venue that loves you turns them down', () => {
  const GG = fresh(true), R = GG.rival, W = GG.world;
  const s = band(GG, 900, 40); monday(GG, s);
  const before = W.board(s).filter(l => W.canBook(s, l)).length;
  const p = R.schedule(s, 'stolenSlot'), l = W.find(s, p.listingId);
  ok(l && l.stolen && l.stolen.by === 'Tundra Wraith' && !l.stolen.defended && !W.canBook(s, l), 'stolen and unbookable');
  eq(W.board(s).filter(x => W.canBook(s, x)).length, before - 1);
  ok(W.pick(s, l.id) === null && /Tundra Wraith/.test(l.catch), 'the board refuses it');
  const sd = s.showdowns.find(x => x.kind === 'stolenSlot');
  ok(sd && !sd.won && sd.heatDelta > 0 && s.rival.news.length > 0, 'a lost showdown + news');
  const t = band(GG, 900, 40, 3); monday(GG, t);
  W.board(t).forEach(x => { t.venueRep[x.venueId] = 3; });
  const q = R.schedule(t, 'stolenSlot'), m = W.find(t, q.listingId);
  ok(m.stolen.defended && W.canBook(t, m) && t.showdowns.find(x => x.kind === 'stolenSlot').won, 'defended = won, still bookable');
});

test('festival: a summer listing where they headline; outplay them from the lower slot for a bonus', () => {
  const GG = fresh(true), R = GG.rival, W = GG.world;
  const s = band(GG, 900, 48 + 2); monday(GG, s);   // year 3, week 2: summer
  const p = R.schedule(s, 'festival'), l = W.find(s, p.listingId);
  ok(l && l.showdown.kind === 'festival' && l.headliner === 'Tundra Wraith' && W.canBook(s, l) && l.fit === 1, 'festival listing on the board');
  ok(GG.gig.venue(l.venueId) && GG.gig.venue(l.venueId).festival, 'gig.venue finds festival grounds');
  W.pick(s, l.id);
  GG.career.setPlan(s, ['book', 'rest', 'rest']); GG.career.runWeek(s, AUTO);
  const r = s.lastGig, sd = r.showdown;
  ok(sd && sd.kind === 'festival' && sd.you === r.score, 'resolved at the festival');
  if (sd.won) ok(sd.bonusFans >= GG.content.economy.rival.festival.fansMin, 'bonus fans'); else eq(sd.fansSwing, 0);
});

test('poach: an unhappy member gets a fruit basket; keep them with a concession or they join the rival', () => {
  const GG = fresh(true), R = GG.rival;
  GG.content.economy.rival = Object.assign({}, GG.content.economy.rival, { kinds: Object.assign({}, GG.content.economy.rival.kinds, { poach: { weight: 4, cooldown: 12, minStage: 2, chance: 99 } }) });
  const s = band(GG, 800, 40), dana = mem(s, 'dana'), evs = [];
  GG.on('rival:poach', e => evs.push(e));
  dana.stage = 2; dana.mood = 30; dana.stageWeek = s.totalWeek;
  const r = GG.career.startWeek(s);
  ok(r.card && /^rv_poach(_tundra_wraith)?$/.test(r.card.id) && s.card.who === 'dana' && evs[0].who === 'dana', 'the poach card comes for Dana');
  ok(/Dana/.test(GG.career.fillText(s, r.card.title)), '{recruit} = Dana');
  GG.career.resolveCard(s, 0);
  const keep = s.showdowns.find(x => x.kind === 'poach');
  ok(keep && keep.won && dana.status === 'active' && dana.mood > 30, 'a concession keeps her');
  // the defect path (the gamble's fail branch)
  const t = band(GG, 800, 40, 8), jax = mem(t, 'jaxon');
  jax.stage = 2; jax.mood = 30;
  ok(R.schedule(t, 'poach', 'jaxon') && t.card.id === 'rv_poach_tundra_wraith' && GG.career.cardById(t.card.id), 'forced poach card (the rival variant)');
  GG.career.applyEffects(t, { member: { id: 'recruit', act: 'poach' } }, {});
  R.afterCard(t, GG.career.cardById(t.card.id));
  const lost = t.showdowns.find(x => x.kind === 'poach');
  ok(lost && !lost.won && jax.status === 'quit' && jax.exit.storyline === 'rival' && t.rivalDefectors.includes('jaxon'), 'Jaxon defects');
  ok(GG.drama.holes(t).includes(jax.role) && t.stats.poached === 1, 'a hole in the band, counted as poached');
  ok(R.lineup(t).some(m => m.id === 'jaxon' && m.defector && m.corpsePaint), 'he shows up in their lineup');
  // protected bands are never poached
  const g = career(GG, 5); g.totalWeek = 30; mem(g, 'dana').stage = 2;
  eq(R.forcedCard(g), null, 'garage protection: no poaching');
});

test('defectors: a turned-down original joins their lineup (v0.4 rivalDefectors) and survives a save', () => {
  const GG = fresh(true), s = band(GG, 800, 40);
  const dana = mem(s, 'dana'); dana.status = 'quit'; dana.exit = { storyline: 'rival' }; s.rivalDefectors = ['dana'];
  const line = GG.rival.lineup(s);
  eq(line.length, 5); const d = line.find(m => m.id === 'dana');
  ok(d.defector && d.corpsePaint && d.look && d.look.hairStyle && d.role === 'lead guitar', 'Dana in corpse paint with her look');
  const back = GG.save.fromCode(GG.save.toCode(s));
  ok(back.rival.members.some(m => m.id === 'dana'), 'kept in the save');
});

test('cracking: enough net wins (and heat) crack them: breakup, rebrand (new name, same accountants) or they open for you', () => {
  const GG = fresh(true), R = GG.rival, evs = [];
  GG.on('rival:cracked', e => evs.push(e));
  const s = band(GG, 5000, 60);
  s.rival.losses = 12; s.rival.wins = 2; s.rival.heat = 50;
  const wrap = {}; R.weekly(s, null, wrap);
  ok(GG.contracts.CRACKS.includes(s.rival.cracked) && wrap.rival.cracked === s.rival.cracked && evs.length === 1, 'cracked: ' + s.rival.cracked);
  ok(s.rival.crackCard === 'rv_crack_' + s.rival.cracked, 'a crack card is queued');
  s.totalWeek++; s.week++; s.weekStart = null; s.phase = 'monday';
  const r = GG.career.startWeek(s);
  ok(r.card && r.card.id === 'rv_crack_' + s.rival.cracked + '_tundra_wraith', 'dealt next Monday (the Tundra Wraith variant)');
  // rebrand: new name everywhere, same accountants
  const b = band(GG, 3000, 60, 4);
  eq(R.crack(b, 'rebrand'), 'rebrand');
  ok(b.rival.name !== 'Tundra Wraith' && b.rival.formerName === 'Tundra Wraith' && b.rival.members.length === 4, 'rebranded: ' + b.rival.name);
  eq(GG.career.fillText(b, '{rival}'), b.rival.name, '{rival} token follows');
  eq(R.crack(b, 'breakup'), null, 'only once');
  // breakup: no more scheduled showdowns; opener: they bring fans to your shows sometimes
  const k = band(GG, 3000, 60, 5); R.crack(k, 'breakup');
  eq([R.next(k).chance, k.rival.heat], [0, 10], 'broken up: chance 0, heat 10');
  const o = band(GG, 3000, 60, 6); R.crack(o, 'opener');
  let opened = 0;
  for (let i = 0; i < 40; i++) { o.totalWeek = 60 + i; const r2 = { crowd: 100, fans: 10, score: 70, pay: 0, lines: [] }; R.shape(o, { tier: 2, capacity: 400, deal: 'flat' }, r2); if (r2.rivalOpened) opened++; }
  ok(opened > 0 && opened < 20, 'they open for you now and then: ' + opened + '/40');
});

test('Loonies: rival strength from their records; a co-nomination is a clash (heat, record)', () => {
  const GG = fresh(true), s = band(GG, 5000, 24 * 3 + 16), R = GG.rival;
  s.rival.albums.push({ title: 'Test Record', kind: 'album', released: s.totalWeek - 6, peak: 20, debut: 20, sales: 9000, critic: 88 });
  const st = R.strength(s, 'album');
  ok(st > 80 && GG.labels.rivalStrength(s, 'album') === st && R.strength(s, 'worst_van') === 0, 'album case ' + st);
  s.loonies = { year: s.year, week: 20, nominations: [
    { category: 'album', name: 'Heavy Album', what: 'x', nominees: ['Hail Damage', 'Tundra Wraith', 'Mall Rats'], strength: 99, rival: 1 },
    { category: 'live', name: 'Best Live Act', what: 'x', nominees: ['Hail Damage', 'Tundra Wraith', 'Mall Rats'], strength: 1, rival: 99 }], invited: true, results: null, done: false };
  const h = s.rival.heat, res = GG.labels.runLoonies(s);
  ok(res.every(x => x.rivalIn && typeof x.you === 'number' && typeof x.them === 'number'), 'values kept for the rivalry');
  const sd = s.showdowns.find(x => x.kind === 'loonies');
  ok(sd && sd.you === 1 && sd.them === 1 && sd.won, 'beat them in one category = a Loonie win');
  ok(s.rival.heat > h && s.rival.loonieWins === 1, 'heat + their trophy count');
  const cv = GG.labels.chartView(s);
  ok(cv.rows.some(x => x.rival && x.artist === 'Tundra Wraith' && x.pos === 20 + 6 * 7) || R.chartEntry(s) === null, 'their record on the Maple 100');
  s.rival.albums.push({ title: 'Now Charting', kind: 'album', released: s.totalWeek, peak: 7, debut: 7, sales: 1, critic: 80 });
  ok(GG.labels.chartView(s).rows.some(x => x.rival && x.title === 'Now Charting' && x.pos === 7), 'debut row');
});

test('the final: year 10, week 21, the Sad Dome co-bill decides who headlines forever (finalShowdown stored)', () => {
  const GG = fresh(true), R = GG.rival, evs = [];
  GG.on('final:done', e => evs.push(e));
  const s = band(GG, 30000, 9 * 24 + 21);
  s.era = 'signed';
  const r = GG.career.startWeek(s);
  ok(r.card && r.card.id === 'rv_final_eve_tundra_wraith', 'Sad Dome eve card (the Tundra Wraith variant)');
  GG.career.resolveCard(s, 1);
  ok(s.gig && s.gig.showdown.kind === 'final' && s.gig.city === 'Calgary' && s.gig.km === 620 && R.pending(s).kind === 'final', 'booked at the Sad Dome');
  const set = R.showdown(s);
  ok(set.kind === 'final' && set.setlist.length === 4 && /headline/i.test(set.stakes), 'final setup');
  GG.career.setPlan(s, ['book', 'rest', 'rest']); GG.career.runWeek(s, AUTO);
  const f = s.finalShowdown;
  ok(f && f.week === s.totalWeek && ['you', 'rival'].includes(f.headliner) && f.headliner === (f.won ? 'you' : 'rival'), 'stored: ' + JSON.stringify(f));
  ok(f.score === s.lastGig.score && f.rivalScore === set.score && evs.length === 1, 'your set vs theirs');
  GG.career.endWeek(s);
  GG.career.startWeek(s); ok(!s.gig || !s.gig.showdown, 'never again');
  // the fallback: nobody played it (no gig) -> the wrap resolves it anyway
  const t = band(GG, 30000, 9 * 24 + 21, 3); t.era = 'signed';
  monday(GG, t); t.gig = null;
  GG.career.setPlan(t, ['rest', 'rest', 'rest']); GG.career.runWeek(t, AUTO); GG.career.endWeek(t);
  ok(t.finalShowdown && t.finalShowdown.headliner, 'auto-resolved at the wrap');
  // a career that never reaches year 10 never schedules it
  const u = band(GG, 3000, 60, 4); u.maxWeeks = 100;
  eq(R.next(u).final.reachable, false);
});

test('leaderboard: you, the rival and the scene by fans, with ranks and trends', () => {
  const GG = fresh(true), s = band(GG, 2500, 60), R = GG.rival;
  const all = R.leaderboard(s);
  // v0.9 (Q4/Q8): the scene skips the row for your own rival and your own band's cameo row
  const scene = GG.content.rivalry.scene, skip = scene.filter(f => f.rivalId === 'tundra_wraith' || f.name === 'Tundra Wraith' || f.bandId === 'hail_damage');
  eq(skip.length, 2, 'Hail Damage: two rows skipped (Tundra Wraith, the Hail Damage cameo)');
  ok(!all.some(r => !r.you && !r.rival && (r.rivalId === 'tundra_wraith' || r.bandId === 'hail_damage')), 'no duplicate rows');
  ok(all.length === 2 + scene.length - skip.length && all.every((r, i) => r.rank === i + 1 && (i === 0 || all[i - 1].fans >= r.fans)), 'sorted + ranked');
  ok(all.some(r => r.you && r.fans === 2500) && all.some(r => r.rival && r.name === 'Tundra Wraith'), 'you and them');
  const top = R.leaderboard(s, 3);
  ok(top.some(r => r.you) && top.some(r => r.rival) && top.length <= 5, 'top n keeps you and the rival');
  eq(JSON.stringify(R.leaderboard(s)), JSON.stringify(all), 'stable per week');
});

test('migration v5 -> v6: a rival caught up to the current week, idempotent, save codes round-trip', () => {
  const GG = fresh(true), s = career(GG, 31);
  for (let i = 0; i < 70; i++) GG.career.botWeek(s, 'avg');
  const old = JSON.parse(JSON.stringify(s));
  old.v = 5; delete old.rival; delete old.showdowns; delete old.finalShowdown; old.flags.wraithFeud = true;
  const m = GG.save.migrate(JSON.parse(JSON.stringify(old)));
  eq([m.v, m.showdowns, m.finalShowdown], [GG.contracts.SAVE_SCHEMA, [], null]);
  ok(m.rival && m.rival.name === 'Tundra Wraith' && m.rival.members.length >= 4, 'rival created');
  ok(m.rival.fans > 1500 && m.rival.albums.length === 3 && m.rival.era === 'signed' && m.rival.news.length === 0, 'caught up quietly: ' + m.rival.fans);
  ok(m.rival.heat > GG.content.economy.rival.heat.start, 'an old feud starts hotter');
  eq(JSON.stringify(GG.save.migrate(JSON.parse(JSON.stringify(m)))), JSON.stringify(m), 'idempotent');
  const back = GG.save.fromCode(GG.save.toCode(s));
  eq(JSON.stringify([back.rival, back.showdowns, back.finalShowdown]), JSON.stringify([s.rival, s.showdowns, s.finalShowdown]), 'round-trip');
  GG.career.botWeek(m, 'avg'); ok(m.rival.w === m.totalWeek - 1, 'keeps going after the migration');
});

test('bots: full careers with showdowns of every live kind, a crack for the good bot, the final; deterministic; pure', () => {
  const GG = fresh(), runs = {};
  for (const style of ['avg', 'good']) {
    const s = career(GG, 2024);
    while (!s.ended) GG.career.botWeek(s, style);
    runs[style] = s;
    const kinds = new Set(s.showdowns.map(x => x.kind));
    ok(s.showdowns.length >= 20, style + ': showdowns ' + s.showdowns.length);
    ['botb', 'stolenSlot', 'loonies', 'final'].forEach(k => ok(kinds.has(k), style + ': ' + k));
    ok(s.finalShowdown && s.finalShowdown.week === 9 * 24 + 21, style + ': the Sad Dome in year 10');
    ok(s.rival.heat >= 0 && s.rival.heat <= 100 && isFinite(s.rival.fans), style + ': sane');
  }
  ok(runs.good.rival.cracked, 'the good bot cracks them');
  ok(runs.good.rival.losses > runs.good.rival.wins, 'the good bot beats them over a career');
  const again = career(GG, 2024); while (!again.ended) GG.career.botWeek(again, 'good');
  eq(JSON.stringify(again.rival), JSON.stringify(runs.good.rival), 'deterministic');
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', '23_sim_rival.js'), 'utf8');
  ok(!/Math\.random|\bDate\b|document\.|window\.(?!GG)/.test(src), '23_sim_rival.js is pure');
});

done('sim_rival');
