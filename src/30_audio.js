// 30_audio.js: every sound in the game, synthesized with Web Audio (no files).
// The AudioContext is created lazily on the first user gesture (GG.audio.unlock, wired in 60_main).
//   sfx:   tiny UI sounds, at most MAX_VOICES sources at once (extra sounds are dropped, never queued).
//   song:  a per-genre synth kit (6 lanes, v0.6.1 genre tuning from content/genres.js `kit`) + a generated band in a new
//          key per song (seeded by the song id) whose density follows the section (sparse verses, full choruses,
//          stripped breakdowns, solos), + synthesized vocal hits on the beat grid. Played by a look-ahead scheduler on
//          AudioContext.currentTime (never rAF time). timeline() turns a song into timed events; the gig reuses play().
//   rooms: a convolver per room class; the venue decides it during gigs (basements dry, Legion halls echo, arenas huge),
//          the genre kit otherwise (rock roomy, country dry).
//   ambience (bus events + state only): the crowd in gigs, garage hum with the guitarist noodling, van road noise + the
//          van radio (your best-charting song, quietly).
//   v0.7.2 metal (owner: "heavier"): two rhythm guitars (double-tracked, panned L/R) through a high-gain amp each (pre-EQ ->
//          asymmetric clipper at 4x oversampling -> cab sim), drop tuning by tempo band, tight gated palm mutes, a sub +
//          driven bass, darker riffs (phrygian, b2/tritone stabs, chromatic runs, breakdown drops), growls + screams.
//   v0.7.2 crowd (all genres): a layered crowd pre-rendered once into AudioBuffers (plain seeded JS DSP): a babble bed of
//          formant voices, a roar that follows the meter, applause + on-beat clapping when hot, whistles, "woo"s, big
//          cheers at song ends and great moments, boos when it goes badly; a little of it goes to the venue's reverb.
// Graph: sfx -> sfxBus(sfx) ─────────────────────────────────────────────────────────────────┐
//        ambience (garage, road, radio) -> ambBus(sfx) ───────────────────────────────────────┤
//        crowd layers + one-shots -> crowdBus(crowd) (+ a small send into the room) ──────────┤
//        song ports -> kit -> busDrums(drums) ┐                                                 ├> master (mute) -> ceiling -> out
//                   band/vocals -> busBand(band) ┴(+ room send -> convolver)-> glue -> limiter -> songOut ┘
// Song voices are capped at SONG_VOICES (the band at BAND_VOICES of them): each lane/voice is monophonic (a hit chokes
// the previous one of its lane at the next hit's time) and the scheduler books every source. Live taps (hit) are cut
// off per lane the same way, and the cap leaves room for the whole kit (10 voices) on top of a full band, so taps
// always sound.
//   GG.audio.unlock() ; sfx(name) ; setMuted(bool) ; isMuted() ; toggleMuted() ; suspend() ; resume()
//   play(pattern, { genre, section|null, loop, backing, drums, vocals, songId, metronome })
//     -> handle { stop(), update(pattern), beatAt(time), playing, start, bpm, key }
//     emits 'audio:step' { section, bar, step, time, entry } per 16th and 'audio:end' { handle } when a song finishes
//   hit(lane) (one drum hit now) ; stop() ; isPlaying() ; current() ; context()
//   timeline(pattern, opts) ; styleFor(genre, bpm) ; keyFor(seed, genre, bpm?) (v0.7.2: bpm picks the metal tuning band)
//   roomFor(gig) ; renderOffline(spec) (tests; v0.7.2 stereo, + probe / crowd specs, result.buffer)
//   Mixer (v0.6.1): setVolume(bus, 0..1) ; getVolume(bus) ; volumes() for C.MIX_BUSES (settings.mix)
//   Metronome: metronome() ; setMetronome(bool) ; toggleMetronome() (settings.metronome; honoured by play(.., {metronome}))
//   applySettings() re-reads settings (mix, metronome, brushes, muted) ; ambience() ; room() ; refreshAmbience()
// v0.8 (KITSIM, Addendum C3): kit quality tiers (state.gear.quality, C.KIT_QUALITY milk crate -> pawn shop -> pro -> arena)
//   change the synth: body (tone level + pitch), sustain (decays), saturation (a soft drive on the kit), a box resonance /
//   low cut / high cut (thin and cheap -> full and punchy) and the reverb send. kitQuality() ; qualityFor(tier) ; kitFor(genre,
//   tier) (the derived kit, pure) ; renderOffline({ quality }) (default: the live career's tier, else 2 = the v0.6.1 reference).
//   Extra sections: an 'outro' plays full then its last bar rings (one held chord past the end; the song's tail waits for
//   it); a 'solo' is Dana's (role 'solo' for every bar: the genre's lead over the band, no vocal hits) over a stripped kit
//   (only the drum hits on the beat play, exactly what the gig chart asks for).
// v0.9 "Genres" (plan_contract_0.9 §5 D; metal's band is untouched, byte for byte):
//   genre amps (content backing.amp / fiddle / acoustic): punk + rock guitars double-tracked L/R through crunch amps (punk
//     mid-forward, rock's open chords ringing wide), country: Earl's clean Tele with slapback, a bowed fiddle (body formants
//     + bow noise), a fuller acoustic strum spread L/R. Each built on first use (a punk career never builds the metal amp).
//   tempo styles: punk eighths / skate / hardcore, rock ballad (< 90 BPM, or opts.style 'ballad': the Chartbusters) / rock /
//     drive, country twostep / train. Solos follow gig.roles.solo's instrument: A.soloFor(genre, soloist?) -> 'twochord'
//     (Benny) | 'lead' | 'twang' (Earl) | 'fiddle' | null (nobody: the band plays on). The fiddle takes fills + the outro.
//   vocals: a voice profile per singer (content voices: A.voiceFor(memberId, genre, rivalId?); the career's frontman, or
//     opts.singer / opts.rival), a vocal plan per song (seeded by its id): metal scream types (shriek, scream, squeal, gang,
//     held; growl, guttural, fry) per song and per section (A.vocFamily(voc) -> 'scream' | 'growl'), shouted words (their
//     vowels shape the formants; the odd French one from Marcel), a count-in yell, held notes closing choruses, the band's
//     gang answers (kind 'bvox'; a hot crowd shouts along) and whoa-ohs with a harmony. All on the beat grid, in key, booked.
//   crowd: one-shots per C.MOMENTS kind (A.momentShots(kind)): the metal roar, gang HEY/OI, the whoa-oh sing-along, a
//     clap-along on 2 and 4 + yee-haws; on the song's beats, in its key. Parts 'gang', 'whoa', 'yeehaw' build after the core.
//   garage: a bed per tier-0 space (A.bedFor(kind, season): laundromat dryers + buzzer, strip-mall tube + the vacuum repair,
//     Quonset wind on steel + crickets / a meadowlark) and a noodle per band by the noodler's gear (A.noodleFor(state)).
//   play / timeline opts += style (force), singer, rival, soloist. debug('audio') += rigs, voice, solo, bed, noodle, vocTypes.
(function (GG) {
  var A = GG.audio = GG.audio || {};
  var C = GG.contracts;
  var MAX_VOICES = 8, SFX_VOLUME = 0.32, SONG_VOLUME = 0.62, SONG_VOICES = 18, BAND_VOICES = 8, CROWD_VOICES = 12, AMB_VOICES = 6;
  var LOOKAHEAD = 0.12, TICK_MS = 25, LEAD_IN = 0.06;   // seconds scheduled ahead, scheduler period, start delay
  var BUSES = (C && C.MIX_BUSES) || ['drums', 'band', 'crowd', 'sfx'];
  var ctx = null, master = null, sfxBus = null, ambBus = null, crowdBus = null, noise = null, rig = null, BUF = null;
  var voices = 0, muted = null, suspended = false, current = null, stepCount = 0, lastStep = null;
  var prefs = null, mixNodes = [], live = { amb: 0, crowd: 0 };
  var counts = { clicks: 0, noodles: 0, thumps: 0, cheers: 0, boos: 0, vox: 0, claps: 0, woos: 0, whistles: 0, applause: 0, dropped: 0, tapDrops: 0 };

  function settings() {
    try { return (GG.save && GG.save.settings && GG.save.settings()) || {}; } catch (e) { return {}; }
  }
  function persist(o) { try { if (GG.save && GG.save.saveSettings) GG.save.saveSettings(o); } catch (e) { /* ignore */ } }
  function clamp01(v) { v = +v; return v !== v ? 0 : v < 0 ? 0 : v > 1 ? 1 : v; }
  // settings.mix { drums, band, crowd, sfx } 0..1 (default 1), settings.metronome (default off), settings.brushes (default on).
  function loadPrefs() {
    var s = settings(), m = s.mix && typeof s.mix === 'object' ? s.mix : {};
    prefs = { mix: {}, metronome: !!s.metronome, brushes: s.brushes !== false };
    BUSES.forEach(function (b) { prefs.mix[b] = m[b] == null ? 1 : clamp01(m[b]); });
    return prefs;
  }
  function P() { return prefs || loadPrefs(); }
  function busGain(bus) { var v = P().mix[bus]; v = v == null ? 1 : v; return v * v; }   // squared: the slider feels even
  A.isMuted = function () { if (muted === null) muted = !!settings().muted; return muted; };
  function lcg(s) { return (s * 16807) % 2147483647; }
  // One second of white noise per context, shared by every noisy sound.
  function noiseBuffer(c) {
    var b = c.createBuffer(1, c.sampleRate, c.sampleRate), d = b.getChannelData(0), s = 22222;
    for (var i = 0; i < d.length; i++) { s = lcg(s); d[i] = s / 1073741823.5 - 1; }
    return b;
  }
  // Four seconds of seamless looping noise for beds: 'brown' (road rumble, room tone) or 'murmur' (a crowd talking).
  function loopBuffer(c, kind) {
    var sr = c.sampleRate, n = Math.floor(sr * 4), m = Math.floor(sr * 0.12), tmp = new Float32Array(n + m);
    var s = kind === 'murmur' ? 777 : 4242, lp = 0, env = 0.6, tgt = 0.6, per = Math.floor(sr * 0.06), i;
    for (i = 0; i < n + m; i++) {
      s = lcg(s); var x = s / 1073741823.5 - 1;
      if (kind === 'murmur') {
        lp += (x - lp) * 0.3;
        if (i % per === 0) { s = lcg(s); tgt = 0.25 + 0.75 * s / 2147483647; }   // a new voice's loudness every 60 ms
        env += (tgt - env) * 0.002;
        tmp[i] = lp * env * 1.6;
      } else { lp = (lp + 0.02 * x) / 1.02; tmp[i] = lp * 3.2; }
    }
    var b = c.createBuffer(1, n, sr), d = b.getChannelData(0);
    for (i = 0; i < n; i++) d[i] = i < m ? tmp[i] * (i / m) + tmp[n + i] * (1 - i / m) : tmp[i];   // crossfade: no seam
    return b;
  }
  // A transparent safety ceiling on the master: linear below 0.8, soft-knees into 0.98. Nothing clips on a phone.
  function ceilingCurve() {
    var n = 4096, c = new Float32Array(n);
    for (var i = 0; i < n; i++) { var x = i * 2 / (n - 1) - 1, a = Math.abs(x); c[i] = a <= 0.8 ? x : (x < 0 ? -1 : 1) * (0.8 + 0.18 * Math.tanh((a - 0.8) / 0.18)); }
    return c;
  }

  A.unlock = function () {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      try { ctx = new AC(); } catch (e) { ctx = null; return false; }
      P();
      master = ctx.createGain();
      master.gain.value = A.isMuted() ? 0 : 1;
      var ceiling = ctx.createWaveShaper(); ceiling.curve = ceilingCurve();
      master.connect(ceiling); ceiling.connect(ctx.destination);
      sfxBus = mixNode('sfx', SFX_VOLUME, master);
      ambBus = mixNode('sfx', 1, master);
      crowdBus = mixNode('crowd', 1, master);
      noise = noiseBuffer(ctx);
      rig = makeRig(ctx, master, noise, { mix: 'live', clickDest: sfxBus });
      if (rig.send) crowdBus.connect(gainNode(ctx, 0.15, rig.send));   // v0.7.2: the crowd is in the room too
      setKit(rig, (GG.state && GG.state.genre) || 'metal');
      applyRoom();
      setInterval(refresh, 1000);   // the garage scene can change without a screen event
      setTimeout(warmCrowd, 400);
      refreshSoon();
    }
    if (ctx.state === 'suspended' && !suspended) { try { ctx.resume(); } catch (e) { /* ignore */ } }
    return true;
  };

  A.setMuted = function (m) {
    muted = !!m;
    if (master) master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.02);
    persist({ muted: muted });
    refreshSoon();
    return muted;
  };
  A.toggleMuted = function () { return A.setMuted(!A.isMuted()); };
  // The app went to the background: stop any song and the ambience, and freeze the context.
  A.suspend = function () {
    suspended = true;
    if (current) current.stop(true);
    if (ctx && amb.mode !== 'none') setMode('none');
    if (ctx && ctx.state === 'running') { try { ctx.suspend(); } catch (e) { /* ignore */ } }
  };
  A.resume = function () { suspended = false; if (ctx && ctx.state === 'suspended') { try { ctx.resume(); } catch (e) { /* ignore */ } } refreshSoon(); };

  /* ---- Mixer + metronome (v0.6.1) ---------------------------------------------------------------------- */
  function mixNode(bus, base, dest) { var g = gainNode(ctx, base * busGain(bus), dest); mixNodes.push({ bus: bus, node: g, base: base }); return g; }
  function applyMix() {
    if (!ctx) return;
    var t = ctx.currentTime;
    mixNodes.forEach(function (m) { m.node.gain.setTargetAtTime(m.base * busGain(m.bus), t, 0.03); });
  }
  // bus: one of C.MIX_BUSES (drums = kit + your taps, band = backing + vocals, crowd = bed + cheers/boos,
  // sfx = UI sounds, ambience, van radio, metronome). Returns the stored 0..1 value, null for an unknown bus.
  A.setVolume = function (bus, v) {
    if (BUSES.indexOf(bus) < 0) return null;
    P().mix[bus] = clamp01(v);
    applyMix();
    persist({ mix: A.volumes() });
    return prefs.mix[bus];
  };
  A.getVolume = function (bus) { return BUSES.indexOf(bus) < 0 ? null : P().mix[bus]; };
  A.volumes = function () { var o = {}; BUSES.forEach(function (b) { o[b] = P().mix[b]; }); return o; };
  A.metronome = function () { return P().metronome; };
  A.setMetronome = function (on) { P().metronome = !!on; persist({ metronome: prefs.metronome }); return prefs.metronome; };
  A.toggleMetronome = function () { return A.setMetronome(!A.metronome()); };
  // Settings changed elsewhere (the settings screen, a loaded save): re-read mix, metronome, brushes and mute.
  A.applySettings = function () {
    loadPrefs(); muted = null;
    applyMix();
    if (master) master.gain.setTargetAtTime(A.isMuted() ? 0 : 1, ctx.currentTime, 0.02);
    refreshSoon();
    return { mix: A.volumes(), metronome: prefs.metronome, brushes: prefs.brushes, muted: A.isMuted() };
  };

  /* ---- SFX building blocks ----------------------------------------------------------------------------- */
  var sfxDest = null;   // cheer/boo recipes go to the crowd bus
  // Every source goes through voice(): counted while playing, released on 'ended'.
  function voice(src, t0, dur) {
    voices++;
    src.onended = function () { voices = Math.max(0, voices - 1); };
    src.start(t0); src.stop(t0 + dur + 0.05);
  }
  // Attack/decay envelope on a fresh gain node connected to `dest` (default the sfx bus).
  function env(t0, attack, peak, decay, dest) {
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
    g.connect(dest || sfxDest || sfxBus);
    return g;
  }
  // Oscillator note with an optional pitch glide to f1.
  function tone(type, f0, f1, t0, dur, peak, attack) {
    var o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    o.connect(env(t0, attack || 0.005, peak, dur));
    voice(o, t0, dur);
  }
  // Filtered noise burst. filter: { type, f0, f1, q }
  function hiss(t0, dur, peak, filter, attack) {
    var src = ctx.createBufferSource();
    src.buffer = noise;
    var f = ctx.createBiquadFilter();
    f.type = filter.type || 'bandpass';
    f.frequency.setValueAtTime(filter.f0, t0);
    if (filter.f1) f.frequency.exponentialRampToValueAtTime(filter.f1, t0 + dur);
    f.Q.value = filter.q || 1;
    src.connect(f); f.connect(env(t0, attack || 0.004, peak, dur));
    voice(src, t0, dur);
  }

  /* ---- SFX recipes: [voices needed, play(t0)] ---------------------------------------------------------- */
  var SFX = {
    tap: [1, function (t) { tone('sine', 900, 620, t, 0.05, 0.12); }],
    card: [2, function (t) {
      hiss(t, 0.09, 0.18, { type: 'bandpass', f0: 1800, f1: 4200, q: 0.8 });
      tone('triangle', 520, 780, t + 0.03, 0.12, 0.1);
    }],
    cash: [3, function (t) {
      hiss(t, 0.04, 0.2, { type: 'highpass', f0: 5000 });
      tone('triangle', 1320, 0, t + 0.02, 0.08, 0.12);
      tone('triangle', 1760, 0, t + 0.1, 0.22, 0.12);
    }],
    // v0.7.2: the crowd's own recordings once they're built (awards, the studio, the Moose Opera), else the old synth.
    cheer: [3, function (t) {
      if (crowdReady(CB)) { crowdSfx(t, false); return; }
      hiss(t, 1.1, 0.16, { type: 'bandpass', f0: 900, f1: 1600, q: 0.6 }, 0.25);
      hiss(t + 0.1, 0.9, 0.08, { type: 'bandpass', f0: 2600, f1: 2000, q: 2 }, 0.2);
    }],
    boo: [2, function (t) {
      if (crowdReady(CB)) { crowdSfx(t, true); return; }
      tone('sawtooth', 190, 120, t, 0.6, 0.05, 0.08);
      tone('sawtooth', 196, 116, t + 0.02, 0.6, 0.04, 0.08);
    }],
    whoosh: [1, function (t) { hiss(t, 0.32, 0.14, { type: 'bandpass', f0: 350, f1: 3200, q: 1.2 }, 0.12); }],
    // A short tom fill into a crash, for gig results.
    drum: [6, function (t) {
      [[240, 0], [200, 0.09], [165, 0.18], [130, 0.27]].forEach(function (h) { tone('sine', h[0], h[0] * 0.45, t + h[1], 0.16, 0.5, 0.002); });
      tone('sine', 110, 45, t + 0.38, 0.3, 0.7, 0.002);
      hiss(t + 0.38, 0.8, 0.14, { type: 'highpass', f0: 5200 });
    }],
    save: [2, function (t) { tone('sine', 660, 0, t, 0.14, 0.1); tone('sine', 990, 0, t + 0.11, 0.26, 0.1); }],
    // v0.7.1 title screen: thunder rolling in over the prairie (a crack, then a long low rumble) and Dad's truck horn.
    thunder: [3, function (t) {
      hiss(t, 0.35, 0.22, { type: 'bandpass', f0: 2400, f1: 500, q: 0.7 }, 0.004);
      rumble(t + 0.05, 3.2, 0.9, 190, 55); rumble(t + 0.5, 2.4, 0.5, 120, 45);
    }],
    honk: [4, function (t) {
      [0, 0.32].forEach(function (d) { tone('sawtooth', 392, 0, t + d, 0.22, 0.06, 0.01); tone('sawtooth', 494, 0, t + d, 0.22, 0.05, 0.01); });
    }]
  };
  // A short crowd cheer (the roar swelling, applause, a "woo") or boo from the crowd buffers, as a counted sfx.
  function crowdSfx(t, isBoo) {
    function play(buf, at, gain, pan, off, dur, swell) {
      var s = ctx.createBufferSource(); s.buffer = buf;
      var g = gainNode(ctx, swell ? 0 : gain, panNode(ctx, pan, sfxDest || sfxBus)); s.connect(g);
      if (swell) { g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(gain, at + 0.25); g.gain.setTargetAtTime(0, at + dur * 0.45, dur * 0.18); }
      voices++; s.onended = function () { voices = Math.max(0, voices - 1); };
      s.start(at, off); s.stop(at + dur);
    }
    if (isBoo) { play(CB.boo[0], t, 0.6, 0, 0, 2.4); return; }
    play(CB.roar[0], t, 0.45, 0, 0.9, 2.6, true);
    play(CB.applause[0], t + 0.1, 0.5, 0, 0.3, 2.8, true);
    play(CB.woo[0], t + 0.35, 0.3, -0.4, 0, 0.8);
  }
  // Long lowpassed noise (loops the white noise buffer so it can outlast it), for thunder.
  function rumble(t0, dur, peak, f0, f1) {
    var src = ctx.createBufferSource(); src.buffer = (BUF && BUF.brown) || noise; src.loop = true;
    var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 0.8;
    f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    src.connect(f); f.connect(env(t0, 0.09, peak, dur));
    voice(src, t0, dur);
  }
  var CROWD_SFX = { cheer: 1, boo: 1 };

  A.sfx = function (name) {
    var r = SFX[name];
    if (!r || !ctx || A.isMuted() || suspended || ctx.state !== 'running') return false;
    if (CROWD_SFX[name] && crowd.on && ctx.currentTime - crowd.last < 0.3) return true;   // the crowd already reacted
    if (voices + r[0] > MAX_VOICES) return false;
    sfxDest = CROWD_SFX[name] ? crowdBus : null;
    try { r[1](ctx.currentTime + 0.01); } catch (e) { sfxDest = null; return false; }
    sfxDest = null;
    return true;
  };

  /* ======================================================================================================
     Song engine: a rig (shared processing per context) + ports (per playback, so stop() can silence
     everything already booked) + voices (drum lanes, band notes, vocal hits) + the look-ahead scheduler.
     ====================================================================================================== */
  function gainNode(c, v, dest) { var g = c.createGain(); g.gain.value = v; if (dest) g.connect(dest); return g; }
  function filterNode(c, type, f, q, dest) { var n = c.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q || 0.7; if (dest) n.connect(dest); return n; }
  function eqNode(c, type, f, q, db, dest) { var n = filterNode(c, type, f, q, dest); n.gain.value = db; return n; }   // peaking / shelves
  // Stereo placement (-1 left .. 1 right); a plain gain where StereoPanner is missing (old iOS): mono, never silent.
  function panNode(c, pan, dest) {
    var n = c.createStereoPanner ? c.createStereoPanner() : c.createGain();
    if (n.pan) n.pan.value = Math.max(-1, Math.min(1, pan || 0));
    if (dest) n.connect(dest);
    return n;
  }
  // Soft clipper: y = (1+k)x / (1+k|x|), always inside -1..1.
  var curves = {};
  function driveCurve(k) {
    if (curves[k]) return curves[k];
    var n = 1024, c = new Float32Array(n);
    for (var i = 0; i < n; i++) { var x = i * 2 / (n - 1) - 1; c[i] = (1 + k) * x / (1 + k * Math.abs(x)); }
    return (curves[k] = c);
  }
  // v0.8 kit saturation: y = tanh(k x) / tanh(k), unity at full scale, never above 1 (k = 0: a straight line).
  var sats = {};
  function satCurve(k) {
    if (sats[k]) return sats[k];
    var n = 1024, c = new Float32Array(n), t = k > 0 ? Math.tanh(k) : 1;
    for (var i = 0; i < n; i++) { var x = i * 2 / (n - 1) - 1; c[i] = k > 0 ? Math.tanh(k * x) / t : x; }
    return (sats[k] = c);
  }
  // v0.7.2 high-gain clipper: gain g, then a soft (tanh) top and a harder bottom that knees into -0.92. The asymmetry adds
  // even harmonics to the clipping's odd ones (a DC offset the cab's high-pass removes).
  function asymCurve(g) {
    var key = 'a' + g; if (curves[key]) return curves[key];
    var n = 4096, c = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      var x = (i * 2 / (n - 1) - 1) * g;
      c[i] = x >= 0 ? Math.tanh(x) : x > -0.6 ? x : -0.6 - 0.32 * Math.tanh((-x - 0.6) / 0.32);
    }
    return (curves[key] = c);
  }
  // Rooms: impulse length (s), wet level, tail brightness (one-pole), a discrete echo (s) for halls and arenas.
  // The convolver normalises its impulse (about -58 dB per sample), so reverb energy grows with the room's length; wet
  // sets the direct-to-reverb ratio at a full send: dry ~ -15 dB, room ~ -8, hall ~ -3, arena ~ 0.
  var ROOMS = {
    dry: { len: 0.45, wet: 1, tone: 0.5 },
    room: { len: 0.9, wet: 1.6, tone: 0.45 },
    hall: { len: 1.9, wet: 1.9, tone: 0.4, echo: 0.11 },
    theatre: { len: 2.6, wet: 1.9, tone: 0.38, echo: 0.07 },
    arena: { len: 3.6, wet: 2, tone: 0.34, echo: 0.19 }
  };
  function impulse(c, cls) {
    var R = ROOMS[cls], sr = c.sampleRate, n = Math.max(64, Math.floor(R.len * sr)), b = c.createBuffer(2, n, sr);
    for (var ch = 0; ch < 2; ch++) {
      var d = b.getChannelData(ch), s = (GG.hashSeed('room|' + cls + '|' + ch) % 2147483646) + 1, lp = 0, i;
      for (i = 0; i < n; i++) { s = lcg(s); lp += (s / 1073741823.5 - 1 - lp) * R.tone; d[i] = lp * Math.exp(-6.9 * i / n); }
      if (R.echo) {   // Legion halls slap back off the far wall
        var e = Math.floor(R.echo * (ch ? 1.08 : 1) * sr), m = Math.min(n - e, Math.floor(0.04 * sr));
        for (i = 0; i < m; i++) d[e + i] += d[i] * 0.6;
      }
    }
    return b;
  }
  var DEFAULT_KIT = { room: 'room', verb: 0.3, level: 1, six: 'ride',
    kick: { f0: 165, f1: 50, glide: 0.07, dec: 0.42, body: 1, click: 0.4, clickHp: 2600 },
    snare: { f0: 230, f1: 170, body: 0.55, bodyDec: 0.11, noise: 0.75, hp: 1400, dec: 0.22 },
    hat: { hp: 7800, dec: 0.055, lv: 0.4 }, cymbal: { hp: 9000, f1: 4800, dec: 1.3, lv: 0.42 }, toms: [200, 160, 125], tomDec: 0.36 };
  function baseKit(genre) { var G = GG.songs && GG.songs.genre ? GG.songs.genre(genre) : null; return (G && G.kit) || DEFAULT_KIT; }
  // v0.8 kit quality (C3). body: tone level (and a milk-crate kick that can't reach the low end: pitch x lowPitch), sustain:
  // decays, drive: soft saturation on the kit (0 = clean), box: dB of cardboard resonance at 480 Hz, low/high: the kit's
  // band limits (Hz), send: reverb send, trim: level. Tier 2 is the v0.6.1 voice plus a little glue.
  var QUALITY = [
    { id: 'milk_crate', body: 0.6, sustain: 0.55, lowPitch: 1.3, snarePitch: 1.15, drive: 0, box: 5, low: 170, high: 6000, send: 0.55, trim: 1.1 },
    { id: 'pawn_shop', body: 0.8, sustain: 0.78, lowPitch: 1.12, snarePitch: 1.06, drive: 0.5, box: 2.5, low: 95, high: 9000, send: 0.8, trim: 1.03 },
    { id: 'pro', body: 1, sustain: 1, lowPitch: 1, snarePitch: 1, drive: 0.9, box: 0, low: 40, high: 14000, send: 1, trim: 0.97 },
    { id: 'arena', body: 1.2, sustain: 1.25, lowPitch: 0.94, snarePitch: 0.97, drive: 1.5, box: -2, low: 28, high: 18000, send: 1.3, trim: 0.92 }
  ];
  var REF_QUALITY = 2;
  A.qualityFor = function (tier) { return QUALITY[Math.max(0, Math.min(QUALITY.length - 1, tier | 0))]; };
  // The kit tier the career owns (state.gear.quality); REF_QUALITY outside a career.
  A.kitQuality = function () { var g = GG.state && GG.state.gear; return g && isFinite(g.quality) ? Math.max(0, Math.min(QUALITY.length - 1, g.quality | 0)) : REF_QUALITY; };
  var derived = {};
  // The genre kit (content/genres.js) played on kit tier `tier`: pure, cached.
  A.kitFor = function (genre, tier) {
    tier = tier == null ? A.kitQuality() : Math.max(0, Math.min(QUALITY.length - 1, tier | 0));
    var key = (genre || 'metal') + '|' + tier, b = baseKit(genre);
    if (derived[key] && derived[key].src === b) return derived[key].kit;
    var q = QUALITY[tier], k = JSON.parse(JSON.stringify(b));
    k.kick.body = (k.kick.body || 1) * q.body; k.kick.dec *= q.sustain; k.kick.f1 = (k.kick.f1 || 50) * q.lowPitch; k.kick.f0 *= Math.sqrt(q.lowPitch);
    k.snare.body *= q.body; k.snare.bodyDec *= q.sustain; k.snare.dec *= q.sustain; k.snare.f0 *= q.snarePitch; k.snare.f1 *= q.snarePitch;
    k.hat.dec *= Math.sqrt(q.sustain); k.cymbal.dec *= q.sustain; k.cymbal.lv *= Math.sqrt(q.body);
    k.tomDec = (k.tomDec || 0.36) * q.sustain; k.toms = (k.toms || DEFAULT_KIT.toms).map(function (f) { return f * Math.sqrt(q.lowPitch); });
    k.q = { tier: tier, id: q.id, body: q.body, sustain: q.sustain };
    derived[key] = { src: b, kit: k };
    return k;
  };
  function kitFor(genre, tier) { return A.kitFor(genre, tier); }
  // o: { mix: 'live' (bus gains follow the mixer) | 'static' (current mix, offline) | false (unity: the radio),
  //      verb (default true), voices, bandVoices, level, clickDest }
  function makeRig(c, dest, nz, o) {
    o = o || {};
    var r = { ctx: c, noise: nz || noiseBuffer(c), busy: [], band: [], cap: o.voices || SONG_VOICES, bandCap: o.bandVoices || BAND_VOICES,
      tom: { t: -9, i: 0 }, irs: {}, room: null, verb: null, genre: null, kit: null };
    var glue = c.createDynamicsCompressor();
    glue.threshold.value = -16; glue.knee.value = 8; glue.ratio.value = 4; glue.attack.value = 0.004; glue.release.value = 0.2;
    var limit = c.createDynamicsCompressor();   // brick-wall-ish: nothing clips on phone speakers
    limit.threshold.value = -4; limit.knee.value = 0; limit.ratio.value = 20; limit.attack.value = 0.001; limit.release.value = 0.08;
    r.out = gainNode(c, o.level || SONG_VOLUME, dest);
    glue.connect(limit); limit.connect(r.out);
    r.glue = glue;
    function bus(name) { return o.mix === 'live' ? mixNode(name, 1, glue) : gainNode(c, o.mix === false ? 1 : busGain(name), glue); }
    r.busDrums = bus('drums'); r.busBand = bus('band');
    // v0.8 kit quality chain: drive -> box resonance -> low cut -> high cut -> the drum bus (setKit tunes it per tier).
    r.qHigh = filterNode(c, 'lowpass', 14000, 0.7, r.busDrums);
    r.qLow = filterNode(c, 'highpass', 40, 0.7, r.qHigh);
    r.qBox = c.createBiquadFilter(); r.qBox.type = 'peaking'; r.qBox.frequency.value = 480; r.qBox.Q.value = 1.1; r.qBox.gain.value = 0; r.qBox.connect(r.qLow);
    r.qDrive = c.createWaveShaper(); r.qDrive.curve = satCurve(0); r.qDrive.oversample = '2x'; r.qDrive.connect(r.qBox);
    r.drums = gainNode(c, 0.8, r.qDrive);
    r.click = gainNode(c, 0.8, o.clickDest || glue);
    var shaper = c.createWaveShaper(); shaper.curve = driveCurve(18); shaper.oversample = '2x';
    shaper.connect(filterNode(c, 'lowpass', 3600, 0.9, filterNode(c, 'highpass', 90, 0.7, gainNode(c, 0.09, r.busBand))));
    r.gtr = gainNode(c, 1, shaper);
    var solo = c.createWaveShaper(); solo.curve = driveCurve(8); solo.oversample = '2x';   // Dana's lead: its own amp
    solo.connect(filterNode(c, 'lowpass', 4200, 0.8, filterNode(c, 'highpass', 300, 0.7, gainNode(c, 0.1, r.busBand))));
    r.dlead = gainNode(c, 1, solo);
    r.clean = gainNode(c, 0.5, filterNode(c, 'lowpass', 2600, 0.7, r.busBand));
    r.lead = gainNode(c, 0.3, filterNode(c, 'lowpass', 5200, 0.7, filterNode(c, 'highpass', 220, 0.7, r.busBand)));
    r.bass = gainNode(c, 0.38, filterNode(c, 'lowpass', 700, 0.8, r.busBand));
    r.vox = gainNode(c, 0.5, filterNode(c, 'highpass', 140, 0.7, r.busBand));
    r.bvox = gainNode(c, 0.36, filterNode(c, 'highpass', 170, 0.7, r.busBand));   // v0.9: the band's backing vocals
    if (o.verb !== false && c.createConvolver) {
      r.send = gainNode(c, 1, null);
      r.drumSend = gainNode(c, 0, r.send); r.busDrums.connect(r.drumSend);
      r.bandSend = gainNode(c, 0, r.send); r.busBand.connect(r.bandSend);
    }
    return r;
  }
  function setKit(r, genre, tier) {
    genre = genre || 'metal';
    tier = tier == null ? A.kitQuality() : Math.max(0, Math.min(QUALITY.length - 1, tier | 0));
    if (r.genre === genre && r.kit && r.tier === tier) return;
    r.genre = genre; r.tier = tier; r.kit = kitFor(genre, tier);
    var t = r.ctx.currentTime, k = r.kit, q = QUALITY[tier];
    r.drums.gain.setValueAtTime(0.8 * (k.level || 1) * q.trim, t);
    r.qDrive.curve = satCurve(q.drive);
    r.qBox.gain.setValueAtTime(q.box, t); r.qLow.frequency.setValueAtTime(q.low, t); r.qHigh.frequency.setValueAtTime(q.high, t);
    var send = 0.35 + 0.65 * (k.verb || 0);   // the room always speaks; the kit decides how much (rock lots, country little)
    if (r.send) { r.drumSend.gain.setValueAtTime(send * q.send, t); r.bandSend.gain.setValueAtTime(send * 0.45, t); }
  }
  // Swap the room: a fresh convolver fades in, the old tail rings out.
  function setRoom(r, cls) {
    if (!r.send || !ROOMS[cls] || r.room === cls) return;
    var c = r.ctx, t = c.currentTime, old = r.verb, conv = c.createConvolver();
    conv.buffer = r.irs[cls] || (r.irs[cls] = impulse(c, cls));
    var wet = gainNode(c, old ? 0 : ROOMS[cls].wet, r.glue);
    conv.connect(wet); r.send.connect(conv);
    if (old) {
      wet.gain.setValueAtTime(0, t); wet.gain.linearRampToValueAtTime(ROOMS[cls].wet, t + 0.3);
      try { r.send.disconnect(old.conv); } catch (e) { /* ignore */ }
      old.wet.gain.setTargetAtTime(0, t, 0.3);
      setTimeout(function () { try { old.wet.disconnect(); old.conv.disconnect(); } catch (e) { /* ignore */ } }, 4000);
    }
    r.verb = { conv: conv, wet: wet }; r.room = cls;
  }
  // v0.7.2 metal amp, built on a rig the first time metal plays on it. Two rhythm guitars, Jaxon left and Dana right
  // (double-tracked: every riff is played twice, a few cents and milliseconds apart), each through its own chain:
  //   open | palm-mute input (low-passed: the chunk) -> pre-EQ (tight low cut, mid push) -> asymmetric clipper (4x
  //   oversampling) -> cab sim (80 Hz high-pass, low thump, mid scoop, presence, two low-passes near 5.5 kHz) -> pan.
  // The bass: one saw split into a clean sub (low-passed) and a driven grind layer. Metal vocals get a fuller channel with
  // a presence lift, and the guitars' presence band dips (carve, dB) while a growl or scream sings, so it cuts through.
  // Tuned by numbers (tests/pw_seq audio): the mids match v0.7.1, the sub and the grind are up, the limiter holds peaks.
  var AMP = { gain: 26, level: 0.13, pan: 0.72, preHp: 110, bassSub: 0.3, bassGrind: 0.14, vox: 0.24, carve: -6 };
  function metalRig(r) {
    if (r.metal) return r.metal;
    var c = r.ctx, M = r.metal = { open: [], mute: [], pres: [] };
    [-AMP.pan, AMP.pan].forEach(function (pan, side) {
      M.pres[side] = eqNode(c, 'peaking', 2600, 1.2, 3, filterNode(c, 'lowpass', 5400, 0.9, filterNode(c, 'lowpass', 6800, 0.6,
        gainNode(c, AMP.level, panNode(c, pan, r.busBand)))));
      var cab = eqNode(c, 'lowshelf', 140, 0.7, 3, eqNode(c, 'peaking', 520, 1, -5, M.pres[side]));
      var sh = c.createWaveShaper(); sh.curve = asymCurve(AMP.gain); sh.oversample = '4x';
      sh.connect(filterNode(c, 'highpass', 78, 0.7, cab));
      var pre = filterNode(c, 'highpass', AMP.preHp, 0.6, eqNode(c, 'peaking', 900, 0.7, 7, sh));
      M.open[side] = gainNode(c, 1, pre);
      M.mute[side] = gainNode(c, 1.25, filterNode(c, 'lowpass', 480, 1.1, pre));
    });
    var sub = filterNode(c, 'highpass', 30, 0.7, filterNode(c, 'lowpass', 150, 0.8, gainNode(c, AMP.bassSub, r.busBand)));
    var gsh = c.createWaveShaper(); gsh.curve = asymCurve(6); gsh.oversample = '2x';
    gsh.connect(filterNode(c, 'lowpass', 2200, 0.8, eqNode(c, 'peaking', 1000, 1, 4, gainNode(c, AMP.bassGrind, r.busBand))));
    M.bass = gainNode(c, 1, null); M.bass.connect(sub); M.bass.connect(filterNode(c, 'highpass', 260, 0.7, gsh));
    M.vox = gainNode(c, AMP.vox, filterNode(c, 'highpass', 60, 0.7, eqNode(c, 'peaking', 2400, 0.8, 7, r.busBand)));
    return M;
  }
  // The metal inputs of a playback port (made on first use; closePort() silences them with the rest).
  function metalPort(r, p) {
    if (!p.mOpenL) {
      var M = metalRig(r), c = r.ctx;
      p.mOpenL = gainNode(c, 1, M.open[0]); p.mOpenR = gainNode(c, 1, M.open[1]);
      p.mMuteL = gainNode(c, 1, M.mute[0]); p.mMuteR = gainNode(c, 1, M.mute[1]);
      p.mBass = gainNode(c, 1, M.bass); p.mVox = gainNode(c, 1, M.vox);
    }
    return p;
  }
  // A power chord in one oscillator: a wave at half the root whose even harmonics are the root's saw, the multiples of 3
  // the fifth's and the multiples of 4 the octave's (just intonation). Half the sources of two oscillators.
  function powerWave(r) {
    if (r.pwave) return r.pwave;
    var N = 96, re = new Float32Array(N), im = new Float32Array(N);
    for (var n = 1; n < N; n++) im[n] = (n % 2 ? 0 : 2 / n) + (n % 3 ? 0 : 0.85 * 3 / n) + (n % 4 ? 0 : 0.35 * 4 / n);
    return (r.pwave = r.ctx.createPeriodicWave(re, im));
  }
  // v0.9 genre amps (content backing.amp / fiddle / acoustic), built on a rig the first time that genre plays on it (a
  // metal career never builds them; a punk career never builds the metal amp).
  //   punk + rock: two guitars double-tracked (L + R, a few cents and ms apart), each: pre high-pass -> mid push -> soft
  //     clipper (far less gain than metal) -> cab (high-pass, presence, low-pass) -> pan; a palm-mute input (low-passed).
  //     Rock's open chords (and ballad arpeggios) ring through a low-gain path, wide (a Haas-delayed right side).
  //   country: Earl's clean Tele (bright, a hair of drive) + slapback (a short delay with a little feedback, panned across);
  //     Clementine's fiddle through body formants (+ bow noise per note); the acoustic through its body + sparkle, the
  //     strings spread L/R.
  function ampRig(r, genre) {
    r.amps = r.amps || {};
    if (r.amps[genre]) return r.amps[genre];
    var c = r.ctx, B = GG.songs.genre(genre).backing || {}, a = B.amp || {}, M = r.amps[genre] = { open: [], mute: [] };
    if (genre === 'country') {
      var br = a.bright || [2800, 1.2, 6], dry = gainNode(c, a.level || 0.2, panNode(c, a.pan || 0.3, r.busBand));
      var delay = c.createDelay(1); delay.delayTime.value = a.slap || 0.11;
      var fb = gainNode(c, a.slapFb || 0.18, delay);
      delay.connect(fb); delay.connect(gainNode(c, (a.level || 0.2) * (a.slapLv || 0.5), panNode(c, a.slapPan || -0.35, r.busBand)));
      var tw = filterNode(c, 'lowpass', a.lp || 7000, 0.7, null); tw.connect(dry); tw.connect(delay);
      var tsh = c.createWaveShaper(); tsh.curve = driveCurve(a.gain || 1.6); tsh.connect(tw);
      M.twang = filterNode(c, 'highpass', 120, 0.7, eqNode(c, 'peaking', br[0], br[1], br[2], tsh));
      M.slap = delay;
      var F = B.fiddle || {}, fout = filterNode(c, 'lowpass', 6500, 0.7, gainNode(c, 0.5, panNode(c, F.pan || -0.35, r.busBand)));
      M.fiddle = gainNode(c, 1, null);
      (F.body || [[290, 4, 1.3], [520, 3.5, 1], [1150, 3, 0.8], [2700, 2.5, 0.55]]).forEach(function (b) { M.fiddle.connect(filterNode(c, 'bandpass', b[0], b[1], gainNode(c, b[2], fout))); });
      M.fiddle.connect(gainNode(c, 0.12, fout));
      var K = B.acoustic || {}, body = K.body || [110, 1.2, 6], sp = K.sparkle || [3600, 0.8, 4];
      M.acoustic = [-1, 1].map(function (side) {
        return eqNode(c, 'peaking', body[0], body[1], body[2], eqNode(c, 'highshelf', sp[0], sp[1], sp[2], filterNode(c, 'highpass', 70, 0.7,
          gainNode(c, K.level || 0.42, panNode(c, side * (K.spread || 0.35), r.busBand)))));
      });
      return M;
    }
    var mid = a.mid || [1000, 0.9, 4], pres = a.presence || [3000, 1, 2];
    [-(a.pan || 0.6), a.pan || 0.6].forEach(function (pan, side) {
      var cab = filterNode(c, 'highpass', 85, 0.7, eqNode(c, 'peaking', pres[0], pres[1], pres[2], filterNode(c, 'lowpass', a.lp || 5200, 0.8,
        gainNode(c, a.level || 0.09, panNode(c, pan, r.busBand)))));
      var sh = c.createWaveShaper(); sh.curve = driveCurve(a.gain || 8); sh.oversample = '2x'; sh.connect(cab);
      var pre = filterNode(c, 'highpass', a.preHp || 100, 0.6, eqNode(c, 'peaking', mid[0], mid[1], mid[2], sh));
      M.open[side] = gainNode(c, 1, pre);
      M.mute[side] = gainNode(c, 1.2, filterNode(c, 'lowpass', 650, 1.1, pre));
    });
    var ring = gainNode(c, a.ring || 0.15, null), rsh = c.createWaveShaper(); rsh.curve = driveCurve(2.5);
    var hz = c.createDelay(0.1); hz.delayTime.value = 0.014;
    ring.connect(panNode(c, -0.4, r.busBand)); ring.connect(hz); hz.connect(panNode(c, 0.4, r.busBand));
    rsh.connect(filterNode(c, 'lowpass', 5000, 0.7, filterNode(c, 'highpass', 110, 0.7, ring)));
    M.ring = rsh;
    return M;
  }
  function ampPort(r, p, genre) {
    if (p.aGenre !== genre) {
      var M = ampRig(r, genre), c = r.ctx; p.aGenre = genre;
      if (genre === 'country') { p.aTwang = gainNode(c, 1, M.twang); p.aFid = gainNode(c, 1, M.fiddle); p.aAcL = gainNode(c, 1, M.acoustic[0]); p.aAcR = gainNode(c, 1, M.acoustic[1]); }
      else { p.aOpenL = gainNode(c, 1, M.open[0]); p.aOpenR = gainNode(c, 1, M.open[1]); p.aMuteL = gainNode(c, 1, M.mute[0]); p.aMuteR = gainNode(c, 1, M.mute[1]); p.aRing = gainNode(c, 1, M.ring); }
    }
    return p;
  }
  // An acoustic string: bright (1/n^1.1) with a strong octave (the 12-string shimmer), one oscillator.
  function acousticWave(r) {
    if (r.awave) return r.awave;
    var N = 40, re = new Float32Array(N), im = new Float32Array(N);
    for (var n = 1; n < N; n++) im[n] = Math.pow(n, -1.1) * (n === 2 ? 1.8 : n === 4 ? 1.2 : 1);
    return (r.awave = r.ctx.createPeriodicWave(re, im));
  }
  // v0.9 non-metal band notes through the genre amps. true = played (or dropped against the cap); false = the old path.
  function ampNote(r, p, ev, t, spb) {
    var g = r.genre, c = r.ctx, dur = Math.max(0.03, Math.min(ev.len, ev.gap) * spb), f = mtof(ev.midi), o, e, k;
    if (g === 'country') {
      if (ev.kind === 'twang') {   // Earl's Tele: a pluck (filter closing), bent into, slapback on the amp
        if (!book(r, t, dur, 1, true)) return true;
        ampPort(r, p, g);
        var lp = filterNode(c, 'lowpass', 5200, 1.4, ev.mute ? gate(c, t, 0.002, 0.8, Math.min(dur, 0.09), 0.3, p.aTwang) : decay(c, t, 0.003, 0.85, dur, p.aTwang));
        lp.frequency.setValueAtTime(5200, t); lp.frequency.exponentialRampToValueAtTime(1600, t + Math.min(dur, 0.5));
        o = c.createOscillator(); o.type = 'sawtooth';
        if (ev.bend || ev.slide) { o.frequency.setValueAtTime(f * Math.pow(2, -(ev.bend || 1) / 12), t); o.frequency.exponentialRampToValueAtTime(f, t + Math.min(0.09, dur * 0.4)); }
        else o.frequency.setValueAtTime(f, t);
        o.connect(lp); run(r, o, t, dur);
        return true;
      }
      if (ev.kind === 'fiddle') {   // bowed: a slow bow attack, vibrato once the note settles, bow noise, body formants
        var n = fits(r, t, 2) ? 2 : 1, F = (GG.songs.genre(g).backing || {}).fiddle || {}, vb = F.vib || [5.6, 0.009];   // bow noise only when there's room
        if (!book(r, t, dur, n, true)) return true;
        ampPort(r, p, g);
        e = held(c, t, ev.ring ? 0.4 : 0.5, dur, p.aFid, Math.min(0.06, dur * 0.3));
        o = c.createOscillator(); o.type = 'sawtooth';
        if (dur > 0.2) o.frequency.setValueCurveAtTime(vibrato(f, dur, vb[0], vb[1]), t, dur);
        else if (ev.slide) { o.frequency.setValueAtTime(f * 0.94, t); o.frequency.exponentialRampToValueAtTime(f, t + Math.min(0.08, dur * 0.5)); }
        else o.frequency.setValueAtTime(f, t);
        o.connect(e); run(r, o, t, dur);
        if (n > 1) {
          var bn = c.createBufferSource(); bn.buffer = r.noise; bn.loop = true;
          bn.connect(filterNode(c, 'bandpass', Math.min(6000, f * 3), 0.9, gainNode(c, F.bow || 0.22, e)));
          run(r, bn, t, dur);
        }
        return true;
      }
      if (ev.strum) {   // a fuller acoustic strum: brighter strings, the body, spread L/R; upstrokes run the other way
        if (!book(r, t, dur, ev.strum.length, true)) return true;
        ampPort(r, p, g);
        var w = acousticWave(r), m = ev.strum.length;
        for (k = 0; k < m; k++) {
          var st = ev.up ? m - 1 - k : k, tk = t + k * 0.011, dk = Math.max(0.02, dur - k * 0.011);
          o = c.createOscillator(); o.setPeriodicWave(w); o.frequency.value = mtof(ev.midi + ev.strum[st]); o.detune.value = (st % 2 ? 3 : -3);
          o.connect(decay(c, tk, 0.002, ev.ring ? 0.3 : 0.26, dk, st % 2 ? p.aAcR : p.aAcL)); run(r, o, tk, dk);
        }
        return true;
      }
      return false;
    }
    if (g !== 'punk' && g !== 'rock') return false;
    var a = (GG.songs.genre(g).backing || {}).amp || {};
    if (ev.kind === 'gtr2' || ev.kind === 'clean') {   // rock's open chords ring (and the ballad's arpeggios)
      if (!book(r, t, dur, 1, true)) return true;
      ampPort(r, p, g);
      o = c.createOscillator();
      if (ev.power) { o.setPeriodicWave(powerWave(r)); o.frequency.value = f / 2; } else { o.type = 'triangle'; o.frequency.value = f; }
      o.connect(decay(c, t, 0.004, ev.kind === 'clean' ? 0.5 : 0.42, dur, p.aRing)); run(r, o, t, dur);
      return true;
    }
    if (ev.kind !== 'gtr') return false;
    if (!book(r, t, dur, 2, true)) return true;   // L + R (a power chord is one oscillator per side)
    ampPort(r, p, g);
    var wave = ev.power ? powerWave(r) : null, base = wave ? f / 2 : f, h = (ev.midi * 7 + Math.round(ev.beat * 4)) % 5, dt = a.detune || 5;
    for (var side = 0; side < 2; side++) {
      var tt = t + (side ? (a.lag || 0.008) + 0.002 * h / 4 : 0), dd = Math.max(0.02, dur - (tt - t));
      o = c.createOscillator();
      if (wave) o.setPeriodicWave(wave); else o.type = 'sawtooth';
      o.detune.value = side ? dt + h : -dt - h;
      o.frequency.setValueAtTime(base * 1.006, tt); o.frequency.exponentialRampToValueAtTime(base, tt + 0.02);   // pick bloom
      if (ev.mute) e = gate(c, tt, 0.0015, 0.7, dd, 0.4, side ? p.aMuteR : p.aMuteL);
      else if (ev.trem) e = gate(c, tt, 0.002, 0.55, dd * 0.9, 0.7, side ? p.aOpenR : p.aOpenL);
      else if (ev.ring) e = decay(c, tt, 0.003, 0.6, dd, side ? p.aOpenR : p.aOpenL);
      else e = held(c, tt, 0.5, dd, side ? p.aOpenR : p.aOpenL, 0.003);
      o.connect(e); run(r, o, tt, dd);
    }
    return true;
  }
  // Per-playback inputs into the rig; stop() ramps them to silence and disconnects them.
  var PORTS = ['drums', 'gtr', 'dlead', 'clean', 'lead', 'bass', 'vox', 'bvox'];
  function makePort(r) {
    var p = {};
    PORTS.forEach(function (k) { p[k] = gainNode(r.ctx, 1, r[k]); });
    return p;
  }
  function closePort(r, port) {
    var t = r.ctx.currentTime;
    Object.keys(port).forEach(function (k) {
      if (!port[k] || !port[k].gain) return;   // (v0.9: a port also notes which genre amp it feeds)
      port[k].gain.cancelScheduledValues(t); port[k].gain.setTargetAtTime(0, t, 0.015);
      setTimeout(function () { try { port[k].disconnect(); } catch (e) { /* ignore */ } }, 300);
    });
  }
  // Books `n` sources from t to t + dur against the voice cap (band notes also against the band's share).
  // false = no room (the hit is dropped).
  function book(r, t, dur, n, band) {
    var t1 = t + 1e-4;   // a note that ends as the next one starts (float rounding) frees its voice in time
    r.busy = r.busy.filter(function (end) { return end > t1; });
    if (band) { r.band = r.band.filter(function (end) { return end > t1; }); if (r.band.length + n > r.bandCap) { counts.dropped++; return false; } }
    if (r.busy.length + n > r.cap) { counts.dropped++; return false; }
    for (var i = 0; i < n; i++) { r.busy.push(t + dur); if (band) r.band.push(t + dur); }
    return true;
  }
  function fits(r, t, n) {   // would book(r, t, .., n, band) succeed? (nothing booked, nothing counted)
    var t1 = t + 1e-4, live = function (end) { return end > t1; };
    return r.band.filter(live).length + n <= r.bandCap && r.busy.filter(live).length + n <= r.cap;
  }
  function run(r, node, t, dur) { node.start(t); node.stop(t + dur); if (r.collect) r.collect.push(node); }
  // Envelope gain: attack to peak, then an exponential decay to silence at t + dur (a choke shortens dur).
  function decay(c, t, attack, peak, dur, dest) {
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, attack + 0.01));
    g.connect(dest);
    return g;
  }
  // Held note: attack, a gentle sag, then a short release that ends at t + dur.
  function held(c, t, peak, dur, dest, attack) {
    attack = attack || 0.006;
    var g = c.createGain(), end = Math.max(dur, attack + 0.03), rel = Math.min(0.05, end * 0.3);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.linearRampToValueAtTime(peak * 0.7, t + Math.max(attack + 0.005, end - rel));
    g.gain.exponentialRampToValueAtTime(0.0001, t + end);
    g.connect(dest);
    return g;
  }
  function osc(r, type, f0, f1, glide, t, dur, gain, detune) {
    var o = r.ctx.createOscillator();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + glide);
    if (detune) o.detune.value = detune;
    o.connect(gain); run(r, o, t, dur);
    return o;
  }
  function noiseHit(r, t, dur, gain, type, f, q, f1) {
    var s = r.ctx.createBufferSource(); s.buffer = r.noise;
    var fl = filterNode(r.ctx, type, f, q, gain);
    if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
    s.connect(fl); run(r, s, t, dur);
  }
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  // Frequency curves (no extra oscillator): vibrato for fiddles and singing, jitter for growls.
  function vibrato(f, dur, rate, depth) {
    var n = Math.max(2, Math.ceil(dur * 120)), a = new Float32Array(n);
    for (var i = 0; i < n; i++) { var tt = i / 120, w = Math.min(1, tt / 0.15); a[i] = f * (1 + depth * w * Math.sin(2 * Math.PI * rate * tt)); }
    return a;
  }
  function jitter(f, dur, amt, seed) {
    var n = Math.max(2, Math.ceil(dur * 70)), a = new Float32Array(n), s = (seed % 2147483646) + 1;
    for (var i = 0; i < n; i++) { s = lcg(s); a[i] = f * (1 + amt * (s / 1073741823.5 - 1)) * (1 - 0.1 * i / n); }
    return a;
  }

  // Drum voices: { n: sources, len(kit, variant): natural length, play(rig, port, time, d, kit, variant) } where d is
  // the natural length cut short (choked) by the next hit of the same lane. Tuning per genre: content/genres.js `kit`.
  // Variants: snare 'rim' | 'brush' | 'ghost' (country train beat), toms 0..2 (high, mid, floor).
  var DRUMS = {
    kick: { n: 2, len: function (k) { return k.kick.dec; }, play: function (r, p, t, d, k) {
      var c = r.ctx, K = k.kick, cl = Math.min(K.clickLen || 0.018, d);
      osc(r, 'sine', K.f0, K.f1, K.glide, t, d, decay(c, t, 0.002, K.body, d, p.drums));
      noiseHit(r, t, cl, decay(c, t, 0.001, K.click, cl, p.drums), 'highpass', K.clickHp || 2600, 0.7);
    } },
    snare: { n: function (k, v) { return v === 'brush' ? 1 : 2; },
      len: function (k, v) { return v === 'rim' ? 0.05 : v === 'brush' ? 0.2 : k.snare.dec; },
      play: function (r, p, t, d, k, v) {
        var c = r.ctx, S = k.snare, b;
        if (v === 'rim') {   // cross-stick: a woody click
          b = Math.min(0.035, d);
          osc(r, 'triangle', 1750, 1450, 0.02, t, b, decay(c, t, 0.001, 0.5, b, p.drums));
          noiseHit(r, t, b, decay(c, t, 0.001, 0.4, b, p.drums), 'bandpass', 3400, 2.2);
          return;
        }
        if (v === 'brush') { noiseHit(r, t, d, decay(c, t, 0.02, 0.32, d, p.drums), 'bandpass', 4200, 0.7, 2600); return; }
        var lv = v === 'ghost' ? 0.4 : 1; b = Math.min(S.bodyDec, d);
        osc(r, 'triangle', S.f0, S.f1, 0.06, t, b, decay(c, t, 0.001, S.body * lv, b, p.drums));
        noiseHit(r, t, d, decay(c, t, 0.001, S.noise * lv, d, p.drums), 'highpass', S.hp, 0.8);
      } },
    hat: { n: 1, len: function (k) { return k.hat.dec; }, play: function (r, p, t, d, k) {
      noiseHit(r, t, d, decay(r.ctx, t, 0.001, k.hat.lv, d, p.drums), 'highpass', k.hat.hp, 0.9);
    } },
    cymbal: { n: 2, len: function (k) { return k.cymbal.dec; }, play: function (r, p, t, d, k) {
      var Y = k.cymbal, s = Math.min(d, Y.dec * 0.5);
      noiseHit(r, t, d, decay(r.ctx, t, 0.002, Y.lv, d, p.drums), 'highpass', Y.hp, 0.6, Y.f1);
      noiseHit(r, t, s, decay(r.ctx, t, 0.004, Y.lv * 0.35, s, p.drums), 'bandpass', 5200, 3);   // shimmer
    } },
    toms: { n: 1, len: function (k) { return k.tomDec || 0.36; }, play: function (r, p, t, d, k, v) {
      var f = (k.toms || DEFAULT_KIT.toms)[v || 0] || 200;
      osc(r, 'sine', f, f * 0.55, 0.2, t, d, decay(r.ctx, t, 0.002, 0.85 * Math.min(1.1, k.q ? k.q.body : 1), d, p.drums));
    } },
    ride: { n: 2, len: function (k) { return (k.six === 'china' ? 0.9 : 0.5) * (k.q ? k.q.sustain : 1); }, play: function (r, p, t, d, k) {
      var c = r.ctx;
      if (k.six === 'china') {   // trashy: mid-heavy noise and an inharmonic clang
        noiseHit(r, t, d, decay(c, t, 0.001, 0.36, d, p.drums), 'bandpass', 3300, 0.7, 2200);
        osc(r, 'square', 587, 0, 0, t, Math.min(0.25, d), decay(c, t, 0.001, 0.05, Math.min(0.25, d), p.drums));
        return;
      }
      noiseHit(r, t, d, decay(c, t, 0.001, 0.2, d, p.drums), 'bandpass', 6400, 1.4);   // ride: a pinging bell
      osc(r, 'triangle', 1180, 0, 0, t, d, decay(c, t, 0.001, 0.07, d, p.drums));
    } }
  };
  function drumHit(r, p, lane, t, cap, v) {
    var D = DRUMS[lane]; if (!D) return false;
    var k = r.kit || DEFAULT_KIT, n = typeof D.n === 'function' ? D.n(k, v) : D.n;
    var d = Math.max(0.012, Math.min(D.len(k, v), cap));
    if (!book(r, t, d, n)) return null;
    D.play(r, p, t, d, k, v);
    return { t: t, end: t + d, n: n };   // the booking (live taps cut it off at the lane's next tap)
  }
  // Country train beat: rim clicks on the backbeat in verses, brushes (or ghost notes) in between.
  function snareVariant(step, role) {
    if (step % 8 === 4) return role === 'sparse' ? 'rim' : undefined;
    return P().brushes ? 'brush' : 'ghost';
  }

  /* ---- Vocal hits: a sawtooth (or a gang of two) through a 3-formant bank, pitched to the song's key ---------- */
  // v0.9: + ae (cat), oe (French 'peur'), ue (French 'tu'); the consonant targets words glide through (nasals quieter).
  var VOWELS = { a: [730, 1090, 2440], e: [530, 1840, 2480], i: [270, 2290, 3010], o: [570, 840, 2410], u: [300, 870, 2240],
    ae: [660, 1720, 2410], oe: [480, 1560, 2380], ue: [260, 1800, 2200] };
  var GLIDES = { l: [[360, 1300, 2700], 0.8], r: [[420, 1250, 1650], 0.8], w: [[300, 700, 2200], 0.7], y: [[270, 2250, 2950], 0.7],
    n: [[250, 1400, 2500], 0.3], m: [[250, 1000, 2300], 0.3] };
  // Noise consonants: [seconds, filter Hz, Q, level, 'h' goes through the vowel's formants].
  var NOISY = { h: [0.05, 1500, 0.5, 0.7, true], p: [0.022, 1100, 0.8, 1], b: [0.018, 900, 0.8, 0.5], t: [0.024, 4200, 0.9, 1], d: [0.018, 3200, 0.9, 0.5],
    k: [0.026, 2200, 1.2, 1], g: [0.02, 1900, 1.2, 0.5], s: [0.075, 6200, 0.9, 0.8], z: [0.06, 5200, 0.9, 0.45], f: [0.06, 7200, 0.5, 0.6], v: [0.05, 6000, 0.5, 0.35] };
  var PLOSIVE = { p: 1, b: 1, t: 1, d: 1, k: 1, g: 1 };
  // voc types. v0.9: yell (a hoarse punk yell), wail ('80s rock, vibrato), holler (country, the yodel flip), whoa (backing
  // whoa-ohs with a harmony), and the scream family for metalVox (shift: semitones before the key snaps it back in).
  var VOX = {
    hey: { vw: ['e', 'e'], len: 0.3, steps: 2, breath: 0.05, bend: -3, peak: 0.9 },
    shout: { vw: ['a', 'o'], len: 0.5, steps: 4, breath: 0.04, bend: -4, peak: 0.85, drive: 3 },
    growl: { len: 1.0, steps: 8, peak: 1.8, metal: 'growl' },     // v0.7.2: metalVox
    scream: { len: 0.55, steps: 4, peak: 1.1, metal: 'scream' },  // v0.7.2: metalVox
    yeah: { vw: ['e', 'a'], len: 0.6, steps: 4, bend: -1, peak: 0.7, vib: 0.012 },
    yeehaw: { vw: ['i', 'a'], len: 0.8, steps: 6, yodel: true, peak: 0.75 },
    ooh: { vw: ['u', 'o'], len: 1.0, steps: 8, peak: 0.6, vib: 0.01 },
    yell: { vw: ['a', 'e'], len: 1.3, steps: 8, breath: 0.05, bend: -2, peak: 0.8, drive: 6, rough: 0.012 },
    wail: { vw: ['e', 'a'], len: 1.5, steps: 8, bend: 0, peak: 0.72, vib: 0.03, scoop: -3 },
    holler: { vw: ['o', 'a'], len: 1.3, steps: 8, yodel: true, peak: 0.7 },
    whoa: { vw: ['u', 'o'], len: 1.4, steps: 6, peak: 0.42, vib: 0.01 },
    shriek: { len: 0.55, steps: 4, peak: 1.0, metal: 'shriek', shift: 5 },
    squeal: { len: 0.45, steps: 2, peak: 0.95, metal: 'squeal', shift: 7 },
    gang: { len: 0.55, steps: 4, peak: 1.1, metal: 'scream', gang: true },
    held: { len: 1.7, steps: 8, peak: 1.05, metal: 'scream', hold: true },
    shriekHeld: { len: 1.7, steps: 8, peak: 0.95, metal: 'shriek', shift: 5, hold: true },
    fry: { len: 0.8, steps: 4, peak: 1.4, metal: 'fry' },
    guttural: { len: 1.0, steps: 8, peak: 1.9, metal: 'guttural', shift: -5 }
  };
  // The scream family / the growl family (tests, the heavy metrics): every metal vocal type is one or the other.
  var FAMILY = { scream: 'scream', shriek: 'scream', squeal: 'scream', gang: 'scream', held: 'scream', shriekHeld: 'scream', growl: 'growl', guttural: 'growl', fry: 'growl' };
  A.vocFamily = function (voc) { return FAMILY[voc] || voc; };
  // v0.7.2 metal vocals, still on the beat grid and pitched to the song (the timeline puts them there):
  //   growl (breakdowns): a jittered buzz + a subharmonic an octave down + low formant noise, rattled (false-cord flutter),
  //     driven hard, through wide low formants ('o' -> 'u') plus a chest path, falling a tone at the end.
  //   scream (chorus downbeats): a buzz scooped up into the note (+ a double a few cents off) + bright rasp noise, driven,
  //     through high open formants ('a' -> 'e').
  //   v0.9 (owner: "more scream types"): shriek (high, thin, bright formants), squeal (a pig squeal: a narrow formant
  //     sweeping 'ee' -> 'oo' fast, the pitch dropping), fry (vocal fry: a crackling pulse two octaves down), guttural
  //     (deeper than the growl: a bigger throat, more rattle). fs scales a word's vowel formants into the type's range;
  //     sub = the growl's square subharmonic + chest; oct = octaves the buzz sits under the note.
  var MVOX = {
    growl: { f: [[460, 780, 2450], [340, 640, 2300]], q: [3, 5, 8], lv: [2.4, 2.2, 1.6], drive: 9, rattle: [34, 0.55], noise: ['bandpass', 1300, 0.6, 1.4], jit: 0.05, scoop: 0, fall: -2, fs: 0.8, sub: true },
    scream: { f: [[920, 1450, 2950], [640, 1950, 3100]], q: [3.5, 5, 7], lv: [3.6, 2.8, 1.8], drive: 14, rattle: [47, 0.3], noise: ['highpass', 1700, 0.7, 0.7], jit: 0.035, scoop: -3, fall: -1, fs: 1.25 },
    shriek: { f: [[1250, 1900, 3300], [1000, 2300, 3500]], q: [4, 6, 8], lv: [3.3, 2.7, 1.9], drive: 16, rattle: [58, 0.25], noise: ['highpass', 2600, 0.8, 0.75], jit: 0.03, scoop: -5, fall: -2, fs: 1.5 },
    squeal: { f: [[320, 2300, 3000], [340, 820, 2350]], q: [6, 9, 10], lv: [3.6, 3.4, 1.7], drive: 11, rattle: [70, 0.2], noise: ['bandpass', 2200, 1.5, 0.9], jit: 0.02, scoop: 2, fall: -5, fs: 1, sweep: 0.35, noWord: true },
    fry: { f: [[700, 1200, 2600], [560, 1100, 2500]], q: [3, 4, 6], lv: [3, 2.4, 1.6], drive: 7, rattle: [22, 0.8], noise: ['bandpass', 1800, 0.8, 1], jit: 0.08, scoop: 0, fall: -1, fs: 0.95, oct: 2 },
    guttural: { f: [[380, 640, 2200], [300, 560, 2100]], q: [3, 5, 8], lv: [2.6, 2.3, 1.4], drive: 11, rattle: [27, 0.65], noise: ['bandpass', 900, 0.6, 1.5], jit: 0.06, scoop: 0, fall: -3, fs: 0.72, sub: true }
  };
  // v0.9 words: phonemes (content voices.lex) -> an articulation plan over `dur` seconds: formant targets [t, [F1..3], amp]
  // (vowels share the time left after the consonants; glides and nasals are short targets) and noise bursts [t, len, Hz,
  // Q, level, viaFormants]. swaps: the singer's vowel swaps (Marcel's front-rounded French vowels). Pure; cached.
  var plans = {};
  function lexOf(word) { var L = (GG.content && GG.content.voices && GG.content.voices.lex) || {}; return L[word] || String(word || '').toLowerCase().replace(/[^a-z]/g, '').split('').join(' '); }
  function wordPlan(word, dur, swaps) {
    var key = word + '|' + dur.toFixed(3) + '|' + JSON.stringify(swaps || 0);
    if (plans[key]) return plans[key];
    var ph = lexOf(word).split(/\s+/).filter(Boolean), cons = 0, nv = 0, i;
    ph.forEach(function (x) { if (VOWELS[x]) nv++; else cons += NOISY[x] ? NOISY[x][0] : GLIDES[x] ? 0.045 : 0; });
    var k = cons > dur * 0.45 ? dur * 0.45 / cons : 1, vd = nv ? (dur - cons * k) / nv : 0, t = 0, pts = [], bursts = [], last = null;
    for (i = 0; i < ph.length; i++) {
      var x = ph[i];
      if (VOWELS[x]) {
        var v = VOWELS[(swaps && swaps[x]) || x] || VOWELS[x];
        pts.push([t, v, 1]); pts.push([t + vd * 0.65, v, 1]); t += vd; last = v;
      } else if (GLIDES[x]) {
        pts.push([t, GLIDES[x][0], GLIDES[x][1]]); t += 0.045 * k;
      } else if (NOISY[x]) {
        var N = NOISY[x], d = N[0] * k;
        bursts.push([t, d, N[1], N[2], N[3], !!N[4]]);
        if (PLOSIVE[x]) pts.push([t, last || VOWELS.a, 0.05]);
        t += d;
      }
    }
    if (!pts.length) pts.push([0, VOWELS.a, 1]);
    if (pts[0][0] > 0) pts.unshift([0, pts[0][1], pts[0][2] * 0.5]);
    return (plans[key] = { pts: pts, bursts: bursts });
  }
  // Glide filters `bank` (3 bandpasses) and an amp gain along a word plan starting at t (formants x scale).
  function articulate(bank, amp, plan, t, scale) {
    bank.forEach(function (bp, k) {
      plan.pts.forEach(function (q, n) { var f = Math.max(80, Math.min(9000, q[1][k] * scale)); if (!n) bp.frequency.setValueAtTime(f, t + q[0]); else bp.frequency.linearRampToValueAtTime(f, t + q[0]); });
    });
    if (amp) plan.pts.forEach(function (q, n) { if (!n) amp.gain.setValueAtTime(q[2], t + q[0]); else amp.gain.linearRampToValueAtTime(q[2], t + q[0]); });
  }
  // A pitch curve for a sung hit (120 points/s): a scoop up into the note, a bend over the note, vibrato after 0.15 s,
  // a little jitter (rasp). semitones, depth as a fraction.
  function voxCurve(f, dur, scoop, bend, vib, jit, seed) {
    var n = Math.max(2, Math.ceil(dur * 120)), a = new Float32Array(n), s = (seed % 2147483646) + 1;
    for (var i = 0; i < n; i++) {
      var tt = i / 120, u = i / (n - 1), w = Math.min(1, tt / 0.15), semis = (scoop || 0) * Math.max(0, 1 - tt / 0.08) + (bend || 0) * u;
      s = lcg(s);
      a[i] = f * Math.pow(2, semis / 12) * (1 + (vib ? vib[1] * w * Math.sin(2 * Math.PI * vib[0] * tt) : 0)) * (1 + (jit || 0) * (s / 1073741823.5 - 1));
    }
    return a;
  }
  // A gain curve of irregular dips at ~rate Hz (depth 0..1): the growl's rattle, the scream's grit.
  function rattle(dur, rate, depth, seed) {
    var n = Math.max(2, Math.ceil(dur * 480)), a = new Float32Array(n), s = (seed % 2147483646) + 1, ph = 0;
    for (var i = 0; i < n; i++) {
      s = lcg(s); ph += rate * (0.8 + 0.4 * s / 2147483647) / 480;
      a[i] = 1 - depth * (0.5 + 0.5 * Math.sin(2 * Math.PI * ph));
    }
    return a;
  }
  // Pitch curve: scoop up from `scoop` semitones, jitter, and fall `fall` semitones over the last 30%.
  function contour(f, dur, scoop, fall, amt, seed) {
    var n = Math.max(2, Math.ceil(dur * 90)), a = new Float32Array(n), s = (seed % 2147483646) + 1;
    for (var i = 0; i < n; i++) {
      var tt = i / 90, u = i / (n - 1), semis = scoop * Math.max(0, 1 - tt / 0.07) + fall * Math.max(0, (u - 0.7) / 0.3);
      s = lcg(s); a[i] = f * Math.pow(2, semis / 12) * (1 + amt * (s / 1073741823.5 - 1));
    }
    return a;
  }
  // v0.9: ev.vp = the singer's voice profile (content voices; the band's backing vocals have none), ev.word = a shouted
  // word (its vowels steer the formants), ev.gang = a gang of two (an octave down), ev.harm = a harmony (semitones up).
  var vocTypes = {};   // debug: vocal hits by type
  function addVib(a, rate, vib) {
    if (!vib || !vib[1]) return a;
    for (var i = 0; i < a.length; i++) { var tt = i / rate; a[i] *= 1 + vib[1] * Math.min(1, tt / 0.2) * Math.sin(2 * Math.PI * vib[0] * tt); }
    return a;
  }
  function metalVox(r, p, ev, t, dur, V) {
    var c = r.ctx, X = MVOX[V.metal] || MVOX.scream, sub = !!X.sub, gang = !!(ev.gang || V.gang), n = 3;   // buzz + (sub | double) + noise
    if (!book(r, t, dur, n, true)) return;
    counts.vox++; vocTypes[ev.voc] = (vocTypes[ev.voc] || 0) + 1;
    metalPort(r, p);
    var vp = ev.vp || {}, fsc = vp.formant || 1, f = mtof(ev.midi) / Math.pow(2, X.oct || 0), seed = ev.midi * 131 + Math.round(t * 1000);
    r.metal.pres.forEach(function (pr) {   // the guitars clear the voice's band while it sings (a dynamic EQ dip)
      pr.gain.setTargetAtTime(AMP.carve, t, 0.012); pr.gain.setTargetAtTime(3, t + dur * 0.8, 0.1);
    });
    var out = held(c, t, V.peak, dur, p.mVox, sub ? 0.03 : 0.012);
    var sh = c.createWaveShaper(); sh.curve = asymCurve(X.drive + (vp.drive || 0)); sh.oversample = '2x';
    var art = ev.word && !X.noWord ? wordPlan(ev.word, dur, vp.vowels) : null, bank = [];
    X.f[0].forEach(function (f0, k) {
      var bp = filterNode(c, 'bandpass', f0 * fsc, X.q[k], gainNode(c, X.lv[k], out));
      bank.push(bp);
      if (!art) { bp.frequency.setValueAtTime(f0 * fsc, t); bp.frequency.linearRampToValueAtTime(X.f[1][k] * fsc, t + dur * (X.sweep || 0.75)); }
      sh.connect(bp);
    });
    if (art) articulate(bank, null, art, t, X.fs * fsc);
    if (sub) sh.connect(filterNode(c, 'lowpass', 260, 0.8, gainNode(c, 0.9, out)));   // chest
    var am = c.createGain(); am.gain.setValueCurveAtTime(rattle(dur, X.rattle[0], Math.min(0.85, X.rattle[1] + (vp.rasp || 0) * 0.12), seed), t, dur);
    am.connect(sh);
    var into = gainNode(c, sub ? 0.7 : 0.55, am), vib = V.hold ? vp.vib : null, sc = (X.scoop || 0) + (vp.scoop || 0) * 0.5;
    var o = c.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueCurveAtTime(addVib(contour(f, dur, sc, X.fall, X.jit, seed), 90, vib), t, dur);
    o.connect(into); run(r, o, t, dur);
    var o2 = c.createOscillator();   // growl: the subharmonic (square, an octave down); scream: the double
    if (sub) { o2.type = 'square'; o2.frequency.setValueCurveAtTime(contour(f / 2, dur, 0, X.fall, X.jit * 1.5, seed + 7), t, dur); o2.connect(gainNode(c, 0.55, into)); }
    else { o2.type = 'sawtooth'; o2.detune.value = gang ? -1200 : 22; o2.frequency.setValueCurveAtTime(addVib(contour(f, dur, sc, X.fall, X.jit, seed + 3), 90, vib), t, dur); o2.connect(gainNode(c, gang ? 0.6 : 0.45, into)); }
    run(r, o2, t + (sub ? 0 : 0.012), dur - (sub ? 0 : 0.012));
    var s = c.createBufferSource(); s.buffer = r.noise; s.loop = true;
    s.connect(filterNode(c, X.noise[0], X.noise[1], X.noise[2], gainNode(c, X.noise[3], into)));
    run(r, s, t, dur);
  }
  // v0.9: a sung hit's pitch gesture: the voc type's yodel flip (yeehaw, holler) unless the profile says `yodel: false`
  // (Brayden), else a vibrato: the profile's own (an explicit zero-depth `vib` = dead flat), else the type's.
  // -> { yodel, vib: [rate Hz, depth] | null }. A.voxPitch(voc, profile) for tests.
  function voxPitch(V, vp) {
    var yod = !!V.yodel && vp.yodel !== false;
    return { yodel: yod, vib: yod ? null : vp.vib ? (vp.vib[1] ? [vp.vib[0], Math.max(vp.vib[1], V.vib || 0)] : null) : V.vib ? [5.2, V.vib] : null };
  }
  A.voxPitch = function (voc, profile) { return voxPitch(VOX[voc] || VOX.hey, profile || {}); };
  function voxHit(r, p, ev, t, spb) {
    var c = r.ctx, V = VOX[ev.voc] || VOX.hey, dur = Math.max(0.1, Math.min(V.len, ev.len * spb, ev.gap * spb));
    if (V.metal) { metalVox(r, p, ev, t, dur, V); return; }
    var vp = ev.vp || {}, art = ev.word ? wordPlan(ev.word, dur, vp.vowels) : null, rasp = vp.rasp || 0, f = mtof(ev.midi);
    var fs = [f].concat(ev.gang ? [f * 0.5] : [], ev.harm ? [f * Math.pow(2, ev.harm / 12)] : []);
    var bursts = (art ? art.bursts : []).slice();
    if (V.breath && !(bursts[0] && bursts[0][0] === 0)) bursts.unshift([0, V.breath, 1500, 0.5, 0.8, true]);   // the "h" of hey
    var base = Math.min(0.5, rasp * 0.45 + (vp.breath || 0) * 0.35 + (V.rough ? 0.3 : 0)), nz = bursts.length || base > 0.02 ? 1 : 0;
    if (!book(r, t, dur, fs.length + nz, true)) return;
    counts.vox++; vocTypes[ev.voc] = (vocTypes[ev.voc] || 0) + 1;
    var sc = vp.formant || 1, a = VOWELS[V.vw[0]], b = VOWELS[V.vw[1]], dest = ev.kind === 'bvox' ? p.bvox || p.vox : p.vox;
    if (vp.twang) dest = eqNode(c, 'peaking', 2100, 3.5, vp.twang, dest);   // the nasal 'ng' ring of a twang
    var out = held(c, t, V.peak, dur, dest, 0.012), into = gainNode(c, 1, null), input = into;
    var drive = Math.max(V.drive || 0, vp.drive || 0) + Math.round(rasp * 8) / 2;
    if (drive) { var sh = c.createWaveShaper(); sh.curve = driveCurve(drive); input.connect(sh); into = sh; }
    var amp = art ? gainNode(c, 1, null) : null, bank = [];
    if (amp) into.connect(amp);
    [3, 1.8, 1.1].forEach(function (lv, k) {
      var bp = filterNode(c, 'bandpass', a[k] * sc, [7, 10, 12][k], gainNode(c, lv, out));
      bank.push(bp);
      if (!art) { bp.frequency.setValueAtTime(a[k] * sc, t); bp.frequency.linearRampToValueAtTime(b[k] * sc, t + dur * 0.7); }
      (amp || into).connect(bp);
    });
    if (art) articulate(bank, amp, art, t, sc);
    var pz = voxPitch(V, vp), yod = pz.yodel, vib = pz.vib;
    fs.forEach(function (fg, g) {
      var o = c.createOscillator();
      o.type = 'sawtooth'; if (g) o.detune.value = 14;
      if (yod) {   // "yee" up to the fourth, "haw" down past the root
        o.frequency.setValueAtTime(fg, t);
        o.frequency.exponentialRampToValueAtTime(fg * 1.335, t + dur * 0.3);
        o.frequency.exponentialRampToValueAtTime(fg * 0.84, t + dur);
      } else o.frequency.setValueCurveAtTime(voxCurve(fg, dur, V.scoop || vp.scoop || 0, V.bend || 0, vib, (V.rough || 0) + rasp * 0.02, ev.midi * 31 + g), t, dur);
      o.connect(input); run(r, o, t, dur);
    });
    if (nz) {   // breath, rasp and the consonants: one noise source
      var s = c.createBufferSource(); s.buffer = r.noise; s.loop = true;
      var ng = gainNode(c, 0, input), cf = filterNode(c, 'bandpass', 3000, 0.8, null), cg = gainNode(c, 0, out);
      cf.connect(cg); s.connect(ng); s.connect(cf);
      ng.gain.setValueAtTime(base, t); cg.gain.setValueAtTime(0, t);
      bursts.forEach(function (x) {
        var bt = t + x[0], bl = Math.max(0.008, x[1]);
        if (x[5]) { ng.gain.setValueAtTime(base, bt); ng.gain.linearRampToValueAtTime(x[4], bt + 0.008); ng.gain.linearRampToValueAtTime(base, bt + bl); return; }
        cf.frequency.setValueAtTime(x[2], bt); cf.Q.setValueAtTime(x[3], bt);
        cg.gain.setValueAtTime(0, bt); cg.gain.linearRampToValueAtTime(x[4] * 0.6, bt + 0.004); cg.gain.linearRampToValueAtTime(0, bt + bl);
      });
      run(r, s, t, dur);
    }
  }

  // Band notes: 'gtr'/'gtr2' (distorted; power: root+fifth, mute: palm-muted), 'lead' (Dana's amp, bend), 'fiddle'
  // (vibrato), 'twang' (bent clean licks), 'clean' (strum: [intervals] staggered), 'bass', 'vox' (vocal hits).
  // v0.7.2 metal guitars + bass through the metal amp. Flags from the timeline: power (root+fifth+octave wave), mute (palm
  // mute: a short gated note into the low-passed input), trem (tremolo picking: tight 16ths), sag (doom: the chord
  // droops as it rings). gtr = both guitars (L + R, detuned, R a hair late); gtr2 = one ringing voice into both amps.
  var METAL_KINDS = { gtr: 1, gtr2: 1, bass: 1 };
  function metalNote(r, p, ev, t, spb) {
    var c = r.ctx, dur = Math.max(0.03, Math.min(ev.len, ev.gap) * spb), f = mtof(ev.midi), h = (ev.midi * 7 + Math.round(ev.beat * 4)) % 5;
    metalPort(r, p);
    if (ev.kind === 'bass') {
      if (!book(r, t, dur, 1, true)) return;
      var b = c.createOscillator(); b.type = 'sawtooth';
      b.frequency.setValueAtTime(f * 1.006, t); b.frequency.exponentialRampToValueAtTime(f, t + 0.03);   // the string settles
      b.connect(ev.mute || ev.trem || ev.len <= 0.5 ? gate(c, t, 0.002, 0.8, dur, ev.mute ? 0.5 : 0.7, p.mBass) : held(c, t, 0.65, dur, p.mBass));
      run(r, b, t, dur);
      return;
    }
    var ring = ev.kind === 'gtr2', n = ring ? 1 : 2;
    if (!book(r, t, dur, n, true)) return;
    var wave = ev.power ? powerWave(r) : null, base = wave ? f / 2 : f;
    for (var side = 0; side < n; side++) {
      var tt = t + (side ? 0.006 + 0.002 * h / 4 : 0), dd = Math.max(0.02, dur - (tt - t));
      var o = c.createOscillator();
      if (wave) o.setPeriodicWave(wave); else o.type = 'sawtooth';
      o.detune.value = ring ? 0 : side ? 6 + h : -5 - h;
      o.frequency.setValueAtTime(base * 1.007, tt); o.frequency.exponentialRampToValueAtTime(base, tt + 0.025);   // pick bloom
      if (ev.sag && dd > 0.4) { o.frequency.setValueAtTime(base, tt + dd * 0.55); o.frequency.exponentialRampToValueAtTime(base * 0.985, tt + dd); }
      var g;
      if (ring) { g = held(c, tt, 0.22, dd, p.mOpenL, 0.02); g.connect(p.mOpenR); }
      else if (ev.mute) g = gate(c, tt, 0.0015, 0.62, dd, 0.4, side ? p.mMuteR : p.mMuteL);
      else if (ev.trem) g = gate(c, tt, 0.002, 0.5, dd * 0.9, 0.7, side ? p.mOpenR : p.mOpenL);
      else g = held(c, tt, 0.48, dd, side ? p.mOpenR : p.mOpenL, 0.003);
      o.connect(g); run(r, o, tt, dd);
    }
  }
  // Gated note: attack to peak, decay to peak*sustain by the end, then shut within 12 ms (tight: the amp's gain would
  // otherwise hold a slow decay up and smear the chugs together).
  function gate(c, t, attack, peak, dur, sustain, dest) {
    var g = c.createGain(), end = Math.max(dur, attack + 0.02), rel = Math.min(0.012, end * 0.25);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * sustain), t + end - rel);
    g.gain.exponentialRampToValueAtTime(0.0001, t + end);
    g.connect(dest);
    return g;
  }
  function playNote(r, p, ev, t, spb) {
    if (ev.kind === 'vox' || ev.kind === 'bvox') { voxHit(r, p, ev, t, spb); return; }
    if (r.genre === 'metal' && METAL_KINDS[ev.kind]) { metalNote(r, p, ev, t, spb); return; }
    if (r.genre !== 'metal' && ampNote(r, p, ev, t, spb)) return;   // v0.9 genre amps
    var c = r.ctx, dur = Math.max(0.03, Math.min(ev.len, ev.gap) * spb), f = mtof(ev.midi), o, g;
    if (ev.kind === 'bass') {
      if (!book(r, t, dur, 1, true)) return;
      osc(r, 'sawtooth', f, 0, 0, t, dur, ev.len <= 0.5 || ev.ring ? decay(c, t, 0.004, 0.55, dur, p.bass) : held(c, t, 0.4, dur, p.bass));
      return;
    }
    if (ev.kind === 'lead' || ev.kind === 'fiddle' || ev.kind === 'twang') {
      if (!book(r, t, dur, 1, true)) return;
      g = ev.kind === 'twang' ? decay(c, t, 0.003, 0.8, dur, p.lead)
        : held(c, t, ev.kind === 'fiddle' ? 0.5 : 0.6, dur, ev.kind === 'lead' ? p.dlead : p.lead, ev.kind === 'fiddle' ? 0.04 : 0.006);
      o = c.createOscillator(); o.type = 'sawtooth';
      if (ev.power) { o.setPeriodicWave(powerWave(r)); f /= 2; }   // v0.9: Benny's two-chord "solo" (power chords, bent)
      if (ev.kind === 'fiddle' && dur > 0.2) o.frequency.setValueCurveAtTime(vibrato(f, dur, 5.6, 0.008), t, dur);
      else if (ev.bend || ev.slide) {
        o.frequency.setValueAtTime(f * Math.pow(2, -(ev.bend || 1) / 12), t);
        o.frequency.exponentialRampToValueAtTime(f, t + Math.min(0.09, dur * 0.4));
      } else o.frequency.setValueAtTime(f, t);
      o.connect(g); run(r, o, t, dur);
      return;
    }
    if (ev.strum) {   // acoustic strum: each string a hair later
      if (!book(r, t, dur, ev.strum.length, true)) return;
      ev.strum.forEach(function (iv, k) {
        var tk = t + k * 0.012, dk = Math.max(0.02, dur - k * 0.012);
        osc(r, 'triangle', mtof(ev.midi + iv), 0, 0, tk, dk, decay(c, tk, 0.003, 0.32, dk, p.clean));
      });
      return;
    }
    var n = ev.power ? 2 : 1, dest = ev.kind === 'clean' ? p.clean : p.gtr;
    if (!book(r, t, dur, n, true)) return;
    var tn = filterNode(c, 'lowpass', ev.mute ? 700 : 3200, ev.mute ? 1.2 : 0.7, dest);
    g = ev.mute || ev.kind === 'clean' || ev.ring ? decay(c, t, 0.003, ev.kind === 'clean' ? 0.35 : 0.9, dur, tn) : held(c, t, 0.55, dur, tn);   // v0.8: the outro chord rings out
    var type = ev.kind === 'clean' ? 'triangle' : 'sawtooth';
    osc(r, type, f, 0, 0, t, dur, g, -7);
    if (ev.power) osc(r, type, f * 1.4983, 0, 0, t, dur, g, 7);
  }
  function click(r, t, accent) {
    var o = r.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = accent ? 1760 : 1320;
    o.connect(decay(r.ctx, t, 0.001, accent ? 0.9 : 0.55, 0.035, r.click)); run(r, o, t, 0.04);
    counts.clicks++;
  }

  /* ---- Timeline: song -> timed events ------------------------------------------------------------------ */
  // The backing style a genre uses at this tempo: { id, label } (metal: doom / chug / tremolo, per the owner).
  A.styleFor = function (genre, bpm) {
    var styles = (GG.songs.genre(genre).backing || {}).styles || [[0, 'chug', 'Chugs']], s = styles[0];
    styles.forEach(function (x) { if (bpm >= x[0]) s = x; });
    return { id: s[1], label: s[2] };
  };
  // Each song gets its own key, seeded by its id, inside the genre's range (backing.keys around backing.root).
  var NOTE = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  // v0.7.2: with a bpm, the genre's tuning for that tempo band shifts it (metal: doom a semitone down toward drop B, tremolo
  // a semitone up): tonic = root + offset + tune. Without a bpm, tune = 0.
  A.keyFor = function (seed, genre, bpm) {
    genre = genre || 'metal';
    var B = GG.songs.genre(genre).backing || {}, range = B.keys || [0, 0], mode = B.mode || 'minor';
    var tune = bpm && B.tune ? B.tune[A.styleFor(genre, bpm).id] || 0 : 0;
    var off = GG.RNG(GG.hashSeed('key|' + genre + '|' + seed)).int(range[0], range[1]), tonic = (B.root || 40) + off + tune;
    return { seed: String(seed), offset: off, tune: tune, tonic: tonic, mode: mode, name: NOTE[tonic % 12] + ' ' + mode };
  };
  function sig(p) {
    var s = p && p.sections || {};
    return (p && p.bpm) + '|' + ((p && p.arrangement) || []).join(',') + '|' + C.SECTIONS.map(function (n) { return (s[n] || []).join(''); }).join('/')
      + (C.EXTRA_SECTIONS || []).map(function (n) { return s[n] ? '/' + n + ':' + s[n].join('') : ''; }).join('');   // v0.8 outro/solo
  }
  // The song a pattern belongs to (the gig passes song.pattern): a SONG, the same object in the catalog, the same
  // notes in the catalog, else a hash of the notes.
  function songIdOf(pattern) {
    if (!pattern) return 'none';
    if (pattern.pattern && pattern.id != null) return pattern.id;
    var songs = (GG.state && GG.state.songs) || [], i, k;
    for (i = 0; i < songs.length; i++) if (songs[i].pattern === pattern) return songs[i].id;
    k = sig(pattern);
    for (i = 0; i < songs.length; i++) if (songs[i].pattern && sig(songs[i].pattern) === k) return songs[i].id;
    return 'pat|' + GG.hashSeed(k);
  }
  // Chords follow the song: each section picks a progression from the genre list, keyed by its kick+snare
  // skeleton, so the guitarist answers what you wrote (and verse/chorus/bridge differ).
  function progression(B, sec, name) {
    var list = (B.progressions || {})[name] || [[0, 0, 0, 0]];
    return list[GG.hashSeed(name + '|' + (sec[0] || '') + (sec[1] || '')) % list.length];
  }
  function riffFor(B, sec) { var list = B.riffs || [[0]]; return list[GG.hashSeed('riff|' + (sec[0] || '')) % list.length]; }
  var HIT = 120;   // 'x'
  // Nearest note of the key's scale (ties go down): sung and shouted hits always fit the song.
  var MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
  function inKey(midi, tonic, scale) {
    if (!scale || !scale.length) return midi;
    for (var d = 0; d < 12; d++) {
      if (scale.indexOf((((midi - d - tonic) % 12) + 12) % 12) >= 0) return midi - d;
      if (scale.indexOf((((midi + d - tonic) % 12) + 12) % 12) >= 0) return midi + d;
    }
    return midi;
  }
  /* ---- v0.9 who plays and who sings: member gear (content), the soloist's instrument, the singer's voice ------------- */
  function contentMember(id) {
    var Bs = (GG.content && GG.content.bands) || {};
    for (var b in Bs) { var ms = Bs[b].members || []; for (var i = 0; i < ms.length; i++) if (ms[i].id === id) return ms[i]; }
    return null;
  }
  // C.GEAR of a member: content (bands.js) first, else guessed from the role (recruits, fill-ins).
  function gearOf(m, genre) {
    if (!m) return null;
    var cm = contentMember(m.id), r = m.role || '';
    if (cm && cm.gear) return cm.gear;
    if (m.gear) return m.gear;
    return /fiddle/i.test(r) ? 'fiddle' : /acoustic/i.test(r) ? 'acoustic' : /bass/i.test(r) ? 'bass'
      : /guitar/i.test(r) ? ({ metal: 'v', punk: 'sg', rock: 'strat', country: 'tele' })[genre] || 'strat' : null;
  }
  var SOLO_BY_GEAR = { sg: 'twochord', strat: 'lead', v: 'lead', tele: 'twang', fiddle: 'fiddle', acoustic: 'twang' };
  var SOLO_DEFAULT = { metal: 'lead', punk: 'twochord', rock: 'lead', country: 'twang' };
  function careerFor(genre) { var s = GG.state; return s && s.members && (s.genre || 'metal') === genre ? s : null; }
  function rolesOf(s) { try { return GG.gig && GG.gig.roles ? GG.gig.roles(s) : null; } catch (e) { return null; } }
  function memberOf(s, id) { return (s && (s.members || []).filter(function (x) { return x.id === id; })[0]) || contentMember(id) || { id: id }; }
  // The solo instrument (non-metal): 'twochord' (Benny) | 'lead' | 'twang' (Earl's Tele) | 'fiddle' | null (nobody solos:
  // the band plays on). soloist: a member id, null = nobody, undefined = the career's gig.roles.solo when the career plays
  // this genre, else the genre's own.
  A.soloFor = function (genre, soloist) {
    var s = careerFor(genre);
    if (soloist === undefined) { if (!s) return SOLO_DEFAULT[genre] || 'lead'; var R = rolesOf(s); soloist = R ? R.solo : null; }
    if (!soloist) return null;
    return SOLO_BY_GEAR[gearOf(memberOf(s, soloist), genre)] || SOLO_DEFAULT[genre] || 'lead';
  };
  function VC() { return (GG.content && GG.content.voices) || {}; }
  function rivalOfMember(id) {
    var R = (GG.content && GG.content.rivalry && GG.content.rivalry.cast) || {};
    for (var k in R) {
      if (R[k].frontman === id) return k;
      for (var i = 0; i < (R[k].members || []).length; i++) if (R[k].members[i].id === id) return k;
    }
    return null;
  }
  // A voice profile (content voices): the genre default under the singer's own (profiles[memberId], or rivals[rivalId],
  // directly or through a rival cast member). id: whose it is ('genre:<g>' when nobody's).
  A.voiceFor = function (who, genre, rival) {
    var V = VC(), P = V.profiles || {}, RV = V.rivals || {}, p = null, id = null;
    if (who && P[who]) { p = P[who]; id = who; }
    else {
      var rid = rival || (who ? rivalOfMember(who) : null), x = rid ? RV[rid] : null;
      if (typeof x === 'string') { p = P[x] || null; id = p ? x : null; } else if (x) { p = x; id = 'rival:' + rid; }
    }
    return Object.assign({ id: id || 'genre:' + (genre || 'metal') }, (V.defaults || {})[genre] || {}, p || {});
  };
  // The singer: opts.singer / opts.rival, else the career's frontman (gig.roles.front) when it plays this genre.
  function singerOf(genre, o) {
    if (o.singer || o.rival) return A.voiceFor(o.singer || null, genre, o.rival || null);
    var s = careerFor(genre), R = s && rolesOf(s);
    return A.voiceFor((R && R.front) || null, genre, null);
  }
  function pickW(rng, list, W, not) {   // weighted pick (weights default 1), avoiding `not` when there's a choice
    var c = list.filter(function (x) { return x !== not; }), tot = 0, i;
    if (!c.length) c = list;
    for (i = 0; i < c.length; i++) tot += W && W[c[i]] != null ? W[c[i]] : 1;
    var x = rng.next() * tot;
    for (i = 0; i < c.length; i++) { x -= W && W[c[i]] != null ? W[c[i]] : 1; if (x <= 0) return c[i]; }
    return c[c.length - 1];
  }
  // A song's vocal plan (seeded by its key seed = the song id, and the singer): metal picks two chorus scream types, two
  // breakdown types and two held types (alternating per chorus / breakdown entry); every song shuffles the genre's words
  // so no two choruses shout the same thing; the singer's own words come in at wordChance.
  function singPlan(genre, key, vp, whole) {
    var V = VC(), T = (V.types || {})[genre] || null, rng = GG.RNG(GG.hashSeed('voice|' + key.seed + '|' + genre + '|' + vp.id)), W = vp.screams;
    var words = ((V.words || {})[genre] || ['HEY']).slice();
    for (var i = words.length - 1; i > 0; i--) { var j = rng.int(0, i), x = words[i]; words[i] = words[j]; words[j] = x; }
    var P = { vp: vp, whole: whole, rng: rng, wi: 0, words: words, count: (vp.count || []).concat((V.count || {})[genre] || []) };
    if (T) {
      var c1 = pickW(rng, T.chorus, W), b1 = pickW(rng, T.brk, W), h1 = pickW(rng, T.held, W);
      P.types = { scream: [c1, pickW(rng, T.chorus, W, c1)], growl: [b1, pickW(rng, T.brk, W, b1)], held: [h1, pickW(rng, T.held, W, h1)] };
    }
    P.slot = function (voc, n) { var L = P.types && P.types[voc]; return L ? L[n % 2] : voc; };   // content slot -> this song's type
    P.word = function (own) {
      if (own && vp.words && vp.words.length && rng.chance(vp.wordChance || 0)) return rng.pick(vp.words);
      return words[P.wi++ % words.length];
    };
    var seen = {}, wo = 3;
    P.other = function () { return words[wo++ % words.length]; };   // the band's answers, the breakdowns: their own cursor
    P.chorus = function (n) {   // a chorus entry's n words, never the same line as an earlier chorus
      var list = [];
      for (var tries = 0; tries < 12; tries++) {
        var start = P.wi; list = [];
        for (var i = 0; i < n; i++) list.push(P.word(true));
        if (!seen[list.join()]) break;
        P.wi = start + 1;
      }
      seen[list.join()] = 1;
      return list;
    };
    return P;
  }
  // A sung note: the singer's pitch, folded into their range (screams and shouts; growls stay low), back in the key.
  function singNote(midi, voc, vp, o) {
    var m = midi + (vp && vp.pitch || 0) + ((VOX[voc] || {}).shift || 0), R = vp && vp.range;
    if (R && FAMILY[voc] !== 'growl') { while (m < R[0]) m += 12; while (m > R[1]) m -= 12; }
    return inKey(m, o.key, o.B.scale);
  }

  // Event writer for one bar. Lengths are in steps (16ths); beats are quarter notes.
  function writer(o) {
    function push(kind, step, len, e) {
      var ev = { beat: o.beat + step / 4, kind: kind, len: len / 4, section: o.name, role: o.role };
      if (e) for (var k in e) ev[k] = e[k];
      o.out.push(ev);
      return ev;
    }
    return {
      gtr: function (s, len, e) { return push('gtr', s, len, Object.assign({ midi: o.root }, e)); },
      gtr2: function (s, len, e) { return push('gtr2', s, len, Object.assign({ midi: o.root + 12 }, e)); },
      bass: function (s, len, midi, e) {   // an octave under the guitar (never under the genre's bassFloor)
        var m = (midi != null ? midi : o.root) - 12;
        if (o.B.bassFloor && m < o.B.bassFloor) m += 12;
        return push('bass', s, len, Object.assign({ midi: m }, e));
      },
      note: function (kind, s, len, midi, e) { return push(kind, s, len, Object.assign({ midi: midi }, e)); },
      // x (v0.9): { word, len (steps), count (the count-in yell) }; the singer's profile (o.vp) sets the pitch and rides along.
      vox: function (s, voc, midi, gang, x) {
        x = x || {};
        var e = { voc: voc, midi: o.vp ? singNote(midi, voc, o.vp, o) : inKey(midi, o.key, o.B.scale), gang: !!gang };
        if (o.vp) e.vp = o.vp;
        if (x.word) e.word = x.word;
        if (x.count) e.count = true;
        if (x.held) e.held = true;
        return push('vox', s, x.len || (VOX[voc] || VOX.hey).steps, e);
      },
      // v0.9 the band's backing vocals: gang answers (answer: the crowd joins in when it's hot) and whoa-ohs with a
      // harmony a third up (in the key). Their own voice, so they never cut the singer off.
      bvox: function (s, voc, midi, x) {
        x = x || {};
        var m = inKey(midi, o.key, o.B.scale), e = { voc: voc, midi: m, gang: !!x.gang };
        if (x.harm) e.harm = inKey(m + 4, o.key, o.B.scale) - m;
        if (x.answer) e.answer = true;
        if (x.word) e.word = x.word;
        return push('bvox', s, x.len || (VOX[voc] || VOX.hey).steps, e);
      }
    };
  }
  // Palm-muted chugs on every kick hit (the owner's rule), bass doubling; `ring` opens the chord on a bar-1 crash.
  function chugs(o, w, ring) {
    var kick = o.sec[0] || '', cym = o.sec[3] || '', any = false, i;
    for (i = 0; i < 16; i++) {
      if (kick.charCodeAt(i) !== HIT) continue;
      any = true;
      var open = ring && i === 0 && cym.charCodeAt(0) === HIT;
      w.gtr(i, open ? 4 : 1.5, { power: true, mute: !open }); w.bass(i, open ? 4 : 1.5);
    }
    if (!any) for (i = 0; i < 16; i += o.role === 'break' ? 4 : 2) { w.gtr(i, 1.5, { power: true, mute: true }); w.bass(i, 1.5); }
  }
  // v0.7.2 metal, darker (owner: "heavier guitars, darker riffs"). The low string is the key's tonic (drop tuning); the
  // bar's chord (o.root) comes from the progression. Every hit is doubled by the bass.
  var METAL = {
    // Doom sludge (slow): the chord rings and droops, a palm-muted push, a b2 / tritone / minor-third answer, then a
    // chromatic step into the next chord.
    doom: function (o, w) {
      var dark = o.root + o.rng.pick(o.B.stabs || [1, 6]), step = o.next + (o.next > o.key ? -1 : 1);
      w.gtr(0, 6, { power: true, sag: true }); w.bass(0, 6);
      if (o.role !== 'sparse' || o.bar % 2 === 1) { w.gtr(6, 1, { power: true, mute: true, midi: o.key }); w.bass(6, 1, o.key); w.gtr(7, 1, { power: true, mute: true, midi: o.key }); }
      w.gtr(8, 6, { power: true, sag: true, midi: dark }); w.bass(8, 6, dark);
      w.gtr(14, 2, { power: true, mute: true, midi: step }); w.bass(14, 2, step);
    },
    // Palm-muted chugs locked to the kick (the owner's rule): verses pedal on the open low string with the bar's chord
    // struck on the first hit; choruses chug the chord; the last late kick of every other bar is a b2 / tritone stab.
    chug: function (o, w) {
      var kick = o.sec[0] || '', cym = o.sec[3] || '', hits = [], i;
      for (i = 0; i < 16; i++) if (kick.charCodeAt(i) === HIT) hits.push(i);
      if (!hits.length) for (i = 0; i < 16; i += 2) hits.push(i);
      var last = hits[hits.length - 1], pedal = o.role === 'full' ? o.root : o.key;
      hits.forEach(function (s, n) {
        if (n === 0) {
          var open = o.role === 'full' || cym.charCodeAt(s) === HIT;
          w.gtr(s, open ? 4 : 1.5, { power: true, mute: !open }); w.bass(s, open ? 4 : 1.5);
        } else if (s === last && s >= 12 && o.bar % 2 === 1) {
          var st = o.key + o.rng.pick(o.B.stabs || [1, 6]);
          w.gtr(s, 16 - s, { power: true, midi: st }); w.bass(s, 16 - s, st);
        } else { w.gtr(s, 1.5, { power: true, mute: true, midi: pedal }); w.bass(s, 1.5, pedal); }
      });
    },
    // Tremolo riffs (fast): each riff pitch tremolo-picked as two 16ths (power chords in the chorus: the blast riff),
    // the bass on the 8ths; every other bar ends in a chromatic run into the next chord.
    tremolo: function (o, w) {
      var run = o.bar % 2 === 1 && o.role !== 'solo', up = o.next - 4 >= o.key;
      for (var i = 0; i < 16; i++) {
        var m = o.root + o.riff[(i >> 1) % o.riff.length];
        if (run && i >= 12) m = up ? o.next - 4 + (i - 12) : o.next + 4 - (i - 12);
        w.gtr(i, 1, { midi: m, trem: true, power: o.role === 'full' });
        if (i % 2 === 0) w.bass(i, 2, m, { trem: true });
      }
    },
    // Breakdown (any tempo): the drop is one open low-string hit with space around it, a muted pair, a b2 stab; the bars
    // after chug half-time on the kicks that land on a 3-3-2 grid (or that grid itself) with a b2 / tritone at the end.
    brk: function (o, w) {
      var kick = o.sec[0] || '', hits = [], i;
      if (o.brk === 0) {
        w.gtr(0, 8, { power: true, midi: o.key }); w.bass(0, 8, o.key);
        [10, 11].forEach(function (s) { w.gtr(s, 1, { power: true, mute: true, midi: o.key }); w.bass(s, 1, o.key); });
        w.gtr(14, 2, { power: true, midi: o.key + 1 }); w.bass(14, 2, o.key + 1);
        return;
      }
      for (i = 0; i < 16; i++) if (kick.charCodeAt(i) === HIT && [0, 3, 6].indexOf(i % 8) >= 0) hits.push(i);
      if (hits.length < 2) hits = [0, 3, 6, 8, 11, 14];
      hits.forEach(function (s) {
        var open = s % 8 === 0, m = s >= 14 ? o.key + o.rng.pick([1, 6]) : o.key, len = open ? 2.5 : 1.25;
        w.gtr(s, len, { power: true, mute: !open, midi: m }); w.bass(s, len, m);
      });
    }
  };
  // One bar of band per genre. o: { style, sec, root (this bar's chord), next (next chord), key (tonic), riff, bar,
  // role: sparse | full | break | solo, brk (bars of breakdown before this one), bpm, B (genre backing), rng (seeded per
  // song + section + bar) }.
  var BANDS = {
    metal: function (o, w) {
      if (o.role === 'break') { METAL.brk(o, w); return; }
      (METAL[o.style] || METAL.chug)(o, w);
      if (o.role === 'full') w.gtr2(0, 16, { power: true });   // Jaxon lets a chord ring an octave up over it all
      if (o.role === 'solo') {                                  // Dana's solo: fast arpeggios, dark ones, in the scale
        var every = o.bpm > 190 ? 2 : 1, arp = o.rng.pick(o.B.arps || [[0, 3, 7, 12, 15, 12, 7, 3]]);
        for (var i = 0; i < 16; i += every) w.note('lead', i, every, inKey(o.root + 24 + arp[(i / every) % arp.length], o.key, o.B.scale));
      }
    },
    // v0.9: tempo decides (downstroke 8ths, a skate-punk gallop from 200, hardcore thrash with a half-time chorus from
    // 220); the soloist (gig.roles.solo: Benny) takes a two-chord "solo" break.
    punk: function (o, w) {
      var i;
      if (o.role === 'break') { chugs(o, w, false); return; }
      if (o.role === 'solo') { SOLOS[o.solo] ? SOLOS[o.solo](o, w) : SOLOS.twochord(o, w); return; }
      if (o.style === 'hardcore') {
        if (o.role === 'full') { [0, 8].forEach(function (s) { w.gtr(s, 7, { power: true }); w.bass(s, 7); }); return; }   // the mosh part
        for (i = 0; i < 16; i++) { w.gtr(i, 1, { power: true, trem: true }); if (i % 2 === 0) w.bass(i, 2); }
        return;
      }
      if (o.style === 'skate' && o.role === 'sparse') {   // the gallop: muted 16ths, the chord on every beat
        for (i = 0; i < 16; i++) { w.gtr(i, 1, { power: true, mute: i % 4 !== 0 }); if (i % 2 === 0) w.bass(i, 2); }
        return;
      }
      for (i = 0; i < 16; i += 2) { w.gtr(i, 1.8, { power: true, mute: o.role === 'sparse' }); w.bass(i, 1.8); }
    },
    // v0.9: a power ballad (slow, or forced: the Chartbusters), big open chords, driving 8ths from 140; the open chord
    // rings over every chorus.
    rock: function (o, w) {
      var i, m;
      if (o.style === 'ballad' && o.role !== 'break') { BALLAD(o, w); return; }
      if (o.role === 'sparse' || o.role === 'break') {      // the riff (muted in verses), bass underneath
        if (o.style === 'drive' && o.role === 'sparse') {   // palm-muted 8ths, the accent on the one
          for (i = 0; i < 16; i += 2) { w.gtr(i, 1.6, { power: true, mute: i % 8 !== 0 }); w.bass(i, 1.6); }
          return;
        }
        for (i = 0; i < 16; i += 2) {
          m = o.root + o.riff[(i / 2) % o.riff.length];
          w.gtr(i, 1.6, { midi: m, mute: o.role === 'sparse' });
          if (o.role === 'break') w.bass(i, 1.6, m);
        }
        if (o.role === 'sparse') for (i = 0; i < 16; i += 4) w.bass(i, 3.5);
        return;
      }
      if (o.style === 'drive') for (i = 0; i < 16; i += 2) w.gtr(i, 1.8, { power: true });
      else [[0, 3], [3, 3], [6, 2], [8, 8]].forEach(function (x) { w.gtr(x[0], x[1], { power: true }); });   // big open chords
      [o.root, o.root + 4, o.root + 7, o.next === o.root ? o.root + 9 : o.next - 1].forEach(function (b, k) { w.bass(k * 4, 3.6, b); });   // walking
      if (o.role === 'full') w.gtr2(0, 16, { power: true, open: true });
      if (o.role === 'solo' && o.solo) (SOLOS[o.solo] || SOLOS.lead)(o, w);
    },
    // v0.9: the two-step (boom-chick) and, from 108 BPM, the train beat (a walking bass, chicka strums on the off-beats).
    // The fiddle takes the fills (phrase ends, every other chorus bar) and the outro; Earl's Tele takes the solo.
    country: function (o, w) {
      var i, full = o.role !== 'sparse', sc = o.B.scale || [0, 2, 4, 7, 9], train = o.style === 'train';
      // walking (root, 3rd, 5th, 6th), snapped to the full major scale (not o.B.scale: that's the pentatonic) so the bridge's vi / ii
      // walk their own minor third instead of a G#/C# under a G-major song; ties go down
      if (train) [0, 4, 8, 12].forEach(function (s, k) { w.bass(s, 3.6, inKey(o.root + [0, 4, 7, 9][k], o.key, MAJOR_SCALE)); });
      else { w.bass(0, 4); w.bass(8, 4, o.root + 7); }                   // boom on 1 and 3: root, fifth
      (train ? (full ? [2, 6, 10, 14] : [4, 12]) : full ? [4, 6, 12, 14] : [4, 12]).forEach(function (s) {
        w.note('clean', s, 1.5, o.root + 12, { strum: full ? [0, 4, 7] : [0, 7], up: s % 4 === 2 });
      });
      var lick = function (kind, from) { [from, from + 2, from + 4].forEach(function (s, k) { w.note(kind, s, 2, o.key + 24 + sc[o.rng.int(0, sc.length - 1)], k ? null : { bend: kind === 'twang' ? 2 : 0, slide: kind === 'fiddle' }); }); };
      if (o.role === 'sparse' && o.bar % 2 === 1) lick(o.bar % 4 === 1 ? 'twang' : 'fiddle', 10);   // phrase ends: Earl, then the fiddle
      if (o.role === 'full' && o.name === 'outro') {                    // the fiddle takes the outro
        for (i = 0; i < 16; i += 2) w.note('fiddle', i, 2, o.key + 24 + sc[(o.bar * 3 + i / 2) % sc.length] + (i >= 8 ? 12 : 0), i ? null : { slide: true });
      } else if (o.role === 'full') {
        w.note('fiddle', 0, 8, o.root + 24 + [0, 4, 7, 12][o.rng.int(0, 3)]);
        if (o.bar % 2 === 0) w.note('fiddle', 8, 8, o.root + 24 + [0, 4, 7, 12][o.rng.int(0, 3)]);
        else if (o.bar % 4 === 1) { lick('fiddle', 8); w.note('fiddle', 14, 2, o.key + 24 + sc[0]); }   // a fill into the next bar
        else lick('twang', 10);                                                                          // Earl answers
      }
      if (o.role === 'solo') (SOLOS[o.solo] || SOLOS.twang)(o, w);
    }
  };
  // v0.9 solos by the soloist's instrument (A.soloFor): Benny's two chords, a bluesy lead, Earl's Tele, the fiddle.
  var SOLOS = {
    twochord: function (o, w) {   // the same two chords, louder: strummed 8ths below, the chords an octave up on top, bent
      var tc = o.B.twoChords || [0, 5];
      for (var i = 0; i < 16; i += 2) { var ch = o.root + tc[(i >> 3) % 2]; w.gtr(i, 1.8, { power: true, midi: ch }); w.bass(i, 1.8, ch); }
      for (var s = 0; s < 16; s += 4) w.note('lead', s, 3.5, inKey(o.root + 12 + tc[(s >> 3) % 2], o.key, o.B.scale), s % 8 === 0 ? { power: true, bend: 2 } : { power: true });
    },
    lead: function (o, w) {       // a bluesy lead, bent into the long notes
      var sc = o.B.scale || [0, 3, 5, 7, 10], slots = [0, 2, 3, 6, 8, 10, 12, 14];
      slots.forEach(function (s, k) {
        if (k && o.rng.chance(0.25)) return;
        var len = k < slots.length - 1 ? slots[k + 1] - s : 16 - s;
        w.note('lead', s, len, o.key + 24 + sc[o.rng.int(0, sc.length - 1)] + (o.rng.chance(0.2) ? 12 : 0), len >= 3 ? { bend: 2 } : null);
      });
    },
    twang: function (o, w) {      // Earl: chicken-pickin' 16ths and 8ths, bends into the long ones, a slide to start
      var sc = o.B.scale || [0, 2, 4, 7, 9], slots = o.bar % 2 ? [0, 2, 3, 4, 6, 8, 10, 12] : [0, 1, 2, 4, 6, 7, 8, 10, 12, 14];
      slots.forEach(function (s, k) {
        var len = k < slots.length - 1 ? slots[k + 1] - s : 16 - s, m = o.key + 24 + sc[o.rng.int(0, sc.length - 1)] + (o.rng.chance(0.25) ? 12 : 0);
        w.note('twang', s, len, m, !k ? { slide: true } : len >= 2 && o.rng.chance(0.5) ? { bend: 2 } : null);
      });
    },
    fiddle: function (o, w) {     // the fiddle takes it (Earl's gone): the v0.6 fiddle solo
      var sc = o.B.scale || [0, 2, 4, 7, 9];
      for (var i = 0; i < 16; i += 2) w.note('fiddle', i, 2, o.key + 24 + sc[o.rng.int(0, sc.length - 1)] + (o.rng.chance(0.3) ? 12 : 0), i ? null : { slide: true });
    }
  };
  // The power ballad (rock under 90 BPM; the Chartbusters' only style): ringing arpeggios in the verses, whole-bar chords
  // and the open chord ringing in the chorus, a slow lead with long bends in the solo.
  function BALLAD(o, w) {
    var i;
    if (o.role === 'sparse') {
      for (i = 0; i < 16; i += 2) w.note('clean', i, 2, inKey(o.root + 12 + [0, 7, 12, 16, 19, 16, 12, 7][i / 2], o.key, o.B.scale));
      w.bass(0, 16);
      return;
    }
    w.gtr(0, 8, { power: true }); w.gtr(8, 8, { power: true }); w.gtr2(0, 16, { power: true, open: true });
    w.bass(0, 8); w.bass(8, 8, o.next === o.root ? o.root : o.next);
    if (o.role === 'solo' && o.solo) {
      var sc = o.B.scale || [0, 3, 5, 7, 10];
      [0, 4, 8, 12].forEach(function (s) { w.note('lead', s, 4, o.key + 24 + sc[o.rng.int(0, sc.length - 1)], { bend: 2 }); });
    }
  }
  var KIND_RANK = { step: 0, drum: 1, vox: 2, bvox: 2.5, gtr: 3, bass: 4, gtr2: 5, lead: 6, fiddle: 7, clean: 8, twang: 9 };
  // v0.8 extra sections: default roles when the genre's backing doesn't name them. 'ring' = the song's last chord, held.
  var EXTRA_ROLES = { outro: ['full', 'full', 'full', 'ring'], solo: ['solo', 'solo', 'solo', 'solo'] };
  var RING_BEATS = 2.5;   // how long the last chord rings past the end of an outro
  function ringBar(o, w, genre) {
    var len = 16 + RING_BEATS * 4;
    if (genre === 'country') {   // v0.9: the fiddle holds the tonic over the last strum
      w.note('clean', 0, len, o.key + 12, { strum: [0, 4, 7], ring: true }); w.bass(0, len, o.key).ring = true;
      w.note('fiddle', 0, len, o.key + 24, { ring: true });
      return;
    }
    w.gtr(0, len, { power: true, midi: o.key, ring: true }); w.bass(0, len, o.key).ring = true;
  }
  // v0.9 the vocals of one bar (V = backing.vox, S = the song's plan): the count-in yell on the song's first downbeat; in
  // the chorus the singer's calls (hits), the held note that closes every other chorus (and the last), the band's gang
  // answers (resp; the crowd joins in when hot) and, from the second chorus, whoa-ohs with a harmony; in a breakdown the
  // drop and the growls. Metal slots resolve to this song's scream types; every hit shouts the song's next word.
  function sing(S, V, o, w, e, nth, name, role, brk, key, lastChorus) {
    // (a song that opens on a chorus with a downbeat call, e.g. the rival's ~5 s snippets in 59d: that call is the opener, no
    // count-in yell on top of it from the same singer)
    var opener = name === 'chorus' && (V.hits || []).some(function (h) { return h[0] === 0 && h[1] === 0; });
    if (S.whole && e === 0 && o.bar === 0 && V.count && !opener) w.vox(0, V.count[0], key.tonic + V.count[1], false, { word: S.rng.pick(S.count.length ? S.count : ['HEY']), count: true });
    if (name === 'chorus') {
      var hold = V.held && (nth % 2 === 1 || lastChorus) ? V.held : null, hits = (V.hits || []).filter(function (h) { return !(hold && hold[0] === h[0] && hold[1] === h[1]); });   // the held note takes its slot
      if (o.bar === 0 || !S.line) { S.line = S.chorus(hits.length + (hold ? 1 : 0)); S.li = 0; }
      var next = function () { return S.line[S.li++] || S.other(); };
      hits.forEach(function (h) { if (h[0] === o.bar) w.vox(h[1], S.slot(h[2], nth), o.root + h[3], h[4], { word: next() }); });
      if (hold && hold[0] === o.bar) w.vox(hold[1], S.slot(hold[2], nth), o.root + hold[3], false, { word: next(), len: hold[4], held: true });
      (V.resp || []).forEach(function (h) { if (h[0] === o.bar) w.bvox(h[1], h[2], o.root + h[3], { gang: true, answer: true, word: S.other() }); });
      if (nth >= 1) (V.whoa || []).forEach(function (h) { if (h[0] === o.bar) w.bvox(h[1], 'whoa', o.root + 12, { harm: true, len: h[2], word: 'WHOA' }); });
    }
    if (role === 'break' && V.drop && brk === 0) w.vox(0, S.slot(V.drop[0], nth), key.tonic + V.drop[1], false, { word: S.other() });   // the drop
    if (role === 'break' && V.brk) V.brk.forEach(function (h) { if (h[0] === brk) w.vox(h[1], S.slot(h[2], nth + 1), key.tonic + h[3], false, { word: S.other() }); });   // growls
  }
  // Song (or one section) -> { bpm, beats, style, styleLabel, key: { tonic, name, ... }, events: [{ beat, kind: 'step'|
  //   'drum'|'vox'|'gtr'|'gtr2'|'bass'|'lead'|'fiddle'|'clean'|'twang', lane?, v? (drum variant), midi?, voc?, len (beats),
  //   gap (beats to the next event of the same voice, wrapping), section, role, entry, bar, step? }] }
  // opts: { genre, section (null = the whole arrangement), backing (default true), drums (default true), vocals (default
  //         true), songId (key seed; default: the catalog song this pattern belongs to), style (force), bars (limit) }.
  // Pure: no AudioContext needed. Vocal hits land on whole beats only.
  A.timeline = function (pattern, opts) {
    opts = opts || {};
    var p = GG.songs.sanitize(pattern && pattern.pattern || pattern, null, null, true), genre = opts.genre || 'metal';
    var G = GG.songs.genre(genre), B = G.backing || {}, kit = G.kit || DEFAULT_KIT;
    var style = opts.style ? { id: opts.style, label: opts.style } : A.styleFor(genre, p.bpm);
    var key = A.keyFor(opts.songId != null ? opts.songId : songIdOf(pattern), genre, p.bpm), band = BANDS[genre] || BANDS.metal;
    var V = opts.vocals === false ? null : B.vox, R = B.roles || {};
    var order = opts.section ? [opts.section] : p.arrangement, events = [], beat = 0, bars = 0, maxBars = opts.bars || Infinity, tail = 0;
    // v0.9: who solos (non-metal: the soloist's instrument, or nobody), who sings (a voice profile) and how (the song's plan).
    var solo = genre === 'metal' ? 'lead' : opts.rival && opts.soloist === undefined ? SOLO_DEFAULT[genre] || 'lead' : A.soloFor(genre, opts.soloist), vp = V ? singerOf(genre, opts) : null;
    var S = V ? singPlan(genre, key, vp, !opts.section) : null, lastChorus = order.lastIndexOf('chorus'), seen = {};
    for (var e = 0; e < order.length && bars < maxBars; e++) {
      var name = order[e], sec = p.sections[name], prog = progression(B, sec, name), riff = riffFor(B, sec), roles = R[name] || EXTRA_ROLES[name] || ['full'];
      var nth = seen[name] = seen[name] == null ? 0 : seen[name] + 1;   // the how-manyth entry of this section
      for (var bar = 0; bar < C.BARS_PER_SECTION && bars < maxBars; bar++, bars++, beat += 4) {
        var role = roles[bar % roles.length], tomAt = -9, ti = 0;
        for (var step = 0; step < C.STEPS; step++) {
          var at = beat + step / 4;
          events.push({ beat: at, kind: 'step', section: name, entry: e, bar: bar, step: step, role: role });
          if (opts.drums === false) continue;
          if (name === 'solo' && step % 4) continue;   // v0.8: Dana's solo: you lay back on a stripped kit (the beat only, like the gig chart)
          for (var l = 0; l < p.lanes; l++) {
            if (sec[l].charCodeAt(step) !== HIT) continue;
            var ev = { beat: at, kind: 'drum', lane: C.LANES[l], li: l, section: name };
            if (ev.lane === 'toms') { ti = step - tomAt <= 3 ? Math.min(2, ti + 1) : 0; tomAt = step; ev.v = ti; }   // fills roll down the toms
            else if (ev.lane === 'snare' && kit.train) ev.v = snareVariant(step, role);
            events.push(ev);
          }
        }
        if (opts.backing === false) continue;
        var root = role === 'break' ? key.tonic : key.tonic + prog[bar % prog.length], brk = 0;
        for (var j = bar - 1; role === 'break' && j >= 0 && roles[j % roles.length] === 'break'; j--) brk++;
        if (role === 'solo' && !solo) role = 'full';   // v0.9: nobody to solo: the band plays on
        var o = { out: events, style: style.id, sec: sec, root: root, next: key.tonic + prog[(bar + 1) % prog.length], key: key.tonic,
          riff: riff, beat: beat, name: name, bar: bar, role: role, brk: brk, bpm: p.bpm, B: B, rng: GG.RNG(GG.hashSeed(key.seed + '|' + name + '|' + bar)),
          solo: solo, vp: vp };
        var w = writer(o);
        if (role === 'ring') { if (e === order.length - 1) { ringBar(o, w, genre); tail = RING_BEATS; } else band(Object.assign(o, { role: 'full' }), w); continue; }   // v0.8 outro
        band(o, w);
        if (!V) continue;
        sing(S, V, o, w, e, nth, name, role, brk, key, e === lastChorus);
      }
    }
    events.sort(function (a, b) { return a.beat - b.beat || KIND_RANK[a.kind] - KIND_RANK[b.kind] || (a.li || 0) - (b.li || 0); });
    // Gap to the next event of the same voice (drum lane / guitar / bass / ...), wrapping around for loops.
    var next = {};
    for (var i = events.length - 1; i >= 0; i--) {
      var x = events[i]; if (x.kind === 'step') continue;
      var k = x.kind === 'drum' ? x.lane : x.kind;
      x.gap = next[k] != null ? next[k] - x.beat : Infinity;
      next[k] = x.beat;
      if (x.len == null) x.len = Infinity;
    }
    events.forEach(function (x) {
      if (x.gap === Infinity) { var k = x.kind === 'drum' ? x.lane : x.kind; x.gap = beat - x.beat + next[k]; }
      if (x.ring) x.gap = Math.max(x.gap, x.len);   // v0.8: the outro's last chord rings over the end
    });
    return { bpm: p.bpm, beats: beat, tail: tail, style: style.id, styleLabel: style.label, key: key, events: events, solo: solo, voice: vp ? vp.id : null };
  };

  /* ---- Playback: the look-ahead scheduler --------------------------------------------------------------- */
  function schedule(r, port, ev, t, spb) {
    if (ev.kind === 'drum') drumHit(r, port, ev.lane, t, ev.gap * spb, ev.v);
    else playNote(r, port, ev, t, spb);
    // v0.9 crowd-answered chants: a hot live crowd shouts the band's gang answer with it, on the same beat
    if (ev.answer && r === rig && crowdLive() && !crowd.silent && crowd.level >= 65) crowdReact(crowd.bed, crowd, 'chant', t, ev.midi);
  }
  // One playback on a rig. quiet (the van radio): no 'audio:step' / 'audio:end', never the current song.
  function player(pattern, opts, R) {
    var r = R.rig, c = r.ctx, loop = opts.loop != null ? !!opts.loop : !!opts.section;
    var tl = A.timeline(pattern, opts), spb = 60 / tl.bpm, port = makePort(r), timers = [];
    var i = 0, pass = 0, lastBeat = -1;
    var h = { playing: true, loop: loop, section: opts.section || null, bpm: tl.bpm, beats: tl.beats, style: tl.style, key: tl.key,
      genre: opts.genre || 'metal', timeline: tl, radio: !!R.quiet,   // v0.8.3 opts.at: start on the gig's count-in grid
      start: opts.at > c.currentTime + LEAD_IN && opts.at < c.currentTime + 3 ? opts.at : c.currentTime + LEAD_IN };
    function at(ev) { return h.start + (pass * tl.beats + ev.beat) * spb; }
    function pump() {
      if (!h.playing) return;
      var now = c.currentTime, horizon = now + LOOKAHEAD;
      for (;;) {
        if (i >= tl.events.length) {
          if (!loop) { if (now > h.start + (tl.beats + (tl.tail || 0)) * spb + 0.2) h.stop(true, true); return; }   // v0.8: an outro rings out
          i = 0; pass++; lastBeat = -1;
        }
        var ev = tl.events[i], t = at(ev);
        if (t > horizon) break;
        i++; lastBeat = ev.beat;
        if (t < now - 0.03) continue;    // fell behind (throttled tab): skip rather than pile up
        if (ev.kind === 'step') {
          if (!R.quiet) stepAt(ev, t);
          if (opts.metronome && ev.step % 4 === 0 && P().metronome) { try { click(r, t, ev.step === 0); } catch (e) { /* ignore */ } }
          continue;
        }
        try { schedule(r, port, ev, t, spb); } catch (e) { /* a dropped note never stops the song */ }
      }
      timers = timers.filter(function (x) { return x.t > now - 0.5; });
    }
    function stepAt(ev, t) {
      var id = setTimeout(function () {
        if (!h.playing) return;
        stepCount++; lastStep = { section: ev.section, bar: ev.bar, step: ev.step, entry: ev.entry, time: t, role: ev.role };
        GG.emit('audio:step', lastStep);
      }, Math.max(0, (t - c.currentTime) * 1000));
      timers.push({ id: id, t: t });
    }
    // Edit while playing: same length and tempo keep the groove going from where it is; otherwise restart.
    h.update = function (pat) {
      if (!h.playing) return h;
      var nt = A.timeline(pat, opts);
      if (nt.bpm !== tl.bpm || nt.beats !== tl.beats) return R.quiet ? h : A.play(pat, opts);
      tl = nt; h.timeline = nt; i = 0;
      while (i < tl.events.length && tl.events[i].beat <= lastBeat) i++;
      return h;
    };
    // Song position in beats for an AudioContext time (v0.3: where the note highway is).
    h.beatAt = function (time) { var b = (time - h.start) / spb; return loop ? ((b % tl.beats) + tl.beats) % tl.beats : b; };
    // ended = the song finished by itself (or the app went to the background): emits 'audio:end' { handle, natural }
    // (natural = it played to its end; false = cut off by the app going to the background).
    h.stop = function (ended, natural) {
      if (!h.playing) return;
      h.playing = false;
      clearInterval(h.timer);
      timers.forEach(function (x) { clearTimeout(x.id); });
      closePort(r, port);
      if (current === h) current = null;
      if (ended === true && !R.quiet) GG.emit('audio:end', { handle: h, natural: natural === true });
    };
    h.timer = setInterval(pump, TICK_MS);
    if (!R.quiet) current = h;
    pump();
    return h;
  }
  // Plays a pattern (one section on loop, or the whole arrangement). Emits 'audio:step' { section, bar, step, time,
  // entry, role } for every 16th, fired by short timeouts aligned to the scheduled AudioContext times. One song at a time.
  // opts: { genre, section|null, loop (default: true for a section, false for the song), backing (default true), drums,
  //         vocals, songId (the key seed), metronome (true = click quarter notes while settings.metronome is on),
  //         at (v0.8.3: the AudioContext start time, honoured 60 ms..3 s ahead; else now + 60 ms) }
  A.play = function (pattern, opts) {
    opts = opts || {};
    if (!A.unlock() || !ctx) return null;
    A.stop(); stopRadio();
    if (ctx.state === 'suspended') { suspended = false; try { ctx.resume(); } catch (e) { /* ignore */ } }
    setKit(rig, opts.genre || 'metal', opts.quality); applyRoom();   // v0.8: the career's kit tier unless opts.quality
    return player(pattern, opts, { rig: rig });
  };
  A.stop = function () { if (current) current.stop(); };
  // One drum hit right now (the sequencer's cells, the gig's taps), in the current song's kit and room.
  var previewPort = null, schedPort = null, taps = {};
  // v0.6.2: `when` (optional AudioContext time) schedules the hit ahead on the audio clock (the gig's two-thumb auto notes).
  // v0.7.2: hits scheduled ahead go through their own port so A.hitCancel() can silence them (a gig restart / hidden app).
  A.hit = function (lane, when) {
    if (!ctx || suspended || ctx.state !== 'running' || A.isMuted()) return false;
    if (!previewPort) previewPort = makePort(rig);
    var playing = current && current.playing, t = ctx.currentTime + 0.005, v, port = previewPort;
    if (when > t && when < t + 1) { t = when; port = schedPort || (schedPort = makePort(rig)); }
    if (!playing) setKit(rig, (GG.state && GG.state.genre) || rig.genre || 'metal');   // (the career's kit tier)
    if (lane === 'toms') { var T = rig.tom; T.i = t - T.t < 0.32 ? Math.min(2, T.i + 1) : 0; T.t = t; v = T.i; }
    else if (lane === 'snare' && rig.kit && rig.kit.train) {
      var step = playing ? ((Math.round(current.beatAt(t) * 4) % 16) + 16) % 16 : 4;
      v = snareVariant(step, lastStep && playing ? lastStep.role : 'full');
    }
    var last = taps[lane];
    if (last && last.t < t && last.end > t) {   // lanes are monophonic, as in the timeline: this tap cuts off the last one
      last.g.gain.setTargetAtTime(0, t, 0.006);
      last.src.forEach(function (s) { try { s.stop(Math.min(last.end, t + 0.05)); } catch (e) { /* old Safari: one stop() only */ } });
      for (var k = 0; k < last.n; k++) { var j = rig.busy.indexOf(last.end); if (j >= 0) rig.busy[j] = t; }
      taps[lane] = null;
    }
    var g = gainNode(ctx, 1, port.drums), src = rig.collect = [], b;   // drum voices only use port.drums: a gain per tap is its port
    try { b = drumHit(rig, { drums: g }, lane, t, lane === 'cymbal' ? 0.9 : 0.5, v); } finally { rig.collect = null; }
    if (b) { b.g = g; b.src = src; taps[lane] = b; } else { counts.tapDrops++; g.disconnect(); }
    return true;
  };
  A.hitCancel = function () {   // v0.7.2: drops every hit still scheduled ahead (a 5 ms fade, then the port is cut)
    var p = schedPort; schedPort = null;
    if (!p || !ctx) return;
    var t = ctx.currentTime;
    Object.keys(p).forEach(function (k) {
      if (!p[k] || !p[k].gain) return;
      try { var g = p[k].gain; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0, t + 0.005); } catch (e) { /* ignore */ }
      setTimeout(function () { try { p[k].disconnect(); } catch (e) { /* ignore */ } }, 60);
    });
  };
  A.isPlaying = function () { return !!(current && current.playing); };
  A.context = function () { return ctx; };   // v0.3 gig clock + pause (null before unlock); read-only use
  A.current = function () { return current; };

  /* ======================================================================================================
     Rooms & ambience: driven only by bus events and state (screens, the render scene, the live gig, albums).
     ====================================================================================================== */
  var ROOM_BY_KIND = { house: 'dry', basement: 'dry', laundromat: 'dry', openmic: 'dry', bar: 'room', club: 'room', skatepark: 'room',
    legion: 'hall', bingo: 'hall', church: 'hall', curling: 'hall', hall: 'hall', theatre: 'theatre', theater: 'theatre',
    festival: 'arena', arena: 'arena', stadium: 'arena' };
  // Venue -> room class: basements dry, Legion halls echo, theatres and arenas huge (capacity can promote a room).
  A.roomFor = function (gig) {
    if (!gig) return null;
    var cap = +gig.capacity || 0, r = ROOM_BY_KIND[gig.kind] || 'room';
    if (cap >= 3000) r = 'arena';
    else if (cap >= 800 && r !== 'arena') r = 'theatre';
    else if (cap > 0 && cap <= 60 && r === 'room') r = 'dry';
    return r;
  };
  var gigRoom = null;
  function applyRoom() { if (rig) setRoom(rig, gigRoom || (rig.kit && rig.kit.room) || 'room'); }
  A.room = function () { return rig ? rig.room : null; };

  // Continuous beds: { gain, srcs } faded in on start, faded out and stopped by fadeOut().
  function bedSource(c, buf, dest, t0, offset) { var s = c.createBufferSource(); s.buffer = buf; s.loop = true; if (dest) s.connect(dest); s.start(t0, offset || 0); return s; }
  function bedGain(c, dest, t0, level) {
    var g = gainNode(c, 0.0001, dest);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(level || 1, t0 + 0.8);
    return g;
  }
  function garageBed(c, dest, t0, B) {   // mains hum off the old fluorescent tube + room tone and the beer fridge
    var g = bedGain(c, dest, t0), srcs = [];
    var o1 = c.createOscillator(); o1.frequency.value = 60; o1.connect(gainNode(c, 0.018, g)); o1.start(t0); srcs.push(o1);
    var o2 = c.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = 120; o2.connect(filterNode(c, 'lowpass', 420, 0.7, gainNode(c, 0.004, g))); o2.start(t0); srcs.push(o2);
    srcs.push(bedSource(c, B.brown, filterNode(c, 'lowpass', 700, 0.7, gainNode(c, 0.012, g)), t0));
    return { gain: g, srcs: srcs };
  }
  function roadBed(c, dest, t0, B) {   // an Econoline on a grid road: rumble that wallows, tire hiss
    var g = bedGain(c, dest, t0), srcs = [], rum = gainNode(c, 0.3, g);
    srcs.push(bedSource(c, B.brown, filterNode(c, 'lowpass', 150, 0.9, rum), t0));
    var lfo = c.createOscillator(); lfo.frequency.value = 0.27; lfo.connect(gainNode(c, 0.1, rum.gain)); lfo.start(t0); srcs.push(lfo);
    srcs.push(bedSource(c, B.white, filterNode(c, 'bandpass', 1100, 0.5, gainNode(c, 0.02, g)), t0, 0.37));
    return { gain: g, srcs: srcs };
  }
  // v0.7.1 title: a hailstorm on the garage roof: wind that gusts, a dense patter of stones, the odd thud on the eaves.
  function stormBed(c, dest, t0, B) {
    var g = bedGain(c, dest, t0), srcs = [], wind = gainNode(c, 0.05, g);
    srcs.push(bedSource(c, B.brown, filterNode(c, 'bandpass', 380, 0.6, wind), t0));
    var lfo = c.createOscillator(); lfo.frequency.value = 0.13; lfo.connect(gainNode(c, 0.035, wind.gain)); lfo.start(t0); srcs.push(lfo);
    if (!B.hail) B.hail = hailBuffer(c);
    srcs.push(bedSource(c, B.hail, filterNode(c, 'highpass', 1500, 0.7, gainNode(c, 0.22, g)), t0));
    srcs.push(bedSource(c, B.hail, filterNode(c, 'lowpass', 700, 0.9, gainNode(c, 0.35, g)), t0, 1.3));
    return { gain: g, srcs: srcs };
  }
  // Three seconds of hailstones: sparse decaying clicks of random size, looped.
  function hailBuffer(c) {
    var sr = c.sampleRate, n = Math.floor(sr * 3), b = c.createBuffer(1, n, sr), d = b.getChannelData(0), s = 9191, i;
    for (var k = 0; k < 520; k++) {
      s = lcg(s); var at = Math.floor(s / 2147483647 * (n - 800));
      s = lcg(s); var amp = 0.15 + 0.85 * Math.pow(s / 2147483647, 3), len = 90 + Math.floor(amp * 500);
      for (i = 0; i < len; i++) { s = lcg(s); d[at + i] += (s / 1073741823.5 - 1) * amp * Math.exp(-i / (len * 0.22)); }
    }
    return b;
  }
  /* ---- v0.7.2 crowd: rendered once per page (plain seeded JS DSP, 22.05 kHz stereo), then only played back ---------- */
  var CSR = 22050;
  var FORM = { a: [800, 1150, 2800], e: [480, 1750, 2600], i: [300, 2200, 2950], o: [520, 880, 2500], u: [330, 800, 2400], ae: [700, 1600, 2600] };
  var TALK = ['a', 'e', 'i', 'o', 'u', 'ae', 'e', 'a'], FG = [1, 0.6, 0.32];
  function stereo(secs) { var n = Math.ceil(secs * CSR); return { L: new Float32Array(n), R: new Float32Array(n), n: n }; }
  // Build steps: a step that returns MORE runs again. SLICE = samples of a voice per step, BIG = samples of a cheap loop
  // (noise, gain) per step: each step stays a few ms even in cold JS on an old phone.
  var SLICE = 4096, BIG = 16384, MORE = {};
  function sliced(b, body, fin) {   // body(i0, i1) over [0, b.n) (read at the first call), BIG samples per step; then fin(b)
    var i = 0;
    return function () { var e = Math.min(b.n, i + BIG); body(i, e); i = e; return i < b.n ? MORE : fin ? fin(b) : undefined; };
  }
  function runSteps(steps) { var out; for (var j = 0; j < steps.length;) { out = steps[j](); if (out !== MORE) j++; } return out; }
  // One voice into a stereo buffer: a softened buzz + breath noise through three formant resonators gliding between
  // vowels. v: { f0, pan, lv, dull (0 near .. 0.85 far: duller), shift (formant scale), bw [3], seed };
  // segs: [{ t0, t1 (s), v0, v1 (vowels), p0, p1 (pitch multipliers), amp, att, rel (s), br (breath 0..1) }].
  // Resumable: returns job(max) that renders up to `max` more samples (all when omitted); true = the voice is done.
  function speak(b, v, segs) {
    var L = b.L, R = b.R, a0 = (v.pan + 1) * Math.PI / 4, gl = Math.cos(a0) * v.lv, gr = Math.sin(a0) * v.lv;
    var s = (v.seed % 2147483646) + 1, ph = 0, soft = 0, dull = 0, dk = v.dull || 0, x1 = 0, x2 = 0, k;
    var y1 = [0, 0, 0], y2 = [0, 0, 0], c0 = [0, 0, 0], c1 = [0, 0, 0], c2 = [0, 0, 0], bw = v.bw || [90, 120, 170], sh = v.shift || 1;
    var q = -1, i = 0, len = 0, g, a, A0, B0, att, rel, inc, br;
    return function (max) {
      for (var m = max == null ? Infinity : max; m > 0; m--, i++) {
        while (i >= len) {   // next segment (skip the ones too short to hear)
          if (++q >= segs.length) return true;
          g = segs[q]; a = Math.max(0, Math.floor(g.t0 * CSR)); len = Math.min(b.n, Math.floor(g.t1 * CSR)) - a; i = 0;
          if (len < 32) { len = 0; continue; }
          A0 = FORM[g.v0]; B0 = FORM[g.v1]; att = Math.max(1, g.att * CSR); rel = Math.max(1, g.rel * CSR); inc = 0; br = g.br;
        }
        if ((i & 31) === 0) {   // glide the formants and the pitch
          var u = i / len, w = u * u * (3 - 2 * u);
          for (k = 0; k < 3; k++) {
            var f = (A0[k] + (B0[k] - A0[k]) * w) * sh, rr = Math.exp(-Math.PI * bw[k] / CSR);
            c1[k] = -2 * rr * Math.cos(2 * Math.PI * f / CSR); c2[k] = rr * rr; c0[k] = (1 - rr * rr) * FG[k];
          }
          inc = v.f0 * (g.p0 + (g.p1 - g.p0) * u) / CSR;
        }
        s = lcg(s); var nz = s / 1073741823.5 - 1;
        ph += inc * (1 + 0.03 * nz); if (ph >= 1) ph -= 1;
        soft += (2 * ph - 1 - soft) * 0.3;
        var x = soft * (1 - br) + nz * br * 0.6, o = 0;
        for (k = 0; k < 3; k++) { var yy = c0[k] * (x - x2) - c1[k] * y1[k] - c2[k] * y2[k]; y2[k] = y1[k]; y1[k] = yy; o += yy; }
        x2 = x1; x1 = x;
        dull += (o - dull) * (1 - dk);
        var e = g.amp * Math.min(1, i / att, (len - i) / rel);
        L[a + i] += dull * e * gl; R[a + i] += dull * e * gr;
      }
      return false;
    };
  }
  function talkSegs(rng, secs) {   // phrases of syllables and pauses, the odd laugh
    var segs = [], t = rng.range(0, 0.9);
    while (t < secs) {
      var n = rng.int(3, 10), laugh = rng.chance(0.1);
      for (var k = 0; k < n && t < secs; k++) {
        var d = laugh ? rng.range(0.08, 0.12) : rng.range(0.1, 0.24), p = laugh ? 1.35 - 0.04 * k : 1.12 - 0.24 * k / n + rng.range(-0.06, 0.08);
        segs.push({ t0: t, t1: t + d, v0: laugh ? 'a' : rng.pick(TALK), v1: laugh ? 'a' : rng.pick(TALK), p0: p, p1: p * rng.range(0.93, 1.05),
          amp: rng.range(0.5, 1), att: 0.015, rel: 0.03, br: laugh ? 0.45 : rng.chance(0.25) ? 0.55 : 0.08 });
        t += d + rng.range(0, 0.04);
      }
      t += rng.range(0.2, 1.2);
    }
    return segs;
  }
  function shoutSegs(rng, secs) {   // held yells: WOAH, YEAH, HEY, WOO, AAH
    var segs = [], t = rng.range(0, 0.5), SH = [['o', 'a'], ['e', 'a'], ['ae', 'e'], ['u', 'o'], ['a', 'a']];
    while (t < secs) {
      var d = rng.range(0.45, 1.5), vw = rng.pick(SH), p = rng.range(0.92, 1.05);
      segs.push({ t0: t, t1: t + d, v0: vw[0], v1: vw[1], p0: p, p1: p * rng.range(0.88, 1.2), amp: rng.range(0.6, 1), att: 0.08, rel: 0.2, br: rng.range(0.25, 0.45) });
      t += d + rng.range(0.05, 0.5);
    }
    return segs;
  }
  function hubbub(b, seed, lv, a) {   // feet, chairs, bodies: low-passed noise, different per side (steps, a side at a time)
    return [0, 1].map(function (ch) {
      var s = seed + ch * 7919, lp = 0, lp2 = 0;
      return sliced(b, function (i0, i1) {
        var d = ch ? b.R : b.L;
        for (var i = i0; i < i1; i++) { s = lcg(s); lp += (s / 1073741823.5 - 1 - lp) * a; lp2 += (lp - lp2) * a; d[i] += lp2 * lv; }
      });
    });
  }
  // One hand clap: three quick slaps then a short resonant body (every clapper rings at its own pitch).
  function clapInto(b, at, lv, pan, rng) {
    var a0 = (pan + 1) * Math.PI / 4, gl = Math.cos(a0) * lv, gr = Math.sin(a0) * lv, f = rng.range(900, 2100), rr = Math.exp(-Math.PI * rng.range(500, 1100) / CSR);
    var c1 = -2 * rr * Math.cos(2 * Math.PI * f / CSR), c2 = rr * rr, c0 = 1 - rr * rr, st = Math.floor(at * CSR), len = Math.floor(0.06 * CSR);
    var taps = [0, Math.floor(rng.range(0.002, 0.004) * CSR), Math.floor(rng.range(0.006, 0.009) * CSR)], tk = Math.exp(-1 / (0.0008 * CSR)), bk = Math.exp(-1 / (rng.range(0.006, 0.012) * CSR));
    var s = rng.int(1, 1e9), y1 = 0, y2 = 0, x1 = 0, x2 = 0, ex = 0, body = 0;
    for (var i = 0; i < len; i++) {
      var j = st + i; if (j >= b.n) break;
      if (i === taps[0] || i === taps[1]) ex += 0.6;
      if (i === taps[2]) { ex += 1; body = 0.8; }
      s = lcg(s); var x = (s / 1073741823.5 - 1) * (ex + body);
      var yy = c0 * (x - x2) - c1 * y1 - c2 * y2; y2 = y1; y1 = yy; x2 = x1; x1 = x;
      ex *= tk; body *= bk;
      if (j >= 0) { var o = yy * 2.2 + x * 0.35; b.L[j] += o * gl; b.R[j] += o * gr; }
    }
  }
  function applauseSteps(seed, people, secs, into) {   // everybody clapping at their own pace, looped (a step per person)
    var rng = GG.RNG(seed), b = stereo(secs + 0.3), steps = [];
    function clapper() {
      var rate = rng.range(3.3, 5.4), pan = rng.range(-0.95, 0.95), lv = rng.range(0.35, 1), t = rng.range(0, 1 / rate);
      while (t < secs + 0.25) { clapInto(b, t, lv * rng.range(0.7, 1), pan, rng); t += rng.range(0.9, 1.1) / rate; }
    }
    for (var p = 0; p < people; p++) steps.push(clapper);   // a clapper per step (they draw from rng in order)
    return steps.concat(function () { loopSeam(b, secs); }, normSteps(b, 0.2, 0, function (x) { into.push(x); return into; }));
  }
  function loopSeam(b, keep) {   // crossfade the tail over the head: the loop has no seam
    var n = Math.floor(keep * CSR), m = b.n - n;
    [b.L, b.R].forEach(function (d) { for (var i = 0; i < m; i++) { var w = i / m; d[i] = d[i] * w + d[n + i] * (1 - w); } });
    b.n = n; b.L = b.L.subarray(0, n); b.R = b.R.subarray(0, n);
    return b;
  }
  // Loops to an RMS, one-shots to a peak; never above 0.95. normSteps: as steps (b.n read when they run, so after a
  // loopSeam step), the last returns fin(b); norm: all at once.
  function normSteps(b, rms, peak, fin) {
    var sum = 0, pk = 0, k;
    return [sliced(b, function (i0, i1) {
      for (var i = i0; i < i1; i++) { sum += b.L[i] * b.L[i] + b.R[i] * b.R[i]; pk = Math.max(pk, Math.abs(b.L[i]), Math.abs(b.R[i])); }
    }), sliced(b, function (i0, i1) {
      if (!i0) { k = rms ? rms / Math.max(1e-9, Math.sqrt(sum / (2 * b.n))) : peak / Math.max(1e-9, pk); k = Math.min(k, 0.95 / Math.max(1e-9, pk)); }
      for (var i = i0; i < i1; i++) { b.L[i] *= k; b.R[i] *= k; }
    }, fin)];
  }
  function norm(b, rms, peak) { return runSteps(normSteps(b, rms, peak, function (x) { return x; })); }
  // name -> recipe (seeded, so every crowd sounds the same run to run): a list of steps (a slice of a voice, a clapper,
  // a slice of the hubbub...; crowdRun spreads them over ticks) whose last step returns the audio [{ L, R, n }].
  // A step that returns MORE runs again (a voice renders SLICE samples per step), so no step outlasts the tick's budget.
  function speakers(n, mk) {   // n steps; each draws one voice (mk() -> speak job) when it first runs, then renders it in slices
    var a = [];
    for (var i = 0; i < n; i++) a.push(function () { var job = null; return function () { if (!job) job = mk(); return job(SLICE) ? undefined : MORE; }; }());
    return a;
  }
  var CROWD_BUILD = {
    babble: function () {   // a room talking over itself: 14 voices near and far + feet and chairs, 5 s looped
      var rng = GG.RNG(4401), b = stereo(5.35);
      return speakers(14, function () {
        var fem = rng.chance(0.5);
        return speak(b, { f0: fem ? rng.range(175, 250) : rng.range(95, 145), pan: rng.range(-0.9, 0.9), lv: rng.range(0.45, 1), dull: rng.range(0, 0.7),
          shift: fem ? 1.12 : 1, seed: rng.int(1, 1e9) }, talkSegs(rng, 5.35));
      }).concat(hubbub(b, 4411, 0.25, 0.06), function () { loopSeam(b, 5); }, normSteps(b, 0.2, 0, function (x) { return [x]; }));
    },
    roar: function () {   // a crowd yelling: 12 shouting voices + breath, 4 s looped (it follows the meter)
      var rng = GG.RNG(4402), b = stereo(4.4);
      return speakers(12, function () {
        return speak(b, { f0: rng.range(150, 360), pan: rng.range(-0.95, 0.95), lv: rng.range(0.5, 1), dull: rng.range(0, 0.5), shift: rng.range(1.05, 1.2),
          bw: [140, 170, 230], seed: rng.int(1, 1e9) }, shoutSegs(rng, 4.4));
      }).concat(hubbub(b, 4412, 0.6, 0.1), function () { loopSeam(b, 4); }, normSteps(b, 0.22, 0, function (x) { return [x]; }));
    },
    applause: function () { var out = []; return applauseSteps(4405, 26, 3, out).concat(applauseSteps(4406, 7, 3, out)); },   // big room, small room
    clap: function () {   // the crowd clapping along: ~30 hands on one beat, a little ragged (two takes to alternate, 10 hands a step)
      var out = [];
      return [].concat.apply([], [4407, 4408].map(function (seed) {
        var rng = GG.RNG(seed), b = stereo(0.3);
        return [0, 1, 2].map(function (q) { return function () {
          for (var p = 0; p < 10; p++) clapInto(b, 0.03 + (rng.next() + rng.next() + rng.next() - 1.5) * 0.014, rng.range(0.3, 1), rng.range(-0.95, 0.95), rng);
          if (q === 2) { out.push(norm(b, 0, 0.6)); return out; }
        }; });
      }));
    },
    woo: function () {   // single fans: "WOOO!", "YEAH!", "WOO-HOO!", "HEY!"
      var S = [
        [300, [[0.02, 0.2, 'u', 'u', 0.82, 1.3, 0.05, 0.004], [0.2, 0.72, 'u', 'o', 1.3, 1, 0.004, 0.2]]],
        [330, [[0.02, 0.16, 'i', 'e', 1.15, 1.25, 0.03, 0.004], [0.16, 0.6, 'e', 'ae', 1.25, 0.92, 0.004, 0.18]]],
        [360, [[0.02, 0.24, 'u', 'u', 1, 1.25, 0.04, 0.05], [0.3, 0.72, 'u', 'o', 1.4, 1.05, 0.04, 0.2]]],
        [250, [[0.02, 0.3, 'e', 'e', 1.12, 1, 0.02, 0.12]]]
      ];
      var out = [];
      return S.map(function (x, k) {   // a fan per step, in slices
        var b = stereo(0.8), job = speak(b, { f0: x[0], pan: 0, lv: 1, shift: 1.1, bw: [120, 150, 200], seed: 77 + k },
          x[1].map(function (g) { return { t0: g[0], t1: g[1], v0: g[2], v1: g[3], p0: g[4], p1: g[5], amp: 1, att: g[6], rel: g[7], br: 0.25 }; }));
        var done = false;
        return function () { if (!done) { done = job(SLICE); return MORE; } out.push(norm(b, 0, 0.7)); return out; };
      });
    },
    whistle: function () {   // two-finger whistles: a long one, and a wolf whistle
      var NOTES = [[[[0, 2300], [0.1, 3250], [0.45, 3150], [0.72, 2650]]], [[[0, 1500], [0.22, 3000]], [[0.34, 1700], [0.54, 3100], [0.8, 1450]]]];
      var out = [];
      var WS = SLICE >> 2;   // a whistle sample costs a pow + sin + cos: quarter slices keep even an unoptimised (first-build) step small
      return NOTES.map(function (notes, k) {   // a whistle per step, in slices of WS samples
        var last = notes[notes.length - 1], b = stereo(last[last.length - 1][0] + 0.08), ph = 0, s = 900 + k;
        var ni = -1, pts, a, z = 0, i = 0, y1, y2, j, done = false;
        return function () {
          if (done) { out.push(norm(b, 0, 0.55)); return out; }
          for (var m = WS; m > 0; m--, i++) {
            while (i >= z) {   // next note
              if (++ni >= notes.length) { done = true; return MORE; }
              pts = notes[ni]; a = Math.floor(pts[0][0] * CSR); z = Math.floor(pts[pts.length - 1][0] * CSR); y1 = 0; y2 = 0; j = 0; i = a;
            }
            var tt = i / CSR; while (j < pts.length - 2 && tt > pts[j + 1][0]) j++;
            var u = (tt - pts[j][0]) / (pts[j + 1][0] - pts[j][0]), f = pts[j][1] * Math.pow(pts[j + 1][1] / pts[j][1], u) * (1 + 0.008 * Math.sin(2 * Math.PI * 6 * tt));
            ph += f / CSR; if (ph >= 1) ph -= 1;
            s = lcg(s); var rr = 0.985, c1 = -2 * rr * Math.cos(2 * Math.PI * f / CSR), yy = (1 - rr * rr) * (s / 1073741823.5 - 1) - c1 * y1 - rr * rr * y2; y2 = y1; y1 = yy;
            var x = (Math.sin(2 * Math.PI * ph) * 0.8 + yy * 3) * Math.min(1, (i - a) / (0.03 * CSR), (z - i) / (0.06 * CSR));
            b.L[i] += x * 0.7; b.R[i] += x * 0.7;
          }
          return MORE;
        };
      });
    },
    boo: function () {   // "BOOOO": 11 low voices on 'oo', falling, staggered
      var rng = GG.RNG(4403), b = stereo(2.4);
      return speakers(11, function () {
        var t0 = rng.range(0, 0.45), d = rng.range(1, 1.8), p = rng.range(1, 1.08);
        return speak(b, { f0: rng.range(85, 165), pan: rng.range(-0.9, 0.9), lv: rng.range(0.5, 1), dull: rng.range(0.1, 0.6), bw: [110, 140, 200], seed: rng.int(1, 1e9) },
          [{ t0: t0, t1: t0 + d, v0: 'u', v1: rng.chance(0.5) ? 'o' : 'u', p0: p, p1: p * rng.range(0.78, 0.9), amp: 1, att: 0.12, rel: 0.35, br: 0.15 }]);
      }).concat(normSteps(b, 0, 0.7, function (x) { return [x]; }));
    }
  };
  // v0.9 genre crowd one-shots (C.MOMENTS kinds; plan_contract_0.9 §4.4): the pit's gang "HEY!" / "OI!", a room singing
  // "whoa-oh" (base note G: re-pitched to the song's key), a few "yee-haw"s.
  CROWD_BUILD.gang = function () {   // ~10 voices a take, a hair ragged: take 0 "HEY!", take 1 "OI!"
    var out = [];
    return [[['e', 'i'], 4501, 0.9], [['o', 'i'], 4502, 0.05]].reduce(function (steps, x) {
      var rng = GG.RNG(x[1]), b = stereo(0.6);
      return steps.concat(speakers(10, function () {
        var t0 = 0.02 + rng.range(0, 0.035), p = rng.range(0.97, 1.03), fem = rng.chance(0.35);
        return speak(b, { f0: fem ? 330 : 165, pan: rng.range(-0.95, 0.95), lv: rng.range(0.5, 1), dull: rng.range(0, 0.5), shift: fem ? 1.15 : 1.05,
          bw: [150, 180, 240], seed: rng.int(1, 1e9) },
          [{ t0: t0, t1: t0 + 0.05, v0: x[0][0], v1: x[0][0], p0: p, p1: p, amp: 0.7, att: 0.005, rel: 0.01, br: x[2] },
            { t0: t0 + 0.05, t1: t0 + 0.36, v0: x[0][0], v1: x[0][1], p0: p * 1.02, p1: p * 0.9, amp: 1, att: 0.01, rel: 0.12, br: 0.3 }]);
      }), function () { out.push(norm(b, 0, 0.7)); return out; });
    }, []);
  };
  CROWD_BUILD.whoa = function () {   // "WHOA-oh": the fifth, then down to the third; 12 voices, men and women an octave apart
    var rng = GG.RNG(4503), b = stereo(1.75);
    return speakers(12, function () {
      var fem = rng.chance(0.45), t0 = rng.range(0, 0.06), p = rng.range(0.985, 1.015);
      return speak(b, { f0: fem ? 392 : 196, pan: rng.range(-0.95, 0.95), lv: rng.range(0.5, 1), dull: rng.range(0.1, 0.6), shift: fem ? 1.12 : 1, bw: [120, 150, 210], seed: rng.int(1, 1e9) },
        [{ t0: t0, t1: t0 + 0.78, v0: 'u', v1: 'o', p0: p * 0.97, p1: p, amp: 1, att: 0.08, rel: 0.05, br: 0.2 },
          { t0: t0 + 0.8, t1: t0 + 1.62, v0: 'o', v1: 'o', p0: p * 0.8409, p1: p * 0.8409, amp: 0.9, att: 0.03, rel: 0.3, br: 0.2 }]);
    }).concat(normSteps(b, 0, 0.7, function (x) { return [x]; }));
  };
  CROWD_BUILD.yeehaw = function () {   // three fans: "yee" up to the fourth, "haw" down past the root
    var out = [];
    return [0, 1, 2].map(function (k) {
      var b = stereo(1), rng = GG.RNG(4510 + k), f = rng.range(190, 290);
      var job = speak(b, { f0: f, pan: 0, lv: 1, shift: 1.08, bw: [120, 150, 200], seed: 91 + k },
        [{ t0: 0.02, t1: 0.34, v0: 'i', v1: 'i', p0: 1, p1: 1.335, amp: 1, att: 0.03, rel: 0.02, br: 0.2 },
          { t0: 0.34, t1: 0.36, v0: 'i', v1: 'a', p0: 1.335, p1: 1.3, amp: 0.5, att: 0.005, rel: 0.005, br: 0.95 },
          { t0: 0.36, t1: 0.92, v0: 'ae', v1: 'a', p0: 1.3, p1: 0.84, amp: 1, att: 0.01, rel: 0.2, br: 0.2 }]);
      var done = false;
      return function () { if (!done) { done = job(SLICE); return MORE; } out.push(norm(b, 0, 0.7)); return out; };
    });
  };
  var CROWD_PARTS = ['babble', 'roar', 'applause', 'clap', 'woo', 'whistle', 'boo'], CROWD_RAW = {}, CROWD_JOB = {};
  var CROWD_EXTRA = ['gang', 'whoa', 'yeehaw'];   // v0.9: built after the core (a gig never waits for them)
  // Renders part k's raw audio (once per page): all of it, or steps until `budget` ms are spent. true = ready.
  function crowdRun(k, budget) {
    if (CROWD_RAW[k]) return true;
    var J = CROWD_JOB[k], t0 = Date.now();
    if (!J) J = CROWD_JOB[k] = { steps: CROWD_BUILD[k](), i: 0 };
    while (J.i < J.steps.length) {
      var out = J.steps[J.i]();
      if (out !== MORE && ++J.i === J.steps.length) { CROWD_RAW[k] = out; delete CROWD_JOB[k]; return true; }
      if (budget != null && Date.now() - t0 >= budget) return false;
    }
    return false;
  }
  function crowdPart(c, CB, k) {   // AudioBuffers for this context
    if (CB[k]) return CB[k];
    crowdRun(k);
    var raw = CROWD_RAW[k];
    return (CB[k] = raw.map(function (b) { var buf = c.createBuffer(2, b.n, CSR); buf.getChannelData(0).set(b.L); buf.getChannelData(1).set(b.R); return buf; }));
  }
  function crowdBufs(c, CB) { CB = CB || {}; CROWD_PARTS.concat(CROWD_EXTRA).forEach(function (k) { crowdPart(c, CB, k); }); return CB; }
  function crowdAll(CB) { return crowdReady(CB) && CROWD_EXTRA.every(function (k) { return CB[k]; }); }
  function crowdReady(CB) { return !!CB && CROWD_PARTS.every(function (k) { return CB[k]; }); }

  // The crowd at one gig: three looping layers (babble, roar, applause) under one fader, one-shots on top.
  // B: { c, CB, gain (the fader), babble|roar|clap: { g, s }, srcs, live (count one-shots against CROWD_VOICES) }
  function crowdRig(c, dest, CB, t0, small) {
    var g = gainNode(c, 0.0001, dest);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(1, t0 + 0.8);
    function layer(buf, off) { var lg = gainNode(c, 0, g); return { g: lg, s: bedSource(c, buf, lg, t0, off) }; }
    var B = { c: c, CB: CB, gain: g, babble: layer(CB.babble[0], 0), roar: layer(CB.roar[0], 1.3), clap: layer(CB.applause[small ? 1 : 0], 0.7) };
    B.srcs = [B.babble.s, B.roar.s, B.clap.s];
    return B;
  }
  // Layer levels from the crowd state st: { level 0..100, size, song (a song is playing), silent (Japan: hush during songs) }.
  // People talk between songs, listen (and yell, when it's hot) during them.
  function crowdLevels(B, st, t, tau) {
    var lv = st.level / 100, hot = Math.max(0, (lv - 0.35) / 0.65), hush = st.silent && st.song, sz = st.size;
    B.babble.g.gain.setTargetAtTime((hush ? 0.015 : st.song ? 0.1 + 0.05 * lv : 0.2 + 0.08 * lv) * sz, t, tau);
    B.roar.g.gain.setTargetAtTime((hush ? 0 : Math.pow(hot, 1.3) * (st.song ? 0.32 : 0.2)) * sz, t, tau);
  }
  function applaud(B, t, amt, hold) {   // the applause layer swells, holds, dies away
    var p = B.clap.g.gain;
    if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(t); else p.cancelScheduledValues(t);
    p.setTargetAtTime(amt, t, 0.1); p.setTargetAtTime(0, t + hold, 0.6);
  }
  // A one-shot on the crowd fader (stereo placed, slightly re-pitched), counted against CROWD_VOICES when live.
  function shot(B, buf, t, gain, pan, rate, off, dur) {
    if (!buf || (B.live && live.crowd >= CROWD_VOICES)) return null;
    var c = B.c, s = c.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate || 1;
    var g = gainNode(c, gain, panNode(c, pan, B.gain)); s.connect(g);
    s.start(t, off || 0); if (dur) s.stop(t + dur);
    if (B.live) track([s], 'crowd');
    return g;
  }
  // v0.9 what each genre moment adds to the cheer: roar (the metal roar), gang (HEY/OI shouts on the beats; take 0 HEY,
  // 1 OI, 'alt' both; on: beats of the bar), whoa (the whoa-oh sing-along), clap (a clap-along on 2 and 4), yee (yee-haws).
  var MOMENT_SHOTS = {
    headbang: { cheer: 0.8, roar: true }, wallOfDeath: { cheer: 1, roar: true },
    pogo: { cheer: 0.8, gang: 2, take: 1 }, circlePit: { cheer: 1, gang: 2, take: 1 }, gangShout: { cheer: 0.7, gang: 4, take: 'alt' },
    fistPump: { cheer: 0.8, gang: 2, take: 0, on: [0, 2] }, singAlong: { cheer: 0.5, whoa: true }, lighters: { cheer: 0.6, whoa: true },
    clapAlong: { cheer: 0.5, clap: true, yee: 1 }, lineDance: { cheer: 0.6, clap: true, yee: 2 }, yeehaw: { cheer: 0.6, yee: 3 }
  };
  A.momentShots = function (kind) { var M = MOMENT_SHOTS[kind]; return M ? Object.keys(M).filter(function (k) { return k !== 'cheer' && k !== 'take' && k !== 'on'; }) : null; };
  // The next beat at or after t (on one of `which` beats of the bar, 0..3) on the grid G { start, spb, tonic }; no grid: t.
  function nextBeat(G, t, which) {
    if (!G) return t;
    var b = Math.ceil((t - G.start) / G.spb - 1e-6);
    for (var k = 0; k < 8; k++, b++) if (!which || which.indexOf(((b % 4) + 4) % 4) >= 0) return G.start + b * G.spb;
    return t;
  }
  function rateTo(midi, base) { if (midi == null || midi !== midi) return 1; var d = ((((midi - base) % 12) + 18) % 12) - 6; return Math.pow(2, d / 12); }   // within a tritone
  // Crowd reactions (live and offline). kind: a C.MOMENTS kind | 'applause' (polite) | 'end' (a song finished; amt = its
  // score 0..1) | 'clap' (one on-beat clap, amt = strength) | 'woo' | 'whistle' | 'grumble' (a few boos). st.tally counts.
  function crowdReact(B, st, kind, t, amt) {
    var CB = B.CB, rng = st.rng, sz = st.size, T = st.tally, g;
    if (kind === 'end') {
      if (amt < 0.35) { crowdReact(B, st, 'boo', t); applaud(B, t + 0.5, 0.05 * sz, 1.2); return; }
      if (amt < 0.55) { applaud(B, t, 0.14 * sz, 2); T.applause++; return; }
      amt = amt >= 0.78 ? 1 : 0.6;
    }
    if (kind === 'boo' || kind === 'grumble') {
      var big = kind === 'boo';
      if (shot(B, CB.boo[0], t, (big ? 0.34 : 0.14) * sz, rng.range(-0.3, 0.3), rng.range(0.94, 1.06))) T.boos++;
      if (big && sz > 0.8) shot(B, CB.boo[0], t + 0.2, 0.16 * sz, rng.range(-0.6, 0.6), rng.range(0.85, 0.9));
      return;
    }
    if (kind === 'clap') { if (shot(B, CB.clap[T.claps % 2], t, 0.35 * amt * sz, rng.range(-0.1, 0.1), rng.range(0.97, 1.03))) T.claps++; return; }
    if (kind === 'applause') { applaud(B, t, 0.18 * sz * (amt || 1), 1.6); T.applause++; return; }
    if (kind === 'woo') { if (shot(B, rng.pick(CB.woo), t, 0.14 * sz, rng.range(-0.85, 0.85), rng.range(0.9, 1.12))) T.woos++; return; }
    if (kind === 'whistle') { if (shot(B, rng.pick(CB.whistle), t, 0.09 * sz, rng.range(-0.85, 0.85), rng.range(0.94, 1.06))) T.whistles++; return; }
    if (kind === 'solo') { crowdReact(B, st, 'woo', t + 0.05); crowdReact(B, st, 'whistle', t + rng.range(0.2, 0.6)); T.cheers++; return; }
    // v0.9 genre moments (plan_contract_0.9 §4.4): on the song's beat grid when a song is on (G), in its key.
    var G = st.grid ? st.grid() : null, M = MOMENT_SHOTS[kind];
    if (kind === 'chant') {   // the crowd answers the band's gang shout (amt = the answer's midi): exactly on its beat
      if (CB.gang && shot(B, CB.gang[(T.chants || 0) % 2], t, 0.26 * sz, rng.range(-0.25, 0.25), rateTo(amt, 52))) T.chants = (T.chants || 0) + 1;
      return;
    }
    if (M) {
      crowdReact(B, st, 'cheer', t, M.cheer);
      if (M.gang && CB.gang) for (var n = 0, at = t + 0.12; n < M.gang; n++) {   // HEY / OI on the next beats (1 and 3 for a fist pump)
        at = nextBeat(G, at, M.on);
        if (shot(B, CB.gang[M.take === 'alt' ? n % 2 : M.take], at, 0.24 * sz, rng.range(-0.4, 0.4), G ? rateTo(G.tonic + 4, 52) : rng.range(0.97, 1.03))) T.chants = (T.chants || 0) + 1;
        at += G ? G.spb * 0.5 : 0.45;
      }
      if (M.whoa && CB.whoa && shot(B, CB.whoa[0], nextBeat(G, t + 0.1, [0]), 0.3 * sz, rng.range(-0.15, 0.15), G ? rateTo(G.tonic + 7, 55) : 1)) T.whoas = (T.whoas || 0) + 1;
      if (M.yee && CB.yeehaw) for (var y = 0; y < M.yee; y++) if (shot(B, CB.yeehaw[(y + (T.yeehaws || 0)) % CB.yeehaw.length], t + 0.2 + y * rng.range(0.35, 0.6), 0.2 * sz, rng.range(-0.8, 0.8), rng.range(0.95, 1.05))) T.yeehaws = (T.yeehaws || 0) + 1;
      if (M.roar) {   // the metal roar: the crowd's roar pitched way down, swelling under the cheer
        var rg = shot(B, CB.roar[0], t, 0, rng.range(-0.1, 0.1), 0.72, rng.range(0, 1.5), 3);
        if (rg) { rg.gain.setValueAtTime(0, t); rg.gain.linearRampToValueAtTime(0.26 * sz, t + 0.3); rg.gain.setTargetAtTime(0, t + 1.6, 0.5); T.roars = (T.roars || 0) + 1; }
      }
      if (M.clap) {   // a clap-along on 2 and 4 for four bars (live: the crowd tick claps them as the beats come)
        if (B.live) st.alongUntil = t + (G ? 16 * G.spb : 6);
        else for (var cb = 0, ct = nextBeat(G, t, [1, 3]); cb < 8; cb++, ct = nextBeat(G, ct + (G ? G.spb * 1.5 : 0.8), [1, 3])) crowdReact(B, st, 'clap', ct, 0.7);
        T.clapAlongs = (T.clapAlongs || 0) + 1;
      }
      return;
    }
    if (kind === 'cheer') kind = 'mosh';
    // A cheer (mosh, lighters, wall of death, circle pit, line dance, cape spin, a great song end): the roar swells, the
    // applause comes up, a few woos and whistles on top. amt 0..1 = how big.
    amt = amt == null ? 1 : amt;
    g = shot(B, CB.roar[0], t, 0, rng.range(-0.2, 0.2), rng.range(0.96, 1.04), rng.range(0, 1.5), 3.6);
    if (!g) return;
    T.cheers++;
    var pk = (0.12 + 0.2 * amt) * sz, hold = 0.6 + 0.9 * amt;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(pk, t + 0.25); g.gain.setTargetAtTime(0, t + hold, 0.5);
    applaud(B, t + 0.15, (0.1 + 0.2 * amt) * sz, 1 + 2.5 * amt);
    for (var k = Math.round(1 + 2 * amt); k > 0; k--) crowdReact(B, st, 'woo', t + rng.range(0.05, 0.9));
    if (amt > 0.5) crowdReact(B, st, 'whistle', t + rng.range(0.1, 0.7));
    if (amt > 0.85) crowdReact(B, st, 'whistle', t + rng.range(0.6, 1.4));
  }
  function fadeOut(b, t) {
    var p = b.gain.gain;
    if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(t); else p.cancelScheduledValues(t);
    p.setTargetAtTime(0.0001, t, 0.15);
    b.srcs.forEach(function (s) { try { s.stop(t + 0.9); } catch (e) { /* ignore */ } });
    setTimeout(function () { try { b.gain.disconnect(); } catch (e) { /* ignore */ } }, 1300);
  }
  // One-shots: each returns the sources it started (counted against the ambience / crowd caps).
  function pluck(c, dest, t, midi, peak) {   // an unplugged electric, noodled on
    var o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(midi);
    var lp = filterNode(c, 'lowpass', 2400, 1, decay(c, t, 0.004, peak || 0.04, 0.9, dest));
    lp.frequency.setValueAtTime(2400, t); lp.frequency.exponentialRampToValueAtTime(500, t + 0.6);
    o.connect(lp); o.start(t); o.stop(t + 0.95);
    return [o];
  }
  function thump(c, dest, t, nz) {   // an expansion joint (or a gopher)
    var o = c.createOscillator(); o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.12);
    o.connect(decay(c, t, 0.003, 0.3, 0.16, dest)); o.start(t); o.stop(t + 0.18);
    var s = c.createBufferSource(); s.buffer = nz; s.connect(filterNode(c, 'lowpass', 320, 0.8, decay(c, t, 0.002, 0.25, 0.06, dest))); s.start(t); s.stop(t + 0.08);
    return [o, s];
  }
  function track(srcs, pool) {
    srcs.forEach(function (s) { live[pool]++; s.onended = function () { live[pool] = Math.max(0, live[pool] - 1); }; });
  }

  var amb = { mode: 'none', bed: null, timer: 0, noodle: null, road: null, radio: null, radioSong: null };
  // The live crowd (st for crowdLevels/crowdReact): tally = the debug counts; handle = the song it claps along to.
  var crowd = { on: false, level: 50, size: 1, bed: null, last: -9, song: false, silent: false, rng: null, tally: counts, timer: 0,
    handle: null, beat: -1, clapping: false, grumble: -9, alongUntil: 0,
    grid: function () { var h = current && current.playing && !current.radio ? current : null; return h ? { start: h.start, spb: 60 / h.bpm, tonic: h.key ? h.key.tonic : null } : null; } };
  var CB = null, warmTimer = 0;   // this context's crowd buffers (built a part per tick after unlock, or on demand)
  var radioRig = null, refreshTimer = 0;
  function sceneName() {
    var R = GG.render;
    if (!R || !R.available) return 'garage';   // no WebGL: the garage is still home
    try { return (GG.debug('render') || {}).scene || 'none'; } catch (e) { return 'none'; }
  }
  // What should be humming right now: 'gig' (a live gig on screen), 'van' (a drive), 'garage' (home, nothing full
  // open), or 'none'.
  function wantMode() {
    if (!ctx || suspended || A.isMuted() || ctx.state !== 'running') return 'none';
    var ui = GG.ui, st = GG.state;
    if (ui && !st && ui.isOpen('title') && titleOnTop(ui) && sceneName() === 'title') return 'storm';   // v0.7.1 3D title
    if (!ui || !st) return 'none';
    try {
      if (ui.isOpen('gig') && st.liveGig && st.liveGig.gig) return 'gig';
      if (ui.isOpen('van') || ui.isOpen('road')) return 'van';
      if (!ui.hasFull() && sceneName() === 'garage') return 'garage';
    } catch (e) { /* ignore */ }
    return 'none';
  }
  // The title is showing: nothing full-screen stacked over it.
  function titleOnTop(ui) {
    var ids = ui.stackIds(), at = ids.indexOf('title');
    for (var i = at + 1; i < ids.length; i++) { var e = ui.get(ids[i]); if (e && e.def.kind === 'full') return false; }
    return true;
  }
  function refresh() {
    if (!ctx) return;
    var m = wantMode();
    if (m !== amb.mode || (m === 'garage' && garageSig() !== amb.sig)) setMode(m);   // v0.9: another band's room (a new career)
    else if (m === 'gig') { var rm = A.roomFor(GG.state.liveGig.gig); if (rm !== gigRoom) { gigRoom = rm; applyRoom(); } }
  }
  function refreshSoon() {
    if (!ctx || refreshTimer) return;
    refreshTimer = setTimeout(function () { refreshTimer = 0; refresh(); }, 30);
  }
  function setMode(m) {
    var t = ctx.currentTime, prev = amb.mode;
    if (amb.bed) fadeOut(amb.bed, t);
    if (crowd.bed) fadeOut(crowd.bed, t);
    amb.bed = crowd.bed = null; crowd.on = false; crowd.waiting = false;
    if (amb.timer) { clearInterval(amb.timer); amb.timer = 0; }
    if (crowd.timer) { clearInterval(crowd.timer); crowd.timer = 0; }
    stopRadio();
    amb.mode = m;
    if (m === 'gig' || prev === 'gig') { gigRoom = m === 'gig' ? A.roomFor(GG.state.liveGig.gig) : null; applyRoom(); }
    if (m !== 'none' && !BUF) BUF = { brown: loopBuffer(ctx, 'brown'), white: noise };
    try {
      if (m === 'garage') startGarage(t);
      else if (m === 'van') startVan(t);
      else if (m === 'gig') startCrowd(t);
      else if (m === 'storm') amb.bed = stormBed(ctx, ambBus, t, BUF);
    } catch (e) { /* ambience never breaks the game */ }
  }
  // v0.9 the tier-0 room per band (C.SPACE_KINDS of band.space; a rented tier keeps the garage hum). Each bed has
  // continuous layers and one-shot events a timer places (laundromat: the dryers thump in 4/4 above you, a buzzer ends the
  // cycle; strip mall: the fluorescent tube buzzes, the vacuum repair next door tests one; Quonset: wind on corrugated
  // steel, the odd creak, crickets in summer and fall, a meadowlark in spring). A.bedFor(kind, season): the recipe (pure).
  var BEDS = {
    garage: { layers: ['hum', 'tone', 'fridge'], events: [] },
    laundromat: { layers: ['hum', 'tumble'], events: ['dryer', 'buzzer'] },
    stripmall: { layers: ['fluorescent', 'traffic'], events: ['vacuum'] },
    quonset: { layers: ['wind', 'steel'], events: ['creak'], season: { summer: ['crickets'], fall: ['crickets'], spring: ['meadowlark'], winter: [] } }
  };
  A.bedFor = function (kind, season) {
    var k = BEDS[kind] ? kind : 'garage', b = BEDS[k];
    return { kind: k, layers: b.layers.slice(), events: b.events.concat(b.season ? b.season[season || 'summer'] || [] : []) };
  };
  function spaceKind(st) {
    if (!st || (st.spaceTier | 0) > 0) return 'garage';
    var band = GG.career && GG.career.band ? GG.career.band(st) : null, sp = (band && band.space) || st.space;
    return ((C && C.SPACE_KINDS) || {})[sp] || 'garage';
  }
  function seasonNow(st) { try { return GG.calendar && GG.calendar.season ? GG.calendar.season((st && st.week) || 1) : 'summer'; } catch (e) { return 'summer'; } }
  var DRYER_BPM = 96;
  // The continuous layers of a bed (garage: the v0.7 bed, unchanged).
  function spaceBed(c, dest, t0, B, kind) {
    if (kind === 'garage' || !BEDS[kind]) return garageBed(c, dest, t0, B);
    var g = bedGain(c, dest, t0), srcs = [], o, lfo, w;
    if (kind === 'laundromat') {   // the mains hum, and a row of dryers tumbling overhead (their drums swing the rumble)
      o = c.createOscillator(); o.frequency.value = 60; o.connect(gainNode(c, 0.012, g)); o.start(t0); srcs.push(o);
      w = gainNode(c, 0.05, g); srcs.push(bedSource(c, B.brown, filterNode(c, 'lowpass', 260, 0.8, w), t0));
      lfo = c.createOscillator(); lfo.frequency.value = DRYER_BPM / 60 / 2; lfo.connect(gainNode(c, 0.025, w.gain)); lfo.start(t0); srcs.push(lfo);
    } else if (kind === 'stripmall') {   // a fluorescent tube (120 Hz and its buzz, flickering) + the parking lot through the glass
      o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 120;
      var tube = gainNode(c, 0.008, g); o.connect(filterNode(c, 'bandpass', 240, 2, tube)); o.connect(filterNode(c, 'highpass', 2400, 0.7, gainNode(c, 0.15, tube))); o.start(t0); srcs.push(o);
      lfo = c.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 0.37; lfo.connect(gainNode(c, 0.003, tube.gain)); lfo.start(t0); srcs.push(lfo);
      srcs.push(bedSource(c, B.brown, filterNode(c, 'lowpass', 500, 0.7, gainNode(c, 0.02, g)), t0, 1.1));
    } else {   // quonset: wind that gusts, and the corrugated steel singing along with it
      w = gainNode(c, 0.05, g); srcs.push(bedSource(c, B.brown, filterNode(c, 'bandpass', 420, 0.6, w), t0));
      lfo = c.createOscillator(); lfo.frequency.value = 0.11; lfo.connect(gainNode(c, 0.035, w.gain)); lfo.start(t0); srcs.push(lfo);
      var steel = gainNode(c, 0.03, g);
      [310, 740, 1230].forEach(function (f) { w.connect(filterNode(c, 'bandpass', f, 22, steel)); });
    }
    return { gain: g, srcs: srcs };
  }
  // One-shots: (c, dest, t, rng, nz) -> sources. Offline renders place them too.
  var BED_SHOTS = {
    dryer: function (c, dest, t, rng, nz, n) {   // a sneaker in the dryer: a dull thump, the one a little heavier
      var lv = n % 4 === 0 ? 0.22 : 0.14, o = c.createOscillator();
      o.frequency.setValueAtTime(62, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.1);
      o.connect(filterNode(c, 'lowpass', 180, 0.7, decay(c, t, 0.004, lv, 0.16, dest))); o.start(t); o.stop(t + 0.18);
      var s = c.createBufferSource(); s.buffer = nz; s.connect(filterNode(c, 'lowpass', 400, 0.8, decay(c, t, 0.002, lv * 0.4, 0.05, dest))); s.start(t, rng.range(0, 0.5)); s.stop(t + 0.07);
      return [o, s];
    },
    buzzer: function (c, dest, t) {   // the end of a cycle, through the floor
      var srcs = [196, 392].map(function (f, k) {
        var o = c.createOscillator(); o.type = 'square'; o.frequency.value = f;
        o.connect(filterNode(c, 'lowpass', 900, 0.7, held(c, t, k ? 0.012 : 0.02, 1.2, dest, 0.01))); o.start(t); o.stop(t + 1.25);
        return o;
      });
      return srcs;
    },
    vacuum: function (c, dest, t, rng, nz) {   // next door tests an upright: the motor spins up, whines, spins down (through a wall)
      var d = rng.range(2.2, 4), wall = filterNode(c, 'lowpass', 1100, 0.7, dest), o = c.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(60, t); o.frequency.exponentialRampToValueAtTime(230, t + 0.6); o.frequency.setValueAtTime(230, t + d - 0.6); o.frequency.exponentialRampToValueAtTime(70, t + d);
      o.connect(held(c, t, 0.02, d, wall, 0.4)); o.start(t); o.stop(t + d);
      var s = c.createBufferSource(); s.buffer = nz; s.loop = true;
      s.connect(filterNode(c, 'bandpass', 900, 1.5, held(c, t, 0.05, d, wall, 0.5))); s.start(t); s.stop(t + d);
      return [o, s];
    },
    creak: function (c, dest, t, rng, nz) {   // the steel ticks and pings as the wind leans on it
      var s = c.createBufferSource(); s.buffer = nz;
      s.connect(filterNode(c, 'bandpass', rng.range(1400, 2600), 30, decay(c, t, 0.002, 0.5, 0.5, dest))); s.start(t, rng.range(0, 0.5)); s.stop(t + 0.5);
      return [s];
    },
    crickets: function (c, dest, t, rng) {   // a chirp: three or four quick pulses of 4.4 kHz
      var o = c.createOscillator(), g = c.createGain(), n = rng.int(3, 4), f = rng.range(4200, 4700);
      o.frequency.value = f; g.gain.setValueAtTime(0, t);
      for (var k = 0; k < n; k++) { var a = t + k * 0.034; g.gain.setValueAtTime(0, a); g.gain.linearRampToValueAtTime(0.012, a + 0.006); g.gain.linearRampToValueAtTime(0, a + 0.022); }
      g.connect(panNode(c, rng.range(-0.8, 0.8), dest)); o.connect(g); o.start(t); o.stop(t + n * 0.034 + 0.03);
      return [o];
    },
    meadowlark: function (c, dest, t, rng) {   // the prairie's bird: a flute-like tumble of falling slurs
      var NOTES = [[2600, 2300, 0.18], [3300, 3300, 0.1], [2900, 2500, 0.16], [3600, 3100, 0.12], [2400, 1900, 0.28]];
      var o = c.createOscillator(), g = c.createGain(), at = t, k = rng.range(0.92, 1.08);
      g.gain.setValueAtTime(0, t);
      NOTES.forEach(function (x) {
        o.frequency.setValueAtTime(x[0] * k, at); o.frequency.exponentialRampToValueAtTime(x[1] * k, at + x[2]);
        g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(0.02, at + 0.02); g.gain.linearRampToValueAtTime(0, at + x[2]);
        at += x[2] + 0.04;
      });
      g.connect(panNode(c, rng.range(-0.6, 0.6), dest)); o.connect(g); o.start(t); o.stop(at + 0.02);
      return [o];
    }
  };
  // Next time for each event: [first after, then every] seconds (dryer: on its 4/4 grid).
  var BED_TIMES = { dryer: [0.5, [60 / DRYER_BPM, 60 / DRYER_BPM]], buzzer: [6, [25, 45]], vacuum: [2.5, [12, 30]], creak: [1.5, [5, 14]],
    crickets: [0.4, [0.8, 1.5]], meadowlark: [2, [8, 16]] };
  function bedEvents(kind, season, rng, t0) {
    return A.bedFor(kind, season).events.map(function (ev) { var T = BED_TIMES[ev]; return { ev: ev, next: t0 + T[0], n: 0, every: T[1] }; });
  }
  function bedTick(E, c, dest, now, horizon, rng, cap) {
    E.forEach(function (x) {
      if (x.next < now) x.next = now + 0.05;
      while (x.next < horizon) {
        if (cap(2)) { track(BED_SHOTS[x.ev](c, dest, x.next, rng, noise, x.n), 'amb'); counts.bed = (counts.bed || 0) + 1; }
        x.n++; x.next += x.every[0] === x.every[1] ? x.every[0] : rng.range(x.every[0], x.every[1]);
      }
    });
  }

  // v0.9 noodles by the noodler's instrument (member gear): Dana's unplugged electric (the v0.7 pluck), Benny's two chords,
  // Lenny's "legally distinct" riff, Earl's Tele licks, Clementine's Bach, Travis's strum. step(N, c, dest, t) -> [sources,
  // seconds to the next]; N: { tonic, scale, rng, i }.
  var NOODLE_BY_GEAR = { v: 'pluck', sg: 'twochord', strat: 'riff', tele: 'twang', fiddle: 'bach', acoustic: 'strum', bass: 'pluck' };
  var LENNY = [[0, 0.3], [3, 0.3], [5, 0.45], [0, 0.3], [3, 0.3], [6, 0.15], [5, 0.6], [0, 0.3], [3, 0.3], [5, 0.45], [2, 0.3], [0, 0.9]];   // one note off. Legally.
  var BACH = [0, 2, 4, 2, 0, 4, 7, 4, 5, 4, 2, 4, 0, 2, 4, 7];
  function bowed(c, dest, t, midi, dur) {
    var o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(midi);
    o.connect(filterNode(c, 'lowpass', 3600, 0.7, filterNode(c, 'peaking', 1100, 1.5, held(c, t, 0.03, dur, dest, 0.02))));
    o.start(t); o.stop(t + dur + 0.02);
    return [o];
  }
  function twangPluck(c, dest, t, midi, bend) {
    var o = c.createOscillator(), f = mtof(midi); o.type = 'sawtooth';
    o.frequency.setValueAtTime(bend ? f * Math.pow(2, -2 / 12) : f, t); if (bend) o.frequency.exponentialRampToValueAtTime(f, t + 0.1);
    var lp = filterNode(c, 'lowpass', 4200, 1.2, decay(c, t, 0.003, 0.035, 0.7, dest)); lp.frequency.exponentialRampToValueAtTime(1200, t + 0.5);
    o.connect(lp); o.start(t); o.stop(t + 0.75);
    return [o];
  }
  function scaleNote(N, deg) { var sc = N.scale, n = sc.length; return N.tonic + sc[((deg % n) + n) % n] + 12 * Math.floor(deg / n); }
  var NOODLES = {
    twochord: function (N, c, dest, t) {   // two chords, back and forth, then a think about a third one (he won't)
      var k = N.i++ % 10;
      if (k >= 8) return [[], N.rng.range(1.4, 3)];
      var root = N.tonic - 12 + (k >> 1) % 2 * 5;
      return [pluck(c, dest, t, root, 0.03).concat(pluck(c, dest, t + 0.008, root + 7, 0.025)), 0.3];
    },
    riff: function (N, c, dest, t) {
      var k = N.i++ % (LENNY.length + 1);
      if (k === LENNY.length) return [[], N.rng.range(2, 4)];
      return [pluck(c, dest, t, N.tonic - 12 + LENNY[k][0], 0.04), LENNY[k][1]];
    },
    twang: function (N, c, dest, t) {
      var k = N.i++ % 6;
      if (k === 5) return [[], N.rng.range(1.5, 3.5)];
      return [twangPluck(c, dest, t, scaleNote(N, N.rng.int(0, 7)), k === 0), N.rng.pick([0.16, 0.2, 0.32])];
    },
    bach: function (N, c, dest, t) {   // a partita figure up the scale, then a sigh
      var k = N.i++ % (BACH.length + 1);
      if (k === BACH.length) return [[], N.rng.range(1.5, 3)];
      return [bowed(c, dest, t, scaleNote(N, BACH[k] + (N.i > BACH.length + 1 ? 2 : 0)), 0.13), 0.14];
    },
    strum: function (N, c, dest, t) {   // down, down, up, up, down, up (3 strings), then a pause
      var PAT = [[0, 0.3], [0, 0.3], [1, 0.15], [1, 0.3], [0, 0.15], [1, 0.45]], k = N.i++ % (PAT.length + 1);
      if (k === PAT.length) return [[], N.rng.range(1.4, 3)];
      var up = PAT[k][0], ivs = [0, 7, 12], srcs = [];
      ivs.forEach(function (iv, j) { var s = up ? ivs.length - 1 - j : j; srcs = srcs.concat(pluck(c, dest, t + j * 0.012, N.tonic - 12 + ivs[s], 0.022)); });
      return [srcs, PAT[k][1]];
    }
  };
  // Who noodles: the member the garage shows with an instrument idle (content member.idle 'noodle' | 'fiddle'; Dana's by
  // default), else the soloist (gig.roles.solo), else any guitarist.
  function idleOf(m) { var cm = contentMember(m.id); return (cm && cm.idle) || m.idle || (m.id === 'dana' ? 'noodle' : null); }
  function guitarist(st) {
    var act = (st.members || []).filter(function (m) { return m && (m.status || 'active') === 'active'; }), R, who;
    who = act.filter(function (m) { return m.id === 'dana'; })[0] || act.filter(function (m) { return idleOf(m) === 'noodle'; })[0] ||
      act.filter(function (m) { return idleOf(m) === 'fiddle'; })[0];
    if (!who && (R = rolesOf(st)) && R.solo) who = act.filter(function (m) { return m.id === R.solo; })[0];
    return who || act.filter(function (m) { return /lead guitar/i.test(m.role || ''); })[0] || act.filter(function (m) { return /guitar/i.test(m.role || ''); })[0] || null;
  }
  // { who, style } for a career (tests, debug); null = nobody plays anything.
  A.noodleFor = function (st) {
    st = st || GG.state; if (!st) return null;
    var who = guitarist(st);
    return who ? { who: who.id, style: NOODLE_BY_GEAR[gearOf(who, st.genre || 'metal')] || 'pluck' } : null;
  };
  // What the garage ambience depends on: the band, its room, the season (the Quonset's birds), the noodler.
  function garageSig() {
    var st = GG.state; if (!st) return '';
    var who = guitarist(st), kind = spaceKind(st);
    return [st.bandId, kind, BEDS[kind] && BEDS[kind].season ? seasonNow(st) : '', who ? who.id : ''].join('|');
  }
  function startGarage(t) {
    var st = GG.state, genre = st.genre || 'metal', kind = spaceKind(st), season = seasonNow(st), who = guitarist(st);
    amb.sig = garageSig();
    amb.bed = spaceBed(ctx, ambBus, t, BUF, kind);
    amb.space = { kind: kind, season: season, events: bedEvents(kind, season, GG.RNG(GG.hashSeed('bed|' + kind + '|' + (st.totalWeek || 0))), t) };
    amb.space.rng = GG.RNG(GG.hashSeed('bedrng|' + (st.totalWeek || 0)));
    amb.timer = setInterval(noodle, 200);
    if (!who) { amb.noodle = null; return; }
    var songs = st.songs || [], key = A.keyFor(songs.length ? songs[songs.length - 1].id : 'garage', genre);
    amb.noodle = { who: who.id, tonic: key.tonic + 24, scale: (GG.songs.genre(genre).backing || {}).scale || [0, 2, 3, 5, 7, 8, 10],
      rng: GG.RNG(GG.hashSeed('noodle|' + (st.totalWeek || 0))), next: t + 1.5, left: 0, i: 0, style: NOODLE_BY_GEAR[gearOf(who, genre)] || 'pluck' };
  }
  function noodle() {
    if (!ctx || amb.mode !== 'garage' || !amb.bed) return;
    var N = amb.noodle, now = ctx.currentTime, S = amb.space;
    if (S && S.events.length) bedTick(S.events, ctx, amb.bed.gain, now, now + 0.3, S.rng, function (n) { return live.amb + n <= AMB_VOICES; });
    if (!N) return;
    if (N.next < now) N.next = now + 0.05;   // a throttled tab doesn't pile notes up
    while (N.next < now + 0.3) {
      if (N.style !== 'pluck' && NOODLES[N.style]) {   // v0.9: the band's own noodle
        var room = live.amb + 3 <= AMB_VOICES, x = room ? NOODLES[N.style](N, ctx, amb.bed.gain, N.next) : [[], 0.3];
        if (x[0].length) { track(x[0], 'amb'); counts.noodles++; }
        N.next += x[1];
        continue;
      }
      if (live.amb < AMB_VOICES) {
        track(pluck(ctx, amb.bed.gain, N.next, N.tonic + N.scale[N.rng.int(0, N.scale.length - 1)] + (N.rng.chance(0.2) ? 12 : 0), 0.035), 'amb');
        counts.noodles++;
      }
      if (N.left > 0) { N.left--; N.next += N.rng.pick([0.18, 0.24, 0.36]); } else { N.left = N.rng.int(2, 6); N.next += N.rng.range(1.2, 3.6); }
    }
  }
  function startVan(t) {
    amb.bed = roadBed(ctx, ambBus, t, BUF);
    amb.road = { rng: GG.RNG(GG.hashSeed('road|' + ((GG.state && GG.state.totalWeek) || 0))), next: t + 1 };
    amb.timer = setInterval(roadTick, 250);
    startRadio(t);
  }
  function roadTick() {
    var R = amb.road; if (!ctx || amb.mode !== 'van' || !R || !amb.bed) return;
    var now = ctx.currentTime;
    if (R.next < now) R.next = now + 0.05;
    while (R.next < now + 0.4) {
      if (live.amb + 2 <= AMB_VOICES) { track(thump(ctx, amb.bed.gain, R.next, noise), 'amb'); counts.thumps++; }
      R.next += R.rng.range(0.9, 2.6);
    }
  }
  // The van radio: once an album has charted on the Maple 100, its single (or best track) plays quietly on drives.
  function chartedSong(st) {
    var best = null;
    (st.albums || []).forEach(function (a) { if (a && a.chart && a.chart.peak && (!best || a.chart.peak < best.chart.peak)) best = a; });
    if (!best) return null;
    var ids = [].concat(best.single != null ? [best.single && best.single.id != null ? best.single.id : best.single] : [], best.tracks || []);
    for (var i = 0; i < ids.length; i++) {
      for (var j = 0; j < (st.songs || []).length; j++) if (st.songs[j].id === ids[i] && st.songs[j].pattern) return st.songs[j];
    }
    return null;
  }
  A.radioSong = function (state) { var s = chartedSong(state || GG.state || {}); return s ? s.id : null; };
  function radioChain(c, dest) {   // a tinny dashboard speaker
    var sh = c.createWaveShaper(); sh.curve = driveCurve(1.5); sh.connect(dest);
    return filterNode(c, 'highpass', 320, 0.7, filterNode(c, 'lowpass', 3200, 0.9, sh));
  }
  function startRadio(t) {
    var st = GG.state, song = chartedSong(st);
    if (!song) return;
    if (!radioRig) {
      var fader = gainNode(ctx, 0.0001, ambBus);
      radioRig = makeRig(ctx, radioChain(ctx, fader), noise, { mix: false, verb: false, voices: 8, bandVoices: 6, level: 0.9 });
      radioRig.fader = fader;
    }
    radioRig.fader.gain.setTargetAtTime(0.3, t, 0.8);
    setKit(radioRig, st.genre || 'metal');
    amb.radio = player(song.pattern, { genre: st.genre || 'metal', section: null, loop: true, songId: song.id }, { rig: radioRig, quiet: true });
    amb.radioSong = song.id;
  }
  function stopRadio() {
    if (amb.radio) { amb.radio.stop(); amb.radio = null; }
    amb.radioSong = null;
    if (radioRig && ctx) radioRig.fader.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.1);
  }
  // The crowd (v0.7.2): babble + roar following the meter and whether a song is on, claps along on the beat when it's hot,
  // fans yelling, a grumble of boos when it goes badly, cheers/boos on crowd moments and at every song's end. Bigger rooms,
  // bigger crowds; a small room gets the small applause. Japan's silent crowds hush during songs and applaud politely.
  function startCrowd(t) {
    var lg = GG.state.liveGig, att = +(lg.attendance || lg.gig.capacity || 80);
    crowd.on = true; crowd.last = -9; crowd.song = false; crowd.handle = null; crowd.beat = -1; crowd.clapping = false; crowd.grumble = -9; crowd.alongUntil = 0;
    crowd.size = Math.max(0.5, Math.min(1.4, 0.5 + 0.3 * Math.log(Math.max(10, att)) / Math.LN10));
    crowd.silent = !!(GG.tour && GG.tour.silentCrowd && GG.tour.silentCrowd(lg.gig));
    crowd.rng = GG.RNG(GG.hashSeed('crowd|' + (lg.gig.venueId || '') + '|' + (lg.started || 0) + '|' + (lg.index || 0)));
    crowd.small = att < 150;
    crowd.level = typeof lg.crowd === 'number' ? lg.crowd : 40;
    crowd.timer = setInterval(crowdTick, 100);
    if (crowdReady(CB)) crowdStart(); else { crowd.waiting = true; warmCrowd(); }   // never stall the gig: fade in when built
  }
  function crowdStart() {
    crowd.waiting = false;
    if (!crowd.on || crowd.bed || !ctx) return;
    crowd.bed = crowdRig(ctx, crowdBus, CB, ctx.currentTime, crowd.small); crowd.bed.live = true;
    setCrowd(crowd.level);
  }
  function setCrowd(v) {
    if (typeof v !== 'number' || v !== v) return;
    crowd.level = Math.max(0, Math.min(100, v));
    if (crowd.bed && ctx) crowdLevels(crowd.bed, crowd, ctx.currentTime, 0.5);
  }
  function crowdTick() {
    if (!ctx || !crowd.on || !crowd.bed || ctx.state !== 'running') return;
    var h = current && current.playing && !current.radio ? current : null, now = ctx.currentTime;
    if (!!h !== crowd.song) { crowd.song = !!h; crowdLevels(crowd.bed, crowd, now, 0.6); }
    if (h !== crowd.handle) { crowd.handle = h; crowd.beat = -1; crowd.clapping = false; }
    if (!h || crowd.silent) return;
    var spb = 60 / h.bpm, lv = crowd.level, role = lastStep && lastStep.role, b;
    // On-beat claps when hot: decided every 4 bars; every beat (2 and 4 from 150 BPM up); never in a breakdown.
    for (b = Math.max(crowd.beat + 1, Math.ceil((now - h.start) / spb)); h.start + b * spb < now + 0.3; b++) {
      crowd.beat = b;
      if (b < 0 || b >= h.beats) continue;
      if (b % 16 === 0) crowd.clapping = lv >= 70 && crowd.rng.chance(Math.min(0.9, (lv - 55) / 40));
      var along = crowd.alongUntil > h.start + b * spb && b % 2 === 1;   // v0.9 a clap-along (country moments): 2 and 4
      if ((along || crowd.clapping) && role !== 'break' && (along || h.bpm < 150 || b % 2 === 1)) {
        crowdReact(crowd.bed, crowd, 'clap', Math.max(now + 0.005, h.start + b * spb - 0.03 + crowd.rng.range(0.004, 0.02)), 0.3 + 0.35 * (lv - 70) / 30);
      }
    }
    if (lv >= 62 && crowd.rng.chance(0.05 * (lv - 60) / 40)) crowdReact(crowd.bed, crowd, crowd.rng.chance(0.7) ? 'woo' : 'whistle', now + 0.05);
    if (lv < 22 && now - crowd.grumble > 6 && crowd.rng.chance(0.015)) { crowd.grumble = now; crowdReact(crowd.bed, crowd, 'grumble', now + 0.05); }
  }
  function crowdLive() { return crowd.on && crowd.bed && ctx && ctx.state === 'running' && !A.isMuted(); }
  GG.on('crowd:level', function (p) { if (crowd.on && p) setCrowd(p.crowd); });
  GG.on('gig:judge', function (p) { if (crowd.on && p) setCrowd(p.crowd); });
  GG.on('crowd:moment', function (p) {
    if (!p || !crowdLive() || p.kind === 'drinks') return;
    crowd.last = ctx.currentTime;
    crowdReact(crowd.bed, crowd, p.kind, ctx.currentTime + 0.02, p.kind === 'lighters' || p.kind === 'lineDance' ? 0.6 : 0.9);   // v0.9: + the genre's one-shots
  });
  GG.on('gig:song', function (p) {   // a song ends: the crowd tells you how it went (silent crowds: the sim's 'applause')
    if (!p || !p.result || !crowdLive() || crowd.silent) return;
    crowd.last = ctx.currentTime;
    crowdReact(crowd.bed, crowd, 'end', ctx.currentTime + 0.05, (p.result.score || 0) / 100);
  });
  // Crowd buffers get built in the background (a part per tick, after unlock), so the first gig doesn't wait for them.
  // ~8 ms of work per tick (steps of a voice slice, a clapper, a slice of noise), so the title and the setlist never hitch; paused
  // while a song plays (the gig's clock and taps come first). The crowd waits for it (crowd.waiting) and fades in.
  function warmCrowd() {
    if (!ctx || warmTimer || crowdAll(CB)) return;
    warmTimer = setTimeout(function () {
      warmTimer = 0;
      if (current && current.playing && !current.radio) { warmTimer = setTimeout(function () { warmTimer = 0; warmCrowd(); }, 500); return; }   // never mid-song
      CB = CB || {};
      var k = CROWD_PARTS.concat(CROWD_EXTRA).filter(function (x) { return !CB[x]; })[0];   // the core first, then v0.9's
      try { if (k && crowdRun(k, 8)) crowdPart(ctx, CB, k); } catch (e) { return; }
      if (crowdReady(CB) && crowd.waiting) crowdStart();
      if (!crowdAll(CB)) warmCrowd();
    }, 25);
  }
  GG.on('screen:open', refreshSoon);
  GG.on('screen:close', refreshSoon);
  GG.on('ui:stack', refreshSoon);
  A.ambience = function () { return amb.mode; };
  A.refreshAmbience = function () { refresh(); return amb.mode; };

  /* ---- Offline render (tests, mixing): -> Promise<{ peak, rms, tail, nan, seconds, counts, key, crowd, buffer }> ---- */
  // spec: { lane, variant, quality (v0.8 kit tier 0..3) } one drum hit | { pattern (default the genre's signature), genre, bpm, songId, section (default
  //         'verse'), full (whole arrangement), bars (default 2), backing: styleId (that style alone) | true | false,
  //         drums (default: !styleId), vocals, metronome, room (default the kit's), crowd: { level, moments } (v0.7.2: the
  //         crowd mixed in, as at a gig) }
  //       | { ambience: 'garage' | 'van' | 'crowd' | 'radio', level (crowd 0..100), seconds, genre, pattern }
  //         crowd (v0.7.2): { song (a song is on: the babble drops), silent, small, size, moments: [[t, kind, amt?]] (default
  //         a mosh cheer at 0.3 s and a boo at 1.1 s), clapBpm (clap along from 0.25 s) }
  //       v0.9: singer / rival / soloist (who sings and solos), vocalsOnly (the vocal events alone); crowd.moments land on
  //         the song's beats; the crowd answers the band's gang shouts (chants) when crowd.level >= 65
  //       | v0.9 { ambience: 'garage', space: 'laundromat' | 'stripmall' | 'quonset' | 'garage', season, noodle: style } ->
  //         result.bed { kind, layers, events: { name: count }, noodles }
  //       | v0.9 { probe: 'vox', voc, word, singer | rival, genre, midi }: one sung hit in that singer's voice (result.voice,
  //         result.midi); probe: any VOX type (shriek, squeal, fry, guttural, yell, wail, holler...)
  //       | v0.7.2 { probe: 'gtr' | 'bass' | 'growl' | 'scream', genre, midi, power, mute, seconds }: one sustained note
  //         through the genre's rig (metal: the metal amp), for harmonic analysis. voxInvert (tests): vocal hits in
  //         inverted polarity, so (normal - inverted) / 2 isolates the voice in the mix and (normal + inverted) / 2 the band.
  // Stereo (v0.7.2). peak/rms over both channels; buffer = the rendered AudioBuffer. Mixer levels apply (static), so
  // setVolume(bus, 0) silences that bus here too.
  A.renderOffline = function (spec) {
    spec = spec || {};
    var OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OAC) return Promise.reject(new Error('no OfflineAudioContext'));
    var genre = spec.genre || 'metal', bars = spec.bars || 2, style = typeof spec.backing === 'string' ? spec.backing : null;
    var pat = GG.songs.sanitize(spec.pattern || GG.songs.genre(genre).signature, null, null, true);
    if (spec.bpm) pat.bpm = spec.bpm;
    var sr = 44100, spb = 60 / pat.bpm, amb = spec.ambience, tail = spec.room ? ROOMS[spec.room].len : 0;
    var seconds = spec.seconds || (amb ? 2.6 : spec.lane || spec.probe ? 1.6 + tail : bars * 4 * spb + 1.4 + tail);
    var oc = new OAC(2, Math.ceil(sr * seconds), sr), dest = oc.destination, tally = {}, tl = null;
    var ct = { cheers: 0, boos: 0, claps: 0, woos: 0, whistles: 0, applause: 0, chants: 0, whoas: 0, yeehaws: 0, roars: 0, clapAlongs: 0 }, bed = null;
    // v0.9 grid: { start, spb, tonic } (a song under the crowd: moments land on its beats, in its key)
    function crowdIn(out, cs, t0, grid) {   // the crowd layers + reactions into `out`
      var Bo = crowdRig(oc, out, crowdBufs(oc, {}), t0, !!cs.small), lv = cs.level != null ? cs.level : 70;
      var st = { level: lv, size: cs.size || 1, song: !!cs.song, silent: !!cs.silent, rng: GG.RNG(GG.hashSeed('offline-crowd|' + lv)), tally: ct,
        grid: function () { return grid || (cs.bpm ? { start: t0 + 0.05, spb: 60 / cs.bpm, tonic: cs.tonic != null ? cs.tonic : null } : null); } };
      crowdLevels(Bo, st, t0, 0.05);
      (cs.moments || [[0.3, 'mosh'], [1.1, 'boo']]).forEach(function (m) { crowdReact(Bo, st, m[1], t0 + 0.05 + m[0], m[2]); });
      if (cs.clapBpm) for (var cb = 0.25; cb < seconds - 0.3; cb += 60 / cs.clapBpm) crowdReact(Bo, st, 'clap', t0 + cb, 0.6);
      return { B: Bo, st: st };
    }
    if (amb && amb !== 'radio') {
      var nz = noiseBuffer(oc), Bf = { brown: loopBuffer(oc, 'brown'), white: nz };
      var sfxOut = gainNode(oc, busGain('sfx'), dest), crowdOut = gainNode(oc, busGain('crowd'), dest);
      if (amb === 'garage' && !spec.space && !spec.noodle) { var gb = garageBed(oc, sfxOut, 0, Bf); [0.4, 0.64, 0.88, 1.5].forEach(function (t, k) { pluck(oc, gb.gain, t, 64 + [0, 3, 5, 7][k], 0.035); }); }
      else if (amb === 'garage') {   // v0.9: a tier-0 room (spec.space kind, spec.season) + a noodle (spec.noodle style)
        var kind = BEDS[spec.space] ? spec.space : 'garage', sb = spaceBed(oc, sfxOut, 0, Bf, kind), brng = GG.RNG(GG.hashSeed('offline-bed|' + kind));
        bed = { kind: kind, layers: A.bedFor(kind, spec.season).layers, events: {}, noodles: 0 };
        bedEvents(kind, spec.season, brng, 0).forEach(function (x, k) {   // every event early (the render is short), then on its own clock
          for (var at = 0.2 + 0.35 * k, n = 0; at < seconds - 0.15; n++) {
            BED_SHOTS[x.ev](oc, sb.gain, at, brng, nz, n); bed.events[x.ev] = (bed.events[x.ev] || 0) + 1;
            at += x.every[0] === x.every[1] ? x.every[0] : Math.min(x.every[0], 1.2);
          }
        });
        if (spec.noodle) {
          var N = { tonic: 64, scale: (GG.songs.genre(genre).backing || {}).scale || [0, 2, 4, 5, 7, 9, 11], rng: GG.RNG(5), i: 0 };
          for (var nt = 0.3; nt < seconds - 0.4;) {
            if (NOODLES[spec.noodle]) { var xx = NOODLES[spec.noodle](N, oc, sb.gain, nt); if (xx[0].length) bed.noodles++; nt += Math.min(xx[1], 0.5); }
            else { pluck(oc, sb.gain, nt, N.tonic + N.scale[N.rng.int(0, N.scale.length - 1)], 0.035); bed.noodles++; nt += 0.24; }
          }
        }
      }
      else if (amb === 'van') { roadBed(oc, sfxOut, 0, Bf); thump(oc, sfxOut, 0.5, nz); thump(oc, sfxOut, 1.7, nz); }
      else if (amb === 'crowd') crowdIn(crowdOut, { level: spec.level, song: spec.song, silent: spec.silent, small: spec.small, size: spec.size, moments: spec.moments, clapBpm: spec.clapBpm,
        bpm: spec.bpm, tonic: spec.tonic }, 0);
    } else {
      var radio = amb === 'radio', r = makeRig(oc, radio ? radioChain(oc, gainNode(oc, 0.3 * busGain('sfx'), dest)) : dest, null,
        radio ? { mix: false, verb: false, voices: 8, bandVoices: 6, level: 0.9 } : { mix: 'static' });
      var port = makePort(r);
      setKit(r, genre, spec.quality); setRoom(r, spec.room || r.kit.room || 'room');   // v0.8: spec.quality 0..3 (default: the career's tier)
      if (spec.voxInvert) { r.vox.gain.value *= -1; r.bvox.gain.value *= -1; if (genre === 'metal') metalRig(r).vox.gain.value *= -1; }   // tests: V/A split
      if (spec.lane) drumHit(r, port, spec.lane, 0.05, 2, spec.variant);
      else if (spec.probe) {
        var vt = spec.probe === 'vox' ? spec.voc || 'shout' : spec.probe, voc = !!VOX[vt], len = seconds - 0.3;
        var ev = { beat: 0, kind: voc ? 'vox' : spec.probe, voc: voc ? vt : null, midi: spec.midi || 36, len: 4, gap: 4, power: !!spec.power, mute: !!spec.mute };
        if (voc && (spec.singer || spec.rival || spec.probe === 'vox')) {   // v0.9: a singer's voice (profile pitch, formants, grit)
          ev.vp = A.voiceFor(spec.singer || null, genre, spec.rival || null); ev.midi = singNote(ev.midi, vt, ev.vp, { key: 0, B: {} });
          if (spec.word) ev.word = spec.word;
          tl = { key: null, voice: ev.vp.id, midi: ev.midi };
        }
        if (voc && VOX[vt].metal) metalVox(r, port, ev, 0.05, len, VOX[vt]);
        else if (voc) voxHit(r, port, ev, 0.05, len / 4);
        else playNote(r, port, ev, 0.05, len / 4);
      } else {
        tl = A.timeline(pat, { genre: genre, section: spec.full || radio ? null : (spec.section || 'verse'), bars: bars, style: style,
          drums: spec.drums != null ? spec.drums : !style, backing: spec.backing !== false, vocals: spec.vocals, songId: spec.songId,
          singer: spec.singer, rival: spec.rival, soloist: spec.soloist });
        var CR = null;
        if (spec.crowd) {   // (before the song's events: the crowd answers the band's gang shouts on their beats)
          var cOut = gainNode(oc, busGain('crowd'), dest);
          if (r.send) cOut.connect(gainNode(oc, 0.15, r.send));
          CR = crowdIn(cOut, Object.assign({ song: true, moments: [] }, spec.crowd), 0, { start: 0.05, spb: spb, tonic: tl.key.tonic });
        }
        tl.events.forEach(function (ev) {
          var t = 0.05 + ev.beat * spb;
          if (ev.kind === 'step') { if (spec.metronome && ev.step % 4 === 0) click(r, t, ev.step === 0); return; }
          if (spec.vocalsOnly && ev.kind !== 'vox' && ev.kind !== 'bvox') return;   // v0.9 tests: the singers alone
          tally[ev.kind] = (tally[ev.kind] || 0) + 1;
          schedule(r, port, ev, t, spb);
          if (ev.answer && CR && !CR.st.silent && CR.st.level >= 65) crowdReact(CR.B, CR.st, 'chant', t, ev.midi);
        });
      }
    }
    return oc.startRendering().then(function (buf) {
      var peak = 0, sum = 0, nan = false, n = 0, from = Math.floor(0.3 * buf.sampleRate), late = 0, nl = 0;
      for (var ch = 0; ch < buf.numberOfChannels; ch++) {
        var d = buf.getChannelData(ch);
        for (var i = 0; i < d.length; i++) { var v = d[i]; if (v !== v) nan = true; else { var a = Math.abs(v); if (a > peak) peak = a; sum += v * v; if (i >= from) late += v * v; } }
        n += d.length; nl += Math.max(0, d.length - from);
      }
      // tail: rms after the first 0.3 s (a single hit's sustain / ring; v0.8 kit quality tiers)
      return { peak: peak, rms: Math.sqrt(sum / n), tail: Math.sqrt(late / Math.max(1, nl)), nan: nan, seconds: seconds, counts: tally, key: tl ? tl.key : null, crowd: ct, buffer: buf,
        bed: bed, voice: tl ? tl.voice || null : null, midi: tl && tl.midi || null, solo: tl ? tl.solo || null : null, rigs: r ? { metal: !!r.metal, amps: Object.keys(r.amps || {}) } : null };
    });
  };
  A.renderOffline.probe = true;   // v0.7.2 feature flag (spec.probe, spec.crowd, stereo)

  GG.registerDebug('audio', function () {
    return { state: ctx ? ctx.state : 'none', muted: A.isMuted(), voices: voices, playing: A.isPlaying(),
      songVoices: rig ? rig.busy.filter(function (e) { return e > ctx.currentTime; }).length : 0,
      bandVoices: rig ? rig.band.filter(function (e) { return e > ctx.currentTime; }).length : 0,
      steps: stepCount, lastStep: lastStep, style: current ? current.style : null, key: current && current.key ? current.key.name : null,
      genre: rig ? rig.genre : null, room: rig ? rig.room : null, ambience: amb.mode, radio: amb.radioSong,
      crowd: { on: crowd.on, level: Math.round(crowd.level), size: Math.round(crowd.size * 100) / 100, song: crowd.song, silent: crowd.silent,
        clapping: crowd.clapping, ready: crowdReady(CB), waiting: !!crowd.waiting },
      mix: A.volumes(), metronome: P().metronome, counts: Object.assign({}, counts), ambVoices: live.amb, crowdVoices: live.crowd,
      // v0.9: which amps this rig has built (a punk career never builds the metal one), the room bed, the noodle, vocal types
      rigs: rig ? { metal: !!rig.metal, amps: Object.keys(rig.amps || {}) } : null, voice: current && current.timeline ? current.timeline.voice : null,
      solo: current && current.timeline ? current.timeline.solo : null, bed: amb.space ? { kind: amb.space.kind, season: amb.space.season, events: amb.space.events.map(function (x) { return x.ev; }) } : null,
      noodle: amb.noodle ? { who: amb.noodle.who, style: amb.noodle.style } : null, vocTypes: Object.assign({}, vocTypes), extras: CROWD_EXTRA.filter(function (k) { return CB && CB[k]; }) };
  });
})(window.GG);
