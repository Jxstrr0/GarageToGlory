// content/cards.js: Monday event cards for Hail Damage: the garage era (v0.1), Local Heroes and Signed (v0.5).
// Shape: GG.content.cards = [ CARD ] (CONTENT SCHEMAS in 02_contracts.js). Gate keys = GG.contracts.GATE_KEYS,
// effect keys = GG.contracts.EFFECT_KEYS; tests/content.test.js validates every card against both.
//
// Conventions
//   - Every card is gated to { era:['garage'], genre:['metal'], band:['hail_damage'] } via g(); extra conditions merge in.
//     v0.5: evergreen garage cards pass era: GL (garage + local) or GLS (+ signed) so later eras keep a full deck;
//     new cards use L / S / LS. Later-era magnitudes scale up (tests/content.test.js MAG_BY_ERA, by the card's earliest era).
//   - Label cards gate on the sim flag `label` (flagEquals { label: 'monolith'|'gopherwood'|'diy' }); demand cards write
//     flags.demandEnglish / demandRadio / demandImage / demandFeature / demandShowcase = 'met' | 'half' | 'refused'.
//   - v0.5 hook flags: babaManager (Baba manages the band), mooseAlbum (see the Moose Album chain), wraithFeud (awards.js).
//   - Defaults (sim-applied): weight 1, once true, cooldown 0. Only non-defaults are written out.
//   - A choice with a `roll` always has a `hint` starting "Gamble:". Its own `outcome` is the set-up line; the
//     branch outcome (success/fail) says what happened. Show them together: choice.outcome + ' ' + branch.outcome.
//   - Magnitudes (garage era): fund −250…+200, fans 0…+30, buzz ±2…12, chemistry ±2…8, mood ±3…15,
//     skill/drumSkill +1…3, burnout ±3…15.
//   - Seasons via weekOfYear (v0.6.1 calendar, Addendum 1 C7: two weeks per month, week 1 = early July):
//     summer 23–24 and 1–4, fall 5–10, winter 11–16 (Ukrainian Christmas ≈ 13), spring 17–22 (the Loonies: 20).
//     Holidays (content/calendar.js; GG.calendar.holidayCard): Canada Day 1, Thanksgiving 7, Halloween 8, Remembrance 9,
//     the Grey Mug 10, Christmas 11–12, NYE 12, St. Patrick's 18. Holiday cards are ids holiday_*.
//
// Year-one shape: early cards (weeks 2–12, maxWeek), mid cards (minFans 25/40/60/100/120), late cards (minWeek 12+,
// winter/spring weekOfYear windows), and twelve repeatables (once:false + cooldown) so no year runs dry.
//
// THE CAPE SAGA (chain 'cape'); the render reads state.flags.cape = velvet | curtain | charred | fireproof | none.
//   1 cape_1_pitch ── velvet ($120) ──> 2 cape_2_velvet ── wear / Baba hems ──┐        return ──> end (none)
//                  ── Mom's curtains ─> 2 cape_2_curtain ─ wear / Baba fixes ─┤  Mom wants them ──> end (none)
//                  ── no capes ──────────────────────────────────────────────> end (none)
//   3 cape_3_spin: roll on chemistry ── success ──> 4 cape_4_capes   (fans in capes)            ──> end (cape kept)
//                                    ── fail ─────> 4 cape_4_funeral (fireproof/charred/none)   ──> end
//                  safe spin / no spin ─────────────────────────────────────────────────────────> end (cape kept)
//   Helper flags capePlan / capeSpin route the branches (flagEquals) and are cleared (false) when the chain ends.
(function (GG) {
  var GL = ['garage', 'local'], GLS = ['garage', 'local', 'signed'], LS = ['local', 'signed'], L = ['local'], S = ['signed'];
  function g(extra) {
    var gate = { era: ['garage'], genre: ['metal'], band: ['hail_damage'] };
    for (var k in extra) gate[k] = extra[k];
    return gate;
  }
  // Shared effect fragments, frozen so no consumer can mutate one card's effects through another.
  var END = Object.freeze({ cape: Object.freeze({ step: 'end' }) });      // the Cape Saga is over
  var CLEAN = Object.freeze({ capePlan: false, capeSpin: false });        // clear the saga's helper flags
  function endFlags(cape) { return { cape: cape, capePlan: false, capeSpin: false }; }

  GG.content.cards = [
    // ======================================================================
    // Week one (forced)
    // ======================================================================
    { id: 'lord_abyssus', type: 'drama', speaker: 'marcel', title: 'Lord Abyssus', forceWeek: 1, gate: g({}),
      text: "Marcel arrives at the first real rehearsal in eyeliner and his Prairie Mutual Insurance lanyard. " +
        "From now on, he announces, he answers only to 'Lord Abyssus'. He waits. Kenji, in sunglasses, also waits.",
      choices: [
        { label: "'Yes, Lord Abyssus.'", effects: { mood: { marcel: 8 }, chemistry: 2 },
          outcome: "He bows so low his lanyard hits the floor. Dana asks if she can be 'Lady Sweep'. Nobody answers her." },
        { label: "'Marcel, you sell hail insurance.'", effects: { mood: { marcel: -6, kenji: 3 } },
          outcome: "Marcel puts on sunglasses to show he isn't listening. Kenji, already in sunglasses, gives him a slow nod. A dangerous alliance forms." },
        { label: 'Only on stage. Deal?', effects: { mood: { marcel: 4 }, chemistry: 3 },
          outcome: "Deal. He then introduces himself to the pizza guy as Lord Abyssus. The pizza guy says 'cool' and means it. Close enough." }
      ] },

    // ======================================================================
    // The Cape Saga (chain 'cape', steps 1–4)
    // ======================================================================
    { id: 'cape_1_pitch', type: 'drama', speaker: 'marcel', title: 'A Cape for Lord Abyssus', chain: 'cape', step: 1,
      weight: 3, gate: g({ era: GLS, minWeek: 3 }),
      text: "Marcel slides a costume catalogue across your snare. Page 12: 'The Nocturne', crushed purple velvet, floor length, $120. " +
        "'Lord Abyssus cannot scream about the void in a hoodie from the Co-op.'",
      choices: [
        { label: 'Buy the velvet cape ($120)',
          effects: { fund: -120, mood: { marcel: 10 }, flags: { capePlan: 'velvet' }, chain: { cape: { step: 2, delay: 2 } } },
          outcome: 'Marcel orders it express from a costume shop in Winnipeg, then refreshes the tracking page forty times a day.' },
        { label: "Mom's old curtains?",
          effects: { mood: { marcel: 3 }, flags: { capePlan: 'curtain' }, chain: { cape: { step: 2, delay: 1 } } },
          outcome: "Your mom donates the living-room drapes from 1987: mustard, with florals. Marcel stares at them a long time. 'They will do,' he whispers." },
        { label: 'No capes. Ever.',
          effects: { mood: { marcel: -10, dana: 3 }, flags: { cape: 'none' }, chain: END },
          outcome: 'Marcel turns his lawn chair to face the wall. For a week he communicates only through Kenji, who does not communicate.' }
      ] },

    { id: 'cape_2_velvet', type: 'drama', speaker: 'marcel', title: 'The Cape Arrives', chain: 'cape', step: 2,
      gate: g({ era: GLS, flagEquals: { capePlan: 'velvet' } }),
      text: "The box from Winnipeg is here. The Nocturne was cut for a man seven feet tall. Marcel, five-foot-eight, " +
        'looks like a sad bat trapped in a purple tent. He has never been happier.',
      choices: [
        { label: "Wear it as-is. It's metal.",
          effects: { flags: { cape: 'velvet' }, mood: { marcel: 6 }, burnout: 3, chain: { cape: { step: 3, delay: 1 } } },
          outcome: "He trips on it twice during 'Ma Pelouse, Mon Tombeau' and calls it 'the choreography'. Honestly? It's working." },
        { label: 'Get Baba to hem it',
          effects: { flags: { cape: 'velvet' }, mood: { jaxon: 6 }, chemistry: 4, chain: { cape: { step: 3, delay: 2 } } },
          outcome: "Jaxon's baba hems it in one evening and sews in a secret pocket 'for perogies, in case'. Marcel weeps quietly into the velvet." },
        { label: 'Return it for a refund',
          effects: { fund: 90, mood: { marcel: -8 }, flags: endFlags('none'), chain: END },
          outcome: 'The shop keeps a $30 restocking fee. Marcel writes a French lament about it. Gord translates it online: it is about his lawn.' }
      ] },

    { id: 'cape_2_curtain', type: 'drama', speaker: 'mom', title: 'The Curtain Cape', chain: 'cape', step: 2,
      gate: g({ era: GLS, flagEquals: { capePlan: 'curtain' } }),
      text: "Mom's drapes are now a cape. It still has the curtain hooks, so it jingles when Marcel walks. " +
        "He calls it 'the bells of doom'. Your mom asks if the neighbours can see into the living room now. They can.",
      choices: [
        { label: "It's perfect. Ship it.",
          effects: { flags: { cape: 'curtain' }, mood: { marcel: 6 }, chain: { cape: { step: 3, delay: 1 } } },
          outcome: 'Marcel jingles to the mirror and back eleven times. The mustard florals catch the light. Menacing, in a 1987 way.' },
        { label: 'Baba, can you fix the hooks?',
          effects: { flags: { cape: 'curtain' }, mood: { jaxon: 5 }, chemistry: 4, chain: { cape: { step: 3, delay: 2 } } },
          outcome: "Baba swaps the hooks for a hood. 'Now he looks like a monk who mows.' Marcel takes this as the highest compliment." },
        { label: 'Give Mom her drapes back',
          effects: { mood: { marcel: -8 }, burnout: -3, flags: endFlags('none'), chain: END },
          outcome: 'The drapes go back up. At dusk Marcel stands outside the living-room window, staring in at them. Your mom closes them.' }
      ] },

    { id: 'cape_3_spin', type: 'drama', speaker: 'marcel', title: 'The Abyssal Spin', chain: 'cape', step: 3,
      gate: g({ era: GLS, flags: ['cape'] }),
      text: "Marcel has been practising a move in the driveway: the Abyssal Spin, a full 360 in the breakdown, cape flaring. " +
        'Tonight is the dress rehearsal. The space heater is on high. Dad asks if anyone has checked the extinguisher since 2009.',
      choices: [
        { label: 'Full spin. Heater stays on.', hint: 'Gamble: legend or fire hazard',
          outcome: 'Marcel steps to his mark. The breakdown drops. He spins.',
          roll: { chance: 0.55, stat: 'chemistry', statScale: 0.01,
            success: { effects: { buzz: 8, fans: 12, mood: { marcel: 10 }, flags: { capeSpin: 'legend' }, chain: { cape: { step: 4, delay: 2 } } },
              outcome: 'The cape flares like a thundercloud. Jaxon films it. By morning half of Saskatoon has watched a man in a cape spin in a garage.' },
            fail: { effects: { buzz: 5, mood: { marcel: -8 }, flags: { cape: 'charred', capeSpin: 'burnt' }, chain: { cape: { step: 4, delay: 1 } } },
              outcome: "Rotation two: the hem kisses the space heater. Rotation three: the cape is on fire. Dad empties the extinguisher. It works. It's from 2009." } } },
        { label: 'Spin, but heater off',
          effects: { buzz: 3, mood: { marcel: 3 }, burnout: 4, flags: CLEAN, chain: END },
          outcome: "It's six degrees in the garage. The spin is flawless. Only you and Mr. Lindqvist see it. He gives it a seven." },
        { label: 'No spin. Stand menacingly.',
          effects: { mood: { marcel: -5 }, chemistry: 3, flags: CLEAN, chain: END },
          outcome: "Marcel stands perfectly still through the whole breakdown. Somebody's uncle calls it 'avant-garde'. The cape lives to see another Tuesday." }
      ] },

    { id: 'cape_4_capes', type: 'fame', speaker: 'gord', title: 'Cape Night', chain: 'cape', step: 4,
      gate: g({ era: GLS, flagEquals: { capeSpin: 'legend' } }),
      text: 'The spin video did numbers. Fans now come to shows in capes: bath towels, a green stadium blanket, a garbage bag. ' +
        'Gord made his from a tarp. They all want to spin with Lord Abyssus. The fire marshal would like a word.',
      choices: [
        { label: 'Lead a cape parade',
          effects: { fans: 20, buzz: 10, burnout: 5, flags: CLEAN, chain: END },
          outcome: "Thirty capes spin down Broadway Avenue behind Marcel. A city bus waits patiently. Star-Pheasant headline: 'Local Cult Harmless, Say Police'." },
        { label: 'Sell capes at the merch table',
          effects: { fund: 150, fans: 8, flags: CLEAN, chain: END },
          outcome: "Your mom sews 25 capes out of old bedsheets. They sell out in an hour. She is now the band's most profitable member." },
        { label: 'Spin with every single fan',
          effects: { fans: 12, chemistry: 5, burnout: 8, mood: { marcel: 12 }, flags: CLEAN, chain: END },
          outcome: 'Marcel spins with all 31 of them, one at a time. It takes the whole night. He throws up in the parking lot, triumphant.' }
      ] },

    { id: 'cape_4_funeral', type: 'drama', speaker: 'marcel', title: 'A Cape Funeral', chain: 'cape', step: 4,
      gate: g({ era: GLS, flagEquals: { capeSpin: 'burnt' } }),
      text: "Marcel holds a funeral for the cape in the backyard and reads a eulogy in French. Gord translates it online: " +
        "it's mostly about the lawn, which also got a little scorched. The remains lie in state on Dad's lawnmower.",
      choices: [
        { label: 'Buy a fireproof cape ($150)',
          effects: { fund: -150, mood: { marcel: 12 }, flags: endFlags('fireproof'), chain: END },
          outcome: 'Welding-supply silver, rated to a thousand degrees. Marcel now spins next to the space heater on purpose, holding eye contact.' },
        { label: 'Wear the charred remains',
          effects: { buzz: 6, mood: { marcel: 6 }, flags: endFlags('charred'), chain: END },
          outcome: "Black, tattered, smelling faintly of fabric softener and smoke. The most metal thing the band owns. Marcel names it 'Cendrillon'. Cinderella." },
        { label: 'Bury it under the lawn',
          effects: { mood: { marcel: -5 }, chemistry: 5, flags: endFlags('none'), chain: END },
          outcome: "You bury it under the lawn by moonlight. Kenji plays one low note. Marcel says the grass will grow back darker. He's right." }
      ] },

    // ======================================================================
    // Drama: signature cards per member
    // ======================================================================
    { id: 'dana_gear_specs', type: 'drama', speaker: 'dana', title: 'Gwendolyn', gate: g({ minWeek: 2, maxWeek: 10 }),
      text: "Dana found a used eight-string at a pawn shop on 20th Street. 'Baritone scale. Stainless frets. Pickups hotter " +
        "than a grain bin in July.' It's $180. She has already named it Gwendolyn.",
      choices: [
        { label: 'Buy it for the band', effects: { fund: -180, mood: { dana: 12 }, skill: { dana: 2 } },
          outcome: "The first low chug shakes the dust off Dad's lawnmower. Dana's solos gain two minutes. Nobody is sure that's a win." },
        { label: 'Half from the band fund', effects: { fund: -90, mood: { dana: 6 } },
          outcome: "Dana covers the rest by selling a pedal she calls 'my second-favourite child'. Gwendolyn comes home." },
        { label: 'You have a guitar, Dana.', effects: { mood: { dana: -8 } },
          outcome: "Dana replies in gear specs for twenty minutes. You're fairly sure some of them were insults." }
      ] },

    { id: 'jaxon_baba_lunch', type: 'drama', speaker: 'baba', title: 'A Roaster of Perogies', weight: 2,
      gate: g({ minWeek: 2, maxWeek: 8 }),
      text: "Jaxon's baba has sent a roaster of perogies 'for the band, because you are all too skinny and the drummer, " +
        "{player}, looks tired.' Taped to the lid: 'JAXON HOME BY 10.'",
      choices: [
        { label: 'Eat together, thank Baba', effects: { chemistry: 4, burnout: -5, mood: { all: 4 } },
          outcome: 'Forty-eight perogies, sour cream, fried onions. Kenji eats nine without removing his sunglasses. The band has never felt closer.' },
        { label: 'Invite Baba to rehearsal', effects: { chemistry: 3, mood: { jaxon: -5 }, skill: { jaxon: 1 } },
          outcome: "Baba rates each song out of ten from a lawn chair. 'Ma Pelouse, Mon Tombeau' gets a four: 'Too much yelling. The drummer is nice.' Jaxon wants to evaporate." },
        { label: 'Rehearse past 10 anyway', effects: { skill: { all: 1 }, mood: { jaxon: -8 }, flags: { babaMad: true } },
          outcome: "Jaxon's phone rings at 10:01. And 10:02. And 10:03. He leaves at 10:04, head down. The riffs are tighter. Baba is not." }
      ] },

    { id: 'jaxon_grounded', type: 'drama', speaker: 'baba', title: 'Grounded', weight: 2, gate: g({ era: GLS, flags: ['babaMad'] }),
      text: "Baba has grounded Jaxon for coming home 'smelling like amplifier'. He may still rehearse, she says, " +
        'but only in her basement, next to the chest freezer, where she can hear.',
      choices: [
        { label: "Rehearse in Baba's basement", effects: { chemistry: 5, mood: { jaxon: 5 }, flags: { babaMad: false } },
          outcome: "The basement acoustics are incredible. Baba's notes: 'Louder, the drummer. The French one, less.' She serves soup at the break." },
        { label: 'Bring Baba flowers', effects: { fund: -30, mood: { jaxon: 8 }, flags: { babaMad: false } },
          outcome: 'You arrive with carnations from the Co-op. Baba inspects them, then you, then approves both. Jaxon is ungrounded by supper.' },
        { label: 'Sneak him out the window', hint: 'Gamble: Baba sees everything',
          outcome: 'Jaxon opens the bedroom window. It squeaks. Everybody freezes.',
          roll: { chance: 0.35,
            success: { effects: { mood: { jaxon: 10 }, buzz: 3, flags: { babaMad: false } },
              outcome: 'Jaxon drops from the window like a ninja in a toque. Baba sleeps through it. Or lets him think she did.' },
            fail: { effects: { mood: { jaxon: -10 }, chemistry: -3 },
              outcome: 'Baba is waiting in the yard, in a lawn chair, in the dark. She says one word in Ukrainian. Everyone goes home.' } } }
      ] },

    { id: 'kenji_silent_nod', type: 'drama', speaker: 'kenji', title: 'The Nod', weight: 2, gate: g({ minWeek: 3, maxWeek: 12 }),
      text: 'Mid-song, Kenji turns to face you. Then it happens: a single, silent nod. Dana drops her pick. Marcel stops screaming. ' +
        'In the history of the band, nobody has ever received the nod.',
      choices: [
        { label: 'Nod back. Coolly.', effects: { chemistry: 5, mood: { kenji: 5 }, drumSkill: 1 },
          outcome: "You nod back. Kenji nods again, slightly less. You have had a conversation. You'll be thinking about it for weeks." },
        { label: 'Ask him what it meant', effects: { mood: { kenji: -6 }, chemistry: -2 },
          outcome: 'Kenji looks at you through his sunglasses for four full minutes, then leaves. His bass is still humming.' },
        { label: 'Tell the group chat',
          effects: { chemistry: 3, mood: { kenji: -3, jaxon: 5 },
            chat: { who: 'jaxon', text: 'WAIT kenji NODDED?? at the DRUMMER?? screenshot or it didnt happen' } },
          outcome: 'The group chat explodes. Kenji leaves it, then rejoins it. Everyone agrees that counts as a second nod.' }
      ] },

    { id: 'jaxon_shred_fill', type: 'drama', speaker: 'jaxon', title: 'The Sneaky Fill', gate: g({ minWeek: 4, maxWeek: 16 }),
      text: 'During the simplest chug in the set, Jaxon sneaks in a 32nd-note shred fill. Then another. He glances around ' +
        'like nobody noticed. Everybody noticed. Dana noticed the most.',
      choices: [
        { label: 'Give him a solo spot', effects: { mood: { jaxon: 10, dana: -6 }, skill: { jaxon: 2 } },
          outcome: "Jaxon gets eight bars in 'Le Tombeau Vert'. He uses them, and some of the next song's. Dana starts practising eleven hours a day." },
        { label: 'Keep it simple, Rip.', effects: { mood: { jaxon: -6 }, chemistry: 3 },
          outcome: 'Jaxon plays it straight for exactly one rehearsal. Then the fills come back, quieter, like raccoons.' },
        { label: "Pretend you didn't hear", effects: { skill: { jaxon: 1 }, mood: { jaxon: 3 } },
          outcome: 'The fills get sneakier. You start hearing them in your sleep. Kenji definitely hears them. He says nothing, obviously.' }
      ] },

    { id: 'marcel_lawn_lyrics', type: 'drama', speaker: 'gord', title: 'Lost in Translation', gate: g({ era: GL, minFans: 40 }),
      text: "A fan named Gord translated 'Le Tombeau Vert' on the band's fan page. It's about Marcel's lawn. All nine verses. " +
        'Verse six is just fertilizer ratios. Marcel has not left the bathroom in an hour.',
      choices: [
        { label: "Lean in: we're lawn metal", effects: { buzz: 8, fans: 10, mood: { marcel: -6 } },
          outcome: "'Lawn metal' trends on a Saskatoon forum for most of a Tuesday. Marcel is furious and also secretly thrilled." },
        { label: 'Call it a metaphor', effects: { buzz: 3, mood: { marcel: 6 } },
          outcome: 'Marcel explains that the lawn represents death. And also his lawn. Gord accepts this. Gord accepts everything.' },
        { label: 'Deny everything in French', effects: { mood: { marcel: 10 }, buzz: -2 },
          outcome: "Marcel posts a 400-word denial in French. Gord translates it. It's about the lawn again." }
      ] },

    { id: 'dana_endless_solo', type: 'drama', speaker: 'dana', title: 'The Eleven-Minute Solo', gate: g({ era: GL, minFans: 40 }),
      text: "Dana's solo in 'Le Tombeau Vert' is now eleven minutes long. The song is four minutes long. The math doesn't work, " +
        'but somehow she makes it work. Marcel has started bringing a book.',
      choices: [
        { label: 'Let it rip', effects: { mood: { dana: 10 }, burnout: 6, buzz: 3 },
          outcome: 'At the next show a man falls asleep during the solo and wakes up still in the solo. He buys a shirt.' },
        { label: 'Cap it at 90 seconds', effects: { mood: { dana: -8 }, chemistry: 4 },
          outcome: 'Dana agrees. Her 90 seconds somehow contain more notes than the eleven minutes did. Marcel finishes his book anyway.' },
        { label: 'Duel her on drums', hint: 'Gamble: your arms vs her ten-hour days',
          outcome: 'You count it in. Dana smiles the smile of someone with calluses on her calluses.',
          roll: { chance: 0.6, stat: 'drumSkill', statScale: 0.006,
            success: { effects: { drumSkill: 2, mood: { dana: 6 }, chemistry: 5 },
              outcome: 'A fourteen-minute drum-guitar duel. Marcel lies on the floor in awe. Dana shakes your hand and quotes your tempo back to you.' },
            fail: { effects: { burnout: 10, mood: { dana: 4 } },
              outcome: "You tap out at minute nine. Dana doesn't notice. She finishes at minute twenty-two, alone, triumphant." } } }
      ] },

    { id: 'kenji_vanishes', type: 'drama', speaker: 'kenji', title: 'The Empty Corner', gate: g({ era: GLS, minWeek: 14 }),
      text: "Kenji hasn't been to rehearsal in two weeks. His bass is still in the corner, with a postcard propped against it " +
        'from Churchill, Manitoba. It is blank. The polar bear on the front looks smug.',
      choices: [
        { label: 'Learn his parts yourself', effects: { drumSkill: 2, burnout: 8 },
          outcome: 'You play the bass lines on your floor tom for two weeks. It technically counts. Kenji returns Thursday as if nothing happened.' },
        { label: 'Hire a fill-in bassist', effects: { fund: -60, chemistry: -3 },
          outcome: "The fill-in plays everything like a ska song. Kenji returns Thursday, silently carries the fill-in's amp to the curb, and plugs in." },
        { label: 'Leave his corner as is', effects: { mood: { kenji: 10 }, chemistry: 4 },
          outcome: 'You dust around his bass like a shrine. He returns Thursday, sees it, and gives the whole room a nod. Jaxon has to sit down.' }
      ] },

    { id: 'drama_setlist_fight', type: 'drama', speaker: 'marcel', title: 'The Opener', once: false, cooldown: 8,
      gate: g({ era: GLS, minWeek: 8 }),
      text: "The group chat is on fire: should the set open with 'Ma Pelouse, Mon Tombeau' or Dana's new instrumental? " +
        'Marcel has sent fourteen voice memos. Dana has sent one spreadsheet.',
      choices: [
        { label: "Marcel's song opens", effects: { mood: { marcel: 8, dana: -6 } },
          outcome: "Marcel celebrates with a fifteenth voice memo. It's just him breathing heavily, victoriously." },
        { label: "Dana's instrumental opens", effects: { mood: { dana: 8, marcel: -6 } },
          outcome: "Dana updates the spreadsheet. Marcel says an instrumental is 'a song with the best part missing'." },
        { label: 'Let Kenji decide', effects: { chemistry: 4 },
          outcome: "Kenji points at the set list. It's blank. Somehow everyone agrees it's perfect. Nobody knows what you're opening with." }
      ] },

    { id: 'dana_prog_offer', type: 'drama', speaker: 'dana', title: 'A Message from Calgary', once: false, cooldown: 10, weight: 3,
      gate: g({ era: GLS, moodBelow: { dana: 35 } }),
      text: "Dana leaves her phone face-up on her amp. On the screen, a message from a Calgary prog band called Seventeen Moons: " +
        "'Our songs are 23 minutes. Our solos have solos.' She pretends not to see you reading it.",
      choices: [
        { label: 'Buy her the pedal ($110)', effects: { fund: -110, mood: { dana: 12 } },
          outcome: 'A boutique fuzz with eleven knobs. Dana names each knob. Then she deletes the message in front of you, slowly, for effect.' },
        { label: 'Promise longer solos', effects: { mood: { dana: 8, marcel: -4 } },
          outcome: 'Dana gets two extra minutes a night. Marcel files a formal complaint on an actual insurance form.' },
        { label: 'Prog shows have no mosh pit', effects: { mood: { dana: 5 }, chemistry: 3 },
          outcome: "Dana considers this. 'No mosh pit,' she repeats. 'Just people... nodding.' She shudders and stays." }
      ] },

    { id: 'marcel_sulk', type: 'drama', speaker: 'marcel', title: 'Lord Abyssus Is in His Car', once: false, cooldown: 10, weight: 3,
      gate: g({ era: GLS, moodBelow: { marcel: 35 } }),
      text: 'Marcel has been sitting in his car in the driveway for three hours, engine off, dome light on, writing in a notebook. ' +
        'Occasionally he laughs darkly.',
      choices: [
        { label: 'Knock on the window', effects: { mood: { marcel: 8 }, chemistry: 2 },
          outcome: "He rolls it down two centimetres. 'I am writing my solo album.' You tell him the band needs him. He rolls it down four more." },
        { label: 'Promise him the spotlight', effects: { mood: { marcel: 12, dana: -4 }, buzz: 2 },
          outcome: "You promise him a solo spotlight at the next show. He exits the car like it's a limousine." },
        { label: 'Leave him be', effects: { mood: { marcel: 4 }, burnout: -3 },
          outcome: "At midnight he walks in, says 'I have forgiven you all,' and leaves. Nobody knows what for." }
      ] },

    { id: 'marcel_first_mow', type: 'drama', speaker: 'marcel', title: 'The First Mow', once: false, cooldown: 12,
      gate: g({ era: GLS, weekOfYear: [20, 23] }),
      text: 'The first mow of spring. Marcel has declared it a band holiday: everyone in his backyard at dawn, in black, ' +
        'for the Ritual of the First Mow. He has written a liturgy. It is in French.',
      choices: [
        { label: 'Attend the ritual', effects: { mood: { marcel: 10 }, chemistry: 3 },
          outcome: "Dawn. Marcel mows a perfect pentagram, then carefully stripes over it. Kenji holds the gas can like a relic. It's weirdly moving." },
        { label: 'Film it for the fans', effects: { buzz: 6, fans: 6, mood: { marcel: 4 } },
          outcome: 'A man in eyeliner mowing at dawn to a Gregorian chant. It goes around. Three lawn-care companies follow the band.' },
        { label: 'Rehearse without him', effects: { skill: { all: 1 }, mood: { marcel: -8 } },
          outcome: 'Through the garage window you watch Marcel mow alone, slowly, like a sad and beautiful ghost.' }
      ] },

    { id: 'drama_goose_amp', type: 'drama', speaker: 'dana', title: 'The Goose in the Amp', once: false, cooldown: 9,
      gate: g({ era: GLS, minWeek: 6 }),
      text: "Dana's amp has started making a noise she describes as 'a goose in a blender, but sad'. She has diagnosed it " +
        'forty different ways. She will not play through it. She will also not leave the garage.',
      choices: [
        { label: 'Repair shop ($70)', effects: { fund: -70, mood: { dana: 6 } },
          outcome: 'The repair guy finds a Saskatoon berry in the input jack. Nobody admits anything. Jaxon is very quiet.' },
        { label: 'Let Kenji look at it', hint: 'Gamble: Kenji knows things. Maybe.',
          outcome: 'Kenji crouches by the amp. Everyone holds their breath.',
          roll: { chance: 0.6,
            success: { effects: { mood: { dana: 8, kenji: 4 }, chemistry: 3 },
              outcome: 'He opens the back, stares for ten seconds, taps one tube and closes it. The goose is gone. Dana looks at him in awe.' },
            fail: { effects: { burnout: 5, mood: { dana: -5 } },
              outcome: 'He opens the back, stares, closes it and walks away. The goose is louder now. Dana names it Gerald.' } } },
        { label: 'Play through the goose', effects: { buzz: 2, mood: { dana: -6 } },
          outcome: "You play the whole set with the goose. Someone online calls it 'a bold textural choice'. Dana files that under insults." }
      ] },

    { id: 'drama_band_photo', type: 'drama', speaker: 'marcel', title: 'The Band Photo', once: false, cooldown: 10,
      gate: g({ era: GLS, minWeek: 5 }),
      text: 'The band needs a new photo. Marcel wants a cemetery at dusk. Dana wants to pose with her gear, all of it. Jaxon ' +
        'has to be home by ten. Kenji has already sent a photo of himself. It is completely black.',
      choices: [
        { label: 'Cemetery at dusk', effects: { buzz: 5, mood: { marcel: 8 }, burnout: 3 },
          outcome: "Everyone looks haunted and cold. Mostly cold. A groundskeeper asks if you're lost. Marcel says 'eternally'. Best shot you have." },
        { label: 'Gear shot in the garage', effects: { buzz: 3, mood: { dana: 8 } },
          outcome: 'Eleven guitars, four amps, one drum kit and five people barely visible behind it. Dana makes it her phone background.' },
        { label: "Use Kenji's black photo", effects: { chemistry: 4, mood: { kenji: 6 } },
          outcome: "It goes up as the new band photo. Fans call it 'bold' and 'very Hail Damage'. Kenji changes his profile picture to it too." }
      ] },

    // ======================================================================
    // Money
    // ======================================================================
    { id: 'money_wedding_social', type: 'money', speaker: 'mom', title: 'A Wedding Social in Humboldt',
      gate: g({ minWeek: 3, maxWeek: 14 }),
      text: "Your mom's cousin is getting married in Humboldt and the DJ quit. 'You kids play music, right? Can you do the " +
        "Chicken Dance? In a metal way?' It pays $150 and all the kielbasa you can carry.",
      choices: [
        { label: 'Metal Chicken Dance', effects: { fund: 150, buzz: 3, mood: { marcel: -6 } },
          outcome: 'The metal Chicken Dance destroys. A great-aunt headbangs. Marcel refuses to sing in English, so he screams it in French. Nobody minds.' },
        { label: 'Only our originals', effects: { fund: 60, fans: 6, mood: { marcel: 6 } },
          outcome: "'Ma Pelouse, Mon Tombeau' becomes the first dance. The bride weeps, possibly the good way. They dock you $90 for 'the yelling'." },
        { label: 'Politely decline', effects: { burnout: -4 },
          outcome: "Your mom tells her cousin you're 'on tour'. You're in the garage. The DJ is replaced by a nephew with a phone." }
      ] },

    { id: 'money_bottle_drive', type: 'money', speaker: 'jaxon', title: 'Bottle Drive', once: false, cooldown: 6,
      gate: g({ era: GL, minWeek: 3 }),
      text: "Jaxon has a fundraising plan: a bottle drive. His sign reads 'HAIL DAMAGE BOTTLE DRIVE: SUPPORT LOCAL METAL'. " +
        'Baba laminated it. There are fourteen streets between here and Circle Drive.',
      choices: [
        { label: 'Hit every street', effects: { fund: 70, burnout: 6, fans: 3 },
          outcome: "Forty bags of empties, three new fans and one retired dentist who asks if metal is 'the loud one'. It is." },
        { label: 'Just our street', effects: { fund: 25, chemistry: 2 },
          outcome: "You get Mr. Lindqvist's empties and a lecture about noise. Jaxon tapes the sign to the garage door, 'for branding'." },
        { label: 'Not tonight, Rip.', effects: { burnout: -5 },
          outcome: 'Jaxon sighs and leans the sign in the corner, next to Kenji. They look good together.' }
      ] },

    { id: 'money_bingo_palace', type: 'money', speaker: 'lorraine', title: 'Bingo Palace', gate: g({ era: GL, minWeek: 4 }),
      text: "Lorraine from the Bingo Palace needs an intermission act between the early bird and the late game. " +
        "'Under ten minutes, and nobody touches the ball machine.' Or you could just play bingo.",
      choices: [
        { label: 'Take the intermission slot', effects: { book: 'bingo_palace', mood: { jaxon: 4 } },
          outcome: "Lorraine books you for the weekend. Jaxon's baba is a regular. She's already telling people her grandson is 'the talent'." },
        { label: 'Play bingo instead', hint: 'Gamble: $30 in cards for glory', effects: { fund: -30 },
          outcome: "You buy six cards and a lucky dauber. Marcel picks a purple one 'for power'.",
          roll: { chance: 0.3,
            success: { effects: { fund: 200, buzz: 3 },
              outcome: 'B-4. Marcel screams BINGO in French. Lorraine allows it. $200 and a standing ovation from a table of night-shift nurses.' },
            fail: { effects: { mood: { marcel: -4 } },
              outcome: 'Close on four cards, winner on none. A woman named Irene wins twice and blows Marcel a kiss. He is shaken.' } } }
      ] },

    { id: 'money_farmers_market', type: 'money', speaker: 'jaxon', title: "Farmers' Market", once: false, cooldown: 7,
      gate: g({ era: GL, minWeek: 4 }),
      text: "The farmers' market lets anyone busk by the kettle corn on Saturdays. Jaxon has claimed a spot between a honey stand " +
        "and a man who sharpens knives. Baba has sent a cooler of perogies 'to sell, not to eat'.",
      choices: [
        { label: 'Play a full set', effects: { fund: 60, fans: 4, burnout: 5 },
          outcome: 'A full metal set at 10 a.m., between the honey and the knives. The honey lady buys a shirt. The knife man nods along, which is unsettling.' },
        { label: "Sell Baba's perogies", effects: { fund: 80, chemistry: 2 },
          outcome: "Sold out by eleven. Baba's cut is 60 percent. She is a tougher negotiator than any promoter in Saskatchewan." },
        { label: 'Unplugged, for the kids', effects: { fans: 6, buzz: 3, mood: { marcel: -4 } },
          outcome: 'Marcel screams in French over an acoustic guitar. A toddler screams back. They share a moment. Several parents film it.' }
      ] },

    { id: 'money_garage_sale', type: 'money', speaker: 'mom', title: 'Garage Sale Saturday', once: false, cooldown: 12,
      gate: g({ era: GLS, minWeek: 2, weekOfYear: [2, 8] }),
      text: "Your mom is having a garage sale. In the garage. Your rehearsal space. Saturday. 'Just move the drums a bit, honey. " +
        "Maybe someone will buy the amps.' People are already circling in the alley.",
      choices: [
        { label: 'Sell some old gear', effects: { fund: 80, mood: { dana: -5 } },
          outcome: "You sell a busted amp, two cracked cymbals and Dana's 'backup backup' cable. She holds a small memorial." },
        { label: 'Play a set for shoppers', effects: { fans: 6, fund: 20, buzz: 2 },
          outcome: "Three songs between the card tables. A man buys a lamp and your demo. He says both are 'for the cabin'." },
        { label: 'Help Mom, skip rehearsal', effects: { burnout: -5, chemistry: 2 },
          outcome: 'Mom clears $311 and sells Marcel a lamp shaped like a loon. He puts it by his mirror. It watches.' }
      ] },

    { id: 'money_moving_day', type: 'money', speaker: 'dale', title: 'Cousin Dale Is Moving', once: false, cooldown: 8,
      gate: g({ era: GLS, minWeek: 5 }),
      text: "Cousin Dale is moving again, Sutherland to Stonebridge this time. He'll pay $90 and pizza if the band helps. " +
        "'Easy job,' he says. 'Mostly boxes.' He does not mention the piano.",
      choices: [
        { label: 'Move the piano', effects: { fund: 90, burnout: 8 },
          outcome: 'Three flights of stairs. Kenji carries one end alone. Nobody asks how. Dale tips extra, in pizza.' },
        { label: 'Send Jaxon and Dana', effects: { fund: 45, mood: { jaxon: -4, dana: -4 } },
          outcome: 'They come back three hours later, silent, holding one pizza box. Dana says the piano was out of tune. She checked.' },
        { label: "Tell Dale you're touring", effects: { burnout: -3 },
          outcome: "Dale says 'In what?' Fair question. You don't have a van. You have Dad's truck, with a towel on every seat." }
      ] },

    { id: 'money_night_school', type: 'money', speaker: 'mom', title: 'Night School', once: false, cooldown: 8, weight: 2,
      gate: g({ era: GLS, flags: ['parentsLoan'] }),
      text: "There's a Prairie Polytechnic pamphlet on your snare: 'Bookkeeping for Small Business, Thursdays.' A sticky note " +
        "from Mom: 'No pressure!! Love Mom.' Under it, a smaller one: 'Some pressure.'",
      choices: [
        { label: 'Promise to pay her back', effects: { burnout: 4, chemistry: 2 },
          outcome: "You write an IOU on an old drumhead. Mom frames it and hangs it in the hallway at eye level, where you'll see it every day." },
        { label: 'Take the night class', effects: { fund: 40, burnout: 8 },
          outcome: 'You learn double-entry bookkeeping. The band finances improve, mostly by accident. Marcel asks if capes are deductible.' },
        { label: 'Mow the lawn for her', effects: { burnout: 3, mood: { marcel: 4 } },
          outcome: 'Marcel supervises from the driveway and critiques your stripes. Mom is thrilled. The pamphlet stays on the snare.' }
      ] },

    { id: 'money_dad_spreadsheet', type: 'money', speaker: 'dad', title: 'Where Did It Go', gate: g({ era: GLS, flags: ['parentsLoan'] }),
      text: "Dad has printed a spreadsheet and taped it to the garage door: 'HAIL DAMAGE: WHERE DID IT GO'. " +
        "Column C is labelled 'drumsticks??'. There are a lot of drumsticks.",
      choices: [
        { label: 'Walk Dad through it', effects: { burnout: 4, chemistry: 2 },
          outcome: "You explain that drumsticks break. Dad adds a column called 'breaks??' and hugs you on the way out. Weird. Nice." },
        { label: 'Hand the books to Dana', effects: { fund: 30, mood: { dana: -5 } },
          outcome: 'Dana cuts spending 12 percent and itemizes her string gauges. Dad is so impressed he asks her to do his taxes.' },
        { label: 'Sell your spare cymbal', effects: { fund: 60, burnout: 3 },
          outcome: 'The cymbal goes to a kid in Warman. Dad crosses off one line of the spreadsheet with a highlighter. It is a start.' }
      ] },

    // ======================================================================
    // Road (no van yet: Dad's new truck)
    // ======================================================================
    { id: 'road_dads_truck', type: 'road', speaker: 'dad', title: "Dad's New Truck", gate: g({ minWeek: 2, maxWeek: 12 }),
      text: "No van yet, so the gear rides in Dad's new truck, the one he bought with the hail insurance money. He has put a towel " +
        "on every seat. 'You scratch it, you're in Marcel's next claim.'",
      choices: [
        { label: 'Borrow the truck', hint: "Gamble: Dad's truck vs Dana's amps",
          outcome: "You load it like a museum exhibit. Jaxon rides with the cymbals on his lap.",
          roll: { chance: 0.6, stat: 'chemistry', statScale: 0.005,
            success: { effects: { chemistry: 3, burnout: -3 },
              outcome: "Not a scratch. Dad inspects it with a flashlight anyway, twice, then nods like Kenji. You didn't know he could do that." },
            fail: { effects: { fund: -150 },
              outcome: "Dana's amp dents the tailgate. Dad just says 'Hm.' The 'Hm' costs $150 and a lot of eye contact." } } },
        { label: 'Rent a trailer ($80)', effects: { fund: -80, chemistry: 2 },
          outcome: "The Hitch-N-Haul trailer has a slow leak and a sticker that says 'I brake for gophers'. It gets you there. Dad waves, relieved." },
        { label: 'Take the city bus', effects: { burnout: 8, fans: 4 },
          outcome: "The 8 bus through Sutherland with a full drum kit. A lady helps carry the floor tom. She's coming to the show now." }
      ] },

    { id: 'road_late_drive', type: 'road', speaker: 'marcel', title: 'Highway 16 at 2 A.M.', gate: g({ minWeek: 5, minFans: 30 }),
      text: "Driving home from a show in Dad's truck at 2 a.m. The highway is empty and the sky is enormous. Marcel wants to stop " +
        "at every grain elevator for 'album cover research'. There are a lot of grain elevators.",
      choices: [
        { label: 'Stop at every elevator', effects: { burnout: 8, buzz: 4, chemistry: 4 },
          outcome: "Seven elevators, seven album covers. Kenji is in the background of every one, somehow, even the ones he wasn't at." },
        { label: 'Straight home', effects: { burnout: -4, mood: { marcel: -5 } },
          outcome: "Marcel presses his face to the window and whispers 'adieu' to every elevator you pass. It is a long drive." },
        { label: '2 a.m. perogies', effects: { fund: -30, chemistry: 5, burnout: -3 },
          outcome: "The only place open is a truck stop near Clavet. The perogies are incredible. You'll never find it again. That's how you know." }
      ] },

    { id: 'road_block_heater', type: 'road', speaker: 'dad', title: 'Minus Forty', once: false, cooldown: 12,
      gate: g({ era: GL, weekOfYear: [11, 16] }),
      text: "Minus forty with the windchill. Dad's truck won't start because someone (Marcel) unplugged the block heater " +
        'to run a fog machine. The gear has to be across town by seven.',
      choices: [
        { label: 'Get a boost next door', effects: { chemistry: 3, burnout: 3 },
          outcome: "Mr. Lindqvist boosts the truck in his housecoat and lectures you on fog machines. He's weirdly into it. He asks about 'the haze'." },
        { label: 'Toboggan the gear over', effects: { burnout: 10, buzz: 4, fans: 3 },
          outcome: "You drag the kick drum four blocks on a toboggan. Kenji carries his bass case like a coffin. People take pictures. Very metal." },
        { label: 'Call a tow ($90)', effects: { fund: -90 },
          outcome: "The tow driver takes an hour, charges $90 and asks 'Hail Damage? Like the truck?' Yes. Exactly like the truck." }
      ] },

    { id: 'road_farm_auction', type: 'road', speaker: 'marcel', title: 'Farm Auction', gate: g({ era: GL, weekOfYear: [5, 9] }),
      text: "A farm auction near Rosthern. Lot 47: a box of 'assorted band stuff' from a 1978 polka group. Lot 48: a riding mower " +
        'Marcel has fallen in love with. The auctioneer talks faster than Dana solos.',
      choices: [
        { label: 'Bid on the band box', hint: 'Gamble: $40 for a mystery box', effects: { fund: -40 },
          outcome: "You win it for forty bucks. Jaxon carries it to the truck like it's a baby.",
          roll: { chance: 0.5,
            success: { effects: { drumSkill: 2, buzz: 3 },
              outcome: 'A vintage cowbell and a real gong. The gong becomes your closer. Mr. Lindqvist files his first complaint of the season.' },
            fail: { effects: { mood: { dana: 4 } },
              outcome: "Eleven accordion straps and a stuffed weasel. Dana says the straps are 'actually great'. The weasel lives on her amp now." } } },
        { label: 'Let Marcel bid on the mower', effects: { fund: -150, mood: { marcel: 15 } },
          outcome: 'He drives it home on the shoulder of Highway 11 at twelve kilometres an hour. It takes four hours. His lawn has never looked more metal.' },
        { label: 'Just buy pie', effects: { burnout: -6, chemistry: 3 },
          outcome: 'Saskatoon berry pie in the church basement. Everyone is in a good mood. Kenji buys a second pie and disappears with it.' }
      ] },

    // ======================================================================
    // Scene & rivals
    // ======================================================================
    { id: 'scene_fruit_basket', type: 'scene', speaker: 'wraith_frontman', title: 'A Fruit Basket from Winnipeg',
      gate: g({ era: GL, minFans: 40 }),
      text: "A fruit basket arrives. The card: 'Heard great things, buddy! Keep crushing it! Your pals, Tundra Wraith.' " +
        'Someone drew a pentagram with a smiley face in it. The pineapple is perfect.',
      choices: [
        { label: 'Send a thank-you basket', effects: { fund: -40, buzz: 3, chemistry: 2 },
          outcome: 'You send perogies. They send a thank-you card for the thank-you basket. You send a card back. This could go on forever.' },
        { label: 'Post a diss track',
          effects: { buzz: 7, fans: 6, mood: { marcel: 6 },
            chat: { who: 'wraith_frontman', text: 'Sick diss track, buddy!! Shared it with our mailing list. Go Hail Damage! 🤘🙂' } },
          outcome: "Marcel screams four minutes of French insults. Tundra Wraith share it with their whole mailing list and call it 'super fun'. It's worse than losing." },
        { label: 'Eat the fruit. Say nothing.', effects: { burnout: -5, mood: { kenji: 6 } },
          outcome: 'Kenji eats the entire pineapple. How? When? Nobody saw. The top of it sits on his amp like a trophy.' }
      ] },

    { id: 'scene_legion_doreen', type: 'scene', speaker: 'doreen', title: 'Doreen at the Legion',
      gate: g({ era: GL, minWeek: 4, minFans: 25 }),
      text: "Doreen runs the Legion Hall, Branch 63. She'll give you Saturday night on two conditions: one polka in the set, " +
        "and nobody does 'the throat thing' during the meat draw.",
      choices: [
        { label: 'Book it. Learn a polka.', effects: { book: 'legion_63', skill: { dana: 1 }, mood: { marcel: -4 } },
          outcome: 'Dana learns the polka in eleven minutes and adds a sweep-picked outro. Doreen tolerates it. The meat draw goes smoothly.' },
        { label: 'Book it. Throat thing stays.', hint: "Gamble: Doreen's patience",
          outcome: 'Marcel demonstrates the throat thing over the phone, to be transparent.',
          roll: { chance: 0.5, stat: 'buzz', statScale: 0.006,
            success: { effects: { book: 'legion_63', buzz: 6, mood: { marcel: 6 } },
              outcome: "A long pause. 'My late husband could do that,' says Doreen. You're booked. Marcel is deeply moved." },
            fail: { effects: { mood: { marcel: -5 } },
              outcome: 'Doreen hangs up mid-throat-thing and books a tribute band to a tribute band instead.' } } },
        { label: 'Maybe next time', effects: { burnout: -3 },
          outcome: "Doreen says 'your loss, dear' and books an accordion duo. You hear later that it went off." }
      ] },

    { id: 'scene_st_vlads', type: 'scene', speaker: 'baba', title: 'The Fall Supper', gate: g({ era: GL, minWeek: 4, weekOfYear: [5, 10] }),
      text: "Baba says St. Vlad's needs music for the fall supper. 'Nothing Satanic. The French one may sing, but only about " +
        "gardening.' Marcel realizes, quietly, that all of his songs already qualify.",
      choices: [
        { label: 'Play the fall supper', effects: { book: 'st_vlads_hall', mood: { jaxon: 8 } },
          outcome: "Baba tells the whole parish her grandson is in a 'Christian lawn band'. Nobody corrects her. Nobody would dare." },
        { label: 'Politely decline', effects: { mood: { jaxon: -6 } },
          outcome: "Baba says 'okay' in a way that means the opposite. Jaxon's lunch the next day is a single dry cracker." }
      ] },

    { id: 'scene_bonspiel', type: 'scene', speaker: 'barb', title: 'Bonspiel Social', gate: g({ era: GL, minFans: 60, weekOfYear: [12, 18] }),
      text: "Barb from the Warman Curling Rink wants a band for the bonspiel social: forty curlers, all named Barb or Dale. " +
        "'Metal's fine,' she says. 'We had a polka band last year. Nearly lost the roof.'",
      choices: [
        { label: 'Book the bonspiel', effects: { book: 'warman_curling_lounge', burnout: 3 },
          outcome: "Barb books you for Saturday. Jaxon asks if he can curl between sets. Barb says 'we'll see about you'." },
        { label: 'Book it and enter the draw', hint: 'Gamble: can a metal band curl?',
          outcome: 'Barb hands out brooms. Marcel holds his like a wizard staff.',
          roll: { chance: 0.45, stat: 'chemistry', statScale: 0.008,
            success: { effects: { book: 'warman_curling_lounge', fans: 12, chemistry: 5 },
              outcome: 'Kenji skips. Dana sweeps like it is a solo. You win the C event and a pro-shop gift card. Warman adopts you.' },
            fail: { effects: { book: 'warman_curling_lounge', burnout: 8, mood: { marcel: -4 } },
              outcome: "Marcel slides out of the hack in full eyeliner and doesn't stop until the far wall. You still get the gig. Barb calls it 'a lot'." } } },
        { label: 'Pass on Warman', effects: { burnout: -3 },
          outcome: 'Barb books the polka band again. You hear the roof held, barely.' }
      ] },

    { id: 'scene_ukrainian_christmas', type: 'scene', speaker: 'baba', title: 'Ukrainian Christmas Eve',
      gate: g({ era: GL, weekOfYear: [12, 14] }),
      text: "Baba invites the whole band to Ukrainian Christmas Eve on January 6th. Twelve meatless dishes. Kenji arrives with " +
        'a thirteenth. Nobody knows what it is. Baba tries it and nods at him. He nods back.',
      choices: [
        { label: 'Stay all night', effects: { chemistry: 6, burnout: -6, mood: { jaxon: 8 } },
          outcome: "Kutia, cabbage rolls, three kinds of perogies and carols in Ukrainian. Marcel harmonizes in French. Baba declares him 'acceptable'." },
        { label: 'Play carols for the family', effects: { fans: 10, buzz: 3, mood: { jaxon: 6 } },
          outcome: 'A metal carol set in Baba\'s living room. Fourteen cousins are now fans. One of them runs a bar in Yorkton.' },
        { label: 'Bring Baba a gift', effects: { fund: -40, mood: { jaxon: 10 }, chemistry: 3 },
          outcome: "Chocolates and a signed set list. Baba puts the set list on the fridge, next to Jaxon's grade three report card." }
      ] },

    { id: 'scene_open_mic', type: 'scene', speaker: 'jaxon', title: 'Open Mic Night', once: false, cooldown: 8,
      gate: g({ era: GL, minWeek: 6, minFans: 20 }),
      text: "Open mic night at The Gopher Hole. The sign-up sheet: a poet, two acoustic guitars and a man who plays spoons. " +
        "The host says you get 'two songs, no pyro and please, no French'.",
      choices: [
        { label: 'Two songs, full volume', effects: { fans: 6, buzz: 4, burnout: 4 },
          outcome: "The spoons man is visibly shaken. The poet writes a poem about you on the spot. It rhymes 'abyss' with 'hiss'." },
        { label: 'Two songs, both in French', effects: { buzz: 6, mood: { marcel: 8 } },
          outcome: "Marcel sings both in French, out of spite. The host lets it go. Half the room thinks it's poetry night and snaps politely." },
        { label: 'Just watch the spoons guy', effects: { burnout: -4, chemistry: 3 },
          outcome: "He's incredible. Kenji buys him a drink. Nobody has ever seen Kenji buy anyone a drink." }
      ] },

    { id: 'scene_wraith_visit', type: 'scene', speaker: 'wraith_frontman', title: 'Buddy Drops By',
      gate: g({ era: GL, minWeek: 12, minFans: 120 }),
      text: "Tundra Wraith are in town to play The Gopher Hole. Their frontman drops by the garage in full corpse paint and a " +
        "cardigan. He brought muffins. He asks if you're keeping receipts. 'You guys are gonna go places, buddy!'",
      choices: [
        { label: 'Ask for an opening slot', hint: "Gamble: he's too polite to say no",
          outcome: 'You ask. He beams through the corpse paint.',
          roll: { chance: 0.5, stat: 'buzz', statScale: 0.006,
            success: { effects: { fans: 20, buzz: 8 },
              outcome: "He gets you ten minutes before their set and yells 'SUPPORT LOCAL, BUDDY!' Twenty of their fans follow you home. Online, mostly." },
            fail: { effects: { buzz: 3, mood: { marcel: -8 } },
              outcome: "He says yes, remembers their contract, then apologizes for eleven minutes. A fruit basket arrives the next day. It's a nice basket." } } },
        { label: 'Challenge him to a scream-off', effects: { mood: { marcel: 8 }, buzz: 6 },
          outcome: 'Marcel screams. The frontman screams back, then apologizes for being loud. He wins anyway. He offers Marcel a lozenge.' },
        { label: 'Accept the muffins', effects: { burnout: -5, chemistry: 3 },
          outcome: "They're really good muffins. Saskatoon berry. That's the worst part. He leaves the recipe." }
      ] },

    // ======================================================================
    // Fame (gated on fans)
    // ======================================================================
    { id: 'fame_campus_radio', type: 'fame', speaker: 'dj', title: 'Midnight Mayhem', gate: g({ era: GL, minFans: 40 }),
      text: "Deb Wiebe hosts 'Midnight Mayhem' on CRUD 90.5 campus radio, Tuesdays at 2 a.m. She wants Hail Damage live in " +
        "studio. The studio is a broom closet in a university basement. She whispers 'brutal' as a compliment.",
      choices: [
        { label: 'Play live on air', hint: 'Gamble: live radio, one take',
          outcome: 'You squeeze the whole kit into the closet. The ON AIR light comes on.',
          roll: { chance: 0.55, stat: 'chemistry', statScale: 0.008,
            success: { effects: { fans: 20, buzz: 8 },
              outcome: "One take, no mistakes. Deb whispers 'brutal' four times. The phone line lights up: two night-shift nurses. Now fans." },
            fail: { effects: { buzz: 3, mood: { marcel: -5 } },
              outcome: "Marcel's first scream trips the breaker. Four minutes of dead air. Deb calls it 'the most brutal silence in station history'." } } },
        { label: 'Send the demo instead', effects: { fans: 8, buzz: 4 },
          outcome: "Deb plays the demo twice, back to back, 'by accident'. Somebody in Rosetown calls in to request it a third time." },
        { label: 'Kenji does the interview',
          effects: { buzz: 6, mood: { kenji: 8 },
            chat: { who: 'dj', text: 'That was the most moving ninety seconds of radio I have ever hosted. Please thank Kenji.' } },
          outcome: "Ninety seconds of silence on air. Listeners call in to say it was 'deeply moving'. Kenji nods at the microphone." }
      ] },

    { id: 'fame_fan_mail', type: 'fame', speaker: 'jaxon', title: 'Our First Fan Letter', gate: g({ era: GL, minFans: 40 }),
      text: "Your first fan letter, from a kid in Kindersley! It's a drawing: Marcel as a dragon, Dana with eight arms, Jaxon " +
        "riding a lunch box, Kenji as a shadow, and you, a small circle labelled 'DRUMS'.",
      choices: [
        { label: 'Put it on the trophy shelf', effects: { mood: { all: 5 }, chemistry: 3 },
          outcome: "It's the first thing on the trophy shelf. Dana insists on a photo next to it. You add 'small circle' to your bio." },
        { label: 'Mail back signed merch', effects: { fund: -25, fans: 8, buzz: 3 },
          outcome: "A signed sticker and a set list. The kid's mom posts it online. Kindersley is now Hail Damage country." }
      ] },

    { id: 'fame_star_pheasant', type: 'fame', speaker: 'reporter', title: 'The Star-Pheasant', gate: g({ era: GL, minFans: 100 }),
      text: "Brent from the Star-Pheasant wants a feature: 'Local Garage Band Makes Noise, Neighbours Confirm.' The photographer " +
        'wants a grain elevator at golden hour. Marcel wants creative control.',
      choices: [
        { label: 'Grain elevator photoshoot', effects: { fund: -40, buzz: 8, fans: 15 },
          outcome: 'Gas money to Hanley and back, but worth it. The photo runs above the fold, next to a record-breaking zucchini.' },
        { label: 'Shoot it in the garage', effects: { buzz: 5, fans: 8, mood: { marcel: -4 } },
          outcome: "Dad's lawnmower ends up front and centre. The caption names it. It gets more letters than you do." },
        { label: 'Marcel writes the article', hint: 'Gamble: Marcel has full creative control',
          outcome: 'Marcel types for nine hours straight and lets nobody see it.',
          roll: { chance: 0.4, stat: 'buzz', statScale: 0.006,
            success: { effects: { fans: 25, buzz: 10, mood: { marcel: 10 } },
              outcome: "Brent runs all 2,000 words unedited. It's unhinged. It's beautiful. It's the most-read story of the week." },
            fail: { effects: { buzz: 3, mood: { marcel: -6 } },
              outcome: "It runs in French, in the Gardening section, under 'Readers' Tips'. Several people write in to say the tips worked." } } }
      ] },

    { id: 'fame_deci_hell', type: 'fame', speaker: 'zine', title: 'Four Skulls', gate: g({ era: GL, minFans: 100, minWeek: 10 }),
      text: "Deci-Hell, the metal zine photocopied at the downtown library, reviewed your last show: 'Four skulls out of five. " +
        "Minus one skull for the drummer's facial expressions.' Everyone turns to look at you.",
      choices: [
        { label: 'Frame it', effects: { buzz: 5, chemistry: 3 },
          outcome: "It goes on the trophy shelf. Marcel adds a sticky note: 'The missing skull was yours, not mine.'" },
        { label: 'Work on your drum face', effects: { drumSkill: 2, burnout: 4 },
          outcome: "You practise a neutral face in Marcel's mirror all week. He says you're doing it wrong and demonstrates a face that frightens Jaxon." },
        { label: 'Write to the editor', effects: { buzz: 4, mood: { kenji: 5 } },
          outcome: "The next issue prints your letter with a reply: 'Fair. Five skulls.' Kenji looks unusually pleased. Suspicious." }
      ] },

    // ======================================================================
    // Weird
    // ======================================================================
    { id: 'weird_moose', type: 'weird', speaker: 'marcel', title: 'The Moose', gate: g({ era: GLS, minWeek: 6 }),
      text: "A moose is standing in the driveway. It's been there since 6 a.m. It seems to like the riff from 'Ma Pelouse, " +
        "Mon Tombeau'. Marcel is convinced it's a sign. Dad is convinced it's after the truck.",
      choices: [
        { label: 'Play the riff for it', hint: 'Gamble: moose are unpredictable',
          outcome: "You open the garage door and count it in. The moose's ears go up.",
          roll: { chance: 0.5,
            success: { effects: { buzz: 10, fans: 15, flags: { mooseMuse: true } },
              outcome: 'The moose headbangs. Jaxon films it. The video goes around the province. Marcel starts sketching a moose concept album.' },
            fail: { effects: { fund: -80, burnout: 4 },
              outcome: 'The moose charges on the downbeat. The truck is fine. The mailbox is not. Neither is the recycling bin. $80.' } } },
        { label: 'Call Conservation', effects: { burnout: -3, chemistry: 2 },
          outcome: "The conservation officer looks at the moose, looks at Marcel's eyeliner, and asks which one of you made the call." },
        { label: 'Everyone stay inside', effects: { burnout: -5, chemistry: 3 },
          outcome: 'Crokinole and perogies all afternoon. Kenji wins every game without a word. The moose leaves at dusk, unimpressed.' }
      ] },

    { id: 'weird_hailstorm', type: 'weird', speaker: 'dad', title: 'Another Hailstorm', once: false, cooldown: 12,
      gate: g({ era: GLS, minWeek: 3, weekOfYear: [2, 5] }),
      text: "Another hailstorm, golf-ball size. Everyone turns to look at Dad's truck, parked in the driveway because the garage " +
        'is full of amps. Dad turns to look at you.',
      choices: [
        { label: 'Move the kit, save the truck', effects: { burnout: 6, chemistry: 4, mood: { dana: -4 } },
          outcome: 'You move the whole band out into the storm in ninety seconds. The truck is saved. The cymbals are dented. They sound better.' },
        { label: 'Record the hail for an intro', effects: { buzz: 6, fund: -120 },
          outcome: "Best intro you've ever recorded. Dad files a claim; the band covers the deductible. The adjuster is Marcel. It gets awkward." },
        { label: 'Pray to Lord Abyssus', hint: 'Gamble: faith-based insurance',
          outcome: 'Marcel kneels in the driveway and raises both arms to the sky.',
          roll: { chance: 0.5,
            success: { effects: { mood: { marcel: 10 }, buzz: 3 },
              outcome: 'The hail stops. Marcel takes full credit and demands a small altar. Dad builds one from a milk crate, out of relief.' },
            fail: { effects: { fund: -150, mood: { marcel: -4 } },
              outcome: "Twelve new dents. 'The Abyss is not an insurance policy,' says Marcel, who processes the claim himself. $150 deductible." } } }
      ] },

    { id: 'weird_neighbour', type: 'weird', speaker: 'neighbour', title: 'Mr. Lindqvist', once: false, cooldown: 7,
      gate: g({ era: GLS, minWeek: 2 }),
      text: "Mr. Lindqvist from next door is at the garage door in his housecoat. 'It's 10:40. Some of us start at the potash " +
        "mine at six.' Behind him, a porch light comes on. Then another.",
      choices: [
        { label: 'Offer earplugs and a perogy', effects: { chemistry: 2, burnout: -3 },
          outcome: "He accepts both. Then he stays for the chorus. Then he requests 'the lawn one'. He will never admit he's a fan." },
        { label: 'Turn it down', effects: { burnout: -4, mood: { dana: -4, marcel: -3 } },
          outcome: "You play the rest of the night at library volume. Dana's solo is still twelve minutes. Just quieter." },
        { label: 'One more song, Mr. L', hint: 'Gamble: noise bylaw roulette',
          outcome: 'You count it in before he can answer.',
          roll: { chance: 0.5, stat: 'chemistry', statScale: 0.005,
            success: { effects: { fans: 4, buzz: 2 },
              outcome: 'He taps a slipper. He nods. He is, against his will, a fan. He posts about it on the community board.' },
            fail: { effects: { fund: -60 },
              outcome: "He calls the city. A bylaw officer writes a $60 ticket and asks if you're 'the lawn band'. She's heard good things." } } }
      ] },

    { id: 'weird_northern_lights', type: 'weird', speaker: 'kenji', title: 'Northern Lights', gate: g({ era: GL, weekOfYear: [9, 18] }),
      text: 'The northern lights are out, green and pink over the whole city. Kenji is on the garage roof. Nobody saw him ' +
        'climb up. He is lying perfectly still, looking up.',
      choices: [
        { label: 'Climb up and join him', effects: { chemistry: 6, burnout: -6, mood: { kenji: 8 } },
          outcome: "The whole band lies on the roof in parkas. Kenji points at the sky, once. It's the most he's ever said." },
        { label: 'Film it for the socials', effects: { buzz: 5, fans: 5 },
          outcome: "Gorgeous video. You can just make out Kenji on the roof, like a gargoyle. Top comment: 'who is that'. Nobody knows." },
        { label: 'Write a song about it', effects: { mood: { marcel: 6 }, skill: { marcel: 1 } },
          outcome: "Marcel writes 'Les Aurores de Mon Jardin' in one sitting. Gord translates: it's about how the lights make his lawn look green in winter." }
      ] },

    { id: 'weird_spring_melt', type: 'weird', speaker: 'dana', title: 'Spring Melt', once: false, cooldown: 12,
      gate: g({ era: GLS, weekOfYear: [19, 22] }),
      text: "The spring melt has turned the garage into a pond. Two centimetres of water and rising. Dana's pedalboard is floating. " +
        'She is standing on an amp, holding her guitar over her head like a newborn.',
      choices: [
        { label: 'Sandbag the door', effects: { burnout: 8, chemistry: 4 },
          outcome: "Dad brings sandbags and a lot of opinions. You finish at 2 a.m. The garage is saved. Jaxon's lunch box is not." },
        { label: 'Buy a sump pump ($120)', effects: { fund: -120, mood: { dana: 6 } },
          outcome: "The pump hums all week. Dana says it's slightly flat. She tunes to it anyway." },
        { label: 'Play an underwater set', hint: 'Gamble: water and electricity',
          outcome: 'You put the amps up on cinder blocks and hope.',
          roll: { chance: 0.45, stat: 'chemistry', statScale: 0.006,
            success: { effects: { buzz: 10, fans: 10 },
              outcome: "Everyone plays standing on milk crates. The video, 'Metal in a Flood', does numbers in three provinces." },
            fail: { effects: { fund: -90, burnout: 5 },
              outcome: "Pop, fizz, darkness. The breaker takes Dana's tuner with it. Mom says 'I said this would happen' to nobody in particular." } } }
      ] },

    // ======================================================================
    // v0.4 guilt cards: only while you owe your parents (flags.parentsLoan). `repay: n` pays back up to $n from the
    // fund; paying the whole debt clears the flag and the guilt stops.
    // ======================================================================
    { id: 'guilt_fridge_calendar', type: 'money', speaker: 'mom', title: 'The Fridge Calendar', once: false, cooldown: 8,
      gate: g({ era: GLS, flags: ['parentsLoan'] }),
      text: "Mom has written 'BAND LOAN' on the fridge calendar every Sunday, in red, with a small heart. The heart is doing a lot of work.",
      choices: [
        { label: 'Pay her back $100', effects: { repay: 100, chemistry: 2 },
          outcome: 'You hand over five twenties. Mom erases one heart and draws a bigger one. Dad pretends not to see.' },
        { label: 'Clean the eaves instead', effects: { burnout: 5, mood: { all: 3 } },
          outcome: 'You clean the eaves. Kenji holds the ladder. Mom counts it as $20. Dad counts it as $5.' },
        { label: 'Promise next month', effects: { burnout: 3 },
          outcome: "Mom writes 'NEXT MONTH' on next month. In red. With no heart." }
      ] },
    { id: 'guilt_accountant', type: 'money', speaker: 'mom', title: 'Trevor the Accountant', once: false, cooldown: 10,
      gate: g({ era: GLS, flags: ['parentsLoan'] }),
      text: "Mom's friend Linda's son Trevor is an accountant. Trevor has a house, a boat and a drum kit he never plays. " +
        'Mom has invited Trevor for supper. Trevor has brought a pamphlet.',
      choices: [
        { label: 'Let Trevor do the books', effects: { repay: 80, burnout: 4 },
          outcome: "Trevor finds $80 of 'drumstick overspend' and hands it to Mom. He calls the band 'a fun little cash sink'. It stings. He's right." },
        { label: 'Challenge Trevor to a drum-off', hint: 'Gamble: Trevor took lessons', outcome: 'You set up two kits in the driveway.',
          roll: { chance: 0.6, stat: 'drumSkill', statScale: 0.008,
            success: { effects: { buzz: 4, chemistry: 3 }, outcome: 'You win. Trevor shakes your hand and books the band for his office party.' },
            fail: { effects: { burnout: 6 }, outcome: "Trevor wins. He had lessons. Mom says 'see?' and nothing else all evening." } } }
      ] },
    { id: 'guilt_dad_invoice', type: 'money', speaker: 'dad', title: 'An Invoice', once: false, cooldown: 10,
      gate: g({ era: GLS, flags: ['parentsLoan'] }),
      text: "Dad has typed up an invoice: 'One (1) loan, plus garage rental, plus hydro for amplifiers.' Under 'terms' he wrote 'whenever, bud.' " +
        "He's sliding it across the workbench very slowly.",
      choices: [
        { label: 'Pay $150 on the spot', effects: { repay: 150, chemistry: 3 },
          outcome: "Dad folds the cash into his shirt pocket and says 'didn't need to do that, bud.' He pats the pocket twice." },
        { label: 'Pay him in hydro savings', effects: { burnout: 4, chemistry: -2 },
          outcome: 'You unplug the beer fridge. Dad plugs it back in. The invoice stays on the workbench.' },
        { label: 'Frame the invoice', effects: { burnout: 3, mood: { marcel: 5 } },
          outcome: "Marcel calls it 'the most metal document in Saskatoon' and hangs it over the kit. Dad is secretly delighted." }
      ] },
    { id: 'guilt_aunt_irene', type: 'money', speaker: 'mom', title: 'Aunt Irene Calls', once: false, cooldown: 9,
      gate: g({ era: GLS, flags: ['parentsLoan'] }),
      text: "Aunt Irene from Yorkton is on speakerphone. 'Your mother tells me you owe her money for the little band.' Mom is standing right there. Mom did tell her.",
      choices: [
        { label: 'Pay Mom $50, loudly', effects: { repay: 50, chemistry: 2 },
          outcome: "Irene hears the cash change hands and says 'well, good.' The whole family will know by Sunday." },
        { label: 'Invite Irene to a gig', effects: { buzz: 3, burnout: 3 },
          outcome: 'Irene comes with three friends from church. They stand at the back with their arms crossed. It counts as a crowd.' },
        { label: 'Put Jaxon on the phone', effects: { chemistry: 2, mood: { jaxon: 5 } },
          outcome: "Jaxon talks to Irene for forty minutes about Baba's perogy dough. Irene forgets why she called." }
      ] },
    { id: 'guilt_potash_mine', type: 'money', speaker: 'dad', title: 'The Mine Is Hiring', once: false, cooldown: 10,
      gate: g({ era: GLS, flags: ['parentsLoan'] }),
      text: 'Over supper, Dad mentions the potash mine is hiring. He mentions Cousin Dale works there now. He mentions Cousin Dale\'s truck. ' +
        'He passes the potatoes without looking at you.',
      choices: [
        { label: 'Pay Dad back $120', effects: { repay: 120, chemistry: 2 },
          outcome: "You pay him back. Dad says 'didn't need to do that' and puts it in his wallet immediately." },
        { label: 'Work two shifts underground', effects: { fund: 60, burnout: 8 },
          outcome: 'You come home with $60 and a new respect for low frequencies. Dale shows you his truck. Twice.' },
        { label: 'Pitch him the band plan', effects: { burnout: -3, chemistry: -2 },
          outcome: "Dad listens to the whole plan. He asks one question: 'And the van?' There is no good answer." }
      ] },
    { id: 'guilt_butter_tarts', type: 'money', speaker: 'mom', title: 'The Bake Sale', once: false, cooldown: 12,
      gate: g({ era: GLS, flags: ['parentsLoan'] }),
      text: "Mom's church is holding a bake sale 'to support local musicians'. You are the local musicians. She baked forty dozen butter tarts. You are selling them.",
      choices: [
        { label: 'Sell them, repay $100', effects: { repay: 100, burnout: 5 },
          outcome: "You sell 480 butter tarts outside the Co-op. Every cent goes to Mom. Mom calls it 'even'. It is not even. But it's closer." },
        { label: 'Eat the tarts', effects: { burnout: -4, mood: { all: 4 } },
          outcome: 'The band eats eleven dozen butter tarts in one sitting. Marcel weeps. Mom never finds out. Mom always finds out.' }
      ] },
    // ======================================================================
    // v0.5 Local Heroes (era 'local'; a few run on into 'signed')
    // ======================================================================
    { id: 'local_recognized', type: 'fame', speaker: 'jaxon', title: 'Aren\'t You...?', once: false, cooldown: 9,
      gate: g({ era: LS }),
      text: "At the Co-op gas bar, a kid in a homemade Hail Damage shirt stops dead. 'You're RIP!' Jaxon is pumping gas into Baba's " +
        "car in slippers, holding a bag of perogies. The kid's mom is filming.",
      choices: [
        { label: 'Sign his arm', effects: { fans: 25, mood: { jaxon: 6 } },
          outcome: "Jaxon signs 'RIP' in marker. The kid's mom asks if it washes off. Jaxon says 'it's metal, ma'am'. It washes off. The video doesn't." },
        { label: 'Give him a pick', effects: { fans: 15, buzz: 4 },
          outcome: "Jaxon hands over his lucky pick. The kid holds it like a holy relic. Jaxon plays the whole weekend with a butter knife." },
        { label: "Say you're his cousin", effects: { mood: { jaxon: -4 }, chemistry: 3 },
          outcome: "'I'm his cousin. Rip's cousin. Pip.' The kid is devastated, then delighted. Now there's a rumour about a sixth member called Pip." }
      ] },
    { id: 'local_goal_song', type: 'fame', speaker: 'reporter', title: 'The Goal Song', gate: g({ era: L, minFans: 300 }),
      text: 'The Saskatoon Blizzard, the junior hockey team, want the riff from "Ma Pelouse, Mon Tombeau" as their goal song. ' +
        "Brent from the Star-Pheasant is covering it. Four thousand people will hear it every time a seventeen-year-old scores.",
      choices: [
        { label: 'Free, for the city', effects: { fans: 60, buzz: 10 },
          outcome: 'The Blizzard score four times on opening night. Four thousand people chant a song about a lawn. Marcel has to leave the arena to cry.' },
        { label: 'Charge them $300', effects: { fund: 300, buzz: 5 },
          outcome: "The team pays in cash and a signed stick. Dad frames the stick. Dad does not frame your gold records, later. Just the stick." },
        { label: 'Marcel sings it live', hint: 'Gamble: centre ice, in a cape',
          outcome: 'Marcel walks onto the ice in his cape on opening night.',
          roll: { chance: 0.5, stat: 'buzz', statScale: 0.005,
            success: { effects: { fans: 80, buzz: 12 }, outcome: 'He hits the scream, slides twelve metres on one boot, and ends in a perfect kneel at the blue line. Sports highlight of the week.' },
            fail: { effects: { buzz: 4, burnout: 6, mood: { marcel: -5 } }, outcome: 'He slips on the first note and delivers the whole song lying on the ice. The ice resurfacer waits. The crowd is supportive, mostly.' } } }
      ] },
    { id: 'local_copycats', type: 'scene', speaker: 'marcel', title: 'Hail Damage Jr.', gate: g({ era: LS, minFans: 350 }),
      text: 'There is a band of fifteen-year-olds in Warman called Hail Damage Jr. They wear bath-towel capes. Their singer screams ' +
        'in French he learned from a cereal box. Their drummer does your drum face. Marcel is equal parts flattered and threatened.',
      choices: [
        { label: 'Mentor them', effects: { chemistry: 5, fans: 30, burnout: 4 },
          outcome: "You teach their drummer a proper blast beat. Marcel teaches their singer to 'scream from the lawn of the soul'. Their parents send cookies." },
        { label: 'Book them as your opener', effects: { fans: 45, buzz: 6, mood: { marcel: -4 } },
          outcome: "They are good. They are too good. They do the Abyssal Spin better than Marcel. He watches from side stage, arms folded, cape very still." },
        { label: 'Dad writes them a letter', effects: { buzz: -4, mood: { marcel: 5 } },
          outcome: "Dad writes a stern cease-and-desist on letterhead he had printed for this. Their moms write back. Nobody wins. Hail Damage Jr. become Hail Damage II." }
      ] },
    { id: 'local_gord_wedding', type: 'money', speaker: 'gord', title: "Gord's Wedding", gate: g({ era: LS, minFans: 300 }),
      text: "Gord, your first superfan, is getting married at the Ukrainian hall in Saskatoon. First dance: 'Ma Pelouse, Mon Tombeau'. " +
        "The bride has agreed. The bride's grandmother has not been told.",
      choices: [
        { label: 'Play it as a gift', effects: { chemistry: 6, fans: 30, mood: { all: 5 } },
          outcome: 'Gord and his bride slow-dance to a blast beat. The grandmother is first on the floor for the breakdown. It is the best wedding in Saskatchewan history.' },
        { label: 'Play the whole reception', effects: { fund: 350, burnout: 8, fans: 20 },
          outcome: 'Five hours, two polkas, a chicken dance and a four-minute Kenji bass solo during the cake. $350 and a garbage bag of perogies.' },
        { label: 'Record them a video', effects: { buzz: 5, mood: { marcel: 4 } },
          outcome: "Marcel records a toast in French from the garage. Gord translates it at the reception. It is, somehow, about the groom's lawn." }
      ] },
    { id: 'local_pheasant_cover', type: 'fame', speaker: 'reporter', title: 'Front of the Arts Section', gate: g({ era: L, minFans: 400 }),
      text: "Brent wants Hail Damage on the front of the Star-Pheasant arts section: 'LOCAL HEROES'. The photographer wants you on the " +
        "Traffic Bridge at dawn, at minus thirty, 'looking heroic'. Marcel has already chosen a wind direction.",
      choices: [
        { label: 'Dawn on the bridge', effects: { fans: 50, buzz: 10, burnout: 6 },
          outcome: "Frozen solid, heroic, magnificent. Marcel's cape freezes mid-flutter and stays that way for the whole shoot. Best photo you'll ever have." },
        { label: 'In the garage, as it is', effects: { fans: 35, chemistry: 5 },
          outcome: "The photo shows the garage, the goose-amp, Mom's recipe cards, the mower. People say it looks 'real'. Mom says it looks 'untidy'." },
        { label: 'Let Kenji art-direct', effects: { buzz: 12, mood: { kenji: 5 } },
          outcome: "Kenji positions everyone without a word. The band in a line, backs to the camera, him facing it. It becomes the band's most famous photo." }
      ] },
    { id: 'local_gopherwood_scout', type: 'scene', speaker: 'marcel', title: 'The Man in the Feed Cap', gate: g({ era: L, minFans: 350 }),
      text: 'A man in a feed-store cap has been at the back of your last three shows, writing in a notebook with a carpenter pencil. ' +
        'He buys one of each shirt. Marcel thinks he is a spy. Dana thinks he is a tax man. His van has a gopher painted on it.',
      choices: [
        { label: 'Go say hello', effects: { buzz: 8, chemistry: 3 },
          outcome: "'Wendell. Gopherwood Records. Humboldt.' He shakes every hand, including Kenji's, which nobody has done before. He says he'll 'be in touch'." },
        { label: 'Play hard to get', effects: { buzz: 5, mood: { marcel: 4 } },
          outcome: "Marcel sweeps past him without a glance. Wendell writes something in the notebook. Later you learn it says 'good cape'." },
        { label: 'Give him a demo tape', effects: { buzz: 6, fans: 15 },
          outcome: 'You hand over a cassette recorded in the garage. He listens to it in his van in the parking lot. Twice. With the windows down, at minus twenty.' }
      ] },
    { id: 'local_screenprint', type: 'money', speaker: 'dana', title: 'Screen-Print Saturday', once: false, cooldown: 10,
      gate: g({ era: LS }),
      text: "Dana has built a screen-printing station in the garage. She has opinions about mesh count. The ink is drying on Dad's " +
        "workbench and, briefly, on Dad. A hundred blank shirts wait. The design is Marcel's face as a thundercloud.",
      choices: [
        { label: 'Print a hundred', effects: { fund: 180, burnout: 6 },
          outcome: 'A hundred shirts, ninety-four sellable, six that say HAIL DAMGE. You sell those as rare variants. $180.' },
        { label: 'Limited run of twenty', hint: 'Gamble: collectors, or leftovers',
          outcome: 'Twenty numbered shirts, signed by everyone. Kenji signs with a small drawing of a bird.',
          roll: { chance: 0.5, stat: 'buzz', statScale: 0.005,
            success: { effects: { fund: 260, buzz: 6 }, outcome: 'They sell out in an hour. Number one goes for $60 online. Kenji\'s bird becomes a logo.' },
            fail: { effects: { fund: 40, mood: { dana: -4 } }, outcome: "Twelve sell. The other eight become band pyjamas. Dana says limited runs are 'an art, not a science'. It's neither." } } },
        { label: 'Let Mom run the table', effects: { fund: 120, chemistry: 3, chat: { who: 'mom', text: 'Sold 30 shirts at church! Told them it was gospel. Is it gospel?' } },
          outcome: 'Mom sells shirts at church, the Co-op and her book club. $120. The book club is now technically your street team.' }
      ] },
    { id: 'local_crowdfund', type: 'money', speaker: 'marcel', title: 'The Crowdfund', gate: g({ era: L, minFans: 300 }),
      text: 'Marcel has launched a crowdfunding page for the EP. Reward tiers: $5, a thank-you. $50, Marcel reads a poem about your ' +
        "lawn. $500, Kenji stares at you for one full minute. You did not approve any of this. It's live.",
      choices: [
        { label: 'Let it ride', hint: 'Gamble: the internet is fickle',
          outcome: 'You share the link everywhere, including the Legion newsletter.',
          roll: { chance: 0.5, stat: 'buzz', statScale: 0.006,
            success: { effects: { fund: 400, fans: 30 }, outcome: 'Funded in three days. Two people buy the Kenji tier. Kenji delivers both in person, silently. Both write glowing reviews.' },
            fail: { effects: { fund: 90, mood: { marcel: -6 } }, outcome: "$90, mostly from Mom, Baba and a man in Kindersley who wants the lawn poem. Marcel writes him nine verses." } } },
        { label: 'Take the Kenji tier down', effects: { fund: 150, mood: { kenji: 5 } },
          outcome: 'Kenji seems relieved. The rest raises $150. The top tier is now "Dana explains her pedalboard", and nobody buys it.' },
        { label: 'Shut it down', effects: { chemistry: 3, mood: { marcel: -6 } },
          outcome: 'Marcel refunds all eleven backers by hand, with a letter each. They are in French. Nine backers frame them.' }
      ] },
    { id: 'local_baba_manager', type: 'drama', speaker: 'baba', title: 'Baba Takes Calls', gate: g({ era: LS, minWeek: 20 }),
      text: "Baba has started answering the band's email. In two weeks she has booked three gigs, cancelled two, negotiated a " +
        "rider of cabbage rolls, and told a promoter in Yorkton to 'eat more'. She would like ten percent.",
      choices: [
        { label: 'Make it official', effects: { fund: 150, mood: { jaxon: 6 }, flags: { babaManager: true } },
          outcome: "Baba has business cards printed: 'MANAGEMENT'. Promoters are terrified of her. Your guarantees go up. So does Jaxon's curfew." },
        { label: 'Thank her, gently decline', effects: { mood: { jaxon: -4 }, chemistry: 3 },
          outcome: "Baba accepts with dignity, then sends one last email to the Yorkton promoter: 'Eat more.' He does. He books you again." },
        { label: 'Only the church halls', effects: { fans: 25, mood: { jaxon: 3 } },
          outcome: 'Baba handles every Ukrainian hall in the province. You play four fall suppers. Every one sells out. Every one has a polka.' }
      ] },
    { id: 'local_marcel_boss', type: 'drama', speaker: 'marcel', title: 'Prairie Mutual Calls', gate: g({ era: LS, minFans: 300 }),
      text: "Marcel's boss at Prairie Mutual Insurance saw him on the news, in a cape. He isn't angry. He wants Lord Abyssus in a hail " +
        "insurance commercial: 'Is your roof ready for the ABYSS?' Marcel is staring at the wall.",
      choices: [
        { label: 'Do the commercial', effects: { fund: 300, buzz: 8, mood: { marcel: -6 } },
          outcome: "It airs during the hockey. Marcel screams 'THE ABYSS!' at a dented roof. Sales go up nineteen percent. He's employee of the month. He's mortified." },
        { label: 'Lord Abyssus is not for sale', effects: { mood: { marcel: 8 }, chemistry: 3 },
          outcome: "Marcel says no with such dignity that his boss apologises. Then asks if Dana would do it. Dana would. Dana does. It's all about hail specs." },
        { label: 'Write them a jingle instead', hint: 'Gamble: a hit, or an insurance jingle',
          outcome: 'The band writes a thirty-second jingle in 7/8 at Dana\'s insistence.',
          roll: { chance: 0.5,
            success: { effects: { fund: 350, fans: 40 }, outcome: 'It gets stuck in the entire province\'s head. Kids sing it at recess. $350 and a lifetime of people humming it at you.' },
            fail: { effects: { fund: 80, burnout: 4 }, outcome: 'The ad agency takes out the 7/8, the guitars and the words. It is now a man whistling. $80. You can hear Kenji in there, faintly.' } } }
      ] },
    { id: 'local_dana_endorsement', type: 'drama', speaker: 'dana', title: 'The Endorsement', gate: g({ era: LS, minFans: 400 }),
      text: "A letter for Dana from Tonnerre Amplification of Laval, Quebec: an artist endorsement. Fifteen percent off, her name " +
        "on their website and a signed photo of the CEO. Dana has read it forty times. She has questions about the transformers.",
      choices: [
        { label: 'Sign it', effects: { mood: { dana: 10 }, skill: { dana: 1 } },
          outcome: 'Dana is on the website between a jazz bassist and a man who plays amplified accordion. She has never been happier.' },
        { label: 'Negotiate harder', hint: 'Gamble: Dana vs a French amp company',
          outcome: 'Dana sends them eleven pages of counter-proposals.',
          roll: { chance: 0.45,
            success: { effects: { mood: { dana: 12 }, fund: 200 }, outcome: 'They send a free head, a $200 credit and a note: "Please stop emailing us." Dana frames the note.' },
            fail: { effects: { mood: { dana: -6 } }, outcome: 'They withdraw the offer and sign a sixteen-year-old from Trois-Rivières. Dana listens to him. Dana grudgingly respects him.' } } },
        { label: 'Loyal to Gwendolyn', effects: { mood: { dana: 4 }, chemistry: 4 },
          outcome: 'Dana declines, out of loyalty to her own amp. She writes it a letter too. She reads it to the amp. Everyone pretends not to hear.' }
      ] },
    { id: 'local_tundra_split', type: 'scene', speaker: 'wraith_frontman', title: 'A Split Seven-Inch', gate: g({ era: L, minFans: 400 }),
      text: "Tundra Wraith's frontman calls: 'Buddy! Split seven-inch. One side you, one side us. We'll handle the invoicing, the " +
        "pressing plant and the GST. It'll be great for both of us! Mostly us! Kidding! Mostly!'",
      choices: [
        { label: 'Yes, buddy', effects: { fans: 50, buzz: 8, mood: { marcel: -4 } },
          outcome: 'It sells out in both cities. Their side is exactly two seconds longer than yours. Marcel has timed it. Marcel will not let it go.' },
        { label: 'Only if we get side A', hint: 'Gamble: accountants love to negotiate',
          outcome: 'You ask for side A. He says "ooh, buddy" and puts you on hold.',
          roll: { chance: 0.5,
            success: { effects: { fans: 60, buzz: 10 }, outcome: "Side A! He even sends a fruit basket to celebrate losing. You are almost sure he's happy for you. Almost." },
            fail: { effects: { buzz: 4, chemistry: -3 }, outcome: "He agrees to side A, then prints 'SIDE A' on both sides. Technically nobody lied. Technically." } } },
        { label: 'No thanks, buddy', effects: { mood: { marcel: 5 }, chemistry: 3 },
          outcome: "'Totally understand, buddy!' A fruit basket arrives the next day anyway. The card says 'No hard feelings!' The pears are very hard." }
      ] },
    { id: 'local_kenji_maestro', type: 'weird', speaker: 'kenji', title: 'Maestro', gate: g({ era: LS, minFans: 300 }),
      text: "After a show in Prince Albert, an old man in a long coat walks up to Kenji, bows deeply and says 'Maestro.' Kenji bows " +
        "back. The man leaves. Kenji packs his bass as if nothing happened. Everyone else is having a small crisis.",
      choices: [
        { label: 'Follow the old man', hint: 'Gamble: answers, or a parking lot',
          outcome: 'Jaxon and Dana run after him into the parking lot.',
          roll: { chance: 0.4,
            success: { effects: { buzz: 6, mood: { all: 4 } }, outcome: 'He gets into a black car and hands them a concert programme from 1998. Kenji is on the cover, age nine, holding a cello.' },
            fail: { effects: { burnout: 4 }, outcome: 'He is gone. The parking lot is empty. Snow is falling. There are no footprints. Jaxon will not sleep tonight.' } } },
        { label: 'Ask Kenji about it', effects: { mood: { kenji: -3 }, chemistry: 3 },
          outcome: "Kenji takes the setlist, writes '…' on the back, and hands it to you. It's the most he has ever told anyone." },
        { label: 'Let the mystery be', effects: { mood: { kenji: 6 }, chemistry: 4 },
          outcome: "Nobody mentions it again. Kenji buys everyone fries on the drive home. He has never bought fries before. It's a thank-you." }
      ] },
    { id: 'local_house_party', type: 'scene', speaker: 'jaxon', title: 'The Basement Show', once: false, cooldown: 8, gate: g({ era: L }),
      text: "Some university kids want Hail Damage in their basement on Saturday. Ceiling height: one metre ninety. Marcel is one " +
        "metre seventy-two plus a cape. Admission is a can of food for the food bank. There will be at least ninety people.",
      choices: [
        { label: 'Play it, loud', effects: { fans: 40, burnout: 8 },
          outcome: 'Ninety people, one furnace, zero oxygen. The ceiling tiles fall in time. The food bank gets 212 cans. Legendary.' },
        { label: 'Pass the hat too', effects: { fund: 120, fans: 20, burnout: 5 },
          outcome: 'The hat comes back with $120, three bus tickets, a phone number and a single perogy. The food bank still gets their cans.' },
        { label: 'Send Dana, solo', effects: { fans: 15, mood: { dana: 8 } },
          outcome: 'Dana plays a ninety-minute unaccompanied solo in a basement. Half the room leaves. The other half form a prog band that night.' }
      ] },
    { id: 'local_listening_party', type: 'scene', speaker: 'mom', title: 'The Listening Party', gate: g({ era: L, minFans: 350 }),
      text: "Mom wants to host a listening party for your recordings in the living room. She has made a cheese ball shaped like " +
        "a skull. She has invited the whole cul-de-sac, the church choir and Mr. Lindqvist, who is bringing his own earplugs.",
      choices: [
        { label: 'Play it all, full volume', effects: { fans: 30, buzz: 6, burnout: 4 },
          outcome: "The choir stays for all of it. Mr. Lindqvist takes out one earplug for the ballad. He'll deny it. Mom sells eleven CDs." },
        { label: 'Play the quiet songs only', effects: { fans: 20, chemistry: 4, mood: { marcel: -3 } },
          outcome: "It's lovely. Marcel says it's 'a lie'. The neighbours say 'what nice kids'. You have never been called that before." },
        { label: 'Let Mom DJ', effects: { mood: { all: 5 }, fans: 15, chat: { who: 'mom', text: 'I played the loud one twice. Linda cried. Good cry!' } },
          outcome: 'Mom plays the songs in her preferred order, then some polkas, then the songs again. Everyone has a great time. The cheese ball is a hit.' }
      ] },

    // ======================================================================
    // v0.5 Signed: label drama (sim flag `label` = labelId; Monolith / Gopherwood / DIY)
    //   Demand cards write flags.demand<Kind> = 'met' | 'half' | 'refused' (the sim may settle DEAL.demands from them).
    // ======================================================================
    { id: 'signed_monolith_english', type: 'drama', speaker: 'marcel', title: 'Notes from Monolith', weight: 2,
      gate: g({ era: S, flagEquals: { label: 'monolith' } }),
      text: "Brayden from Monolith has notes on the demos. 'Love the energy. Love the lawn thing. Love it. Marcel should sing in " +
        "English.' Marcel has not blinked in four minutes. Kenji has moved to stand between Marcel and the phone.",
      choices: [
        { label: 'Tell Monolith "non"', effects: { mood: { marcel: 14 }, buzz: 6, fund: -400, flags: { demandEnglish: 'refused' } },
          outcome: "Marcel writes the reply himself, in French, on the back of a hail claim form. Monolith trims the promo budget by $400. Marcel frames the letter." },
        { label: 'One song in English', effects: { fans: 150, mood: { marcel: -8 }, flags: { demandEnglish: 'half' } },
          outcome: "Marcel translates one song. In English it is still, very clearly, about his lawn. Radio plays it anyway. 'Sod of My Fathers' charts." },
        { label: 'Bilingual! Every other line', hint: 'Gamble: Canadian content, or chaos',
          outcome: 'Marcel alternates French and English line by line.',
          roll: { chance: 0.5, stat: 'chemistry', statScale: 0.005,
            success: { effects: { fans: 250, buzz: 12, flags: { demandEnglish: 'met' } }, outcome: 'Critics call it "the most Canadian record ever made". Monolith calls it "a strategy". Marcel calls it "Tuesday".' },
            fail: { effects: { buzz: -6, mood: { marcel: -6 }, flags: { demandEnglish: 'half' } }, outcome: "He loses track mid-verse and sings a line in a language nobody recognises. Brayden says 'love that'. He does not love that." } } }
      ] },
    { id: 'signed_monolith_radio', type: 'drama', speaker: 'dana', title: 'The Radio Edit', weight: 2,
      gate: g({ era: S, flagEquals: { label: 'monolith' } }),
      text: "Monolith want a 3:30 radio edit of the lead single. The lead single is 9:40. Six minutes of it is Dana's solo. Dana has " +
        "locked herself in the van with Gwendolyn the amp and a thermos. She says she has 'enough soup for a siege'.",
      choices: [
        { label: 'Cut it to 3:30', effects: { fans: 200, buzz: 6, mood: { dana: -12 }, flags: { demandRadio: 'met' } },
          outcome: 'Radio plays it every hour. Dana hears it at a gas station, the solo cut to four notes, and has to sit down on a bag of ice.' },
        { label: 'Release the 9:40 anyway', hint: 'Gamble: a cult hit, or a label memo',
          outcome: 'You send Monolith the full 9:40 with a note: "This is the edit."',
          roll: { chance: 0.4,
            success: { effects: { buzz: 14, fans: 180, mood: { dana: 10 }, flags: { demandRadio: 'met' } }, outcome: 'One campus station plays all of it. Then twenty more. It becomes "the long one" everyone requests. Monolith takes credit.' },
            fail: { effects: { fund: -600, mood: { dana: 6 }, flags: { demandRadio: 'refused' } }, outcome: 'Monolith sends a memo, a lawyer and an invoice for the remastering. $600. Dana is proud of you anyway.' } } },
        { label: 'The solo gets its own single', effects: { fans: 120, mood: { dana: 12 }, flags: { demandRadio: 'half' } },
          outcome: 'The 3:30 edit goes to radio. The six-minute solo comes out as a B-side called "Dana". It outsells the single in Quebec.' }
      ] },
    { id: 'signed_monolith_image', type: 'drama', speaker: 'marcel', title: 'The Image Consultant',
      gate: g({ era: S, flagEquals: { label: 'monolith' } }),
      text: "Monolith have flown in an image consultant from Toronto named Tiffani, with an i. Her notes: lose the capes, matching " +
        "denim, 'more smiling from the tall one'. The tall one is Kenji. Kenji has put his sunglasses on over his sunglasses.",
      choices: [
        { label: 'Let her try', effects: { fans: 200, mood: { all: -8 }, flags: { demandImage: 'met' } },
          outcome: 'Matching denim. No capes. The photos test brilliantly. The band looks like a dental office Christmas party. Marcel keeps a cape in his jeans.' },
        { label: 'The cape stays', effects: { mood: { marcel: 12 }, buzz: 6, flags: { demandImage: 'refused' } },
          outcome: "Marcel explains the Cape Saga to Tiffani for two hours, with diagrams. She leaves converted. Her report to Monolith is one word: 'CAPES'." },
        { label: 'Kenji meets her alone', effects: { buzz: 10, mood: { kenji: 6 }, flags: { demandImage: 'half' } },
          outcome: 'Ten minutes later Tiffani leaves, pale. She resigns that week and opens a pottery studio in Nelson. Monolith drop the matter.' }
      ] },
    { id: 'signed_monolith_duet', type: 'fame', speaker: 'marcel', title: 'The Duet',
      gate: g({ era: S, flagEquals: { label: 'monolith' }, minWeek: 30 }),
      text: "Monolith want a duet with their pop-country star Kaylee Rae Dufresne 'for reach'. She has a song called 'Tailgate Heart'. " +
        "Marcel has agreed to meet her at a Regina hotel lobby, in full cape, 'to see if our souls align'.",
      choices: [
        { label: 'Do the duet', effects: { fans: 300, buzz: 10, mood: { marcel: -5 }, flags: { demandFeature: 'met' } },
          outcome: "'Tailgate Heart (Abyssal Version)' is a strange, enormous hit. Tailgate Weekly give it a blue ribbon. Deci-Hell print one word: WHY." },
        { label: 'Only if she screams', hint: 'Gamble: she might actually do it',
          outcome: 'Marcel asks Kaylee Rae if she can scream.',
          roll: { chance: 0.5,
            success: { effects: { fans: 350, buzz: 16, flags: { demandFeature: 'met' } }, outcome: 'She can. Oh, she can. She out-screams Marcel on the first take. He proposes a second album together. She accepts.' },
            fail: { effects: { buzz: -4, fund: -300, flags: { demandFeature: 'refused' } }, outcome: 'She tries once, loses her voice for a week and cancels a tour date. Monolith bill you $300 in throat lozenges and "damages".' } } },
        { label: 'Politely, no', effects: { mood: { marcel: 6 }, chemistry: 4, flags: { demandFeature: 'refused' } },
          outcome: "Kaylee Rae is relieved. So is Marcel. They get pie in the hotel diner and talk about their mothers. They're friends now. Monolith sulks." }
      ] },
    { id: 'signed_gopherwood_showcase', type: 'scene', speaker: 'baba', title: 'The Feed Store Showcase',
      gate: g({ era: S, flagEquals: { label: 'gopherwood' }, weekOfYear: [11, 14] }),
      text: "Wendell's Christmas showcase at the feed store in Humboldt: every Gopherwood act, a stage made of pallets, a wood stove, " +
        "and Wendell's wife Lorna on the merch table. Baba has heard there will be a cabbage roll competition. She is entering.",
      choices: [
        { label: 'Headline the showcase', effects: { fans: 120, chemistry: 6, burnout: 6, flags: { demandShowcase: 'met' } },
          outcome: 'Three hundred people in a feed store, steam rising off their parkas. Lorna sells out of shirts. Baba wins the cabbage rolls. Everyone wins.' },
        { label: 'Play, then help clean up', effects: { fans: 80, mood: { all: 5 }, flags: { demandShowcase: 'met' } },
          outcome: 'You sweep the feed store until two a.m. with Wendell. He tells you about every record he has ever put out. There are eleven. He loves all of them.' },
        { label: 'Skip it this year', effects: { burnout: -6, mood: { jaxon: -4 }, flags: { demandShowcase: 'refused' } },
          outcome: "Wendell says 'no problem'. Lorna says nothing, which is worse. Baba goes anyway, alone, and wins the cabbage rolls." }
      ] },
    { id: 'signed_gopherwood_cheque', type: 'money', speaker: 'dana', title: 'The Second Cheque',
      gate: g({ era: S, flagEquals: { label: 'gopherwood' } }),
      text: "The second advance cheque from Gopherwood has arrived, handwritten, with a note from Wendell: 'Might want to deposit " +
        "Tuesday, not Monday. Or Wednesday. Your pal, W.' Dana has calculated the odds. She has a spreadsheet.",
      choices: [
        { label: 'Deposit it Wednesday', effects: { fund: 600, chemistry: 3 },
          outcome: 'It clears. Wendell calls to thank you "for your patience and for Wednesday". He sounds like he has just sold a combine.' },
        { label: 'Help at the feed store', effects: { fund: 400, burnout: 6, mood: { all: 4 } },
          outcome: "The band works the feed store till for a weekend so Wendell can do the books. You sell a lot of chick starter. The cheque clears Monday." },
        { label: 'Tear it up', effects: { chemistry: 6, buzz: 5, mood: { all: 5 } },
          outcome: "Wendell cries on the phone. He tells everyone. The story gets around. Three promoters book you because 'that's the band that tore up the cheque'." }
      ] },
    { id: 'signed_gopherwood_labelmates', type: 'scene', speaker: 'jaxon', title: 'The Label Barbecue',
      gate: g({ era: S, flagEquals: { label: 'gopherwood' }, weekOfYear: [1, 6] }),
      text: 'The Gopherwood label barbecue, behind the feed store. Your labelmates: a polka-ska band from Estevan, a folk duo of retired ' +
        'dentists, and a teenage harpist who only plays death metal covers. Wendell is flipping burgers in an apron that says LABEL BOSS.',
      choices: [
        { label: 'Jam with everyone', effects: { fans: 80, chemistry: 5, skill: { all: 1 } },
          outcome: 'Death metal harp, polka-ska horns, two dentists on harmonies and your blast beat. It goes on a label sampler. It is weirdly the best song on it.' },
        { label: 'Talk shop with the dentists', effects: { mood: { all: 4 }, burnout: -5 },
          outcome: "They check everyone's teeth for free. Kenji has perfect teeth. This surprises no one and unsettles everyone." },
        { label: 'Recruit the harpist', effects: { buzz: 8, mood: { dana: -4 } },
          outcome: 'The harpist plays on one track of your next record. Pitchspork calls it "a genuine provocation". Dana calls it "a lot of strings".' }
      ] },
    { id: 'signed_diy_mailout', type: 'money', speaker: 'mom', title: 'Kitchen Table Distribution',
      gate: g({ era: S, flagEquals: { label: 'diy' } }),
      text: "Four hundred online orders. No label, no warehouse. Just Mom's kitchen table, a tape gun and a mountain of mailers. " +
        "Mom has set up a production line. She's timing everyone. Kenji is fastest. Nobody saw him learn.",
      choices: [
        { label: 'Mail them all this week', effects: { fund: 800, burnout: 10 },
          outcome: 'Four hundred parcels, eleven trips to the post office, one tape-gun injury. The postmaster knows your names now. $800.' },
        { label: 'Hand-deliver the local ones', effects: { fund: 600, fans: 80, burnout: 6 },
          outcome: 'Marcel delivers in person, in the cape. One fan faints. Several invite you in for supper. You gain eleven pounds and eighty fans.' },
        { label: 'Hire Cousin Dale', effects: { fund: 500, mood: { all: 4 } },
          outcome: "Dale does it all for pizza and a credit on the album: 'Logistics: Dale'. He's never been prouder. Two parcels go to the wrong province." }
      ] },
    { id: 'signed_diy_distributor', type: 'money', speaker: 'dana', title: 'The Distributor',
      gate: g({ era: S, flagEquals: { label: 'diy' } }),
      text: "A distribution company in Winnipeg wants to put your album in record stores across the country, for thirty percent. " +
        "Dana has read the contract twice and found a clause about 'territories including the Moon'. They say it's standard.",
      choices: [
        { label: 'Sign with them', effects: { fans: 250, fund: -500, buzz: 6 },
          outcome: 'Your album is in shops from Victoria to St. John\'s. The $500 set-up fee stings. The Moon has not yet ordered any.' },
        { label: 'Stay in the hockey bag', effects: { fund: 400, burnout: 6 },
          outcome: 'You keep selling from the van, the merch table and a hockey bag. Every dollar is yours. Every dollar is also a trip to the post office.' },
        { label: 'Cross out the Moon', hint: 'Gamble: they respect it, or they walk',
          outcome: 'Dana crosses out the Moon clause and initials it.',
          roll: { chance: 0.5,
            success: { effects: { fans: 250, fund: -200, mood: { dana: 8 } }, outcome: 'They respect it. Twenty percent, no Moon, and they waive half the fee. Dana is now their favourite client and their most feared.' },
            fail: { effects: { mood: { dana: -4 }, burnout: 4 }, outcome: 'They walk. Their next email is addressed to "The Moon People". Dana has it framed.' } } }
      ] },
    { id: 'signed_diy_warehouse', type: 'money', speaker: 'dad', title: 'The Car Stays Outside',
      gate: g({ era: S, flagEquals: { label: 'diy' }, minWeek: 40 }),
      text: 'The garage is now a rehearsal space, a label office and a warehouse holding two thousand CDs and six hundred shirts. ' +
        "Dad's truck has been parked outside all winter. Dad would like to park the truck in the garage. Just once. Before he dies.",
      choices: [
        { label: 'Rent a storage unit', effects: { fund: -300, mood: { all: 3 }, chemistry: 3 },
          outcome: "$300 for a storage unit in Warman. Dad parks the truck inside for one glorious night. He sits in it. He doesn't turn it on. He's happy." },
        { label: 'Fire sale: everything $5', effects: { fund: 600, fans: 100, burnout: 6 },
          outcome: 'One Saturday, everything five dollars, cash only. The line goes around the block. Dad works the till. He is weirdly good at it.' },
        { label: 'Stack it higher', effects: { mood: { jaxon: 3 }, burnout: 4 },
          outcome: 'Jaxon builds a CD tower to the rafters, stable enough to survive a blast beat. Mostly. Dad parks outside and looks at the garage the way a man looks at the sea.' }
      ] },

    // ======================================================================
    // v0.5 Signed: fame, family and the band
    // ======================================================================
    { id: 'signed_music_video', type: 'fame', speaker: 'marcel', title: 'The Music Video', gate: g({ era: S }),
      text: 'The music video shoot: a canola field near Rosthern, a fog machine, a borrowed drone, a rented horse that does not want to be ' +
        "here, and Marcel in the cape on a hay bale. The director is twenty-two and keeps saying 'vibes'.",
      choices: [
        { label: 'Marcel rides the horse', hint: 'Gamble: epic, or a very long walk',
          outcome: 'Marcel mounts the horse. The drone lifts off. The fog rolls.',
          roll: { chance: 0.5, stat: 'chemistry', statScale: 0.005,
            success: { effects: { fans: 300, buzz: 14 }, outcome: 'The horse gallops into the fog, cape streaming, perfect sunset. People think it is CGI. It is not. The horse was a pro.' },
            fail: { effects: { fund: -400, buzz: 6, burnout: 6 }, outcome: 'The horse walks calmly to Saskatoon. Marcel stays on for all of it, stoic. The drone follows. That footage becomes the video. $400 horse fee.' } } },
        { label: 'Just the band and the fog', effects: { fans: 180, buzz: 8, fund: -200 },
          outcome: "Classic. Moody. The fog machine sets off a farmer's smoke alarm three kilometres away, which you didn't know was possible. $200." },
        { label: 'Let the director do "vibes"', effects: { buzz: 10, mood: { all: -4 } },
          outcome: "The video is ninety seconds of Kenji eating a peach in slow motion. It's his idea of the band's vibe. Pitchspork declares it art." }
      ] },
    { id: 'signed_morning_tv', type: 'fame', speaker: 'jaxon', title: 'Good Morning Saskatchewan', gate: g({ era: S }),
      text: "You're booked on Good Morning Saskatchewan, live at 7 a.m., between a cooking segment and the weather. The host has " +
        "never heard metal. The kitchen set is right behind you. There are eggs everywhere. Baba is watching.",
      choices: [
        { label: 'Play the loud one', hint: 'Gamble: morning TV is not ready',
          outcome: 'You count in the heaviest song you have.',
          roll: { chance: 0.5, stat: 'buzz', statScale: 0.005,
            success: { effects: { fans: 250, buzz: 12 }, outcome: 'The host headbangs. The weatherman headbangs. The eggs on the kitchen set headbang. It is the most-watched clip in the show\'s history.' },
            fail: { effects: { buzz: 4, mood: { jaxon: -5 } }, outcome: 'The host covers her ears live on air. The weatherman says "and speaking of storms". Baba phones the station to complain about you, to you.' } } },
        { label: 'Play it acoustic', effects: { fans: 150, mood: { dana: -4 } },
          outcome: "Acoustic, at dawn, Marcel sings softly about his lawn. Retirees across the province weep into their porridge. Dana hates every second." },
        { label: 'Marcel does the cooking', effects: { buzz: 10, fans: 100, mood: { marcel: 6 } },
          outcome: "Marcel hijacks the cooking segment and makes a perfect omelette in his cape, narrating in French. The station offers him a show. He considers it." }
      ] },
    { id: 'signed_royalty_statement', type: 'money', speaker: 'dana', title: 'The Royalty Statement', gate: g({ era: S, minWeek: 30 }),
      text: "Your first royalty statement: forty-three pages, a lot of recoupment, and a final line that reads $3.12. Most of the " +
        "streams are from Finland. Nobody in the band has ever been to Finland. Marcel has gone very quiet.",
      choices: [
        { label: 'Frame the $3.12', effects: { chemistry: 5, mood: { all: 4 } },
          outcome: 'It goes on the trophy wall next to the Deci-Hell review. Dad adds a sticky note: "A start." Mom adds one: "Proud!"' },
        { label: 'Hire an accountant', effects: { fund: 500, mood: { marcel: -3 } },
          outcome: "The only accountant who returns your call is Tundra Wraith's frontman. He finds you $500 in unpaid royalties. He charges nothing. 'Buddy!'" },
        { label: 'Ask Marcel about Finland', effects: { buzz: 6, mood: { marcel: 6 } },
          outcome: "Marcel confesses he posted a demo under a fake name, sung from the point of view of a moose. Finland loves it. 'The moose,' he whispers, 'is a Finnish sound.'" }
      ] },
    { id: 'signed_parents_proud', type: 'drama', speaker: 'dad', title: 'Eleven Copies', gate: g({ era: S }),
      text: "Mom has bought eleven copies of the album, one for each relative and four 'for emergencies'. Dad has read the credits " +
        "twice. He has a question. The question is about your pension plan. He's printed a brochure.",
      choices: [
        { label: 'Take the brochure', effects: { fund: -200, mood: { all: 3 }, chemistry: 4 },
          outcome: 'You open a small retirement savings plan with $200. Dad shakes your hand like you just won the provincial bonspiel. Mom takes a photo.' },
        { label: 'Play Dad the album', effects: { mood: { all: 5 }, chemistry: 5 },
          outcome: 'Dad sits through the whole album in the truck with his eyes closed. At the end he says "the drums were good". He has never said more.' },
        { label: 'Sign the emergency copies', effects: { fans: 60, buzz: 4 },
          outcome: 'Mom gives the emergency copies to the dentist, the mail carrier, her hairdresser and Father Mykola. Father Mykola plays it at the church picnic.' }
      ] },
    { id: 'signed_marcel_day_job', type: 'drama', speaker: 'marcel', title: 'The Resignation Letter', gate: g({ era: S, minWeek: 36 }),
      text: 'Marcel has written his resignation letter to Prairie Mutual Insurance. It is eleven pages, in French, and ends with ' +
        "'I go now to the abyss.' He wants you to read it before he hands it in. He's already wearing the cape.",
      choices: [
        { label: 'Hand it in, Lord Abyssus', effects: { mood: { marcel: 16 }, burnout: -8, fund: -300 },
          outcome: "He hands it in at 9:02. His co-workers give him a standing ovation and a cake shaped like a cape. You cover his rent this month. $300." },
        { label: 'Keep the day job', effects: { mood: { marcel: -10 }, fund: 300 },
          outcome: "He files the letter in a shoebox labelled LATER. He sells hail insurance in eyeliner. He's the best agent in the province." },
        { label: 'Part-time, like Dana', effects: { mood: { marcel: 6 }, burnout: -4, chemistry: 3 },
          outcome: "He edits it to one page: 'I go now to the abyss, Tuesday to Thursday.' His boss agrees. Hail season will be complicated." }
      ] },
    { id: 'signed_dana_signature', type: 'drama', speaker: 'dana', title: 'The Signature Model', gate: g({ era: S, minFans: 3000 }),
      text: "Tonnerre of Laval want to build a Dana Okafor signature guitar. Dana has sent them sixty pages of specs, including a " +
        "diagram of the ideal frets and a poem about pickups. They have asked, gently, if she could narrow it down.",
      choices: [
        { label: 'Let Dana have everything', effects: { mood: { dana: 14 }, fund: -400, skill: { dana: 2 } },
          outcome: 'Eight strings, stainless frets, a pickup called "The Hailstorm". It costs $400 extra to prototype. Dana cries when she plays it.' },
        { label: 'One page of specs', effects: { mood: { dana: -6 }, fund: 600 },
          outcome: "The guitar is simpler, cheaper and sells well. You get $600. Dana plays one in a shop and says 'fine'. From Dana it means 'betrayal'." },
        { label: 'Let fans vote on the colour', effects: { fans: 200, buzz: 8, mood: { dana: 3 } },
          outcome: 'Fans vote for "Hail Grey". It becomes the band\'s colour. Dana secretly wanted Hail Grey. She pretends she wanted purple.' }
      ] },
    { id: 'signed_baba_contract', type: 'drama', speaker: 'baba', title: 'Baba Reads the Contract', gate: g({ era: S, flagEquals: { label: 'gopherwood' } }),
      text: "Baba has read the whole label contract with a magnifying glass and a red pen. She found three typos, a clause she " +
        "calls 'a crime', and a page about merch rights she wants to discuss with 'the man in charge'. She has her coat on.",
      choices: [
        { label: 'Let Baba negotiate', hint: 'Gamble: never bet against Baba',
          outcome: 'Baba takes the bus to the label office with a roaster of cabbage rolls.',
          roll: { chance: 0.6,
            success: { effects: { fund: 800, mood: { jaxon: 8 }, flags: { babaManager: true } }, outcome: "She returns with $800 in back royalties and the label's cabbage roll order for Christmas. The label now calls her 'Mrs. K'." },
            fail: { effects: { fund: -200, mood: { jaxon: -5 } }, outcome: "The label man refuses to budge. Baba refuses to leave. They both lose. You pay $200 in legal fees and a lot of cabbage rolls." } } },
        { label: 'Thank her, file it', effects: { mood: { jaxon: 4 }, chemistry: 3 },
          outcome: 'Baba\'s notes go in a folder marked "BABA\'S NOTES". You read them later. She was right about all three typos and the crime.' },
        { label: 'Hire her as manager', effects: { fund: -300, buzz: 6, mood: { jaxon: 6 }, flags: { babaManager: true } },
          outcome: "Ten percent, a desk in the garage and a phone line. Promoters now call before 9 p.m. and ask how she's doing. $300 set-up." }
      ] },
    { id: 'signed_tundra_congrats', type: 'scene', speaker: 'wraith_frontman', title: 'Congrats, Buddy!', gate: g({ era: S }),
      text: 'The fruit basket has evolved. It is now a fruit bouquet, a metre tall, with a pineapple carved into a skull on top. The ' +
        "card reads: 'CONGRATS ON THE DEAL, BUDDY!! Can't wait to see you at the Loonies! Your pals, Tundra Wraith.'",
      choices: [
        { label: 'Send a thank-you card', effects: { chemistry: 3, mood: { all: 3 } },
          outcome: "They send a card thanking you for the card. You send one back. It's March before anybody stops. The post office lady knows everything." },
        { label: 'Send a bigger basket back', effects: { fund: -150, buzz: 6 },
          outcome: 'You send a basket with a watermelon carved into a moose. $150. They post a photo of it, captioned "our rivals are the BEST". You lost somehow.' },
        { label: 'Eat the skull', effects: { mood: { all: 6 }, burnout: -5 },
          outcome: 'The band eats a pineapple skull in total silence, looking at each other. It is the most metal thing you have done all year.' }
      ] },
    { id: 'signed_kenji_sunglasses', type: 'weird', speaker: 'kenji', title: 'The Sunglasses', gate: g({ era: S }),
      text: "At the album photo shoot, the photographer asks Kenji to take off his sunglasses 'for just one shot'. The studio goes " +
        "silent. Dana steps back. Marcel crosses himself. Kenji's hand moves slowly toward the frames.",
      choices: [
        { label: 'Let it happen', hint: 'Gamble: nobody knows what is under there',
          outcome: 'Kenji removes the sunglasses.',
          roll: { chance: 0.5,
            success: { effects: { buzz: 14, fans: 200 }, outcome: 'There is a second, smaller pair of sunglasses underneath. The photographer laughs until she cries. It becomes the album cover.' },
            fail: { effects: { mood: { kenji: -8 }, buzz: 6 }, outcome: 'Nobody will ever say what they saw. The photographer changes careers. The photos are never developed. Kenji puts them back on.' } } },
        { label: 'Step in front of him', effects: { mood: { kenji: 10 }, chemistry: 6 },
          outcome: "'Not today.' Kenji rests a hand on your shoulder for one second. It's the most affection he has ever shown. You'll think about it for years." },
        { label: 'Everyone wears sunglasses', effects: { buzz: 8, chemistry: 4 },
          outcome: 'The whole band in sunglasses, indoors, at night. Marcel adds a monocle over his. It becomes the look. Fans copy it at every show.' }
      ] },
    { id: 'signed_radio_callin', type: 'fame', speaker: 'dj', title: 'Caller, You\'re On the Air', once: false, cooldown: 8, gate: g({ era: S }),
      text: "Deb Wiebe has moved from campus radio to the big station's late show and has you in as guests. The phone lines light up. " +
        "Line one wants to know what the lyrics mean. Line two is your mom. Line three is breathing heavily. Probably Gord.",
      choices: [
        { label: 'Explain the lyrics', effects: { fans: 120, mood: { marcel: 6 } },
          outcome: 'Marcel explains every lyric on the album. It takes forty minutes. They are all about the lawn. The callers are moved. One caller re-sods.' },
        { label: 'Take Mom\'s call', effects: { chemistry: 5, fans: 60, mood: { all: 3 } },
          outcome: "Mom tells the whole province you used to eat crayons. Then she dedicates the next song to 'my boys and Dana'. Ratings spike." },
        { label: 'Play live in the booth', effects: { buzz: 10, burnout: 5, fans: 90 },
          outcome: "You play the loud one in a booth built for a man and a microphone. Deb whispers 'brutal' like a lullaby. The station's transmitter trips." }
      ] },
    { id: 'signed_fan_tattoo', type: 'fame', speaker: 'gord', title: 'The Tattoo', once: false, cooldown: 12, gate: g({ era: S, minFans: 1500 }),
      text: "A fan at the merch table rolls up his sleeve: the Hail Damage logo, tattooed across his forearm. It says HALE DAMAGE. " +
        "He got it copied from one of the misprinted shirts. He is incredibly proud. Gord is filming.",
      choices: [
        { label: 'Sign it, correct it', effects: { fans: 100, buzz: 6 },
          outcome: "Marcel signs underneath and adds 'the I is silent, like Kenji'. The fan gets the signature tattooed too. It's now a pilgrimage site." },
        { label: 'Make HALE official merch', effects: { fund: 400, buzz: 8 },
          outcome: "You print a new run of HALE DAMAGE shirts on purpose. They outsell the real ones. Dad is furious on behalf of spelling. $400." },
        { label: 'Buy him a coffee', effects: { mood: { all: 4 }, fans: 50 },
          outcome: "You buy him a coffee and hear about his hometown, his tattoo artist and his cat, Riff. He'll be at every show for the next decade." }
      ] },
    { id: 'signed_press_junket', type: 'fame', speaker: 'marcel', title: 'Press Day', once: false, cooldown: 10, gate: g({ era: S }),
      text: 'Press day: eleven phone interviews back to back. Every one asks where the name Hail Damage comes from. The weekly paper in ' +
        "Moose Jaw asks if Marcel is single. Marcel has answered every question in character. Some of them in Latin.",
      choices: [
        { label: 'Stay on message', effects: { fans: 120, burnout: 6 },
          outcome: "Eleven interviews, eleven identical answers: 'The hail. It damaged us. It damages us still.' Every paper prints it. It becomes a T-shirt." },
        { label: 'Let Dana do them', effects: { buzz: 8, mood: { dana: 6, marcel: -4 } },
          outcome: 'Dana explains pickup winding for six hours. A guitar magazine in Montreal gives her a column. Marcel says he is "happy for her" through his teeth.' },
        { label: 'Send Kenji', effects: { buzz: 12, mood: { kenji: -4 } },
          outcome: "Kenji takes all eleven calls. He says nothing on any of them. Three outlets run 'THE SILENT INTERVIEW' as a feature. One wins an award." }
      ] },
    { id: 'signed_rider', type: 'money', speaker: 'dana', title: 'The Rider', once: false, cooldown: 10, gate: g({ era: S, minFans: 1200 }),
      text: "Theatres now ask for your rider. Dana's draft: black grapes for Marcel, a vegetable tray arranged as a pentagram, perogies " +
        "from Baba only, one (1) bowl of green candies with the others removed, and 'nothing for Kenji, he brings his own'.",
      choices: [
        { label: 'Send it as written', effects: { buzz: 6, mood: { all: 4 }, fund: -150 },
          outcome: 'The theatres comply. Somewhere a stagehand sorts a thousand candies by colour. The pentagram tray is beautiful. $150 in extras.' },
        { label: 'Just water and a towel', effects: { fund: 150, mood: { marcel: -5 } },
          outcome: 'Promoters love you. Word gets around: "easy band". Marcel smuggles grapes in his cape like a very sad squirrel.' },
        { label: "Ask what Kenji brings", effects: { chemistry: 4, mood: { kenji: 5 } },
          outcome: 'Kenji opens his bag: one apple, one orange, one hard-boiled egg, every show, forever. Nobody asks again. The egg is never mentioned.' }
      ] },
    { id: 'signed_fan_mail', type: 'fame', speaker: 'mom', title: 'A Sack of Mail', once: false, cooldown: 12, gate: g({ era: S }),
      text: "The fan mail now comes to Mom's house in a Canada-sized sack. Drawings, letters, a hand-knit cape, a jar of pickles from " +
        "Yorkton, and a letter from a girl in Rimouski who has written a French-language fan fiction in which Marcel is a lawn.",
      choices: [
        { label: 'Answer every letter', effects: { fans: 150, burnout: 8 },
          outcome: 'Three nights at the kitchen table. Mom does the envelopes. Kenji signs his name with the small bird. A kid in Flin Flon frames hers.' },
        { label: 'Mom answers them', effects: { fans: 80, chemistry: 4, chat: { who: 'mom', text: 'Answered 212 letters. Told them all to wear a toque. Pickles are good!' } },
          outcome: "Mom answers them all herself, signed 'The Drummer's Mom'. She now has more pen pals than you have fans in Regina." },
        { label: 'Marcel reads the fan fiction', effects: { mood: { marcel: 10 }, buzz: 4 },
          outcome: "Marcel reads it aloud in the van, all 90 pages. He is moved. He is the lawn. He has never felt so understood." }
      ] },
    { id: 'signed_hotel_waffles', type: 'drama', speaker: 'jaxon', title: 'The Waffle Machine', once: false, cooldown: 12, gate: g({ era: S }),
      text: "The label put you in a real hotel in Regina with a free breakfast. Jaxon has discovered the waffle machine. It is 6 a.m. " +
        "He has made eleven waffles. He is making more. Baba has phoned twice to ask if he is eating vegetables.",
      choices: [
        { label: 'Waffles for everyone', effects: { mood: { all: 6 }, burnout: -5 },
          outcome: 'The band eats waffles until the machine overheats. Kenji makes one perfect waffle, eats half, leaves the rest as a sculpture.' },
        { label: 'Tell Baba the truth', effects: { mood: { jaxon: -6 }, chemistry: 4 },
          outcome: 'Baba sends a care package to the hotel by bus. It is mostly cabbage. Jaxon eats it in the lobby, humbled.' },
        { label: 'Film the waffle tower', effects: { buzz: 8, fans: 60 },
          outcome: "A tower of thirty waffles, with Marcel's cape draped over it. The clip goes around. The hotel asks you back as 'brand ambassadors'." }
      ] },
    { id: 'signed_old_garage', type: 'drama', speaker: 'marcel', title: 'Leaving the Garage?', gate: g({ era: S, minWeek: 48 }),
      text: "A real rehearsal room downtown has come up: soundproofing, heat, a sink. Marcel wants it. Dana wants it. Jaxon wants it " +
        "but is afraid to tell Baba. Kenji is sitting in his corner of the garage, very still, one hand on the wall.",
      choices: [
        { label: 'Stay in the garage', effects: { chemistry: 8, mood: { kenji: 8, marcel: -4 } },
          outcome: "You stay. Mom brings pizza pops. Dad pretends to be annoyed. Kenji's hand comes off the wall. The garage stays yours." },
        { label: 'Rent the room downtown', effects: { fund: -600, drumSkill: 2, mood: { kenji: -8 } },
          outcome: "$600 for the first months. Great room. Great sound. On the first night, Kenji brings a brick from the garage and puts it in his corner." },
        { label: 'Both: weeknights downtown', effects: { fund: -300, chemistry: 4, burnout: -4 },
          outcome: 'Weeknights in the good room, weekends in the garage. Mom still sends pizza pops downtown, by taxi. $300.' }
      ] },

    // ======================================================================
    // v0.5 The Moose Album (chain 'moose'; starts from flags.mooseMuse, set by weird_moose or a Loonies speech)
    //   1 moose_1_demo ── genius ─> 2 moose_2_full ── (any) ──────────────> 3 moose_3_finland ─> end (ready | finland | shelved)
    //                  ── one song ─> 2 moose_2_song ── cut to five ─> end (song)
    //                                                ── whole side / Kenji ──> 3 moose_3_finland
    //                  ── no ─> end (shelved)
    //   flags.mooseAlbum = 'shelved' | 'song' | 'ready' | 'finland' (v0.7: the World era pays it off, platinum in Finland).
    //   Helper flags moosePlan / mooseCall are cleared when the chain ends.
    // ======================================================================
    { id: 'moose_1_demo', type: 'weird', speaker: 'marcel', title: 'Élan Éternel', chain: 'moose', step: 1, weight: 2,
      gate: g({ era: LS, flags: ['mooseMuse'] }),
      text: "Marcel plays you a forty-minute demo on a boombox: 'Élan Éternel', a concept album told by the moose from the " +
        "driveway. Fourteen songs. The moose falls in love with a mailbox. Track nine is just breathing.",
      choices: [
        { label: "It's genius. Keep going.", effects: { mood: { marcel: 10 }, flags: { moosePlan: 'full' }, chain: { moose: { step: 2, delay: 3 } } },
          outcome: 'Marcel hugs the boombox. He sews antlers onto a hoodie. He says the moose "has more to say".' },
        { label: 'One moose song. On the album.', effects: { mood: { marcel: 4 }, chemistry: 3, flags: { moosePlan: 'song' }, chain: { moose: { step: 2, delay: 3 } } },
          outcome: "'One song,' he agrees, much too quickly." },
        { label: 'Marcel. No.', effects: { mood: { marcel: -10 }, flags: { mooseAlbum: 'shelved' }, chain: { moose: { step: 'end' } } },
          outcome: "He ejects the tape and puts it in a shoebox labelled LATER. He writes the date on the lid. He underlines LATER twice." }
      ] },
    { id: 'moose_2_full', type: 'weird', speaker: 'marcel', title: 'The Rut', chain: 'moose', step: 2,
      gate: g({ era: LS, flagEquals: { moosePlan: 'full' } }),
      text: 'Marcel needs real moose calls for the album. He has booked a dawn field trip to Prince Albert National Park, in the ' +
        'middle of the rut. He has a camouflage cape. He has a microphone taped to a hockey stick.',
      choices: [
        { label: 'Dawn. The rut. Go.', hint: 'Gamble: a real moose, or a real moose',
          outcome: 'Marcel wades into the marsh and calls.',
          roll: { chance: 0.5,
            success: { effects: { buzz: 8, flags: { mooseCall: 'real' }, chain: { moose: { step: 3, delay: 4 } } },
              outcome: 'A bull answers from thirty metres away. The recording is extraordinary. So is the running.' },
            fail: { effects: { burnout: 8, mood: { all: -4 }, chain: { moose: { step: 3, delay: 4 } } },
              outcome: 'Nine hours in a swamp, no moose. On the drive home one walks up to the van, looks at Marcel and leaves. He takes it as a review.' } } },
        { label: 'Jaxon does the moose call', effects: { mood: { jaxon: 6 }, chemistry: 3, chain: { moose: { step: 3, delay: 4 } } },
          outcome: "Jaxon has done a moose call since cadet camp. It's disturbingly good. The neighbour's dog won't come out from under the deck." },
        { label: 'Buy a sound-effects CD', effects: { fund: -25, mood: { marcel: -5 }, chain: { moose: { step: 3, delay: 4 } } },
          outcome: "'Sounds of the Canadian Wilderness, Vol. 2', $25 at a thrift store. Track 14 is a moose. Marcel calls it 'a studio moose'." }
      ] },
    { id: 'moose_2_song', type: 'weird', speaker: 'marcel', title: 'The One Moose Song', chain: 'moose', step: 2,
      gate: g({ era: LS, flagEquals: { moosePlan: 'song' } }),
      text: "Marcel's 'one moose song' is twenty-three minutes long, in seven movements, and ends with the moose ascending to " +
        'heaven over a Co-op gas bar. He calls it the radio edit.',
      choices: [
        { label: 'Cut it to five minutes', effects: { mood: { marcel: -6 }, fans: 30, flags: { mooseAlbum: 'song', moosePlan: false }, chain: { moose: { step: 'end' } } },
          outcome: 'The five-minute cut is great, actually. The other eighteen minutes go in the LATER shoebox. It is getting full.' },
        { label: 'Fine. Give it a whole side.', effects: { mood: { marcel: 8 }, flags: { moosePlan: 'full' }, chain: { moose: { step: 3, delay: 4 } } },
          outcome: "Side B is now the moose. Dana negotiates a solo in movement four. Jaxon plays the moose's heartbeat on the low string." },
        { label: 'Let Kenji decide', effects: { mood: { kenji: 4 }, flags: { moosePlan: 'full' }, chain: { moose: { step: 3, delay: 4 } } },
          outcome: "Kenji listens to all twenty-three minutes without moving, then walks to the whiteboard and writes: '!'" }
      ] },
    { id: 'moose_3_finland', type: 'weird', speaker: 'marcel', title: 'Big in Finland', chain: 'moose', step: 3,
      gate: g({ era: LS, flagEquals: { moosePlan: 'full' } }),
      text: "Someone put Marcel's moose demos online. A Finnish metal blog calls it 'the most important moose-related record ever " +
        "made'. Four thousand plays, all from Finland. Marcel has started learning Finnish. It is going badly.",
      choices: [
        { label: 'Finish the moose album', effects: { buzz: 8, mood: { marcel: 10 }, flags: { mooseAlbum: 'ready', moosePlan: false, mooseCall: false }, chain: { moose: { step: 'end' } } },
          outcome: 'The finished demos go into a folder called ÉLAN. Marcel says the world is not ready. The world, specifically Finland, disagrees.' },
        { label: 'Send Finland a T-shirt', effects: { fans: 40, buzz: 6, flags: { mooseAlbum: 'finland', moosePlan: false, mooseCall: false }, chain: { moose: { step: 'end' } } },
          outcome: 'You mail a shirt to the blog in Tampere. They post a photo of it on a real moose, somehow. The Finnish fan club has eleven members.' },
        { label: 'Too weird. Shelve it.', effects: { mood: { marcel: -10 }, chemistry: -3, flags: { mooseAlbum: 'shelved', moosePlan: false, mooseCall: false }, chain: { moose: { step: 'end' } } },
          outcome: 'The tapes go in the LATER shoebox, under his bed. Every so often you hear him humming track nine. The breathing one.' }
      ] },

    /* ==========================================================================================================
       v0.6.1 (WORLD, Addendum 1 C7): holiday Monday cards. GG.calendar.holidayCard puts them on their holiday's Monday
       (content/calendar.js holidays[].cards, in priority order); once:false + cooldown 20 = once a year. Week 1 of
       year one belongs to Lord Abyssus, so Canada Day starts in year two.
       ========================================================================================================== */
    { id: 'holiday_canada_day', type: 'scene', speaker: 'dad', title: 'Canada Day', once: false, cooldown: 20,
      gate: g({ era: GLS, weekOfYear: [1, 1] }),
      text: 'Canada Day. The park bandshells are booking free shows, Mom is doing a barbecue, and Dad bought fireworks "from a guy". The guy was also named Dad.',
      choices: [
        { label: 'Flyers at the park all day', hint: 'Buzz ↑ · burnout ↑', effects: { buzz: 8, fans: 12, burnout: 5 },
          outcome: 'You hand out four hundred flyers in a maple-leaf toque. A kid asks if you are "the moose band". You are now.' },
        { label: "Dad's fireworks", hint: 'Gamble: a show or a fire truck',
          roll: { chance: 0.5, success: { effects: { chemistry: 6, mood: { all: 5 } }, outcome: 'Twelve minutes of glory over the garage. Mr. Lindqvist watches from his lawn chair and claps. Once.' },
            fail: { effects: { fund: -80, mood: { marcel: -5 } }, outcome: "A roman candle finds Marcel's cape. The fire department is very nice about it. The fine is not." } },
          outcome: 'Dad reads the instructions, then puts them in his pocket.' },
        { label: "Mom's barbecue", hint: 'Moods ↑ · burnout ↓', effects: { burnout: -6, mood: { all: 4 } },
          outcome: 'Burgers, corn, a lawn game with horse bones. Baba wins. Baba always wins.' }
      ] },

    { id: 'holiday_thanksgiving_guilt', type: 'money', speaker: 'mom', title: 'Thanksgiving Dinner', once: false, cooldown: 20,
      gate: g({ era: GLS, weekOfYear: [7, 7], flags: ['parentsLoan'] }),
      text: "Thanksgiving at your parents'. Mom made the good stuffing. Dad says grace, and somehow grace is about the loan. \"And thank you, Lord, for repayment schedules.\"",
      choices: [
        { label: 'Pay back $100 over pie', hint: 'Debt ↓ · guilt ↓', effects: { repay: 100, chemistry: 2 },
          outcome: 'You slide five twenties under the pumpkin pie. Dad counts them twice. Mom cries a little. Nobody mentions it again until Christmas.' },
        { label: 'Talk about the band instead', hint: 'Gamble: pride or a lecture',
          roll: { chance: 0.45, stat: 'buzz', statScale: 0.005,
            success: { effects: { mood: { all: 4 }, chemistry: 3 }, outcome: 'You show them a video of the last gig. Dad watches it three times. He says "hm". It is the best "hm" of your life.' },
            fail: { effects: { burnout: 6 }, outcome: 'Dad pulls out a folder labelled BAND. There are tabs. There is a pie chart. The pie is also a chart.' } },
          outcome: 'You clear your throat.' },
        { label: 'Eat three plates, say nothing', hint: 'Burnout ↓', effects: { burnout: -5, mood: { jaxon: 3 } },
          outcome: 'Stuffing, turkey, perogies, stuffing again. The loan is not mentioned. It is in the room. It had seconds.' }
      ] },

    { id: 'holiday_thanksgiving', type: 'scene', speaker: 'baba', title: 'Thanksgiving', once: false, cooldown: 20,
      gate: g({ era: GLS, weekOfYear: [7, 7], notFlags: ['parentsLoan'] }),
      text: "Thanksgiving. Baba has brought a turkey the size of a bass amp and invited the whole band. Everyone asks when you will get a real job. Baba asks when the next show is.",
      choices: [
        { label: 'Bring the whole band', hint: 'Chemistry ↑', effects: { chemistry: 5, burnout: -4 },
          outcome: 'Marcel says grace in Latin. Kenji carves the turkey without a word, perfectly. Baba rates it a nine.' },
        { label: 'Play an acoustic set after pie', hint: 'Fans ↑', effects: { fans: 8, mood: { dana: 3 } },
          outcome: "Unplugged metal in the living room. The cousins film it. An aunt from Humboldt asks for your 'CD-ROM'." },
        { label: 'Leftovers for the week', hint: '+$30 of food · moods ↑', effects: { fund: 30, mood: { all: 3 } },
          outcome: 'Eleven containers of leftovers. The band eats like royalty until Tuesday. The garage smells like gravy.' }
      ] },

    { id: 'holiday_halloween', type: 'fame', speaker: 'marcel', title: 'Halloween Costume Gigs', once: false, cooldown: 20,
      gate: g({ era: GLS, weekOfYear: [8, 8] }),
      text: 'Halloween: every bar wants costume bands, and the rule is you dress as ANOTHER band. Marcel has a proposal, a sketchbook and a glue gun.',
      choices: [
        { label: 'Go as Tundra Wraith', hint: 'Buzz ↑', effects: { buzz: 6, flags: { costume: 'Tundra Wraith (veggie tray included)' } },
          outcome: 'Corpse paint, cardigans, a veggie tray on the kick drum. Gord hears about it and sends a fruit basket "for the effort, buddy".' },
        { label: 'One moose. All of you.', hint: 'Gamble: legendary or a disaster',
          roll: { chance: 0.5,
            success: { effects: { buzz: 10, fans: 15, flags: { costume: 'a moose (all four of you, one costume)' } }, outcome: 'The moose plays a whole set. The crowd loses its mind. Somebody proposes to the moose.' },
            fail: { effects: { burnout: 6, flags: { costume: 'half a moose' } }, outcome: 'The moose splits at the seam mid-song. Jaxon, the back half, plays on alone. It is a lot.' } },
          outcome: 'Marcel unrolls forty metres of brown felt.' },
        { label: "Costumes? We ARE the costume.", hint: 'Chemistry ↑', effects: { chemistry: 3, flags: { costume: 'Hail Damage (nobody noticed)' } },
          outcome: 'You go as yourselves. Four people compliment the costumes. One says the cape is "a bit much". Marcel is honoured.' }
      ] },

    { id: 'holiday_grey_mug', type: 'fame', speaker: 'dj', title: 'The Grey Mug Halftime Show', once: true,
      gate: g({ era: S, weekOfYear: [10, 10], minFans: 20000, minYear: 4 }),
      text: 'Deb, very quietly: "The Grey Mug called. The big football final. They want you for the halftime show. Four million people. Twelve minutes. A stage on wheels. Say yes, sweetie."',
      choices: [
        { label: 'Three hits, twelve minutes', hint: 'Fans ↑↑ · buzz ↑↑', effects: { fans: 400, buzz: 18, burnout: 10, flags: { greyMug: 'played' } },
          outcome: 'The stage rolls onto the fifty-yard line. You play three songs in a snowstorm. The whole country hears your double kick.' },
        { label: 'The cape, the pyro, everything', hint: 'Gamble: history or a meme',
          roll: { chance: 0.55, stat: 'chemistry', statScale: 0.005,
            success: { effects: { fans: 400, buzz: 18, flags: { greyMug: 'played' } }, outcome: 'Marcel spins, the pyro hits on the downbeat, four million people scream. It is replayed for years.' },
            fail: { effects: { fans: 250, buzz: 12, mood: { marcel: -8 }, flags: { greyMug: 'played' } }, outcome: 'The pyro goes off a bar early. The cape survives. The goalposts do not. It is a meme by Monday.' } },
          outcome: 'Marcel has already called the pyro guy.' },
        { label: "We're a club band. Pass.", hint: 'Chemistry ↑', effects: { chemistry: 6, burnout: -8 },
          outcome: 'You watch the game at the Gopher Hole. A band you have never heard of plays halftime. You heckle, lovingly.' }
      ] },

    { id: 'holiday_xmas_single', type: 'fame', speaker: 'dj', title: 'The Christmas Single', once: false, cooldown: 20,
      gate: g({ era: S, weekOfYear: [11, 12], flags: ['label'] }),
      text: 'Deb got the label\'s pitch before you did: a Christmas single. "Grandma Got Run Over by a Zamboni", with sleigh bells. (If you\'re DIY, it\'s Mom\'s pitch. Same song.)',
      choices: [
        { label: 'Record it. Sleigh bells and all.', hint: 'Fans ↑ · dignity ↓', effects: { fans: 250, fund: 400, mood: { marcel: -8 } },
          outcome: 'It charts. It plays in every mall. Marcel hears it in a pharmacy and has to sit down.' },
        { label: "Metal it: 'Silent Night (Eternal)'", hint: 'Gamble: a cult classic or a flop',
          roll: { chance: 0.5,
            success: { effects: { buzz: 15, fans: 300 }, outcome: 'Blast beats, a choir, sleigh bells tuned to D. Deci-Hell gives it six skulls out of five.' },
            fail: { effects: { buzz: -6, fund: -300 }, outcome: 'Nobody wants a nine-minute "Silent Night". The label prints two thousand CDs anyway. They are coasters now.' } },
          outcome: 'Dana tunes the sleigh bells down.' },
        { label: 'Refuse. It is a matter of principle.', hint: 'Chemistry ↑ · label ↓', effects: { chemistry: 5, buzz: -4 },
          outcome: 'The label sends a fruit basket with a note: "Disappointed but festive." Marcel eats the fruit. Principles are one thing.' }
      ] },

    { id: 'holiday_xmas_parties', type: 'money', speaker: 'barb', title: 'Christmas Party Season', once: false, cooldown: 20,
      gate: g({ era: GLS, weekOfYear: [11, 12] }),
      text: "Barb, on the phone: every office, curling club and potash mine in the district wants a band for its Christmas party. \"Ugly sweaters mandatory, dear. No throat thing.\"",
      choices: [
        { label: 'The curling club party', hint: 'Books this weekend (if free)', effects: { book: 'warman_curling_lounge', chemistry: 2 },
          outcome: 'Barb books you for Saturday. Your sweaters have reindeer. Jaxon\'s reindeer is on fire. On purpose.' },
        { label: "The dentist's office party", hint: '+$150 · dignity ↓', effects: { fund: 150, mood: { all: -4 } },
          outcome: 'Four hours of "Jingle Bell Rock" for a room of hygienists. They tip in toothbrushes and cash. Mostly toothbrushes.' },
        { label: "Skip it. It's family time.", hint: 'Burnout ↓', effects: { burnout: -6, chemistry: 2 },
          outcome: 'You spend a week at home. Baba teaches everyone to make perogies. The band plays one quiet carol. Nobody says "brutal".' }
      ] },

    { id: 'holiday_st_paddys', type: 'weird', speaker: 'jaxon', title: "St. Paddy's Pub Crawl", once: false, cooldown: 20,
      gate: g({ era: GLS, weekOfYear: [18, 18] }),
      text: "St. Patrick's Day. Every bar in the province is booking bands and dyeing everything green. Jaxon has already dyed his hair. And his eyebrows. And, somehow, his guitar.",
      choices: [
        { label: 'Play the pub circuit', hint: 'Fans ↑ · burnout ↑', effects: { fans: 15, buzz: 4, burnout: 6 },
          outcome: 'Three pubs, one night, one fiddle player who follows you between them. Marcel learns a jig. It is a threat.' },
        { label: 'Green-beer photo shoot', hint: 'Buzz ↑', effects: { buzz: 6, mood: { jaxon: 4 } },
          outcome: 'The band, in green, in capes, in front of a leprechaun statue. It makes the Star-Pheasant. Page nine, but still.' },
        { label: 'Hide in the garage', hint: 'Burnout ↓', effects: { burnout: -5 },
          outcome: 'You rehearse all night while the city goes green outside. Jaxon keeps the hair. For months.' }
      ] },

    /* ---- v0.6.1 season cards (C7): cabin fever, frosh week, hail (personally), the festival lineups ---- */
    { id: 'scene_cabin_fever', type: 'drama', speaker: 'marcel', title: 'Cabin Fever', once: false, cooldown: 20,
      gate: g({ era: GLS, weekOfYear: [13, 16] }),
      text: 'Minus thirty-six for nine days straight. Marcel has not been outside since New Year\'s. He has started naming the garage mice. Jaxon is talking to the space heater.',
      choices: [
        { label: 'Snow-fort day. Everybody out.', hint: 'Chemistry ↑ · burnout ↓', effects: { chemistry: 4, burnout: -5 },
          outcome: 'A fort with a stage in it. Marcel sings to the neighbourhood from the battlements. Mr. Lindqvist brings hot chocolate. Voluntarily.' },
        { label: 'Rehearse until spring', hint: 'Skill ↑ · burnout ↑', effects: { skill: { all: 1 }, burnout: 6 },
          outcome: 'Eleven-hour sessions. The set is tight. The band is feral. Someone eats a frozen perogy raw.' },
        { label: 'Drive somewhere. Anywhere.', hint: '−$60 · moods ↑', effects: { fund: -60, mood: { all: 5 } },
          outcome: 'Four hours to a hotel waterslide in another town. It is closed for the season. It is still the best day of the winter.' }
      ] },

    { id: 'scene_frosh_week', type: 'scene', speaker: 'jaxon', title: 'Frosh Week', once: false, cooldown: 20,
      gate: g({ era: GL, weekOfYear: [5, 6] }),
      text: 'Frosh week on campus: four thousand first-years, free pizza, and a student union that books bands for the bowl. Jaxon has a stack of flyers and a lanyard he did not pay for.',
      choices: [
        { label: 'Flyer every residence', hint: 'Fans ↑ · burnout ↑', effects: { fans: 15, buzz: 4, burnout: 5 },
          outcome: 'Six residences, twelve floors each, no elevators. Forty kids follow the band online. One asks if Marcel is a professor.' },
        { label: 'Play the pizza line', hint: 'Gamble: new fans or campus security',
          roll: { chance: 0.5, success: { effects: { fans: 20, buzz: 5 }, outcome: 'An acoustic set in the pizza line. Somebody starts a pit. With pizza.' },
            fail: { effects: { mood: { all: -4 } }, outcome: 'Campus security asks for your student IDs. You do not have any. You are escorted, politely, off campus.' } },
          outcome: 'Dana brings the practice amp.' },
        { label: 'Skip it. They are children.', hint: 'Burnout ↓', effects: { burnout: -4, mood: { marcel: 3 } },
          outcome: 'Marcel says the youth are not ready for Lord Abyssus. The youth, largely, agree.' }
      ] },

    { id: 'weird_hail_personal', type: 'weird', speaker: 'dad', title: 'Hail Season', once: false, cooldown: 20,
      gate: g({ era: GLS, weekOfYear: [1, 4] }),
      text: "A hailstorm flattens the garden and dents Dad's new truck (again). Dad looks at the sky, then at your band shirt that says HAIL DAMAGE, then at you. For a long time.",
      choices: [
        { label: "'We had nothing to do with it'", hint: 'Moods ↓', effects: { mood: { all: -3 }, chemistry: 2 },
          outcome: 'Dad says nothing. Dad puts a tarp over the truck and a second tarp over your drum kit. You are not sure what that means.' },
        { label: 'Film the band in the hail', hint: 'Gamble: content or concussion',
          roll: { chance: 0.55, success: { effects: { buzz: 8, fans: 10 }, outcome: 'Hail Damage, playing in actual hail damage. The clip goes around the province. Dad shares it. With a sigh.' },
            fail: { effects: { burnout: 5, fund: -40 }, outcome: 'A hailstone the size of a perogy takes out the ride cymbal. And the phone. Forty bucks.' } },
          outcome: 'Marcel grabs a hockey helmet.' },
        { label: 'Help fix the truck', hint: '−$50 · Dad ↑', effects: { fund: -50, burnout: 3, chemistry: 3 },
          outcome: 'Three weekends of popping out dents with a plunger. Dad teaches you a trick. You teach Dad a blast beat. Even trade.' }
      ] },

    { id: 'fame_festival_lineups', type: 'fame', speaker: 'dj', title: 'The Lineups Are Out', once: false, cooldown: 20,
      gate: g({ era: GLS, weekOfYear: [17, 18] }),
      text: 'Deb reads the summer festival lineups on air, very gently. You are not on any of them. Tundra Wraith are on three. She says your name at the end anyway, "for next year".',
      choices: [
        { label: 'Apply to every open stage', hint: 'Buzz ↑ · burnout ↑', effects: { buzz: 6, burnout: 4 },
          outcome: 'Eleven applications, each with a hand-drawn moose. Two say maybe. Maybe is a lot, in March.' },
        { label: 'Start our own festival', hint: 'Gamble: Garagefest',
          roll: { chance: 0.45, success: { effects: { fans: 20, buzz: 8, fund: -60 }, outcome: 'Garagefest: one stage (the driveway), four bands, a bouncy castle. Sixty people. A legend is born.' },
            fail: { effects: { fund: -120, mood: { all: -3 } }, outcome: 'Garagefest: rained out, then snowed out, then the bouncy castle blew into a canola field.' } },
          outcome: 'Marcel is already designing the wristbands.' },
        { label: 'Train. Next year is ours.', hint: 'Skill ↑', effects: { skill: { all: 1 }, chemistry: 2 },
          outcome: 'You print the lineups and tape them to the garage wall. Every rehearsal, Jaxon throws a dart at them.' }
      ] }
  ];
  // ======================================================================
  // v0.8 "Kit" (KITSIM): shop cards. FORCED ONLY (GG.shop.forcedCard picks them on a Monday; never drawn from the deck
  // above). Same CARD schema; a choice's effects may carry `shop` (applied by GG.shop.afterCard): { move: spaceTier,
  // kit: kitTier, van: vanTier, gear: id, section: 'outro'|'solo', stock: { merchId: boxes }, misprint: 'boxed'|'reprint'|
  // 'wear' }. Money is always the card's own `fund` effect. money_merch_misprint (v0.1) moved here: it now fires after
  // your first shirt order and the boxed batch becomes a collector's item later (GG.shop.weekly).
  // ======================================================================
  var ALL = ['garage', 'local', 'signed', 'world'], LSW = ['local', 'signed', 'world'];
  GG.content.shopCards = [
    { id: 'money_merch_misprint', type: 'money', speaker: 'dana', title: 'HALE DAMAGE', gate: g({ era: ALL }),
      text: "Your first box of band shirts is back from the print shop in Martensville. Every one says 'HALE DAMAGE'. " +
        "The shop says 'that's what you wrote'. Dana has the order form. It's what you wrote.",
      choices: [
        { label: 'Box them up. Someday.', hint: 'Keep the misprints · maybe worth $$$ later', effects: { mood: { dana: 3 }, shop: { misprint: 'boxed' } },
          outcome: "The box goes under the workbench with HALE written on it in Sharpie. Dana says misprints are worth money someday. Nobody believes her." },
        { label: 'Pay for a reprint ($100)', effects: { fund: -100, mood: { marcel: 5 }, shop: { misprint: 'reprint' } },
          outcome: "The reprint says HAIL DAMAGE, correctly, in a font Marcel describes as 'ancient'. It's a free font." },
        { label: 'Wear them to rehearsal', effects: { chemistry: 5, mood: { all: 3 }, shop: { misprint: 'wear' } },
          outcome: 'Hale Damage becomes the band\'s secret name. Kenji is seen in one exactly once. Unconfirmed, but everyone saw it.' }
      ] },

    { id: 'shop_merch_start', type: 'money', speaker: 'marcel', title: 'The Merch Table', gate: g({ era: ['garage', 'local'], minWeek: 4 }),
      text: 'Marcel has designed a shirt: the logo, huge, plus a moose, plus his own face. Dana points out that bands pay for the van with merch. ' +
        'Kenji is already wearing a band shirt. Not yours.',
      choices: [
        { label: 'Order a box of shirts', hint: '−$192 · 24 shirts for the merch table', effects: { fund: -192, shop: { stock: { shirt: 1 } } },
          outcome: "Twenty-four shirts, logo only. Marcel's face is 'saved for the deluxe edition'." },
        { label: 'Stickers first', hint: '−$80 · 200 stickers', effects: { fund: -80, shop: { stock: { sticker: 1 } } },
          outcome: "Two hundred stickers. Jaxon puts one on Baba's car. She leaves it there, which is love." },
        { label: 'Not yet', effects: { mood: { marcel: -4 } },
          outcome: 'Marcel hangs the design on the garage wall anyway. It watches you rehearse.' }
      ] },

    { id: 'shop_pawn_kit', type: 'money', speaker: 'dana', title: 'The Pawn Shop Kit', gate: g({ era: ['garage', 'local'], minWeek: 8, minFund: 700 }),
      text: "Dana texts a photo from the pawn shop on 8th Street: a five-piece kit, shells that almost match, $800. Then: " +
        "'the guy says $650 if we take it today. the milk crate is embarrassing us.'",
      choices: [
        { label: 'Buy it today ($650)', hint: '−$650 · a real kit: better sound', effects: { fund: -650, shop: { kit: 1 } },
          outcome: 'Three trips to carry it home. The first rehearsal sounds like a real band. The milk crate becomes a merch stand.' },
        { label: 'Haggle', hint: 'Gamble: haggle him down',
          roll: { chance: 0.5, stat: 'chemistry', statScale: 0.005,
            success: { effects: { fund: -520, shop: { kit: 1 } }, outcome: 'Dana speaks only in gear specs until he gives in. $520, and he throws in a cowbell. No gong.' },
            fail: { effects: { mood: { dana: -5 } }, outcome: 'He sells it to a youth pastor while you haggle. Dana does not speak to you until Thursday.' } },
          outcome: 'Dana cracks her knuckles.' },
        { label: 'Not yet', effects: { mood: { dana: -4 } }, outcome: 'The milk crate creaks, as if it heard.' }
      ] },

    { id: 'shop_van_deal', type: 'money', speaker: 'baba', title: "Baba's Church Van", gate: g({ era: LSW, minFund: 2600 }),
      text: "Baba's church is selling its 15-passenger van, trailer included. 'One owner,' says Baba. 'God.' $3,000 and the old van for parts. " +
        'Jaxon has already measured the trailer for the drum cases.',
      choices: [
        { label: 'Buy the church van', hint: '−$3,000 · 15-passenger van + trailer', effects: { fund: -3000, shop: { van: 1 } },
          outcome: 'It smells like hymnals and casserole. The trailer squeaks in every key. Kenji adjusts the mirrors and nods.' },
        { label: 'Let Baba haggle', hint: 'Gamble: Baba vs the church',
          roll: { chance: 0.4,
            success: { effects: { fund: -2500, shop: { van: 1 } }, outcome: 'Baba haggles with her own church until the minister gives in to end it. $2,500.' },
            fail: { effects: { mood: { jaxon: -4 } }, outcome: 'Baba decides you insulted the church. Jaxon eats his lunch in the old van for a week.' } },
          outcome: 'Jaxon calls Baba.' },
        { label: 'Keep the old van', effects: { chemistry: 2 },
          outcome: "A curling team buys it. You see it at every bonspiel for a year. The old van feels loved, briefly." }
      ] },

    { id: 'shop_solo', type: 'drama', speaker: 'dana', title: 'Dana Insists', gate: g({ era: LSW }),
      text: 'Dana has written a solo. It is eleven minutes long. She will cut it to one bar if she gets a real solo section, in every song that ' +
        'wants one. She is holding your sticks hostage.',
      choices: [
        { label: 'Fine. A solo section.', hint: 'Solo section unlocked · Dana ↑', effects: { mood: { dana: 8 }, shop: { section: 'solo' } },
          outcome: 'Dana hands back your sticks and plays you the one-bar version. It is still somehow three minutes long.' },
        { label: 'Only with a cape spin', hint: 'Solo unlocked · Dana ↑ · Marcel ↑', effects: { mood: { dana: 5, marcel: 5 }, chemistry: -2, shop: { section: 'solo' } },
          outcome: 'Her solo, his spin, the same eight bars. Nobody can see her fingers behind the cape. Everyone is happy, loudly.' },
        { label: 'No solos in this band', hint: 'Dana ↓↓', effects: { mood: { dana: -10 } },
          outcome: 'Dana returns your sticks. She plays the solo anyway, alone, in the driveway, facing the street.' }
      ] },

    { id: 'shop_space_1', type: 'money', speaker: 'mom', title: 'A Room of Your Own', gate: g({ era: LSW }),
      text: 'Rent-A-Riff has a jam room free: carpet on the walls, a door that locks, $60 a week. Your mom has already measured the garage for ' +
        'the car. Dad is pretending not to listen. Dad is listening.',
      choices: [
        { label: 'Move in ($60/week)', hint: 'Rent $60/wk · rehearsals count more', effects: { mood: { all: 4 }, shop: { move: 1 } },
          outcome: 'One van trip and three couch trips. Mom parks the car in the garage and sits in it for a while.' },
        { label: 'Stay home for now', hint: 'Free · move later from the garage door', effects: { chemistry: 2, mood: { marcel: -3 } },
          outcome: 'The garage it is. Dad brings out a space heater without a word, like a peace treaty.' }
      ] },

    { id: 'shop_space_2', type: 'money', speaker: 'dana', title: 'Prairie Dog Sound', gate: g({ era: ['signed', 'world'] }),
      text: 'Gwen at Prairie Dog Sound has a room: rehearsal space, an isolation booth, a coffee machine that works. $150 a week. ' +
        'Dana has toured the booth twice. Marcel has toured the mirror.',
      choices: [
        { label: 'Move in ($150/week)', hint: 'Rent $150/wk · write + record better', effects: { mood: { all: 4 }, shop: { move: 2 } },
          outcome: "A real studio. Gwen hands out keys and a list of rules. Rule one is 'no capes near the console'." },
        { label: 'Not yet', effects: { mood: { dana: -3 } }, outcome: 'Dana keeps the brochure on the fridge. It is a threat.' }
      ] },

    { id: 'shop_space_3', type: 'money', speaker: 'marcel', title: 'Backstage, Forever', gate: g({ era: ['world'] }),
      text: "The Potash Place offers a permanent room under the arena: a star on the door, showers, the hockey team's laundry next door. " +
        '$300 a week. Marcel has chosen his corner. It has a mirror.',
      choices: [
        { label: 'Move in ($300/week)', hint: 'Rent $300/wk · rest like royalty', effects: { mood: { all: 5 }, shop: { move: 3 } },
          outcome: 'You rehearse where the arena bands rehearse. The Zamboni driver brings coffee. He has requests.' },
        { label: 'Stay where we are', effects: { mood: { marcel: -5 } }, outcome: 'Marcel paints a star on the old door himself. It is crooked. He loves it.' }
      ] }
  ];
})(window.GG);
