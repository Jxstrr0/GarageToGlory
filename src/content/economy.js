// economy.js: every tunable number for money, fans, buzz, moods, gigs and the bots (owned by the SIM agent).
// Owner call (2026-09-29): "Scrappy, but not too brutal" = always a little short, hustle matters,
// and a parents' loan is rare with decent play. Tune with `node tools/balance.js [years] [seeds]`.
(function (GG) {
  GG.content.economy = {
    // ---- Career start ----------------------------------------------------
    startFund: 300, startFans: 12, startBuzz: 5,        // twelve fans: your mom counts
    startChemistry: 50, startBurnout: 10, startDrumSkill: 10,
    starterSongQuality: [30, 40], starterSongPolish: 25,

    // ---- Week wrap (endWeek) ---------------------------------------------
    weeklyUpkeep: 30,          // $ per week: strings, sticks, gas money, the extension-cord bill
    upkeepPerFan: 0.015,       // + this per fan: a bigger band has bigger bills (more gas, more strings, more pizza)
    buzzDecay: 0.15,           // fraction of buzz lost each week (at least 1 while buzz > 0)
    buzzFans: 0.12,            // organic new fans per week per point of buzz
    burnoutRecovery: 3,        // burnout that fades by itself every week
    burnoutMoodAt: 55,         // above this, burnout drags every mood down...
    burnoutMoodPer: 12,        // ...by 1 point per this many points of burnout over the line
    moodBaseline: 60,          // moods drift toward this, adjusted by how the band is doing:
    moodBuzzScale: 0.15,       //   + (buzz - 20) * scale
    moodChemScale: 0.1,        //   + (chemistry - 50) * scale
    moodBurnoutFrom: 35,       //   - (burnout - from) * scale, when burnout is above `from`
    moodBurnoutScale: 0.3,
    moodBaselineRange: [25, 80],
    moodDrift: 0.25,           // fraction of the gap to the baseline closed each week
    chemistryDrift: 0.25,       // chemistry closes this fraction of its gap to the average mood each week

    // ---- Monday (startWeek) ----------------------------------------------
    quietWeekChance: 0.15,     // chance of a Monday with no card
    quietFreeWeeks: 2,         // weeks 1..2 always have a card
    offerMinFans: 40,          // gig offers start arriving at this many fans...
    offerChance: 0.35,         // ...with this chance per week when no gig is booked
    offerMaxTier: 2,
    chainStaleWeeks: 24,       // a chain step that can't fire for this long is ended

    // ---- Parents' loan ---------------------------------------------------
    parentsCushion: 100,       // a loan tops the fund back up to this

    // ---- Group chat, history, milestones ---------------------------------
    chatChance: 0.35,          // per member per week
    chatSecondChance: 0.1,     // ...and a second message
    chatMax: 60, historyMax: 400,
    fanMilestones: [50, 100, 250, 500, 1000], fundMilestone: 1000,

    // ---- Activities ------------------------------------------------------
    repeatFactor: [1, 0.6, 0.35],   // gains for the 1st / 2nd / 3rd use of the same activity in a week

    // ---- Gigs (22_sim_gig.js) --------------------------------------------
    gig: {
      // performance score (0..100) = base + weighted stats - burnout penalty, times a genre-fit factor, plus noise
      base: 10,
      weights: { skill: 0.3, drum: 0.15, chemistry: 0.15, songs: 0.4 },
      burnoutFrom: 25, burnoutPenalty: 0.25,
      fitFloor: 0.7,                        // score multiplier at genre fit 0 (1.0 at fit 1)
      noise: 10,
      songScore: { quality: 0.7, polish: 0.3 },
      setSize: 3,                           // default songs per set (venues can override)
      scoreSongs: 3,                        // the score uses your best this-many songs
      grades: [['S', 80], ['A', 65], ['B', 50], ['C', 35], ['D', 0]],
      // crowd = walk-ins + fans * fanDraw + buzz * buzzDraw, times noise, capped at capacity
      fanDraw: 0.3, buzzDraw: 0.4, crowdNoise: [0.8, 1.15],
      // new fans = crowd * conversion[grade] * (0.5 + 0.5 * fit) * exposure bonus * local-scene headroom
      conversion: { S: 0.55, A: 0.4, B: 0.28, C: 0.15, D: 0.05 },
      exposureFanBonus: 1.3,
      localScene: 6000,                     // the garage-era scene isn't infinite
      buzz: { S: 6, A: 4, B: 2, C: 1, D: -2 },
      mood: { S: 3, A: 2, B: 1, C: -1, D: -3 },
      chemistry: { S: 3, A: 2, B: 1, C: 0, D: -2 },
      burnout: 4
    },

    // ---- Songs (21_sim_songs; the Write activity numbers are in activities.js) ----
    songs: {
      // quality = band part + (craft - craftPivot) * craftWeight - max(0, difficulty - ability) * overPenalty
      //   craft = 0.6 groove + 0.3 hook + 0.1 difficulty; pivot ~ an average band jam, so bots keep v0.1 balance
      craftPivot: 85, craftWeight: 0.8,
      overPenalty: 0.4, overPolish: 0.5,    // over-hard songs lose quality and start less polished
      // ability (hardest difficulty the band plays cleanly) = base + avg member skill * skill + drum skill * drum
      abilityBase: 22, abilitySkill: 0.5, abilityDrum: 0.4,
      stalePerPlay: 10, staleDecay: 4,       // each gig play adds stale; each week off takes some away
      staleWeight: 0.08,                     // setlist score lost per point of stale
      classicHits: 4, classicGrades: ['S', 'A'], classicBonus: 3   // 4 great gigs make a classic
    },

    // ---- Bots (tools/balance.js and tests; GG.career.botPlan/botChoice) ---
    bot: {
      avgSmart: 0.5,           // avg bot takes the best-valued card choice this often, else a random one
      avgAcceptOffer: 0.7,
      // how much a bot values one point of each stat when weighing card choices
      value: { fund: 0.04, fundBroke: 0.2, broke: 150, fans: 0.8, buzz: 0.6, chemistry: 0.8, burnout: 0.5,
               drumSkill: 1, mood: 0.2, skill: 0.8, book: 6 },
      good: { restAt: 50, hustleBelow: 200, promoteAbove: 350, promoteBuzzBelow: 35, minSongs: 5, writeEvery: 3 },
      avg: { weights: { rehearse: 3, write: 2, promote: 1.2, book: 2, hustle: 1.5, rest: 1.3 },
             restAt: 70, hustleBelow: 100 }
    }
  };
})(window.GG);
