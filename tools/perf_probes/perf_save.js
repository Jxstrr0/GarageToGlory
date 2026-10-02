// perf_save.js: save-code length after a YEARS-year bot career (GG.career.botWeek, as tools/balance.js), per band x bot style x seed.
// Run (from the scratch dir; loads the repo's src/ through tests/_load.js, read-only): YEARS=6 SEEDS=3 node perf_save.js
// Prints: toCode() length (what the player copies), the JSON length (what localStorage holds per slot), and the top-level
// keys by JSON size (where a v1.0 Hall of Fame / achievements / history trim would land).
const path = require('path'), fs = require('fs');
const REPO = process.env.REPO || '/home/user/GarageToGlory';
const load = require(path.join(REPO, 'tests', '_load'));
const YEARS = +(process.env.YEARS || 6), SEEDS = +(process.env.SEEDS || 3), STYLES = (process.env.STYLES || 'avg,good').split(',');
const GG = load({ localStorage: load.fakeStorage() });
const WPY = GG.contracts.WEEKS_PER_YEAR, bands = Object.keys(GG.content.bands);
const rows = [], keyAgg = {};
for (const b of bands) for (const style of STYLES) for (let seed = 1; seed <= SEEDS; seed++) {
  const t0 = Date.now();
  const s = GG.career.newCareer({ seed: seed * 7919, bandId: b, player: { name: 'Bot' } });
  for (let w = 0; w < YEARS * WPY; w++) GG.career.botWeek(s, style);
  const json = JSON.stringify(s), code = GG.save.toCode(s);
  const back = GG.save.fromCode(code); const same = JSON.stringify(back) === json;
  rows.push({ b, style, seed, code: code.length, json: json.length, same, ms: Date.now() - t0, year: s.year, week: s.week });
  for (const k of Object.keys(s)) { const n = JSON.stringify(s[k] === undefined ? null : s[k]).length; keyAgg[k] = keyAgg[k] || []; keyAgg[k].push(n); }
}
const avg = a => Math.round(a.reduce((x, y) => x + y, 0) / a.length), max = a => Math.max.apply(null, a);
console.log('save code after ' + YEARS + ' bot years (' + SEEDS + ' seeds per band x style):');
for (const b of bands) for (const style of STYLES) {
  const r = rows.filter(x => x.b === b && x.style === style);
  console.log('  ' + (b + ' ' + style).padEnd(28), 'code avg', avg(r.map(x => x.code)), 'max', max(r.map(x => x.code)), '| json avg', avg(r.map(x => x.json)), 'max', max(r.map(x => x.json)), '| round-trip', r.every(x => x.same) ? 'ok' : 'MISMATCH', '| ' + avg(r.map(x => x.ms)) + ' ms/career');
}
console.log('  ALL'.padEnd(30), 'code avg', avg(rows.map(x => x.code)), 'max', max(rows.map(x => x.code)), '| json avg', avg(rows.map(x => x.json)), 'max', max(rows.map(x => x.json)));
console.log('top-level keys by JSON chars (avg over careers):');
Object.entries(keyAgg).map(([k, a]) => [k, avg(a), max(a)]).sort((a, b) => b[1] - a[1]).slice(0, 14).forEach(([k, a, m]) => console.log('  ' + k.padEnd(18), String(a).padStart(7), 'max', m));
fs.mkdirSync(path.join(__dirname, 'results'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'results', 'save_y' + YEARS + '.json'), JSON.stringify({ rows, keys: Object.entries(keyAgg).map(([k, a]) => [k, avg(a), max(a)]) }, null, 1));
