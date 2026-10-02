// content/rivals.js (v0.6 "Rivals"): the rivalry. Tundra Wraith's hand-made lineup (Gord "Grimnir" Penner + three more
// polite accountants), their songs, records and rebrands, news lines, showdown texts, rival Monday cards (poach, crack,
// the Sad Dome), scene filler bands for the leaderboard, and the rivalry venues (festivals + the Sad Dome).
// Pure data. The sim (src/23_sim_rival.js) reads it; tunables live in economy.rival.
// Shape: GG.content.rivalry = {
//   cast: { <rivalId>: { id, frontman: memberId, members: [ { id, name, fullName, nick, role, lane, dayJob, bio, gags:[text],
//            look: LOOK, corpsePaint, stageShirt } ], songs: [title], albums: [{ title, kind }], rebrands: [name],
//            label: labelId, vehicle: text, minivan?: text (v0.6 name of the vehicle line),
//            v0.9 (plan_contract_0.9 §4.1): news { <key>: [text] } (wins over the flat news), showdowns { <kind>: {..} } (merged
//            over the flat texts), banter { open, mid, final } (their set, 59d), ui { heatLabels[5], vehicleLine, emptyNews,
//            emptyAlbums, pass, finalWin, finalLose, solo, finish, crack { breakup|rebrand|opener: [head, text] } },
//            carpet { intro, wave: 'polite'|'sponsor'|'scarf'|'tailgate', count }, defector { line, look:
//            'corpse'|'stylist'|'rhinestone'|'denim' }, comments[], commentsExclusive[] (Bandbook), cards: [CARD] (their own
//            rv_* variants: '<id>_<rivalId>', dealt through career.variant), drummer? (a hired player), furyBrand? } },
//   news:  { <key>: [text] }  the NEUTRAL fallback for any rival. tokens {rival} {band} {player} {album} {pos} {fans} {venue}
//          {city} {name} {prize} {n}
//   showdowns: { <C.SHOWDOWNS kind>: { title, text, win: [text], lose: [text], enter?, pass?, ... } }   (neutral fallback)
//   cards: [ CARD ]   Monday-card schema; ids rv_poach, rv_crack_<C.CRACKS>, rv_final_eve (neutral: speaker 'rival_frontman',
//          the current rival's frontman). {recruit} = the member the card is about. Extra member act 'poach'.
//   scene: [ { id, name, city, genre, base, peak, rise (years to peak), fade (0..1 lost over the rest of the career),
//          rivalId? (a rival's own row: skipped in the career whose rival it is), bandId? (a playable band's cameo row,
//          owner Q8: skipped in that band's own career) } ]
//   venues: [ VENUE + { festival: true, slot, headliner } ] festival grounds + the Sad Dome (Calgary, the final). Not listed
//          on the normal board; the rival sim lists them. kind uses C.VENUE_KINDS ('club' dressing) with festival/dome flags.
//          v0.9: genreFit per festival (a rodeo loves country; the Sad Dome fits everyone).
// }
(function (GG) {
  function look(skin, hair, style, shirt, pants, h, b, extras, top) {
    return { skin: skin, hair: hair, hairStyle: style, shirt: shirt, pants: pants, height: h, build: b, extras: extras || [], top: top };
  }
  function fit(metal, punk, rock, country) { return { metal: metal, punk: punk, rock: rock, country: country }; }

  // ---- Tundra Wraith's own copy (was the flat rivalry text + 59d's TW_UI / BANTER + the Bandbook rival comments) ----
  var TW_NEWS = {
    filler: [
      '{rival} played a benefit for the Winnipeg Humane Society. Raised $40,000. Gord cried in full corpse paint.',
      '{rival} were spotted at the Brandon Co-op buying veggie trays in bulk. Twelve of them.',
      '{rival} posted a tour diary. It is a spreadsheet. It is colour-coded. It is honestly very helpful.',
      "Gord from {rival} did a radio interview. He said {band} are 'the real deal, buddy'. It sounded sincere. That's the worst part.",
      "{rival} released a music video shot entirely in a Winnipeg bus shelter at minus forty. Nobody's fingers work in it.",
      "Lorne from {rival} emailed you a tempo report for a show you didn't play. You were still 2% fast.",
      '{rival} sold out the Park Theatre in Winnipeg. The merch table sold out of toques first.',
      "Darryl from {rival} is doing free tax clinics at the Legion. The line is out the door. People are wearing their shirts.",
      "Sheila from {rival} labelled every mic stand at the West End Cultural Centre. The staff kept the labels.",
      '{rival} sent the whole Saskatoon scene Christmas cards. Hand-signed. With a personal note each. Nobody knows how.',
      "Gord's minivan got a flat on the Trans-Canada. He changed it himself, in corpse paint, and waved at every car.",
      '{rival} got a five-skull review in Deci-Hell. The review mentions the veggie tray twice.'
    ],
    local: ['{rival} are the talk of the Winnipeg scene. Two hundred and fifty fans, one minivan, zero parking tickets.'],
    signed: ["{rival} signed with Monolith Records. They read the whole contract. Twice. For fun. Then they fixed a typo in it.",
      '{rival} sign a record deal and send you a fruit basket about it. The card says: "Your turn soon, buddy!"'],
    album: ["{rival} release '{album}'. It debuts at #{pos} on the Maple 100. They mail you a signed copy.",
      "{rival}'s new record '{album}' enters the Maple 100 at #{pos}. Gord calls to say it's 'basically a tie' with you."],
    albumNoChart: ["{rival} self-release '{album}'. They hand-numbered all three hundred copies. Yours is #1. Of course it is."],
    fans: ['{rival} passed {fans} fans. Gord posted a thank-you video to every single one. It is four hours long.'],
    youPassed: ['You have more fans than {rival} now. Gord sent a congratulations cake. It says "PROUD OF YOU BUDDY" in blue icing.'],
    theyPassed: ['{rival} have more fans than you again. They did not mention it. They sent a muffin basket. That was the mention.'],
    heatUp: ["The scene is calling it a feud now. {rival} call it 'a really fun friendship, buddy'.",
      "Deci-Hell ran a cover: '{band} vs {rival}: Prairie War'. Gord bought fifty copies and signed them for you."],
    heatDown: ['Things are quiet with {rival}. Too quiet. A fruit basket arrives anyway.'],
    forfeit: ["You skipped the Battle of the Bands. {rival} won by default and played two encores 'in your honour'.",
      "No show from you at the Battle. {rival} dedicated their set to you. Then donated the prize to the food bank. Again."],
    sameNightQuiet: ["{rival} played {venue} on Saturday to a full room. You had the night off. Gord sent a photo of the crowd. 'Wish you were here, buddy!'"],
    festivalMissed: ["{rival} headlined {venue}. They thanked 'our pals from Saskatoon who couldn't make it'. The crowd cheered for you. Politely."],
    opener: ["{rival} opened for you, as promised. They brought a veggie tray for your green room and about {n} of their fans.",
      "{rival} opened the show. Gord told the crowd to 'stick around for the real deal'. They did. Most of them."],
    poached: ['{name} is in {rival} now. The welcome photo: corpse paint, cardigans, a cake. You got tagged.'],
    loonies: ['{rival} won {n} Loonie(s) this year. Gord thanked you by name from the stage. You were not there. You were not nominated.'],
    crack_breakup: ["Tundra Wraith break up. The press release cites 'tax season, our families, and {band}, who beat us fair and square'. There is a pie chart."],
    crack_rebrand: ["Tundra Wraith are now {rival}. Same four accountants, same minivan, new letterhead. Gord calls it 'a fresh start, buddy'."],
    crack_opener: ["{rival} have asked to open for you. Gord's email subject line: 'Buddy!!! A proposal (no pressure)'. It has a budget attached."],
    finalSoon: ['The Sad Dome in Calgary wants a co-bill in week {n}: {band} and {rival}. One headlines. One opens. Forever.'],
    reunion: ['{rival} reunite for one night only at the Sad Dome. The accountants took the day off. All four of them.']
  };
  var TW_SHOWDOWNS = {
    botb: {
      win: ['The crowd picks you. Gord hugs you on stage, sobbing: "You earned it, buddy." He means it. You take {prize} and a few of their fans.',
        'You win the Battle. {rival} lead the applause in corpse paint. Lorne emails a tempo report: "Clean. Well done."'],
      lose: ['The crowd picks {rival}. Gord dedicates the encore "to our buddies from Saskatoon". Some of your fans stay for it.',
        '{rival} win the Battle. They donate the prize to the food bank and send you half the veggie tray.'] },
    sameNight: {
      win: ['Most of the scene picked your show. {rival} texted a photo of their half-empty room: "Great turnout, buddy! Proud of you!"'],
      lose: ['Half your crowd went to see {rival}. They sent a thank-you note for "sharing the night".'] },
    stolenSlot: {
      win: ['{venue} turned {rival} down: "We have a band for that night." That band is you. Gord sends a fruit basket anyway.'],
      lose: ['{rival} took the {venue} slot. The booker says they were "so organized". They sent their stage plot two months early.'] },
    festival: {
      win: ['You outplayed the headliners from the 2 p.m. slot. The festival crowd is still chanting your name at the beer tent. Gord leads the chant.'],
      lose: ['{rival} close the festival with fireworks and a veggie tray the size of a canoe. They thank "the 2 p.m. band" by name. Spelled right.'] },
    loonies: {
      win: ['You beat {rival} at the Loonies. They gave you a standing ovation. It was sincere. It was unbearable.'],
      lose: ['{rival} beat you at the Loonies and thanked you personally from the stage.'] },
    poach: { icon: '🍐', text: '{rival} want {name}. There is a fruit basket involved.',
      win: ['{name} stays. Gord replies within four minutes: "Totally understand, buddy! Door is always open!"'],
      lose: ['{name} joins {rival}. There is a welcome cake. You were not invited, but they saved you a slice.'] },
    final: {
      win: ['You headline the Sad Dome. {rival} open for you, and Gord introduces you himself: "Ladies and gentlemen, my buddies." The roof shakes. Forever starts now.'],
      lose: ['{rival} headline the Sad Dome. You open. Gord introduces you himself, with a slideshow. Forever is a long time.'] }
  };
  var TW_CARDS = [
    { id: 'rv_poach_tundra_wraith', type: 'drama', speaker: 'wraith_frontman', title: 'A Fruit Basket for {recruit}', once: false,
      text: "A fruit basket arrives addressed to {recruit}, not the band. The card: 'Buddy! We have an opening. Dental, vision, " +
        "a very reasonable tour schedule. No pressure! — Gord.' {recruit} is holding a pear and looking at you.",
      choices: [
        { label: 'Match it: a loyalty bonus', hint: 'Cash from the band fund',
          effects: { fund: -150, mood: { recruit: 16 } },
          outcome: "You hand {recruit} an envelope and a very sincere speech. {recruit} sends Gord a polite no. Gord replies in four minutes: 'Totally understand, buddy! Door's always open!'" },
        { label: 'Promise {recruit} the spotlight', hint: 'A song of their own, their name on the poster',
          effects: { mood: { recruit: 14 }, chemistry: -2, burnout: 4 },
          outcome: "New posters, {recruit}'s name in bigger letters, a song built around them. {recruit} eats the pear and stays." },
        { label: "Call Gord's bluff", hint: 'Gamble: they might go',
          roll: { chance: 0.5, stat: 'chemistry', statScale: 0.01,
            success: { effects: { mood: { recruit: 6 }, buzz: 2 }, outcome: '{recruit} stays. Out of spite, mostly. The pears were soft anyway.' },
            fail: { effects: { member: { id: 'recruit', act: 'poach' } },
              outcome: '{recruit} takes the job. The welcome photo: corpse paint, cardigans, a cake. You got tagged. Politely.' } },
          outcome: '' }
      ] },
    { id: 'rv_crack_breakup_tundra_wraith', type: 'scene', speaker: 'wraith_frontman', title: 'Tundra Wraith Break Up', once: true,
      text: "A press release, perfectly formatted: Tundra Wraith are 'taking an indefinite hiatus to focus on tax season and our families'. " +
        "Gord calls you personally. He's crying. 'You beat us fair and square, buddy. Every time. We ran the numbers.'",
      choices: [
        { label: 'Send them a fruit basket', hint: 'Kill them with kindness back',
          effects: { fund: -60, buzz: 6, chemistry: 3 },
          outcome: "You send a basket with a note: 'Proud of you, buddies.' Gord frames the card. The scene calls it the classiest breakup in Prairie metal." },
        { label: 'Take a victory lap', hint: 'Buzz now, karma later',
          effects: { buzz: 12, fans: 40, mood: { all: -3 } },
          outcome: "You post a photo of their press release with a crown emoji. It goes everywhere. Gord likes it. Then shares it. 'So deserved, buddy!'" }
      ] },
    { id: 'rv_crack_rebrand_tundra_wraith', type: 'scene', speaker: 'wraith_frontman', title: 'An Awkward Rebrand', once: true,
      text: "Tundra Wraith have a new name: {rival}. New logo, new website, same four accountants, same minivan. Gord explains the " +
        "rebrand in a forty-slide deck. Slide 31 is about you.",
      choices: [
        { label: 'Congratulate them, sincerely', hint: 'They mean well',
          effects: { chemistry: 3, buzz: 3 },
          outcome: "You send a card. Gord replies with a thirty-slide thank-you deck. Slide 12: 'Our buddies in {band}.' There's a photo of your van." },
        { label: 'Keep calling them Tundra Wraith', hint: 'Petty, and fun',
          effects: { buzz: 8, mood: { all: 2 } },
          outcome: "You call them Tundra Wraith in every interview. Gord laughs every time. It doesn't bother him. That bothers you." }
      ] },
    { id: 'rv_crack_opener_tundra_wraith', type: 'scene', speaker: 'wraith_frontman', title: 'Can We Open for You, Buddy?', once: true,
      text: "Gord calls. 'Buddy. We ran the numbers. You're the bigger draw now. Could we... open for you sometime? We'll bring the veggie tray.' " +
        'Behind him, three accountants in corpse paint nod solemnly.',
      choices: [
        { label: "Sure. You're opening.", hint: 'Their fans become your fans',
          effects: { buzz: 6, fans: 30, chemistry: 2 },
          outcome: "Gord whoops. Sheila labels your setlist. Darryl offers to do your taxes. Lorne already sent a stage plot. It's perfect. It's terrifying." },
        { label: 'Make them earn it', hint: 'A little payback',
          effects: { buzz: 10, mood: { all: 2 }, chemistry: -1 },
          outcome: "You tell them to send a demo. They send a demo, a press kit, a letter of reference and a fruit basket. By courier. That afternoon." }
      ] },
    { id: 'rv_final_eve_tundra_wraith', type: 'scene', speaker: 'wraith_frontman', title: 'Sad Dome Eve', once: true,
      text: "This weekend: the Sad Dome, Calgary. {rival} and {band}, one night, one headliner. Gord texts: 'Break a leg, buddy! " +
        "Not literally. We brought a first-aid kit just in case.'",
      choices: [
        { label: 'Rehearse until your hands bleed', hint: 'Sharper, more tired',
          effects: { chemistry: 4, burnout: 8, drumSkill: 1 },
          outcome: 'You rehearse the set eleven times. Kenji nods once. That means you are ready.' },
        { label: 'Send Gord a fruit basket first', hint: 'Out-nice the nice guy',
          effects: { fund: -80, buzz: 8, mood: { all: 3 } },
          outcome: 'You beat them to the fruit basket for the first time in ten years. Gord calls, audibly shaken. "Buddy. BUDDY."' }
      ] }
  ];

  GG.content.rivalry = {
    cast: {
      tundra_wraith: {
        id: 'tundra_wraith', frontman: 'tw_gord', label: 'monolith',
        minivan: 'a beige 2011 Dodge Grand Caravan with a Winnipeg Jets bumper sticker and a tidy first-aid kit',
        vehicle: 'a beige 2011 Dodge Grand Caravan with a Winnipeg Jets bumper sticker and a tidy first-aid kit',
        members: [
          { id: 'tw_gord', name: 'Gord', fullName: 'Gord Penner', nick: 'Grimnir', role: 'vocals', lane: 'front',
            dayJob: 'Chartered accountant (Transcona branch)',
            bio: 'Screams about eternal winter for forty minutes, then asks if everyone got home safe. Brings a veggie tray to every show. Calls you buddy.',
            gags: ['Drives a minivan with a Winnipeg Jets bumper sticker. Parks it perfectly.',
              'The veggie tray has ranch AND hummus. He asks about allergies.',
              'Sends a fruit basket for every occasion, including your losses.',
              'Wins every award you are up for and thanks you personally.'],
            look: look('#eeece6', '#0c0c0e', 'long', '#7a6a4e', '#26262c', 1.08, 1.0, [], 'flannel'), corpsePaint: true, stageShirt: '#101014' },
          { id: 'tw_sheila', name: 'Sheila', fullName: 'Sheila Wiebe', nick: 'Hexenfrost', role: 'guitar', lane: 'left',
            dayJob: 'Payroll manager',
            bio: 'Every pedal on her board is labelled with a label maker. Apologizes to her amp after the loud songs. Knits toques between sets.',
            gags: ['Labels everything. Everything. Your van has labels now.',
              'Knitted the whole crowd matching toques at the Folk Hall. Two hundred of them.'],
            look: look('#eeede8', '#0c0c0e', 'bun', '#5a6e4e', '#222228', 0.96, 0.95, [], 'jacket'), corpsePaint: true, stageShirt: '#0e0e12' },
          { id: 'tw_darryl', name: 'Darryl', fullName: 'Darryl Klassen', nick: 'Vorthul', role: 'bass', lane: 'right',
            dayJob: 'Tax preparer (busy season: February to April 30)',
            bio: 'Silent and terrifying in corpse paint. Off stage he will talk for an hour about RRSP contribution room. Hands out tax-tip pamphlets at the merch table.',
            gags: ['Does your taxes for free, unasked. Finds you a refund.',
              'Will not tour in April. Nobody argues.'],
            look: look('#efeee8', '#101012', 'bald', '#6e3a3a', '#26262c', 1.04, 1.15, ['beard'], 'flannel'), corpsePaint: true, stageShirt: '#121216' },
          { id: 'tw_lorne', name: 'Lorne', fullName: 'Lorne Dueck', nick: 'Frostgrave', role: 'drums', lane: 'back',
            dayJob: 'Forensic accountant',
            bio: 'Plays blast beats at exactly 240 bpm to a metronome app. Emails you a polite tempo report after every show. Drives a 2009 Corolla with 400,000 km on it.',
            gags: ['Audits your tempo. You were 3% fast in the bridge. He attached a chart.',
              'Nods at you, one metronome to another. Then files a report.'],
            look: look('#ecebe6', '#0c0c0e', 'long', '#4e5e70', '#222228', 1.0, 1.1, ['glasses'], 'jacket'), corpsePaint: true, stageShirt: '#0f0f13' }
        ],
        songs: ['Eternal Winter (Fiscal Year End)', 'Audit of the Frozen Throne', 'Plug In the Block Heater', 'Minus Forty (Both Scales)',
          'Receipts in the Snow', 'Deductible of Doom', 'Crying in the Parkade', 'The Wind Chill Speaks', 'Portage and Main at Midnight',
          'Frostbitten Ledger', 'Carry the One (Into Darkness)', 'Winterpeg Eternal', 'Snow Route Parking Ban', 'Quarterly Report from the Abyss'],
        albums: [
          { title: 'Eternal Winter, Fiscal Year End', kind: 'album' }, { title: 'Audit of the Frozen Throne', kind: 'album' },
          { title: 'Minus Forty (Both Scales)', kind: 'album' }, { title: 'Receipts from the Abyss', kind: 'album' },
          { title: 'Winterpeg Eternal', kind: 'album' }, { title: 'Carry the One (Into Darkness)', kind: 'album' },
          { title: 'Plug In the Block Heater of Doom', kind: 'album' }, { title: 'Snow Route Parking Ban', kind: 'album' },
          { title: 'The Long Dark Tax Season', kind: 'album' }, { title: 'Grimnir Sings the Classics (With Strings)', kind: 'album' },
          { title: 'Frostbitten Ledger II: Amortization', kind: 'album' }, { title: 'A Very Wraith Christmas', kind: 'album' }
        ],
        rebrands: ['Tundra Wraith & Associates', 'Tundra Wraith LLP', 'Wraith (Formerly Tundra)', 'The Tundra Wraith Experience',
          'Permafrost Chartered Professional Metal'],
        // v0.9: Tundra Wraith's voice, moved out of the flat pools and the UI
        news: TW_NEWS,
        showdowns: TW_SHOWDOWNS,
        cards: TW_CARDS,
        banter: {
          open: ['Gord: "Good evening, {city}! Please note the fire exits. Now: ETERNAL WINTER."', 'Gord: "Hello {city}! We are {rival}. Hydrate, buddies."'],
          mid: ['Gord: "Give it up for {band}, eh? Real good kids."', 'Sheila apologizes to her amp for the last song.', 'Darryl hands the front row tax-tip pamphlets.',
            'Lorne checks the metronome app. 3% fast. Unacceptable.', 'Gord: "This one is about the wind chill. Dress in layers."'],
          final: ['Gord: "Calgary! We brought a veggie tray for all nineteen thousand of you."']
        },
        ui: {
          heatLabels: ['Polite', 'Frosty', 'Heated', 'Boiling (politely)', 'Blood feud, with fruit baskets'],
          vehicleLine: 'Gord drives a beige 2011 Dodge Grand Caravan with a Winnipeg Jets bumper sticker and a tidy first-aid kit.',
          emptyNews: 'Nothing yet. Gord is drafting a press release about how excited he is to meet you.',
          emptyAlbums: 'No records yet. They are "finalizing the liner-note footnotes".',
          pass: 'You sit this one out. {rival} send a card: "Next time, buddy!"',
          finalWin: 'The Sad Dome is yours. Gord already sent a fruit basket the size of a Zamboni.',
          finalLose: 'Gord hugs you in the loading bay. "You were great, buddy. Really." He means it. That is the worst part.',
          solo: 'Sheila "Hexenfrost" Wiebe: a solo. She apologizes to her amp after.',
          finish: '{rival} finish. Gord thanks the sound tech by name. Your turn.',
          crack: { breakup: ['They broke up.', 'An indefinite hiatus "to focus on tax season". Gord called you personally. He was crying.'],
            rebrand: ['They rebranded.', 'Same four accountants, same minivan, new name: {rival}. There is a forty-slide deck.'],
            opener: ['They want to open for you.', 'Gord ran the numbers: you are the bigger draw. They will bring the veggie tray.'] }
        },
        carpet: { intro: 'Tundra Wraith, in full corpse paint, hold the door for a seat-filler.', wave: 'polite', count: 4 },
        defector: { line: 'Now in {rival}: corpse paint, a cardigan and a very reasonable dental plan. They tag you in every photo.', look: 'corpse' },
        comments: [
          'So proud of you guys. Genuinely. We remember playing rooms that size! 🤘',
          'Love this!! Great hustle. Come see how it\'s done Saturday (kidding!!) (not kidding)',
          'Supportive comment! Keep going! We are rooting for you from the big stage.',
          'Honestly inspiring. Our intern showed us. We had to ask who you were. Love that for you.',
          'Great energy. A few notes: louder, tighter, more like us. But great energy!',
          'Can\'t wait to see where you guys end up. Probably opening for us! 😊'
        ],
        commentsExclusive: [
          'Subscribed at the Drumstick tier to support you guys! Every bit helps, right? 🤘',
          'Members-only content, wow! We had members-only content once. Now we have a building.'
        ]
      }
      // v0.9: mall_rats, chartbusters and buckle_and_boot come from the band packs (zz_band_*.js): K.rivalry.cast[rid] = {..}
    },

    // ---- News (the rival's career, heat, the scene): the NEUTRAL fallback (cast[rid].news wins). Seeded by the sim. ----
    news: {
      filler: [
        '{rival} posted a behind-the-scenes video. It is mostly a whiteboard. It has more views than your last gig.',
        '{rival} were spotted buying snacks in bulk. Nobody knows what for. Everyone is worried.',
        "{rival} did a radio interview and called {band} 'a band to watch'. Nobody knows if it was a compliment.",
        "{rival} released a music video shot in a parking lot at minus forty. Nobody's fingers work in it.",
        '{rival} sold out a club back home. The merch table sold out first.',
        '{rival} got a glowing review in a local zine. The review mentions their shoes twice.',
        '{rival} played a benefit show and raised a lot of money. It is very hard to be mad at them this week.',
        "{rival}'s singer changed a flat on the Trans-Canada and waved at every car. Somebody filmed it. It is everywhere."
      ],
      local: ['{rival} are the talk of their scene. Two hundred and fifty fans and counting.'],
      signed: ['{rival} signed a record deal. They posted the contract signing like it was a wedding.',
        '{rival} sign a record deal and send you a gift basket about it. The card says: "Your turn soon!"'],
      album: ["{rival} release '{album}'. It debuts at #{pos} on the Maple 100. They mail you a signed copy.",
        "{rival}'s new record '{album}' enters the Maple 100 at #{pos}. They call it 'basically a tie' with you."],
      albumNoChart: ["{rival} self-release '{album}'. They hand-numbered every copy. Yours is #1. Of course it is."],
      fans: ['{rival} passed {fans} fans. They posted a thank-you video. It is very long.'],
      youPassed: ['You have more fans than {rival} now. They sent a congratulations cake. The icing seems sincere. Mostly.'],
      theyPassed: ['{rival} have more fans than you again. They did not mention it. They mentioned it everywhere else.'],
      heatUp: ["The scene is calling it a feud now. {rival} call it 'friendly competition'.",
        "A zine ran a cover: '{band} vs {rival}'. Both bands bought fifty copies."],
      heatDown: ['Things are quiet with {rival}. Too quiet.'],
      forfeit: ["You skipped the Battle of the Bands. {rival} won by default and played two encores 'in your honour'."],
      sameNightQuiet: ["{rival} played {venue} on Saturday to a full room. You had the night off. They sent a photo of the crowd. 'Wish you were here!'"],
      festivalMissed: ["{rival} headlined {venue}. They thanked 'our pals who couldn't make it'. The crowd cheered for you. Politely."],
      opener: ['{rival} opened for you, as promised. They brought about {n} of their fans.',
        "{rival} opened the show and told the crowd to 'stick around for the real deal'. Most of them did."],
      poached: ['{name} is in {rival} now. The welcome photo is everywhere. You got tagged.'],
      loonies: ['{rival} won {n} Loonie(s) this year. They thanked you by name from the stage. You were not there. You were not nominated.'],
      crack_breakup: ["{rival} break up. The press release thanks '{band}, who beat us fair and square'. There is a slideshow."],
      crack_rebrand: ['The band you knew are now {rival}. Same people, same van, new name. The press release has a font.'],
      crack_opener: ["{rival} have asked to open for you. The email subject line: 'A proposal (no pressure)'. It has a budget attached."],
      finalSoon: ['The Sad Dome in Calgary wants a co-bill in week {n}: {band} and {rival}. One headlines. One opens. Forever.'],
      reunion: ['{rival} reunite for one night only at the Sad Dome. Everybody took the day off.']
    },

    // ---- Showdowns: the UI's announcement card + verdict lines (neutral; cast[rid].showdowns merge over these) ----
    showdowns: {
      botb: { title: 'Battle of the Bands!', icon: '⚔️',
        text: "Battle of the Bands at {venue}, {city}, this Saturday. {rival} are in. Winner takes {prize} and a chunk of the loser's fans. You watch their set first.",
        enter: 'Enter the battle', pass: 'Sit this one out',
        win: ['The crowd picks you. {rival} shake your hand on stage. You take {prize} and a few of their fans.',
          'You win the Battle. {rival} lead the applause. It looks sincere. It might be.'],
        lose: ['The crowd picks {rival}. They dedicate the encore "to our friends in {band}". Some of your fans stay for it.',
          '{rival} win the Battle. They donate the prize to the food bank and post about it. Twice.'] },
      sameNight: { title: 'Same night, same town', icon: '🌃',
        text: '{rival} are playing {venue} this Saturday too. The crowd will split: whoever has the buzz gets the room.',
        win: ['Most of the scene picked your show. {rival} texted a photo of their half-empty room: "Great turnout! Proud of you!"'],
        lose: ['Half your crowd went to see {rival}. They sent a thank-you note for "sharing the night".'] },
      stolenSlot: { title: 'Slot stolen', icon: '📌',
        text: '{rival} booked {venue} out from under you this weekend. They left a thank-you card on the corkboard.',
        win: ['{venue} turned {rival} down: "We have a band for that night." That band is you.'],
        lose: ['{rival} took the {venue} slot. The booker says they were "so organized". They sent their stage plot two months early.'] },
      festival: { title: 'Festival clash', icon: '🎪',
        text: "{venue}: {rival} headline, you're on at 2 p.m. Outplay them from the lower slot and the whole festival will talk about it.",
        win: ['You outplayed the headliners from the 2 p.m. slot. The festival crowd is still chanting your name at the beer tent.'],
        lose: ['{rival} close the festival with fireworks. They thank "the 2 p.m. band" by name. Spelled right.'] },
      loonies: { title: 'The Loonies', icon: '🏆',
        text: "{rival} are nominated against you. Of course they are.",
        win: ['You beat {rival} at the Loonies. They gave you a standing ovation. It was sincere. It was unbearable.'],
        lose: ['{rival} beat you at the Loonies and thanked you personally from the stage.'] },
      poach: { title: 'The poach', icon: '🤝',
        text: '{rival} want {name}. There is an offer involved.',
        win: ['{name} stays. {rival} reply within four minutes: "Totally understand! Door is always open!"'],
        lose: ['{name} joins {rival}. There is a welcome cake. You were not invited.'] },
      final: { title: 'The Sad Dome', icon: '🏟️',
        text: "The Sad Dome, Calgary. A co-bill: {band} and {rival}. One set each, and the crowd decides who headlines and who opens. Forever.",
        win: ['You headline the Sad Dome. {rival} open for you and introduce you themselves. The roof shakes. Forever starts now.'],
        lose: ['{rival} headline the Sad Dome. You open. They introduce you with a slideshow. Forever is a long time.'] }
    },

    // ---- Rival Monday cards: the NEUTRAL base cards (speaker 'rival_frontman' = the current rival's frontman). A rival's
    //      own versions ('<id>_<rivalId>', in cast[rid].cards) win through career.variant. ----
    cards: [
      { id: 'rv_poach', type: 'drama', speaker: 'rival_frontman', title: 'An Offer for {recruit}', once: false,
        text: "An envelope arrives addressed to {recruit}, not the band. Inside: an offer from {rival}. More money, a bigger stage, " +
          "'a very reasonable tour schedule'. {recruit} is holding the letter and looking at you.",
        choices: [
          { label: 'Match it: a loyalty bonus', hint: 'Cash from the band fund',
            effects: { fund: -150, mood: { recruit: 16 } },
            outcome: 'You hand {recruit} an envelope of your own and a very sincere speech. {recruit} sends {rival} a polite no.' },
          { label: 'Promise {recruit} the spotlight', hint: 'A song of their own, their name on the poster',
            effects: { mood: { recruit: 14 }, chemistry: -2, burnout: 4 },
            outcome: "New posters, {recruit}'s name in bigger letters, a song built around them. {recruit} stays." },
          { label: 'Call their bluff', hint: 'Gamble: they might go',
            roll: { chance: 0.5, stat: 'chemistry', statScale: 0.01,
              success: { effects: { mood: { recruit: 6 }, buzz: 2 }, outcome: '{recruit} stays. Out of spite, mostly.' },
              fail: { effects: { member: { id: 'recruit', act: 'poach' } },
                outcome: '{recruit} takes the offer. The welcome photo is everywhere. You got tagged.' } },
            outcome: '' }
        ] },
      { id: 'rv_crack_breakup', type: 'scene', speaker: 'rival_frontman', title: '{rival} Break Up', once: true,
        text: "A press release, perfectly formatted: {rival} are 'taking an indefinite break to focus on other projects'. Their singer " +
          "calls you personally. 'You beat us fair and square. Every time. We checked.'",
        choices: [
          { label: 'Send them a gift basket', hint: 'Kill them with kindness',
            effects: { fund: -60, buzz: 6, chemistry: 3 },
            outcome: "You send a basket with a note: 'Proud of you.' They frame the card. The scene calls it the classiest breakup of the year." },
          { label: 'Take a victory lap', hint: 'Buzz now, karma later',
            effects: { buzz: 12, fans: 40, mood: { all: -3 } },
            outcome: 'You post their press release with a crown emoji. It goes everywhere. They like it. Then share it.' }
        ] },
      { id: 'rv_crack_rebrand', type: 'scene', speaker: 'rival_frontman', title: 'An Awkward Rebrand', once: true,
        text: 'The band you knew have a new name: {rival}. New logo, new website, same people, same van. The announcement is a ' +
          'forty-slide deck. Slide 31 is about you.',
        choices: [
          { label: 'Congratulate them, sincerely', hint: 'They mean well. Probably.',
            effects: { chemistry: 3, buzz: 3 },
            outcome: "You send a card. They reply with a thank-you deck. Slide 12: 'Our friends in {band}.' There's a photo of your van." },
          { label: 'Keep using the old name', hint: 'Petty, and fun',
            effects: { buzz: 8, mood: { all: 2 } },
            outcome: "You use the old name in every interview. They laugh every time. It doesn't bother them. That bothers you." }
        ] },
      { id: 'rv_crack_opener', type: 'scene', speaker: 'rival_frontman', title: 'Can We Open for You?', once: true,
        text: "{rival}'s singer calls. 'So. We ran the numbers. You're the bigger draw now. Could we... open for you sometime?' " +
          'In the background, the rest of the band nod solemnly.',
        choices: [
          { label: "Sure. You're opening.", hint: 'Their fans become your fans',
            effects: { buzz: 6, fans: 30, chemistry: 2 },
            outcome: "They whoop. They send a stage plot the same afternoon. It's perfect. It's terrifying." },
          { label: 'Make them earn it', hint: 'A little payback',
            effects: { buzz: 10, mood: { all: 2 }, chemistry: -1 },
            outcome: 'You tell them to send a demo. They send a demo, a press kit and a gift basket. By courier. That afternoon.' }
        ] },
      { id: 'rv_final_eve', type: 'scene', speaker: 'rival_frontman', title: 'Sad Dome Eve', once: true,
        text: "This weekend: the Sad Dome, Calgary. {rival} and {band}, one night, one headliner. {rival} text: 'Break a leg! " +
          "Not literally. We brought a first-aid kit just in case.'",
        choices: [
          { label: 'Rehearse until your hands bleed', hint: 'Sharper, more tired',
            effects: { chemistry: 4, burnout: 8, drumSkill: 1 },
            outcome: 'You rehearse the set eleven times. Nobody talks. That means you are ready.' },
          { label: 'Send them a gift basket first', hint: 'Out-nice them',
            effects: { fund: -80, buzz: 8, mood: { all: 3 } },
            outcome: 'You beat them to the gift basket for the first time ever. They call, audibly shaken.' }
        ] }
    ],

    // ---- The scene (leaderboard filler). fans(week) grows from base to peak over `rise` years, then fades. ----
    // v0.9: rivalId = a rival's own row (skipped in the career whose rival it is), bandId = a playable band's cameo row
    // (owner Q8; skipped in its own career). Alberta and south-west Saskatchewan get their own locals.
    scene: [
      { id: 'snowplows', name: 'The Snowplows', city: 'Regina', genre: 'punk', base: 90, peak: 2600, rise: 3, fade: 0.5 },
      { id: 'maple_syrup_riot', name: 'Maple Syrup Riot', city: 'Saskatoon', genre: 'punk', base: 60, peak: 5200, rise: 4, fade: 0.3 },
      { id: 'kettle_chips', name: 'Kayla & the Kettle Chips', city: 'Moose Jaw', genre: 'country', base: 140, peak: 9000, rise: 5, fade: 0.2 },
      { id: 'dj_poutine', name: 'DJ Poutine', city: 'Saskatoon', genre: 'rock', base: 200, peak: 14000, rise: 3, fade: 0.7 },
      { id: 'grain_elevator_gods', name: 'Grain Elevator Gods', city: 'Yorkton', genre: 'metal', base: 40, peak: 3800, rise: 6, fade: 0.1 },
      { id: 'pothole_prophets', name: 'The Pothole Prophets', city: 'Prince Albert', genre: 'rock', base: 70, peak: 1900, rise: 2, fade: 0.6 },
      { id: 'canola_coven', name: 'Canola Coven', city: 'North Battleford', genre: 'metal', base: 30, peak: 7200, rise: 7, fade: 0 },
      { id: 'the_gophers', name: 'Gopher Apocalypse', city: 'Swift Current', genre: 'metal', base: 25, peak: 1200, rise: 4, fade: 0.4 },
      { id: 'prairie_oysters', name: 'The Prairie Oysters Tribute Act', city: 'Regina', genre: 'country', base: 300, peak: 4200, rise: 2, fade: 0.5 },
      { id: 'mall_rats_scene', name: 'Mall Rats', city: 'Toronto', genre: 'punk', base: 3000, peak: 60000, rise: 6, fade: 0, rivalId: 'mall_rats' },
      { id: 'chartbusters_scene', name: 'Chartbusters', city: 'Vancouver', genre: 'rock', base: 20000, peak: 90000, rise: 8, fade: 0, rivalId: 'chartbusters' },
      { id: 'buckle_boot_scene', name: 'Buckle & Boot', city: 'Red Deer', genre: 'country', base: 8000, peak: 70000, rise: 5, fade: 0.1, rivalId: 'buckle_and_boot' },
      { id: 'hoarfrost', name: 'Hoarfrost Hymnal', city: 'Winnipeg', genre: 'metal', base: 50, peak: 2400, rise: 5, fade: 0.2 },
      { id: 'block_heaters', name: 'The Block Heaters', city: 'Martensville', genre: 'rock', base: 20, peak: 900, rise: 3, fade: 0.3 },
      // v0.9: Tundra Wraith as a scene band for everyone else (skipped in Hail Damage's career, where they are the rival)
      { id: 'tundra_wraith_scene', name: 'Tundra Wraith', city: 'Winnipeg', genre: 'metal', base: 40, peak: 3500, rise: 6, fade: 0.1, rivalId: 'tundra_wraith' },
      // v0.9 (owner Q8): the other playable bands, as cameos in each other's scene
      { id: 'hail_damage_scene', name: 'Hail Damage', city: 'Saskatoon', genre: 'metal', base: 30, peak: 6500, rise: 6, fade: 0.1, bandId: 'hail_damage' },
      { id: 'frost_heave_scene', name: 'Frost Heave', city: 'Regina', genre: 'punk', base: 30, peak: 4800, rise: 5, fade: 0.2, bandId: 'frost_heave' },
      { id: 'gravel_kings_scene', name: 'Gravel Kings', city: 'Edmonton', genre: 'rock', base: 40, peak: 5500, rise: 6, fade: 0.1, bandId: 'gravel_kings' },
      { id: 'grid_road_ramblers_scene', name: 'The Grid Road Ramblers', city: 'Swift Current', genre: 'country', base: 35, peak: 5200, rise: 6, fade: 0.1, bandId: 'grid_road_ramblers' },
      // v0.9: Alberta + south-west Saskatchewan locals
      { id: 'pumpjacks', name: 'The Pumpjacks', city: 'Edmonton', genre: 'rock', base: 80, peak: 3200, rise: 4, fade: 0.3 },
      { id: 'chinook_arch_angels', name: 'Chinook Arch Angels', city: 'Calgary', genre: 'country', base: 120, peak: 5600, rise: 4, fade: 0.2 },
      { id: 'coulee_crows', name: 'The Coulee Crows', city: 'Lethbridge', genre: 'punk', base: 40, peak: 1600, rise: 3, fade: 0.5 },
      { id: 'deerfoot_rush', name: 'Deerfoot Rush Hour', city: 'Red Deer', genre: 'metal', base: 30, peak: 2100, rise: 5, fade: 0.3 },
      { id: 'cypress_hills_drifters', name: 'The Cypress Hills Drifters', city: 'Maple Creek', genre: 'country', base: 60, peak: 2800, rise: 4, fade: 0.3 },
      { id: 'gull_lake_gulls', name: 'Gull Lake Gulls', city: 'Gull Lake', genre: 'punk', base: 20, peak: 700, rise: 2, fade: 0.6 }
    ],

    // ---- Rivalry venues: festival grounds (summer) + the Sad Dome (the year-10 final). v0.9: per-genre fit. ----
    venues: [
      { id: 'gopherfest', name: 'Gopherfest', city: 'Saskatoon', region: 'canada', tier: 2, kind: 'club', festival: true,
        capacity: 900, minFans: 0, walkIns: 260, setSize: 3, deal: 'flat', pay: 250, deals: ['flat'], payRange: { flat: [200, 350] },
        genreFit: fit(1, 0.9, 0.9, 0.6), slot: '2 p.m., the Beer Garden Stage', quirk: 'A field, a beer tent, a mini-donut truck and a stage made of hay bales.',
        catch: '{rival} headline. You are on at 2 p.m.' },
      { id: 'queen_city_mosh', name: 'Queen City Mosh-Fest', city: 'Regina', region: 'canada', tier: 2, kind: 'club', festival: true,
        capacity: 1200, minFans: 0, walkIns: 320, setSize: 3, deal: 'flat', pay: 300, deals: ['flat'], payRange: { flat: [250, 400] },
        genreFit: fit(1, 1, 0.7, 0.3), slot: '3 p.m., the Grain Bin Stage', quirk: 'In the Exhibition parking lot. The main stage is a flatbed trailer.',
        catch: '{rival} close the night. You go on while people are still parking.' },
      { id: 'mess_creek', name: 'Mess Creek Summer Solstice', city: 'Prince Albert', region: 'canada', tier: 2, kind: 'club', festival: true,
        capacity: 700, minFans: 0, walkIns: 200, setSize: 3, deal: 'flat', pay: 220, deals: ['flat'], payRange: { flat: [180, 300] },
        genreFit: fit(1, 0.8, 1, 0.8), slot: '1 p.m., the Mosquito Stage', quirk: 'Out in the bush past Prince Albert. Bring bug spray. Bring more bug spray.',
        catch: '{rival} headline the main stage. You have the lunch slot.' },
      // v0.9: an Edmonton rock fest, an all-ages punk fest and a rodeo-and-fair stage
      { id: 'big_river_rock', name: 'Big River Rock Fest', city: 'Edmonton', region: 'canada', tier: 2, kind: 'club', festival: true,
        capacity: 1500, minFans: 0, walkIns: 380, setSize: 3, deal: 'flat', pay: 300, deals: ['flat'], payRange: { flat: [250, 400] },
        genreFit: fit(0.6, 0.6, 1, 0.5), slot: '2 p.m., the Refinery Stage', quirk: 'On the river flats. Air-guitar contest between sets. The judges are merciless.',
        catch: '{rival} headline under the fireworks. You play while the fries are still frozen.' },
      { id: 'tunnel_vision_fest', name: 'Tunnel Vision All-Ages Fest', city: 'Moose Jaw', region: 'canada', tier: 2, kind: 'skatepark', festival: true, outdoor: true,
        capacity: 800, minFans: 0, walkIns: 260, setSize: 3, deal: 'flat', pay: 200, deals: ['flat'], payRange: { flat: [160, 260] },
        genreFit: fit(0.6, 1, 0.7, 0.3), slot: '1 p.m., the Half-Pipe Stage', quirk: 'All ages, no bar, a skate contest and a zine library in a school bus.',
        catch: '{rival} close the night. You go on during the skate contest finals.' },
      { id: 'cypress_rodeo_fair', name: 'Cypress Hills Rodeo & Fair', city: 'Maple Creek', region: 'canada', tier: 2, kind: 'legion', festival: true, outdoor: true,
        capacity: 1000, minFans: 0, walkIns: 300, setSize: 3, deal: 'flat', pay: 260, deals: ['flat'], payRange: { flat: [220, 340] },
        genreFit: fit(0.3, 0.4, 0.7, 1), slot: '3 p.m., the Grandstand Stage', quirk: 'Chuckwagons, a midway and a stage between the bull pens. The bulls have seats.',
        catch: '{rival} headline after the bull riding. You play between the barrel racers.' },
      { id: 'sad_dome', name: 'The Sad Dome', city: 'Calgary', region: 'canada', tier: 3, kind: 'club', dome: true, km: 620,
        capacity: 19000, minFans: 0, walkIns: 4000, setSize: 3, deal: 'flat', pay: 2500, deals: ['flat'], payRange: { flat: [2500, 2500] },
        genreFit: fit(1, 1, 1, 1), slot: 'Co-bill', quirk: 'A hockey arena shaped like a saddle that has given up. The biggest room on the prairies.',
        catch: 'One band headlines. One opens. The crowd decides.' }
    ]
  };
})(window.GG);
