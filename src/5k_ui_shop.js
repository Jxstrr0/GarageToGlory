// 5k_ui_shop.js (v0.8 "Kit", SHOPUI, lane A stage 2): the shop side of the garage, on top of GG.shop (2a_sim_shop.js).
// Screens read GG.state and call GG.shop only; every buy returns { ok, cost, deltas } or { ok: false, why } and the why is
// shown as is (disabled buttons carry it underneath).
//   'gear'   (sheet, tall): the drum shop from the kit (the sketch pad's 🛒): kit quality tiers (GG.shop.kitTiers), the toms /
//            ride / double-kick pedal (gearItems), the song sections (Outro / Solo). A purchase plays GG.audio.hit on the new
//            lane (a little fill for a new kit), and an open sequencer grows its lanes.
//   'merch'  (sheet, tall): the merch hotspot. GG.shop.merchView: what the van hauls vs its space (boxes), the box pile at home,
//            the next gig's estimate, last gig's sales, the misprint status; per item: on the table (toggleTable), a price
//            stepper inside item.range (setPrice), "Buy N boxes" (buyStock; the first shirt order comes back misprinted: a
//            tease for Monday's card).
//   'shop-collector' (full): the misprint turns into a collector's item (shop:misprint status 'collector', or wrap.shop).
// Panels for 57_ui_van's garage-door sheet ('van-info' tabs Van / Space / Car lot): ui.vanSide(st) (an SVG side view of the
// vehicle tier: rusted minivan, 15-passenger + trailer, sprinter, tour bus; the name on the door; a sticker per venue played,
// banned ones crossed out), ui.vanUpgradesPanel, ui.spacePanel (spaces + move, this space's upgrades), ui.dealerPanel (vans:
// quote + trade-in -> buyVan).
// Hooks: ui.shopChips(deltas.shop) (50 deltaChips), ui.merchResult(r.merch) (52 week results + 55 gig results),
// ui.shopWrap(w) (52 wrap: rent, unlocks, eviction, rent arrears, the collector's item), ui.shopWrapShown(w) (52 wrap onShow:
// plays the collector moment once), ui.openGear(), ui.openMerch(), ui.playCollector(done).
// testids: gear-kit-<tier>, gear-buy-<id>, gear-why-<id>, gear-section-<id>; merch-haul, merch-pile, merch-est, merch-last,
// merch-misprint, merch-item-<id>, merch-toggle-<id>, merch-price-<id>, merch-price-down|up-<id>, merch-n-<id>,
// merch-n-down|up-<id>, merch-buy-<id>; van-side, van-sticker (data-banned), van-name-input, van-rename, van-up-<id>,
// space-move-<tier>, space-up-<id>, van-buy-<tier>; wrap-shop-*, btn-collector-ok. Debug: GG.debug('shopui').
(function (GG) {
  var ui = GG.ui, el = ui.el, btn = ui.btn, U = GG.util;
  function S() { return GG.state; }
  function SH() { return GG.shop; }
  function sfx(n) { if (GG.audio && GG.audio.sfx) GG.audio.sfx(n); }
  function money(n) { return U.fmtMoney(Math.round(n || 0)); }
  function sync() { if (GG.main && GG.main.sync) GG.main.sync(); }
  function fill(t) { return t && GG.career && S() ? GG.career.fillText(S(), t) : (t || ''); }
  function content() { return (SH() && SH().content()) || {}; }
  var dbg = { gear: 0, stock: 0, misprintTease: 0, collector: 0, lastBuy: null, lastWhy: null };
  var ERA = { garage: 'Garage', local: 'Local Heroes', signed: 'Signed', world: 'World Stage' };
  var LANE_OF = { toms: 'toms', ride: 'ride', pedal: 'kick' };

  // A failed buy: the sim's plain words, as a toast.
  function nope(r) { dbg.lastWhy = r && r.why; ui.toast((r && r.why) || 'Not today.', { kind: 'bad' }); }
  function bought(kind, id, r) { dbg.lastBuy = { kind: kind, id: id, cost: r.cost }; if (r.cost) sfx('cash'); sync(); }

  /* ---- Hits after a purchase (the new drum, heard) ------------------------------------------------------- */
  function hits(list, gap) {
    if (!GG.audio || !GG.audio.hit) return;
    list.forEach(function (lane, i) { setTimeout(function () { try { GG.audio.hit(lane); } catch (e) { /* no audio */ } }, 40 + i * (gap || 120)); });
  }
  function hear(id) {
    if (id === 'toms') hits(['toms', 'toms', 'toms', 'kick'], 110);
    else if (id === 'ride') hits(['ride', 'ride', 'ride', 'ride'], 180);
    else if (id === 'pedal') hits(['kick', 'kick', 'kick', 'kick', 'kick', 'kick', 'cymbal'], 75);
    else hits(['kick', 'snare', 'hat', 'hat', 'snare', 'toms', 'toms', 'kick', 'cymbal'], 115);   // a new kit: a fill round it
  }
  // An open sequencer (the sketch pad, a Write block) grows its lanes with the new gear.
  function refreshSeq() {
    var e = ui.get && ui.get('seq'), st = S();
    if (!e || !e.data || !e.data.pat || !st || e.data.mode === 'view') return;
    e.data.pat = GG.songs.sanitize(e.data.pat, st.gear, st.genre);
    e.rerender();
  }

  /* ======================================================================================================
     The drum shop
     ====================================================================================================== */
  function sectionRow(st, id) {
    var def = (content().sections || {})[id] || { name: id, blurb: '' }, own = SH().ownsSection(st, id);
    var how = id === 'outro' ? 'Unlocks after 3 songs written. Jaxon will have an idea.' : 'Local Heroes: Dana will insist. She is holding your sticks hostage.';
    return el('div.shop-row' + (own ? '.own' : '.locked'), { testid: 'gear-section-' + id }, [
      el('span.shop-ico', id === 'outro' ? '🎬' : '🎸'),
      el('div.grow', [el('b', def.name), el('div.small.dim', def.blurb), own ? null : el('div.tiny.amber', how)]),
      el('span.tag' + (own ? '.amber' : ''), own ? 'In your songs' : 'Locked')]);
  }
  ui.define('gear', {
    kind: 'sheet', tall: true, cls: 'shop',
    build: function (s) {
      var st = S(); if (!st || !SH()) return;
      s.setTitle('Drum shop', 'PAWN SHOP ROW · 8TH STREET');
      var g = st.gear, kd = SH().kitDef(g.quality) || {}, extra = SH().gearItems(st).filter(function (x) { return x.owned; }).map(function (x) { return x.name; });
      ui.append(s.body, el('div.stack', [
        el('div.panel.warm.shop-now', { testid: 'gear-now' }, [el('div.caps', 'On the riser now'), el('div.shop-big', kd.name || 'A kit'),
          el('div.small.dim', [g.lanes + ' lanes' + (g.doubleKick ? ' · double kick' : '') + (extra.length ? ' · ' + extra.join(', ') : ''),
            ' · the kit tier changes how everything sounds']),
          el('div.small', { style: 'margin-top:4px' }, kd.blurb || '')]),
        el('div.caps', 'The kit (one at a time, in order)'),
        el('div.stack.tight', SH().kitTiers(st).map(function (k) {
          var state = k.current ? 'Playing it' : k.owned ? 'Sold it on' : null;
          return el('div.shop-row' + (k.current ? '.own' : !k.can && !k.owned ? '.locked' : ''), { testid: 'gear-kit-' + k.tier }, [
            el('span.shop-tier', String(k.tier + 1)),
            el('div.grow', [el('b', k.name), el('div.small.dim', k.blurb), !k.can && k.why ? el('div.tiny.bad', { testid: 'gear-why-kit-' + k.tier }, k.why) : null]),
            state ? el('span.tag' + (k.current ? '.amber' : ''), state)
              : btn('.btn.small' + (k.can ? '.primary' : ''), { testid: 'gear-buy-kit-' + k.tier, disabled: !k.can, onclick: function () {
                var r = SH().buyKit(S(), k.tier);
                if (!r.ok) return nope(r);
                bought('kit', k.id, r); hear('kit'); dbg.gear++;
                ui.clearToasts(); ui.toast(k.name + '. It sounds like a real band now. Mostly.', { who: 'Dana', ms: 2600 });
                refreshSeq(); s.rerender();
              } }, money(k.cost))]);
        })),
        el('div.caps', 'Add-ons'),
        el('div.stack.tight', SH().gearItems(st).map(function (x) {
          return el('div.shop-row' + (x.owned ? '.own' : !x.can ? '.locked' : ''), { testid: 'gear-item-' + x.id }, [
            el('span.shop-ico', x.pedal ? '🦶' : x.id === 'toms' ? '🛢️' : '🔔'),
            el('div.grow', [el('b', x.name), x.lane ? el('span.tag', { style: 'margin-left:6px' }, 'Lane ' + x.lane) : x.pedal ? el('span.tag', { style: 'margin-left:6px' }, 'Kick runs') : null,
              el('div.small.dim', x.blurb), !x.owned && !x.can && x.why ? el('div.tiny.bad', { testid: 'gear-why-' + x.id }, x.why) : null]),
            x.owned ? el('span.tag.amber', 'On the kit') : btn('.btn.small' + (x.can ? '.primary' : ''), { testid: 'gear-buy-' + x.id, disabled: !x.can, onclick: function () {
              var r = SH().buyGear(S(), x.id);
              if (!r.ok) return nope(r);
              bought('gear', x.id, r); hear(x.id); dbg.gear++;
              ui.clearToasts(); ui.toast(x.lane ? 'Lane ' + x.lane + ' is on the grid and on the highway now.' : 'Both feet on the kick. Your calves file a complaint.', { who: x.name, ms: 2600 });
              refreshSeq(); s.rerender();
            } }, money(x.cost))]);
        })),
        el('div.caps', 'Song sections'),
        el('div.stack.tight', [sectionRow(st, 'outro'), sectionRow(st, 'solo')]),
        el('p.tiny.faint.center', 'No gong. Not now, not ever. The Global Gong is an award, not a drum.')
      ]));
      s.foot.appendChild(btn('.btn.block', { testid: 'btn-gear-done', onclick: function () { ui.close(s.id); } }, 'Back to the kit'));
    },
    onClose: function () { ui.clearToasts(); }
  });
  ui.openGear = function () { return S() && SH() ? ui.show('gear') : null; };

  /* ======================================================================================================
     The merch table
     ====================================================================================================== */
  var buyN = {};   // boxes to buy per item (UI only)
  function step(p) { return p < 10 ? 1 : p < 40 ? 2 : 5; }
  function priceWord(price, sug) {
    var r = price / (sug || 1);
    return r <= 0.8 ? ['Cheap: flies off the table', 'good'] : r <= 1.1 ? ['Fair price', ''] : r <= 1.6 ? ['Pricey: fewer buyers', 'amber'] : ['Steep: collectors only', 'bad'];
  }
  function misprintPanel(mp) {
    if (!mp) return null;
    var P = (SH().cfg().merch || {}).misprint || { weeks: 8, minFans: 300 }, st = S();
    var text = mp.status === 'pending' ? [el('b', 'The first shirt order came back… wrong. '), 'Somebody will bring it up on Monday.']
      : mp.status === 'boxed' ? [el('b', mp.units + ' HALE DAMAGE shirts, boxed. '), 'Under the workbench with HALE in Sharpie. Dana says misprints are worth money someday.',
        el('div.tiny.dim', { style: 'margin-top:4px' }, 'Week ' + Math.min(P.weeks, Math.max(0, st.totalWeek - mp.week)) + ' of ' + P.weeks + ' in the box · ' + U.fmtNum(Math.min(st.fans, P.minFans)) + ' / ' + U.fmtNum(P.minFans) + ' fans')]
      : mp.status === 'collector' ? [el('b', 'Collector\'s item. '), 'The HALE DAMAGE misprints sell for ' + money(SH().priceOf(st, 'misprint')) + ' each. There will never be more.']
      : [mp.status];
    return el('div.panel' + (mp.status === 'collector' ? '.warm' : ''), { testid: 'merch-misprint', data: { status: mp.status } }, [el('div.row', [el('span.shop-ico', mp.status === 'collector' ? '🏆' : '📦'), el('div.grow.small', text)])]);
  }
  function lastPanel(last) {
    if (!last) return el('div.panel.small.dim', { testid: 'merch-last' }, 'No merch table at a gig yet. Buy a box, put it out, book a gig.');
    var items = Object.keys(last.items || {}).filter(function (id) { return last.items[id].hauled; }).map(function (id) {
      var it = last.items[id], def = SH().merchDef(id);
      return el('span.chip', (def ? def.name : id) + ' ' + it.sold + '/' + it.hauled);
    });
    return el('div.panel', { testid: 'merch-last' }, [el('div.caps', 'Last gig · ' + (last.name || 'a gig')),
      el('div', [el('b', last.sold + ' sold'), ' · ' + money(last.earned) + ' · ' + last.boxes + ' of ' + last.space + ' boxes hauled']),
      items.length ? el('div.chips', { style: 'margin-top:6px' }, items) : null]);
  }
  function itemCard(s, st, it, onTable) {
    var def = SH().merchDef(it.id) || {};
    if (!it.unlocked) return el('div.merch-item.locked', { testid: 'merch-item-' + it.id }, [el('div.row', [el('b.grow', it.name), el('span.tag', '🔒 ' + (ERA[(SH().content().merchTiers || []).filter(function (t) { return t.id === it.tier; }).map(function (t) { return t.era; })[0]] || it.tier))]),
      el('div.small.dim', it.blurb), el('div.tiny.amber', it.why)]);
    var n = buyN[it.id] || 1, cost = SH().stockCost(st, it.id, n), can = SH().canBuyStock(st, it.id, n), pw = priceWord(it.price, it.suggested);
    function setP(p) { var r = SH().setPrice(S(), it.id, p); if (r && r.ok === false) return nope(r); sync(); s.rerender(); }
    return el('div.merch-item' + (onTable ? '.on' : ''), { testid: 'merch-item-' + it.id }, [
      el('div.row', [el('div.grow', [el('b', it.name), it.id === 'misprint' ? el('span.tag.amber', { style: 'margin-left:6px' }, 'Rare') : null]),
        btn('.btn.small.merch-toggle' + (onTable ? '.on' : ''), { testid: 'merch-toggle-' + it.id, 'aria-pressed': onTable ? 'true' : 'false', onclick: function () {
          SH().toggleTable(S(), it.id); sync(); s.rerender();
        } }, onTable ? '✓ On the table' : 'Put it out')]),
      el('div.small.dim', it.blurb),
      el('div.merch-grid', [
        el('div', [el('span.caps', 'Price'), el('div.stepper', [
          btn('.step', { testid: 'merch-price-down-' + it.id, 'aria-label': 'Cheaper', disabled: it.price <= it.range[0], onclick: function () { setP(Math.max(it.range[0], it.price - step(it.price))); } }, '−'),
          el('b.val', { testid: 'merch-price-' + it.id, data: { value: String(it.price) } }, money(it.price)),
          btn('.step', { testid: 'merch-price-up-' + it.id, 'aria-label': 'Pricier', disabled: it.price >= it.range[1], onclick: function () { setP(Math.min(it.range[1], it.price + step(it.price))); } }, '+')]),
          el('div.tiny' + (pw[1] ? '.' + pw[1] : '.dim'), pw[0] + ' · suggested ' + money(it.suggested))]),
        el('div', [el('span.caps', 'In stock'), el('div', { style: 'font-weight:800;margin-top:4px' }, U.fmtNum(it.stock) + ' · ' + it.boxes + ' box' + (it.boxes === 1 ? '' : 'es')),
          el('div.tiny.dim', it.perBox + ' per box · sold ' + U.fmtNum(it.sold))])
      ]),
      it.id === 'misprint' ? null : el('div.row.merch-buy', [
        el('div.stepper', [btn('.step', { testid: 'merch-n-down-' + it.id, 'aria-label': 'Fewer boxes', disabled: n <= 1, onclick: function () { buyN[it.id] = Math.max(1, n - 1); s.rerender(); } }, '−'),
          el('b.val', { testid: 'merch-n-' + it.id }, n + ' box' + (n === 1 ? '' : 'es')),
          btn('.step', { testid: 'merch-n-up-' + it.id, 'aria-label': 'More boxes', disabled: n >= 10, onclick: function () { buyN[it.id] = Math.min(10, n + 1); s.rerender(); } }, '+')]),
        btn('.btn.small.grow' + (can.ok ? '.primary' : ''), { testid: 'merch-buy-' + it.id, disabled: !can.ok, onclick: function () {
          var r = SH().buyStock(S(), it.id, n);
          if (!r.ok) return nope(r);
          bought('stock', it.id, r); dbg.stock++;
          if (r.misprint) { dbg.misprintTease++; ui.toast('The shirts are back from the printer in Martensville. Something is… off. Let\'s talk Monday.', { who: 'Dana', ms: 6000 }); }
          else ui.toast(U.fmtNum(r.units) + ' ' + (def.name || it.name).toLowerCase() + ' in the pile. The van hauls what fits.', { who: 'Merch' });
          s.rerender();
        } }, 'Buy ' + n + ' · ' + money(cost))]),
      it.id !== 'misprint' && !can.ok ? el('div.tiny.bad', { testid: 'merch-why-' + it.id }, can.why) : null
    ]);
  }
  ui.define('merch', {
    kind: 'sheet', tall: true, cls: 'shop',
    build: function (s) {
      var st = S(); if (!st || !SH()) return;
      var v = SH().merchView(st), table = v.table, van = st.van || {};
      s.setTitle('Merch table', 'THE BOXES BY THE DOOR');
      var haul = v.haul, pile = v.pile, est = v.estimate;
      var status = el('div.panel.warm.stack.tight', [
        el('div', { testid: 'merch-haul' }, [el('div.row', [el('span.grow', ['🚐 ', el('b', van.name || 'The van')]),
          el('span', [el('b', haul.boxes + ' / ' + haul.space), ' boxes'])]), ui.bar(haul.boxes, Math.max(1, haul.space), { color: haul.boxes >= haul.space ? 'var(--amber)' : 'var(--good)' }),
          el('div.tiny.dim', haul.boxes ? 'Next gig: ' + Object.keys(haul.items).map(function (id) { var d = SH().merchDef(id); return (d ? d.name : id) + ' ' + haul.items[id]; }).join(' · ')
            : table.length ? 'Nothing in stock for the table. Buy some boxes.' : 'Nothing on the table. Put something out.')]),
        el('div.row', { testid: 'merch-pile' }, [el('span.grow', ['📦 At home: ', el('b', pile.boxes + ' box' + (pile.boxes === 1 ? '' : 'es')), ' (' + U.fmtNum(pile.units) + ' things)']),
          pile.boxes > haul.space ? el('span.tag', 'Piling up') : null]),
        el('div.row', { testid: 'merch-est' }, [el('span.grow', ['🧮 Next gig, if it goes okay: ~', el('b', est.sold + ' sold'), ' · ~', el('b', money(est.earned))]), el('span.small.dim', '~' + est.crowd + ' people')]),
        el('div.tiny.dim', 'Made ' + money(v.earned) + ' so far · spent ' + money(v.spent) + ' on stock')
      ]);
      var items = v.items.slice().sort(function (a, b) { return (b.unlocked - a.unlocked) || (table.indexOf(a.id) >= 0 ? -1 : 0) - (table.indexOf(b.id) >= 0 ? -1 : 0); });
      ui.append(s.body, el('div.stack', [status, misprintPanel(v.misprint), lastPanel(v.last),
        el('div.caps', 'Your merch · ' + table.length + ' on the table'),
        el('div.stack.tight', items.map(function (it) { return itemCard(s, st, it, table.indexOf(it.id) >= 0); })),
        el('p.tiny.faint.center', 'The van hauls what fits, round-robin down the table. Whatever doesn\'t sell comes home in a box.')]));
      s.foot.appendChild(btn('.btn.block', { testid: 'btn-merch-done', onclick: function () { ui.close(s.id); } }, 'Done'));
    }
  });
  ui.openMerch = function () { return S() && SH() ? ui.show('merch') : null; };

  /* ======================================================================================================
     The van side (SVG) and the garage-door panels
     ====================================================================================================== */
  var NS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs, kids) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs || {}) { if (k === 'testid') n.setAttribute('data-testid', attrs[k]); else n.setAttribute(k, attrs[k]); }
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }
  function txt(x, y, s, attrs) { var t = svg('text', Object.assign({ x: x, y: y }, attrs || {})); t.textContent = s; return t; }
  var BODY = [
    { w: 250, h: 92, roof: 18, paint: '#7a2a2a', rust: true, windows: 3, wheels: [52, 200] },                          // rusted minivan
    { w: 250, h: 104, roof: 10, paint: '#f2efe6', trailer: true, windows: 4, wheels: [48, 206], stripe: '#3a2a70' },  // 15-passenger + trailer
    { w: 262, h: 122, roof: 6, paint: '#e8e8ea', windows: 3, wheels: [50, 214], stripe: '#2f6fd1' },                  // sprinter
    { w: 300, h: 118, roof: 4, paint: '#1e1e22', windows: 6, wheels: [58, 238], stripe: '#b3141c', bus: true }         // tour bus
  ];
  var ST_COLS = ['#f2d15b', '#e86a9a', '#4fb8e8', '#6fe39a', '#f28c28', '#f2efe6', '#b98cff', '#ff8a7a'];
  function short(name) { var w = String(name || '').replace(/^The /, '').split(/\s+/); return (w[0] || '').slice(0, 9).toUpperCase(); }
  ui.vanSide = function (st, o) {
    o = o || {};
    var van = st.van || {}, tier = U.clamp(isFinite(o.tier) ? o.tier : van.tier || 0, 0, 3), B = BODY[tier];
    var list = o.stickers || (SH() ? SH().stickers(st) : van.stickers || []);
    var W = 330, H = 170, x0 = 14, y0 = 150 - B.h - 22, kids = [];
    kids.push(svg('rect', { x: 0, y: 150, width: W, height: 20, fill: '#2a2d36' }));                                       // the road
    kids.push(svg('rect', { x: 0, y: 158, width: W, height: 3, fill: '#f2c832', opacity: 0.6 }));
    if (B.trailer) {                                                                                                    // the trailer
      kids.push(svg('rect', { x: x0 + B.w + 12, y: 150 - 72, width: 50, height: 52, rx: 4, fill: '#c9ced6', stroke: '#6a7280', 'stroke-width': 2 }));
      kids.push(svg('line', { x1: x0 + B.w - 2, y1: 138, x2: x0 + B.w + 14, y2: 138, stroke: '#3a3a3a', 'stroke-width': 4 }));
      kids.push(svg('circle', { cx: x0 + B.w + 37, cy: 150, r: 10, fill: '#151518' }));
      kids.push(txt(x0 + B.w + 37, 150 - 44, 'SQUEAK', { 'text-anchor': 'middle', 'font-size': 8, 'font-weight': 900, fill: '#6a7280' }));
    }
    // body
    var d = B.bus ? 'M' + x0 + ',' + (y0 + 6) + ' h' + B.w + ' v' + B.h + ' h' + (-B.w) + ' Z'
      : 'M' + (x0 + 6) + ',' + (y0 + B.roof) + ' Q' + (x0 + 10) + ',' + y0 + ' ' + (x0 + 40) + ',' + y0 + ' H' + (x0 + B.w - 60) + ' L' + (x0 + B.w - 18) + ',' + (y0 + B.h * 0.42)
        + ' Q' + (x0 + B.w) + ',' + (y0 + B.h * 0.46) + ' ' + (x0 + B.w) + ',' + (y0 + B.h * 0.6) + ' V' + (y0 + B.h) + ' H' + x0 + ' V' + (y0 + B.roof + 4) + ' Z';
    kids.push(svg('path', { d: d, fill: B.paint, stroke: '#0c0e14', 'stroke-width': 2.5 }));
    if (B.stripe) kids.push(svg('rect', { x: x0 + 2, y: y0 + B.h * 0.62, width: B.w - 4, height: 7, fill: B.stripe }));
    var ww = (B.w - (B.bus ? 30 : 90)) / B.windows;
    for (var i = 0; i < B.windows; i++) kids.push(svg('rect', { x: x0 + 12 + i * ww, y: y0 + 10, width: ww - 8, height: B.h * 0.28, rx: 3, fill: '#2a3a52', stroke: '#0c0e14', 'stroke-width': 1.5 }));
    if (!B.bus) kids.push(svg('path', { d: 'M' + (x0 + B.w - 64) + ',' + (y0 + 10) + ' H' + (x0 + B.w - 26) + ' L' + (x0 + B.w - 14) + ',' + (y0 + B.h * 0.38) + ' H' + (x0 + B.w - 64) + ' Z', fill: '#3a5070', stroke: '#0c0e14', 'stroke-width': 1.5 }));
    if (B.rust) [[40, 0.8], [150, 0.9], [210, 0.75]].forEach(function (r) { kids.push(svg('ellipse', { cx: x0 + r[0], cy: y0 + B.h * r[1], rx: 12, ry: 6, fill: '#9a5a2a', opacity: 0.85 })); });
    kids.push(txt(x0 + B.w / 2 - (B.bus ? 0 : 20), y0 + B.h * 0.56, van.name || 'The van', { 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 900, fill: B.bus ? '#f2d15b' : '#1a1a1a', 'font-style': 'italic', testid: 'van-side-name' }));
    B.wheels.forEach(function (wx) {
      kids.push(svg('circle', { cx: x0 + wx, cy: 150, r: 17, fill: '#151518', stroke: '#0c0e14', 'stroke-width': 2 }));
      kids.push(svg('circle', { cx: x0 + wx, cy: 150, r: 7, fill: '#9aa0a8' }));
    });
    // stickers: a grid along the lower body, newest last; banned venues get a red X
    var cols = Math.floor((B.w - 20) / 44), shown = list.slice(-cols * 2);
    shown.forEach(function (x, k) {
      var h = GG.hashSeed ? GG.hashSeed(x.name || x.venueId || String(k)) : k, row = Math.floor(k / cols), c = k % cols;
      var sx = x0 + 14 + c * 44 + (h % 5), sy = y0 + B.h * 0.66 + row * 17 + ((h >>> 3) % 3), rot = ((h >>> 5) % 13) - 6;
      var g = svg('g', { transform: 'rotate(' + rot + ' ' + (sx + 19) + ' ' + (sy + 7) + ')', testid: 'van-sticker', 'data-banned': x.banned ? '1' : '0', 'data-venue': x.venueId || '' }, [
        svg('rect', { x: sx, y: sy, width: 38, height: 14, rx: 3, fill: ST_COLS[h % ST_COLS.length], stroke: '#0c0e14', 'stroke-width': 1 }),
        txt(sx + 19, sy + 10, short(x.name), { 'text-anchor': 'middle', 'font-size': 7, 'font-weight': 900, fill: '#1a1a1a' }),
        x.banned ? svg('path', { d: 'M' + (sx - 2) + ',' + (sy - 2) + ' L' + (sx + 40) + ',' + (sy + 16) + ' M' + (sx + 40) + ',' + (sy - 2) + ' L' + (sx - 2) + ',' + (sy + 16), stroke: '#e0201a', 'stroke-width': 3, 'stroke-linecap': 'round' }) : null
      ]);
      kids.push(g);
    });
    if (list.length > shown.length) kids.push(txt(x0 + B.w - 6, y0 + B.h - 4, '+' + (list.length - shown.length) + ' more', { 'text-anchor': 'end', 'font-size': 8, 'font-weight': 800, fill: B.bus ? '#f2efe6' : '#1a1a1a' }));
    return el('div.van-side', { testid: 'van-side', data: { tier: String(tier) } }, [svg('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img', 'aria-label': (van.name || 'The van') + ', ' + list.length + ' stickers' }, kids)]);
  };
  function perkText(p) {
    var out = [];
    if (p.rehearse) out.push('Rehearse +' + Math.round(p.rehearse * 100) + '%');
    if (p.rest) out.push('Rest +' + Math.round(p.rest * 100) + '%');
    if (p.write) out.push('Songs +' + p.write);
    if (p.record) out.push('Studio +' + p.record);
    if (p.chemistry) out.push('Chem +' + p.chemistry);
    if (p.mood) out.push('Moods +' + p.mood);
    if (p.recover) out.push('Burnout −' + p.recover + '/wk');
    return out;
  }
  ui.vanUpgradesPanel = function (st, rerender) {
    var list = SH().vanUpgrades(st);
    return el('div.stack.tight', list.length ? list.map(function (u) {
      var fx = [u.space ? '+' + u.space + ' box' + (u.space > 1 ? 'es' : '') : null, u.comfort ? 'Comfort +' + u.comfort : null].filter(Boolean);
      return el('div.shop-row' + (u.owned ? '.own' : !u.can ? '.locked' : ''), { testid: 'van-upgrade-' + u.id }, [
        el('div.grow', [el('b', u.name), fx.length ? el('span.tag', { style: 'margin-left:6px' }, fx.join(' · ')) : null, el('div.small.dim', u.blurb),
          !u.owned && !u.can && u.why ? el('div.tiny.bad', u.why) : null]),
        u.owned ? el('span.tag.amber', 'Fitted') : btn('.btn.small' + (u.can ? '.primary' : ''), { testid: 'van-up-' + u.id, disabled: !u.can, onclick: function () {
          var r = SH().buyVanUpgrade(S(), u.id);
          if (!r.ok) return nope(r);
          bought('vanUpgrade', u.id, r); ui.toast(u.name + ': fitted. Kenji nods once.', { who: 'Van' }); rerender();
        } }, money(u.cost))]);
    }) : [el('p.small.dim', 'Nothing fits this vehicle. It is perfect as it is. (It is not.)')]);
  };
  ui.spacePanel = function (st, rerender) {
    var cur = SH().spaceDef(st, st.spaceTier || 0), perks = perkText(SH().perks(st));
    return el('div.stack', [
      el('div.panel.warm', { testid: 'space-now' }, [el('div.caps', 'You rehearse at'), el('div.shop-big', cur.name),
        el('div.small.dim', cur.blurb), el('div.chips', { style: 'margin-top:6px' }, [el('span.chip', cur.rent ? 'Rent ' + money(cur.rent) + '/week' : 'Free (thanks, Mom)')]
          .concat(perks.map(function (p) { return el('span.chip.up', p); }))),
        st.rentLate ? el('div.small.bad', { testid: 'space-late', style: 'margin-top:6px' }, 'Behind on rent: two weeks short and the landlord changes the locks.') : null]),
      el('div.caps', 'Rooms around town'),
      el('div.stack.tight', SH().spaces(st).map(function (x) {
        return el('div.shop-row' + (x.current ? '.own' : !x.available ? '.locked' : ''), { testid: 'space-' + x.tier }, [
          el('span.shop-tier', String(x.tier + 1)),
          el('div.grow', [el('b', x.name), el('div.small.dim', x.blurb), el('div.chips', { style: 'margin-top:4px' }, [el('span.chip', x.rent ? money(x.rent) + '/wk' : 'Free')]
            .concat(perkText(x.perk).map(function (p) { return el('span.chip', p); }))), !x.current && !x.can && x.why ? el('div.tiny.bad', x.why) : null]),
          x.current ? el('span.tag.amber', 'Here') : btn('.btn.small' + (x.can ? '.primary' : ''), { testid: 'space-move-' + x.tier, disabled: !x.can, onclick: function () {
            ui.confirm({ title: 'Move to ' + x.name + '?', text: (x.rent ? 'Rent: ' + money(x.rent) + ' a week, from the fund. ' : 'Free. ')
              + 'Upgrades stay behind (the couch and the beer fridge come along).', yes: 'Move in', no: 'Stay' }).then(function (yes) {
              if (!yes) return;
              var r = SH().move(S(), x.tier);
              if (!r.ok) return nope(r);
              bought('move', x.tier, r); sfx('whoosh'); ui.toast('Moved in: ' + x.name + '.', { who: 'New room' }); rerender();
            });
          } }, x.tier < (st.spaceTier || 0) ? 'Move back' : 'Move in')]);
      })),
      el('div.caps', 'Make it yours'),
      el('div.stack.tight', SH().upgrades(st).map(function (u) {
        return el('div.shop-row' + (u.owned ? '.own' : !u.can ? '.locked' : ''), { testid: 'space-upgrade-' + u.id }, [
          el('div.grow', [el('b', u.name), u.moves ? el('span.tag', { style: 'margin-left:6px' }, 'Moves with you') : null, el('div.small.dim', u.blurb),
            el('div.chips', { style: 'margin-top:4px' }, perkText(u.perk).map(function (p) { return el('span.chip', p); })), !u.owned && !u.can && u.why ? el('div.tiny.bad', u.why) : null]),
          u.owned ? el('span.tag.amber', 'In the room') : btn('.btn.small' + (u.can ? '.primary' : ''), { testid: 'space-up-' + u.id, disabled: !u.can, onclick: function () {
            var r = SH().buyUpgrade(S(), u.id);
            if (!r.ok) return nope(r);
            bought('upgrade', u.id, r); ui.toast(u.name + '. The room approves.', { who: 'Upgrade' }); rerender();
          } }, money(u.cost))]);
      }))
    ]);
  };
  ui.dealerPanel = function (st, rerender) {
    return el('div.stack', [
      el('p.small.dim', { style: 'margin:0' }, 'Cousin Dale\'s Pre-Loved Vehicles, Hwy 11. Your old ride goes in as a trade-in (' + Math.round(((SH().cfg().tradeIn) || 0.3) * 100) + '% of its price × condition).'),
      el('div.stack.tight', SH().vans(st).map(function (v) {
        var q = v.quote || {};
        return el('div.shop-row.dealer' + (v.current ? '.own' : !v.can ? '.locked' : ''), { testid: 'van-tier-' + v.tier }, [
          el('div.grow', [el('div.row', [el('b.grow', v.kind), el('span.tag', ERA[v.era] || v.era)]),
            el('div.small', [el('i', '“' + v.name + '”'), ' · hauls ' + v.space + ' boxes · comfort ' + v.comfort + '/5']),
            ui.vanSide(st, { tier: v.tier, stickers: [] }),
            el('div.small.dim', v.blurb),
            v.current ? null : el('div.small', { testid: 'van-quote-' + v.tier }, money(q.price) + ' − trade-in ' + money(q.tradeIn) + ' = ' + money(q.net)),
            !v.current && !v.can && v.why ? el('div.tiny.bad', v.why) : null,
            v.current ? el('span.tag.amber', 'Your ride') : btn('.btn.small.block' + (v.can ? '.primary' : ''), { testid: 'van-buy-' + v.tier, disabled: !v.can, style: 'margin-top:6px', onclick: function () {
              ui.confirm({ title: 'Buy the ' + v.kind.toLowerCase() + '?', text: money(q.net) + ' after the trade-in. It comes as “' + v.name + '”: rename it on the Van tab. The stickers move over, one by one, with a hair dryer.',
                yes: 'Buy it', no: 'Keep looking' }).then(function (yes) {
                if (!yes) return;
                var r = SH().buyVan(S(), v.tier);
                if (!r.ok) return nope(r);
                bought('van', v.tier, r); ui.toast(v.name + '. Kenji adjusts the mirrors and nods.', { who: 'New ride' }); rerender({ tab: 'van' });
              });
            } }, 'Buy · ' + money(q.net))])]);
      }))
    ]);
  };

  /* ======================================================================================================
     Hooks: Monday card chips, gig results, the wrap
     ====================================================================================================== */
  ui.shopChips = function (d) {
    var st = S(), out = [];
    if (!d || !SH()) return out;
    if (d.move != null) out.push(el('span.chip.up', '🏠 Moved: ' + (st ? SH().spaceDef(st, d.move).name : 'a new room')));
    if (d.kit != null) out.push(el('span.chip.up', '🥁 ' + ((SH().kitDef(d.kit) || {}).name || 'A better kit')));
    if (d.van != null) out.push(el('span.chip.up', '🚐 ' + SH().vanName(st && st.bandId, d.van)));
    if (d.gear) out.push(el('span.chip.up', '🥁 ' + (st ? SH().gearName(st, d.gear) : d.gear)));
    if (d.section) out.push(el('span.chip.up', '🎼 ' + (((content().sections || {})[d.section] || {}).name || d.section) + ' unlocked'));
    if (d.stock) Object.keys(d.stock).forEach(function (id) { var def = SH().merchDef(id); out.push(el('span.chip.up', '📦 +' + d.stock[id] + ' box' + (d.stock[id] > 1 ? 'es' : '') + ' of ' + (def ? def.name.toLowerCase() : id))); });
    if (d.misprint) out.push(el('span.chip', d.misprint === 'boxed' ? '📦 Misprints: boxed' : d.misprint === 'reprint' ? '👕 Reprinted' : '👕 The band wears them'));
    return out;
  };
  // r.merch (GIG_RESULT): { sold, earned, boxes, space, items, named }.
  ui.merchResult = function (m) {
    if (!m) return null;
    var items = Object.keys(m.items || {}).filter(function (id) { return m.items[id].hauled; }).map(function (id) {
      var it = m.items[id], def = SH() && SH().merchDef(id);
      return el('span.chip' + (it.sold >= it.hauled ? '.up' : ''), (def ? def.name : id) + ' ' + it.sold + '/' + it.hauled);
    });
    var dale = (m.named || []).indexOf('dale') >= 0;
    return el('div.merch-res', { testid: 'gig-merch' }, [
      el('div.row', [el('span', { style: 'font-size:22px' }, '👕'), el('div.grow', [el('div.caps', 'Merch table'),
        m.boxes ? el('div', [el('b', m.sold + ' sold'), ' · ', el('b.good', '+' + money(m.earned)), el('span.small.dim', ' · ' + m.boxes + ' of ' + m.space + ' boxes hauled')])
          : el('div.small.dim', 'No merch on the table tonight. Somebody asked. Twice.')])]),
      items.length ? el('div.chips', { style: 'margin-top:6px' }, items) : null,
      dale ? el('div.tiny.amber', { style: 'margin-top:4px' }, 'Dale bought one, as always.') : null]);
  };
  ui.isMerchLine = function (t) { return /^Merch table: /.test(String(t || '')); };
  ui.shopWrap = function (w) {
    var sh = w && w.shop, st = S(), out = [];
    if (!sh || !SH() || !st) return out;
    if (sh.evicted) {
      out.push(el('div.panel.alert', { testid: 'wrap-evicted' }, [el('div.row', [el('span', { style: 'font-size:24px' }, '🔑'), el('div.grow', [
        el('div', { style: 'font-weight:800' }, 'Evicted. The landlord changed the locks.'),
        el('div.small.dim', 'Two weeks behind on rent. Everyone carries their own amp back to ' + (SH().spaceDef(st, st.spaceTier || 0).name) + '. The couch comes too.')])])]));
    } else if (sh.rentLate) {
      out.push(el('div.panel.alert.small', { testid: 'wrap-rent-late' }, '⚠ Behind on rent: less than two weeks\' rent in the fund. Another week like this and the locks change.'));
    }
    if (sh.rent) out.push(el('div.line-list.panel', { testid: 'wrap-rent' }, [el('div', [el('span', 'Rent · ' + SH().spaceDef(st, st.spaceTier || 0).name + ' (in upkeep)'), el('span.bad', '−' + money(sh.rent))])]));
    (sh.unlocks || []).forEach(function (u) {
      if (u.kind === 'section') {
        var sd = (content().sections || {})[u.id] || { name: u.id, blurb: '' };
        out.push(el('div.panel.warm.row', { testid: 'wrap-shop-unlock', data: { kind: 'section', id: u.id } }, [el('span', { style: 'font-size:24px' }, u.id === 'outro' ? '🎬' : '🎸'),
          el('div.grow', [el('div', { style: 'font-weight:800' }, sd.name + ' section unlocked'), el('div.small.dim', sd.blurb + ' New tab in the songwriter.')])]));
      } else if (u.kind === 'merch') {
        var names = (u.ids || []).map(function (id) { var d = SH().merchDef(id); return d ? d.name : id; });
        out.push(el('div.panel.warm.row', { testid: 'wrap-shop-unlock', data: { kind: 'merch' } }, [el('span', { style: 'font-size:24px' }, '👕'),
          el('div.grow', [el('div', { style: 'font-weight:800' }, 'New merch: ' + names.join(', ')), el('div.small.dim', 'Tap the merch boxes in the garage to stock it.')])]));
      }
    });
    if (sh.misprint === 'collector') {
      out.push(el('div.panel.warm', { testid: 'wrap-collector' }, [el('div.row', [el('span', { style: 'font-size:24px' }, '🏆'), el('div.grow', [
        el('div', { style: 'font-weight:800' }, 'The HALE DAMAGE misprints are a collector\'s item'), el('div.small.dim', 'On the merch table at ' + money(SH().priceOf(st, 'misprint')) + ' each.')])]),
        btn('.btn.small.block', { style: 'margin-top:8px', testid: 'wrap-collector-see', onclick: function () { ui.playCollector(); } }, 'See it again')]));
    }
    return out;
  };

  /* ======================================================================================================
     The collector moment (the misprint pays off)
     ====================================================================================================== */
  var collector = { pending: false, seen: {} };
  GG.on('shop:misprint', function (p) { if (p && p.status === 'collector') collector.pending = true; });
  function collectorKey(st) { return (st && st.seed) + '|' + (st && st.merch && st.merch.misprint ? st.merch.misprint.week : ''); }
  ui.shopWrapShown = function (w) {
    var st = S();
    if (!st || !((w && w.shop && w.shop.misprint === 'collector') || collector.pending)) return false;
    if (ui.gigAutoplay) { collector.pending = false; return false; }   // flows / bots on autoplay: the wrap panel only (like the Loonies / the Gong)
    var k = collectorKey(st);
    collector.pending = false;
    if (collector.seen[k]) return false;
    collector.seen[k] = true;
    setTimeout(function () { if (ui.isOpen('wrap')) ui.playCollector(); }, 450);
    return true;
  };
  ui.define('shop-collector', {
    kind: 'full', cls: 'collector',
    build: function (s, d) {
      var st = S(); if (!st || !SH()) return;
      var mp = SH().misprint(st) || { units: 50 }, line = ((content().lines || {}).misprintCollector || [])[0], price = SH().priceOf(st, 'misprint');
      var shirt = el('div.col-shirt', [el('div.col-print', [el('span.col-hale', 'HALE'), el('span.col-dmg', 'DAMAGE')]), el('div.col-tag', { testid: 'collector-price' }, money(price))]);
      ui.append(s.body, el('div.col-wrap', { testid: 'collector' }, [
        el('div.caps.col-kicker', 'Under the workbench for ' + Math.max(1, st.totalWeek - (mp.week || 0)) + ' weeks'),
        el('h1.display.col-title', ['Collector\'s', el('br'), 'item']),
        el('div.col-stage', [el('div.col-box', [el('i.col-flap.l'), el('i.col-flap.r'), el('b', 'HALE')]), shirt, el('div.col-stamp', 'RARE')]),
        line ? el('div.col-quote', [el('b', ui.who(line.who).short + ': '), fill(line.text)]) : null,
        el('p.small.dim.center', U.fmtNum(mp.units || 0) + ' misprinted shirts go on the merch table at ' + money(price) + ' each. There will never be more.')
      ]));
      s.foot.appendChild(btn('.btn.primary.big.block', { testid: 'btn-collector-ok', onclick: function () { ui.close(s.id); if (d && d.done) setTimeout(d.done, 0); } }, 'Put them on the table'));
    },
    onShow: function () { dbg.collector++; sfx('cheer'); setTimeout(function () { sfx('cash'); }, 900); }
  });
  ui.playCollector = function (done) { return ui.show('shop-collector', { done: done }); };

  GG.registerDebug('shopui', function () {
    var st = S();
    return Object.assign({}, dbg, { collectorPending: collector.pending, screen: ui.top(),
      pile: st && SH() && st.merch ? SH().pile(st).boxes : null, table: st && st.merch ? st.merch.table.slice() : null });
  });
})(window.GG);
