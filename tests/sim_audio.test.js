// Audio tests (v0.6.1) that need no Web Audio: the timeline (per-genre band, key per song, section density, vocal hits
// on the beat grid and in key, breakdowns, solos, kit variants), venue rooms and the mixer/metronome settings API.
// 30_audio.js is not DOM-free (the loader skips it), so it is evaluated here against the loaded GG with no AudioContext.
const fs = require('fs'), path = require('path');
const load = require('./_load');
const { test, ok, eq, done } = require('./_t');

const store = load.fakeStorage();
const GG = load({ localStorage: store });
new Function('window', fs.readFileSync(path.join(__dirname, '..', 'src', '30_audio.js'), 'utf8'))({ GG: GG });
const A = GG.audio, C = GG.contracts, G = GG.content.genres;
const song = (g, bpm) => { const p = JSON.parse(JSON.stringify(GG.songs.signature(g))); p.arrangement = ['verse', 'chorus', 'bridge']; if (bpm) p.bpm = bpm; return p; };
const band = t => t.events.filter(e => e.kind !== 'step' && e.kind !== 'drum');

test('no Web Audio: unlock/play fail soft, the pure API still works', () => {
  ok(A.unlock() === false && A.play(song('metal'), { genre: 'metal' }) === null && A.hit('kick') === false && A.sfx('tap') === false);
  ok(A.context() === null && A.ambience() === 'none' && A.room() === null);
});

test('a key per song: seeded by id, deterministic, inside the genre range', () => {
  for (const g of C.GENRES) {
    const B = G[g].backing, seen = new Set();
    for (let i = 1; i <= 12; i++) {
      const k = A.keyFor('s' + i, g);
      eq(A.keyFor('s' + i, g), k, g + ' deterministic');
      ok(k.offset >= B.keys[0] && k.offset <= B.keys[1] && k.tonic === B.root + k.offset && /^[A-G]/.test(k.name), g + ' range ' + JSON.stringify(k));
      seen.add(k.tonic);
    }
    ok(seen.size >= 4, g + ' keys vary: ' + seen.size);
    eq(A.timeline(song(g), { genre: g, songId: 's5' }).key.tonic, A.keyFor('s5', g).tonic, g + ' timeline uses the key');
  }
});

test('the pattern of a catalog song (or a copy of it) plays in that song\'s key', () => {
  const p = song('punk');
  GG.state = { songs: [{ id: 's9', pattern: p }] };
  eq(A.timeline(p, { genre: 'punk' }).key.seed, 's9');
  eq(A.timeline(JSON.parse(JSON.stringify(p)), { genre: 'punk' }).key.seed, 's9');
  eq(A.timeline({ id: 's9', pattern: p }, { genre: 'punk' }).key.seed, 's9');
  GG.state = null;
  ok(/^pat\|/.test(A.timeline(p, { genre: 'punk' }).key.seed), 'unknown pattern: hashed');
});

test('the timeline is deterministic and drums still match toNotes', () => {
  for (const g of C.GENRES) {
    const s = song(g);
    eq(JSON.stringify(A.timeline(s, { genre: g, songId: 's2' })), JSON.stringify(A.timeline(s, { genre: g, songId: 's2' })), g);
    const t = A.timeline(s, { genre: g, backing: false });
    ok(t.events.filter(e => e.kind === 'drum').length === GG.songs.toNotes(s).length && band(t).length === 0, g + ' drums only');
  }
});

test('each genre has its band; vocal hits land on whole beats, in key, and only where they belong', () => {
  const PARTS = { metal: ['gtr', 'gtr2', 'bass', 'lead'], punk: ['gtr', 'bass'], rock: ['gtr', 'bass', 'lead'], country: ['bass', 'clean', 'fiddle', 'twang'] };
  const CHORUS = { metal: 'shout', punk: 'hey', rock: 'yeah', country: 'yeehaw' };
  for (const g of C.GENRES) {
    const t = A.timeline(song(g), { genre: g, songId: 's1' }), b = band(t), B = G[g].backing, kinds = new Set(b.map(e => e.kind));
    ok(PARTS[g].every(k => kinds.has(k)), g + ' parts ' + [...kinds]);
    const vox = b.filter(e => e.kind === 'vox');
    ok(vox.length >= 2, g + ' vocal hits');
    for (const v of vox) {
      ok(v.beat % 1 === 0, g + ' vocal off the beat grid at ' + v.beat);
      ok(B.scale.includes(((v.midi - t.key.tonic) % 12 + 12) % 12), g + ' vocal out of key ' + v.midi);
      ok(v.section === 'chorus' || v.role === 'break', g + ' vocal in a ' + v.section);
    }
    ok(vox.some(v => v.voc === CHORUS[g] && v.section === 'chorus'), g + ' chorus vocal');
    ok(!A.timeline(song(g), { genre: g, vocals: false }).events.some(e => e.kind === 'vox'), g + ' vocals: false');
  }
  const punk = A.timeline(song('punk'), { genre: 'punk', songId: 's1' });
  ok(band(punk).filter(e => e.voc === 'hey').every(e => e.gang), 'punk: gang shouts');
});

test('sections change density: sparse verses, full choruses, stripped breakdowns, solos', () => {
  for (const g of C.GENRES) {
    const b = band(A.timeline(song(g), { genre: g, songId: 's6' })), layers = sec => new Set(b.filter(e => e.section === sec).map(e => e.kind)).size;
    ok(layers('chorus') > layers('verse'), g + ' chorus fuller ' + layers('verse') + ' -> ' + layers('chorus'));
    const brk = b.filter(e => e.role === 'break'), solo = b.filter(e => e.role === 'solo');
    ok(brk.every(e => ['gtr', 'bass', 'vox'].includes(e.kind)), g + ' breakdown: heavy parts only');
    if (solo.length) ok(solo.some(e => e.kind === 'lead' || e.kind === 'fiddle'), g + ' solo');
  }
  const metal = band(A.timeline(song('metal', 140), { genre: 'metal', songId: 's6' }));
  eq(metal.filter(e => e.role === 'break' && e.kind === 'vox').map(e => e.voc), ['growl'], 'metal: a growl where the breakdown drops');
  ok(metal.filter(e => e.role === 'break' && e.kind === 'gtr').every(e => e.mute), 'metal breakdown: palm-muted');
  ok(metal.filter(e => e.kind === 'lead').every(e => e.role === 'solo'), 'Dana solos in the bridge only');
});

test('metal: chugs on every kick hit, bass doubling; tempo still decides the style', () => {
  const t = A.timeline(song('metal', 140), { genre: 'metal', songId: 's3' }), b = band(t);
  eq(t.style, 'chug');
  const kicks = t.events.filter(e => e.kind === 'drum' && e.lane === 'kick' && e.section !== 'bridge');
  ok(kicks.length > 8 && kicks.every(k => b.some(e => e.kind === 'gtr' && e.beat === k.beat) && b.some(e => e.kind === 'bass' && e.beat === k.beat)), 'every kick');
  eq([80, 140, 200].map(bpm => A.styleFor('metal', bpm).id), ['doom', 'chug', 'tremolo']);
});

test('kit variants: country train beat (rim on the verse backbeat, brushes between), toms roll down', () => {
  const p = song('country'); p.sections.verse = ['x.......x.......', 'x.x.x.x.x.x.x.x.', '................', '................'];
  const sn = A.timeline(p, { genre: 'country', section: 'verse', backing: false }).events.filter(e => e.lane === 'snare' && e.bar === undefined);
  const byStep = sn.slice(0, 8).map(e => e.v);
  eq(byStep, ['brush', 'brush', 'rim', 'brush', 'brush', 'brush', 'rim', 'brush'], 'verse');
  store.setItem(GG.save.KEYS.settings, JSON.stringify({ brushes: false }));
  A.applySettings();
  ok(A.timeline(p, { genre: 'country', section: 'verse', backing: false }).events.filter(e => e.lane === 'snare')[0].v === 'ghost', 'brushes off: ghost notes');
  store.setItem(GG.save.KEYS.settings, JSON.stringify({}));
  A.applySettings();
  ok(A.timeline(song('metal'), { genre: 'metal', backing: false }).events.filter(e => e.lane === 'snare').every(e => e.v === undefined), 'metal: plain snare');
  const t = song('metal'); t.lanes = 6; t.sections.verse = ['................', '................', '................', '................', '....xxx.........', '................'];
  ['chorus', 'bridge'].forEach(s => { t.sections[s] = t.sections.verse.slice(); });
  const toms = A.timeline(t, { genre: 'metal', section: 'verse', backing: false, bars: 1 }).events.filter(e => e.lane === 'toms').map(e => e.v);
  ok(toms.join() === '0,1,2', 'toms fill high -> floor ' + toms);
});

test('venue rooms by size', () => {
  eq([['house', 30], ['openmic', 40], ['legion', 120], ['bingo', 200], ['bar', 180], ['club', 60], ['club', 900], ['festival', 2000], ['bar', 5000]]
    .map(([kind, capacity]) => A.roomFor({ kind, capacity })), ['dry', 'dry', 'hall', 'hall', 'room', 'dry', 'theatre', 'arena', 'arena']);
  ok(A.roomFor(null) === null);
  for (const g of C.GENRES) ok(['dry', 'room', 'hall'].includes(G[g].kit.room), g + ' kit room');
  eq([G.rock.kit.verb > G.metal.kit.verb, G.country.kit.verb < G.punk.kit.verb, G.country.kit.train, G.metal.kit.six, G.rock.kit.six], [true, true, true, 'china', 'ride']);
});

test('mixer + metronome: settings.mix / settings.metronome, clamped, unknown bus refused', () => {
  eq(Object.keys(A.volumes()), C.MIX_BUSES);
  ok(C.MIX_BUSES.every(b => A.getVolume(b) === 1), 'defaults 1');
  ok(A.setVolume('kazoo', 0.5) === null && A.getVolume('kazoo') === null);
  eq([A.setVolume('crowd', 0.25), A.setVolume('drums', 3), A.setVolume('band', -1), A.setVolume('sfx', 'x')], [0.25, 1, 0, 0]);
  eq(GG.save.settings().mix, { drums: 1, band: 0, crowd: 0.25, sfx: 0 });
  ok(A.metronome() === false && A.toggleMetronome() === true && GG.save.settings().metronome === true && A.setMetronome(false) === false);
  store.setItem(GG.save.KEYS.settings, JSON.stringify({ mix: { band: 0.4 }, metronome: true }));
  const s = A.applySettings();
  eq([s.mix.band, s.mix.drums, s.metronome, A.getVolume('band')], [0.4, 1, true, 0.4]);
});

done('sim_audio');
