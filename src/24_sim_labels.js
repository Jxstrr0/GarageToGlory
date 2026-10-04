// 24_sim_labels.js (v0.5 "Signed", CAREER agent): the music business after the garage.
//   Label interest -> OFFERs (they expire) -> a DEAL (advance, royalty, albums owed, deadline, demands, recoup, drops)
//   | DIY. Studios x producers -> a recording SESSION over studio weeks (studio event cards on Monday, drum takes by
//   skill or played by you: best take counts, production) -> an ALBUM/EP (tracklist, lead single, title, cover,
//   release week, promo) -> reviews from 5 outlets (recycled drum patterns cost points) -> first-week sales -> the
//   Maple 100 (debut / peak / weeks) -> weekly sales + streams for months -> royalties (recoup the advance first, then
//   the band gets paid, split by the pay-the-band setting) -> gold / platinum certs -> trophies. The Loonie Awards
//   every year at week C.LOONIES_WEEK (nominations 4 weeks earlier) against the rival (v0.6: GG.rival.strength).
// Pure sim: state is the first argument, no DOM. Career randomness comes from GG.rngFor(state); UI previews (title
// and cover options) use RNGs seeded from the career seed so they never move the career RNG.
// Numbers: content/economy.js (`labels`, `loonies`, `eras`, `eraUpkeep`). Words: content/labels.js (labels, studios,
// producers), reviews.js, awards.js, album_words.js, with small fallbacks below so the sim runs without them.
//
// API (GG.labels)   (UI-facing names from the UI agent's phase 1 are marked *)
//   Lookups   cfg() ; label(id) ; labelList() ; studios(state)* / producers(state)* -> [{..., available, locked, lockedWhy}] ;
//             studio(id) ; producer(id) ; outlets() ; status(state) -> { era, signed, labelId, deal, offers, session,
//             pending, released, deadlineIn } ; worldReady(state) ; eraIndex(era)
//   Offers    offers(state)* ; interest(state, labelId) -> weekly chance ; makeOffer(state, labelId, rng) -> OFFER ;
//             sign(state, offerId|labelId|index)* -> DEAL|null ; decline(state, same)* ; goDIY(state)*
//   Deals     deal(state) ; dealStatus(state)* -> { recoupLeft, recoupTotal, recouped, budget.., weeksLeft, goodwill,
//             demands, pendingDemand } | null ; recoupTotal(deal) ; recoupLeft(deal) ; weeksToDeadline(state) ;
//             pendingDemand(state) -> { index, demand }|null (demands without a content card) ;
//             answerDemand(state, index, 'met'|'half'|'refused'|bool) -> deltas ; drop(state, reason)
//   Studio    freshSongs(state) ; canRecord(state, kind) -> { ok, why } | canRecord(state)* -> { ep, album, busy, why } ;
//             quote(state, opts) = sessionQuote* -> { weeks, perWeek, cost, payer, paidBy, budget, bandPays, affordable,
//             note } ; book(state, opts) = startSession* -> SESSION | { error }   opts { kind, studioId, producerId|null,
//             tracks: [songId], weeks? 2..4 } ; inSession(state) ; recordTake(state, songId, 0..100)* (a played take;
//             best take counts) ; takeScore(state, song, rng) (a take by skill) ; production(state, session) ;
//             studioWeek(state, rng) -> [block] (career.runWeek) ; studioEvent(state, rng) -> CARD|null (career.startWeek)
//             ; cards() ; cardById(id) ; applyProduction(state, v, d) (effect key `production`)
//   Albums    album(state, id) ; pending(state) (recorded/scheduled) ; released(state) ; defaultTracklist(state)* ;
//             titleOptions(state, n, roll)* | (state, albumId, n) ; titleEn(state, title) ; coverOptions(state, n, roll)*
//             | (state, albumId, n) -> [{ seed, palette, paletteId, motif, font }] ; releaseWeeks(state)* ;
//             promoOptions(state, albumId?)* -> [{ id, name, cost, promo, payer, labelPays, bandPays, affordable, bought }] ;
//             release(state, { title, cover, tracks, single, week, promo: [pkgId] })* -> ALBUM | { error } (finalise +
//             schedule the pending record) ; setTracklist / setSingle / setTitle / setCover / schedule(state, id, week) /
//             buyPromo(state, id, pkgId) ; tracklistScore(state, ids, singleId) -> { score, notes } ; recycled(state,
//             ids, albumId) -> { count, pairs } ; promoWanted(state) ; promoBlock(state, f, d) (career Promote hook)
//   Release   releaseNow(state, album, rng, out) (release day, from weekly) ; review(state, album, rng) -> [REVIEW] ;
//             firstWeek(state, album, rng) ; chartPos(units, rng) ; singleStrength(state, album) ;
//             chartView(state, albumId?)* -> { week, pos, rows: [{ pos, title, artist, move: 'new'|n, weeks, you }] }
//             REVIEW = { outlet, name, critic, score (outlet scale), scale, unit, score100, weight, band, quote }
//   Weekly    weekly(state, rng, wrap) (career.endWeek) ; afterGig(state, result) (career settleGig)
//   Loonies   loonies(state)* -> LOONIES + noms: [AWARD-ish] ; openEnvelope(state, category)* -> AWARD + { name, won,
//             winner, thanks, rivalLine, deltas } ; outfitCard(state) ; outfit(state, i, cardId?)* ; speechCard(state) ;
//             speech(state, i, cardId?)* -> { cardId, choice, outcome, deltas, success } ; nominate(state, rng) ;
//             runLoonies(state) -> results ; bandStrength(state, cat) ; rivalStrength(state, cat) (v0.6: GG.rival.strength)
//   Bots      botWeek(state, style) ; botSign ; botRecord ; botRelease ; botTracklist(state, ids) ; botPickSongs
//   Saves     init(state) (new careers) ; migrate(state) (v4 -> v5; wraps GG.save.migrate)
// Events: 'era:changed' {era, from, week, why, text} (career.setEra), 'label:offer' {offer}, 'label:signed' {deal},
//   'label:dropped' {deal, reason: 'deadline'|'flop'|'goodwill'}, 'label:fulfilled' {deal}, 'session:week' {session,
//   week, events, done, albumId}, 'album:released' {album}, 'album:reviews' {album, reviews}, 'chart:week' {albumId,
//   title, pos, units, peak, weeks}, 'cert' {album, cert}, 'loonies:nominations' {year, nominations},
//   'loonies:result' {year, results}.
// State (v5): era, eraHistory, label (DEAL + id, name, budget, spent, costs, goodwill, salesMult, demands[].card), 
//   labelOffers (OFFER + id, name, made), labelNext {labelId: week}, pastDeals [DEAL + ended, reason, fulfilled|dropped],
//   session (SESSION + id, played, bonus, payer, dealId, started, bandPaid), albums (ALBUM + status 'recorded'|
//   'scheduled'|'released', releaseWeek, recorded, titleEn, critic, firstWeek, lastUnits, units, weeksOut, streamRate,
//   royalty, dealId, gross, carry, bought, singleStrength, tracklist, recycled, flop, cost), awards (AWARD + winner),
//   trophies, loonies (LOONIES|null), liveYear { gigs, score }; flags.label = labelId | 'diy'. WRAP gains
//   `labels: { news: [{ kind, text, albumId?, offerId? }], royalties, recouped, costs }`. Stats gain releases, units,
//   royalties, certs, loonieWins, drops, offers, deals.
// v0.9: labelList() drops rivalOnly labels ; demandsFor(state, label) (flat + demandsByBand[bandId]) ; cardNeverPasses(state,
//   id) (a carded demand that can't be dealt settles 'half') ; studioCity ('{city}' studios) ; speech / worst-van / outfit
//   cards respect gate + speaker (awards.speech may be { <bandId>: card }) ; {rival} fallbacks ; nominees per genre.
(function (GG) {
  var C = GG.contracts, U = GG.util;
  var L = GG.labels = GG.labels || {};

  /* ======================================================================
     Config + content (fallbacks only used when a content module is missing or incomplete)
     ====================================================================== */
  function econ() { return GG.content.economy || {}; }
  function cfg() { return econ().labels || {}; }
  function lcfg() { return econ().loonies || {}; }
  L.cfg = cfg;
  L.eraIndex = function (era) { var i = C.ERAS.indexOf(era); return i < 0 ? 0 : i; };
  function eraAtLeast(state, era) { return L.eraIndex(state.era) >= L.eraIndex(era || 'garage'); }

  var FALLBACK_LABELS = {
    gopherwood: { id: 'gopherwood', name: 'Gopherwood Records', blurb: 'Indie out of a prairie basement. Small cheques, big hearts.',
      advance: [1000, 3000], royalty: 0.3, albums: 2, deadlineWeeks: 40, demands: [], offerMinFans: 450, offerMinBuzz: 18, dropOnFlop: false },
    monolith: { id: 'monolith', name: 'Monolith Records', blurb: 'A major. A glass tower in Toronto. Opinions.',
      advance: [5000, 12000], royalty: 0.14, albums: 3, deadlineWeeks: 34, offerMinFans: 3000, offerMinBuzz: 30, dropOnFlop: true,
      demands: [{ kind: 'radio_single', text: 'Cut the single down to 3:10 for radio.' },
                { kind: 'image', text: 'New look. More leather. Less whatever this is.' }] },
    diy: { id: 'diy', name: 'DIY', blurb: 'No label. Keep everything. Pay for everything.',
      advance: [0, 0], royalty: 0.7, albums: 0, deadlineWeeks: 0, demands: [], offerMinFans: 0, offerMinBuzz: 0, dropOnFlop: false }
  };
  var FALLBACK_STUDIOS = [
    { id: 'moms_basement', name: "Mom's Basement", city: '{city}', blurb: 'Free. Carpet on the walls. The dryer is always running.',
      costPerWeek: 0, quality: 28, reverb: 0.1, era: 'local', quirk: 'The dryer buzzes through every quiet part.' },
    { id: 'strip_mall_sound', name: 'Strip Mall Sound', city: '{city}', blurb: 'Between a vape shop and a tax office.',
      costPerWeek: 220, quality: 48, reverb: 0.3, era: 'local', quirk: 'The engineer is the landlord. He mentions rent between takes.' },
    { id: 'grain_silo', name: 'Grain Silo Studios', city: 'Yorkton', blurb: 'A converted grain elevator. Seven storeys of natural reverb.',
      costPerWeek: 650, quality: 70, reverb: 0.95, era: 'local', quirk: 'Every snare hit comes back four seconds later.' },
    { id: 'abbot_lane', name: 'Abbot Lane Studios', city: 'London', blurb: 'The famous one. Zebra crossing out front.',
      costPerWeek: 2500, quality: 92, reverb: 0.5, era: 'world', locked: true, quirk: 'Tourists keep walking into the live room.' }
  ];
  var FALLBACK_PRODUCERS = [
    { id: 'turbo_tomasz', name: 'Tomasz "Turbo" Wolak', blurb: 'Makes everything loud. Then louder.', costPerWeek: 250,
      style: 'loud', production: 5, polish: 0, hook: 2, weird: 0.2, era: 'local' },
    { id: 'moss_lindqvist', name: 'Moss Lindqvist', blurb: 'Records in a cabin in the woods. Bears are part of the process.', costPerWeek: 350,
      style: 'cabin', production: 4, polish: 8, hook: 0, weird: 0.5, era: 'local' },
    { id: 'gord_quietly', name: 'Gord Quietly', blurb: 'Says nothing. Quietly fixes the singer\'s pitch.', costPerWeek: 600,
      style: 'pitch', production: 8, polish: 4, hook: 6, weird: 0.1, era: 'local' }
  ];
  var FALLBACK_OUTLETS = [
    { id: 'rolling_scone', name: 'Rolling Scone', scale: 5, decimals: 0, genres: { metal: 0.7, punk: 0.8, rock: 1, country: 0.8 }, bias: 0 },
    { id: 'proclaim', name: 'Proclaim!', scale: 10, decimals: 0, genres: { metal: 0.7, punk: 1, rock: 0.9, country: 0.6 }, bias: 2 },
    { id: 'pitchspork', name: 'Pitchspork', scale: 10, decimals: 1, genres: { metal: 0.6, punk: 0.7, rock: 0.8, country: 0.5 }, bias: -8 },
    { id: 'deci_hell', name: 'Deci-Hell', scale: 100, decimals: 0, genres: { metal: 1, punk: 0.5, rock: 0.3, country: 0.05 }, bias: -2 },
    { id: 'tailgate_weekly', name: 'Tailgate Weekly', scale: 5, decimals: 0, genres: { metal: 0.1, punk: 0.15, rock: 0.4, country: 1 }, bias: 0 }
  ];
  var FALLBACK_QUOTES = {
    awful: ['"{album}" is an album. Technically.', 'We listened to {album} so you do not have to.'],
    meh: ['{band} have made a record. Parts of it are good.', '"{single}" is fine. The rest is also there.'],
    good: ['{band} sound like a real band now. Scary.', '"{single}" will be stuck in your head for a week.'],
    great: ['{album} is the sound of the prairies exploding.', 'The best thing to come out of {space} since the lawnmower.']
  };
  var FALLBACK_WORDS = {
    metal: { adj: ['Frozen', 'Eternal', 'Cursed', 'Howling', 'Grim', 'Endless', 'Wretched', 'Infinite'],
             noun: ['Tundra', 'Dandelions', 'Lawn', 'Silo', 'Blizzard', 'Combine', 'Moose', 'Pothole', 'Winter'],
             patterns: ['{adj} {noun}', 'Songs of the {noun}', 'The {noun} Eternal', 'Return to the {noun}', '{adj} {noun} of {noun2}'] },
    punk: { adj: ['Loud', 'Broke', 'Frozen', 'Angry', 'Cheap'], noun: ['Parka', 'Gravel', 'Bus Pass', 'Slush', 'Rent'],
            patterns: ['{adj} {noun}', 'No {noun}', '{noun} Riot'] },
    rock: { adj: ['Big', 'Wide', 'Highway', 'Northern', 'Last'], noun: ['Sky', 'Road', 'Prairie', 'Radio', 'Night'],
            patterns: ['{adj} {noun}', '{noun} Nights', 'The {noun} Sessions'] },
    country: { adj: ['Dusty', 'Lonesome', 'Gravel', 'Harvest', 'Old'], noun: ['Grid Road', 'Tailgate', 'Combine', 'Quonset', 'Wheat'],
               patterns: ['{adj} {noun}', '{noun} Blues', 'Songs from the {noun}'] }
  };
  var FALLBACK_COVERS = {
    motifs: ['moose', 'silo', 'skull', 'lawn', 'van', 'tundra', 'combine', 'cape'],
    palettes: [['#0d0d0f', '#c9c9c9', '#8b1e1e'], ['#1b2a3a', '#e8e1d0', '#d4a017'], ['#2d0b3a', '#f0e6ff', '#ff4fb0'],
               ['#10261a', '#dfe8d0', '#e0552b'], ['#3a2412', '#f2d8a7', '#6b8e23'], ['#eeeeee', '#111111', '#b40000']],
    fonts: ['blackletter', 'stencil', 'marker', 'serif', 'condensed']
  };
  var FALLBACK_CATEGORIES = {
    breakthrough: 'Breakthrough Group of the Year', album: 'Album of the Year', single: 'Single of the Year',
    live: 'Best Live Act', fan_choice: 'Fan Choice Award', worst_van: 'Worst Van'
  };
  var FALLBACK_SPEECHES = [
    { id: 'mom', label: 'Thank your mom', text: 'You thank your mom. She stands up in the balcony and waves a tea towel.',
      effects: { mood: { all: 3 }, chemistry: 2 } },
    { id: 'band', label: 'Thank the band', text: 'You thank the band one by one. {front} weeps openly. {deadpan} checks the time.',
      effects: { buzz: 6, chemistry: 2 } },
    { id: 'rival', label: 'Take a shot at the rival', text: 'You thank {rival} "for showing us what not to do". The room gasps.',
      effects: { buzz: 10, chemistry: 3, mood: { all: -1 }, flags: { rivalFeud: true } } }
  ];
  // v0.9: neutral {rival} fallbacks (awards.rivalThanks / rivalLoses [rivalId] are the rivals' own lines)
  var FALLBACK_THANKS = ['{rival} win. Their singer walks past your table, grips your hand and says, "Thank you. Truly. We could not have done it without you losing."',
    '{rival} thank "our dear friends from {city}, for making this so easy."'];
  var FALLBACK_LOSES = ['{rival} give you a standing ovation. They mean it. That is the worst part.'];
  var FALLBACK_OTHERS = ['The Hoarfrosts', 'Combine Harvester of Sorrow', 'Slough Monster', 'The Bunnock Kings', 'Stubble Burners',
    'Rural Municipality 344', 'The Gopher Derby', 'Winnipeg Mosquito Choir', 'The Chinook Arches'];
  // v0.9: per-genre nominee fallbacks (content awards.nominees[genre] wins)
  var FALLBACK_NOMINEES = { metal: FALLBACK_OTHERS,
    punk: ['The Slush Fund', 'Bus Pass Riot', 'Snow Route', 'The Transfer Slips', 'Mayor McCheese Grater', 'Pothole Patrol'],
    rock: ['Northern Exposure Unit', 'The Block Heaters', 'Highway 16 Revisited', 'Chinook Thunder', 'The Oil Change'],
    country: ['Tractor Pull Hearts', 'The Swather Brothers', 'Canola Sweetheart', 'Two-Step Tanya', 'Grain Bin Gospel'] };
  var STUDIO_LINES = {
    take: ['Take {n} of "{song}". Everyone holds their breath.', '"{song}": nailed it on take {n}. Probably.', '"{song}" goes down in {n} takes.'],
    mix: ['The engineer turns every knob to the right and nods.', 'Somebody asks for more cowbell. Nobody laughs.', 'You listen back in the parking lot on the van stereo.']
  };

  // content/labels.js may export GG.content.labels = { gopherwood, monolith, diy } (plus GG.content.studios /
  // .producers) or one object { labels, studios, producers }.
  function labelsSrc() { var c = GG.content.labels; return c && c.labels ? c.labels : c; }
  L.label = function (id) {
    var src = labelsSrc(), c = src && src[id], f = FALLBACK_LABELS[id];
    if (!c) return f || null;
    if (!f) return c;
    var out = Object.assign({}, f, c);
    ['advance', 'demands'].forEach(function (k) { if (!Array.isArray(out[k])) out[k] = f[k]; });
    ['royalty', 'albums', 'deadlineWeeks', 'offerMinFans', 'offerMinBuzz'].forEach(function (k) { if (!isFinite(out[k])) out[k] = f[k]; });
    return out;
  };
  L.labelList = function () { return C.LABELS.map(L.label).filter(function (l) { return l && !l.rivalOnly; }); };   // v0.9: never a rival's own label
  // v0.9: a label's demands for this band: the flat (neutral) list + labels[id].demandsByBand[bandId] (same kind: the band's wins).
  L.demandsFor = function (state, lab) {
    if (!lab) return [];
    var own = (lab.demandsByBand && state && lab.demandsByBand[state.bandId]) || [], kinds = {};
    own.forEach(function (x) { kinds[x.kind || x] = true; });
    return (lab.demands || []).filter(function (x) { return !kinds[x.kind || x]; }).concat(own);
  };
  // v0.9: a carded demand whose card can never be dealt in this career (gated to another band / genre, missing, or voiced by
  // someone else's cast) settles 'half' instead of hanging forever.
  function cardNeverPasses(state, id) {
    var c = GG.career.cardById(id);
    if (!c) return true;
    var g = c.gate || {};
    if (g.band && !has(g.band, state.bandId)) return true;
    if (g.genre && !has(g.genre, state.genre)) return true;
    return GG.career.cardOk ? !GG.career.cardOk(state, c) : false;
  }
  L.cardNeverPasses = cardNeverPasses;
  function listFrom(key, fallback) {
    var c = GG.content.labels, list = (c && Array.isArray(c[key]) && c[key]) || (Array.isArray(GG.content[key]) && GG.content[key]);
    return list && list.length ? list : fallback;
  }
  function allStudios() { return listFrom('studios', FALLBACK_STUDIOS); }
  function allProducers() { return listFrom('producers', FALLBACK_PRODUCERS); }
  L.studio = function (id) { return allStudios().filter(function (s) { return s.id === id; })[0] || null; };
  L.producer = function (id) { return id ? allProducers().filter(function (p) { return p.id === id; })[0] || null : null; };
  function availability(state, x) {
    var why = x.locked && !(state && state.era === 'world') ? 'World era' : state && !eraAtLeast(state, x.era || 'local') ? capital(x.era || 'local') + ' era' : '';   // v0.7: Abbot Lane opens in the World era
    return { available: !why, why: why, locked: !!why, lockedWhy: why };
  }
  // v0.9: a studio's city may be '{city}' (the band's home basement studios).
  function cityOf(state, s) { return s && s.city && state ? GG.career.fillText(state, s.city) : s && s.city; }
  L.studioCity = cityOf;
  L.studios = function (state) { return allStudios().map(function (s) { return Object.assign({}, s, availability(state, s), s.city ? { city: cityOf(state, s) } : {}); }); };
  L.producers = function (state) { return allProducers().map(function (p) { return Object.assign({}, p, availability(state, p)); }); };
  // content/reviews.js: GG.content.reviews = [outlet] | { outlets: [outlet] | { id: outlet }, quotes } | { id: outlet }.
  L.outlets = function () {
    var R = GG.content.reviews, list = null;
    if (Array.isArray(R)) list = R;
    else if (R && Array.isArray(R.outlets)) list = R.outlets;
    else if (R && R.outlets && typeof R.outlets === 'object') list = Object.keys(R.outlets).map(function (k) { return R.outlets[k]; });
    else if (R && typeof R === 'object') list = C.OUTLETS.map(function (id) { return R[id]; }).filter(Boolean);
    if (!list || !list.length) return FALLBACK_OUTLETS;
    return list.map(function (o) {
      var f = FALLBACK_OUTLETS.filter(function (x) { return x.id === o.id; })[0] || FALLBACK_OUTLETS[0];
      return Object.assign({}, f, o);
    });
  };
  function capital(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  function has(list, v) { return Array.isArray(list) ? list.indexOf(v) >= 0 : list === v; }
  function rngRound(x, rng) { var f = Math.floor(x); return f + (rng.chance(x - f) ? 1 : 0); }
  function seeded(state, tag) { return GG.RNG(GG.hashSeed((state.seed >>> 0) + '|' + tag)); }
  function fx(state, effects, d) { return GG.career.applyEffects(state, effects, d || {}); }
  function news(out, kind, text, extra) { if (out) out.news.push(Object.assign({ kind: kind, text: text }, extra || {})); }
  function money(n) { return U.fmtMoney(n); }
  function bandName(state) { var b = GG.career.band(state.bandId); return (b && b.name) || 'The band'; }
  function fill(state, text, album) {
    var s = album ? String(text).replace(/\{album\}/g, album.title || '').replace(/\{single\}/g, singleTitle(state, album)) : String(text);
    return GG.career.fillText(state, s);
  }
  function singleTitle(state, album) { var s = album && GG.songs.byId(state, album.single); return s ? s.title : ''; }
  function song(state, id) { return GG.songs.byId(state, id); }

  /* ======================================================================
     Status + eras
     ====================================================================== */
  L.deal = function (state) { return state.label && !state.label.dropped ? state.label : null; };
  L.offers = function (state) { return (state.labelOffers || []).filter(function (o) { return o.expires >= state.totalWeek; }); };
  L.album = function (state, id) { return (state.albums || []).filter(function (a) { return a.id === id; })[0] || null; };
  L.pending = function (state) { return (state.albums || []).filter(function (a) { return a.status !== 'released'; })[0] || null; };
  L.released = function (state) { return (state.albums || []).filter(function (a) { return a.status === 'released'; }); };
  L.inSession = function (state) { var s = state.session; return !!(s && s.weeksDone < s.weeksTotal); };
  L.status = function (state) {
    var d = L.deal(state);
    return { era: state.era, signed: !!d, labelId: d ? d.labelId : null, deal: d, offers: L.offers(state),
      session: state.session || null, pending: L.pending(state), released: L.released(state).length,
      deadlineIn: L.weeksToDeadline(state) };
  };
  // World stage (v0.7): the threshold is defined now, the era switch stays off until economy.eras.worldEnabled.
  L.worldReady = function (state) {
    var K = econ().eras || {};
    return state.fans >= (K.worldFans || 25000) && (!K.worldNeedsChart || L.released(state).some(function (a) { return a.chart && a.chart.peak; }));
  };

  /* ======================================================================
     Offers + deals
     ====================================================================== */
  function bestRelease(state) {
    var best = null;
    L.released(state).forEach(function (a) { if (!best || (a.critic || 0) > (best.critic || 0)) best = a; });
    return best;
  }
  // The weekly chance that `labelId` makes an offer (0 when the band isn't on its radar yet).
  L.interest = function (state, labelId) {
    var K = cfg().offers || {}, lab = L.label(labelId);
    if (!lab || lab.rivalOnly || labelId === 'diy' || L.deal(state) || !eraAtLeast(state, K.minEra || 'local')) return 0;
    if (state.fans < lab.offerMinFans || state.buzz < lab.offerMinBuzz) return 0;
    var br = bestRelease(state), need = K.needRelease && K.needRelease[labelId];
    var charted = L.released(state).some(function (a) { return a.chart && a.chart.peak; });
    if (need != null && !(charted || (br && br.critic >= need))) return 0;
    var p = (K.base || 0.04) + (K.fans || 0.04) * Math.min(K.fansCap || 3, state.fans / Math.max(1, lab.offerMinFans) - 1)
      + (br && br.critic >= (K.goodRelease || 58) ? (K.releaseBonus || 0.1) : 0) + (charted ? (K.chartBonus || 0.08) : 0)
      + state.buzz * (K.buzz || 0);
    return U.clamp(p, 0, K.max || 0.3);
  };
  L.makeOffer = function (state, labelId, rng) {
    var K = cfg().offers || {}, lab = L.label(labelId);
    if (!lab) return null;
    var br = bestRelease(state), spread = K.advanceSpread || [0.85, 1.15];
    var t = U.clamp((state.fans / Math.max(1, lab.offerMinFans) - 1) / (K.advanceFansSpan || 4) + (br ? Math.max(0, br.critic - 60) / 100 : 0), 0, 1);
    var adv = (lab.advance[0] + (lab.advance[1] - lab.advance[0]) * t) * rng.range(spread[0], spread[1]);
    var offer = { id: labelId + '_' + state.totalWeek, labelId: labelId, name: lab.name,
      advance: Math.round(U.clamp(adv, lab.advance[0], lab.advance[1]) * (GG.difficulty ? GG.difficulty.mul(state, 'advance') : 1) / 100) * 100,
      royalty: Math.round(Math.min(0.9, lab.royalty + (br && br.critic >= 75 ? (K.royaltyBonus || 0.02) : 0)) * 100) / 100,
      albums: lab.albums, deadlineWeeks: lab.deadlineWeeks,
      demands: L.demandsFor(state, lab).map(function (x) { return x.kind || x; }),
      made: state.totalWeek, expires: state.totalWeek + (K.expires || 4) };
    return offer;
  };
  function findOffer(state, ref) {
    var list = state.labelOffers || [];
    var o = typeof ref === 'number' ? list[ref] : list.filter(function (x) { return x.id === ref || x.labelId === ref; })[0];
    return o && o.expires >= state.totalWeek ? o : null;
  }
  function removeOffer(state, o) { state.labelOffers = (state.labelOffers || []).filter(function (x) { return x !== o; }); }
  function setFlag(state, k, v) { if (v == null || v === false) delete state.flags[k]; else state.flags[k] = v; }

  L.sign = function (state, ref) {
    var o = findOffer(state, ref);
    if (!o || L.deal(state)) return null;
    var K = cfg(), lab = L.label(o.labelId), d = {};
    var deal = { id: o.labelId + '_' + state.totalWeek, labelId: o.labelId, name: lab.name, signed: state.totalWeek,
      advance: o.advance, recouped: 0, costs: 0, royalty: o.royalty, albumsOwed: o.albums, albumsDelivered: 0,
      deadline: state.totalWeek + o.deadlineWeeks, goodwill: K.goodwill || 60, salesMult: 1, dropped: false,
      demands: (o.demands || []).map(function (kind, i) {
        var src = L.demandsFor(state, lab).filter(function (x) { return (x.kind || x) === kind; })[0];
        return { kind: kind, text: (src && src.text) || kind, card: (src && src.card) || null,
          due: state.totalWeek + (K.demandEvery || 8) * (i + 1), answered: null };
      }) };
    state.label = deal;
    state.labelOffers = [];
    // "The label pays from the advance": part of it is held as the recording budget (studio, producer, paid promo);
    // the band gets the rest now (split by the pay-the-band setting). Overruns come out of the band fund.
    deal.budget = Math.round(deal.advance * (K.recordingShare != null ? K.recordingShare : 0.6)); deal.spent = 0;
    var cash = deal.advance - deal.budget, split = GG.drama ? GG.drama.split(state, cash) : { cut: 0, band: cash };
    deal.advanceCut = split.cut;
    fx(state, Object.assign({ fund: split.band }, K.signFx || {}), d);
    setFlag(state, 'label', o.labelId);
    state.stats.deals = (state.stats.deals || 0) + 1;
    if (GG.career.setEra && L.eraIndex(state.era) < L.eraIndex('signed')) GG.career.setEra(state, 'signed', 'deal');
    GG.emit('label:signed', { deal: deal, deltas: d });
    return deal;
  };
  L.decline = function (state, ref) {
    var o = findOffer(state, ref);
    if (!o) return false;
    removeOffer(state, o);
    (state.labelNext = state.labelNext || {})[o.labelId] = state.totalWeek + ((cfg().offers || {}).declineCooldown || 10);
    return true;
  };
  // Going DIY is a stance: every open offer is declined (labels keep watching; you can still sign later).
  // flags.label becomes 'diy' with your first DIY release.
  L.goDIY = function (state) {
    L.offers(state).slice().forEach(function (o) { L.decline(state, o.id); });
    return true;
  };
  L.recoupTotal = function (deal) { return deal ? (deal.advance || 0) + (deal.costs || 0) : 0; };
  L.recoupLeft = function (deal) { return deal ? Math.max(0, L.recoupTotal(deal) - (deal.recouped || 0)) : 0; };
  L.weeksToDeadline = function (state) { var d = L.deal(state); return d && d.albumsDelivered < d.albumsOwed ? d.deadline - state.totalWeek : null; };
  function dealById(state, id) {
    if (!id) return null;
    if (state.label && state.label.id === id) return state.label;
    return (state.pastDeals || []).filter(function (x) { return x.id === id; })[0] || null;
  }
  function endDeal(state, out, reason) {
    var deal = state.label;
    if (!deal) return null;
    deal.ended = state.totalWeek; deal.reason = reason;
    if (reason === 'fulfilled') deal.fulfilled = true; else deal.dropped = true;
    (state.pastDeals = state.pastDeals || []).push(deal);
    state.label = null;
    setFlag(state, 'label', null);
    var K = cfg(), lab = L.label(deal.labelId) || {};
    (state.labelNext = state.labelNext || {})[deal.labelId] = state.totalWeek + (reason === 'fulfilled' ? ((K.offers || {}).cooldown || 6) : ((K.offers || {}).dropCooldown || 48));
    if (reason === 'fulfilled') {
      var left = deal.budget || 0;
      if (left > 0) { var sp = GG.drama ? GG.drama.split(state, left) : { band: left }; fx(state, { fund: sp.band }); deal.budget = 0; deal.refund = left; }
      news(out, 'fulfilled', 'Contract fulfilled. ' + lab.name + ' shakes your hand. You are free agents again.' + (left > 0 ? ' The unspent recording budget (' + money(left) + ') comes home with you.' : ''));
      GG.emit('label:fulfilled', { deal: deal });
    } else {
      fx(state, K.dropFx || { buzz: -8, mood: { all: -6 } });
      state.stats.drops = (state.stats.drops || 0) + 1;
      var why = reason === 'deadline' ? 'You missed the album deadline.' : reason === 'flop' ? 'The last record flopped.' : 'They got tired of hearing "no".';
      news(out, 'dropped', lab.name + ' dropped you. ' + why + ' You are DIY now.');
      GG.emit('label:dropped', { deal: deal, reason: reason });
    }
    return deal;
  }
  L.drop = function (state, reason) { return L.deal(state) ? endDeal(state, null, reason || 'goodwill') : null; };

  // Label demands (the label's opinions). A demand with a `card` is dramatised by that Monday card (content), which
  // writes flags.demand<Kind> = 'met' | 'half' | 'refused'; the weekly sim settles the DEAL from the flag. A demand
  // without a card comes due every few weeks (pendingDemand -> the UI asks -> answerDemand; unanswered = 'half').
  // Answers move label goodwill (0 = dropped) and the deal's sales multiplier (economy.labels.demandFx).
  function demandFlag(kind) { return 'demand' + capital(kind); }
  L.pendingDemand = function (state) {
    var d = L.deal(state);
    if (!d) return null;
    for (var i = 0; i < d.demands.length; i++) {
      var dm = d.demands[i];
      if (dm.answered == null && !dm.card && dm.due <= state.totalWeek) return { index: i, demand: dm };
    }
    return null;
  };
  function roleHolder(state, role) { return GG.drama ? GG.drama.holder(state, role) : state.members.filter(function (m) { return m.role === role && m.status === 'active'; })[0]; }
  function settleDemand(state, d, dm, answer, viaApi) {
    var K = cfg(), rule = (K.demandFx || {})[dm.kind] || (K.demandFx || {}).other || {}, r = rule[answer] || {}, delta = {};
    dm.answered = answer;
    if (viaApi && r.effects) fx(state, r.effects, delta);   // a card already played out the moods
    if (viaApi && r.role) Object.keys(r.role).forEach(function (role) {
      var m = roleHolder(state, role), mm = {};
      if (m) { mm[m.id] = r.role[role]; fx(state, { mood: mm }, delta); }
    });
    if (r.salesMult) d.salesMult = Math.min(K.salesMultMax || 1.4, (d.salesMult || 1) * r.salesMult);
    if (r.goodwill) d.goodwill = U.clamp(d.goodwill + (r.goodwill < 0 && GG.difficulty ? Math.round(r.goodwill * GG.difficulty.mul(state, 'labelHarsh')) : r.goodwill), 0, 100);
    if (d.goodwill <= 0) endDeal(state, null, 'goodwill');
    return delta;
  }
  // answer: 'met' | 'half' | 'refused' (true = 'met', false = 'refused').
  L.answerDemand = function (state, index, answer) {
    var d = L.deal(state), dm = d && d.demands[index];
    if (!dm || dm.answered != null) return null;
    answer = answer === true ? 'met' : answer === false ? 'refused' : answer;
    if (['met', 'half', 'refused'].indexOf(answer) < 0) return null;
    return settleDemand(state, d, dm, answer, true);
  };

  /* ======================================================================
     Studio: songs, quotes, booking, studio weeks, takes, production
     ====================================================================== */
  function usedIds(state) {
    var used = {};
    (state.albums || []).forEach(function (a) { a.tracks.forEach(function (id) { used[id] = true; }); });
    if (state.session) state.session.tracks.forEach(function (id) { used[id] = true; });
    return used;
  }
  // Songs that aren't on a release (or in the studio) yet.
  L.freshSongs = function (state) { var used = usedIds(state); return state.songs.filter(function (s) { return !used[s.id]; }); };
  function kindRule(kind) { var R = cfg().recording || {}; return { tracks: (R.tracks || {})[kind] || (kind === 'ep' ? [4, 5] : [8, 10]), era: (R.minEra || {})[kind] || 'local' }; }
  // canRecord(state, kind) -> { ok, why } ; canRecord(state) -> { ep, album, busy, why } (the studio screen).
  L.canRecord = function (state, kind) {
    if (kind == null) {
      var e = L.canRecord(state, 'ep'), a = L.canRecord(state, 'album');
      return { ep: e.ok, album: a.ok, busy: !!(state.session || L.pending(state)), ok: e.ok || a.ok, why: e.ok ? (a.ok ? '' : a.why) : e.why };
    }
    if (C.RELEASE_KINDS.indexOf(kind) < 0) return { ok: false, why: 'Unknown release kind.' };
    var rule = kindRule(kind);
    if (!eraAtLeast(state, rule.era)) return { ok: false, why: 'Become local heroes first (' + ((econ().eras || {}).localFans || 250) + ' fans).' };
    if (state.session) return { ok: false, why: 'You are already in the studio.' };
    if (GG.tour && GG.tour.active(state)) return { ok: false, why: 'You are on tour (or about to be). Record when you get home.' };   // v0.7
    if (L.pending(state)) return { ok: false, why: 'Release the record you already made first.' };
    if (L.freshSongs(state).length < rule.tracks[0]) return { ok: false, why: 'You need ' + rule.tracks[0] + ' unreleased songs.' };
    return { ok: true, why: '' };
  };
  function weeksFor(kind, n, studio, producer) {
    var R = cfg().recording || {}, W = R.weeks || {}, S = cfg().styles || {};
    var w = kind === 'ep' ? (W.ep || 2) : (n >= (W.longAt || 9) ? (W.albumLong || 4) : (W.album || 3));
    if (producer && S[producer.style] && S[producer.style].weeks) w += S[producer.style].weeks;
    return U.clamp(w, 2, 4);
  }
  // opts: { kind, studioId, producerId|null, tracks: [songId], weeks? (2..4; default by kind/tracks/producer) }
  // -> { weeks, perWeek, cost, payer / paidBy: 'label'|'band', affordable, note, studio, producer }
  L.quote = function (state, opts) {
    opts = opts || {};
    var st = L.studio(opts.studioId), pr = L.producer(opts.producerId), n = (opts.tracks || []).length || kindRule(opts.kind).tracks[0];
    var weeks = isFinite(opts.weeks) ? U.clamp(Math.round(opts.weeks), 2, 4) : weeksFor(opts.kind, n, st, pr);
    var perWeek = (st ? st.costPerWeek || 0 : 0) + (pr ? pr.costPerWeek || 0 : 0);
    var deal = L.deal(state), payer = deal ? 'label' : 'band', cost = perWeek * weeks;
    var budget = deal ? deal.budget || 0 : 0, bandPays = Math.max(0, cost - budget);
    var note = payer === 'label' ? (deal.name + ' pays from your advance\'s recording budget (' + money(budget) + ' left)' + (bandPays ? '; the band covers ' + money(bandPays) + '.' : '.'))
      : cost ? 'DIY: paid from the band fund, ' + money(perWeek) + ' a studio week.' : 'Free. Somebody has to move the laundry basket.';
    return { weeks: weeks, perWeek: perWeek, cost: cost, payer: payer, paidBy: payer, budget: budget, bandPays: payer === 'label' ? bandPays : cost,
      affordable: state.fund >= (payer === 'label' ? bandPays : cost), note: note, studio: st, producer: pr };
  };
  L.sessionQuote = L.quote;
  L.book = function (state, opts) {
    opts = opts || {};
    var can = L.canRecord(state, opts.kind);
    if (!can.ok) return { error: can.why };
    var st = L.studio(opts.studioId), pr = opts.producerId ? L.producer(opts.producerId) : null;
    if (!st || !availability(state, st).available) return { error: 'That studio is not available.' };
    if (opts.producerId && (!pr || !availability(state, pr).available)) return { error: 'That producer is not available.' };
    var rule = kindRule(opts.kind), fresh = {}, ids = [];
    L.freshSongs(state).forEach(function (s) { fresh[s.id] = true; });
    (opts.tracks || []).forEach(function (id) { if (fresh[id] && ids.indexOf(id) < 0) ids.push(id); });
    if (ids.length < rule.tracks[0] || ids.length > rule.tracks[1]) return { error: 'Pick ' + rule.tracks[0] + '–' + rule.tracks[1] + ' unreleased songs.' };
    var q = L.quote(state, { kind: opts.kind, studioId: st.id, producerId: pr && pr.id, tracks: ids, weeks: opts.weeks });
    if (q.bandPays > 0 && state.fund < Math.min(q.bandPays, q.perWeek)) return { error: 'Not enough in the fund for the first studio week.' };
    state.session = { id: 'A' + ((state.albums || []).length + 1), kind: opts.kind, studioId: st.id, producerId: pr ? pr.id : null,
      weeksTotal: q.weeks, weeksDone: 0, tracks: ids, takes: {}, played: {}, events: [], cost: 0, production: 0, bonus: 0,
      payer: q.payer, dealId: q.payer === 'label' ? L.deal(state).id : null, started: state.totalWeek };
    state.session.production = L.production(state, state.session);
    return state.session;
  };
  L.startSession = L.book;
  // A drum take by skill: your chops minus how far the song is past the band's ability, plus the room, plus luck.
  L.takeScore = function (state, s, rng) {
    var T = (cfg().recording || {}).take || {}, sess = state.session, st = sess && L.studio(sess.studioId);
    var over = Math.max(0, (s.rating ? s.rating.difficulty : 50) - GG.songs.ability(state));
    var v = (T.base || 32) + state.drumSkill * (T.drum || 0.55) - over * (T.over || 0.6) + (st ? st.quality : 30) * (T.studio || 0.08)
      + rng.range(-(T.noise || 12), T.noise || 12) - Math.max(0, state.burnout - 60) * (T.burnout || 0.3);
    return U.clamp(Math.round(v), 0, 100);
  };
  // The UI's played take (a studio-mode rhythm session, 0..100). The best take counts.
  L.recordTake = function (state, songId, score) {
    var s = state.session;
    if (!s || s.tracks.indexOf(songId) < 0 || !isFinite(score)) return null;
    score = U.clamp(Math.round(score), 0, 100);
    s.played[songId] = Math.max(s.played[songId] || 0, score);
    s.takes[songId] = Math.max(s.takes[songId] || 0, score);
    s.production = L.production(state, s);
    return s.takes[songId];
  };
  L.production = function (state, s) {
    var P = (cfg().recording || {}).production || {}, st = L.studio(s.studioId) || { quality: 30 }, pr = L.producer(s.producerId);
    var took = s.tracks.filter(function (id) { return s.takes[id] != null; });
    var takeAvg = took.length ? took.reduce(function (t, id) { return t + s.takes[id]; }, 0) / took.length : (P.unknownTake || 50);
    var pol = s.tracks.reduce(function (t, id) { var x = song(state, id); return t + (x ? x.polish : 0); }, 0) / Math.max(1, s.tracks.length);
    var v = st.quality * (P.studio || 0.5) + takeAvg * (P.takes || 0.3) + pol * (P.polish || 0.2) + (pr ? pr.production || 0 : 0) + (s.bonus || 0);
    return U.clamp(Math.round(v), 0, 100);
  };
  // Label deals pay from the advance's recording budget; whatever it can't cover (and DIY) comes from the band fund.
  function payCost(state, deal, cost, d) {
    var fromBudget = deal && !deal.dropped && !deal.fulfilled ? Math.min(cost, deal.budget || 0) : 0;
    if (fromBudget) { deal.budget -= fromBudget; deal.spent = (deal.spent || 0) + fromBudget; }
    if (cost - fromBudget) fx(state, { fund: -(cost - fromBudget) }, d);
    return cost - fromBudget;
  }
  function payStudio(state, s, cost, d, out) {
    if (!cost) return;
    s.cost += cost;
    var band = payCost(state, s.payer === 'label' ? dealById(state, s.dealId) : null, cost, d);
    s.bandPaid = (s.bandPaid || 0) + band;
    if (out) out.costs += band;
  }
  function lineFrom(state, rng, pool, fallback, vars) {
    var t = GG.career.pickLine(state, rng, pool, fallback) || '';
    Object.keys(vars || {}).forEach(function (k) { t = t.split('{' + k + '}').join(vars[k]); });
    return t;
  }
  // One studio week (replaces the three planner blocks). Returns 3 WEEK_RESULT blocks with activity 'studio'.
  L.studioWeek = function (state, rng) {
    var s = state.session;
    if (!L.inSession(state)) return null;
    var K = cfg(), R = K.recording || {}, st = L.studio(s.studioId) || FALLBACK_STUDIOS[0], pr = L.producer(s.producerId);
    var style = pr ? (K.styles || {})[pr.style] || {} : {}, W = GG.content.albumWords || {};
    var blocks = [0, 1, 2].map(function () { return { activity: 'studio', lines: [], deltas: {} }; });
    var events = [];
    payStudio(state, s, (st.costPerWeek || 0) + (pr ? pr.costPerWeek || 0 : 0), blocks[0].deltas, null);
    if (st.quirk && s.weeksDone === 0) blocks[0].lines.push(fill(state, st.quirk));
    else blocks[0].lines.push(st.name + (pr ? ', with ' + pr.name + '.' : '. You produce it yourselves.'));
    var left = s.weeksTotal - s.weeksDone, todo = s.tracks.filter(function (id) { return s.takes[id] == null; });
    var n = Math.ceil(todo.length / Math.max(1, left)), tries = R.takesPerSong || 3;
    todo.slice(0, n).forEach(function (id, i) {
      var x = song(state, id); if (!x) return;
      var best = 0, at = 1;
      for (var t = 1; t <= tries; t++) { var v = L.takeScore(state, x, rng); if (v > best) { best = v; at = t; } }
      s.takes[id] = Math.max(s.takes[id] || 0, best);
      var line = lineFrom(state, rng, W.takeLines || null, STUDIO_LINES.take, { n: at + rng.int(0, 4), song: x.title });
      blocks[i % 2].lines.push(line + ' (take ' + s.takes[id] + ')');
    });
    s.weeksDone++;
    var d = blocks[2].deltas;
    fx(state, { burnout: (R.burnout || 5) + (style.burnout || 0), chemistry: R.chemistry || 1 }, d);
    if (style.mood) fx(state, { mood: { all: style.mood } }, d);
    blocks[2].lines.push(lineFrom(state, rng, W.mixLines || null, STUDIO_LINES.mix, {}));
    s.production = L.production(state, s);
    blocks.forEach(function (b) { b.lines.forEach(function (l) { events.push(l); }); });
    s.events = s.events.concat(events).slice(-24);
    var album = null;
    if (s.weeksDone >= s.weeksTotal) album = finishSession(state, rng);
    GG.emit('session:week', { session: s, week: s.weeksDone, events: events, done: !!album, albumId: album ? album.id : null });
    return blocks;
  };
  // The session's last week: the record exists (status 'recorded'), with a default tracklist, single, title, cover.
  function finishSession(state, rng) {
    var s = state.session, pr = L.producer(s.producerId);
    if (pr && pr.polish) s.tracks.forEach(function (id) { var x = song(state, id); if (x) x.polish = U.clamp(x.polish + pr.polish, 0, 100); });
    s.production = L.production(state, s);
    var album = { id: s.id, kind: s.kind, title: '', cover: null, tracks: L.botTracklist(state, s.tracks), single: null,
      studioId: s.studioId, producerId: s.producerId, production: s.production,
      recorded: state.totalWeek, released: null, releaseWeek: null, status: 'recorded', promo: 0, label: s.dealId ? dealById(state, s.dealId).labelId : 'diy',
      dealId: s.dealId, royalty: 0, reviews: [], critic: null, chart: { debut: null, peak: null, weeks: 0, pos: null },
      firstWeek: 0, lastUnits: 0, sales: 0, streams: 0, streamRate: 0, units: 0, cert: null, earned: 0, gross: 0, cost: s.cost };
    album.single = pickSingle(state, album.tracks);
    album.title = L.titleOptions(state, album.id, 1)[0];
    album.titleEn = L.titleEn(state, album.title);
    album.cover = L.coverOptions(state, album.id, 1)[0];
    (state.albums = state.albums || []).push(album);
    state.session = null;
    return album;
  }
  // Monday of a studio week: a studio event card (content: GG.content.studioEvents or albumWords.studioEvents, Monday
  // card schema; optional top-level `studio`/`producer`/`style` = id or [ids] to match the session).
  L.cards = function () {
    var W = GG.content.albumWords || {};
    return GG.content.studioEvents || W.studioEvents || W.events || [];
  };
  L.cardById = function (id) { return L.cards().filter(function (c) { return c.id === id; })[0] || null; };
  function eventFits(state, ev) {
    var s = state.session, pr = s && L.producer(s.producerId), gate = ev.gate || {}, rest = {};
    function ok(v, x) { return v == null || has(v, x); }
    if (!ok(ev.studio != null ? ev.studio : gate.studio, s.studioId)) return false;
    if (!ok(ev.producer != null ? ev.producer : gate.producer, s.producerId || 'none')) return false;
    if (!ok(ev.style != null ? ev.style : gate.style, pr ? pr.style : 'none')) return false;
    Object.keys(gate).forEach(function (k) { if (k !== 'studio' && k !== 'producer' && k !== 'style') rest[k] = gate[k]; });
    var seen = state.seenCards[ev.id];
    if (seen != null && (ev.once !== false || state.totalWeek - seen <= (ev.cooldown || 0))) return false;
    if (GG.career.cardOk && !GG.career.cardOk(state, ev)) return false;   // v0.9: another band's member never speaks (speaker + effects)
    return GG.career.gatePasses(state, rest);
  }
  L.studioEvent = function (state, rng) {
    if (!state.session) return null;
    var K = cfg().recording || {};
    var pool = L.cards().filter(function (ev) { return ev && ev.id && ev.choices && eventFits(state, ev); });
    if (!pool.length || !rng.chance(K.eventChance != null ? K.eventChance : 0.85)) return null;
    return rng.weighted(pool, function (c) { return c.weight != null ? c.weight : 1; }) || null;
  };
  // Effect key `production` (studio event cards): ±n points on the session's 0..100 production score.
  L.applyProduction = function (state, v, d) {
    var s = state.session;
    if (!s || !v || !isFinite(v)) return;
    var before = s.production;
    s.bonus = (s.bonus || 0) + v;
    s.production = L.production(state, s);
    if (d && s.production !== before) d.production = (d.production || 0) + s.production - before;
  };

  /* ======================================================================
     Albums: tracklist, single, title, cover, schedule, promo
     ====================================================================== */
  function editable(state, id) { var a = L.album(state, id); return a && a.status !== 'released' ? a : null; }
  function energy(x) { return (x.rating.groove + x.rating.hook) / 2 + (x.pattern && x.pattern.bpm || 120) / 10; }
  function rankOf(list, id, key) {
    var sorted = list.slice().sort(function (a, b) { return key(b) - key(a); });
    for (var i = 0; i < sorted.length; i++) if (sorted[i].id === id) return i / Math.max(1, sorted.length - 1);
    return 1;
  }
  function singleValue(x) { return x.rating.hook * 0.6 + x.quality * 0.4; }
  function pickSingle(state, ids) {
    var best = null;
    ids.forEach(function (id) { var x = song(state, id); if (x && (!best || singleValue(x) > singleValue(best))) best = x; });
    return best ? best.id : ids[0] || null;
  }
  // How well the running order works: opener (energy), lead single (hook), closer (the big one), no near-identical
  // songs back to back. -> { score 0..100, notes: [text] }
  L.tracklistScore = function (state, ids, singleId) {
    var K = cfg().tracklist || {}, list = (ids || []).map(function (id) { return song(state, id); }).filter(Boolean);
    if (list.length < 2) return { score: 50, notes: [] };
    var score = K.base || 50, notes = [], first = list[0], last = list[list.length - 1];
    var r = rankOf(list, first.id, energy);
    if (r <= 0.34) { score += K.opener || 15; notes.push('Strong opener: "' + first.title + '" kicks the door in.'); }
    else if (r >= 0.66) { score -= K.weak || 10; notes.push('"' + first.title + '" is a sleepy opener.'); }
    r = rankOf(list, last.id, function (x) { return x.quality + (x.pattern && x.pattern.arrangement ? x.pattern.arrangement.length : 0); });
    if (r <= 0.34) { score += K.closer || 15; notes.push('"' + last.title + '" is a closer people will remember.'); }
    else if (r >= 0.66) { score -= K.weak || 10; notes.push('The album fizzles out at the end.'); }
    var single = list.filter(function (x) { return x.id === singleId; })[0];
    if (single) {
      r = rankOf(list, single.id, singleValue);
      if (r === 0) { score += K.single || 10; notes.push('"' + single.title + '" is the obvious single.'); }
      else if (r >= 0.66) { score -= K.weak || 10; notes.push('Radio will not bite on "' + single.title + '".'); }
      if (list.indexOf(single) <= 2) score += K.frontSingle || 5;
    }
    for (var i = 1; i < list.length; i++) {
      if (GG.songs.similarity(list[i - 1], list[i], state.genre) >= (K.adjacentAt || 0.9)) {
        score -= K.adjacent || 8; notes.push('"' + list[i - 1].title + '" and "' + list[i].title + '" sound the same back to back.');
      }
    }
    return { score: U.clamp(Math.round(score), 0, 100), notes: notes };
  };
  // Tracks of your last few releases (critics remember those), for the recycled-pattern check.
  function recentTracks(state, albumId) {
    var n = (cfg().reviews || {}).recycledReleases || 2, old = [];
    L.released(state).filter(function (a) { return a.id !== albumId; }).slice(-n).forEach(function (a) {
      a.tracks.forEach(function (id) { var x = song(state, id); if (x) old.push(x); });
    });
    return old;
  }
  // Recycled drum patterns: tracks too similar to another track here or on one of your last releases.
  L.recycled = function (state, ids, albumId) {
    var at = (cfg().reviews || {}).recycledAt || 0.93, list = (ids || []).map(function (id) { return song(state, id); }).filter(Boolean);
    var old = recentTracks(state, albumId), hit = {}, pairs = [];
    for (var i = 0; i < list.length; i++) {
      for (var j = i + 1; j < list.length; j++) {
        var v = GG.songs.similarity(list[i], list[j], state.genre);
        if (v >= at) { hit[list[i].id] = hit[list[j].id] = true; pairs.push([list[i].id, list[j].id, v]); }
      }
      for (var k = 0; k < old.length; k++) {
        var w = GG.songs.similarity(list[i], old[k], state.genre);
        if (w >= at) { hit[list[i].id] = true; pairs.push([list[i].id, old[k].id, w]); }
      }
    }
    return { count: Object.keys(hit).length, pairs: pairs };
  };
  L.setTracklist = function (state, id, order) {
    var a = editable(state, id);
    if (!a || !Array.isArray(order) || order.length !== a.tracks.length) return false;
    var same = order.slice().sort().join('|') === a.tracks.slice().sort().join('|');
    if (!same) return false;
    a.tracks = order.slice();
    return true;
  };
  L.setSingle = function (state, id, songId) { var a = editable(state, id); if (!a || a.tracks.indexOf(songId) < 0) return false; a.single = songId; return true; };
  L.setTitle = function (state, id, text) {
    var a = editable(state, id), t = String(text == null ? '' : text).replace(/\s+/g, ' ').trim().slice(0, 60);
    if (!a || !t) return false;
    a.title = t; a.titleEn = L.titleEn(state, t); return true;
  };
  // v0.9: the Maple 100's filler titles (content albumWords.chartFiller: no band in-jokes; the genre pools carry the packs' own).
  var FALLBACK_CHART = { forms: ['{adj} {noun}', '{noun} Song', 'Love on {place}'], adj: ['Northern', 'Lonely', 'Electric', 'Midnight'],
    noun: ['Heart', 'Highway', 'Radio', 'Sky', 'River'], place: ['the Lake', 'the Coast', 'the Ferry'] };
  function chartWords() { var W = GG.content.albumWords || {}; return W.chartFiller || FALLBACK_CHART; }
  function wordsFor(genre) {
    var W = GG.content.albumWords || {}, T = W.titles || null, g = T && (T[genre] || T.metal);
    return g || FALLBACK_WORDS[genre] || FALLBACK_WORDS.metal;
  }
  // n title options (seeded by career seed + album id: repeatable, never moves the career RNG). content
  // albumWords.titles[genre] = { forms: ['{adj} {noun}'..], adj/noun/place: [word], fr?: [{ fr, en }] }: metal offers one
  // ready-made French title first (Marcel names everything), then generated forms. The player may type their own.
  // titleOptions(state, albumId, n) or titleOptions(state, n, roll) (the pending record; roll = a re-roll counter).
  function workId(state) { var a = L.pending(state); return a ? a.id : state.session ? state.session.id : 'A' + ((state.albums || []).length + 1); }
  L.titleOptions = function (state, id, n, roll) {
    if (typeof id !== 'string') { roll = n; n = id; id = workId(state); }
    var rng = seeded(state, 'title|' + id + (roll ? '|' + roll : '')), w = wordsFor(state.genre), out = [], guard = 0;
    n = n || 3;
    var forms = w.forms || w.patterns || ['{adj} {noun}'];
    if (w.fr && w.fr.length) { var f = rng.pick(w.fr); out.push(String(f.fr || f).slice(0, 60)); }
    while (out.length < n && guard++ < 60) {
      var t = String(rng.pick(forms)).replace(/\{(\w+?)2?\}/g, function (all, slot) { var pool = w[slot]; return pool && pool.length ? rng.pick(pool) : slot; });
      t = fill(state, t).slice(0, 60);
      if (out.indexOf(t) < 0) out.push(t);
    }
    return out.slice(0, n);
  };
  // The English gloss of a generated French title (metal), or null.
  L.titleEn = function (state, title) {
    var w = wordsFor(state.genre), hit = (w.fr || []).filter(function (x) { return x.fr === title; })[0];
    return hit ? hit.en : null;
  };
  // Cover options: content albumWords.covers { motifs, palettes, fonts } (objects with id + genres, or plain values).
  // COVER = { seed, palette: [bg, fg, accent], paletteId, motif: id, font: id }.
  L.coverOptions = function (state, id, n, roll) {
    if (typeof id !== 'string') { roll = n; n = id; id = workId(state); }
    var rng = seeded(state, 'cover|' + id + (roll ? '|' + roll : '')), W = (GG.content.albumWords || {}).covers || {}, out = [];
    function pool(list, fb) {
      var l = list && list.length ? list : fb, g = l.filter(function (x) { return !x || !x.genres || has(x.genres, state.genre); });
      return g.length ? g : l;
    }
    var motifs = pool(W.motifs, FALLBACK_COVERS.motifs), palettes = pool(W.palettes, FALLBACK_COVERS.palettes), fonts = pool(W.fonts, FALLBACK_COVERS.fonts);
    for (var i = 0; i < (n || 3); i++) {
      var m = rng.pick(motifs), p = rng.pick(palettes), f = rng.pick(fonts);
      out.push({ seed: (GG.hashSeed(state.seed + '|' + id + '|' + i) % 100000), palette: p && p.colors ? p.colors.slice() : p,
        paletteId: p && p.id ? p.id : null, motif: m && m.id ? m.id : m, font: f && f.id ? f.id : f });
    }
    return out;
  };
  L.setCover = function (state, id, cover) {
    var a = editable(state, id);
    if (!a || !cover || typeof cover !== 'object') return false;
    a.cover = { seed: isFinite(cover.seed) ? cover.seed : 1, palette: Array.isArray(cover.palette) ? cover.palette.slice(0, 4) : FALLBACK_COVERS.palettes[0],
      paletteId: cover.paletteId || null, motif: String(cover.motif || 'moose'), font: String(cover.font || 'serif') };
    return true;
  };
  // Release week: at least minLead weeks out (so promo can happen), at most maxLead. Returns the week or null.
  L.schedule = function (state, id, week) {
    var a = editable(state, id), R = cfg().release || {};
    week = Math.round(week);
    if (!a || !isFinite(week) || week < state.totalWeek + (R.minLead || 2) || week > state.totalWeek + (R.maxLead || 12) || week > state.maxWeeks) return null;
    a.releaseWeek = week; a.status = 'scheduled';
    return week;
  };
  // Valid release weeks (totalWeek) for the pending record.
  L.releaseWeeks = function (state) {
    var R = cfg().release || {}, out = [];
    for (var w = state.totalWeek + (R.minLead || 2); w <= Math.min(state.maxWeeks, state.totalWeek + (R.maxLead || 12)); w++) out.push(w);
    return out;
  };
  // The bot's running order for the pending record (or the session's tracks).
  L.defaultTracklist = function (state) {
    var a = L.pending(state), ids = a ? a.tracks : state.session ? state.session.tracks : [];
    return ids.length ? L.botTracklist(state, ids) : [];
  };
  // The release screen's one call: opts { title, cover, tracks (order), single, week, promo: [pkgId] | pkgId }.
  // Finalises the pending recorded record and schedules it. -> ALBUM | { error }
  L.release = function (state, opts) {
    opts = opts || {};
    var a = L.pending(state);
    if (!a) return { error: 'Nothing recorded to release.' };
    if (opts.tracks && !L.setTracklist(state, a.id, opts.tracks)) return { error: 'The tracklist must use the recorded songs.' };
    if (opts.single != null && !L.setSingle(state, a.id, opts.single)) return { error: 'The single must be on the record.' };
    if (opts.title != null && String(opts.title).trim() && !L.setTitle(state, a.id, opts.title)) return { error: 'Bad title.' };
    if (opts.cover && !L.setCover(state, a.id, opts.cover)) return { error: 'Bad cover.' };
    if (opts.week != null && L.schedule(state, a.id, opts.week) == null) return { error: 'Pick a release week ' + ((cfg().release || {}).minLead || 2) + '–' + ((cfg().release || {}).maxLead || 12) + ' weeks out.' };
    if (a.status !== 'scheduled') return { error: 'Pick a release week.' };
    [].concat(opts.promo || []).forEach(function (id) { L.buyPromo(state, a.id, id); });
    return a;
  };
  // The deal at a glance (null when unsigned).
  L.dealStatus = function (state) {
    var d = L.deal(state);
    if (!d) return null;
    return { deal: d, labelId: d.labelId, name: d.name, advance: d.advance, costs: d.costs || 0, recouped: Math.round(d.recouped),
      recoupTotal: L.recoupTotal(d), recoupLeft: Math.round(L.recoupLeft(d)), royalty: d.royalty, albumsOwed: d.albumsOwed,
      albumsDelivered: d.albumsDelivered, deadline: d.deadline, weeksLeft: L.weeksToDeadline(state), goodwill: d.goodwill,
      demands: d.demands, pendingDemand: L.pendingDemand(state) };
  };
  L.promoWanted = function (state) {
    var a = L.pending(state), R = cfg().release || {};
    return !!(a && a.status === 'scheduled' && a.releaseWeek >= state.totalWeek && a.promo < (R.promoCap || 6));
  };
  // Career hook: a Promote block while a release is scheduled builds week-one hype.
  L.promoBlock = function (state, f, d) {
    var a = L.pending(state);
    if (!a || a.status !== 'scheduled' || a.releaseWeek < state.totalWeek) return 0;
    var add = Math.round(f * 10) / 10;
    a.promo = Math.round((a.promo + add) * 10) / 10;
    if (d) d.promo = a.promo;
    return add;
  };
  // -> [{ id, name, blurb, cost, promo, payer, labelPays, affordable, bought }] for album id (default: the pending record).
  L.promoOptions = function (state, id) {
    var a = id ? L.album(state, id) : L.pending(state), R = cfg().release || {};
    var label = !!(a ? a.dealId && L.deal(state) && L.deal(state).id === a.dealId : L.deal(state));
    return (R.packages || []).map(function (p) {
      var budget = label ? (L.deal(state).budget || 0) : 0;
      return Object.assign({}, p, { payer: label ? 'label' : 'band', labelPays: label, bandPays: Math.max(0, p.cost - budget), affordable: state.fund + budget >= p.cost,
        bought: !!(a && a.bought && a.bought.indexOf(p.id) >= 0) });
    });
  };
  // Paid promo (posters, a radio push, a TV spot). Label deals front it (recoupable); DIY pays cash.
  L.buyPromo = function (state, id, pkgId) {
    var a = editable(state, id), p = a && L.promoOptions(state, a.id).filter(function (x) { return x.id === pkgId; })[0];
    if (!a || !p || p.bought || !p.affordable) return false;
    payCost(state, p.payer === 'label' ? L.deal(state) : null, p.cost, null);
    (a.bought = a.bought || []).push(p.id);
    a.promo += p.promo;
    return true;
  };

  /* ======================================================================
     Release: reviews, first week, Maple 100, streams, royalties, certs
     ====================================================================== */
  function outletWeight(o, genre) {
    var g = o.genres || o.genreWeight || o.weights;
    if (Array.isArray(g)) return g.indexOf(genre) >= 0 ? 1 : 0.3;
    if (g && isFinite(g[genre])) return U.clamp(g[genre], 0.05, 1);
    return 0.6;
  }
  // Quote band from the 0..100 score: content reviews.scoreBands (lowest score per band) or economy.labels.reviews.bands.
  function quoteBand(v) {
    var SB = (GG.content.reviews || {}).scoreBands, B = (cfg().reviews || {}).bands || [40, 62, 80];
    if (SB) return v >= SB.great ? 'great' : v >= SB.good ? 'good' : v >= SB.meh ? 'meh' : 'awful';
    return v < B[0] ? 'awful' : v < B[1] ? 'meh' : v < B[2] ? 'good' : 'great';
  }
  // Pool = the outlet's quotes[band] + byBand[bandId][band]; a recycled album may get the outlet's `recycled` lines.
  function quotesFor(state, o, band, recycledCount, rng) {
    var R = GG.content.reviews || {}, q = o.quotes || (R.quotes && R.quotes[o.id]) || null;
    var K = cfg().reviews || {};
    if (recycledCount >= (K.recycledQuoteAt || 2) && o.recycled && o.recycled.length && rng.chance(K.recycledQuoteChance || 0.5)) return o.recycled;
    var pool = [].concat((q && (q[band] || (Array.isArray(q) ? q : null))) || [], (o.byBand && o.byBand[state.bandId] && o.byBand[state.bandId][band]) || []);
    return pool.length ? pool : FALLBACK_QUOTES[band];
  }
  function trackAvg(state, album) {
    var list = album.tracks.map(function (id) { return song(state, id); }).filter(Boolean);
    if (!list.length) return { quality: 0, polish: 0 };
    var q = 0, w = 0, p = 0;
    list.forEach(function (x, i) {
      var k = (i === 0 || i === list.length - 1 || x.id === album.single) ? 1.5 : 1;   // the songs people hear first count more
      q += x.quality * k; w += k; p += x.polish;
    });
    return { quality: q / w, polish: p / list.length };
  }
  L.singleStrength = function (state, album) {
    var x = song(state, album.single), pr = L.producer(album.producerId);
    return x ? U.clamp(Math.round(x.rating.hook * 0.45 + x.quality * 0.45 + album.production * 0.1 + (pr ? pr.hook || 0 : 0)), 0, 100) : 0;
  };
  // Five outlets, one review each: the outlet's own weights (quality / production / polish, and how hard it punishes
  // recycled drum patterns) + tracklist + bias + producer style + noise (more noise off-genre) -> 0..100 -> the
  // outlet's scale; pull quote by score band ({album} {single} filled, ALL CAPS when the outlet has caps).
  L.review = function (state, album, rng) {
    var K = cfg().reviews || {}, S = cfg().styles || {}, pr = L.producer(album.producerId), style = pr ? S[pr.style] || {} : {};
    var t = trackAvg(state, album), tl = L.tracklistScore(state, album.tracks, album.single), rec = L.recycled(state, album.tracks, album.id);
    album.tracklist = tl.score; album.recycled = rec.count;   // (notes: GG.labels.tracklistScore)
    var extra = (tl.score - 50) * (K.tracklist || 0.2) + (K.base || 0) + (album.kind === 'ep' ? (K.epAdj || 0) : 0);
    return L.outlets().map(function (o) {
      var w = o.weights || {}, wq = w.quality != null ? w.quality : (K.quality || 0.5), wp = w.production != null ? w.production : (K.production || 0.3);
      var wl = w.polish != null ? w.polish : (K.polish || 0.2), sum = wq + wp + wl || 1, wgt = outletWeight(o, state.genre);
      var harsh = (w.recycled != null ? w.recycled : 0.4) / (K.recycledRef || 0.4);
      var pen = Math.min(K.recycledCap || 16, rec.count * (K.recycled || 4)) * harsh;
      var noise = (K.noise || 6) + (1 - wgt) * (K.offGenreNoise || 10);
      var v = (t.quality * wq + album.production * wp + t.polish * wl) / sum + extra - pen + (o.bias || 0)
        + ((style.outlets || {})[o.id] || 0) + rng.range(-noise, noise);
      v = U.clamp(Math.round(v), 0, 100);
      var scale = o.scale || 10, dec = o.decimals || 0, p = Math.pow(10, dec);
      var shown = Math.round(v / 100 * scale * p) / p;
      if (scale <= 10 && dec === 0) shown = Math.max(1, shown);   // nobody gives zero stars; they give one, angrily
      var band = quoteBand(v), quote = fill(state, GG.career.pickLine(state, rng, quotesFor(state, o, band, rec.count, rng), FALLBACK_QUOTES[band]), album);
      return { outlet: o.id, name: o.name, critic: o.critic || null, score: shown, scale: scale, unit: o.unit || null, score100: v,
        weight: wgt, band: band, quote: o.caps ? quote.toUpperCase() : quote };
    });
  };
  function criticOf(reviews) {
    var t = 0, w = 0;
    reviews.forEach(function (r) { t += r.score100 * r.weight; w += r.weight; });
    return w ? Math.round(t / w) : 0;
  }
  L.firstWeek = function (state, album, rng) {
    var K = cfg().sales || {}, R = cfg().release || {}, crit = (album.critic || 0) / 100, cm = K.critic || [0.4, 1.2, 1.5];
    var deal = dealById(state, album.dealId), reach = (K.reach || {})[album.label] || 1;
    var base = state.fans * (K.buyRate || 0.09) + state.buzz * (K.buzzUnits || 6);
    var qm = cm[0] + cm[1] * Math.pow(crit, cm[2]);
    var pm = 1 + Math.min(R.promoCap || 6, album.promo) * (R.promoEach || 0.08);
    var sg = K.single || [0.85, 0.3], sm = sg[0] + L.singleStrength(state, album) / 100 * sg[1];
    var km = (K.kind || {})[album.kind] || 1, dm = deal ? deal.salesMult || 1 : 1, nz = K.noise || [0.9, 1.1];
    return Math.max(1, Math.round(base * qm * pm * reach * sm * km * dm * rng.range(nz[0], nz[1])));
  };
  // Maple 100 position from a week's units (log scale between the #100 and #1 marks). null = off the chart.
  L.chartPos = function (units, rng) {
    var K = cfg().chart || {}, top = K.top || 15000, bottom = K.bottom || 250;
    if (units < bottom) return null;
    var pos = units >= top ? 1 : 1 + 99 * (Math.log(top) - Math.log(units)) / (Math.log(top) - Math.log(bottom));
    if (rng && K.noise) pos += rng.range(-K.noise, K.noise);
    return U.clamp(Math.round(pos), 1, 100);
  };
  function albumFans(state, units, streams) {
    var K = cfg().sales || {}, scene = GG.world && GG.world.scene ? GG.world.scene(state) : 40000;
    return (units + streams / (K.streamsPerUnit || 1250)) * (K.fansPerUnit || 0.35) * Math.max(0, 1 - state.fans / scene);
  }
  function payRoyalties(state, album, units, streams, out) {
    var K = cfg().sales || {};
    var share = (units * ((K.unitValue || {})[album.kind] || 8) + streams * (K.perStream || 0.004)) * album.royalty;
    album.gross = (album.gross || 0) + share;
    var deal = dealById(state, album.dealId), rec = deal ? Math.min(share, L.recoupLeft(deal)) : 0;
    if (deal) deal.recouped = Math.round((deal.recouped + rec) * 100) / 100;
    album.carry = (album.carry || 0) + share - rec;
    var paid = Math.floor(album.carry);
    album.carry -= paid;
    if (out) out.recouped += rec;
    if (paid <= 0) return 0;
    var split = GG.drama ? GG.drama.split(state, paid) : { cut: 0, band: paid };
    fx(state, { fund: split.band });
    album.earned += paid;
    state.stats.royalties = (state.stats.royalties || 0) + paid;
    if (out) out.royalties += paid;
    return paid;
  }
  function certify(state, album, out) {
    var cert = album.units >= C.CERT.platinum ? 'platinum' : album.units >= C.CERT.gold ? 'gold' : null;
    if (!cert || cert === album.cert) return;
    album.cert = cert;
    state.trophies.push({ kind: cert, title: album.title, year: state.year, albumId: album.id });
    state.stats.certs = (state.stats.certs || 0) + 1;
    fx(state, (cfg().certFx || {})[cert] || { buzz: 8 });
    news(out, 'cert', '"' + album.title + '" goes ' + cert + '! ' + (cert === 'gold' ? GG.career.fillText(state, 'A gold record for the wall in {space}.') : 'Platinum. Your mom frames it next to your grade 3 spelling bee ribbon.'), { albumId: album.id });
    GG.emit('cert', { album: album, cert: cert });
  }
  function chartWeek(state, album, units, rng, out) {
    var c = album.chart, pos = c.weeks === 0 || c.pos ? L.chartPos(units, rng) : null;   // once it falls off, it stays off
    c.prev = c.pos; c.pos = pos; c.week = state.totalWeek;
    if (pos) { c.weeks++; c.peak = c.peak ? Math.min(c.peak, pos) : pos; if (c.debut == null) c.debut = pos; }
    GG.emit('chart:week', { albumId: album.id, title: album.title, pos: pos, units: units, peak: c.peak, weeks: c.weeks });
    return pos;
  }
  // The Maple 100 as a screen: the top 10 + the rows around your record. The other entries are seeded filler (career
  // seed + week), stable for a given week. -> { week, pos, rows: [{ pos, title, artist, move: 'new'|n (+ = up), weeks, you }] }
  L.chartView = function (state, albumId) {
    var a = albumId ? L.album(state, albumId) : L.released(state).slice(-1)[0], c = a && a.chart || {};
    var week = c.week || state.totalWeek, pos = c.pos || null, rows = [];
    // v0.9: the rival is not in the filler artists (its own record charts through GG.rival.chartEntry, the rc row)
    var rv = rivalName(state), artists = (GG.content.headliners || []).map(function (h) { return h.name; }).concat(FALLBACK_OTHERS)
      .filter(function (x, i, l) { return l.indexOf(x) === i && x !== rv; });
    var want = {}, rc = GG.rival && state.rival ? GG.rival.chartEntry(state, week) : null;   // v0.6: the rival's record charts too
    if (rc && rc.pos === pos) rc = null;
    for (var i = 1; i <= 10; i++) want[i] = true;
    if (pos) for (var j = pos - 2; j <= pos + 2; j++) if (j >= 1 && j <= 100) want[j] = true;
    if (rc) want[rc.pos] = true;
    Object.keys(want).map(Number).sort(function (x, y) { return x - y; }).forEach(function (p) {
      if (p === pos) {
        rows.push({ pos: p, title: a.title, artist: bandName(state), move: c.prev ? c.prev - p : 'new', weeks: c.weeks, you: true });
        return;
      }
      if (rc && p === rc.pos) { rows.push({ pos: p, title: rc.title, artist: rc.artist, move: rc.move, weeks: rc.weeks, you: false, rival: true }); return; }
      var r = GG.RNG(GG.hashSeed(state.seed + '|chart|' + week + '|' + p));
      var w = chartWords(), form = r.pick(w.forms || w.patterns || ['{adj} {noun}']);
      var title = String(form).replace(/\{(\w+?)2?\}/g, function (all, slot) { var pl = w[slot]; return pl && pl.length ? r.pick(pl) : slot; });
      rows.push({ pos: p, title: title, artist: r.pick(artists), move: r.chance(0.15) ? 'new' : r.int(-6, 6), weeks: r.int(1, 30), you: false });
    });
    return { week: week, pos: pos, rows: rows };
  };

  // Release day (the wrap of the release week): reviews -> first-week sales -> chart debut -> money, fans, buzz.
  L.releaseNow = function (state, album, rng, out) {
    if (!album || album.status === 'released') return null;
    var K = cfg(), R = K.release || {}, S = K.sales || {}, lab = L.label(album.label) || FALLBACK_LABELS.diy;
    var deal = dealById(state, album.dealId);
    if (deal && (deal.dropped || deal.fulfilled || (L.deal(state) || {}).id !== deal.id)) { album.dealId = null; album.label = 'diy'; deal = null; lab = L.label('diy'); }
    album.status = 'released'; album.released = state.totalWeek;
    album.royalty = deal ? deal.royalty : lab.royalty;
    album.promo += (R.labelPromo || {})[album.label] || 0;
    album.reviews = L.review(state, album, rng);
    album.critic = criticOf(album.reviews);
    album.singleStrength = L.singleStrength(state, album);
    var units = L.firstWeek(state, album, rng);
    album.firstWeek = album.lastUnits = album.sales = units;
    var qm = 0.4 + album.critic / 100;
    album.streamRate = Math.round(state.fans * (S.streamRate || 2.5) * qm * ((S.streamReach || {})[album.label] || 1) * (album.kind === 'ep' ? 0.6 : 1));
    album.streams = album.streamRate;
    album.units = units + Math.floor(album.streams / (S.streamsPerUnit || 1250));
    album.weeksOut = 1;
    GG.emit('album:released', { album: album });
    GG.emit('album:reviews', { album: album, reviews: album.reviews });
    var pos = chartWeek(state, album, units, rng, out);
    payRoyalties(state, album, units, album.streams, out);
    var d = {}, M = K.releaseFx || {};
    fx(state, { fans: Math.round(albumFans(state, units, album.streams)), buzz: Math.round((M.buzz || 6) + album.critic / (M.buzzPer || 10) + (pos ? (101 - pos) / (M.chartBuzzPer || 10) : 0)),
      mood: { all: album.critic >= 70 ? (M.moodGood || 5) : album.critic < 45 ? (M.moodBad || -4) : 1 } }, d);
    state.stats.releases = (state.stats.releases || 0) + 1;
    state.stats.units = (state.stats.units || 0) + units;
    if (!L.deal(state)) setFlag(state, 'label', 'diy');   // cards: flags.label = labelId | 'diy'
    var what = album.kind === 'ep' ? 'EP' : 'album';
    news(out, 'released', 'Release day: "' + album.title + '" (' + what + ') is out. Critics: ' + album.critic + '/100.', { albumId: album.id });
    news(out, 'chart', pos ? '"' + album.title + '" debuts at #' + pos + ' on the Maple 100 (' + U.fmtNum(units) + ' sold).' : '"' + album.title + '" sold ' + U.fmtNum(units) + ' copies. Not enough for the Maple 100.', { albumId: album.id });
    if (deal && album.kind === 'album') {
      deal.albumsDelivered++;
      deal.deadline = state.totalWeek + (L.label(deal.labelId) || {}).deadlineWeeks;
      // bad reviews annoy the label; a hit pleases it. The sales flop check comes after flopWeeks (albumWeek).
      if (album.critic < ((K.flop || {}).critic || 45)) deal.goodwill = U.clamp(deal.goodwill - Math.round((K.goodwillFlop || 20) * (GG.difficulty ? GG.difficulty.mul(state, 'labelHarsh') : 1)), 0, 100);
      else if (pos && pos <= 40) deal.goodwill = U.clamp(deal.goodwill + (K.goodwillHit || 10), 0, 100);
      if (deal.goodwill <= 0) endDeal(state, out, 'goodwill');
      else if (deal.albumsDelivered >= deal.albumsOwed) endDeal(state, out, 'fulfilled');
    }
    if (!album.dealId && album.kind === 'album' && GG.career.setEra && L.eraIndex(state.era) < L.eraIndex('signed')) GG.career.setEra(state, 'signed', 'diy');
    return album;
  };
  function albumWeek(state, album, rng, out) {
    var S = cfg().sales || {}, decay = (S.decay || {})[album.kind] || 0.6;
    album.weeksOut++;
    var units = Math.round(album.lastUnits * decay);
    if (units < (S.minUnits || 5)) units = 0;
    var streams = Math.round(album.streamRate * Math.pow(S.streamDecay || 0.965, album.weeksOut - 1));
    if (streams < (S.minStreams || 50)) streams = 0;
    album.lastUnits = units; album.sales += units; album.streams += streams;
    album.units = album.sales + Math.floor(album.streams / (S.streamsPerUnit || 1250));
    if (album.chart.pos) {
      var before = album.chart.pos, pos = chartWeek(state, album, units, rng, out);
      if (!pos) news(out, 'chart', '"' + album.title + '" drops off the Maple 100 after ' + album.chart.weeks + ' weeks (peak #' + album.chart.peak + ').', { albumId: album.id });
      else if (pos < before) news(out, 'chart', '"' + album.title + '" climbs to #' + pos + '.', { albumId: album.id });
    }
    if (units || streams) {
      payRoyalties(state, album, units, streams, out);
      var f = albumFans(state, units, streams);
      if (f >= 1) fx(state, { fans: rngRound(f, rng) });
      state.stats.units = (state.stats.units || 0) + units;
    }
    certify(state, album, out);
    // the label's sales test: units in the first flopWeeks below its dropOnFlop line (0 = never) -> dropped
    var FW = (cfg().flop || {}).weeks || 12, deal = dealById(state, album.dealId);
    if (album.weeksOut === FW && album.kind === 'album' && deal && L.deal(state) === deal) {
      var line = L.label(deal.labelId).dropOnFlop;
      album.flop = !!(line > 0 && album.units < line);
      if (album.flop) { news(out, 'flop', '"' + album.title + '" moved ' + U.fmtNum(album.units) + ' units. ' + deal.name + ' wanted ' + U.fmtNum(line) + '.'); endDeal(state, out, 'flop'); }
    }
  }

  /* ======================================================================
     Weekly (career.endWeek): offers, deadlines, demands, releases, charts, royalties, Loonies
     ====================================================================== */
  L.weekly = function (state, rng, wrap) {
    var out = { news: [], royalties: 0, recouped: 0, costs: 0 };
    if (wrap) wrap.labels = out;
    if (!eraAtLeast(state, 'local')) return out;
    var K = cfg(), deal = L.deal(state);
    // offers
    state.labelOffers = (state.labelOffers || []).filter(function (o) {
      if (o.expires >= state.totalWeek + 1) return true;
      news(out, 'expired', o.name + '\'s offer expired.');
      (state.labelNext = state.labelNext || {})[o.labelId] = state.totalWeek + ((K.offers || {}).cooldown || 6);
      return false;
    });
    if (!deal) {
      C.LABELS.forEach(function (id) {
        if (id === 'diy' || state.labelOffers.some(function (o) { return o.labelId === id; })) return;
        if ((state.labelNext || {})[id] > state.totalWeek) return;
        var p = L.interest(state, id);
        if (p > 0 && rng.chance(p)) {
          var o = L.makeOffer(state, id, rng);
          state.labelOffers.push(o);
          state.stats.offers = (state.stats.offers || 0) + 1;
          if (!state.milestones.firstOffer) state.milestones.firstOffer = state.totalWeek;
          news(out, 'offer', o.name + ' wants to sign you: ' + money(o.advance) + ' advance, ' + Math.round(o.royalty * 100) + '% royalty, ' + o.albums + ' album' + (o.albums === 1 ? '' : 's') + '.', { offerId: o.id });
          GG.emit('label:offer', { offer: o });
        }
      });
    }
    // deal: demands + deadline
    if (deal) {
      var G = K.demandGrace || 2;
      deal.demands.forEach(function (dm) {
        if (dm.answered != null || !L.deal(state)) return;
        var f = state.flags[demandFlag(dm.kind)];
        if (f === 'met' || f === 'half' || f === 'refused') settleDemand(state, deal, dm, f, false);
        else if ((!dm.card || cardNeverPasses(state, dm.card)) && dm.due + G < state.totalWeek) { settleDemand(state, deal, dm, 'half', true); news(out, 'demand', (deal.name || 'The label') + ' took your silence as a maybe.'); }
      });
      if (!L.deal(state)) news(out, 'dropped', deal.name + ' dropped you. They got tired of hearing "no".');
      deal = L.deal(state);
      var left = deal ? L.weeksToDeadline(state) : null;
      if (deal && left != null) {
        var busy = !!state.session || !!L.pending(state);
        if (left < -(busy ? (K.deadlineGrace || 6) : 0)) endDeal(state, out, 'deadline');
        else if (left === (K.deadlineWarn || 8)) news(out, 'deadline', deal.name + ' wants the next album within ' + left + ' weeks.');
      }
      var pd = deal && L.pendingDemand(state);
      if (pd && pd.demand.due === state.totalWeek) news(out, 'demand', deal.name + ': "' + pd.demand.text + '"');
    }
    // releases + catalogue
    (state.albums || []).forEach(function (a) {
      if (a.status === 'released') { if (a.released < state.totalWeek) albumWeek(state, a, rng, out); }
      else if (a.status === 'scheduled' && a.releaseWeek <= state.totalWeek) L.releaseNow(state, a, rng, out);
    });
    if (out.royalties > 0) news(out, 'royalties', 'Royalties: ' + money(out.royalties) + ' this week.');
    // Loonies: nominations a few weeks ahead, the ceremony at LOONIES_WEEK (auto-resolved here if the UI didn't run it)
    var LK = lcfg();
    if (state.week === C.LOONIES_WEEK - (LK.lead || 4)) L.nominate(state, rng, out);
    if (state.week === C.LOONIES_WEEK) {
      if (!state.loonies || state.loonies.year !== state.year) L.nominate(state, rng, out);
      if (!state.loonies.done) { L.runLoonies(state, rng); if (state.loonies.invited) news(out, 'loonies', loonieLine(state)); }
      state.liveYear = { gigs: 0, score: 0, bd0: state.van ? state.van.breakdowns || 0 : 0 };
    }
    // world stage threshold (the era itself arrives in v0.7)
    if (!state.milestones.worldReady && L.worldReady(state)) {
      state.milestones.worldReady = state.totalWeek;
      news(out, 'world', 'The world is calling: ' + U.fmtNum(state.fans) + ' fans and a charting record.' + ((econ().eras || {}).worldEnabled ? ' The World stage: tour packages abroad are on the laptop, and Abbot Lane Studios in London will take your call.' : ' (World tours arrive in a later version.)'));
      if ((econ().eras || {}).worldEnabled && GG.career.setEra) GG.career.setEra(state, 'world', 'fans');
    }
    return out;
  };
  L.afterGig = function (state, r) {
    if (!r) return;
    var y = state.liveYear || (state.liveYear = { gigs: 0, score: 0 });
    y.gigs++; y.score += r.score || 0;
  };

  /* ======================================================================
     Loonie Awards
     ====================================================================== */
  function awardsContent() { return GG.content.awards || {}; }
  function categoryOf(cat) { var A = awardsContent().categories; return A && (Array.isArray(A) ? A.filter(function (x) { return x.id === cat; })[0] : A[cat]) || null; }
  function categoryName(state, cat) {
    var c = categoryOf(cat);
    if (c && c.genreNames && c.genreNames[state.genre]) return c.genreNames[state.genre];
    var name = (c && (c.name || c.title)) || FALLBACK_CATEGORIES[cat] || cat;
    return cat === 'album' && name.indexOf(capital(state.genre)) < 0 ? capital(state.genre) + ' ' + name : name;
  }
  function rivalLines(state, key, fallback) {
    var A = awardsContent()[key], b = GG.career.band(state.bandId), id = b && b.rival;
    var pool = Array.isArray(A) ? A : A && id ? A[id] : null;
    return pool && pool.length ? pool : fallback;
  }
  // Runs one choice of a ceremony card (outfit / speech): effects, then a roll's success or fail branch.
  function playCard(state, card, i, rng) {
    var ch = card && card.choices && card.choices[i];
    if (!ch) return null;
    var d = {}, outcome = ch.outcome || '', success = null;
    fx(state, ch.effects || {}, d);
    if (ch.roll) {
      success = rng.chance(GG.career.rollChance(state, ch.roll));
      var br = success ? ch.roll.success : ch.roll.fail;
      if (br) { fx(state, br.effects || {}, d); if (br.outcome) outcome = outcome ? outcome + ' ' + br.outcome : br.outcome; }
    }
    return { cardId: card.id, choice: i, outcome: GG.career.fillText(state, outcome), deltas: d, success: success };
  }
  function windowReleases(state) {
    var W = lcfg().window || 24;
    return L.released(state).filter(function (a) { return a.released > state.totalWeek - W; });
  }
  function chartBonus(a) { return a.chart && a.chart.peak ? (101 - a.chart.peak) * 0.3 : 0; }
  // 0..100: how strong the band's case is in a category this year (0 = not eligible).
  L.bandStrength = function (state, cat) {
    var rel = windowReleases(state), best = function (list, f) { return list.reduce(function (m, a) { return Math.max(m, f(a)); }, 0); };
    switch (cat) {
      case 'breakthrough':
        if ((state.awards || []).some(function (x) { return x.category === 'breakthrough' && x.won; })) return 0;
        var firstRel = (state.albums || []).filter(function (a) { return a.status === 'released'; })[0];
        if (!rel.length || !firstRel || firstRel.released < state.totalWeek - (lcfg().breakthroughWeeks || 48)) return 0;
        return Math.round(best(rel, function (a) { return a.critic * 0.6 + chartBonus(a); }) + Math.min(15, state.fans / 400));
      case 'album':
        return Math.round(best(rel.filter(function (a) { return a.kind === 'album'; }), function (a) { return a.critic * 0.7 + chartBonus(a); }));
      case 'single':
        return Math.round(best(rel, function (a) { return (a.singleStrength || 0) * 0.55 + chartBonus(a) * 0.67 + state.buzz * 0.1; }));
      case 'live':
        var y = state.liveYear || { gigs: 0, score: 0 };
        return y.gigs >= (lcfg().liveMinGigs || 6) ? Math.round(y.score / y.gigs * 0.85 + Math.min(12, y.gigs / 2)) : 0;
      case 'fan_choice':
        return state.fans < 200 ? 0 : Math.round(20 * Math.log10(state.fans / 50) + state.buzz * 0.4);
      case 'worst_van':
        var v = state.van || { condition: 70, breakdowns: 0 }, bd = (v.breakdowns || 0) - ((state.liveYear || {}).bd0 || 0);
        return Math.round((100 - v.condition) * 0.6 + Math.max(0, bd) * 10);   // this year's breakdowns
    }
    return 0;
  };
  // The rival's strength per category: v0.6 = the rival sim (GG.rival.strength: their records, set strength, fans);
  // the v0.5 scripted curve stays as the fallback without the rival module.
  L.rivalStrength = function (state, cat) {
    if (GG.rival && GG.rival.strength) return GG.rival.strength(state, cat);
    var K = lcfg().rival || {}, band = GG.career.band(state.bandId), rival = band && band.rival && GG.content.rivals && GG.content.rivals[band.rival];
    if (!rival) return 0;
    if (cat === 'album' && rival.genre && rival.genre !== state.genre) return 0;
    return U.clamp((K.base || 50) + (K.perYear || 4) * state.year + ((K.bias || {})[cat] || 0), 0, K.max || 92);
  };
  function rivalName(state) {
    if (GG.rival && state && state.rival) return GG.rival.name(state);   // v0.6: follows a rebrand
    var b = GG.career.band(state.bandId), r = b && b.rival && GG.content.rivals && GG.content.rivals[b.rival]; return r ? r.name : 'the other band';
  }
  function otherNominees(state, rng, n, cat) {
    var pool = (GG.content.headliners || []).filter(function (h) { return cat !== 'album' || h.genre === state.genre; }).map(function (h) { return h.name; });
    var extra = awardsContent().nominees || FALLBACK_OTHERS, fb = FALLBACK_NOMINEES[state.genre] || FALLBACK_OTHERS;
    pool = pool.concat(Array.isArray(extra) ? extra : (extra[state.genre] || fb)).filter(function (x, i, a) { return a.indexOf(x) === i && x !== rivalName(state); });
    return rng.shuffle(pool).slice(0, n);
  }
  function whatFor(state, cat) {
    var rel = windowReleases(state), best = null;
    if (cat === 'album' || cat === 'single' || cat === 'breakthrough') rel.forEach(function (a) { if ((cat !== 'album' || a.kind === 'album') && (!best || a.critic > best.critic)) best = a; });
    if (!best) return bandName(state);
    return cat === 'single' ? '"' + singleTitle(state, best) + '"' : cat === 'album' ? '"' + best.title + '"' : bandName(state);
  }
  // LOONIES = { year, week, nominations: [{ category, name, what, nominees, strength, rival }], invited, results, outfit,
  // speech, done } + noms: [AWARD-shaped { year, category, name, what, nominated, won (null until opened), winner, against }].
  L.loonies = function (state) {
    var lo = state.loonies;
    if (!lo) return null;
    var res = lo.results || [];
    return Object.assign({}, lo, { noms: lo.nominations.map(function (n) {
      var r = res.filter(function (x) { return x.category === n.category; })[0];
      return { year: lo.year, category: n.category, name: n.name, what: n.what, nominated: true, won: r ? r.won : null,
        winner: r ? r.winner : null, against: n.nominees.slice(1) };
    }) });
  };
  // One envelope: resolves the whole ceremony on the first call (deterministic), then returns that category's AWARD
  // + { thanks (the rival won and thanks you), rivalLine (you beat the rival), bandLine (v0.9: the band's own line), deltas }.
  L.openEnvelope = function (state, category) {
    var lo = state.loonies;
    if (!lo || !lo.invited) return null;
    if (!lo.done) L.runLoonies(state);
    var r = (lo.results || []).filter(function (x) { return x.category === category; })[0];
    if (!r) return null;
    var aw = (state.awards || []).filter(function (x) { return x.year === lo.year && x.category === category; })[0] || {};
    return Object.assign({}, aw, { name: r.name, won: r.won, winner: r.winner, thanks: r.thanks, rivalLine: r.rivalLine, bandLine: r.bandLine || null, deltas: r.deltas || null });
  };
  L.nominate = function (state, rng, out) {
    var K = lcfg(), noms = [];
    if (eraAtLeast(state, 'local')) {
      C.LOONIE_CATEGORIES.forEach(function (cat) {
        var s = L.bandStrength(state, cat);
        if (s < (K.nominateAt || 55)) return;
        var rs = L.rivalStrength(state, cat), others = otherNominees(state, rng, rs >= (K.rivalNominateAt || 40) ? 2 : 3, cat);
        var nominees = [bandName(state)].concat(rs >= (K.rivalNominateAt || 40) ? [rivalName(state)] : [], others);
        noms.push({ category: cat, name: categoryName(state, cat), what: whatFor(state, cat), nominees: nominees, strength: s, rival: rs });
      });
    }
    state.loonies = { year: state.year, week: C.LOONIES_WEEK, nominations: noms, invited: noms.length > 0, results: null, outfit: null, speech: null, done: false };
    if (noms.length) {
      news(out, 'loonies', 'Loonie nominations! ' + noms.map(function (n) { return n.name; }).join(', ') + '. The ceremony is in week ' + C.LOONIES_WEEK + '.');
      GG.emit('loonies:nominations', { year: state.year, nominations: noms });
    }
    return state.loonies;
  };
  // v0.9: a band line after each envelope: awards.win / lose (neutral, tokenised) + awards.byBand[bandId].{win, lose}
  // (career.pool). The band's own lines win when it has them. A line naming a member who is not in the band right now is
  // skipped. Seeded on its own (not the ceremony rng), so the envelopes' outcomes never move.
  function bandLine(state, key, cat) {
    var A = awardsContent(), all = GG.career.pool ? GG.career.pool(state, A, key) : A[key];
    var bb = A.byBand && A.byBand[state.bandId], own = bb && Array.isArray(bb[key]) ? bb[key] : [];
    var pool = (own.length ? own : all || []).filter(function (t) { return typeof t === 'string' && !foreignName(state, t); });
    if (!pool.length) return null;
    var r = GG.RNG(GG.hashSeed((state.seed >>> 0) + '|loonieLine|' + state.year + '|' + cat + '|' + key));
    return fill(state, r.pick(pool));
  }
  // True when the text names a member of any band who isn't active in this career (a quit member, another band's).
  function foreignName(state, text) {
    var B = GG.content.bands || {}, act = {};
    (state.members || []).forEach(function (m) { if (m.status === 'active') act[m.id] = 1; });
    return Object.keys(B).some(function (bid) {
      return ((B[bid] && B[bid].members) || []).some(function (m) {
        var nm = String(m.name || '').split(' ')[0];
        return !act[m.id] && nm.length > 2 && new RegExp('\\b' + nm + '\\b').test(text);
      });
    });
  }
  // The envelopes. Idempotent per year. Returns [{ category, name, won, winner, rivalWon, thanks }].
  L.runLoonies = function (state, rng) {
    var lo = state.loonies;
    if (!lo || lo.done) return lo ? lo.results : null;
    rng = rng || GG.rngFor(state);
    var K = lcfg(), R = K.win || {}, results = [], rname = rivalName(state);
    lo.nominations.forEach(function (n) {
      var nz = K.noise || 10, best = null, bestV = -Infinity, oth = K.other || [45, 75], vals = {};
      n.nominees.forEach(function (who, i) {
        var v = i === 0 ? n.strength : who === rname ? n.rival : rng.range(oth[0], oth[1]);
        v += rng.range(-nz, nz);
        vals[who] = v;
        if (v > bestV) { bestV = v; best = who; }
      });
      var won = best === n.nominees[0], rivalWon = best === rname, rivalIn = n.nominees.indexOf(rname) > 0;
      var res = { category: n.category, name: n.name, won: won, winner: best, rivalWon: rivalWon, thanks: null, rivalLine: null,
        rivalIn: rivalIn, you: Math.round(vals[n.nominees[0]]), them: rivalIn ? Math.round(vals[rname]) : null };   // v0.6: the rivalry
      var line = function (key, fb) { return fill(state, String(GG.career.pickLine(state, rng, rivalLines(state, key, fb), fb[0])).replace(/\{category\}/g, n.name)); };
      if (rivalWon) res.thanks = line('rivalThanks', FALLBACK_THANKS);
      else if (won && rivalIn) res.rivalLine = line('rivalLoses', FALLBACK_LOSES);
      res.bandLine = bandLine(state, won ? 'win' : 'lose', n.category);   // v0.9: awards.{win, lose} + byBand (own rng: no stream shift)
      state.awards.push({ year: state.year, category: n.category, nominated: true, won: won, against: n.nominees.slice(1), winner: best });
      if (won) {
        var d = {}, cr = (categoryOf(n.category) || {}).reward || {};
        if (n.category === 'worst_van') {
          var W = K.worstVan || {};
          fx(state, { buzz: cr.buzz || W.buzz || 6, fund: Math.round((cr.fund || 0) * (R.fundScale || 1)) }, d);
          if (state.van && W.van) state.van.condition = U.clamp(state.van.condition + W.van, 0, 100);
        } else {
          var fansWin = cr.fans != null ? cr.fans * (R.fansScale || 1) : Math.max(R.fans || 50, Math.round(state.fans * (R.fansPct || 0.015)));
          fx(state, { fund: Math.round((cr.fund != null ? cr.fund : R.fund || 1000) * (R.fundScale || 1)), fans: Math.round(Math.min(R.fansCap || 600, fansWin)),
            buzz: cr.buzz || R.buzz || 12, mood: { all: R.mood || 4 } }, d);
        }
        state.trophies.push({ kind: 'loonie', title: n.name, year: state.year, category: n.category });
        state.stats.loonieWins = (state.stats.loonieWins || 0) + 1;
        res.deltas = d;
      } else fx(state, { buzz: (K.nominated || {}).buzz || 3 });
      results.push(res);
    });
    lo.results = results; lo.done = true;
    if (GG.rival && state.rival) GG.rival.loonies(state, results);   // v0.6: a Loonie clash with the rival (heat, record)
    GG.emit('loonies:result', { year: lo.year, results: results });
    return results;
  };
  // The acceptance speech card (content awards.speech; awards.speechWorstVan when Worst Van is the only win).
  // v0.9: awards.speech / speechWorstVan may be one card or { <bandId>: card }; a card is used only when its gate passes and
  // its speaker belongs to the band (else the neutral fallback speech).
  function bandCard(state, x) {
    var c = x && x.choices ? x : x && state ? x[state.bandId] : null;
    return c && c.choices && GG.career.gatePasses(state, c.gate) && (!GG.career.seatOk || GG.career.seatOk(state, c)) && (!GG.career.speakerOk || GG.career.speakerOk(state, c.speaker)) ? c : null;   // v1.1: top-level seat gates
  }
  L.speechCard = function (state) {
    var A = awardsContent(), r = state && state.loonies && state.loonies.results || [], won = r.filter(function (x) { return x.won; });
    var vanOnly = won.length && won.every(function (x) { return x.category === 'worst_van'; });
    var c = (vanOnly && bandCard(state, A.speechWorstVan)) || bandCard(state, A.speech);
    return c || { id: 'loonie_speech', title: 'The Speech', text: '', choices: FALLBACK_SPEECHES.map(function (x) { return { label: x.label, effects: x.effects, outcome: x.text }; }) };
  };
  L.speechChoices = function (state) { return L.speechCard(state).choices; };
  // One acceptance speech per ceremony, only after a win. -> { cardId, choice, outcome, deltas, success }
  L.speech = function (state, i, cardId) {
    var lo = state.loonies, A = awardsContent(), card = L.speechCard(state), wv = bandCard(state, A.speechWorstVan), sp = bandCard(state, A.speech);
    if (cardId && wv && wv.id === cardId) card = wv;
    else if (cardId && sp && sp.id === cardId) card = sp;
    if (!lo || !lo.done || lo.speech != null || !(lo.results || []).some(function (r) { return r.won; })) return null;
    var res = playCard(state, card, i, GG.rngFor(state));
    if (res) lo.speech = i;
    return res;
  };
  // The red-carpet outfit card (content awards.outfitCards; cape-aware gates: the first card whose gate passes).
  L.outfitCard = function (state) {
    return (awardsContent().outfitCards || []).filter(function (c) {
      return c && c.choices && GG.career.gatePasses(state, c.gate) && (!GG.career.seatOk || GG.career.seatOk(state, c)) && (!GG.career.speakerOk || GG.career.speakerOk(state, c.speaker));   // v0.9: null when none fits the band (v1.1: + seat gates)
    })[0] || null;
  };
  L.outfit = function (state, i, cardId) {
    var lo = state.loonies, card = (cardId && (awardsContent().outfitCards || []).filter(function (c) { return c.id === cardId; })[0]) || L.outfitCard(state);
    if (!lo || lo.outfit != null || !card) return null;
    var res = playCard(state, card, i, GG.rngFor(state));
    if (res) lo.outfit = i;
    return res;
  };
  function loonieLine(state) {
    var r = state.loonies.results || [], won = r.filter(function (x) { return x.won; });
    if (won.length) return 'Loonie Awards: you won ' + won.map(function (x) { return x.name; }).join(' and ') + '!';
    return 'Loonie Awards: no wins this year.' + (r.some(function (x) { return x.rivalWon; }) ? ' ' + rivalName(state) + ' thanked you personally.' : '');
  }

  /* ======================================================================
     Bots
     ====================================================================== */
  function songValue(x) { return GG.songs.score(x) + x.rating.hook * 0.1; }
  // Picks n fresh songs by value; the good bot skips songs that recycle a pattern already picked or released.
  L.botPickSongs = function (state, n, style) {
    var at = (cfg().reviews || {}).recycledAt || 0.93, fresh = L.freshSongs(state).slice().sort(function (a, b) { return songValue(b) - songValue(a); });
    if (style !== 'good') return fresh.slice(0, n).map(function (x) { return x.id; });
    var old = recentTracks(state, null), out = [];
    fresh.forEach(function (x) {
      if (out.length >= n) return;
      var clash = out.concat(old).some(function (y) { return GG.songs.similarity(x, y, state.genre) >= at; });
      if (!clash) out.push(x);
    });
    fresh.forEach(function (x) { if (out.length < n && out.indexOf(x) < 0) out.push(x); });
    return out.map(function (x) { return x.id; });
  };
  // A reasonable running order: the most energetic opener, the strongest closer, the rest spread out by tempo.
  L.botTracklist = function (state, ids) {
    var list = ids.map(function (id) { return song(state, id); }).filter(Boolean);
    if (list.length < 3) return ids.slice();
    var opener = list.slice().sort(function (a, b) { return energy(b) - energy(a); })[0];
    var rest = list.filter(function (x) { return x !== opener; });
    var closer = rest.slice().sort(function (a, b) { return b.quality - a.quality; })[0];
    var mid = rest.filter(function (x) { return x !== closer; });
    var order = [opener], at = (cfg().tracklist || {}).adjacentAt || 0.9;
    while (mid.length) {
      var prev = order[order.length - 1], pick = mid.filter(function (x) { return GG.songs.similarity(prev, x, state.genre) < at; })[0] || mid[0];
      order.push(pick); mid.splice(mid.indexOf(pick), 1);
    }
    order.push(closer);
    return order.map(function (x) { return x.id; });
  };
  L.botSign = function (state, style) {
    var offers = L.offers(state), B = (cfg().bot || {});
    if (!offers.length || L.deal(state)) return null;
    var best = offers.slice().sort(function (a, b) { return (b.advance + b.royalty * 20000) - (a.advance + a.royalty * 20000); })[0];
    if (style === 'good') return L.sign(state, best.id);
    var rng = GG.rngFor(state);
    if (rng.chance(B.avgSign || 0.5)) return L.sign(state, best.id);
    if (rng.chance(B.avgDecline || 0.15)) L.decline(state, best.id);
    return null;
  };
  // Picks the studio + producer: the best the payer can stand. Returns opts for book() or null.
  function botStudio(state, kind, ids, style) {
    var B = cfg().bot || {}, label = !!L.deal(state), cash = state.fund - (style === 'good' ? (B.goodCushion || 400) : (B.avgCushion || 250));
    var budget = label ? (L.deal(state).budget || 0) + Math.max(0, cash) * (style === 'good' ? (B.goodSpend || 0.35) : (B.avgSpend || 0.2)) : cash;
    var studios = L.studios(state).filter(function (s) { return s.available; }), prods = [null].concat(L.producers(state).filter(function (p) { return p.available; }));
    var best = null, bestV = -Infinity, rng = style === 'good' ? null : GG.rngFor(state);
    studios.forEach(function (s) {
      prods.forEach(function (p) {
        var q = L.quote(state, { kind: kind, studioId: s.id, producerId: p && p.id, tracks: ids });
        if (q.cost > budget) return;
        // a rich band minds the bill less: cash cost is weighed against the fund (good) or flat (avg)
        var per = style === 'good' ? Math.max(150, state.fund / (B.richAt || 20)) : 150;
        var v = s.quality + (p ? p.production * 2 + (p.polish || 0) : 0) - q.bandPays / per - (q.cost - q.bandPays) / 400 + (rng ? rng.range(0, 25) : 0);
        if (v > bestV) { bestV = v; best = { kind: kind, studioId: s.id, producerId: p ? p.id : null, tracks: ids }; }
      });
    });
    return best;
  }
  L.botRecord = function (state, style) {
    if (state.session || L.pending(state) || !eraAtLeast(state, 'local')) return null;
    var B = cfg().bot || {}, deal = L.deal(state), rel = L.released(state), last = rel.length ? rel[rel.length - 1].released : -99;
    var fresh = L.freshSongs(state), good = style === 'good', rng = GG.rngFor(state), kind = null;
    var minQ = good ? (B.goodMinQuality || 55) : (B.avgMinQuality || 45);
    var usable = fresh.filter(function (x) { return x.quality >= minQ; }).length;
    if (deal) {
      var left = L.weeksToDeadline(state);
      if (left == null) return null;
      if (usable >= 8 && (good || left <= (B.avgDeadlineWeeks || 16) || rng.chance(B.avgRecordChance || 0.12))) kind = 'album';
      else if (left <= 6 && fresh.length >= 8) kind = 'album';   // deadline panic: record whatever you have
    } else if (!rel.length || state.totalWeek - last >= (B.epGap || 30)) {
      var diyAlbum = state.year >= (B.diyAlbumYear || 3) && usable >= 8 && state.totalWeek - (state.milestones.firstOffer || state.totalWeek) >= 0
        && !L.offers(state).length && state.fund >= (B.diyAlbumFund || 1500);
      if (diyAlbum && (good || rng.chance(B.avgDiyChance || 0.08)) && (!state.milestones.firstOffer || state.totalWeek - state.milestones.firstOffer > (B.diyAfterOffer || 30))) kind = 'album';
      else if (usable >= 5 && !L.offers(state).length && (good || rng.chance(B.avgEpChance || 0.1))) kind = 'ep';
    }
    if (!kind) return null;
    var ids = L.botPickSongs(state, kind === 'ep' ? 5 : (good ? 10 : 8), style);
    var opts = botStudio(state, kind, ids, style);
    if (!opts) return null;
    // studio weeks earn nothing: keep enough to cover the upkeep (+ the studio bill when DIY) and a cushion
    var q = L.quote(state, opts), weekly = GG.career.upkeep(state);
    if (state.fund < q.weeks * weekly + q.bandPays + (good ? (B.goodCushion || 400) : (B.avgCushion || 250))) return null;
    var s = L.book(state, opts);
    return s && !s.error ? s : null;
  };
  L.botRelease = function (state, style) {
    var a = L.pending(state), R = cfg().release || {}, B = cfg().bot || {};
    if (!a || a.status !== 'recorded') return null;
    L.setTracklist(state, a.id, L.botTracklist(state, a.tracks));
    L.setSingle(state, a.id, pickSingle(state, a.tracks));
    var lead = style === 'good' ? (B.goodLead || 3) : GG.rngFor(state).int(R.minLead || 2, B.avgLeadMax || 4);
    L.schedule(state, a.id, Math.min(state.maxWeeks, state.totalWeek + lead));
    if (style === 'good') {
      L.promoOptions(state, a.id).forEach(function (p) {
        if (!p.bought && state.fund - p.bandPays > (B.promoCushion || 2500) && (p.bandPays <= (B.labelPromo || 1000) || state.fund > p.bandPays * 4)) L.buyPromo(state, a.id, p.id);
      });
    }
    return a;
  };
  L.botWeek = function (state, style) {
    if (!eraAtLeast(state, 'local')) return;
    var pd;
    while ((pd = L.pendingDemand(state))) L.answerDemand(state, pd.index, style === 'good' ? 'met' : GG.rngFor(state).pick(['met', 'half', 'refused']));
    L.botSign(state, style);
    L.botRecord(state, style);
    L.botRelease(state, style);
  };

  /* ======================================================================
     Saves: new careers + v4 -> v5 migration (idempotent)
     ====================================================================== */
  L.init = function (s) {
    if (!s || typeof s !== 'object') return s;
    if (!Array.isArray(s.eraHistory) || !s.eraHistory.length) {
      s.eraHistory = [{ era: 'garage', week: 1 }];
      if (s.era && s.era !== 'garage') s.eraHistory.push({ era: s.era, week: (s.milestones && s.milestones.localHeroes) || s.totalWeek || 1 });
    }
    if (s.label === undefined || (s.label && typeof s.label !== 'object')) s.label = null;
    ['labelOffers', 'pastDeals', 'albums', 'awards', 'trophies'].forEach(function (k) { if (!Array.isArray(s[k])) s[k] = []; });
    if (!s.labelNext || typeof s.labelNext !== 'object' || Array.isArray(s.labelNext)) s.labelNext = {};
    if (s.session === undefined || (s.session && (typeof s.session !== 'object' || !Array.isArray(s.session.tracks)))) s.session = null;
    if (s.loonies === undefined) s.loonies = null;
    if (!s.liveYear || typeof s.liveYear !== 'object') s.liveYear = { gigs: 0, score: 0 };
    if (s.stats && typeof s.stats === 'object') ['releases', 'units', 'royalties', 'certs', 'loonieWins', 'drops', 'offers', 'deals'].forEach(function (k) { if (!isFinite(s.stats[k])) s.stats[k] = 0; });
    return s;
  };
  L.migrate = function (s) {
    if (!s || typeof s !== 'object') return s;
    // v4 saves: a band past the garage-era protection is local heroes now
    if (s.era === 'garage' && s.protected === false) { s.era = 'local'; if (Array.isArray(s.eraHistory) && s.eraHistory.length === 1) s.eraHistory.push({ era: 'local', week: (s.milestones && s.milestones.localHeroes) || s.totalWeek || 1 }); }
    return L.init(s);
  };
  if (GG.save && GG.save.migrate && !GG.save.migrate.labels) {
    var prev = GG.save.migrate;
    GG.save.migrate = function (s) { return L.migrate(prev(s)); };
    GG.save.migrate.labels = true;
  }

  GG.registerDebug('labels', function () {
    var s = GG.state; if (!s) return { state: null };
    return { era: s.era, label: s.label && { id: s.label.labelId, owed: s.label.albumsOwed, delivered: s.label.albumsDelivered, recoupLeft: L.recoupLeft(s.label), deadline: s.label.deadline },
      offers: L.offers(s).map(function (o) { return o.id; }), session: s.session && { kind: s.session.kind, week: s.session.weeksDone + '/' + s.session.weeksTotal, production: s.session.production },
      albums: (s.albums || []).map(function (a) { return { id: a.id, title: a.title, status: a.status, critic: a.critic, peak: a.chart.peak, units: a.units, cert: a.cert }; }),
      loonies: s.loonies && { year: s.loonies.year, invited: s.loonies.invited, done: s.loonies.done } };
  });
})(window.GG);
