// content/album_words.js: v0.5 album titles, covers and studio events (24_sim_labels.js + the studio/release screens).
//   GG.content.albumWords = {
//     titles: { <genre>: { forms: [text with {slot}], <slot>: [word], ..., fr?: [ { fr, en } ] } }
//       Generate: pick a form, replace each {slot} with rng.pick(pools[slot]). Slots are adj | noun | place.
//       metal.fr = ready-made French titles for Hail Damage (songs are titled in English since v0.7.2, but Marcel always
//       pitches one French album title; all secretly about the lawn).
//       Suggested 3 options: one fr title (metal) + two generated forms; the player may also type their own.
//     covers: { motifs: [ { id, name, desc, genres } ], palettes: [ { id, name, colors: [bg, fg, accent] (#rrggbb), genres } ],
//               fonts: [ { id, name, css (a system font stack, no downloads), weight, caps, genres } ] }
//   }
//   GG.content.studioEvents = [ CARD ]   one per studio week, Monday-card schema (type, speaker, title, text, choices).
//     Extra gate keys: studio: [studioId], producer: [producerId] (the session's; omitted = any session).
//     Extra effect key: production: ±n (points on the session's 0..100 production score).
//     Everything else uses the Monday-card gate/effect keys. Drawn by the session sim; not in the Monday pool.
// v0.9 "Genres": the Hail Damage events are gated band: ['hail_damage'] (their speakers and jokes are Hail Damage's); the
//   neutral set at the end (role-alias speakers / tokens) covers the same studios and producers for the other bands; packs
//   push their own band-gated events (Rox won't do take two, Lenny's riff, Earl's 1979 story, Duke's hat on the mic).
// Kenji never speaks. No USA content.
(function (GG) {
  var ALL = ['metal', 'punk', 'rock', 'country'];
  var HD = ['hail_damage'], OTHERS = ['frost_heave', 'gravel_kings', 'grid_road_ramblers'];   // v0.9 studio-event gates
  GG.content.albumWords = {
    titles: {
      metal: {
        forms: ['{adj} {noun}', 'The {noun} of {place}', '{noun} over {place}', 'Hymns from {place}', 'Beneath the {adj} {noun}',
          'Return to {place}', 'Where the {noun} Sleeps', 'Lord of the {noun}', 'The {adj} {noun}', 'Throne of {adj} {noun}'],
        adj: ['Eternal', 'Frozen', 'Burning', 'Endless', 'Unmown', 'Hollow', 'Crimson', 'Infernal', 'Silent', 'Forsaken', 'Howling',
          'Bitter', 'Ancient', 'Iron', 'Final', 'Black'],
        noun: ['Lawn', 'Hail', 'Winter', 'Harvest', 'Void', 'Sod', 'Moose', 'Blizzard', 'Tomb', 'Prairie', 'Thunder', 'Elevator',
          'Combine', 'Frost', 'Dandelion', 'Rake'],
        place: ['the North', 'the Grid Road', 'the Tundra', 'the Backyard', 'Highway 16', 'the Abyss', 'the Quarter Section',
          'the Slough', 'the Frozen Garage', 'Beyond the Fence'],
        fr: [
          { fr: 'Le Gazon Éternel', en: 'The Eternal Lawn' }, { fr: 'Grêle Noire', en: 'Black Hail' },
          { fr: 'Sous la Neige, le Gazon', en: 'Under the Snow, the Lawn' }, { fr: "L'Abîme du Jardin", en: 'The Abyss of the Garden' },
          { fr: "Tondeuse de l'Apocalypse", en: 'Lawnmower of the Apocalypse' }, { fr: 'La Dernière Pelouse', en: 'The Last Lawn' },
          { fr: 'Hiver sans Fin', en: 'Winter Without End' }, { fr: 'Le Trône de Gazon', en: 'The Throne of Sod' },
          { fr: 'Pissenlits de la Mort', en: 'Dandelions of Death' }, { fr: 'Les Cendres du Barbecue', en: 'Ashes of the Barbecue' },
          { fr: 'Arrosage Interdit', en: 'Watering Forbidden' }, { fr: 'Racines du Néant', en: 'Roots of the Void' },
          { fr: 'Le Râteau Sacré', en: 'The Sacred Rake' }, { fr: 'Engrais Infernal', en: 'Infernal Fertilizer' },
          { fr: 'La Clôture des Damnés', en: 'The Fence of the Damned' }, { fr: 'Gel Mortel', en: 'Killing Frost' }
        ]
      },
      punk: {
        forms: ['{noun} Is Dead', 'No {noun}', '{adj} {noun}', 'Kill the {noun}', 'Stuck in {place}', 'We Hate {place}', 'Too {adj} for {place}'],
        adj: ['Broke', 'Cheap', 'Frozen', 'Loud', 'Useless', 'Angry', 'Late', 'Used', 'Sick', 'Bored'],
        noun: ['Landlord', 'Parking Ticket', 'Bus Pass', 'Laundromat', 'Minimum Wage', 'Snowplow', 'Condo', 'Rent', 'Slush', 'Suburb'],
        place: ['Regina', 'the Suburbs', 'the Laundromat', 'the Food Court', 'Albert Street', 'the Bus Shelter', 'Grade Eleven']
      },
      rock: {
        forms: ['{adj} {noun}', '{noun} Highway', 'Nights on {place}', 'Born on {place}', 'Live from {place}', 'Long Way to {place}'],
        adj: ['Gravel', 'Diesel', 'Neon', 'Wild', 'Rusty', 'Electric', 'Midnight', 'Loaded', 'Northern', 'Last-Call'],
        noun: ['Thunder', 'Tailgate', 'Pipeline', 'Heart', 'Engine', 'Horizon', 'Heat', 'Riot', 'Shift', 'Radio'],
        place: ['the Yellowhead', 'Whyte Avenue', 'the Oil Patch', 'Highway 2', 'Fort McMurray', 'Unit 4B', 'the Strip']
      },
      country: {
        forms: ['{adj} {noun}', 'Songs from {place}', 'The {noun} Road', 'Back to {place}', '{noun} and Heartache', 'Out Past {place}'],
        adj: ['Dusty', 'Faded', 'Honest', 'Lonesome', 'Golden', 'Prairie', 'Long', 'Broken', 'Sunday', 'Harvest'],
        noun: ['Grain', 'Quonset', 'Tailgate', 'Barley', 'Tractor', 'Coffee Row', 'Fence Line', 'Wheat', 'Gravel', 'Dust'],
        place: ['the Quonset', 'Swift Current', 'the Grid Road', 'Coffee Row', 'the Auction Mart', 'Maple Creek', 'the Home Quarter']
      }
    },
    // v0.9: the Maple 100's filler rows (24_sim_labels chartView). Every genre's title pool above now carries a band's own
    // in-jokes (the packs add theirs), so the chart's other records draw from this neutral pool: no band places, people or spaces.
    chartFiller: {
      forms: ['{adj} {noun}', 'The {adj} {noun}', '{noun} Song', 'Love on {place}', 'Down by {place}', 'Another {adj} {noun}',
        'Your {adj} {noun}', 'Summer at {place}', '{noun} (Radio Edit)', 'Nothing but {noun}'],
      adj: ['Northern', 'Lonely', 'Electric', 'Midnight', 'Golden', 'Restless', 'Wild', 'Cold', 'Paper', 'Slow', 'Last', 'Rusty'],
      noun: ['Heart', 'Highway', 'Radio', 'Sky', 'Fire', 'River', 'Night', 'Dream', 'Rain', 'Window', 'Motel', 'Satellite', 'Postcard',
        'Canoe', 'Toboggan', 'Chinook', 'Thunder', 'Summer'],
      place: ['the Lake', 'the Coast', 'the Ferry', 'the North Shore', 'the Last Exit', 'the Cottage', 'the Ski Hill', 'the Dock']
    },
    covers: {
      motifs: [
        { id: 'skull', name: 'Skull', desc: 'A skull wearing a crown of dandelions', genres: ['metal', 'punk'] },
        { id: 'moose', name: 'Moose', desc: 'A moose in silhouette against an enormous moon', genres: ALL },
        { id: 'lawn', name: 'The Lawn', desc: 'One perfect square of lawn under a storm sky', genres: ['metal'] },
        { id: 'hail', name: 'Hailstorm', desc: 'Hailstones the size of golf balls falling like meteors', genres: ['metal', 'rock'] },
        { id: 'elevator', name: 'Grain Elevator', desc: 'A lone wooden grain elevator at dusk', genres: ALL },
        { id: 'cape', name: 'Empty Cape', desc: 'A flowing cape with nobody in it', genres: ['metal'] },
        { id: 'mower', name: 'Burning Mower', desc: 'A ride-on lawnmower on fire in a field', genres: ['metal', 'punk'] },
        { id: 'aurora', name: 'Northern Lights', desc: 'Green and pink aurora over a flat horizon', genres: ALL },
        { id: 'lightning', name: 'Lightning', desc: 'A lightning bolt splitting the prairie in two', genres: ['metal', 'rock'] },
        { id: 'crown', name: 'Wheat Crown', desc: 'A crown woven from wheat, on a black cushion', genres: ['metal', 'country'] },
        { id: 'highway', name: 'Two-Lane', desc: 'A two-lane highway running to a vanishing point', genres: ['rock', 'country'] },
        { id: 'van', name: 'The Van', desc: 'The band van at night, one headlight out', genres: ALL }
      ],
      palettes: [
        { id: 'blizzard', name: 'Blizzard', colors: ['#0d1b2a', '#e0e6ed', '#7fb3d5'], genres: ['metal', 'rock'] },
        { id: 'hellfire', name: 'Hellfire', colors: ['#140404', '#f2e8cf', '#d62828'], genres: ['metal', 'punk'] },
        { id: 'canola', name: 'Canola', colors: ['#1b3a1b', '#fff6c2', '#f4d03f'], genres: ['country', 'rock'] },
        { id: 'aurora', name: 'Aurora', colors: ['#081b1f', '#e8fff6', '#2ee6a6'], genres: ALL },
        { id: 'dusk', name: 'Prairie Dusk', colors: ['#2b1d3a', '#ffd6a5', '#ff7b54'], genres: ['rock', 'country'] },
        { id: 'frost', name: 'Hoarfrost', colors: ['#e9f1f7', '#1d2d44', '#5c7c99'], genres: ['metal', 'country'] },
        { id: 'bruise', name: 'Bruise', colors: ['#1a1423', '#e6d7ff', '#8e44ad'], genres: ['metal', 'punk'] },
        { id: 'rust', name: 'Rusty Quonset', colors: ['#2e1a12', '#f3e2c7', '#c1622f'], genres: ['country', 'rock'] },
        { id: 'photocopy', name: 'Photocopy', colors: ['#f4f1ea', '#111111', '#777777'], genres: ['punk', 'metal'] },
        { id: 'hailgrey', name: 'Hail Grey', colors: ['#23272e', '#f5f5f5', '#9aa5b1'], genres: ['metal'] }
      ],
      fonts: [
        { id: 'olde', name: 'Olde Metal', css: "'Old English Text MT', 'Luminari', Georgia, serif", weight: 700, caps: false, genres: ['metal'] },
        { id: 'poster', name: 'Poster Bold', css: "Impact, 'Arial Black', sans-serif", weight: 900, caps: true, genres: ['metal', 'punk', 'rock'] },
        { id: 'gatefold', name: 'Gatefold', css: "Georgia, 'Times New Roman', serif", weight: 400, caps: false, genres: ['rock', 'country'] },
        { id: 'zine', name: 'Zine', css: "'Courier New', Courier, monospace", weight: 700, caps: true, genres: ['punk', 'metal'] },
        { id: 'coffeerow', name: 'Coffee Row', css: "'Trebuchet MS', Verdana, sans-serif", weight: 700, caps: false, genres: ['country', 'rock'] },
        { id: 'highway', name: 'Highway Sign', css: "'Arial Narrow', 'Helvetica Neue', Arial, sans-serif", weight: 700, caps: true, genres: ALL }
      ]
    }
  };

  GG.content.studioEvents = [
    // ---- Mom's Basement -------------------------------------------------
    { id: 'studio_dryer', type: 'weird', speaker: 'mom', title: 'The Dryer', once: false, cooldown: 10, gate: { studio: ['moms_basement'], band: HD },
      text: "Mom is doing towels. The dryer is right behind the vocal mic and hums in E flat. Nothing on the record is in E flat. " +
        "'It's only a sixty-minute cycle, honey.' It's a ninety-minute cycle.",
      choices: [
        { label: 'Wait for the spin cycle', effects: { burnout: 4, production: 2 },
          outcome: 'Ninety minutes of crokinole. Then silence, beautiful silence, and Marcel nails the take. Then Mom starts the whites.' },
        { label: "Keep it. It's texture.", hint: 'Gamble: art, or a dryer on the record',
          outcome: 'You roll tape with the dryer running.',
          roll: { chance: 0.5,
            success: { effects: { production: 4, buzz: 3 }, outcome: 'Dana calls it "industrial drone". A zine later praises the "haunting low hum". It was towels.' },
            fail: { effects: { production: -4 }, outcome: 'On playback, you can hear a zipper hitting the drum every two seconds. It is in time. It is not good.' } } },
        { label: 'Hang the laundry outside', effects: { mood: { all: 3 }, chemistry: 3, production: 1 },
          outcome: 'It is minus twenty. The towels freeze solid on the line. Jaxon uses one as a baffle. It actually works.' }
      ] },
    { id: 'studio_pizza_pops', type: 'drama', speaker: 'mom', title: 'Pizza Pops', once: false, cooldown: 10, gate: { studio: ['moms_basement'], band: HD },
      text: "Mom comes down the stairs with a plate of pizza pops at the exact moment Marcel starts the quiet verse. Every time. " +
        "She has a sixth sense for the red light. She whispers 'Sorry!' at full volume.",
      choices: [
        { label: 'Take a snack break', effects: { mood: { all: 5 }, burnout: -4 },
          outcome: 'Everyone eats. Marcel burns the roof of his mouth and sings the next take with a lisp. It is somehow his best one.' },
        { label: 'A sign on the stairs', effects: { production: 3, mood: { marcel: 3 } },
          outcome: "'RECORDING: DO NOT ENTER'. Mom leaves the pizza pops on the top step like an offering to a strange god." },
        { label: 'Put Mom on the record', effects: { production: 1, chemistry: 4, chat: { who: 'mom', text: "I'm on the album! Track three! Tell Aunt Irene!" } },
          outcome: "Her 'Sorry!' stays on track three. It is the best-loved moment on the record. Fans shout it at gigs." }
      ] },
    { id: 'studio_furnace', type: 'weird', speaker: 'dad', title: 'The Furnace', once: false, cooldown: 12, gate: { studio: ['moms_basement'], band: HD },
      text: "The furnace kicks in every twenty minutes with a boom like a bass drum in a well. It is January. Dad will not turn it off. " +
        "'I'm not heating the whole street so your screaming guy can be quiet.'",
      choices: [
        { label: 'Record in parkas', effects: { burnout: 6, production: 3 },
          outcome: 'Everyone in toques and snow pants. Dana solos in mittens. Kenji looks exactly the same as always, which is unnerving.' },
        { label: 'Time the takes', effects: { drumSkill: 1, production: 2 },
          outcome: 'You learn the furnace rhythm by heart and drop every take into the gaps. The whole album is exactly nineteen minutes a song.' },
        { label: 'Pay for a space heater', effects: { fund: -60, production: 1, mood: { all: 3 } },
          outcome: '$60 at the hardware store. It hums in B flat. The dryer is in E flat. Now it is a chord.' }
      ] },

    // ---- Strip Mall Sound ------------------------------------------------
    { id: 'studio_walt_rent', type: 'money', speaker: 'dana', title: 'Walt the Landlord', once: false, cooldown: 10, gate: { studio: ['strip_mall_sound'], band: HD },
      text: "Walt, the engineer, stops the session mid-chorus. He also owns the strip mall, and the vacuum repair guy is late on rent. " +
        "He comes back an hour later, hears the bridge, and says he may need to 'revisit' your rate.",
      choices: [
        { label: 'Pay the new rate', effects: { fund: -100, production: 3 },
          outcome: 'Walt is happy. Happy Walt is a great engineer. He puts a real compressor on the kick. You can feel it in your teeth.' },
        { label: 'Offer him a credit', effects: { production: 1, buzz: 2, mood: { dana: -3 } },
          outcome: "'Engineered by Walt, landlord.' He wants his whole title in the liner notes. And the strip mall's name. And its phone number." },
        { label: 'Fix the vacuum guy\'s sign', effects: { chemistry: 4, burnout: 3, production: 2 },
          outcome: "The band repaints the vacuum shop's sign. Walt's tenant pays up. Walt knocks $50 off. Everyone wins, especially the vacuum guy." }
      ] },
    { id: 'studio_nail_salon', type: 'scene', speaker: 'jaxon', title: 'The Nail Salon', once: false, cooldown: 10, gate: { studio: ['strip_mall_sound'], band: HD },
      text: "The nail salon next door plays soft rock all day and it bleeds through the wall into every quiet take. The acetone " +
        "fumes are making Jaxon giggle. The ladies have asked, politely, if you know any power ballads.",
      choices: [
        { label: 'Play them a ballad', effects: { fans: 20, mood: { jaxon: 5 }, production: -1 },
          outcome: "You play the slow one through the wall. Applause from the salon. One lady books a manicure for Marcel. He accepts." },
        { label: 'Record at night', effects: { burnout: 6, production: 4 },
          outcome: 'Midnight to six, when the salon is dark. Clean takes, bad moods. Marcel sings the saddest vocal of his life. It is perfect.' },
        { label: 'Blast through it', hint: 'Gamble: it covers it, or it doesn\'t',
          outcome: "Walt pushes every fader up.",
          roll: { chance: 0.5,
            success: { effects: { production: 3, buzz: 2 }, outcome: "Nothing gets through that wall now. The salon's soft rock sounds like a whisper. The salon sounds like a hostage." },
            fail: { effects: { production: -3, fund: -40 }, outcome: 'The salon ladies complain to the landlord. The landlord is Walt. Walt fines himself and then you. $40.' } } }
      ] },

    // ---- Grain Silo Studios ----------------------------------------------
    { id: 'studio_silo_echo', type: 'weird', speaker: 'dana', title: 'Nine Seconds of Snare', once: false, cooldown: 10, gate: { studio: ['grain_silo'], band: HD },
      text: 'In the old elevator a snare hit rings for nine seconds. A cough lasts eleven. Kenji plays one low note, puts his bass down ' +
        'and leaves for lunch. On Tuesday it is still faintly ringing.',
      choices: [
        { label: 'Use the room. All of it.', effects: { production: 5, burnout: 3 },
          outcome: 'Your drums sound like a thunderstorm in a cathedral. Deci-Hell will call it "THE SOUND OF THE HARVEST GODS".' },
        { label: 'Hang moving blankets', effects: { production: 2, fund: -80 },
          outcome: '$80 of blankets from Cousin Dale. The echo comes down to three seconds. Dana misses the other six.' },
        { label: 'Record the ringing note', effects: { production: 3, mood: { kenji: 6 } },
          outcome: "Kenji's note opens the album. Forty seconds, one note, nothing else. He hears the playback and nods, once." }
      ] },
    { id: 'studio_silo_pigeons', type: 'weird', speaker: 'marcel', title: 'The Pigeons', once: false, cooldown: 12, gate: { studio: ['grain_silo'], band: HD },
      text: 'Forty pigeons live in the top of the elevator. When you play, they coo. In time. Marcel is convinced they are a choir sent to ' +
        "him. Dana is convinced they are going to land on her pedalboard.",
      choices: [
        { label: 'Mic the pigeons', effects: { production: 2, buzz: 4 },
          outcome: "'Featuring the Rosthern Pigeon Choir.' Pitchspork will call it the most daring choice of the year. It was Tuesday." },
        { label: 'Shoo them out', effects: { burnout: 5, production: 3 },
          outcome: 'Two hours with a broom. The pigeons leave and come back in a different order. Marcel says they have changed key.' },
        { label: 'Cover the gear', effects: { fund: -40, production: 1, mood: { dana: 5 } },
          outcome: "Tarps over everything. Dana's pedalboard survives. Your hi-hat does not. $40 and a lot of wet wipes." }
      ] },
    { id: 'studio_silo_harvest', type: 'scene', speaker: 'jaxon', title: 'Harvest Traffic', once: false, cooldown: 12, gate: { studio: ['grain_silo'], band: HD },
      text: "A farmer still uses the other half of the elevator. Right in the middle of the ballad, a grain truck backs up to the pit, " +
        "beeping, and unloads twelve tonnes of wheat with a noise like the end of the world.",
      choices: [
        { label: 'Keep rolling', hint: 'Gamble: a happy accident, or a ruined take',
          outcome: 'Nobody stops playing.',
          roll: { chance: 0.5,
            success: { effects: { production: 5, buzz: 3 }, outcome: 'The wheat roar lands on the last chorus like an avalanche. It stays. It becomes the most famous bit on the record.' },
            fail: { effects: { production: -3, burnout: 4 }, outcome: "The backup beeper is in a different tempo. The take is ruined. So is Jaxon's concentration, for the rest of the day." } } },
        { label: 'Help him unload', effects: { chemistry: 5, burnout: 5, production: 1 },
          outcome: 'The band shovels wheat for an hour. The farmer brings a thermos of coffee and stays to hear the ballad. He cries a little.' },
        { label: 'Schedule around him', effects: { production: 2, mood: { all: -3 } },
          outcome: 'You record between loads. The whole album now has a strict harvest schedule. Marcel keeps a grain-truck calendar.' }
      ] },

    // ---- Producers -------------------------------------------------------
    { id: 'studio_cabin_bear', type: 'weird', speaker: 'marcel', title: 'Gerald', once: false, cooldown: 10, gate: { producer: ['solveig_birch'], band: HD },
      text: "Solveig's cabin near Waskesiu. Vocals day. There is a black bear on the porch eating the catering. Solveig says his name is " +
        "Gerald, that he loves low end, and that nobody should make eye contact, especially Marcel, because of the eyeliner.",
      choices: [
        { label: 'Record through the window', effects: { production: 4, burnout: 4 },
          outcome: 'Marcel sings the whole ballad to Gerald through the glass. Gerald listens, then lies down. Solveig says it is a rave review.' },
        { label: 'Wait inside, quietly', effects: { burnout: -4, chemistry: 4 },
          outcome: 'Three hours of cards by candlelight. Gerald leaves with a whole tray of sandwiches. Kenji is the only one who looked him in the eye.' },
        { label: 'Play the loud one for him', hint: 'Gamble: bears are critics too',
          outcome: 'Dana plugs in and turns to face the porch.',
          roll: { chance: 0.5,
            success: { effects: { production: 5, buzz: 5 }, outcome: 'Gerald stands on his hind legs for the breakdown, then ambles off into the woods. The best vibe check of your career.' },
            fail: { effects: { fund: -150, burnout: 6 }, outcome: "Gerald takes it personally. He leaves with the cooler, a mic stand and Jaxon's lunch. $150 in gear." } } }
      ] },
    { id: 'studio_cabin_generator', type: 'money', speaker: 'dana', title: 'The Generator', once: false, cooldown: 10, gate: { producer: ['solveig_birch'], band: HD },
      text: "The cabin's generator coughs and dies halfway through Dana's solo. The nearest gas is forty minutes away. Solveig lights " +
        "a lantern and says the woods are telling you to play acoustic.",
      choices: [
        { label: 'Play it acoustic', effects: { production: 3, mood: { dana: -4 }, chemistry: 4 },
          outcome: "Unplugged, by lantern light. The acoustic take goes on the record as a hidden track. Dana calls it 'a violation'. She loves it." },
        { label: 'Drive for gas', effects: { fund: -60, burnout: 4, production: 1 },
          outcome: 'Eighty minutes round trip in the dark, past a lot of eyes in the ditch. The solo resumes at 1 a.m. It is still going at 2.' },
        { label: 'Call it a night', effects: { burnout: -5, mood: { all: 3 } },
          outcome: 'Everyone sleeps on the cabin floor. At dawn Solveig records the lake. She adds it to every song. It works, somehow.' }
      ] },
    { id: 'studio_redline', type: 'drama', speaker: 'dana', title: 'Everything Louder', once: false, cooldown: 10, gate: { producer: ['dwayne_redline'], band: HD },
      text: 'Dwayne has pushed every meter into the red, including the ones that are not plugged in. He wants "more". Dana\'s amp is ' +
        "smoking gently. You can hear the album from the parking lot, with the doors shut.",
      choices: [
        { label: 'More. Give Dwayne more.', effects: { production: 4, burnout: 5, buzz: 3 },
          outcome: 'The master is so loud it clips on phones. Deci-Hell will love it. Your mom will play it at a quarter volume and still wince.' },
        { label: 'Ask for dynamics', effects: { production: 2, mood: { dana: 4 } },
          outcome: "Dwayne looks at you like you asked him to whisper. He leaves one quiet part in. It is still louder than most records." },
        { label: 'Save the amp', effects: { fund: -120, mood: { dana: 6 }, production: 1 },
          outcome: "$120 in new tubes. Dana names the amp Gwendolyn the Second. Dwayne holds a moment's silence, which for him is very loud." }
      ] },
    { id: 'studio_pitch_fix', type: 'drama', speaker: 'marcel', title: 'The Playback', once: false, cooldown: 12, gate: { producer: ['quiet_pierre'], band: HD },
      text: "Pierre plays back Marcel's vocal. Marcel closes his eyes. 'I have never sounded so like myself.' Pierre, who spent six hours " +
        'quietly fixing every note, says nothing. Dana opens her mouth. Pierre looks at her. She closes it.',
      choices: [
        { label: 'Say nothing. Ever.', effects: { production: 4, mood: { marcel: 8 } },
          outcome: 'The secret goes to the grave with Pierre, Dana, you and Kenji, who somehow already knew. Marcel is radiant for a week.' },
        { label: 'Tell Marcel, gently', effects: { mood: { marcel: -10 }, skill: { marcel: 2 } },
          outcome: 'Marcel is devastated, then determined. He takes voice lessons from a retired choir director in Warman. He improves. He is furious.' },
        { label: 'Leave one bad note in', effects: { production: 2, buzz: 3, chemistry: 3 },
          outcome: "Pierre keeps one wobble 'for honesty'. Fans love the wobble. It's printed on a T-shirt. Marcel thinks it was intentional." }
      ] },
    { id: 'studio_tape_splice', type: 'drama', speaker: 'dana', title: 'The Razor Blade', once: false, cooldown: 12, gate: { producer: ['bev_kostiuk'], band: HD },
      text: "Bev records to tape. There is no undo. There is Bev, with a razor blade. She has just cut four minutes out of Dana's solo " +
        "by hand and is holding the loop of tape up to the light like a fish.",
      choices: [
        { label: 'Trust Bev', effects: { production: 4, mood: { dana: -6 } },
          outcome: 'The solo is now tight, savage and ninety seconds long. Dana keeps the cut tape in a jar on her amp. She visits it.' },
        { label: 'Splice it back in', effects: { production: -2, mood: { dana: 8 } },
          outcome: 'Bev tapes it back with the look of a surgeon reattaching a bad idea. The solo returns. So does its eleventh minute.' },
        { label: 'Make the jar a B-side', effects: { buzz: 4, production: 1, chemistry: 3 },
          outcome: "'The Four Minutes Bev Cut' comes out as a bonus track. It is the most-played bonus track in Hail Damage history." }
      ] },
    { id: 'studio_chad_chorus', type: 'drama', speaker: 'marcel', title: 'The Part People Skip', once: false, cooldown: 12, gate: { producer: ['chad_lorimer'], band: HD },
      text: "Chad has moved every chorus to the start of every song. He wants to cut the bridges, which he calls 'the part people skip'. " +
        "He calls Kenji 'the tall one'. Marcel is breathing into a paper bag.",
      choices: [
        { label: 'Let Chad cook', effects: { production: 5, mood: { marcel: -8 }, buzz: 4 },
          outcome: 'The songs are shorter, catchier and slightly less yours. Radio will love it. Marcel writes a nine-verse poem about betrayal.' },
        { label: 'Save the bridges', effects: { production: 2, mood: { marcel: 6 }, chemistry: 3 },
          outcome: "You fight for the bridges and win half of them. Chad says 'love the passion'. He means it as an insult." },
        { label: 'Let Kenji decide', effects: { production: 3, mood: { kenji: 5 } },
          outcome: 'Kenji listens to both versions, then silently moves one chorus back. It is exactly right. Chad never calls him "the tall one" again.' }
      ] },
    { id: 'studio_lyle_combine', type: 'weird', speaker: 'jaxon', title: 'The Combine', once: false, cooldown: 12, gate: { producer: ['lyle_hnatiuk'], band: HD },
      text: "Lyle wants to record your kick drum inside a combine harvester, 'for the resonance of labour'. He has borrowed a combine. " +
        "He did not say from whom. It is idling in the parking lot.",
      choices: [
        { label: 'Into the combine', hint: 'Gamble: genius, or a farmer',
          outcome: 'You set up the kick in the grain tank.',
          roll: { chance: 0.5,
            success: { effects: { production: 5, buzz: 5 }, outcome: 'The kick sounds like a heartbeat in a cathedral. Pitchspork will write two thousand words about it. Lyle weeps.' },
            fail: { effects: { fund: -200, burnout: 5 }, outcome: 'The farmer finds you. The combine was his. $200 and a whole Saturday helping with his canola.' } } },
        { label: 'Just the regular room', effects: { production: 2, mood: { jaxon: 3 } },
          outcome: 'Lyle agrees, sadly, and mics the kick from across the street instead. It sounds like distant weather. It is fine.' },
        { label: 'Record the combine itself', effects: { production: 3, chemistry: 3 },
          outcome: 'The combine gets a solo. It is in a better key than the dryer. Dana is quietly jealous of its sustain.' }
      ] },

    // ---- Any session --------------------------------------------------------
    { id: 'studio_kenji_one_take', type: 'drama', speaker: 'kenji', title: 'One Take', once: false, cooldown: 12, gate: { band: HD },
      text: "Kenji plugs in, plays every bass part for the whole record in one take, unplugs and leaves. It took forty minutes. " +
        'The engineer stares at the screen for a long time, then quietly asks if Kenji is available for other projects.',
      choices: [
        { label: 'Keep every note', effects: { production: 4, mood: { kenji: 5 } },
          outcome: "It's flawless. The engineer frames the session printout. Nobody sees Kenji again until the album release party." },
        { label: 'Ask him for a second take', effects: { mood: { kenji: -6 }, production: 1 },
          outcome: 'Kenji returns, plays the exact same take note for note, hands you a sticky note that says "…" and leaves again.' },
        { label: 'Use the spare days', effects: { production: 2, skill: { all: 1 }, burnout: -3 },
          outcome: 'With the bass done early, the band spends two days on everything else. Dana plays her solo only twice. Growth.' }
      ] },
    { id: 'studio_dana_take_41', type: 'drama', speaker: 'dana', title: 'Take Forty-One', once: false, cooldown: 12, gate: { band: HD },
      text: "Dana is on take forty-one of her solo. Takes nine, twenty-two and thirty-five were perfect. She says she 'heard something' " +
        "in take thirty-eight. The engineer has gone home. The engineer's wife has texted to ask when he will be home.",
      choices: [
        { label: 'Take forty-two', effects: { burnout: 6, production: 3, mood: { dana: 5 } },
          outcome: 'Take forty-two is the one. It sounds exactly like take nine. Dana says it is completely different. Nobody argues.' },
        { label: 'Comp the best bits', effects: { production: 4, mood: { dana: -4 } },
          outcome: 'The engineer stitches nine, twenty-two and thirty-five together. It is perfect. Dana calls it "a Frankenstein". She keeps playing it.' },
        { label: 'Hide her pick', effects: { chemistry: 3, burnout: -4, mood: { dana: -5 } },
          outcome: 'She plays take forty-two with a coin. It is amazing. She will never forgive you, but she will use a coin again.' }
      ] },
    { id: 'studio_baba_visit', type: 'scene', speaker: 'baba', title: 'Baba Rates the Mix', once: false, cooldown: 12, gate: { band: HD },
      text: "Baba arrives at the studio with cabbage rolls and asks to hear 'the mix'. She has never heard the word 'mix' before. She " +
        'sits at the desk, listens to one song in total silence, and moves one fader. Down.',
      choices: [
        { label: 'Keep Baba\'s fader', effects: { production: 4, mood: { jaxon: 5 } },
          outcome: "It was the guitars. They were too loud. They are now correct. The engineer asks Baba for her number. She refuses." },
        { label: 'Credit her on the album', effects: { buzz: 3, chemistry: 4, mood: { jaxon: 6 } },
          outcome: "'Additional mixing: Baba Kowalchuk.' She asks for her name in bigger letters. And the cabbage roll recipe. Just the name, actually." },
        { label: 'Eat, then decide', effects: { burnout: -5, mood: { all: 4 } },
          outcome: 'Everyone eats cabbage rolls on the studio floor. Nobody decides anything. The mix is fine. The cabbage rolls are perfect.' }
      ] },
    { id: 'studio_marcel_booth', type: 'weird', speaker: 'marcel', title: 'The Vocal Booth', once: false, cooldown: 12, gate: { band: HD },
      text: "For his vocals Marcel requires: forty candles, a fog machine, a bowl of black grapes and the lights off. The engineer has " +
        "agreed to all of it except the candles, which Marcel has already lit.",
      choices: [
        { label: 'Give him the full ritual', hint: 'Gamble: a legendary take, or the sprinklers',
          outcome: 'Fog. Candles. Grapes. Darkness. Record.',
          roll: { chance: 0.5,
            success: { effects: { production: 5, mood: { marcel: 8 } }, outcome: 'He emerges from the fog having sung the take of his life. He will not discuss it. The grapes are gone.' },
            fail: { effects: { fund: -150, burnout: 5 }, outcome: 'The fog sets off the sprinklers. The engineer saves the desk with a tarp and a swear word. $150.' } } },
        { label: 'Grapes only', effects: { production: 2, mood: { marcel: -3 } },
          outcome: "He sings a perfectly good take while eating grapes between lines. You can hear one on the record, if you listen. Everyone listens." },
        { label: 'Lights off, no fog', effects: { production: 3, mood: { marcel: 3 } },
          outcome: 'In total darkness he sings like a man possessed and walks into the door on the way out. Take one. Keeper.' }
      ] },

    // ---- v0.9: the same rooms and producers for every other band (neutral; role aliases + tokens) ----------------------
    { id: 'studio_any_dryer', type: 'weird', speaker: 'mom', title: 'Laundry Day', once: false, cooldown: 10, gate: { studio: ['moms_basement'], band: OTHERS },
      text: "Mom is doing towels. The dryer sits right behind the vocal mic and hums in E flat. Nothing on the record is in E flat. " +
        "'It's only a sixty-minute cycle, honey.' It is a ninety-minute cycle.",
      choices: [
        { label: 'Wait for the spin cycle', effects: { burnout: 4, production: 2 },
          outcome: 'Ninety minutes of crokinole. Then silence, beautiful silence, and {front} nails the take. Then Mom starts the whites.' },
        { label: "Keep it. It's texture.", hint: 'Gamble: art, or a dryer on the record',
          outcome: 'You roll tape with the dryer running.',
          roll: { chance: 0.5,
            success: { effects: { production: 4, buzz: 3 }, outcome: 'A zine later praises the "haunting low hum". It was towels.' },
            fail: { effects: { production: -4 }, outcome: 'On playback you can hear a zipper hitting the drum every two seconds. It is in time. It is not good.' } } }
      ] },
    { id: 'studio_any_landlord', type: 'money', speaker: '@soloist', title: 'Walt Has Tenants', once: false, cooldown: 10, gate: { studio: ['strip_mall_sound'], band: OTHERS },
      text: "Walt, the engineer, stops the session mid-chorus. He also owns the strip mall, and the vape shop is late on rent. He comes " +
        "back an hour later, hears the bridge, and says he may need to 'revisit' your rate.",
      choices: [
        { label: 'Pay the new rate', effects: { fund: -100, production: 3 },
          outcome: 'Walt is happy. Happy Walt is a great engineer. He puts a real compressor on the kick. You can feel it in your teeth.' },
        { label: 'Offer him a credit', effects: { production: 1, buzz: 2, mood: { '@soloist': -3 } },
          outcome: "'Engineered by Walt, landlord.' He wants his whole title in the liner notes. And the strip mall's phone number." }
      ] },
    { id: 'studio_any_echo', type: 'weird', speaker: '@soloist', title: 'Nine Seconds of Reverb', once: false, cooldown: 10, gate: { studio: ['grain_silo'], band: OTHERS },
      text: 'In the old elevator a snare hit rings for nine seconds. A cough lasts eleven. {bassist} plays one low note, puts the bass down ' +
        'and leaves for lunch. On Tuesday it is still faintly ringing.',
      choices: [
        { label: 'Use the room. All of it.', effects: { production: 5, burnout: 3 },
          outcome: 'Your drums sound like a thunderstorm in a cathedral. A critic will call it "the sound of the harvest gods".' },
        { label: 'Hang moving blankets', effects: { production: 2, fund: -80 },
          outcome: '$80 of moving blankets. The echo comes down to three seconds. {soloist} misses the other six.' }
      ] },
    { id: 'studio_any_bear', type: 'weird', speaker: '@front', title: 'Gerald Again', once: false, cooldown: 10, gate: { producer: ['solveig_birch'], band: OTHERS },
      text: "Solveig's cabin near Waskesiu. Vocals day. A black bear is on the porch eating the catering. Solveig says his name is Gerald, " +
        'that he loves low end, and that nobody should make eye contact. {front} is already making eye contact.',
      choices: [
        { label: 'Record through the window', effects: { production: 4, burnout: 4 },
          outcome: '{front} sings the whole ballad to Gerald through the glass. Gerald listens, then lies down. Solveig says it is a rave review.' },
        { label: 'Wait inside, quietly', effects: { burnout: -4, chemistry: 4 },
          outcome: 'Three hours of cards by candlelight. Gerald leaves with a whole tray of sandwiches. Nobody got a take. Everybody got closer.' }
      ] },
    { id: 'studio_any_redline', type: 'drama', speaker: '@soloist', title: 'Louder, Somehow', once: false, cooldown: 10, gate: { producer: ['dwayne_redline'], band: OTHERS },
      text: 'Dwayne has pushed every meter into the red, including the ones that are not plugged in. He wants "more". The amp is ' +
        'smoking gently. You can hear the album from the parking lot with the doors shut.',
      choices: [
        { label: 'More. Give Dwayne more.', effects: { production: 4, burnout: 5, buzz: 3 },
          outcome: 'The master is so loud it clips on phones. Your mom will play it at a quarter volume and still wince.' },
        { label: 'Ask for dynamics', effects: { production: 2, mood: { '@soloist': 4 } },
          outcome: 'Dwayne looks at you like you asked him to whisper. He leaves one quiet part in. It is still louder than most records.' }
      ] },
    { id: 'studio_any_pitch', type: 'drama', speaker: '@soloist', title: 'The Quiet Fix', once: false, cooldown: 12, gate: { producer: ['quiet_pierre'], band: OTHERS },
      text: "Pierre plays back the vocal. {front} closes both eyes. 'I have never sounded so like myself.' Pierre, who spent six hours " +
        'quietly fixing every note, says nothing. {soloist} opens a mouth. Pierre looks over. It closes.',
      choices: [
        { label: 'Say nothing. Ever.', effects: { production: 4, mood: { '@front': 8 } },
          outcome: 'The secret goes to the grave with Pierre, you and {soloist}. {front} is radiant for a week.' },
        { label: 'Leave one bad note in', effects: { production: 2, buzz: 3, chemistry: 3 },
          outcome: "Pierre keeps one wobble 'for honesty'. Fans love the wobble. It gets printed on a T-shirt." }
      ] },
    { id: 'studio_any_splice', type: 'drama', speaker: '@soloist', title: 'Bev and the Razor', once: false, cooldown: 12, gate: { producer: ['bev_kostiuk'], band: OTHERS },
      text: "Bev records to tape. There is no undo. There is Bev, with a razor blade. She has just cut two minutes out of the solo by hand " +
        'and is holding the loop of tape up to the light like a fish.',
      choices: [
        { label: 'Trust Bev', effects: { production: 4, mood: { '@soloist': -6 } },
          outcome: 'The solo is now tight, savage and ninety seconds long. {soloist} keeps the cut tape in a jar. Visits it.' },
        { label: 'Make the jar a B-side', effects: { buzz: 4, production: 1, chemistry: 3 },
          outcome: "'The Two Minutes Bev Cut' comes out as a bonus track. It is somehow everyone's favourite." }
      ] },
    { id: 'studio_any_chad', type: 'drama', speaker: '@front', title: 'Chorus First', once: false, cooldown: 12, gate: { producer: ['chad_lorimer'], band: OTHERS },
      text: "Chad has moved every chorus to the start of every song. He wants to cut the bridges, which he calls 'the part people " +
        "skip'. {front} is breathing into a paper bag.",
      choices: [
        { label: 'Let Chad cook', effects: { production: 5, mood: { '@front': -8 }, buzz: 4 },
          outcome: 'The songs are shorter, catchier and slightly less yours. Radio will love it. {front} writes an angry song about it.' },
        { label: 'Save the bridges', effects: { production: 2, mood: { '@front': 6 }, chemistry: 3 },
          outcome: "You fight for the bridges and win half of them. Chad says 'love the passion'. He means it as an insult." }
      ] },
    { id: 'studio_any_combine', type: 'weird', speaker: '@filler', title: 'Kick Drum in a Combine', once: false, cooldown: 12, gate: { producer: ['lyle_hnatiuk'], band: OTHERS },
      text: "Lyle wants to record your kick drum inside a combine harvester, 'for the resonance of labour'. He has borrowed a combine. " +
        'He did not say from whom. It is idling in the parking lot.',
      choices: [
        { label: 'Into the combine', hint: 'Gamble: genius, or a farmer',
          outcome: 'You set up the kick in the grain tank.',
          roll: { chance: 0.5,
            success: { effects: { production: 5, buzz: 5 }, outcome: 'The kick sounds like a heartbeat in a cathedral. Pitchspork will write two thousand words about it.' },
            fail: { effects: { fund: -200, burnout: 5 }, outcome: 'The farmer finds you. It was his combine. $200 and a whole Saturday helping with his canola.' } } },
        { label: 'Just the regular room', effects: { production: 2, chemistry: 2 },
          outcome: 'Lyle agrees, sadly, and mics the kick from across the street instead. It sounds like distant weather. It is fine.' }
      ] },
    { id: 'studio_any_one_take', type: 'drama', speaker: '@deadpan', title: 'One Take Wonder', once: false, cooldown: 12, gate: { band: OTHERS },
      text: '{deadpan} plugs in, plays every part for the whole record in one take and goes for a sandwich. It took forty minutes. ' +
        'The engineer stares at the screen, then asks if {deadpan} is available for other projects.',
      choices: [
        { label: 'Keep every note', effects: { production: 4, chemistry: 2 },
          outcome: "It's flawless. The engineer frames the session printout. Everyone else now feels slow." },
        { label: 'Use the spare days', effects: { production: 2, skill: { all: 1 }, burnout: -3 },
          outcome: 'With one part done early, the band spends two days on everything else. It shows.' }
      ] },
    { id: 'studio_any_take_41', type: 'drama', speaker: '@soloist', title: 'Take Forty-One', once: false, cooldown: 12, gate: { band: OTHERS },
      text: "{soloist} is on take forty-one of the big part. Takes nine, twenty-two and thirty-five were perfect. {soloist} 'heard " +
        "something' in take thirty-eight. The engineer's wife has texted twice to ask when he is coming home.",
      choices: [
        { label: 'Take forty-two', effects: { burnout: 6, production: 3, mood: { '@soloist': 5 } },
          outcome: 'Take forty-two is the one. It sounds exactly like take nine. {soloist} says it is completely different. Nobody argues.' },
        { label: 'Comp the best bits', effects: { production: 4, mood: { '@soloist': -4 } },
          outcome: 'The engineer stitches nine, twenty-two and thirty-five together. It is perfect. {soloist} calls it "a Frankenstein".' },
        { label: 'Hide the pick', effects: { chemistry: 3, burnout: -4, mood: { '@soloist': -5 } },
          outcome: 'Take forty-two gets played with a coin. It is amazing. {soloist} will never forgive you, and will use a coin again.' }
      ] },
    { id: 'studio_any_mom_mix', type: 'scene', speaker: 'mom', title: 'Mom Rates the Mix', once: false, cooldown: 12, gate: { band: OTHERS },
      text: "Mom drops by the studio with a tray of squares and asks to hear 'the mix'. She sits at the desk, listens to one song in " +
        'total silence, and moves one fader. Down.',
      choices: [
        { label: "Keep Mom's fader", effects: { production: 4, chemistry: 2 },
          outcome: 'It was the guitars. They were too loud. They are now correct. The engineer asks Mom if she takes clients. She does not.' },
        { label: 'Credit her on the album', effects: { buzz: 3, chemistry: 4 },
          outcome: "'Additional mixing: Mom.' She asks for her full name. Then asks you to take it off. Then asks for it back." },
        { label: 'Eat, then decide', effects: { burnout: -5, mood: { all: 4 } },
          outcome: 'Everyone eats squares on the studio floor. Nobody decides anything. The mix is fine. The squares are perfect.' }
      ] },
    { id: 'studio_any_vocal_booth', type: 'weird', speaker: '@front', title: 'The Vocal Booth', once: false, cooldown: 12, gate: { band: OTHERS },
      text: "For the vocals {front} requires: the lights off, a lava lamp, a bowl of dill pickle chips and 'the right energy'. The " +
        'engineer has agreed to all of it except the energy, which he says is not his department.',
      choices: [
        { label: 'Give them the full ritual', hint: 'Gamble: a legendary take, or chaos',
          outcome: 'Lava lamp. Chips. Darkness. Record.',
          roll: { chance: 0.5,
            success: { effects: { production: 5, mood: { '@front': 8 } }, outcome: '{front} walks out having sung the take of a lifetime. Nobody discusses it. The chips are gone.' },
            fail: { effects: { fund: -150, burnout: 5 }, outcome: 'The lava lamp tips into the mic cable. Sparks, a smell, a new cable. $150.' } } },
        { label: 'Chips only', effects: { production: 2, mood: { '@front': -3 } },
          outcome: 'A perfectly good take, crunched between lines. You can hear one chip on the record, if you listen. Everyone listens.' },
        { label: 'Lights off, nothing else', effects: { production: 3, mood: { '@front': 3 } },
          outcome: '{front} sings like a person possessed and walks into the door on the way out. Take one. Keeper.' }
      ] }
  ];
})(window.GG);
