// 54_ui_sequencer.js: the step sequencer, a full screen. Tabs Verse / Chorus / Bridge / Song. The grid runs lanes
// left→right (colours + icons in GG.ui.LANES, shared with v0.3's note highway) × 16 steps top→bottom, like the gig
// highway: tap a cell to toggle it, drag to paint. Groove / Hook / Difficulty meters and tips re-rate on every change;
// Play loops the section (or plays the whole song) with a moving playhead. Modes:
//   write : one per Write block, opened by the planner's Go (GG.ui.composeWeek). Save queues the song in
//           state.pendingSongs; "Let the band jam one" leaves the block to the band. ✕ goes back to the planner.
//   sketch: the kit hotspot, editing state.draft; "Use in next Write" queues it for the next Write block.
//   view  : a catalog song from the laptop (read-only, Play).
// v0.6.1: ♩ toggles the metronome click (settings.metronome, GG.audio.toggleMetronome); playback passes the song's id so
// the generated band keeps one key per song.
// v0.6.2 guided flow (write mode, settings.songwriterMode 'guided', the default): one thing per screen, Verse → Chorus →
// Bridge (pick a groove preset from content/grooves.js, optional one-tap tweak) → Tempo → Song order → Name → Save, each
// with Play / Back / Next and a bandmate's coach line. "Advanced" jumps to the full grid (and is remembered); the Song
// tab's "Guided steps" goes back. The kit's sketch pad always opens the grid.
// v0.8 (SHOPUI): tabs follow the gear (GG.songs.allSections): Verse / Chorus / Bridge (+ Solo, Outro once owned) / Song. An owned
// extra the song doesn't use yet shows "Add a Solo / an Outro" (GG.songs.addSection: the solo goes before the last chorus, the
// outro at the end); the ⋯ tools can remove it again (removeSection). In a Solo only the on-beat steps sound and chart live
// (Dana's spotlight), so the other cells are dimmed. The grid has as many lanes as the kit (gear.lanes, up to 6: toms, ride).
// The arrangement cards keep the extras (withExtras); the guided flow gets a Solo / Outro step each when owned. The sketch
// pad's 🛒 opens the drum shop (GG.ui.openGear).
// v1.1 "Seats" (plan_contract_1.1 §4.4; handoff E6 "Your part + auto drums"): on a string seat the song carries your PART
//   (pattern.part, GG.songs.part). Guided: {drummer} suggests the drums first (the genre's signature groove; "Tell {drummer}
//   what to play" opens today's drum grid, unchanged) -> "Your part" per section (a progression / hook card, the 2-5 row
//   grid, one-tap modifiers: lock to the kick, double time, let it ring, call and answer) -> tempo -> order -> name -> save.
//   Advanced: a "Your part | Drums" switch over the same tabs. The meters rate both (GG.songs.rate reads the part); Play
//   plays it (GG.audio.play { seat, part }). The drum seat is exactly as before.
// ui.show('seq', { mode, pat, title, titleEn, song, index, total, tip: { who, text }, onSave(entry), onJam(), onCancel() })
(function (GG) {
  var ui = GG.ui, el = ui.el, btn = ui.btn, C = GG.contracts, U = GG.util;
  // Lane look, left to right. v0.3's note highway uses the same colours and icons.
  ui.LANES = {
    kick: { name: 'Kick', icon: '🦶', color: '#ff6b4a' }, snare: { name: 'Snare', icon: '🥁', color: '#ffd23f' },
    hat: { name: 'Hats', icon: '🎩', color: '#3cd0c0' }, cymbal: { name: 'Crash', icon: '💥', color: '#b98cff' },
    toms: { name: 'Toms', icon: '🛢️', color: '#57c77a' }, ride: { name: 'Ride', icon: '🔔', color: '#4f8cff' }
  };
  var SEC_LABEL = { verse: 'Verse', chorus: 'Chorus', bridge: 'Bridge', solo: 'Solo', outro: 'Outro', song: 'Song' };
  function isExtra(name) { return name === 'solo' || name === 'outro'; }
  function hasSec(D, name) { return !!(D.pat && D.pat.sections && D.pat.sections[name]); }
  // v0.8: the section tabs this kit can write (read-only songs: the sections they have).
  function tabsFor(D) {
    var names = D.mode === 'view' ? GG.songs.sectionsOf(D.pat) : GG.songs.allSections(gear());
    return names.map(function (n) { return { id: n, label: (isExtra(n) && !hasSec(D, n) ? '+' : '') + SEC_LABEL[n] }; }).concat([{ id: 'song', label: 'Song' }]);
  }
  function extraDef(name) { return ((GG.content.shop && GG.content.shop.sections) || {})[name] || { name: SEC_LABEL[name], blurb: '' }; }
  // Arrangement presets keep the extras the song uses (a solo before the last chorus, an outro at the end).
  function withSongExtras(D, arr) { return GG.songs.withExtras(arr.slice(), gear(), { solo: hasSec(D, 'solo'), outro: hasSec(D, 'outro') }); }
  function baseArrangementId(p) { return GG.songs.arrangementId({ arrangement: (p.arrangement || []).filter(function (x) { return !isExtra(x); }) }); }
  function addExtra(s, D, name) {
    D.pat = GG.songs.addSection(D.pat, name, gear()); D.change = null;
    changed(D); if (D.playing) restart(s, D); s.rerender();
  }
  function removeExtra(s, D, name) {
    D.pat = GG.songs.removeSection(D.pat, name); D.change = null;
    changed(D); if (D.playing) restart(s, D); s.rerender();
  }
  function extraPanel(s, D, name) {
    var def = extraDef(name);
    return el('div.seq-extra.stack', { testid: 'seq-extra-' + name }, [
      el('div.panel.warm.stack.tight', [el('div.caps', name === 'solo' ? soloWho().pos + ' spotlight' : 'The big finish'), el('div', { style: 'font-weight:900;font-size:20px' }, def.name),
        el('p.small.dim', def.blurb),
        el('p.small', name === 'solo' ? (soloWho().you ? 'Goes in before the last chorus. Live, the whole section is your spotlight.' : 'Goes in before the last chorus. Live, you only play ' + (strSeat() ? 'one note a beat' : 'the quarter notes') + ': the rest is ' + soloWho().pos + '.')
          : 'Goes at the very end: the last chord rings out, and you get a big ' + (strSeat() ? 'finish' : 'fill') + ' to finish.')]),
      D.mode === 'view' ? null : btn('.btn.primary.block', { testid: 'seq-add-' + name, onclick: function () { addExtra(s, D, name); } }, 'Add ' + (name === 'outro' ? 'an Outro' : 'a Solo') + ' to this song')]);
  }
  var ARR_NAMES = { short: 'Short', classic: 'Classic', epic: 'Epic' };
  var BEAT_LABELS = ['1', 'e', '&', 'a'];
  var KICK_HINT = "One foot, one pedal: no two kicks in a row until you own a double kick.";

  function st() { return GG.state; }
  function gear() { return (st() && st().gear) || GG.songs.DEFAULT_GEAR; }
  function genre() { return (st() && st().genre) || 'metal'; }
  /* ---- v1.1 "Seats": your part ------------------------------------------------------------------------------ */
  function seat() { var s = st(); return s && GG.career && GG.career.seatOf ? GG.career.seatOf(s) : 'drums'; }
  function strSeat() { return seat() !== 'drums'; }
  // A working pattern for this seat: a string seat's always carries a part (the seat's suggestion where it is missing).
  function withPart(p) {
    if (!p || !GG.songs.part) return p;
    if (!strSeat()) { if (p.part) delete p.part; return p; }
    p.part = p.part && p.part.seat === seat() ? GG.songs.part.sanitize(p.part, GG.songs.sectionsOf(p), genre()) : GG.songs.part.full(genre(), seat(), p);
    return p;
  }
  // {drummer}'s suggested groove (a string seat's new song): the genre's signature preset on the verse, the next presets
  // (that need no pedal) on the chorus and the bridge, so the hook has some contrast to start from.
  function drummerGroove(p) {
    var list = GG.songs.presets(genre(), gear()).filter(function (x) { return !x.locked; }), sig = list.filter(function (x) { return x.signature; })[0] || list[0];
    if (!sig) return p;
    var rest = list.filter(function (x) { return x !== sig; });
    p = GG.songs.applyPreset(p, 'verse', sig.id, gear(), genre());
    if (rest[0]) p = GG.songs.applyPreset(p, 'chorus', rest[0].id, gear(), genre());
    if (rest[1]) p = GG.songs.applyPreset(p, 'bridge', rest[1].id, gear(), genre());
    return p;
  }
  function drummerName() { return st() && GG.career.tokenValue ? GG.career.tokenValue(st(), 'drummer') : 'the drummer'; }
  function instrument() { return st() && GG.career.tokenValue ? GG.career.tokenValue(st(), 'instrument') : 'drums'; }
  function partLayer(D) { return !!(D.pat && D.pat.part) && D.layer !== 'drums'; }
  function seatPlay(D) { return D.pat && D.pat.part ? { seat: D.pat.part.seat, part: D.pat.part } : {}; }
  var PART_COLORS = ['#57c77a', '#ff6b4a', '#ffd23f', '#4f8cff', '#b98cff'];
  var PART_CSS = [
    '.part-picks { display: flex; flex-wrap: wrap; gap: 6px; padding: 2px 0 4px; }',
    '.part-picks .part-pick { flex: 1 1 auto; min-height: 48px; min-width: 48px; padding: 0 10px; border-radius: 12px; border: 1px solid var(--line); background: var(--panel2); color: var(--text); font: 800 13px var(--font); cursor: pointer; }',
    '.part-cycle { display: grid; grid-template-columns: 48px 1fr 48px; gap: 6px; align-items: center; margin-bottom: 4px; }',
    '.part-cycle .icon-btn { width: 48px; height: 48px; }',
    '.part-cycle .pc-name { text-align: center; font: 800 13px var(--font); line-height: 1.15; }',
    '.part-picks .part-pick.on { border-color: var(--amber); box-shadow: inset 0 -3px 0 var(--amber); }',
    '.seq-layers { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }',
    '.seq-layers .btn { min-height: 48px; }',
    '.seq-layers .btn.on { border-color: var(--amber); background: var(--panel2); box-shadow: inset 0 -3px 0 var(--amber); }',
    '.seq-grid.part .lh { flex-direction: column; gap: 0; line-height: 1.05; }',
    '.part-drums { display: flex; flex-direction: column; gap: 6px; }',
    '.part-drums .row { min-height: 40px; }'
  ].join('\n');
  (function inject() {
    if (typeof document === 'undefined' || document.getElementById('gg-css-part')) return;
    var css = document.createElement('style'); css.id = 'gg-css-part'; css.textContent = PART_CSS;
    (document.head || document.documentElement).appendChild(css);
  })();
  // A tap on your grid plays that note (your instrument's voice; the genre's root, the row's interval / scale degree).
  function partPreview(row) {
    var A = GG.audio, sp = seat(); if (!A) return;
    var B = GG.songs.genre(genre()).backing || {}, root = B.root || 40, sc = B.scale || [0, 2, 4, 7, 9];
    try {
      if (sp === 'bass' && A.pluck) A.pluck(root - 12 + [0, 7, 12][row], undefined, { len: 0.4, kind: 'bass' });
      else if (sp === 'rhythm' && A.strum) A.strum(root, undefined, { len: row ? 0.6 : 0.2, kind: 'gtr', power: true, mute: !row });
      else if (A.lead) A.lead(root + 12 + sc[row % sc.length] + 12 * Math.floor(row / sc.length), undefined, { len: 0.35, kind: 'lead' });
    } catch (e) { /* no sound: fine */ }
  }
  function buildPartGrid(s, D) {
    var pt = D.pat.part, sec = pt.sections[D.tab], n = sec.rows.length, ro = D.mode === 'view', names = GG.songs.part.ROW_NAMES[pt.seat] || [];
    var grid = el('div.seq-grid.part' + (ro ? '.ro' : ''), { testid: 'part-grid', data: { lanes: String(n), seat: pt.seat }, style: { gridTemplateColumns: '30px repeat(' + n + ', minmax(0, 1fr))' } });
    grid.appendChild(el('div'));
    for (var r = 0; r < n; r++) grid.appendChild(el('div.lh', { style: { color: PART_COLORS[r], background: tint(PART_COLORS[r], 0.14) } }, [el('span', '♪'), names[r] || String(r + 1)]));
    var cells = [], labels = [];
    for (var step = 0; step < C.STEPS; step++) {
      var q = step % 4 === 0, lab = el('div.bl' + (q ? '.q' : ''), q ? String(step / 4 + 1) : BEAT_LABELS[step % 4]);
      grid.appendChild(lab); labels.push(lab);
      var row = [];
      for (r = 0; r < n; r++) {
        var c = el('div.cell' + (Math.floor(step / 4) % 2 === 0 ? '.sh' : '') + (GG.songs.isHit(sec.rows[r], step) ? '.on' : ''), { testid: 'part-cell-' + r + '-' + step, data: { l: r, s: step } });
        c.style.setProperty('--lc', PART_COLORS[r]);
        grid.appendChild(c); row.push(c);
      }
      cells.push(row);
    }
    D.view.cells = cells; D.view.labels = labels;
    if (!ro) paintable(grid, D, true);
    return grid;
  }
  // The advanced screen: one line, ‹ the progression / hook › (the grid keeps the room).
  function partCycle(s, D, name) {
    var pt = D.pat.part, key = GG.songs.part.key(pt.seat), list = GG.songs.part.choices(genre(), pt.seat, name), cur = pt.sections[name] ? pt.sections[name][key] : 0, ro = D.mode === 'view';
    function go(d) {
      var i = ((cur + d) % list.length + list.length) % list.length;
      D.pat = GG.songs.part.pick(D.pat, name, i, gear(), genre()); D.change = null;
      changed(D); if (D.playing) restart(s, D); s.rerender();
    }
    var label = (pt.seat === 'lead' ? 'Hook: ' : 'Chords: ') + (list[cur] ? list[cur].name : '?') + ' (' + (cur + 1) + '/' + list.length + ')';
    return el('div.part-cycle', { testid: 'part-cycle' }, [
      btn('.icon-btn', { testid: 'part-prev', 'aria-label': 'Previous', disabled: ro || list.length < 2, onclick: function () { go(-1); } }, '‹'),
      el('div.pc-name', { testid: 'part-cycle-name' }, label),
      btn('.icon-btn', { testid: 'part-next', 'aria-label': 'Next', disabled: ro || list.length < 2, onclick: function () { go(1); } }, '›')]);
  }
  // The progression (bass, rhythm) or hook (lead) for this section, in plain words.
  function partPicker(s, D, name) {
    var pt = D.pat.part, key = GG.songs.part.key(pt.seat), cur = pt.sections[name] ? pt.sections[name][key] : -1, ro = D.mode === 'view';
    return el('div.part-picks', { testid: 'part-picks' }, GG.songs.part.choices(genre(), pt.seat, name).map(function (c) {
      return btn('.part-pick' + (c.i === cur ? '.on' : ''), { testid: 'part-pick-' + c.i, disabled: ro && c.i !== cur, onclick: function () {
        if (ro || c.i === cur) return;
        D.pat = GG.songs.part.pick(D.pat, name, c.i, gear(), genre()); D.change = null;
        changed(D); if (D.playing) restart(s, D); s.rerender();
      } }, c.name);
    }));
  }
  function partMods(s, D, name, after) {
    return el('div.guide-mods', GG.songs.part.MODS.map(function (m) {
      return btn('.guide-mod', { testid: 'part-mod-' + m.id, title: m.desc, onclick: function () {
        if (after) after();
        var r = GG.songs.part.modify(D.pat, name, m.id, gear(), genre());
        if (JSON.stringify(r.pattern.part) === JSON.stringify(D.pat.part)) { D.change = { section: name, name: m.name, noop: true }; s.rerender(); return; }
        D.pat = r.pattern; D.change = { section: name, name: m.name, desc: m.desc, before: r.before, after: r.after };
        changed(D); if (D.playing) restart(s, D); s.rerender();
      } }, m.name);
    }));
  }
  // The advanced screen's "Your part | Drums" switch.
  function layerSwitch(s, D) {
    var on = partLayer(D);
    return el('div.seq-layers', { testid: 'seq-layers' }, [
      btn('.btn.small' + (on ? '.on' : ''), { testid: 'seq-layer-part', 'aria-pressed': on ? 'true' : 'false', onclick: function () { D.layer = 'part'; s.rerender(); } }, 'Your part'),
      btn('.btn.small' + (on ? '' : '.on'), { testid: 'seq-layer-drums', 'aria-pressed': on ? 'false' : 'true', onclick: function () { D.layer = 'drums'; s.rerender(); } }, 'Drums (' + drummerName() + ')')]);
  }
  // v0.9: who takes the solo (gig.roles solo: lead guitar > guitar > fiddle; the same resolver the gig and the audio use)
  // and who names the songs (band.roles.namer), for the songwriter's copy. { id, name, pos: "Dana's", verb }
  function soloWho() {
    var id = st() ? ui.roleOf('soloist') : null;
    if (id === 'player') return { id: id, name: 'You', pos: 'Your', verb: 'shred', you: true };   // v1.1: the lead seat's solo is yours
    var n = id ? ui.who(id).short : null, fiddle = id && /fiddle/.test(ui.who(id).role || '');
    return { id: id, name: n || 'The guitarist', pos: n ? n + '’s' : 'The guitarist’s', verb: fiddle ? 'saws away' : 'shreds' };
  }
  function namer() { var id = st() ? ui.roleOf('namer') : null; return id ? ui.who(id).short : 'the band'; }
  var TITLE_HINT = { metal: 'Crabgrass of the Damned', punk: 'Parking Ticket Riot', rock: 'Leather Pants Forever', country: 'My Truck Left Me' };
  function sing() { var s = st(); return s ? { singer: ui.roleOf('front', s), band: s.bandId } : {}; }   // v0.9: who sings (the audio's vocal voice, if it keys on it)
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function tint(hex, a) { var n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; }

  /* ---- Rating display ------------------------------------------------------------------------------------ */
  function meter(label, testid) {
    var v = el('b', '0'), bar = ui.bar(0, 100), node = el('div.meter', { testid: testid }, [el('div.mh', [el('span.caps', label), v]), bar]);
    node._v = v; node._bar = bar;
    return node;
  }
  function setMeter(m, value, color) {
    m._v.textContent = String(value); m.dataset.value = String(value);
    m._bar.firstChild.style.width = U.clamp(value, 0, 100) + '%';
    m._bar.firstChild.style.background = color;
  }
  function tone(v) { return v >= 70 ? 'var(--good)' : v >= 45 ? 'var(--amber)' : 'var(--bad)'; }
  // Re-rates the working pattern and refreshes meters + tip instantly (no re-render).
  function rerate(D) {
    var r = GG.songs.rate(D.pat, genre(), gear()), V = D.view, ability = st() ? GG.songs.ability(st()) : 100;
    D.rating = r;
    if (!V) return r;
    setMeter(V.groove, r.groove, tone(r.groove));
    setMeter(V.hook, r.hook, tone(r.hook));
    setMeter(V.diff, r.difficulty, r.difficulty > ability ? 'var(--bad)' : 'var(--blue)');
    V.ability.style.left = U.clamp(ability, 0, 99) + '%';
    var tips = (partLayer(D) && r.part && r.part.tips ? r.part.tips : r.tips).slice();   // v1.1: the part grid shows your part's tips
    if (r.difficulty > ability + 5) tips.unshift('Harder than the band can play yet: it will start rough.');
    if (!V.tip) return r;
    ui.clear(V.tip);
    if (D.hint) ui.append(V.tip, [el('b', D.hint.who ? ui.who(D.hint.who).short + ': ' : ''), D.hint.text]);
    else if (D.tab === 'solo' && hasSec(D, 'solo') && !D.guided && !partLayer(D)) ui.append(V.tip, [el('b.amber', 'Solo: '), 'live you only play the beat (the lit rows). The dimmed steps are ' + soloWho().pos + '.']);
    else if (r.notes && !tips.length) ui.append(V.tip, [el('b.good', GG.songs.verdict(genre(), r.groove) + ' '), 'Nothing to fix. Hit play and enjoy it.']);
    else ui.append(V.tip, [r.notes ? el('b.amber', GG.songs.verdict(genre(), r.groove) + ' ') : null, tips.slice(0, 2).join(' ')]);
    return r;
  }
  // Every edit: re-rate, keep playback in sync, keep the sketch pad saved.
  function changed(D) {
    rerate(D);
    if (D.handle && D.handle.playing) D.handle = D.handle.update(D.pat) || D.handle;
    if (D.mode === 'sketch' && st()) st().draft = U.clone(D.pat);
  }

  /* ---- The grid -------------------------------------------------------------------------------------------- */
  function buildGrid(s, D) {
    var sec = D.pat.sections[D.tab], lanes = D.pat.lanes, ro = D.mode === 'view', solo = D.tab === 'solo';
    var grid = el('div.seq-grid' + (ro ? '.ro' : '') + (lanes > 4 ? '.wide' : '') + (solo ? '.solo' : ''), { testid: 'seq-grid', data: { lanes: String(lanes) }, style: { gridTemplateColumns: '30px repeat(' + lanes + ', minmax(0, 1fr))' } });
    grid.appendChild(el('div'));
    for (var l = 0; l < lanes; l++) {
      var L = ui.LANES[C.LANES[l]];
      grid.appendChild(el('div.lh', { style: { color: L.color, background: tint(L.color, 0.14) } }, [el('span', L.icon), L.name]));
    }
    var cells = [], labels = [];
    for (var step = 0; step < C.STEPS; step++) {
      var q = step % 4 === 0, lab = el('div.bl' + (q ? '.q' : ''), q ? String(step / 4 + 1) : BEAT_LABELS[step % 4]);
      grid.appendChild(lab); labels.push(lab);
      var row = [];
      for (l = 0; l < lanes; l++) {
        var hit = GG.songs.isHit(sec[l], step), name = C.LANES[l];
        var c = el('div.cell' + (Math.floor(step / 4) % 2 === 0 ? '.sh' : '') + (hit ? '.on' : '') + (solo && step % 4 ? '.soff' : ''),   // v0.8: a solo charts the beat only
          { testid: 'cell-' + name + '-' + step, data: { l: l, s: step } });
        c.style.setProperty('--lc', ui.LANES[name].color);
        grid.appendChild(c); row.push(c);
      }
      cells.push(row);
    }
    D.view.cells = cells; D.view.labels = labels;
    if (!ro) paintable(grid, D);
    return grid;
  }
  // Tap toggles; dragging paints the same value (on or off) across every cell the finger crosses.
  function paintable(grid, D, isPart) {
    var paint = null;
    function cellOf(node) { return node && node.classList && node.classList.contains('cell') ? node : null; }
    function rowsOf() { return isPart ? D.pat.part.sections[D.tab].rows : D.pat.sections[D.tab]; }
    function apply(c) {
      if (isPart) {   // v1.1: your part's grid (rows, no kick rule)
        var pr = +c.dataset.l, ps = +c.dataset.s, rows = rowsOf();
        if (GG.songs.isHit(rows[pr], ps) === paint.value) return;
        rows[pr] = GG.songs.setHit(rows[pr], ps, paint.value);
        c.classList.toggle('on', paint.value);
        if (paint.value && !(D.handle && D.handle.playing)) partPreview(pr);
        D.hint = null; D.change = null;
        changed(D);
        return;
      }
      var l = +c.dataset.l, step = +c.dataset.s, sec = D.pat.sections[D.tab], cur = GG.songs.isHit(sec[l], step);
      if (cur === paint.value) return;
      if (paint.value && l === 0 && GG.songs.kickBlocked(sec[0], step, gear())) {
        c.classList.remove('nope'); void c.offsetWidth; c.classList.add('nope');   // restart the flash
        D.hint = { text: KICK_HINT }; rerate(D); D.hint = null;
        return;
      }
      sec[l] = GG.songs.setHit(sec[l], step, paint.value);
      c.classList.toggle('on', paint.value);
      if (paint.value && !(D.handle && D.handle.playing) && GG.audio && GG.audio.hit) GG.audio.hit(C.LANES[l]);
      D.hint = null;
      changed(D);
    }
    grid.addEventListener('pointerdown', function (e) {
      var c = cellOf(e.target); if (!c) return;
      e.preventDefault();
      var sec = rowsOf();
      paint = { value: !GG.songs.isHit(sec[+c.dataset.l], +c.dataset.s), last: c, id: e.pointerId };
      try { grid.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      apply(c);
    });
    grid.addEventListener('pointermove', function (e) {
      if (!paint || e.pointerId !== paint.id) return;
      var c = cellOf(document.elementFromPoint(e.clientX, e.clientY));
      if (c && c !== paint.last) { paint.last = c; apply(c); }
    });
    function end(e) { if (paint && e.pointerId === paint.id) paint = null; }
    grid.addEventListener('pointerup', end);
    grid.addEventListener('pointercancel', end);
  }
  function playhead(D, ev) {
    var V = D.view; if (!V || !V.cells) return;
    if (V.ph != null) { V.labels[V.ph].classList.remove('ph'); V.cells[V.ph].forEach(function (c) { c.classList.remove('ph'); }); V.ph = null; }
    if (ev && ev.section === D.tab) { V.ph = ev.step; V.labels[ev.step].classList.add('ph'); V.cells[ev.step].forEach(function (c) { c.classList.add('ph'); }); }
    if (ev && ev.step === 0 && V.pos) V.pos.textContent = '▶ ' + cap(ev.section) + ' · bar ' + (ev.bar + 1) + '/' + C.BARS_PER_SECTION;
  }

  /* ---- The Song tab: title, tempo, arrangement ---------------------------------------------------------------- */
  function songPanel(s, D) {
    var ro = D.mode === 'view', G = GG.songs.genre(genre()), p = D.pat;
    var style = GG.audio && GG.audio.styleFor ? GG.audio.styleFor(genre(), p.bpm) : { label: '' };
    var bpmLabel = el('b', p.bpm + ' BPM'), styleLabel = el('span.dim', ' · ' + style.label);
    var tempo = el('input.seq-tempo', { type: 'range', testid: 'seq-tempo', disabled: ro,
      min: G.tempo[0], max: G.tempo[1], step: 5, value: p.bpm, 'aria-label': 'Tempo' });
    tempo.addEventListener('input', function () {
      p.bpm = +tempo.value; bpmLabel.textContent = p.bpm + ' BPM';
      styleLabel.textContent = ' · ' + (GG.audio && GG.audio.styleFor ? GG.audio.styleFor(genre(), p.bpm).label : '');
      rerate(D);
      arrRow.querySelectorAll('[data-secs]').forEach(function (n) { n.textContent = '~' + Math.round(GG.songs.seconds({ bpm: p.bpm, arrangement: withSongExtras(D, GG.songs.ARRANGEMENTS[n.dataset.secs]) })) + ' s'; });
    });
    tempo.addEventListener('change', function () { changed(D); if (D.handle && D.handle.playing) restart(s, D); });
    var cur = baseArrangementId(p);
    var arrRow = el('div.seq-arr', GG.songs.ARRANGEMENT_IDS.map(function (id) {
      var a = withSongExtras(D, GG.songs.ARRANGEMENTS[id]);   // v0.8: the extras come along
      return btn('.arr' + (id === cur ? '.on' : ''), { testid: 'seq-arr-' + id, disabled: ro && id !== cur, onclick: function () {
        if (ro || id === cur) return;
        p.arrangement = a.slice(); changed(D); if (D.playing === 'song') restart(s, D); s.rerender();
      } }, [el('b', ARR_NAMES[id]), el('span.seqs', a.map(function (x) { return x.charAt(0).toUpperCase(); }).join(' ')),
        el('span.small.dim', { data: { secs: id } }, '~' + Math.round(GG.songs.seconds({ bpm: p.bpm, arrangement: a })) + ' s')]);
    }));
    var extras = ro ? [] : GG.songs.allSections(gear()).filter(isExtra);
    var r = D.rating || rerate(D);
    var parts = [
      D.mode === 'write' ? el('div.row.small.dim', [el('span.grow', 'Rather go one step at a time?'), btn('.btn.small', { testid: 'btn-seq-guided', onclick: function () {
        stopPlay(D); D.guided = true; D.step = strSeat() ? 'drums' : 'verse'; D.layer = null; setMode('guided'); s.rerender();
      } }, 'Guided steps')]) : null,
      el('div.panel.stack.tight', [el('div.caps', 'Title'), ro ? el('div', { style: 'font-weight:800;font-style:italic' }, D.title)
        : el('div.row', [
          el('input.seq-name', { testid: 'seq-title-input', maxLength: 40, value: D.custom ? D.title : '', placeholder: 'Type your own, or let ' + namer(),
            oninput: function (e) { var v = e.target.value.trim(); if (v) { D.title = v; D.titleEn = v; D.custom = true; } else { D.custom = false; reroll(D); } head(s, D); } }),
          btn('.btn.small', { testid: 'btn-seq-reroll', 'aria-label': 'New title from ' + namer(), onclick: function () { D.custom = false; reroll(D); s.rerender(); } }, '🎲')
        ]), D.titleEn && D.titleEn !== D.title ? el('div.small.dim', '“' + D.titleEn + '” (nobody knows yet)') : null]),
      el('div.panel.stack.tight', [el('div.row', [el('span.caps.grow', 'Tempo'), el('span', [bpmLabel, styleLabel])]), tempo,
        el('div.row.tiny.faint', [el('span.grow', G.tempo[0]), el('span', G.tempo[1])])]),
      el('div.stack.tight', [el('div.caps', 'Arrangement (each part plays ' + C.BARS_PER_SECTION + ' bars)'), arrRow]),
      extras.length ? el('div.stack.tight', extras.map(function (name) {   // v0.8: owned extras, in or out of this song
        var on = hasSec(D, name), def = extraDef(name);
        return el('div.row.panel.small', { testid: 'seq-song-extra-' + name }, [el('div.grow', [el('b', def.name + (on ? ' ✓' : '')), el('div.tiny.dim', on ? (name === 'solo' ? 'Before the last chorus' : 'At the very end') : def.blurb)]),
          btn('.btn.small' + (on ? '' : '.primary'), { testid: 'seq-song-' + (on ? 'remove-' : 'add-') + name, onclick: function () { if (on) removeExtra(s, D, name); else addExtra(s, D, name); } }, on ? 'Take out' : 'Add')]);
      })) : null,
      el('div.panel.small', { testid: 'seq-sections' }, ['Groove by part: '].concat(GG.songs.sectionsOf(p).map(function (n, i) {
        return [i ? ' · ' : '', el('b', SEC_LABEL[n] + ' ' + (r.sections[n] != null ? r.sections[n] : '–'))];
      })).concat([el('div.tiny.faint', { style: 'margin-top:4px' }, r.notes + ' hits in the whole song.')]))
    ];
    return el('div.seq-song.stack', parts);
  }
  function reroll(D) {
    if (!st()) return;
    var t = GG.songs.pickTitle(st(), ui.rng, (D.taken || []).concat(D.title ? [D.title] : []));
    D.title = t.title; D.titleEn = t.titleEn;
  }

  /* ---- Playback ------------------------------------------------------------------------------------------ */
  function stopPlay(D) {
    if (D.handle) D.handle.stop();
    D.handle = null; D.playing = null;
    playhead(D, null);
    playButtons(D);
  }
  // v0.6.1: the song's key is seeded by its id (a new song: the id it will most likely get), so it stays put while you edit.
  function songSeed(D) {
    if (D.seed) return D.seed;
    if (D.song && D.song.id != null) return (D.seed = D.song.id);
    var state = st(), max = 0;
    if (D.mode === 'write' && state && state.songs) {
      state.songs.forEach(function (x) { var n = parseInt(String(x.id).slice(1), 10); if (n > max) max = n; });
      return (D.seed = 's' + (max + 1 + (D.index || 0)));
    }
    return (D.seed = 'sketch|' + ((state && state.totalWeek) || 0));
  }
  // Metronome toggle (settings.metronome via GG.audio; the settings screen mirrors it).
  function metroOn() { try { return !!(GG.audio && GG.audio.metronome && GG.audio.metronome()); } catch (e) { return false; } }
  function metroButton() {
    var b = btn('.icon-btn', { testid: 'btn-seq-metro', 'aria-label': 'Metronome click', title: 'Metronome click',
      style: 'width:48px;height:48px;flex:0 0 48px;font-size:22px', onclick: function () {
        var on = GG.audio && GG.audio.toggleMetronome ? GG.audio.toggleMetronome() : false;
        paintMetro(b, on);
        ui.toast(on ? countIn() : 'Click off. Feel it.');
      } }, '♩');
    paintMetro(b, metroOn());
    return b;
  }
  // v0.9: the count-in line is the band's (content lines.byBand[bandId].countIn), else the singer counts.
  function countIn() {
    var c = ui.bandLines('countIn'), t = Array.isArray(c) ? ui.pick(c) : c;
    return 'Click on. ' + ui.fill(t || '{front} counts you in: "one, two, one two three four."');
  }
  function paintMetro(b, on) {
    b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.dataset.on = on ? '1' : '0';
    b.style.background = on ? 'var(--amber)' : ''; b.style.color = on ? '#1d1204' : '';
  }
  function startPlay(s, D, kind) {
    var section = kind === 'song' ? null : (D.tab === 'song' || !hasSec(D, D.tab) ? 'verse' : D.tab);
    var h = GG.audio && GG.audio.play ? GG.audio.play(D.pat, Object.assign({ genre: genre(), section: section, loop: kind !== 'song', songId: songSeed(D), metronome: true }, sing(), seatPlay(D))) : null;   // v1.1: + your part
    if (!h) { ui.toast("No sound on this device. Imagine it. It's loud."); return; }
    D.handle = h; D.playing = kind;
    if (D.view && D.view.pos) D.view.pos.textContent = '';
    playButtons(D);
  }
  function restart(s, D) { var k = D.playing; if (k) startPlay(s, D, k); }
  function toggle(s, D, kind) { if (D.playing === kind) stopPlay(D); else startPlay(s, D, kind); }
  function playButtons(D) {
    var V = D.view; if (!V) return;
    if (V.play) { V.play.textContent = D.playing ? '■ Stop' : '▶ Play'; V.play.classList.toggle('on', !!D.playing); return; }
    if (!V.loop) return;
    var sec = D.tab === 'song' || !hasSec(D, D.tab) ? 'verse' : D.tab;
    V.loop.textContent = D.playing === 'loop' ? '■ Stop' : '▶ Loop ' + sec;
    V.song.textContent = D.playing === 'song' ? '■ Stop' : '▶ Song';
    V.loop.classList.toggle('on', D.playing === 'loop'); V.song.classList.toggle('on', D.playing === 'song');
  }

  /* ---- Screen ---------------------------------------------------------------------------------------------- */
  function head(s, D) {
    var V = D.view; if (!V || !V.title) return;
    ui.clear(V.title);
    ui.append(V.title, [el('div.caps', D.sub || ''), el('div.fr', D.title || 'Untitled'),
      D.titleEn && D.titleEn !== D.title ? el('div.en', D.titleEn) : null]);
  }
  function subFor(D) {
    if (D.mode === 'write') return 'Write block ' + (D.index + 1) + ' of ' + D.total + (D.fromSketch ? ' · from your sketch pad' : '');
    if (D.mode === 'sketch') return 'Sketch pad · tap the title for a name';
    var s = D.song || {};
    return (s.auto ? 'Band jam' : 'Your song') + (s.written ? ' · week ' + s.written : ' · came with the band') + (s.classic ? ' · classic' : s.stale >= 50 ? ' · going stale' : '');
  }
  function save(s, D) {
    if (D.done) return;
    var r = rerate(D);
    if (!r.notes) { ui.toast('Nothing to save yet. Tap some hits in, or let the band jam one.'); return; }
    D.done = true; stopPlay(D);
    var entry = GG.songs.sanitize(D.pat, gear(), genre());
    entry.title = D.title; entry.titleEn = D.titleEn || D.title;
    if (GG.songs.isFrench && GG.songs.isFrench(entry.title)) entry.fr = true;   // v0.7.2: Marcel's French one stays French on load
    if (D.onSave) D.onSave(entry);
  }

  ui.define('seq', {
    kind: 'full', cls: 'seq',
    build: function (s, D) {
      if (!D.pat) D.pat = GG.songs.starter(genre(), gear());
      if (D.mode !== 'view' && !D.partReady) { withPart(D.pat); D.partReady = true; }   // v1.1: a string seat writes its part
      D.tab = D.tab || 'verse';
      if (!D.title && D.mode !== 'view') reroll(D);
      D.sub = subFor(D);
      if (D.mode === 'write' && D.guided == null) D.guided = prefMode() === 'guided';
      if (D.mode === 'write' && D.guided) { buildGuided(s, D); return; }
      var ro = D.mode === 'view', V = D.view = {};
      V.title = btn('.seq-title', { testid: 'seq-title', disabled: ro, onclick: function () { if (!ro && !D.custom) { reroll(D); head(s, D); } } });
      var right = D.mode === 'write' ? btn('.btn.small.seq-jam', { testid: 'btn-seq-jam', onclick: function () {
        if (D.done) return; D.done = true; stopPlay(D); if (D.onJam) D.onJam();
      } }, 'Let the band jam one') : D.mode === 'sketch' && ui.openGear ? btn('.btn.small.seq-jam', { testid: 'btn-kit-shop', onclick: function () {   // v0.8: the drum shop
        stopPlay(D); ui.openGear();
      } }, strSeat() ? '🛒 ' + cap(instrument()) + ' shop' : '🛒 Drum shop') : null;   // v1.1: your seat's shop
      if (D.tab !== 'song' && !tabsFor(D).some(function (t) { return t.id === D.tab; })) D.tab = 'verse';
      var present = D.tab === 'song' || hasSec(D, D.tab), layer = D.tab !== 'song' && present && partLayer(D);
      var tools = ro || D.tab === 'song' || !present ? null : btn('.icon-btn', { testid: 'btn-seq-tools', 'aria-label': 'Copy or clear', onclick: function () { ui.show('seq-tools', { owner: s }); } }, '⋯');
      V.groove = meter('Groove', 'meter-groove'); V.hook = meter('Hook', 'meter-hook'); V.diff = meter('Difficulty', 'meter-diff');
      V.ability = el('i.ab'); V.diff._bar.appendChild(V.ability);
      V.tip = el('div.seq-tip', { testid: 'seq-tip' });
      V.pos = el('span.seq-pos');
      var main = el('div.seq-main', D.tab === 'song' ? songPanel(s, D) : layer ? [partCycle(s, D, D.tab), buildPartGrid(s, D)] : present ? buildGrid(s, D) : extraPanel(s, D, D.tab));
      ui.append(s.body, [
        el('div.seq-head', [btn('.icon-btn', { testid: 'btn-seq-close', 'aria-label': D.mode === 'write' ? 'Back to the planner' : 'Close', onclick: function () {
          stopPlay(D); if (D.onCancel) D.onCancel(); ui.close(s.id);
        } }, '✕'), V.title, metroButton(), right]),
        el('div.seq-tabs' + (tabsFor(D).length > 4 ? '.many' : ''), [ui.tabs(tabsFor(D), D.tab, function (id) {
          D.tab = id; s.rerender();
          if (D.playing === 'loop' && id !== 'song') startPlay(s, D, 'loop'); else playButtons(D);
        }, 'seq-tab-'), tools]),
        D.pat.part && D.tab !== 'song' && present ? layerSwitch(s, D) : null,   // v1.1 "Your part | Drums"
        el('div.seq-meters', [V.groove, V.hook, V.diff]),
        el('div.seq-tipline', [V.tip, V.pos]),
        main
      ]);
      V.loop = btn('.btn', { testid: 'btn-seq-loop', onclick: function () { toggle(s, D, 'loop'); } });
      V.song = btn('.btn', { testid: 'btn-seq-song', onclick: function () { toggle(s, D, 'song'); } });
      var done = D.mode === 'write' ? btn('.btn.primary', { testid: 'btn-seq-save', onclick: function () { save(s, D); } }, 'Save ✓')
        : D.mode === 'sketch' ? btn('.btn.primary', { testid: 'btn-seq-use', onclick: function () { useSketch(s, D); } }, 'Use in next Write')
        : null;
      ui.append(s.foot, [V.loop, V.song, done]);
      head(s, D); rerate(D); playButtons(D);
    },
    // Listeners live on the screen entry (s), not its data: composeWeek swaps the data for each Write block.
    onShow: function (s) {
      s.off = [
        GG.on('audio:step', function (ev) { var D = s.data; if (D.handle && D.handle.playing) playhead(D, ev); }),
        GG.on('audio:end', function (ev) { var D = s.data; if (ev && ev.handle === D.handle) { D.handle = null; D.playing = null; playhead(D, null); playButtons(D); } })
      ];
    },
    onClose: function (s) {
      stopPlay(s.data);
      (s.off || []).forEach(function (off) { off(); });
    }
  });

  /* ---- v0.6.2 guided songwriter ---------------------------------------------------------------------------- */
  var GSTEPS = ['verse', 'chorus', 'bridge', 'tempo', 'order', 'name'], SECTIONS3 = ['verse', 'chorus', 'bridge'];
  var GNAMES = { verse: 'Verse', chorus: 'Chorus', bridge: 'Bridge', solo: 'Solo', outro: 'Outro', tempo: 'Tempo', order: 'Song order', name: 'Name' };
  // v0.8: an owned Solo / Outro gets its own step after the bridge.
  function gsteps() { return (strSeat() ? ['drums'] : []).concat(GSTEPS.slice(0, 3), GG.songs.allSections(gear()).filter(isExtra), GSTEPS.slice(3)); }   // v1.1: drums first on a string seat
  GNAMES.drums = 'Drums';
  function extraStep(s, D, name) {
    var on = hasSec(D, name), def = extraDef(name);
    var sw = soloWho(), ns = ui.bandLines('noSolo'), noSolo = ui.fill((Array.isArray(ns) ? ns[0] : ns) || '{soloist} will mention it. Gently. Twice.');
    var yes = name === 'solo' ? 'Yes: ' + sw.pos + (sw.you ? ' solo' : ' solo') + ' before the last chorus' : 'Yes: a big finish at the end', no = name === 'solo' ? 'No solo in this one' : 'No outro: stop dead';
    return [el('div.guide-hint', { testid: 'guide-hint' }, def.blurb),
      el('div.guide-presets', [
        btn('.guide-preset' + (on ? '.on' : ''), { testid: 'guide-extra-' + name + '-yes', onclick: function () { if (!on) addExtra(s, D, name); } },
          [el('span.gp-top', [el('b', yes), on ? el('span.gp-tag.on', '✓ picked') : null]), el('span.gp-desc', name === 'solo' ? (sw.you ? 'Live the whole section is your spotlight. Crowds love a solo after the first chorus.' : 'Live you play ' + (strSeat() ? 'one note a beat' : 'quarter notes') + ' while ' + sw.name + ' ' + sw.verb + '. Crowds love a solo after the first chorus.') : 'The last chord rings out. Ending on an outro makes the hook stick.')]),
        btn('.guide-preset' + (!on ? '.on' : ''), { testid: 'guide-extra-' + name + '-no', onclick: function () { if (on) removeExtra(s, D, name); } },
          [el('span.gp-top', [el('b', no), !on ? el('span.gp-tag.on', '✓ picked') : null]), el('span.gp-desc', name === 'solo' ? noSolo : 'Like a pickup truck hitting a snowbank.')])]),
      on ? el('div.small.dim', 'Tweak it in Advanced ⚙ if you like. It\'s already built from your ' + (name === 'solo' ? 'verse' : 'chorus') + '.') : null];
  }
  var ORDER_BLURB = { short: 'Verse, chorus, twice. In and out before the fries get cold.',
    classic: 'Adds a bridge: the solo spot. Crowds like a bridge.', epic: 'Double verses, double bridges. Pack a lunch.' };
  function prefMode() { try { return GG.prefs && GG.prefs.get().songwriterMode === 'advanced' ? 'advanced' : 'guided'; } catch (e) { return 'guided'; } }
  function setMode(m) { try { if (GG.prefs && prefMode() !== m) GG.prefs.set({ songwriterMode: m }); } catch (e) { /* storage off */ } }
  // One line from whoever fits the screen (role match on the active lineup). (The first-ever Write's hint is about the grid.)
  // v0.9: coach lines per genre (content grooves.coach[genre][step], Lane D), else the neutral flat grooves.coach[step],
  // else COACH (neutral, tokenised). Speakers who don't talk (Kenji) are skipped.
  var COACH = {
    verse: [{ role: 'guitar|fiddle', text: 'Start with the kick and the snare. Keep it steady; I will do the fancy stuff.' }, { role: 'vocals', text: 'Give me room to sing. Steady is good. Steady is great.' }],
    chorus: [{ role: 'vocals', text: 'The chorus should hit harder than the verse. A crash on the one. Trust me.' }, { role: 'guitar|fiddle', text: 'Bigger than the verse. More cymbal, more everything.' }],
    bridge: [{ role: 'guitar|fiddle', text: 'The bridge is my spot. Something different, not too busy.' }, { role: 'bass', text: 'Change it up here. Then we come back home.' }],
    tempo: [{ role: 'vocals', text: 'Pick a speed I can sing at. Or at least yell at.' }, { role: 'guitar|fiddle', text: 'Fast is fun. Tight is better.' }],
    order: [{ role: 'vocals', text: 'Verse, chorus, repeat. People like knowing where they are.' }, { role: 'bass', text: 'Short songs get played. Long songs get talked about.' }],
    name: [{ role: 'vocals', text: 'I will name it. You drum it. That is the deal.' }, { role: 'guitar|fiddle', text: 'Let {namer} name it. It is faster than arguing.' }]
  };
  function coachFor(D, step) {
    // (coach[genre] || {})[step] || coach[step] (the neutral flat set), then the UI's own COACH; the first set with a talker wins
    var CO = (GG.content.grooves || {}).coach || {}, g = genre(), mine = CO[g] && !Array.isArray(CO[g]) && typeof CO[g] === 'object' ? CO[g] : {};
    var sets = [mine[step], CO[step], COACH[step]].filter(function (x) { return Array.isArray(x) && x.length; }), state = st();
    var act = ui.talkers(state);
    for (var q = 0; q < sets.length; q++) {
      var lines = sets[q];
      for (var k = 0; k < lines.length; k++) {
        var ln = lines[(k + (D.index || 0)) % lines.length], re = new RegExp(ln.role);
        if (!ui.ownLines([ln.text], state).length) continue;
        for (var j = 0; j < act.length; j++) if (re.test(act[j].role || '')) return { who: act[j].id, text: ui.fill(ln.text, state) };
      }
    }
    var own = sets.length ? ui.ownLines(sets[0], state) : [];
    return own[0] ? { who: null, text: ui.fill(own[0].text, state) } : null;
  }
  function presetName(id) { var n = null; GG.songs.presets(genre(), gear()).forEach(function (p) { if (p.id === id) n = p.name; }); return n; }
  // v1.1 string seats, guided: the swapped drummer's suggested groove (one line per section) + "Tell {drummer} what to play"
  // (today's drum grid, unchanged) ; then "Your part" per section.
  function drumsStep(s, D) {
    var who = drummerName();
    return [el('div.guide-hint', { testid: 'guide-hint' }, who + ' suggests a groove for every part. You write your ' + instrument() + ' part next.'),
      el('div.part-drums.panel', { testid: 'part-drums' }, GG.songs.sectionsOf(D.pat).map(function (name) {
        var pr = GG.songs.presetOf(D.pat, name, genre(), gear());
        return el('div.row', [el('b.grow', SEC_LABEL[name] || cap(name)), el('span.small.dim', pr ? presetName(pr) : 'Something of their own')]);
      })),
      btn('.btn.block', { testid: 'btn-tell-drummer', onclick: function () {
        stopPlay(D); D.guided = false; D.layer = 'drums'; D.tab = 'verse'; s.rerender();
      } }, 'Tell ' + who + ' what to play'),
      el('div.small.dim', 'The drum grid is the same one drummers use. "Guided steps" on the Song tab brings you back.')];
  }
  function partStep(s, D, name) {
    var pt = D.pat.part, lead = pt.seat === 'lead', ch = D.change && D.change.section === name ? D.change : null;
    var hint = name === 'chorus' ? (lead ? 'Pick the hook for the chorus, then make it repeat: that is what people sing back.' : 'Pick the chorus progression. Different from the verse = the lift.')
      : name === 'bridge' ? 'The bridge goes somewhere else, then the last chorus hits harder.'
      : lead ? 'Pick a hook, then tap where its notes land. Low notes on the left, high on the right.'
      : 'Pick a progression, then tap your rhythm: ' + (pt.seat === 'bass' ? 'root, fifth or octave.' : 'chug (palm-muted) or open (ringing). Both = an accent.');
    return [el('div.guide-hint', { testid: 'guide-hint' }, hint), partPicker(s, D, name),
      el('div.guide-partgrid', buildPartGrid(s, D)),
      el('div.caps', { style: 'margin-top:4px' }, 'One-tap tweaks'), partMods(s, D, name),
      ch && ch.noop ? el('div.guide-change.small.dim', { testid: 'guide-change' }, '“' + ch.name + '” has nothing left to change here. Try another tweak.') :
      ch ? el('div.guide-change', { testid: 'guide-change' }, [el('div', [el('b', ch.name + ': '), ch.desc]), el('div.chips', [
        chip('Groove', ch.before.groove, ch.after.groove), chip('Hook', ch.before.hook, ch.after.hook), chip('Difficulty', ch.before.difficulty, ch.after.difficulty, true)])]) : null];
  }
  function chip(label, a, b, neutral) {
    var d = b - a;
    return el('span.chip' + (!d ? '' : neutral ? '.gd' : d > 0 ? '.up' : '.down'), label + ' ' + a + ' → ' + b);
  }
  function sectionStep(s, D, name) {
    var list = GG.songs.presets(genre(), gear()), cur = GG.songs.presetOf(D.pat, name, genre(), gear());
    var verseP = name === 'verse' ? null : GG.songs.presetOf(D.pat, 'verse', genre(), gear());
    var hint = name === 'chorus' ? 'Pick something different from the verse' + (verseP ? ' (' + presetName(verseP) + ')' : '') + ': the contrast is the hook.'
      : name === 'bridge' ? 'The bridge is the detour: go somewhere new, then the last chorus hits harder.'
      : 'Pick a beat to start from. Tap ▶ Play to hear it.';
    var cards = list.map(function (pr) {
      var tag = pr.id === cur ? el('span.gp-tag.on', '✓ picked') : pr.id === verseP ? el('span.gp-tag', 'verse') : pr.signature ? el('span.gp-tag', 'signature') : null;
      return btn('.guide-preset' + (pr.id === cur ? '.on' : ''), { testid: 'guide-preset-' + pr.id, disabled: pr.locked, onclick: function () {
        D.pat = GG.songs.applyPreset(D.pat, name, pr.id, gear(), genre()); D.change = null; changed(D); s.rerender();
      } }, [el('span.gp-top', [el('b', pr.name), tag]), el('span.gp-desc', pr.locked ? '🔒 Needs a double-kick pedal. ' + pr.desc : pr.desc)]);
    });
    var mods = GG.songs.grooves(genre()).mods.filter(function (m) { return !m.sections || m.sections.indexOf(name) >= 0; });
    var ch = D.change && D.change.section === name ? D.change : null;
    return [
      el('div.guide-hint', { testid: 'guide-hint' }, hint),
      el('div.guide-presets', cards),
      el('div.caps', { style: 'margin-top:4px' }, cur ? 'Tweak it (optional)' : 'Tweaked · tap a beat above to start over'),
      el('div.guide-mods', mods.map(function (m) {
        return btn('.guide-mod', { testid: 'guide-mod-' + m.id, title: m.desc, onclick: function () {
          var r = GG.songs.modify(D.pat, name, m.id, gear(), genre());
          // A no-op tweak says so inline (a toast would sit over the meters and linger across steps).
          if (JSON.stringify(r.pattern) === JSON.stringify(GG.songs.sanitize(D.pat, gear()))) { D.change = { section: name, name: m.name, noop: true }; s.rerender(); return; }
          D.pat = r.pattern; D.change = { section: name, name: m.name, desc: m.desc, before: r.before, after: r.after };
          changed(D); s.rerender();
        } }, m.name);
      })),
      ch && ch.noop ? el('div.guide-change.small.dim', { testid: 'guide-change' }, '“' + ch.name + '” has nothing left to change here. Try another tweak.') :
      ch ? el('div.guide-change', { testid: 'guide-change' }, [el('div', [el('b', ch.name + ': '), ch.desc]), el('div.chips', [
        chip('Groove', ch.before.groove, ch.after.groove), chip('Hook', ch.before.hook, ch.after.hook), chip('Difficulty', ch.before.difficulty, ch.after.difficulty, true)])]) : null
    ];
  }
  function tempoStep(s, D) {
    var G = GG.songs.genre(genre()), p = D.pat;
    function style() { return GG.audio && GG.audio.styleFor ? GG.audio.styleFor(genre(), p.bpm).label : ''; }
    var num = el('b', { testid: 'guide-bpm' }, String(p.bpm)), lab = el('div.guide-tlabel', { testid: 'guide-tempo-label' }, GG.songs.tempoLabel(genre(), p.bpm));
    var sty = el('div.small.dim', style() ? 'The band plays: ' + style() : '');
    var r = el('input.seq-tempo.guide-range', { type: 'range', testid: 'guide-tempo', min: G.tempo[0], max: G.tempo[1], step: 5, value: p.bpm, 'aria-label': 'Tempo' });
    r.addEventListener('input', function () {
      p.bpm = +r.value; num.textContent = String(p.bpm); lab.textContent = GG.songs.tempoLabel(genre(), p.bpm);
      sty.textContent = style() ? 'The band plays: ' + style() : ''; rerate(D);
    });
    r.addEventListener('change', function () { changed(D); if (D.handle && D.handle.playing) restart(s, D); });
    var marks = (GG.songs.grooves(genre()).tempo || []).filter(function (t) { return t[0] <= G.tempo[1]; });
    return [el('div.guide-tempo', [el('div.guide-bignum', [num, el('span', ' BPM')]), lab, sty]), r,
      el('div.row.tiny.faint', [el('span.grow', G.tempo[0] + ' · ' + (marks[0] ? marks[0][1] : '')), el('span', (marks.length ? marks[marks.length - 1][1] : '') + ' · ' + G.tempo[1])]),
      el('div.small.dim', 'Faster songs are harder to play live. Slower ones feel heavier. Neither pays more.')];
  }
  function orderStep(s, D) {
    var p = D.pat, cur = baseArrangementId(p);
    return [el('div.guide-orders', GG.songs.ARRANGEMENT_IDS.map(function (id) {
      var a = withSongExtras(D, GG.songs.ARRANGEMENTS[id]);   // v0.8: the Solo / Outro stay in
      return btn('.guide-preset' + (id === cur ? '.on' : ''), { testid: 'guide-order-' + id, onclick: function () {
        p.arrangement = a.slice(); changed(D); if (D.playing) restart(s, D); s.rerender();
      } }, [el('span.gp-top', [el('b', ARR_NAMES[id]), el('span.gp-tag' + (id === cur ? '.on' : ''), '~' + Math.round(GG.songs.seconds({ bpm: p.bpm, arrangement: a })) + ' s')]),
        el('span.gp-seq', a.map(function (x) { return cap(x); }).join(' · ')), el('span.gp-desc', ORDER_BLURB[id])]);
    }))];
  }
  function nameStep(s, D) {
    return [el('div.guide-name', [el('div.caps', 'Your song'), el('div.fr', { testid: 'guide-title' }, D.title || 'Untitled'),
        D.titleEn && D.titleEn !== D.title ? el('div.small.dim', '“' + D.titleEn + '” (nobody knows yet)') : null]),
      btn('.btn.block', { testid: 'btn-guide-reroll', onclick: function () { D.custom = false; reroll(D); s.rerender(); } }, '🎲 Another title from ' + namer()),
      el('div.caps', { style: 'margin-top:6px' }, 'Or type your own'),
      el('input.seq-name', { testid: 'guide-title-input', maxLength: 40, value: D.custom ? D.title : '', placeholder: TITLE_HINT[genre()] || 'Your song title',
        oninput: function (e) { var v = e.target.value.trim(); if (v) { D.title = v; D.titleEn = v; D.custom = true; } else { D.custom = false; reroll(D); } head(s, D);
          var t = s.body.querySelector('[data-testid="guide-title"]'); if (t) t.textContent = D.title; } })];
  }
  function buildGuided(s, D) {
    var STEPS = gsteps(), step = STEPS.indexOf(D.step) >= 0 ? D.step : (D.step = STEPS[0]), i = STEPS.indexOf(step), ex = isExtra(step);
    var sec = SECTIONS3.indexOf(step) >= 0 || (ex && hasSec(D, step)), V = D.view = {};
    D.tab = sec ? step : 'song';
    V.title = btn('.seq-title', { testid: 'seq-title', onclick: function () { if (!D.custom) { reroll(D); if (step === 'name') s.rerender(); else head(s, D); } } });
    var jam = btn('.btn.small.seq-jam', { testid: 'btn-seq-jam', onclick: function () { if (D.done) return; D.done = true; stopPlay(D); if (D.onJam) D.onJam(); } }, 'Let the band jam one');
    var adv = btn('.btn.small.guide-adv', { testid: 'btn-guide-advanced', onclick: function () {
      stopPlay(D); D.guided = false; D.tab = sec ? step : 'verse'; setMode('advanced'); s.rerender();
    } }, 'Advanced ⚙');
    var dots = el('div.guide-dots', { style: { gridTemplateColumns: 'repeat(' + STEPS.length + ', 1fr)' } }, STEPS.map(function (x, k) { return el('i' + (k === i ? '.on' : k < i ? '.done' : '')); }));
    V.groove = meter('Groove', 'meter-groove'); V.hook = meter('Hook', 'meter-hook'); V.diff = meter('Difficulty', 'meter-diff');
    V.ability = el('i.ab'); V.diff._bar.appendChild(V.ability);
    var c = coachFor(D, step);
    var body = step === 'drums' ? drumsStep(s, D) : step === 'tempo' ? tempoStep(s, D) : step === 'order' ? orderStep(s, D) : step === 'name' ? nameStep(s, D)
      : ex ? extraStep(s, D, step) : D.pat.part ? partStep(s, D, step) : sectionStep(s, D, step);   // v1.1: your part on a string seat
    ui.append(s.body, [
      el('div.seq-head', [btn('.icon-btn', { testid: 'btn-seq-close', 'aria-label': 'Back to the planner', onclick: function () {
        stopPlay(D); if (D.onCancel) D.onCancel(); ui.close(s.id);
      } }, '✕'), V.title, jam]),
      el('div.guide-top', [el('div.guide-prog', [el('div.caps', { testid: 'guide-step' }, 'Step ' + (i + 1) + ' of ' + STEPS.length + ' · ' + GNAMES[step]), dots]), adv]),
      el('div.seq-meters', [V.groove, V.hook, V.diff]),
      c ? el('div.guide-coach', { testid: 'guide-coach' }, [el('b', c.who ? ui.who(c.who).short + ': ' : ''), c.text]) : null,
      el('div.seq-main.guide-main', { testid: 'guide-screen-' + step }, body)
    ]);
    function go(k) { stopPlay(D); D.step = STEPS[k]; D.change = null; s.rerender(); s.body.scrollTop = 0; }
    var back = btn('.btn', { testid: 'btn-guide-back', disabled: i === 0, onclick: function () { if (i > 0) go(i - 1); } }, '‹ Back');
    V.play = btn('.btn', { testid: 'btn-guide-play', onclick: function () { toggle(s, D, sec || step === 'drums' ? 'loop' : 'song'); } });
    var next = i < STEPS.length - 1 ? btn('.btn.primary', { testid: 'btn-guide-next', onclick: function () { go(i + 1); } }, 'Next ›')
      : btn('.btn.primary', { testid: 'btn-guide-save', onclick: function () { save(s, D); } }, 'Save ✓');
    ui.append(s.foot, [back, V.play, next]);
    head(s, D); rerate(D); playButtons(D);
  }

  // Copy another section into this one, or clear it.
  ui.define('seq-tools', {
    kind: 'modal', title: 'This section',
    build: function (s, d) {
      var owner = d.owner, D = owner && owner.data; if (!D) return;
      function done(fn) { fn(); ui.close(s.id); owner.rerender(); changed(D); }
      if (partLayer(D) && D.pat.part.sections[D.tab]) {   // v1.1: your part's tools: the one-tap modifiers, copy, clear
        s.setTitle('Your part');
        s.body.appendChild(partMods(owner, D, D.tab, function () { ui.close(s.id); }));
        GG.songs.sectionsOf(D.pat).forEach(function (name) {
          if (name === D.tab || !D.pat.part.sections[name]) return;
          s.body.appendChild(btn('.btn.block', { testid: 'part-copy-' + name, style: 'margin-top:8px', onclick: function () {
            done(function () { D.pat.part.sections[D.tab] = U.clone(D.pat.part.sections[name]); });
          } }, 'Copy your ' + cap(name) + ' part'));
        });
        s.body.appendChild(btn('.btn.danger.block', { testid: 'part-clear', style: 'margin-top:8px', onclick: function () {
          done(function () { D.pat.part.sections[D.tab].rows = D.pat.part.sections[D.tab].rows.map(function () { return '................'; }); });
        } }, 'Clear your ' + D.tab + ' part'));
        s.foot.appendChild(btn('.btn.ghost', { testid: 'btn-seq-tools-cancel', onclick: function () { ui.close(s.id); } }, 'Cancel'));
        return;
      }
      GG.songs.sectionsOf(D.pat).forEach(function (name) {   // v0.8: + the song's Solo / Outro
        if (name === D.tab) return;
        s.body.appendChild(btn('.btn.block', { testid: 'seq-copy-' + name, style: 'margin-bottom:8px', onclick: function () {
          done(function () { D.pat.sections[D.tab] = D.pat.sections[name].slice(); });
        } }, 'Copy from ' + cap(name)));
      });
      s.body.appendChild(btn('.btn.danger.block', { testid: 'seq-clear', onclick: function () {
        done(function () { D.pat.sections[D.tab] = GG.songs.blankSection(D.pat.lanes); });
      } }, 'Clear ' + D.tab));
      if (isExtra(D.tab)) s.body.appendChild(btn('.btn.danger.block', { testid: 'seq-remove-' + D.tab, style: 'margin-top:8px', onclick: function () {
        var tab = D.tab; ui.close(s.id); D.tab = 'song'; removeExtra(owner, D, tab);
      } }, 'Take the ' + SEC_LABEL[D.tab] + ' out of the song'));
      s.foot.appendChild(btn('.btn.ghost', { testid: 'btn-seq-tools-cancel', onclick: function () { ui.close(s.id); } }, 'Cancel'));
    }
  });

  /* ---- Entry points -------------------------------------------------------------------------------------- */
  // Planner Go with `count` Write blocks: one sequencer per block, then done(). Songs queued earlier from the kit
  // (state.pendingSongs) open pre-loaded; a jammed block keeps its sketch for later. ✕ returns to the planner without
  // playing the week, keeping songs saved so far as sketches.
  ui.composeWeek = function (count, done) {
    var state = st(); if (!state) return;
    var before = (state.pendingSongs || []).slice(), queued = before.slice(), out = [], keep = [], taken = [], k = 0;
    var firstEver = !state.stats.songsWritten;
    function next() {
      if (k >= count) {
        state.pendingSongs = out.concat(keep, queued.slice(count));
        done();
        return;
      }
      var sketch = queued[k] || null, i = k;
      var tip = firstEver && i === 0 && !(GG.tutorial && GG.tutorial.suppressWriteTip && GG.tutorial.suppressWriteTip(state)) ? firstTip(state) : null;   // v1.0: quiet while the w1_write lesson runs
      ui.show('seq', { mode: 'write', index: i, total: count, fromSketch: !!sketch, taken: taken.slice(), hint: tip,
        pat: sketch ? GG.songs.sanitize(sketch, gear(), genre()) : strSeat() ? drummerGroove(GG.songs.starter(genre(), gear())) : GG.songs.starter(genre(), gear()),   // v1.1: {drummer}'s groove
        title: sketch && sketch.title, titleEn: sketch && sketch.titleEn,
        onSave: function (entry) { out[i] = entry; taken.push(entry.title); k++; next(); },
        onJam: function () { out[i] = null; if (sketch) keep.push(sketch); k++; next(); },
        // ✕ keeps what was already saved this round (and unreached sketches) so nothing is lost; they reopen next Go.
        onCancel: function () { state.pendingSongs = out.filter(Boolean).concat(keep, queued.slice(k)); } });
    }
    next();
  };
  // v0.9: writeTips are member-keyed (every band's members, genre-correct); a band without any gets a neutral grid tip.
  var TIP_BEAT = { metal: 'Metal wants a busy kick.', punk: 'Punk: fast snare on every other 8th.', rock: 'Rock: kick on 1 and 3, snare on 2 and 4.', country: 'Country: a train beat on the snare.' };
  function firstTip(state) {
    var tips = (GG.content.lines && GG.content.lines.writeTips) || {};
    var ids = Object.keys(tips).filter(function (id) { return ui.talkers(state).some(function (m) { return m.id === id; }); });
    var who = ui.pick(ids);
    if (who) return { who: who, text: ui.fill(ui.pick(tips[who]), state) };
    var t = ui.talkers(state)[0];
    return t ? { who: t.id, text: 'Tap a square to add a hit, drag down a lane to paint, hit play to hear it. ' + (TIP_BEAT[state.genre] || '') } : null;
  }
  // The kit hotspot: the sketch pad on state.draft.
  ui.openSketch = function () {
    var state = st(); if (!state) return;
    ui.show('seq', { mode: 'sketch', pat: state.draft ? GG.songs.sanitize(state.draft, gear(), genre()) : strSeat() ? drummerGroove(GG.songs.starter(genre(), gear())) : GG.songs.starter(genre(), gear()) });
  };
  function useSketch(s, D) {
    var state = st(); if (!state || D.done) return;
    var r = rerate(D);
    if (!r.notes) { ui.toast('The sketch pad is empty. Tap some hits in first.'); return; }
    D.done = true; stopPlay(D);
    var entry = GG.songs.sanitize(D.pat, gear(), genre());
    entry.title = D.title; entry.titleEn = D.titleEn || D.title;
    if (GG.songs.isFrench && GG.songs.isFrench(entry.title)) entry.fr = true;
    state.pendingSongs = (state.pendingSongs || []).concat([entry]);
    state.draft = null;
    ui.close(s.id);
    ui.toast('“' + entry.title + '” is waiting for your next Write block.', { who: 'Sketch pad' });
  }
  // A catalog song, read-only.
  ui.openSong = function (id) {
    var state = st(), song = state && GG.songs.byId(state, id); if (!song) return;
    ui.show('seq', { mode: 'view', song: song, pat: U.clone(song.pattern), title: song.title, titleEn: song.titleEn });
  };

  GG.registerDebug('seq', function () {
    var e = ui.get && ui.get('seq'), D = e && e.data;
    return D ? { mode: D.mode, tab: D.tab, guided: !!D.guided, step: D.guided ? D.step : null, playing: D.playing || null, title: D.title, rating: D.rating ? { groove: D.rating.groove, hook: D.rating.hook, difficulty: D.rating.difficulty } : null,
      playhead: D.view ? D.view.ph : null, seat: seat(), layer: partLayer(D) ? 'part' : 'drums', part: D.pat && D.pat.part ? U.clone(D.pat.part) : null } : null;
  });
})(window.GG);
