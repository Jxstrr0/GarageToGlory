// sim_licensing.test.js (v0.8.1 LICRECAP, handoff D1): licensing content (parody brands, genre fit, the owner's money),
// when offers come (Signed era, a chart, a viral post), fees, the label's cut, take / decline / counter, the Monday card
// (four choices, "Sleep on it" leaves it on the laptop), expiry, the sellout scandal, Buckle & Boot's fury, saves, bots,
// determinism and the career totals (2–4 offers, a median of roughly $5k–15k).
const { test, ok, eq, done } = require('./_t');
const load = require('./_load');

function fresh() { return load({ localStorage: load.fakeStorage() }); }
function career(GG, seed, extra, bandId) {
  const s = GG.career.newCareer({ seed: seed || 7, player: { name: 'T' }, bandId });
  return Object.assign(s, extra || {});
}
const SIGNED = { era: 'signed', fans: 9000, protected: false, totalWeek: 62, year: 3, week: 14 };
// Next Monday at totalWeek tw (weeks 14–16 of a year: no holiday card in the way).
function monday(GG, s, tw) { s.totalWeek = tw; s.week = (tw - 1) % 24 + 1; s.year = Math.floor((tw - 1) / 24) + 1; s.phase = 'wrap'; s.weekStart = null; return GG.career.startWeek(s); }

test('content: five parody brands, the owner\'s fee ranges ($1.5k–$6k: hockey low, truck high), genre fit, lines', () => {
  const GG = fresh(), K = GG.content.licensing, C = GG.contracts;
  // v0.9: the five base brands (insurance is Marcel's employer, so it is Hail Damage's own), plus one "employer" brand
  // per new band from the packs; every employer brand is gated with brand.band to exactly one band.
  eq(K.brands.slice(0, 5).map(b => b.id), ['truck', 'energy', 'hockey', 'insurance', 'game']);
  eq(K.brands.filter(b => !b.band).map(b => b.id), ['truck', 'energy', 'hockey', 'game'], 'open brands');
  const gated = {}; K.brands.filter(b => b.band).forEach(b => { eq([].concat(b.band).length, 1, b.id + ': one band'); gated[[].concat(b.band)[0]] = b.id; });
  eq(gated, { hail_damage: 'insurance', frost_heave: 'fh_city_psa', gravel_kings: 'smile_centre', grid_road_ramblers: 'seed_dealer' }, 'band-gated employer brands');
  K.brands.forEach(b => {
    ok(b.name && b.what && b.blurb && b.title && b.offer && b.take && b.decline && b.counterWin && b.counterWalk && b.expire, b.id + ': text');
    ok(b.fee[0] >= 1500 && b.fee[1] <= 6000 && b.fee[0] < b.fee[1], b.id + ': fee ' + b.fee);
    ok(b.sellout >= 0 && b.sellout <= 1 && b.buzz > 0 && b.reach > 0, b.id + ': weights');
    ok(/\{adsong\}/.test(b.offer) && /\{adfee\}/.test(b.offer), b.id + ': offer names the song and the fee');
  });
  const by = id => K.brands.find(b => b.id === id);
  ok(by('hockey').fee[0] === 1500 && by('truck').fee[1] === 6000 && K.brands.every(b => b.fee[1] <= by('truck').fee[1] && b.fee[0] >= by('hockey').fee[0]), 'hockey low, truck high');
  ok(by('truck').genres.country >= 3 && by('truck').genres.rock >= 3, 'truck: country + rock');
  ok(by('energy').genres.metal >= 3 && by('energy').genres.punk >= 3, 'energy drink: metal + punk');
  ok(by('insurance').genres.metal >= 3 && /Marcel/.test(by('insurance').blurb) && by('insurance').takeFx.mood.marcel < 0, 'insurance: metal, Marcel\'s employer, mortified');
  ['hockey', 'game'].forEach(id => ok(['metal', 'punk', 'rock', 'country'].every(g => by(id).genres[g] > 0), id + ': any genre'));
  const T = K.tune;
  ok(T.counter === 0.4 && T.walk === 0.3 && T.walkMin === 0.15, 'counter +40%, walk 30% -> 15%');
  eq(GG.content.licenseChoices.map(c => c.lic), C.LICENSE_CHOICES.concat(['later']).sort((a, b) => ['take', 'counter', 'decline', 'later'].indexOf(a) - ['take', 'counter', 'decline', 'later'].indexOf(b)));
  ok(GG.content.licenseCards.some(c => c.id === 'lic_fury' && c.gate.band[0] === 'grid_road_ramblers'), 'Buckle & Boot fury card (Ramblers)');
  ok(GG.content.licenseScandals.every(x => GG.content.licenseCards.some(c => c.id === x.card)), 'scandal cards exist');
});

test('state: new careers and old saves get licensing fields (chained migrate, no schema of our own)', () => {
  const GG = fresh(), s = career(GG, 3);
  ok(s.licensing && Array.isArray(s.licensing.offers) && Array.isArray(s.licensing.deals) && s.licensing.declined === 0 && s.licensing.made === 0, 'new career');
  const old = JSON.parse(JSON.stringify(s)); delete old.licensing; old.v = 9;
  const m = GG.save.migrate(old);
  ok(m.licensing && m.licensing.offers.length === 0 && m.v === GG.contracts.SAVE_SCHEMA, 'old save filled');
  ok(GG.save.migrate.licensing && GG.save.migrate.recap, 'migrate chain flags');
});

test('when offers come: Signed era, or a chart / a viral post earlier; never in the garage with a few fans', () => {
  const GG = fresh(), L = GG.licensing;
  let s = career(GG, 5);
  ok(!L.eligible(s) && L.chance(s) === 0, 'garage era');
  Object.assign(s, { era: 'local', fans: 900 });
  ok(!L.eligible(s), 'local, nothing charted');
  s.bandbook.viral = 1; ok(L.eligible(s) && L.chance(s) > 0, 'a viral post opens it');
  s.bandbook.viral = 0; s.albums = [{ status: 'released', chart: { peak: 40 } }]; ok(L.eligible(s), 'a Maple 100 chart opens it');
  s = career(GG, 6, SIGNED); ok(L.eligible(s), 'Signed era');
  s.fans = 100; ok(!L.eligible(s), 'but not with 100 fans');
  s = career(GG, 6, SIGNED);
  const lo = L.chance(s); s.fans = 40000; const hi = L.chance(s);
  ok(lo > 0.01 && hi > lo && hi <= 0.03, 'rare, more with fame: ' + lo + ' -> ' + hi);
  ok(L.cap(Object.assign(career(GG, 6, SIGNED), { fans: 2000 })) === 3 && L.cap(Object.assign(career(GG, 6, SIGNED), { fans: 40000 })) === 5, 'career cap 3, more with fame');
  const o = L.makeOffer(s, GG.RNG(1));
  ok(L.chance(s) === 0, 'one open offer at a time');
  o.status = 'declined'; ok(L.chance(s) === 0, 'and a gap after it');
  s.totalWeek += 20; ok(L.chance(s) > 0, 'the gap passes');
});

test('offers: fee in the brand range by fame (rounded to $100), genre-weighted brands, the best song not already in an ad', () => {
  const GG = fresh(), L = GG.licensing, tally = {};
  for (let i = 0; i < 300; i++) {
    const s = career(GG, 11, SIGNED), o = L.makeOffer(s, GG.RNG(1000 + i)), b = L.brand(o.brandId);
    ok(o.fee % 100 === 0 && o.fee >= b.fee[0] && o.fee <= b.fee[1], 'fee ' + o.fee + ' in ' + b.fee);
    ok(o.status === 'open' && o.expires === s.totalWeek + 3 && !o.shown && GG.songs.byId(s, o.songId), 'shape');
    tally[o.brandId] = (tally[o.brandId] || 0) + 1;
  }
  ok(tally.energy > tally.truck && tally.insurance > tally.truck, 'metal: energy drink + insurance beat the truck ad: ' + JSON.stringify(tally));
  const GG2 = fresh(), c = {};
  for (let i = 0; i < 200; i++) { const s = career(GG2, 12, SIGNED, 'grid_road_ramblers'); const o = GG2.licensing.makeOffer(s, GG2.RNG(i + 7)); if (o) c[o.brandId] = (c[o.brandId] || 0) + 1; }
  ok((c.truck || 0) > (c.energy || 0) && !c.insurance || (c.truck || 0) > 3 * (c.insurance || 0), 'country: the truck ad: ' + JSON.stringify(c));
  // v0.9: brand.band — an employer brand is only ever offered to its own band.
  ['hail_damage', 'frost_heave', 'gravel_kings', 'grid_road_ramblers'].forEach(bid => {
    const seen = {};
    for (let i = 0; i < 120; i++) { const s = career(GG2, 30 + i, SIGNED, bid), o = GG2.licensing.makeOffer(s, GG2.RNG(i + 99)); if (o) seen[o.brandId] = 1; }
    Object.keys(seen).forEach(id => { const b = GG2.licensing.brand(id); ok(!b.band || [].concat(b.band).indexOf(bid) >= 0, bid + ' never gets ' + id); });
    const own = GG2.content.licensing.brands.filter(b => b.band && [].concat(b.band).indexOf(bid) >= 0);
    ok(own.every(b => seen[b.id]), bid + ': its own employer brand does come up: ' + JSON.stringify(seen));
  });
  const s = career(GG, 13, SIGNED); s.songs.forEach(x => { x.ad = { brandId: 'game', week: 1 }; });
  ok(L.makeOffer(s, GG.RNG(2)) === null, 'no song left that is not already in an ad');
  const a = career(GG, 14, Object.assign({}, SIGNED, { fans: 1200 })), b = career(GG, 14, Object.assign({}, SIGNED, { fans: 30000 }));
  const fa = L.makeOffer(a, GG.RNG(9)), fb = L.makeOffer(b, GG.RNG(9));
  ok(fa.brandId === fb.brandId && fb.fee > fa.fee, 'more fans, a bigger fee: ' + fa.fee + ' -> ' + fb.fee);
});

test('take: fee to the fund, buzz + fans, the song is in a commercial (stale), haters up, Sold Out; a label takes its cut', () => {
  const GG = fresh(), L = GG.licensing, s = career(GG, 21, SIGNED);
  const o = L.makeOffer(s, GG.RNG(3)); o.brandId = 'hockey'; o.fee = 2000;
  const f0 = s.fund, b0 = s.buzz, h0 = s.fanTypes.hater, fans0 = s.fans;
  const r = L.answer(s, o.id, 'take');
  const song = GG.songs.byId(s, o.songId);
  ok(r.ok && r.status === 'taken' && r.net === 2000 && s.fund === f0 + 2000, 'the whole fee without a label: ' + JSON.stringify(r));
  ok(s.buzz > b0 && s.fans > fans0 && s.fanTypes.hater > h0, 'buzz, fans, haters');
  ok(song.ad && song.ad.brandId === 'hockey' && song.stale >= 25, 'SONG.ad + stale bump');
  ok(s.licensing.deals.length === 1 && s.licensing.deals[0].fee === 2000 && s.milestones.soldOut === s.totalWeek && s.stats.licensed === 2000, 'deal logged, Sold Out');
  ok(!L.answer(s, o.id, 'take').ok, 'no double take');
  // the stale floor while the ad runs
  song.stale = 0; L.weekly(s, null, null); ok(song.stale >= 20, 'ad songs stay stale for a while');
  // a label deal: (1 - royalty) / 2, clamped 15–40%, counted toward the recoup
  const t = career(GG, 22, SIGNED);
  t.label = { id: 'monolith_1', labelId: 'monolith', name: 'Monolith Records', royalty: 0.16, advance: 10000, costs: 0, recouped: 0, dropped: false };
  const o2 = L.makeOffer(t, GG.RNG(4)); o2.fee = 5000;
  const q = L.quote(t, o2);
  ok(q.cut === 2000 && q.net === 3000 && q.label === 'Monolith Records', 'Monolith takes 40%: ' + JSON.stringify(q));
  const f1 = t.fund; L.answer(t, o2.id, 'take');
  ok(t.fund === f1 + 3000 && t.label.recouped === 2000, 'the cut goes toward the recoup');
  t.label = { labelId: 'gopherwood', name: 'Gopherwood Records', royalty: 0.5, advance: 2000, recouped: 0, costs: 0 };
  ok(L.quote(t, { fee: 4000 }).cut === 1000, 'Gopherwood takes 25%');
});

test('decline: a small superfan loyalty bump; counter: +40% or they walk (30%, 15% with fans or a label)', () => {
  const GG = fresh(), L = GG.licensing, s = career(GG, 31, SIGNED);
  const o = L.makeOffer(s, GG.RNG(5)), sup0 = s.fanTypes.super, dale0 = s.superfans.dale.mood, f0 = s.fund;
  const r = L.answer(s, o.id, 'decline');
  ok(r.ok && o.status === 'declined' && s.fanTypes.super > sup0 && s.superfans.dale.mood > dale0 && s.fund === f0 && s.licensing.declined === 1, 'decline');
  const a = career(GG, 32, Object.assign({}, SIGNED, { fans: 2000 }));
  ok(L.walkChance(a) === 0.3, 'walk 30% with few fans: ' + L.walkChance(a));
  a.fans = 30000; ok(L.walkChance(a) === 0.15, '15% with lots of fans');
  a.fans = 2000; a.label = { labelId: 'gopherwood', royalty: 0.5, dropped: false }; ok(L.walkChance(a) === 0.15, '15% with a label');
  let walked = 0, won = 0;
  for (let i = 0; i < 200; i++) {
    const s2 = career(GG, 100 + i, Object.assign({}, SIGNED, { fans: 2000 })), o2 = L.makeOffer(s2, GG.RNG(i + 1));
    const fee = o2.fee, r2 = L.answer(s2, o2.id, 'counter');
    if (r2.status === 'withdrawn') { walked++; ok(r2.success === false && s2.licensing.deals.length === 0, 'walked'); }
    else { won++; ok(r2.success === true && o2.fee === Math.round(fee * 1.4 / 100) * 100 && s2.licensing.deals[0].countered, 'countered at +40%'); }
  }
  ok(walked > 35 && walked < 85, 'about 30% walk: ' + walked + '/200');
});

test('Monday card: four choices with the fee in the hints; Take / Sleep on it / Counter through resolveCard; expiry', () => {
  const GG = fresh(), L = GG.licensing, s = career(GG, 41, SIGNED);
  const o = L.makeOffer(s, GG.RNG(6)); o.brandId = 'energy'; o.fee = 3000;
  const st = monday(GG, s, 63);
  ok(st.card && st.card.id === 'lic_energy' && o.shown && s.card.who === 'mom', 'the offer is Monday\'s card: ' + (st.card && st.card.id));
  const hints = st.card.choices.map(c => GG.career.choiceHint(s, c));
  ok(/\+\$3,000/.test(hints[0]) && /\d+% chance they walk/.test(hints[1]) && /Superfans/.test(hints[2]) && /1 week|3 weeks/.test(hints[3]), 'hints: ' + hints.join(' | '));
  ok(/\$3,000/.test(GG.career.fillText(s, st.card.text)) && /Riot Juice/.test(GG.career.fillText(s, '{brand}')), 'text tokens');
  const res = GG.career.resolveCard(s, 0);
  ok(o.status === 'taken' && res.deltas.fund === 3000 && /snowmobile/.test(res.outcome), 'Take it via the card: ' + res.outcome);
  // sleep on it
  const t = career(GG, 42, SIGNED), o2 = L.makeOffer(t, GG.RNG(7));
  monday(GG, t, 63);
  const r2 = GG.career.resolveCard(t, 3);
  ok(o2.status === 'open' && L.open(t).length === 1 && /laptop/.test(r2.outcome), 'Sleep on it: still open on the laptop');
  const again = monday(GG, t, 64).card;
  ok(!again || again.id.indexOf('lic_') !== 0, 'the same offer isn\'t shown twice');
  t.totalWeek = o2.expires;
  const w = L.weekly(t, null, {});
  ok(o2.status === 'expired' && w.expired.length === 1 && L.open(t).length === 0, 'unanswered offers expire');
  // counter through the card reports success
  const u = career(GG, 43, SIGNED), o3 = L.makeOffer(u, GG.RNG(8));
  monday(GG, u, 63);
  const r3 = GG.career.resolveCard(u, 1);
  ok(r3.success === (o3.status === 'taken') && ['taken', 'withdrawn'].includes(o3.status), 'counter via the card: ' + o3.status);
});

test('sellout: haters up by the brand\'s weight; a scandal card queued through Bandbook; Buckle & Boot fury for the Ramblers', () => {
  const GG = fresh(), L = GG.licensing;
  GG.content.licensing.tune.scandal = 5;   // force the roll
  const s = career(GG, 51, SIGNED), o = L.makeOffer(s, GG.RNG(9)); o.brandId = 'insurance';
  const h0 = s.fanTypes.hater, m0 = s.members.find(m => m.id === 'marcel').mood;
  L.answer(s, o.id, 'take');
  ok(s.fanTypes.hater - h0 >= 0.03, 'insurance (sellout 0.9) pushes haters: ' + (s.fanTypes.hater - h0));
  ok(s.members.find(m => m.id === 'marcel').mood < m0, 'Marcel is mortified');
  ok(s.bandbook.pending && s.bandbook.pending.card === 'lic_scandal_moose', 'the moose scandal is queued: ' + JSON.stringify(s.bandbook.pending));
  s.bandbook.lastCard = null;
  const st = monday(GG, s, 64);
  ok(st.card && st.card.id === 'lic_scandal_moose' && /Insurance|Prairie Mutual/.test(GG.career.fillText(s, st.card.text)), 'it comes up as a Bandbook scandal');
  const sc0 = s.bandbook.scandals; GG.career.resolveCard(s, 0);
  ok(s.bandbook.scandals === sc0 + 1, 'counted as a scandal');
  GG.content.licensing.tune.scandal = 0.5;
  // Ramblers + truck ad
  const r = career(GG, 52, SIGNED, 'grid_road_ramblers'), o2 = L.makeOffer(r, GG.RNG(10)); o2.brandId = 'truck';
  const heat0 = GG.rival.heat(r);
  L.answer(r, o2.id, 'take');
  ok(GG.rival.heat(r) >= heat0 + 15 && r.licensing.fury === 'truck', 'rival heat spikes: ' + heat0 + ' -> ' + GG.rival.heat(r));
  const f = monday(GG, r, 63);
  ok(f.card && f.card.id === 'lic_fury', 'Buckle & Boot\'s card next Monday');
  const h1 = GG.rival.heat(r); GG.career.resolveCard(r, 0);
  ok(GG.rival.heat(r) > h1, 'rubbing it in: more heat');
  const hd = career(GG, 53, SIGNED), o3 = L.makeOffer(hd, GG.RNG(11)); o3.brandId = 'truck'; L.answer(hd, o3.id, 'take');
  ok(!hd.licensing.fury, 'no fury for Hail Damage');
});

test('bots answer offers sensibly; careers see 2–4 offers and a median of roughly $5k–15k; deterministic; the career RNG untouched', () => {
  const GG = fresh(), L = GG.licensing, totals = [], counts = [];
  GG.legacy.noBonus = true;   // v1.0: the 10-year careers these numbers were tuned on
  for (let seed = 1; seed <= 5; seed++) {
    const s = GG.career.newCareer({ seed: seed * 7919, player: { name: 'Bot' } });
    while (!s.ended) GG.career.botWeek(s, 'avg');
    totals.push(L.income(s)); counts.push(s.licensing.made);
    ok(L.open(s).length === 0 || s.totalWeek - L.open(s)[0].week < 4, 'no offer left hanging');
    ok(s.licensing.offers.length <= 6, 'offers list stays small');
  }
  totals.sort((a, b) => a - b);
  ok(counts.every(n => n >= 1 && n <= 5) && counts.reduce((a, b) => a + b, 0) / counts.length >= 2 && counts.reduce((a, b) => a + b, 0) / counts.length <= 4.2, 'offers per career: ' + counts);
  ok(totals[2] >= 3000 && totals[2] <= 15000, 'median career licensing: $' + totals[2] + ' (' + totals + ')');
  // determinism
  const a = GG.career.newCareer({ seed: 777, player: { name: 'Bot' } }), b = GG.career.newCareer({ seed: 777, player: { name: 'Bot' } });
  for (let i = 0; i < 150; i++) { GG.career.botWeek(a, 'good'); GG.career.botWeek(b, 'good'); }
  eq(JSON.stringify(a.licensing), JSON.stringify(b.licensing), 'same seed, same offers');
  // the career RNG is untouched by the licensing roll (it uses its own seeded RNG)
  const c = career(GG, 61, SIGNED), rng0 = c.rng; c.phase = 'wrap';
  L.weekly(c, null, {}); ok(c.rng === rng0, 'career RNG untouched');
  // bot choice: the good bot declines a big sellout when haters are already high
  const d = career(GG, 62, SIGNED), o = L.makeOffer(d, GG.RNG(12)); o.brandId = 'insurance'; d.fanTypes.hater = 0.2; d.licensing.cur = o.id;
  const card = L.card('lic_insurance');
  ok(card.choices[L.botChoice(d, card, 'good')].lic === 'decline', 'good bot declines the insurance ad with haters high');
  d.fanTypes.hater = 0.02; d.fans = 30000;
  ok(card.choices[L.botChoice(d, card, 'good')].lic === 'counter', 'good bot counters when the odds are good');
});

done('sim_licensing');
