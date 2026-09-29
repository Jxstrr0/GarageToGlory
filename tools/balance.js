#!/usr/bin/env node
// tools/balance.js: plays bot careers and prints one table per bot style, one row per year.
//   node tools/balance.js [years=1] [seeds=5]
// Uses the real Monday cards when content/cards.js is loaded; otherwise a synthetic deck with the magnitudes
// the content brief asks for (so the economy can be tuned before content lands). Also checks invariants:
// no NaN/Infinity, every stat inside contracts.RANGES, fund never negative after a week wrap.
// v0.3: bots book from the weekly gig board (GG.world.botBook) and play gigs with autoGig; van = condition at
// year end (the good bot repairs it), bans = venues that banned the band.
const load = require('../tests/_load');
const years = Math.max(1, parseInt(process.argv[2], 10) || 1);
const seeds = Math.max(1, parseInt(process.argv[3], 10) || 5);
const t0 = Date.now();
const GG = load({ localStorage: load.fakeStorage() });
const C = GG.contracts, WPY = C.WEEKS_PER_YEAR;

// ---- Synthetic deck (only when there are no real cards) --------------------------------------------
// 12 templates x 2 = 24 once-only cards, like the garage-era brief: most choices cost $20-150,
// fans 0..30, buzz/chemistry/mood trades, one gamble.
function syntheticDeck() {
  const T = [
    [{ fund: -150, skill: { dana: 3 }, mood: { dana: 10 } }, { mood: { dana: -8 } }],
    [{ fund: -120, buzz: 6, mood: { marcel: 12 } }, { fund: -20, mood: { marcel: 3 }, buzz: 2 }, { mood: { marcel: -10 } }],
    [{ fans: 20, buzz: 8, burnout: 5 }, { buzz: -2 }],
    [{ fund: -80, chemistry: 4 }, { mood: { all: -4 } }],
    [{ fund: 150, burnout: 8, mood: { marcel: -6 } }, { buzz: 2 }],
    [{ chemistry: 4, mood: { all: 3 } }, { buzz: 4, chemistry: -3 }],
    [{ roll: { chance: 0.5, stat: 'chemistry', statScale: 0.005, success: { effects: { fans: 25, buzz: 10 } }, fail: { effects: { fund: -100 } } } }, { mood: { all: -2 } }],
    [{ fund: -40, fans: 15, buzz: 6 }, { buzz: 2 }],
    [{ chemistry: -5 }, { fund: -60, mood: { kenji: 10 } }],
    [{ mood: { jaxon: 8 }, chemistry: 3 }, { fund: 30, mood: { jaxon: -6 } }],
    [{ fund: -60, burnout: -10 }, { burnout: 6, fans: 5 }],
    [{ fund: -100, fans: 10, buzz: 10 }, { fund: -30, buzz: 4 }, { mood: { all: -3 } }]
  ];
  const cards = [{ id: 'syn_force', type: 'drama', title: 'Week one', text: '', forceWeek: 1,
    choices: [{ effects: { mood: { marcel: 10 } }, outcome: '.' }, { effects: { mood: { marcel: -5 } }, outcome: '.' }] }];
  for (let r = 0; r < 2; r++) T.forEach((ch, i) => cards.push({
    id: 'syn_' + r + '_' + i, type: C.CARD_TYPES[i % 6], title: 'Synthetic ' + i, text: '',
    choices: ch.map(c => { const roll = c.roll; const fx = Object.assign({}, c); delete fx.roll; return roll ? { effects: fx, roll, outcome: '.' } : { effects: fx, outcome: '.' }; })
  }));
  return cards;
}
const real = GG.content.cards && GG.content.cards.length;
if (!real) GG.content.cards = syntheticDeck();
const deckLabel = real ? 'real deck (' + GG.content.cards.length + ' cards)' : 'synthetic deck (' + GG.content.cards.length + ' cards; no content/cards.js)';

// ---- Invariants ----------------------------------------------------------------------------------------
const problems = [];
function check(s, tag) {
  const bad = (what) => { if (problems.length < 20) problems.push(tag + ' week ' + s.totalWeek + ': ' + what); };
  C.STATS.forEach(k => { if (!isFinite(s[k])) bad(k + ' = ' + s[k]); const r = C.RANGES[k]; if (r && (s[k] < r[0] || s[k] > r[1])) bad(k + ' out of range: ' + s[k]); });
  s.members.forEach(m => C.MEMBER_STATS.forEach(k => { const r = C.RANGES[k]; if (!isFinite(m[k]) || m[k] < r[0] || m[k] > r[1]) bad(m.id + '.' + k + ' = ' + m[k]); }));
  if (s.fund < 0) bad('fund negative after wrap: ' + s.fund);
  if (s.fans >= 100000) bad('fans not sane: ' + s.fans);
}

// ---- Run ---------------------------------------------------------------------------------------------------
function run(style) {
  const rows = [];   // rows[year] = array of per-seed year stats
  for (let seed = 1; seed <= seeds; seed++) {
    const s = GG.career.newCareer({ seed: seed * 7919, player: { name: 'Bot' } });
    let y = null;
    for (let w = 0; w < years * WPY && !s.ended; w++) {
      if (s.week === 1) y = { fundMin: Infinity, buzz: 0, burn: 0, mood: 0, n: 0, loans0: s.stats.parentsLoans, songs0: s.stats.songsWritten, gigs0: s.stats.gigs };
      const yearIdx = s.year - 1;
      GG.career.botWeek(s, style);
      check(s, style + '#' + seed);
      y.fundMin = Math.min(y.fundMin, s.fund); y.buzz += s.buzz; y.burn += s.burnout; y.n++;
      y.mood += s.members.reduce((t, m) => t + m.mood, 0) / s.members.length;
      if (s.week === 1 || s.ended) {   // endWeek just rolled into a new year (or the career ended)
        (rows[yearIdx] = rows[yearIdx] || []).push({
          fundMin: y.fundMin, fundEnd: s.fund, fans: s.fans, buzz: y.buzz / y.n, chem: s.chemistry, burn: y.burn / y.n,
          loans: s.stats.parentsLoans - y.loans0, quits: s.members.filter(m => m.status !== 'active').length,
          songs: s.stats.songsWritten - y.songs0, gigs: s.stats.gigs - y.gigs0, mood: y.mood / y.n,
          van: s.van ? s.van.condition : 0, bans: (s.banned || []).length });
      }
    }
  }
  return rows;
}
const avg = (a, k) => a.reduce((t, r) => t + r[k], 0) / a.length;
const pad = (v, n, d) => { const s = typeof v === 'number' ? v.toFixed(d || 0) : String(v); return s.length >= n ? s : ' '.repeat(n - s.length) + s; };
function table(style, rows) {
  const out = [style.toUpperCase() + ' bot',
    ' yr | fundMin fundEnd |  fans end (min-max) | buzz | chem | burn | loans | quits | songs | gigs | mood | van | bans'];
  rows.forEach((a, i) => {
    const fans = a.map(r => r.fans);
    out.push(pad(i + 1, 3) + ' | ' + pad(avg(a, 'fundMin'), 7) + ' ' + pad(avg(a, 'fundEnd'), 7) + ' | ' +
      pad(avg(a, 'fans'), 8) + ' (' + pad(Math.min(...fans), 4) + '-' + pad(Math.max(...fans), 5) + ') | ' +
      pad(avg(a, 'buzz'), 4) + ' | ' + pad(avg(a, 'chem'), 4) + ' | ' + pad(avg(a, 'burn'), 4) + ' | ' +
      pad(avg(a, 'loans'), 5, 1) + ' | ' + pad(avg(a, 'quits'), 5) + ' | ' + pad(avg(a, 'songs'), 5, 1) + ' | ' +
      pad(avg(a, 'gigs'), 4, 1) + ' | ' + pad(avg(a, 'mood'), 4) + ' | ' + pad(avg(a, 'van'), 3) + ' | ' + pad(avg(a, 'bans'), 4, 1));
  });
  return out.join('\n');
}
const results = ['avg', 'good'].map(style => table(style, run(style)));
console.log('Garage to Glory balance: ' + years + ' year(s) x ' + seeds + ' seed(s), ' + deckLabel + ', averages over seeds');
console.log(results.join('\n\n'));
console.log(problems.length ? 'INVARIANT PROBLEMS:\n  ' + problems.join('\n  ') : 'invariants OK (finite, in RANGES, fund >= 0 after every wrap, fans < 100k)');
console.log('done in ' + ((Date.now() - t0) / 1000).toFixed(2) + ' s');
