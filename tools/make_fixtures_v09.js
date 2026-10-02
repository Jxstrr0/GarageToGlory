#!/usr/bin/env node
// tools/make_fixtures_v09.js: writes the v1.0 stage-0 save fixtures tests/fixtures/v09_*.json.gz (gzipped slot records
// { savedAt, version, summary, state }, as GG.save.write stores them, savedAt fixed). They were generated from the 0.9.0.0
// tree (commit 34ad9b2) BEFORE any v1.0 edit, so they hold genuine v0.9 states (no bonusYears / legacy / ach / tutorial):
//   SRC=<a 0.9.0.0 checkout> node tools/make_fixtures_v09.js [outDir]
// Running it on a v1.0 tree makes v1.0 states, which defeats the purpose; regenerate only from the 0.9.0.0 tree.
//   v09_world_y9 : Hail Damage, good bot, World era at totalWeek <= 120, saved at year 9 week 12 (Monday)
//   v09_y10w14   : Frost Heave, good bot, World era at totalWeek <= 144, saved at year 10 week 14 (rival.finalNews set)
//   v09_ended    : Gravel Kings, avg bot, ended at totalWeek 240 (phase 'ended', no state.legacy)
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const ROOT = path.resolve(process.env.SRC || path.join(__dirname, '..'));
const OUT = path.resolve(process.argv[2] || path.join(__dirname, '..', 'tests', 'fixtures'));
const load = require(path.join(ROOT, 'tests', '_load.js'));
const GG = load({ localStorage: load.fakeStorage() });
const WPY = GG.contracts.WEEKS_PER_YEAR;
function worldWeek(s) { const e = (s.eraHistory || []).find(x => x.era === 'world'); return e ? e.week : null; }
function play(bandId, style, seed, stopAt, need) {
  const s = GG.career.newCareer({ seed, bandId, player: { name: 'Fixture', nick: 'Fix' } });
  while (!s.ended && s.totalWeek < stopAt) {
    GG.career.botWeek(s, style);
    if (need && need.worldBy && s.totalWeek > need.worldBy && !worldWeek(s)) return null;   // too slow: next seed
  }
  return s;
}
function find(bandId, style, stopAt, need) {
  for (let seed = 101; seed < 400; seed++) {
    const s = play(bandId, style, seed * 7, stopAt, need);
    if (!s) continue;
    if (need && need.worldBy && !(worldWeek(s) && worldWeek(s) <= need.worldBy)) continue;
    if (need && need.test && !need.test(s)) continue;
    return { seed: seed * 7, s };
  }
  throw new Error('no seed for ' + bandId);
}
function record(s) {
  const band = GG.career.band(s);
  return { savedAt: 1790000000000, version: GG.VERSION,
    summary: { band: band ? band.name : s.bandId, player: s.player ? s.player.name : '', year: s.year, week: s.week, fans: s.fans, fund: s.fund },
    state: s };
}
function write(name, s, seed) {
  const json = JSON.stringify(record(s)), gz = zlib.gzipSync(json, { level: 9 });
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name + '.json.gz'), gz);
  console.log(name + ': ' + s.bandId + ' seed ' + seed + ' wk ' + s.totalWeek + ' (y' + s.year + ' w' + s.week + ', ' + s.phase + ')' +
    ' world wk ' + worldWeek(s) + ' finalNews ' + !!(s.rival && s.rival.finalNews) + ' ended ' + !!s.ended +
    ' | json ' + json.length + ' chars, gz ' + gz.length + ' B, version ' + GG.VERSION);
}
const a = find('hail_damage', 'good', 8 * WPY + 12, { worldBy: 120, test: s => s.year === 9 && s.week === 12 && !(s.rival && s.rival.finalNews) });
write('v09_world_y9', a.s, a.seed);
const b = find('frost_heave', 'good', 9 * WPY + 14, { worldBy: 144, test: s => s.year === 10 && s.week === 14 && s.rival && s.rival.finalNews });
write('v09_y10w14', b.s, b.seed);
const c = find('gravel_kings', 'avg', 10 * WPY + 1, { test: s => s.ended && s.totalWeek === 240 && s.phase === 'ended' && !s.legacy });
write('v09_ended', c.s, c.seed);
