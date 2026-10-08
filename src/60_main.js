// 60_main.js: boot, the live career (GG.state), routing by phase, the week flow, autosave, and the glue to
// render + audio. Screens call these; sims never do.
//   GG.main.newCareer({ slot, bandId, player, seed }) ; quickStart({ seed, slot, name, openCard }) ; load(slot)
//   loadState(state, { slot }) ; enterGarage() ; route() ; beginWeek() ; afterCard() ; wrapWeek() ; nextWeek()
//   saveTo(slot) ; quitToTitle() ; sync()
// URL: ?quick=1&seed=N skips the menus (tests/dev); v0.9: &band=<bandId> quick-starts that band (default Hail Damage).
// v1.1: &seat=bass|rhythm|lead quick-starts that seat (GG.main.newCareer / quickStart pass o.seat; default drums).
// v1.0: newCareer({ skipLessons }) sets state.tutorial.on (lessons: GG.lessons / GG.tutorial; off under automation unless ?tut=1).
(function (GG) {
  var M = GG.main = GG.main || {};
  var ui = GG.ui;
  M.booted = false; M.renderOk = false; M.lastSave = null;
  GG.state = GG.state || null;

  // Calls GG.render[fn] if it exists. Render bugs are logged as errors (tests catch them) but never stop the UI.
  function render(fn) {
    var R = GG.render;
    if (!M.renderOk || !R || typeof R[fn] !== 'function') return undefined;
    try { return R[fn].apply(R, Array.prototype.slice.call(arguments, 1)); }
    catch (e) { console.error('[main] render.' + fn + ' failed', e); return undefined; }
  }
  function fill(t) { return t && GG.state ? ui.fill(t, GG.state) : t; }
  function sfx(n) { if (GG.audio) GG.audio.sfx(n); }

  // Pause the 3D loop while a full screen hides it, while the tab is hidden, or when no career is loaded.
  // Full screens that show the scene through them (def.live3d: the van trip, the live gig) keep it drawing.
  function covered() {
    return ui.stackIds().some(function (id) { var e = ui.get(id); return e && e.def.kind === 'full' && !e.def.live3d; });
  }
  // v0.7.1: with no career loaded the title's 3D scene (the garage in a hailstorm) still draws.
  function updatePause() { render('setPaused', !!(document.hidden || covered() || (!GG.state && !ui.isOpen('title')))); }
  GG.on('screen:open', updatePause);
  GG.on('screen:close', updatePause);

  // Keep the garage framed in the band between the HUD and the topmost bottom sheet (render glides there).
  // Very tall sheets would squash the room, so the band never gets smaller than MIN_BAND px.
  var MIN_BAND = 150, insetRaf = 0, lastInsets = '';
  function updateInsets() {
    if (!M.renderOk || insetRaf) return;
    insetRaf = requestAnimationFrame(function () {
      insetRaf = 0;
      var H = window.innerHeight || 844, bar = document.querySelector('#hud .hud-bar');
      var top = bar && !bar.classList.contains('hidden') ? Math.round(bar.getBoundingClientRect().bottom) : 0;
      var sheets = document.querySelectorAll('#screens .sheet-layer:not(.hidden) .sheet'), sheet = sheets[sheets.length - 1];
      var ins = { top: top, bottom: sheet ? Math.min(sheet.offsetHeight, H - top - MIN_BAND) : -1 }, key = ins.top + ',' + ins.bottom;
      if (key !== lastInsets) { lastInsets = key; render('setViewInsets', ins); }
    });
  }
  GG.on('ui:stack', updateInsets);
  GG.on('ui:layout', updateInsets);
  // v1.5 (Lane W): the PC layout came or went (html.gg-wide): the sheets changed width / height, so measure again
  GG.on('ui:wide', function () { lastInsets = ''; updateInsets(); });

  // After any state change: 3D garage, HUD, dock.
  M.sync = function () {
    if (GG.state) render('syncState', GG.state);
    if (ui.refreshGarage) ui.refreshGarage();
  };
  function setState(st) {
    GG.state = st;
    render('setScene', st ? 'garage' : 'none');
    M.sync();
    updatePause();
  }

  /* ---- Saving ------------------------------------------------------------------------------------ */
  function write(slot, st) {
    try { return !!GG.save.write(String(slot), st); } catch (e) { console.warn('[main] save.write failed', e); return false; }
  }
  function autosave(st) {
    var ok = write('auto', st);
    if (st.slot && st.slot !== 'auto') ok = write(st.slot, st) && ok;
    M.lastSave = { ok: ok, at: Date.now(), totalWeek: st.totalWeek };
    if (!ok && GG.save.storageOk !== false) {
      ui.toast("Autosave failed. Back up with a save code (☰ → Back up) so you don't lose this.", { kind: 'bad', ms: 6000 });
      GG.emit('save:failed', { slot: 'auto', error: 'write failed' });
    }
    return ok;
  }
  // endWeek emits 'week:wrap' once the week has advanced; if a sim ever emits it mid-wrap, save right after.
  GG.on('week:wrap', function () {
    var st = GG.state; if (!st) return;
    if (st.phase === 'wrap') Promise.resolve().then(function () { if (GG.state === st) autosave(st); });
    else autosave(st);
  });
  // v0.3: the weekend gig saves when it becomes pending (the blocks are done) and between songs (state.liveGig),
  // so a reload lands back at the van / the next song.
  GG.on('gig:pending', function () {
    var st = GG.state; if (st) Promise.resolve().then(function () { if (GG.state === st && st.phase === 'gig') autosave(st); });
  });
  // v1.0: the per-song save waits for an idle moment (at most 1 s), so a long career's save does not land on the frame the
  // between-songs card opens; it still runs only while that gig is live.
  var songSave = null;
  GG.on('gig:song', function () {
    var st = GG.state; if (!st || !st.liveGig || songSave) return;
    var run = function () { songSave = null; if (GG.state === st && st.liveGig) autosave(st); };
    songSave = typeof requestIdleCallback === 'function' ? requestIdleCallback(run, { timeout: 1000 }) : setTimeout(run, 50);
  });
  // Manual save from the menu. The slot becomes this career's slot; 'auto' is refreshed so Continue lands here.
  M.saveTo = function (slot) {
    var st = GG.state; if (!st) return false;
    st.slot = String(slot);
    var ok = write(slot, st) && write('auto', st);
    if (ok) { sfx('save'); ui.toast('Saved to slot ' + slot + '.', { kind: 'good' }); }
    else if (GG.save.storageOk === false) ui.toast('Saved for this tab only: this browser blocks storage. Back up with a save code.', { kind: 'bad' });
    else ui.toast('Save failed. Try backing up with a save code.', { kind: 'bad' });
    return ok || GG.save.storageOk === false;
  };

  /* ---- Careers ------------------------------------------------------------------------------------- */
  // v0.9: an unknown band id falls back to Hail Damage (a typo in ?band= must not start a bandless career).
  function bandIdOk(id) { return id && GG.content.bands && GG.content.bands[id] ? id : 'hail_damage'; }
  M.newCareer = function (o) {
    o = o || {};
    var st = GG.career.newCareer({ seed: o.seed, bandId: bandIdOk(o.bandId), slot: String(o.slot || '1'), player: o.player || { name: 'You' },
      careerDifficulty: o.careerDifficulty, seat: o.seat });   // v0.6.1 C4: chill | normal | brutal, locked for the career; v1.1 seat
    if (st.tutorial) st.tutorial.on = !o.skipLessons;   // v1.0 (Q7): the lessons run unless the creator's "Skip the lessons" is on
    setState(st);
    write(st.slot, st); write('auto', st);   // the slot is claimed right away, so Continue works from week 1
    return st;
  };
  // Dev/tests: a career with defaults, landing in the garage at week 1 (Monday card open unless openCard:false).
  M.quickStart = function (o) {
    o = o || {};
    var name = o.name || 'Tester';
    var presets = GG.content.presets || [];
    ui.closeAll();
    M.newCareer({ seed: o.seed != null ? (o.seed >>> 0) || 1 : GG.hashSeed(name + Date.now()), slot: o.slot || '1', bandId: o.bandId,
      player: { name: name, nick: o.nick || '', presetId: o.presetId || (presets[0] && presets[0].id) }, careerDifficulty: o.careerDifficulty, skipLessons: o.skipLessons,
      seat: o.seat });   // v1.1: quickStart({ seat }) / ?seat=bass (tests, lanes)
    if (o.openCard === false) { GG.career.startWeek(GG.state); M.sync(); }
    else M.enterGarage();
    return GG.state;
  };
  M.load = function (slot) {
    var st = null;
    try { st = GG.save.read(String(slot)); } catch (e) { console.warn('[main] save.read failed', e); }
    if (!st) { ui.toast("That save wouldn't load. The garage ate it.", { kind: 'bad' }); return false; }
    M.loadState(st, { slot: slot });
    return true;
  };
  M.loadState = function (st, o) {
    o = o || {};
    try { if (GG.save.migrate) st = GG.save.migrate(st) || st; } catch (e) { console.warn('[main] migrate failed', e); }
    if (o.slot && o.slot !== 'auto') st.slot = String(o.slot);   // autosaves keep going to the slot you loaded
    ui.closeAll();
    setState(st);
    GG.emit('career:loaded', { state: st });
    M.route();
    return st;
  };
  M.quitToTitle = function () {
    ui.closeAll();
    setState(null);
    ui.show('title');
  };

  /* ---- Week flow ------------------------------------------------------------------------------------- */
  M.enterGarage = function () { ui.closeAll(); M.sync(); updatePause(); M.route(); };
  // Puts the UI where the saved phase says the career is.
  M.route = function () {
    var st = GG.state;
    if (!st) { ui.show('title'); return; }
    if (st.phase === 'ended' || st.ended) ui.show('end');
    else if (st.phase === 'monday') { if (!st.card) M.beginWeek(); else if (!st.card.resolved) ui.show('card'); }
    else if (st.phase === 'wrap') M.wrapWeek();
    else if (st.phase === 'gig') M.playWeekend();
    M.sync();
  };
  // The weekend (phase 'gig'): the van to the venue (it hands over to the stage scene), the live gig, then the wrap.
  // A reload between songs skips the drive and resumes the set from state.liveGig; GG.ui.gigAutoplay (tests, flows)
  // skips the drive too (the bot takes any road card).
  M.playWeekend = function () {
    var st = GG.state; if (!st || st.phase !== 'gig' || !st.gig) { if (st && st.phase === 'wrap') M.wrapWeek(); return; }
    if (ui.isOpen('van') || ui.isOpen('gig')) return;   // already on the road / on stage
    var gig = st.gig, live = st.liveGig, started = !!(live && live.gig && live.gig.venueId === gig.venueId && live.index > 0);
    function play() {
      if (GG.state !== st || st.phase !== 'gig') return;
      ui.closeAll();
      // v0.6: a showdown weekend (their set first on a BotB/festival/Sad Dome gig, then yours, then the crowd verdict)
      if (ui.playShowdown && GG.rival && (gig.showdown || GG.rival.pending(st))) ui.playShowdown(gig, function () { M.wrapWeek(); }, { resume: started });
      else ui.playGig(gig, function () { M.wrapWeek(); });
    }
    ui.closeAll();
    if (started || !ui.playVan) play();
    else if (ui.gigAutoplay) { if (GG.world && GG.world.autoTrip) GG.world.autoTrip(st, 'avg'); play(); }
    else ui.playVan(gig, play, { scene: 'stage' });
  };
  // Draws this week's Monday card (or a quiet week) and shows it.
  M.beginWeek = function () {
    var st = GG.state; if (!st || st.phase === 'ended') return;
    var res = GG.career.startWeek(st) || {};
    M.sync();
    if (ui.flightDue && ui.flightDue(st)) { ui.playFlight(function () { if (GG.state === st) M.beginWeek(); }); return; }   // v0.7: departure day
    if (st.card && !st.card.resolved) { ui.show('card'); return; }   // offers show up on the whiteboard
    if (ui.announceShowdown && ui.announceShowdown(st)) return;      // v0.6: this week's rival showdown
    // v0.9: the sim's own pick (state.quiet), else the band's pool (flat + byBand, never another band's people)
    var q = typeof st.quiet === 'string' && ui.ownLines([st.quiet], st).length ? fill(st.quiet) : ui.line(ui.lines('quietWeek', st), null, st);
    ui.toast(q || 'Quiet week. Suspiciously quiet.', { who: 'Quiet week' });
    if (res.offer) ui.toast('📨 A gig offer came in for this weekend. Check the whiteboard.');
  };
  // After the Monday card: week one teaches the garage, in character. v1.0: with the lessons running (GG.tutorial, Lane T)
  // the bandmates walk you through it (w1_walk); the toast stays for careers without lessons.
  M.afterCard = function () {
    M.sync();
    var st = GG.state;
    var taught = !!(st && GG.tutorial && GG.tutorial.running && GG.tutorial.running() && (GG.tutorial.check({ event: 'afterCard' }) || st.totalWeek === 1));
    if (st && st.totalWeek === 1 && !M._taught && !taught) {
      M._taught = true;
      var t0 = ui.talkers(st)[0] || (st.members && st.members[0]), mate = t0 ? ui.who(t0.id) : null;   // v0.9: a member who talks
      var who = mate ? (mate.nick || mate.short) : 'The band';
      var msg = M.renderOk ? 'Tap the floor to walk around. Tap the whiteboard (or the big button) to plan the week.'
        : 'Tap the whiteboard (or the big button) to plan the week.', kc = M.renderOk && ui.keysCopy ? ui.keysCopy() : null;   // v1.5 review: keys / 'click' on a computer
      ui.toast(kc ? kc.replace('the big button.', 'the big button to plan the week.') : ui.tapWords ? ui.tapWords(msg) : msg, { who: who, ms: 6500 });
    }
    if (st && ui.announceShowdown) ui.announceShowdown(st);   // v0.6: after the Monday card
  };
  // Results → wrap. Runs endWeek once (phase 'wrap'); a second call just re-shows the same wrap.
  M.wrapWeek = function () {
    var st = GG.state; if (!st) return;
    // v0.5: the Loonie Awards run during week C.LOONIES_WEEK, BEFORE endWeek (which would auto-resolve them). Flows on
    // autoplay (tests) let endWeek resolve them.
    if (st.phase === 'wrap' && ui.loonieDue && ui.loonieDue(st) && ui.playLoonies && !ui.gigAutoplay && !ui.isOpen('loonies')) {
      ui.close('results');
      ui.playLoonies(function () { if (GG.state === st) M.wrapWeek(); });
      return;
    }
    // v0.7: the Global Gong ceremony (week 22, World era, nominated) runs before endWeek too (autoplay: endWeek resolves it).
    if (ui.gongDue && ui.gongDue(st) && ui.playGong && !ui.isOpen('gong')) {
      ui.close('results');
      ui.playGong(function () { if (GG.state === st) M.wrapWeek(); });
      return;
    }
    var wrap = st.wrap;
    if (st.phase === 'wrap') { M.lastSave = null; wrap = GG.career.endWeek(st); }
    M.sync();
    ui.close('results');
    if (wrap) ui.show('wrap', { wrap: wrap }); else M.route();
  };
  M.nextWeek = function () {
    var st = GG.state; if (!st) return;
    ui.close('wrap');
    if (st.phase === 'ended' || st.ended) { ui.show('end'); return; }
    M.route();
  };

  /* ---- Boot ------------------------------------------------------------------------------------------ */
  function query() {
    var out = {};
    (location.search || '').replace(/^\?/, '').split('&').forEach(function (kv) {
      if (!kv) return; var p = kv.split('='); out[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || '1');
    });
    return out;
  }
  function onVisibility() {
    if (GG.audio) { if (document.hidden) GG.audio.suspend(); else GG.audio.resume(); }
    updatePause();
  }
  function unlockAudio() { if (GG.audio) GG.audio.unlock(); }
  // A playing song stops when the week's results (the gig) or any other big moment takes the screen.
  var STOP_SONG_ON = { results: 1, wrap: 1, card: 1, title: 1, end: 1 };
  GG.on('screen:open', function (p) { if (p && STOP_SONG_ON[p.id] && GG.audio && GG.audio.stop) GG.audio.stop(); });

  M.boot = function () {
    if (M.booted) return;
    M.booted = true;
    var bootEl = document.getElementById('boot');
    if (bootEl && bootEl.parentNode) bootEl.parentNode.removeChild(bootEl);
    if (GG.meta) { try { GG.meta.enabled = true; GG.meta.load(); } catch (e) { console.error('[main] meta.load failed', e); } }   // v1.0: Hall of Fame + meta, the one-time slot scan
    ui.init();
    var scene = document.getElementById('scene');
    if (GG.render && typeof GG.render.init === 'function') {
      try { M.renderOk = !!GG.render.init(scene); } catch (e) { M.renderOk = false; console.error('[main] render.init failed', e); }
    }
    ui.initWeek();
    if (!M.renderOk) ui.showFallback(scene);
    ['pointerdown', 'touchend', 'keydown'].forEach(function (ev) { document.addEventListener(ev, unlockAudio, true); });
    document.addEventListener('visibilitychange', onVisibility);
    updatePause();
    var q = query();
    if (q.quick) M.quickStart({ seed: q.seed != null ? Number(q.seed) : undefined, slot: q.slot || '1', name: q.name || 'Tester', bandId: q.band, seat: q.seat });
    else ui.show('title');
  };

  GG.registerDebug('main', function () {
    var st = GG.state;
    return { booted: M.booted, renderOk: M.renderOk, slot: st ? st.slot : null, phase: st ? st.phase : null,
      totalWeek: st ? st.totalWeek : null, lastSave: M.lastSave };
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', M.boot);
  else M.boot();
})(window.GG);
