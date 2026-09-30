// content/lines.js: flavour text pools the sim picks from with the career RNG.
// Shape (CONTENT SCHEMAS in 02_contracts.js):
//   activity:     { <activityId>: [text] }                    one line per block, first-person plural
//   chat:         { <memberId>: { happy, ok, grumpy, sulking } } group-chat posts by mood bucket (moodLabel)
//   gigReactions: { <memberId>: { great, ok, bad } }          one per member after a gig
//   tap:          { <memberId>: [text] }                       tapping a bandmate in the garage
//   guilt: [text] (parents' loan)   yearEnd: [text]   quietWeek: [text] (Mondays without a card)
//   songReactions: { marcel: { name, nameFr }, dana: { noSolo, frSigh }, jaxon: { fills, frSigh }, kenji: { great, frSigh } }
//                  after a Write block (marcel.name / nameFr lines end with a colon or "is called": the sim appends the
//                  song's title). v0.7.2: titles are English; nameFr = Marcel snuck in a French one and insists; frSigh =
//                  the bandmate who sighs about it right after (Kenji's are stage directions).
//                  v0.9: keyed by member id, role keys: name / nameFr (namer), solo / noSolo (soloist), fills (filler),
//                  great (the deadpan nod), frSigh, custom: [{ when: 'difficultyHigh'|'similarityHigh'|'any', text }].
//   writeTips:     { <memberId>: [text] }   one in-character hint when the sequencer opens for the first-ever Write
// v0.5 (Signed): eraLocal [text] · eraSigned { <labelId>: [text] } · labelOffer { gopherwood|monolith: [text] } ·
//   offerExpired · labelDropped · studioWeek { <memberId>: [chat] } · releaseDay · chartDebut · chartClimb · chartDrop ·
//   recouped · cert { gold, platinum } · loonies { nominated, snubbed }   (the sim/UI pick one; all are plain text)
// v0.9 "Genres" (plan_contract_0.9 §4.1): the FLAT pools are neutral and tokenised; a band's own lines sit in
//   lines.byBand[bandId] under the same keys and are ADDED on top (career.pool / linePool: flat + byGenre + byBand).
//   Hail Damage's voice lives in lines.byBand.hail_damage (it keeps every line it ever had).
//   lines.byGenre[genre] = { genreClash } (the reverse jokes: country in a metal bar, ...).
//   lines.byBand[bandId] also holds the UI's per-band bits: countIn (text|[text]), empty { chat, catalog },
//   noSolo (the sequencer gag), exposure { pitch, toast }, recruitAd (the Kijiji ad's perks line), banter ([text], extra 'any').
//   Member-keyed pools (ids are unique across bands, packs Object.assign into them): chat, gigReactions, tap, writeTips,
//   vanBanter, songReactions, studioWeek, banter { <memberId>|any: [text] } (between songs, 55_ui_gig),
//   live { <memberId>: { solo, fill, signature, flub } } (22_sim_gig), labelReact { any|<memberId>: { monolith,
//   gopherwood, diy, signed } } (59_ui_label), reviewReact { any|<memberId>: { great, meh, awful } } (59c_ui_awards).
//   moments { <C.MOMENTS kind>: [text] } the post-gig line when that crowd moment happened (+ byBand);
//   momentLabels { <kind>: text } the banner shown the moment it happens (UI).
//   milestones { <key>: text } (20_sim_career MILESTONES keys; + byBand overrides a key).
// Tokens: {player} {band} {city} {rival} {nick:<memberId>} {name:<memberId>} + v0.9 C.TOKENS ({front} {soloist} {filler}
//   {bassist} {namer} {grumbler} {deadpan} {driver} {van} {space} {spaceName} {door} {province} {homeVenue} {superfan}
//   {rivalFront}), replaced by GG.career.fillText().
// Kenji does not speak. His lines are stage directions or punctuation. This is load-bearing.
(function (GG) {
  GG.content.lines = {
    activity: {
      rehearse: [
        'We ran the set top to bottom four times. On the fifth, it finally sounded like one band.',
        '{front} made us run the chorus until {door} rattled in time.',
        'Door open, full volume. Three kids on bikes stopped to listen, then rode off to be normal again.',
        "We tightened the ending. It had four endings. Now it has two, which {grumbler} calls 'a compromise'.",
        '{soloist} counted in way too fast. We played it that fast anyway. It might be the new tempo.',
        'Two hours on one bridge. {deadpan} never said a word. The bridge is fixed.'
      ],
      write: [
        'We built a song around your drum groove. {deadpan} nodded once. The song is finished.',
        '{namer} wrote the lyrics on the back of a receipt. The receipt was for guitar strings.',
        '{soloist} brought in a riff with nineteen parts. We kept four.',
        'We wrote a ballad. It lasted ninety seconds before somebody sped it up.',
        'We argued about the chorus for an hour, then wrote a better one in five minutes.',
        'A riff showed up in the parking lot after rehearsal. We ran back inside before it left.'
      ],
      promote: [
        'We stapled flyers to every pole in {city}. Two went over our own old flyers.',
        "{front} did a 'mysterious' photoshoot by the river. A jogger asked if everyone was okay.",
        'We mailed the demo to three campus radio stations and one guy who says he knows a guy.',
        'We chalked the band name on the sidewalk downtown. It rained. Now it is mostly vowels.',
        "We posted a rehearsal clip. Somebody's aunt commented 'very loud, very good, eat something'.",
        '{soloist} wrote a press release. It is mostly gear specs.'
      ],
      book: [
        "We called every hall in {city} from the kitchen phone. Mom took messages. She underlined 'NO' twice.",
        'We pinned our number to the corkboard at the music store, just under a lost cat.',
        "We emailed every bar in {city} with 'Hole' or 'Tavern' in the name. One replied 'who is this'.",
        '{front} talked to a Legion manager for an hour. We got a Tuesday.',
        'We asked everybody we know to ask everybody they know. Somebody knows a curling rink.'
      ],
      hustle: [
        'We played a wedding social. The Chicken Dance, four times. Cash and a pan of lasagna.',
        'We shovelled driveways on the street. {grumbler} refused, then critiqued our technique from the step.',
        "We busked outside the farmers' market and made gas money plus a jar of Saskatoon berry jam.",
        'We helped a cousin move. There was a piano. There is always a piano.',
        'We returned bottles, pop cans and one cracked cymbal. The cymbal was worth more.',
        "{grumbler} took an extra shift at the day job and called it 'selling out to the Man' all week."
      ],
      rest: [
        "We watched curling on somebody's TV. {deadpan} knew every rule. How.",
        'Nobody touched an instrument all night. {soloist} touched one only nine times.',
        'We played crokinole until midnight. Somebody flicked a disc into the kick drum.',
        'We drove out to see the grain elevators at sunset and said nothing for an hour.',
        'A lazy evening. Pizza, a movie nobody picked and a nap on the gear cases.',
        'We slept on the couch in shifts. {space} smelled of popcorn.'
      ]
    },

    chat: {
      marcel: {
        happy: [
          'LORD ABYSSUS IS PLEASED. The lawn is also pleased.',
          'Ce soir, nous sommes des DIEUX. Also I need a ride Thursday.',
          'New lyrics. Nine verses. Verse six is about aeration. Do not ask.',
          'I have rented a fog machine for our next show. Do not tell your father.'
        ],
        ok: [
          'Rehearsal at 7. I will arrive at 7:15, for drama.',
          'Reminder: in the garage I am Lord Abyssus. At work I am Marcel. Respect both.',
          'Who moved my mirror.',
          'Fertilizing tonight. Will be late. Will smell of nitrogen.'
        ],
        grumpy: [
          'Lord Abyssus is not "fine". Lord Abyssus is fine.',
          'Some of us are artists. Some of us rush the chorus. I name no drummers.',
          'The void does not care about your "set length", Dana.',
          'Je suis déçu. It means I am disappointed. In all of you.'
        ],
        sulking: [
          "(Marcel has renamed the group 'LORD ABYSSUS AND SOME PEOPLE')",
          'I will be watering my lawn. Do not call.',
          'I am drafting my solo career. It is in French. It is about you.',
          'Lord Abyssus has left the building. The building is my car. I am in my car.'
        ]
      },
      dana: {
        happy: [
          'New strings. 10 to 52, nickel wound. I can hear colours.',
          'Practised 11 hours today. Tomorrow: 12.',
          'Solo is up to nine minutes. It is ready.',
          'Found a used overdrive. Dual clipping, mids for days. Love you all.'
        ],
        ok: [
          "Rehearsal ok. Low end was muddy. Kenji isn't muddy. It's the room.",
          'Can we tune to drop B? Asking for a riff.',
          'Reminder: nobody touches my amp settings. Nobody.',
          'Restringing. Back in 40.'
        ],
        grumpy: [
          'My solo got cut to 90 seconds. 90. Seconds.',
          'Someone put a juice box on my amp. I have photos.',
          "If the band isn't buying the pedal, I'm buying the pedal.",
          "Can't make Thursday. Practising. Alone. Properly."
        ],
        sulking: [
          'A prog band from Calgary messaged me. Just saying.',
          'Playing scales until I feel something.',
          "Don't need a band to sweep-pick.",
          'Muting this chat. Unmuting. Muting.'
        ]
      },
      jaxon: {
        happy: [
          'guys guys GUYS we sounded SO good tonight',
          'baba made 60 perogies for saturday!! 20 are for kenji apparently',
          'learned a new sweep lick dont tell dana',
          'best band in saskatoon. maybe canada. definitely sutherland'
        ],
        ok: [
          'can someone drive me thursday baba has bingo',
          'home by 10 or baba calls the mounties lol (she will)',
          'anyone want cabbage rolls theyre in my backpack',
          'is the fill in bar 12 ok or should i add more notes (more notes)'
        ],
        grumpy: [
          "baba says the band is a 'phase'",
          'why does nobody let me solo',
          'grounded till tuesday. baba found the eyeliner',
          'ok but i was on time and nobody else was'
        ],
        sulking: [
          'baba says i should apply at the co-op',
          'not coming tonight. dont ask. baba.',
          'maybe i should just do school like baba says',
          'is it still a band if nobody listens to the rhythm guitarist'
        ]
      },
      kenji: {
        happy: [
          '👍',
          '…',
          '(Kenji has left the chat) (Kenji has rejoined the chat)',
          '(Kenji reacted 👍 to a message from two weeks ago)',
          '(Kenji sent a photo of a prairie sunrise. No caption.)'
        ],
        ok: [
          '…',
          '👍',
          '(Kenji is typing…) (Kenji is no longer typing)',
          '(Kenji has left the chat) (Kenji has rejoined the chat)'
        ],
        grumpy: [
          '…',
          '.',
          '(Kenji has left the chat)',
          '(Kenji has left the chat) (Kenji has rejoined the chat) (Kenji has left the chat)'
        ],
        sulking: [
          '(Kenji has left the chat)',
          '(Kenji is away. Location: unknown.)',
          '.',
          '(Kenji sent a photo of an empty corner.)'
        ]
      }
    },

    gigReactions: {
      marcel: {
        great: [
          'LORD ABYSSUS HAS CONQUERED {city}!',
          'Did you see? A man wept. During the lawn song.',
          'Tonight, the void was sold out.'
        ],
        ok: [
          'Adequate. The fog was underused.',
          'They did not understand the French. They will.',
          'The spotlight was on me for 73 percent of the set. Acceptable.'
        ],
        bad: [
          'The crowd was not ready for Lord Abyssus. Possibly ever.',
          'Somebody requested a song in English. I will never recover.',
          'I screamed my best scream at a man eating nachos. He kept eating.'
        ]
      },
      dana: {
        great: [
          'Solo went eleven minutes. Nobody left. NOBODY LEFT.',
          'Tone was perfect. Mids were perfect. I might cry.',
          'Broke a string, finished the solo on five. Best night of my life.'
        ],
        ok: [
          'Monitor mix was muddy, but the solo held.',
          'Decent. The room ate the high end.',
          "I'd give it a B. My pedalboard gets an A."
        ],
        bad: [
          'Someone unplugged me to charge a phone.',
          "The sound guy called my guitar 'the pointy one'.",
          'They clapped during the solo. Not after it. During.'
        ]
      },
      jaxon: {
        great: [
          'BABA WOULD BE SO PROUD (dont tell baba i was out this late)',
          'I DID FOUR SHRED FILLS AND NOBODY STOPPED ME',
          'someone asked for my autograph on a napkin. keeping the napkin forever'
        ],
        ok: [
          'pretty good! the dog liked us',
          'i only messed up one part and it was the easy part',
          "can we get food after. baba packed food. we can eat baba's food"
        ],
        bad: [
          'ok that was rough but the perogies survived',
          'i think i played the whole set half a step flat??',
          'baba already heard about it. somehow. already'
        ]
      },
      kenji: {
        great: [
          '(Kenji nods. Once. The room goes quiet.)',
          '(Kenji lifts his sunglasses a millimetre, then lowers them.)',
          '(Kenji is gone before the encore. There is a thumbs-up drawn in the dust on his amp.)'
        ],
        ok: [
          '(Kenji nods, but lower. A half-nod, maybe.)',
          '…',
          '(Kenji packs his bass in eleven seconds and waits by the truck.)'
        ],
        bad: [
          '(Kenji stares at the floor tom for a full minute.)',
          '(Kenji has left the venue.)',
          '…'
        ]
      }
    },

    tap: {
      marcel: [
        'In the garage, I am Lord Abyssus. Marcel is for invoices.',
        'I am practising my scream face. Watch. ... You blinked. Again.',
        'Hail damage is covered under Section 4, subsection B. The band is not covered at all.',
        'My lawn is exactly three centimetres. Like my patience.',
        'Tonight I scream in French until the neighbours understand French.',
        'The mirror understands me. The mirror has never asked for a set list.'
      ],
      dana: [
        "Shh. I'm on hour seven.",
        "Stainless frets, 25.5-inch scale, 24 frets. I'm telling you because you asked.",
        'I wrote a solo for the chorus. It starts in the verse.',
        "Your hi-hat is two milliseconds early. It's fine. It's not fine.",
        'Want to hear my new pickups? You are going to hear them anyway.',
        "Ten hours a day isn't a lot. It's the minimum."
      ],
      jaxon: [
        'want a cabbage roll? baba made extra. baba always makes extra',
        'did you hear that fill? no? good. that was the plan',
        'baba says hi. baba also says be home by 10',
        "i'm 19 but baba says i'm 'still a baby, just tall'",
        'can i solo in the new one? just the start? just the end?',
        "this sandwich has a note in it. it says 'practise'"
      ],
      kenji: [
        '…',
        '(Kenji looks at you. Probably. Hard to tell.)',
        '(Kenji adjusts his sunglasses. The conversation is over.)',
        '(Kenji holds up one finger. Then lowers it. You will never know.)',
        '(Kenji is sitting so still a moth has landed on him.)',
        "(You think Kenji's asleep. He is not. He has never been asleep.)"
      ]
    },

    guilt: [
      "Your mom asks if you've thought about night school.",
      "Your dad leaves a Prairie Polytechnic course calendar on your snare. 'Accounting' is circled. Twice.",
      "Your mom tells the neighbours you're 'between things'. You are between the kick drum and the floor tom.",
      'Your dad hands over the cash and says nothing. The nothing is very loud.',
      "Your mom has started calling the band fund 'the other kid'.",
      "An aunt calls to ask how 'the little band' is doing. Mom told her.",
      'Your mom mentions that your cousin got a real job, with a parking spot. She mentions it twice.'
    ],

    yearEnd: [
      'Another year in {space}. Somehow everyone is still here.',
      "{front} raises a glass: 'To {band}. To next year. To a van that starts.'",
      "Year's end. {soloist} worked out the practice hours. Nobody wanted to hear the number.",
      "{deadpan} gives a year-end nod. Everyone agrees it's the best gift they got.",
      "Mom looks at the band, looks at the band fund, and says 'Another year, eh.' It's almost a blessing."
    ],

    songReactions: {
      marcel: {
        name: [
          'It needs a name. Something dark. Something that is definitely not about my yard:',
          'I will call it, and you will not ask what it is about:',
          'This one speaks to me of darkness. And of my yard. Its name is',
          'I have written the lyrics in the time it took you to count in. It is called',
          'Silence. Lord Abyssus names it:',
          'The neighbours will weep when they hear it. It is called',
          'In English, for the radio. I hate it. It is called'
        ],
        nameFr: [
          'Non. This one is French. It was always French. It is called',
          'English is for the other songs. This one is',
          'Do not look at me like that. Some songs are born French. This one is',
          'One French title. Just one. For my grand-mère in Gravelbourg:',
          'I have translated it back into French, where it belongs:',
          'The radio can learn. Lord Abyssus names it, in the language of the ancients:'
        ]
      },
      dana: {
        noSolo: [
          'Cool. Where does my solo go? Nowhere? Cool. Cool cool cool.',
          "There's no bridge. Where am I supposed to shred, the parking lot?",
          "You filled every gap. I'll just solo over the top of it. Loudly.",
          'Great song. No room for a solo. I will be taking this up with management.',
          "I needed eight bars. You gave me zero. I'm writing that down."
        ],
        frSigh: [
          '(Dana sighs.) Fine. I will text Gord. He will have it translated before the chorus.',
          'Every setlist I print now needs a footnote. Cool. Cool cool cool.',
          "I'm writing the English on my pedalboard in Sharpie. Again.",
          'Marcel. We TALKED about this. (She sighs into her tuner.)'
        ]
      },
      jaxon: {
        fills: [
          'ok so i added a fill in bar 4. you did not write it. it is there now',
          "it felt kinda empty so i snuck a few notes in. baba says it's better",
          'i played the simple part. then i got bored. then there was a fill. sorry',
          "don't listen to bar 12 too closely. or do. it's my best work",
          'the verse had room so i put a little bass run there. like a surprise'
        ],
        frSigh: [
          'baba is going to ask what it means. i will say "lawn". it is always lawn',
          'ok i will learn to say it. do not expect the accent',
          '*sigh* i cannot spell that on the setlist. i will draw a lawn'
        ]
      },
      kenji: {
        great: [
          '(Kenji nods. Once. It is the highest honour in Saskatchewan.)',
          '(Kenji lowers his sunglasses one centimetre. Then raises them again.)',
          '(Kenji taps his foot. Everyone stops playing to stare.)',
          '👍'
        ],
        frSigh: [
          '(Kenji sighs. It is the loudest sound anyone has ever heard him make.)',
          "(Kenji writes the English title on a sticky note and presses it to Marcel's forehead.)",
          '(Kenji exhales through his nose. The garage goes quiet.)'
        ]
      }
    },

    writeTips: {
      dana: ["Start with the kick. Metal wants it busy: try every 8th. Then leave me room for a solo.", 'Tap to add a hit, drag down a lane to paint. Kick first, the rest follows.'],
      marcel: ['Make the chorus different from the verse. A crash on the one. Darkness follows.', 'The chorus must CRASH. Then I will name it.'],
      jaxon: ['tap a square to add a hit. drag to paint a whole row. hit play to hear it', "kick on every 8th is the metal thing. the pedal thing comes later i think"]
    },

    quietWeek: [
      'A quiet Monday. Suspiciously quiet.',
      'Nothing happens. {soloist} practises. {space} hums at sixty cycles.',
      "A slow week. Somebody's mom sends soup. It's a good week.",
      '{deadpan} was spotted at the Co-op buying one lime. That is the whole news.',
      'The group chat is silent. Even {front}. Especially {front}. Something is brewing.',
      'Quiet week in {city}. The rent is cheap, the coffee is hot, the band is fine.',
      'The neighbour mows the lawn. {grumbler} watches from the doorway, judging the stripes.'
    ],

    // ---- v0.3 road trips (WORLD agent). Kenji drives, silently: he never has a banter pool, only stage directions.
    vanBanter: {
      marcel: [
        'Every grain elevator we pass is a cathedral. I will not be taking questions.',
        'When we are famous, this highway will be named after me. The whole thing.',
        'Kenji. Kenji. Is it true you have never once used the horn? ...Respect.',
        'I have written a ballad about this ditch. It is in three movements.',
        'The cape stays on in the van. The cape is always on.',
        'Look at that sky. That sky has never been to a gig. We are its first.'
      ],
      dana: [
        'I tuned everything before we left. The potholes have un-tuned everything.',
        "Nobody touch my pedalboard. I know exactly where everything is. It's chaos, but mine.",
        'Two hundred kilometres and not one tree. I respect the commitment.',
        'If we break down out here, I am walking to the gig. I am not missing a solo.',
        "Kenji's playlist is just the sound of the road. Honestly? It slaps.",
        'I counted. That was the forty-first grain bin. I need a hobby.'
      ],
      jaxon: [
        "Baba says if we don't finish the perogies she'll know. She'll just know.",
        "Are we there yet? I'm asking for the whole van.",
        'I brought snacks. I have already eaten the snacks. I need snack advice.',
        'Moose-count for this trip: zero. I feel robbed.',
        'That sign said Tom Harton\'s in 40 km. Just saying. For morale.',
        'I call the back bench. Wait, the gear is on the back bench. I call the gear.'
      ]
    },
    vanKenji: [
      '(Kenji adjusts the rear-view mirror by one degree.)',
      '(Kenji signals for a lane change. There is no one else on the highway.)',
      '(Kenji eats exactly one sunflower seed.)',
      '(Kenji nods at a passing grain truck. The grain truck nods back.)',
      '(Kenji taps the steering wheel once. Everyone falls silent.)'
    ],
    vanArrive: [
      '{driver} parks. Everyone piles out at once, like a clown car with amps.',
      'You arrive. {van} coughs into the lot and sighs. So do you.',
      'Arrived. {driver} goes looking for the green room. There is no green room.',
      'Here. {van} made it. Somebody pats the dashboard, just in case.'
    ],
    genreClash: [
      'Wrong crowd entirely. Half the room left. The other half stayed out of spite. The cheque cleared.',
      'The regulars asked for something else entirely. You played yours. They clapped for the drums, eventually.',
      'Nobody here came for your kind of music. A few of them are leaving as your kind of fan.'
    ],
    venueUp: [
      'The owner wants you back. Better money next time.',
      'You get the handshake-plus-shoulder-grab. That means a rebook.',
      '"Same time next month?" the owner asks. The whole band says yes before you can blink.'
    ],
    venueDown: [
      'The owner counts out your pay very slowly, looking you in the eye the whole time.',
      'Somebody wrote your band name on the napkin by the till. Underlined. Twice.',
      '"We\'ll call you," says the owner. He will not call you.'
    ],
    venueBanned: [
      "Your photo is going up on the wall behind the bar. Under the word BANNED.",
      'Banned. The owner laminated your poster first, so it would last.',
      'They take an instant photo of the band on the way out. It is for the banned wall. Everybody poses anyway.'
    ],
    vanTired: [
      '{van} makes a sound like a sad moose. It is probably fine.',
      '{van} is held together by duct tape, zip ties and belief.',
      'Something fell off {van}. {driver} looked at it, then drove on.'
    ],
    breakdown: [
      '{van} died on the shoulder. A tow truck, a long wait, a lighter band fund.',
      'The engine made one final, operatic noise and stopped. The tow cost plenty.',
      'Breakdown. {driver} got out, stared at the engine, got back in. It started. The tow truck still charged you.'
    ],
    sameCrowd: [
      'Same faces as last time. They sang along, at least.',
      'You recognise half the crowd from last week. So do they. Fewer new fans.',
      'The regulars are loyal. The regulars are also the only people here.'
    ],
    openingSlot: [
      'You played first. Half their crowd came early. Some of them are yours now.',
      'Opening slot: short set, bad pay, big room. You stole a few fans on the way out.',
      'The headliner said "great warm-up, guys." Their crowd said your band name on the way out.'
    ],

    // ---- v0.9: milestone overrides (20_sim_career MILESTONES keys) ----
    milestones: {
      firstGig: 'First gig! {band} is now technically a live act.',
      firstSong: 'First original song. Nobody knows what it is about yet.',
      fans50: '50 fans. More than your mom’s book club.',
      fans100: '100 fans. Someone you have never met wore your shirt.',
      fans250: '250 fans. {homeVenue} knows your name.',
      fans500: '500 fans. People sing along. Mostly the wrong words.',
      fans1000: '1,000 fans. {city} is starting to notice.',
      fund1000: 'First $1,000 in the band fund. Nobody touch it.',
      localHeroes: 'Local heroes on the horizon. The garage era is over: from now on people can quit and vans can die.',
      signed: 'Signed! {band} is a real band now, with paperwork and everything.',
      diyAlbum: 'A whole album, made and paid for by you. Signed to nobody, answerable to nobody.'
    },

    // ---- v0.5 "Signed" (neutral; Hail Damage's own in byBand.hail_damage) ----------------------------------
    eraLocal: [
      'Local heroes. People in {city} know the name now. Some of them even spell it right.',
      "You're the band people mention at the Co-op. Mom has started saying 'my kid, the local hero' at church.",
      'The garage era is over. The local paper calls you "local heroes". Dad cut it out and put it on the fridge.'
    ],
    eraSigned: {
      gopherwood: [
        "Signed to Gopherwood Records. Wendell shook every hand twice. The label van has a gopher on it. It's official.",
        'A two-record deal, typed on a typewriter, signed in a feed store. You are a signed band. Somebody made a cake.'
      ],
      monolith: [
        'Signed to Monolith Records. A glass tower, a lobby waterfall and a contract as thick as a phone book. Love that.',
        'Monolith Records. The big one. {front} read the whole contract out loud in the parking lot. It took an hour.'
      ],
      diy: [
        "No label. Your own album, your own money, your own mailing list. Mom's kitchen table is now a distribution centre.",
        'You put the album out yourselves. Nobody signed you. Nobody had to. {space} is now a record label.'
      ]
    },
    labelOffer: {
      gopherwood: [
        "A letter from Humboldt, typed on a typewriter: Gopherwood Records would like a word. There's a gopher stamped on it.",
        "Wendell from Gopherwood called Mom's landline. He'd like to 'talk records'. Mom has already offered him supper."
      ],
      monolith: [
        'An email from Monolith Records, Toronto. Someone from A&R would "love to connect". The signature has a waterfall in it.',
        'Monolith Records want a meeting. {front} has ironed a shirt. {soloist} has printed questions. {deadpan} is unreadable.'
      ]
    },
    offerExpired: [
      "The label's offer ran out. Wendell sends a card anyway: 'Door's always open.' Monolith sends nothing. That's how you can tell.",
      'The deadline passed. The offer is gone. {front} says it was "not our destiny". {soloist} says it was "a Tuesday".'
    ],
    labelDropped: [
      "The label dropped you. A two-line email. {front} prints it and burns it in the barbecue. You're DIY now, like the old days.",
      'Dropped. The contract is over, the advance is theirs and {space} is still yours. Mom made supper. It helps.',
      "No label any more. {filler} writes 'LABELS ARE FOR JAM JARS' on the whiteboard. It stays there for a year."
    ],
    studioWeek: {
      marcel: [
        'Recorded my vocal in the dark with a candle. The engineer says the candle is on the track. Good. It earned it.',
        'Take nine. The abyss is not yet satisfied. Neither is the producer. Neither am I.',
        'Tomorrow I sing the ballad. Tonight I rest my voice. Do not text me. This counts as a text.'
      ],
      dana: [
        "Tracked the solo. All of it. Yes, all of it. They'll edit it. They can try.",
        'Re-amped the rhythm tracks through Gwendolyn. The engineer asked what the smell was. It was tone.',
        'Spent four hours tuning. The guitar was in tune at hour one. The other three were for my soul.'
      ],
      jaxon: [
        "Snuck a fill into the second verse. Nobody's noticed yet. Don't tell them. Baba packed studio sandwiches.",
        "Engineer says my timing's 'honestly really tight'. I'm getting it tattooed. Baba says no. Not getting it tattooed.",
        'The studio has a vending machine AND a couch. I may never go home. Baba says I will go home.'
      ],
      kenji: ['(Sends a photo of a single bass string, coiled on the studio floor.)', '…', '(Thumbs-up emoji, then nothing for two days.)']
    },
    releaseDay: [
      "It's out. The album is out. Mom has bought it four times, in four formats, from four stores.",
      'Release day. {front} is refreshing the chart page every ninety seconds. The chart updates weekly.',
      'The record is in the world now. Dad asked if it comes on 8-track. He was only half joking.'
    ],
    chartDebut: [
      'You debuted on the Maple 100! Somewhere between a fiddle album and a man who whistles. You are on a chart.',
      "The Maple 100 has your name on it. {front} screenshotted it. {filler} screenshotted the screenshot.",
      'A chart debut. Mom asked what number is good. You said lower is better. She is now worried about her cholesterol.'
    ],
    chartClimb: [
      "Up the Maple 100 this week. {soloist} made a line graph. It's going the right way for once.",
      'Climbing the chart. Mom called the radio station to request it. Then called again with a different voice.'
    ],
    chartDrop: [
      'Down the chart this week. {front} says charts are a construct. Then checks it again.',
      "Slipping on the Maple 100. {filler} says it's 'a breather'. The chart does not breathe. The chart is a list."
    ],
    recouped: [
      'The advance is paid back. Recouped. From now on the royalties are yours. {soloist} opened a spreadsheet just for joy.',
      'Recouped! The label is even. Wendell sent a card. Monolith sent an automated email. Both count.'
    ],
    cert: {
      gold: [
        'GOLD. Forty thousand copies. A gold record on the wall of {space}. Dad keeps touching it when he thinks nobody sees.',
        'Gold record. Mom has had it appraised. She wants it melted into jewellery. Nobody knows if she is joking.'
      ],
      platinum: [
        'PLATINUM. Eighty thousand. {front} hung it at eye level so it catches the light. Every light.',
        'A platinum record. Dad drove over to look at it. He stood there for ten minutes. Then he said "huh". It was enough.'
      ]
    },
    loonies: {
      nominated: [
        "A Loonie nomination! {front} is already choosing an outfit. It's March. The ceremony is in March. Okay, fair.",
        'Nominated for a Loonie. Mom has told everyone at church, the Co-op and the dentist. The dentist is invited.',
        "You're up for a Loonie. {rival} are too. Of course they are."
      ],
      snubbed: [
        "No Loonie nominations this year. {front} says awards are 'for the dead'. Then watches the whole broadcast anyway.",
        'Not nominated. {rival} were. They made a speech about it. You were not in the speech. It still stung.'
      ]
    },

    // ---- v0.9: stage lines (22_sim_gig; member-keyed) + crowd moments (§4.4) --------------------------------------
    live: {
      marcel: { signature: ['Did everyone see the cape? Everyone saw the cape.', 'The cape and I were one tonight.',
        'I spun. The cape spun. The fog spun. Somebody in the front row is still spinning.'] },
      dana: { solo: ['That solo? Mine. You are welcome.', 'I closed my eyes during the solo and saw Norway.',
        'Eleven minutes. They wanted twelve. I could tell.'] },
      jaxon: { fill: ['i did a fill. you kept up. respect', 'did you notice the fill. be honest',
        'that fill was not in the song. it is now. baba would say it is "a bit much"'] }
    },
    moments: {
      mosh: ['The pit opened in the second song and never closed. Somebody lost a shoe. Somebody found a different shoe.',
        'A mosh pit in {city}. The bouncer joined in. Then he remembered his job.'],
      headbang: ['The whole front row headbanged in time. The chiropractor in the second row took notes.',
        'Every head in the room went up and down on the chorus. It looked like a field of wheat in a windstorm.'],
      wallOfDeath: ["A wall of death broke out in {city}. Somebody's mom was in it.",
        'The crowd split down the middle and charged. Nobody was hurt. One toque was lost forever.'],
      pogo: ['The whole room pogoed. The floor bounced. The bar staff held the glasses.',
        'Pogo time. The ceiling tiles are lower now. So is the damage deposit.'],
      gangShout: ['The crowd shouted HEY on every downbeat. Some of them on the upbeat. It counted.',
        'A gang shout so loud the fire alarm got confused. {front} pointed the mic at the crowd and let them have it.'],
      circlePit: ['The circle pit took out the merch table. Worth it.',
        'A circle pit went around the pool table three times. The pool game kept going. Respect on both sides.'],
      fistPump: ['A hundred fists in the air, all on the one. {front} pumped back. It turned into a workout.',
        'Fist pumps on every chorus. Somebody in the back pumped a crutch. Legend.'],
      singAlong: ["The crowd sang the chorus back louder than the PA. {front} stopped singing and just let them.",
        'Whoa-oh from the whole room. Even the sound guy. Especially the sound guy.'],
      lighters: ['Lighters. Actual lighters. Someone used a phone and got booed.',
        'The ballad got the lighters out. The fire marshal looked the other way. Just this once.'],
      clapAlong: ['The crowd clapped on two and four without being asked. A few on one and three. Close enough.',
        'A clap-along so steady you could have set the metronome by it. You did, for the last song.'],
      yeehaw: ['A YEEHAW from the back. Then from the front. Then from the bartender. It spread like a grass fire.',
        'Somebody threw a hat in the air on the chorus. Then everybody did. Nobody got the right hat back.'],
      lineDance: ['They line danced. Somebody brought a lasso.',
        'Two rows of boots, perfectly in step. They knew the dance to a song you wrote last Tuesday. How.']
    },
    momentLabels: {
      mosh: 'Mosh pit!', headbang: 'Headbang!', wallOfDeath: 'Wall of death!', pogo: 'Pogo!', gangShout: 'Gang shout: HEY!',
      circlePit: 'Circle pit!', fistPump: 'Fists up!', singAlong: 'Sing-along!', lighters: 'Lighters up', clapAlong: 'Clap along!',
      yeehaw: 'YEEHAW!', lineDance: 'Line dance!', capeSpin: 'Cape spin!', stageDive: 'Stage dive!', kneeSlide: 'Knee slide!',
      hatTip: 'Hat tip!', kickflip: 'Kickflip!', solo: 'Solo time'
    },

    // ---- v0.9: UI pools moved into content (55 BANTER, 59 REACT, 59c BAND_REACT; member-keyed + any) -----------------
    banter: {
      marcel: ['Merci, {city}! This next one is about my lawn.', 'Please do not touch the cape. The cape touches you.'],
      dana: ['Somebody turn me up. No, more.', 'That was in tune. Mostly.'],
      jaxon: ['(counts to four under his breath)', 'is the fog machine supposed to smell like that'],
      kenji: ['(Kenji nods once. The crowd nods back.)'],
      any: ['Thank you, {city}! We are {band}!', 'Anybody here drive in from out of town? Nobody? Okay.', 'Drink some water. Or whatever. Next one!',
        'Tip your bartender. Tip the sound guy. Do not tip the van, it is barely standing.', 'We have shirts at the back. One size. It fits nobody.']
    },
    labelReact: {
      any: {
        monolith: ['That is a lot of zeros. Are they allowed to put that many zeros?'],
        gopherwood: ['Small advance, but they actually listened to the demo. Twice!'],
        diy: ['We keep everything! Also we pay for everything. Also what is a "distribution"?'],
        signed: ['Signed! Somebody call our moms.']
      },
      marcel: { monolith: ["They want me to sing in English? Non. Absolument non. ...How much is the advance?"],
        gopherwood: ['They said the cape is "a vibe". I trust them completely.'],
        signed: ['I would like the record to show I signed first. In French.'] },
      dana: { monolith: ['A major label. My solo is going to be on the radio. Probably cut to four seconds, but still.'],
        gopherwood: ['Their office is above a bait shop. I love it here.'],
        signed: ['We are SIGNED. I am telling my landlord.'] },
      jaxon: { monolith: ['My baba says "monolith" means "one big rock". She says that is what they will leave on your grave.'],
        gopherwood: ['The owner gave me a granola bar. Unprompted. Sign it.'] },
      kenji: { monolith: ['(Kenji reads the whole contract. He circles one clause. He does not tell you which.)'] }
    },
    reviewReact: {
      any: {
        great: ['We are CRITICALLY ACCLAIMED. Someone tell my guidance counsellor.'],
        meh: ['Some liked it! Some were wrong!'],
        awful: ['At least they spelled the band name right. Mostly.']
      },
      marcel: { great: ['Pitchspork understood the cape. Finally, the press is ready.'],
        meh: ['Mixed. Like a good poutine. I choose to be flattered.'], awful: ['I will be writing letters. In French. Long ones.'] },
      dana: { great: ['They called my solo "unhinged". I am framing it.'] },
      jaxon: { meh: ['My baba read them all. She says the critics are "soft in the head".'] },
      kenji: { awful: ['(Kenji prints the worst review and pins it to the wall. Motivation.)'] }
    },

    // ---- v0.9: the reverse genre-clash jokes (the band's genre in the wrong room) ---------------------------------
    byGenre: {
      metal: { genreClash: [
        'A bingo crowd. You played the heaviest song you own between B-4 and O-72. Somebody yelled BINGO in the breakdown.',
        'The front row covered their ears with both hands and did not leave. That is a fan.'] },
      punk: { genreClash: [
        'The dinner crowd wanted dinner music. You played eleven songs in fourteen minutes. The soup went cold.',
        'A man in a golf shirt asked if you do requests. {front} said no so fast it echoed.'] },
      rock: { genreClash: [
        'A metal crowd. They wanted blast beats. You gave them a guitar solo and a fist pump. A few pumped back.',
        'The punks at the front called you "dad rock". {front} took it as a compliment.'] },
      country: { genreClash: [
        'A metal bar. The regulars in corpse paint two-stepped ironically. Then, around song four, unironically.',
        'They wanted something heavier. {front} sang the sad truck song louder. It worked, somehow.'] }
    },

    // ======================================================================
    // v0.9: per-band extras (added on top of the flat pools; packs add frost_heave / gravel_kings / grid_road_ramblers)
    // ======================================================================
    byBand: {
      hail_damage: {
        activity: {
          rehearse: [
            "We ran 'My Lawn, My Tomb' eleven times. On the twelfth, Dad's lawnmower started by itself.",
            '{nick:marcel} made us run the breakdown until the garage door rattled in time.',
            'Door open, full volume. Three kids on bikes stopped to headbang, then rode off to be normal again.',
            'Dana counted in at 240 bpm. We are not a 240 bpm band. We are now.',
            "Kenji stood perfectly still for two hours. Every note landed. We don't ask.",
            "We tightened the ending. It had four endings. Now it has two, which Marcel calls 'a compromise'.",
            'Jaxon snuck a shred fill into the chorus. We all heard it. We let it live.'
          ],
          write: [
            "We wrote a riff in drop C. Marcel screamed French over it. He says it's about the void. It's about his lawn.",
            'Dana brought in a riff with nineteen parts. We kept four. She took it well, in gear specs.',
            '{nick:marcel} wrote the lyrics on the back of a claim form. The claim was approved.',
            'We built a song around your drum groove. Kenji nodded once. The song is finished.',
            'Jaxon hummed the tune his baba sings while making cabbage rolls. It is in 7/8 now.',
            'We wrote a ballad. It lasted ninety seconds before Marcel turned it into a blast beat.'
          ],
          promote: [
            'We stapled flyers to every pole on Broadway Avenue. Two went over our own old flyers.',
            "Jaxon posted a rehearsal clip. Baba commented: 'very loud, very good, eat something'.",
            'We chalked HAIL DAMAGE on the sidewalk outside the Co-op. It rained. Now it says HAIL DAM.',
            "{nick:marcel} did a 'mysterious' photoshoot in the river valley. A jogger asked if he was okay.",
            'We mailed our demo to three campus radio stations and a guy named Gord.',
            'Dana wrote a press release. It is mostly the specs of her amp.'
          ],
          book: [
            'Marcel negotiated with a Legion manager in French. She speaks English. It took an hour.',
            'Jaxon asked Baba to ask the church ladies. The church ladies are asking around.'
          ],
          hustle: [
            'We played a wedding social in Humboldt. The Chicken Dance, with blast beats. Cash and a pan of lasagna.',
            'We shovelled driveways on our street. {nick:marcel} refused, then critiqued our technique from the step.',
            'We helped Cousin Dale move. There was a piano. There is always a piano.',
            "Marcel did a hail inspection in full eyeliner. He is grumbling about 'selling out to the Man'. The Man is his boss."
          ],
          rest: [
            'We watched curling on Dad\'s TV. Kenji knew every rule. How.',
            'Nobody touched an instrument all night. Dana touched hers only nine times.',
            'Baba sent perogies. We slept on the couch in shifts.',
            'A lazy evening. {nick:marcel} watered his lawn by moonlight while we watched from lawn chairs.',
            'We played crokinole until midnight. Jaxon flicked a disc into the lawnmower.',
            'We drove out to see the grain elevators at sunset and said nothing for an hour. Kenji loved it.'
          ]
        },
        guilt: [
          "Your aunt in Yorkton calls to ask how 'the little band' is doing. Mom told her.",
          "Your mom mentions that Cousin Dale got a job at the potash mine. She mentions it twice.",
          'Dad parks the new truck on the street and stares at the garage for a long time.'
        ],
        yearEnd: [
          "Another year in the garage. The lawnmower has heard every song. It hasn't complained. Much.",
          "{nick:marcel} raises a glass: 'To Hail Damage. To the Abyss. To next year's lawn.'",
          "Year's end. Dana worked out she practised 3,650 hours. She'd like to get that number up.",
          "Baba sends a card: 'Proud of Jaxon. The drummer also. The French one, we will see.'",
          "Kenji gives a year-end nod. Everyone agrees it's the best gift they got.",
          "Dad looks at the garage, looks at the band, and says 'Another year, eh.' It's almost a blessing."
        ],
        quietWeek: [
          'A quiet Monday. Marcel is mowing. Nobody interrupts Marcel when he is mowing.',
          'Nothing happens. Dana practises. The garage hums at sixty cycles.',
          "A slow week. Jaxon's baba sends soup. It's a good week.",
          "Kenji was spotted at the Co-op buying one lime. That's the whole news.",
          'The group chat is silent. Even Marcel. Especially Marcel. Something is brewing.',
          "Quiet week in {city}. The river's high, the rent's free, the band's fine.",
          'Mr. Lindqvist mows his lawn. Marcel watches from the driveway, judging the stripes.'
        ],
        vanArrive: [
          'Kenji parks. Nobody saw him get out. He is already inside, holding the door.',
          'You arrive. Kenji is somehow already leaning on the van, sunglasses on.',
          'The Moose Hearse coughs into the lot. Kenji is gone. The keys are in your hand.',
          'Arrived. Kenji hands the parking ticket to the owner and walks off without a word.'
        ],
        genreClash: [
          'Wrong crowd entirely. The boots started flying in song two. You still got paid.',
          'The regulars asked for something they could two-step to. Marcel growled at them. The boots came out.',
          'Half the room left. The other half stayed out of spite. The cheque cleared.',
          'A cowboy hat hit the snare mid-fill. You kept the hat. You earned the hat.'
        ],
        venueUp: ['"Same time next month?" the owner asks. Marcel says yes before you can blink.'],
        venueBanned: ['They take an instant photo of the band on the way out. It is for the banned wall. Marcel poses anyway.'],
        vanTired: [
          'The Moose Hearse makes a sound like a sad moose. It is probably fine.',
          'The Moose Hearse is held together by duct tape, zip ties and belief.',
          'Something fell off the Moose Hearse. Kenji looked at it, then drove on.'
        ],
        breakdown: [
          'The Moose Hearse died on the shoulder. A tow truck, a long wait, a lighter band fund.',
          'The engine made one final, operatic noise and stopped. Marcel called it beautiful. The tow cost plenty.',
          'Breakdown. Kenji got out, stared at the engine, got back in. It started. The tow truck still charged you.'
        ],
        milestones: { fans250: '250 fans. The Gopher Hole knows your name.' },
        eraLocal: [
          "Local heroes. People in Saskatoon know the name now. Some of them even spell it right.",
          "You're the band people mention at the Co-op. Mom has started saying 'my son, the local hero' at church.",
          'The garage era is over. The Star-Pheasant calls you "local heroes". Dad cut it out and put it on the fridge.'
        ],
        eraSigned: {
          gopherwood: ['A two-record deal, typed on a typewriter, signed in a feed store. You are a signed band. Baba made a cake.'],
          monolith: ["Monolith Records. The big one. Marcel read the whole contract looking for the word 'cape'. It's in there. Once."],
          diy: ['You put the album out yourselves. Nobody signed you. Nobody had to. The garage is now a record label.']
        },
        labelOffer: {
          monolith: ['An email from Monolith Records, Toronto. Devon from A&R would "love to connect". The signature has a lobby waterfall in it.',
            "Monolith Records want a meeting. Marcel has ironed his cape. Dana has printed questions. Kenji has put on better sunglasses."]
        },
        offerExpired: ['The deadline passed. The offer is gone. Marcel says it was "not our destiny". Dana says it was "a Tuesday".'],
        labelDropped: [
          "The label dropped you. A two-line email. Marcel prints it and burns it in the barbecue. You're DIY now, like the old days.",
          'Dropped. The contract is over, the advance is theirs and the garage is still yours. Mom made perogies. It helps.',
          "No label any more. Baba says labels are for jam jars. Jaxon writes it on the whiteboard. It stays there for a year."
        ],
        releaseDay: ['Release day. Marcel is refreshing the chart page every ninety seconds. The chart updates weekly.'],
        chartDebut: [
          "The Maple 100 has your name on it. Marcel screenshotted it. Jaxon screenshotted Marcel's screenshot.",
          'A chart debut. Baba asked what number is good. You said lower is better. She is now very worried about her cholesterol.'
        ],
        chartClimb: ["Up the Maple 100 this week. Dana made a line graph. It's going the right way for once."],
        chartDrop: [
          'Down the chart this week. Marcel says charts are a colonial construct. Then checks it again.',
          "Slipping on the Maple 100. Jaxon says it's 'a breather'. The chart does not breathe. The chart is a list."
        ],
        recouped: ["The advance is paid back. Recouped. From now on the royalties are yours. Dana has opened a spreadsheet just for joy."],
        cert: {
          gold: [
            'GOLD. Forty thousand copies. A gold record on the garage wall, next to the rake. Dad keeps touching it when he thinks nobody sees.',
            'Gold record. Mom has had it appraised. Baba wants it melted down for jewellery. Nobody knows if she is joking.'
          ],
          platinum: [
            'PLATINUM. Eighty thousand. Marcel has hung the record at eye level so it catches the light on his cape.',
            'A platinum record. Dad moved his truck out of the garage to make room for it. Voluntarily. He has never done that.'
          ]
        },
        loonies: {
          nominated: [
            "A Loonie nomination! Marcel is already choosing an outfit. It's March. The ceremony is in March. Okay, fair.",
            "You're up for a Loonie. Tundra Wraith sent a fruit basket before the list was even public. How did they know."
          ],
          snubbed: [
            "No Loonie nominations this year. Marcel says awards are 'for the dead'. Then watches the whole broadcast anyway.",
            'Not nominated. Tundra Wraith were. They called to say "you were robbed, buddy". You were not robbed. It still stung.'
          ]
        },
        // UI bits (53 / 54 / 56 / 58; v0.9 ports)
        countIn: ['Marcel counts you in: "one, two, uh, the other ones."'],
        empty: { chat: 'No messages yet. Kenji has read everything.', catalog: 'No songs yet. Marcel is "workshopping".' },
        noSolo: ['Dana will mention it. Gently. Twice.'],
        exposure: { pitch: 'Marcel: "Exposure is basically money. Say yes."', toast: 'Exposure! We are going to be SO exposed.' },
        recruitAd: ['Garage. Snacks. Sometimes heat.'],
        banter: ['This next one is heavy. They are all heavy.']
      }
    }
  };
})(window.GG);
