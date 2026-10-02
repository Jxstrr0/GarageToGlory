// 12_meta.js (v1.0 "Glory"): cross-career meta storage and the Hall of Fame (plan/plan_contract_1.0.md §3.7, §4.5).
//   localStorage gg.v1.meta = META, gg.v1.hof = HOF (shapes in 02_contracts.js V1.0 GLORY); GG.save's memory fallback applies.
// FROZEN API (stage 0; Lane M owns the file after it):
//   enabled (false by default; 60_main sets it in the browser, so node bots never write meta) · load() · get() · save() ·
//   hof() -> [HOF_ENTRY] newest first · careerId(state) · lessonSeen(id) · markLesson(id) · exportLite() · exportFull() ·
//   mergeLite(obj) · recordCareer(state, opts) -> { entry, fresh, unlocks: [], ach: [] } · award(state, ids) · has(id) ·
//   unlock(kind, ids) · unlocked(kind) · today()
// recordCareer: one entry per careerId (the same id again keeps the higher score and never double-counts), unshifted
// (newest first), cap 40 with the top 10 by score never dropped; stamps `at` (YYYY-MM-DD) + `ver`; bumps careers.finished,
// byBand, bySeat and best on a fresh entry; emits 'hof:added' { entry } (and 'meta:unlock' unless opts.silent, once unlocks
// exist: Lane M). The entry comes from GG.legacy.hofEntry(state) when 2f_sim_legacy is loaded, else a basic entry built
// here (score from state.legacy, 0 without it).
// Listeners (all no-ops unless enabled): 'career:new' bumps careers.started; 'week:wrap' past week 4 sets
// state.tutorial.past4 once and bumps careers.past4; 'career:end' records the career when it is GG.state.
// One-time slot scan in load(): every save slot is read as a migrated copy; past4 += 1 per career at totalWeek >= 4 (once
// per careerId, via meta.seen); ended slots are recorded silently once GG.legacy exists (until then the scan stays open:
// meta.scanned is null and the next boot retries; past4 is never counted twice).
// Quota: when the Hall of Fame write fails on working storage, entries outside the top 10 lose their year strip and the
// write is retried once; still failing → kept in memory, 'meta:quota' {} once per session.
(function (GG) {
  var C = GG.contracts, save = GG.save;
  var M = GG.meta = GG.meta || {};
  var HOF_CAP = 40, HOF_TOP = 10, SEEN_CAP = 200;
  M.enabled = false;
  var meta = null, hof = null, quotaSent = false;

  function obj(o) { return o && typeof o === 'object' && !Array.isArray(o) ? o : null; }
  function num(v) { return isFinite(v) ? +v : 0; }
  function blankMeta() {
    return { v: 1, scanned: null, careers: { started: 0, past4: 0, finished: 0, byBand: {}, bySeat: {}, best: null },
      lessons: {}, ach: {}, unlocks: { palettes: [], emblems: [], parts: [] }, seen: {} };
  }
  function normMeta(m) {
    var b = blankMeta(); m = obj(m) || b;
    m.v = 1; if (m.scanned === undefined) m.scanned = null;
    m.careers = obj(m.careers) || b.careers;
    ['started', 'past4', 'finished'].forEach(function (k) { m.careers[k] = num(m.careers[k]); });
    ['byBand', 'bySeat'].forEach(function (k) { m.careers[k] = obj(m.careers[k]) || {}; });
    if (!obj(m.careers.best)) m.careers.best = null;
    ['lessons', 'ach', 'seen'].forEach(function (k) { m[k] = obj(m[k]) || {}; });
    m.unlocks = obj(m.unlocks) || b.unlocks;
    ['palettes', 'emblems', 'parts'].forEach(function (k) { if (!Array.isArray(m.unlocks[k])) m.unlocks[k] = []; });
    return m;
  }
  function normHof(h) {
    h = obj(h) || { v: 1, entries: [] };
    h.v = 1; if (!Array.isArray(h.entries)) h.entries = [];
    h.entries = h.entries.filter(function (e) { return obj(e) && typeof e.id === 'string'; });
    return h;
  }
  function ensure() { if (!meta) meta = normMeta(save.getJSON(save.KEYS.meta)); if (!hof) hof = normHof(save.getJSON(save.KEYS.hof)); }

  M.get = function () { ensure(); return meta; };
  M.hof = function () { ensure(); return hof.entries; };
  M.today = function () {   // local date, YYYY-MM-DD (tests may replace it)
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  };
  function changed(keys) { GG.emit('meta:changed', { keys: keys }); }
  function writeMeta() {
    var seen = Object.keys(meta.seen);
    if (seen.length > SEEN_CAP) seen.slice(0, seen.length - SEEN_CAP).forEach(function (k) { delete meta.seen[k]; });
    return save.setJSON(save.KEYS.meta, meta);
  }
  function topIds(entries) {
    return entries.map(function (e, i) { return [e, i]; })
      .sort(function (a, b) { return num(b[0].score) - num(a[0].score) || a[1] - b[1]; })
      .slice(0, HOF_TOP).map(function (x) { return x[0].id; });
  }
  function capHof() {
    var E = hof.entries;
    if (E.length <= HOF_CAP) return;
    var top = topIds(E);
    for (var i = E.length - 1; i >= 0 && E.length > HOF_CAP; i--) if (top.indexOf(E[i].id) < 0) E.splice(i, 1);
  }
  function writeHof() {
    var had = save.storageOk;
    if (save.setJSON(save.KEYS.hof, hof)) return true;
    if (had) {
      var top = topIds(hof.entries);
      hof.entries.forEach(function (e) { if (top.indexOf(e.id) < 0) delete e.strip; });
      if (save.setJSON(save.KEYS.hof, hof)) return true;
    }
    if (!quotaSent && had) { quotaSent = true; GG.emit('meta:quota', {}); }
    return false;
  }
  M.save = function () { ensure(); var a = writeMeta(), b = writeHof(); changed(['meta', 'hof']); return a && b; };

  // seed (base 36) + band; a seed-less old save (seed 1) adds a hash of its player, version and first history point.
  M.careerId = function (state) {
    var s = state || {}, seed = (s.seed >>> 0) || 1, id = seed.toString(36) + '.' + (s.bandId || 'band');
    if (seed === 1) id += '.' + GG.hashSeed(((s.player && s.player.name) || '') + (s.createdVersion || '') + JSON.stringify((s.history || [])[0] || null)).toString(36);
    return id;
  };

  M.lessonSeen = function (id) { ensure(); return !!meta.lessons[id]; };
  M.markLesson = function (id) {
    ensure(); if (!id || meta.lessons[id]) return false;
    meta.lessons[id] = 1; writeMeta(); changed(['lessons']); return true;
  };

  // A basic HOF_ENTRY (without at/ver) when 2f_sim_legacy is not loaded; GG.legacy.hofEntry replaces it.
  function basicEntry(state) {
    var s = state, L = obj(s.legacy), st = s.stats || {}, band = GG.career && GG.career.band ? GG.career.band(s) : null;
    var rv = s.rival || {}, regions = (s.tour && s.tour.regions) || {}, bh = s.legacyTrack && s.legacyTrack.bigHead;
    return { id: M.careerId(s), bandId: s.bandId, band: band ? band.name : s.bandId, genre: s.genre, city: s.city,
      seat: s.seat || 'drums', player: { name: (s.player && s.player.name) || '', nick: (s.player && s.player.nick) || '' },
      logo: s.logo ? { emblem: s.logo.emblem, style: s.logo.style, palette: s.logo.palette } : null,
      difficulty: s.careerDifficulty || 'normal', years: Math.ceil(num(s.maxWeeks || 240) / C.WEEKS_PER_YEAR), bonusYears: num(s.bonusYears),
      score: L ? num(L.score) : 0, parts: L && L.parts ? L.parts : {}, tier: L ? L.tier || null : null, specials: L && L.specials ? L.specials.slice() : [],
      lineup: (s.members || []).map(function (m) { return { id: m.id, name: m.name, original: !!m.original, status: m.status }; }),
      rival: { id: rv.id || null, name: GG.rival && GG.rival.name && s.bandId ? GG.rival.name(s) : (rv.name || null) },
      final: s.finalShowdown ? s.finalShowdown.headliner || null : null,
      stats: { fans: num(s.fans), units: num(st.units), loonies: num(st.loonieWins), gongs: ((s.tour && s.tour.gongs) || []).filter(function (g) { return g && g.won; }).length,
        certs: num(st.certs), gigs: num(st.gigs), songs: num(st.songsWritten), albums: (s.albums || []).filter(function (a) { return a && a.released; }).length,
        loans: num(st.parentsLoans), venue: bh ? { name: bh.name, cap: bh.cap } : null,
        broken: Object.keys(regions).filter(function (k) { return regions[k] && regions[k].broken; }).length },
      ach: Object.keys((s.ach && s.ach.got) || {}),
      strip: (s.recaps || []).map(function (r) { return { y: r.y, h: r.headline || '', fans: num(r.fans), era: r.era || null, best: r.best ? r.best.name : null, aw: (r.awards || []).length }; }) };
  }
  function entryFor(state) {
    var e = GG.legacy && GG.legacy.hofEntry ? GG.legacy.hofEntry(state) : basicEntry(state);
    e = Object.assign({}, e);
    e.id = e.id || M.careerId(state); e.seat = e.seat || 'drums';
    e.at = M.today(); e.ver = GG.VERSION;
    return e;
  }
  function fill(dst, src) { ['strip', 'ach', 'parts'].forEach(function (k) { if (dst[k] == null && src[k] != null) dst[k] = src[k]; }); return dst; }
  function bump(e) {
    var c = meta.careers;
    c.finished++;
    c.byBand[e.bandId] = num(c.byBand[e.bandId]) + 1;
    c.bySeat[e.seat || 'drums'] = num(c.bySeat[e.seat || 'drums']) + 1;
    if (!c.best || num(e.score) > num(c.best.score)) c.best = { score: num(e.score), careerId: e.id };
  }
  M.recordCareer = function (state, opts) {
    opts = opts || {}; ensure();
    if (!obj(state)) return null;
    var e = entryFor(state), E = hof.entries, at = -1, fresh = false;
    for (var i = 0; i < E.length; i++) if (E[i].id === e.id) { at = i; break; }
    if (at < 0) { E.unshift(e); fresh = true; bump(e); }
    else if (num(e.score) > num(E[at].score)) {   // a replayed ending of the same career: keep the higher score, count it once
      E[at] = fill(e, E[at]);
      if (!meta.careers.best || num(e.score) > num(meta.careers.best.score)) meta.careers.best = { score: num(e.score), careerId: e.id };
    }
    else e = E[at];
    capHof();
    writeMeta(); writeHof();
    GG.emit('hof:added', { entry: e });
    changed(['hof', 'careers']);
    return { entry: e, fresh: fresh, unlocks: [], ach: [] };
  };

  // Lite (career save codes): META without seen/lessons + the top 10 by score ∪ the newest 10, without strip/ach/parts.
  M.exportLite = function () {
    ensure();
    var m = JSON.parse(JSON.stringify(meta)); delete m.seen; delete m.lessons;
    var top = topIds(hof.entries), keep = hof.entries.filter(function (e, i) { return i < HOF_TOP || top.indexOf(e.id) >= 0; });
    return { v: 1, meta: m, entries: keep.map(function (e) { var x = Object.assign({}, e); delete x.strip; delete x.ach; delete x.parts; return x; }) };
  };
  // Full (the Hall of Fame "Backup code"): META + every entry with its strip and trophies.
  M.exportFull = function () { ensure(); return { v: 1, full: true, meta: JSON.parse(JSON.stringify(meta)), entries: JSON.parse(JSON.stringify(hof.entries)) }; };
  // Merges a lite or full export: entries by id (higher score; missing strip/ach/parts filled from the other), ach by the
  // earliest date, unlocks and lessons by set, counters by max. Returns { added, updated }.
  M.mergeLite = function (o) {
    ensure(); o = obj(o); if (!o) return { added: 0, updated: 0 };
    var im = obj(o.meta) || {}, added = 0, updated = 0, E = hof.entries;
    (Array.isArray(o.entries) ? o.entries : []).forEach(function (x) {
      if (!obj(x) || typeof x.id !== 'string') return;
      x = JSON.parse(JSON.stringify(x));
      var at = -1; for (var i = 0; i < E.length; i++) if (E[i].id === x.id) { at = i; break; }
      if (at < 0) { E.push(x); added++; }
      else if (num(x.score) > num(E[at].score)) { E[at] = fill(x, E[at]); updated++; }
      else { var before = JSON.stringify(E[at]); fill(E[at], x); if (JSON.stringify(E[at]) !== before) updated++; }
    });
    E.sort(function (a, b) { return String(b.at || '') < String(a.at || '') ? -1 : String(b.at || '') > String(a.at || '') ? 1 : 0; });
    capHof();
    var c = meta.careers, ic = obj(im.careers) || {};
    ['started', 'past4', 'finished'].forEach(function (k) { c[k] = Math.max(num(c[k]), num(ic[k])); });
    ['byBand', 'bySeat'].forEach(function (k) { var src = obj(ic[k]) || {}; for (var id in src) c[k][id] = Math.max(num(c[k][id]), num(src[id])); });
    if (obj(ic.best) && (!c.best || num(ic.best.score) > num(c.best.score))) c.best = { score: num(ic.best.score), careerId: ic.best.careerId };
    var ia = obj(im.ach) || {};
    for (var a in ia) if (obj(ia[a]) && (!meta.ach[a] || String(ia[a].at || '9') < String(meta.ach[a].at || '9'))) meta.ach[a] = ia[a];
    var iu = obj(im.unlocks) || {};
    ['palettes', 'emblems', 'parts'].forEach(function (k) { (Array.isArray(iu[k]) ? iu[k] : []).forEach(function (id) { if (meta.unlocks[k].indexOf(id) < 0) meta.unlocks[k].push(id); }); });
    ['lessons', 'seen'].forEach(function (k) { var src = obj(im[k]) || {}; for (var id in src) meta[k][id] = 1; });
    writeMeta(); writeHof(); changed(['meta', 'hof']);
    return { added: added, updated: updated };
  };

  // Stubs (Lane M fills them): achievements across careers and cosmetic unlocks.
  M.award = function (state, ids) { return { ids: ids || [], fresh: [] }; };
  M.has = function (id) { ensure(); return !!meta.ach[id]; };
  M.unlock = function (kind, ids) { return []; };
  M.unlocked = function (kind) { ensure(); return (meta.unlocks[kind] || []).slice(); };

  function scan() {
    var open = false, list = save.list ? save.list() : [];
    list.forEach(function (row) {
      if (!row.exists) return;
      var copy = save.readRecord ? (save.readRecord(row.slot) || {}).state : null;
      if (!obj(copy)) return;
      var id = M.careerId(copy);
      if (copy.totalWeek >= 4 && !meta.seen[id]) { meta.careers.past4++; meta.seen[id] = 1; }
      if (copy.ended) { if (GG.legacy) M.recordCareer(copy, { silent: true }); else open = true; }
    });
    if (!open) meta.scanned = GG.VERSION;
    writeMeta();
  }
  // Reads both keys (memory fallback when storage is missing) and runs the one-time slot scan.
  M.load = function () {
    meta = normMeta(save.getJSON(save.KEYS.meta)); hof = normHof(save.getJSON(save.KEYS.hof));
    if (!meta.scanned) scan();
    return meta;
  };

  GG.on('career:new', function () {
    if (!M.enabled) return;
    ensure(); meta.careers.started++; writeMeta(); changed(['careers']);
  });
  GG.on('week:wrap', function (p) {
    var s = GG.state;
    if (!M.enabled || !obj(s) || !p || !p.wrap || p.wrap.totalWeek < 4) return;
    if (!obj(s.tutorial)) s.tutorial = { on: false, done: {}, past4: false };
    if (s.tutorial.past4) return;
    s.tutorial.past4 = true;
    ensure();
    var id = M.careerId(s);
    if (!meta.seen[id]) { meta.careers.past4++; meta.seen[id] = 1; writeMeta(); changed(['careers']); }
  });
  GG.on('career:end', function (p) {
    if (!M.enabled || !p || !p.state || GG.state !== p.state) return;
    M.recordCareer(p.state);
  });

  GG.registerDebug('meta', function () {
    if (!meta) return { enabled: M.enabled, loaded: false };
    return { enabled: M.enabled, loaded: true, scanned: meta.scanned, careers: meta.careers, lessons: Object.keys(meta.lessons).length,
      ach: Object.keys(meta.ach).length, hof: hof.entries.length };
  });
})(window.GG);
