// content/cards.js: Monday event cards for Hail Damage's garage era (v0.1).
// Shape: GG.content.cards = [ CARD ] (CONTENT SCHEMAS in 02_contracts.js). Gate keys = GG.contracts.GATE_KEYS,
// effect keys = GG.contracts.EFFECT_KEYS; tests/content.test.js validates every card against both.
//
// Conventions
//   - Every card is gated to { era:['garage'], genre:['metal'], band:['hail_damage'] } via g(); extra conditions merge in.
//   - Defaults (sim-applied): weight 1, once true, cooldown 0. Only non-defaults are written out.
//   - A choice with a `roll` always has a `hint` starting "Gamble:". Its own `outcome` is the set-up line; the
//     branch outcome (success/fail) says what happened. Show them together: choice.outcome + ' ' + branch.outcome.
//   - Magnitudes (garage era): fund −250…+200, fans 0…+30, buzz ±2…12, chemistry ±2…8, mood ±3…15,
//     skill/drumSkill +1…3, burnout ±3…15.
//   - Seasons via weekOfYear (assumption: week 1 = early July, one game week ≈ two calendar weeks):
//     summer 1–4 and 23–24, fall 5–10, winter 11–18 (Ukrainian Christmas ≈ 13), spring 19–22.
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
      weight: 3, gate: g({ minWeek: 3 }),
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
      gate: g({ flagEquals: { capePlan: 'velvet' } }),
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
      gate: g({ flagEquals: { capePlan: 'curtain' } }),
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
      gate: g({ flags: ['cape'] }),
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
      gate: g({ flagEquals: { capeSpin: 'legend' } }),
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
      gate: g({ flagEquals: { capeSpin: 'burnt' } }),
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

    { id: 'jaxon_grounded', type: 'drama', speaker: 'baba', title: 'Grounded', weight: 2, gate: g({ flags: ['babaMad'] }),
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

    { id: 'marcel_lawn_lyrics', type: 'drama', speaker: 'gord', title: 'Lost in Translation', gate: g({ minFans: 40 }),
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

    { id: 'dana_endless_solo', type: 'drama', speaker: 'dana', title: 'The Eleven-Minute Solo', gate: g({ minFans: 40 }),
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

    { id: 'kenji_vanishes', type: 'drama', speaker: 'kenji', title: 'The Empty Corner', gate: g({ minWeek: 14 }),
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
      gate: g({ minWeek: 8 }),
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
      gate: g({ moodBelow: { dana: 35 } }),
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
      gate: g({ moodBelow: { marcel: 35 } }),
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
      gate: g({ weekOfYear: [20, 23] }),
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
      gate: g({ minWeek: 6 }),
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
      gate: g({ minWeek: 5 }),
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
      gate: g({ minWeek: 3 }),
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

    { id: 'money_bingo_palace', type: 'money', speaker: 'lorraine', title: 'Bingo Palace', gate: g({ minWeek: 4 }),
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
      gate: g({ minWeek: 4 }),
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

    { id: 'money_merch_misprint', type: 'money', speaker: 'dana', title: 'HALE DAMAGE', gate: g({ minFans: 60 }),
      text: "Your first box of band shirts is back from the print shop in Martensville. All fifty say 'HALE DAMAGE'. " +
        "The shop says 'that's what you wrote'. Dana has the order form. It's what you wrote.",
      choices: [
        { label: 'Sell them as collectibles', effects: { fund: 120, buzz: 4 },
          outcome: "They sell out in two shows. A collector from Moose Jaw buys six. 'Hale Damage' now has its own fan page." },
        { label: 'Pay for a reprint ($100)', effects: { fund: -100, mood: { marcel: 5 } },
          outcome: "The reprint says HAIL DAMAGE, correctly, in a font Marcel describes as 'ancient'. It's a free font." },
        { label: 'Wear them to rehearsal', effects: { chemistry: 5, mood: { all: 3 } },
          outcome: 'Hale Damage becomes the band\'s secret name. Kenji is seen in one exactly once. Unconfirmed, but everyone saw it.' }
      ] },

    { id: 'money_garage_sale', type: 'money', speaker: 'mom', title: 'Garage Sale Saturday', once: false, cooldown: 12,
      gate: g({ minWeek: 2, weekOfYear: [2, 8] }),
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
      gate: g({ minWeek: 5 }),
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
      gate: g({ flags: ['parentsLoan'] }),
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

    { id: 'money_dad_spreadsheet', type: 'money', speaker: 'dad', title: 'Where Did It Go', gate: g({ flags: ['parentsLoan'] }),
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
      gate: g({ weekOfYear: [11, 16] }),
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

    { id: 'road_farm_auction', type: 'road', speaker: 'marcel', title: 'Farm Auction', gate: g({ weekOfYear: [5, 9] }),
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
      gate: g({ minFans: 40 }),
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
      gate: g({ minWeek: 4, minFans: 25 }),
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

    { id: 'scene_st_vlads', type: 'scene', speaker: 'baba', title: 'The Fall Supper', gate: g({ minWeek: 4, weekOfYear: [5, 10] }),
      text: "Baba says St. Vlad's needs music for the fall supper. 'Nothing Satanic. The French one may sing, but only about " +
        "gardening.' Marcel realizes, quietly, that all of his songs already qualify.",
      choices: [
        { label: 'Play the fall supper', effects: { book: 'st_vlads_hall', mood: { jaxon: 8 } },
          outcome: "Baba tells the whole parish her grandson is in a 'Christian lawn band'. Nobody corrects her. Nobody would dare." },
        { label: 'Politely decline', effects: { mood: { jaxon: -6 } },
          outcome: "Baba says 'okay' in a way that means the opposite. Jaxon's lunch the next day is a single dry cracker." }
      ] },

    { id: 'scene_bonspiel', type: 'scene', speaker: 'barb', title: 'Bonspiel Social', gate: g({ minFans: 60, weekOfYear: [12, 18] }),
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
      gate: g({ weekOfYear: [12, 14] }),
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
      gate: g({ minWeek: 6, minFans: 20 }),
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
      gate: g({ minWeek: 12, minFans: 120 }),
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
    { id: 'fame_campus_radio', type: 'fame', speaker: 'dj', title: 'Midnight Mayhem', gate: g({ minFans: 40 }),
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

    { id: 'fame_fan_mail', type: 'fame', speaker: 'jaxon', title: 'Our First Fan Letter', gate: g({ minFans: 40 }),
      text: "Your first fan letter, from a kid in Kindersley! It's a drawing: Marcel as a dragon, Dana with eight arms, Jaxon " +
        "riding a lunch box, Kenji as a shadow, and you, a small circle labelled 'DRUMS'.",
      choices: [
        { label: 'Put it on the trophy shelf', effects: { mood: { all: 5 }, chemistry: 3 },
          outcome: "It's the first thing on the trophy shelf. Dana insists on a photo next to it. You add 'small circle' to your bio." },
        { label: 'Mail back signed merch', effects: { fund: -25, fans: 8, buzz: 3 },
          outcome: "A signed sticker and a set list. The kid's mom posts it online. Kindersley is now Hail Damage country." }
      ] },

    { id: 'fame_star_pheasant', type: 'fame', speaker: 'reporter', title: 'The Star-Pheasant', gate: g({ minFans: 100 }),
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

    { id: 'fame_deci_hell', type: 'fame', speaker: 'zine', title: 'Four Skulls', gate: g({ minFans: 100, minWeek: 10 }),
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
    { id: 'weird_moose', type: 'weird', speaker: 'marcel', title: 'The Moose', gate: g({ minWeek: 6 }),
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
      gate: g({ minWeek: 3, weekOfYear: [2, 5] }),
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
      gate: g({ minWeek: 2 }),
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

    { id: 'weird_northern_lights', type: 'weird', speaker: 'kenji', title: 'Northern Lights', gate: g({ weekOfYear: [9, 18] }),
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
      gate: g({ weekOfYear: [19, 22] }),
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
      ] }
  ];
})(window.GG);
