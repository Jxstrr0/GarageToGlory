// 50_ui_core.js: the reusable UI toolkit. el() DOM helper, a screen stack (full screens, bottom sheets,
// modals) with 'screen:open'/'screen:close' events, confirm dialogs, toasts, speech bubbles, tabs, meters,
// delta chips and avatars. Screens themselves live in 51–53 (they call GG.ui.define); routing is in 60_main.
//
//   GG.ui.define('plan', { kind: 'sheet', title: 'Plan the week', sticky: false, tall: false,
//                          build: function (s, data) { s.body.appendChild(...); s.foot.appendChild(...); },
//                          onClose: function (s) {} });
//   GG.ui.show('plan', data)  -> pushes it (or re-renders it if already open) ; GG.ui.close() pops the top
//   s = { id, data, root, body, foot, setTitle(text, sub), rerender(data?), close() }
// Kinds: 'full' covers the scene (60_main pauses the render), 'sheet' slides up from the bottom so the garage stays
// visible above it, 'modal' is a centred dialog. sticky: no close button and the scrim doesn't dismiss it.
// Local events (UI-internal, not in the contract): 'ui:stack' { ids } after every open/close (HUD visibility),
// 'ui:layout' { id } after a screen (re)renders (60_main re-frames the 3D garage above the topmost sheet).
// v1.5 "Desktop" (Lane N; plan_contract_1.5 §4.5): the focus manager. Every part is a no-op unless html.gg-kbnav is on
// (50k_ui_keys turns it on with a real Tab / arrow / Enter / Esc / digit and off on any pointerdown), so phones and the mouse
// never see a programmatic focus. ui.define(id, { …, back, focus, hints }): back = testid | fn(entry) (Esc, 50k);
// focus = testid | fn(entry) -> element | false (false: never focused by show(), the gig screens: 55 owns them);
// hints = text | fn(entry) (the kb-hints line). ui.focusDefault(id?): [data-autofocus] -> def.focus -> the foot's enabled
// .btn.primary -> the first enabled button -> btn-close (text inputs never). show() remembers the opener and focuses the
// default; render() restores the focused data-testid (+ index, preventScroll); close() -> the opener (connected, not
// inert; else the same testid in the new top), else the new top's default, else the dock's primary. Every programmatic
// focus stamps ui.focusAt (performance.now()) for 50k's stale-press guard. kb-hints (one line at the end of the top
// layer's foot) only while html.gg-wide.gg-keys, synced on render / stack changes / 'ui:wide' / 'input:mode'.
(function (GG) {
  var ui = GG.ui = GG.ui || {};
  var U = GG.util;
  // UI-only randomness (flavour lines, bubbles). Never the career RNG, so the sim stays deterministic.
  ui.rng = GG.RNG((Date.now() ^ 0x5bd1e995) >>> 0);
  ui.pick = function (arr) { return arr && arr.length ? arr[Math.floor(ui.rng.next() * arr.length)] : null; };

  /* ---- el(): tiny hyperscript --------------------------------------------------------------------
     el('button.btn.primary', { testid: 'btn-go', onclick: fn, disabled: true }, ['Go', childNode])
     attrs: text, testid, class, style (object|string), data (object), on<event>: fn, props below, else attributes. */
  var PROPS = { disabled: 1, value: 1, checked: 1, readOnly: 1, maxLength: 1, hidden: 1, placeholder: 1, type: 1, title: 1, htmlFor: 1 };
  ui.el = function (spec, attrs, kids) {
    if (attrs && (Array.isArray(attrs) || typeof attrs !== 'object' || attrs.nodeType)) { kids = attrs; attrs = null; }
    var m = /^([a-z0-9]*)(.*)$/i.exec(spec);
    var node = document.createElement(m[1] || 'div');
    (m[2].match(/[.#][^.#]+/g) || []).forEach(function (p) {
      if (p[0] === '.') node.classList.add(p.slice(1)); else node.id = p.slice(1);
    });
    if (attrs) for (var k in attrs) {
      var v = attrs[k];
      if (k === 'text') node.textContent = v == null ? '' : String(v);
      else if (k === 'testid') node.setAttribute('data-testid', v);
      else if (k === 'class') { if (v) String(v).split(/\s+/).forEach(function (c) { if (c) node.classList.add(c); }); }
      else if (k === 'style') { if (typeof v === 'string') node.style.cssText = v; else for (var sk in v) node.style[sk] = v[sk]; }
      else if (k === 'data') { for (var dk in v) node.dataset[dk] = v[dk]; }
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else if (PROPS[k]) node[k] = v;
      else if (v === true) node.setAttribute(k, '');
      else if (v != null && v !== false) node.setAttribute(k, v);
    }
    ui.append(node, kids);
    return node;
  };
  ui.append = function (node, kids) {
    if (kids == null || kids === false) return node;
    if (Array.isArray(kids)) { for (var i = 0; i < kids.length; i++) ui.append(node, kids[i]); return node; }
    node.appendChild(kids.nodeType ? kids : document.createTextNode(String(kids)));
    return node;
  };
  ui.clear = function (node) { while (node && node.firstChild) node.removeChild(node.firstChild); return node; };
  var el = ui.el;

  // el('button' + spec) with type=button. Flow buttons still guard double taps in their handlers (phase checks).
  ui.btn = function (spec, attrs, kids) {
    var node = el('button' + spec, attrs, kids);
    node.type = 'button';
    return node;
  };

  /* ---- Screen stack ------------------------------------------------------------------------------ */
  var defs = {}, stack = [];
  ui.define = function (id, def) { def.kind = def.kind || 'sheet'; defs[id] = def; };
  ui.defined = function (id) { return !!defs[id]; };
  ui.top = function () { return stack.length ? stack[stack.length - 1].id : null; };
  ui.isOpen = function (id) { return indexOf(id) >= 0; };
  ui.stackIds = function () { return stack.map(function (e) { return e.id; }); };
  ui.hasFull = function () { return stack.some(function (e) { return e.def.kind === 'full'; }); };
  function indexOf(id) { for (var i = 0; i < stack.length; i++) if (stack[i].id === id) return i; return -1; }
  function host() { return document.getElementById('screens'); }

  function frame(e) {
    var d = e.def, closable = !d.sticky;
    if (d.kind === 'full') {
      e.body = el('div.full-body'); e.foot = el('div.full-foot');
      e.root = el('div.layer.full-layer', { data: { screen: e.id } }, el('div.full' + (d.cls ? '.' + d.cls : ''), [e.body, e.foot]));
      return;
    }
    var scrim = el('div.scrim', { onclick: function () { if (closable && ui.top() === e.id) ui.close(e.id); } });
    e.titleEl = el('h2');
    e.body = el('div.sheet-body'); e.foot = el('div.sheet-foot');
    if (d.kind === 'modal') {
      e.body.className = 'modal-body'; e.foot.className = 'modal-foot';
      e.root = el('div.layer.modal-layer', { data: { screen: e.id } }, [scrim, el('section.modal', { role: 'dialog' }, [e.titleEl, e.body, e.foot])]);
      return;
    }
    var head = el('header.sheet-head', [e.titleEl,
      closable && el('button.icon-btn', { testid: 'btn-close', 'aria-label': 'Close', onclick: function () { ui.close(e.id); } }, '✕')]);
    e.root = el('div.layer.sheet-layer', { data: { screen: e.id } },
      [scrim, el('section.sheet' + (d.tall ? '.tall' : '') + (d.cls ? '.' + d.cls : ''), { role: 'dialog' }, [el('div.sheet-grip'), head, e.body, e.foot])]);
  }
  function render(e) {
    var keep = e.body && e.body.scrollTop;
    var fk = focusKey(e);   // v1.5: keyboard focus inside this screen survives the rebuild (no-op without gg-kbnav)
    ui.clear(e.body); ui.clear(e.foot);
    var t = e.def.title;
    e.setTitle(typeof t === 'function' ? t(e.data) : t || '');
    e.def.build(e, e.data);
    if (keep) e.body.scrollTop = keep;
    if (fk) restoreFocus(e, fk);
    syncHints(e);
    GG.emit('ui:layout', { id: e.id });
  }
  function makeEntry(id, data) {
    var e = { id: id, def: defs[id], data: data || {} };
    e.setTitle = function (text, sub) {
      if (!e.titleEl) return;
      ui.clear(e.titleEl);
      ui.append(e.titleEl, [sub ? el('span.sub', sub) : null, text || '']);
    };
    e.rerender = function (data) { if (data) e.data = data; if (indexOf(e.id) >= 0) render(e); };
    e.close = function () { ui.close(e.id); };
    return e;
  }
  function afterChange() {
    var coveredBelow = -1;   // screens under the topmost full screen are hidden (no see-through during fades)
    for (var j = stack.length - 1; j >= 0; j--) if (stack[j].def.kind === 'full') { coveredBelow = j; break; }
    for (var i = 0; i < stack.length; i++) {
      var top = i === stack.length - 1;
      stack[i].root.classList.toggle('hidden', i < coveredBelow);
      if (top) stack[i].root.removeAttribute('inert'); else stack[i].root.setAttribute('inert', '');
      stack[i].root.setAttribute('aria-hidden', top ? 'false' : 'true');
      if (!top) syncHints(stack[i]);   // v1.5: kb-hints sit in the top layer's foot only
    }
    if (stack.length) syncHints(stack[stack.length - 1]);
    GG.emit('ui:stack', { ids: ui.stackIds() });
  }

  // Opens a screen. If it's already open, everything above it closes and it re-renders with the new data.
  ui.show = function (id, data) {
    if (!defs[id]) { console.warn('[ui] unknown screen', id); return null; }
    var at = indexOf(id);
    if (at >= 0) {
      while (stack.length - 1 > at) ui.close();
      var ex = stack[at]; ex.data = data || ex.data; render(ex); afterChange();
      if (ui.kbnav() && !ex.root.contains(document.activeElement)) ui.focusDefault(id);   // v1.5
      return ex;
    }
    var e = makeEntry(id, data);
    e.opener = openerOf();   // v1.5: where the keyboard focus was (close() goes back there)
    ui.clearToasts();   // a new screen makes old hints stale (and they'd sit on its header)
    frame(e);
    stack.push(e);
    host().appendChild(e.root);
    render(e);
    afterChange();
    GG.emit('screen:open', { id: id });
    if (e.def.onShow) e.def.onShow(e);
    if (ui.kbnav() && ui.top() === id && stack[stack.length - 1] === e) ui.focusDefault(id);   // v1.5 (no-op without gg-kbnav)
    return e;
  };
  // Closes the top screen, or the screen `id` plus everything stacked above it.
  ui.close = function (id) {
    if (!stack.length) return;
    var at = id ? indexOf(id) : stack.length - 1;
    if (at < 0) return;
    var opener = stack[at].opener;   // v1.5: the lowest closed screen's opener
    while (stack.length > at) {
      var e = stack.pop();
      if (e.def.onClose) { try { e.def.onClose(e); } catch (err) { console.warn('[ui] onClose', err); } }
      if (e.root.parentNode) e.root.parentNode.removeChild(e.root);
      afterChange();
      GG.emit('screen:close', { id: e.id });
    }
    if (ui.kbnav()) focusAfterClose(opener);
  };
  ui.closeAll = function () { if (stack.length) ui.close(stack[0].id); };
  ui.replace = function (id, data) { if (stack.length) ui.close(); return ui.show(id, data); };
  ui.get = function (id) { var i = indexOf(id); return i >= 0 ? stack[i] : null; };

  /* ---- v1.5 (Lane N): keyboard focus (no-op unless html.gg-kbnav) ------------------------------------------------- */
  var NO_FOCUS = { gig: 1, 'gig-results': 1 };   // 55 owns focus on the gig screens (also def.focus === false)
  function now() { return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now(); }
  ui.focusAt = -1e9;   // performance.now() of the last programmatic focus move (50k: Enter / Space within 200 ms are stale)
  ui.kbnav = function () { return typeof document !== 'undefined' && document.documentElement.classList.contains('gg-kbnav'); };
  ui.isTyping = function (n) {
    if (!n || n.nodeType !== 1) return false;
    if (n.nodeName === 'INPUT') return !/^(button|submit|reset|checkbox|radio|range|color|file|image)$/i.test(n.type || 'text');
    return n.nodeName === 'TEXTAREA' || n.nodeName === 'SELECT' || !!n.isContentEditable;
  };
  // A control a key can reach: connected, rendered, visible, enabled, not under [inert] / .hidden / [hidden].
  ui.reachable = function (n) {
    if (!n || n.nodeType !== 1 || !n.isConnected || n.disabled) return false;
    if (!n.getClientRects().length || (n.closest && n.closest('[inert], .hidden, [hidden]'))) return false;
    var cs = getComputedStyle(n);
    return cs.visibility !== 'hidden' && cs.display !== 'none';
  };
  function usable(n) { return ui.reachable(n) && !ui.isTyping(n); }   // text inputs are never auto-focused
  // Focus n (stamped unless opts.nav: a Tab / arrow move is the player's own, never stale).
  ui.focusEl = function (n, opts) {
    if (!n || !n.focus) return false;
    if (!(opts && opts.nav)) ui.focusAt = now();
    try { n.focus({ preventScroll: !!(opts && opts.preventScroll) }); } catch (err) { n.focus(); }
    return document.activeElement === n;
  };
  function noFocus(e) { return !e || e.def.focus === false || !!NO_FOCUS[e.id]; }
  ui.noFocus = function (id) { return noFocus(id ? ui.get(id) : stack[stack.length - 1]); };
  function byTid(rootEl, tid) { return rootEl && tid ? rootEl.querySelectorAll('[data-testid="' + String(tid).replace(/"/g, '\\"') + '"]') : []; }
  function firstUsable(list) { for (var i = 0; i < list.length; i++) if (usable(list[i])) return list[i]; return null; }
  ui.defaultFocus = function (e) {
    if (!e) return null;
    var r = e.root, f = e.def.focus, n = firstUsable(r.querySelectorAll('[data-autofocus]'));
    if (n) return n;
    if (typeof f === 'function') { try { n = f(e); } catch (err) { n = null; } if (usable(n)) return n; }
    else if (typeof f === 'string' && (n = firstUsable(byTid(r, f)))) return n;
    if ((n = firstUsable(e.foot ? e.foot.querySelectorAll('.btn.primary') : []))) return n;
    var btns = [].slice.call(e.body ? e.body.querySelectorAll('button') : []).concat([].slice.call(e.foot ? e.foot.querySelectorAll('button') : []));
    if ((n = firstUsable(btns.filter(function (b) { return !isBackBtn(b); })))) return n;   // a screen's ← / ✕ only when it has nothing else
    return firstUsable(btns) || firstUsable(byTid(r, 'btn-close'));
  };
  function isBackBtn(b) { var t = b.getAttribute('data-testid') || '', l = b.getAttribute('aria-label') || ''; return /^(btn-back|btn-close)$/.test(t) || (b.classList.contains('icon-btn') && /^(Back|Close)\b/.test(l)); }
  function dockPrimary() { return firstUsable(byTid(document.getElementById('hud'), 'btn-primary')); }
  ui.focusDefault = function (id) {
    if (!ui.kbnav()) return false;
    var e = id ? ui.get(id) : stack[stack.length - 1];
    if (!e) return stack.length ? false : ui.focusEl(dockPrimary());
    if (noFocus(e)) return false;
    return ui.focusEl(ui.defaultFocus(e));
  };
  function keyOf(n, rootEl) {
    var tid = n && n.getAttribute && n.getAttribute('data-testid');
    if (!tid) return null;
    return { tid: tid, idx: Math.max(0, [].indexOf.call(byTid(rootEl || document, tid), n)) };
  }
  function openerOf() {
    var a = typeof document !== 'undefined' ? document.activeElement : null;
    if (!a || a === document.body || a === document.documentElement) return null;
    return { el: a, key: keyOf(a) };
  }
  function focusKey(e) {
    if (!ui.kbnav() || !e.root) return null;
    var a = document.activeElement;
    return a && a !== e.root && e.root.contains(a) ? keyOf(a, e.root) || { tid: null } : null;
  }
  function restoreFocus(e, fk) {
    var list = byTid(e.root, fk.tid), n = list.length ? list[Math.min(fk.idx, list.length - 1)] : null;
    if (usable(n)) ui.focusEl(n, { preventScroll: true });
    else if (!noFocus(e) && stack[stack.length - 1] === e) ui.focusDefault(e.id);
  }
  function focusOk(a) { return a && a !== document.body && a !== document.documentElement && ui.reachable(a); }
  function focusAfterClose(opener) {
    if (focusOk(document.activeElement)) return;   // something (a new screen) already holds the focus
    var top = stack[stack.length - 1];
    if (top && noFocus(top)) return;
    if (opener && usable(opener.el)) { ui.focusEl(opener.el); return; }   // (an opener under a lower layer is inert: not usable)
    if (opener && opener.key && top) {
      var list = byTid(top.root, opener.key.tid), n = list.length ? list[Math.min(opener.key.idx, list.length - 1)] : null;
      if (usable(n)) { ui.focusEl(n); return; }
    }
    if (top) ui.focusDefault(top.id); else ui.focusEl(dockPrimary());
  }
  ui.openerOf = function (id) { var e = id ? ui.get(id) : stack[stack.length - 1], o = e && e.opener; return o ? (o.key ? o.key.tid : o.el.nodeName.toLowerCase()) : null; };
  // kb-hints: one line of key hints at the end of the top layer's foot, only while html.gg-wide.gg-keys (never on a phone).
  var HINTS = 'Tab move · Enter pick · Esc close';
  function wantHints(e) {
    var c = document.documentElement.classList;
    return !!(e && e.foot && c.contains('gg-wide') && c.contains('gg-keys') && !noFocus(e) && stack[stack.length - 1] === e);
  }
  function syncHints(e) {
    if (!e || !e.foot || typeof document === 'undefined') return;
    var has = e.foot.querySelector(':scope > .kb-hints'), want = wantHints(e);
    if (!want) { if (has) has.parentNode.removeChild(has); return; }
    var h = e.def.hints, text = (typeof h === 'function' ? h(e) : h) || HINTS;
    if (has && has.textContent === text) return;
    if (has) has.parentNode.removeChild(has);
    e.foot.appendChild(el('div.kb-hints', { testid: 'kb-hints', 'aria-hidden': 'true' }, text));
  }
  ui.syncHints = function () { stack.forEach(syncHints); };

  /* ---- Confirm dialog ----------------------------------------------------------------------------
     GG.ui.confirm({ title, text, yes: 'Overwrite', no: 'Cancel', danger: true }).then(function (ok) { ... }) */
  ui.define('confirm', {
    kind: 'modal',
    focus: function (s) { return s.data.danger ? s.foot.querySelector('[data-testid="btn-confirm-no"]') : null; },   // v1.5: a danger ask starts on No
    title: function (d) { return d.title || 'Sure?'; },
    build: function (s, d) {
      if (d.text) s.body.appendChild(el('p.dim', d.text));
      var answered = false;
      function answer(v) { if (answered) return; answered = true; s.data._answer = v; ui.close(s.id); }
      // v1.3: two long labels (e.g. Keep my edits / Start over) wrap to 2 lines side by side at 147 px: stack them full width instead.
      if (Math.max(String(d.no || 'Nope').length, String(d.yes || 'Yes').length) > 10) s.foot.classList.add('stack');
      ui.append(s.foot, [
        ui.btn('.btn.ghost', { testid: 'btn-confirm-no', onclick: function () { answer(false); } }, d.no || 'Nope'),
        ui.btn('.btn' + (d.danger ? '.danger' : '.primary'), { testid: 'btn-confirm-yes', onclick: function () { answer(true); } }, d.yes || 'Yes')
      ]);
    },
    onClose: function (s) { if (s.data.resolve) s.data.resolve(!!s.data._answer); }
  });
  ui.confirm = function (opts) {
    return new Promise(function (resolve) { ui.show('confirm', Object.assign({}, opts, { resolve: resolve })); });
  };

  /* ---- Toasts and speech bubbles ----------------------------------------------------------------- */
  ui.toast = function (text, opts) {
    opts = opts || {};
    var box = document.getElementById('toast');
    if (!box || !text) return null;
    while (box.children.length >= 3) box.removeChild(box.firstChild);
    var t = el('div.toast' + (opts.kind ? '.' + opts.kind : ''), { role: 'status' }, [opts.who ? el('b', opts.who + ': ') : null, String(text)]);
    box.appendChild(t);
    var ms = opts.ms || Math.min(6000, 2200 + String(text).length * 35);
    setTimeout(function () { t.classList.add('out'); setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 320); }, ms);
    return t;
  };
  ui.clearToasts = function () {
    var box = document.getElementById('toast');
    Array.prototype.forEach.call(box ? box.children : [], function (t) { t.classList.add('out'); setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 320); });
  };
  // A speech bubble pointing at a screen position (CSS px), e.g. above a bandmate in the 3D garage.
  var bubbles = {};
  ui.bubble = function (text, pos, who, key) {
    var fx = document.getElementById('fx');
    if (!fx || !pos) return ui.toast(text, { who: who });
    key = key || who || 'x';
    if (bubbles[key] && bubbles[key].parentNode) bubbles[key].parentNode.removeChild(bubbles[key]);
    var w = window.innerWidth || 390;
    var b = el('div.bubble', [who ? el('b', who) : null, String(text)]);
    b.style.left = U.clamp(pos.x, 130, w - 130) + 'px';
    b.style.top = Math.max(120, pos.y - 34) + 'px';
    fx.appendChild(b);
    bubbles[key] = b;
    setTimeout(function () { b.classList.add('out'); setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 320); }, Math.min(5200, 2200 + String(text).length * 30));
    return b;
  };

  /* ---- Small widgets ---------------------------------------------------------------------------- */
  // Segmented tabs. tabs: [{ id, label }]; testids are prefix + id (e.g. 'laptop-tab-chat').
  ui.tabs = function (tabs, active, onPick, prefix) {
    return el('div.tabs', { role: 'tablist' }, tabs.map(function (t) {
      return el('button.tab' + (t.id === active ? '.on' : ''), { type: 'button', role: 'tab', testid: (prefix || 'tab-') + t.id,
        'aria-selected': t.id === active ? 'true' : 'false', onclick: function () { if (t.id !== active) onPick(t.id); } }, t.label);
    }));
  };
  // Horizontal meter 0..max. opts: { color, cls }
  ui.bar = function (value, max, opts) {
    opts = opts || {};
    var pct = U.clamp((Number(value) || 0) / (max || 100) * 100, 0, 100);
    return el('div.bar' + (opts.cls ? '.' + opts.cls : ''), [el('i', { style: { width: pct.toFixed(1) + '%', background: opts.color || '' } })]);
  };
  ui.moodColor = function (mood) { return mood >= 70 ? 'var(--good)' : mood >= 45 ? 'var(--amber)' : mood >= 25 ? '#ff8a4c' : 'var(--bad)'; };
  ui.moodLabel = function (mood) {
    return GG.career && GG.career.moodLabel ? GG.career.moodLabel(mood) : mood >= 70 ? 'happy' : mood >= 45 ? 'ok' : mood >= 25 ? 'grumpy' : 'sulking';
  };
  ui.moodEmoji = function (label) { return { happy: '😄', ok: '🙂', grumpy: '😒', sulking: '😤' }[label] || '🙂'; };

  /* ---- People: names, colours, avatars ------------------------------------------------------------ */
  var PALETTE = ['#e0603a', '#4f8cff', '#57c77a', '#9b6bff', '#ffb347', '#e05aa0', '#3cc1c8', '#c9a227'];
  function lum(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return 0;
    var n = parseInt(m[1], 16); return (0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255;
  }
  // A lighter version of a colour for text on the dark panels (mixes toward white until it reads).
  function readable(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex || ''), L = lum(hex);
    if (!m || L >= 0.55) return hex;
    var n = parseInt(m[1], 16), t = (0.55 - L) / (1 - L);
    return '#' + [n >> 16 & 255, n >> 8 & 255, n & 255].map(function (c) { return ('0' + Math.round(c + (255 - c) * t).toString(16)).slice(-2); }).join('');
  }
  function withText(w) { w.text = readable(w.color); return w; }
  ui.readable = readable;
  function bandOf(state) { var b = GG.content.bands; return b && state && b[state.bandId] || null; }
  // v1.1 review: the player's seat in words ('Drums' on the drum seat, as v1.0) and the seat's icon
  ui.SEAT_NAME = { drums: 'Drums', bass: 'Bass', rhythm: 'Rhythm guitar', lead: 'Lead guitar' };
  ui.seatOf = function (state) { return GG.career && GG.career.seatOf ? GG.career.seatOf(state || GG.state) : 'drums'; };
  ui.seatName = function (state) { return ui.SEAT_NAME[ui.seatOf(state)] || 'Drums'; };
  ui.seatIcon = function (state) { return ui.seatOf(state) === 'drums' ? '🥁' : '🎸'; };
  // Resolves a speaker/chat id to { id, name, short, nick, color, text, role } (text: colour readable on dark panels). Works for members, npcs, 'player' and raw names.
  ui.who = function (id, state) {
    state = state || GG.state;
    if (!id) return withText({ id: '', name: '???', short: '???', color: '#6f7a96', role: '' });
    if (id === 'recruit' || String(id).charAt(0) === '@') {   // v0.9 role aliases ('@front', ...) and the drama card's member
      var rid = ui.speaker(id, state);
      if (rid && rid !== id) return ui.who(rid, state);
      if (id !== 'recruit') return withText({ id: id, name: 'The band', short: 'The band', color: '#6f7a96', role: '' });
    }
    var band = bandOf(state), i, m;
    if (id === 'player' || id === 'you') {
      var p = state && state.player || {};
      var pc = p.look && p.look.shirt;
      return withText({ id: 'player', name: p.name || 'You', short: p.nick || p.name || 'You', color: lum(pc) > 0.12 ? pc : '#ffb347', role: ui.seatName(state) + ' (you)' });
    }
    var mems = (state && state.members) || (band && band.members) || [];
    for (i = 0; i < mems.length; i++) if (mems[i].id === id) {
      m = mems[i];
      var cm = band && band.members ? band.members.filter(function (x) { return x.id === id; })[0] : null;
      var shirt = (m.look && m.look.shirt) || (cm && cm.look && cm.look.shirt);
      var color = lum(shirt) > 0.12 ? shirt : PALETTE[i % PALETTE.length];
      var name = m.name || (cm && cm.name) || id;
      return withText({ id: id, name: name, short: String(name).split(' ')[0], nick: m.nick || (cm && cm.nick) || '', color: color,
        full: m.fullName || (cm && cm.fullName) || '', role: (state && GG.career && GG.career.stageRole ? GG.career.stageRole(state, m) : m.role) || (cm && cm.role) || '' });   // v1.1 review: the stage role (the swapped member: drums)
    }
    var npc = GG.content.npcs && GG.content.npcs[id];
    if (npc) return withText({ id: id, name: npc.name, short: npc.name, color: npc.color || PALETTE[GG.hashSeed(id) % PALETTE.length], role: npc.role || '' });
    // v0.9 leak net: another playable band's member never speaks in this career (the sim's speakerOk rule, UI side).
    if (state && state.bandId && ui.foreignMember(id, state)) return withText({ id: id, name: 'The band', short: 'The band', color: '#6f7a96', role: '' });
    var nice = String(id).replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    return withText({ id: id, name: nice, short: nice, color: PALETTE[GG.hashSeed(id) % PALETTE.length], role: '' });
  };
  /* ======================================================================================================
     v0.9 GENRES: band-aware helpers for every screen (plan_contract_0.9 §4.2-4.3). The sim (20_sim_career) owns the real
     resolvers (fillText's role tokens, career.roleOf / talkers / pool); these call them when they exist and otherwise
     follow the same rules, so UI copy never shows a raw {token}, a Hail Damage name in another band's career, or a speaker
     who isn't in this band. Pure reads of GG.state + content; UI randomness only (ui.rng).
       ui.band(st) · ui.memberDef(id, st) · ui.isSilent(id, st) · ui.active(st) · ui.talkers(st)
       ui.roleOf(role, st) -> member id|null   (front|soloist|filler|bassist|namer|grumbler|deadpan|driver|any; '@' optional)
       ui.speaker(id, st) -> a real id ('recruit' and '@role' aliases resolved)
       ui.tokens(st) -> { front, soloist, ..., space, door, province, homeVenue, superfan, rivalFront, ... } (C.TOKENS)
       ui.fill(text, st?, vars?) -> career.fillText + any v0.9 token the sim didn't resolve (vars: extra {key}s first)
       ui.pool(obj, key, st?) -> obj[key] + obj.byBand[bandId][key]   (career.pool when present)
       ui.lines(key, st?) = ui.pool(content.lines, key) · ui.bandLines(key, st?) = content.lines.byBand[bandId][key]
       ui.ownLines(list, st?) -> the lines that don't name another band's people (a leak net for flat pools)
       ui.line(list, fallback, st?) -> one filled line from own lines (else from fallback)
       ui.space(st, cap?) · ui.spaceKind(st) · ui.genreIcon(genre) · ui.driverOf(st) · ui.superfan(st) · ui.province(st)
     ====================================================================================================== */
  var GENRE_ICON = { metal: '🤘', punk: '🧷', rock: '🎸', country: '🤠' };
  ui.genreIcon = function (genre) { return GENRE_ICON[genre] || '🎵'; };
  ui.cap = function (s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); };
  ui.band = function (st) {
    st = st || GG.state; if (!st) return null;
    try { if (GG.career && GG.career.band) return GG.career.band(st); } catch (e) { /* fall through */ }
    return bandOf(st);
  };
  ui.memberDef = function (id, st) {
    var b = ui.band(st || GG.state);
    return b && b.members ? b.members.filter(function (m) { return m.id === id; })[0] || null : null;
  };
  // true for a member id of another playable band who isn't (and never was) in this career's lineup.
  var memberBand = null;
  ui.foreignMember = function (id, st) {
    st = st || GG.state; if (!id || !st || !st.bandId) return false;
    if ((st.members || []).some(function (m) { return m.id === id; })) return false;
    if (!memberBand) {
      memberBand = {};
      var B = GG.content.bands || {};
      Object.keys(B).forEach(function (k) { (B[k].members || []).forEach(function (m) { memberBand[m.id] = k; }); });
    }
    return !!memberBand[id] && memberBand[id] !== st.bandId;
  };
  ui.isSilent = function (id, st) { var m = ui.memberDef(id, st); return !!(m && m.silent); };
  ui.active = function (st) { return ((st || GG.state || {}).members || []).filter(function (m) { return m && (!m.status || m.status === 'active'); }); };
  // v0.9: a scripted exchange ([{ who, text }]: the red carpets) without this band's members who aren't in the lineup now
  // (quit, fired): their answer goes, and so does the question (reporter, npc, rival lines) that set it up. '@role' speakers
  // must resolve to someone in the lineup. null when no bandmate is left to answer (the caller's neutral '@role' set).
  ui.presentLines = function (list, st) {
    st = st || GG.state; if (!Array.isArray(list) || !st) return null;
    var act = {}, mine = {}, b = ui.band(st), out = [], ask = [], answered = 0;
    ui.active(st).forEach(function (m) { act[m.id] = 1; });
    ((b && b.members) || []).concat(st.members || []).forEach(function (m) { if (m && m.id) mine[m.id] = 1; });
    var K = GG.career;
    list.forEach(function (x) {
      var who = x && typeof x === 'object' ? x.who : null;
      var q = !who || who === 'reporter' || (!mine[who] && String(who).charAt(0) !== '@');
      // v1.1: a line gated off this seat (seat / swapped, career.speakerOk) is gone; an answer takes its question with it
      if (x && typeof x === 'object' && K && K.speakerOk && !K.speakerOk(st, q ? null : who, x)) { if (!q) ask = []; return; }
      if (q) { ask.push(x); return; }
      if (act[ui.speaker(who, st)]) { out = out.concat(ask, [x]); answered++; }
      ask = [];
    });
    return answered ? out.concat(ask) : null;
  };
  function asMember(st, x) { return typeof x === 'string' ? ui.active(st).filter(function (m) { return m.id === x; })[0] || null : x; }
  ui.talkers = function (st) {
    st = st || GG.state; if (!st) return [];
    if (GG.career && GG.career.talkers) {
      try { var t = GG.career.talkers(st); if (Array.isArray(t)) return t.map(function (x) { return asMember(st, x); }).filter(Boolean); } catch (e) { /* local rule */ }
    }
    return ui.active(st).filter(function (m) { return !m.silent && !ui.isSilent(m.id, st); });
  };
  function has(st, id) { return id && ui.active(st).some(function (m) { return m.id === id; }) ? id : null; }
  function gigRoles(st) {
    try { if (GG.gig && GG.gig.roles) return GG.gig.roles(st) || {}; } catch (e) { /* local rule */ }
    var act = ui.active(st), front = null, solo = null, fill = null, i;
    for (i = 0; i < act.length && !front; i++) if (/vocals/.test(act[i].role || '')) front = act[i].id;
    ['lead guitar', 'guitar', 'fiddle'].forEach(function (r) { act.forEach(function (m) { if (!solo && m.role === r) solo = m.id; }); });
    ['rhythm guitar', 'fiddle', 'guitar', 'bass'].forEach(function (r) { act.forEach(function (m) { if (!fill && m.role === r && m.id !== solo) fill = m.id; }); });
    return { front: front, solo: solo, fill: fill };
  }
  ui.roleOf = function (role, st) {
    st = st || GG.state; if (!st) return null;
    role = String(role || '').replace(/^@/, '');
    if (GG.career && GG.career.roleOf) {
      try { var r = GG.career.roleOf(st, role); if (r) return typeof r === 'string' ? r : r.id || null; } catch (e) { /* local rule */ }
    }
    var b = ui.band(st) || {}, R = b.roles || {}, talk = ui.talkers(st);
    switch (role) {
      case 'front': case 'singer': return gigRoles(st).front || null;
      case 'soloist': case 'solo': return gigRoles(st).solo || null;
      case 'filler': case 'fill': return gigRoles(st).fill || null;
      case 'bassist': return (ui.active(st).filter(function (m) { return /bass/.test(m.role || ''); })[0] || {}).id || null;
      case 'namer': case 'grumbler': return has(st, R[role]) || gigRoles(st).front || (talk[0] && talk[0].id) || null;
      case 'deadpan': return has(st, R.deadpan) || (talk.length ? talk[talk.length - 1].id : null);
      case 'driver': var d = ui.driverOf(st); return d && !d.you ? d.id : null;
      case 'any': var p = ui.pick(talk); return p ? p.id : null;
    }
    return null;
  };
  // 'recruit' (the drama card's member) and '@role' aliases -> a member id (the sim writes state.card.roles at draw time).
  ui.speaker = function (id, st) {
    st = st || GG.state; if (!id || !st) return id;
    if (id === 'recruit') return (st.card && st.card.who) || id;
    if (String(id).charAt(0) !== '@') return id;
    var map = st.card && st.card.roles, m = map && (map[id] || map[id.slice(1)]);
    return m || ui.roleOf(id, st) || id;
  };
  ui.driverOf = function (st) {
    st = st || GG.state;
    try { if (st && GG.world && GG.world.driver) return GG.world.driver(st); } catch (e) { /* no world */ }
    return { id: 'you', name: 'You', you: true, def: {}, dashboard: null };
  };
  ui.spaceKind = function (st) { var b = ui.band(st || GG.state), K = GG.contracts.SPACE_KINDS || {}; return (b && K[b.space]) || 'garage'; };
  // The band's home-space noun: 'the garage' | 'the basement' | 'Unit 4B' | 'the Quonset' (cap: sentence case).
  ui.space = function (st, capital) { var b = ui.band(st || GG.state), s = (b && b.spaceShort) || 'the garage'; return capital ? ui.cap(s) : s; };
  // The room you rehearse in right now (tier 0 = the band's space; rented rooms localised per city by 5k's ui.spaceLocal).
  ui.spaceName = function (st) {
    st = st || GG.state; if (!st) return ui.space(st, true);
    var d = null; try { d = GG.shop && GG.shop.spaceDef ? GG.shop.spaceDef(st, st.spaceTier || 0) : null; } catch (e) { d = null; }
    if (d && ui.spaceLocal) d = ui.spaceLocal(st, d);
    return (d && d.name) || ui.space(st, true);
  };
  ui.province = function (st) {
    st = st || GG.state; var b = ui.band(st);
    if (b && b.province) return b.province;
    var c = GG.world && GG.world.city && st ? GG.world.city(st.city) : null;
    return (c && c.province) || 'SK';
  };
  ui.superfan = function (st) {
    st = st || GG.state;
    try { var hs = st && GG.fans && GG.fans.homeSuperfan ? GG.fans.homeSuperfan(st) : null; if (hs && (hs.short || hs.name)) return hs.short || String(hs.name).split(' ')[0]; } catch (e) { /* content read below */ }
    var bb = GG.content.bandbook || {}, h = bb.homeSuperfan && st && bb.homeSuperfan[st.bandId];
    if (h && (h.short || h.name)) return h.short || String(h.name).split(' ')[0];
    var d = GG.fans && GG.fans.superfanDef ? GG.fans.superfanDef('dale') : null;
    return (d && (d.short || d.name)) || 'your number-one fan';
  };
  function homeVenue(st) {
    var best = null, n = -1, V = GG.gig && GG.gig.venue;
    Object.keys(st.venueLast || {}).forEach(function (id) {
      var v = V ? V(id) : null, r = (st.venueRep || {})[id] || 0;
      if (v && v.city === st.city && r > n) { best = v; n = r; }
    });
    var b = ui.band(st), fg = !best && b && b.firstGig && V ? V(b.firstGig) : null;
    return (best || fg || {}).name || 'the first house party';
  }
  function rivalFront(st) {
    try { var fn = GG.rival && GG.rival.frontName ? GG.rival.frontName(st) : ''; if (fn) return fn; } catch (e) { /* the cast read below */ }
    var c = null; try { c = GG.rival && GG.rival.cast ? GG.rival.cast(st) : null; } catch (e) { c = null; }
    var m = c && (c.members || []).filter(function (x) { return x.id === c.frontman; })[0] || (c && c.members && c.members[0]);
    return m ? m.name || String(m.fullName || '').split(' ')[0] : 'their singer';
  }
  // Every C.TOKENS value for this career (plan_contract_0.9 §4.2 fallbacks). Lazy per call site; cheap.
  ui.tokens = function (st) {
    st = st || GG.state;
    var b = ui.band(st) || {}, nm = function (role, fb) { var id = st ? ui.roleOf(role, st) : null; return id ? ui.who(id, st).short : fb; };
    var d = st ? ui.driverOf(st) : null;
    return {
      front: nm('front', 'the singer'), soloist: nm('soloist', 'the guitarist'), filler: nm('filler', 'somebody'), bassist: nm('bassist', 'the bassist'),
      namer: nm('namer', 'the singer'), grumbler: nm('grumbler', 'somebody'), deadpan: nm('deadpan', 'somebody'),
      driver: d && !d.you ? d.name : 'you',
      van: (st && st.van && st.van.name) || (GG.shop && GG.shop.vanName && st ? GG.shop.vanName(st.bandId, 0) : 'the van'),
      space: ui.space(st), spaceName: b.spaceName || ui.space(st), door: b.door || 'the door', province: ui.province(st),
      homeVenue: st ? homeVenue(st) : 'the first house party', superfan: ui.superfan(st), rivalFront: st ? rivalFront(st) : 'their singer',
      city: (st && st.city) || b.city || 'town', rival: st && GG.rival && GG.rival.name ? GG.rival.name(st) : 'the other band',
      band: b.name || 'the band', player: (st && st.player && (st.player.nick || st.player.name)) || 'you',
      instrument: 'drums', drummer: 'you',   // v1.0 (E12) seat tokens, the no-state fallback (with a state, career.fillText fills them)
      gear: 'kit', sticks: 'sticks', yourPart: 'the beat', seat: 'drums'   // v1.1: the drum seat's words (C.SEAT_TOKENS.drums)
    };
  };
  var TOKEN_RE = /\{(front|soloist|filler|bassist|namer|grumbler|deadpan|driver|van|space|spaceName|door|province|homeVenue|superfan|rivalFront|city|rival|band|player|instrument|drummer|gear|sticks|yourPart|seat)\}/g;
  ui.fill = function (text, st, vars) {
    if (text == null) return '';
    st = st || GG.state; text = String(text);
    var lead = text.charAt(0) === '{';   // a line that opens on a token starts with a capital, whoever resolves it
    if (vars) text = text.replace(/\{(\w+)\}/g, function (a, k) { return vars[k] != null ? String(vars[k]) : a; });
    if (st && GG.career && GG.career.fillText) { try { text = GG.career.fillText(st, text); } catch (e) { /* local tokens below */ } }
    if (text.indexOf('{') >= 0) {
      var T = null;
      text = text.replace(TOKEN_RE, function (a, k) { T = T || ui.tokens(st); return T[k] != null ? String(T[k]) : a; });
    }
    return lead ? ui.cap(text) : text;   // "{space} was quiet." -> "The garage was quiet."
  };
  ui.pool = function (obj, key, st) {
    st = st || GG.state; if (!obj) return [];
    if (st && GG.career && GG.career.pool) { try { var p = GG.career.pool(st, obj, key); if (Array.isArray(p)) return p; } catch (e) { /* local rule */ } }
    var a = obj[key], bb = obj.byBand && st && obj.byBand[st.bandId], x = bb && bb[key];
    return (Array.isArray(a) ? a : []).concat(Array.isArray(x) ? x : []);
  };
  ui.lines = function (key, st) { return ui.pool(GG.content.lines, key, st); };
  ui.bandLines = function (key, st) { st = st || GG.state; var L = GG.content.lines, bb = L && L.byBand && st && L.byBand[st.bandId]; return bb ? bb[key] : undefined; };
  // Leak net: names of every other playable band's people (and Hail Damage's world when it isn't yours).
  var foreignRe = {};
  function esc(w) { return String(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function foreign(st) {
    var id = st && st.bandId || '';
    // (a word that is part of someone in this career's name is theirs: a recruit called Tamara in a Hail Damage career)
    var mine = ((st && st.members) || []).map(function (m) { return [m.name, m.nick, m.fullName].filter(Boolean).join(' '); }).join(' | '), key = id + '#' + mine;
    if (foreignRe[key] !== undefined) return foreignRe[key];
    var words = [], bands = GG.content.bands || {};
    Object.keys(bands).forEach(function (k) {
      if (k === id) return;
      (bands[k].members || []).forEach(function (m) { [m.name, m.nick, String(m.fullName || '').replace(/"[^"]*"\s*/, '')].forEach(function (w) { if (w && w.length > 2) words.push(w); }); });
    });
    if (id !== 'hail_damage') words.push('Baba', 'Moose Hearse', 'HALE DAMAGE', 'Lord Abyssus');
    words = words.filter(function (w, i) { return words.indexOf(w) === i && !new RegExp('\\b' + esc(w) + '\\b').test(mine); }).map(esc);
    if (Object.keys(foreignRe).length > 40) foreignRe = {};   // (keyed by lineup: a long career rebuilds now and then)
    foreignRe[key] = words.length ? new RegExp('\\b(' + words.join('|') + ')\\b') : null;
    return foreignRe[key];
  }
  ui.ownLines = function (list, st) {
    st = st || GG.state; if (!Array.isArray(list)) return [];
    var re = foreign(st), b = ui.band(st), notTW = !!(b && b.rival && b.rival !== 'tundra_wraith');   // (by id: a rebrand keeps them)
    return list.filter(function (x) {
      var t = typeof x === 'string' ? x : x && x.text; if (!t) return false;
      if (re && re.test(t)) return false;
      return !(notTW && /Tundra Wraith|Gord\b|Grimnir/.test(t));
    });
  };
  // A group-chat message this career may show: not from (or about) another band's people. The sim's speakerOk guard
  // (20_sim_career) keeps them out at the source; this is the display-side net.
  ui.chatOk = function (m, st) { st = st || GG.state; return !!m && !ui.foreignMember(m.who, st) && ui.ownLines([String(m.text || '')], st).length > 0; };
  ui.line = function (list, fallback, st) {
    st = st || GG.state;
    var own = ui.ownLines(list, st);
    if (!own.length) own = ui.ownLines(fallback, st);
    if (!own.length) own = fallback || [];
    var p = ui.pick(own);
    return p == null ? '' : ui.fill(typeof p === 'string' ? p : p.text, st);
  };
  // A sim-produced line (results, verdicts, awards, news) through the display-side leak net: filled when it's this
  // band's, else `fallback` (a string or a list; filled) or null when there is none. The sim's pool/speakerOk rules keep
  // other bands' people out at the source; this only catches what slips through before content lands.
  ui.safeLine = function (text, fallback, st) {
    st = st || GG.state;
    if (text != null && ui.ownLines([String(text)], st).length) return ui.fill(text, st);
    if (fallback == null) return null;
    return ui.line(Array.isArray(fallback) ? fallback : [fallback], null, st) || null;
  };

  ui.initials = function (name) {
    var w = String(name || '?').replace(/[^\p{L}\p{N} ]/gu, ' ').trim().split(/\s+/).filter(Boolean);
    if (!w.length) return '?';
    return (w.length > 1 ? w[0][0] + w[w.length - 1][0] : w[0].slice(0, 2)).toUpperCase();
  };
  ui.avatar = function (who, size) {
    who = typeof who === 'string' ? ui.who(who) : who;
    return el('div.avatar' + (size ? '.' + size : ''), { style: { background: who.color, color: lum(who.color) > 0.55 ? '#141824' : '#fff' }, title: who.name },
      ui.initials(who.name));
  };

  /* ---- Delta chips -------------------------------------------------------------------------------
     deltas: { fund, fans, buzz, chemistry, burnout, drumSkill, mood: { id: n }, skill: { id: n } } (what actually changed)
     opts: { emptyText, testid } (v1.0: testid = a prefix; each stat chip gets <prefix><stat>, e.g. 'wrap-d-fans') */
  var STAT_CHIP = [
    ['fund', function (v) { return (v > 0 ? '+' : '') + U.fmtMoney(v); }, 1],
    ['fans', function (v) { return U.signed(v) + ' fans'; }, 1],
    ['buzz', function (v) { return 'Buzz ' + U.signed(v); }, 1],
    ['chemistry', function (v) { return 'Chem ' + U.signed(v); }, 1],
    ['burnout', function (v) { return 'Burnout ' + U.signed(v); }, -1],
    ['drumSkill', function (v) { return 'Your chops ' + U.signed(v); }, 1]
  ];
  ui.deltaChips = function (d, opts) {
    opts = opts || {};
    var chips = [];
    if (d) {
      STAT_CHIP.forEach(function (c) {
        var v = Math.round(d[c[0]] || 0); if (!v) return;
        chips.push(el('span.chip.' + (v * c[2] > 0 ? 'up' : 'down'), opts.testid ? { testid: opts.testid + c[0] } : null, c[1](v)));   // v1.0: wrap-d-<stat> (lessons point at it)
      });
      ['mood', 'skill'].forEach(function (k) {
        var map = d[k]; if (!map || typeof map !== 'object') return;
        Object.keys(map).forEach(function (id) {
          var v = Math.round(map[id] || 0); if (!v) return;
          var nm = id === 'all' ? 'Everyone' : ui.who(id).short;
          chips.push(el('span.chip.' + (v > 0 ? 'up' : 'down'), nm + (k === 'mood' ? (v > 0 ? ' 🙂 ' : ' 😒 ') : ' skill ') + U.signed(v)));
        });
      });
      if (d.book) chips.push(el('span.chip.up', '📅 Gig booked'));
      if (d.payCut) chips.push(el('span.chip', "Band's cut " + (d.payCut > 0 ? '+' : '−') + Math.round(Math.abs(d.payCut) * 100) + '%'));   // v0.4 drama
      if (d.production) chips.push(el('span.chip.' + (d.production > 0 ? 'up' : 'down'), 'Production ' + U.signed(d.production)));   // v0.5 studio events
      if (d.repay) chips.push(el('span.chip.up', 'Paid back ' + U.fmtMoney(d.repay)));
      if (d.shop && ui.shopChips) ui.shopChips(d.shop).forEach(function (c) { chips.push(c); });   // v0.8: shop cards (moves, gear, stock, the misprint)
      (d.member || []).forEach(function (x) {
        var t = { settle: ['up', ' stays'], quit: ['down', ' quits'], 'return': ['up', ' is back'], later: ['', ' waits'], rival: ['down', ' joins the rival'] }[x.act] || ['', ''];
        chips.push(el('span.chip' + (t[0] ? '.' + t[0] : ''), (x.name || ui.who(x.id).short) + t[1]));
      });
    }
    if (!chips.length && opts.emptyText !== false) chips.push(el('span.chip', opts.emptyText || 'No change'));
    return el('div.chips', chips);
  };

  /* ---- Init: layers and global listeners ------------------------------------------------------------ */
  ui.init = function () {
    if (ui._inited) return; ui._inited = true;
    var app = document.getElementById('app');
    if (app && !document.getElementById('fx')) app.insertBefore(el('div#fx'), document.getElementById('toast'));
    // Every button tap clicks (sfx) unless it opted out with data-silent.
    document.addEventListener('click', function (e) {
      var b = e.target && e.target.closest && e.target.closest('button');
      if (b && !b.disabled && !b.hasAttribute('data-silent') && GG.audio) GG.audio.sfx('tap');
    }, true);
  };

  // Placeholder so callers can refresh the HUD before 52_ui_week installs the real one.
  ui.refreshHud = ui.refreshHud || function () {};

  GG.registerDebug('ui', function () { return { screen: ui.top(), stack: ui.stackIds() }; });
})(window.GG);
