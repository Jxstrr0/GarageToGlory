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
// ui.show('seq', { mode, pat, title, titleEn, song, index, total, tip: { who, text }, onSave(entry), onJam(), onCancel() })
(function (GG) {
  var ui = GG.ui, el = ui.el, btn = ui.btn, C = GG.contracts, U = GG.util;
  // Lane look, left to right. v0.3's note highway uses the same colours and icons.
  ui.LANES = {
    kick: { name: 'Kick', icon: '🦶', color: '#ff6b4a' }, snare: { name: 'Snare', icon: '🥁', color: '#ffd23f' },
    hat: { name: 'Hats', icon: '🎩', color: '#3cd0c0' }, cymbal: { name: 'Crash', icon: '💥', color: '#b98cff' },
    toms: { name: 'Toms', icon: '🛢️', color: '#57c77a' }, ride: { name: 'Ride', icon: '🔔', color: '#4f8cff' }
  };
  var TABS = [{ id: 'verse', label: 'Verse' }, { id: 'chorus', label: 'Chorus' }, { id: 'bridge', label: 'Bridge' }, { id: 'song', label: 'Song' }];
  var ARR_NAMES = { short: 'Short', classic: 'Classic', epic: 'Epic' };
  var BEAT_LABELS = ['1', 'e', '&', 'a'];
  var KICK_HINT = "One foot, one pedal: no two kicks in a row until you own a double kick.";

  function st() { return GG.state; }
  function gear() { return (st() && st().gear) || GG.songs.DEFAULT_GEAR; }
  function genre() { return (st() && st().genre) || 'metal'; }
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
    var tips = r.tips.slice();
    if (r.difficulty > ability + 5) tips.unshift('Harder than the band can play yet: it will start rough.');
    if (!V.tip) return r;
    ui.clear(V.tip);
    if (D.hint) ui.append(V.tip, [el('b', D.hint.who ? ui.who(D.hint.who).short + ': ' : ''), D.hint.text]);
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
    var sec = D.pat.sections[D.tab], lanes = D.pat.lanes, ro = D.mode === 'view';
    var grid = el('div.seq-grid' + (ro ? '.ro' : ''), { testid: 'seq-grid', style: { gridTemplateColumns: '30px repeat(' + lanes + ', minmax(0, 1fr))' } });
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
        var c = el('div.cell' + (Math.floor(step / 4) % 2 === 0 ? '.sh' : '') + (hit ? '.on' : ''),
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
  function paintable(grid, D) {
    var paint = null;
    function cellOf(node) { return node && node.classList && node.classList.contains('cell') ? node : null; }
    function apply(c) {
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
      var sec = D.pat.sections[D.tab];
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
      arrRow.querySelectorAll('[data-secs]').forEach(function (n) { n.textContent = '~' + Math.round(GG.songs.seconds({ bpm: p.bpm, arrangement: GG.songs.ARRANGEMENTS[n.dataset.secs] })) + ' s'; });
    });
    tempo.addEventListener('change', function () { changed(D); if (D.handle && D.handle.playing) restart(s, D); });
    var cur = GG.songs.arrangementId(p);
    var arrRow = el('div.seq-arr', GG.songs.ARRANGEMENT_IDS.map(function (id) {
      var a = GG.songs.ARRANGEMENTS[id];
      return btn('.arr' + (id === cur ? '.on' : ''), { testid: 'seq-arr-' + id, disabled: ro && id !== cur, onclick: function () {
        if (ro || id === cur) return;
        p.arrangement = a.slice(); changed(D); if (D.playing === 'song') restart(s, D); s.rerender();
      } }, [el('b', ARR_NAMES[id]), el('span.seqs', a.map(function (x) { return x.charAt(0).toUpperCase(); }).join(' ')),
        el('span.small.dim', { data: { secs: id } }, '~' + Math.round(GG.songs.seconds({ bpm: p.bpm, arrangement: a })) + ' s')]);
    }));
    var r = D.rating || rerate(D);
    var parts = [
      D.mode === 'write' ? el('div.row.small.dim', [el('span.grow', 'Rather go one step at a time?'), btn('.btn.small', { testid: 'btn-seq-guided', onclick: function () {
        stopPlay(D); D.guided = true; D.step = 'verse'; setMode('guided'); s.rerender();
      } }, 'Guided steps')]) : null,
      el('div.panel.stack.tight', [el('div.caps', 'Title'), ro ? el('div', { style: 'font-weight:800;font-style:italic' }, D.title)
        : el('div.row', [
          el('input.seq-name', { testid: 'seq-title-input', maxLength: 40, value: D.custom ? D.title : '', placeholder: 'Type your own, or let Marcel',
            oninput: function (e) { var v = e.target.value.trim(); if (v) { D.title = v; D.titleEn = v; D.custom = true; } else { D.custom = false; reroll(D); } head(s, D); } }),
          btn('.btn.small', { testid: 'btn-seq-reroll', 'aria-label': 'New French title', onclick: function () { D.custom = false; reroll(D); s.rerender(); } }, '🎲')
        ]), D.titleEn && D.titleEn !== D.title ? el('div.small.dim', '“' + D.titleEn + '” (nobody knows yet)') : null]),
      el('div.panel.stack.tight', [el('div.row', [el('span.caps.grow', 'Tempo'), el('span', [bpmLabel, styleLabel])]), tempo,
        el('div.row.tiny.faint', [el('span.grow', G.tempo[0]), el('span', G.tempo[1])])]),
      el('div.stack.tight', [el('div.caps', 'Arrangement (each part plays ' + C.BARS_PER_SECTION + ' bars)'), arrRow]),
      el('div.panel.small', { testid: 'seq-sections' }, ['Groove by part: ', el('b', 'Verse ' + r.sections.verse), ' · ', el('b', 'Chorus ' + r.sections.chorus),
        ' · ', el('b', 'Bridge ' + r.sections.bridge), el('div.tiny.faint', { style: 'margin-top:4px' }, r.notes + ' hits in the whole song.')])
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
        ui.toast(on ? 'Click on. Marcel counts you in: "one, two, uh, the other ones."' : 'Click off. Feel it.');
      } }, '♩');
    paintMetro(b, metroOn());
    return b;
  }
  function paintMetro(b, on) {
    b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.dataset.on = on ? '1' : '0';
    b.style.background = on ? 'var(--amber)' : ''; b.style.color = on ? '#1d1204' : '';
  }
  function startPlay(s, D, kind) {
    var section = kind === 'song' ? null : (D.tab === 'song' ? 'verse' : D.tab);
    var h = GG.audio && GG.audio.play ? GG.audio.play(D.pat, { genre: genre(), section: section, loop: kind !== 'song', songId: songSeed(D), metronome: true }) : null;
    if (!h) { ui.toast("No sound on this device. Imagine it. It's heavy."); return; }
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
    var sec = D.tab === 'song' ? 'verse' : D.tab;
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
    if (D.onSave) D.onSave(entry);
  }

  ui.define('seq', {
    kind: 'full', cls: 'seq',
    build: function (s, D) {
      if (!D.pat) D.pat = GG.songs.starter(genre(), gear());
      D.tab = D.tab || 'verse';
      if (!D.title && D.mode !== 'view') reroll(D);
      D.sub = subFor(D);
      if (D.mode === 'write' && D.guided == null) D.guided = prefMode() === 'guided';
      if (D.mode === 'write' && D.guided) { buildGuided(s, D); return; }
      var ro = D.mode === 'view', V = D.view = {};
      V.title = btn('.seq-title', { testid: 'seq-title', disabled: ro, onclick: function () { if (!ro && !D.custom) { reroll(D); head(s, D); } } });
      var right = D.mode === 'write' ? btn('.btn.small.seq-jam', { testid: 'btn-seq-jam', onclick: function () {
        if (D.done) return; D.done = true; stopPlay(D); if (D.onJam) D.onJam();
      } }, 'Let the band jam one') : null;
      var tools = ro || D.tab === 'song' ? null : btn('.icon-btn', { testid: 'btn-seq-tools', 'aria-label': 'Copy or clear', onclick: function () { ui.show('seq-tools', { owner: s }); } }, '⋯');
      V.groove = meter('Groove', 'meter-groove'); V.hook = meter('Hook', 'meter-hook'); V.diff = meter('Difficulty', 'meter-diff');
      V.ability = el('i.ab'); V.diff._bar.appendChild(V.ability);
      V.tip = el('div.seq-tip', { testid: 'seq-tip' });
      V.pos = el('span.seq-pos');
      var main = el('div.seq-main', D.tab === 'song' ? songPanel(s, D) : buildGrid(s, D));
      ui.append(s.body, [
        el('div.seq-head', [btn('.icon-btn', { testid: 'btn-seq-close', 'aria-label': D.mode === 'write' ? 'Back to the planner' : 'Close', onclick: function () {
          stopPlay(D); if (D.onCancel) D.onCancel(); ui.close(s.id);
        } }, '✕'), V.title, metroButton(), right]),
        el('div.seq-tabs', [ui.tabs(TABS, D.tab, function (id) {
          D.tab = id; s.rerender();
          if (D.playing === 'loop' && id !== 'song') startPlay(s, D, 'loop'); else playButtons(D);
        }, 'seq-tab-'), tools]),
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
  var GSTEPS = ['verse', 'chorus', 'bridge', 'tempo', 'order', 'name'];
  var GNAMES = { verse: 'Verse', chorus: 'Chorus', bridge: 'Bridge', tempo: 'Tempo', order: 'Song order', name: 'Name' };
  var ORDER_BLURB = { short: 'Verse, chorus, twice. In and out before the fries get cold.',
    classic: 'Adds a bridge: the solo spot. Crowds like a bridge.', epic: 'Double verses, double bridges. Pack a lunch.' };
  function prefMode() { try { return GG.prefs && GG.prefs.get().songwriterMode === 'advanced' ? 'advanced' : 'guided'; } catch (e) { return 'guided'; } }
  function setMode(m) { try { if (GG.prefs && prefMode() !== m) GG.prefs.set({ songwriterMode: m }); } catch (e) { /* storage off */ } }
  // One line from whoever fits the screen (role match on the active lineup). (The first-ever Write's hint is about the grid.)
  function coachFor(D, step) {
    var lines = ((GG.content.grooves || {}).coach || {})[step] || [], state = st();
    var act = state ? state.members.filter(function (m) { return m.status === 'active'; }) : [];
    for (var k = 0; k < lines.length; k++) {
      var ln = lines[(k + (D.index || 0)) % lines.length], re = new RegExp(ln.role);
      for (var j = 0; j < act.length; j++) if (re.test(act[j].role || '')) return { who: act[j].id, text: ln.text };
    }
    return lines[0] ? { who: null, text: lines[0].text } : null;
  }
  function presetName(id) { var n = null; GG.songs.presets(genre(), gear()).forEach(function (p) { if (p.id === id) n = p.name; }); return n; }
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
    var p = D.pat, cur = GG.songs.arrangementId(p);
    return [el('div.guide-orders', GG.songs.ARRANGEMENT_IDS.map(function (id) {
      var a = GG.songs.ARRANGEMENTS[id];
      return btn('.guide-preset' + (id === cur ? '.on' : ''), { testid: 'guide-order-' + id, onclick: function () {
        p.arrangement = a.slice(); changed(D); if (D.playing) restart(s, D); s.rerender();
      } }, [el('span.gp-top', [el('b', ARR_NAMES[id]), el('span.gp-tag' + (id === cur ? '.on' : ''), '~' + Math.round(GG.songs.seconds({ bpm: p.bpm, arrangement: a })) + ' s')]),
        el('span.gp-seq', a.map(function (x) { return cap(x); }).join(' · ')), el('span.gp-desc', ORDER_BLURB[id])]);
    }))];
  }
  function nameStep(s, D) {
    return [el('div.guide-name', [el('div.caps', 'Your song'), el('div.fr', { testid: 'guide-title' }, D.title || 'Untitled'),
        D.titleEn && D.titleEn !== D.title ? el('div.small.dim', '“' + D.titleEn + '” (nobody knows yet)') : null]),
      btn('.btn.block', { testid: 'btn-guide-reroll', onclick: function () { D.custom = false; reroll(D); s.rerender(); } }, '🎲 Another French title'),
      el('div.caps', { style: 'margin-top:6px' }, 'Or type your own'),
      el('input.seq-name', { testid: 'guide-title-input', maxLength: 40, value: D.custom ? D.title : '', placeholder: 'Mon Beau Sapin de Doom',
        oninput: function (e) { var v = e.target.value.trim(); if (v) { D.title = v; D.titleEn = v; D.custom = true; } else { D.custom = false; reroll(D); } head(s, D);
          var t = s.body.querySelector('[data-testid="guide-title"]'); if (t) t.textContent = D.title; } })];
  }
  function buildGuided(s, D) {
    var step = GSTEPS.indexOf(D.step) >= 0 ? D.step : (D.step = 'verse'), i = GSTEPS.indexOf(step), sec = i < 3, V = D.view = {};
    D.tab = sec ? step : 'song';
    V.title = btn('.seq-title', { testid: 'seq-title', onclick: function () { if (!D.custom) { reroll(D); if (step === 'name') s.rerender(); else head(s, D); } } });
    var jam = btn('.btn.small.seq-jam', { testid: 'btn-seq-jam', onclick: function () { if (D.done) return; D.done = true; stopPlay(D); if (D.onJam) D.onJam(); } }, 'Let the band jam one');
    var adv = btn('.btn.small.guide-adv', { testid: 'btn-guide-advanced', onclick: function () {
      stopPlay(D); D.guided = false; D.tab = sec ? step : 'verse'; setMode('advanced'); s.rerender();
    } }, 'Advanced ⚙');
    var dots = el('div.guide-dots', GSTEPS.map(function (x, k) { return el('i' + (k === i ? '.on' : k < i ? '.done' : '')); }));
    V.groove = meter('Groove', 'meter-groove'); V.hook = meter('Hook', 'meter-hook'); V.diff = meter('Difficulty', 'meter-diff');
    V.ability = el('i.ab'); V.diff._bar.appendChild(V.ability);
    var c = coachFor(D, step);
    var body = step === 'tempo' ? tempoStep(s, D) : step === 'order' ? orderStep(s, D) : step === 'name' ? nameStep(s, D) : sectionStep(s, D, step);
    ui.append(s.body, [
      el('div.seq-head', [btn('.icon-btn', { testid: 'btn-seq-close', 'aria-label': 'Back to the planner', onclick: function () {
        stopPlay(D); if (D.onCancel) D.onCancel(); ui.close(s.id);
      } }, '✕'), V.title, jam]),
      el('div.guide-top', [el('div.guide-prog', [el('div.caps', { testid: 'guide-step' }, 'Step ' + (i + 1) + ' of ' + GSTEPS.length + ' · ' + GNAMES[step]), dots]), adv]),
      el('div.seq-meters', [V.groove, V.hook, V.diff]),
      c ? el('div.guide-coach', { testid: 'guide-coach' }, [el('b', c.who ? ui.who(c.who).short + ': ' : ''), c.text]) : null,
      el('div.seq-main.guide-main', { testid: 'guide-screen-' + step }, body)
    ]);
    function go(k) { stopPlay(D); D.step = GSTEPS[k]; D.change = null; s.rerender(); s.body.scrollTop = 0; }
    var back = btn('.btn', { testid: 'btn-guide-back', disabled: i === 0, onclick: function () { if (i > 0) go(i - 1); } }, '‹ Back');
    V.play = btn('.btn', { testid: 'btn-guide-play', onclick: function () { toggle(s, D, sec ? 'loop' : 'song'); } });
    var next = i < GSTEPS.length - 1 ? btn('.btn.primary', { testid: 'btn-guide-next', onclick: function () { go(i + 1); } }, 'Next ›')
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
      C.SECTIONS.forEach(function (name) {
        if (name === D.tab) return;
        s.body.appendChild(btn('.btn.block', { testid: 'seq-copy-' + name, style: 'margin-bottom:8px', onclick: function () {
          done(function () { D.pat.sections[D.tab] = D.pat.sections[name].slice(); });
        } }, 'Copy from ' + cap(name)));
      });
      s.body.appendChild(btn('.btn.danger.block', { testid: 'seq-clear', onclick: function () {
        done(function () { D.pat.sections[D.tab] = GG.songs.blankSection(D.pat.lanes); });
      } }, 'Clear ' + D.tab));
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
      var tip = firstEver && i === 0 ? firstTip(state) : null;
      ui.show('seq', { mode: 'write', index: i, total: count, fromSketch: !!sketch, taken: taken.slice(), hint: tip,
        pat: sketch ? GG.songs.sanitize(sketch, gear(), genre()) : GG.songs.starter(genre(), gear()),
        title: sketch && sketch.title, titleEn: sketch && sketch.titleEn,
        onSave: function (entry) { out[i] = entry; taken.push(entry.title); k++; next(); },
        onJam: function () { out[i] = null; if (sketch) keep.push(sketch); k++; next(); },
        // ✕ keeps what was already saved this round (and unreached sketches) so nothing is lost; they reopen next Go.
        onCancel: function () { state.pendingSongs = out.filter(Boolean).concat(keep, queued.slice(k)); } });
    }
    next();
  };
  function firstTip(state) {
    var tips = (GG.content.lines && GG.content.lines.writeTips) || {};
    var ids = Object.keys(tips).filter(function (id) { return state.members.some(function (m) { return m.id === id && m.status === 'active'; }); });
    var who = ui.pick(ids);
    return who ? { who: who, text: GG.career.fillText(state, ui.pick(tips[who])) } : null;
  }
  // The kit hotspot: the sketch pad on state.draft.
  ui.openSketch = function () {
    var state = st(); if (!state) return;
    ui.show('seq', { mode: 'sketch', pat: state.draft ? GG.songs.sanitize(state.draft, gear(), genre()) : GG.songs.starter(genre(), gear()) });
  };
  function useSketch(s, D) {
    var state = st(); if (!state || D.done) return;
    var r = rerate(D);
    if (!r.notes) { ui.toast('The sketch pad is empty. Tap some hits in first.'); return; }
    D.done = true; stopPlay(D);
    var entry = GG.songs.sanitize(D.pat, gear(), genre());
    entry.title = D.title; entry.titleEn = D.titleEn || D.title;
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
      playhead: D.view ? D.view.ph : null } : null;
  });
})(window.GG);
