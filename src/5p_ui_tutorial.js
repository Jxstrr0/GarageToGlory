// 5p_ui_tutorial.js (v1.0 "Glory", Lane T; plan_contract_1.0 §4.7, handoff A15): the lesson bubbles, the "?" sheet, replays.
//   GG.tutorial = { enabled, start(id, opts?), replay(id), check(ctx) -> started id | null, offerSkip(), openLessons(),
//                   active() -> lessonId | null, running(), suppressWriteTip(state), skip(), debug }
//   Events: 'tut:step' { id, step, replay? } · 'tut:done' { id, replay?, skipped? }. Debug GG.debug('tutorial') -> { enabled, on,
//   active, step, steps, done, queued, visible, replay }.
// The sim half is GG.lessons (2h_sim_lessons.js): due(state, ctx), steps(state, id), mark/done/stop. This file only listens
// (screen:open/close, ui:tab, hotspot, week:wrap, 60_main's afterCard check) and draws one non-blocking card + a pointer ring
// on a layer above the screens (#tut, z 35: under the toasts). Taps outside the card reach the game. Rules:
//   * enabled = not under automation (navigator.webdriver) unless ?tut=1; replays always work (they're a tap on "?").
//   * nothing while the calibration is open (a lesson that comes due then waits, and starts when 'calib' closes);
//     nothing while a song is live (gig / rival-set / practice / studio: hidden, never over the highway).
//   * a screen lesson shows while its screen is on top and is done when that screen closes; a garage lesson (w1_walk) shows
//     only with no screen up; a lesson that comes due finishes the current one (marked done).
//   * "Skip lessons" turns state.tutorial.on off for this career (saved right away); a replay's button reads "Close" and
//     replays never touch state.tutorial.done. Seen lessons also go to GG.meta (markLesson) for the "?" ticks.
(function (GG) {
  var ui = GG.ui, el = ui.el, btn = ui.btn, L = GG.lessons;
  var T = GG.tutorial = GG.tutorial || {};
  function S() { return GG.state; }
  function query(k) { try { return new RegExp('[?&]' + k + '=1\\b').test(location.search || ''); } catch (e) { return false; } }
  var webdriver = typeof navigator !== 'undefined' && !!navigator.webdriver;
  T.enabled = !webdriver || query('tut');

  var cur = null;      // { id, steps, i, replay, host, garage, offs: [] }
  var queued = null;   // { id, opts } waiting for the calibration to close
  var layer = null, card = null, ring = null, tick = 0, visible = false;
  var LIVE = ['gig', 'rival-set', 'practice', 'calib'];

  T.running = function () { var st = S(); return !!(T.enabled && st && L && L.on(st)); };
  T.active = function () { return cur ? cur.id : null; };
  T.offerSkip = function () {
    try { var m = GG.meta && GG.meta.get ? GG.meta.get() : null; return !!(m && m.careers && m.careers.past4 > 0); } catch (e) { return false; }
  };
  // 54_ui_sequencer: the first-Write tips stay quiet while the w1_write lesson runs (or is about to).
  T.suppressWriteTip = function (st) {
    st = st || S();
    if (cur && cur.id === 'w1_write') return true;
    return !!(T.enabled && st && L && L.on(st) && !L.done(st, 'w1_write') && (st.totalWeek || 1) === 1);
  };

  /* ---- Layer + card ------------------------------------------------------------------------------------------- */
  var CSS = '#tut { position: absolute; inset: 0; z-index: 35; pointer-events: none; overflow: hidden; }\n'
    + '#tut.off { display: none; }\n'
    + '.tut-card { position: absolute; left: 12px; right: 12px; margin: 0 auto; max-width: 420px; box-sizing: border-box; pointer-events: auto;'
    + ' background: #f3efe6; color: #151a26; border: 2px solid #c9a227; border-radius: 16px; padding: 10px 12px; box-shadow: 0 10px 30px rgba(0, 0, 0, .5);'
    + ' display: flex; flex-direction: column; gap: 6px; animation: tutIn .18s ease-out; }\n'
    + '.tut-head { display: flex; align-items: center; gap: 8px; min-width: 0; }\n'
    + '.tut-head .avatar { flex: 0 0 auto; } .tut-who { flex: 1 1 auto; min-width: 0; font: 800 11px/1.2 var(--font); letter-spacing: .1em; text-transform: uppercase; color: #8a5a14;'
    + ' white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n'
    + '.tut-n { flex: 0 0 auto; font: 800 11px/1 var(--font); color: #7a7466; }\n'
    + '.tut-text { font-size: 15px; font-weight: 600; line-height: 1.35; overflow-wrap: anywhere; }\n'
    + '.tut-text.narr { font-style: italic; font-weight: 500; }\n'
    + '.tut-btns { display: flex; gap: 8px; } .tut-btns .btn { flex: 1 1 0; min-height: 48px; min-width: 48px; padding: 0 10px; font-size: 15px; }\n'
    + '.tut-card .btn.ghost { color: #4a4436; border-color: rgba(21, 26, 38, .25); }\n'
    + '.tut-ring { position: absolute; width: 58px; height: 58px; margin: -29px 0 0 -29px; border-radius: 50%; border: 3px solid #ffd23f;'
    + ' box-shadow: 0 0 0 4px rgba(255, 210, 63, .28), 0 0 18px rgba(255, 210, 63, .6); pointer-events: none; animation: tutPulse 1.2s ease-in-out infinite; }\n'
    + '.tut-ring.box { margin: 0; border-radius: 14px; }\n'
    + '@keyframes tutPulse { 50% { opacity: .45; } } @keyframes tutIn { from { opacity: 0; transform: translateY(6px); } }\n'
    + 'html.gg-big .tut-text { font-size: 18px; } html.gg-calm .tut-ring { animation: none; }\n'
    + '.tut-list .tut-row { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 52px; margin-bottom: 8px; text-align: left; justify-content: flex-start; }\n'
    + '.tut-row .tk { flex: 0 0 26px; text-align: center; font-size: 18px; } .tut-row .nm { flex: 1 1 auto; min-width: 0; }\n'
    + '.tut-row .wk { flex: 0 0 auto; font-size: 12px; opacity: .65; }\n';
  function ensureLayer() {
    if (layer && layer.parentNode) return layer;
    if (!document.getElementById('gg-tut-css')) {
      var s = document.createElement('style'); s.id = 'gg-tut-css'; s.textContent = CSS; document.head.appendChild(s);
    }
    var app = document.getElementById('app') || document.body;
    layer = el('div#tut.off', { 'aria-live': 'polite' });
    app.insertBefore(layer, document.getElementById('toast'));
    return layer;
  }
  function liveScreen() { for (var i = 0; i < LIVE.length; i++) if (ui.isOpen(LIVE[i])) return LIVE[i]; return null; }
  function songLive() {
    if (liveScreen()) return true;
    var st = S(); return !!(ui.isOpen('studio') && st && st.liveGig);
  }
  // Where the current lesson may show right now.
  function canShow() {
    if (!cur || !layer) return false;
    if (songLive()) return false;
    var top = ui.top();
    if (cur.garage) return top == null;
    return top === cur.host;
  }

  /* ---- Pointing ------------------------------------------------------------------------------------------------ */
  function vis(node) {
    if (!node || !node.getBoundingClientRect) return null;
    var r = node.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return null;
    var H = window.innerHeight || 844, W = window.innerWidth || 390;
    if (r.bottom < 0 || r.top > H || r.right < 0 || r.left > W) return null;
    return r;
  }
  function byTestid(id) {
    var list = document.querySelectorAll('#screens [data-testid="' + id + '"], #hud [data-testid="' + id + '"]');
    for (var i = list.length - 1; i >= 0; i--) { var r = vis(list[i]); if (r) return { box: r }; }
    return null;
  }
  function target(step) {
    var p = step && step.point, R = GG.render, st = S();
    if (!p) return null;
    if (p.testid) {
      var ids = Array.isArray(p.testid) ? p.testid : [p.testid];
      for (var i = 0; i < ids.length; i++) { var t = byTestid(ids[i]); if (t) return t; }
      return null;
    }
    if (p.hotspot) {
      if (GG.main && GG.main.renderOk && R && R.hotspotScreenPos) {
        var hp = null; try { hp = R.hotspotScreenPos(p.hotspot); } catch (e) { hp = null; }
        if (hp && isFinite(hp.x) && isFinite(hp.y)) return { pt: hp };
      }
      return byTestid('hs-' + p.hotspot);
    }
    if (p.member && st) {
      var id = String(p.member).charAt(0) === '@' && GG.career && GG.career.roleOf ? GG.career.roleOf(st, p.member) : p.member;
      var mp = null; try { mp = id && R && R.memberScreenPos ? R.memberScreenPos(id) : null; } catch (e) { mp = null; }
      if (mp && isFinite(mp.x)) return { pt: mp };
      return id ? byTestid('mate-' + id) : null;
    }
    return null;
  }
  function hudBottom() {
    var bar = document.querySelector('#hud .hud-bar');
    if (bar && !bar.classList.contains('hidden')) { var r = bar.getBoundingClientRect(); if (r.height) return r.bottom; }
    return 12;
  }
  function place() {
    if (!card || !cur) return;
    var step = cur.steps[cur.i], t = target(step), H = window.innerHeight || 844;
    var cy = t ? (t.box ? t.box.top + t.box.height / 2 : t.pt.y) : null;
    if (t) {
      ring.style.display = '';
      if (t.box) {
        ring.className = 'tut-ring box';
        ring.style.left = (t.box.left - 4) + 'px'; ring.style.top = (t.box.top - 4) + 'px';
        ring.style.width = (t.box.width + 8) + 'px'; ring.style.height = (t.box.height + 8) + 'px';
      } else {
        ring.className = 'tut-ring'; ring.style.width = ring.style.height = '';
        ring.style.left = t.pt.x + 'px'; ring.style.top = t.pt.y + 'px';
      }
    } else ring.style.display = 'none';
    // Top slot under the HUD, or the bottom slot (above the dock when it shows); the one away from the target.
    var e = ui.get(ui.top() || ''), tallTop = !!(e && e.def && (e.def.kind === 'full' || e.def.tall));
    var useTop = cy != null ? cy > H * 0.5 : !tallTop;
    var dock = document.querySelector('#hud .dock'), db = 12;
    if (dock && !dock.classList.contains('hidden')) { var dr = dock.getBoundingClientRect(); if (dr.height) db = Math.max(12, H - dr.top + 8); }
    var ch = card.offsetHeight || 150, topY = Math.max(8, hudBottom() + 8), botY = H - db - ch;
    var y = useTop ? topY : botY;
    if (t && t.box) {   // never sit on the box itself: flip to the other slot if it would
      var ov = function (yy) { return yy < t.box.bottom && yy + ch > t.box.top; };
      if (ov(y)) { var alt = useTop ? botY : topY; if (!ov(alt)) y = alt; }
    }
    card.style.top = Math.round(Math.max(8, Math.min(y, H - ch - 8))) + 'px';
  }
  function refresh() {
    ensureLayer();
    visible = canShow();
    layer.classList.toggle('off', !visible);
    if (visible) place();
  }

  /* ---- Steps --------------------------------------------------------------------------------------------------- */
  function drawStep() {
    ensureLayer(); ui.clear(layer);
    var step = cur.steps[cur.i], st = S(), n = cur.steps.length, last = cur.i >= n - 1;
    var who = step.who ? ui.who(step.who, st) : null;
    ring = el('div.tut-ring', { testid: 'tut-ring' });
    var skip = cur.replay
      ? btn('.btn.ghost', { testid: 'tut-close', onclick: function () { finish(false); } }, 'Close')
      : btn('.btn.ghost', { testid: 'tut-skip-lessons', onclick: function () { T.skip(); } }, 'Skip lessons');
    var next = btn('.btn.primary', { testid: 'tut-next', onclick: function () { advance(); } }, last ? 'Got it' : 'Next ›');
    card = el('div.tut-card', { testid: 'tut-bubble', role: 'dialog', 'aria-label': 'Lesson', data: { lesson: cur.id, step: String(cur.i), who: step.who || '' } }, [
      el('div.tut-head', [who ? ui.avatar(who, 'sm') : el('span', { style: 'font-size:18px' }, '🎬'),
        el('span.tut-who', { testid: 'tut-who' }, who ? who.short + (who.nick && who.nick !== who.short ? ' · ' + who.nick : '') : (ui.band(st) || {}).name || 'The band'),
        el('span.tut-n', (cur.i + 1) + '/' + n)]),
      el('div.tut-text' + (step.narr ? '.narr' : ''), { testid: 'tut-text' }, step.text),
      el('div.tut-btns', [skip, next])]);
    ui.append(layer, [ring, card]);
    bindAdvance(step);
    GG.emit('tut:step', { id: cur.id, step: cur.i, replay: cur.replay || undefined });
    refresh();
  }
  function unbind() { if (cur && cur.offs) { cur.offs.forEach(function (off) { try { off(); } catch (e) { /* gone */ } }); cur.offs = []; } }
  function bindAdvance(step) {
    unbind();
    var a = step.advance;
    if (!a || a === 'next') return;
    var mine = cur;
    if (a.hotspot) cur.offs.push(GG.on('hotspot', function (p) { if (cur === mine && p && p.action === a.hotspot) advance(); }));
    else if (a.event) cur.offs.push(GG.on(a.event, function (p) { if (cur === mine && (!a.id || (p && (p.id === a.id || p.action === a.id)))) advance(); }));
  }
  function advance() {
    if (!cur) return;
    if (cur.i >= cur.steps.length - 1) { finish(true); return; }
    cur.i++; drawStep();
  }
  // Ends the current lesson. done: it ran its course (or its screen closed): marked unless it's a replay.
  function finish(done, why) {
    if (!cur) return;
    var c = cur, st = S();
    unbind(); cur = null;
    if (layer) { ui.clear(layer); layer.classList.add('off'); }
    visible = false; card = ring = null;
    if (!c.replay && st && done === true) markDone(st, c.id);
    GG.emit('tut:done', { id: c.id, replay: c.replay || undefined, skipped: why === 'skip' || undefined });
  }
  function markDone(st, id) {
    if (L.mark(st, id)) { try { if (GG.meta && GG.meta.enabled && GG.meta.markLesson) GG.meta.markLesson(id); } catch (e) { /* meta is optional */ } }
  }

  // Starts a lesson (opts.replay: from "?"; opts.host: the screen it belongs to). Returns true when it started (or queued).
  T.start = function (id, opts) {
    opts = opts || {};
    var st = S(); if (!st || !L || !L.def(id)) return false;
    if (!opts.replay && (!T.running() || L.done(st, id))) return false;
    if (ui.isOpen('calib')) { queued = { id: id, opts: opts }; return true; }   // after the calibration, never over it
    var d = L.def(id);
    if (!opts.replay && d.mark) { if (cur) finish(true); markDone(st, id); GG.emit('tut:done', { id: id }); return true; }
    var steps = L.steps(st, id);
    if (cur) finish(cur.replay ? false : true);
    if (!steps.length) { if (!opts.replay) markDone(st, id); return false; }
    cur = { id: id, steps: steps, i: 0, replay: !!opts.replay, garage: !!d.garage && !opts.host, host: opts.host !== undefined ? opts.host : ui.top(), offs: [] };
    if (cur.garage) cur.host = null;
    drawStep();
    return true;
  };
  T.replay = function (id) {
    var st = S(), d = L && L.def(id);
    if (!d) return false;
    if (!st) { ui.toast('Lessons replay inside a career. Start one first.'); return false; }
    if (ui.isOpen('lessons')) ui.close('lessons');
    if (d.garage) ui.closeAll();   // it points at the room: clear the sheets first
    return T.start(id, { replay: true, host: d.garage ? null : ui.top() });
  };
  // What just happened -> the lesson that's due now (if any) starts. Returns its id or null.
  T.check = function (ctx) {
    var st = S(); if (!T.running()) return null;
    var id = L.due(st, ctx || {});
    if (!id || (cur && cur.id === id)) return cur && cur.id === id ? id : null;
    return T.start(id, { host: ctx && ctx.host !== undefined ? ctx.host : undefined }) ? id : null;
  };
  T.skip = function () {
    var st = S();
    finish(null, 'skip');
    if (st) {
      L.stop(st);
      try { if (GG.save && GG.save.write) { GG.save.write('auto', st); if (st.slot && st.slot !== 'auto') GG.save.write(String(st.slot), st); } } catch (e) { /* next autosave keeps it */ }
    }
    ui.toast('Lessons off. Tap ? any time to replay one.', { who: 'Lessons' });
  };

  /* ---- Triggers -------------------------------------------------------------------------------------------------- */
  var moodDrop = false;
  GG.on('week:wrap', function (p) {
    var w = p && p.wrap;
    moodDrop = !!(w && (w.members || []).some(function (m) { return m && m.moodDelta < 0; }));
  });
  function laptopTab() {
    var b = document.querySelector('#screens [data-testid^="laptop-tab-"][aria-selected="true"]');
    return b ? String(b.getAttribute('data-testid')).replace('laptop-tab-', '') : null;
  }
  GG.on('screen:open', function (p) {
    var id = p && p.id; if (!id) return;
    if (!T.running()) { refresh(); return; }
    var ctx = { screen: id, host: id };
    if (id === 'seq') { var e = ui.get('seq'); ctx.mode = e && e.data ? e.data.mode : null; }
    if (id === 'laptop') ctx.tab = laptopTab();
    if (id === 'wrap' && moodDrop) ctx.event = 'moodDrop';
    setTimeout(function () { if (ui.isOpen(id)) T.check(ctx); refresh(); }, 0);   // after the screen's own listeners (and its layout)
  });
  GG.on('screen:close', function (p) {
    var id = p && p.id;
    if (cur && !cur.garage && cur.host === id) finish(true);
    if (id === 'calib' && queued && !ui.isOpen('calib')) { var q = queued; queued = null; setTimeout(function () { T.start(q.id, q.opts); }, 0); }
    setTimeout(refresh, 0);
  });
  GG.on('ui:tab', function (p) { if (p && p.tab && T.running()) T.check({ tab: p.tab, host: ui.top() }); });
  GG.on('ui:stack', function () { if (cur) setTimeout(refresh, 0); });
  GG.on('ui:layout', function () { if (cur && visible) place(); });
  GG.on('career:new', function () { if (cur) finish(false); queued = null; moodDrop = false; });
  GG.on('career:loaded', function () { if (cur) finish(false); queued = null; });
  if (typeof window !== 'undefined') window.addEventListener('resize', function () { if (cur) refresh(); });
  // The camera glides and sheets scroll: keep the ring on its target (cheap: one rect read per 400 ms, only while a lesson shows).
  setInterval(function () { if (cur) { tick++; refresh(); } }, 400);

  /* ---- The "?" sheet --------------------------------------------------------------------------------------------- */
  function seen(st, id) {
    if (st && L.done(st, id)) return true;
    try { return !!(GG.meta && GG.meta.lessonSeen && GG.meta.lessonSeen(id)); } catch (e) { return false; }
  }
  function weekLabel(d) {
    var w = d.when || {};
    if (w.week) return 'week ' + w.week;
    if (d.id.charAt(0) === 'y') return 'year 1';
    return 'weeks 2–4';
  }
  ui.define('lessons', {
    kind: 'sheet', title: 'Lessons',
    build: function (s) {
      var st = S();
      s.setTitle('Lessons', st ? ((ui.band(st) || {}).name || '').toUpperCase() : 'GARAGE TO GLORY');
      var ids = L.LESSONS.filter(function (id) { return !st || L.available(st, id); });
      var list = el('div.tut-list', { testid: 'lessons-list' }, ids.map(function (id) {
        var d = L.def(id), ok = seen(st, id);
        return btn('.btn.block.tut-row', { testid: 'lesson-' + id, data: { seen: ok ? '1' : '0' }, disabled: !st,
          onclick: function () { T.replay(id); } }, [el('span.tk', ok ? '✓' : '○'), el('span.nm', d.title), el('span.wk', weekLabel(d))]);
      }));
      ui.append(s.body, [el('p.small.dim', st ? 'Tap one to hear it again. Your bandmates love repeating themselves.' : 'Lessons replay inside a career.'), list]);
      var foot = [];
      if (st && L.on(st)) foot.push(btn('.btn.ghost.grow', { testid: 'lessons-off', onclick: function () { ui.close(s.id); T.skip(); } }, 'Turn lessons off'));
      else if (st && T.enabled && (st.totalWeek || 1) <= 24) foot.push(btn('.btn.ghost.grow', { testid: 'lessons-on', onclick: function () { L.ensure(st).on = true; ui.close(s.id); ui.toast('Lessons back on.', { who: 'Lessons' }); } }, 'Turn lessons on'));
      foot.push(btn('.btn.primary.grow', { testid: 'lessons-close', onclick: function () { ui.close(s.id); } }, 'Close'));
      ui.append(s.foot, foot);
    }
  });
  T.openLessons = function () { ensureLayer(); ui.show('lessons'); };

  if (GG.registerDebug) GG.registerDebug('tutorial', function () {
    var st = S();
    return { enabled: T.enabled, on: !!(st && L.on(st)), active: cur ? cur.id : null, step: cur ? cur.i : null, steps: cur ? cur.steps.length : 0,
      replay: cur ? cur.replay : false, host: cur ? cur.host : null, visible: visible, queued: queued ? queued.id : null,
      done: st && st.tutorial ? Object.assign({}, st.tutorial.done) : {} };
  });
  T.debug = function () { return GG.debug ? GG.debug('tutorial') : null; };
})(window.GG);
