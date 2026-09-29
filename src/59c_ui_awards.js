// 59c_ui_awards.js: v0.5 "Signed" — what happens after a release, and the Loonie Awards.
//   Reviews reveal (one outlet at a time: score in the outlet's own scale + a comedic pull quote), the Maple 100 chart
//   view (your entry among parody neighbours, sales, streams, cert progress, recoup), cert moments (gold / platinum),
//   the trophy shelf sheet, the albums list for the laptop, and the Loonies ceremony: 3D red carpet (GG.render.carpet)
//   → Marcel's outfit card → envelopes on the podium (Tundra Wraith thank you personally when they beat you) → speech.
//   GG.ui.showReviews(albumId, done) ; showChart(albumId) ; showCert(albumId, level, done) ; albumsPanel(state) -> node ;
//   playLoonies(done) ; GG.ui.v5.fmtScore(outletId, score) -> { text, norm }.
//   Screens: 'reviews' (full), 'chart' (sheet, tall), 'cert' (modal), 'album' (sheet, tall), 'trophies' (sheet),
//   'loonies' (full, live3d), 'loonie-card' (sheet: outfit / speech).
//   testids: review-<i>, review-score-<i>, btn-review-next, btn-reviews-done, chart-row-<pos>, chart-you, chart-stats,
//   cert-disc, btn-cert-ok, album-<id>, btn-book-studio, btn-open-studio, trophy-<i>, loonies-phase, btn-carpet-next,
//   btn-head-inside, envelope, btn-envelope, winner, wraith-thanks, btn-award-next, btn-speech, loonie-choice-<i>,
//   btn-loonie-card-ok, loonies-summary, btn-loonies-done.
// Sim calls (guarded): labels.chartView, loonies, openEnvelope, outfit, speech.
(function (GG) {
  var ui = GG.ui, el = ui.el, btn = ui.btn, U = GG.util, C = GG.contracts, V = ui.v5;
  function S() { return GG.state; }
  function album(id, st) { st = st || S(); var a = st && st.albums || []; for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i]; return id == null ? a[a.length - 1] || null : null; }
  V.album = album;
  function albumFill(t, a) {
    t = String(t || '').replace(/\{album\}/g, a ? a.title : 'the album').replace(/\{single\}/g, a && a.single ? V.songTitle(a.single) : 'the single');
    return V.fill(t);
  }
  function thumb(a, size, cls) { return V.coverCanvas(a.cover || {}, { title: a.title, band: V.bandName(), size: size || 160 }, cls || 'thumb'); }

  /* ---- Scores in each outlet's own scale ------------------------------------------------------------------------ */
  V.fmtScore = function (outletId, score) {
    var o = V.outletDef(outletId), sc = o.scale || 10, v = +score || 0;
    if (sc < 100 && v > sc) v = v / 100 * sc;               // the sim gave 0..100: convert
    var norm = U.clamp(v / sc, 0, 1), text;
    if (sc === 5) {
      var n = Math.round(v), unit = o.unit || (outletId === 'tailgate_weekly' ? 'hats' : 'stars');
      text = unit === 'stars' ? '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n)
        : (n ? new Array(n + 1).join(unit === 'skulls' ? '💀' : '🤠') : '0') + ' / 5';
    } else if (sc === 100) text = Math.round(v) + '/100';
    else text = o.decimals ? v.toFixed(o.decimals) : Math.round(v) + '/10';
    return { text: text, norm: norm, outlet: o };
  };
  function quoted(q) { q = String(q || '').trim(); return /^[“"‘']/.test(q) ? q : '“' + q + '”'; }
  function num(n) { return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function scoreClass(n) { return n >= 0.75 ? 'great' : n >= 0.55 ? 'good' : n >= 0.35 ? 'meh' : 'awful'; }

  /* ======================================================================================================
     Reviews
     ====================================================================================================== */
  var BAND_REACT = {
    great: { marcel: ['Pitchspork understood the cape. Finally, the press is ready.'], dana: ['They called my solo "unhinged". I am framing it.'], any: ['We are CRITICALLY ACCLAIMED. Someone tell my guidance counsellor.'] },
    meh: { marcel: ['Mixed. Like a good poutine. I choose to be flattered.'], jaxon: ['My baba read them all. She says the critics are "soft in the head".'], any: ['Some liked it! Some were wrong!'] },
    awful: { marcel: ['I will be writing letters. In French. Long ones.'], kenji: ['(Kenji prints the worst review and pins it to the wall. Motivation.)'], any: ['At least they spelled the band name right. Mostly.'] }
  };
  ui.showReviews = function (albumId, done) {
    var a = album(albumId); if (!a || !(a.reviews || []).length) { if (done) setTimeout(done, 0); return null; }
    return ui.show('reviews', { albumId: a.id, shown: 1, done: done });
  };
  ui.define('reviews', {
    kind: 'full', cls: 'reviews',
    build: function (s, d) {
      var a = album(d.albumId); if (!a) return;
      var revs = a.reviews || [], n = Math.min(d.shown || 1, revs.length);
      ui.append(s.body, el('div.rev-head', [thumb(a, 160, 'thumb'), el('div.grow', [el('div.caps', 'The reviews are in'), el('h2.display', a.title),
        el('div.small.dim', V.bandName() + ' · ' + (a.kind === 'album' ? 'Album' : 'EP') + ' · ' + (a.tracks || []).length + ' songs')])]));
      var sum = 0;
      for (var i = 0; i < n; i++) {
        var r = revs[i], f = V.fmtScore(r.outlet, r.score); sum += f.norm;
        s.body.appendChild(el('div.review.' + r.outlet + (i === n - 1 ? '.rv' : ''), { testid: 'review-' + i }, [
          el('div.row', [el('div.outlet-name', f.outlet.name), el('div.grow'), el('div.rev-score.' + scoreClass(f.norm), { testid: 'review-score-' + i }, f.text)]),
          el('p.pull', quoted(albumFill(r.quote || '…', a)))
        ]));
      }
      if (n < revs.length) {
        s.foot.appendChild(btn('.btn.primary.big.block', { testid: 'btn-review-next', onclick: function () { V.sfx('tap'); s.rerender(Object.assign({}, d, { shown: n + 1 })); setTimeout(function () { s.body.scrollTop = s.body.scrollHeight; }, 0); } },
          'Next review (' + (revs.length - n) + ' left) ▸'));
        return;
      }
      var avg = revs.length ? sum / revs.length : 0, band = avg >= 0.7 ? 'great' : avg >= 0.45 ? 'meh' : 'awful';
      s.body.appendChild(el('div.panel.warm', { style: 'margin-top:4px' }, [el('div.row', [el('span.grow.caps', 'Critics’ average'), el('b.big-num', { style: 'font-size:24px' }, Math.round(avg * 100) + '%')]),
        V.react(V.memberLine(band === 'great' ? ['marcel', 'dana'] : band === 'meh' ? ['jaxon', 'marcel'] : ['kenji', 'marcel'], BAND_REACT[band]))]));
      s.foot.appendChild(btn('.btn.primary.big.block', { testid: 'btn-reviews-done', onclick: function () { ui.close(s.id); } }, a.chart && a.chart.pos ? 'Check the Maple 100 ▸' : 'Back to it'));
    },
    onClose: function (s) {
      var d = s.data || {}, a = album(d.albumId);
      if (d.chain !== false && a && a.chart && a.chart.pos && !d.noChart) setTimeout(function () { ui.showChart(a.id, d.done); }, 0);
      else if (d.done) setTimeout(d.done, 0);
    }
  });

  /* ======================================================================================================
     The Maple 100
     ====================================================================================================== */
  var NEIGHBOURS = ['Chartbusters', 'Buckle & Boot', 'Mall Rats', 'Tundra Wraith', 'DJ Poutine', 'The Snowplows', 'Maple Syrup Riot', 'Kayla & the Kettle Chips',
    'Northern Lites', 'Hosers Anonymous', 'Two-Four', 'The Zamboni Drivers', 'Gord & the Gords', 'Lil Toque', 'The Flatlanders', 'Sadie Hawkins Rodeo'];
  var NSONGS = ['Tailgate Heart', 'Hockey Mom', 'Cold Plunge', 'Timbit Love', 'Freezer Burn', 'Double-Double', 'Snow Day', 'Loonie Bin', 'Northern Nights',
    'Pothole Season', 'Canoe Song', 'Rink Rat', 'Down at the Legion', 'Mosquito Summer', 'Block Heater', 'Prairie Dog'];
  function chartRows(st, a) {
    var x = V.call('chartView', st, a.id);
    if (x && Array.isArray(x.rows) && x.rows.length) return x;
    var pos = a.chart && a.chart.pos, rng = GG.RNG(GG.hashSeed([st.seed, a.id, st.totalWeek, 'chart'].join('|'))), rows = [];
    if (!pos) return { rows: [], week: st.totalWeek };
    var lo = Math.max(1, pos - 3), hi = Math.min(100, lo + 6);
    for (var p = lo; p <= hi; p++) {
      if (p === pos) { rows.push({ pos: p, title: a.single ? V.songTitle(a.single) : a.title, artist: V.bandName(st), move: a.chart.weeks <= 1 ? 'new' : rng.int(-4, 6), weeks: a.chart.weeks || 1, you: true }); continue; }
      var art = NEIGHBOURS[rng.int(0, NEIGHBOURS.length - 1)];
      rows.push({ pos: p, title: NSONGS[rng.int(0, NSONGS.length - 1)], artist: art, move: rng.next() < 0.15 ? 'new' : rng.int(-9, 9), weeks: rng.int(1, 30) });
    }
    return { rows: rows, week: st.totalWeek };
  }
  ui.showChart = function (albumId, done) { var a = album(albumId); if (!a) { if (done) setTimeout(done, 0); return null; } return ui.show('chart', { albumId: a.id, done: done }); };
  function certBar(a) {
    var units = a.sales || 0, next = a.cert === 'platinum' ? null : a.cert === 'gold' ? C.CERT.platinum : C.CERT.gold;
    return el('div', [el('div.kv.wide', [el('span', next ? (a.cert === 'gold' ? 'To platinum' : 'To gold') : 'Platinum'), ui.bar(units, next || units || 1, { color: a.cert === 'gold' || !next ? '#e8e8f0' : '#e8c547' }),
      el('b', next ? U.fmtNum(units) + ' / ' + U.fmtNum(next) : '💿')])]);
  }
  ui.define('chart', {
    kind: 'sheet', tall: true, title: 'The Maple 100',
    build: function (s, d) {
      var st = S(), a = album(d.albumId); if (!st || !a) return;
      var ch = a.chart || {}, view = chartRows(st, a);
      s.setTitle('The Maple 100', 'CANADA’S OFFICIAL-ISH CHART · ' + V.weekLabel(view.week || st.totalWeek).toUpperCase());
      s.body.appendChild(el('div.maple-logo', [el('span', '🍁'), el('b', 'MAPLE 100'), el('span.tiny', 'as heard in Tim’s')]));
      if (view.rows.length) s.body.appendChild(el('div.chart-list', view.rows.map(function (r) {
        var mv = r.move === 'new' ? el('span.mv.new', 'NEW') : r.move > 0 ? el('span.mv.up', '▲' + r.move) : r.move < 0 ? el('span.mv.down', '▼' + (-r.move)) : el('span.mv', '–');
        return el('div.chart-row' + (r.you ? '.you' : ''), { testid: r.you ? 'chart-you' : 'chart-row-' + r.pos }, [el('span.pos', String(r.pos)), el('div.grow', [el('b', r.title), el('div.tiny', r.artist)]), mv, el('span.tiny.dim.wk', r.weeks + ' wk')]);
      })));
      else s.body.appendChild(el('div.panel', { testid: 'chart-you' }, [el('b', 'Not in the Maple 100. Yet.'), el('p.small.dim', 'Somewhere around #140. Your mom bought eleven copies. Two were for the dentist.')]));
      s.body.appendChild(el('div.stat-grid', { testid: 'chart-stats' }, [
        el('div', [el('span.caps', 'Debut'), el('b', ch.debut ? '#' + ch.debut : '—')]), el('div', [el('span.caps', 'Peak'), el('b', ch.peak ? '#' + ch.peak : '—')]),
        el('div', [el('span.caps', 'Weeks'), el('b', String(ch.weeks || 0))]), el('div', [el('span.caps', 'Units'), el('b', U.fmtNum(a.sales || 0))]),
        el('div', [el('span.caps', 'Streams'), el('b', U.fmtNum(a.streams || 0))]), el('div', [el('span.caps', 'Earned'), el('b', U.fmtMoney(a.earned || 0))])
      ]));
      s.body.appendChild(certBar(a));
      if (st.label && !st.label.dropped && st.label.labelId !== 'diy' && st.label.advance) {
        var rec = Math.min(st.label.advance, st.label.recouped || 0);
        s.body.appendChild(el('div.kv.wide', [el('span', 'Recouped'), ui.bar(rec, st.label.advance, { color: 'var(--amber)' }), el('b', rec >= st.label.advance ? 'Paid off' : Math.round(rec / st.label.advance * 100) + '%')]));
      }
      setTimeout(function () { var you = s.body.querySelector('.chart-row.you'); if (you && you.scrollIntoView) you.scrollIntoView({ block: 'center' }); }, 0);   // your row in view
      s.foot.appendChild(btn('.btn.primary.block', { testid: 'btn-chart-ok', onclick: function () { ui.close(s.id); } }, 'Nice'));
    },
    onClose: function (s) { if (s.data && s.data.done) setTimeout(s.data.done, 0); }
  });

  /* ======================================================================================================
     Cert moment + trophies + albums
     ====================================================================================================== */
  ui.showCert = function (albumId, level, done) { var a = album(albumId); if (!a) { if (done) setTimeout(done, 0); return null; } V.sfx('cheer'); return ui.show('cert', { albumId: a.id, level: level || a.cert || 'gold', done: done }); };
  ui.define('cert', {
    kind: 'modal', sticky: true,
    title: function (d) { return d.level === 'platinum' ? 'Platinum!' : 'Gold!'; },
    build: function (s, d) {
      var a = album(d.albumId); if (!a) return;
      var plat = d.level === 'platinum';
      ui.append(s.body, [
        el('div.cert-disc.' + (plat ? 'platinum' : 'gold'), { testid: 'cert-disc' }, [el('div.cert-label', thumb(a, 160, 'label-art'))]),
        el('p.center', [el('b', '“' + a.title + '”'),  ' is certified ' + (plat ? 'PLATINUM' : 'GOLD') + ': ' + num(plat ? C.CERT.platinum : C.CERT.gold) + ' units in Canada.']),
        el('p.small.dim.center', plat ? 'Your mom has told the neighbours, the mail carrier and a stranger at Costco.' : 'Marcel wants to wear it. As a medallion. He is measuring the chain.')
      ]);
      s.foot.appendChild(btn('.btn.primary.block', { testid: 'btn-cert-ok', onclick: function () { ui.close(s.id); } }, 'Hang it on the wall'));
    },
    onClose: function (s) { if (s.data && s.data.done) setTimeout(s.data.done, 0); }
  });
  var TROPHY_ICON = { gold: '📀', platinum: '💿', loonie: '🪙', banned: '🚫' };
  ui.define('trophies', {
    kind: 'sheet', title: 'Trophy shelf',
    build: function (s) {
      var st = S(); if (!st) return;
      var list = (st.trophies || []).slice(), banned = (st.banned || []).slice();
      s.setTitle('Trophy shelf', (list.length + banned.length) + ' THINGS · 1 BOWLING TROPHY (NOT YOURS)');
      if (!list.length && !banned.length) s.body.appendChild(el('p.dim', { style: 'padding:10px 0 20px' }, 'A bowling trophy (not yours), a participation ribbon and a lot of dust. Room to grow.'));
      list.forEach(function (t, i) {
        s.body.appendChild(el('div.trophy-row', { testid: 'trophy-' + i }, [el('span.ti', TROPHY_ICON[t.kind] || '🏆'), el('div.grow', [el('b', V.fill(t.title || t.kind)), el('div.tiny.dim', (t.kind || '') + (t.year ? ' · year ' + t.year : ''))])]));
      });
      if (banned.length) {
        s.body.appendChild(el('div.caps', { style: 'margin:12px 0 6px' }, 'Wall of shame (banned venues)'));
        banned.forEach(function (id) { var v = GG.gig && GG.gig.venue ? GG.gig.venue(id) : null; s.body.appendChild(el('div.trophy-row', [el('span.ti', '🚫'), el('div.grow', [el('b', v ? v.name : id), el('div.tiny.dim', v ? v.city : '')])])); });
      }
      s.foot.appendChild(btn('.btn.block', { onclick: function () { ui.close(s.id); } }, 'Close'));
    }
  });
  ui.albumsPanel = function (st) {
    var out = [], ses = st.session, can = V.canRecord ? V.canRecord(st) : { ep: false, album: false };
    if (ses) out.push(el('div.panel.warm', [el('div.row', [el('span', { style: 'font-size:24px' }, '🎙'), el('div.grow', [el('b', 'In the studio: ' + V.studioDef(ses.studioId).name),
      el('div.tiny.dim', 'Week ' + Math.min((ses.weeksDone || 0) + 1, ses.weeksTotal) + ' of ' + ses.weeksTotal + ' · ' + (ses.tracks || []).length + ' songs')]),
      btn('.btn.small', { testid: 'btn-open-studio', onclick: function () { ui.openStudio(); } }, 'Open')])]));
    else out.push(btn('.btn.block' + (can.ep || can.album ? '.primary' : ''), { testid: 'btn-book-studio', onclick: function () { ui.openStudioBooking(); } }, can.ep || can.album ? 'Book a studio 🎙' : 'Studio (locked)'));
    var albums = (st.albums || []).slice().reverse();
    out.push(el('div.caps', { style: 'margin:14px 0 6px' }, 'Discography (' + albums.length + ')'));
    if (!albums.length) out.push(el('p.dim.small', 'No releases yet. The demo on Jaxon’s phone does not count, no matter what he says.'));
    var pend = V.call('pending', st);
    if (pend && pend.status === 'recorded' && !V.call('inSession', st)) out.push(
      btn('.btn.primary.block', { testid: 'btn-plan-release', style: 'margin-top:8px', onclick: function () { ui.openRelease(); } }, 'Plan the release 💿'));
    albums.forEach(function (a) {
      var ch = a.chart || {}, out2 = a.status ? a.status !== 'released' : a.released > st.totalWeek;
      if (a.status === 'recorded') return;
      out.push(btn('.album-row', { testid: 'album-' + a.id, onclick: function () { ui.show('album', { albumId: a.id }); } }, [thumb(a, 160, 'mini'),
        el('div.grow', [el('b', a.title), el('div.tiny.dim', (a.kind === 'album' ? 'Album' : 'EP') + ' · ' + (out2 ? 'out ' + V.weekLabel(a.releaseWeek || a.released) : V.weekLabel(a.released))),
          el('div.tiny', out2 ? 'Coming soon' : (ch.peak ? 'Peak #' + ch.peak + ' · ' : '') + U.fmtNum(a.sales || 0) + ' units' + (a.cert ? ' · ' + a.cert.toUpperCase() : ''))])]));
    });
    return el('div', out);
  };
  ui.define('album', {
    kind: 'sheet', tall: true, title: 'Album',
    build: function (s, d) {
      var st = S(), a = album(d.albumId); if (!st || !a) return;
      s.setTitle(a.title, ((a.kind === 'album' ? 'ALBUM' : 'EP') + ' · ' + V.weekLabel(a.released)).toUpperCase());
      s.body.appendChild(el('div.cover-big', thumb(a, 320, 'big')));
      s.body.appendChild(el('div.panel', (a.tracks || []).map(function (id, i) { return el('div.rel-row.static', [el('span.rel-n', String(i + 1)), el('div.grow', el('b', V.songTitle(id))), a.single === id ? el('span.tag.gold', '★ single') : null]); })));
      if ((a.reviews || []).length) s.body.appendChild(el('div', { style: 'margin-top:10px' }, a.reviews.map(function (r) { var f = V.fmtScore(r.outlet, r.score); return el('div.line-list', el('div', [el('span', f.outlet.name), el('span', f.text)])); })));
      if (a.chart && a.chart.pos != null || a.sales) s.body.appendChild(btn('.btn.block', { style: 'margin-top:12px', onclick: function () { ui.showChart(a.id); } }, 'Maple 100 & sales'));
    }
  });

  /* ======================================================================================================
     The Loonie Awards
     ====================================================================================================== */
  var CAT_FALLBACK = {
    breakthrough: { name: 'Breakthrough Group of the Year' }, album: { name: '{genre} Album of the Year' }, single: { name: 'Single of the Year' },
    live: { name: 'Best Live Act' }, fan_choice: { name: 'Fan Choice' }, worst_van: { name: 'Worst Van', blurb: 'Presented by Kal’s Mufflers. Nobody wants this one.' }
  };
  function catDef(id) {
    var c = V.awards().categories, d = null, st = S();
    if (c) d = Array.isArray(c) ? c.filter(function (x) { return x && x.id === id; })[0] : c[id];
    d = Object.assign({}, CAT_FALLBACK[id] || { name: id }, d || {});
    var g = st && st.genre ? st.genre.charAt(0).toUpperCase() + st.genre.slice(1) : 'Metal';
    d.name = String(d.name || id).replace('{genre}', g);
    return d;
  }
  function lines(key, fb) { var a = V.awards(), x = a[key]; return Array.isArray(x) && x.length ? x : fb; }
  var FB = {
    banter: ['Our next presenter drove in from Moose Jaw. Please welcome him. He is very nervous.', 'Before we open this one: the parking lot is towing. Enjoy the show!',
      'This category was decided by a panel of experts and one guy named Doug.'],
    wraith: ["Wow. Wow! We just want to thank {band}. Seriously, buddy. You guys pushed us. Fruit baskets for everyone!",
      'First, we want to thank {band}, who deserved this just as much. Okay, a little less. But still! Love you guys!'],
    carpet: [{ who: 'reporter', text: 'Who are you wearing tonight?' }, { who: 'marcel', text: 'The cape. The cape is wearing me.' },
      { who: 'reporter', text: 'Any predictions?' }, { who: 'jaxon', text: 'My baba predicts we lose to the corpse-paint guys. She is usually right.' }],
    outfit: { id: 'loonie_outfit', title: 'What Is Marcel Wearing?', speaker: 'marcel',
      text: 'Marcel emerges from the van in something. The photographers are already pointing. He asks your opinion, and he will not accept it.',
      textCape: 'Marcel has had the cape dry-cleaned, starched and ironed into a shape. It stands up by itself. He asks what you think.',
      choices: [
        { label: 'The full cape, obviously', outfit: 'cape', effects: { buzz: 4, mood: { marcel: 6 } }, outcome: 'Forty flashes a second. A fashion blog calls it "prairie Dracula". Marcel prints it out.' },
        { label: 'A tux. Please. Just once.', outfit: 'tux', effects: { mood: { marcel: -5 }, chemistry: 2 }, outcome: 'He wears the tux. He wears the cape over the tux. It is a compromise.' },
        { label: 'Matching band jumpsuits', outfit: 'jumpsuit', effects: { buzz: 6, chemistry: 3, fund: -60 }, outcome: 'Five orange jumpsuits. Someone asks if you are the Zamboni crew. You say yes.' }
      ] },
    speech: [
      { label: 'Thank your mom', hint: 'Classic. Safe. Moms cry.', effects: { fans: 40, mood: { all: 3 } }, outcome: 'Your mom stands up in row 40 and waves with both arms. The whole room waves back.' },
      { label: 'Thank the moose', hint: 'Marcel will love it', effects: { buzz: 8, mood: { marcel: 5 } }, outcome: '"And the moose. Without the moose, none of this." Silence. Then a standing ovation from Manitoba.' },
      { label: 'Take a shot at Tundra Wraith', hint: 'Gamble: the room might turn', effects: { buzz: 12, fans: -20 }, outcome: 'You go for it. Tundra Wraith laugh the loudest and send you a fruit basket before you leave the stage.' }
    ]
  };
  function nominations(st) {
    var x = V.call('loonies', st);
    var list = x && Array.isArray(x.noms) ? x.noms : Array.isArray(x) ? x : (st.awards || []).filter(function (a) { return a && a.year === st.year && a.nominated; });
    return list.filter(function (a) { return a && a.nominated !== false; });
  }
  function winnerOf(aw, st) {
    if (aw.won) return V.bandName(st);
    if (aw.winner) return aw.winner;
    var ag = aw.against || [];
    return ag.indexOf('Tundra Wraith') >= 0 ? 'Tundra Wraith' : ag[0] || 'Tundra Wraith';
  }
  function snapshot(st) { return { fund: st.fund, fans: st.fans, buzz: st.buzz, chemistry: st.chemistry, burnout: st.burnout }; }
  function diff(a, b) { var d = {}; for (var k in a) if (typeof a[k] === 'number' && typeof b[k] === 'number' && b[k] !== a[k]) d[k] = b[k] - a[k]; return d; }
  function carpet() { var R = GG.render; return GG.main && GG.main.renderOk && R && R.available && R.carpet && (!R.sceneNames || R.sceneNames().indexOf('carpet') >= 0) ? R : null; }
  function rc(fn, a) { var R = carpet(); if (!R) return null; try { return R.carpet[fn](a); } catch (e) { console.warn('[loonies] carpet.' + fn, e); return null; } }
  function carpetSetup(st, outfit) {
    var band = GG.content.bands && GG.content.bands[st.bandId], looks = {};
    (band && band.members || []).forEach(function (m) { looks[m.id] = m.look; });
    var members = (GG.drama && GG.drama.lineup ? GG.drama.lineup(st) : (st.members || []).filter(function (m) { return m.status === 'active'; })).map(function (m) {
      return { id: m.id, name: m.name, role: m.role, look: m.look || looks[m.id] || null };
    });
    var rv = GG.content.rivals && band && GG.content.rivals[band.rival];
    rc('setup', { members: members, player: st.player, flags: st.flags || {}, outfit: outfit || null, genre: st.genre, rival: { id: rv ? rv.id : 'tundra_wraith', name: rv ? rv.name : 'Tundra Wraith' }, year: st.year });
  }
  var L = null;   // the ceremony in progress
  ui.playLoonies = function (done) {
    var st = S(); if (!st) { if (done) done(null); return null; }
    L = { done: done, noms: nominations(st), i: 0, opened: false, phase: 'carpet', line: 0, start: snapshot(st), wins: [], outfit: null, speech: false, threeD: false };
    var R = carpet();
    if (R) { try { L.threeD = R.setScene('carpet') !== false; } catch (e) { L.threeD = false; } }
    if (L.threeD) { carpetSetup(st, null); rc('setMode', 'carpet'); }
    return ui.show('loonies', {});
  };
  function keepDrawing() { if (L && L.threeD && GG.render) setTimeout(function () { try { GG.render.setPaused(false); } catch (e) { /* ignore */ } }, 0); }
  GG.on('screen:open', keepDrawing); GG.on('screen:close', keepDrawing);
  function frame(s) {
    if (!L || !L.threeD) return;
    requestAnimationFrame(function () {
      var top = s.body.querySelector('.lo-top'), card = s.body.querySelector('.lo-card');
      if (!top || !card) return;
      var H = window.innerHeight || 844;
      rc('setFrame', { top: Math.round(top.getBoundingClientRect().bottom), bottom: Math.round(H - card.getBoundingClientRect().top) });
    });
  }
  function toPhase(s, p) { L.phase = p; s.rerender({}); frame(s); }
  ui.define('loonies', {
    kind: 'full', cls: 'loonies', sticky: true, live3d: true,
    build: function (s) {
      var st = S(); if (!st || !L) return;
      var head = el('div.lo-top', [el('div.caps', 'The ' + (st.year ? 'Year ' + st.year + ' ' : '') + 'Loonie Awards'), el('div.lo-title', { testid: 'loonies-phase', data: { phase: L.phase } },
        { carpet: 'The red carpet', show: 'Inside the Loonie Dome', summary: 'After-party' }[L.phase] || '')]);
      var back = L.threeD ? null : el('div.lo-back' + (L.phase === 'carpet' ? '.carpet' : '.stage'));
      var card = el('div.lo-card');
      if (back) s.body.appendChild(back);
      s.body.appendChild(head);
      s.body.appendChild(el('div.lo-gap'));
      s.body.appendChild(card);
      if (L.phase === 'carpet') buildCarpet(s, st, card);
      else if (L.phase === 'show') buildEnvelope(s, st, card);
      else buildSummary(s, st, card);
      frame(s);
    },
    onClose: function () {
      var l = L; L = null;
      if (l && l.threeD) { try { GG.render.setScene(S() ? 'garage' : 'none'); } catch (e) { /* ignore */ } }
      if (l && l.done) setTimeout(function () { l.done({ wins: l.wins, noms: l.noms.length }); }, 0);
    }
  });
  function buildCarpet(s, st, card) {
    var seq = lines('carpet', FB.carpet), i = Math.min(L.line, seq.length);
    var shown = seq.slice(Math.max(0, i - 1), i + 1);
    ui.append(card, shown.map(function (x, k) {
      var who = typeof x === 'string' ? null : x.who, txt = V.fill(typeof x === 'string' ? x : x.text);
      if (who === 'reporter' || !who) return el('p.lo-q' + (k === shown.length - 1 ? '.rv' : ''), [el('b', 'Red-carpet reporter: '), txt]);
      if (who === 'wraith' || who === 'tundra_wraith') return el('p.lo-q.wraith', { testid: 'wraith-thanks' }, [el('b', 'Tundra Wraith: '), txt]);
      return V.react({ who: who, text: txt });
    }));
    var cer = V.awards().ceremony;
    if (i === 0 && cer && cer.venue) card.appendChild(el('p.small', 'Live from ' + cer.venue + '. Host: ' + ((cer.host && cer.host.name) || 'a former weatherman') + '.'));
    if (i === 0) card.appendChild(el('p.small.dim', 'Flashbulbs. A step-and-repeat covered in sponsors nobody has heard of. Tundra Wraith, in full corpse paint, hold the door for a seat-filler.'));
    if (i < seq.length) card.appendChild(btn('.btn.primary.block', { testid: 'btn-carpet-next', onclick: function () { L.line += 2; rc('flash', 6); s.rerender({}); frame(s); } }, i === 0 ? 'Walk the carpet 📸' : 'Keep walking ▸'));
    else if (!L.outfit) card.appendChild(btn('.btn.primary.block', { testid: 'btn-outfit', onclick: function () { openOutfit(s); } }, 'Marcel has a question…'));
    else card.appendChild(btn('.btn.primary.block', { testid: 'btn-head-inside', onclick: function () { rc('setMode', 'podium'); toPhase(s, L.noms.length ? 'show' : 'summary'); } }, 'Head inside ▸'));
  }
  function outfitCard(st) {
    var list = lines('outfits', null) || (V.awards().outfit ? [V.awards().outfit] : null) || [FB.outfit];
    var cape = st.flags && typeof st.flags.cape === 'string' && st.flags.cape !== 'none';
    var ok = list.filter(function (c) { return c.cape == null || !!c.cape === cape; });
    var c = ok[0] || list[0];
    return Object.assign({}, c, { text: cape && c.textCape ? c.textCape : c.text });
  }
  function openOutfit(s) {
    var st = S(), c = V.call('outfitCard', st) || outfitCard(st);
    ui.show('loonie-card', { card: c, kind: 'outfit', onPick: function (i) {
      var ch = c.choices[i], res = V.call('outfit', S(), i, c.id);   // the sim applies the effects itself
      if (res === undefined && ch.effects && GG.career && GG.career.applyEffects) GG.career.applyEffects(S(), ch.effects);
      var fo = S().flags && S().flags.loonieOutfit;
      L.outfit = typeof fo === 'string' ? fo : ch.outfit || ['cape', 'tux', 'jumpsuit'][i] || 'tux';
      carpetSetup(S(), L.outfit); rc('setMode', 'carpet'); rc('flash', 10);
      V.sync();
      return res;
    }, onDone: function () { if (L) { s.rerender({}); frame(s); } } });
  }
  ui.define('loonie-card', {
    kind: 'sheet', sticky: true,
    build: function (s, d) {
      var c = d.card; if (!c) return;
      s.setTitle(d.kind === 'speech' ? 'Your speech' : 'The outfit', d.kind === 'speech' ? 'THE MIC IS ON' : 'RED CARPET');
      if (c.speaker) ui.append(s.body, el('div.card-head', [ui.avatar(ui.who(c.speaker), 'lg'), el('div.grow', [el('div.who', ui.who(c.speaker).name), el('div.role', ui.who(c.speaker).role || '')])]));
      if (c.title) s.body.appendChild(el('h3.card-title', V.fill(c.title)));
      if (c.text) s.body.appendChild(el('p.card-text', V.fill(c.text)));
      if (d.picked == null) {
        (c.choices || []).forEach(function (ch, i) {
          s.body.appendChild(btn('.choice', { testid: 'loonie-choice-' + i, onclick: function () {
            if (s.data.picked != null) return;
            var before = snapshot(S());
            s.data.picked = i;
            var res = null;
            try { res = d.onPick(i); } catch (e) { console.error('[loonies] pick failed', e); }
            s.data.res = res || null;
            s.data.deltas = res && res.deltas ? res.deltas : diff(before, snapshot(S()));
            s.rerender(s.data);
          } }, [el('span.cl', V.fill(ch.label)), el('span.ch', V.fill(ch.hint || (GG.career && GG.career.effectSummary ? GG.career.effectSummary(ch.effects, S()) : '')) || 'Who knows?')]));
        });
        return;
      }
      var chosen = c.choices[d.picked];
      ui.append(s.body, [el('div.you', ['You picked: ', el('b', V.fill(chosen.label))]), el('div.quote', V.fill((d.res && d.res.outcome) || chosen.outcome || '')), el('div', { style: 'margin-top:10px' }, ui.deltaChips(d.deltas || {}, { emptyText: 'No change' }))]);
      s.foot.appendChild(btn('.btn.primary.big.block', { testid: 'btn-loonie-card-ok', onclick: function () { ui.close(s.id); } }, 'OK'));
    },
    onClose: function (s) { if (s.data && s.data.onDone) setTimeout(s.data.onDone, 0); }
  });
  function buildEnvelope(s, st, card) {
    var aw = L.noms[L.i]; if (!aw) { toPhase(s, 'summary'); return; }
    var cat = catDef(aw.category), band = V.bandName(st);
    if (aw.name) cat.name = aw.name;
    var noms = [band].concat(aw.against || []);
    card.appendChild(el('div.caps', 'Award ' + (L.i + 1) + ' of ' + L.noms.length));
    card.appendChild(el('h3.lo-cat', cat.name));
    if (!L.opened) {
      var b = lines('banter', FB.banter);
      var pr = V.awards().presenters, who = Array.isArray(pr) && pr.length ? pr[(L.i + (st.year || 0)) % pr.length] : null;
      card.appendChild(el('p.small.dim', [who && who.name ? el('b', who.name + ': ') : null, V.fill(String(b[(L.i + (st.year || 0)) % b.length]).replace(/\{category\}/g, cat.name))]));
      card.appendChild(el('div.lo-noms', noms.map(function (n) { return el('span.chip' + (n === band ? '.you' : ''), n); })));
      card.appendChild(btn('.btn.primary.big.block.envelope', { testid: 'btn-envelope', onclick: function () {
        var res = V.call('openEnvelope', S(), aw.category);
        if (res && typeof res === 'object') { aw = L.noms[L.i] = Object.assign({}, aw, res); }
        L.opened = true;
        if (aw.won) { L.wins.push(aw.category); V.sfx('cheer'); } else V.sfx('tap');
        rc('envelope', !!aw.won); rc('flash', aw.won ? 14 : 4);
        s.rerender({}); frame(s);
      } }, '✉ Open the envelope'));
      return;
    }
    var win = winnerOf(aw, st), wraith = !aw.won && /tundra wraith/i.test(win);
    card.appendChild(el('div.lo-winner' + (aw.won ? '.won' : ''), { testid: 'winner' }, [el('span.caps', 'And the Loonie goes to…'), el('b', win)]));
    if (wraith || aw.thanks) {
      var rt = V.awards().rivalThanks, t = Array.isArray(rt) ? rt : (rt && rt.tundra_wraith) || FB.wraith;
      card.appendChild(el('p.lo-q.wraith', { testid: 'wraith-thanks' }, [el('b', win + ': '), quoted(V.fill(aw.thanks || t[(L.i + (st.year || 0)) % t.length]))]));
    } else if (!aw.won) card.appendChild(el('p.small.dim', 'You clap. Marcel claps slower. Much slower.'));
    if (aw.won && aw.rivalLine) card.appendChild(el('p.small.dim', V.fill(aw.rivalLine)));
    if (aw.won && !L.speech && aw.category !== 'worst_van') {
      card.appendChild(btn('.btn.primary.big.block', { testid: 'btn-speech', onclick: function () { openSpeech(s); } }, 'Give a speech 🎤'));
      return;
    }
    if (aw.won && aw.category === 'worst_van') card.appendChild(el('p.small', 'Kenji accepts the award in silence. The Moose Hearse honks from the parking lot. Nobody knows how.'));
    card.appendChild(btn('.btn.primary.block', { testid: 'btn-award-next', onclick: function () {
      L.i++; L.opened = false; if (L.i >= L.noms.length) { toPhase(s, 'summary'); return; }
      rc('envelope', null); s.rerender({}); frame(s);
    } }, L.i + 1 < L.noms.length ? 'Next award ▸' : 'To the after-party ▸'));
  }
  function openSpeech(s) {
    var c = V.call('speechCard', S()) || { title: 'Say something!', text: 'The mic is warm. The teleprompter says "THANK PEOPLE". Five seconds until the orchestra plays you off.', choices: lines('speeches', FB.speech) };
    ui.show('loonie-card', { card: c, kind: 'speech', onPick: function (i) {
      var ch = c.choices[i], res = V.call('speech', S(), i, c.id);   // the sim applies the effects itself
      if (res === undefined && ch.effects && GG.career && GG.career.applyEffects) GG.career.applyEffects(S(), ch.effects);
      L.speech = true; V.sync();
      return res;
    }, onDone: function () { if (L) { s.rerender({}); frame(s); } } });
  }
  function buildSummary(s, st, card) {
    var d = diff(L.start, snapshot(st)), n = L.wins.length;
    card.appendChild(el('div', { testid: 'loonies-summary' }, [
      el('h3.lo-cat', n ? n + ' Loonie' + (n > 1 ? 's' : '') + '!' : L.noms.length ? 'No Loonies this year.' : 'Not nominated.'),
      el('p.small', n ? 'The trophy is heavier than it looks, and it looks like a giant coin with a bird on it. It is going on the shelf.' : L.noms.length ? 'Tundra Wraith sent a fruit basket to your table. It had a card. It said "next year, buddy!"' : 'You came for the free shrimp. The shrimp was excellent.'),
      ui.deltaChips(d, { emptyText: 'Free shrimp' })
    ]));
    card.appendChild(btn('.btn.primary.big.block', { testid: 'btn-loonies-done', style: 'margin-top:10px', onclick: function () { ui.close(s.id); } }, 'Back to the garage'));
  }

  /* ======================================================================================================
     The wrap: label news (offers, release day, charts, certs, royalties, deadlines, drops, Loonies) + moments
     ====================================================================================================== */
  var NEWS_ICON = { offer: '📨', released: '💿', chart: '🍁', cert: '📀', royalties: '💸', deadline: '⏳', demand: '⚑', dropped: '💔', flop: '📉',
    fulfilled: '🤝', expired: '⌛', loonies: '🪙', world: '🌍', era: '⭐' };
  var autoSeen = {};
  function newsAction(n) {
    if (n.albumId && album(n.albumId) && (n.kind === 'released' || n.kind === 'flop') && (album(n.albumId).reviews || []).length)
      return btn('.btn.small', { testid: 'wrap-reviews-' + n.albumId, onclick: function () { ui.showReviews(n.albumId); } }, 'Reviews');
    if (n.albumId && album(n.albumId) && n.kind === 'chart') return btn('.btn.small', { testid: 'wrap-chart-' + n.albumId, onclick: function () { ui.showChart(n.albumId); } }, 'Chart');
    if (n.albumId && n.kind === 'cert') return btn('.btn.small', { testid: 'wrap-cert-' + n.albumId, onclick: function () { ui.showCert(n.albumId); } }, 'See it');
    if (n.kind === 'offer' && V.offers().length) return btn('.btn.small', { testid: 'wrap-offer', onclick: function () { ui.openOffers(); } }, 'Look');
    return null;
  }
  ui.labelWrap = function (w) {
    var st = S(), Lw = w && w.labels, out = [];
    if (!st) return out;
    var news = (Lw && Lw.news) || [], money = [];
    if (Lw && Lw.royalties) money.push(el('div', [el('span', 'Royalties'), el('span.good', '+' + U.fmtMoney(Lw.royalties))]));
    if (Lw && Lw.recouped) money.push(el('div', [el('span', 'Went to recoup the advance'), el('span', U.fmtMoney(Lw.recouped))]));
    if (Lw && Lw.costs) money.push(el('div', [el('span', 'Label business costs'), el('span.bad', '−' + U.fmtMoney(Math.abs(Lw.costs)))]));
    if (news.length || money.length) out.push(el('div.panel.label-news', { testid: 'wrap-label' }, [el('div.caps', { style: 'margin-bottom:4px' }, 'The music business')]
      .concat(news.map(function (n) { return el('div.news-row', [el('span.ic', NEWS_ICON[n.kind] || '•'), el('span.grow', V.fill(n.text)), newsAction(n)]); }))
      .concat(money.length ? [el('div.line-list', { style: 'margin-top:6px' }, money)] : [])));
    var pend = V.call('pending', st);
    if (pend && pend.status === 'recorded' && !V.call('inSession', st)) out.push(el('div.panel.warm', { testid: 'wrap-recorded' }, [el('div.row', [el('span', { style: 'font-size:24px' }, '🎛'),
      el('div.grow', [el('b', 'The record is in the can.'), el('div.tiny.dim', 'Order the tracks, name it, pick a cover and a release week.')]),
      btn('.btn.small.primary', { testid: 'wrap-release', onclick: function () { ui.openRelease(); } }, 'Plan it')])]));
    // Release day: the reviews (then the chart) open by themselves once; certs pop too. Not in autoplay flows.
    if (!ui.gigAutoplay) {
      var chain = [];
      news.forEach(function (n) {
        var k = w.totalWeek + '|' + n.kind + '|' + (n.albumId || '');
        if (autoSeen[k] || !n.albumId || !album(n.albumId)) return;
        if (n.kind === 'released' && (album(n.albumId).reviews || []).length) { autoSeen[k] = 1; chain.push(function (next) { ui.showReviews(n.albumId, next); }); }
        else if (n.kind === 'cert') { autoSeen[k] = 1; chain.push(function (next) { ui.showCert(n.albumId, null, next); }); }
      });
      if (chain.length) setTimeout(function run() { var f = chain.shift(); if (f && ui.isOpen('wrap')) f(function () { setTimeout(run, 0); }); }, 350);
    }
    return out;
  };
  // Loonies are due this week (the wrap runs them before endWeek).
  ui.loonieDue = function (st) {
    var lo = st && st.loonies;
    return !!(lo && lo.invited && !lo.done && lo.year === st.year && st.week === C.LOONIES_WEEK);
  };

  GG.registerDebug('uiAwards', function () {
    return { loonies: L ? { phase: L.phase, i: L.i, noms: L.noms.length, opened: L.opened, wins: L.wins.slice(), threeD: L.threeD, outfit: L.outfit } : null,
      missing: ['chartView', 'loonies', 'openEnvelope', 'outfit', 'speech'].filter(function (n) { return !V.api(n); }) };
  });
})(window.GG);
