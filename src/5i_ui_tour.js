// 5i_ui_tour.js: the World stage UI (v0.7 "World", WORLDUI). Reads GG.tour (25_sim_tour.js); never rolls anything.
//   World map (screen 'world', full): a stylized world (Canada + the four regions, no USA), flight arcs, region pins with
//     their lock state (threshold / need / invite / genre fit), a card per region. Laptop World tab: GG.ui.worldPanel.
//   Region screen ('tour-region', full): the regional map with city pins (GG.ui.tourRegionMap, shared with the on-tour
//     board), the tapped city's venues, season + holidays + fit, and the preset packages -> the package picker
//     ('tour-pkg', sheet): rental vehicle / stay / extra with a live quote (GG.tour.quote) -> GG.tour.book (departs next Monday).
//   On tour: the planner shows GG.ui.tourPlanHead (stop, city, show, weeks left, homesickness) and only GG.tour.allowedBlocks
//     (GG.ui.tourAct names them: rest / promote locally / hotel-room rehearsal); the first block locks to rest when
//     status.forcedRest; an open date (stop.venue null) opens the board (the region's listings) before the week runs.
//   Moments: the flight (screen 'tour-flight', full; departure Monday, before the card: GG.ui.flightDue/playFlight from
//     60_main.beginWeek), the homecoming ('tour-home', sheet; wrap.tour.home), the Moose Opera ('moose-opera', full; after
//     'tour:moose'), the Global Gong ceremony ('gong', full, live3d: the v0.5 red carpet in Amsterdam, GG.render.carpet with
//     the Gong sign; nominees, the envelope = GG.tour.runGong, the Loonies speech sheet 'loonie-card'; GG.ui.gongDue/playGong
//     from 60_main.wrapWeek before endWeek). Autoplay flows (GG.ui.gigAutoplay) skip every moment (toasts instead).
//   Hooks: tourWrap(w) (52 wrap: hotel, homesick group chat, unlocks, invites, broken, big, the Gong, home), tourCardNote(st,
//     card) (52 card: region strip on wt_* cards), tourPlanHead/tourAct/tourBlocks (52 planner), tourOpenDate(st) (52 Go),
//     worldPanel(st) (53 laptop), tourBoard (56 board helpers).
// testids: world-map, world-pin-<id>, world-region-<id>, world-status, btn-world-close, btn-world-map, world-panel ·
//   region-map, city-pin-<id>, region-city, pkg-<id>, pkg-open-<id>, btn-region-back · tour-pkg, pick-vehicle-<id>,
//   pick-stay-<id>, pick-extra-<id>, quote-total, quote-upfront, quote-why, btn-book-tour · tour-flight, btn-flight-go ·
//   tour-home, btn-home-ok · moose-opera, btn-moose-ok · tour-payoff, btn-payoff-ok (v0.9) · gong-phase, btn-gong-next, btn-gong-envelope, gong-winner,
//   btn-gong-speech, btn-gong-done · plan-tour, plan-homesick, plan-forced · wrap-tour, wrap-homesick, wrap-callhome,
//   wrap-unlocked, wrap-home, wrap-gong, card-region · tour-cancel.
(function (GG) {
  var ui = GG.ui, el = ui.el, btn = ui.btn, U = GG.util, C = GG.contracts;
  var WPY = C.WEEKS_PER_YEAR, NS = 'http://www.w3.org/2000/svg', AR = 0.72;
  function S() { return GG.state; }
  function T() { return GG.tour; }
  function has(st) { return !!(GG.tour && (st || S())); }
  function fill(t) { var st = S(); return t && st ? ui.fill(String(t), st) : (t || ''); }   // v0.9: + role/space/van tokens
  var NUM = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'];
  function heads(st) { var n = (GG.drama && GG.drama.lineup ? GG.drama.lineup(st) : ui.active(st)).length + 1; return NUM[n] || String(n); }   // the lineup + you
  function sfx(n) { if (GG.audio && GG.audio.sfx) GG.audio.sfx(n); }
  function money(n) { return U.fmtMoney(Math.round(n || 0)); }
  function num(n) { return U.fmtNum(Math.round(n || 0)); }
  function views() { return !ui.gigAutoplay; }
  function bandName(st) { var b = GG.career && GG.career.band(st || S()); return (b && b.name) || 'The band'; }
  function drv(st) { var d = GG.world && GG.world.driver ? GG.world.driver(st || S()) : null; return d || { id: 'you', name: 'You', you: true }; }
  function wk(w) { return 'Y' + (Math.floor((w - 1) / WPY) + 1) + ' W' + ((w - 1) % WPY + 1); }
  function seasonChip(season) {
    if (!season || !GG.calendar || !GG.calendar.seasonInfo) return null;
    var i = GG.calendar.seasonInfo(season);
    return el('span.tw-chip', (i.icon ? i.icon + ' ' : '') + i.name);
  }
  function svg(tag, attrs, kids) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }
  function pts(list) { return list.map(function (p) { return p[0] + ',' + (p[1] * AR).toFixed(1); }).join(' '); }
  function pct(v) { return Math.max(6, Math.min(94, v)) + '%'; }

  /* ---- Land (stylized, 0..100 boxes, y down; the map is 100 x 72) ------------------------------------------------ */
  var WORLD = {
    faint: [[[44, 44], [52, 42], [58, 46], [60, 58], [55, 72], [49, 76], [46, 64], [41, 54]], [[72, 38], [79, 37], [77, 46], [74, 52]],
      [[80, 40], [86, 44], [84, 52], [80, 50]], [[34, 4], [42, 3], [43, 10], [38, 14], [34, 10]]],
    canada: [[3, 16], [9, 10], [16, 12], [20, 6], [27, 8], [30, 14], [36, 16], [35, 24], [31, 30], [34, 38], [28, 42], [20, 40], [12, 42], [6, 38], [3, 30]],
    uk_europe: [[43, 22], [47, 14], [52, 12], [58, 16], [60, 24], [59, 34], [54, 40], [47, 40], [42, 35], [45, 29]],
    russia: [[60, 12], [66, 6], [76, 4], [88, 6], [98, 10], [98, 22], [92, 30], [84, 32], [74, 30], [64, 30], [60, 22]],
    japan: [[88, 30], [92, 32], [93, 40], [90, 46], [86, 48], [85, 44], [89, 39]],
    australia: [[77, 74], [84, 68], [92, 70], [98, 76], [97, 86], [90, 92], [82, 90], [76, 84]]
  };
  var LAND = {
    uk_europe: { sea: '#1d3a5c', fill: '#4e8a4a', edge: '#2f5a2e', shapes: [
      [[13, 43], [20, 40], [24, 46], [21, 55], [14, 55], [11, 49]],
      [[27, 28], [33, 29], [36, 40], [40, 50], [44, 60], [38, 67], [28, 66], [31, 56], [28, 46], [25, 38]],
      [[50, 32], [52, 20], [60, 10], [72, 8], [76, 12], [73, 26], [67, 30], [62, 26], [57, 34]],
      [[79, 10], [90, 8], [94, 20], [86, 28], [80, 24]],
      [[40, 68], [47, 62], [54, 52], [62, 48], [76, 46], [98, 48], [98, 100], [30, 100], [10, 100], [8, 86], [18, 80], [34, 78]]] },
    japan: { sea: '#1d3558', fill: '#7aa860', edge: '#44683a', shapes: [
      [[70, 2], [86, 3], [92, 8], [88, 18], [78, 20], [72, 14]],
      [[80, 24], [85, 32], [82, 46], [78, 58], [66, 70], [52, 74], [40, 80], [26, 78], [28, 70], [42, 62], [56, 58], [68, 50], [72, 36], [76, 26]],
      [[10, 72], [24, 74], [26, 88], [16, 94], [9, 86]],
      [[36, 80], [50, 78], [49, 87], [37, 87]]] },
    australia: { sea: '#15395a', fill: '#c4642e', edge: '#8a3e18', shapes: [
      [[3, 52], [12, 36], [28, 26], [38, 12], [48, 4], [58, 12], [64, 6], [72, 20], [84, 28], [95, 44], [93, 62], [85, 74], [75, 86], [64, 78], [56, 70], [48, 76], [30, 74], [12, 76], [3, 66]],
      [[73, 90], [83, 90], [81, 98], [75, 98]]] },
    russia: { sea: '#1a3150', fill: '#5e7e5a', edge: '#3a5236', snow: true, shapes: [
      [[1, 26], [16, 14], [36, 8], [58, 4], [80, 6], [99, 12], [99, 52], [96, 66], [98, 86], [88, 84], [84, 70], [72, 72], [58, 70], [44, 68], [28, 64], [14, 66], [1, 64]]],
      lakes: [[70, 60, 2.2, 7, -35]] }
  };
  // Label nudges for crowded pins [dx, dy] (default: below the dot).
  var LBL = { kyoto: [0, -3.2], nagoya: [4, 4.6], osaka: [-3, 4.6], mudstonbury: [-6, 4.6], london: [4, -2.6], manchester: [6, -2.2], glasgow: [-5, -2.6],
    wackelstein: [0, -3.2], amsterdam: [4, 4.6], prague: [4, 4.6], berlin: [4, -2.6], sydney: [-6, 1], hobart: [0, -3.4], tokyo: [4, 4.6], helsinki: [-2, 4.6] };
  function land(s, shapes, fillC, edge) {
    shapes.forEach(function (p) { s.appendChild(svg('polygon', { points: pts(p), fill: fillC, stroke: edge, 'stroke-width': 0.6, 'stroke-linejoin': 'round' })); });
  }

  /* ---- The world map ----------------------------------------------------------------------------------------------- */
  function worldMap(st, o) {
    o = o || {};
    var view = T().map(st), K = T().content(), cp = K.canadaPin || [18, 30];
    var box = el('div.tw-map' + (o.compact ? '.compact' : ''), { testid: o.testid || 'world-map' });
    var s = svg('svg', { viewBox: '0 0 100 ' + (100 * AR), preserveAspectRatio: 'none', class: 'tw-svg' });
    for (var y = 10; y < 100; y += 15) s.appendChild(svg('line', { x1: 0, y1: y * AR, x2: 100, y2: y * AR, stroke: 'rgba(160,200,255,.08)', 'stroke-width': 0.3 }));
    WORLD.faint.forEach(function (p) { s.appendChild(svg('polygon', { points: pts(p), fill: 'rgba(120,150,110,.22)' })); });
    land(s, [WORLD.canada], '#8a3a34', '#5a2420');
    view.forEach(function (r) {
      var c = LAND[r.id] || {};
      land(s, [WORLD[r.id]], r.unlocked ? c.fill || '#4e8a4a' : '#3a4560', r.unlocked ? c.edge || '#2f5a2e' : '#2a3450');
    });
    view.forEach(function (r) {   // flight arcs from Canada
      if (!r.pin) return;
      var x1 = cp[0], y1 = cp[1] * AR, x2 = r.pin[0], y2 = r.pin[1] * AR, mx = (x1 + x2) / 2, my = Math.min(y1, y2) - 10 - Math.abs(x2 - x1) * 0.12;
      s.appendChild(svg('path', { d: 'M' + x1 + ',' + y1 + ' Q' + mx + ',' + my + ' ' + x2 + ',' + y2, fill: 'none',
        stroke: r.here ? '#ffb347' : r.unlocked ? 'rgba(255,220,150,.75)' : 'rgba(170,185,220,.28)', 'stroke-width': r.here ? 0.9 : 0.55, 'stroke-dasharray': r.unlocked ? '2 1.4' : '1 1.8' }));
    });
    box.appendChild(s);
    box.appendChild(el('div.tw-home', { style: { left: pct(cp[0]), top: pct(cp[1]) } }, [el('i'), el('span', '🍁 Home')]));
    view.forEach(function (r) {
      if (!r.pin) return;
      var tag = r.here ? 'On tour' : r.unlocked ? (r.broken ? 'Broken' : 'Open') : r.invite ? 'Invite!' : r.need > 0 ? '🔒 ' + num(r.need) : 'Soon';
      box.appendChild(btn('.tw-pin' + (r.unlocked ? '.open' : '.locked') + (r.here ? '.here' : '') + (r.invite && !r.unlocked ? '.invite' : ''),
        { testid: 'world-pin-' + r.id, 'aria-label': r.name + ', ' + tag, style: { left: pct(r.pin[0]), top: pct(r.pin[1]) }, onclick: function () { if (o.onPin) o.onPin(r.id); } },
        [el('span.ic', r.icon || '🌍'), el('span.nm', [el('b', r.short || r.name), el('small', tag)])]));
    });
    return box;
  }
  function regionCard(st, r, onOpen) {
    var status = r.here ? 'On tour here now' : r.unlocked ? (r.via === 'invite' ? 'Open (an invite got you in)' : r.via === 'big' ? 'Open (a song blew up here)' : 'Open')
      : !r.worldEra ? 'Opens in the World stage era' : r.invite ? 'Invite waiting' : r.need > 0 ? num(r.need) + ' more fans, or an invite' : 'Enough fans: it opens at the end of the week';
    var scene = Math.max(1, r.scene || 1);
    return el('div.tw-rcard' + (r.unlocked ? '.open' : '.locked'), { testid: 'world-region-' + r.id, data: { unlocked: r.unlocked ? '1' : '0' } }, [
      el('div.tw-rtop', [el('span.tw-ric', r.icon || '🌍'), el('div.grow', [el('b', r.name), el('div.small.dim', status)]),
        btn('.btn.small' + (r.unlocked ? '.primary' : ''), { testid: 'region-open-' + r.id, onclick: function () { onOpen(r.id); } }, r.unlocked ? 'Tours ▸' : 'Look')]),
      el('div.tw-chips', [el('span.tw-chip' + (r.fit >= 0.85 ? '.good' : r.fit < 0.65 ? '.bad' : ''), (st.genre ? st.genre[0].toUpperCase() + st.genre.slice(1) : 'You') + ': ' + r.fitLabel),
        seasonChip(r.season), r.broken ? el('span.tw-chip.amber', '★ Broken') : null, r.big ? el('span.tw-chip.amber', '🔥 ' + r.big.title) : null,
        r.rivalToured ? el('span.tw-chip.bad', 'Rival toured it') : null, r.tours ? el('span.tw-chip', r.tours + ' tour' + (r.tours > 1 ? 's' : '')) : null]),
      r.unlocked ? el('div.tw-bar', [el('span.small.dim', num(r.regionFans) + ' fans here · breaks at ' + num(r.breakAt)), ui.bar(Math.min(r.regionFans, scene), scene, { color: r.broken ? 'var(--amber)' : 'var(--good)' })])
        : el('div.tw-bar', [el('span.small.dim', 'Unlocks at ' + num(r.threshold) + ' fans (you: ' + num(st.fans) + ')'), ui.bar(Math.round(r.progress * 100), 100, { color: 'var(--blue)' })])
    ]);
  }
  function statusStrip(st) {
    var x = T().status(st), a = x.active;
    if (x.onTour) return el('div.panel.warm.tw-status', { testid: 'world-status', data: { state: 'on' } }, [el('div.caps', 'On tour · ' + (T().region(a.region) || {}).name),
      el('b', a.name + ' · stop ' + (x.index + 1) + ' of ' + a.stops.length + ': ' + x.stop.cityName), el('div.small.dim', (x.stop.venue ? x.stop.venueName : 'Open date (pick from the board)') + ' · ' + (x.weeksLeft ? x.weeksLeft + ' more week' + (x.weeksLeft > 1 ? 's' : '') : 'last stop')),
      homesickBar(x)]);
    if (x.booked) return el('div.panel.warm.tw-status', { testid: 'world-status', data: { state: 'booked' } }, [el('div.caps', 'Booked · departs ' + (x.departsIn <= 1 ? 'next Monday' : 'in ' + x.departsIn + ' weeks')),
      el('b', a.name), el('div.small.dim', a.stops.map(function (s) { return s.cityName; }).join(' → ')),
      btn('.btn.small.block', { testid: 'tour-cancel', style: 'margin-top:8px', onclick: function () { cancelTour(); } }, 'Cancel (rental + extra refunded)')]);
    if (!x.worldEra) return el('div.panel.tw-status', { testid: 'world-status', data: { state: 'locked' } }, [el('div.caps', 'Passports: not yet'),
      el('div.small.dim', 'The world opens in the World stage era: about 25,000 fans and a record on the charts. Canada first. Then everywhere that is not in the way.')]);
    return el('div.panel.tw-status', { testid: 'world-status', data: { state: 'none' } }, [el('div.caps', 'No tour booked'),
      el('div.small.dim', 'Pick an open region, then a tour package. Flights, the rental and extras come out of the fund; hotels weekly. It leaves next Monday.')]);
  }
  function homesickBar(x) {
    var v = Math.round(x.homesick || 0);
    return el('div.tw-bar', { testid: 'plan-homesick' }, [el('span.small', '🏠 Homesick: ' + x.homesickLabel + (x.forcedRest ? ' (forced rest)' : '')),
      ui.bar(v, 100, { color: v >= 70 ? 'var(--bad)' : v >= 45 ? 'var(--amber)' : 'var(--blue)' })]);
  }
  function cancelTour() {
    ui.confirm({ title: 'Cancel the tour?', text: fill('The rental and the extra are refunded. The flights are not. {front} has already packed.'), yes: 'Cancel it', no: 'Keep it' }).then(function (yes) {
      if (!yes || !S()) return;
      var r = T().cancel(S());
      if (r) { ui.toast('Tour cancelled. ' + money(r.refund) + ' back in the fund.'); if (GG.main) GG.main.sync(); }
      ['world', 'laptop'].forEach(function (id) { var e = ui.get && ui.get(id); if (ui.isOpen(id) && e && e.rerender) e.rerender(); });
    });
  }

  ui.define('world', {
    kind: 'full', cls: 'tworld',
    build: function (s) {
      var st = S(); if (!st || !has(st)) return;
      ui.append(s.body, el('div.tw-head', [el('h2', [el('span.sub', 'YEAR ' + st.year + ' · WEEK ' + st.week + ' · THE WORLD'), 'World map']),
        btn('.icon-btn', { testid: 'btn-world-close', 'aria-label': 'Close', onclick: function () { ui.close(s.id); } }, '✕')]));
      s.body.appendChild(worldMap(st, { onPin: openRegion }));
      s.body.appendChild(statusStrip(st));
      s.body.appendChild(el('div.tw-list', T().map(st).map(function (r) { return regionCard(st, r, openRegion); })));
      s.foot.appendChild(btn('.btn.block', { testid: 'btn-world-done', onclick: function () { ui.close(s.id); } }, 'Back'));
    }
  });
  function openRegion(id) { sfx('tap'); ui.show('tour-region', { region: id, city: null }); }
  ui.openWorld = function () { if (!has()) return null; return ui.show('world'); };

  /* ---- The regional map (region screen + the on-tour board) ------------------------------------------------------- */
  ui.tourRegionMap = function (st, region, o) {
    o = o || {};
    var L = LAND[region] || LAND.uk_europe, cities = T().cities(region), here = T().here(st);
    var box = el('div.tw-map.region', { testid: o.testid || 'region-map', data: { region: region } });
    box.style.background = L.sea;
    var s = svg('svg', { viewBox: '0 0 100 ' + (100 * AR), preserveAspectRatio: 'none', class: 'tw-svg' });
    land(s, L.shapes, L.fill, L.edge);
    if (L.snow) L.shapes.forEach(function (p) { s.appendChild(svg('polygon', { points: pts(p.filter(function (q) { return q[1] < 40; }).concat([[99, 30], [1, 30]])), fill: 'rgba(240,246,255,.35)' })); });
    (L.lakes || []).forEach(function (l) { s.appendChild(svg('ellipse', { cx: l[0], cy: l[1] * AR, rx: l[2], ry: l[3] * AR, fill: L.sea, transform: 'rotate(' + l[4] + ' ' + l[0] + ' ' + l[1] * AR + ')' })); });
    var route = (o.route || []).map(function (id) { return T().cityDef(id); }).filter(Boolean);
    if (route.length > 1) s.appendChild(svg('polyline', { points: pts(route.map(function (c) { return [c.x, c.y]; })), fill: 'none', stroke: '#ffb347', 'stroke-width': 0.8, 'stroke-dasharray': '2 1.2', 'stroke-linejoin': 'round' }));
    cities.forEach(function (c) {
      var d = LBL[c.id] || [0, 4.6], onRoute = (o.route || []).indexOf(c.id) >= 0;
      s.appendChild(svg('text', { x: c.x + d[0], y: (c.y * AR + d[1]).toFixed(1), 'text-anchor': 'middle', 'font-size': 3.1, 'font-weight': onRoute || c.id === o.sel ? 900 : 600,
        fill: c.id === o.sel || onRoute ? '#fff3d6' : 'rgba(240,244,255,.82)', stroke: 'rgba(0,0,0,.55)', 'stroke-width': 0.5, 'paint-order': 'stroke' }))
        .textContent = c.name;
    });
    box.appendChild(s);
    cities.forEach(function (c) {
      var n = o.counts ? o.counts[c.id] || 0 : 0, fest = T().venues(region).some(function (v) { return v.city === c.id && (v.festival || v.hall || v.moose); });
      box.appendChild(btn('.tw-cpin' + (c.id === o.sel ? '.sel' : '') + (c.id === here ? '.here' : '') + (fest ? '.fest' : '') + ((o.route || []).indexOf(c.id) >= 0 ? '.route' : ''),
        { testid: 'city-pin-' + c.id, 'aria-label': c.name + (n ? ', ' + n + ' gigs' : ''), style: { left: pct(c.x), top: pct(c.y) }, onclick: function () { if (o.onSel) o.onSel(c.id); } },
        [el('i'), n ? el('b', String(n)) : null]));
    });
    return box;
  };

  /* ---- Region screen ------------------------------------------------------------------------------------------------ */
  function pkgCard(st, p, region) {
    var q = p.quote || {}, stops = (q.stops || []).map(function (x) { return (x.festival ? '🎪 ' : x.hall ? '🏯 ' : '') + x.cityName; });
    var win = p.window ? 'Leaves only in week ' + p.window.join(' or ') + (GG.calendar ? ' (' + GG.calendar.monthName(p.window[0]) + ')' : '') : null;
    return el('div.tw-pkg' + (p.ok ? '.ok' : ''), { testid: 'pkg-' + p.id, data: { ok: p.ok ? '1' : '0' } }, [
      el('div.tw-rtop', [el('div.grow', [el('b', p.name), el('div.small.dim', fill(p.blurb || ''))]), p.showcase ? el('span.tw-chip.amber', 'Showcase') : p.festival ? el('span.tw-chip.amber', 'Festival') : null]),
      el('div.tw-route', stops.join(' → ')),
      el('div.tw-chips', [el('span.tw-chip', (q.weeks || p.stops.length) + ' week' + ((q.weeks || p.stops.length) > 1 ? 's' : '')), el('span.tw-chip', 'from ' + money(q.total)),
        el('span.tw-chip.good', '≈ ' + money(q.payEst) + ' in fees'), el('span.tw-chip.good', '≈ +' + num(q.fansEst) + ' fans'), win ? el('span.tw-chip', win) : null]),
      !p.ok && p.why ? el('div.small.bad', { testid: 'pkg-why' }, p.why) : null,
      btn('.btn.small.block' + (p.ok ? '.primary' : ''), { testid: 'pkg-open-' + p.id, onclick: function () { ui.show('tour-pkg', { pkg: p.id, choices: q.choices || {} }); } }, p.ok ? 'Pick the details ▸' : 'See the details')
    ]);
  }
  ui.define('tour-region', {
    kind: 'full', cls: 'tworld',
    build: function (s, d) {
      var st = S(); if (!st || !has(st)) return;
      var v = T().regionView(st, d.region); if (!v) return;
      var R = v.region, sel = d.city || (T().here(st) && T().cityDef(T().here(st)).region === R.id ? T().here(st) : R.home);
      ui.append(s.body, el('div.tw-head', [btn('.icon-btn', { testid: 'btn-region-back', 'aria-label': 'Back', onclick: function () { ui.close(s.id); } }, '‹'),
        el('h2', [el('span.sub', (v.unlocked ? 'OPEN' : 'LOCKED') + ' · ' + (R.chart || '')), R.icon + ' ' + R.name])]));
      s.body.appendChild(el('p.small.dim.tw-blurb', fill(R.blurb || '')));
      s.body.appendChild(el('div.tw-chips', [seasonChip(v.season), el('span.tw-chip' + (v.fit >= 0.85 ? '.good' : v.fit < 0.65 ? '.bad' : ''), 'Genre fit ' + Math.round(v.fit * 100) + '%'),
        el('span.tw-chip', '✈ ' + money(R.flight) + ' a head'), el('span.tw-chip', num(v.state ? v.state.fans : 0) + ' fans here')].concat((v.holidays || []).slice(0, 2).map(function (h) { return el('span.tw-chip', h.icon + ' ' + h.name); }))));
      var a = T().active(st);
      s.body.appendChild(ui.tourRegionMap(st, R.id, { sel: sel, route: a && a.region === R.id ? a.stops.map(function (x) { return x.city; }) : null,
        onSel: function (id) { s.rerender(Object.assign({}, d, { city: id })); } }));
      var c = v.cities.filter(function (x) { return x.id === sel; })[0];
      if (c) s.body.appendChild(el('div.panel.tw-city', { testid: 'region-city' }, [el('b', c.name + (c.here ? ' · you are here' : '')), el('div.small.dim', fill(c.blurb || '')),
        c.venues.length ? el('div.tw-venues', c.venues.map(function (x) { return el('div.small', [(x.festival ? '🎪 ' : x.hall ? '🏯 ' : '🎸 ') , el('b', x.name), ' · ' + num(x.capacity) + ' cap' + (x.weeks && GG.calendar ? ' · ' + GG.calendar.monthName(x.weeks[0]) : '')]); }))
          : el('div.small.faint', 'No venue that will have you yet. Open dates can land nearby.')]));
      if (v.invite) s.body.appendChild(el('div.panel.warm', [el('div.caps', '📨 Invite'), el('b', v.invite.festival), el('div.small.dim', 'Half the flights are covered until ' + wk(v.invite.expires) + '.')]));
      if (!v.unlocked) {
        s.body.appendChild(el('div.panel.tw-lock', [el('b', '🔒 Locked'), el('div.small.dim', st.era !== 'world' ? 'The world opens in the World stage era.'
          : 'Opens at ' + num(v.threshold) + ' fans (you have ' + num(st.fans) + '), through an invite (a festival slot or a showcase), or when a song blows up here first.')]));
      }
      s.body.appendChild(el('div.caps.tw-sec', 'Tour packages'));
      s.body.appendChild(el('div.tw-list', v.packages.map(function (p) { return pkgCard(st, p, R.id); })));
      s.foot.appendChild(btn('.btn.block', { testid: 'btn-region-done', onclick: function () { ui.close(s.id); } }, 'Back to the map'));
    }
  });

  /* ---- Package picker (live quote) ---------------------------------------------------------------------------------- */
  function optRow(kind, list, cur, label, onPick) {
    return el('div.tw-opts', [el('div.caps', label)].concat(list.map(function (o) {
      var price = o.perWeek != null ? money(o.perWeek) + '/wk' : o.cost ? money(o.cost) : 'free', stars = o.comfort ? ' · ' + '★★★★★'.slice(0, o.comfort) + '☆☆☆☆☆'.slice(0, 5 - o.comfort) : '';
      return btn('.tw-opt' + (o.id === cur ? '.sel' : ''), { testid: 'pick-' + kind + '-' + o.id, 'aria-pressed': o.id === cur ? 'true' : 'false', onclick: function () { onPick(o.id); } },
        [el('span.grow', [el('b', o.name), el('small', fill(o.blurb || ''))]), el('span.tw-price', price + stars)]);
    })));
  }
  ui.define('tour-pkg', {
    kind: 'sheet', tall: true, cls: 'tour-pkg',
    build: function (s, d) {
      var st = S(); if (!st || !has(st)) return;
      var p = T().pkg(d.pkg); if (!p) return;
      var ch = d.choices || {}, can = T().canBook(st, p.id, ch), q = can.quote || T().quote(st, p.id, ch);
      ch = d.choices = Object.assign({}, q.choices);
      s.setTitle(p.name, (T().region(p.region) || {}).name + ' · ' + q.weeks + ' WEEKS');
      function set(k) { return function (id) { var c = Object.assign({}, ch); c[k] = id; sfx('tap'); s.rerender(Object.assign({}, d, { choices: c })); }; }
      ui.append(s.body, [el('div', { testid: 'tour-pkg' }),
        el('div.tw-route', q.stops.map(function (x) { return x.cityName + (x.venue ? ' (' + x.venueName + ')' : ' (open date)'); }).join(' → ')),
        el('div.small.dim', 'Departs ' + wk(q.start) + ' (next Monday), home after ' + wk(q.end) + '.' + (q.inviteDiscount ? ' Invite: ' + money(q.inviteDiscount) + ' off the flights.' : '')),
        optRow('vehicle', T().vehicles(p.region), ch.vehicle, 'Rental', set('vehicle')),
        optRow('stay', T().stays(), ch.stay, 'Where you sleep', set('stay')),
        optRow('extra', T().extras(), ch.extra, 'One extra', set('extra'))]);
      var rows = [['Flights (' + q.people + ' people)', q.flights], ['Rental', q.rental], ['Extra', q.extra], ['Hotels (weekly)', q.hotels]];
      s.body.appendChild(el('div.panel.tw-quote', rows.map(function (r) { return el('div.kv2', [el('span', r[0]), el('b', money(r[1]))]); }).concat([
        el('div.kv2.tot', { testid: 'quote-upfront' }, [el('span', 'Up front'), el('b', money(q.upfront))]),
        el('div.kv2.tot', { testid: 'quote-total' }, [el('span', 'Total'), el('b', money(q.total))]),
        el('div.kv2', [el('span', 'Fees (a guess)'), el('b.good', '≈ ' + money(q.payEst))]),
        el('div.kv2', [el('span', 'New fans (a guess)'), el('b.good', '≈ +' + num(q.fansEst))]),
        el('div.small.dim', 'Fund: ' + money(st.fund))])));
      if (!can.ok) s.body.appendChild(el('div.small.bad', { testid: 'quote-why' }, can.why));
      s.foot.appendChild(btn('.btn.primary.big.block', { testid: 'btn-book-tour', disabled: !can.ok, onclick: function () { book(p, ch); } }, can.ok ? 'Book it: ' + money(q.upfront) + ' now' : 'Can’t book yet'));
    }
  });
  function book(p, ch) {
    var st = S(); if (!st) return;
    var r = T().book(st, p.id, ch);
    if (!r || r.error) { ui.toast((r && r.error) || 'Could not book that.'); return; }
    sfx('cash');
    if (GG.main) GG.main.sync();
    ['tour-pkg', 'tour-region', 'world'].forEach(function (id) { if (ui.isOpen(id)) ui.close(id); });
    ui.toast('Booked: ' + r.name + '. Wheels up next Monday. ' + fill('{front} is already packing.'), { who: 'Tour booked', ms: 5000 });
  }

  /* ---- Planner hooks (52_ui_week) ------------------------------------------------------------------------------------ */
  var TOUR_ACT = {
    rest: { icon: '🛌', name: 'Rest', blurb: 'Sleep in, find a laundromat. Homesickness down.' },
    promote: { icon: '📻', name: 'Promote locally', blurb: 'Radio, record stores, lamp posts. Fans in this region.' },
    rehearse: { icon: '🏨', name: 'Hotel-room rehearsal', blurb: 'Practice pads, unplugged guitars. Most of the gains.' }
  };
  ui.tourBlocks = function (st) { return has(st) && T().away(st) ? T().allowedBlocks(st) : null; };
  ui.tourAct = function (id, st) { var a = ui.act(id); return has(st) && T().away(st) && TOUR_ACT[id] ? Object.assign({}, a, TOUR_ACT[id]) : a; };
  ui.tourForced = function (st) { return has(st) && T().away(st) ? !!T().status(st).forcedRest : false; };
  ui.tourPlanHead = function (st) {
    if (!has(st)) return null;
    var x = T().status(st);
    if (x.onTour) {
      var a = x.active, R = T().region(a.region) || {};
      return el('div.panel.warm.tw-plan', { testid: 'plan-tour' }, [el('div.caps', R.icon + ' On tour · ' + a.name + ' · stop ' + (x.index + 1) + '/' + a.stops.length),
        el('b', x.stop.cityName + ': ' + (x.stop.venue ? x.stop.venueName : 'open date')),
        el('div.small.dim', x.stop.venue ? (x.weeksLeft ? x.weeksLeft + ' more stop' + (x.weeksLeft > 1 ? 's' : '') + ' after this.' : 'Last stop. Home next week.')
          : 'Open date: Go opens the regional board. Pick a club, or let the promoter pick.'),
        homesickBar(x), x.forcedRest ? el('div.small.bad', { testid: 'plan-forced' }, 'Too homesick: the first block is a rest. Everyone just wants to call home.') : null]);
    }
    if (x.booked) return el('div.panel.tw-plan', { testid: 'plan-tour' }, [el('div.caps', '✈ Booked · departs next Monday'), el('b', x.active.name)]);
    if (x.worldEra && !x.active) return btn('.btn.ghost.block', { testid: 'btn-plan-world', onclick: function () { ui.openWorld(); } }, 'Plan a world tour 🌍');
    return null;
  };
  // Go on tour with an open date and no gig: the board (the region's clubs) first. Returns a wrapped `next` or null.
  ui.tourOpenDate = function (st, next) {
    if (!has(st) || st.gig || !ui.openBoard) return null;
    var stop = T().stop(st);
    if (!stop || stop.venue || ui.gigAutoplay) return null;
    return function () { ui.openBoard({ mode: 'book', onBook: next, onSkip: next }); };
  };
  ui.tourCardNote = function (st, card) {
    if (!has(st) || !card || !/^wt_/.test(card.id)) return null;
    var ctx = (st.tour && st.tour.ctx) || {}, R = T().region(ctx.region || T().regionOf(st)), stop = T().stop(st);
    return R ? el('div.tw-cardnote', { testid: 'card-region' }, R.icon + ' ' + R.name + (stop && stop.city && T().cityDef(stop.city).region === R.id ? ' · ' + stop.cityName : '')) : null;
  };

  /* ---- The on-tour board (56_ui_board) ------------------------------------------------------------------------------- */
  ui.tourBoard = {
    on: function (st) { return has(st) && T().away(st); },
    title: function (st) { var R = T().region(T().regionOf(st)) || {}; return (R.icon || '') + ' ' + (R.short || R.name || 'Tour') + ' board'; },
    map: function (st, list, sel, onSel) {
      var region = T().regionOf(st), counts = {};
      list.forEach(function (l) { var id = l.cityId || (T().cityDef(l.city) || {}).id; if (id) counts[id] = (counts[id] || 0) + 1; });
      var stop = T().stop(st), a = T().active(st);
      sel = sel && T().cityDef(sel) && T().cityDef(sel).region === region ? sel : stop ? stop.city : (T().region(region) || {}).home;
      var c = T().cityDef(sel), here = list.filter(function (l) { return (l.cityId || (T().cityDef(l.city) || {}).id) === sel; });
      return { sel: sel, map: ui.tourRegionMap(st, region, { sel: sel, counts: counts, route: a ? a.stops.map(function (x) { return x.city; }) : null, onSel: onSel, testid: 'board-map' }),
        city: c, here: here, km: stop && c ? T().legKm(stop.city, sel) : 0 };
    },
    strip: function (st) {
      var a = T().active(st), v = a && T().content().vehicles[a.choices.vehicle];
      return el('div.panel', { testid: 'board-rental' }, [el('div.gb-van', [el('span', { style: 'font-size:22px' }, v && v.look === 'train' ? '🚄' : '🚐'), el('div.grow', [
        el('div', { style: 'font-weight:800' }, (v ? v.name : 'A rental') + ' · comfort ' + (v ? v.comfort : 1) + '/5'),
        el('div.small.dim', fill((v && v.blurb) || (drv(st).you ? 'You drive' : drv(st).name + ' drives') + ' whatever they give you, on whichever side of the road.'))])])]);
    }
  };

  /* ---- The flight (departure Monday) ------------------------------------------------------------------------------- */
  var flown = {};
  ui.flightDue = function (st) {
    if (!has(st) || !views()) return false;
    var a = T().active(st);
    return !!(a && a.status === 'on' && a.start === st.totalWeek && !flown[a.id] && st.phase === 'monday');
  };
  ui.playFlight = function (done) {
    var st = S(), a = st && T().active(st); if (!a) { if (done) done(); return null; }
    flown[a.id] = true;
    sfx('whoosh');
    return ui.show('tour-flight', { tour: a, done: done, t0: 0 });
  };
  ui.define('tour-flight', {
    kind: 'full', cls: 'tworld.flight', sticky: true,
    build: function (s, d) {
      var st = S(), a = d.tour; if (!st || !a) return;
      var R = T().region(a.region) || {}, K = T().content(), home = T().cityDef(R.home) || {}, jet = (T().cfg().jetLag || {})[a.region] || 5;
      ui.append(s.body, [el('div.tw-head', [el('h2', [el('span.sub', 'DEPARTURE DAY · ' + wk(st.totalWeek)), '✈ ' + R.name])]),
        el('div', { testid: 'tour-flight' })]);
      var map = worldMap(st, { compact: false, testid: 'flight-map' }), plane = el('div.tw-plane', '✈️');
      map.appendChild(plane); s.body.appendChild(map);
      var cp = K.canadaPin || [18, 30], pin = R.pin || [50, 28];
      var t0 = performance.now(), dur = (GG.prefs && GG.prefs.get && GG.prefs.get().fastAnim) ? 900 : 2200;
      (function step(now) {
        if (!ui.isOpen(s.id) || !plane.isConnected) return;
        var u = Math.min(1, (now - t0) / dur), e = u * u * (3 - 2 * u), mx = (cp[0] + pin[0]) / 2, my = Math.min(cp[1], pin[1]) - 14 - Math.abs(pin[0] - cp[0]) * 0.17;
        var x = (1 - e) * (1 - e) * cp[0] + 2 * (1 - e) * e * mx + e * e * pin[0], y = (1 - e) * (1 - e) * cp[1] + 2 * (1 - e) * e * my + e * e * pin[1];
        plane.style.left = x + '%'; plane.style.top = y + '%'; plane.style.transform = 'translate(-50%,-50%) rotate(' + (pin[0] >= cp[0] ? 0 : 180) + 'deg)';
        if (u < 1) requestAnimationFrame(step); else plane.classList.add('landed');
      })(t0);
      var veh = K.vehicles[a.choices.vehicle] || {}, stay = K.stays[a.choices.stay] || {};
      var KL = K.lines || {}, bbl = KL.byBand && KL.byBand[st.bandId], dep = (bbl && bbl.depart && bbl.depart[a.region]) || (KL.depart || {})[a.region];   // v0.9: byBand first
      dep = Array.isArray(dep) ? ui.pick(ui.ownLines(dep)) : dep && ui.ownLines([dep]).length ? dep : null;
      s.body.appendChild(el('div.panel.tw-flight', [el('p.card-text', fill(dep || 'Wheels up.')),
        el('p.small', 'Landed in ' + (home.name || 'the airport') + '. Jet lag: burnout +' + jet + '. ' + (veh.name ? veh.name + ' is waiting in the car park' + (veh.look === 'sardine' ? '. ' + heads(st) + ' people and a drum kit. It will be cosy.' : '.') : '')),
        el('p.small.dim', a.stops.map(function (x) { return x.cityName; }).join(' → ') + (stay.name ? ' · ' + stay.name : '')),
        el('p.small.dim', drv(st).you ? 'You collect the rental keys. Nobody else wants to drive on this side of the road.' : drv(st).name + ' collects the rental keys and adjusts every mirror before anyone gets in.')]));
      s.foot.appendChild(btn('.btn.primary.big.block', { testid: 'btn-flight-go', onclick: function () { ui.close(s.id); } }, 'Grab the gear ▸'));
    },
    onClose: function (s) { if (s.data && s.data.done) setTimeout(s.data.done, 0); }
  });

  /* ---- Homecoming (wrap.tour.home) --------------------------------------------------------------------------------- */
  ui.define('tour-home', {
    kind: 'sheet', cls: 'tour-home',
    build: function (s, d) {
      var sum = d.summary; if (!sum) return;
      var R = T().region(sum.region) || {}, lines = (T().content().lines || {}).home || [];
      s.setTitle('Home!', (R.name || 'ABROAD').toUpperCase() + ' · ' + sum.gigs + ' SHOWS');
      ui.append(s.body, [el('div', { testid: 'tour-home' }),
        el('p.card-text', homeLine(lines, sum)),
        el('div.panel.tw-quote', [
          el('div.kv2', [el('span', 'Shows'), el('b', sum.gigs + (sum.festivals ? ' (' + sum.festivals + ' festival' + (sum.festivals > 1 ? 's' : '') + ')' : ''))]),
          el('div.kv2', [el('span', 'Best night'), el('b', sum.best || '—')]),
          el('div.kv2', [el('span', 'New fans'), el('b.good', '+' + num(sum.fans))]),
          el('div.kv2', [el('span', 'Fees'), el('b', money(sum.pay))]),
          el('div.kv2', [el('span', 'Flights, rental, hotels'), el('b.bad', '−' + money(sum.cost))]),
          el('div.kv2.tot', [el('span', 'Net'), el('b' + (sum.net >= 0 ? '.good' : '.bad'), (sum.net >= 0 ? '+' : '−') + money(Math.abs(sum.net)))])]),
        sum.cut ? el('p.small.dim', 'You flew home early. Nobody talks about it. Everybody talks about it.') : null,
        el('p.small.dim', fill(drv(S()).you ? '{van} is exactly where you left it in long-term parking. It starts on the third try.' : drv(S()).name + ' is at arrivals with {van}, holding a sign with the band name spelled correctly. First time ever.'))]);
      s.foot.appendChild(btn('.btn.primary.big.block', { testid: 'btn-home-ok', onclick: function () { ui.close(s.id); } }, 'Home sweet ' + ui.space(S()).replace(/^the /i, '')));
    },
    onClose: function (s) { if (s.data && s.data.done) setTimeout(s.data.done, 0); }
  });

  // v0.9: world.lines.home is neutral + byBand (ui.pool); a line naming another band's people is skipped.
  function homeLine(flat, sum) {
    var W = T().content() || {}, pool = W.lines ? ui.pool(W.lines, 'home') : flat, own = ui.ownLines(pool);
    return own.length ? fill(own[(sum.start || 0) % own.length]) : fill('Home. ' + ui.space(S(), true) + ' smells exactly the same.');
  }
  /* ---- The Moose Opera (Helsinki) ------------------------------------------------------------------------------------ */
  var mooseDue = false;
  GG.on('tour:moose', function () { mooseDue = true; });
  ui.playMoose = function (done) { mooseDue = false; sfx('cheer'); return ui.show('moose-opera', { done: done }); };
  ui.define('moose-opera', {
    kind: 'full', cls: 'tworld.moose', sticky: true,
    build: function (s) {
      var st = S(); if (!st) return;
      ui.append(s.body, [el('div.tw-head', [el('h2', [el('span.sub', 'HELSINKI · THE FINNISH NATIONAL MOOSE OPERA'), 'Platinum in Finland'])]),
        el('div.tw-opera', { testid: 'moose-opera' }, [el('div.tw-chand', [el('span.ant.l'), el('span.ant.r'), el('span.bulbs')]), el('div.tw-disc', [el('span', '🫎')]), el('div.tw-curtain.l'), el('div.tw-curtain.r')]),
        el('div.panel.tw-flight', [el('p.card-text', fill((T().content().lines || {}).moose || 'The moose concept album just went platinum in Finland.')),
          el('p.small', 'The chandelier is shaped like antlers. Nobody can explain it. The orchestra plays the moose song in the interval, unasked.'),
          el('p.small.dim', fill('{namer} has already written a sequel. It is called "Moose Opera". Hold that thought for later in the career.'))])]);
      s.foot.appendChild(btn('.btn.primary.big.block', { testid: 'btn-moose-ok', onclick: function () { ui.close(s.id); } }, 'Bow to the moose ▸'));
    },
    onClose: function (s) { if (s.data && s.data.done) setTimeout(s.data.done, 0); }
  });

  /* ---- v0.9 (owner Q3): every other band's World payoff (the sim's 'tour:payoff' { packageId, flag }) ------------------
     Frost Heave's squat anthem at Wackelstein (Berlin), Gravel Kings on Mudstonbury's main stage, the Ramblers' Australian
     country-festival circuit. The package's payoff block may carry { head, sub, text, line, trophy }; else its name + the
     payoff line. Same beat as the Moose Opera: a full screen after the wrap (a toast on autoplay). */
  var payoffDue = null;
  var PAYOFF_ICON = { punk: '🧷', rock: '🎸', country: '🤠', metal: '🤘' };
  GG.on('tour:payoff', function (p) { payoffDue = p || {}; });
  function payoffInfo(p) {
    var st = S(), pkg = p && p.packageId && T() && T().pkg ? T().pkg(p.packageId) : null, P = (pkg && pkg.payoff) || {};
    var city = P.city && T().cityDef ? T().cityDef(P.city) : null, R = pkg && T().region ? T().region(pkg.region) || {} : {};
    return { id: (pkg && pkg.id) || 'payoff', genre: (st && st.genre) || 'rock',
      head: fill(P.head || P.trophy || (pkg && pkg.name) || 'It happened'),
      sub: String(fill(P.sub || [city && city.name, R.name].filter(Boolean).join(' · ') || 'Abroad')).toUpperCase(),
      text: fill(P.text || P.line || '{band} just did the thing nobody back home is going to believe.'),
      quip: fill(P.quip || '{front} is already calling home about it. Collect.') };
  }
  ui.playPayoff = function (p, done) { payoffDue = null; sfx('cheer'); return ui.show('tour-payoff', { payoff: p || {}, done: done }); };
  ui.define('tour-payoff', {
    kind: 'full', cls: 'tworld.moose', sticky: true,
    build: function (s, d) {
      var st = S(); if (!st) return;
      var x = payoffInfo(d.payoff);
      ui.append(s.body, [el('div.tw-head', [el('h2', [el('span.sub', x.sub), x.head])]),
        el('div.tw-opera.po-' + x.genre, { testid: 'tour-payoff', data: { pkg: x.id } }, [el('div.tw-disc', [el('span', PAYOFF_ICON[x.genre] || '🌍')]), el('div.tw-curtain.l'), el('div.tw-curtain.r')]),
        el('div.panel.tw-flight', [el('p.card-text', x.text), el('p.small.dim', x.quip)])]);
      s.foot.appendChild(btn('.btn.primary.big.block', { testid: 'btn-payoff-ok', onclick: function () { ui.close(s.id); } }, 'Take a bow ▸'));
    },
    onClose: function (s) { if (s.data && s.data.done) setTimeout(s.data.done, 0); }
  });

  /* ---- The wrap (52_ui_week) ------------------------------------------------------------------------------------------ */
  var seenHome = {};
  ui.tourWrap = function (w) {
    var st = S(), t = w && w.tour, out = [];
    if (!st || !t || !has(st)) return out;
    if (t.away) {
      var calls = (st.chat || []).filter(function (m) { return m.tone === 'home' && ui.chatOk(m, st); }).slice(-2);
      out.push(el('div.panel', { testid: 'wrap-tour' }, [el('div.caps', '✈ On tour'),
        t.hotel ? el('div.line-list', [el('div', [el('span', 'Hotels this week'), el('span.bad', '−' + money(t.hotel))])]) : null,
        el('div.tw-bar', { testid: 'wrap-homesick' }, [el('span.small', '🏠 Homesick ' + Math.round(t.homesick) + '/100'), ui.bar(t.homesick, 100, { color: t.homesick >= 70 ? 'var(--bad)' : t.homesick >= 45 ? 'var(--amber)' : 'var(--blue)' })]),
        calls.length ? el('div.tw-calls', { testid: 'wrap-callhome' }, [el('div.caps', '📞 Calling home')].concat(calls.map(function (m) { return ui.chatMsg ? ui.chatMsg(m) : el('p.small', fill(m.text)); }))) : null]));
    }
    (t.unlocked || []).forEach(function (id) {
      var R = T().region(id) || {};
      out.push(el('div.panel.warm.row', { testid: 'wrap-unlocked' }, [el('span', { style: 'font-size:24px' }, R.icon || '🌍'), el('div.grow', [el('b', R.name + ' is open'), el('div.small.dim', 'Tour packages are on the world map.')]),
        btn('.btn.small', { testid: 'wrap-world', onclick: function () { ui.openWorld(); } }, 'Map')]));
    });
    if (t.invite) out.push(el('div.panel.warm', { testid: 'wrap-invite' }, [el('div.caps', '📨 Invite'), el('b', t.invite.festival), el('div.small.dim', 'Half the flights are covered for ten weeks.')]));
    (t.broken || []).forEach(function (id) { var R = T().region(id) || {}; out.push(el('div.panel.warm', [el('div.caps', '★ Broken'), el('b', bandName(st) + ' broke ' + R.name + '.')])); });
    if (t.big) out.push(el('div.panel.warm', [el('div.caps', '🔥 Big in one place'), el('b', '“' + t.big.song + '” is huge in ' + (T().region(t.big.region) || {}).name + '.')]));
    if (t.gong) out.push(el('div.panel' + (t.gong.won ? '.warm' : ''), { testid: 'wrap-gong' }, [el('div.caps', '🥁 The Global Gong'),
      el('b', !t.gong.nominated ? 'Not nominated this year.' : t.gong.won ? bandName(st) + ' won the Global Gong!' : 'The Gong went to ' + t.gong.winner + '.')]));
    if (t.home) {
      var sum = t.home;
      out.push(el('div.panel.warm.row', { testid: 'wrap-home' }, [el('span', { style: 'font-size:24px' }, '🏠'), el('div.grow', [el('b', 'Home from ' + ((T().region(sum.region) || {}).name || 'abroad')),
        el('div.small.dim', sum.gigs + ' shows · +' + num(sum.fans) + ' fans · net ' + (sum.net >= 0 ? '+' : '−') + money(Math.abs(sum.net)))]),
        btn('.btn.small', { testid: 'wrap-home-open', onclick: function () { ui.show('tour-home', { summary: sum }); } }, 'Recap')]));
    }
    // Moments after the wrap opens: the Moose Opera, then the homecoming (not on autoplay).
    var chain = [];
    if (mooseDue && views()) chain.push(function (next) { ui.playMoose(next); });
    else if (mooseDue) { mooseDue = false; ui.toast('Platinum in Finland. The moose concept album did it.', { who: 'Moose Opera' }); }
    if (payoffDue && views()) { var po = payoffDue; chain.push(function (next) { ui.playPayoff(po, next); }); }
    else if (payoffDue) { var pi = payoffInfo(payoffDue); payoffDue = null; ui.toast(pi.head + '. ' + pi.text, { who: 'World Stage' }); }
    if (t.home && views() && !seenHome[t.home.id]) { seenHome[t.home.id] = 1; chain.push(function (next) { ui.show('tour-home', { summary: t.home, done: next }); }); }
    if (chain.length) setTimeout(function run() { var f = chain.shift(); if (f && ui.isOpen('wrap')) f(function () { setTimeout(run, 0); }); }, 400);
    return out;
  };

  /* ---- The Global Gong ceremony (the v0.5 red carpet, in Amsterdam) ---------------------------------------------------- */
  var G = null;
  function carpet() { var R = GG.render; return GG.main && GG.main.renderOk && R && R.available && R.carpet && (!R.sceneNames || R.sceneNames().indexOf('carpet') >= 0) ? R : null; }
  function rc(fn, a) { var R = carpet(); if (!R) return null; try { return R.carpet[fn](a); } catch (e) { console.warn('[gong] carpet.' + fn, e); return null; } }
  ui.gongDue = function (st) {
    if (!has(st) || st.era !== 'world' || st.phase !== 'wrap' || !views()) return false;
    var g = T().gong(st);
    return st.week === g.week && !g.result && g.nominated;
  };
  // v0.9: the Gong carpet is the band's (content world.gongCarpet[bandId]); Hail Damage's lines are its default, other
  // bands without content get their own singer + filler ('@front' / '@filler').
  var GONG_CARPET = [
    { who: 'reporter', text: 'Live from Amsterdam! Who are you wearing?' }, { who: 'marcel', text: 'The cape. It has its own passport now.' },
    { who: 'reporter', text: 'Is it true the Gong is a real gong?' }, { who: 'jaxon', text: 'Yes. It does not go on the drum kit. We had a meeting about it.' }
  ];
  var GONG_CARPET_ANY = [
    { who: 'reporter', text: 'Live from Amsterdam! Who are you wearing?' }, { who: '@front', text: 'Something from a thrift store in {city}. It has been to more countries than we have.' },
    { who: 'reporter', text: 'Is it true the Gong is a real gong?' }, { who: '@filler', text: 'Yes. It does not go on the drum kit. We had a meeting about it.' }
  ];
  function gongCarpet(st) {
    var W = (GG.content.world || {}).gongCarpet, own = W && Array.isArray(W[st.bandId]) && W[st.bandId].length ? W[st.bandId] : null;
    return ui.presentLines(own || (st.bandId === 'hail_damage' ? GONG_CARPET : GONG_CARPET_ANY), st) || GONG_CARPET_ANY;   // (v0.9: minus quit bandmates)
  }
  var GONG_SPEECH = { id: 'gong_speech', title: 'Say something! (in five languages)', text: 'The gong is heavier than it looks. The interpreter is waiting. Somebody in the back is already hitting it.',
    choices: [
      { label: 'Thank Canada, then everyone else', hint: 'Safe. Moms cry on four continents.', effects: { fans: 60, mood: { all: 3 } }, outcome: 'You thank {city}. The room claps politely. Somewhere in Finland, a moose looks up.' },
      { label: 'Thank the Japanese fan club', hint: 'Emiko will frame it', effects: { buzz: 6, fans: 40 }, outcome: 'Emiko Tanabe stands up in the balcony and bows. Two hundred people bow back.' },
      { label: 'Hit the gong', hint: 'Gamble: it is not yours to hit', effects: { buzz: 12, fund: -150 }, outcome: 'BWONNNG. The security guard sighs. The fine is €150. Worth it.' }
    ] };
  function carpetSetup(st) {
    var band = GG.content.bands && GG.content.bands[st.bandId], looks = {};
    (band && band.members || []).forEach(function (m) { looks[m.id] = m.look; });
    var members = (GG.drama && GG.drama.lineup ? GG.drama.lineup(st) : (st.members || []).filter(function (m) { return m.status === 'active'; })).map(function (m) {
      return { id: m.id, name: m.name, role: m.role, look: m.look || looks[m.id] || null };
    });
    var rv = GG.content.rivals && band && GG.content.rivals[band.rival];
    rc('setup', { members: members, player: st.player, flags: st.flags || {}, outfit: 'tux', genre: st.genre, rival: { id: rv ? rv.id : 'tundra_wraith', name: rv ? rv.name : 'Tundra Wraith' }, year: st.year, sign: 'The Global Gong' });
  }
  ui.playGong = function (done) {
    var st = S(); if (!st || !has(st)) { if (done) done(null); return null; }
    G = { done: done, phase: 'carpet', line: 0, result: null, speech: false, threeD: false, start: { fund: st.fund, fans: st.fans, buzz: st.buzz } };
    var R = carpet();
    if (R) { try { G.threeD = R.setScene('carpet') !== false; } catch (e) { G.threeD = false; } }
    if (G.threeD) { carpetSetup(st); rc('setMode', 'carpet'); }
    return ui.show('gong', {});
  };
  function keepDrawing() { if (G && G.threeD && GG.render) setTimeout(function () { try { GG.render.setPaused(false); } catch (e) { /* ignore */ } }, 0); }
  GG.on('screen:open', keepDrawing); GG.on('screen:close', keepDrawing);
  function gframe(s) {
    if (!G || !G.threeD) return;
    requestAnimationFrame(function () {
      var top = s.body.querySelector('.lo-top'), card = s.body.querySelector('.lo-card');
      if (!top || !card) return;
      rc('setFrame', { top: Math.round(top.getBoundingClientRect().bottom), bottom: Math.round((window.innerHeight || 844) - card.getBoundingClientRect().top) });
    });
  }
  ui.define('gong', {
    kind: 'full', cls: 'loonies.gong', sticky: true, live3d: true,
    build: function (s) {
      var st = S(); if (!st || !G) return;
      var info = T().gong(st), band = bandName(st);
      var head = el('div.lo-top', [el('div.caps', info.name + ' · ' + info.city + ' · Year ' + st.year), el('div.lo-title', { testid: 'gong-phase', data: { phase: G.phase } },
        { carpet: 'The red carpet', show: 'Inside the Concertgebouwn’t', summary: 'After-party' }[G.phase] || '')]);
      var card = el('div.lo-card');
      if (!G.threeD) s.body.appendChild(el('div.lo-back' + (G.phase === 'carpet' ? '.carpet' : '.stage') + '.gong'));
      ui.append(s.body, [head, el('div.lo-gap'), card]);
      if (G.phase === 'carpet') {
        var GC = gongCarpet(st), i = Math.min(G.line, GC.length), shown = GC.slice(Math.max(0, i - 1), i + 1);
        if (i === 0) card.appendChild(el('p.small', 'A bronze gong on a teak stand, under a spotlight, behind a velvet rope. The one international award. Twelve countries, one carpet, a lot of flashbulbs.'));
        shown.forEach(function (x) {   // (a band's own npc reporter, e.g. Dolores from Speedy Creek 97, takes the reporter slot)
          var npc = x.who && x.who !== 'reporter' && GG.content.npcs && GG.content.npcs[x.who] && !(st.members || []).some(function (m) { return m.id === x.who; }) ? GG.content.npcs[x.who] : null;
          card.appendChild(x.who === 'reporter' || npc ? el('p.lo-q', [el('b', (npc ? npc.name : 'Reporter') + ': '), fill(x.text)]) : el('p.lo-q', { testid: 'gong-carpet-line' }, [el('b', ui.who(ui.speaker(x.who, st)).short + ': '), fill(x.text)]));
        });
        card.appendChild(btn('.btn.primary.block', { testid: 'btn-gong-next', onclick: function () {
          if (G.line < GC.length) { G.line += 2; rc('flash', 6); s.rerender({}); gframe(s); return; }
          G.phase = 'show'; rc('setMode', 'podium'); s.rerender({}); gframe(s);
        } }, G.line === 0 ? 'Walk the carpet 📸' : G.line < GC.length ? 'Keep walking ▸' : 'Head inside ▸'));
      } else if (G.phase === 'show') {
        card.appendChild(el('h3.lo-cat', 'The Global Gong'));
        if (!G.result) {
          card.appendChild(el('p.small.dim', 'The host reads the category in English, Dutch, Japanese and Russian. The Australian presenter just says "right, the gong".'));
          card.appendChild(el('div.lo-noms', [el('span.chip.you', band), el('span.chip', '+ three bands from around the world')]));
          card.appendChild(btn('.btn.primary.big.block.envelope', { testid: 'btn-gong-envelope', onclick: function () {
            var cur = S(); if (!cur || G.result) return;
            G.result = T().runGong(cur) || { nominated: false, won: false };
            if (GG.main) GG.main.sync();
            if (G.result.won) sfx('cheer'); else sfx('tap');
            rc('envelope', !!G.result.won); rc('flash', G.result.won ? 14 : 4);
            s.rerender({}); gframe(s);
          } }, '✉ Open the envelope'));
        } else {
          var r = G.result;
          card.appendChild(el('div.lo-noms', [el('span.chip.you', band)].concat((r.against || []).map(function (x) { return el('span.chip', x.name + ' (' + x.from + ')'); }))));
          card.appendChild(el('div.lo-winner' + (r.won ? '.won' : ''), { testid: 'gong-winner', data: { won: r.won ? '1' : '0' } }, [el('span.caps', 'And the Gong goes to…'), el('b', r.won ? band : r.winner)]));
          if (!r.won) card.appendChild(el('p.small.dim', fill((r.against || []).some(function (x) { return x.rival && x.name === r.winner; })
            ? (((ui.band(st) || {}).rival === 'tundra_wraith') ? '{rival} accept in corpse paint and thank you by name. In four languages.' : '{rival} accept and thank you by name. In four languages.')
            : 'You clap. {grumbler} claps slower. Much slower. In Dutch.')));
          if (r.won && !G.speech) card.appendChild(btn('.btn.primary.big.block', { testid: 'btn-gong-speech', onclick: function () {
            ui.show('loonie-card', { card: GONG_SPEECH, kind: 'speech', onPick: function (i) { var ch = GONG_SPEECH.choices[i]; if (ch && GG.career.applyEffects) GG.career.applyEffects(S(), ch.effects || {}); G.speech = true; if (GG.main) GG.main.sync(); },
              onDone: function () { if (G) { s.rerender({}); gframe(s); } } });
          } }, 'Give a speech 🎤'));
          else card.appendChild(btn('.btn.primary.block', { testid: 'btn-gong-next', onclick: function () { G.phase = 'summary'; s.rerender({}); gframe(s); } }, 'To the after-party ▸'));
        }
      } else {
        var cur = S(), dd = {};
        ['fund', 'fans', 'buzz'].forEach(function (k) { if (cur[k] !== G.start[k]) dd[k] = cur[k] - G.start[k]; });
        card.appendChild(el('div', { testid: 'gong-summary' }, [el('h3.lo-cat', G.result && G.result.won ? 'The Global Gong is yours!' : 'No gong this year.'),
          el('p.small', G.result && G.result.won ? 'It goes on the trophy shelf. Not on the drum kit. Never on the drum kit.' : fill('The stroopwafels at the after-party were excellent. {filler} took forty.')),
          ui.deltaChips(dd, { emptyText: 'Free stroopwafels' })]));
        card.appendChild(btn('.btn.primary.big.block', { testid: 'btn-gong-done', onclick: function () { ui.close(s.id); } }, 'Fly home ▸'));
      }
      gframe(s);
    },
    onClose: function () {
      var g = G; G = null;
      if (g && g.threeD) { try { GG.render.setScene(S() ? 'garage' : 'none'); } catch (e) { /* ignore */ } }
      if (g && g.done) setTimeout(function () { g.done(g.result); }, 0);
    }
  });

  /* ---- Laptop World tab (53_ui_laptop) --------------------------------------------------------------------------------- */
  ui.worldPanel = function (st) {
    if (!has(st)) return el('p.dim', 'No passport yet.');
    var out = [statusStrip(st), worldMap(st, { compact: true, testid: 'world-mini', onPin: function (id) { ui.openWorld(); openRegion(id); } }),
      btn('.btn.primary.block', { testid: 'btn-world-map', onclick: function () { ui.openWorld(); } }, 'Open the world map 🌍')];
    var charts = T().charts(st).filter(function (c) { return c.pos; });
    if (charts.length) out.push(el('div.panel', [el('div.caps', 'Charts abroad')].concat(charts.map(function (c) {
      var R = T().region(c.region) || {};
      return el('div.kv2', [el('span', R.icon + ' ' + (c.chart || R.name)), el('b', '#' + c.pos + (c.song ? ' · ' + c.song : ''))]);
    }))));
    var hist = (st.tour && st.tour.history || []).slice(-3).reverse();
    if (hist.length) out.push(el('div.panel', [el('div.caps', 'Past tours')].concat(hist.map(function (h) {
      return el('div.kv2', [el('span', h.name + ' · ' + wk(h.start)), el('b' + (h.net >= 0 ? '.good' : '.bad'), (h.net >= 0 ? '+' : '−') + money(Math.abs(h.net)))]);
    }))));
    var gongs = (st.tour && st.tour.gongs || []).filter(function (g) { return g.nominated; });
    if (gongs.length) out.push(el('div.panel', [el('div.caps', 'The Global Gong')].concat(gongs.map(function (g) { return el('div.small', 'Year ' + g.year + ': ' + (g.won ? '🥁 won' : 'went to ' + g.winner)); }))));
    return el('div.stack', { testid: 'world-panel' }, out);
  };

  GG.registerDebug('tourui', function () {
    return { gong: G ? { phase: G.phase, threeD: G.threeD, result: G.result } : null, mooseDue: mooseDue, payoffDue: payoffDue, flown: Object.keys(flown) };
  });
})(window.GG);
