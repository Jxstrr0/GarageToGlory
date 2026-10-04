#!/usr/bin/env node
// tools/make_fixtures_v12.js: the v1.3 "Songwriter" stage-0 compatibility fixtures (plan_contract_1.3 §3.2). Generated from the
// 1.2.0.0 tree BEFORE any v1.3 src edit, so every fingerprint is what 1.2 does:
//   node tools/make_fixtures_v12.js [outDir]   -> <outDir>/v12_songs.json + v12_<drums|bass|rhythm|lead>.json.gz
// Running it on a v1.3 tree would bless v1.3 behaviour: regenerate only from a 1.2.0.0 checkout (SRC=<checkout>), and a fixture
// change needs the lead and a logged reason. tests/compat_v12.test.js requires this file for the shared code (corpus resolve,
// fingerprint, save load) and wants every fingerprint it recomputes with the current src equal to the stored one.
//   v12_<seat>.json.gz : a real 1.2 career per seat (newCareer + 14 avg bot weeks, solo + outro owned, written songs with parts on
//     non-default prog / hook indexes, the bass seat's raw 4-row bass, state.draft (+ a part on string seats), 2 pendingSongs),
//     stored by GG.save.write on a fake storage with savedAt fixed (the slot string, gzipped).
//   v12_songs.json : { version, gears, keys, corpus (the generated entries' raw 1.2 patterns), entries ({ id: the H16s in KEYS
//     order, space-separated }), sim, save }.
// Fingerprints (H16 = first 16 hex of sha1(JSON)): SAN (sanitize loose / 4 lanes no pedal / full gear), NOTES (toNotes), RATE (the
// whole rate() object, tips included, both gears) + PR (partRating) for the entry as is and with a part per string seat (its own
// part, else part.full seeded per entry: IN pins those inputs), CHART (drum chart x 4 difficulties, + sanitized at 4 lanes and at
// full gear, fixed extras rng), SEAT (seatChart per string seat x 4 difficulties at 4 lanes + hard / expert at 6), PART0
// (A.timeline per seat with its part, + no seat; + seat 'drums' and no seat with the entry's own part) at the song's bpm and 80 /
// 140 / 200 (old-save songs: a lighter set, see fingerprint), SIM (per genre x variant: the similarity matrix), SAVE0 (each fixture save loaded through 10_save: per song the pattern + the
// stored rating; draft and pendingSongs as loaded, and as the 1.2 sequencer stores them when opened and saved untouched).
const fs = require('fs'), path = require('path'), zlib = require('zlib'), crypto = require('crypto');
const ROOT = path.resolve(process.env.SRC || path.join(__dirname, '..'));
const FIXDIR = path.join(ROOT, 'tests', 'fixtures');
const H16 = x => crypto.createHash('sha1').update(JSON.stringify(x === undefined ? null : x)).digest('hex').slice(0, 16);
const clone = x => x == null ? x : JSON.parse(JSON.stringify(x));
const G4 = { lanes: 4, doubleKick: false };
const GF = { lanes: 6, doubleKick: true, owned: ['toms', 'ride', 'pedal'], sections: ['outro', 'solo'], quality: 3 };
const STR = ['bass', 'rhythm', 'lead'];
const SEATS = ['drums', 'bass', 'rhythm', 'lead'];
const DIFFS = ['easy', 'normal', 'hard', 'expert'];
const BANDS = { metal: 'hail_damage', punk: 'frost_heave', rock: 'gravel_kings', country: 'grid_road_ramblers' };
const SEAT_BAND = { drums: 'hail_damage', bass: 'grid_road_ramblers', rhythm: 'frost_heave', lead: 'gravel_kings' };
const OLD_SAVES = ['save_v01', 'v09_ended', 'v09_world_y9', 'v09_y10w14', 'v10_recruit'];
const E16 = '................', X16 = 'xxxxxxxxxxxxxxxx';
const SAVED_AT = 1790000000000;

// The DOM-free modules (tests/_load.js, SIM_SAFE skips 30 / 31) + 30_audio.js and 31_audio_feel.js evaluated against GG.
function loadGG() {
  const load = require(path.join(ROOT, 'tests', '_load.js'));
  const store = load.fakeStorage(), GG = load({ localStorage: store });
  for (const f of ['30_audio.js', '31_audio_feel.js']) new Function('window', fs.readFileSync(path.join(ROOT, 'src', f), 'utf8'))({ GG: GG });
  GG.state = null;
  return { GG, store };
}
function slotString(name) {   // the stored slot string of a fixture save
  if (name === 'save_v01') return JSON.stringify(JSON.parse(fs.readFileSync(path.join(FIXDIR, 'save_v01.json'), 'utf8')));
  return zlib.gunzipSync(fs.readFileSync(path.join(FIXDIR, name + '.json.gz'))).toString('utf8');
}
// Loads a slot string through 10_save (slot '3' of the fake storage): -> the migrated record.
function readSave(GG, store, raw) {
  store.setItem(GG.save.KEYS.slot('3'), raw);
  const rec = GG.save.readRecord('3');
  store.removeItem(GG.save.KEYS.slot('3'));
  if (!rec) throw new Error('fixture save did not load');
  return rec;
}

/* ---- the v12_<seat> careers --------------------------------------------------------------------------------------- */
function withIdx(GG, p, seat, idx) {   // a part for this seat on prog / hook `idx[section]` (mod the list), suggestion rows
  const S = GG.songs, g = GG.state.genre, k = S.part.key(seat);
  p.part = S.part.full(g, seat, p);
  S.sectionsOf(p).forEach(name => { const n = S.part.choices(g, seat, name).length; p.part.sections[name][k] = (idx[name] || 0) % n; });
  return S.sanitize(p, GG.state.gear, g);
}
function makeCareer(GG, seat) {
  const S = GG.songs, si = SEATS.indexOf(seat);
  const st = GG.career.newCareer({ seed: 4201 + 17 * si, bandId: SEAT_BAND[seat], seat: seat, player: { name: 'Fixture', nick: 'Fix' } });
  GG.state = st;
  for (let w = 0; w < 14; w++) GG.career.botWeek(st, 'avg');   // a lived-in 1.2 career: jams with v1 parts, gigs, chat
  GG.shop.unlockSection(st, 'outro'); GG.shop.unlockSection(st, 'solo');
  const g = st.genre, gear = st.gear, str = seat !== 'drums';
  const write = p => { const s = S.create(st, p, null, {}); st.stats.songsWritten++; return s; };
  // 1: the signature, prog / hook verse 1, chorus 2, bridge 1, two cells edited
  let p = S.signature(g, gear);
  if (str) { p = withIdx(GG, p, seat, { verse: 1, chorus: 2, bridge: 1 }); p = S.part.toggle(p, 'verse', 0, 3, gear, g); p = S.part.toggle(p, 'chorus', 1, 6, gear, g); }
  else p = S.modify(p, 'verse', (S.grooves(g).mods[0] || {}).id, gear, g).pattern;
  write(p);
  // 2: a solo and an outro (rows of their own), indexes verse 2, chorus 0, bridge 1, solo 1, outro 2
  p = S.addSection(S.addSection(S.signature(g, gear), 'solo', gear), 'outro', gear);
  if (str) p = withIdx(GG, p, seat, { verse: 2, chorus: 0, bridge: 1, solo: 1, outro: 2 });
  write(p);
  // 3: the drummer's groove (presets) + a part mod ('double'), chorus on index 1
  p = S.starter(g, gear);
  const pre = S.presets(g, gear).filter(x => !x.locked);
  ['verse', 'chorus', 'bridge'].forEach((name, i) => { if (pre[i]) p = S.applyPreset(p, name, pre[i].id, gear, g); });
  if (str) { p = withIdx(GG, p, seat, { chorus: 1 }); p = S.part.modify(p, 'verse', 'double', gear, g).pattern; }
  write(p);
  if (seat === 'bass') {   // a raw 4-row bass in the catalog (a stored pattern 1.2 never cleaned)
    const pt = st.songs[st.songs.length - 1].pattern.part;
    pt.sections.verse.rows = pt.sections.verse.rows.concat(['x.......x.......']);
  }
  // state.draft: what the sketch pad keeps (U.clone(D.pat)): a part on index 2 / 1 / 0 with an edit
  p = S.signature(g, gear);
  if (str) { p = withIdx(GG, p, seat, { verse: 2, chorus: 1, bridge: 0 }); p = S.part.toggle(p, 'bridge', 0, 5, gear, g); }
  else p.sections.verse[1] = S.setHit(p.sections.verse[1], 7, true);
  st.draft = clone(p);
  // 2 pendingSongs (queued entries: a sanitized pattern + titles); the bass seat's second one carries a raw 4-row bass
  const taken = [];
  for (let i = 0; i < 2; i++) {
    let q = i ? S.addSection(S.starter(g, gear), 'outro', gear) : S.signature(g, gear);
    if (str) q = withIdx(GG, q, seat, i ? { verse: 1, chorus: 1, bridge: 1, outro: 1 } : { chorus: 2 });
    const t = S.pickTitle(st, GG.RNG(GG.hashSeed('v12|pending|' + seat + '|' + i)), taken); taken.push(t.title);
    q.title = t.title; q.titleEn = t.titleEn || t.title; if (t.fr) q.fr = true;
    if (seat === 'bass' && i === 1) q.part.sections.chorus.rows = q.part.sections.chorus.rows.concat(['x...x...x...x...']);
    st.pendingSongs.push(q);
  }
  const realNow = Date.now;
  try { Date.now = () => SAVED_AT; GG.save.write('1', st); } finally { Date.now = realNow; }
  const raw = GG.store.getItem(GG.save.KEYS.slot('1'));
  GG.store.removeItem(GG.save.KEYS.slot('1'));
  GG.state = null;
  return raw;
}

/* ---- the corpus ----------------------------------------------------------------------------------------------------- */
function partOn(GG, g, seat, base, sec) {   // a raw part: sec(name, i) -> { idx, rows } per section of base
  const S = GG.songs, k = S.part.key(seat), out = { seat: seat, sections: {} };
  S.sectionsOf(base).forEach((name, i) => { const x = sec(name, i, S.part.suggest(g, seat, name)); if (x) { const o = {}; o[k] = x.idx; o.rows = x.rows; out.sections[name] = o; } });
  return Object.assign(clone(base), { part: out });
}
function generated(GG) {   // -> [{ id, genre, pat }] (raw 1.2 patterns)
  const S = GG.songs, out = [];
  for (const g of ['metal', 'punk', 'rock', 'country']) {
    const add = (id, pat) => out.push({ id: g + '|' + id, genre: g, pat: clone(pat) });
    const sig = S.signature(g), sigx = clone(sig);
    sigx.sections.solo = sigx.sections.verse.slice(); sigx.sections.outro = sigx.sections.chorus.slice();
    sigx.arrangement = ['verse', 'chorus', 'bridge', 'solo', 'chorus', 'outro'];
    add('sig', sig); add('sigx', sigx); add('starter', S.starter(g));
    for (let i = 1; i <= 3; i++) add('gen' + (100 + i), S.generate(g, GG.RNG(100 + i), {}));
    add('gen7full', S.generate(g, GG.RNG(7), { gear: GF }));
    // 3 jammed careers per seat (songs.jam: v1 parts on string seats); the third with all the gear (solo / outro in the parts)
    SEATS.forEach((seat, si) => {
      for (let c = 0; c < 3; c++) {
        const st = GG.career.newCareer({ seed: 300 + 31 * si + 7 * c, bandId: BANDS[g], seat: seat, player: { name: 'Jam' } });
        if (c === 2) { st.gear.lanes = 6; st.gear.doubleKick = true; st.gear.owned = ['toms', 'ride', 'pedal']; GG.shop.unlockSection(st, 'outro'); GG.shop.unlockSection(st, 'solo'); }
        const rng = GG.RNG(GG.hashSeed('v12|jam|' + g + '|' + seat + '|' + c));
        S.jam(st, rng); S.jam(st, rng);
        [0, st.songs.length - 2, st.songs.length - 1].forEach(i => add('jam|' + seat + '|' + c + '|' + st.songs[i].id, st.songs[i].pattern));
      }
    });
    // part edge cases per string seat
    STR.forEach(seat => {
      const n = S.part.ROWS[seat], blank = Array(n).fill(E16), full = Array(n).fill(X16);
      let max = 0; ['verse', 'chorus', 'bridge'].forEach(name => { max = Math.max(max, S.part.choices(g, seat, name).length); });
      for (let i = 0; i < max; i++) add(seat + '|idx' + i, partOn(GG, g, seat, sig, (name, j, sg) => ({ idx: i, rows: sg.rows })));
      add(seat + '|idx-mixed', partOn(GG, g, seat, sigx, (name, j, sg) => ({ idx: (j * 2 + 1) % max, rows: sg.rows })));
      add(seat + '|same', partOn(GG, g, seat, sig, (name, j, sg) => ({ idx: 0, rows: S.part.suggest(g, seat, 'verse').rows })));
      add(seat + '|empty', partOn(GG, g, seat, sig, () => ({ idx: 1, rows: blank })));
      add(seat + '|allx', partOn(GG, g, seat, sigx, () => ({ idx: 0, rows: full })));
      add(seat + '|p99', partOn(GG, g, seat, sig, (name, j, sg) => ({ idx: 99, rows: sg.rows })));
      add(seat + '|odd', partOn(GG, g, seat, sig, (name, j, sg) => ({ idx: [-3, 1.7, '2'][j % 3], rows: sg.rows.map((r, ri) => ri ? r.slice(0, 9) : 'x?x-' + r.slice(4)) })));
      add(seat + '|verse-only', partOn(GG, g, seat, sigx, (name, j, sg) => name === 'verse' ? { idx: 1, rows: sg.rows } : null));
      add(seat + '|full', Object.assign(clone(sigx), { part: S.part.full(g, seat, sigx, GG.RNG(5)) }));
      add(seat + '|wrongkey', (() => { const q = partOn(GG, g, seat, sig, (name, j, sg) => ({ idx: 2, rows: sg.rows })); Object.values(q.part.sections).forEach(x => { x[seat === 'lead' ? 'prog' : 'hook'] = x[S.part.key(seat)]; delete x[S.part.key(seat)]; }); return q; })());
    });
    add('bass|rows4', partOn(GG, g, 'bass', sig, (name, j, sg) => ({ idx: j, rows: sg.rows.concat(['x...x...x...x...']) })));
    add('part-drums', Object.assign(clone(sig), { part: { seat: 'drums', sections: { verse: { prog: 1, rows: [X16] } } } }));
    add('part-junk', Object.assign(clone(sig), { part: { seat: 'bass', sections: 'nope' } }));
  }
  return out;
}
// Every entry: [{ id, genre, src?, pat }] with pat resolved (save songs, drafts, pendingSongs through 10_save).
function corpus(GG, store, gen, careers) {
  const out = gen.map(e => ({ id: e.id, genre: e.genre, pat: clone(e.pat) }));
  const names = OLD_SAVES.concat(SEATS.map(s => 'v12_' + s));
  for (const name of names) {
    const raw = name.startsWith('v12_') ? careers[name.slice(4)] : slotString(name), s = readSave(GG, store, raw).state, g = s.genre || 'metal';
    s.songs.forEach((x, i) => out.push({ id: name + '#' + i, genre: g, src: name, pat: clone(x.pattern) }));
    if (s.draft) out.push({ id: name + '#draft', genre: g, src: name, pat: clone(s.draft) });
    (s.pendingSongs || []).forEach((x, i) => out.push({ id: name + '#pending' + i, genre: g, src: name, pat: clone(x) }));
  }
  return out;
}

/* ---- fingerprints --------------------------------------------------------------------------------------------------- */
// The entry as is + one variant per string seat: its own part when it is that seat's, else part.full seeded per entry.
function variants(GG, e) {
  const p = e.pat, own = p && p.part && typeof p.part === 'object' ? p.part : null, V = { asis: clone(p) };
  STR.forEach(seat => {
    const pt = own && own.seat === seat ? own : GG.songs.part.full(e.genre, seat, p, GG.RNG(GG.hashSeed('v12|' + e.id + '|' + seat)));
    V[seat] = Object.assign(clone(p), { part: clone(pt) });
  });
  return V;
}
// Full set for the generated corpus and the v12 careers; the 313 old-save songs (0.9 / 1.0 drum patterns, no parts) take a
// light set (drum charts as is x 4 difficulties, seat charts hard @ 4 + expert @ 6, timelines at their bpm + 140 per seat).
function fingerprint(GG, e) {
  const S = GG.songs, A = GG.audio, g = e.genre, p = e.pat, V = variants(GG, e), f = {}, light = OLD_SAVES.indexOf(e.src) >= 0;
  const own = p && p.part && typeof p.part === 'object' ? p.part : null;
  f.san = [H16(S.sanitize(clone(p), null, null, true)), H16(S.sanitize(clone(p), G4, g)), H16(S.sanitize(clone(p), GF, g))];
  f.notes = H16(S.toNotes(clone(p)));
  f.inp = {}; STR.forEach(seat => { f.inp[seat] = H16(V[seat].part); });
  f.rate = {}; f.pr = {};
  ['asis'].concat(STR).forEach(k => { f.rate[k] = H16([S.rate(clone(V[k]), g, G4), S.rate(clone(V[k]), g, GF)]); f.pr[k] = H16(S.partRating(clone(V[k]), g)); });
  const charts = [], dc = (q, qi, d) => charts.push(H16(GG.gig.chart({ id: e.id, pattern: q }, { difficulty: d, extras: GG.RNG(GG.hashSeed('v12|extras|' + e.id + '|' + qi + '|' + d)) })));
  DIFFS.forEach(d => dc(clone(p), 0, d));
  if (!light) { dc(S.sanitize(clone(p), G4, g), 1, 'hard'); dc(S.sanitize(clone(p), GF, g), 2, 'expert'); }
  f.chart = H16(charts);
  f.seat = {};
  const SC = light ? [['hard', 4], ['expert', 6]] : DIFFS.map(d => [d, 4]).concat([['hard', 6], ['expert', 6]]);
  STR.forEach(seat => { f.seat[seat] = H16(SC.map(x => H16(GG.gig.chart({ id: e.id, pattern: clone(V[seat]) }, { seat: seat, genre: g, lanes: x[1], difficulty: x[0] })))); });
  const tl = (q, o, bpms) => H16(bpms.map(b => { const x = clone(q); if (b) x.bpm = b; return H16(A.timeline(x, Object.assign({ genre: g, songId: e.id }, o))); }));
  const BP = [null, 80, 140, 200];
  f.part0 = { none: tl(p, {}, BP) };
  STR.forEach(seat => { f.part0[seat] = tl(V[seat], { seat: seat, part: clone(V[seat].part) }, light ? [null, 140] : BP); });
  if (own) { f.part0.drums = tl(p, { seat: 'drums', part: clone(own) }, BP); f.part0.own = tl(p, { part: clone(own) }, BP); }
  return f;
}
// Per genre: the similarity matrix (upper triangle) as is over every entry; with a part per string seat over the entries that
// are not old-save songs (generated + v12 careers: the part term is what v1.3 gates).
function simMatrix(GG, list) {
  const Vs = list.map(e => variants(GG, e)), fresh = list.map(e => OLD_SAVES.indexOf(e.src) < 0), out = {};
  ['asis'].concat(STR).forEach(k => {
    const a = [], ix = Vs.map((_, i) => i).filter(i => k === 'asis' || fresh[i]);
    for (let i = 0; i < ix.length; i++) for (let j = i + 1; j < ix.length; j++) a.push(GG.songs.similarity(Vs[ix[i]][k], Vs[ix[j]][k]));
    out[k] = H16(a);
  });
  return out;
}
// What the 1.2 sequencer stores for a queued song / the draft opened and saved untouched (54: sanitize, withPart, sanitize).
function openSave(GG, s, x) {
  const S = GG.songs, gear = s.gear || S.DEFAULT_GEAR, g = s.genre || 'metal', seat = GG.career.seatOf(s);
  const p = S.sanitize(clone(x), gear, g);
  if (seat === 'drums') delete p.part;
  else p.part = p.part && p.part.seat === seat ? S.part.sanitize(p.part, S.sectionsOf(p), g) : S.part.full(g, seat, p);
  const entry = S.sanitize(p, gear, g);
  if (x && x.title != null) { entry.title = x.title; entry.titleEn = x.titleEn || x.title; if (S.isFrench && S.isFrench(entry.title)) entry.fr = true; }
  return entry;
}
function save0(GG, store, raw) {
  const rec = readSave(GG, store, raw), s = rec.state;
  return { version: rec.version, seat: GG.career.seatOf(s), genre: s.genre,
    songs: s.songs.map(x => [H16(x.pattern), x.rating]),
    draft: H16(s.draft), pending: H16(s.pendingSongs),
    draftSan: s.draft ? H16(openSave(GG, s, s.draft)) : null, pendingSan: (s.pendingSongs || []).map(x => H16(openSave(GG, s, x))) };
}
// An entry's fingerprints as one string: the H16s in KEYS order, space-separated (part0.drums / part0.own only with an own part).
const KEYS = ['san.0', 'san.1', 'san.2', 'notes'].concat(STR.map(s => 'inp.' + s), ['asis'].concat(STR).map(s => 'rate.' + s),
  ['asis'].concat(STR).map(s => 'pr.' + s), ['chart'], STR.map(s => 'seat.' + s), ['none'].concat(STR, ['drums', 'own']).map(s => 'part0.' + s));
function flat(f) { const o = {}; KEYS.forEach(k => { const [a, b] = k.split('.'), v = b == null ? f[a] : f[a] && f[a][b]; if (v != null) o[k] = v; }); return o; }
function encode(f) { const o = flat(f); return KEYS.filter(k => o[k] != null).map(k => o[k]).join(' '); }
function decode(str) { const o = {}, a = String(str).split(' '); KEYS.forEach((k, i) => { if (a[i] != null) o[k] = a[i]; }); return o; }
function compute(GG, store, gen, careers) {
  const entries = corpus(GG, store, gen, careers), out = { entries: {}, sim: {}, save: {} };
  entries.forEach(e => { out.entries[e.id] = encode(fingerprint(GG, e)); });
  ['metal', 'punk', 'rock', 'country'].forEach(g => { out.sim[g] = simMatrix(GG, entries.filter(e => e.genre === g)); });
  OLD_SAVES.forEach(n => { out.save[n] = save0(GG, store, slotString(n)); });
  SEATS.forEach(seat => { out.save['v12_' + seat] = save0(GG, store, careers[seat]); });
  out.count = entries.length;
  return out;
}
function careerStrings(dir) {   // the v12_<seat> slot strings from the fixture files
  const o = {};
  SEATS.forEach(seat => { o[seat] = zlib.gunzipSync(fs.readFileSync(path.join(dir || FIXDIR, 'v12_' + seat + '.json.gz'))).toString('utf8'); });
  return o;
}

module.exports = { loadGG, H16, clone, G4, GF, STR, SEATS, DIFFS, OLD_SAVES, FIXDIR, KEYS, slotString, readSave, corpus, variants, fingerprint,
  flat, encode, decode, simMatrix, openSave, save0, compute, careerStrings };

if (require.main === module) {
  const OUT = path.resolve(process.argv[2] || FIXDIR);
  const t0 = Date.now();
  const careers = {};
  SEATS.forEach(seat => {   // each career in a fresh load (nothing carried between them)
    const { GG, store } = loadGG(); GG.store = store;
    careers[seat] = makeCareer(GG, seat);
  });
  const { GG, store } = loadGG();
  const gen = generated(GG);
  const res = compute(GG, store, gen, careers);
  const fx = { version: GG.VERSION, note: 'plan_contract_1.3 §3.2: 1.2.0.0 fingerprints (tools/make_fixtures_v12.js); never edit to make a test pass',
    gears: { g4: G4, full: GF }, keys: KEYS, count: res.count, corpus: gen, entries: res.entries, sim: res.sim, save: res.save };
  fs.mkdirSync(OUT, { recursive: true });
  SEATS.forEach(seat => { fs.writeFileSync(path.join(OUT, 'v12_' + seat + '.json.gz'), zlib.gzipSync(careers[seat], { level: 9 })); });
  const json = JSON.stringify(fx);
  fs.writeFileSync(path.join(OUT, 'v12_songs.json'), json + '\n');
  console.log('v12 fixtures from ' + GG.VERSION + ': ' + res.count + ' entries (' + gen.length + ' generated), ' + json.length + ' chars; careers ' +
    SEATS.map(s => s + ' ' + careers[s].length).join(', ') + '; ' + (Date.now() - t0) + ' ms');
}
