// 51_ui_menu.js: everything outside the week loop. Title, load, new-career flow (slot → genre → band intro →
// character creator → cold open), the in-game ☰ menu, and save-code backup/restore.
// v0.6.1 (Addendum C4): ⚙ Settings from the title (title-settings) and the menu (menu-settings); the creator picks the
// career difficulty (diff-chill|normal|brutal, locked for that career) and passes it to GG.main.newCareer.
// v0.8 (CREATOR): the creator opens the full creator ('look', 5j_ui_creator: btn-customize; a 'preset-custom' card once
// customised), a carry-over toggle (carry-toggle: unlocks from past careers in this genre, GG.creator.carry) and hands both
// to GG.creator.prepare() right before GG.main.newCareer; the ☰ menu has "Look" (menu-look) mid-career.
// v0.8.1 (LOGO): band intro → the logo picker ('logo', 5m_ui_logo; GG.logo.prepare) → the creator.
// v1.0 (stage-0 sockets): the title's "Hall of Fame" (btn-hof, once GG.meta has an entry and the 'hof' screen exists), ☰
// rows "Lessons" (menu-lessons → GG.tutorial.openLessons) and "Hall of Fame" (menu-hof), and the creator's "Skip the lessons"
// toggle (tut-skip, on by default, shown when GG.tutorial.offerSkip()) passed to GG.main.newCareer as skipLessons.
// v1.0 (Lane M): the code sheet's mode 'hof' (the Hall of Fame "Backup code", GG.save.metaCode) and a restore that reads
// either kind of code (GG.save.readCode: a meta-only code asks "Restore Hall of Fame and trophies?" then GG.meta.mergeLite; a
// career code loads after the usual confirm, then merges its Hall of Fame lite); the creator notes looks from finished
// careers (meta-parts).
// v1.1 (SEATS): band intro → the seat picker ('seat': seat-drums|bass|rhythm|lead + seat-next; tap a card = a ~3 s
// preview, GG.audio.seatPreview; leaving = GG.audio.stopPreview; Drums preselected; fixed for the career; emits
// 'seat:picked' { seat, swapped }) → the logo → the creator (copy by seat; ui.openLook({ seat })) → newCareer({ seat }).
// Career creation, loading and saving are delegated to GG.main (60_main); this file only builds screens.
(function (GG) {
  var ui = GG.ui, el = ui.el, btn = ui.btn, U = GG.util;
  var draft = {};                  // new-career choices in progress: { slot, bandId, genre, seat (v1.1), ... }
  var storageWarned = false;
  // v1.2 (F17): the credit line of every sample kit in the build (GG.content.kits; the kit's terms make it mandatory)
  function kitCredits() {
    var K = (GG.content && GG.content.kits) || {};
    return Object.keys(K).map(function (k) { return K[k] && K[k].credit; }).filter(Boolean);
  }

  // The genre cards (labels + icons; names/spaces/cities only when content is missing a band, which then can't be picked).
  // v0.9: all four bands are playable (content.bands[*].locked:false); a band missing from content shows 'Locked'.
  var GENRES = [
    { genre: 'metal', icon: '🤘', label: 'Metal', band: 'Hail Damage', space: "Your parents' garage", city: 'Saskatoon' },
    { genre: 'punk', icon: '🧷', label: 'Punk', band: 'Frost Heave', space: 'A laundromat basement', city: 'Regina' },
    { genre: 'rock', icon: '🎸', label: 'Rock', band: 'Gravel Kings', space: 'An empty strip-mall unit', city: 'Edmonton' },
    { genre: 'country', icon: '🤠', label: 'Country', band: 'The Grid Road Ramblers', space: 'A Quonset on a farm', city: 'Swift Current' }
  ];
  function genreRow(genre) {
    return GENRES.filter(function (x) { return x.genre === genre; })[0]
      || { genre: genre, icon: ui.genreIcon(genre), label: ui.cap(genre || 'band'), band: 'The band', space: 'A rehearsal space', city: '' };
  }
  // The draft's band (the genre card picked it); null only if content lost it.
  function draftBand() { return (GG.content.bands || {})[draft.bandId] || (draft.genre ? bandFor(draft.genre) : null); }
  var SPACE_ICON = { garage: '🏠', laundromat: '🧺', stripmall: '🏬', quonset: '🌾' };
  function spaceKindOf(band) { var K = GG.contracts.SPACE_KINDS || {}; return (band && K[band.space]) || 'garage'; }
  // v0.9 (gap #5): a peek at the starting space on the genre card: the same 2D room art as the no-WebGL garage (00_shell
  // v0.9 GENRES block), or a still from the render when it offers one (GG.render.garage.peek(kind) -> dataURL, optional).
  function peek(kind, icon) {
    var url = null;
    try { var G = GG.render && GG.render.garage; url = G && typeof G.peek === 'function' ? G.peek(kind) : null; } catch (e) { url = null; }
    return el('span.ico.peek.spx.sp-' + kind, { testid: 'peek-' + kind, data: { space: kind } },
      url ? [el('img', { src: url, alt: '' }), el('b', icon)] : [el('i.door'), el('i.bulb'), el('i.stain'), el('b', icon)]);
  }
  var FALLBACK_PRESETS = [
    { id: 'denim_tux', name: 'Denim Tuxedo', blurb: 'Formal. Ish.', kitColor: '#3b6fd8', look: { skin: '#e0b08a', hair: '#4a2f1b', shirt: '#3d5a8a', pants: '#2c4468' } },
    { id: 'toque_flannel', name: 'Toque & Flannel', blurb: 'Dressed for minus forty.', kitColor: '#c0392b', look: { skin: '#c68e62', hair: '#1c1c1c', shirt: '#a3342c', pants: '#2b2b33' } }
  ];

  function bandFor(genre) {
    var bands = GG.content.bands || {};
    for (var k in bands) if (bands[k] && bands[k].genre === genre) return bands[k];
    return null;
  }
  function presets() { return (GG.content.presets && GG.content.presets.length) ? GG.content.presets : FALLBACK_PRESETS; }

  /* ---- Slots ------------------------------------------------------------------------------------ */
  // { auto: { exists, summary, savedAt }, '1': ... } from GG.save.list(), never throws.
  function slotInfo() {
    var out = {};
    GG.contracts.SLOTS.forEach(function (s) { out[s] = { slot: s, exists: false }; });
    try { (GG.save && GG.save.list ? GG.save.list() : []).forEach(function (r) { if (r && out[r.slot]) out[r.slot] = r; }); }
    catch (e) { console.warn('[ui] save.list failed', e); }
    return out;
  }
  function ago(t) {
    if (!t) return '';
    var m = Math.round((Date.now() - t) / 60000);
    return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago';
  }
  ui.slotSummary = function (r) {
    if (!r || !r.exists) return 'Empty. Smells like potential.';
    var s = r.summary || {};
    return [s.band || 'A band', 'Y' + (s.year || 1) + ' W' + (s.week || 1), U.fmtNum(s.fans || 0) + ' fans', U.fmtMoney(s.fund || 0)].join(' · ') +
      (r.savedAt ? ' · ' + ago(r.savedAt) : '');
  };
  function slotButton(r, label, testid, onPick, current) {
    return btn('.slot-btn', { testid: testid, disabled: !onPick, onclick: onPick }, [
      el('span.n', label),
      el('span.grow', [el('div.t', r.exists ? ((r.summary && r.summary.player) || 'You') + (current ? ' (current)' : '') : 'Empty slot'),
        el('div.d', ui.slotSummary(r))])
    ]);
  }

  /* ---- Title -------------------------------------------------------------------------------------- */
  // v0.7.1: the title sits over a live 3D scene (GG.render 'title': the garage in a hailstorm) when WebGL is up.
  // The screen goes transparent (class title3d), keeps the logo on top and the menu at the bottom, and tells the scene
  // which strips they cover so the garage is framed in the gap. Without WebGL it's the old flat title.
  function want3d() { return !!(GG.render && GG.render.available && GG.render.title && !GG.state); }
  var frameRaf = 0;
  function frameTitle() {
    if (frameRaf || typeof requestAnimationFrame === 'undefined') return;
    frameRaf = requestAnimationFrame(function () {
      frameRaf = 0;
      var e = ui.get && ui.get('title');
      if (!e || !GG.render || !GG.render.title) return;
      var head = e.body.querySelector('.title-head'), foot = e.body.querySelector('.title-foot'), H = window.innerHeight || 844;
      if (!head || !foot) return;
      var hr = head.getBoundingClientRect(), fr = foot.getBoundingClientRect();
      if (!hr.height || !fr.height) return;   // hidden under a full screen: measured again when it's uncovered
      GG.render.title.setFrame({ top: Math.round(hr.bottom) + 6, bottom: Math.round(H - fr.top) + 6 });
    });
  }
  if (typeof window !== 'undefined') window.addEventListener('resize', function () { if (ui.isOpen('title')) frameTitle(); });
  GG.on('screen:close', function () { if (!GG.state && ui.isOpen('title')) frameTitle(); });   // back from Settings / calibration
  ui.define('title', {
    kind: 'full', live3d: true,
    onShow: function () {
      if (!want3d()) return;
      try { GG.render.setScene('title'); } catch (e) { console.error('[ui] title scene failed', e); }
      frameTitle();
    },
    onClose: function () {
      if (GG.state || !GG.render || !GG.render.available) return;
      try { if ((GG.debug('render') || {}).scene === 'title') GG.render.setScene('none'); } catch (e) { /* ignore */ }
    },
    build: function (s) {
      var is3d = want3d();
      s.root.classList.toggle('title3d-layer', is3d);
      if (s.root.firstChild) s.root.firstChild.classList.toggle('title3d', is3d);
      var info = slotInfo(), auto = info.auto;
      var kids = [];
      if (auto.exists) {
        kids.push(btn('.btn.primary.big.block', { testid: 'btn-continue', onclick: function () { GG.main.load('auto'); } }, 'Continue'));
        kids.push(el('div.small.dim.center', { style: 'margin-top:-4px' }, ui.slotSummary(auto)));
      }
      kids.push(btn('.btn.big.block' + (auto.exists ? '' : '.primary'), { testid: 'btn-new', onclick: function () { ui.show('slots'); } }, 'New career'));
      kids.push(el('div.row', [
        btn('.btn.grow', { testid: 'btn-load', onclick: function () { ui.show('load'); } }, 'Load'),
        btn('.btn.grow', { testid: 'btn-code-restore', onclick: function () { ui.show('code', { mode: 'restore' }); } }, 'Restore code')
      ]));
      if (ui.defined('hof') && GG.meta && GG.meta.hof().length) kids.push(btn('.btn.block', { testid: 'btn-hof', onclick: function () { ui.show('hof'); } }, '🏆 Hall of Fame'));   // v1.0
      kids.push(el('div.row', [
        btn('.btn.ghost.grow', { testid: 'title-sound', onclick: function () { GG.audio.toggleMuted(); s.rerender(); } }, soundLabel()),
        ui.defined && ui.defined('settings') ? btn('.btn.ghost.grow', { testid: 'title-settings', onclick: function () { ui.show('settings'); } }, '⚙ Settings') : null
      ]));
      ui.append(s.body, [
        el('div.title-glow'), el('div.title-bg'), el('div.title-scrim-top'), el('div.title-scrim-bot'),
        el('div.title-wrap', [
          el('div.title-head', [
            el('h1.logo', ['Garage', el('span.to', 'to'), el('span.glory', 'Glory')]),
            el('p.tagline', "From your parents' garage to the Loonie Awards. Probably.")
          ]),
          el('div.title-foot', [
            is3d ? el('div.title-hint', { testid: 'title-hint' }, 'Psst: tap the kit. Or Marcel.') : null,
            el('div.menu-list', kids),
            el('div.credits', [
              el('p.credit', { testid: 'title-credit' }, 'a game by Prairie Blue Studio · V' + GG.VERSION),
              // v1.2 (handoff F17.2, mandatory): every sample kit in the build is credited on the title screen
              kitCredits().length ? el('p.credit.kit-credit', { testid: 'title-kit-credit' }, kitCredits().join(' · ')) : null
            ])
          ])
        ])
      ]);
      if (is3d) frameTitle();
      if (GG.save && GG.save.storageOk === false && !storageWarned) {
        storageWarned = true;
        ui.toast("This browser won't keep saves after you close the tab. Back up with a save code (☰ → Back up).", { kind: 'bad', ms: 7000 });
      }
    }
  });
  function soundLabel() { return GG.audio && GG.audio.isMuted() ? '🔇 Sound: off' : '🔊 Sound: on'; }

  /* ---- Load --------------------------------------------------------------------------------------- */
  ui.define('load', {
    kind: 'sheet', title: 'Load a career',
    build: function (s) {
      var info = slotInfo();
      var list = el('div.menu-list');
      GG.contracts.SLOTS.forEach(function (slot) {
        var r = info[slot];
        list.appendChild(slotButton(r, slot === 'auto' ? '⟳' : slot, 'load-' + slot,
          r.exists ? function () { ui.close(s.id); GG.main.load(slot); } : null));
      });
      ui.append(s.body, [el('p.small.dim', { style: 'margin-bottom:10px' }, '⟳ is the autosave: it updates at the end of every week.'), list]);
    }
  });

  /* ---- New career: slot pick ------------------------------------------------------------------------- */
  ui.define('slots', {
    kind: 'sheet', title: 'Pick a save slot',
    build: function (s) {
      var info = slotInfo(), list = el('div.menu-list');
      ['1', '2', '3'].forEach(function (slot) {
        var r = info[slot];
        list.appendChild(slotButton(r, slot, 'slot-' + slot, function () {
          function go() { draft = { slot: slot }; ui.close(s.id); ui.show('genre'); }
          if (!r.exists) return go();
          ui.confirm({ title: 'Overwrite slot ' + slot + '?', text: ui.slotSummary(r) + '. That band will be gone for good (they had it coming).',
            yes: 'Overwrite', no: 'Keep it', danger: true }).then(function (ok) { if (ok) go(); });
        }));
      });
      ui.append(s.body, [el('p.small.dim', { style: 'margin-bottom:10px' }, 'Your career autosaves here at the end of every week.'), list]);
    }
  });

  function backRow(s, heading, sub) {
    return el('div', [
      el('div.back-row', [btn('.icon-btn', { testid: 'btn-back', 'aria-label': 'Back', onclick: function () { ui.close(s.id); } }, '←'),
        sub ? el('span.caps', sub) : null]),
      el('h1.screen-h', heading)
    ]);
  }

  /* ---- New career: genre ------------------------------------------------------------------------------ */
  ui.define('genre', {
    kind: 'full',
    build: function (s) {
      var list = el('div.stack', { style: 'margin-top:18px' });
      GENRES.forEach(function (g) {
        var band = bandFor(g.genre);
        var locked = !band || !!band.locked;   // v0.9: every band in content is playable; no content, no career
        var name = band ? band.name : g.band;
        var where = band ? (band.spaceName || g.space) + (band.city ? ', ' + band.city : '') : g.space + (g.city ? ', ' + g.city : '');
        list.appendChild(btn('.genre-card' + (locked ? '' : '.live'), {
          testid: 'genre-' + g.genre, disabled: locked, data: { band: band ? band.id : '' },
          onclick: function () { if (!band) return; draft.bandId = band.id; draft.genre = band.genre || g.genre; ui.show('intro'); }
        }, [
          peek(spaceKindOf(band), g.icon),
          el('span.grow', [el('div.g', g.label), el('div.b', name), el('div.c', where)]),
          locked ? el('span.tag', 'Locked') : el('span.tag.amber', 'Playable')
        ]));
      });
      ui.append(s.body, [backRow(s, 'Pick your poison', 'New career · slot ' + (draft.slot || '1')),
        el('p.screen-sub', 'Four bands, four rooms. Pick one, then pick where you stand in it.'), list]);
    }
  });

  /* ---- New career: band intro --------------------------------------------------------------------------- */
  ui.define('intro', {
    kind: 'full',
    build: function (s) {
      var band = draftBand();
      var g = genreRow((band && band.genre) || draft.genre);
      var name = band ? band.name : g.band;
      var home = (band && band.spaceName) || g.space;
      var city = (band && band.city) || g.city;
      var mates = el('div');
      ((band && band.members) || []).forEach(function (m) {
        var who = ui.who(m.id, { bandId: band.id, members: band.members });
        mates.appendChild(el('div.member-row', [ui.avatar(who), el('div.grow', [
          el('div.nm', m.fullName || m.name + (m.nick ? ' "' + m.nick + '"' : '')),
          el('div.rl', m.role || ''),
          m.bio ? el('div.bio', m.bio) : null
        ])]));
      });
      ui.append(s.body, [
        backRow(s, name, g.label + (city ? ' · ' + city : '')),
        el('div.stack', { style: 'margin-top:16px' }, [
          band && band.blurb ? el('p', { style: 'font-size:16px' }, band.blurb) : null,
          el('div.panel.warm.row', { testid: 'intro-home' }, [el('span', { style: 'font-size:28px' }, SPACE_ICON[spaceKindOf(band)] || '🏠'), el('div.grow', [el('div.caps', 'Home base'),
            el('div', { style: 'font-weight:800' }, home.charAt(0).toUpperCase() + home.slice(1) + (city ? ', ' + city : ''))])]),
          mates.children.length ? el('div.panel', [el('div.caps', { style: 'margin-bottom:4px' }, 'The band (plus you)'), mates]) : null
        ])
      ]);
      s.foot.appendChild(btn('.btn.primary.big.block', { testid: 'btn-intro-next', onclick: function () {   // v1.1: the seat picker, then the logo (5m)
        if (!band) return;
        ui.show('seat');
      } }, "That's my band →"));
    }
  });

  /* ---- New career: the seat (v1.1 "Seats", plan_contract_1.1 §0 / §5 Lead) ------------------------------------- */
  // Four cards: who moves to the drums (band.seatLines[seat] when content has it, else a plain line from the swap
  // table) and your stage spot. A tap picks the card and plays its ~3 s preview; Drums is preselected; the seat is
  // fixed for the whole career. Leaving the screen (back or next) stops the preview.
  var SEAT_ICON = { drums: '🥁', bass: '🎸', rhythm: '🎸', lead: '🎸' };
  var SEAT_NAME = { drums: 'Drums', bass: 'Bass', rhythm: 'Rhythm guitar', lead: 'Lead guitar' };
  function seatWord(seat) { var T = GG.contracts.SEAT_TOKENS || {}; return (T[seat] && T[seat].seat) || 'drums'; }
  function seatOf(x) { return (GG.contracts.SEATS || ['drums']).indexOf(x) >= 0 ? x : 'drums'; }
  function firstName(m) { return m ? (m.name || m.id || '').split(' ')[0] : ''; }
  function seatSinger(band, swappedId) {
    var ms = (band && band.members) || [];
    return ms.filter(function (m) { return m.id !== swappedId && /vocal|sing/i.test(m.role || ''); })[0] || null;
  }
  function seatLine(band, seat) {
    var L = band && band.seatLines, t = L && typeof L[seat] === 'string' ? L[seat].trim() : '';
    if (t && t.indexOf('{') < 0) return t;   // content lines are plain words (a stray token falls back)
    var id = GG.career.seatSwap(band && band.id, seat), m = id ? ((band && band.members) || []).filter(function (x) { return x.id === id; })[0] : null;
    if (seat === 'drums' || !m) return 'You take the kit. Nobody moves.';
    return firstName(m) + ' moves to the drums' + (/vocal|sing/i.test(m.role || '') ? ' and sings from the kit.' : '.');
  }
  function seatSpot(band, seat) {
    if (seat === 'drums') return 'Behind the kit, on the riser';
    if (seat === 'bass') return 'Stage left';
    if (seat === 'rhythm') return 'Stage right';
    var sg = seatSinger(band, GG.career.seatSwap(band && band.id, seat));
    return 'Up front, beside ' + (sg ? firstName(sg) : 'the singer');
  }
  function stopSeatPreview() { try { if (GG.audio && GG.audio.stopPreview) GG.audio.stopPreview(); } catch (e) { console.warn('[ui] stopPreview', e); } }
  ui.seatLine = seatLine; ui.seatSpot = seatSpot;   // tests / other screens
  ui.define('seat', {
    kind: 'full',
    build: function (s) {
      var band = draftBand();
      if (!band) { ui.close(s.id); return; }
      if (draft.seatBand !== band.id) { draft.seat = 'drums'; draft.seatBand = band.id; }   // Drums preselected per band
      draft.seat = seatOf(draft.seat);
      var g = genreRow(band.genre || draft.genre), list = el('div.stack.seat-list', { style: 'margin-top:14px' });
      (GG.contracts.SEATS || ['drums']).forEach(function (seat) {
        var on = seat === draft.seat;
        list.appendChild(btn('.seat-card' + (on ? '.on' : ''), { testid: 'seat-' + seat, 'aria-pressed': on ? 'true' : 'false', data: { seat: seat },
          onclick: function () {
            draft.seat = seat;
            try {
              if (GG.audio && GG.audio.unlock) GG.audio.unlock();
              if (GG.audio && GG.audio.seatPreview) GG.audio.seatPreview(band.id, seat);
            } catch (e) { console.warn('[ui] seatPreview', e); }
            s.rerender();
          } }, [
          el('span.ico', SEAT_ICON[seat] || '🎸'),
          el('span.grow', [
            el('div.g', SEAT_NAME[seat] || seat),
            el('div.b', { testid: 'seat-line-' + seat }, seatLine(band, seat)),
            el('div.c', [el('span.caps', 'Stage spot '), seatSpot(band, seat)])
          ]),
          on ? el('span.tag.amber', 'Picked') : el('span.tag', '▶ Hear it')
        ]));
      });
      ui.append(s.body, [backRow(s, 'Pick your seat', band.name + ' · ' + g.label),
        el('p.screen-sub', 'Take any seat in the band. Whoever had it moves to the drums. Tap a card to hear it.'),
        list,
        el('p.small.dim', { testid: 'seat-fixed', style: 'margin-top:12px' }, 'Your seat is yours for the whole career. No switching mid-tour.')]);
      s.foot.appendChild(btn('.btn.primary.big.block', { testid: 'seat-next', onclick: function () {
        var seat = seatOf(draft.seat);
        stopSeatPreview();
        GG.emit('seat:picked', { seat: seat, swapped: GG.career.seatSwap(band.id, seat) });
        if (ui.openLogo) ui.openLogo({ mode: 'new', bandId: band.id, genre: band.genre || draft.genre, band: band.name, onDone: function () { ui.show('creator'); } });
        else ui.show('creator');
      } }, (draft.seat === 'drums' ? "I'm on drums" : "I'm on " + seatWord(draft.seat)) + ' →'));
    },
    onClose: function () { stopSeatPreview(); }
  });

  /* ---- New career: character creator -------------------------------------------------------------------- */
  function figure(p) {
    var L = p.look || {};
    var bald = L.hairStyle === 'bald';
    return el('div.fig', [
      el('div.lg', { style: { background: L.pants || '#333' } }),
      el('div.bd', { style: { background: L.shirt || '#555' } }),
      el('div.hd', { style: { background: L.skin || '#d9a57b' } }),
      bald ? null : el('div.hr', { style: { background: L.hair || '#222', height: L.hairStyle === 'long' || L.hairStyle === 'mullet' ? '20px' : '11px' } }),
      (L.extras || []).indexOf('sunglasses') >= 0 ? el('div.sh') : null,
      el('div.kit', { style: { background: p.kitColor || '#c33' }, title: 'Kit colour' })
    ]);
  }
  ui.define('creator', {
    kind: 'full',
    build: function (s) {
      var list = presets();
      if (!draft.presetId || !list.some(function (p) { return p.id === draft.presetId; })) draft.presetId = list[0].id;
      var err = el('div.err');
      var create;
      var name = el('input', { testid: 'creator-name', id: 'cr-name', type: 'text', maxLength: 16, placeholder: 'e.g. Tanner', autocomplete: 'off', value: draft.name || '',
        oninput: function () { draft.name = name.value; create.disabled = !name.value.trim(); err.textContent = ''; } });
      var nick = el('input', { testid: 'creator-nick', id: 'cr-nick', type: 'text', maxLength: 16, placeholder: 'e.g. Thunderwrist (optional)', autocomplete: 'off', value: draft.nick || '',
        oninput: function () { draft.nick = nick.value; } });
      var grid = el('div.presets');
      if (draft.custom) {                                   // v0.8: the full creator's result
        var cu = draft.useCustom;
        grid.appendChild(btn('.preset' + (cu ? '.on' : ''), { testid: 'preset-custom', 'aria-pressed': cu ? 'true' : 'false',
          onclick: function () { draft.useCustom = true; s.rerender(); } }, [figure({ look: draft.custom.look, kitColor: draft.custom.kit.color }), el('div.pn', 'Your custom look'), el('div.pb', 'Tap ✂ below to keep tweaking.')]));
      }
      list.forEach(function (p) {
        var on = !(draft.custom && draft.useCustom) && p.id === draft.presetId;
        grid.appendChild(btn('.preset' + (on ? '.on' : ''), { testid: 'preset-' + p.id, 'aria-pressed': on ? 'true' : 'false',
          onclick: function () { draft.presetId = p.id; draft.useCustom = false; s.rerender(); } }, [figure(p), el('div.pn', p.name), el('div.pb', p.blurb || '')]));
      });
      var dband = draftBand(), genre = (dband && dband.genre) || draft.genre || 'metal', carryN = GG.creator ? GG.creator.carry.count(genre) : 0;
      if (draft.carry == null) draft.carry = carryN > 0;
      var customize = btn('.btn.block.cr-custom', { testid: 'btn-customize', disabled: !GG.creator || !ui.openLook, onclick: function () {
        var pre = list.filter(function (p) { return p.id === draft.presetId; })[0] || list[0], c = draft.useCustom && draft.custom;
        var band = draftBand();
        ui.openLook({ mode: 'new', genre: genre, band: band && band.name, bandId: band && band.id, carry: !!draft.carry, seat: seatOf(draft.seat),
          look: c ? c.look : pre.look, stageLook: c ? c.stageLook : null, kit: c ? c.kit : GG.creator.newKit(pre.kitColor, band && band.id),   // v0.9: the band's own throne
          onDone: function (out) { draft.custom = out; draft.useCustom = true; var cr = ui.get('creator'); if (cr) cr.rerender(); } });
      } }, draft.custom && draft.useCustom ? '✂ Keep tweaking your look' : '✂ Customize: face, hair, ink, stage outfit, ' + (seatOf(draft.seat) === 'drums' ? 'kit' : 'gear'));
      var carryBox = el('input', { type: 'checkbox', testid: 'carry-toggle', checked: !!draft.carry && carryN > 0, disabled: !carryN,
        onchange: function () { draft.carry = carryBox.checked; } });
      var carry = el('label.cr-carry', { htmlFor: 'cr-carry' }, [carryBox, el('span', carryN ? 'Carry over ' + carryN + ' unlock' + (carryN === 1 ? '' : 's') + ' from past ' + genre + ' careers'
        : 'Unlocks from past ' + genre + ' careers carry over here (none yet)')]);
      carryBox.id = 'cr-carry';
      var metaN = GG.meta && GG.meta.enabled && GG.meta.unlocked ? GG.meta.unlocked('parts').length : 0;   // v1.0 (Q5): looks from finished careers
      var metaLine = metaN ? el('p.tiny.dim', { testid: 'meta-parts' }, '🏆 ' + metaN + ' look' + (metaN === 1 ? '' : 's') + ' from finished careers work in every genre (no toggle needed).') : null;
      var offerSkip = !!(GG.tutorial && GG.tutorial.offerSkip && GG.tutorial.offerSkip());   // v1.0: "Skip the lessons" (on by default)
      if (draft.skipLessons == null) draft.skipLessons = true;
      var tutSkip = offerSkip ? btn('.btn.block.tut-skip' + (draft.skipLessons ? '.on' : ''), { testid: 'tut-skip', 'aria-pressed': draft.skipLessons ? 'true' : 'false',
        onclick: function () { draft.skipLessons = !draft.skipLessons; s.rerender(); } }, (draft.skipLessons ? '✓ ' : '') + 'Skip the lessons' + (draft.skipLessons ? '' : ': off')) : null;
      var DL = GG.difficulty ? GG.difficulty.LEVELS : ['normal'];
      if (DL.indexOf(draft.careerDifficulty) < 0) draft.careerDifficulty = 'normal';
      var diffPick = el('div.diff-pick', { testid: 'diff-pick' }, DL.map(function (d) {
        var t = GG.difficulty ? GG.difficulty.text(d) : { name: d };
        return btn('.btn' + (d === draft.careerDifficulty ? '.primary' : ''), { testid: 'diff-' + d, 'aria-pressed': d === draft.careerDifficulty ? 'true' : 'false',
          onclick: function () { draft.careerDifficulty = d; s.rerender(); } }, [el('b', t.name), el('span.tiny', d === 'chill' ? 'easier life' : d === 'brutal' ? 'no mercy' : 'as intended')]);
      }));
      create = btn('.btn.primary.big.block', { testid: 'btn-create', disabled: !(draft.name || '').trim(), onclick: function () {
        var n = (name.value || '').trim().slice(0, 16);
        if (!n) { err.textContent = 'Even ' + ({ drums: 'drummers', bass: 'bass players' }[seatOf(draft.seat)] || 'guitarists') + ' need a name.'; return; }
        create.disabled = true;
        var custom = draft.useCustom && draft.custom;   // v0.8: the full creator's look + kit, carried-over unlocks
        if (GG.creator) GG.creator.prepare({ look: custom ? custom.look : null, stageLook: custom ? custom.stageLook : null, kit: custom ? custom.kit : null,
          gearLook: custom && custom.gearLook || null, carry: !!draft.carry });   // v1.1: the creator's "Your gear" (string seats)
        GG.main.newCareer({ slot: draft.slot || '1', bandId: (dband && dband.id) || draft.bandId,
          player: { name: n, nick: (nick.value || '').trim().slice(0, 16), presetId: draft.presetId, look: custom ? custom.look : undefined, kitColor: custom ? custom.kit.color : undefined },
          careerDifficulty: draft.careerDifficulty || 'normal', seed: GG.hashSeed(n + Date.now()), skipLessons: offerSkip ? !!draft.skipLessons : false,
          seat: seatOf(draft.seat) });   // v1.1: the seat picked on 'seat' (drums when the picker was skipped)
        ui.closeAll();
        ui.show('coldopen');
      } }, 'Start the band');
      ui.append(s.body, [
        backRow(s, "Who's on " + seatWord(seatOf(draft.seat)) + '?', 'Character'),
        el('p.screen-sub', "You. You're on " + seatWord(seatOf(draft.seat)) + ". You founded the band, you can't quit, and nobody can fire you."),
        el('div.stack', { style: 'margin-top:16px' }, [
          el('div.field', [el('label', { htmlFor: 'cr-name' }, 'Your name'), name, err]),
          el('div.field', [el('label', { htmlFor: 'cr-nick' }, 'Stage nickname'), nick]),
          el('div.caps', 'Pick a look'),
          grid,
          customize,
          carry,
          metaLine,
          tutSkip,
          el('div.caps', 'Career difficulty · locked for this career'),
          diffPick,
          el('p.small.dim', { testid: 'diff-blurb' }, GG.difficulty ? GG.difficulty.text(draft.careerDifficulty).blurb : '')
        ])
      ]);
      s.foot.appendChild(create);
    }
  });

  /* ---- New career: cold open ------------------------------------------------------------------------------ */
  // v0.9: the panels are band.coldOpen; the weather over them is band.coldOpenFx ('hail' | 'snow' | 'neon' | 'dust',
  // CSS in the 00_shell v0.9 GENRES block); the last button walks into the band's own space ({space}).
  var COLD_FALLBACK = [
    '{city}. A band needs a drummer. It has found one.',
    'You bring the kit. Somebody brings an extension cord. Nobody brings a plan.',
    '{band} is born in {space}. The neighbours have been warned.'
  ];
  var COLD_FX = { hail: 1, snow: 1, neon: 1, dust: 1 };
  ui.define('coldopen', {
    kind: 'full',
    build: function (s, d) {
      var band = GG.state ? ui.band(GG.state) : null, fx = band && COLD_FX[band.coldOpenFx] ? band.coldOpenFx : 'hail';
      var panels = (band && band.coldOpen && band.coldOpen.length) ? band.coldOpen : COLD_FALLBACK;
      var i = U.clamp(d.i || 0, 0, panels.length - 1), last = i === panels.length - 1;
      function finish() { ui.close(s.id); GG.main.enterGarage(); }
      function next() { if (last) return finish(); if (GG.audio) GG.audio.sfx('whoosh'); s.rerender({ i: i + 1 }); }
      var dots = el('div.dots', panels.map(function (_, k) { return el('i' + (k === i ? '.on' : '')); }));
      s.body.appendChild(el('div.cold.fx-' + fx, { onclick: next, testid: 'coldopen', data: { fx: fx } }, [
        el('div.' + fx + '.cold-fx', { testid: 'coldopen-fx' }),
        el('div.cold-top', [el('span.caps', (band ? band.name : 'The band') + ' · ' + (i + 1) + '/' + panels.length),
          btn('.btn.ghost.small', { testid: 'btn-coldopen-skip', onclick: function (e) { e.stopPropagation(); finish(); } }, 'Skip')]),
        el('div.cold-text', ui.fill(panels[i])),
        el('div.cold-foot', [dots, btn('.btn.primary.big.block', { testid: 'btn-coldopen-next' }, last ? 'Into ' + ui.space() + ' →' : 'Next')])
      ]));
    }
  });

  /* ---- In-game menu ------------------------------------------------------------------------------------------ */
  ui.define('menu', {
    kind: 'sheet', title: 'Menu',
    build: function (s) {
      var st = GG.state, info = slotInfo();
      var saves = el('div.menu-list');
      ['1', '2', '3'].forEach(function (slot) {
        var r = info[slot], mine = st && st.slot === slot;
        saves.appendChild(slotButton(r, slot, 'menu-save-' + slot, function () {
          function go() { if (GG.main.saveTo(slot)) s.rerender(); }
          if (!r.exists || mine) return go();
          ui.confirm({ title: 'Overwrite slot ' + slot + '?', text: ui.slotSummary(r) + '.', yes: 'Overwrite', no: 'Cancel', danger: true })
            .then(function (ok) { if (ok) go(); });
        }, mine));
      });
      ui.append(s.body, [el('div.stack', [
        btn('.btn.primary.block', { testid: 'menu-resume', onclick: function () { ui.close(s.id); } }, 'Resume'),
        el('div.caps', 'Save to a slot'),
        saves,
        el('div.caps', 'Save code'),
        el('div.row', [
          btn('.btn.grow', { testid: 'menu-code', onclick: function () { ui.show('code', { mode: 'backup' }); } }, 'Back up'),
          btn('.btn.grow', { testid: 'menu-restore', onclick: function () { ui.show('code', { mode: 'restore' }); } }, 'Restore')
        ]),
        el('div.sep'),
        ui.openLook && st ? btn('.btn.block', { testid: 'menu-look', onclick: function () { ui.close(s.id); ui.openLook({ mode: 'career' }); } }, '👕 Look: everyday, stage, ink, kit') : null,   // v0.8
        ui.defined && ui.defined('settings') ? btn('.btn.block', { testid: 'menu-settings', onclick: function () { ui.show('settings'); } }, '⚙ Settings') : null,
        GG.tutorial && GG.tutorial.openLessons ? btn('.btn.block', { testid: 'menu-lessons', onclick: function () { ui.close(s.id); GG.tutorial.openLessons(); } }, '? Lessons') : null,   // v1.0
        ui.defined && ui.defined('hof') ? btn('.btn.block', { testid: 'menu-hof', onclick: function () { ui.show('hof'); } }, '🏆 Hall of Fame') : null,   // v1.0
        el('div.row', [
          btn('.btn.grow', { testid: 'menu-sound', onclick: function () { GG.audio.toggleMuted(); s.rerender(); } }, soundLabel()),
          btn('.btn.danger.grow', { testid: 'menu-quit', onclick: function () {
            ui.confirm({ title: 'Quit to title?', text: 'Anything since the last autosave (end of last week) or manual save is lost.', yes: 'Quit', no: 'Stay', danger: true })
              .then(function (ok) { if (ok) GG.main.quitToTitle(); });
          } }, 'Quit to title')
        ])
      ])]);
    }
  });

  /* ---- Save code: backup + restore ------------------------------------------------------------------------------ */
  // v1.0: mode 'hof' = the Hall of Fame "Backup code" (GG.save.metaCode(): every Hall of Fame entry with its year strip, the
  // trophies and the unlocked looks; restored from Restore code). Restore reads the code with GG.save.readCode: a meta-only
  // code asks "Restore Hall of Fame and trophies?" and merges (GG.meta.mergeLite); a career code loads the career after the
  // usual confirm and then merges its `_meta` (the Hall of Fame lite). A failed import never merges anything.
  ui.define('code', {
    kind: 'sheet',
    title: function (d) { return d.mode === 'backup' ? 'Back up' : d.mode === 'hof' ? 'Hall of Fame backup' : 'Restore'; },
    build: function (s, d) {
      var hofMode = d.mode === 'hof', backup = d.mode === 'backup' || hofMode;
      var code = '';
      if (backup) {
        try { code = hofMode ? GG.save.metaCode() : GG.save.toCode(GG.state); } catch (e) { code = ''; console.warn('[ui] toCode failed', e); }
      }
      var ta = el('textarea.code', { testid: 'code-text', rows: 6, spellcheck: 'false', autocomplete: 'off', readOnly: backup, value: code,
        placeholder: 'Paste a GG1:… code here' });
      var msg = el('div.err', { testid: 'code-error', role: 'alert' });
      ui.append(s.body, [el('div.stack', [
        el('p.small.dim', hofMode ? 'Your Hall of Fame, every trophy and the looks you unlocked, as one alarming string. Paste it into your notes app. To bring it back: title → Restore code.'
          : backup ? 'Your whole career as one alarming string. Paste it into your notes app or email it to yourself. It works on any device.'
          : 'Paste a save code (a career, or a Hall of Fame backup). Line breaks and stray spaces are fine; missing chunks are not.'),
        ta, el('div.field', [msg])
      ])]);
      if (backup) {
        s.foot.appendChild(btn('.btn.primary.big.block', { testid: 'btn-code-copy', onclick: function () {
          function fallback() {
            ta.focus(); ta.select(); ta.setSelectionRange(0, ta.value.length);
            var ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
            ui.toast(ok ? 'Copied. Guard it with your life (or at least your notes app).' : 'Code selected. Long-press it and tap Copy.');
          }
          if (!code) return ui.toast("Couldn't make a save code. That's… not great.", { kind: 'bad' });
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(code).then(function () { ui.toast('Copied. Guard it with your life (or at least your notes app).', { kind: 'good' }); }, fallback);
          } else fallback();
        } }, 'Copy code'));
      } else {
        s.foot.appendChild(btn('.btn.primary.big.block', { testid: 'btn-code-load', onclick: function () {
          var r;
          msg.textContent = '';
          try { r = GG.save.readCode ? GG.save.readCode(ta.value) : { state: GG.save.fromCode(ta.value), meta: null }; }
          catch (e) { msg.textContent = (e && e.message) || "That code didn't work."; return; }
          if (!r || (!r.state && !r.meta)) { msg.textContent = "That code didn't work."; return; }
          var merge = function (meta) {   // v1.0: the Hall of Fame + trophies that rode along (or the whole backup)
            if (!meta || !GG.meta || !GG.meta.mergeLite) return null;
            try { return GG.meta.mergeLite(meta); } catch (e) { console.warn('[ui] mergeLite failed', e); return null; }
          };
          if (!r.state) {   // a Hall of Fame backup code
            var n = (r.meta.entries || []).length, k = Object.keys((r.meta.meta && r.meta.meta.ach) || {}).length;
            ui.confirm({ title: 'Restore Hall of Fame and trophies?', text: n + ' career' + (n === 1 ? '' : 's') + ' and ' + k + ' troph' + (k === 1 ? 'y' : 'ies')
              + '. They join what is already on this phone; nothing here is lost.', yes: 'Restore', no: 'Cancel' })
              .then(function (ok) {
                if (!ok) return;
                var res = merge(r.meta);
                ui.close(s.id);
                var t = !GG.state && ui.get('title'); if (t && t.rerender) t.rerender();
                ui.toast(res ? 'Hall of Fame restored: ' + res.added + ' new, ' + res.updated + ' updated.' : "That backup wouldn't merge.", { kind: res ? 'good' : 'bad' });
              });
            return;
          }
          var go = function () {
            ui.closeAll();
            try { GG.main.loadState(r.state, { from: 'code' }); } catch (e) { console.warn('[ui] loadState failed', e); ui.toast("That career wouldn't load.", { kind: 'bad' }); return; }
            merge(r.meta);
          };
          if (!GG.state) return go();
          ui.confirm({ title: 'Swap careers?', text: 'This replaces the career you have open. Unsaved progress is lost.', yes: 'Load it', no: 'Cancel', danger: true })
            .then(function (ok) { if (ok) go(); });
        } }, 'Load code'));
      }
    }
  });
})(window.GG);
