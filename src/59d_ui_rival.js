// 59d_ui_rival.js: the rivalry UI (v0.6 "Rivals", RIVALUI agent). Reads GG.rival (23_sim_rival.js); never rolls anything.
//   Laptop Scene tab (GG.ui.scenePanel via 53_ui_laptop): the rival's card (fans, buzz, set strength, head-to-head), the heat
//     meter + this week's showdown odds, the Sad Dome countdown (or its result), the scene leaderboard, rival news, recent
//     showdowns, their lineup (defectors in corpse paint) and their records.
//   Showdown announcement (screen 'showdown', sheet): after the Monday card (60_main beginWeek/afterCard). BotB: Enter / Pass
//     (GG.rival.enter/pass); sameNight: the expected crowd split; stolenSlot: taken or defended; festival: see the board;
//     final: the Sad Dome. Poach/crack/Sad Dome eve are forced Monday cards (card screen + GG.ui.rivalCardNote strip).
//   GG.ui.playShowdown(gig, done, { resume }) (60_main playWeekend): a set showdown (botb/festival/final) shows the rival's
//     set first (screen 'rival-set', full, live3d: the 3D stage from the crowd with their lineup in corpse paint and a ticking
//     score, skippable), then your live set (GG.ui.playGig, v0.3), then the crowd verdict (screen 'rival-verdict', full).
//     Any gig that resolved a showdown (a same-night split) also ends on the verdict.
//   GG.ui.showdownViews: null (default: views on unless GG.ui.gigAutoplay) | true | false. Autoplay flows get toasts instead
//     of the announcement and skip the spectator view and the verdict (they stay fast). GG.ui.rivalSongMs = ms per rival song;
//     GG.ui.rivalHold = true freezes their set's clock (tests: hold a set open on a loaded machine; v0.8).
//   Hooks: rivalWrap(wrap) (52 wrap), rivalBadge(st, listing) (56 board), rivalCardNote(st, card) (52 card), rivalEnd(st)
//     (52 end), gigTarget(gig) (55 gig bar). ui.who('wraith_frontman' | 'tw_*') resolves to the rival's cast.
// testids: laptop-tab-scene, scene-panel, scene-rival, scene-record, scene-heat, scene-next, scene-board, scene-row-<id>,
//   scene-news, scene-showdowns, scene-lineup, scene-albums · sd-card, btn-sd-enter, btn-sd-pass, btn-sd-ok, btn-sd-board ·
//   rival-set, rs-score, rs-song-<i>, rs-banner, btn-rs-skip, btn-rs-go · rival-verdict, rv-verdict-head, btn-verdict-done ·
//   wrap-rival, wrap-crack, board-stolen, board-defended, board-festival, card-rival, gig-target, end-final.
// v0.9 (GENRES): every rival (Tundra Wraith, Mall Rats, Chartbusters, Buckle & Boot). Their copy comes from the cast
//   (content rivalry.cast[rid]: ui { heatLabels[5], vehicleLine, emptyNews, emptyAlbums, pass, enter, finalWin, finalLose,
//   solo, finish, crack { breakup|rebrand|opener: text | [head, text] } }, banter { open, mid, final }, style?, actions?,
//   drummer?, faceStyle?), else Tundra Wraith's v0.6 lines (TW_UI, only for Tundra Wraith) or neutral {rival} lines.
//   ui.who resolves any cast id and 'rival_frontman' / 'wraith_frontman'; faces are drawn per rival (corpse paint only when
//   the cast says so: .rv-face.corpse|cap|scarf|hat|plain, CSS in 00_shell); the spectator set plays the rival's genre
//   (and style, e.g. Chartbusters' 'ballad'), with one silhouette per member; Mall Rats kickflip once a set.
(function (GG) {
  var ui = GG.ui, el = ui.el, btn = ui.btn, U = GG.util, C = GG.contracts;
  var WPY = C.WEEKS_PER_YEAR;
  function S() { return GG.state; }
  function RV() { return GG.rival; }
  function on(st) { st = st || S(); return !!(RV() && st && st.rival); }
  function fill(t, vars) {   // vars first ({city} {venue} {rival} {name} {soloist}...), then the career + v0.9 tokens (ui.fill)
    var st = S(); if (!t) return '';
    t = String(t).replace(/\{(\w+)\}/g, function (a, k) { return vars && vars[k] != null ? String(vars[k]) : k === 'rival' && st && RV() ? RV().name(st) : a; });
    return st ? ui.fill(t, st) : t;
  }
  function sfx(n) { if (GG.audio && GG.audio.sfx) GG.audio.sfx(n); }
  function views() { return ui.showdownViews != null ? !!ui.showdownViews : !ui.gigAutoplay; }
  function wk(w) { return 'Y' + (Math.floor((w - 1) / WPY) + 1) + ' W' + ((w - 1) % WPY + 1); }
  function bandName(st) { var b = GG.career.band(st); return (b && b.name) || 'You'; }
  var ERA = { garage: 'Garage', local: 'Local heroes', signed: 'Signed', world: 'World stage' };
  var SET_KINDS = { botb: 1, festival: 1, final: 1 };
  var TITLES = { botb: 'Battle of the Bands', sameNight: 'Same night, same town', stolenSlot: 'Slot stolen', festival: 'Festival clash',
    loonies: 'The Loonies', poach: 'The poach', final: 'The Sad Dome' };
  function texts(kind) { var c = GG.content.rivalry; return (c && c.showdowns && c.showdowns[kind]) || {}; }
  function title(kind) { return texts(kind).title || TITLES[kind] || kind; }
  function icon(kind) { return texts(kind).icon || '⚔️'; }

  /* ---- Heat, faces, people ------------------------------------------------------------------------------------ */
  // Tundra Wraith's v0.6 copy (the default for their cast until content carries it) and the neutral set for any rival.
  var TW_UI = {
    heatLabels: ['Polite', 'Frosty', 'Heated', 'Boiling (politely)', 'Blood feud, with fruit baskets'],
    emptyNews: 'Nothing yet. Gord is drafting a press release about how excited he is to meet you.',
    emptyAlbums: 'No records yet. They are "finalizing the liner-note footnotes".',
    pass: 'You sit this one out. {rival} send a card: "Next time, buddy!"',
    finalWin: 'The Sad Dome is yours. Gord already sent a fruit basket the size of a Zamboni.',
    finalLose: 'Gord hugs you in the loading bay. "You were great, buddy. Really." He means it. That is the worst part.',
    solo: 'Sheila "Hexenfrost" Wiebe: a solo. She apologizes to her amp after.',
    finish: '{rival} finish. Gord thanks the sound tech by name. Your turn.',
    crack: { breakup: ['They broke up.', 'An indefinite hiatus "to focus on tax season". Gord called you personally. He was crying.'],
      rebrand: ['They rebranded.', 'Same four accountants, same minivan, new name: {rival}. There is a forty-slide deck.'],
      opener: ['They want to open for you.', 'Gord ran the numbers: you are the bigger draw. They will bring the veggie tray.'] },
    banter: {
      open: ['Gord: "Good evening, {city}! Please note the fire exits. Now: ETERNAL WINTER."', 'Gord: "Hello {city}! We are {rival}. Hydrate, buddies."'],
      mid: ['Gord: "Give it up for {band}, eh? Real good kids."', 'Sheila apologizes to her amp for the last song.', 'Darryl hands the front row tax-tip pamphlets.',
        'Lorne checks the metronome app. 3% fast. Unacceptable.', 'Gord: "This one is about the wind chill. Dress in layers."'],
      final: ['Gord: "Calgary! We brought a veggie tray for all nineteen thousand of you."'] }
  };
  var ANY_UI = {
    heatLabels: ['Polite', 'Frosty', 'Heated', 'Boiling', 'Blood feud'],
    emptyNews: 'Nothing yet. {rival} are "working on something big".',
    emptyAlbums: 'No records yet. {rival} are "in the studio". Allegedly.',
    pass: 'You sit this one out. {rival} post about it anyway.',
    finalWin: 'The Sad Dome is yours. {rival} open for you. Forever.',
    finalLose: '{rivalFront} waves at you from the headliner’s side of the stage. You open. Forever.',
    solo: '{soloist}: a solo.',
    finish: '{rival} finish. Your turn.',
    crack: { breakup: ['They broke up.', '{rival} split "to pursue other projects". Their fans need a new band.'],
      rebrand: ['They rebranded.', 'Same people, new name: {rival}. The press release has a font.'],
      opener: ['They want to open for you.', 'You are the bigger draw now. {rival} will open. Politely.'] },
    banter: { open: ['{rivalFront}: "Hello {city}! We are {rival}!"'], mid: ['{rivalFront}: "Give it up for {band}! Real nice kids."', '{rivalFront} points at the crowd. The crowd points back.'],
      final: ['{rivalFront}: "Calgary! This one is for everybody in the cheap seats."'] }
  };
  function castOf(st) { try { return RV() && st ? RV().cast(st) : null; } catch (e) { return null; } }
  function rid(st) { var rv = st && on(st) ? RV().get(st) : null, b = st ? GG.career.band(st) : null; return (rv && rv.id) || (b && b.rival) || null; }
  // One piece of the rival's UI copy: cast.ui[key] (or cast[key] for banter), else Tundra Wraith's default, else neutral.
  function copy(st, key) {
    var c = castOf(st), u = c && c.ui, v = u && u[key] != null ? u[key] : key === 'banter' && c && c.banter ? c.banter : null;
    if (v != null) return v;
    return (rid(st) === 'tundra_wraith' ? TW_UI : ANY_UI)[key];
  }
  // Tokens the rival copy uses on top of ui.fill: {soloist} = the rival's soloist, full name.
  function rivalSoloist(st) {
    var line = on(st) ? RV().lineup(st) : [], m = line.filter(function (x) { return /lead|guitar|fiddle/i.test(x.role || ''); })[0] || line[1] || line[0];
    return m ? (m.fullName || m.name) : 'Their guitarist';
  }
  function heatLabel(h) {
    var L = copy(S(), 'heatLabels'); L = Array.isArray(L) && L.length >= 5 ? L : ANY_UI.heatLabels;
    return L[h < 20 ? 0 : h < 40 ? 1 : h < 60 ? 2 : h < 80 ? 3 : 4];
  }
  function heatColor(h) { return h < 20 ? '#6fb3ff' : h < 40 ? '#9ec8ff' : h < 60 ? '#ffb347' : h < 80 ? '#ff7a3c' : '#ff4a4a'; }
  function heatMeter(h, delta, testid) {
    return el('div.rv-heat', { testid: testid || null }, [
      el('div.rv-heat-top', [el('span.caps', 'Rivalry heat'), el('b', { style: { color: heatColor(h) } }, heatLabel(h) + ' · ' + Math.round(h)
        + (delta ? ' ' + (delta > 0 ? '▲' : '▼') + Math.abs(Math.round(delta)) : ''))]),
      el('div.rv-heat-bar', el('i', { style: { width: U.clamp(h, 0, 100) + '%' } }))]);
  }
  // The rival's avatar: a little face per rival style (Tundra Wraith: corpse paint; Mall Rats: a sponsor cap; Chartbusters:
  // aviators + the scarf; Buckle & Boot: a cowboy hat). cast.faceStyle overrides; a member without corpse paint in a
  // corpse-paint band (none yet) gets a plain face.
  var FACE_STYLE = { tundra_wraith: 'corpse', mall_rats: 'cap', chartbusters: 'scarf', buckle_and_boot: 'hat' };
  function faceStyle(st, m) {
    var c = castOf(st), s = (c && c.faceStyle) || FACE_STYLE[rid(st)] || 'plain';
    if (m && m.corpsePaint) return 'corpse';
    if (m && s === 'corpse' && m.corpsePaint === false) return 'plain';
    return s;
  }
  function face(size, label, m) { return el('div.rv-face.' + faceStyle(S(), m) + (size ? '.' + size : ''), { 'aria-hidden': 'true' }, [el('i'), el('i'), label ? el('span', label) : null]); }
  function castMember(st, id) {
    var c = castOf(st);
    return c && (c.members || []).filter(function (m) { return m.id === id; })[0] || null;
  }
  // ui.who knows the rival's people: 'rival_frontman' / 'wraith_frontman' (the Monday cards' speaker) is the frontman, and
  // any cast member id (tw_*, mr_*, cb_*, bb_*, ...) resolves with the rival's name, the member's role and day job.
  var baseWho = ui.who;
  ui.who = function (id, state) {
    var st = state || S();
    if (st && id && on(st)) {
      var c = castOf(st), fm = id === 'rival_frontman' || id === 'wraith_frontman', m = c ? castMember(st, fm ? c.frontman : id) : null;
      if (m) {
        var full = m.fullName || m.name, parts = String(full).split(' ');
        var col = m.corpsePaint ? '#ecebe6' : (m.stageShirt && m.stageShirt !== '#101014' ? m.stageShirt : m.look && m.look.shirt) || '#c9a0ff';
        var who = { id: id, name: m.nick ? parts[0] + ' "' + m.nick + '" ' + parts.slice(1).join(' ') : full, short: m.name || parts[0], nick: m.nick || '',
          color: col, full: full, role: RV().name(st) + ' · ' + (m.role || '') + (m.dayJob ? ' · ' + m.dayJob.replace(/\s*\(.*\)$/, '').toLowerCase() : '') };
        who.text = m.corpsePaint ? '#ecebe6' : ui.readable ? ui.readable(who.color) : who.color;
        return who;
      }
    }
    return baseWho(id, state);
  };
  function record(st) { var r = RV().record(st); return el('div.rv-record', { testid: 'scene-record' }, [
    el('div', [el('span.caps', bandName(st)), el('b.you', String(r.you))]), el('span.vs', 'vs'),
    el('div', [el('span.caps', RV().name(st)), el('b.them', String(r.them))])]); }

  /* ======================================================================================================
     The laptop Scene tab
     ====================================================================================================== */
  function sec(text, testid, kids) { return el('div', { testid: testid || null }, [el('div.caps', { style: 'margin:14px 0 6px' }, text)].concat(kids)); }
  function nextPanel(st) {
    var R = RV(), nx = R.next(st), p = nx.pending, fin = st.finalShowdown, rows = [];
    if (p && p.kind !== 'poach') rows.push(el('div.rv-next', [el('span.ic', icon(p.kind)), el('div.grow', [el('b', 'This week: ' + title(p.kind)),
      el('div.tiny.dim', (p.venue || '') + (p.city ? ', ' + p.city : '') + (p.status === 'offered' ? ' · you haven\'t answered' : p.status === 'passed' ? ' · you passed' : p.status === 'done' ? ' · settled' : ''))])]));
    if (fin) rows.push(el('div.rv-next.final' + (fin.won ? '.won' : ''), [el('span.ic', '🏟️'), el('div.grow', [el('b', fin.won ? 'You headlined the Sad Dome. Forever.' : (fin.rival || R.name(st)) + ' headlined the Sad Dome. You opened.'),
      el('div.tiny.dim', 'Year 10: you ' + fin.score + ' · them ' + fin.rivalScore)])]));
    else if (nx.final && nx.final.reachable && nx.final.inWeeks >= 0) rows.push(el('div.rv-next', [el('span.ic', '🏟️'), el('div.grow', [el('b', nx.final.inWeeks === 0 ? 'The Sad Dome: this week' : 'The Sad Dome in ' + nx.final.inWeeks + ' week' + (nx.final.inWeeks === 1 ? '' : 's')),
      el('div.tiny.dim', 'Calgary, ' + wk(nx.final.week) + '. One co-bill decides who headlines and who opens. Forever.')])]));
    rows.push(el('div.tiny.dim', { style: 'margin-top:6px' }, 'Showdown odds this week: ~' + Math.round(nx.chance * 100) + '% (heat drives it)'));
    return el('div.panel', { testid: 'scene-next' }, rows);
  }
  ui.scenePanel = function (st) {
    if (!on(st)) return el('p.dim', 'No rivals yet. Enjoy it while it lasts.');
    var R = RV(), rv = R.get(st), c = R.cast(st) || {}, out = [];
    var tags = [rv.cracked ? el('span.tag.rv-crack', { rebrand: 'rebranded', breakup: 'broken up', opener: 'your openers' }[rv.cracked] || rv.cracked) : null,
      rv.label ? el('span.tag', (GG.content.labels && GG.content.labels[rv.label] && GG.content.labels[rv.label].name) || rv.label) : null];
    out.push(el('div.panel.rv-hero', { testid: 'scene-rival' }, [
      el('div.row', [face('lg'), el('div.grow', [el('div.rv-name', rv.name), rv.formerName ? el('div.tiny.dim', 'formerly ' + rv.formerName) : null,
        el('div.small.dim', [rv.city, rv.genre, ERA[rv.era] || rv.era].filter(Boolean).join(' · ')), el('div', { style: 'margin-top:4px' }, tags)])]),
      el('div.stat-grid', [el('div', [el('span.caps', 'Fans'), el('b', U.fmtNum(rv.fans))]), el('div', [el('span.caps', 'Buzz'), el('b', String(Math.round(rv.buzz)))]),
        el('div', [el('span.caps', 'Set'), el('b', '~' + R.skill(st))])]),
      record(st),
      vehicleLine(st, c) ? el('p.tiny.dim', { testid: 'scene-vehicle', style: 'margin:8px 0 0' }, vehicleLine(st, c)) : null]));
    out.push(el('div.panel', { style: 'margin-top:10px' }, heatMeter(R.heat(st), 0, 'scene-heat')));
    out.push(el('div', { style: 'margin-top:10px' }, nextPanel(st)));
    var board = R.leaderboard(st, 10);
    out.push(sec('The scene · by fans', 'scene-board', [el('div.panel.rv-board', board.map(function (r) {
      var tr = r.trend || 0;
      return el('div.rv-row' + (r.you ? '.you' : '') + (r.rival ? '.rival' : ''), { testid: 'scene-row-' + r.id }, [el('span.rk', '#' + r.rank),
        ui.rivalLogo ? ui.rivalLogo(r.you ? 'you' : r.id, r.name, 34, { badge: 'round', testid: 'scene-logo-' + r.id }) : null,   // v0.8.1: every band's logo
        el('div.grow', [el('b', r.name + (r.you ? ' (you)' : '')), el('div.tiny.dim', [r.city, r.era ? ERA[r.era] || r.era : r.genre].filter(Boolean).join(' · ') + (r.cracked ? ' · cracked' : ''))]),
        el('div.fans', [U.fmtNum(r.fans), el('span.tr' + (tr > 0 ? '.up' : tr < 0 ? '.down' : ''), tr > 0 ? ' ▲' : tr < 0 ? ' ▼' : ' ·')])]);
    }))]));
    var news = (rv.news || []).filter(function (n) { return n && ui.safeLine(n.text, null, st); }).slice(-8).reverse();   // v0.9: the leak net
    out.push(sec('Scene news', 'scene-news', [el('div.panel.rv-news', news.length ? news.map(function (n) {
      return el('div.rv-news-row', [el('span.tiny.dim', wk(n.week)), el('div', fill(n.text))]);
    }) : el('p.small.dim', fill(copy(st, 'emptyNews'))))]));
    var sds = (st.showdowns || []).slice(-6).reverse();
    if (sds.length) out.push(sec('Showdowns', 'scene-showdowns', [el('div.panel', sds.map(function (x) {
      return el('div.rv-sd', [el('span.wl' + (x.won ? '.w' : '.l'), x.won ? 'W' : 'L'), el('div.grow', [el('b', icon(x.kind) + ' ' + title(x.kind)),
        el('div.tiny.dim', wk(x.week) + (x.name ? ' · ' + x.name : '') + (x.kind === 'poach' || x.kind === 'stolenSlot' || x.kind === 'loonies' ? '' : ' · you ' + x.you + ' · them ' + x.them))])]);
    }))]));
    out.push(sec('Lineup', 'scene-lineup', [el('div.panel', R.lineup(st).map(function (m) {
      var cm = castMember(st, m.id);
      return el('div.rv-mem', [face('sm', null, m), el('div.grow', [el('b', (m.fullName || m.name) + (m.nick ? ' "' + m.nick + '"' : '')),
        el('div.tiny.dim', [m.role, cm && cm.dayJob].filter(Boolean).join(' · ')),
        cm && cm.gags && cm.gags.length ? el('div.tiny', { style: 'margin-top:2px' }, cm.gags[(st.totalWeek + m.id.length) % cm.gags.length]) : null]),
        m.defector ? el('span.tag.rv-crack', 'ex-yours') : null]);
    }))]));
    var albums = (rv.albums || []).slice().reverse();
    out.push(sec('Their records', 'scene-albums', [el('div.panel', albums.length ? albums.map(function (a) {
      return el('div.rv-alb', [el('span', '💿'), el('div.grow', [el('b', a.title), el('div.tiny.dim', wk(a.released) + (a.critic ? ' · critics ' + a.critic : ''))]),
        el('span.small', a.peak ? '#' + a.peak : '—')]);
    }) : el('p.small.dim', fill(copy(st, 'emptyAlbums'))))]));
    return el('div', { testid: 'scene-panel' }, out);
  };
  function vehicleLine(st, c) {
    var u = c && c.ui && c.ui.vehicleLine;
    if (u) return fill(u);
    var v = c && (c.minivan || c.vehicle);
    return v ? fill('{rivalFront} drives ' + v + '.') : null;
  }
  // v0.9: the Sad Dome is in Calgary: the drive is from your home (Regina ~760 km, Edmonton ~300, Swift Current ~390).
  function sadDomeLine(st) {
    var W = GG.world, km = null;
    try { km = W && W.km ? W.km(W.home(st), 'calgary') : null; } catch (e) { km = null; }
    var d = ui.driverOf(st), who = d.you ? 'You have the keys.' : d.name + (ui.isSilent(d.id, st) ? ' is already in the van.' : ' is warming up the van.');
    return 'Booked for Saturday: ' + (km ? U.fmtNum(km) + ' km to Calgary. ' : 'Calgary. ') + who;
  }

  /* ======================================================================================================
     Monday: the showdown announcement
     ====================================================================================================== */
  var announced = {};
  function thisWeeks(st, kind) { return (st.showdowns || []).filter(function (x) { return x.week === st.totalWeek && x.kind === kind; })[0] || null; }
  function splitPreview(st) {
    var k = RV().cfg(), yb = st.buzz || 0, rb = RV().get(st).buzz || 0, share = (yb + 10) / (yb + rb + 20);
    return { share: Math.round(share * 100), keep: Math.round((1 - k.sameNight.split * (1 - share)) * 100), yb: Math.round(yb), rb: Math.round(rb) };
  }
  // Shows this week's showdown once (after the Monday card). Returns true when a screen opened. Autoplay: a toast.
  ui.announceShowdown = function (st, force) {
    st = st || S();
    if (!on(st) || st.phase !== 'plan') return false;
    var p = RV().pending(st);
    if (!p || p.kind === 'poach' || p.status === 'missed' || (announced[p.id] && !force)) return false;
    announced[p.id] = true;
    if (!views()) { ui.toast(icon(p.kind) + ' ' + title(p.kind) + (p.venue ? ': ' + p.venue : ''), { who: RV().name(st) }); return false; }
    // deferred: this often runs from the Monday card's onClose, and a screen opened there would be popped with it
    Promise.resolve().then(function () { if (GG.state === st && st.phase === 'plan' && !ui.isOpen('showdown')) ui.show('showdown', {}); });
    return true;
  };
  ui.define('showdown', {
    kind: 'sheet', cls: 'rvsd',
    build: function (s) {
      var st = S(); if (!on(st)) return;
      var R = RV(), p = R.pending(st), kind = p ? p.kind : 'botb', set = R.showdown(st, kind), rv = R.get(st);
      s.setTitle(set.title, 'YEAR ' + st.year + ' · WEEK ' + st.week + ' · ' + rv.name.toUpperCase());
      var body = [el('div.rv-sd-head', [ui.rivalLogo ? ui.rivalLogo(rv.id, rv.name, 64, { badge: 'round', testid: 'sd-logo-them' }) : face('lg'), el('div.grow', [el('div.rv-name', rv.name), el('div.small.dim', rv.city + ' · heat ' + Math.round(rv.heat) + ' · you ' + R.record(st).you + '–' + R.record(st).them)]),
        ui.bandLogo ? ui.bandLogo(st, 64, { badge: 'round', testid: 'sd-logo-you' }) : el('span.rv-sd-ic', set.icon || icon(kind))]), el('p.card-text', { testid: 'sd-card' }, fill(set.text))];   // v0.8.1: both logos
      if (set.stakes && kind !== 'stolenSlot') body.push(el('div.rv-stakes', [el('span.caps', 'Stakes'), el('b', set.stakes)]));
      if (SET_KINDS[kind]) body.push(el('div.line-list.panel', [
        el('div', [el('span', 'Their set strength'), el('span', '~' + set.expected)]),
        el('div', [el('span', 'Their setlist'), el('span', set.setlist.length + ' songs')]),
        el('div', [el('span', 'Running order'), el('span', 'They go first')])]));
      if (kind === 'sameNight') {
        var sp = splitPreview(st);
        body.push(el('div.panel.rv-split', [el('div.caps', 'The split, if you play that night'),
          el('div.rv-split-bar', [el('i.you', { style: { width: sp.share + '%' } }, 'You ' + sp.share + '%'), el('i.them', { style: { width: (100 - sp.share) + '%' } }, (100 - sp.share) + '%')]),
          el('p.small.dim', { style: 'margin:6px 0 0' }, 'Buzz ' + sp.yb + ' vs ' + sp.rb + '. Book a gig this weekend and you keep about ' + sp.keep + '% of your crowd. More buzz, more room.')]));
      }
      var done = kind === 'stolenSlot' ? thisWeeks(st, 'stolenSlot') : null;
      if (done) body.push(el('div.quote' + (done.won ? '.rv-good' : ''), fill((done.lines || [])[0] || (done.won ? 'The booker kept you.' : 'They took it.'))));
      if (kind === 'festival') body.push(el('p.small.dim', 'It\'s on the gig board this week. Book it with a Book block.'));
      if (kind === 'final') body.push(el('p.small.dim', { testid: 'sd-final-drive' }, sadDomeLine(st)));
      ui.append(s.body, body);
      function close() { ui.close(s.id); GG.main.sync(); }
      if (kind === 'botb' && p && p.status === 'offered' && st.offer && st.offer.showdown) {
        ui.append(s.foot, el('div.row', [
          btn('.btn.grow', { testid: 'btn-sd-pass', onclick: function () { R.pass(S()); ui.toast(fill(copy(st, 'pass'))); close(); } }, set.pass || 'Sit this one out'),
          btn('.btn.primary.grow', { testid: 'btn-sd-enter', onclick: function () { if (R.enter(S())) { sfx('card'); ui.toast(fill('Entered. The whiteboard says: BATTLE. {front} has underlined it four times.')); } close(); } }, set.enter || 'Enter the battle')]));
        return;
      }
      if (kind === 'festival' && ui.openBoard) s.foot.appendChild(btn('.btn.block', { testid: 'btn-sd-board', onclick: function () { close(); ui.openBoard({ mode: 'view' }); } }, 'See the gig board'));
      s.foot.appendChild(btn('.btn.primary.big.block', { testid: 'btn-sd-ok', onclick: close }, kind === 'final' ? fill('Load {van}') : 'Noted'));
    },
    onShow: function () { sfx('card'); }
  });

  /* ---- Monday card strip for the rival's cards (poach / crack / Sad Dome eve) ---- */
  ui.rivalCardNote = function (st, card) {
    if (!card || !/^rv_/.test(card.id || '') || !on(st)) return null;
    var R = RV(), r = R.record(st), kids = [face('sm'), el('div.grow', [el('b', R.name(st)), el('div.tiny.dim', 'Heat ' + Math.round(R.heat(st)) + ' · you ' + r.you + ' · them ' + r.them)])];
    if (card.id === 'rv_poach' && st.card && st.card.who) {
      var m = (st.members || []).filter(function (x) { return x.id === st.card.who; })[0];
      if (m) kids.push(el('div.rv-mood', [el('span.tiny.dim', ui.who(m.id).short + "'s mood"), ui.bar(m.mood, 100, { color: ui.moodColor(m.mood) })]));
    }
    return el('div.rv-card-note', { testid: 'card-rival' }, kids);
  };

  /* ======================================================================================================
     Board badges (56_ui_board)
     ====================================================================================================== */
  ui.rivalBadge = function (st, l) {
    if (!l) return null;
    if (l.stolen && !l.stolen.defended) return el('span.gb-open.rv-stolen', { testid: 'board-stolen' }, '📌 Stolen by ' + l.stolen.by);
    if (l.stolen) return el('span.gb-open.rv-defended', { testid: 'board-defended' }, '🛡 ' + l.stolen.by + ' tried. The booker kept you.');
    if (l.showdown && l.showdown.kind === 'festival') return el('span.gb-open.rv-fest', { testid: 'board-festival' }, '🎪 Festival clash · ' + (l.headliner || 'your rival') + ' headline · you: ' + (l.slot || 'an early slot'));
    return null;
  };

  /* ======================================================================================================
     The rival's set (spectator view)
     ====================================================================================================== */
  function banterPool(st, key) {
    var b = copy(st, 'banter') || {}, a = Array.isArray(b[key]) && b[key].length ? b[key] : (rid(st) === 'tundra_wraith' ? TW_UI : ANY_UI).banter[key];
    return a && a.length ? a : ANY_UI.banter[key];
  }
  function pick(a, i) { return a[Math.abs(i) % a.length]; }
  function rivalGenre(st) { var rv = RV().get(st), d = GG.content.rivals && GG.content.rivals[rv.id]; return rv.genre || (d && d.genre) || 'metal'; }
  function rivalStage(st, gig) {
    var R = RV(), rv = R.get(st), line = R.lineup(st), drum = line.filter(function (m) { return /drum/i.test(m.role || ''); })[0], c = castOf(st) || {};
    var hired = !drum && c.drummer ? c.drummer : null;   // v0.9: Buckle & Boot's session guy (never the player)
    return { venue: Object.assign({}, GG.gig.venue(gig.venueId) || {}, gig), crowd: GG.gig.expectCrowd ? GG.gig.expectCrowd(st, gig) : gig.capacity, capacity: gig.capacity,
      genre: rivalGenre(st), flags: {}, player: st.player, rival: true, rivalId: rv.id, view: 'spectator', banner: rv.name, sub: rv.city,
      members: line.filter(function (m) { return m !== drum; }).map(function (m) {
        return { id: m.id, name: m.name, role: m.role, mood: 85, look: m.look, corpsePaint: m.corpsePaint === true, stageShirt: m.stageShirt };   // v0.9: paint only when the cast says so
      }),
      drummer: drum ? { id: drum.id, look: drum.look, corpsePaint: drum.corpsePaint === true, stageShirt: drum.stageShirt }
        : hired ? { id: hired.id || 'session_drummer', name: hired.name || 'the session guy', look: hired.look || null, corpsePaint: false, stageShirt: hired.stageShirt, hired: true } : null };
  }
  function stageApi() { var R = GG.render; return GG.main && GG.main.renderOk && R && R.available && R.stage && typeof R.stage.setup === 'function' ? R.stage : null; }
  var V = null;   // the spectator session
  function songPattern(song, i) {
    try {
      var p = GG.songs.generate(V.genre || 'metal', GG.RNG(GG.hashSeed(song.title + '|' + i)), {});   // v0.9: the rival's genre
      if (p) p.bpm = U.clamp(song.bpm || p.bpm, 60, 240);
      return p;
    } catch (e) { return null; }
  }
  ui.watchRival = function (gig, next) {
    var st = S(); if (!st || !on(st)) { next(); return; }
    var kind = gig.showdown && gig.showdown.kind || 'botb', set = RV().showdown(st, kind);
    if (V) stopWatch();
    var c0 = castOf(st) || {}, rid0 = rid(st);
    V = { gig: gig, set: set, kind: kind, next: next, i: -1, t: 0, songT: 0, ms: ui.rivalSongMs || 5200, raf: 0, last: 0, step: -1, handle: null,
      scores: set.setlist.map(function () { return null; }), shown: 0, moment: false, solo: false, stage: false, dom: null, ended: false,
      genre: rivalGenre(st), style: c0.style || (rid0 === 'chartbusters' ? 'ballad' : null), singer: c0.frontman || null, rid: rid0,
      actions: (c0.actions || (rid0 === 'mall_rats' ? ['kickflip'] : [])).filter(function (a) { return (C.RIVAL_ACTIONS || []).indexOf(a) >= 0; }), acted: false };
    // v0.9 (§4.4): the sim's showdown(kind).actions [{ song, at (0..1), action, who }] say when; else once in their first song
    V.acts = (Array.isArray(set.actions) && set.actions.length ? set.actions : V.actions.map(function (a) { return { song: 0, at: 0.55, action: a, who: null }; }))
      .filter(function (a) { return a && (C.RIVAL_ACTIONS || []).indexOf(a.action) >= 0; })
      .map(function (a) { return { song: Math.min(Math.max(0, a.song | 0), set.setlist.length - 1), at: +a.at || 0.55, action: a.action, who: a.who || null, done: false }; });
    ui.show('rival-set', {});
    var api = stageApi();
    if (api) {
      try { V.stage = GG.render.setScene('stage') !== false; if (V.stage) api.setup(rivalStage(st, gig)); } catch (e) { console.error('[rival] stage setup failed', e); V.stage = false; }
    }
    if (V.dom) V.dom.back.hidden = V.stage;
    frameStage();
    startSong(0);
    V.last = performance.now();
    document.addEventListener('visibilitychange', onVisible);
    V.raf = requestAnimationFrame(tick);
  };
  // Their set runs on wall time, like the gig clock (v0.5.1): every frame counts in full, so each song lasts V.ms and their
  // drummer stays on the audio at any frame rate (a 0.1 s cap per frame played the set in slow motion below 10 fps: a
  // 4.5 s set took 20 s+ at ~3 fps). Time away doesn't count: no frames and the audio is suspended while the app is
  // hidden, and the clock re-bases when it comes back. V.t = seconds of their set played (debug 'rivalui' clock).
  function onVisible() { if (V && !V.ended && !document.hidden) V.last = performance.now(); }
  function frameStage() {
    requestAnimationFrame(function () {
      if (!V || !V.stage || !V.dom || !stageApi()) return;
      var H = window.innerHeight || 844;
      stageApi().setFrame({ top: Math.round(V.dom.bar.getBoundingClientRect().bottom), bottom: Math.round(H - V.dom.panel.getBoundingClientRect().top) });
    });
  }
  function banner(text) {
    if (!V || !V.dom) return;
    var b = V.dom.banner; b.textContent = text; b.className = 'rs-banner show';
    clearTimeout(V.bannerT); V.bannerT = setTimeout(function () { if (V && V.dom) V.dom.banner.className = 'rs-banner'; }, 2400);
  }
  function vars() { var p = V.set.venue || {}; return { city: p.city || (V.gig && V.gig.city) || '', venue: p.name || '', rival: V.set.rival.name }; }
  function startSong(i) {
    V.i = i; V.songT = 0; V.moment = false; V.step = -1;
    var song = V.set.setlist[i];
    V.pattern = songPattern(song, i);
    if (GG.audio && GG.audio.play && V.pattern) {   // v0.9: their genre (+ style, e.g. the power ballad) and their singer (the audio's vocal voice)
      // rival: their singer and the genre's own solo (never the player's soloist, even in the same genre)
      var ao = { genre: V.genre, loop: true, singer: V.singer, rival: V.rid, band: V.rid };
      if (V.style) ao.style = V.style;
      try { V.handle = GG.audio.play(V.pattern, ao); } catch (e) { V.handle = null; }
    }
    var st = S(), pool = banterPool(st, i === 0 ? (V.kind === 'final' ? 'final' : 'open') : 'mid');
    banner(ui.cap(fill(pick(pool, st.totalWeek + i * 3), vars())));
  }
  function stopAudio() { if (V && V.handle) { try { if (V.handle.playing) V.handle.stop(); } catch (e) { /* ignore */ } V.handle = null; } }
  function stopWatch() { if (!V) return; stopAudio(); if (V.raf) cancelAnimationFrame(V.raf); clearTimeout(V.bannerT); V.raf = 0; document.removeEventListener('visibilitychange', onVisible); }
  function tick(now) {
    if (!V || V.ended) return;
    var dt = document.hidden || ui.rivalHold ? 0 : Math.max(0, (now - V.last) / 1000); V.last = now;   // rivalHold: tests freeze their set
    V.t += dt; V.songT += dt * 1000;
    var song = V.set.setlist[V.i], u = Math.min(1, V.songT / V.ms), api = V.stage ? stageApi() : null;
    V.scores[V.i] = Math.round(song.score * (u < 0.92 ? u / 0.92 : 1));
    if (api) {
      api.setCrowdLevel(U.clamp(25 + (song.score - 40) * 1.1 * Math.min(1, u * 1.6), 5, 98));
      if (V.pattern) {   // their drummer plays the pattern (16ths at the song's tempo)
        var spb = 60 / (V.pattern.bpm || 180), step = Math.floor(V.songT / 1000 / (spb / 4)), arr = V.pattern.arrangement || ['verse'];
        if (step !== V.step) {
          V.step = step;
          var sec = V.pattern.sections[arr[Math.floor(step / 16) % arr.length]] || [], s16 = step % 16;
          for (var l = 0; l < sec.length; l++) if (sec[l] && sec[l][s16] === 'x') api.hit(l, 'perfect');
        }
      }
      if (!V.moment && u > 0.5) { V.moment = true; api.moment(song.score >= 55 ? 'lighters' : 'drinks'); }   // no pits: they'd run through the riser camera
      if (!V.solo && V.i === 1 && u > 0.3) { V.solo = true; api.bandAction(null, 'solo'); banner(fill(copy(S(), 'solo'), { soloist: rivalSoloist(S()) })); }
      for (var ai = 0; ai < V.acts.length; ai++) {   // v0.9 (§4.4): Mall Rats' sponsor-mandated kickflip, where the sim put it
        var act = V.acts[ai];
        if (act.done || V.i !== act.song || u <= act.at) continue;
        act.done = true; V.acted = true;
        var aw = act.who || V.singer;
        try { api.bandAction(aw, act.action); } catch (e) { /* the stage may not know it yet */ }
        GG.emit('gig:band', { id: aw, who: aw, action: act.action, rival: V.rid });
        banner(ui.cap(fill(act.action === 'kickflip' ? '{rivalFront} kickflips. The sponsor is watching.' : '{rivalFront} goes big.')));
      }
    }
    updateScores();
    if (V.songT >= V.ms) {
      stopAudio();
      if (V.i + 1 < V.set.setlist.length) startSong(V.i + 1);
      else { finishWatch(false); return; }
    }
    V.raf = requestAnimationFrame(tick);
  }
  function setScore() {
    var done = V.scores.filter(function (x) { return x != null; });
    if (!done.length) return 0;
    var sum = 0; done.forEach(function (x) { sum += x; });
    return Math.round(sum / V.set.setlist.length);
  }
  function updateScores() {
    if (!V.dom) return;
    V.dom.score.textContent = String(V.ended ? V.set.score : setScore());
    V.set.setlist.forEach(function (s, i) {
      var r = V.dom.rows[i]; if (!r) return;
      r.sc.textContent = V.scores[i] != null ? String(V.scores[i]) : '—';
      r.row.className = 'rs-song' + (i === V.i && !V.ended ? ' on' : V.scores[i] != null ? ' done' : '');
    });
  }
  function finishWatch(skipped) {
    if (!V) return;
    V.ended = true; stopAudio();
    V.scores = V.set.setlist.map(function (s) { return s.score; });
    updateScores();
    if (skipped) { goYourSet(); return; }
    render();
    banner(fill(copy(S(), 'finish'), vars()));
  }
  function goYourSet() {
    if (!V) return;
    var next = V.next;
    stopWatch(); V = null;
    ui.close('rival-set');
    next();
  }
  function render() { var e = ui.get('rival-set'); if (e) e.rerender(); }
  ui.define('rival-set', {
    kind: 'full', cls: 'rvset', sticky: true, live3d: true,
    build: function (s) {
      if (!V) return;
      var set = V.set, d = V.dom = { rows: [] }, st = S();
      var sil = set.rival.members || [], paint = sil.filter(function (m) { return m.corpsePaint; }).length * 2 > sil.length;   // v0.9: one per member, paint only if they wear it
      d.back = el('div.rs-back', [el('div.rs-sil.' + (paint ? 'corpse' : faceStyle(st)), { testid: 'rs-sil', data: { n: String(sil.length) } },
        Array.apply(null, Array(Math.max(1, Math.min(6, sil.length)))).map(function () { return el('i'); }))]);
      d.back.hidden = !!V.stage;
      d.score = el('b', { testid: 'rs-score' }, '0');
      d.bar = el('div.rs-bar', [ui.rivalLogo ? ui.rivalLogo(set.rival.id, set.rival.name, 44, { badge: 'round', testid: 'rs-logo' }) : null, el('div.grow', [el('div.caps', icon(V.kind) + ' ' + set.title + (set.venue && set.venue.name && set.venue.name !== set.title ? ' · ' + set.venue.name : '')),
        el('b.rs-who', set.rival.name + (V.ended ? ' are done' : ' are on'))]), el('div.rs-score', [el('span.caps', 'Their set'), d.score])]);
      d.banner = el('div.rs-banner', { testid: 'rs-banner' });
      var rows = set.setlist.map(function (song, i) {
        var sc = el('span.sc', '—'), row = el('div.rs-song', { testid: 'rs-song-' + i }, [el('span.n', String(i + 1)), el('div.grow', [el('b', song.title), el('div.tiny.dim', song.bpm + ' bpm')]), sc]);
        d.rows.push({ row: row, sc: sc });
        return row;
      });
      var names = set.rival.members.map(function (m) { return (m.nick || m.name) + (m.defector ? ' (ex-' + bandName(st) + ')' : ''); }).join(' · ');
      d.panel = el('div.rs-panel', [el('div.rs-ph', [el('span.caps', 'Their set · expected ~' + set.expected), el('span.tiny.dim', 'heat ' + Math.round(set.rival.heat))]),
        el('div.rs-songs', rows), el('div.tiny.dim.rs-names', names),
        V.ended ? btn('.btn.primary.big.block', { testid: 'btn-rs-go', onclick: goYourSet }, 'Your turn. Beat ' + set.score + ' →')
          : btn('.btn.block', { testid: 'btn-rs-skip', onclick: function () { finishWatch(true); } }, 'Skip their set ▸▸')]);
      ui.append(s.body, [d.back, d.bar, d.banner, d.panel]);
      updateScores();
      frameStage();
    },
    onClose: function () { if (V) { stopWatch(); V = null; } }
  });
  // The live gig's top bar shows the score to beat on a set showdown (55_ui_gig hook).
  ui.gigTarget = function (g) {
    var st = S();
    if (!g || !g.showdown || !SET_KINDS[g.showdown.kind] || !on(st)) return null;
    return el('span.rs-target', { testid: 'gig-target' }, 'Beat ' + RV().setScore(st, g.showdown.kind));
  };

  /* ======================================================================================================
     The showdown weekend: their set -> your set -> the verdict
     ====================================================================================================== */
  ui.playShowdown = function (gig, done, opts) {
    opts = opts || {};
    var st = S(), kind = gig && gig.showdown && gig.showdown.kind, v = views();
    function mine() {
      ui.playGig(gig, function (res) {
        var sd = (res && res.showdown) || (S() && S().lastGig && S().lastGig.showdown) || null;
        if (v && sd && on()) ui.showVerdict(sd, function () { done(res); });
        else done(res);
      });
    }
    if (kind && SET_KINDS[kind] && v && !opts.resume && on(st)) ui.watchRival(gig, mine);
    else mine();
  };
  ui.showVerdict = function (sd, done) { ui.show('rival-verdict', { sd: sd, done: done }); sfx(sd.won ? 'cheer' : 'boo'); };
  var VERDICT_ANY = { won: ['The crowd picks you. {rival} take it well. Publicly.'], lost: ['The crowd picks {rival}. {grumbler} has notes. Several pages.'] };
  ui.define('rival-verdict', {
    kind: 'full', cls: 'rvverdict', sticky: true,
    build: function (s, d) {
      var st = S(), sd = d.sd || {}, R = RV(), fin = sd.kind === 'final', split = sd.kind === 'sameNight', rv = st && on(st) ? R.get(st) : null;
      s.root.classList.toggle('won', !!sd.won);
      var head = fin ? (sd.won ? 'You headline. Forever.' : 'You open. Forever.') : split ? (sd.won ? 'The scene picked you' : 'The scene picked them') : sd.won ? 'You win!' : (sd.rival || 'They') + ' win';
      var you = split ? sd.you + '%' : String(sd.you), them = split ? sd.them + '%' : String(sd.them);
      var chips = [];
      if (sd.prize) chips.push(el('span.rv-chip.good', '+' + U.fmtMoney(sd.prize) + ' prize'));
      if (sd.fansSwing) chips.push(el('span.rv-chip' + (sd.fansSwing > 0 ? '.good' : '.bad'), U.signed(sd.fansSwing) + ' fans' + (sd.kind === 'botb' ? (sd.fansSwing > 0 ? ' (theirs)' : ' (to them)') : '')));
      if (split && sd.crowdLost) chips.push(el('span.rv-chip.bad', sd.crowdLost + ' went to their show'));
      if (sd.heatDelta) chips.push(el('span.rv-chip', 'Heat ' + U.signed(Math.round(sd.heatDelta))));
      ui.append(s.body, el('div.rv-verdict', { testid: 'rival-verdict' }, [
        el('div.caps.center', icon(sd.kind) + ' ' + title(sd.kind) + (sd.name && sd.name !== title(sd.kind) ? ' · ' + String(sd.name).replace(/^Battle of the Bands @ /, '') : '')),
        el('h1.display.rv-vh', { testid: 'rv-verdict-head' }, head),
        el('div.rv-board2', [
          el('div.side.you' + (sd.won ? '.win' : ''), [st && ui.bandLogo ? ui.bandLogo(st, 56, { badge: 'round', testid: 'rv-logo-you' }) : null, el('span.caps', st ? bandName(st) : 'You'), el('b', you)]),   // v0.8.1: logos
          el('span.vs', 'vs'),
          el('div.side.them' + (sd.won ? '' : '.win'), [rv && ui.rivalLogo ? ui.rivalLogo(rv.id, rv.name, 56, { badge: 'round', testid: 'rv-logo-them' }) : face('sm'), el('span.caps', sd.rival || (rv && rv.name) || 'Them'), el('b', them)])]),
        split ? el('p.small.dim.center', 'Same night, same town: the crowd split on buzz.') : el('p.small.dim.center', split ? '' : 'The crowd decides. Loudly.'),
        el('div.rv-chips', chips),
        el('div.stack.tight', (sd.lines || []).map(function (t) {   // v0.9: a line about another rival's people reads neutral
          return el('div.quote' + (sd.won ? '.rv-good' : ''), ui.safeLine(fill(t), sd.won ? VERDICT_ANY.won : VERDICT_ANY.lost, st));
        })),
        rv ? el('div.panel', { style: 'margin-top:10px' }, [record(st), el('div', { style: 'margin-top:8px' }, heatMeter(rv.heat))]) : null,
        fin ? el('p.center.rv-forever', ui.cap(fill(copy(st, sd.won ? 'finalWin' : 'finalLose')))) : null
      ]));
      s.foot.appendChild(btn('.btn.primary.big.block', { testid: 'btn-verdict-done', onclick: function () { var cb = d.done; ui.close(s.id); if (cb) cb(); } }, 'Wrap up the week'));
    }
  });

  /* ======================================================================================================
     Wrap, end
     ====================================================================================================== */
  function crackText(st, kind) {
    var C0 = copy(st, 'crack') || {}, v = C0[kind], d = (rid(st) === 'tundra_wraith' ? TW_UI : ANY_UI).crack[kind] || ['They cracked.', ''];
    return Array.isArray(v) ? v : typeof v === 'string' ? [d[0], v] : d;
  }
  ui.rivalWrap = function (w) {
    var st = S(), x = w && w.rival;
    if (!x || !on(st)) return [];
    var out = [], sds = x.showdowns || [];
    if (x.cracked) {
      var cr = crackText(st, x.cracked);
      out.push(el('div.panel.rv-crackpanel', { testid: 'wrap-crack' }, [el('div.row', [face('lg'), el('div.grow', [el('div.caps', RV().get(st).formerName || RV().name(st)),
        el('div.display.rv-cr', cr[0]), el('div.small', fill(cr[1]))])])]));
    }
    if (!x.news.length && !sds.length && !x.heatBuzz && !x.final) return out;
    var rows = [];
    sds.forEach(function (sd) { rows.push(el('div.rv-sd', [el('span.wl' + (sd.won ? '.w' : '.l'), sd.won ? 'W' : 'L'), el('div.grow', el('b', icon(sd.kind) + ' ' + title(sd.kind) + (sd.name ? ' · ' + sd.name : '')))])); });
    x.news.forEach(function (t) { var tx = ui.safeLine(fill(t), null, st); if (tx) rows.push(el('div.rv-news-row', [el('span', '📰'), el('div', tx)])); });
    if (x.heatBuzz) rows.push(el('div.tiny.dim', 'The rivalry is good for business: buzz +' + x.heatBuzz + ' (for them too).'));
    out.push(el('div.panel.rv-wrap', { testid: 'wrap-rival' }, [el('div.row', { style: 'margin-bottom:6px' }, [face('sm'), el('div.grow', el('b', RV().name(st))),
      el('span.small', { style: { color: heatColor(x.heat) } }, 'Heat ' + Math.round(x.heat) + (x.heatDelta ? ' ' + (x.heatDelta > 0 ? '▲' : '▼') + Math.abs(Math.round(x.heatDelta)) : ''))])].concat(rows)));
    return out;
  };
  ui.rivalEnd = function (st) {
    var f = st && st.finalShowdown;
    if (!f) return null;
    return el('div.panel.rv-next.final' + (f.won ? '.won' : ''), { testid: 'end-final' }, [el('span.ic', '🏟️'), el('div.grow', [
      el('b', f.won ? 'You headlined the Sad Dome. ' + (f.rival || 'They') + ' opened. Forever.' : (f.rival || 'They') + ' headlined the Sad Dome. You opened. Forever.'),
      el('div.tiny.dim', 'You ' + f.score + ' · them ' + f.rivalScore + (on(st) ? ' · head-to-head ' + RV().record(st).you + '–' + RV().record(st).them : ''))])]);
  };

  GG.registerDebug('rivalui', function () {
    return { views: views(), watching: !!V, song: V ? V.i : -1, ended: V ? V.ended : null, stage: V ? V.stage : null, clock: V ? V.t : null, announced: Object.keys(announced) };
  });
})(window.GG);
