// 02_contracts.js: the single source of truth for state fields, content schemas, events and commands.
// Constants below are used by code and tests. Comments document shapes. Change this file first.
(function (GG) {
  var C = GG.contracts = {};

  C.SAVE_SCHEMA = 9;             // state.v; bump + add a migration in 10_save.js when the shape changes
  C.WEEKS_PER_YEAR = 24;
  C.CAREER_YEARS = 10;           // 240 weeks (+2–3 bonus years later, v1.0)
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
  C.MOMENTS = ['mosh', 'lighters', 'boo', 'drinks', 'wallOfDeath', 'circlePit', 'lineDance', 'capeSpin', 'solo'];
  C.VENUE_KINDS = ['house', 'legion', 'bingo', 'openmic', 'church', 'curling', 'skatepark', 'bar', 'club'];
  C.HAIR_STYLES = ['short', 'long', 'mohawk', 'bald', 'bun', 'mullet', 'spiky', 'cap'];
  C.LOOK_EXTRAS = ['sunglasses', 'beard', 'moustache', 'glasses', 'headband', 'tattoos', 'hat', 'bandana'];
  C.IDLES = ['mirror', 'noodle', 'lunch', 'corner', 'pace', 'phone'];
  C.CAPE_VALUES = ['velvet', 'curtain', 'charred', 'fireproof', 'none'];   // state.flags.cape (render reads it)
  C.CARD_BOOKABLE = ['st_vlads_hall', 'bingo_palace', 'legion_63', 'warman_curling_lounge']; // venue ids cards may `book`
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
    'flags', 'notFlags', 'flagEquals', 'gigBooked', 'moodBelow', 'moodAbove'];

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
     head: 'logo'|'face'|'moose'|'text'|'plain', headText, throne: 'crate'|'stool'|'leather', sticks: '#rrggbb',
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
   VAN  = { id: 'moose_hearse', name: 'The Moose Hearse', condition 0..100, space, comfort, km }
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
                         blurb, coldOpen: [panel text..], starterSongs: [ { title, titleEn } ],
                         members: [ { id, name, fullName, nick, role, hometown, skill, mood, wants, bio, idle, look: LOOK } ] } }
           idle = 'mirror'|'noodle'|'lunch'|'corner'|'pace'|'phone'  (garage idle animation)
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
   'crowd:moment'   { kind }                  gig session (mosh, lighters, boo, genre moments, band effects)
   'gig:band'       { who, action }           gig session: 'solo' | 'fill' | 'miss' | 'capeSpin'
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
  ====================================================================== */

  /* ======================================================================
   COMMANDS (module APIs). Sims take state as the first arg and never touch the DOM.
   GG.career.newCareer({ seed, bandId, slot, player:{ name, nick, presetId } }) -> state
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
