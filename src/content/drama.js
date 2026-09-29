// content/drama.js: v0.4 band drama for Hail Damage's originals (27_sim_drama.js reads it).
//   GG.content.drama = {
//     stageText: { 1|2|3: text with {who} {gripe} },  gripes: { money, burnout, losing, mystery },
//     members: { <memberId>: { wants: [{ id, text, gripe, rule }], grumble: [chat], passive: [chat],
//                ultimatum: cardId, return: cardId, returnFilled: cardId,
//                exit: { id, away?, returnAfter: [lo, hi] weeks, needBuzz?, status, quitLine: { who, text },
//                        beats: [{ at: weeks gone, who, text }], changed, backLine: { who, text } }, epilogue } },
//     recruit: { grumble, passive, ultimatum },  fillIns: { <role>|any: [name] },  protectionToast }
//   GG.content.dramaCards = [ CARD ]   ultimatum + return cards (Monday-card schema, never drawn: GG.drama forces them).
//     Extra effect keys: member { id: memberId|'recruit', act: 'settle'|'quit'|'return'|'later'|'rival' }, payCut, repay.
//     {recruit} = the member the card is about (the recruit filling the slot on a *_filled return card).
// Want rules (27_sim_drama RULES): spotlight, cape, solos, practice, freedom, baba, mystery.
// Kenji never speaks words: his lines are punctuation or (stage directions). His ultimatum is a packed bass case.
(function (GG) {
  function ret(id) { return { member: { id: id, act: 'return' } }; }
  function fx(extra, id, act) { var o = { member: { id: id, act: act } }; for (var k in extra) o[k] = extra[k]; return o; }

  GG.content.drama = {
    stageText: {
      1: '{who} is grumbling about {gripe}.',
      2: '{who} is getting passive-aggressive in the group chat about {gripe}.',
      3: '{who} has an ultimatum for you. Monday.'
    },
    gripes: { money: 'money', burnout: 'being worked like a rented mule', losing: 'the band going nowhere', mystery: 'nobody knows what' },
    protectionToast: 'The garage era is over. From here on, people can quit and the van can die. Warnings first. Probably.',

    members: {
      marcel: {
        wants: [
          { id: 'spotlight', text: 'The spotlight. Every song introduced by Lord Abyssus, in French, at length.', gripe: 'the spotlight', rule: 'spotlight' },
          { id: 'theatrics', text: 'Theatrics. A cape budget. Possibly a fog machine.', gripe: 'the cape budget', rule: 'cape' }
        ],
        grumble: [
          'Lord Abyssus notes that the flyer font makes his name look… small.',
          "Je dis ça, je dis rien. But the spotlight was on Dana. Again.",
          'At Prairie Mutual they at least give me a lanyard with my NAME on it.'
        ],
        passive: [
          'Bravo to everyone tonight. Especially the lighting guy, who found every member except one. 🙂',
          'No, no, it is fine. A cape is only the soul of the show. We can use a tarp. 🙂',
          "I have updated my profile to 'available for darker opportunities'. No reason."
        ],
        ultimatum: 'ult_marcel', 'return': 'ret_marcel', returnFilled: 'ret_marcel_filled',
        exit: {
          id: 'quebec', returnAfter: [16, 26],
          status: 'Fronting Les Chevaliers du Gazon in Rimouski, where people understand the lyrics. That is the problem.',
          quitLine: { who: 'marcel', text: "Mes amis. I have joined Les Chevaliers du Gazon of Rimouski. They understand me. Au revoir, and good luck with the lawn." },
          beats: [
            { at: 3, who: 'gord', text: "Saw a poster: 'LES CHEVALIERS DU GAZON featuring LORD ABYSSUS.' Opening for a polka band in Rivière-du-Loup." },
            { at: 8, who: 'marcel', text: "Our album 'Tondeuse de l'Enfer' has sold eleven copies. Nine to my mother. They understand every word. It is terrible." },
            { at: 14, who: 'reporter', text: "Arts brief: Saskatoon expat's solo album flops in Rimouski. 'He screams about grass,' says one listener." }
          ],
          changed: 'Back from Quebec. Now demands bilingual stage banter and can hit a high C.',
          backLine: { who: 'marcel', text: 'Nobody in Quebec found me mysterious. They knew what the songs meant. Lord Abyssus has returned. I brought the cape.' }
        },
        epilogue: 'Marcel retires to Gravelbourg and grows the most feared lawn in Saskatchewan.'
      },

      dana: {
        wants: [
          { id: 'solos', text: 'Longer solos. A solo in every song. A solo inside the solo.', gripe: 'solos', rule: 'solos' },
          { id: 'practice', text: 'More rehearsal. Ten hours a day is a warm-up.', gripe: 'rehearsal time', rule: 'practice' }
        ],
        grumble: [
          "For the record: last night's solo was cut from 32 bars to 8. I have logged it.",
          'Rehearsal is at 7. It is 7:04. I have tuned twice. Where is everyone.',
          'My new pickups are 16.4k ohms. Nobody asked. That is the problem.'
        ],
        passive: [
          'Great show everyone!! Loved the part where the solo was supposed to be. 🙂',
          'Just a reminder that some bands rehearse. Some bands. Other bands.',
          'A prog band from Calgary just followed me. Unrelated. See you Tuesday. Maybe.'
        ],
        ultimatum: 'ult_dana', 'return': 'ret_dana', returnFilled: 'ret_dana_filled',
        exit: {
          id: 'prog', returnAfter: [14, 24],
          status: 'Playing in 13/8 with Tessellated Leviathan in Calgary. There is no mosh pit. She has noticed.',
          quitLine: { who: 'dana', text: 'Update: I have joined Tessellated Leviathan (Calgary). Our first song is 22 minutes. An overture. Good luck with 4/4.' },
          beats: [
            { at: 4, who: 'dana', text: "Tessellated Leviathan's crowd sits down. On chairs. They clap after key changes. Nobody moshes. Nobody has ever moshed." },
            { at: 10, who: 'zine', text: "Tessellated Leviathan, 'Fractals of a Quiet Glacier'. Three skulls. 'Guitarist incredible. Also clearly miserable.'" }
          ],
          changed: 'Back from prog. Plays in 13/8 when bored, but now knows what a mosh pit is for.',
          backLine: { who: 'dana', text: 'Prog shows have no mosh pit. I checked every one. I am back. I brought two new pedals. Do not ask about the pedals.' }
        },
        epilogue: 'Dana opens a guitar shop in Prince Albert where every demo lasts eleven minutes.'
      },

      jaxon: {
        wants: [
          { id: 'freedom', text: 'Freedom. Fewer rehearsals. A life. Mostly a life.', gripe: 'being worked like a rented mule', rule: 'freedom' },
          { id: 'baba', text: "Baba's approval. A gig Baba can come to. Home by ten.", gripe: 'what Baba will say', rule: 'baba' }
        ],
        grumble: [
          'baba says i look tired. baba is right. baba is always right',
          'we have rehearsal AGAIN?? i have a curfew bro',
          "baba asked what the band pays. i said 'exposure'. she laughed for a long time"
        ],
        passive: [
          "no its cool i'll just play the simple parts. like always. 🙂",
          'baba says hello to everyone. she says it in a tone',
          'just wondering if anyone else has a baba who packs them perogies for free. asking for the band fund'
        ],
        ultimatum: 'ult_jaxon', 'return': 'ret_jaxon', returnFilled: 'ret_jaxon_filled',
        exit: {
          id: 'grounded', returnAfter: [12, 22], needBuzz: 12,
          status: "Grounded at Baba's. Allowed out for church and groceries. Practises with the amp unplugged.",
          quitLine: { who: 'baba', text: 'Jaxon is grounded from the band. He can come back when I hear you on the radio. Not before. — Baba' },
          beats: [
            { at: 3, who: 'jaxon', text: "baba made me join the church choir. the choir director says my vibrato is 'aggressive'" },
            { at: 8, who: 'baba', text: 'Jaxon is fine. Jaxon ate. Jaxon practises unplugged. It sounds like mice. — Baba' }
          ],
          changed: 'Back from being grounded. Baba approves (for now) and packs lunches for the whole band.',
          backLine: { who: 'baba', text: 'I heard you on the radio. It was loud. Jaxon may come back. Home by ten. — Baba' }
        },
        epilogue: "Jaxon becomes a guitar teacher. Every student learns a sneaky fill. Baba approves."
      },

      kenji: {
        wants: [{ id: 'unknown', text: "Nobody knows. That's the point.", gripe: 'nobody knows what', rule: 'mystery' }],
        grumble: [
          '(Kenji has left the chat)',
          '…',
          '(Kenji reacted 😐 to the pay sheet.)'
        ],
        passive: [
          '(Kenji sent a photo of his bass case. It is closed.)',
          "(Kenji changed the group name to 'Hail Damage (for now)'.)",
          '(Kenji sent a photo of the highway. No caption. Westbound.)'
        ],
        ultimatum: 'ult_kenji', returnFilled: 'ret_kenji_filled',
        exit: {
          id: 'vanished', away: true, returnAfter: [10, 20],
          status: 'Gone. Nobody saw him leave. Postcards arrive. They are blank.',
          quitLine: { who: 'kenji', text: '(Kenji has left the chat)' },
          beats: [
            { at: 3, who: 'mom', text: "A postcard came for the band from Churchill, Manitoba. It's blank. There's a polar bear on it. It looks smug." },
            { at: 7, who: 'dj', text: "A caller says a bassist in sunglasses sat in at a jam in Flin Flon. Didn't speak. Played like a legend. Left early." }
          ],
          changed: 'Back from wherever that was. Now has a small moose tattoo. Will not explain it.',
          backLine: { who: 'kenji', text: '(Kenji is back in his corner. Nobody saw him come in.)' }
        },
        epilogue: 'Kenji is never seen again. Every year, a blank postcard arrives. The polar bears get smugger.'
      }
    },

    recruit: {
      grumble: [
        "Not to be that guy, but the Kijiji ad said 'paid gigs'.",
        "Is there a reason my name isn't on the poster? Asking for my mom.",
        'Rehearsal again? Cool. Cool cool cool.'
      ],
      passive: [
        'Loved the gig! Especially the part where I got paid in exposure. 🙂',
        'Just saw an ad for a band that pays. Anyway. See you Tuesday.',
        'Great practice everyone. Some of us even learned the songs. 🙂'
      ],
      ultimatum: 'ult_recruit'
    },

    fillIns: {
      vocals: ['Brayden from the karaoke bar', 'Wendell, who does weddings', 'Tammy from the church choir'],
      'lead guitar': ['Dwayne from the music store', "Mrs. Hiebert's grandson", 'Clint, who knows one solo'],
      'rhythm guitar': ['Cody, who knows three chords', 'Gus from the Legion', 'A kid named Rowan'],
      bass: ['Ron, who owns a bass', 'Sheila from the jazz trio', 'Lyle, who brought a tuba "just in case"'],
      any: ['Dwayne from the music store', 'Cousin Dale, somehow']
    }
  };

  GG.content.dramaCards = [
    // ---- Ultimatums (stage 3): 2 fixes at a cost, or refuse and they quit ----
    { id: 'ult_marcel', type: 'drama', speaker: 'marcel', title: 'Lord Abyssus Has Demands',
      text: "Marcel arrives in full eyeliner with a typed letter on Prairie Mutual letterhead. Item one: a fog machine. Item two: he " +
        "introduces every song. Item three is just 'RESPECT', in French. A Quebec band has 'expressed interest'.",
      choices: [
        { label: 'Buy the fog machine ($150)', effects: fx({ fund: -150, mood: { marcel: 15 } }, 'marcel', 'settle'),
          outcome: "The garage fills with fog. You can't see the drum kit. Marcel has never been happier. The smoke detector files a complaint." },
        { label: 'He introduces every song', effects: fx({ buzz: -3, burnout: 4, mood: { marcel: 12 } }, 'marcel', 'settle'),
          outcome: 'Sets now run 40% longer. The introductions are in French and describe the lawn in detail. The crowd is baffled. Marcel is radiant.' },
        { label: 'Call his bluff', effects: fx({ chemistry: -4 }, 'marcel', 'quit'),
          outcome: "Marcel folds the letter into a swan, sets it on your snare and exits backwards through the side door. 'Adieu.' His cape catches in the door." }
      ] },
    { id: 'ult_dana', type: 'drama', speaker: 'dana', title: 'Terms and Conditions',
      text: "Dana has made a slideshow. Slide one: every solo she's been cut from, in minutes. Slide two: a 7-string with a 26.5-inch scale. " +
        "Slide three: 'Tessellated Leviathan (Calgary) wants me. They play in 13/8.'",
      choices: [
        { label: 'Buy her the 7-string ($180)', effects: fx({ fund: -180, mood: { dana: 15 }, skill: { dana: 2 } }, 'dana', 'settle'),
          outcome: 'She names it Gwendolyn II and plays it for eleven straight hours. The neighbours move their bedroom to the other side of the house.' },
        { label: 'A solo in every song', effects: fx({ burnout: 5, mood: { dana: 12 } }, 'dana', 'settle'),
          outcome: 'Songs now run seven minutes. Marcel introduces each solo. Everyone is tired and nobody can say why.' },
        { label: 'Tell her to go to Calgary', effects: fx({ chemistry: -4 }, 'dana', 'quit'),
          outcome: "She packs Gwendolyn and a pedalboard the size of a door. 'It's in 13/8,' she says. 'You wouldn't understand.' You wouldn't." }
      ] },
    { id: 'ult_jaxon', type: 'drama', speaker: 'baba', title: 'Baba Has Spoken',
      text: "Baba Kowalchuk is in your garage with a roaster of perogies and a clipboard. 'Jaxon is tired. Jaxon is thin. Jaxon comes home at " +
        "one in the morning. Explain.' Jaxon stands behind her, holding his guitar like a shield.",
      choices: [
        { label: 'Home by ten, every night', effects: fx({ burnout: -8, mood: { jaxon: 12 } }, 'jaxon', 'settle'),
          outcome: "Baba writes '22:00' on the clipboard and underlines it. Rehearsals now end at 9:45 with a mandatory perogy break." },
        { label: 'Give the band a raise (+5%)', effects: fx({ payCut: 0.05, mood: { jaxon: 12 } }, 'jaxon', 'settle'),
          outcome: 'Baba inspects the new pay sheet, nods, and puts it in her purse. Jaxon gets a raise. So does everyone, which Dana notices.' },
        { label: "Jaxon's an adult, Baba", effects: fx({ chemistry: -4 }, 'jaxon', 'quit'),
          outcome: "Baba takes Jaxon by the ear and the perogies by the handle. 'He is grounded,' she says. 'From the band.' The door closes very gently." }
      ] },
    { id: 'ult_kenji', type: 'drama', speaker: 'kenji', title: 'The Bass Case',
      text: "Kenji's bass case is by the door. It is packed. He is wearing his sunglasses, which is normal, and a toque, which is not. " +
        'He stands beside it, silent, for the whole rehearsal. Nobody knows what he wants.',
      choices: [
        { label: "Raise the band's cut (+5%)", effects: fx({ payCut: 0.05, mood: { kenji: 12 } }, 'kenji', 'settle'),
          outcome: 'You slide the new pay sheet across the amp. Kenji reads it for a long time. He takes off the toque. The case goes back in the corner.' },
        { label: 'Leave a single nod', effects: fx({ chemistry: 3, mood: { kenji: 15 } }, 'kenji', 'settle'),
          outcome: 'You give him a small nod. He looks at you for nine seconds, then nods back. The case goes back in the corner. Jaxon cries a little.' },
        { label: 'Let him go', effects: fx({ chemistry: -3 }, 'kenji', 'quit'),
          outcome: 'You say nothing. He says nothing. The next morning the case is gone, and so is Kenji. His corner still smells faintly of cedar.' }
      ] },
    { id: 'ult_recruit', type: 'drama', speaker: 'recruit', title: '{recruit} Wants a Word',
      text: "{recruit} catches you after rehearsal. 'I answered a Kijiji ad. It said paid gigs, a real band, and a garage with heat. " +
        "One out of three. I've had other offers. Well, one. A wedding band.'",
      choices: [
        { label: "Raise the band's cut (+5%)", effects: fx({ payCut: 0.05, mood: { recruit: 15 } }, 'recruit', 'settle'),
          outcome: '{recruit} shakes your hand. The wedding band will have to find someone else to play the Chicken Dance.' },
        { label: 'Buy a space heater ($60)', effects: fx({ fund: -60, mood: { recruit: 12 } }, 'recruit', 'settle'),
          outcome: "Two out of three. {recruit} sits right next to the heater at every rehearsal and calls it 'the office'." },
        { label: "The door's right there", effects: fx({ chemistry: -3 }, 'recruit', 'quit'),
          outcome: '{recruit} packs up and pins a one-star review of the garage to the music-store corkboard. It is fair.' }
      ] },

    // ---- Returns: an empty slot (welcome back / conditions / not yet) or a filled one (keep the recruit or the original) ----
    { id: 'ret_marcel', type: 'drama', speaker: 'marcel', title: 'Le Retour',
      text: "Marcel is in the driveway holding a cape and one copy of his solo album. 'In Rimouski, they understood the lyrics,' he says. " +
        "'Nobody found me mysterious. Nobody.' He looks at the empty mic stand.",
      choices: [
        { label: 'Welcome back, Lord Abyssus', effects: fx({ chemistry: 4 }, 'marcel', 'return'),
          outcome: 'He bows to the mic stand, then to you, then to the lawnmower. The garage feels theatrical again. Nobody admits they missed it.' },
        { label: 'Audition first', effects: fx({ mood: { marcel: -8 }, skill: { marcel: 2 } }, 'marcel', 'return'),
          outcome: 'He auditions with a nine-minute song about hedges. He gets the gig. He would like everyone to know he was nervous.' },
        { label: 'Not yet, Marcel', effects: fx({ mood: { marcel: -5 } }, 'marcel', 'later'),
          outcome: 'He nods gravely, leaves the album on your snare, and waits in his car. For weeks. Occasionally he honks.' }
      ] },
    { id: 'ret_marcel_filled', type: 'drama', speaker: 'marcel', title: 'Two Frontmen',
      text: "Marcel is back from Quebec, cape over one arm. He sees {recruit} at his mic stand. 'Ah,' he says. 'I see.' " +
        'Somewhere in Winnipeg, a polite accountant in corpse paint is already typing an email.',
      choices: [
        { label: 'Take Marcel back', effects: ret('marcel'),
          outcome: '{recruit} takes it well and leaves a thank-you card. Marcel reads it aloud, dramatically, in French. The garage is complete again.' },
        { label: 'Keep {recruit}', effects: fx({ mood: { recruit: 8 } }, 'marcel', 'rival'),
          outcome: "Marcel sweeps out. Two weeks later Tundra Wraith announces a new vocalist: 'Lord Abyssus'. They send you a fruit basket." }
      ] },
    { id: 'ret_dana', type: 'drama', speaker: 'dana', title: 'No Mosh Pit',
      text: "Dana is in the driveway with Gwendolyn and a new pedalboard. 'Prog shows have no mosh pit,' she says. 'None. I looked. I need a mosh pit.'",
      choices: [
        { label: 'Plug in, Sweep', effects: fx({ chemistry: 4 }, 'dana', 'return'),
          outcome: "She plugs in and plays a solo so long you order pizza during it. The pizza arrives before it ends. It's good to have her back." },
        { label: 'Solos stay short', effects: fx({ mood: { dana: -8 } }, 'dana', 'return'),
          outcome: "She agrees, then plays 'a short solo' of 64 bars. She considers this a compromise. You consider this Dana." },
        { label: "We're good for now", effects: fx({ mood: { dana: -5 } }, 'dana', 'later'),
          outcome: 'She nods and practises alone in her car in your driveway. You hear sweep arpeggios through the windshield every night.' }
      ] },
    { id: 'ret_dana_filled', type: 'drama', speaker: 'dana', title: 'Amp Settings',
      text: "Dana is back from Calgary, pedalboard under one arm. {recruit} is using her amp. Dana reads the amp settings and makes a face you have never seen before.",
      choices: [
        { label: 'Take Dana back', effects: ret('dana'),
          outcome: '{recruit} is gracious about it. Dana resets the amp to her exact settings and quietly re-strings everything {recruit} touched.' },
        { label: 'Keep {recruit}', effects: fx({ mood: { recruit: 8 } }, 'dana', 'rival'),
          outcome: 'Dana leaves without a word, which is new. Tundra Wraith posts a photo of their new lead guitarist. They tag you. Politely.' }
      ] },
    { id: 'ret_jaxon', type: 'drama', speaker: 'baba', title: 'Heard You on the Radio',
      text: "Baba is at the side door. 'I heard you on the radio,' she says. 'Deb Wiebe played the loud one. Olga called me.' Behind her, Jaxon is already holding his guitar.",
      choices: [
        { label: 'Welcome back, Rip', effects: fx({ chemistry: 4 }, 'jaxon', 'return'),
          outcome: "Jaxon plugs in so fast he trips the breaker. Baba leaves a roaster of perogies 'for the band'. You are all Baba's grandchildren now." },
        { label: 'Only if Baba comes to gigs', effects: fx({ buzz: 3 }, 'jaxon', 'return'),
          outcome: 'Baba sits front row with earplugs and a thermos. She claps on the wrong beat. The crowd follows her.' },
        { label: 'Not yet', effects: fx({ mood: { jaxon: -5 } }, 'jaxon', 'later'),
          outcome: 'Baba narrows her eyes at you. Jaxon waves sadly from the car. You receive no perogies for several weeks.' }
      ] },
    { id: 'ret_jaxon_filled', type: 'drama', speaker: 'baba', title: 'Who Is This',
      text: "Baba has heard you on the radio and brought Jaxon back. She sees {recruit} holding a rhythm guitar. 'Who is this,' she says. It is not a question.",
      choices: [
        { label: 'Take Jaxon back', effects: ret('jaxon'),
          outcome: '{recruit} gets a roaster of perogies as a goodbye gift. Baba insists. Jaxon sneaks a fill into the very first song.' },
        { label: 'Keep {recruit}', effects: fx({ mood: { recruit: 8 } }, 'jaxon', 'rival'),
          outcome: "Baba says nothing. That is worse. A month later Tundra Wraith's new rhythm guitarist is a very polite nineteen-year-old." }
      ] },
    { id: 'ret_kenji_filled', type: 'drama', speaker: 'kenji', title: 'The Corner',
      text: 'Kenji is back. He is standing in his corner, sunglasses on, bass in hand, looking at {recruit}, who is also standing in his corner. Nobody moves. The fridge hums.',
      choices: [
        { label: 'Kenji gets his corner', effects: ret('kenji'),
          outcome: '{recruit} understands without a word, which is the only way anything is ever said to Kenji. Kenji plugs in. He nods once.' },
        { label: 'Keep {recruit}', effects: fx({ mood: { recruit: 8 } }, 'kenji', 'rival'),
          outcome: "Kenji nods, which may mean anything. Weeks later, Tundra Wraith's promo photo has a fifth member in sunglasses at the back." }
      ] }
  ];
})(window.GG);
