#!/usr/bin/env node
// tools/make_fixtures_v10.js: writes the v1.1 stage-0 save fixture tests/fixtures/v10_recruit.json.gz (a gzipped slot record
// { savedAt, version, summary, state }, as GG.save.write stores it, savedAt fixed). Generated from the 1.0.1.0 tree (commit
// 172208a) BEFORE any v1.1 edit, so it holds a genuine v1.0 state (no seat / seatRole / seatLanes / runs / gearLook):
//   SRC=<a 1.0.1.0 checkout> node tools/make_fixtures_v10.js [outDir]
// Running it on a v1.1 tree makes v1.1 states, which defeats the purpose; regenerate only from the 1.0.1.0 tree.
//   v10_recruit : The Grid Road Ramblers, avg bot, saved on a Monday in year 3-5 with a hired recruit in the lineup and an
//                 original who quit (the drum-seat baseline every seat migration starts from)
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const ROOT = path.resolve(process.env.SRC || path.join(__dirname, '..'));
const OUT = path.resolve(process.argv[2] || path.join(__dirname, '..', 'tests', 'fixtures'));
const load = require(path.join(ROOT, 'tests', '_load.js'));
const GG = load({ localStorage: load.fakeStorage() });
const WPY = GG.contracts.WEEKS_PER_YEAR;
function want(s) { return s.members.some(m => !m.original && m.status === 'active') && s.members.some(m => m.original && m.status === 'quit'); }
function find(bandId, style) {
  for (let seed = 11; seed < 600; seed++) {
    const s = GG.career.newCareer({ seed: seed * 13, bandId, player: { name: 'Fixture', nick: 'Fix' } });
    while (!s.ended && s.totalWeek < 5 * WPY) {
      GG.career.botWeek(s, style);
      if (s.year >= 3 && s.phase === 'monday' && want(s)) return { seed: seed * 13, s };
    }
  }
  throw new Error('no seed for ' + bandId);
}
const f = find('grid_road_ramblers', 'avg'), s = f.s, band = GG.career.band(s);
const rec = { savedAt: 1790000000000, version: GG.VERSION,
  summary: { band: band ? band.name : s.bandId, player: s.player ? s.player.name : '', year: s.year, week: s.week, fans: s.fans, fund: s.fund }, state: s };
const json = JSON.stringify(rec), gz = zlib.gzipSync(json, { level: 9 });
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'v10_recruit.json.gz'), gz);
console.log('v10_recruit: ' + s.bandId + ' seed ' + f.seed + ' wk ' + s.totalWeek + ' (y' + s.year + ' w' + s.week + ', ' + s.phase + ') members ' +
  s.members.map(m => m.id + ':' + m.role + ':' + m.status + (m.original ? '' : ':recruit')).join(' ') + ' | json ' + json.length + ' chars, gz ' + gz.length + ' B, version ' + GG.VERSION);
