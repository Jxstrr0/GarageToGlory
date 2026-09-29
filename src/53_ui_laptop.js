// 53_ui_laptop.js: the laptop on the cooler. Tabs: Group chat (member-coloured bubbles, newest at the bottom),
// Band (members' skill + mood, your drum skill, the song catalog: tap a song to hear it) and Money (fund, debt to parents, fund history).
// Read-only views of GG.state; later versions add socials and the rival leaderboard as more tabs.
(function (GG) {
  var ui = GG.ui, el = ui.el, U = GG.util;
  var TABS = [{ id: 'chat', label: 'Chat' }, { id: 'band', label: 'Band' }, { id: 'money', label: 'Money' }];
  var lastTab = 'chat';
  function fill(t) { return GG.career && GG.career.fillText && GG.state ? GG.career.fillText(GG.state, t) : t; }

  function chatTab(st) {
    var msgs = st.chat || [];
    if (!msgs.length) return el('p.dim.center', { style: 'padding:30px 0' }, 'No messages yet. Kenji has read everything.');
    var out = [], week = null;
    msgs.forEach(function (m) {
      if (m.week !== week) { week = m.week; out.push(el('div.day-sep', 'Week ' + (((week - 1) % GG.contracts.WEEKS_PER_YEAR) + 1) + ' · Year ' + (Math.floor((week - 1) / GG.contracts.WEEKS_PER_YEAR) + 1))); }
      var who = ui.who(m.who);
      out.push(el('div.msg', [el('span.w', { style: { color: who.text } }, who.short), el('div.t', { style: { borderLeftColor: who.color } }, fill(m.text))]));
    });
    return el('div.laptop-screen', { testid: 'laptop-chat' }, out);
  }

  function statRow(label, value, color, right) {
    return el('div.kv', [el('span', label), ui.bar(value, 100, { color: color }), el('b', right != null ? right : String(Math.round(value)))]);
  }
  function bandTab(st) {
    var out = [];
    (st.members || []).forEach(function (m) {
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
        el('div', [el('span', 'Gigs played'), el('span', String(s.gigs || 0))])
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
      var body = tab === 'band' ? bandTab(st) : tab === 'money' ? moneyTab(st) : chatTab(st);
      ui.append(s.body, [el('div', { style: 'position:sticky;top:0;z-index:2;padding:2px 0 10px;background:var(--panel)' },
        ui.tabs(TABS, tab, function (id) { s.rerender({ tab: id }); s.body.scrollTop = 0; if (id === 'chat') toBottom(s); }, 'laptop-tab-')), body]);
      if (tab === 'chat') toBottom(s);
    }
  });
  function toBottom(s) { setTimeout(function () { s.body.scrollTop = s.body.scrollHeight; }, 0); }
})(window.GG);
