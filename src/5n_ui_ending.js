// 5n_ui_ending.js (v1.0 "Glory", Lane E; plan_contract_1.0 §4.4): the end of a career ('end', full screen), one card at a time:
//   the Legacy count-up (end-legacy: the score + its seven parts, end-part-<id>) → the tier (end-tier) → each special ending
//   (end-special-<id>) → an epilogue card per member (end-epilogue-<id>: the final lineup, originals who left, defectors, then
//   the player's own card, end-epilogue-player) → the rival line (end-final) → the summary (end-summary: numbers, this
//   career's trophies, cosmetic unlocks; end-hof, btn-end-title). Next (end-next) or a sideways swipe moves on, Back
//   (end-back) returns, "Skip all" (end-skip) jumps to the summary; Back to title (btn-end-title) works from any card.
// An ENDED career is finished and recorded once (GG.legacy.finish → GG.achieve.finish → GG.meta.recordCareer; each one
// idempotent, so a reload shows the same ending and one Hall of Fame entry). A career still in progress (pw_flow's layout
// pass, a debug show('end')) gets a read-only preview from GG.legacy.compute: nothing is written. No share, screenshot or
// download control, ever. API: GG.ui.endGo(step) ('legacy'|'tier'|'final'|'summary'|<index>) · GG.debug('ending').
(function (GG) {
  var ui = GG.ui, el = ui.el, btn = ui.btn, U = GG.util;
  function S() { return GG.state; }

  var PART_NAME = { fans: 'Fans', units: 'Records sold', awards: 'Awards', venue: 'Biggest room headlined', regions: 'Regions broken',
    unity: 'Band unity', final: 'The Sad Dome' };
  var PART_ICON = { fans: '👥', units: '💿', awards: '🏆', venue: '🏟️', regions: '🌍', unity: '🤝', final: '👑' };
  var TIER_ICON = { arena_legends: '🏟️', canadian_institution: '🏒', cult_heroes: '🕯️', one_album_wonders: '💿', still_in_the_garage: '🚗' };
  var KIND_LABEL = { member: 'Still in the band', recruit: 'Joined along the way', gone: 'Left the band', player: 'You' };
  var last = null, unlockLog = [], timers = [];

  // Cosmetic unlocks announced as this career ended (12_meta's 'career:end' listener records it first and emits 'meta:unlock';
  // the end summary lists them). A new or loaded career starts a fresh list.
  function resetUnlocks() { unlockLog = []; }
  GG.on('career:new', resetUnlocks); GG.on('career:loaded', resetUnlocks);
  GG.on('meta:unlock', function (p) { if (p) unlockLog.push(p); });

  function css() {
    if (document.getElementById('gg-end-css')) return;
    var c = document.createElement('style'); c.id = 'gg-end-css';
    c.textContent = [
      '.full.end-seq .full-body { display: flex; flex-direction: column; gap: 12px; }',
      '.end-head { display: flex; align-items: center; gap: 10px; min-width: 0; }',
      '.end-head .logo-img { flex: 0 0 auto; border-radius: 10px; }',
      '.end-head .end-band { font: 900 18px/1.1 var(--display); text-transform: uppercase; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
      '.end-dots { display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; }',
      '.end-dots i { width: 7px; height: 7px; border-radius: 50%; background: var(--line); }',
      '.end-dots i.on { background: var(--amber); } .end-dots i.done { background: #8a6a3a; }',
      '.end-card { background: var(--bg2); border: 1px solid var(--line); border-radius: 18px; padding: 18px 16px; animation: gg-fade .2s ease-out; }',
      '.end-card .k { text-transform: uppercase; letter-spacing: .08em; font-weight: 800; font-size: 11px; color: var(--faint); }',
      '.end-card h2 { font: 900 30px/1.02 var(--display); text-transform: uppercase; margin: 6px 0 10px; overflow-wrap: anywhere; }',
      '.end-card p { font-size: 16px; line-height: 1.45; margin: 0; }',
      '.end-card .narr { font-style: italic; color: var(--dim); }',
      '.end-score { font: 900 72px/1 var(--display); color: var(--amber); text-align: center; letter-spacing: .01em; }',
      '.end-score-of { text-align: center; color: var(--faint); font-size: 13px; margin-bottom: 8px; }',
      '.end-part { display: grid; grid-template-columns: 26px 1fr auto; align-items: center; gap: 4px 8px; padding: 6px 0; border-top: 1px solid rgba(255,255,255,.06); }',
      '.end-part .ic { font-size: 18px; text-align: center; } .end-part b { font-size: 14px; } .end-part .pts { font: 900 15px var(--display); color: var(--amber); }',
      '.end-part .d { grid-column: 2 / 4; font-size: 12px; color: var(--dim); overflow-wrap: anywhere; }',
      '.end-part .bar { grid-column: 2 / 4; height: 6px; border-radius: 3px; background: rgba(0,0,0,.35); overflow: hidden; }',
      '.end-part .bar > span { display: block; height: 100%; width: 0; background: var(--amber); transition: width .7s ease-out; }',
      '.end-tier-ic { font-size: 54px; text-align: center; }',
      '.end-tier.arena_legends { border-color: #ffc978; box-shadow: 0 0 30px rgba(255,179,71,.18) inset; }',
      '.end-tier.canadian_institution { border-color: #4f8cff; } .end-tier.cult_heroes { border-color: #9b6bff; }',
      '.end-tier.one_album_wonders { border-color: #2fb5a6; } .end-tier.still_in_the_garage { border-color: #6f7a96; }',
      '.end-badges { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }',
      '.end-who { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; } .end-who .avatar { width: 56px; height: 56px; font-size: 19px; }',
      '.end-who b { display: block; font: 900 22px/1.05 var(--display); text-transform: uppercase; overflow-wrap: anywhere; }',
      '.end-foot { display: flex; gap: 8px; } .end-foot .btn { flex: 1 1 0; min-width: 0; min-height: 48px; padding: 0 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
      '.end-foot .btn.end-mini { flex: 0 0 52px; min-width: 52px; padding: 0; font-size: 22px; }',
      '.end-list { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; } .end-list > div { display: flex; gap: 8px; align-items: baseline; font-size: 14px; }',
      '.end-preview { align-self: center; }'
    ].join('\n');
    document.head.appendChild(c);
  }
  function clearTimers() { timers.forEach(function (t) { clearTimeout(t); }); timers = []; }
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function tune(k) { var t = (GG.content.endings && GG.content.endings.legacy) || {}; return t[k] || {}; }
  function partMax(k) { var t = tune(k); return k === 'final' ? (t.you || 100) : k === 'regions' ? (t.max || 100) : (t.max || 100); }
  function regionName(id) { var r = GG.tour && GG.tour.region ? GG.tour.region(id) : null; return (r && r.name) || String(id).replace(/_/g, ' '); }
  function bandName(st) { var b = GG.career && GG.career.band ? GG.career.band(st) : null; return (b && b.name) || 'The band'; }
  function rivalName(st) { return GG.rival && GG.rival.name && st.bandId ? GG.rival.name(st) : 'the other band'; }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  function detail(k, raw, st) {
    if (!raw) return '';
    switch (k) {
      case 'fans': return U.fmtNum(raw.fans) + ' fans';
      case 'units': return U.fmtNum(raw.units) + ' records sold';
      case 'awards': {
        var a = [];
        if (raw.loonies) a.push(plural(raw.loonies, 'Loonie', 'Loonies'));
        if (raw.gongs) a.push(plural(raw.gongs, 'Global Gong', 'Global Gongs'));
        if (raw.certs) a.push(raw.certs + ' gold / platinum');
        if (raw.greyMug) a.push('the Grey Mug');
        return a.length ? a.join(' · ') : 'Nothing on the shelf yet';
      }
      case 'venue': return raw.venue ? raw.venue.name + ' (' + U.fmtNum(raw.venue.cap) + ')' + (raw.venue.est ? ', our best guess' : '') : 'Never headlined a room';
      case 'regions': return raw.broken && raw.broken.length ? raw.broken.map(regionName).join(', ') : 'Not broken abroad (yet)';
      case 'unity': { var o = raw.originals || {}; return 'Chemistry ' + Math.round(raw.chem) + ' · ' + (o.kept || 0) + ' of ' + (o.start || 0) + ' originals still in'; }
      case 'final': return raw.final === 'you' ? 'You headlined. ' + rivalName(st) + ' opened.' : raw.final === 'rival' ? rivalName(st) + ' headlined. You opened.' : 'It never happened';
    }
    return '';
  }

  // The career's ending: finished + recorded (ended), or a read-only preview (still in progress). Cached per state + week.
  function ending(st) {
    var ended = !!(st.ended || st.phase === 'ended'), key = (GG.meta && GG.meta.careerId ? GG.meta.careerId(st) : st.seed) + '|' + st.totalWeek + '|' + ended;
    if (last && last.key === key && last.st === st) return last;
    var lg, rec = null;
    if (ended) {
      lg = GG.legacy.finish(st);
      if (GG.achieve && GG.achieve.finish) GG.achieve.finish(st);
      if (GG.meta && GG.meta.enabled && GG.meta.recordCareer) rec = GG.meta.recordCareer(st);
    } else lg = GG.legacy.compute(st);
    var tx = GG.legacy.text(st, lg), steps = [{ id: 'legacy' }, { id: 'tier' }];
    tx.specials.forEach(function (sp) { steps.push({ id: 'special', sp: sp }); });
    (lg.epilogues || []).forEach(function (ep) { steps.push({ id: 'epilogue', ep: ep }); });
    steps.push({ id: 'final' }, { id: 'summary' });
    last = { key: key, st: st, ended: ended, lg: lg, tx: tx, rec: rec, steps: steps };
    return last;
  }

  function header(st, E, i) {
    var logo = ui.bandLogo ? ui.bandLogo(st, 44) : null;
    return [el('div.end-head', [logo, el('div.grow', [el('div.end-band', bandName(st)),
      el('div.tiny.dim', GG.legacy.yearsText(st).replace(/\.$/, '') + (E.lg.bonusYears ? ' (' + E.lg.bonusYears + ' bonus)' : '') + ' · ' + ui.cap(E.lg.difficulty || 'normal'))])]),
      el('div.end-dots', { 'aria-hidden': 'true' }, E.steps.map(function (s, j) { return el('i' + (j === i ? '.on' : j < i ? '.done' : '')); })),
      E.ended ? null : el('span.tag.amber.end-preview', { testid: 'end-preview' }, 'Preview: the career is still going')];
  }

  function legacyCard(st, E, entry) {
    var lg = E.lg, rows = [], score = el('div.end-score', { testid: 'end-score', data: { score: String(lg.score) } }, '0');
    GG.contracts.LEGACY_PARTS.forEach(function (k) {
      var pts = (lg.parts || {})[k] || 0, max = partMax(k), bar = el('span');
      rows.push(el('div.end-part', { testid: 'end-part-' + k, data: { points: String(pts), max: String(max) } }, [
        el('span.ic', PART_ICON[k]), el('b', PART_NAME[k]), el('span.pts', pts + ' / ' + max),
        el('div.bar', bar), el('div.d', detail(k, lg.raw, st))]));
      later(function () { bar.style.width = Math.max(0, Math.min(100, Math.round(100 * pts / Math.max(1, max)))) + '%'; }, 60);
    });
    // the count-up (a tap on the number skips it)
    var t0 = null, dur = 1300;
    function tick(now) {
      if (!score.isConnected) return;
      if (t0 == null) t0 = now;
      var f = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - f, 3);
      score.textContent = String(Math.round(lg.score * e));
      if (f < 1 && !entry.data.skipCount) requestAnimationFrame(tick); else score.textContent = String(lg.score);
    }
    score.addEventListener('click', function () { entry.data.skipCount = true; score.textContent = String(lg.score); });
    if (entry.data.counted) score.textContent = String(lg.score); else { entry.data.counted = true; requestAnimationFrame(tick); }
    return el('div.end-card', { testid: 'end-legacy' }, [el('div.k.center', 'The Legacy'), score, el('div.end-score-of', 'out of 1,000')].concat(rows));
  }
  function tierCard(st, E) {
    var t = E.tx.tier;
    return el('div.end-card.end-tier.' + t.id, { testid: 'end-tier', data: { tier: t.id } }, [
      el('div.end-tier-ic', TIER_ICON[t.id] || '🎸'), el('div.k.center', 'The ending'), el('h2.center', t.name), el('p', t.line),
      el('div.end-badges', [el('span.tag', GG.legacy.yearsText(st).replace(/\.$/, '')), E.lg.bonusYears ? el('span.tag.amber', '+' + E.lg.bonusYears + ' bonus years') : null,
        el('span.tag', ui.cap(E.lg.difficulty || 'normal') + ' difficulty'), el('span.tag', E.lg.score + ' Legacy')])]);
  }
  function specialCard(sp) {
    return el('div.end-card', { testid: 'end-special-' + sp.id, data: { special: sp.id } }, [el('div.k', 'Special ending'), el('h2', sp.name), el('p', sp.line)]);
  }
  function epilogueCard(st, ep) {
    var who = ep.kind === 'player' ? ui.who('player', st) : ui.who(ep.id, st);
    var label = ep.kind === 'defector' ? 'Now with ' + rivalName(st) : KIND_LABEL[ep.kind] || '';
    return el('div.end-card', { testid: 'end-epilogue-' + ep.id, data: { kind: ep.kind, silent: ep.silent ? '1' : '' } }, [
      el('div.end-who', [ui.avatar(who), el('div.grow', [el('b', ep.name || who.name), el('div.k', label)])]),
      el('p' + (ep.silent ? '.narr' : ''), ep.text || '')]);
  }
  function finalCard(st, E) {
    var line = E.tx.rival || '';
    var panel = ui.rivalEnd ? ui.rivalEnd(st, { line: line }) : null;
    if (panel) return panel;
    return el('div.end-card', { testid: 'end-final' }, [el('div.k', 'The Sad Dome'), el('h2', 'The rivalry'), el('p', line || 'The Sad Dome never happened.')]);
  }
  function achName(id) {
    var d = GG.achieve && GG.achieve.def ? GG.achieve.def(id) : null;
    return d ? (d.icon ? d.icon + ' ' : '') + (d.name || id) : String(id).replace(/_/g, ' ');
  }
  function summaryCard(st, E) {
    var stats = st.stats || {}, raw = E.lg.raw || {};
    var albums = (st.albums || []).filter(function (a) { return a && a.status === 'released'; }).length;
    var grid = el('div.stat-grid', [
      ['Years', GG.legacy.finalYear(st)], ['Fans', U.fmtNum(st.fans || 0)], ['Records', U.fmtNum(stats.units || 0)],
      ['Albums', albums], ['Gigs', stats.gigs || 0], ['Songs', stats.songsWritten || (st.songs || []).length],
      ['Loonies', stats.loonieWins || 0], ['Fund', U.fmtMoney(st.fund || 0)], ["Parents' loans", stats.parentsLoans || 0]
    ].map(function (x) { return el('div', [el('span.caps', x[0]), el('b', String(x[1]))]); }));
    var got = Object.keys((st.ach && st.ach.got) || {});
    var unl = (E.rec && E.rec.unlocks && E.rec.unlocks.length ? E.rec.unlocks : unlockLog).filter(function (u) { return u && ((u.names && u.names.length) || (u.ids && u.ids.length)); });
    return el('div.end-card', { testid: 'end-summary' }, [el('div.k', E.ended ? 'That\'s a career' : 'So far'),
      el('h2', E.tx.tier.name), el('p.dim', bandName(st) + ' · ' + E.lg.score + ' Legacy' + (raw.venue ? ' · biggest room: ' + raw.venue.name : '')), grid,
      el('div', { testid: 'end-ach' }, [el('div.caps', 'Trophies this career'), got.length ? el('div.end-list', got.map(function (id) { return el('div', achName(id)); }))
        : el('p.dim.small', 'None this time. There is always next career.')]),
      unl.length ? el('div', { testid: 'end-unlocks', style: 'margin-top:10px' }, [el('div.caps', 'New looks unlocked'),
        el('div.end-list', unl.map(function (u) { return el('div', '🏆 ' + (u.names && u.names.length ? u.names : u.ids).join(', ')); }))]) : null,
      E.ended ? null : el('p.tiny.dim', { style: 'margin-top:10px' }, 'A preview: nothing is saved until the last week is played.')]);
  }

  function go(entry, i) {
    var E = last; if (!E) return;
    entry.data.step = Math.max(0, Math.min(E.steps.length - 1, i));
    entry.rerender();
    if (GG.audio && GG.audio.sfx) GG.audio.sfx('tap');
  }

  ui.define('end', {
    kind: 'full', cls: 'end-seq',
    build: function (s) {
      css(); clearTimers();
      var st = S();
      if (!st || !GG.legacy) {
        ui.append(s.body, el('div.title-wrap', [el('h1.logo', { style: 'font-size:44px' }, ["That's a", el('span.glory', ' career')])]));
        s.foot.appendChild(btn('.btn.primary.big.block', { testid: 'btn-end-title', onclick: function () { GG.main.quitToTitle(); } }, 'Back to title'));
        return;
      }
      var E = ending(st), n = E.steps.length, i = Math.max(0, Math.min(n - 1, s.data.step || 0)), step = E.steps[i], card;
      if (step.id === 'legacy') card = legacyCard(st, E, s);
      else if (step.id === 'tier') card = tierCard(st, E);
      else if (step.id === 'special') card = specialCard(step.sp);
      else if (step.id === 'epilogue') card = epilogueCard(st, step.ep);
      else if (step.id === 'final') card = finalCard(st, E);
      else card = summaryCard(st, E);
      ui.append(s.body, header(st, E, i).concat([card]));
      // a sideways swipe moves between cards
      var sx = null, sy = null;
      s.body.onpointerdown = function (ev) { sx = ev.clientX; sy = ev.clientY; };
      s.body.onpointerup = function (ev) {
        if (sx == null) return;
        var dx = ev.clientX - sx, dy = ev.clientY - sy; sx = null;
        if (Math.abs(dx) > 60 && Math.abs(dy) < 50) go(s, i + (dx < 0 ? 1 : -1));
      };
      var row = [];
      if (step.id === 'summary') {
        if (ui.defined('hof')) row.push(btn('.btn', { testid: 'end-hof', onclick: function () { ui.show('hof'); } }, 'Hall of Fame'));
        row.push(btn('.btn.primary', { testid: 'btn-end-title', onclick: function () { GG.main.quitToTitle(); } }, 'Back to title'));
      } else {
        row.push(btn('.btn.end-mini', { testid: 'end-back', 'aria-label': 'Back', disabled: i === 0, onclick: function () { go(s, i - 1); } }, '‹'));
        row.push(btn('.btn', { testid: 'end-skip', onclick: function () { go(s, n - 1); } }, 'Skip all'));
        row.push(btn('.btn.primary', { testid: 'end-next', onclick: function () { go(s, i + 1); } }, 'Next ›'));
      }
      s.foot.appendChild(el('div.end-foot', row));
      if (step.id !== 'summary') s.foot.appendChild(btn('.btn.ghost.block', { testid: 'btn-end-title', onclick: function () { GG.main.quitToTitle(); } }, 'Back to title'));
      GG.emit('end:step', { step: step.id, index: i, of: n });
    }
  });
  // Jumps the open end screen to a step: 'legacy' | 'tier' | 'final' | 'summary' | 'special' | 'epilogue' (the first one) | index.
  ui.endGo = function (step) {
    var e = ui.get('end'); if (!e || !last) return false;
    var i = typeof step === 'number' ? step : last.steps.map(function (x) { return x.id; }).indexOf(step);
    if (i < 0) return false;
    go(e, i);
    return true;
  };

  GG.registerDebug('ending', function () {
    var e = ui.get('end');
    if (!last) return { open: !!e, built: false };
    return { open: !!e, built: true, ended: last.ended, step: e ? e.data.step || 0 : null, steps: last.steps.map(function (x) { return x.id + (x.sp ? ':' + x.sp.id : x.ep ? ':' + x.ep.id : ''); }),
      score: last.lg.score, parts: last.lg.parts, tier: last.lg.tier, specials: last.lg.specials, epilogues: (last.lg.epilogues || []).map(function (x) { return { kind: x.kind, id: x.id, silent: !!x.silent }; }),
      recorded: !!last.rec, fresh: !!(last.rec && last.rec.fresh) };
  });
})(window.GG);
