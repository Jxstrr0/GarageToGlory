// content/lines.js: flavour text pools the sim picks from with the career RNG.
// Shape (CONTENT SCHEMAS in 02_contracts.js):
//   activity:     { <activityId>: [text] }                    one line per block, first-person plural
//   chat:         { <memberId>: { happy, ok, grumpy, sulking } } group-chat posts by mood bucket (moodLabel)
//   gigReactions: { <memberId>: { great, ok, bad } }          one per member after a gig
//   tap:          { <memberId>: [text] }                       tapping a bandmate in the garage
//   guilt: [text] (parents' loan)   yearEnd: [text]   quietWeek: [text] (Mondays without a card)
//   songReactions: { marcel: { name }, dana: { noSolo }, jaxon: { fills }, kenji: { great } }   after a Write block
//                  (marcel.name lines end with a colon: the sim appends the song's French title)
//   writeTips:     { <memberId>: [text] }   one in-character hint when the sequencer opens for the first-ever Write
// v0.5 (Signed): eraLocal [text] · eraSigned { <labelId>: [text] } · labelOffer { gopherwood|monolith: [text] } ·
//   offerExpired · labelDropped · studioWeek { <memberId>: [chat] } · releaseDay · chartDebut · chartClimb · chartDrop ·
//   recouped · cert { gold, platinum } · loonies { nominated, snubbed }   (the sim/UI pick one; all are plain text)
// Tokens: {player} {band} {city} {nick:<memberId>} {name:<memberId>}, replaced by GG.career.fillText().
// Kenji does not speak. His lines are stage directions or punctuation. This is load-bearing.
(function (GG) {
  GG.content.lines = {
    activity: {
      rehearse: [
        "We ran 'Ma Pelouse, Mon Tombeau' eleven times. On the twelfth, Dad's lawnmower started by itself.",
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
        "We called every hall in {city} from the kitchen phone. Mom took messages. She underlined 'NO' twice.",
        'We pinned our number to the corkboard at the music store, just under a lost cat.',
        'Marcel negotiated with a Legion manager in French. She speaks English. It took an hour.',
        "We emailed every bar in {city} with 'Hole' or 'Tavern' in the name. One replied 'who is this'.",
        'Jaxon asked Baba to ask the church ladies. The church ladies are asking around.'
      ],
      hustle: [
        'We played a wedding social in Humboldt. The Chicken Dance, with blast beats. Cash and a pan of lasagna.',
        'We shovelled driveways on our street. {nick:marcel} refused, then critiqued our technique from the step.',
        'We busked outside the farmers\' market and made gas money plus a jar of Saskatoon berry jam.',
        'We helped Cousin Dale move. There was a piano. There is always a piano.',
        'We returned bottles, pop cans and one cracked cymbal. The cymbal was worth more.',
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

    songReactions: {
      marcel: {
        name: [
          'It needs a name. A French name. I have it:',
          'I will call it, and you will not ask what it means:',
          'This one speaks to me of darkness. And of my yard. Its name is',
          'I have written the lyrics in the time it took you to count in. It is called',
          'Silence. Lord Abyssus names it:',
          'The neighbours will weep when they hear it. It is called'
        ]
      },
      dana: {
        noSolo: [
          'Cool. Where does my solo go? Nowhere? Cool. Cool cool cool.',
          "There's no bridge. Where am I supposed to shred, the parking lot?",
          "You filled every gap. I'll just solo over the top of it. Loudly.",
          'Great song. No room for a solo. I will be taking this up with management.',
          "I needed eight bars. You gave me zero. I'm writing that down."
        ]
      },
      jaxon: {
        fills: [
          'ok so i added a fill in bar 4. you did not write it. it is there now',
          "it felt kinda empty so i snuck a few notes in. baba says it's better",
          'i played the simple part. then i got bored. then there was a fill. sorry',
          "don't listen to bar 12 too closely. or do. it's my best work",
          'the verse had room so i put a little bass run there. like a surprise'
        ]
      },
      kenji: {
        great: [
          '(Kenji nods. Once. It is the highest honour in Saskatchewan.)',
          '(Kenji lowers his sunglasses one centimetre. Then raises them again.)',
          '(Kenji taps his foot. Everyone stops playing to stare.)',
          '👍'
        ]
      }
    },

    writeTips: {
      dana: ["Start with the kick. Metal wants it busy: try every 8th. Then leave me room for a solo.", 'Tap to add a hit, drag down a lane to paint. Kick first, the rest follows.'],
      marcel: ['Make the chorus different from the verse. A crash on the one. Darkness follows.', 'The chorus must CRASH. Then I will name it.'],
      jaxon: ['tap a square to add a hit. drag to paint a whole row. hit play to hear it', "kick on every 8th is the metal thing. the pedal thing comes later i think"]
    },

    quietWeek: [
      'A quiet Monday. Marcel is mowing. Nobody interrupts Marcel when he is mowing.',
      'Nothing happens. Dana practises. The garage hums at sixty cycles.',
      "A slow week. Jaxon's baba sends soup. It's a good week.",
      "Kenji was spotted at the Co-op buying one lime. That's the whole news.",
      'The group chat is silent. Even Marcel. Especially Marcel. Something is brewing.',
      "Quiet week in {city}. The river's high, the rent's free, the band's fine.",
      'Mr. Lindqvist mows his lawn. Marcel watches from the driveway, judging the stripes.'
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
    venueUp: [
      'The owner wants you back. Better money next time.',
      'You get the handshake-plus-shoulder-grab. That means a rebook.',
      '"Same time next month?" the owner asks. Marcel says yes before you can blink.'
    ],
    venueDown: [
      'The owner counts out your pay very slowly, looking you in the eye the whole time.',
      'Somebody wrote your band name on the napkin by the till. Underlined. Twice.',
      '"We\'ll call you," says the owner. He will not call you.'
    ],
    venueBanned: [
      "Your photo is going up on the wall behind the bar. Under the word BANNED.",
      'Banned. The owner laminated your poster first, so it would last.',
      'They take an instant photo of the band on the way out. It is for the banned wall. Marcel poses anyway.'
    ],
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

    // ---- v0.5 "Signed" -------------------------------------------------------
    eraLocal: [
      "Local heroes. People in Saskatoon know the name now. Some of them even spell it right.",
      "You're the band people mention at the Co-op. Mom has started saying 'my son, the local hero' at church.",
      'The garage era is over. The Star-Pheasant calls you "local heroes". Dad cut it out and put it on the fridge.'
    ],
    eraSigned: {
      gopherwood: [
        "Signed to Gopherwood Records. Wendell shook every hand twice. The label van has a gopher on it. It's official.",
        'A two-record deal, typed on a typewriter, signed in a feed store. You are a signed band. Baba made a cake.'
      ],
      monolith: [
        'Signed to Monolith Records. A glass tower, a lobby waterfall and a contract as thick as a phone book. Love that.',
        "Monolith Records. The big one. Marcel read the whole contract looking for the word 'cape'. It's in there. Once."
      ],
      diy: [
        "No label. Your own album, your own money, your own mailing list. Mom's kitchen table is now a distribution centre.",
        'You put the album out yourselves. Nobody signed you. Nobody had to. The garage is now a record label.'
      ]
    },
    labelOffer: {
      gopherwood: [
        "A letter from Humboldt, typed on a typewriter: Gopherwood Records would like a word. There's a gopher stamped on it.",
        "Wendell from Gopherwood called Mom's landline. He'd like to 'talk records'. Mom has already offered him supper."
      ],
      monolith: [
        'An email from Monolith Records, Toronto. Brayden from A&R would "love to connect". The signature has a lobby waterfall in it.',
        "Monolith Records want a meeting. Marcel has ironed his cape. Dana has printed questions. Kenji has put on better sunglasses."
      ]
    },
    offerExpired: [
      "The label's offer ran out. Wendell sends a card anyway: 'Door's always open.' Monolith sends nothing. That's how you can tell.",
      'The deadline passed. The offer is gone. Marcel says it was "not our destiny". Dana says it was "a Tuesday".'
    ],
    labelDropped: [
      "The label dropped you. A two-line email. Marcel prints it and burns it in the barbecue. You're DIY now, like the old days.",
      'Dropped. The contract is over, the advance is theirs and the garage is still yours. Mom made perogies. It helps.',
      "No label any more. Baba says labels are for jam jars. Jaxon writes it on the whiteboard. It stays there for a year."
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
      'Release day. Marcel is refreshing the chart page every ninety seconds. The chart updates weekly.',
      'The record is in the world now. Dad asked if it comes on 8-track. He was only half joking.'
    ],
    chartDebut: [
      'You debuted on the Maple 100! Somewhere between a fiddle album and a man who whistles. You are on a chart.',
      "The Maple 100 has your name on it. Marcel screenshotted it. Jaxon screenshotted Marcel's screenshot.",
      'A chart debut. Baba asked what number is good. You said lower is better. She is now very worried about her cholesterol.'
    ],
    chartClimb: [
      "Up the Maple 100 this week. Dana made a line graph. It's going the right way for once.",
      'Climbing the chart. Mom called the radio station to request it. Then called again with a different voice.'
    ],
    chartDrop: [
      'Down the chart this week. Marcel says charts are a colonial construct. Then checks it again.',
      "Slipping on the Maple 100. Jaxon says it's 'a breather'. The chart does not breathe. The chart is a list."
    ],
    recouped: [
      "The advance is paid back. Recouped. From now on the royalties are yours. Dana has opened a spreadsheet just for joy.",
      'Recouped! The label is even. Wendell sent a card. Monolith sent an automated email. Both count.'
    ],
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
        "Nominated for a Loonie. Mom has told everyone at church, the Co-op and the dentist. The dentist is invited.",
        "You're up for a Loonie. Tundra Wraith sent a fruit basket before the list was even public. How did they know."
      ],
      snubbed: [
        "No Loonie nominations this year. Marcel says awards are 'for the dead'. Then watches the whole broadcast anyway.",
        'Not nominated. Tundra Wraith were. They called to say "you were robbed, buddy". You were not robbed. It still stung.'
      ]
    }
  };
})(window.GG);
