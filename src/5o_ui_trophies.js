// 5o_ui_trophies.js (v1.0 "Glory", Addendum 2 D4; plan_contract_1.0 §4.6): the laptop's Trophies tab (achievements across
// every career on this phone) and the achievement toast queue.
//   ui.trophiesPanel(st) -> node: earned rows first (icon, name, blurb, the date + the band that earned it: data-band), then
//     this career's open rows (dim, with their blurb), then another band's rows as "??? (a <band> thing)" (data-band = that
//     band; the text is never shown). Rows of another seat are left out (v1.1 Seats adds them). testids: laptop-trophies,
//     trophies-count, trophy-row-<id> (data-state earned | open | hidden, data-band), trophy-here-<id> (earned this career).
//   ui.achToast(ids) : queues fresh achievement ids (12_meta 'meta:ach' { fresh } and the cosmetic 'meta:unlock' lines). The
//     queue is held while a gig ('gig' without its results) or a rival set is on screen, or a song is live; it flushes on the
//     results screen / the verdict, when those screens close, or right away otherwise. At most 3 toasts per flush; the third
//     says "+n more" when there are more (they are all in the Trophies tab).
// Achievements are bragging only (owner Q5): nothing here gates content. No share / screenshot / download control.
(function (GG) {
  var ui = GG.ui, el = ui.el, btn = ui.btn;
  var CSS = [
    '.tro-head{display:flex;align-items:center;gap:10px;margin:2px 0 10px}',
    '.tro-head .tro-n{font:900 22px var(--font);color:var(--amber)}',
    '.tro-row{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;margin-bottom:8px;border:1px solid var(--line);border-radius:12px;background:var(--bg2);min-height:48px}',
    '.tro-row .ti{font-size:24px;line-height:28px;flex:0 0 30px;text-align:center}',
    '.tro-row .grow{min-width:0}.tro-row b{display:block;font-size:15px}.tro-row .tb{font-size:13px;color:var(--dim);margin-top:2px}',
    '.tro-row.open{opacity:.72}.tro-row.hidden{opacity:.5;border-style:dashed}',
    '.tro-row.earned{border-color:rgba(255,200,60,.45)}',
    '.tro-chip{display:inline-block;font:800 11px var(--font);padding:2px 8px;border-radius:999px;background:var(--panel2);color:var(--text);margin:4px 6px 0 0}',
    '.tro-chip.here{background:var(--amber);color:#1b1206}',
    '.tro-sep{font:800 11px var(--font);letter-spacing:.08em;text-transform:uppercase;color:var(--dim);margin:14px 0 6px}'
  ].join('');
  if (typeof document !== 'undefined' && !document.getElementById('css-trophies')) {
    var st0 = document.createElement('style'); st0.id = 'css-trophies'; st0.textContent = CSS; document.head.appendChild(st0);
  }
  function A() { return GG.achieve; }
  function bandName(id) { var b = (GG.content.bands || {})[id]; return b ? b.name : 'another band'; }
  function info(id) { return GG.meta && GG.meta.achInfo ? GG.meta.achInfo(id) : null; }
  function niceDate(s) {
    var m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(String(s || ''));
    if (!m) return '';
    var M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return M[+m[2] - 1] + ' ' + (+m[3]) + ', ' + m[1];
  }
  function seatOk(a, st) { return !a.seat || a.seat.indexOf((st && st.seat) || 'drums') >= 0; }

  ui.trophiesPanel = function (st) {
    if (!A()) return el('p.dim', { testid: 'laptop-trophies-empty' }, 'The trophy case is still in the box.');
    var here = (st && st.ach && st.ach.got) || {}, earned = [], open = [], hidden = [];
    A().defs().forEach(function (a) {
      if (!a || !a.id || !seatOk(a, st)) return;
      var inf = info(a.id), mine = here[a.id] != null;
      if (inf || mine) earned.push({ a: a, inf: inf || { at: null, band: st && st.bandId, y: st && st.year }, mine: mine });
      else if (A().gated(a, st)) open.push(a);
      else if (a.band) hidden.push(a);
    });
    earned.sort(function (x, y) { return String(y.inf.at || '9') < String(x.inf.at || '9') ? -1 : String(y.inf.at || '9') > String(x.inf.at || '9') ? 1 : 0; });
    var total = earned.length + open.length + hidden.length;
    var out = [el('div.tro-head', [el('span.tro-n', { testid: 'trophies-count' }, earned.length + '/' + total),
      el('div.grow', [el('b', 'Trophies'), el('div.tiny.dim', 'Every career on this phone. Bragging rights only.')])])];
    if (!earned.length) out.push(el('p.small.dim', { style: 'margin:0 0 8px' }, 'Nothing on the shelf yet. Your mom has cleared a spot anyway.'));
    earned.forEach(function (x) {
      var a = x.a, band = x.inf.band || (st && st.bandId) || '';
      out.push(el('div.tro-row.earned', { testid: 'trophy-row-' + a.id, data: { state: 'earned', band: band } }, [el('span.ti', a.icon || '🏆'),
        el('div.grow', [el('b', A().name(a, band)), el('div.tb', a.blurb || ''),
          el('div', [band ? el('span.tro-chip', bandName(band)) : null, x.inf.at ? el('span.tro-chip', niceDate(x.inf.at)) : null,
            x.mine ? el('span.tro-chip.here', { testid: 'trophy-here-' + a.id }, 'This career') : null])])]));
    });
    if (open.length) out.push(el('div.tro-sep', 'Still out there'));
    open.forEach(function (a) {
      var band = (st && st.bandId) || '';
      out.push(el('div.tro-row.open', { testid: 'trophy-row-' + a.id, data: { state: 'open', band: band } }, [el('span.ti', a.icon || '🏆'),
        el('div.grow', [el('b', A().name(a, band)), el('div.tb', a.blurb || '')])]));
    });
    if (hidden.length) out.push(el('div.tro-sep', 'Other bands, other stories'));
    hidden.forEach(function (a) {
      var band = a.band[0];
      out.push(el('div.tro-row.hidden', { testid: 'trophy-row-' + a.id, data: { state: 'hidden', band: band } }, [el('span.ti', '❔'),
        el('div.grow', [el('b', '???'), el('div.tb', '(a ' + bandName(band).replace(/^the /i, '') + ' thing)')])]));
    });
    return el('div', { testid: 'laptop-trophies' }, out);
  };

  /* ---- The toast queue -------------------------------------------------------------------------------------------------- */
  var queue = [], timer = 0, shown = 0;
  function live() {
    try { var g = GG.debug('gigui'); if (g && g.open && g.audio && !g.paused) return true; } catch (e) { /* no gig ui */ }
    return false;
  }
  function blocked() {
    return (ui.isOpen('gig') && !ui.isOpen('gig-results')) || (ui.isOpen('rival-set') && !ui.isOpen('rival-verdict')) || live();
  }
  function label(item) {
    if (item.kind === 'ach') { var a = A() && A().def(item.id); return a ? (a.icon || '🏆') + ' ' + A().name(a, item.band) : item.id; }
    return item.text;
  }
  function flush() {
    if (timer) { clearTimeout(timer); timer = 0; }
    if (!queue.length) return;
    if (blocked()) { timer = setTimeout(flush, 1200); return; }
    var batch = queue.splice(0, queue.length), n = Math.min(3, batch.length);
    for (var i = 0; i < n; i++) {
      var more = i === n - 1 && batch.length > n ? ' (+' + (batch.length - n) + ' more: laptop → Trophies)' : '';
      ui.toast(label(batch[i]) + more, { who: batch[i].kind === 'ach' ? '🏆 Trophy' : '🏆 Unlocked', kind: 'good', ms: 5200 });
      shown++;
    }
  }
  ui.achToast = function (ids, band) {
    (ids || []).forEach(function (id) {
      if (!queue.some(function (q) { return q.kind === 'ach' && q.id === id; })) queue.push({ kind: 'ach', id: id, band: band || (GG.state && GG.state.bandId) });
    });
    flush();
  };
  GG.on('meta:ach', function (p) { if (p && p.fresh && p.fresh.length) ui.achToast(p.fresh); });
  GG.on('meta:unlock', function (p) {
    if (!p || !p.ids || !p.ids.length) return;
    var what = p.kind === 'palettes' ? 'palette' : p.kind === 'emblems' ? 'emblem' : 'look';
    var names = (p.names || p.ids).slice(0, 2).join(', ') + (p.ids.length > 2 ? ' + ' + (p.ids.length - 2) + ' more' : '');
    queue.push({ kind: 'unlock', text: 'New ' + what + (p.ids.length > 1 ? 's' : '') + ' for every career: ' + names });
    flush();
  });
  GG.on('screen:open', function (p) { if (p && (p.id === 'gig-results' || p.id === 'rival-verdict')) setTimeout(flush, 0); });
  GG.on('screen:close', function (p) { if (p && (p.id === 'gig' || p.id === 'rival-set' || p.id === 'gig-results')) setTimeout(flush, 0); });

  GG.registerDebug('trophies', function () {
    return { queued: queue.length, shown: shown, blocked: blocked(), earned: GG.meta && GG.meta.get ? Object.keys(GG.meta.get().ach || {}).length : 0 };
  });
})(window.GG);
