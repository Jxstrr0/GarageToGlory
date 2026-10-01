// 5g_ui_bandbook.js: Bandbook, the band's one parody social app (v0.6.1, FANS agent; Addendum 1 C5). Reads GG.fans
// (29_sim_fans.js); never rolls anything. The laptop's Bandbook tab (53_ui_laptop -> GG.ui.bandbookPanel) and a
// standalone sheet (screen 'bandbook', GG.ui.show('bandbook', { tab })) show three sub-tabs:
//   Feed     : the band page (fans, viral count), posts newest first (kind, week, text, likes/shares/plays, a viral or
//              members-only badge) with their comments (fans, haters, Dale, Wendell, and the rival on every post).
//   Fans     : one fan count split into superfans / casuals / haters (bars), the named superfans (Dale from Warman,
//              Big Wendell once you've met him, the Japanese fan-club president teased for v0.7), fan mail + gifts.
//   Patreeon : locked before the Signed era (pitch + tiers preview); then open it (button, or the Monday card), members,
//              happiness, tiers Drumstick / Snare / Full Kit with members and prices, next payout, "Post an exclusive"
//              (once a week: GG.fans.exclusive) and the latest exclusives.
// testids: bandbook-panel, bb-page, bb-tab-feed|fans|club, bb-empty, bb-post (data-kind, data-viral), bb-viral, bb-excl,
//   bb-comment (data-who), bb-types, bb-type-super|casual|hater, bb-superfan-<id>, bb-gifts, bb-gift, bb-club-locked,
//   bb-club-open, bb-club-stats, bb-club-happiness, bb-tier-<id>, bb-exclusive, bb-club-posts, laptop-tab-bandbook.
(function (GG) {
  var ui = GG.ui; if (!ui || !ui.el) return;
  var el = ui.el, btn = ui.btn, U = GG.util, C = GG.contracts, WPY = C.WEEKS_PER_YEAR;
  var CSS = [
    '.bb-head{display:flex;align-items:baseline;gap:8px;margin:2px 0 8px}',
    '.bb-logo{font:900 22px/1 var(--font);letter-spacing:-.02em;color:#7fa8ff}.bb-logo i{font-style:normal;color:var(--amber)}',
    '.bb-tag{font-size:12px;color:var(--dim);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.bb-page{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:14px;background:var(--bg2);border:1px solid var(--line);margin-bottom:10px}',
    '.bb-pic{width:44px;height:44px;flex:0 0 44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font:900 20px var(--font);background:linear-gradient(135deg,#b3262b,#3b1a2a);color:#fff}',
    '.bb-page .grow b{display:block;font-size:15px}.bb-page .grow span{font-size:12px;color:var(--dim)}',
    '.bb-sub{margin-bottom:10px}',
    '.bb-post{background:var(--bg2);border:1px solid var(--line);border-radius:14px;padding:10px 12px;margin-bottom:10px;overflow-wrap:anywhere}',
    '.bb-post.viral{border-color:#4f8cff;box-shadow:0 0 0 1px rgba(79,140,255,.35) inset}.bb-post.cringe{border-color:#b35a2c}.bb-post.excl{border-color:#ff6a4d}',
    '.bb-top{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--dim);flex-wrap:wrap}.bb-top b{color:var(--text);font-size:13px}',
    '.bb-badge{margin-left:auto;padding:2px 8px;border-radius:999px;font:800 11px var(--font);background:var(--panel2);border:1px solid var(--line);white-space:nowrap}',
    '.bb-badge.viral{color:#bcd3ff;border-color:#4f8cff}.bb-badge.cringe{color:#ffc3a0;border-color:#b35a2c}.bb-badge.excl{color:#ffb4a4;border-color:#ff6a4d}',
    '.bb-text{margin:6px 0;font-size:14px;line-height:1.4}',
    '.bb-stats{font-size:12px;color:var(--dim);padding-bottom:6px;border-bottom:1px solid var(--line)}',
    '.bb-c{font-size:13px;line-height:1.35;padding:6px 0 0}.bb-c b{margin-right:4px}.bb-c .tag{font-size:10px;padding:1px 6px;margin-right:4px;vertical-align:1px}',
    '.bb-c.rival b{color:#ff8a80}.bb-c.dale b{color:#ffd166}.bb-c.trucker b{color:#9fe0a8}.bb-c.hater b{color:#c9a0ff}',
    '.bb-types{display:grid;gap:8px;margin:8px 0 12px}.bb-type{display:grid;grid-template-columns:92px 1fr 74px;align-items:center;gap:8px;font-size:13px}',
    '.bb-type .bar{height:10px}.bb-type span:last-child{text-align:right;color:var(--dim);font-size:12px}',
    '.bb-sf{display:flex;gap:10px;padding:10px 12px;border-radius:14px;background:var(--bg2);border:1px solid var(--line);margin-bottom:8px}',
    '.bb-sf .ic{font-size:26px;line-height:1;flex:0 0 30px}.bb-sf.locked{opacity:.6}.bb-sf b{display:block}.bb-sf p{margin:2px 0 0;font-size:12px;color:var(--dim)}',
    '.bb-gift{display:flex;gap:10px;padding:8px 0;border-top:1px solid var(--line);font-size:13px;overflow-wrap:anywhere}.bb-gift .ic{font-size:20px;flex:0 0 24px}',
    '.bb-gift small{display:block;color:var(--dim)}',
    '.bb-h{font:800 12px var(--font);letter-spacing:.08em;text-transform:uppercase;color:var(--dim);margin:14px 0 6px}',
    '.bb-club{padding:12px;border-radius:14px;background:linear-gradient(160deg,rgba(255,106,77,.16),rgba(28,36,56,.4));border:1px solid #7a3a2e;margin-bottom:10px}',
    '.bb-club .pt{font:900 20px var(--font);color:#ff8a70}.bb-club p{margin:4px 0;font-size:13px}',
    '.bb-stats4{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:10px 0}',
    '.bb-stats4 div{background:var(--bg2);border:1px solid var(--line);border-radius:12px;padding:8px 10px}.bb-stats4 b{display:block;font-size:17px}.bb-stats4 span{font-size:11px;color:var(--dim)}',
    '.bb-tier{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;background:var(--bg2);border:1px solid var(--line);margin-bottom:8px}',
    '.bb-tier.off{opacity:.55}.bb-tier .ic{font-size:22px}.bb-tier .grow b{display:block}.bb-tier .grow span{font-size:12px;color:var(--dim)}',
    '.bb-tier .price{font:800 15px var(--font);text-align:right;white-space:nowrap}.bb-tier .price small{display:block;font-size:11px;color:var(--dim);font-weight:600}',
    // the laptop: 7 tabs wrap into two rows (4 + 3) so every tab stays a full thumb target
    '.tabs:has(> .tab:nth-child(7)){flex-wrap:wrap;gap:4px}.tabs:has(> .tab:nth-child(7)) > .tab{flex:1 0 calc(25% - 4px);font-size:12px;padding:0 2px}'
  ].join('\n');
  function css() {
    if (document.getElementById('gg-css-bandbook')) return;
    var st = document.createElement('style'); st.id = 'gg-css-bandbook'; st.textContent = CSS; document.head.appendChild(st);
  }
  if (typeof document !== 'undefined' && document.head) css();

  var sub = 'feed';
  var SUBS = [{ id: 'feed', label: 'Feed' }, { id: 'fans', label: 'Fans' }, { id: 'club', label: 'Patreeon' }];
  function F() { return GG.fans; }
  function wk(w) {
    var y = Math.floor((w - 1) / WPY) + 1, woy = (w - 1) % WPY + 1;
    return 'Y' + y + ' W' + woy + (GG.calendar ? ' · ' + GG.calendar.month(woy) : '');
  }
  function bandName(st) { var b = GG.career && GG.career.band(st); return (b && b.name) || 'The band'; }
  function sync() { if (GG.main && GG.main.sync) GG.main.sync(); }
  function sfx(n) { if (GG.audio && GG.audio.sfx) GG.audio.sfx(n); }

  /* ---- Feed ------------------------------------------------------------------------------------------------ */
  var WHO_TAG = { rival: 'Rival', dale: 'Superfan', trucker: 'Superfan', hater: 'Hater' };
  function comment(c) {
    var st = GG.state, rv = c.who === 'rival' && st ? (GG.content.rivals || {})[(ui.band(st) || {}).rival] : null;   // v0.9: the rival's genre icon
    var tag = WHO_TAG[c.who] ? WHO_TAG[c.who] + (c.who === 'rival' ? ' ' + ui.genreIcon(rv ? rv.genre : st && st.genre) : '') : null;
    return el('div.bb-c.' + c.who, { testid: 'bb-comment', data: { who: c.who } },
      [el('b', c.name), tag ? el('span.tag', tag) : null, el('span', c.text)]);
  }
  function postCard(p) {
    var info = F().kindInfo(p.kind), cls = p.exclusive ? '.excl' : p.viral === 'good' ? '.viral' : p.viral === 'cringe' ? '.cringe' : '';
    var badge = p.exclusive ? el('span.bb-badge.excl', { testid: 'bb-excl' }, '🔒 Members only')
      : p.viral === 'good' ? el('span.bb-badge.viral', { testid: 'bb-viral' }, '🚀 Viral')
      : p.viral === 'cringe' ? el('span.bb-badge.cringe', { testid: 'bb-viral' }, '😬 Wrong kind of viral') : null;
    return el('div.bb-post' + cls, { testid: 'bb-post', data: { kind: p.kind, viral: p.viral || '' } }, [
      el('div.bb-top', [el('span', info.icon), el('b', info.label), el('span', '· ' + wk(p.w)), badge]),
      el('p.bb-text', p.text),
      el('div.bb-stats', '👍 ' + U.fmtNum(p.likes) + ' · 🔁 ' + U.fmtNum(p.shares) + ' · ▶ ' + U.fmtNum(p.plays) + (p.comments ? ' · 💬 ' + p.comments.length : '')),
      el('div.bb-comments', (p.comments || []).map(comment))
    ]);
  }
  function feedTab(st) {
    var posts = F().feed(st, 12);
    if (!posts.length) return el('p.dim.center', { testid: 'bb-empty', style: 'padding:24px 6px' },
      'No posts yet. Put a Promote block in your week and the band posts automatically: rehearsal clips, gig announcements, song teasers, memes.');
    return el('div', posts.map(postCard));
  }

  /* ---- Fans ------------------------------------------------------------------------------------------------ */
  var MOOD = function (m) { return m == null ? '' : m >= 75 ? '😍' : m >= 55 ? '🙂' : m >= 35 ? '😐' : '😟'; };
  function fansTab(st) {
    var c = F().counts(st), t = F().shares(st);
    var row = function (id, label, n, share, color) {
      return el('div.bb-type', { testid: 'bb-type-' + id }, [el('span', label), ui.bar(share * 100, 100, { color: color }),
        el('span', U.fmtNum(n) + ' · ' + Math.round(share * 100) + '%')]);
    };
    var sfs = F().superfanList(st).map(function (x) {
      var body = x.reserved ? 'Coming with the world tour (' + x.reserved + ').' : x.active ? x.blurb : '??? Some stories need a dead battery at 2 a.m.';
      var meta = x.active ? 'Shows: ' + x.seen + ' · ' + MOOD(x.mood) : null;
      return el('div.bb-sf' + (x.active ? '' : '.locked'), { testid: 'bb-superfan-' + x.id }, [el('div.ic', x.active || x.reserved ? x.icon : '❔'),
        el('div.grow', [el('b', x.active || x.reserved ? x.name : 'A superfan you haven\'t met'), el('p', body), meta ? el('p', meta) : null])]);
    });
    var gifts = F().gifts(st).slice(0, 12).map(function (g) {
      return el('div.bb-gift', { testid: 'bb-gift', data: { id: g.id, kind: g.kind || 'gift' } }, [el('div.ic', g.kind === 'mail' ? '✉️' : '🎁'),
        el('div.grow', [el('b', (g.kind === 'mail' ? 'Letter from ' : 'Gift from ') + g.from), el('small', g.text + ' · ' + wk(g.week))])]);
    });
    return el('div', [
      el('div.bb-h', 'One fan count: ' + U.fmtNum(c.total)),
      el('div.bb-types', { testid: 'bb-types' }, [row('super', '⭐ Superfans', c.super, t.super, '#ffd166'),
        row('casual', '🙂 Casuals', c.casual, t.casual, '#7fa8ff'), row('hater', '👎 Haters', c.hater, t.hater, '#c9a0ff')]),
      el('p.small.dim', 'Superfans follow you on tour. Casuals show up when the buzz is up. Haters grow with fame, and they comment.'),
      el('div.bb-h', 'Superfans'), el('div', sfs),
      el('div.bb-h', 'Fan mail + gifts'),
      el('div', { testid: 'bb-gifts' }, gifts.length ? gifts : el('p.small.dim', 'Nothing yet. Play some shows. The mail comes to ' + ui.space(st) + '.'))
    ]);
  }

  /* ---- Patreeon --------------------------------------------------------------------------------------------- */
  function happyLabel(h) { return h >= 80 ? 'Thrilled' : h >= 60 ? 'Content' : h >= 40 ? 'Restless' : h >= 25 ? 'Grumbling' : 'Cancelling'; }
  function tierRow(t, open) {
    return el('div.bb-tier' + (open && !t.unlocked ? '.off' : ''), { testid: 'bb-tier-' + t.id }, [el('div.ic', t.icon || '🥁'),
      el('div.grow', [el('b', t.name), el('span', GG.state ? ui.fill(t.perk, GG.state) : t.perk)]),   // v0.9: perks carry {space}
      el('div.price', ['$' + t.price + '/mo', el('small', !open ? (t.minMembers ? 'opens at ' + t.minMembers : '') : t.unlocked ? t.members + (t.dale ? ' (incl. ' + ui.superfan() + ')' : '') + ' members'
        : t.dale ? ui.superfan() + ' (not open yet; pays anyway)' : 'opens at ' + t.minMembers + ' members')])]);
  }
  function clubTab(st, rerender) {
    var v = F().club(st);
    var head = el('div.bb-club', [el('div.pt', v.name), el('p', '“' + v.pitch + '”')]);
    if (!v.unlocked) return el('div', { testid: 'bb-club-locked' }, [head, el('p.small.dim', v.locked), el('div.bb-h', 'Tiers'),
      el('div', v.tiers.map(function (t) { return tierRow(t, false); }))]);
    if (!v.open) return el('div', [head, el('p.small', 'Superfans pay monthly; you post exclusive stuff to keep them happy. Happy members stay (and tell their friends).'),
      btn('.btn.primary.block', { testid: 'bb-club-open', onclick: function () {
        if (!F().openClub(st)) return;
        sfx('ui'); sync(); ui.toast('Patreeon is live. First member: ' + ui.superfan(st) + ', Full Kit, at 12:01 a.m.'); rerender();
      } }, 'Open the fan club'),
      el('div.bb-h', 'Tiers'), el('div', v.tiers.map(function (t) { return tierRow(t, false); }))]);
    var can = v.canExclusive, posts = F().feed(st).filter(function (p) { return p.exclusive; }).slice(0, 3);
    return el('div', [head,
      el('div.bb-stats4', { testid: 'bb-club-stats' }, [
        el('div', [el('b', U.fmtNum(v.members)), el('span', 'members')]),
        el('div', [el('b', U.fmtMoney(v.nextPayout)), el('span', 'next payout (after the ' + Math.round(v.cut * 100) + '% cut)')]),
        el('div', [el('b', U.fmtMoney(v.earned)), el('span', 'earned so far')]),
        el('div', [el('b', String(v.exclusives)), el('span', 'exclusives posted')])]),
      el('div', { testid: 'bb-club-happiness' }, [el('div.row.small', [el('span.grow', 'Member happiness'), el('b', happyLabel(v.happiness) + ' · ' + Math.round(v.happiness) + '%')]),
        ui.bar(v.happiness, 100, { color: v.happiness >= 60 ? 'var(--good)' : v.happiness >= 35 ? 'var(--amber)' : 'var(--bad)' })]),
      el('p.small.dim', 'Paid at the end of each month. Members get restless without an exclusive every week; unhappy ones cancel.'),
      btn('.btn.block' + (can ? '.primary' : ''), { testid: 'bb-exclusive', disabled: !can, style: 'margin:8px 0 4px', onclick: function () {
        var p = F().exclusive(st, {});
        if (!p) return;
        sfx('ui'); sync(); ui.toast('🔒 Exclusive posted. Members are happier. (Burnout +' + (F().cfg().club.exclusiveBurnout || 0) + ')'); rerender();
      } }, can ? '🔒 Post an exclusive' : '✓ Exclusive posted this week'),
      el('div.bb-h', 'Tiers'), el('div', v.tiers.map(function (t) { return tierRow(t, true); })),
      posts.length ? el('div.bb-h', 'Latest exclusives') : null, el('div', { testid: 'bb-club-posts' }, posts.map(postCard))]);
  }

  /* ---- The panel + the standalone sheet -------------------------------------------------------------------------- */
  // st: GG.state; rerender(): redraw the host; opts.tab: 'feed'|'fans'|'club'.
  ui.bandbookPanel = function (st, rerender, opts) {
    css();
    if (!F() || !st) return el('p.dim', st ? ui.fill('Bandbook is down for maintenance. {deadpan} is looking at it.', st) : 'Bandbook is down for maintenance.');
    F().ensure(st);
    if (opts && opts.tab) sub = opts.tab;
    var redo = function () { if (rerender) rerender(); };
    var c = F().counts(st), b = st.bandbook, name = bandName(st);
    var body = sub === 'fans' ? fansTab(st) : sub === 'club' ? clubTab(st, redo) : feedTab(st);
    return el('div', { testid: 'bandbook-panel' }, [
      el('div.bb-head', [el('span.bb-logo', ['band', el('i', 'book')]), el('span.bb-tag', (F().content().tagline) || '')]),
      el('div.bb-page', { testid: 'bb-page' }, [ui.bandLogo ? ui.bandLogo(st, 44, { badge: 'round', testid: 'bb-logo' }) : el('div.bb-pic', name.charAt(0)), el('div.grow', [el('b', name),   // v0.8.1: the band logo
        el('span', U.fmtNum(c.total) + ' fans · ' + b.posts.length + ' posts · 🚀 ' + b.viral + ' viral' + (st.fanClub ? ' · Patreeon ' + st.fanClub.members : ''))])]),
      el('div.bb-sub', ui.tabs(SUBS, sub, function (id) { sub = id; redo(); }, 'bb-tab-')),
      body
    ]);
  };
  ui.bandbookTab = function () { return sub; };
  ui.define('bandbook', {
    kind: 'sheet', tall: true, title: 'Bandbook',
    build: function (s, d) {
      var st = GG.state; if (!st) return;
      s.setTitle('Bandbook', 'THE BAND PAGE');
      ui.append(s.body, ui.bandbookPanel(st, function () { s.rerender({}); }, d && d.tab ? { tab: d.tab } : null));
    }
  });
  GG.registerDebug('bandbook', function () {
    var st = GG.state;
    return { tab: sub, open: ui.isOpen ? ui.isOpen('bandbook') : false, posts: st && st.bandbook ? st.bandbook.posts.length : 0,
      rendered: typeof document !== 'undefined' ? document.querySelectorAll('[data-testid="bb-post"]').length : 0 };
  });
})(window.GG);
