// content/recruits.js: the recruit generator's pools (27_sim_drama.js reads it). Recruits are lighter characters:
// one trait (a real mechanical effect, see economy.drama.traits) and one quirk (1–2 quirk cards, forced now and then).
//   GG.content.recruits = {
//     names:     { <genre>: { first: [], last: [], nicks: [] } }     metal first; punk/rock/country ready for v0.9
//     hometowns: { <region>: [city] }                                  real places from wherever the band is
//     traits:    [ { id, name, effect, chem } ]                        chem = chemistry bias on the candidate card
//     quirks:    [ { id, text, chem, cards: [CARD] } ]                 quirk cards: speaker 'recruit', {recruit} = them
//     chat:      { happy, ok, grumpy }                                 weekly group-chat lines for recruits
//     looks:     { shirts: { <genre>: ['#rrggbb'] } }
//   }
// Parody and prairie-Canadian only. No USA.
// v0.9 "Genres": hometownsByCity[<band city>] = the towns recruits come from around each home (27_sim_drama prefers it;
//   Saskatoon's list is the old canada list, in order). quirks[].genres = [genre] limits a quirk to those genres' bands
//   (Hail Damage's own quirk jokes are metal-only and their cards gated to the band); punk, rock and country get 4 each.
(function (GG) {
  function card(id, type, title, text, choices) { return { id: id, type: type, speaker: 'recruit', title: title, text: text, choices: choices }; }

  GG.content.recruits = {
    names: {
      metal: {
        first: ['Dustin', 'Brandi', 'Trent', 'Krystal', 'Wade', 'Tara', 'Colton', 'Shayla', 'Brock', 'Jolene', 'Garrett',
          'Destiny', 'Lyle', 'Raylene', 'Darnell', 'Morgan', 'Kendra', 'Trevor', 'Olga', 'Mitch'],
        last: ['Friesen', 'Tkachuk', 'Lavoie', 'Bergstrom', 'Kowalski', 'Desjardins', 'Olson', 'Wiebe', 'Pelletier', 'Sawchuk',
          'McAllister', 'Nakamura', 'Okonkwo', 'Delorme', 'Ratushniak', 'Lindgren', 'Boychuk', 'Fehr'],
        nicks: ['Gravel', 'The Moose', 'Tank', 'Blizzard', 'Pickerel', 'Cinder', 'Frostbite', 'Skullet', 'Hoarfrost',
          'Wheat King', 'Boomer', 'Gopher', 'Black Ice', 'Wolverine']
      },
      punk: {
        first: ['Riley', 'Skye', 'Jesse', 'Kasey', 'Dakota', 'Robin', 'Taylor', 'Quinn', 'Avery', 'Jordan'],
        last: ['Doerksen', 'Paquette', 'Hnatiuk', 'Gauthier', 'Unrau', 'Stadnyk', 'Ferris', 'Makowski'],
        nicks: ['Pothole', 'Snot', 'Rink Rat', 'Dumpster', 'Sparky', 'Gutter', 'Slush', 'Detour']
      },
      rock: {
        first: ['Shane', 'Tanya', 'Curtis', 'Michelle', 'Derek', 'Lisa', 'Kurt', 'Dawn', 'Wes', 'Angie'],
        last: ['Hamm', 'Campbell', 'Leblanc', 'Kozak', 'Ruston', 'Martens', 'Nystrom', 'Duval'],
        nicks: ['Chrome', 'Riff', 'Big Smoke', 'Slider', 'Neon', 'Turbo', 'Axle', 'Highway']
      },
      country: {
        first: ['Wyatt', 'Wynona', 'Dallin', 'Reba-Lynn', 'Boyd', 'Tammy', 'Cash', 'Darla', 'Hank', 'June'],
        last: ['Peters', 'Klassen', 'Rempel', 'Hildebrand', 'Toews', 'Dyck', 'Penner', 'Loewen'],
        nicks: ['Tumbleweed', 'Buckshot', 'Canola', 'Two-Step', 'Slim', 'Dusty', 'Gravel Road', 'Haybale']
      }
    },

    hometowns: {
      canada: ['Saskatoon', 'Regina', 'Prince Albert', 'Moose Jaw', 'Swift Current', 'North Battleford', 'Yorkton', 'Warman',
        'Martensville', 'Humboldt', 'Melfort', 'Estevan', 'Weyburn', 'Kindersley', 'Lloydminster', 'Outlook', 'Rosetown',
        'Nipawin', 'La Ronge', 'Biggar', 'Wynyard', 'Meadow Lake', 'Gravelbourg', 'Assiniboia'],
      uk_europe: ['Leeds', 'Bergen', 'Tampere', 'Hamburg', 'Glasgow', 'Ghent'],
      japan: ['Osaka', 'Sapporo', 'Fukuoka', 'Sendai'],
      australia: ['Adelaide', 'Perth', 'Hobart', 'Geelong'],
      russia: ['Novosibirsk', 'Yekaterinburg', 'Murmansk', 'Kazan']
    },
    // v0.9: recruits come from around the band's own home city (27_sim_drama: hometownsByCity[state.city] first)
    hometownsByCity: {
      Saskatoon: ['Saskatoon', 'Regina', 'Prince Albert', 'Moose Jaw', 'Swift Current', 'North Battleford', 'Yorkton', 'Warman',
        'Martensville', 'Humboldt', 'Melfort', 'Estevan', 'Weyburn', 'Kindersley', 'Lloydminster', 'Outlook', 'Rosetown',
        'Nipawin', 'La Ronge', 'Biggar', 'Wynyard', 'Meadow Lake', 'Gravelbourg', 'Assiniboia'],
      Regina: ['Regina', 'Moose Jaw', 'White City', 'Pilot Butte', 'Lumsden', "Fort Qu'Appelle", 'Balgonie', 'Indian Head',
        'Weyburn', 'Estevan', 'Yorkton', 'Saskatoon', 'Swift Current', 'Assiniboia'],
      Edmonton: ['Edmonton', 'St. Albert', 'Sherwood Park', 'Leduc', 'Spruce Grove', 'Stony Plain', 'Fort Saskatchewan', 'Beaumont',
        'Wetaskiwin', 'Camrose', 'Red Deer', 'Calgary', 'Lethbridge', 'Lloydminster'],
      'Swift Current': ['Swift Current', 'Maple Creek', 'Gull Lake', 'Shaunavon', 'Herbert', 'Cabri', 'Eastend', 'Leader',
        'Kindersley', 'Moose Jaw', 'Gravelbourg', 'Medicine Hat', 'Regina', 'Assiniboia']
    },

    traits: [
      { id: 'reliable', name: 'Reliable', effect: 'Always on time. Never gets past passive-aggressive: no ultimatums.', chem: 6 },
      { id: 'road_warrior', name: 'Road Warrior', effect: 'Loves the drive. Gig weeks cost the band 3 less burnout.', chem: 2 },
      { id: 'showboat', name: 'Showboat', effect: 'Gigs score +4. Hogs the spotlight: chemistry −1 a week.', chem: -8 },
      { id: 'studio_rat', name: 'Studio Rat', effect: 'Lives to write: every new song +5 quality.', chem: 0 },
      { id: 'hype_machine', name: 'Hype Machine', effect: 'Posts about the band nonstop: buzz +2 a week.', chem: 0 },
      { id: 'fast_learner', name: 'Fast Learner', effect: 'Skill +2 a week, up to 75.', chem: 3 },
      { id: 'party_animal', name: 'Party Animal', effect: 'Gigs win 15% more fans, but +2 burnout after each one.', chem: 4 },
      { id: 'frugal', name: 'Frugal', effect: 'Asks only 10%, cares half as much about pay, brings sandwiches (+$5 a week).', chem: 2 },
      { id: 'local_legend', name: 'Local Legend', effect: '+20 fans on day one. Gigs win 10% more fans.', chem: 0 }
    ],

    quirks: [
      { id: 'barefoot', text: 'Plays barefoot. Even in January.', chem: 0, cards: [
        card('qk_barefoot', 'weird', 'Frostbite Risk',
          "It's minus 34. {recruit} arrives at the Legion barefoot, as always, carrying boots 'for the walk home'. The floor is concrete and honestly kind of wet.",
          [{ label: 'Buy wool socks ($20)', effects: { fund: -20, mood: { recruit: 6 } },
            outcome: "{recruit} wears the socks on their hands. 'For warmth,' they say, playing barefoot. The crowd loves it." },
           { label: 'Respect the craft', effects: { buzz: 3, burnout: 3 },
             outcome: "{recruit} plays barefoot on frozen concrete. Someone films it. 'Prairie Toes' gets shared around {city} all week." }])] },
      { id: 'ferret', text: 'Tours with a pet ferret named Wayne Ferretsky.', chem: 3, genres: ['metal'], cards: [
        card('qk_ferret_missing', 'weird', 'Wayne Ferretsky Is Missing',
          "{recruit}'s ferret, Wayne Ferretsky, has escaped into the garage wall. Rehearsal becomes a search party. Marcel claims he can hear it 'in the bass frequencies'.",
          [{ label: 'Everyone searches', effects: { chemistry: 4, burnout: 3 },
            outcome: "You find Wayne asleep in Kenji's bass case. Kenji allows it. This is the most emotion anyone has ever seen from Kenji." },
           { label: 'Rehearse around it', effects: { drumSkill: 1, mood: { recruit: -6 } },
             outcome: '{recruit} stares at the wall all night. Wayne reappears at the end of the second song, clearly a critic.' }]),
        card('qk_ferret_merch', 'money', 'Ferret Merch',
          "A kid at the last gig asked for a photo with Wayne Ferretsky, not the band. {recruit} thinks Wayne should have his own shirt.",
          [{ label: 'Print ferret shirts ($80)', effects: { fund: -80, fans: 12, buzz: 4 },
            outcome: "The 'Wayne Ferretsky World Tour' shirt outsells your band shirt three to one. Marcel is furious. Wayne is indifferent." },
           { label: 'The band is the brand', effects: { mood: { recruit: -5 } },
             outcome: "{recruit} sulks. Wayne sulks. It's hard to say who sulks harder." }])] },
      { id: 'hockey', text: 'Speaks only in hockey metaphors.', chem: 4, cards: [
        card('qk_hockey', 'drama', 'Line Changes',
          "{recruit} has drawn the setlist like a line chart. 'Dump it in with the fast one, cycle the mid-tempo, then pull the goalie for the closer.' It might work.",
          [{ label: 'Run the hockey setlist', hint: 'Gamble: pull the goalie', outcome: 'You tape your sticks.',
            roll: { chance: 0.55, stat: 'chemistry', statScale: 0.005,
              success: { effects: { buzz: 5, fans: 10 }, outcome: "It works. The crowd chants like it's overtime. {recruit} taps your pads. You don't have pads." },
              fail: { effects: { burnout: 5 }, outcome: 'You pull the goalie. There is no goalie. The closer starts twice.' } } },
           { label: 'Keep the old setlist', effects: { chemistry: 2, mood: { recruit: -5 } },
             outcome: "{recruit} calls it 'playing the trap'. You're not sure that's a compliment. It is not." }])] },
      { id: 'slow_cooker', text: 'Brings a slow cooker to every gig.', chem: 5, cards: [
        card('qk_slow_cooker', 'weird', 'The Chili Incident',
          "{recruit}'s slow cooker tripped the breaker at the bingo hall halfway through the second song. The caller wants to know whose chili it is. It is very good chili.",
          [{ label: 'Share the chili', effects: { fans: 8, chemistry: 3 },
            outcome: "The crowd eats chili in the dark until the power comes back. It's your best-reviewed show yet. Nobody mentions the music." },
           { label: 'Unplug the chili', effects: { buzz: 2, mood: { recruit: -6 } },
             outcome: 'You finish the set. {recruit} plays with the grief of a person whose chili is going cold.' }])] },
      { id: 'wraith_roadie', text: "Former Tundra Wraith roadie. Won't say why they left.", chem: -2, genres: ['metal'], cards: [
        card('qk_wraith_basket', 'scene', 'A Basket for {recruit}',
          "A fruit basket arrives for {recruit}. The card: 'We hope you're doing well. We are not angry. — Tundra Wraith.' {recruit} goes pale and puts it in the alley.",
          [{ label: 'Ask what happened', effects: { chemistry: 3, mood: { recruit: -5 } },
            outcome: "{recruit} says one word: 'Spreadsheets.' Then leaves the room. You will never know." },
           { label: 'Eat the fruit', effects: { burnout: -3, mood: { all: 3 } },
             outcome: "The pears are incredible. Tundra Wraith's kindness is a weapon, and it is delicious." }])] },
      { id: 'famous_album', text: "'Basically played on' a famous album. (Held a cable once.)", chem: -3, genres: ['metal'], cards: [
        card('qk_famous_album', 'fame', 'Basically Played On It',
          "{recruit} tells the Star-Pheasant they 'basically played on' a famous Canadian album. They held a cable. For one song. The reporter wants a quote from the band.",
          [{ label: 'Back the story', effects: { buzz: 6, chemistry: -3 },
            outcome: "The headline: 'LOCAL BAND HAS ALBUM CONNECTION'. Technically not a lie. Dana won't make eye contact with anyone." },
           { label: 'Tell the truth', effects: { chemistry: 3, mood: { recruit: -5 } },
             outcome: "'They held a cable,' you say. The reporter writes down 'held a cable'. It's the most honest story in the paper." }])] },
      { id: 'sasquatch', text: "Won't drive after dark. Sasquatch.", chem: 0, genres: ['metal'], cards: [
        card('qk_sasquatch', 'road', 'Not After Dark',
          "The North Battleford gig ends at midnight. {recruit} refuses to be in the van after dark. 'They're out there,' they say, pointing at the treeline, which is canola.",
          [{ label: 'Get a motel ($70)', effects: { fund: -70, burnout: -4, mood: { recruit: 6 } },
            outcome: '{recruit} checks the motel window for Sasquatch every twenty minutes. Nobody else sleeps either.' },
           { label: 'Drive home anyway', effects: { burnout: 6, mood: { recruit: -8 } },
             outcome: '{recruit} rides under a blanket, whispering. Near the treeline Kenji slows down. Nobody asks why.' }])] },
      { id: 'crokinole', text: 'Carries their own crokinole board. Challenges everyone.', chem: 6, genres: ['metal'], cards: [
        card('qk_crokinole', 'weird', 'The Tournament',
          '{recruit} has set up a crokinole tournament in the garage instead of rehearsal. The bracket is on the whiteboard, over your week plan. Kenji is seeded first.',
          [{ label: 'Play the tournament', effects: { chemistry: 5, burnout: -4 },
            outcome: "Kenji wins without speaking. The trophy is a hubcap. It's now the band's most prized possession." },
           { label: 'Rehearse. Now.', effects: { drumSkill: 1, mood: { recruit: -6 } },
             outcome: 'You rehearse. {recruit} practises flicks on your snare head between songs. It is somehow in time.' }])] },
      { id: 'harvest', text: 'Vanishes every fall to help with harvest.', chem: 2, genres: ['metal'], cards: [
        card('qk_harvest', 'money', 'Harvest Call',
          "{recruit}'s uncle needs a hand with harvest near Rosetown. 'Two weeks,' says {recruit}. 'Three if it rains. Four if the combine does the thing.'",
          [{ label: 'The whole band helps', effects: { fund: 80, burnout: 8, chemistry: 3 },
            outcome: 'The uncle pays in cash and pie. Marcel drives the grain truck in full eyeliner.' },
           { label: 'Stay, please', effects: { buzz: 2, mood: { recruit: -8 } },
             outcome: '{recruit} stays but checks the weather radar between every song. It does not rain. They are somehow disappointed.' }])] },
      { id: 'toque', text: 'Never takes off the toque. Not even in July.', chem: 2, cards: [
        card('qk_toque', 'weird', 'Toque in July',
          "It's plus 33 at the farmers' market gig. {recruit} is in a toque. A lady from the market board has asked three times if they're all right.",
          [{ label: 'Buy a summer toque ($15)', effects: { fund: -15, mood: { recruit: 5 } },
            outcome: '{recruit} considers the mesh toque a betrayal and wears it over the wool one.' },
           { label: 'Solidarity toques', effects: { buzz: 4, burnout: 4 },
             outcome: "The whole band plays in toques. People think it's a bit. The photo runs in the market newsletter." }])] },
      { id: 'horoscope', text: 'Picks setlists by horoscope.', chem: -1, genres: ['metal'], cards: [
        card('qk_horoscope', 'weird', 'Mercury in Retrograde',
          "{recruit} says Mercury is in retrograde: no new songs, no writing, and do not 'trust the van'. Kenji has quietly put on a second pair of sunglasses.",
          [{ label: 'Trust the stars', effects: { burnout: -5, mood: { recruit: 5 } },
            outcome: 'You take the week slow. Nothing breaks. {recruit} takes full credit. The van takes some too.' },
           { label: "Mercury isn't in the band", effects: { chemistry: -3, drumSkill: 1 },
             outcome: 'You rehearse the new song anyway. Three strings break. {recruit} says nothing. Loudly.' }])] },
      { id: 'accordion', text: "Brings an accordion to every jam, 'just in case'.", chem: 1, genres: ['metal'], cards: [
        card('qk_accordion', 'drama', 'Just in Case',
          "{recruit} has brought the accordion again. 'Just in case,' they say. Marcel is intrigued. Dana is visibly calculating how to make it not happen.",
          [{ label: 'Let them take the bridge', hint: 'Gamble: polka-metal', outcome: 'The bellows open.',
            roll: { chance: 0.5, stat: 'chemistry', statScale: 0.005,
              success: { effects: { buzz: 6, fans: 8 }, outcome: 'Polka-metal. The Ukrainian hall loses its mind. Baba requests it by name.' },
              fail: { effects: { chemistry: -4 }, outcome: "It's a lot of accordion. Dana leaves during the bridge and comes back when it's over." } } },
           { label: 'No accordions', effects: { mood: { recruit: -5 } },
             outcome: 'The accordion goes back in its case. You hear it wheeze sadly all the way home.' }])] },

      // ---- v0.9 genre quirks (genres: [..]; 27_sim_drama filters by the band's genre) ----
      { id: 'zine_maker', text: 'Makes a zine about every rehearsal. Every. Single. One.', chem: 2, genres: ['punk'], cards: [
        card('qk_zine', 'fame', 'Issue Forty-Seven',
          '{recruit} has published issue 47 of their rehearsal zine. It reviews your hi-hat. Harshly. Three hundred copies are already at the record store.',
          [{ label: 'Read it out loud', effects: { chemistry: 3, buzz: 2 },
            outcome: 'The whole band reads it together. It is mean, accurate and very funny. Your hi-hat gets better.' },
           { label: 'Ask for a better review', effects: { mood: { recruit: -5 } },
             outcome: 'Issue 48 reviews the request. It is worse.' }])] },
      { id: 'safety_pins', text: 'Holds their entire outfit together with safety pins.', chem: 1, genres: ['punk'], cards: [
        card('qk_pins', 'weird', 'Wardrobe Malfunction',
          "Mid-set, {recruit}'s jacket gives up. Two hundred safety pins hit the stage at once. The front row picks them up like it is a treasure hunt.",
          [{ label: 'Make it merch', effects: { fund: 40, buzz: 3 },
            outcome: 'You sell the pins back to the crowd for a loonie each. It is the best merch night of the month.' },
           { label: 'Buy them a real jacket', effects: { fund: -60, mood: { recruit: -4 } },
             outcome: '{recruit} wears it once, then takes it apart and pins it back together. It is better now.' }])] },
      { id: 'transit', text: 'Refuses to own a car. Takes the city bus to every gig.', chem: 3, genres: ['punk'], cards: [
        card('qk_bus', 'road', 'The Last Bus',
          'The gig ends at 1 a.m. The last bus left at 12:40. {recruit} would rather walk six kilometres through snowbanks than get in the van. It is minus 29.',
          [{ label: 'Walk with them', effects: { chemistry: 5, burnout: 6 },
            outcome: 'The whole band walks home through the snow, carrying cymbals. It is the most punk thing you have ever done.' },
           { label: 'Pay for a cab ($30)', effects: { fund: -30, mood: { recruit: -3 } },
             outcome: '{recruit} rides in the cab under protest and tips the driver in zines.' }])] },
      { id: 'straight_edge', text: 'Straight edge. Drinks only milk. Aggressively.', chem: 2, genres: ['punk'], cards: [
        card('qk_milk', 'weird', 'Milk Rider',
          '{recruit} has added a rider to your contract: four litres of two percent, cold. The bar does not stock milk. The owner is on the phone to a dairy.',
          [{ label: 'Get the milk', effects: { fund: -15, mood: { recruit: 6 } },
            outcome: 'The bar buys a jug. By the encore half the crowd is drinking milk. It is a movement now.' },
           { label: 'Water is fine', effects: { mood: { recruit: -5 } },
             outcome: '{recruit} drinks water with the face of someone betrayed by the dairy industry.' }])] },
      { id: 'air_guitar', text: 'Former provincial air-guitar champion. Brings the trophy.', chem: 1, genres: ['rock'], cards: [
        card('qk_airguitar', 'fame', 'A Title Defence',
          "The air-guitar provincials are this weekend. {recruit} wants to defend the title instead of playing your gig. 'It is the same muscles,' they explain.",
          [{ label: 'Enter as a band', hint: 'Gamble: glory, or embarrassment', outcome: 'You all sign up.',
            roll: { chance: 0.5, stat: 'chemistry', statScale: 0.005,
              success: { effects: { buzz: 6, fans: 12 }, outcome: 'The whole band air-guitaring in sync. The judges weep. You win a trophy shaped like a guitar.' },
              fail: { effects: { burnout: 4, mood: { recruit: -4 } }, outcome: 'You tie for last with a man who air-guitared a banjo. The photos are online.' } } },
           { label: 'Play the gig', effects: { drumSkill: 1, mood: { recruit: -5 } },
             outcome: '{recruit} plays the real guitar all night like it personally let them down.' }])] },
      { id: 'hairspray', text: 'Goes through one can of hairspray per show.', chem: 0, genres: ['rock'], cards: [
        card('qk_hairspray', 'weird', 'The Hair Situation',
          "{recruit}'s hair is now taller than the kick drum. The venue has banned aerosols after the smoke alarm went off twice during soundcheck.",
          [{ label: 'Switch to gel', effects: { burnout: -2, mood: { recruit: -6 } },
            outcome: 'The hair drops four inches. So do the spirits. The smoke alarm has never been happier.' },
           { label: 'Style it in the alley', effects: { buzz: 3, burnout: 3 },
             outcome: '{recruit} styles it in the alley at minus twenty. It freezes solid in place. It looks incredible.' }])] },
      { id: 'classic_rock_trivia', text: 'Knows every classic-rock B-side. Tells you. Constantly.', chem: -1, genres: ['rock'], cards: [
        card('qk_trivia', 'drama', 'Trivia Night',
          '{recruit} has entered the band in pub trivia, music round only. They did not ask. The prize is a bar tab. The team name is already on the board.',
          [{ label: 'Play trivia', effects: { chemistry: 4, fund: 40 },
            outcome: '{recruit} answers every question before it is finished. You win the bar tab and a round of applause from the regulars.' },
           { label: 'Rehearse instead', effects: { drumSkill: 1, mood: { recruit: -5 } },
             outcome: '{recruit} quizzes you on B-sides between every song. You fail every one.' }])] },
      { id: 'lucky_bandana', text: 'Has a lucky bandana. Has not washed it since 2011.', chem: 1, genres: ['rock'], cards: [
        card('qk_bandana', 'weird', 'The Lucky Bandana',
          'The lucky bandana is gone. {recruit} says they cannot play without it. It was last seen near a washing machine, which is how everyone knows something is wrong.',
          [{ label: 'Search the van', effects: { chemistry: 3, burnout: 3 },
            outcome: 'Found under a seat, stiff enough to stand on its own. {recruit} plays the gig of their life.' },
           { label: 'Play without it', effects: { mood: { recruit: -6 } },
             outcome: '{recruit} plays fine and tells everyone it was cursed. The bandana turns up in the merch box. Clean.' }])] },
      { id: 'rodeo_clown', text: 'Retired rodeo clown. Still has the reflexes.', chem: 2, genres: ['country'], cards: [
        card('qk_rodeo', 'scene', 'One Last Rodeo',
          "{recruit}'s old rodeo crew is at the fair and they need a clown for the bull riding. 'One last time,' says {recruit}, already putting on the makeup.",
          [{ label: 'Let them clown', hint: 'Gamble: a legend, or a limp', outcome: '{recruit} vaults the fence.',
            roll: { chance: 0.55, stat: 'chemistry', statScale: 0.005,
              success: { effects: { buzz: 6, fans: 15 }, outcome: 'Three saves, one barrel roll and a standing ovation from the grandstand. Half of them come to your show.' },
              fail: { effects: { burnout: 5, mood: { recruit: -4 } }, outcome: 'The bull wins. {recruit} plays the gig sitting on an amp, still in makeup.' } } },
           { label: 'We need you on stage', effects: { chemistry: 2, mood: { recruit: -5 } },
             outcome: '{recruit} watches the bull riding from the side of the stage and yells advice between songs.' }])] },
      { id: 'square_dance_caller', text: 'Calls square dances. Cannot stop calling square dances.', chem: 3, genres: ['country'], cards: [
        card('qk_caller', 'weird', 'Allemande Left',
          'Mid-song, {recruit} starts calling a square dance. The crowd, who were not dancing, are now in squares. The bar owner is thrilled. The fire marshal is counting.',
          [{ label: 'Go with it', effects: { fans: 12, buzz: 3 },
            outcome: 'Eight squares, one song that lasts eleven minutes and the best bar sales of the season.' },
           { label: 'Stick to the setlist', effects: { mood: { recruit: -4 } },
             outcome: '{recruit} stops calling. The crowd stays in squares anyway, waiting. It is eerie.' }])] },
      { id: 'truck_named', text: 'Has named their truck. Refers to it as a bandmate.', chem: 1, genres: ['country'], cards: [
        card('qk_truck', 'road', 'Loretta Needs a Part',
          "{recruit}'s truck, Loretta, needs a part from a wrecker in the next town. {recruit} will not play until Loretta is 'resting comfortably'.",
          [{ label: 'Chip in for the part ($60)', effects: { fund: -60, mood: { recruit: 8 } },
            outcome: 'Loretta is fixed. {recruit} thanks the band on her behalf. Loretta honks. Nobody touched the horn.' },
           { label: 'Loretta can wait', effects: { mood: { recruit: -6 } },
             outcome: '{recruit} plays the whole set looking out the window at the parking lot.' }])] },
      { id: 'yodel', text: 'Can yodel. Will yodel.', chem: 0, genres: ['country'], cards: [
        card('qk_yodel', 'drama', 'The Yodel',
          "{recruit} wants a yodel break in the new song. Eight bars. 'Just a little one,' they say. There is no such thing as a little yodel.",
          [{ label: 'Give them eight bars', hint: 'Gamble: magic, or mayhem', outcome: 'The yodel begins.',
            roll: { chance: 0.5, stat: 'chemistry', statScale: 0.005,
              success: { effects: { buzz: 6, fans: 10 }, outcome: 'The crowd yodels back. A grandmother in the front row weeps. It is the moment of the night.' },
              fail: { effects: { chemistry: -3 }, outcome: 'The yodel goes on for sixteen bars. Then thirty-two. You end it with a crash cymbal.' } } },
           { label: 'No yodelling', effects: { mood: { recruit: -5 } },
             outcome: '{recruit} agrees, then hums a yodel under every song for a week.' }])] }
    ],

    chat: {
      happy: ["Best band I've ever answered a Kijiji ad for.", "Tuesday. I'll bring snacks.",
        "Told my mom I'm in a real band. She asked which one. I said this one.", 'Good week. {space} feels like home. A cold home.'],
      ok: ['k', 'Who has the extension cord?', 'Parking was a nightmare again.', 'Same setlist as last week?'],
      grumpy: ['Anyone else not paid yet or just me?', 'Cool. Cool cool cool.', 'My old band had a van with seats.', 'Still here. For now. Kidding. Mostly.']
    },

    looks: {
      shirts: {
        metal: ['#1b1a22', '#2b2b2b', '#5a1a1a', '#20304a', '#3a2a3a', '#101014'],
        punk: ['#c0392b', '#2d6a4f', '#1b1a22', '#6a4c93', '#e0a100'],
        rock: ['#2b3346', '#7a2630', '#3d3d3d', '#b5651d', '#1f4e79'],
        country: ['#8b5a2b', '#3d5a80', '#a52a2a', '#556b2f', '#d2b48c']
      }
    }
  };
  // v0.9: the metal-only quirks are Hail Damage's jokes (Marcel, Kenji, Tundra Wraith): their cards are gated to the band too.
  GG.content.recruits.quirks.forEach(function (q) {
    if (q.genres && q.genres.length === 1 && q.genres[0] === 'metal') q.cards.forEach(function (c) { c.gate = { band: ['hail_damage'] }; });
  });
})(window.GG);
