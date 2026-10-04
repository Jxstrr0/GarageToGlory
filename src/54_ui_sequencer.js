// 54_ui_sequencer.js: the songwriter, a full screen. v1.3 "Songwriter" (plan_contract_1.3 §4.7, status.md Addendum 5 S4/S6/S7):
// ONE flow in the "Clean sheet" look, no Guided / Advanced split (settings.songwriterMode is ignored, D18):
//   Quick song (D.screen 'quick'): pick a recipe (2-column cards, 5 per genre + "Surprise me"; pedal recipes locked without a
//     double kick), move the sliders (Energy / Mood / Feel / Fills & surprises / Tempo), ▶ Play, Tweak ✎ or Save ✓. Every
//     change re-composes the song (GG.songs.compose, seeded per song slot: D14); Feel and Tempo never touch the notes; after
//     hand edits a recipe / Energy / Mood / Fills change asks first (Q3: Start over / Keep my edits).
//   Editor (D.screen 'edit'): underline section tabs (Verse / Chorus / Bridge (+ Solo / Outro once owned) / Song), a slim meter
//     strip (± flash), a one-line coach bubble (tap: the full tip), on a string seat "Your part | Drums" + "Chords: <name> ▾"
//     ("Hook: <name> ▾" on lead) and four chord chips (bar 1-4; the home chord outlined green), then the grid filling the screen:
//     lanes (drums) or your part's v2 rows (part.view) left→right × 16 steps top→bottom, like the gig highway: tap to toggle,
//     drag to paint. Foot: ▶ Loop / ▶ Song / Save ✓ (sketch pad: Use in next Write).
//   Header ⋯ (modal 'seq-tools'): Let the band jam one, the metronome, Quick song, the drum / guitar shop (sketch pad),
//     Beat for this section, Bar 4 fill (Q2), copy / clear, your part's one-tap tweaks, take an extra out.
// Modes: write (one per Write block, opened by the planner's Go via GG.ui.composeWeek: a fresh block opens Quick song with the
//   genre's signature recipe, a queued sketch opens the editor), sketch (the kit hotspot on state.draft: the editor when a draft
//   exists, else Quick song; D10), view (a catalog song: the editor, read-only; ⋯ = the metronome only).
// Compatibility (D16): an old song opened and saved untouched stays 1.2 JSON: chips read songs.chordsOf and write p.chords only
// on a chip / picker edit; a v1 part renders through part.view and becomes v2 on its first grid / tweak edit; view never writes.
// ui.show('seq', { mode, pat, screen, title, titleEn, song, index, total, fromSketch, editHint: { who, text }, onSave(entry),
//   onJam(), onCancel() })
(function (GG) {
  var ui = GG.ui, el = ui.el, btn = ui.btn, C = GG.contracts, U = GG.util;
  // Lane look, left to right. v0.3's note highway uses the same colours and icons.
  ui.LANES = {
    kick: { name: 'Kick', icon: '🦶', color: '#ff6b4a' }, snare: { name: 'Snare', icon: '🥁', color: '#ffd23f' },
    hat: { name: 'Hats', icon: '🎩', color: '#3cd0c0' }, cymbal: { name: 'Crash', icon: '💥', color: '#b98cff' },
    toms: { name: 'Toms', icon: '🛢️', color: '#57c77a' }, ride: { name: 'Ride', icon: '🔔', color: '#4f8cff' }
  };
  var SEC_LABEL = { verse: 'Verse', chorus: 'Chorus', bridge: 'Bridge', solo: 'Solo', outro: 'Outro', song: 'Song' };
  var SECTIONS3 = ['verse', 'chorus', 'bridge'];
  function isExtra(name) { return name === 'solo' || name === 'outro'; }
  function hasSec(D, name) { return !!(D.pat && D.pat.sections && D.pat.sections[name]); }
  function chipSec(name) { return SECTIONS3.indexOf(name) >= 0; }
  // v0.8: the section tabs this kit can write (read-only songs: the sections they have).
  function tabsFor(D) {
    var names = D.mode === 'view' ? GG.songs.sectionsOf(D.pat) : GG.songs.allSections(gear());
    return names.map(function (n) { return { id: n, label: (isExtra(n) && !hasSec(D, n) ? '+' : '') + SEC_LABEL[n] }; }).concat([{ id: 'song', label: 'Song' }]);
  }
  function extraDef(name) {   // v1.1 review: the seat's text (GG.shop.sectionDef), tokens filled
    var d = GG.shop && GG.shop.sectionDef ? GG.shop.sectionDef(GG.state, name) : ((GG.content.shop && GG.content.shop.sections) || {})[name];
    return d ? { name: d.name || SEC_LABEL[name], blurb: ui.fill(d.blurb || '') } : { name: SEC_LABEL[name], blurb: '' };
  }
  // Arrangement presets keep the extras the song uses (a solo before the last chorus, an outro at the end).
  function withSongExtras(D, arr) { return GG.songs.withExtras(arr.slice(), gear(), { solo: hasSec(D, 'solo'), outro: hasSec(D, 'outro') }); }
  function baseArrangementId(p) { return GG.songs.arrangementId({ arrangement: (p.arrangement || []).filter(function (x) { return !isExtra(x); }) }); }
  function addExtra(s, D, name) {
    D.pat = GG.songs.addSection(D.pat, name, gear()); D.edited = true;
    if (D.pat.part) withPart(D.pat);
    s.rerender(); changed(D); if (D.playing) restart(s, D);
  }
  function removeExtra(s, D, name) {
    D.pat = GG.songs.removeSection(D.pat, name); D.edited = true;
    s.rerender(); changed(D); if (D.playing) restart(s, D);
  }
  function extraPanel(s, D, name) {
    var def = extraDef(name);
    return el('div.seq-extra', { testid: 'seq-extra-' + name }, [
      el('div.caps', name === 'solo' ? soloWho().pos + ' spotlight' : 'The big finish'), el('div.seq-extra-name', def.name),
      el('p.small.dim', def.blurb),
      el('p.small', name === 'solo' ? (soloWho().you ? 'Goes in before the last chorus. Live, the whole section is your spotlight.' : 'Goes in before the last chorus. Live, you only play ' + (strSeat() ? 'one note a beat' : 'the quarter notes') + ': the rest is ' + soloWho().pos + '.')
        : (strSeat() ? ui.fill('Goes at the very end: the last chord rings out, and {drummer} gets a big fill to finish.') : 'Goes at the very end: the last chord rings out, and you get a big fill to finish.')),
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
  // A working pattern for this seat: a string seat's always carries a part (the seat's suggestion where it is missing; 1.2).
  function withPart(p) {
    if (!p || !GG.songs.part) return p;
    if (!strSeat()) { if (p.part) delete p.part; return p; }
    p.part = p.part && p.part.seat === seat() ? GG.songs.part.sanitize(p.part, GG.songs.sectionsOf(p), genre()) : GG.songs.part.full(genre(), seat(), p);
    return p;
  }
  // D16: a v1 part becomes v2 on its first grid / tweak edit (same sound, same ratings: part.upgrade).
  function partV2(D) {
    var pt = D.pat && D.pat.part;
    if (pt && pt.v !== 2) D.pat.part = GG.songs.part.sanitize(GG.songs.part.upgrade(pt), GG.songs.sectionsOf(D.pat), genre());
    return D.pat.part;
  }
  function drummerName() { return st() && GG.career.tokenValue ? GG.career.tokenValue(st(), 'drummer') : 'the drummer'; }
  function instrument() { return st() && GG.career.tokenValue ? GG.career.tokenValue(st(), 'instrument') : 'drums'; }
  function partLayer(D) { return !!(D.pat && D.pat.part) && D.layer !== 'drums'; }
  function partHas(D, name) { var pv = D.pat && D.pat.part ? GG.songs.part.view(D.pat.part) : null; return !!(pv && pv.sections[name]); }
  function seatPlay(D) { return D.pat && D.pat.part ? { seat: D.pat.part.seat, part: D.pat.part } : {}; }
  function playSeat(D) { return D.pat && D.pat.part ? D.pat.part.seat : seat(); }
  // v2 row colours (rhythm: Chug, Open, Root, 5th, Oct, Scratch; bass + lead get a wider range): >= 7 (C.PART_V2 lead = 7).
  var PART_COLORS = ['#57c77a', '#ff6b4a', '#ffd23f', '#3cd0c0', '#4f8cff', '#b98cff', '#ff8fc7'];
  function tint(hex, a) { var n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* ---- Chords: the song's key, the chips' names -------------------------------------------------------------- */
  function backing() { return GG.songs.genre(genre()).backing || {}; }
  function tonicOf(D) {
    var A = GG.audio;
    try { if (A && A.keyFor) return A.keyFor(songSeed(D), genre(), D.pat.bpm).tonic; } catch (e) { /* fall through */ }
    return backing().root || 40;
  }
  // The four chords a section plays (songs.chordsOf: p.chords > the part's progression > the 1.2 pick), as the audio hears them.
  function effChords(D, name) { return GG.songs.chordsOf(D.pat, name, genre(), { seat: playSeat(D) }); }
  function chordName(D, semi, tonic) { return GG.songs.chordLabel(genre(), D.pat.mood, tonic == null ? tonicOf(D) : tonic, semi); }
  function rungScale(D) {
    var B = backing(), r = GG.songs.moodOf(genre(), D.pat.mood) || (Array.isArray(B.moods) ? B.moods[GG.songs.nativeMood(genre())] : null);
    return (r && r.scale) || B.scale || [0, 2, 3, 5, 7, 8, 10];
  }
  function progLabel(D, name) {
    var sp = playSeat(D);
    return (sp === 'lead' ? 'Hook: ' : 'Chords: ') + GG.songs.progName(genre(), sp, name, D.pat);
  }
  function recipeDef(id) { var r = null; (GG.songs.grooves(genre()).recipes || []).forEach(function (x) { if (x.id === id) r = x; }); return r; }
  // chord-reset: a Quick-song song (p.recipe or p.mood) goes back to its progression at the mood; an old song drops p.chords[tab].
  function resetTarget(D, name) {
    var p = D.pat, pt = p.part, sp = playSeat(D);
    if (p.recipe || p.mood != null) {
      var i = 0, rd;
      if (sp !== 'lead' && pt && pt.sections[name] && isFinite(pt.sections[name].prog)) i = pt.sections[name].prog | 0;
      else if (p.recipe && (rd = recipeDef(p.recipe.id)) && rd.parts && rd.parts.prog && rd.parts.prog[name] != null) i = rd.parts.prog[name] | 0;
      var ch = GG.songs.part.choices(genre(), sp === 'lead' ? 'rhythm' : sp, name);
      return { chords: GG.songs.progChords(genre(), name, i, p.mood), name: ch[Math.min(i, ch.length - 1)] ? ch[Math.min(i, ch.length - 1)].name : 'the start' };
    }
    var q = U.clone(p); if (q.chords) { delete q.chords[name]; if (!Object.keys(q.chords).length) delete q.chords; }
    return { chords: null, name: GG.songs.progName(genre(), sp === 'lead' ? 'rhythm' : sp, name, q) };
  }
  // A tap on your grid plays that note (your instrument's voice; part.rowPitch over the bar's chord, the song's key).
  function partPreview(D, row) {
    var A = GG.audio, sp = playSeat(D); if (!A) return;
    var v = A.TAP_AUTO ? A.TAP_AUTO.other : undefined, tonic = tonicOf(D), semi = chipSec(D.tab) ? effChords(D, D.tab)[0] : 0;
    try {
      if (sp === 'bass' && A.pluck) A.pluck(tonic - 12 + semi + (GG.songs.part.rowPitch(genre(), 'bass', row, { mood: D.pat.mood }) || 0), undefined, { len: 0.4, kind: 'bass', vel: v });
      else if (sp === 'rhythm' && A.strum) {
        var x = GG.songs.part.rowPitch(genre(), 'rhythm', row, { mood: D.pat.mood });
        if (x === 'dead' || row === 0) A.strum(tonic + semi, undefined, { len: 0.15, kind: 'gtr', power: true, mute: true, vel: v });
        else A.strum(tonic + semi + (x || 0), undefined, { len: row === 1 ? 0.6 : 0.35, kind: 'gtr', power: row === 1, vel: v });
      } else if (A.lead) {
        var sc = rungScale(D), hk = leadHook(D), d = GG.songs.part.rowPitch(genre(), 'lead', row, { deg: hk }) | 0, n = sc.length;
        A.lead(tonic + 12 + sc[((d % n) + n) % n] + 12 * Math.floor(d / n), undefined, { len: 0.35, kind: 'lead', vel: v });
      }
    } catch (e) { /* no sound: fine */ }
  }
  function leadHook(D) {
    var B = backing(), pt = D.pat.part, x = pt && pt.sections[D.tab], list = B.hooks && (B.hooks[D.tab] || B.hooks.verse), h = list && x ? list[Math.min(list.length - 1, x.hook | 0)] : null;
    return h && Array.isArray(h.deg) ? h.deg : null;
  }

  /* ---- Who talks ------------------------------------------------------------------------------------------- */
  // v0.9: who takes the solo (gig.roles solo) and who names the songs (band.roles.namer), for the songwriter's copy.
  function soloWho() {
    var id = st() ? ui.roleOf('soloist') : null;
    if (id === 'player') return { id: id, name: 'You', pos: 'Your', verb: 'shred', you: true };   // v1.1: the lead seat's solo is yours
    var n = id ? ui.who(id).short : null, fiddle = id && /fiddle/.test(ui.who(id).role || '');
    return { id: id, name: n || 'The guitarist', pos: n ? n + '’s' : 'The guitarist’s', verb: fiddle ? 'saws away' : 'shreds' };
  }
  function namer() { var id = st() ? ui.roleOf('namer') : null; return id ? ui.who(id).short : 'the band'; }
  function sing() { var s = st(); return s ? { singer: ui.roleOf('front', s), band: s.bandId } : {}; }   // v0.9: who sings
  // One line from whoever fits (role match on the active lineup). v0.9 coach lines per genre (grooves.coach[genre][step]),
  // else the neutral flat grooves.coach[step], else COACH; v1.1 string seats: coach[genre].bySeat[seat][step] and
  // coach.bySeat[seat][step] first, then SEAT_COACH. v1.3: step 'quick' = the Quick song bubble (colon-free lines, §4.3).
  var COACH = {
    verse: [{ role: 'guitar|fiddle', text: 'Start with the kick and the snare. Keep it steady; I will do the fancy stuff.' }, { role: 'vocals', text: 'Give me room to sing. Steady is good. Steady is great.' }],
    chorus: [{ role: 'vocals', text: 'The chorus should hit harder than the verse. A crash on the one. Trust me.' }, { role: 'guitar|fiddle', text: 'Bigger than the verse. More cymbal, more everything.' }],
    bridge: [{ role: 'guitar|fiddle', text: 'The bridge is my spot. Something different, not too busy.' }, { role: 'bass', text: 'Change it up here. Then we come back home.' }],
    tempo: [{ role: 'vocals', text: 'Pick a speed I can sing at. Or at least yell at.' }, { role: 'guitar|fiddle', text: 'Fast is fun. Tight is better.' }],
    order: [{ role: 'vocals', text: 'Verse, chorus, repeat. People like knowing where they are.' }, { role: 'bass', text: 'Short songs get played. Long songs get talked about.' }],
    name: [{ role: 'vocals', text: 'I will name it. You drum it. That is the deal.' }, { role: 'guitar|fiddle', text: 'Let {namer} name it. It is faster than arguing.' }],
    quick: [{ role: 'guitar|fiddle|vocals', text: 'Pick a recipe, push the sliders around and hit Play.' }]
  };
  var SEAT_COACH = {
    verse: [{ role: 'drummer', text: 'Lock in with my kick and we are a band. Wander off and we are two bands.' }, { role: 'vocals', text: 'Leave me some room to sing over {yourPart}.' }],
    chorus: [{ role: 'vocals', text: 'The chorus needs a lift. Make {yourPart} bigger than the verse.' }, { role: 'drummer', text: 'Same chords as the verse? Bold. Wrong, but bold.' }],
    bridge: [{ role: 'drummer', text: 'The bridge is where we get weird. Then we come home.' }]
  };
  function coachFor(D, step) {
    var CO = (GG.content.grooves || {}).coach || {}, g = genre(), mine = CO[g] && !Array.isArray(CO[g]) && typeof CO[g] === 'object' ? CO[g] : {};
    var sp = seat(), bySeat = function (o) { return o && o.bySeat && o.bySeat[sp] ? o.bySeat[sp][step] : null; };
    var seatSets = sp !== 'drums' ? [bySeat(mine), bySeat(CO), SEAT_COACH[step]] : [];
    var sets = seatSets.concat([mine[step], CO[step], COACH[step]]).filter(function (x) { return Array.isArray(x) && x.length; }), state = st();
    var act = ui.talkers(state), dr = sp !== 'drums' && GG.career.drummerId ? GG.career.drummerId(state) : null;
    for (var q = 0; q < sets.length; q++) {
      var lines = sets[q];
      for (var k = 0; k < lines.length; k++) {
        var ln = lines[(k + (D.index || 0)) % lines.length], re = new RegExp(ln.role);
        if (!ui.ownLines([ln.text], state).length || (GG.career.seatOk && !GG.career.seatOk(state, ln))) continue;
        if (ln.role === 'drummer') { if (dr && act.some(function (m) { return m.id === dr; })) return { who: dr, text: ui.fill(ln.text, state) }; continue; }
        for (var j = 0; j < act.length; j++) if (act[j].id !== dr && re.test(GG.career.stageRole ? GG.career.stageRole(state, act[j]) : act[j].role || '')) return { who: act[j].id, text: ui.fill(ln.text, state) };
      }
    }
    var own = sets.length ? ui.ownLines(sets[0], state) : [];
    return own[0] ? { who: null, text: ui.fill(own[0].text, state) } : null;
  }
  function coachStep(D) { return D.screen === 'quick' ? 'quick' : D.tab === 'song' ? 'order' : chipSec(D.tab) ? D.tab : 'bridge'; }

  /* ---- Meter strip + coach bubble ------------------------------------------------------------------------- */
  function meter(label, testid, key) {
    var v = el('b', '0'), fill = el('i'), track = el('span.mt', [fill]), d = el('span.md'), node = el('div.meter', { testid: testid, data: { key: key } }, [el('span.ml', label), track, v, d]);
    node._v = v; node._fill = fill; node._track = track; node._d = d;
    return node;
  }
  function setMeter(D, m, value, color) {
    var key = m.dataset.key, prev = D.mv ? D.mv[key] : null;
    m._v.textContent = String(value); m.dataset.value = String(value);
    m._fill.style.width = U.clamp(value, 0, 100) + '%'; m._fill.style.background = color;
    D.mv = D.mv || {}; D.mv[key] = value;
    if (prev == null || prev === value) return;
    var dv = value - prev, txt = (dv > 0 ? '+' : '−') + Math.abs(dv);
    m.dataset.delta = (dv > 0 ? '+' : '-') + Math.abs(dv); m._d.textContent = txt;
    m.classList.remove('up', 'down'); m.classList.add('flash', key === 'difficulty' ? 'gd' : dv > 0 ? 'up' : 'down');
    clearTimeout(m._t);
    m._t = setTimeout(function () { delete m.dataset.delta; m._d.textContent = ''; m.classList.remove('flash', 'up', 'down', 'gd'); }, 1200);
  }
  function tone(v) { return v >= 70 ? 'var(--good)' : v >= 45 ? 'var(--amber)' : 'var(--bad)'; }
  function meterStrip(D) {
    var V = D.view;
    V.groove = meter('Groove', 'meter-groove', 'groove'); V.hook = meter('Hook', 'meter-hook', 'hook'); V.diff = meter('Diff', 'meter-difficulty', 'difficulty');
    V.ability = el('i.ab'); V.diff._track.appendChild(V.ability);
    return el('div.seq-meters', [V.groove, V.hook, V.diff]);
  }
  function ability() { return st() ? GG.songs.ability(st()) : 100; }
  // What the bubble says: D.hint > the rating's tips > the coach line (Quick: the coach line). { who, lead, text, full: [lines] }
  function bubbleOf(D, r) {
    var c = coachFor(D, coachStep(D)), who = c ? c.who : null;
    if (D.screen === 'quick') return { who: who, text: c ? c.text : 'Pick a recipe, push the sliders around and hit Play.', full: [] };
    if (D.hint) return { who: D.hint.who || who, text: D.hint.text, full: c ? [c.text] : [] };
    r = r || D.rating;
    var extra = c ? [c.text] : [];
    if (!r) return { who: who, text: c ? c.text : '', full: [] };
    if (D.tab === 'solo' && hasSec(D, 'solo') && !partLayer(D)) return { who: who, lead: 'Solo:', text: 'live you only play the beat (the lit rows). The dimmed steps are ' + soloWho().pos + '.', full: extra };
    if (D.tab === 'song') return { who: who, lead: GG.songs.verdict(genre(), r.groove), text: r.notes + ' hits in the whole song.', full: extra };
    var tips = (partLayer(D) && r.part && r.part.tips ? r.part.tips : r.tips).slice();   // v1.1: the part grid shows your part's tips
    if (r.difficulty > ability() + 5) tips.unshift('Harder than the band can play yet: it will start rough.');
    if (!r.notes) return { who: who, text: c ? c.text : 'Tap a cell to add a note, drag to paint.', full: [] };
    if (!tips.length) return { who: who, lead: GG.songs.verdict(genre(), r.groove), text: 'Nothing to fix. Hit play and enjoy it.', full: extra };
    return { who: who, lead: GG.songs.verdict(genre(), r.groove), text: tips.join(' '), full: tips.concat(extra) };
  }
  function coachBubble(s, D) {
    var V = D.view;
    V.av = el('span.sc-av'); V.who = el('b.sc-who'); V.tip = el('span.seq-tip', { testid: 'seq-tip' });
    V.coach = btn('.seq-coach', { testid: 'seq-coach', 'aria-label': 'The full tip', onclick: function () { ui.show('seq-tip-full', { owner: s }); } },
      [V.av, el('span.sc-line', [V.who, V.tip]), el('span.sc-more', '›')]);
    return V.coach;
  }
  function paintBubble(D, r) {
    var V = D.view; if (!V || !V.tip) return;
    var b = D.bubble = bubbleOf(D, r), w = b.who ? ui.who(b.who) : null;
    ui.clear(V.av); V.av.appendChild(w ? ui.avatar(w, 'sm') : el('span.avatar.sm.sc-none', '♪'));
    V.who.textContent = w ? w.short : '';
    ui.clear(V.tip); ui.append(V.tip, [b.lead ? el('b.amber', b.lead + ' ') : null, b.text]);
  }
  // Re-rates the working pattern and refreshes the strip + the bubble instantly (no re-render).
  function rerate(D) {
    var r = GG.songs.rate(D.pat, genre(), gear()), V = D.view, ab = ability();
    D.rating = r;
    if (!V || !V.groove) return r;
    setMeter(D, V.groove, r.groove, tone(r.groove));
    setMeter(D, V.hook, r.hook, tone(r.hook));
    setMeter(D, V.diff, r.difficulty, r.difficulty > ab ? 'var(--bad)' : 'var(--blue)');
    V.ability.style.left = U.clamp(ab, 0, 99) + '%';
    paintBubble(D, r);
    return r;
  }
  // Every edit: re-rate, keep playback in sync, keep the sketch pad saved.
  function changed(D) {
    rerate(D);
    if (D.handle && D.handle.playing) D.handle = D.handle.update(D.pat) || D.handle;
    if (D.mode === 'sketch' && st()) st().draft = U.clone(D.pat);
  }
  // A hand edit (grid, chips, picker, tweaks, Beat, copy / clear, arrangement): Q3 asks before a recompose drops it.
  function handEdit(D) { D.edited = true; D.hint = null; }

  /* ---- The grids ------------------------------------------------------------------------------------------- */
  function stepLabel(step) { var q = step % 4 === 0; return el('div.bl' + (q ? '.q' : ''), q ? String(step / 4 + 1) : BEAT_LABELS[step % 4]); }
  function fillOn(D) { return !!(D.fill && chipSec(D.tab) && D.pat.fillBars && D.pat.fillBars[D.tab]); }
  function buildGrid(s, D) {
    var fill = fillOn(D), sec = fill ? D.pat.fillBars[D.tab] : D.pat.sections[D.tab], lanes = D.pat.lanes, ro = D.mode === 'view', solo = D.tab === 'solo';
    var grid = el('div.seq-grid' + (ro ? '.ro' : '') + (lanes > 4 ? '.wide' : '') + (solo ? '.solo' : '') + (fill ? '.fill' : '') + (strSeat() ? '.tight' : ''),
      { testid: 'seq-grid', data: { lanes: String(lanes), fill: fill ? '1' : '0' }, style: { gridTemplateColumns: '24px repeat(' + lanes + ', minmax(0, 1fr))' } });
    grid.appendChild(el('div.gc', fill ? 'B4' : ''));
    for (var l = 0; l < lanes; l++) {
      var L = ui.LANES[C.LANES[l]];
      grid.appendChild(el('div.lh', { style: { color: L.color, background: tint(L.color, 0.13) } }, [el('span', L.icon), el('span.ln', L.name)]));
    }
    var cells = [], labels = [];
    for (var step = 0; step < C.STEPS; step++) {
      var lab = stepLabel(step); grid.appendChild(lab); labels.push(lab);
      var row = [];
      for (l = 0; l < lanes; l++) {
        var hit = GG.songs.isHit(sec[l], step), name = C.LANES[l];
        var c = el('div.cell' + (step % 4 === 0 ? '.sh' : '') + (hit ? '.on' : '') + (solo && step % 4 ? '.soff' : ''),   // v0.8: a solo charts the beat only
          { testid: 'cell-' + name + '-' + step, data: { l: l, s: step } });
        c.style.setProperty('--lc', ui.LANES[name].color);
        grid.appendChild(c); row.push(c);
      }
      cells.push(row);
    }
    D.view.cells = cells; D.view.labels = labels;
    if (!ro) paintable(grid, D, false);
    return grid;
  }
  // Your part's grid: the v2 rows (part.view: a v1 part shows its upgrade and is never written until you edit it).
  function buildPartGrid(s, D) {
    var pv = GG.songs.part.view(D.pat.part), sec = pv.sections[D.tab], n = sec.rows.length, ro = D.mode === 'view', names = GG.songs.part.rowNames(pv);
    var grid = el('div.seq-grid.part' + (ro ? '.ro' : ''), { testid: 'part-grid', data: { lanes: String(n), seat: pv.seat, v: String(D.pat.part.v === 2 ? 2 : 1) },
      style: { gridTemplateColumns: '24px repeat(' + n + ', minmax(0, 1fr))' } });
    grid.appendChild(el('div.gc'));
    for (var r = 0; r < n; r++) grid.appendChild(el('div.lh', { style: { color: PART_COLORS[r], background: tint(PART_COLORS[r], 0.13) } }, [el('span.ln', names[r] || String(r + 1))]));
    var cells = [], labels = [];
    for (var step = 0; step < C.STEPS; step++) {
      var lab = stepLabel(step); grid.appendChild(lab); labels.push(lab);
      var row = [];
      for (r = 0; r < n; r++) {
        var c = el('div.cell' + (step % 4 === 0 ? '.sh' : '') + (GG.songs.isHit(sec.rows[r], step) ? '.on' : ''), { testid: 'part-cell-' + r + '-' + step, data: { l: r, s: step } });
        c.style.setProperty('--lc', PART_COLORS[r]);
        grid.appendChild(c); row.push(c);
      }
      cells.push(row);
    }
    D.view.cells = cells; D.view.labels = labels;
    if (!ro) paintable(grid, D, true);
    return grid;
  }
  // Tap toggles; dragging paints the same value (on or off) across every cell the finger crosses.
  function paintable(grid, D, isPart) {
    var paint = null;
    function cellOf(node) { return node && node.classList && node.classList.contains('cell') ? node : null; }
    function rowsOf() { return isPart ? D.pat.part.sections[D.tab].rows : fillOn(D) ? D.pat.fillBars[D.tab] : D.pat.sections[D.tab]; }
    function apply(c) {
      if (isPart) {   // v1.1: your part's grid (rows, no kick rule)
        var pr = +c.dataset.l, ps = +c.dataset.s, rows = rowsOf();
        if (GG.songs.isHit(rows[pr], ps) === paint.value) return;
        rows[pr] = GG.songs.setHit(rows[pr], ps, paint.value);
        c.classList.toggle('on', paint.value);
        if (paint.value && !(D.handle && D.handle.playing)) partPreview(D, pr);
        handEdit(D); changed(D);
        return;
      }
      var l = +c.dataset.l, step = +c.dataset.s, sec = rowsOf(), cur = GG.songs.isHit(sec[l], step);
      if (cur === paint.value) return;
      if (paint.value && l === 0 && GG.songs.kickBlocked(sec[0], step, gear())) {
        c.classList.remove('nope'); void c.offsetWidth; c.classList.add('nope');   // restart the flash
        D.hint = { text: KICK_HINT }; rerate(D); D.hint = null;
        return;
      }
      sec[l] = GG.songs.setHit(sec[l], step, paint.value);
      c.classList.toggle('on', paint.value);
      if (paint.value && !(D.handle && D.handle.playing) && GG.audio && GG.audio.hit) GG.audio.hit(C.LANES[l], undefined, GG.audio.TAP_AUTO ? { vel: GG.audio.TAP_AUTO.other } : undefined);   // (v1.2: the kit Play plays)
      handEdit(D); changed(D);
    }
    grid.addEventListener('pointerdown', function (e) {
      var c = cellOf(e.target); if (!c) return;
      e.preventDefault();
      if (isPart) partV2(D);   // D16: the first edit upgrades a v1 part
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
  // Playhead: the grid's row + the current bar's chip.
  function playhead(D, ev) {
    var V = D.view; if (!V) return;
    if (V.cells && V.ph != null && V.labels[V.ph]) { V.labels[V.ph].classList.remove('ph'); V.cells[V.ph].forEach(function (c) { c.classList.remove('ph'); }); }
    V.ph = null;
    if (V.chips) V.chips.forEach(function (b) { b.classList.remove('ph'); });
    if (!ev || ev.section !== D.tab) return;
    if (V.cells && V.labels[ev.step]) { V.ph = ev.step; V.labels[ev.step].classList.add('ph'); V.cells[ev.step].forEach(function (c) { c.classList.add('ph'); }); }
    if (V.chips && V.chips[ev.bar]) V.chips[ev.bar].classList.add('ph');
  }

  /* ---- Your part | Drums, the progression / hook picker, the chord chips -------------------------------------- */
  function toggleRow(s, D) {
    var on = partLayer(D), ro = D.mode === 'view';
    var seg = el('div.seq-layers', { testid: 'seq-layers', role: 'tablist' }, [
      btn('.seg' + (on ? '.on' : ''), { testid: 'seq-layer-part', role: 'tab', 'aria-pressed': on ? 'true' : 'false', onclick: function () { if (on) return; D.layer = 'part'; D.fill = false; s.rerender(); } }, 'Your part'),
      btn('.seg' + (on ? '' : '.on'), { testid: 'seq-layer-drums', role: 'tab', 'aria-pressed': on ? 'false' : 'true', title: drummerName() + ' plays these', onclick: function () { if (!on) return; D.layer = 'drums'; s.rerender(); } }, 'Drums')]);
    var pick = on ? btn('.seq-chords', { testid: 'seq-chords', disabled: ro, onclick: function () { ui.show('seq-pick', { owner: s }); } },
      [el('span.sc-k', progLabel(D, D.tab).replace(/:.*/, ':')), el('b', progLabel(D, D.tab).replace(/^[^:]*: /, '')), el('span.sc-dn', '▾')]) : null;
    return el('div.seq-toggle', [seg, pick]);
  }
  function chipsRow(s, D) {
    var ch = effChords(D, D.tab), tonic = tonicOf(D), ro = D.mode === 'view';
    D.view.chips = ch.map(function (semi, i) {
      return btn('.seq-chip' + (semi === 0 ? '.home' : ''), { testid: 'chord-chip-' + i, disabled: ro, data: { semi: String(semi), home: semi === 0 ? '1' : '0', locked: ro ? '1' : '0' },
        'aria-label': 'Bar ' + (i + 1) + ': ' + chordName(D, semi, tonic), onclick: function () { ui.show('seq-chord', { owner: s, bar: i }); } },
        [el('span.cb', 'Bar ' + (i + 1)), el('b', chordName(D, semi, tonic))]);
    });
    return el('div.seq-chips', { testid: 'seq-chips' }, D.view.chips);
  }
  // Picker write rules (§4.7): bass / rhythm with p.chords[tab] -> p.chords[tab] = progChords(i) + part.prog = i; without (an old
  // song) -> part.pick only (1.2 JSON until a chip edit). Lead: part.hook only.
  ui.define('seq-pick', {
    kind: 'sheet', title: function (d) { var D = d.owner && d.owner.data; return D && playSeat(D) === 'lead' ? 'The hook' : 'The chords'; },
    build: function (s, d) {
      var owner = d.owner, D = owner && owner.data; if (!D || !D.pat.part) return;
      var sp = playSeat(D), key = GG.songs.part.key(sp), name = D.tab, pt = D.pat.part, cur = pt.sections[name] ? pt.sections[name][key] : -1;
      var label = GG.songs.progName(genre(), sp, name, D.pat);
      s.setTitle(sp === 'lead' ? 'Hook for the ' + name : 'Chords for the ' + name, SEC_LABEL[name]);
      s.body.appendChild(el('div.seq-picks', { testid: 'part-picks' }, GG.songs.part.choices(genre(), sp, name).map(function (c) {
        var on = sp === 'lead' ? c.i === cur : c.name === label;
        return btn('.seq-pickrow' + (on ? '.on' : ''), { testid: 'part-pick-' + c.i, 'aria-pressed': on ? 'true' : 'false', onclick: function () {
          var withChords = sp !== 'lead' && chipSec(name) && D.pat.chords && D.pat.chords[name];
          D.pat = GG.songs.part.pick(D.pat, name, c.i, gear(), genre());
          if (withChords) { D.pat.chords[name] = GG.songs.progChords(genre(), name, c.i, D.pat.mood); D.pat = GG.songs.sanitize(D.pat, gear(), genre()); }
          handEdit(D); ui.close(s.id); owner.rerender(); changed(D);
        } }, [el('b', c.name), on ? el('span.tag.amber', 'now') : null]);
      })));
    }
  });
  // The chord sheet: the mood rung's chord roots (+ the bar's own chord) and "Back to <progression>".
  ui.define('seq-chord', {
    kind: 'sheet',
    build: function (s, d) {
      var owner = d.owner, D = owner && owner.data, bar = d.bar | 0; if (!D) return;
      var name = D.tab, ch = effChords(D, name), tonic = tonicOf(D), opts = rungScale(D).slice();
      if (opts.indexOf(ch[bar]) < 0) opts.push(ch[bar]);
      opts.sort(function (a, b) { return a - b; });
      s.setTitle('Bar ' + (bar + 1) + ' chord', SEC_LABEL[name]);
      function write(fn) { handEdit(D); fn(); D.pat = GG.songs.sanitize(D.pat, gear(), genre()); ui.close(s.id); owner.rerender(); changed(D); }
      s.body.appendChild(el('div.seq-chordopts', opts.map(function (semi) {
        return btn('.seq-chordopt' + (semi === ch[bar] ? '.on' : '') + (semi === 0 ? '.home' : ''), { testid: 'chord-opt-' + semi, 'aria-pressed': semi === ch[bar] ? 'true' : 'false', onclick: function () {
          if (semi === ch[bar]) { ui.close(s.id); return; }
          write(function () {
            var cur = effChords(D, name).slice(); cur[bar] = semi;
            D.pat.chords = D.pat.chords || {}; D.pat.chords[name] = cur;
          });
        } }, [el('b', chordName(D, semi, tonic)), semi === 0 ? el('span.tiny', 'home') : null]);
      })));
      var rt = resetTarget(D, name);
      s.foot.appendChild(btn('.btn.ghost.block', { testid: 'chord-reset', onclick: function () {
        write(function () {
          if (rt.chords) { D.pat.chords = D.pat.chords || {}; D.pat.chords[name] = rt.chords.slice(); }
          else if (D.pat.chords) { delete D.pat.chords[name]; if (!Object.keys(D.pat.chords).length) delete D.pat.chords; }
        });
      } }, 'Back to ' + rt.name));
    }
  });

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
        p.arrangement = a.slice(); handEdit(D); changed(D); if (D.playing === 'song') restart(s, D); s.rerender();
      } }, [el('b', ARR_NAMES[id]), el('span.seqs', a.map(function (x) { return x.charAt(0).toUpperCase(); }).join(' ')),
        el('span.small.dim', { data: { secs: id } }, '~' + Math.round(GG.songs.seconds({ bpm: p.bpm, arrangement: a })) + ' s')]);
    }));
    var extras = ro ? [] : GG.songs.allSections(gear()).filter(isExtra);
    var r = D.rating || rerate(D);
    return el('div.seq-song', [
      el('div.ss-row', [el('div.caps', 'Title'), ro ? el('div', { style: 'font-weight:800;font-style:italic' }, D.title)
        : el('div.row', [
          el('input.seq-name', { testid: 'seq-title-input', maxLength: 40, value: D.custom ? D.title : '', placeholder: 'Type your own, or let ' + namer(),
            oninput: function (e) { var v = e.target.value.trim(); if (v) { D.title = v; D.titleEn = v; D.custom = true; } else { D.custom = false; reroll(D); } head(s, D); } }),
          btn('.btn.small', { testid: 'btn-seq-reroll', 'aria-label': 'New title from ' + namer(), onclick: function () { D.custom = false; reroll(D); s.rerender(); } }, '🎲')
        ]), D.titleEn && D.titleEn !== D.title ? el('div.small.dim', '“' + D.titleEn + '” (nobody knows yet)') : null]),
      el('div.ss-row', [el('div.row', [el('span.caps.grow', 'Tempo'), el('span', [bpmLabel, styleLabel])]), tempo,
        el('div.row.tiny.faint', [el('span.grow', G.tempo[0]), el('span', G.tempo[1])])]),
      el('div.ss-row', [el('div.caps', 'Arrangement (each part plays ' + C.BARS_PER_SECTION + ' bars)'), arrRow]),
      extras.length ? el('div.ss-row', extras.map(function (name) {   // v0.8: owned extras, in or out of this song
        var on = hasSec(D, name), def = extraDef(name);
        return el('div.row.ss-extra', { testid: 'seq-song-extra-' + name }, [el('div.grow', [el('b', def.name + (on ? ' ✓' : '')), el('div.tiny.dim', on ? (name === 'solo' ? 'Before the last chorus' : 'At the very end') : def.blurb)]),
          btn('.btn.small' + (on ? '' : '.primary'), { testid: 'seq-song-' + (on ? 'remove-' : 'add-') + name, onclick: function () { if (on) removeExtra(s, D, name); else addExtra(s, D, name); } }, on ? 'Take out' : 'Add')]);
      })) : null,
      el('div.ss-row.small', { testid: 'seq-sections' }, ['Groove by part: '].concat(GG.songs.sectionsOf(p).map(function (n, i) {
        return [i ? ' · ' : '', el('b', SEC_LABEL[n] + ' ' + (r.sections[n] != null ? r.sections[n] : '–'))];
      })).concat([el('div.tiny.faint', { style: 'margin-top:4px' }, r.notes + ' hits in the whole song.')]))
    ]);
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
  // D14: the compose seed (the career seed + the song slot), stored in p.recipe.seed.
  function composeSeed(D) { return GG.hashSeed(String(st() && st().seed != null ? st().seed : 0) + '|' + songSeed(D)); }
  // Metronome toggle (settings.metronome via GG.audio; the settings screen mirrors it).
  function metroOn() { try { return !!(GG.audio && GG.audio.metronome && GG.audio.metronome()); } catch (e) { return false; } }
  function metroButton() {
    var state = el('span.tm-v'), b = btn('.seq-menu-row', { testid: 'btn-seq-metro', 'aria-label': 'Metronome click', onclick: function () {
      var on = GG.audio && GG.audio.toggleMetronome ? GG.audio.toggleMetronome() : false;
      paintMetro(b, on);
      ui.toast(on ? countIn() : 'Click off. Feel it.');
    } }, [el('span.tm-i', '♩'), el('span.grow', 'Metronome click'), state]);
    b._state = state;
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
    if (b._state) b._state.textContent = on ? 'On' : 'Off';
  }
  function startPlay(s, D, kind) {
    var section = kind === 'loop' ? (D.tab === 'song' || !hasSec(D, D.tab) ? 'verse' : D.tab) : null;
    var h = GG.audio && GG.audio.play ? GG.audio.play(D.pat, Object.assign({ genre: genre(), section: section, loop: kind !== 'song', songId: songSeed(D), metronome: true }, sing(), seatPlay(D))) : null;   // v1.1: + your part
    if (!h) { ui.toast("No sound on this device. Imagine it. It's loud."); return; }
    D.handle = h; D.playing = kind;
    playButtons(D);
  }
  function restart(s, D) { var k = D.playing; if (k) startPlay(s, D, k); }
  function toggle(s, D, kind) { if (D.playing === kind) stopPlay(D); else startPlay(s, D, kind); }
  function playButtons(D) {
    var V = D.view; if (!V) return;
    if (V.play) { V.play.textContent = D.playing ? '■ Stop' : '▶ Play'; V.play.classList.toggle('on', !!D.playing); return; }
    if (!V.loop) return;
    V.loop.textContent = D.playing === 'loop' ? '■ Stop' : '▶ Loop';
    V.song.textContent = D.playing === 'song' ? '■ Stop' : '▶ Song';
    V.loop.classList.toggle('on', D.playing === 'loop'); V.song.classList.toggle('on', D.playing === 'song');
  }
  // After a compose: warm the new pitches (KS) once the sliders rest (C.QUICK.warmMs), so the first preview isn't the oscillator.
  function warmSoon(D) {
    clearTimeout(D.warmT);
    if (!GG.audio || !GG.audio.warm) return;
    D.warmT = setTimeout(function () { try { GG.audio.warm(D.pat, Object.assign({ genre: genre(), songId: songSeed(D) }, seatPlay(D))); } catch (e) { /* fine */ } }, (C.QUICK && C.QUICK.warmMs) || 400);
  }

  /* ---- Quick song (U1) ------------------------------------------------------------------------------------- */
  var SLIDER_TID = { energy: 'energy', mood: 'mood', swing: 'feel', fills: 'fills', tempo: 'tempo' };
  var SLIDER_COLOR = { energy: 'var(--amber)', mood: 'var(--purple)', swing: '#3cd0c0', fills: '#ff6b4a', tempo: 'var(--blue)' };
  function recipesNow() { return GG.songs.recipes(genre(), gear(), seat()); }
  // The sliders' settings for this pattern (its recipe provenance, else the genre's signature recipe at the song's own tempo).
  function qsOf(D) {
    var p = D.pat || {}, rec = p.recipe, list = recipesNow(), r = null;
    if (rec) list.forEach(function (x) { if (x.id === rec.id) r = x; });
    r = r || list[0];
    return { recipe: r.id, energy: rec ? rec.energy : r.sliders.energy, fills: rec ? rec.fills : r.sliders.fills,
      mood: p.mood != null ? p.mood : rec ? r.sliders.mood : GG.songs.nativeMood(genre()), swing: p.swing != null ? p.swing : rec ? r.sliders.swing : 0,
      bpm: p.bpm || r.bpm, seed: rec ? rec.seed : composeSeed(D) };
  }
  function composeNow(D) {
    var q = D.qs, t0 = (typeof performance !== 'undefined' ? performance : Date).now();
    var p = GG.songs.compose(genre(), { recipe: q.recipe, energy: q.energy, mood: q.mood, swing: q.swing, fills: q.fills, bpm: q.bpm, seed: q.seed, gear: gear(), seat: seat() });
    D.compose = { ms: Math.round(((typeof performance !== 'undefined' ? performance : Date).now() - t0) * 10) / 10, k: (C.QUICK && C.QUICK.k) || 8 };
    if (p.recipe) q.recipe = p.recipe.id;   // a locked / unknown recipe fell back to the signature one
    return p;
  }
  // D.edited at quick entry (§4.7): no p.recipe, or compose(p's settings) differs from the pattern.
  function editedNow(D) {
    if (!D.pat || !D.pat.recipe) return true;
    try { return JSON.stringify(composeNow(D)) !== JSON.stringify(GG.songs.sanitize(D.pat, gear(), genre())); } catch (e) { return true; }
  }
  function freshQuick(D) {
    var r = recipesNow()[0];
    D.qs = { recipe: r.id, energy: r.sliders.energy, mood: r.sliders.mood, swing: r.sliders.swing, fills: r.sliders.fills, bpm: r.bpm, seed: composeSeed(D) };
    D.pat = composeNow(D); D.edited = false; D.taps = 0;
  }
  function enterQuick(D) {
    D.qs = qsOf(D); D.taps = D.taps || 0;
    if (D.edited == null) D.edited = editedNow(D);
    D.screen = 'quick';
  }
  // Q3: after hand edits a recipe / Energy / Mood / Fills change asks first; yes -> fn(), no -> undo().
  function askFirst(D, fn, undo) {
    if (!D.edited) { fn(); return; }
    ui.confirm({ title: 'Start over from this recipe?', text: 'Your hand edits go.', yes: 'Start over', no: 'Keep my edits', danger: true })
      .then(function (ok) { if (ok) fn(); else if (undo) undo(); });
  }
  function recompose(s, D, rerender) {
    var keep = D.view && D.view.qmain ? D.view.qmain.scrollTop : 0;
    D.pat = composeNow(D); D.partReady = true; D.edited = false;
    if (rerender) { s.rerender(); if (D.view && D.view.qmain) D.view.qmain.scrollTop = keep; }
    changed(D); warmSoon(D);
  }
  function sliderLabel(sd, v) {
    if (sd.id === 'tempo') return v + ' bpm · ' + GG.songs.tempoLabel(genre(), v);
    return (sd.stops && sd.stops[v]) || String(v);
  }
  function quickSlider(s, D, sd) {
    var key = sd.id === 'tempo' ? 'bpm' : sd.id, tid = 'quick-' + SLIDER_TID[sd.id], tempo = sd.id === 'tempo';
    var min = tempo ? sd.min : 0, max = tempo ? sd.max : 4, cur = U.clamp(D.qs[key], min, max);
    var val = el('em', { testid: tid + '-val' }, sliderLabel(sd, cur));
    var input = el('input.qs-range', { type: 'range', testid: tid, min: min, max: max, step: tempo ? 5 : 1, value: cur, 'aria-label': sd.name, disabled: D.mode === 'view' });
    input.style.setProperty('--c', SLIDER_COLOR[sd.id]);
    function pct() { input.style.setProperty('--p', ((+input.value - min) / Math.max(1, max - min) * 100).toFixed(1) + '%'); }
    pct();
    function commit(fromIdle) {
      var v = +input.value;
      if (v === D.qs[key]) return;
      if (key === 'swing' || key === 'bpm') {   // Feel + Tempo never rewrite notes, never ask (D15, Q3)
        D.qs[key] = v; D.pat[key] = v; changed(D);
        return;
      }
      if (fromIdle && D.edited) return;   // ask on release only
      askFirst(D, function () { D.qs[key] = v; recompose(s, D, false); },
        function () { input.value = D.qs[key]; val.textContent = sliderLabel(sd, D.qs[key]); pct(); });
    }
    input.addEventListener('input', function () {
      val.textContent = sliderLabel(sd, +input.value); pct();
      clearTimeout(D.qT); D.qT = setTimeout(function () { commit(true); }, (C.QUICK && C.QUICK.debounceMs) || 150);
    });
    input.addEventListener('change', function () { clearTimeout(D.qT); commit(false); });
    return el('div.qs', { data: { id: sd.id } }, [el('div.qs-top', [el('b', sd.name), val]), input, el('div.qs-ends', [el('span', sd.lo), el('span', sd.hi)])]);
  }
  function recipeCard(s, D, r) {
    var on = !r.surprise && D.qs.recipe === r.id;
    return btn('.qr' + (on ? '.on' : '') + (r.locked ? '.locked' : ''), { testid: 'quick-recipe-' + r.id, 'aria-pressed': on ? 'true' : 'false', data: { locked: r.locked ? '1' : '0' },
      disabled: D.mode === 'view', onclick: function () {
        if (r.locked) { ui.toast('🔒 Needs the ' + (r.lockLabel || 'double-kick pedal') + '.'); return; }
        var x;
        if (r.surprise) {
          D.taps = (D.taps || 0) + 1;
          var z = GG.songs.surprise(genre(), gear(), seat(), GG.hashSeed(D.qs.seed + '|surprise|' + D.taps));
          x = { recipe: z.recipe, energy: z.energy, mood: z.mood, swing: z.swing, fills: z.fills, bpm: z.bpm };
        } else x = { recipe: r.id, energy: r.sliders.energy, mood: r.sliders.mood, swing: r.sliders.swing, fills: r.sliders.fills, bpm: r.bpm };
        askFirst(D, function () { Object.assign(D.qs, x); recompose(s, D, true); }, r.surprise ? function () { D.taps--; } : null);
      } }, [el('b', r.name), el('span', r.locked ? [r.desc + ' ', el('span.qr-lock', '🔒 ' + (r.lockLabel || 'Double kick'))] : r.desc)]);
  }
  function buildQuick(s, D) {
    var V = D.view = {}, ro = D.mode === 'view';
    ui.append(s.body, [header(s, D), meterStrip(D), coachBubble(s, D),
      V.qmain = el('div.quick-main', { testid: 'quick-main' }, [
        el('div.qs-title', 'Start from a recipe'),
        el('div.quick-recipes', { testid: 'quick-recipes' }, recipesNow().map(function (r) { return recipeCard(s, D, r); })),
        el('div.quick-sliders', GG.songs.sliders(genre(), seat()).map(function (sd) { return quickSlider(s, D, sd); }))])]);
    V.play = btn('.btn', { testid: 'btn-guide-play', onclick: function () { toggle(s, D, 'quick'); } });
    var tweak = btn('.btn.ghost', { testid: 'btn-quick-tweak', onclick: function () {
      stopPlay(D); D.screen = 'edit'; D.tab = 'verse'; D.layer = null; D.fill = false;
      if (D.editHint) { D.hint = D.editHint; D.editHint = null; }   // the first Write's grid tip shows once, when the editor opens
      s.rerender();
    } }, 'Tweak ✎');
    ui.append(s.foot, [V.play, ro ? null : tweak, doneButton(s, D)]);
    head(s, D); rerate(D); playButtons(D);
  }

  /* ---- Screen ---------------------------------------------------------------------------------------------- */
  function header(s, D) {
    var V = D.view, ro = D.mode === 'view', quick = D.screen === 'quick';
    V.title = btn('.seq-title', { testid: 'seq-title', disabled: ro || quick, onclick: function () { if (!ro && !quick && !D.custom) { reroll(D); head(s, D); } } });
    return el('div.seq-head', [btn('.icon-btn', { testid: 'btn-seq-close', 'aria-label': D.mode === 'write' ? 'Back to the planner' : 'Close', onclick: function () {
      stopPlay(D); if (D.onCancel) D.onCancel(); ui.close(s.id);
    } }, '✕'), V.title, btn('.icon-btn', { testid: 'btn-seq-tools', 'aria-label': 'More', onclick: function () { ui.show('seq-tools', { owner: s }); } }, '⋯')]);
  }
  function head(s, D) {
    var V = D.view; if (!V || !V.title) return;
    ui.clear(V.title);
    ui.append(V.title, [el('div.caps', D.sub || ''), el('div.fr', D.screen === 'quick' ? 'Quick song' : D.title || 'Untitled')]);   // (the English title: the Song tab)
    V.title.title = D.titleEn && D.titleEn !== D.title ? D.titleEn : '';
  }
  function subFor(D) {
    var who = ui.SEAT_NAME[seat()] || 'Drums';
    if (D.mode === 'write') return 'Write block ' + (D.index + 1) + ' of ' + D.total + (D.fromSketch ? ' · from your sketch pad' : ' · ' + who);
    if (D.mode === 'sketch') return 'Sketch pad · ' + who;
    var s = D.song || {};
    return (s.auto ? 'Band jam' : 'Your song') + (s.written ? ' · week ' + s.written : ' · came with the band') + (s.classic ? ' · classic' : s.stale >= 50 ? ' · going stale' : '');
  }
  function doneButton(s, D) {
    return D.mode === 'write' ? btn('.btn.primary', { testid: 'btn-seq-save', onclick: function () { save(s, D); } }, 'Save ✓')
      : D.mode === 'sketch' ? btn('.btn.primary', { testid: 'btn-seq-use', onclick: function () { useSketch(s, D); } }, 'Use in next Write')
      : null;
  }
  function save(s, D) {
    if (D.done) return;
    var r = rerate(D);
    if (!r.notes) { ui.toast('Nothing to save yet. Tap some hits in, or let the band jam one.'); return; }
    D.done = true; stopPlay(D); clearTimeout(D.qT); clearTimeout(D.warmT);
    var entry = GG.songs.sanitize(D.pat, gear(), genre());
    entry.title = D.title; entry.titleEn = D.titleEn || D.title;
    if (GG.songs.isFrench && GG.songs.isFrench(entry.title)) entry.fr = true;   // v0.7.2: Marcel's French one stays French on load
    if (D.onSave) D.onSave(entry);
  }
  function buildEdit(s, D) {
    var ro = D.mode === 'view', V = D.view = {};
    if (D.tab !== 'song' && !tabsFor(D).some(function (t) { return t.id === D.tab; })) D.tab = 'verse';
    var present = D.tab === 'song' || hasSec(D, D.tab), sec = D.tab !== 'song' && present, layer = sec && partLayer(D) && partHas(D, D.tab);
    if (!sec || layer || !chipSec(D.tab)) D.fill = false;
    var main = el('div.seq-main', D.tab === 'song' ? songPanel(s, D) : layer ? buildPartGrid(s, D) : present ? buildGrid(s, D) : extraPanel(s, D, D.tab));
    var tabs = ui.tabs(tabsFor(D), D.tab, function (id) {
      D.tab = id; D.fill = false; s.rerender();
      if (D.playing === 'loop' && id !== 'song') startPlay(s, D, 'loop'); else playButtons(D);
    }, 'seq-tab-');
    if (D.pat.fillBars) tabs.querySelectorAll('.tab').forEach(function (t) {   // Q2: a section with a bar 4 fill wears a small badge
      var id = String(t.dataset.testid).replace('seq-tab-', '');
      if (D.pat.fillBars[id]) t.appendChild(el('i.seq-fb', { title: 'Bar 4 fill', 'aria-label': 'with a bar 4 fill' }));
    });
    ui.append(s.body, [
      header(s, D),
      el('div.seq-tabs' + (tabsFor(D).length > 4 ? '.many' : ''), [tabs]),
      meterStrip(D),
      coachBubble(s, D),
      sec && D.pat.part ? toggleRow(s, D) : null,   // v1.1 "Your part | Drums" (+ v1.3 "Chords: <name> ▾")
      layer && chipSec(D.tab) ? chipsRow(s, D) : null,   // v1.3: 4 chord chips (never on Solo / Outro: D7)
      main
    ]);
    V.loop = btn('.btn', { testid: 'btn-seq-loop', onclick: function () { toggle(s, D, 'loop'); } });
    V.song = btn('.btn', { testid: 'btn-seq-song', onclick: function () { toggle(s, D, 'song'); } });
    ui.append(s.foot, [V.loop, V.song, doneButton(s, D)]);
    head(s, D); rerate(D); playButtons(D);
  }

  ui.define('seq', {
    kind: 'full', cls: 'seq',
    build: function (s, D) {
      if (D.mode === 'view') D.screen = 'edit';
      if (!D.screen) D.screen = D.pat ? 'edit' : 'quick';
      if (!D.pat) freshQuick(D);
      if (D.mode !== 'view' && !D.partReady) { withPart(D.pat); D.partReady = true; }   // v1.1: a string seat writes its part
      D.tab = D.tab || 'verse';
      if (!D.title && D.mode !== 'view') reroll(D);
      D.sub = subFor(D);
      if (D.screen === 'quick') { if (!D.qs) enterQuick(D); buildQuick(s, D); return; }
      if (D.fromSketch && D.editHint) { D.hint = D.editHint; D.editHint = null; }
      buildEdit(s, D);
    },
    // Listeners live on the screen entry (s), not its data: composeWeek swaps the data for each Write block.
    onShow: function (s) {
      s.off = [
        GG.on('audio:step', function (ev) { var D = s.data; if (D.handle && D.handle.playing) playhead(D, ev); }),
        GG.on('audio:end', function (ev) { var D = s.data; if (ev && ev.handle === D.handle) { D.handle = null; D.playing = null; playhead(D, null); playButtons(D); } })
      ];
    },
    onClose: function (s) {
      stopPlay(s.data); clearTimeout(s.data.qT); clearTimeout(s.data.warmT);
      (s.off || []).forEach(function (off) { off(); });
    }
  });

  /* ---- The full tip (tap the bubble) ------------------------------------------------------------------------ */
  ui.define('seq-tip-full', {
    kind: 'modal',
    build: function (s, d) {
      var D = d.owner && d.owner.data, b = D && (D.bubble || bubbleOf(D)); if (!b) return;
      var w = b.who ? ui.who(b.who) : null;
      s.setTitle(w ? w.short : 'Tip');
      s.body.appendChild(el('div.seq-tipfull', { testid: 'seq-tip-full' }, [w ? ui.avatar(w) : null,
        el('div.stack.tight', [el('p', [b.lead ? el('b.amber', b.lead + ' ') : null, b.full && b.full.length > 1 && !D.hint ? b.full[0] : b.text])]
          .concat((b.full || []).slice(b.full && b.full.length > 1 && !D.hint ? 1 : 0).filter(function (t) { return t !== b.text; }).map(function (t) { return el('p.small.dim', t); })))]));
      s.foot.appendChild(btn('.btn.primary', { testid: 'btn-seq-tip-ok', onclick: function () { ui.close(s.id); } }, 'Got it'));
    }
  });

  /* ---- ⋯ menu (U3): the band, the click, Quick song, the shop; this section's tools; your part's tweaks ------- */
  ui.define('seq-tools', {
    kind: 'modal', cls: 'seq-menu', title: 'More',
    build: function (s, d) {
      var owner = d.owner, D = owner && owner.data; if (!D) return;
      if (s.body.parentNode) s.body.parentNode.classList.add('seq-menu');
      var ro = D.mode === 'view', quick = D.screen === 'quick', sec = !quick && D.tab !== 'song' && hasSec(D, D.tab), layer = sec && partLayer(D) && partHas(D, D.tab), drums = sec && !layer;
      s.setTitle('More');
      function close() { ui.close(s.id); }
      function done(fn) { handEdit(D); fn(); close(); owner.rerender(); changed(D); }
      var body = [];
      function group(label, kids) { kids = kids.filter(Boolean); if (kids.length) body.push(el('div.sm-group', [label ? el('div.caps', label) : null].concat(kids))); }
      function row(testid, icon, label, fn, cls) { return btn('.seq-menu-row' + (cls || ''), { testid: testid, onclick: fn }, [el('span.tm-i', icon), el('span.grow', label)]); }
      group(null, [
        D.mode === 'write' ? row('btn-seq-jam', '🎸', 'Let the band jam one', function () { if (D.done) return; D.done = true; close(); stopPlay(D); if (D.onJam) D.onJam(); }) : null,
        metroButton(),
        !ro && !quick ? row('btn-seq-quick', '🎚', 'Back to Quick song', function () { close(); stopPlay(D); enterQuick(D); owner.rerender(); }) : null,
        D.mode === 'sketch' && ui.openGear ? row('btn-kit-shop', '🛒', strSeat() ? cap(instrument()) + ' shop' : 'Drum shop', function () { close(); stopPlay(D); ui.openGear(); }) : null   // v0.8 / v1.1: your seat's shop
      ]);
      if (!ro && drums) {
        var fills = chipSec(D.tab), hasFill = !!(D.pat.fillBars && D.pat.fillBars[D.tab]);
        group('This ' + (SEC_LABEL[D.tab] || D.tab).toLowerCase(), [
          row('btn-seq-beat', '🥁', 'Beat for this section', function () { close(); ui.show('seq-beat', { owner: owner }); }),
          fills ? row('btn-seq-fill', '✨', D.fill ? 'Back to the main bar' : hasFill ? 'Edit the bar 4 fill' : 'Bar 4 fill', function () {   // Q2: the grid edits p.fillBars[tab]
            if (!D.fill && !hasFill) { D.pat.fillBars = D.pat.fillBars || {}; D.pat.fillBars[D.tab] = D.pat.sections[D.tab].slice(); }
            D.fill = !D.fill; close(); owner.rerender(); changed(D);
          }, D.fill ? '.on' : '') : null,
          fills && hasFill ? row('seq-fill-remove', '🧹', 'Take the bar 4 fill out', function () {
            done(function () { delete D.pat.fillBars[D.tab]; if (!Object.keys(D.pat.fillBars).length) delete D.pat.fillBars; D.fill = false; });
          }) : null,
          el('div.sm-copy', GG.songs.sectionsOf(D.pat).filter(function (n) { return n !== D.tab; }).map(function (name) {   // v0.8: + the song's Solo / Outro
            return btn('.btn.small', { testid: 'seq-copy-' + name, onclick: function () { done(function () { D.fill = false; D.pat.sections[D.tab] = D.pat.sections[name].slice(); }); } }, 'Copy ' + cap(name));
          })),
          row('seq-clear', '✕', 'Clear the ' + D.tab, function () { done(function () { if (fillOn(D)) D.pat.fillBars[D.tab] = GG.songs.blankSection(D.pat.lanes); else D.pat.sections[D.tab] = GG.songs.blankSection(D.pat.lanes); }); }, '.danger')
        ]);
      }
      if (!ro && layer && D.pat.part.sections[D.tab]) {   // v1.1: your part's one-tap tweaks, copy, clear
        group('Your part', [
          el('div.sm-mods', GG.songs.part.MODS.map(function (m) {
            return btn('.btn.small.sm-mod', { testid: 'part-mod-' + m.id, title: m.desc, onclick: function () {
              var before = JSON.stringify(D.pat.part);
              partV2(D);
              var r = GG.songs.part.modify(D.pat, D.tab, m.id, gear(), genre());
              close();
              if (JSON.stringify(r.pattern.part) === JSON.stringify(D.pat.part)) {
                if (JSON.stringify(D.pat.part) !== before) { owner.rerender(); changed(D); }
                ui.toast('“' + m.name + '” has nothing left to change here. Try another tweak.'); return;
              }
              D.pat = r.pattern; handEdit(D); owner.rerender(); changed(D);
            } }, m.name);
          })),
          el('div.sm-copy', GG.songs.sectionsOf(D.pat).filter(function (n) { return n !== D.tab && D.pat.part.sections[n]; }).map(function (name) {
            return btn('.btn.small', { testid: 'part-copy-' + name, onclick: function () { done(function () { partV2(D); D.pat.part.sections[D.tab] = U.clone(D.pat.part.sections[name]); }); } }, 'Copy ' + cap(name));
          })),
          row('part-clear', '✕', 'Clear your ' + D.tab + ' part', function () { done(function () { partV2(D); D.pat.part.sections[D.tab].rows = D.pat.part.sections[D.tab].rows.map(function () { return '................'; }); }); }, '.danger')
        ]);
      }
      if (!ro && sec && isExtra(D.tab)) group(null, [row('seq-remove-' + D.tab, '↩', 'Take the ' + SEC_LABEL[D.tab] + ' out of the song', function () {
        var tab = D.tab; close(); D.tab = 'song'; removeExtra(owner, D, tab);
      }, '.danger')]);
      ui.append(s.body, body);
      s.foot.appendChild(btn('.btn.ghost', { testid: 'btn-seq-tools-cancel', onclick: close }, 'Close'));
    }
  });
  // D8: the 0.6.2 groove presets, as "Beat for this section" (pedal ones locked).
  ui.define('seq-beat', {
    kind: 'sheet', title: 'Beat for this section',
    build: function (s, d) {
      var owner = d.owner, D = owner && owner.data; if (!D) return;
      var cur = GG.songs.presetOf(D.pat, D.tab, genre(), gear());
      s.setTitle('Beat for the ' + D.tab, SEC_LABEL[D.tab]);
      s.body.appendChild(el('div.guide-presets', GG.songs.presets(genre(), gear()).map(function (pr) {
        return btn('.guide-preset' + (pr.id === cur ? '.on' : ''), { testid: 'seq-beat-' + pr.id, disabled: pr.locked, onclick: function () {
          D.pat = GG.songs.applyPreset(D.pat, D.tab, pr.id, gear(), genre()); if (D.pat.part) withPart(D.pat);
          handEdit(D); ui.close(s.id); owner.rerender(); changed(D);
        } }, [el('span.gp-top', [el('b', pr.name), pr.id === cur ? el('span.gp-tag.on', '✓ now') : pr.signature ? el('span.gp-tag', 'signature') : null]),
          el('span.gp-desc', pr.locked ? '🔒 Needs a double-kick pedal. ' + pr.desc : pr.desc)]);
      })));
    }
  });

  /* ---- Entry points -------------------------------------------------------------------------------------- */
  // Planner Go with `count` Write blocks: one songwriter per block, then done(). A fresh block opens Quick song; songs queued
  // earlier from the kit (state.pendingSongs) open in the editor; a jammed block keeps its sketch for later. ✕ returns to the
  // planner without playing the week, keeping songs saved so far as sketches.
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
      ui.show('seq', { mode: 'write', index: i, total: count, fromSketch: !!sketch, taken: taken.slice(), editHint: tip, screen: sketch ? 'edit' : 'quick',
        pat: sketch ? GG.songs.sanitize(sketch, gear(), genre()) : null,
        title: sketch && sketch.title, titleEn: sketch && sketch.titleEn,
        onSave: function (entry) { out[i] = entry; taken.push(entry.title); k++; next(); },
        onJam: function () { out[i] = null; if (sketch) keep.push(sketch); k++; next(); },
        // ✕ keeps what was already saved this round (and unreached sketches) so nothing is lost; they reopen next Go.
        onCancel: function () { state.pendingSongs = out.filter(Boolean).concat(keep, queued.slice(k)); } });
    }
    next();
  };
  // v0.9: writeTips are member-keyed (every band's members, genre-correct); a band without any gets a neutral grid tip.
  // v1.3: they are the grid's instructions, so they show when the editor opens (Tweak, or a queued sketch), never on Quick song.
  var TIP_BEAT = { metal: 'Metal wants a busy kick.', punk: 'Punk: fast snare on every other 8th.', rock: 'Rock: kick on 1 and 3, snare on 2 and 4.', country: 'Country: a train beat on the snare.' };
  function firstTip(state) {
    if (strSeat()) {   // v1.1 review: the drum writeTips are the drum grid's; a string seat starts from the drummer's groove
      var tk = ui.talkers(state)[0];
      return tk ? { who: tk.id, text: ui.fill('{drummer} has a groove ready. Pick your ' + (GG.career.seatOf(state) === 'lead' ? 'hook' : 'chords') + ' for each section, then tap your part on the grid. Hit play to hear it.', state) } : null;
    }
    var tips = (GG.content.lines && GG.content.lines.writeTips) || {};
    var ids = Object.keys(tips).filter(function (id) { return ui.talkers(state).some(function (m) { return m.id === id; }); });
    var who = ui.pick(ids);
    if (who) return { who: who, text: ui.fill(ui.pick(tips[who]), state) };
    var t = ui.talkers(state)[0];
    return t ? { who: t.id, text: 'Tap a square to add a hit, drag down a lane to paint, hit play to hear it. ' + (TIP_BEAT[state.genre] || '') } : null;
  }
  // The kit hotspot: the sketch pad on state.draft (D10: the editor when a draft exists, else Quick song).
  ui.openSketch = function () {
    var state = st(); if (!state) return;
    ui.show('seq', { mode: 'sketch', pat: state.draft ? GG.songs.sanitize(state.draft, gear(), genre()) : null, screen: state.draft ? 'edit' : 'quick' });
  };
  function useSketch(s, D) {
    var state = st(); if (!state || D.done) return;
    var r = rerate(D);
    if (!r.notes) { ui.toast('The sketch pad is empty. Tap some hits in first.'); return; }
    D.done = true; stopPlay(D); clearTimeout(D.qT); clearTimeout(D.warmT);
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
    ui.show('seq', { mode: 'view', screen: 'edit', song: song, pat: U.clone(song.pattern), title: song.title, titleEn: song.titleEn });
  };
  // 5k refreshSeq: new gear while the songwriter is open (the lanes grow; an untouched Quick song is re-composed for the new kit).
  ui.seqGear = function (e) {
    var D = e && e.data; if (!D || !D.pat || D.mode === 'view') return;
    D.pat = GG.songs.sanitize(D.pat, gear(), genre());
    if (D.screen === 'quick' && D.qs && !D.edited) { D.pat = composeNow(D); D.partReady = false; }
    e.rerender();
  };

  GG.registerDebug('seq', function () {
    var e = ui.get && ui.get('seq'), D = e && e.data; if (!D || !D.pat) return null;
    var q = D.qs || qsOf(D), chords = {}, tonic = tonicOf(D);
    GG.songs.sectionsOf(D.pat).filter(chipSec).forEach(function (n) { chords[n] = effChords(D, n); });
    return { mode: D.mode, screen: D.screen, tab: D.tab, layer: partLayer(D) ? 'part' : 'drums', seat: seat(), playing: D.playing || null, title: D.title,
      rating: D.rating ? { groove: D.rating.groove, hook: D.rating.hook, difficulty: D.rating.difficulty } : null,
      playhead: D.view ? D.view.ph : null, part: D.pat.part ? U.clone(D.pat.part) : null, recipe: D.pat.recipe ? U.clone(D.pat.recipe) : null,
      sliders: { energy: q.energy, mood: q.mood, feel: q.swing, fills: q.fills, bpm: q.bpm }, chords: chords,
      chips: chipSec(D.tab) && chords[D.tab] ? chords[D.tab].map(function (x) { return chordName(D, x, tonic); }) : [],
      edited: !!D.edited, fill: fillOn(D), compose: D.compose || null };
  });
})(window.GG);
