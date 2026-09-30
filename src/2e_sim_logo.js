// 2e_sim_logo.js (v0.8.1, Addendum 2 D2, LOGO): the band logo's rules. DOM-free, no career RNG (a logo never rolls dice).
// State: state.logo = { emblem, style, palette } (three ids; 02_contracts v0.8.1). Content: GG.content.logo (content/logo.js).
// API (GG.logo):
//   Lists    content() ; emblems() / styles() / palettes() (content order; emblems = C.LOGO_EMBLEMS + additions) ;
//            emblem(id) / style(id) / palette(id) -> def | null
//   Logos    sanitize(logo, bandIdOrGenre?) -> a valid { emblem, style, palette } (bad ids fall back to the band's default) ;
//            defaultFor(bandIdOrGenre) ; get(state) (sanitised, never writes) ; ensure(state) (fills state.logo) ;
//            same(a, b) ; rival(id, genre?) (the fixed logo of a rival / scene band; unknown ids get a stable hashed one) ;
//            findRival(name) -> id | null (by a band's current name, for the Loonies' winners) ; key(logo) ('emblem.style.palette')
//   Rebrand  rebrandCost(state) -> { fund, buzz } ; canRebrand(state, logo) -> { ok, cost, buzz } | { ok: false, why } ;
//            rebrand(state, logo) -> { ok, cost, logo, deltas } | { ok: false, why } (fund − cost, buzz − a little, a chat line)
//   Career   prepare(logo, bandId) (the new-career picker hands its pick over; 'career:new' consumes it) ; pending() ;
//            init(state) ; migrate(state) (chained onto GG.save.migrate: fills state.logo only when missing or broken; never
//            touches state.v)
//   Carry    carry.key(genre) (GG.creator.carry.key(genre) + '.logo') ; carry.read(genre) -> logo | null ; carry.write(state)
//            (this device remembers the last logo per genre, like the creator's unlocks: the picker starts from it)
// Events: 'logo:changed' { state, logo, source: 'new'|'rebrand' }.
(function (GG) {
  var L = GG.logo = {};
  var CT = GG.contracts;
  var FIELDS = ['emblem', 'style', 'palette'];
  var pendingPick = null;

  function K() { return GG.content.logo || { emblems: [], styles: [], palettes: [], bands: {}, rivals: {}, rebrand: {}, lines: {} }; }
  function byId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  L.content = K;
  L.emblems = function () {
    var out = K().emblems.slice();
    (CT.LOGO_EMBLEMS || []).forEach(function (id) { if (!byId(out, id)) out.push({ id: id, name: id, art: {} }); });
    return out;
  };
  L.styles = function () { return K().styles.slice(); };
  L.palettes = function () { return K().palettes.slice(); };
  L.emblem = function (id) { return byId(L.emblems(), id); };
  L.style = function (id) { return byId(K().styles, id); };
  L.palette = function (id) { return byId(K().palettes, id); };
  L.key = function (lg) { lg = lg || {}; return lg.emblem + '.' + lg.style + '.' + lg.palette; };
  L.same = function (a, b) { return !!(a && b) && FIELDS.every(function (f) { return a[f] === b[f]; }); };

  function bandDef(id) { return (GG.content.bands || {})[id] || null; }
  function genreOf(x) {
    var b = bandDef(x);
    if (b) return b.genre;
    return (CT.LOGO_STYLES || []).indexOf(x) >= 0 ? x : 'metal';
  }
  // The band's own default; a genre (or an unknown band) gets its genre's band's logo.
  L.defaultFor = function (x) {
    var bands = K().bands, d = bands[x];
    if (!d) {
      var g = genreOf(x), all = GG.content.bands || {};
      for (var id in all) if (all[id] && all[id].genre === g && bands[id]) { d = bands[id]; break; }
    }
    d = d || { emblem: 'skull', style: genreOf(x), palette: (K().palettes[0] || {}).id || 'frost' };
    return { emblem: d.emblem, style: d.style, palette: d.palette };
  };
  L.sanitize = function (lg, x) {
    var def = L.defaultFor(x || 'hail_damage'), o = lg && typeof lg === 'object' ? lg : {};
    return {
      emblem: L.emblem(o.emblem) ? o.emblem : def.emblem,
      style: L.style(o.style) ? o.style : def.style,
      palette: L.palette(o.palette) ? o.palette : def.palette
    };
  };
  L.get = function (state) { return L.sanitize(state && state.logo, state && state.bandId); };
  L.ensure = function (state) {
    if (!state || typeof state !== 'object') return null;
    var ok = state.logo && typeof state.logo === 'object' && L.same(state.logo, L.sanitize(state.logo, state.bandId));
    if (!ok) state.logo = L.get(state);
    return state.logo;
  };

  // Rivals: fixed logos from content ({ same } aliases the scene copies of the big rivals); anything else hashes its id.
  L.rival = function (id, genre) {
    var r = K().rivals || {}, d = r[id], n = 0;
    while (d && d.same && n++ < 4) d = r[d.same];
    if (d && d.emblem) return { emblem: d.emblem, style: d.style, palette: d.palette };
    var h = GG.hashSeed('logo|' + id), em = L.emblems(), pa = K().palettes;
    return { emblem: em.length ? em[h % em.length].id : 'skull', style: (CT.LOGO_STYLES || []).indexOf(genre) >= 0 ? genre : (CT.LOGO_STYLES || ['metal'])[(h >>> 8) % 4],
      palette: pa.length ? pa[(h >>> 12) % pa.length].id : 'frost' };
  };
  L.findRival = function (name) {
    if (!name) return null;
    var n = String(name).toLowerCase(), rv = GG.state && GG.state.rival;
    if (rv && (String(rv.name || '').toLowerCase() === n || String(rv.formerName || '').toLowerCase() === n)) return rv.id;
    var all = GG.content.rivals || {};
    for (var id in all) if (all[id] && String(all[id].name).toLowerCase() === n) return id;
    var sc = (GG.content.rivalry && GG.content.rivalry.scene) || [];
    for (var i = 0; i < sc.length; i++) if (String(sc[i].name).toLowerCase() === n) return sc[i].id;
    return null;
  };

  /* ---- Rebrand (the laptop): a small fee + a little buzz ------------------------------------------------------------ */
  L.rebrandCost = function (state) {
    var rb = K().rebrand || {}, c = rb.cost || {};
    var fund = c[state && state.era] != null ? c[state.era] : (c.garage != null ? c.garage : 150);
    return { fund: Math.round(fund), buzz: Math.round(rb.buzz != null ? rb.buzz : 3) };
  };
  function fail(why) { return { ok: false, why: why }; }
  L.canRebrand = function (state, lg) {
    if (!state) return fail('No band yet.');
    var cur = L.get(state), next = L.sanitize(lg, state.bandId), c = L.rebrandCost(state);
    if (L.same(cur, next)) return fail('That is the logo you already have.');
    if ((state.fund || 0) < c.fund) return fail('Not enough in the fund (' + GG.util.fmtMoney(c.fund) + ').');
    return { ok: true, cost: c.fund, buzz: c.buzz };
  };
  function chat(state, list, d) {
    if (!GG.career || !GG.career.postChat || !list || !list.length) return null;
    var act = (state.members || []).filter(function (m) { return m && m.status === 'active'; });
    var mine = list.filter(function (x) { return act.some(function (m) { return m.id === x.who; }); });
    var line = mine.length ? mine[(state.totalWeek || 0) % mine.length] : null;
    if (!line) return null;   // nobody in this band says any of these lines
    return GG.career.postChat(state, line.who, line.text, d || null);
  }
  L.rebrand = function (state, lg) {
    var c = L.canRebrand(state, lg);
    if (!c.ok) return c;
    var d = {}, next = L.sanitize(lg, state.bandId);
    if (GG.career && GG.career.applyEffects) GG.career.applyEffects(state, { fund: -c.cost, buzz: -c.buzz }, d);
    else { state.fund -= c.cost; state.buzz = Math.max(0, (state.buzz || 0) - c.buzz); }
    state.logo = next;
    chat(state, (K().lines || {}).rebrand, d);
    L.carry.write(state);
    GG.emit('logo:changed', { state: state, logo: next, source: 'rebrand' });
    GG.emit('stats:changed', { state: state });
    return { ok: true, cost: c.cost, buzz: c.buzz, logo: next, deltas: d };
  };

  /* ---- New careers ---------------------------------------------------------------------------------------------------- */
  L.prepare = function (lg, bandId) { pendingPick = lg ? { logo: L.sanitize(lg, bandId), bandId: bandId || null } : null; return pendingPick; };
  L.pending = function (bandId) { return pendingPick && (!bandId || !pendingPick.bandId || pendingPick.bandId === bandId) ? pendingPick.logo : null; };
  L.init = function (state) {
    var p = pendingPick; pendingPick = null;
    var picked = p && (!p.bandId || p.bandId === state.bandId);
    state.logo = picked ? L.sanitize(p.logo, state.bandId) : L.defaultFor(state.bandId);
    if (picked) { chat(state, (K().lines || {}).picked, null); L.carry.write(state); }
    GG.emit('logo:changed', { state: state, logo: state.logo, source: 'new' });
    return state.logo;
  };
  L.migrate = function (s) {
    if (!s || typeof s !== 'object') return s;
    L.ensure(s);
    return s;
  };

  /* ---- Carry-over (this device, per genre; the cosmetics rule, next to the creator's unlocks) --------------------------- */
  function store() { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; } }
  L.carry = {
    key: function (genre) { return (GG.creator && GG.creator.carry ? GG.creator.carry.key(genre) : 'gg.v1.unlocks.' + (genre || 'metal')) + '.logo'; },
    read: function (genre) {
      var s = store(), raw = null;
      try { raw = s ? s.getItem(L.carry.key(genre)) : null; } catch (e) { raw = null; }
      var o = null;
      try { o = raw ? JSON.parse(raw) : null; } catch (e) { o = null; }
      if (!o || typeof o !== 'object' || !L.emblem(o.emblem) || !L.style(o.style) || !L.palette(o.palette)) return null;
      return { emblem: o.emblem, style: o.style, palette: o.palette };
    },
    write: function (state) {
      if (!state || !state.genre || !state.logo) return false;
      var s = store();
      try { if (!s) return false; s.setItem(L.carry.key(state.genre), JSON.stringify(L.get(state))); return true; } catch (e) { return false; }
    }
  };

  /* ---- Hooks ------------------------------------------------------------------------------------------------------------ */
  GG.on('career:new', function (p) { if (p && p.state) L.init(p.state); });
  if (GG.save && GG.save.migrate && !GG.save.migrate.logo) {
    var prevMigrate = GG.save.migrate;
    GG.save.migrate = function (s) { return L.migrate(prevMigrate(s)); };
    GG.save.migrate.logo = true;
  }

  GG.registerDebug('logo', function () {
    var st = GG.state;
    return { logo: st ? L.get(st) : null, key: st ? L.key(L.get(st)) : null, pending: pendingPick ? L.key(pendingPick.logo) : null,
      emblems: L.emblems().length, styles: K().styles.length, palettes: K().palettes.length, cost: st ? L.rebrandCost(st) : null };
  });
})(window.GG);
