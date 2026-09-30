// content/awards.js: v0.5 the Loonie Awards (once a year at C.LOONIES_WEEK; 24_sim_labels.js nominates, UI hosts it).
//   GG.content.awards = {
//     ceremony: { name, venue, host: { name, blurb }, blurb },
//     categories: { <C.LOONIE_CATEGORIES id>: { id, name, short, blurb, reward: { fund, fans, buzz }, genreNames? } }
//       (album: genreNames[genre] is the per-genre display name, e.g. 'Heavy Album of the Year')
//     presenters: [ { name, blurb } ],  banter: [text {category}] (presenter, before the envelope),
//     envelope: [text] (the reveal line), win: [text], lose: [text] (a band line after each envelope),
//     outfits: { <outfitId>: name }   values the outfit cards write to flags.loonieOutfit (the carpet render may read it),
//     outfitCards: [ CARD ]  Marcel's red-carpet outfit (Monday-card schema). Cape-aware: exactly one card's gate passes
//       for each value of flags.cape (velvet | curtain | charred | fireproof | none | unset); gates use band + flags only.
//     speech: CARD (thank your mom / thank the moose / take a shot at the rival),  speechWorstVan: CARD,
//     rivalThanks: { <rivalId>: [text {band} {category}] }   the rival wins and thanks you, personally, from the stage
//     rivalLoses:  { <rivalId>: [text {band} {category}] }   you beat them; they are gracious about it, which is worse
//   }
// Tokens: {band} {category} (the category's display name; the sim/UI replaces it) + the usual fillText tokens.
// v0.9 "Genres" (plan_contract_0.9 §4.1): win / lose are neutral + byBand[bandId].{win, lose}; per band (packs add theirs):
//   speech[bandId] / speechWorstVan[bandId] = CARD (Worst Van is accepted by the band's driver), carpet[bandId] =
//   [{ who, text }] (the red-carpet chat, 59c_ui_awards), outfitCards: every band's (flag-gated, the first whose gate passes),
//   nominees[genre] = [parody band names] (metal = the old fallback list; packs add punk / rock / country),
//   rivalThanks / rivalLoses [rivalId] (packs add their rivals; the sim falls back to neutral {rival} lines).
// Rewards are suggestions the sim may scale. Kenji never speaks. No USA content.
(function (GG) {
  function fx(extra, outfit) { var o = { flags: { loonieOutfit: outfit || 'cape' } }; for (var k in extra) o[k] = extra[k]; return o; }
  function gate(capeValue) {
    var g = { band: ['hail_damage'] };
    if (capeValue) g.flagEquals = { cape: capeValue }; else g.notFlags = ['cape'];
    return g;
  }

  GG.content.awards = {
    ceremony: {
      name: 'The Loonie Awards', venue: 'the Big Tunnel Arena, Moose Jaw',
      host: { name: 'Gordie Pelletier', blurb: 'Host for nineteen straight years. Former weatherman. Wears a tuxedo with a toque and has never explained why.' },
      blurb: 'Canada\'s biggest night in music, broadcast live on the national network between the curling and the late news. The trophy is a loonie the size of a hubcap.'
    },
    categories: {
      breakthrough: { id: 'breakthrough', name: 'Breakthrough Group of the Year', short: 'Breakthrough',
        blurb: 'For the band that went from "who?" to "hey, aren\'t you...?" the fastest.', reward: { fund: 2000, fans: 300, buzz: 12 } },
      album: { id: 'album', name: 'Album of the Year', short: 'Album',
        blurb: 'Judged by a panel of critics, a retired radio host and one very thorough baba.', reward: { fund: 5000, fans: 600, buzz: 14 },
        genreNames: { metal: 'Heavy Album of the Year', punk: 'Punk Album of the Year', rock: 'Rock Album of the Year', country: 'Country Album of the Year' } },
      single: { id: 'single', name: 'Single of the Year', short: 'Single',
        blurb: 'The song you heard in the grocery store, at the rink and in your sleep.', reward: { fund: 3000, fans: 400, buzz: 12 } },
      live: { id: 'live', name: 'Best Live Act', short: 'Live',
        blurb: 'Voted by the sound techs of the nation, who are still partially deaf from the nominees.', reward: { fund: 2500, fans: 350, buzz: 10 } },
      fan_choice: { id: 'fan_choice', name: 'Fan Choice Award', short: 'Fan Choice',
        blurb: 'Voted online by the fans, and by one grandmother in Yorkton who voted eleven thousand times.', reward: { fund: 1000, fans: 500, buzz: 12 } },
      worst_van: { id: 'worst_van', name: 'Worst Van', short: 'Worst Van',
        blurb: 'For the tour vehicle that did the most with the least. Judged by three mechanics from Moose Jaw, live, in the parking lot.', reward: { fund: 150, fans: 60, buzz: 8 } }
    },
    presenters: [
      { name: 'Brenda Kowalyk', blurb: 'Olympic curler (retired). Sequinned sweater. Reads every name like she is calling a sweep.' },
      { name: 'Deb Wiebe', blurb: 'Host of Midnight Mayhem on CRUD 90.5 campus radio. Says "brutal" like a bedtime story. Plays every demo she gets.' },
      { name: 'Mayor Ron Dueck of Flin Flon', blurb: 'Reads the cue cards upside down and commits to it.' },
      { name: 'Last year\'s Worst Van winners', blurb: 'Arrived by tow truck. Still holding the trophy. Refuse to give it back.' },
      { name: 'Wally Szymanski', blurb: 'Hockey commentator. Wears a suit reupholstered from a chesterfield. Shouts every nominee.' }
    ],
    banter: [
      'The nominees for {category} are all very loud. I\'ve been asked to read them quickly, before the hearing aids come back on.',
      'Before I open this: the parking lot is full of vans, and one of them is on fire. Probably fine! {category}!',
      'I was told there\'d be a teleprompter. There is. It\'s facing the audience. Hi, everybody. {category}.',
      'In curling we say "hurry hard". In music, I\'m told, you say "turn it up". Same energy. {category}.',
      'My grandson says these bands are "fire". I\'ve asked the fire marshal to stand by. {category}!',
      'Please hold your applause until all the nominees are read. You won\'t. Nobody ever does. {category}.'
    ],
    envelope: [
      'And the Loonie goes to...',
      'The envelope, please. Thank you. It\'s glued. Hang on. HANG ON. And the Loonie goes to...',
      'I\'m told there was a recount. In Yorkton. And the Loonie goes to...',
      'Drumroll, please. Not you, you\'re a nominee. And the Loonie goes to...'
    ],
    win: [
      '{front} is already on stage. Nobody saw anybody move.',
      '{soloist} hugs the trophy like a vintage amp. {filler} calls home from the stage.',
      '{deadpan} stands, buttons a jacket and nods once. The arena goes quiet out of respect.',
      'Your mom stands on her chair. An usher asks her to sit. She does not sit.'
    ],
    lose: [
      '{front} applauds the winners with the whole body, which is a lot of applause.',
      '{filler} texts home: "we lost". Home: "you are winners to me. also you forgot your lunch".',
      '{soloist} whispers that the winners\' guitarist uses a cheap tuner. It does not help. It helps a little.',
      '{deadpan}\'s expression does not change. Somehow you feel better.'
    ],
    // v0.9: the red-carpet chat per band (was 59c's FB.carpet); speakers may be role aliases. Packs add their bands.
    //   Role aliases, so whoever is in the band that year walks the carpet (@namer = Marcel, @filler = Jaxon while they're in it).
    carpet: {
      hail_damage: [{ who: 'reporter', text: 'Who are you wearing tonight?' }, { who: '@namer', text: 'The cape. The cape is wearing me.' },
        { who: 'reporter', text: 'Any predictions?' }, { who: '@filler', text: 'My baba predicts we lose to the corpse-paint guys. She is usually right.' }]
    },
    // v0.9: parody co-nominees per genre (metal = the pre-v0.9 list; packs add punk, rock and country)
    nominees: {
      metal: ['The Hoarfrosts', 'Combine Harvester of Sorrow', 'Slough Monster', 'The Bunnock Kings', 'Stubble Burners',
        'Rural Municipality 344', 'The Gopher Derby', 'Winnipeg Mosquito Choir', 'The Chinook Arches']
    },
    byBand: {
      hail_damage: {
        win: [
          'Marcel is already on stage. Nobody saw him move.',
          'Dana hugs the trophy like it is a vintage amp. Jaxon calls his baba from the stage.',
          'Kenji stands, buttons his jacket and nods once. The arena goes quiet out of respect.'
        ],
        lose: [
          'Marcel applauds with his whole cape, which is a lot of applause.',
          'Jaxon texts his baba: "we lost". Baba: "you are winners to me. also you forgot your lunch".',
          'Dana whispers that the winners\' guitarist uses a cheap tuner. It does not help. It helps a little.',
          'Kenji\'s expression does not change. Somehow you feel better.'
        ]
      }
    },
    outfits: { cape: 'His cape, whatever state it is in', tux: 'A black suit or a rented tux', robe: 'A wizard robe from 2009',
      fur: "His mother's fur coat", antlers: 'Foam moose antlers' },

    outfitCards: [
      { id: 'loonie_outfit_velvet', type: 'fame', speaker: 'marcel', title: 'The Carpet: Velvet', once: false, cooldown: 20, gate: gate('velvet'),
        text: "Marcel has had the Nocturne dry-cleaned for the Loonies. The cleaner asked if it was 'for a wizard'. He said yes. " +
          'Now he wants a four-metre train and battery candles. The red carpet is three metres wide.',
        choices: [
          { label: 'The Nocturne, as intended', effects: fx({ buzz: 8, mood: { marcel: 8 } }),
            outcome: "Forty photographers shout 'LORD ABYSSUS!' at once. He sweeps past them like an expensive thundercloud. Dana is in every photo, holding the hem." },
          { label: 'Train and candles. Go big.', hint: 'Gamble: fashion, or fire',
            outcome: 'Jaxon carries the train. Baba sewed on the candle clips.',
            roll: { chance: 0.5, stat: 'buzz', statScale: 0.005,
              success: { effects: fx({ buzz: 14, fans: 150 }), outcome: "Best Dressed, says a fashion website nobody has heard of. The candles spell ABYSSUS. Mostly." },
              fail: { effects: fx({ buzz: 5, fund: -300, mood: { marcel: -6 } }), outcome: 'A candle meets the step-and-repeat. The Loonies logo now has a scorch mark shaped like Manitoba. $300.' } } },
          { label: 'A rented tux, just this once', effects: fx({ fans: 100, mood: { marcel: -8 } }, 'tux'),
            outcome: "He looks like an insurance salesman at a gala, which he is. A Monolith man says 'love that'. Marcel stares through him all night." }
        ] },
      { id: 'loonie_outfit_curtain', type: 'fame', speaker: 'mom', title: 'The Carpet: Curtains', once: false, cooldown: 20, gate: gate('curtain'),
        text: 'The curtain cape is going to the Loonies. It still jingles. Mom has made a matching dress from the other curtain and wants ' +
          "to walk the carpet 'as a set'. Dad has made a tie out of the valance.",
        choices: [
          { label: 'The whole family walks it', effects: fx({ fans: 120, buzz: 8, chemistry: 4 }),
            outcome: "Photographers love it. 'Who designed the look?' Mom: 'The catalogue, 1994.' A fashion blog calls it prairie-gothic heritage drape." },
          { label: 'Just Marcel. Sorry, Mom.', effects: fx({ buzz: 6, mood: { marcel: 6 }, chat: { who: 'mom', text: "Enjoy the carpet, sweetheart. I'll watch from here in my curtain." } }),
            outcome: 'Marcel jingles down the carpet alone. He looks magnificent. He looks, specifically, like a living room window.' },
          { label: 'Leave the jingly cape home', effects: fx({ fans: 60, mood: { marcel: -8 } }, 'tux'),
            outcome: 'Marcel goes in a black suit. He keeps reaching for a cape that is not there, like a phantom limb with hooks.' }
        ] },
      { id: 'loonie_outfit_charred', type: 'fame', speaker: 'marcel', title: 'The Carpet: Charred', once: false, cooldown: 20, gate: gate('charred'),
        text: 'Marcel\'s cape survived the fire the way a hockey jersey survives a bonfire. He says the scorch marks are "the look now". ' +
          'He has also bought a smoke machine the size of a lunch box that clips onto his belt.',
        choices: [
          { label: 'Charred and proud', effects: fx({ buzz: 10, mood: { marcel: 6 } }),
            outcome: "'Is that distressed?' asks a stylist. 'It is traumatized,' says Marcel. She writes it down. It is a trend by Tuesday." },
          { label: 'Belt smoke machine, go', hint: 'Gamble: the photo of the night, or the alarm',
            outcome: 'He flicks the switch at the top of the carpet.',
            roll: { chance: 0.5, stat: 'buzz', statScale: 0.005,
              success: { effects: fx({ buzz: 14, fans: 120 }), outcome: 'He walks out of a cloud like a cursed wedding. The photographers scream. It is the photo of the night.' },
              fail: { effects: fx({ buzz: 4, burnout: 6 }), outcome: 'The fire alarm. The whole arena stands in the parking lot for forty minutes. Tundra Wraith hand out granola bars.' } } },
          { label: 'Buy a new cape today', effects: fx({ fund: -400, buzz: 6, mood: { marcel: 8 } }),
            outcome: "A costume shop in Moose Jaw has one left: 'Sorcerer, Adult, Large'. Marcel hems it in the van with a stapler. $400." }
        ] },
      { id: 'loonie_outfit_fireproof', type: 'fame', speaker: 'baba', title: 'The Carpet: Fireproof', once: false, cooldown: 20, gate: gate('fireproof'),
        text: 'Marcel wears the fireproof cape now: a welding blanket with a collar Baba sewed on. He wants to walk the carpet "with one ' +
          'tasteful flame". The arena fire marshal has already heard about him.',
        choices: [
          { label: 'No flame. Welder chic.', effects: fx({ buzz: 8, fans: 100 }),
            outcome: 'A welder in the bleachers salutes him. Marcel salutes back. It is the most sincere moment of the night.' },
          { label: 'One tasteful flame', hint: 'Gamble: icon, or extinguisher',
            outcome: 'Jaxon lights it with a barbecue lighter.',
            roll: { chance: 0.45, stat: 'buzz', statScale: 0.005,
              success: { effects: fx({ buzz: 15, fans: 150 }), outcome: 'The flame is small, the cape does its job and the fire marshal applauds despite himself. Photo of the year.' },
              fail: { effects: fx({ buzz: 6, fund: -250 }), outcome: 'The fire marshal was waiting. Marcel walks the carpet between two volunteers with extinguishers. Still a good photo. $250 fine.' } } },
          { label: 'Baba adds sequins', effects: fx({ buzz: 6, chemistry: 4, mood: { marcel: 6 } }),
            outcome: "Baba sews eight hundred sequins onto a welding blanket in two nights. 'Now it is for a wedding.' Marcel glitters like a disco inferno." }
        ] },
      { id: 'loonie_outfit_nocape', type: 'fame', speaker: 'jaxon', title: 'The Carpet: No Cape', once: false, cooldown: 20, gate: gate('none'),
        text: 'No cape. Not since the funeral. Marcel stands at the mirror in a black suit, holding an empty hanger, saying nothing. ' +
          "He hasn't said 'Lord Abyssus' in weeks. Jaxon asks, quietly, if you should do something.",
        choices: [
          { label: 'Buy him a cape. Today.', effects: { fund: -350, buzz: 8, mood: { marcel: 12 }, flags: { loonieOutfit: 'cape', cape: 'velvet' } },
            outcome: 'A fabric store in Moose Jaw, forty minutes before the carpet. Crushed velvet, a stapler, Baba on speakerphone. He is reborn. $350.' },
          { label: "The black suit. It's elegant.", effects: fx({ fans: 100, mood: { marcel: -5 } }, 'tux'),
            outcome: 'He looks like the saddest pallbearer in Saskatchewan. The cameras love it. A magazine calls it "grief couture".' },
          { label: 'Moose antlers. Commit.', effects: fx({ buzz: 10, mood: { marcel: 6 } }, 'antlers'),
            outcome: "Marcel wears a headpiece of foam antlers. A reporter asks what it means. 'It means everything.' Nobody asks a follow-up." }
        ] },
      { id: 'loonie_outfit_first', type: 'fame', speaker: 'marcel', title: 'The Carpet: Three Outfits', once: false, cooldown: 20, gate: gate(null),
        text: 'Marcel has three outfits laid out on his bed: a black suit, a wizard robe from Halloween 2009, and his mother\'s fur coat. ' +
          'He cannot choose. He has been lying beside them since six a.m.',
        choices: [
          { label: 'The wizard robe', effects: fx({ buzz: 8, mood: { marcel: 8 } }, 'robe'),
            outcome: 'It has a moon on it. It is slightly too short. On the carpet he whispers "Lord Abyssus" to every camera. Three of them whisper back.' },
          { label: "Mom's fur coat", hint: 'Gamble: icon, or Mom finds out',
            outcome: 'He zips it into a garment bag and does not tell her.',
            roll: { chance: 0.5,
              success: { effects: fx({ buzz: 12, fans: 120 }, 'fur'), outcome: 'He looks like a count in a Russian novel. Best Dressed. Mom sees it on TV and says she always knew that coat was special.' },
              fail: { effects: fx({ buzz: 4, mood: { marcel: -6 }, chat: { who: 'mom', text: 'Marcel. Is that my coat. On national television.' } }, 'fur'),
                outcome: 'Mom is watching. Mom texts the band chat mid-broadcast. Marcel reads it on the carpet and visibly shrinks.' } } },
          { label: 'The black suit', effects: fx({ fans: 80, chemistry: 3 }, 'tux'),
            outcome: 'Classic. Sharp. Kenji straightens his collar without a word. Marcel nearly cries. It is the nicest thing Kenji has ever done.' }
        ] }
    ],

    // v0.9: speech / speechWorstVan are keyed by band ({ <bandId>: CARD }); packs add theirs.
    speech: { hail_damage: { id: 'loonie_speech', type: 'fame', speaker: 'marcel', title: 'The Speech', once: false, cooldown: 20, gate: { band: ['hail_damage'] },
      text: 'They said your name. The band is on stage holding a loonie the size of a hubcap. Marcel, for once in his life, hands you ' +
        'the microphone. Kenji takes two steps back. You have thirty seconds before the music plays you off.',
      choices: [
        { label: 'Thank your mom', effects: { fans: 120, chemistry: 6, mood: { all: 6 }, chat: { who: 'mom', text: 'I was the one crying in row M. The man beside me cried too.' } },
          outcome: "You thank your mom for the garage, the loan and the pizza pops. The camera finds her in row M, holding a sign: 'THAT'S MY DRUMMER'." },
        { label: 'Thank the moose', effects: { buzz: 14, fans: 80, flags: { mooseMuse: true } },
          outcome: "'And most of all... the moose.' Silence. Then someone yells 'THE MOOSE!' and the arena chants it. Marcel weeps. He knows which moose." },
        { label: 'Take a shot at Tundra Wraith', hint: 'Gamble: roast, or roasted',
          outcome: 'You lean into the mic and find their table.',
          roll: { chance: 0.55, stat: 'buzz', statScale: 0.005,
            success: { effects: { buzz: 16, fans: 200, flags: { wraithFeud: true } },
              outcome: "'Tundra Wraith, buddy: thanks for the fruit basket. The pears were soft.' The room explodes. Tundra Wraith laugh hardest of all. Terrifying." },
            fail: { effects: { buzz: -6, mood: { all: -4 }, flags: { wraithFeud: true } },
              outcome: 'It lands wrong. Tundra Wraith stand and applaud you, sincerely. Now you are the villain. A fruit basket is waiting at the hotel.' } } }
      ] } },

    speechWorstVan: { hail_damage: { id: 'loonie_speech_van', type: 'fame', speaker: 'kenji', title: 'Worst Van', once: false, cooldown: 20, gate: { band: ['hail_damage'] },
      text: 'You won Worst Van. The Moose Hearse is parked outside, leaking something green onto the red carpet. Someone has to go up. ' +
        'Kenji, who has driven every kilometre, stands. Everyone looks at him. He puts on his sunglasses.',
      choices: [
        { label: 'Let Kenji accept it', effects: { buzz: 10, chemistry: 6, mood: { kenji: 10 } },
          outcome: 'Kenji walks up, lifts the trophy over his head for eleven seconds of total silence, and walks off. The longest standing ovation of the night.' },
        { label: 'Thank the Moose Hearse', effects: { buzz: 8, fans: 60, mood: { all: 4 } },
          outcome: "You thank the van by name. A mechanic in the crowd yells 'THE TRANSMISSION, THOUGH'. A man from Moose Jaw offers $400 for it. It's family." },
        { label: "Blame Dad's truck", effects: { fans: 120, mood: { jaxon: 5 } },
          outcome: 'Dad, watching at home, stands up and argues with the TV. Mom films it. The clip gets more views than the whole broadcast.' }
      ] } },

    rivalThanks: {
      tundra_wraith: [
        "Wow. Okay. First we have to thank {band}. Without you pushing us, we'd still be doing people's taxes. We still do people's taxes. But less!",
        'We want to thank our families, our accountant (it\'s us), and most of all {band}, who are right there. Stand up, buddy! No? Okay!',
        'This {category} is really yours, {band}. Not legally. Legally it\'s ours. But spiritually! Fruit basket\'s in the mail.',
        'Special shout-out to {band}. You inspire us every day. We have a photo of your drummer on our fridge. It\'s a nice photo. Don\'t worry about it.',
        "Before the corpse paint runs: {band}, buddy, you were robbed. We voted for you. We checked the bylaws. We're allowed.",
        "{band}, we're taking you out for perogies after. Our treat. We've already expensed it. It's a legitimate business meeting, buddy."
      ]
    },
    rivalLoses: {
      tundra_wraith: [
        'Tundra Wraith give you a standing ovation in full corpse paint. Their frontman mouths "so proud of you, buddy". He means it. That is the worst part.',
        'A fruit basket is waiting on your seat when you come back from the stage. The card says: "Knew it! Your pals, TW." They had it made in advance.',
        "Tundra Wraith's frontman shakes your hand for a very long time. 'Well earned, buddy. Well earned.' His hand is cold. His eyes are warm. It's confusing."
      ]
    }
  };
})(window.GG);
