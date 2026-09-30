// v0.8.3 drum sync: the pure helpers in 11_settings (GG.prefs.sync*) and the booking algebra of 55_ui_gig's drum sync.
const load = require('./_load');
const { test, ok, eq, done } = require('./_t');

const GG = load({ localStorage: load.fakeStorage() });
const P = GG.prefs;
const near = (a, b, e) => Math.abs(a - b) < (e || 1e-9);

test('normalize: drumSync defaults on, syncDisp defaults to 25 ms and clamps to 10..40', () => {
  eq(P.normalize({}).drumSync, true);
  eq(P.normalize({ drumSync: false }).drumSync, false);
  eq(P.normalize({}).syncDisp, 25);
  eq(P.normalize({ syncDisp: 3 }).syncDisp, 10);
  eq(P.normalize({ syncDisp: 99 }).syncDisp, 40);
  eq(P.normalize({ syncDisp: 'x' }).syncDisp, 25);
  eq(P.normalize({}).calib.speaker.vat, 0);
  P.set({ drumSync: false }); eq(P.get().drumSync, false);
  P.set({ drumSync: true }); eq(P.get().drumSync, true);
});

test('setCalib stamps vat only when the visual offset is written', () => {
  const a = P.setCalib('headphones', { audio: 40, at: 5 });
  eq(a.vat, 0);
  const b = P.setCalib('headphones', { visual: 0, at: 7 });
  eq([b.visual, b.vat, b.audio], [0, 7, 40]);
  P.setCalib('headphones', { audio: 0 });
});

test('syncLead: K = clamp(dispatch, 10..40 ms) + 5 ms lead + 15 ms margin', () => {
  ok(near(P.syncLead(undefined), 0.045), 'default 25 ms');
  ok(near(P.syncLead(0.002), 0.030), 'clamped up');
  ok(near(P.syncLead(0.2), 0.060), 'clamped down');
  ok(near(P.syncLead(0.035), 0.055), 'in range');
});

test('syncSnap: a hit snaps to its note inside [-15 ms, +15 ms], else keeps its own time', () => {
  eq(P.syncSnap(1.012, 1, true), 1);
  eq(P.syncSnap(1.015, 1, true), 1);        // the edge (float noise must not flip it)
  eq(P.syncSnap(1.016, 1, true), 1.016);    // past M
  eq(P.syncSnap(0.986, 1, true), 1);
  eq(P.syncSnap(0.984, 1, true), 0.984);    // early past SNAP_EARLY: sounds early, as tapped
  eq(P.syncSnap(1.01, 1, false), 1.01);     // a miss
  eq(P.syncSnap(1.01, null, true), 1.01);   // no note
});

test('syncWhen: never before now + 5 ms', () => {
  ok(near(P.syncWhen(0.5, 10, 10.6), 10.605), 'past -> now + 5 ms');
  ok(near(P.syncWhen(0.5, 10, 10.2), 10.5), 'ahead -> on the band grid');
});

test('syncP90 / syncBlend', () => {
  eq(P.syncP90([0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01]), null);
  const a = []; for (let i = 1; i <= 20; i++) a.push(i / 1000);
  ok(near(P.syncP90(a), 0.019), 'p90 of 1..20 ms = 19 ms');
  eq(P.syncP90(new Array(10).fill(0.005)), 0.010);
  ok(near(P.syncBlend(0.025, 0.035), 0.030), 'blend');
  eq(P.syncBlend(0.025, null), 0.025);
});

test('syncVisual: 30 ms only when the light check never ran', () => {
  ok(near(P.syncVisual({ visual: 0 }), 0.03), 'never measured');
  ok(near(P.syncVisual({ visual: 0 }, true), 0), 'measured 0 stays 0');
  ok(near(P.syncVisual({ visual: 0.05 }), 0.05), 'measured');
  ok(near(P.syncVisual({ visual: -0.02 }), -0.02), 'negative');
});

test('property: a perfect tap up to M late with dispatch <= p90 books exactly on the band grid', () => {
  const rng = GG.RNG(8302), S = P.SYNC;
  let bad = 0, worst = 0;
  for (let i = 0; i < 2000; i++) {
    const disp = S.DISP_MIN + rng.next() * (S.DISP_MAX - S.DISP_MIN);   // the p90 in its clamp range
    const d = rng.next() * disp, x = rng.next() * (S.M - 1e-6), lat = rng.next() * 0.2;
    const K = P.syncLead(disp), D = lat + K, zb = 100 + rng.next() * 50, noteT = rng.next() * 120;
    const J = noteT + x;                 // judged on the game clock (zeroGame = zb - D)
    const R = zb + J + lat - D;          // ctx time of the touch (heard = ctx - lat)
    const when = P.syncWhen(P.syncSnap(J, noteT, true), zb, R + d);
    const err = Math.abs(when - (zb + noteT)); worst = Math.max(worst, err);
    if (err > 1e-9) bad++;
  }
  eq(bad, 0, 'worst ' + worst);
});

done('sync');
