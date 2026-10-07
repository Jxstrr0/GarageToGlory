// 50b_ui_input.js (v1.5 "Desktop", stage 0, lead; plan_contract_1.5 §4.2): GG.input — what the player plays with (keys or
// touch), whether this is a computer (fine pointer + hover), the PC-layout switch (html.gg-wide), the one exclusive key-capture
// slot (rebinding, key calibration) and the live-song flag. DOM; never loaded by node. Listeners only (no rAF, no observer);
// no styles here (the PC layout's CSS is 5w_ui_wide's, the focus ring 50k_ui_keys').
//   GG.input.real(ev) -> true only for a trusted keydown with a code, not composing (IME / Gboard 229 / Unidentified /
//     Process / Dead), outside input / textarea / select / contenteditable. Only a real non-modifier keydown counts toward
//     mode, kbSeen, learned (and the router's gg-kbnav): typing on a phone's on-screen keyboard never does.
//   mode() 'keys'|'touch' (a real keydown -> keys; a touch / pen pointerdown -> touch; the mouse never changes it; starts
//     desk ? 'keys' : 'touch') ; desk() (matchMedia '(hover: hover) and (pointer: fine)', live) ; kbSeen() (this session) ;
//     learned() { code: printed key } (real keydowns without Ctrl / Alt / Meta) ; wide() ; showKeyUI() = desk || kbSeen || wide ;
//     layoutPref() 'auto'|'phone'|'wide' (settings.layout).
//   <html> classes: gg-desk (desk), gg-keys (mode keys), gg-wide (GG.prefs.layoutFor(innerWidth, innerHeight, desk, layout);
//     re-checked on resize (200 ms debounce), the media change and settings:changed { layout }; never while a song is live:
//     it waits for gigLive(false)). None of them is set in a phone context before a real key press.
//   Events: 'input:mode' { mode } ; 'ui:wide' { wide }. GG.ui.wide() -> bool.
//   capture(fn) -> release(): one exclusive slot. A window capture-phase keydown / keyup listener (registered first, at load)
//     stops every key while it is held (preventDefault + stopImmediatePropagation) and hands fn(ev) only trusted, non-repeat,
//     non-IME keydowns of a key that went down after the capture started (a key already down is ignored until released).
//     Keyups, repeats and IME events are swallowed, never passed. A new capture replaces the old one.
//   gigLive(on?) -> bool: 55 sets true at count-in / resume, false at pause, song end, teardown.
//   debug('input') = { mode, desk, wide, layout, kbSeen, kbnav, live, captured, learned: n, lastReal }.
(function (GG) {
  var ui = GG.ui = GG.ui || {};
  var I = GG.input = GG.input || {};
  var root = document.documentElement;
  var MODS = { Shift: 1, Control: 1, Alt: 1, AltGraph: 1, Meta: 1, OS: 1, CapsLock: 1, Fn: 1, FnLock: 1, Hyper: 1, Super: 1, Symbol: 1, SymbolLock: 1, NumLock: 1, ScrollLock: 1 };
  var NOKEY = { Unidentified: 1, Process: 1, Dead: 1 };
  var mq = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)') : null;
  var st = { desk: !!(mq && mq.matches), mode: 'touch', kbSeen: false, learned: {}, nLearned: 0, lastReal: null, live: false, wide: false,
    cap: null, capStale: null, down: {}, resizeT: 0, pending: false };
  st.mode = st.desk ? 'keys' : 'touch';

  function prefs() { try { return GG.prefs ? GG.prefs.get() : {}; } catch (e) { return {}; } }
  function typing(t) {
    if (!t || t.nodeType !== 1) return false;
    var n = t.nodeName;
    return n === 'INPUT' || n === 'TEXTAREA' || n === 'SELECT' || !!t.isContentEditable;
  }
  I.real = function (ev) {
    return !!(ev && ev.isTrusted && ev.code && !ev.isComposing && ev.keyCode !== 229 && !NOKEY[ev.key] && !typing(ev.target));
  };
  function cls(name, on) { if (root.classList.contains(name) !== !!on) root.classList.toggle(name, !!on); }
  function setMode(m) {
    if (st.mode === m) return;
    st.mode = m; cls('gg-keys', m === 'keys');
    GG.emit('input:mode', { mode: m });
  }
  I.layoutPref = function () { var l = prefs().layout; return l === 'phone' || l === 'wide' ? l : 'auto'; };
  function wideNow() { return GG.prefs && GG.prefs.layoutFor ? GG.prefs.layoutFor(window.innerWidth, window.innerHeight, st.desk, I.layoutPref()) : false; }
  function checkWide() {
    if (st.live) { st.pending = true; return; }
    st.pending = false;
    var w = !!wideNow();
    if (w === st.wide) return;
    st.wide = w; cls('gg-wide', w);
    GG.emit('ui:wide', { wide: w });
  }

  // The key listeners: registered at load (before 50k's router and 55's gig keys), window, capture phase.
  function onKeyDown(ev) {
    if (ev.isTrusted && ev.code) st.down[ev.code] = 1;
    if (I.real(ev) && !MODS[ev.key]) {
      st.lastReal = ev.code;
      if (!st.kbSeen) st.kbSeen = true;
      if (!ev.ctrlKey && !ev.altKey && !ev.metaKey && typeof ev.key === 'string' && ev.key.length === 1 && st.learned[ev.code] !== ev.key) {
        if (!(ev.code in st.learned)) st.nLearned++;
        st.learned[ev.code] = ev.key;
      }
      setMode('keys');
    }
    if (st.cap) {
      ev.preventDefault(); ev.stopImmediatePropagation();
      if (!ev.isTrusted || ev.repeat || ev.isComposing || ev.keyCode === 229 || (st.capStale && st.capStale[ev.code])) return;
      var fn = st.cap.fn;
      try { fn(ev); } catch (e) { console.error('[input] capture', e); }
    }
  }
  function onKeyUp(ev) {
    if (ev.code) { delete st.down[ev.code]; if (st.capStale) delete st.capStale[ev.code]; }
    if (st.cap) { ev.preventDefault(); ev.stopImmediatePropagation(); }
  }
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('keyup', onKeyUp, true);
  window.addEventListener('blur', function () { st.down = {}; if (st.capStale) st.capStale = {}; });
  window.addEventListener('pointerdown', function (ev) { if (ev.pointerType === 'touch' || ev.pointerType === 'pen') setMode('touch'); }, { capture: true, passive: true });
  window.addEventListener('resize', function () { clearTimeout(st.resizeT); st.resizeT = setTimeout(checkWide, 200); });
  if (mq) {
    var onMq = function () { st.desk = !!mq.matches; cls('gg-desk', st.desk); checkWide(); };
    if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq);
  }
  GG.on('settings:changed', function (p) { if (p && p.keys && p.keys.indexOf('layout') >= 0) checkWide(); });

  I.capture = function (fn) {
    var tok = { fn: fn };
    st.cap = tok; st.capStale = {};
    for (var c in st.down) st.capStale[c] = 1;
    return function release() { if (st.cap === tok) { st.cap = null; st.capStale = null; } };
  };
  I.captured = function () { return !!st.cap; };
  I.gigLive = function (on) {
    if (on != null) { st.live = !!on; if (!st.live && st.pending) checkWide(); }
    return st.live;
  };
  I.mode = function () { return st.mode; };
  I.desk = function () { return st.desk; };
  I.kbSeen = function () { return st.kbSeen; };
  I.learned = function () { return Object.assign({}, st.learned); };
  I.wide = function () { return st.wide; };
  I.showKeyUI = function () { return st.desk || st.kbSeen || st.wide; };
  ui.wide = I.wide;

  // start: the classes from what this device is (a phone context sets none)
  cls('gg-desk', st.desk); cls('gg-keys', st.mode === 'keys');
  st.wide = !!wideNow(); cls('gg-wide', st.wide);

  GG.registerDebug('input', function () {
    return { mode: st.mode, desk: st.desk, wide: st.wide, layout: I.layoutPref(), kbSeen: st.kbSeen, kbnav: root.classList.contains('gg-kbnav'),
      live: st.live, captured: !!st.cap, learned: st.nLearned, lastReal: st.lastReal };
  });
})(window.GG);
