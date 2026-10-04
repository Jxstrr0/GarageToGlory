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
  // (fixer) the train's walking bass stays in the major key, bridge vi / ii included (no G# / C# under a G-major song)
  const MAJ = [0, 2, 4, 5, 7, 9, 11], off = [];
  for (let i = 0; i < 60; i++) {
    const p = full('country', 115); p.arrangement = ['verse', 'chorus', 'bridge', 'chorus'];
    const t = A.timeline(p, { genre: 'country', songId: 'tb' + i });
    t.events.filter(e => e.kind === 'bass').forEach(e => { if (!MAJ.includes(((e.midi - t.key.tonic) % 12 + 12) % 12)) off.push(e.section + ':' + e.midi); });
  }
  eq(off.length, 0, 'train bass out of key: ' + off.slice(0, 6).join(','));
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

test('vocal diversity (fixer): Brayden sings dead flat with no yodel flip; Travis Lee keeps both (the profile decides)', () => {
  const br = A.voiceFor(null, 'country', 'buckle_and_boot'), tr = A.voiceFor('travis', 'country');
  ['ooh', 'yeah', 'holler', 'yeehaw'].forEach(v => { const p = A.voxPitch(v, br); ok(!p.yodel && !p.vib, 'Brayden ' + v + ': no flip, no vibrato ' + JSON.stringify(p)); });
  ok(A.voxPitch('yeehaw', tr).yodel && A.voxPitch('holler', tr).yodel, 'Travis Lee yodels his yeehaw and holler');
  ok(A.voxPitch('ooh', tr).vib && A.voxPitch('ooh', tr).vib[1] > 0, 'Travis Lee\'s ooh has vibrato');
  const marcel = A.voiceFor('marcel', 'metal'); eq(A.voxPitch('ooh', marcel).vib, [6.4, Math.max(0.014, (A.voxPitch('ooh', {}).vib || [0, 0])[1])], 'a profile vibrato still wins');
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

// v1.0 (Lane P, §4.9): the global voice cap (32) and its priorities: taps > the song's kick/snare > band > crowd > ambience > sfx.
test('v1.0 voicePlan: cap 32, reserves by priority, one-shots below make room, taps never dropped', () => {
  const V = A.VOICES, plan = A.voicePlan;
  eq([V.cap, V.order], [32, ['tap', 'drum', 'band', 'crowd', 'amb', 'sfx']], 'cap + priority order');
  ok(V.order.every((k, i) => i === 0 || V.reserve[k] > V.reserve[V.order[i - 1]]), 'each class keeps more room free for the ones above it ' + JSON.stringify(V.reserve));
  eq(V.reserve.tap, 0, 'taps reserve nothing');
  // plenty of room: everyone plays
  for (const cls of V.order) eq(plan({}, { cls, n: 2 }).ok, true, cls + ' plays in an empty room');
  eq(plan({ band: 4, crowd: 3 }, { cls: 'sfx', n: 1 }), { ok: true, evict: {}, total: 7, over: 0 }, 'the plan reports the total');
  // the lower a class, the earlier it yields: at 20 sounding voices sfx (reserve 14) is out, the band (8) still plays
  const busy = { band: 8, crowd: 8, tap: 4 };
  const at20 = Object.fromEntries(V.order.map(k => [k, plan(busy, { cls: k, n: 1 }).ok]));
  eq(at20, { tap: true, drum: true, band: true, crowd: true, amb: false, sfx: false }, 'at 20 voices ' + JSON.stringify(at20));
  // every class stops exactly at cap - reserve when nothing below it can make room (the band's voices are never evicted)
  for (const k of V.order) {
    const lim = V.cap - V.reserve[k];
    eq(plan({ band: lim - 1 }, { cls: k, n: 1 }).ok, true, k + ' fits up to ' + lim);
    if (k !== 'tap') eq(plan({ band: lim }, { cls: k, n: 1 }).ok, false, k + ' refused past ' + lim);
  }
  // over its limit a class evicts one-shots strictly below it, lowest first; never its own class or anything above
  eq(plan({ band: 20, crowd: 4 }, { cls: 'band', n: 1 }), { ok: true, evict: { crowd: 1 }, total: 24, over: 0 }, 'the band pushes a crowd one-shot out');
  eq(plan({ band: 16, crowd: 2, sfx: 2, amb: 2 }, { cls: 'crowd', n: 1 }), { ok: true, evict: { sfx: 1 }, total: 22, over: 0 }, 'the crowd pushes an sfx out (not ambience first)');
  eq(plan({ band: 18, crowd: 4 }, { cls: 'crowd', n: 1 }).ok, false, 'the crowd never evicts the crowd');
  eq(plan({ band: 20, sfx: 4 }, { cls: 'sfx', n: 1 }).ok, false, 'sfx evicts nobody');
  // a full house: a tap still plays and evicts the lowest one-shots first (sfx, then ambience, then the crowd)
  const full = { tap: 6, drum: 4, band: 10, crowd: 8, amb: 2, sfx: 2 };   // 32
  const p1 = plan(full, { cls: 'tap', n: 1 });
  eq([p1.ok, p1.evict, p1.over], [true, { sfx: 1 }, 0], 'tap over the cap evicts one sfx ' + JSON.stringify(p1));
  const p3 = plan(full, { cls: 'tap', n: 5 });
  eq([p3.ok, p3.evict, p3.over], [true, { sfx: 2, amb: 2, crowd: 1 }, 0], 'five taps: sfx, then ambience, then crowd ' + JSON.stringify(p3));
  const p4 = plan({ tap: 12, drum: 6, band: 14 }, { cls: 'tap', n: 2 });
  eq([p4.ok, p4.evict, p4.over], [true, {}, 2], 'nothing evictable below: the tap still plays (over the cap, counted) ' + JSON.stringify(p4));
  const pk = plan(full, { cls: 'drum', n: 1 });
  eq([pk.ok, pk.evict], [true, { sfx: 2, amb: 2, crowd: 3 }], 'the song\'s kick makes room down to its own limit (26) ' + JSON.stringify(pk));
  // no class can starve the taps: every class below them, each pushing as hard as it can (evictions applied), tops out at
  // cap - reserve(drum) = 26, so six lanes of taps always fit
  const fill = {}; let guard = 0;
  for (let round = 0; round < 3; round++) for (const k of V.order.slice(1).reverse()) {
    for (;;) {
      const p = plan(fill, { cls: k, n: 1 }); if (!p.ok || ++guard > 500) break;
      for (const e in p.evict) fill[e] -= p.evict[e];
      fill[k] = (fill[k] || 0) + 1;
    }
  }
  const total = Object.values(fill).reduce((a, b) => a + b, 0);
  ok(guard < 500 && total <= V.cap - V.reserve.drum, 'the rest tops out at ' + total + ' <= ' + (V.cap - V.reserve.drum) + ' ' + JSON.stringify(fill));
  ok(V.cap - total >= 6, 'six lanes of taps always fit');
  // pure: no state, same answer twice, unknown class = sfx
  eq(plan(full, { cls: 'tap', n: 1 }), p1, 'deterministic');
  eq(plan({ sfx: 17 }, { cls: 'moose', n: 1 }).ok, plan({ sfx: 17 }, { cls: 'sfx', n: 1 }).ok, 'unknown class is treated as sfx');
  ok(!A.voiceStats || A.voiceStats().active === 0, 'no context: no live voices');
});

/* ---- v1.1 "Seats" (Lane D, plan_contract_1.1 §4.7) ------------------------------------------------------------------ */
const crypto = require('crypto'), E16 = '................';
const H16 = x => crypto.createHash('sha1').update(JSON.stringify(x)).digest('hex').slice(0, 16);
// The drum seat is the regression baseline: 1,212 timelines (4 genres x 6 patterns x 4 tempos x 14 option sets + a live
// drum-seat career's songs) fingerprinted with the stage-0 code (829b059, before any v1.1 audio edit), per genre x pattern.
const STAGE0 = { 'metal|p0': 'bdcdf5c057a8', 'metal|p1': 'f644059b441e', 'metal|p2': '0d56f2db587d', 'metal|p3': 'cd9ebc41f289', 'metal|p4': 'fa65178d5325',
  'metal|p5': 'f68be1b9d681', 'metal|career': 'ff0f27ac7c98', 'punk|p0': 'ee2168187384', 'punk|p1': '06ab053aa3fc', 'punk|p2': '540e1e24b6d6',
  'punk|p3': 'd6265b494282', 'punk|p4': '26ba24472c82', 'punk|p5': 'b4983c855e4d', 'punk|career': '41b86b015937', 'rock|p0': 'cd02112fbaf3',
  'rock|p1': '7f3f9ea18b9c', 'rock|p2': 'b6084f0cbe1f', 'rock|p3': '5e18e3657813', 'rock|p4': 'e3094f555c8e', 'rock|p5': '09b47cd63096',
  'rock|career': '66c2feefd38f', 'country|p0': '063600180d27', 'country|p1': 'b3be69244f7d', 'country|p2': 'ed45778938c2', 'country|p3': '18acbee0800e',
  'country|p4': 'a201e6d20879', 'country|p5': '89f534675b40', 'country|career': '15cf514ace0a' };
const FP_BANDS = { metal: 'hail_damage', punk: 'frost_heave', rock: 'gravel_kings', country: 'grid_road_ramblers' };
function fpPatterns(g) {   // the signature (+ a solo and an outro), the starter, three jams, a jam with all the gear
  const sig = JSON.parse(JSON.stringify(GG.songs.signature(g)));
  sig.sections.solo = sig.sections.verse.slice(); sig.sections.outro = sig.sections.chorus.slice();
  sig.arrangement = ['verse', 'chorus', 'bridge', 'solo', 'chorus', 'outro'];
  const pats = [sig, GG.songs.starter(g)];
  for (let i = 1; i <= 3; i++) pats.push(GG.songs.generate(g, GG.RNG(100 + i), {}));
  pats.push(GG.songs.generate(g, GG.RNG(7), { gear: { lanes: 6, doubleKick: true, owned: ['toms', 'ride', 'pedal'], sections: ['outro', 'solo'], quality: 3 } }));
  return pats;
}
function fingerprints(extra, mut) {   // -> { 'genre|pN': hash } with `extra` opts merged into every timeline call (v1.3: mut(pattern, genre) edits each pattern first)
  const OPTS = [{}, { section: 'chorus' }, { vocals: false }, { drums: false }, { backing: false }, { bars: 3 }, { soloist: null },
    { soloist: 'benny' }, { soloist: 'earl' }, { style: 'ballad' }, { singer: 'rox' }, { rival: 'mall_rats' }, { section: 'solo' }, { section: 'outro' }];
  const groups = {}, add = (k, h) => { const p = k.split('|').slice(0, 2).join('|'); (groups[p] = groups[p] || []).push(k + '=' + h); };
  GG.state = null;
  for (const g of C.GENRES) {
    fpPatterns(g).forEach((p, pi) => [undefined, 80, 140, 200].forEach(bpm => {
      const q = JSON.parse(JSON.stringify(p)); if (bpm) q.bpm = bpm;
      if (mut) mut(q, g);
      OPTS.forEach((o, oi) => { if (!o.section || q.sections[o.section]) add(g + '|p' + pi + '|' + (bpm || '-') + '|o' + oi, H16(A.timeline(q, Object.assign({ genre: g, songId: 's' + pi }, o, extra)))); });
    }));
    const st = GG.career.newCareer({ seed: 11, bandId: FP_BANDS[g], seat: 'drums', player: { name: 'Fp' } });
    GG.state = st;
    st.songs.slice(0, 2).forEach((s, si) => { let q = s.pattern; if (mut) { q = JSON.parse(JSON.stringify(q)); mut(q, g); } add(g + '|career|' + si, H16(A.timeline(q, Object.assign({ genre: g, songId: mut ? s.id : undefined }, extra)))); });
    GG.state = null;
  }
  const out = {};
  for (const k of Object.keys(groups)) out[k] = crypto.createHash('sha1').update(groups[k].join(',')).digest('hex').slice(0, 12);
  return out;
}
const seatEvents = (t, g, seat) => { const K = A.seatKinds(g, seat); return t.events.filter(e => K.includes(e.kind)); };
const otherEvents = (t, g, seat) => { const K = A.seatKinds(g, seat); return JSON.stringify(t.events.filter(e => !K.includes(e.kind))); };
const fullSong = (g, bpm) => { const p = JSON.parse(JSON.stringify(GG.songs.signature(g))); if (bpm) p.bpm = bpm; p.sections.solo = p.sections.verse.slice(); p.sections.outro = p.sections.chorus.slice(); p.arrangement = ['verse', 'chorus', 'bridge', 'solo', 'chorus', 'outro']; return p; };
const tempos = g => ({ metal: [80, 150, 200], punk: [160, 205, 225], rock: [80, 120, 150], country: [90, 115] })[g];

test('v1.1 drum baseline: without the new opts every timeline is byte-for-byte stage 0 (1,212 fingerprints); seat drums / mute change nothing', () => {
  eq(fingerprints({}), STAGE0, 'no new opts');
  eq(fingerprints({ seat: 'drums' }), STAGE0, "seat: 'drums'");
  eq(fingerprints({ mute: ['gtr', 'bass', 'drum'] }), STAGE0, 'opts.mute: the event list is identical (play() skips them)');
  eq(fingerprints({ seat: 'drums', part: { seat: 'bass', sections: { verse: { prog: 1, rows: ['x...x...x...x...', E16, E16] } } } }), STAGE0, 'a part never applies to the drum seat');
});

test('v1.1 opts.seat: every seat kind is present per genre; only the seat kinds change; rock rhythm >= 1 per beat-pair in verses; country lead >= 1 lick per bar', () => {
  for (const g of C.GENRES) for (const seat of ['bass', 'rhythm', 'lead']) for (const bpm of tempos(g)) {
    const p = fullSong(g, bpm), base = A.timeline(p, { genre: g, songId: 's1' }), t = A.timeline(p, { genre: g, songId: 's1', seat }), w = g + '/' + seat + '@' + bpm;
    eq([t.seat, t.part, base.seat], [seat, undefined, undefined], w + ' result seat');
    eq(otherEvents(t, g, seat), otherEvents(base, g, seat), w + ': every other event is exactly as without the seat');
    const mine = seatEvents(t, g, seat), kinds = new Set(mine.map(e => e.kind));
    ok(A.seatKinds(g, seat).every(k => kinds.has(k)) || (g === 'rock' && seat === 'rhythm' && kinds.has('gtr2')), w + ': every seat kind is there ' + [...kinds]);
    for (let b = 0; b < t.beats / 4; b++) ok(mine.some(e => e.beat >= b * 4 && e.beat < b * 4 + 4) || (g === 'rock' && seat === 'lead' && t.style === 'ballad'), w + ': bar ' + b + ' has your part');
    eq(JSON.stringify(A.timeline(p, { genre: g, songId: 's1', seat })), JSON.stringify(t), w + ' deterministic');
    if (seat !== 'rhythm' && !(g === 'country' && seat === 'lead')) eq(JSON.stringify(t.events), JSON.stringify(base.events), w + ': no layer, the same timeline');
  }
  // rock rhythm (the new seat): >= 1 event per beat-pair in verses at every style; the whole-bar chorus ring is now yours
  for (const bpm of [80, 120, 150]) {
    const t = A.timeline(fullSong('rock', bpm), { genre: 'rock', songId: 's2', seat: 'rhythm' }), mine = seatEvents(t, 'rock', 'rhythm');
    const verses = t.events.filter(e => e.kind === 'step' && e.section === 'verse' && e.step % 8 === 0).map(e => e.beat);
    ok(verses.length && verses.every(b => mine.some(e => e.beat >= b && e.beat < b + 2)), 'rock rhythm @' + bpm + ' (' + t.style + '): an event in every verse beat-pair');
    ok(t.style === 'ballad' || mine.filter(e => e.section === 'chorus').length >= 4 * 4 * 2, 'rock rhythm @' + bpm + ': open chords in the chorus');
    ok(!mine.some(e => e.kind === 'gtr2' && e.len >= 4 && !e.ring), 'rock rhythm @' + bpm + ': no whole-bar ring left (your chords instead)');
    ok(mine.some(e => e.role === 'break' && e.kind === 'gtr2') || t.style === 'ballad', 'rock rhythm: the riff in the breaks');
  }
  const drive = A.timeline(fullSong('rock', 150), { genre: 'rock', songId: 's2', seat: 'rhythm' });
  ok(seatEvents(drive, 'rock', 'rhythm').some(e => e.mute) && seatEvents(drive, 'rock', 'rhythm').some(e => !e.mute), 'rock rhythm: palm-muted pushes and open chords');
  // country lead: a lick (>= 2 Tele notes) in every bar, verses and choruses; Earl's solo stays the Tele
  for (const bpm of [90, 115]) {
    const t = A.timeline(fullSong('country', bpm), { genre: 'country', songId: 's3', seat: 'lead' }), tw = seatEvents(t, 'country', 'lead');
    for (let b = 0; b < t.beats / 4; b++) ok(tw.filter(e => e.beat >= b * 4 && e.beat < b * 4 + 4).length >= (b === t.beats / 4 - 1 ? 1 : 2), 'country lead @' + bpm + ': a lick in bar ' + b + ' (the last: one held note)');
    ok(tw.every(e => e.kind === 'twang') && tw.filter(e => e.role === 'solo').length >= 16, 'country lead: the solo is the Tele, dense');
    ok(tw.some(e => e.ring), 'country lead: the last note rings over the end');
  }
});

test('v1.1 opts.part: replaces exactly the seat kinds (part: true), the band follows a prog, the lead keeps its solo, holds come from long notes', () => {
  const defProg = (g, p, name) => { const list = G[g].backing.progressions[name], sec = GG.songs.sanitize(p, null, null, true).sections[name]; return GG.hashSeed(name + '|' + (sec[0] || '') + (sec[1] || '')) % list.length; };
  const ROWS = { bass: ['x.......x.......', '....x.......x...', '..............x.'], rhythm: ['x.x.x.x.....x.x.', '........x.......'], lead: ['x...............', '...x............', '......x.........', '........x.x.....', '............x...'] };
  for (const g of C.GENRES) for (const seat of ['bass', 'rhythm', 'lead']) {
    const p = fullSong(g), sections = {};
    ['verse', 'chorus', 'bridge', 'solo', 'outro'].forEach(n => { sections[n] = { rows: ROWS[seat] }; if (seat === 'lead') sections[n].hook = 1; else if (G[g].backing.progressions[n]) sections[n].prog = defProg(g, p, n); });
    const part = { seat, sections }, base = A.timeline(p, { genre: g, songId: 's4', seat }), t = A.timeline(p, { genre: g, songId: 's4', seat, part }), w = g + '/' + seat;
    eq([t.seat, t.part], [seat, true], w + ' result');
    eq(otherEvents(t, g, seat), otherEvents(base, g, seat), w + ': every other kind exactly as without the part (same chords)');
    const mine = seatEvents(t, g, seat), kept = mine.filter(e => !e.part);
    ok(mine.filter(e => e.part).length >= 30, w + ': your part plays');
    ok(kept.every(e => (seat === 'lead' && e.role === 'solo') || e.ring), w + ': generated notes left only in your own solo and the last ring ' + JSON.stringify(kept.slice(0, 2)));
    const want = { bass: 'bass', rhythm: { metal: 'gtr', punk: 'gtr', rock: 'gtr2', country: 'clean' }[g], lead: g === 'country' ? 'twang' : 'lead' }[seat];
    ok(mine.filter(e => e.part).every(e => e.kind === want || (g === 'metal' && seat === 'rhythm' && e.kind === 'gtr2')), w + ': written as ' + want);
    eq(JSON.stringify(A.timeline(p, { genre: g, songId: 's4', part })), JSON.stringify(t), w + ': the seat defaults to part.seat');
    if (seat === 'lead') {   // the hook: 5 scale degrees, in key; long notes bend in
      const sc = G[g].backing.scale, hk = G[g].backing.hooks.verse[1];
      const verse = mine.filter(e => e.part && e.section === 'verse');
      ok(verse.every(e => sc.includes(((e.midi - t.key.tonic) % 12 + 12) % 12)), w + ': hook notes in the scale');
      eq(new Set(verse.map(e => e.midi)).size, 5, w + ': five rows = five pitches (' + hk.name + ')');
      ok(verse.filter(e => e.len >= 0.75).every(e => e.bend === 2), w + ': long notes bend in');
    }
    if (seat === 'bass') ok(mine.some(e => e.part && e.section === 'verse' && e.len >= 1), w + ': a root rings a whole beat (a hold for the chart)');
  }
  // the band follows your progression (bass / rhythm); a lead part leaves the chords alone
  const p = fullSong('punk'), alt = (defProg('punk', p, 'verse') + 1) % G.punk.backing.progressions.verse.length;
  const t0 = A.timeline(p, { genre: 'punk', songId: 's5', seat: 'bass' });
  const t1 = A.timeline(p, { genre: 'punk', songId: 's5', seat: 'bass', part: { seat: 'bass', sections: { verse: { prog: alt, rows: ROWS.bass } } } });
  const roots = t => t.events.filter(e => e.kind === 'gtr' && e.section === 'verse' && e.beat % 4 === 0).map(e => e.midi - t.key.tonic);
  ok(JSON.stringify(roots(t0)) !== JSON.stringify(roots(t1)), 'the guitars follow your verse progression ' + roots(t0) + ' -> ' + roots(t1));
  eq(roots(t1).slice(0, 4), G.punk.backing.progressions.verse[alt], 'bar by bar');
  // robust: junk rows, out-of-range indexes, a part for another seat, no sections
  const junk = { seat: 'lead', sections: { verse: { hook: 99, rows: ['xxxxxxxxxxxxxxxxxxxxxxx', null, 42, 'abc'] }, chorus: 'nope', bridge: { prog: -5 } } };
  const tj = A.timeline(p, { genre: 'punk', songId: 's6', seat: 'lead', part: junk });
  eq(seatEvents(tj, 'punk', 'lead').filter(e => e.part && e.section === 'verse').length, 4 * 16, 'junk rows: clipped to 16 steps, the rest read as rests');
  ok(!seatEvents(tj, 'punk', 'lead').some(e => e.part && e.section === 'bridge'), 'a section with no hits plays nothing of yours');
  eq(JSON.stringify(A.timeline(p, { genre: 'punk', songId: 's6', seat: 'bass', part: junk })), JSON.stringify(A.timeline(p, { genre: 'punk', songId: 's6', seat: 'bass' })), 'a part for another seat is ignored');
  eq(JSON.stringify(A.timeline(p, { genre: 'punk', songId: 's6', seat: 'bass', part: { seat: 'bass' } })), JSON.stringify(A.timeline(p, { genre: 'punk', songId: 's6', seat: 'bass' })), 'no sections: nothing changes');
});

test('v1.1 backing tables: progNames parallel to progressions, 2-3 hooks per section (5 ascending degrees, a 5-row melody), plain words', () => {
  const DRUMWORDS = /\b(drums?|drummers?|kits?|sticks|snares?|kicks?|hi-?hats?|cymbals?|toms|the beat|backbeat|fills?)\b/i;
  for (const g of C.GENRES) {
    const B = G[g].backing;
    for (const s of C.SECTIONS) {
      eq(B.progNames[s].length, B.progressions[s].length, g + ' ' + s + ': a name per progression');
      ok(B.progNames[s].every(n => typeof n === 'string' && n.length >= 5 && n.length <= 40 && !DRUMWORDS.test(n)), g + ' ' + s + ' prog names');
      ok(new Set(B.progNames[s]).size === B.progNames[s].length, g + ' ' + s + ' prog names unique');
      const hooks = B.hooks[s];
      ok(hooks.length >= 2 && hooks.length <= 3, g + ' ' + s + ' hooks');
      hooks.forEach(h => {
        ok(typeof h.name === 'string' && h.name.length >= 5 && h.name.length <= 40 && !DRUMWORDS.test(h.name), g + ' hook name ' + h.name);
        ok(h.deg.length === 5 && h.deg.every((d, i) => Number.isInteger(d) && d >= 0 && (!i || d > h.deg[i - 1])), g + ' ' + h.name + ': 5 ascending degrees');
        ok(h.rows.length === 5 && h.rows.every(r => /^[x.]{16}$/.test(r)) && h.rows.join('').includes('x'), g + ' ' + h.name + ': 5 rows');
        for (let st = 0; st < 16; st++) ok(h.rows.filter(r => r[st] === 'x').length <= 1, g + ' ' + h.name + ': one note per step');
      });
      ok(new Set(hooks.map(h => h.name)).size === hooks.length, g + ' ' + s + ' hook names unique');
    }
  }
});

test('v1.1 your instrument (no Web Audio here): voices fail soft, seatVoiceFor, soloFor(player), the noodle by seat', () => {
  eq([A.pluck(40, 0, { len: 1 }), A.strum(40, 0), A.lead(64, 0, { hold: true }), A.release(null, 0), A.release({}, 0)], [null, null, null, null, null], 'null without a context');
  eq([A.seatPreview('hail_damage', 'bass'), A.stopPreview()], [null, false], 'no preview without Web Audio');
  eq(['bass', 'gtr', 'gtr2', 'clean', 'lead', 'twang', 'drum'].map(A.seatVoiceFor), ['pluck', 'strum', 'strum', 'strum', 'lead', 'lead', null]);
  eq(C.GENRES.map(g => A.soloFor(g, 'player')), ['lead', 'twochord', 'lead', 'twang'], "soloFor(genre, 'player'): your seat's solo voice");
  // your solo is charted on your kinds: a lead career with roles.solo = 'player' gets the genre's solo kinds
  for (const g of C.GENRES) {
    const t = A.timeline(fullSong(g), { genre: g, songId: 's7', soloist: 'player', seat: 'lead' }), K = A.seatKinds(g, 'lead');
    ok(t.events.filter(e => e.role === 'solo' && e.kind !== 'step' && e.kind !== 'drum' && e.kind !== 'bass' && e.kind !== 'vox' && e.kind !== 'bvox' && e.kind !== 'clean' && e.kind !== 'gtr2' && e.kind !== 'fiddle').every(e => K.includes(e.kind)), g + ': the solo is on your kinds');
  }
  const want = { bass: 'walk', rhythm: { metal: 'chug', punk: 'power', rock: 'power', country: 'strum' }, lead: { metal: 'lick', punk: 'lick', rock: 'lick', country: 'twang' } };
  for (const b of Object.keys(GG.content.bands)) for (const seat of C.SEATS) {
    const st = GG.career.newCareer({ seed: 7, bandId: b, seat, player: { name: 'N' } }), n = A.noodleFor(st), g = st.genre;
    if (seat === 'drums') { eq(n, A.noodleFor(career(b)), b + ': the drum seat keeps the band noodler'); continue; }
    eq(n, { who: 'player', style: seat === 'bass' ? want.bass : want[seat][g] }, b + '/' + seat + ': you noodle');
  }
});

// v1.2 "Soundcheck" stage 0 (contract §3.9, handoff F3): the Classic switch and the stage-0 stubs leave the timeline alone.
// 31 / 32 / 33 load after 30 as in the build (ORDER by name); the 1,212 fingerprints must not move, Classic on or off, and the
// new play() opts (gig, feel, studio) never reach A.timeline (feel is applied in player(), never baked into the events).
for (const f of ['31_audio_feel.js', '32_audio_dsp.js', '33_audio_voice.js']) {
  const fp = path.join(__dirname, '..', 'src', f);
  if (fs.existsSync(fp)) new Function('window', fs.readFileSync(fp, 'utf8'))({ GG: GG });
}
test('v1.2 classic: stubs change nothing (1,212 timeline fingerprints, Classic off / on, new play opts)', () => {
  const before = JSON.stringify(GG.save.settings());
  eq(A.isClassic(), false, 'default off (settings.audioClassic missing)');
  eq(GG.prefs.get().audioClassic, false, 'prefs normalise it to false');
  eq(fingerprints({}), STAGE0, 'Classic off');
  eq(A.classic(true), true, 'A.classic(true)');
  ok(A.isClassic() && GG.save.settings().audioClassic === true && GG.debug('audio').classic === true, 'persisted + in debug(audio)');
  eq(fingerprints({}), STAGE0, 'Classic on');
  eq(fingerprints({ gig: true, feel: false, studio: true }), STAGE0, 'opts.gig / feel / studio never change the timeline');
  eq(A.classic(false), false, 'A.classic(false)');
  GG.save.saveSettings({ audioClassic: true }); A.applySettings();
  eq(A.isClassic(), true, 'applySettings re-reads the setting');
  A.classic(false);
  ok(JSON.parse(before).audioClassic !== true && GG.save.settings().audioClassic === false, 'left off');
});

// Stage-0 stub returns: the 1.1 behaviour until the lanes fill them in (lanes F / I / V replace these asserts with their own).
test('v1.2 stage-0 contracts + stubs (VEL_REF, FEEL_CLAMP, F16 constants, REALISM = F11; stubs return the 1.1 behaviour)', () => {
  eq(C.VEL_REF, 0.85);
  eq(C.FEEL_CLAMP, { gigDrum: 0.006, gig: 0.015, free: 0.025, sixteenth: 0.25 });
  eq([C.FEEL_MOOD, C.FEEL_STUDIO, C.FEEL_RIVAL, C.BAND_AMP_BY_TIER], [{ below: 30, spread: 1.25 }, 0.25, 0.15, true], 'F16 answers');
  eq(C.REALISM.map(r => r.id), C.KIT_QUALITY, 'one row per kit tier');
  eq(C.REALISM.map(r => [r.rr, r.layers, r.metal, r.snareModes, r.wires, r.rim, r.crush, r.width, r.cab, r.cymBloom, r.subKick]), [
    [2, 1, 0, 1, false, false, 0, 0.3, 'practice8', false, false],
    [3, 2, 3, 2, false, false, 0.15, 0.6, 'combo12', false, false],
    [4, 2, 6, 2, true, true, 0.25, 1, 'genre', false, false],
    [4, 3, 6, 2, true, true, 0.35, 1, 'genre', true, true]], 'F11');
  eq(C.REALISM[3].layerLanes, ['kick', 'snare', 'toms'], 'arena: 3 layers on kick, snare, toms');
  eq([0, 1, 2, 3, -1, 9].map(t => A.realism(t).id), ['milk_crate', 'pawn_shop', 'pro', 'arena', 'milk_crate', 'arena'], 'realism(tier), clamped');
  eq(A.realism().id, 'pro', 'outside a career: the reference tier');
  const tl = A.timeline(song('metal'), { genre: 'metal', songId: 's1' });
  // Lane F filled feelFor / feelPlan / tapVel (31_audio_feel.js; full checks in sim_feel.test.js)
  const FL = A.feelFor(null, 'metal', {}), tv = A.tapVel({ judgement: 'perfect', step: 0, lane: 'kick' });
  ok(FL && FL.byKind && Object.values(FL.byKind).every(x => x.t === 0.5), 'feelFor(null): every player t = 0.5');
  eq(A.feelPlan(tl, null, 1, { gig: true }), null, 'feelPlan without a FEEL: null (the 1.1 path)');
  ok(typeof tv === 'number' && tv >= 0.97 - 1e-9 && tv <= 1, 'tapVel: a Perfect downbeat ~ 1');
  ok(A.warm() instanceof Promise, 'warm -> a Promise');
  ok(GG.dsp && typeof GG.dsp === 'object' && GG.voice && typeof GG.voice === 'object', 'GG.dsp / GG.voice exist');
});

// v1.2 Lane F (handoff F3.2 / F3.3): the feel plan rides beside the timeline; steps never move, lanes keep their order.
test('v1.2 feelPlan never moves steps / keeps lane order at 60-260 bpm (the timeline untouched)', () => {
  for (const g of C.GENRES) for (const bpm of [60, 120, 190, 260]) for (const gig of [false, true]) {
    const p = fullSong(g, bpm), tl = A.timeline(p, { genre: g, songId: 's8' }), before = JSON.stringify(tl.events);
    const FL = A.feelFor(null, g, {}), plan = A.feelPlan(tl, FL, GG.hashSeed('s8|0'), { gig }), w = g + '@' + bpm + (gig ? ' gig' : '');
    eq(JSON.stringify(tl.events), before, w + ': events never mutated');
    eq(plan.dt.length, tl.events.length, w + ': one entry per event');
    const spb = 60 / tl.bpm, cap = Math.min(gig ? 0.015 : 0.025, 0.25 * spb / 4), last = {};
    tl.events.forEach((e, i) => {
      if (e.kind === 'step') { eq([plan.dt[i], plan.vel[i]], [0, 1], w + ': a step stays put'); return; }
      ok(Math.abs(plan.dt[i]) <= cap + 1e-7, w + ': clamp ' + plan.dt[i]);
      const key = e.kind === 'drum' ? e.lane : e.kind, at = e.beat * spb + plan.dt[i];
      if (last[key] != null) ok(at >= last[key] - 1e-7, w + ': ' + key + ' keeps its order');
      last[key] = at;
    });
  }
  eq(fingerprints({ gig: true, feel: true, studio: true }), STAGE0, 'the 1,212 fingerprints with Lane F loaded');
});

// ---- v1.3 "Songwriter" (plan_contract_1.3 §4.5, Lane A): chords, mood, swing, fills, part v2 in the timeline ------------
const S13 = GG.songs, PT13 = GG.songs.part, FX13 = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'v12_songs.json'), 'utf8'));
const brkSecs = g => { const R = G[g].backing.roles || {}; return C.SECTIONS.filter(n => (R[n] || []).indexOf('break') >= 0); };
// neutral v1.3 fields: the native mood, swing 0, chords == the auto progression (sections without break bars), no fillBars
function neutral(q, g, o) {
  q.mood = S13.nativeMood(g); q.swing = 0;
  const ch = {}; C.SECTIONS.forEach(n => { if (q.sections[n] && brkSecs(g).indexOf(n) < 0) ch[n] = S13.chordsOf(q, n, g, o || { part: null }); });
  if (Object.keys(ch).length) q.chords = ch;
  return q;
}
const evJ = t => JSON.stringify(t.events);
const nonStep = t => t.events.filter(e => e.kind !== 'step');
const ROWS13 = { bass: ['x.......x.......', '....x.......x...', '..............x.'], rhythm: ['x.x.x.x.....x.x.', '........x.......'], lead: ['x...............', '...x............', '......x.........', '........x.x.....', '............x...'] };
const partOf13 = (g, seat, p, prog) => { const sections = {}; ['verse', 'chorus', 'bridge', 'solo', 'outro'].forEach(n => { if (!p.sections[n]) return; sections[n] = { rows: ROWS13[seat] }; if (seat === 'lead') sections[n].hook = 1; else sections[n].prog = prog; }); return { seat, sections }; };
const semi = (m, t) => ((m - t) % 12 + 12) % 12;

test('v1.3 neutral fields (native mood, swing 0, chords == the auto progression, no fillBars) == STAGE0; every seat + part too', () => {
  eq(fingerprints({}, (q, g) => neutral(q, g)), STAGE0, 'the 1,212 stage-0 fingerprints with neutral fields');
  for (const g of C.GENRES) for (const seat of ['drums', 'bass', 'rhythm', 'lead']) {
    const p = fullSong(g), part = seat === 'drums' ? undefined : partOf13(g, seat, p, 1), o = { genre: g, songId: 's7', seat, part };
    const q = neutral(JSON.parse(JSON.stringify(p)), g, { part: part === undefined ? null : part, seat });
    eq(evJ(A.timeline(q, o)), evJ(A.timeline(p, o)), g + '/' + seat + ': neutral fields with your part change nothing');
  }
});

test('v1.3 chords: the timeline plays songs.chordsOf (corpus x seat, parts too); chips move the root for every seat incl. lead + drums; Q4', () => {
  let n = 0;
  FX13.corpus.forEach(c => {
    const g = c.genre, p = c.pat, part = p.part || null;
    [undefined, 'drums', 'bass', 'rhythm', 'lead'].forEach(seat => {
      const o = { genre: g, songId: 'c' + n, seat, part: part || undefined }, q = JSON.parse(JSON.stringify(p)), ch = {};
      C.SECTIONS.forEach(nm => { if (q.sections[nm] && brkSecs(g).indexOf(nm) < 0) ch[nm] = S13.chordsOf(q, nm, g, { part, seat }); });
      q.chords = ch;
      eq(H16(A.timeline(q, o)), H16(A.timeline(p, o)), c.id + ' seat ' + seat + ': p.chords = chordsOf plays exactly the 1.2 chords');
      n++;
    });
  });
  ok(n >= 1500, 'corpus x 5 seats: ' + n);
  // chips win over the part's prog and the hash, for every seat (the lead and the drum seat too)
  const want = [5, 7, 3, 10];
  for (const seat of [undefined, 'drums', 'bass', 'rhythm', 'lead']) {
    const p = fullSong('punk', 170); p.chords = { verse: want.slice() };
    const part = seat && seat !== 'drums' ? partOf13('punk', seat, p, 2) : undefined, t = A.timeline(p, { genre: 'punk', songId: 's3', seat, part });
    const kind = seat === 'bass' ? 'gtr' : 'bass';   // (the band's own notes: your part replaces your kinds)
    const roots = [0, 1, 2, 3].map(b => { const e = t.events.find(x => x.kind === kind && x.section === 'verse' && !x.part && Math.abs(x.beat - b * 4) < 1e-9); return e ? semi(e.midi, t.key.tonic) : null; });
    eq(roots, want, 'seat ' + seat + ': the verse plays the chips bar by bar');
  }
  // Q4: a chip moves a breakdown bar (absent: the tonic, as 1.2)
  for (const g of ['metal', 'punk', 'rock']) {
    const p = fullSong(g, 150), at = p.arrangement.indexOf('bridge') * 16, q = JSON.parse(JSON.stringify(p)); q.chords = { bridge: [5, 5, 5, 5] };
    const first = tl => tl.events.find(e => e.kind === 'bass' && e.section === 'bridge' && Math.abs(e.beat - at) < 1e-9);
    const a = A.timeline(p, { genre: g, songId: 's2' }), b = A.timeline(q, { genre: g, songId: 's2' });
    ok(brkSecs(g).indexOf('bridge') >= 0 && G[g].backing.roles.bridge[0] === 'break', g + ' has a breakdown');
    eq(semi(first(a).midi, a.key.tonic), 0, g + ': 1.2 breakdown on the tonic');
    eq(semi(first(b).midi, b.key.tonic), 5, g + ': the chip moves the breakdown bar');
  }
});

test('v1.3 mood: non-native = the parallel key (mode, scale, thirds move; the key note stays); native = absent', () => {
  for (const g of C.GENRES) {
    const nat = S13.nativeMood(g), p = fullSong(g, g === 'country' ? 95 : 120), base = A.timeline(p, { genre: g, songId: 's5' });
    const pn = JSON.parse(JSON.stringify(p)); pn.mood = nat;
    eq(evJ(A.timeline(pn, { genre: g, songId: 's5' })), evJ(base), g + ': the native mood is the 1.2 sound');
    eq(A.timeline(pn, { genre: g, songId: 's5' }).key, base.key, g + ': native key (no mood key)');
    for (let m = 0; m < 5; m++) {
      if (m === nat) continue;
      const R = G[g].backing.moods[m], q = JSON.parse(JSON.stringify(p)); q.mood = m;
      const t = A.timeline(q, { genre: g, songId: 's5' }), w = g + ' mood ' + m + ' (' + R.id + ')';
      eq([t.key.tonic, t.key.offset, t.key.mode, t.key.mood], [base.key.tonic, base.key.offset, R.mode, m], w + ': same key note, new mode');
      ok(t.key.name === base.key.name.split(' ')[0] + ' ' + R.mode, w + ': name ' + t.key.name);
      eq(t.events.filter(e => e.kind === 'drum').length, base.events.filter(e => e.kind === 'drum').length, w + ': drums untouched');
      const voc = t.events.filter(e => e.kind === 'vox' || e.kind === 'bvox');
      ok(voc.length > 0 && voc.every(e => R.scale.includes(semi(e.midi, t.key.tonic))), w + ': vocals in the mood scale');
      if (g === 'country') {
        const strums = t.events.filter(e => e.kind === 'clean' && Array.isArray(e.strum) && e.strum.length === 3);
        ok(strums.length > 10 && strums.every(e => e.strum[1] === R.third), w + ': strums take the mood third ' + R.third);
      }
      if (g === 'rock') {   // the chorus walk: root, third, fifth, ...
        const walk = t.events.filter(e => e.kind === 'bass' && e.section === 'chorus' && Math.abs(e.len - 0.9) < 1e-9);
        const b0 = base.events.filter(e => e.kind === 'bass' && e.section === 'chorus' && Math.abs(e.len - 0.9) < 1e-9);
        ok(walk.length === b0.length && walk.length >= 8, w + ': same walk ' + walk.length);
        ok(walk.every((e, i) => i % 4 !== 1 || e.midi - walk[i - 1].midi === R.third), w + ': the walk climbs the mood third');
      }
    }
  }
});

test('v1.3 swing: whole beats + steps never move, e.g only on moved events, len + gaps in swung beats, swing 0 = straight', () => {
  for (const g of C.GENRES) for (const sw of [1, 2, 3, 4]) {
    const p = fullSong(g), q = JSON.parse(JSON.stringify(p)); q.swing = sw;
    for (const seat of [undefined, 'rhythm']) {
      const o = { genre: g, songId: 's6', seat }, a = A.timeline(p, o), b = A.timeline(q, o), w = g + ' swing ' + sw + ' seat ' + seat;
      eq(b.swing, sw, w + ': result.swing'); eq(a.swing, undefined, 'straight: no swing key');
      eq(JSON.stringify(b.events.filter(e => e.kind === 'step')), JSON.stringify(a.events.filter(e => e.kind === 'step')), w + ': steps never move');
      const A1 = nonStep(a), B1 = nonStep(b);
      eq(A1.length, B1.length, w + ': same events');
      let moved = 0;
      const strip = e => { const c = Object.assign({}, e); delete c.beat; delete c.g; delete c.len; delete c.gap; return c; };
      A1.forEach((x, i) => {
        const y = B1[i], sb = S13.swingBeat(x.beat, sw);
        if (y.g != null) { moved++; ok(y.g === x.beat && y.beat === sb && sb !== x.beat, w + ': moved ' + JSON.stringify([x.beat, y.g, y.beat])); }
        else ok(y.beat === x.beat && sb === x.beat, w + ': unmoved = on a whole beat ' + x.beat);
        if (x.beat % 1 === 0) ok(y.g == null, w + ': whole beats keep no g');
        if (isFinite(x.len)) ok(Math.abs(y.len - (S13.swingBeat(x.beat + x.len, sw) - y.beat)) < 1e-9, w + ': len warps');
        eq(strip(y), strip(x), w + ': only beat / g / len / gap change');
      });
      ok(moved > 0, w + ': some notes swing');
      const last = {};   // gaps in swung beats (same voice, wrapping)
      for (let i = b.events.length - 1; i >= 0; i--) {
        const e = b.events[i]; if (e.kind === 'step') continue;
        const k = e.kind === 'drum' ? e.lane : e.single ? e.kind + '|' + e.midi : e.kind;
        if (last[k] != null && !e.ring) ok(Math.abs(e.gap - (last[k] - e.beat)) < 1e-9, w + ': gap ' + k);
        last[k] = e.beat;
      }
    }
    const z = JSON.parse(JSON.stringify(p)); z.swing = 0;
    eq(evJ(A.timeline(z, { genre: g, songId: 's6' })), evJ(A.timeline(p, { genre: g, songId: 's6' })), g + ': swing 0 = straight');
  }
});

test('v1.3 fills: bar 4 of a section plays p.fillBars[name]; the band, the hash + the riff stay on the main bar', () => {
  for (const g of C.GENRES) {
    const p = fullSong(g), q = JSON.parse(JSON.stringify(p)), fill = ['x...x...x...x...', '....x.x.x.xxxxxx', '................', 'x...............'].slice(0, p.lanes);
    q.fillBars = { verse: fill, chorus: fill };
    const a = A.timeline(p, { genre: g, songId: 's9' }), b = A.timeline(q, { genre: g, songId: 's9' });
    const band = t => JSON.stringify(t.events.filter(e => e.kind !== 'drum' && e.kind !== 'step').map(e => { const c = Object.assign({}, e); delete c.gap; return c; }));
    eq(band(b), band(a), g + ': every band / vocal event as without the fill');
    const drums = (t, nm, bar) => t.events.filter(e => e.kind === 'step' && e.section === nm && e.bar === bar && e.step === 0).map(st =>
      t.events.filter(e => e.kind === 'drum' && e.beat >= st.beat - 1e-9 && e.beat < st.beat + 4 - 1e-9).map(e => e.li + '@' + Math.round((e.beat - st.beat) * 4)).join());
    const want = []; fill.forEach((s, l) => { for (let i = 0; i < 16; i++) if (s[i] === 'x') want.push([i, l]); });
    want.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    for (const nm of ['verse', 'chorus']) {
      const d3 = drums(b, nm, 3);
      ok(d3.length >= 1, g + ' ' + nm + ' entries');
      d3.forEach(d => eq(d, want.map(x => x[1] + '@' + x[0]).join(), g + ' ' + nm + ': bar 4 is the fill'));
      eq(drums(b, nm, 0), drums(a, nm, 0), g + ' ' + nm + ': bar 1 the main bar');
      eq(drums(b, nm, 2), drums(a, nm, 2), g + ' ' + nm + ': bar 3 the main bar');
    }
    eq(drums(b, 'bridge', 3), drums(a, 'bridge', 3), g + ': a section without a fill keeps its bar 4');
  }
});

test('v1.3 part v2: timeline(upgrade(pt)) == timeline(pt) (corpus + every index x mood, per seat x genre)', () => {
  let n = 0;
  FX13.corpus.forEach((c, ci) => {
    const g = c.genre;
    ['bass', 'rhythm', 'lead'].forEach(seat => {
      const raw = c.pat.part && c.pat.part.seat === seat ? c.pat.part : PT13.full(g, seat, c.pat, GG.RNG(ci + 1));
      const pt = S13.sanitize(Object.assign({}, c.pat, { part: raw }), null, null, true).part, up = PT13.upgrade(pt), o = { genre: g, songId: 'u' + ci, seat };
      ok(up.v === 2 && PT13.rowsOf(up) === C.PART_V2[seat], c.id + ' upgraded');
      eq(H16(A.timeline(c.pat, Object.assign({ part: up }, o))), H16(A.timeline(c.pat, Object.assign({ part: pt }, o))), c.id + ' ' + seat + ': upgrade plays the same');
      n++;
    });
  });
  ok(n >= 900, 'corpus x 3 seats: ' + n);
  for (const g of C.GENRES) for (const seat of ['bass', 'rhythm', 'lead']) {
    const p = fullSong(g), L = seat === 'lead' ? G[g].backing.hooks.verse.length : G[g].backing.progressions.verse.length;
    for (let i = 0; i < L; i++) for (const mood of [undefined, 0, 4]) {
      const q = JSON.parse(JSON.stringify(p)); if (mood != null) q.mood = mood;
      const pt = partOf13(g, seat, q, i); if (seat === 'lead') Object.keys(pt.sections).forEach(k => { pt.sections[k].hook = i; });
      const o = { genre: g, songId: 'v' + i, seat };
      eq(evJ(A.timeline(q, Object.assign({ part: PT13.upgrade(pt) }, o))), evJ(A.timeline(q, Object.assign({ part: pt }, o))), g + '/' + seat + ' #' + i + ' mood ' + mood);
    }
  }
});

test('v1.3 part v2 rows: rhythm singles (power false) + Scratch (dead, midi = root, <= 1 step); bass 3rd / 7th / Low 5th; lead Low / High', () => {
  const blank = n => Array(n).fill(E16);
  for (const g of C.GENRES) {
    const p = fullSong(g); p.arrangement = ['verse', 'chorus'];
    // rhythm: chug on 0 + 14, Root + Oct singles on 4, 5th alone on 8, Scratch alone on 12, 13, 15 (under the chug on 14: ignored)
    const rows = blank(6); rows[0] = 'x.............x.'; rows[2] = '....x...........'; rows[4] = '....x...........'; rows[3] = '........x.......'; rows[5] = '............xxxx';
    const pt = { seat: 'rhythm', v: 2, sections: { verse: { prog: 0, rows }, chorus: { prog: 0, rows } } };
    const t = A.timeline(p, { genre: g, songId: 'r1', seat: 'rhythm', part: pt }), K = A.seatKinds(g, 'rhythm');
    const mine = t.events.filter(e => e.part && e.section === 'verse' && e.beat < 4), at = s => mine.filter(e => Math.abs(e.beat - s / 4) < 1e-9);
    const hi = g === 'rock' || g === 'country' ? 12 : 0, root = at(0)[0].midi - hi, w = g + ' rhythm';
    ok(mine.every(e => K.includes(e.kind)), w + ': your kinds');
    eq(at(4).filter(e => e.single).map(e => e.midi - root - hi).sort((a, b) => a - b), [0, 12], w + ': Root + Oct singles on one step');
    ok(at(4).every(e => e.power === false && e.single === true && !e.dead), w + ': singles are power: false');
    if (g === 'country') ok(at(4).every(e => e.strum.length === 1), w + ': country picks one string');
    eq(at(8).map(e => e.midi - root - hi), [7], w + ': 5th alone');
    eq(at(12).map(e => [e.dead, e.mute, e.midi - hi, e.len]), [[true, true, root, 0.25]], w + ': Scratch = a dead strum at the root (1 step)');
    eq(at(13).map(e => e.len), [0.25], w + ': a Scratch run stays 16ths');
    ok(at(14).length >= 1 && at(14).every(e => !e.dead), w + ': Scratch under a chug is ignored');
    ok(at(15).length === 1 && at(15)[0].dead, w + ': Scratch on 15');
    ok(t.events.filter(e => e.part).every(e => e.gap > 0), w + ': no zero gaps (a single is its own voice)');
  }
  // bass: Low 5th a fourth under the root as it sounds (also under bassFloor in a low metal key), 3rd + 7th from the mood rung
  for (const g of C.GENRES) for (const mood of [undefined, 0, 3]) {
    const p = fullSong(g); p.arrangement = ['verse']; if (mood != null) p.mood = mood;
    const rows = blank(6); rows[0] = 'x...............'; rows[1] = '....x...........'; rows[2] = '........x.......'; rows[4] = '............x...';
    const fl = G[g].backing.bassFloor || 0, R = S13.moodOf(g, mood) || G[g].backing.moods[S13.nativeMood(g)];
    let under = 0;
    for (let k = 1; k <= 12; k++) {
      const t = A.timeline(p, { genre: g, songId: 'b' + k, seat: 'bass', part: { seat: 'bass', v: 2, sections: { verse: { prog: 0, rows } } } });
      const b = t.events.filter(e => e.part && e.beat < 4), r = b[1].midi, w = g + ' bass b' + k + ' mood ' + mood;
      eq(b.length, 4, w + ': four notes');
      eq(b[0].midi, r - 5, w + ': Low 5th = root - 5');
      ok(!fl || b[0].midi >= fl - 7, w + ': at most 7 under the floor');
      if (fl && b[0].midi < fl) under++;
      eq([b[2].midi - r, b[3].midi - r], [R.third, R.seventh], w + ': 3rd / 7th from the rung');
    }
    if (g === 'metal') ok(under > 0, 'metal: some keys put the Low 5th under bassFloor (the v2 allowance) ' + under);
  }
  // lead: Low = one scale step under the hook, High = one over (the mood's scale)
  for (const g of C.GENRES) {
    const p = fullSong(g); p.arrangement = ['verse'];
    const rows = blank(7); rows[0] = 'x...............'; rows[1] = '....x...........'; rows[5] = '........x.......'; rows[6] = '............x...';
    const t = A.timeline(p, { genre: g, songId: 'l1', seat: 'lead', part: { seat: 'lead', v: 2, sections: { verse: { hook: 0, rows } } } });
    const nn = t.events.filter(e => e.part && e.beat < 4).map(e => e.midi), sc = G[g].backing.scale;
    eq(nn.length, 4, g + ' lead: four notes');
    ok(nn[0] < nn[1] && nn[2] < nn[3], g + ' lead: Low under row 1, High over row 5 ' + nn);
    ok(nn.every(m => sc.includes(semi(m, t.key.tonic))), g + ' lead: in the scale');
  }
});

test('v1.3 debug + voices: debug(audio) reports swing / mood; a dead strum fails soft without Web Audio', () => {
  const p = fullSong('rock'); p.swing = 3; p.mood = 0;
  A.timeline(p, { genre: 'rock', songId: 's1' });
  const d = GG.debug('audio'); eq([d.swing, d.mood], [3, 0]);
  A.timeline(fullSong('rock'), { genre: 'rock', songId: 's1' });
  const d2 = GG.debug('audio'); eq([d2.swing, d2.mood], [0, null]);
  ok(A.strum(40, undefined, { dead: true }) === null, 'no context: the voice fails soft');
});

done('sim_audio');
