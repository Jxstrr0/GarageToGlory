// 5h_ui_settings.js (v0.6.1, SETTINGS agent; Addendum 1 C4): the settings screen, audio calibration, practice mode.
//   Screens: 'settings' (full; from the title ⚙ and the ☰ menu; data.tab 'play' scrolls to Play) · 'calib' (full; tap
//   along to eight clicks -> audio offset, then tap the flashing light -> visual offset; saved per profile, phone speaker /
//   headphones; data.first = the automatic first-launch run, skippable) · 'practice' (sheet; any catalog song at 50/75/100%
//   speed, played in the gig's studio mode on a shadow state: no crowd, no pay, nothing saved).
//   Practice is reachable from the laptop song list (53) and from the drum kit (a button added under the sketch pad).
//   First launch: the title opens 'calib' once while settings.calibSeen is false (not under automation unless ?calib=1).
//   <html> classes: gg-big (bigger text), gg-calm (reduced flashing), gg-fast (faster animations).
//   v0.8.3: 'Drum sync' toggle (set-drumSync, settings.drumSync); the calibration's light check drives the highway under
//   Drum sync, the click test only classic timing; a big raw click lag (offset + output latency >= 120 ms) shows a
//   Bluetooth hint on the results (calib-bt).
//   testids: set-<key> toggles (set-drumSync), set-gigdiff-<d>, set-speed-<n>, set-profile-<p>, set-gfx-<q>, set-mix-<bus>, set-metronome,
//   set-muted, set-calibrate, set-practice, set-career-diff, set-save-load|backup|restore ; calib-profile-<p>, calib-start,
//   calib-pad, calib-light, calib-result, calib-visual-start, calib-retry, calib-save, calib-skip ; practice-speed-<pct>,
//   practice-song-<id>, laptop-practice, kit-practice. Debug: GG.debug('settings'), GG.debug('calib').
(function (GG) {
  var ui = GG.ui, el = ui.el, btn = ui.btn, U = GG.util, P = GG.prefs;
  function prefs() { try { return P.get(); } catch (e) { return {}; } }
  function set(o) { return P.set(o); }

  /* ---- <html> classes ------------------------------------------------------------------------------------ */
  function applyClasses() {
    var pf = prefs(), h = typeof document !== 'undefined' && document.documentElement;
    if (!h) return;
    h.classList.toggle('gg-big', !!pf.bigText);
    h.classList.toggle('gg-calm', !!pf.reducedFlash);
    h.classList.toggle('gg-fast', !!pf.fastAnim);
  }
  applyClasses();
  GG.on('settings:changed', applyClasses);
  // v0.6.1 verify: audio keys written through GG.prefs.set (or a restored save) reach GG.audio's cached prefs.
  GG.on('settings:changed', function (p) {
    var k = (p && p.keys) || [];
    var hit = !k.length || k.some(function (x) { return /^(mix|metronome|brushes|muted)$/.test(x); });
    if (hit && GG.audio && GG.audio.applySettings) GG.audio.applySettings();
  });

  // v1.0 (Lane P): the graphics row gained 'Auto'; its four buttons are v1.0 controls (>= 48 px, four across at 390 px).
  if (typeof document !== 'undefined' && document.head && !document.getElementById('gg-set-gfx-css')) {
    var gcss = document.createElement('style'); gcss.id = 'gg-set-gfx-css';
    gcss.textContent = '.set-seg.set-gfx .btn { min-height: 48px; min-width: 48px; flex: 1 1 0; padding: 0 6px; }';
    document.head.appendChild(gcss);
  }

  /* ---- Building blocks ------------------------------------------------------------------------------------ */
  function row(label, sub, ctl, testid) {
    return el('div.set-row', testid ? { testid: testid } : null, [el('div.lbl', [el('b', label), sub ? el('span', sub) : null]), ctl]);
  }
  function toggle(s, key, label, sub) {
    var on = !!prefs()[key];
    return row(label, sub, btn('.btn.small.set-toggle' + (on ? '.primary' : ''), { testid: 'set-' + key, 'aria-pressed': on ? 'true' : 'false',
      onclick: function () { var o = {}; o[key] = !on; set(o); s.rerender(); } }, on ? 'On' : 'Off'));
  }
  function seg(s, key, opts, prefix, cur, cls) {
    return el('div.set-seg' + (cls ? '.' + cls : ''), opts.map(function (x) {
      var on = cur === x[0];
      return btn('.btn.small' + (on ? '.primary' : ''), { testid: prefix + x[2], 'aria-pressed': on ? 'true' : 'false',
        onclick: function () { var o = {}; o[key] = x[0]; set(o); s.rerender(); } }, x[1]);
    }));
  }
  function sec(title, id) { return el('div.caps.set-sec', id ? { id: id } : null, title); }
  function msText(ms) { return ms === 0 ? 'right on it' : Math.abs(ms) + ' ms ' + (ms > 0 ? 'late' : 'early'); }
  var PROFILE_NAME = { speaker: '🔊 Speaker', headphones: '🎧 Headphones' };
  var BUS_NAME = { drums: ['Drums', 'your taps + the kit'], band: ['Band', 'backing + vocals'], crowd: ['Crowd', 'cheers, boos, the murmur'], sfx: ['SFX', 'UI sounds, ambience, van radio'] };

  /* ---- Settings screen ---------------------------------------------------------------------------------- */
  ui.define('settings', {
    kind: 'full',
    build: function (s, d) {
      var pf = prefs(), st = GG.state, A = GG.audio;
      ui.append(s.body, [el('div.back-row', [btn('.icon-btn', { testid: 'btn-back', 'aria-label': 'Back', onclick: function () { ui.close(s.id); } }, '←'),
        el('div', [el('div.caps', 'Garage to Glory'), el('h1.display', 'Settings')])])]);

      // Career difficulty: picked on the new-career screen, locked for that career
      var cd = GG.difficulty ? GG.difficulty.of(st) : 'normal', ct = GG.difficulty ? GG.difficulty.text(cd) : { name: cd, blurb: '' };
      s.body.appendChild(sec('Career'));
      s.body.appendChild(row(st ? 'Career difficulty: ' + ct.name + ' 🔒' : 'Career difficulty', st ? 'Locked for this career. ' + ct.blurb : 'Chill, Normal or Brutal: you pick it when you start a new career.', null, 'set-career-diff'));

      // Play
      s.body.appendChild(sec('Play', 'set-play'));
      var gd = GG.gig && GG.gig.DIFFICULTIES && GG.gig.DIFFICULTIES[pf.gigDifficulty] ? pf.gigDifficulty : 'easy';
      s.body.appendChild(row('Gig difficulty', 'Timing window, stacked with your drum skill. Change it any time.', null));
      s.body.appendChild(seg(s, 'gigDifficulty', ['easy', 'normal', 'hard', 'expert'].map(function (x) { return [x, x.charAt(0).toUpperCase() + x.slice(1), x]; }), 'set-gigdiff-', gd));
      s.body.appendChild(row('Note speed', 'How fast the highway scrolls. Separate from difficulty.', null));
      s.body.appendChild(seg(s, 'noteSpeed', P.NOTE_SPEEDS.map(function (v) { return [v, '×' + v, String(Math.round(v * 100))]; }), 'set-speed-', pf.noteSpeed));
      s.body.appendChild(toggle(s, 'noFail', 'No-fail', "The crowd can't turn hostile. Nobody gets booed off."));
      s.body.appendChild(toggle(s, 'autoKick', 'Auto-kick', 'The kick lane plays itself (as Goods). Your right foot can rest.'));
      s.body.appendChild(toggle(s, 'lefty', 'Lefty mode', 'Mirrors the lanes: kick on the right.'));
      s.body.appendChild(toggle(s, 'drumSync', 'Drum sync', "Your drums land right on the band's beat. Play by the highway. Off: classic timing, judged by your calibration's click test (for playing by ear)."));
      if (st && (st.songs || []).length) s.body.appendChild(btn('.btn.block', { testid: 'set-practice', style: 'margin-top:8px', onclick: function () { ui.show('practice'); } }, '🥁 Practice a song'));

      // Audio
      s.body.appendChild(sec('Audio + timing', 'set-audio'));
      s.body.appendChild(row('Listening on', 'Bluetooth adds delay: each profile keeps its own calibration.', null));
      s.body.appendChild(seg(s, 'audioProfile', P.PROFILES.map(function (p) { return [p, PROFILE_NAME[p], p]; }), 'set-profile-', pf.audioProfile));
      var c = pf.calib[pf.audioProfile];
      s.body.appendChild(row('Calibration', c.at ? 'Taps ' + msText(c.audio) + ' · eyes ' + msText(c.visual) : 'Not calibrated yet on this profile.',
        btn('.btn.small', { testid: 'set-calibrate', onclick: function () { ui.show('calib', { profile: pf.audioProfile }); } }, c.at ? 'Redo' : 'Calibrate')));
      if (A && A.isMuted) s.body.appendChild(row('Sound', null, btn('.btn.small.set-toggle' + (A.isMuted() ? '' : '.primary'), { testid: 'set-muted',
        onclick: function () { A.toggleMuted(); s.rerender(); } }, A.isMuted() ? 'Off' : 'On')));
      if (A && typeof A.setVolume === 'function' && typeof A.getVolume === 'function') {   // lane A's mixer
        ((GG.contracts && GG.contracts.MIX_BUSES) || ['drums', 'band', 'crowd', 'sfx']).forEach(function (bus) {
          var v = A.getVolume(bus); v = v == null ? 1 : v;
          var n = BUS_NAME[bus] || [bus, ''];
          s.body.appendChild(el('div.set-row', { style: 'flex-wrap:wrap' }, [el('div.lbl', [el('b', n[0]), el('span', n[1])]),
            el('input.set-slider', { type: 'range', min: 0, max: 100, step: 5, value: Math.round(v * 100), testid: 'set-mix-' + bus, 'aria-label': n[0] + ' volume',
              oninput: function (e) { try { A.setVolume(bus, (+e.target.value) / 100); } catch (err) { /* ignore */ } } })]));
        });
      }
      if (A && typeof A.setMetronome === 'function' && typeof A.metronome === 'function') {
        var mo = !!A.metronome();
        s.body.appendChild(row('Metronome', 'A click under the sequencer while you write.', btn('.btn.small.set-toggle' + (mo ? '.primary' : ''), { testid: 'set-metronome',
          'aria-pressed': mo ? 'true' : 'false', onclick: function () { A.setMetronome(!mo); s.rerender(); } }, mo ? 'On' : 'Off')));
      }
      if (A && typeof A.applySettings === 'function') {   // country brushed snare (off = ghost notes)
        var br = (GG.save && GG.save.settings && GG.save.settings().brushes) !== false;
        s.body.appendChild(row('Brushes', 'Country snare: brushes, or ghost notes when off.', btn('.btn.small.set-toggle' + (br ? '.primary' : ''), { testid: 'set-brushes',
          'aria-pressed': br ? 'true' : 'false', onclick: function () { GG.prefs.set({ brushes: !br }); s.rerender(); } }, br ? 'On' : 'Off')));
      }

      // Look + feel
      s.body.appendChild(sec('Look + feel', 'set-look'));
      // v1.0 (§0 Q8): Auto is the default: a little softer than High on a sharp phone screen, steps down only when frames run slow.
      s.body.appendChild(row('Graphics', 'Auto picks the sharpness and backs off when frames run slow. Low saves battery: fewer pixels, a smaller crowd.', null));
      s.body.appendChild(seg(s, 'graphics', [['auto', 'Auto', 'auto'], ['low', 'Low', 'low'], ['med', 'Medium', 'med'], ['high', 'High', 'high']], 'set-gfx-', pf.graphics, 'set-gfx'));
      s.body.appendChild(toggle(s, 'colourblind', 'Colourblind lanes', 'Lane colours anyone can tell apart.'));
      if (pf.colourblind) s.body.appendChild(el('div.row', { testid: 'set-cb-preview', style: 'gap:4px;margin:6px 0' }, GG.contracts.LANES.map(function (l) {
        return el('span.tag', { style: { background: P.CB_COLOURS[l], color: '#111', flex: '1 1 0', textAlign: 'center' } }, (ui.LANES && ui.LANES[l] ? ui.LANES[l].name : l));
      })));
      s.body.appendChild(toggle(s, 'bigText', 'Bigger text', null));
      s.body.appendChild(toggle(s, 'reducedFlash', 'Reduced flashing', 'Calmer stage lights, no hit flashes, no pyro strobe.'));
      s.body.appendChild(toggle(s, 'cameraShake', 'Camera shake', null));
      s.body.appendChild(toggle(s, 'skipVan', 'Skip van scenes', 'Straight to the load-in (road cards still happen).'));
      s.body.appendChild(toggle(s, 'fastAnim', 'Faster animations', 'Snappier screens, shorter drives.'));

      // Saves
      s.body.appendChild(sec('Saves'));
      s.body.appendChild(el('div.row', [
        btn('.btn.grow', { testid: 'set-save-load', onclick: function () { ui.show('load'); } }, 'Slots'),
        btn('.btn.grow', { testid: 'set-save-backup', disabled: !st, onclick: function () { ui.show('code', { mode: 'backup' }); } }, 'Back up'),
        btn('.btn.grow', { testid: 'set-save-restore', onclick: function () { ui.show('code', { mode: 'restore' }); } }, 'Restore')
      ]));
      s.body.appendChild(el('p.tiny.dim', { style: 'margin-top:8px' }, st ? 'Save into a slot from the ☰ menu. Back up = a save code you can paste anywhere.' : 'Back ups are save codes: paste one in to restore a career.'));
      s.foot.appendChild(btn('.btn.primary.big.block', { testid: 'set-done', onclick: function () { ui.close(s.id); } }, 'Done'));
      if (d && d.tab && !d._scrolled) {
        d._scrolled = true;
        var target = s.body.querySelector('#set-' + d.tab);
        if (target) setTimeout(function () { try { s.body.scrollTop = target.offsetTop - 12; } catch (e) { /* ignore */ } }, 0);
      }
    }
  });

  /* ---- Calibration ------------------------------------------------------------------------------------------ */
  var N_CLICKS = 8, GAP = 600, LEAD = 1000;
  var K = null;   // the test in progress
  var dbg = { open: false, step: null, clicks: [], taps: [], audio: null, visual: null, profile: null, clock: null };
  function stopTest() {
    if (!K) return;
    K.timers.forEach(clearTimeout); K.timers = [];
    K.running = false;
  }
  function ctxNow() { try { return GG.audio && GG.audio.context ? GG.audio.context() : null; } catch (e) { return null; } }
  function beep(c, when, hi) {
    var o = c.createOscillator(), g = c.createGain();
    o.type = 'square'; o.frequency.value = hi ? 1760 : 1320;
    g.gain.setValueAtTime(0.0001, when); g.gain.exponentialRampToValueAtTime(0.3, when + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, when + 0.06);
    o.connect(g); g.connect(c.destination); o.start(when); o.stop(when + 0.08);
  }
  // Click i is heard at clicks[i] (performance.now() ms): scheduled on the AudioContext, mapped to the performance clock
  // once at the start (+ the output latency the gig clock also assumes), so later clock hiccups can't skew it.
  function startAudioTest(s) {
    stopTest();
    K = { kind: 'audio', clicks: [], taps: [], timers: [], running: true, n: 0 };
    try { if (GG.audio && GG.audio.unlock) GG.audio.unlock(); } catch (e) { /* ignore */ }
    var c = ctxNow(), p0 = performance.now(), i;
    if (c && c.state !== 'running' && c.resume) { try { c.resume(); } catch (e) { /* ignore */ } }
    if (c && c.state === 'running') {
      var a0 = c.currentTime, lat = U.clamp(c.outputLatency > 0 ? c.outputLatency : c.baseLatency > 0 ? c.baseLatency : 0.025, 0, 0.3);
      K.lat = Math.round(lat * 1000);   // v0.8.3: the raw lag (offset + this) is what a Bluetooth headset adds
      for (i = 0; i < N_CLICKS; i++) { var at = a0 + (LEAD + i * GAP) / 1000; try { beep(c, at, i % 4 === 0); } catch (e) { /* ignore */ } K.clicks.push(p0 + LEAD + i * GAP + lat * 1000); }
      dbg.clock = 'audio';
    } else {
      for (i = 0; i < N_CLICKS; i++) K.clicks.push(p0 + LEAD + i * GAP);
      K.clicks.forEach(function (t) { K.timers.push(setTimeout(function () { if (GG.audio && GG.audio.sfx) GG.audio.sfx('tap'); }, t - p0)); });
      dbg.clock = 'performance';
    }
    K.clicks.forEach(function (t, k) { K.timers.push(setTimeout(function () { K.n = k + 1; count(s); }, Math.max(0, t - performance.now()))); });
    K.timers.push(setTimeout(function () { finishTest(s); }, K.clicks[N_CLICKS - 1] - p0 + 700));
    dbg.clicks = K.clicks.slice(); dbg.taps = K.taps;
    s.rerender({ step: 'audio', profile: s.data.profile, first: s.data.first, audio: s.data.audio });
  }
  function startVisualTest(s) {
    stopTest();
    K = { kind: 'visual', clicks: [], taps: [], timers: [], running: true, n: 0 };
    var p0 = performance.now();
    for (var i = 0; i < N_CLICKS; i++) (function (k) {
      K.timers.push(setTimeout(function () {
        var l = document.querySelector('[data-testid="calib-light"]');
        if (l) l.classList.add('on');
        K.clicks[k] = performance.now(); K.n = k + 1; dbg.clicks = K.clicks.slice(); count(s);
        K.timers.push(setTimeout(function () { if (l) l.classList.remove('on'); }, 110));
      }, LEAD + k * GAP));
    })(i);
    K.timers.push(setTimeout(function () { finishTest(s); }, LEAD + (N_CLICKS - 1) * GAP + 700));
    dbg.clicks = []; dbg.taps = K.taps;
    s.rerender({ step: 'visual', profile: s.data.profile, first: s.data.first, audio: s.data.audio });
  }
  function count(s) { var e = s.body && s.body.querySelector('[data-testid="calib-count"]'); if (e && K) e.textContent = (K.kind === 'audio' ? 'Click ' : 'Flash ') + Math.min(K.n, N_CLICKS) + ' of ' + N_CLICKS; }
  function finishTest(s) {
    if (!K) return;
    var kind = K.kind, r = P.calibCompute(K.clicks.filter(function (x) { return x != null; }), K.taps, { interval: GAP });
    stopTest();
    if (kind === 'audio') r.lat = K.lat || 0;
    dbg[kind] = r;
    var d = { profile: s.data.profile, first: s.data.first, audio: s.data.audio, visual: s.data.visual };
    d[kind] = r; d.step = kind + 'Done';
    if (ui.isOpen('calib')) s.rerender(d);
  }
  function padTap(ev) {
    if (!K || !K.running) return;
    if (ev.cancelable) ev.preventDefault();
    var now = performance.now(), t = ev.timeStamp > 0 && Math.abs(ev.timeStamp - now) < 1000 ? ev.timeStamp : now;
    K.taps.push(t);
    var pad = ev.currentTarget; if (pad && pad.classList) { pad.classList.add('hit'); setTimeout(function () { pad.classList.remove('hit'); }, 90); }
  }
  ui.define('calib', {
    kind: 'full', sticky: true,
    build: function (s, d) {
      var pf = prefs(), profile = P.PROFILES.indexOf(d.profile) >= 0 ? d.profile : pf.audioProfile, step = d.step || 'intro';
      d.profile = profile;
      dbg.open = true; dbg.step = step; dbg.profile = profile;
      function skip() { stopTest(); set({ calibSeen: true }); ui.close(s.id); }
      ui.append(s.body, [el('div.back-row', [d.first ? null : btn('.icon-btn', { testid: 'btn-back', 'aria-label': 'Back', onclick: function () { stopTest(); ui.close(s.id); } }, '←'),
        el('div', [el('div.caps', d.first ? 'Before the first gig' : 'Settings'), el('h1.display', 'Calibrate')])])]);
      if (step === 'intro') {
        ui.append(s.body, [
          el('p.screen-sub', "Phones are late. Bluetooth is later. The light check lines the highway up with your eyes (Drum sync); the click test is for classic timing."),
          el('div.caps.set-sec', 'Calibrating for'),
          el('div.set-seg', P.PROFILES.map(function (p) {
            return btn('.btn.small' + (p === profile ? '.primary' : ''), { testid: 'calib-profile-' + p, onclick: function () { s.rerender({ profile: p, first: d.first }); } }, PROFILE_NAME[p]);
          })),
          el('p.small.dim', { style: 'margin-top:10px' }, 'Step 1: tap the pad on each of eight clicks. Step 2: tap when the light flashes. Takes twenty seconds.'),
          GG.audio && GG.audio.isMuted && GG.audio.isMuted() ? el('p.small.amber', 'Your sound is off. The clicks play anyway; turn your phone up.') : null
        ]);
        s.foot.appendChild(el('div.stack', [btn('.btn.primary.big.block', { testid: 'calib-start', onclick: function () { startAudioTest(s); } }, 'Start the tap test'),
          btn('.btn.block', { testid: 'calib-visual-only', onclick: function () { startVisualTest(s); } }, 'Light check only (Drum sync)'),
          btn('.btn.ghost.block', { testid: 'calib-skip', onclick: skip }, d.first ? 'Skip for now (Settings → Calibrate later)' : 'Cancel')]));
        return;
      }
      if (step === 'audio' || step === 'visual') {
        var pad = el('div.calib-pad', { testid: 'calib-pad', onpointerdown: padTap }, step === 'audio' ? 'Tap on the click' : 'Tap on the flash');
        ui.append(s.body, [
          el('p.screen-sub', step === 'audio' ? 'Listen. Tap the pad exactly on each click. Eyes closed works best.' : 'Watch the light. Tap the moment it flashes.'),
          step === 'visual' ? el('div.calib-light', { testid: 'calib-light', onpointerdown: padTap }) : null,
          el('div.caps.center', { testid: 'calib-count', style: 'margin:10px 0' }, 'Get ready…'),
          pad
        ]);
        s.foot.appendChild(btn('.btn.ghost.block', { testid: 'calib-skip', onclick: skip }, 'Skip'));
        return;
      }
      // results
      var a = d.audio, v = d.visual;
      function line(r, what) { return r ? (r.ok ? what + ': ' + msText(r.offset) + ' (' + r.n + ' taps)' : what + ": didn't catch enough taps.") : null; }
      ui.append(s.body, [
        el('div.panel', { testid: 'calib-result' }, [el('b', PROFILE_NAME[profile]), el('div', line(a, 'You hear + tap')), v ? el('div', line(v, 'You see + tap')) : null]),
        el('p.small.dim', { style: 'margin-top:8px' }, step === 'audioDone' ? 'Next, the light check: Drum sync lines the highway up with it.' : 'Saved per profile. Switch profiles from Settings or the setlist sheet.'),
        a && a.ok && a.offset + (a.lat || 0) >= 120 ? el('p.small.amber', { testid: 'calib-bt' }, "That's a big delay (Bluetooth?). Drum sync keeps your drums with the band; watch the highway rather than your ears.") : null
      ]);
      var foot = [];
      if (step === 'audioDone') foot.push(btn('.btn.primary.big.block', { testid: 'calib-visual-start', onclick: function () { startVisualTest(s); } }, 'Next: the light check'));
      if ((a && a.ok) || (v && v.ok)) foot.push(btn('.btn' + (step === 'visualDone' ? '.primary.big' : '') + '.block', { testid: 'calib-save', onclick: function () {
        var o = { at: Date.now() };
        if (a && a.ok) o.audio = a.offset;
        if (v && v.ok) o.visual = v.offset;
        P.setCalib(profile, o);
        ui.close(s.id);
        ui.toast('Calibrated for ' + PROFILE_NAME[profile].replace(/^\S+ /, '').toLowerCase() + '. '   // v0.9: first launch has no band yet
          + (GG.state ? ui.fill('{deadpan} gives a slow thumbs-up.', GG.state) : 'Somebody at the back gives a slow thumbs-up.'));
      } }, 'Save calibration'));
      foot.push(btn('.btn.ghost.block', { testid: 'calib-retry', onclick: function () { if (step === 'visualDone') startVisualTest(s); else startAudioTest(s); } }, 'Try again'));
      s.foot.appendChild(el('div.stack', foot));
    },
    onClose: function () { stopTest(); K = null; dbg.open = false; dbg.step = null; GG.emit('settings:changed', { keys: ['calib'] }); }
  });
  GG.registerDebug('calib', function () { return { open: dbg.open, step: dbg.step, profile: dbg.profile, clock: dbg.clock, clicks: dbg.clicks.slice(), taps: (dbg.taps || []).slice(), audio: dbg.audio, visual: dbg.visual }; });

  // First launch: the title opens the calibration once (skippable). Automation (navigator.webdriver) only with ?calib=1.
  var firstDone = false;
  GG.on('screen:open', function (p) {
    if (firstDone || !p || p.id !== 'title') return;
    firstDone = true;
    var force = typeof location !== 'undefined' && /[?&]calib=1\b/.test(location.search || '');
    if (prefs().calibSeen || (!force && typeof navigator !== 'undefined' && navigator.webdriver)) return;
    setTimeout(function () { if (ui.top() === 'title') ui.show('calib', { first: true }); }, 60);
  });

  /* ---- Practice mode ---------------------------------------------------------------------------------------- */
  var SPEEDS = [[0.5, '50%'], [0.75, '75%'], [1, '100%']];
  ui.practice = function (songId, speed) {
    var st = GG.state, song = st && GG.songs.byId(st, songId);
    if (!st || !song || !ui.playGig) return false;
    speed = speed > 0 && speed <= 1 ? speed : 1;
    var slow = Object.assign({}, song, { pattern: Object.assign({}, song.pattern, { bpm: Math.max(30, Math.round((song.pattern.bpm || 120) * speed)) }) });
    var shadow = Object.assign({}, st, { liveGig: null, songs: (st.songs || []).map(function (x) { return x.id === songId ? slow : x; }) });
    var pct = Math.round(speed * 100);
    var gig = { venueId: 'practice:' + songId, name: 'Practice · ' + song.title, city: ui.space(st, true), tier: 1, kind: 'studio',
      capacity: 1, deal: 'flat', pay: 0, gas: 0, quirk: '', source: 'practice', setSize: 1 };
    if (ui.isOpen('practice')) ui.close('practice');
    return ui.playGig(gig, function (r) {
      if (r) ui.toast('Practice at ' + pct + '%: ' + Math.round((r.accuracy || 0) * 100) + '% hit, best combo ' + (r.maxCombo || 0) + '. Nobody saw. Perfect.', { who: 'Practice' });
    }, { studio: { state: shadow, songId: songId, label: 'Practice · “' + song.title + '” · ' + pct + '% speed' }, practice: { speed: speed }, apply: function () {} });
  };
  ui.define('practice', {
    kind: 'sheet', tall: true, title: 'Practice',
    build: function (s, d) {
      var st = GG.state; if (!st) return;
      var speed = d.speed || 0.75;
      s.setTitle('Practice', 'No crowd · no pay · nothing saved');
      s.body.appendChild(el('p.small.dim', ui.fill('Any song from your catalog, slowed down if you like. {deadpan} holds the click. Nobody is watching. Probably.', st)));
      s.body.appendChild(el('div.caps.set-sec', 'Speed'));
      s.body.appendChild(el('div.set-seg', SPEEDS.map(function (x) {
        return btn('.btn.small' + (x[0] === speed ? '.primary' : ''), { testid: 'practice-speed-' + Math.round(x[0] * 100), onclick: function () { s.rerender({ speed: x[0] }); } }, x[1]);
      })));
      s.body.appendChild(el('div.caps.set-sec', 'Pick a song'));
      var list = el('div.panel', { style: 'padding:0 12px' });
      GG.songs.best(st).forEach(function (song) {
        var r = song.rating || {};
        list.appendChild(btn('.song', { testid: 'practice-song-' + song.id, onclick: function () { ui.practice(song.id, speed); } },
          el('div.row', [el('span', { style: 'font-size:20px' }, '🥁'), el('div.grow', [el('b', song.title),
            el('div.tiny.dim', 'Diff ' + (r.difficulty || '?') + ' · ' + Math.round((song.pattern && song.pattern.bpm || 120) * speed) + ' bpm at this speed')])])));
      });
      s.body.appendChild(list);
    }
  });
  // The drum kit (the sketch pad) gets a way into practice mode too.
  GG.on('ui:layout', function (p) {
    if (!p || p.id !== 'seq' || !ui.get) return;
    var e = ui.get('seq');
    if (!e || !e.data || e.data.mode !== 'sketch' || !GG.state || !(GG.state.songs || []).length) return;
    if (e.body.querySelector('[data-testid="kit-practice"]')) return;
    e.body.appendChild(btn('.btn.ghost.block', { testid: 'kit-practice', style: 'margin-top:10px', onclick: function () { ui.show('practice'); } }, '🥁 Practice a song instead'));
  });

  GG.registerDebug('settings', function () {
    var h = document.documentElement;
    return { prefs: prefs(), classes: { big: h.classList.contains('gg-big'), calm: h.classList.contains('gg-calm'), fast: h.classList.contains('gg-fast') },
      render: GG.render && GG.render.prefs ? GG.render.prefs() : null, difficulty: GG.difficulty ? GG.difficulty.of(GG.state) : null };
  });
})(window.GG);
