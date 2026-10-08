// 5h_ui_settings.js (v0.6.1, SETTINGS agent; Addendum 1 C4): the settings screen, audio calibration, practice mode.
//   Screens: 'settings' (full; from the title ⚙ and the ☰ menu; data.tab 'play' scrolls to Play) · 'calib' (full; tap
//   along to eight clicks -> audio offset, then tap the flashing light -> visual offset; saved per profile, phone speaker /
//   headphones; data.first = the automatic first-launch run, skippable) · 'practice' (sheet; any catalog song at 50/75/100%
//   speed, played in the gig's studio mode on a shadow state: no crowd, no pay, nothing saved).
//   Practice is reachable from the laptop song list (53) and from the drum kit (a button added under the sketch pad).
//   First launch: the title opens 'calib' once while settings.calibSeen is false (not under automation unless ?calib=1).
//   <html> classes: gg-big (bigger text), gg-calm (reduced flashing), gg-fast (faster animations).
//   v0.8.3: 'Drum sync' toggle (set-drumSync, settings.drumSync); the calibration's light check drives the highway under
//   Drum sync, the click test only classic timing; a big raw click lag (offset + output latency >= 120 ms) shows a
//   Bluetooth hint on the results (calib-bt).
//   testids: set-<key> toggles (set-drumSync), set-gigdiff-<d>, set-speed-<n>, set-profile-<p>, set-gfx-<q>, set-mix-<bus>, set-metronome,
//   set-muted, set-calibrate, set-practice, set-career-diff, set-save-load|backup|restore ; calib-profile-<p>, calib-start,
//   calib-pad, calib-light, calib-result, calib-visual-start, calib-retry, calib-save, calib-skip ; practice-speed-<pct>,
//   practice-song-<id>, laptop-practice, kit-practice. Debug: GG.debug('settings'), GG.debug('calib').
//   v1.5 "Desktop" (plan_contract_1.5 §4.7, Lane I), only with GG.input.showKeyUI(): Settings > Keys (#set-keys, data.tab
//   'keys': seg set-keys-kind-drums|strings, chips set-key-<kind>-<slot> rebound through GG.input.capture with a swap on a
//   conflict, set-keys-msg, set-keys-pos, set-keys-reset, set-keys-sticky, the set-keys-timing card + set-calibrate-keys),
//   Look + feel "Layout" (set-layout-auto|phone|wide), the calibration's calib-input-touch|keys (the key test: both steps on
//   fresh keydowns, saved to settings.calibKb). PC layout (B): a tab rail (set-rail-<section>) + the sections in .set-main,
//   the Keys timing card in a .w2 right column, the key calibration docked over it (.calib-docked, Settings kept in view).
(function (GG) {
  var ui = GG.ui, el = ui.el, btn = ui.btn, U = GG.util, P = GG.prefs;
  function prefs() { try { return P.get(); } catch (e) { return {}; } }
  function set(o) { return P.set(o); }

  /* ---- <html> classes ------------------------------------------------------------------------------------ */
  function applyClasses() {
    var pf = prefs(), h = typeof document !== 'undefined' && document.documentElement;
    if (!h) return;
    h.classList.toggle('gg-big', !!pf.bigText);
    h.classList.toggle('gg-calm', !!pf.reducedFlash);
    h.classList.toggle('gg-fast', !!pf.fastAnim);
  }
  applyClasses();
  GG.on('settings:changed', applyClasses);
  // v0.6.1 verify: audio keys written through GG.prefs.set (or a restored save) reach GG.audio's cached prefs.
  GG.on('settings:changed', function (p) {
    var k = (p && p.keys) || [];
    var hit = !k.length || k.some(function (x) { return /^(mix|metronome|brushes|muted)$/.test(x); });
    if (hit && GG.audio && GG.audio.applySettings) GG.audio.applySettings();
  });

  // v1.0 (Lane P): the graphics row gained 'Auto'; its four buttons are v1.0 controls (>= 48 px, four across at 390 px).
  if (typeof document !== 'undefined' && document.head && !document.getElementById('gg-set-gfx-css')) {
    var gcss = document.createElement('style'); gcss.id = 'gg-set-gfx-css';
    gcss.textContent = '.set-seg.set-gfx .btn { min-height: 48px; min-width: 48px; flex: 1 1 0; padding: 0 6px; }';
    document.head.appendChild(gcss);
  }

  /* ---- Building blocks ------------------------------------------------------------------------------------ */
  function row(label, sub, ctl, testid) {
    return el('div.set-row', testid ? { testid: testid } : null, [el('div.lbl', [el('b', label), sub ? el('span', sub) : null]), ctl]);
  }
  function toggle(s, key, label, sub) {
    var on = !!prefs()[key];
    return row(label, sub, btn('.btn.small.set-toggle' + (on ? '.primary' : ''), { testid: 'set-' + key, 'aria-pressed': on ? 'true' : 'false',
      onclick: function () { var o = {}; o[key] = !on; set(o); s.rerender(); } }, on ? 'On' : 'Off'));
  }
  function seg(s, key, opts, prefix, cur, cls) {
    return el('div.set-seg' + (cls ? '.' + cls : ''), opts.map(function (x) {
      var on = cur === x[0];
      return btn('.btn.small' + (on ? '.primary' : ''), { testid: prefix + x[2], 'aria-pressed': on ? 'true' : 'false',
        onclick: function () { var o = {}; o[key] = x[0]; set(o); s.rerender(); } }, x[1]);
    }));
  }
  // v1.1 review: a string seat's words (Band sync, your chops, your notes) on the screens without a local strSeat
  function strNow() { var st = GG.state; return !!(st && GG.career && GG.career.seatOf && GG.career.seatOf(st) !== 'drums'); }
  function syncName() { return strNow() ? 'Band sync' : 'Drum sync'; }
  function sec(title, id) { return el('div.caps.set-sec', id ? { id: id } : null, title); }
  function msText(ms) { return ms === 0 ? 'right on it' : Math.abs(ms) + ' ms ' + (ms > 0 ? 'late' : 'early'); }
  var PROFILE_NAME = { speaker: '🔊 Speaker', headphones: '🎧 Headphones' };
  var BUS_NAME = { drums: ['Drums', 'your taps + the kit'], band: ['Band', 'backing + vocals'], crowd: ['Crowd', 'cheers, boos, the murmur'], sfx: ['SFX', 'UI sounds, ambience, van radio'] };

  /* ---- v1.5 "Desktop": Settings > Keys, the Layout row, the key timing (plan_contract_1.5 §4.7; Lane I) ---------------- */
  // Shown only with GG.input.showKeyUI() (a computer, the PC layout, or a real key pressed this session): never on a phone
  // that only ever touched. Chips set-key-<kind>-<slot> rebind through GG.input.capture (a fresh keydown binds; Esc, a click
  // elsewhere or 8 s cancel; a same-map conflict swaps; reserved keys are refused with a message and the chip keeps waiting).
  function keyUI() { return !!(GG.input && GG.input.showKeyUI && GG.input.showKeyUI()); }
  function wideNow() { return !!(ui.wide && ui.wide()); }
  function keyLabel(code) { return ui.keyLabel ? ui.keyLabel(code) : P.keyLabel(code, null, GG.input && GG.input.learned ? GG.input.learned() : null); }
  function kcap(t) { return el('span.kcap', t); }
  var STR_SLOT = ['Low', '2nd', '3rd', '4th', '5th', 'Top'];
  var STR_COL = ['#57c77a', '#ff6b4a', '#ffd23f', '#4f8cff', '#ff9f43', '#b98cff'], STR_CB = ['#009E73', '#D55E00', '#F0E442', '#56B4E9', '#E69F00', '#CC79A7'];
  function slotName(kind, slot) {
    if (kind === 'strings') return STR_SLOT[slot] + ' string';
    var L = ui.LANES && ui.LANES[GG.contracts.LANES[slot]]; return L ? L.name : GG.contracts.LANES[slot];
  }
  function slotColour(kind, slot, pf) {
    if (kind === 'strings') return (pf.colourblind ? STR_CB : (ui.STR_COLORS || STR_COL))[slot];
    var lane = GG.contracts.LANES[slot], L = ui.LANES && ui.LANES[lane];
    return pf.colourblind && P.CB_COLOURS[lane] ? P.CB_COLOURS[lane] : L ? L.color : '#8899bb';
  }
  // The map slots your gear plays now (the rest are dimmed, still bindable); null = no career / the other map.
  function usedSlots(kind, st) {
    if (!st || !GG.career || !GG.career.seatOf) return null;
    var seat = GG.career.seatOf(st); if (P.keyKind(seat) !== kind) return null;
    var n = kind === 'strings' ? (GG.career.seatLanes ? GG.career.seatLanes(st) : 4) : Math.min(6, st.gear && st.gear.lanes >= 1 ? st.gear.lanes : 4), out = {};
    for (var l = 0; l < n; l++) out[P.keySlot(kind, l, n)] = 1;
    return out;
  }
  function refusedText(code) {
    if (code === 'Tab') return 'Tab is for menus — pick another key.';
    if (/Enter$/.test(code)) return 'Enter is for menus — pick another key.';
    if (/^F\d/.test(code)) return code + ' belongs to the browser — pick another key.';
    var lbl = /^(Control|Alt|Meta|OS)/.test(code) ? keyLabel(code) : code === 'CapsLock' ? 'Caps Lock' : null;
    return (lbl || 'That key') + ' can’t play a lane — pick another key.';
  }
  var RB = null;   // the rebind in progress { s, kind, slot, chip, label, release, startT, timer, onDown }
  function bindMsg(text) { var m = RB && RB.s.body.querySelector('[data-testid="set-keys-msg"]'); if (m) m.textContent = text; }
  // Ends a rebind: the capture slot goes back; msg != null re-renders the screen with it (a click elsewhere only resets the
  // chip, so that click still lands on what it hit).
  function endBind(msg) {
    var r = RB; if (!r) return;
    RB = null;
    clearTimeout(r.startT); clearTimeout(r.timer);
    if (r.release) r.release();
    document.removeEventListener('pointerdown', r.onDown, true);
    if (msg == null) { r.chip.classList.remove('wait'); var k = r.chip.querySelector('.kcap'); if (k) k.textContent = r.label; return; }
    r.s.data.keysMsg = msg;
    if (ui.isOpen(r.s.id)) r.s.rerender();
  }
  function startBind(s, kind, slot, chip) {
    if (RB && RB.chip === chip) return;
    endBind(null);
    var k = chip.querySelector('.kcap');
    RB = { s: s, kind: kind, slot: slot, chip: chip, label: k ? k.textContent : '' };
    chip.classList.add('wait'); if (k) k.textContent = 'Press a key…';
    bindMsg('Press the new key for ' + slotName(kind, slot) + '. Esc cancels.');
    // next tick: the Enter / Space that pressed this chip is already down, so GG.input.capture never hands it over
    RB.startT = setTimeout(function () { if (RB && RB.chip === chip && GG.input && GG.input.capture) RB.release = GG.input.capture(onBindKey); }, 0);
    RB.timer = setTimeout(function () { endBind('No key pressed. Nothing changed.'); }, 8000);
    RB.onDown = function (ev) { if (!chip.contains(ev.target)) endBind(null); };
    document.addEventListener('pointerdown', RB.onDown, true);
  }
  function onBindKey(ev) {
    if (!RB) return;
    var code = ev.code || P.codeOf(ev.key) || '';
    if (ev.key === 'Escape' || code === 'Escape') { endBind('Cancelled. Nothing changed.'); return; }
    var pf = prefs(), kind = RB.kind, slot = RB.slot, old = pf.keymap[kind][slot], r = P.bindKey(pf, kind, slot, code);
    if (r.refused) { bindMsg(refusedText(code)); return; }   // the chip keeps waiting
    P.set({ keymap: r.keymap });
    var msg = slotName(kind, slot) + ' is now ' + keyLabel(code) + '.';
    if (r.swapped != null) msg = 'Swapped: ' + slotName(kind, r.swapped) + ' is now ' + keyLabel(old) + '. ' + msg;
    endBind(msg);
  }
  function keysSection(s, d, pf, st, wide) {
    var seat = st && GG.career && GG.career.seatOf ? GG.career.seatOf(st) : 'drums';
    var kind = P.KEY_KINDS.indexOf(d.keysKind) >= 0 ? d.keysKind : P.keyKind(seat), map = pf.keymap[kind], used = usedSlots(kind, st);
    var wrap = el('div.set-keys', { id: 'set-keys', testid: 'set-keys' }), A = wrap, B = wrap;
    if (wide) { A = el('div.w2-a'); B = el('div.w2-b'); }
    wrap.appendChild(el('div.caps.set-sec', 'Keys'));
    A.appendChild(el('p.small.dim', kind === 'drums' ? 'Left hand on A S D F, thumb on Space, little finger on Shift. Pick a drum, then press its new key.'
      : 'One map for bass, rhythm and lead, low string first. Pick a string, then press its new key.'));
    A.appendChild(el('div.set-seg', [['drums', '🥁 Drums'], ['strings', '🎸 Strings']].map(function (x) {
      var on = kind === x[0];
      return btn('.btn.small' + (on ? '.primary' : ''), { testid: 'set-keys-kind-' + x[0], 'aria-pressed': on ? 'true' : 'false',
        onclick: function () { endBind(null); s.data.keysKind = x[0]; s.data.keysMsg = ''; s.rerender(); } }, x[1]);
    })));
    A.appendChild(el('div.set-keys-chips', map.map(function (code, slot) {
      var name = slotName(kind, slot) + (kind === 'strings' && slot === 4 ? ' (6 strings)' : ''), dim = used && !used[slot], c = slotColour(kind, slot, pf);
      var chip = btn('.set-key-chip' + (dim ? '.dim' : ''), { testid: 'set-key-' + kind + '-' + slot, style: { borderColor: c },
        'aria-label': name + ': ' + keyLabel(code) + '. Press to change.' }, [el('i.sk-dot', { style: { background: c } }), el('span.sk-name', name), kcap(keyLabel(code))]);
      chip.onclick = function () { startBind(s, kind, slot, chip); };
      return chip;
    })));
    A.appendChild(el('p.small.set-keys-msg', { testid: 'set-keys-msg', 'aria-live': 'polite' }, d.keysMsg || ''));
    A.appendChild(el('p.tiny.dim', { testid: 'set-keys-pos' }, 'Keys go by their position on the keyboard, so A S D F is the same spot on any layout. Esc, Tab and Enter stay for the menus.'));
    var shift = P.KEY_KINDS.some(function (k) { return pf.keymap[k].some(function (c) { return /^Shift/.test(c); }); });
    if (shift) A.appendChild(el('p.tiny.amber', { testid: 'set-keys-sticky' }, 'On Windows, Shift pressed five times in a row can pop up the Sticky Keys box. Turn its shortcut off in Settings › Accessibility › Keyboard, or put another key on that lane.'));
    A.appendChild(btn('.btn.small', { testid: 'set-keys-reset', style: 'margin-top:6px', onclick: function () {
      endBind(null);
      P.set({ keymap: P.resetKeys(prefs(), kind) });
      s.data.keysMsg = (kind === 'drums' ? 'Drum' : 'String') + ' keys are back to the defaults.';
      s.rerender();
    } }, 'Reset ' + (kind === 'drums' ? 'drum' : 'string') + ' keys'));
    // the key timing per profile (calibKb): the click test (Classic timing) and the light check (what Drum sync uses)
    B.appendChild(el('div.panel.set-keys-timing', { testid: 'set-keys-timing' }, [
      el('b', 'Key timing'),
      el('div.tiny.dim', 'With ' + syncName() + ' on (the default), the light check is the one that lines up your keys.')
    ].concat(P.PROFILES.map(function (p) {
      var k = pf.calibKb[p];
      return el('div.small', { data: { profile: p } }, PROFILE_NAME[p] + ': click test ' + (k.at ? msText(k.audio) + ' ✓' : 'not tested yet')
        + ' · light check ' + (k.vat ? msText(k.visual) + ' ✓' : 'not tested yet'));
    })).concat([btn('.btn.small', { testid: 'set-calibrate-keys', style: 'margin-top:6px', onclick: function () {
      endBind(null);
      ui.show('calib', { profile: pf.audioProfile, input: 'keys', docked: wideNow() });
    } }, '⌨ Key timing')])));
    if (wide) wrap.appendChild(el('div.w2', [A, B]));
    return wrap;
  }
  // v1.5 PC layout (B): the tab rail (jumps to a section; the phone layout never builds it)
  function rail(s, keys) {
    var tabs = [['play', 'Play'], keys ? ['keys', 'Keys'] : null, ['audio', 'Audio + timing'], ['look', 'Look + feel'], ['saves', 'Saves']].filter(Boolean);
    return el('nav.set-rail', tabs.map(function (t) {
      return btn('.btn.ghost.small.set-rail-btn', { testid: 'set-rail-' + t[0], onclick: function () {
        var x = s.body.querySelector('#set-' + t[0]); if (x) { try { x.scrollIntoView({ block: 'start' }); } catch (e) { /* ignore */ } }
      } }, t[1]);
    }));
  }
  // The key UI and the PC layout can switch while Settings is open: rebuild it (never mid-rebind)
  function rebuild() { if (RB) return; var e = ui.get && ui.get('settings'); if (e) e.rerender(); }
  GG.on('ui:wide', rebuild);
  GG.on('input:mode', rebuild);
  GG.on('input:layoutmap', rebuild);   // v1.5 review: the keycap names landed (AZERTY / QWERTZ)
  // The key calibration opened from Settings > Keys in the PC layout docks over the timing column: Settings stays in view
  // (inert under it) while the calibration runs (ui hides the layers under a full screen; this un-hides that one).
  GG.on('ui:stack', function () {
    var c = ui.get && ui.get('calib'), st = ui.get && ui.get('settings');
    if (c && st && ui.top() === 'calib' && c.data && c.data.docked && wideNow()) st.root.classList.remove('hidden');
  });
  if (typeof document !== 'undefined' && document.head && !document.getElementById('gg-set-keys-css')) {
    var kss = document.createElement('style'); kss.id = 'gg-set-keys-css';
    kss.textContent = [
      '.set-keys-chips { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; margin: 10px 0 6px; }',
      '.set-key-chip { display: flex; align-items: center; gap: 8px; min-height: 48px; padding: 6px 10px; border-radius: 12px; border: 2px solid var(--line);',
      '  background: rgba(10, 14, 24, .6); color: var(--text, #fff); font: inherit; font-weight: 700; text-align: left; cursor: pointer; }',
      '.set-key-chip.dim { opacity: .55; }',
      '.set-key-chip.wait { border-style: dashed; }',
      '.set-key-chip .sk-dot { width: 10px; height: 10px; border-radius: 50%; flex: 0 0 auto; }',
      '.set-key-chip .sk-name { flex: 1 1 auto; min-width: 0; }',
      '.set-keys-msg { min-height: 1.4em; margin: 4px 0; }',
      '.set-keys-timing { margin-top: 10px; display: flex; flex-direction: column; gap: 4px; }'
    ].join('\n');
    document.head.appendChild(kss);
  }

  /* ---- Settings screen ---------------------------------------------------------------------------------- */
  ui.define('settings', {
    kind: 'full',
    onClose: function () { endBind(null); },   // v1.5: a rebind never outlives the screen (its capture slot goes back)
    build: function (s, d) {
      var pf = prefs(), st = GG.state, A = GG.audio;
      // v1.5 PC layout (B): a tab rail on the left + the sections in a centred column (set-main); the phone keeps one body
      var wide = wideNow(), body = wide ? el('div.set-main') : s.body;
      ui.append(body, [el('div.back-row', [btn('.icon-btn', { testid: 'btn-back', 'aria-label': 'Back', onclick: function () { ui.close(s.id); } }, '←'),
        el('div', [el('div.caps', 'Garage to Glory'), el('h1.display', 'Settings')])])]);

      // Career difficulty: picked on the new-career screen, locked for that career
      var cd = GG.difficulty ? GG.difficulty.of(st) : 'normal', ct = GG.difficulty ? GG.difficulty.text(cd) : { name: cd, blurb: '' };
      body.appendChild(sec('Career'));
      body.appendChild(row(st ? 'Career difficulty: ' + ct.name + ' 🔒' : 'Career difficulty', st ? 'Locked for this career. ' + ct.blurb : 'Chill, Normal or Brutal: you pick it when you start a new career.', null, 'set-career-diff'));

      // Play
      body.appendChild(sec('Play', 'set-play'));
      var gd = GG.gig && GG.gig.DIFFICULTIES && GG.gig.DIFFICULTIES[pf.gigDifficulty] ? pf.gigDifficulty : 'easy';
      body.appendChild(row('Gig difficulty', 'Timing window, stacked with your ' + (strNow() ? 'chops' : 'drum skill') + '. Change it any time.', null));
      body.appendChild(seg(s, 'gigDifficulty', ['easy', 'normal', 'hard', 'expert'].map(function (x) { return [x, x.charAt(0).toUpperCase() + x.slice(1), x]; }), 'set-gigdiff-', gd));
      body.appendChild(row('Note speed', 'How fast the highway scrolls. Separate from difficulty.', null));
      body.appendChild(seg(s, 'noteSpeed', P.NOTE_SPEEDS.map(function (v) { return [v, '×' + v, String(Math.round(v * 100))]; }), 'set-speed-', pf.noteSpeed));
      body.appendChild(toggle(s, 'noFail', 'No-fail', "The crowd can't turn hostile. Nobody gets booed off."));
      var strSeat = !!(st && GG.career && GG.career.seatOf && GG.career.seatOf(st) !== 'drums');   // v1.1: a string seat has no kick lane
      if (!strSeat) body.appendChild(toggle(s, 'autoKick', 'Auto-kick', 'The kick lane plays itself (as Goods). Your right foot can rest.'));
      body.appendChild(toggle(s, 'lefty', 'Lefty mode', strSeat ? 'Mirrors the lanes: low notes on the right.' : 'Mirrors the lanes: kick on the right.'));
      body.appendChild(toggle(s, 'drumSync', strSeat ? 'Band sync' : 'Drum sync', strSeat ? "Your notes land right on the band's beat. Play by the highway. Off: classic timing, judged by your calibration's click test (for playing by ear)."
        : "Your drums land right on the band's beat. Play by the highway. Off: classic timing, judged by your calibration's click test (for playing by ear)."));
      if (st && (st.songs || []).length) body.appendChild(btn('.btn.block', { testid: 'set-practice', style: 'margin-top:8px', onclick: function () { ui.show('practice'); } }, (strSeat ? '🎸' : '🥁') + ' Practice a song'));

      // v1.5 Keys (a computer, the PC layout, or a key pressed this session): rebind, reset, the key timing
      var keys = keyUI();
      if (keys) body.appendChild(keysSection(s, d, pf, st, wide));

      // Audio
      body.appendChild(sec('Audio + timing', 'set-audio'));
      body.appendChild(row('Listening on', 'Bluetooth adds delay: each profile keeps its own calibration.', null));
      body.appendChild(seg(s, 'audioProfile', P.PROFILES.map(function (p) { return [p, PROFILE_NAME[p], p]; }), 'set-profile-', pf.audioProfile));
      var c = pf.calib[pf.audioProfile];
      body.appendChild(row('Calibration', c.at ? 'Taps ' + msText(c.audio) + ' · eyes ' + msText(c.visual) : 'Not calibrated yet on this profile.',
        btn('.btn.small', { testid: 'set-calibrate', onclick: function () { ui.show('calib', { profile: pf.audioProfile }); } }, c.at ? 'Redo' : 'Calibrate')));
      if (A && A.isMuted) body.appendChild(row('Sound', null, btn('.btn.small.set-toggle' + (A.isMuted() ? '' : '.primary'), { testid: 'set-muted',
        onclick: function () { A.toggleMuted(); s.rerender(); } }, A.isMuted() ? 'Off' : 'On')));
      if (A && typeof A.setVolume === 'function' && typeof A.getVolume === 'function') {   // lane A's mixer
        ((GG.contracts && GG.contracts.MIX_BUSES) || ['drums', 'band', 'crowd', 'sfx']).forEach(function (bus) {
          var v = A.getVolume(bus); v = v == null ? 1 : v;
          var n = BUS_NAME[bus] || [bus, ''];
          body.appendChild(el('div.set-row', { style: 'flex-wrap:wrap' }, [el('div.lbl', [el('b', n[0]), el('span', n[1])]),
            el('input.set-slider', { type: 'range', min: 0, max: 100, step: 5, value: Math.round(v * 100), testid: 'set-mix-' + bus, 'aria-label': n[0] + ' volume',
              oninput: function (e) { try { A.setVolume(bus, (+e.target.value) / 100); } catch (err) { /* ignore */ } } })]));
        });
      }
      if (A && typeof A.setMetronome === 'function' && typeof A.metronome === 'function') {
        var mo = !!A.metronome();
        body.appendChild(row('Metronome', 'A click under the sequencer while you write.', btn('.btn.small.set-toggle' + (mo ? '.primary' : ''), { testid: 'set-metronome',
          'aria-pressed': mo ? 'true' : 'false', onclick: function () { A.setMetronome(!mo); s.rerender(); } }, mo ? 'On' : 'Off')));
      }
      if (A && typeof A.applySettings === 'function') {   // country brushed snare (off = ghost notes)
        var br = (GG.save && GG.save.settings && GG.save.settings().brushes) !== false;
        body.appendChild(row('Brushes', 'Country snare: brushes, or ghost notes when off.', btn('.btn.small.set-toggle' + (br ? '.primary' : ''), { testid: 'set-brushes',
          'aria-pressed': br ? 'true' : 'false', onclick: function () { GG.prefs.set({ brushes: !br }); s.rerender(); } }, br ? 'On' : 'Off')));
      }

      // Look + feel
      body.appendChild(sec('Look + feel', 'set-look'));
      // v1.0 (§0 Q8): Auto is the default: a little softer than High on a sharp phone screen, steps down only when frames run slow.
      body.appendChild(row('Graphics', 'Auto picks the sharpness and backs off when frames run slow. Low saves battery: fewer pixels, a smaller crowd.', null));
      body.appendChild(seg(s, 'graphics', [['auto', 'Auto', 'auto'], ['low', 'Low', 'low'], ['med', 'Medium', 'med'], ['high', 'High', 'high']], 'set-gfx-', pf.graphics, 'set-gfx'));
      body.appendChild(toggle(s, 'colourblind', 'Colourblind lanes', 'Lane colours anyone can tell apart.'));
      if (pf.colourblind) body.appendChild(el('div.row', { testid: 'set-cb-preview', style: 'gap:4px;margin:6px 0' }, GG.contracts.LANES.map(function (l) {
        return el('span.tag', { style: { background: P.CB_COLOURS[l], color: '#111', flex: '1 1 0', textAlign: 'center' } }, (ui.LANES && ui.LANES[l] ? ui.LANES[l].name : l));
      })));
      body.appendChild(toggle(s, 'bigText', 'Bigger text', null));
      body.appendChild(toggle(s, 'reducedFlash', 'Reduced flashing', 'Calmer stage lights, no hit flashes, no pyro strobe.'));
      body.appendChild(toggle(s, 'cameraShake', 'Camera shake', null));
      body.appendChild(toggle(s, 'skipVan', 'Skip van scenes', 'Straight to the load-in (road cards still happen).'));
      body.appendChild(toggle(s, 'fastAnim', 'Faster animations', 'Snappier screens, shorter drives.'));
      if (keys) {   // v1.5 (D9): Auto = the PC layout on a computer with a big window; Phone / PC force either
        body.appendChild(row('Layout', 'Auto uses the PC layout on a computer with a big window. Never mid-song.', null, 'set-layout'));
        body.appendChild(seg(s, 'layout', [['auto', 'Auto', 'auto'], ['phone', 'Phone', 'phone'], ['wide', 'PC', 'wide']], 'set-layout-', pf.layout));
      }

      // Saves
      body.appendChild(sec('Saves', 'set-saves'));
      body.appendChild(el('div.row', [
        btn('.btn.grow', { testid: 'set-save-load', onclick: function () { ui.show('load'); } }, 'Slots'),
        btn('.btn.grow', { testid: 'set-save-backup', disabled: !st, onclick: function () { ui.show('code', { mode: 'backup' }); } }, 'Back up'),
        btn('.btn.grow', { testid: 'set-save-restore', onclick: function () { ui.show('code', { mode: 'restore' }); } }, 'Restore')
      ]));
      body.appendChild(el('p.tiny.dim', { style: 'margin-top:8px' }, st ? 'Save into a slot from the ☰ menu. Back up = a save code you can paste anywhere.' : 'Back ups are save codes: paste one in to restore a career.'));
      s.foot.appendChild(btn('.btn.primary.big.block', { testid: 'set-done', onclick: function () { ui.close(s.id); } }, 'Done'));
      if (wide) s.body.appendChild(el('div.set-wide', [rail(s, keys), body]));
      if (d && d.tab && !d._scrolled) {
        d._scrolled = true;
        var target = s.body.querySelector('#set-' + d.tab);
        if (target && wide) setTimeout(function () { try { target.scrollIntoView({ block: 'start' }); } catch (e) { /* ignore */ } }, 0);
        else if (target) setTimeout(function () { try { s.body.scrollTop = target.offsetTop - 12; } catch (e) { /* ignore */ } }, 0);
      }
    }
  });

  /* ---- Calibration ------------------------------------------------------------------------------------------ */
  var N_CLICKS = 8, GAP = 600, LEAD = 1000;
  var K = null;   // the test in progress
  var dbg = { open: false, step: null, clicks: [], taps: [], audio: null, visual: null, profile: null, clock: null, input: 'touch' };
  function stopTest() {
    if (!K) return;
    K.timers.forEach(clearTimeout); K.timers = [];
    K.running = false;
    if (K.release) { K.release(); K.release = null; }   // v1.5: the key test's capture slot
  }
  // v1.5 (§4.7, K4 + D3): the key calibration. Both steps run on keys like touch: one tap per fresh keydown through
  // GG.input.capture (a held key is one tap; repeats and keyups never count), stamped ev.timeStamp, the same calibCompute;
  // Esc stops the test. Saved to calibKb (GG.prefs.setCalib(profile, o, 'keys')); the touch calibration is untouched.
  function keyTest(s) {
    var k = K;
    k.timers.push(setTimeout(function () {
      if (K !== k || !k.running || !GG.input || !GG.input.capture) return;
      k.release = GG.input.capture(function (ev) {
        if (K !== k || !k.running) return;
        if (ev.key === 'Escape' || ev.code === 'Escape') { stopTest(); if (ui.isOpen('calib')) s.rerender({ profile: s.data.profile, first: s.data.first, input: 'keys', docked: s.data.docked }); return; }
        var now = performance.now(), t = ev.timeStamp > 0 && Math.abs(ev.timeStamp - now) < 1000 ? ev.timeStamp : now;
        k.taps.push(t);
        var pad = s.body && s.body.querySelector('[data-testid="calib-pad"]');
        if (pad) { pad.classList.add('hit'); setTimeout(function () { pad.classList.remove('hit'); }, 90); }
      });
    }, 0));   // next tick: the Enter / Space that started the test is already down, so it never counts
  }
  function inputOf(d) { return d && (d.input === 'keys' || d.input === 'touch') ? d.input : GG.input && GG.input.mode ? GG.input.mode() : 'touch'; }
  function ctxNow() { try { return GG.audio && GG.audio.context ? GG.audio.context() : null; } catch (e) { return null; } }
  function beep(c, when, hi) {
    var o = c.createOscillator(), g = c.createGain();
    o.type = 'square'; o.frequency.value = hi ? 1760 : 1320;
    g.gain.setValueAtTime(0.0001, when); g.gain.exponentialRampToValueAtTime(0.3, when + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, when + 0.06);
    o.connect(g); g.connect(c.destination); o.start(when); o.stop(when + 0.08);
  }
  // Click i is heard at clicks[i] (performance.now() ms): scheduled on the AudioContext, mapped to the performance clock
  // once at the start (+ the output latency the gig clock also assumes), so later clock hiccups can't skew it.
  function startAudioTest(s) {
    stopTest();
    K = { kind: 'audio', clicks: [], taps: [], timers: [], running: true, n: 0, input: inputOf(s.data) };
    try { if (GG.audio && GG.audio.unlock) GG.audio.unlock(); } catch (e) { /* ignore */ }
    var c = ctxNow(), p0 = performance.now(), i;
    if (c && c.state !== 'running' && c.resume) { try { c.resume(); } catch (e) { /* ignore */ } }
    if (c && c.state === 'running') {
      var a0 = c.currentTime, lat = U.clamp(c.outputLatency > 0 ? c.outputLatency : c.baseLatency > 0 ? c.baseLatency : 0.025, 0, 0.3);
      K.lat = Math.round(lat * 1000);   // v0.8.3: the raw lag (offset + this) is what a Bluetooth headset adds
      for (i = 0; i < N_CLICKS; i++) { var at = a0 + (LEAD + i * GAP) / 1000; try { beep(c, at, i % 4 === 0); } catch (e) { /* ignore */ } K.clicks.push(p0 + LEAD + i * GAP + lat * 1000); }
      dbg.clock = 'audio';
    } else {
      for (i = 0; i < N_CLICKS; i++) K.clicks.push(p0 + LEAD + i * GAP);
      K.clicks.forEach(function (t) { K.timers.push(setTimeout(function () { if (GG.audio && GG.audio.sfx) GG.audio.sfx('tap'); }, t - p0)); });
      dbg.clock = 'performance';
    }
    K.clicks.forEach(function (t, k) { K.timers.push(setTimeout(function () { K.n = k + 1; count(s); }, Math.max(0, t - performance.now()))); });
    K.timers.push(setTimeout(function () { finishTest(s); }, K.clicks[N_CLICKS - 1] - p0 + 700));
    dbg.clicks = K.clicks.slice(); dbg.taps = K.taps;
    s.rerender(carry(s, { step: 'audio', audio: s.data.audio }));
    if (K.input === 'keys') keyTest(s);   // v1.5
  }
  // v1.5: what every re-render of the calibration keeps (the profile, first launch, the input tested, docked in Settings)
  function carry(s, o) { return Object.assign({ profile: s.data.profile, first: s.data.first, input: s.data.input, docked: s.data.docked }, o); }
  function startVisualTest(s) {
    stopTest();
    K = { kind: 'visual', clicks: [], taps: [], timers: [], running: true, n: 0, input: inputOf(s.data) };
    var p0 = performance.now();
    for (var i = 0; i < N_CLICKS; i++) (function (k) {
      K.timers.push(setTimeout(function () {
        var l = document.querySelector('[data-testid="calib-light"]');
        if (l) l.classList.add('on');
        K.clicks[k] = performance.now(); K.n = k + 1; dbg.clicks = K.clicks.slice(); count(s);
        K.timers.push(setTimeout(function () { if (l) l.classList.remove('on'); }, 110));
      }, LEAD + k * GAP));
    })(i);
    K.timers.push(setTimeout(function () { finishTest(s); }, LEAD + (N_CLICKS - 1) * GAP + 700));
    dbg.clicks = []; dbg.taps = K.taps;
    s.rerender(carry(s, { step: 'visual', audio: s.data.audio }));
    if (K.input === 'keys') keyTest(s);   // v1.5
  }
  function count(s) { var e = s.body && s.body.querySelector('[data-testid="calib-count"]'); if (e && K) e.textContent = (K.kind === 'audio' ? 'Click ' : 'Flash ') + Math.min(K.n, N_CLICKS) + ' of ' + N_CLICKS; }
  function finishTest(s) {
    if (!K) return;
    var kind = K.kind, r = P.calibCompute(K.clicks.filter(function (x) { return x != null; }), K.taps, { interval: GAP });
    stopTest();
    if (kind === 'audio') r.lat = K.lat || 0;
    dbg[kind] = r;
    var d = carry(s, { audio: s.data.audio, visual: s.data.visual });
    d[kind] = r; d.step = kind + 'Done';
    if (ui.isOpen('calib')) s.rerender(d);
  }
  function padTap(ev) {
    if (!K || !K.running || K.input === 'keys') return;   // v1.5: the key test counts keys only
    if (ev.cancelable) ev.preventDefault();
    var now = performance.now(), t = ev.timeStamp > 0 && Math.abs(ev.timeStamp - now) < 1000 ? ev.timeStamp : now;
    K.taps.push(t);
    var pad = ev.currentTarget; if (pad && pad.classList) { pad.classList.add('hit'); setTimeout(function () { pad.classList.remove('hit'); }, 90); }
  }
  ui.define('calib', {
    kind: 'full', sticky: true,
    build: function (s, d) {
      var pf = prefs(), profile = P.PROFILES.indexOf(d.profile) >= 0 ? d.profile : pf.audioProfile, step = d.step || 'intro';
      d.profile = profile;
      var input = d.input = inputOf(d), keys = input === 'keys';   // v1.5: the input being calibrated (starts on GG.input.mode())
      dbg.open = true; dbg.step = step; dbg.profile = profile; dbg.input = input;
      s.root.classList.toggle('calib-docked', !!(d.docked && wideNow()));   // v1.5 B: over Settings > Keys' timing column
      function skip() { stopTest(); set({ calibSeen: true }); ui.close(s.id); }
      ui.append(s.body, [el('div.back-row', [d.first ? null : btn('.icon-btn', { testid: 'btn-back', 'aria-label': 'Back', onclick: function () { stopTest(); ui.close(s.id); } }, '←'),
        el('div', [el('div.caps', d.first ? 'Before the first gig' : 'Settings'), el('h1.display', 'Calibrate')])])]);
      if (step === 'intro') {
        ui.append(s.body, [
          el('p.screen-sub', "Phones are late. Bluetooth is later. The light check lines the highway up with your eyes (" + syncName() + "); the click test is for classic timing."),
          el('div.caps.set-sec', 'Calibrating for'),
          el('div.set-seg', P.PROFILES.map(function (p) {
            return btn('.btn.small' + (p === profile ? '.primary' : ''), { testid: 'calib-profile-' + p, onclick: function () { s.rerender(carry(s, { profile: p })); } }, PROFILE_NAME[p]);
          })),
          keyUI() ? el('div.caps.set-sec', 'Playing on') : null,   // v1.5: touch and keys keep their own timing
          keyUI() ? el('div.set-seg', [['touch', '👆 Touch'], ['keys', '⌨ Keys']].map(function (x) {
            return btn('.btn.small' + (x[0] === input ? '.primary' : ''), { testid: 'calib-input-' + x[0], 'aria-pressed': x[0] === input ? 'true' : 'false',
              onclick: function () { s.rerender(carry(s, { input: x[0] })); } }, x[1]);
          })) : null,
          el('p.small.dim', { style: 'margin-top:10px' }, keys ? 'Step 1: press any key on each of eight clicks. Step 2: press a key when the light flashes. Esc stops. Takes twenty seconds.'
            : 'Step 1: tap the pad on each of eight clicks. Step 2: tap when the light flashes. Takes twenty seconds.'),
          keys ? el('p.small.dim', 'With ' + syncName() + ' on (the default), the light check is the one that lines up your keys.') : null,
          GG.audio && GG.audio.isMuted && GG.audio.isMuted() ? el('p.small.amber', 'Your sound is off. The clicks play anyway; turn your phone up.') : null
        ]);
        s.foot.appendChild(el('div.stack', [btn('.btn.primary.big.block', { testid: 'calib-start', onclick: function () { startAudioTest(s); } }, 'Start the tap test'),
          btn('.btn.block', { testid: 'calib-visual-only', onclick: function () { startVisualTest(s); } }, 'Light check only (' + syncName() + ')'),
          btn('.btn.ghost.block', { testid: 'calib-skip', onclick: skip }, d.first ? 'Skip for now (Settings → Calibrate later)' : 'Cancel')]));
        return;
      }
      if (step === 'audio' || step === 'visual') {
        var pad = el('div.calib-pad', { testid: 'calib-pad', onpointerdown: padTap }, keys ? (step === 'audio' ? 'Press a key on the click' : 'Press a key on the flash') : step === 'audio' ? 'Tap on the click' : 'Tap on the flash');
        ui.append(s.body, [
          el('p.screen-sub', keys ? (step === 'audio' ? 'Listen. Press any key exactly on each click (Space works well). Esc stops.' : 'Watch the light. Press a key the moment it flashes. Esc stops.')
            : step === 'audio' ? 'Listen. Tap the pad exactly on each click. Eyes closed works best.' : 'Watch the light. Tap the moment it flashes.'),
          step === 'visual' ? el('div.calib-light', { testid: 'calib-light', onpointerdown: padTap }) : null,
          el('div.caps.center', { testid: 'calib-count', style: 'margin:10px 0' }, 'Get ready…'),
          pad
        ]);
        s.foot.appendChild(btn('.btn.ghost.block', { testid: 'calib-skip', onclick: skip }, 'Skip'));
        return;
      }
      // results
      var a = d.audio, v = d.visual;
      function line(r, what) { return r ? (r.ok ? what + ': ' + msText(r.offset) + ' (' + r.n + ' taps)' : what + ": didn't catch enough taps.") : null; }
      ui.append(s.body, [
        el('div.panel', { testid: 'calib-result' }, [el('b', PROFILE_NAME[profile] + (keys ? ' · keys' : '')), el('div', line(a, keys ? 'You hear + press' : 'You hear + tap')), v ? el('div', line(v, keys ? 'You see + press' : 'You see + tap')) : null]),
        el('p.small.dim', { style: 'margin-top:8px' }, step === 'audioDone' ? 'Next, the light check: ' + syncName() + ' lines the highway up with it.' : 'Saved per profile. Switch profiles from Settings or the setlist sheet.'),
        a && a.ok && a.offset + (a.lat || 0) >= 120 ? el('p.small.amber', { testid: 'calib-bt' }, "That's a big delay (Bluetooth?). " + syncName() + (strNow() ? ' keeps your notes' : ' keeps your drums') + " with the band; watch the highway rather than your ears.") : null
      ]);
      var foot = [];
      if (step === 'audioDone') foot.push(btn('.btn.primary.big.block', { testid: 'calib-visual-start', onclick: function () { startVisualTest(s); } }, 'Next: the light check'));
      if ((a && a.ok) || (v && v.ok)) foot.push(btn('.btn' + (step === 'visualDone' ? '.primary.big' : '') + '.block', { testid: 'calib-save', onclick: function () {
        var o = { at: Date.now() };
        if (a && a.ok) o.audio = a.offset;
        if (v && v.ok) o.visual = v.offset;
        if (keys) { delete o.at; P.setCalib(profile, o, 'keys'); }   // v1.5: calibKb (at only with the click test, vat only with the light check)
        else P.setCalib(profile, o);
        ui.close(s.id);
        ui.toast((keys ? 'Key timing set for ' : 'Calibrated for ') + PROFILE_NAME[profile].replace(/^\S+ /, '').toLowerCase() + '. '   // v0.9: first launch has no band yet
          + (GG.state ? ui.fill('{deadpan} gives a slow thumbs-up.', GG.state) : 'Somebody at the back gives a slow thumbs-up.'));
      } }, 'Save calibration'));
      foot.push(btn('.btn.ghost.block', { testid: 'calib-retry', onclick: function () { if (step === 'visualDone') startVisualTest(s); else startAudioTest(s); } }, 'Try again'));
      s.foot.appendChild(el('div.stack', foot));
    },
    onClose: function () { stopTest(); K = null; dbg.open = false; dbg.step = null; GG.emit('settings:changed', { keys: ['calib'] }); }
  });
  GG.registerDebug('calib', function () { return { open: dbg.open, step: dbg.step, profile: dbg.profile, clock: dbg.clock, clicks: dbg.clicks.slice(), taps: (dbg.taps || []).slice(), audio: dbg.audio, visual: dbg.visual,
    input: dbg.input, capturing: !!(K && K.release) }; });   // v1.5: + input

  // First launch: the title opens the calibration once (skippable). Automation (navigator.webdriver) only with ?calib=1.
  var firstDone = false;
  GG.on('screen:open', function (p) {
    if (firstDone || !p || p.id !== 'title') return;
    firstDone = true;
    var force = typeof location !== 'undefined' && /[?&]calib=1\b/.test(location.search || '');
    if (prefs().calibSeen || (!force && typeof navigator !== 'undefined' && navigator.webdriver)) return;
    setTimeout(function () { if (ui.top() === 'title') ui.show('calib', { first: true }); }, 60);
  });

  /* ---- Practice mode ---------------------------------------------------------------------------------------- */
  var SPEEDS = [[0.5, '50%'], [0.75, '75%'], [1, '100%']];
  ui.practice = function (songId, speed) {
    var st = GG.state, song = st && GG.songs.byId(st, songId);
    if (!st || !song || !ui.playGig) return false;
    speed = speed > 0 && speed <= 1 ? speed : 1;
    var slow = Object.assign({}, song, { pattern: Object.assign({}, song.pattern, { bpm: Math.max(30, Math.round((song.pattern.bpm || 120) * speed)) }) });
    var shadow = Object.assign({}, st, { liveGig: null, songs: (st.songs || []).map(function (x) { return x.id === songId ? slow : x; }) });
    var pct = Math.round(speed * 100);
    var gig = { venueId: 'practice:' + songId, name: 'Practice · ' + song.title, city: ui.space(st, true), tier: 1, kind: 'studio',
      capacity: 1, deal: 'flat', pay: 0, gas: 0, quirk: '', source: 'practice', setSize: 1 };
    if (ui.isOpen('practice')) ui.close('practice');
    return ui.playGig(gig, function (r) {
      if (r) ui.toast('Practice at ' + pct + '%: ' + Math.round((r.accuracy || 0) * 100) + '% hit, best combo ' + (r.maxCombo || 0) + '. Nobody saw. Perfect.', { who: 'Practice' });
    }, { studio: { state: shadow, songId: songId, label: 'Practice · “' + song.title + '” · ' + pct + '% speed' }, practice: { speed: speed }, apply: function () {} });
  };
  ui.define('practice', {
    kind: 'sheet', tall: true, title: 'Practice',
    build: function (s, d) {
      var st = GG.state; if (!st) return;
      var speed = d.speed || 0.75;
      s.setTitle('Practice', 'No crowd · no pay · nothing saved');
      s.body.appendChild(el('p.small.dim', ui.fill('Any song from your catalog, slowed down if you like. {deadpan} holds the click. Nobody is watching. Probably.', st)));
      s.body.appendChild(el('div.caps.set-sec', 'Speed'));
      s.body.appendChild(el('div.set-seg', SPEEDS.map(function (x) {
        return btn('.btn.small' + (x[0] === speed ? '.primary' : ''), { testid: 'practice-speed-' + Math.round(x[0] * 100), onclick: function () { s.rerender({ speed: x[0] }); } }, x[1]);
      })));
      s.body.appendChild(el('div.caps.set-sec', 'Pick a song'));
      var list = el('div.panel', { style: 'padding:0 12px' });
      GG.songs.best(st).forEach(function (song) {
        var r = song.rating || {};
        list.appendChild(btn('.song', { testid: 'practice-song-' + song.id, onclick: function () { ui.practice(song.id, speed); } },
          el('div.row', [el('span', { style: 'font-size:20px' }, GG.career && GG.career.seatOf && GG.career.seatOf(st) !== 'drums' ? '🎸' : '🥁'), el('div.grow', [el('b', song.title),
            el('div.tiny.dim', 'Diff ' + (r.difficulty || '?') + ' · ' + Math.round((song.pattern && song.pattern.bpm || 120) * speed) + ' bpm at this speed')])])));
      });
      s.body.appendChild(list);
    }
  });
  // The drum kit (the sketch pad) gets a way into practice mode too. v1.3: it lives in the songwriter's ⋯ menu (modal 'seq-tools').
  GG.on('ui:layout', function (p) {
    if (!p || p.id !== 'seq-tools' || !ui.get) return;
    var m = ui.get('seq-tools'), owner = m && m.data && m.data.owner, d = owner && owner.data;
    if (!d || d.mode !== 'sketch' || !GG.state || !(GG.state.songs || []).length) return;
    if (m.body.querySelector('[data-testid="kit-practice"]')) return;
    var strSeat = GG.career && GG.career.seatOf && GG.career.seatOf(GG.state) !== 'drums';   // v1.1: on a string seat this is your rig
    var row = btn('.seq-menu-row', { testid: 'kit-practice', onclick: function () { ui.close('seq-tools'); ui.show('practice'); } },
      [el('span.tm-i', strSeat ? '🎸' : '🥁'), el('span.grow', 'Practice a song instead')]);
    var shop = m.body.querySelector('[data-testid="btn-kit-shop"]');
    if (shop && shop.parentNode) shop.parentNode.insertBefore(row, shop.nextSibling); else m.body.appendChild(row);
  });

  GG.registerDebug('settings', function () {
    var h = document.documentElement;
    return { prefs: prefs(), classes: { big: h.classList.contains('gg-big'), calm: h.classList.contains('gg-calm'), fast: h.classList.contains('gg-fast') },
      render: GG.render && GG.render.prefs ? GG.render.prefs() : null, difficulty: GG.difficulty ? GG.difficulty.of(GG.state) : null };
  });
})(window.GG);
