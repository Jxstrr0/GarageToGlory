// 60_main.js: boot, the live career (GG.state), routing by phase, the week flow, autosave, and the glue to
// render + audio. Screens call these; sims never do.
//   GG.main.newCareer({ slot, bandId, player, seed }) ; quickStart({ seed, slot, name, openCard }) ; load(slot)
//   loadState(state, { slot }) ; enterGarage() ; route() ; beginWeek() ; afterCard() ; wrapWeek() ; nextWeek()
//   saveTo(slot) ; quitToTitle() ; sync()
// URL: ?quick=1&seed=N skips the menus (tests/dev).
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
  function fill(t) { return t && GG.state && GG.career.fillText ? GG.career.fillText(GG.state, t) : t; }
  function sfx(n) { if (GG.audio) GG.audio.sfx(n); }

  // Pause the 3D loop while a full screen hides it, while the tab is hidden, or when no career is loaded.
  function updatePause() { render('setPaused', !!(document.hidden || ui.hasFull() || !GG.state)); }
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
  M.newCareer = function (o) {
    o = o || {};
    var st = GG.career.newCareer({ seed: o.seed, bandId: o.bandId || 'hail_damage', slot: String(o.slot || '1'), player: o.player || { name: 'You' } });
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
      player: { name: name, nick: o.nick || '', presetId: o.presetId || (presets[0] && presets[0].id) } });
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
    M.sync();
  };
  // Draws this week's Monday card (or a quiet week) and shows it.
  M.beginWeek = function () {
    var st = GG.state; if (!st || st.phase === 'ended') return;
    var res = GG.career.startWeek(st) || {};
    M.sync();
    if (st.card && !st.card.resolved) { ui.show('card'); return; }   // offers show up on the whiteboard
    var q = typeof st.quiet === 'string' ? st.quiet : ui.pick(GG.content.lines && GG.content.lines.quietWeek);
    ui.toast(fill(q) || 'Quiet week. Suspiciously quiet.', { who: 'Quiet week' });
    if (res.offer) ui.toast('📨 A gig offer came in for this weekend. Check the whiteboard.');
  };
  // After the Monday card: week one teaches the garage, in character.
  M.afterCard = function () {
    M.sync();
    var st = GG.state;
    if (st && st.totalWeek === 1 && !M._taught) {
      M._taught = true;
      var mate = st.members && st.members[0] ? ui.who(st.members[0].id) : null;
      var who = mate ? (mate.nick || mate.short) : 'The band';
      ui.toast(M.renderOk ? 'Tap the floor to walk around. Tap the whiteboard (or the big button) to plan the week.'
        : 'Tap the whiteboard (or the big button) to plan the week.', { who: who, ms: 6500 });
    }
  };
  // Results → wrap. Runs endWeek once (phase 'wrap'); a second call just re-shows the same wrap.
  M.wrapWeek = function () {
    var st = GG.state; if (!st) return;
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
    if (q.quick) M.quickStart({ seed: q.seed != null ? Number(q.seed) : undefined, slot: q.slot || '1', name: q.name || 'Tester' });
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
