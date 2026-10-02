// 5q_ui_hof.js (v1.0 "Glory", owner Q6; plan_contract_1.0 §4.5): the Hall of Fame. Opens from the title (btn-hof), the ☰
// menu (menu-hof) and the end screen (end-hof).
//   'hof' (full): one row per finished career, newest first (GG.meta.hof()): the logo (ui.logoImg), band, your name, the
//     ending tier chip, the Legacy score, years (+ bonus), the difficulty badge (and a seat chip only when the seat is not the
//     drums: v1.1 Seats). Tap a row -> 'hof-entry'. Foot: "Backup code" (hof-code: GG.save.metaCode() in the existing code
//     panel, mode 'hof'; restore it from the title's "Restore code"). Empty storage: "No careers yet."
//   'hof-entry' (sheet, tall): the logo, tier + specials, the seven Legacy parts, lineup avatars (who stayed, who left),
//     the trophies that career earned, a few numbers, the rival line, and the strip of yearly headlines: tap a year for its
//     small card (fans, era, best gig, awards).
//   'meta:quota' -> a toast: "Hall of Fame saved for this session only".
// testids: hof-screen, hof-row-<i> (data-band, data-id), hof-logo-<i>, hof-tier-<i>, hof-score-<i>, hof-diff-<i>, hof-seat-<i>,
//   hof-empty, hof-code, hof-close, hof-entry, hof-entry-logo, hof-parts, hof-part-<part>, hof-specials, hof-special-<id>,
//   hof-lineup, hof-member-<id>, hof-trophies, hof-stats, hof-rival, hof-strip, hof-year-<y>, hof-yearcard, hof-entry-close.
// No photos (Q6), no share / screenshot / download control (the backup code is a copy-a-code panel, like ☰ → Back up).
(function (GG) {
  var ui = GG.ui, el = ui.el, btn = ui.btn, U = GG.util, C = GG.contracts;
  var CSS = [
    '.hof-wrap{padding-bottom:12px}',
    '.hof-best{display:flex;align-items:center;gap:10px;margin:10px 0 12px;padding:10px 12px;border-radius:12px;background:var(--bg2);border:1px solid var(--line)}',
    '.hof-row{display:flex;align-items:center;gap:10px;width:100%;min-height:64px;padding:8px 10px;margin-bottom:8px;border:1px solid var(--line);border-radius:14px;background:var(--bg2);color:var(--text);text-align:left;font:inherit;cursor:pointer}',
    '.hof-row .grow{min-width:0}.hof-row .bn{font-weight:900;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.hof-row .pl{font-size:12px;color:var(--dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.hof-row .sc{font:900 20px var(--font);color:var(--amber);text-align:right;min-width:52px}',
    '.hof-chip{display:inline-block;font:800 11px var(--font);padding:2px 8px;border-radius:999px;background:var(--panel2);color:var(--text);margin:4px 4px 0 0;white-space:nowrap}',
    '.hof-chip.tier{background:var(--amber);color:#1b1206}.hof-chip.brutal{background:#7a1d1d;color:#fff}.hof-chip.chill{background:#1d5a7a;color:#fff}',
    '.hof-top{display:flex;gap:12px;align-items:center}.hof-top .sc{font:900 34px var(--font);color:var(--amber)}',
    '.hof-part{display:grid;grid-template-columns:92px 1fr 40px;gap:8px;align-items:center;font-size:13px;margin:4px 0}',
    '.hof-part b{text-align:right}',
    '.hof-lineup{display:flex;flex-wrap:wrap;gap:10px}.hof-mem{display:flex;flex-direction:column;align-items:center;width:62px;font-size:11px;text-align:center}',
    '.hof-mem.gone{opacity:.45}.hof-mem span{max-width:62px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.hof-strip{display:flex;flex-wrap:wrap;gap:6px}',
    '.hof-yr{min-width:48px;min-height:48px;border-radius:12px;border:1px solid var(--line);background:var(--bg2);color:var(--text);font:800 13px var(--font);cursor:pointer}',
    '.hof-yr.on{border-color:var(--amber);box-shadow:inset 0 0 0 1px var(--amber)}',
    '.hof-yearcard{margin-top:10px;padding:10px 12px;border-radius:12px;background:var(--panel2)}',
    '.hof-sec{font:800 11px var(--font);letter-spacing:.08em;text-transform:uppercase;color:var(--dim);margin:16px 0 6px}',
    '.hof-tro{display:inline-flex;align-items:center;gap:4px;font-size:12px;padding:4px 8px;border-radius:999px;background:var(--bg2);border:1px solid var(--line);margin:0 6px 6px 0}'
  ].join('');
  if (typeof document !== 'undefined' && !document.getElementById('css-hof')) {
    var st0 = document.createElement('style'); st0.id = 'css-hof'; st0.textContent = CSS; document.head.appendChild(st0);
  }
  var TIER_NAME = { arena_legends: 'Arena Legends', canadian_institution: 'Canadian Institution', cult_heroes: 'Cult Heroes',
    one_album_wonders: 'One-Album Wonders', still_in_the_garage: 'Still in the Garage' };
  var SPECIAL_NAME = { big_in_japan: 'Big in Japan', moose_opera: 'Moose Opera', big_in_berlin: 'Big in Berlin', mudstonbury_legends: 'Mudstonbury Legends',
    outback_legends: 'Outback Legends', band_of_strangers: 'Band of Strangers', original_lineup: 'The Original Lineup', side_project: 'Side Project' };
  var PART_NAME = { fans: 'Fans', units: 'Records sold', awards: 'Awards', venue: 'Biggest room', regions: 'Abroad', unity: 'Band unity', final: 'Sad Dome' };
  var PART_MAX = { fans: 250, units: 200, awards: 150, venue: 100, regions: 100, unity: 100, final: 100 };
  var DIFF = { chill: 'Chill', normal: 'Normal', brutal: 'Brutal' };
  var SEAT = { drums: 'Drums', bass: 'Bass', rhythm: 'Rhythm guitar', lead: 'Lead guitar' };
  function endings() { return GG.content.endings || {}; }
  function findIn(list, id) { list = Array.isArray(list) ? list : []; for (var i = 0; i < list.length; i++) if (list[i] && list[i].id === id) return list[i]; return null; }
  function tierName(id) { var t = findIn(endings().tiers, id); return (t && t.name) || TIER_NAME[id] || 'Unfinished business'; }
  function specialName(id, e) {
    if (id === 'original_lineup') { var n = bandSize(e && e.bandId); return n === 4 ? 'The Original Four' : n === 5 ? 'The Original Five' : 'The Original Lineup'; }
    var s = findIn(endings().specials, id); return (s && s.name) || SPECIAL_NAME[id] || id;
  }
  function bandSize(id) { var b = (GG.content.bands || {})[id]; return b ? b.size || ((b.members || []).length + 1) : 0; }
  function bandName(e) { var b = (GG.content.bands || {})[e.bandId]; return e.band || (b && b.name) || 'The band'; }
  function playerName(e) { var p = e.player || {}; return (p.name || 'You') + (p.nick ? ' “' + p.nick + '”' : ''); }
  function years(e) { var y = e.years || 10; return y + ' years' + (e.bonusYears ? ' (+' + e.bonusYears + ' bonus)' : ''); }
  function logo(e, size, testid) {
    var lg = e.logo || (GG.logo ? GG.logo.defaultFor(e.bandId) : null);
    return ui.logoImg ? ui.logoImg(lg, bandName(e), size, { badge: 'round', testid: testid, alt: bandName(e) + ' logo' }) : el('span', '🏆');
  }
  function entries() { return GG.meta && GG.meta.hof ? GG.meta.hof() : []; }
  function diffChip(e, testid) { var d = e.difficulty || 'normal'; return el('span.hof-chip.' + d, { testid: testid }, DIFF[d] || d); }
  function seatChip(e, testid) { return e.seat && e.seat !== 'drums' ? el('span.hof-chip', { testid: testid }, SEAT[e.seat] || e.seat) : null; }

  ui.define('hof', {
    kind: 'full',
    build: function (s) {
      var list = entries(), best = GG.meta && GG.meta.get ? GG.meta.get().careers.best : null;
      var head = el('div', [
        el('div.back-row', [btn('.icon-btn', { testid: 'hof-back', 'aria-label': 'Back', onclick: function () { ui.close(s.id); } }, '←'), el('span.caps', 'Every finished career on this phone')]),
        el('h1.screen-h', '🏆 Hall of Fame')]);
      var body = [head];
      if (!list.length) body.push(el('p.dim.center', { testid: 'hof-empty', style: 'padding:40px 0' }, 'No careers yet. Go make some noise.'));
      else {
        var c = GG.meta.get().careers;
        body.push(el('div.hof-best', { testid: 'hof-best' }, [el('span', { style: 'font-size:26px' }, '🎖'), el('div.grow', [
          el('b', c.finished + ' career' + (c.finished === 1 ? '' : 's') + ' finished'),
          el('div.tiny.dim', best ? 'Best Legacy: ' + best.score : 'Every one of them counts.')])]));
        body.push(el('div.stack.tight', list.map(function (e, i) {
          return btn('.hof-row', { testid: 'hof-row-' + i, data: { band: e.bandId || '', id: e.id }, onclick: function () { ui.show('hof-entry', { id: e.id }); } }, [
            logo(e, 48, 'hof-logo-' + i),
            el('div.grow', [el('div.bn', bandName(e)), el('div.pl', playerName(e) + ' · ' + years(e)),
              el('div', [el('span.hof-chip.tier', { testid: 'hof-tier-' + i }, tierName(e.tier)), diffChip(e, 'hof-diff-' + i), seatChip(e, 'hof-seat-' + i)])]),
            el('div.sc', { testid: 'hof-score-' + i }, String(Math.round(e.score || 0)))]);
        })));
      }
      ui.append(s.body, el('div.hof-wrap', { testid: 'hof-screen' }, body));
      s.foot.appendChild(el('div.row', [
        btn('.btn.grow', { testid: 'hof-code', disabled: !list.length && !(GG.meta && Object.keys(GG.meta.get().ach || {}).length), onclick: function () { ui.show('code', { mode: 'hof' }); } }, '📋 Backup code'),
        btn('.btn.primary.grow', { testid: 'hof-close', onclick: function () { ui.close(s.id); } }, 'Close')]));
    }
  });

  function partRows(e) {
    var parts = e.parts || {}, keys = C.LEGACY_PARTS || Object.keys(PART_MAX);
    return el('div', { testid: 'hof-parts' }, keys.map(function (k) {
      var v = Math.round(+parts[k] || 0), max = PART_MAX[k] || 100;
      return el('div.hof-part', { testid: 'hof-part-' + k }, [el('span', PART_NAME[k] || k), ui.bar(v, max, { color: 'var(--amber)' }), el('b', String(v))]);
    }));
  }
  function lineup(e) {
    var pseudo = { bandId: e.bandId, members: (e.lineup || []).map(function (m) { return { id: m.id, name: m.name, status: m.status }; }) };
    return el('div.hof-lineup', { testid: 'hof-lineup' }, [el('div.hof-mem', { testid: 'hof-member-player' }, [ui.avatar(ui.who('player', { player: e.player || {} })), el('span', (e.player && e.player.name) || 'You')])]
      .concat((e.lineup || []).map(function (m) {
        var who = ui.who(m.id, pseudo), gone = m.status && m.status !== 'active';
        return el('div.hof-mem' + (gone ? '.gone' : ''), { testid: 'hof-member-' + m.id, title: gone ? 'Left the band' : '' }, [ui.avatar(who), el('span', m.name || who.name), gone ? el('i.tiny', 'left') : null]);
      })));
  }
  function trophies(e) {
    var ids = Array.isArray(e.ach) ? e.ach : [], A = GG.achieve;
    if (!ids.length) return el('p.small.dim', { testid: 'hof-trophies' }, 'No trophies that time. The shelf was resting.');
    return el('div', { testid: 'hof-trophies' }, ids.map(function (id) {
      var a = A && A.def(id);
      return el('span.hof-tro', { title: a ? a.blurb : '' }, [a ? a.icon || '🏆' : '🏆', a ? A.name(a, e.bandId) : id]);
    }));
  }
  function stats(e) {
    var s = e.stats || {}, rows = [['Fans', U.fmtNum(s.fans || 0)], ['Records sold', U.fmtNum(s.units || 0)], ['Gigs', s.gigs || 0], ['Songs', s.songs || 0],
      ['Albums', s.albums || 0], ['Loonies', s.loonies || 0], ['Global Gongs', s.gongs || 0], ["Parents' loans", s.loans || 0],
      ['Biggest room', s.venue ? s.venue.name + ' (' + U.fmtNum(s.venue.cap || 0) + ')' : 'The garage'], ['Regions broken', s.broken || 0]];
    return el('div.line-list.panel', { testid: 'hof-stats' }, rows.map(function (r) { return el('div', [el('span', r[0]), el('span', String(r[1]))]); }));
  }
  function rivalLine(e) {
    var rv = (e.rival && e.rival.name) || 'The rival', f = e.final;
    var t = f === 'you' ? 'You headlined the Sad Dome. ' + rv + ' watched from the cheap seats.'
      : f === 'rival' ? rv + ' headlined the Sad Dome. You were very gracious about it. Mostly.'
        : 'The Sad Dome never happened for you. ' + rv + ' is still talking about it.';
    return el('p.small', { testid: 'hof-rival' }, t);
  }
  function strip(e, s, sel) {
    var list = Array.isArray(e.strip) ? e.strip : [];
    if (!list.length) return el('p.small.dim', { testid: 'hof-strip' }, 'The yearly headlines stayed on the other phone (restore a Hall of Fame backup code to bring them here).');
    var cur = list.filter(function (x) { return x.y === sel; })[0] || null;
    return el('div', [el('div.hof-strip', { testid: 'hof-strip' }, list.map(function (x) {
      return btn('.hof-yr' + (cur && cur.y === x.y ? '.on' : ''), { testid: 'hof-year-' + x.y, title: x.h || '', 'aria-pressed': cur && cur.y === x.y ? 'true' : 'false',
        onclick: function () { s.rerender({ id: e.id, y: cur && cur.y === x.y ? null : x.y }); } }, 'Y' + x.y);
    })), cur ? el('div.hof-yearcard', { testid: 'hof-yearcard' }, [el('b', 'Year ' + cur.y + ': ' + (cur.h || 'A year happened.')),
      el('div.tiny.dim', [U.signed(cur.fans || 0) + ' fans', cur.era ? ' · ' + ui.cap(cur.era) + ' era' : '', cur.best ? ' · best gig: ' + cur.best : '',
        ' · ' + (cur.aw || 0) + ' award' + (cur.aw === 1 ? '' : 's')].join(''))]) : el('p.tiny.dim', 'Tap a year for its headline and numbers.')]);
  }
  ui.define('hof-entry', {
    kind: 'sheet', tall: true, title: 'Hall of Fame',
    build: function (s, d) {
      var e = entries().filter(function (x) { return x.id === d.id; })[0];
      if (!e) { s.body.appendChild(el('p.dim', 'That career has left the building.')); return; }
      s.setTitle(bandName(e), (e.at || '') + (e.ver ? ' · V' + e.ver : ''));
      var specials = (e.specials || []).map(function (id) { return el('span.hof-chip', { testid: 'hof-special-' + id }, '★ ' + specialName(id, e)); });
      ui.append(s.body, el('div', { testid: 'hof-entry', data: { band: e.bandId || '', id: e.id } }, [
        el('div.hof-top', [logo(e, 96, 'hof-entry-logo'), el('div.grow', [el('b', playerName(e)), el('div.tiny.dim', years(e) + ' · ' + (e.city || '')),
          el('div', [el('span.hof-chip.tier', tierName(e.tier)), diffChip(e), seatChip(e)])]), el('div.sc', String(Math.round(e.score || 0)))]),
        specials.length ? el('div', { testid: 'hof-specials', style: 'margin-top:8px' }, specials) : null,
        el('div.hof-sec', 'Legacy'), partRows(e),
        el('div.hof-sec', 'The band'), lineup(e),
        el('div.hof-sec', 'Trophies'), trophies(e),
        el('div.hof-sec', 'The rival'), rivalLine(e),
        el('div.hof-sec', 'Year by year'), strip(e, s, d.y),
        el('div.hof-sec', 'The numbers'), stats(e)
      ]));
      s.foot.appendChild(btn('.btn.block', { testid: 'hof-entry-close', onclick: function () { ui.close(s.id); } }, 'Close'));
    }
  });

  // The title's Hall of Fame button appears once there is an entry (a restored backup, an old ended save found by the scan).
  GG.on('hof:added', function () { refreshTitle(); });
  GG.on('meta:changed', function (p) { if (p && p.keys && p.keys.indexOf('hof') >= 0) refreshTitle(); });
  function refreshTitle() {
    if (GG.state || !ui.isOpen || !ui.isOpen('title') || ui.top() !== 'title') return;
    var t = ui.get && ui.get('title'); if (t && t.rerender) t.rerender();
  }
  GG.on('meta:quota', function () { ui.toast('Hall of Fame saved for this session only. Back it up with its code.', { kind: 'bad', ms: 6000 }); });

  GG.registerDebug('hof', function () {
    var list = entries();
    return { entries: list.length, open: ui.isOpen ? ui.isOpen('hof') : false, entry: ui.isOpen && ui.isOpen('hof-entry'), bands: list.map(function (e) { return e.bandId; }) };
  });
})(window.GG);
