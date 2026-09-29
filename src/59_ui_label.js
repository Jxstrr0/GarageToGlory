// 59_ui_label.js: v0.5 "Signed" — record labels. Also the shared v0.5 UI helpers (GG.ui.v5) used by 59b (studio)
// and 59c (reviews, charts, Loonies): guarded GG.labels calls, tolerant content lookups, week labels, the label logo.
//   GG.ui.openOffers(labelId?) ; GG.ui.labelPanel(state, rerender) -> node (laptop Label tab) ; GG.ui.openDeal(done?)
//   Screens: 'label-offer' (sheet, tall: one offer at a time, tabs when several), 'label-deal' (full: the contract).
//   testids: offer-card, offer-tab-<labelId>, btn-sign, btn-pass, btn-diy, offer-terms, offer-demands, deal-paper,
//   btn-deal-done, label-status, recoup-bar, deal-deadline, demand-<i>, label-offers, btn-view-offer-<labelId>, label-none.
// Sim calls (all guarded; a missing call shows a toast): labels.offers, sign, decline, goDIY, dealStatus.
(function (GG) {
  var ui = GG.ui, el = ui.el, btn = ui.btn, U = GG.util, C = GG.contracts;
  var V = ui.v5 = ui.v5 || {};
  function S() { return GG.state; }
  V.S = S;
  V.fill = function (t) { return t && GG.career && GG.career.fillText && S() ? GG.career.fillText(S(), String(t)) : (t || ''); };
  V.sfx = function (n) { if (GG.audio && GG.audio.sfx) GG.audio.sfx(n); };
  V.sync = function () { if (GG.main && GG.main.sync) GG.main.sync(); else if (ui.refreshHud) ui.refreshHud(); };

  /* ---- Guarded sim calls ------------------------------------------------------------------------------ */
  V.api = function (name) { var L = GG.labels; return L && typeof L[name] === 'function' ? L[name] : null; };
  V.call = function (name) {
    var f = V.api(name); if (!f) return undefined;
    var args = Array.prototype.slice.call(arguments, 1);
    try { return f.apply(GG.labels, args); } catch (e) { console.error('[v0.5 ui] labels.' + name + ' failed', e); return undefined; }
  };
  V.need = function (name) {
    if (V.api(name)) return true;
    ui.toast("The label's fax machine is down. (" + name + ')', { kind: 'bad' });
    return false;
  };

  /* ---- Content (tolerant of { labels, studios, producers } or flat maps) ---------------------------------- */
  function content() { return GG.content || {}; }
  function asList(x) { if (!x) return []; if (Array.isArray(x)) return x; return Object.keys(x).map(function (k) { var v = x[k]; if (v && typeof v === 'object' && !v.id) v.id = k; return v; }); }
  function byId(list, id) { for (var i = 0; i < list.length; i++) if (list[i] && list[i].id === id) return list[i]; return null; }
  var LABEL_FALLBACK = {
    gopherwood: { id: 'gopherwood', name: 'Gopherwood Records', kind: 'indie', blurb: 'An indie out of a Saskatoon basement. Small advance, fair cut, total creative freedom.' },
    monolith: { id: 'monolith', name: 'Monolith Records', kind: 'major', blurb: 'A major. Huge advance, tiny cut, and opinions about everything.' },
    diy: { id: 'diy', name: 'DIY', kind: 'diy', blurb: 'No label. Keep everything. Pay for everything.' }
  };
  V.labelDefs = function () {
    var c = content().labels, m = c && c.labels && typeof c.labels === 'object' && !c.labels.id ? c.labels : c;
    return m && typeof m === 'object' ? m : LABEL_FALLBACK;
  };
  V.labelDef = function (id) {
    var m = V.labelDefs(), d = (m && m[id]) || LABEL_FALLBACK[id] || { id: id, name: id || 'A label' };
    if (!d.kind) d.kind = id === 'monolith' ? 'major' : id === 'diy' ? 'diy' : 'indie';
    return d;
  };
  V.studios = function () { var c = content(); return asList(c.studios || (c.labels && c.labels.studios)); };
  V.producers = function () { var c = content(); return asList(c.producers || (c.labels && c.labels.producers)); };
  V.studioDef = function (id) { return byId(V.studios(), id) || { id: id, name: id ? String(id).replace(/_/g, ' ') : 'A studio' }; };
  V.producerDef = function (id) { return byId(V.producers(), id) || { id: id, name: id ? String(id).replace(/_/g, ' ') : 'Nobody' }; };
  var OUTLET_FALLBACK = {
    rolling_scone: { name: 'Rolling Scone', scale: 5, decimals: 0 }, proclaim: { name: 'Proclaim!', scale: 10, decimals: 0 },
    pitchspork: { name: 'Pitchspork', scale: 10, decimals: 1 }, deci_hell: { name: 'Deci-Hell', scale: 100, decimals: 0 },
    tailgate_weekly: { name: 'Tailgate Weekly', scale: 5, decimals: 0 }
  };
  V.outletDef = function (id) {
    var c = content(), src = c.outlets || (c.reviews && c.reviews.outlets) || c.reviews, d = null;
    if (src) d = Array.isArray(src) ? byId(src, id) : src[id];
    var fb = OUTLET_FALLBACK[id] || { name: id, scale: 10, decimals: 0 };
    d = d && typeof d === 'object' ? d : {};
    return { id: id, name: d.name || fb.name, scale: d.scale || fb.scale, decimals: d.decimals != null ? d.decimals : fb.decimals, voice: d.voice || '', unit: d.unit || null, caps: !!d.caps, critic: d.critic || '' };
  };
  V.awards = function () { return content().awards || {}; };
  V.words = function () { var c = content(); return c.albumWords || c.album_words || c.albumwords || {}; };
  V.pool = function (x) { return asList(x); };

  /* ---- Small shared bits -------------------------------------------------------------------------------- */
  V.weekLabel = function (tw) {
    tw = Math.max(1, tw | 0); var W = C.WEEKS_PER_YEAR;
    return 'Year ' + (Math.floor((tw - 1) / W) + 1) + ' · Week ' + (((tw - 1) % W) + 1);
  };
  V.weeksLeft = function (tw) { var st = S(); return st ? tw - st.totalWeek : 0; };
  V.bandName = function (st) { st = st || S(); var b = GG.content.bands && st && GG.content.bands[st.bandId]; return (b && b.name) || 'The band'; };
  V.song = function (id, st) { st = st || S(); return st && GG.songs && GG.songs.byId ? GG.songs.byId(st, id) : (st && (st.songs || []).filter(function (s) { return s.id === id; })[0]) || null; };
  V.songTitle = function (id) { var s = V.song(id); return s ? s.title : '(a lost song)'; };
  V.pct = function (v) { v = +v || 0; return (v <= 1 ? Math.round(v * 100) : Math.round(v)) + '%'; };
  V.seedOf = function (str) { return GG.hashSeed(String(str)); };
  V.eraName = function (era) { return { garage: 'Garage', local: 'Local Heroes', signed: 'Signed', world: 'World Stage' }[era] || era || 'Garage'; };
  V.logo = function (id, size) {
    var d = V.labelDef(id), icon = { gopherwood: '🐿', monolith: '▮', diy: '✂' }[id] || '♪';
    return el('div.lbl-logo.' + (id || 'x') + (size ? '.' + size : ''), { title: d.name }, [el('span.li', icon), el('span.ln', d.name.replace(/ Records$/, ''))]);
  };
  V.memberLine = function (preferred, lines) {   // a bandmate's one-liner (first active preferred member, else anyone)
    var st = S(), act = (st && st.members || []).filter(function (m) { return m.status === 'active'; });
    var m = null;
    for (var i = 0; i < preferred.length && !m; i++) m = act.filter(function (x) { return x.id === preferred[i]; })[0] || null;
    m = m || act[0] || null;
    var pool = lines[m && m.id] || lines.any || [];
    return m && pool.length ? { who: m.id, text: V.fill(ui.pick(pool)) } : null;
  };
  V.react = function (r) { return r ? el('div.react', [ui.avatar(r.who, 'sm'), el('div.t', [el('b', ui.who(r.who).short + ': '), r.text])]) : null; };

  /* ---- Offers --------------------------------------------------------------------------------------------- */
  V.offers = function (st) {
    st = st || S(); if (!st) return [];
    var o = V.call('offers', st);
    if (!Array.isArray(o)) o = (st.labelOffers || []).filter(function (x) { return x && (x.expires == null || x.expires >= st.totalWeek); });
    return o;
  };
  var REACT = {
    monolith: { marcel: ["They want me to sing in English? Non. Absolument non. ...How much is the advance?"],
      dana: ['A major label. My solo is going to be on the radio. Probably cut to four seconds, but still.'],
      jaxon: ['My baba says "monolith" means "one big rock". She says that is what they will leave on your grave.'],
      kenji: ['(Kenji reads the whole contract. He circles one clause. He does not tell you which.)'],
      any: ['That is a lot of zeros. Are they allowed to put that many zeros?'] },
    gopherwood: { dana: ['Their office is above a bait shop. I love it here.'],
      marcel: ['They said the cape is "a vibe". I trust them completely.'],
      jaxon: ['The owner gave me a granola bar. Unprompted. Sign it.'],
      any: ['Small advance, but they actually listened to the demo. Twice!'] },
    diy: { any: ['We keep everything! Also we pay for everything. Also what is a "distribution"?'] }
  };
  function termsGrid(o) {
    var def = V.labelDef(o.labelId);
    return el('div.stat-grid.offer-terms', { testid: 'offer-terms' }, [
      el('div', [el('span.caps', 'Advance'), el('b', U.fmtMoney(o.advance || 0))]),
      el('div', [el('span.caps', 'Your cut'), el('b', V.pct(o.royalty != null ? o.royalty : def.royalty || 0))]),
      el('div', [el('span.caps', 'Albums'), el('b', String(o.albums || def.albums || 1))]),
      el('div', [el('span.caps', 'Deadline'), el('b', (o.deadlineWeeks || def.deadlineWeeks || 48) + ' wks')]),
      el('div', [el('span.caps', 'Recoup'), el('b', o.advance ? 'Yes' : '—')]),
      el('div', [el('span.caps', '360 deal'), el('b.good', 'Never')])
    ]);
  }
  function demandsOf(o) {
    var def = V.labelDef(o.labelId), list = def.demands || [];
    return (o.demands || []).map(function (k) {
      var kind = typeof k === 'string' ? k : k.kind, d = byId(list.map(function (x) { return { id: x.kind, text: x.text }; }), kind);
      return { kind: kind, text: V.fill((k && k.text) || (d && d.text) || kind) };
    });
  }
  ui.openOffers = function (labelId) {
    var offers = V.offers();
    if (!offers.length) { ui.toast('No offers on the table. The phone is very quiet.'); return null; }
    return ui.show('label-offer', { labelId: labelId || offers[0].labelId });
  };
  ui.define('label-offer', {
    kind: 'sheet', tall: true, title: 'Label interest',
    build: function (s, d) {
      var st = S(); if (!st) return;
      var offers = V.offers(st);
      if (!offers.length) { s.body.appendChild(el('p.dim', { style: 'padding:20px 0' }, 'The offer expired. The label has moved on to a ska band.')); return; }
      var o = offers.filter(function (x) { return x.labelId === d.labelId; })[0] || offers[0], def = V.labelDef(o.labelId);
      s.setTitle(def.name, 'AN OFFER · ' + (def.kind === 'major' ? 'MAJOR LABEL' : 'INDIE LABEL'));
      if (offers.length > 1) s.body.appendChild(el('div', { style: 'margin-bottom:12px' }, ui.tabs(offers.map(function (x) {
        return { id: x.labelId, label: V.labelDef(x.labelId).name.replace(/ Records$/, '') };
      }), o.labelId, function (id) { s.rerender({ labelId: id }); }, 'offer-tab-')));
      var left = o.expires != null ? o.expires - st.totalWeek : null;
      var dem = demandsOf(o), r = V.memberLine(o.labelId === 'monolith' ? ['marcel', 'kenji'] : ['dana', 'jaxon'], REACT[o.labelId] || REACT.gopherwood);
      ui.append(s.body, el('div.offer-card.' + o.labelId, { testid: 'offer-card' }, [
        el('div.row', [V.logo(o.labelId), el('div.grow'), left != null ? el('span.tag' + (left <= 1 ? '.amber' : ''), left <= 0 ? 'expires this week' : 'expires in ' + left + ' wk' + (left === 1 ? '' : 's')) : null]),
        el('p.offer-blurb', V.fill(def.blurb || '')),
        termsGrid(o),
        el('div.caps', { style: 'margin:10px 0 4px' }, dem.length ? 'They want' : 'They want'),
        el('div.offer-demands', { testid: 'offer-demands' }, dem.length ? dem.map(function (x, i) {
          return el('div.demand', { testid: 'demand-' + i }, [el('span.ic', '⚑'), el('span', x.text)]);
        }) : el('div.demand', [el('span.ic', '☮'), el('span', 'Nothing. Creative freedom. It is a little suspicious.')])),
        el('p.fine', 'Fine print: the advance is recoupable. The label earns ' + U.fmtMoney(o.advance || 0) + ' back from your sales before a single royalty cheque. Miss the deadline or flop and they drop you. No 360 deals: your merch table stays yours.')
      ]));
      if (r) s.body.appendChild(V.react(r));
      s.body.appendChild(btn('.btn.ghost.block', { testid: 'btn-diy', style: 'margin-top:12px', onclick: goDIY }, 'Go DIY instead ✂'));
      ui.append(s.foot, [
        btn('.btn.ghost', { testid: 'btn-pass', onclick: function () {
          ui.confirm({ title: 'Pass on ' + def.name + '?', text: 'They will not call twice. Probably. Labels are like that.', yes: 'Pass', no: 'Wait' }).then(function (ok) {
            if (!ok || !V.need('decline')) return;
            V.call('decline', S(), o.labelId); V.sync();
            if (V.offers().length) s.rerender({}); else ui.close(s.id);
          });
        } }, 'Pass'),
        btn('.btn.primary.grow', { testid: 'btn-sign', onclick: function () {
          ui.confirm({ title: 'Sign with ' + def.name + '?', yes: 'Sign it', no: 'Not yet',
            text: U.fmtMoney(o.advance || 0) + ' up front (recoupable), ' + (o.albums || 1) + ' album' + ((o.albums || 1) > 1 ? 's' : '') + ' in ' + (o.deadlineWeeks || 48) + ' weeks. Marcel is already practising his autograph.' })
            .then(function (ok) {
              if (!ok || !V.need('sign')) return;
              var deal = V.call('sign', S(), o.labelId);
              if (!deal) { ui.toast('The pen ran out of ink. Nothing was signed.', { kind: 'bad' }); return; }
              V.sfx('cash'); V.sync();
              ui.close(s.id);
              ui.openDeal(d.done);
            });
        } }, 'Sign ✍')
      ]);
    }
  });
  function goDIY() {
    ui.confirm({ title: 'Go DIY?', yes: 'DIY forever', no: 'Hmm, no',
      text: 'No label. You keep every dollar, and you pay every dollar: studio, producer, promo. Jaxon has offered to "do the website".' })
      .then(function (ok) {
        if (!ok || !V.need('goDIY')) return;
        V.call('goDIY', S()); V.sync();
        if (ui.isOpen('label-offer')) ui.close('label-offer');
        ui.toast('You are your own label now. The fax machine is Kenji.', { kind: 'good' });
      });
  }
  V.goDIY = goDIY;

  /* ---- The contract (after signing) ------------------------------------------------------------------------ */
  ui.openDeal = function (done) { return ui.show('label-deal', { done: done }); };
  ui.define('label-deal', {
    kind: 'full', cls: 'deal',
    build: function (s, d) {
      var st = S(); if (!st || !st.label) return;
      var L = st.label, def = V.labelDef(L.labelId), p = st.player || {}, band = V.bandName(st);
      var dem = (L.demands || []).map(function (x) { return typeof x === 'string' ? { text: x } : x; });
      var clauses = [
        ['Advance', U.fmtMoney(L.advance || 0) + ', recoupable from sales. (It is a loan wearing a nice hat.)'],
        ['Royalty', 'The Band receives ' + V.pct(L.royalty || 0) + ' of every unit, once the advance is paid back.'],
        ['Albums', (L.albumsOwed || 1) + ' album' + ((L.albumsOwed || 1) > 1 ? 's' : '') + ', the first due by ' + V.weekLabel(L.deadline || st.totalWeek + 48) + '.'],
        ['Creative', dem.length ? dem.map(function (x) { return V.fill(x.text || x.kind); }).join(' ') : 'The Label will not interfere. The Label will, however, send muffins.'],
        ['Merch', 'No 360 deal. The merch table, the van and the cape remain the property of the Band (and Marcel, respectively).']
      ];
      ui.append(s.body, el('div.deal-paper', { testid: 'deal-paper' }, [
        el('div.deal-head', [V.logo(L.labelId, 'lg'), el('div.caps', 'Recording agreement')]),
        el('p.deal-parties', ['Between ', el('b', def.name), ' (“the Label”) and ', el('b', band), ' (“the Band”), of ' + (st.city || 'Saskatoon') + ', SK.']),
        el('ol.deal-clauses', clauses.map(function (c) { return el('li', [el('b', c[0] + '. '), c[1]]); })),
        el('div.deal-sign', [
          el('div.sig', [el('span.ink', p.name || 'You'), el('span.sl', 'The Band (drums, founder)')]),
          el('div.sig', [el('span.ink.label', def.name.split(' ')[0]), el('span.sl', 'The Label')])
        ]),
        el('div.deal-stamp', 'SIGNED')
      ]));
      var r = V.memberLine(['marcel', 'dana'], { marcel: ['I would like the record to show I signed first. In French.'], dana: ['We are SIGNED. I am telling my landlord.'], any: ['Signed! Somebody call our moms.'] });
      if (r) s.body.appendChild(V.react(r));
      s.foot.appendChild(btn('.btn.primary.big.block', { testid: 'btn-deal-done', onclick: function () { ui.close(s.id); } }, 'Frame it'));
    },
    onClose: function (s) { if (s.data && s.data.done) setTimeout(s.data.done, 0); }
  });

  /* ---- Laptop Label tab ------------------------------------------------------------------------------------ */
  V.dealStatus = function (st) {
    var L = st.label; if (!L) return null;
    var x = V.call('dealStatus', st) || {};
    var adv = L.advance || 0, rec = Math.min(adv, L.recouped || 0);
    return {
      labelId: L.labelId, advance: adv, recouped: rec, recoupLeft: x.recoupLeft != null ? x.recoupLeft : Math.max(0, adv - rec),
      recoupPct: adv ? rec / adv : 1, owed: L.albumsOwed || 0, delivered: L.albumsDelivered || 0,
      deadline: L.deadline, weeksLeft: L.deadline ? L.deadline - st.totalWeek : null, royalty: L.royalty, dropped: !!L.dropped,
      demands: (L.demands || []).map(function (x) { return typeof x === 'string' ? { kind: x, text: x } : x; })
    };
  };
  ui.labelPanel = function (st, rerender) {
    var out = [], L = st.label, era = st.era || 'garage';
    out.push(el('div.row.era-row', [el('span.caps', 'Era'), el('span.tag.amber', { testid: 'era-tag' }, V.eraName(era)),
      el('div.grow'), el('span.tiny.dim', (st.eraHistory || []).length > 1 ? 'since ' + V.weekLabel(st.eraHistory[st.eraHistory.length - 1].week) : '')]));
    if (L && !L.dropped && L.labelId !== 'diy') {
      var x = V.dealStatus(st), def = V.labelDef(L.labelId), wl = x.weeksLeft;
      out.push(el('div.panel.deal-card', { testid: 'label-status' }, [
        el('div.row', [V.logo(L.labelId), el('div.grow'), el('span.tag', def.kind === 'major' ? 'major' : 'indie')]),
        el('div.kv.wide', [el('span', 'Recouped'), el('div', { testid: 'recoup-bar' }, ui.bar(x.recouped, x.advance || 1, { color: x.recoupLeft ? 'var(--amber)' : 'var(--good)' })),
          el('b', x.recoupLeft ? U.fmtMoney(x.recouped) + ' / ' + U.fmtMoney(x.advance) : 'Paid off')]),
        el('p.tiny.dim', x.recoupLeft ? 'Royalties go to the label until ' + U.fmtMoney(x.recoupLeft) + ' more is earned back. Then it is cheque time.' : 'Advance recouped. Every sale now pays you ' + V.pct(x.royalty) + '.'),
        el('div.line-list', { style: 'margin-top:8px' }, [
          el('div', [el('span', 'Albums delivered'), el('span', x.delivered + ' of ' + (x.delivered + x.owed))]),
          el('div', [el('span', 'Your cut per unit'), el('span', V.pct(x.royalty))]),
          x.deadline ? el('div', { testid: 'deal-deadline' }, [el('span', 'Next album due'), el('span' + (wl != null && wl < 6 ? '.bad' : ''), V.weekLabel(x.deadline) + (wl != null ? ' (' + (wl < 0 ? 'late!' : wl + ' wks') + ')' : ''))]) : null
        ]),
        x.demands.length ? el('div', { style: 'margin-top:8px' }, [el('div.caps', 'Label demands')].concat(x.demands.map(function (dm, i) {
          return el('div.demand', { testid: 'demand-' + i }, [el('span.ic', '⚑'), el('span', V.fill(dm.text || dm.kind) + (dm.due ? ' · due ' + V.weekLabel(dm.due) : ''))]);
        }))) : null
      ]));
    } else if (L && L.labelId === 'diy' && !L.dropped) {
      out.push(el('div.panel.deal-card', { testid: 'label-status' }, [el('div.row', [V.logo('diy'), el('div.grow'), el('span.tag', 'no label')]),
        el('p.small', { style: 'margin-top:8px' }, 'You are your own label. You keep every dollar and pay for every studio hour. The fax machine is Kenji.')]));
    } else {
      out.push(el('div.panel', { testid: 'label-none' }, [
        el('div', { style: 'font-weight:800' }, L && L.dropped ? 'Dropped by ' + V.labelDef(L.labelId).name + '.' : 'No label yet.'),
        el('p.small.dim', { style: 'margin-top:4px' }, L && L.dropped ? 'They kept the stapler. You kept your dignity (some of it). DIY is always an option.'
          : era === 'garage' ? 'Labels do not scout garages. Get the town talking first (Local Heroes).' : 'Labels are watching your fans, your buzz and how your EP lands. Keep gigging.')
      ]));
    }
    var offers = V.offers(st);
    if (offers.length) {
      out.push(el('div.caps', { style: 'margin:14px 0 6px' }, 'Offers on the table'));
      out.push(el('div.stack.tight', { testid: 'label-offers' }, offers.map(function (o) {
        var left = o.expires != null ? o.expires - st.totalWeek : null;
        return el('div.panel.offer-row', [el('div.row', [V.logo(o.labelId, 'sm'), el('div.grow', [el('b', U.fmtMoney(o.advance || 0)), el('div.tiny.dim', V.pct(o.royalty) + ' cut · ' + (o.albums || 1) + ' album(s)' + (left != null ? ' · ' + Math.max(0, left) + ' wk left' : ''))]),
          btn('.btn.small', { testid: 'btn-view-offer-' + o.labelId, onclick: function () { ui.openOffers(o.labelId); } }, 'Look')])]);
      })));
    }
    if (!L && era !== 'garage') out.push(btn('.btn.ghost.block', { testid: 'btn-diy', style: 'margin-top:12px', onclick: goDIY }, 'Go DIY ✂'));
    return el('div', out);
  };

  /* ---- Label demands without a content card (pendingDemand): met / halfway / refused ------------------------ */
  ui.checkDemand = function (next) {
    var st = S(), pd = st && V.call('pendingDemand', st);
    if (!pd || !pd.demand || ui.isOpen('label-demand')) return false;   // nothing pending: the caller carries on (next only runs after a demand)
    ui.show('label-demand', { pd: pd, next: next });
    return true;
  };
  ui.define('label-demand', {
    kind: 'sheet', sticky: true,
    build: function (s, d) {
      var st = S(), L = st && st.label, pd = d.pd; if (!st || !pd) return;
      var def = V.labelDef(L && L.labelId);
      s.setTitle('The label called', (def.name || 'THE LABEL').toUpperCase());
      ui.append(s.body, [el('div.row', { style: 'margin-bottom:10px' }, [V.logo(L && L.labelId), el('div.grow'), el('span.tag', 'demand')]),
        el('p.card-text', { testid: 'demand-text' }, '“' + V.fill(pd.demand.text || pd.demand.kind) + '”')]);
      if (!d.res) {
        [['met', 'Fine. Do it.', 'The label is thrilled. Marcel is not.'], ['half', 'Meet them halfway', 'Everybody is a little annoyed. Classic compromise.'],
          ['refused', 'No.', 'Creative integrity! The label writes this down somewhere.']].forEach(function (c) {
          s.body.appendChild(btn('.choice', { testid: 'demand-' + c[0], onclick: function () {
            if (s.data.res) return;
            s.data.res = V.call('answerDemand', S(), pd.index, c[0]) || {}; s.data.pick = c; V.sync(); s.rerender(s.data);
          } }, [el('span.cl', c[1]), el('span.ch', c[2])]));
        });
        return;
      }
      ui.append(s.body, [el('div.you', ['You said: ', el('b', d.pick[1])]), ui.deltaChips(d.res.deltas || d.res, { emptyText: 'Noted.' })]);
      s.foot.appendChild(btn('.btn.primary.big.block', { testid: 'btn-demand-ok', onclick: function () { ui.close(s.id); } }, 'OK'));
    },
    onClose: function (s) { if (s.data && s.data.next) setTimeout(s.data.next, 0); }
  });

  GG.registerDebug('uiLabel', function () {
    var st = S();
    return { offers: st ? V.offers(st).map(function (o) { return o.labelId; }) : [], label: st && st.label ? st.label.labelId : null,
      api: ['offers', 'sign', 'decline', 'goDIY', 'dealStatus'].filter(function (n) { return !V.api(n); }).map(function (n) { return 'missing:' + n; }) };
  });
})(window.GG);
