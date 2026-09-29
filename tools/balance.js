#!/usr/bin/env node
// tools/balance.js: plays bot careers and prints one table per bot style, one row per year.
//   node tools/balance.js [years=1] [seeds=5]
// Uses the real Monday cards when content/cards.js is loaded; otherwise a synthetic deck with the magnitudes
// the content brief asks for (so the economy can be tuned before content lands). Also checks invariants:
// no NaN/Infinity, every stat inside contracts.RANGES, fund never negative after a week wrap.
// v0.3: bots book from the weekly gig board (GG.world.botBook) and play gigs with autoGig; van = condition at
// year end (the good bot repairs it), bans = venues that banned the band.
// v0.5: eras + labels. Per year: sgn = share of seeds signed to a label at year end, rel = releases, peak = best
// Maple 100 peak that year (charting seeds), roy = royalties paid ($), cert = gold/platinum, loon = Loonie wins.
// Then era timing (week of Local Heroes, first offer, Signed era, world-ready threshold), loans after year 1.
//   WIDE_GATES=1 treats garage-only Monday cards as all-era (approximates the CONTENT agent widening gates).
const load = require('../tests/_load');
const years = Math.max(1, parseInt(process.argv[2], 10) || 1);
const seeds = Math.max(1, parseInt(process.argv[3], 10) || 5);
const t0 = Date.now();
const GG = load({ localStorage: load.fakeStorage() });
const C = GG.contracts, WPY = C.WEEKS_PER_YEAR;
// NO_DRAMA=1: v0.3-equivalent knobs (no drama sim, v0.3 upkeep) to compare against.
if (process.env.NO_DRAMA) { GG.drama = null; GG.content.economy.weeklyUpkeep = 30; }

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
if (process.env.WIDE_GATES) GG.content.cards.forEach(c => { if (c.gate && Array.isArray(c.gate.era) && c.gate.era.length === 1 && c.gate.era[0] === 'garage') c.gate.era = C.ERAS.slice(); });
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
const timing = { avg: [], good: [] };   // per seed: weeks of eras / first offer / world-ready, loans after year 1
function run(style) {
  const rows = [];   // rows[year] = array of per-seed year stats
  for (let seed = 1; seed <= seeds; seed++) {
    const s = GG.career.newCareer({ seed: seed * 7919, player: { name: 'Bot' } });
    let y = null;
    for (let w = 0; w < years * WPY && !s.ended; w++) {
      if (s.week === 1) y = { fundMin: Infinity, buzz: 0, burn: 0, mood: 0, n: 0, loans0: s.stats.parentsLoans, songs0: s.stats.songsWritten, gigs0: s.stats.gigs,
        rel0: s.stats.releases || 0, roy0: s.stats.royalties || 0, cert0: s.stats.certs || 0, loon0: s.stats.loonieWins || 0,
        quits0: s.stats.quits || 0, ults0: s.stats.ultimatums || 0, rets0: s.stats.returns || 0, prot: s.protected };
      const yearIdx = s.year - 1;
      GG.career.botWeek(s, style);
      check(s, style + '#' + seed);
      y.fundMin = Math.min(y.fundMin, s.fund); y.buzz += s.buzz; y.burn += s.burnout; y.n++;
      y.mood += s.members.reduce((t, m) => t + m.mood, 0) / s.members.length;
      if (s.week === 1 || s.ended) {   // endWeek just rolled into a new year (or the career ended)
        (rows[yearIdx] = rows[yearIdx] || []).push({
          fundMin: y.fundMin, fundEnd: s.fund, fans: s.fans, buzz: y.buzz / y.n, chem: s.chemistry, burn: y.burn / y.n,
          loans: s.stats.parentsLoans - y.loans0, quits: (s.stats.quits || 0) - y.quits0, ults: (s.stats.ultimatums || 0) - y.ults0,
          rets: (s.stats.returns || 0) - y.rets0, prot: y.prot && s.protected ? 1 : 0, out: s.members.filter(m => m.status !== 'active').length,
          songs: s.stats.songsWritten - y.songs0, gigs: s.stats.gigs - y.gigs0, mood: y.mood / y.n,
          van: s.van ? s.van.condition : 0, bans: (s.banned || []).length,
          sgn: s.label ? 1 : 0, rel: (s.stats.releases || 0) - y.rel0, roy: (s.stats.royalties || 0) - y.roy0,
          cert: (s.stats.certs || 0) - y.cert0, loon: (s.stats.loonieWins || 0) - y.loon0,
          peak: (s.albums || []).filter(a => a.released > s.totalWeek - WPY - 1 && a.chart && a.chart.peak).reduce((m, a) => Math.min(m, a.chart.peak), 999) });
      }
    }
    const eraWeek = e => { const h = (s.eraHistory || []).find(x => x.era === e); return h ? h.week : null; };
    timing[style].push({ local: eraWeek('local'), offer: s.milestones.firstOffer || null, signedEra: eraWeek('signed'),
      deal: s.milestones.signed || null, world: s.milestones.worldReady || null, fans: s.fans,
      loansAfter1: s.stats.parentsLoans - (rows[0] ? 0 : 0), albums: (s.albums || []).filter(a => a.status === 'released').length,
      drops: s.stats.drops || 0, units: s.stats.units || 0 });
  }
  return rows;
}
const avg = (a, k) => a.reduce((t, r) => t + r[k], 0) / a.length;
const peakAvg = a => { const v = a.map(r => r.peak).filter(p => p < 999); return v.length ? Math.round(v.reduce((t, p) => t + p, 0) / v.length) : '-'; };
const pad = (v, n, d) => { const s = typeof v === 'number' ? v.toFixed(d || 0) : String(v); return s.length >= n ? s : ' '.repeat(n - s.length) + s; };
function table(style, rows) {
  const out = [style.toUpperCase() + ' bot',
    ' yr | fundMin fundEnd |  fans end (min-max) | buzz | chem | burn | loans | ults quits rets out | songs | gigs | mood | van | bans | sgn  rel peak   roy cert loon'];
  rows.forEach((a, i) => {
    const fans = a.map(r => r.fans);
    out.push(pad(i + 1, 3) + ' | ' + pad(avg(a, 'fundMin'), 7) + ' ' + pad(avg(a, 'fundEnd'), 7) + ' | ' +
      pad(avg(a, 'fans'), 8) + ' (' + pad(Math.min(...fans), 4) + '-' + pad(Math.max(...fans), 5) + ') | ' +
      pad(avg(a, 'buzz'), 4) + ' | ' + pad(avg(a, 'chem'), 4) + ' | ' + pad(avg(a, 'burn'), 4) + ' | ' +
      pad(avg(a, 'loans'), 5, 1) + ' | ' + pad(avg(a, 'ults'), 4, 1) + ' ' + pad(avg(a, 'quits'), 5, 1) + ' ' + pad(avg(a, 'rets'), 4, 1) + ' ' +
      pad(avg(a, 'out'), 3, 1) + ' | ' + pad(avg(a, 'songs'), 5, 1) + ' | ' +
      pad(avg(a, 'gigs'), 4, 1) + ' | ' + pad(avg(a, 'mood'), 4) + ' | ' + pad(avg(a, 'van'), 3) + ' | ' + pad(avg(a, 'bans'), 4, 1) + ' | ' +
      pad(avg(a, 'sgn'), 3, 1) + ' ' + pad(avg(a, 'rel'), 4, 1) + ' ' + pad(peakAvg(a), 4) + ' ' + pad(avg(a, 'roy'), 5) + ' ' + pad(avg(a, 'cert'), 4, 1) + ' ' + pad(avg(a, 'loon'), 4, 1));
  });
  const T = timing[style], wk = (k) => { const v = T.map(t => t[k]).filter(x => x != null); return v.length ? 'wk ' + Math.round(v.reduce((a, b) => a + b, 0) / v.length) + ' (y' + (Math.floor((v.reduce((a, b) => a + b, 0) / v.length - 1) / WPY) + 1) + ', ' + v.length + '/' + T.length + ', ' + Math.min(...v) + '-' + Math.max(...v) + ')' : 'never'; };
  out.push('eras: local ' + wk('local') + ' | first offer ' + wk('offer') + ' | first deal ' + wk('deal') + ' | signed era ' + wk('signedEra') + ' | world-ready ' + wk('world'));
  const late = rows.slice(1).reduce((t, a) => t + a.reduce((u, r) => u + r.loans, 0), 0) / T.length;
  out.push('loans after year 1 (per career): ' + late.toFixed(2) + ' | releases ' + (T.reduce((t, x) => t + x.albums, 0) / T.length).toFixed(1) + ' | drops ' + (T.reduce((t, x) => t + x.drops, 0) / T.length).toFixed(1) + ' | units sold ' + Math.round(T.reduce((t, x) => t + x.units, 0) / T.length));
  // v0.4: quits per year once the garage-era protection is off (years that ended still protected don't count)
  const after = rows.map(a => a.filter(r => !r.prot)).reduce((t, a) => t.concat(a), []);
  if (after.length) out.push('quits/year after protection: ' + avg(after, 'quits').toFixed(2) + ' (ultimatums ' + avg(after, 'ults').toFixed(2) + ', returns ' + avg(after, 'rets').toFixed(2) + ', over ' + after.length + ' seed-years)');
  return out.join('\n');
}
const results = ['avg', 'good'].map(style => table(style, run(style)));
console.log('Garage to Glory balance: ' + years + ' year(s) x ' + seeds + ' seed(s), ' + deckLabel + ', averages over seeds');
console.log(results.join('\n\n'));
console.log(problems.length ? 'INVARIANT PROBLEMS:\n  ' + problems.join('\n  ') : 'invariants OK (finite, in RANGES, fund >= 0 after every wrap, fans < 100k)');
console.log('done in ' + ((Date.now() - t0) / 1000).toFixed(2) + ' s');
