#!/usr/bin/env node
// Critic persona probe (scratch). A "human-ish" player on top of the avg bot:
//   NOHUSTLE=1  hustle blocks -> rehearse (plays/writes/gigs instead of side jobs)
//   EAGER=1     buys the next lane/pedal item as soon as fund - cost >= KEEP (default 100); toms -> ride -> pedal
//   JAM=1       moves into the jam room once it opens and fund >= JAMAT (default 250); never downsizes by choice (only eviction)
//   PERF=<n>    gig performance shift (drums -12 = one grade lower, the proposal's h12)
// usage: node human.js <worktree> <seat> <seeds> <years> > out.json
const path = require('path'), fs = require('fs');
const WT = process.argv[2], SEAT = process.argv[3] || 'drums', SEEDS = +process.argv[4] || 40, YEARS = +process.argv[5] || 3;
const load = require(path.join(WT, 'tests', '_load'));
const GG = load({ localStorage: load.fakeStorage() });
new Function('window', fs.readFileSync(path.join(WT, 'src', '30_audio.js'), 'utf8'))({ GG: GG });
const C = GG.contracts, WPY = C.WEEKS_PER_YEAR, K = GG.career, SH = GG.shop, E = GG.content.economy;
const NOH = process.env.NOHUSTLE === '1', EAGER = process.env.EAGER === '1', JAM = process.env.JAM === '1';
const KEEP = +(process.env.KEEP || 100), JAMAT = +(process.env.JAMAT || 250), PD = +(process.env.PERF || 0);
if (PD) { const p = GG.gig.performance; GG.gig.performance = function () { return p.apply(this, arguments) + PD; }; }
if (NOH) { const bp = K.botPlan; K.botPlan = function (s, st) { const p = bp.apply(this, arguments); return GG.tour && GG.tour.away(s) ? p : p.map(a => a === 'hustle' ? 'rehearse' : a); }; }
let ev = null;
const OVR = process.env.OVR ? JSON.parse(process.env.OVR) : null;   // { "content.economy.hustleEra.garage": 0.7 }
if (OVR) for (const k of Object.keys(OVR)) { const p = k.split('.'); let o = GG; for (let i = 0; i < p.length - 1; i++) o = o[p[i]]; o[p[p.length - 1]] = OVR[k]; }
// TIPS='{"S":60,...}': a tip jar on exposure (unpaid) gigs, garage + local eras only, by grade (critic what-if)
const TIPS = process.env.TIPS ? JSON.parse(process.env.TIPS) : null;
if (TIPS) { const ar = GG.gig.applyResult; GG.gig.applyResult = function (st, r) { if (r && r.deal === 'exposure' && !r.tipped && (st.era === 'garage' || st.era === 'local')) { r.pay = (r.pay || 0) + (TIPS[r.grade] || 0); r.tipped = true; } return ar.apply(this, arguments); }; }
GG.on('shop:move', e => { if (ev) { if (e.evicted) ev.evict++; else if (e.tier < (e.fromTier || 99)) ev.moves.push(e.tier); } });
if (EAGER || JAM) {
  const sbw = SH.botWeek;
  SH.botWeek = function (s, style) {
    if (EAGER) for (const id of ['toms', 'ride', 'pedal']) { const d = SH.gearDef(id); if (d && SH.canBuyGear(s, id).ok && s.fund - d.cost >= KEEP) { SH.buyGear(s, id); ev.gear.push([id, s.totalWeek]); break; } }
    if (JAM && (s.spaceTier || 0) === 0 && SH.availableTier(s) >= 1 && s.fund >= JAMAT && SH.canMove(s, 1).ok) { SH.move(s, 1); ev.jamIn++; }
    const Bv = SH.cfg().bot.avg, keep = Bv.downsize; if (JAM) Bv.downsize = 0;
    try { return sbw.apply(this, arguments); } finally { Bv.downsize = keep; }
  };
}
const out = [], seen = new WeakSet();
for (let seed = 1; seed <= SEEDS; seed++) {
  const s = K.newCareer({ seed: seed * 7919, player: { name: 'Bot' }, seat: SEAT });
  ev = { evict: 0, moves: [], gear: [], jamIn: 0 };
  const yrs = [];
  for (let w = 0; w < YEARS * WPY && !s.ended; w++) {
    const y = s.year; const Y = yrs[y - 1] || (yrs[y - 1] = { broke: 0, loan: 0, jamWks: 0, gigs: 0, pay: 0, net: 0, hustle: 0, grades: {}, minFund: 1e9 });
    const e0 = ev.evict;
    const wr = K.botWeek(s, process.env.STYLE || 'avg');
    const lw = s.lastWeek;
    if (lw && lw.blocks) lw.blocks.forEach(b => { if (b.activity === 'hustle') Y.hustle++; });
    const r = s.lastGig && !seen.has(s.lastGig) ? s.lastGig : null;
    if (r) { seen.add(r); Y.gigs++; Y.pay += r.pay || 0; Y.net += (r.pay || 0) - (r.cut || 0) - (r.gas || 0) - (r.fillInCost || 0); Y.grades[r.grade] = (Y.grades[r.grade] || 0) + 1; }
    if (s.fund < 100) Y.broke++;
    if (wr && wr.parentsLoan) Y.loan++;
    if ((s.spaceTier || 0) >= 1) Y.jamWks++;
    Y.minFund = Math.min(Y.minFund, s.fund);
    Y.fund = s.fund; Y.fans = s.fans; Y.era = s.era; Y.evict = ev.evict; Y.lanes = s.gear.lanes; Y.owned = s.gear.owned.slice();
  }
  out.push({ seed, yrs, gear: ev.gear, evict: ev.evict, jamIn: ev.jamIn, signedWk: s.milestones && s.milestones.signed || null });
}
process.stdout.write(JSON.stringify(out));
