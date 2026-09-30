// 5m_ui_logo.js (v0.8.1, Addendum 2 D2, LOGO): the band-logo picker and the little logo widgets other screens reuse.
//   'logo' (full): three taps with a live preview: 1 · emblem, 2 · lettering, 3 · colours (+ Band default / Surprise).
//     mode 'new' (51: after the band intro, before the creator): "That's our logo →" hands the pick to GG.logo.prepare and
//     goes on (onDone). mode 'rebrand' (the laptop's Band tab): shows the fee + buzz; "Rebrand" calls GG.logo.rebrand.
//   ui.openLogo({ mode, bandId, genre, band, logo, onDone }) ; ui.logoImg(logo, name, size, opts?) -> <img> (cached data URL,
//     drawn at the device's pixel ratio; opts: { badge, shape, testid, cls, title }) ; ui.bandLogo(st, size, opts?) ;
//     ui.rivalLogo(id, name, size, opts?) (fixed rival logos; id 'you' = your band) ; ui.logoPanel(st, rerender) (laptop:
//     your logo + Rebrand) ; ui.logoMerch(st, itemId, size) (5k: the item with your logo on it) ; ui.logoBroadcast(st,
//     { winner, won, category }) (59c: the Loonies' TV lower third with the winner's logo).
// testids: logo-screen, logo-preview, logo-prev-kick|shirt|avatar, logo-emblem-<id>, logo-style-<id>, logo-pal-<id>,
//   logo-default, logo-surprise, btn-logo-done, btn-logo-back, btn-logo-rebrand, btn-logo-cancel, logo-cost, logo-why,
//   laptop-logo, laptop-rebrand, logo-cast. Debug: GG.debug('logo-ui'). CSS: 00_shell /* v0.8.1 LOGO */.
// No share / screenshot / download button, ever (owner, Addendum 2).
(function (GG) {
  var ui = GG.ui, el = ui.el, btn = ui.btn, U = GG.util;
  var E = null, dbg = { opened: 0, mode: null, picks: 0, rebrands: 0, last: null };
  function L() { return GG.logo; }
  function RL() { return GG.render && GG.render.logo; }
  function dpr() { return Math.min(3, Math.max(1, (typeof window !== 'undefined' && window.devicePixelRatio) || 1)); }
  function sfx(n) { if (GG.audio && GG.audio.sfx) GG.audio.sfx(n); }
  function shirtUrl(lg, name) { var c = RL().merch(lg, name, 'shirt', Math.round(58 * dpr())); if (!c._url) c._url = c.toDataURL('image/png'); return c._url; }
  function nameOf(st) { var b = st && GG.career && GG.career.band ? GG.career.band(st) : null; return (b && b.name) || 'The Band'; }

  /* ---- Widgets ------------------------------------------------------------------------------------------------------ */
  ui.logoImg = function (lg, name, size, o) {
    o = o || {};
    var px = Math.min(512, Math.round(size * dpr())), wide = o.shape === 'wide';
    var src = RL() ? RL().dataURL(lg, name, px, { badge: o.badge || false, shape: o.shape, mini: o.mini, plain: o.plain, textOnly: o.textOnly }) : '';
    return el('img.logo-img' + (o.cls ? '.' + o.cls : ''), { src: src, alt: o.alt != null ? o.alt : (name || '') + ' logo', width: wide ? size * 2 : size, height: size,
      draggable: 'false', testid: o.testid || null, title: o.title || null, style: { width: (wide ? size * 2 : size) + 'px', height: size + 'px' } });
  };
  ui.bandLogo = function (st, size, o) { return ui.logoImg(L() ? L().get(st) : null, nameOf(st), size, o); };
  ui.rivalLogo = function (id, name, size, o) {
    var st = GG.state;
    if (id === 'you' && st) return ui.bandLogo(st, size, o);
    return ui.logoImg(L() ? L().rival(id) : null, name, size, Object.assign({ alt: (name || 'Rival') + ' logo' }, o || {}));
  };
  ui.logoMerch = function (st, itemId, size) {
    if (!RL() || !st) return null;
    var c = RL().merch(L().get(st), nameOf(st), itemId, Math.round((size || 56) * dpr()));
    if (!c._url) c._url = c.toDataURL('image/png');   // drawn + encoded once per logo/item/size (the canvas is cached)
    return el('img.merch-art', { src: c._url, alt: '', width: size || 56, height: size || 56, draggable: 'false', testid: 'merch-art-' + itemId });
  };
  // The Loonies broadcast card: a TV lower third with the winner's logo.
  ui.logoBroadcast = function (st, o) {
    o = o || {};
    var you = !!o.won, win = o.winner || (you ? nameOf(st) : 'Somebody else');
    var id = you ? 'you' : (L() && L().findRival(win));
    var art = id ? ui.rivalLogo(id, win, 56, { badge: 'round' }) : el('div.lg-cast-blank', '🏆');
    return el('div.lg-cast' + (you ? '.you' : ''), { testid: 'logo-cast', data: { who: id || 'other' } }, [
      el('div.lg-cast-live', [el('i'), 'LIVE']), art,
      el('div.grow', [el('div.lg-cast-cat', o.category || 'The Loonies'), el('b', win), el('div.lg-cast-sub', you ? 'wins. Kenji is already carrying it to the van.' : 'wins. Polite applause from table 9.')]),
      el('div.lg-cast-bug', 'LOONIES')]);
  };
  // The laptop's Band tab: your logo + Rebrand.
  ui.logoPanel = function (st, rerender) {
    if (!L() || !st) return null;
    var c = L().rebrandCost(st), lg = L().get(st);
    return el('div.mem-card.lg-panel', { testid: 'laptop-logo' }, [
      el('div.row', [ui.bandLogo(st, 76, { badge: 'round' }), el('div.grow', [el('div', { style: 'font-weight:800' }, 'The logo'),
        el('div.small.dim', [L().emblem(lg.emblem).name, L().style(lg.style).name, L().palette(lg.palette).name].join(' · ')),
        el('div.tiny.dim', 'On the kick drum, the merch, the van, the banner and Bandbook.')])]),
      btn('.btn.block', { testid: 'laptop-rebrand', style: 'margin-top:8px', onclick: function () {
        ui.openLogo({ mode: 'rebrand', onDone: function () { if (rerender) rerender(); } });
      } }, '✏ Rebrand · ' + U.fmtMoney(c.fund)), el('div.tiny.dim.center', { style: 'margin-top:4px' }, 'Costs a little buzz too: fans need a week to recognise you.')]);
  };

  /* ---- The picker ----------------------------------------------------------------------------------------------------- */
  ui.openLogo = function (o) {
    o = o || {};
    var st = GG.state, rebrand = o.mode === 'rebrand';
    if (!L() || (rebrand && !st)) { if (o.onDone) o.onDone(null); return null; }
    var bandId = rebrand ? st.bandId : (o.bandId || 'hail_damage'), band = (GG.content.bands || {})[bandId];
    var genre = rebrand ? st.genre : (o.genre || (band && band.genre) || 'metal'), carried = rebrand ? null : L().carry.read(genre);
    var start = o.logo || (rebrand ? L().get(st) : (L().pending(bandId) || carried || L().defaultFor(bandId)));
    E = { mode: rebrand ? 'rebrand' : 'new', bandId: bandId, genre: genre, name: o.band || (band && band.name) || (st && nameOf(st)) || 'The Band',
      logo: L().sanitize(start, bandId), was: rebrand ? L().get(st) : null, carried: !!(carried && !o.logo && !L().pending(bandId) && L().same(carried, start)), onDone: o.onDone || null };
    dbg.opened++; dbg.mode = E.mode;
    return ui.show('logo', {});
  };
  function pick(field, id) {
    if (!E || E.logo[field] === id) return;
    E.logo = Object.assign({}, E.logo, (function () { var x = {}; x[field] = id; return x; })());
    E.carried = false; dbg.picks++; dbg.last = field + ':' + id;
    sfx('tap');
    var s = ui.get('logo'); if (s) s.rerender();
  }
  function section(n, title, sub, kids, testid) {
    return el('div.lg-sec', { testid: testid }, [el('div.lg-sec-h', [el('span.lg-n', String(n)), el('b', title), sub ? el('span.tiny.dim', sub) : null]), kids]);
  }
  ui.define('logo', {
    kind: 'full', cls: 'logox',
    build: function (s) {
      if (!E) return;
      var lg = E.logo, rebrand = E.mode === 'rebrand', st = GG.state, name = E.name;
      var em = L().emblem(lg.emblem), sty = L().style(lg.style), pal = L().palette(lg.palette);
      var head = el('div', [
        el('div.back-row', [btn('.icon-btn', { testid: 'btn-logo-back', 'aria-label': 'Back', onclick: function () { ui.close(s.id); } }, '←'),
          el('span.caps', rebrand ? 'Laptop · Rebrand' : 'New career · the logo')]),
        el('h1.screen-h', rebrand ? 'Rebrand?' : 'Your band logo')]);
      var stage = el('div.lg-stage', { testid: 'logo-preview', data: { key: L().key(lg) } }, [
        el('div.lg-prev', ui.logoImg(lg, name, 196, { alt: name + ' logo' })),
        el('div.lg-mini-row', [
          el('div.lg-mini', { testid: 'logo-prev-kick' }, [el('div.lg-kick', ui.logoImg(lg, name, 58, { badge: 'circle' })), el('span', 'Kick drum')]),
          el('div.lg-mini', { testid: 'logo-prev-shirt' }, [RL() ? el('img.merch-art', { src: shirtUrl(lg, name), width: 58, height: 58, alt: '' }) : null, el('span', 'Shirt')]),
          el('div.lg-mini', { testid: 'logo-prev-avatar' }, [ui.logoImg(lg, name, 40, { badge: 'round' }), el('span', 'Bandbook')])]),
        el('div.lg-caption', [el('b', em.name), ' · ', sty.name, ' · ', pal.name])]);
      var emblems = el('div.lg-emb', L().emblems().map(function (e) {
        var on = e.id === lg.emblem;
        return btn('.lg-embtn' + (on ? '.on' : ''), { testid: 'logo-emblem-' + e.id, 'aria-pressed': on ? 'true' : 'false', title: e.name, onclick: function () { pick('emblem', e.id); } },
          [ui.logoImg(Object.assign({}, lg, { emblem: e.id }), name, 40, { plain: true, alt: '' }), el('span', e.name)]);
      }));
      var styles = el('div.lg-styles', L().styles().map(function (x) {
        var on = x.id === lg.style;
        return btn('.lg-stbtn' + (on ? '.on' : ''), { testid: 'logo-style-' + x.id, 'aria-pressed': on ? 'true' : 'false', onclick: function () { pick('style', x.id); } },
          [ui.logoImg(Object.assign({}, lg, { style: x.id }), name, 62, { shape: 'wide', textOnly: true, mini: false, alt: '' }), el('span', x.name)]);
      }));
      var pals = el('div.lg-pals', L().palettes().map(function (p) {
        var on = p.id === lg.palette;
        return btn('.lg-pal' + (on ? '.on' : ''), { testid: 'logo-pal-' + p.id, 'aria-pressed': on ? 'true' : 'false', title: p.name, onclick: function () { pick('palette', p.id); } },
          [el('span.sw', { style: { background: p.ground } }, [el('i', { style: { background: p.em } }), el('i', { style: { background: p.fg } })]), el('span.pn', p.name)]);
      }));
      var def = L().defaultFor(E.bandId);
      var tools = el('div.lg-tools', [
        btn('.lk-chip', { testid: 'logo-default', disabled: L().same(def, lg), onclick: function () { E.logo = def; E.carried = false; dbg.picks++; var x = ui.get('logo'); if (x) x.rerender(); } }, '↺ Band default'),
        btn('.lk-chip', { testid: 'logo-surprise', onclick: function () {
          var r = ui.rng, es = L().emblems(), ps = L().palettes(), ss = L().styles();
          E.logo = { emblem: es[Math.floor(r.next() * es.length)].id, style: r.next() < 0.6 ? lg.style : ss[Math.floor(r.next() * ss.length)].id, palette: ps[Math.floor(r.next() * ps.length)].id };
          E.carried = false; dbg.picks++; sfx('tap'); var x = ui.get('logo'); if (x) x.rerender();
        } }, '🎲 Surprise me'),
        E.carried ? el('span.tiny.dim', 'Your last ' + E.genre + ' logo (this phone remembers it)') : null]);
      ui.append(s.body, el('div', { testid: 'logo-screen', data: { mode: E.mode } }, [head,
        el('p.screen-sub', rebrand ? 'New logo, same band. Costs a bit, and the scene will take a week to stop calling you "the band with the old logo".'
          : 'Three taps. It goes on the kick drum, the merch, the van and the garage door. Any genre can use any lettering.'),
        stage, tools,
        section(1, 'Emblem', em.name, emblems, 'logo-sec-emblem'),
        section(2, 'Lettering', sty.blurb, styles, 'logo-sec-style'),
        section(3, 'Colours', pal.name, pals, 'logo-sec-pal')]));
      if (!rebrand) {
        s.foot.appendChild(btn('.btn.primary.big.block', { testid: 'btn-logo-done', onclick: function () {
          var e = E; if (!e) return;
          L().prepare(e.logo, e.bandId);
          sfx('ui');
          if (e.onDone) e.onDone(e.logo); else ui.show('creator');
        } }, "That's our logo →"));
        return;
      }
      var can = L().canRebrand(st, lg), c = L().rebrandCost(st);
      s.foot.appendChild(el('div.stack.tight', [
        el('div.small.center' + (can.ok ? '' : '.dim'), { testid: 'logo-cost' }, 'Rebrand: ' + U.fmtMoney(c.fund) + ' from the fund · buzz −' + c.buzz + ' (fans need a week to recognise you)'),
        can.ok ? null : el('div.tiny.center.amber', { testid: 'logo-why' }, can.why),
        el('div.row', [btn('.btn.grow', { testid: 'btn-logo-cancel', onclick: function () { ui.close(s.id); } }, 'Keep it'),
          btn('.btn.primary.grow', { testid: 'btn-logo-rebrand', disabled: !can.ok, onclick: function () {
            var r = L().rebrand(GG.state, E.logo);
            if (!r.ok) { ui.toast(r.why, { kind: 'bad' }); return; }
            dbg.rebrands++; sfx('cash');
            var done = E.onDone;
            ui.close(s.id);
            if (GG.main && GG.main.sync) GG.main.sync();
            ui.toast('New logo. The old stickers are collector\'s items now (they are not).', { who: 'Rebrand' });
            if (done) done(r.logo);
          } }, 'Rebrand · ' + U.fmtMoney(c.fund))])]));
    },
    onClose: function () { E = null; }
  });

  GG.registerDebug('logo-ui', function () {
    return { open: ui.isOpen ? ui.isOpen('logo') : false, mode: E ? E.mode : dbg.mode, logo: E ? E.logo : null, carried: E ? E.carried : false,
      opened: dbg.opened, picks: dbg.picks, rebrands: dbg.rebrands, last: dbg.last,
      imgs: typeof document !== 'undefined' ? document.querySelectorAll('img.logo-img').length : 0 };
  });
})(window.GG);
