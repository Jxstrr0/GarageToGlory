// 55_ui_gig.js: the live gig (v0.3). GG.ui.playGig(gig, done, opts):
//   setlist sheet ('gig-set') -> the show ('gig', full): top 2/3 = the 3D stage (GG.render.stage; a 2D backdrop when it's
//   missing), bottom 1/3 = a 2D-canvas note highway (lanes in the sequencer colours, notes fall to tap zones; multitouch
//   pointer events; v1.5: rebindable gig keys, see "v1.5 Desktop" below). Between songs: "Song 2 of 3 - saved" + banter (the session keeps
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
// v0.8.3 drum sync (default; settings.drumSync): the band keeps its grid (zeroBand = the handle's start); the highway and
//   the judgement run D = output latency + K earlier (G.zero = zeroBand - D), and every drum sound is BOOKED on the band's
//   clock: a tap judged J sounds at zeroBand + J (a hit within [-15, +15] ms snaps to its note), and the count-in hats,
//   Auto-kick, auto notes and second kicks go out on the band grid from the pump. The calibration's audio offset is not
//   used (the highway draws + the visual offset only). Off = classic timing (0.8.2: judged minus the audio offset, taps
//   sound 'now'; the count-in / Auto-kick / auto notes stay on the band grid). See the "drum sync" block below.
// v1.0.1 smart bridge: one touch on the seam between two lanes hits both only when both have a note due (see onDown).
// GG.ui.gigAutoplay = true | { accuracy, jitterMs }: a bot plays each song instantly (tests, flows).
// v1.5 "Desktop" (plan_contract_1.5 §4.3, Lane I; owner K2 / K4 / Q1 / Q2): gig keys are physical (KeyboardEvent.code) and
//   rebindable (Settings > Keys; GG.prefs.keyLane: the kit by drum role, one map for bass / rhythm / lead by pitch slot; the
//   v1.4 table D F J K S L G H stays for code-less events, J K L G H as hidden extras while unbound). Frozen at count-in:
//   G.kind, G.keymap, G.input (GG.input.mode()), G.offT / G.offK (GG.prefs.offsets touch / keys), G.off (the song's input),
//   G.visM, G.caps (keycaps on the highway). Window capture keydown / keyup: press = a tap (same windows, chord rule, booking;
//   Classic subtracts the tap source's audio offset; key taps feed the dispatch estimate), a string hold lasts until that key
//   id comes up; repeats are ignored; a second keydown of an id that is still down = a lost keyup (lifted first). Esc pauses
//   (the pause card: Esc / Enter resume), Tab and Ctrl/Cmd+S/D/F/P are blocked mid-song, Meta / blur / pause / song end /
//   teardown release every key-held lane (releaseAll), a window blur on keys pauses frozen mid-riff (pause(false)); only a
//   hidden page restarts the song. The between card / results take Enter / Space only from a fresh press 600 ms after they
//   show (focused then when playing on keys or in gg-kbnav). Keycaps in the zones (G.caps), legends gig-keys (setlist),
//   gig-pause-keys (pause card) when GG.input.showKeyUI(), gig-hint ("Esc pause") in the PC layout. PC layout (package B):
//   data-lanes on .gig-hw, wider gems, a translucent highway, the stage frame down to 0.1 of the highway, w2 columns in the
//   setlist + results; 'ui:wide' re-lays the highway out in every mode. GG.input.gigLive(true) at count-in / resume.
// v1.3.1 Simulate (plan_1.3.1 §1.1): the setlist sheet's foot = [Auto-pick] [⏩ Simulate this gig] (btn-gig-sim; a story show
//   or the lesson's first gig: a dim note gig-sim-no) + what it plays at (gig-sim-why), then the big "Start the show". A tap
//   plays the real session headlessly at your recent average (GG.gig.simSong per song, ui.gigSimMs apart, card
//   gig-sim-progress), then the normal results (+ gig-simulated) and the normal apply. live.sim resumes it after a reload.
// v0.8 (SHOPUI): up to 6 lanes (toms, ride) fit a 390px phone (65px lanes; keys G / H for lanes 5 / 6, v1.5: hidden extras);
//   the results show r.merch.
// v0.6.1 (Addendum C4, SETTINGS): Expert; note speed (settings.noteSpeed scales the scroll); assists No-fail + Auto-kick
//   (session opts; auto kicks play the kick voice); the active calibration profile's audio offset is subtracted from every
//   tap before judgement and the highway draws (visual - audio) ahead; lefty mirrors lanes (drawing, touch, the v1.4 keys;
//   v1.5: a bound key stays with its lane);
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
// v1.1 "Seats" (plan_contract_1.1 §4.5): a string seat (bass / rhythm / lead) plays its own chart (GG.gig.chart with the seat:
//   lanes 'str0'..'str5', low -> high, sized by GG.career.seatLanes) in its own colours; a tap plays your instrument
//   (GG.audio.pluck / strum / lead, booked on the band clock exactly like a drum hit: syncSnap, never before the lane's last
//   booking); a hold sounds until you lift (pointerup / keyup of that key id -> ses.release + GG.audio.release); a run (the run gear) plays
//   its notes on the band grid while you hold it; a 2-lane chord draws as two gems on a bar (tap both); auto notes play
//   through your voice. The band plays the drums from the song (GG.audio.play { drums: true, seat, part, mute: your kinds }).
//   The drum seat's path is unchanged.
// v0.7.2 fix (booking pump): auto notes and second kicks are booked from a 25 ms timer as well as the frame loop. A GPU-bound
//   phone (the 3D stage, a hitch) can go 150+ ms between frames while the main thread is free; booking only on frames
//   meant a late frame booked them in the past (GG.audio.hit plays a past time now = a late drum). Same pattern as the
//   backing band's own look-ahead scheduler (30_audio: setInterval, not rAF), so the drums are as steady as the band.
(function (GG) {
  var ui = GG.ui, C = GG.contracts, U = GG.util, el = ui.el;
  var LOOK = 1.15, ZONE = 66, DEFAULT_LAT = 0.025, LEAD_IN = 0.06, PRE = 0.25, LAT_N = 9, COUNT_AHEAD = 0.1;
  function difficulty() {
    var d = GG.save && GG.save.settings ? GG.save.settings().gigDifficulty : null;
    return GG.gig.DIFFICULTIES && GG.gig.DIFFICULTIES[d] ? d : (GG.gig.DEFAULT_DIFFICULTY || 'normal');
  }
  var AUTO_BOT = { accuracy: 0.9, jitterMs: 40 };
  var P = GG.prefs;   // v1.5: the key map + timing helpers (11_settings); the v1.4 KEYS table is P.CLASSIC_KEYS
  var POP_TEXT = { perfect: 'PERFECT', good: 'GOOD', miss: 'MISS', fill: 'FILL!' };
  var POP_COLOR = { perfect: '#ffe27a', good: '#6fe39a', miss: '#ff6b5e', fill: '#c9a4ff' };
  // v0.9: every §4.4 genre moment and band action has a banner (content lines.moments[kind].label may rename one); an
  // unknown kind reads as words ('fistPump' -> 'Fist pump!'), never a raw id.
  var MOMENT_TEXT = { mosh: 'Mosh pit!', lighters: 'Lighters up', boo: 'Boooo', drinks: 'Incoming drinks!', wallOfDeath: 'Wall of death!',
    circlePit: 'Circle pit!', lineDance: 'Line dance!', capeSpin: 'Cape spin!', solo: 'Solo time', applause: 'Polite applause 🙇',   // v0.7: a silent (Japanese) crowd between songs
    pogo: 'Pogo!', fistPump: 'Fists up!', clapAlong: 'Clap along!', headbang: 'Headbang!', gangShout: 'Gang shout: HEY!', singAlong: 'Sing-along!',
    yeehaw: 'YEEHAW!', stageDive: 'Stage dive!', kneeSlide: 'Knee slide!', hatTip: 'Hat tip!', kickflip: 'Kickflip!' };
  var BAND_TEXT = { solo: "{n}'s solo: keep it simple", fill: '{n} sneaks in a fill!', miss: '{n} missed a cue', capeSpin: '{n} spins the cape!',
    stageDive: '{n} stage-dives!', kneeSlide: '{n} knee-slides to the edge!', hatTip: '{n} tips the hat!', kickflip: '{n} kickflips (sponsored)',
    headbang: '{n} headbangs!', pogo: '{n} pogoes!', fistPump: '{n} pumps a fist!', yeehaw: '{n} lets out a yeehaw!' };
  var LEVEL_TEXT = { hostile: 'Hostile', bored: 'Bored', warm: 'Warm', hyped: 'Hyped', wild: 'Wild' };
  function words(kind) { return String(kind || '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').toLowerCase().replace(/^\w/, function (c) { return c.toUpperCase(); }); }
  function momentText(kind) {
    var M = GG.content.lines && GG.content.lines.moments, m = M && M[kind];
    return (m && typeof m === 'object' && !Array.isArray(m) && m.label) || MOMENT_TEXT[kind] || words(kind) + '!';
  }
  ui.momentText = momentText;
  function bandText(action) { return BAND_TEXT[action] || (MOMENT_TEXT[action] ? '{n}: ' + MOMENT_TEXT[action] : '{n} goes big: ' + words(action).toLowerCase() + '!'); }
  // Between-song banter: content first (lines.banter[memberId], + lines.banter.any / lines.byBand[bandId].banter), these
  // member-keyed lines as the fallback (member ids are unique, so they never leak), then a neutral pool.
  var BANTER = {
    marcel: ['Merci, {city}! This next one is about my lawn.', 'Please do not touch the cape. The cape touches you.'],
    dana: ['Somebody turn me up. No, more.', 'That was in tune. Mostly.'],
    jaxon: ['(counts to four under his breath)', 'is the fog machine supposed to smell like that'],
    kenji: ['(Kenji nods once. The crowd nods back.)'],
    rox: ['This one goes out to the parking authority.'], benny: ['I broke a string. I have eleven more. Go.'],
    moth: ['(Moth tunes a string that was already in tune.)'], chase: ['Make some noise for the bartender!'],
    lenny: ['Is anyone else hot? It is so hot up here.'], tamara: ['Next one is faster. Sorry, {player}.'],
    travis: ['This next one is about a truck. They are all about a truck.'],
    earl: ['Y’all still with us?'], clementine: ['This fiddle has been in the family four generations. Stand back.'],
    duke: ['(Duke adjusts his hat. Somebody whoops.)'],
    any: ['Thank you, {city}! We are {band}!', 'Anybody here drive in from out of town? Nobody? Okay.', 'Drink some water. Or whatever. Next one!']
  };
  var BANTER_GENRE = { punk: ['This one is about city council. They are all about city council.', 'Two minutes, four chords, no refunds!'],
    rock: ['Are you ready to ROCK, {city}?! Sorry. Are you ready to rock, {city}?', 'This one goes out to anybody who owns leather pants.'],
    country: ['How y’all doin’ tonight, {city}?', 'This next one is a slow one. Grab somebody. Or a hay bale.'],
    metal: ['This next one is heavy. They are all heavy.'] };
  function banterPool(st, id) {
    var L = GG.content.lines || {}, B = L.banter || {}, own = id && Array.isArray(B[id]) && B[id].length ? B[id] : id && BANTER[id];
    var any = ui.pool(B, 'any', st).concat(ui.ownLines(ui.bandLines('banter', st) || [], st));
    return { own: own || null, any: ui.ownLines(any, st).length ? any : BANTER.any.concat(BANTER_GENRE[st.genre] || []) };
  }

  var G = null;   // the show in progress (one at a time)
  // v1.5 (Lane I): the key legends' look (new elements only, shown with GG.input.showKeyUI(); 5w places them in the PC layout)
  if (typeof document !== 'undefined' && document.head && !document.getElementById('gg-gigkeys-css')) {
    var kcss = document.createElement('style'); kcss.id = 'gg-gigkeys-css';
    kcss.textContent = [
      '.kcap { display: inline-block; min-width: 1.9em; padding: 0 6px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, .35); border-bottom-width: 2px;',
      '  background: rgba(255, 255, 255, .08); color: var(--text, #fff); font: 800 12px/1.6 system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; text-align: center; white-space: nowrap; }',
      '.gig-keys { margin-top: 10px; display: flex; flex-direction: column; gap: 6px; }',
      '.gig-keys .gk-row { display: flex; flex-wrap: wrap; gap: 6px 12px; }',
      '.gig-keys .gk { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; white-space: nowrap; }',
      '.gig-keys .gk-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }',
      '.gig-keys .gk-foot { align-items: center; gap: 8px; }',
      '.gig-pause-keys { margin: 0; }',
      '.gig-hint { position: absolute; right: 16px; bottom: calc(34% + 12px); z-index: 2; padding: 6px 10px; border-radius: 10px; background: rgba(15, 20, 32, .82);',
      '  color: var(--dim, #aab); font-size: 13px; pointer-events: none; }'
    ].join('\n');
    document.head.appendChild(kcss);
  }
  function S() { return GG.state; }
  function fill(t) { return t && S() ? ui.fill(t, S()) : t; }
  function sfx(n) { if (GG.audio && GG.audio.sfx) GG.audio.sfx(n); }
  function auto() { return !!ui.gigAutoplay; }
  function seatOf(st) { return GG.career && GG.career.seatOf ? GG.career.seatOf(st) : 'drums'; }
  function strings() { return !!(G && G.seat && G.seat !== 'drums'); }
  function lanesOf(state) {
    if (seatOf(state) !== 'drums' && GG.career.seatLanes) return GG.career.seatLanes(state);   // v1.1: your rig's lanes
    var n = state && state.gear && state.gear.lanes; return n >= 1 ? Math.min(n, C.LANES.length) : 4;
  }
  // v1.1 string lanes, low -> high (colourblind: the same Okabe-Ito set as the kit, by index).
  var STR_COLORS = ['#57c77a', '#ff6b4a', '#ffd23f', '#4f8cff', '#ff9f43', '#b98cff'];
  var STR_CB = ['#009E73', '#D55E00', '#F0E442', '#56B4E9', '#E69F00', '#CC79A7'];
  ui.STR_COLORS = STR_COLORS;
  function laneColor(l) {
    if (strings()) return (G.cb ? STR_CB : STR_COLORS)[l] || '#8899bb';
    if (G && G.cb && GG.prefs && GG.prefs.CB_COLOURS[C.LANES[l]]) return GG.prefs.CB_COLOURS[C.LANES[l]];
    var L = ui.LANES && ui.LANES[C.LANES[l]]; return L ? L.color : '#8899bb';
  }
  function laneName(l) { return strings() ? 'str' + l : C.LANES[l]; }
  function laneIndex(lane) { var m = /^str(\d)$/.exec(String(lane)); return m ? +m[1] : C.LANES.indexOf(lane); }
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
    // v0.8.3: a check < 100 ms after the last one (startAudio's snap right after a pump) keeps the last verdict; it read
    // as unhealthy and sent the downbeat's auto notes to the frame
    var prev = G.aSample, near = !!(prev && c.state === 'running' && (p - prev.p) <= 100);
    var healthy = near ? !!G.clockOk : c.state === 'running' && prev && Math.abs((c.currentTime - prev.a) / ((p - prev.p) / 1000) - 1) < 0.08;
    if (!near) G.aSample = { a: c.currentTime, p: p };
    G.clockOk = c.state === 'running' && (healthy || !prev);
    if (c.state !== 'running') return;
    var lat = c.outputLatency > 0 ? c.outputLatency : c.baseLatency > 0 ? c.baseLatency : DEFAULT_LAT;
    if (h < 0 || Math.abs(c.currentTime - h - lat) > 0.3) h = c.currentTime - Math.min(lat, 0.3);
    G.lat = U.clamp(c.currentTime - h, 0, 0.3);
    G.lats.push(G.lat); if (G.lats.length > LAT_N) G.lats.shift();
    off = h - p / 1000;
    // v0.8.3: a healthy clock that stays > 30 ms off for two checks in a row glitched (an output hiccup): snap, don't crawl 16 ms/s
    G.bigOff = healthy && Math.abs(off - G.offset) > 0.03 ? (G.bigOff || 0) + 1 : 0;
    if (snap || !G.synced || G.bigOff >= 2) { G.offset = off; G.synced = true; G.bigOff = 0; }
    else if (healthy) G.offset += U.clamp(off - G.offset, -0.004, 0.004);   // drift correction only, never a jump
  }
  function latMedian() {
    var a = G.lats; if (!a.length) return G.lat;
    var b = a.slice().sort(function (x, y) { return x - y; });
    return b[b.length >> 1];
  }
  function heardAt(p) { return p / 1000 + G.offset; }
  function heardNow() { return heardAt(performance.now()); }
  function songTime(p) { return heardAt(p) - G.zero; }
  /* ---- v0.8.3 drum sync -------------------------------------------------------------------------------------- */
  // Three clocks, all AudioContext seconds on the heard axis:
  //   zeroBand = the band's start (h.start; opts.at makes it the count-in's zero). Band time tBand = heard - zeroBand.
  //   G.zero   = zeroBand - D: the game clock (highway + judgement), tGame = tBand + D. songTime() / G.t are game time.
  //   D = latD + K, frozen at beginCount: latD = the median modelled output latency (G.lat, last LAT_N resyncs, never less
  //   than the current one), K = GG.prefs.syncLead(dispatch p90) = p90 + 5 ms (GG.audio.hit's 'now') + M 15 ms.
  // A tap at stamp S is judged J = heardAt(S) - G.zero (no audio offset) and its sound is booked at ctx time
  //   max(now + 5 ms, zeroBand + J'), J' = GG.prefs.syncSnap(J, note.t, hit): a hit within [-15, +15] ms of its note sounds
  //   exactly on the band's grid; anything else sounds at J (early stays early, late stays late). Since heard(S) = ctx(S) -
  //   lat, zeroBand + J = ctx(S) + K + (latD - lat): the modelled latency cancels, and unmodelled latency (Bluetooth, the
  //   rig's compressors) delays band and drums alike. Cost: every tap sounds ~K after the touch (0.8.2: dispatch + 5 ms)
  //   and the highway leads the heard band by ~K + latency (a by-ear player should turn Drum sync off).
  // The count-in hats, Auto-kick, two-thumb auto notes and second kicks are booked on the band grid (zeroBand + t) by the
  //   pump in both modes. The dispatch p90 (performance.now() - ev.timeStamp of touch taps) blends into settings.syncDisp
  //   after each finished song (per device). Classic (drumSync off, no Web Audio, or a clock not running/healthy at the
  //   count-in): D = 0, judged minus the audio offset, taps sound 'now'.

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
    var lineup = null;   // v1.1: the seat entry point (contract §5 cross-lane: stage.setup({ seat, lineup })); 42 falls back the same way
    try { lineup = GG.career.lineup ? GG.career.lineup(state) : null; } catch (e) { lineup = null; }
    return { venue: v, crowd: G.attendance, capacity: g.capacity, genre: state.genre, flags: state.flags || {}, player: state.player,
      seat: state.seat || 'drums', lineup: lineup,
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
      // v1.5 PC layout (B): the stage runs down behind the highway's translucent top (0.1 of it: the kit sits just above the highway, mockup B), showing on both sides
      if (hw.height) stageCall('setFrame', { top: Math.round(G.dom.bar.getBoundingClientRect().bottom), bottom: Math.round(H - hw.top - (wideNow() ? 0.1 * hw.height : 0)) });
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
      var li = laneIndex(p.lane);
      if (p.judgement && !p.auto) { G.popKind = p.judgement; G.popLane = li; G.popAt = performance.now(); }
      if (p.judgement === 'perfect' || p.judgement === 'good') G.burst[li] = performance.now();
    },
    'crowd:level': function (p) { if (G && G.dom) { G.dom.level.textContent = LEVEL_TEXT[p.level] || p.level; G.dom.crowd.dataset.level = p.level; G.dom.back.dataset.level = p.level; } },
    'crowd:moment': function (p) {
      if (!G || G.opts.studio) return;
      if (p.kind !== 'solo') banner(momentText(p.kind), p.kind === 'boo' || p.kind === 'drinks' ? 'bad' : '');
      if (p.kind === 'boo') sfx('boo'); else if (p.kind !== 'solo' && p.kind !== 'drinks') sfx('cheer');
    },
    'gig:band': function (p) {
      if (!G) return;
      var who = p.who || p.id;   // v0.9 contract names it id; the v0.3 sim sends who
      stageCall('bandAction', who, p.action);
      if (who === 'player' && p.action === 'solo') { banner('Your solo! The spotlight is yours.', 'band'); return; }   // v1.1 the lead seat
      if (p.action) banner(bandText(p.action).replace('{n}', who ? ui.who(who).short : 'The band'), p.action === 'miss' ? 'bad' : 'band');
    },
    'audio:end': function (p) {   // the song stopped under us (app hidden, another screen): pause, restart on resume
      if (!G || !G.handle || p.handle !== G.handle) return;
      G.handle = null;
      // v0.8: a song that played to its end is no interruption (the gig clock finishes it), even when the last frame was
      // slow and G.t still lags; otherwise judge against the song time now, not the last frame's.
      if (p.natural) return;
      var now = G.synced && G.zero != null ? songTime(performance.now()) : G.t;
      if ((G.mode === 'play' || G.mode === 'count') && G.chart && Math.max(G.t, now) - G.D < G.chart.duration - 0.1) pause(true);
    },
    'ui:stack': guard, 'ui:layout': guard, 'screen:open': guard, 'screen:close': guard,
    // v1.5: the PC layout switched (never while a song is live; a paused song re-lays out its highway at once)
    'ui:wide': function () { if (!G || !G.dom) return; layout(); guard(); gigHint(); if (!G.raf) still(); }
  };
  function onVisibility() { if (document.hidden) { if (G && (G.mode === 'play' || G.mode === 'count' || G.mode === 'hold' || G.waking)) pause(true); } else guard(); }
  function listen(on) {
    Object.keys(HANDLERS).forEach(function (ev) { if (on) GG.on(ev, HANDLERS[ev]); else GG.off(ev, HANDLERS[ev]); });
    if (on) { document.addEventListener('visibilitychange', onVisibility); window.addEventListener('resize', onResize); document.addEventListener('pointerdown', onDown, { capture: true, passive: false }); }
    else { document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('resize', onResize); document.removeEventListener('pointerdown', onDown, { capture: true }); }
    // v1.1: lifting a finger (or a key) ends a hold
    if (on) { document.addEventListener('pointerup', onUp, true); document.addEventListener('pointercancel', onUp, true); }
    else { document.removeEventListener('pointerup', onUp, true); document.removeEventListener('pointercancel', onUp, true); }
    // v1.5: the gig keys on the window's capture phase (after GG.input's capture slot, before the menu router), + window blur
    if (on) { window.addEventListener('keydown', onKey, true); window.addEventListener('keyup', onKeyUp, true); window.addEventListener('blur', onBlur); }
    else { window.removeEventListener('keydown', onKey, true); window.removeEventListener('keyup', onKeyUp, true); window.removeEventListener('blur', onBlur); }
  }

  GG.on('settings:changed', function () { var e = ui.get && ui.get('gig-set'); if (e && G && !G.ses) e.rerender(); });   // v0.6.1
  // v1.5: the setlist sheet + results re-render for the PC layout's columns (and the setlist's key legend after a first key press)
  GG.on('ui:wide', function () { ['gig-set', 'gig-results'].forEach(function (id) { var e = ui.get && ui.get(id); if (e && G) e.rerender(); }); });
  GG.on('input:mode', function () { var e = ui.get && ui.get('gig-set'); if (e && G && !G.ses) e.rerender(); });
  GG.on('input:layoutmap', function () { var e = ui.get && ui.get('gig-set'); if (e && G && !G.ses) e.rerender(); });   // v1.5 review

  /* ---- Entry --------------------------------------------------------------------------------------------- */
  ui.gigAutoplay = ui.gigAutoplay || false;
  ui.playGig = function (gig, done, opts) {
    var st = S(); if (!st || !gig) return false;
    if (G) teardown();
    G = { gig: gig, done: done, opts: opts || {}, mode: 'set', ses: null, chart: null, t: 0, zero: 0, offset: 0, synced: false,
      syncAt: -1e9, lat: DEFAULT_LAT, actx: null, handle: null, paused: false, restart: false, raf: 0, burst: [0, 0, 0, 0, 0, 0], dash: [5, 4], noDash: [], ap: 0, autoN: 0, autoAt: [-1e9, -1e9, -1e9, -1e9, -1e9, -1e9],
      dq: [], dp: 0, dblN: 0, k2: [-1, -1, -1, -1, -1, -1], k2i: 0, k2Last: -1e9, k2W: -1e9,
      zeroBand: 0, D: 0, K: 0, latD: 0, sync: false, lats: [], disp: [], dispP90: null, drawOff: 0, visM: false, waking: false,
      hb: 0, hatN: 0, hatSkip: 0, kq: [], kp: 0, akN: 0, akSkip: 0, snapN: 0, lastBook: [-1e9, -1e9, -1e9, -1e9, -1e9, -1e9],
      press: [0, 0, 0, 0, 0, 0], popKind: '', popLane: 0, popAt: -1e9, comboStr: '', comboN: -1, crowdN: -1, lanes: lanesOf((opts && opts.studio && opts.studio.state) || st),
      attendance: GG.gig.expectCrowd(st, gig), pick: null, result: null,
      seat: seatOf((opts && opts.studio && opts.studio.state) || st), held: [null, null, null, null, null, null], ptr: {}, laneMidi: [], runs: [], seatN: 0, relN: 0, runN: 0,
      down: {}, keyDown: {}, keyTaps: 0, keySwallowed: 0, lostKeyups: 0, keyUsed: false, keyLast: null, input: null, caps: false, capL: null,   // v1.5 gig keys
      cardAt: 0, cardArm: 0, cardOk: {}, cardT: 0, cardRej: 0, wideHw: false };
    readPrefs();
    if (keyUI()) askLayoutMap();
    listen(true);
    ui.show('gig', {});
    setupStage();
    if (G.opts.studio) { startSession([G.opts.studio.songId]); if (auto()) nextSong(); else showBetween(null); return true; }   // v0.5 studio take
    var live = st.liveGig && st.liveGig.gig && st.liveGig.gig.venueId === gig.venueId ? st.liveGig : null;
    if (live) {
      startSession(null);
      if (live.sim) { G.sim = live.sim; startSim(); }   // v1.3.1: a simulated show finishes simulated
      else if (G.ses.done) finishShow(); else { showBetween(null); if (auto()) G.autoT = setTimeout(nextSong, 30); }
    }
    else if (auto()) { startSession(GG.gig.defaultSetlist(st, gig)); nextSong(); }
    else { G.pick = GG.gig.defaultSetlist(st, gig); ui.show('gig-set', {}); }
    return true;
  };
  function readPrefs() {   // v0.6.1: read once per show / session (never in the frame loop)
    var pf = prefs(), none = { audio: 0, visual: 0, visM: false };
    // v1.5: both timings (touch = v1.4's calibration; keys = calibKb, falling back per field); the song's input picks G.off
    G.offT = P ? P.offsets(pf, 'touch') : none; G.offK = P ? P.offsets(pf, 'keys') : G.offT;
    G.off = G.input === 'keys' ? G.offK : G.offT;
    G.visM = !!G.off.visM;   // v0.8.3: the light check ran for this profile (v1.5: for this input)
    G.pf = pf; G.lefty = !!pf.lefty; G.cb = !!pf.colourblind; G.speed = pf.noteSpeed > 0 ? pf.noteSpeed : 1;
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
    releaseAll(true); setLive(false);   // v1.5
    stopAudio();
    if (G.raf) cancelAnimationFrame(G.raf);
    clearTimeout(G.startTimer); clearTimeout(G.bannerT); clearTimeout(G.autoT); clearTimeout(G.wakeT); clearTimeout(G.holdT); clearTimeout(G.cardT);
    listen(false);
    G = null;
  }
  function stopAudio() {
    if (!G) return;
    clearTimeout(G.startTimer); G.startTimer = 0;
    clearInterval(G.pumpT); G.pumpT = 0;
    var h = G.handle; G.handle = null;
    if (h && h.playing) h.stop();
    if (GG.audio && GG.audio.hitCancel) GG.audio.hitCancel();   // v0.7.2: auto notes / second kicks already scheduled ahead
    if (G.ctxPaused && G.actx) { G.ctxPaused = false; try { G.actx.resume(); } catch (e) { /* ignore */ } }
  }

  /* ---- Songs ------------------------------------------------------------------------------------------- */
  function nextSong() {
    if (!G) return;
    if (G.ses.done) { finishShow(); return; }
    disarmCard();   // v1.5
    hideBetween();
    G.chart = G.ses.startSong();
    if (auto()) { playAuto(); return; }
    warmSong();   // v1.2
    beginCount();
  }
  function beginCount(held) {
    setLive(true); blurFocus();   // v1.5: no PC-layout switch mid-song (GG.input defers it); Space / Enter never press a button
    // v0.8.3: a suspended context (Restart right after a mid-song pause: stopAudio's resume() is async) would decide the
    // song's timing on a clock that isn't running yet: hold the count-in until it runs (1 s at most), like resume()'s go()
    var c0 = G.actx || (G.actx = audioCtx());
    if (!held && c0 && c0.state !== 'running' && c0.resume && !document.hidden) {
      var pr = null; try { pr = c0.resume(); } catch (e) { pr = null; }
      if (pr && typeof pr.then === 'function') {
        var tok = G.holdTok = (G.holdTok || 0) + 1;
        G.mode = 'hold'; G.paused = false; G.restart = false;
        var go = function () { if (!G || G.holdTok !== tok || G.mode !== 'hold' || G.paused) return; G.holdTok++; clearTimeout(G.holdT); beginCount(true); };
        pr.then(go, go);
        G.holdT = setTimeout(go, 1000);
        return;
      }
    }
    readPrefs();   // v0.8.3: the Drum sync toggle / calibration as of this song
    freezeKeys();   // v1.5: the song's input (keys / touch), its timing, the key map and keycaps
    // v0.8.3: a whole number of count-in beats (2-4), so every numeral shown has its hat on the grid (< 92 bpm lost some)
    var p = performance.now(), ch = G.chart, nb = Math.min(4, Math.max(2, Math.ceil(U.clamp(4 * ch.spb, 1.6, 2.6) / ch.spb - 1e-6))), lead = nb * ch.spb;
    G.aSample = null;   // pair fresh: a sample from before the between screen / a pause would read the clock as unhealthy
    resync(p, true);
    G.mode = 'count'; G.paused = false; G.restart = false; G.drawFrom = 0; G.countBeat = 99; G.popAt = -1e9;
    G.ap = 0; G.autoN = G.autoN || 0; G.autoAt = G.autoAt || [-1e9, -1e9, -1e9, -1e9, -1e9, -1e9];
    G.dq = []; G.dp = 0; G.k2Last = -1e9; G.k2W = -1e9; for (var q = 0; q < G.k2.length; q++) G.k2[q] = -1;   // v0.7.2 this chart's doubles
    for (var k = 0; k < ch.notes.length; k++) if (ch.notes[k].dbl) G.dq.push(k);
    // v0.8.3: the count-in hats (booked by the pump) and Auto-kick's kicks (the SESSION's assist, fixed for the show)
    G.hb = G.hb0 = -nb; G.hatN = 0; G.hatSkip = 0; G.kp = 0; G.kq = [];
    for (var q2 = 0; q2 < G.lastBook.length; q2++) G.lastBook[q2] = -1e9;
    for (q2 = 0; q2 < G.held.length; q2++) G.held[q2] = null;   // v1.1 review: a restart starts with nothing held
    G.runs.length = 0; G.ptr = {}; releaseAll(true); G.keyUsed = false;   // v1.5: a new chart: nothing key-held
    if (G.ses.assists && G.ses.assists.autoKick && KICK < G.lanes) for (k = 0; k < ch.notes.length; k++) if (ch.notes[k].lane === 'kick' && !ch.notes[k].free) G.kq.push(k);
    var c = G.actx, live = !!(c && c.state === 'running' && G.clockOk);
    G.sync = G.pf.drumSync !== false && live;   // no Web Audio / a suspended or unhealthy clock at the count-in: classic
    G.K = G.sync ? GG.prefs.syncLead(G.dispP90 != null ? G.dispP90 : G.pf.syncDisp / 1000) : 0;
    G.latD = G.sync ? Math.max(latMedian(), G.lat) : 0;
    G.D = G.sync ? G.latD + G.K : 0;   // frozen for the song (never recomputed on a resync)
    G.drawOff = G.sync ? GG.prefs.syncVisual(G.off, G.visM) : (G.off ? G.off.visual - G.off.audio : 0);
    G.disp = [];
    // the first hat is heard COUNT_AHEAD + latency from now, so it can still be booked ahead on the audio clock
    G.zeroBand = heardAt(p) + G.lat + COUNT_AHEAD + lead; G.zero = G.zeroBand - G.D; G.t = songTime(p);
    var wait = G.zeroBand - G.lat - PRE - heardAt(p);   // the band is built PRE early and told to start at zeroBand (opts.at)
    G.startTimer = setTimeout(startAudio, Math.max(0, wait * 1000));
    book(G.t, p);   // the first hat goes out now
    if (!G.pumpT) G.pumpT = setInterval(pump, PUMP_MS);   // booking ahead never waits for a frame
    layout();
    gigHint();   // v1.5
    loop();
  }
  // The band's play() options for this song (v1.2: + gig, the gig clamps of the band's feel, F3.3; also what A.warm renders).
  function bandOpts(song, at) {
    var po = { genre: S().genre, section: null, loop: false, backing: true, drums: false, at: at,
      singer: ui.roleOf('front', S()), band: S().bandId, gig: true };   // v0.9: who sings (for the audio's per-singer vocal voice)
    if (G.opts && G.opts.studio && !G.opts.practice) po.studio = true;   // v1.2 (F16.2): a studio take, the band tighter (t + C.FEEL_STUDIO; practice runs in studio mode but is no take)
    if (strings()) {   // v1.1: the band (the swapped drummer) plays the drums; your part is muted, your taps play it
      po.drums = true; po.seat = G.seat; po.part = song.pattern && song.pattern.part;
      po.mute = GG.audio && GG.audio.seatKinds ? GG.audio.seatKinds(S().genre, G.seat) : null;
      po.soloist = G.ses && G.ses.roles ? G.ses.roles.solo : undefined;
    }
    return po;
  }
  // v1.2 (Lane F): the song's string buffers render while the count-in runs (A.warm, Lane I; a miss plays the 1.1 sound).
  function warmSong() {
    var A = GG.audio, song = G && G.ses && G.ses.song ? G.ses.song() : null;
    if (!song || !song.pattern || !A || !A.warm || (A.isClassic && A.isClassic())) return;
    try {
      var w = A.warm(song.pattern, bandOpts(song)), tok = G.warmTok = (G.warmTok || 0) + 1;
      if (w && typeof w.then === 'function') w.then(function (x) { if (G && G.warmTok === tok) G.warm = x || null; }, function () { /* ignore */ });
    } catch (e) { /* the 1.1 sound plays */ }
  }
  function startAudio() {
    if (!G) return;
    G.startTimer = 0;
    var song = G.ses.song(), p = performance.now(), h = null;
    var at = G.actx && G.actx.state === 'running' ? G.zeroBand : undefined;   // v0.8.3: start on the count-in's grid
    var po = bandOpts(song, at);
    try { h = GG.audio && GG.audio.play ? GG.audio.play(song.pattern, po) : null; }
    catch (e) { console.error('[gig] audio.play failed', e); }
    G.handle = h;
    if (!h) return;   // no Web Audio: the performance clock keeps time
    if (!G.actx) G.actx = audioCtx();
    // resync pairs performance.now() with the audio clock read NOW, so it gets a fresh now: play() builds the whole song and
    // can take tens of ms on a slow phone (the stale p put the song clock that far ahead of the band for seconds).
    if (G.actx && G.actx.state === 'running') { resync(performance.now(), true); G.zeroBand = h.start; G.zero = h.start - G.D; pump(); }   // (normally h.start === zeroBand: no jump) pump: the downbeat's auto notes go out with the band's first notes
    else if (!G.actx) { G.offset = h.start - LEAD_IN - DEFAULT_LAT - p / 1000; G.D = 0; G.sync = false; G.drawOff = G.off ? G.off.visual - G.off.audio : 0; G.zeroBand = G.zero = h.start; }   // no accessor: anchor on the handle
    else wake();   // a suspended/interrupted context: keep the count-in's performance-clock zero so notes still flow
  }
  function restartSong() {
    stopAudio();
    G.chart = G.ses.startSong(G.ses.index);
    warmSong();   // v1.2 (the cache keeps it: nothing new to render)
    beginCount();
  }
  function endSong() {
    releaseAll(); setLive(false);   // v1.5: key-held strings let go at the end; the PC-layout switch may run
    stopAudio();
    var q = GG.prefs && GG.prefs.syncP90 ? GG.prefs.syncP90(G.disp) : null;   // v0.8.3: this device's touch dispatch p90
    if (q != null) {
      G.dispP90 = GG.prefs.syncBlend(G.dispP90 != null ? G.dispP90 : G.pf.syncDisp / 1000, q);
      var ms = Math.round(G.dispP90 * 1000);
      if (Math.abs(ms - G.pf.syncDisp) >= 2) { G.pf.syncDisp = ms; GG.prefs.set({ syncDisp: ms }); }
    }
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
    if (G) { releaseAll(); setLive(false); }   // v1.5: every cause lets every key-held lane go (no stuck notes)
    if (G && G.paused && G.waking) {   // v0.8.3: hidden / paused while resume() waits for the context: stay frozen, try again
      G.waking = false; clearTimeout(G.wakeT);
      G.restart = G.restart || !!interrupted;
      pauseShow(); return;
    }
    if (!G || G.paused || (G.mode !== 'play' && G.mode !== 'count' && G.mode !== 'hold')) return;
    G.paused = true; G.pauseT = G.t;
    if (G.mode === 'hold') { G.holdTok = (G.holdTok || 0) + 1; clearTimeout(G.holdT); }
    if (G.startTimer || G.mode === 'count' || G.mode === 'hold' || interrupted || !G.actx || !G.handle || !G.handle.playing || G.actx.state !== 'running') {
      G.restart = true; stopAudio();
    } else {
      try { G.actx.suspend(); G.ctxPaused = true; } catch (e) { G.restart = true; stopAudio(); }
    }
    pauseShow();
  }
  function pauseShow() {
    G.dom.pause.hidden = false;
    G.dom.pauseNote.textContent = G.restart ? 'The song starts over when you come back.' : 'The band is frozen mid-riff.';
    // v1.5: "Esc to resume" under the note, only when the key UI shows (a computer, the PC layout, or a key pressed)
    var k = G.dom.pauseKeys;
    if (keyUI()) { if (!k) k = G.dom.pauseKeys = el('p.small.dim.gig-pause-keys', { testid: 'gig-pause-keys' }, [kcap('Esc'), ' to resume']); if (!k.parentNode) G.dom.pauseNote.parentNode.insertBefore(k, G.dom.pauseNote.nextSibling); }
    else if (k && k.parentNode) k.parentNode.removeChild(k);
  }
  function resume(restart) {
    if (!G || !G.paused) return;
    blurFocus();   // v1.5: Space / Enter never land on a button mid-song
    G.dom.pause.hidden = true;
    if (restart || G.restart) { G.paused = false; restartSong(); return; }
    G.ctxPaused = false;
    var c = G.actx, pr = null;
    try { pr = c.resume(); } catch (e) { /* ignore */ }
    // v0.8.3: resume() is async (the state still reads 'suspended'): stay frozen until the clock runs, then snap the game
    // clock to it (before, the stale pairing ran the game ahead of the band by the whole pause). A context that never
    // comes back within a second: carry on from the pause point on performance.now().
    function go() {
      if (!G || !G.waking) return;
      G.waking = false; clearTimeout(G.wakeT);
      if (document.hidden) { G.restart = true; pauseShow(); return; }   // never un-pause a hidden page (the band is suspended)
      G.offset = G.zero + G.pauseT - performance.now() / 1000; G.aSample = null;
      G.paused = false; setLive(true);
      resync(performance.now(), true);
    }
    G.waking = true;
    if (c.state === 'running' || !pr || typeof pr.then !== 'function') { go(); return; }
    pr.then(go, go);
    G.wakeT = setTimeout(go, 1000);
  }

  /* ---- v0.6.2 two-thumb auto notes: the hits a third thumb would need play themselves on the audio clock ---- */
  // A healthy running clock schedules each one AUTO_AHEAD early at its exact context time (G.zero + t, same heard-clock
  // pairing as the backing band); a stalled/free-running clock plays it on the frame it comes due. Never judged.
  // Booking ahead reads the song time off the audio clock itself (heard = currentTime - lat), like the band's scheduler:
  // the game clock only drifts toward it (v0.5.1), so after an audio hiccup the two can disagree for a while, and a hit
  // booked by the game clock would land up to that far early (> 1 s: GG.audio.hit plays it now) or late.
  var AUTO_AHEAD = 0.15;
  // v0.8.3: how far ahead (band seconds) to book. Before the downbeat PRE more: the band is built PRE early and a phone's
  // main thread can stall right after (the stage's first frames), so the count-in and the first notes go out early.
  function aheadOf(sched, now) { return sched ? G.lat + AUTO_AHEAD + (now < 0 ? PRE : 0) : 0; }
  function heardSong(c, sched, t) { return sched ? c.currentTime - G.lat - G.zeroBand : t - G.D; }   // band time (v0.8.3)
  function autoNotes(t, p) {
    var a = G.chart.auto, c = G.actx, sched = G.clockOk && G.handle && c && c.state === 'running';
    if (!a) return;
    var now = heardSong(c, sched, t);
    while (G.ap < a.length && a[G.ap].t <= now + aheadOf(sched, now)) {   // heard clock + output latency = context time
      var n = a[G.ap++];
      if (n.li >= G.lanes) continue;
      if (n.t < now - 0.08) { G.autoSkip = (G.autoSkip || 0) + 1; continue; }   // skipped past (a resync jump): stay quiet rather than flam
      if (strings()) seatSound(n, n.li, sched ? G.zeroBand + n.t : undefined, autoVel('other'));   // v1.1: your voice plays it (v1.2: + vel)
      else if (GG.audio && GG.audio.hit) GG.audio.hit(n.lane, sched ? G.zeroBand + n.t : undefined, autoVel(n.lane));
      G.autoN++; G.autoAt[n.li] = p + Math.max(0, n.t - (t - G.D)) * 1000;   // the ring shows when it's heard
    }
  }

  /* ---- v0.7.2 double kicks: one tap, two kicks ------------------------------------------------------------- */
  // Once a double's first kick is judged a hit (tap or Auto-kick; the session stamps hitT), its second kick plays
  // max(t2 - hitT, DBL_MIN) after the first kick is HEARD (k1, song clock: a tap stamps it; Auto-kick's hit sounds at its
  // frame + output latency). A tap is judged on the calibrated clock but sounds (offset + latency) later, so the pair keeps
  // its spacing on every headset: scheduled AUTO_AHEAD early at G.zero + time on a healthy clock, else on the frame it's due.
  // A second kick skipped past (a stalled frame / resync jump) is marked d2 = 2 so an echo tap may stand in for it.
  var DBL_MIN = 0.06, HIT_LEAD = 0.005, KICK = C.LANES.indexOf('kick');   // HIT_LEAD: GG.audio.hit plays 'now' at ctx now + 5 ms
  // v0.8.3: the count-in hats and Auto-kick's kicks are booked the same way (they played on frames: 40-500 ms late).
  function countHats(t, p) {
    var c = G.actx, sched = !!(G.clockOk && c && c.state === 'running');   // opts.at makes zeroBand the band's start before it plays
    var now = heardSong(c, sched, t), ahead = aheadOf(sched, now);
    while (G.hb < 0) {
      var at = G.hb * G.chart.spb; if (at > now + ahead) break;
      G.hb++;
      if (at < now - 0.08) { G.hatSkip++; continue; }
      if (GG.audio && GG.audio.hit) GG.audio.hit('hat', sched ? G.zeroBand + at : undefined, autoVel('hat'));
      G.hatN++;
    }
  }
  function autoKicks(t, p) {
    var q = G.kq, n = G.chart.notes, c = G.actx, sched = G.clockOk && G.handle && c && c.state === 'running';
    var now = heardSong(c, sched, t), ahead = aheadOf(sched, now);
    while (G.kp < q.length) {
      var x = n[q[G.kp]];
      if (x.t > now + ahead) break;
      G.kp++;
      if (x.free) continue;
      if (x.t < now - 0.08) { G.akSkip++; continue; }   // skipped past (a resync jump): stay quiet rather than flam
      if (GG.audio && GG.audio.hit) GG.audio.hit('kick', sched ? G.zeroBand + x.t : undefined, autoVel('kick'));
      G.akN++;
    }
  }
  function doubleKicks(t, p) {
    var q = G.dq, n = G.chart.notes, c = G.actx, sched = G.clockOk && G.handle && c && c.state === 'running';
    var now = heardSong(c, sched, t), ahead = aheadOf(sched, now);
    while (G.dp < q.length && n[q[G.dp]].d2) G.dp++;
    for (var k = G.dp; k < q.length; k++) {
      var x = n[q[k]];
      if (x.t > t + 0.45) break;                        // nothing this late can have been judged yet
      var ak = G.kq.length && !x.free;                  // v0.8.3: Auto-kick hits every kick note: don't wait for the frame's judgement
      if (x.d2 || (x.j === 0 && !ak)) continue;         // done, or still waiting for its tap
      if (x.j !== 0 && x.j !== 1 && x.j !== 2) { x.d2 = 1; continue; }   // a missed double plays nothing extra
      // v0.8.3: band time of the first kick's sound + the spacing (a tap stamps both; Auto-kick's kick is booked on the grid)
      var k1, sp;
      if (x.k1 != null) { k1 = x.k1; sp = x.sp; }
      else { k1 = x.t; sp = Math.max(x.t2 - x.t, DBL_MIN); }
      var w = Math.max(k1 + sp, G.k2W + DBL_MIN);   // the pair's spacing; never two at once (a stalled frame)
      if (w > now + ahead) continue;
      x.d2 = 1; G.k2W = w;
      if (w < now - 0.08 || KICK >= G.lanes) { x.d2 = 2; continue; }   // skipped past (a resync jump): stay quiet rather than flam
      if (GG.audio && GG.audio.hit) GG.audio.hit('kick', sched ? G.zeroBand + w : undefined, autoVel('double'));   // (a softer second stroke)
      G.dblN++;
      var at = p + Math.max(0, w - (t - G.D)) * 1000;           // when it's heard: the zone flash, a ring, the drummer's left foot
      G.k2[G.k2i] = at; G.k2i = (G.k2i + 1) % G.k2.length; G.autoAt[KICK] = at;
    }
    for (var i = 0; i < G.k2.length; i++) if (G.k2[i] > 0 && p >= G.k2[i]) { G.k2Last = G.k2[i]; G.k2[i] = -1; stageCall('kick2'); }
  }

  /* ---- Booking pump: auto notes + second kicks, on a timer like the backing band's scheduler ---------- */
  // rAF waits on the GPU (a phone drawing the 3D stage, a hitch): 150+ ms gaps while the main thread is idle. Booking
  // only on frames let a late frame book a hit in the past (it then plays late). The frame loop still books too.
  var PUMP_MS = 25;
  function book(t, p) {
    if (G.hb < 0) countHats(t, p);   // v0.8.3 the count-in
    if (t < -0.5) return;
    autoNotes(t, p);   // v0.6.2 two-thumb drops play themselves
    if (G.kq.length) autoKicks(t, p);   // v0.8.3 Auto-kick
    if (G.dq.length) doubleKicks(t, p);   // v0.7.2 a double's second kick
    if (G.seat !== 'drums') seatBook(t, p);   // v1.1: runs while held, holds that rang out
  }

  /* ---- v1.1 "Seats": your instrument ----------------------------------------------------------------------- */
  // The voice for a note kind (bass -> pluck, lead / twang -> lead, the rest -> strum); no kind = the seat's own.
  function voiceFor(kind) {
    var A = GG.audio; if (!A) return null;
    var k = kind || ({ bass: 'bass', lead: 'lead' })[G.seat] || 'gtr';
    return k === 'bass' ? A.pluck : k === 'lead' || k === 'twang' ? A.lead : A.strum;
  }
  function laneMidi(li) {
    var m = G.laneMidi[li];
    if (m != null) return m;
    var n = G.chart ? G.chart.notes : [];
    for (var k = 0; k < n.length; k++) if (n[k].li === li && n[k].midi != null) return (G.laneMidi[li] = n[k].midi);
    return 40 + li * 5;
  }
  // One of your notes (a tap's, an auto note, a run's) -> the voice handle (null without the voice). fifth: the chord's
  // second lane plays the fifth.
  function seatSound(n, li, when, vo) {
    var f = voiceFor(n && n.kind), midi = n && n.midi != null ? n.midi : laneMidi(li), o;
    if (!f) return null;
    if (n && n.midi != null) G.laneMidi[li] = n.midi;
    o = { len: n ? (n.run && n.seq && n.seq.length ? n.seq[0][0] : n.len || 0.25) : 0.25, hold: !!(n && n.hold && !n.run), kind: n && n.kind || null,
      power: !!(n && n.power), mute: !!(n && n.mute), strum: n && n.strum || null, up: !!(n && n.up), bend: !!(n && n.bend), chord: !!(n && n.chord) };
    if (n && n.with) o.with = n.with;   // v1.1 review: a same-voice partner (metal's chorus ring) layers on this note's handle
    if (n && n.dead) o.dead = true;   // v1.3: a Scratch note plays a dead strum
    if (vo) o.vel = vo.vel;   // v1.2 (F5): the tap's velocity (no vo: the 1.1 call)
    try { G.seatN++; return f(midi, when, o); } catch (e) { return null; }
  }
  function nowWhen(li, J) {   // the band-clock booking time for a sound at song time J (drum sync), else undefined ('now')
    var c = G.actx;
    if (!G.sync || !G.clockOk || !c || c.state !== 'running') return undefined;
    var when = Math.max(GG.prefs.syncWhen(J, G.zeroBand, c.currentTime), G.lastBook[li] + 0.001);
    G.lastBook[li] = when;
    return when;
  }
  function releaseLane(li, J) {   // lift: the session judges the hold, the voice stops
    if (G.ses && G.ses.release) G.ses.release(li, J);
    dropVoice(li, J);
  }
  function dropVoice(li, J) {   // only the voice held under lane li stops (the session has already moved on)
    var h = G.held[li];
    G.held[li] = null;
    if (h && h.h && GG.audio && GG.audio.release) { try { GG.audio.release(h.h, nowWhen(li, J)); G.relN++; } catch (e) { /* a voice that already ended */ } }
  }
  // v1.1 review: a lift ends only the hold its own press started (e = { li, n }: the lane pressed, the note it judged; a chord
  // is held under its root lane n.li, whichever lane came last). A hold that already moved on to the next head in that lane
  // (the other thumb) or rang out is left alone; a half chord's sound (never a hold) stops.
  function lift(e, at) {
    var n = e && e.n;
    if (!n || !G.ses) return;
    if (G.ses.holding && G.ses.holding(n.li) === n) { releaseLane(n.li, at); return; }
    if (n.chord && n.sh && !(G.held[n.li] && G.held[n.li].n === n) && GG.audio && GG.audio.release) { try { GG.audio.release(n.sh, nowWhen(n.li, at)); } catch (x) { /* ended */ } }
  }
  // Runs play on the band grid while their lane is held; a hold that rang out lets its voice go at its end.
  function seatBook(t, p) {
    var c = G.actx, sched = G.clockOk && G.handle && c && c.state === 'running', now = heardSong(c, sched, t), ahead = aheadOf(sched, now);
    for (var r = G.runs.length - 1; r >= 0; r--) {
      var ru = G.runs[r], n = ru.n, live = G.ses.holding && G.ses.holding(ru.li) === n;
      while (live && ru.i < n.seq.length && n.t + n.seq[ru.i][0] <= now + ahead) {
        var q = n.seq[ru.i++], at = n.t + q[0];
        if (at < now - 0.08) continue;
        seatSound({ kind: n.kind, midi: q[1], len: q[2], power: n.power, mute: n.mute }, ru.li, sched ? G.zeroBand + at : undefined, ru.vo || autoVel('other'));   // (v1.2 review: the head tap's vel, so the run stays one string sound)
        G.runN++;
      }
      if (!live || ru.i >= n.seq.length) G.runs.splice(r, 1);
    }
    for (var l = 0; l < G.held.length; l++) {
      var h = G.held[l];
      if (h && !(G.ses.holding && G.ses.holding(l) === h.n)) { G.held[l] = null; if (h.h && GG.audio && GG.audio.release) { try { GG.audio.release(h.h, sched ? G.zeroBand + Math.min(h.n.t + h.n.len, Math.max(now, h.n.t)) : undefined); } catch (e) { /* ended */ } } }
    }
  }
  function onUp(ev) {
    if (!G || !strings()) return;
    var ls = G.ptr[ev.pointerId];
    if (!ls) return;
    delete G.ptr[ev.pointerId];
    var at = tapTime(ev.timeStamp);
    for (var i = 0; i < ls.length; i++) lift(ls[i], at);
  }
  function pump() {
    if (!G || !G.chart || G.paused || (G.mode !== 'play' && G.mode !== 'count') || auto()) return;
    var p = performance.now(), c = G.actx, h = G.handle;
    if (p - G.syncAt > 250) resync(p, false);
    // v0.8.3: a band that started late (the context was suspended at its start): move both zeros onto it
    if (h && c && c.state === 'running' && Math.abs(h.start - G.zeroBand) > 0.005) { resync(p, true); G.zeroBand = h.start; G.zero = h.start - G.D; }
    book(songTime(p), p);
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
        if (beat !== G.countBeat && beat >= G.hb0 && beat < 0) {
          G.countBeat = beat; G.dom.count.textContent = String(-beat); G.dom.count.className = 'gig-count show';   // (v0.8.3: the hats are booked)
        }
        if (t >= 0) { G.mode = 'play'; G.dom.count.className = 'gig-count'; }
      }
      if (t >= 0) G.ses.tick(t);   // v0.6.1 Auto-kick judges here; v0.8.3: its kicks are booked (autoKicks)
      book(t, p);   // auto notes + second kicks (the pump books them between frames)
      if (G.mode === 'play' && t - G.D >= ch.duration + 0.5) { endSong(); }
    }
    if (G && G.chart && G.x) draw((G.paused ? G.pauseT : G.t) + G.drawOff, p);   // v0.6.1 calibration (v0.8.3: G.drawOff)
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
    var x = (ev.clientX - r.left) / (r.width / G.lanes), li = U.clamp(Math.floor(x), 0, G.lanes - 1), fr = x - li;
    var nb = fr < BRIDGE && li > 0 ? li - 1 : fr > 1 - BRIDGE && li < G.lanes - 1 ? li + 1 : -1;   // v1.0.1 smart bridge: the seam
    if (nb >= 0 && G.mode === 'play') {
      var at = tapTime(ev.timeStamp);
      if (G.ses.due(col(li), at) && G.ses.due(col(nb), at)) {
        var r1 = tap(col(li), ev.timeStamp, true), r2 = tap(col(nb), ev.timeStamp, 'bridge'); G.bridgeN = (G.bridgeN || 0) + 1;
        if (G.seat !== 'drums') G.ptr[ev.pointerId] = [press(col(li), r1), press(col(nb), r2)];   // v1.1: one finger holds both
        return;
      }
    }
    var r0 = tap(col(li), ev.timeStamp, true);
    if (G.seat !== 'drums') G.ptr[ev.pointerId] = [press(col(li), r0)];
  }
  function press(li, r) { return { li: li, n: r && r.note && (r.judgement || r.partial) && r.judgement !== 'miss' ? r.note : null }; }   // v1.1 review: what a lift lets go
  // v1.0.1 smart bridge: a touch within BRIDGE lane widths of a lane boundary (the middle third of the gap between the two
  // lane centres) hits BOTH lanes only when both have a note judge() would hit at this touch's time (ses.due: pure); else
  // only the nearer lane (as before). Each lane is a normal tap (judged, its drum booked per lane), so a bridge never adds
  // a stray. The second tap ('bridge') skips the dispatch sample (one touch, one sample). Keys never bridge.
  var BRIDGE = 1 / 6;
  // v1.5 (K4): Classic timing subtracts the tap source's own audio offset ('key' -> the key click test, else touch's);
  // Drum sync subtracts nothing (keys line up through drawOff: the song input's light check). Same 1000 ms stamp rule.
  function tapTime(stamp, src) {
    var now = performance.now(), s0 = stamp > 0 && Math.abs(stamp - now) < 1000 ? stamp : now, o = src === 'key' ? G.offK : G.offT;
    return heardAt(s0) - G.zero - (G.sync ? 0 : o ? o.audio : 0);
  }

  /* ---- v1.5 "Desktop": gig keys (plan_contract_1.5 §4.3) ---------------------------------------------------- */
  // Resolve (GG.prefs.keyLane): a bound code -> its lane on this rig ({ lane: -1 } off the rig: swallowed); a code-less event
  // -> the v1.4 table (a column, mirrored for lefty); J K L G H while unbound -> the v1.4 columns; anything else is native.
  // A key id is ev.code (code-less: GG.prefs.codeOf(key)), so 'A' down / 'a' up is one press. G.down = the trusted ids
  // down now; G.keyDown[id] = { lane, hold } for a string press (what its keyup lifts).
  var CARD_ARM = 600, CTRL_BLOCK = { KeyS: 1, KeyD: 1, KeyF: 1, KeyP: 1 };
  // navigator.keyboard.getLayoutMap() names the keycaps (AZERTY: A is Q): GG.input asks (at boot on a computer) and emits
  // 'input:layoutmap' when it lands (v1.5 review: the setlist legend + Settings > Keys re-render on it)
  function askLayoutMap() { if (GG.input && GG.input.askLayoutMap) GG.input.askLayoutMap(); }
  // A keycap's text: the layout map > what this session saw the key print (GG.input.learned) > the code (5h uses it too).
  // Both Shifts (Ctrl, Alt) bound: 'L Shift' / 'R Shift' (v1.5 review: P.keySides).
  ui.keyLabel = function (code) {
    askLayoutMap();
    var I = GG.input;
    return P.keyLabel(code, I && I.layoutMap ? I.layoutMap() : null, I && I.learned ? I.learned() : null, P.keySides(P.get(), code));
  };
  function kcap(text) { return el('span.kcap', text); }
  ui.kcap = kcap;
  function keyUI() { return !!(GG.input && GG.input.showKeyUI && GG.input.showKeyUI()); }
  function wideNow() { return !!(ui.wide && ui.wide()); }
  function setLive(on) { if (GG.input && GG.input.gigLive) GG.input.gigLive(!!on); }
  function blurFocus() { var a = document.activeElement; if (a && a !== document.body && a.blur) { try { a.blur(); } catch (e) { /* ignore */ } } }
  function liveMode() { return G.mode === 'play' || G.mode === 'count' || G.mode === 'hold'; }
  function keyId(ev) { return ev.code || P.codeOf(ev.key) || ''; }
  function stampOf(ev) { var now = performance.now(), t = ev.timeStamp; return t > 0 && Math.abs(t - now) < 1000 ? t : now; }
  function typingIn(t) { return ui.isTyping ? ui.isTyping(t) : !!(t && t.nodeType === 1 && /^(INPUT|TEXTAREA|SELECT)$/.test(t.nodeName)); }   // v1.5 review: ui.isTyping's rule
  function confirmKey(ev, id) { return ev.key === 'Enter' || ev.key === ' ' || id === 'Space' || id === 'Enter' || id === 'NumpadEnter'; }
  function lanesNow() { return G.chart ? Math.max(G.chart.lanes || 4, 1) : G.lanes; }
  // Frozen at count-in (like drawOff): the song's input, its timing and the key map; keycaps when it is played on keys.
  function freezeKeys() {
    var I = GG.input;
    G.kind = P.keyKind(G.seat);
    G.kmS = { keymap: G.pf.keymap };
    G.keymap = P.keysFor(G.kmS, G.kind, lanesNow());
    G.input = I && I.mode ? I.mode() : 'touch';
    G.off = G.input === 'keys' ? G.offK : G.offT;
    G.visM = !!G.off.visM;
    G.caps = G.input === 'keys';
    G.capL = G.caps ? G.keymap.map(function (c) { return ui.keyLabel(c); }) : null;
  }
  function onKey(ev) {
    if (!G) return;
    var id = keyId(ev);
    if (G.paused) {   // (a) the pause card: Esc resumes; Enter too with nothing (or Resume) focused; the rest is native
      var a = document.activeElement, onResume = !a || a === document.body || (a.getAttribute && a.getAttribute('data-testid') === 'btn-gig-resume');
      if (ev.key === 'Escape' || (ev.key === 'Enter' && onResume)) {
        ev.preventDefault(); ev.stopPropagation();
        if (!ev.repeat && !G.waking) resume(false);
      }
      return;
    }
    if (!liveMode()) { cardKey(ev, id); return; }   // (b) cards, the setlist, results: native (+ the card arm)
    if (ev.isComposing || ev.keyCode === 229 || typingIn(ev.target)) return;   // (c)
    if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); if (!ev.repeat) pause(false); return; }
    if (ev.key === 'Tab') { ev.preventDefault(); return; }
    if (ev.ctrlKey || ev.metaKey || ev.altKey) {   // never a tap; no bookmark / save / find / print mid-song
      if ((ev.ctrlKey || ev.metaKey) && CTRL_BLOCK[id]) ev.preventDefault();
      if (ev.metaKey || ev.key === 'Meta') releaseAll();   // macOS drops the keyups of keys held under Cmd
      return;
    }
    var r = P.keyLane(G.kmS, G.kind, G.lanes, ev.code, ev.key);   // (d)
    if (!r) return;
    ev.preventDefault();
    if (ev.repeat) return;
    if (G.down[id]) { G.lostKeyups++; liftKey(id, ev.timeStamp); }   // still down = its keyup was lost: lift it first
    if (ev.isTrusted) G.down[id] = 1;   // (synthetic events never wait for a keyup)
    if (r.lane === -1) { G.keySwallowed++; return; }   // bound in this map, not on this rig (Space on a 4-string bass)
    var li = r.lane != null ? r.lane : col(r.col);
    G.keyLast = { code: ev.code || '', key: ev.key, lane: li, col: col(li), at: Math.round(stampOf(ev)) };
    if (G.mode === 'hold' || !G.chart) return;   // the count-in waits for the audio clock: nothing to judge on yet
    G.keyUsed = true; G.keyTaps++;
    wake();
    var res = tap(li, ev.timeStamp, 'key');
    if (strings()) G.keyDown[id] = { lane: li, hold: press(li, res) };
  }
  // Keyups are never gated on the mode or the pause: an id always leaves the down-set (no stuck lane).
  function onKeyUp(ev) {
    if (!G) return;
    var id = keyId(ev);
    if (!G.paused && !liveMode()) cardKeyUp(ev, id);
    if (!id) return;
    delete G.down[id];
    if (G.keyDown[id]) liftKey(id, ev.timeStamp);
    // Space never reaches a button mid-song (on the pause card it presses the focused one)
    if (!G.paused && liveMode() && !ev.ctrlKey && !ev.metaKey && !ev.altKey && P.keyLane(G.kmS, G.kind, G.lanes, ev.code, ev.key)) ev.preventDefault();
  }
  // A string press lets go: its hold ends at the stamp, unless another key id still down holds the same lane (it takes over).
  function liftKey(id, stamp) {
    var e = G.keyDown[id]; if (!e) return;
    delete G.keyDown[id];
    for (var o in G.keyDown) if (G.keyDown[o].lane === e.lane) { if (!G.keyDown[o].hold || !G.keyDown[o].hold.n) G.keyDown[o].hold = e.hold; return; }
    if (strings() && G.ses && G.chart && (G.mode === 'play' || G.mode === 'count')) lift(e.hold, tapTime(stamp, 'key'));
  }
  // Every key-held lane lets go now; the down-set and G.keyDown clear (pause, count-in, song end, teardown, blur, Meta).
  function releaseAll(noLift) {
    if (!G) return;
    if (!noLift) { var p = performance.now(); for (var id in G.keyDown) liftKey(id, p); }
    G.keyDown = {}; G.down = {};
  }
  // Focus left the window mid-song (alt-tab, a click elsewhere, the Sticky Keys box): let go of everything; a song played on
  // keys (or with a key tapped) pauses frozen mid-riff. Only a hidden page restarts it (onVisibility).
  function onBlur() {
    if (!G) return;
    var was = liveMode() && !G.paused;
    releaseAll();
    if (was && (G.input === 'keys' || G.keyUsed)) pause(false);
  }
  // The between card / results take Enter / Space only from a fresh press CARD_ARM ms after they show; a press that began
  // earlier (a Space mashed past the song's end) is swallowed down and up. Playing on keys (or gg-kbnav): the card's button
  // takes focus at the arm.
  function armCard(testid) {
    if (!G) return;
    G.cardAt = performance.now(); G.cardArm = G.cardAt + CARD_ARM; G.cardOk = {};
    clearTimeout(G.cardT);
    G.cardT = setTimeout(function () {
      if (!G || !G.cardAt) return;
      var I = GG.input, keys = (G.input || (I && I.mode ? I.mode() : 'touch')) === 'keys' || document.documentElement.classList.contains('gg-kbnav');
      if (!keys) return;
      var b = document.querySelector('[data-testid="' + testid + '"]');
      if (b && !b.disabled && b.getClientRects().length) { try { b.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
    }, CARD_ARM);
  }
  function disarmCard() { if (G) { G.cardAt = 0; G.cardOk = {}; clearTimeout(G.cardT); } }
  function cardKey(ev, id) {
    if (!G.cardAt || !confirmKey(ev, id)) return;
    if (ev.repeat || stampOf(ev) < G.cardArm) { ev.preventDefault(); ev.stopPropagation(); delete G.cardOk[id]; G.cardRej++; return; }
    G.cardOk[id] = 1;
  }
  function cardKeyUp(ev, id) {
    if (!G.cardAt || !confirmKey(ev, id)) return;
    if (G.cardOk[id]) { delete G.cardOk[id]; return; }
    ev.preventDefault(); ev.stopPropagation(); G.cardRej++;   // its keydown came before the arm (or during the song)
  }

  function tap(li, stamp, touch) {
    var now = performance.now(), ok = stamp > 0 && Math.abs(stamp - now) < 1000, r;   // some browsers stamp events on another time base: trust it only if it's recent
    if (ok && (touch === true || touch === 'key') && G.sync && G.mode === 'play') { G.disp.push((now - stamp) / 1000); if (G.disp.length > 256) G.disp.shift(); }   // v0.8.3 dispatch (v1.5 D4: + key taps)
    var at = tapTime(stamp, touch === 'key' ? 'key' : 'touch');   // v0.6.1: calibration (classic only, v0.8.3); v1.0.1: shared with the smart bridge
    G.press[li] = now;
    if (at < -0.4) { playTap(li, at, null); stageCall('hit', laneName(li), 'good'); return null; }   // noodling during the count-in
    r = G.lastTap = G.ses.judge(li, at);   // judged first (synchronous, well under a ms) so an echo can stay quiet
    if (r) { r.at = at; r.disp = ok ? now - stamp : null; }
    if (r && r.echo && !(r.dbl && r.dbl.d2 === 2)) return r;   // v0.7.2: an echo tap IS the double's (scheduled) 2nd kick: no flam
    var due = playTap(li, at, r && r.echo ? null : r);   // (a dropped 2nd kick's echo sounds at its own time, no snap)
    if (r && r.note && r.note.dbl) {   // the second kick follows this kick's sound (band time) by the chart's spacing
      if (G.sync) { r.note.k1 = due; r.note.sp = Math.max(r.note.t2 - r.note.t, DBL_MIN); }
      else { var h1 = r.note.hitT != null ? r.note.hitT : at; r.note.k1 = songTime(performance.now()) + G.lat + HIT_LEAD; r.note.sp = Math.max(r.note.t2 - h1, DBL_MIN); }   // classic: as 0.8.2
    }
    return r;
  }
  // v1.2 "Soundcheck" (Lane F, handoff F5): every tap's velocity from how well and where you hit (A.tapVel: judgement x the
  // judged note's 16th x the hands of a fast hat run, +- 0.03); strays take the last note's step; count-in noodling 'count';
  // the first lane of a chord (partial) plays it as a Good. The game's own strokes (count-in hats, auto notes, Auto-kick, a
  // double's 2nd kick) take A.TAP_AUTO. -> { vel } | undefined (Classic on / no feel module: the 1.1 call, no o).
  function velOn() { var A = GG.audio; return !!(A && A.tapVel && A.TAP_AUTO && !(A.isClassic && A.isClassic())); }
  function tapVel(li, J, r) {
    if (!velOn()) return undefined;
    var n = r && r.note && !r.echo ? r.note : null, j = J < -0.4 ? 'count' : r && r.judgement && r.judgement !== 'miss' ? r.judgement : r && r.partial ? 'good' : null;
    if (n && n.step != null) G.velStep = n.step;
    var lane = strings() ? 'str' : C.LANES[li], prev = null;
    if (lane === 'hat') {
      prev = G.hatT != null ? G.hatT : null;
      G.hatRun = prev != null && J - prev >= 0 && J - prev < 0.15 ? (G.hatRun || 0) + 1 : 0;
      G.hatT = J;
    }
    var v = GG.audio.tapVel({ judgement: j, step: n && n.step != null ? n.step : G.velStep, lane: lane, prevHatT: prev, t: J, run: lane === 'hat' ? G.hatRun : null });
    if (v == null || !isFinite(v)) return undefined;
    G.velN = (G.velN || 0) + 1; G.velLast = { li: li, lane: lane, judgement: j, step: n && n.step != null ? n.step : G.velStep == null ? null : G.velStep, vel: v };
    return { vel: v };
  }
  function autoVel(kind) {
    if (!velOn()) return undefined;
    var T = GG.audio.TAP_AUTO, v = T[kind] != null ? T[kind] : T.other;
    G.autoVelN = (G.autoVelN || 0) + 1;
    return { vel: v };
  }
  // v0.8.3: plays a tap's drum and returns the band time it sounds at. Drum sync books it on the band's clock (snapped to
  // its note inside [-15, +15] ms), never before the lane's last booked tap (A.hit's choke expects time order); classic
  // (or a clock that isn't running) plays it 'now'.
  function playTap(li, J, r) {
    if (G.seat !== 'drums') return playSeat(li, J, r);   // v1.1
    var lane = C.LANES[li], c = G.actx;
    if (!GG.audio || !GG.audio.hit) return J;
    var vo = tapVel(li, J, r);   // v1.2 (F5): judged first, so the accent costs no latency
    if (!G.sync || !G.clockOk || !c || c.state !== 'running') {
      GG.audio.hit(lane, undefined, vo); if (r) r.snap = false;
      return c ? c.currentTime + HIT_LEAD - G.zeroBand : J;
    }
    var hit = !!(r && r.note && r.judgement && r.judgement !== 'miss');
    var Jp = GG.prefs.syncSnap(J, hit ? r.note.t : null, hit);
    var when = Math.max(GG.prefs.syncWhen(Jp, G.zeroBand, c.currentTime), G.lastBook[li] + 0.001);
    G.lastBook[li] = when;
    GG.audio.hit(lane, when, vo);
    if (Jp !== J) G.snapN++;
    if (r) { r.snap = Jp !== J; r.due = when - G.zeroBand; }
    return when - G.zeroBand;
  }

  // v1.1: a string seat's tap plays your note (a stray: the lane's last pitch) on the same drum-sync booking; a hold keeps its
  // handle for the lift, a run starts booking its notes while held. v1.1 review: a 2-lane chord is ONE sound, the root with
  // its power voicing (the fifth is in it): the first lane's tap plays it and stashes the handle on the note (n.sh), the
  // completing tap plays nothing new, and the hold is kept under the session's hold lane (n.li) whichever lane came last.
  // A tap in a lane whose old hold the session has just ended (judge) only lets that old voice go (never the new hold).
  function playSeat(li, J, r) {
    var c = G.actx, n = r && r.note ? r.note : null, hit = !!(n && r.judgement && r.judgement !== 'miss'), when, Jp = J, out, h;
    if (G.held[li] && G.held[li].n !== n) dropVoice(li, J);
    if (!G.sync || !G.clockOk || !c || c.state !== 'running') { when = undefined; out = c ? c.currentTime + HIT_LEAD - G.zeroBand : J; if (r) r.snap = false; }
    else {
      Jp = GG.prefs.syncSnap(J, hit ? n.t : null, hit);
      when = Math.max(GG.prefs.syncWhen(Jp, G.zeroBand, c.currentTime), G.lastBook[li] + 0.001);
      G.lastBook[li] = when;
      if (Jp !== J) G.snapN++;
      if (r) { r.snap = Jp !== J; r.due = when - G.zeroBand; }
      out = when - G.zeroBand;
    }
    var vo = tapVel(li, J, r);   // v1.2 (F5)
    if (n && n.chord && (hit || r.partial)) h = n.sh || (n.sh = seatSound(n, n.li, when, vo));
    else h = seatSound(n && hit ? n : null, li, when, vo);
    if (hit && n.hold) {
      if (G.held[n.li] && G.held[n.li].n !== n) dropVoice(n.li, J);
      G.held[n.li] = { h: h, n: n };
      if (n.run && n.seq && n.seq.length) G.runs.push({ n: n, li: n.li, i: 0, vo: vo });
    }
    return out;
  }

  /* ---- Highway drawing ------------------------------------------------------------------------------------ */
  var W = 390, H = 280, DPR = 1, laneW = 97, hitY = 240, speed = 200;
  function onResize() { if (G && G.dom) { layout(); guard(); } }
  function layout() {
    var c = G.canvas; if (!c) return;
    G.lanes = G.chart ? Math.max(G.chart.lanes || 4, 1) : lanesOf(S());
    G.wideHw = wideNow();   // v1.5 PC layout (B): 5w sizes .gig-hw by data-lanes; wider gems, a translucent highway
    var hwEl = c.parentNode;
    if (hwEl && hwEl.dataset && hwEl.dataset.lanes !== String(G.lanes)) { hwEl.dataset.lanes = String(G.lanes); hwEl.style.setProperty('--lanes', String(G.lanes)); }
    var box = hwEl.getBoundingClientRect();
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(200, box.width); H = Math.max(160, box.height);
    c.width = Math.round(W * DPR); c.height = Math.round(H * DPR);
    G.rect = c.getBoundingClientRect();
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
    var g = x.createLinearGradient(0, 0, 0, H);
    if (G.wideHw) { g.addColorStop(0, 'rgba(10,14,24,.35)'); g.addColorStop(0.22, 'rgba(12,17,32,.86)'); g.addColorStop(1, 'rgba(18,26,44,.92)'); }   // v1.5 B: the stage shows through the top
    else { g.addColorStop(0, '#05070d'); g.addColorStop(0.35, '#0c1120'); g.addColorStop(1, '#121a2c'); }
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (var l = 0; l < G.lanes; l++) {
      var lx = col(l) * laneW, lc = laneColor(l);
      x.globalAlpha = l % 2 ? 0.05 : 0.025; x.fillStyle = '#ffffff'; x.fillRect(lx, 0, laneW, H);
      x.globalAlpha = 0.18; x.fillStyle = lc; x.fillRect(lx + laneW / 2 - 1, 0, 2, hitY);
      x.globalAlpha = 1; x.fillStyle = 'rgba(255,255,255,.08)'; if (lx) x.fillRect(lx, 0, 1, H);
      rr(x, lx + 5, H - ZONE - 4, laneW - 10, ZONE - 2, 12);
      x.fillStyle = '#0a0e18'; x.fill(); x.lineWidth = 2; x.strokeStyle = lc; x.globalAlpha = 0.85; x.stroke(); x.globalAlpha = 1;
      var L = strings() ? null : ui.LANES && ui.LANES[C.LANES[l]], cap = G.capL && G.capL[l];
      x.textAlign = 'center'; x.textBaseline = 'middle';
      if (strings()) {   // v1.1: string lanes run low -> high (a pitch dot that grows up the neck)
        if (cap) keycap(x, lx + laneW / 2, H - ZONE / 2 - 12, cap, lc);   // v1.5: the lane's key instead
        else { x.globalAlpha = 0.9; x.fillStyle = lc; x.beginPath(); x.arc(lx + laneW / 2, H - ZONE / 2 - 12, 5 + l, 0, 6.2832); x.fill(); x.globalAlpha = 1; }
        x.fillStyle = lc; x.font = '800 10px ' + FONT; x.fillText(l === 0 ? 'LOW' : l === G.lanes - 1 ? 'HIGH' : '·', lx + laneW / 2, H - 18);
      } else {
        if (cap) keycap(x, lx + laneW / 2, H - ZONE / 2 - 12, cap, lc);   // v1.5: the lane's key (G.caps: played on keys)
        else { x.font = '20px ' + FONT; x.fillText(L ? L.icon : '•', lx + laneW / 2, H - ZONE / 2 - 12); }
        x.font = '800 10px ' + FONT; x.fillStyle = lc; x.fillText((cap && L ? L.icon + ' ' : '') + (L ? L.name : C.LANES[l]).toUpperCase(), lx + laneW / 2, H - 18);
      }
    }
    x.fillStyle = 'rgba(255,255,255,.55)'; x.fillRect(0, hitY - 1, W, 2);
    var fade = x.createLinearGradient(0, 0, 0, 46); fade.addColorStop(0, 'rgba(5,7,13,1)'); fade.addColorStop(1, 'rgba(5,7,13,0)');
    G.fade = fade;
  }
  // v1.5: a lane's keycap in its zone (cached in the backdrop; built at count-in from the frozen map)
  function keycap(x, cx, cy, text, lc) {
    var big = G.wideHw, h = big ? 24 : 19;
    x.font = (big ? '800 13px ' : '800 11px ') + FONT;
    var w = Math.min(laneW - 12, Math.max(big ? 28 : 22, x.measureText(text).width + (big ? 16 : 12)));
    rr(x, cx - w / 2, cy - h / 2, w, h, 5);
    x.globalAlpha = 1; x.fillStyle = 'rgba(255,255,255,.12)'; x.fill(); x.lineWidth = 1.5; x.strokeStyle = lc; x.globalAlpha = 0.9; x.stroke();
    x.globalAlpha = 1; x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, cx, cy + 1);
  }
  function yOf(nt, t) { return hitY - (nt - t) * speed; }
  function draw(t, p) {
    var x = G.x, ch = G.chart, n = ch.notes, k, l, a, y;
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; if (G.wideHw) x.clearRect(0, 0, G.canvas.width, G.canvas.height); x.drawImage(G.bg, 0, 0);
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
    for (k = 0; k < ch.fills.length; k++) band(x, ch.fills[k], t, 'rgba(185,140,255,.13)', '#c9a4ff', ch.fills[k].shred ? 'SHRED · GO WILD' : 'FREESTYLE · GO WILD');
    for (k = 0; k < ch.solos.length; k++) band(x, ch.solos[k], t, 'rgba(87,199,122,.07)', '#6fe39a', G.seat === 'lead' ? 'SOLO · YOUR SPOTLIGHT' : 'SOLO · KEEP IT SIMPLE');
    if (G.seat !== 'drums') drawHeld(x, t);   // v1.1: the tails of the notes you are holding
    while (G.drawFrom < n.length && n[G.drawFrom].t < t - 0.4) G.drawFrom++;
    var gw = G.wideHw ? Math.min(laneW - 20, 100) : Math.min(laneW - 16, 70), gh = G.gemH, gr = gh / 2 - 1, au = ch.auto || [];
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
      if (nt.hold && nt.j === 0) tail(x, nt, nt.li, t, y, 0.55 * a);   // v1.1: a hold's tail (a run's has ticks)
      if (nt.chord && nt.j === 0 && nt.chord[1] < G.lanes) {   // v1.1: a 2-lane chord: both gems on a bar
        var cx2 = col(nt.chord[1]) * laneW + (laneW - gw) / 2;
        x.globalAlpha = 0.8 * a; x.fillStyle = '#ffffff'; x.fillRect(Math.min(gx, cx2) + gw / 2, y - 2, Math.abs(cx2 - gx), 4);
        x.globalAlpha = (nt.cl && nt.cl.indexOf(nt.chord[1]) >= 0 ? 0.35 : 1) * a; x.fillStyle = laneColor(nt.chord[1]); rr(x, cx2, y - gh / 2, gw, gh, gr); x.fill();
      }
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
    x.globalAlpha = 1;
    if (G.wideHw) { x.globalCompositeOperation = 'destination-out'; x.fillStyle = G.fade; x.fillRect(0, 0, W, 46); x.globalCompositeOperation = 'source-over'; }   // v1.5 B: fade to the stage
    else { x.fillStyle = G.fade; x.fillRect(0, 0, W, 46); }
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
  // v1.1: a hold's tail from its head (y) up to its end; ticks mark a run's notes. Held notes draw from the hit line.
  function tail(x, n, li, t, y, alpha) {
    var y1 = yOf(n.t + n.len, t), tx = col(li) * laneW + laneW / 2, w = n.run ? 12 : 10;
    if (y1 >= y) return;
    G.tailN = (G.tailN || 0) + 1;
    x.globalAlpha = alpha; x.fillStyle = laneColor(li);
    x.fillRect(tx - w / 2, Math.max(0, y1), w, y - Math.max(0, y1));
    if (n.run && n.seq) {
      x.fillStyle = '#ffffff';
      for (var q = 0; q < n.seq.length; q++) { var yy = yOf(n.t + n.seq[q][0], t); if (yy < y && yy > 0) x.fillRect(tx - w, yy - 1, w * 2, 2); }
    }
    x.globalAlpha = 1;
  }
  function drawHeld(x, t) {
    for (var l = 0; l < G.lanes; l++) {
      var n = G.ses && G.ses.holding ? G.ses.holding(l) : null;
      if (!n) continue;
      tail(x, n, l, t, hitY, 0.9);
      var a = 0.35 + 0.25 * Math.sin(t * 18);   // the zone glows while you hold
      x.globalAlpha = a; x.fillStyle = laneColor(l); rr(x, col(l) * laneW + 5, H - ZONE - 4, laneW - 10, ZONE - 2, 12); x.fill(); x.globalAlpha = 1;
    }
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
    var P = banterPool(st, m && m.id), silent = m && ui.isSilent(m.id, st);
    var pool = P.own && (silent || ui.rng.next() < 0.75) ? P.own : P.any;   // a silent member never says the shared lines
    if (silent && pool === P.any) { var t = ui.talkers(st); m = t.length ? t[Math.floor(ui.rng.next() * t.length)] : null; }
    return { who: m ? m.id : null, text: ui.line(pool, BANTER.any, st) };
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
        r.moments.length ? el('div.small.amber', r.moments.map(momentText).join(' · ')) : null
      ]) : null,
      b.who ? el('div.react', [ui.avatar(b.who, 'sm'), el('div.t', [el('b', ui.who(b.who).short + ': '), b.text])]) : el('p.small', b.text),
      next ? el('div.small.dim', 'Up next: “' + next.title + '”' + (next.classic ? ' (a classic)' : '')) : null,
      ui.btn('.btn.primary.block', { testid: 'btn-gig-next', onclick: function () { if (G && G.mode === 'between') nextSong(); } },
        pr ? (next ? 'Count me in' : 'Done practising') : studio ? (next ? 'Roll tape' : 'Keep this take') : next ? (i ? 'Next song' : 'Start the show') : 'See how it went')
    ]));
    d.mid.hidden = false;
    armCard('btn-gig-next');   // v1.5: Enter / Space from a fresh press 600 ms on (focused then, on keys)
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
    var st = S(), r = G.sim ? GG.gig.simFinish(G.ses, G.sim) : G.ses.finish(), before = st.venueRep ? st.venueRep[r.venueId] : undefined;   // v1.3.1
    stopAudio();
    G.mode = 'results';
    try { (G.opts.apply || defaultApply)(st, r); } catch (e) { console.error('[gig] applying the result failed', e); }
    if (r.rep == null && st.venueRep && st.venueRep[r.venueId] != null) { r.repNow = st.venueRep[r.venueId]; r.repBefore = before; }
    G.result = r;
    if (GG.main && GG.main.sync) GG.main.sync();
    sfx(/[SAB]/.test(r.grade) ? 'cheer' : r.grade === 'D' ? 'boo' : 'tap');
    ui.show('gig-results', { result: r });
    armCard('btn-gig-done');   // v1.5
  }
  var HEADLINE = { S: 'Legendary.', A: 'Crushed it.', B: 'Solid set.', C: 'You survived.', D: 'Rough night.' };
  function repText(r) {
    var d = r.rep != null ? r.rep : r.repNow != null && r.repBefore != null ? r.repNow - r.repBefore : null;
    if (r.banned) return 'Banned. Your photo is going on the wall.';
    if (d == null) return r.repNow != null ? 'Venue rep: ' + U.signed(r.repNow) : null;
    return d > 0 ? 'Venue rep ▲ ' + d + ': they want you back.' : d < 0 ? 'Venue rep ▼ ' + (-d) + ': the owner is not returning calls.' : 'Venue rep unchanged.';
  }
  // v1.4 review fix: the parts of a gig's fund change beyond Pay - cut - gas, each { label, v } (v signed $): the fill-in's
  // fee, management + booking (signed era), crew (theatres), the tow, merch, and any rest as "other" (so it always adds up).
  ui.gigFundParts = function (r) {
    var out = [], net = r && r.deltas ? r.deltas.fund || 0 : 0, tow = r && r.travel && r.travel.breakdown ? r.travel.breakdown.cost || 0 : 0;
    if (!r) return out;
    if (r.fillInCost) out.push({ label: 'fill-in', v: -r.fillInCost });
    if (r.commission) out.push({ label: 'management ' + Math.round(r.commission / Math.max(1, r.pay) * 100) + '%', v: -r.commission });
    if (r.crew) out.push({ label: 'crew', v: -r.crew });
    if (tow) out.push({ label: 'tow', v: -tow });
    if (r.merch && r.merch.earned) out.push({ label: 'merch', v: r.merch.earned });
    var rest = Math.round(net - ((r.pay || 0) - (r.cut || 0) - (r.gas || 0)) - out.reduce(function (a, p) { return a + p.v; }, 0));
    if (rest) out.push({ label: 'other', v: rest });
    return out;
  };
  ui.define('gig-results', {
    kind: 'full', cls: 'gigres', sticky: true, focus: false,   // v1.5: 55 owns focus here (btn-gig-done after the 600 ms arm)
    build: function (s, d) {
      var r = d.result, pay = r.deal === 'exposure' && !r.pay ? 'Exposure' : U.fmtMoney(r.pay || 0), rep = repText(r);
      var moments = (r.moments || []).filter(function (k) { return k !== 'solo'; }).length;
      // v1.5 PC layout (B): two columns (the grade + money | the songs + lines); the phone keeps one body (A === B === s.body)
      var cols = w2(s), A = cols[0], B = cols[1];
      A.appendChild(el('div.gigres-head', [
        el('div.grade.big.' + r.grade, { testid: 'gig-grade' }, r.grade),
        el('div.grow', [el('div.caps', r.name + ' · ' + r.city), el('h1.display', HEADLINE[r.grade] || ''),
          el('div.small.dim', 'Score ' + r.score + ' · ' + Math.round((r.accuracy || 0) * 100) + '% of notes hit · best combo ' + (r.maxCombo || 0)
            + ' · ' + moments + (moments === 1 ? ' moment' : ' moments'))])
      ]));
      if (r.simulated) A.appendChild(el('p.small.dim', { testid: 'gig-simulated', style: 'margin:2px 0 6px' }, simDone(r)));   // v1.3.1
      // v1.4 (M1): the money row says where the pay goes: Pay (gross, a great show's bonus included) - the band's cut (the
      // members' share, GG.drama.split) - gas, then "Into the fund" (r.deltas.fund) with every other part of it named next
      // to it (review fix: fill-in fee, management, crew, tow, merch; anything left over as "other"), so the row adds up.
      var minus = function (x) { return x ? '−' + U.fmtMoney(x).replace('−', '') : '$0'; }, gm = GG.gig.gradePayMult ? GG.gig.gradePayMult(S(), r.grade) : 1;
      A.appendChild(el('div.stat-grid', [
        el('div', [el('span.caps', 'Pay'), el('b', { testid: 'gig-pay' }, pay)]),
        el('div', [el('span.caps', 'Band\'s cut'), el('b', { testid: 'gig-cut' }, minus(r.cut || 0))]),
        el('div', [el('span.caps', 'Gas'), el('b', minus(r.gas || 0))]),
        el('div', [el('span.caps', 'Crowd'), el('b', r.crowd + '/' + r.capacity)]),
        el('div', [el('span.caps', 'Fans'), el('b.good', U.signed(r.fans || 0))]),
        el('div', [el('span.caps', 'Buzz'), el('b', U.signed(r.buzz || 0))])
      ]));
      var net = r.deltas ? r.deltas.fund || 0 : null;
      if (net != null) {
        var parts = ui.gigFundParts(r), signedM = function (x) { return (x > 0 ? '+' : '−') + U.fmtMoney(Math.abs(x)); };
        A.appendChild(el('p.small', { testid: 'gig-net', style: 'margin:0 0 6px' }, [el('b', 'Into the fund: ' + (net > 0 ? '+' : '') + U.fmtMoney(net))]
          .concat(parts.map(function (p) { return el('span', { testid: 'gig-net-part', data: { v: String(p.v) } }, ' · ' + p.label + ' ' + signedM(p.v)); }))
          .concat([el('span.dim', (r.cut ? ' · the band takes ' + Math.round(r.cut / Math.max(1, r.pay) * 100) + '% of the pay' : '')
            + ((r.pay || 0) - (r.prize || 0) > 0 && gm > 1 ? ' · a great show paid ' + Math.round((gm - 1) * 100) + '% more' : ''))])));
      }
      if (rep) A.appendChild(el('p.small.amber', { testid: 'gig-rep' }, rep));
      B.appendChild(el('div.gigres-songs', (r.songResults || []).map(function (x, i) {
        return el('div.gigres-song', [el('span.n', String(i + 1)), el('div.grow', [el('b', x.title),
          el('div.tiny.dim', x.perfect + ' perfect · ' + x.good + ' good · ' + x.miss + ' missed · combo ' + x.maxCombo
            + (x.fills ? ' · ' + x.fills + ' fill taps' : '') + (x.holds ? ' · ' + (x.rings || 0) + ' of ' + x.holds + ' holds rang out' : ''))]),
          el('div.acc', Math.round(x.accuracy * 100) + '%')]);
      })));
      (r.lines || []).forEach(function (t) {   // v0.9: a line about another band's people is dropped (the leak net, 50_ui_core)
        var tx = r.merch && ui.isMerchLine && ui.isMerchLine(t) ? null : ui.safeLine(t, null, S());
        if (tx) B.appendChild(el('p.small', { style: 'margin:6px 0' }, tx));
      });
      if (r.merch && ui.merchResult) B.appendChild(ui.merchResult(r.merch));   // v0.8: the merch table
      (r.classics || []).forEach(function (id) {
        var song = GG.songs.byId(S(), id);
        if (song) B.appendChild(el('p.small.amber', '🏆 “' + song.title + '” is a classic now. The crowd will want it every night.'));
      });
      (r.reactions || []).forEach(function (x) {
        var who = ui.who(x.who);
        B.appendChild(el('div.react', [ui.avatar(who, 'sm'), el('div.t', [el('b', who.short + ': '), fill(x.text)])]));
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

  // v1.5 PC layout (B): a sheet / full body in two columns (.w2 > .w2-a + .w2-b; 5w styles them under html.gg-wide). The phone
  // layout never gets the wrappers: both columns are the body itself, so its DOM is v1.4's.
  function w2(s) {
    if (!wideNow()) return [s.body, s.body];
    var a = el('div.w2-a'), b = el('div.w2-b');
    s.body.appendChild(el('div.w2', [a, b]));
    return [a, b];
  }

  /* ---- The show screen ------------------------------------------------------------------------------------ */
  ui.define('gig', {
    kind: 'full', cls: 'gig', sticky: true, live3d: true, focus: false,   // v1.5: 55 owns focus on the show (cards: armCard)
    build: function (s) {
      if (!G) return;
      var g = G.gig, d = G.dom = {};
      // v1.5: no context menu anywhere on the show while it runs (a right-click loses a keyup); v1.5 review: only on keys or a
      // computer (a touch phone keeps v1.4's long-press: only the highway canvas blocks it, below)
      s.root.addEventListener('contextmenu', function (e) { if (G && (G.input === 'keys' || (GG.input && GG.input.desk && GG.input.desk()))) e.preventDefault(); });
      s.root.classList.toggle('studio', !!G.opts.studio);   // v0.5: studio take (no crowd)
      var lineupN = (GG.drama && GG.drama.lineup ? GG.drama.lineup(S()) : ui.active(S())).length;   // v0.9: one silhouette per bandmate
      d.back = el('div.gig-back', { data: { level: 'warm', n: String(lineupN) } }, [el('div.lights'),
        el('div.band', { testid: 'gig-back-band' }, Array.apply(null, Array(Math.max(1, Math.min(6, lineupN)))).map(function () { return el('i'); })),
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
    var x = G.x; x.setTransform(1, 0, 0, 1, 0, 0); if (G.wideHw) x.clearRect(0, 0, G.canvas.width, G.canvas.height); x.drawImage(G.bg, 0, 0);
  }
  // v1.5: redraw a highway that isn't animating (a paused song or a card, after a re-layout)
  function still() { if (!G || !G.x || !G.bg) return; if (G.chart && G.fonts) draw((G.paused ? G.pauseT : G.t) + G.drawOff, performance.now()); else drawIdle(); }
  // v1.5: "Esc pause" by the highway, in the PC layout when the song is played on keys (5w places it)
  function gigHint() {
    if (!G || !G.dom) return;
    var on = !!(G.caps && wideNow() && G.chart), h = G.dom.hint;
    if (on && !h) h = G.dom.hint = el('div.gig-hint', { testid: 'gig-hint' }, [kcap('Esc'), ' pause']);
    if (on && h && !h.parentNode && G.dom.hw.parentNode) G.dom.hw.parentNode.insertBefore(h, G.dom.hw.nextSibling);
    else if (!on && h && h.parentNode) h.parentNode.removeChild(h);
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
      var cols = w2(s), A = cols[0], B = cols[1];   // v1.5 PC layout (B): the night + options | the setlist (phone: both = the body)
      A.appendChild(el('div.panel.warm.small', [el('div', [el('b', (G.attendance || '?') + ' expected'), ' · holds ' + g.capacity + ' · ' + deal]),
        g.quirk || v.quirk ? el('div.dim', fill(g.quirk || v.quirk)) : null]));
      var cur = difficulty(), pf = prefs();
      A.appendChild(el('div.caps', { style: 'margin-top:10px' }, 'Difficulty'));
      A.appendChild(el('div.row.gig-diff', { style: 'margin-top:4px' }, ['easy', 'normal', 'hard', 'expert'].map(function (d) {
        return ui.btn('.btn.small.grow' + (d === cur ? '.primary' : ''), { testid: 'gig-diff-' + d, style: 'padding:0 6px', onclick: function () {
          GG.save.saveSettings({ gigDifficulty: d }); s.rerender(); } }, d.charAt(0).toUpperCase() + d.slice(1));
      })));
      A.appendChild(el('div.tiny.dim', { style: 'margin-top:4px' }, cur === 'easy'
        ? 'Easy: the main hits only, a big timing window, slower scroll.' : cur === 'normal'
        ? 'Normal: most of what you wrote, no impossible bursts.' : cur === 'hard' ? 'Hard: every hit exactly as written, tight timing.'
        : fill('Expert: every hit as written, a razor-thin window, and misses sting. {deadpan} nods, once.')));
      if (GG.prefs) {   // v0.6.1: the calibration profile quick switch + what's on
        A.appendChild(el('div.row.gig-prof', { style: 'margin-top:8px' }, [['speaker', '🔊 Phone speaker'], ['headphones', '🎧 Headphones']].map(function (x) {
          return ui.btn('.btn.small.grow' + (pf.audioProfile === x[0] ? '.primary' : ''), { testid: 'gig-profile-' + x[0], 'aria-pressed': pf.audioProfile === x[0] ? 'true' : 'false',
            onclick: function () { GG.prefs.setProfile(x[0]); s.rerender(); } }, x[1]);
        })));
        var on = [pf.noFail ? 'No-fail' : null, pf.autoKick && seatOf(st) === 'drums' ? 'Auto-kick' : null, pf.noteSpeed !== 1 ? 'Note speed ×' + pf.noteSpeed : null, pf.lefty ? 'Lefty' : null].filter(Boolean);
        A.appendChild(ui.btn('.btn.ghost.small.block', { testid: 'btn-gig-settings', style: 'margin-top:6px', onclick: function () { ui.show('settings', { tab: 'play' }); } },
          '⚙ ' + (on.length ? on.join(' · ') : 'Assists, note speed, calibration')));
      }
      if (keyUI()) A.appendChild(keysLegend(st, pf));   // v1.5: your keys (a computer, the PC layout, or a key pressed)
      var bo = GG.gig.setlistBonuses(st, ids);
      B.appendChild(el('div.caps', { style: 'margin:12px 0 6px' }, 'Setlist · ' + ids.length + ' of ' + size + ' songs'));
      var slots = el('div.set-slots', { testid: 'set-slots' });
      for (var k = 0; k < size; k++) slots.appendChild(slotRow(s, k, size, ids, bo));
      B.appendChild(slots);
      B.appendChild(el('div.caps', { style: 'margin:14px 0 4px' }, 'Your songs · tap to add or drop'));
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
      B.appendChild(list);
      // v1.3.1: [Auto-pick] [⏩ Simulate this gig] + what it plays at, then the big "Start the show" (the w1 lesson points at it).
      // A story show (or the lesson's first gig) keeps a dim note in the Simulate slot instead.
      var why = GG.gig.simReason ? GG.gig.simReason(st, g) : 'phase', bot = why ? null : GG.gig.simBot(st, cur);
      s.foot.appendChild(el('div', { style: 'flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:8px' }, [
        el('div.row', [
          ui.btn('.btn.small', { testid: 'btn-gig-auto', style: 'white-space:nowrap', onclick: function () { G.pick = GG.gig.defaultSetlist(st, g); s.rerender(); } }, 'Auto-pick'),
          bot ? ui.btn('.btn.small.grow', { testid: 'btn-gig-sim', disabled: !ids.length, 'aria-label': 'Simulate this gig', onclick: simulateShow }, '⏩ Simulate this gig')
            : el('div.tiny.dim.grow', { testid: 'gig-sim-no' }, SIM_NO[why] || SIM_NO.phase)]),
        bot ? el('div.tiny.dim', { testid: 'gig-sim-why' }, simWhy(bot, true)) : null,
        ui.btn('.btn.primary.big.block', { testid: 'btn-gig-start', disabled: !ids.length, onclick: function () {
          if (!G || !G.pick.length || G.ses) return;
          closeOverShow();
          startSession(G.pick.slice());
          nextSong();
        } }, 'Start the show')]));
    }
  });
  // v1.5: the setlist's key legend: each lane's dot + keycap + name, left to right as the highway draws them, "Esc pauses",
  // and a way to Settings > Keys. Drums: your kit's lanes; bass / rhythm / lead: your rig's strings.
  function keysLegend(st, pf) {
    var seat = seatOf(st), kind = P.keyKind(seat), n = lanesOf(st), codes = P.keysFor(pf, kind, n), lefty = !!pf.lefty, items = [];
    var strc = pf.colourblind ? STR_CB : STR_COLORS;
    for (var c = 0; c < n; c++) {
      var l = lefty ? n - 1 - c : c, name, colr;
      if (kind === 'strings') { name = l === 0 ? 'Low' : l === n - 1 ? 'Top' : String(l + 1); colr = strc[l] || '#8899bb'; }
      else { var L = ui.LANES && ui.LANES[C.LANES[l]]; name = L ? L.name : C.LANES[l]; colr = pf.colourblind && P.CB_COLOURS[C.LANES[l]] ? P.CB_COLOURS[C.LANES[l]] : L ? L.color : '#8899bb'; }
      items.push(el('span.gk', [el('i.gk-dot', { style: { background: colr } }), kcap(ui.keyLabel(codes[l])), el('span', name)]));
    }
    return el('div.gig-keys', { testid: 'gig-keys' }, [
      el('div.caps', 'Your keys'),
      el('div.gk-row', items),
      el('div.row.gk-foot', [el('span.tiny.dim.grow', [kcap('Esc'), ' pauses the song']),
        ui.btn('.btn.ghost.small', { testid: 'gig-keys-change', onclick: function () { ui.show('settings', { tab: 'keys' }); } }, 'Change keys')])
    ]);
  }
  function closeOverShow() {
    ui.close('gig-set');
    for (var k = 0; k < 8 && ui.top() && ui.top() !== 'gig'; k++) ui.close(ui.top());   // nothing may sit over the show
  }

  /* ---- v1.3.1 Simulate: the real show played by a bot at your recent average (GG.gig.simSong per song) ------------ */
  // One tap, no confirm (D4): the sheet closes, the session starts on your pick, and each song is simulated on a timer
  // (ui.gigSimMs apart; the card reads "Simulating the show… song 2 of 4", the stage crowd follows), then the normal
  // results (+ a "Simulated" line) and the normal apply. state.liveGig.sim marks it, so a reload finishes it simulated.
  var SIM_NO = { showdown: 'Showdown night. This one you play.', rival: 'Showdown night. This one you play.',
    festival: 'A festival slot. This one you play.', lesson: 'Play your first one. The band insists.', phase: 'This one you play.', gig: 'This one you play.' };
  ui.gigSimMs = ui.gigSimMs != null ? ui.gigSimMs : 350;
  function pct(x) { return Math.round((x || 0) * 100); }
  // The sheet's line says what it uses and what you get (long); the progress card keeps the short form.
  function simWhy(bot, long) {
    if (!long) return bot.from === 'own' ? 'Plays it at your recent level: ~' + pct(bot.acc) + '% hits' : 'Plays it at the band’s level: ~' + pct(bot.acc) + '% hits';
    var min = C.SIM_MIN_PLAYED || 2;
    return (bot.from === 'own' ? 'Plays it at your recent level: ~' + pct(bot.acc) + '% hits (last ' + bot.n + ' gigs).'
      : 'Plays it at the band’s level: ~' + pct(bot.acc) + '% hits, until you’ve played ' + min + ' gigs yourself.') + ' Pay, fans and buzz count as usual.';
  }
  function simDone(r) {
    var m = r.sim || {};
    return m.from === 'own' ? '⏩ Simulated at your average (last ' + m.n + ' gigs, ' + pct(m.acc) + '% hit)'
      : '⏩ Simulated at the band’s level (play a couple to set your own)';
  }
  function simulateShow() {
    if (!G || !G.pick.length || G.ses || !GG.gig.canSimulate(S(), G.gig)) return;
    closeOverShow();
    startSession(G.pick.slice());
    G.sim = GG.gig.simBot(S(), G.ses.difficulty);
    startSim();
  }
  function startSim() {
    G.mode = 'sim';
    if (G.dom) G.dom.pauseBtn.hidden = true;   // nothing to pause
    showSim(null);
    G.autoT = setTimeout(simStep, ui.gigSimMs);
  }
  function simStep() {
    if (!G || G.mode !== 'sim') return;
    if (G.ses.done) { finishShow(); return; }
    var r = null;
    G.ses.emit = false;   // no per-note events ('gig:song' still fires: main saves between songs)
    try { r = GG.gig.simSong(G.ses, G.sim); } finally { if (G && G.ses) G.ses.emit = true; }
    if (!G) return;
    var ses = G.ses, d = G.dom;
    stageCall('setCrowdLevel', ses.crowd);
    if (d) { d.meter.style.width = Math.round(ses.crowd) + '%'; d.level.textContent = LEVEL_TEXT[ses.level] || ses.level; d.crowd.dataset.level = ses.level; d.back.dataset.level = ses.level; }
    G.crowdN = Math.round(ses.crowd);
    showSim(r);
    if (r) sfx(r.score >= 65 ? 'cheer' : r.score < 35 ? 'boo' : 'tap');
    G.autoT = setTimeout(simStep, ui.gigSimMs);
  }
  function showSim(r) {
    var d = G.dom; if (!d) return;
    var n = G.ses.setlist.length, i = G.ses.index;   // i = songs simulated so far
    ui.clear(d.mid);
    d.mid.appendChild(el('div.gig-mid-card', { testid: 'gig-sim-progress' }, [
      el('div.caps', '⏩ Simulated show'),
      el('b', i < n ? 'Simulating the show… song ' + (i + 1) + ' of ' + n : 'That’s the set. Counting the take…'),
      r ? el('div.small', '“' + r.title + '”: ' + pct(r.accuracy) + '% hit · ' + r.perfect + ' perfect / ' + r.good + ' good / ' + r.miss + ' missed') : null,
      el('div.tiny.dim', simWhy(G.sim))
    ]));
    d.mid.hidden = false;
  }
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
        if (n.t > t + 0.03) soon.push(n.dbl ? { li: n.li, t: n.t, t2: n.t2 } : n.hold || n.chord ? { li: n.li, t: n.t, len: n.len, hold: !!n.hold, chord: n.chord || null, run: !!n.run, midi: n.midi } : { li: n.li, t: n.t });
        if (!next && n.t > t + 0.35) next = n.dbl ? { lane: n.lane, li: n.li, t: n.t, t2: n.t2 } : { lane: n.lane, li: n.li, t: n.t };
      }
    }
    return { open: true, mode: G.mode, paused: G.paused, diff: G.diff, clockOk: G.clockOk, index: ses ? ses.index : null, songs: ses ? ses.setlist.length : null,
      songT: ch ? (G.paused ? G.pauseT : songTime(p)) : null, dur: ch ? ch.duration : null, auto: ch && ch.auto ? ch.auto.length : 0, autoPlayed: G.autoN || 0, autoSkipped: G.autoSkip || 0, doubles: ch ? ch.doubles || 0 : 0, doublesPlayed: G.dblN || 0, next: next, soon: soon, lanes: G.lanes, stage: !!G.stageOn, audio: !!G.handle,
      ctx: !!G.actx, lat: G.lat, combo: ses ? ses.combo : 0, crowd: ses ? Math.round(ses.crowd) : null, level: ses ? ses.level : null,
      stats: ses && ses.stats ? ses.stats() : null, last: G.lastTap ? { judgement: G.lastTap.judgement, at: G.lastTap.at, echo: !!G.lastTap.echo,
        offset: G.lastTap.offset, snap: G.lastTap.snap, due: G.lastTap.due, disp: G.lastTap.disp } : null,
      sync: G.sync, D: G.D, K: G.K, latD: G.latD, zeroBand: G.zeroBand, zero: G.zero, spb: ch ? ch.spb : null, vis: G.drawOff,   // v0.8.3 drum sync
      tBand: ch ? (G.paused ? G.pauseT : songTime(p)) - G.D : null, drawT: ch ? (G.paused ? G.pauseT : G.t) + G.drawOff : null,
      dispP90: G.dispP90 != null ? Math.round(G.dispP90 * 1000) : null, dispN: G.disp.length, snapN: G.snapN, bridgeN: G.bridgeN || 0, hats: G.hatN, hatSkip: G.hatSkip,
      akN: G.akN, akSkip: G.akSkip, waking: G.waking, result: G.result ? { grade: G.result.grade, score: G.result.score } : null,
      sim: G.sim ? { on: true, from: G.sim.from, n: G.sim.n, accuracy: G.sim.accuracy, jitterMs: G.sim.jitterMs, acc: G.sim.acc } : { on: false },   // v1.3.1
      seat: G.seat, holding: ses && ses.holding ? [0, 1, 2, 3, 4, 5].filter(function (l) { return !!ses.holding(l); }) : [],   // v1.1
      seatN: G.seatN, relN: G.relN, runN: G.runN, tailN: G.tailN || 0, holds: ch ? ch.holds || 0 : 0, chords: ch ? ch.chords || 0 : 0, runs: ch ? ch.runs || 0 : 0,
      feel: { velN: G.velN || 0, autoVelN: G.autoVelN || 0, last: G.velLast || null, warm: G.warm || null, gig: !!(G.handle && G.handle.plan && G.handle.plan.stats && G.handle.plan.stats.gig),
        plan: G.handle && G.handle.plan ? G.handle.plan.stats : null },   // v1.2 (Lane F)
      // v1.5 (Lane I): the gig keys as frozen at count-in, what is down now, the last key; the highway's geometry
      keys: { kind: G.kind || null, map: G.keymap || null, input: G.input, caps: !!G.caps, labels: G.capL || null, down: Object.keys(G.down),
        held: Object.keys(G.keyDown), last: G.keyLast }, keyTaps: G.keyTaps, keySwallowed: G.keySwallowed, lostKeyups: G.lostKeyups, cardRej: G.cardRej, cardAge: G.cardAt ? Math.round(performance.now() - G.cardAt) : null, restart: !!G.restart,
      off: G.off ? { audio: Math.round(G.off.audio * 1000), visual: Math.round(G.off.visual * 1000), visM: !!G.off.visM } : null, visM: !!G.visM,
      offT: G.offT ? Math.round(G.offT.audio * 1000) : null, offK: G.offK ? Math.round(G.offK.audio * 1000) : null,
      laneW: laneW, hitY: hitY, hwW: W, hwH: H, gemW: G.wideHw ? Math.min(laneW - 20, 100) : Math.min(laneW - 16, 70), look: LOOK, wide: !!G.wideHw };
  });
})(window.GG);
