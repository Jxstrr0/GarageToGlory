// probe_savetime.js: per-week autosave cost on a 10-year good-bot career (node, 1x desktop CPU): save.write (JSON -> storage),
// toCode (compress + checksum) and fromCode (decompress + migrate).
const path = require('path'); const load = require(path.join('/home/user/GarageToGlory', 'tests', '_load'));
const st = load.fakeStorage(), GG = load({ localStorage: st });
const s = GG.career.newCareer({ seed: 7919, bandId: 'gravel_kings', player: { name: 'Bot' } });
for (let w = 0; w < 10 * GG.contracts.WEEKS_PER_YEAR; w++) GG.career.botWeek(s, 'good');
const time = (f, n) => { const t = process.hrtime.bigint(); for (let i = 0; i < n; i++) f(); return Number(process.hrtime.bigint() - t) / 1e6 / n; };
let code; const w = time(() => GG.save.write('auto', s), 20), c = time(() => { code = GG.save.toCode(s); }, 5), d = time(() => GG.save.fromCode(code), 5);
console.log('10y good career: write(auto) ' + w.toFixed(1) + ' ms, toCode ' + c.toFixed(1) + ' ms, fromCode ' + d.toFixed(1) + ' ms (desktop node; x4-x6 on a phone); stored', st._map.get('gg.v1.slot.auto').length, 'chars; code', code.length);
