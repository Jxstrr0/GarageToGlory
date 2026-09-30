// 55_ui_gig.js: the live gig (v0.3). GG.ui.playGig(gig, done, opts):
//   setlist sheet ('gig-set') -> the show ('gig', full): top 2/3 = the 3D stage (GG.render.stage; a 2D backdrop when it's
//   missing), bottom 1/3 = a 2D-canvas note highway (lanes in the sequencer colours, notes fall to tap zones; multitouch
//   pointer events, D F J K on a keyboard). Between songs: "Song 2 of 3 - saved" + banter (the session keeps
//   state.liveGig and fires 'gig:song'; main autosaves). Results ('gig-results', full) -> "Wrap up the week" -> done(result).
//   A pending state.liveGig for this gig resumes at its next song. opts.apply(state, result) applies the result
//   (default: GG.career.finishGig in phase 'gig', else GG.gig.applyResult).
// v0.5 studio mode: opts.studio = { state, songId, label } plays ONE song as a studio take: no 3D stage, no crowd, no
//   results screen; the session runs on opts.studio.state (a shadow copy, so state.liveGig and autosaves stay clean) and
//   done(SONG_RESULT) fires after "Keep this take" (59b_ui_studio turns it into a 0..100 take).
// Timing: judged on the audio clock. "Heard" time = the AudioContext time now leaving the speakers (getOutputTimestamp,
// else currentTime - outputLatency), kept as an offset from performance.now() so a pointer event's timeStamp maps onto it
// exactly. The backing band plays from the scheduler with drums off; your taps play the drum voice; misses are silent.
// Pause suspends the AudioContext (without a context the song restarts on resume).
// GG.ui.gigAutoplay = true | { accuracy, jitterMs }: a bot plays each song instantly (tests, flows).
// v0.8 (SHOPUI): up to 6 lanes (toms, ride) fit a 390px phone (65px lanes; keys G / H for lanes 5 / 6); the results show r.merch.
// v0.6.1 (Addendum C4, SETTINGS): Expert; note speed (settings.noteSpeed scales the scroll); assists No-fail + Auto-kick
//   (session opts; auto kicks play the kick voice); the active calibration profile's audio offset is subtracted from every
//   tap before judgement and the highway draws (visual - audio) ahead; lefty mirrors lanes (drawing, touch, keys);
//   colourblind lane colours (GG.prefs.CB_COLOURS); the setlist sheet has Expert, the speaker/headphones quick switch
//   (gig-profile-<id>) and an assists line (btn-gig-settings). opts.practice = { speed } relabels a studio-mode run as practice.
// v0.7.2 double kicks (owner): a chart note with dbl/t2 stands for two kicks. It draws as a stacked pill with a ×2 badge;
//   one tap (or Auto-kick) judges it, then the second kick plays itself (GG.audio.hit('kick', ctxTime) on a healthy clock,
//   frame-due otherwise) t2 - hitT after the first kick is HEARD (the tap's own sound, stamped k1 on the song clock: it
//   carries the calibration offset + output latency), never within DBL_MIN of it, so no offset or late tap can flam;
//   a missed double plays nothing extra. Tapping the second kick too (an 'echo') makes no sound of its own (the scheduled
//   kick is that hit) unless its kick was dropped. Hits scheduled ahead are cancelled by stopAudio (GG.audio.hitCancel).
//   The kick zone flashes again + a small ring and the stage drummer's left foot kicks (GG.render.stage.kick2) when the
//   second kick is heard. Debug gigui adds doubles, doublesPlayed.
(function (GG) {
  var ui = GG.ui, C = GG.contracts, U = GG.util, el = ui.el;
  var LOOK = 1.15, ZONE = 66, DEFAULT_LAT = 0.025, LEAD_IN = 0.06;
  function difficulty() {
    var d = GG.save && GG.save.settings ? GG.save.settings().gigDifficulty : null;
    return GG.gig.DIFFICULTIES && GG.gig.DIFFICULTIES[d] ? d : (GG.gig.DEFAULT_DIFFICULTY || 'normal');
  }
  var AUTO_BOT = { accuracy: 0.9, jitterMs: 40 };
  var KEYS = { d: 0, f: 1, j: 2, k: 3, s: 0, l: 3, g: 4, h: 5 };   // v0.8: toms (lane 5) = G, ride (lane 6) = H
  var POP_TEXT = { perfect: 'PERFECT', good: 'GOOD', miss: 'MISS', fill: 'FILL!' };
  var POP_COLOR = { perfect: '#ffe27a', good: '#6fe39a', miss: '#ff6b5e', fill: '#c9a4ff' };
  var MOMENT_TEXT = { mosh: 'Mosh pit!', lighters: 'Lighters up', boo: 'Boooo', drinks: 'Incoming drinks!', wallOfDeath: 'Wall of death!',
    circlePit: 'Circle pit!', lineDance: 'Line dance!', capeSpin: 'Cape spin!', solo: 'Solo time', applause: 'Polite applause 🙇' };   // v0.7: a silent (Japanese) crowd between songs
  var BAND_TEXT = { solo: "{n}'s solo: keep it simple", fill: '{n} sneaks in a fill!', miss: '{n} missed a cue', capeSpin: '{n} spins the cape!' };
  var LEVEL_TEXT = { hostile: 'Hostile', bored: 'Bored', warm: 'Warm', hyped: 'Hyped', wild: 'Wild' };
  var BANTER = {
    marcel: ['Merci, {city}! This next one is about my lawn.', 'Please do not touch the cape. The cape touches you.'],
    dana: ['Somebody turn me up. No, more.', 'That was in tune. Mostly.'],
    jaxon: ['(counts to four under his breath)', 'is the fog machine supposed to smell like that'],
    kenji: ['(Kenji nods once. The crowd nods back.)'],
    rox: ['This one goes out to the parking authority.'], benny: ['I broke a string. I have eleven more. Go.'],
    moth: ['(Moth tunes a string that was already in tune.)'], chase: ['Make some noise for the bartender!'],
    lenny: ['Is anyone else hot? It is so hot up here.'], tamara: ['Next one is faster. Sorry, {player}.'],
    earl: ['Y’all still with us?'], clementine: ['This fiddle has been in the family four generations. Stand back.'],
    duke: ['(Duke adjusts his hat. Somebody whoops.)'],
    any: ['Thank you, {city}! We are {band}!', 'Anybody here drive in from out of town? Nobody? Okay.', 'Drink some water. Or whatever. Next one!']
  };

  var G = null;   // the show in progress (one at a time)
  function S() { return GG.state; }
  function fill(t) { return t && S() && GG.career.fillText ? GG.career.fillText(S(), t) : t; }
  function sfx(n) { if (GG.audio && GG.audio.sfx) GG.audio.sfx(n); }
  function auto() { return !!ui.gigAutoplay; }
  function lanesOf(state) { var n = state && state.gear && state.gear.lanes; return n >= 1 ? Math.min(n, C.LANES.length) : 4; }
  function laneColor(l) {
    if (G && G.cb && GG.prefs && GG.prefs.CB_COLOURS[C.LANES[l]]) return GG.prefs.CB_COLOURS[C.LANES[l]];
    var L = ui.LANES && ui.LANES[C.LANES[l]]; return L ? L.color : '#8899bb';
  }
  function col(l) { return G && G.lefty ? G.lanes - 1 - l : l; }   // v0.6.1 lefty: lane l is drawn (and tapped) in column col(l)
  function prefs() { try { return GG.prefs ? GG.prefs.get() : {}; } catch (e) { return {}; } }

  /* ---- Audio clock --------------------------------------------------------------------------------------- */
  function audioCtx() { try { return GG.audio && GG.audio.context ? GG.audio.context() : null; } catch (e) { return null; } }
  // Re-pairs the heard clock with performance.now(): small drift is smoothed, jumps (pause, glitches) snap.
  function resync(p, snap) {
    var c = G.actx || (G.actx = audioCtx()), off;
    G.syncAt = p;
    if (!c) return;
    var h = -1;
    if (c.state === 'running' && c.getOutputTimestamp) {   // a suspended context's last timestamp would keep extrapolating
      try {
        var ts = c.getOutputTimestamp();
        if (ts && ts.contextTime > 0 && ts.performanceTime > 0 && p - ts.performanceTime < 150) h = ts.contextTime + (p - ts.performanceTime) / 1000;
      } catch (e) { h = -1; }
    }
    // Health check (v0.5.1): phones can stall or suspend the audio clock (iOS silent switch, screen recording, Control
    // Centre) and headless browsers advance it in bursts. Only a running clock that kept pace with performance.now()
    // since the last check may steer the game clock; otherwise the game free-runs on performance.now().
    var prev = G.aSample, healthy = c.state === 'running' && prev && (p - prev.p) > 100 &&
      Math.abs((c.currentTime - prev.a) / ((p - prev.p) / 1000) - 1) < 0.08;
    G.aSample = { a: c.currentTime, p: p };
    G.clockOk = c.state === 'running' && (healthy || !prev);
    if (c.state !== 'running') return;
    var lat = c.outputLatency > 0 ? c.outputLatency : c.baseLatency > 0 ? c.baseLatency : DEFAULT_LAT;
    if (h < 0 || Math.abs(c.currentTime - h - lat) > 0.3) h = c.currentTime - Math.min(lat, 0.3);
    G.lat = U.clamp(c.currentTime - h, 0, 0.3);
    off = h - p / 1000;
    if (snap || !G.synced) { G.offset = off; G.synced = true; }
    else if (healthy) G.offset += U.clamp(off - G.offset, -0.004, 0.004);   // drift correction only, never a jump
  }
  function heardAt(p) { return p / 1000 + G.offset; }
  function heardNow() { return heardAt(performance.now()); }
  function songTime(p) { return heardAt(p) - G.zero; }

  /* ---- Stage (GG.render.stage from the STAGE agent; a 2D backdrop without it) ----------------------------- */
  function stageApi() { var R = GG.render; return G && G.stageOn && R && R.stage ? R.stage : null; }
  function stageCall(fn, a, b) {
    var st = stageApi(); if (!st || typeof st[fn] !== 'function') return;
    try { st[fn](a, b); } catch (e) { console.error('[gig] stage.' + fn + ' failed', e); }
  }
  function stageData(state, g) {
    var band = GG.content.bands && GG.content.bands[state.bandId], looks = {};
    (band && band.members || []).forEach(function (m) { looks[m.id] = m.look; });
    var v = Object.assign({}, GG.gig.venue(g.venueId) || {}, g);
    return { venue: v, crowd: G.attendance, capacity: g.capacity, genre: state.genre, flags: state.flags || {}, player: state.player,
      members: (GG.drama ? GG.drama.lineup(state) : state.members.filter(function (m) { return m.status === 'active'; })).map(function (m) {   // v0.4: + fill-ins
        return { id: m.id, name: m.name, role: m.role, mood: m.mood, look: m.look || looks[m.id] || null };
      }) };
  }
  function setupStage() {
    var R = GG.render, ok = false;
    if (!G.opts.studio && GG.main && GG.main.renderOk && R && R.available && R.stage && typeof R.stage.setup === 'function'
      && (!R.sceneNames || R.sceneNames().indexOf('stage') >= 0)) {
      try { ok = R.setScene('stage') !== false; if (ok) R.stage.setup(stageData(S(), G.gig)); }
      catch (e) { console.error('[gig] stage setup failed', e); ok = false; }
    }
    G.stageOn = ok;
    if (G.dom) G.dom.back.hidden = ok;
    guard();
  }
  // The 'gig' screen is live3d (main keeps the scene drawing under it); frame the stage into the band between the
  // top bar and the highway (the stage ignores setViewInsets).
  var guardRaf = 0;
  function guard() {
    if (guardRaf || !G) return;
    guardRaf = requestAnimationFrame(function () {
      guardRaf = 0;
      if (!G || !G.stageOn || !G.dom || ui.top() !== 'gig') return;
      var H = window.innerHeight || 844, hw = G.dom.hw.getBoundingClientRect();
      if (hw.height) stageCall('setFrame', { top: Math.round(G.dom.bar.getBoundingClientRect().bottom), bottom: Math.round(H - hw.top) });
    });
  }
  function restoreScene() {   // back to the garage (the stage hands its GPU memory back)
    var R = GG.render;
    if (!(G && G.stageOn && GG.main && GG.main.renderOk && R && R.available)) return;
    try { R.setScene(S() ? 'garage' : 'none'); } catch (e) { console.error('[gig] restore scene failed', e); }
  }

  /* ---- Events ------------------------------------------------------------------------------------------ */
  function banner(text, kind) {
    var b = G && G.dom && G.dom.banner; if (!b) return;
    b.textContent = text; b.className = 'gig-banner show' + (kind ? ' ' + kind : '');
    clearTimeout(G.bannerT);
    G.bannerT = setTimeout(function () { if (G && G.dom) G.dom.banner.className = 'gig-banner'; }, 1500);
  }
  var HANDLERS = {
    // The stage takes 'gig:judge' (stick hits, flinches), 'crowd:level' and 'crowd:moment' straight off the bus.
    'gig:judge': function (p) {
      if (!G || !G.chart) return;
      var li = C.LANES.indexOf(p.lane);
      if (p.judgement && !p.auto) { G.popKind = p.judgement; G.popLane = li; G.popAt = performance.now(); }
      if (p.judgement === 'perfect' || p.judgement === 'good') G.burst[li] = performance.now();
    },
    'crowd:level': function (p) { if (G && G.dom) { G.dom.level.textContent = LEVEL_TEXT[p.level] || p.level; G.dom.crowd.dataset.level = p.level; G.dom.back.dataset.level = p.level; } },
    'crowd:moment': function (p) {
      if (!G || G.opts.studio) return;
      if (p.kind !== 'solo') banner(MOMENT_TEXT[p.kind] || p.kind, p.kind === 'boo' || p.kind === 'drinks' ? 'bad' : '');
      if (p.kind === 'boo') sfx('boo'); else if (p.kind !== 'solo' && p.kind !== 'drinks') sfx('cheer');
    },
    'gig:band': function (p) {
      if (!G) return;
      stageCall('bandAction', p.who, p.action);
      var t = BAND_TEXT[p.action]; if (t) banner(t.replace('{n}', ui.who(p.who).short), p.action === 'miss' ? 'bad' : 'band');
    },
    'audio:end': function (p) {   // the song stopped under us (app hidden, another screen): pause, restart on resume
      if (!G || !G.handle || p.handle !== G.handle) return;
      G.handle = null;
      if ((G.mode === 'play' || G.mode === 'count') && G.chart && G.t < G.chart.duration - 0.1) pause(true);
    },
    'ui:stack': guard, 'ui:layout': guard, 'screen:open': guard, 'screen:close': guard
  };
  function onVisibility() { if (document.hidden) { if (G && (G.mode === 'play' || G.mode === 'count')) pause(true); } else guard(); }
  function listen(on) {
    Object.keys(HANDLERS).forEach(function (ev) { if (on) GG.on(ev, HANDLERS[ev]); else GG.off(ev, HANDLERS[ev]); });
    if (on) { document.addEventListener('visibilitychange', onVisibility); window.addEventListener('resize', onResize); window.addEventListener('keydown', onKey); document.addEventListener('pointerdown', onDown, { capture: true, passive: false }); }
    else { document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('resize', onResize); window.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown, { capture: true }); }
  }

  GG.on('settings:changed', function () { var e = ui.get && ui.get('gig-set'); if (e && G && !G.ses) e.rerender(); });   // v0.6.1

  /* ---- Entry --------------------------------------------------------------------------------------------- */
  ui.gigAutoplay = ui.gigAutoplay || false;
  ui.playGig = function (gig, done, opts) {
    var st = S(); if (!st || !gig) return false;
    if (G) teardown();
    G = { gig: gig, done: done, opts: opts || {}, mode: 'set', ses: null, chart: null, t: 0, zero: 0, offset: 0, synced: false,
      syncAt: -1e9, lat: DEFAULT_LAT, actx: null, handle: null, paused: false, restart: false, raf: 0, burst: [0, 0, 0, 0, 0, 0], dash: [5, 4], noDash: [], ap: 0, autoN: 0, autoAt: [-1e9, -1e9, -1e9, -1e9, -1e9, -1e9],
      dq: [], dp: 0, dblN: 0, k2: [-1, -1, -1, -1, -1, -1], k2i: 0, k2Last: -1e9, k2W: -1e9,
      press: [0, 0, 0, 0, 0, 0], popKind: '', popLane: 0, popAt: -1e9, comboStr: '', comboN: -1, crowdN: -1, lanes: lanesOf(st),
      attendance: GG.gig.expectCrowd(st, gig), pick: null, result: null };
    readPrefs();
    listen(true);
    ui.show('gig', {});
    setupStage();
    if (G.opts.studio) { startSession([G.opts.studio.songId]); if (auto()) nextSong(); else showBetween(null); return true; }   // v0.5 studio take
    var live = st.liveGig && st.liveGig.gig && st.liveGig.gig.venueId === gig.venueId ? st.liveGig : null;
    if (live) { startSession(null); if (G.ses.done) finishShow(); else { showBetween(null); if (auto()) G.autoT = setTimeout(nextSong, 30); } }
    else if (auto()) { startSession(GG.gig.defaultSetlist(st, gig)); nextSong(); }
    else { G.pick = GG.gig.defaultSetlist(st, gig); ui.show('gig-set', {}); }
    return true;
  };
  function readPrefs() {   // v0.6.1: read once per show / session (never in the frame loop)
    var pf = prefs(), off = GG.prefs ? GG.prefs.offsets(pf) : { audio: 0, visual: 0 };
    G.pf = pf; G.off = off; G.lefty = !!pf.lefty; G.cb = !!pf.colourblind; G.speed = pf.noteSpeed > 0 ? pf.noteSpeed : 1;
  }
  function startSession(ids) {
    readPrefs();
    G.ses = GG.gig.session(G.opts.studio ? G.opts.studio.state : S(), G.gig, ids, { difficulty: difficulty(), noFail: !!G.pf.noFail, autoKick: !!G.pf.autoKick });
    G.diff = G.ses.difficulty || difficulty();
    G.attendance = G.ses.attendance;
    if (G.dom) { G.dom.level.textContent = LEVEL_TEXT[G.ses.level]; G.dom.crowd.dataset.level = G.ses.level; G.dom.back.dataset.level = G.ses.level; }
    stageCall('setCrowdLevel', G.ses.crowd, true);
    loop();
  }
  function teardown() {
    if (!G) return;
    stopAudio();
    if (G.raf) cancelAnimationFrame(G.raf);
    clearTimeout(G.startTimer); clearTimeout(G.bannerT); clearTimeout(G.autoT);
    listen(false);
    G = null;
  }
  function stopAudio() {
    if (!G) return;
    clearTimeout(G.startTimer); G.startTimer = 0;
    var h = G.handle; G.handle = null;
    if (h && h.playing) h.stop();
    if (GG.audio && GG.audio.hitCancel) GG.audio.hitCancel();   // v0.7.2: auto notes / second kicks already scheduled ahead
    if (G.ctxPaused && G.actx) { G.ctxPaused = false; try { G.actx.resume(); } catch (e) { /* ignore */ } }
  }

  /* ---- Songs ------------------------------------------------------------------------------------------- */
  function nextSong() {
    if (!G) return;
    if (G.ses.done) { finishShow(); return; }
    hideBetween();
    G.chart = G.ses.startSong();
    if (auto()) { playAuto(); return; }
    beginCount();
  }
  function beginCount() {
    var p = performance.now(), ch = G.chart, lead = U.clamp(4 * ch.spb, 1.6, 2.6);
    resync(p, true);
    G.mode = 'count'; G.paused = false; G.restart = false; G.drawFrom = 0; G.countBeat = 99; G.popAt = -1e9;
    G.ap = 0; G.autoN = G.autoN || 0; G.autoAt = G.autoAt || [-1e9, -1e9, -1e9, -1e9, -1e9, -1e9];
    G.dq = []; G.dp = 0; G.k2Last = -1e9; G.k2W = -1e9; for (var q = 0; q < G.k2.length; q++) G.k2[q] = -1;   // v0.7.2 this chart's doubles
    for (var k = 0; k < ch.notes.length; k++) if (ch.notes[k].dbl) G.dq.push(k);
    G.zero = heardAt(p) + lead; G.t = -lead;
    var wait = G.zero - G.lat - LEAD_IN - heardAt(p);
    G.startTimer = setTimeout(startAudio, Math.max(0, wait * 1000));
    layout();
    loop();
  }
  function startAudio() {
    if (!G) return;
    G.startTimer = 0;
    var song = G.ses.song(), p = performance.now(), h = null;
    try { h = GG.audio && GG.audio.play ? GG.audio.play(song.pattern, { genre: S().genre, section: null, loop: false, backing: true, drums: false }) : null; }
    catch (e) { console.error('[gig] audio.play failed', e); }
    G.handle = h;
    if (!h) return;   // no Web Audio: the performance clock keeps time
    if (!G.actx) G.actx = audioCtx();
    if (G.actx && G.actx.state === 'running') { resync(p, true); G.zero = h.start; }
    else if (!G.actx) { G.offset = h.start - LEAD_IN - DEFAULT_LAT - p / 1000; G.zero = h.start; }   // no accessor: anchor on the handle
    else wake();   // a suspended/interrupted context: keep the count-in's performance-clock zero so notes still flow
  }
  function restartSong() {
    stopAudio();
    G.chart = G.ses.startSong(G.ses.index);
    beginCount();
  }
  function endSong() {
    stopAudio();
    var r = G.ses.endSong();
    G.mode = 'between';
    showBetween(r);
  }
  function playAuto() {
    stopAudio();
    var o = typeof ui.gigAutoplay === 'object' ? ui.gigAutoplay : AUTO_BOT, i = G.ses.index;
    G.ses.emit = false;
    var r = GG.gig.botPlay(G.ses, { accuracy: o.accuracy, jitterMs: o.jitterMs, one: true }, GG.RNG(GG.hashSeed(S().seed + '|autoplay|' + i)));
    G.ses.emit = true;
    stageCall('setCrowdLevel', G.ses.crowd);
    G.mode = 'between';
    showBetween(r);
    G.autoT = setTimeout(nextSong, 30);
  }
  function pause(interrupted) {
    if (!G || G.paused || (G.mode !== 'play' && G.mode !== 'count')) return;
    G.paused = true; G.pauseT = G.t;
    if (G.startTimer || G.mode === 'count' || interrupted || !G.actx || !G.handle || !G.handle.playing || G.actx.state !== 'running') {
      G.restart = true; stopAudio();
    } else {
      try { G.actx.suspend(); G.ctxPaused = true; } catch (e) { G.restart = true; stopAudio(); }
    }
    G.dom.pause.hidden = false;
    G.dom.pauseNote.textContent = G.restart ? 'The song starts over when you come back.' : 'The band is frozen mid-riff.';
  }
  function resume(restart) {
    if (!G || !G.paused) return;
    G.dom.pause.hidden = true;
    if (restart || G.restart) { G.paused = false; restartSong(); return; }
    G.ctxPaused = false;
    try { G.actx.resume(); } catch (e) { /* ignore */ }
    G.paused = false;
    resync(performance.now(), true);
  }

  /* ---- v0.6.2 two-thumb auto notes: the hits a third thumb would need play themselves on the audio clock ---- */
  // A healthy running clock schedules each one AUTO_AHEAD early at its exact context time (G.zero + t, same heard-clock
  // pairing as the backing band); a stalled/free-running clock plays it on the frame it comes due. Never judged.
  var AUTO_AHEAD = 0.15;
  function autoNotes(t, p) {
    var a = G.chart.auto, c = G.actx, sched = G.clockOk && G.handle && c && c.state === 'running';
    if (!a) return;
    while (G.ap < a.length && a[G.ap].t <= t + (sched ? G.lat + AUTO_AHEAD : 0)) {   // heard clock + output latency = context time
      var n = a[G.ap++];
      if (n.t < t - 0.08 || n.li >= G.lanes) continue;   // skipped past (a resync jump): stay quiet rather than flam
      if (GG.audio && GG.audio.hit) GG.audio.hit(n.lane, sched ? G.zero + n.t : undefined);
      G.autoN++; G.autoAt[n.li] = p + Math.max(0, n.t - t) * 1000;   // the ring shows when it's heard
    }
  }

  /* ---- v0.7.2 double kicks: one tap, two kicks ------------------------------------------------------------- */
  // Once a double's first kick is judged a hit (tap or Auto-kick; the session stamps hitT), its second kick plays
  // max(t2 - hitT, DBL_MIN) after the first kick is HEARD (k1, song clock: a tap stamps it; Auto-kick's hit sounds at its
  // frame + output latency). A tap is judged on the calibrated clock but sounds (offset + latency) later, so the pair keeps
  // its spacing on every headset: scheduled AUTO_AHEAD early at G.zero + time on a healthy clock, else on the frame it's due.
  // A second kick skipped past (a stalled frame / resync jump) is marked d2 = 2 so an echo tap may stand in for it.
  var DBL_MIN = 0.06, HIT_LEAD = 0.005, KICK = C.LANES.indexOf('kick');   // HIT_LEAD: GG.audio.hit plays 'now' at ctx now + 5 ms
  function doubleKicks(t, p) {
    var q = G.dq, n = G.chart.notes, c = G.actx, sched = G.clockOk && G.handle && c && c.state === 'running';
    var ahead = sched ? G.lat + AUTO_AHEAD : 0;
    while (G.dp < q.length && n[q[G.dp]].d2) G.dp++;
    for (var k = G.dp; k < q.length; k++) {
      var x = n[q[k]];
      if (x.t > t + 0.45) break;                        // nothing this late can have been judged yet
      if (x.d2 || x.j === 0) continue;                  // done, or still waiting for its tap
      if (x.j !== 1 && x.j !== 2) { x.d2 = 1; continue; }   // a missed double plays nothing extra
      var h1 = x.hitT != null ? x.hitT : x.t, k1 = x.k1 != null ? x.k1 : h1 + G.lat + HIT_LEAD;   // the first kick, heard
      var w = Math.max(k1 + Math.max(x.t2 - h1, DBL_MIN), G.k2W + DBL_MIN);   // the pair's spacing; never two at once (a stalled frame)
      if (w > t + ahead) continue;
      x.d2 = 1; G.k2W = w;
      if (w < t - 0.08 || KICK >= G.lanes) { x.d2 = 2; continue; }   // skipped past (a resync jump): stay quiet rather than flam
      if (GG.audio && GG.audio.hit) GG.audio.hit('kick', sched ? G.zero + w : undefined);
      G.dblN++;
      var at = p + Math.max(0, w - t) * 1000;           // when it's heard: the zone flash, a ring, the drummer's left foot
      G.k2[G.k2i] = at; G.k2i = (G.k2i + 1) % G.k2.length; G.autoAt[KICK] = at;
    }
    for (var i = 0; i < G.k2.length; i++) if (G.k2[i] > 0 && p >= G.k2[i]) { G.k2Last = G.k2[i]; G.k2[i] = -1; stageCall('kick2'); }
  }

  /* ---- The frame loop (no allocations in here) ------------------------------------------------------------ */
  function loop() { if (G && !G.raf) G.raf = requestAnimationFrame(frame); }
  function frame() {
    G.raf = 0;
    if (!G || !G.dom || !ui.isOpen('gig')) return;
    var p = performance.now();
    if (p - G.syncAt > 250) resync(p, false);
    var playing = G.mode === 'play' || G.mode === 'count';
    if (playing && !G.paused) {
      if (auto()) { playAuto(); return; }
      var t = songTime(p), ch = G.chart;
      G.t = t;
      if (G.mode === 'count') {
        var beat = Math.floor(t / ch.spb);
        if (beat !== G.countBeat && beat >= -4 && beat < 0) {
          G.countBeat = beat; G.dom.count.textContent = String(-beat); G.dom.count.className = 'gig-count show';
          if (GG.audio && GG.audio.hit) GG.audio.hit('hat');
        }
        if (t >= 0) { G.mode = 'play'; G.dom.count.className = 'gig-count'; }
      }
      if (t >= 0) { var to = G.ses.tick(t); if (to && to.autoHits && GG.audio && GG.audio.hit) GG.audio.hit('kick'); }   // v0.6.1 Auto-kick
      if (t >= -0.5) autoNotes(t, p);   // v0.6.2 two-thumb drops play themselves
      if (t >= -0.5 && G.dq.length) doubleKicks(t, p);   // v0.7.2 a double's second kick
      if (G.mode === 'play' && t >= ch.duration + 0.5) { endSong(); }
    }
    if (G && G.chart && G.x) draw((G.paused ? G.pauseT : G.t) + (G.off ? G.off.visual - G.off.audio : 0), p);   // v0.6.1 calibration
    if (G && G.ses) {
      var c = Math.round(G.ses.crowd);
      if (c !== G.crowdN) { G.crowdN = c; G.dom.meter.style.width = c + '%'; stageCall('setCrowdLevel', G.ses.crowd); }
    }
    if (G && playing) loop();
  }

  // iOS parks the AudioContext as 'suspended'/'interrupted'; a tap is a user gesture, so ask it to come back.
  function wake() { var c = G && (G.actx || (G.actx = audioCtx())); if (c && c.state !== 'running' && c.resume) { try { var pr = c.resume(); if (pr && pr.catch) pr.catch(function () {}); } catch (e) { /* ignore */ } } }
  // Listens on the whole document (capture) so a stray layer over the highway can't swallow taps: any press inside the
  // highway's rectangle during a song counts.
  function onDown(ev) {
    if (!G || !G.chart || G.paused || (G.mode !== 'play' && G.mode !== 'count')) return;
    var r = G.canvas && G.canvas.getBoundingClientRect();
    if (!r || ev.clientY < r.top || ev.clientY > r.bottom || ev.clientX < r.left || ev.clientX > r.right) return;
    if (ev.cancelable) ev.preventDefault();
    wake();
    var li = Math.floor((ev.clientX - r.left) / (r.width / G.lanes));
    tap(col(li < 0 ? 0 : li >= G.lanes ? G.lanes - 1 : li), ev.timeStamp);
  }
  function onKey(ev) {
    if (!G || ev.repeat || G.paused || (G.mode !== 'play' && G.mode !== 'count')) return;
    var li = KEYS[ev.key && ev.key.toLowerCase()];
    if (li == null || li >= G.lanes) return;
    ev.preventDefault();
    tap(col(li), ev.timeStamp);
  }
  function tap(li, stamp) {
    var now = performance.now();   // some browsers stamp events on another time base: trust it only if it's recent
    var at = heardAt(stamp > 0 && Math.abs(stamp - now) < 1000 ? stamp : now) - G.zero - (G.off ? G.off.audio : 0);   // v0.6.1: calibration
    var snd = GG.audio && GG.audio.hit, r;
    G.press[li] = performance.now();
    if (at < -0.4) { if (snd) GG.audio.hit(C.LANES[li]); stageCall('hit', C.LANES[li], 'good'); return; }   // noodling during the count-in
    r = G.lastTap = G.ses.judge(li, at);   // judged first (synchronous, well under a ms) so an echo can stay quiet
    if (r) r.at = at;
    if (r && r.echo && !(r.dbl && r.dbl.d2 === 2)) return;   // v0.7.2: an echo tap IS the double's (scheduled) 2nd kick: no flam
    if (snd) GG.audio.hit(C.LANES[li]);
    if (r && r.note && r.note.dbl) r.note.k1 = songTime(performance.now()) + G.lat + HIT_LEAD;   // when this kick is heard (song clock)
  }

  /* ---- Highway drawing ------------------------------------------------------------------------------------ */
  var W = 390, H = 280, DPR = 1, laneW = 97, hitY = 240, speed = 200;
  function onResize() { if (G && G.dom) { layout(); guard(); } }
  function layout() {
    var c = G.canvas; if (!c) return;
    var box = c.parentNode.getBoundingClientRect();
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(200, box.width); H = Math.max(160, box.height);
    c.width = Math.round(W * DPR); c.height = Math.round(H * DPR);
    G.rect = c.getBoundingClientRect();
    G.lanes = G.chart ? Math.max(G.chart.lanes || 4, 1) : lanesOf(S());
    LOOK = ((GG.gig.DIFFICULTIES[G.diff] || {}).look || 1.15) / (G.speed || 1);   // seconds of highway visible: Easy scrolls slower; v0.6.1 note speed
    laneW = W / G.lanes; hitY = H - ZONE / 2 - 8; speed = (hitY + 24) / LOOK;
    var gap = 1, last = [-9, -9, -9, -9, -9, -9], n = G.chart ? G.chart.notes : [];   // gems slim down for fast 16ths
    for (var k = 0; k < n.length; k++) { var d = n[k].t - last[n[k].li]; if (d > 0.001 && d < gap) gap = d; last[n[k].li] = n[k].t; }
    G.gemH = U.clamp(Math.round(speed * gap * 0.7), 8, 16);
    buildBg();
    G.fonts = { pop: '900 26px ' + FONT, combo: '900 22px ' + FONT, small: '800 10px ' + FONT, band: '800 11px ' + FONT, icon: '20px ' + FONT, dbl: '900 11px ' + FONT };
  }
  var FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
  function rr(x, px, py, w, h, r) {
    x.beginPath(); x.moveTo(px + r, py); x.arcTo(px + w, py, px + w, py + h, r); x.arcTo(px + w, py + h, px, py + h, r);
    x.arcTo(px, py + h, px, py, r); x.arcTo(px, py, px + w, py, r); x.closePath();
  }
  function buildBg() {
    var b = G.bg || (G.bg = document.createElement('canvas')), x;
    b.width = G.canvas.width; b.height = G.canvas.height;
    x = b.getContext('2d'); x.setTransform(DPR, 0, 0, DPR, 0, 0);
    var g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#05070d'); g.addColorStop(0.35, '#0c1120'); g.addColorStop(1, '#121a2c');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (var l = 0; l < G.lanes; l++) {
      var lx = col(l) * laneW, lc = laneColor(l);
      x.globalAlpha = l % 2 ? 0.05 : 0.025; x.fillStyle = '#ffffff'; x.fillRect(lx, 0, laneW, H);
      x.globalAlpha = 0.18; x.fillStyle = lc; x.fillRect(lx + laneW / 2 - 1, 0, 2, hitY);
      x.globalAlpha = 1; x.fillStyle = 'rgba(255,255,255,.08)'; if (lx) x.fillRect(lx, 0, 1, H);
      rr(x, lx + 5, H - ZONE - 4, laneW - 10, ZONE - 2, 12);
      x.fillStyle = '#0a0e18'; x.fill(); x.lineWidth = 2; x.strokeStyle = lc; x.globalAlpha = 0.85; x.stroke(); x.globalAlpha = 1;
      var L = ui.LANES && ui.LANES[C.LANES[l]];
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = '20px ' + FONT; x.fillText(L ? L.icon : '•', lx + laneW / 2, H - ZONE / 2 - 12);
      x.font = '800 10px ' + FONT; x.fillStyle = lc; x.fillText((L ? L.name : C.LANES[l]).toUpperCase(), lx + laneW / 2, H - 18);
    }
    x.fillStyle = 'rgba(255,255,255,.55)'; x.fillRect(0, hitY - 1, W, 2);
    var fade = x.createLinearGradient(0, 0, 0, 46); fade.addColorStop(0, 'rgba(5,7,13,1)'); fade.addColorStop(1, 'rgba(5,7,13,0)');
    G.fade = fade;
  }
  function yOf(nt, t) { return hitY - (nt - t) * speed; }
  function draw(t, p) {
    var x = G.x, ch = G.chart, n = ch.notes, k, l, a, y;
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.drawImage(G.bg, 0, 0);
    x.setTransform(DPR, 0, 0, DPR, 0, 0);
    for (l = 0; l < G.lanes; l++) {   // tap flashes (v0.7.2: the kick zone flashes again when a double's second kick lands)
      a = 1 - (p - G.press[l]) / 140;
      if (l === KICK) a = Math.max(a, 1 - (p - G.k2Last) / 140);
      if (a > 0) { x.globalAlpha = a * 0.45; x.fillStyle = laneColor(l); rr(x, col(l) * laneW + 5, H - ZONE - 4, laneW - 10, ZONE - 2, 12); x.fill(); }
    }
    x.globalAlpha = 1;
    var spb = ch.spb, b0 = Math.max(0, Math.ceil((t - 0.3) / spb)), b1 = Math.floor((t + LOOK) / spb);
    for (var b = b0; b <= b1; b++) {   // beat + bar lines
      y = yOf(b * spb, t); if (y > hitY) continue;
      x.fillStyle = b % 4 === 0 ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.07)'; x.fillRect(0, y, W, b % 4 === 0 ? 2 : 1);
    }
    for (k = 0; k < ch.fills.length; k++) band(x, ch.fills[k], t, 'rgba(185,140,255,.13)', '#c9a4ff', 'FREESTYLE · GO WILD');
    for (k = 0; k < ch.solos.length; k++) band(x, ch.solos[k], t, 'rgba(87,199,122,.07)', '#6fe39a', 'SOLO · KEEP IT SIMPLE');
    while (G.drawFrom < n.length && n[G.drawFrom].t < t - 0.4) G.drawFrom++;
    var gw = Math.min(laneW - 16, 70), gh = G.gemH, gr = gh / 2 - 1, au = ch.auto || [];
    x.lineWidth = 2; x.setLineDash(G.dash);   // v0.6.2 auto notes: dashed ghosts ("the band's got this one")
    for (k = Math.max(0, (G.ap || 0) - 8); k < au.length; k++) {
      var an = au[k]; if (an.t > t + LOOK + 0.05) break;
      if (an.li >= G.lanes || an.t < t - 0.25) continue;
      x.globalAlpha = an.t < t ? 0.45 * (1 - (t - an.t) / 0.25) : 0.45; x.strokeStyle = laneColor(an.li);
      rr(x, col(an.li) * laneW + (laneW - gw) / 2 + 4, yOf(an.t, t) - gh / 2 + 3, gw - 8, gh - 6, gr - 3); x.stroke();
    }
    x.setLineDash(G.noDash); x.globalAlpha = 1;
    for (k = G.drawFrom; k < n.length; k++) {
      var nt = n[k], past = t - nt.t;
      if (nt.t > t + LOOK + 0.05) break;
      if (nt.j === 1 || nt.j === 2 || nt.li >= G.lanes) continue;
      a = nt.j !== 0 && past > 0 ? 1 - past / 0.35 : 1;   // missed / passed notes fade out below the line
      if (a <= 0) continue;
      y = yOf(nt.t, t);
      var gx = col(nt.li) * laneW + (laneW - gw) / 2;
      if (nt.j === 3) { x.globalAlpha = 0.5 * a; x.fillStyle = '#4a5063'; }
      else if (nt.free) { x.globalAlpha = 0.3 * a; x.fillStyle = laneColor(nt.li); }
      else { x.globalAlpha = 1; x.fillStyle = laneColor(nt.li); }
      var dy = 0;
      if (nt.dbl) {   // v0.7.2 double kick: a second pill stacked behind (the second kick) + a ×2 badge
        dy = Math.round(gh * 0.6) + 3; var ga = x.globalAlpha;
        x.globalAlpha = ga * 0.6; rr(x, gx + 4, y - gh / 2 - dy, gw - 8, gh, gr); x.fill(); x.globalAlpha = ga;
        x.lineWidth = 2; x.strokeStyle = '#0a0e18'; rr(x, gx, y - gh / 2, gw, gh, gr); x.stroke();
      }
      rr(x, gx, y - gh / 2, gw, gh, gr); x.fill();
      if (nt.j === 0 && !nt.free) { x.fillStyle = 'rgba(255,255,255,.55)'; x.fillRect(gx + 7, y - gh / 2 + 3, gw - 14, 2); }
      if (nt.extra) { x.globalAlpha = 1; x.lineWidth = 2; x.strokeStyle = '#ffffff'; x.stroke(); }
      if (dy && nt.j === 0) {
        var bx = gx + gw - 12, by = y - gh / 2 - dy / 2;
        x.globalAlpha = 1; rr(x, bx - 12, by - 8, 24, 16, 8); x.fillStyle = '#0a0e18'; x.fill(); x.lineWidth = 2; x.strokeStyle = laneColor(nt.li); x.stroke();
        x.fillStyle = '#ffffff'; x.font = G.fonts.dbl; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('×2', bx, by + 1);
      }
    }
    x.globalAlpha = 1;
    for (l = 0; l < G.lanes; l++) {   // v0.6.2 auto-note ticks: a small ring, no judgement pop
      a = G.autoAt ? 1 - (p - G.autoAt[l]) / 180 : 0;
      if (a > 0 && a <= 1) { x.globalAlpha = a * 0.6; x.strokeStyle = laneColor(l); x.lineWidth = 2; x.beginPath(); x.arc(col(l) * laneW + laneW / 2, hitY, 10 + (1 - a) * 10, 0, 6.2832); x.stroke(); }
    }
    for (l = 0; l < G.lanes; l++) {   // hit bursts
      a = 1 - (p - G.burst[l]) / 220;
      if (a > 0) {
        x.globalAlpha = a; x.strokeStyle = laneColor(l); x.lineWidth = 3;
        x.beginPath(); x.arc(col(l) * laneW + laneW / 2, hitY, 14 + (1 - a) * 26, 0, 6.2832); x.stroke();
      }
    }
    x.globalAlpha = 1; x.fillStyle = G.fade; x.fillRect(0, 0, W, 46);
    a = 1 - (p - G.popAt) / 520;   // judgement pop
    if (a > 0 && POP_TEXT[G.popKind]) {
      x.globalAlpha = a < 0.6 ? a / 0.6 : 1; x.fillStyle = POP_COLOR[G.popKind]; x.font = G.fonts.pop;
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(POP_TEXT[G.popKind], U.clamp(col(G.popLane) * laneW + laneW / 2, 70, W - 70), hitY - 58 - (1 - a) * 14);
    }
    x.globalAlpha = 1;
    var combo = G.ses.combo;
    if (combo !== G.comboN) { G.comboN = combo; G.comboStr = combo >= 5 ? '×' + combo : ''; }
    if (G.comboStr) {
      x.textAlign = 'left'; x.textBaseline = 'top'; x.fillStyle = '#ffffff'; x.font = G.fonts.combo; x.fillText(G.comboStr, 10, 10);
      x.font = G.fonts.small; x.fillStyle = 'rgba(255,255,255,.6)'; x.fillText('COMBO', 12, 36);
    }
    x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(0, 0, W, 3);   // song progress
    x.fillStyle = '#ffb347'; x.fillRect(0, 0, W * U.clamp(t / ch.duration, 0, 1), 3);
  }
  function band(x, f, t, bg, fg, label) {
    var y0 = yOf(f.t1, t), y1 = yOf(f.t0, t);
    if (y1 < 0 || y0 > hitY) return;
    var top = Math.max(0, y0), bot = Math.min(hitY, y1);
    x.fillStyle = bg; x.fillRect(0, top, W, bot - top);
    x.fillStyle = fg; x.font = G.fonts.band; x.textAlign = 'center'; x.textBaseline = 'top';
    x.fillText(label, W / 2, Math.max(6, Math.min(y0 + 6, hitY - 20)));
  }

  /* ---- Between songs ------------------------------------------------------------------------------------ */
  function banterLine() {
    var st = S(), act = st.members.filter(function (m) { return m.status === 'active'; });
    var m = act.length ? act[Math.floor(ui.rng.next() * act.length)] : null;
    var pool = m && BANTER[m.id] && ui.rng.next() < 0.75 ? BANTER[m.id] : BANTER.any;
    return { who: m ? m.id : null, text: fill(ui.pick(pool)) };
  }
  function showBetween(r) {
    var d = G.dom, n = G.ses.setlist.length, i = G.ses.index;   // i = songs played so far
    G.mode = 'between';
    ui.clear(d.mid);
    var b = banterLine(), next = G.ses.song(), studio = G.opts.studio, pr = G.opts.practice;   // v0.6.1: practice runs in studio mode
    d.mid.appendChild(el('div.gig-mid-card', { testid: 'gig-between' }, [
      el('div.caps', pr ? (r ? 'Practice run done' : (studio.label || 'Practice')) : studio ? (r ? 'Take in the can' : (studio.label || 'Studio take') + ' · red light is on')
        : r ? 'Song ' + i + ' of ' + n + ' · saved' : 'Welcome back · ' + i + ' of ' + n + ' played'),
      r ? el('div.gig-song-res', [
        el('b', '“' + r.title + '”'),
        el('div.small', Math.round(r.accuracy * 100) + '% hit · best combo ' + r.maxCombo + ' · ' + r.perfect + ' perfect / ' + r.good + ' good / ' + r.miss + ' missed'),
        r.moments.length ? el('div.small.amber', r.moments.map(function (k) { return MOMENT_TEXT[k] || k; }).join(' · ')) : null
      ]) : null,
      b.who ? el('div.react', [ui.avatar(b.who, 'sm'), el('div.t', [el('b', ui.who(b.who).short + ': '), b.text])]) : el('p.small', b.text),
      next ? el('div.small.dim', 'Up next: “' + next.title + '”' + (next.classic ? ' (a classic)' : '')) : null,
      ui.btn('.btn.primary.block', { testid: 'btn-gig-next', onclick: function () { if (G && G.mode === 'between') nextSong(); } },
        pr ? (next ? 'Count me in' : 'Done practising') : studio ? (next ? 'Roll tape' : 'Keep this take') : next ? (i ? 'Next song' : 'Start the show') : 'See how it went')
    ]));
    d.mid.hidden = false;
    if (r) sfx(r.score >= 65 ? 'cheer' : r.score < 35 ? 'boo' : 'tap');
  }
  function hideBetween() { if (G.dom) { G.dom.mid.hidden = true; ui.clear(G.dom.mid); } }

  /* ---- Results ------------------------------------------------------------------------------------------ */
  function defaultApply(st, r) {
    if (GG.career.finishGig && st.phase === 'gig') GG.career.finishGig(st, r);
    else GG.gig.applyResult(st, r);
  }
  function finishShow() {
    if (G.opts.studio) {   // v0.5 studio take: hand the song result back, no gig result, no results screen
      var take = G.ses.live.songs[0] || null, cb = G.done;
      stopAudio(); G.mode = 'results';
      ui.close('gig');
      if (cb) setTimeout(function () { cb(take); }, 0);
      return;
    }
    var st = S(), r = G.ses.finish(), before = st.venueRep ? st.venueRep[r.venueId] : undefined;
    stopAudio();
    G.mode = 'results';
    try { (G.opts.apply || defaultApply)(st, r); } catch (e) { console.error('[gig] applying the result failed', e); }
    if (r.rep == null && st.venueRep && st.venueRep[r.venueId] != null) { r.repNow = st.venueRep[r.venueId]; r.repBefore = before; }
    G.result = r;
    if (GG.main && GG.main.sync) GG.main.sync();
    sfx(/[SAB]/.test(r.grade) ? 'cheer' : r.grade === 'D' ? 'boo' : 'tap');
    ui.show('gig-results', { result: r });
  }
  var HEADLINE = { S: 'Legendary.', A: 'Crushed it.', B: 'Solid set.', C: 'You survived.', D: 'Rough night.' };
  function repText(r) {
    var d = r.rep != null ? r.rep : r.repNow != null && r.repBefore != null ? r.repNow - r.repBefore : null;
    if (r.banned) return 'Banned. Your photo is going on the wall.';
    if (d == null) return r.repNow != null ? 'Venue rep: ' + U.signed(r.repNow) : null;
    return d > 0 ? 'Venue rep ▲ ' + d + ': they want you back.' : d < 0 ? 'Venue rep ▼ ' + (-d) + ': the owner is not returning calls.' : 'Venue rep unchanged.';
  }
  ui.define('gig-results', {
    kind: 'full', cls: 'gigres', sticky: true,
    build: function (s, d) {
      var r = d.result, pay = r.deal === 'exposure' && !r.pay ? 'Exposure' : U.fmtMoney(r.pay || 0), rep = repText(r);
      s.body.appendChild(el('div.gigres-head', [
        el('div.grade.big.' + r.grade, { testid: 'gig-grade' }, r.grade),
        el('div.grow', [el('div.caps', r.name + ' · ' + r.city), el('h1.display', HEADLINE[r.grade] || ''),
          el('div.small.dim', 'Score ' + r.score + ' · ' + Math.round((r.accuracy || 0) * 100) + '% of notes hit · best combo ' + (r.maxCombo || 0))])
      ]));
      s.body.appendChild(el('div.stat-grid', [
        el('div', [el('span.caps', 'Crowd'), el('b', r.crowd + '/' + r.capacity)]),
        el('div', [el('span.caps', 'Pay'), el('b', pay)]),
        el('div', [el('span.caps', 'Gas'), el('b', r.gas ? '−' + U.fmtMoney(r.gas).replace('−', '') : '$0')]),
        el('div', [el('span.caps', 'Fans'), el('b.good', U.signed(r.fans || 0))]),
        el('div', [el('span.caps', 'Buzz'), el('b', U.signed(r.buzz || 0))]),
        el('div', [el('span.caps', 'Moments'), el('b', String((r.moments || []).filter(function (k) { return k !== 'solo'; }).length))])
      ]));
      if (rep) s.body.appendChild(el('p.small.amber', { testid: 'gig-rep' }, rep));
      s.body.appendChild(el('div.gigres-songs', (r.songResults || []).map(function (x, i) {
        return el('div.gigres-song', [el('span.n', String(i + 1)), el('div.grow', [el('b', x.title),
          el('div.tiny.dim', x.perfect + ' perfect · ' + x.good + ' good · ' + x.miss + ' missed · combo ' + x.maxCombo
            + (x.fills ? ' · ' + x.fills + ' fill taps' : ''))]),
          el('div.acc', Math.round(x.accuracy * 100) + '%')]);
      })));
      (r.lines || []).forEach(function (t) { if (!(r.merch && ui.isMerchLine && ui.isMerchLine(t))) s.body.appendChild(el('p.small', { style: 'margin:6px 0' }, fill(t))); });
      if (r.merch && ui.merchResult) s.body.appendChild(ui.merchResult(r.merch));   // v0.8: the merch table
      (r.classics || []).forEach(function (id) {
        var song = GG.songs.byId(S(), id);
        if (song) s.body.appendChild(el('p.small.amber', '🏆 “' + song.title + '” is a classic now. The crowd will want it every night.'));
      });
      (r.reactions || []).forEach(function (x) {
        var who = ui.who(x.who);
        s.body.appendChild(el('div.react', [ui.avatar(who, 'sm'), el('div.t', [el('b', who.short + ': '), fill(x.text)])]));
      });
      s.foot.appendChild(ui.btn('.btn.primary.big.block', { testid: 'btn-gig-done', onclick: function () {
        var g = G, res = r;
        restoreScene();
        teardown();
        ui.close('gig');
        if (ui.isOpen('gig-results')) ui.close('gig-results');
        if (g && typeof g.done === 'function') g.done(res);
      } }, 'Wrap up the week'));
    }
  });

  /* ---- The show screen ------------------------------------------------------------------------------------ */
  ui.define('gig', {
    kind: 'full', cls: 'gig', sticky: true, live3d: true,
    build: function (s) {
      if (!G) return;
      var g = G.gig, d = G.dom = {};
      s.root.classList.toggle('studio', !!G.opts.studio);   // v0.5: studio take (no crowd)
      d.back = el('div.gig-back', { data: { level: 'warm' } }, [el('div.lights'), el('div.band', [el('i'), el('i'), el('i'), el('i')]),
        el('div.floor'), el('div.crowd')]);
      d.back.hidden = !!G.stageOn;
      d.title = el('b', g.name);
      d.pauseBtn = ui.btn('.icon-btn', { testid: 'btn-gig-pause', 'aria-label': 'Pause', onclick: function () { pause(false); } }, '⏸');
      d.bar = el('div.gig-bar', [el('div.grow', [el('div.caps', [g.city, g.kind].filter(Boolean).join(' · ')), d.title]),
        !G.opts.studio && ui.gigTarget ? ui.gigTarget(g) : null, d.pauseBtn]);   // v0.6: the rival's score to beat
      d.level = el('span.lv', 'Warm'); d.meter = el('i', { style: { width: '40%' } });
      d.crowd = el('div.gig-crowd', { testid: 'gig-crowd', data: { level: 'warm' } }, [el('div.mh', [el('span.caps', 'Crowd'), d.level]), el('div.bar', d.meter)]);
      d.banner = el('div.gig-banner'); d.count = el('div.gig-count');
      d.mid = el('div.gig-mid'); d.mid.hidden = true;
      d.pauseNote = el('p.small.dim');
      d.pause = el('div.gig-pause', { testid: 'gig-paused' }, el('div.gig-mid-card', [el('h2.display', 'Paused'), d.pauseNote,
        ui.btn('.btn.primary.block', { testid: 'btn-gig-resume', onclick: function () { resume(false); } }, 'Resume'),
        ui.btn('.btn.block', { testid: 'btn-gig-restart', onclick: function () { resume(true); } }, 'Restart this song')]));
      d.pause.hidden = true;
      G.canvas = el('canvas', { testid: 'gig-highway' });
      G.canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      G.x = G.canvas.getContext('2d');
      d.hw = el('div.gig-hw', [G.canvas, d.count]);
      d.top = el('div.gig-top', [d.back, d.bar, d.crowd, d.banner, d.mid]);
      s.body.appendChild(d.top); s.body.appendChild(d.hw); s.body.appendChild(d.pause);
      requestAnimationFrame(function () { if (G && G.dom === d) { layout(); if (!G.chart) drawIdle(); guard(); } });
    },
    onClose: function () { if (G) { restoreScene(); teardown(); } }
  });
  function drawIdle() {
    var x = G.x; x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(G.bg, 0, 0);
  }

  /* ---- Setlist picker ------------------------------------------------------------------------------------- */
  ui.define('gig-set', {
    kind: 'sheet', tall: true, sticky: true, cls: 'gigset',
    title: function () { return 'Tonight’s set'; },
    build: function (s) {
      if (!G) return;
      var st = S(), g = G.gig, size = GG.gig.setSize(st, g), ids = G.pick;
      var v = GG.gig.venue(g.venueId) || {}, deal = g.deal === 'exposure' ? 'Exposure' : g.deal === 'door' ? 'Door $' + g.pay + '/head' : U.fmtMoney(g.pay) + ' flat';
      s.setTitle('Tonight’s set', g.name + ' · ' + g.city);
      s.body.appendChild(el('div.panel.warm.small', [el('div', [el('b', (G.attendance || '?') + ' expected'), ' · holds ' + g.capacity + ' · ' + deal]),
        g.quirk || v.quirk ? el('div.dim', fill(g.quirk || v.quirk)) : null]));
      var cur = difficulty(), pf = prefs();
      s.body.appendChild(el('div.caps', { style: 'margin-top:10px' }, 'Difficulty'));
      s.body.appendChild(el('div.row.gig-diff', { style: 'margin-top:4px' }, ['easy', 'normal', 'hard', 'expert'].map(function (d) {
        return ui.btn('.btn.small.grow' + (d === cur ? '.primary' : ''), { testid: 'gig-diff-' + d, style: 'padding:0 6px', onclick: function () {
          GG.save.saveSettings({ gigDifficulty: d }); s.rerender(); } }, d.charAt(0).toUpperCase() + d.slice(1));
      })));
      s.body.appendChild(el('div.tiny.dim', { style: 'margin-top:4px' }, cur === 'easy'
        ? 'Easy: the main hits only, a big timing window, slower scroll.' : cur === 'normal'
        ? 'Normal: most of what you wrote, no impossible bursts.' : cur === 'hard' ? 'Hard: every hit exactly as written, tight timing.'
        : 'Expert: every hit as written, a razor-thin window, and misses sting. Kenji nods, once.'));
      if (GG.prefs) {   // v0.6.1: the calibration profile quick switch + what's on
        s.body.appendChild(el('div.row.gig-prof', { style: 'margin-top:8px' }, [['speaker', '🔊 Phone speaker'], ['headphones', '🎧 Headphones']].map(function (x) {
          return ui.btn('.btn.small.grow' + (pf.audioProfile === x[0] ? '.primary' : ''), { testid: 'gig-profile-' + x[0], 'aria-pressed': pf.audioProfile === x[0] ? 'true' : 'false',
            onclick: function () { GG.prefs.setProfile(x[0]); s.rerender(); } }, x[1]);
        })));
        var on = [pf.noFail ? 'No-fail' : null, pf.autoKick ? 'Auto-kick' : null, pf.noteSpeed !== 1 ? 'Note speed ×' + pf.noteSpeed : null, pf.lefty ? 'Lefty' : null].filter(Boolean);
        s.body.appendChild(ui.btn('.btn.ghost.small.block', { testid: 'btn-gig-settings', style: 'margin-top:6px', onclick: function () { ui.show('settings', { tab: 'play' }); } },
          '⚙ ' + (on.length ? on.join(' · ') : 'Assists, note speed, calibration')));
      }
      var bo = GG.gig.setlistBonuses(st, ids);
      s.body.appendChild(el('div.caps', { style: 'margin:12px 0 6px' }, 'Setlist · ' + ids.length + ' of ' + size + ' songs'));
      var slots = el('div.set-slots', { testid: 'set-slots' });
      for (var k = 0; k < size; k++) slots.appendChild(slotRow(s, k, size, ids, bo));
      s.body.appendChild(slots);
      s.body.appendChild(el('div.caps', { style: 'margin:14px 0 4px' }, 'Your songs · tap to add or drop'));
      var list = el('div.panel', { style: 'padding:0 12px' });
      GG.songs.best(st).forEach(function (song) {
        var at = ids.indexOf(song.id), r = song.rating || {};
        list.appendChild(ui.btn('.song.set-song' + (at >= 0 ? '.on' : ''), { testid: 'set-song-' + song.id, onclick: function () {
          var i = G.pick.indexOf(song.id);
          if (i >= 0) G.pick.splice(i, 1);
          else if (G.pick.length < size) G.pick.push(song.id);
          else { ui.toast('The set is full. Tap a song in it to drop one.'); return; }
          s.rerender();
        } }, el('div.row', [el('span.num', at >= 0 ? String(at + 1) : '+'), el('div.grow', [el('b', song.title),
          el('div.tiny.dim', 'Q ' + song.quality + ' · Groove ' + (r.groove || '?') + ' · Hook ' + (r.hook || '?') + ' · Diff ' + (r.difficulty || '?'))]), tags(song)])));
      });
      s.body.appendChild(list);
      s.foot.appendChild(el('div.row', [
        ui.btn('.btn', { testid: 'btn-gig-auto', onclick: function () { G.pick = GG.gig.defaultSetlist(st, g); s.rerender(); } }, 'Auto-pick'),
        ui.btn('.btn.primary.grow', { testid: 'btn-gig-start', disabled: !ids.length, onclick: function () {
          if (!G || !G.pick.length || G.ses) return;
          ui.close('gig-set');
          for (var k = 0; k < 8 && ui.top() && ui.top() !== 'gig'; k++) ui.close(ui.top());   // nothing may sit over the show
          startSession(G.pick.slice());
          nextSong();
        } }, 'Start the show')]));
    }
  });
  function tags(song) {
    return el('div.chips', [song.classic ? el('span.tag.gold', 'Classic') : null, (song.stale || 0) >= 30 ? el('span.tag', 'Stale') : null,
      song.hits ? el('span.tag.mine', song.hits + ' great') : null]);
  }
  function slotRow(s, k, size, ids, bo) {
    var id = ids[k], song = id ? GG.songs.byId(S(), id) : null, last = k === size - 1 && size > 1;
    function move(dir) { var j = k + dir, p = G.pick; if (j < 0 || j >= p.length) return; var t = p[k]; p[k] = p[j]; p[j] = t; s.rerender(); }
    var hint = k === 0 ? (bo.opener ? '✓ Strong opener' : 'Opener: start with one of your strongest')
      : last ? (bo.closer && ids.length === size ? '✓ Big closer' : 'Closer: end on your biggest hit') : null;
    return el('div.set-slot' + (song ? '' : '.empty'), { testid: 'set-slot-' + k }, [
      el('span.num', String(k + 1)),
      el('div.grow', [el('b', song ? song.title : 'Empty slot'), hint ? el('div.tiny' + ((k === 0 ? bo.opener : bo.closer && ids.length === size) ? '.good' : '.dim'), hint) : null]),
      song ? ui.btn('.icon-btn.sm', { 'aria-label': 'Earlier', disabled: k === 0, onclick: function () { move(-1); } }, '▲') : null,
      song ? ui.btn('.icon-btn.sm', { 'aria-label': 'Later', disabled: k >= ids.length - 1, onclick: function () { move(1); } }, '▼') : null,
      song ? ui.btn('.icon-btn.sm', { 'aria-label': 'Drop', testid: 'set-drop-' + k, onclick: function () { G.pick.splice(k, 1); s.rerender(); } }, '✕') : null
    ]);
  }

  GG.registerDebug('gigui', function () {
    if (!G) return { open: false };
    var ses = G.ses, p = performance.now(), next = null, ch = G.chart, soon = [];
    if (ch && ses && G.synced) {
      var t = songTime(p);
      for (var i = 0; i < ch.notes.length && soon.length < 12; i++) {
        var n = ch.notes[i]; if (n.j !== 0 || n.free || n.li >= G.lanes) continue;
        if (n.t > t + 0.03) soon.push(n.dbl ? { li: n.li, t: n.t, t2: n.t2 } : { li: n.li, t: n.t });
        if (!next && n.t > t + 0.35) next = n.dbl ? { lane: n.lane, li: n.li, t: n.t, t2: n.t2 } : { lane: n.lane, li: n.li, t: n.t };
      }
    }
    return { open: true, mode: G.mode, paused: G.paused, diff: G.diff, clockOk: G.clockOk, index: ses ? ses.index : null, songs: ses ? ses.setlist.length : null,
      songT: ch ? (G.paused ? G.pauseT : songTime(p)) : null, auto: ch && ch.auto ? ch.auto.length : 0, autoPlayed: G.autoN || 0, doubles: ch ? ch.doubles || 0 : 0, doublesPlayed: G.dblN || 0, next: next, soon: soon, lanes: G.lanes, stage: !!G.stageOn, audio: !!G.handle,
      ctx: !!G.actx, lat: G.lat, combo: ses ? ses.combo : 0, crowd: ses ? Math.round(ses.crowd) : null, level: ses ? ses.level : null,
      stats: ses && ses.stats ? ses.stats() : null, last: G.lastTap ? { judgement: G.lastTap.judgement, at: G.lastTap.at, echo: !!G.lastTap.echo,
        offset: G.lastTap.offset } : null, result: G.result ? { grade: G.result.grade, score: G.result.score } : null };
  });
})(window.GG);
