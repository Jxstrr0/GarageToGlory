// tests/compat_v12.test.js: the v1.3 compatibility law (plan_contract_1.3 §3.2, §7). A song / pattern / part / save WITHOUT the
// v1.3 fields sanitizes, rates, charts, renders and saves exactly as 1.2.0.0: every fingerprint in tests/fixtures/v12_songs.json
// (made by tools/make_fixtures_v12.js on the untouched 1.2.0.0 tree; its header lists what each one covers) is recomputed here with
// the current src and must be equal. Never edit a fixture to make this pass: a fixture change needs the lead and a logged reason.
// Corpus: per genre the signature (+ solo / outro), the starter, generate(RNG 101..103), a full-gear jam, 3 jammed careers per
// seat, part edge cases; every song of save_v01 + v09_* + v10_*; the v12_<seat> careers' songs, drafts and pendingSongs.
const fs = require('fs'), path = require('path');
const { test, ok, eq, done } = require('./_t');
const FX = require('../tools/make_fixtures_v12.js');
const fixture = JSON.parse(fs.readFileSync(path.join(FX.FIXDIR, 'v12_songs.json'), 'utf8'));
const { GG, store } = FX.loadGG();
const careers = FX.careerStrings();
const entries = FX.corpus(GG, store, fixture.corpus, careers);
const got = {};
entries.forEach(e => { got[e.id] = FX.flat(FX.fingerprint(GG, e)); });

// Compares the recomputed fingerprints whose key starts with one of `prefixes`; throws a short list of what drifted.
function check(prefixes, what) {
  const bad = [];
  let n = 0;
  entries.forEach(e => {
    const want = FX.decode(fixture.entries[e.id]), have = got[e.id];
    FX.KEYS.filter(k => prefixes.some(p => k.indexOf(p) === 0)).forEach(k => {
      if (want[k] == null && have[k] == null) return;
      n++;
      if (want[k] !== have[k]) bad.push(e.id + ' ' + k);
    });
  });
  ok(n > 0, what + ': nothing compared');
  if (bad.length) throw new Error(what + ': ' + bad.length + ' of ' + n + ' drifted from 1.2.0.0, e.g. ' + bad.slice(0, 8).join(', '));
  return n;
}

test('the fixture: 1.2.0.0, every corpus entry resolves (generated + old saves + v12 careers), same keys', () => {
  eq(fixture.version, '1.2.0.0', 'made on the 1.2.0.0 tree');
  eq(fixture.keys, FX.KEYS, 'fingerprint keys');
  eq(entries.length, fixture.count, 'corpus size');
  eq(entries.map(e => e.id), Object.keys(fixture.entries), 'corpus ids, in order');
  const seats = FX.SEATS.map(s => fixture.save['v12_' + s]);
  eq(seats.map(s => s.version + ' ' + s.seat), ['1.2.0.0 drums', '1.2.0.0 bass', '1.2.0.0 rhythm', '1.2.0.0 lead'], 'a real 1.2 career per seat');
  ok(seats.every(s => s.pendingSan.length === 2 && s.draftSan), 'each v12 career has a draft and 2 pendingSongs');
});

test('IN: the variant parts (part.full seeded per entry: what jams, bots and create use, D13) are 1.2 exactly', () => {
  check(['inp.'], 'part.full inputs');
});

test('SAN: sanitize (loose, 4 lanes no pedal, full gear) of every entry is the 1.2 JSON', () => { check(['san.'], 'SAN'); });

test('NOTES: toNotes of every entry is 1.2', () => { check(['notes'], 'NOTES'); });

test('RATE + PR: the whole rate() object (tips included, both gears) and partRating, as is and with a part per string seat', () => {
  check(['rate.', 'pr.'], 'RATE / PR');
});

test('CHART0: drum charts (4 difficulties, fixed extras) and seat charts per string seat are 1.2', () => {
  check(['chart'], 'drum CHART0'); check(['seat.'], 'seat CHART0');
});

test('PART0: A.timeline per seat with its part, no seat, seat drums + the own part, at the song bpm and 80 / 140 / 200', () => {
  check(['part0.'], 'PART0');
});

test('SIM: the per-genre similarity matrices (as is; with a part per string seat) are 1.2', () => {
  ['metal', 'punk', 'rock', 'country'].forEach(g => eq(FX.simMatrix(GG, entries.filter(e => e.genre === g)), fixture.sim[g], g + ' similarity'));
});

// v1.3 upgrade gate (plan_contract_1.3 §3.7, §4.4): a v1 part and its v2 upgrade rate the same (the whole rate() object, tips
// included, both gears) and partRating the same, for every corpus entry x string seat; similarity sees no difference either.
test('upgrade gate: rate(p + part.upgrade(pt)) deep-equals rate(p + pt) (tips, both gears) + partRating, every entry x string seat; similarity too', () => {
  const S = GG.songs, bad = [];
  let n = 0;
  entries.forEach(e => {
    const V = FX.variants(GG, e);
    FX.STR.forEach(seat => {
      const pv = V[seat], up = Object.assign(FX.clone(pv), { part: S.part.upgrade(FX.clone(pv.part)) });
      const sv = S.sanitize(FX.clone(pv), null, null, true).part;
      if (sv && !(up.part && up.part.v === 2)) bad.push(e.id + ' ' + seat + ' not upgraded');
      [FX.G4, FX.GF].forEach(gear => { n++; if (JSON.stringify(S.rate(FX.clone(up), e.genre, gear)) !== JSON.stringify(S.rate(FX.clone(pv), e.genre, gear))) bad.push(e.id + ' ' + seat + ' rate'); });
      if (JSON.stringify(S.partRating(FX.clone(up), e.genre)) !== JSON.stringify(S.partRating(FX.clone(pv), e.genre))) bad.push(e.id + ' ' + seat + ' partRating');
    });
  });
  ok(n === entries.length * 6, 'compared ' + n);
  // similarity: neighbouring entries of one genre, v1 parts vs both upgraded vs one upgraded (parts compare in part.view)
  for (let i = 1; i < entries.length; i++) {
    const a = entries[i - 1], b = entries[i];
    if (a.genre !== b.genre) continue;
    const Va = FX.variants(GG, a), Vb = FX.variants(GG, b);
    FX.STR.forEach(seat => {
      const upA = Object.assign(FX.clone(Va[seat]), { part: S.part.upgrade(Va[seat].part) }), upB = Object.assign(FX.clone(Vb[seat]), { part: S.part.upgrade(Vb[seat].part) });
      const s0 = S.similarity(Va[seat], Vb[seat]);
      if (S.similarity(upA, upB) !== s0 || S.similarity(upA, Vb[seat]) !== s0) bad.push(a.id + ' ~ ' + b.id + ' ' + seat + ' similarity');
    });
  }
  if (bad.length) throw new Error(bad.length + ' upgrade mismatches, e.g. ' + bad.slice(0, 8).join(', '));
});

test('SAVE0: every fixture save loads through 10_save to the 1.2 songs, ratings, draft and pendingSongs (+ their open-and-save SAN)', () => {
  FX.OLD_SAVES.forEach(n => eq(FX.save0(GG, store, FX.slotString(n)), fixture.save[n], n));
  FX.SEATS.forEach(s => eq(FX.save0(GG, store, careers[s]), fixture.save['v12_' + s], 'v12_' + s));
});

done('compat_v12');
