// perf_thumbs.js: the physical two-thumb load of Hard/Expert charts with 6 lanes + pedal (generated songs, every band):
// max judged notes per moment (rule: 2), peak notes/s over a 1 s window, min gap between judged moments, chords with both
// notes on the same half of the highway (one thumb must cross), "jumps" (consecutive single notes >= 4 lanes apart < 150 ms),
// and lane width at 390 / 440 px. Reads the repo's src/ through tests/_load.js (read-only). Run: SONGS=30 node perf_thumbs.js
const path = require('path');
const load = require(path.join(process.env.REPO || '/home/user/GarageToGlory', 'tests', '_load'));
const GG = load({ localStorage: load.fakeStorage() }), N = +(process.env.SONGS || 30);
const pct = (a, p) => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.min(b.length - 1, Math.floor(p * b.length))] : null; };
for (const diff of ['hard', 'expert']) {
  for (const b of Object.keys(GG.content.bands)) {
    const s = GG.career.newCareer({ seed: 77, bandId: b, player: { name: 'T' } });
    s.gear.lanes = 6; s.gear.doubleKick = true; s.gear.owned = ['toms', 'ride', 'pedal'];
    const st = { maxChord: 0, nps: [], gap: [], sameHalf: 0, chords: 0, jumps: 0, singles: 0, bpm: [], notes: 0, dur: 0 };
    for (let i = 0; i < N; i++) {
      const song = GG.songs.jam(s, GG.RNG(1000 + i)); const sg = song && song.pattern ? song : s.songs[s.songs.length - 1];
      const ch = GG.gig.chart(sg, { difficulty: diff }), notes = ch.notes.filter(n => !n.free && n.li < 6);
      st.bpm.push(ch.bpm); st.notes += notes.length; st.dur += ch.duration;
      const moments = []; for (const n of notes) { const m = moments[moments.length - 1]; if (m && Math.abs(m.t - n.t) < 1e-6) m.ns.push(n); else moments.push({ t: n.t, ns: [n] }); }
      for (let k = 0; k < moments.length; k++) {
        const m = moments[k]; st.maxChord = Math.max(st.maxChord, m.ns.length);
        if (m.ns.length === 2) { st.chords++; const h = m.ns.map(n => n.li < 3 ? 0 : 1); if (h[0] === h[1]) st.sameHalf++; }
        if (k) { const g = m.t - moments[k - 1].t; st.gap.push(g);
          if (m.ns.length === 1 && moments[k - 1].ns.length === 1) { st.singles++; if (g < 0.15 && Math.abs(m.ns[0].li - moments[k - 1].ns[0].li) >= 4) st.jumps++; } }
      }
      let j = 0; for (let k = 0; k < notes.length; k++) { while (notes[k].t - notes[j].t > 1) j++; st.nps.push(k - j + 1); }
    }
    console.log(diff.padEnd(7), b.padEnd(20), 'bpm', Math.min(...st.bpm) + '-' + Math.max(...st.bpm), '| max notes/moment', st.maxChord,
      '| notes/s avg', (st.notes / st.dur).toFixed(1), 'peak(1s) p95', pct(st.nps, 0.95), 'max', Math.max(...st.nps),
      '| min gap', (Math.min(...st.gap) * 1000).toFixed(0) + 'ms', 'p5', (pct(st.gap, 0.05) * 1000).toFixed(0) + 'ms',
      '| chords', st.chords, 'same-half', (100 * st.sameHalf / Math.max(1, st.chords)).toFixed(0) + '%', '| fast jumps(>=4 lanes,<150ms)', st.jumps, '/', st.singles);
  }
}
console.log('lane width at 6 lanes: 390 px ->', (390 / 6).toFixed(0), 'px; 440 px ->', (440 / 6).toFixed(0), 'px (Apple HIG min touch 44 pt)');
