// road_cards.js: cards that pop up mid-drive in the van (owned by the WORLD agent). Same schema as the Monday
// cards (contracts CARD, type 'road'), resolved by GG.world.resolveRoad. Owner decision: Kenji drives, silently,
// every trip. He never speaks (never a speaker, never quoted); he only acts.
// Extra gate keys: minKm / maxKm (one-way road km of the trip), season: ['summer'|'fall'|'winter'|'spring'].
// Extra effect key: van: { condition: ±n } (the Moose Hearse's condition, 0..100).
// Hints: a roll's hint starts with "Gamble: "; a choice with a van effect always has a hint.
(function (GG) {
  GG.content.roadCards = [
    { id: 'road_moose', type: 'road', speaker: 'marcel', title: 'Moose on the Highway', once: false, cooldown: 8,
      gate: { minKm: 60 },
      text: 'A bull moose is standing on the centre line, chewing, unbothered. Kenji brakes. Marcel whispers: ' +
        '"He\'s the album cover. He\'s the whole album."',
      choices: [
        { label: "Wait. It's his highway.", hint: 'Late, but alive', effects: { burnout: 3, chemistry: 2 },
          outcome: 'Twenty-two minutes. The moose leaves when it is ready. Marcel waves. The moose does not wave back.' },
        { label: 'Marcel films it for the fans', hint: 'Gamble: content, or a dented grille',
          roll: { chance: 0.5, stat: 'buzz', statScale: 0.005,
            success: { effects: { buzz: 6, fans: 8 }, outcome: '"Moose headbangs to {band}" is technically a lie. The clip goes around anyway.' },
            fail: { effects: { mood: { marcel: -6 }, van: { condition: -3 } }, outcome: 'The moose charges the headlights. Marcel screams in a register he did not know he had.' } },
          outcome: 'Marcel rolls down the window, phone out.' },
        { label: 'Let Kenji handle it', hint: 'Moods ↑ · Van ↓', effects: { mood: { all: 3 }, van: { condition: -2 } },
          outcome: 'Kenji eases onto the shoulder and around the moose without a word. Nobody speaks for thirty kilometres. It was beautiful.' }
      ] },

    { id: 'road_yellowhead_flat', type: 'road', speaker: 'dana', title: 'Flat on the Yellowhead', once: false, cooldown: 10,
      gate: { minKm: 100 },
      text: 'Bang, flap-flap-flap. A flat, forty klicks from anywhere. The spare is also, somehow, flat. ' +
        "Dana is already reading the jack's manual out loud.",
      choices: [
        { label: 'Call Cousin Dale', hint: '−$60 and one of his stories', effects: { fund: -60, burnout: 3 },
          outcome: 'Dale shows up in ninety minutes with a tire that almost fits and a story about his ex. Sixty bucks, cash. "Family rate."' },
        { label: 'Flag down a grain truck', hint: 'Gamble: prairie kindness',
          roll: { chance: 0.55, stat: 'chemistry', statScale: 0.005,
            success: { effects: { chemistry: 4, fans: 5 }, outcome: 'A farmer named Lyle patches it in six minutes and asks for your demo. He plays it right there in the truck.' },
            fail: { effects: { burnout: 6, mood: { all: -3 } }, outcome: 'Four trucks. Nobody stops. One honks the first four notes of your riff. You are not sure how to feel.' } },
          outcome: 'Jaxon stands on the shoulder, waving both arms.' },
        { label: 'Everybody pushes to the next town', hint: 'Burnout ↑↑ · Chemistry ↑', effects: { burnout: 8, chemistry: 5 },
          outcome: 'Six kilometres. Marcel pushes in his cape. Kenji sits at the wheel, sunglasses on, as if this was always the plan.' }
      ] },

    { id: 'road_double_double', type: 'road', speaker: 'jaxon', title: 'Double-Double Stop', once: false, cooldown: 5, weight: 1.2,
      text: 'Jaxon has spotted a Tom Harton\'s sign and is making a noise like a dog at a window. ' +
        '"Just a double-double. Just a box of Tom-Bits. Just a little treat."',
      choices: [
        { label: 'Double-doubles for everyone', hint: '−$25 · Moods ↑', effects: { fund: -25, mood: { all: 4 }, burnout: -3 },
          outcome: 'Forty Tom-Bits for the road. Marcel eats the honey-dips ironically. Kenji takes his coffee black, silent, perfect.' },
        { label: 'Drive-through, keep moving', effects: { fund: -10, mood: { jaxon: 3 } },
          outcome: 'The drive-through line is fourteen trucks long. You make load-in. Barely.' },
        { label: "No stopping. We're professionals.", effects: { mood: { jaxon: -8 }, chemistry: -2 },
          outcome: 'Jaxon stares at the sign until it is gone. Then he stares at where it was for another ten minutes.' }
      ] },

    { id: 'road_grain_elevator', type: 'road', speaker: 'marcel', title: 'The Last Grain Elevator', once: false, cooldown: 12,
      gate: { minKm: 60, season: ['summer', 'fall'] },
      text: 'An old wooden grain elevator stands alone against the sky, paint peeling, the town name long gone. ' +
        'Marcel grips the headrest. "The press photo. Right now. The light is perfect."',
      choices: [
        { label: 'Pull over. Shoot it.', hint: 'Buzz ↑ · Late for load-in', effects: { buzz: 5, burnout: 3 },
          outcome: 'The band, squinting, in front of a grain elevator. The best photo you will ever take. You are late for load-in.' },
        { label: "It'll be perfect on the way home", effects: { mood: { marcel: -6 } },
          outcome: 'It is dark on the way home. Marcel mentions this at every stop sign.' },
        { label: 'Marcel shoots a solo portrait', hint: 'Gamble: majestic or meme',
          roll: { chance: 0.5,
            success: { effects: { buzz: 8, mood: { marcel: 8 } }, outcome: 'Marcel, cape in the wind, elevator behind him. Brooding. Majestic. On forty posters by Monday.' },
            fail: { effects: { mood: { marcel: -4 }, chemistry: -3 }, outcome: 'The cape wraps around his head. Dana gets all of it on video. Marcel will demand its deletion for years.' } },
          outcome: 'Marcel climbs the ditch, cape first.' }
      ] },

    { id: 'road_babas_lunch', type: 'road', speaker: 'baba', title: "Baba's Road Lunch", once: false, cooldown: 6,
      text: "Jaxon's baba has packed the band a lunch for the drive: a margarine tub of perogies, garlic sausage, " +
        'two dozen cabbage rolls and a note that just says EAT.',
      choices: [
        { label: 'Eat it now', hint: 'Moods ↑ · Burnout ↓', effects: { mood: { all: 5 }, burnout: -4 },
          outcome: 'The van smells like garlic sausage for eleven months. Nobody complains. Best meal of the year.' },
        { label: 'Save it for after the gig', effects: { chemistry: 4 },
          outcome: 'Cold perogies in a parking lot at 1 a.m., passed around like a trophy. It is a whole thing now.' },
        { label: 'Bribe the sound guy with it', hint: 'A better mix · Jaxon ↓', effects: { buzz: 3, mood: { jaxon: -4 } },
          outcome: 'The sound guy is moved to tears. Your mix is the best it will ever be. Jaxon mourns the cabbage rolls.' }
      ] },

    { id: 'road_whiteout', type: 'road', speaker: 'dana', title: 'Whiteout', once: false, cooldown: 6,
      gate: { minKm: 60, season: ['winter'] },
      text: 'Ground drift turns the highway into white nothing. You can see the hood and nothing past it. ' +
        'Kenji leans forward half an inch. Dana: "I\'m not saying we turn back. I\'m saying it out loud."',
      choices: [
        { label: "Follow a snowplow's lights", hint: 'Gamble: the plow knows the way',
          roll: { chance: 0.6, stat: 'chemistry', statScale: 0.004,
            success: { effects: { chemistry: 5 }, outcome: 'Eighty kilometres tucked in behind a plow, singing the whole way. You roll in with ten minutes to spare.' },
            fail: { effects: { burnout: 8, van: { condition: -5 } }, outcome: 'The plow turns off at a farm. You spend an hour in the ditch waiting for a guy with a chain.' } },
          outcome: 'Kenji tucks in behind the flashing lights.' },
        { label: 'Wait it out at a gas-bar', hint: '−$20 · Late', effects: { fund: -20, burnout: 4 },
          outcome: 'Two hours of gas-bar chili and a scratch ticket that wins you two dollars. You arrive late, but fed.' },
        { label: 'Trust Kenji', hint: 'Burnout ↑ · Van ↓', effects: { burnout: 5, van: { condition: -2 } },
          outcome: 'Kenji drives through it at exactly 60, never blinking. You arrive. Nobody knows how. Nobody asks.' }
      ] },

    { id: 'road_combine', type: 'road', speaker: 'jaxon', title: 'Stuck Behind a Combine', once: false, cooldown: 8,
      gate: { season: ['fall'] },
      text: 'Harvest. A combine the size of a house is doing 25 km/h down a two-lane highway with no plans to pull over. ' +
        'The farmer waves. Everybody waves back. You are going to be late.',
      choices: [
        { label: 'Pass it on the shoulder', hint: 'Gamble: Kenji vs. the shoulder',
          roll: { chance: 0.55,
            success: { effects: { buzz: 3 }, outcome: 'Kenji threads the gap with inches to spare. The farmer gives a slow, respectful nod. A legend is born.' },
            fail: { effects: { van: { condition: -6 }, burnout: 4 }, outcome: 'Gravel, sparks, and a mirror that now lives in a canola field.' } },
          outcome: 'Kenji checks the mirror. Once.' },
        { label: 'Enjoy the scenery', hint: 'Burnout ↓ · Chemistry ↑ · Dana ↓', effects: { burnout: -3, chemistry: 3, mood: { dana: -4 } },
          outcome: 'Golden fields, big sky, 25 km/h. The calmest the band has ever been. Dana times it: 71 minutes.' },
        { label: 'Take the grid road', hint: 'Van ↓ · Burnout ↑', effects: { van: { condition: -4 }, burnout: 3 },
          outcome: 'Forty kilometres of washboard gravel. Every cymbal in the van is now out of tune, somehow.' }
      ] },

    { id: 'road_fowl_supper', type: 'road', speaker: 'marcel', title: 'Fowl Supper Tonight', once: false, cooldown: 12,
      gate: { minKm: 60, season: ['fall'] },
      text: 'A hand-painted sign: FOWL SUPPER TONITE, $15, ALL WELCOME. The church lot is full of trucks. ' +
        'Jaxon has already undone his seatbelt.',
      choices: [
        { label: "Stop. We're only human.", hint: '−$45 · Moods ↑↑', effects: { fund: -45, mood: { all: 6 }, burnout: -4 },
          outcome: 'Turkey, three kinds of pie, and a church lady who wants you for their spring tea. You play the gig in a food coma.' },
        { label: 'Play a song for a free plate', hint: 'Gamble: metal for the church ladies',
          roll: { chance: 0.5, stat: 'buzz', statScale: 0.006,
            success: { effects: { fans: 12, mood: { all: 4 } }, outcome: 'One song. Forty seniors clap on one and three. Free supper, and a surprising number of new fans.' },
            fail: { effects: { mood: { marcel: -6 }, burnout: 3 }, outcome: "Marcel's growl makes a toddler cry. You eat fast and leave faster." } },
          outcome: 'Dana tunes in the church basement.' },
        { label: 'Keep driving. Discipline.', effects: { mood: { jaxon: -6 }, chemistry: -2 },
          outcome: 'Jaxon watches the church shrink in the side mirror like a man watching his dreams leave.' }
      ] },

    { id: 'road_banjo_hitchhiker', type: 'road', speaker: 'dana', title: 'Hitchhiker with a Banjo', once: false, cooldown: 16,
      gate: { minKm: 100 },
      text: 'A guy in a straw hat stands by a grid road with a banjo case and a sign that just says WEST. ' +
        'Dana slows down before anyone can vote.',
      choices: [
        { label: 'Give him a lift', hint: 'Gamble: banjo guy',
          roll: { chance: 0.5,
            success: { effects: { fans: 10, chemistry: 3 }, outcome: 'Prairie Pete plays one tune that makes Marcel cry, then vanishes at a gas-bar. He tells everyone about you.' },
            fail: { effects: { mood: { all: -4 }, burnout: 3 }, outcome: 'Pete knows one song. He plays it for 190 kilometres.' } },
          outcome: 'Pete squeezes in next to the bass drum.' },
        { label: 'Wave and keep going', effects: { mood: { dana: -4 } },
          outcome: 'Dana is quiet for a while. "He looked like he knew stuff," she says, eventually.' }
      ] },

    { id: 'road_pulled_over', type: 'road', speaker: 'marcel', title: 'Pulled Over', once: false, cooldown: 10,
      gate: { minKm: 60 },
      text: 'Lights in the mirror. A Mountie walks up, peers at the band, the drum kit, and Kenji\'s sunglasses. ' +
        '"Know how fast you were going?" Kenji says nothing. Kenji never says anything.',
      choices: [
        { label: 'Marcel explains, in French', hint: 'Gamble: charm the law',
          roll: { chance: 0.45,
            success: { effects: { buzz: 4, mood: { marcel: 6 } }, outcome: 'The officer answers in better French. Ten minutes on poetry. You get a warning and a book recommendation.' },
            fail: { effects: { fund: -80, mood: { marcel: -5 } }, outcome: 'An $80 ticket, plus a warning about the cape blocking the rear window.' } },
          outcome: 'Marcel leans across Kenji. "Bonsoir."' },
        { label: 'Just take the ticket', effects: { fund: -60 },
          outcome: '91 in a 90. Sixty bucks. Kenji folds the ticket into a perfect square and tucks it in the visor with the others.' },
        { label: 'Offer him a demo', hint: 'Gamble: bribery by metal',
          roll: { chance: 0.3,
            success: { effects: { fans: 6, buzz: 3 }, outcome: 'He listens in the cruiser, nodding. No ticket. He is coming to the show.' },
            fail: { effects: { fund: -60, burnout: 3 }, outcome: '"Is this a bribe?" It is not. The ticket is $60. He keeps the demo as evidence.' } },
          outcome: 'You hold out the demo like a peace offering.' }
      ] },

    { id: 'road_northern_lights', type: 'road', speaker: 'dana', title: 'Northern Lights', once: false, cooldown: 12,
      gate: { season: ['fall', 'winter', 'spring'] },
      text: 'Halfway home the sky goes green. Then purple. The whole band goes quiet, even Marcel. ' +
        'Kenji pulls onto a field approach without being asked.',
      choices: [
        { label: 'Get out and look', hint: 'Chemistry ↑ · Home late', effects: { chemistry: 6, burnout: 3, mood: { all: 4 } },
          outcome: 'Twenty minutes, freezing, nobody talks. Dana says it is the best show she has seen all year. Nobody argues.' },
        { label: 'Marcel writes a song about it', effects: { mood: { marcel: 5 }, buzz: 2 },
          outcome: 'Marcel fills six pages in the dark. None of it is legible. All of it is, somehow, about the lawn.' },
        { label: 'Keep driving. Work tomorrow.', effects: { burnout: -3 },
          outcome: 'Sensible. Home by one. It is still out there, doing its thing, without you.' }
      ] },

    { id: 'road_van_noise', type: 'road', speaker: 'jaxon', title: 'A New Noise', once: false, cooldown: 6,
      text: 'A new noise from under the Moose Hearse: part whale, part shopping cart. ' +
        'Kenji turns the radio down one notch, which for Kenji is a scream.',
      choices: [
        { label: 'Turn the radio back up', hint: 'Free · Van ↓↓', effects: { van: { condition: -5 } },
          outcome: 'The noise becomes a kind of harmony. By the gig it is almost in key.' },
        { label: 'Pull into a garage in Davidson', hint: '−$50 · Van ↑', effects: { fund: -50, van: { condition: 8 } },
          outcome: 'The mechanic pulls a full-size hubcap out of somewhere it should not be. It is not even your hubcap.' },
        { label: 'Dana diagnoses it', hint: 'Gamble: Dana vs. the van',
          roll: { chance: 0.5, stat: 'chemistry', statScale: 0.004,
            success: { effects: { van: { condition: 6 }, mood: { dana: 6 } }, outcome: 'Four minutes under the van. Dana emerges with a pinecone. The noise stops. She is unbearable for a week.' },
            fail: { effects: { van: { condition: -3 }, mood: { dana: -5 } }, outcome: 'Dana tightens a thing. The noise moves to a different part of the van. Now it whistles.' } },
          outcome: 'Dana is already lying on the gravel.' }
      ] },

    { id: 'road_potholes', type: 'road', speaker: 'jaxon', title: 'Pothole Season', once: false, cooldown: 6,
      gate: { season: ['spring'] },
      text: 'Spring thaw. The highway is forty percent pothole. Every hit launches the cymbal stands a foot in the air. ' +
        'Jaxon is holding the bass drum like a baby.',
      choices: [
        { label: 'Slow down to 60', hint: 'Late · Burnout ↑', effects: { burnout: 4 },
          outcome: 'You arrive late but intact. The cymbals thank you.' },
        { label: 'Kenji knows every pothole', hint: 'Gamble: trust the sunglasses',
          roll: { chance: 0.6,
            success: { effects: { chemistry: 4 }, outcome: 'Kenji weaves like a slalom skier. Not one hit. The band applauds. Kenji adjusts his sunglasses.' },
            fail: { effects: { van: { condition: -6 }, mood: { jaxon: -4 } }, outcome: 'Kenji knew every pothole but one. It was very deep. The Moose Hearse now pulls left.' } },
          outcome: 'Kenji cracks his knuckles. Silently.' }
      ] },

    { id: 'road_one_station', type: 'road', speaker: 'marcel', title: 'One Radio Station', once: false, cooldown: 8,
      gate: { minKm: 100 },
      text: 'Out here the radio gets exactly one station: the farm report, then an hour of polka. ' +
        "Marcel has started humming along. He's trying to stop. He can't.",
      choices: [
        { label: 'Embrace the polka', effects: { chemistry: 5, mood: { marcel: -3 } },
          outcome: 'By Chamberlain the whole van is doing the chicken dance, seated. Jaxon wants a polka breakdown in the new song.' },
        { label: 'Play your demo on repeat', hint: 'Your chops ↑ · Moods ↓', effects: { drumSkill: 1, mood: { all: -4 } },
          outcome: 'By the ninth listen you have found four mistakes, all yours. You practise them on the dashboard.' },
        { label: 'Silence. Like Kenji.', effects: { burnout: -4 },
          outcome: 'Two hundred kilometres of perfect silence. Kenji seems pleased. You think. It is hard to tell.' }
      ] }
  ];
})(window.GG);
