// 50k_ui_keys.js (v1.5 "Desktop", Lane N; plan_contract_1.5 §4.5, owner K1 + D6-D8, D11): menus on the keyboard.
// One router: a document capture-phase keydown + keyup and one pointerdown (no rAF, no MutationObserver). Order:
//   (0) GG.input.capture() (rebinding, key calibration) never reaches it (50b stops those keys first); Ctrl / Meta / Alt
//       (not AltGr) and IME (isComposing / 229 / Unidentified / Process) are left alone.
//   (0b) repeat / stale guard: Enter / Space / Esc with ev.repeat -> swallowed (a held key never repeats a menu action);
//       an Enter / Space keydown within 200 ms after a programmatic focus move (ui.focusAt: show / close / focusDefault /
//       render restore), or one that began before it, -> swallowed; a keyup whose keydown the router did not see on the same
//       element -> swallowed (Space clicks a button on keyup: a press from the last screen never clicks the new one).
//   (1) a live song (GG.input.gigLive()): only Tab is blocked (55 owns every other key).
//   (2) typing (input / textarea / select / contenteditable): Esc blurs, Tab moves on, every other key is native.
//   (3) Esc -> back(): the confirm's No -> def.back (testid | fn) -> KEY_BACK -> sticky: nothing -> a sheet / modal closes ->
//       a full screen's btn-back / btn-close -> nothing open in the garage: the ☰ menu -> title / end: nothing.
//   (4) arrows: the nearest reachable control that way (rects) in the top layer + the tutorial card (not inside
//       [data-keys=own], a range or a select: those keep their arrows), scrollIntoView({ block: 'nearest' }).
//   (5) Tab / Shift+Tab cycle the top layer + the tutorial card (a focus trap); nothing open: HUD -> dock -> kb-spots.
//   (6) focus on body / a hidden or inert node: Enter focuses the default (never clicks), Space is swallowed.
//   (7) garage, nothing open: Digit1-8 / Numpad1-8 by ev.code (never ev.key: AZERTY works; Shift / AltGr ignored) walk to
//       that spot like a tap (GG.render.goToHotspot; no 3D -> 'hotspot' right away). Monday card: arrows + Enter only.
// html.gg-kbnav (the focus-ring mode): on with a real (GG.input.real) Tab / arrow / Enter / Esc / digit, off on any
// pointerdown; emits 'ui:kbnav' { on }. Only this file's CSS draws the ring (html.gg-kbnav :focus-visible). kb-spots (52)
// shows with gg-kbnav or gg-wide; kb-hints (50_ui_core) with gg-wide.gg-keys, plus an "Esc" cap by ✕ / ←.
// debug('keys') = { top, focus, opener, lastEsc, nav, kbnav, swallowed: { repeat, stale } }.
(function (GG) {
  var ui = GG.ui, I = GG.input || {};
  var root = document.documentElement;
  // Esc on these clicks their own back / close control (when present, enabled and visible); 'close' = ui.close(top).
  var KEY_BACK = { genre: 'btn-back', settings: 'btn-back', calib: 'btn-back', board: 'btn-board-close', world: 'btn-world-close',
    'tour-region': 'btn-region-back', logo: 'btn-logo-back', hof: 'hof-back', recap: 'recap-close', intro: 'close', seat: 'close' };
  // Esc does nothing on these (they move the career on; their own buttons do it).
  var STICKY = { results: 1, wrap: 1, gig: 1, 'gig-set': 1, 'gig-results': 1, road: 1, 'label-demand': 1, cert: 1, loonies: 1, 'loonie-card': 1,
    'rival-set': 1, 'rival-verdict': 1, 'tour-flight': 1, 'moose-opera': 1, 'tour-payoff': 1, gong: 1, title: 1, end: 1 };
  var ARROWS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
  var FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]';
  var STALE_MS = 200;
  var D = { lastEsc: null, nav: null, repeat: 0, stale: 0 };
  // code -> the element its (unswallowed) keydown was on
  var down = {};

  function kbnavOn(on) {
    if (root.classList.contains('gg-kbnav') === !!on) return;
    root.classList.toggle('gg-kbnav', !!on);
    GG.emit('ui:kbnav', { on: !!on });
  }
  // (tests / Settings)
  ui.setKbnav = kbnavOn;
  function swallow(ev, why) {
    ev.preventDefault(); ev.stopPropagation();
    if (why) D[why]++;
  }
  function tidOf(n) { return n && n.getAttribute ? n.getAttribute('data-testid') || (n === document.body ? 'body' : n.nodeName.toLowerCase()) : null; }
  function topEntry() { var id = ui.top(); return id ? ui.get(id) : null; }
  function tutCard() { var c = document.querySelector('#tut .tut-card'); return c && ui.reachable(c) ? c : null; }
  function own(n) { return !!(n && n.closest && n.closest('[data-keys="own"]')); }
  function isOwnArrows(n) { return !!n && (own(n) || n.nodeName === 'SELECT' || (n.nodeName === 'INPUT' && /^range$/i.test(n.type))); }
  function altGr(ev) { return !!(ev.getModifierState && ev.getModifierState('AltGraph')); }

  // The controls Tab / the arrows can reach now: the top layer (+ the tutorial card), or with nothing open the HUD, the
  // dock and kb-spots. A roving widget (tabindex -1 children) shows only its tabindex 0 node.
  function scope() {
    var e = topEntry(), out = [], seen = [];
    function add(rootEl) {
      if (!rootEl) return;
      var list = rootEl.querySelectorAll(FOCUSABLE);
      for (var i = 0; i < list.length; i++) {
        var n = list[i];
        if (seen.indexOf(n) >= 0) continue;
        if (n.getAttribute('tabindex') === '-1' || !ui.reachable(n)) continue;
        if (n.classList && n.classList.contains('scrim')) continue;
        seen.push(n); out.push(n);
      }
    }
    if (e) add(e.root);
    else if (GG.state) add(document.getElementById('hud'));
    add(tutCard());
    out.sort(function (a, b) { return a === b ? 0 : a.compareDocumentPosition(b) & 4 ? -1 : 1; });
    return out;
  }
  function badFocus(a) { return !a || a === document.body || a === root || !ui.reachable(a); }
  // Inside what the keys work on now (the top layer or, with nothing open, the HUD; + the tutorial card).
  function inScope(a) {
    var e = topEntry(), c = tutCard(), h = document.getElementById('hud');
    return !!a && ((e ? e.root.contains(a) : !!(h && h.contains(a))) || !!(c && c.contains(a)));
  }
  function indexIn(list, a) {
    var i = list.indexOf(a);
    if (i >= 0 || !a) return i;
    var box = a.closest && a.closest('[data-keys="own"]');
    for (var k = 0; box && k < list.length; k++) if (box.contains(list[k])) return k;
    return -1;
  }
  function navFocus(n) {
    ui.focusEl(n, { nav: true, preventScroll: true });
    try { n.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (err) { /* ignore */ }
  }
  function focusDefaultNow() {
    var e = topEntry();
    if (e) return ui.focusDefault(e.id);
    return ui.focusDefault();
  }

  // (5) Tab: the next / previous control in DOM order, wrapping (a trap: never leaves the top layer).
  function cycle(back) {
    var list = scope();
    if (!list.length) return false;
    var a = document.activeElement, i = indexIn(list, a);
    var n = i < 0 ? list[back ? list.length - 1 : 0] : list[(i + (back ? -1 : 1) + list.length) % list.length];
    navFocus(n); D.nav = (back ? 'shift-tab:' : 'tab:') + tidOf(n);
    return true;
  }
  // (4) arrows: the nearest control that way; overlap on the other axis wins, then distance.
  function move(dir) {
    var a = document.activeElement, list = scope();
    if (badFocus(a) || !inScope(a)) return focusDefaultNow();
    var r = a.getBoundingClientRect(), cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2, best = null, bestS = Infinity;
    list.forEach(function (n) {
      if (n === a || n.contains(a) || a.contains(n)) return;
      var q = n.getBoundingClientRect(), qx = (q.left + q.right) / 2, qy = (q.top + q.bottom) / 2, main, gap;
      if (dir === 'down') { if (qy <= cy + 1 || q.bottom <= r.bottom - 1) return; main = Math.max(0, q.top - r.bottom); gap = Math.max(0, Math.max(q.left, r.left) - Math.min(q.right, r.right)); }
      else if (dir === 'up') { if (qy >= cy - 1 || q.top >= r.top + 1) return; main = Math.max(0, r.top - q.bottom); gap = Math.max(0, Math.max(q.left, r.left) - Math.min(q.right, r.right)); }
      else if (dir === 'right') { if (qx <= cx + 1 || q.right <= r.right - 1) return; main = Math.max(0, q.left - r.right); gap = Math.max(0, Math.max(q.top, r.top) - Math.min(q.bottom, r.bottom)); }
      else { if (qx >= cx - 1 || q.left >= r.left + 1) return; main = Math.max(0, r.left - q.right); gap = Math.max(0, Math.max(q.top, r.top) - Math.min(q.bottom, r.bottom)); }
      var off = dir === 'up' || dir === 'down' ? Math.abs(qx - cx) : Math.abs(qy - cy);
      var s = main + gap * 4 + off * 0.1 + (gap > 0 ? 1000 : 0);
      if (s < bestS) { bestS = s; best = n; }
    });
    if (!best) return false;
    navFocus(best); D.nav = dir + ':' + tidOf(best);
    return true;
  }
  function clickable(e, tid) {
    var list = e.root.querySelectorAll('[data-testid="' + tid + '"]');
    for (var i = 0; i < list.length; i++) if (ui.reachable(list[i])) return list[i];
    return null;
  }
  // (3) Esc
  function back() {
    var e = topEntry(), id = e && e.id, d = e && e.def, n;
    if (!e) {
      // the garage with nothing open: ☰
      if (GG.state && ui.defined('menu')) { ui.show('menu'); return 'menu'; }
      return 'none';
    }
    if (id === 'confirm') { n = clickable(e, 'btn-confirm-no'); if (n) n.click(); else ui.close(id); return 'confirm-no'; }
    if (typeof d.back === 'function') { d.back(e); return 'fn'; }
    if (typeof d.back === 'string' && (n = clickable(e, d.back))) { n.click(); return 'back:' + d.back; }
    // (before the sticky check: calib and recap are sticky screens with their own way out)
    var kb = KEY_BACK[id];
    if (kb === 'close') { ui.close(id); return 'close'; }
    if (kb && (n = clickable(e, kb))) { n.click(); return 'back:' + kb; }
    if (STICKY[id] || d.sticky) return 'sticky';
    if (d.kind !== 'full') { ui.close(id); return 'close'; }
    if ((n = clickable(e, 'btn-back') || clickable(e, 'btn-close'))) { n.click(); return 'back:' + n.getAttribute('data-testid'); }
    return 'none';
  }
  // (tests: what Esc does on the top screen)
  ui.keyBack = function () { D.lastEsc = back(); return D.lastEsc; };
  // (7) the garage spots by number
  function spotKey(code) {
    var m = /^(?:Digit|Numpad)([1-8])$/.exec(code || '');
    return m ? +m[1] - 1 : -1;
  }
  ui.walkToSpot = function (action) {
    if (!action || !GG.state || ui.stackIds().length) return false;
    var R = GG.render, ok = false;
    try { ok = !!(R && R.goToHotspot && R.goToHotspot(action)); } catch (err) { ok = false; }
    if (!ok) GG.emit('hotspot', { action: action });
    D.nav = 'spot:' + action;
    return true;
  };

  function onKeyDown(ev) {
    if (I.captured && I.captured()) return;
    if (ev.isComposing || ev.keyCode === 229 || ev.key === 'Unidentified' || ev.key === 'Process') return;
    if (ev.ctrlKey || ev.metaKey || (ev.altKey && !altGr(ev))) return;
    var k = ev.key, code = ev.code || '', t = ev.target, typing = ui.isTyping(t);
    var isEnter = k === 'Enter', isSpace = k === ' ' || code === 'Space', isEsc = k === 'Escape', isTab = k === 'Tab', dir = ARROWS[k];
    // (0b) repeats + stale presses
    if ((isEsc || ((isEnter || isSpace) && !typing)) && ev.repeat) { swallow(ev, 'repeat'); return; }
    if ((isEnter || isSpace) && !typing && ev.timeStamp < ui.focusAt + STALE_MS) { swallow(ev, 'stale'); return; }
    if (isEnter || isSpace) down[code || k] = t;
    // (1) a live song: 55 has the keys
    if (I.gigLive && I.gigLive()) { if (isTab) ev.preventDefault(); return; }
    if ((isTab || isEnter || isEsc || dir || spotKey(code) >= 0) && I.real && I.real(ev)) kbnavOn(true);
    // (2) typing
    if (typing) {
      if (isEsc) { swallow(ev); t.blur(); D.lastEsc = 'blur'; return; }
      if (isTab) { swallow(ev); cycle(ev.shiftKey); }
      return;
    }
    // (3)
    if (isEsc) { swallow(ev); D.lastEsc = back(); return; }
    // (5)
    if (isTab) { swallow(ev); cycle(ev.shiftKey); return; }
    var a = document.activeElement;
    // (4)
    if (dir) {
      if (isOwnArrows(t) && !badFocus(a)) return;
      if (move(dir)) ev.preventDefault();
      return;
    }
    // (6) (a control under the top layer never clicks)
    if ((isEnter || isSpace) && (badFocus(a) || !inScope(a))) {
      swallow(ev);
      delete down[code || k];
      if (isEnter) { focusDefaultNow(); D.nav = 'enter:' + tidOf(document.activeElement); }
      return;
    }
    // (7)
    var i = spotKey(code);
    if (i >= 0 && !ui.stackIds().length && GG.state) {
      var spots = ui.kbSpots ? ui.kbSpots() : [];
      if (spots[i]) { ev.preventDefault(); ui.walkToSpot(spots[i]); }
    }
  }
  function onKeyUp(ev) {
    if (I.captured && I.captured()) return;
    var k = ev.key, code = ev.code || '', key = code || k;
    if (!(k === 'Enter' || k === ' ' || code === 'Space')) return;
    var was = down[key];
    delete down[key];
    if (I.gigLive && I.gigLive()) return;
    if (ui.isTyping(ev.target)) return;
    if (was !== ev.target) swallow(ev, was ? 'stale' : null);
  }
  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('keyup', onKeyUp, true);
  document.addEventListener('pointerdown', function () { kbnavOn(false); }, { capture: true, passive: true });
  window.addEventListener('blur', function () { down = {}; });
  GG.on('ui:wide', function () { if (ui.syncHints) ui.syncHints(); });
  GG.on('input:mode', function () { if (ui.syncHints) ui.syncHints(); });

  // The ring (keyboard mode only), kb-spots, kb-hints and the Esc caps. Every selector starts html.gg-kbnav / html.gg-wide
  // (tests/wide_css.test.js): a phone (no class set) never sees one of them.
  var CSS = 'html.gg-kbnav :focus-visible:not(input):not(textarea) { outline: 3px solid var(--amber); outline-offset: 2px; }\n'
    + 'html.gg-kbnav .seq-grid .cell:focus-visible { outline-offset: -2px; }\n'
    + 'html.gg-kbnav .kb-spots, html.gg-wide .kb-spots { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; }\n'
    + 'html.gg-kbnav .kb-spots > button, html.gg-wide .kb-spots > button { display: inline-flex; align-items: center; gap: 6px; min-height: 36px;'
    + ' padding: 4px 10px; border-radius: 99px; border: 1px solid rgba(255, 255, 255, .14); background: rgba(13, 18, 30, .82); color: var(--text);'
    + ' font: 700 13px/1.1 var(--font); cursor: pointer; }\n'
    + 'html.gg-kbnav .kb-spots > button b, html.gg-wide .kb-spots > button b { display: inline-grid; place-items: center; min-width: 20px; height: 20px;'
    + ' padding: 0 4px; border-radius: 5px; background: var(--panel2); border: 1px solid var(--line); color: var(--amber); font-size: 12px; }\n'
    + 'html.gg-wide .kb-hints { order: 99; flex: 0 0 auto; width: 100%; margin: 0; color: var(--faint); font: 600 12px/1.4 var(--font); text-align: center;'
    + ' letter-spacing: .02em; pointer-events: none; }\n'
    + 'html.gg-wide .sheet-foot:has(> .kb-hints), html.gg-wide .modal-foot:has(> .kb-hints), html.gg-wide .full-foot:has(> .kb-hints) { flex-wrap: wrap; }\n'
    + 'html.gg-wide.gg-keys [data-testid="btn-close"], html.gg-wide.gg-keys [data-testid="btn-back"] { position: relative; }\n'
    + 'html.gg-wide.gg-keys [data-testid="btn-close"]::after, html.gg-wide.gg-keys [data-testid="btn-back"]::after { content: "Esc"; position: absolute;'
    + ' top: 50%; transform: translateY(-50%); padding: 1px 5px; border-radius: 4px; background: var(--panel2); border: 1px solid var(--line);'
    + ' color: var(--dim); font: 700 10px/1.4 var(--font); letter-spacing: .04em; pointer-events: none; white-space: nowrap; }\n'
    + 'html.gg-wide.gg-keys [data-testid="btn-close"]::after { right: calc(100% + 6px); }\n'
    + 'html.gg-wide.gg-keys [data-testid="btn-back"]::after { left: calc(100% + 6px); }\n';
  (function inject() {
    if (document.getElementById('gg-keys-css')) return;
    var s = document.createElement('style'); s.id = 'gg-keys-css'; s.textContent = CSS;
    document.head.appendChild(s);
  })();

  GG.registerDebug('keys', function () {
    var a = document.activeElement;
    return { top: ui.top(), focus: badFocus(a) ? null : tidOf(a), opener: ui.openerOf ? ui.openerOf() : null, lastEsc: D.lastEsc, nav: D.nav,
      kbnav: root.classList.contains('gg-kbnav'), swallowed: { repeat: D.repeat, stale: D.stale } };
  });
})(window.GG);
