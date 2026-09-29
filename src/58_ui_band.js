// 58_ui_band.js: v0.4 drama UI. The laptop Band tab's band section (pay-the-band slider with a live preview, member
// cards with mood + grievance-stage badge + current want, holes with Post an ad / Hire a fill-in, storylines of members
// who are away or gone, rival watch), the recruit screen (three candidate cards: stars, trait, quirk, hometown, asking
// cut, chemistry meter; Hire / Re-post / Close), tone-aware group-chat bubbles and the wrap's drama panels.
//   GG.ui.bandPanel(state, rerender) -> node ; GG.ui.openRecruit() ; GG.ui.chatMsg(msg) -> node ; GG.ui.dramaWrap(wrap) -> [node]
//   Screen 'recruit' (sheet, tall). testids: pay-slider, pay-preview, member-<id>, stage-<id>, want-<id>, hole-<slug>,
//   btn-post-ad-<slug>, btn-open-ad-<slug>, btn-fillin-<slug>, btn-dismiss-<slug>, gone-<id>, rival-watch,
//   recruit-card-<i>, btn-hire-<i>, btn-repost, btn-recruit-close, wrap-warnings, wrap-drama, wrap-protection.
(function (GG) {
  var ui = GG.ui, el = ui.el, btn = ui.btn, U = GG.util;
  function S() { return GG.state; }
  function Dr() { return GG.drama; }
  function fill(t) { return t && GG.career && S() ? GG.career.fillText(S(), t) : (t || ''); }
  function slug(r) { return String(r).toLowerCase().replace(/[^a-z0-9]+/g, '-'); }
  function pct(v) { return Math.round((v || 0) * 100) + '%'; }
  function first(n) { return String(n || '').split(' ')[0]; }

  var CSS = [
    '.pay-panel input[type=range] { width: 100%; height: 44px; margin: 4px 0 0; accent-color: var(--amber); touch-action: pan-y; }',
    '.pay-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }',
    '.pay-head b { font: 900 22px var(--display); color: var(--amber); }',
    '.pay-prev { font-size: 13px; line-height: 1.35; color: var(--text); } .pay-prev .dim { display: block; font-size: 12px; }',
    '.stage-tag { display: inline-block; padding: 2px 8px; border-radius: 99px; font: 800 10px/1.6 var(--font); letter-spacing: .05em; text-transform: uppercase; white-space: nowrap; }',
    '.stage-1 { color: #ffd9a0; background: rgba(255, 179, 71, .14); border: 1px solid rgba(255, 179, 71, .4); }',
    '.stage-2 { color: #ffb08a; background: rgba(255, 138, 76, .16); border: 1px solid rgba(255, 138, 76, .5); }',
    '.stage-3 { color: #fff; background: var(--red); border: 1px solid var(--red); }',
    '.mem-card.s2 { border-color: #7a4a36; } .mem-card.s3 { border-color: var(--red); box-shadow: 0 0 0 1px var(--red) inset; }',
    '.mem-want { font-size: 12px; line-height: 1.35; color: var(--dim); margin-top: 6px; } .mem-want b { color: var(--text); }',
    '.mem-gripe { font-size: 12px; color: #ffb08a; margin-top: 4px; }',
    '.stars { color: var(--amber); letter-spacing: 1px; white-space: nowrap; } .stars i { color: var(--line); font-style: normal; }',
    '.hole-card { padding: 12px; border-radius: 14px; margin-bottom: 8px; border: 1px dashed #6d5a4a; background: repeating-linear-gradient(135deg, #1b2030, #1b2030 10px, #1e2234 10px, #1e2234 20px); }',
    '.hole-card .btn { margin-top: 8px; }',
    '.gone-card { padding: 10px 12px; border-radius: 14px; margin-bottom: 8px; background: #191d2b; border: 1px solid #2c3552; opacity: .9; }',
    '.rival-watch { border-color: #6d2f3a; background: #22151c; }',
    '.rc-card { padding: 12px; border-radius: 14px; background: linear-gradient(160deg, #262232, #1b2033); border: 1px solid #4a4150; margin-bottom: 10px; }',
    '.rc-top { display: flex; gap: 10px; align-items: center; }',
    '.rc-name { font-weight: 800; font-size: 16px; line-height: 1.2; } .rc-sub { font-size: 12px; color: var(--dim); }',
    '.rc-line { font-size: 13px; line-height: 1.35; margin-top: 6px; } .rc-line .k { color: var(--faint); font: 800 10px var(--font); letter-spacing: .08em; text-transform: uppercase; margin-right: 4px; }',
    '.rc-chem { display: grid; grid-template-columns: 78px 1fr 34px; gap: 8px; align-items: center; font-size: 12px; color: var(--dim); margin-top: 8px; }',
    '.rc-chem b { color: var(--text); text-align: right; }',
    '.rc-ad { font-style: italic; color: var(--dim); font-size: 13px; line-height: 1.4; margin: 0 0 10px; padding: 10px 12px; background: #f3efe6; color: #2a2016; border-radius: 4px; transform: rotate(-.6deg); }',
    '.msg.pa .t { border-left-color: var(--bad); font-style: italic; background: #2c2230; }',
    '.msg.grumble .t { border-left-color: #ff8a4c; }',
    '.msg.news .t { border-left-color: var(--purple); background: #231f33; }',
    '.msg .tone { font: 800 9px/1 var(--font); letter-spacing: .08em; text-transform: uppercase; color: var(--bad); margin: 3px 0 0 4px; }',
    '.warn-row { display: flex; gap: 8px; align-items: flex-start; font-size: 14px; line-height: 1.35; padding: 5px 0; }',
    '.warn-row .ic { flex: 0 0 22px; text-align: center; }'
  ].join('\n');
  (function inject() {
    if (typeof document === 'undefined' || document.getElementById('gg-css-band')) return;
    var st = document.createElement('style'); st.id = 'gg-css-band'; st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  })();

  var STAGE = { 1: ['😐', 'grumbling'], 2: ['😒', 'passive-aggressive'], 3: ['⚠', 'ultimatum'] };
  ui.stageBadge = function (stage, id) {
    var s = STAGE[stage];
    return s ? el('span.stage-tag.stage-' + stage, id ? { testid: 'stage-' + id } : {}, s[0] + ' ' + s[1]) : null;
  };
  function stars(n) { var out = []; for (var i = 1; i <= 5; i++) out.push(i <= n ? '★' : el('i', '★')); return el('span.stars', { title: n + ' stars' }, out); }
  function kv(label, value, color, right) {
    return el('div.kv', [el('span', label), ui.bar(value, 100, { color: color }), el('b', right != null ? right : String(Math.round(value)))]);
  }
  function chemColor(c) { return c >= 65 ? 'var(--good)' : c >= 40 ? 'var(--amber)' : 'var(--bad)'; }

  /* ---- Pay the band ------------------------------------------------------------------------------------ */
  function payPanel(st) {
    var D = Dr(), E = D.cfg(), cut = D.payCut(st), gig = st.lastGig && st.lastGig.pay > 0 ? st.lastGig.pay : 100;
    var expect = Math.round((E.expectCut + Math.min(E.expectCutMax, st.fans * E.expectCutPerFan)) * 20) / 20;
    var val = el('b', pct(cut)), prev = el('div.pay-prev', { testid: 'pay-preview' });
    function preview(c) {
      var sp = D.split(st, gig);
      ui.clear(prev);
      ui.append(prev, ['Members get ' + U.fmtMoney(sp.cut) + ' of a ' + U.fmtMoney(gig) + ' gig; the fund keeps ' + U.fmtMoney(sp.band) + '.',
        el('span.dim', c + 0.001 < expect ? 'They expect about ' + pct(expect) + '. Expect grumbling.' : c > expect + 0.12 ? 'Generous. Moods go up, the fund goes down.' : 'About what they expect (' + pct(expect) + ').')]);
    }
    var slider = el('input', { type: 'range', min: '0', max: String(Math.round(E.payCutMax * 100)), step: '5', value: String(Math.round(cut * 100)),
      testid: 'pay-slider', 'aria-label': 'Pay the band',
      oninput: function (e) { var v = D.setPayCut(st, +e.target.value / 100); val.textContent = pct(v); preview(v); } });
    preview(cut);
    return el('div.panel.pay-panel', [el('div.pay-head', [el('span.caps', 'Pay the band (share of gig pay)'), val]), slider, prev]);
  }

  /* ---- Members, holes, the departed -------------------------------------------------------------------- */
  function memberCard(st, m) {
    var D = Dr(), who = ui.who(m.id), stage = m.stage || 0, kids = [];
    kids.push(el('div.row', [ui.avatar(who), el('div.grow', [el('div', { style: 'font-weight:800' }, who.full || who.name + (who.nick ? ' "' + who.nick + '"' : '')),
      el('div.small.dim', [m.role || '', m.recruit ? ' · recruit' : ''])]), ui.stageBadge(stage, m.id)]));
    kids.push(kv('Skill', m.skill, 'var(--blue)'));
    kids.push(kv('Mood', m.mood, ui.moodColor(m.mood), ui.moodEmoji(ui.moodLabel(m.mood))));
    var w = D.want(st, m);
    if (w) kids.push(el('div.mem-want', { testid: 'want-' + m.id }, [el('b', 'Wants: '), fill(w.text)]));
    if (m.recruit) {
      var r = m.recruit, t = D.traitDef(r.trait), q = D.quirk(r.quirk);
      kids.push(el('div.mem-want', { testid: 'want-' + m.id }, [stars(r.stars || 1), ' · from ' + (r.hometown || '?') + ' · asks ' + pct(r.askingCut)]));
      if (t) kids.push(el('div.mem-want', [el('b', t.name + ': '), t.effect]));
      if (q) kids.push(el('div.mem-want', [el('b', 'Quirk: '), q.text]));
    }
    if (m.changed) kids.push(el('div.mem-want', [el('b', 'Changed: '), fill(m.changed)]));
    if (stage >= 1) kids.push(el('div.mem-gripe', stage >= 3 ? 'Has an ultimatum for you on Monday.' : 'On about ' + D.gripeText(st, m) + '.'));
    return el('div.mem-card' + (stage >= 2 ? '.s' + Math.min(3, stage) : ''), { testid: 'member-' + m.id }, kids);
  }
  function holeCard(st, role, rerender) {
    var D = Dr(), E = D.cfg(), sl = slug(role), f = (st.fillIns || {})[role], ad = st.recruitAd && st.recruitAd.role === role ? st.recruitAd : null;
    var kids = [el('div.row', [el('span', { style: 'font-size:24px' }, '🕳️'), el('div.grow', [el('div', { style: 'font-weight:800' }, 'Empty: ' + role),
      el('div.small.dim', f ? 'Covered by ' + f.name + ' (' + U.fmtMoney(f.costPerGig) + ' a gig, no chemistry to speak of).' : 'Playing with a hole: worse gigs until someone fills it.')])])];
    if (ad) kids.push(btn('.btn.primary.small.block', { testid: 'btn-open-ad-' + sl, onclick: function () { ui.openRecruit(); } }, 'See the ' + ad.candidates.length + ' replies to your ad'));
    else kids.push(btn('.btn.primary.small.block', { testid: 'btn-post-ad-' + sl, disabled: st.fund < E.adCost,
      onclick: function () { if (D.postAd(S(), role)) { GG.main.sync(); ui.openRecruit(); } } }, 'Post an ad (' + U.fmtMoney(E.adCost) + ')'));
    if (f) kids.push(btn('.btn.small.block', { testid: 'btn-dismiss-' + sl, onclick: function () { D.dismissFillIn(S(), role); GG.main.sync(); rerender(); } }, 'Let ' + first(f.name) + ' go'));
    else kids.push(btn('.btn.small.block', { testid: 'btn-fillin-' + sl, onclick: function () {
      var x = D.hireFillIn(S(), role); GG.main.sync(); rerender(); if (x) ui.toast(x.name + ' will cover ' + role + ' for ' + U.fmtMoney(x.costPerGig) + ' a gig.', { who: 'Fill-in' });
    } }, 'Hire a fill-in (' + U.fmtMoney(E.fillInCost) + ' a gig)'));
    return el('div.hole-card', { testid: 'hole-' + sl }, kids);
  }
  function goneCard(st, m) {
    var x = m.exit || {}, dd = GG.content.drama && GG.content.drama.members && GG.content.drama.members[m.id], who = ui.who(m.id);
    var rv = GG.content.rivals && GG.career.band(st) && GG.content.rivals[GG.career.band(st).rival];
    var text = x.storyline === 'rival' ? 'Joined ' + (rv ? rv.name : 'your rival') + '. Sends a polite card at Christmas.'
      : (dd && dd.exit && dd.exit.status) || 'Gone. No forwarding address.';
    var since = x.since ? ' · gone since week ' + ((x.since - 1) % GG.contracts.WEEKS_PER_YEAR + 1) + ', year ' + (Math.floor((x.since - 1) / GG.contracts.WEEKS_PER_YEAR) + 1) : '';
    return el('div.gone-card', { testid: 'gone-' + m.id }, [el('div.row', [ui.avatar(who, 'sm'), el('div.grow', [
      el('div', { style: 'font-weight:800' }, who.name + ' · ' + (m.status === 'away' ? 'away' : x.storyline === 'rival' ? 'with the rival' : 'quit')),
      el('div.small.dim', fill(text) + since)])])]);
  }
  // The band section of the laptop's Band tab (members, pay, holes, the departed, rival watch).
  ui.bandPanel = function (st, rerender) {
    var D = Dr(); rerender = rerender || function () {};
    if (!D) return el('div');
    var out = [payPanel(st)];
    D.active(st).forEach(function (m) { out.push(memberCard(st, m)); });
    D.holes(st).forEach(function (r) { out.push(holeCard(st, r, rerender)); });
    (st.members || []).filter(function (m) { return m.status !== 'active'; }).forEach(function (m) { out.push(goneCard(st, m)); });
    var blurb = (st.rivalDefectors || []).length ? D.rivalBlurb(st) : null;
    if (blurb) out.push(el('div.panel.rival-watch', { testid: 'rival-watch' }, [el('div.caps', 'Rival watch'), el('p.small', { style: 'margin:6px 0 0' }, fill(blurb))]));
    return el('div.stack.tight', out);
  };

  /* ---- The recruit screen ------------------------------------------------------------------------------ */
  function candidateCard(st, c, i, s) {
    var D = Dr(), t = D.traitDef(c.trait), q = D.quirk(c.quirk), who = { name: c.name, color: c.look && c.look.shirt || '#4f8cff' };
    return el('div.rc-card', { testid: 'recruit-card-' + i }, [
      el('div.rc-top', [ui.avatar(who), el('div.grow', [el('div.rc-name', c.name + (c.nick ? ' "' + c.nick + '"' : '')),
        el('div.rc-sub', ['From ' + c.hometown + ' · ', stars(c.stars)])])]),
      t ? el('div.rc-line', [el('span.k', 'Trait'), el('b', t.name), ' — ' + t.effect]) : null,
      q ? el('div.rc-line', [el('span.k', 'Quirk'), q.text]) : null,
      el('div.rc-line', [el('span.k', 'Asks'), pct(c.askingCut) + ' of gig pay' + (c.askingCut > D.payCut(st) + 0.001 ? ' (more than you pay now)' : '')]),
      el('div.rc-chem', [el('span', 'Chemistry'), ui.bar(c.chemistry, 100, { color: chemColor(c.chemistry) }), el('b', String(c.chemistry))]),
      btn('.btn.primary.small.block', { testid: 'btn-hire-' + i, style: 'margin-top:10px', onclick: function () {
        var m = D.hire(S(), i);
        if (!m) return;
        GG.main.sync();
        ui.close(s.id);
        if (ui.isOpen('laptop')) ui.show('laptop', { tab: 'band' });
        ui.toast(first(m.name) + ' is in. Welcome to the garage.', { who: 'Hail to the new ' + m.role, kind: 'good' });
      } }, 'Hire ' + first(c.name))
    ]);
  }
  ui.define('recruit', {
    kind: 'sheet', tall: true,
    build: function (s) {
      var st = S(), D = Dr(), ad = st && st.recruitAd;
      s.setTitle('Kijiji + the corkboard', ad ? 'WANTED: ' + String(ad.role).toUpperCase() + ' · POST #' + ad.posts : 'NO AD POSTED');
      if (!ad) { s.body.appendChild(el('p.dim', 'No ad up right now.')); }
      else {
        var genre = st.genre || 'metal';
        s.body.appendChild(el('div.rc-ad', "'" + genre.charAt(0).toUpperCase() + genre.slice(1) + ' band seeks ' + ad.role + '. Garage. Snacks. Sometimes heat. No drama (lol).' +
          "' Three replies came in:"));
        ad.candidates.forEach(function (c, i) { s.body.appendChild(candidateCard(st, c, i, s)); });
      }
      var E = D.cfg();
      ui.append(s.foot, el('div.row', [
        btn('.btn.grow', { testid: 'btn-recruit-close', onclick: function () { ui.close(s.id); } }, 'Close'),
        btn('.btn.grow', { testid: 'btn-repost', disabled: !ad || st.fund < E.repostCost, onclick: function () {
          if (D.repost(S())) { GG.main.sync(); s.rerender(); s.body.scrollTop = 0; }
        } }, 'Re-post (' + U.fmtMoney(E.repostCost) + ')')]));
    },
    onClose: function () { if (ui.isOpen('laptop')) ui.show('laptop', { tab: 'band' }); }
  });
  ui.openRecruit = function () { return ui.show('recruit'); };

  /* ---- Chat bubbles + the wrap -------------------------------------------------------------------------- */
  var TONE = { pa: 'passive-aggressive', grumble: '', news: '' };
  ui.chatMsg = function (m) {
    var who = ui.who(m.who);
    return el('div.msg' + (m.tone ? '.' + m.tone : ''), [el('span.w', { style: { color: who.text } }, who.short),
      el('div.t', { style: m.tone ? null : { borderLeftColor: who.color } }, fill(m.text)), TONE[m.tone] ? el('span.tone', TONE[m.tone]) : null]);
  };
  ui.dramaWrap = function (w) {
    var out = [];
    if (w.protectionEnded) {
      var txt = GG.content.drama && GG.content.drama.protectionToast;
      out.push(el('div.panel.alert.row', { testid: 'wrap-protection' }, [el('span', { style: 'font-size:24px' }, '🌅'),
        el('div.grow', [el('div', { style: 'font-weight:800' }, 'Local heroes on the horizon'), el('div.small.dim', fill(txt || 'People can quit now. Warnings first.'))])]));
    }
    if (w.warnings && w.warnings.length) out.push(el('div.panel', { testid: 'wrap-warnings' }, [el('div.caps', 'Trouble in the band')].concat(w.warnings.map(function (x) {
      return el('div.warn-row', [el('span.ic', STAGE[x.stage] ? STAGE[x.stage][0] : '•'), el('div.grow', x.text)]);
    }))));
    if (w.drama && w.drama.length) out.push(el('div.panel.warm', { testid: 'wrap-drama' }, [el('div.caps', 'Meanwhile…')].concat(w.drama.map(function (t) {
      return el('p.small', { style: 'margin:6px 0 0' }, fill(t));
    }))));
    return out;
  };

  // Fill-in figures (garage/stage ids 'fill_<role>') get their real names in bubbles and chips.
  var baseWho = ui.who;
  ui.who = function (id, state) {
    var st = state || S();
    if (typeof id === 'string' && id.indexOf('fill_') === 0 && Dr() && st) {
      var f = Dr().fillInFigures(st).filter(function (x) { return x.id === id; })[0];
      if (f) { var w = baseWho(id, st); w.name = f.name; w.short = first(f.name); w.role = f.role + ' (fill-in)'; return w; }
    }
    return baseWho(id, state);
  };

  GG.registerDebug('band', function () {
    var st = S();
    return { recruit: ui.isOpen('recruit'), ad: st && st.recruitAd ? st.recruitAd.candidates.length : 0, payCut: st ? st.payCut : null };
  });
})(window.GG);
