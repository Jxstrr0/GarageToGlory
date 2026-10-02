// 20_sim_career.js: the career sim. One turn = one week:
//   startWeek (Monday card, maybe a gig offer) -> resolveCard -> setPlan -> runWeek (3 blocks + weekend gig) -> endWeek (wrap).
// Pure sim: state is always the first argument, no DOM, and all randomness comes from GG.rngFor(state),
// so the same seed replays the same career. Numbers live in content/economy.js + activities.js; text in content/lines.js
// (with small fallbacks below so the sim runs even when a content module is missing).
// v0.5 eras: career.setEra(state, era, why) (forward only; eraHistory; 'era:changed'); localHeroes (250 fans) = era
// 'local'; GG.labels moves you to 'signed'. Hooks into GG.labels: studio weeks replace the blocks (runWeek), studio event
// cards on session Mondays (startWeek), promo for a scheduled release (Promote), weekly offers/releases/charts/Loonies
// (endWeek, wrap.labels), afterGig, bots (botWeek). Effect key `production`; era upkeep economy.eraUpkeep.
// v0.8.1 (LICRECAP): GG.licensing (offer cards on Mondays, their answers in resolveCard, the weekly roll in endWeek, bots;
// tokens {brand} {ad*} in fillText) and GG.recap (the year's fund inflow in addStat, best/worst gig in settleGig, the
// year-start snapshot, the RECAP at the week-24 wrap: wrap.recap, state.recaps).
// v0.9 "Genres" (plan_contract_0.9 §4.2-4.3): tokens {front} {soloist} {filler} {bassist} {namer} {grumbler} {deadpan}
//   {driver} {van} {space} {spaceName} {door} {province} {homeVenue} {superfan} {rivalFront} ({rival} -> 'the other band',
//   {city} -> the career's city) ; pool(state, obj, key) ; linePool ; variant(state, baseId) ; speakerOk(state, who) ;
//   cardOk(state, card) ; talkers(state) ; roleOf(state, role) ; isAlias ; resolveWho ; cardRoles ; memberDef ; isSilent ;
//   homeVenue ; tokenValue ; firstGigVenue ; rivalId ; migrateBand (a save's band defaults; save.migrate applies them). Role
//   aliases (C.ROLE_ALIASES) work as card.speaker, chat.who and mood/skill/member keys (resolved at the draw: state.card.roles).
//   The week-one gig is band.firstGig; activity / quietWeek / yearEnd / guilt / milestones lines are pools (+ byBand).
// v1.1 "Seats" (plan_contract_1.1 §4, stage 0): state.seat (newCareer args.seat, default 'drums'), member.seatRole, the
//   swap table (seatSwap / swapped / seatRoleFor / lineup / drummerId), seat tokens {instrument} {gear} {sticks} {drummer}
//   {yourPart} {seat} (C.SEAT_TOKENS; drums = v1.0's words), gates seat / swapped (GATE + seatOk; cardOk and
//   speakerOk(state, who, line) honour them), the '@drummer' alias (the swapped drummer; null on drums).
(function (GG) {
  var C = GG.contracts, U = GG.util;
  var career = GG.career = GG.career || {};
  function econ() { return GG.content.economy; }
  function changed(state) { GG.emit('stats:changed', { state: state }); }

  /* ======================================================================
     Fallback content (only used when src/content/* doesn't provide it)
     ====================================================================== */
  var DEFAULT_LOOK = { skin: '#e0b48a', hair: '#3b2a1e', hairStyle: 'short', shirt: '#2b2b2b', pants: '#34495e',
    height: 1, build: 1, extras: [] };
  var DEFAULT_KIT = '#8b1e1e';
  var FALLBACK_BANDS = {
    hail_damage: {
      id: 'hail_damage', name: 'Hail Damage', genre: 'metal', city: 'Saskatoon', region: 'canada',
      space: 'parents_garage', spaceName: "Your parents' garage", rival: 'tundra_wraith',
      roles: { namer: 'marcel', grumbler: 'marcel', deadpan: 'kenji' }, firstGig: 'buddys_house_party', homeRing: 'sask',
      spaceShort: 'the garage', door: 'the garage door', province: 'SK',
      starterSongs: [{ title: 'My Lawn, My Tomb', titleEn: null, fr: 'Ma Pelouse, Mon Tombeau' },
                     { title: 'The Eternal Dandelions', titleEn: null, fr: 'Les Pissenlits Éternels' }],
      members: [
        { id: 'marcel', name: 'Marcel Fontaine', nick: 'Lord Abyssus', role: 'vocals', skill: 44, mood: 66, cape: true,
          signature: { action: 'capeSpin', combo: 40, crowd: 8, flag: 'cape', perSong: true } },
        { id: 'dana', name: 'Dana Okafor', nick: 'Sweep', role: 'lead guitar', skill: 56, mood: 64 },
        { id: 'jaxon', name: 'Jaxon Kowalchuk', nick: 'Rip', role: 'rhythm guitar', skill: 50, mood: 70 },
        { id: 'kenji', name: 'Kenji Blackbird', nick: 'Kenji', role: 'bass', skill: 54, mood: 60, silent: true }]
    }
  };
  var GENERIC_MEMBERS = [
    { id: 'singer', name: 'Sam Singer', nick: 'Vox', role: 'vocals', skill: 42, mood: 65 },
    { id: 'guitar', name: 'Gerry Strings', nick: 'Shred', role: 'lead guitar', skill: 50, mood: 65 },
    { id: 'guitar2', name: 'Riley Chords', nick: 'Chug', role: 'rhythm guitar', skill: 45, mood: 65 },
    { id: 'bass', name: 'Bo Low', nick: 'Rumble', role: 'bass', skill: 48, mood: 65 }];
  var FALLBACK_LINES = {
    activity: {
      rehearse: ['We ran the set until the neighbours started flicking their porch light.'],
      write: ['We wrote something new. Nobody is sure what it is about.'],
      promote: ['Flyers on every lamp post between here and the river.'],
      book: ['We worked the phones. Mostly voicemail.'],
      hustle: ['A wedding social. We played the Chicken Dance four times.'],
      rest: ['Nobody touched an instrument. {space} smelled of popcorn.']
    },
    chat: { happy: ['Good week. Same time Tuesday?', 'We are getting TIGHT.'],
            ok: ['k', 'Who has the extension cord?'],
            grumpy: ['Are we ever going to get paid?', 'Cool. Cool cool cool.'] },
    guilt: ["Your mom asks if you've thought about night school."],
    yearEnd: ['Another year in {space}. Somehow everyone is still here.'],
    quietWeek: ['A quiet Monday. Suspiciously quiet.']
  };
  var MILESTONES = {   // key -> default text (override with GG.content.lines.milestones[key])
    firstGig: 'First gig! {band} is now technically a live act.',
    firstSong: 'First original song. Nobody knows what it is about yet.',
    fans50: '50 fans. More than your mom’s book club.',
    fans100: '100 fans. Someone you have never met wore your shirt.',
    fans250: '250 fans. {homeVenue} knows your name.',
    fans500: '500 fans. People sing along. Mostly the wrong words.',
    fans1000: '1,000 fans. {city} is starting to notice.',
    fund1000: 'First $1,000 in the band fund. Nobody touch it.',
    localHeroes: 'Local heroes on the horizon. The garage era is over: from now on people can quit and vans can die.',
    signed: 'Signed! {band} is a real band now, with paperwork and everything.',
    diyAlbum: 'A whole album, made and paid for by you. Signed to nobody, answerable to nobody.'
  };
  // v0.5 eras: garage -> local (localHeroes) -> signed (a deal, or a DIY album) -> world (v0.7). Emits 'era:changed'.
  var ERA_TEXT = { local: 'Local heroes.', signed: 'The Signed era.', world: 'World stage.' };

  /* ======================================================================
     Lookups: band, members, lines, text tokens
     ====================================================================== */
  career.band = function (stateOrId) {
    var id = typeof stateOrId === 'string' ? stateOrId : stateOrId && stateOrId.bandId;
    var bands = GG.content.bands;
    return (bands && bands[id]) || FALLBACK_BANDS[id] || null;
  };
  function activeMembers(state) { return state.members.filter(function (m) { return m.status === 'active'; }); }
  function findMember(state, id) {
    if (id === 'recruit') id = state && state.card && state.card.who;   // v0.4: the member a drama card is about
    var list = state && state.members || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  // Member data from state, else from any band's content, else the fallback roster.
  function memberInfo(state, id) {
    var m = findMember(state, id); if (m) return m;
    var sources = [career.band(state), GG.content.bands || {}, FALLBACK_BANDS], i, b, k;
    for (i = 0; i < sources.length; i++) {
      b = sources[i]; if (!b) continue;
      var bandList = b.members ? [b] : Object.keys(b).map(function (key) { return b[key]; });
      for (k = 0; k < bandList.length; k++) {
        var ms = bandList[k].members || [];
        for (var j = 0; j < ms.length; j++) if (ms[j].id === id) return ms[j];
      }
    }
    return null;
  }
  function firstName(name) { return String(name || '').split(' ')[0]; }
  function capital(id) { id = String(id || ''); return id.charAt(0).toUpperCase() + id.slice(1); }
  function npc(id) { var n = GG.content.npcs; return n && n[id] || null; }
  // v0.9: a content (bands.js) member keeps its short name ('Travis Lee'); recruits and the fallback roster show a first name.
  function shortName(m) {
    var d = m && contentDef(m.id);
    return d && d.name && d.name === m.name ? m.name : firstName(m && m.name);
  }
  // v0.9: a rival cast member ({name:<castId>} in rival cards and news): rivalry.cast[rid].members[] (+ drummer / mascot).
  function castPerson(id) {
    var cast = (GG.content.rivalry && GG.content.rivalry.cast) || {};
    for (var rid in cast) {
      var c = cast[rid] || {}, list = (c.members || []).concat(c.drummer ? [c.drummer] : [], c.mascot ? [c.mascot] : []);
      for (var i = 0; i < list.length; i++) if (list[i] && list[i].id === id) return list[i];
    }
    return null;
  }
  career.memberName = function (state, id) {
    var m = memberInfo(state, id); if (m) return shortName(m) || capital(id);
    var p = npc(id); if (p) return p.name;
    var c = castPerson(id); return c ? (c.short || firstName(c.name) || capital(id)) : capital(id);
  };
  function memberNick(state, id) {
    var m = memberInfo(state, id); if (m) return m.nick || shortName(m);
    var p = npc(id); if (p) return p.name;
    var c = castPerson(id); return c ? (c.nick || c.short || firstName(c.name) || capital(id)) : capital(id);
  }

  /* ======================================================================
     v0.9 "Genres" helpers (plan_contract_0.9 §4.2-4.3; every lane codes against these)
       memberDef(state, id)      -> the content MEMBER (bands.js; the career's band first, then any band, then the fallback)
       isSilent(state, id) ; talkers(state) -> active members who talk (no `silent`; replaces every hard-coded 'kenji')
       roleOf(state, role)       -> member id for a role ('front'|'soloist'|'filler'|'bassist'|'namer'|'grumbler'|'deadpan'|
                                    'driver'|'any', with or without the '@'), or null ('@driver' is null when you drive)
       isAlias(who) ; resolveWho(state, who) -> a role alias resolved (the current card's draw-time roles first), else who
       cardRoles(state, card)    -> { '@front': id, ... } for every alias the card uses (stored as state.card.roles on a draw)
       speakerOk(state, who)     -> false for a speaker from another band / another rival's cast / a band- or rival-scoped npc
       cardOk(state, card)       -> speakerOk(card.speaker) and no effect (mood/skill keys, member ids, chat speakers) aimed
                                    at another band's member; a Q8 cameo card (cameo: true) always passes
       pool(state, obj, key)     -> obj[key] + obj.byBand[bandId][key] (arrays concat; objects merge, the band's keys win;
                                    other values: the band's replaces the flat one). key may be 'a.b' or ['a', 'b'].
                                    byBand may sit on any object along the path (world.lines.byBand[b].depart);
                                    obj.byGenre[genre][key] sits between the flat and the band layer when content has it.
       linePool(state, key)      -> pool over GG.content.lines as a non-empty array, else null
       variant(state, baseId)    -> '<base>_<bandId>', then '<base>_<rivalId>' (rv_*), then '<base>': the first whose gate
                                    passes and that is cardOk, else null
       homeVenue(state) -> { id, name } | null ; tokenValue(state, key) (the §4.2 tokens, used by fillText)
     ====================================================================== */
  var ALIAS = {};
  (C.ROLE_ALIASES || ['@front', '@soloist', '@filler', '@bassist', '@namer', '@grumbler', '@deadpan', '@driver', '@any'])
    .forEach(function (a) { ALIAS[a] = true; });
  career.isAlias = function (who) { return typeof who === 'string' && ALIAS[who] === true; };
  // Content member index (every band in bands.js + the fallback roster): member id -> { def, bandId }.
  var memberIx = null, memberIxOf = null;
  function membersIndex() {
    var B = GG.content.bands || {};
    if (memberIx && memberIxOf === B) return memberIx;
    memberIx = {}; memberIxOf = B;
    [FALLBACK_BANDS, B].forEach(function (src) {
      Object.keys(src).forEach(function (bid) {
        (src[bid].members || []).forEach(function (m) { memberIx[m.id] = { def: m, bandId: bid }; });
      });
    });
    return memberIx;
  }
  function contentDef(id) { var x = membersIndex()[id]; return x ? x.def : null; }
  career.memberDef = function (state, id) {
    var b = career.band(state), list = (b && b.members) || [], i;
    for (i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return contentDef(id);
  };
  career.isSilent = function (state, id) {
    var m = findMember(state, id), d = career.memberDef(state, id);
    return !!((m && m.silent) || (d && d.silent));
  };
  career.talkers = function (state) {
    return activeMembers(state).filter(function (m) { return !career.isSilent(state, m.id); });
  };
  function activeIds(state) { return activeMembers(state).map(function (m) { return m.id; }); }
  // A stable per-week pick (never the career RNG): '@any' stays the same all week.
  function weekPick(state, tag, list) {
    if (!list.length) return null;
    var r = GG.RNG(GG.hashSeed((state.seed >>> 0) + '|role|' + tag + '|' + (state.totalWeek || 1)));
    return r.pick(list);
  }
  career.roleOf = function (state, role) {
    if (!state || !Array.isArray(state.members)) return null;
    var r = String(role || '').replace(/^@/, ''), b = career.band(state) || {}, R = b.roles || {}, act = activeIds(state);
    var g = GG.gig && GG.gig.roles ? GG.gig.roles(state) : {}, talk = career.talkers(state).map(function (m) { return m.id; });
    function on(id) { return !!id && act.indexOf(id) >= 0; }
    var front = g.front || talk[0] || act[0] || null;
    switch (r) {
      case 'front': case 'singer': return front;
      case 'soloist': case 'solo': return g.solo || null;
      case 'filler': case 'fill': return g.fill || null;
      case 'bassist': case 'bass': {
        var bm = activeMembers(state).filter(function (m) { return /bass/.test(m.role || ''); })[0];
        return bm ? bm.id : null;
      }
      case 'namer': case 'grumbler': return on(R[r]) ? R[r] : front;
      case 'deadpan': {
        if (on(R.deadpan)) return R.deadpan;
        var quiet = talk.filter(function (id) { return id !== front; });
        return quiet[0] || talk[0] || null;
      }
      case 'driver': {
        if (!GG.world || !GG.world.driver) return null;
        var d = GG.world.driver(state);
        return d && !d.you && on(d.id) ? d.id : null;
      }
      case 'any': return weekPick(state, 'any', talk.length ? talk : act);
      case 'drummer': return career.drummerId(state);   // v1.1: the swapped drummer (null on the drum seat)
    }
    return null;
  };
  career.resolveWho = function (state, who) {
    if (!career.isAlias(who)) return who;
    var cr = state && state.card && state.card.roles;
    if (cr && Object.prototype.hasOwnProperty.call(cr, who)) return cr[who];
    return career.roleOf(state, who);
  };
  var ALIAS_RE = /@(front|soloist|filler|bassist|namer|grumbler|deadpan|driver|any|drummer)\b/g;
  career.cardRoles = function (state, card) {
    if (!card) return null;
    var out = null, seen = {}, m, txt;
    try { txt = JSON.stringify(card); } catch (e) { return null; }
    ALIAS_RE.lastIndex = 0;
    while ((m = ALIAS_RE.exec(txt))) {
      var a = '@' + m[1];
      if (seen[a]) continue;
      seen[a] = true;
      (out = out || {})[a] = career.roleOf(state, a);
    }
    return out;
  };

  /* ======================================================================
     v1.1 "Seats" (plan_contract_1.1 §4; 02_contracts V1.1 SEATS). Stage 0 (lead): the seat, the swap table, seat roles,
     the lineup, the seat tokens and the seat / swapped gates. Lane B owns the rest (roles by seatRole, quits/returns into
     the drum seat, arcs).
       seatOf(state) -> C.SEATS ('drums' when missing) ; seatSwap(bandId, seat) -> memberId | null (bands.js seats; drums
       -> null) ; swapped(state) -> the swapped drummer's id for this career | null ; seatRoleFor(state, member) ;
       lineup(state) -> [{ id: 'player'|memberId, seatRole }] (player first, then active members in band order) ;
       drummerId(state) -> the active member on the kit | null (the drum seat: null) ; seatOk(state, x) -> x.seat / x.swapped
       hold (a card, a gate, a line)
     ====================================================================== */
  var SEAT_FALLBACK = { bass: [/bass/], rhythm: [/rhythm/, /vocals\/(guitar|acoustic)/, /^vocals$/], lead: [/lead/, /^guitar$/] };
  career.seatOf = function (state) { var s = state && state.seat; return C.SEATS.indexOf(s) >= 0 ? s : 'drums'; };
  career.seatSwap = function (bandId, seat) {
    if (!seat || seat === 'drums' || C.SEATS.indexOf(seat) < 0) return null;
    var b = career.band(bandId);
    if (!b) return null;
    if (b.seats) return b.seats[seat] || null;
    var list = b.members || [], pats = SEAT_FALLBACK[seat] || [];   // a band without a table (the fallback roster): by role
    for (var p = 0; p < pats.length; p++) for (var i = 0; i < list.length; i++) if (pats[p].test(String(list[i].role || ''))) return list[i].id;
    return null;
  };
  career.swapped = function (state) { return state ? career.seatSwap(state.bandId, career.seatOf(state)) : null; };
  career.seatRoleFor = function (state, m) {
    if (!m) return '';
    var id = career.swapped(state);
    if (id && m.id === id) return /vocals/.test(String(m.role || '')) ? 'drums/vocals' : 'drums';
    return m.role || '';
  };
  career.lineup = function (state) {
    var out = [{ id: 'player', seatRole: career.seatOf(state) }];
    if (state && Array.isArray(state.members)) activeMembers(state).forEach(function (m) { out.push({ id: m.id, seatRole: m.seatRole || career.seatRoleFor(state, m) }); });
    return out;
  };
  career.drummerId = function (state) {
    if (!state || career.seatOf(state) === 'drums' || !Array.isArray(state.members)) return null;
    var act = activeMembers(state);
    for (var i = 0; i < act.length; i++) if (/^drums/.test(act[i].seatRole || career.seatRoleFor(state, act[i]))) return act[i].id;
    return null;
  };
  function seatGate(s, v) { return [].concat(v).indexOf(career.seatOf(s)) >= 0; }
  function swappedGate(s, v) {
    var id = career.swapped(s);
    if (v === false) return !id;
    return !!id && (v === true || [].concat(v).indexOf(id) >= 0);
  }
  career.seatOk = function (state, x) {
    if (!x || typeof x !== 'object') return true;
    return (x.seat == null || seatGate(state, x.seat)) && (x.swapped == null || swappedGate(state, x.swapped));
  };

  // Speaker guard. Rival casts (members + frontman) belong to their rival; npcs may carry band: [ids] / rival: id
  // (content), with these defaults for the Hail Damage cast that predates the fields.
  var NPC_SCOPE = { baba: { band: ['hail_damage'] }, gord: { band: ['hail_damage'] }, dale_warman: { band: ['hail_damage'] },
    wraith_frontman: { rival: 'tundra_wraith' } };
  var castIx = null, castIxOf = null, castIxN = -1;
  function castIndex() {
    var RV = GG.content.rivalry || {}, cast = RV.cast || {}, keys = Object.keys(cast);
    if (castIx && castIxOf === cast && castIxN === keys.length) return castIx;
    castIx = {}; castIxOf = cast; castIxN = keys.length;
    keys.forEach(function (rid) {
      var c = cast[rid] || {};
      (c.members || []).forEach(function (m) { if (m && m.id) castIx[m.id] = rid; });
      if (typeof c.frontman === 'string') castIx[c.frontman] = rid;
      if (c.drummer && c.drummer.id) castIx[c.drummer.id] = rid;
      if (c.mascot && c.mascot.id) castIx[c.mascot.id] = rid;
    });
    return castIx;
  }
  function rivalIdOf(state) { var b = career.band(state); return (state && state.rival && state.rival.id) || (b && b.rival) || null; }
  career.rivalId = rivalIdOf;
  function listHas(v, x) { return Array.isArray(v) ? v.indexOf(x) >= 0 : v === x; }
  // v1.1: speakerOk(state, who, line) also checks the line's own seat / swapped gates (career.seatOk).
  career.speakerOk = function (state, who, line) {
    if (line && typeof line === 'object' && !career.seatOk(state, line)) return false;
    if (who == null || who === '' || who === 'player' || who === 'you' || who === 'recruit') return true;
    if (typeof who !== 'string') return false;
    if (career.isAlias(who)) return who === '@driver' || career.resolveWho(state, who) != null;
    if (who === 'rival_frontman') { var cf = GG.rival && GG.rival.cast ? GG.rival.cast(state) : null; return !!(cf && cf.frontman); }
    if (findMember(state, who) || /^fill_/.test(who)) return true;
    var mi = membersIndex()[who];
    if (mi) { var b = career.band(state); return !!(b && b.members && b.members.some(function (m) { return m.id === who; })); }
    var ci = castIndex()[who];
    if (ci) return ci === rivalIdOf(state);
    var p = npc(who);
    if (!p) return false;
    var sc = (p.band || p.rival) ? p : NPC_SCOPE[who];
    if (sc && sc.band && !listHas(sc.band, state && state.bandId)) return false;
    if (sc && sc.rival && !listHas(sc.rival, rivalIdOf(state))) return false;
    return true;
  };

  // v0.9: the card-level guard. speakerOk(card.speaker), and no effect aimed at another band's member (mood / skill keys,
  // member ids, chat speakers in any choice or roll branch: a card that moves Marcel's mood is Hail Damage's card).
  // A Q8 cross-band cameo card sets cameo: true and passes (it may name or voice another playable band's member).
  var refCache = {};
  function memberRefs(card) {
    var hit = refCache[card.id];
    if (hit && hit.card === card) return hit.refs;
    var refs = {};
    function who(v) { if (typeof v === 'string') refs[v] = 1; }
    function fx(e) {
      if (!e || typeof e !== 'object') return;
      ['mood', 'skill'].forEach(function (k) { if (e[k] && typeof e[k] === 'object') Object.keys(e[k]).forEach(who); });
      [].concat(e.member || []).forEach(function (m) { if (m) who(m.id); });
      [].concat(e.chat || []).forEach(function (c) { if (c) who(c.who); });
    }
    (card.choices || []).forEach(function (ch) {
      if (!ch) return;
      fx(ch.effects);
      if (ch.roll) { fx(ch.roll.success && ch.roll.success.effects); fx(ch.roll.fail && ch.roll.fail.effects); }
    });
    var list = Object.keys(refs).filter(function (id) { return !!membersIndex()[id]; });
    refCache[card.id] = { card: card, refs: list };
    return list;
  }
  career.cardOk = function (state, card) {
    if (!card) return false;
    if (!career.seatOk(state, card) || !career.seatOk(state, card.gate)) return false;   // v1.1: seat / swapped (top level or gate)
    if (card.cameo === true) return true;
    if (!career.speakerOk(state, card.speaker)) return false;
    var refs = memberRefs(card);
    if (!refs.length) return true;
    var b = career.band(state), own = {};
    ((b && b.members) || []).forEach(function (m) { own[m.id] = 1; });
    return refs.every(function (id) { return own[id] || !!findMember(state, id); });
  };

  // Content pools: flat (neutral) + byBand[bandId] extras.
  function dig(o, path) { for (var i = 0; o != null && i < path.length; i++) o = o[path[i]]; return o; }
  function plainObj(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }
  function layer(acc, x) {
    if (x === undefined) return acc;
    if (acc === undefined) return x;
    if (Array.isArray(acc) || Array.isArray(x)) return (Array.isArray(acc) ? acc : []).concat(Array.isArray(x) ? x : []);
    if (plainObj(acc) && plainObj(x)) return Object.assign({}, acc, x);
    return x;
  }
  // The byBand (and optional byGenre) layers may sit on the file object or on any object along the path:
  // world.byBand[b].lines.depart and world.lines.byBand[b].depart both add to world.lines.depart. Order: flat, genre, band.
  career.pool = function (state, obj, key) {
    if (!obj) return undefined;
    var path = Array.isArray(key) ? key : String(key).split('.');
    var bid = state && state.bandId, gen = state && state.genre, out = dig(obj, path), gl = [], bl = [], node = obj, i;
    for (i = 0; i <= path.length && plainObj(node); i++) {   // i === path.length: the pool object's own byBand (news by week)
      var rest = path.slice(i);
      if (gen && node.byGenre && node.byGenre[gen]) gl.push(dig(node.byGenre[gen], rest));
      if (bid && node.byBand && node.byBand[bid]) bl.push(dig(node.byBand[bid], rest));
      node = i < path.length ? node[path[i]] : null;
    }
    gl.concat(bl).forEach(function (x) { out = layer(out, x); });
    if (plainObj(out) && (out.byBand || out.byGenre)) { out = Object.assign({}, out); delete out.byBand; delete out.byGenre; }
    return Array.isArray(out) ? out.slice() : out;
  };
  career.linePool = function (state, key) {
    var v = career.pool(state, GG.content.lines, key);
    return Array.isArray(v) && v.length ? v : null;
  };
  // Card variants. Monday-deck guard: a variant of a forced-only card never joins the normal draw.
  var FORCED_BASES = ['shop_space_1', 'shop_space_2', 'shop_space_3', 'shop_solo', 'shop_merch_start', 'shop_pawn_kit', 'shop_van_deal',
    'money_merch_misprint', 'fans_dale_hello', 'fans_macaroni', 'fans_patreeon', 'fans_hater_page', 'fans_club_grumble', 'wt_homesick',
    'rv_poach', 'rv_crack_breakup', 'rv_crack_rebrand', 'rv_crack_opener', 'rv_opener', 'rv_final_eve', 'ult_recruit'];
  var FORCED_RE = new RegExp('^(' + FORCED_BASES.join('|') + ')_');
  career.isVariantId = function (id) { return FORCED_RE.test(String(id || '')); };
  career.variant = function (state, baseId) {
    if (!baseId || !state) return null;
    var ids = [baseId + '_' + state.bandId], rid = rivalIdOf(state);
    if (/^rv_/.test(baseId) && rid) ids.push(baseId + '_' + rid);
    ids.push(baseId);
    for (var i = 0; i < ids.length; i++) {
      var c = career.cardById(ids[i]);
      if (c && career.gatePasses(state, c.gate) && career.cardOk(state, c)) return c;
    }
    return null;
  };

  // {homeVenue}: the home-city venue you have played most (state.venuePlays, v0.9), else the band's first gig.
  career.homeVenue = function (state) {
    if (!GG.gig || !GG.gig.venue || !state) return null;
    var plays = state.venuePlays || {}, best = null, bn = 0, home = String(state.city || '').toLowerCase();
    Object.keys(plays).forEach(function (id) {
      var v = GG.gig.venue(id);
      if (v && String(v.city || '').toLowerCase() === home && plays[id] > bn) { best = v; bn = plays[id]; }
    });
    if (!best) { var fg = career.firstGigVenue ? career.firstGigVenue(state, career.band(state) || {}) : null; best = fg ? GG.gig.venue(fg) : null; }
    return best ? { id: best.id, name: best.name } : null;
  };
  function nameOr(state, id, fallback) { return id ? career.memberName(state, id) : fallback; }
  function roleToken(state, alias) {
    var cr = state.card && state.card.roles;
    return cr && Object.prototype.hasOwnProperty.call(cr, alias) ? cr[alias] : career.roleOf(state, alias);
  }
  var TOKEN_FALLBACK = { front: 'the singer', soloist: 'the guitarist', filler: 'the bassist', bassist: 'the bassist',
    namer: 'the singer', grumbler: 'the singer', deadpan: 'the quiet one' };
  career.tokenValue = function (state, key) {
    state = state || {};
    var b = career.band(state) || {};
    switch (key) {
      case 'front': case 'soloist': case 'filler': case 'bassist': case 'namer': case 'grumbler': case 'deadpan':
        return Array.isArray(state.members) ? nameOr(state, roleToken(state, '@' + key), TOKEN_FALLBACK[key]) : TOKEN_FALLBACK[key];
      case 'driver': {
        var d = GG.world && GG.world.driver && Array.isArray(state.members) ? GG.world.driver(state) : null;
        return d && !d.you ? (career.memberName(state, d.id) || d.name) : 'you';
      }
      case 'van': return (state.van && state.van.name) || (GG.shop && GG.shop.vanName && state.bandId ? GG.shop.vanName(state.bandId, 0) : '') || 'the van';
      case 'space': return b.spaceShort || 'the jam space';
      case 'spaceName': return b.spaceName || b.spaceShort || 'the jam space';
      case 'door': return b.door || 'the door';
      case 'province': return b.province || 'SK';
      case 'homeVenue': { var hv = career.homeVenue(state); return hv ? hv.name : 'the local bar'; }
      case 'superfan': { var sf = GG.fans && GG.fans.homeSuperfan && state.bandId ? GG.fans.homeSuperfan(state) : null; return (sf && sf.name) || 'your first superfan'; }
      case 'rivalFront': return (GG.rival && GG.rival.frontName && state.bandId ? GG.rival.frontName(state) : '') || 'their singer';
      // v1.0 (E12) seat tokens; v1.1 "Seats" reads the seat (C.SEAT_TOKENS; the drum seat reads exactly as v1.0: 'drums',
      // 'kit', 'sticks', 'the beat', 'drums', and {drummer} 'you'). {drummer} on a string seat: whoever is on the kit now.
      case 'instrument': case 'gear': case 'sticks': case 'yourPart': case 'seat':
        return ((C.SEAT_TOKENS || {})[career.seatOf(state)] || { instrument: 'drums', gear: 'kit', sticks: 'sticks', yourPart: 'the beat', seat: 'drums' })[key];
      case 'drummer': {
        if (career.seatOf(state) === 'drums') return 'you';
        var dr = career.drummerId(state);
        return dr ? career.memberName(state, dr) : 'the drummer';
      }
    }
    return null;
  };

  // Replaces {player} {band} {city} {nick:<id>} {name:<id>} ({name} = first name; npc ids work too).
  // v0.4: {recruit} = the member the current drama card is about (state.card.who; a recruit or a returning original).
  // v0.6: {rival} = the rival band's current name (GG.rival.name; follows a rebrand).
  // v0.9: the C.TOKENS role/band tokens ({front} {soloist} {filler} {bassist} {namer} {grumbler} {deadpan} {driver} {van}
  // {space} {spaceName} {door} {province} {homeVenue} {superfan} {rivalFront}); {rival} falls back to 'the other band',
  // {city} to the career's city. v1.0: {instrument} 'drums', {drummer} 'you'. v1.1: + {gear} {sticks} {yourPart} {seat}, per seat
  // (C.SEAT_TOKENS; the drum seat = v1.0's words).
  var TOKEN_RE = /\{(player|band|city|nick|name|recruit|rival|rivalFront|front|soloist|filler|bassist|namer|grumbler|deadpan|driver|van|spaceName|space|door|province|homeVenue|superfan|instrument|drummer|gear|sticks|yourPart|seat)(?::([\w-]+))?\}/g;
  career.fillText = function (state, text) {
    if (text == null) return '';
    state = state || {};
    if (GG.licensing && GG.licensing.fillText) text = GG.licensing.fillText(state, String(text));   // v0.8.1: {brand} {adsong} {adfee} ...
    if (GG.tour && GG.tour.fillText) text = GG.tour.fillText(state, String(text));   // v0.7: {region} {song} {festival} {here}
    return String(text).replace(TOKEN_RE, function (all, key, id) {
      if (key === 'rival') return (GG.rival && (state.rival || state.bandId) ? GG.rival.name(state) : '') || 'the other band';   // v0.6: the rival's current name
      if (key === 'player') return (state.player && (state.player.nick || state.player.name)) || 'you';
      if (key === 'recruit') { var r = findMember(state, 'recruit'); return r ? shortName(r) : (state.card && state.card.whoName) || 'the new one'; }
      if (key === 'band') { var b = career.band(state); return b ? b.name : 'the band'; }
      if (key === 'city') { var hb = career.band(state); return state.city || (hb && hb.city) || 'town'; }
      if (key !== 'name' && key !== 'nick') { if (id) return all; var tv = career.tokenValue(state, key); return tv == null ? all : tv; }
      if (!id) return all;
      return key === 'nick' ? memberNick(state, id) : career.memberName(state, id);
    });
  };

  // GG.content.lines[a][b][c] if it is a non-empty array, else null.
  function contentLines(a, b, c) {
    var o = GG.content.lines; if (!o) return null;
    o = o[a]; if (b != null) o = o && o[b]; if (c != null) o = o && o[c];
    return Array.isArray(o) && o.length ? o : null;
  }
  career.contentLines = contentLines;
  // Picks a line from `pool` (or `fallback`) with the career RNG and fills its tokens.
  career.pickLine = function (state, rng, pool, fallback) {
    var list = pool && pool.length ? pool : fallback;
    return list && list.length ? career.fillText(state, rng.pick(list)) : '';
  };

  career.moodLabel = function (mood) {
    return mood >= 70 ? 'happy' : mood >= 45 ? 'ok' : mood >= 25 ? 'grumpy' : 'sulking';
  };
  function chatBucket(mood) { var l = career.moodLabel(mood); return l === 'sulking' ? 'grumpy' : l; }

  // Stochastic rounding: 1.3 -> 1 (70%) or 2 (30%). Keeps small fractional gains meaningful on integer stats.
  function rngRound(x, rng) { var f = Math.floor(x); return f + (rng.chance(x - f) ? 1 : 0); }
  function headroom(v) { return Math.max(0, 1 - v / 100); }

  /* ======================================================================
     Effects: apply an effects object, record what actually changed
     ====================================================================== */
  // Adds `delta` to a band stat, rounds, clamps to RANGES (fund is unclamped), records the real change in d.
  function addStat(state, key, delta, d) {
    if (!delta || !isFinite(delta)) return 0;
    var before = state[key], r = C.RANGES[key], after = Math.round(before + delta);
    if (r) after = U.clamp(after, r[0], r[1]);
    state[key] = after;
    var diff = after - before;
    if (diff && d) d[key] = (d[key] || 0) + diff;
    if (key === 'fund' && diff > 0 && state.yearStart) state.yearStart.fin = (state.yearStart.fin || 0) + diff;   // v0.8.1: the recap's "money in"
    return diff;
  }
  // Same for a member stat ('mood'|'skill'); target is a member id or 'all' (active members).
  function addMemberStat(state, stat, target, delta, d) {
    if (!delta || !isFinite(delta)) return;
    var list = target === 'all' ? activeMembers(state) : [findMember(state, target)];
    for (var i = 0; i < list.length; i++) {
      var m = list[i]; if (!m) continue;
      var before = m[stat], after = U.clamp(Math.round(before + delta), C.RANGES[stat][0], C.RANGES[stat][1]);
      m[stat] = after;
      if (after !== before && d) { d[stat] = d[stat] || {}; d[stat][m.id] = (d[stat][m.id] || 0) + after - before; }
    }
  }
  // tone (v0.4): 'grumble' | 'pa' (passive-aggressive) | 'news' (drama storylines); plain chat has none.
  // v0.9: a role alias resolves to the member; a speaker from another band (or rival, or a scoped npc) posts nothing (null).
  function postChat(state, who, text, d, tone) {
    if (career.isAlias(who)) { who = career.resolveWho(state, who); if (!who) return null; }
    if (!career.speakerOk(state, who)) return null;
    var msg = { week: state.totalWeek, who: who, text: career.fillText(state, text) };
    if (tone) msg.tone = tone;
    state.chat.push(msg);
    var max = econ().chatMax;
    if (state.chat.length > max) state.chat.splice(0, state.chat.length - max);
    if (d) (d.chat = d.chat || []).push(msg);
    return msg;
  }
  career.postChat = postChat;
  function numeric(key) { return function (state, v, d) { addStat(state, key, v, d); }; }
  // v0.9: keys may be role aliases ('@front': 3); an alias nobody holds is skipped.
  function perMember(stat) {
    return function (state, map, d) {
      for (var id in map) {
        var t = career.isAlias(id) ? career.resolveWho(state, id) : id;
        if (t) addMemberStat(state, stat, t, map[id], d);
      }
    };
  }
  function resolveMemberSpec(state, v) {
    if (Array.isArray(v)) return v.map(function (x) { return resolveMemberSpec(state, x); }).filter(Boolean);
    if (!v || !career.isAlias(v.id)) return v;
    var id = career.resolveWho(state, v.id);
    return id ? Object.assign({}, v, { id: id }) : null;
  }
  var APPLY = {
    fund: numeric('fund'), fans: numeric('fans'), buzz: numeric('buzz'), chemistry: numeric('chemistry'),
    burnout: numeric('burnout'), drumSkill: numeric('drumSkill'),
    mood: perMember('mood'), skill: perMember('skill'),
    flags: function (state, map, d) {        // false/null deletes the flag
      for (var k in map) {
        if (map[k] === false || map[k] == null) delete state.flags[k]; else state.flags[k] = map[k];
        (d.flags = d.flags || {})[k] = map[k] == null ? false : map[k];
      }
    },
    chain: function (state, map, d) {        // { cape: { step: 2, delay: 1 } } or { cape: { step: 'end' } }
      for (var c in map) {
        var spec = typeof map[c] === 'object' && map[c] ? map[c] : { step: map[c] };
        state.chains[c] = spec.step === 'end' ? { step: 'end', due: state.totalWeek }
          : { step: spec.step, due: state.totalWeek + (spec.delay || 1) };
        (d.chain = d.chain || {})[c] = U.clone(state.chains[c]);
      }
    },
    book: function (state, venueId, d) {     // books this weekend unless a gig is already booked
      if (state.gig || !GG.gig || (GG.world && GG.world.isBanned(state, venueId))) return;   // banned: they won't have you
      if (GG.calendar && !GG.calendar.venueOpen(state, GG.gig.venue(venueId))) return;   // v0.6.1: closed this week (Remembrance Day)
      var g = GG.gig.makeGig(state, venueId, 'card');
      if (g && GG.world) GG.world.decorate(state, g);
      if (g) { state.gig = g; state.offer = null; d.book = venueId; }
    },
    chat: function (state, v, d) {
      var list = Array.isArray(v) ? v : [v];
      for (var i = 0; i < list.length; i++) if (list[i] && list[i].text) postChat(state, list[i].who, list[i].text, d);
    },
    // v0.4 (drama). member: { id: memberId|'recruit', act: 'settle'|'quit'|'return'|'later'|'rival' } (see 27_sim_drama).
    member: function (state, v, d) { v = resolveMemberSpec(state, v); if (GG.drama && v && (!Array.isArray(v) || v.length)) GG.drama.applyMember(state, v, d); },
    // payCut: +/- change to the pay-the-band share (0..payCutMax).  repay: pay your parents back up to $n from the fund.
    payCut: function (state, v, d) {
      if (!GG.drama || !v) return;
      var before = GG.drama.payCut(state), after = GG.drama.setPayCut(state, before + v);
      if (after !== before) d.payCut = Math.round((after - before) * 100) / 100;
    },
    repay: function (state, v, d) {
      var amt = Math.max(0, Math.min(v || 0, state.debtToParents || 0, state.fund - econ().parentsCushion));   // never borrow to repay
      if (!amt) return;
      addStat(state, 'fund', -amt, d);
      state.debtToParents -= amt;
      d.repay = (d.repay || 0) + amt;
      if (state.debtToParents <= 0) { state.debtToParents = 0; delete state.flags.parentsLoan; }
    },
    // v0.5 (labels). production: ±n on the recording session's production score (studio event cards).
    production: function (state, v, d) { if (GG.labels) GG.labels.applyProduction(state, v, d); }
  };
  // Applies every EFFECT_KEYS entry present in fx. Returns d (the deltas object, created if absent).
  career.applyEffects = function (state, fx, d) {
    d = d || {};
    if (!fx) return d;
    for (var i = 0; i < C.EFFECT_KEYS.length; i++) {
      var k = C.EFFECT_KEYS[i];
      if (fx[k] != null) APPLY[k](state, fx[k], d);
    }
    return d;
  };

  // Chance of a roll succeeding: chance + (state[stat] - 50) * statScale, clamped to 5..95%.
  career.rollChance = function (state, roll) {
    var s = roll.stat != null ? Number(state[roll.stat]) : 50;
    if (!isFinite(s)) s = 50;
    var base = roll.chance != null ? roll.chance : 0.5;
    return U.clamp(base + (s - 50) * (roll.statScale || 0), 0.05, 0.95);
  };

  /* ======================================================================
     Hints: short human summaries of effects for choice buttons
     ====================================================================== */
  var LABEL = { fans: 'Fans', buzz: 'Buzz', chemistry: 'Chemistry', burnout: 'Burnout', drumSkill: 'Your chops' };
  var BIG = { fans: 15, buzz: 8, chemistry: 6, burnout: 8, drumSkill: 3, mood: 8, skill: 3 };
  function arrows(v, big) { return v > 0 ? (v >= big ? '↑↑' : '↑') : (v <= -big ? '↓↓' : '↓'); }
  // 'Fund −$120 · Buzz ↑ · Marcel ↑↑ · Chemistry ↓' in the order the effects were written. state is optional (names).
  career.effectSummary = function (fx, state) {
    if (!fx) return '';
    state = state || GG.state || null;
    var parts = [];
    Object.keys(fx).forEach(function (k) {
      var v = fx[k];
      if (k === 'fund' && v) parts.push((v > 0 ? '+' : '') + U.fmtMoney(v));
      else if (LABEL[k] && v) parts.push(LABEL[k] + ' ' + arrows(v, BIG[k]));
      else if ((k === 'mood' || k === 'skill') && v) {
        Object.keys(v).forEach(function (id) {
          if (!v[id]) return;
          var rid = career.isAlias(id) ? (state ? career.resolveWho(state, id) : null) : id;   // v0.9 role aliases
          if (!rid) return;
          var who = id === 'all' ? (k === 'mood' ? 'Everyone' : 'Band') : career.memberName(state, rid);
          parts.push(who + (k === 'skill' ? ' skill ' : ' ') + arrows(v[id], BIG[k]));
        });
      } else if (k === 'book' && v) parts.push('Gig booked');
      else if (k === 'payCut' && v) parts.push("Band's cut " + (v > 0 ? '+' : '−') + Math.round(Math.abs(v) * 100) + '%');
      else if (k === 'repay' && v) parts.push('Pay back ' + U.fmtMoney(v));
      else if (k === 'member' && v && GG.drama) parts.push(GG.drama.memberSummary(state, v));
      else if (k === 'van' && v && v.condition) parts.push('Van ' + arrows(v.condition, 5));
      else if (k === 'fan' && v && GG.fans) { var ft = GG.fans.effectText(v); if (ft) parts.push(ft); }   // v0.6.1 fan cards
      else if (k === 'shop' && v && GG.shop) { var sx = GG.shop.effectText(v); if (sx) parts.push(sx); }   // v0.8 shop cards
      else if (k === 'lic' && v && GG.licensing) { var lx = GG.licensing.effectText(v); if (lx) parts.push(lx); }   // v0.8.1 the fury card
    });
    return parts.join(' · ');
  };
  // The hint to show on a choice button: the content's hint, else the auto summary (+ 'Risky' for rolls).
  career.choiceHint = function (state, choice) {
    if (!choice) return '';
    if (choice.hint) return career.fillText(state, choice.hint);
    var s = career.effectSummary(choice.effects, state);
    return choice.roll ? (s ? s + ' · ' : '') + 'Risky' : s;
  };

  /* ======================================================================
     Card gates and the Monday draw
     ====================================================================== */
  function has(list, v) { return Array.isArray(list) && list.indexOf(v) >= 0; }
  function moodOf(state, id) { var m = findMember(state, career.isAlias(id) ? career.resolveWho(state, id) : id); return m ? m.mood : null; }
  var GATE = {
    era: function (s, v) { return has(v, s.era); },
    genre: function (s, v) { return has(v, s.genre); },
    region: function (s, v) { return has(v, GG.tour ? GG.tour.regionOf(s) : s.region); },   // v0.7: where the band is (abroad on tour)
    band: function (s, v) { return has(v, s.bandId); },
    minWeek: function (s, v) { return s.totalWeek >= v; }, maxWeek: function (s, v) { return s.totalWeek <= v; },
    weekOfYear: function (s, v) { return s.week >= v[0] && s.week <= v[1]; },
    minYear: function (s, v) { return s.year >= v; }, maxYear: function (s, v) { return s.year <= v; },
    minFans: function (s, v) { return s.fans >= v; }, maxFans: function (s, v) { return s.fans <= v; },
    minFund: function (s, v) { return s.fund >= v; }, maxFund: function (s, v) { return s.fund <= v; },
    minBuzz: function (s, v) { return s.buzz >= v; }, maxBuzz: function (s, v) { return s.buzz <= v; },
    minChemistry: function (s, v) { return s.chemistry >= v; }, maxChemistry: function (s, v) { return s.chemistry <= v; },
    flags: function (s, v) { return v.every(function (f) { return !!s.flags[f]; }); },
    notFlags: function (s, v) { return v.every(function (f) { return !s.flags[f]; }); },
    // { cape: 'velvet' } must match exactly; a null/false value matches an absent flag
    flagEquals: function (s, v) {
      return Object.keys(v).every(function (f) { var x = s.flags[f]; return v[f] == null || v[f] === false ? !x : x === v[f]; });
    },
    gigBooked: function (s, v) { return !!s.gig === !!v; },
    moodBelow: function (s, v) { return Object.keys(v).every(function (id) { var m = moodOf(s, id); return m != null && m < v[id]; }); },
    moodAbove: function (s, v) { return Object.keys(v).every(function (id) { var m = moodOf(s, id); return m != null && m > v[id]; }); },
    seat: seatGate, swapped: swappedGate   // v1.1 (C.GATE_KEYS)
  };
  // True when every condition in the gate holds. Unknown keys fail closed (content tests catch typos).
  career.gatePasses = function (state, gate) {
    if (!gate) return true;
    for (var k in gate) if (!GATE[k] || !GATE[k](state, gate[k])) return false;
    return true;
  };

  // Monday cards + v0.4 drama cards (ultimatums, returns, recruit quirk cards: never drawn, only forced by GG.drama)
  // + v0.5 studio event cards (drawn by GG.labels.studioEvent on Mondays of studio weeks).
  var cardIndex = {}, indexedList = null, indexedLen = -1, indexedDrama = -1;
  career.cardById = function (id) {
    var list = GG.content.cards || [], extra = (GG.drama ? GG.drama.cards() : []).concat(GG.labels ? GG.labels.cards() : [], GG.rival ? GG.rival.cards() : [],
      GG.fans ? GG.fans.cards() : [], GG.tour ? GG.tour.cards() : [], GG.shop ? GG.shop.cards() : [], GG.licensing ? GG.licensing.cards() : []);   // v0.8.1: licensing (forced by GG.licensing / GG.fans)   // v0.6.1: fan cards (forced by GG.fans, never drawn) ; v0.7: world cards (forced by GG.tour) ; v0.8: shop cards (forced by GG.shop)
    if (list !== indexedList || list.length !== indexedLen || extra.length !== indexedDrama) {
      cardIndex = {}; indexedList = list; indexedLen = list.length; indexedDrama = extra.length;
      for (var j = 0; j < extra.length; j++) cardIndex[extra[j].id] = extra[j];
      for (var i = 0; i < list.length; i++) cardIndex[list[i].id] = list[i];
    }
    return cardIndex[id] || null;
  };
  career.currentCard = function (state) { return state.card ? career.cardById(state.card.id) : null; };

  function weightOf(card) { return card.weight != null ? card.weight : 1; }
  // once (default) cards never repeat; others wait `cooldown` weeks after they were last drawn.
  function available(state, card) {
    var w = state.seenCards[card.id];
    if (w == null) return true;
    return card.once === false && state.totalWeek - w > (card.cooldown || 0);
  }
  function chainDue(state, card) {
    var ch = state.chains[card.chain];
    return !!ch && ch.step !== 'end' && ch.step === card.step && ch.due <= state.totalWeek;
  }
  function hasChainStep(chain, step) {
    return (GG.content.cards || []).some(function (c) { return c.chain === chain && c.step === step; });
  }
  function eligibleNormal(state, card) {
    if (card.forceWeek != null) return false;                          // forced cards only show on their week
    if (card.chain && (card.step !== 1 || state.chains[card.chain])) return false;
    if (career.isVariantId(card.id)) return false;                     // v0.9: a forced card's band variant is never drawn
    return available(state, card) && career.gatePasses(state, card.gate) && career.cardOk(state, card);
  }
  // Draw order: forced card > due chain card > quiet week > a weighted normal card. v0.9: every step skips a card whose
  // speaker or effects aren't this band's (career.cardOk).
  function drawCard(state, rng) {
    var cards = GG.content.cards || [], t = state.totalWeek, E = econ(), i;
    for (i = 0; i < cards.length; i++) {
      var f = cards[i];
      if (f.forceWeek === t && state.seenCards[f.id] == null && career.gatePasses(state, f.gate) && career.cardOk(state, f)) return f;
    }
    var due = cards.filter(function (c) {
      return c.chain && chainDue(state, c) && available(state, c) && career.gatePasses(state, c.gate) && career.cardOk(state, c);
    });
    if (due.length) return rng.weighted(due, weightOf);
    if (t > E.quietFreeWeeks && rng.chance(E.quietWeekChance)) return null;
    var pool = cards.filter(function (c) { return eligibleNormal(state, c); });
    return pool.length ? rng.weighted(pool, weightOf) || null : null;
  }
  // A chain step that has been due for a long time without an eligible card is ended so it can't block forever.
  function endStaleChains(state) {
    var limit = econ().chainStaleWeeks;
    for (var c in state.chains) {
      var ch = state.chains[c];
      if (ch.step !== 'end' && state.totalWeek - ch.due > limit) state.chains[c] = { step: 'end', due: state.totalWeek };
    }
  }
  // Safety net: a resolved chain card that didn't move its own chain advances it (or ends it if no next step exists).
  function autoAdvanceChain(state, card, d) {
    if (!card.chain || (d.chain && d.chain[card.chain])) return;
    var next = card.step + 1, fx = {};
    fx[card.chain] = hasChainStep(card.chain, next) ? { step: next } : { step: 'end' };
    APPLY.chain(state, fx, d);
  }

  /* ======================================================================
     Week snapshots (for wrap deltas) and the year snapshot (for the year summary)
     ====================================================================== */
  function snapshotWeek(state) {
    var s = { w: state.totalWeek, members: {} };
    C.STATS.forEach(function (k) { s[k] = state[k]; });
    state.members.forEach(function (m) { s.members[m.id] = { mood: m.mood, skill: m.skill }; });
    state.weekStart = s;
  }
  function snapshotYear(state) {
    state.yearStart = { year: state.year, fans: state.fans, fund: state.fund, gigs: state.stats.gigs,
      songsWritten: state.stats.songsWritten, parentsLoans: state.stats.parentsLoans, earned: state.stats.earned,
      releases: state.stats.releases || 0, royalties: state.stats.royalties || 0 };
    if (GG.recap) GG.recap.startYear(state);   // v0.8.1: money in, the lineup, the scene rank, best/worst gig so far
  }
  function historyPoint(state) {
    return { w: state.totalWeek, fund: state.fund, fans: state.fans, buzz: state.buzz, chemistry: state.chemistry };
  }

  /* ======================================================================
     New career
     ====================================================================== */
  function makePlayer(p) {
    var presets = GG.content.presets || [], preset = null, i;
    for (i = 0; i < presets.length; i++) if (presets[i].id === p.presetId) preset = presets[i];
    preset = preset || presets[0] || null;
    return { name: p.name || 'You', nick: p.nick || '', presetId: preset ? preset.id : (p.presetId || null),
      look: U.clone(p.look || (preset && preset.look) || DEFAULT_LOOK),
      kitColor: p.kitColor || (preset && preset.kitColor) || DEFAULT_KIT,
      gearLook: Object.assign({}, C.GEAR_LOOK, p.gearLook || {}) };   // v1.1: a string seat's "your gear" (drums keep player.kit)
  }
  function makeMembers(band) {
    var src = band.members && band.members.length ? band.members : GENERIC_MEMBERS;
    return src.map(function (m) {
      return { id: m.id, name: m.name, nick: m.nick || '', role: m.role || '',
        skill: m.skill != null ? m.skill : 45, mood: m.mood != null ? m.mood : 65, status: 'active', original: true };
    });
  }

  // args: { seed?, bandId?, slot?, player: { name, nick, presetId, gearLook? }, seat? (v1.1: C.SEATS, default 'drums') }.
  // Week one comes pre-booked at Buddy's.
  // Moves the band to `era` (forward only), logs eraHistory and emits 'era:changed' { era, from, week, why }.
  career.setEra = function (state, era, why) {
    if (C.ERAS.indexOf(era) <= C.ERAS.indexOf(state.era)) return false;
    var from = state.era;
    state.era = era;
    (state.eraHistory = state.eraHistory || [{ era: 'garage', week: 1 }]).push({ era: era, week: state.totalWeek });
    GG.emit('era:changed', { era: era, from: from, week: state.totalWeek, why: why || null, text: ERA_TEXT[era] || '' });
    return true;
  };

  // v0.9: the week-one gig: band.firstGig when the venue exists, else the lowest-tier venue in the home city, else the
  // nearest small room (tier <= 1) by road km. null = no forced gig.
  career.firstGigVenue = function (state, band) {
    if (!GG.gig || !GG.gig.venue) return null;
    band = band || career.band(state) || {};
    if (band.firstGig && GG.gig.venue(band.firstGig)) return band.firstGig;
    var list = (GG.content.venues || []).filter(function (v) { return v && (v.minFans || 0) < 99999; }), city = String(state.city || band.city || '');
    function rank(a, b) { return (a.tier || 0) - (b.tier || 0) || (a.minFans || 0) - (b.minFans || 0) || (a.capacity || 0) - (b.capacity || 0); }
    var home = list.filter(function (v) { return v.city === city; }).sort(rank);
    if (home.length) return home[0].id;
    if (!GG.world) return null;
    var from = GG.world.home(state), near = list.filter(function (v) { return (v.tier || 0) <= 1; })
      .sort(function (a, b) { return GG.world.km(from, a.city) - GG.world.km(from, b.city) || rank(a, b); });
    return near.length ? near[0].id : null;
  };

  career.newCareer = function (args) {
    args = args || {};
    var E = econ(), p = args.player || {}, bandId = args.bandId || 'hail_damage';
    var band = career.band(bandId) || { id: bandId, name: 'The Band', genre: 'metal', city: 'Saskatoon',
      region: 'canada', space: 'parents_garage', members: GENERIC_MEMBERS, starterSongs: [] };
    var seed = args.seed != null ? ((args.seed >>> 0) || 1) : GG.hashSeed((p.name || 'You') + '|' + bandId);
    var state = {
      v: C.SAVE_SCHEMA, createdVersion: GG.VERSION, slot: args.slot || 'auto', seed: seed, rng: seed,
      bandId: bandId, genre: band.genre || 'metal', region: band.region || 'canada', city: band.city || 'Saskatoon',
      space: band.space || 'parents_garage', player: makePlayer(p),
      seat: C.SEATS.indexOf(args.seat) >= 0 ? args.seat : 'drums',   // v1.1 "Seats": fixed for the career
      totalWeek: 1, year: 1, week: 1, maxWeeks: C.WEEKS_PER_YEAR * C.CAREER_YEARS,
      phase: 'monday', era: 'garage', protected: true,
      careerDifficulty: GG.difficulty ? GG.difficulty.of({ careerDifficulty: args.careerDifficulty }) : 'normal',   // v0.6.1 C4: locked per career
      fund: Math.round(E.startFund * (GG.difficulty ? GG.difficulty.mul({ careerDifficulty: args.careerDifficulty }, 'startFund') : 1)), fans: E.startFans, buzz: E.startBuzz, chemistry: E.startChemistry,
      burnout: E.startBurnout, drumSkill: E.startDrumSkill, debtToParents: 0,
      members: makeMembers(band), songs: [], pendingSongs: [], draft: null,
      gear: { lanes: 4, doubleKick: false, seatLanes: { bass: 4, rhythm: 4, lead: 4 }, runs: { bass: false, rhythm: false, lead: false } },   // v1.1 seat gear
      card: null, plan: [null, null, null], gig: null, offer: null,
      lastGig: null, lastWeek: null, wrap: null, quiet: null,
      chains: {}, flags: {}, seenCards: {}, milestones: {}, chat: [], history: [],
      stats: { gigs: 0, songsWritten: 0, hustles: 0, cards: 0, earned: 0, bestGrade: null, parentsLoans: 0,
        quits: 0, returns: 0, recruits: 0, ultimatums: 0 },
      weekStart: null, yearStart: null, ended: false,
      // v0.3 (26_sim_world): the gig board, venue rep + banned wall, the van, this week's trip, a live gig in progress
      listings: [], listingsWeek: 0, bookPick: null, venueRep: {}, venueLast: {}, banned: [],
      van: GG.world ? GG.world.defaultVan({ bandId: bandId }) : null, trip: null, liveGig: null,
      weather: null,   // v0.6.1 (28_sim_calendar): this week's weather { week, kind, temp }, rolled on Mondays
      // v0.4 (27_sim_drama): pay the band, fill-ins, the recruit ad, originals who joined your rival
      payCut: E.drama ? E.drama.payCut : 0.3, fillIns: {}, recruitAd: null, rivalDefectors: [],
      // v0.5 (24_sim_labels): eras, labels, the studio, records, awards, the trophy wall
      eraHistory: [{ era: 'garage', week: 1 }], label: null, labelOffers: [], labelNext: {}, pastDeals: [], session: null,
      albums: [], awards: [], trophies: [], loonies: null, liveYear: { gigs: 0, score: 0 },
      // v1.0 "Glory" (02_contracts V1.0 GLORY; the same defaults GG.save.migrate fills on old saves)
      bonusYears: 0, legacyTrack: { bigHead: null }, legacy: null, ach: { got: {}, t: {} }, tutorial: { on: false, done: {}, past4: false }
    };
    state.members.forEach(function (m) { m.seatRole = career.seatRoleFor(state, m); });   // v1.1: the swapped member drums
    if (GG.labels) GG.labels.init(state);
    if (GG.rival) GG.rival.init(state);   // v0.6: the rival's parallel career, heat, showdowns
    if (GG.fans) GG.fans.init(state);     // v0.6.1: fanTypes, bandbook, superfans (Dale), fanClub, gifts
    if (GG.tour) GG.tour.init(state);     // v0.7: state.tour (regions, invites, the active tour, homesickness, the Gong)
    if (GG.shop) GG.shop.init(state);     // v0.8: gear (owned, sections, kit quality), spaceTier + upgrades, van tier/name/stickers, merch
    if (GG.licensing) GG.licensing.init(state);   // v0.8.1: state.licensing (offers, deals)
    if (GG.recap) GG.recap.init(state);           // v0.8.1: state.recaps
    state.members.forEach(function (m) { m.stage = 0; m.want = null; m.exit = null; });
    var rng = GG.rngFor(state);
    (band.starterSongs || []).forEach(function (t) { GG.songs.addStarter(state, t, rng); });
    state.history.push(Object.assign(historyPoint(state), { w: 0 }));   // week 0 baseline for charts
    snapshotYear(state);
    var fg = GG.gig ? career.firstGigVenue(state, band) : null;   // v0.9: band.firstGig (Buddy's for Hail Damage)
    if (fg) state.gig = GG.gig.makeGig(state, fg, 'forced');
    if (GG.world && state.gig) GG.world.decorate(state, state.gig);
    if (GG.calendar) state.weather = GG.calendar.weatherAt(state);
    GG.emit('career:new', { state: state });
    return state;
  };

  /* ======================================================================
     Monday: card + offer
     ====================================================================== */
  function maybeOffer(state, rng) {
    var E = econ();
    if (state.gig || state.offer || !GG.gig || state.fans < E.offerMinFans || (GG.tour && GG.tour.away(state))) return;   // v0.7: no home offers abroad
    if (rng.chance(E.offerChance)) state.offer = GG.world ? GG.world.offer(state, rng) : GG.gig.randomOffer(state, rng);
  }

  // Idempotent: calling it again in the same week returns the pending card (or null once resolved) without drawing.
  career.startWeek = function (state) {
    if (state.ended) return { card: null, offer: null, quiet: null };
    if (state.weekStart && state.weekStart.w === state.totalWeek) {
      var pending = state.card && !state.card.resolved ? career.currentCard(state) : null;
      if (state.card && !state.card.resolved && !pending) { state.card = null; state.phase = 'plan'; } // content vanished
      return { card: pending, offer: state.offer, quiet: state.quiet };
    }
    var rng = GG.rngFor(state);
    endStaleChains(state);
    snapshotWeek(state);
    if (GG.tour) GG.tour.monday(state);   // v0.7: departure day, this week's tour stop + its show, the fan-club president
    var away = !!(GG.tour && GG.tour.away(state));
    if (GG.calendar) GG.calendar.monday(state);   // v0.6.1: this week's weather, season news, the driver, holiday afterglow
    var forced = state.totalWeek > 1 && GG.drama ? GG.drama.forcedCard(state, rng) : null;   // v0.4 drama cards first
    var studio = !forced && GG.labels && GG.labels.inSession(state);   // v0.5: studio weeks draw a studio event instead
    var holiday = !forced && !studio && GG.calendar ? GG.calendar.holidayCard(state) : null;   // v0.6.1: holiday Monday cards
    var tourCard = !forced && !studio && GG.tour ? GG.tour.forcedCard(state) : null;   // v0.7: region cards abroad, invites, big in one place
    var lic = !forced && !studio && !tourCard && !holiday && GG.licensing ? GG.licensing.forcedCard(state) : null;   // v0.8.1: a licensing offer (or Buckle & Boot's fury)
    var fan = !forced && !studio && !tourCard && !holiday && !lic && GG.fans ? GG.fans.forcedCard(state) : null;   // v0.6.1: scandals, superfans, Patreeon
    var shopCard = !forced && !studio && !tourCard && !holiday && !lic && !(fan && fan.card) && GG.shop ? GG.shop.forcedCard(state) : null;   // v0.8: space offers, the misprint, Dana's solo, gear/van/merch deals
    var card = forced ? forced.card : studio ? GG.labels.studioEvent(state, rng) : tourCard || holiday || (lic && lic.card) || (fan && fan.card) || shopCard || (away ? null : drawCard(state, rng));
    if (card && !forced && !career.cardOk(state, card)) card = away || studio ? null : drawCard(state, rng);   // v0.9: the speaker / card guard (a card from another band's cast)
    state.card = card ? { id: card.id, resolved: false } : null;
    if (forced && forced.who) { state.card.who = forced.who; state.card.whoName = shortName(findMember(state, forced.who) || {}); }
    var cr = card ? career.cardRoles(state, card) : null;   // v0.9: role aliases resolve once, at the draw
    if (cr) {
      state.card.roles = cr;
      if (career.isAlias(card.speaker) && !state.card.who && cr[card.speaker]) { state.card.who = cr[card.speaker]; state.card.whoName = career.memberName(state, cr[card.speaker]); }
    }
    if (lic && lic.who && card === lic.card) state.card.who = lic.who;   // v0.8.1: who brings the offer (speaker 'recruit')
    var tctx = state.tour && state.tour.ctx;   // v0.9: a story card abroad voiced by 'recruit' (wt_homesick: the homesick bandmate)
    if (card && tourCard === card && tctx && tctx.who && tctx.card === card.id && !state.card.who) {
      state.card.who = tctx.who; state.card.whoName = shortName(findMember(state, tctx.who) || {});
    }
    if (card) state.seenCards[card.id] = state.totalWeek;
    state.quiet = card ? null : career.pickLine(state, rng, career.linePool(state, 'quietWeek'), FALLBACK_LINES.quietWeek);
    maybeOffer(state, rng);
    state.bookPick = null; state.trip = null;
    if (GG.world) GG.world.refresh(state, true);   // this week's gig board (own seeded RNG)
    if (GG.rival && !away) GG.rival.monday(state);   // v0.6: this week's showdown (BotB offer, festival listing, stolen slot, the final)
    state.phase = card ? 'monday' : 'plan';
    GG.emit('week:start', { totalWeek: state.totalWeek, year: state.year, week: state.week,
      card: card ? card.id : null, offer: state.offer, quiet: state.quiet });
    return { card: card, offer: state.offer, quiet: state.quiet };
  };

  // Applies choice i of the pending card. Roll choices: choice effects always, then success or fail.
  career.resolveCard = function (state, i) {
    var card = state.card && !state.card.resolved ? career.currentCard(state) : null;
    var choice = card && card.choices && card.choices[i];
    if (!choice) return null;
    var rng = GG.rngFor(state), d = {}, success = null, outcome = choice.outcome || '';
    career.applyEffects(state, choice.effects, d);
    if (choice.roll) {
      success = rng.chance(career.rollChance(state, choice.roll));
      var branch = success ? choice.roll.success : choice.roll.fail;
      if (branch) {
        career.applyEffects(state, branch.effects, d);
        if (branch.outcome) outcome = outcome ? outcome + ' ' + branch.outcome : branch.outcome;
      }
    }
    autoAdvanceChain(state, card, d);
    if (GG.drama) GG.drama.afterCard(state, card);
    if (GG.rival) GG.rival.afterCard(state, card);   // v0.6: a resolved poach card is a showdown
    if (GG.fans) GG.fans.afterCard(state, card, i, success, d);   // v0.6.1: fan cards' 'fan' effects + bookkeeping
    if (GG.tour) GG.tour.afterCard(state, card, i, success, d);   // v0.7: world cards' 'tour' effects (region fans, homesick, invites)
    if (GG.shop) GG.shop.afterCard(state, card, i, success, d);   // v0.8: shop cards' 'shop' effects (move, kit, van, sections, stock, the misprint)
    var lr = GG.licensing ? GG.licensing.afterCard(state, card, i, success, d) : null;   // v0.8.1: answer the offer (take / counter / decline)
    if (lr) { outcome = lr.outcome || outcome; if (lr.success != null) success = lr.success; }
    outcome = career.fillText(state, outcome);
    var who = state.card.who, whoName = state.card.whoName, roles = state.card.roles;
    state.card = { id: card.id, resolved: true, choice: i, outcome: outcome, deltas: d, success: success };
    if (who) { state.card.who = who; state.card.whoName = whoName; }
    if (roles) state.card.roles = roles;
    state.stats.cards++;
    state.phase = 'plan';
    var res = { cardId: card.id, choice: i, outcome: outcome, deltas: d, success: success };
    GG.emit('card:resolved', res);
    changed(state);
    return res;
  };

  career.setPlan = function (state, plan) {
    var out = [];
    for (var i = 0; i < C.BLOCKS_PER_WEEK; i++) out.push(plan && C.ACTIVITIES.indexOf(plan[i]) >= 0 ? plan[i] : null);
    state.plan = out;
    GG.emit('plan:changed', { plan: out });
    return out;
  };

  career.acceptOffer = function (state) {
    if (!state.offer || state.gig) return null;
    state.gig = state.offer; state.gig.source = 'offer'; state.offer = null;
    changed(state);
    return state.gig;
  };
  career.declineOffer = function (state) {
    var had = !!state.offer;
    state.offer = null;
    changed(state);
    return had;
  };

  /* ======================================================================
     The week: three activity blocks, then the weekend gig
     ====================================================================== */
  function activityLine(state, rng, id) {
    return career.pickLine(state, rng, career.linePool(state, ['activity', id]), FALLBACK_LINES.activity[id]);
  }
  // Each handler: (state, A = activity numbers, f = repeat factor, rng, d = deltas, lines)
  var ACT = {
    rehearse: function (state, A, f, rng, d) {
      activeMembers(state).forEach(function (m) { addMemberStat(state, 'skill', m.id, rngRound(A.skill * f * headroom(m.skill), rng), d); });
      addStat(state, 'drumSkill', rngRound(A.drumSkill * f * headroom(state.drumSkill), rng), d);
      addStat(state, 'chemistry', rngRound(A.chemistry * f, rng), d);
      var polished = GG.songs.polish(state, Math.round(A.polish * f), A.polishSongs);
      if (polished.length) d.polished = polished.map(function (s) { return s.id; });
      addStat(state, 'burnout', A.burnout, d);
    },
    // Uses the next song composed in the sequencer (state.pendingSongs, queued by the UI; null = "let the band jam
    // one"), else the band jams one out. Emits 'song:written' with the band's reactions.
    write: function (state, A, f, rng, d, lines) {
      var queued = state.pendingSongs && state.pendingSongs.length ? state.pendingSongs.shift() : null, song;
      if (queued && queued.sections) {
        song = GG.songs.create(state, queued, queued.title, { rng: rng, titleEn: queued.titleEn, repeatFactor: f });
        state.stats.songsWritten++;
      } else song = GG.songs.jam(state, rng, { repeatFactor: f });
      if (GG.drama && activeMembers(state).some(function (m) { return m.recruit && m.recruit.trait === 'studio_rat'; })) {
        song.quality = U.clamp(song.quality + GG.drama.cfg().traits.studioRatQuality, 0, 100);   // v0.4 trait: Studio Rat
      }
      var reactions = GG.songs.reactions(state, song, rng);
      d.song = { id: song.id, title: song.title, titleEn: song.titleEn, quality: song.quality, auto: song.auto,
        groove: song.rating.groove, hook: song.rating.hook, difficulty: song.rating.difficulty, reactions: reactions };
      lines.push('New song: “' + song.title + '”' + (song.titleEn && song.titleEn !== song.title ? ' (' + song.titleEn + ')' : '') + '.');
      addStat(state, 'chemistry', rngRound(A.chemistry * f, rng), d);
      addStat(state, 'burnout', A.burnout, d);
      GG.emit('song:written', { song: song, reactions: reactions });
    },
    promote: function (state, A, f, rng, d, lines) {
      addStat(state, 'fund', -A.cost, d);
      if (GG.labels) GG.labels.promoBlock(state, f, d);   // v0.5: hype for a scheduled release
      addStat(state, 'buzz', rngRound(A.buzz * f, rng), d);
      addStat(state, 'fans', rngRound(rng.int(A.fans[0], A.fans[1]) * f, rng), d);
      addStat(state, 'burnout', A.burnout, d);
      if (GG.fans) GG.fans.post(state, { f: f, d: d, lines: lines });   // v0.6.1: the block posts to Bandbook (own seeded RNG)
    },
    // v0.3: the gig board. Takes the board pick (UI: GG.ui.openBoard at Go; bots: botBook), 'skip' = no gig,
    // no pick at all = the best listing (flows without a board). Already booked, or skipped: posters (buzz).
    book: function (state, A, f, rng, d, lines) {
      var had = !!state.gig, g = null;
      if (!had) g = GG.world ? GG.world.takePick(state) : GG.gig ? GG.gig.bookLocal(state, rng, A.maxTier) : null;
      else state.bookPick = null;
      if (g) {
        state.gig = g; state.offer = null; d.book = g.venueId;
        lines.push('Booked: ' + g.name + ', ' + g.city + ', this weekend' + (g.opening ? ' (opening for ' + g.opening.name + ').' : '.'));
      } else {
        if (!had) lines.push('No gig this weekend. You hang posters for the next one instead.');
        addStat(state, 'buzz', rngRound(A.buzzIfBooked * f, rng), d);
      }
      addStat(state, 'burnout', A.burnout, d);
    },
    hustle: function (state, A, f, rng, d) {
      var cash = Math.round(rng.int(A.cash[0], A.cash[1]) * f * ((econ().hustleEra || {})[state.era] || 1) * (GG.difficulty ? GG.difficulty.mul(state, 'hustle') : 1));   // v0.5: fame pays (lessons, session work)
      addStat(state, 'fund', cash, d);
      state.stats.earned += cash; state.stats.hustles++;
      addStat(state, 'burnout', A.burnout, d);
      // v0.9: band.roles.grumbler (activities.hustle.grumbler may be a member id or a role alias), else the first member
      var bR = (career.band(state) || {}).roles || {}, gA = career.isAlias(A.grumbler) ? career.roleOf(state, A.grumbler) : A.grumbler;
      var grumbler = findMember(state, bR.grumbler) || findMember(state, gA) || activeMembers(state)[0];
      if (grumbler) addMemberStat(state, 'mood', grumbler.id, A.grumble, d);
    },
    rest: function (state, A, f, rng, d) {
      addStat(state, 'burnout', rngRound(A.burnout * f, rng), d);
      addMemberStat(state, 'mood', 'all', rngRound(A.mood * f, rng), d);
    }
  };
  function runActivity(state, id, nth, rng) {
    var E = econ(), f = E.repeatFactor[Math.min(nth, E.repeatFactor.length) - 1], d = {}, lines = [];
    if (GG.shop && !(GG.tour && GG.tour.away(state))) f *= GG.shop.perkFactor(state, id);   // v0.8: the jam room / couch / green room at home
    lines.push(activityLine(state, rng, id));
    if (!(GG.tour && GG.tour.block(state, id, GG.content.activities[id], f, rng, d, lines, ACT))) ACT[id](state, GG.content.activities[id], f, rng, d, lines);   // v0.7: on tour
    return { activity: id, lines: lines, deltas: d };
  }

  // Runs the three blocks (an empty block is a rest). A booked gig is then either played live (phase 'gig',
  // 'gig:pending'; the UI plays the van + the gig and calls finishGig) or, with opts.autoGig (bots, tests,
  // balance), auto-resolved here (road card by the bot when opts.style is set, then simulate) -> phase 'wrap'.
  // opts: { autoGig: bool, style: 'avg'|'good' }.
  career.runWeek = function (state, opts) {
    opts = opts || {};
    if (state.ended) return null;
    if (state.phase === 'wrap' || state.phase === 'gig') return state.lastWeek;   // double-tap safe
    var rng = GG.rngFor(state), counts = {}, blocks = [];
    state.phase = 'week';
    var studio = GG.labels && GG.labels.inSession(state) ? GG.labels.studioWeek(state, rng) : null;   // v0.5: studio weeks
    if (studio) studio.forEach(function (b, i) {
      blocks.push(b);
      GG.emit('block:done', { index: i, activity: b.activity, lines: b.lines, deltas: b.deltas });
      changed(state);
    });
    for (var i = 0; !studio && i < C.BLOCKS_PER_WEEK; i++) {
      var id = state.plan && ACT[state.plan[i]] ? state.plan[i] : 'rest';
      if (GG.tour) id = GG.tour.blockId(state, id, i);   // v0.7: abroad the planner shrinks to rest / promote / rehearse
      counts[id] = (counts[id] || 0) + 1;
      var block = runActivity(state, id, counts[id], rng);
      blocks.push(block);
      GG.emit('block:done', { index: i, activity: id, lines: block.lines, deltas: block.deltas });
      changed(state);
    }
    var result = { blocks: blocks, gig: null };
    state.lastWeek = result;
    if (GG.tour) GG.tour.beforeGig(state);   // v0.7: an open date on tour books from the regional board
    if (state.gig && GG.gig && !opts.autoGig) {
      state.phase = 'gig';
      GG.emit('gig:pending', { gig: state.gig });
      GG.emit('week:done', { result: result });
      return result;
    }
    if (state.gig && GG.gig) {
      if (GG.world && opts.style) GG.world.autoTrip(state, opts.style);
      result.gig = settleGig(state, GG.gig.simulate(state, state.gig, rng), rng);
    }
    state.phase = 'wrap';
    GG.emit('week:done', { result: result });
    return result;
  };
  // Applies a GIG_RESULT for the booked gig: world.shape (opening slot, genre comedy) -> gig.applyResult ->
  // world.afterGig (venue rep, van wear, long-drive burnout). Emits 'gig:done'.
  function settleGig(state, r, rng) {
    var g = state.gig;
    if (GG.world) GG.world.shape(state, g, r, rng);
    if (GG.rival) GG.rival.shape(state, g, r);   // v0.6: BotB / festival / Sad Dome verdicts, same-night crowd split
    GG.gig.applyResult(state, r);
    if (GG.world) GG.world.afterGig(state, g, r, rng);
    if (GG.labels) GG.labels.afterGig(state, r);   // v0.5: the Best Live Act case for the Loonies
    if (GG.recap) GG.recap.gig(state, r);          // v0.8.1: the year's best / worst gig
    if (GG.legacy) GG.legacy.gig(state, r, g); if (GG.achieve) GG.achieve.gig(state, r, g);   // v1.0: biggest venue headlined; gig achievements
    state.liveGig = null;
    GG.emit('gig:done', { result: r });
    changed(state);
    return r;
  }
  // Phase 'gig' -> 'wrap': applies the live GIG_RESULT (from the rhythm game; null = simulate it, e.g. a skipped
  // show) plus venue rep and van wear. Double-call safe: outside phase 'gig' it returns the last result.
  career.finishGig = function (state, result) {
    if (state.phase !== 'gig' || !state.gig || !GG.gig) return state.phase === 'wrap' ? state.lastGig : null;
    var rng = GG.rngFor(state);
    var r = settleGig(state, result || GG.gig.simulate(state, state.gig, rng), rng);
    if (state.lastWeek) state.lastWeek.gig = r;
    state.phase = 'wrap';
    return r;
  };
  // The board pick for this week's Book block (listing id or 'skip'); see GG.world.pick.
  career.pickListing = function (state, id) { return GG.world ? GG.world.pick(state, id) : null; };
  career.botBook = function (state, style) { return GG.world ? GG.world.botBook(state, style) : 'skip'; };

  /* ======================================================================
     Week wrap: upkeep, drift, chat, parents' loan, milestones, year end
     ====================================================================== */
  // Weekly bills: base + per fan (saturating past upkeepFanCap, v0.5) + the era's extras (economy.eraUpkeep) + v0.8 the
  // rehearsal space's rent (GG.shop.rent; tier 0 is free).
  career.upkeep = function (state) {
    var E = econ(), cap = E.upkeepFanCap || Infinity, f = Math.min(state.fans, cap) + Math.max(0, state.fans - cap) * (E.upkeepFanTail != null ? E.upkeepFanTail : 1);
    return Math.round((E.weeklyUpkeep + f * E.upkeepPerFan + ((E.eraUpkeep || {})[state.era] || 0) + (GG.shop ? GG.shop.rent(state) : 0)) * (GG.difficulty ? GG.difficulty.mul(state, 'upkeep') : 1));
  };
  function decayBuzz(state) {
    if (state.buzz <= 0) return 0;
    return -addStat(state, 'buzz', -Math.max(1, Math.round(state.buzz * econ().buzzDecay)));
  }
  function moodBaseline(state) {
    var E = econ();
    var b = E.moodBaseline + (state.buzz - 20) * E.moodBuzzScale + (state.chemistry - 50) * E.moodChemScale
      - Math.max(0, state.burnout - E.moodBurnoutFrom) * E.moodBurnoutScale;
    return U.clamp(b, E.moodBaselineRange[0], E.moodBaselineRange[1]);
  }
  function driftMoods(state) {
    var E = econ(), base = moodBaseline(state);
    var drag = state.burnout > E.burnoutMoodAt ? Math.round((state.burnout - E.burnoutMoodAt) / E.burnoutMoodPer) : 0;
    activeMembers(state).forEach(function (m) {
      addMemberStat(state, 'mood', m.id, Math.round((base - m.mood) * E.moodDrift) - drag, null);
    });
  }
  // Chemistry follows the band's average mood (rehearsals and good gigs push it above that).
  function driftChemistry(state) {
    var act = activeMembers(state);
    if (!act.length) return;
    var avgMood = act.reduce(function (t, m) { return t + m.mood; }, 0) / act.length;
    addStat(state, 'chemistry', Math.round((avgMood - state.chemistry) * econ().chemistryDrift), null);
  }
  function postWeeklyChat(state, rng) {
    var E = econ(), out = [];
    activeMembers(state).forEach(function (m) {
      var n = rng.chance(E.chatChance) ? (rng.chance(E.chatSecondChance) ? 2 : 1) : 0;
      var bucket = chatBucket(m.mood), label = career.moodLabel(m.mood);
      for (var i = 0; i < n; i++) {
        var pool = contentLines('chat', m.id, label) || contentLines('chat', m.id, bucket)
          || (m.recruit && GG.content.recruits && GG.content.recruits.chat && GG.content.recruits.chat[bucket]);
        if (!pool && career.isSilent(state, m.id)) continue;   // v0.9: a silent member without their own lines stays silent
        var text = career.pickLine(state, rng, pool, FALLBACK_LINES.chat[bucket]);
        var msg = text ? postChat(state, m.id, text, null) : null;
        if (msg) out.push(msg);
      }
    });
    return out;
  }
  function parentsLoan(state, rng, wrap) {
    if (state.fund >= 0) return;
    var loan = econ().parentsCushion - state.fund;
    addStat(state, 'fund', loan, null);
    if (state.yearStart) state.yearStart.fin = (state.yearStart.fin || 0) - loan;   // v0.8.1: a loan isn't income
    state.debtToParents += loan;
    state.stats.parentsLoans++;
    state.flags.parentsLoan = true;
    wrap.parentsLoan = loan;
    wrap.guilt = career.pickLine(state, rng, career.linePool(state, 'guilt'), FALLBACK_LINES.guilt);
  }
  function checkMilestones(state) {
    var E = econ(), hits = [];
    function hit(key, cond) {
      if (!cond || state.milestones[key]) return;
      state.milestones[key] = state.totalWeek;
      var ms = career.pool(state, GG.content.lines, 'milestones'), custom = ms && ms[key];   // v0.9: lines.milestones + byBand
      if (Array.isArray(custom)) custom = custom.length ? custom[state.totalWeek % custom.length] : null;
      hits.push(career.fillText(state, custom || MILESTONES[key] || key));
    }
    hit('firstGig', state.stats.gigs >= 1);
    hit('firstSong', state.stats.songsWritten >= 1);
    E.fanMilestones.forEach(function (n) { hit('fans' + n, state.fans >= n); });
    hit('fund' + E.fundMilestone, state.fund >= E.fundMilestone);
    // v0.4: garage-era protection is over (250 fans). v0.5: that is also the Local Heroes era.
    hit('localHeroes', GG.drama ? !state.protected : state.fans >= ((E.eras || {}).localFans || 250));
    if (state.milestones.localHeroes && state.era === 'garage') career.setEra(state, 'local', 'fans');
    hit('signed', !!(state.label && !state.label.dropped));
    hit('diyAlbum', (state.albums || []).some(function (a) { return a.status === 'released' && a.kind === 'album' && !a.dealId; }));
    return hits;
  }
  function statDeltas(ws, state) {
    var d = {};
    C.STATS.forEach(function (k) { d[k] = state[k] - (ws ? ws[k] : state[k]); });
    return d;
  }
  function memberWrap(ws, state) {
    return activeMembers(state).map(function (m) {
      var before = ws && ws.members[m.id] ? ws.members[m.id].mood : m.mood;
      return { id: m.id, name: m.name, nick: m.nick, mood: m.mood, moodDelta: m.mood - before, skill: m.skill,
        label: career.moodLabel(m.mood), stage: m.stage || 0 };
    });
  }
  function yearEnd(state, rng, wrap) {
    var ys = state.yearStart || {};
    wrap.yearEnd = true;
    wrap.yearSummary = {
      year: state.year, fans: state.fans, fansGained: state.fans - (ys.fans || 0), fund: state.fund,
      gigs: state.stats.gigs - (ys.gigs || 0), songsWritten: state.stats.songsWritten - (ys.songsWritten || 0),
      parentsLoans: state.stats.parentsLoans - (ys.parentsLoans || 0), earned: state.stats.earned - (ys.earned || 0),
      bestGrade: state.stats.bestGrade, era: state.era,
      releases: (state.stats.releases || 0) - (ys.releases || 0), royalties: (state.stats.royalties || 0) - (ys.royalties || 0),
      line: career.pickLine(state, rng, career.linePool(state, 'yearEnd'), FALLBACK_LINES.yearEnd)
    };
    if (GG.recap) wrap.recap = GG.recap.build(state);   // v0.8.1: the year-end recap (compact, kept in state.recaps)
  }
  function advance(state, wrap) {
    state.offer = null; state.card = null; state.quiet = null;
    if (state.totalWeek >= state.maxWeeks) {
      state.ended = true; state.phase = 'ended'; wrap.ended = true;
      if (GG.legacy) wrap.legacy = GG.legacy.finish(state); if (GG.achieve) GG.achieve.finish(state);   // v1.0: before 'career:end'
      return;
    }
    state.totalWeek++;
    state.year = Math.floor((state.totalWeek - 1) / C.WEEKS_PER_YEAR) + 1;
    state.week = (state.totalWeek - 1) % C.WEEKS_PER_YEAR + 1;
    state.phase = 'monday';
    if (wrap.yearEnd) snapshotYear(state);
  }

  // Closes the week (phase must be 'wrap'), advances to the next Monday and returns the WRAP.
  // Calling it again before the next runWeek returns the same wrap (double-tap safe).
  career.endWeek = function (state) {
    if (state.phase !== 'wrap') return state.wrap || null;
    var E = econ(), rng = GG.rngFor(state), ws = state.weekStart;
    var wrap = { totalWeek: state.totalWeek, year: state.year, week: state.week, deltas: null,
      upkeep: 0, buzzDecay: 0, parentsLoan: 0, guilt: null, members: null, chat: null, milestones: null,
      yearEnd: false, yearSummary: null, ended: false };
    wrap.upkeep = -addStat(state, 'fund', -career.upkeep(state), null);
    wrap.buzzDecay = decayBuzz(state);
    addStat(state, 'fans', rngRound(state.buzz * E.buzzFans, rng), null);
    addStat(state, 'burnout', -E.burnoutRecovery, null);
    driftMoods(state);
    wrap.chat = [];
    if (GG.drama) GG.drama.weekly(state, rng, wrap);   // v0.4: mood drivers, grievance stages, exits, protection
    if (GG.labels) GG.labels.weekly(state, rng, wrap);  // v0.5: offers, deals, releases, charts, royalties, Loonies
    if (GG.rival) GG.rival.weekly(state, rng, wrap);    // v0.6: the rival's career, heat, forfeits, cracking (wrap.rival)
    if (GG.fans) GG.fans.weekly(state, wrap);           // v0.6.1: fan types, mail + gifts, Patreeon payouts (wrap.fans; own RNG)
    if (GG.tour) GG.tour.weekly(state, rng, wrap);      // v0.7: hotels, homesickness, tour end, unlocks, invites, the Gong (wrap.tour; own RNG)
    if (GG.shop) GG.shop.weekly(state, rng, wrap);      // v0.8: Outro/Solo + merch unlocks, space perks, the misprint (wrap.shop; rent is in upkeep)
    driftChemistry(state);
    wrap.chat = wrap.chat.concat(postWeeklyChat(state, rng));
    parentsLoan(state, rng, wrap);
    GG.songs.weekly(state);
    if (GG.licensing) GG.licensing.weekly(state, rng, wrap);   // v0.8.1: offers expire, ad songs stay stale, a new offer (wrap.licensing; own RNG)
    wrap.milestones = checkMilestones(state);
    if (GG.legacy) GG.legacy.weekly(state, wrap);   // v1.0: bonus years land here, before advance() reads maxWeeks
    state.history.push(historyPoint(state));
    if (state.history.length > E.historyMax) state.history.splice(0, state.history.length - E.historyMax);
    wrap.deltas = statDeltas(ws, state);
    wrap.members = memberWrap(ws, state);
    if (state.week === C.WEEKS_PER_YEAR) yearEnd(state, rng, wrap);
    if (GG.achieve) GG.achieve.weekly(state, wrap);   // v1.0: week / year achievements
    advance(state, wrap);
    state.wrap = wrap;
    GG.emit('week:wrap', { wrap: wrap });
    if (wrap.yearEnd) GG.emit('year:end', { year: wrap.year, summary: wrap.yearSummary });
    if (wrap.ended) GG.emit('career:end', { state: state });
    changed(state);
    return wrap;
  };

  /* ======================================================================
     Bots (tools/balance.js, tests). 'good' is pure logic; 'avg' mixes in the career RNG.
     ====================================================================== */
  function memberSum(state, map) {
    var t = 0;
    for (var id in map || {}) t += map[id] * (id === 'all' ? activeMembers(state).length : 1);
    return t;
  }
  function effectValue(state, fx) {
    if (!fx) return 0;
    var W = econ().bot.value, v = 0;
    v += (fx.fund || 0) * (state.fund < W.broke ? W.fundBroke : W.fund);
    v += (fx.fans || 0) * W.fans + (fx.buzz || 0) * W.buzz + (fx.chemistry || 0) * W.chemistry;
    v -= (fx.burnout || 0) * W.burnout * (state.burnout > 50 ? 2 : 1);
    v += (fx.drumSkill || 0) * W.drumSkill + memberSum(state, fx.mood) * W.mood + memberSum(state, fx.skill) * W.skill;
    if (fx.book && !state.gig) v += W.book;
    if (fx.member && GG.drama) v += GG.drama.botValue(state, fx.member);
    if (fx.fan && GG.fans) v += GG.fans.botValue(state, fx.fan);   // v0.6.1
    if (fx.shop && GG.shop) v += GG.shop.botValue(state, fx.shop);   // v0.8
    if (fx.payCut) v -= fx.payCut * 60;
    if (fx.repay) v += 2 - Math.min(fx.repay, state.debtToParents || 0) * W.fund;
    return v;
  }
  function choiceValue(state, ch) {
    var v = effectValue(state, ch.effects);
    if (ch.roll) {
      var p = career.rollChance(state, ch.roll);
      v += p * effectValue(state, ch.roll.success && ch.roll.success.effects)
        + (1 - p) * effectValue(state, ch.roll.fail && ch.roll.fail.effects);
    }
    return v;
  }
  career.botChoice = function (state, card, style) {
    if (!card || !card.choices || !card.choices.length) return 0;
    var best = 0, bestV = -Infinity;
    for (var i = 0; i < card.choices.length; i++) {
      var v = choiceValue(state, card.choices[i]);
      if (v > bestV) { bestV = v; best = i; }
    }
    var dc = GG.drama ? GG.drama.botCardChoice(state, card, style) : null;   // v0.4: the avg bot sometimes refuses an ultimatum
    if (dc != null) return dc;
    var lc = GG.licensing ? GG.licensing.botChoice(state, card, style) : null;   // v0.8.1: take / counter / decline an offer
    if (lc != null) return lc;
    if (style === 'good' || (GG.shop && GG.shop.card(card.id))) return best;   // v0.8: shop cards show the price/rent on the button: bots read it
    var rng = GG.rngFor(state);
    return rng.chance(econ().bot.avgSmart) ? best : rng.int(0, card.choices.length - 1);
  };
  career.botOffer = function (state, style) {
    if (!state.offer || state.gig) return false;
    // v0.5: a broke band (after the garage era) turns down shows that cost more than they pay
    if (style !== 'good' && GG.world && state.fund < career.brokeLine(state, econ().bot.avg) && GG.world.estimate(state, state.offer).net < 0) return false;
    return style === 'good' || GG.rngFor(state).chance(econ().bot.avgAcceptOffer);
  };
  // v0.5: bots feel broke relative to their weekly bills (a signed band burns more than $100 a week).
  career.brokeLine = function (state, B) { return state.era === 'garage' ? B.hustleBelow : Math.max(B.hustleBelow, career.upkeep(state) * (B.brokeWeeks || 0)); };
  function goodPlan(state, B) {
    var want = [];
    if (state.burnout >= B.restAt) want.push('rest');
    if (state.fund < career.brokeLine(state, B)) want.push('hustle');
    if (GG.labels && GG.labels.promoWanted(state)) want.push('promote');   // v0.5: hype the release
    if (!state.gig) want.push('book');
    if (state.songs.length < B.minSongs || state.totalWeek % B.writeEvery === 0) want.push('write');
    want.push('rehearse');
    if (state.fund > B.promoteAbove && state.buzz < B.promoteBuzzBelow) want.push('promote');
    want.push('write', 'hustle', 'rehearse');
    var plan = [];
    for (var i = 0; i < want.length && plan.length < C.BLOCKS_PER_WEEK; i++) if (plan.indexOf(want[i]) < 0) plan.push(want[i]);
    return plan;
  }
  function avgPlan(state, B, rng) {
    var plan = [], broke = state.fund < career.brokeLine(state, B);
    for (var i = 0; i < C.BLOCKS_PER_WEEK; i++) {
      plan.push(rng.weighted(C.ACTIVITIES, function (a) {
        var w = B.weights[a] || 0;
        if (a === 'rest' && state.burnout >= B.restAt) w *= 4;
        if (a === 'hustle' && broke) w *= 4;
        if (a === 'book' && state.gig) w *= 0.3;
        else if (a === 'book' && broke && state.era !== 'garage') w *= 2;
        if (a === 'promote' && broke && state.era !== 'garage') w *= 0.3;
        if (a === 'promote' && GG.labels && GG.labels.promoWanted(state)) w *= B.promoRelease || 3;
        return w;
      }));
    }
    return plan;
  }
  career.botPlan = function (state, style) {
    var B = econ().bot;
    if (GG.tour && GG.tour.away(state)) return GG.tour.botPlan(state, style);   // v0.7: on tour
    return style === 'good' ? goodPlan(state, B.good) : avgPlan(state, B.avg, GG.rngFor(state));
  };
  // One full bot week: card, offer, plan, blocks, wrap. Returns the WRAP.
  career.botWeek = function (state, style) {
    var start = career.startWeek(state);
    if (start.card) career.resolveCard(state, career.botChoice(state, start.card, style));
    if (GG.rival) GG.rival.botWeek(state, style);   // v0.6: enter (or pass on) a Battle of the Bands
    if (state.offer) { if (career.botOffer(state, style)) career.acceptOffer(state); else career.declineOffer(state); }
    if (GG.drama) GG.drama.botWeek(state, style);   // v0.4: pay the band, fill holes (ad + hire)
    if (GG.labels) GG.labels.botWeek(state, style);  // v0.5: demands, offers (sign), studio (record), release
    if (GG.fans) GG.fans.botWeek(state, style);      // v0.6.1: a Patreeon exclusive now and then
    if (GG.tour) GG.tour.botWeek(state, style);      // v0.7: botTour: book a tour package (departs next week)
    if (GG.shop) GG.shop.botWeek(state, style);      // v0.8: gear, the kit, the van, a bigger space, upgrades, merch stock
    if (GG.licensing) GG.licensing.botWeek(state, style);   // v0.8.1: an offer whose card never came up, answered on the laptop
    career.setPlan(state, career.botPlan(state, style));
    if (!state.gig && state.plan.indexOf('book') >= 0) state.bookPick = career.botBook(state, style);
    var B = econ().bot, van = state.van;   // the good bot sends the Moose Hearse to Cousin Dale when it's rough
    // v0.9: a free fix (Moth does her own maintenance) is taken whenever the van is below freeFixBelow, like a player would
    var freeFix = GG.world && van && GG.world.repairQuote ? GG.world.repairQuote(state).cost === 0 : false;
    if (GG.world && van && freeFix && !state.protected && van.condition < (B.freeFixBelow || 60)) GG.world.repairVan(state);
    else if (GG.world && style === 'good' && van && van.condition < (B.repairBelow || 40) && state.fund > (B.repairAbove || 400)) GG.world.repairVan(state);
    else if (GG.world && style === 'avg' && van && !state.protected && van.condition < 15 && state.fund > 600) GG.world.repairVan(state);   // v0.4: breakdowns are real now
    career.runWeek(state, { autoGig: true, style: style });
    return career.endWeek(state);
  };

  // v0.9: a save that names its band but lacks genre / region / city / space gets them from that band (bands.js). GG.save.migrate
  // does this itself now (folded in at integration); this helper stays for callers that want only the band defaults.
  career.migrateBand = function (s) {
    if (!s || typeof s !== 'object' || Array.isArray(s) || typeof s.bandId !== 'string') return s;
    var b = career.band(s.bandId);
    if (!b) return s;
    [['genre', b.genre], ['region', b.region], ['city', b.city], ['space', b.space]].forEach(function (kv) {
      if ((s[kv[0]] === undefined || s[kv[0]] === null) && kv[1]) s[kv[0]] = kv[1];
    });
    return s;
  };

  GG.registerDebug('career', function () {
    var s = GG.state;
    if (!s) return { state: null };
    return { totalWeek: s.totalWeek, year: s.year, week: s.week, phase: s.phase, fund: s.fund, fans: s.fans,
      buzz: s.buzz, chemistry: s.chemistry, burnout: s.burnout, drumSkill: s.drumSkill,
      card: s.card && s.card.id, gig: s.gig && s.gig.venueId, offer: s.offer && s.offer.venueId,
      members: s.members.map(function (m) { return { id: m.id, mood: m.mood, skill: m.skill }; }) };
  });
})(window.GG);
