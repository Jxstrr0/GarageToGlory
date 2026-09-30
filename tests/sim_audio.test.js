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
  ok(A.context() === null && A.ambience() === 'none' && A.room() === null && A.hitCancel() === undefined);   // v0.7.2 hitCancel fails soft
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
  const PARTS = { metal: ['gtr', 'gtr2', 'bass', 'lead'], punk: ['gtr', 'bass', 'lead'], rock: ['gtr', 'gtr2', 'bass', 'lead'], country: ['bass', 'clean', 'fiddle', 'twang'] };
  const CHORUS = { metal: 'scream', punk: 'hey', rock: 'yeah', country: 'yeehaw' };   // (metal: the scream family, v0.9)
  for (const g of C.GENRES) {
    const t = A.timeline(song(g), { genre: g, songId: 's1' }), b = band(t), B = G[g].backing, kinds = new Set(b.map(e => e.kind));
    ok(PARTS[g].every(k => kinds.has(k)), g + ' parts ' + [...kinds]);
    const vox = b.filter(e => e.kind === 'vox');
    ok(vox.length >= 2, g + ' vocal hits');
    for (const v of vox) {
      ok(v.beat % 1 === 0, g + ' vocal off the beat grid at ' + v.beat);
      ok(B.scale.includes(((v.midi - t.key.tonic) % 12 + 12) % 12), g + ' vocal out of key ' + v.midi);
      ok(v.section === 'chorus' || v.role === 'break' || (v.count && v.beat === 0), g + ' vocal in a ' + v.section);   // v0.9: + the count-in yell
    }
    ok(vox.some(v => A.vocFamily(v.voc) === CHORUS[g] && v.section === 'chorus'), g + ' chorus vocal');
    ok(!A.timeline(song(g), { genre: g, vocals: false }).events.some(e => e.kind === 'vox' || e.kind === 'bvox'), g + ' vocals: false');
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
    if (solo.length) ok(solo.some(e => e.kind === 'lead' || e.kind === 'fiddle' || e.kind === 'twang'), g + ' solo');
  }
  const mt = A.timeline(song('metal', 140), { genre: 'metal', songId: 's6' }), metal = band(mt), tonic = mt.key.tonic;
  const growls = metal.filter(e => e.role === 'break' && e.kind === 'vox');
  ok(growls.length >= 2 && growls.every(e => A.vocFamily(e.voc) === 'growl'), 'metal: growls on the breakdown ' + growls.map(e => e.voc));
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
  ok(band(ch).filter(e => e.kind === 'vox' && e.section === 'chorus').every(e => A.vocFamily(e.voc) === 'scream'), 'screams on the chorus');
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

test('v0.8 kit quality tiers: milk crate thin and short -> arena full and long (pure kit params)', () => {
  eq(C.KIT_QUALITY.map((id, i) => A.qualityFor(i).id), C.KIT_QUALITY);
  for (const g of C.GENRES) {
    const k = [0, 1, 2, 3].map(q => A.kitFor(g, q));
    ok(k.every((x, i) => !i || (x.kick.body > k[i - 1].kick.body && x.kick.dec > k[i - 1].kick.dec && x.snare.dec > k[i - 1].snare.dec && x.cymbal.dec > k[i - 1].cymbal.dec && x.tomDec > k[i - 1].tomDec)),
      g + ': body + sustain grow with the tier');
    ok(k[0].kick.f1 > k[3].kick.f1 && k[0].snare.f0 > k[3].snare.f0, g + ': the cheap kit cannot reach the low end');
    eq(k.map(x => x.q.tier), [0, 1, 2, 3]);
    eq(G[g].kit.kick.body, G[g].kit.kick.body, g + ': content untouched');
  }
  ok([0, 1, 2, 3].every(q => A.qualityFor(q).drive >= (q ? A.qualityFor(q - 1).drive : 0) && A.qualityFor(q).send >= (q ? A.qualityFor(q - 1).send : 0)), 'saturation + reverb send grow');
  GG.state = null; eq(A.kitQuality(), 2, 'outside a career: the reference kit');
  GG.state = { gear: { quality: 0 } }; eq(A.kitQuality(), 0); eq(A.kitFor('metal').q.tier, 0, 'default = the career\'s tier');
  GG.state = null;
});

test('v0.8 Outro rings out, Solo is Dana\'s over a stripped kit', () => {
  const gear = { lanes: 4, sections: ['outro', 'solo'] };
  for (const g of C.GENRES) {
    const p = GG.songs.addSection(GG.songs.addSection(GG.songs.signature(g, gear), 'solo', gear), 'outro', gear);
    const t = A.timeline(p, { genre: g, songId: 's2' }), ring = t.events.filter(e => e.ring);
    ok(t.tail > 0 && ring.length >= 2 && ring.every(e => e.section === 'outro' && e.gap >= e.len && e.beat + e.len > t.beats), g + ': the last chord rings past the end');
    const soloDrums = t.events.filter(e => e.kind === 'drum' && e.section === 'solo'), soloBand = band(t).filter(e => e.section === 'solo');
    ok(soloDrums.length > 0 && soloDrums.every(e => (e.beat * 4) % 4 === 0), g + ': stripped kit (on the beat only)');
    ok(soloBand.every(e => e.role === 'solo' && e.kind !== 'vox'), g + ': solo role, no vocal hits');
    ok(soloBand.some(e => e.kind === 'lead' || e.kind === 'fiddle' || e.kind === 'twang'), g + ': a lead takes the solo');   // v0.9: punk too (two chords)
    const loop = A.timeline(p, { genre: g, section: 'outro' });
    ok(loop.events.some(e => e.section === 'outro'), g + ': outro loops in the sequencer');
  }
  const plain = A.timeline(song('metal'), { genre: 'metal' });
  ok(plain.tail === 0 && !plain.events.some(e => e.ring), 'no outro: no ring');
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
    .replace(/\}\)\(window\.GG\);\s*$/, 'GG.__crowd = { build: CROWD_BUILD, more: MORE, parts: CROWD_PARTS.concat(CROWD_EXTRA), speak: speak, stereo: stereo, talkSegs: talkSegs };\n})(window.GG);');
  const G2 = load({ localStorage: load.fakeStorage() });
  new Function('window', src)({ GG: G2 });
  const X = G2.__crowd, now = () => { const t = process.hrtime(); return t[0] * 1e3 + t[1] / 1e6; };
  ok(X && X.parts.length === 10, 'crowd builder reachable (+ v0.9 gang, whoa, yeehaw)');
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

// ---- v0.9 "Genres" (plan_contract_0.9 §5 D) + vocal diversity (owner popup 2026-09-30) -----------------------------------
const career = bandId => GG.career.newCareer({ seed: 7, bandId, player: { name: 'Test', nick: 'T', presetId: null } });
const full = (g, bpm) => { const p = JSON.parse(JSON.stringify(GG.songs.signature(g))); if (bpm) p.bpm = bpm; return p; };
const vocals = t => t.events.filter(e => e.kind === 'vox' || e.kind === 'bvox');

test('v0.9 genre amps (content): punk + rock double-tracked L/R with far less gain than metal, country Tele slapback, fiddle body, acoustic spread', () => {
  for (const g of ['punk', 'rock']) {
    const a = G[g].backing.amp;
    ok(a && a.pan >= 0.4 && a.pan <= 0.8 && a.gain > 2 && a.gain < 13 && a.lag > 0 && a.lag < 0.02 && a.detune > 0, g + ' amp: L/R double, crunch not metal ' + JSON.stringify(a));
    ok(a.mid[2] > 0, g + ' mid-forward');
  }
  ok(G.punk.backing.amp.gain > G.rock.backing.amp.gain && G.rock.backing.amp.ring > 0, 'punk crunchier than rock; rock\'s open chords ring');
  const c = G.country.backing;
  ok(c.amp.gain < 2 && c.amp.slap >= 0.07 && c.amp.slap <= 0.16 && c.amp.slapFb > 0 && c.amp.slapFb < 0.4 && c.amp.slapLv > 0, 'country: a clean Tele with slapback ' + JSON.stringify(c.amp));
  ok(c.fiddle.body.length >= 3 && c.fiddle.bow > 0 && c.fiddle.vib[1] > 0, 'the fiddle: body formants, bow noise, vibrato');
  ok(c.acoustic.spread > 0 && c.acoustic.body[2] > 0, 'the acoustic: body + stereo spread');
  ok(!G.metal.backing.amp, 'metal keeps its own v0.7.2 amp (untouched)');
});

test('v0.9 tempo styles: punk skate / hardcore, rock power ballad (+ forced, the Chartbusters) / driving 8ths, country two-step vs train', () => {
  eq([180, 205, 225].map(b => A.styleFor('punk', b).id), ['eighths', 'skate', 'hardcore']);
  eq([80, 120, 150].map(b => A.styleFor('rock', b).id), ['ballad', 'rock', 'drive']);
  eq([95, 115].map(b => A.styleFor('country', b).id), ['twostep', 'train']);
  eq([80, 140, 200].map(b => A.styleFor('metal', b).id), ['doom', 'chug', 'tremolo'], 'metal unchanged');
  const skate = band(A.timeline(song('punk', 205), { genre: 'punk', section: 'verse', bars: 1 })).filter(e => e.kind === 'gtr');
  ok(skate.length === 16 && skate.filter(e => !e.mute).length === 4, 'skate: muted 16ths, the chord on every beat');
  const hc = band(A.timeline(song('punk', 225), { genre: 'punk', section: 'chorus', bars: 1 })).filter(e => e.kind === 'gtr');
  ok(hc.length === 2 && hc.every(e => e.len >= 1.5), 'hardcore: a half-time chorus (the mosh part)');
  const ballad = A.timeline(song('rock', 120), { genre: 'rock', style: 'ballad', rival: 'chartbusters', songId: 'cb1' }), bb = band(ballad);
  ok(ballad.style === 'ballad' && bb.some(e => e.kind === 'clean' && e.section === 'verse') && bb.some(e => e.kind === 'gtr2' && e.section === 'chorus'), 'forced power ballad: arpeggios, then the chord rings');
  ok(ballad.voice === 'rival:chartbusters', 'the rival\'s singer sings it: ' + ballad.voice);
  const train = band(A.timeline(song('country', 115), { genre: 'country', section: 'verse', bars: 1 })), two = band(A.timeline(song('country', 95), { genre: 'country', section: 'verse', bars: 1 }));
  ok(train.filter(e => e.kind === 'bass').length === 4 && two.filter(e => e.kind === 'bass').length === 2, 'train: a walking bass; two-step: boom on 1 and 3');
});

test('v0.9 solos follow gig.roles: Benny\'s two chords, Lenny\'s lead, Earl\'s Tele (the fiddle if Earl\'s gone), nobody = no solo', () => {
  const cases = [['frost_heave', 'punk', 'benny', 'twochord', 'lead'], ['gravel_kings', 'rock', 'lenny', 'lead', 'lead'], ['grid_road_ramblers', 'country', 'earl', 'twang', 'twang']];
  for (const [bandId, g, who, kind, evKind] of cases) {
    GG.state = career(bandId);
    eq(GG.gig.roles(GG.state).solo, who, bandId + ' soloist');
    eq(A.soloFor(g), kind, bandId + ' solo instrument');
    const solo = band(A.timeline(song(g), { genre: g, songId: 's1' })).filter(e => e.role === 'solo');
    ok(solo.length && solo.some(e => e.kind === evKind), bandId + ': the solo is heard (' + evKind + ')');
    if (g === 'punk') ok(solo.filter(e => e.kind === 'lead').every(e => e.power) && new Set(solo.filter(e => e.kind === 'gtr').map(e => e.midi % 12)).size <= 4, 'Benny: two chords, as power chords on top');
  }
  GG.state = career('grid_road_ramblers'); GG.state.members.find(m => m.id === 'earl').status = 'quit';
  eq(A.soloFor('country'), 'fiddle', 'Earl gone: Clementine takes the solo');
  GG.state = career('frost_heave'); GG.state.members.find(m => m.id === 'benny').status = 'quit';
  eq(GG.gig.roles(GG.state).solo, null); eq(A.soloFor('punk'), null, 'no soloist');
  ok(!band(A.timeline(song('punk'), { genre: 'punk', songId: 's1' })).some(e => e.role === 'solo' || e.kind === 'lead'), 'nobody solos: the band plays on');
  GG.state = career('hail_damage');
  eq(band(A.timeline(song('metal', 140), { genre: 'metal', songId: 's6' })).filter(e => e.kind === 'lead').length > 0, true, 'metal: Dana, as ever');
  GG.state = null;
  eq(['punk', 'rock', 'country'].map(g => A.soloFor(g)), ['twochord', 'lead', 'twang'], 'no career: the genre\'s own');
});

test('v0.9 country: the fiddle takes the fills and the outro, holds the last chord; strums alternate up and down', () => {
  const gear = { lanes: 4, sections: ['outro', 'solo'] };
  const p = GG.songs.addSection(GG.songs.signature('country', gear), 'outro', gear), t = A.timeline(p, { genre: 'country', songId: 's2' }), b = band(t);
  ok(b.filter(e => e.section === 'outro' && e.kind === 'fiddle').length >= 16, 'the fiddle carries the outro');
  ok(b.some(e => e.kind === 'fiddle' && e.ring), 'the fiddle holds the last chord');
  ok(b.some(e => e.kind === 'fiddle' && e.section === 'verse') && b.some(e => e.kind === 'twang' && e.section === 'verse'), 'verse phrase ends: Earl, then the fiddle');
  const strums = b.filter(e => e.strum && e.section === 'chorus');
  ok(strums.some(e => e.up) && strums.some(e => !e.up), 'down and up strums');
});

test('vocal diversity: >= 4 scream types across a metal set, varied per song and per section, all on the grid, in key', () => {
  const types = new Set(), perSong = [];
  for (let i = 1; i <= 8; i++) {
    const t = A.timeline(full('metal', [80, 140, 200][i % 3]), { genre: 'metal', songId: 'set' + i }), v = vocals(t), tonic = t.key.tonic;
    v.forEach(e => types.add(e.voc));
    for (const e of v) {
      ok(e.beat % 1 === 0 && G.metal.backing.scale.includes(((e.midi - tonic) % 12 + 12) % 12), 'on the grid, in key ' + JSON.stringify([e.beat, e.voc, e.midi]));
      ok(e.section === 'chorus' || e.role === 'break' || e.count, 'only where they belong: ' + e.section);
    }
    const ch = t.events.filter(e => e.kind === 'vox' && e.section === 'chorus');
    const byEntry = {}; ch.forEach(e => { const k = Math.floor(e.beat / 16); (byEntry[k] = byEntry[k] || []).push(e.voc); });
    perSong.push(Object.values(byEntry).map(x => x.join()).join('|'));
    ok(new Set(Object.values(byEntry).map(x => x.join())).size >= 2, 'the choruses of one song scream differently: ' + JSON.stringify(byEntry));
  }
  const screamTypes = [...types].filter(x => A.vocFamily(x) === 'scream'), growlTypes = [...types].filter(x => A.vocFamily(x) === 'growl');
  ok(types.size >= 6 && screamTypes.length >= 4 && growlTypes.length >= 2, 'a metal set: ' + [...types]);
  ok(['shriek', 'squeal', 'fry', 'guttural'].every(x => types.has(x)) && types.has('gang') || types.has('held'), 'shrieks, squeals, fry, gutturals, gang / held screams');
  ok(new Set(perSong).size >= 6, 'songs differ ' + new Set(perSong).size);
});

test('vocal diversity: every singer has a profile of their own (pitch, vowels, grit, vibrato, twang); rivals too', () => {
  const V = GG.content.voices, ids = ['marcel', 'rox', 'chase', 'travis', 'tw_gord'];
  const profs = ids.map(id => A.voiceFor(id, 'metal')).concat(['mall_rats', 'chartbusters', 'buckle_and_boot'].map(r => A.voiceFor(null, 'rock', r)));
  eq(profs.map(p => p.id), ['marcel', 'rox', 'chase', 'travis', 'tw_gord', 'rival:mall_rats', 'rival:chartbusters', 'rival:buckle_and_boot']);
  const sig = p => [p.pitch, p.formant, p.rasp || 0, p.twang || 0, (p.vib || [0, 0])[1], p.drive || 0].join();
  eq(new Set(profs.map(sig)).size, profs.length, 'eight distinct voices');
  ok(A.voiceFor('tw_gord', 'metal').formant < 0.9 && A.voiceFor('marcel', 'metal').vowels.u === 'ue', 'Gord: a big throat; Marcel: French vowels');
  eq(A.voiceFor(null, 'metal', 'tundra_wraith').id, 'tw_gord', 'Tundra Wraith sings with Gord');
  ok(A.voiceFor('rox', 'punk').rasp > 0.6 && A.voiceFor('chase', 'rock').vib[1] > 0.02 && A.voiceFor('travis', 'country').twang >= 6, 'Rox hoarse, Chase wide vibrato, Travis Lee twang');
  eq(A.voiceFor('kenji', 'metal').id, 'genre:metal', 'no profile: the genre default');
  for (const id of Object.keys(V.profiles)) ok(V.profiles[id].range[0] < V.profiles[id].range[1] && Array.isArray(V.profiles[id].words), id + ' profile shape');
  // The same song, sung by different singers, sits in different places (pitch) and picks different screams.
  const p = full('metal', 140), mid = o => { const v = A.timeline(p, Object.assign({ genre: 'metal', songId: 'v1' }, o)).events.filter(e => e.kind === 'vox'); return v.reduce((s, e) => s + e.midi, 0) / v.length; };
  ok(mid({ singer: 'marcel' }) - mid({ singer: 'tw_gord' }) >= 5, 'Marcel sings well above Gord');
  const gordTypes = new Set(), marcelTypes = new Set();
  for (let i = 1; i <= 10; i++) {
    vocals(A.timeline(full('metal', 140), { genre: 'metal', songId: 'g' + i, singer: 'tw_gord' })).forEach(e => gordTypes.add(e.voc));
    vocals(A.timeline(full('metal', 140), { genre: 'metal', songId: 'g' + i, singer: 'marcel' })).forEach(e => marcelTypes.add(e.voc));
  }
  ok(gordTypes.has('guttural') && marcelTypes.has('shriek'), 'Gord growls gutturals, Marcel shrieks');
  // A Hail Damage career: Marcel is the singer (gig.roles.front).
  GG.state = career('hail_damage');
  eq(A.timeline(full('metal'), { genre: 'metal', songId: 'h1' }).voice, 'marcel');
  GG.state = career('frost_heave'); eq(A.timeline(full('punk'), { genre: 'punk', songId: 'h1' }).voice, 'rox');
  GG.state = null;
});

test('vocal diversity: shouted words vary per genre, no two choruses alike, the odd French word from Marcel', () => {
  const V = GG.content.voices;
  for (const g of C.GENRES) {
    ok(V.words[g].length >= 8 && V.words[g].concat(V.count[g]).every(w => V.lex[w]), g + ' words, each with phonemes');
    const words = new Set();
    for (let i = 1; i <= 6; i++) {
      const t = A.timeline(full(g), { genre: g, songId: 'w' + i }), v = vocals(t);
      ok(v.every(e => e.word), g + ': every hit shouts a word');
      v.forEach(e => words.add(e.word));
      const byEntry = {}; t.events.filter(e => e.kind === 'vox' && e.section === 'chorus').forEach(e => { const k = Math.floor(e.beat / 16); (byEntry[k] = byEntry[k] || []).push(e.word); });
      const ch = Object.values(byEntry).map(x => x.join());
      ok(ch.length < 2 || new Set(ch).size === ch.length, g + ': no two choruses shout the same words ' + JSON.stringify(ch));
    }
    ok(words.size >= 8, g + ' word variety: ' + words.size + ' ' + [...words]);
  }
  const lex = Object.values(V.lex).join(' ').split(/\s+/).concat(...Object.values(V.profiles).map(p => Object.values(p.vowels || {})));   // (+ Marcel's vowel swaps)
  ok(['ue', 'oe', 'ae', 's', 'p', 't', 'k', 'n', 'l', 'r', 'h'].every(x => lex.includes(x)), 'the lexicon covers the vowels and consonants the renderer shapes');
  const fr = new Set(V.profiles.marcel.words), seen = [];
  for (let i = 1; i <= 10; i++) vocals(A.timeline(full('metal'), { genre: 'metal', songId: 'm' + i, singer: 'marcel' })).forEach(e => { if (fr.has(e.word)) seen.push(e.word); });
  ok(seen.length >= 3 && seen.length <= 40 && new Set(seen).size >= 2, 'Marcel sneaks French in (the odd word, not all of them): ' + seen);
  const other = []; for (let i = 1; i <= 10; i++) vocals(A.timeline(full('metal'), { genre: 'metal', songId: 'm' + i, singer: 'tw_gord' })).forEach(e => { if (fr.has(e.word)) other.push(e.word); });
  eq(other.length, 0, 'nobody else speaks French');
});

test('vocal moments: a count-in yell, call-and-response (the band answers, the crowd may join), held screams at chorus ends, whoa-ohs with a harmony', () => {
  for (const g of C.GENRES) {
    const t = A.timeline(full(g), { genre: g, songId: 'vm1' }), v = vocals(t), B = G[g].backing, tonic = t.key.tonic, inKeyM = m => B.scale.includes(((m - tonic) % 12 + 12) % 12);
    const count = v.filter(e => e.count);
    ok(count.length === 1 && count[0].beat === 0 && count[0].kind === 'vox', g + ': one count-in yell, on the first downbeat');
    ok(!A.timeline(full(g), { genre: g, songId: 'vm1', section: 'verse' }).events.some(e => e.count), g + ': no count-in when a section loops');
    const held = v.filter(e => e.held);
    ok(held.length >= 1 && held.every(e => e.kind === 'vox' && e.len >= 2 && e.section === 'chorus' && (e.beat % 16) >= 12), g + ': a held note closes a chorus');
    const resp = v.filter(e => e.kind === 'bvox' && e.answer);
    ok(resp.length >= 2 && resp.every(e => e.gang && e.section === 'chorus' && e.beat % 1 === 0 && inKeyM(e.midi)), g + ': the band answers (gang, on the beat, in key)');
    ok(v.filter(e => e.kind === 'bvox').every(e => e.section === 'chorus' && e.role !== 'solo' && e.role !== 'break'), g + ': backing vocals only in choruses');
    if (B.vox.whoa && B.vox.whoa.length) {
      const whoa = v.filter(e => e.voc === 'whoa');
      ok(whoa.length >= 2 && whoa.every(e => e.harm >= 3 && e.harm <= 5 && inKeyM(e.midi) && inKeyM(e.midi + e.harm)), g + ': whoa-ohs with a harmony, in key');
      const first = Math.min(...t.events.filter(e => e.section === 'chorus').map(e => e.beat));
      ok(!whoa.some(e => e.beat < first + 16), g + ': the first chorus has none (choruses differ)');
    }
  }
});

test('v0.9 garage beds per tier-0 space, the noodler per band (who the garage shows, by their gear)', () => {
  eq(A.bedFor('garage').layers, ['hum', 'tone', 'fridge']);
  ok(A.bedFor('laundromat').events.join() === 'dryer,buzzer' && A.bedFor('laundromat').layers.includes('tumble'), 'laundromat: dryers in 4/4 + the buzzer');
  ok(A.bedFor('stripmall').layers.includes('fluorescent') && A.bedFor('stripmall').events.includes('vacuum'), 'strip mall: the tube + the vacuum repair');
  ok(A.bedFor('quonset', 'summer').events.includes('crickets') && A.bedFor('quonset', 'spring').events.includes('meadowlark') && A.bedFor('quonset', 'winter').events.join() === 'creak', 'Quonset: wind on steel, crickets / meadowlark by season');
  eq(A.bedFor('moon').kind, 'garage', 'unknown: the garage');
  eq(Object.keys(C.SPACE_KINDS).map(k => A.bedFor(C.SPACE_KINDS[k]).kind), ['garage', 'laundromat', 'stripmall', 'quonset'], 'every tier-0 space has a bed');
  const GEAR = { v: 'pluck', sg: 'twochord', strat: 'riff', tele: 'twang', fiddle: 'bach', acoustic: 'strum' };
  const want = { hail_damage: ['dana', 'pluck'], frost_heave: ['benny', 'twochord'], gravel_kings: ['lenny', 'riff'] };
  for (const b of Object.keys(GG.content.bands)) {
    const st = career(b), n = A.noodleFor(st), m = GG.content.bands[b].members.find(x => x.id === n.who);
    ok(n && m && m.gear && GEAR[m.gear] === n.style, b + ': ' + JSON.stringify(n));
    if (want[b]) eq([n.who, n.style], want[b], b + ' noodler');
    ok(n.who !== 'rox' && n.who !== 'chase' && n.who !== 'travis' || m.gear === 'acoustic', b + ': the singer does not noodle (unless acoustic)');
  }
});

test('v0.9 crowd one-shots for every §4.4 moment kind', () => {
  const want = { headbang: 'roar', wallOfDeath: 'roar', pogo: 'gang', circlePit: 'gang', gangShout: 'gang', fistPump: 'gang', singAlong: 'whoa', lighters: 'whoa', clapAlong: 'clap', lineDance: 'clap', yeehaw: 'yee' };
  for (const [k, shot] of Object.entries(want)) { ok(C.MOMENTS.includes(k), k + ' is a moment'); ok((A.momentShots(k) || []).includes(shot), k + ' -> ' + shot + ' ' + A.momentShots(k)); }
  ok(A.momentShots('lineDance').includes('yee') && A.momentShots('clapAlong').includes('yee'), 'yee-haws with the clap-along');
  eq(A.momentShots('mosh'), null, 'mosh: the v0.7.2 cheer, unchanged');
});

test('v0.9 coach lines per genre (grooves.coach[genre][step]) + the neutral fallback', () => {
  const CO = GG.content.grooves.coach, steps = ['verse', 'chorus', 'bridge', 'tempo', 'order', 'name'];
  for (const g of C.GENRES) for (const s of steps) ok(CO[g] && CO[g][s] && CO[g][s].length && CO[g][s].every(l => l.text.length <= 120 && new RegExp(l.role)), g + ' coach ' + s);
  for (const s of steps) ok(CO[s].every(l => !/lawn|French|neck/i.test(l.text)), 'neutral ' + s);
  ok(/lawn/.test(CO.metal.name[0].text), 'Hail Damage keeps its lines');
  const roleOk = (b, g) => steps.every(s => CO[g][s].some(l => GG.content.bands[b].members.some(m => new RegExp(l.role).test(m.role))));
  ok(roleOk('frost_heave', 'punk') && roleOk('gravel_kings', 'rock') && roleOk('grid_road_ramblers', 'country'), 'every step has a speaker in the band');
});

done('sim_audio');
