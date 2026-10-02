// perf_size.js: dist/game.html size, gzip -9, brotli, and per-module raw/gzip (script tags as build.js writes them).
const fs = require('fs'), zlib = require('zlib'), path = require('path');
const f = process.argv[2] || path.join(__dirname, 'dist', 'game.html'), html = fs.readFileSync(f);
const gz = b => zlib.gzipSync(b, { level: 9 }).length, br = b => zlib.brotliCompressSync(b).length, KB = n => (n / 1024).toFixed(0);
console.log('game.html raw', html.length, '(' + (html.length / 1e6).toFixed(2) + ' MB, ' + KB(html.length) + ' KiB) gzip-9', gz(html), '(' + (gz(html) / 1e6).toFixed(2) + ' MB) brotli', br(html));
const three = path.join(__dirname, 'tests', '.cache', 'three-0.149.0.min.js');
if (fs.existsSync(three)) { const t = fs.readFileSync(three); console.log('three.min.js (cdnjs, not in the budget)', t.length, 'gzip', gz(t)); }
const s = html.toString('utf8'), re = /<script>\/\* ([^*]+) \*\/\n([\s\S]*?)\n<\/script>/g, mods = []; let m;
while ((m = re.exec(s))) { const b = Buffer.from(m[2]); mods.push([m[1], b.length, gz(b)]); }
const groups = {}; for (const [n, r, g] of mods) { const k = /^content\/zz_band/.test(n) ? 'content: band packs' : /^content\//.test(n) ? 'content: shared' : /^30_audio/.test(n) ? 'audio' : /^4/.test(n) ? 'render' : /^5/.test(n) ? 'ui' : /^2/.test(n) ? 'sims' : 'core'; groups[k] = groups[k] || [0, 0]; groups[k][0] += r; groups[k][1] += g; }
console.log('\nby group (raw KiB / gzip KiB):'); Object.entries(groups).sort((a, b) => b[1][0] - a[1][0]).forEach(([k, v]) => console.log('  ' + k.padEnd(22), KB(v[0]).padStart(6), KB(v[1]).padStart(6)));
console.log('\ntop 15 modules (raw KiB / gzip KiB):'); mods.sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(x => console.log('  ' + x[0].padEnd(36), KB(x[1]).padStart(6), KB(x[2]).padStart(6)));
// comment share (rough): lines whose trimmed text starts with // in JS modules
let com = 0, tot = 0; for (const x of s.split('\n')) { tot += x.length + 1; const t = x.trim(); if (t.startsWith('//') || t.startsWith('/*') || t.startsWith('*')) com += x.length + 1; }
console.log('\nfull-line comments ~', KB(com), 'KiB of', KB(tot), 'KiB (' + (100 * com / tot).toFixed(1) + '%)');
const lead = s.split('\n').reduce((a, x) => a + (x.length - x.trimStart().length), 0); console.log('leading indentation ~', KB(lead), 'KiB');
