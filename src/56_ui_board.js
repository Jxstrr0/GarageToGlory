// 56_ui_board.js: the gig board (v0.3, WORLD agent). The corkboard of flyers: this week's listings from
// GG.world.board(state), as a list or a stylized Saskatchewan map (tap a pin -> that city's gigs).
//   GG.ui.openBoard({ mode: 'book'|'view', onBook(gig), onSkip(), onCancel() })
//     book: each listing has "Book it" (confirm) -> GG.career.pickListing -> onBook(listing); "No gig this week" ->
//           pick 'skip' -> onSkip(); ✕ -> onCancel() (back to the planner, nothing picked).
//     view: the corkboard hotspot. Listings read-only + what's booked, the van, the banned wall.
//   Screen 'board' (full). testids: btn-board-close, board-tab-list|map, book-<listingId>, board-skip, pin-<cityId>,
//   board-city, board-listing (one per card). Styles are injected here (self-contained).
// v0.6.1 (Addendum 1 C6/C7): the map is Canada in rings: ring tabs (ring-<id>; Saskatchewan, the West from Local Heroes,
//   the East & North from Signed); a locked ring is teased (dimmed pins + ring-locked note). Listings carry tag chips
//   (holiday, outdoor weather, 'your season'; testid board-tag) and the head shows month · season · weather.
// v0.7 (WORLDUI): on tour (GG.ui.tourBoard from 5i_ui_tour) the board is the region's: its listings (GG.tour.listings via
//   world.board), the regional map with city pins (city-pin-<id>, board-map data-region) and the rental instead of the van.
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
    '.gb-chip.tag { color: var(--text); border-color: #6a5a3a; background: rgba(240, 180, 60, .12); }',
    '.gb-rings { display: flex; gap: 6px; margin-top: 10px; }',
    '.gb-ring { flex: 1 1 0; min-width: 0; min-height: 48px; padding: 4px 6px; border-radius: 12px; border: 1px solid var(--line); background: var(--panel2); color: var(--text); font: 800 12px/1.2 var(--font); cursor: pointer; }',
    '.gb-ring small { display: block; font: 700 10px/1.3 var(--font); color: var(--dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
    '.gb-ring.sel { border-color: var(--amber); box-shadow: 0 0 0 1px var(--amber) inset; }',
    '.gb-ring.locked { color: var(--dim); }',
    '.gb-map.locked .gb-pin i { background: #4a5060; } .gb-map.locked .gb-lbl { opacity: .55; }',
    '.gb-lock { position: absolute; left: 8%; right: 8%; top: 50%; transform: translateY(-50%); padding: 10px 12px; border-radius: 12px; background: rgba(10, 13, 22, .88); border: 1px dashed var(--amber); color: var(--text); font: 700 13px/1.4 var(--font); text-align: center; pointer-events: none; }',
    '.gb-lock b { display: block; color: var(--amber); font: 900 15px/1.2 var(--display); text-transform: uppercase; margin-bottom: 4px; }',
    '.gb-cal { margin-top: 6px; font: 700 12px/1.4 var(--font); color: var(--dim); }',
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
      el('div.gb-chips', chips.concat((l.tags || []).map(function (t) { return el('span.gb-chip.tag', { testid: 'board-tag' }, t.icon + ' ' + t.text); }))),
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
  // v0.6.1: one ring at a time. Roads that leave the ring run to the "home" box (the rings you already know).
  function ringOf(c) { return c.ring || 'sask'; }
  function mapView(st, list, sel, onSel, ringId) {
    var M = W().map(), home = W().home(st), ring = (W().rings().filter(function (r) { return r.id === ringId; })[0]) || W().rings()[0];
    var open = W().ringOpen(st, ring.id), hb = ring.home || null;
    var box = el('div.gb-map' + (open ? '' : '.locked'), { testid: 'board-map', data: { ring: ring.id } });
    var s = svg('svg', { viewBox: '0 0 100 ' + (100 * AR), preserveAspectRatio: 'none' });
    for (var gx = 0; gx <= 100; gx += 8) s.appendChild(svg('line', { x1: gx, y1: 0, x2: gx, y2: 100 * AR, stroke: '#2a3a22', 'stroke-width': 0.3 }));   // grid roads
    for (var gy = 0; gy <= 100 * AR; gy += 8) s.appendChild(svg('line', { x1: 0, y1: gy, x2: 100, y2: gy, stroke: '#2a3a22', 'stroke-width': 0.3 }));
    if (ring.id === 'sask') {
      (M.lakes || []).forEach(function (l) { s.appendChild(svg('ellipse', { cx: l.x * 100, cy: l.y * 100 * AR, rx: l.rx * 100, ry: l.ry * 100 * AR, fill: '#2d5a86' })); });
      (M.rivers || []).forEach(function (r) { s.appendChild(svg('polyline', { points: pts(r), fill: 'none', stroke: '#3a6f9e', 'stroke-width': 0.9, 'stroke-linejoin': 'round' })); });
    }
    if (hb) {
      s.appendChild(svg('rect', { x: hb.x * 100, y: hb.y * 100 * AR, width: hb.w * 100, height: hb.h * 100 * AR, rx: 2, fill: '#2c3a26', stroke: '#6f8f5a', 'stroke-width': 0.5, 'stroke-dasharray': '1.5 1' }));
      var ht = svg('text', { x: ((hb.x + hb.w / 2) * 100).toFixed(1), y: ((hb.y + hb.h / 2) * 100 * AR).toFixed(1), fill: '#a8c890', 'font-size': 3, 'text-anchor': 'middle', 'font-weight': 800 });
      ht.textContent = '🏠 ' + (hb.label || 'Home'); s.appendChild(ht);
    }
    function pt(c) { return ringOf(c) === ring.id ? { x: c.x, y: c.y } : hb ? { x: hb.x + hb.w / 2, y: hb.y + hb.h / 2 } : null; }
    (M.roads || []).forEach(function (r) {
      var a = M.cities[r[0]], b = M.cities[r[1]]; if (!a || !b) return;
      var inA = ringOf(a) === ring.id, inB = ringOf(b) === ring.id;
      if (!inA && !inB) return;
      var pa = pt(a), pb = pt(b); if (!pa || !pb) return;
      s.appendChild(svg('line', { x1: pa.x * 100, y1: pa.y * 100 * AR, x2: pb.x * 100, y2: pb.y * 100 * AR, stroke: '#c9b98a', 'stroke-width': 0.7, 'stroke-dasharray': '2 1', opacity: inA && inB ? 0.8 : 0.45 }));
      if (r[2] >= 60 && inA && inB) {
        var t = svg('text', { x: ((pa.x + pb.x) * 50).toFixed(1), y: ((pa.y + pb.y) * 50 * AR - 0.8).toFixed(1), fill: '#d9cfae', 'font-size': 2.6, 'text-anchor': 'middle', 'font-weight': 700 });
        t.textContent = U.fmtNum(r[2]) + ' km'; s.appendChild(t);
      }
    });
    box.appendChild(s);
    Object.keys(M.cities).filter(function (id) { return ringOf(M.cities[id]) === ring.id; }).forEach(function (id) {
      var c = M.cities[id], n = list.filter(function (l) { return W().cityId(l.city) === id; }).length;
      var pos = { left: (c.x * 100) + '%', top: (c.y * 100) + '%' };
      box.appendChild(btn('.gb-pin' + (n ? '.has' : '') + (id === home ? '.home' : '') + (id === sel ? '.sel' : ''),
        { testid: 'pin-' + id, 'aria-label': c.name + (n ? ', ' + n + ' gigs' : ''), style: pos, onclick: function () { onSel(id); } },
        [el('i'), n ? el('b', String(n)) : null]));
      box.appendChild(el('span.gb-lbl' + (c.label ? '.' + c.label : ''), { style: pos }, (id === home ? '🏠 ' : '') + c.name));
    });
    if (!open) box.appendChild(el('div.gb-lock', { testid: 'ring-locked' }, [el('b', '🔒 ' + ring.name), ring.lock || 'Not yet.']));
    return box;
  }
  function ringTabs(st, list, cur, onRing) {
    return el('div.gb-rings', W().rings().map(function (r) {
      var open = W().ringOpen(st, r.id), n = list.filter(function (l) { return W().ring(l.city) === r.id; }).length;
      return btn('.gb-ring' + (r.id === cur ? '.sel' : '') + (open ? '' : '.locked'), { testid: 'ring-' + r.id, 'aria-pressed': r.id === cur ? 'true' : 'false', onclick: function () { onRing(r.id); } },
        [(open ? '' : '🔒 ') + (r.short || r.name), el('small', open ? (n ? n + ' gig' + (n === 1 ? '' : 's') : 'no gigs') : ERA_NAME[r.era] || r.era)]);
    }));
  }
  var ERA_NAME = { garage: 'Garage', local: 'Local Heroes', signed: 'Signed', world: 'World Stage' };
  function calLine(st) {
    if (!GG.calendar) return null;
    var L = GG.calendar.label(st);
    return el('div.gb-cal', { testid: 'board-cal' }, L.monthName + ' · ' + L.seasonIcon + ' ' + L.seasonName + ' · ' + L.weatherIcon + ' ' + L.weatherLabel + ', ' + L.temp + '°C'
      + (L.holiday ? ' · ' + L.holiday.icon + ' ' + L.holiday.name : '') + (L.fit ? ' — ' + L.fit : ''));
  }

  /* ---- The screen ------------------------------------------------------------------------------------- */
  var dbg = { open: false, mode: null, tab: 'list', city: null, count: 0 };
  function vanStrip(st) {
    var van = W().van(st);
    return el('div.panel', [el('div.gb-van', [el('span', { style: 'font-size:22px' }, '🚐'), el('div.grow', [
      el('div', { style: 'font-weight:800' }, van.name + ' · ' + W().vanLabel(van.condition)),
      ui.bar(van.condition, 100, { color: van.condition >= 60 ? 'var(--good)' : van.condition >= 30 ? 'var(--amber)' : 'var(--bad)' }),
      el('div.small.dim', U.fmtNum(van.km) + ' km driven · ' + driverLine(st))])])]);
  }
  function driverLine(st) {   // v0.6.1: the designated driver (or you, when they're gone)
    var d = W().driver ? W().driver(st) : { id: 'kenji', name: 'Kenji' };
    return d.you ? 'You drive now. ' + ((d.def && d.def.effect) || '') : d.id === 'kenji' ? 'Kenji drives. Kenji always drives.' : d.name + ' drives. ' + ((d.def && d.def.effect) || '');
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
      var TB = ui.tourBoard && ui.tourBoard.on(st) ? ui.tourBoard : null;   // v0.7: on tour = the region's listings + its map
      dbg.mode = mode; dbg.tab = tab; dbg.city = d.city || null; dbg.count = list.length; dbg.ring = null;
      ui.append(s.body, el('div.gb-head', [
        el('h2', [el('span.sub', 'YEAR ' + st.year + ' · WEEK ' + st.week + (mode === 'book' ? ' · PICK A GIG' : ' · THE CORKBOARD')), TB ? TB.title(st) : 'Gig board']),
        btn('.icon-btn', { testid: 'btn-board-close', 'aria-label': 'Close', onclick: function () { close(s, 'cancel'); } }, '✕')]));
      ui.append(s.body, calLine(st));
      if (mode === 'view') ui.append(s.body, [booked(st), !st.gig && !st.offer ? el('p.small.dim', { style: 'margin:6px 0 0' }, 'Put Book in a slot on the whiteboard to take one of these.') : null]);
      s.body.appendChild(ui.tabs([{ id: 'list', label: '📌 List' }, { id: 'map', label: '🗺️ Map' }], tab, function (t) {
        s.rerender(Object.assign({}, s.data, { tab: t }));
      }, 'board-tab-'));
      var pick = mode === 'book' ? function (l) { confirmBook(s, l); } : null;
      if (tab === 'map' && TB) {
        var tm = TB.map(st, list, d.city, function (id) { s.rerender(Object.assign({}, s.data, { city: id })); });
        dbg.city = tm.sel; dbg.ring = 'tour';
        s.body.appendChild(tm.map);
        s.body.appendChild(el('div.gb-city', { testid: 'board-city' }, [el('h3', tm.city ? tm.city.name : tm.sel),
          el('div.small.dim', ((tm.city && tm.city.blurb) || '') + (tm.km ? ' · ' + U.fmtNum(tm.km) + ' km from this stop' : '')),
          tm.here.length ? el('div.gb-list', tm.here.map(function (l) { return listingCard(st, l, mode, pick); }))
            : el('div.gb-empty', 'No open dates in ' + (tm.city ? tm.city.name : tm.sel) + ' this week.')]));
      } else if (tab === 'map') {
        var sel = d.city || W().home(st), ringId = d.ring || W().ring(sel) || 'sask';
        if (W().ring(sel) !== ringId) sel = Object.keys(W().map().cities).filter(function (id) { return W().ring(id) === ringId; })[0] || sel;
        dbg.ring = ringId; dbg.city = sel;
        s.body.appendChild(ringTabs(st, list, ringId, function (r) { s.rerender(Object.assign({}, s.data, { ring: r, city: null })); }));
        s.body.appendChild(mapView(st, list, sel, function (id) { s.rerender(Object.assign({}, s.data, { city: id, ring: W().ring(id) })); }, ringId));
        var c = W().city(sel), here = list.filter(function (l) { return W().cityId(l.city) === sel; });
        s.body.appendChild(el('div.gb-city', { testid: 'board-city' }, [el('h3', c ? c.name : sel),
          el('div.small.dim', (c && c.blurb || '') + (sel === W().home(st) ? '' : ' · ' + U.fmtNum(W().km(W().home(st), sel)) + ' km from home')
            + (W().cityOpen(st, sel) ? '' : ' · Not open to you yet.')),
          here.length ? el('div.gb-list', here.map(function (l) { return listingCard(st, l, mode, pick); }))
            : el('div.gb-empty', 'No gigs in ' + (c ? c.name : sel) + ' this week.')]));
      } else {
        s.body.appendChild(list.length ? el('div.gb-list', list.map(function (l) { return listingCard(st, l, mode, pick); }))
          : el('div.gb-empty', "Nobody's booking this week. The corkboard is just a flyer for a lost cat."));
      }
      if (mode === 'view') ui.append(s.body, TB ? [el('div.caps.gb-sec', 'The rental'), TB.strip(st)] : [el('div.caps.gb-sec', 'The van'), vanStrip(st)].concat(bannedWall(st)));
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
