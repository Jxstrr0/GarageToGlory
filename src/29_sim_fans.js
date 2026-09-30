// 29_sim_fans.js: fans and Bandbook (v0.6.1, FANS agent; Addendum 1 C5). Pure sim: no DOM or audio. Seeded RNGs only:
// every roll uses its own RNG seeded by career seed + week + a salt + the post counter, so it never shifts the career RNG.
// Content: content/bandbook.js (posts, comments, superfans, mail, gifts, Patreeon tiers, fan cards); numbers: economy.fans.
//  - Promote blocks post automatically (career ACT.promote -> post): the kind is picked from band state (a booked gig ->
//    announcement, a new song -> teaser, rehearsals -> clip, studio/van -> behind the scenes, memes). Posts add buzz, new
//    fans and album streams on top of the old Promote numbers; each has a small viral chance (weirder = likelier), good or
//    the wrong kind (a cringe member: buzz up, their mood down, haters up). 2–4 generated comments by sentiment + the
//    rival's supportive comment on every post; Dale and Wendell comment too; haters get their own comments.
//  - Fans stay ONE count (state.fans); state.fanTypes are shares { super, casual, hater } that drift weekly (superfans with
//    chemistry and a happy fan club, haters with fame and scandals).
//  - Named superfans (state.superfans): Dale from Warman (from day one; at every show, in the crowd and the comments),
//    Big Wendell the jumper-cable trucker (met through a fan card), the Japanese fan-club president (v0.7: met on the first
//    week in Japan via GG.tour; region superfans show `reserved: <region name>` until met; at Japan shows and in comments).
//  - Scandals: a post (or a weekly roll: bandmates post on their own) queues a scandal choice card for next Monday.
//  - Fan mail + gifts (state.gifts) arrive weekly by chance; Dale's macaroni portrait of Kenji comes through a card.
//  - Patreeon (state.fanClub, Signed era): opened through a card or the Bandbook app; exclusive posts keep members happy;
//    members + a monthly payout (every second week) depend on superfans and happiness.
// API (GG.fans):
//   cfg() · content() · init(s) · ensure(s) · migrate(s) · shares(s) · counts(s) {total, super, casual, hater} · sentiment(s)
//   post(s, { f, d, lines, kind }) POST · exclusive(s, { d, lines }) POST|null · canExclusive(s) · feed(s, n)
//   gigShape(s, g, r) (GG.gig.applyResult: superfans follow on tour, Dale, Wendell, hecklers; crowd/buzz only)
//   merchMods(s, r?) -> { share (superfan share: they buy more merch, GG.shop.gigMerch), named: [superfan ids at this gig who
//     each buy one: 'dale' (every home show), 'trucker', 'president'] }   (v0.8)
//   weekly(s, wrap) (career.endWeek; wrap.fans) · forcedCard(s) {card}|null (career.startWeek) · afterCard(s, card, i, success, d)
//   apply(s, v, d) (fan cards' 'fan' effect, applied by afterCard) · effectText(v) · cards() · card(id) · openClub(s) · club(s) view · tiers(s)
//   superfanList(s) · superfanDef(id) · gifts(s) · addGift(s, id) · kindInfo(kind) · botValue(s, v) · botWeek(s, style)
//   v0.8.1 (LICRECAP): queue(s, cardId, who, source) (a licensing scandal; hater nudge + loyalty bump go through apply);
//   cards() also lists GG.licensing.fanCards(); isScandal knows the licensing scandals.
// POST = { id, w, kind, who, text, likes, shares, plays, viral: null|'good'|'cringe', exclusive, streams,
//          fx: { buzz, fans }, comments: [{ who: 'fan'|'hater'|'rival'|'dale'|'trucker', name, text }] }
// Events: 'fans:post' { post } · 'fans:viral' { post, kind } · 'fans:scandal' { card, who } · 'fans:gift' { gift }
//         · 'fans:club' { action: 'open'|'exclusive'|'payout', club }
// v0.9: homeSuperfan(s) (owner Q5: bandbook.homeSuperfan[bandId] in the 'dale' slot; superfanDef('dale', s)) ; pool(s, path,
//   fallback) (bandbook pools + byBand; items with gate / band: [ids] are filtered) ; rival comments from rivalry.cast ;
//   talkers instead of 'kenji' ; fan cards through '<id>_<bandId>' variants.
(function (GG) {
  var C = GG.contracts, U = GG.util;
  var F = GG.fans = GG.fans || {};

  var DEF = {
    shares: { start: { super: 0.06, casual: 0.92, hater: 0.02 }, drift: 0.15, superBase: 0.04, superChem: 0.04, superClub: 0.02,
      superRange: [0.03, 0.18], haterBase: 0.01, haterFame: 0.05, haterRange: [0.005, 0.3] },
    post: { buzz: 1, fans: 1, fansPer: 0.0015, max: 24, likes: 0.08, streams: 0.01, kinds: { rehearsal: 1, gig: 1.2, teaser: 1.1, meme: 0.9, bts: 1 } },
    viral: { base: 0.04, weird: { meme: 0.05, bts: 0.02 }, burnout: 0.02, buzzPer: 0.0004, max: 0.2, cringe: 0.3, buzz: 9, cringeBuzz: 6,
      fans: 15, fansPer: 0.025, cringeFans: 0.5, mood: -6, hater: 0.02, super: 0.005, streams: 0.06 },
    scandal: { post: 0.03, weekly: 0.01, burnout: 0.02, cooldown: 6, fromWeek: 4 },
    cardGap: 3, cardFrom: 6,
    gig: { followKm: 60, followShare: 0.03, followCap: 0.08, trucker: 0.35, buzzAt: 5, dale: { S: 3, A: 3, B: 1, C: 1, D: -2 } },
    mail: { chance: 0.1, perSuper: 0.00005, max: 0.3 }, gift: { chance: 0.04, perSuper: 0.00003, max: 0.14 }, giftsMax: 30,
    superfans: { moodStart: 70, moodHome: 65, drift: 1, daleGiftAfter: 6, truckerAfterGigs: 3, truckerKm: 80 },
    club: { cut: 0.12, join: 0.005, maxMembers: 60, happyStart: 70, decay: 7, exclusive: 18, exclusiveAgain: 5, exclusiveBurnout: 1,
      churnBelow: 30, churn: 0.1, move: 0.4, redecline: 8, grumbleBelow: 30, grumbleGap: 6,
      tierShare: { drumstick: 0.6, snare: 0.3, full_kit: 0.1 }, van: 2 },
    bot: { avgExclusive: 0.35, goodHappyBelow: 60, goodBurnoutBelow: 85 }
  };
  var KINDS = ['rehearsal', 'gig', 'teaser', 'meme', 'bts'];
  function isObj(o) { return o && typeof o === 'object' && !Array.isArray(o); }
  function merge(a, b) {
    var o = {}, k;
    for (k in a) o[k] = a[k];
    for (k in b) o[k] = isObj(a[k]) && isObj(b[k]) ? merge(a[k], b[k]) : b[k];
    return o;
  }
  var cache = { src: null, val: DEF };
  F.cfg = function () {
    var e = GG.content.economy && GG.content.economy.fans;
    if (!e) return DEF;
    if (cache.src !== e) { cache.src = e; cache.val = merge(DEF, e); }
    return cache.val;
  };
  var EMPTY = { kinds: {}, posts: {}, viral: { good: [], cringe: [] }, comments: {}, handles: { fan: ['a_fan'], hater: ['a_hater'] },
    superfans: [], gigLines: {}, mail: [], gifts: [], scriptedGifts: {}, tiers: [], club: {}, chat: {}, scandals: [], cards: [] };
  F.content = function () { return GG.content.bandbook || EMPTY; };
  function K() { return F.content(); }
  // v0.9: a bandbook pool for this career: flat (neutral) + byBand[bandId] (career.pool), e.g. ['posts', 'meme'],
  // ['comments', 'good'], ['handles', 'fan'], ['chat', 'viral'], 'mail', 'gifts'. Items may carry a gate (card gate) or
  // band: [ids]; those that don't fit the band are left out.
  function fits(s, x) {
    if (!x || typeof x !== 'object') return true;
    if (x.band && [].concat(x.band).indexOf(s.bandId) < 0) return false;
    return !x.gate || !GG.career || GG.career.gatePasses(s, x.gate);
  }
  function bpool(s, path, fallback) {
    var v = s && GG.career && GG.career.pool ? GG.career.pool(s, K(), path) : null;
    if (v == null) { v = K(); [].concat(path).forEach(function (k) { v = v != null ? v[k] : v; }); }
    return Array.isArray(v) ? v.filter(function (x) { return fits(s, x); }) : v != null ? v : fallback;
  }
  F.pool = bpool;

  /* ---- Small helpers ------------------------------------------------------------------------------------------ */
  function rngOf(s, salt) {
    var b = s.bandbook || {};
    return GG.RNG(GG.hashSeed((s.seed >>> 0) + '|fans|' + salt + '|' + s.totalWeek + '|' + (b.seq || 0)));
  }
  function rr(x, rng) { var f = Math.floor(x); return f + (rng.chance(x - f) ? 1 : 0); }
  function active(s) { return (s.members || []).filter(function (m) { return m.status === 'active'; }); }
  function isActive(s, id) {
    if (id === 'player' || id === 'band') return true;
    return active(s).some(function (m) { return m.id === id; });
  }
  function nameOf(s, id) {
    if (id === 'player') return (s.player && (s.player.nick || s.player.name)) || 'you';
    if (id === 'band') { var b = GG.career && GG.career.band ? GG.career.band(s) : null; return b ? b.name : 'the band'; }
    return GG.career && GG.career.memberName ? GG.career.memberName(s, id) : id;
  }
  function newestSong(s) {
    var l = s.songs || [], best = null;
    for (var i = 0; i < l.length; i++) if (!best || (l[i].written || 0) >= (best.written || 0)) best = l[i];
    return best;
  }
  function rivalName(s) { return (GG.rival && GG.rival.name ? GG.rival.name(s) : '') || 'the other band'; }
  // Bandbook tokens, then the career tokens.
  function fill(s, text, ctx) {
    ctx = ctx || {};
    var t = String(text == null ? '' : text).replace(/\{(who|song|venue|gcity|views|n|money)\}/g, function (all, k) {
      if (k === 'who') return ctx.who ? nameOf(s, ctx.who) : 'the band';
      if (k === 'song') { var sg = newestSong(s); return ctx.song || (sg && sg.title) || 'the new one'; }
      if (k === 'venue') return ctx.venue || (s.gig && s.gig.name) || 'the show';
      if (k === 'gcity') return ctx.gcity || (s.gig && s.gig.city) || s.city || 'town';
      if (k === 'views') return U.fmtNum(ctx.views || 0);
      if (k === 'n') return String(ctx.n != null ? ctx.n : '');
      return U.fmtMoney(ctx.money || 0);
    });
    return GG.career && GG.career.fillText ? GG.career.fillText(s, t) : t;
  }
  function headroom(s) {
    var scene = GG.world && GG.world.scene ? GG.world.scene(s) : ((GG.content.economy && GG.content.economy.gig || {}).localScene || 6000);
    return U.clamp(1 - (s.fans || 0) / scene, 0.05, 1);
  }
  function round4(x) { return Math.round(x * 10000) / 10000; }
  function chat(s, who, text, d) { if (GG.career && GG.career.postChat && text) GG.career.postChat(s, who, text, d || null); }
  // v0.9: never a silent member; the preferred ids (Hail Damage), then role aliases, then the first bandmate who talks.
  function silent(s, id) { return GG.career && GG.career.isSilent ? GG.career.isSilent(s, id) : id === 'kenji'; }
  function talkers(s) { return GG.career && GG.career.talkers ? GG.career.talkers(s) : active(s).filter(function (m) { return !silent(s, m.id); }); }
  function speakerFor(s, prefer, roles) {
    for (var i = 0; i < prefer.length; i++) if (isActive(s, prefer[i]) && !silent(s, prefer[i])) return prefer[i];
    for (var j = 0; roles && j < roles.length; j++) {
      var r = GG.career && GG.career.roleOf ? GG.career.roleOf(s, roles[j]) : null;
      if (r && isActive(s, r) && !silent(s, r)) return r;
    }
    var a = talkers(s);
    return a.length ? a[0].id : null;
  }
  // v0.9 (owner Q5): the band's home superfan lives in the 'dale' state slot: bandbook.homeSuperfan[bandId] = { name, short?,
  // from, blurb, gigLines[], gigLinesFar?[], comments[], gift }, merged over superfans.dale (the fallback, Dale from Warman).
  F.homeSuperfan = function (s) {
    var base = (K().superfans || []).filter(function (d) { return d.id === 'dale'; })[0] || null;
    var hs = s && K().homeSuperfan && K().homeSuperfan[s.bandId];
    if (!hs) return base;
    var out = Object.assign({}, base || {}, hs, { id: 'dale', start: true });
    if (!hs.short) out.short = String(hs.name || '').split(' ')[0] || (base && base.short) || 'Superfan';
    return out;
  };

  /* ---- State ------------------------------------------------------------------------------------------------ */
  // Fills every fan field that is missing (idempotent; never overwrites a valid value).
  F.ensure = function (s) {
    if (!s || typeof s !== 'object') return s;
    var Q = F.cfg();
    var t = s.fanTypes;
    if (!isObj(t) || !isFinite(t.super) || !isFinite(t.hater) || !isFinite(t.casual)) s.fanTypes = U.clone(Q.shares.start);
    if (!isObj(s.bandbook)) s.bandbook = { posts: [], viral: 0, scandals: 0 };
    var b = s.bandbook;
    if (!Array.isArray(b.posts)) b.posts = [];
    if (!isFinite(b.viral)) b.viral = 0;
    if (!isFinite(b.scandals)) b.scandals = 0;
    if (!isFinite(b.seq)) b.seq = b.posts.length;
    if (!isFinite(b.streams)) b.streams = 0;
    if (b.pending === undefined) b.pending = null;
    if (!isObj(s.superfans)) s.superfans = {};
    K().superfans.forEach(function (d) {
      if (d.start && !isObj(s.superfans[d.id])) s.superfans[d.id] = { seen: 0, mood: Q.superfans.moodStart, since: s.totalWeek || 1 };
    });
    if (s.fanClub === undefined || (s.fanClub !== null && !isObj(s.fanClub))) s.fanClub = null;
    if (!Array.isArray(s.gifts)) s.gifts = [];
    return s;
  };
  F.init = function (s) { return F.ensure(s); };
  F.shares = function (s) { F.ensure(s); return s.fanTypes; };
  F.counts = function (s) {
    var t = F.shares(s), n = Math.max(0, Math.round(s.fans || 0));
    var sup = Math.round(n * t.super), hat = Math.round(n * t.hater);
    return { total: n, super: sup, hater: hat, casual: Math.max(0, n - sup - hat) };
  };
  function setShare(s, key, v) {
    var S = F.cfg().shares, t = F.shares(s), r = key === 'super' ? S.superRange : S.haterRange;
    t[key] = round4(U.clamp(v, r[0], r[1]));
    t.casual = round4(Math.max(0, 1 - t.super - t.hater));
  }
  function shiftShare(s, key, dv) { setShare(s, key, F.shares(s)[key] + dv); }
  // 'good' | 'mixed' | 'bad': buzz, the last gig, chemistry, haters.
  F.sentiment = function (s) {
    var g = s.lastGig && s.lastGig.grade, gs = { S: 0.25, A: 0.2, B: 0.08, C: 0, D: -0.2 }[g] || 0;
    var x = (s.buzz || 0) / 100 * 0.6 + gs + ((s.chemistry == null ? 50 : s.chemistry) - 50) / 250 - F.shares(s).hater;
    return x >= 0.35 ? 'good' : x >= 0.12 ? 'mixed' : 'bad';
  };
  F.kindInfo = function (kind) { var k = K().kinds[kind] || {}; return { id: kind, label: k.label || kind, icon: k.icon || '📘' }; };
  F.superfanDef = function (id, s) {
    s = s || GG.state || null;
    if (id === 'dale' && s && s.bandId) return F.homeSuperfan(s);   // v0.9: the band's own home superfan
    return K().superfans.filter(function (d) { return d.id === id; })[0] || null;
  };

  /* ---- Comments --------------------------------------------------------------------------------------------- */
  function pickLine(pool, rng, used) {
    pool = pool || [];
    for (var i = 0; i < 5; i++) { var x = rng.pick(pool); if (x != null && !used[x]) { used[x] = 1; return x; } }
    return rng.pick(pool) || '';
  }
  var POOL_MIX = { good: [0.7, 0.25, 0.05], mixed: [0.35, 0.5, 0.15], bad: [0.15, 0.4, 0.45] };
  function comments(s, post, rng) {
    var CM = {}, H = {}, t = F.shares(s), sf = s.superfans || {};   // v0.9: + byBand (bpool)
    ['good', 'mixed', 'bad', 'hater', 'rival', 'rivalExclusive'].forEach(function (k) { CM[k] = bpool(s, ['comments', k], []); });
    ['fan', 'hater'].forEach(function (k) { var h = bpool(s, ['handles', k], null); H[k] = h && h.length ? h : EMPTY.handles[k]; });
    var sent = F.sentiment(s), used = {}, names = {}, special = [], out = [];
    function handle(list) { for (var i = 0; i < 6; i++) { var h = rng.pick(list); if (!names[h]) { names[h] = 1; return h; } } return rng.pick(list); }
    var dale = F.superfanDef('dale', s), trk = F.superfanDef('trucker', s);
    if (sf.dale && dale && (post.kind === 'gig' || post.exclusive || rng.chance(0.55))) special.push({ who: 'dale', name: dale.name, text: pickLine(dale.comments, rng, used) });
    if (sf.trucker && trk && rng.chance(0.3)) special.push({ who: 'trucker', name: trk.name, text: pickLine(trk.comments, rng, used) });
    var jp = F.superfanDef('japan');
    if (sf.japan && jp && jp.comments && jp.comments.length && rng.chance(0.35)) special.push({ who: 'japan', name: jp.name, text: pickLine(jp.comments, rng, used) });   // v0.7
    if (!post.exclusive && rng.chance(Math.min(0.9, t.hater * 4 + (post.viral === 'cringe' ? 0.5 : 0) + (sent === 'bad' ? 0.2 : 0)))) {
      special.push({ who: 'hater', name: handle(H.hater), text: pickLine(CM.hater, rng, used) });
    }
    var n = Math.min(4, Math.max(rng.int(2, 4), special.length));
    out = special.slice(0, n);
    var mix = POOL_MIX[sent];
    while (out.length < n) {
      var x = rng.next(), pool = x < mix[0] ? 'good' : x < mix[0] + mix[1] ? 'mixed' : 'bad';
      out.push({ who: 'fan', name: handle(H.fan), text: pickLine(CM[pool], rng, used) });
    }
    out = rng.shuffle(out);
    var rc = GG.rival && GG.rival.cast ? GG.rival.cast(s) : null;   // v0.9: the rival's own comments (cast.comments), else the neutral pool
    var rpool = post.exclusive ? ((rc && rc.commentsExclusive && rc.commentsExclusive.length && rc.commentsExclusive) || CM.rivalExclusive)
      : ((rc && rc.comments && rc.comments.length && rc.comments) || CM.rival);
    out.push({ who: 'rival', name: rivalName(s), text: pickLine(rpool, rng, used) });   // on EVERY post
    return out.map(function (c) { return { who: c.who, name: c.name, text: fill(s, c.text, { who: post.who }) }; });
  }

  /* ---- Posts ------------------------------------------------------------------------------------------------ */
  function pickKind(s, rng) {
    var w = { rehearsal: 1, gig: 0, teaser: 0, meme: 0.8, bts: 0.9 }, song = newestSong(s);
    if (s.gig) w.gig = 3;
    if (song) w.teaser = (s.totalWeek - (song.written || 0) <= 3 ? 2.5 : 0.8);
    if (s.plan && s.plan.indexOf('rehearse') >= 0) w.rehearsal += 1.5;
    if (GG.labels && GG.labels.inSession && GG.labels.inSession(s)) { w.bts += 2; w.teaser += 1; }
    if ((s.stats && s.stats.gigs) > 0) w.bts += 0.4;
    if ((s.burnout || 0) > 70) w.meme += 1;   // exhausted bands post weird things
    return rng.weighted(KINDS, function (k) { return w[k]; }) || 'meme';
  }
  function pickText(s, kind, rng) {
    var pool = bpool(s, ['posts', kind], []), recent = {};   // v0.9: + byBand
    s.bandbook.posts.slice(-6).forEach(function (p) { if (p.kind === kind) recent[p.t] = 1; });
    var idx = rng.int(0, Math.max(0, pool.length - 1));
    for (var i = 0; i < 4 && recent[idx]; i++) idx = rng.int(0, Math.max(0, pool.length - 1));
    return { t: idx, text: pool[idx] || 'New post from {band}.' };
  }
  function store(s, post) {
    var b = s.bandbook, max = F.cfg().post.max;
    b.posts.push(post);
    if (b.posts.length > max) b.posts.splice(0, b.posts.length - max);
  }
  function bumpStreams(s, x, f) {
    if (!GG.labels || !GG.labels.released) return 0;
    var rel = GG.labels.released(s).filter(function (a) { return a.streamRate > 0; }), a = rel[rel.length - 1];
    if (!a) return 0;
    var add = Math.round(a.streamRate * x * (f || 1));
    a.streamRate += add;
    return add;
  }
  function queueScandal(s, rng, source) {
    var b = s.bandbook, list = (K().scandals || []).filter(function (x) {
      var c = F.card(x.card), seen = s.seenCards && s.seenCards[x.card];
      return c && isActive(s, x.who) && (!GG.career || GG.career.gatePasses(s, c.gate)) && !(seen && s.totalWeek - seen < 30)
        && (!GG.career.cardOk || GG.career.cardOk(s, c));   // v0.9 speaker / card guard
    });
    if (!list.length) return null;
    var x = rng.pick(list);
    b.pending = { card: x.card, who: x.who, week: s.totalWeek, source: source };
    GG.emit('fans:scandal', { card: x.card, who: x.who });
    return b.pending;
  }
  function scandalReady(s) {
    var b = s.bandbook, S = F.cfg().scandal;
    return !b.pending && s.totalWeek >= S.fromWeek && s.totalWeek - (b.lastScandal == null ? -99 : b.lastScandal) >= S.cooldown;
  }

  // One Promote block = one public post. opts: { f (repeat factor), d (block deltas), lines (block lines), kind? }.
  F.post = function (s, opts) {
    opts = opts || {};
    F.ensure(s);
    var Q = F.cfg(), P = Q.post, V = Q.viral, b = s.bandbook, f = opts.f == null ? 1 : opts.f;
    b.seq++;
    var rng = rngOf(s, 'post');
    var kind = opts.kind && KINDS.indexOf(opts.kind) >= 0 ? opts.kind : pickKind(s, rng);
    if (kind === 'gig' && !s.gig) kind = 'meme';
    var crew = active(s), who = crew.length ? rng.pick(crew).id : 'player';
    var pt = pickText(s, kind, rng), mult = P.kinds[kind] || 1;
    // viral: weirder moments (memes, behind the scenes, a burnt-out band) are likelier to blow up
    var vp = V.base + ((V.weird || {})[kind] || 0) + ((s.burnout || 0) > 70 ? V.burnout : 0) + (s.buzz || 0) * V.buzzPer;
    var viral = rng.chance(Math.min(V.max, vp)) ? (rng.chance(Math.min(Math.max(0.6, V.cringe), V.cringe + F.shares(s).hater)) ? 'cringe' : 'good') : null;
    var cringeWho = null, text = pt.text;
    if (viral === 'cringe') {
      var cwho = function (c) { return GG.career && GG.career.isAlias && GG.career.isAlias(c.who) ? GG.career.roleOf(s, c.who) : c.who; };   // v0.9: '@front' etc.
      var tk = talkers(s);
      var vg = GG.career && GG.career.pool ? GG.career.pool(s, K(), 'viral') : K().viral;   // + byBand
      var cr = ((vg && vg.cringe) || []).filter(function (c) { var w = cwho(c); return c.who === 'any' ? tk.length > 0 : !!w && isActive(s, w) && !silent(s, w); });
      if (!cr.length) viral = 'good';
      else {
        var c = rng.pick(cr);
        cringeWho = c.who === 'any' ? rng.pick(tk).id : cwho(c);
        text = c.text; who = cringeWho;
      }
    }
    if (viral === 'good') { var vgood = (GG.career && GG.career.pool ? GG.career.pool(s, K(), 'viral.good') : K().viral.good) || [];
      text = rng.pick(vgood) || text; if (silent(s, who)) who = speakerFor(s, ['dana', 'marcel', 'jaxon'], ['@soloist', '@front', '@filler']) || 'player'; }
    var likes = Math.round(((s.fans || 0) * P.likes + 6) * mult * rng.range(0.7, 1.3));
    var shares = Math.round(likes * rng.range(0.05, 0.15)), plays = Math.round(likes * rng.range(4, 8));
    if (viral) { var boost = rng.range(25, 60); likes = Math.round(likes * boost); shares = Math.round(shares * boost * 1.5); plays = Math.round(plays * boost); }
    // effects, on top of the old Promote numbers (which the career RNG still rolls exactly as before)
    var head = headroom(s), fx = { buzz: 0, fans: 0 };
    fx.buzz += rr(P.buzz * f, rng);
    fx.fans += rr((P.fans + (s.fans || 0) * P.fansPer) * mult * f * head, rng);
    if (viral === 'good') { fx.buzz += V.buzz; fx.fans += rr((V.fans + (s.fans || 0) * V.fansPer) * head, rng); }
    if (viral === 'cringe') { fx.buzz += V.cringeBuzz; fx.fans += rr((V.fans + (s.fans || 0) * V.fansPer) * head * V.cringeFans, rng); fx.mood = {}; fx.mood[cringeWho] = V.mood; }
    var d = opts.d || {};
    var applied = { buzz: fx.buzz || null, fans: fx.fans || null, mood: fx.mood || null };
    if (GG.career && GG.career.applyEffects) GG.career.applyEffects(s, applied, d);
    if (viral === 'cringe') shiftShare(s, 'hater', V.hater);
    if (viral === 'good') shiftShare(s, 'super', V.super);
    var streams = bumpStreams(s, viral ? V.streams : P.streams, f);
    b.streams += plays;
    if (viral) b.viral++;
    var post = { id: 'p' + b.seq, w: s.totalWeek, kind: kind, t: pt.t, who: who, text: fill(s, text, { who: who, views: plays }),
      likes: likes, shares: shares, plays: plays, viral: viral, exclusive: false, streams: streams, fx: { buzz: fx.buzz, fans: fx.fans }, comments: null };
    post.comments = comments(s, post, rng);
    store(s, post);
    d.post = post.id;
    var lines = opts.lines, info = F.kindInfo(kind);
    if (lines) {
      lines.push('📘 Posted to Bandbook: ' + info.label.toLowerCase() + '. 👍 ' + U.fmtNum(likes) + ' · 💬 ' + post.comments.length + '.');
      if (viral) lines.push((viral === 'good' ? '🚀 ' : '😬 ') + post.text);
    }
    if (viral) {
      var speaker = viral === 'cringe' ? cringeWho : speakerFor(s, ['marcel', 'dana', 'jaxon'], ['@front', '@soloist', '@filler']);
      if (speaker) chat(s, speaker, rng.pick(bpool(s, ['chat', viral === 'cringe' ? 'cringe' : 'viral'], [])), d);
      GG.emit('fans:viral', { post: post, kind: viral });
    }
    // bandmates post dumb things: a scandal card next Monday
    var S = Q.scandal;
    if (scandalReady(s) && rng.chance(S.post + ((s.burnout || 0) > 75 ? S.burnout : 0) + F.shares(s).hater * 0.1)) {
      var q = queueScandal(s, rng, post.id);
      if (q && lines) lines.push('Uh-oh. ' + nameOf(s, q.who === 'band' ? 'band' : q.who) + ' also posted something. You\'ll hear about it Monday.');
    }
    GG.emit('fans:post', { post: post });
    return post;
  };

  F.feed = function (s, n) { F.ensure(s); var p = s.bandbook.posts.slice().reverse(); return n ? p.slice(0, n) : p; };

  /* ---- Patreeon (the fan club) ---------------------------------------------------------------------------------- */
  F.clubUnlocked = function (s) { return s.era === 'signed' || s.era === 'world'; };
  F.openClub = function (s) {
    F.ensure(s);
    if (s.fanClub || !F.clubUnlocked(s)) return s.fanClub;
    var Q = F.cfg().club, sup = F.counts(s).super;
    s.fanClub = { since: s.totalWeek, members: Math.max(2, Math.round(sup * Q.join * 0.5)), happiness: Q.happyStart, tier: 'drumstick',
      exclusives: 0, lastExclusive: null, earned: 0, lastPayout: 0, paid: null };
    s.fanClub.tier = topTier(s.fanClub.members);
    GG.emit('fans:club', { action: 'open', club: s.fanClub });
    return s.fanClub;
  };
  function topTier(members) {
    var top = 'drumstick';
    (K().tiers || []).forEach(function (t) { if (members >= (t.minMembers || 0)) top = t.id; });
    return top;
  }
  // Tier rows with this month's members per tier (unlocked tiers share members by tierShare; Dale is always Full Kit).
  F.tiers = function (s) {
    var c = s.fanClub, Q = F.cfg().club, list = K().tiers || [], m = c ? c.members : 0;
    var open = list.filter(function (t) { return m >= (t.minMembers || 0); }), tot = 0;
    open.forEach(function (t) { tot += Q.tierShare[t.id] || 0; });
    var out = list.map(function (t) {
      var on = open.indexOf(t) >= 0, n = on && tot ? Math.floor(m * (Q.tierShare[t.id] || 0) / tot) : 0;
      return { id: t.id, name: t.name, icon: t.icon, price: t.price, perk: t.perk, minMembers: t.minMembers || 0, unlocked: on, members: n };
    });
    if (c && out.length) {
      var used = out.reduce(function (a, t) { return a + t.members; }, 0), first = out[0];
      first.members += Math.max(0, m - used);
      var fk = out[out.length - 1];
      if (s.superfans && s.superfans.dale && fk.members < 1 && m >= 1) { fk.members = 1; first.members = Math.max(0, first.members - 1); fk.dale = true; }
    }
    return out;
  };
  function monthlyGross(s) { return F.tiers(s).reduce(function (a, t) { return a + t.members * t.price; }, 0); }
  F.club = function (s) {
    F.ensure(s);
    var c = s.fanClub, Q = F.cfg().club, gross = c ? monthlyGross(s) : 0;
    return { unlocked: F.clubUnlocked(s), open: !!c, name: (K().club || {}).name || 'Patreeon', pitch: (K().club || {}).pitch || '',
      locked: (K().club || {}).locked || '', members: c ? c.members : 0, happiness: c ? c.happiness : 0, tier: c ? c.tier : null,
      tiers: F.tiers(s), since: c ? c.since : null, earned: c ? c.earned : 0, lastPayout: c ? c.lastPayout : 0,
      nextPayout: Math.round(gross * (1 - Q.cut)), gross: gross, cut: Q.cut, exclusives: c ? c.exclusives : 0,
      canExclusive: F.canExclusive(s), payoutWeek: s.week % 2 === 0 ? s.totalWeek : s.totalWeek + 1 };
  };
  F.canExclusive = function (s) { return !!(s && s.fanClub && !s.ended && s.fanClub.lastExclusive !== s.totalWeek); };
  // An exclusive post for the fan club (once a week, an evening's work: a little burnout). Keeps members happy.
  F.exclusive = function (s, opts) {
    opts = opts || {};
    if (!F.canExclusive(s)) return null;
    var Q = F.cfg(), c = s.fanClub, b = s.bandbook;
    b.seq++;
    var rng = rngOf(s, 'exclusive'), crew = active(s), who = crew.length ? rng.pick(crew).id : 'player';
    var pt = pickText(s, 'exclusive', rng);
    var likes = Math.max(1, Math.round(c.members * rng.range(0.5, 0.9)));
    var post = { id: 'p' + b.seq, w: s.totalWeek, kind: 'exclusive', t: pt.t, who: who, text: fill(s, pt.text, { who: who }),
      likes: likes, shares: 0, plays: Math.round(likes * rng.range(2, 4)), viral: null, exclusive: true, streams: 0, fx: { buzz: 0, fans: 0 }, comments: null };
    post.comments = comments(s, post, rng);
    store(s, post);
    c.happiness = U.clamp(c.happiness + (c.lastExclusive === s.totalWeek ? Q.club.exclusiveAgain : Q.club.exclusive), 0, 100);
    c.lastExclusive = s.totalWeek; c.exclusives++;
    shiftShare(s, 'super', 0.002);
    var d = opts.d || {};
    if (GG.career && GG.career.applyEffects && Q.club.exclusiveBurnout) GG.career.applyEffects(s, { burnout: Q.club.exclusiveBurnout }, d);
    if (opts.lines) opts.lines.push('🔒 Patreeon exclusive posted. Members: ' + c.members + '. Happiness ' + Math.round(c.happiness) + '%.');
    GG.emit('fans:club', { action: 'exclusive', club: c, post: post });
    return post;
  };
  function clubWeek(s, rng, out) {
    var c = s.fanClub, Q = F.cfg().club;
    if (c.lastExclusive !== s.totalWeek) c.happiness = U.clamp(c.happiness - Q.decay, 0, 100);
    if (s.week % 2 !== 0) return;   // month end = the second week of each month
    var sup = F.counts(s).super, target = Math.min(Q.maxMembers, sup * Q.join * (0.4 + 0.6 * c.happiness / 100));
    c.members = Math.max(1, Math.round(c.members + (target - c.members) * Q.move));
    if (c.happiness < Q.churnBelow) c.members = Math.max(1, Math.round(c.members * (1 - Q.churn)));   // Dale never cancels
    c.tier = topTier(c.members);
    var net = Math.round(monthlyGross(s) * (1 - Q.cut));
    if (net > 0 && GG.career) {
      GG.career.applyEffects(s, { fund: net }, {});
      if (s.stats) { s.stats.earned = (s.stats.earned || 0) + net; s.stats.patreeon = (s.stats.patreeon || 0) + net; }
    }
    if (s.van && isFinite(s.van.condition) && Q.van) s.van.condition = Math.min(100, s.van.condition + Q.van);   // "your favourite band's van repairs"
    c.earned += net; c.lastPayout = net; c.paid = s.totalWeek;
    var who = speakerFor(s, ['jaxon', 'dana', 'marcel'], ['@filler', '@soloist', '@front']);
    if (who && net > 0) chat(s, who, fill(s, rng.pick((K().club || {}).payoutChat || []), { money: net, n: c.members }));
    out.club = { paid: net, members: c.members, happiness: c.happiness, tier: c.tier };
    GG.emit('fans:club', { action: 'payout', club: c, paid: net });
  }

  /* ---- Gifts and fan mail -------------------------------------------------------------------------------------- */
  F.gifts = function (s) { F.ensure(s); return s.gifts.slice().reverse(); };
  F.hasGift = function (s, id) { return (s.gifts || []).some(function (g) { return g.id === id; }); };
  // Adds a gift (scripted: content scriptedGifts; else from the gifts/mail pools). Returns the entry or null.
  F.addGift = function (s, id, kind) {
    F.ensure(s);
    var G = K(), def = (G.scriptedGifts || {})[id], isMail = false;
    if (!def) def = bpool(s, ['gifts'], []).filter(function (g) { return g.id === id; })[0] || (G.gifts || []).filter(function (g) { return g.id === id; })[0];
    if (!def) { def = bpool(s, ['mail'], []).filter(function (g) { return g.id === id; })[0] || (G.mail || []).filter(function (g) { return g.id === id; })[0]; isMail = !!def; }
    if (!def || (!isMail && F.hasGift(s, id))) return null;
    var g = { id: id, week: s.totalWeek, from: def.from, text: fill(s, def.text), kind: kind || (isMail ? 'mail' : 'gift') };
    s.gifts.push(g);
    var max = F.cfg().giftsMax;
    while (s.gifts.length > max) {
      var i = -1;
      for (var j = 0; j < s.gifts.length; j++) if (s.gifts[j].kind === 'mail') { i = j; break; }
      s.gifts.splice(i < 0 ? 0 : i, 1);
    }
    GG.emit('fans:gift', { gift: g });
    return g;
  };
  function mailWeek(s, rng, out) {
    var Q = F.cfg(), sup = F.counts(s).super;
    if (!((s.stats && s.stats.gigs >= 1) || (s.fans || 0) >= 20)) return;
    if (rng.chance(Math.min(Q.mail.max, Q.mail.chance + sup * Q.mail.perSuper))) {
      var recent = {}; s.gifts.slice(-4).forEach(function (g) { recent[g.id] = 1; });
      var pool = bpool(s, ['mail'], []).filter(function (m) { return !recent[m.id]; }), m = rng.pick(pool);   // v0.9: band gates + byBand
      if (m) { var e = F.addGift(s, m.id, 'mail'); if (e) out.mail.push(e); }
    }
    if (rng.chance(Math.min(Q.gift.max, Q.gift.chance + sup * Q.gift.perSuper))) {
      var left = bpool(s, ['gifts'], []).filter(function (g) { return !F.hasGift(s, g.id); }), gi = rng.pick(left);
      if (gi) {
        var e2 = F.addGift(s, gi.id, 'gift');
        if (e2) { out.gifts.push(e2); chat(s, 'mom', 'A parcel came for the band, from ' + e2.from + '. I didn\'t open it. I shook it a little.'); }
      }
    }
  }

  /* ---- The week ------------------------------------------------------------------------------------------------ */
  function driftShares(s) {
    var S = F.cfg().shares, t = F.shares(s), c = s.fanClub;
    var superT = U.clamp(S.superBase + S.superChem * (s.chemistry == null ? 50 : s.chemistry) / 100 + (c ? S.superClub * c.happiness / 100 : 0), S.superRange[0], S.superRange[1]);
    var fame = Math.max(0, Math.log(Math.max(1, s.fans || 0) / 100) / Math.LN10);
    var recent = s.bandbook.lastScandal != null && s.totalWeek - s.bandbook.lastScandal < 8 ? 0.02 : 0;
    var haterT = U.clamp(S.haterBase + S.haterFame * fame + recent, S.haterRange[0], S.haterRange[1]);
    setShare(s, 'super', t.super + (superT - t.super) * S.drift);
    setShare(s, 'hater', t.hater + (haterT - t.hater) * S.drift);
  }
  // career.endWeek: shares drift, superfans settle, mail + gifts, the fan club (decay, month-end payout), bandmates'
  // own dumb posts. Sets wrap.fans = { shares, counts, mail, gifts, club, scandal }.
  F.weekly = function (s, wrap) {
    F.ensure(s);
    var Q = F.cfg(), rng = rngOf(s, 'weekly'), out = { shares: null, counts: null, mail: [], gifts: [], club: null, scandal: null };
    driftShares(s);
    Object.keys(s.superfans).forEach(function (id) {
      var sf = s.superfans[id], home = Q.superfans.moodHome;
      if (isFinite(sf.mood)) sf.mood = sf.mood > home ? Math.max(home, sf.mood - Q.superfans.drift) : Math.min(home, sf.mood + Q.superfans.drift);
    });
    mailWeek(s, rng, out);
    if (s.fanClub) clubWeek(s, rng, out);
    if (scandalReady(s) && rng.chance(Q.scandal.weekly + ((s.burnout || 0) > 75 ? Q.scandal.burnout : 0))) out.scandal = queueScandal(s, rng, 'weekly');
    out.shares = U.clone(s.fanTypes); out.counts = F.counts(s);
    if (wrap) wrap.fans = out;
    return out;
  };

  /* ---- Gigs: superfans follow on tour, Dale at every show (crowd + buzz; v0.8: they also buy merch, F.merchMods) ---- */
  F.gigShape = function (s, g, r) {
    if (!r || r.fansShaped) return r;
    F.ensure(s);
    r.fansShaped = true;
    var Q = F.cfg(), GK = Q.gig, L = K().gigLines || {}, rng = rngOf(s, 'gig'), cnt = F.counts(s);
    var lines = r.lines || (r.lines = []), cap = r.capacity || (g && g.capacity) || 1e6;
    var km = r.km != null ? r.km : (g && g.km) || 0, gcity = r.city || (g && g.city) || s.city, add = 0;
    function room() { return Math.max(0, cap - (r.crowd || 0) - add); }
    var abroad = !!(g && g.tour);   // v0.7: superfans don't fly; Dale watches the livestream; the president is at every Japan show
    if (abroad && g.region === 'japan' && s.superfans.japan) {
      var jpf = s.superfans.japan; jpf.seen = (jpf.seen || 0) + 1; jpf.mood = U.clamp((jpf.mood || 0) + (GK.dale[r.grade] || 0), 0, 100);
      if (room() > 0) add++;
      r.president = jpf.seen;
      if ((L.president || []).length) lines.push(fill(s, rng.pick(L.president), { gcity: gcity }));
    }
    if (!abroad && km >= GK.followKm && cnt.super > 0) {
      var follow = Math.min(room(), Math.round(Math.min(cnt.super * GK.followShare, cap * GK.followCap)));
      if (follow > 0) {
        add += follow; r.superfans = follow;
        if (follow >= 2) lines.push(fill(s, rng.pick(L.follow || []), { n: follow, gcity: gcity }));
      }
    }
    var dale = abroad ? null : s.superfans.dale;
    if (dale) {
      dale.seen = (dale.seen || 0) + 1;
      dale.mood = U.clamp((dale.mood || 0) + (GK.dale[r.grade] || 0), 0, 100);
      if (room() > 0) add++;
      r.dale = dale.seen;
      var hs = K().homeSuperfan && K().homeSuperfan[s.bandId];   // v0.9: the band's own home superfan's lines
      var near = hs && hs.gigLines && hs.gigLines.length ? hs.gigLines : L.dale, far = hs ? (hs.gigLinesFar && hs.gigLinesFar.length ? hs.gigLinesFar : near) : L.daleFar;
      lines.push(fill(s, rng.pick((km >= 500 && far) || near || []), { n: dale.seen, gcity: gcity }));
    }
    var tr = s.superfans.trucker;
    if (tr && !abroad && km >= GK.followKm && rng.chance(GK.trucker)) {
      tr.seen = (tr.seen || 0) + 1; if (room() > 0) add++;
      r.trucker = true; lines.push(fill(s, rng.pick(L.trucker || []), { gcity: gcity }));
    }
    if (cnt.hater > 0 && rng.chance(Math.min(0.5, F.shares(s).hater * 2))) { r.heckler = true; lines.push(fill(s, rng.pick(L.hater || []))); }
    if (add) {
      r.crowd = (r.crowd || 0) + add;
      if (g && g.deal === 'door' && GG.gig && GG.gig.payFor) r.pay = GG.gig.payFor(g, r.crowd);
    }
    if ((r.superfans || 0) >= GK.buzzAt) r.buzz = (r.buzz || 0) + 1;
    return r;
  };

  // v0.8: superfans buy merch. The superfan share lifts every item's sales (GG.shop.gigMerch); the named ones at this gig
  // (r.dale / r.trucker / r.president set by gigShape) each buy one of the best thing on the table.
  F.merchMods = function (s, r) {
    var named = [];
    if (r && r.dale) named.push('dale');
    if (r && r.trucker) named.push('trucker');
    if (r && r.president) named.push('president');
    return { share: s && s.fanTypes ? F.shares(s).super : F.cfg().shares.start.super, named: named };
  };

  /* ---- Fan cards (forced only; never drawn) ------------------------------------------------------------------- */
  var fanCardsCache = { a: null, x: null, all: [] };
  // v0.8.1 (LICRECAP): the licensing sellout scandals (GG.licensing.fanCards) come up like any Bandbook scandal.
  F.cards = function () {
    var a = K().cards || [], x = GG.licensing && GG.licensing.fanCards ? GG.licensing.fanCards() : null;
    if (!x || !x.length) return a;
    if (fanCardsCache.a !== a || fanCardsCache.x !== x) fanCardsCache = { a: a, x: x, all: a.concat(x) };
    return fanCardsCache.all;
  };
  F.card = function (id) { return F.cards().filter(function (c) { return c.id === id; })[0] || null; };
  function gateOk(s, c) { return !!c && (!GG.career || GG.career.gatePasses(s, c.gate)); }
  function seenAt(s, id) { return s.seenCards && s.seenCards[id] != null ? s.seenCards[id] : null; }
  // v0.9: '<base>_<bandId>' first (content packs), else the base card; gate + speaker must fit the band.
  function speakOk(s, c) { return !c || !GG.career || !GG.career.cardOk || GG.career.cardOk(s, c); }
  function variantCard(s, base) {
    var v = F.card(base + '_' + s.bandId);
    if (v && gateOk(s, v) && speakOk(s, v)) return v;
    var c0 = F.card(base);
    return c0 && gateOk(s, c0) && speakOk(s, c0) ? c0 : null;
  }
  function superfanCard(s) {
    var Q = F.cfg(), sf = s.superfans, b = s.bandbook, w = s.totalWeek, c;
    function once(id) { c = variantCard(s, id); return !!c && seenAt(s, c.id) == null; }
    if (sf.dale && sf.dale.seen >= 2 && once('fans_dale_hello')) return c;   // the second show: same face, same spot
    if (!sf.trucker && (s.stats && s.stats.gigs) >= Q.superfans.truckerAfterGigs && s.lastGig && (s.lastGig.km || 0) >= Q.superfans.truckerKm && once('fans_trucker')) return c;
    var hs = F.homeSuperfan(s), gift = (hs && hs.gift && (hs.gift.id || hs.gift)) || 'macaroni_kenji';   // v0.9: the home superfan's gift
    if (sf.dale && sf.dale.seen >= Q.superfans.daleGiftAfter && !F.hasGift(s, gift) && once('fans_macaroni') && (c.id !== 'fans_macaroni' || isActive(s, 'kenji'))) return c;
    c = variantCard(s, 'fans_patreeon');
    if (!s.fanClub && F.clubUnlocked(s) && c && (b.clubDeclined == null || w - b.clubDeclined >= Q.club.redecline)) return c;
    c = variantCard(s, 'fans_club_grumble');
    var gs = c ? seenAt(s, c.id) : null;
    if (s.fanClub && s.fanClub.happiness < Q.club.grumbleBelow && c && (gs == null || w - gs >= Q.club.grumbleGap)) return c;
    if (F.shares(s).hater >= 0.12 && once('fans_hater_page')) return c;
    return null;
  }
  // career.startWeek (after drama, studio and holiday cards): a pending scandal first, then superfan / fan-club cards.
  F.forcedCard = function (s) {
    F.ensure(s);
    var b = s.bandbook, w = s.totalWeek;
    if (w < F.cfg().cardFrom || s.ended) return null;
    if (w - (b.lastCard == null ? -99 : b.lastCard) < F.cfg().cardGap) return null;
    var pick = null, P = b.pending;
    if (P) {
      var c = F.card(P.card);
      if (c && gateOk(s, c) && isActive(s, P.who) && speakOk(s, c)) pick = c;
      b.pending = null;
    }
    if (!pick) pick = superfanCard(s);
    if (!pick) return null;
    b.lastCard = w;
    return { card: pick };
  };
  F.isScandal = function (id) { return (K().scandals || []).some(function (x) { return x.card === id; }) || !!(GG.licensing && GG.licensing.isScandal && GG.licensing.isScandal(id)); };
  // v0.8.1 (LICRECAP): queue a specific scandal card for next Monday (a licensing deal: "sold the moose"). Only when nothing
  // else is pending; the usual card gap still applies. Returns the pending entry or null.
  F.queue = function (s, cardId, who, source) {
    F.ensure(s);
    var b = s.bandbook;
    if (b.pending || !F.card(cardId)) return null;
    b.pending = { card: cardId, who: who || 'band', week: s.totalWeek, source: source || 'queue' };
    GG.emit('fans:scandal', { card: cardId, who: b.pending.who });
    return b.pending;
  };
  // career.resolveCard (after the choice's normal effects): applies the choice's 'fan' effects (and the roll branch's),
  // then the bookkeeping (scandal count, a declined Patreeon). 'fan' is not in C.EFFECT_KEYS: only fan cards use it.
  F.afterCard = function (s, card, i, success, d) {
    if (!card || !F.card(card.id)) return;
    F.ensure(s);
    var b = s.bandbook, ch = card.choices && card.choices[i];
    if (ch) {
      if (ch.effects && ch.effects.fan) F.apply(s, ch.effects.fan, d);
      var br = ch.roll && (success ? ch.roll.success : ch.roll.fail);
      if (br && br.effects && br.effects.fan) F.apply(s, br.effects.fan, d);
    }
    if (F.isScandal(card.id)) { b.scandals++; b.lastScandal = s.totalWeek; }
    if (/^fans_patreeon(_|$)/.test(card.id) && !s.fanClub) b.clubDeclined = s.totalWeek;
  };

  /* ---- The 'fan' effect key ---------------------------------------------------------------------------------- */
  // v: { hater|super: ±share, superfan: { id: ±mood }, gift: id, club: 'open', clubHappy: ±n }
  F.apply = function (s, v, d) {
    if (!v || typeof v !== 'object') return;
    F.ensure(s);
    var out = {};
    if (v.hater) { shiftShare(s, 'hater', v.hater); out.hater = v.hater; }
    if (v.super) { shiftShare(s, 'super', v.super); out.super = v.super; }
    if (v.superfan) Object.keys(v.superfan).forEach(function (id) {
      var def = F.superfanDef(id, s); if (!def || def.reserved || (def.region && !s.superfans[id])) return;
      var sf = s.superfans[id] || (s.superfans[id] = { seen: 0, mood: F.cfg().superfans.moodStart, since: s.totalWeek });
      sf.mood = U.clamp((sf.mood || 0) + (v.superfan[id] || 0), 0, 100);
      if (id === 'trucker' && !F.hasGift(s, 'cb_radio')) F.addGift(s, 'cb_radio');
      (out.superfan = out.superfan || {})[id] = v.superfan[id];
    });
    if (v.gift && F.addGift(s, v.gift)) out.gift = v.gift;
    if (v.club === 'open' && !s.fanClub && F.openClub(s)) out.club = 'open';
    if (v.clubHappy && s.fanClub) { s.fanClub.happiness = U.clamp(s.fanClub.happiness + v.clubHappy, 0, 100); out.clubHappy = v.clubHappy; }
    if (d) { var prevFan = d.fan || {}; for (var k in out) prevFan[k] = out[k]; d.fan = prevFan; }
  };
  function arrow(x) { return x > 0 ? '↑' : '↓'; }
  F.effectText = function (v) {
    if (!v) return '';
    var p = [];
    if (v.hater) p.push('Haters ' + arrow(v.hater));
    if (v.super) p.push('Superfans ' + arrow(v.super));
    if (v.superfan) Object.keys(v.superfan).forEach(function (id) { var d = F.superfanDef(id, GG.state); if (d && v.superfan[id]) p.push(d.short + ' ' + arrow(v.superfan[id])); });
    if (v.gift) p.push('A gift');
    if (v.club === 'open') p.push('Patreeon opens');
    if (v.clubHappy) p.push('Members ' + arrow(v.clubHappy));
    return p.join(' · ');
  };

  /* ---- Views for the Bandbook app ---------------------------------------------------------------------------- */
  F.superfanList = function (s) {
    F.ensure(s);
    return K().superfans.map(function (d) {
      if (d.id === 'dale') d = F.homeSuperfan(s) || d;   // v0.9: the band's own home superfan
      var st = s.superfans[d.id];
      var R = d.region && !st && GG.tour ? GG.tour.region(d.region) : null;   // v0.7: region superfans wait until you get there
      return { id: d.id, name: d.name, short: d.short, icon: d.icon, blurb: d.blurb, reserved: d.reserved || (R ? R.name : null),
        active: !!st && !d.reserved, seen: st ? st.seen || 0 : 0, mood: st ? st.mood : null, since: st ? st.since : null };
    });
  };

  /* ---- Bots ---------------------------------------------------------------------------------------------------- */
  F.botValue = function (s, v) {
    if (!v) return 0;
    var x = 0;
    if (v.club === 'open') x += 12;
    if (v.clubHappy) x += v.clubHappy * 0.2;
    if (v.hater) x -= v.hater * 100;
    if (v.super) x += v.super * 200;
    if (v.superfan) Object.keys(v.superfan).forEach(function (id) { x += (v.superfan[id] || 0) * 0.05; });
    if (v.gift) x += 1;
    return x;
  };
  F.botWeek = function (s, style) {
    F.ensure(s);
    if (!F.canExclusive(s)) return null;
    var c = s.fanClub, B = F.cfg().bot;
    var go = style === 'good' ? c.happiness < B.goodHappyBelow && (s.burnout || 0) < B.goodBurnoutBelow : rngOf(s, 'bot').chance(B.avgExclusive);
    return go ? F.exclusive(s) : null;
  };

  /* ---- Saves (idempotent): fill every fan field that is missing. Chained onto GG.save.migrate. ------------------ */
  F.migrate = function (s) {
    if (!s || typeof s !== 'object' || !isFinite(s.totalWeek)) return s;
    return F.ensure(s);
  };
  if (GG.save && GG.save.migrate && !GG.save.migrate.fans) {
    var prev = GG.save.migrate;
    GG.save.migrate = function (s) { return F.migrate(prev(s)); };
    GG.save.migrate.fans = true;
  }
  GG.registerDebug('fans', function () {
    var s = GG.state; if (!s) return { state: null };
    F.ensure(s);
    var b = s.bandbook;
    return { shares: s.fanTypes, counts: F.counts(s), posts: b.posts.length, viral: b.viral, scandals: b.scandals, pending: b.pending,
      last: b.posts.length ? b.posts[b.posts.length - 1] : null, superfans: s.superfans, club: s.fanClub, gifts: s.gifts.length };
  });
})(window.GG);
