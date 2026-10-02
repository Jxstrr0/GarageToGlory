// 2h_sim_lessons.js (v1.0 "Glory", Lane T; plan_contract_1.0 §4.7): the tutorial's DOM-free half. Which lesson is due, the
// per-career progress in state.tutorial, and each lesson's steps resolved for this career (band layer, seat gates, speakers,
// tokens). Pure reads of content + state; never the career RNG, no clock. The UI (5p_ui_tutorial.js) shows the bubbles.
//   GG.lessons = { LESSONS, ensure(state), on(state), done(state, id), mark(state, id) -> true when newly marked, stop(state),
//                  def(id), available(state, id), steps(state, id) -> [VIEW_STEP], due(state, ctx) -> lessonId | null }
//   state.tutorial = { on, done: { <lessonId>: totalWeek }, past4 }   (stage-0 migrate defaults; newCareer in 60_main sets on)
//   ctx = { screen?, mode?, tab?, event?, totalWeek? } — what just happened in the UI (a screen opened, a laptop tab, 'afterCard',
//   'moodDrop'); totalWeek overrides state.totalWeek (the wrap screen shows the week that just ended).
//   VIEW_STEP = { i, who: memberId | null, narr?: true, text, point: STEP.point | null, advance: 'next' | { event, id? } | { hotspot } }
// Speakers: role aliases resolve through career.roleOf (at the time of the lesson); a speaker who isn't an active member of
// this lineup, a silent member (Kenji) or anyone career.speakerOk refuses is dropped with the step. Seat gates read
// (state.seat || 'drums') (E12; v1.1 adds the field). y1_good_year replays the shipped recap.goodYear lines once year one
// is in the books (silent members' lines become narration), else the content's own year-one talk.
(function (GG) {
  var C = GG.contracts || {};
  var L = GG.lessons = GG.lessons || {};

  function lessons() { var t = GG.content && GG.content.tutorial; return Array.isArray(t) ? t : []; }
  L.LESSONS = (C.LESSONS || []).slice();
  lessons().forEach(function (x) { if (x && x.id && L.LESSONS.indexOf(x.id) < 0) L.LESSONS.push(x.id); });
  L.def = function (id) { return lessons().filter(function (x) { return x && x.id === id; })[0] || null; };
  function seat(state) { return (state && state.seat) || 'drums'; }
  function has(list, x) { return Array.isArray(list) ? list.indexOf(x) >= 0 : list === x; }

  L.ensure = function (state) {
    if (!state) return null;
    var t = state.tutorial;
    if (!t || typeof t !== 'object') t = state.tutorial = { on: false, done: {}, past4: (state.totalWeek || 0) >= 4 };
    if (typeof t.on !== 'boolean') t.on = false;
    if (!t.done || typeof t.done !== 'object') t.done = {};
    if (typeof t.past4 !== 'boolean') t.past4 = (state.totalWeek || 0) >= 4;
    return t;
  };
  L.on = function (state) { return !!(state && state.tutorial && state.tutorial.on === true); };
  L.done = function (state, id) { return !!(state && state.tutorial && state.tutorial.done && state.tutorial.done[id]); };
  L.mark = function (state, id) {
    var t = L.ensure(state); if (!t || !id || t.done[id]) return false;
    t.done[id] = state.totalWeek || 1;
    return true;
  };
  L.stop = function (state) { var t = L.ensure(state); if (t) t.on = false; return t; };
  L.available = function (state, id) {
    var d = L.def(id); if (!d || !state) return false;
    if (d.band && !has(d.band, state.bandId)) return false;
    if (d.seat && !has(d.seat, seat(state))) return false;
    return true;
  };

  /* ---- Steps ------------------------------------------------------------------------------------------------- */
  function K() { return GG.career || {}; }
  function active(state, id) {
    return (state.members || []).some(function (m) { return m && m.id === id && (!m.status || m.status === 'active'); });
  }
  // A speaker id this lineup can hear from now, or null (dropped).
  function speaker(state, who) {
    var k = K(), id = who;
    if (typeof who !== 'string' || !who) return null;
    if (who.charAt(0) === '@') id = k.roleOf ? k.roleOf(state, who) : null;
    if (!id || !active(state, id)) return null;
    if (k.isSilent && k.isSilent(state, id)) return null;
    if (k.speakerOk && !k.speakerOk(state, id)) return null;
    return id;
  }
  function fill(state, text) {
    var s = String(text == null ? '' : text), lead = s.charAt(0) === '{';
    s = K().fillText ? K().fillText(state, s) : s;
    return lead ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  }
  function rawSteps(state, d) {
    var bb = d.byBand && d.byBand[state.bandId];
    return (bb && Array.isArray(bb.steps) && bb.steps.length ? bb.steps : d.steps) || [];
  }
  // y1_good_year after year one: the recap's own "what a good year looks like" lines (GG.recap.goodYear).
  function goodYearSteps(state) {
    var R = GG.recap, rec = R && Array.isArray(state.recaps) ? state.recaps.filter(function (x) { return x && x.y === 1; })[0] : null;
    if (!rec || !R.goodYear) return null;
    var out = (R.goodYear(state, rec) || []).map(function (g) {
      var silent = K().isSilent && K().isSilent(state, g.who);
      var npc = !silent && K().memberDef && !K().memberDef(state, g.who) && K().speakerOk && K().speakerOk(state, g.who);   // Mom has a line too
      if (!silent && !npc && !speaker(state, g.who)) return null;
      return silent ? { who: null, narr: true, text: g.text } : { who: g.who, text: g.text };
    }).filter(Boolean);
    return out.length ? out : null;
  }
  L.steps = function (state, id) {
    var d = L.def(id); if (!d || !state || !L.available(state, id)) return [];
    var me = seat(state), list = null;
    if (id === 'y1_good_year') list = goodYearSteps(state);
    if (!list) {
      list = [];
      rawSteps(state, d).forEach(function (st) {
        if (!st || (st.seat && !has(st.seat, me))) return;
        var who = speaker(state, st.who);
        if (!who) return;
        list.push({ who: who, text: fill(state, st.text), point: st.point || null, advance: st.advance || 'next' });
      });
    }
    return list.map(function (s, i) {
      return { i: i, who: s.who, narr: s.narr || undefined, text: s.text, point: s.point || null, advance: s.advance || 'next' };
    });
  };

  /* ---- Due --------------------------------------------------------------------------------------------------- */
  function weekOk(w, tw) {
    if (w.week != null && tw !== w.week) return false;
    if (w.minWeek != null && tw < w.minWeek) return false;
    if (w.maxWeek != null && tw > w.maxWeek) return false;
    return true;
  }
  // A lesson's trigger fits ctx: screen (+ mode when given), tab or event; any one of them.
  L.matches = function (d, ctx) {
    var w = (d && d.when) || {}; ctx = ctx || {};
    if (w.screen && ctx.screen && has(w.screen, ctx.screen) && (!w.mode || w.mode === ctx.mode)) return true;
    if (w.tab && ctx.tab && has(w.tab, ctx.tab)) return true;
    if (w.event && ctx.event && has(w.event, ctx.event)) return true;
    return false;
  };
  L.due = function (state, ctx) {
    if (!L.on(state)) return null;
    var tw = (ctx && ctx.totalWeek) || state.totalWeek || 1;   // a wrap screen passes the week it wraps (endWeek already advanced)
    for (var i = 0; i < L.LESSONS.length; i++) {
      var id = L.LESSONS[i], d = L.def(id);
      if (!d || L.done(state, id) || !L.available(state, id)) continue;
      if (!weekOk(d.when || {}, tw) || !L.matches(d, ctx)) continue;
      return id;
    }
    return null;
  };

  if (GG.registerDebug) GG.registerDebug('lessons', function () {
    var st = GG.state; return { ids: L.LESSONS.slice(), on: L.on(st), done: st && st.tutorial ? Object.assign({}, st.tutorial.done) : {} };
  });
})(window.GG);
