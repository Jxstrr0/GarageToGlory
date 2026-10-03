// v1.2 "Soundcheck" Lane I (handoff F17.3): the sampled kit modules (GG.content.kits; TMKD "Vortex" ships in every build).
// Module shape (5 kick / 5 snare / 3 x 5 toms, MP3 base64, genres, tiers, trim), the credit names The Metal Kick Drum and Rafa
// Prieto, the LICENSE file sits next to the module, the attribution check (every kit has a credit and the built
// dist/game.html carries it), no raw .wav tracked by git, and A.sampleKit(genre, tier) (metal pro + arena only; Classic -> null).
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const load = require('./_load');
const { test, ok, eq, done } = require('./_t');

const ROOT = path.join(__dirname, '..');
const GG = load({ localStorage: load.fakeStorage() });
new Function('window', fs.readFileSync(path.join(ROOT, 'src', '30_audio.js'), 'utf8'))({ GG: GG });
const K = GG.content.kits || {}, A = GG.audio;

test('module shape: tmkd_vortex = 5 kick, 5 snare, 3 x 5 toms (MP3 base64), metal, tiers 2-3, trims', () => {
  const k = K.tmkd_vortex;
  ok(k, 'GG.content.kits.tmkd_vortex exists');
  eq([k.id, k.name, k.codec, k.sr], ['tmkd_vortex', 'TMKD Vortex', 'mp3', 44100]);
  eq([k.lanes.kick.length, k.lanes.snare.length, k.lanes.toms.length, k.lanes.toms.map(t => t.length)], [5, 5, 3, [5, 5, 5]], 'clips per lane');
  const all = [].concat(k.lanes.kick, k.lanes.snare, ...k.lanes.toms);
  for (const b of all) {
    ok(typeof b === 'string' && /^[A-Za-z0-9+/]+=*$/.test(b) && b.length > 2000, 'base64');
    const bin = Buffer.from(b, 'base64');
    ok(bin[0] === 0xff && (bin[1] & 0xe0) === 0xe0, 'an MP3 frame sync first (no tags)');
  }
  ok(new Set(all).size === all.length, 'every round robin is its own clip');
  eq(k.genres, ['metal'], 'genres (N8)'); eq(k.tiers, [2, 3], 'pro + arena (N8)');
  ok(isFinite(k.trim.kick) && isFinite(k.trim.snare) && k.trim.toms.length === 3 && k.trim.toms.every(isFinite), 'trim dB per lane');
  const mp3 = all.reduce((s, b) => s + Buffer.from(b, 'base64').length, 0);
  ok(mp3 > 200000 && mp3 < 450000, 'about 0.3 MB of MP3: ' + mp3);
});

test('credit + terms: names The Metal Kick Drum and Rafa Prieto; LICENSE file next to the module', () => {
  const k = K.tmkd_vortex;
  eq(k.credit, 'Drum samples: "Vortex" free pack by The Metal Kick Drum, recorded & processed by Rafa Prieto (© 2019)', 'credit (F17.1)');
  eq(k.terms, 'free to share, credit required, not for sale (src/content/kit_tmkd_vortex.LICENSE.md)', 'terms (F17.1)');
  const lic = path.join(ROOT, 'src', 'content', 'kit_tmkd_vortex.LICENSE.md');
  ok(fs.existsSync(lic), 'LICENSE file exists');
  const t = fs.readFileSync(lic, 'utf8');
  ok(/The Metal Kick Drum/.test(t) && /Rafa Prieto/.test(t) && /not allowed to take\s+> ?credits or sell/.test(t), 'the transcribed terms');
});

test('attribution: every kit has a credit, and the built dist/game.html carries it', () => {
  const html = fs.readFileSync(path.join(ROOT, 'dist', 'game.html'), 'utf8');
  ok(Object.keys(K).length >= 1, 'at least one kit');
  for (const id of Object.keys(K)) {
    ok(typeof K[id].credit === 'string' && K[id].credit.trim().length > 20, id + ': a credit');
    ok(html.includes(K[id].credit), id + ': dist/game.html contains the credit (run node build.js)');
    ok(fs.existsSync(path.join(ROOT, 'src', 'content', 'kit_' + id + '.LICENSE.md')), id + ': its LICENSE file');
  }
});

test('no raw .wav tracked by git (local/ stays out)', () => {
  const out = execFileSync('git', ['ls-files', '*.wav', '*.WAV'], { cwd: ROOT, encoding: 'utf8' }).trim();
  eq(out, '', 'git ls-files *.wav');
  ok(/^local\/$/m.test(fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8')), 'local/ is git-ignored');
});

test('A.sampleKit(genre, tier): metal on pro + arena only; Classic -> null', () => {
  eq([0, 1, 2, 3].map(t => !!A.sampleKit('metal', t)), [false, false, true, true], 'metal tiers');
  for (const g of ['punk', 'rock', 'country']) eq([0, 1, 2, 3].map(t => !!A.sampleKit(g, t)), [false, false, false, false], g + ' never');
  eq(A.sampleKit('metal', 3).id, 'tmkd_vortex');
  A.classic(true);
  eq([A.sampleKit('metal', 2), A.sampleKit('metal', 3)], [null, null], 'Classic on: null');
  A.classic(false);
  ok(A.sampleKit('metal', 2), 'back on');
});

done('sim_kit');
