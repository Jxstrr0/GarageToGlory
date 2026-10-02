// 2b_sim_creator.js (v0.8 "Kit", Addendum 1 C2): the full character creator's rules. DOM-free and deterministic (no RNG in
// the career path; unlocks are pure functions of state). Content: GG.content.creator (content/creator.js).
// State (02_contracts v0.8): player.look (everyday LOOK), player.stageLook (LOOK: gigs, the red carpet, stage scenes),
// player.kit (KIT_LOOK; player.kitColor mirrors kit.color), unlocks: { creator: [partId], news: [partId] (unannounced) }.
// API (GG.creator):
//   Parts   cats() ; part(id) ; partsIn(cat) ; partFor(cat, value) ; parts(state, cat?) -> [{ id, cat, value, name, color?, hint?,
//           locked, why }] ; isUnlocked(state, id) ; gateMet(state, gate) ; gateText(gate) ; draftState(genre, carry) (the
//           new-career screen has no state yet)
//   Unlocks grant(state, id) ; checkUnlocks(state) -> [newly unlocked ids] ; weekly(state, wrap) (the week-end hook: a wrap
//           milestone line + wrap.creator { unlocked }) ; check(state, source) (event hook: 'creator:unlocked')
//   Looks   sanitizeLook(look) (valid ids/colours; knuckles A–Z, 4 per hand; a legacy LOOK stays legacy) ; knuckles(text) ;
//           expand(look) (legacy -> every v0.8 field, drawn the same where a match exists) ; lockLook(state, look) /
//           lockKit(state, kit) (locked parts -> defaults) ; syncPerson(from, to) (body/face/hair/ink are shared) ; stageOnly(look)
//           stageLookFor(who, contentMember?) (player | member -> the LOOK for stage scenes) ; isV8(look)
//   Kit     sanitizeKit(kit, fallbackColor) ; kitLook(player) (normalised; legacy players get the v0.7 kit) ; legacyKit(color) ;
//           newKit(color) ; isArena(venue|gig) (pyro only there) ; headText(text)
//   Career  init(state, opts) ('career:new' consumes prepare()) ; prepare({ look, stageLook, kit, carry }) ; migrate(state)
//           (chained onto GG.save.migrate: fills player.stageLook / player.kit / unlocks only when missing; never state.v) ;
//           apply(state, { look, stageLook, kit }) -> { look, stageLook, kit } (sanitised + lock-checked; 'creator:changed')
//   Carry   carry.key(genre) ; carry.read(genre) -> [ids] ; carry.write(state) ; carry.count(genre)   (localStorage
//           'gg.v1.unlocks.<genre>', every access wrapped; unlocks carry over within the same genre)
// Events: 'creator:unlocked' { ids, names, source: 'week'|'event' } ; 'creator:changed' { state }.
// No gong on the drum kit, ever (KIT_LOOK extras are cowbell / fan / pyro).
// v0.9: newKit(color, bandId) / lockKit use the band's tier-0 throne (bands.js throne: crate / bucket / haybale) ; bandThrone(id).
// v1.0 (Q5 meta unlocks): metaPart(id) = a part some finished career unlocked (GG.meta 'parts', when GG.meta.enabled); it counts
//   as unlocked in every genre (isUnlocked, lockLook, the pickers) and parts() flags it meta: true (the 🏆 chip). checkUnlocks
//   still grants by the career's own progress only, so state.unlocks and the wrap lines never depend on this device.
(function (GG) {
  var C = GG.creator = {};
  var CT = GG.contracts, U = GG.util;
  var HEX = /^#[0-9a-f]{6}$/i;
  var LEGACY_HAIR = ['short', 'long', 'mohawk', 'bald', 'bun', 'mullet', 'spiky', 'cap'];
  var LEGACY_EXTRAS = (CT.LOOK_EXTRAS || []).concat(['cowboy']);
  var LEGACY_TOPS = ['tee', 'longsleeve', 'flannel', 'hoodie', 'jacket'];
  // Fields that make a LOOK a v0.8 look (the renderer's v0.8 path). A LOOK without any of them renders exactly as in v0.7.
  var V8_KEYS = ['age', 'face', 'facialHair', 'glasses', 'bottom', 'shoes', 'headwear', 'outfit', 'stageExtras', 'tattoos', 'knuckles', 'piercings'];
  var PERSON = ['skin', 'hair', 'hairStyle', 'height', 'build', 'age', 'face', 'facialHair', 'glasses', 'tattoos', 'knuckles', 'piercings'];
  var FACE_KEYS = ['shape', 'eyes', 'brows', 'nose', 'mouth'];
  var DEF = { age: 'fresh', facialHair: 'clean', glasses: 'none', top: 'tee', bottom: 'jeans', shoes: 'sneakers', headwear: 'none', outfit: 'none',
    face: { shape: 'classic', eyes: 'dot', eyeColor: '#5a3a22', brows: 'straight', nose: 'button', mouth: 'flat' } };
  var KIT_DEF = { shell: 'paint', hardware: 'chrome', head: 'plain', throne: 'stool', sticks: '#d8b27a' };
  var ARM = { halfL: 'L', sleeveL: 'L', halfR: 'R', sleeveR: 'R' };
  var ERA_TEXT = { garage: 'Start', local: 'Reach Local Heroes', signed: 'Get signed (a label or a DIY album)', world: 'Reach the World Stage' };
  var MILESTONE_TEXT = { firstGig: 'Play your first gig', firstSong: 'Write your first song', localHeroes: 'Reach Local Heroes', signed: 'Get signed' };
  var AWARD_TEXT = { gold: 'Go gold', platinum: 'Go platinum', loonie: 'Win a Loonie', gong: 'Win the Global Gong', greymug: 'Play the Grey Mug halftime show' };
  var pending = null;

  function content() { return GG.content.creator || { cats: {}, parts: [], swatches: {}, builds: {} }; }
  var index = null, byCat = null;
  function build() {
    if (index && index.src === content().parts) return;
    index = { src: content().parts }; byCat = {};
    content().parts.forEach(function (p) { index[p.id] = p; (byCat[p.cat] = byCat[p.cat] || []).push(p); });
  }
  C.cats = function () { return content().cats; };
  C.part = function (id) { build(); return index[id] || null; };
  C.partsIn = function (cat) { build(); return (byCat[cat] || []).slice(); };
  C.partFor = function (cat, value) { return C.part(cat + '.' + value); };
  function values(cat) { return C.partsIn(cat).map(function (p) { return p.value; }); }
  function valid(cat, v) { return typeof v === 'string' && !!C.partFor(cat, v); }
  function clone(o) { return U.clone(o); }

  /* ---- Gates + unlocks ---------------------------------------------------------------------------------------------- */
  function trophyKinds(state) { return (state.trophies || []).map(function (t) { return t && t.kind; }); }
  C.gateMet = function (state, gate) {
    if (!gate) return true;
    state = state || {};
    if (gate.genreStart && gate.genreStart.indexOf(state.genre) >= 0) return true;
    if (gate.era) return CT.ERAS.indexOf(state.era || 'garage') >= CT.ERAS.indexOf(gate.era);
    if (gate.fans != null) return (state.fans || 0) >= gate.fans;
    if (gate.milestone) return !!(state.milestones && state.milestones[gate.milestone]);
    if (gate.gigs != null) return ((state.stats && state.stats.gigs) || 0) >= gate.gigs;
    if (gate.award) {
      var k = trophyKinds(state), want = gate.award;
      var any = want === 'gold' ? ['gold', 'platinum', 'platinum_fi'] : want === 'platinum' ? ['platinum', 'platinum_fi'] : [want];
      return k.some(function (x) { return any.indexOf(x) >= 0; });
    }
    return false;
  };
  C.gateText = function (gate) {
    if (!gate) return 'Unlocked from the start';
    if (gate.era) return ERA_TEXT[gate.era] || gate.era;
    if (gate.fans != null) return 'Reach ' + U.fmtNum(gate.fans) + ' fans';
    if (gate.milestone) return MILESTONE_TEXT[gate.milestone] || gate.milestone;
    if (gate.gigs != null) return 'Play ' + gate.gigs + ' gigs';
    if (gate.award) return AWARD_TEXT[gate.award] || 'Win ' + gate.award;
    return 'Keep going';
  };
  function list(state) {
    var u = state && state.unlocks;
    return u && Array.isArray(u.creator) ? u.creator : [];
  }
  // Unlocked by this career (or its genre's start) alone: the sim's own rule (checkUnlocks grants by it, so the career's
  // unlock list and wrap lines never depend on this device's meta storage).
  function ownPart(state, id) {
    var p = C.part(id);
    if (!p) return false;
    if (!p.gate) return true;
    if (p.gate.genreStart && state && p.gate.genreStart.indexOf(state.genre) >= 0) return true;
    return list(state).indexOf(id) >= 0;
  }
  // v1.0 (Q5): creator parts unlocked in any finished career (GG.meta.unlocked('parts'), browser only) work in every genre.
  C.metaPart = function (id) {
    var M = GG.meta;
    return !!(M && M.enabled && M.isUnlocked && C.part(id) && M.isUnlocked('parts', id));
  };
  C.isUnlocked = function (state, id) { return ownPart(state, id) || C.metaPart(id); };
  C.parts = function (state, cat) {
    build();
    var src = cat ? (byCat[cat] || []) : content().parts;
    return src.map(function (p) {
      var mine = ownPart(state, p.id), locked = !mine && !C.metaPart(p.id);
      var o = { id: p.id, cat: p.cat, value: p.value, name: p.name, locked: locked, why: locked ? C.gateText(p.gate) : '' };
      if (!mine && !locked) o.meta = true;   // the 🏆 chip: here from a finished career
      if (p.color) o.color = p.color;
      if (p.hint) o.hint = p.hint;
      return o;
    });
  };
  function ensureUnlocks(state) {
    if (!state.unlocks || typeof state.unlocks !== 'object' || Array.isArray(state.unlocks)) state.unlocks = {};
    if (!Array.isArray(state.unlocks.creator)) state.unlocks.creator = [];
    if (!Array.isArray(state.unlocks.news)) state.unlocks.news = [];
    return state.unlocks;
  }
  C.grant = function (state, id) {
    var p = C.part(id);
    if (!p || !p.gate) return false;
    var u = ensureUnlocks(state);
    if (u.creator.indexOf(id) >= 0) return false;
    u.creator.push(id);
    return true;
  };
  // Adds every gated part whose gate is met now. Returns the newly unlocked ids (content order).
  C.checkUnlocks = function (state) {
    if (!state) return [];
    build();
    var out = [];
    content().parts.forEach(function (p) {
      if (!p.gate || ownPart(state, p.id)) return;
      if (C.gateMet(state, p.gate) && C.grant(state, p.id)) out.push(p.id);
    });
    return out;
  };
  function names(ids) { return ids.map(function (id) { var p = C.part(id); return p ? p.name : id; }); }
  // Event hook (a Loonie, a gold record, the Gong mid-week): unlock now, remember it for the wrap, tell the UI.
  C.check = function (state, source) {
    var ids = C.checkUnlocks(state);
    if (!ids.length) return ids;
    var u = ensureUnlocks(state);
    ids.forEach(function (id) { if (u.news.indexOf(id) < 0) u.news.push(id); });
    C.carry.write(state);
    GG.emit('creator:unlocked', { ids: ids, names: names(ids), source: source || 'event' });
    return ids;
  };
  // Week-end hook: everything unlocked this week (incl. mid-week events) becomes one wrap milestone line.
  C.weekly = function (state, wrap) {
    var fresh = C.checkUnlocks(state), u = ensureUnlocks(state);
    var all = u.news.concat(fresh.filter(function (id) { return u.news.indexOf(id) < 0; }));
    u.news = [];
    if (!all.length) return [];
    C.carry.write(state);
    if (wrap) {
      var n = names(all);
      wrap.milestones = (wrap.milestones || []).concat(['New look unlocked: ' + (n.length > 4 ? n.slice(0, 4).join(', ') + ' + ' + (n.length - 4) + ' more' : n.join(', ')) + ' (☰ → Look).']);
      wrap.creator = { unlocked: all };
    }
    if (fresh.length) GG.emit('creator:unlocked', { ids: fresh, names: names(fresh), source: 'week' });
    return all;
  };
  // The new-career screen's stand-in state: nothing earned yet, plus the carried-over unlocks for this genre.
  C.draftState = function (genre, carry) {
    return { genre: genre || 'metal', era: 'garage', fans: 0, milestones: {}, trophies: [], stats: { gigs: 0 },
      unlocks: { creator: carry ? C.carry.read(genre || 'metal') : [], news: [] } };
  };

  /* ---- Looks -------------------------------------------------------------------------------------------------------- */
  C.knuckles = function (text) { return String(text == null ? '' : text).toUpperCase().replace(/[^A-Z]/g, '').slice(0, content().knuckleMax || 4); };
  C.headText = function (text) {
    return String(text == null ? '' : text).replace(/[^A-Za-z0-9 !?&'.\-#]/g, '').replace(/\s+/g, ' ').trim().toUpperCase()
      .slice(0, (content().words || {}).headTextMax || 14).trim();
  };
  C.isV8 = function (look) {
    if (!look || typeof look !== 'object') return false;
    for (var i = 0; i < V8_KEYS.length; i++) if (look[V8_KEYS[i]] !== undefined) return true;
    return !!((valid('top', look.top) && LEGACY_TOPS.indexOf(look.top) < 0) || (valid('hairStyle', look.hairStyle) && LEGACY_HAIR.indexOf(look.hairStyle) < 0));
  };
  function col(v, d) { return typeof v === 'string' && HEX.test(v) ? v.toLowerCase() : d; }
  function num(v, lo, hi, d) { return typeof v === 'number' && isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; }
  function uniq(a) { var o = []; a.forEach(function (x) { if (o.indexOf(x) < 0) o.push(x); }); return o; }
  // A clean LOOK. Legacy fields always; v0.8 fields only when the input has them (a v0.7 LOOK stays a v0.7 LOOK).
  C.sanitizeLook = function (look) {
    look = look && typeof look === 'object' ? look : {};
    var hairOk = values('hairStyle').concat(LEGACY_HAIR);
    var o = {
      skin: col(look.skin, '#f0c9a4'), hair: col(look.hair, '#5c3a22'),
      hairStyle: hairOk.indexOf(look.hairStyle) >= 0 ? look.hairStyle : 'short',
      shirt: col(look.shirt, '#e1a236'), pants: col(look.pants, '#34405e'),
      height: num(look.height, 0.85, 1.15, 1), build: num(look.build, 0.85, 1.25, 1),
      extras: Array.isArray(look.extras) ? uniq(look.extras.filter(function (x) { return LEGACY_EXTRAS.indexOf(x) >= 0; })).slice(0, 6) : []
    };
    if (look.top !== undefined) o.top = valid('top', look.top) ? look.top : 'tee';
    if (look.capColor !== undefined && HEX.test(look.capColor)) o.capColor = look.capColor.toLowerCase();
    if (look.age !== undefined) o.age = valid('age', look.age) ? look.age : DEF.age;
    if (look.face !== undefined) {
      var f = look.face && typeof look.face === 'object' ? look.face : {};
      o.face = {};
      FACE_KEYS.forEach(function (k) { o.face[k] = valid(k, f[k]) ? f[k] : DEF.face[k]; });
      o.face.eyeColor = col(f.eyeColor, DEF.face.eyeColor);
    }
    ['facialHair', 'glasses', 'bottom', 'shoes', 'headwear', 'outfit'].forEach(function (k) {
      if (look[k] !== undefined) o[k] = valid(k, look[k]) ? look[k] : DEF[k];
    });
    if (look.stageExtras !== undefined) o.stageExtras = Array.isArray(look.stageExtras) ? uniq(look.stageExtras.filter(function (x) { return valid('stageExtra', x); })) : [];
    if (look.piercings !== undefined) o.piercings = Array.isArray(look.piercings) ? uniq(look.piercings.filter(function (x) { return valid('piercing', x); })) : [];
    if (look.tattoos !== undefined) {
      var seen = {}, arms = {};
      var ts = (Array.isArray(look.tattoos) ? look.tattoos : []).filter(function (t) {
        return t && valid('tatSpot', t.spot) && t.spot !== 'knuckles' && (t.spot === 'teardrop' || valid('tatDesign', t.design));
      });
      ts.forEach(function (t) { if (ARM[t.spot] && /^sleeve/.test(t.spot)) arms[ARM[t.spot]] = true; });   // a full sleeve wins over a half
      o.tattoos = [];
      ts.forEach(function (t) {
        if (seen[t.spot] || (ARM[t.spot] && /^half/.test(t.spot) && arms[ARM[t.spot]])) return;
        seen[t.spot] = true;
        o.tattoos.push({ spot: t.spot, design: t.spot === 'teardrop' ? 'tear' : t.design });
      });
    }
    if (look.knuckles !== undefined) {
      var k = look.knuckles && typeof look.knuckles === 'object' ? look.knuckles : {};
      o.knuckles = { left: C.knuckles(k.left), right: C.knuckles(k.right) };
    }
    return o;
  };
  // Every v0.8 field filled; legacy extras/hair map onto the matching v0.8 parts (drawn the same way).
  C.expand = function (look) {
    var L = C.sanitizeLook(look), ex = L.extras || [];
    var has = function (x) { return ex.indexOf(x) >= 0; };
    var o = clone(L);
    o.extras = [];
    if (o.hairStyle === 'cap') { o.hairStyle = 'short'; if (L.headwear === undefined) o.headwear = 'backcap'; }
    if (o.age === undefined) o.age = DEF.age;
    if (o.face === undefined) o.face = clone(DEF.face);
    if (o.facialHair === undefined) o.facialHair = has('beard') ? 'full' : has('moustache') ? 'horseshoe' : 'clean';
    if (o.glasses === undefined) o.glasses = has('sunglasses') ? 'shades' : has('glasses') ? 'specs' : 'none';
    if (o.headwear === undefined) o.headwear = has('hat') ? 'toque' : has('cowboy') ? 'cowboy' : has('bandana') ? 'bandana' : has('headband') ? 'headband' : 'none';
    if (o.top === undefined) o.top = 'tee';
    ['bottom', 'shoes', 'outfit'].forEach(function (k) { if (o[k] === undefined) o[k] = DEF[k]; });
    if (o.stageExtras === undefined) o.stageExtras = [];
    if (o.tattoos === undefined) o.tattoos = has('tattoos') ? [{ spot: 'halfL', design: 'flames' }, { spot: 'halfR', design: 'skull' }] : [];
    if (o.knuckles === undefined) o.knuckles = { left: '', right: '' };
    if (o.piercings === undefined) o.piercings = [];
    return o;
  };
  // The person (body, face, hair, ink) is the same on stage and off: copy those fields from one look to the other.
  C.syncPerson = function (from, to) {
    PERSON.forEach(function (k) { if (from[k] !== undefined) to[k] = clone(from[k]); else delete to[k]; });
    return to;
  };
  C.stageOnly = function (look) { var o = clone(look); delete o.outfit; delete o.stageExtras; return o; };
  function firstFree(state, cat) {
    var l = C.partsIn(cat);
    for (var i = 0; i < l.length; i++) if (C.isUnlocked(state, l[i].id)) return l[i].value;
    return l.length ? l[0].value : null;
  }
  // Locked parts fall back to the first unlocked part of their category (arrays drop them).
  C.lockLook = function (state, look) {
    var o = clone(look);
    var fix = function (cat, key) { if (o[key] !== undefined && C.partFor(cat, o[key]) && !C.isUnlocked(state, cat + '.' + o[key])) o[key] = DEF[key] && C.isUnlocked(state, cat + '.' + DEF[key]) ? DEF[key] : firstFree(state, cat); };
    fix('hairStyle', 'hairStyle'); fix('age', 'age'); fix('facialHair', 'facialHair'); fix('glasses', 'glasses');
    fix('top', 'top'); fix('bottom', 'bottom'); fix('shoes', 'shoes'); fix('headwear', 'headwear'); fix('outfit', 'outfit');
    if (o.face) FACE_KEYS.forEach(function (k) { if (C.partFor(k, o.face[k]) && !C.isUnlocked(state, k + '.' + o.face[k])) o.face[k] = DEF.face[k]; });
    var dye = C.partsIn('hairColor').filter(function (p) { return p.color && p.color.toLowerCase() === String(o.hair).toLowerCase(); })[0];
    if (dye && !C.isUnlocked(state, dye.id)) o.hair = C.partFor('hairColor', 'brown').color;
    if (o.stageExtras) o.stageExtras = o.stageExtras.filter(function (x) { return C.isUnlocked(state, 'stageExtra.' + x); });
    if (o.piercings) o.piercings = o.piercings.filter(function (x) { return C.isUnlocked(state, 'piercing.' + x); });
    if (o.tattoos) o.tattoos = o.tattoos.filter(function (t) { return C.isUnlocked(state, 'tatSpot.' + t.spot) && (t.spot === 'teardrop' || C.isUnlocked(state, 'tatDesign.' + t.design)); });
    if (o.knuckles && !C.isUnlocked(state, 'tatSpot.knuckles')) o.knuckles = { left: '', right: '' };
    return o;
  };
  // Stage scenes (gigs, the red carpet, the Gong, rival sets): the stage look when there is one, else the everyday look.
  C.stageLookFor = function (who, cm) {
    if (!who && !cm) return null;
    who = who || {};
    return who.stageLook || (cm && cm.stageLook) || who.look || (cm && cm.look) || null;
  };

  /* ---- Kit ---------------------------------------------------------------------------------------------------------- */
  C.legacyKit = function (color) {   // what every kit looked like before v0.8 (migrated saves keep it until the player changes it)
    return { shell: 'paint', color: col(color, '#b3262b'), hardware: 'chrome', head: 'plain', headText: '', throne: 'stool', sticks: KIT_DEF.sticks, extras: [] };
  };
  // v0.9: the band's own tier-0 throne (bands.js throne: crate / bucket / haybale) when the creator content has that part.
  function bandThrone(bandId) {
    var b = bandId && GG.career && GG.career.band ? GG.career.band(bandId) : null;
    return b && b.throne && valid('throne', b.throne) ? b.throne : 'crate';
  }
  C.bandThrone = bandThrone;
  C.newKit = function (color, bandId) {      // a new career: the milk-crate era (a bucket, a hay bale), your band's name on the kick
    return { shell: 'paint', color: col(color, '#b3262b'), hardware: 'chrome', head: 'logo', headText: '', throne: bandThrone(bandId), sticks: KIT_DEF.sticks, extras: [] };
  };
  C.sanitizeKit = function (k, fallbackColor) {
    k = k && typeof k === 'object' ? k : {};
    var o = {};
    ['shell', 'hardware', 'head', 'throne'].forEach(function (key) { o[key] = valid(key, k[key]) ? k[key] : KIT_DEF[key]; });
    o.color = col(k.color, col(fallbackColor, '#b3262b'));
    o.headText = C.headText(k.headText);
    o.sticks = col(k.sticks, KIT_DEF.sticks);
    o.extras = Array.isArray(k.extras) ? uniq(k.extras.filter(function (x) { return valid('kitExtra', x); })) : [];   // cowbell | fan | pyro. No gong.
    return o;
  };
  C.lockKit = function (state, k) {
    var o = clone(k);
    var own = bandThrone(state && state.bandId);   // v0.9: the band's starting throne is always yours
    ['shell', 'hardware', 'head', 'throne'].forEach(function (key) {
      if (key === 'throne' && o[key] === own) return;
      if (!C.isUnlocked(state, key + '.' + o[key])) o[key] = key === 'throne' ? own : key === 'head' ? 'plain' : firstFree(state, key);
    });
    var st = C.partsIn('sticks').filter(function (p) { return p.color && p.color.toLowerCase() === String(o.sticks).toLowerCase(); })[0];
    if (st && !C.isUnlocked(state, st.id)) o.sticks = KIT_DEF.sticks;
    o.extras = (o.extras || []).filter(function (x) { return C.isUnlocked(state, 'kitExtra.' + x); });
    return o;
  };
  function findPreset(id) { var l = GG.content.presets || []; for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; }
  C.kitLook = function (pl) {
    pl = pl || {};
    var pre = findPreset(pl.presetId), fallback = pl.kitColor || (pre && pre.kitColor) || '#b3262b';
    return pl.kit && typeof pl.kit === 'object' ? C.sanitizeKit(pl.kit, fallback) : C.legacyKit(fallback);
  };
  C.isArena = function (v) {
    if (!v || typeof v !== 'object') return false;
    return !!(v.dome || v.arena || (v.capacity || 0) >= 5000 || (v.tier || 0) >= 4);
  };

  /* ---- Career: new, migrate, apply ------------------------------------------------------------------------------------ */
  C.prepare = function (o) { pending = o ? clone(o) : null; return pending; };
  C.pending = function () { return pending; };
  C.init = function (state, opts) {
    opts = opts || {};
    var pl = state.player = state.player || {};
    ensureUnlocks(state);
    if (opts.carry) C.carry.read(state.genre).forEach(function (id) { C.grant(state, id); });
    C.checkUnlocks(state);
    state.unlocks.news = [];
    if (opts.look) pl.look = C.lockLook(state, C.stageOnly(C.sanitizeLook(opts.look)));
    pl.stageLook = C.lockLook(state, C.sanitizeLook(opts.stageLook || pl.look));
    if (opts.stageLook) C.syncPerson(pl.look, pl.stageLook);
    pl.kit = C.lockKit(state, C.sanitizeKit(opts.kit || C.newKit(pl.kitColor, state.bandId), pl.kitColor));
    pl.kitColor = pl.kit.color;
    return state;
  };
  // Old saves: the stage look = the everyday look, the v0.7 kit, and whatever the career has already earned (quietly).
  C.migrate = function (s) {
    if (!s || typeof s !== 'object') return s;
    var pl = s.player;
    if (pl && typeof pl === 'object') {
      if (!pl.stageLook || typeof pl.stageLook !== 'object') pl.stageLook = clone(pl.look || null);
      if (!pl.kit || typeof pl.kit !== 'object') {
        var pre = findPreset(pl.presetId);
        pl.kit = C.legacyKit(pl.kitColor || (pre && pre.kitColor));
      }
    }
    if (!s.unlocks || typeof s.unlocks !== 'object' || !Array.isArray(s.unlocks.creator)) {
      ensureUnlocks(s);
      if (pl && pl.kit && pl.kit.throne === 'stool') C.grant(s, 'throne.stool');   // the v0.7 throne stays yours
      C.checkUnlocks(s);
    }
    ensureUnlocks(s);
    return s;
  };
  C.apply = function (state, o) {
    o = o || {};
    var pl = state.player = state.player || {};
    var look = C.lockLook(state, C.stageOnly(C.sanitizeLook(o.look || pl.look)));
    var stage = C.lockLook(state, C.sanitizeLook(o.stageLook || pl.stageLook || look));
    C.syncPerson(look, stage);
    var kit = C.lockKit(state, C.sanitizeKit(o.kit || pl.kit || C.kitLook(pl), pl.kitColor));
    pl.look = look; pl.stageLook = stage; pl.kit = kit; pl.kitColor = kit.color;
    GG.emit('creator:changed', { state: state });
    return { look: look, stageLook: stage, kit: kit };
  };

  /* ---- Carry-over (per genre, this device) ------------------------------------------------------------------------------ */
  function store() { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; } }
  C.carry = {
    key: function (genre) { return 'gg.v1.unlocks.' + (genre || 'metal'); },
    read: function (genre) {
      var raw = null, s = store();
      try { raw = s ? s.getItem(C.carry.key(genre)) : null; } catch (e) { raw = null; }
      var ids = [];
      try { var o = raw ? JSON.parse(raw) : null; ids = o && Array.isArray(o.ids) ? o.ids : []; } catch (e) { ids = []; }
      return uniq(ids.filter(function (id) { var p = C.part(id); return p && p.gate; }));
    },
    write: function (state) {
      if (!state || !state.genre) return false;
      var ids = uniq(C.carry.read(state.genre).concat(list(state).filter(function (id) { var p = C.part(id); return p && p.gate; })));
      var s = store();
      try { if (!s) return false; s.setItem(C.carry.key(state.genre), JSON.stringify({ ids: ids })); return true; } catch (e) { return false; }
    },
    count: function (genre) { return C.carry.read(genre).length; }
  };

  /* ---- Hooks ------------------------------------------------------------------------------------------------------------ */
  GG.on('career:new', function (p) {
    if (!p || !p.state) return;
    var o = pending; pending = null;
    C.init(p.state, o || {});
  });
  GG.on('week:wrap', function (p) {
    var st = GG.state;
    if (st && p && p.wrap && st.wrap === p.wrap) C.weekly(st, p.wrap);
  });
  ['loonies:result', 'cert', 'tour:gong', 'gig:done'].forEach(function (ev) {
    GG.on(ev, function () { if (GG.state && GG.state.unlocks) C.check(GG.state, 'event'); });
  });
  if (GG.save && GG.save.migrate && !GG.save.migrate.creator) {
    var prevMigrate = GG.save.migrate;
    GG.save.migrate = function (s) { return C.migrate(prevMigrate(s)); };
    GG.save.migrate.creator = true;
  }

  GG.registerDebug('creator', function () {
    var st = GG.state, pl = st && st.player;
    return { unlocked: st ? list(st).length : 0, parts: content().parts.length, pending: !!pending,
      v8: !!(pl && C.isV8(pl.look)), stageV8: !!(pl && C.isV8(pl.stageLook)), kit: pl ? C.kitLook(pl) : null };
  });
})(window.GG);
