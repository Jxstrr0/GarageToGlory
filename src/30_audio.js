// 30_audio.js: tiny synthesized sound effects (Web Audio only, no files).
// The AudioContext is created lazily on the first user gesture (GG.audio.unlock, wired in 60_main).
// All sounds are oscillators + one shared noise buffer through a master gain; at most MAX_VOICES sources
// play at once (extra sounds are dropped, never queued). Mute persists via GG.save settings.
//   GG.audio.unlock() ; sfx('tap'|'card'|'cash'|'cheer'|'boo'|'whoosh'|'drum'|'save') ; setMuted(bool) ;
//   isMuted() ; toggleMuted() ; suspend() ; resume()
(function (GG) {
  var A = GG.audio = GG.audio || {};
  var MAX_VOICES = 8, VOLUME = 0.32;
  var ctx = null, master = null, noise = null, voices = 0, muted = null, suspended = false;

  function settings() {
    try { return (GG.save && GG.save.settings && GG.save.settings()) || {}; } catch (e) { return {}; }
  }
  A.isMuted = function () { if (muted === null) muted = !!settings().muted; return muted; };

  A.unlock = function () {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      try { ctx = new AC(); } catch (e) { ctx = null; return false; }
      master = ctx.createGain();
      master.gain.value = A.isMuted() ? 0 : VOLUME;
      master.connect(ctx.destination);
      // One second of white noise, shared by every noisy sound.
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      var d = noise.getChannelData(0), s = 22222;
      for (var i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = s / 1073741823.5 - 1; }
    }
    if (ctx.state === 'suspended' && !suspended) { try { ctx.resume(); } catch (e) { /* ignore */ } }
    return true;
  };

  A.setMuted = function (m) {
    muted = !!m;
    if (master) master.gain.setTargetAtTime(muted ? 0 : VOLUME, ctx.currentTime, 0.02);
    try { if (GG.save && GG.save.saveSettings) GG.save.saveSettings(Object.assign({}, settings(), { muted: muted })); } catch (e) { /* ignore */ }
    return muted;
  };
  A.toggleMuted = function () { return A.setMuted(!A.isMuted()); };
  A.suspend = function () { suspended = true; if (ctx && ctx.state === 'running') { try { ctx.suspend(); } catch (e) { /* ignore */ } } };
  A.resume = function () { suspended = false; if (ctx && ctx.state === 'suspended') { try { ctx.resume(); } catch (e) { /* ignore */ } } };

  /* ---- Building blocks ----------------------------------------------------------------------------- */
  // Every source goes through voice(): counted while playing, released on 'ended'.
  function voice(src, t0, dur) {
    voices++;
    src.onended = function () { voices = Math.max(0, voices - 1); };
    src.start(t0); src.stop(t0 + dur + 0.05);
  }
  // Attack/decay envelope on a fresh gain node connected to `dest` (default master).
  function env(t0, attack, peak, decay, dest) {
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
    g.connect(dest || master);
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

  /* ---- Recipes: [voices needed, play(t0)] ---------------------------------------------------------- */
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

  GG.registerDebug('audio', function () { return { state: ctx ? ctx.state : 'none', muted: A.isMuted(), voices: voices }; });
})(window.GG);
