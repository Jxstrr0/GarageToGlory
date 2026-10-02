// 52_ui_week.js: the weekly loop in the garage. HUD top bar + contextual primary button (the dock), Monday card,
// whiteboard planner, week results, week wrap, end screen, hotspot/bandmate taps, placeholder sheets for later
// versions, and the 2D fallback garage when three.js/WebGL isn't available.
// v0.8 (SHOPUI): the merch hotspot opens the merch table (GG.ui.openMerch); the gig result shows r.merch (GG.ui.merchResult,
// its "Merch table:" line is folded in); the wrap shows wrap.shop (GG.ui.shopWrap) and plays the collector moment once.
// v1.0 (Lane T): HUD "?" (btn-help → GG.tutorial.openLessons); wrap testids for the lessons: wrap-deltas, wrap-d-<stat>
// (fund/fans/buzz/chemistry/...), wrap-upkeep, wrap-buzz-fade, wrap-owed, wrap-moods, wrap-mood-<memberId>.
// Flow commands (start/run/end the week, save) go through GG.main; this file only reads GG.state and calls
// GG.career for the per-screen actions (resolve a card, edit the plan, accept an offer).
(function (GG) {
  var ui = GG.ui, el = ui.el, btn = ui.btn, U = GG.util, C = GG.contracts;
  var hud = null, dock = null, fallback = null;

  function S() { return GG.state; }
  function fill(text) { return text && S() ? ui.fill(text, S()) : (text || ''); }   // v0.9: + the role/space tokens (50_ui_core)
  function lines(key) { return (GG.content.lines && GG.content.lines[key]) || null; }
  function sfx(n) { if (GG.audio) GG.audio.sfx(n); }

  var ACT_FALLBACK = {
    rehearse: { icon: '🥁', name: 'Rehearse', blurb: 'Tighter band, sorer wrists.' },
    write: { icon: '✍️', name: 'Write', blurb: 'A new song. Nobody knows what it is about yet.' },
    promote: { icon: '📣', name: 'Promote', blurb: "Posters, posts and your mom's Facepage." },
    book: { icon: '📅', name: 'Book', blurb: 'Find somewhere that will have you.' },
    hustle: { icon: '💵', name: 'Hustle', blurb: 'Weddings, busking, bingo. Cash.' },
    rest: { icon: '🛋️', name: 'Rest', blurb: 'Burnout down, moods up. The couch wins.' },
    studio: { icon: '🎙️', name: 'Studio', blurb: 'Red light on. Nobody breathe.' }   // v0.5: studio weeks replace the blocks
  };
  // v0.9: neutral block lines, shown only when a sim line names someone who isn't in this band (content lands later).
  var ACT_LINE = {
    rehearse: ['We ran the set until it stopped falling apart.', '{soloist} wanted it faster. {front} wanted it louder. You kept time.'],
    write: ['{namer} brought half an idea. You brought the other half.', 'A new song, mostly. It needs a name and a bridge.'],
    promote: ['Posters went up all over {city}. Some of them are still up.', '{front} posted about the band. Three likes. One is your mom.'],
    book: ['Phone calls, emails, one voicemail. Something might come of it.'],
    hustle: ['A cash gig nobody we know was at. Good money, weird crowd.'],
    rest: ['Nobody touched an instrument. Everybody needed it.', 'A week off. {space} was very quiet.'],
    any: ['A week in {space}. Things happened. Some of them on purpose.']
  };
  ui.act = function (id) {
    var a = (GG.content.activities && GG.content.activities[id]) || {};
    var f = ACT_FALLBACK[id] || { icon: '❔', name: id, blurb: '' };
    return { id: id, icon: a.icon || f.icon, name: a.name || f.name, blurb: a.blurb || f.blurb };
  };

  /* ======================================================================================================
     HUD top bar + dock
     ====================================================================================================== */
  var STAT_HELP = {
    week: "The calendar. 24 weeks a year, ten years to glory (more if you're quick). Every week: a Monday card, three blocks, maybe a gig.",
    fund: 'Band fund: the one shared wallet. Gigs and Hustle fill it; upkeep, gas and gear drain it. Hit zero and your parents "help".',
    fans: 'Fans: people who would admit to liking you. Gigs and buzz grow them, and they never leave. Your mom counts.',
    buzz: 'Buzz: how hard people are talking about you right now. Promote and play gigs to pump it; it fades every week.',
    chem: 'Chemistry: how well the band gels. Rehearsing and good gigs help; drama, burnout and grumpy members hurt.'
  };
  // v0.6.1: the week chip's help adds the calendar (month, season, weather, holiday, the genre-season fit).
  function weekHelp() {
    var st = S(), L = st && GG.calendar ? GG.calendar.label(st) : null;
    if (!L) return STAT_HELP.week;
    return L.monthName + ', ' + L.seasonName.toLowerCase() + ': ' + L.weatherLabel.toLowerCase() + ', ' + L.temp + '°C. '
      + (L.holiday ? L.holiday.icon + ' ' + L.holiday.name + ': ' + L.holiday.blurb + ' ' : L.seasonBlurb + ' ') + (L.fit ? L.fit : '');
  }
  function hudChip(key, testid, label) {
    var v = el('span.v'), l = el('span.l', label), extra = key === 'buzz' || key === 'chem' ? ui.bar(0, 100) : null;
    var b = btn('.hud-chip.' + key, { testid: testid, onclick: function () { ui.toast(key === 'week' ? weekHelp() : STAT_HELP[key]); } }, [l, v, extra]);
    b._v = v; b._l = l; b._bar = extra;
    return b;
  }
  function buildHud() {
    var root = document.getElementById('hud');
    if (!root || hud) return;
    hud = {
      week: hudChip('week', 'hud-week', 'Y1'), fund: hudChip('fund', 'hud-fund', 'Fund'), fans: hudChip('fans', 'hud-fans', 'Fans'),
      buzz: hudChip('buzz', 'hud-buzz', 'Buzz'), chem: hudChip('chem', 'hud-chem', 'Chem')
    };
    hud.cal = el('div.hud-cal', { testid: 'hud-cal', 'aria-live': 'polite' });   // v0.6.1: month · season · weather · holiday
    hud.bar = el('div.hud-bar', [hud.week, hud.fund, hud.fans, hud.buzz, hud.chem,
      GG.tutorial ? btn('.hud-menu.hud-help', { testid: 'btn-help', 'aria-label': 'Lessons', onclick: function () { GG.tutorial.openLessons(); } }, '?') : null,   // v1.0 (Lane T)
      btn('.hud-menu', { testid: 'btn-menu', 'aria-label': 'Menu', onclick: function () { ui.show('menu'); } }, '☰'), hud.cal]);
    if (!document.getElementById('gg-hud-cal-css')) {
      var css = document.createElement('style'); css.id = 'gg-hud-cal-css';
      css.textContent = '.hud-bar { flex-wrap: wrap; row-gap: 4px; }\n'
        + '.hud-cal { flex: 1 1 100%; order: 9; min-width: 0; align-self: center; justify-self: center; text-align: center; padding: 3px 10px; border-radius: 99px;'
        + ' background: rgba(13, 18, 30, .72); border: 1px solid rgba(255, 255, 255, .08); color: var(--dim); font: 700 11px/1.35 var(--font);'
        + ' white-space: nowrap; overflow: hidden; text-overflow: ellipsis; pointer-events: none; box-sizing: border-box; }\n'
        + '.hud-cal b { color: var(--amber); font-weight: 800; } .hud-cal .hol { color: var(--text); }\n'
        + '.hud-chip.week .v { letter-spacing: -.04em; } .hud-chip.week .wk-of { font-size: 10px; opacity: .8; letter-spacing: 0; }\n'
        // v0.6.1 verify: the calendar strip adds ~24px to the HUD, so sheets, their scrim and toasts start below it.
        + '#app.hud-on .sheet-layer .scrim { top: calc(var(--safe-top) + 88px); }\n'
        + '#app.hud-on .sheet { max-height: calc(100% - var(--safe-top) - 92px); } #app.hud-on .sheet.tall { height: calc(100% - var(--safe-top) - 92px); }\n'
        + '#app.hud-on #toast { top: calc(var(--safe-top) + 90px); }';
      document.head.appendChild(css);
    }
    dock = { hint: el('div.hint') };
    dock.btn = btn('.btn.primary.big.block', { testid: 'btn-primary', onclick: primaryAction }, 'Plan the week');
    dock.root = el('div.dock', [dock.hint, dock.btn]);
    ui.append(root, [hud.bar, dock.root]);
  }
  function setBar(barEl, v) { if (barEl) barEl.firstChild.style.width = U.clamp(v, 0, 100) + '%'; }

  var PRIMARY = {
    monday: 'Monday card', plan: 'Plan the week', week: 'Wrap up the week', gig: 'Play the gig', wrap: 'Wrap up the week', ended: 'Career over'
  };
  function primaryAction() {
    var st = S(); if (!st) return;
    if (st.phase === 'monday') { if (st.card && !st.card.resolved) ui.show('card'); else GG.main.beginWeek(); }
    else if (st.phase === 'plan') ui.openPlanner();
    else if (st.phase === 'gig') GG.main.playWeekend();
    else if (st.phase === 'wrap' || st.phase === 'week') GG.main.wrapWeek();
    else if (st.phase === 'ended') ui.show('end');
  }
  function dockHint(st) {
    if (st.phase === 'plan' && st.totalWeek <= 2) return GG.main.renderOk ? 'Tap the floor to walk. Tap stuff to use it.' : 'Tap a spot in ' + ui.space(st) + ' to use it.';
    if (st.phase === 'monday') return 'New week. Somebody has news.';
    if (st.phase === 'gig') return vanLine(st, 'dock');
    return '';
  }
  // v0.9: whoever drives this week (GG.world.driver): the band's driver, or you once they're gone. A driver def may carry
  // its own lines (content.drivers[id].dock / .load); else the silent one is already in the van, the others have the keys.
  function vanLine(st, kind) {
    var d = ui.driverOf(st), def = d.def || {};
    if (def[kind]) return fill(def[kind]);
    if (kind === 'dock') return d.you ? 'The van is warming up. You have the keys. Apparently.'
      : ui.isSilent(d.id, st) ? 'The van is warming up. ' + d.name + ' is already in it.' : 'The van is warming up. ' + d.name + ' has the keys.';
    return d.you ? 'Load the van. You drive now. The mirrors are still set for someone else.'
      : ui.isSilent(d.id, st) ? 'Load the van. ' + d.name + ' is already in the driver’s seat. Nobody saw ' + d.name + ' get in.'
      : 'Load the van. ' + d.name + ' is warming it up' + (def.dashName ? ', ' + def.dashName + ' on the dash.' : '.');
  }

  ui.refreshHud = function () {
    if (!hud) return;
    var st = S(), stack = ui.stackIds();
    var hudOn = !!st && !ui.hasFull();
    hud.bar.classList.toggle('hidden', !hudOn);
    document.getElementById('app').classList.toggle('hud-on', hudOn);
    dock.root.classList.toggle('hidden', !st || stack.length > 0);
    if (!st) return;
    hud.week._l.textContent = 'Y' + st.year;
    hud.week._v.textContent = 'W' + st.week;   // v0.6.1 verify: '/24' in a smaller span so W12/24 fits a 390px chip
    hud.week._v.appendChild(el('small.wk-of', '/' + C.WEEKS_PER_YEAR));
    hud.fund._v.textContent = U.fmtMoney(st.fund);
    hud.fund.classList.toggle('neg', st.fund < 0);
    hud.fans._v.textContent = U.fmtNum(st.fans);
    hud.buzz._v.textContent = String(Math.round(st.buzz));
    hud.chem._v.textContent = String(Math.round(st.chemistry));
    setBar(hud.buzz._bar, st.buzz); setBar(hud.chem._bar, st.chemistry);
    if (GG.calendar) {
      var L = GG.calendar.label(st), key = [L.totalWeek, L.weather, L.temp, L.holiday && L.holiday.id].join('|');
      if (hud.cal._k !== key) {
        hud.cal._k = key; hud.cal.textContent = '';
        ui.append(hud.cal, [el('b', L.month), ' · ' + L.seasonIcon + ' ' + L.seasonName + ' · ' + L.weatherIcon + ' ' + L.weatherLabel + ' ' + L.temp + '°C',
          L.holiday ? el('span.hol', ' · ' + L.holiday.icon + ' ' + L.holiday.name) : null]);
        hud.cal.setAttribute('aria-label', L.text);
      }
    }
    dock.btn.textContent = st.phase === 'plan' && GG.labels && GG.labels.inSession && GG.labels.inSession(st) ? 'Studio week' : PRIMARY[st.phase] || 'Continue';
    var h = dockHint(st);
    dock.hint.textContent = h; dock.hint.classList.toggle('hidden', !h);
  };

  /* ======================================================================================================
     Monday card
     ====================================================================================================== */
  var lastSuccess = null;   // resolveCard's success flag, for the outcome view
  function cardHead(card) {
    var st = S(), sp = card.speaker === 'recruit' && st && st.card && st.card.who ? st.card.who : card.speaker;   // v0.4 drama cards
    var who = ui.who(sp), ult = /^ult_/.test(card.id);
    return el('div.card-head', [ui.avatar(who, 'lg'), el('div.grow', [el('div.who', who.name), el('div.role', who.role || who.nick || '')]),
      ult ? el('span.stage-tag.stage-3', { testid: 'card-ultimatum' }, '⚠ ultimatum') : card.type ? el('span.tag', card.type) : null]);
  }
  function choiceHint(st, ch) {
    if (GG.career.choiceHint) return GG.career.choiceHint(st, ch);
    return ch.hint ? fill(ch.hint) : GG.career.effectSummary(ch.effects, st);
  }
  ui.define('card', {
    kind: 'sheet',
    build: function (s) {
      var st = S(); if (!st) return;
      s.setTitle('Monday', 'YEAR ' + st.year + ' · WEEK ' + st.week);
      var card = GG.career.currentCard(st);
      var res = st.card && st.card.resolved ? st.card : null;
      if (!card) {
        s.body.appendChild(el('p.dim', 'No card this week. Suspiciously quiet.'));
        s.foot.appendChild(btn('.btn.primary.big.block', { testid: 'btn-card-ok', onclick: function () { ui.close(s.id); } }, 'OK'));
        return;
      }
      ui.append(s.body, [cardHead(card), el('h3.card-title', fill(card.title)), el('p.card-text', fill(card.text)),
        ui.rivalCardNote ? ui.rivalCardNote(st, card) : null, ui.tourCardNote ? ui.tourCardNote(st, card) : null]);   // v0.7: region strip   // v0.6: the rival's cards (poach, crack, Sad Dome eve)
      if (!res) {
        (card.choices || []).forEach(function (ch, i) {
          s.body.appendChild(btn('.choice', { testid: 'choice-' + i, onclick: function () {
            var cur = S();
            if (!cur || cur.phase !== 'monday' || !cur.card || cur.card.resolved) return;   // double-tap guard
            var r = GG.career.resolveCard(cur, i);
            lastSuccess = r ? r.success : null;
            if (r && r.deltas && (r.deltas.fund || 0) > 0) sfx('cash');
            GG.main.sync();
            s.rerender();
          } }, [el('span.cl', fill(ch.label)), el('span.ch', choiceHint(st, ch) || 'Who knows?')]));
        });
        return;
      }
      var chosen = card.choices && card.choices[res.choice];
      ui.append(s.body, [
        chosen ? el('div.you', ['You picked: ', el('b', fill(chosen.label))]) : null,
        lastSuccess === true ? el('span.tag.amber', { style: 'margin-bottom:8px' }, 'It worked!') : lastSuccess === false ? el('span.tag', { style: 'margin-bottom:8px;color:var(--bad)' }, 'Welp.') : null,
        el('div.quote', fill(res.outcome || '')),
        el('div', { style: 'margin-top:12px' }, ui.deltaChips(res.deltas, { emptyText: 'Nothing changed. Somehow.' }))
      ]);
      s.foot.appendChild(btn('.btn.primary.big.block', { testid: 'btn-card-ok', onclick: function () { ui.close(s.id); } }, 'OK'));
    },
    onShow: function () { sfx('card'); },
    onClose: function () { lastSuccess = null; var st = S(); if (st && st.phase === 'plan') GG.main.afterCard(); }
  });

  /* ======================================================================================================
     Gig info (planner + gig board)
     ====================================================================================================== */
  function dealText(g) {
    if (g.deal === 'exposure') return 'Pays in "exposure"';
    if (g.deal === 'door') return 'Door deal' + (g.pay ? ' (' + U.fmtMoney(g.pay) + ' a head)' : '');
    return 'Flat ' + U.fmtMoney(g.pay || 0);
  }
  function gigBox(st, withButtons, after) {
    if (st.gig) {
      var g = st.gig;
      return el('div.panel.warm.gig-box', [el('span.ico', '🎤'), el('div.grow', [
        el('div.caps', 'Booked this weekend'),
        el('div.vn', g.name),
        el('div.small.dim', [g.city, dealText(g), g.capacity ? 'cap. ' + g.capacity : '', g.gas ? 'gas ' + U.fmtMoney(g.gas) : ''].filter(Boolean).join(' · ')),
        g.quirk ? el('div.q', fill(g.quirk)) : null
      ])]);
    }
    if (st.offer) {
      var o = st.offer;
      var can = withButtons && st.phase === 'plan';
      return el('div.panel.warm', [el('div.gig-box', [el('span.ico', '📨'), el('div.grow', [
        el('div.caps', 'Gig offer for this weekend'),
        el('div.vn', o.name),
        el('div.small.dim', [o.city, dealText(o), o.capacity ? 'cap. ' + o.capacity : ''].filter(Boolean).join(' · ')),
        o.quirk ? el('div.q', fill(o.quirk)) : null
      ])]), can ? el('div.row', { style: 'margin-top:10px' }, [
        btn('.btn.small.grow', { testid: 'offer-decline', onclick: function () { if (S().offer) { GG.career.declineOffer(S()); GG.main.sync(); after(); } } }, 'Decline'),
        btn('.btn.primary.small.grow', { testid: 'offer-accept', onclick: function () { if (S().offer) { GG.career.acceptOffer(S()); GG.main.sync(); after(); } } }, 'Accept')
      ]) : null]);
    }
    return el('div.panel.gig-box', [el('span.ico', '🗓️'), el('div.grow', [el('div.caps', 'This weekend'),
      el('div', { style: 'font-weight:700' }, 'No gig booked.'), el('div.small.dim', 'Put Book in a slot and someone might have you.')])]);
  }

  /* ======================================================================================================
     Planner (the whiteboard)
     ====================================================================================================== */
  var plan = [null, null, null], sel = 0;
  ui.openPlanner = function () {
    var st = S(); if (!st) return;
    if (st.phase !== 'plan') {
      ui.toast(st.phase === 'monday' ? "Monday first. Somebody has news (tap Monday card)." :
        st.phase === 'ended' ? 'The career is over. The whiteboard is now a memorial.' : "This week's already played. Wrap it up first.");
      return;
    }
    if (ui.checkDemand && ui.checkDemand(ui.openPlanner)) return;                                   // v0.5: a label demand first
    if (GG.labels && GG.labels.inSession && GG.labels.inSession(st) && ui.openStudio) { ui.openStudio(); return; }   // v0.5: studio week
    plan = (st.plan || []).slice(0, C.BLOCKS_PER_WEEK);
    while (plan.length < C.BLOCKS_PER_WEEK) plan.push(null);
    var allowed = ui.tourBlocks ? ui.tourBlocks(st) : null;   // v0.7: on tour the planner shrinks (rest / promote / rehearse)
    plan = plan.map(function (a) { return a && (!allowed || allowed.indexOf(a) >= 0) ? a : null; });
    if (ui.tourForced && ui.tourForced(st)) { plan[0] = 'rest'; commitPlan(); }   // v0.7: too homesick: the first block is a rest
    sel = Math.max(0, plan.indexOf(null));
    ui.show('plan');
  };
  function commitPlan() { GG.career.setPlan(S(), plan.slice()); }
  // Go: each Write block opens the sequencer first (54_ui_sequencer), then the week runs.
  function goWeek() {
    var st = S();
    if (!st || st.phase !== 'plan' || plan.some(function (a) { return !a; })) return;
    commitPlan();
    var writes = plan.filter(function (a) { return a === 'write'; }).length, go = bookFirst(playWeek);
    if (writes && ui.composeWeek) ui.composeWeek(writes, go); else go();
  }
  // v0.3 (WORLD): a planned Book block opens the gig board (56_ui_board) after the sequencer, before the week runs.
  // Book it -> the pick is stored for the Book block; "No gig" -> 'skip'; ✕ -> back to the planner (nothing runs).
  function bookFirst(next) {
    var st = S();
    var od = st && ui.tourOpenDate ? ui.tourOpenDate(st, next) : null;   // v0.7: an open date on tour picks from the regional board
    if (od) return od;
    if (!st || st.gig || plan.indexOf('book') < 0 || !ui.openBoard) return next;
    return function () { ui.openBoard({ mode: 'book', onBook: next, onSkip: next }); };
  }
  function playWeek() {
    var st = S();
    if (!st || st.phase !== 'plan') return;   // runs exactly once
    var result = GG.career.runWeek(st);   // a booked gig -> phase 'gig': the results sheet leads to the van + the live gig
    GG.main.sync();
    ui.close('plan'); ui.close('studio');
    ui.show('results', { result: result });
  }
  ui.runStudioWeek = function () { playWeek(); };   // v0.5: the studio sheet's "Record this week"
  ui.define('plan', {
    kind: 'sheet', title: 'Plan the week',
    build: function (s) {
      var st = S(); if (!st) return;
      s.setTitle('Plan the week', 'THE WHITEBOARD · WEEK ' + st.week);
      var slots = el('div.slots'), act = ui.tourAct ? function (id) { return ui.tourAct(id, st); } : ui.act;   // v0.7: tour names
      var forced = ui.tourForced ? ui.tourForced(st) : false;
      C.BLOCK_LABELS.forEach(function (label, i) {
        var a = plan[i] && act(plan[i]), lock = forced && i === 0;
        slots.appendChild(btn('.slot' + (a ? '.filled' : '') + (i === sel ? '.sel' : '') + (lock ? '.locked' : ''), { testid: 'plan-slot-' + i,
          onclick: function () { if (lock) { ui.toast('Too homesick to do anything else. Rest first.'); return; } if (plan[i]) { plan[i] = null; commitPlan(); } sel = i; s.rerender(); } },
          [el('span.sl', label), el('span.si', a ? a.icon : '＋'), el('span.sn', a ? a.name : 'Empty'), a ? el('span.x', lock ? '🔒' : '✕') : null]));
      });
      var acts = el('div.acts');
      ((ui.tourBlocks && ui.tourBlocks(st)) || C.ACTIVITIES).forEach(function (id) {
        var a = act(id), n = plan.filter(function (p) { return p === id; }).length;
        acts.appendChild(btn('.act', { testid: 'act-' + id, onclick: function () {
          var i = plan[sel] == null ? sel : plan.indexOf(null);
          if (i < 0) { ui.toast('All three blocks are full. Tap one to clear it.'); return; }
          plan[i] = id; commitPlan();
          var nx = plan.indexOf(null, i + 1); sel = nx >= 0 ? nx : Math.max(0, plan.indexOf(null));
          s.rerender();
        } }, [el('span.ai', a.icon), el('span.grow', [el('div.an', a.name), el('div.ab', a.blurb)]), n ? el('span.cnt', '×' + n) : null]));
      });
      ui.append(s.body, [el('div.stack', [
        ui.tourPlanHead ? ui.tourPlanHead(st) : null,   // v0.7: the tour stop, homesickness (or a "plan a world tour" button)
        gigBox(st, true, function () { s.rerender(); }),
        slots,
        acts,
        el('p.tiny.faint.center', 'Doing the same thing twice in one week gets you less the second time.'),
        studioBtn(st)
      ])]);
      var full = plan.every(Boolean);
      s.foot.appendChild(btn('.btn.primary.big.block', { testid: 'btn-go', disabled: !full, onclick: goWeek }, full ? 'Go! Play the week' : 'Fill all three blocks'));
    }
  });

  function studioBtn(st) {   // v0.5: book a session from the whiteboard once you can record (it takes over this week)
    var can = GG.labels && GG.labels.canRecord && ui.openStudioBooking ? GG.labels.canRecord(st) : null;
    if (!can || !(can.ep || can.album) || st.session && GG.labels.inSession(st) || GG.tour && GG.tour.away(st)) return null;   // v0.7: not from a hotel room
    return btn('.btn.ghost.block', { testid: 'btn-plan-studio', onclick: function () { ui.close('plan'); ui.openStudioBooking(); } }, 'Book the studio instead 🎙');
  }

  /* ======================================================================================================
     Week results: blocks revealed line by line, then the gig
     ====================================================================================================== */
  function gigNode(g) {
    var pay = g.deal === 'exposure' && !g.pay ? 'Exposure' : U.fmtMoney(g.pay || 0);
    var reactions = el('div');
    (g.reactions || []).forEach(function (r) {
      var who = ui.who(r.who);
      reactions.appendChild(el('div.react', [ui.avatar(who, 'sm'), el('div.t', [el('b', who.short + ': '), fill(r.text)])]));
    });
    return el('div.gig-res', { testid: 'gig-result' }, [
      el('div.row', [el('div.grade.' + (g.grade || 'B'), g.grade || '?'), el('div.grow', [el('div.caps', 'Weekend gig'),
        el('div', { style: 'font-weight:800;font-size:17px' }, g.name || 'A gig'), el('div.small.dim', [g.city, dealText(g)].filter(Boolean).join(' · '))])]),
      el('div.stat-grid', [
        el('div', [el('span.caps', 'Crowd'), el('b', (g.crowd || 0) + (g.capacity ? '/' + g.capacity : ''))]),
        el('div', [el('span.caps', 'Pay'), el('b', pay)]),
        el('div', [el('span.caps', 'Gas'), el('b', g.gas ? '−' + U.fmtMoney(g.gas).replace('−', '') : '$0')]),
        el('div', [el('span.caps', 'Fans'), el('b.good', U.signed(g.fans || 0))]),
        el('div', [el('span.caps', 'Buzz'), el('b', U.signed(g.buzz || 0))]),
        el('div', [el('span.caps', 'Score'), el('b', g.score != null ? String(Math.round(g.score)) : '—')])
      ]),
      (g.lines || []).filter(function (t) { return !(g.merch && ui.isMerchLine && ui.isMerchLine(t)) && ui.safeLine(t, null); }).map(function (t) { return el('p.small', { style: 'margin:4px 0' }, fill(t)); }),
      g.merch && ui.merchResult ? ui.merchResult(g.merch) : null,   // v0.8: the merch table (sold, earned, boxes hauled)
      g.songs && g.songs.length ? el('div.small', { style: 'margin-top:6px' }, [el('span.caps', 'Setlist  '), g.songs.join(' · ')]) : null,
      (g.classics || []).map(function (id) {   // v0.2: enough great gigs make a song a classic
        var song = S() && GG.songs.byId(S(), id);
        return song ? el('p.small.amber', { style: 'margin:6px 0 0' }, '🏆 “' + song.title + '” is a classic now. The crowd will want it every night.') : null;
      }),
      reactions
    ]);
  }
  // A new song from a Write block: its ratings and the band's reactions.
  function songNode(song) {
    var r = song.reactions || [];
    return el('div.song-res', { testid: 'result-song' }, [
      el('div.row', [el('span', { style: 'font-size:22px' }, '🎵'), el('div.grow', [el('div.caps', song.auto ? 'The band jammed one out' : 'Your new song'),
        el('div', { style: 'font-weight:800;font-style:italic' }, song.title)]), el('div.small.dim', { style: 'text-align:right' }, 'Q ' + song.quality)]),
      el('div.small.dim', { style: 'margin:4px 0 2px' }, 'Groove ' + song.groove + ' · Hook ' + song.hook + ' · Difficulty ' + song.difficulty),
      r.map(function (x) {
        var who = ui.who(x.who);
        return el('div.react', { testid: 'song-react-' + x.who }, [ui.avatar(who, 'sm'), el('div.t', [el('b', who.short + ': '), fill(x.text)])]);
      })
    ]);
  }
  ui.define('results', {
    kind: 'sheet', sticky: true,
    build: function (s, d) {
      var st = S(), r = d.result || (st && st.lastWeek);
      s.setTitle('The week', 'YEAR ' + (st ? st.year : 1) + ' · WEEK ' + (st ? st.week : 1));
      var pending = st && st.phase === 'gig' && st.gig;   // v0.3: the weekend gig is still to play (van -> live gig)
      function next() { if (S() && S().phase === 'gig') GG.main.playWeekend(); else GG.main.wrapWeek(); }
      var nextLabel = pending ? 'Load the van ▸' : 'Wrap up the week';
      if (!r) { s.foot.appendChild(btn('.btn.primary.big.block', { testid: 'btn-results-ok', onclick: next }, nextLabel)); return; }
      var steps = [], gigEl = null;   // steps: [node, delayBeforeMs, onReveal]
      (r.blocks || []).forEach(function (b, i) {
        var a = ui.act(b.activity);
        var box = el('div.blk', [el('div.blk-h', [el('span.i', a.icon), el('span.n.grow', a.name), el('span.tag', C.BLOCK_LABELS[i] || '')])]);
        s.body.appendChild(box);
        steps.push([box, 250]);
        (b.lines || []).forEach(function (t) {   // v0.9: the leak net (a line naming another band's people reads neutral)
          var p = el('p', ui.safeLine(t, ACT_LINE[b.activity] || ACT_LINE.any, st)); box.appendChild(p); steps.push([p, 650]);
        });
        if (b.deltas && b.deltas.song) { var sn = songNode(b.deltas.song); box.appendChild(sn); steps.push([sn, 700]); }
        var chips = ui.deltaChips(b.deltas, { emptyText: false });
        if (chips.children.length) { box.appendChild(chips); steps.push([chips, 250]); }
      });
      if (r.gig) {
        var g = gigEl = gigNode(r.gig);
        s.body.appendChild(g);
        steps.push([g, 800, function () { sfx('drum'); setTimeout(function () { sfx(/[SAB]/.test(r.gig.grade) ? 'cheer' : r.gig.grade === 'D' ? 'boo' : 'tap'); }, 520); }]);
      } else if (pending) {
        var pg = st.gig, up = el('div.gig-res', { testid: 'gig-pending' }, [el('div.row', [el('span', { style: 'font-size:30px' }, '🚐'),
          el('div.grow', [el('div.caps', 'This weekend'), el('div', { style: 'font-weight:800;font-size:17px' }, pg.name),
            el('div.small.dim', [pg.city, dealText(pg)].filter(Boolean).join(' · '))])]),
          el('p.small', { testid: 'gig-pending-driver', style: 'margin:8px 0 0' }, vanLine(st, 'load'))]);
        s.body.appendChild(up); steps.push([up, 600]);
      } else {
        var none = el('p.small.dim.center', { style: 'margin:6px 0 4px' }, 'No gig this weekend. The neighbours send their thanks.');
        s.body.appendChild(none); steps.push([none, 300]);
      }
      steps.forEach(function (st2) { st2[0].hidden = true; });
      var ok = btn('.btn.primary.big.block', { testid: 'btn-results-ok', hidden: true, onclick: next }, nextLabel);
      var skip = btn('.btn.ghost.block', { testid: 'btn-results-skip', onclick: function (e) { e.stopPropagation(); revealAll(); } }, 'Skip ▸▸');
      ui.append(s.foot, [skip, ok]);
      var k = 0;
      function revealOne() {
        var step = steps[k++];
        step[0].hidden = false; step[0].classList.add('rv');
        if (step[2]) step[2]();
        if (step[0].scrollIntoView) step[0].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
      function done() { skip.hidden = true; ok.hidden = false; }
      function tick() {
        s.data._timer = null;
        if (k >= steps.length) return done();
        revealOne();
        if (k >= steps.length) return done();
        s.data._timer = setTimeout(tick, steps[k][1]);
      }
      function revealAll() {
        if (s.data._timer) clearTimeout(s.data._timer);
        s.data._timer = null;
        while (k < steps.length) { var step = steps[k++]; step[0].hidden = false; if (step[2] && k === steps.length) step[2](); }
        done();
        if (gigEl && gigEl.scrollIntoView) gigEl.scrollIntoView({ block: 'start' });   // skip lands on the gig, the week's big moment
      }
      s.body.onclick = revealAll;
      if (d.instant) revealAll(); else s.data._timer = setTimeout(tick, 200);
    },
    onClose: function (s) { if (s.data._timer) clearTimeout(s.data._timer); }
  });

  /* ======================================================================================================
     Week wrap
     ====================================================================================================== */
  var YEAR_FALLBACK = ['Another year in {space}. Everybody is still here. Mostly.', 'Year done. {front} wants a group photo. {deadpan} is already in it.'];
  var SUMMARY_LABELS = [['fans', 'Fans', U.fmtNum], ['fansGained', 'New fans', U.signed], ['fund', 'Fund', U.fmtMoney], ['earned', 'Earned', U.fmtMoney],
    ['gigs', 'Gigs', String], ['songsWritten', 'Songs written', String], ['parentsLoans', "Parents' loans", String], ['bestGrade', 'Best gig', String]];
  function yearPanel(w) {
    var ys = w.yearSummary || {};
    var grid = el('div.stat-grid');
    SUMMARY_LABELS.forEach(function (x) { if (ys[x[0]] != null) grid.appendChild(el('div', [el('span.caps', x[1]), el('b', x[2](ys[x[0]]))])); });
    var line = ys.line && ui.ownLines([ys.line]).length ? ys.line : ui.line(ui.lines('yearEnd'), YEAR_FALLBACK);   // v0.9: the band's pool
    return el('div.year-end', { testid: 'year-end' }, [el('div.yh', 'Year ' + (ys.year || w.year) + ' in the books'),
      line ? el('p', { style: 'margin-top:6px' }, fill(line)) : null, grid]);
  }
  function chatList(msgs) {
    return el('div', msgs.filter(function (m) { return ui.chatOk(m); }).map(function (m) {
      if (ui.chatMsg) return ui.chatMsg(m);
      var who = ui.who(m.who);
      return el('div.msg', [el('span.w', { style: { color: who.text } }, who.short),
        el('div.t', { style: { borderLeftColor: who.color } }, fill(m.text))]);
    }));
  }
  function savedText() {
    var ls = GG.main.lastSave;
    if (!ls) return ['Saving…', ''];
    if (!ls.ok) return [GG.save && GG.save.storageOk === false ? 'Saved (this tab only)' : 'Save failed', 'fail'];
    return ['✓ Saved', 'ok'];
  }
  ui.define('wrap', {
    kind: 'sheet', sticky: true,
    build: function (s, d) {
      var st = S(), w = d.wrap || (st && st.wrap);
      if (!w) { s.foot.appendChild(btn('.btn.primary.big.block', { testid: 'btn-next-week', onclick: GG.main.nextWeek }, 'Next week')); return; }
      s.setTitle('Week ' + w.week + ' wrap', 'YEAR ' + w.year);
      var parts = [];
      parts.push(el('div', { testid: 'wrap-deltas' }, [el('div.caps', { style: 'margin-bottom:6px' }, 'This week'), ui.deltaChips(w.deltas, { emptyText: 'A perfectly flat week.', testid: 'wrap-d-' })]));   // v1.0: stat testids (lessons)
      var ll = el('div.line-list.panel');
      if (w.upkeep) ll.appendChild(el('div', { testid: 'wrap-upkeep' }, [el('span', 'Upkeep (strings, gas, pizza)'), el('span.bad', '−' + U.fmtMoney(w.upkeep))]));
      if (w.buzzDecay) ll.appendChild(el('div', { testid: 'wrap-buzz-fade' }, [el('span', 'Buzz fades'), el('span.bad', '−' + Math.abs(w.buzzDecay))]));
      if (st && st.debtToParents) ll.appendChild(el('div', { testid: 'wrap-owed' }, [el('span', 'Owed to your parents'), el('span', U.fmtMoney(st.debtToParents))]));
      if (ll.children.length) parts.push(ll);
      if (w.parentsLoan) {
        parts.push(el('div.panel.alert', { testid: 'wrap-loan' }, [el('div.row', [el('span', { style: 'font-size:24px' }, '🏠'), el('div.grow', [
          el('div', { style: 'font-weight:800' }, "Your parents spotted you " + U.fmtMoney(w.parentsLoan)),
          el('div.small.dim', 'The band fund hit zero. It happens. It keeps happening.')])]),
          w.guilt ? el('div.quote', { style: 'margin-top:10px;font-size:14px' }, fill(w.guilt)) : null]));
      }
      (w.milestones || []).forEach(function (m) { parts.push(el('div.panel.warm.row', [el('span', { style: 'font-size:24px' }, '🏆'), el('div.grow', { style: 'font-weight:700' }, fill(m))])); });
      if (ui.dramaWrap) parts.push.apply(parts, ui.dramaWrap(w));   // v0.4: protection ended, warnings, storyline news
      if (ui.labelWrap) parts.push.apply(parts, ui.labelWrap(w));   // v0.5: offers, release day, charts, certs, royalties
      if (ui.rivalWrap) parts.push.apply(parts, ui.rivalWrap(w));   // v0.6: rival news, showdowns, heat, cracks
      if (ui.tourWrap) parts.push.apply(parts, ui.tourWrap(w));     // v0.7: on tour, calls home, unlocks, invites, the Gong, home
      if (ui.shopWrap) parts.push.apply(parts, ui.shopWrap(w));     // v0.8: rent, Outro/Solo + merch unlocks, eviction, the collector's item
      if (ui.licenseWrap) parts.push.apply(parts, ui.licenseWrap(w));   // v0.8.1: a licensing offer came in, offers that expired
      if (w.members && w.members.length) {
        var moods = el('div.panel', { testid: 'wrap-moods' }, [el('div.caps', { style: 'margin-bottom:2px' }, 'The band')]);
        w.members.forEach(function (m) {
          var who = ui.who(m.id), label = m.label || ui.moodLabel(m.mood);
          moods.appendChild(el('div.mood-row', { testid: 'wrap-mood-' + m.id }, [el('span.nm', { style: { color: who.text } }, who.short), ui.bar(m.mood, 100, { color: ui.moodColor(m.mood) }),
            el('span.lb', { style: { color: ui.moodColor(m.mood) } }, (m.stage >= 1 && ui.stageBadge ? '' : ui.moodEmoji(label) + ' ') + (m.stage >= 1 && ui.stageBadge ? ['😐', '😒', '⚠'][Math.min(3, m.stage) - 1] + ' ' : '') + label + (m.moodDelta ? ' ' + U.signed(m.moodDelta) : ''))]));
        });
        parts.push(moods);
      }
      if (w.chat && w.chat.length) parts.push(el('div', [el('div.caps', 'Group chat'), chatList(w.chat)]));
      if (w.yearEnd) parts.push(yearPanel(w));
      if (w.ended) parts.push(el('div.year-end', [el('div.yh', "That's a career"), el('p', (GG.legacy ? GG.legacy.yearsText(st) : 'Ten years.') + ' One ' + ui.space(st).replace(/^the /i, '') + '. Let\'s see how it went.')]));   // v1.0: bonus years
      ui.append(s.body, el('div.stack', parts));
      var t = savedText();
      var ind = el('span.saved' + (t[1] ? '.' + t[1] : ''), { testid: 'saved-indicator' }, t[0]);
      s.data._off = [GG.on('save:done', function () { ind.textContent = '✓ Saved'; ind.className = 'saved ok'; }),
        GG.on('save:failed', function () { var x = savedText(); ind.textContent = x[0]; ind.className = 'saved fail'; })];
      var recap = w.yearEnd && w.recap && ui.openRecap;   // v0.8.1: the year-end recap comes first, then the next year (or the end)
      ui.append(s.foot, [ind, btn('.btn.primary.big.grow', { testid: 'btn-next-week', onclick: function () {
        if (recap && !s.data._recapSeen) { s.data._recapSeen = true; ui.openRecap(w.recap.y, function () { GG.main.nextWeek(); }); }
        else GG.main.nextWeek();
      } }, recap ? 'Year in review →' : w.ended ? 'The end →' : 'Next week →')]);
      if (w.deltas && w.deltas.fund > 0) sfx('cash');
    },
    onShow: function (s) { if (ui.shopWrapShown) ui.shopWrapShown(s.data.wrap || (S() && S().wrap)); },   // v0.8: the misprint pays off
    onClose: function (s) { (s.data._off || []).forEach(function (off) { off(); }); }
  });

  // v1.0: the end-of-career screen ('end') moved to 5n_ui_ending.js (Lane E's end sequence).

  /* ======================================================================================================
     Hotspots: placeholders for later versions, gig board, trophies
     ====================================================================================================== */
  ui.define('soon', {
    kind: 'sheet',
    title: function (d) { return d.title; },
    build: function (s, d) {
      ui.append(s.body, el('div.stack', [
        el('div.center', { style: 'font-size:52px;line-height:1.1' }, d.icon || '🚧'),
        d.top || null,
        d.soon ? el('div.center', [el('span.tag.amber', d.soon)]) : null,
        d.text ? el('p.center', { style: 'font-size:16px' }, d.text) : null,
        d.quip ? el('p.center.dim.small', d.quip) : null
      ]));
      s.foot.appendChild(btn('.btn.block', { testid: 'btn-soon-ok', onclick: function () { ui.close(s.id); } }, 'Cool cool cool'));
    }
  });
  var MILESTONE_NAMES = { firstGig: 'First gig', firstSong: 'First song written', fund1000: 'First $1,000 in the fund' };
  function milestonesReached(st) {
    var out = [], ms = st.milestones;
    if (ms && typeof ms === 'object' && !Array.isArray(ms)) {
      Object.keys(ms).forEach(function (k) {
        var m = /^fans(\d+)$/.exec(k), f = /^fund(\d+)$/.exec(k);
        out.push({ text: MILESTONE_NAMES[k] || (m ? U.fmtNum(+m[1]) + ' fans' : f ? 'First ' + U.fmtMoney(+f[1]) + ' in the fund' : k), week: ms[k] });
      });
    } else {
      var s = st.stats || {};
      if (s.gigs) out.push({ text: 'First gig' });
      if (s.songsWritten) out.push({ text: 'First song written' });
      [50, 100, 250, 500, 1000].forEach(function (n) { if (st.fans >= n) out.push({ text: n + ' fans' }); });
    }
    return out;
  }
  function trophyTop(st) {
    var list = milestonesReached(st);
    if (!list.length) return el('p.center.dim', 'The shelf is empty. Room to grow.');
    return el('div.panel', list.map(function (m) {
      return el('div.row', { style: 'padding:6px 0' }, [el('span', '🏆'), el('span.grow', m.text), m.week ? el('span.small.faint', 'week ' + m.week) : null]);
    }));
  }
  var HOT = {
    kit: function () { ui.openSketch(); },
    merch: function () { if (ui.openMerch) return ui.openMerch(); },   // v0.8 (SHOPUI): the merch table (5k_ui_shop)
    door: function () { if (ui.showVan) return ui.showVan(); ui.show('soon', { title: ui.cap(ui.tokens().door), icon: '🚐', text: 'The van lives out here. It is not going anywhere today.' }); },
    trophies: function () { if (ui.defined('trophies')) return ui.show('trophies'); ui.show('soon', { title: 'Trophy shelf', icon: '🏆', top: trophyTop(S()), text: 'Real trophies (and gold records, and banned-venue photos) later.' }); },
    gigboard: function () {
      if (ui.openBoard) return ui.openBoard({ mode: 'view' });
      ui.show('soon', { title: 'Gig board', icon: '📌', top: gigBox(S(), true, function () { HOT.gigboard(); }), soon: 'Coming in v0.3',
        text: 'The full gig board arrives in v0.3. For now: put Book in a slot and hope.' });
    },
    plan: function () { ui.openPlanner(); },
    laptop: function () { ui.show('laptop'); }
  };
  ui.hotspot = function (action) {
    if (!S() || ui.stackIds().length) return false;   // ignore walks that finish while a screen is up
    var fn = HOT[action]; if (!fn) return false;
    fn(); return true;
  };
  GG.on('hotspot', function (p) { if (p) ui.hotspot(p.action); });

  var TAP_FALLBACK = ['…', 'Hey.', "Can't talk, busy being in a band.", 'Did you move my stuff?'];
  var TAP_SILENT = ['…', '(A nod. Maybe.)', '(Looks at you. Looks away. That was a whole conversation.)'];
  GG.on('member:tap', function (p) {
    var st = S(); if (!st || !p || ui.stackIds().length) return;
    var pool = (lines('tap') || {})[p.id];   // member-keyed (ids are unique across bands); silent members get stage directions
    var text = fill(ui.pick(pool && pool.length ? pool : ui.isSilent(p.id, st) ? TAP_SILENT : TAP_FALLBACK));
    var pos = null;
    try { pos = GG.render && GG.render.memberScreenPos ? GG.render.memberScreenPos(p.id) : null; } catch (e) { pos = null; }
    ui.bubble(text, pos, ui.who(p.id).short, p.id);
  });

  /* ======================================================================================================
     2D fallback garage (three.js or WebGL missing): hotspot + bandmate buttons over a CSS backdrop
     ====================================================================================================== */
  var SPOTS = [['plan', '📋', 'Whiteboard'], ['laptop', '💻', 'Laptop'], ['kit', '🥁', 'Drum kit'], ['gigboard', '📌', 'Gig board'],
    ['merch', '📦', 'Merch'], ['trophies', '🏆', 'Trophies'], ['door', '🚪', 'Door']];
  // v0.9: the backdrop is the band's own tier-0 room (sp-garage | sp-laundromat | sp-stripmall | sp-quonset, CSS in the
  // 00_shell v0.9 GENRES block): a garage door, a row of dryers, a shop window + till, a corrugated arch.
  function refreshFallback() {
    if (!fallback) return;
    var st = S(), kind = st ? ui.spaceKind(st) : 'garage';
    fallback.classList.toggle('hidden', !st);
    if (fallback.dataset.space !== kind) {
      fallback.className = fallback.className.replace(/\bsp-\w+/g, '').trim() + ' sp-' + kind;
      fallback.dataset.space = kind;
      if (fallback.noteEl) fallback.noteEl.textContent = 'The 3D ' + ui.space(st).replace(/^the /i, '') + " couldn't start on this device, so here's the budget version.";
    }
    ui.clear(fallback.mates);
    ((st && st.members) || []).forEach(function (m) {
      var who = ui.who(m.id);
      fallback.mates.appendChild(btn('', { testid: 'mate-' + m.id, onclick: function () { GG.emit('member:tap', { id: m.id }); } }, [ui.avatar(who, 'sm'), who.short]));
    });
  }
  ui.showFallback = function (sceneEl) {
    if (fallback || !sceneEl) return;
    var spots = el('div.spots', SPOTS.map(function (x) {
      return btn('', { testid: 'hs-' + x[0], onclick: function () { GG.emit('hotspot', { action: x[0] }); } }, [el('span', x[1]), x[2]]);
    }));
    fallback = el('div.fallback.spx', { testid: 'fallback-garage' }, [el('div.bulb'), el('div.door'), el('div.stain'),
      el('div.note', "The 3D garage couldn't start on this device, so here's the budget version."), spots]);
    fallback.noteEl = fallback.querySelector('.note');
    fallback.mates = el('div.mates');
    fallback.appendChild(fallback.mates);
    sceneEl.appendChild(fallback);
    refreshFallback();
  };

  /* ---- Init + listeners ------------------------------------------------------------------------------------- */
  ui.initWeek = function () { buildHud(); ui.refreshHud(); };
  // Called by GG.main.sync() after every state change: HUD, dock and the fallback garage's bandmates.
  ui.refreshGarage = function () { ui.refreshHud(); refreshFallback(); };
  GG.on('stats:changed', ui.refreshHud);
  GG.on('ui:stack', ui.refreshHud);
  GG.on('calendar:week', function () { setTimeout(ui.refreshHud, 0); });   // v0.6.1: new week, new weather
  GG.on('career:new', ui.refreshGarage);
  GG.on('career:loaded', ui.refreshGarage);
})(window.GG);
