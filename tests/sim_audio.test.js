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
  const CHORUS = { metal: 'scream', punk: 'hey', rock: 'yeah', country: 'yeehaw' };
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
  const mt = A.timeline(song('metal', 140), { genre: 'metal', songId: 's6' }), metal = band(mt), tonic = mt.key.tonic;
  const growls = metal.filter(e => e.role === 'break' && e.kind === 'vox');
  ok(growls.length >= 2 && growls.every(e => e.voc === 'growl'), 'metal: growls on the breakdown ' + growls.map(e => e.voc));
  const brk = metal.filter(e => e.role === 'break' && e.kind === 'gtr'), b0 = brk[0].beat;
  ok(growls[0].beat === b0, 'the first growl lands on the drop');
  ok(brk[0].power && !brk[0].mute && brk[0].len >= 2 && brk[0].midi === tonic, 'the drop: one open low-string hit ' + JSON.stringify(brk[0]));
  ok(!brk.some(e => e.beat > b0 && e.beat < b0 + 2.5), 'the drop leaves space after the hit');
  ok(brk.every(e => [0, 1, 6].includes(e.midi - tonic)) && brk.some(e => e.mute), 'breakdown: the low string (+ b2 / tritone), muted chugs');
  ok(metal.filter(e => e.kind === 'lead').every(e => e.role === 'solo'), 'Dana solos in the bridge only');
});

test('metal v0.7.2: drop tuning by tempo band, darker riffs, tremolo picking, dark arpeggios in the scale', () => {
  const B = G.metal.backing, lows = {}, low = (t, k) => Math.min(...t.events.filter(e => e.kind === k).map(e => e.midi));
  for (const bpm of [80, 140, 200]) {
    const t = A.timeline(song('metal', bpm), { genre: 'metal', songId: 's3' });
    lows[t.style] = { tonic: t.key.tonic, gtr: low(t, 'gtr'), bass: low(t, 'bass') };
    eq(t.key.tonic, A.keyFor('s3', 'metal', bpm).tonic, 'timeline key = keyFor with the bpm');
    ok(t.key.tonic === B.root + t.key.offset + (B.tune[t.style] || 0), 'tonic = root + offset + tune');
    ok(lows[t.style].gtr === t.key.tonic && lows[t.style].gtr <= 39, t.style + ': lowest guitar is the (drop) low string ' + JSON.stringify(lows[t.style]));
    ok(lows[t.style].bass >= B.bassFloor && lows[t.style].bass <= lows[t.style].gtr, t.style + ': bass under the guitars, above the floor');
  }
  ok(lows.doom.tonic < lows.chug.tonic && lows.chug.tonic < lows.tremolo.tonic, 'doom tunes lowest, tremolo highest ' + JSON.stringify(lows));
  for (let i = 1; i <= 12; i++) ok(A.keyFor('s' + i, 'metal', 140).tonic <= 38, 'every metal song sits in drop C territory');
  eq(A.keyFor('s1', 'punk', 190).tonic, A.keyFor('s1', 'punk').tonic, 'other genres: no tuning shift');
  // Darker vocabulary: b2 and tritone above the low string show up across songs; chromatic runs in tremolo bars.
  const ivs = new Set();
  for (let i = 1; i <= 6; i++) for (const bpm of [80, 140, 200]) {
    const t = A.timeline(song('metal', bpm), { genre: 'metal', songId: 'd' + i });
    band(t).filter(e => e.kind === 'gtr').forEach(e => ivs.add(((e.midi - t.key.tonic) % 12 + 12) % 12));
  }
  ok(ivs.has(1) && ivs.has(6), 'b2 + tritone in the riffs ' + [...ivs]);
  const tr = A.timeline(song('metal', 200), { genre: 'metal', songId: 's5' }), bar = band(tr).filter(e => e.section === 'verse' && e.beat < 4);
  const g16 = bar.filter(e => e.kind === 'gtr'), b8 = bar.filter(e => e.kind === 'bass');
  ok(g16.length === 16 && g16.every(e => e.trem) && b8.length === 8, 'tremolo: 16 picks a bar, bass on the 8ths ' + g16.length + '/' + b8.length);
  ok(g16.every((e, k) => k % 2 === 0 || e.midi === g16[k - 1].midi), 'each riff pitch is picked twice');
  const bar2 = band(tr).filter(e => e.section === 'verse' && e.beat >= 7 && e.beat < 8 && e.kind === 'gtr').map(e => e.midi);
  ok(bar2.length === 4 && bar2.every((m, k) => !k || Math.abs(m - bar2[k - 1]) === 1), 'bar 2 ends in a chromatic run ' + bar2);
  const solo = band(A.timeline(song('metal', 140), { genre: 'metal', songId: 's6' })).filter(e => e.kind === 'lead'), tk = A.keyFor('s6', 'metal', 140).tonic;
  ok(solo.length >= 16 && solo.every(e => B.scale.includes(((e.midi - tk) % 12 + 12) % 12)), 'Dana: fast arpeggios, all in the phrygian scale');
  const ch = A.timeline(song('metal', 140), { genre: 'metal', songId: 's6' });
  ok(band(ch).filter(e => e.kind === 'vox' && e.section === 'chorus').every(e => e.voc === 'scream'), 'screams on the chorus');
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

test('v0.7.2 crowd pre-render: resumable steps, each only a few ms; slicing never changes the audio', () => {
  // A second copy of the module in a fresh GG, with its (private) crowd builder handed out for this test only.
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', '30_audio.js'), 'utf8')
    .replace(/\}\)\(window\.GG\);\s*$/, 'GG.__crowd = { build: CROWD_BUILD, more: MORE, parts: CROWD_PARTS, speak: speak, stereo: stereo, talkSegs: talkSegs };\n})(window.GG);');
  const G2 = load({ localStorage: load.fakeStorage() });
  new Function('window', src)({ GG: G2 });
  const X = G2.__crowd, now = () => { const t = process.hrtime(); return t[0] * 1e3 + t[1] / 1e6; };
  ok(X && X.parts.length === 7, 'crowd builder reachable');
  const run = k => {   // one build of part k, step by step: [times per call, output]
    const steps = X.build[k](), times = []; let out;
    for (let i = 0; i < steps.length;) { const t0 = now(); out = steps[i](); times.push(now() - t0); if (out !== X.more) i++; }
    return [times, out];
  };
  const sig = out => out.map(b => { let h = 0; for (let i = 0; i < b.n; i++) h = (h * 31 + Math.round(b.L[i] * 1e7) * 3 + Math.round(b.R[i] * 1e7)) | 0; return b.n + ':' + h; }).join();
  for (const k of X.parts) {
    const runs = [run(k), run(k), run(k)];   // min over 3 runs per call: machine load can't fake a slow step
    ok(runs.every(r => sig(r[1]) === sig(runs[0][1])), k + ': deterministic');
    const worst = Math.max(...runs[0][0].map((_, i) => Math.min(runs[0][0][i], runs[1][0][i], runs[2][0][i])));
    ok(runs[0][0].length >= 2 && worst < 3, k + ': ' + runs[0][0].length + ' steps, slowest ' + worst.toFixed(2) + ' ms (warm)');
  }
  // A voice rendered in one go = the same voice rendered in slices of any size (the resumable state is complete).
  const voice = slice => {
    const b = X.stereo(2), rng = G2.RNG(7), job = X.speak(b, { f0: 140, pan: 0.3, lv: 0.8, dull: 0.4, seed: 99 }, X.talkSegs(rng, 2));
    if (slice) { let n = 0; while (!job(slice)) n++; ok(n > 1, 'rendered in ' + n + ' slices of ' + slice); } else ok(job() === true);
    return sig([b]);
  };
  const whole = voice(0);
  ok(!/:0$/.test(whole), 'the voice is not silent');
  [4096, 1000, 31, 7].forEach(sl => eq(voice(sl), whole, 'slices of ' + sl + ' = one pass'));
});

done('sim_audio');
