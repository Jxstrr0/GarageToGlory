// sim_money.test.js (v1.4 "Tuning", Addendum 7): the owner's money picks.
//   M1 "Gigs pay, side jobs less" (the critic's B+): start $450, small rooms x1.6 (with the tier step: moving up a venue
//      tier never pays less), gas x0.5 in the garage era and x0.8 until signed, then fading to x1 (no cliff at signing),
//      exposure gigs cover $40 of gas, grade pay S x1.25 / A x1.1 (nobody docked), ride $200 + pedal $250, Hustle x0.7 in
//      the garage era and x1 at Local Heroes, the band's cut on the results screen (pw), the early help fades with
//      career.earlyMoney.
//   M2 "Fair grades": the same accuracy earns the same grade and pay on any seat (the crowd's flow warms every seat).
//   M3 the jam room is $35 a week until you sign, then $60.
const { test, ok, eq, done } = require('./_t');
const load = require('./_load');
const fs = require('fs'), path = require('path');

const fresh = () => { const g = load({ localStorage: load.fakeStorage() }); g.content.cards = []; return g; };
const career = (GG, o) => { const s = GG.career.newCareer(Object.assign({ seed: 7, player: { name: 'T' } }, o || {})); s.gig = null; return s; };
const atLocal = (s, lh, week, era) => { s.era = era || 'local'; s.milestones.localHeroes = lh; s.totalWeek = week; return s; };
// signed at week sw through GG.career.setEra (eraHistory, as a deal or a DIY album does), then on to `week`
const atSigned = (GG, s, lh, sw, week, why) => { atLocal(s, lh, sw); GG.career.setEra(s, 'signed', why || 'deal'); s.totalWeek = week; return s; };

test('M1 levers: start $450, Hustle x0.7 garage / x1 Local Heroes, ride $200 + pedal $250 on every seat\'s line', () => {
  const GG = fresh(), E = GG.content.economy;
  eq(career(GG).fund, 450, 'start fund (Normal)');
  eq([E.hustleEra.garage, E.hustleEra.local, E.hustleEra.signed, E.hustleEra.world], [0.7, 1, 2.2, 3]);
  for (const seat of GG.contracts.SEATS) {
    const s = career(GG, { seat }), items = GG.shop.gearItems(s);
    eq(items.map(x => x.id + ':' + x.cost), ['toms:450', 'ride:200', 'pedal:250'], seat + ' gear prices');
  }
  // the Hustle block pays $50-100 x the era factor
  const run = era => { const s = career(GG, { seed: 21 }); s.era = era; if (era !== 'garage') { s.milestones.localHeroes = 1; s.protected = false; }
    GG.career.startWeek(s); GG.career.setPlan(s, ['hustle', 'rest', 'rest']); return GG.career.runWeek(s, { autoGig: true }).blocks[0].deltas.fund; };
  const g = run('garage'), l = run('local');
  ok(g >= 35 && g <= 70, 'garage hustle $35-70: ' + g); ok(l >= 50 && l <= 100, 'Local Heroes hustle $50-100 (no raise): ' + l);
});

test('M1 gas: x0.5 in the garage era, x0.8 at Local Heroes until signed, fading to x1 over 12 weeks after; exposure gigs take $40 off', () => {
  const GG = fresh(), W = GG.world, s = career(GG), km = W.km(W.home(s), 'Regina'), full = Math.max(5, Math.round(km * 2 * 0.25));
  ok(km > 100, 'Saskatoon to Regina is a drive: ' + km);
  eq(W.gasMult(s), 0.5); eq(W.gasFor(s, 'Regina'), Math.max(5, Math.round(km * 2 * 0.25 * 0.5)), 'garage: half price');
  atLocal(s, 20, 20); eq(W.gasMult(s), 0.8); eq(W.gasFor(s, 'Regina'), Math.max(5, Math.round(km * 2 * 0.25 * 0.8)), 'Local Heroes: 80%');
  s.totalWeek = 50; eq(W.gasMult(s), 0.8, 'still 80% 30 weeks after Local Heroes: until signed');
  atSigned(GG, s, 20, 50, 50); eq(W.gasMult(s), 0.8, 'the signing week: still 80%');
  s.totalWeek = 56; ok(Math.abs(W.gasMult(s) - 0.9) < 1e-9, 'half way through the 12-week fade: x0.9');
  s.totalWeek = 62; eq(W.gasMult(s), 1); eq(W.gasFor(s, 'Regina'), full, 'full price 12 weeks after signing');
  s.era = 'world'; s.totalWeek = 300; eq(W.gasMult(s), 1);
  // exposure: the host chips in $40 (never below $0); a paid deal pays its gas
  const t = career(GG); t.fans = 200;
  const ex = W.decorate(t, GG.gig.makeGig(t, 'craigs_basement', 'card')), pd = W.decorate(t, GG.gig.makeGig(t, 'speedy_creek_legion', 'card'));
  eq(ex.deal, 'exposure'); eq(ex.gas, Math.max(0, W.gasFor(t, ex.city) - 40), 'exposure gas - $40');
  eq(pd.gas, W.gasFor(t, pd.city), 'a paid gig pays its own gas');
  ok(W.gasFor(t, ex.city) > 40 && ex.gas < W.gasFor(t, ex.city), 'the cover shows on a long exposure drive');
});

test('M1 tier rule: small rooms pay x1.6 up to the $150 / $2-a-head step, tier 2 starts at it: moving up never pays less', () => {
  const GG = fresh(), W = GG.world, K = W.cfg();
  eq([K.tierPay[1], K.tierPay[2], K.tierPay[3], K.tierStep.flat, K.tierStep.door], [1.6, 1, 1, 150, 2]);
  eq(W.tierPay(1, 'flat', 60), 96); eq(W.tierPay(1, 'flat', 120), 150); eq(W.tierPay(1, 'door', 1), 1.6); eq(W.tierPay(1, 'door', 2), 2);
  eq(W.tierPay(2, 'flat', 100), 150); eq(W.tierPay(2, 'flat', 200), 200); eq(W.tierPay(2, 'door', 1.5), 2); eq(W.tierPay(3, 'door', 0.9), 0.9);
  // every room's range: the best boosted tier-1 pay <= the worst tier-2 pay, per deal (headline deals; rep / hazard / holidays aside)
  const V = GG.content.venues, rng = (v, d) => (v.payRange && v.payRange[d]) || null;
  for (const d of ['flat', 'door']) {
    const t1 = V.filter(v => v.tier === 1 && rng(v, d)), t2 = V.filter(v => v.tier === 2 && rng(v, d));
    const top1 = Math.max(...t1.map(v => W.tierPay(1, d, rng(v, d)[1]))), low2 = Math.min(...t2.map(v => W.tierPay(2, d, rng(v, d)[0])));
    ok(t1.length > 5 && t2.length > 5 && top1 <= low2, d + ': tier-1 ceiling ' + top1 + ' <= tier-2 floor ' + low2);
    const grid = v => [...Array(11).keys()].map(i => rng(v, d)[0] + (rng(v, d)[1] - rng(v, d)[0]) * i / 10);   // the range, evenly
    const raw1 = t1.reduce((a, v) => a + grid(v).reduce((x, y) => x + y, 0), 0), boost = t1.reduce((a, v) => a + grid(v).reduce((x, y) => x + W.tierPay(1, d, y), 0), 0);
    ok(boost / raw1 > (d === 'flat' ? 1.4 : 1.25), d + ': small rooms still pay a lot more on average: x' + (boost / raw1).toFixed(2));
  }
  // the board: 30 weeks of listings at 160 fans, no venue rep, no holidays/clash: every tier-1 headline pay <= every tier-2 one
  const s = career(GG); s.fans = 160; s.genre = 'rock'; const seen = { 1: { flat: [], door: [] }, 2: { flat: [], door: [] } };
  const cal = GG.calendar; GG.calendar = null;
  try {
    for (let w = 1; w <= 60; w++) { s.totalWeek = w; W.listings(s).forEach(l => { if (!l.opening && !l.clash && seen[l.tier] && seen[l.tier][l.deal]) seen[l.tier][l.deal].push(l.pay); }); }
  } finally { GG.calendar = cal; }
  for (const d of ['flat', 'door']) {
    ok(seen[1][d].length && seen[2][d].length, d + ' seen on both tiers ' + seen[1][d].length + '/' + seen[2][d].length);
    ok(Math.max(...seen[1][d]) <= Math.min(...seen[2][d]), d + ': board tier-1 max ' + Math.max(...seen[1][d]) + ' <= tier-2 min ' + Math.min(...seen[2][d]));
  }
  // card bookings go through the same rule
  eq(GG.gig.makeGig(s, 'legion_63', 'card').pay, 130); eq(GG.gig.makeGig(s, 'st_vlads_hall', 'card').pay, 150);
});

test('M1 grade pay: S x1.25, A x1.1, B/C/D x1 (nobody docked); the prize is not scaled; one guard flag; it fades with earlyMoney', () => {
  const GG = fresh(), G = GG.gig;
  const pay = (s, grade, p, extra) => { s.gig = G.makeGig(s, 'legion_63', 'card'); s.phase = 'gig';
    const r = Object.assign(G.simulate(s, s.gig, GG.RNG(3)), { grade, pay: p }, extra || {}); G.applyResult(s, r); return r; };
  const s = career(GG);
  eq(['S', 'A', 'B', 'C', 'D'].map(g => G.gradePayMult(s, g)), [1.25, 1.1, 1, 1, 1]);
  eq(['S', 'A', 'B', 'C', 'D'].map(g => pay(career(GG), g, 100).pay), [125, 110, 100, 100, 100]);
  const pr = pay(career(GG), 'S', 150, { prize: 50 }); eq(pr.pay, 175, 'BotB prize $50 unscaled'); ok(pr.diffPay && !('gradePaid' in pr), 'the existing diffPay flag guards it');
  eq(pay(career(GG), 'S', 100, { diffPay: true }).pay, 100, 'an already-paid result is never scaled twice');
  eq(Object.keys(pay(career(GG), 'S', 100)).sort(), Object.keys(pay(career(GG), 'B', 100)).sort(), 'grade pay adds no result field');
  eq([G.gradePayMult(atLocal(career(GG), 20, 50), 'S'), G.gradePayMult(atLocal(career(GG), 20, 50), 'A')], [1.25, 1.1], 'full until signed');
  const t = atSigned(GG, career(GG), 20, 40, 46); ok(Math.abs(G.gradePayMult(t, 'S') - 1.125) < 1e-9 && Math.abs(G.gradePayMult(t, 'A') - 1.05) < 1e-9, 'half faded 6 weeks after signing');
  t.totalWeek = 52; eq([G.gradePayMult(t, 'S'), G.gradePayMult(t, 'A')], [1, 1]);
  // the career difficulty still applies on top (chill x1.2)
  const c = career(GG, { careerDifficulty: 'chill' }); eq(pay(c, 'S', 100).pay, Math.round(125 * GG.difficulty.mul(c, 'money')));
});

test('until signed, then no cliff: full help through Local Heroes, a 12-week fade after signing (deal or DIY), gone 48 weeks after Local Heroes unsigned', () => {
  const GG = fresh(), G = GG.gig, W = GG.world, K = GG.career, E = GG.content.economy;
  eq([E.earlyTaper, E.earlyBackstop], [12, 48]);
  eq(K.earlyMoney(career(GG)), 1, 'garage era: full'); eq(K.earlyMoney(atLocal(career(GG), 22, 22)), 1, 'Local Heroes week: full');
  const vals = s => [K.earlyMoney(s), G.gradePayMult(s, 'S'), G.gradePayMult(s, 'A'), W.gasMult(s), W.gasFor(s, 'Regina')];
  // signing at week 40 (18 weeks after Local Heroes): full through the signing week, then down by 1/12 a week, 0 from week 52
  const walk = (mk, label) => {
    let prev = null;
    for (let w = 22; w <= 80; w++) {
      const v = vals(mk(w));
      if (w <= 40) eq(v[0], 1, label + ' week ' + w + ': full until signed');
      if (w >= 52) eq(v[0], 0, label + ' week ' + w + ': gone 12 weeks after signing');
      if (prev) ok(v[0] <= prev[0] && prev[0] - v[0] <= 1 / 12 + 1e-9 && v[1] <= prev[1] && prev[1] - v[1] <= 0.25 / 12 + 1e-9 && v[3] >= prev[3] && v[3] - prev[3] <= 0.2 / 12 + 1e-9,
        label + ' week ' + w + ': fades at most 1/12 a week, never up');
      prev = v;
    }
  };
  walk(w => w < 40 ? atLocal(career(GG), 22, w) : atSigned(GG, career(GG), 22, 40, w, 'deal'), 'deal');
  walk(w => w < 40 ? atLocal(career(GG), 22, w) : atSigned(GG, career(GG), 22, 40, w, 'diy'), 'DIY album');
  // an old save with only milestones.signed (no 'signed' eraHistory entry) reads the milestone
  const m = atLocal(career(GG), 22, 46, 'signed'); m.milestones.signed = 40; eq(K.earlyMoney(m), 0.5, 'milestones.signed fallback');
  // a signed era without any signing week: no help (never a stuck x1)
  eq(K.earlyMoney(atLocal(career(GG), 22, 46, 'signed')), 0, 'signed, no week: 0');
  // never signed: full for 36 weeks after Local Heroes, then down over 12, 0 from 48 weeks after
  const u = w => K.earlyMoney(atLocal(career(GG), 22, w));
  eq([u(58), u(64), u(70), u(200)], [1, 0.5, 0, 0], 'the backstop: Local Heroes + 36 .. + 48');
  // signing late, in the backstop fade, changes nothing that week (min of the two clocks: no jump either way)
  eq(K.earlyMoney(atSigned(GG, career(GG), 22, 64, 64)), 0.5, 'late signing: same value'); eq(K.earlyMoney(atSigned(GG, career(GG), 22, 64, 70)), 0, 'and still the backstop');
  // a Local Heroes era from an old save without the milestone uses the 'local' eraHistory week
  const o = career(GG); o.era = 'local'; o.eraHistory.push({ era: 'local', week: 22 }); o.totalWeek = 64; eq(K.earlyMoney(o), 0.5, 'eraHistory local fallback');
  const H = E.hustleEra; ok(H.local >= H.garage && H.signed >= H.local && H.world >= H.signed, 'Hustle never pays less in a later era');
});

test('M3 jam room: $35 a week until you sign, then $60, and the card + shop say so up front', () => {
  const GG = fresh(), S = GG.shop, s = career(GG);
  s.era = 'local'; s.milestones.localHeroes = s.totalWeek; s.fund = 40;
  const jam = S.spaceDef(s, 1); eq([jam.rent, jam.rentLater], [35, 60]);
  const row = S.spaces(s).find(x => x.tier === 1); eq([row.rent, row.rentLater, row.can], [35, 60, true], 'the shop row');
  const bills0 = GG.career.upkeep(s); ok(S.move(s, 1).ok, 'the first week\'s rent is $35'); eq(GG.career.upkeep(s) - bills0, 35, 'rent in the bills');
  eq(S.rent(s), 35);
  GG.career.setEra(s, 'signed'); eq([S.rent(s), S.spaceDef(s, 1).rentLater], [60, 0], 'signed: the normal $60');
  eq(GG.career.upkeep(s) - bills0, 60 + (GG.content.economy.eraUpkeep.signed - GG.content.economy.eraUpkeep.local));
  eq(S.spaceDef(s, 2).rent, 150, 'the pro studio is unchanged');
  const cards = GG.content.shopCards.concat(...Object.values(GG.content.bands).map(b => (b.shopCards || []))).filter(c => /^shop_space_1/.test(c.id));
  ok(cards.length >= 1, 'jam room cards ' + cards.length);
  cards.forEach(c => ok(/\$35 a week until you sign \(then \$60\)/.test(c.text) && /\$35/.test(c.choices[0].label) && /\$60 once signed/.test(c.choices[0].hint), c.id + ': honest price'));
});

// ---- M2 "Fair grades": GA has 30_audio's pure timeline so the string seats chart their own parts, like the browser ----
const GA = (() => { const g = fresh(); new Function('window', fs.readFileSync(path.join(__dirname, '..', 'src', '30_audio.js'), 'utf8'))({ GG: g }); return g; })();
const play = (seat, seed, diff, acc) => {
  const t = GA.career.newCareer({ seed: seed * 131, bandId: 'hail_damage', seat, player: { name: 'P' } }); t.phase = 'gig'; t.gig = GA.gig.makeGig(t, 'legion_63', 'book');
  const r = GA.gig.botPlay(GA.gig.session(t, t.gig, null, { emit: false, difficulty: diff }), { accuracy: acc, jitterMs: 40 }, GA.RNG(seed));
  GA.career.finishGig(t, r); return r;
};
test('M2 fair grades: drums and bass played at the same accuracy get the same grade and pay (paired seeds, Easy/Normal/Hard)', () => {
  const cells = [], pairs = [];
  for (const diff of ['easy', 'normal', 'hard']) for (const acc of [0.72, 0.84]) {
    const d = [], b = [];
    for (let seed = 1; seed <= 8; seed++) { const rd = play('drums', seed, diff, acc), rb = play('bass', seed, diff, acc); d.push(rd); b.push(rb); pairs.push([rd, rb]); }
    const m = (a, k) => a.reduce((t, r) => t + r[k], 0) / a.length;
    cells.push({ diff, acc, accD: m(d, 'accuracy'), accB: m(b, 'accuracy'), gap: m(d, 'score') - m(b, 'score') });
  }
  cells.forEach(c => { ok(Math.abs(c.accD - c.accB) < 0.02, c.diff + ' ' + c.acc + ': the same hit share ' + c.accD.toFixed(3) + ' / ' + c.accB.toFixed(3));
    ok(Math.abs(c.gap) <= 2, c.diff + ' ' + c.acc + ': drums - bass score ' + c.gap.toFixed(2) + ' (1.3.1: up to -3.2)'); });
  const mean = cells.reduce((t, c) => t + c.gap, 0) / cells.length;
  ok(Math.abs(mean) <= 1, 'mean drums - bass score ' + mean.toFixed(2) + ' (1.3.1: -2.1 on these cells)');
  const same = pairs.filter(([x, y]) => x.grade === y.grade);
  ok(same.length / pairs.length >= 0.8, 'same grade in ' + same.length + '/' + pairs.length + ' pairs');
  same.forEach(([x, y]) => eq(x.pay, y.pay, 'same grade, same room: the same pay on either seat (' + x.grade + ')'));
  // the grade -> pay rule has no seat in it: an A at the Legion pays the same on all four seats
  const pays = GA.contracts.SEATS.map(seat => { const t = GA.career.newCareer({ seed: 5, bandId: 'hail_damage', seat, player: { name: 'P' } });
    t.gig = GA.gig.makeGig(t, 'legion_63', 'card'); t.phase = 'gig'; const r = Object.assign(GA.gig.simulate(t, t.gig, GA.RNG(2)), { grade: 'A' }); GA.gig.applyResult(t, r); return r.pay; });
  eq(new Set(pays).size, 1, 'pay by grade on every seat: ' + pays);
});

test('M2: Simulate (your own average) uses the same rule: a drum and a bass log at the same accuracy simulate to the same grade band', () => {
  const sim = (seat, seed) => { const t = GA.career.newCareer({ seed: seed * 17, bandId: 'hail_damage', seat, player: { name: 'P' } }); t.phase = 'gig'; t.gig = GA.gig.makeGig(t, 'legion_63', 'book');
    t.playLog = [0.8, 0.82].map((acc, i) => ({ acc, ps: 0.8, seat, diff: 'normal', wk: i + 1 }));
    const S = GA.gig.session(t, t.gig, null, { emit: false, difficulty: 'normal' }); return GA.gig.simShow(S, GA.gig.simBot(t, 'normal')); };
  const d = [], b = [];
  for (let seed = 1; seed <= 6; seed++) { d.push(sim('drums', seed)); b.push(sim('bass', seed)); }
  const m = (a, k) => a.reduce((t, r) => t + r[k], 0) / a.length;
  ok(Math.abs(m(d, 'accuracy') - m(b, 'accuracy')) < 0.03, 'both land on the logged 81%: ' + m(d, 'accuracy').toFixed(3) + ' / ' + m(b, 'accuracy').toFixed(3));
  ok(Math.abs(m(d, 'score') - m(b, 'score')) <= 2, 'simulated score drums ' + m(d, 'score').toFixed(1) + ' vs bass ' + m(b, 'score').toFixed(1));
});

done('sim_money');
