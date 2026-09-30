// 30_audio.js: every sound in the game, synthesized with Web Audio (no files).
// The AudioContext is created lazily on the first user gesture (GG.audio.unlock, wired in 60_main).
//   sfx:   tiny UI sounds, at most MAX_VOICES sources at once (extra sounds are dropped, never queued).
//   song:  a per-genre synth kit (6 lanes, v0.6.1 genre tuning from content/genres.js `kit`) + a generated band in a new
//          key per song (seeded by the song id) whose density follows the section (sparse verses, full choruses,
//          stripped breakdowns, solos), + synthesized vocal hits on the beat grid. Played by a look-ahead scheduler on
//          AudioContext.currentTime (never rAF time). timeline() turns a song into timed events; the gig reuses play().
//   rooms: a convolver per room class; the venue decides it during gigs (basements dry, Legion halls echo, arenas huge),
//          the genre kit otherwise (rock roomy, country dry).
//   ambience (bus events + state only): crowd bed + cheers/boos in gigs, garage hum with the guitarist noodling, van
//          road noise + the van radio (your best-charting song, quietly).
// Graph: sfx -> sfxBus(sfx) ─────────────────────────────────────────────────────────────────┐
//        ambience (garage, road, radio) -> ambBus(sfx) ───────────────────────────────────────┤
//        crowd bed, cheers, boos -> crowdBus(crowd) ──────────────────────────────────────────┤
//        song ports -> kit -> busDrums(drums) ┐                                                 ├> master (mute) -> ceiling -> out
//                   band/vocals -> busBand(band) ┴(+ room send -> convolver)-> glue -> limiter -> songOut ┘
// Song voices are capped at SONG_VOICES (the band at BAND_VOICES of them, so taps always sound): each lane/voice is
// monophonic (a hit chokes the previous one of its lane at the next hit's time) and the scheduler books every source.
//   GG.audio.unlock() ; sfx(name) ; setMuted(bool) ; isMuted() ; toggleMuted() ; suspend() ; resume()
//   play(pattern, { genre, section|null, loop, backing, drums, vocals, songId, metronome })
//     -> handle { stop(), update(pattern), beatAt(time), playing, start, bpm, key }
//     emits 'audio:step' { section, bar, step, time, entry } per 16th and 'audio:end' { handle } when a song finishes
//   hit(lane) (one drum hit now) ; stop() ; isPlaying() ; current() ; context()
//   timeline(pattern, opts) ; styleFor(genre, bpm) ; keyFor(seed, genre) ; roomFor(gig) ; renderOffline(spec) (tests)
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
(function (GG) {
  var A = GG.audio = GG.audio || {};
  var C = GG.contracts;
  var MAX_VOICES = 8, SFX_VOLUME = 0.32, SONG_VOLUME = 0.62, SONG_VOICES = 12, BAND_VOICES = 8, CROWD_VOICES = 8, AMB_VOICES = 6;
  var LOOKAHEAD = 0.12, TICK_MS = 25, LEAD_IN = 0.06;   // seconds scheduled ahead, scheduler period, start delay
  var BUSES = (C && C.MIX_BUSES) || ['drums', 'band', 'crowd', 'sfx'];
  var ctx = null, master = null, sfxBus = null, ambBus = null, crowdBus = null, noise = null, rig = null, BUF = null;
  var voices = 0, muted = null, suspended = false, current = null, stepCount = 0, lastStep = null;
  var prefs = null, mixNodes = [], counts = { clicks: 0, noodles: 0, thumps: 0, cheers: 0, boos: 0, vox: 0 }, live = { amb: 0, crowd: 0 };

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
      setKit(rig, (GG.state && GG.state.genre) || 'metal');
      applyRoom();
      setInterval(refresh, 1000);   // the garage scene can change without a screen event
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
    cheer: [2, function (t) {
      hiss(t, 1.1, 0.16, { type: 'bandpass', f0: 900, f1: 1600, q: 0.6 }, 0.25);
      hiss(t + 0.1, 0.9, 0.08, { type: 'bandpass', f0: 2600, f1: 2000, q: 2 }, 0.2);
    }],
    boo: [2, function (t) {
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
  // Per-playback inputs into the rig; stop() ramps them to silence and disconnects them.
  var PORTS = ['drums', 'gtr', 'dlead', 'clean', 'lead', 'bass', 'vox'];
  function makePort(r) {
    var p = {};
    PORTS.forEach(function (k) { p[k] = gainNode(r.ctx, 1, r[k]); });
    return p;
  }
  function closePort(r, port) {
    var t = r.ctx.currentTime;
    Object.keys(port).forEach(function (k) {
      port[k].gain.cancelScheduledValues(t); port[k].gain.setTargetAtTime(0, t, 0.015);
      setTimeout(function () { try { port[k].disconnect(); } catch (e) { /* ignore */ } }, 300);
    });
  }
  // Books `n` sources from t to t + dur against the voice cap (band notes also against the band's share).
  // false = no room (the hit is dropped).
  function book(r, t, dur, n, band) {
    r.busy = r.busy.filter(function (end) { return end > t; });
    if (band) { r.band = r.band.filter(function (end) { return end > t; }); if (r.band.length + n > r.bandCap) return false; }
    if (r.busy.length + n > r.cap) return false;
    for (var i = 0; i < n; i++) { r.busy.push(t + dur); if (band) r.band.push(t + dur); }
    return true;
  }
  function run(r, node, t, dur) { node.start(t); node.stop(t + dur); }
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
    if (!book(r, t, d, n)) return false;
    D.play(r, p, t, d, k, v);
    return true;
  }
  // Country train beat: rim clicks on the backbeat in verses, brushes (or ghost notes) in between.
  function snareVariant(step, role) {
    if (step % 8 === 4) return role === 'sparse' ? 'rim' : undefined;
    return P().brushes ? 'brush' : 'ghost';
  }

  /* ---- Vocal hits: a sawtooth (or a gang of two) through a 3-formant bank, pitched to the song's key ---------- */
  var VOWELS = { a: [730, 1090, 2440], e: [530, 1840, 2480], i: [270, 2290, 3010], o: [570, 840, 2410], u: [300, 870, 2240] };
  var VOX = {
    hey: { vw: ['e', 'e'], len: 0.3, steps: 2, breath: 0.05, bend: -3, peak: 0.9 },
    shout: { vw: ['a', 'o'], len: 0.5, steps: 4, breath: 0.04, bend: -4, peak: 0.85, drive: 3 },
    growl: { vw: ['o', 'u'], len: 1.0, steps: 8, rough: 0.07, peak: 0.9, drive: 6 },
    yeah: { vw: ['e', 'a'], len: 0.6, steps: 4, bend: -1, peak: 0.7, vib: 0.012 },
    yeehaw: { vw: ['i', 'a'], len: 0.8, steps: 6, yodel: true, peak: 0.75 },
    ooh: { vw: ['u', 'o'], len: 1.0, steps: 8, peak: 0.6, vib: 0.01 }
  };
  function voxHit(r, p, ev, t, spb) {
    var c = r.ctx, V = VOX[ev.voc] || VOX.hey, dur = Math.max(0.1, Math.min(V.len, ev.len * spb, ev.gap * spb));
    var gang = ev.gang ? 2 : 1, nz = V.breath || V.rough ? 1 : 0;
    if (!book(r, t, dur, gang + nz, true)) return;
    counts.vox++;
    var f = mtof(ev.midi), a = VOWELS[V.vw[0]], b = VOWELS[V.vw[1]];
    var out = held(c, t, V.peak, dur, p.vox, 0.012), into = gainNode(c, 1, null), input = into;
    if (V.drive) { var sh = c.createWaveShaper(); sh.curve = driveCurve(V.drive); input.connect(sh); into = sh; }
    [3, 1.8, 1.1].forEach(function (lv, k) {
      var bp = filterNode(c, 'bandpass', a[k], [7, 10, 12][k], gainNode(c, lv, out));
      bp.frequency.setValueAtTime(a[k], t); bp.frequency.linearRampToValueAtTime(b[k], t + dur * 0.7);
      into.connect(bp);
    });
    for (var g = 0; g < gang; g++) {
      var o = c.createOscillator(), fg = g ? f * 0.5 : f;   // the gang's second voice shouts an octave down
      o.type = 'sawtooth'; if (g) o.detune.value = 14;
      if (V.vib) o.frequency.setValueCurveAtTime(vibrato(fg, dur, 5.2, V.vib), t, dur);
      else if (V.rough) o.frequency.setValueCurveAtTime(jitter(fg, dur, V.rough, ev.midi * 31 + g), t, dur);
      else if (V.yodel) {   // "yee" up to the fourth, "haw" down past the root
        o.frequency.setValueAtTime(fg, t);
        o.frequency.exponentialRampToValueAtTime(fg * 1.335, t + dur * 0.3);
        o.frequency.exponentialRampToValueAtTime(fg * 0.84, t + dur);
      } else { o.frequency.setValueAtTime(fg, t); o.frequency.exponentialRampToValueAtTime(fg * Math.pow(2, (V.bend || 0) / 12), t + dur); }
      o.connect(input); run(r, o, t, dur);
    }
    if (nz) {   // the "h" of hey, or gravel under a growl
      var nd = V.rough ? dur : V.breath, s = c.createBufferSource(); s.buffer = r.noise;
      s.connect(decay(c, t, 0.003, V.rough ? 0.4 : 0.8, nd, input)); run(r, s, t, nd);
    }
  }

  // Band notes: 'gtr'/'gtr2' (distorted; power: root+fifth, mute: palm-muted), 'lead' (Dana's amp, bend), 'fiddle'
  // (vibrato), 'twang' (bent clean licks), 'clean' (strum: [intervals] staggered), 'bass', 'vox' (vocal hits).
  function playNote(r, p, ev, t, spb) {
    if (ev.kind === 'vox') { voxHit(r, p, ev, t, spb); return; }
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
  A.keyFor = function (seed, genre) {
    genre = genre || 'metal';
    var B = GG.songs.genre(genre).backing || {}, range = B.keys || [0, 0], mode = B.mode || 'minor';
    var off = GG.RNG(GG.hashSeed('key|' + genre + '|' + seed)).int(range[0], range[1]), tonic = (B.root || 40) + off;
    return { seed: String(seed), offset: off, tonic: tonic, mode: mode, name: NOTE[tonic % 12] + ' ' + mode };
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
  function inKey(midi, tonic, scale) {
    if (!scale || !scale.length) return midi;
    for (var d = 0; d < 12; d++) {
      if (scale.indexOf((((midi - d - tonic) % 12) + 12) % 12) >= 0) return midi - d;
      if (scale.indexOf((((midi + d - tonic) % 12) + 12) % 12) >= 0) return midi + d;
    }
    return midi;
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
      bass: function (s, len, midi) { return push('bass', s, len, { midi: (midi != null ? midi : o.root) - 12 }); },
      note: function (kind, s, len, midi, e) { return push(kind, s, len, Object.assign({ midi: midi }, e)); },
      vox: function (s, voc, midi, gang) { return push('vox', s, (VOX[voc] || VOX.hey).steps, { voc: voc, midi: inKey(midi, o.key, o.B.scale), gang: !!gang }); }
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
  var ARP = [0, 3, 7, 12, 15, 12, 7, 3];
  // One bar of band per genre. o: { style, sec, root (this bar's chord), next (next chord), key (tonic), riff, bar,
  // role: sparse | full | break | solo, bpm, B (genre backing), rng (seeded per song + section + bar) }.
  var BANDS = {
    metal: function (o, w) {
      var i, style = o.role === 'break' ? 'chug' : o.style;
      if (style === 'doom') { w.gtr(0, 8, { power: true }); w.bass(0, 8); w.gtr(8, 8, { power: true }); w.bass(8, 8); }
      else if (style === 'chug') chugs(o, w, o.role !== 'break');
      else for (i = 0; i < 16; i++) { var m = o.root + o.riff[i % o.riff.length]; w.gtr(i, 1, { midi: m }); w.bass(i, 1, m); }
      if (o.role === 'full') w.gtr2(0, 16);                     // Jaxon lets a chord ring over the chugs
      if (o.role === 'solo') {                                  // Dana's solo: fast arpeggios on the bar's chord
        var every = o.bpm > 190 ? 2 : 1;
        for (i = 0; i < 16; i += every) w.note('lead', i, every, o.root + 24 + ARP[(i / every) % ARP.length]);
      }
    },
    punk: function (o, w) {
      if (o.role === 'break') { chugs(o, w, false); return; }
      for (var i = 0; i < 16; i += 2) { w.gtr(i, 1.8, { power: true, mute: o.role === 'sparse' }); w.bass(i, 1.8); }
    },
    rock: function (o, w) {
      var i, m;
      if (o.role === 'sparse' || o.role === 'break') {      // the riff (muted in verses), bass underneath
        for (i = 0; i < 16; i += 2) {
          m = o.root + o.riff[(i / 2) % o.riff.length];
          w.gtr(i, 1.6, { midi: m, mute: o.role === 'sparse' });
          if (o.role === 'break') w.bass(i, 1.6, m);
        }
        if (o.role === 'sparse') for (i = 0; i < 16; i += 4) w.bass(i, 3.5);
        return;
      }
      [[0, 3], [3, 3], [6, 2], [8, 8]].forEach(function (x) { w.gtr(x[0], x[1], { power: true }); });   // big open chords
      [o.root, o.root + 4, o.root + 7, o.next === o.root ? o.root + 9 : o.next - 1].forEach(function (b, k) { w.bass(k * 4, 3.6, b); });   // walking
      if (o.role === 'solo') {                                  // a bluesy lead, bent into the long notes
        var sc = o.B.scale || [0, 3, 5, 7, 10], slots = [0, 2, 3, 6, 8, 10, 12, 14];
        slots.forEach(function (s, k) {
          if (k && o.rng.chance(0.25)) return;
          var len = k < slots.length - 1 ? slots[k + 1] - s : 16 - s;
          w.note('lead', s, len, o.key + 24 + sc[o.rng.int(0, sc.length - 1)] + (o.rng.chance(0.2) ? 12 : 0), len >= 3 ? { bend: 2 } : null);
        });
      }
    },
    country: function (o, w) {
      var i, full = o.role !== 'sparse', sc = o.B.scale || [0, 2, 4, 7, 9];
      w.bass(0, 4); w.bass(8, 4, o.root + 7);                   // boom on 1 and 3: root, fifth
      (full ? [4, 6, 12, 14] : [4, 12]).forEach(function (s) { w.note('clean', s, 1.5, o.root + 12, { strum: full ? [0, 4, 7] : [0, 7] }); });
      if (o.role === 'sparse' && o.bar % 2 === 1) {            // a twangy lick to end the phrase
        [10, 12, 14].forEach(function (s, k) { w.note('twang', s, 2, o.key + 24 + sc[o.rng.int(0, sc.length - 1)], k ? null : { bend: 2 }); });
      }
      if (o.role === 'full') [0, 8].forEach(function (s) { w.note('fiddle', s, 8, o.root + 24 + [0, 4, 7, 12][o.rng.int(0, 3)]); });
      if (o.role === 'solo') {                                  // the fiddle takes a solo
        for (i = 0; i < 16; i += 2) w.note('fiddle', i, 2, o.key + 24 + sc[o.rng.int(0, sc.length - 1)] + (o.rng.chance(0.3) ? 12 : 0), i ? null : { slide: true });
      }
    }
  };
  var KIND_RANK = { step: 0, drum: 1, vox: 2, gtr: 3, bass: 4, gtr2: 5, lead: 6, fiddle: 7, clean: 8, twang: 9 };
  // v0.8 extra sections: default roles when the genre's backing doesn't name them. 'ring' = the song's last chord, held.
  var EXTRA_ROLES = { outro: ['full', 'full', 'full', 'ring'], solo: ['solo', 'solo', 'solo', 'solo'] };
  var RING_BEATS = 2.5;   // how long the last chord rings past the end of an outro
  function ringBar(o, w, genre) {
    var len = 16 + RING_BEATS * 4;
    if (genre === 'country') { w.note('clean', 0, len, o.key + 12, { strum: [0, 4, 7], ring: true }); w.bass(0, len, o.key).ring = true; return; }
    w.gtr(0, len, { power: true, midi: o.key, ring: true }); w.bass(0, len, o.key).ring = true;
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
    var key = A.keyFor(opts.songId != null ? opts.songId : songIdOf(pattern), genre), band = BANDS[genre] || BANDS.metal;
    var V = opts.vocals === false ? null : B.vox, R = B.roles || {};
    var order = opts.section ? [opts.section] : p.arrangement, events = [], beat = 0, bars = 0, maxBars = opts.bars || Infinity, tail = 0;
    for (var e = 0; e < order.length && bars < maxBars; e++) {
      var name = order[e], sec = p.sections[name], prog = progression(B, sec, name), riff = riffFor(B, sec), roles = R[name] || EXTRA_ROLES[name] || ['full'];
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
        var root = role === 'break' ? key.tonic : key.tonic + prog[bar % prog.length];
        var o = { out: events, style: style.id, sec: sec, root: root, next: key.tonic + prog[(bar + 1) % prog.length], key: key.tonic,
          riff: riff, beat: beat, name: name, bar: bar, role: role, bpm: p.bpm, B: B, rng: GG.RNG(GG.hashSeed(key.seed + '|' + name + '|' + bar)) };
        var w = writer(o);
        if (role === 'ring') { if (e === order.length - 1) { ringBar(o, w, genre); tail = RING_BEATS; } else band(Object.assign(o, { role: 'full' }), w); continue; }   // v0.8 outro
        band(o, w);
        if (!V) continue;
        if (name === 'chorus' && V.hits) V.hits.forEach(function (h) { if (h[0] === o.bar) w.vox(h[1], h[2], o.root + h[3], h[4]); });
        if (role === 'break' && V.drop && (bar === 0 || roles[(bar - 1) % roles.length] !== 'break')) w.vox(0, V.drop[0], key.tonic + V.drop[1]);   // the drop
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
    return { bpm: p.bpm, beats: beat, tail: tail, style: style.id, styleLabel: style.label, key: key, events: events };
  };

  /* ---- Playback: the look-ahead scheduler --------------------------------------------------------------- */
  function schedule(r, port, ev, t, spb) {
    if (ev.kind === 'drum') drumHit(r, port, ev.lane, t, ev.gap * spb, ev.v);
    else playNote(r, port, ev, t, spb);
  }
  // One playback on a rig. quiet (the van radio): no 'audio:step' / 'audio:end', never the current song.
  function player(pattern, opts, R) {
    var r = R.rig, c = r.ctx, loop = opts.loop != null ? !!opts.loop : !!opts.section;
    var tl = A.timeline(pattern, opts), spb = 60 / tl.bpm, port = makePort(r), timers = [];
    var i = 0, pass = 0, lastBeat = -1;
    var h = { playing: true, loop: loop, section: opts.section || null, bpm: tl.bpm, beats: tl.beats, style: tl.style, key: tl.key,
      genre: opts.genre || 'metal', start: c.currentTime + LEAD_IN, timeline: tl, radio: !!R.quiet };
    function at(ev) { return h.start + (pass * tl.beats + ev.beat) * spb; }
    function pump() {
      if (!h.playing) return;
      var now = c.currentTime, horizon = now + LOOKAHEAD;
      for (;;) {
        if (i >= tl.events.length) {
          if (!loop) { if (now > h.start + (tl.beats + (tl.tail || 0)) * spb + 0.2) h.stop(true); return; }   // v0.8: an outro rings out
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
    // ended = the song finished by itself (or the app went to the background): emits 'audio:end' { handle }.
    h.stop = function (ended) {
      if (!h.playing) return;
      h.playing = false;
      clearInterval(h.timer);
      timers.forEach(function (x) { clearTimeout(x.id); });
      closePort(r, port);
      if (current === h) current = null;
      if (ended === true && !R.quiet) GG.emit('audio:end', { handle: h });
    };
    h.timer = setInterval(pump, TICK_MS);
    if (!R.quiet) current = h;
    pump();
    return h;
  }
  // Plays a pattern (one section on loop, or the whole arrangement). Emits 'audio:step' { section, bar, step, time,
  // entry, role } for every 16th, fired by short timeouts aligned to the scheduled AudioContext times. One song at a time.
  // opts: { genre, section|null, loop (default: true for a section, false for the song), backing (default true), drums,
  //         vocals, songId (the key seed), metronome (true = click quarter notes while settings.metronome is on) }
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
  var previewPort = null;
  // v0.6.2: `when` (optional AudioContext time) schedules the hit ahead on the audio clock (the gig's two-thumb auto notes).
  A.hit = function (lane, when) {
    if (!ctx || suspended || ctx.state !== 'running' || A.isMuted()) return false;
    if (!previewPort) previewPort = makePort(rig);
    var playing = current && current.playing, t = ctx.currentTime + 0.005, v;
    if (when > t && when < t + 1) t = when;
    if (!playing) setKit(rig, (GG.state && GG.state.genre) || rig.genre || 'metal');   // (the career's kit tier)
    if (lane === 'toms') { var T = rig.tom; T.i = t - T.t < 0.32 ? Math.min(2, T.i + 1) : 0; T.t = t; v = T.i; }
    else if (lane === 'snare' && rig.kit && rig.kit.train) {
      var step = playing ? ((Math.round(current.beatAt(t) * 4) % 16) + 16) % 16 : 4;
      v = snareVariant(step, lastStep && playing ? lastStep.role : 'full');
    }
    drumHit(rig, previewPort, lane, t, lane === 'cymbal' ? 0.9 : 0.5, v);
    return true;
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
  function crowdBed(c, dest, t0, B) {   // a room full of people talking over each other
    var g = gainNode(c, 0.0001, dest), s = bedSource(c, B.murmur, null, t0);
    s.connect(filterNode(c, 'bandpass', 750, 0.6, gainNode(c, 1, g)));
    s.connect(filterNode(c, 'bandpass', 2100, 1.4, gainNode(c, 0.35, g)));
    return { gain: g, srcs: [s] };
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
  function cheer(c, dest, t, size, nz) {   // a roar that swells, a whistle, a "woo"
    var s = c.createBufferSource(); s.buffer = nz; s.loop = true;
    var f = filterNode(c, 'bandpass', 800, 0.5, decay(c, t, 0.25, 0.45 * size, 1.7, dest));
    f.frequency.setValueAtTime(800, t); f.frequency.exponentialRampToValueAtTime(1500, t + 0.6);
    s.connect(f); s.start(t); s.stop(t + 1.8);
    var w = c.createOscillator(); w.frequency.setValueAtTime(2100, t + 0.15); w.frequency.exponentialRampToValueAtTime(2900, t + 0.45);
    w.frequency.exponentialRampToValueAtTime(2400, t + 0.7); w.connect(decay(c, t + 0.15, 0.03, 0.05 * size, 0.6, dest)); w.start(t + 0.15); w.stop(t + 0.8);
    var o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(330, t + 0.05); o.frequency.exponentialRampToValueAtTime(520, t + 0.45);
    o.connect(filterNode(c, 'bandpass', 850, 5, decay(c, t + 0.05, 0.08, 0.3 * size, 0.9, dest))); o.start(t + 0.05); o.stop(t + 1);
    return [s, w, o];
  }
  function boo(c, dest, t, size) {   // "booo", in three flat voices
    var out = filterNode(c, 'lowpass', 600, 1, decay(c, t, 0.15, 0.2 * size, 1.3, dest));
    return [150, 157, 143].map(function (f) {
      var o = c.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.85, t + 1.3);
      o.connect(out); o.start(t); o.stop(t + 1.4);
      return o;
    });
  }
  function track(srcs, pool) {
    srcs.forEach(function (s) { live[pool]++; s.onended = function () { live[pool] = Math.max(0, live[pool] - 1); }; });
  }

  var amb = { mode: 'none', bed: null, timer: 0, noodle: null, road: null, radio: null, radioSong: null };
  var crowd = { on: false, level: 50, size: 1, bed: null, last: -9 };
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
    if (m !== amb.mode) setMode(m);
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
    amb.bed = crowd.bed = null; crowd.on = false;
    if (amb.timer) { clearInterval(amb.timer); amb.timer = 0; }
    stopRadio();
    amb.mode = m;
    if (m === 'gig' || prev === 'gig') { gigRoom = m === 'gig' ? A.roomFor(GG.state.liveGig.gig) : null; applyRoom(); }
    if (m !== 'none' && !BUF) BUF = { brown: loopBuffer(ctx, 'brown'), murmur: loopBuffer(ctx, 'murmur'), white: noise };
    try {
      if (m === 'garage') startGarage(t);
      else if (m === 'van') startVan(t);
      else if (m === 'gig') startCrowd(t);
      else if (m === 'storm') amb.bed = stormBed(ctx, ambBus, t, BUF);
    } catch (e) { /* ambience never breaks the game */ }
  }
  // The guitarist noodles in the garage (Dana in Hail Damage), in the key of your newest song.
  function guitarist(st) {
    var act = (st.members || []).filter(function (m) { return m && (m.status || 'active') === 'active'; });
    return act.filter(function (m) { return m.id === 'dana'; })[0] || act.filter(function (m) { return /lead guitar/i.test(m.role || ''); })[0] ||
      act.filter(function (m) { return /guitar/i.test(m.role || ''); })[0] || null;
  }
  function startGarage(t) {
    amb.bed = garageBed(ctx, ambBus, t, BUF);
    var st = GG.state, genre = st.genre || 'metal', who = guitarist(st);
    if (!who) return;
    var songs = st.songs || [], key = A.keyFor(songs.length ? songs[songs.length - 1].id : 'garage', genre);
    amb.noodle = { who: who.id, tonic: key.tonic + 24, scale: (GG.songs.genre(genre).backing || {}).scale || [0, 2, 3, 5, 7, 8, 10],
      rng: GG.RNG(GG.hashSeed('noodle|' + (st.totalWeek || 0))), next: t + 1.5, left: 0 };
    amb.timer = setInterval(noodle, 200);
  }
  function noodle() {
    var N = amb.noodle; if (!ctx || amb.mode !== 'garage' || !N || !amb.bed) return;
    var now = ctx.currentTime;
    if (N.next < now) N.next = now + 0.05;   // a throttled tab doesn't pile notes up
    while (N.next < now + 0.3) {
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
  // The crowd: a bed that swells with the meter, cheers and boos on crowd moments (bigger rooms, bigger crowds).
  function startCrowd(t) {
    var lg = GG.state.liveGig, att = +(lg.attendance || lg.gig.capacity || 80);
    crowd.on = true; crowd.last = -9;
    crowd.size = Math.max(0.5, Math.min(1.4, 0.5 + 0.3 * Math.log(Math.max(10, att)) / Math.LN10));
    crowd.bed = crowdBed(ctx, crowdBus, t, BUF);
    setCrowd(typeof lg.crowd === 'number' ? lg.crowd : 40);
  }
  function setCrowd(v) {
    if (typeof v !== 'number' || v !== v) return;
    crowd.level = Math.max(0, Math.min(100, v));
    if (crowd.bed && ctx) crowd.bed.gain.gain.setTargetAtTime((0.04 + 0.26 * crowd.level / 100) * crowd.size, ctx.currentTime, 0.5);
  }
  GG.on('crowd:level', function (p) { if (crowd.on && p) setCrowd(p.crowd); });
  GG.on('gig:judge', function (p) { if (crowd.on && p) setCrowd(p.crowd); });
  GG.on('crowd:moment', function (p) {
    if (!crowd.on || !p || !ctx || ctx.state !== 'running' || A.isMuted() || p.kind === 'drinks') return;
    var t = ctx.currentTime + 0.02;
    crowd.last = ctx.currentTime;
    if (live.crowd + 3 > CROWD_VOICES) return;
    if (p.kind === 'boo') { track(boo(ctx, crowdBus, t, crowd.size), 'crowd'); counts.boos++; }
    else { track(cheer(ctx, crowdBus, t, crowd.size * (p.kind === 'solo' ? 0.6 : 1), noise), 'crowd'); counts.cheers++; }
  });
  GG.on('screen:open', refreshSoon);
  GG.on('screen:close', refreshSoon);
  GG.on('ui:stack', refreshSoon);
  A.ambience = function () { return amb.mode; };
  A.refreshAmbience = function () { refresh(); return amb.mode; };

  /* ---- Offline render (tests, mixing): -> Promise<{ peak, rms, tail, nan, seconds, counts, key }> ------------- */
  // spec: { lane, variant, quality (v0.8 kit tier 0..3) } one drum hit | { pattern (default the genre's signature), genre, bpm, songId, section (default
  //         'verse'), full (whole arrangement), bars (default 2), backing: styleId (that style alone) | true | false,
  //         drums (default: !styleId), vocals, metronome, room (default the kit's) }
  //       | { ambience: 'garage' | 'van' | 'crowd' | 'radio', level (crowd 0..100), seconds, genre, pattern }
  // Mixer levels apply (static), so setVolume(bus, 0) silences that bus here too.
  A.renderOffline = function (spec) {
    spec = spec || {};
    var OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OAC) return Promise.reject(new Error('no OfflineAudioContext'));
    var genre = spec.genre || 'metal', bars = spec.bars || 2, style = typeof spec.backing === 'string' ? spec.backing : null;
    var pat = GG.songs.sanitize(spec.pattern || GG.songs.genre(genre).signature, null, null, true);
    if (spec.bpm) pat.bpm = spec.bpm;
    var sr = 44100, spb = 60 / pat.bpm, amb = spec.ambience, tail = spec.room ? ROOMS[spec.room].len : 0;
    var seconds = spec.seconds || (amb ? 2.6 : spec.lane ? 1.6 + tail : bars * 4 * spb + 1.4 + tail);
    var oc = new OAC(1, Math.ceil(sr * seconds), sr), dest = oc.destination, tally = {}, tl = null;
    if (amb && amb !== 'radio') {
      var nz = noiseBuffer(oc), Bf = { brown: loopBuffer(oc, 'brown'), murmur: loopBuffer(oc, 'murmur'), white: nz };
      var sfxOut = gainNode(oc, busGain('sfx'), dest), crowdOut = gainNode(oc, busGain('crowd'), dest);
      if (amb === 'garage') { var gb = garageBed(oc, sfxOut, 0, Bf); [0.4, 0.64, 0.88, 1.5].forEach(function (t, k) { pluck(oc, gb.gain, t, 64 + [0, 3, 5, 7][k], 0.035); }); }
      else if (amb === 'van') { roadBed(oc, sfxOut, 0, Bf); thump(oc, sfxOut, 0.5, nz); thump(oc, sfxOut, 1.7, nz); }
      else if (amb === 'crowd') {
        var cb = crowdBed(oc, crowdOut, 0, Bf), lv = spec.level != null ? spec.level : 70;
        cb.gain.gain.setTargetAtTime(0.04 + 0.26 * lv / 100, 0, 0.2);
        cheer(oc, crowdOut, 0.3, 1.2, nz); boo(oc, crowdOut, 1.1, 1.2);
      }
    } else {
      var radio = amb === 'radio', r = makeRig(oc, radio ? radioChain(oc, gainNode(oc, 0.3 * busGain('sfx'), dest)) : dest, null,
        radio ? { mix: false, verb: false, voices: 8, bandVoices: 6, level: 0.9 } : { mix: 'static' });
      var port = makePort(r);
      setKit(r, genre, spec.quality); setRoom(r, spec.room || r.kit.room || 'room');   // v0.8: spec.quality 0..3 (default: the career's tier)
      if (spec.lane) drumHit(r, port, spec.lane, 0.05, 2, spec.variant);
      else {
        tl = A.timeline(pat, { genre: genre, section: spec.full || radio ? null : (spec.section || 'verse'), bars: bars, style: style,
          drums: spec.drums != null ? spec.drums : !style, backing: spec.backing !== false, vocals: spec.vocals, songId: spec.songId });
        tl.events.forEach(function (ev) {
          var t = 0.05 + ev.beat * spb;
          if (ev.kind === 'step') { if (spec.metronome && ev.step % 4 === 0) click(r, t, ev.step === 0); return; }
          tally[ev.kind] = (tally[ev.kind] || 0) + 1;
          schedule(r, port, ev, t, spb);
        });
      }
    }
    return oc.startRendering().then(function (buf) {
      var d = buf.getChannelData(0), peak = 0, sum = 0, nan = false, from = Math.floor(0.3 * sr), late = 0;
      for (var i = 0; i < d.length; i++) { var v = d[i]; if (v !== v) nan = true; else { var a = Math.abs(v); if (a > peak) peak = a; sum += v * v; if (i >= from) late += v * v; } }
      // tail: rms after the first 0.3 s (a single hit's sustain / ring; v0.8 kit quality tiers)
      return { peak: peak, rms: Math.sqrt(sum / d.length), tail: Math.sqrt(late / Math.max(1, d.length - from)), nan: nan, seconds: seconds, counts: tally, key: tl ? tl.key : null };
    });
  };

  GG.registerDebug('audio', function () {
    return { state: ctx ? ctx.state : 'none', muted: A.isMuted(), voices: voices, playing: A.isPlaying(),
      songVoices: rig ? rig.busy.filter(function (e) { return e > ctx.currentTime; }).length : 0,
      bandVoices: rig ? rig.band.filter(function (e) { return e > ctx.currentTime; }).length : 0,
      steps: stepCount, lastStep: lastStep, style: current ? current.style : null, key: current && current.key ? current.key.name : null,
      genre: rig ? rig.genre : null, room: rig ? rig.room : null, ambience: amb.mode, radio: amb.radioSong,
      crowd: { on: crowd.on, level: Math.round(crowd.level), size: Math.round(crowd.size * 100) / 100 },
      mix: A.volumes(), metronome: P().metronome, counts: Object.assign({}, counts), ambVoices: live.amb, crowdVoices: live.crowd };
  });
})(window.GG);
