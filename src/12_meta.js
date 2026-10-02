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
// Lane M (v1.0, plan_contract_1.0 §4.5–4.6):
//   award(state, ids, opts?) -> { ids, fresh } (META.ach[id] = { at, band, y } the first time across careers; 'meta:ach'
//   { ids, fresh } unless opts.silent; the toast shows only `fresh`) · has(id) · unlock(kind, ids) -> [newly unlocked ids]
//   (kind 'palettes' | 'emblems' | 'parts'; 'meta:changed') · unlocked(kind) -> [ids] · isUnlocked(kind, id) ·
//   unlocksFor(entry, state?) -> { palettes, emblems, parts } (what a finished career earns: Q5, cosmetic only) ·
//   unlockNames(kind, ids) · achInfo(id) -> META.ach[id] | null.
//   recordCareer also: derives the cosmetic unlocks (first time a tier → its palette (content/logo.js `meta: 'tier:<id>'`),
//   first time a special → its emblem or palette (`meta: 'special:<id>'`, or GG.content.endings specials[].unlock), the
//   creator parts the career unlocked → META.unlocks.parts, offered in every genre) and the 'meta' achievements
//   (GG.achieve.metaIds: Lifer, Prairie Grand Slam) on a fresh entry. The entry keeps what it unlocked (`unlocks`) and the
//   meta achievements it earned (`mach`), so a replayed end screen shows the same summary; events fire only for new ids.
//   Listener: 'ach:earned' (GG.achieve) -> award(GG.state, ids) when enabled.
(function (GG) {
  var C = GG.contracts, save = GG.save;
  var M = GG.meta = GG.meta || {};
  var HOF_CAP = 40, HOF_TOP = 10, SEEN_CAP = 200, UNLOCK_KINDS = ['palettes', 'emblems', 'parts'];
  M.enabled = false;
  var meta = null, hof = null, quotaSent = false, works = null;

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
  function ensure() { if (works === null) works = save.storageOk !== false; if (!meta) meta = normMeta(save.getJSON(save.KEYS.meta)); if (!hof) hof = normHof(save.getJSON(save.KEYS.hof)); }

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
  // Lane M: `works` = this browser's storage worked when meta was first read (10_save's fail() flips save.storageOk to false
  // on any failed write, a quota miss included). A retry that succeeds proves storage works, so it puts storageOk back.

  function writeHof() {
    if (works === null) works = save.storageOk !== false;
    if (save.setJSON(save.KEYS.hof, hof)) return true;
    if (works) {
      var top = topIds(hof.entries);
      hof.entries.forEach(function (e) { if (top.indexOf(e.id) < 0) delete e.strip; });
      if (save.setJSON(save.KEYS.hof, hof)) { save.storageOk = true; return true; }
    }
    if (!quotaSent && works) { quotaSent = true; GG.emit('meta:quota', {}); }
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
        certs: num(st.certs), gigs: num(st.gigs), songs: num(st.songsWritten), albums: (s.albums || []).filter(function (a) { return a && a.status === 'released'; }).length,
        loans: num(st.parentsLoans), venue: bh ? { name: bh.name, cap: bh.cap } : null,
        broken: Object.keys(regions).filter(function (k) { return regions[k] && regions[k].broken; }).length },
      ach: Object.keys((s.ach && s.ach.got) || {}),
      strip: (s.recaps || []).map(function (r) { return { y: r.y, h: r.headline || '', fans: num(r.fans), era: r.era || null, best: r.best ? r.best.name : null, aw: (r.awards || []).length }; }) };
  }
  // Lane M: GG.legacy.hofEntry's fields win; any field it leaves out (or undefined) comes from the basic entry (the UI and the
  // unlocks always find logo, lineup, ach, strip, stats).
  function entryFor(state) {
    var e = basicEntry(state), L = GG.legacy && GG.legacy.hofEntry ? GG.legacy.hofEntry(state) : null;
    if (obj(L)) for (var k in L) if (L[k] !== undefined) e[k] = L[k];
    e.id = e.id || M.careerId(state); e.seat = e.seat || 'drums';
    e.at = M.today(); e.ver = GG.VERSION;
    return e;
  }
  function fill(dst, src) { ['strip', 'ach', 'parts', 'unlocks', 'mach'].forEach(function (k) { if (dst[k] == null && src[k] != null) dst[k] = src[k]; }); return dst; }
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
      var old = E[at];
      E[at] = fill(e, old);
      if (old.unlocks) e.unlocks = old.unlocks;
      if (old.mach) e.mach = old.mach;
      if (!meta.careers.best || num(e.score) > num(meta.careers.best.score)) meta.careers.best = { score: num(e.score), careerId: e.id };
    }
    else {   // the same (or a lower) score: keep the stored entry, but take in trophies earned since it was written
      var cur = e; e = E[at];   // (a v0.9 ended slot recorded by the slot scan has no trophies until its ending is played)
      e.ach = Array.isArray(e.ach) ? e.ach : [];
      (Array.isArray(cur.ach) ? cur.ach : []).forEach(function (id) { if (e.ach.indexOf(id) < 0) e.ach.push(id); });
    }
    // Q5: cosmetic unlocks (first time across careers); the entry remembers what it unlocked.
    var news = [], want = M.unlocksFor(e, state);
    UNLOCK_KINDS.forEach(function (k) {
      var ids = addUnlocks(k, want[k]);
      if (!ids.length) return;
      e.unlocks = e.unlocks || {};
      e.unlocks[k] = (e.unlocks[k] || []).concat(ids.filter(function (id) { return (e.unlocks[k] || []).indexOf(id) < 0; }));
      news.push({ kind: k, ids: ids, names: M.unlockNames(k, ids) });
    });
    // 'meta' achievements (Lifer, Prairie Grand Slam) on a fresh entry, after the counters moved
    var mach = [];
    if (fresh && GG.achieve && GG.achieve.metaIds) {
      mach = GG.achieve.metaIds(meta.careers, state).filter(function (id) { return !meta.ach[id]; });
      if (mach.length) {
        e.mach = mach.slice();
        e.ach = (Array.isArray(e.ach) ? e.ach : []).concat(mach.filter(function (id) { return (e.ach || []).indexOf(id) < 0; }));
        if (obj(state.ach) && obj(state.ach.got)) mach.forEach(function (id) { if (state.ach.got[id] == null) state.ach.got[id] = num(state.totalWeek); });
      }
    }
    capHof();
    writeMeta(); writeHof();
    if (mach.length) M.award(state, mach, { silent: !!opts.silent });
    GG.emit('hof:added', { entry: e });
    if (!opts.silent) news.forEach(function (u) { GG.emit('meta:unlock', u); });
    changed(['hof', 'careers'].concat(news.length ? ['unlocks'] : []));
    var all = UNLOCK_KINDS.filter(function (k) { return e.unlocks && e.unlocks[k] && e.unlocks[k].length; })
      .map(function (k) { return { kind: k, ids: e.unlocks[k].slice(), names: M.unlockNames(k, e.unlocks[k]), fresh: news.some(function (u) { return u.kind === k; }) }; });
    return { entry: e, fresh: fresh, unlocks: all, ach: (e.mach || []).slice() };
  };

  // Lite (career save codes): META without seen/lessons + the top 10 by score ∪ the newest 10, without strip/ach/parts.
  M.exportLite = function () {
    ensure();
    var m = JSON.parse(JSON.stringify(meta)); delete m.seen; delete m.lessons;
    var top = topIds(hof.entries), keep = hof.entries.filter(function (e, i) { return i < HOF_TOP || top.indexOf(e.id) >= 0; });
    return { v: 1, meta: m, entries: keep.map(function (e) { var x = Object.assign({}, e); delete x.strip; delete x.ach; delete x.parts; delete x.unlocks; delete x.mach; return x; }) };
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

  /* ---- Achievements across careers ------------------------------------------------------------------------------------ */
  // ids earned by `state` (GG.achieve 'ach:earned', or the meta rows in recordCareer): the first time across careers stamps
  // { at, band, y }; `fresh` = those first times (the only ones that toast).
  M.award = function (state, ids, opts) {
    ensure();
    ids = (Array.isArray(ids) ? ids : []).filter(function (id) { return typeof id === 'string' && id; });
    var fresh = [], s = obj(state) || {};
    ids.forEach(function (id) {
      if (meta.ach[id]) return;
      meta.ach[id] = { at: M.today(), band: s.bandId || null, y: isFinite(s.year) ? s.year : null };
      fresh.push(id);
    });
    if (fresh.length) { writeMeta(); changed(['ach']); }
    if (ids.length && !(opts && opts.silent)) GG.emit('meta:ach', { ids: ids, fresh: fresh });
    return { ids: ids, fresh: fresh };
  };
  M.has = function (id) { ensure(); return !!meta.ach[id]; };
  M.achInfo = function (id) { ensure(); return meta.ach[id] ? Object.assign({}, meta.ach[id]) : null; };

  /* ---- Cosmetic unlocks (Q5: looks from finished careers; nothing changes gameplay) ---------------------------------------- */

  function addUnlocks(kind, ids) {
    if (UNLOCK_KINDS.indexOf(kind) < 0) return [];
    var list = meta.unlocks[kind], out = [];
    (Array.isArray(ids) ? ids : []).forEach(function (id) { if (typeof id === 'string' && id && list.indexOf(id) < 0 && out.indexOf(id) < 0) { list.push(id); out.push(id); } });
    return out;
  }
  M.unlock = function (kind, ids) {
    ensure();
    var out = addUnlocks(kind, ids);
    if (out.length) { writeMeta(); changed(['unlocks']); }
    return out;
  };
  M.unlocked = function (kind) { ensure(); return (meta.unlocks[kind] || []).slice(); };
  M.isUnlocked = function (kind, id) { ensure(); return (meta.unlocks[kind] || []).indexOf(id) >= 0; };
  function metaKeys(m) { return m == null ? [] : Array.isArray(m) ? m : [m]; }
  // What a finished career (its HOF entry; the state for its creator parts) earns: palettes / emblems whose content `meta`
  // key matches 'tier:<tier>' or 'special:<id>' (content/logo.js), Lane E's endings specials[].unlock, and every gated creator
  // part the career unlocked. Pure: never writes.
  M.unlocksFor = function (e, state) {
    var out = { palettes: [], emblems: [], parts: [] };
    e = obj(e) || {};
    var keys = [], sp = Array.isArray(e.specials) ? e.specials : [];
    if (e.tier) keys.push('tier:' + e.tier);
    sp.forEach(function (id) { keys.push('special:' + id); });
    var K = GG.content.logo || {};
    [['palettes', K.palettes], ['emblems', K.emblems]].forEach(function (p) {
      (p[1] || []).forEach(function (d) { if (d && metaKeys(d.meta).some(function (k) { return keys.indexOf(k) >= 0; }) && out[p[0]].indexOf(d.id) < 0) out[p[0]].push(d.id); });
    });
    var ES = GG.content.endings && GG.content.endings.specials;
    (Array.isArray(ES) ? ES : []).forEach(function (d) {
      if (!d || sp.indexOf(d.id) < 0 || !obj(d.unlock)) return;
      if (d.unlock.emblem && out.emblems.indexOf(d.unlock.emblem) < 0) out.emblems.push(d.unlock.emblem);
      if (d.unlock.palette && out.palettes.indexOf(d.unlock.palette) < 0) out.palettes.push(d.unlock.palette);
    });
    var cr = obj(state) && obj(state.unlocks) && Array.isArray(state.unlocks.creator) ? state.unlocks.creator : [];
    cr.forEach(function (id) {
      var p = GG.creator && GG.creator.part ? GG.creator.part(id) : null;
      if (p && p.gate && out.parts.indexOf(id) < 0) out.parts.push(id);
    });
    return out;
  };
  M.unlockNames = function (kind, ids) {
    return (ids || []).map(function (id) {
      var d = kind === 'palettes' ? GG.logo && GG.logo.palette(id) : kind === 'emblems' ? GG.logo && GG.logo.emblem(id) : GG.creator && GG.creator.part(id);
      return (d && d.name) || id;
    });
  };
  GG.on('ach:earned', function (p) {
    if (!M.enabled || !p || !obj(GG.state)) return;
    M.award(GG.state, p.ids);
  });

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
    if (works === null) works = save.storageOk !== false;
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
      ach: Object.keys(meta.ach).length, hof: hof.entries.length, unlocks: { palettes: meta.unlocks.palettes.length, emblems: meta.unlocks.emblems.length, parts: meta.unlocks.parts.length }, quota: quotaSent };
  });
})(window.GG);
