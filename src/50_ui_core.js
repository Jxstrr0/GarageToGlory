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
    ui.clear(e.body); ui.clear(e.foot);
    var t = e.def.title;
    e.setTitle(typeof t === 'function' ? t(e.data) : t || '');
    e.def.build(e, e.data);
    if (keep) e.body.scrollTop = keep;
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
    }
    GG.emit('ui:stack', { ids: ui.stackIds() });
  }

  // Opens a screen. If it's already open, everything above it closes and it re-renders with the new data.
  ui.show = function (id, data) {
    if (!defs[id]) { console.warn('[ui] unknown screen', id); return null; }
    var at = indexOf(id);
    if (at >= 0) {
      while (stack.length - 1 > at) ui.close();
      var ex = stack[at]; ex.data = data || ex.data; render(ex); afterChange();
      return ex;
    }
    var e = makeEntry(id, data);
    ui.clearToasts();   // a new screen makes old hints stale (and they'd sit on its header)
    frame(e);
    stack.push(e);
    host().appendChild(e.root);
    render(e);
    afterChange();
    GG.emit('screen:open', { id: id });
    if (e.def.onShow) e.def.onShow(e);
    return e;
  };
  // Closes the top screen, or the screen `id` plus everything stacked above it.
  ui.close = function (id) {
    if (!stack.length) return;
    var at = id ? indexOf(id) : stack.length - 1;
    if (at < 0) return;
    while (stack.length > at) {
      var e = stack.pop();
      if (e.def.onClose) { try { e.def.onClose(e); } catch (err) { console.warn('[ui] onClose', err); } }
      if (e.root.parentNode) e.root.parentNode.removeChild(e.root);
      afterChange();
      GG.emit('screen:close', { id: e.id });
    }
  };
  ui.closeAll = function () { if (stack.length) ui.close(stack[0].id); };
  ui.replace = function (id, data) { if (stack.length) ui.close(); return ui.show(id, data); };
  ui.get = function (id) { var i = indexOf(id); return i >= 0 ? stack[i] : null; };

  /* ---- Confirm dialog ----------------------------------------------------------------------------
     GG.ui.confirm({ title, text, yes: 'Overwrite', no: 'Cancel', danger: true }).then(function (ok) { ... }) */
  ui.define('confirm', {
    kind: 'modal',
    title: function (d) { return d.title || 'Sure?'; },
    build: function (s, d) {
      if (d.text) s.body.appendChild(el('p.dim', d.text));
      var answered = false;
      function answer(v) { if (answered) return; answered = true; s.data._answer = v; ui.close(s.id); }
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
  function bandOf(state) { var b = GG.content.bands; return b && state && b[state.bandId] || null; }
  // Resolves a speaker/chat id to { id, name, short, nick, color, text, role } (text: colour readable on dark panels). Works for members, npcs, 'player' and raw names.
  ui.who = function (id, state) {
    state = state || GG.state;
    if (!id) return withText({ id: '', name: '???', short: '???', color: '#6f7a96', role: '' });
    var band = bandOf(state), i, m;
    if (id === 'player' || id === 'you') {
      var p = state && state.player || {};
      var pc = p.look && p.look.shirt;
      return withText({ id: 'player', name: p.name || 'You', short: p.nick || p.name || 'You', color: lum(pc) > 0.12 ? pc : '#ffb347', role: 'Drums (you)' });
    }
    var mems = (state && state.members) || (band && band.members) || [];
    for (i = 0; i < mems.length; i++) if (mems[i].id === id) {
      m = mems[i];
      var cm = band && band.members ? band.members.filter(function (x) { return x.id === id; })[0] : null;
      var shirt = (m.look && m.look.shirt) || (cm && cm.look && cm.look.shirt);
      var color = lum(shirt) > 0.12 ? shirt : PALETTE[i % PALETTE.length];
      var name = m.name || (cm && cm.name) || id;
      return withText({ id: id, name: name, short: String(name).split(' ')[0], nick: m.nick || (cm && cm.nick) || '', color: color,
        full: m.fullName || (cm && cm.fullName) || '', role: m.role || (cm && cm.role) || '' });
    }
    var npc = GG.content.npcs && GG.content.npcs[id];
    if (npc) return withText({ id: id, name: npc.name, short: npc.name, color: npc.color || PALETTE[GG.hashSeed(id) % PALETTE.length], role: npc.role || '' });
    var nice = String(id).replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    return withText({ id: id, name: nice, short: nice, color: PALETTE[GG.hashSeed(id) % PALETTE.length], role: '' });
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
     deltas: { fund, fans, buzz, chemistry, burnout, drumSkill, mood: { id: n }, skill: { id: n } } (what actually changed) */
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
        chips.push(el('span.chip.' + (v * c[2] > 0 ? 'up' : 'down'), c[1](v)));
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
