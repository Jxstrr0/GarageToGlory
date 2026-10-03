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
// v1.0 "Glory" (Lane P, contract §4.9): a global voice cap of 32 over every live source, by priority tap > drum (the song's
//   kick + snare) > band > crowd > amb > sfx: A.VOICES { cap, order, reserve } ; A.voicePlan(active, req) (pure) ;
//   A.voiceStats() -> { cap, active, byClass, drops, dropsBy, tapDrops, evicted, over, peak }. Taps are never dropped.
//   Pre-rendered tap hits per kit (genre + quality tier), built after the unlock off the main path (never mid-song): one
//   buffer source per tap into a pooled per-lane choke gain (live synthesis until ready): A.prerender() -> state ;
//   A.prerenderHit({ lane, variant, quality, genre, cap, sr }) -> Promise<AudioBuffer> + renderOffline({ lane, pre: buffer })
//   (tests). Band voices reuse one envelope gain per port and voice (sharedEnv). The crowd's raw audio builds on the first
//   garage entry ('career:new' / 'career:loaded'), no unlock needed: A.prewarm(). debug('audio') += global, prerender, crowdRaw.
// v1.1 "Seats" (plan_contract_1.1 §4.7, Lane D). Without the new opts every timeline is byte-for-byte stage 0's (the drum
//   seat is the regression baseline; sim_audio fingerprints 1,212 of them).
//   A.seatKinds(genre, seat) -> [kind] (C.SEAT_KINDS). timeline opts: seat (the seat layers a sparse seat needs, ONLY with it:
//     rock rhythm = a gtr2 rhythm guitar, country lead = Earl's licks in every bar), part (PART: your written part replaces
//     the generated events of your seat's kinds, section by section; a prog drives the band's chords), mute ([kinds]: play()
//     skips them, the event list is unchanged). A.soloFor(genre, 'player') -> your seat's solo voice.
//   Your instrument: A.pluck / A.strum / A.lead (midi, when, o) -> handle, booked on the band clock like A.hit (class 'tap',
//     never dropped), in the band's own sound for that kind; A.release(handle, when) gates a hold; A.hitCancel() cuts them.
//   A.seatPreview(bandId, seat) -> handle (~3 s of the band's first starter song's chorus, your kinds +6 dB, the rest -6 dB),
//     A.stopPreview(). The garage noodle plays your instrument on a string seat (A.noodleFor -> { who: 'player', style }).
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

  // ---- v1.0 (Lane P, §4.9): the global voice cap ----------------------------------------------------------------------
  // Every live source belongs to a class, highest priority first: tap (your hits) > drum (the song's kick + snare) > band
  // (the band, its vocals, the other drum lanes) > crowd > amb (rooms, the road, the radio) > sfx. Under the cap of 32 a class
  // may only start voices while it leaves its reserve free for the classes above it (so taps always find room); over its
  // limit a class evicts the one-shots below it (sfx, ambience, crowd) before it gives up, and a tap is never dropped. A.voicePlan(active, req) is
  // the pure rule (node-tested): active = { <class>: sounding voices }, req = { cls, n } -> { ok, evict: { <class>: n },
  // total, over } (over: voices a tap still takes past the cap when nothing below it could be evicted). The per-class
  // caps above stay as they were.
  var VOICE_CAP = 32, VOICE_CLS = ['tap', 'drum', 'band', 'crowd', 'amb', 'sfx'];
  var VOICE_RESERVE = { tap: 0, drum: 6, band: 8, crowd: 10, amb: 12, sfx: 14 };
  A.VOICES = { cap: VOICE_CAP, order: VOICE_CLS.slice(), reserve: Object.assign({}, VOICE_RESERVE) };
  A.voicePlan = function (active, req) {
    active = active || {}; req = req || {};
    var cls = VOICE_RESERVE[req.cls] != null ? req.cls : 'sfx', n = Math.max(0, req.n == null ? 1 : req.n | 0), total = 0, i, k;
    for (i = 0; i < VOICE_CLS.length; i++) total += Math.max(0, active[VOICE_CLS[i]] | 0);
    var need = total + n - (VOICE_CAP - VOICE_RESERVE[cls]), evict = {}, evictable = { sfx: 1, amb: 1, crowd: 1 }, rank = VOICE_CLS.indexOf(cls);
    if (need <= 0) return { ok: true, evict: evict, total: total, over: 0 };
    // over its limit: one-shots of the classes below it (sfx, then ambience, then the crowd) make room
    for (i = VOICE_CLS.length - 1; i > rank && need > 0; i--) {
      k = VOICE_CLS[i]; if (!evictable[k]) continue;
      var take = Math.min(need, Math.max(0, active[k] | 0));
      if (take > 0) { evict[k] = take; need -= take; }
    }
    if (need <= 0) return { ok: true, evict: evict, total: total, over: 0 };
    if (cls !== 'tap') return { ok: false, evict: {}, total: total, over: 0 };
    return { ok: true, evict: evict, total: total, over: need };   // a tap is never dropped
  };
  // The live rig's ledger (taps and the song's voices, with end times) + the counters of the other classes.
  var VL = { end: [], cls: [], drops: { tap: 0, drum: 0, band: 0, crowd: 0, amb: 0, sfx: 0 }, evicted: 0, over: 0, peak: 0 };
  var shotsLive = [];   // evictable one-shots on the live context: { s, g, end, cls }
  function vlPrune(t) {
    var j = 0;
    for (var i = 0; i < VL.end.length; i++) if (VL.end[i] > t) { VL.end[j] = VL.end[i]; VL.cls[j] = VL.cls[i]; j++; }
    VL.end.length = j; VL.cls.length = j;
    if (shotsLive.length > 24) shotsLive = shotsLive.filter(function (x) { return x.end > t; });
  }
  function vlActive(t) {   // sounding at t (a booking ahead asks about its own time; only what has ended by now is forgotten)
    vlPrune(Math.min(t, ctx.currentTime) + 1e-4);
    var a = { tap: 0, drum: 0, band: 0, crowd: live.crowd + (crowd.bed ? crowd.bed.srcs.length : 0), amb: live.amb + (amb.bed ? amb.bed.srcs.length : 0), sfx: voices }, i;
    if (radioRig) for (i = 0; i < radioRig.busy.length; i++) if (radioRig.busy[i] > t) a.amb++;
    for (i = 0; i < VL.end.length; i++) if (VL.end[i] > t + 1e-4) a[VL.cls[i]]++;
    return a;
  }
  // May `cls` start n live voices at t? (Taps: always; they may evict one-shots below them.)
  function admit(cls, t, n) {
    if (!ctx) return true;
    var a = vlActive(t), p = A.voicePlan(a, { cls: cls, n: n });
    if (!p.ok) { VL.drops[cls]++; return false; }
    var gone = 0;
    for (var k in p.evict) gone += evictShots(k, p.evict[k], t);
    if (p.over) VL.over++;
    if (p.total + n - gone > VL.peak) VL.peak = p.total + n - gone;
    return true;
  }
  function vlAdd(cls, end, n) { for (var i = 0; i < n; i++) { VL.end.push(end); VL.cls.push(cls); } }
  function evictShots(cls, n, t) {
    var list = shotsLive.filter(function (x) { return x.cls === cls && x.end > t; }).sort(function (a, b) { return a.end - b.end; });
    for (var i = 0; i < list.length && n > 0; i++, n--) {
      var x = list[i];
      try { if (x.g) { x.g.gain.cancelScheduledValues(t); x.g.gain.setTargetAtTime(0, t, 0.008); } x.s.stop(t + 0.04); } catch (e) { /* already stopped */ }
      x.end = t; VL.evicted++;
    }
    return list.length ? Math.min(list.length, i) : 0;
  }
  A.voiceStats = function () {
    var t = ctx ? ctx.currentTime : 0, a = ctx ? vlActive(t) : null, tot = 0, d = 0;
    if (a) for (var k in a) tot += a[k];
    for (var c in VL.drops) if (c !== 'tap') d += VL.drops[c];
    return { cap: VOICE_CAP, active: tot, byClass: a, drops: d, dropsBy: Object.assign({}, VL.drops), tapDrops: counts.tapDrops, evicted: VL.evicted, over: VL.over, peak: VL.peak };
  };

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
  // v1.2 "Soundcheck" (F3.1): the Classic switch (settings.audioClassic; hidden, debug only: owner F16.4). On, every Soundcheck
  // path is bypassed and the 1.1 sound plays byte for byte (tests/fixtures/audio_v11_hashes.json). Cached; applySettings re-reads.
  var classic = null;
  A.isClassic = function () { if (classic === null) classic = !!settings().audioClassic; return classic; };
  A.classic = function (on) { if (on === undefined) return A.isClassic(); classic = !!on; persist({ audioClassic: classic }); return classic; };
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
    stopPreview();   // (v1.1)
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
    loadPrefs(); muted = null; classic = null;
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
    shotsLive.push({ s: src, g: null, end: t0 + dur + 0.05, cls: 'sfx' });   // (v1.0: evictable under the voice cap)
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
      shotsLive.push({ s: s, g: g, end: at + dur, cls: 'sfx' });
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
    if (!admit('sfx', ctx.currentTime, r[0])) return false;   // v1.0: the global voice cap (sfx yields first)
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
    if (A._buildVox && !A.isClassic()) A._buildVox(r);   // v1.2 Lane V: the vocal chain (Classic: the 1.1 vox path)
    return r;
  }
  function setKit(r, genre, tier) {
    genre = genre || 'metal';
    tier = tier == null ? A.kitQuality() : Math.max(0, Math.min(QUALITY.length - 1, tier | 0));
    if (r.genre === genre && r.kit && r.tier === tier) return;
    r.genre = genre; r.tier = tier; r.kit = kitFor(genre, tier);
    if (r === rig) preWant();   // v1.0: (re)render this kit's tap hits in the background
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
      var M = metalRig(r), c = r.ctx, lv = p.level != null ? p.level : 1;
      p.mOpenL = gainNode(c, lv, M.open[0]); p.mOpenR = gainNode(c, lv, M.open[1]);
      p.mMuteL = gainNode(c, lv, M.mute[0]); p.mMuteR = gainNode(c, lv, M.mute[1]);
      p.mBass = gainNode(c, lv, M.bass); p.mVox = gainNode(c, lv, M.vox);
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
      var M = ampRig(r, genre), c = r.ctx, lv = p.level != null ? p.level : 1; p.aGenre = genre;
      if (genre === 'country') { p.aTwang = gainNode(c, lv, M.twang); p.aFid = gainNode(c, lv, M.fiddle); p.aAcL = gainNode(c, lv, M.acoustic[0]); p.aAcR = gainNode(c, lv, M.acoustic[1]); }
      else { p.aOpenL = gainNode(c, lv, M.open[0]); p.aOpenR = gainNode(c, lv, M.open[1]); p.aMuteL = gainNode(c, lv, M.mute[0]); p.aMuteR = gainNode(c, lv, M.mute[1]); p.aRing = gainNode(c, lv, M.ring); }
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
    if (ev.kind === 'gtr2' && ev.mute) {   // v1.1 the rock rhythm seat's palm-muted pushes: a tight chug through both crunch amps
      if (!book(r, t, dur, 2, true)) return true;
      ampPort(r, p, g);
      for (k = 0; k < 2; k++) {
        o = c.createOscillator(); o.setPeriodicWave(powerWave(r)); o.frequency.value = f / 4; o.detune.value = k ? 4 : -4;   // (down in the crunch register)
        o.connect(gate(c, t + k * 0.004, 0.0015, 0.6, Math.max(0.02, dur - k * 0.004), 0.4, k ? p.aMuteR : p.aMuteL)); run(r, o, t + k * 0.004, Math.max(0.02, dur - k * 0.004));
      }
      return true;
    }
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
      var ad = ev.mute ? (side ? p.aMuteR : p.aMuteL) : (side ? p.aOpenR : p.aOpenL), ak = (ev.mute ? 'aMute' : 'aOpen') + side;   // (v1.0: shared envelopes)
      if (ev.mute) e = sharedEnv(p, c, ak, tt, [ad], function (g0) { return gate(c, tt, 0.0015, 0.7, dd, 0.4, ad, g0); });
      else if (ev.trem) e = sharedEnv(p, c, ak, tt, [ad], function (g0) { return gate(c, tt, 0.002, 0.55, dd * 0.9, 0.7, ad, g0); });
      else if (ev.ring) e = sharedEnv(p, c, ak, tt, [ad], function (g0) { return decay(c, tt, 0.003, 0.6, dd, ad, g0); });
      else e = sharedEnv(p, c, ak, tt, [ad], function (g0) { return held(c, tt, 0.5, dd, ad, 0.003, g0); });
      o.connect(e); run(r, o, tt, dd);
    }
    return true;
  }
  // Per-playback inputs into the rig; stop() ramps them to silence and disconnects them.
  var PORTS = ['drums', 'gtr', 'dlead', 'clean', 'lead', 'bass', 'vox', 'bvox'];
  // (v1.1: level = every input's gain, also the genre amp inputs made later; the seat preview's ports, your notes' slots)
  function makePort(r, level) {
    var p = {};
    if (level != null) p.level = level;
    PORTS.forEach(function (k) { p[k] = gainNode(r.ctx, level != null ? level : 1, r[k]); });
    return p;
  }
  function genrePorts(r, p, genre) { if (genre === 'metal') metalPort(r, p); else ampPort(r, p, genre); return p; }   // (inputs made now, at the port's level)
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
  // v1.0: cls (the live rig only) = the voice class under the global cap: 'tap' (never refused by the song's cap), 'drum'
  // (the song's kick + snare) or 'band' (everything else; the default).
  var seatBook = null;   // v1.1: while one of your notes is played through a band voice: { n, ends } (booked as 'tap', never refused)
  function book(r, t, dur, n, band, cls) {
    if (seatBook) { band = false; cls = 'tap'; seatBook.n += n; for (var q = 0; q < n; q++) seatBook.ends.push(t + dur); }
    var t1 = t + 1e-4;   // a note that ends as the next one starts (float rounding) frees its voice in time
    r.busy = r.busy.filter(function (end) { return end > t1; });
    if (band) { r.band = r.band.filter(function (end) { return end > t1; }); if (r.band.length + n > r.bandCap) { counts.dropped++; return false; } }
    if (cls !== 'tap' && r.busy.length + n > r.cap) { counts.dropped++; return false; }
    if (r === rig && !admit(cls || 'band', t, n)) { counts.dropped++; return false; }
    for (var i = 0; i < n; i++) { r.busy.push(t + dur); if (band) r.band.push(t + dur); }
    if (r === rig) vlAdd(cls || 'band', t + dur, n);
    return true;
  }
  function fits(r, t, n) {   // would book(r, t, .., n, band) succeed? (nothing booked, nothing counted)
    var t1 = t + 1e-4, live = function (end) { return end > t1; };
    return r.band.filter(live).length + n <= r.bandCap && r.busy.filter(live).length + n <= r.cap;
  }
  function run(r, node, t, dur) { node.start(t); node.stop(t + dur); if (r.collect) r.collect.push(node); }
  // Envelope gain: attack to peak, then an exponential decay to silence at t + dur (a choke shortens dur).
  // (v1.0: g0 = a voice's shared envelope gain to schedule on instead of a new one; g._end = when the envelope is done)
  function decay(c, t, attack, peak, dur, dest, g0) {
    var g = g0 || c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, attack + 0.01));
    if (!g0) g.connect(dest);
    g._end = t + Math.max(dur, attack + 0.01);
    return g;
  }
  // v1.0 (Lane P): a band voice's envelope gain, kept per port and reused note after note (a voice never overlaps itself:
  // a note lasts min(len, gap)), so a note costs its oscillator only (the gig's busiest scheduler halves its new nodes). A
  // note that would start before the last envelope on it is done gets its own gain, exactly as before.
  function sharedEnv(p, c, key, t, dests, make) {
    var E = p.env || (p.env = {}), x = E[key];
    if (!x) { x = E[key] = { g: c.createGain(), end: -1 }; for (var i = 0; i < dests.length; i++) x.g.connect(dests[i]); }
    if (t < x.end - 1e-6) return make(null);
    var g = make(x.g); x.end = g._end; return g;
  }
  // Held note: attack, a gentle sag, then a short release that ends at t + dur.
  function held(c, t, peak, dur, dest, attack, g0) {
    attack = attack || 0.006;
    var g = g0 || c.createGain(), end = Math.max(dur, attack + 0.03), rel = Math.min(0.05, end * 0.3);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.linearRampToValueAtTime(peak * 0.7, t + Math.max(attack + 0.005, end - rel));
    g.gain.exponentialRampToValueAtTime(0.0001, t + end);
    if (!g0) g.connect(dest);
    g._end = t + end;
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
  function drumHit(r, p, lane, t, cap, v, cls) {
    var D = DRUMS[lane]; if (!D) return false;
    var k = r.kit || DEFAULT_KIT, n = typeof D.n === 'function' ? D.n(k, v) : D.n;
    var d = Math.max(0.012, Math.min(D.len(k, v), cap));
    if (!book(r, t, d, n, false, cls || (lane === 'kick' || lane === 'snare' ? 'drum' : 'band'))) return null;
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
  // v1.2 (Lane V): f0 = the sung pitch: F1 tracks it (GG.voice.track; absent: the 1.1 targets).
  function articulate(bank, amp, plan, t, scale, f0) {
    bank.forEach(function (bp, k) {
      plan.pts.forEach(function (q, n) { var f = Math.max(80, Math.min(9000, q[1][k] * scale)); if (f0 && !k) f = GG.voice.track(f, f0); if (!n) bp.frequency.setValueAtTime(f, t + q[0]); else bp.frequency.linearRampToValueAtTime(f, t + q[0]); });
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
    var vsc = voxSoundcheck(r, ev), xtra = vsc && (gang || V.hold) && voxRoom(r, t, n + 1) ? 1 : 0;   // v1.2 Lane V: + a double / third gang voice
    if (!book(r, t, dur, n + xtra, true)) return;
    counts.vox++; vocTypes[ev.voc] = (vocTypes[ev.voc] || 0) + 1;
    metalPort(r, p);
    var vp = ev.vp || {}, fsc = vp.formant || 1, f = mtof(ev.midi) / Math.pow(2, X.oct || 0), seed = ev.midi * 131 + Math.round(t * 1000);
    r.metal.pres.forEach(function (pr) {   // the guitars clear the voice's band while it sings (a dynamic EQ dip)
      pr.gain.setTargetAtTime(AMP.carve, t, 0.012); pr.gain.setTargetAtTime(3, t + dur * 0.8, 0.1);
    });
    var out = vsc ? voxEnv(c, t, V.peak * GG.voice.velGain(ev.vel), dur, p.mVox, sub ? 0.03 : 0.012) : held(c, t, V.peak, dur, p.mVox, sub ? 0.03 : 0.012);
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
    var o = c.createOscillator(); if (vsc) o.setPeriodicWave(voxWave(r, GG.voice.WAVES.belt)); else o.type = 'sawtooth';   // (v1.2: from the belt wave)
    o.frequency.setValueCurveAtTime(addVib(contour(f, dur, sc, X.fall, X.jit, seed), 90, vib), t, dur);
    o.connect(into); run(r, o, t, dur);
    var o2 = c.createOscillator();   // growl: the subharmonic (square, an octave down); scream: the double
    if (sub) { o2.type = 'square'; o2.frequency.setValueCurveAtTime(contour(f / 2, dur, 0, X.fall, X.jit * 1.5, seed + 7), t, dur); o2.connect(gainNode(c, 0.55, into)); }
    else { if (vsc) o2.setPeriodicWave(voxWave(r, GG.voice.WAVES.belt)); else o2.type = 'sawtooth'; o2.detune.value = gang ? -1200 : 22; o2.frequency.setValueCurveAtTime(addVib(contour(f, dur, sc, X.fall, X.jit, seed + 3), 90, vib), t, dur); o2.connect(gainNode(c, gang ? 0.6 : 0.45, into)); }
    run(r, o2, t + (sub ? 0 : 0.012), dur - (sub ? 0 : 0.012));
    var s = c.createBufferSource(); s.buffer = r.noise; s.loop = true;
    s.connect(filterNode(c, X.noise[0], X.noise[1], X.noise[2], gainNode(c, X.noise[3], into)));
    run(r, s, t, dur);
    if (vsc) metalExtra(r, p, ev, t, dur, V, X, out, f, seed, xtra, gang, vib, sc);
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
    if (voxSoundcheck(r, ev)) { voxSing(r, p, ev, t, dur, V, spb); return; }   // v1.2 Lane V: vel-carrying hits, Classic off
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

  /* ---- v1.2 "Soundcheck" vocals (Lane V; handoff F10, contract §4.4) ------------------------------------------------- */
  // Every path below runs only for a vel-carrying hit with Classic off (voxSoundcheck); otherwise voxHit / metalVox play the
  // 1.1 hit node for node. The pure models are GG.voice (33_audio_voice.js). Levels tuned by numbers (pw_seq section vox).
  // VXL: f1 = the F1 formant's gain (F2..F5 fall ~6 dB each), dbl / gang = an extra voice's level, breath = the pulsed
  // aspiration's depth, inp = the level into the compressor (peaks reach the -18 dB threshold, so vel still moves the
  // level), out = the chain's output trim, plate = the plate's wet return, room = the room send that stands in for the
  // plate on a slow phone.
  var VXL = { f1: 4.2, dbl: 0.55, gang: 0.7, breath: 1.6, inp: 0.25, out: 2.2, plate: 1.4, room: 1 };
  function voxSoundcheck(r, ev) { return ev.vel != null && !!r.vx && !A.isClassic(); }
  // Room for n more sources at t on this rig (song + band caps) and, live, under the global cap without evicting anything
  // (a double / third gang voice is optional: never at a crowd one-shot's expense, never a counted drop).
  function voxRoom(r, t, n) {
    if (!fits(r, t, n)) return false;
    if (r !== rig || !ctx) return true;
    var pl = A.voicePlan(vlActive(t), { cls: 'band', n: n });
    return pl.ok && !Object.keys(pl.evict).length;
  }
  // The glottal PeriodicWave for an open quotient (GG.voice.glottal, 48 harmonics), cached per rig.
  function voxWave(r, oq) {
    var W = r.vx.waves || (r.vx.waves = {}), k = (+oq).toFixed(2);
    if (!W[k]) { var g = GG.voice.glottal(oq, GG.voice.HARMONICS); W[k] = r.ctx.createPeriodicWave(g.real, g.imag); }
    return W[k];
  }
  var rectC = null;   // half-wave rectifier (the breath follows the folds' opening)
  function rectCurve() { if (!rectC) { rectC = new Float32Array(1025); for (var i = 0; i < 1025; i++) rectC[i] = Math.max(0, i / 512 - 1); } return rectC; }
  // The swell envelope (GG.voice.envelope) on a new gain into dest.
  function voxEnv(c, t, peak, dur, dest, attack) {
    var g = c.createGain(), pts = GG.voice.envelope(peak, dur, attack);
    pts.forEach(function (q) {
      if (q[2] === 'set') g.gain.setValueAtTime(q[1], t + q[0]);
      else if (q[2] === 'exp') g.gain.exponentialRampToValueAtTime(q[1], t + q[0]);
      else g.gain.linearRampToValueAtTime(q[1], t + q[0]);
    });
    g.connect(dest); g._end = t + pts[pts.length - 1][0];
    return g;
  }
  // A parallel formant bank: rows [[f, q, dB]] (GG.voice.formants) fed by src, each band at g0 x its dB into dest.
  function voxBank(c, rows, src, dest, g0) {
    return rows.map(function (x) { var bp = filterNode(c, 'bandpass', x[0], x[1], gainNode(c, g0 * Math.pow(10, x[2] / 20), dest)); src.connect(bp); return bp; });
  }
  // F1..F3 of a bank along the word (articulate, F1 tracking f0) or gliding vowel a -> b over 70 % of the hit.
  function voxGlide(bank, art, amp, t, dur, a, b, sc, f0) {
    var b3 = bank.slice(0, 3), tr = GG.voice.track;
    if (art) { articulate(b3, amp, art, t, sc, f0); return; }
    b3.forEach(function (bp, k) {
      var fa = a[k] * sc, fb = b[k] * sc;
      if (!k) { fa = tr(fa, f0); fb = tr(fb, f0); }
      bp.frequency.setValueAtTime(fa, t); bp.frequency.linearRampToValueAtTime(fb, t + dur * 0.7);
    });
  }
  // The vocal inputs of a playback port (made on first use; closePort silences them with the rest): vxL (lead) and vxB
  // (backing) into the chain at the 1.1 channel's level and polarity (renderOffline voxInvert flips r.vox / r.bvox / the
  // metal vox and the chain follows); vxM (metal) into the sends only (the metal channel keeps its own tone).
  function voxIn(r, p, key) {
    if (!p[key]) {
      var src = key === 'vxB' ? r.bvox : key === 'vxM' ? metalRig(r).vox : r.vox, lv = p.level != null ? p.level : 1;
      p[key] = gainNode(r.ctx, lv * src.gain.value, key === 'vxM' ? r.vx.fx || null : r.vx.in);
    }
    return p[key];
  }
  // A slow phone: the frame governor has stepped the pixel ratio down to 1.0 (F10 perf: the plate gives way to the room).
  var vxSlow = { at: -9, on: false };
  function voxSlow() {
    var now = ctx ? ctx.currentTime : 0;
    if (now - vxSlow.at < 2) return vxSlow.on;
    vxSlow.at = now; vxSlow.on = false;
    try { var R = GG.render; if (R && R.prefs && R.perfState && R.prefs().auto) { var ps = R.perfState(); vxSlow.on = ps.autoRatio != null && ps.autoRatio <= 1; } } catch (e) { /* not slow */ }
    return vxSlow.on;
  }
  // Per hit: the genre's air shelf, plate (or room) send and delay; the delay time from the song's tempo (r.voxTempo; a
  // player() line may call it at the song's start too, nothing breaks if both do).
  function voxSetup(r, spb) {
    var X = r.vx, GV = GG.voice, g = r.genre || 'metal', S = GV.sends(g), t = r.ctx.currentTime;
    var plate = !!X.plate && !(r === rig && voxSlow());   // (no plate impulse yet: no plate send at all)
    if (X.genre !== g || X.plateOn !== plate) {
      X.genre = g; X.plateOn = plate;
      X.air.gain.setValueAtTime(S.air ? GV.CHAIN.air[2] : 0, t);
      if (X.plateSend) X.plateSend.gain.setValueAtTime(plate ? S.plate : 0, t);
      if (X.roomSend) X.roomSend.gain.setValueAtTime(plate || !X.plate ? 0 : S.plate * VXL.room, t);
      if (X.delaySend) X.delaySend.gain.setValueAtTime(S.delay ? S.delay.mix : 0, t);
    }
    r.voxTempo(spb);
    X.stats[X.plate ? plate ? 'plate' : 'room' : 'noPlate']++;
  }
  // The guitars' presence band dips 3 dB while a (non-metal) lead vocal sings (F9; metal keeps its own -6 in metalVox).
  // r.carve (Lane I): presence filters (peaking, dB) or gains (linear) of the current genre's amps: an array, an object by
  // genre, or a function (genre) -> array. Missing: nothing to carve.
  function voxCarve(r, t, dur) {
    var L = r.carve;
    if (typeof L === 'function') L = L(r.genre); else if (L && !Array.isArray(L)) L = L[r.genre];
    if (!L || !L.length) return;
    L.forEach(function (x) {
      if (!x || !x.gain || !x.gain.setTargetAtTime) return;
      if (x._carve0 == null) x._carve0 = x.gain.value;
      x.gain.setTargetAtTime(x.frequency ? x._carve0 - 3 : x._carve0 * 0.708, t, 0.012);
      x.gain.setTargetAtTime(x._carve0, t + dur * 0.8, 0.1);
    });
    r.vx.stats.carve++;
  }
  // A sung hit (non-metal): the glottal wave (press: breathy .. belt), 5 formants (F1 tracks the pitch) + the singer's ring,
  // pulsed breath, a living pitch (GG.voice.pitchCurve), shimmer, the vel swell; a double take (+8 cents, 18-28 ms late,
  // its own 3-formant bank, panned +-0.25) on chorus lead hits, a third gang voice, when there's room; into the vocal chain;
  // the guitars' presence carved. Sources as 1.1 (+1 for a double or a third gang voice).
  function voxSing(r, p, ev, t, dur, V, spb) {
    var c = r.ctx, GV = GG.voice, X = r.vx, vp = ev.vp || {}, S = GV.profile(vp, r.genre), rasp = vp.rasp || 0, f = mtof(ev.midi), bv = ev.kind === 'bvox';
    var art = ev.word ? wordPlan(ev.word, dur, vp.vowels) : null, harm = ev.harm ? f * Math.pow(2, ev.harm / 12) : 0;
    var bursts = (art ? art.bursts : []).slice();
    if (V.breath && !(bursts[0] && bursts[0][0] === 0)) bursts.unshift([0, V.breath, 1500, 0.5, 0.8, true]);   // the "h" of hey
    var press = GV.pressAt(GV.press(ev.voc, S), ev.vel), breath = Math.min(0.6, (vp.breath || 0) * 0.35 + (S.breath || 0) + 0.1 * (1 - press));
    var base = Math.min(0.5, rasp * 0.45 + (V.rough ? 0.3 : 0)), nz = bursts.length || base > 0.02 || breath > 0.02 ? 1 : 0;
    var n0 = 1 + (ev.gang ? 1 : 0) + (harm ? 1 : 0) + nz, seed = ev.midi * 31 + Math.round(t * 1000);
    var gang3 = !!ev.gang && voxRoom(r, t, n0 + 1), dbl = !ev.gang && !bv && S.double !== false && (ev.role === 'full' || ev.section === 'chorus') && voxRoom(r, t, n0 + 1);
    if (!book(r, t, dur, n0 + (gang3 || dbl ? 1 : 0), true)) return;
    counts.vox++; vocTypes[ev.voc] = (vocTypes[ev.voc] || 0) + 1;
    voxSetup(r, spb);
    X.stats.hits++; if (gang3) X.stats.gang3++; if (dbl) X.stats.doubles++;
    var dest = voxIn(r, p, bv ? 'vxB' : 'vxL'), ring = GV.ring(S);
    if (ring) dest = eqNode(c, 'peaking', ring[0], ring[1], ring[2], dest);
    if (vp.twang) dest = eqNode(c, 'peaking', 2100, 3.5, vp.twang, dest);   // the nasal 'ng' ring of a twang
    var trim = Math.pow(10, (GV.sends(r.genre).trim || 0) / 20), out = voxEnv(c, t, V.peak * GV.velGain(ev.vel) * trim, dur, dest, 0.012), into = gainNode(c, 1, null), input = into;
    var drive = Math.max(V.drive || 0, vp.drive || 0) + Math.round(rasp * 8) / 2, dc = drive ? driveCurve(drive) : null;
    if (dc) { var sh = c.createWaveShaper(); sh.curve = dc; input.connect(sh); into = sh; }
    var amp = gainNode(c, 1, null), shim = gainNode(c, 1, amp);
    into.connect(shim);
    shim.gain.setValueCurveAtTime(GV.shimmer(dur, 0.03 + 0.03 * Math.min(1, rasp + 0.5 * (1 - press)), seed), t, dur);
    var sc = vp.formant || 1, a = VOWELS[V.vw[0]], b = VOWELS[V.vw[1]], wave = voxWave(r, GV.oq(press));
    voxGlide(voxBank(c, GV.formants(a, vp, f), amp, out, VXL.f1), art, amp, t, dur, a, b, sc, f);
    var pz = voxPitch(V, vp), yod = pz.yodel, own = !!(vp.vib && vp.vib[1]);
    var po = { scoop: V.scoop || vp.scoop || 0, bend: V.bend || 0, vib: pz.vib ? [own ? pz.vib[0] : 5.7, pz.vib[1]] : null, jit: (V.rough || 0) + rasp * 0.02, rateSpread: own ? 0.3 : 0.5 };
    function pitch(o, fg, at, len, sd) {
      if (yod) {   // "yee" up to the fourth, "haw" down past the root (as 1.1)
        o.frequency.setValueAtTime(fg, at); o.frequency.exponentialRampToValueAtTime(fg * 1.335, at + len * 0.3); o.frequency.exponentialRampToValueAtTime(fg * 0.84, at + len);
      } else o.frequency.setValueCurveAtTime(GV.pitchCurve(fg, len, Object.assign({ seed: sd }, po)), at, len);
    }
    var main = null;
    [f].concat(ev.gang && !gang3 ? [f * 0.5] : [], harm ? [harm] : []).forEach(function (fg, g) {
      var o = c.createOscillator(); o.setPeriodicWave(wave); if (g) o.detune.value = 14;
      pitch(o, fg, t, dur, seed + g * 7); o.connect(input); run(r, o, t, dur);
      if (!g) main = o;
    });
    var D = GV.DOUBLE, G3 = GV.GANG3, late = D.late[0] + (D.late[1] - D.late[0]) * ((seed % 101) / 100);
    var extras = gang3 ? [[f * 0.5, G3[1], 0, VXL.gang], [f, G3[2], -9, VXL.gang]] : dbl ? [[f, [late, D.scale, seed % 2 ? D.pan : -D.pan], D.cents, VXL.dbl]] : [];
    extras.forEach(function (x, i) {   // [f, [offset, formant scale, pan], detune cents, level]: its own 3-formant bank
      var at = t + x[1][0], len = dur - x[1][0], xs = sc * x[1][1], src = gainNode(c, 1, null), feed = src;
      if (dc) { var s2 = c.createWaveShaper(); s2.curve = dc; src.connect(s2); feed = s2; }
      var bk = voxBank(c, GV.formants(a, { formant: xs }, x[0]).slice(0, 3), feed, gainNode(c, x[3], panNode(c, x[1][2], out)), VXL.f1);
      voxGlide(bk, art, null, at, len, a, b, xs, x[0]);
      var o = c.createOscillator(); o.setPeriodicWave(wave); o.detune.value = x[2];
      pitch(o, x[0], at, len, seed + 101 + i * 13); o.connect(src); run(r, o, at, len);
    });
    if (nz) {   // rasp, the consonants and the breath: one noise source
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
      if (breath > 0.02) {   // aspiration that pulses with the folds: 2.5 kHz noise x the half-wave rectified glottal wave
        var pg = gainNode(c, 0, amp), rect = c.createWaveShaper(); rect.curve = rectCurve();
        s.connect(filterNode(c, 'bandpass', 2500, 0.8, pg));
        main.connect(rect); rect.connect(gainNode(c, breath * VXL.breath, pg.gain));
      }
      run(r, s, t, dur);
    }
    if (!bv) voxCarve(r, t, dur);
  }
  // Metal (metalVox's Soundcheck tail): the plate send, and the extra voice when booked: a held scream's double (+8 cents,
  // 18-28 ms late, its own 3-formant bank, panned +-0.25) or a gang's third voice (+27 ms, formants x 1.08, panned 0.4).
  function metalExtra(r, p, ev, t, dur, V, M, out, f, seed, xtra, gang, vib, sco) {
    voxSetup(r, 0);
    if (r.vx.fx) out.connect(voxIn(r, p, 'vxM'));
    r.vx.stats.hits++;
    if (!xtra) return;
    var c = r.ctx, GV = GG.voice, vp = ev.vp || {}, fsc = vp.formant || 1, D = GV.DOUBLE, G = GV.GANG3[2];
    var late = gang ? G[0] : D.late[0] + (D.late[1] - D.late[0]) * ((seed % 101) / 100), len = dur - late, at = t + late;
    var scale = gang ? G[1] : D.scale, pan = gang ? G[2] : seed % 2 ? D.pan : -D.pan;
    var sh = c.createWaveShaper(); sh.curve = asymCurve(M.drive + (vp.drive || 0)); sh.oversample = '2x';
    var g = gainNode(c, gang ? VXL.gang * 0.7 : VXL.dbl * 0.8, panNode(c, pan, out));
    M.f[0].forEach(function (f0, k) {
      var bp = filterNode(c, 'bandpass', f0 * fsc * scale, M.q[k], gainNode(c, M.lv[k], g));
      bp.frequency.setValueAtTime(f0 * fsc * scale, at); bp.frequency.linearRampToValueAtTime(M.f[1][k] * fsc * scale, at + len * (M.sweep || 0.75));
      sh.connect(bp);
    });
    var o = c.createOscillator(); o.setPeriodicWave(voxWave(r, GV.WAVES.belt)); o.detune.value = gang ? -9 : D.cents;
    o.frequency.setValueCurveAtTime(addVib(contour(f, len, sco, M.fall, M.jit, seed + 11), 90, vib), at, len);
    o.connect(gainNode(c, 0.55, sh)); run(r, o, at, len);
    r.vx.stats[gang ? 'gang3' : 'doubles']++;
  }
  // The vocal chain on a rig (makeRig's hook, never with Classic on): in -> high-pass 100 Hz -> compressor (-18 dB, 4:1,
  // 5 / 120 ms) -> presence +3 dB @ 3.2 kHz -> air shelf +2 dB @ 10 kHz (0 for punk) -> out -> the band bus. Sends from
  // out (and from the metal channel, vxM) through fx: the plate (GG.dsp.impulse2('plate'); a slow phone: the room send
  // instead; no impulse2 (Lane I's, until it lands): no plate) and the tempo delay r.voxDelay (feedback 0.25, low-passed 3.5 kHz in the loop). No room send on the
  // rig (the van radio): no sends at all.
  var plateIR = {};   // sample rate -> [L, R] (pure data, one per rate)
  function buildVox(r) {
    var c = r.ctx, GV = GG.voice, CH = GV.CHAIN, X = r.vx = { genre: null, plate: null, plateOn: null, dt: 0, waves: null, fx: null,
      stats: { hits: 0, doubles: 0, gang3: 0, carve: 0, plate: 0, room: 0, noPlate: 0 } };
    X.out = gainNode(c, VXL.out, r.busBand);
    X.air = eqNode(c, 'highshelf', CH.air[0], CH.air[1], CH.air[2], X.out);
    var pres = eqNode(c, 'peaking', CH.pres[0], CH.pres[1], CH.pres[2], X.air), comp = c.createDynamicsCompressor(), K = CH.comp;
    comp.threshold.value = K.threshold; comp.knee.value = K.knee; comp.ratio.value = K.ratio; comp.attack.value = K.attack; comp.release.value = K.release;
    comp.connect(pres);
    X.in = gainNode(c, VXL.inp, filterNode(c, 'highpass', CH.hp, 0.7, comp));
    X.comp = comp;
    r.voxTempo = function () {};
    if (!r.send) return X;
    X.fx = gainNode(c, 1, null); X.out.connect(X.fx);
    X.roomSend = gainNode(c, 0, r.send); X.fx.connect(X.roomSend);
    if (GG.dsp && typeof GG.dsp.impulse2 === 'function') {
      try {
        var sr = c.sampleRate, ir = plateIR[sr] || (plateIR[sr] = GG.dsp.impulse2('plate', sr, 1201)), L = ir[0], R = ir[1] || ir[0];
        var buf = c.createBuffer(2, L.length, sr); buf.getChannelData(0).set(L); buf.getChannelData(1).set(R);
        var conv = c.createConvolver(); conv.buffer = buf; conv.connect(gainNode(c, VXL.plate, r.glue));
        X.plateSend = gainNode(c, 0, conv); X.fx.connect(X.plateSend);
        X.plate = conv;
      } catch (e) { X.plate = null; }
    }
    var d = r.voxDelay = X.delay = c.createDelay(GV.DELAY.max + 0.05), lp = filterNode(c, 'lowpass', GV.DELAY.lp, 0.7, r.busBand);
    d.connect(lp); lp.connect(gainNode(c, GV.DELAY.feedback, d));
    X.delaySend = gainNode(c, 0, d); X.fx.connect(X.delaySend);
    r.voxTempo = function (spb) {   // the delay time for the rig's genre at spb seconds per beat (only when it changes)
      var dt = GV.delayTime(r.genre || 'metal', spb);
      if (dt && Math.abs(dt - X.dt) > 1e-4) { d.delayTime.setValueAtTime(dt, c.currentTime); X.dt = dt; }
    };
    return X;
  }
  A._buildVox = buildVox;
  // Lane V debug (the lead folds it into debug('audio').vox): the live rig's chain + counters.
  A.voxStats = function () {
    var X = rig && rig.vx;
    return X ? { chain: true, plate: X.plate ? X.plateOn === false ? 'room' : 'plate' : 'none', delay: X.dt || 0, genre: X.genre, hits: X.stats.hits,
      doubles: X.stats.doubles, gang3: X.stats.gang3, carve: X.stats.carve, sends: { plate: X.stats.plate, room: X.stats.room, noPlate: X.stats.noPlate } } : { chain: false };
  };
  GG.registerDebug('vox', function () { return A.voxStats(); });

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
      b.connect(sharedEnv(p, c, 'mBass', t, [p.mBass], ev.mute || ev.trem || ev.len <= 0.5 ? function (g0) { return gate(c, t, 0.002, 0.8, dur, ev.mute ? 0.5 : 0.7, p.mBass, g0); } : function (g0) { return held(c, t, 0.65, dur, p.mBass, null, g0); }));
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
      var g, dst = side ? (ev.mute ? p.mMuteR : p.mOpenR) : (ev.mute ? p.mMuteL : p.mOpenL);
      if (ring) g = sharedEnv(p, c, 'mRing', tt, [p.mOpenL, p.mOpenR], function (g0) { var x = held(c, tt, 0.22, dd, p.mOpenL, 0.02, g0); if (!g0) x.connect(p.mOpenR); return x; });
      else if (ev.mute) g = sharedEnv(p, c, 'mMute' + side, tt, [dst], function (g0) { return gate(c, tt, 0.0015, 0.62, dd, 0.4, dst, g0); });
      else if (ev.trem) g = sharedEnv(p, c, 'mOpen' + side, tt, [dst], function (g0) { return gate(c, tt, 0.002, 0.5, dd * 0.9, 0.7, dst, g0); });
      else g = sharedEnv(p, c, 'mOpen' + side, tt, [dst], function (g0) { return held(c, tt, 0.48, dd, dst, 0.003, g0); });
      o.connect(g); run(r, o, tt, dd);
    }
  }
  // Gated note: attack to peak, decay to peak*sustain by the end, then shut within 12 ms (tight: the amp's gain would
  // otherwise hold a slow decay up and smear the chugs together).
  function gate(c, t, attack, peak, dur, sustain, dest, g0) {
    var g = g0 || c.createGain(), end = Math.max(dur, attack + 0.02), rel = Math.min(0.012, end * 0.25);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * sustain), t + end - rel);
    g.gain.exponentialRampToValueAtTime(0.0001, t + end);
    if (!g0) g.connect(dest);
    g._end = t + end;
    return g;
  }
  function playNote(r, p, ev, t, spb) {
    if (ev.kind === 'vox' || ev.kind === 'bvox') { voxHit(r, p, ev, t, spb); return; }
    if (r.genre === 'metal' && METAL_KINDS[ev.kind]) { metalNote(r, p, ev, t, spb); return; }
    if (r.genre !== 'metal' && ampNote(r, p, ev, t, spb)) return;   // v0.9 genre amps
    var c = r.ctx, dur = Math.max(0.03, Math.min(ev.len, ev.gap) * spb), f = mtof(ev.midi), o, g;
    if (ev.kind === 'bass') {
      if (!book(r, t, dur, 1, true)) return;
      osc(r, 'sawtooth', f, 0, 0, t, dur, sharedEnv(p, c, 'bass', t, [p.bass], ev.len <= 0.5 || ev.ring ? function (g0) { return decay(c, t, 0.004, 0.55, dur, p.bass, g0); } : function (g0) { return held(c, t, 0.4, dur, p.bass, null, g0); }));
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
  // v1.1: soloist 'player' (gig.roles on the lead seat) -> your seat's solo voice: the genre's own (metal Dana's arpeggios,
  // punk the two-chord break, rock the bluesy lead, country the Tele), so the solo is charted on your seat's kinds.
  A.soloFor = function (genre, soloist) {
    var s = careerFor(genre);
    if (soloist === undefined) { if (!s) return SOLO_DEFAULT[genre] || 'lead'; var R = rolesOf(s); soloist = R ? R.solo : null; }
    if (!soloist) return null;
    if (soloist === 'player') return SOLO_DEFAULT[genre] || 'lead';
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
      if (o.role === 'full' && o.seat !== 'rhythm') w.gtr2(0, 16, { power: true, open: true });   // (v1.1: the rhythm seat plays its own)
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
    w.gtr(0, 8, { power: true }); w.gtr(8, 8, { power: true });
    if (o.seat !== 'rhythm') w.gtr2(0, 16, { power: true, open: true });   // (v1.1: the rhythm seat plays its own)
    w.bass(0, 8); w.bass(8, 8, o.next === o.root ? o.root : o.next);
    if (o.role === 'solo' && o.solo) {
      var sc = o.B.scale || [0, 3, 5, 7, 10];
      [0, 4, 8, 12].forEach(function (s) { w.note('lead', s, 4, o.key + 24 + sc[o.rng.int(0, sc.length - 1)], { bend: 2 }); });
    }
  }
  /* ---- v1.1 "Seats" (Lane D, plan_contract_1.1 §1.4 #1/#3, §4.4, §4.7): seat layers and your written part ---------- */
  // Seat layers, written ONLY when timeline opts.seat asks (the drum seat's timeline never changes), with their own RNG per
  // bar (o.srng) so every other event of the song is exactly as without the seat.
  //   rock rhythm (the new seat): a gtr2 rhythm guitar: chord stabs (palm-muted pushes) in verses, muted 8ths at Drive tempo,
  //     Lenny's open chords in the chorus (8ths at Drive), the riff an octave up in the breaks, sustained half-bar chords
  //     under someone else's solo; in a ballad the verse's clean arpeggios are already yours and the chorus rings in halves.
  //     (BANDS.rock / BALLAD skip their whole-bar gtr2 ring for the rhythm seat: this is it now.)
  //   country lead: Earl's Tele (twang) answers every bar: a lick at the phrase end (before the fiddle's, when the fiddle has
  //     the phrase end), chorus answers between the fiddle's long notes, in the outro too. The solo is already the Tele.
  //   ring (the outro's last bar): the seat's held chord / note when the ring bar has none of its kinds.
  var SEAT_LAYERS = {
    rock: { rhythm: function (o, w) {
      var i, r = o.root + 12;
      if (o.style === 'ballad' && o.role !== 'break') {
        if (o.role !== 'sparse') { w.gtr2(0, 8, { power: true, open: true }); w.gtr2(8, 8, { power: true, open: true, midi: (o.next === o.root ? o.root : o.next) + 12 }); }
        return;
      }
      if (o.role === 'sparse') {
        if (o.style === 'drive') { for (i = 0; i < 16; i += 2) w.gtr2(i, i % 8 ? 1.2 : 2, { power: true, mute: i % 8 !== 0 }); return; }
        [[0, 2, 0], [3, 1, 1], [6, 2, 0], [8, 2, 0], [11, 1, 1], [14, 2, 2]].forEach(function (x) {   // stabs, a push, the next chord
          w.gtr2(x[0], x[1], { power: true, mute: x[2] === 1, midi: x[2] === 2 ? o.next + 12 : r });
        });
        return;
      }
      if (o.role === 'full') {
        if (o.style === 'drive') { for (i = 0; i < 16; i += 2) w.gtr2(i, 1.8, { power: true, open: true }); return; }
        [[0, 3], [3, 3], [6, 2], [8, 8]].forEach(function (x) { w.gtr2(x[0], x[1], { power: true, open: true }); });
        return;
      }
      if (o.role === 'break') { for (i = 0; i < 16; i += 2) w.gtr2(i, 1.6, { midi: r + o.riff[(i / 2) % o.riff.length] }); return; }
      if (o.role === 'solo') { w.gtr2(0, 8, { power: true, open: true }); w.gtr2(8, 8, { power: true, open: true }); }
    } },
    country: { lead: function (o, w) {
      var sc = o.B.scale || [0, 2, 4, 7, 9], rng = o.srng;
      function lick(from) { for (var k = 0; k < 3; k++) w.note('twang', from + 2 * k, 2, o.key + 24 + sc[rng.int(0, sc.length - 1)], k ? null : { bend: 2 }); }
      if (o.role === 'sparse') { if (o.bar % 4 !== 1) lick(o.bar % 4 === 3 ? 2 : 10); return; }   // (bar 1 of 4: Earl's own lick is there)
      if (o.role === 'full' && (o.name === 'outro' || o.bar % 4 !== 3)) lick(o.name !== 'outro' && o.bar % 4 === 1 ? 2 : 10);   // (bar 3: his answer is there)
    } }
  };
  function seatRing(o, w, genre, seat) {
    var len = 16 + RING_BEATS * 4;
    if (genre === 'rock' && seat === 'rhythm') w.gtr2(0, len, { power: true, midi: o.key + 12, ring: true });
    if (genre === 'country' && seat === 'lead') w.note('twang', 0, len, o.key + 24, { ring: true, bend: 2 });
  }
  // PART (02_contracts V1.1 SEATS): { seat, sections: { <name>: { prog?, hook?, rows: [16-char 'x'/'.' rows] } } }. Rows:
  // bass 3 (root, fifth, octave of the bar's chord: the lowest hit row plays), rhythm 2 (chug = palm-muted, open = ringing,
  // both = an accent chord), lead 5 (the hook's scale degrees low -> high: the highest hit row plays). A note lasts to the
  // part's next hit (any row) or the bar's end; lead notes of 3+ steps bend in. The written kind per genre: bass 'bass';
  // rhythm metal/punk 'gtr' (metal accents ring gtr2 an octave up), rock 'gtr2', country the acoustic 'clean' strum; lead
  // 'lead' (country: Earl's 'twang'). prog indexes backing.progressions[section] (the band follows your chords), hook indexes
  // backing.hooks[section]. Kept generated: the lead's own solo bars (role 'solo': the spotlight) and the outro's ring bar.
  var PART_ROWS = { bass: 3, rhythm: 2, lead: 5 };
  function partOf(part, seat) {
    if (!part || typeof part !== 'object' || !part.sections || typeof part.sections !== 'object') return null;
    var s = seat || part.seat;
    if (!PART_ROWS[s] || (part.seat && part.seat !== s)) return null;
    return { seat: s, sections: part.sections };
  }
  function pick(list, i) { return list && list.length ? list[Math.max(0, Math.min(list.length - 1, i | 0))] : null; }
  function partSec(P, name) {   // -> { prog, hook, rows } (defensive: songs.sanitize keeps parts clean)
    var x = P && P.sections[name];
    if (!x || typeof x !== 'object') return null;
    var n = PART_ROWS[P.seat], rows = [], hits = 0;
    for (var i = 0; i < n; i++) {
      var r = x.rows && typeof x.rows[i] === 'string' ? x.rows[i] : '', s = '';
      for (var j = 0; j < 16; j++) { s += r.charAt(j) === 'x' ? 'x' : '.'; if (r.charAt(j) === 'x') hits++; }
      rows.push(s);
    }
    return { prog: isFinite(x.prog) && x.prog !== null ? x.prog | 0 : null, hook: isFinite(x.hook) && x.hook !== null ? x.hook | 0 : null, rows: rows, hits: hits };
  }
  function scaleDeg(sc, deg) { var n = sc.length; return sc[((deg % n) + n) % n] + 12 * Math.floor(deg / n); }
  function partBar(o, w, genre, seat, ps) {
    var rows = ps.rows, steps = [], s, k, i;
    for (s = 0; s < 16; s++) { var m = 0; for (k = 0; k < rows.length; k++) if (rows[k].charCodeAt(s) === HIT) m |= 1 << k; if (m) steps.push([s, m]); }
    var hook = seat === 'lead' ? pick(((o.B.hooks || {})[o.name] || (o.B.hooks || {}).chorus), ps.hook == null ? 0 : ps.hook) : null;
    var sc = o.B.scale || [0, 2, 4, 5, 7, 9, 11], deg = (hook && hook.deg) || [0, 1, 2, 3, 4], pt = { part: true };
    for (i = 0; i < steps.length; i++) {
      s = steps[i][0]; var mask = steps[i][1], len = (i + 1 < steps.length ? steps[i + 1][0] : 16) - s, e;
      if (seat === 'bass') { var lo = mask & 1 ? 0 : mask & 2 ? 1 : 2; w.bass(s, len, o.root + [0, 7, 12][lo], pt); continue; }
      if (seat === 'lead') {
        var hi = 4; while (hi > 0 && !(mask & (1 << hi))) hi--;
        e = len >= 3 ? { bend: 2, part: true } : pt;
        w.note(genre === 'country' ? 'twang' : 'lead', s, len, inKey(o.key + 24 + scaleDeg(sc, deg[hi] | 0), o.key, sc), e);
        continue;
      }
      var chug = mask === 1, accent = mask === 3, cl = chug ? Math.min(1.5, len) : len;   // rhythm
      if (genre === 'country') { w.note('clean', s, chug ? Math.min(1, len) : len, o.root + 12, { strum: chug ? [0, 7] : [0, 4, 7], mute: chug, up: s % 4 === 2, accent: accent, part: true }); continue; }
      if (genre === 'rock') { w.gtr2(s, cl, { power: true, mute: chug, open: !chug, accent: accent, part: true }); continue; }
      w.gtr(s, cl, { power: true, mute: chug, accent: accent, part: true });
      if (accent && genre === 'metal') w.gtr2(s, len, { power: true, part: true });
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
  //       v1.1: seat (a string seat: its layers, see SEAT_LAYERS; 'drums' / none = no change), part (PART: replaces the
  //         generated events of the seat's kinds in the sections it writes; the seat defaults to part.seat), mute (play()
  //         only: the list is the same). With a seat or part the result adds seat (and part: true); events from a part carry
  //         part: true.
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
    // v1.1 Seats: the seat (string seats only), its layer, your part and the kinds it replaces
    var P = opts.seat === 'drums' ? null : partOf(opts.part, PART_ROWS[opts.seat] ? opts.seat : null), seat = PART_ROWS[opts.seat] ? opts.seat : P ? P.seat : null;
    var layer = seat && SEAT_LAYERS[genre] ? SEAT_LAYERS[genre][seat] || null : null, mine = null;
    if (P) { mine = {}; A.seatKinds(genre, seat).forEach(function (k) { mine[k] = 1; }); }
    for (var e = 0; e < order.length && bars < maxBars; e++) {
      var name = order[e], sec = p.sections[name], prog = progression(B, sec, name), riff = riffFor(B, sec), roles = R[name] || EXTRA_ROLES[name] || ['full'];
      var nth = seen[name] = seen[name] == null ? 0 : seen[name] + 1;   // the how-manyth entry of this section
      var ps = P ? partSec(P, name) : null;
      if (ps && ps.prog != null && seat !== 'lead') prog = pick((B.progressions || {})[name], ps.prog) || prog;   // the band follows your chords
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
        if (seat) { o.seat = seat; if (layer) o.srng = GG.RNG(GG.hashSeed(key.seed + '|seat|' + seat + '|' + name + '|' + bar)); }
        var w = writer(o), mark = events.length;
        if (role === 'ring' && e === order.length - 1) { ringBar(o, w, genre); tail = RING_BEATS; if (seat) seatRing(o, w, genre, seat); continue; }   // v0.8 outro (v1.1: + the seat's held note)
        if (role === 'ring') { band(Object.assign(o, { role: 'full' }), w); if (layer) layer(o, w); if (ps) seatPart(events, mark, mine, o, w, genre, seat, ps); continue; }
        band(o, w);
        if (layer) layer(o, w);
        if (ps && !(seat === 'lead' && role === 'solo')) seatPart(events, mark, mine, o, w, genre, seat, ps);   // (the lead's solo stays: the spotlight)
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
    var out = { bpm: p.bpm, beats: beat, tail: tail, style: style.id, styleLabel: style.label, key: key, events: events, solo: solo, voice: vp ? vp.id : null };
    if (seat) { out.seat = seat; if (P) out.part = true; }
    return out;
  };
  // The bar's events of your kinds (written since `mark`) make way for your part's.
  function seatPart(events, mark, mine, o, w, genre, seat, ps) {
    for (var k = events.length - 1; k >= mark; k--) if (mine[events[k].kind]) events.splice(k, 1);
    partBar(o, w, genre, seat, ps);
  }

  /* ---- Playback: the look-ahead scheduler --------------------------------------------------------------- */
  function schedule(r, port, ev, t, spb) {
    if (ev.kind === 'drum') drumHit(r, port, ev.lane, t, ev.gap * spb, ev.v);
    else playNote(r, port, ev, t, spb);
    // v0.9 crowd-answered chants: a hot live crowd shouts the band's gang answer with it, on the same beat
    if (ev.answer && r === rig && crowdLive() && !crowd.silent && crowd.level >= 65) crowdReact(crowd.bed, crowd, 'chant', t, ev.midi);
  }
  // One playback on a rig. quiet (the van radio): no 'audio:step' / 'audio:end', never the current song.
  // v1.1: opts.mute [kinds] = never scheduled (your seat's part: your taps play it); h.kinds / h.muted tally what was
  // scheduled / skipped per kind. R.split = { kinds: { kind: 1 }, hi, lo } (the seat preview): two ports, `kinds` at gain hi,
  // the rest at lo.
  function player(pattern, opts, R) {
    var r = R.rig, c = r.ctx, loop = opts.loop != null ? !!opts.loop : !!opts.section;
    var tl = A.timeline(pattern, opts), spb = 60 / tl.bpm, port = makePort(r, R.split ? R.split.lo : null), timers = [];
    var port2 = R.split ? makePort(r, R.split.hi) : null, split = R.split ? R.split.kinds : null, mute = null;
    if (opts.mute && opts.mute.length) { mute = {}; for (var mi = 0; mi < opts.mute.length; mi++) mute[opts.mute[mi]] = 1; }
    var i = 0, pass = 0, lastBeat = -1;
    var h = { playing: true, loop: loop, section: opts.section || null, bpm: tl.bpm, beats: tl.beats, style: tl.style, key: tl.key,
      genre: opts.genre || 'metal', timeline: tl, radio: !!R.quiet,   // v0.8.3 opts.at: start on the gig's count-in grid
      start: opts.at > c.currentTime + LEAD_IN && opts.at < c.currentTime + 3 ? opts.at : c.currentTime + LEAD_IN,
      kinds: {}, muted: {}, mute: opts.mute ? opts.mute.slice() : [], seat: tl.seat || null };
    if (R.split) { genrePorts(r, port, h.genre); genrePorts(r, port2, h.genre); h.ports = [port, port2]; }
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
        if (mute && mute[ev.kind]) { h.muted[ev.kind] = (h.muted[ev.kind] || 0) + 1; continue; }   // v1.1: your part (your taps play it)
        h.kinds[ev.kind] = (h.kinds[ev.kind] || 0) + 1;
        try { schedule(r, split && split[ev.kind] ? port2 : port, ev, t, spb); } catch (e) { /* a dropped note never stops the song */ }
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
      if (port2) closePort(r, port2);
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
  //         at (v0.8.3: the AudioContext start time, honoured 60 ms..3 s ahead; else now + 60 ms),
  //         v1.1: seat, part (A.timeline), mute ([kinds] never played: your part) }
  A.play = function (pattern, opts) {
    opts = opts || {};
    if (!A.unlock() || !ctx) return null;
    A.stop(); stopRadio();
    if (ctx.state === 'suspended') { suspended = false; try { ctx.resume(); } catch (e) { /* ignore */ } }
    setKit(rig, opts.genre || 'metal', opts.quality); applyRoom();   // v0.8: the career's kit tier unless opts.quality
    return player(pattern, opts, { rig: rig });
  };
  A.stop = function () { if (current) current.stop(); stopPreview(); };   // (v1.1: a seat preview too)
  // v1.1 "Seats": the timeline kinds that make a seat's part (C.SEAT_KINDS; unknown genre -> metal, unknown seat -> drums).
  A.seatKinds = function (genre, seat) {
    var K = (GG.contracts && GG.contracts.SEAT_KINDS) || {}, g = K[genre] || K.metal || { drums: ['drum'] };
    return (g[seat] || g.drums || ['drum']).slice();
  };
  /* ---- v1.1 "Seats" (Lane D, §4.7): your instrument -------------------------------------------------------------------- */
  // A.pluck / A.strum / A.lead (midi, when, o) -> handle | null. One note of your part, played through the band's own voice
  // for its kind (o.kind = the timeline kind; default: pluck 'bass', strum the genre's rhythm kind, lead its lead kind), so
  // your taps sound exactly like the part the backing mutes (metal's double-tracked pair through the metal amp, punk/rock's
  // crunch amps, rock's ringing gtr2, the country acoustic's strum, Earl's Tele...). o = { len (seconds it sounds; default
  // 0.35, max 8), hold (A.release gates it), kind, power, mute, strum ([intervals]), up, bend (semitones up into it), trem,
  // ring, chord ([li, li2]: one strum), repeats ([seconds after the start]: a run's notes on the band grid, one handle; a
  // release stops the ones not played yet), seat (pan hint; default state.seat) }. Booked like A.hit: `when` (an AudioContext
  // time < 1 s ahead: the gig's drum-sync path, syncSnap'd) or now + 5 ms, class 'tap' (never dropped by the voice cap; the
  // same voices the muted band note would have used: 1 for bass / lead, the pair for 'gtr', the strings of a strum; a hold is
  // one booking for its whole length). Each voice is monophonic like a string: a new note chokes the last at its start (one
  // booked earlier than the last ends where that one starts). Notes go through pooled per-voice slots (a port each), so a
  // choke / release is a 20 ms gate and A.hitCancel() silences every booked one. null: no running audio, muted, no midi.
  // handle = { fn, kind, midi, t, end, len, hold, n (voices booked), repeats, released, cut (ctx time it was gated) }.
  // A.release(handle, when) -> true (a hold was gated at max(when, t + 60 ms)) | false (not a hold / already over) | null.
  // A.seatVoiceFor(kind) -> 'pluck' | 'strum' | 'lead' (which voice plays a timeline kind).
  var SEAT_KIND = {
    pluck: function () { return 'bass'; },
    strum: function (g) { return { metal: 'gtr', punk: 'gtr', rock: 'gtr2', country: 'clean' }[g] || 'gtr'; },
    lead: function (g) { return g === 'country' ? 'twang' : 'lead'; }
  };
  var VOICE_OF = { bass: 'pluck', gtr: 'strum', gtr2: 'strum', clean: 'strum', lead: 'lead', twang: 'lead', fiddle: 'lead' };
  A.seatVoiceFor = function (kind) { return VOICE_OF[kind] || null; };
  var SEAT_SIDE = { bass: 0, rhythm: -1, lead: 1 };   // the pan hint: metal's Jaxon is left, Dana right
  var SEAT_GAIN = 1.15, SEAT_LEN = 0.35, SEAT_MAXLEN = 8, SEAT_MINHOLD = 0.06, SEAT_SLOTS = 4, SEAT_TC = 0.02;
  var SEATS = { notes: { pluck: 0, strum: 0, lead: 0 }, released: 0, choked: 0, cancelled: 0, last: null };
  function seatPool(r, fn) { var S = r.seats || (r.seats = {}); return S[fn] || (S[fn] = { slots: [], last: null }); }
  function seatSlot(r, pool, t) {
    for (var i = 0; i < pool.slots.length; i++) if (pool.slots[i].until <= t - 0.002) return pool.slots[i];
    var sl = { p: makePort(r, SEAT_GAIN), until: 0 };
    if (pool.slots.length < SEAT_SLOTS) pool.slots.push(sl);   // (all busy: a one-off slot)
    return sl;
  }
  function seatLevels(sl, t, seat) {   // every input of the slot open again at t, your side a little louder
    var b = 0.15 * (SEAT_SIDE[seat] || 0), p = sl.p;
    for (var k in p) {
      if (!p[k] || !p[k].gain) continue;
      var side = /L$/.test(k) ? -1 : /R$/.test(k) ? 1 : 0;
      p[k].gain.setValueAtTime(SEAT_GAIN * (1 + side * b), t);
    }
  }
  // Gate a note at `at` (time constant tc): its slot fades, its sources stop, the voice ledger frees it.
  function seatCut(r, h, at, tc) {
    if (!h || h.end <= at) return false;
    var stopAt = Math.min(h.end, at + tc * 6), p = h.slot.p, k;
    for (k in p) if (p[k] && p[k].gain) { try { p[k].gain.setTargetAtTime(0, at, tc); } catch (e) { /* ignore */ } }
    h.src.forEach(function (s) { try { s.stop(stopAt); } catch (e) { /* old Safari: one stop() only */ } });   // (repeats not yet started never play)
    seatFree(r, h, stopAt);
    h.slot.until = stopAt; h.end = stopAt; h.cut = at;
    return true;
  }
  function seatFree(r, h, e) {   // the voice ledger: the note's bookings now end at e
    for (var i = 0; i < h.ends.length; i++) {
      var x = h.ends[i]; if (x <= e) continue;
      var j = r.busy.indexOf(x); if (j >= 0) r.busy[j] = e;
      if (r === rig) for (var k = 0; k < VL.end.length; k++) if (VL.cls[k] === 'tap' && VL.end[k] === x) { VL.end[k] = e; break; }
      h.ends[i] = e;
    }
  }
  function seatPlay(r, fn, midi, t, o) {
    var g = r.genre || 'metal', kind = o.kind || SEAT_KIND[fn](g), pool = seatPool(r, fn), last = pool.last;
    var len = Math.max(0.03, Math.min(SEAT_MAXLEN, +o.len > 0 ? +o.len : SEAT_LEN));
    if (last && last.end > t) {
      if (last.t < t) { if (seatCut(r, last, t, 0.006)) SEATS.choked++; }
      else len = Math.max(0.03, Math.min(len, last.t - t));   // booked out of order: it ends where the later one starts
    }
    var sl = seatSlot(r, pool, t);
    var ev = { beat: 0, kind: kind, midi: midi, len: len, gap: len, power: o.power != null ? !!o.power : kind === 'gtr' || kind === 'gtr2',
      mute: !!o.mute, trem: !!o.trem, ring: !!o.ring, up: !!o.up, bend: +o.bend || 0 };
    if (Array.isArray(o.strum)) ev.strum = o.strum.slice(0, 4);
    else if (kind === 'clean' && g === 'country') ev.strum = o.mute ? [0, 7] : [0, 4, 7];
    // o.repeats [seconds after t] (a run: the repeats on the band grid, one note; a release stops the rest)
    var reps = Array.isArray(o.repeats) ? o.repeats.filter(function (x) { return x > 0.02 && x < len - 0.02; }).sort(function (a, b) { return a - b; }) : [];
    var src = r.collect = [], b = seatBook = { n: 0, ends: [] };
    try {
      if (!reps.length) {
        playNote(r, sl.p, ev, t, 1);
        if (Array.isArray(o.with)) o.with.slice(0, 2).forEach(function (w) {   // v1.1 review: a same-voice partner (metal's chorus ring) on this handle
          if (w && isFinite(w.midi)) playNote(r, sl.p, Object.assign({}, ev, { kind: w.kind || kind, midi: +w.midi, len: Math.min(len, +w.len > 0 ? +w.len : len), gap: Math.min(len, +w.len > 0 ? +w.len : len),
            power: w.power != null ? !!w.power : ev.power, mute: !!w.mute, ring: !!w.ring, strum: undefined, up: false, bend: 0 }), t, 1);
        });
      } else {
        var at = [0].concat(reps);
        for (var i = 0; i < at.length; i++) { var d = (i + 1 < at.length ? at[i + 1] : len) - at[i]; playNote(r, sl.p, Object.assign({}, ev, { len: d, gap: d, bend: i ? 0 : ev.bend }), t + at[i], 1); }
      }
    } finally { seatBook = null; r.collect = null; }
    if (!src.length) return null;
    seatLevels(sl, t, o.seat || (GG.state && GG.state.seat) || null);
    var h = { fn: fn, kind: kind, midi: midi, t: t, end: t + len, len: len, hold: !!o.hold, n: b.n, ends: b.ends, repeats: reps.length, released: false, cut: null, slot: sl, src: src };
    sl.until = h.end; pool.last = h;
    var L = r.seatLive || (r.seatLive = []);
    if (L.length > 16) r.seatLive = L = L.filter(function (x) { return x.end > t - 0.5; });
    L.push(h);
    return h;
  }
  function seatRelease(r, h, at) {
    if (!h || !h.slot || h.released) return false;
    h.released = true;
    if (!h.hold) return false;
    var ok = seatCut(r, h, Math.max(at, h.t + SEAT_MINHOLD), SEAT_TC);
    if (ok) SEATS.released++;
    return ok;
  }
  function seatVoice(fn) {
    return function (midi, when, o) {
      if (!ctx || suspended || ctx.state !== 'running' || A.isMuted() || !isFinite(midi)) return null;
      o = o || {};
      var t = ctx.currentTime + 0.005;
      if (when > t && when < t + 1) t = when;
      if (!(current && current.playing)) setKit(rig, (GG.state && GG.state.genre) || rig.genre || 'metal');   // (the band's sound)
      var h = null;
      try { h = seatPlay(rig, fn, +midi, t, o); } catch (e) { h = null; }
      if (!h) { counts.tapDrops++; return null; }
      SEATS.notes[fn]++;
      SEATS.last = { fn: fn, kind: h.kind, midi: h.midi, when: when == null ? null : when, t: h.t, end: h.end, hold: h.hold, n: h.n };
      return h;
    };
  }
  A.pluck = seatVoice('pluck');
  A.strum = seatVoice('strum');
  A.lead = seatVoice('lead');
  A.release = function (h, when) {
    if (!h || !h.slot || !ctx) return null;
    var now = ctx.currentTime + 0.005;
    return seatRelease(rig, h, when > now && when < now + 1 ? when : now);
  };
  function seatCancel(r, t) {   // A.hitCancel: every booked / ringing note of yours, a 5 ms fade, then the slots are gone
    var S = r && r.seats, live = (r && r.seatLive) || [], slots = [];
    if (!S && !live.length) return;
    Object.keys(S || {}).forEach(function (fn) { S[fn].slots.forEach(function (sl) { slots.push(sl); }); });
    live.forEach(function (h) {   // the voice ledger lets them go now
      if (slots.indexOf(h.slot) < 0) slots.push(h.slot);
      if (h.end <= t) return;
      var e = t + 0.005;
      seatFree(r, h, e);
      h.src.forEach(function (s) { try { s.stop(e + 0.01); } catch (x) { /* ignore */ } });
      h.end = e; h.cut = t;
    });
    r.seats = null; r.seatLive = [];
    slots.forEach(function (sl) {
      var p = sl.p;
      Object.keys(p).forEach(function (k) {
        if (!p[k] || !p[k].gain) return;
        try { var g = p[k].gain; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0, t + 0.005); } catch (e) { /* ignore */ }
        setTimeout(function () { try { p[k].disconnect(); } catch (e) { /* ignore */ } }, 60);
      });
    });
    SEATS.cancelled++;
  }
  // v1.1 (owner E14d: tap a seat card to hear it). A.seatPreview(bandId, seat, opts?) -> handle | null: ~3 s (2 bars, cut
  // at PREVIEW_SECS with a fade) of the band's first starter song's chorus with that seat's kinds +6 dB and the rest -6 dB
  // (drums: the drum kinds), the seat's layers on, the band's singer singing. The song is the starter's pattern as a new
  // career writes it (songs.patternFor, seeded by opts.seed, default 1; the live career's own song when it is this band's).
  // Plays on the main rig but quiet (no 'audio:step' / 'audio:end', never A.current()); stops itself; one at a time (a new
  // preview, A.play, A.stop, A.suspend or A.stopPreview() ends it). handle = the player's + { bandId, seat, secs, stopAt }.
  // null without Web Audio or for an unknown band.
  var PREVIEW_SECS = 3, PREVIEW_FADE = 0.25, PREVIEW_HI = 2, PREVIEW_LO = 0.5;   // +6 dB / -6 dB
  var preview = { h: null, timer: 0, n: 0, last: null };
  function stopPreview() {
    if (preview.timer) { clearTimeout(preview.timer); preview.timer = 0; }
    var h = preview.h; preview.h = null;
    if (h && h.playing) h.stop();
  }
  A.stopPreview = function () { var on = !!(preview.h && preview.h.playing); stopPreview(); return on; };
  function starterPattern(bandId, genre, seed) {
    var st = GG.state, band = GG.content.bands[bandId], first = (band.starterSongs || [])[0];
    if (st && st.bandId === bandId && st.songs && st.songs[0] && st.songs[0].pattern) return { pattern: st.songs[0].pattern, id: st.songs[0].id };
    if (!first) return { pattern: GG.songs.starter(genre), id: 'preview|' + bandId };
    var t = typeof first === 'string' ? first : first.fr || first.title || first.en;
    return { pattern: GG.songs.patternFor({ seed: seed || 1, genre: genre, gear: null }, t), id: 'preview|' + bandId + '|' + t };
  }
  function bandSinger(band) {
    var m = (band.members || []).filter(function (x) { return /vocal/i.test(x.role || ''); })[0];
    return m ? m.id : null;
  }
  A.seatPreview = function (bandId, seat, opts) {
    opts = opts || {};
    var band = GG.content && GG.content.bands && GG.content.bands[bandId];
    if (!band || !A.unlock() || !ctx) return null;
    seat = (C.SEATS || []).indexOf(seat) >= 0 ? seat : 'drums';
    stopPreview(); A.stop(); stopRadio();
    if (ctx.state === 'suspended') { suspended = false; try { ctx.resume(); } catch (e) { /* ignore */ } }
    var genre = band.genre || 'metal', song = starterPattern(bandId, genre, opts.seed), kinds = {};
    A.seatKinds(genre, seat).forEach(function (k) { kinds[k] = 1; });
    setKit(rig, genre, opts.quality); applyRoom();
    var h = player(song.pattern, { genre: genre, section: 'chorus', loop: false, bars: 2, songId: song.id, seat: seat, singer: bandSinger(band) },
      { rig: rig, quiet: true, split: { kinds: kinds, hi: PREVIEW_HI, lo: PREVIEW_LO } });
    var secs = Math.min(PREVIEW_SECS, h.beats * 60 / h.bpm), end = h.start + secs;
    h.ports.forEach(function (p) {   // the fade at the end (every input exists already: the genre's amp inputs were made at the start)
      Object.keys(p).forEach(function (k) {
        if (!p[k] || !p[k].gain) return;
        p[k].gain.setValueAtTime(p.level, end - PREVIEW_FADE); p[k].gain.linearRampToValueAtTime(0.0001, end);
      });
    });
    h.bandId = bandId; h.seat = seat; h.secs = secs; h.stopAt = end;
    preview.h = h; preview.n++; preview.last = { bandId: bandId, seat: seat, secs: Math.round(secs * 1000) / 1000, start: h.start, kinds: Object.keys(kinds) };
    preview.timer = setTimeout(function () { preview.timer = 0; if (preview.h === h) { preview.h = null; h.stop(); } }, Math.max(0, (end - ctx.currentTime) * 1000 + 30));
    return h;
  };
  // One drum hit right now (the sequencer's cells, the gig's taps), in the current song's kit and room.
  var previewPort = null, schedPort = null, taps = {};
  // v0.6.2: `when` (optional AudioContext time) schedules the hit ahead on the audio clock (the gig's two-thumb auto notes).
  // v0.7.2: hits scheduled ahead go through their own port so A.hitCancel() can silence them (a gig restart / hidden app).
  A.hit = function (lane, when) {
    if (!ctx || suspended || ctx.state !== 'running' || A.isMuted() || !DRUMS[lane]) return false;   // (v1.1: 'str' lanes play A.pluck/strum/lead)
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
      var stopAt = Math.min(last.end, t + 0.05);
      last.src.forEach(function (s) { try { s.stop(stopAt); } catch (e) { /* old Safari: one stop() only */ } });
      if (last.slot) last.slot.until = stopAt;
      for (var k = 0; k < last.n; k++) { var j = rig.busy.indexOf(last.end); if (j >= 0) rig.busy[j] = t; }
      for (k = 0; k < VL.end.length; k++) if (VL.cls[k] === 'tap' && VL.end[k] === last.end) VL.end[k] = stopAt;   // (its tail still sounds until then)
      taps[lane] = null;
    }
    var cap = lane === 'cymbal' ? 0.9 : 0.5, pre = preHit(lane, v, cap), b, g;
    // v1.0 (Lane P): the hit pre-rendered for this kit (one buffer source into the lane's pooled choke gain: 1 node per
    // hit instead of 4-7), else synthesized live as before. The booking (when it sounds) is the same either way.
    if (pre) {
      var slot = laneSlot(port, lane, t), src1 = ctx.createBufferSource();
      src1.buffer = pre.buf; src1.connect(slot.g);
      book(rig, t, pre.d, 1, false, 'tap');   // (taps are never refused)
      slot.g.gain.setValueAtTime(1, t);
      src1.start(t); src1.stop(t + pre.d + 0.005);
      slot.until = t + pre.d + 0.005;
      taps[lane] = { t: t, end: t + pre.d, n: 1, g: slot.g, src: [src1], slot: slot };
      PRE.hits++;
      return true;
    }
    g = gainNode(ctx, 1, port.drums); var src = rig.collect = [];   // drum voices only use port.drums: a gain per tap is its port
    try { b = drumHit(rig, { drums: g }, lane, t, cap, v, 'tap'); } finally { rig.collect = null; }
    if (b) { b.g = g; b.src = src; taps[lane] = b; } else { counts.tapDrops++; g.disconnect(); }
    return true;
  };
  // A lane's choke gains on a port, reused round robin once their last source has stopped (a fresh one if all are busy).
  function laneSlot(port, lane, t) {
    var pool = port.slots || (port.slots = {}), L = pool[lane] || (pool[lane] = []), i;
    for (i = 0; i < L.length; i++) if (L[i].until <= t - 0.002) return L[i];
    var sl = { g: gainNode(ctx, 1, port.drums), until: 0 };
    if (L.length < 6) L.push(sl);
    return sl;
  }

  // ---- v1.0 (Lane P): pre-rendered drum hits ---------------------------------------------------------------------------
  // After the audio unlock (and whenever the career's kit changes: genre or quality tier), every live-tap voice of the kit
  // (kick, snare + its country variants, hat, cymbal, the three toms, ride / china) is rendered once through the same DRUMS
  // recipe on an OfflineAudioContext at the live sample rate: the dry hit as it enters the kit chain (drive, box, EQ, the
  // room stay live and shared). Never while a song plays; one hit at a time. Taps use them once the kit's set is complete.
  var PRE = { key: null, bufs: null, building: null, ready: false, hits: 0, renders: 0, ms: 0, timer: 0 };
  function preKey() { return rig ? (rig.genre || 'metal') + '|' + rig.tier : null; }
  function preHit(lane, v, cap) {
    if (!PRE.ready || PRE.key !== preKey()) { preWant(); return null; }
    var x = PRE.bufs[lane + '|' + (v == null ? '' : v) + '|' + cap];
    return x || null;
  }
  function preList(k) {
    var out = [['kick'], ['hat'], ['cymbal'], ['ride'], ['toms', 0], ['toms', 1], ['toms', 2], ['snare']];
    if (k.train) out.push(['snare', 'rim'], ['snare', 'brush'], ['snare', 'ghost']);
    return out;
  }
  function preWant() {
    if (!ctx || !rig || PRE.timer || !(window.OfflineAudioContext || window.webkitOfflineAudioContext)) return;
    var key = preKey();
    if (PRE.key === key && PRE.ready) return;
    if (PRE.building === key) return;
    PRE.timer = setTimeout(function () { PRE.timer = 0; preBuild(); }, 250);
  }
  function preBuild() {
    var key = preKey(); if (!key || (PRE.key === key && PRE.ready)) return;
    if (current && current.playing && !current.radio) { PRE.timer = setTimeout(function () { PRE.timer = 0; preBuild(); }, 1000); return; }   // never mid-song
    var OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext, k = rig.kit || DEFAULT_KIT, sr = ctx.sampleRate;
    var jobs = preList(k), bufs = {}, t0 = performance.now(), nz = null;
    PRE.building = key; PRE.ready = false;
    function next(i) {
      if (PRE.building !== key) return;                       // the kit changed again: that build wins
      if (preKey() !== key) { PRE.building = null; preWant(); return; }
      if (i >= jobs.length) { PRE.bufs = bufs; PRE.key = key; PRE.ready = true; PRE.building = null; PRE.ms = Math.round(performance.now() - t0); return; }
      if (current && current.playing && !current.radio) { setTimeout(function () { next(i); }, 1000); return; }
      var lane = jobs[i][0], v = jobs[i][1], D = DRUMS[lane], caps = lane === 'cymbal' ? [0.9] : [0.5];
      var d = Math.max(0.012, Math.min(D.len(k, v), caps[0])), oc;
      try {
        oc = new OAC(1, Math.ceil((d + 0.006) * sr), sr);
        var r = { ctx: oc, noise: rig.noise || nz || (nz = noiseBuffer(oc)), busy: [], band: [], cap: 99, bandCap: 99, kit: k };   // (the live rig's noise: same samples)
        D.play(r, { drums: oc.destination }, 0, d, k, v);
      } catch (e) { PRE.building = null; return; }   // no offline audio: taps stay live
      oc.startRendering().then(function (buf) {
        bufs[lane + '|' + (v == null ? '' : v) + '|' + caps[0]] = { buf: buf, d: d };
        PRE.renders++;
        setTimeout(function () { next(i + 1); }, 0);
      }, function () { PRE.building = null; });
    }
    next(0);
  }
  A.prerender = function () { preWant(); return { key: PRE.key, ready: PRE.ready, building: PRE.building, renders: PRE.renders, hits: PRE.hits, ms: PRE.ms }; };
  A.hitCancel = function () {   // v0.7.2: drops every hit still scheduled ahead (a 5 ms fade, then the port is cut)
    var p = schedPort; schedPort = null;
    if (ctx && rig) seatCancel(rig, ctx.currentTime);   // v1.1: and every note of yours (booked or ringing)
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
    if (B.live && !admit('crowd', t, 1)) return null;   // v1.0: the global voice cap
    var c = B.c, s = c.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate || 1;
    var g = gainNode(c, gain, panNode(c, pan, B.gain)); s.connect(g);
    s.start(t, off || 0); if (dur) s.stop(t + dur);
    if (B.live) { track([s], 'crowd'); shotsLive.push({ s: s, g: g, end: t + (dur || (buf.duration - (off || 0)) / (rate || 1)), cls: 'crowd' }); }
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
  function ambOk(n, t) { return live.amb + n <= AMB_VOICES && admit('amb', t, n); }   // v1.0: + the global voice cap
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
    },
    // v1.1: yours, on a string seat (NOODLE_BY_SEAT)
    walk: function (N, c, dest, t) {   // bass: up the chord and a walk back down (in the key), then a think
      var W = [0, 4, 7, 6, 4, 3, 2, 0], k = N.i++ % (W.length + 1);
      if (k === W.length) return [[], N.rng.range(1.5, 3.2)];
      return [thumbPluck(c, dest, t, scaleNote(N, W[k]) - 24), k % 2 ? 0.24 : 0.36];
    },
    chug: function (N, c, dest, t) {   // metal rhythm: palm-muted chugs on the low string, an open chord to finish
      var PAT = [[0, 0.12], [0, 0.12], [0, 0.24], [0, 0.12], [0, 0.12], [0, 0.24], [1, 0.6]], k = N.i++ % (PAT.length + 1);
      if (k === PAT.length) return [[], N.rng.range(1.4, 3)];
      var root = N.tonic - 24, open = !!PAT[k][0];
      return [mutePluck(c, dest, t, root, open).concat(mutePluck(c, dest, t + 0.006, root + 7, open)), PAT[k][1]];
    },
    power: function (N, c, dest, t) {   // punk / rock rhythm: power chords I - IV - V - IV, two downstrokes each
      var k = N.i++ % 9;
      if (k === 8) return [[], N.rng.range(1.4, 3)];
      var root = N.tonic - 12 + [0, 5, 7, 5][k >> 1];
      return [pluck(c, dest, t, root, 0.03).concat(pluck(c, dest, t + 0.008, root + 7, 0.026), pluck(c, dest, t + 0.016, root + 12, 0.02)), k % 2 ? 0.42 : 0.28];
    },
    lick: function (N, c, dest, t) {   // lead: a run up the scale into a long bent note, then a pause (to talk gear)
      var k = N.i++ % 8;
      if (k === 7) return [[], N.rng.range(1.6, 3.4)];
      if (k === 6) return [twangPluck(c, dest, t, scaleNote(N, 7 + N.rng.int(0, 2)), true), 0.7];
      return [pluck(c, dest, t, scaleNote(N, ((N.i >> 3) % 3) + k), 0.04), 0.11];
    }
  };
  function thumbPluck(c, dest, t, midi) {   // a bass string thumbed unplugged: low, round, a little growl
    var o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(midi);
    var lp = filterNode(c, 'lowpass', 900, 1.2, decay(c, t, 0.004, 0.07, 0.8, dest));
    lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(220, t + 0.5);
    o.connect(lp); o.start(t); o.stop(t + 0.85);
    return [o];
  }
  function mutePluck(c, dest, t, midi, open) {   // a palm-muted (or open) low string, unplugged
    var o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(midi);
    var d = open ? 0.6 : 0.1, lp = filterNode(c, 'lowpass', open ? 2200 : 520, 1.1, decay(c, t, 0.003, open ? 0.035 : 0.045, d, dest));
    o.connect(lp); o.start(t); o.stop(t + d + 0.05);
    return [o];
  }
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
  // v1.1: on a string seat YOU noodle, on your instrument (the swapped drummer sits at the kit): bass 'walk', rhythm by genre
  // (metal 'chug', punk / rock 'power' chords, country the acoustic 'strum'), lead by genre ('lick' runs, country Earl-style
  // 'twang'). The drum seat: the band's noodler, exactly as before.
  var NOODLE_BY_SEAT = { bass: 'walk', rhythm: { metal: 'chug', punk: 'power', rock: 'power', country: 'strum' }, lead: { metal: 'lick', punk: 'lick', rock: 'lick', country: 'twang' } };
  function noodler(st) {   // -> { id, style } | null
    var seat = st.seat, x = seat && seat !== 'drums' ? NOODLE_BY_SEAT[seat] : null;
    if (x) return { id: 'player', style: typeof x === 'string' ? x : x[st.genre || 'metal'] || 'lick' };
    var who = guitarist(st);
    return who ? { id: who.id, style: NOODLE_BY_GEAR[gearOf(who, st.genre || 'metal')] || 'pluck' } : null;
  }
  // { who, style } for a career (tests, debug); null = nobody plays anything.
  A.noodleFor = function (st) {
    st = st || GG.state; if (!st) return null;
    var n = noodler(st);
    return n ? { who: n.id, style: n.style } : null;
  };
  // What the garage ambience depends on: the band, its room, the season (the Quonset's birds), the noodler.
  function garageSig() {
    var st = GG.state; if (!st) return '';
    var n = noodler(st), kind = spaceKind(st);
    return [st.bandId, kind, BEDS[kind] && BEDS[kind].season ? seasonNow(st) : '', n ? n.id : ''].join('|');
  }
  function startGarage(t) {
    var st = GG.state, genre = st.genre || 'metal', kind = spaceKind(st), season = seasonNow(st), who = noodler(st);
    amb.sig = garageSig();
    amb.bed = spaceBed(ctx, ambBus, t, BUF, kind);
    amb.space = { kind: kind, season: season, events: bedEvents(kind, season, GG.RNG(GG.hashSeed('bed|' + kind + '|' + (st.totalWeek || 0))), t) };
    amb.space.rng = GG.RNG(GG.hashSeed('bedrng|' + (st.totalWeek || 0)));
    amb.timer = setInterval(noodle, 200);
    if (!who) { amb.noodle = null; return; }
    var songs = st.songs || [], key = A.keyFor(songs.length ? songs[songs.length - 1].id : 'garage', genre);
    amb.noodle = { who: who.id, tonic: key.tonic + 24, scale: (GG.songs.genre(genre).backing || {}).scale || [0, 2, 3, 5, 7, 8, 10],
      rng: GG.RNG(GG.hashSeed('noodle|' + (st.totalWeek || 0))), next: t + 1.5, left: 0, i: 0, style: who.style };
  }
  function noodle() {
    if (!ctx || amb.mode !== 'garage' || !amb.bed) return;
    var N = amb.noodle, now = ctx.currentTime, S = amb.space;
    if (S && S.events.length) bedTick(S.events, ctx, amb.bed.gain, now, now + 0.3, S.rng, function (n) { return ambOk(n, now); });
    if (!N) return;
    if (N.next < now) N.next = now + 0.05;   // a throttled tab doesn't pile notes up
    while (N.next < now + 0.3) {
      if (N.style !== 'pluck' && NOODLES[N.style]) {   // v0.9: the band's own noodle
        var room = ambOk(3, now), x = room ? NOODLES[N.style](N, ctx, amb.bed.gain, N.next) : [[], 0.3];
        if (x[0].length) { track(x[0], 'amb'); counts.noodles++; }
        N.next += x[1];
        continue;
      }
      if (ambOk(1, now)) {
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
      if (ambOk(2, now)) { track(thump(ctx, amb.bed.gain, R.next, noise), 'amb'); counts.thumps++; }
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
    var seat = st.seat && st.seat !== 'drums' ? st.seat : undefined;   // v1.1: your part on the radio too (a string seat's song)
    amb.radio = player(song.pattern, { genre: st.genre || 'metal', section: null, loop: true, songId: song.id, seat: seat, part: seat ? song.pattern.part : undefined }, { rig: radioRig, quiet: true });
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
  // v1.0 (Lane P): the crowd's raw audio is plain JS DSP (no AudioContext needed), so it starts on the first garage entry
  // (a new or loaded career) in the same small slices, instead of after the first tap: the first gig's crowd is ready even
  // on a slow phone that books a show within seconds of unlocking the audio.
  var prewarmT = 0;
  function prewarmCrowd() {
    if (prewarmT || CROWD_PARTS.concat(CROWD_EXTRA).every(function (k) { return CROWD_RAW[k]; })) return;
    prewarmT = setTimeout(function step() {
      prewarmT = 0;
      if (current && current.playing && !current.radio) { prewarmT = setTimeout(step, 500); return; }   // never mid-song
      var k = CROWD_PARTS.concat(CROWD_EXTRA).filter(function (x) { return !CROWD_RAW[x]; })[0];
      if (!k) return;
      try { crowdRun(k, 8); } catch (e) { return; }
      prewarmT = setTimeout(step, 25);
    }, 25);
  }
  A.prewarm = function () { prewarmCrowd(); return CROWD_PARTS.concat(CROWD_EXTRA).filter(function (k) { return CROWD_RAW[k]; }).length; };
  GG.on('career:new', prewarmCrowd);
  GG.on('career:loaded', prewarmCrowd);
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
    var oc = new OAC(2, Math.ceil(sr * seconds), sr), dest = oc.destination, tally = {}, tl = null, seatOut = null;
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
      if (spec.lane && spec.pre) {   // v1.0 (tests): the pre-rendered hit of this kit, played as the live taps play it
        var hb = spec.pre, hs = oc.createBufferSource(); hs.buffer = hb; hs.connect(port.drums); hs.start(0.05);
      } else if (spec.lane) drumHit(r, port, spec.lane, 0.05, spec.cap || 2, spec.variant);
      else if (spec.seatNotes) {   // v1.1 (tests): your notes, as A.pluck / strum / lead play them, + releases
        seatOut = spec.seatNotes.map(function (x) {
          var hn = seatPlay(r, x.fn || 'pluck', x.midi, 0.05 + (x.at || 0), x.o || {});
          if (hn && x.release != null) seatRelease(r, hn, 0.05 + x.release);
          return hn ? { kind: hn.kind, t: hn.t, end: hn.end, n: hn.n, hold: hn.hold, cut: hn.cut } : null;
        });
      }
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
          singer: spec.singer, rival: spec.rival, soloist: spec.soloist, seat: spec.seat, part: spec.part });   // (v1.1 seat, part)
        var mute = {}; (spec.mute || []).forEach(function (k) { mute[k] = 1; });   // v1.1: muted kinds never play (nor tally)
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
          if (mute[ev.kind]) return;
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
        bed: bed, voice: tl ? tl.voice || null : null, midi: tl && tl.midi || null, solo: tl ? tl.solo || null : null, rigs: r ? { metal: !!r.metal, amps: Object.keys(r.amps || {}) } : null,
        seat: seatOut, tlSeat: tl ? tl.seat || null : null };
    });
  };
  A.renderOffline.probe = true;   // v0.7.2 feature flag (spec.probe, spec.crowd, stereo)
  // v1.0 (tests): the dry pre-rendered hit for (genre, kit tier, lane, variant, cap) at sample rate sr -> Promise<AudioBuffer>,
  // rendered exactly as preBuild renders the live kit's set; feed it to renderOffline({ lane, pre: buffer, quality, genre }).
  A.prerenderHit = function (o) {
    o = o || {};
    var OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext, k = kitFor(o.genre || 'metal', o.quality == null ? REF_QUALITY : o.quality);
    var D = DRUMS[o.lane], sr = o.sr || 44100, cap = o.cap || (o.lane === 'cymbal' ? 0.9 : 0.5);
    if (!OAC || !D) return Promise.reject(new Error('no offline audio / lane'));
    var d = Math.max(0.012, Math.min(D.len(k, o.variant), cap)), oc = new OAC(1, Math.ceil((d + 0.006) * sr), sr);
    D.play({ ctx: oc, noise: noiseBuffer(oc), busy: [], band: [], cap: 99, bandCap: 99, kit: k }, { drums: oc.destination }, 0, d, k, o.variant);
    return oc.startRendering();
  };

  // ---- v1.2 "Soundcheck" stage-0 stubs (contract §3.7): each returns the 1.1 behaviour. Lanes replace them by assignment in
  // 31_audio_feel.js (feelFor, feelPlan, tapVel: F), 30 / 32_audio_dsp.js (warm, realism, GG.dsp: I), 33_audio_voice.js (GG.voice: V).
  A.feelFor = function () { return null; };
  A.feelPlan = function () { return null; };
  A.tapVel = function () { return undefined; };
  A.warm = function () { return Promise.resolve(); };
  A.realism = function (tier) {
    var T = C.REALISM || [];
    tier = tier == null ? A.kitQuality() : tier | 0;
    return T[Math.max(0, Math.min(T.length - 1, tier))] || null;
  };
  GG.dsp = GG.dsp || {};
  GG.voice = GG.voice || {};

  GG.registerDebug('audio', function () {
    return { state: ctx ? ctx.state : 'none', muted: A.isMuted(), classic: A.isClassic(), voices: voices, playing: A.isPlaying(),
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
      noodle: amb.noodle ? { who: amb.noodle.who, style: amb.noodle.style } : null, vocTypes: Object.assign({}, vocTypes), extras: CROWD_EXTRA.filter(function (k) { return CB && CB[k]; }),
      // v1.0 (Lane P): the global voice cap, the pre-rendered tap hits, the crowd's raw parts built before the unlock
      global: ctx ? A.voiceStats() : null, prerender: { key: PRE.key, ready: PRE.ready, building: PRE.building, renders: PRE.renders, hits: PRE.hits, ms: PRE.ms },
      crowdRaw: CROWD_PARTS.concat(CROWD_EXTRA).filter(function (k) { return CROWD_RAW[k]; }).length,
      // v1.1 Seats: your notes (per voice, the last one), the song's muted / played kinds, the seat preview
      seat: { notes: Object.assign({}, SEATS.notes), released: SEATS.released, choked: SEATS.choked, cancelled: SEATS.cancelled,
        last: SEATS.last ? Object.assign({}, SEATS.last) : null, live: rig && rig.seatLive ? rig.seatLive.filter(function (h) { return h.end > ctx.currentTime; }).length : 0,
        song: current && current.playing ? { seat: current.seat, mute: current.mute.slice(), kinds: Object.assign({}, current.kinds), muted: Object.assign({}, current.muted) } : null,
        preview: { playing: !!(preview.h && preview.h.playing), n: preview.n, last: preview.last ? Object.assign({}, preview.last) : null,
          kinds: preview.h ? Object.assign({}, preview.h.kinds) : null } } };
  });
})(window.GG);
