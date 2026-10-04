// tools/audio_clips.js (v1.2 "Soundcheck" stage 0, handoff F13 "Ears"): the owner's listening clips, rendered offline.
//
//   node build.js && node tools/audio_clips.js [--tag v11] [--out DIR] [--classic]
//     --tag: the file prefix (default v<major><minor> from VERSION: v11, v12); --out: the folder (default tests/.cache/clips,
//     gitignored); --classic: GG.audio.classic(true) first (1.2+). SPEC_EXTRA='{"k":v}' merges options into every spec.
// Writes <tag>_<genre>.wav (4 genres) + <tag>_taps.wav + <tag>_clips.json (what was rendered + levels). 16-bit PCM,
// 22,050 Hz stereo (ffmpeg is not installed: encode to .m4a elsewhere if needed).
//   <tag>_<genre>.wav : the band's first starter song (exactly as A.seatPreview builds it outside a career: GG.songs.patternFor
//                       seed 1 + the song's title, song id 'preview|<band>|<title>', the band's singer), chorus -> verse
//                       (-> chorus -> verse, cut at 15 s with a 0.3 s fade), kit tier 2, the kit's own room.
//   <tag>_taps.wav    : the 8-hit "Perfect vs Good" tap demo (_audio_lab.TAP_DEMO: kick / snare quarters at 120 bpm, bar 1
//                       Perfect on the beat, bar 2 Good 35 ms late). 1.2: vel = A.tapVel({ judgement, step, lane, prevHatT,
//                       t }) when it exists, sent as spec.vel (+ spec.hit = the index, for round robins); 1.1 has neither.
//                       Each hit renders alone through the kit chain + room and the hits are summed at their times.
// The 1.2 integrator re-runs this with --tag v12 so both sets share song, sections, length and level path.
//   --metal-kit (1.2): + <tag>_metal_kit.wav = the metal clip on the arena kit (tier 3; F17: the TMKD kit plays at tiers 2-3).
//   --v13 (1.3 "Songwriter", contract §6 item 7): Quick-song clips instead (default out tests/.cache/v13_clips, tag v13):
//     v13_<genre>_default.wav = the genre's first (signature) recipe at its default sliders + bpm, composed with
//     GG.songs.compose on the rhythm seat (4 lanes, no pedal, seed hashSeed('clips|v13')), played with that part on your
//     guitar (renderOffline seat 'rhythm' + part) so Energy / Fills move the guitar as well as the drums; verse -> chorus,
//     kit tier 2, one song id per genre (same key in every clip of a genre), cut at max(8, min(12, 4 bars + 1 s)) s (bar 4's fill is in). metal + rock also: v13_<genre>_<energy|mood|feel|
//     fills><0|4>.wav (one slider at its end stop, the others at the recipe's defaults). + v13_clips.json. Encode to .m4a with
//     ffmpeg -c:a aac -b:a 160k (the integrator does this; ffmpeg is not needed here).
const fs = require('fs'), path = require('path');
const lab = require('./_audio_lab');

const VERSION = fs.readFileSync(path.join(lab.ROOT, 'VERSION'), 'utf8').trim();
function arg(name) { const a = process.argv.indexOf(name); return a >= 0 ? process.argv[a + 1] : null; }

async function clips(opts) {
  const L = await lab.openLab({ classic: !!opts.classic, extra: lab.specExtra(), nativeSum: true });   // (levels: last-bit summing order is irrelevant)
  const made = { version: VERSION, classic: !!opts.classic, extra: process.env.SPEC_EXTRA || null, clips: {} };
  try {
    const cases = lab.clipCases();
    if (opts.metalKit) {   // v1.2 (F17): the sampled-kit metal clip on the arena kit (tier 3); tier 2 (the metal clip above) plays the kit too
      const m = cases.find(c => c.key === 'metal'); cases.push({ key: 'metal_kit', spec: Object.assign({}, m.spec, { quality: 3 }) });
    }
    for (const c of cases) {
      const r = await L.page.evaluate(async a => {
        const x = await window.__lab.render(a.spec), st = window.__lab.stats(x.buffer), pcm = window.__lab.pcm16(x.buffer, a.secs, 0.3);
        return { pcm, st, title: x.title, voice: x.voice, key: x.key ? x.key.name : null, counts: x.counts, kitUsed: x.kitUsed || 0 };
      }, { spec: c.spec, secs: lab.CLIP_SECS });
      const file = path.join(opts.out, `${opts.tag}_${c.key}.wav`);
      fs.writeFileSync(file, lab.wavBytes(Buffer.from(r.pcm.b64, 'base64'), r.pcm.sr));
      made.clips[c.key] = { file: path.basename(file), band: lab.CLIP_BANDS[c.key.split('_')[0]], title: r.title, voice: r.voice, key: r.key, secs: +(r.pcm.frames / r.pcm.sr).toFixed(2),
        rms: r.st.rms, peak: r.st.peak, events: r.counts, spec: c.spec, kitUsed: r.kitUsed };
      console.log(`${file}: ${r.title} (${r.voice}, ${r.key}) rms ${r.st.rms} peak ${r.st.peak}`);
    }
    const D = lab.TAP_DEMO;
    const t = await L.page.evaluate(async D => {
      const A = GG.audio, hits = [], vels = [];
      for (const h of D.hits) {
        const vel = typeof A.tapVel === 'function' ? A.tapVel({ judgement: h.judgement, step: h.step, lane: h.lane, prevHatT: null, t: h.at }) : undefined;
        const spec = { genre: D.genre, lane: h.lane, quality: D.quality };
        if (vel != null) { spec.vel = vel; spec.hit = h.i; }
        const x = await window.__lab.render(spec);
        hits.push({ buffer: x.buffer, at: h.at }); vels.push(vel == null ? null : +(+vel).toFixed(3));
      }
      const m = window.__lab.mix(hits, D.secs, 44100);
      // per-hit peak level (dBFS) in its first 80 ms: Perfect vs Good, audible as numbers too
      const lv = D.hits.map(h => { const a = Math.round(h.at * 44100), L0 = m.getChannelData(0); let p = 0; for (let i = a; i < a + 3528; i++) p = Math.max(p, Math.abs(L0[i])); return +(20 * Math.log10(p + 1e-12)).toFixed(2); });
      return { pcm: window.__lab.pcm16(m, D.secs, 0.3), st: window.__lab.stats(m), vels, lv };
    }, D);
    const file = path.join(opts.out, `${opts.tag}_taps.wav`);
    fs.writeFileSync(file, lab.wavBytes(Buffer.from(t.pcm.b64, 'base64'), t.pcm.sr));
    made.taps = { file: path.basename(file), demo: D, vels: t.vels, hitPeakDb: t.lv, rms: t.st.rms, peak: t.st.peak };
    console.log(`${file}: vel ${JSON.stringify(t.vels)} hit peaks dBFS ${JSON.stringify(t.lv)}`);
    if (L.errors.length) { console.error('console errors: ' + L.errors.join(' | ')); process.exitCode = 1; }
  } finally { await L.close(); }
  fs.writeFileSync(path.join(opts.out, `${opts.tag}_clips.json`), JSON.stringify(made, null, 1) + '\n');
  return made;
}

// 1.3: the Quick-song clips (see the header).
async function clipsV13(opts) {
  const L = await lab.openLab({ classic: false, extra: lab.specExtra(), nativeSum: true });
  const made = { version: VERSION, kind: 'v13', clips: {} };
  try {
    const cases = [];
    for (const g of lab.GENRES) {
      cases.push({ key: g + '_default', genre: g, set: {} });
      if (g === 'metal' || g === 'rock') for (const [name, id] of [['energy', 'energy'], ['mood', 'mood'], ['feel', 'swing'], ['fills', 'fills']]) for (const v of [0, 4]) cases.push({ key: g + '_' + name + v, genre: g, set: { [id]: v } });
    }
    for (const c of cases) {
      const r = await L.page.evaluate(async a => {
        const S = GG.songs, gear = { lanes: 4, doubleKick: false }, rc = S.recipes(a.genre, gear, 'rhythm')[0];
        const o = Object.assign({ recipe: rc.id, bpm: rc.bpm, seed: GG.hashSeed('clips|v13'), gear: gear, seat: 'rhythm' }, rc.sliders, a.set);
        const p = S.compose(a.genre, o), band = GG.content.bands[a.band];
        const m = band && (band.members || []).filter(x => /vocal/i.test(x.role || ''))[0];
        const secs = Math.max(8, Math.min(12, 16 * 60 / p.bpm + 1));
        const x = await window.__lab.render({ genre: a.genre, pattern: p, arrangement: ['verse', 'chorus'], full: true, bars: 8, quality: 2, seconds: secs + 0.4,
          seat: 'rhythm', part: p.part, songId: 'v13|' + a.genre, singer: m ? m.id : undefined });
        const st = window.__lab.stats(x.buffer), pcm = window.__lab.pcm16(x.buffer, secs, 0.3);
        return { pcm, st, key: x.key ? x.key.name : null, counts: x.counts, o: { recipe: o.recipe, energy: o.energy, mood: o.mood, swing: o.swing, fills: o.fills, bpm: p.bpm },
          rating: S.rate(p, a.genre).groove != null ? { groove: S.rate(p, a.genre).groove, hook: S.rate(p, a.genre).hook } : null, fill: !!p.fillBars, swing: p.swing || 0, mood: p.mood, secs };
      }, { genre: c.genre, key: c.key, set: c.set, band: lab.CLIP_BANDS[c.genre] });
      const file = path.join(opts.out, `${opts.tag}_${c.key}.wav`);
      fs.writeFileSync(file, lab.wavBytes(Buffer.from(r.pcm.b64, 'base64'), r.pcm.sr));
      made.clips[c.key] = { file: path.basename(file), key: r.key, secs: +(r.pcm.frames / r.pcm.sr).toFixed(2), rms: r.st.rms, peak: r.st.peak, settings: r.o, rating: r.rating, fillBars: r.fill, events: r.counts };
      console.log(`${file}: ${JSON.stringify(r.o)} key ${r.key} rms ${r.st.rms} peak ${r.st.peak} ${JSON.stringify(r.rating)}`);
    }
    if (L.errors.length) { console.error('console errors: ' + L.errors.join(' | ')); process.exitCode = 1; }
  } finally { await L.close(); }
  fs.writeFileSync(path.join(opts.out, `${opts.tag}_clips.json`), JSON.stringify(made, null, 1) + '\n');
  return made;
}

if (require.main === module && process.argv.includes('--v13')) {
  const out = path.resolve(arg('--out') || path.join(lab.ROOT, 'tests', '.cache', 'v13_clips'));
  fs.mkdirSync(out, { recursive: true });
  clipsV13({ tag: arg('--tag') || 'v13', out }).catch(e => { console.error(e.stack || e); process.exitCode = 1; });
} else if (require.main === module) {
  const tag = arg('--tag') || 'v' + VERSION.split('.').slice(0, 2).join('');
  const out = path.resolve(arg('--out') || path.join(lab.ROOT, 'tests', '.cache', 'clips'));
  fs.mkdirSync(out, { recursive: true });
  clips({ tag, out, classic: process.argv.includes('--classic'), metalKit: process.argv.includes('--metal-kit') }).catch(e => { console.error(e.stack || e); process.exitCode = 1; });
}
module.exports = { clips, clipsV13 };
