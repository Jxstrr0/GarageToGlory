// Career sim tests: draw order, chains, gates, every effect key, activities, wrap, bots over a full career.
// Fixture cards are injected into GG.content so these tests don't depend on the CONTENT agent's deck.
const load = require('./_load');
const { test, ok, eq, done } = require('./_t');
const fs = require('fs'), path = require('path');

function fresh(cards) {
  const GG = load({ localStorage: load.fakeStorage() });
  if (cards) GG.content.cards = cards;
  return GG;
}
const AUTO = { autoGig: true };   // v0.3: play booked gigs automatically (no rhythm game in node)
const ch = (effects, outcome, extra) => Object.assign({ label: 'x', effects, outcome: outcome || 'ok' }, extra || {});
const FORCE = { id: 'fx_force', type: 'drama', title: 'F', text: 't', forceWeek: 1, gate: { band: ['hail_damage'] },
  choices: [ch({ mood: { marcel: 5 } }), ch({ mood: { marcel: -5 } })] };
const CAPE = [
  { id: 'fx_c1', type: 'drama', chain: 'cape', step: 1, title: 'c1', text: 't', choices: [
    ch({ fund: -120, flags: { cape: 'velvet' }, chain: { cape: { step: 2, delay: 2 } } }),
    ch({ flags: { cape: 'curtain' }, chain: { cape: { step: 2 } } }),
    ch({ chain: { cape: { step: 'end' } } })] },
  { id: 'fx_c2v', type: 'drama', chain: 'cape', step: 2, gate: { flagEquals: { cape: 'velvet' } }, title: 'c2v', text: 't',
    choices: [ch({ chain: { cape: { step: 3 } } }), ch({ chain: { cape: { step: 'end' } } })] },
  { id: 'fx_c2c', type: 'drama', chain: 'cape', step: 2, gate: { flagEquals: { cape: 'curtain' } }, title: 'c2c', text: 't',
    choices: [ch({ chain: { cape: { step: 3 } } })] },
  { id: 'fx_c3', type: 'drama', chain: 'cape', step: 3, title: 'c3', text: 't', choices: [
    ch({ buzz: 2 }, 'You spin.', { roll: { chance: 0.5, stat: 'chemistry', statScale: 0.01,
      success: { effects: { fans: 10 }, outcome: 'Trademark move.' }, fail: { effects: { flags: { cape: 'charred' } }, outcome: 'Fire.' } } }),
    ch({})] }
];
// A repeatable deck for long runs: money, moods, rolls, flags, books, chat, a gated guilt card.
const LONG = [FORCE].concat(CAPE, [
  { id: 'fx_gear', type: 'money', once: false, cooldown: 3, title: 'g', text: 't',
    choices: [ch({ fund: -150, skill: { dana: 3 }, mood: { dana: 10 } }), ch({ mood: { dana: -8 } })] },
  { id: 'fx_radio', type: 'fame', once: false, cooldown: 5, gate: { minFans: 30 }, title: 'r', text: 't',
    choices: [ch({ fans: 20, buzz: 8, burnout: 5, chat: { who: 'kenji', text: '👍' } }), ch({ buzz: -2 })] },
  { id: 'fx_hall', type: 'scene', once: false, cooldown: 4, title: 'h', text: 't',
    choices: [ch({ book: 'st_vlads_hall', chemistry: 3 }), ch({ drumSkill: 2, burnout: 3 })] },
  { id: 'fx_moose', type: 'weird', once: false, cooldown: 6, title: 'm', text: 't',
    choices: [ch({}, 'You go.', { roll: { chance: 0.5, success: { effects: { fans: 25 } }, fail: { effects: { fund: -100 } } } }), ch({ mood: { all: -2 } })] },
  { id: 'fx_guilt', type: 'drama', once: false, cooldown: 8, gate: { flags: ['parentsLoan'] }, title: 'gu', text: 't',
    choices: [ch({ mood: { all: -3 }, flags: { parentsLoan: false } }), ch({ burnout: 5 })] }
]);
function week(GG, s, plan, choice) {
  const r = GG.career.startWeek(s);
  if (r.card) GG.career.resolveCard(s, choice || 0);
  GG.career.setPlan(s, plan || ['rest', 'rest', 'rest']);
  GG.career.runWeek(s, AUTO);
  return GG.career.endWeek(s);
}
function inRanges(GG, s) {
  const C = GG.contracts;
  for (const k of C.STATS) {
    if (!isFinite(s[k])) return k + ' not finite';
    const r = C.RANGES[k];
    if (r && (s[k] < r[0] || s[k] > r[1])) return k + ' out of range ' + s[k];
  }
  for (const m of s.members) for (const k of C.MEMBER_STATS) {
    const r = C.RANGES[k];
    if (!isFinite(m[k]) || m[k] < r[0] || m[k] > r[1]) return m.id + '.' + k + ' = ' + m[k];
  }
  return null;
}

test('newCareer: garage start, fallback roster, week one pre-booked at Buddy\'s', () => {
  const GG = fresh([]);
  const s = GG.career.newCareer({ seed: 5, slot: '1', player: { name: 'Pat', nick: 'Sticks', presetId: 'nope' } });
  eq(s.members.map(m => m.id).sort(), ['dana', 'jaxon', 'kenji', 'marcel']);
  ok(s.members.every(m => m.status === 'active' && m.original));
  eq([s.totalWeek, s.year, s.week, s.phase, s.era, s.protected, s.slot, s.v], [1, 1, 1, 'monday', 'garage', true, '1', GG.contracts.SAVE_SCHEMA]);
  const E = GG.content.economy;
  eq([s.fund, s.fans, s.buzz, s.chemistry, s.burnout, s.drumSkill], [E.startFund, E.startFans, E.startBuzz, E.startChemistry, E.startBurnout, E.startDrumSkill]);
  ok(s.songs.length >= 2 && s.songs.every(x => GG.songs.validate(x.pattern, s.gear).length === 0 && x.rating && x.title && x.plays === 0), 'starter songs');
  eq([s.pendingSongs, s.draft, s.gear], [[], null, { lanes: 4, doubleKick: false }], 'v0.2 fields');
  eq([s.gig.venueId, s.gig.source, s.gig.deal, s.gig.capacity], ['buddys_house_party', 'forced', 'exposure', 15]);
  ok(s.player.look && s.player.kitColor && s.player.name === 'Pat');
  const t = GG.career.newCareer({ player: { name: 'Pat' } });
  eq(t.seed, GG.hashSeed('Pat|hail_damage'), 'seed defaults to a hash of name + band');
});

test('forced week-1 card, idempotent startWeek, quiet weeks never in weeks 1-2', () => {
  const GG = fresh([FORCE, { id: 'fx_n', type: 'money', once: false, title: 'n', text: 't', choices: [ch({}), ch({})] }]);
  GG.content.economy.quietWeekChance = 1;
  const s = GG.career.newCareer({ seed: 9 });
  let starts = 0; GG.on('week:start', () => starts++);
  const a = GG.career.startWeek(s), rng = s.rng;
  eq(a.card.id, 'fx_force'); eq(s.phase, 'monday');
  const b = GG.career.startWeek(s);
  eq(b.card.id, 'fx_force'); eq(s.rng, rng, 'no rng use on re-call'); eq(starts, 1, 'week:start once');
  GG.career.resolveCard(s, 0);
  eq(GG.career.startWeek(s).card, null, 'resolved card is not returned again');
  GG.career.runWeek(s, AUTO); GG.career.endWeek(s);
  eq(GG.career.startWeek(s).card.id, 'fx_n', 'week 2 always has a card');
  GG.career.resolveCard(s, 0); GG.career.runWeek(s, AUTO); GG.career.endWeek(s);
  const w3 = GG.career.startWeek(s);
  eq(w3.card, null, 'week 3 quiet at chance 1'); ok(w3.quiet && s.quiet, 'quiet line'); eq(s.phase, 'plan');
});

test('chain: step 1 starts it, due/delay respected, flag-gated branch, roll, auto-end', () => {
  const GG = fresh(CAPE.slice());
  GG.content.economy.quietWeekChance = 0;
  const s = GG.career.newCareer({ seed: 11 });
  eq(GG.career.startWeek(s).card.id, 'fx_c1', 'only step 1 is eligible');
  const fund = s.fund;
  const r = GG.career.resolveCard(s, 0);
  eq(s.fund, fund - 120); eq(s.flags.cape, 'velvet'); eq(s.chains.cape, { step: 2, due: 3 }); eq(r.deltas.fund, -120);
  GG.career.runWeek(s, AUTO); GG.career.endWeek(s);                 // week 2
  eq(GG.career.startWeek(s).card, null, 'week 2: chain not due, nothing else eligible');
  GG.career.runWeek(s, AUTO); GG.career.endWeek(s);                 // week 3
  eq(GG.career.startWeek(s).card.id, 'fx_c2v', 'due at week 3, velvet branch');
  GG.career.resolveCard(s, 0);
  eq(s.chains.cape, { step: 3, due: 4 });
  GG.career.runWeek(s, AUTO); GG.career.endWeek(s);
  eq(GG.career.startWeek(s).card.id, 'fx_c3');
  const res = GG.career.resolveCard(s, 0);
  ok(res.success === true || res.success === false, 'roll reports success');
  ok(res.deltas.buzz >= 2 || s.buzz === 100, 'choice-level effect always applies');
  ok(res.success ? res.deltas.fans === 10 : s.flags.cape === 'charred', 'branch effect applied');
  ok(res.outcome.indexOf('You spin.') === 0, 'outcome = choice outcome + branch outcome');
  eq(s.chains.cape.step, 'end', 'no step 4 exists: chain auto-ends');
  GG.career.runWeek(s, AUTO); GG.career.endWeek(s);
  eq(GG.career.startWeek(s).card, null, 'ended chain draws nothing');
});

test('chain: curtain branch; end choice ends it; stale chains end', () => {
  const GG = fresh(CAPE.slice());
  GG.content.economy.quietWeekChance = 0;
  const s = GG.career.newCareer({ seed: 12 });
  GG.career.startWeek(s); GG.career.resolveCard(s, 1);
  GG.career.runWeek(s, AUTO); GG.career.endWeek(s);
  eq(GG.career.startWeek(s).card.id, 'fx_c2c', 'curtain branch at delay 1');
  const s2 = GG.career.newCareer({ seed: 13 });
  GG.career.startWeek(s2); GG.career.resolveCard(s2, 2);
  eq(s2.chains.cape.step, 'end');
  const s3 = GG.career.newCareer({ seed: 14 });
  s3.chains.gone = { step: 2, due: 1 };
  s3.totalWeek = 1 + GG.content.economy.chainStaleWeeks + 1;
  GG.career.startWeek(s3);
  eq(s3.chains.gone.step, 'end', 'stale chain ended');
});

test('once cards never repeat; cooldown respected; forced cards never drawn randomly', () => {
  const GG = fresh([{ id: 'fx_cd', type: 'money', once: false, cooldown: 2, title: 'c', text: 't', choices: [ch({}), ch({})] },
    { id: 'fx_once', type: 'money', weight: 0.0001, title: 'o', text: 't', choices: [ch({}), ch({})] },
    Object.assign({}, FORCE, { id: 'fx_f9', forceWeek: 9 })]);
  GG.content.economy.quietWeekChance = 0;
  const s = GG.career.newCareer({ seed: 3 });
  const seen = [];
  for (let i = 0; i < 12; i++) { const c = GG.career.startWeek(s).card; seen.push(c ? c.id : '-'); if (c) GG.career.resolveCard(s, 0); GG.career.runWeek(s, AUTO); GG.career.endWeek(s); }
  eq(seen.filter(x => x === 'fx_once').length <= 1, true, 'once');
  const cd = seen.map((x, i) => x === 'fx_cd' ? i + 1 : 0).filter(Boolean);
  for (let i = 1; i < cd.length; i++) ok(cd[i] - cd[i - 1] > 2, 'cooldown gap ' + cd);
  eq(seen[8], 'fx_f9', 'forced card on its week'); eq(seen.filter(x => x === 'fx_f9').length, 1);
});

test('every gate key evaluates', () => {
  const GG = fresh([]);
  const s = GG.career.newCareer({ seed: 1 });
  Object.assign(s, { totalWeek: 30, year: 2, week: 6, fans: 100, fund: 200, buzz: 20, chemistry: 60 });
  s.flags = { a: true, cape: 'velvet' }; s.members.find(m => m.id === 'marcel').mood = 30;
  const P = g => GG.career.gatePasses(s, g);
  const cases = [
    [{ era: ['garage'] }, true], [{ era: ['local'] }, false], [{ genre: ['metal'] }, true], [{ genre: ['punk'] }, false],
    [{ region: ['canada'] }, true], [{ band: ['hail_damage'] }, true], [{ band: ['frost_heave'] }, false],
    [{ minWeek: 30 }, true], [{ minWeek: 31 }, false], [{ maxWeek: 29 }, false], [{ weekOfYear: [5, 7] }, true], [{ weekOfYear: [7, 9] }, false],
    [{ minYear: 2 }, true], [{ maxYear: 1 }, false], [{ minFans: 100 }, true], [{ maxFans: 99 }, false],
    [{ minFund: 201 }, false], [{ maxFund: 200 }, true], [{ minBuzz: 20 }, true], [{ maxBuzz: 19 }, false],
    [{ minChemistry: 61 }, false], [{ maxChemistry: 60 }, true], [{ flags: ['a'] }, true], [{ flags: ['b'] }, false],
    [{ notFlags: ['b'] }, true], [{ notFlags: ['a'] }, false], [{ flagEquals: { cape: 'velvet' } }, true],
    [{ flagEquals: { cape: 'curtain' } }, false], [{ flagEquals: { hat: null } }, true], [{ gigBooked: true }, true],
    [{ gigBooked: false }, false], [{ moodBelow: { marcel: 31 } }, true], [{ moodBelow: { marcel: 30 } }, false],
    [{ moodAbove: { marcel: 29 } }, true], [{ moodAbove: { nobody: 1 } }, false], [{ bogusKey: 1 }, false], [null, true]
  ];
  cases.forEach(([g, want]) => eq(P(g), want, JSON.stringify(g)));
  eq(GG.contracts.GATE_KEYS.every(k => cases.some(([g]) => g && k in g)), true, 'all GATE_KEYS covered');
});

test('every effect key applies, clamps, and reports real deltas', () => {
  const GG = fresh([]);
  const s = GG.career.newCareer({ seed: 2 });
  s.gig = null; s.buzz = 98; s.debtToParents = 30; s.members[0].stage = 3;
  const d = GG.career.applyEffects(s, { fund: -50, fans: 10, buzz: 10, chemistry: 5, burnout: -50, drumSkill: 3,
    mood: { marcel: 200, all: -1 }, skill: { dana: 2, all: 1 }, flags: { cape: 'velvet', x: true },
    chain: { cape: { step: 2, delay: 3 } }, book: 'legion_63', chat: { who: 'kenji', text: '{nick:marcel}?' },
    member: { id: s.members[0].id, act: 'settle' }, payCut: 0.05, repay: 100 });
  eq([d.payCut, s.payCut, d.repay, s.debtToParents, s.members[0].stage], [0.05, 0.35, 30, 0, 2], 'v0.4 drama keys');
  eq(d.fund, -80); s.fund += 30;
  eq(d.fans, 10); eq(d.buzz, 2, 'buzz clamps at 100'); eq(s.buzz, 100); eq(d.burnout, -10); eq(s.burnout, 0);
  eq(d.drumSkill, 3); eq(d.chemistry, 5);
  eq(s.members.find(m => m.id === 'marcel').mood, 99, 'marcel clamped to 100 then all -1'); ok(d.mood.marcel > 0 && d.mood.dana === -1);
  eq(d.skill.dana, 3); eq(d.skill.jaxon, 1);
  eq(s.flags.cape, 'velvet'); eq(s.chains.cape, { step: 2, due: s.totalWeek + 3 });
  eq(s.gig.venueId, 'legion_63'); eq(s.gig.source, 'card'); eq(d.book, 'legion_63');
  eq(s.chat[s.chat.length - 1].who, 'kenji'); ok(/\?$/.test(s.chat[s.chat.length - 1].text) && s.chat[s.chat.length - 1].text.indexOf('{') < 0);
  const d2 = GG.career.applyEffects(s, { flags: { x: false }, book: 'bingo_palace', chain: { cape: { step: 'end' } }, drumSkill: -500 });
  ok(!('x' in s.flags), 'false deletes a flag'); eq(s.gig.venueId, 'legion_63', 'book never replaces a booked gig');
  eq(d2.book, undefined); eq(s.chains.cape.step, 'end'); eq(s.drumSkill, 1, 'drumSkill min 1');
  GG.contracts.EFFECT_KEYS.forEach(k => ok(k in d || k === 'book' || k === 'chat', 'effect key ' + k + ' reported'));
});

test('rollChance clamps and scales with the stat', () => {
  const GG = fresh([]);
  const s = GG.career.newCareer({ seed: 2 }); s.chemistry = 70;
  eq(GG.career.rollChance(s, { chance: 2 }), 0.95); eq(GG.career.rollChance(s, { chance: -1 }), 0.05);
  ok(Math.abs(GG.career.rollChance(s, { chance: 0.5, stat: 'chemistry', statScale: 0.01 }) - 0.7) < 1e-9);
  eq(GG.career.rollChance(s, { chance: 0.4, stat: 'chemistry' }), 0.4, 'no statScale = flat chance');
  let wins = 0;
  for (let i = 1; i <= 60; i++) {
    const G2 = fresh([{ id: 'r', type: 'weird', forceWeek: 1, title: 'r', text: 't', choices: [ch({ buzz: 1 }, 'a', { roll: { chance: 0.5, success: { effects: { fans: 5 }, outcome: 'w' }, fail: { effects: { fund: -5 }, outcome: 'l' } } }), ch({})] }]);
    const t = G2.career.newCareer({ seed: i }); G2.career.startWeek(t);
    const r = G2.career.resolveCard(t, 0);
    ok(r.deltas.buzz === 1, 'choice effects always');
    if (r.success) { wins++; eq(r.deltas.fans, 5); eq(r.outcome, 'a w'); } else { eq(r.deltas.fund, -5); eq(r.outcome, 'a l'); }
  }
  ok(wins > 15 && wins < 45, 'both branches happen: ' + wins);
});

test('effectSummary and choiceHint', () => {
  const GG = fresh([]);
  const s = GG.career.newCareer({ seed: 2 });
  eq(GG.career.effectSummary({ fund: -120, buzz: 3, mood: { marcel: 10 }, chemistry: -3 }, s), '−$120 · Buzz ↑ · Marcel ↑↑ · Chemistry ↓');
  eq(GG.career.effectSummary({ fund: 80, fans: 20, mood: { all: -3 }, skill: { dana: 1 }, book: 'x' }, s), '+$80 · Fans ↑↑ · Everyone ↓ · Dana skill ↑ · Gig booked');
  eq(GG.career.effectSummary(null), '');
  eq(GG.career.choiceHint(s, { hint: 'Gamble!', effects: { fund: -5 } }), 'Gamble!');
  eq(GG.career.choiceHint(s, { effects: { buzz: 2 }, roll: {} }), 'Buzz ↑ · Risky');
});

test('fillText tokens, moodLabel, setPlan sanitizing', () => {
  const GG = fresh([]);
  const s = GG.career.newCareer({ seed: 2, player: { name: 'Pat', nick: 'Sticks' } });
  const out = GG.career.fillText(s, '{player}/{band}/{city}/{nick:marcel}/{name:dana}/{name:zed}/{nick}');
  eq(out.split('/').slice(1), ['Hail Damage', 'Saskatoon', 'Lord Abyssus', 'Dana', 'Zed', '{nick}']);
  eq(out.split('/')[0], 'Sticks');
  eq([70, 69, 45, 44, 25, 24].map(GG.career.moodLabel), ['happy', 'ok', 'ok', 'grumpy', 'grumpy', 'sulking']);
  let evs = 0; GG.on('plan:changed', () => evs++);
  eq(GG.career.setPlan(s, ['rehearse', 'bogus']), ['rehearse', null, null]); eq(evs, 1);
});

test('activities: each does its job; repeats have diminishing returns', () => {
  const GG = fresh([]);
  const run = (plan, prep) => { const s = GG.career.newCareer({ seed: 21 }); s.gig = null; if (prep) prep(s); GG.career.startWeek(s); GG.career.setPlan(s, plan); return [s, GG.career.runWeek(s, AUTO)]; };
  let [s, r] = run(['rehearse', 'rest', 'rest']);
  const b = r.blocks[0].deltas;
  ok(b.chemistry > 0 && b.drumSkill >= 2 && b.burnout === 5 && b.polished.length === Math.min(3, s.songs.length), 'rehearse ' + JSON.stringify(b));
  ok(r.blocks[0].lines[0].length > 0, 'flavour line');
  [s, r] = run(['write', 'rest', 'rest']);
  const last = s.songs[s.songs.length - 1];
  eq(s.stats.songsWritten, 1); ok(r.blocks[0].deltas.song.id === last.id && last.written === 1 && last.auto && GG.songs.validate(last.pattern, s.gear).length === 0, 'write (band jam)');
  [s, r] = run(['promote', 'rest', 'rest']);
  eq(r.blocks[0].deltas.fund, -GG.content.activities.promote.cost); ok(r.blocks[0].deltas.buzz > 0);
  [s, r] = run(['book', 'rest', 'rest']);
  ok(r.blocks[0].deltas.book && r.gig && r.gig.venueId === r.blocks[0].deltas.book, 'book then the gig resolves');
  const v = GG.gig.venue(r.gig.venueId); ok(v.tier === 1 && v.minFans <= 12);
  [s, r] = run(['book', 'rest', 'rest'], t => { t.gig = GG.gig.makeGig(t, 'legion_63', 'card'); });
  ok(r.blocks[0].deltas.buzz > 0 && !r.blocks[0].deltas.book, 'already booked: buzz');
  [s, r] = run(['hustle', 'rest', 'rest']);
  const h = r.blocks[0].deltas; ok(h.fund >= 50 && h.fund <= 100 && h.mood.marcel === -3 && s.stats.hustles === 1, 'hustle ' + JSON.stringify(h));
  [s, r] = run(['rest', 'rest', 'rest'], t => { t.burnout = 80; t.members.forEach(m => { m.mood = 40; }); });
  const bs = r.blocks.map(x => -x.deltas.burnout);
  ok(bs[0] === 14 && bs[1] < bs[0] && bs[2] < bs[1], 'diminishing rest ' + bs); ok(r.blocks[0].deltas.mood.dana > 0);
  [s, r] = run([null, 'bogus', 'rest']);
  eq(r.blocks.map(x => x.activity), ['rest', 'rest', 'rest'], 'empty blocks rest');
});

test('week 1 plays the forced gig; events fire at the documented points', () => {
  const GG = fresh([FORCE]);
  const s = GG.career.newCareer({ seed: 4 });
  const ev = {}; ['week:start', 'card:resolved', 'block:done', 'gig:done', 'week:done', 'week:wrap', 'stats:changed', 'year:end', 'career:end']
    .forEach(n => GG.on(n, () => { ev[n] = (ev[n] || 0) + 1; }));
  const wrap = week(GG, s, ['rehearse', 'write', 'rest']);
  eq(s.lastGig.venueId, 'buddys_house_party'); eq(s.gig, null); eq(s.stats.gigs, 1);
  ok(s.lastGig.crowd <= 15 && s.lastGig.pay === 0 && s.lastGig.reactions.length === 4, 'house party');
  eq([ev['week:start'], ev['card:resolved'], ev['block:done'], ev['gig:done'], ev['week:done'], ev['week:wrap']], [1, 1, 3, 1, 1, 1]);
  ok(ev['stats:changed'] >= 6, 'stats:changed after each mutation');
  ok(wrap.milestones.length >= 2 && s.milestones.firstGig === 1 && s.milestones.firstSong === 1, 'milestones');
  eq([s.totalWeek, s.week, s.phase, s.card], [2, 2, 'monday', null]);
  ok(wrap.members.length === 4 && wrap.members.every(m => typeof m.moodDelta === 'number' && m.label), 'wrap members');
  eq(Object.keys(wrap.deltas).sort(), ['burnout', 'buzz', 'chemistry', 'drumSkill', 'fans', 'fund']);
  eq(GG.career.endWeek(s), wrap, 'endWeek twice = same wrap, no double advance'); eq(s.totalWeek, 2);
});

test('offers: arrive from offerMinFans, accept/decline emit stats:changed', () => {
  const GG = fresh([]);
  GG.content.economy.offerChance = 1;
  const s = GG.career.newCareer({ seed: 8 }); s.gig = null; s.fans = GG.content.economy.offerMinFans - 1;
  eq(GG.career.startWeek(s).offer, null, 'below offerMinFans');
  const t = GG.career.newCareer({ seed: 8 }); t.gig = null; t.fans = 200;
  const o = GG.career.startWeek(t).offer;
  ok(o && o.source === 'offer' && o.tier <= 2 && GG.gig.venue(o.venueId).minFans <= 200, 'offer');
  let n = 0; GG.on('stats:changed', () => n++);
  eq(GG.career.acceptOffer(t).venueId, o.venueId); eq(t.offer, null); eq(n, 1);
  const u = GG.career.newCareer({ seed: 8 }); u.fans = 200;
  eq(GG.career.startWeek(u).offer, null, 'no offer while a gig is booked');
  u.offer = GG.gig.makeGig(u, 'bingo_palace', 'offer');
  eq(GG.career.acceptOffer(u), null, 'cannot accept over a booked gig');
  eq(GG.career.declineOffer(u), true); eq(u.offer, null);
});

test('parents\' loan tops the fund up, flags guilt, counts', () => {
  const GG = fresh([]);
  const s = GG.career.newCareer({ seed: 6 });
  GG.career.startWeek(s); GG.career.runWeek(s, AUTO);
  s.fund = -50;
  const w = GG.career.endWeek(s);
  eq(s.fund, GG.content.economy.parentsCushion); ok(w.parentsLoan > 150); eq(s.debtToParents, w.parentsLoan);
  eq(s.stats.parentsLoans, 1); eq(s.flags.parentsLoan, true); ok(typeof w.guilt === 'string' && w.guilt.length > 5);
});

test('year rollover every 24 weeks; career ends at maxWeeks', () => {
  const GG = fresh([]);
  const s = GG.career.newCareer({ seed: 10 });
  let years = [], ends = 0; GG.on('year:end', e => years.push(e.year)); GG.on('career:end', () => ends++);
  let w;
  for (let i = 0; i < 24; i++) w = week(GG, s);
  ok(w.yearEnd && w.yearSummary && w.yearSummary.year === 1 && typeof w.yearSummary.line === 'string', 'year summary');
  eq([s.totalWeek, s.year, s.week], [25, 2, 1]); eq(years, [1]);
  s.totalWeek = 239; s.year = 10; s.week = 23;
  w = week(GG, s); eq([s.totalWeek, s.year, s.week, w.ended], [240, 10, 24, false]);
  w = week(GG, s);
  ok(w.ended && w.yearEnd && s.ended && s.phase === 'ended' && s.totalWeek === 240, 'ended');
  eq(ends, 1); eq(GG.career.startWeek(s).card, null); eq(GG.career.runWeek(s, AUTO), null); eq(GG.career.endWeek(s), w);
});

test('bots: 240-week careers finish, stay in RANGES, fund >= 0, garage protection holds', () => {
  for (const [label, deck] of [['loaded content', null], ['fixture deck', LONG]]) {
    for (const style of ['avg', 'good']) {
      const GG = fresh(deck);
      const s = GG.career.newCareer({ seed: 1234, player: { name: 'Bot' } });
      let weeks = 0;
      while (!s.ended) {
        GG.career.botWeek(s, style); weeks++;
        const bad = inRanges(GG, s);
        if (bad) throw new Error(label + '/' + style + ' week ' + s.totalWeek + ': ' + bad);
        if (s.fund < 0) throw new Error('fund negative after wrap');
        // v0.4: the garage era protects the band until 250 fans (then drama can happen, always warned first)
        if (s.era !== 'garage' || (s.protected && (s.fans >= 250 || s.members.length !== 4 || s.members.some(m => m.status !== 'active' || m.stage > 2)))) throw new Error('protection broke');
        if (s.members.some(m => m.status === 'active' && m.stage > 3)) throw new Error('an active member at stage 4');
        if (weeks > 300) throw new Error('never ended');
      }
      eq([weeks, s.totalWeek, s.year, s.week, s.phase], [240, 240, 10, 24, 'ended'], label + '/' + style);
      ok(s.chat.length <= 60 && s.history.length === 241, 'caps');
      if (deck) ok(s.stats.cards > 50 && Object.keys(s.seenCards).length >= 8, 'cards drawn: ' + s.stats.cards);
    }
  }
});

test('determinism: same seed => identical career; no Math.random/Date in sims', () => {
  const play = seed => { const GG = fresh(LONG); const s = GG.career.newCareer({ seed }); for (let i = 0; i < 120; i++) GG.career.botWeek(s, 'avg'); return JSON.stringify(s); };
  const rnd = Math.random, now = Date.now;
  Math.random = () => { throw new Error('Math.random used in a sim'); };
  Date.now = () => { throw new Error('Date.now used in a sim'); };
  try { eq(play(77) === play(77), true, 'same seed'); ok(play(77) !== play(78), 'different seed'); }
  finally { Math.random = rnd; Date.now = now; }
  for (const f of ['20_sim_career.js', '21_sim_songs.js', '22_sim_gig.js']) {
    const src = fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8');
    ok(!/Math\.random|\bDate\b|document\.|window\.(?!GG)/.test(src), f + ' is pure');
  }
});

test('save mid-week and resume gives the same career (rng lives in state)', () => {
  const GG = fresh(LONG);
  const a = GG.career.newCareer({ seed: 99 });
  for (let i = 0; i < 30; i++) GG.career.botWeek(a, 'good');
  const b = JSON.parse(JSON.stringify(a));
  for (let i = 0; i < 30; i++) { GG.career.botWeek(a, 'good'); GG.career.botWeek(b, 'good'); }
  eq(JSON.stringify(a), JSON.stringify(b));
});

// ---- v0.3: live gigs (phase 'gig'), finishGig, the board in the week ---------------------------------------
test('runWeek without autoGig: blocks run, then phase gig + gig:pending; double calls are safe', () => {
  const GG = fresh([FORCE]);
  const s = GG.career.newCareer({ seed: 4 });
  const ev = []; ['gig:pending', 'gig:done', 'week:done'].forEach(n => GG.on(n, p => ev.push([n, p])));
  const r0 = GG.career.startWeek(s); if (r0.card) GG.career.resolveCard(s, 0);
  GG.career.setPlan(s, ['rehearse', 'rest', 'rest']);
  const fund0 = s.fund, r = GG.career.runWeek(s);
  eq([s.phase, r.blocks.length, r.gig, s.gig.venueId, s.stats.gigs], ['gig', 3, null, 'buddys_house_party', 0]);
  eq(ev.map(e => e[0]), ['gig:pending', 'week:done']); eq(ev[0][1].gig.venueId, 'buddys_house_party');
  eq(GG.career.runWeek(s), r, 'runWeek again in phase gig = same result, blocks not re-run');
  eq(GG.career.endWeek(s), null, 'cannot wrap before the gig'); eq(s.totalWeek, 1);
  eq(s.lastWeek.blocks[0].deltas.drumSkill > 0, true);
  // the live result comes back from the rhythm game
  const live = GG.gig.simulate(s, s.gig, GG.RNG(7)); live.grade = 'A'; live.score = 70;
  const g = GG.career.finishGig(s, live);
  eq([s.phase, g, s.lastWeek.gig, s.lastGig, s.gig, s.stats.gigs], ['wrap', live, live, live, null, 1]);
  ok(g.deltas && g.rep === 1 && g.repAfter === 1 && g.banned === false && g.travel && g.shaped, 'rep + travel applied');
  eq(s.venueRep.buddys_house_party, 1); ok(s.van.km === 0 && s.van.trips === 1, 'across town: 0 km, one trip');
  eq(ev.filter(e => e[0] === 'gig:done').length, 1);
  const fund1 = s.fund; eq(GG.career.finishGig(s, live), live, 'finishGig twice returns the result'); eq(s.fund, fund1, 'not applied twice');
  eq(s.stats.gigs, 1); ok(s.fund === fund0 + live.pay - live.gas || s.fund >= 0, 'fund moved by the gig');
  const w = GG.career.endWeek(s); ok(w && s.totalWeek === 2 && s.phase === 'monday', 'then the week wraps');
});

test('finishGig(state) with no result simulates the show; a week with no gig never enters phase gig', () => {
  const GG = fresh([]);
  const s = GG.career.newCareer({ seed: 9 });
  GG.career.startWeek(s); GG.career.setPlan(s, ['rest', 'rest', 'rest']); GG.career.runWeek(s);
  eq(s.phase, 'gig'); const r = GG.career.finishGig(s);
  ok(r && GG.contracts.GRADES.includes(r.grade) && s.phase === 'wrap' && s.lastWeek.gig === r, 'simulated');
  eq(GG.career.finishGig(s), r, 'phase wrap: returns the last gig');
  GG.career.endWeek(s); s.gig = null; GG.career.startWeek(s); s.gig = null;
  GG.career.setPlan(s, ['rest', 'rest', 'rest']); const r2 = GG.career.runWeek(s);
  eq([s.phase, r2.gig], ['wrap', null], 'no gig: straight to wrap');
  eq(GG.career.finishGig(s), s.lastGig, 'finishGig outside phase gig changes nothing');
});

test('Book block in a live week: the board pick is booked, then played live', () => {
  const GG = fresh([]);
  const s = GG.career.newCareer({ seed: 12 }); s.gig = null; s.fans = 80;
  GG.career.startWeek(s); s.gig = null;
  const l = s.listings.find(x => x.km > 100) || s.listings[0];
  GG.career.pickListing(s, l.id); GG.career.setPlan(s, ['book', 'rehearse', 'rest']);
  GG.career.runWeek(s);
  eq([s.phase, s.gig.venueId, s.gig.id, s.gig.source], ['gig', l.venueId, l.id, 'book']);
  const t = GG.world.startTrip(s); ok(t.venueId === l.venueId && t.km === l.km, 'the van drives there');
  const c0 = s.van.condition, r = GG.career.finishGig(s, null);
  eq(r.venueId, l.venueId); ok(s.van.condition <= c0 && r.travel.km === l.km, 'van wear on the way');
});

test('bots never stop in phase gig; botBook picks listings; autoGig resolves road cards', () => {
  const GG = fresh();
  const s = GG.career.newCareer({ seed: 77 });
  let pending = 0, roads = 0; GG.on('gig:pending', () => pending++); GG.on('road:resolved', () => roads++);
  for (let i = 0; i < 48; i++) { GG.career.botWeek(s, i % 2 ? 'good' : 'avg'); ok(s.phase === 'monday', 'week ' + i + ' phase ' + s.phase); }
  eq(pending, 0); ok(roads > 0, 'bots met road cards: ' + roads);
  ok(Object.keys(s.venueRep).length >= 3 && s.van.trips >= 20, 'venues played and the van drove: ' + s.van.trips);
});

done('sim_career');
