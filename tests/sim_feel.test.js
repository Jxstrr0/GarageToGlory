// v1.2 "Soundcheck" Lane F (handoff F4 / F5 / F13, contract §4.2): the band's feel and your tap accents, pure.
// 30 + 31 are evaluated against the loaded GG with no AudioContext (as sim_audio does): A.timeline, A.feelFor, A.feelPlan,
// A.accent, A.tapVel, A.velGain. Checks: determinism, clamps per F3.3 at 60-260 bpm, step events never move, lane order
// kept, AR(1) spread vs t, accent map, section dynamics, tapVel table, who plays what (career / rival / null), F16 rules.
const fs = require('fs'), path = require('path');
const load = require('./_load');
const { test, ok, eq, done } = require('./_t');

const GG = load({ localStorage: load.fakeStorage() });
for (const f of ['30_audio.js', '31_audio_feel.js']) new Function('window', fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8'))({ GG: GG });
const A = GG.audio, C = GG.contracts;
const near = (a, b, e) => Math.abs(a - b) <= (e == null ? 1e-9 : e);
const fullSong = (g, bpm) => { const p = JSON.parse(JSON.stringify(GG.songs.signature(g))); if (bpm) p.bpm = bpm; p.sections.solo = p.sections.verse.slice(); p.sections.outro = p.sections.chorus.slice(); p.arrangement = ['verse', 'chorus', 'bridge', 'solo', 'chorus', 'outro']; return p; };
const career = (bandId, seat, seed) => GG.career.newCareer({ seed: seed || 5, bandId, seat: seat || 'drums', player: { name: 'F' } });
const BAND = { metal: 'hail_damage', punk: 'frost_heave', rock: 'gravel_kings', country: 'grid_road_ramblers' };
const keyOf = e => e.kind === 'drum' ? e.lane : e.kind;

test('velGain: VEL_REF plays at the 1.1 level, (v / 0.85)^1.5, capped at +2.5 dB', () => {
  eq(A.velGain(C.VEL_REF), 1);
  ok(near(A.velGain(0.5), Math.pow(0.5 / 0.85, 1.5), 1e-12), '0.5');
  ok(near(A.velGain(1), Math.min(1.333, Math.pow(1 / 0.85, 1.5)), 1e-12) && A.velGain(1) <= 1.333 + 1e-12, '1 (cap)');
  ok(near(20 * Math.log10(A.velGain(2)), 20 * Math.log10(1.333), 1e-9) && 20 * Math.log10(1.333) <= 2.5, 'cap <= +2.5 dB');
  eq([A.velGain(0), A.velGain(NaN), A.velGain('x')], [0, 1, 1], 'edges');
});

test('feelFor(null): every player t = 0.5; spread, push, velSd per F4 (genre slop + push)', () => {
  for (const g of C.GENRES) {
    const F = A.feelFor(null, g, {}), fd = GG.content.genres[g].backing.feel;
    ok(fd && isFinite(fd.slop) && fd.push, g + ': backing.feel');
    eq(F.genre, g); eq(F.slop, fd.slop);
    for (const k of Object.keys(F.byKind)) {
      const x = F.byKind[k];
      eq(x.t, 0.5, g + ' ' + k + ' t');
      ok(near(x.spread, (12 + (2.5 - 12) * 0.5) * fd.slop / 1000, 1e-12), g + ' ' + k + ' spread');
      ok(near(x.velSd, 0.1 + (0.03 - 0.1) * 0.5, 1e-12), g + ' ' + k + ' velSd');
    }
    const P = fd.push, by = F.byKind;
    ok(near(by.kick.push, P.kick * 0.75 / 1000) && near(by.snare.push, P.snare * 0.75 / 1000) && near(by.hat.push, P.hat * 0.75 / 1000) && near(by.ride.push, P.hat * 0.75 / 1000), g + ': drum push x (1 - 0.5 t)');
    ok(near(by.bass.push, P.bass * 0.75 / 1000) && near(by.gtr.push, P.gtr * 0.75 / 1000) && near(by.lead.push, P.gtr * 0.75 / 1000) && near(by.vox.push, P.vox * 0.75 / 1000), g + ': band push');
  }
  // the F4 table
  const T = { metal: [0.6, 0, 0, 0, 0, 0, 4], punk: [1.1, -3, -5, -4, -3, -4, -2], rock: [1.0, 0, 7, 2, 4, 2, 6], country: [0.9, 0, 4, 2, 2, 3, 5] };
  for (const g of C.GENRES) { const f = GG.content.genres[g].backing.feel; eq([f.slop, f.push.kick, f.push.snare, f.push.hat, f.push.bass, f.push.gtr, f.push.vox], T[g], g + ' F4 table'); }
});

test('feelFor(career): who plays what by seatRole, t from skill, missing 50, mood < 30 x 1.25, studio + 0.25', () => {
  const st = career('hail_damage', 'drums'), F = A.feelFor(st, 'metal', {}), by = F.byKind;
  const sk = id => st.members.filter(m => m.id === id)[0].skill, tt = s => Math.max(0, Math.min(1, (s - 30) / 60));
  eq([by.kick.who, by.bass.who, by.gtr.who, by.gtr2.who, by.lead.who, by.vox.who], ['player', 'kenji', 'jaxon', 'jaxon', 'dana', 'marcel'], 'metal, drum seat');
  eq([by.kick.t, by.kick.spread, by.kick.push], [1, 0, 0], 'your kit: no feel (your taps)');
  ok(near(by.bass.t, tt(sk('kenji'))) && near(by.lead.t, tt(sk('dana'))) && near(by.vox.t, tt(sk('marcel'))), 't = clamp((skill - 30) / 60)');
  const sk2 = career('hail_damage', 'bass'), F2 = A.feelFor(sk2, 'metal', {});
  eq([F2.byKind.bass.who, F2.byKind.kick.who], ['player', 'kenji'], 'bass seat: you play bass, Kenji moves to the kit');
  const fr = career('frost_heave', 'rhythm'), F3 = A.feelFor(fr, 'punk', {});
  eq([F3.byKind.gtr.who, F3.byKind.lead.who, F3.byKind.vox.who, F3.byKind.kick.who], ['player', 'benny', 'rox', 'rox'], 'punk rhythm seat: Rox (vocals/guitar) moves to the kit and still sings ' + JSON.stringify(GG.career.lineup(fr)));
  const gr = career('grid_road_ramblers', 'drums'), F4 = A.feelFor(gr, 'country', {});
  eq([F4.byKind.clean.who, F4.byKind.twang.who, F4.byKind.fiddle.who, F4.byKind.bass.who, F4.byKind.vox.who], ['travis', 'earl', 'clementine', 'duke', 'travis'], 'country');
  // mood < 30: that player's spread x 1.25 (F16.1)
  const st2 = JSON.parse(JSON.stringify(st)); st2.members.forEach(m => { if (m.id === 'kenji') m.mood = 10; });
  const by2 = A.feelFor(st2, 'metal', {}).byKind;
  ok(near(by2.bass.spread, by.bass.spread * C.FEEL_MOOD.spread, 1e-12) && near(by2.gtr.spread, by.gtr.spread, 1e-12), 'mood 10: Kenji x 1.25, the rest unchanged');
  st2.members.forEach(m => { if (m.id === 'kenji') m.mood = 30; });
  ok(near(A.feelFor(st2, 'metal', {}).byKind.bass.spread, by.bass.spread, 1e-12), 'mood 30: not below');
  // studio takes (F16.2): t + 0.25
  const S = A.feelFor(st, 'metal', { studio: true }).byKind;
  ok(near(S.bass.t, Math.min(1, by.bass.t + C.FEEL_STUDIO)) && S.bass.spread < by.bass.spread, 'studio t + 0.25 (tighter)');
  // a missing player (no bass member): skill 50
  const st3 = JSON.parse(JSON.stringify(st)); st3.members = st3.members.filter(m => m.id !== 'kenji');
  ok(near(A.feelFor(st3, 'metal', {}).byKind.bass.t, tt(50)), 'missing bass: skill 50');
  // a starter band is audibly loose: t ~ 0.2 - 0.45
  ok([by.bass, by.gtr, by.lead, by.vox].every(x => x.t >= 0.15 && x.t <= 0.5), 'starters loose');
});

test('feelFor(rival): their lineup, missing skill 60, + 0.15 (F16.2)', () => {
  const st = career('hail_damage', 'drums');
  if (GG.rival && GG.rival.init && !st.rival) GG.rival.init(st);
  const lu = GG.rival && GG.rival.lineup ? GG.rival.lineup(st) : [];
  ok(lu.length >= 3, 'a rival lineup');
  const F = A.feelFor(st, st.rival.genre || 'metal', { rival: st.rival.id }), by = F.byKind;
  eq(F.rival, st.rival.id);
  const want = Math.min(1, (60 - 30) / 60 + C.FEEL_RIVAL);
  ok(['kick', 'bass', 'gtr', 'vox'].every(k => near(by[k].t, want, 1e-12) && by[k].who !== 'player'), 'rivals: skill 60 + 0.15 = ' + want + ' ' + JSON.stringify(by.kick));
  ok(lu.some(m => /drum/.test(m.role) && by.kick.who === String(m.id)), 'their drummer plays their kit');
  const N = A.feelFor(null, 'punk', { rival: 'x' }).byKind;
  ok(near(N.kick.t, 0.5 + C.FEEL_RIVAL, 1e-12), 'no state: 0.5 + 0.15');
});

test('feelPlan: deterministic per seed (songId | pass), a new seed differs, pure', () => {
  const tl = A.timeline(fullSong('rock'), { genre: 'rock', songId: 's2' }), F = A.feelFor(null, 'rock', {});
  const before = JSON.stringify(tl.events);
  const a = A.feelPlan(tl, F, GG.hashSeed('s2|0'), {}), b = A.feelPlan(tl, F, GG.hashSeed('s2|0'), {}), c = A.feelPlan(tl, F, GG.hashSeed('s2|1'), {});
  eq(Array.from(a.dt), Array.from(b.dt), 'dt same seed'); eq(Array.from(a.vel), Array.from(b.vel), 'vel same seed');
  ok(Array.from(a.dt).some((x, i) => x !== c.dt[i]), 'pass 1 differs');
  eq(JSON.stringify(tl.events), before, 'tl.events never mutated');
  ok(a.dt instanceof Float32Array && a.vel instanceof Float32Array && a.dt.length === tl.events.length, 'Float32Array(n)');
  ok(a.stats && isFinite(a.stats.maxAbsDt) && isFinite(a.stats.meanVel), 'stats');
  eq(A.feelPlan(tl, null, 1, {}), null, 'no FEEL -> null');
  eq(A.feelPlan(null, F, 1, {}), null, 'no timeline -> null');
});

test('feelPlan clamps (F3.3) at 60-260 bpm: gig kick/snare <= 6 ms, other <= 15 ms, outside <= 25 ms, <= 25 % of a 16th; steps 0', () => {
  for (const g of C.GENRES) for (const bpm of [60, 90, 120, 160, 200, 230, 260]) for (const gig of [false, true]) {
    const st = career(BAND[g], 'bass'), tl = A.timeline(fullSong(g, bpm), { genre: g, songId: 's3', seat: 'bass' });
    const F = A.feelFor(st, g, { seat: 'bass' }), P = A.feelPlan(tl, F, GG.hashSeed('s3|' + bpm), { gig }), spb = 60 / tl.bpm, s16 = 0.25 * spb / 4, w = g + '@' + bpm + (gig ? '/gig' : '');
    let bad = 0, order = 0, steps = 0, last = {}, worst = 0;
    tl.events.forEach((e, i) => {
      if (e.kind === 'step') { if (P.dt[i] !== 0 || P.vel[i] !== 1) steps++; return; }
      const k = keyOf(e), lim = Math.min(gig ? (k === 'kick' || k === 'snare' ? 0.006 : 0.015) : 0.025, s16);
      if (Math.abs(P.dt[i]) > lim + 1e-7) bad++;
      worst = Math.max(worst, Math.abs(P.dt[i]));
      if (P.vel[i] < 0 || P.vel[i] > 1 || !isFinite(P.vel[i])) bad++;
      const at = e.beat * spb + P.dt[i];
      if (last[k] != null && at < last[k] - 1e-7) order++;
      last[k] = at;
    });
    eq([bad, order, steps], [0, 0, 0], w + ' (worst ' + (worst * 1000).toFixed(2) + ' ms)');
    eq(tl.events.filter((e, i) => e.kind === 'bass' && P.dt[i] !== 0).length, 0, w + ': your seat keeps its time (bass = player)');
  }
});

test('feelPlan: the AR(1) wander spread follows t (loose band > tight band; SD ~ the F4 spread), push is the mean', () => {
  const tl = A.timeline(fullSong('metal', 120), { genre: 'metal', songId: 's4' });
  const sdOf = (t, seedN) => {
    const F = A.feelFor(null, 'metal', {});
    for (const k of Object.keys(F.byKind)) { const x = F.byKind[k]; x.t = t; x.spread = (12 + (2.5 - 12) * t) * 0.6 / 1000; x.push = 0; }
    let s = 0, n = 0, prevBeat = null;
    for (let seed = 1; seed <= seedN; seed++) {
      const P = A.feelPlan(tl, F, seed, {});
      tl.events.forEach((e, i) => { if (e.kind === 'bass' && e.beat !== prevBeat) { s += P.dt[i] * P.dt[i]; n++; prevBeat = e.beat; } });
    }
    return Math.sqrt(s / n);
  };
  const loose = sdOf(0, 12), tight = sdOf(1, 12);
  ok(loose > tight * 2.5, 'loose ' + (loose * 1000).toFixed(2) + ' ms vs tight ' + (tight * 1000).toFixed(2) + ' ms');
  ok(near(loose, 0.0072, 0.0025), 'loose SD ~ 12 x 0.6 = 7.2 ms (clamped at 25 ms): ' + (loose * 1000).toFixed(2));
  ok(near(tight, 0.0015, 0.0007), 'tight SD ~ 2.5 x 0.6 = 1.5 ms: ' + (tight * 1000).toFixed(2));
  // correlated, not white: lag-1 correlation of one player's onsets ~ 0.7
  const F = A.feelFor(null, 'metal', {}); for (const k of Object.keys(F.byKind)) { F.byKind[k].push = 0; F.byKind[k].spread = 0.002; }
  let sxy = 0, sxx = 0;
  for (let seed = 1; seed <= 8; seed++) {
    const P = A.feelPlan(tl, F, seed, {}); let prev = null, pb = null;
    tl.events.forEach((e, i) => { if (e.kind === 'drum' && e.beat !== pb) { if (prev != null) { sxy += prev * P.dt[i]; sxx += prev * prev; } prev = P.dt[i]; pb = e.beat; } });
  }
  ok(near(sxy / sxx, 0.7, 0.12), 'AR(1) lag-1 ~ 0.7: ' + (sxy / sxx).toFixed(3));
  // push: rock's snare lays back (mean > 0), punk's rushes (mean < 0)
  const mean = (g, lane) => { const t = A.timeline(fullSong(g, 120), { genre: g, songId: 's5' }), P = A.feelPlan(t, A.feelFor(null, g, {}), 9, {}); const xs = t.events.map((e, i) => e.lane === lane ? P.dt[i] : null).filter(x => x != null); return xs.reduce((a, b) => a + b, 0) / xs.length; };
  ok(mean('rock', 'snare') > 0.002 && mean('punk', 'snare') < -0.001, 'rock snare behind ' + (mean('rock', 'snare') * 1000).toFixed(2) + ' ms, punk ahead ' + (mean('punk', 'snare') * 1000).toFixed(2) + ' ms');
  if (process.env.FEEL_NUMBERS) console.log('numbers: SD loose ' + (loose * 1000).toFixed(2) + ' ms, tight ' + (tight * 1000).toFixed(2) + ' ms; AR lag-1 ' + (sxy / sxx).toFixed(3)
    + '; rock snare ' + (mean('rock', 'snare') * 1000).toFixed(2) + ' ms, punk snare ' + (mean('punk', 'snare') * 1000).toFixed(2) + ' ms (t = 0.5)');
});

test('accent map (F4): downbeat 1, 8 -> 0.94, backbeat snare 1, other quarters 0.9, 8ths 0.8, 16ths 0.66; ghost x 0.45; band flattened; chugs 0.85', () => {
  eq([0, 8, 4, 12, 2, 6, 1, 3, 15].map(s => A.accent(s, 'drum', 'kick')), [1, 0.94, 0.9, 0.9, 0.8, 0.8, 0.66, 0.66, 0.66], 'kick');
  eq([4, 12].map(s => A.accent(s, 'drum', 'snare')), [1, 1], 'the snare backbeat');
  ok(near(A.accent(4, 'drum', 'snare', 'ghost'), 0.45) && near(A.accent(2, 'drum', 'snare', 'rim'), 0.8 * 0.45) && near(A.accent(0, 'drum', 'snare', 'brush'), 0.45), 'ghost / rim / brush x 0.45');
  ok(near(A.accent(0, 'bass'), 1) && near(A.accent(1, 'gtr'), 0.5 + 0.5 * 0.66) && near(A.accent(8, 'lead'), 0.97), 'band: 0.5 + 0.5 x map');
  eq([0, 3, 8].map(s => A.accent(s, 'gtr', null, 'mute')), [0.85, 0.85, 0.85], 'palm-muted chugs: even 0.85');
  ok(near(A.accent(0, 'drum', 'kick', null, 'sparse'), 0.86) && near(A.accent(0, 'drum', 'kick', null, 'break'), 1.04) && near(A.accent(0, 'bass', null, null, 'solo'), 0.9), 'section dynamics');
  ok(near(A.accent(-1, 'drum', 'hat'), 0.66) && near(A.accent(16, 'drum', 'kick'), 1), 'off the grid = a 16th; step wraps');
});

test('feelPlan velocity: the accent map under the noise (downbeats > offbeats), sections, the ramp, steps stay 1', () => {
  const g = 'rock', tl = A.timeline(fullSong(g, 120), { genre: g, songId: 's6' }), F = A.feelFor(null, g, {});
  for (const k of Object.keys(F.byKind)) F.byKind[k].velSd = 0;   // no noise: the map itself
  const P = A.feelPlan(tl, F, 3, {}), kick = {}, cx = [];
  let cur = null;
  tl.events.forEach((e, i) => {
    if (e.kind === 'step') { cur = e; return; }
    if (e.kind === 'drum' && e.lane === 'kick' && cur && cur.role === 'full') { const s = Math.round(e.beat * 4) % 16; (kick[s] = kick[s] || []).push(P.vel[i]); }
    if (e.kind === 'drum' && e.lane === 'snare' && cur) cx.push({ role: cur.role, v: P.vel[i], step: Math.round(e.beat * 4) % 16, variant: e.v });
  });
  ok(kick[0] && kick[0].every(v => v >= 0.99), 'full kick downbeat ~ 1 (+ the ramp): ' + JSON.stringify(kick[0] && kick[0].slice(0, 4)));
  const off = Object.keys(kick).filter(s => s % 2 === 1).map(s => kick[s]).flat();
  ok(!off.length || Math.max.apply(null, off) < 0.75, 'kick 16ths quieter: ' + JSON.stringify(off.slice(0, 4)));
  const sp = cx.filter(x => x.role === 'sparse' && (x.step === 4 || x.step === 12) && !x.variant).map(x => x.v), fu = cx.filter(x => x.role === 'full' && (x.step === 4 || x.step === 12) && !x.variant).map(x => x.v);
  ok(sp.length && fu.length && Math.min.apply(null, sp) >= 0.86 - 1e-6 && Math.max.apply(null, sp) <= 0.86 * 1.08 + 1e-6 && Math.min.apply(null, fu) >= 1 - 1e-6, 'sparse backbeat 0.86, full 1 (ramp <= +8 %)');
  const Pn = A.feelPlan(tl, A.feelFor(null, g, {}), 3, {});
  ok(Math.abs(Pn.stats.meanVel - P.stats.meanVel) < 0.03, 'noise is zero-mean: ' + Pn.stats.meanVel.toFixed(3) + ' vs ' + P.stats.meanVel.toFixed(3));
});

test('tapVel (F5): judgement x beat position x hands, +- 0.03, clamp 0.45..1', () => {
  const v = (j, step, lane, extra) => A.tapVel(Object.assign({ judgement: j, step, lane, rnd: 0.5 }, extra || {}));
  eq([v('perfect', 0, 'kick'), v('good', 0, 'kick'), v('fill', 0, 'kick'), v(null, 0, 'kick'), v('count', 0, 'kick')], [1, 0.86, 0.76, 0.62, 0.7], 'judgements');
  eq([v('perfect', 4, 'kick'), v('perfect', 4, 'snare'), v('perfect', 12, 'snare'), v('perfect', 8, 'hat'), v('perfect', 2, 'hat'), v('perfect', 3, 'hat')], [0.96, 1, 1, 0.96, 0.9, 0.82], 'beat position');
  ok(near(v('good', 3, 'kick'), 0.86 * 0.82, 1e-12), 'good 16th');
  ok(v('perfect', 0, 'snare') > v('good', 3, 'snare'), 'a Perfect downbeat lands harder than a Good offbeat');
  eq([v('perfect', 2, 'hat', { prevHatT: 1, t: 1.1, run: 1 }), v('perfect', 2, 'hat', { prevHatT: 1, t: 1.1, run: 2 }), v('perfect', 2, 'hat', { prevHatT: 1, t: 1.2, run: 1 })].map(x => Math.round(x * 1e6) / 1e6), [Math.round(0.9 * 0.84 * 1e6) / 1e6, 0.9, 0.9], 'fast hat runs (< 150 ms) alternate 1 / 0.84');
  eq([v('perfect', 0, 'kick', { rnd: 1 }), v('perfect', 0, 'kick', { rnd: 0 })], [1, 0.97], '+- 0.03 (clamped at 1)');
  ok(near(A.tapVel({ judgement: null, step: 3, lane: 'hat', prevHatT: 0, t: 0.1, run: 1, rnd: 0 }), Math.max(0.45, 0.62 * 0.82 * 0.84 - 0.03), 1e-12), 'stray 16th off-hand: floor 0.45');
  const r1 = A.tapVel({ judgement: 'perfect', step: 0, lane: 'kick', t: 1.234 }), r2 = A.tapVel({ judgement: 'perfect', step: 0, lane: 'kick', t: 1.234 });
  ok(r1 === r2 && r1 >= 0.97 && r1 <= 1, 'default random: a hash of t + lane (deterministic)');
  eq(A.TAP_AUTO, { hat: 0.88, kick: 0.9, double: 0.82, other: 0.88 }, 'auto strokes');
});

test('debug(feel): the last FEEL and the last plan', () => {
  const tl = A.timeline(fullSong('punk'), { genre: 'punk', songId: 's7' }), F = A.feelFor(null, 'punk', { studio: true });
  A.feelPlan(tl, F, 1, { gig: true });
  const d = GG.debug('feel');
  ok(d && d.genre === 'punk' && d.studio === true && d.byKind && d.byKind.snare.pushMs < 0 && d.lastPlan && d.lastPlan.gig === true && d.lastPlan.n === tl.events.length, JSON.stringify(d).slice(0, 300));
});

done('sim_feel');
