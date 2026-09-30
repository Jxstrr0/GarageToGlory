// 51_ui_menu.js: everything outside the week loop. Title, load, new-career flow (slot → genre → band intro →
// character creator → cold open), the in-game ☰ menu, and save-code backup/restore.
// v0.6.1 (Addendum C4): ⚙ Settings from the title (title-settings) and the menu (menu-settings); the creator picks the
// career difficulty (diff-chill|normal|brutal, locked for that career) and passes it to GG.main.newCareer.
// v0.8 (CREATOR): the creator opens the full creator ('look', 5j_ui_creator: btn-customize; a 'preset-custom' card once
// customised), a carry-over toggle (carry-toggle: unlocks from past careers in this genre, GG.creator.carry) and hands both
// to GG.creator.prepare() right before GG.main.newCareer; the ☰ menu has "Look" (menu-look) mid-career.
// Career creation, loading and saving are delegated to GG.main (60_main); this file only builds screens.
(function (GG) {
  var ui = GG.ui, el = ui.el, btn = ui.btn, U = GG.util;
  var draft = {};                  // new-career choices in progress: { slot, bandId }
  var storageWarned = false;

  // Shown when content is missing a band (and for the genre card icons).
  var GENRES = [
    { genre: 'metal', icon: '🤘', label: 'Metal', band: 'Hail Damage', space: "Your parents' garage", city: 'Saskatoon' },
    { genre: 'punk', icon: '🧷', label: 'Punk', band: 'Frost Heave', space: 'A laundromat basement', city: '' },
    { genre: 'rock', icon: '🎸', label: 'Rock', band: 'Gravel Kings', space: 'An empty strip-mall unit', city: '' },
    { genre: 'country', icon: '🤠', label: 'Country', band: 'The Grid Road Ramblers', space: 'A Quonset on a farm', city: '' }
  ];
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
      el('span.grow', [el('div.t', r.exists ? ((r.summary && r.summary.player) || 'Your drummer') + (current ? ' (current)' : '') : 'Empty slot'),
        el('div.d', ui.slotSummary(r))])
    ]);
  }

  /* ---- Title -------------------------------------------------------------------------------------- */
  ui.define('title', {
    kind: 'full',
    build: function (s) {
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
      kids.push(el('div.row', [
        btn('.btn.ghost.grow', { testid: 'title-sound', onclick: function () { GG.audio.toggleMuted(); s.rerender(); } }, soundLabel()),
        ui.defined && ui.defined('settings') ? btn('.btn.ghost.grow', { testid: 'title-settings', onclick: function () { ui.show('settings'); } }, '⚙ Settings') : null
      ]));
      ui.append(s.body, [
        el('div.title-glow'), el('div.title-bg'),
        el('div.title-wrap', [
          el('h1.logo', ['Garage', el('span.to', 'to'), el('span.glory', 'Glory')]),
          el('p.tagline', "From your parents' garage to the Loonie Awards. Probably."),
          el('div.menu-list', kids),
          el('p.credit', { testid: 'title-credit' }, 'a game by Prairie Blue Studio · V' + GG.VERSION)
        ])
      ]);
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
        var locked = band ? !!band.locked : g.genre !== 'metal';
        var name = band ? band.name : g.band;
        var where = band ? (band.spaceName || g.space) + (band.city ? ', ' + band.city : '') : g.space + (g.city ? ', ' + g.city : '');
        list.appendChild(btn('.genre-card' + (locked ? '' : '.live'), {
          testid: 'genre-' + g.genre, disabled: locked,
          onclick: function () { draft.bandId = band ? band.id : 'hail_damage'; draft.genre = g.genre; ui.show('intro'); }
        }, [
          el('span.ico', g.icon),
          el('span.grow', [el('div.g', g.label), el('div.b', name), el('div.c', where)]),
          locked ? el('span.tag', 'Coming in ' + ((band && band.comingIn) || 'v0.9')) : el('span.tag.amber', 'Playable')
        ]));
      });
      ui.append(s.body, [backRow(s, 'Pick your poison', 'New career · slot ' + (draft.slot || '1')),
        el('p.screen-sub', "You're the drummer. You're always the drummer."), list]);
    }
  });

  /* ---- New career: band intro --------------------------------------------------------------------------- */
  ui.define('intro', {
    kind: 'full',
    build: function (s) {
      var band = (GG.content.bands || {})[draft.bandId] || bandFor(draft.genre || 'metal');
      var g = GENRES.filter(function (x) { return x.genre === (draft.genre || 'metal'); })[0];
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
          el('div.panel.warm.row', [el('span', { style: 'font-size:28px' }, '🏠'), el('div.grow', [el('div.caps', 'Home base'),
            el('div', { style: 'font-weight:800' }, home.charAt(0).toUpperCase() + home.slice(1) + (city ? ', ' + city : ''))])]),
          mates.children.length ? el('div.panel', [el('div.caps', { style: 'margin-bottom:4px' }, 'The band (plus you, on drums)'), mates]) : null
        ])
      ]);
      s.foot.appendChild(btn('.btn.primary.big.block', { testid: 'btn-intro-next', onclick: function () { ui.show('creator'); } }, "That's my band →"));
    }
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
      var genre = draft.genre || 'metal', carryN = GG.creator ? GG.creator.carry.count(genre) : 0;
      if (draft.carry == null) draft.carry = carryN > 0;
      var customize = btn('.btn.block.cr-custom', { testid: 'btn-customize', disabled: !GG.creator || !ui.openLook, onclick: function () {
        var pre = list.filter(function (p) { return p.id === draft.presetId; })[0] || list[0], c = draft.useCustom && draft.custom;
        var band = (GG.content.bands || {})[draft.bandId];
        ui.openLook({ mode: 'new', genre: genre, band: band && band.name, carry: !!draft.carry,
          look: c ? c.look : pre.look, stageLook: c ? c.stageLook : null, kit: c ? c.kit : GG.creator.newKit(pre.kitColor),
          onDone: function (out) { draft.custom = out; draft.useCustom = true; var cr = ui.get('creator'); if (cr) cr.rerender(); } });
      } }, draft.custom && draft.useCustom ? '✂ Keep tweaking your look' : '✂ Customize: face, hair, ink, stage outfit, kit');
      var carryBox = el('input', { type: 'checkbox', testid: 'carry-toggle', checked: !!draft.carry && carryN > 0, disabled: !carryN,
        onchange: function () { draft.carry = carryBox.checked; } });
      var carry = el('label.cr-carry', { htmlFor: 'cr-carry' }, [carryBox, el('span', carryN ? 'Carry over ' + carryN + ' unlock' + (carryN === 1 ? '' : 's') + ' from past ' + genre + ' careers'
        : 'Unlocks from past ' + genre + ' careers carry over here (none yet)')]);
      carryBox.id = 'cr-carry';
      var DL = GG.difficulty ? GG.difficulty.LEVELS : ['normal'];
      if (DL.indexOf(draft.careerDifficulty) < 0) draft.careerDifficulty = 'normal';
      var diffPick = el('div.diff-pick', { testid: 'diff-pick' }, DL.map(function (d) {
        var t = GG.difficulty ? GG.difficulty.text(d) : { name: d };
        return btn('.btn' + (d === draft.careerDifficulty ? '.primary' : ''), { testid: 'diff-' + d, 'aria-pressed': d === draft.careerDifficulty ? 'true' : 'false',
          onclick: function () { draft.careerDifficulty = d; s.rerender(); } }, [el('b', t.name), el('span.tiny', d === 'chill' ? 'easier life' : d === 'brutal' ? 'no mercy' : 'as intended')]);
      }));
      create = btn('.btn.primary.big.block', { testid: 'btn-create', disabled: !(draft.name || '').trim(), onclick: function () {
        var n = (name.value || '').trim().slice(0, 16);
        if (!n) { err.textContent = 'Even drummers need a name.'; return; }
        create.disabled = true;
        var custom = draft.useCustom && draft.custom;   // v0.8: the full creator's look + kit, carried-over unlocks
        if (GG.creator) GG.creator.prepare({ look: custom ? custom.look : null, stageLook: custom ? custom.stageLook : null, kit: custom ? custom.kit : null, carry: !!draft.carry });
        GG.main.newCareer({ slot: draft.slot || '1', bandId: draft.bandId || 'hail_damage',
          player: { name: n, nick: (nick.value || '').trim().slice(0, 16), presetId: draft.presetId, look: custom ? custom.look : undefined, kitColor: custom ? custom.kit.color : undefined },
          careerDifficulty: draft.careerDifficulty || 'normal', seed: GG.hashSeed(n + Date.now()) });
        ui.closeAll();
        ui.show('coldopen');
      } }, 'Start the band');
      ui.append(s.body, [
        backRow(s, "Who's on drums?", 'Character'),
        el('p.screen-sub', "You. You're on drums. You founded the band, you can't quit, and nobody can fire you."),
        el('div.stack', { style: 'margin-top:16px' }, [
          el('div.field', [el('label', { htmlFor: 'cr-name' }, 'Your name'), name, err]),
          el('div.field', [el('label', { htmlFor: 'cr-nick' }, 'Stage nickname'), nick]),
          el('div.caps', 'Pick a look'),
          grid,
          customize,
          carry,
          el('div.caps', 'Career difficulty · locked for this career'),
          diffPick,
          el('p.small.dim', { testid: 'diff-blurb' }, GG.difficulty ? GG.difficulty.text(draft.careerDifficulty).blurb : '')
        ])
      ]);
      s.foot.appendChild(create);
    }
  });

  /* ---- New career: cold open ------------------------------------------------------------------------------ */
  var COLD_FALLBACK = [
    'Saskatoon. A Tuesday in July. The sky turns the colour of a bruise.',
    "Hail the size of golf balls totals your dad's truck in about four minutes.",
    'The insurance adjuster writes two words on the claim form: HAIL DAMAGE.',
    "That night, in your parents' garage, you start a band. You already have a name."
  ];
  ui.define('coldopen', {
    kind: 'full',
    build: function (s, d) {
      var band = GG.state && (GG.content.bands || {})[GG.state.bandId];
      var panels = (band && band.coldOpen && band.coldOpen.length) ? band.coldOpen : COLD_FALLBACK;
      var i = U.clamp(d.i || 0, 0, panels.length - 1), last = i === panels.length - 1;
      function finish() { ui.close(s.id); GG.main.enterGarage(); }
      function next() { if (last) return finish(); if (GG.audio) GG.audio.sfx('whoosh'); s.rerender({ i: i + 1 }); }
      var dots = el('div.dots', panels.map(function (_, k) { return el('i' + (k === i ? '.on' : '')); }));
      s.body.appendChild(el('div.cold', { onclick: next }, [
        el('div.hail'),
        el('div.cold-top', [el('span.caps', (band ? band.name : 'Hail Damage') + ' · ' + (i + 1) + '/' + panels.length),
          btn('.btn.ghost.small', { testid: 'btn-coldopen-skip', onclick: function (e) { e.stopPropagation(); finish(); } }, 'Skip')]),
        el('div.cold-text', GG.career && GG.state ? GG.career.fillText(GG.state, panels[i]) : panels[i]),
        el('div.cold-foot', [dots, btn('.btn.primary.big.block', { testid: 'btn-coldopen-next' }, last ? 'Into the garage →' : 'Next')])
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
  ui.define('code', {
    kind: 'sheet',
    title: function (d) { return d.mode === 'backup' ? 'Back up' : 'Restore'; },
    build: function (s, d) {
      var backup = d.mode === 'backup';
      var code = '';
      if (backup) {
        try { code = GG.save.toCode(GG.state); } catch (e) { code = ''; console.warn('[ui] toCode failed', e); }
      }
      var ta = el('textarea.code', { testid: 'code-text', rows: 6, spellcheck: 'false', autocomplete: 'off', readOnly: backup, value: code,
        placeholder: 'Paste a GG1:… code here' });
      var msg = el('div.err', { testid: 'code-error', role: 'alert' });
      ui.append(s.body, [el('div.stack', [
        el('p.small.dim', backup ? 'Your whole career as one alarming string. Paste it into your notes app or email it to yourself. It works on any device.'
          : 'Paste a save code. Line breaks and stray spaces are fine; missing chunks are not.'),
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
          var state;
          msg.textContent = '';
          try { state = GG.save.fromCode(ta.value); }
          catch (e) { msg.textContent = (e && e.message) || "That code didn't work."; return; }
          if (!state) { msg.textContent = "That code didn't work."; return; }
          var go = function () { ui.closeAll(); GG.main.loadState(state, { from: 'code' }); };
          if (!GG.state) return go();
          ui.confirm({ title: 'Swap careers?', text: 'This replaces the career you have open. Unsaved progress is lost.', yes: 'Load it', no: 'Cancel', danger: true })
            .then(function (ok) { if (ok) go(); });
        } }, 'Load career'));
      }
    }
  });
})(window.GG);
