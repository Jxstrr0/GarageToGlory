// 02_contracts.js: the single source of truth for state fields, content schemas, events and commands.
// Constants below are used by code and tests. Comments document shapes. Change this file first.
(function (GG) {
  var C = GG.contracts = {};

  C.SAVE_SCHEMA = 10;            // state.v; bump + add a migration in 10_save.js when the shape changes
  C.WEEKS_PER_YEAR = 24;
  C.CAREER_YEARS = 10;           // 240 weeks; v1.0 bonus years (C.BONUS) raise state.maxWeeks to 288 / 312
  // v1.0 "Glory" (plan_contract_1.0 §0 Q1): the World era reached by totalWeek <= maxWeek (inclusive) earns `years` bonus
  // years, granted once by GG.legacy.weekly (state.bonusYears, state.maxWeeks = 240 + 24 x years); never after the Sad Dome
  // is announced (rival.finalNews), after state.finalShowdown, or from year 10 on.
  C.BONUS = { maxYears: 3, rule: [{ maxWeek: 120, years: 3 }, { maxWeek: 144, years: 2 }] };
  C.BLOCKS_PER_WEEK = 3;         // two weeknights + the weekend
  C.BLOCK_LABELS = ['Tue night', 'Thu night', 'Weekend'];

  C.GENRES = ['metal', 'punk', 'rock', 'country'];
  C.ERAS = ['garage', 'local', 'signed', 'world'];
  C.REGIONS = ['canada', 'uk_europe', 'japan', 'australia', 'russia']; // no USA, ever
  C.CARD_TYPES = ['drama', 'money', 'road', 'scene', 'fame', 'weird'];
  C.ACTIVITIES = ['rehearse', 'write', 'promote', 'book', 'hustle', 'rest'];
  C.PHASES = ['monday', 'plan', 'week', 'gig', 'wrap', 'ended'];   // 'gig' = blocks done, weekend gig to play live (v0.3)
  C.DEALS = ['exposure', 'flat', 'door'];
  C.GRADES = ['S', 'A', 'B', 'C', 'D'];
  // Drum lanes, left to right on the sequencer grid and the gig highway. Kit starts with the first 4 (v0.8 unlocks toms, ride).
  C.LANES = ['kick', 'snare', 'hat', 'cymbal', 'toms', 'ride'];
  C.STEPS = 16;                  // steps per bar; steps run top-to-bottom like the note highway
  C.SECTIONS = ['verse', 'chorus', 'bridge'];          // v0.8 unlocks 'outro', 'solo'
  C.EXTRA_SECTIONS = ['outro', 'solo'];                // v0.8: owned ones live in state.gear.sections (Outro early, Solo later)
  // v0.8 Kit. Kit quality tier (state.gear.quality) changes the synth: body, sustain, saturation, reverb send.
  C.KIT_QUALITY = ['milk_crate', 'pawn_shop', 'pro', 'arena'];
  C.VAN_TIERS = ['minivan', 'fifteen', 'sprinter', 'bus'];   // rusted minivan → 15-passenger + trailer → sprinter → tour bus
  // Rehearsal spaces by era (index = tier). Tier 0 is the band's own start (garage / laundromat basement / strip-mall unit / Quonset).
  C.SPACE_TIERS = ['start', 'jam_room', 'pro_studio', 'arena_backstage'];
  C.MERCH_TIERS = ['basics', 'warm', 'vinyl', 'limited'];     // stickers/shirts → hoodies/toques → vinyl → silly limited editions
  // v0.8.1 (Addendum 2): band logo (D2) + licensing (D1). Lists are starting sets (add, don't shrink); palettes in content/logo.js.
  C.LOGO_EMBLEMS = ['skull', 'wheat', 'bolt', 'moose', 'maple', 'gopher', 'anvil', 'hailstone', 'elevator', 'cowboy_hat', 'safety_pin', 'flaming_tire'];
  // v1.0 meta-unlock emblems (Q5; content/logo.js after the starting twelve, GG.logo.emblems() lists them): lantern,
  // price_tag, handshake, globe_record. Not added here: this list is the starting set (sim_logo pins its order).
  C.LOGO_STYLES = ['metal', 'punk', 'rock', 'country'];   // spiky unreadable / cut-out ransom / chrome '80s / western slab (any genre may use any)
  C.LICENSE_CHOICES = ['take', 'decline', 'counter'];
  C.BARS_PER_SECTION = 4;        // each arrangement entry plays its one-bar pattern this many times
  C.HOTSPOTS = ['plan', 'kit', 'gigboard', 'laptop', 'merch', 'trophies', 'door'];
  C.SLOTS = ['auto', '1', '2', '3'];
  C.LABELS = ['gopherwood', 'monolith', 'diy'];      // indie, major, do-it-yourself (no 360 deals, ever)
  C.RELEASE_KINDS = ['ep', 'album'];                  // EP 4–5 songs (Local Heroes), album 8–10 (Signed / DIY)
  C.OUTLETS = ['rolling_scone', 'proclaim', 'pitchspork', 'deci_hell', 'tailgate_weekly'];
  C.CERT = { gold: 40000, platinum: 80000 };          // album units (Music Canada thresholds)
  C.SHOWDOWNS = ['botb', 'sameNight', 'stolenSlot', 'loonies', 'poach', 'festival', 'final'];   // v0.6 rivalry
  C.CRACKS = ['breakup', 'rebrand', 'opener'];        // how a beaten rival cracks
  C.LOONIES_WEEK = 20;
  // v0.6.1 (Addendum 1): two weeks per month; week 1 = early July. Seasons by month (C7).
  C.MONTHS = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];   // index = floor((week-1)/2)
  C.SEASONS = { winter: [11, 16], spring: [17, 22], summer: [23, 4], fall: [5, 10] };                 // week ranges (summer wraps)
  C.WEATHER = ['clear', 'rain', 'snow', 'blizzard', 'heat', 'hail'];                                  // never cancels a gig
  C.CAREER_DIFFICULTY = ['chill', 'normal', 'brutal'];                                               // locked per career
  C.GIG_DIFFICULTY = ['easy', 'normal', 'hard', 'expert'];
  C.FAN_TYPES = ['super', 'casual', 'hater'];                                                        // shares of the one fan count
  C.MIX_BUSES = ['drums', 'band', 'crowd', 'sfx'];                                // Loonie Awards, once a year (late winter)
  C.LOONIE_CATEGORIES = ['breakthrough', 'album', 'single', 'live', 'fan_choice', 'worst_van'];
  C.JUDGEMENTS = ['perfect', 'good', 'miss'];
  C.CROWD_LEVELS = ['hostile', 'bored', 'warm', 'hyped', 'wild'];   // crowd meter 0..100 bands
  C.MOMENTS = ['mosh', 'lighters', 'boo', 'drinks', 'wallOfDeath', 'circlePit', 'lineDance', 'capeSpin', 'solo',
    // v0.9 genre moments (combo / chorus per genre, see plan_contract_0.9 §4.4) + band signature actions
    'pogo', 'fistPump', 'clapAlong', 'headbang', 'gangShout', 'singAlong', 'yeehaw', 'stageDive', 'kneeSlide', 'hatTip'];
  C.RIVAL_ACTIONS = ['kickflip'];   // v0.9: Mall Rats' sponsor-mandated kickflip, once per rival set
  C.VENUE_KINDS = ['house', 'legion', 'bingo', 'openmic', 'church', 'curling', 'skatepark', 'bar', 'club'];
  C.HAIR_STYLES = ['short', 'long', 'mohawk', 'bald', 'bun', 'mullet', 'spiky', 'cap'];
  C.LOOK_EXTRAS = ['sunglasses', 'beard', 'moustache', 'glasses', 'headband', 'tattoos', 'hat', 'bandana', 'toque', 'bighat'];
  C.IDLES = ['mirror', 'noodle', 'lunch', 'corner', 'pace', 'phone', 'fiddle'];
  C.GEAR = ['v', 'bass', 'sg', 'strat', 'tele', 'acoustic', 'fiddle'];   // v0.9 MEMBER.gear (none = mic only)
  // v0.9: role aliases usable as card.speaker / chat.who / mood|skill|member effect keys (resolve at draw time).
  C.ROLE_ALIASES = ['@front', '@soloist', '@filler', '@bassist', '@namer', '@grumbler', '@deadpan', '@driver', '@any',
    '@drummer'];   // v1.1: the swapped drummer (null on the drum seat, so a '@drummer' speaker only draws in string careers)
  // v0.9: the four tier-0 rooms (band.space -> render room kind).
  C.SPACE_KINDS = { parents_garage: 'garage', laundromat_basement: 'laundromat', strip_mall_unit: 'stripmall', quonset: 'quonset' };
  // v0.9 fillText tokens (career.fillText; fallbacks in plan_contract_0.9 §4.2). Existing: {player} {band} {city} {rival}
  // {recruit} {name:id} {nick:id} ({name:<castId>} also resolves rival cast members). Fallbacks: {rival} 'the other band',
  // {city} state.city, {bassist}/{filler} 'the bassist', {front} 'the singer', {driver} 'you'.
  C.TOKENS = ['front', 'soloist', 'filler', 'bassist', 'namer', 'grumbler', 'deadpan', 'driver', 'van', 'space', 'spaceName',
    'door', 'province', 'homeVenue', 'superfan', 'rivalFront',
    // v1.0 seat-aware tokens (handoff E12): {instrument} = the player's instrument ('drums'), {drummer} = who plays the kit
    // ('you'). v1.1 "Seats" fills them per seat (state.seat); the drum seat reads exactly as v1.0.
    'instrument', 'drummer',
    // v1.1 "Seats" (plan_contract_1.1 §4.3): {gear} {sticks} {yourPart} {seat}; values per seat in C.SEAT_TOKENS.
    'gear', 'sticks', 'yourPart', 'seat'];
  // v1.1 "Seats" (handoff Part E; plan/plan_contract_1.1.md §4). The player's seat is fixed for the career (state.seat).
  C.SEATS = ['drums', 'bass', 'rhythm', 'lead'];
  C.SEAT_MAX_LANES = { drums: 6, bass: 5, rhythm: 6, lead: 6 };   // owner S2; every seat starts on 4 lanes
  // Timeline event kinds (GG.audio.timeline, confirmed against 30_audio at stage 0) that make each seat's part. A string
  // seat's chart = these events; the backing mutes them (opts.mute) and your taps play them. 'gtr' is ONE event for both
  // double-tracked guitars (no L/R tag: side 0 = L, side 1 = R inside the voice), so metal/punk rhythm and lead share it.
  // Rock's gtr2 rings only over choruses and clean is the ballad's arpeggio: Lane D writes the rock rhythm layer when
  // opts.seat === 'rhythm'. Country rhythm = 'clean' with ev.strum (the acoustic); country lead = 'twang' (Earl's Tele).
  C.SEAT_KINDS = {
    metal: { drums: ['drum'], bass: ['bass'], rhythm: ['gtr', 'gtr2'], lead: ['gtr', 'lead'] },
    punk: { drums: ['drum'], bass: ['bass'], rhythm: ['gtr'], lead: ['gtr', 'lead'] },
    rock: { drums: ['drum'], bass: ['bass'], rhythm: ['gtr2', 'clean'], lead: ['gtr', 'lead'] },
    country: { drums: ['drum'], bass: ['bass'], rhythm: ['clean'], lead: ['twang'] }
  };
  // Seat token values ({drummer} is computed: 'you' on drums, else the swapped drummer's name). Drums = v1.0 exactly.
  C.SEAT_TOKENS = {
    drums: { instrument: 'drums', gear: 'kit', sticks: 'sticks', yourPart: 'the beat', seat: 'drums' },
    bass: { instrument: 'bass', gear: 'bass rig', sticks: 'picks', yourPart: 'the bass line', seat: 'bass' },
    rhythm: { instrument: 'guitar', gear: 'rig', sticks: 'picks', yourPart: 'the riff', seat: 'rhythm guitar' },
    lead: { instrument: 'guitar', gear: 'rig', sticks: 'picks', yourPart: 'the lead', seat: 'lead guitar' }
  };
  // The creator's "your gear" tab for string seats (E14: 3–4 body shapes per seat; add, don't shrink). Ids only; names are
  // content (Lane A), models Lane C. GEAR_LOOK = { shape: C.GEAR_SHAPES[seat] id | null (null = the seat's first shape,
  // country rhythm: 'acoustic'), color: '#rrggbb' | null (null = the kit colour), guard: C.GEAR_GUARDS, sticker: 'none'|'logo' }.
  C.GEAR_SHAPES = { bass: ['plank', 'offset', 'arrow', 'violin'], rhythm: ['double_cut', 'single_cut', 'offset', 'acoustic'],
    lead: ['vee', 'pointy', 'double_cut', 'single_cut'] };
  C.GEAR_GUARDS = ['white', 'black', 'tortoise', 'none'];
  C.GEAR_LOOK = { shape: null, color: null, guard: 'white', sticker: 'none' };   // the default (save migrate + newCareer)
  // v1.0 "Glory" endings (plan_contract_1.0 §4.1–4.2; content in src/content/endings.js, sim in 2f_sim_legacy.js).
  C.LEGACY_PARTS = ['fans', 'units', 'awards', 'venue', 'regions', 'unity', 'final'];   // the seven Legacy parts (0–1000 total)
  C.ENDING_TIERS = ['arena_legends', 'canadian_institution', 'cult_heroes', 'one_album_wonders', 'still_in_the_garage'];   // best first
  C.SPECIAL_ENDINGS = ['big_in_japan', 'moose_opera', 'big_in_berlin', 'mudstonbury_legends', 'outback_legends',
    'band_of_strangers', 'original_lineup', 'side_project'];   // stack on the tier; original_lineup = The Original Five / Four
  // ACH test kinds (§4.6) and lesson ids (§4.7): final as merged in v1.0 (equal to GG.achieve.KINDS / GG.lessons.LESSONS).
  C.ACH_KINDS = ['milestone', 'bannedInYear', 'releasedFr', 'originals', 'award', 'winterNoBreakdown', 'rivalLoonieStreak',
    'special', 'venuePlayed', 'songKickShare', 'flag', 'stat', 'final', 'bonus', 'tier', 'botbInYear', 'licensedBrand', 'crack',
    'returned', 'reviewBelow', 'studio', 'km', 'weatherGig', 'allBands', 'difficulty', 'careers', 'gongWon',
    'seatCareer', 'soloTooLong', 'allSeats'];   // v1.1 seat kinds (GG.achieve.SEAT_KINDS): seatCareer { seat }, soloTooLong { min?, by? }, allSeats
  C.ACH_WHEN = ['gig', 'week', 'year', 'end', 'meta', 'load'];
  C.LESSONS = ['w1_card', 'w1_walk', 'w1_plan', 'w1_write', 'w1_rehearse', 'w1_gig', 'w1_wrap', 'w2_board', 'w2_money', 'w3_chat',
    'w4_van', 'y1_good_year'];
  C.CAPE_VALUES = ['velvet', 'curtain', 'charred', 'fireproof', 'none'];   // state.flags.cape (render reads it)
  C.CARD_BOOKABLE = ['st_vlads_hall', 'bingo_palace', 'legion_63', 'warman_curling_lounge',   // venue ids cards may `book`
    'craigs_basement', 'mill_woods_basement_party', 'quonset_yard_party',   // v0.9 home first gigs
    'city_hall_steps', 'westgate_parking_lot', 'auction_mart_stage'];   // v0.9 card-only rooms (minFans 99999)
  C.SIM_FLAGS = ['parentsLoan', 'label'];   // label = label id | 'diy' (set by the labels sim)   // flags the sim sets that cards may gate on
  // Seasons by week of year (week 1 = early July): summer 1–6, fall 7–10, winter 11–18, spring 19–22, early summer 23–24.

  // Band-level numeric stats and their clamps. fund may dip below 0 only transiently:
  // endWeek() tops it back to 0 with a parents' loan.
  C.STATS = ['fund', 'fans', 'buzz', 'chemistry', 'burnout', 'drumSkill'];
  C.MEMBER_STATS = ['mood', 'skill'];
  C.RANGES = {
    fans: [0, 1e9], buzz: [0, 100], chemistry: [0, 100], burnout: [0, 100], drumSkill: [1, 100],
    mood: [0, 100], skill: [0, 100]
  };

  // Keys allowed in an effects object (cards, activities).
  //   fund, fans, buzz, chemistry, burnout, drumSkill : number deltas
  //   mood  : { <memberId>|'all': delta }            skill : { <memberId>|'all': delta }
  //   flags : { <flagName>: value }  (value true/false/string/number; false deletes)
  //   chain : { <chainId>: { step: <n>|'end', delay: <weeks, default 1> } }
  //   book  : <venueId>   books that venue for this weekend (replaces nothing if a gig is already booked)
  //   chat  : { who: <memberId|npcId>, text }        posts a group-chat message
  C.EFFECT_KEYS = ['fund', 'fans', 'buzz', 'chemistry', 'burnout', 'drumSkill', 'mood', 'skill', 'flags', 'chain', 'book', 'chat',
    'member', 'payCut', 'repay', 'production'];   // v0.5: production ±n on the recording session (studio event cards)   // v0.4: member { id|'recruit', act: settle|quit|return|later|rival }, payCut n, repay $

  // Keys allowed in a card gate. All present conditions must hold.
  //   era:[..] genre:[..] region:[..] band:[bandId..]
  //   minWeek/maxWeek (totalWeek), weekOfYear:[lo,hi], minYear/maxYear
  //   minFans/maxFans, minFund/maxFund, minBuzz/maxBuzz, minChemistry/maxChemistry
  //   flags:[names that must be truthy]  notFlags:[names that must be falsy]
  //   flagEquals:{ name: value }          gigBooked:true|false
  //   moodBelow:{ memberId: n }  moodAbove:{ memberId: n }
  C.GATE_KEYS = ['era', 'genre', 'region', 'band', 'minWeek', 'maxWeek', 'weekOfYear', 'minYear', 'maxYear',
    'minFans', 'maxFans', 'minFund', 'maxFund', 'minBuzz', 'maxBuzz', 'minChemistry', 'maxChemistry',
    'flags', 'notFlags', 'flagEquals', 'gigBooked', 'moodBelow', 'moodAbove', 'seat', 'swapped'];
  // v1.1 "Seats" gate keys, folded into GATE_KEYS at integration (sim_career's gate test covers both on a drum and a bass
  // career). C.SEAT_GATE_KEYS stays as the seat subset (content tests that concat it still pass):
  //   seat:[C.SEATS..] (the player's seat)  swapped: memberId | [memberIds] (that member is the swapped drummer AND on the
  //     kit right now: v1.1 review) | true (someone is the swapped drummer) |
  //     false (nobody: the drum seat). The drum seat never matches swapped: true / an id. Lines and cards may also carry
  //     seat / swapped at the top level (career.seatOk; cardOk and speakerOk(state, who, line) honour both).
  C.SEAT_GATE_KEYS = ['seat', 'swapped'];

  /* ======================================================================
   CAREER STATE (GG.state in the browser; plain JSON, saved as-is)
   {
     v: 2, createdVersion: '0.1.0.0', slot: '1',
     seed: <uint32>, rng: <uint32>,                 // rng = live RNG state (GG.rngFor(state))
     bandId: 'hail_damage', genre: 'metal', region: 'canada', city: 'Saskatoon', space: 'parents_garage',
     player: { name, nick, presetId, look: LOOK, kitColor: '#rrggbb' },
     totalWeek: 1, year: 1, week: 1, maxWeeks: 240, // week = week of year 1..24
     phase: 'monday'|'plan'|'week'|'wrap'|'ended',
     era: 'garage', protected: true,                 // garage era: nobody quits, nothing breaks
     eraHistory: [ { era, week } ],                  // v0.5: garage → local (250 fans) → signed (a deal or a DIY album) → world (v0.7)
     label: null | DEAL, labelOffers: [ OFFER ], session: null | SESSION, albums: [ ALBUM ], awards: [ AWARD ],
     trophies: [ { kind: 'gold'|'platinum'|'loonie'|'banned'|..., title, year } ],
     careerDifficulty: 'chill'|'normal'|'brutal', weather: { week, kind, temp }, fanTypes: { super, casual, hater } (0..1),
     bandbook: { posts: [ POST ], viral, scandals }, superfans: { <id>: { seen, mood } }, fanClub: null | { since, members,
     happiness, tier }, gifts: [ { id, week, from, text } ],   (v0.6.1; van gains driver)
     tour: { regions: { <id>: { unlocked, via, fans, gigs, tours, broken, big, rivalFirst, best } }, invites: [INVITE],
       active: TOUR|null, history, homesick 0..100, gongs, president, moose, queue, ... }   (v0.7; full doc in 25_sim_tour.js)
     v0.8 KIT (defaults filled by the v8→v9 migration):
     gear: { lanes 4..6, doubleKick, sections: ['outro'|'solo'] (owned extra sections), quality 0..3 (C.KIT_QUALITY), owned: [gearItemId] },
     spaceTier 0..3 (C.SPACE_TIERS; `space` keeps the id), spaceUpgrades: [upgradeId] (couch, egg-crate foam, beer fridge, lights, …),
     van (+ tier 0..3 (C.VAN_TIERS), baseName (preset per band per tier), name (renamable), stickers: [ { venueId, name, week, banned } ],
       upgrades: [vanUpgradeId]),
     merch: { unlocked: [merchId], stock: { <merchId>: units at home }, price: { <merchId>: $ }, sold: { <merchId>: n }, earned,
       misprint: null | { merchId, week, status: 'boxed'|'collector' } }   (unsold stock at home = the visible box pile),
     player: { …, look: LOOK (everyday), stageLook: LOOK (auto for gigs / red carpet / stage scenes), kit: KIT_LOOK },
     v0.8.1 ADDENDUM 2 (each module fills its own fields when missing, chained onto GG.save.migrate; SAVE_SCHEMA 10):
     logo: { emblem: C.LOGO_EMBLEMS, style: C.LOGO_STYLES, palette: paletteId } (D2; default per band from content/logo.js),
     licensing: { offers: [ LICENSE_OFFER ], deals: [ { brandId, songId, fee, week, countered } ], declined, lastOfferWeek } (D1),
     SONG.ad: null | { brandId, week } ("in a commercial": staleness bump), recaps: [ RECAP ] (D3, compact, one per year).
   LICENSE_OFFER = { id, brandId, songId, fee, week, expires (totalWeek), countered: bool, status: 'open'|'taken'|'declined'|'withdrawn'|'expired' }
   RECAP = { y, fundIn, fundOut, fans (gained), best: { venueId, name, grade, quote } | null, worst: same | null, songs, albums,
     awards: [ short text ], quit: [memberId], back: [memberId], rival: { rank, delta } | null, regions: [regionId],
     headline: text, photo: null } (small numbers + short strings only: the save code stays small)
     unlocks: { creator: [partId], news: [partId] (not yet announced) }   (grown by the career; carry-over within a genre via
       GG.creator, localStorage 'gg.v1.unlocks.<genre>'). Part ids are '<cat>.<value>' (content/creator.js).
     v0.8 also: merch.spent, merch.last (last gig's sales), merch.shirtsOrdered, misprint.status 'pending' + units;
       rentLate (weeks behind on rent), milestones.firstMove. GIG_RESULT.merch { sold, earned, boxes, space, items, named };
       WRAP.shop { rent, unlocks, misprint, perks, evicted, rentLate }; WRAP.creator (new looks). Content: GG.content.shop,
       GG.content.shopCards (forced only; effects may carry a `shop` key), GG.content.creator. Events: shop:buy|unlock|move|
       rename|sticker|misprint|merch, creator:unlocked|changed (payloads in 2a_sim_shop.js / 2b_sim_creator.js headers).
     rival: RIVAL, showdowns: [ SHOWDOWN ], finalShowdown: null | { week, won, headliner: 'you'|'rival', score, rivalScore },
     fund, fans, buzz, chemistry, burnout, drumSkill, debtToParents,
     payCut: 0.3 (share of gig pay to members, 0..0.6), fillIns: { <role>: { name, costPerGig } },
     recruitAd: null | { role, candidates: [RECRUIT], posts, week }, rivalDefectors: [memberId],   (v0.4)
     (v0.4 also) card.who/whoName; chat[].tone 'grumble'|'pa'|'news'; member stageWeek, ultimatum, gripe, changed, returns,
     recruit.stars/chemistry, exit.beat; fillIns[role].look; stats quits/returns/recruits/ultimatums; milestone localHeroes.
     WRAP gains warnings, drama, protectionEnded, members[].stage; GIG_RESULT gains cut, fillInCost.
     Tokens {recruit} (+ {who} {gripe} in drama.stageText); card speaker/mood key 'recruit'.
     Content: drama, dramaCards, recruits; economy.drama tunables. API: GG.drama.* (27_sim_drama.js header), career.postChat(…, tone).
     members: [ { id, name, nick, role, skill, mood, status: 'active'|'away'|'quit', original: true,
                  stage: 0..4 (0 fine, 1 grumbling, 2 passive-aggressive, 3 ultimatum, 4 quit), want,
                  exit: null | { storyline, since, returnDue }, recruit?: { trait, quirk, hometown, askingCut }, look? } ],
     songs:   [ SONG ],  pendingSongs: [ PATTERN+title ] (composed in the UI, consumed by Write blocks),
     draft:   null | PATTERN (the kit's scratch pad),
     liveGig: null | LIVE_GIG (a gig in progress; saved between songs),  listings: [GIG] (this week's gig board),
     venueRep: { <venueId>: -3..3 }, venueLast: { <venueId>: totalWeek }, banned: [venueId] (photos on the trophy wall),
     van: VAN (+ trips, breakdowns), listingsWeek, bookPick: listingId|'skip'|null, trip: null | current road trip,  gear: { lanes: 4, doubleKick: false } (v0.8 unlocks more),
     card:    null | { id, resolved: false } | { id, resolved: true, choice, outcome, deltas },
     plan:    [activityId|null, activityId|null, activityId|null],
     gig:     null | GIG,   offer: null | GIG,        // booked gig for this weekend / pending offer
     lastGig: null | GIG_RESULT, lastWeek: null | WEEK_RESULT, wrap: null | WRAP,
     chains: { <chainId>: { step: n|'end', due: totalWeek } },
     flags:  { <name>: value },  seenCards: { <cardId>: totalWeekSeen },
     chat:    [ { week: totalWeek, who, text } ]        // newest last, capped at 60
     history: [ { w: totalWeek, fund, fans, buzz, chemistry } ],
     stats:   { gigs, songsWritten, hustles, cards, earned, bestGrade, parentsLoans },
     quiet: null | text,                              // this Monday's quiet-week line (no card)
     milestones: { <key>: totalWeek }, weekStart: {stat snapshot for the wrap}, yearStart: {stat snapshot},
     ended: false
   }
   LOOK = { skin:'#rrggbb', hair:'#rrggbb', hairStyle:'short'|'long'|'mohawk'|'bald'|'bun'|'mullet'|'spiky'|'cap',
            shirt:'#rrggbb', pants:'#rrggbb', height: 0.9..1.1, build: 0.9..1.2,
            extras: ['sunglasses'|'beard'|'moustache'|'glasses'|'headband'|'tattoos'|'hat'|'bandana'] }
   LOOK v0.8 adds (all optional; every old LOOK stays valid and renders the same): age 'fresh'|'lived'|'grizzled',
     face: { shape, eyes, eyeColor, brows, nose, mouth }, facialHair, glasses, hairStyle (+ the Part C2 list), top, bottom, shoes,
     headwear, outfit (stage), tattoos: [ { spot, design } ], knuckles: { left: 'ABCD', right: 'EFGH' } (A–Z only), piercings: [id].
     stageExtras: ['cape'|'wristbands'|'corpsepaint'] (stage looks only; everyday looks carry no outfit/stageExtras);
     a tattoo at spot 'teardrop' has design 'tear'. Part ids + unlock gates live in content/creator.js. Never a gong.
   KIT_LOOK = { shell: 'wood'|'black'|'sparkle'|'flames'|'camo', color: '#rrggbb', hardware: 'chrome'|'black',
     head: 'logo'|'face'|'moose'|'text'|'plain', headText, throne: 'crate'|'stool'|'leather'|'bucket'|'haybale', sticks: '#rrggbb',
     extras: ['cowbell'|'fan'|'pyro'] }  (shell 'paint' = the old plain colour, used for migrated saves)
     (player.kitColor stays as the legacy colour = KIT_LOOK.color; pyro is arena-only. NO GONG, ever.)
   PATTERN = { bpm, lanes: 4, sections: { verse: [laneStr x lanes], chorus: [...], bridge: [...] }, arrangement: ['verse','chorus',...] }
             laneStr = 16 chars, 'x' = hit, '.' = rest (index = step, top to bottom). Lane order = C.LANES.
   SONG = { id, title, titleEn, written, pattern: PATTERN, rating: { groove, hook, difficulty }, quality, polish,
            plays, lastPlayed, stale 0..100, hits, classic: bool, auto: bool (band jammed it, not you) }
   OFFER   = { labelId, advance, royalty (band share of each unit's $), albums, deadlineWeeks, demands: [kind], expires }
   DEAL    = { labelId, signed, advance, recouped, royalty, albumsOwed, albumsDelivered, deadline (totalWeek), demands:
               [ { kind, text, due } ], dropped: false }   — advances are recoupable; miss deadlines or flop → dropped
   SESSION = { kind, studioId, producerId, weeksTotal, weeksDone, tracks: [songId], takes: { songId: 0..100 },
               events: [ text ], cost, production 0..100 }   — studio weeks replace the planner's blocks
   ALBUM   = { id, kind, title, cover: { seed, palette, motif, font }, tracks: [songId], single, studioId, producerId,
               production, released (totalWeek), promo, label, reviews: [ { outlet, score, quote } ],
               chart: { debut, peak, weeks, pos }, sales, streams, cert: null|'gold'|'platinum', earned }
   RIVAL   = { id: 'tundra_wraith', fans, buzz, era, heat 0..100, wins, losses, members: [ { id, name, nick, role, look,
               defector? } ], albums: [ { title, released, peak, sales } ], cracked: null|C.CRACKS, news: [ { week, text } ] }
   SHOWDOWN = { week, kind: C.SHOWDOWNS, venueId?, won: bool, you, them (scores), prize, fansSwing, heatDelta }
   AWARD   = { year, category, nominated: bool, won: bool, against: [ names ] }
   Content (v0.5): labels, studios, producers, reviews { scoreBands, outlets }, awards, albumWords, studioEvents (card
   schema + gate keys studio/producer + effect key production). Tokens {album} {single} (reviews), {category} (awards),
   {adj} {noun} {place} (title forms). Card-set flags: demandEnglish/Radio/Image/Feature/Showcase, loonieOutfit,
   babaManager, wraithFeud, moosePlan, mooseCall, mooseAlbum ('shelved'|'song'|'ready'|'finland' → v0.7 payoff).
   VAN  = { id: 'van' (pre-v0.9 saves: 'moose_hearse'), name (v0.9: shop.vanName(bandId, tier)), condition 0..100, space, comfort, km }
   LIVE_GIG = { gig: GIG, setlist: [songId], index (next song to play), songs: [SONG_RESULT], crowd 0..100, started, attendance }
   GIG (v0.3 adds) id, km, catch, minFans, fit, setSize, repLevel, rebook, clash, opening
   GIG_RESULT (live, v0.3 adds) live, tier, kind, accuracy, perfect, good, miss, maxCombo, songResults, moments, setBonus,
     shaped, km, opening, rep (delta), repAfter, banned, travel
   SONG_RESULT (v0.3 adds) crowdAvg, notes, flubs, extras, extrasHit, stray, cheer, stale
   SONG_RESULT = { songId, title, score, accuracy, perfect, good, miss, maxCombo, crowdEnd, fills, moments:[kind] }
   GIG  = { venueId, name, city, tier, kind, capacity, deal, pay, gas, quirk, source: 'forced'|'book'|'offer'|'card' }
   GIG_RESULT = { venueId, name, city, deal, crowd, capacity, score, grade, pay, gas, fans, buzz,
                  songs:[titles], songIds, source, deltas, reactions:[{ who, text }], lines:[text] }
   WEEK_RESULT = { blocks: [ { activity, lines:[text], deltas } ], gig: GIG_RESULT|null }
   WRAP = { totalWeek, year, week,                    // the week that just ended
            deltas: { fund, fans, buzz, chemistry, burnout, drumSkill },
            upkeep, buzzDecay, parentsLoan, guilt: text|null,
            members: [ { id, name, mood, moodDelta, skill, label } ],
            chat: [ newly posted messages ], milestones: [text], yearEnd: bool, yearSummary: null|{...}, ended: bool }
  ====================================================================== */

  /* ======================================================================
   CONTENT SCHEMAS (src/content/*.js, attach to GG.content)
   bands:  { <bandId>: { id, name, genre, city, region, space, spaceName, size, rival, locked, comingIn,
                         (v0.9) roles: { namer, grumbler, deadpan }, firstGig, homeRing, spaceShort, door, province,
                         coldOpenFx: 'hail'|'snow'|'neon'|'dust', throne,
                         blurb, coldOpen: [panel text..], starterSongs: [ { title, titleEn } ],
                         members: [ { id, name, fullName, nick, role, hometown, skill, mood, wants, bio, idle, look: LOOK } ] } }
           MEMBER (v0.9) + gear (C.GEAR), silent, cape, signature { action, combo, crowd, flag?, perSong? }; look.top.
   v0.9 content keying (plan_contract_0.9 §4.1): flat pools neutral + tokenised, band extras in <file>.byBand[bandId];
     member-keyed pools by member id; card variants '<baseId>_<bandId>' / '_<rivalId>' (career.variant); rivalry.cast[rid]
     (members, news, showdowns, banter, ui, carpet, defector, comments, songs, albums, rebrands, label, vehicle, drummer?,
     furyBrand?); per-band packs src/content/zz_band_<bandId>.js load after the base content files.
     Pools may carry byBand at any level of the path and an optional byGenre layer (career.pool strips both keys).
     card.cameo:true  = a Q8 cameo card that may voice another band's member (bypasses career.cardOk).
     v0.9 card-set flags (packs): council, councilPlan, councilDebate, councilOdds, councilResult, roxDive, squatPlan, squatCall,
       squatAnthem, squatAnthemPayoff (Frost Heave); riff ('settled'|'scrapped'|'original'), riffOriginal, riffPlan, riffCourt,
       mudPlan, mudRex, mudHeadline, mudstonbury ('declined'|'gaveback'|'headlined'), mudHeadlinePayoff (set by the package
       payoff) (Gravel Kings); truckStory, truckPlan,
       truckDrive, truckAd, truckWar, outback, outbackPlan, outbackCall, outbackPayoff, hatInsured (Ramblers); shared: rivalFeud
       (was wraithFeud), greyMug, costume, loonieOutfit, demandClearance (demand kind 'clearance': economy.labels.demandFx.clearance).
     npcs[id].band:[bandIds] / .rival:rivalId scope an npc; .frontman:true marks a rival's poster (GG.rival.frontSpeaker).
     rivalry.cast[rid] also: openingSlot:[text], commentsExclusive, actions, style, furyBrand (economy.rival.byRival
       overrides the fair-fight numbers: curve, buzz, eras, chartBias, legacy, style, actions, furyBrand).
     tour package.needs:{ flag, is?, band? }, needsText?, payoff:{ venue? (a stop's venue id: the payoff gig), city?, flag?, value?,
       trophy?, trophyKind?, line?, chat?, card?, fans?, buzz?, head?, sub?, text?, quip? } (bus 'tour:payoff' { packageId, flag,
       venueId }); the Gong counts a fired payoff or any economy.tour.payoffFlags { flag: true | value | [values] } (defaults:
       mooseOpera 'platinum', squatAnthemPayoff, mudstonbury 'headlined', mudHeadlinePayoff, outbackPayoff); world.cityLines[cityId].
     calendar: byBand[b].holidayLines[holidayId], holiday.byBand[b].news, holiday.gig.byBand[b].lines.
     bandbook items: gate or band:[bandIds] (fans.pool filters). shop.spaces[tier].byCity (city name or id);
       shop.upgrades[id].bySpace (shop.upgradeView). band.weather { kind, crowd, lines }; member.frTitles.
     economy.world.homeRooms { min, tier, minFans }. recap.goodYear: [..] (+ byBand) or { bandId: [..] }.
     UI-read keys (all optional): lines.byBand[b].{ countIn, empty{chat,catalog}, noSolo, exposure, recruitAd, banter },
       lines.moments[kind].label, lines.banter[memberId|any], lines.labelReact, lines.reviewReact, awards.carpet[bandId],
       awards.outfitCards, world.gongCarpet[bandId], rivalry.cast[rid].ui/banter/faceStyle/carpet.intro/defector.line,
       drivers[id].{ dock, load, boardLine, shades? } (dock / load: the van lines when that member drives; shades: the render's
       sunglasses, Kenji's by default). drivers.you.takeOver (neutral) + drivers.you.byBand[bandId].takeOver (world.takeOverLine).
     awards.win / lose [text] + awards.byBand[bandId].{ win, lose }: a band line after each Loonie envelope (runLoonies /
       openEnvelope result.bandLine; a line naming a member who isn't active is skipped). awards.outfits += 'leather',
       'courtsuit', 'chain', 'sash', 'jacket' (the carpet falls back to the stage look for ids it has no model for).
     rivalry.cast[rid].drummer: a member id (Steve #5) or a hired object { id, hired: true, name, look?, stageShirt? } that is
       NOT in members (Buckle & Boot's session guy: 59d seats him, render info().session). Cast member flags: skate (the
       Mall Rats' board), scarf (Rex), role:'mascot' | mascot:true (the Buckle & Boot truck); cast.mascot, cast.faceStyle
       ('corpse'|'cap'|'scarf'|'hat'|'plain'), cast.legacy (Chartbusters' fame text).
     bandbook.homeSuperfan[bandId] = { name, short, from, icon, blurb, gigLines[], gigLinesFar?[], comments[], gift } (the
       'dale' state slot); bandbook.byBand[bandId].club.{ payoutChat, grumbleChat } (fans.pool).
           idle = 'mirror'|'noodle'|'lunch'|'corner'|'pace'|'phone'|'fiddle'  (garage idle animation)
   v1.0 "Glory" content: endings (src/content/endings.js: tiers, specials, epilogues, recruits, player, rival, bonusCards,
     legacy tunables), achievements (src/content/achievements.js: [ ACH ]), tutorial (src/content/tutorial.js: [ LESSON ]);
     shapes in the V1.0 GLORY block below.
   rivals: { <rivalId>: { id, name, city, genre, blurb } }
   npcs:   { <npcId>: { id, name, blurb } }   (mom, dad, baba, neighbour, radio DJ, ...)
   cards:  [ CARD ]
     CARD = { id, type, speaker, title, text, gate, weight=1, once=true, cooldown=0,
              chain?: chainId, step?: n, forceWeek?: totalWeek,
              choices: [ { label, hint?, effects?, outcome, roll?: { chance, stat?, statScale?,
                           success: { effects, outcome }, fail: { effects, outcome } } } ]  (2–3 choices) }
   activities: { <activityId>: { id, name, icon, blurb, ...numbers } }        (owned by the sim)
   economy: { startFund, startFans, startBuzz, weeklyUpkeep, buzzDecay, quietWeekChance, ... } (owned by the sim)
   venues: [ { id, name, city, region, tier, kind, capacity, deal, pay, minFans, genreFit:{metal..}, quirk, walkIns, gas, setSize } ]
           (v0.9) reach? (road km): a neighbourhood room only books bands based within that many km (world.inReach;
           board, offers, opening slots, Battle of the Bands); economy.bot.freeFixBelow (60): bots take a free van fix below it
   lines:  { activity: { <activityId>: [text] }, chat: { <memberId>: { happy:[], ok:[], grumpy:[] } },
             gigReactions: { <memberId>: { great:[], ok:[], bad:[] } }, tap: { <memberId>: [text] },
             guilt: [text], yearEnd: [text], quietWeek: [text] }
   songTitles: { metal: [ { fr, en } ], punk|rock|country: [ 'English title' ] }
   genres: { <genre>: { tempo:[min,max,default], signature, backing, ... } }  (shape documented in content/genres.js)
   lines.songReactions / lines.writeTips (per member) — band reactions to a new song / first-Write tips
   presets: [ { id, name, blurb, look: LOOK, kitColor } ]
   Text may use tokens: {player} {band} {city} {nick:<memberId>} {name:<memberId>} — GG.career.fillText() replaces them.
  ====================================================================== */

  /* ======================================================================
   V1.0 GLORY (plan/plan_contract_1.0.md §4; SAVE_SCHEMA stays 10: GG.save.migrate fills these when missing, no events)
   New state fields (stage 0 migrate defaults; new careers start with the same values):
     bonusYears: 0 | 2 | 3                  (GG.legacy.weekly; maxWeeks follows: 240 + 24 x bonusYears)
     legacyTrack: { bigHead: null | { id, name, cap, week, est? } }   biggest venue HEADLINED (GG.legacy.gig; est = migrated guess)
     legacy: null | LEGACY                  (GG.legacy.finish at the career's end, idempotent)
     ach: { got: { <achId>: totalWeek }, t: { bans, botb, km, winter, streak } }   per-career achievements + counters (2g)
     tutorial: { on: bool, done: { <lessonId>: totalWeek }, past4: bool }   (old saves: on false, past4 = totalWeek >= 4)
     No state.seat in v1.0: code reads (state.seat || 'drums') (v1.1 "Seats" adds the field).
   LEGACY = { v: 1, score 0..1000, parts: { <C.LEGACY_PARTS>: points }, raw: { fans, units, loonies, gongs, certs,
     venue: { id, name, cap, est? } | null, broken: [regionId], chem, originals: { start, kept, everQuit }, final: 'you'|'rival'|null },
     tier: C.ENDING_TIERS, specials: [C.SPECIAL_ENDINGS], epilogues: [ EPILOGUE ], years, bonusYears, difficulty, seat, week }
   EPILOGUE = { kind: 'member'|'gone'|'defector'|'recruit'|'player'|'rival', id, name, text, silent?: true }
     endings.epilogues[memberId] = [ { when: WHEN, text } ] (first match wins; fallback drama.members[id].epilogue)
     WHEN = { flag?, values?, notValues?, minTier?, special?, status?, inLineup?, minYearsIn?, seatRole? } (all given must hold;
     seatRole matches member.seatRole || member.role); endings.player = { drums: { <tierId>: text } } (missing seat → drums)
   HOF_ENTRY = { id: careerId, at, ver, bandId, band, genre, city, seat: 'drums', player: { name, nick },
     logo: { emblem, style, palette }, difficulty, years, bonusYears, score, parts, tier, specials: [id],
     lineup: [ { id, name, original, status } ], rival: { id, name }, final: 'you'|'rival'|null,
     stats: { fans, units, loonies, gongs, certs, gigs, songs, albums, loans, venue: { name, cap } | null, broken },
     ach: [achId], strip: [ { y, h, fans, era, best, aw } ] }   (GG.legacy.hofEntry builds it without at/ver; 12_meta stamps them)
   HOF (localStorage gg.v1.hof) = { v: 1, entries: [ HOF_ENTRY ] }   newest first; cap 40, the top 10 by score never dropped
   META (localStorage gg.v1.meta) = { v: 1, scanned: '<VERSION>' | null,
     careers: { started, past4, finished, byBand: { <bandId>: n }, bySeat: { drums: n }, best: { score, careerId } | null },
     lessons: { <lessonId>: 1 }, ach: { <achId>: { at: 'YYYY-MM-DD', band, y } },
     unlocks: { palettes: [id], emblems: [id], parts: [id] }, seen: { <careerId>: 1 } }   (seen capped at 200)
   careerId(state) = seed.toString(36) + '.' + bandId (+ '.' + hashSeed(player.name + createdVersion + history[0]) when seed === 1)
   Save codes (10_save): toCode(state) carries `_meta: GG.meta.exportLite()` when GG.meta.enabled (the state is never mutated);
     readCode(text) -> { state | null, meta | null } (`_meta` comes off before migrate; a { v: 1, metaOnly: true, _meta } body
     -> state null); metaCode() -> 'GG1:' code of { v: 1, metaOnly: true, _meta: GG.meta.exportFull() }.
   ACH = { id, name, blurb, icon (emoji), band?: [bandId], seat?: [seat], when: C.ACH_WHEN, test: { kind: C.ACH_KINDS, … },
     nameBySize?: { 4: '…', 5: '…' }, hidden?: false }   (any drum vocabulary → seat: ['drums'])
   LESSON = { id: C.LESSONS, title, band?: [bandId], seat?: [seat], when: { maxWeek?, week?, screen?, tab?, first?: true },
     steps: [ STEP ], byBand?: { <bandId>: { steps } } }
   STEP = { who: '@front'|'@deadpan'|'@grumbler'|'@driver'|'@any'|memberId, text (tokens incl. {instrument} {drummer}),
     seat?: [seat], point?: { hotspot } | { testid } | { member: alias }, advance: 'next' | { event, id? } | { hotspot } }
   WRAP gains legacy (LEGACY, the career's last wrap only). Modules: GG.legacy (2f), GG.meta (12), GG.achieve (2g),
     GG.lessons (2h), GG.tutorial (5p); GG.rival.finalAt(state) -> { year, week } (the Sad Dome in the career's last year).
  ====================================================================== */
  // As merged (v1.0 lanes E/M/T/P):
  // ENDINGS (2f, Lane E): GG.legacy = { noBonus, careerId, ensure, migrate, gig, worldWeek, bonusFor, finalYear, yearsText,
  //   deck, weekly, raw, parts, score, tierDef, tier, tierRank, TESTS, specialOk, specials, whenOk, epilogues, compute, finish,
  //   text, hofEntry }. deck(state) appends content.endings.bonusCards to the Monday deck at runtime (on the grant, later wraps
  //   and career:loaded of a bonus save; years 1–10 untouched, so NO_BONUS runs replay exactly). WRAP.bonus = { years, maxWeeks,
  //   line } on the grant week. LEGACY.raw also carries greyMug, rivalOriginals. Old saves (createdVersion < 1.0) get the
  //   biggest-venue estimate inside compute() (venue.est: true), not from migrate (legacyTrack.bigHead stays null).
  //   Tunables in content/endings.js legacy (fans full 100k, units full 800k). UI: 'end:step' { step, index, of } (5n);
  //   GG.ui.endGo(step), ui.rivalEnd(st, opts). Tiers carry unlock palette ids; specials carry emblems / palettes.
  // META (12 + 2g, Lane M): state.ach.t = { bans: { <year>: n }, botb: { <year>: n }, botbLast, km,
  //   winter: { y, away, bd, closed } | null, streak: { y, n, best } | null }. HOF_ENTRY may also carry
  //   unlocks: { palettes, emblems, parts } and mach: [achId] (both left out of exportLite). 'meta:unlock' fires once per kind;
  //   recordCareer's unlocks items carry fresh, its ach = the meta achievements this career earned; award(state, ids, opts)
  //   takes { silent }. GG.achieve = { defs, def, gated, name, ensure, migrate, originals, kickShare, KINDS, kindInfo, test,
  //   check, gig, weekly, finish, metaIds, view, list, earned }. UI: ui.trophiesPanel, ui.achToast (box of 3, pointer-events
  //   none), screens 'hof' / 'hof-entry', code sheet mode 'hof'; GG.logo.pickEmblems / pickPalettes / isMeta,
  //   GG.creator.metaPart. Debugs: achieve, trophies, hof.
  // TUTORIAL (2h + 5p, Lane T): GG.lessons = { LESSONS, def, ensure, on, done, mark, stop, available, steps, matches, due };
  //   due(state, ctx) takes ctx.totalWeek. LESSON may also carry garage: true, mark: true, when.minWeek / when.mode; STEP
  //   point.testid may be an array (the first found on screen is used). GG.tutorial = { enabled (off under automation unless
  //   ?tut=1), running, active, start, replay, check, skip, offerSkip, openLessons, suppressWriteTip, debug }. 'tut:step' /
  //   'tut:done' may carry replay; 'tut:done' may carry skipped.
  // PERF (40 + 30 + 11, Lane P): P.GRAPHICS = ['auto', 'low', 'med', 'high'] (unknown values normalize to 'auto';
  //   DEFAULT_SETTINGS.graphics = 'auto'). GG.render: invalidate(n), nextRatio(cur, p95, heldMs) (pure), RATIO_STEPS,
  //   feedFrames(ms[]) (tests only), perfState(); util.freeze/thaw and ctx.freeze; scene factories may return busy().
  //   'perf:quality' reason: 'slow' | 'fast' | 'settings'. GG.debug('perf') = { mode, cap, ticks, rendered, pixelRatio,
  //   autoRatio, want, quality, covered, p95, applied, shaderChecks, voices, drops, tapDrops, voiceCap }. Behind a tall sheet
  //   the 3D runs at 10 fps once the camera glide ends. GG.audio: VOICES (global cap 32), voicePlan(active, req), voiceStats(),
  //   prerender(), prerenderHit(o), prewarm(), renderOffline({ lane, pre, cap }); GG.debug('audio') adds global, prerender,
  //   crowdRaw. Voice-cap priority: band notes are never dropped; crowd one-shots go first.

  /* ======================================================================
   V1.1 SEATS (plan/plan_contract_1.1.md §4; handoff Part E; SAVE_SCHEMA stays 10: GG.save.migrate fills these when
   missing, no events; GG.career.newCareer starts with the same values, args.seat default 'drums')
     seat: C.SEATS                          the player's seat, fixed for the career (old saves: 'drums')
     members[i].seatRole: string            the member's stage role this career: 'drums' | 'drums/vocals' for the swapped
                                            member (a singer keeps singing from the kit; v1.1 review: a drummer recruit
                                            hired for a singing swapped member's hole sings too: 'drums/vocals'), else the content role. Content
                                            `role` stays the source of truth for everything else (wants, quits, recruits).
     gear.seatLanes: { bass: 4..5, rhythm: 4..6, lead: 4..6 }   gear.runs: { bass, rhythm, lead }: bool (the seat's run gear)
       STRING SEATS ONLY: a drum-seat career keeps v1.0's exact gear object (the regression baseline; four v1.0 tests
       deep-compare it), so readers use GG.career.seatLanes(state) / seatRuns(state) (drums: gear.lanes / gear.doubleKick).
       A seat's lane-5/6/run purchase also grows the band's kit (gear.lanes / owned / doubleKick), plan_contract_1.1 §4.6.
     player.gearLook: GEAR_LOOK (C.GEAR_LOOK default; drums keep player.kit)
     flags.bassArc 'legend'|'secret'|'quiet' · rhythmArc 'credited'|'unsung'|'engine' · leadArc 'guitarHero'|'bandFirst'|'soloAlbum'
     SONG.pattern.part?: PART (string seats only; drum-seat songs never have one)
   PART = { seat: 'bass'|'rhythm'|'lead', sections: { <section>: { prog?: int (backing.progressions[section] index; bass,
     rhythm), hook?: int (backing.hooks index; lead), rows: [16-char 'x'/'.' rows: bass 3 (root, fifth, octave), rhythm 2
     (chug, open), lead 5 (hook scale degrees low -> high)] } } }   songs.sanitize keeps it (rows clipped/padded, indexes
     clamped); a section without one is generated (songs.part.suggest).
   NOTE (string seats) adds: kind (timeline kind), midi, len (s), hold: bool (len >= 1 beat; Easy >= 2), chord?: [li, li]
     (2-lane, Hard/Expert, rhythm), run?: true (a merged fast repeat; t2 = the run's end), auto notes as drums.
   bands.<id>.seats = { bass: memberId, rhythm: memberId, lead: memberId } (E3; Gravel Kings rhythm = 'chase', who drums and
     sings). GG.career: seatOf(state), seatSwap(bandId, seat) -> memberId|null (drums -> null), swapped(state) -> memberId|null,
     seatRoleFor(state, member), lineup(state) -> [{ id: 'player'|memberId, seatRole }], drummerId(state), seatOk(state, x),
     seatLanes(state), seatRuns(state) (drums: gear.lanes / gear.doubleKick).
   Stage-0 stubs (lanes replace): gig.chart(song, { seat }) = the drum chart; GG.audio.pluck|strum|lead(midi, when, opts) and
     release(handle, when) -> null; GG.audio.seatKinds(genre, seat) -> C.SEAT_KINDS; GG.render.stage.setup({ seat }) is
     stored (info().seat) and otherwise ignored.
  ====================================================================== */
  // As merged (v1.1 lanes D audio + B sims/gameplay UI; plan/v11_lane_reports.md; contract §4.9):
  //   Folds: C.GATE_KEYS += seat, swapped (C.SEAT_GATE_KEYS = that subset); C.ACH_KINDS += seatCareer { seat }, soloTooLong
  //   { min? (default 0.3 after the lead's retune on D's real lead charts; spotlight notes / all your notes), by?: 'time' }, allSeats (= GG.achieve.SEAT_KINDS). C.SEAT_KINDS unchanged.
  //   GG.audio (30): seatVoiceFor(kind) -> 'pluck'|'strum'|'lead'; pluck|strum|lead(midi, when, o) -> handle { fn, kind, midi, t,
  //     end, len, hold, n, repeats, released, cut } | null (muted / no audio); o = { len, hold, kind, power, mute, strum, up, bend,
  //     trem, ring, repeats: [s after t] (a run on the grid), seat }; booked like hit (when < 1 s ahead, else now + 5 ms), class
  //     'tap' (never dropped), one voice per fn. release(handle, when) -> true | false (already released / a tap) | null (no
  //     handle): gates a hold (>= 60 ms, 20 ms fade). hitCancel() also cuts booked seat notes. seatPreview(bandId, seat, opts?)
  //     -> handle + { bandId, seat, secs, stopAt } | null: ~3 s of the band's first starter song's chorus, the seat's kinds
  //     +6 dB, the rest -6 dB, one at a time, stops itself (play / stop / suspend / stopPreview() end it). play() handle adds
  //     kinds, muted, mute, seat; timeline result adds seat, part (part notes carry part: true; the outro's last bar ring: true,
  //     tl.tail beats past the end); renderOffline({ seat, part, mute, seatNotes: [{ fn, midi, at, o, release }] }); soloFor(genre,
  //     'player'); noodle by seat (walk, chug, power, lick); debug('audio').seat. genres.js backing.progNames[section][i]
  //     (plain words) + backing.hooks[section] = [{ name, degrees: [5], rows: [5 rows] }].
  //   GG.gig (22): STR_LANES, HOLD_BEATS { easy 2, normal 1, hard 1, expert 1 }, RUN_GAP 0.18; chart opts genre, soloist; string
  //     chart keys holds, chords, runs, kinds, genre, tail, fills[].cap / shred; S.release(lane, t), S.holding, S.seat; SONG_RESULT
  //     adds seat, holds, rings, held, bends (lead seat at amp tier 2), and on the lead seat solo, dur, soloNotes, allNotes;
  //     roles(state).drummer is non-enumerable (the drum seat's roles object equals v1.0's). economy.gig.live adds flowGain,
  //     holdGain, ringGain, ringAt, seatDensityClamp, bendGain.
  //   GG.songs (21): part.{ ROWS, key(seat), choices(genre, seat, section), suggest, sanitize, full, toggle, pick, MODS, modify
  //     (lock | double | ring | call), notes }, partRating(pattern, genre), PART_WEIGHT { groove, hook, difficulty }, rate().part =
  //     { groove, hook, tips }; similarity scales by part likeness; create gives string-seat songs a part (seeded per song id).
  //   GG.career (20): stageRole(state, m) (drums: the content role; string seats: seatRole), ARCS { bass|rhythm|lead: { flag,
  //     values } }, arcOf(state). GG.drama (27): slotOf (the swapped member's slot is 'drums'; a drum hole on a string seat hires
  //     drummers, fill-in id fill_drums). GG.shop (2a): seatGearEffect(s, id), seatGearSync, kitName(s, k), whammy(s).
  //   GG.achieve (2g): SEAT_KINDS; KINDS includes them now that C.ACH_KINDS lists them.
  //   UI: 51 screen 'seat' (testids seat-drums|bass|rhythm|lead, seat-next; tap = A.seatPreview, leaving = A.stopPreview;
  //     emits 'seat:picked'); 55 string lanes (str0..5, holds/runs/chords drawn); 54 "Your part"; 5k "{Instrument} shop";
  //     59b "{Instrument} takes".
  // As merged (v1.1 lanes C render + A content; plan/v11_lane_c_report.md, plan/v11_lane_a_report.md; contract §4.9):
  //   Render (40-45): R.seatGear(seat, gearLook, kitColor, genre) -> the instrument group (3-4 body shapes per string seat,
  //     guard, headstock sticker = the logo canvas; colour from gearLook, else the kit colour); R.instrument (the same builder).
  //     stage.setup({ ..., seat, lineup }) (defaults state.seat / career.lineup(state); 55 stageData may omit both).
  //     stage.info() adds seat, view ('drummer' | 'spot' | 'spectator'), camera ('kit' | 'spot' | 'spectator'), drummer (the id on
  //     the throne: 'player' on drums; the drama fill-in 'fill_drums' when the swapped drummer quits), you ({ seat, gear,
  //     sticker, x, z, strums, fret } | null), boom (a singing drummer's boom mic), mics, seatMode, autoHits. van.info().gigBag
  //     (the seat | null); carpet.info().you ({ seat, gear } | null). The garage: the swapped drummer at the kit, the kit spot
  //     reads "Your rig" (opens the songwriter), you noodle in the amp corner (debug('render').seat).
  //   GG.creator (2b): sanitizeGearLook(gearLook, seat?) -> C.GEAR_LOOK, gearShapes(seat), gearDefault(seat, genre), gearNames(seat)
  //     -> { shapes, guards, stickers } (content creator.gear), stageLookFor(who, contentMember?); prepare / init / apply take
  //     gearLook. UI 5j: openLook({ ..., seat, gearLook, logo }): on a string seat the Kit tab is "Your gear" (lk-tab-gear;
  //     lk-gear-shape-<id>, lk-gear-sw-<i>, lk-gear-color-kit, lk-gear-guard-<id>, lk-gear-sticker-none|logo); onDone adds
  //     gearLook (51 passes it to creator.prepare). 5l recap photo shows your instrument.
  //   Content (A; src/content/zz_seats.js, zz_seats_drummers.js): bands.<id>.seatLines { drums, bass, rhythm, lead } (51's "who
  //     moves" line); CARD top-level seat?: [seat] / swapped?: memberId (also on chat lines; gatePasses + cardOk); card id
  //     prefixes arc_ (the three role arcs: flags bassArc / rhythmArc / leadArc, then <arc>Done at step 6), fin_ (12 band finales,
  //     once, band + seat + <arc>Done), sw_ (12 first-week cards forceWeek 2 + 48 Monday cards per swapped member);
  //     shop.gear[i].bySeat[seat] = { names: { <genre> }, blurb } and shop.kit[i].bySeat[seat] (amp tiers; lead tier 2 = the
  //     whammy); shop.byBand[b].lines.drummerGear (gated swapped: <id>); creator.gear { shapes: { <seat>: { <id>: name } },
  //     guards, stickers }; grooves.coach.bySeat[seat][step] + coach[genre].bySeat[seat][step] (steps drums | verse | chorus |
  //     bridge); lines.songReactions[id].kit / .bySeat[seat]; recruits.drummers { nicks: { <genre>: [..] } }; drama.fillIns.drums;
  //     endings.player.bass|rhythm|lead[tier] (drums stays endings.player.drums); endings.epilogues[id][i].when.seatRole
  //     ([seat roles]) + inLineup; content.seatAchievements (low_end, engine_room, solo_too_long, musical_chairs: kinds
  //     seatCareer / soloTooLong / allSeats; they join content.achievements because C.ACH_KINDS lists the kinds).
  //   Tests: tests/seat_scan.js (the strict string-seat leak scan: leak(text, seatAware(GG)), LEFT phrases);
  //     SEAT=bass|rhythm|lead|all LEAK_YEARS=n node tests/sim_bands.test.js; tests/content_seats.test.js.

  /* ======================================================================
   EVENTS (GG.emit(name, payload))            emitted by
   'career:new'     { state }                 career.newCareer
   'career:loaded'  { state }                 main, after a load
   'week:start'     { totalWeek, year, week, card: cardId|null, offer: GIG|null, quiet: text|null }   career.startWeek
   'card:resolved'  { cardId, choice, outcome, deltas, success }                    career.resolveCard
   'plan:changed'   { plan }                  career.setPlan
   'block:done'     { index, activity, lines, deltas }                              career.runWeek
   'gig:done'       { result: GIG_RESULT }    career.finishGig (live) / career.runWeek (autoGig)
   'gig:pending'    { gig }                   career.runWeek when a booked gig must be played live
   'gig:song'       { index, result: SONG_RESULT }   gig session, after each song (main saves here)
   'gig:judge'      { lane, judgement, combo, crowd } gig session, every hit/miss (render + UI react)
   'crowd:level'    { level, crowd }          gig session, when the crowd band changes
   'crowd:moment'   { kind }                  gig session (mosh, lighters, boo, genre moments, band effects; v0.9 §4.4 combo /
                                              chorus / peak kinds per genre, C.MOMENTS)
   'gig:band'       { who, action }           gig session: 'solo' | 'fill' | 'miss' | 'capeSpin' | v0.9 member.signature actions
                                              (stageDive, kneeSlide, hatTip); 59d emits the rival's 'kickflip' (C.RIVAL_ACTIONS)
   'tour:payoff'    { packageId, flag, venueId }   tour sim, a band's World payoff gig (v0.9; the UI plays the payoff screen)
   'road:resolved'  { card, choice, deltas }  world, after a road card on a van trip
   'era:changed' {era}  'label:offer'  'label:signed'  'label:dropped' {reason}  'label:fulfilled'  'session:week'
   'album:released'  'album:reviews'  'chart:week'  'cert'  'loonies:nominations'  'loonies:result'   (v0.5 labels sim)
   'week:done'      { result: WEEK_RESULT }   career.runWeek
   'week:wrap'      { wrap: WRAP }            career.endWeek (main autosaves on this)
   'year:end'       { year, summary }         career.endWeek
   'career:end'     { state }                 career.endWeek
   'stats:changed'  { state }                 career (any stat change) -> HUD refresh
   'song:written'   { song, reactions:[{who,text}] }   career.runWeek (Write block)
   'audio:step'     { section, entry, bar, step, time } audio playback (UI playhead)
   'audio:end'      { handle, natural }                          a song finished (or the app hid)
   'member:stage'   { id, stage }             drama, when a member's grievance stage changes
   'member:quit'    { id }  'member:return' { id }  'recruit:hired' { member }  'protection:ended' {}   (v0.4 drama)
   'hotspot'        { action }                render, when the player reaches a tapped hotspot
   'member:tap'     { id }                    render, when a bandmate is tapped
   'screen:open'    { id }  'screen:close' { id }                                   ui
   'save:done'      { slot }  'save:failed' { slot, error }                         save / main
   'tour:unlocked' { region, via } 'tour:invite' 'tour:booked' 'tour:depart' 'tour:week' 'tour:home' 'tour:broken'
     'tour:big' 'tour:rival' 'tour:president' 'tour:moose' 'tour:gong' 'tour:homesick'   (v0.7 tour; payloads in 25_sim_tour.js)
   v1.0 "Glory" (node bots emit the sim events; only browser listeners write meta, GG.meta.enabled):
   'legacy:bonus'   { years, maxWeeks }       GG.legacy.weekly, the one-time bonus-year grant
   'legacy:done'    { legacy }                GG.legacy.finish (before 'career:end')
   'ach:earned'     { ids }                   GG.achieve (per-career, first time this career)
   'meta:ach'       { ids, fresh }            GG.meta.award (fresh = first time across careers: the toast)
   'meta:unlock'    { kind, ids, names }      GG.meta.recordCareer (cosmetic unlocks; not when opts.silent)
   'meta:quota'     {}                        GG.meta, once, when the Hall of Fame could not be stored
   'hof:added'      { entry }                 GG.meta.recordCareer
   'meta:changed'   { keys }                  GG.meta, after a stored change
   'ui:tab'         { sheet, tab }            ui (laptop tab switches; sheet 'laptop')
   'tut:step'       { id, step, replay? }  'tut:done' { id, replay?, skipped? }      GG.tutorial
   'end:step'       { step, index, of }       5n end sequence (UI)
   'perf:quality'   { pixelRatio, reason }    render (adaptive pixel ratio, 'auto' graphics)
   v1.1 "Seats":
   'gig:hold'       { lane, held (0..1), ring } gig session, a string-seat hold ends (released early: held < 1; ring = held
                                              to the end, the ring bonus) — render + UI react
   'seat:picked'    { seat, swapped }         ui (the new-career seat picker; swapped = memberId | null)
  ====================================================================== */

  /* ======================================================================
   COMMANDS (module APIs). Sims take state as the first arg and never touch the DOM.
   GG.career.newCareer({ seed, bandId, slot, player:{ name, nick, presetId }, seat? (v1.1, default 'drums') }) -> state
   GG.career.startWeek(state)            -> { card: CARD|null, offer: GIG|null }  phase -> 'monday' | 'plan'
   GG.career.currentCard(state)          -> CARD|null
   GG.career.resolveCard(state, i)       -> { cardId, choice, outcome, deltas, success }  phase -> 'plan'
   GG.career.effectSummary(effects)      -> 'Fund −$150 · Marcel ↑ · Buzz ↑'
   GG.career.setPlan(state, [a,b,c])     -> plan
   GG.career.acceptOffer(state) / declineOffer(state)
   GG.career.runWeek(state, { autoGig })  -> WEEK_RESULT   phase -> 'gig' if a gig is booked and !autoGig, else 'wrap'
   GG.career.finishGig(state, result)    -> applies a live GIG_RESULT (+ venue rep, van wear) ; phase -> 'wrap'
   GG.career.pickListing(state, id|'skip') ; GG.world.* (listings, rep, van, trips, road cards: see 26_sim_world.js header)
   GG.gig.windows / chart / session / botPlay / setSize / defaultSetlist (see 22_sim_gig.js header) ; GG.audio.context()
   CHART = { songId, title, bpm, spb, lanes, duration, notes: [NOTE], auto: [NOTE + auto: true] (v0.6.2 two-thumb drops,
     played, never judged), total (judged notes), doubles (v0.7.2 double-kick notes), extras, fills, solos, sections }
   NOTE = { t (s from the first beat), lane, li, section, entry, bar, step, j (0 open | 1 perfect | 2 good | 3 miss | 4 free
     done), free?, extra?, dbl? + t2 (v0.7.2 double kick: one note, two kicks; the second plays at t2 once the first is
     hit; the session stamps hitT = the song time it was hit) }. gig.DOUBLE_GAP = the widest kick pair that merges (s).
   GG.ui.playGig(gig, done) / gigAutoplay ; openBoard({ mode, onBook, onSkip, onCancel }) ; playVan(gig, done) ; showVan()
   Content (v0.3): map { cities }, roadCards (Monday-card schema + effect key `van`, gate keys minKm/maxKm/season),
   headliners; venue fields deals, payRange, catch, kind (C.VENUE_KINDS), setSize.
   GG.render.stage.setup({ venue, crowd, members, flags, genre, player?, bpm? }) ; setCrowdLevel(0..100, snap?) ;
     moment(kind) ; hit(lane, judgement) ; bandAction(id|null, 'capeSpin'|'solo'|'fill'|'miss') ; setFrame({top,bottom}) ;
     info(). Listens to 'gig:judge', 'crowd:level', 'crowd:moment', 'audio:step'. armPose (shared arm IK).
   GG.render.van.setTrip({ from, to, km, season?, night?, members? }) ; setProgress(0..1) ; moose() ; talk(id, secs) ;
     setFrame ; info(). Kenji drives and never talks.
   GG.career.endWeek(state)              -> WRAP          advances the week; phase -> 'monday' (or 'ended')
   GG.career.moodLabel(mood)             -> 'happy'|'ok'|'grumpy'|'sulking'
   GG.career.fillText(state, text)       -> text with tokens replaced
   GG.career.botPlan(state, style) / botChoice(state, card, style)   style 'avg'|'good'
   GG.songs.rate(pattern, genre, gear?) -> { groove, hook, difficulty, notes, tips:[text] }   (pure, deterministic)
   GG.songs.generate(genre, rng, opts?) -> PATTERN ; GG.songs.starter(genre) -> PATTERN ; validate(pattern, gear) -> [errors]
   GG.songs.create(state, pattern, title?, opts?) -> SONG ; GG.songs.best(state, n) -> [song] ; stale/classic updates per gig
   GG.songs.similarity(a, b) -> 0..1 ; GG.songs.toNotes(song) -> [{ beat, lane, section, entry, bar, step }] (v0.3 charts)
   GG.songs.jam(state, rng) (replaces writePlaceholder) ; played / weekly / sanitize / pickTitle / ability
   rate() also returns sections: { verse, chorus, bridge } (groove per part). GIG_RESULT gains classics: [songId];
   WEEK_RESULT block deltas.song = { id, title, titleEn, quality, auto, groove, hook, difficulty, reactions }.
   GG.audio.play(pattern, { genre, section|null (null = full arrangement), loop, backing: true }) -> handle { stop(), beatAt() }
     (null without Web Audio) ; GG.audio.stop / hit / timeline / styleFor / renderOffline
   GG.gig.makeGig(state, venueId, source) -> GIG ; GG.gig.randomOffer(state, rng) -> GIG|null
   GG.gig.autoResolve(state, rng)        -> GIG_RESULT (v0.1 placeholder; v0.3 replaces with the rhythm game)
   GG.save.write(slot, state) -> bool ; read(slot) -> state|null ; list() -> [{ slot, exists, summary }]
   GG.save.remove(slot) ; toCode(state) -> 'GG1:...' ; fromCode(text) -> state (throws on bad code)
   GG.save.migrate(state) -> state ; GG.save.storageOk -> bool
   GG.save.readCode(text) -> { state|null, meta|null } (throws on a bad code) ; metaCode() -> 'GG1:...' (v1.0, see V1.0 GLORY)
   GG.meta (12_meta.js): enabled, load(), get(), save(), hof(), careerId(state), lessonSeen(id), markLesson(id), exportLite(),
     exportFull(), mergeLite(obj), recordCareer(state, opts) -> { entry, fresh, unlocks, ach }, award/has/unlock/unlocked
   GG.render.init(containerEl) -> bool ; setScene('garage'|'none') ; syncState(state) ; setPaused(bool)
   GG.render.goToHotspot(action) ; hotspotScreenPos(action) -> {x,y}|null ; memberScreenPos(id) -> {x,y}|null
   GG.audio.unlock() ; sfx(name) ; setMuted(bool) ; suspend() / resume()
   GG.ui.show(id, data) ; close() ; toast(text) ; refreshHud()
   GG.main.quickStart({ seed, slot }) -> state   (dev/tests: skips menus, lands in the garage)
   Extras as built (v0.1): see plan/status.md "APIs" (render setViewInsets/pickAt/defineScene/buildCharacter,
   gig simulate/applyResult, ui toolkit, main routing).
   Every module: GG.registerDebug('<module>', fn) ; GG.debug() returns all.
  ====================================================================== */
})(window.GG);
