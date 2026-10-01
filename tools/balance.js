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
// v0.6: sd = showdowns with the rival that year, sdW = share you won, heat = average rivalry heat, rvF = rival fans at year
// end; per career: cracks (kind@year), the Sad Dome final (you headline / they headline), poach defections.
// v0.7: tr = tours that left that year, abr = fans abroad at year end, hs = average homesickness; per career: the World era
// week, regions unlocked (fans/invite/big) and broken, Global Gong wins, the Moose Opera payoff, the Japanese president.
// v0.8: kit = kit quality tier, gr = gear owned (toms, ride, pedal: 0..3), vt = van tier, sp = space tier (all at year end),
// mer = merch earned that year ($), mNet = merch earned - stock bought that year, pay = gig pay that year; per career: when
// the bot owned 6 lanes + the pedal, when it bought a sprinter (vs the World era), merch as a share of gig pay.
// v0.8.1: lic = licensing income that year ($ net of a label's cut); per career: offers made / deals taken / countered /
// walked, and the median career licensing total (target: 2–4 offers, a median of roughly $5k–15k).
//   WIDE_GATES=1 treats garage-only Monday cards as all-era (approximates the CONTENT agent widening gates).
// v0.9 "Genres": BAND=<bandId>|all plays that band's careers (all = the four bands one after another): per-band tables
// (as above) + a band line per style (cards drawn, weeks with no card, garage-era board size + average km, average km per
// gig, genre-moment rate from a live bot gig each year, rival lineup size, the World payoff flag), then a cross-band
// comparison (avg bot and good bot, one row per band). Without BAND the output is exactly the v0.8.1 Hail Damage report.
//   TUNE='rox.skill=51,benny.mood=70' overrides member numbers in-process (to try a bands.js rebalance before editing it).
//   FIT='venue_id.punk=0.6,...' overrides venue genre fits in-process (to try a venues.js rebalance before editing it).
//   DECK=synthetic|none: every band on the synthetic role-alias deck / no Monday deck (the economy without content).
//   The World target also needs the reach share (careers that got to the World era) within 15 points of Hail Damage's;
//   payoff a/b = fired / careers whose payoff needs were met in the World era with a departure window left (good bot >= 30%).
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
  // v0.9: role aliases instead of Hail Damage ids, so the synthetic deck fits every band
  const T = [
    [{ fund: -150, skill: { '@soloist': 3 }, mood: { '@soloist': 10 } }, { mood: { '@soloist': -8 } }],
    [{ fund: -120, buzz: 6, mood: { '@front': 12 } }, { fund: -20, mood: { '@front': 3 }, buzz: 2 }, { mood: { '@front': -10 } }],
    [{ fans: 20, buzz: 8, burnout: 5 }, { buzz: -2 }],
    [{ fund: -80, chemistry: 4 }, { mood: { all: -4 } }],
    [{ fund: 150, burnout: 8, mood: { '@front': -6 } }, { buzz: 2 }],
    [{ chemistry: 4, mood: { all: 3 } }, { buzz: 4, chemistry: -3 }],
    [{ roll: { chance: 0.5, stat: 'chemistry', statScale: 0.005, success: { effects: { fans: 25, buzz: 10 } }, fail: { effects: { fund: -100 } } } }, { mood: { all: -2 } }],
    [{ fund: -40, fans: 15, buzz: 6 }, { buzz: 2 }],
    [{ chemistry: -5 }, { fund: -60, mood: { '@bassist': 10 } }],
    [{ mood: { '@filler': 8 }, chemistry: 3 }, { fund: 30, mood: { '@filler': -6 } }],
    [{ fund: -60, burnout: -10 }, { burnout: 6, fans: 5 }],
    [{ fund: -100, fans: 10, buzz: 10 }, { fund: -30, buzz: 4 }, { mood: { all: -3 } }]
  ];
  const cards = [{ id: 'syn_force', type: 'drama', title: 'Week one', text: '', forceWeek: 1,
    choices: [{ effects: { mood: { '@front': 10 } }, outcome: '.' }, { effects: { mood: { '@front': -5 } }, outcome: '.' }] }];
  for (let r = 0; r < 2; r++) T.forEach((ch, i) => cards.push({
    id: 'syn_' + r + '_' + i, type: C.CARD_TYPES[i % 6], title: 'Synthetic ' + i, text: '',
    choices: ch.map(c => { const roll = c.roll; const fx = Object.assign({}, c); delete fx.roll; return roll ? { effects: fx, roll, outcome: '.' } : { effects: fx, outcome: '.' }; })
  }));
  return cards;
}
// DECK=synthetic plays every band on the synthetic (role-alias) deck, DECK=none on no Monday deck at all: the cross-band
// comparison then isolates the economy + member numbers from how much content each band has (v0.9).
const DECK = process.env.DECK || '';
const real = DECK ? 0 : GG.content.cards && GG.content.cards.length;
if (DECK === 'none') GG.content.cards = [];
else if (!real) GG.content.cards = syntheticDeck();
if (process.env.WIDE_GATES) GG.content.cards.forEach(c => { if (c.gate && Array.isArray(c.gate.era) && c.gate.era.length === 1 && c.gate.era[0] === 'garage') c.gate.era = C.ERAS.slice(); });
const deckLabel = DECK === 'none' ? 'no Monday deck (DECK=none)' : real ? 'real deck (' + GG.content.cards.length + ' cards)' : 'synthetic deck (' + GG.content.cards.length + ' cards; ' + (DECK ? 'DECK=' + DECK : 'no content/cards.js') + ')';

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
let timing = { avg: [], good: [] };   // per seed: weeks of eras / first offer / world-ready, loans after year 1
let gigPay = 0;   // v0.8: gig pay this year (the merch share compares against it)
GG.on('gig:done', e => { gigPay += (e.result && e.result.pay) || 0; });
// v0.9 band stats (BAND=): Monday cards, the garage-era board, km per gig, genre moments from a live bot gig per year
const BAND = process.env.BAND || '';
// TUNE='rox.skill=51,benny.mood=70' tries member numbers (bands.js) in-process before the lead edits the content.
(process.env.TUNE || '').split(',').filter(Boolean).forEach(kv => {
  const m = /^(\w+)\.(skill|mood)=(\d+)$/.exec(kv.trim());
  if (!m) { console.log('TUNE: skipped ' + kv); return; }
  Object.keys(GG.content.bands).forEach(b => GG.content.bands[b].members.forEach(x => { if (x.id === m[1]) x[m[2]] = +m[3]; }));
});
// FIT='venue_id.genre=0.7,...' tries venue genre fits (content/venues.js) in-process, the same way (v0.9 integration).
(process.env.FIT || '').split(',').filter(Boolean).forEach(kv => {
  const m = /^(\w+)\.(metal|punk|rock|country)=([\d.]+)$/.exec(kv.trim()), v = m && (GG.content.venues || []).find(x => x.id === m[1]);
  if (!v) { console.log('FIT: skipped ' + kv); return; }
  v.genreFit = Object.assign({}, v.genreFit, { [m[2]]: +m[3] });
});
let bs = null;   // per run: { weeks, noCard, board: [n, km], gigs, km, live: { gigs, combo, chorus, peak }, lineup, payoff, moraleSeeds }
GG.on('week:start', e => { if (bs) { bs.weeks++; if (!e.card) bs.noCard++; } });
GG.on('gig:done', e => { if (bs && e.result) { bs.gigs++; bs.km += e.result.km || (e.result.travel && e.result.travel.km) || 0; } });
function liveProbe(s) {   // a live bot gig at a local room, on a copy of the career (never touches the run)
  if (!bs || !GG.gig || !GG.gig.session) return;
  const c = JSON.parse(JSON.stringify(s)), home = GG.world ? GG.world.home(c) : null;
  const v = (GG.content.venues || []).filter(x => x.minFans < 99999 && x.tier <= 2 && (!home || GG.world.cityId(x.city) === home)).sort((a, b) => a.tier - b.tier)[0]
    || (GG.content.venues || []).find(x => x.minFans < 99999 && x.tier <= 2);
  if (!v || !c.songs.length) return;
  c.liveGig = null;
  const g = GG.gig.makeGig(c, v.id, 'book'), M = GG.gig.moments ? GG.gig.moments(c.genre) : { combo: 'mosh', chorus: 'headbang', peak: 'wallOfDeath' };
  const r = GG.gig.botPlay(GG.gig.session(c, g, null, { emit: false }), { accuracy: 0.93, jitterMs: 25 }, GG.RNG(c.seed + c.totalWeek));
  bs.live.gigs++;
  (r.songResults || []).forEach(x => { bs.live.songs++; if (x.moments.indexOf(M.combo) >= 0) bs.live.combo++; if (x.moments.indexOf(M.chorus) >= 0) bs.live.chorus++; if (x.moments.indexOf(M.peak) >= 0) bs.live.peak++; });
  if (GG.gig.signatures(c).length && (r.moments || []).some(k => GG.gig.signatures(c).some(sg => sg.action === k))) bs.live.sig++;
}
function run(style, bandId) {
  const rows = [];   // rows[year] = array of per-seed year stats
  for (let seed = 1; seed <= seeds; seed++) {
    const s = GG.career.newCareer(bandId ? { seed: seed * 7919, bandId: bandId, player: { name: 'Bot' } } : { seed: seed * 7919, player: { name: 'Bot' } });
    let y = null, full = null, sprinter = null, needW = null, needPkg = null;   // v0.9: the first World week a payoff package's needs are met
    if (bs) { bs.firstKm.push(s.gig && s.gig.km != null ? s.gig.km : (s.gig ? 0 : null)); bs.firstGig.push(s.gig ? s.gig.venueId : null); }
    for (let w = 0; w < years * WPY && !s.ended; w++) {
      if (s.week === 1) y = { fundMin: Infinity, buzz: 0, burn: 0, mood: 0, n: 0, loans0: s.stats.parentsLoans, songs0: s.stats.songsWritten, gigs0: s.stats.gigs,
        rel0: s.stats.releases || 0, roy0: s.stats.royalties || 0, cert0: s.stats.certs || 0, loon0: s.stats.loonieWins || 0,
        quits0: s.stats.quits || 0, ults0: s.stats.ultimatums || 0, rets0: s.stats.returns || 0, prot: s.protected, heat: 0, hs: 0,
        tours0: s.tour ? s.tour.history.length + (s.tour.active ? 1 : 0) : 0, mer0: s.merch ? s.merch.earned : 0, spent0: s.merch ? s.merch.spent : 0 };
      if (s.week === 1) gigPay = 0;
      const yearIdx = s.year - 1;
      if (bs && s.era === 'garage' && s.phase === 'monday') { const L = GG.world ? GG.world.refresh(s) : []; bs.board[0] += 1; bs.board[1] += L.length; L.forEach(l => { bs.board[2] += l.km || 0; bs.board[3]++; }); }
      GG.career.botWeek(s, style);
      check(s, (bandId ? bandId + ':' : '') + style + '#' + seed);
      if (bs && needW == null && s.era === 'world' && GG.tour && GG.tour.needsMet) {
        needPkg = ((GG.content.world || {}).packages || []).find(p => p.needs && (!p.needs.band || [].concat(p.needs.band).includes(s.bandId)) && GG.tour.needsMet(s, p)) || null;
        if (needPkg) needW = s.totalWeek;
      }
      if (bs && s.week === 1) liveProbe(s);
      if (full == null && s.gear && s.gear.lanes >= 6 && s.gear.doubleKick) full = s.totalWeek - 1;
      if (sprinter == null && s.van && s.van.tier >= 2) sprinter = s.totalWeek - 1;
      y.fundMin = Math.min(y.fundMin, s.fund); y.buzz += s.buzz; y.burn += s.burnout; y.n++; y.heat += s.rival ? s.rival.heat : 0; y.hs += s.tour ? s.tour.homesick : 0;
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
          peak: (s.albums || []).filter(a => a.released > s.totalWeek - WPY - 1 && a.chart && a.chart.peak).reduce((m, a) => Math.min(m, a.chart.peak), 999),
          tr: s.tour ? s.tour.history.length + (s.tour.active ? 1 : 0) - y.tours0 : 0, abr: GG.tour ? GG.tour.abroadFans(s) : 0, hs: y.hs / y.n,
          kit: s.gear ? s.gear.quality || 0 : 0, gr: s.gear && s.gear.owned ? s.gear.owned.length : 0, vt: s.van ? s.van.tier || 0 : 0, sp: s.spaceTier || 0,
          mer: s.merch ? s.merch.earned - y.mer0 : 0, mNet: s.merch ? (s.merch.earned - y.mer0) - (s.merch.spent - y.spent0) : 0, pay: gigPay,
          lic: GG.licensing ? GG.licensing.income(s, yearIdx * WPY + 1, (yearIdx + 1) * WPY) : 0,
          ...(() => { const sds = (s.showdowns || []).filter(x => x.week > yearIdx * WPY && x.week <= (yearIdx + 1) * WPY);
            return { sd: sds.length, sdWon: sds.filter(x => x.won).length, heat: y.heat / y.n, rvF: s.rival ? s.rival.fans : 0 }; })() });
      }
    }
    if (bs) {
      const paid = s.tour && (s.tour.moose || Object.keys(s.tour.payoffs || {}).length) ? 1 : 0;
      bs.lineup += s.rival && s.rival.members ? s.rival.members.length : 0; bs.payoff += paid; bs.cards += s.stats.cards || 0; bs.careers++;
      // eligible: the needs were met in the World era with a departure window left that gets the tour home inside the run
      if (needPkg) {
        const win = GG.tour.departWindow(needPkg) || Array.from({ length: WPY }, (_, i) => i + 1), end = years * WPY, len = (needPkg.stops || []).length || 1;
        let ok = false;
        for (let w = needW + 1; w + len <= end && !ok; w++) if (win.includes(((w - 1) % WPY) + 1)) ok = true;
        if (ok || paid) { bs.eligible++; bs.paidElig += paid; }
      }
    }
    const eraWeek = e => { const h = (s.eraHistory || []).find(x => x.era === e); return h ? h.week : null; };
    timing[style].push({ local: eraWeek('local'), offer: s.milestones.firstOffer || null, signedEra: eraWeek('signed'),
      deal: s.milestones.signed || null, world: s.milestones.worldReady || null, fans: s.fans,
      loansAfter1: s.stats.parentsLoans - (rows[0] ? 0 : 0), albums: (s.albums || []).filter(a => a.status === 'released').length,
      drops: s.stats.drops || 0, units: s.stats.units || 0,
      crack: s.rival && s.rival.cracked ? s.rival.cracked + '@y' + (Math.floor((s.rival.crackWeek - 1) / WPY) + 1) : null,
      final: s.finalShowdown ? s.finalShowdown.headliner : null,
      poached: (s.showdowns || []).filter(x => x.kind === 'poach' && !x.won).length,
      worldEra: eraWeek('world'), tours: s.tour ? s.tour.history.length : 0,
      unl: s.tour ? Object.values(s.tour.regions).filter(r => r.unlocked).length : 0, inv: s.tour ? Object.values(s.tour.regions).filter(r => r.via === 'invite' || r.via === 'big').length : 0,
      brk: s.tour ? Object.values(s.tour.regions).filter(r => r.broken).length : 0, gong: s.tour ? s.tour.gongs.filter(g => g.won).length : 0,
      gongN: s.tour ? s.tour.gongs.filter(g => g.nominated).length : 0, moose: !!(s.tour && s.tour.moose), pres: !!(s.tour && s.tour.president),
      net: s.tour ? s.tour.history.reduce((t, h) => t + (h.net || 0), 0) : 0,
      full, sprinter, kit: s.gear ? s.gear.quality : 0, vt: s.van ? s.van.tier : 0, sp: s.spaceTier || 0,
      merEarned: s.merch ? s.merch.earned : 0, merSpent: s.merch ? s.merch.spent : 0,
      licMade: s.licensing ? s.licensing.made : 0, licDeals: s.licensing ? s.licensing.deals.length : 0, licIncome: GG.licensing ? GG.licensing.income(s) : 0,
      licCounter: s.licensing ? s.licensing.deals.filter(d => d.countered).length : 0, licWalked: s.licensing ? s.licensing.offers.filter(o => o.status === 'withdrawn').length : 0 });
  }
  return rows;
}
const avg = (a, k) => a.reduce((t, r) => t + r[k], 0) / a.length;
const peakAvg = a => { const v = a.map(r => r.peak).filter(p => p < 999); return v.length ? Math.round(v.reduce((t, p) => t + p, 0) / v.length) : '-'; };
const pad = (v, n, d) => { const s = typeof v === 'number' ? v.toFixed(d || 0) : String(v); return s.length >= n ? s : ' '.repeat(n - s.length) + s; };
function table(style, rows) {
  const out = [style.toUpperCase() + ' bot',
    ' yr | fundMin fundEnd |  fans end (min-max) | buzz | chem | burn | loans | ults quits rets out | songs | gigs | mood | van | bans | sgn  rel peak   roy cert loon |  sd sdW heat   rvF |  tr   abr  hs | kit  gr  vt  sp   mer  mNet   pay |   lic'];
  rows.forEach((a, i) => {
    const fans = a.map(r => r.fans);
    out.push(pad(i + 1, 3) + ' | ' + pad(avg(a, 'fundMin'), 7) + ' ' + pad(avg(a, 'fundEnd'), 7) + ' | ' +
      pad(avg(a, 'fans'), 8) + ' (' + pad(Math.min(...fans), 4) + '-' + pad(Math.max(...fans), 5) + ') | ' +
      pad(avg(a, 'buzz'), 4) + ' | ' + pad(avg(a, 'chem'), 4) + ' | ' + pad(avg(a, 'burn'), 4) + ' | ' +
      pad(avg(a, 'loans'), 5, 1) + ' | ' + pad(avg(a, 'ults'), 4, 1) + ' ' + pad(avg(a, 'quits'), 5, 1) + ' ' + pad(avg(a, 'rets'), 4, 1) + ' ' +
      pad(avg(a, 'out'), 3, 1) + ' | ' + pad(avg(a, 'songs'), 5, 1) + ' | ' +
      pad(avg(a, 'gigs'), 4, 1) + ' | ' + pad(avg(a, 'mood'), 4) + ' | ' + pad(avg(a, 'van'), 3) + ' | ' + pad(avg(a, 'bans'), 4, 1) + ' | ' +
      pad(avg(a, 'sgn'), 3, 1) + ' ' + pad(avg(a, 'rel'), 4, 1) + ' ' + pad(peakAvg(a), 4) + ' ' + pad(avg(a, 'roy'), 5) + ' ' + pad(avg(a, 'cert'), 4, 1) + ' ' + pad(avg(a, 'loon'), 4, 1) + ' | ' +
      pad(avg(a, 'sd'), 3, 1) + ' ' + pad(a.reduce((t, r) => t + r.sd, 0) ? Math.round(100 * a.reduce((t, r) => t + r.sdWon, 0) / a.reduce((t, r) => t + r.sd, 0)) + '%' : '-', 3) + ' ' +
      pad(avg(a, 'heat'), 4) + ' ' + pad(avg(a, 'rvF'), 5) + ' | ' + pad(avg(a, 'tr'), 3, 1) + ' ' + pad(avg(a, 'abr'), 5) + ' ' + pad(avg(a, 'hs'), 3) + ' | ' +
      pad(avg(a, 'kit'), 3, 1) + ' ' + pad(avg(a, 'gr'), 3, 1) + ' ' + pad(avg(a, 'vt'), 3, 1) + ' ' + pad(avg(a, 'sp'), 3, 1) + ' ' + pad(avg(a, 'mer'), 5) + ' ' + pad(avg(a, 'mNet'), 5) + ' ' + pad(avg(a, 'pay'), 5) + ' | ' + pad(avg(a, 'lic'), 5));
  });
  const T = timing[style], wk = (k) => { const v = T.map(t => t[k]).filter(x => x != null); return v.length ? 'wk ' + Math.round(v.reduce((a, b) => a + b, 0) / v.length) + ' (y' + (Math.floor((v.reduce((a, b) => a + b, 0) / v.length - 1) / WPY) + 1) + ', ' + v.length + '/' + T.length + ', ' + Math.min(...v) + '-' + Math.max(...v) + ')' : 'never'; };
  const per = k => (T.reduce((t, x) => t + (+x[k] || 0), 0) / T.length);
  out.push('world: era ' + wk('worldEra') + ' | tours ' + per('tours').toFixed(1) + '/career (net ' + Math.round(per('net')) + ' $/career) | regions open ' + per('unl').toFixed(1) +
    ' (invite/big ' + per('inv').toFixed(1) + ') broken ' + per('brk').toFixed(1) + ' | Gong won ' + per('gong').toFixed(1) + ' of ' + per('gongN').toFixed(1) + ' nominations | moose ' + T.filter(t => t.moose).length + '/' + T.length + ' | JP president ' + T.filter(t => t.pres).length + '/' + T.length);
  out.push('eras: local ' + wk('local') + ' | first offer ' + wk('offer') + ' | first deal ' + wk('deal') + ' | signed era ' + wk('signedEra') + ' | world-ready ' + wk('world'));
  const allRows = rows.reduce((t, a) => t.concat(a), []), pay = allRows.reduce((t, r) => t + r.pay, 0), mer = allRows.reduce((t, r) => t + r.mer, 0), mNet = allRows.reduce((t, r) => t + r.mNet, 0);
  out.push('shop: 6 lanes + pedal ' + wk('full') + ' | sprinter ' + wk('sprinter') + ' | merch ' + Math.round(100 * mer / Math.max(1, pay)) + '% of gig pay (net ' +
    Math.round(100 * mNet / Math.max(1, pay)) + '%, $' + Math.round(mNet / T.length) + '/career) | at the end: kit ' + per('kit').toFixed(1) + ', van tier ' + per('vt').toFixed(1) + ', space tier ' + per('sp').toFixed(1));
  const licT = T.map(t => t.licIncome).sort((a, b) => a - b);
  out.push('licensing: offers ' + per('licMade').toFixed(1) + '/career (' + Math.min(...T.map(t => t.licMade)) + '-' + Math.max(...T.map(t => t.licMade)) + '), taken ' + per('licDeals').toFixed(1) +
    ' (countered ' + per('licCounter').toFixed(1) + ', walked ' + per('licWalked').toFixed(1) + ') | career total median $' + licT[Math.floor(licT.length / 2)] + ' (' + licT[0] + '-' + licT[licT.length - 1] + ')');
  const late = rows.slice(1).reduce((t, a) => t + a.reduce((u, r) => u + r.loans, 0), 0) / T.length;
  out.push('loans after year 1 (per career): ' + late.toFixed(2) + ' | releases ' + (T.reduce((t, x) => t + x.albums, 0) / T.length).toFixed(1) + ' | drops ' + (T.reduce((t, x) => t + x.drops, 0) / T.length).toFixed(1) + ' | units sold ' + Math.round(T.reduce((t, x) => t + x.units, 0) / T.length));
  const cr = T.filter(t => t.crack), fin = T.filter(t => t.final);
  out.push('rival: cracked ' + cr.length + '/' + T.length + (cr.length ? ' (' + cr.map(t => t.crack).join(' ') + ')' : '') + ' | Sad Dome: you headline ' +
    fin.filter(t => t.final === 'you').length + '/' + fin.length + ' | poach defections ' + (T.reduce((t, x) => t + x.poached, 0) / T.length).toFixed(2) + ' per career');
  // v0.4: quits per year once the garage-era protection is off (years that ended still protected don't count)
  const after = rows.map(a => a.filter(r => !r.prot)).reduce((t, a) => t.concat(a), []);
  if (after.length) out.push('quits/year after protection: ' + avg(after, 'quits').toFixed(2) + ' (ultimatums ' + avg(after, 'ults').toFixed(2) + ', returns ' + avg(after, 'rets').toFixed(2) + ', over ' + after.length + ' seed-years)');
  return out.join('\n');
}
function newStats() { return { weeks: 0, noCard: 0, board: [0, 0, 0, 0], gigs: 0, km: 0, live: { gigs: 0, songs: 0, combo: 0, chorus: 0, peak: 0, sig: 0 }, lineup: 0, payoff: 0, eligible: 0, paidElig: 0, cards: 0, careers: 0, firstKm: [], firstGig: [] }; }
function bandLine(style, st) {
  const pct = (a, b) => b ? Math.round(100 * a / b) + '%' : '-';
  return style.toUpperCase() + ' band: cards ' + (st.cards / Math.max(1, st.careers)).toFixed(1) + '/career, no-card weeks ' + pct(st.noCard, st.weeks) +
    ' | garage board ' + (st.board[1] / Math.max(1, st.board[0])).toFixed(1) + ' listings @ ' + Math.round(st.board[2] / Math.max(1, st.board[3])) + ' km' +
    ' | km/gig ' + Math.round(st.km / Math.max(1, st.gigs)) + ' | live moments per song: combo ' + pct(st.live.combo, st.live.songs) + ' chorus ' + pct(st.live.chorus, st.live.songs) +
    ' peak ' + pct(st.live.peak, st.live.songs) + ', signature gigs ' + pct(st.live.sig, st.live.gigs) +
    ' | rival lineup ' + (st.lineup / Math.max(1, st.careers)).toFixed(1) + ' | payoff ' + st.payoff + '/' + st.careers + ' (' + st.paidElig + '/' + st.eligible + ' with the needs met and a window left)' +
    ' | week-1 gig ' + (st.firstGig[0] || 'none') + ' (' + st.firstKm.filter(x => x != null).map(x => Math.round(x)).slice(0, 3).join('/') + ' km)';
}
const bandIds = BAND === 'all' ? Object.keys(GG.content.bands || { hail_damage: 1 }) : BAND ? [BAND] : [null];
const summary = [];
console.log('Garage to Glory balance: ' + years + ' year(s) x ' + seeds + ' seed(s), ' + deckLabel + ', averages over seeds' + (BAND ? ', BAND=' + BAND : ''));
bandIds.forEach(bandId => {
  timing = { avg: [], good: [] };
  const out = [], per = {};
  ['avg', 'good'].forEach(style => {
    bs = bandId ? newStats() : null;
    const rows = run(style, bandId);
    out.push(table(style, rows));
    if (bs) {
      out.push(bandLine(style, bs));
      const last = rows[Math.min(rows.length, 3) - 1] || [], all = rows.reduce((t, a) => t.concat(a), []), T = timing[style];
      const mean = (a, k) => a.length ? a.reduce((t, r) => t + r[k], 0) / a.length : 0, wk = k => { const v = T.map(t => t[k]).filter(x => x != null); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; };
      const y13 = rows.slice(0, 3).reduce((t, a) => t.concat(a), []), post = all.filter(r => !r.prot);
      per[style] = { fans3: Math.round(mean(last, 'fans')), fund3: Math.round(mean(last, 'fundEnd')), loans13: y13.reduce((t, r) => t + r.loans, 0) / T.length,
        quits: post.length ? mean(post, 'quits') : 0, rets: post.length ? mean(post, 'rets') : 0, local: wk('local'), offer: wk('offer'), signed: wk('signedEra'),
        world: wk('worldEra'), worldN: T.filter(t => t.worldEra != null).length / Math.max(1, T.length), sgn3: mean(last, 'sgn'), cards: bs.cards / Math.max(1, bs.careers), noCard: bs.weeks ? bs.noCard / bs.weeks : 0,
        board: bs.board[1] / Math.max(1, bs.board[0]), boardKm: bs.board[2] / Math.max(1, bs.board[3]), kmGig: bs.km / Math.max(1, bs.gigs),
        peak: bs.live.songs ? bs.live.peak / bs.live.songs : 0, lineup: bs.lineup / Math.max(1, bs.careers), payoff: bs.payoff,
        paidElig: bs.paidElig, eligible: bs.eligible };
    }
  });
  if (bandId) { console.log('\n=== ' + ((GG.content.bands[bandId] || {}).name || bandId) + ' (' + bandId + ') ==='); summary.push({ id: bandId, per: per }); }
  console.log(out.join('\n\n'));
});
if (summary.length > 1) {   // v0.9: the cross-band comparison (targets: plan_contract_0.9 §5 B4, measured against Hail Damage)
  const pad2 = (v, n) => { const s = v == null ? '-' : String(v); return s.length >= n ? s : ' '.repeat(n - s.length) + s; };
  ['avg', 'good'].forEach(style => {
    console.log('\nCROSS-BAND (' + style + ' bot): fans@y' + Math.min(3, years) + ' fund@y' + Math.min(3, years) + ' | loans y1-3 | quits/yr rets/yr | local wk, 1st offer wk, signed wk, world wk | signed@y' + Math.min(3, years) +
      ' | cards/career no-card% | board n @km | km/gig | peak moment/song | rival lineup | payoff');
    summary.forEach(b => {
      const x = b.per[style]; if (!x) return;
      console.log(pad2(b.id, 18) + ' ' + pad2(x.fans3, 6) + ' ' + pad2(x.fund3, 6) + ' | ' + pad2(x.loans13.toFixed(1), 4) + ' | ' + pad2(x.quits.toFixed(2), 5) + ' ' + pad2(x.rets.toFixed(2), 5) +
        ' | ' + pad2(x.local, 4) + ' ' + pad2(x.offer, 4) + ' ' + pad2(x.signed, 4) + ' ' + pad2(x.world, 4) + ' | ' + pad2(x.sgn3.toFixed(1), 3) +
        ' | ' + pad2(x.cards.toFixed(0), 4) + ' ' + pad2(Math.round(x.noCard * 100) + '%', 4) + ' | ' + pad2(x.board.toFixed(1), 4) + ' @' + pad2(Math.round(x.boardKm), 4) +
        ' | ' + pad2(Math.round(x.kmGig), 4) + ' | ' + pad2(Math.round(x.peak * 100) + '%', 4) + ' | ' + pad2(x.lineup.toFixed(1), 3) + ' | ' + x.payoff + ' (' + x.paidElig + '/' + x.eligible + ' eligible)');
    });
    // §5 B4 targets against Hail Damage (avg bot is the one that counts): ok / MISS per target
    const hd = (summary.find(b => b.id === 'hail_damage') || {}).per;
    if (!hd || !hd[style]) return;
    const H = hd[style], mark = (c) => c ? 'ok' : 'MISS';
    summary.filter(b => b.id !== 'hail_damage').forEach(b => {
      const x = b.per[style]; if (!x) return;
      const t = [
        // avg bot: Local Heroes by week 24 +/- 4 (§5 B4); the good bot only has to stay Hail Damage-like (its own Local week +/- 4)
        'local wk ' + x.local + ' ' + mark(x.local != null && Math.abs(x.local - (style === 'good' ? H.local : 24)) <= 4),
        'fans ' + Math.round(100 * x.fans3 / Math.max(1, H.fans3)) + '% ' + mark(Math.abs(x.fans3 / Math.max(1, H.fans3) - 1) <= 0.2),
        'fund ' + Math.round(100 * x.fund3 / Math.max(1, H.fund3)) + '% ' + mark(Math.abs(x.fund3 / Math.max(1, H.fund3) - 1) <= 0.25),
        'loans ' + x.loans13.toFixed(1) + ' ' + mark(x.loans13 <= H.loans13 + 1),
        'signed@3 ' + x.sgn3.toFixed(1) + ' ' + mark(x.sgn3 >= H.sgn3 - 0.15),
        // World: the week (reachers only) within a year of Hail Damage's AND the reach share within 15 points of it (a band
        // with 2/30 careers in the World era must not pass on those two careers' week alone)
        'world ' + (x.world || '-') + ' (' + Math.round(100 * x.worldN) + '%) ' + mark((x.world != null && H.world != null ? Math.abs(x.world - H.world) <= WPY : x.world == null && H.world == null) && x.worldN >= H.worldN - 0.15),
        'cards ' + Math.round(100 * x.cards / Math.max(1, H.cards)) + '% ' + mark(x.cards >= 0.85 * H.cards),
        'no-card +' + Math.round(100 * (x.noCard - H.noCard)) + 'pt ' + mark(x.noCard <= H.noCard + 0.10),
        'board ' + x.board.toFixed(1) + '@' + Math.round(x.boardKm) + ' ' + mark(x.board >= 3 && x.boardKm <= 300),
        'km/gig ' + (x.kmGig / Math.max(1, H.kmGig)).toFixed(2) + 'x ' + mark(x.kmGig <= 1.25 * H.kmGig),
        'quits ' + x.quits.toFixed(2) + '/yr rets ' + (x.quits ? Math.round(100 * x.rets / x.quits) : 0) + '% ' + mark(x.quits <= 1 && (x.quits === 0 || x.rets / x.quits >= 0.4))
      ];
      // Q3 payoff (good bot): at least 30% of the careers whose needs were met with a window left actually fire it
      if (style === 'good') t.push('payoff ' + x.paidElig + '/' + x.eligible + ' ' + (x.eligible ? mark(x.paidElig / x.eligible >= 0.3) : '-'));
      console.log('  targets ' + pad2(b.id, 18) + ' ' + t.join(' | '));
    });
  });
}
console.log(problems.length ? 'INVARIANT PROBLEMS:\n  ' + problems.join('\n  ') : 'invariants OK (finite, in RANGES, fund >= 0 after every wrap, fans < 100k)');
console.log('done in ' + ((Date.now() - t0) / 1000).toFixed(2) + ' s');
