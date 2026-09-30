// 53_ui_laptop.js: the laptop on the cooler. Tabs: Group chat (member-coloured bubbles, newest at the bottom),
// Band (members' skill + mood, your drum skill, the song catalog: tap a song to hear it) and Money (fund, debt to parents, fund history).
// v0.4: the Band tab's member section comes from GG.ui.bandPanel (58_ui_band: pay the band, stages, holes, recruits).
// v0.5: Label (deal status, recoup, deadline, offers, DIY: GG.ui.labelPanel in 59_ui_label) and Albums (studio session,
// discography: GG.ui.albumsPanel in 59c_ui_awards) tabs.
// v0.6: Scene (the rival, heat, the scene leaderboard, rival news: GG.ui.scenePanel in 59d_ui_rival).
// v0.7: World (tour status, a mini world map -> the world map, charts abroad, past tours, the Global Gong).
// v0.6.1: Bandbook (posts, comments, fan types, superfans, fan mail, Patreeon: GG.ui.bandbookPanel in 5g_ui_bandbook;
// seven tabs wrap into two rows, CSS in 5g).
// v0.8 (SHOPUI): the Money tab adds merch sold / stock bought and the rehearsal space's weekly rent.
// v0.8.1 (LICRECAP): an "Offers" line above the tabs while a licensing offer is open (GG.ui.offersLine -> the offer sheet)
// and a Years tab (past year-end recaps: GG.ui.recapPanel in 5l_ui_recap; nine tabs wrap 5 + 4).
// Read-only views of GG.state; later versions add socials as more tabs.
(function (GG) {
  var ui = GG.ui, el = ui.el, U = GG.util;
  var TABS = [{ id: 'chat', label: 'Chat' }, { id: 'bandbook', label: 'Bandbook' }, { id: 'band', label: 'Band' }, { id: 'money', label: 'Money' }, { id: 'label', label: 'Label' }, { id: 'albums', label: 'Albums' }, { id: 'scene', label: 'Scene' }, { id: 'world', label: 'World' }, { id: 'years', label: 'Years' }];   // v0.7: World (GG.ui.worldPanel in 5i_ui_tour)
  var lastTab = 'chat';
  function fill(t) { return GG.career && GG.career.fillText && GG.state ? GG.career.fillText(GG.state, t) : t; }

  function chatTab(st) {
    var msgs = st.chat || [];
    if (!msgs.length) return el('p.dim.center', { style: 'padding:30px 0' }, 'No messages yet. Kenji has read everything.');
    var out = [], week = null;
    msgs.forEach(function (m) {
      if (m.week !== week) { week = m.week; out.push(el('div.day-sep', 'Week ' + (((week - 1) % GG.contracts.WEEKS_PER_YEAR) + 1) + ' · Year ' + (Math.floor((week - 1) / GG.contracts.WEEKS_PER_YEAR) + 1))); }
      if (ui.chatMsg) { out.push(ui.chatMsg(m)); return; }   // v0.4: tone-aware (passive-aggressive, news)
      var who = ui.who(m.who);
      out.push(el('div.msg', [el('span.w', { style: { color: who.text } }, who.short), el('div.t', { style: { borderLeftColor: who.color } }, fill(m.text))]));
    });
    return el('div.laptop-screen', { testid: 'laptop-chat' }, out);
  }

  function statRow(label, value, color, right) {
    return el('div.kv', [el('span', label), ui.bar(value, 100, { color: color }), el('b', right != null ? right : String(Math.round(value)))]);
  }
  function bandTab(st, rerender) {
    var out = [];
    if (ui.bandPanel) out.push(ui.bandPanel(st, rerender));   // v0.4: pay the band, stages, wants, holes, recruits
    else (st.members || []).forEach(function (m) {
      var who = ui.who(m.id), label = ui.moodLabel(m.mood);
      out.push(el('div.mem-card', [
        el('div.row', [ui.avatar(who), el('div.grow', [el('div', { style: 'font-weight:800' }, who.full || who.name + (who.nick ? ' "' + who.nick + '"' : '')),
          el('div.small.dim', who.role || '')]), m.status && m.status !== 'active' ? el('span.tag', m.status) : null]),
        statRow('Skill', m.skill, 'var(--blue)'),
        statRow('Mood', m.mood, ui.moodColor(m.mood), ui.moodEmoji(label))
      ]));
    });
    var p = st.player || {};
    out.push(el('div.mem-card', [
      el('div.row', [ui.avatar(ui.who('player')), el('div.grow', [el('div', { style: 'font-weight:800' }, (p.name || 'You') + (p.nick ? ' "' + p.nick + '"' : '')),
        el('div.small.dim', 'Drums · founder · unfireable')])]),
      statRow('Chops', st.drumSkill, 'var(--amber)')
    ]));
    if (ui.logoPanel) out.push(ui.logoPanel(st, rerender));   // v0.8.1 LOGO: the band logo + Rebrand (5m_ui_logo)
    // Song catalog: tap a song to open it read-only in the sequencer (and play it).
    var songs = st.songs || [];
    var list = el('div.panel', { testid: 'laptop-songs' }, songs.length ? songs.map(function (s) {
      var r = s.rating || {}, tags = [s.classic ? el('span.tag.gold', 'classic') : null, (s.stale || 0) >= 50 ? el('span.tag', 'stale') : null,
        s.auto ? null : el('span.tag.mine', 'yours')];
      return ui.btn('.song', { testid: 'song-' + s.id, onclick: function () { if (ui.openSong) ui.openSong(s.id); } }, [
        el('span', { style: 'font-size:20px' }, '🎵'),
        el('div.grow', [el('div.fr', s.title), s.titleEn && s.titleEn !== s.title ? el('div.en', s.titleEn) : null,
          el('div.tiny.dim', ['Groove ' + (r.groove || 0) + ' · Hook ' + (r.hook || 0) + ' · Diff ' + (r.difficulty || 0) + ' ', tags])]),
        el('div.small.dim', { style: 'text-align:right;white-space:nowrap' }, ['Q ' + Math.round(s.quality || 0), el('br'), 'Polish ' + Math.round(s.polish || 0) + ' · ▶' + (s.plays || 0)])]);
    }) : el('p.dim', 'No songs yet. Marcel is "workshopping".'));
    out.push(el('div.caps', { style: 'margin:14px 0 6px' }, 'Song catalog (' + songs.length + ') · tap one to hear it'), list);
    if (songs.length && ui.defined('practice')) out.push(ui.btn('.btn.block', { testid: 'laptop-practice', style: 'margin-top:8px',   // v0.6.1 C4
      onclick: function () { ui.show('practice'); } }, '🥁 Practice a song (no crowd, slow it down)'));
    return el('div', out);
  }

  function moneyTab(st) {
    var hist = (st.history || []).slice(-12);
    var max = Math.max.apply(null, [1].concat(hist.map(function (h) { return Math.abs(h.fund || 0); })));
    var bars = el('div.hist', hist.length ? hist.map(function (h) {
      var wk = ((h.w - 1) % GG.contracts.WEEKS_PER_YEAR) + 1;
      return el('div', [el('span', 'W' + wk), ui.bar(Math.max(0, h.fund), max, { color: h.fund > 0 ? 'var(--good)' : 'var(--bad)' }), el('b', U.fmtMoney(h.fund))]);
    }) : el('p.dim.small', 'No history yet. Check back after a week.'));
    var s = st.stats || {};
    return el('div.stack', [
      el('div.panel', [el('div.caps', 'Band fund'), el('div.big-num' + (st.fund < 0 ? '.bad' : ''), { testid: 'laptop-fund' }, U.fmtMoney(st.fund))]),
      el('div.line-list.panel', [
        el('div', [el('span', 'Owed to your parents'), el('span' + (st.debtToParents ? '.bad' : ''), U.fmtMoney(st.debtToParents || 0))]),
        el('div', [el('span', "Parents' loans so far"), el('span', String(s.parentsLoans || 0))]),
        s.earned != null ? el('div', [el('span', 'Earned, all time'), el('span', U.fmtMoney(s.earned))]) : null,
        el('div', [el('span', 'Gigs played'), el('span', String(s.gigs || 0))]),
        st.merch ? el('div', { 'data-testid': 'laptop-merch' }, [el('span', 'Merch sold, all time (stock ' + U.fmtMoney(st.merch.spent || 0) + ')'), el('span.good', U.fmtMoney(st.merch.earned || 0))]) : null,   // v0.8
        GG.shop && GG.shop.rent(st) ? el('div', { 'data-testid': 'laptop-rent' }, [el('span', 'Rent · ' + GG.shop.spaceDef(st, st.spaceTier || 0).name), el('span.bad', '−' + U.fmtMoney(GG.shop.rent(st)) + '/wk')]) : null
      ]),
      el('div.panel', [el('div.caps', { style: 'margin-bottom:8px' }, 'Fund, last ' + hist.length + ' weeks'), bars]),
      st.debtToParents ? el('p.small.dim.center', 'Your mom has started leaving night-school brochures on the drum throne.') : null
    ]);
  }

  ui.define('laptop', {
    kind: 'sheet', tall: true, title: 'The laptop',
    build: function (s, d) {
      var st = GG.state; if (!st) return;
      var tab = d.tab || lastTab;
      lastTab = tab;
      s.setTitle('The laptop', 'CRACKED SCREEN · 12% BATTERY');
      var body = tab === 'band' ? bandTab(st, function () { s.rerender({ tab: 'band' }); }) : tab === 'money' ? moneyTab(st)
        : tab === 'label' ? (ui.labelPanel ? ui.labelPanel(st, function () { s.rerender({ tab: 'label' }); }) : el('p.dim', 'No label news.'))   // v0.5
        : tab === 'albums' ? (ui.albumsPanel ? ui.albumsPanel(st) : el('p.dim', 'No albums yet.'))
        : tab === 'scene' ? (ui.scenePanel ? ui.scenePanel(st) : el('p.dim', 'No rivals yet.'))   // v0.6
        : tab === 'world' ? (ui.worldPanel ? ui.worldPanel(st) : el('p.dim', 'No passport yet.'))   // v0.7
        : tab === 'bandbook' ? (ui.bandbookPanel ? ui.bandbookPanel(st, function () { s.rerender({ tab: 'bandbook' }); }) : el('p.dim', 'Bandbook is down.'))   // v0.6.1
        : tab === 'years' ? (ui.recapPanel ? ui.recapPanel(st) : el('p.dim', 'No years in the books yet.'))   // v0.8.1
        : chatTab(st);
      ui.append(s.body, [el('div', { style: 'position:sticky;top:0;z-index:2;padding:2px 0 10px;background:var(--panel)' },
        ui.tabs(TABS, tab, function (id) { s.rerender({ tab: id }); s.body.scrollTop = 0; if (id === 'chat') toBottom(s); }, 'laptop-tab-')),
        ui.offersLine ? ui.offersLine(st, function () { s.rerender({ tab: tab }); }) : null, body]);   // v0.8.1: open licensing offers
      if (tab === 'chat') toBottom(s);
    }
  });
  function toBottom(s) { setTimeout(function () { s.body.scrollTop = s.body.scrollHeight; }, 0); }
})(window.GG);
