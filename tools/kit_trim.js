// tools/kit_trim.js (v1.2 Lane I, handoff F17.1): measures a sampled kit's per-lane trim. For each lane (kick, snare, toms
// 0 / 1 / 2) it renders the 1.1 synth hit on the pro tier (renderOffline({ lane, quality: 2 }), no vel = the 1.1 recipe) and
// the kit's sample at vel 0.85 (the same chain + room), and compares the first-100 ms RMS (from the hit). trim = the kit's
// current trim + (synth - sample) dB, so the lane matches within +-1 dB. Run with the kit built (node build.js first).
//   node tools/kit_trim.js [--genre metal] [--write <trim.json>]   -> prints a table; --write saves { kick, snare, toms: [3] }
//   then: python3 tools/make_kit.py --trim <trim.json> && node build.js && node tools/kit_trim.js (to verify: |delta| <= 1 dB)
const fs = require('fs');
const { openLab } = require('./_audio_lab');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };

async function measure(opts) {
  opts = opts || {};
  const lab = await openLab({ classic: false });
  try {
    return await lab.page.evaluate(async (genre) => {
      const A = GG.audio, kit = A.sampleKit(genre, 2);
      if (!kit) return { error: 'no sampled kit for ' + genre + ' tier 2' };
      const rows = [['kick', null, 'kick'], ['snare', null, 'snare'], ['toms', 0, 'toms0'], ['toms', 1, 'toms1'], ['toms', 2, 'toms2']];
      const rms100 = b => { const sr = b.sampleRate, i0 = Math.round(0.05 * sr), i1 = i0 + Math.round(0.1 * sr); let s = 0, n = 0;
        for (let c = 0; c < b.numberOfChannels; c++) { const d = b.getChannelData(c); for (let i = i0; i < i1; i++) { s += d[i] * d[i]; n++; } } return Math.sqrt(s / n); };
      const db = x => 20 * Math.log10(x + 1e-12), out = { kit: kit.id, trim: kit.trim, lanes: {} };
      for (const [lane, v, key] of rows) {
        const synth = await A.renderOffline({ genre, lane, variant: v, quality: 2 });
        const dbs = [];
        let used = 0;
        for (let h = 0; h < 5; h++) { const s = await A.renderOffline({ genre, lane, variant: v, quality: 2, vel: 0.85, hit: h }); dbs.push(db(rms100(s.buffer))); used += s.kitUsed; }
        const mean = dbs.reduce((a, x) => a + x, 0) / dbs.length, sy = db(rms100(synth.buffer));
        out.lanes[key] = { synthDb: +sy.toFixed(2), sampleDb: +mean.toFixed(2), spread: +(Math.max(...dbs) - Math.min(...dbs)).toFixed(2), delta: +(sy - mean).toFixed(2), used };
      }
      const cur = kit.trim || {}, t = cur.toms || [0, 0, 0], L = out.lanes;
      out.newTrim = { kick: +((cur.kick || 0) + L.kick.delta).toFixed(2), snare: +((cur.snare || 0) + L.snare.delta).toFixed(2),
        toms: [0, 1, 2].map(i => +((t[i] || 0) + L['toms' + i].delta).toFixed(2)) };
      return out;
    }, opts.genre || 'metal');
  } finally { await lab.close(); }
}
module.exports = { measure };

if (require.main === module) {
  (async () => {
    const r = await measure({ genre: arg('--genre', 'metal') });
    if (r.error) { console.log(r.error); process.exitCode = 1; return; }
    console.log('kit ' + r.kit + ' (trim now ' + JSON.stringify(r.trim) + ')');
    for (const [k, v] of Object.entries(r.lanes)) console.log('  ' + k.padEnd(6) + ' synth ' + v.synthDb.toFixed(2) + ' dB  sample ' + v.sampleDb.toFixed(2) + ' dB (rr spread ' + v.spread + ')  delta ' + v.delta.toFixed(2) + ' dB  kit hits ' + v.used);
    console.log('new trim ' + JSON.stringify(r.newTrim));
    const out = arg('--write', null);
    if (out) { fs.writeFileSync(out, JSON.stringify(r.newTrim) + '\n'); console.log('wrote ' + out); }
  })().catch(e => { console.error(e); process.exitCode = 1; });
}
