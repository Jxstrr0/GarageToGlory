// 2d_sim_recap.js (v0.8.1 "Addendum 2", LICRECAP; handoff D3): the year-end recap. At the week-24 wrap career.endWeek
// builds one RECAP from the year's data and keeps it in state.recaps (compact: small numbers + short strings, so the save
// code stays small; v1.0's Hall of Fame shows a career as a strip of them). Pure sim: no DOM; the headline variant rolls
// its own RNG (career seed + year), never the career RNG. Words: content/recap.js. Screen: 5l_ui_recap.js.
// What it tracks during the year (on state.yearStart, reset by career's snapshotYear -> startYear): fin (money in: every
// positive fund change except a parents' loan; career.addStat), act (the lineup at the start), ret (returns so far), rank /
// vs (your and the rival's scene rank), bans, best / worst gig ({ v, n, g, s, q }, career settleGig -> gig).
// API (GG.recap):
//   init(s) · ensure(s) · migrate(s) · startYear(s) · gig(s, GIG_RESULT) · build(s) -> RECAP (also stored; wrap.recap)
//   list(s) -> [RECAP] (oldest first) · get(s, year) · events(s, rec) -> [{ key, score, tokens }] (biggest first)
//   headline(s, rec) -> text · goodYear(s, rec) -> [{ who, text, good }] (year one only; [] otherwise) · nth(n) -> 'Two'
//   awardName(cat) · regionName(id)
// RECAP = contracts RECAP + { gigs, loans, lic ($ licensing net), chem (chemistry at the wrap), era (new era this year | null),
//   noms (award nominations that didn't win) }; best/worst = { venueId, name, grade, quote }; quit/back hold first names (a
//   recruit who left is gone from state.members, so an id would not resolve later). photo stays null (the screen renders
//   the band photo live; it is never saved).
// Events: 'recap:built' { recap }.
// v0.9: goodYearList(s) (flat + byBand, or { <bandId>: [..] }) ; a goodYear entry voiced only by another band's members is
//   skipped ; headlines + byBand ; the gig quote never comes from a silent member.
(function (GG) {
  var C = GG.contracts, U = GG.util;
  var R = GG.recap = GG.recap || {};
  var WPY = C.WEEKS_PER_YEAR;
  var NTH = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen'];
  var EMPTY = { headlines: {}, quotes: {}, goodYear: [], masthead: 'Rolling Scone' };
  function K() { return GG.content.recap || EMPTY; }
  function isObj(o) { return o && typeof o === 'object' && !Array.isArray(o); }
  function firstName(n) { return String(n || '').split(' ')[0]; }
  function short(t, n) { t = String(t || ''); return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : t; }
  R.nth = function (n) { return NTH[n] || String(n); };

  /* ---- State ------------------------------------------------------------------------------------------------ */
  R.ensure = function (s) {
    if (!s || typeof s !== 'object') return s;
    if (!Array.isArray(s.recaps)) s.recaps = [];
    return s;
  };
  R.init = function (s) { return R.ensure(s); };
  R.migrate = function (s) { if (!s || typeof s !== 'object' || !isFinite(s.totalWeek)) return s; return R.ensure(s); };
  function scene(s) {
    if (!GG.rival || !GG.rival.leaderboard || !s.rival) return null;
    try {
      var rows = GG.rival.leaderboard(s), you = null, them = null;
      rows.forEach(function (r) { if (r.you) you = r.rank; if (r.rival) them = r.rank; });
      return { rank: you, vs: them };
    } catch (e) { return null; }
  }
  // career.snapshotYear: the start-of-year marks the recap compares against.
  R.startYear = function (s) {
    var ys = s.yearStart; if (!ys) return;
    ys.fin = 0;
    ys.act = (s.members || []).filter(function (m) { return m.status === 'active'; }).map(function (m) { return [m.id, firstName(m.name)]; });
    ys.ret = {};
    (s.members || []).forEach(function (m) { if (m.returns) ys.ret[m.id] = m.returns; });
    var sc = scene(s);
    ys.rank = sc ? sc.rank : null; ys.vs = sc ? sc.vs : null;
    ys.bans = (s.banned || []).length;
    ys.best = null; ys.worst = null;
  };
  // career.settleGig: keeps the year's best and worst gig (score), with a line from the band about it.
  R.gig = function (s, r) {
    var ys = s && s.yearStart; if (!ys || !r) return;
    var q = null;
    (r.reactions || []).some(function (x) {
      if (!x || !x.text || (GG.career && GG.career.isSilent ? GG.career.isSilent(s, x.who) : x.who === 'kenji')) return false;   // v0.9: never a silent member
      var who = GG.career && GG.career.memberName ? GG.career.memberName(s, x.who) : x.who;
      q = '“' + short(GG.career ? GG.career.fillText(s, x.text) : x.text, 90) + '” — ' + who;
      return true;
    });
    var e = { v: r.venueId || null, n: short(r.name || 'a gig', 40), g: r.grade || 'C', s: Math.round(r.score || 0), q: q };
    if (!ys.best || e.s > ys.best.s) ys.best = e;
    if (!ys.worst || e.s < ys.worst.s) ys.worst = e;
  };

  /* ---- Building the recap ------------------------------------------------------------------------------------ */
  function rngFor(s, y, salt) { return GG.RNG(GG.hashSeed((s.seed >>> 0) + '|recap|' + y + '|' + (salt || ''))); }
  R.awardName = function (cat, genre) {
    var c = GG.content.awards && GG.content.awards.categories && GG.content.awards.categories[cat];
    return c ? (c.genreNames && c.genreNames[genre]) || c.name || c.short : String(cat);
  };
  R.regionName = function (id) { var r = GG.tour && GG.tour.region ? GG.tour.region(id) : null; return r ? r.name : String(id); };
  function gigOut(s, e, rng) {
    if (!e) return null;
    var q = e.q;
    if (!q) { var pool = (K().quotes || {})[e.g] || (K().quotes || {}).C || []; q = pool.length ? '“' + rng.pick(pool) + '”' : null; }
    return { venueId: e.v, name: e.n, grade: e.g, quote: q };
  }
  // Builds (or rebuilds) this year's RECAP at the week-24 wrap and stores it in state.recaps (one per year).
  R.build = function (s) {
    R.ensure(s);
    var ys = s.yearStart || {}, y = s.year, w0 = (y - 1) * WPY + 1, w1 = s.totalWeek, rng = rngFor(s, y, 'gig');
    var inW = function (w) { return w != null && w >= w0 && w <= w1; };
    var net = (s.fund || 0) - (ys.fund != null ? ys.fund : s.fund), fin = Math.max(0, Math.round(ys.fin || 0));
    var awards = [], noms = 0;
    (s.awards || []).forEach(function (a) { if (a.year === y) { if (a.won) awards.push(R.awardName(a.category, s.genre)); else if (a.nominated) noms++; } });
    var gong = s.tour && (s.tour.gongs || []).filter(function (g) { return g.year === y; })[0];
    if (gong && gong.won) awards.push('Global Gong'); else if (gong && gong.nominated) noms++;
    var now = {}, quit = [], back = [];
    (s.members || []).forEach(function (m) { if (m.status === 'active') now[m.id] = 1; });
    (ys.act || []).forEach(function (a) { if (!now[a[0]]) quit.push(a[1]); });
    (s.members || []).forEach(function (m) {
      if (m.status === 'active' && (m.returns || 0) > ((ys.ret || {})[m.id] || 0)) back.push(firstName(m.name));
    });
    var sc = scene(s), rival = sc && sc.rank ? { rank: sc.rank, delta: ys.rank ? ys.rank - sc.rank : 0, vs: sc.vs } : null;
    var regions = [];
    if (s.tour && s.tour.regions) Object.keys(s.tour.regions).forEach(function (id) {
      var r = s.tour.regions[id];
      if (id !== s.region && r && inW(r.unlocked)) regions.push(id);
    });
    var era = null;
    (s.eraHistory || []).forEach(function (h) { if (h.week > 1 && inW(h.week)) era = h.era; });
    var rec = {
      y: y, fundIn: fin, fundOut: Math.max(0, fin - net), fans: (s.fans || 0) - (ys.fans || 0),
      best: gigOut(s, ys.best, rng), worst: ys.worst && ys.best && ys.worst.s < ys.best.s ? gigOut(s, ys.worst, rng) : null,
      songs: (s.songs || []).filter(function (x) { return inW(x.written); }).length,
      albums: (s.albums || []).filter(function (a) { return a.status === 'released' && inW(a.released); }).length,
      awards: awards, noms: noms, quit: quit, back: back, rival: rival, regions: regions,
      gigs: (s.stats && s.stats.gigs || 0) - (ys.gigs || 0), loans: (s.stats && s.stats.parentsLoans || 0) - (ys.parentsLoans || 0),
      lic: GG.licensing ? GG.licensing.income(s, w0, w1) : 0, chem: Math.round(s.chemistry || 0), era: era,
      headline: '', photo: null
    };
    rec.headline = R.headline(s, rec);
    s.recaps = s.recaps.filter(function (x) { return x.y !== y; });
    s.recaps.push(rec);
    GG.emit('recap:built', { recap: rec });
    return rec;
  };
  R.list = function (s) { R.ensure(s); return s.recaps.slice(); };
  R.get = function (s, y) { R.ensure(s); return s.recaps.filter(function (x) { return x.y === y; })[0] || null; };

  /* ---- The Rolling Scone headline ------------------------------------------------------------------------------- */
  // Everything that happened this year that could lead the paper, biggest first.
  R.events = function (s, rec) {
    var y = rec.y, w0 = (y - 1) * WPY + 1, w1 = y * WPY, out = [], ys = s.yearStart || {};
    var inW = function (w) { return w != null && w >= w0 && w <= w1; };
    function add(key, score, tokens) { out.push({ key: key, score: score, tokens: tokens || {} }); }
    var fin = s.finalShowdown;
    if (fin && inW(fin.week)) add(fin.headliner === 'you' || fin.won ? 'final_won' : 'final_lost', 100);
    if (rec.awards.indexOf('Global Gong') >= 0) add('gong', 95);
    var loonies = rec.awards.filter(function (a) { return a !== 'Global Gong'; });
    if (loonies.length) add('loonie', 80 + loonies.length, { award: loonies[0] });
    (s.trophies || []).forEach(function (t) {
      if (t.year === y && (t.kind === 'gold' || t.kind === 'platinum')) add('cert', t.kind === 'platinum' ? 78 : 75, { album: t.title, cert: t.kind === 'platinum' ? 'Platinum' : 'Gold' });
    });
    if (rec.era === 'world') add('world', 72);
    if (rec.era === 'signed' && s.label && !s.label.dropped) add('signed', 70, { label: s.label.name });
    (s.albums || []).forEach(function (a) {
      if (a.status === 'released' && inW(a.released) && a.chart && a.chart.peak) add(a.chart.peak <= 10 ? 'chart_top' : 'charted', a.chart.peak <= 10 ? 66 : 50, { album: a.title, n: a.chart.peak });
    });
    if (s.rival && s.rival.cracked && inW(s.rival.crackWeek)) add('crack', 62);
    if (GG.licensing && s.licensing) s.licensing.deals.forEach(function (d) {
      if (!inW(d.week)) return;
      var b = GG.licensing.brand(d.brandId), song = GG.songs && GG.songs.byId ? GG.songs.byId(s, d.songId) : null;
      add('license', 60, { brand: b ? b.name : 'a sponsor', song: song ? song.title : 'a song' });
    });
    if (rec.regions.length) add('region', 58, { region: R.regionName(rec.regions[0]) });
    if (rec.quit.length) add('quit', 55, { name: rec.quit[0] });
    if (rec.back.length) add('back', 50, { name: rec.back[0] });
    if (rec.best && rec.best.grade === 'S') add('best_s', 40, { venue: rec.best.name });
    var bans = (s.banned || []).length - (ys.bans || 0);
    if (bans >= 2) add('banned', 35, { n: bans });
    if (rec.loans >= 2) add('loans', 30, { n: rec.loans });
    if (rec.fans >= 500) add('fans', 25, { n: U.fmtNum(rec.fans) });
    if (s.van && s.van.condition != null && s.van.condition < 30) add('survive_van', 12, { van: s.van.name || 'the van' });
    add('survive', 10);
    out.sort(function (a, b) { return b.score - a.score; });
    return out;
  };
  R.headline = function (s, rec) {
    var H = K().headlines || {}, ev = R.events(s, rec), rng = rngFor(s, rec.y, 'headline');
    for (var i = 0; i < ev.length; i++) {
      var pool = GG.career && GG.career.pool ? GG.career.pool(s, K(), ['headlines', ev[i].key]) : H[ev[i].key];   // v0.9: + byBand
      if (!pool || !pool.length) continue;
      var t = ev[i].tokens, text = rng.pick(pool).replace(/\{(nth|n|name|award|album|cert|label|region|venue|brand|song|van)\}/g, function (all, k) {
        if (k === 'nth') return R.nth(rec.y);
        return t[k] != null ? String(t[k]) : all;
      });
      return short(GG.career ? GG.career.fillText(s, text) : text, 110);
    }
    return 'Year ' + R.nth(rec.y) + ' in the Books';
  };

  /* ---- Year one: what a good year looks like ------------------------------------------------------------------ */
  // v0.9: an npc speaks only when it may in this career (career.speakerOk: Baba is Hail Damage's).
  function speaker(s, prefer) {
    var npcs = GG.content.npcs || {}, ok = GG.career && GG.career.speakerOk;
    for (var i = 0; i < (prefer || []).length; i++) {
      var id = prefer[i];
      if (!id) continue;
      if ((s.members || []).some(function (m) { return m.id === id && m.status === 'active'; })) return id;
      if (npcs[id] && (!ok || GG.career.speakerOk(s, id))) return id;
    }
    return null;
  }
  // v0.9: an entry voiced only by another band's members (or npcs this career never hears from) is theirs, not ours.
  function foreignVoice(s, prefer) {
    var K2 = GG.career;
    if (!prefer || !prefer.length || !K2 || !K2.speakerOk) return false;
    return prefer.every(function (id) { return !K2.isAlias(id) && !K2.speakerOk(s, id); });
  }
  // v0.9: recap.goodYear = [..] (flat, + byBand[bandId].goodYear) or { <bandId>: [..], default?: [..] }.
  R.goodYearList = function (s) {
    var G = K().goodYear;
    if (Array.isArray(G)) { var p = GG.career && GG.career.pool ? GG.career.pool(s, K(), 'goodYear') : G; return Array.isArray(p) ? p : G; }
    return (G && (G[s.bandId] || G['default'])) || [];
  };
  R.goodYear = function (s, rec) {
    if (!rec || rec.y !== 1) return [];
    var val = { fans: rec.fans, songs: rec.songs, gigs: rec.gigs, loans: rec.loans, chemistry: rec.chem };
    return R.goodYearList(s).map(function (g) {
      if (foreignVoice(s, g.who)) return null;   // v0.9: Marcel's line stays in Marcel's career
      var who = speaker(s, (g.who || []).map(function (id) { return GG.career && GG.career.isAlias && GG.career.isAlias(id) ? GG.career.roleOf(s, id) : id; }));
      if (!who && g.topic !== 'chemistry') {   // a neutral line (or an alias nobody holds): the first bandmate who talks says it
        var m = GG.career && GG.career.talkers ? GG.career.talkers(s)[0] : (s.members || []).filter(function (x) { return x.status === 'active'; })[0];
        who = m ? m.id : null;
      }
      if (!who) return null;
      var n = val[g.topic] || 0, good = g.topic === 'loans' ? n <= g.target : n >= g.target;
      var text = (good ? g.good : g.bad).replace(/\{n\}/g, String(n)).replace(/\{target\}/g, String(g.target));
      return { who: who, text: GG.career ? GG.career.fillText(s, text) : text, good: good };
    }).filter(Boolean);
  };

  // Saves: fill state.recaps when missing. Chained onto GG.save.migrate.
  if (GG.save && GG.save.migrate && !GG.save.migrate.recap) {
    var prevMigrate = GG.save.migrate;
    GG.save.migrate = function (s) { return R.migrate(prevMigrate(s)); };
    Object.keys(prevMigrate).forEach(function (k) { if (GG.save.migrate[k] === undefined) GG.save.migrate[k] = prevMigrate[k]; });
    GG.save.migrate.recap = true;
  }

  GG.registerDebug('recap', function () {
    var s = GG.state; if (!s) return { state: null };
    return { recaps: (s.recaps || []).length, last: (s.recaps || [])[(s.recaps || []).length - 1] || null,
      yearStart: s.yearStart ? { fin: s.yearStart.fin, rank: s.yearStart.rank, best: s.yearStart.best, worst: s.yearStart.worst } : null };
  });
})(window.GG);
