// 56_ui_board.js: the gig board (v0.3, WORLD agent). The corkboard of flyers: this week's listings from
// GG.world.board(state), as a list or a stylized Saskatchewan map (tap a pin -> that city's gigs).
//   GG.ui.openBoard({ mode: 'book'|'view', onBook(gig), onSkip(), onCancel() })
//     book: each listing has "Book it" (confirm) -> GG.career.pickListing -> onBook(listing); "No gig this week" ->
//           pick 'skip' -> onSkip(); ✕ -> onCancel() (back to the planner, nothing picked).
//     view: the corkboard hotspot. Listings read-only + what's booked, the van, the banned wall.
//   Screen 'board' (full). testids: btn-board-close, board-tab-list|map, book-<listingId>, board-skip, pin-<cityId>,
//   board-city, board-listing (one per card). Styles are injected here (self-contained).
(function (GG) {
  var ui = GG.ui, el = ui.el, btn = ui.btn, U = GG.util;
  function S() { return GG.state; }
  function W() { return GG.world; }
  function fill(t) { return t && GG.career && S() ? GG.career.fillText(S(), t) : (t || ''); }
  function sfx(n) { if (GG.audio) GG.audio.sfx(n); }

  var CSS = [
    '.full.board .full-body { padding: calc(var(--safe-top) + 10px) var(--gutter) 12px; }',
    '.gb-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }',
    '.gb-head h2 { margin: 0; flex: 1 1 auto; min-width: 0; font: 900 22px/1.1 var(--display); text-transform: uppercase; }',
    '.gb-head h2 .sub { display: block; font: 700 11px/1.4 var(--font); letter-spacing: .1em; color: var(--amber); }',
    '.gb-list { display: flex; flex-direction: column; gap: 10px; margin-top: 10px; }',
    '.gb-card { position: relative; background: linear-gradient(160deg, #262232, #1b2033); border: 1px solid #4a4150; border-radius: 14px; padding: 12px; }',
    '.gb-card.booked { border-color: var(--amber); box-shadow: 0 0 0 1px var(--amber) inset; }',
    '.gb-card::before { content: ""; position: absolute; top: -5px; left: 50%; width: 10px; height: 10px; margin-left: -5px; border-radius: 50%; background: #e0403a; box-shadow: 0 1px 2px #000; }',
    '.gb-top { display: flex; gap: 10px; align-items: flex-start; }',
    '.gb-ico { flex: 0 0 30px; width: 30px; font-size: 24px; line-height: 1.1; text-align: center; }',
    '.gb-name { font-weight: 800; font-size: 16px; line-height: 1.2; }',
    '.gb-where { font-size: 12px; color: var(--dim); margin-top: 2px; }',
    '.gb-rep { flex: 0 0 auto; font-size: 11px; font-weight: 800; color: var(--amber); white-space: nowrap; } .gb-rep.bad { color: var(--bad); }',
    '.gb-chips { display: flex; flex-wrap: wrap; gap: 5px; margin: 8px 0 4px; }',
    '.gb-chip { font: 700 11px/1.5 var(--font); padding: 2px 7px; border-radius: 99px; background: var(--panel2); border: 1px solid var(--line); white-space: nowrap; }',
    '.gb-chip.good { color: var(--good); } .gb-chip.bad { color: var(--bad); } .gb-chip.amber { color: var(--amber); }',
    '.gb-open { display: inline-block; margin: 6px 0 2px; padding: 2px 7px; border-radius: 6px; font: 800 11px/1.5 var(--font); letter-spacing: .05em; text-transform: uppercase; color: #1d1204; background: var(--amber); }',
    '.gb-open.rival { color: #fff; background: var(--red); }',
    '.gb-catch { font-size: 13px; line-height: 1.35; color: var(--dim); font-style: italic; margin: 4px 0; }',
    '.gb-catch b { font-style: normal; color: var(--text); }',
    '.gb-est { font-size: 12px; color: var(--faint); }',
    '.gb-card .btn { margin-top: 10px; }',
    '.gb-empty { padding: 18px 14px; text-align: center; color: var(--dim); }',
    '.gb-map { position: relative; width: 100%; padding-top: 90%; margin-top: 10px; border-radius: 14px; overflow: hidden; border: 1px solid var(--line); background: #1d2a18; }',
    '.gb-map svg { position: absolute; left: 0; top: 0; width: 100%; height: 100%; }',
    '.gb-pin { position: absolute; width: 44px; height: 44px; margin: -22px 0 0 -22px; padding: 0; border: 0; background: transparent; cursor: pointer; }',
    '.gb-pin i { position: absolute; left: 50%; top: 50%; width: 12px; height: 12px; margin: -6px 0 0 -6px; border-radius: 50%; background: #8d96ab; border: 2px solid #0f1420; }',
    '.gb-pin.has i { width: 18px; height: 18px; margin: -9px 0 0 -9px; background: var(--amber); }',
    '.gb-pin.home i { background: var(--good); }',
    '.gb-pin.sel i { box-shadow: 0 0 0 3px #fff; }',
    '.gb-pin b { position: absolute; left: 50%; top: 50%; transform: translate(3px, -17px); min-width: 14px; padding: 0 3px; border-radius: 99px; background: var(--red); color: #fff; font: 900 10px/14px var(--font); }',
    '.gb-lbl { position: absolute; transform: translate(-50%, 11px); font: 800 10px/1.2 var(--font); color: #efe8d4; text-shadow: 0 1px 2px #000, 0 0 4px #000; white-space: nowrap; pointer-events: none; }',
    '.gb-lbl.left { transform: translate(calc(-100% - 11px), -50%); } .gb-lbl.right { transform: translate(11px, -50%); } .gb-lbl.above { transform: translate(-50%, calc(-100% - 11px)); }',
    '.gb-city { margin-top: 10px; }',
    '.gb-city h3 { margin: 0 0 2px; font: 900 16px/1.2 var(--display); text-transform: uppercase; }',
    '.gb-van { display: flex; align-items: center; gap: 10px; }',
    '.gb-van .bar { flex: 1 1 auto; }',
    '.gb-sec { margin: 16px 0 6px; }',
    '.gb-wall { display: flex; flex-wrap: wrap; gap: 10px; padding: 4px 2px; }',
    '.gb-polaroid { box-sizing: border-box; width: calc(50% - 5px); padding: 6px 6px 8px; border-radius: 3px; background: #f3efe6; color: #1d1204; font: 800 11px/1.25 var(--font); text-align: center; transform: rotate(-2deg); box-shadow: 0 3px 8px rgba(0,0,0,.4); }',
    '.gb-polaroid:nth-child(2n) { transform: rotate(2deg); }',
    '.gb-polaroid .ph { height: 46px; margin-bottom: 5px; display: flex; align-items: center; justify-content: center; background: #2b2b2b; color: #fff; font-size: 22px; }',
    '.gb-polaroid .st { color: var(--red); letter-spacing: .12em; }'
  ].join('\n');
  (function inject() {
    if (typeof document === 'undefined' || document.getElementById('gg-css-board')) return;
    var st = document.createElement('style'); st.id = 'gg-css-board'; st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  })();

  var KIND_ICON = { house: '🏠', legion: '🎖️', bingo: '🎱', openmic: '🎤', church: '⛪', curling: '🥌', skatepark: '🛹', bar: '🍺', club: '🪩' };
  ui.venueIcon = function (kind) { return KIND_ICON[kind] || '🎸'; };
  function money(n) { return n % 1 ? '$' + n.toFixed(2) : U.fmtMoney(n); }
  ui.dealLabel = function (g) {
    if (!g) return '';
    if (g.deal === 'exposure') return 'Exposure (free)';
    if (g.deal === 'door') return 'Door ' + money(g.pay || 0) + '/head';
    return 'Flat ' + U.fmtMoney(g.pay || 0);
  };
  function repBadge(rep) {
    if (!rep) return null;
    return rep > 0 ? el('span.gb-rep', '★'.repeat(rep)) : el('span.gb-rep.bad', rep <= -2 ? '⚠ Last chance' : '⚠ Thin ice');
  }

  /* ---- One flyer ------------------------------------------------------------------------------------ */
  function listingCard(st, l, mode, onPick) {
    var w = W(), fit = w.fitLabel(l.fit != null ? l.fit : 0.7), e = w.estimate(st, l);
    var can = w.canBook(st, l), booked = st.gig && st.gig.id && st.gig.id === l.id, taken = !!(l.stolen && !l.stolen.defended);   // v0.6
    var chips = [
      el('span.gb-chip', 'Tier ' + l.tier + ' · ' + l.capacity + ' cap'),
      el('span.gb-chip' + (l.deal === 'exposure' ? '.amber' : ''), ui.dealLabel(l)),
      taken ? el('span.gb-chip.bad', 'Taken ✗') : el('span.gb-chip' + (can ? '.good' : '.bad'), 'Needs ' + (l.minFans || 0) + ' fans ' + (can ? '✓' : '✗')),
      el('span.gb-chip' + (fit.id === 'clash' ? '.bad' : fit.id === 'great' ? '.good' : ''), fit.icon + ' ' + fit.label)
    ];
    var where = [l.city, l.km ? l.km + ' km' : 'across town', 'gas ' + U.fmtMoney(l.gas || 0)].join(' · ');
    var marcel = l.deal === 'exposure' && mode === 'book' ? el('div.gb-est', 'Marcel: "Exposure is basically money. Say yes."') : null;
    var kids = [
      el('div.gb-top', [el('span.gb-ico', l.showdown && l.showdown.kind === 'festival' ? '🎪' : ui.venueIcon(l.kind)), el('div.grow', [el('div.gb-name', l.name), el('div.gb-where', where)]), repBadge(l.repLevel)]),
      l.opening ? el('span.gb-open' + (l.opening.rival ? '.rival' : ''), (l.opening.rival ? 'Your rival! ' : '') + 'Opening for ' + l.opening.name) : null,
      l.rebook ? el('span.gb-open', 'They want you back') : null,
      ui.rivalBadge ? ui.rivalBadge(st, l) : null,   // v0.6: stolen slot / festival clash
      el('div.gb-chips', chips),
      l.catch ? el('div.gb-catch', [el('b', 'The catch: '), fill(l.catch)]) : null,
      el('div.gb-est', '~' + e.crowd + ' people · ' + (e.pay ? '~' + U.fmtMoney(e.pay) : 'no pay') + ' · ~' + e.fans + ' new fans' + (e.burnout ? ' · long drive' : '')),
      marcel
    ];
    if (mode === 'book' && onPick) {
      kids.push(btn('.btn.primary.small.block', { testid: 'book-' + l.id, disabled: !can, onclick: function () { onPick(l); } }, can ? 'Book it' : taken ? 'Taken by ' + l.stolen.by : 'Not enough fans yet'));
    } else if (booked) kids.push(el('div.gb-open', 'Booked this weekend'));
    return el('div.gb-card' + (booked ? '.booked' : ''), { testid: 'board-listing', data: { id: l.id } }, kids);
  }

  /* ---- The map ---------------------------------------------------------------------------------------- */
  var NS = 'http://www.w3.org/2000/svg', AR = 0.9;
  function svg(tag, attrs) { var n = document.createElementNS(NS, tag); for (var k in attrs) n.setAttribute(k, attrs[k]); return n; }
  function pts(list) { return list.map(function (p) { return (p[0] * 100).toFixed(1) + ',' + (p[1] * 100 * AR).toFixed(1); }).join(' '); }
  function mapView(st, list, sel, onSel) {
    var M = W().map(), home = W().home(st), box = el('div.gb-map', { testid: 'board-map' });
    var s = svg('svg', { viewBox: '0 0 100 ' + (100 * AR), preserveAspectRatio: 'none' });
    for (var gx = 0; gx <= 100; gx += 8) s.appendChild(svg('line', { x1: gx, y1: 0, x2: gx, y2: 100 * AR, stroke: '#2a3a22', 'stroke-width': 0.3 }));   // grid roads
    for (var gy = 0; gy <= 100 * AR; gy += 8) s.appendChild(svg('line', { x1: 0, y1: gy, x2: 100, y2: gy, stroke: '#2a3a22', 'stroke-width': 0.3 }));
    (M.lakes || []).forEach(function (l) { s.appendChild(svg('ellipse', { cx: l.x * 100, cy: l.y * 100 * AR, rx: l.rx * 100, ry: l.ry * 100 * AR, fill: '#2d5a86' })); });
    (M.rivers || []).forEach(function (r) { s.appendChild(svg('polyline', { points: pts(r), fill: 'none', stroke: '#3a6f9e', 'stroke-width': 0.9, 'stroke-linejoin': 'round' })); });
    (M.roads || []).forEach(function (r) {
      var a = M.cities[r[0]], b = M.cities[r[1]]; if (!a || !b) return;
      s.appendChild(svg('line', { x1: a.x * 100, y1: a.y * 100 * AR, x2: b.x * 100, y2: b.y * 100 * AR, stroke: '#c9b98a', 'stroke-width': 0.7, 'stroke-dasharray': '2 1', opacity: 0.8 }));
      if (r[2] >= 60) {
        var t = svg('text', { x: ((a.x + b.x) * 50).toFixed(1), y: ((a.y + b.y) * 50 * AR - 0.8).toFixed(1), fill: '#d9cfae', 'font-size': 2.6, 'text-anchor': 'middle', 'font-weight': 700 });
        t.textContent = r[2] + ' km'; s.appendChild(t);
      }
    });
    box.appendChild(s);
    Object.keys(M.cities).forEach(function (id) {
      var c = M.cities[id], n = list.filter(function (l) { return W().cityId(l.city) === id; }).length;
      var pos = { left: (c.x * 100) + '%', top: (c.y * 100) + '%' };
      box.appendChild(btn('.gb-pin' + (n ? '.has' : '') + (id === home ? '.home' : '') + (id === sel ? '.sel' : ''),
        { testid: 'pin-' + id, 'aria-label': c.name + (n ? ', ' + n + ' gigs' : ''), style: pos, onclick: function () { onSel(id); } },
        [el('i'), n ? el('b', String(n)) : null]));
      box.appendChild(el('span.gb-lbl' + (c.label ? '.' + c.label : ''), { style: pos }, (id === home ? '🏠 ' : '') + c.name));
    });
    return box;
  }

  /* ---- The screen ------------------------------------------------------------------------------------- */
  var dbg = { open: false, mode: null, tab: 'list', city: null, count: 0 };
  function vanStrip(st) {
    var van = W().van(st);
    return el('div.panel', [el('div.gb-van', [el('span', { style: 'font-size:22px' }, '🚐'), el('div.grow', [
      el('div', { style: 'font-weight:800' }, van.name + ' · ' + W().vanLabel(van.condition)),
      ui.bar(van.condition, 100, { color: van.condition >= 60 ? 'var(--good)' : van.condition >= 30 ? 'var(--amber)' : 'var(--bad)' }),
      el('div.small.dim', U.fmtNum(van.km) + ' km driven · Kenji drives. Kenji always drives.')])])]);
  }
  function bannedWall(st) {
    var list = (st.banned || []).map(function (id) { return GG.gig.venue(id); }).filter(Boolean);
    return [el('div.caps.gb-sec', 'The banned wall'), list.length ? el('div.gb-wall', { testid: 'banned-wall' }, list.map(function (v) {
      return el('div.gb-polaroid', [el('div.ph', '🤘'), el('div.st', 'BANNED'), el('div', v.name)]);
    })) : el('p.small.dim', 'No bans yet. Give it time.')];
  }
  function booked(st) {
    var g = st.gig || st.offer;
    if (!g) return null;
    return el('div.panel.warm', [el('div.caps', st.gig ? 'Booked this weekend' : 'Offer waiting on the whiteboard'), el('div', { style: 'font-weight:800;margin-top:2px' }, g.name),
      el('div.small.dim', [g.city, ui.dealLabel(g), g.km ? g.km + ' km' : null].filter(Boolean).join(' · '))]);
  }
  ui.define('board', {
    kind: 'full', cls: 'board',
    build: function (s, d) {
      var st = S(); if (!st || !W()) return;
      var list = W().board(st), mode = d.mode === 'book' ? 'book' : 'view', tab = d.tab || 'list';
      dbg.mode = mode; dbg.tab = tab; dbg.city = d.city || null; dbg.count = list.length;
      ui.append(s.body, el('div.gb-head', [
        el('h2', [el('span.sub', 'YEAR ' + st.year + ' · WEEK ' + st.week + (mode === 'book' ? ' · PICK A GIG' : ' · THE CORKBOARD')), 'Gig board']),
        btn('.icon-btn', { testid: 'btn-board-close', 'aria-label': 'Close', onclick: function () { close(s, 'cancel'); } }, '✕')]));
      if (mode === 'view') ui.append(s.body, [booked(st), !st.gig && !st.offer ? el('p.small.dim', { style: 'margin:6px 0 0' }, 'Put Book in a slot on the whiteboard to take one of these.') : null]);
      s.body.appendChild(ui.tabs([{ id: 'list', label: '📌 List' }, { id: 'map', label: '🗺️ Map' }], tab, function (t) {
        s.rerender(Object.assign({}, s.data, { tab: t }));
      }, 'board-tab-'));
      var pick = mode === 'book' ? function (l) { confirmBook(s, l); } : null;
      if (tab === 'map') {
        var sel = d.city || W().home(st);
        s.body.appendChild(mapView(st, list, sel, function (id) { s.rerender(Object.assign({}, s.data, { city: id })); }));
        var c = W().city(sel), here = list.filter(function (l) { return W().cityId(l.city) === sel; });
        s.body.appendChild(el('div.gb-city', { testid: 'board-city' }, [el('h3', c ? c.name : sel),
          el('div.small.dim', (c && c.blurb || '') + (sel === W().home(st) ? '' : ' · ' + W().km(W().home(st), sel) + ' km from home')),
          here.length ? el('div.gb-list', here.map(function (l) { return listingCard(st, l, mode, pick); }))
            : el('div.gb-empty', 'No gigs in ' + (c ? c.name : sel) + ' this week.')]));
      } else {
        s.body.appendChild(list.length ? el('div.gb-list', list.map(function (l) { return listingCard(st, l, mode, pick); }))
          : el('div.gb-empty', "Nobody's booking this week. The corkboard is just a flyer for a lost cat."));
      }
      if (mode === 'view') ui.append(s.body, [el('div.caps.gb-sec', 'The van'), vanStrip(st)].concat(bannedWall(st)));
      if (mode === 'book') s.foot.appendChild(btn('.btn.block', { testid: 'board-skip', onclick: function () { GG.career.pickListing(S(), 'skip'); close(s, 'skip'); } }, 'No gig this week'));
      else s.foot.appendChild(btn('.btn.block', { testid: 'board-done', onclick: function () { close(s, 'cancel'); } }, 'Back to the garage'));
    },
    onShow: function () { dbg.open = true; sfx('tap'); },
    onClose: function (s) {
      dbg.open = false;
      var d = s.data, how = d._how || 'cancel';
      if (d._done) return;
      d._done = true;
      var fn = how === 'book' ? d.onBook : how === 'skip' ? d.onSkip : d.onCancel;
      if (fn) setTimeout(function () { fn(d._gig); }, 0);   // after the close has finished (the callback may open screens)
    }
  });
  function close(s, how, gig) { if (s.data._done) return; s.data._how = how; s.data._gig = gig || null; ui.close(s.id); }
  function confirmBook(s, l) {
    var st = S(); if (!st || !W().canBook(st, l)) return;
    var text = [l.city + (l.km ? ' (' + l.km + ' km, gas ' + U.fmtMoney(l.gas) + ')' : ''), ui.dealLabel(l),
      l.opening ? 'Opening for ' + l.opening.name + '.' : null, l.catch ? 'The catch: ' + fill(l.catch) : null].filter(Boolean).join(' · ');
    ui.confirm({ title: 'Book ' + l.name + '?', text: text, yes: 'Book it', no: 'Keep looking' }).then(function (yes) {
      if (!yes || !ui.isOpen('board') || s.data._done) return;
      var g = GG.career.pickListing(S(), l.id);
      if (!g) return;
      sfx('cash');
      if (l.deal === 'exposure') ui.toast('Exposure! We are going to be SO exposed.', { who: 'Marcel' });
      close(s, 'book', g);
    });
  }

  // Opens the board. mode 'book' (a planned Book block, from the planner's Go) or 'view' (the corkboard).
  ui.openBoard = function (opts) {
    opts = opts || {};
    if (!S() || !W()) { if (opts.onSkip) opts.onSkip(); return null; }
    return ui.show('board', { mode: opts.mode === 'book' ? 'book' : 'view', onBook: opts.onBook, onSkip: opts.onSkip, onCancel: opts.onCancel });
  };

  GG.registerDebug('board', function () { return Object.assign({}, dbg); });
})(window.GG);
