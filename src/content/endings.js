// content/endings.js (v1.0 "Glory", Lane E; plan/plan_contract_1.0.md §4.1–4.4): how a career ends. Pure data; the sim is
// 2f_sim_legacy.js (GG.legacy), the screen 5n_ui_ending.js. Shapes (02_contracts.js V1.0 GLORY):
//   legacy    : the Legacy score tunables (seven parts, 0–1000; §4.1). Each part: max + its own scale.
//   tiers     : [{ id (C.ENDING_TIERS), name, min, line, lineLostFinal?, lineZero?, nameZero?, unlock?, byBand?: { <bandId>:
//               { line?, lineLostFinal?, lineZero? } } }]  best first; the Legacy score alone picks the tier (owner Q3).
//               lineLostFinal = the rival headlined the Sad Dome (the text changes, never the tier); lineZero / nameZero =
//               no album released ("Zero-Album Wonders").
//   specials  : [{ id (C.SPECIAL_ENDINGS), name, nameBySize?: { 4|5: name }, band?: [bandId], test: { kind, … }, line,
//               lineByCount?: { 0..4: line } (strangers in the final lineup), unlock?: { emblem | palette } }]  stack on the tier.
//               test kinds: bigIn { region, share } · flag { flag, values? } · originals { kept } | { neverQuit } ·
//               rivalOriginals { min }.
//   epilogues : { <memberId>: [{ when: WHEN, text }] }  first match wins; else content.drama.members[id].epilogue (the shipped
//               line stays every original's default). WHEN = { flag?, values?, notValues?, minTier?, special?, status?,
//               inLineup?, minYearsIn?, seatRole? } (all given must hold; notValues needs the flag set).
//   recruits  : { byTrait: { <traitId>: [text] }, byQuirk: { <quirkId>: [text] }, any: [text] }  (recruits.js ids)
//   defectors : { any: [text], byRival: { <rivalId>: [text] } }  an original or recruit who now plays for the rival
//   player    : { drums: { <tierId>: text } }  the player's own card, keyed by seat (handoff E12; v1.1 adds bass / rhythm /
//               lead; a missing seat falls back to drums)
//   rival     : { you|rival|none: [text], byRival: { <rivalId>: { you?, rival?, none? } } }  the Sad Dome line on the end screen
//   bonus     : { milestone: { 2|3: [text] }, chat: { 2|3: [text] }, byBand: { <bandId>: { milestone?, chat? } } }  the
//               bonus-year grant (a wrap milestone line + one '@front' chat line, picked by a hash of the career id)
//   bonusCards: [ CARD ]  Monday cards for bonus years 11–13 (gate era ['world'] + minYear 11 + band + genre). GG.legacy adds
//               them to the Monday deck once a career has bonus years (see 2f_sim_legacy.js: never in years 1–10, so no
//               existing pool changes order or weight and NO_BONUS careers replay exactly).
// Tokens: the career ones ({band} {city} {space} {rival} {rivalFront} {front} {soloist} {grumbler} {player} ...; C.TOKENS).
// Epilogue texts are narration (a silent member's card is never shown as a quote). No USA content, parody names only, no gong
// on the kit (the Global Gong award may be named), no share or screenshot talk. Every per-band line sits under its band.
(function (GG) {
  var HD = 'hail_damage', FH = 'frost_heave', GK = 'gravel_kings', GRR = 'grid_road_ramblers';
  var GENRE = { hail_damage: 'metal', frost_heave: 'punk', gravel_kings: 'rock', grid_road_ramblers: 'country' };

  // A bonus-year Monday card: World era, year 11 on, one band (its genre too, so Hail Damage's stay metal).
  function bc(band, n, type, speaker, title, text, choices) {
    return { id: 'bonus_' + band + '_' + n, type: type, speaker: speaker, title: title, text: text,
      gate: { era: ['world'], genre: [GENRE[band]], band: [band], minYear: 11 }, choices: choices };
  }
  function ch(label, hint, effects, outcome) { return { label: label, hint: hint, effects: effects, outcome: outcome }; }

  GG.content.endings = {
    legacy: {
      fans: { max: 250, full: 80000, pow: 0.6 },
      units: { max: 200, full: 600000, pow: 0.5 },
      awards: { max: 150, loonie: 8, gong: 20, cert: 4, greyMug: 10 },
      venue: { max: 100, floor: 15, full: 19000 },
      regions: { per: 25, max: 100 },
      unity: { max: 100, chem: 0.5, kept: 0.5 },
      final: { you: 100, rival: 40, none: 0 }
    },

    tiers: [
      { id: 'arena_legends', name: 'Arena Legends', min: 800, unlock: { palette: 'arena_gold' },
        line: 'The Sad Dome. A world tour. A statue of {band} in {city}. The pigeons have opinions.',
        lineLostFinal: 'A world tour and a statue in {city}, with one asterisk: {rival} headlined the Sad Dome. The statue faces the other way, out of spite.',
        byBand: {
          hail_damage: { line: 'The Sad Dome. A world tour. A bronze statue in {city}: four of you, one cape and one bassist who is somehow not in the photo. The pigeons have opinions about the cape.' },
          frost_heave: { line: 'The Sad Dome. A world tour. A statue in {city} cast from melted-down laundromat quarters. City council voted on it twice. It passed by one vote.' },
          gravel_kings: { line: 'The Sad Dome. A world tour. A chrome statue in {city} with real hair. The statue has a hairspray budget. It is a line item.' },
          grid_road_ramblers: { line: 'The Sad Dome. A world tour. A statue in {city} wearing a real hat. Somebody steals the hat every fall. A new one appears by Sunday.' }
        } },
      { id: 'canadian_institution', name: 'Canadian Institution', min: 600, unlock: { palette: 'hockey_night' },
        line: 'Your one song plays at every hockey game, forever. Between periods. Every period.',
        lineLostFinal: 'Your one song plays at every hockey game, forever. {rival} got the Sad Dome; you got the third period. You got the better deal.',
        byBand: {
          frost_heave: { line: 'Your one song plays at every curling bonspiel in the country, forever. Between ends. Every end. The skips hum it while sweeping.' },
          gravel_kings: { line: 'Your one song plays on classic-rock radio every hour, forever, right after the traffic and right before the other one.' },
          grid_road_ramblers: { line: 'Your one song plays at every rodeo, fall fair and 4-H auction in the country, forever. Between events. Every event.' }
        } },
      { id: 'cult_heroes', name: 'Cult Heroes', min: 400, unlock: { palette: 'cult_velvet' },
        line: 'A small, terrifyingly loyal fanbase. Reunion tours for life. Somebody has your setlists tattooed on their back, in order.',
        lineLostFinal: 'A small, terrifyingly loyal fanbase who never forgave {rival} for the Sad Dome. Reunion tours for life. They boo the other band on principle.',
        byBand: {
          hail_damage: { line: 'A small, terrifyingly loyal fanbase who learned French to understand the lyrics. They did not understand the lyrics. Reunion tours for life.' },
          frost_heave: { line: 'A small, terrifyingly loyal fanbase who photocopy your old flyers and staple them to city hall. Reunion tours for life, two chords at a time.' },
          gravel_kings: { line: 'A small, terrifyingly loyal fanbase in leather pants, at any temperature. Reunion tours for life. It is always 1985 at the merch table.' },
          grid_road_ramblers: { line: 'A small, terrifyingly loyal fanbase who drive six hours in a truck to every show. Reunion tours for life, and a potluck after.' }
        } },
      { id: 'one_album_wonders', name: 'One-Album Wonders', min: 200, unlock: { palette: 'one_hit_teal' },
        line: 'One album. People still ask about it at gas stations.',
        nameZero: 'Zero-Album Wonders',
        lineZero: 'Zero albums. People still ask about that one show at the legion hall. Nobody can prove it happened. Everybody says they were there.' },
      { id: 'still_in_the_garage', name: 'Still in the Garage', min: 0, unlock: { palette: 'garage_grey' },
        line: 'Your mom wants to park the car in {space} again.',
        byBand: {
          hail_damage: { line: 'Your mom wants to park the car in {space} again. She has already moved the drum riser onto the lawn. Marcel is negotiating with the lawn.' },
          frost_heave: { line: 'The laundromat wants {space} back for overflow dryers. Your mom agrees with the laundromat. Your mom wants to park the car down there anyway.' },
          gravel_kings: { line: 'The landlord wants {space} back for a vape shop. Your mom signed the petition. For the vape shop. She wants to park the car there.' },
          grid_road_ramblers: { line: 'Your mom wants to park the car in {space} again. So does the combine. The combine has seniority. The band moves to the porch.' }
        } }
    ],

    specials: [
      { id: 'big_in_japan', name: 'Big in Japan', test: { kind: 'bigIn', region: 'japan', share: 0.2 }, unlock: { emblem: 'lantern' },
        line: '{band} are enormous in Japan. A Tokyo cafe serves a parfait in your honour. Back home your cousin still thinks you sell insurance.' },
      { id: 'moose_opera', name: 'Moose Opera', band: [HD], test: { kind: 'flag', flag: 'mooseOpera', values: ['platinum'] }, unlock: { emblem: 'globe_record' },
        line: "Marcel's moose concept album goes platinum in Finland. He is knighted by a reindeer co-op. He accepts in French, at length, in a cape." },
      { id: 'big_in_berlin', name: 'Big in Berlin', band: [FH], test: { kind: 'flag', flag: 'squatAnthemPayoff' }, unlock: { emblem: 'globe_record' },
        line: "A Berlin squat still sings Rox's council song at closing time, every night. Two chords, wrong words, eight hundred people. Moth's van has a parking spot there, permanently." },
      { id: 'mudstonbury_legends', name: 'Mudstonbury Legends', band: [GK], test: { kind: 'flag', flag: 'mudHeadlinePayoff' }, unlock: { emblem: 'globe_record' },
        line: "{band} headlined Mudstonbury in leather pants. The mud never fully left Chase's boots. He calls it a souvenir. Tamara calls it a health hazard." },
      { id: 'outback_legends', name: 'Outback Legends', band: [GRR], test: { kind: 'flag', flag: 'outbackPayoff' }, unlock: { emblem: 'globe_record' },
        line: "A cattle station in the Outback plays the truck song at every muster. The road trains honk the chorus. Travis Lee keeps the station's hat on his dashboard." },
      { id: 'band_of_strangers', name: 'Band of Strangers', test: { kind: 'originals', kept: 0 }, unlock: { emblem: 'price_tag' },
        line: 'Not one original left. {band} is now you and some strangers from Kijiji.',
        lineByCount: {
          0: 'Not one original left. {band} is now you, a drum kit and a Kijiji ad that never expired.',
          1: 'Not one original left. {band} is now you and one stranger from Kijiji. You still split the gas money.',
          2: 'Not one original left. {band} is now you and two strangers from Kijiji. Nobody knows the old songs. The crowd sings them anyway.',
          3: 'Not one original left. {band} is now you and three strangers from Kijiji. The listing said "band, gently used". It was accurate.',
          4: 'Not one original left. {band} is now you and four strangers from Kijiji. The reunion will need name tags.'
        } },
      { id: 'original_lineup', name: 'The Original Lineup', nameBySize: { 4: 'The Original Four', 5: 'The Original Five' },
        test: { kind: 'originals', neverQuit: true }, unlock: { emblem: 'handshake' },
        line: 'Nobody ever quit. The same people who started in {space} played the last show. Statistically impossible. Emotionally, also.' },
      { id: 'side_project', name: 'Side Project', test: { kind: 'rivalOriginals', min: 2 }, unlock: { palette: 'rival_red' },
        line: '{rival} absorbed your band. Two of your originals play in their lineup now. You are, technically, their side project.' }
    ],

    // The shipped epilogue (content.drama.members[id].epilogue) stays each original's default; these are state-keyed variants.
    epilogues: {
      // Hail Damage (A14)
      marcel: [
        { when: { flag: 'cape', notValues: ['none'] }, text: 'Marcel opens a cape shop in Gravelbourg: Capes Abyssus. Velvet, curtain or fireproof, hand-hemmed, each one sold with a free French lesson nobody asked for.' },
        { when: { special: 'moose_opera' }, text: 'Marcel spends every winter in Finland, where the Moose Opera is taught in schools. He mows a Finnish lawn to stay in practice.' }
      ],
      dana: [
        { when: { inLineup: true, minTier: 'cult_heroes' }, text: "Dana's solo finally ends. It started at the first gig and stopped at the last one. The crowd gives it a standing ovation. Some of them were there for the start." },
        { when: { inLineup: false }, text: "Dana's new band plays one song a night. It is the solo. Critics call it brave. Dana calls it warming up." }
      ],
      jaxon: [
        { when: { minTier: 'canadian_institution' }, text: "Jaxon's baba becomes the band's manager. Contracts are signed at her kitchen table, in pencil, over perogies. Nobody has ever won a negotiation with Baba." },
        { when: { flag: 'babaManager' }, text: 'Baba keeps managing the band long after the band stops. She books a reunion every Christmas Eve. Attendance is mandatory. Cabbage rolls are provided.' }
      ],
      kenji: [
        { when: { minTier: 'cult_heroes' }, text: 'Kenji is never heard from again. Every Christmas a new bass arrives at your door. No note, no return address. Just the bass, and a faint smell of polar bear.' }
      ],
      // Frost Heave (council)
      rox: [
        { when: { flag: 'council', values: ['won'] }, text: 'Rox serves four terms on Regina city council. Meetings open with a two-chord anthem. Pothole complaints are down. Heckling is up, mostly hers.' },
        { when: { flag: 'council', values: ['lost', 'tie', 'withdrew'] }, text: 'Rox runs for council every four years, forever, and loses by exactly one vote every time. She suspects Councillor Pomeroy. She is right.' }
      ],
      benny: [
        { when: { minTier: 'canadian_institution' }, text: 'A music conservatory invites Benny to teach. He walks in, plays two chords, and walks out. They give him tenure.' },
        { when: { inLineup: false }, text: 'Benny starts a solo project called Third Chord, out of spite. It has two chords. It always will.' }
      ],
      moth: [
        { when: { special: 'big_in_berlin' }, text: 'Moth drives the van to Berlin. Nobody knows how. It is parked outside the squat now, with a mailbox and a postal code in two countries.' },
        { when: { inLineup: false }, text: 'Moth leaves the band but not the van. Then the van leaves too. Every year you get a postcard of the van, parked somewhere nicer.' }
      ],
      // Gravel Kings (riff)
      chase: [
        { when: { flag: 'mudstonbury', values: ['headlined'] }, text: 'Chase never cleans the Mudstonbury mud off his leather pants. He calls them vintage. It is 1985 in his heart and permanently muddy in his closet.' },
        { when: { inLineup: false }, text: 'Chase goes solo in a cover band that only plays 1985. He calls it a solo career. The cover band calls it a lot of hairspray.' }
      ],
      lenny: [
        { when: { flag: 'riff', values: ['settled'] }, text: "Lenny pays off the riff settlement in instalments for eleven years. The last cheque is framed in the lawyers' lobby. He visits it." },
        { when: { flag: 'riff', values: ['scrapped'] }, text: 'Lenny never plays the scrapped riff again. Except at home, with the blinds closed, at full volume, every Sunday.' }
      ],
      tamara: [
        { when: { minTier: 'canadian_institution' }, text: 'Tamara does the band\'s taxes for the rest of her life, for free, for fun. The auditors send her a thank-you card. She files it.' },
        { when: { inLineup: false }, text: 'Tamara goes back to the clinic full-time. She still turns up backstage at other bands\' shows to hand out floss, uninvited.' }
      ],
      // The Grid Road Ramblers (truckStory)
      travis: [
        { when: { flag: 'truckStory', values: ['famous'] }, text: "Travis Lee's truck song is taught in schools. He finally learns to drive the '87, and stalls it once, on purpose, for the documentary." },
        { when: { flag: 'truckStory', values: ['ad'] }, text: "Travis Lee's truck song sells trucks for twenty years. Every time the ad runs he cries a little. The cheques help." }
      ],
      earl: [
        { when: { inLineup: true, minTier: 'cult_heroes' }, text: 'At the last show Earl tells the crowd about every session he ever played, song by song. The encore is the stories. Nobody leaves.' },
        { when: { inLineup: false }, text: 'Earl goes back to session work and tells every new band about you, song by song, during their song.' }
      ],
      clementine: [
        { when: { minTier: 'canadian_institution' }, text: 'The symphony invites Clementine back. She plays the Bach, then the hoedown. The symphony keeps both on the program.' },
        { when: { inLineup: false }, text: 'Clementine goes back to the symphony and plays the Bach perfectly. During the rests, the second violins swear they hear a yeehaw.' }
      ],
      duke: [
        { when: { flag: 'hatInsured' }, text: "Duke's hat is insured for more than the van. It tours museums on its own now. Duke goes along as its assistant." },
        { when: { inLineup: false }, text: 'Duke leaves the band but the hat stays a member in spirit. It still gets fan mail. Duke answers it in the hat\'s voice.' }
      ]
    },

    recruits: {
      byTrait: {
        reliable: ['Shows up to every reunion on time. Nobody else does. Sets up everyone\'s gear and leaves a polite note.',
          'Becomes a bus driver and is never late once in thirty years. Gets a plaque. Hangs it next to the band photo.'],
        road_warrior: ['Never stops touring. Joins any band with a van and a gig. Last seen somewhere past Medicine Hat, waving.',
          'Becomes a long-haul trucker and plays your songs on the CB radio at two in the morning.'],
        showboat: ['Starts a solo career with a light show bigger than the venue. The venue is a legion hall. The light show is very big.',
          'Writes a memoir about the band. Every chapter is about them. The chapter about you is one sentence. It is nice.'],
        studio_rat: ['Opens a recording studio in a grain bin. Bands drive in from three provinces for the reverb.',
          'Remixes your old songs every winter, unasked, and mails them to you on a memory stick shaped like a moose.'],
        hype_machine: ['Becomes the social media manager for a provincial park. Attendance doubles. The bears go viral.',
          'Still posts about the band every single day. The band has not played in years. Engagement is up.'],
        fast_learner: ['Learns six more instruments in a year, becomes a one-person band and opens for you at the reunion.',
          'Goes back to school, learns accounting in a month and does your taxes correctly. A band first.'],
        party_animal: ['Opens a bar in a strip mall. Your band photo hangs over the dartboard. Darts have been thrown.',
          'Retires from parties and takes up birdwatching. Throws very loud birdwatching parties.'],
        frugal: ['Retires early on the money saved by bringing sandwiches. Still brings sandwiches to the reunion.',
          'Buys a house with every per diem they never spent, turns the garage into a jam space and charges you nothing.'],
        local_legend: ['Stays a local legend and gets a bench in the park with a little plaque. Sits on it to sign autographs.',
          'Runs for mayor of their hometown, unopposed, on a platform of "remember that gig". Wins.']
      },
      byQuirk: {
        barefoot: ['Still plays barefoot, even at the reunion in January. Their feet have a fan club now.'],
        ferret: ['Retires to a hobby farm with Wayne Ferretsky, who outlives every vet\'s estimate and gets an obituary in the local paper.'],
        hockey: ['Becomes a beer-league hockey announcer and describes every goal as "a real power chord of a play".'],
        slow_cooker: ['Opens a chili stand outside the arena. The slow cooker from the van is on display. It still works.'],
        wraith_roadie: ['Finally tells everyone why they left the {rival} road crew. Nobody believes it. It involved a spreadsheet.'],
        famous_album: ['Tells everyone they played on your album too. They held a cable once. It was a very important cable.'],
        sasquatch: ['Moves to the mountains to look for the Sasquatch. Sends blurry photos every Christmas. One of them might be you.'],
        crokinole: ['Wins the provincial crokinole championship, thanks the band in the speech and flicks the trophy into the twenty hole.'],
        harvest: ['Goes back to the farm for good. Every fall they still text the band chat "harvest, back in november". The crop is great.'],
        toque: ['Never takes off the toque: not at the wedding, not at the reunion, not at their own retirement party. Same toque.'],
        horoscope: ['Becomes a professional astrologer. Every horoscope they write ends with a setlist.'],
        accordion: ['Joins a polka band. Finally, someone wanted the accordion. They are very happy. They are very loud.'],
        zine_maker: ['Publishes every zine as one 900-page book. The library has a copy. It is always checked out.'],
        safety_pins: ['Opens a tailor shop that uses only safety pins. The wedding dresses are surprisingly popular.'],
        transit: ['Becomes a city bus driver. Your song comes on the radio once. They stop the bus and turn it up.'],
        straight_edge: ['Opens a milk bar. It is the most aggressive milk bar in the country. The milkshakes are incredible.'],
        air_guitar: ['Wins the world air-guitar championship in Finland, brings the trophy to the reunion and plays it.'],
        hairspray: ['Signs a hairspray sponsorship. The hair now has its own manager and a separate rider.'],
        classic_rock_trivia: ['Wins a quiz show on classic-rock B-sides, spends the prize on B-sides and tells you about each one.'],
        lucky_bandana: ['Finally washes the lucky bandana. Nothing bad happens. They are devastated anyway.'],
        rodeo_clown: ['Goes back to the rodeo and plays your songs to calm the bulls. It works on the bulls. Not on the crowd.'],
        square_dance_caller: ['Calls the square dance at every wedding in the county and slips your song titles into the calls.'],
        truck_named: ['The truck retires before they do. They give it a eulogy. The whole band comes. It was in the band, technically.'],
        yodel: ['Yodels the anthem at a hockey game, goes viral and now yodels at everything. No regrets.']
      },
      any: [
        'Goes back to a regular job. Keeps the band shirt and wears it to the office every Friday.',
        'Joins three other bands, quits all of them, and tells everyone yours was the best one. Means it.',
        'Teaches music to kids in a church basement. Every kid learns your song first.',
        'Moves to the coast for the weather. Calls every winter to ask if it is cold. It is.'
      ]
    },

    defectors: {
      any: ['Now plays for {rival}. Has to wear their stage outfit. Sends you an apologetic photo from every tour.',
        'Now plays for {rival}. Says the money is better. Says the songs are worse. Says it quietly.',
        'Now plays for {rival} and waves at you from the other stage at every festival. It is awkward for everyone.'],
      byRival: {
        tundra_wraith: ['Now plays for {rival}, in corpse paint, between three polite accountants. Files a tempo report after every show. Has started to enjoy it.',
          'Now plays for {rival}. {rivalFront} brings a veggie tray to every rehearsal. They hate how much they love it.'],
        mall_rats: ['Now plays for {rival}. The stylist has changed their hair four times this month. The sponsor wants a kickflip. There is no kickflip.',
          'Now plays for {rival}, in an outfit chosen by a focus group. The focus group was right. That is the worst part.'],
        chartbusters: ['Now plays for {rival}: the same power ballad every night, in a scarf, in July. The royalties are excellent.',
          'Now plays for {rival}, where every drummer is named Steve. They are not the drummer. They are still called Steve.'],
        buckle_and_boot: ['Now plays for {rival}, in rhinestones, next to a truck mascot. The truck gets more applause.',
          'Now plays for {rival}. Their sponsor gave them a free truck. It has the band logo on the hood. They cannot drive stick.']
      }
    },

    player: {
      drums: {
        arena_legends: 'You hang up your sticks after the last arena show. Your hands keep drumming on every steering wheel and kitchen table in {city}. Your dentist has asked you to stop doing it in the chair.',
        canadian_institution: 'You open a drum school in {city}. Every student wants to learn the fill from the song. You charge extra for the fill. It is worth it.',
        cult_heroes: 'You play every reunion show. The same three hundred people come every time. They know your fills better than you do. They bring you soup.',
        one_album_wonders: 'You sell your kit, then buy it back the next week. It lives in {space} under a tarp, waiting for the second album.',
        still_in_the_garage: 'You still drum in {space} on Tuesday nights. The neighbours stopped complaining years ago. They time their lawnmowers to you.'
      }
    },

    rival: {
      you: ['{band} headlined the Sad Dome. {rival} opened. Forever. {rivalFront} still sends a polite card every Christmas.'],
      rival: ['{rival} headlined the Sad Dome. You opened. Forever. {rivalFront} still sends a card every Christmas, which is worse.'],
      none: ['The Sad Dome never happened. {band} and {rival} keep circling each other at festivals, forever, like two cats on a fence.'],
      byRival: {
        tundra_wraith: { you: ['You headlined the Sad Dome. {rival} opened, then mailed a thank-you card and an itemized invoice for the veggie tray.'],
          rival: ['{rival} headlined the Sad Dome. {rivalFront} thanked you from the stage, by name, in a calm voice. It still haunts you.'] },
        mall_rats: { you: ['You headlined the Sad Dome. {rival} opened in your colours. Their sponsor called it a pivot.'],
          rival: ['{rival} headlined the Sad Dome with a kickflip. It did not land. The crowd forgave them. You did not.'] },
        chartbusters: { you: ['You headlined the Sad Dome. {rival} opened with the power ballad, played it again, and went home.'],
          rival: ['{rival} headlined the Sad Dome and played the power ballad four times. Their radio stations played it forty.'] },
        buckle_and_boot: { you: ['You headlined the Sad Dome. {rival} opened with the truck mascot. The truck stalled. You did not.'],
          rival: ['{rival} headlined the Sad Dome with fireworks shaped like trucks. You opened. The trucks got a standing ovation.'] }
      }
    },

    bonus: {
      milestone: {
        3: ['{band} reached the World stage by year five: three bonus years. The career now runs thirteen years.'],
        2: ['{band} reached the World stage by year six: two bonus years. The career now runs twelve years.']
      },
      chat: { 3: ['Three more years. The world is not done with us. We are not done with the world.'], 2: ['Two more years. We are not done yet. Not even close.'] },
      byBand: {
        hail_damage: { chat: { 3: ['Mes amis! Three more years. The lawn has been consulted. The lawn says: encore.'], 2: ['Two more years! The cape is not ready to retire. Neither is Lord Abyssus.'] } },
        frost_heave: { chat: { 3: ['three more years. council can wait. council can never wait but it will'], 2: ['two more years!! filing a motion to make it three'] } },
        gravel_kings: { chat: { 3: ['Three more years, babies. Rock never sleeps. It naps on the bus, then it rocks.'], 2: ['Two more years! It is still 1985 and the tour bus still has a tape deck.'] } },
        grid_road_ramblers: { chat: { 3: ["Three more years on the road. I'm writing a song about it. It's about a truck."], 2: ['Two more years. Two more fall fairs and one more broken heart. Mine, probably.'] } }
      }
    },

    bonusCards: [
      // Hail Damage
      bc(HD, 1, 'fame', '@front', 'The Farewell Tour (Again)',
        'A promoter wants to book a Farewell Tour. {front} points out that you are not breaking up. The promoter points out that farewell tours sell twice as many tickets. {soloist} is already planning a farewell solo.', [
          ch('Book the farewell tour', 'Fans ↑ · Burnout ↑', { fans: 300, buzz: 10, burnout: 12 }, 'You say goodbye in fourteen cities. Then you come home and rehearse on Tuesday like always. The fans are thrilled and confused.'),
          ch('Tell the truth: we are not done', 'Chemistry ↑ · Buzz ↓', { chemistry: 6, buzz: -4 }, 'The promoter sighs and books a "See You Later" tour instead. It sells half as well. Everyone sleeps better.')
        ]),
      bc(HD, 2, 'scene', '@soloist', 'The Documentary',
        'The Prairie Broadcasting Corp wants to film a documentary about {band}. The director keeps asking about the lawn. {front} is ready for his close-up. Nobody can find the bassist to sign the release form.', [
          ch('Let them film everything', 'Buzz ↑↑ · Chemistry ↓', { buzz: 16, chemistry: -4 }, 'The documentary airs at Christmas. The cape gets its own segment. The bassist appears in one frame, from behind, and it is the most-discussed frame.'),
          ch('Gigs only, no garage', 'Buzz ↑ · Mood ↑', { buzz: 8, mood: { all: 4 } }, 'The documentary is two hours of live footage and one shot of the garage door, closed. Critics call it "mysterious". {front} calls it a triumph.')
        ]),
      bc(HD, 3, 'weird', '@front', 'Reunion Rumours',
        'Somebody online says {band} broke up years ago and this is a tribute act. {front} is furious. {soloist} is mostly flattered that the tribute act is this good.', [
          ch('Post a photo from rehearsal', 'Buzz ↑', { buzz: 8 }, 'You post a photo from {space}. The comments decide it is a very convincing tribute act. You stop reading the comments.'),
          ch('Play a surprise show at home', 'Fans ↑ · Fund ↓', { fans: 150, fund: -600, mood: { all: 5 } }, 'You book the legion hall back home under a fake name. Four hundred people figure it out by noon. The tribute act rumour dies on the spot.')
        ]),
      bc(HD, 4, 'money', '@grumbler', 'The Lawn Endorsement',
        'A lawn-care company wants {band} for a commercial. Grass, but heavy. {grumbler} has opinions about their fertilizer. The fee is good. The jingle is in a major key.', [
          ch('Take it, in minor', 'Fund ↑ · Buzz ↓', { fund: 1000, buzz: -5 }, 'You rewrite the jingle in a minor key with a blast beat. The company loves it. Lawns across the prairies are mowed angrily.'),
          ch('A band does not sell the lawn', 'Mood ↑', { mood: { all: 6 }, chemistry: 3 }, 'You turn it down. {grumbler} gives a short speech about the sanctity of grass. It is not short.')
        ]),
      bc(HD, 5, 'drama', '@soloist', 'One Last Encore',
        'Bonus years are a gift, says {soloist}, so every show should end with a twenty-minute encore. {front} wants the encore in French. The venue wants everyone out by eleven.', [
          ch('Twenty minutes it is', 'Fans ↑ · Burnout ↑', { fans: 200, burnout: 10, mood: { '@soloist': 10 } }, 'The encore runs twenty-six minutes. The venue charges overtime. Nobody in the crowd goes home. Some of them miss the last bus on purpose.'),
          ch('Three songs and out', 'Burnout ↓ · Mood ↓', { burnout: -8, mood: { '@soloist': -6 } }, 'You play three songs and leave. {soloist} keeps playing alone in the parking lot. A small crowd gathers. It counts.')
        ]),
      // Frost Heave
      bc(FH, 1, 'fame', '@front', 'The Farewell Tour (Again)',
        'A promoter wants a Frost Heave Farewell Tour. {front} says punk bands do not do farewells, they just stop showing up. The promoter offers a bus. A real one, with a toilet.', [
          ch('Take the bus, say goodbye', 'Fans ↑ · Burnout ↑', { fans: 280, buzz: 10, burnout: 12 }, 'You say goodbye in twelve cities, then come home and play the basement on Friday. Nobody believes the farewell. Nobody wanted to.'),
          ch('No farewells. Ever.', 'Chemistry ↑ · Buzz ↓', { chemistry: 6, buzz: -4 }, 'You turn down the bus. {front} writes a song about it called "Farewell Is a Corporate Concept". It has two chords.')
        ]),
      bc(FH, 2, 'scene', '@grumbler', 'The Documentary',
        'A film crew wants to make a documentary about {band}. They want shots of {space}. The laundromat owner wants a location fee. {grumbler} wants the film to be exactly two chords long.', [
          ch('Film it in the basement', 'Buzz ↑↑ · Chemistry ↓', { buzz: 16, chemistry: -4 }, 'The documentary wins a prize at a film festival. The dryers are credited as a co-producer. The laundromat gets a line out the door.'),
          ch('Film the shows only', 'Buzz ↑ · Mood ↑', { buzz: 8, mood: { all: 4 } }, 'Ninety minutes of stage dives and one shot of a council agenda. Critics call it "urgent". {front} frames the review.')
        ]),
      bc(FH, 3, 'weird', '@front', 'Reunion Rumours',
        'A punk forum says {band} sold out and broke up and this is a tribute act sponsored by {rival}. {front} is livid. {grumbler} says the tribute act is better at the two chords.', [
          ch('Post a basement photo', 'Buzz ↑', { buzz: 8 }, 'You post a photo of the basement. The forum decides it is a staged set. You give up and go back to rehearsing.'),
          ch('Surprise show at home', 'Fans ↑ · Fund ↓', { fans: 150, fund: -500, mood: { all: 5 } }, 'You play a surprise show in {city}. The forum moderator is in the front row, crying, filming, and banning themselves.')
        ]),
      bc(FH, 4, 'money', '@grumbler', 'Two Chords, One Sponsor',
        'A guitar-string company wants to sponsor {band} with a two-string set "for the minimalist". {grumbler} is outraged and also flattered. The fee is real money.', [
          ch('Take the money', 'Fund ↑ · Buzz ↓', { fund: 900, buzz: -5 }, 'The two-string set sells out. Punk forums are furious. {grumbler} uses the money to buy more of the regular strings.'),
          ch('Punk is not for sale', 'Mood ↑', { mood: { all: 6 }, chemistry: 3 }, 'You turn it down with a strongly worded zine. The company prints the zine on their packaging anyway. Nobody wins.')
        ]),
      bc(FH, 5, 'drama', '@front', 'One More Motion',
        '{front} wants the bonus years to mean something: a benefit show for every pothole in the city. There are a lot of potholes. The van has opinions about every one.', [
          ch('Pothole benefit tour', 'Fans ↑ · Burnout ↑', { fans: 220, burnout: 10, mood: { '@front': 10 } }, 'You raise enough to fix nine potholes. The city fixes three and names one after you. You drive over it on purpose.'),
          ch('One big show instead', 'Buzz ↑ · Fund ↓', { buzz: 10, fund: -400 }, 'One loud show at city hall. The pothole fund grows. The bylaw officer dances, briefly, then writes you a ticket.')
        ]),
      // Gravel Kings
      bc(GK, 1, 'fame', '@front', 'The Farewell Tour (Again)',
        'A promoter wants a Gravel Kings Farewell Tour, "like the big bands do". {front} loves farewell tours. {front} has seen eleven of them. Three were by the same band.', [
          ch('Farewell tour, pyro included', 'Fans ↑ · Burnout ↑', { fans: 300, buzz: 10, burnout: 12 }, 'You say goodbye in fourteen cities with pyro. Then you rehearse in {space} on Tuesday. The nail salon next door asks if you left.'),
          ch('Rock never says goodbye', 'Chemistry ↑ · Buzz ↓', { chemistry: 6, buzz: -4 }, 'You turn it down. {front} says rock bands only retire when the hairspray runs out. The hairspray never runs out.')
        ]),
      bc(GK, 2, 'scene', '@soloist', 'The Documentary',
        'A film crew wants a rock documentary about {band}, the kind with dramatic narration and slow-motion hair. {soloist} asks if the lawyers will be in it. The lawyers ask the same thing.', [
          ch('Lawyers and all', 'Buzz ↑↑ · Chemistry ↓', { buzz: 16, chemistry: -4 }, 'The documentary is forty percent riff disputes. It is a hit. The lawyers get a fan club. They do not enjoy it.'),
          ch('Just the music', 'Buzz ↑ · Mood ↑', { buzz: 8, mood: { all: 4 } }, 'Ninety minutes of live footage and one shot of {front} doing his hair. Critics call the hair "the real star". He agrees.')
        ]),
      bc(GK, 3, 'weird', '@front', 'Reunion Rumours',
        'Classic-rock radio says {band} broke up in a fight over a riff and this is a tribute act. {front} is thrilled: it means they are classic rock now.', [
          ch('Correct the record', 'Buzz ↑', { buzz: 8 }, 'You call in to the station. The host thinks you are a very good impression. He plays the song anyway.'),
          ch('Surprise show at home', 'Fans ↑ · Fund ↓', { fans: 160, fund: -600, mood: { all: 5 } }, 'You play the strip mall parking lot in {city}. The vacuum repair guy runs the sound. It is the best mix you have ever had.')
        ]),
      bc(GK, 4, 'money', '@grumbler', 'The Hair Endorsement',
        'A hairspray company wants {front} for a commercial. Just the hair. The rest of the band can stand behind the hair. The fee is enormous. So is the hair.', [
          ch('The hair says yes', 'Fund ↑ · Buzz ↓', { fund: 1100, buzz: -5 }, 'The commercial runs during every hockey game. The hair gets fan mail. The band gets a cut. {front} gets a new can every week.'),
          ch('The hair belongs to rock', 'Mood ↑', { mood: { all: 6 }, chemistry: 3 }, 'You turn it down. {front} gives a speech about artistic integrity while doing his hair. It takes forty minutes.')
        ]),
      bc(GK, 5, 'drama', '@soloist', 'The Final Riff',
        '{soloist} has written one last riff for the bonus years. It sounds like nothing else. Everyone is suspicious. {front} has already called the lawyers, just in case.', [
          ch('Make it the closer', 'Fans ↑ · Burnout ↑', { fans: 200, burnout: 10, mood: { '@soloist': 10 } }, 'The new riff closes every show. Nobody sues. It is the strangest feeling the band has ever had.'),
          ch('Play the old hits', 'Burnout ↓ · Mood ↓', { burnout: -8, mood: { '@soloist': -6 } }, 'You stick to the hits. {soloist} plays the new riff in soundcheck every night. The crew learns it. The crew loves it.')
        ]),
      // The Grid Road Ramblers
      bc(GRR, 1, 'fame', '@front', 'The Farewell Tour (Again)',
        'A promoter wants a Grid Road Ramblers Farewell Tour, "fall fairs and rodeos, one last time". {front} cried at the word farewell. {grumbler} reminds everyone he has done four farewell tours with other bands.', [
          ch('One last time (again)', 'Fans ↑ · Burnout ↑', { fans: 280, buzz: 10, burnout: 12 }, 'You say goodbye at fourteen fall fairs. Then you are back in {space} on Tuesday. The 4-H kids are not surprised.'),
          ch('Country singers never retire', 'Chemistry ↑ · Buzz ↓', { chemistry: 6, buzz: -4 }, 'You turn it down. {front} writes a song about not retiring. It is about a truck that refuses to stop running.')
        ]),
      bc(GRR, 2, 'scene', '@grumbler', 'The Documentary',
        'A film crew wants to shoot a documentary about {band} in {space}. {grumbler} has stories for every frame. The director asks for a two-hour cut. Earl offers six.', [
          ch('Six hours of stories', 'Buzz ↑↑ · Chemistry ↓', { buzz: 16, chemistry: -4 }, 'The documentary runs as a twelve-part series. Episode nine is entirely about one session in 1979. It is the most-watched episode.'),
          ch('Just the shows', 'Buzz ↑ · Mood ↑', { buzz: 8, mood: { all: 4 } }, 'Ninety minutes of live footage and one long shot of a grain elevator at sunset. Critics call it "a poem". Your mom calls it "nice".')
        ]),
      bc(GRR, 3, 'weird', '@front', 'Reunion Rumours',
        'Country radio says {band} split up over a hat and this is a tribute act. {front} is heartbroken. The hat is unavailable for comment.', [
          ch('Call the station', 'Buzz ↑', { buzz: 8 }, 'You call in. The host asks if you can do the voice. You can. He plays the song twice to make sure.'),
          ch('Surprise show at home', 'Fans ↑ · Fund ↓', { fans: 150, fund: -500, mood: { all: 5 } }, 'You play the auction mart in {city}. Coffee row comes in a group. They have been waiting years to say "told you so".')
        ]),
      bc(GRR, 4, 'money', '@grumbler', 'The Seed Company',
        'A seed company wants {band} for a radio jingle about canola. {grumbler} has played on a canola jingle before, in 1983. He has notes.', [
          ch('Sing about canola', 'Fund ↑ · Buzz ↓', { fund: 900, buzz: -5 }, 'The jingle plays every morning on farm radio for a decade. Farmers hum it on combines. You are, briefly, agricultural.'),
          ch('Keep the songs about trucks', 'Mood ↑', { mood: { all: 6 }, chemistry: 3 }, 'You turn it down. {front} writes a canola song anyway, for free, about a truck driving past a canola field.')
        ]),
      bc(GRR, 5, 'drama', '@front', 'One Last Hoedown',
        '{front} wants every bonus-year show to end with a hoedown, the whole crowd included. The venues want everyone out by eleven. The fiddle wants everyone out never.', [
          ch('Hoedown every night', 'Fans ↑ · Burnout ↑', { fans: 200, burnout: 10, mood: { '@front': 10 } }, 'The hoedowns run long. A venue in Alberta gives up and stays open till two. Somebody proposes during the do-si-do.'),
          ch('Lights up at eleven', 'Burnout ↓ · Mood ↓', { burnout: -8, mood: { '@front': -6 } }, 'You end on time. The crowd hoedowns in the parking lot without you. It counts.')
        ])
    ]
  };
})(window.GG);
