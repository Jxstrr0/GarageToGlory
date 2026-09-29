// Drama sim tests (v0.4): garage-era protection, grievance stages (never skipping, recovering), pay the band, ultimatums,
// quits -> holes -> fill-ins -> recruit ads -> hires, returns (empty slot, filled slot -> rival), exit beats, guilt repay,
// traits, quirk cards, bots, determinism and the v3 -> v4 migration. Run: node tests/sim_drama.test.js
const load = require('./_load');
const { test, ok, eq, done } = require('./_t');
const fs = require('fs'), path = require('path');
const AUTO = { autoGig: true };

function fresh(noCards) {
  const GG = load({ localStorage: load.fakeStorage() });
  if (noCards) GG.content.cards = [];
  return GG;
}
function career(GG, seed) { return GG.career.newCareer({ seed: seed || 4242, player: { name: 'Pat' } }); }
const mem = (s, id) => s.members.find(m => m.id === id);
// One week with a fixed plan; `before(s)` runs right before the wrap (to force moods), choice picks the card choice.
function week(GG, s, o) {
  o = o || {};
  const r = GG.career.startWeek(s);
  if (r.card) GG.career.resolveCard(s, o.choice != null ? o.choice : 0);
  GG.career.setPlan(s, o.plan || ['rest', 'rest', 'rest']);
  GG.career.runWeek(s, AUTO);
  if (o.before) o.before(s);
  return GG.career.endWeek(s);
}
// Unprotected career at `fans` with no normal Monday cards (drama cards still force themselves).
function open(GG, fans) {
  const s = career(GG);
  week(GG, s); s.gig = null;
  s.fans = fans || 400; s.protected = false; s.milestones.localHeroes = s.totalWeek;
  return s;
}
function forceUltimatum(GG, s, id) {
  const m = mem(s, id); m.stage = 3; m.ultimatum = s.totalWeek; m.mood = 20;
  const r = GG.career.startWeek(s);
  return r.card;
}

test('protection holds below 250 fans (no ultimatum, no quit, no breakdown) and ends at 250', () => {
  const GG = fresh(), s = career(GG, 7), ends = [], stages = [];
  GG.on('protection:ended', () => ends.push(s.totalWeek));
  GG.on('member:stage', e => stages.push(e.stage));
  for (let i = 0; i < 40; i++) {
    s.fans = Math.min(s.fans, 120); s.van.condition = 0;
    GG.career.botWeek(s, 'avg');
    s.members.forEach(m => { m.mood = 5; });
    ok(s.protected && s.members.length === 4 && s.members.every(m => m.status === 'active' && (m.stage || 0) <= 2), 'protected week ' + s.totalWeek);
    ok(!(s.card && /^ult_/.test(s.card.id)), 'no ultimatum card while protected');
  }
  eq([s.van.breakdowns, ends.length, Math.max(...stages)], [0, 0, 2], 'no breakdowns, still protected, stages capped at 2');
  eq(GG.world.breakdownChance(s, 200), 0);
  GG.career.startWeek(s); GG.career.setPlan(s, ['rest', 'rest', 'rest']); GG.career.runWeek(s, AUTO);
  s.fans = 260;
  const w = GG.career.endWeek(s);
  ok(!s.protected && ends.length === 1 && w.protectionEnded, 'protection ended at 250 fans');
  ok(w.milestones.some(t => /Local heroes on the horizon/.test(t)), 'the "Local heroes on the horizon" milestone');
  ok(GG.world.breakdownChance(s, 200) > 0, 'breakdowns can fire now');
  ok(s.members.every(m => m.stage <= 2), 'no member jumps to an ultimatum the week protection ends');
});

test('escalation steps one stage a week (warnings first), the ultimatum is a forced card, and moods recover', () => {
  const GG = fresh(true), s = open(GG), seq = [];
  GG.on('member:stage', e => { if (e.id === 'marcel') seq.push(e.stage); });
  const wraps = [];
  for (let i = 0; i < 3; i++) wraps.push(week(GG, s, { before: st => { mem(st, 'marcel').mood = 8; } }));
  eq(seq, [1, 2, 3], 'grumbling -> passive-aggressive -> ultimatum, one per week');
  eq(wraps.map(w => (w.warnings.find(x => x.id === 'marcel') || {}).stage), [1, 2, 3]);
  ok(/Marcel is grumbling about/.test(wraps[0].warnings[0].text) && /passive-aggressive/.test(wraps[1].warnings.find(x => x.id === 'marcel').text), 'wrap warnings');
  ok(wraps[1].chat.some(m => m.who === 'marcel' && m.tone === 'pa'), 'a passive-aggressive group-chat message');
  const r = GG.career.startWeek(s);
  eq([r.card && r.card.id, s.card.who, s.phase], ['ult_marcel', 'marcel', 'monday'], 'forced ultimatum next Monday');
  GG.career.resolveCard(s, 0);
  eq([mem(s, 'marcel').stage, mem(s, 'marcel').status], [2, 'active'], 'a fix steps the stage back one');
  GG.career.setPlan(s, ['rest', 'rest', 'rest']); GG.career.runWeek(s, AUTO); mem(s, 'marcel').mood = 90; GG.career.endWeek(s);
  week(GG, s, { before: st => { mem(st, 'marcel').mood = 90; } });
  week(GG, s, { before: st => { mem(st, 'marcel').mood = 90; } });
  eq(seq, [1, 2, 3, 2, 1, 0], 'recovers one step a week');
  for (let i = 1; i < seq.length; i++) ok(Math.abs(seq[i] - seq[i - 1]) === 1, 'never skips a stage');
});

test('long careers: every stage change is one step and every quit follows an ultimatum', () => {
  for (const style of ['avg', 'good']) {
    const GG = fresh(), s = career(GG, 99), last = {}, bad = [];
    GG.on('member:stage', e => { const p = last[e.id] || 0; if (Math.abs(e.stage - p) !== 1) bad.push(e.id + ' ' + p + '->' + e.stage + ' w' + s.totalWeek); last[e.id] = e.stage; });
    GG.on('member:return', e => { last[e.id] = 0; });
    GG.on('recruit:hired', e => { last[e.member.id] = 0; });
    while (!s.ended) GG.career.botWeek(s, style);
    eq(bad, [], style + ': stage jumps');
    ok(s.stats.quits <= s.stats.ultimatums, style + ': quits ' + s.stats.quits + ' <= ultimatums ' + s.stats.ultimatums);
  }
});

test('pay the band moves moods both ways; members take their cut of gig pay', () => {
  const avgMood = s => s.members.reduce((t, m) => t + m.mood, 0) / s.members.length;
  const GG = fresh(true), base = open(GG), res = {};
  for (const cut of [0, 0.3, 0.6]) {
    const s = JSON.parse(JSON.stringify(base));
    eq(GG.drama.setPayCut(s, cut), cut);
    for (let i = 0; i < 6; i++) week(GG, s, { plan: ['rehearse', 'rest', 'book'] });
    res[cut] = avgMood(s);
  }
  ok(res[0] < res[0.3] - 3 && res[0.6] > res[0.3] + 3, 'moods: ' + JSON.stringify(res));
  eq(GG.drama.setPayCut(base, 0.93), 0.6, 'clamped to 60%'); eq(GG.drama.setPayCut(base, 0.312), 0.3, 'steps of 5%');
  eq(GG.drama.split(base, 200), { cut: 60, band: 140 });
});

test('ultimatum choices resolve: fixes settle at a cost, refusing quits (originals start an exit storyline)', () => {
  for (const id of ['marcel', 'dana', 'jaxon', 'kenji']) {
    const GG = fresh(true), s = open(GG), quits = [];
    GG.on('member:quit', e => quits.push(e.id));
    const c = forceUltimatum(GG, s, id);
    eq(c.id, 'ult_' + id);
    const a = JSON.parse(JSON.stringify(s));
    const fix = GG.career.resolveCard(a, 0);
    ok(mem(a, id).stage === 2 && mem(a, id).status === 'active' && fix.deltas.member[0].act === 'settle', id + ' settles');
    const q = c.choices.findIndex(ch => ch.effects.member.act === 'quit');
    const res = GG.career.resolveCard(s, q), m = mem(s, id), ex = GG.content.drama.members[id].exit;
    eq([m.status, m.stage, quits, s.stats.quits, res.deltas.member[0].act], [ex.away ? 'away' : 'quit', 4, [id], 1, 'quit']);
    ok(m.exit.returnDue - s.totalWeek >= ex.returnAfter[0] && m.exit.returnDue - s.totalWeek <= ex.returnAfter[1], 'return due in range');
    eq(GG.drama.holes(s), [m.role]);
    ok(/quits!/.test(GG.career.choiceHint(s, c.choices[q])), 'hint says they quit');
  }
});

test('quit -> hole penalty at gigs -> fill-in (cost per gig) -> post an ad (3 candidates) -> re-post -> hire', () => {
  const GG = fresh(true), s = open(GG), hired = [];
  GG.on('recruit:hired', e => hired.push(e.member.id));
  const set = GG.songs.best(s, 3), fit = 1;
  const full = GG.gig.performance(s, set, fit);
  forceUltimatum(GG, s, 'dana'); GG.career.resolveCard(s, 2);
  const hole = GG.gig.performance(s, set, fit);
  ok(hole < full - 8, 'a hole costs score: ' + full.toFixed(1) + ' -> ' + hole.toFixed(1));
  eq(GG.drama.gigMods(s).open, 1);
  GG.drama.hireFillIn(s, 'lead guitar');
  const fill = GG.gig.performance(s, set, fit);
  ok(fill > hole && fill < full + 1, 'a fill-in covers most of it: ' + fill.toFixed(1));
  ok(GG.drama.lineup(s).some(m => m.fillIn && m.role === 'lead guitar'), 'fill-in plays (lineup)');
  s.gig = GG.gig.makeGig(s, 'legion_63', 'book'); s.fund = 500;
  const r = GG.gig.autoResolve(s, GG.rngFor(s));
  eq([r.fillInCost, s.fund], [40, 500 + r.pay - r.cut - r.gas - 40], 'fill-in paid per gig');
  s.fund = 100;
  const ad = GG.drama.postAd(s, 'lead guitar');
  eq([s.fund, ad.role, ad.candidates.length, ad.posts], [70, 'lead guitar', 3, 1]);
  const traits = GG.content.recruits.traits.map(t => t.id), towns = GG.content.recruits.hometowns.canada;
  ad.candidates.forEach(c => ok(c.stars >= 1 && c.stars <= 5 && c.chemistry >= 0 && c.chemistry <= 100 && traits.includes(c.trait)
    && GG.drama.quirk(c.quirk) && towns.includes(c.hometown) && c.askingCut >= 0.1 && c.askingCut <= 0.45 && c.name && c.look && c.look.skin, 'candidate ' + JSON.stringify(c).slice(0, 80)));
  eq(new Set(ad.candidates.map(c => c.trait)).size, 3, 'three different traits');
  const before = JSON.stringify(ad.candidates);
  GG.drama.repost(s);
  ok(s.fund === 50 && s.recruitAd.posts === 2 && JSON.stringify(s.recruitAd.candidates) !== before, 're-post costs $20 and changes them');
  s.fund = 10; eq(GG.drama.repost(s), null, "can't re-post when broke");
  const pick = s.recruitAd.candidates[1], m = GG.drama.hire(s, 1);
  eq([m.role, m.original, m.status, m.recruit.trait, m.recruit.quirk, hired, GG.drama.holes(s), s.recruitAd, s.fillIns],
    ['lead guitar', false, 'active', pick.trait, pick.quirk, [m.id], [], null, {}]);
  eq(GG.drama.gigMods(s).open, 0);
});

test('returns: empty slot -> return card; filled slot -> keep the recruit (original joins the rival) or take them back', () => {
  const GG = fresh(true), s = open(GG);
  forceUltimatum(GG, s, 'marcel'); GG.career.resolveCard(s, 2); GG.career.setPlan(s, ['rest', 'rest', 'rest']); GG.career.runWeek(s, AUTO); GG.career.endWeek(s);
  const m = mem(s, 'marcel'), skill0 = m.skill, beats = [];
  for (let w = 0; w < 5; w++) { const wr = week(GG, s); beats.push(...wr.drama); }
  ok(beats.length >= 1 && s.chat.some(c => c.tone === 'news'), 'exit storyline beats reach the chat: ' + beats[0]);
  m.exit.returnDue = s.totalWeek;
  const r = GG.career.startWeek(s);
  eq(r.card.id, 'ret_marcel');
  GG.career.resolveCard(s, 0);
  eq([m.status, m.stage, m.skill, s.stats.returns, GG.drama.holes(s)], ['active', 0, skill0 + 5, 1, []]);
  ok(/Quebec/.test(m.changed), 'comes back changed');
  // Dana quits, a recruit fills her slot, she comes back: keep the recruit
  const t = open(fresh(true)), G2 = fresh(true);
  forceUltimatum(G2, t, 'dana'); G2.career.resolveCard(t, 2);
  t.fund = 500; G2.drama.postAd(t, 'lead guitar'); const rec = G2.drama.hire(t, 0);
  G2.career.setPlan(t, ['rest', 'rest', 'rest']); G2.career.runWeek(t, AUTO); G2.career.endWeek(t);
  mem(t, 'dana').exit.returnDue = t.totalWeek;
  const k = JSON.parse(JSON.stringify(t));
  const c = G2.career.startWeek(t).card;
  eq([c.id, t.card.who], ['ret_dana_filled', rec.id]);
  ok(G2.career.fillText(t, c.text).includes(rec.name.split(' ')[0]), '{recruit} names the recruit');
  G2.career.resolveCard(t, 1);
  eq([t.rivalDefectors, mem(t, 'dana').status, mem(t, 'dana').exit.storyline, mem(t, rec.id).status], [['dana'], 'quit', 'rival', 'active']);
  ok(G2.drama.rivalBlurb(t).includes('Now featuring Dana'), 'shown in the rival blurb');
  for (let i = 0; i < 30; i++) week(G2, t);
  ok(mem(t, 'dana').status === 'quit', 'a defector never returns');
  // ...or take the original back: the recruit leaves
  G2.career.startWeek(k); G2.career.resolveCard(k, 0);
  eq([mem(k, 'dana').status, !!mem(k, rec.id), k.rivalDefectors], ['active', false, []]);
});

test('Kenji vanishes (away) and walks back in on his own when his corner is empty', () => {
  const GG = fresh(true), s = open(GG), back = [];
  GG.on('member:return', e => back.push(e.id));
  forceUltimatum(GG, s, 'kenji'); GG.career.resolveCard(s, 2);
  eq(mem(s, 'kenji').status, 'away');
  mem(s, 'kenji').exit.returnDue = s.totalWeek + 2;
  const cards = [];
  for (let i = 0; i < 4; i++) { const w = week(GG, s); if (s.wrap && w.drama.length) cards.push(...w.drama); }
  eq([back, mem(s, 'kenji').status], [['kenji'], 'active']);
  ok(cards.some(t => /corner/.test(t)), 'back line in the wrap');
});

test('recruit ultimatum: a recruit who quits just leaves (no storyline); Reliable never gets an ultimatum', () => {
  const GG = fresh(true), s = open(GG);
  forceUltimatum(GG, s, 'jaxon'); GG.career.resolveCard(s, 2);
  s.fund = 500; GG.drama.postAd(s, 'rhythm guitar');
  s.recruitAd.candidates[0].trait = 'showboat';
  const rec = GG.drama.hire(s, 0);
  GG.career.setPlan(s, ['rest', 'rest', 'rest']); GG.career.runWeek(s, AUTO); GG.career.endWeek(s);
  const c = forceUltimatum(GG, s, rec.id);
  eq([c.id, s.card.who], ['ult_recruit', rec.id]);
  ok(GG.career.fillText(s, c.title).startsWith(rec.name.split(' ')[0]), 'title names them');
  const res = GG.career.resolveCard(s, 2);
  ok(!mem(s, rec.id) && res.outcome.includes(rec.name.split(' ')[0]) && GG.drama.holes(s).includes('rhythm guitar'), 'gone, named in the outcome');
  const rel = { id: 'relx', name: 'Rae Reliable', role: 'rhythm guitar', skill: 40, mood: 5, status: 'active', original: false, stage: 0, recruit: { trait: 'reliable', askingCut: 0.2 } };
  s.members.push(rel);
  GG.career.setPlan(s, ['rest', 'rest', 'rest']); GG.career.runWeek(s, AUTO); GG.career.endWeek(s);
  for (let i = 0; i < 5; i++) week(GG, s, { before: st => { mem(st, 'relx').mood = 5; } });
  eq(mem(s, 'relx').stage, 2, 'Reliable caps at passive-aggressive');
});

test('traits have real effects; quirk cards show up with {recruit}', () => {
  const GG = fresh(true), s = open(GG);
  forceUltimatum(GG, s, 'dana'); GG.career.resolveCard(s, 2);
  s.fund = 500; GG.drama.postAd(s, 'lead guitar');
  Object.assign(s.recruitAd.candidates[0], { trait: 'local_legend', quirk: 'ferret' });
  const fans = s.fans, m = GG.drama.hire(s, 0);
  eq(s.fans, fans + 20, 'Local Legend: +20 fans on day one');
  ok(GG.drama.gigMods(s).fansMult > 1, 'Local Legend: more fans per gig');
  m.recruit.trait = 'hype_machine'; s.buzz = 10;
  GG.career.setPlan(s, ['rest', 'rest', 'rest']); GG.career.runWeek(s, AUTO); GG.career.endWeek(s);
  ok(s.buzz >= 10, 'Hype Machine offsets buzz decay (' + s.buzz + ')');
  m.recruit.trait = 'showboat'; ok(GG.drama.gigMods(s).score === 4, 'Showboat +4 score');
  const seen = [];
  for (let i = 0; i < 60 && seen.length < 2; i++) {
    GG.career.startWeek(s);
    if (s.card && /^qk_ferret/.test(s.card.id)) { seen.push(s.card.id); ok(GG.career.fillText(s, GG.career.currentCard(s).text).includes(m.name.split(' ')[0]), 'token'); }
    if (s.card && !s.card.resolved) GG.career.resolveCard(s, 0);
    GG.career.setPlan(s, ['rest', 'rest', 'rest']); GG.career.runWeek(s, AUTO); GG.career.endWeek(s);
  }
  ok(seen.length >= 1, 'a ferret quirk card was forced: ' + seen);
});

test("guilt cards repay the parents' loan (never by borrowing); paying it off ends the guilt", () => {
  const GG = fresh(), s = career(GG, 3);
  s.flags.parentsLoan = true; s.debtToParents = 300; s.fund = 500;
  const g = GG.content.cards.filter(c => c.id.startsWith('guilt_'));
  ok(g.length >= 5 && g.every(c => GG.career.gatePasses(s, c.gate)), 'guilt cards eligible while you owe');
  let d = GG.career.applyEffects(s, { repay: 100 }, {});
  eq([s.debtToParents, s.fund, d.repay, d.fund], [200, 400, 100, -100]);
  s.fund = 150; d = GG.career.applyEffects(s, { repay: 100 }, {});
  eq([s.debtToParents, s.fund, d.repay], [150, 100, 50], 'keeps the cushion');
  s.fund = 1000; GG.career.applyEffects(s, { repay: 300 }, {});
  eq([s.debtToParents, s.fund, !!s.flags.parentsLoan], [0, 850, false], 'paid off: the flag clears');
  ok(!g.some(c => GG.career.gatePasses(s, c.gate)), 'no more guilt cards');
  eq(GG.career.effectSummary({ repay: 100 }, s), 'Pay back $100');
});

test('bots: fill holes (ad + hire), the good bot pays more when the band is upset; avg refuses some ultimatums', () => {
  for (const style of ['avg', 'good']) {
    const GG = fresh(true), s = open(GG);
    forceUltimatum(GG, s, 'dana'); GG.career.resolveCard(s, 2);
    s.fund = 800; mem(s, 'marcel').stage = 1;
    GG.drama.botWeek(s, style);
    ok(GG.drama.holes(s).length === 0 && s.members.some(m => !m.original && m.role === 'lead guitar'), style + ' hired');
    if (style === 'good') eq(s.payCut, 0.4);
  }
  const GG = fresh(true), s = open(GG), card = forceUltimatum(GG, s, 'marcel');
  eq(card.choices[GG.career.botChoice(s, card, 'good')].effects.member.act, 'settle', 'the good bot settles');
  let refuse = 0;
  for (let i = 0; i < 200; i++) { s.rng = i + 1; if (GG.career.botChoice(s, card, 'avg') === 2) refuse++; }
  ok(refuse > 60 && refuse < 160, 'avg refuses sometimes: ' + refuse + '/200');
});

test('determinism: same seed => identical 240-week career with drama; no Math.random/Date/DOM in 27_sim_drama', () => {
  const play = seed => { const GG = fresh(); const s = career(GG, seed); while (!s.ended) GG.career.botWeek(s, 'avg'); return s; };
  const rnd = Math.random, now = Date.now;
  Math.random = () => { throw new Error('Math.random used in a sim'); };
  Date.now = () => { throw new Error('Date.now used in a sim'); };
  try {
    const a = play(31), b = play(31);
    eq(JSON.stringify(a) === JSON.stringify(b), true, 'same seed');
    ok(a.stats.ultimatums >= 1, 'drama happened: ' + a.stats.ultimatums + ' ultimatums, ' + a.stats.quits + ' quits');
    ok(JSON.stringify(play(32)) !== JSON.stringify(a), 'different seed');
  } finally { Math.random = rnd; Date.now = now; }
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', '27_sim_drama.js'), 'utf8');
  ok(!/Math\.random|\bDate\b|document\.|window\.(?!GG)/.test(src), '27_sim_drama.js is pure');
});

test('migration v3 -> v4: drama defaults for old saves, idempotent; save codes round-trip drama state', () => {
  const GG = fresh(), s = career(GG, 11);
  for (let i = 0; i < 6; i++) GG.career.botWeek(s, 'avg');
  const old = JSON.parse(JSON.stringify(s));
  old.v = 3; delete old.payCut; delete old.fillIns; delete old.recruitAd; delete old.rivalDefectors;
  old.members.forEach(m => { delete m.stage; delete m.want; delete m.exit; });
  ['quits', 'returns', 'recruits', 'ultimatums'].forEach(k => delete old.stats[k]);
  const m = GG.save.migrate(JSON.parse(JSON.stringify(old)));
  eq([m.v, m.payCut, m.fillIns, m.recruitAd, m.rivalDefectors, m.stats.quits], [GG.contracts.SAVE_SCHEMA, 0.3, {}, null, [], 0]);
  ok(GG.contracts.SAVE_SCHEMA === 5 && m.members.every(x => x.stage === 0 && x.exit === null && x.want === null), 'member defaults');
  eq(JSON.stringify(GG.save.migrate(JSON.parse(JSON.stringify(m)))), JSON.stringify(m), 'idempotent');
  GG.career.botWeek(m, 'avg');
  const t = open(GG); forceUltimatum(GG, t, 'dana'); GG.career.resolveCard(t, 2); t.fund = 300; GG.drama.postAd(t, 'lead guitar');
  const back = GG.save.fromCode(GG.save.toCode(t));
  eq(JSON.stringify(back.recruitAd), JSON.stringify(t.recruitAd)); eq(back.members.find(x => x.id === 'dana').exit, t.members.find(x => x.id === 'dana').exit);
});

done('sim_drama');
