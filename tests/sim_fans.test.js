// Fans sim tests (29_sim_fans, v0.6.1 / Addendum 1 C5): Promote posts automatically, the post kind comes from band state,
// viral (good + cringe), generated comments (the rival on EVERY post), fan types as shares of the one fan count, Dale at
// every show, superfans follow on tour, scandal + superfan cards, mail + gifts, Patreeon (Signed era), save migration,
// determinism (own RNG: the career RNG never shifts), purity.
const fs = require('fs'), path = require('path');
const load = require('./_load');
const { test, ok, eq, done } = require('./_t');

const fresh = () => load({ localStorage: load.fakeStorage() });
const career = (GG, seed, extra) => Object.assign(GG.career.newCareer({ seed: seed || 5, player: { name: 'T' } }), extra || {});
const at = (s, week, year) => { s.week = week; s.year = year || s.year || 1; s.totalWeek = (s.year - 1) * 24 + week; return s; };
const AUTO = { autoGig: true };
function week(GG, s, plan, gigVenue) {
  const st = GG.career.startWeek(s);
  if (st.card) GG.career.resolveCard(s, 0);
  if (gigVenue) { s.gig = GG.gig.makeGig(s, gigVenue, 'card'); GG.world.decorate(s, s.gig); }
  GG.career.setPlan(s, plan || ['rest', 'rest', 'rest']);
  const r = GG.career.runWeek(s, AUTO);
  GG.career.endWeek(s);
  return r;
}
// cfg overrides: economy.fans gets a new object so GG.fans.cfg() re-merges
function tune(GG, patch) { const E = GG.content.economy; E.fans = JSON.parse(JSON.stringify(E.fans)); for (const k in patch) Object.assign(E.fans[k], patch[k]); }

test('new career: fan fields (shares sum to 1, Dale from day one, no fan club, no gifts)', () => {
  const GG = fresh(), s = career(GG);
  const t = s.fanTypes; ok(Math.abs(t.super + t.casual + t.hater - 1) < 1e-6 && t.super > 0 && t.hater > 0, 'shares ' + JSON.stringify(t));
  eq([s.bandbook.posts, s.bandbook.viral, s.bandbook.scandals], [[], 0, 0]);
  ok(s.superfans.dale && s.superfans.dale.seen === 0 && !s.superfans.trucker && !s.superfans.japan, 'Dale only (trucker by story, Japan in v0.7)');
  eq([s.fanClub, s.gifts], [null, []]);
  const c = GG.fans.counts(Object.assign({}, s, { fans: 1000 }));
  eq(c.super + c.casual + c.hater, 1000, 'fans stay ONE count: the types are shares of it');
});

test('Promote posts automatically: one post per block, comments + the rival on every post, block lines, career RNG untouched', () => {
  const GG = fresh(), s = career(GG, 11);
  week(GG, s);                                     // week 1 (forced card + house party)
  GG.career.startWeek(s); if (s.card && !s.card.resolved) GG.career.resolveCard(s, 0);
  GG.career.setPlan(s, ['promote', 'promote', 'rest']);
  const snap = JSON.parse(JSON.stringify(s));
  const r = GG.career.runWeek(s, AUTO);
  eq(s.bandbook.posts.length, 2, 'two Promote blocks, two posts');
  const p = s.bandbook.posts[0];
  ok(['rehearsal', 'gig', 'teaser', 'meme', 'bts'].includes(p.kind) && p.text && !/\{/.test(p.text) && p.likes > 0 && p.plays > 0, 'post ' + JSON.stringify(p).slice(0, 160));
  const fan = p.comments.filter(c => c.who !== 'rival'), riv = p.comments.filter(c => c.who === 'rival');
  ok(fan.length >= 2 && fan.length <= 4, '2–4 generated comments: ' + fan.length);
  ok(riv.length === 1 && riv[0].name === GG.rival.name(s) && p.comments[p.comments.length - 1].who === 'rival', 'the rival comments (last), supportive');
  ok(r.blocks[0].lines.some(l => /Bandbook/.test(l)) && r.blocks[0].deltas.post === p.id, 'block line + deltas.post');
  // the career RNG draws exactly what it drew before v0.6.1 (posts use their own seeded RNG)
  const GG2 = fresh(); GG2.fans.post = () => null;
  const s2 = JSON.parse(JSON.stringify(snap)); GG2.career.runWeek(s2, AUTO);
  eq(s.rng, s2.rng, 'career RNG state identical with and without Bandbook');
});

test('post kinds come from band state: a booked gig -> announcements; no gig -> never; a fresh song -> teasers', () => {
  const GG = fresh(), s = career(GG, 3); at(s, 14, 1);
  const kinds = st => { const out = {}; for (let i = 0; i < 60; i++) { const p = GG.fans.post(st, {}); out[p.kind] = (out[p.kind] || 0) + 1; } return out; };
  s.gig = null; const a = kinds(s); ok(!a.gig, 'no gig, no announcement ' + JSON.stringify(a));
  const s2 = career(GG, 3); at(s2, 14, 1); s2.gig = GG.gig.makeGig(s2, 'legion_63', 'card');
  const b = kinds(s2); ok(b.gig >= 15, 'booked gig -> announcements ' + JSON.stringify(b));
  const gp = s2.bandbook.posts.filter(p => p.kind === 'gig').pop(); ok(/Legion/.test(gp.text) || gp.text.includes(s2.gig.name), 'names the venue: ' + gp.text);
  const s3 = career(GG, 3); at(s3, 14, 1); s3.songs[s3.songs.length - 1].written = s3.totalWeek;
  const c = kinds(s3); ok(c.teaser >= 12, 'fresh song -> teasers ' + JSON.stringify(c));
});

test('viral: good (buzz + fans up, count) and the wrong kind (a member mood down, haters up)', () => {
  const GG = fresh(); tune(GG, { viral: { base: 1, max: 1, cringe: 0 } });
  const s = career(GG, 8); at(s, 14); s.fans = 400; s.buzz = 20;
  const b0 = s.buzz, f0 = s.fans, d = {}, p = GG.fans.post(s, { d });
  ok(p.viral === 'good' && s.bandbook.viral === 1 && /VIRAL/.test(p.text) && !/\{/.test(p.text), 'good viral ' + p.text);
  ok(s.buzz - b0 >= 9 && s.fans - f0 >= 15 && d.buzz >= 9, 'buzz + fans jump ' + (s.buzz - b0) + ' / ' + (s.fans - f0));
  ok(p.likes > 400, 'likes explode ' + p.likes);
  tune(GG, { viral: { base: 1, max: 1, cringe: 1 } });
  const s2 = career(GG, 8); at(s2, 14); s2.buzz = 20;
  const moods = Object.fromEntries(s2.members.map(m => [m.id, m.mood])), h0 = s2.fanTypes.hater, b1 = s2.buzz;
  const q = GG.fans.post(s2, {});
  ok(q.viral === 'cringe' && /Wrong kind of viral/.test(q.text), 'cringe viral: ' + q.text);
  const m = s2.members.find(x => x.id === q.who);
  ok(m && m.id !== 'kenji' && m.mood < moods[m.id], 'their mood drops: ' + q.who);
  ok(s2.buzz > b1 && s2.fanTypes.hater > h0, 'buzz up, haters up');
  ok(q.comments.some(c => c.who === 'hater') || s2.fanTypes.hater < 0.05, 'haters show up in the comments');
});

test('the rival comments on EVERY post; Dale comments often; haters get their own comments as fame grows', () => {
  const GG = fresh(), s = career(GG, 21); at(s, 14);
  s.fans = 30000; for (let i = 0; i < 30; i++) GG.fans.weekly(s);
  let posts = [];
  for (let i = 0; i < 40; i++) posts.push(GG.fans.post(s, {}));
  ok(posts.every(p => p.comments.filter(c => c.who === 'rival').length === 1), 'rival on every post');
  ok(posts.filter(p => p.comments.some(c => c.who === 'dale' && c.name === 'Dale from Warman')).length >= 15, 'Dale in the comments');
  ok(posts.filter(p => p.comments.some(c => c.who === 'hater')).length >= 10, 'haters comment at 30k fans');
  ok(s.bandbook.posts.length === GG.fans.cfg().post.max, 'posts capped at ' + GG.fans.cfg().post.max);
  eq(new Set(posts.map(p => p.id)).size, 40, 'unique post ids');
});

test('sentiment reflects buzz, the last gig and haters', () => {
  const GG = fresh(), s = career(GG);
  Object.assign(s, { buzz: 90, chemistry: 80, lastGig: { grade: 'S' } }); eq(GG.fans.sentiment(s), 'good');
  Object.assign(s, { buzz: 5, chemistry: 30, lastGig: { grade: 'D' } }); s.fanTypes.hater = 0.2; eq(GG.fans.sentiment(s), 'bad');
});

test('fan types: haters grow with fame; superfans with chemistry; shares stay in range and sum to 1', () => {
  const GG = fresh(), a = career(GG, 2), b = career(GG, 2);
  a.fans = 60; b.fans = 40000;
  for (let i = 0; i < 40; i++) { GG.fans.weekly(a); GG.fans.weekly(b); }
  ok(b.fanTypes.hater > a.fanTypes.hater + 0.08, 'haters grow with fame ' + a.fanTypes.hater + ' -> ' + b.fanTypes.hater);
  const c = career(GG, 2); c.chemistry = 100; const d = career(GG, 2); d.chemistry = 10;
  for (let i = 0; i < 40; i++) { GG.fans.weekly(c); GG.fans.weekly(d); }
  ok(c.fanTypes.super > d.fanTypes.super, 'superfans with chemistry');
  [a, b, c, d].forEach(x => { const t = x.fanTypes; ok(Math.abs(t.super + t.casual + t.hater - 1) < 1e-3 && t.hater <= 0.3 && t.super <= 0.18, 'range ' + JSON.stringify(t)); });
});

test('Dale from Warman is at every show (crowd + a line); superfans follow on tour; home gigs have no followers', () => {
  const GG = fresh(), s = career(GG, 31);
  week(GG, s);                                       // the house party
  eq(s.superfans.dale.seen, 1); ok(s.lastGig.lines.some(l => /Dale from Warman/.test(l)), 'Dale at the house party');
  s.fans = 3000; for (let i = 0; i < 10; i++) GG.fans.weekly(s);
  week(GG, s, ['rest', 'rest', 'rest'], 'legion_63');   // home
  ok(!s.lastGig.superfans && s.superfans.dale.seen === 2 && s.lastGig.lines.some(l => /Dale from Warman/.test(l)), 'home: Dale, no followers');
  week(GG, s, ['rest', 'rest', 'rest'], 'queen_city_bingo');   // Regina, 250 km
  ok(s.lastGig.km >= 60 && s.lastGig.crowd <= s.lastGig.capacity, 'Regina: crowd within capacity');
  eq(s.superfans.dale.seen, 3, 'Dale again');
  // followers need room: a half-empty door gig 250 km away
  const r = { crowd: 20, capacity: 200, km: 250, grade: 'B', lines: [], pay: 100, buzz: 2 }, g = { deal: 'door', pay: 5, capacity: 200 };
  GG.fans.gigShape(s, g, r);
  ok(r.superfans > 0 && r.crowd === 20 + r.superfans + 1 && r.pay === 5 * r.crowd && r.lines.some(l => /superfans/.test(l)), 'superfans follow on tour ' + JSON.stringify(r).slice(0, 200));
  const n = r.crowd; GG.fans.gigShape(s, g, r); eq(r.crowd, n, 'once per result');
  const h = { crowd: 20, capacity: 200, km: 0, grade: 'B', lines: [], pay: 100, buzz: 2 }; GG.fans.gigShape(s, g, h);
  ok(!h.superfans && h.crowd === 21, 'home: Dale only');
});

test('scandals: a post or a weekly roll queues a choice card; the card applies its fan effects', () => {
  const GG = fresh(); tune(GG, { scandal: { post: 1, cooldown: 0, fromWeek: 1 } });
  const s = career(GG, 44); at(s, 14);
  const lines = []; GG.fans.post(s, { lines });
  ok(s.bandbook.pending && s.bandbook.pending.card && lines.some(l => /You'll hear about it Monday/.test(l)), 'scandal queued: ' + JSON.stringify(s.bandbook.pending));
  s.bandbook.pending = { card: 'scandal_turf', who: 'marcel', week: 14 };
  const h0 = s.fanTypes.hater, st = GG.career.startWeek(s);
  eq(st.card && st.card.id, 'scandal_turf', 'the scandal card comes up Monday');
  ok(/artificial turf/.test(st.card.text), 'Marcel\'s lawn is turf');
  const res = GG.career.resolveCard(s, 1);   // double down: turf is metal
  ok(s.fanTypes.hater > h0 && res.deltas.fan && res.deltas.fan.hater === 0.03 && s.bandbook.scandals === 1 && s.bandbook.pending === null, 'haters up, counted');
  ok(/Haters ↑/.test(GG.career.choiceHint(s, st.card.choices[1])), 'hint shows the fan effect: ' + GG.career.choiceHint(s, st.card.choices[1]));
  const GG2 = fresh(); tune(GG2, { scandal: { weekly: 1, cooldown: 0, fromWeek: 1 } });
  const s2 = career(GG2, 45); at(s2, 14); GG2.fans.weekly(s2);
  ok(s2.bandbook.pending && s2.bandbook.pending.source === 'weekly', 'bandmates post dumb things on their own');
});

test('superfan cards: Dale says hi, the jumper-cable trucker, the macaroni portrait of Kenji', () => {
  const GG = fresh(), s = career(GG, 52); at(s, 14);
  s.superfans.dale.seen = 2;
  eq(GG.career.startWeek(s).card.id, 'fans_dale_hello'); GG.career.resolveCard(s, 0);
  at(s, 17); s.stats.gigs = 4; s.lastGig = { km: 250, grade: 'B' };
  const t = GG.career.startWeek(s).card; eq(t && t.id, 'fans_trucker', 'the jumper-cable story');
  GG.career.resolveCard(s, 1);
  ok(s.superfans.trucker && GG.fans.hasGift(s, 'cb_radio'), 'Wendell is a superfan now (and sent his CB)');
  at(s, 22); s.superfans.dale.seen = 6;
  eq(GG.career.startWeek(s).card.id, 'fans_macaroni'); GG.career.resolveCard(s, 0);
  ok(GG.fans.hasGift(s, 'macaroni_kenji') && /Kenji/.test(s.gifts.find(g => g.id === 'macaroni_kenji').text), 'macaroni Kenji in the garage');
  ok(!GG.fans.superfanList(s).find(x => x.id === 'japan').active, 'the Japanese president waits for v0.7');
  at(s, 27, 2); eq(GG.career.startWeek(s).card === null || !/^fans_(dale_hello|trucker|macaroni)$/.test(GG.career.startWeek(s).card.id), true, 'each superfan card once');
});

test('mail + gifts arrive in the garage (unique gifts, capped list)', () => {
  const GG = fresh(); tune(GG, { mail: { chance: 1, max: 1 }, gift: { chance: 1, max: 1 } });
  const s = career(GG, 61); s.stats.gigs = 3;
  for (let i = 0; i < 40; i++) { at(s, (i % 24) + 1, 1 + Math.floor(i / 24)); GG.fans.weekly(s); }
  const gifts = s.gifts.filter(g => g.kind === 'gift'), mail = s.gifts.filter(g => g.kind === 'mail');
  eq(new Set(gifts.map(g => g.id)).size, gifts.length, 'gifts never repeat');
  ok(gifts.length === GG.content.bandbook.gifts.length && mail.length > 0 && s.gifts.length <= GG.fans.cfg().giftsMax, gifts.length + ' gifts, ' + mail.length + ' letters');
  ok(s.chat.some(m => m.who === 'mom' && /parcel/.test(m.text)), 'Mom announces a parcel');
});

test('Patreeon: Signed era card opens it; monthly payouts; exclusives keep members happy; grumbles; re-offer after a no', () => {
  const GG = fresh(), s = career(GG, 70, { era: 'signed', fans: 20000 }); at(s, 13, 3);
  for (let i = 0; i < 20; i++) GG.fans.weekly(s);
  at(s, 13, 3); s.bandbook.lastCard = null; s.fanClub = null;
  const c0 = GG.career.startWeek(s).card; eq(c0 && c0.id, 'fans_patreeon');
  GG.career.resolveCard(s, 2);                        // not yet
  ok(!s.fanClub && s.bandbook.clubDeclined === s.totalWeek, 'declined');
  at(s, 17, 3); eq((GG.career.startWeek(s).card || {}).id !== 'fans_patreeon', true, 'not again for a while');
  at(s, 21, 3); s.bandbook.lastCard = null;
  eq((GG.career.startWeek(s).card || {}).id, 'fans_patreeon', 're-offered'); GG.career.resolveCard(s, 0);
  ok(s.fanClub && s.fanClub.members >= 2 && s.fanClub.happiness === 70, 'open: ' + JSON.stringify(s.fanClub));
  const view = GG.fans.club(s); eq(view.tiers.map(t => t.name), ['Drumstick', 'Snare', 'Full Kit']); ok(view.name === 'Patreeon' && view.canExclusive, 'view');
  // exclusives: once a week, happiness up, burnout a little
  const h = s.fanClub.happiness, b = s.burnout, p = GG.fans.exclusive(s, {});
  ok(p && p.exclusive && p.kind === 'exclusive' && s.fanClub.happiness > h && s.burnout >= b, 'exclusive posted');
  ok(p.comments.some(c => c.who === 'rival') && p.comments.some(c => c.who === 'dale'), 'rival + Dale on the exclusive');
  ok(!GG.fans.canExclusive(s) && GG.fans.exclusive(s, {}) === null, 'once a week');
  // month-end payout (second week of the month) pays the fund and posts to the chat
  at(s, 22, 3); const f0 = s.fund, w = GG.fans.weekly(s);
  ok(w.club && w.club.paid > 0 && s.fund === f0 + w.club.paid && s.fanClub.earned === w.club.paid, 'payout ' + JSON.stringify(w.club));
  ok(/Patreeon/.test(s.chat[s.chat.length - 1].text), 'payout chat');
  // happiness decays without exclusives -> fewer members -> the grumble card
  const m0 = s.fanClub.members;
  for (let i = 0; i < 12; i++) { at(s, 1 + i, 4); GG.fans.weekly(s); }
  ok(s.fanClub.happiness < 30 && s.fanClub.members <= m0 + 2, 'unhappy members ' + JSON.stringify(s.fanClub));
  at(s, 14, 4); s.bandbook.lastCard = null; s.bandbook.pending = null;
  eq((GG.career.startWeek(s).card || {}).id, 'fans_club_grumble'); GG.career.resolveCard(s, 0);
  ok(s.fanClub.happiness >= 25, 'an exclusive tonight cheers them up');
  // happy vs unhappy clubs: payouts depend on keeping superfans happy
  const pay = happy => { const x = career(GG, 71, { era: 'signed', fans: 30000 }); at(x, 1, 3); GG.fans.openClub(x);
    let tot = 0; for (let i = 1; i <= 24; i++) { at(x, i, 3); if (happy) GG.fans.exclusive(x, {}); const r = GG.fans.weekly(x); tot += r.club ? r.club.paid : 0; } return tot; };
  ok(pay(true) > pay(false) * 1.3, 'happy club pays more: ' + pay(true) + ' vs ' + pay(false));
  const g = career(GG, 72); at(g, 14); eq(GG.fans.openClub(g), null, 'locked before the Signed era');
});

test('save migration: old saves gain fan fields, idempotent; values kept', () => {
  const GG = fresh(), s = career(GG, 80);
  const old = JSON.parse(JSON.stringify(s));
  ['fanTypes', 'bandbook', 'superfans', 'fanClub', 'gifts'].forEach(k => delete old[k]);
  const m = GG.save.migrate(old);
  ok(m.fanTypes && Array.isArray(m.bandbook.posts) && m.superfans.dale && m.fanClub === null && Array.isArray(m.gifts), 'filled');
  eq(JSON.stringify(GG.save.migrate(JSON.parse(JSON.stringify(m)))), JSON.stringify(m), 'idempotent');
  const k = JSON.parse(JSON.stringify(s)); k.fanClub = { since: 3, members: 9, happiness: 50, tier: 'drumstick', exclusives: 1, lastExclusive: null, earned: 0, lastPayout: 0, paid: null };
  eq(GG.save.migrate(k).fanClub.members, 9, 'an existing club is kept');
  const back = GG.save.fromCode(GG.save.toCode(s)); eq(JSON.stringify(back.fanTypes), JSON.stringify(s.fanTypes), 'save code round-trip');
});

test('bots over 5 years: posts, virality, a Patreeon in the Signed era; deterministic per seed; pure module', () => {
  const GG = fresh();
  const run = (seed, style) => { const s = career(GG, seed); for (let i = 0; i < 24 * 5; i++) GG.career.botWeek(s, style); return s; };
  const a = run(7, 'avg'), b = run(7, 'avg');
  eq(JSON.stringify(a), JSON.stringify(b), 'same seed, same career');
  ok(a.bandbook.seq > 10, 'the avg bot posts: ' + a.bandbook.seq);
  const g = run(9, 'good');
  ok(g.era === 'signed' && g.fanClub && g.fanClub.earned > 0, 'good bot: a paying Patreeon ' + JSON.stringify(g.fanClub));
  ok(g.superfans.dale.seen >= 40, 'Dale at every show: ' + g.superfans.dale.seen + ' / ' + g.stats.gigs);
  ok(Object.values(g.fanTypes).every(isFinite) && g.gifts.length > 0, 'gifts arrive');
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', '29_sim_fans.js'), 'utf8');
  ok(!/Math\.random|\bDate\b|document\.|window\.(?!GG)/.test(src), '29_sim_fans.js is pure');
});

done('sim_fans');
