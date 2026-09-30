// 2c_sim_licensing.js (v0.8.1 "Addendum 2", LICRECAP; handoff D1): your songs get licensed for money once you're worth
// licensing. Pure sim: no DOM, no audio. Every roll uses its own RNG seeded by career seed + a salt + the week (+ offer id),
// so licensing never shifts the career RNG. Content: content/licensing.js (brands, numbers, lines); the offer card
// buttons, the fury card and the sellout scandals: content/cards.js (licenseChoices, licenseCards, licenseScandals).
//  - Offers roll at the week wrap from the Signed era on, or earlier once a record charted on the Maple 100 or a post went
//    viral on Bandbook (and you have tune.minFans). Rare: a small weekly chance growing with fame, a gap between offers and
//    a career cap (3, more with fame): 2–4 a career. Brands are genre-weighted (a used brand weighs less). The fee sits in
//    the brand's range by fame (+-10%), rounded to $100. An offer lands as a Monday card and waits on the laptop
//    ("Offers") until answered or it expires (tune.expires weeks).
//  - Take: the fee to the fund (an active label deal takes its cut, (1 - royalty) / 2 clamped 15–40%, counted toward the
//    recoup), buzz, a few fans, streams for the song's record, SONG.ad = { brandId, week } (stale bump + a stale floor for a
//    while), haters up by sellout weight and maybe a Bandbook scandal card; Buckle & Boot fury when a truck ad goes to the
//    Grid Road Ramblers (rival heat + a card; content ready for v0.9); milestones.soldOut (D4 "Sold Out").
//    Decline: a small superfan loyalty bump (share + Dale). Counter: +40% or the brand walks (30%, down to 15% with fans
//    or a label behind you); a counter that lands is taken at the higher fee.
// API (GG.licensing):
//   cfg() · content() · brands() · brand(id) · init(s) · ensure(s) · migrate(s) · fame(s) 0..1 · eligible(s) · chance(s)
//   cap(s) · open(s) -> [LICENSE_OFFER] · offer(s, id) · current(s) · quote(s, offer, counter?) -> { fee, cut, net, label }
//   walkChance(s) · makeOffer(s, rng) · answer(s, id, 'take'|'decline'|'counter', d?) -> RESULT · weekly(s, rng, wrap)
//   forcedCard(s) -> { card, who }|null · afterCard(s, card, i, success, d) -> { outcome, success }|null · cards() · card(id)
//   fanCards() · isScandal(id) · isOffer(card) · fillText(s, text) · income(s, fromWeek?, toWeek?) · botChoice(s, card, style)
//   botWeek(s, style)
//   RESULT = { ok, why?, id, brandId, choice, status, fee, cut, net, countered, success, outcome, deltas }
// State: licensing = { offers: [LICENSE_OFFER], deals: [{ brandId, songId, fee, cut, week, countered }], declined, lastOfferWeek,
//   made (offers so far), cur (offer id the card/laptop is showing), fury (pending fury card: brandId|null) };
//   LICENSE_OFFER (+ shown: the Monday card has been drawn); SONG.ad; stats.licensed ($ net); milestones.soldOut.
//   WRAP.licensing = { offer: LICENSE_OFFER|null, expired: [LICENSE_OFFER] }.
// Events: 'license:offer' { offer } · 'license:answer' { offer, result } · 'license:expired' { offer } · 'license:fury' { brandId }.
// v0.9: furyBrand(s) (rivalry.cast[rid].furyBrand / economy.rival.byRival[rid].furyBrand) ; brand.band filter ; talkers ;
//   'lic_fury_<bandId>' variant first.
(function (GG) {
  var C = GG.contracts, U = GG.util;
  var L = GG.licensing = GG.licensing || {};

  var DEF = {
    minFans: 400, base: 0.012, fame: 0.014, fameLo: 1000, fameHi: 30000, gap: 14, cap: [3, 4, 5], expires: 3,
    counter: 0.4, walk: 0.3, walkMin: 0.15, walkFansLo: 5000, walkFansHi: 30000, labelCut: [0.15, 0.4], noise: 0.1,
    adStale: 25, adFloor: 20, adWeeks: 10, streams: 0.6, streamsMin: 1500, fansMax: 400, haters: 0.04, scandal: 0.5,
    loyalty: 0.004, daleMood: 4, fury: 20, keep: 6
  };
  var cache = { src: null, val: DEF };
  L.cfg = function () {
    var t = GG.content.licensing && GG.content.licensing.tune;
    if (!t) return DEF;
    if (cache.src !== t) { var o = {}, k; for (k in DEF) o[k] = DEF[k]; for (k in t) o[k] = t[k]; cache = { src: t, val: o }; }
    return cache.val;
  };
  var EMPTY = { brands: [], lines: {} };
  L.content = function () { return GG.content.licensing || EMPTY; };
  L.brands = function () { return L.content().brands || []; };
  L.brand = function (id) { var b = L.brands(); for (var i = 0; i < b.length; i++) if (b[i].id === id) return b[i]; return null; };
  function Q() { return L.cfg(); }
  function lines() { return L.content().lines || {}; }
  function rngOf(s, salt) { return GG.RNG(GG.hashSeed((s.seed >>> 0) + '|lic|' + salt + '|' + s.totalWeek)); }
  function changed(s) { GG.emit('stats:changed', { state: s }); }
  function isObj(o) { return o && typeof o === 'object' && !Array.isArray(o); }
  function money(n) { return U.fmtMoney(n); }
  function active(s, id) { return (s.members || []).some(function (m) { return m.id === id && m.status === 'active'; }); }
  function chat(s, who, text, d) { if (GG.career && GG.career.postChat && text) GG.career.postChat(s, who, L.fillText(s, text), d || null); }
  function speakerFor(s) {   // a bandmate who talks (v0.9: career.talkers; never a silent one), else the player
    var m = GG.career && GG.career.talkers ? GG.career.talkers(s)[0] : (s.members || []).filter(function (x) { return x.status === 'active'; })[0];
    return m ? m.id : 'player';
  }
  // v0.9: the brand that makes this career's rival furious (rivalry.cast[rid].furyBrand, else economy.rival.byRival[rid].furyBrand).
  L.furyBrand = function (s) {
    var c = GG.rival && GG.rival.cast ? GG.rival.cast(s) : null, k = GG.rival && GG.rival.cfg ? GG.rival.cfg(s) : null;
    return (c && c.furyBrand) || (k && k.furyBrand) || null;
  };

  /* ---- State ------------------------------------------------------------------------------------------------ */
  L.ensure = function (s) {
    if (!s || typeof s !== 'object') return s;
    if (!isObj(s.licensing)) s.licensing = {};
    var l = s.licensing;
    if (!Array.isArray(l.offers)) l.offers = [];
    if (!Array.isArray(l.deals)) l.deals = [];
    if (!isFinite(l.declined)) l.declined = 0;
    if (!isFinite(l.lastOfferWeek)) l.lastOfferWeek = 0;
    if (!isFinite(l.made)) l.made = l.offers.length;
    if (l.cur === undefined) l.cur = null;
    if (l.fury === undefined) l.fury = null;
    return s;
  };
  L.init = function (s) { return L.ensure(s); };
  L.migrate = function (s) { if (!s || typeof s !== 'object' || !isFinite(s.totalWeek)) return s; return L.ensure(s); };

  /* ---- When offers come -------------------------------------------------------------------------------------- */
  L.fame = function (s) {
    var R = Q(), f = Math.max(1, s.fans || 0);
    return U.clamp(Math.log(f / R.fameLo) / Math.log(R.fameHi / R.fameLo), 0, 1);
  };
  function charted(s) { return (s.albums || []).some(function (a) { return a.status === 'released' && a.chart && a.chart.peak; }); }
  function viral(s) { return !!(s.bandbook && s.bandbook.viral > 0); }
  L.eligible = function (s) {
    if (!s || s.ended || (s.fans || 0) < Q().minFans) return false;
    return s.era === 'signed' || s.era === 'world' || charted(s) || viral(s);
  };
  L.cap = function (s) { var c = Q().cap, f = L.fame(s); return f >= 0.9 ? c[2] : f >= 0.6 ? c[1] : c[0]; };
  L.open = function (s) {
    L.ensure(s);
    return s.licensing.offers.filter(function (o) { return o.status === 'open' && o.expires >= s.totalWeek; });
  };
  L.offer = function (s, id) {
    L.ensure(s);
    var list = s.licensing.offers;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  };
  // The weekly chance of a new offer (0 when not eligible, one is open, the gap hasn't passed or the cap is reached).
  L.chance = function (s) {
    L.ensure(s);
    var R = Q(), l = s.licensing;
    if (!L.eligible(s) || L.open(s).length || l.made >= L.cap(s)) return 0;
    if (l.lastOfferWeek && s.totalWeek - l.lastOfferWeek < R.gap) return 0;
    return R.base + R.fame * L.fame(s);
  };
  // The song they want: charted singles first, then your best song that isn't in an ad already.
  function pickSong(s) {
    var singles = {};
    (s.albums || []).forEach(function (a) { if (a.status === 'released' && a.single && a.chart && a.chart.peak) singles[a.single] = true; });
    var best = null, bestV = -1;
    (s.songs || []).forEach(function (x) {
      if (x.ad) return;
      var v = (x.quality || 0) + (x.classic ? 10 : 0) + (singles[x.id] ? 25 : 0) + (x.hits || 0);
      if (v > bestV) { bestV = v; best = x; }
    });
    return best;
  }
  L.makeOffer = function (s, rng) {
    L.ensure(s);
    var R = Q(), l = s.licensing, song = pickSong(s);
    if (!song) return null;
    var used = {};
    l.deals.forEach(function (x) { used[x.brandId] = 1; });
    l.offers.forEach(function (x) { used[x.brandId] = 1; });
    var pool = L.brands().filter(function (b) { return (b.genres || {})[s.genre] > 0 && (!b.band || [].concat(b.band).indexOf(s.bandId) >= 0); });   // v0.9: brand.band
    var b = rng.weighted(pool, function (x) { return (x.genres[s.genre] || 0) * (used[x.id] ? 0.2 : 1); });
    if (!b) return null;
    var f = L.fame(s), fee = (b.fee[0] + (b.fee[1] - b.fee[0]) * f) * rng.range(1 - R.noise, 1 + R.noise);
    fee = U.clamp(Math.round(fee / 100) * 100, b.fee[0], b.fee[1]);
    l.made++;
    var o = { id: 'lic' + l.made, brandId: b.id, songId: song.id, fee: fee, week: s.totalWeek, expires: s.totalWeek + R.expires,
      countered: false, status: 'open', shown: false };
    l.offers.push(o);
    l.lastOfferWeek = s.totalWeek;
    while (l.offers.length > R.keep) {   // keep the save small: the oldest closed offer goes first
      var i = -1;
      for (var j = 0; j < l.offers.length; j++) if (l.offers[j].status !== 'open') { i = j; break; }
      if (i < 0) break;
      l.offers.splice(i, 1);
    }
    GG.emit('license:offer', { offer: o });
    return o;
  };

  /* ---- Money ------------------------------------------------------------------------------------------------ */
  L.walkChance = function (s) {
    var R = Q(), deal = GG.labels && GG.labels.deal ? GG.labels.deal(s) : null;
    var t = Math.max(U.clamp(((s.fans || 0) - R.walkFansLo) / (R.walkFansHi - R.walkFansLo), 0, 1), deal ? 1 : 0);
    return Math.round((R.walk - (R.walk - R.walkMin) * t) * 100) / 100;
  };
  // What you'd get: the label's cut (an active deal: (1 - royalty) / 2, clamped) comes off the top.
  L.quote = function (s, o, counter) {
    var R = Q(), fee = o ? (counter ? Math.round(o.fee * (1 + R.counter) / 100) * 100 : o.fee) : 0;
    var deal = GG.labels && GG.labels.deal ? GG.labels.deal(s) : null, share = 0;
    if (deal) share = U.clamp((1 - (deal.royalty != null ? deal.royalty : 0.5)) / 2, R.labelCut[0], R.labelCut[1]);
    var cut = Math.round(fee * share);
    return { fee: fee, cut: cut, net: fee - cut, label: deal ? deal.name : null, share: share };
  };
  // Net licensing income between two weeks (inclusive; defaults: the whole career).
  L.income = function (s, from, to) {
    L.ensure(s);
    from = from || 0; to = to == null ? 1e9 : to;
    return s.licensing.deals.reduce(function (t, x) { return x.week >= from && x.week <= to ? t + (x.fee - (x.cut || 0)) : t; }, 0);
  };

  /* ---- Answers ----------------------------------------------------------------------------------------------- */
  function albumOf(s, songId) {
    var rel = (s.albums || []).filter(function (a) { return a.status === 'released' && (a.tracks || a.tracklist || []).indexOf(songId) >= 0; });
    return rel.length ? rel[rel.length - 1] : null;
  }
  function take(s, o, counter, d) {
    var R = Q(), b = L.brand(o.brandId) || { id: o.brandId, name: o.brandId, buzz: 5, reach: 0.01, sellout: 0.5 };
    var q = L.quote(s, o, counter), deal = GG.labels && GG.labels.deal ? GG.labels.deal(s) : null;
    if (deal && q.cut && GG.labels.recoupLeft) deal.recouped = Math.round(((deal.recouped || 0) + Math.min(q.cut, GG.labels.recoupLeft(deal))) * 100) / 100;
    var fans = Math.min(R.fansMax, Math.round((s.fans || 0) * (b.reach || 0.01)));
    GG.career.applyEffects(s, { fund: q.net, buzz: b.buzz || 5, fans: fans }, d);
    if (b.takeFx) GG.career.applyEffects(s, b.takeFx, d);
    var song = GG.songs && GG.songs.byId ? GG.songs.byId(s, o.songId) : null;
    if (song) {
      song.ad = { brandId: b.id, week: s.totalWeek };
      song.stale = U.clamp((song.stale || 0) + R.adStale, 0, 100);
    }
    var album = albumOf(s, o.songId);
    if (album && album.streamRate >= 0) {
      var add = Math.max(R.streamsMin, Math.round((s.fans || 0) * R.streams));
      album.streamRate += add; d.streams = (d.streams || 0) + add;
    }
    if (GG.fans && GG.fans.apply) GG.fans.apply(s, { hater: Math.round(R.haters * (b.sellout || 0) * 10000) / 10000 }, d);
    if (GG.fans && GG.fans.queue && rngOf(s, 'scandal|' + o.id).chance(R.scandal * (b.sellout || 0))) {
      var sc = (GG.content.licenseScandals || []).filter(function (x) {
        var c = L.card(x.card);
        return c && (x.who === 'band' || x.who === 'player' || active(s, x.who)) && (!GG.career || GG.career.gatePasses(s, c.gate))
          && (!GG.career.cardOk || GG.career.cardOk(s, c));
      })[0];
      if (sc) GG.fans.queue(s, sc.card, sc.who, 'license');
    }
    var fb = L.furyBrand(s);
    if (fb ? b.id === fb : b.id === 'truck' && s.bandId === 'grid_road_ramblers') {   // Buckle & Boot wanted that ad (v0.9: any rival's furyBrand)
      if (GG.rival && GG.rival.addHeat) GG.rival.addHeat(s, R.fury, 'license');
      s.licensing.fury = b.id;
      GG.emit('license:fury', { brandId: b.id });
    }
    s.licensing.deals.push({ brandId: b.id, songId: o.songId, fee: q.fee, cut: q.cut, week: s.totalWeek, countered: !!counter });
    o.status = 'taken'; o.countered = !!counter; o.fee = q.fee;
    s.stats = s.stats || {};
    s.stats.licensed = (s.stats.licensed || 0) + q.net;
    if (s.milestones && !s.milestones.soldOut) s.milestones.soldOut = s.totalWeek;   // D4 "Sold Out"
    chat(s, speakerFor(s), lines().takeChat, d);
    return q;
  }
  // Answers an open offer. choice: 'take' | 'decline' | 'counter'. d: a deltas object to add to (optional).
  L.answer = function (s, id, choice, d) {
    L.ensure(s);
    d = d || {};
    var o = L.offer(s, id);
    if (!o || o.status !== 'open' || o.expires < s.totalWeek || s.ended) return { ok: false, why: 'That offer is gone.', id: id };
    if (C.LICENSE_CHOICES.indexOf(choice) < 0) return { ok: false, why: 'Take it, decline or counter.', id: id };
    var b = L.brand(o.brandId) || {}, R = Q(), res = { ok: true, id: o.id, brandId: o.brandId, choice: choice, status: null, fee: 0, cut: 0, net: 0,
      countered: choice === 'counter', success: null, outcome: '', deltas: d };
    s.licensing.cur = o.id;
    if (choice === 'take' || choice === 'counter') {
      var walk = choice === 'counter' && rngOf(s, 'counter|' + o.id).chance(L.walkChance(s));
      if (choice === 'counter') res.success = !walk;
      if (walk) {
        o.status = 'withdrawn'; o.countered = true;
        res.outcome = L.fillText(s, b.counterWalk || '{brand} walked.');
        chat(s, speakerFor(s), lines().walkChat, d);
      } else {
        var q = take(s, o, choice === 'counter', d);
        res.fee = q.fee; res.cut = q.cut; res.net = q.net;
        res.outcome = L.fillText(s, (choice === 'counter' ? b.counterWin + ' ' : '') + (b.take || ''));
      }
    } else {
      o.status = 'declined';
      s.licensing.declined++;
      if (GG.fans && GG.fans.apply) GG.fans.apply(s, { super: R.loyalty, superfan: { dale: R.daleMood } }, d);
      res.outcome = L.fillText(s, b.decline || 'You pass.');
      chat(s, speakerFor(s), lines().declineChat, d);
    }
    res.status = o.status;
    GG.emit('license:answer', { offer: o, result: res });
    changed(s);
    return res;
  };

  /* ---- The week wrap -------------------------------------------------------------------------------------------- */
  // career.endWeek (after the songs' weekly decay): offers expire, ad songs stay stale for a while, maybe a new offer.
  L.weekly = function (s, rng, wrap) {
    L.ensure(s);
    var R = Q(), out = { offer: null, expired: [] };
    s.licensing.offers.forEach(function (o) {
      if (o.status === 'open' && s.totalWeek >= o.expires) {
        o.status = 'expired'; out.expired.push(o);
        var b = L.brand(o.brandId);
        if (b && b.expire) chat(s, speakerFor(s), b.expire, null);
        GG.emit('license:expired', { offer: o });
      }
    });
    (s.songs || []).forEach(function (x) {
      if (x.ad && s.totalWeek - x.ad.week <= R.adWeeks) x.stale = Math.max(x.stale || 0, R.adFloor);
    });
    var r = rngOf(s, 'roll'), p = L.chance(s);
    if (p > 0 && r.chance(p)) out.offer = L.makeOffer(s, r);
    if (wrap) wrap.licensing = out;
    return out;
  };

  /* ---- Cards ------------------------------------------------------------------------------------------------ */
  var built = { src: null, ch: null, list: [] };
  // One offer card per brand (content/licensing.js text + content/cards.js licenseChoices), the fury card, the scandals.
  L.cards = function () {
    var src = L.content(), ch = GG.content.licenseChoices || [];
    if (built.src === src && built.ch === ch && built.extra === GG.content.licenseCards) return built.list;
    var list = L.brands().map(function (b) {
      return { id: 'lic_' + b.id, type: 'money', speaker: 'recruit', brand: b.id, title: b.title || b.name, text: b.offer || '',
        choices: ch.map(function (c) {
          var out = { lic: c.lic, label: c.label, hint: c.hint, effects: {} };
          out.outcome = c.lic === 'take' ? b.take : c.lic === 'decline' ? b.decline : c.lic === 'later' ? (lines().later || '') : '';
          return out;
        }) };
    }).concat(GG.content.licenseCards || []);
    built = { src: src, ch: ch, extra: GG.content.licenseCards, list: list };
    return list;
  };
  L.card = function (id) { var c = L.cards(); for (var i = 0; i < c.length; i++) if (c[i].id === id) return c[i]; return null; };
  L.isOffer = function (card) { return !!(card && card.brand && /^lic_/.test(card.id)); };
  var scandalCache = { src: null, list: [] };
  // The sellout scandal cards (29_sim_fans lists them with its own fan cards so a queued one comes up like any scandal).
  L.fanCards = function () {
    var src = GG.content.licenseScandals;
    if (scandalCache.src !== src) scandalCache = { src: src, list: (src || []).map(function (x) { return L.card(x.card); }).filter(Boolean) };
    return scandalCache.list;
  };
  L.isScandal = function (id) { return (GG.content.licenseScandals || []).some(function (x) { return x.card === id; }); };
  // This Monday's licensing card: the fury card (queued by a truck ad for the Ramblers), else an offer that hasn't been
  // shown yet (it keeps waiting on the laptop either way).
  L.forcedCard = function (s) {
    L.ensure(s);
    var l = s.licensing, c;
    if (l.fury) {
      c = (GG.career.variant && GG.career.variant(s, 'lic_fury')) || L.card('lic_fury');   // v0.9: 'lic_fury_<bandId>' first
      l.fury = null;
      if (c && GG.career.gatePasses(s, c.gate)) return { card: c, who: null };
    }
    var o = L.open(s).filter(function (x) { return !x.shown; })[0];
    if (!o) return null;
    c = L.card('lic_' + o.brandId);
    if (!c) return null;
    o.shown = true; l.cur = o.id;
    var b = L.brand(o.brandId), who = b && b.speaker;
    if (who && GG.career.isAlias && GG.career.isAlias(who)) who = GG.career.roleOf(s, who);   // v0.9 role alias
    if (!who || (!(GG.content.npcs || {})[who] && !active(s, who)) || (GG.career.speakerOk && !GG.career.speakerOk(s, who))) who = 'mom';
    return { card: c, who: who };
  };
  // career.resolveCard: an offer card answers the current offer ('later' leaves it on the laptop); the fury card moves
  // the rival heat (`lic: { heat }`). Returns { outcome, success } to replace the card's outcome, or null.
  L.afterCard = function (s, card, i, success, d) {
    if (!card || !/^lic_/.test(card.id)) return null;
    var ch = card.choices && card.choices[i];
    if (!ch) return null;
    if (ch.effects && ch.effects.lic && ch.effects.lic.heat && GG.rival && GG.rival.addHeat) GG.rival.addHeat(s, ch.effects.lic.heat, 'license');
    if (!L.isOffer(card)) return null;
    if (ch.lic === 'later' || !ch.lic) return { outcome: L.fillText(s, ch.outcome || ''), success: null };
    var res = L.answer(s, s.licensing.cur, ch.lic, d);
    return res.ok ? { outcome: res.outcome, success: res.success } : { outcome: res.why, success: null };
  };
  // career.effectSummary never sees `lic`; this keeps a hint for the fury card honest when content has none.
  L.effectText = function (v) { return v && v.heat ? 'Rival heat ' + (v.heat > 0 ? '↑' : '↓') : ''; };

  /* ---- Text tokens ------------------------------------------------------------------------------------------- */
  L.current = function (s) {
    if (!s || !s.licensing) return null;
    var l = s.licensing, o = l.cur ? L.offer(s, l.cur) : null;
    if (!o) o = L.open(s)[0] || null;
    return o;
  };
  // {brand} {adwhat} {adsong} {adfee} {adcounter} {adtake} {adodds} {adleft}, from the current offer (the card's, else the
  // newest open one); {brand} falls back to the last deal (the fury and scandal cards).
  L.fillText = function (s, text) {
    if (text == null || !/\{(brand|ad[a-z]+)\}/.test(text)) return text;
    var o = L.current(s), l = s && s.licensing;
    var last = l && l.deals.length ? l.deals[l.deals.length - 1] : null;
    var b = L.brand(o ? o.brandId : last ? last.brandId : null);
    var song = o && GG.songs && GG.songs.byId ? GG.songs.byId(s, o.songId) : null;
    if (!song && last && GG.songs && GG.songs.byId) song = GG.songs.byId(s, last.songId);
    return String(text).replace(/\{(brand|adwhat|adsong|adfee|adcounter|adtake|adodds|adleft)\}/g, function (all, k) {
      if (k === 'brand') return b ? b.name : 'the sponsor';
      if (k === 'adwhat') return b ? b.what : 'commercial';
      if (k === 'adsong') return song ? song.title : 'your song';
      if (!o) return k === 'adodds' ? Math.round(L.walkChance(s) * 100) + '%' : '';
      var q = L.quote(s, o, false);
      if (k === 'adfee') return money(o.fee);
      if (k === 'adcounter') return money(L.quote(s, o, true).fee);
      if (k === 'adtake') return '+' + money(q.net) + (q.cut ? ' after ' + q.label + "'s cut" : '');
      if (k === 'adodds') return Math.round(L.walkChance(s) * 100) + '%';
      var left = Math.max(0, o.expires - s.totalWeek) + 1;
      return left + ' week' + (left === 1 ? '' : 's');
    });
  };

  /* ---- Bots --------------------------------------------------------------------------------------------------- */
  function botPick(s, o, style) {
    var b = L.brand(o.brandId) || {}, walk = L.walkChance(s);
    if (style === 'good') {
      var haters = s.fanTypes ? s.fanTypes.hater : 0;
      if ((b.sellout || 0) >= 0.8 && haters >= 0.12) return 'decline';
      return walk <= 0.2 ? 'counter' : 'take';
    }
    var x = rngOf(s, 'bot|' + o.id).next();
    return x < 0.7 ? 'take' : x < 0.85 ? 'counter' : 'decline';
  }
  // career.botChoice: which button a bot taps on an offer card (null = not a licensing offer card).
  L.botChoice = function (s, card, style) {
    if (!L.isOffer(card)) return null;
    var o = L.current(s);
    if (!o) return 0;
    var want = botPick(s, o, style);
    for (var i = 0; i < card.choices.length; i++) if (card.choices[i].lic === want) return i;
    return 0;
  };
  // An offer whose card never came up (other cards had the Mondays) gets answered from the laptop.
  L.botWeek = function (s, style) {
    L.open(s).forEach(function (o) {
      if (!o.shown && s.totalWeek >= o.week + 2) L.answer(s, o.id, botPick(s, o, style));
    });
  };

  // Saves: fill the licensing fields when missing (no schema bump of our own). Chained onto GG.save.migrate.
  if (GG.save && GG.save.migrate && !GG.save.migrate.licensing) {
    var prevMigrate = GG.save.migrate;
    GG.save.migrate = function (s) { return L.migrate(prevMigrate(s)); };
    Object.keys(prevMigrate).forEach(function (k) { if (GG.save.migrate[k] === undefined) GG.save.migrate[k] = prevMigrate[k]; });
    GG.save.migrate.licensing = true;
  }

  GG.registerDebug('licensing', function () {
    var s = GG.state; if (!s) return { state: null };
    L.ensure(s);
    return { open: L.open(s), deals: s.licensing.deals.slice(), made: s.licensing.made, cap: L.cap(s), chance: L.chance(s),
      eligible: L.eligible(s), walk: L.walkChance(s), income: L.income(s) };
  });
})(window.GG);
