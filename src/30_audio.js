// 30_audio.js: every sound in the game, synthesized with Web Audio (no files).
// The AudioContext is created lazily on the first user gesture (GG.audio.unlock, wired in 60_main).
//   sfx:  tiny UI sounds, at most MAX_VOICES sources at once (extra sounds are dropped, never queued).
//   song: a punchy synth kit (6 lanes) + a generated backing band, played by a look-ahead scheduler that runs on
//         AudioContext.currentTime (never rAF time). timeline() turns a song into timed events; v0.3's rhythm game
//         reuses it (and play()'s handle.beatAt) for its note highway.
// Graph: sfx -> sfxBus ------------------------------------------------------------------------┐
//        song voices -> per-play ports -> drums | guitar (drive + cab) | clean | bass -> glue comp -> limiter -> songOut ┴> master (mute) -> out
// Song voices are capped at SONG_VOICES (backing included): each lane/voice is monophonic (a hit chokes the previous one
// of its lane at the next hit's time) and the scheduler counts every source it has booked.
//   GG.audio.unlock() ; sfx(name) ; setMuted(bool) ; isMuted() ; toggleMuted() ; suspend() ; resume()
//   play(pattern, { genre, section|null, loop, backing }) -> handle { stop(), update(pattern), beatAt(time), playing }
//     emits 'audio:step' { section, bar, step, time, entry } per 16th and 'audio:end' { handle } when a song finishes
//   hit(lane) (one drum hit now)
//   stop() ; isPlaying() ; timeline(pattern, opts) ; styleFor(genre, bpm) ; renderOffline(spec) (tests)
(function (GG) {
  var A = GG.audio = GG.audio || {};
  var C = GG.contracts;
  var MAX_VOICES = 8, SFX_VOLUME = 0.32, SONG_VOLUME = 0.62, SONG_VOICES = 12;
  var LOOKAHEAD = 0.12, TICK_MS = 25, LEAD_IN = 0.06;   // seconds scheduled ahead, scheduler period, start delay
  var ctx = null, master = null, sfxBus = null, noise = null, rig = null, voices = 0, muted = null, suspended = false;
  var current = null, stepCount = 0, lastStep = null;

  function settings() {
    try { return (GG.save && GG.save.settings && GG.save.settings()) || {}; } catch (e) { return {}; }
  }
  A.isMuted = function () { if (muted === null) muted = !!settings().muted; return muted; };
  // One second of white noise per context, shared by every noisy sound.
  function noiseBuffer(c) {
    var b = c.createBuffer(1, c.sampleRate, c.sampleRate), d = b.getChannelData(0), s = 22222;
    for (var i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = s / 1073741823.5 - 1; }
    return b;
  }

  A.unlock = function () {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      try { ctx = new AC(); } catch (e) { ctx = null; return false; }
      master = ctx.createGain();
      master.gain.value = A.isMuted() ? 0 : 1;
      master.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.gain.value = SFX_VOLUME; sfxBus.connect(master);
      noise = noiseBuffer(ctx);
      rig = makeRig(ctx, master, noise);
    }
    if (ctx.state === 'suspended' && !suspended) { try { ctx.resume(); } catch (e) { /* ignore */ } }
    return true;
  };

  A.setMuted = function (m) {
    muted = !!m;
    if (master) master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.02);
    try { if (GG.save && GG.save.saveSettings) GG.save.saveSettings(Object.assign({}, settings(), { muted: muted })); } catch (e) { /* ignore */ }
    return muted;
  };
  A.toggleMuted = function () { return A.setMuted(!A.isMuted()); };
  // The app went to the background: stop any song and freeze the context.
  A.suspend = function () { suspended = true; if (current) current.stop(true); if (ctx && ctx.state === 'running') { try { ctx.suspend(); } catch (e) { /* ignore */ } } };
  A.resume = function () { suspended = false; if (ctx && ctx.state === 'suspended') { try { ctx.resume(); } catch (e) { /* ignore */ } } };

  /* ---- SFX building blocks ----------------------------------------------------------------------------- */
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
    g.connect(dest || sfxBus);
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
    save: [2, function (t) { tone('sine', 660, 0, t, 0.14, 0.1); tone('sine', 990, 0, t + 0.11, 0.26, 0.1); }]
  };

  A.sfx = function (name) {
    var r = SFX[name];
    if (!r || !ctx || A.isMuted() || suspended || ctx.state !== 'running') return false;
    if (voices + r[0] > MAX_VOICES) return false;
    try { r[1](ctx.currentTime + 0.01); } catch (e) { return false; }
    return true;
  };

  /* ======================================================================================================
     Song engine: a rig (shared processing per context) + ports (per playback, so stop() can silence
     everything already booked) + voices (drum lanes and backing notes) + the look-ahead scheduler.
     ====================================================================================================== */
  function gainNode(c, v, dest) { var g = c.createGain(); g.gain.value = v; if (dest) g.connect(dest); return g; }
  function filterNode(c, type, f, q, dest) { var n = c.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q || 0.7; if (dest) n.connect(dest); return n; }
  // Soft clipper for the guitar: y = (1+k)x / (1+k|x|), always inside -1..1.
  function driveCurve(k) {
    var n = 1024, c = new Float32Array(n);
    for (var i = 0; i < n; i++) { var x = i * 2 / (n - 1) - 1; c[i] = (1 + k) * x / (1 + k * Math.abs(x)); }
    return c;
  }
  function makeRig(c, dest, nz) {
    var r = { ctx: c, noise: nz || noiseBuffer(c), busy: [] };
    var glue = c.createDynamicsCompressor();
    glue.threshold.value = -16; glue.knee.value = 8; glue.ratio.value = 4; glue.attack.value = 0.004; glue.release.value = 0.2;
    var limit = c.createDynamicsCompressor();   // brick-wall-ish: nothing clips on phone speakers
    limit.threshold.value = -4; limit.knee.value = 0; limit.ratio.value = 20; limit.attack.value = 0.001; limit.release.value = 0.08;
    r.out = gainNode(c, SONG_VOLUME, dest);
    glue.connect(limit); limit.connect(r.out);
    r.drums = gainNode(c, 0.8, glue);
    var shaper = c.createWaveShaper(); shaper.curve = driveCurve(18); shaper.oversample = '2x';
    var cab = filterNode(c, 'lowpass', 3600, 0.9, filterNode(c, 'highpass', 90, 0.7, gainNode(c, 0.09, glue)));
    shaper.connect(cab);
    r.gtr = gainNode(c, 1, shaper);
    r.clean = gainNode(c, 0.5, filterNode(c, 'lowpass', 2600, 0.7, glue));
    r.bass = gainNode(c, 0.38, filterNode(c, 'lowpass', 700, 0.8, glue));
    return r;
  }
  // Per-playback inputs into the rig; stop() ramps them to silence and disconnects them.
  function makePort(r) {
    var c = r.ctx;
    return { drums: gainNode(c, 1, r.drums), gtr: gainNode(c, 1, r.gtr), clean: gainNode(c, 1, r.clean), bass: gainNode(c, 1, r.bass) };
  }
  function closePort(r, port) {
    var t = r.ctx.currentTime;
    Object.keys(port).forEach(function (k) {
      port[k].gain.cancelScheduledValues(t); port[k].gain.setTargetAtTime(0, t, 0.015);
      setTimeout(function () { try { port[k].disconnect(); } catch (e) { /* ignore */ } }, 300);
    });
  }
  // Books `n` sources from t to t + dur against the voice cap. false = no room (the hit is dropped).
  function book(r, t, dur, n) {
    r.busy = r.busy.filter(function (end) { return end > t; });
    if (r.busy.length + n > SONG_VOICES) return false;
    for (var i = 0; i < n; i++) r.busy.push(t + dur);
    return true;
  }
  function run(r, node, t, dur) { node.start(t); node.stop(t + dur); }
  // Envelope gain: attack to peak, then an exponential decay to silence at t + dur (a choke shortens dur).
  function decay(c, t, attack, peak, dur, dest) {
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, attack + 0.01));
    g.connect(dest);
    return g;
  }
  // Held note: attack, a gentle sag, then a short release that ends at t + dur.
  function held(c, t, peak, dur, dest) {
    var g = c.createGain(), rel = Math.min(0.05, dur * 0.3);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.006);
    g.gain.linearRampToValueAtTime(peak * 0.7, t + Math.max(0.01, dur - rel));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
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

  // Drum voices: [sources, natural length in s, play(rig, port, time, d)] where d = the natural length, cut short
  // (choked) by the next hit of the same lane. Owner call: a punchy real-ish kit (thumpy kick, cracky snare,
  // crisp hats, splashy cymbal).
  var DRUMS = {
    kick: [2, 0.42, function (r, p, t, d) {
      var c = r.ctx;
      osc(r, 'sine', 165, 50, 0.07, t, d, decay(c, t, 0.002, 1, d, p.drums));
      noiseHit(r, t, Math.min(0.018, d), decay(c, t, 0.001, 0.4, Math.min(0.018, d), p.drums), 'highpass', 2600, 0.7);
    }],
    snare: [2, 0.22, function (r, p, t, d) {
      var c = r.ctx, body = Math.min(0.11, d), wires = d;
      osc(r, 'triangle', 230, 170, 0.06, t, body, decay(c, t, 0.001, 0.55, body, p.drums));
      noiseHit(r, t, wires, decay(c, t, 0.001, 0.75, wires, p.drums), 'highpass', 1400, 0.8);
    }],
    hat: [1, 0.055, function (r, p, t, d) {
      noiseHit(r, t, d, decay(r.ctx, t, 0.001, 0.4, d, p.drums), 'highpass', 7800, 0.9);
    }],
    cymbal: [1, 1.3, function (r, p, t, d) {
      noiseHit(r, t, d, decay(r.ctx, t, 0.002, 0.42, d, p.drums), 'highpass', 9000, 0.6, 4800);
    }],
    toms: [1, 0.36, function (r, p, t, d) {
      osc(r, 'sine', 200, 110, 0.2, t, d, decay(r.ctx, t, 0.002, 0.85, d, p.drums));
    }],
    ride: [2, 0.5, function (r, p, t, d) {
      var c = r.ctx;
      noiseHit(r, t, d, decay(c, t, 0.001, 0.2, d, p.drums), 'bandpass', 6400, 1.4);
      osc(r, 'triangle', 1180, 0, 0, t, d, decay(c, t, 0.001, 0.07, d, p.drums));
    }]
  };
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  // Backing notes: kind 'gtr' (distorted; power: root+fifth, mute: palm-muted), 'clean' (strum) or 'bass'.
  function playNote(r, p, ev, t, spb) {
    var c = r.ctx, dur = Math.max(0.03, Math.min(ev.len, ev.gap) * spb), f = mtof(ev.midi);
    if (ev.kind === 'bass') {
      if (!book(r, t, dur, 1)) return;
      osc(r, 'sawtooth', f, 0, 0, t, dur, ev.len <= 0.5 ? decay(c, t, 0.004, 0.55, dur, p.bass) : held(c, t, 0.4, dur, p.bass));
      return;
    }
    var n = ev.power ? 2 : 1, dest = ev.kind === 'clean' ? p.clean : p.gtr;
    if (!book(r, t, dur, n)) return;
    var tone = filterNode(c, 'lowpass', ev.mute ? 700 : 3200, ev.mute ? 1.2 : 0.7, dest);
    var g = ev.mute || ev.kind === 'clean' ? decay(c, t, 0.003, ev.kind === 'clean' ? 0.35 : 0.9, dur, tone) : held(c, t, 0.55, dur, tone);
    var type = ev.kind === 'clean' ? 'triangle' : 'sawtooth';
    osc(r, type, f, 0, 0, t, dur, g, -7);
    if (ev.power) osc(r, type, f * 1.4983, 0, 0, t, dur, g, 7);
  }
  function drumHit(r, p, lane, t, cap) {
    var v = DRUMS[lane]; if (!v) return;
    var d = Math.max(0.012, Math.min(v[1], cap));
    if (book(r, t, d, v[0])) v[2](r, p, t, d);
  }

  /* ---- Timeline: song -> timed events ------------------------------------------------------------------ */
  // The backing style a genre uses at this tempo: { id, label } (metal: doom / chug / tremolo, per the owner).
  A.styleFor = function (genre, bpm) {
    var styles = (GG.songs.genre(genre).backing || {}).styles || [[0, 'chug', 'Chugs']], s = styles[0];
    styles.forEach(function (x) { if (bpm >= x[0]) s = x; });
    return { id: s[1], label: s[2] };
  };
  // Chords follow the song: each section picks a progression from the genre list, keyed by its kick+snare
  // skeleton, so the guitarist answers what you wrote (and verse/chorus/bridge differ).
  function progression(B, sec, name) {
    var list = (B.progressions || {})[name] || [[0, 0, 0, 0]];
    return list[GG.hashSeed(name + '|' + (sec[0] || '') + (sec[1] || '')) % list.length];
  }
  function riffFor(B, sec) { var list = B.riffs || [[0]]; return list[GG.hashSeed('riff|' + (sec[0] || '')) % list.length]; }
  var HIT = 120;   // 'x'
  // One bar of backing notes. Lengths are in steps (16ths); beats are quarter notes.
  function backingBar(out, style, sec, root, riff, beat, name) {
    var kick = sec[0] || '', cym = sec[3] || '', b = function (step) { return beat + step / 4; };
    function gtr(step, len, o) { out.push(Object.assign({ beat: b(step), kind: 'gtr', midi: root, len: len / 4, section: name }, o || {})); }
    function bass(step, len, midi) { out.push({ beat: b(step), kind: 'bass', midi: (midi || root) - 12, len: len / 4, section: name }); }
    var i;
    if (style === 'doom') {                          // slow: two huge sustained chords per bar
      gtr(0, 8, { power: true }); bass(0, 8); gtr(8, 8, { power: true }); bass(8, 8);
    } else if (style === 'chug') {                   // mid: palm-muted chugs locked to the kick, open chord on a crash
      var any = false;
      for (i = 0; i < 16; i++) {
        if (kick.charCodeAt(i) !== HIT) continue;
        any = true;
        var open = i === 0 && cym.charCodeAt(0) === HIT;
        gtr(i, open ? 4 : 1.5, { power: true, mute: !open }); bass(i, open ? 4 : 1.5);
      }
      if (!any) for (i = 0; i < 16; i += 2) { gtr(i, 1.5, { power: true, mute: true }); bass(i, 1.5); }
    } else if (style === 'tremolo') {                // fast: tremolo-picked 16ths along a riff, bass doubles
      for (i = 0; i < 16; i++) { var m = root + riff[i % riff.length]; gtr(i, 1, { midi: m }); bass(i, 1, m); }
    } else if (style === 'eighths') {                // punk: downstroke power chords on every 8th
      for (i = 0; i < 16; i += 2) { gtr(i, 1.8, { power: true }); bass(i, 1.8); }
    } else if (style === 'rock') {                   // rock: big open chords with a push
      [[0, 3], [3, 3], [6, 2], [8, 8]].forEach(function (x) { gtr(x[0], x[1], { power: true }); });
      for (i = 0; i < 16; i += 2) bass(i, 2);
    } else if (style === 'boomchick') {              // country: bass boom on 1/3 (root, fifth), clean chick on 2/4
      bass(0, 4); bass(8, 4, root + 7);
      [4, 12].forEach(function (s) { out.push({ beat: b(s), kind: 'clean', midi: root + 12, power: true, len: 0.5, section: name }); });
    }
  }
  var KIND_RANK = { step: 0, drum: 1, gtr: 2, clean: 3, bass: 4 };
  // Song (or one section) -> { bpm, beats, style, styleLabel, events: [{ beat, kind: 'step'|'drum'|'gtr'|'clean'|'bass',
  //   lane?, midi?, len (beats), gap (beats to the next event of the same voice, wrapping), section, entry, bar, step? }] }
  // opts: { genre, section (null = the whole arrangement), backing (default true), drums (default true),
  //         style (force a backing style), bars (limit, tests) }. Pure: no AudioContext needed.
  A.timeline = function (pattern, opts) {
    opts = opts || {};
    var p = GG.songs.sanitize(pattern && pattern.pattern || pattern, null, null, true), genre = opts.genre || 'metal';
    var B = GG.songs.genre(genre).backing || {}, style = opts.style ? { id: opts.style, label: opts.style } : A.styleFor(genre, p.bpm);
    var order = opts.section ? [opts.section] : p.arrangement, events = [], beat = 0, bars = 0, maxBars = opts.bars || Infinity;
    for (var e = 0; e < order.length && bars < maxBars; e++) {
      var name = order[e], sec = p.sections[name], prog = progression(B, sec, name), riff = riffFor(B, sec);
      for (var bar = 0; bar < C.BARS_PER_SECTION && bars < maxBars; bar++, bars++, beat += 4) {
        for (var step = 0; step < C.STEPS; step++) {
          var at = beat + step / 4;
          events.push({ beat: at, kind: 'step', section: name, entry: e, bar: bar, step: step });
          if (opts.drums === false) continue;
          for (var l = 0; l < p.lanes; l++) if (sec[l].charCodeAt(step) === HIT) events.push({ beat: at, kind: 'drum', lane: C.LANES[l], li: l, section: name });
        }
        if (opts.backing !== false) backingBar(events, style.id, sec, (B.root || 40) + prog[bar % prog.length], riff, beat, name);
      }
    }
    events.sort(function (a, b) { return a.beat - b.beat || KIND_RANK[a.kind] - KIND_RANK[b.kind] || (a.li || 0) - (b.li || 0); });
    // Gap to the next event of the same voice (drum lane / guitar / bass), wrapping around for loops.
    var next = {};
    for (var i = events.length - 1; i >= 0; i--) {
      var ev = events[i]; if (ev.kind === 'step') continue;
      var key = ev.kind === 'drum' ? ev.lane : ev.kind;
      ev.gap = next[key] != null ? next[key] - ev.beat : Infinity;
      next[key] = ev.beat;
      if (ev.len == null) ev.len = Infinity;
    }
    events.forEach(function (ev) {
      if (ev.gap === Infinity) { var key = ev.kind === 'drum' ? ev.lane : ev.kind; ev.gap = beat - ev.beat + next[key]; }
    });
    return { bpm: p.bpm, beats: beat, style: style.id, styleLabel: style.label, events: events };
  };

  /* ---- Playback: the look-ahead scheduler --------------------------------------------------------------- */
  function schedule(r, port, ev, t, spb) {
    if (ev.kind === 'drum') drumHit(r, port, ev.lane, t, ev.gap * spb);
    else playNote(r, port, ev, t, spb);
  }
  // Plays a pattern (one section on loop, or the whole arrangement). Emits 'audio:step' { section, bar, step, time,
  // entry } for every 16th, fired by short timeouts aligned to the scheduled AudioContext times. One song at a time.
  // opts: { genre, section|null, loop (default: true for a section, false for the song), backing (default true) }
  A.play = function (pattern, opts) {
    opts = opts || {};
    if (!A.unlock() || !ctx) return null;
    A.stop();
    if (ctx.state === 'suspended') { suspended = false; try { ctx.resume(); } catch (e) { /* ignore */ } }
    var loop = opts.loop != null ? !!opts.loop : !!opts.section;
    var tl = A.timeline(pattern, opts), spb = 60 / tl.bpm, port = makePort(rig), timers = [];
    var i = 0, pass = 0, lastBeat = -1;
    var h = { playing: true, loop: loop, section: opts.section || null, bpm: tl.bpm, beats: tl.beats, style: tl.style,
      start: ctx.currentTime + LEAD_IN, timeline: tl };
    function at(ev) { return h.start + (pass * tl.beats + ev.beat) * spb; }
    function pump() {
      if (!h.playing) return;
      var now = ctx.currentTime, horizon = now + LOOKAHEAD;
      for (;;) {
        if (i >= tl.events.length) {
          if (!loop) { if (now > h.start + tl.beats * spb + 0.2) h.stop(true); return; }
          i = 0; pass++; lastBeat = -1;
        }
        var ev = tl.events[i], t = at(ev);
        if (t > horizon) break;
        i++; lastBeat = ev.beat;
        if (t < now - 0.03) continue;    // fell behind (throttled tab): skip rather than pile up
        if (ev.kind === 'step') { stepAt(ev, t); continue; }
        try { schedule(rig, port, ev, t, spb); } catch (e) { /* a dropped note never stops the song */ }
      }
      timers = timers.filter(function (x) { return x.t > now - 0.5; });
    }
    function stepAt(ev, t) {
      var id = setTimeout(function () {
        if (!h.playing) return;
        stepCount++; lastStep = { section: ev.section, bar: ev.bar, step: ev.step, entry: ev.entry, time: t };
        GG.emit('audio:step', lastStep);
      }, Math.max(0, (t - ctx.currentTime) * 1000));
      timers.push({ id: id, t: t });
    }
    // Edit while playing: same length and tempo keep the groove going from where it is; otherwise restart.
    h.update = function (pat) {
      if (!h.playing) return h;
      var nt = A.timeline(pat, opts);
      if (nt.bpm !== tl.bpm || nt.beats !== tl.beats) return A.play(pat, opts);
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
      closePort(rig, port);
      if (current === h) current = null;
      if (ended === true) GG.emit('audio:end', { handle: h });
    };
    h.timer = setInterval(pump, TICK_MS);
    current = h;
    pump();
    return h;
  };
  A.stop = function () { if (current) current.stop(); };
  // One drum hit right now (tapping a cell in the sequencer).
  var previewPort = null;
  A.hit = function (lane) {
    if (!ctx || suspended || ctx.state !== 'running' || A.isMuted()) return false;
    if (!previewPort) previewPort = makePort(rig);
    drumHit(rig, previewPort, lane, ctx.currentTime + 0.005, 0.5);
    return true;
  };
  A.isPlaying = function () { return !!(current && current.playing); };
  A.context = function () { return ctx; };   // v0.3 gig clock + pause (null before unlock); read-only use
  A.current = function () { return current; };

  /* ---- Offline render (tests, mixing): -> Promise<{ peak, rms, nan, seconds }> ------------------------------- */
  // spec: { lane } one drum hit | { pattern (default the genre's signature), genre, bpm, section (default 'verse'),
  //         bars (default 2), backing: styleId (that style alone) | true | false, drums (default: !styleId) }
  A.renderOffline = function (spec) {
    var OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OAC) return Promise.reject(new Error('no OfflineAudioContext'));
    var genre = spec.genre || 'metal', bars = spec.bars || 2, style = typeof spec.backing === 'string' ? spec.backing : null;
    var pat = GG.songs.sanitize(spec.pattern || GG.songs.genre(genre).signature, null, null, true);
    if (spec.bpm) pat.bpm = spec.bpm;
    var sr = 44100, spb = 60 / pat.bpm, seconds = spec.lane ? 1.6 : bars * 4 * spb + 1.4;
    var oc = new OAC(1, Math.ceil(sr * seconds), sr), r = makeRig(oc, oc.destination), port = makePort(r);
    if (spec.lane) drumHit(r, port, spec.lane, 0.05, 2);
    else {
      var tl = A.timeline(pat, { genre: genre, section: spec.section || 'verse', bars: bars, style: style,
        drums: spec.drums != null ? spec.drums : !style, backing: spec.backing !== false });
      tl.events.forEach(function (ev) { if (ev.kind !== 'step') schedule(r, port, ev, 0.05 + ev.beat * spb, spb); });
    }
    return oc.startRendering().then(function (buf) {
      var d = buf.getChannelData(0), peak = 0, sum = 0, nan = false;
      for (var i = 0; i < d.length; i++) { var v = d[i]; if (v !== v) nan = true; else { var a = Math.abs(v); if (a > peak) peak = a; sum += v * v; } }
      return { peak: peak, rms: Math.sqrt(sum / d.length), nan: nan, seconds: seconds };
    });
  };

  GG.registerDebug('audio', function () {
    return { state: ctx ? ctx.state : 'none', muted: A.isMuted(), voices: voices, playing: A.isPlaying(),
      songVoices: rig ? rig.busy.filter(function (e) { return e > ctx.currentTime; }).length : 0,
      steps: stepCount, lastStep: lastStep, style: current ? current.style : null };
  });
})(window.GG);
