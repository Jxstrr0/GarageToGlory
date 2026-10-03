// tools/audio_numbers.js (v1.2 "Soundcheck" stage 0, handoff F13): the band-energy tables per genre -> a section of
// plan/v12_audio_numbers.txt (replaced in place when it exists).
//
//   node build.js && node tools/audio_numbers.js [--section 1.2] [--classic]
//     --section: the label (default: VERSION's major.minor, e.g. "1.1"); --classic: GG.audio.classic(true) first (1.2+).
//     SPEC_EXTRA='{"k":v}' merges options into every spec (e.g. what 1.2 needs to render with feel). ~1.5 min.
// Renders the song cases of tools/_audio_lab.js (each genre's signature song, its whole arrangement, kit tier 2 = the
// reference outside a career): full mix, drums only, band only (band + vocals). Per render: the 5 F13 bands (0-150, 150-500,
// 500-1.5k, 1.5-4k, 4k+ Hz) in dB (10 log10(mean square x the band's share of the spectrum), the pw_seq __bands method
// with the F13 edges), RMS and peak in dBFS, stereo width (side / mid energy). F13 targets for 1.2: mean RMS within 1 dB of
// 1.1, the 4k+ band not up by more than 3 dB, peaks under the ceiling, width logged.
const fs = require('fs'), path = require('path');
const lab = require('./_audio_lab');

const OUT = path.join(lab.ROOT, 'plan', 'v12_audio_numbers.txt');
const VERSION = fs.readFileSync(path.join(lab.ROOT, 'VERSION'), 'utf8').trim();
const HEAD = '# v1.2 "Soundcheck" audio numbers (handoff F13; tools/audio_numbers.js). One section per build; the 1.1 section is the\n' +
  '# baseline measured before any audio change. Bands: dB = 10 log10(mean square x band share); width = side/mid energy.\n';

function arg(name) { const a = process.argv.indexOf(name); return a >= 0 ? process.argv[a + 1] : null; }

async function measure(opts) {
  const cases = lab.hashCases().filter(c => c.key.startsWith('song|'));
  const L = await lab.openLab({ classic: !!opts.classic, extra: lab.specExtra(), nativeSum: true });   // (levels: last-bit summing order is irrelevant)
  const rows = [];
  try {
    for (const c of cases) {
      const t0 = Date.now();
      const r = await L.page.evaluate(async a => { const x = await window.__lab.render(a.spec); return window.__lab.bands(x.buffer, a.edges); }, { spec: c.spec, edges: lab.F13_EDGES });
      const [, genre, mix] = c.key.split('|');
      rows.push(Object.assign({ genre, mix, ms: Date.now() - t0 }, r));
      console.log(c.key + ' ' + JSON.stringify(r));
    }
    return { rows, info: L.info, errors: L.errors.slice() };
  } finally { await L.close(); }
}

function table(label, res, opts) {
  const p = (s, n) => String(s).padStart(n);
  const lines = [`## ${label} (VERSION ${VERSION}, ${new Date().toISOString().slice(0, 10)}; classic ${opts.classic ? 'on' : 'off'}` +
    (process.env.SPEC_EXTRA ? `; SPEC_EXTRA ${process.env.SPEC_EXTRA}` : '') + ')',
    'genre    mix    | 0-150 150-500 500-1.5k 1.5-4k   4k+ |  RMS dBFS  peak dBFS  width |  secs',
    '-------- ------ | ----- ------- -------- ------ ----- | --------- ---------- ------ | -----'];
  for (const r of res.rows) {
    lines.push(`${r.genre.padEnd(8)} ${r.mix.padEnd(6)} | ${p(r.dB[0], 5)} ${p(r.dB[1], 7)} ${p(r.dB[2], 8)} ${p(r.dB[3], 6)} ${p(r.dB[4], 5)} | ` +
      `${p(r.rmsDb, 9)} ${p(r.peakDb, 10)} ${p(r.width.toFixed(3), 6)} | ${p(r.secs, 5)}`);
  }
  const full = res.rows.filter(r => r.mix === 'full'), mean = k => (full.reduce((s, r) => s + r[k], 0) / full.length).toFixed(2);
  lines.push(`mean over the 4 full mixes: RMS ${mean('rmsDb')} dBFS, 4k+ ${(full.reduce((s, r) => s + r.dB[4], 0) / full.length).toFixed(2)} dB, peak ${mean('peakDb')} dBFS, width ${(full.reduce((s, r) => s + r.width, 0) / full.length).toFixed(3)}`);
  lines.push('share (band energy fractions, full mix): ' + full.map(r => r.genre + ' ' + r.share.join('/')).join(' ; '));
  lines.push('json ' + JSON.stringify(res.rows.map(r => ({ g: r.genre, mix: r.mix, dB: r.dB, rmsDb: r.rmsDb, peakDb: r.peakDb, width: r.width, secs: r.secs }))));
  return lines.join('\n') + '\n';
}

function writeSection(label, text) {
  let cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : HEAD;
  const parts = cur.split(/\n(?=## )/), head = parts[0].startsWith('## ') ? HEAD : parts[0] + '\n';
  const secs = (parts[0].startsWith('## ') ? parts : parts.slice(1)).map(s => s.trimEnd() + '\n');
  const i = secs.findIndex(s => s.startsWith('## ' + label + ' '));
  if (i >= 0) secs[i] = text; else secs.push(text);
  fs.writeFileSync(OUT, head.trimEnd() + '\n\n' + secs.join('\n'));
}

if (require.main === module) {
  const opts = { classic: process.argv.includes('--classic') }, label = arg('--section') || VERSION.split('.').slice(0, 2).join('.');
  measure(opts).then(res => {
    if (res.errors.length) { console.error('console errors: ' + res.errors.join(' | ')); process.exitCode = 1; }
    const t = table(label, res, opts);
    writeSection(label, t);
    console.log(t + 'wrote section "' + label + '" -> ' + path.relative(lab.ROOT, OUT));
  }).catch(e => { console.error(e.stack || e); process.exitCode = 1; });
}
module.exports = { measure, table };
