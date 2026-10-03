// tools/audio_hashes.js (v1.2 "Soundcheck" stage 0, handoff F3.1 / F13): the classic-sound regression hashes.
//
//   node build.js && node tools/audio_hashes.js            verify: classic on (GG.audio.classic(true) when it exists), render
//                                                         every case in tests/fixtures/audio_v11_hashes.json, compare SHA-1s
//                                                         (exit 1 on any mismatch). ONLY=song,tap|metal (comma list of key
//                                                         prefixes) narrows it. ~3 min.
//   node tools/audio_hashes.js --write [--force]           (1.1.0.0 only, unless --force) render every case of
//                                                         _audio_lab.hashCases() twice in one browser and once more in a
//                                                         fresh browser; writes the fixture only if all three agree.
// Long runs go to a log in the background (process rule). Cases, the hash method and the Math.random guard: tools/_audio_lab.js.
// The 1.2 lanes must keep these equal with classic on: every Soundcheck path bypassed, 1.1 recipes byte for byte.
const fs = require('fs'), path = require('path');
const lab = require('./_audio_lab');

const VERSION = fs.readFileSync(path.join(lab.ROOT, 'VERSION'), 'utf8').trim();
const log = s => console.log(new Date().toISOString().slice(11, 19) + ' ' + s);
const want = (key, only) => !only || !only.length || only.some(p => key.startsWith(p) || key.includes('|' + p + '|') || key.endsWith('|' + p));

// Renders `cases` [{ key, spec }] in an open lab page -> { key: { sha1, n, ch, sr, peak, rms, nan, ms } }.
async function renderAll(page, cases, tag, quiet) {
  const out = {};
  for (let i = 0; i < cases.length; i++) {
    const c = cases[i], t0 = Date.now();
    out[c.key] = await page.evaluate(s => window.__lab.hashCase(s), c.spec);
    out[c.key].ms = Date.now() - t0;
    if (!quiet && (c.key.startsWith('song|') || i % 40 === 0)) log(`${tag} ${i + 1}/${cases.length} ${c.key} ${out[c.key].sha1.slice(0, 10)} ${out[c.key].ms} ms`);
  }
  return out;
}

// Verify against the fixture (classic on). -> { n, bad: [{ key, want, got }], ms, info }
async function verify(opts) {
  opts = opts || {};
  const fx = JSON.parse(fs.readFileSync(lab.FIXTURE, 'utf8'));
  const cases = Object.keys(fx.cases).filter(k => want(k, opts.only)).map(k => ({ key: k, spec: fx.cases[k].spec }));
  const L = await lab.openLab({ classic: true });
  const t0 = Date.now();
  try {
    const got = await renderAll(L.page, cases, 'verify', opts.quiet);
    const bad = [];
    for (const c of cases) {
      const w = fx.cases[c.key], g = got[c.key];
      if (w.sha1 !== g.sha1) bad.push({ key: c.key, want: { sha1: w.sha1, n: w.n, rms: w.rms, peak: w.peak }, got: { sha1: g.sha1, n: g.n, rms: g.rms, peak: g.peak } });
    }
    return { n: cases.length, bad, ms: Date.now() - t0, info: L.info, errors: L.errors.slice() };
  } finally { await L.close(); }
}

async function write(force) {
  if (VERSION !== '1.1.0.0' && !force) throw new Error('the fixture is the 1.1.0.0 baseline: VERSION is ' + VERSION + ' (use --force to overwrite anyway)');
  const cases = lab.hashCases();
  log(`writing ${cases.length} cases (VERSION ${VERSION}); pass A1 + A2 (one browser), pass B (a fresh browser)`);
  let A1, A2, B, info;
  const LA = await lab.openLab({ classic: true });
  let chromium = null;
  try { info = LA.info; chromium = LA.browser.version(); A1 = await renderAll(LA.page, cases, 'A1'); A2 = await renderAll(LA.page, cases, 'A2'); }
  finally { await LA.close(); }
  const LB = await lab.openLab({ classic: true });
  try { B = await renderAll(LB.page, cases, 'B'); }
  finally { await LB.close(); }
  const diff = cases.filter(c => A1[c.key].sha1 !== A2[c.key].sha1 || A1[c.key].sha1 !== B[c.key].sha1).map(c => c.key);
  if (diff.length) { log('NOT DETERMINISTIC: ' + diff.join(', ')); process.exitCode = 1; return; }
  const out = { version: VERSION, made: new Date().toISOString().slice(0, 10),
    method: 'SHA-1 of the rendered AudioBuffer Float32 samples as raw little-endian bytes, channel 0 then 1 (prerender: mono); ' +
      'GG.audio.renderOffline (44.1 kHz) / prerenderHit on a fresh title screen (no career), Math.random seeded by the page (unused by 1.1 audio), ' +
      'every fan-in summed in connection order (the lab SUM_ORDER patch: Chromium otherwise sums 3+ connections in pointer-hash order, last-bit noise); ' +
      'specs: tools/_audio_lab.js hashCases(); pattern {signature} = GG.songs.signature(genre), bars "song" = arrangement x 4',
    determinism: { passes: ['A1', 'A2 (same browser)', 'B (fresh browser)'], cases: cases.length, identical: cases.length, game: info && info.version, chromium },
    cases: {} };
  for (const c of cases) { const r = A1[c.key]; out.cases[c.key] = { spec: c.spec, sha1: r.sha1, n: r.n, ch: r.ch, sr: r.sr, peak: r.peak, rms: r.rms, nan: r.nan }; }
  const nan = cases.filter(c => A1[c.key].nan).map(c => c.key);
  fs.mkdirSync(path.dirname(lab.FIXTURE), { recursive: true });
  fs.writeFileSync(lab.FIXTURE, JSON.stringify(out, null, 1) + '\n');
  const ms = k => cases.filter(c => c.key.startsWith(k)).reduce((s, c) => s + A1[c.key].ms + A2[c.key].ms + B[c.key].ms, 0);
  log(`wrote ${path.relative(lab.ROOT, lab.FIXTURE)}: ${cases.length} cases, all three passes identical; NaN in ${nan.length ? nan.join(',') : 'none'}; ` +
    `render ms (3 passes) songs ${ms('song|')}, taps ${ms('tap|')}, pre ${ms('pre|')}, rest ${ms('sec|') + ms('seat|') + ms('vox|') + ms('probe|') + ms('radio|')}`);
}

if (require.main === module) {
  const args = process.argv.slice(2), only = (process.env.ONLY || '').split(',').filter(Boolean);
  (async () => {
    if (args.includes('--write')) return write(args.includes('--force'));
    const r = await verify({ only });
    log(`classic api ${r.info.classicApi} (classic ${r.info.classic}), VERSION ${r.info.version}: ${r.n - r.bad.length}/${r.n} equal to the 1.1 fixture in ${Math.round(r.ms / 1000)} s`);
    r.bad.slice(0, 40).forEach(b => log('MISMATCH ' + b.key + ' want ' + JSON.stringify(b.want) + ' got ' + JSON.stringify(b.got)));
    if (r.errors.length) log('console errors: ' + r.errors.slice(0, 5).join(' | '));
    if (r.bad.length || r.errors.length) process.exitCode = 1;
  })().catch(e => { console.error(e.stack || e); process.exitCode = 1; });
}
module.exports = { verify, renderAll };
