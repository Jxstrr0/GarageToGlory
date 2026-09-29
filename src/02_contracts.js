// 02_contracts.js: the single source of truth for state fields, content schemas, events and commands.
// Constants below are used by code and tests. Comments document shapes. Change this file first.
(function (GG) {
  var C = GG.contracts = {};

  C.SAVE_SCHEMA = 1;             // state.v; bump + add a migration in 10_save.js when the shape changes
  C.WEEKS_PER_YEAR = 24;
  C.CAREER_YEARS = 10;           // 240 weeks (+2–3 bonus years later, v1.0)
  C.BLOCKS_PER_WEEK = 3;         // two weeknights + the weekend
  C.BLOCK_LABELS = ['Tue night', 'Thu night', 'Weekend'];

  C.GENRES = ['metal', 'punk', 'rock', 'country'];
  C.ERAS = ['garage', 'local', 'signed', 'world'];
  C.REGIONS = ['canada', 'uk_europe', 'japan', 'australia', 'russia']; // no USA, ever
  C.CARD_TYPES = ['drama', 'money', 'road', 'scene', 'fame', 'weird'];
  C.ACTIVITIES = ['rehearse', 'write', 'promote', 'book', 'hustle', 'rest'];
  C.PHASES = ['monday', 'plan', 'week', 'wrap', 'ended'];
  C.DEALS = ['exposure', 'flat', 'door'];
  C.GRADES = ['S', 'A', 'B', 'C', 'D'];
  C.HOTSPOTS = ['plan', 'kit', 'gigboard', 'laptop', 'merch', 'trophies', 'door'];
  C.SLOTS = ['auto', '1', '2', '3'];
  C.HAIR_STYLES = ['short', 'long', 'mohawk', 'bald', 'bun', 'mullet', 'spiky', 'cap'];
  C.LOOK_EXTRAS = ['sunglasses', 'beard', 'moustache', 'glasses', 'headband', 'tattoos', 'hat', 'bandana'];
  C.IDLES = ['mirror', 'noodle', 'lunch', 'corner', 'pace', 'phone'];
  C.CAPE_VALUES = ['velvet', 'curtain', 'charred', 'fireproof', 'none'];   // state.flags.cape (render reads it)
  C.CARD_BOOKABLE = ['st_vlads_hall', 'bingo_palace', 'legion_63', 'warman_curling_lounge']; // venue ids cards may `book`
  C.SIM_FLAGS = ['parentsLoan'];   // flags the sim sets that cards may gate on
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
  C.EFFECT_KEYS = ['fund', 'fans', 'buzz', 'chemistry', 'burnout', 'drumSkill', 'mood', 'skill', 'flags', 'chain', 'book', 'chat'];

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
     v: 1, createdVersion: '0.1.0.0', slot: '1',
     seed: <uint32>, rng: <uint32>,                 // rng = live RNG state (GG.rngFor(state))
     bandId: 'hail_damage', genre: 'metal', region: 'canada', city: 'Saskatoon', space: 'parents_garage',
     player: { name, nick, presetId, look: LOOK, kitColor: '#rrggbb' },
     totalWeek: 1, year: 1, week: 1, maxWeeks: 240, // week = week of year 1..24
     phase: 'monday'|'plan'|'week'|'wrap'|'ended',
     era: 'garage', protected: true,                 // garage era: nobody quits, nothing breaks
     fund, fans, buzz, chemistry, burnout, drumSkill, debtToParents,
     members: [ { id, name, nick, role, skill, mood, status: 'active', original: true } ],
     songs:   [ { id, title, titleEn, quality, polish, plays, written, pattern: null } ],  // pattern arrives in v0.2
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
   'gig:done'       { result: GIG_RESULT }    career.runWeek
   'week:done'      { result: WEEK_RESULT }   career.runWeek
   'week:wrap'      { wrap: WRAP }            career.endWeek (main autosaves on this)
   'year:end'       { year, summary }         career.endWeek
   'career:end'     { state }                 career.endWeek
   'stats:changed'  { state }                 career (any stat change) -> HUD refresh
   'hotspot'        { action }                render, when the player reaches a tapped hotspot
   'member:tap'     { id }                    render, when a bandmate is tapped
   'screen:open'    { id }  'screen:close' { id }                                   ui
   'save:done'      { slot }  'save:failed' { slot, error }                         save / main
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
   GG.career.runWeek(state)              -> WEEK_RESULT   phase -> 'wrap'
   GG.career.endWeek(state)              -> WRAP          advances the week; phase -> 'monday' (or 'ended')
   GG.career.moodLabel(mood)             -> 'happy'|'ok'|'grumpy'|'sulking'
   GG.career.fillText(state, text)       -> text with tokens replaced
   GG.career.botPlan(state, style) / botChoice(state, card, style)   style 'avg'|'good'
   GG.songs.writePlaceholder(state, rng) -> song ; GG.songs.best(state, n) -> [song]
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
   Every module: GG.registerDebug('<module>', fn) ; GG.debug() returns all.
  ====================================================================== */
})(window.GG);
