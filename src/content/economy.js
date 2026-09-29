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
    weeklyUpkeep: 22,          // $ per week: sticks, gas money, the extension-cord bill (v0.4: members buy their own strings from their cut)
    upkeepPerFan: 0.012,       // + this per fan: a bigger band has bigger bills (more gas, more strings, more pizza)
    upkeepFanCap: 8000,        // v0.5: past this many fans the per-fan bills grow slower...
    upkeepFanTail: 0.2,        // ...at this fraction of the rate (a national fanbase isn't all in your van)
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

    // ---- Drama (27_sim_drama.js, v0.4): moods, grievance stages, quits/returns, recruits, fill-ins, pay the band ----
    drama: {
      protectFans: 250,                    // garage-era protection (nobody quits, nothing breaks) ends here
      payCut: 0.3, payCutMax: 0.6,         // pay the band: members' share of gig pay (owner default 30%)
      // money: members expect expectCut (+ a little more as the band grows); recruits expect their askingCut
      expectCut: 0.25, expectCutPerFan: 0.00002, expectCutMax: 0.1,
      moneyUp: 16, moneyUpMax: 3, moneyDown: 30, paidBonus: 0.5,
      burnoutFrom: 55, burnoutScale: 0.12,  // overworked: mood push per burnout point over the line
      trendWeeks: 4, trendGrow: 0.03, stall: 1, growBonus: 0.5,   // band success: fans trend over 4 weeks
      gradeMood: { S: 1, A: 0.5, B: 0, C: -1, D: -2 },
      wantMet: 2, wantUnmet: 1.5, wantWeeks: 8, kenjiDrift: 2.5,  // personal wants (content/drama.js)
      stageAt: [48, 41, 35], recover: 6,   // mood below -> grumbling / passive-aggressive / ultimatum; +recover to step back
      grumbleChat: 0.7,
      returnAfter: [16, 30], laterWeeks: 8, returnMood: 72, returnSkill: 5,
      quirkChance: 0.1, quirkCooldown: 12,
      adCost: 30, repostCost: 20,          // Kijiji + the music-store corkboard
      fillInCost: 40, fillInSkill: 38, fillInChem: 1,
      holePenalty: 14, fillInPenalty: 4, holeCrowd: 10,
      recruitStars: [30, 35, 22, 10, 3],   // 1..5 star weights in the garage era (shift up with era/fans)
      hireChemPull: 0.25,
      traits: { showboatScore: 4, studioRatQuality: 5, hypeBuzz: 2, fastLearner: 2, fastLearnerCap: 75,
                roadWarriorBurnout: 3, partyFans: 1.15, partyBurnout: 2, frugalRefund: 5, legendFans: 20, legendGigFans: 1.1 },
      bot: { avgRefuse: 0.45, keep: 40, goodPayUp: 0.4, goodPayFund: 600, repostBelow: 55 }
    },

    // ---- Eras (v0.5): garage -> local (250 fans, the v0.4 protection line) -> signed (a deal or a DIY album) -> world ----
    eras: { localFans: 250, worldFans: 25000, worldNeedsChart: true, worldEnabled: false },   // the World era itself is v0.7
    eraUpkeep: { garage: 0, local: 6, signed: 40, world: 90 },   // extra $/week: jam-space rent, a manager, insurance
    hustleEra: { garage: 1, local: 1.3, signed: 2.2, world: 3 },   // hustle cash x: drum lessons and session work pay more once you're known

    // ---- World (26_sim_world.js overrides, merged over its DEFAULTS) ----------------------------------------------
    world: {
      eraTier: { garage: 2, local: 2, signed: 3, world: 3 },   // tier-3 theatres (500–2,000) open in the Signed era
      scene: { garage: 6000, local: 6000, signed: 40000, world: 250000 },   // fans a band can reach through gigs
      theatreFans: 0.4,          // new-fan factor at theatres: most of that crowd already knows you
      commission: { garage: 0, local: 0, signed: 0.15, world: 0.2 },  // management + booking agent, off the top of gig pay
      crew: { 3: 150 }           // $ per show by venue tier: sound, lights and a merch person (theatres)
    },

    // ---- Labels, studios, releases (24_sim_labels.js, v0.5) --------------------------------------------------------
    labels: {
      // weekly offer chance per label = base + fans * (fans / offerMinFans - 1, capped) + release/chart bonuses + buzz
      offers: { minEra: 'local', base: 0.05, fans: 0.04, fansCap: 3, goodRelease: 58, releaseBonus: 0.08, chartBonus: 0.06,
                buzz: 0.001, max: 0.25, expires: 4, cooldown: 6, declineCooldown: 10, dropCooldown: 48,
                needRelease: { monolith: 55 },   // Monolith only calls after a release that charted or scored this well
                advanceSpread: [0.85, 1.15], advanceFansSpan: 4, royaltyBonus: 0.02 },
      recordingShare: 0.6,       // share of an advance the label holds as the recording budget (the rest is paid on signing)
      signFx: { buzz: 10, mood: { all: 6 } },
      dropFx: { buzz: -8, mood: { all: -6 } },
      goodwill: 60, goodwillFlop: 20, goodwillHit: 10, salesMultMax: 1.4,
      demandEvery: 8, demandGrace: 2, deadlineGrace: 6, deadlineWarn: 8,
      // label demands, answered 'met' | 'half' | 'refused' (content demand cards set flags.demand<Kind>; the rest go
      // through GG.labels.answerDemand). goodwill 0 = dropped. effects/role (moods) only apply on the API path.
      demandFx: {
        english: { met: { salesMult: 1.1, goodwill: 5 }, half: { salesMult: 1.04 }, refused: { goodwill: -20 } },
        radio: { met: { salesMult: 1.12, goodwill: 5 }, half: { salesMult: 1.05 }, refused: { goodwill: -15 } },
        image: { met: { salesMult: 1.05, goodwill: 5 }, half: {}, refused: { goodwill: -15 } },
        feature: { met: { salesMult: 1.08, goodwill: 5 }, half: { salesMult: 1.03 }, refused: { goodwill: -15 } },
        showcase: { met: { goodwill: 10 }, half: {}, refused: { goodwill: -10 } },
        other: { met: { goodwill: 5, effects: { mood: { all: -2 } } }, half: {}, refused: { goodwill: -10 } }
      },
      // flop: bad reviews (critic < 45) cost goodwill; the label's sales test (content dropOnFlop = units in the first
      // `weeks` weeks, 0 = never) drops you
      flop: { critic: 45, weeks: 12 },
      recording: {
        tracks: { ep: [4, 5], album: [8, 10] }, minEra: { ep: 'local', album: 'local' },
        weeks: { ep: 2, album: 3, albumLong: 4, longAt: 9 },
        takesPerSong: 3,               // auto takes per song per studio week (best counts; a played take can beat it)
        take: { base: 32, drum: 0.55, over: 0.6, studio: 0.08, noise: 12, burnout: 0.3 },
        production: { studio: 0.5, takes: 0.3, polish: 0.2, unknownTake: 50 },
        burnout: -2, chemistry: 1, eventChance: 1   // studio weeks: long hours, but no driving and no hustling (restful)
      },
      styles: {                       // producer styles: studio-week burnout/mood, extra weeks, outlet biases
        loud: { burnout: 2, outlets: { deci_hell: 4, pitchspork: -3 } },   // (cabin: the woods are restful)
        cabin: { burnout: -5, mood: 2, outlets: { pitchspork: 3 } },
        pitch: { outlets: { rolling_scone: 3, proclaim: 2 } },
        tape: { outlets: { rolling_scone: 3, pitchspork: 2 } },
        radio: { outlets: { proclaim: 3, pitchspork: -4, deci_hell: -3 } },
        weird: { outlets: { pitchspork: 5, rolling_scone: -3, tailgate_weekly: -3 } }
      },
      tracklist: { base: 50, opener: 15, closer: 15, single: 10, frontSingle: 5, weak: 10, adjacent: 8, adjacentAt: 0.9 },
      release: { minLead: 2, maxLead: 12, promoEach: 0.08, promoCap: 6, labelPromo: { gopherwood: 1, monolith: 4, diy: 0 },
                 packages: [{ id: 'posters', name: 'Posters on every pole', cost: 150, promo: 1,
                              blurb: 'Every lamp post from Warman to Moose Jaw. The staple gun is Baba\'s.' },
                            { id: 'radio', name: 'Campus + community radio push', cost: 900, promo: 2,
                              blurb: 'Nine stations, three of them heard beyond the parking lot.' },
                            { id: 'tv', name: 'Late-night TV spot', cost: 3000, promo: 3,
                              blurb: 'Thirty seconds between the curling highlights and a mattress ad.' }] },
      // critic score = quality * 0.5 + production * 0.3 + polish * 0.1 + (tracklist - 50) * 0.2 + base - recycled + outlet
      reviews: { quality: 0.5, production: 0.3, polish: 0.1, tracklist: 0.2, base: -2, epAdj: -3,
                 // recycled: a track >= recycledAt similar (GG.songs.similarity) to another track or one on your last
                 // `recycledReleases` releases costs `recycled` points (capped); jammed songs share a lot, so the bar is high
                 recycledAt: 0.93, recycledReleases: 2, recycled: 4, recycledCap: 16, pitchsporkRecycled: 1.5, noise: 6, offGenreNoise: 10,
                 recycledRef: 0.4, recycledQuoteAt: 2, recycledQuoteChance: 0.5,
                 bands: [40, 62, 80] },   // quote bands when content reviews.scoreBands is missing
      // week one = (fans * buyRate + buzz * buzzUnits) * critic curve * promo * label reach * single * kind * demands
      sales: { buyRate: 0.09, buzzUnits: 6, critic: [0.4, 1.2, 1.5], reach: { gopherwood: 1.5, monolith: 2.6, diy: 1 },
               kind: { ep: 0.5, album: 1 }, single: [0.85, 0.3], noise: [0.9, 1.1], decay: { ep: 0.55, album: 0.62 },
               minUnits: 5, fansPerUnit: 0.3, unitValue: { ep: 0.25, album: 0.4 },   // $ per unit the royalty applies to
               streamRate: 2.5, streamReach: { gopherwood: 1.3, monolith: 2, diy: 1 }, streamDecay: 0.965,
               perStream: 0.0004, streamsPerUnit: 1250, minStreams: 50 },
      chart: { top: 15000, bottom: 250, noise: 2 },   // Maple 100: units for #1 and #100 (log scale in between)
      releaseFx: { buzz: 4, buzzPer: 12, chartBuzzPer: 12, moodGood: 5, moodBad: -4 },
      certFx: { gold: { buzz: 8, fans: 200 }, platinum: { buzz: 12, fans: 500 } },
      // bots: avg signs a live offer half the time; both avoid studio time they can't cover; good buys label-paid promo
      bot: { avgSign: 0.5, avgDecline: 0.15, goodSpend: 0.5, avgSpend: 0.2, goodCushion: 800, avgCushion: 600, richAt: 20, goodMinQuality: 55,
             avgMinQuality: 45, avgDeadlineWeeks: 16, avgRecordChance: 0.12, epGap: 30, diyAlbumYear: 3, diyAlbumFund: 1500,
             avgDiyChance: 0.08, diyAfterOffer: 30, avgEpChance: 0.1, goodLead: 3, avgLeadMax: 4, labelPromo: 1000,
             promoCushion: 2500, goodwillFloor: 30 }
    },

    // ---- Loonie Awards (24_sim_labels.js): nominations `lead` weeks before C.LOONIES_WEEK, releases in the last `window` weeks ----
    loonies: { lead: 4, window: 24, breakthroughWeeks: 48, nominateAt: 55, rivalNominateAt: 40, liveMinGigs: 6, noise: 10,
               other: [50, 80],   // strength of the other (parody) nominees
               rival: { base: 58, perYear: 4, max: 95, bias: { breakthrough: -30, album: 6, single: 4, live: 6, fan_choice: 6, worst_van: -40 } },
               win: { fund: 1000, fundScale: 0.15, fansScale: 1, fans: 50, fansPct: 0.015, fansCap: 600, buzz: 12, mood: 4 }, nominated: { buzz: 3 }, worstVan: { buzz: 6, van: 15 } },

    // ---- The rival (23_sim_rival.js, v0.6): their career, heat, showdowns, cracking, the Sad Dome final ----------------
    rival: {
      // their career: fans chase this curve (fans at the start of each year, geometric in between) x momentum
      fansCurve: [40, 450, 1700, 4300, 8200, 12500, 17000, 21500, 25500, 29000, 32000, 34500, 36500],
      pull: 0.18, momentumPer: 0.02, momentum: [0.7, 1.25],
      skill: { start: 50, cap: 87, tau: 66, rebrand: -4, breakup: -6, opener: -3 },   // set strength = cap - (cap - start) * e^(-week / tau)
      buzz: { start: 15, perYear: 5, max: 60, heat: 0.2, drift: 0.25, win: 5, loss: -3 },
      form: { win: 1.5, loss: -1.5, decay: 0.9, max: 6 },
      eras: { local: 250, signed: 1100 },
      release: { week: 8, spread: 4, fromYear: 1, critic: 8, criticNoise: 6, units: 1.6, tail: 4.5, chartWeeks: 9, chartDrop: 7 },
      // heat 0..100: + per clash, slow decay; above `buzzFrom` it feeds buzz to both bands every week
      heat: { start: 12, decay: 0.025, decayMin: 0.4, buzzFrom: 25, buzz: 0.02,
              clash: { botb: 12, sameNight: 7, stolenSlot: 6, loonies: 4, poach: 10, festival: 8, final: 15 } },
      // scheduling: weekly chance = base + heat * perHeat (x crack factor), at least minGap weeks apart, per-kind cooldowns
      schedule: { firstWeek: 6, base: 0.1, perHeat: 0.0035, minGap: 3, crackFactor: { rebrand: 0.7, opener: 0.4, breakup: 0 } },
      kinds: {
        botb: { minFans: 30, weight: 3.5, cooldown: 8, eraWeight: { garage: 1.5, local: 1.2, signed: 0.6, world: 0.4 } },
        sameNight: { minFans: 120, weight: 3, cooldown: 6 },
        stolenSlot: { minFans: 60, weight: 1, cooldown: 8 },
        festival: { minFans: 150, weight: 6, cooldown: 10, weeks: [[1, 6], [22, 24]] },
        poach: { weight: 4, cooldown: 12, minStage: 2, chance: 0.5 }
      },
      noise: 8, kindBonus: { botb: 0, sameNight: 0, festival: 3, final: 5 },
      botb: { prize: { garage: 300, local: 600, signed: 1000, world: 2000 }, steal: 0.03, stealCap: { garage: 40, local: 150, signed: 600, world: 1200 },
              capacity: 250, buzz: 3 },
      sameNight: { split: 0.6, steal: 0.02 },
      festival: { fans: 0.06, buzz: 5, fansMin: 25 },
      stolenSlot: { defendRep: 3 },   // a venue that loves you (rep 3) turns them down,
      final: { year: 10, week: 21, winBuzz: 15, winFans: 0.02, loseBuzz: 5 },
      crack: { net: 7, minWins: 9, heat: 30, fromYear: 2 },
      awards: { bonus: 12, breakup: 0.75 },   // Loonie strength: award-show darlings (fruit baskets for every voter)
      opener: { chance: 0.2, crowd: [20, 80], fans: 0.3 },
      bot: { avgEnter: 0.75 }
    },

    // ---- Bots (tools/balance.js and tests; GG.career.botPlan/botChoice) ---
    bot: {
      avgSmart: 0.5,           // avg bot takes the best-valued card choice this often, else a random one
      avgAcceptOffer: 0.7,
      // how much a bot values one point of each stat when weighing card choices
      value: { fund: 0.04, fundBroke: 0.2, broke: 150, fans: 0.8, buzz: 0.6, chemistry: 0.8, burnout: 0.5,
               drumSkill: 1, mood: 0.2, skill: 0.8, book: 6 },
      good: { restAt: 50, hustleBelow: 200, brokeWeeks: 2, promoteAbove: 350, promoteBuzzBelow: 35, minSongs: 5, writeEvery: 3 },
      avg: { weights: { rehearse: 3, write: 2, promote: 1.2, book: 2, hustle: 1.5, rest: 1.3 },
             restAt: 70, hustleBelow: 100, brokeWeeks: 5 }   // v0.5: broke = under brokeWeeks of upkeep (bots hustle + book)
    }
  };
})(window.GG);
