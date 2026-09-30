// road_cards.js: cards that pop up mid-drive in the van (owned by the WORLD agent). Same schema as the Monday
// cards (contracts CARD, type 'road'), resolved by GG.world.resolveRoad. Owner decision: Kenji drives, silently,
// every trip. He never speaks (never a speaker, never quoted); he only acts.
// Extra gate keys: minKm / maxKm (one-way road km of the trip), season: ['summer'|'fall'|'winter'|'spring'],
//   v0.6.1: driver: [memberId|'you'] (who drives: cards about Kenji at the wheel are gated to him; when the driver quits,
//   YOU drive and the 'you' pool opens: wrong turns, gas-station arguments), weather: [C.WEATHER kind at the destination],
//   holiday: [content/calendar.js holiday id].
// v0.6.1 also: GG.content.drivers (Addendum 1 C1), one designated driver per band + 'you' (see the bottom of this file).
// Extra effect key: van: { condition: ±n } (the Moose Hearse's condition, 0..100).
// Hints: a roll's hint starts with "Gamble: "; a choice with a van effect always has a hint.
// v0.9 "Genres": every band drives. Cards in Hail Damage's voice (Marcel's cape, Baba's lunch, Kenji at the wheel) are
//   gated band: ['hail_damage'] (or driver: ['kenji'], which only Hail Damage has); the shared cards speak through role
//   aliases ('@front', '@soloist', '@filler', '@grumbler') and tokens ({front} {soloist} {filler} {grumbler} {deadpan}),
//   so they read right for any lineup. A few neutral copies of Hail Damage-only classics (frozen van, hail, the you-drive
//   pool, an anywhere card) are gated to the other three bands so Hail Damage's own road deck stays exactly as it was.
//   The band packs (zz_band_*.js) push each driver's own pool (Moth, T-Bone, Earl) into this array.
(function (GG) {
  var HD = ['hail_damage'], OTHERS = ['frost_heave', 'gravel_kings', 'grid_road_ramblers'];
  GG.content.roadCards = [
    { id: 'road_moose', type: 'road', speaker: 'marcel', title: 'Moose on the Highway', once: false, cooldown: 8,
      gate: { minKm: 60, driver: ['kenji'] },
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
      gate: { minKm: 100, driver: ['kenji'] },
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
      gate: { driver: ['kenji'] },
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

    { id: 'road_grain_elevator', type: 'road', speaker: '@front', title: 'The Last Grain Elevator', once: false, cooldown: 12,
      gate: { minKm: 60, season: ['summer', 'fall'] },
      text: 'An old wooden grain elevator stands alone against the sky, paint peeling, the town name long gone. ' +
        '{front} grips the headrest. "The press photo. Right now. The light is perfect."',
      choices: [
        { label: 'Pull over. Shoot it.', hint: 'Buzz ↑ · Late for load-in', effects: { buzz: 5, burnout: 3 },
          outcome: 'The band, squinting, in front of a grain elevator. The best photo you will ever take. You are late for load-in.' },
        { label: "It'll be perfect on the way home", effects: { mood: { '@front': -6 } },
          outcome: 'It is dark on the way home. {front} mentions this at every stop sign.' },
        { label: 'A solo portrait of the singer', hint: 'Gamble: majestic or meme',
          roll: { chance: 0.5,
            success: { effects: { buzz: 8, mood: { '@front': 8 } }, outcome: '{front}, hair in the wind, the elevator behind. Brooding. Majestic. On forty posters by Monday.' },
            fail: { effects: { mood: { '@front': -4 }, chemistry: -3 }, outcome: 'The wind wraps a jacket around {front}\'s head. {soloist} gets all of it on video. The deletion requests go on for years.' } },
          outcome: '{front} climbs the ditch, chin first.' }
      ] },

    { id: 'road_babas_lunch', type: 'road', speaker: 'baba', title: "Baba's Road Lunch", once: false, cooldown: 6,
      gate: { band: HD },
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
      gate: { minKm: 60, season: ['winter'], driver: ['kenji'] },
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
      gate: { season: ['fall'], driver: ['kenji'] },
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
      gate: { minKm: 60, season: ['fall'], band: HD },
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
      gate: { minKm: 100, band: HD },
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
      gate: { minKm: 60, driver: ['kenji'] },
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
      gate: { season: ['fall', 'winter', 'spring'], driver: ['kenji'] },
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
      gate: { driver: ['kenji'] },
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
      gate: { season: ['spring'], driver: ['kenji'] },
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
      gate: { minKm: 100, driver: ['kenji'] },
      text: 'Out here the radio gets exactly one station: the farm report, then an hour of polka. ' +
        "Marcel has started humming along. He's trying to stop. He can't.",
      choices: [
        { label: 'Embrace the polka', effects: { chemistry: 5, mood: { marcel: -3 } },
          outcome: 'By Chamberlain the whole van is doing the chicken dance, seated. Jaxon wants a polka breakdown in the new song.' },
        { label: 'Play your demo on repeat', hint: 'Your chops ↑ · Moods ↓', effects: { drumSkill: 1, mood: { all: -4 } },
          outcome: 'By the ninth listen you have found four mistakes, all yours. You practise them on the dashboard.' },
        { label: 'Silence. Like Kenji.', effects: { burnout: -4 },
          outcome: 'Two hundred kilometres of perfect silence. Kenji seems pleased. You think. It is hard to tell.' }
      ] },

    /* ---- v0.6.1 (Addendum 1 C1 + C7): the van's classics, weather, seasons, holidays ---------------------------------- */
    { id: 'road_deer_yellowhead', type: 'road', speaker: '@soloist', title: 'Deer on the Yellowhead', once: false, cooldown: 8,
      gate: { minKm: 100 },
      text: 'Three deer on the Yellowhead, standing in the headlights like a tribute band waiting for a cue. Nobody moves. The deer do not move either.',
      choices: [
        { label: 'Brake and wait', hint: 'Safe, slow', effects: { burnout: 3, chemistry: 2 },
          outcome: 'Four minutes. The deer leave in single file, like they rehearsed it. {front} calls them "the rhythm section".' },
        { label: 'Honk the riff', hint: 'Gamble: deer have taste',
          roll: { chance: 0.6, success: { effects: { buzz: 4, mood: { all: 3 } }, outcome: 'They bolt on the downbeat. Perfect timing. {soloist} is weirdly proud.' },
            fail: { effects: { van: { condition: -4 }, burnout: 3 }, outcome: 'One deer headbutts the grille on the "and" of four. Off-beat AND rude.' } },
          outcome: 'Da-da-DUN-da on the horn.' },
        { label: 'High beams, slowly', hint: 'Van ↓', effects: { van: { condition: -1 }, mood: { '@soloist': 3 } },
          outcome: 'You creep past. The biggest one stares at the van like it owes him money.' }
      ] },

    { id: 'road_shotgun', type: 'road', speaker: 'jaxon', title: 'The Fight Over Shotgun', once: false, cooldown: 10,
      gate: { driver: ['kenji'] },
      text: 'Jaxon has called shotgun since Tuesday. Marcel says a frontman rides up front. You are the founder: the seat is yours by band law. Nobody has ever read band law.',
      choices: [
        { label: "Founder's seat. Final.", hint: 'You ride up front · moods ↓', effects: { burnout: -3, mood: { jaxon: -4, marcel: -3 } },
          outcome: 'You ride shotgun next to Kenji. Two hundred kilometres of silence and legroom. Marcel sulks in the back in his cape.' },
        { label: 'Give it to Marcel', effects: { mood: { marcel: 6, jaxon: -5 } },
          outcome: 'Marcel rides up front like royalty. He waves at every farmhouse. One farmer waves back. He talks about it for a week.' },
        { label: 'Rock-paper-scissors, best of 7', hint: 'Gamble: chemistry or a feud',
          roll: { chance: 0.55, stat: 'chemistry', statScale: 0.005,
            success: { effects: { chemistry: 4 }, outcome: 'Dana wins, somehow, without playing. Everyone agrees that is fair. Band law is amended.' },
            fail: { effects: { chemistry: -3, burnout: 3 }, outcome: 'Game six is disputed. Game seven is a riot. Kenji pulls over and waits, sunglasses on, until it stops.' } },
          outcome: 'Jaxon cracks his knuckles.' }
      ] },

    { id: 'road_cape_door', type: 'road', speaker: 'marcel', title: 'Cape in the Sliding Door', once: false, cooldown: 12,
      gate: { band: HD },
      text: 'Marcel slams the sliding door on his cape (or, capeless, his good scarf). It flaps outside the van for eighty kilometres like a flag of surrender.',
      choices: [
        { label: 'Pull over and free him', hint: 'Burnout ↑ · Marcel ↑', effects: { burnout: 3, mood: { marcel: 5 } },
          outcome: 'The cape comes free with a sound like a bat leaving a cave. It has a bug in it. Several bugs. Marcel keeps them.' },
        { label: "Let it fly. It's a look.", hint: 'Buzz ↑ · Van ↓', effects: { buzz: 4, van: { condition: -1 } },
          outcome: 'A trucker takes a photo. It ends up on a gas-station corkboard: "SAW THIS BAND. CAPE OUTSIDE. 10/10."' },
        { label: 'Film it for the fans', hint: 'Gamble: content',
          roll: { chance: 0.5, stat: 'buzz', statScale: 0.005,
            success: { effects: { buzz: 7, fans: 6 }, outcome: '"The Hail Damage Cape Flag" does numbers. Somebody makes it a sticker.' },
            fail: { effects: { mood: { marcel: -6 } }, outcome: 'The cape tears clean off at Watrous. Marcel watches it tumble into a canola field. A moment of silence is held.' } },
          outcome: 'Jaxon hangs out the window with his phone.' }
      ] },

    { id: 'road_whiteout_tch', type: 'road', speaker: '@soloist', title: 'Whiteout on the Trans-Canada', once: false, cooldown: 6,
      gate: { minKm: 60, weather: ['blizzard', 'snow'] },
      text: 'The Trans-Canada disappears. White above, white below, white sideways. The only proof of the road is the rumble strip, which is also, now, the only music.',
      choices: [
        { label: 'Motel in the next town', hint: '−$90 · rested', effects: { fund: -90, burnout: -4 },
          outcome: 'The motel has a heart-shaped hot tub and a velvet painting of a moose. You make the gig with an hour to spare.' },
        { label: 'Follow a snowplow', hint: 'Slow · chemistry ↑', effects: { burnout: 6, chemistry: 3 },
          outcome: 'Thirty km/h behind the blue lights for two hours. Somebody starts a sing-along. It is your own song. It still counts.' },
        { label: 'Push on', hint: 'Gamble: legend or ditch',
          roll: { chance: 0.5, success: { effects: { buzz: 5 }, outcome: 'You roll in at showtime, snow to the knees. The crowd cheers like you walked here. You basically did.' },
            fail: { effects: { van: { condition: -6 }, fund: -80 }, outcome: 'The ditch finds you. A farmer with a tractor finds the ditch. Eighty dollars and a thermos of coffee.' } },
          outcome: 'Hazard lights on.' }
      ] },

    { id: 'road_frozen_van', type: 'road', speaker: 'neighbour', title: 'Frozen Solid', once: false, cooldown: 8,
      gate: { season: ['winter'], band: HD },
      text: 'Minus 34. Nobody plugged the van in. It makes a noise like a moose with a head cold. Mr. Lindqvist is watching from his driveway, holding jumper cables and a lesson.',
      choices: [
        { label: 'Accept the boost (and lesson)', hint: 'Burnout ↑', effects: { burnout: 4, chemistry: 2 },
          outcome: 'Forty minutes on block heaters, alternators and "kids today". The van starts. Mr. Lindqvist almost smiles.' },
        { label: 'Hair dryer on the engine', hint: 'Gamble: prairie engineering',
          roll: { chance: 0.5, success: { effects: { mood: { all: 4 } }, outcome: 'It works. Dana will never let anyone forget it was her idea.' },
            fail: { effects: { van: { condition: -3 }, fund: -40 }, outcome: 'The hair dryer dies. Then the extension cord. Then the fuse. Cab money, forty bucks.' } },
          outcome: 'Dana finds an extension cord.' },
        { label: 'Gear on a toboggan, cab it', hint: '−$80', effects: { fund: -80, burnout: 3 },
          outcome: 'The cab driver helps carry the kick drum. He has opinions about double bass. He is right.' }
      ] },

    // v0.9: the frozen van for everyone else (no Mr. Lindqvist next door)
    { id: 'road_frozen_solid', type: 'road', speaker: '@grumbler', title: 'Minus Thirty-Four', once: false, cooldown: 8,
      gate: { season: ['winter'], band: OTHERS },
      text: 'Minus 34. Nobody plugged the van in. It makes a noise like a moose with a head cold. {grumbler} says this is exactly what they said would happen. Nobody remembers them saying it.',
      choices: [
        { label: 'Flag down a boost', hint: 'Burnout ↑', effects: { burnout: 4, chemistry: 2 },
          outcome: 'A guy in a snowmobile suit has cables, a thermos and forty minutes of opinions about block heaters. The van starts. He wants a shout-out.' },
        { label: 'Hair dryer on the engine', hint: 'Gamble: prairie engineering',
          roll: { chance: 0.5, success: { effects: { mood: { all: 4 } }, outcome: 'It works. {soloist} will never let anyone forget whose idea it was.' },
            fail: { effects: { van: { condition: -3 }, fund: -40 }, outcome: 'The hair dryer dies. Then the extension cord. Then the fuse. Cab money, forty bucks.' } },
          outcome: '{soloist} finds an extension cord.' },
        { label: 'Gear on a toboggan, cab it', hint: '−$80', effects: { fund: -80, burnout: 3 },
          outcome: 'The cab driver helps carry the amps. He has opinions about your genre. He is right.' }
      ] },

    { id: 'road_construction', type: 'road', speaker: '@filler', title: 'Road Construction', once: false, cooldown: 8,
      gate: { minKm: 60, season: ['summer'] },
      text: 'A flag person, one lane, a forty-minute wait. There are two seasons on the prairies: winter and construction.',
      choices: [
        { label: 'Wait it out', hint: 'Burnout ↑', effects: { burnout: 3 },
          outcome: 'The flag person flips the sign to SLOW and gives you a thumbs-up. She saw you at the Legion. She has notes.' },
        { label: 'Band practice in the van', hint: 'Chemistry ↑', effects: { chemistry: 3, mood: { all: 2 } },
          outcome: 'Air guitar, lap drums, {front} harmonizing with the backup beeper of a grader. It is honestly tight.' },
        { label: 'Detour down a grid road', hint: 'Gamble: shortcut or gravel',
          roll: { chance: 0.5, success: { effects: { fans: 4, buzz: 3 }, outcome: 'The grid road goes right past a farmyard party. You leave with a flatbed of new fans.' },
            fail: { effects: { van: { condition: -4 }, burnout: 4 }, outcome: 'Gravel. Washboard. Forty minutes of it. Your fillings are loose. The van is looser.' } },
          outcome: 'You spot a gap in the ditch.' }
      ] },

    { id: 'road_mosquitoes', type: 'road', speaker: 'jaxon', title: 'Mosquito Cloud', once: false, cooldown: 8,
      gate: { season: ['summer'], band: HD },
      text: 'A gas stop next to a slough at dusk. The mosquitoes find Jaxon first. Then everyone. Then, briefly, the van itself.',
      choices: [
        { label: 'Bug spray for everyone', hint: '−$15 · moods ↑', effects: { fund: -15, mood: { all: 3 } },
          outcome: 'Deep Woods Extreme, the whole can. The band smells like a chemistry set for the rest of the night. The crowd assumes it is a choice.' },
        { label: 'Run for the van!', hint: 'Burnout ↑', effects: { burnout: 3, chemistry: 2 },
          outcome: 'Everyone sprints. Marcel trips on his cape. Seventy-four bites between the five of you. Jaxon counts them. Out loud.' },
        { label: 'Film "Mosquito Mosh"', hint: 'Gamble: content',
          roll: { chance: 0.5, success: { effects: { buzz: 5 }, outcome: 'The band flailing at a slough, slowed down with a breakdown under it. It goes around. Hard.' },
            fail: { effects: { mood: { jaxon: -5 } }, outcome: 'The footage is ninety seconds of Jaxon screaming. The mosquitoes win.' } },
          outcome: 'Dana hits record.' }
      ] },

    { id: 'road_hailstorm', type: 'road', speaker: 'marcel', title: 'Hailstorm', once: false, cooldown: 6,
      gate: { weather: ['hail'], band: HD },
      text: 'Hail the size of perogies, drumming on the Moose Hearse. Marcel presses his face to the glass: "They are calling our NAME." Hail Damage takes hail personally.',
      choices: [
        { label: 'Wait under an overpass', hint: 'Burnout ↑', effects: { burnout: 3 },
          outcome: 'Twelve minutes under the bridge with two grain trucks and a family of four. Marcel shares his granola. Friends for life.' },
        { label: "Keep driving. It's OUR weather.", hint: 'Van ↓ · buzz ↑', effects: { van: { condition: -5 }, buzz: 6, chemistry: 3 },
          outcome: 'You drive through it screaming the chorus. The van looks like a golf ball now. It has never looked more on-brand.' },
        { label: 'Film the hail on the roof', hint: 'Gamble: a new drum loop',
          roll: { chance: 0.55, success: { effects: { buzz: 5, fans: 5 }, outcome: 'Hail on the roof, perfectly in time. You post it as "new album teaser". Nobody knows you are joking.' },
            fail: { effects: { van: { condition: -3 } }, outcome: 'A perogy-sized hailstone takes out the antenna mid-take. The radio is now permanently on one station.' } },
          outcome: 'Phones out, windows up.' }
      ] },

    // v0.9: hail for everyone else (Hail Damage takes hail personally; the others just take it)
    { id: 'road_hail_alley', type: 'road', speaker: '@grumbler', title: 'Hail Alley', once: false, cooldown: 6,
      gate: { weather: ['hail'], band: OTHERS },
      text: 'Hail the size of perogies, drumming on the roof like a drummer with something to prove. {grumbler} has read the insurance forms. {grumbler} is not calm.',
      choices: [
        { label: 'Wait under an overpass', hint: 'Burnout ↑', effects: { burnout: 3 },
          outcome: 'Twelve minutes under the bridge with two grain trucks and a family of four. {front} shares the snacks. Friends for life.' },
        { label: 'Keep driving. Hats on.', hint: 'Van ↓ · buzz ↑', effects: { van: { condition: -5 }, buzz: 6, chemistry: 3 },
          outcome: 'You drive through it screaming the chorus. The van looks like a golf ball now. The crowd hears the story and cheers the dents.' },
        { label: 'Film the hail on the roof', hint: 'Gamble: a new drum loop',
          roll: { chance: 0.55, success: { effects: { buzz: 5, fans: 5 }, outcome: 'Hail on the roof, perfectly in time. You post it as "new album teaser". Nobody knows you are joking.' },
            fail: { effects: { van: { condition: -3 } }, outcome: 'A hailstone takes out the antenna mid-take. The radio is now permanently on one station.' } },
          outcome: 'Phones out, windows up.' }
      ] },

    { id: 'road_heat_wave', type: 'road', speaker: '@soloist', title: 'Heat Wave', once: false, cooldown: 6,
      gate: { weather: ['heat'] },
      text: "Thirty-four degrees. The van's air conditioning is a window that rolls down halfway. The gear cases are too hot to touch. The chips on the dash have melted into one chip.",
      choices: [
        { label: 'Slushies at the next town', hint: '−$20 · moods ↑', effects: { fund: -20, mood: { all: 4 } },
          outcome: 'Blue slushies all round. Blue tongues all round. {front} says it is a look. {front} is right.' },
        { label: 'Windows down, demo up', hint: 'Buzz ↑ · burnout ↑', effects: { buzz: 3, burnout: 3 },
          outcome: 'You blast the demo through every town at full volume. A kid on a bike loses his mind. Worth it.' },
        { label: 'Stop at a lake', hint: 'Gamble: a swim or a sunburn',
          roll: { chance: 0.6, success: { effects: { burnout: -6, chemistry: 3 }, outcome: 'Twenty minutes in a prairie lake. Everyone comes out a better person. Slightly greener.' },
            fail: { effects: { burnout: 4, mood: { '@filler': -4 } }, outcome: 'Leeches. {filler} does not want to talk about it. {filler} talks about it for three hours.' } },
          outcome: 'There is a lake sign.' }
      ] },

    { id: 'road_xmas_lights', type: 'road', speaker: '@front', title: 'The Christmas Lights Farm', once: false, cooldown: 18,
      gate: { holiday: ['christmas'] },
      text: 'A farmyard off the highway with forty thousand Christmas lights, a light-up moose and a speaker playing carols. {front} is already out of the seatbelt.',
      choices: [
        { label: 'Five minutes. FIVE.', hint: 'Moods ↑', effects: { mood: { all: 4 }, burnout: -3 },
          outcome: 'It is twenty-five minutes. The farmer gives you hot chocolate and asks you to play next year. You say yes.' },
        { label: 'Photo with the moose', hint: 'Buzz ↑', effects: { buzz: 4 },
          outcome: 'The band, in matching toques, in front of a light-up moose. It becomes the band Christmas card. Somebody\'s mom frames it.' },
        { label: 'No stopping', effects: { mood: { '@front': -5 } },
          outcome: '{front} watches the lights disappear in the side mirror like someone watching their childhood leave.' }
      ] },

    { id: 'road_long_weekend', type: 'road', speaker: '@filler', title: 'Long-Weekend Traffic', once: false, cooldown: 18,
      gate: { holiday: ['canada_day'], minKm: 60 },
      text: 'Canada Day. Every camper trailer in the province is on the same highway, doing 70, towing a boat. One has a flag the size of your van.',
      choices: [
        { label: 'Enjoy the parade', hint: 'Burnout ↑ · chemistry ↑', effects: { burnout: 3, chemistry: 3 },
          outcome: 'You honk at every flag. Every flag honks back. By the next town it is a convoy. Somebody waves a hockey stick.' },
        { label: 'Hand flyers to the campers', hint: 'Fans ↑', effects: { fans: 6, burnout: 3 },
          outcome: '{filler} runs flyers along the line at a construction stop. Six campers promise to come. Two bring lawn chairs.' },
        { label: 'Grid-road shortcut', hint: 'Gamble: gravel or glory',
          roll: { chance: 0.5, success: { effects: { mood: { all: 3 } }, outcome: 'Empty gravel all the way. You beat the convoy by an hour.' },
            fail: { effects: { van: { condition: -3 } }, outcome: 'Every other band had the same idea. It is a grid-road traffic jam. With cows.' } },
          outcome: '{soloist} opens the road atlas.' }
      ] },

    // v0.9: an anywhere card for the other three bands (Hail Damage's are Baba's lunch and the cape in the door)
    { id: 'road_giant_perogy', type: 'road', speaker: '@filler', title: "The World's Largest Perogy", once: false, cooldown: 12,
      gate: { band: OTHERS },
      text: "A sign: WORLD'S LARGEST PEROGY, 2 KM. {filler} is already pointing. Nobody is sure the claim holds up. Nobody wants to be the one to check.",
      choices: [
        { label: 'Photo with the perogy', hint: 'Buzz ↑ · Burnout ↑', effects: { buzz: 4, burnout: 3 },
          outcome: 'The band, squinting, under a giant perogy on a giant fork. It is the best press photo you have. It is not close.' },
        { label: 'Lunch at the perogy café', hint: '−$30 · Moods ↑', effects: { fund: -30, mood: { all: 4 } },
          outcome: 'The café under the perogy serves perogies. Of course it does. {front} orders three dozen "for the road". They do not survive the road.' },
        { label: 'Write a song about it', hint: 'Gamble: a hit or a novelty',
          roll: { chance: 0.5, stat: 'chemistry', statScale: 0.005,
            success: { effects: { fans: 6, chemistry: 3 }, outcome: 'Four chords, a chorus about sour cream. The crowd sings it back at the gig. Nobody saw that coming.' },
            fail: { effects: { mood: { '@front': -4 } }, outcome: 'It rhymes "perogy" with "fogey". {deadpan} asks for it never to be played again. It is played again.' } },
          outcome: '{front} writes the chorus on a napkin.' }
      ] },

    /* ---- YOU drive (the band's driver quit): wrong turns, gas-station arguments ------------------------------------------ */
    { id: 'road_wrong_turn', type: 'road', speaker: 'dana', title: 'Wrong Turn', once: false, cooldown: 4,
      gate: { driver: ['you'], band: HD },
      text: 'You were supposed to turn at the last town. You are now somewhere with a grain elevator, a Co-op and no road signs. Kenji never missed a turn. Kenji is not here.',
      choices: [
        { label: 'Ask at the Co-op', hint: 'Burnout ↑ · fans ↑', effects: { burnout: 3, fans: 3 },
          outcome: 'The cashier draws you a map on a receipt and buys a CD. She says it is for her son. It is for her.' },
        { label: 'Trust the phone GPS', hint: 'Gamble: satellites vs. the prairie',
          roll: { chance: 0.5, success: { effects: { chemistry: 2 }, outcome: 'Recalculating... it works. The band claps. You bow. You nearly miss the next turn.' },
            fail: { effects: { burnout: 5, fund: -30 }, outcome: 'The GPS sends you down a grid road that becomes a field. Extra gas, a flat of patience.' } },
          outcome: 'You hold the phone up to the sky like it is an offering.' },
        { label: 'U-turn. Blame Jaxon.', effects: { chemistry: -3, mood: { jaxon: -4 } },
          outcome: 'Jaxon was asleep. It does not matter. It will never matter. The band has chosen its story.' }
      ] },

    { id: 'road_gas_argument', type: 'road', speaker: 'jaxon', title: 'Gas Station Argument', once: false, cooldown: 4,
      gate: { driver: ['you'], band: HD },
      text: 'Pump 4. Who is paying? Marcel says he paid last time. He did not. Dana has a spreadsheet. Jaxon has a family-size bag of ketchup chips and no wallet.',
      choices: [
        { label: 'The band fund pays', hint: '−$40', effects: { fund: -40, chemistry: 2 },
          outcome: 'The band fund pays. The band fund always pays. The band fund is the adult in this van.' },
        { label: 'Split it evenly', hint: 'Moods ↓', effects: { mood: { all: -3 } },
          outcome: 'Twenty minutes of math at the pump. Somebody owes somebody $3.40. It will be brought up at the reunion.' },
        { label: 'Loser of the argument pays', hint: 'Gamble: debate club',
          roll: { chance: 0.5, success: { effects: { chemistry: 3 }, outcome: 'Marcel loses, with dignity, in a cape. He pays in coins. Exact change. A legend.' },
            fail: { effects: { chemistry: -4, burnout: 3 }, outcome: 'Nobody loses. Everybody loses. The attendant pays, out of pity. You tip him in merch.' } },
          outcome: 'Dana opens the spreadsheet.' }
      ] },

    { id: 'road_lead_foot', type: 'road', speaker: 'marcel', title: 'Lead Foot', once: false, cooldown: 6,
      gate: { driver: ['you'], minKm: 60, band: HD },
      text: 'You drive like you drum: fine on the straight parts, way too fast in the fills. A photo radar van blinks at you outside Davidson. Marcel waves at it.',
      choices: [
        { label: 'Pay the ticket', hint: '−$120', effects: { fund: -120 },
          outcome: 'The photo is actually great. Marcel is mid-wave, cape up. It becomes the new press shot.' },
        { label: 'Drive like Kenji now', hint: 'Burnout ↑ · safe', effects: { burnout: 4, chemistry: 2 },
          outcome: 'Exactly the limit, both hands on the wheel, sunglasses on. The band sits up straight. It feels like church.' },
        { label: 'Blame the tempo', hint: 'Gamble: a warning',
          roll: { chance: 0.4, success: { effects: { buzz: 3 }, outcome: 'The officer is a drummer. You get a warning and a tip about ride cymbals.' },
            fail: { effects: { fund: -150 }, outcome: 'The officer is not a drummer. The officer is a clarinet player. It is worse.' } },
          outcome: 'You roll down the window.' }
      ] },

    { id: 'road_driver_music', type: 'road', speaker: '@soloist', title: 'Driver Picks the Music', once: false, cooldown: 6,
      gate: { driver: ['you'] },
      text: 'The rule: the driver picks the music. You are the driver. You put on your own demo. On repeat. The band makes a noise like a van full of cats.',
      choices: [
        { label: 'The demo. On repeat.', hint: 'Moods ↓ · chemistry ↑', effects: { mood: { all: -3 }, chemistry: 3 },
          outcome: 'By the fourth listen everyone is critiquing the bridge. By the tenth they are fixing it. It is basically rehearsal.' },
        { label: 'Give the singer the aux', effects: { mood: { '@front': 5, '@soloist': -3 } },
          outcome: 'Four hours of Gregorian chant and one polka. {front} says it is "research". It might be.' },
        { label: 'Silence. Total silence.', hint: 'Burnout ↓', effects: { burnout: -4, mood: { all: 2 } },
          outcome: 'The prairie goes by in perfect silence. Somebody tears up. Nobody says who.' }
      ] },

    // v0.9: the you-drive classics for the other three bands (Hail Damage keeps its own wrong turn and pump-4 argument)
    { id: 'road_lost_grid_road', type: 'road', speaker: '@soloist', title: 'Wrong Turn, Grid Road', once: false, cooldown: 4,
      gate: { driver: ['you'], band: OTHERS },
      text: 'You were supposed to turn at the last town. You are now on a grid road between two canola fields, with no signs, one bar of signal and a farm dog escorting the van.',
      choices: [
        { label: 'Ask at the farmhouse', hint: 'Burnout ↑ · fans ↑', effects: { burnout: 3, fans: 3 },
          outcome: 'The farmer draws you a map on a feed-store receipt and buys a CD. He says it is for his daughter. It is for him.' },
        { label: 'Trust the phone GPS', hint: 'Gamble: satellites vs. the prairie',
          roll: { chance: 0.5, success: { effects: { chemistry: 2 }, outcome: 'Recalculating... it works. The band claps. You bow. You nearly miss the next turn.' },
            fail: { effects: { burnout: 5, fund: -30 }, outcome: 'The GPS sends you down a road that becomes a field. Extra gas, a flat of patience.' } },
          outcome: 'You hold the phone up to the sky like an offering.' },
        { label: 'U-turn. Blame the navigator.', effects: { chemistry: -3, mood: { '@filler': -4 } },
          outcome: '{filler} was asleep. It does not matter. It will never matter. The band has chosen its story.' }
      ] },

    { id: 'road_pump_standoff', type: 'road', speaker: '@grumbler', title: 'Gas Station Standoff', once: false, cooldown: 4,
      gate: { driver: ['you'], band: OTHERS },
      text: 'Pump 4. Who is paying? {front} says they paid last time. They did not. {deadpan} has the receipts. Everyone else has a family-size bag of ketchup chips and no wallet.',
      choices: [
        { label: 'The band fund pays', hint: '−$40', effects: { fund: -40, chemistry: 2 },
          outcome: 'The band fund pays. The band fund always pays. The band fund is the adult in this van.' },
        { label: 'Split it evenly', hint: 'Moods ↓', effects: { mood: { all: -3 } },
          outcome: 'Twenty minutes of math at the pump. Somebody owes somebody $3.40. It will be brought up at the reunion.' },
        { label: 'Loser of the argument pays', hint: 'Gamble: debate club',
          roll: { chance: 0.5, success: { effects: { chemistry: 3 }, outcome: '{front} loses, with dignity, and pays in coins. Exact change. A legend.' },
            fail: { effects: { chemistry: -4, burnout: 3 }, outcome: 'Nobody loses. Everybody loses. The attendant pays, out of pity. You tip him in merch.' } },
          outcome: '{deadpan} fans out the receipts.' }
      ] },

    // ---- v0.7 (WORLDSIM): region road cards abroad (gate.region; GG.tour only draws these on tour, never at home).
    //      No van effects: the band's own van is at home. The designated driver still drives, on whichever side of the road
    //      they use (the Kenji-at-the-wheel ones are gated driver: ['kenji']). v0.9: role aliases + tokens for the rest.
    { id: 'road_uk_left', type: 'road', speaker: 'dana', title: 'The Wrong Side', gate: { region: ['uk_europe'], driver: ['kenji'] },
      text: 'Roundabouts. So many roundabouts. Kenji takes every one on the left without a flicker. Dana has her eyes shut and her hands on the dash.',
      choices: [
        { label: 'Trust Kenji', hint: 'Chemistry ↑', effects: { chemistry: 3 }, outcome: 'Four hundred roundabouts. Zero mistakes. Kenji parks in a space the width of a shopping cart. Silent applause.' },
        { label: 'Dana navigates from a paper map', hint: 'Dana ↑ · Burnout ↑', effects: { mood: { dana: 5 }, burnout: 4 }, outcome: 'Three wrong turns, one sheep, one castle nobody planned to see. Dana is thrilled.' }
      ] },
    { id: 'road_uk_hedgerow', type: 'road', speaker: '@filler', title: 'The Hedgerow Lane', gate: { region: ['uk_europe'], minKm: 100 },
      text: 'The satnav sends the tiny van down a lane between two hedges, exactly one van wide. A tractor appears ahead. It is not reversing.',
      choices: [
        { label: 'Reverse half a mile', hint: 'Burnout ↑', effects: { burnout: 4 }, outcome: 'Twenty minutes backwards through a hedge tunnel. The farmer waves. It feels sarcastic.' },
        { label: 'Offer him tickets', hint: 'Gamble: a new fan, or a long wait', roll: { chance: 0.5, stat: 'buzz', statScale: 0.005,
          success: { effects: { fans: 12, buzz: 3 }, outcome: 'He reverses, then comes to the gig with his whole family. They stand at the front in wellies.' },
          fail: { effects: { burnout: 6 }, outcome: '"Not my kind of music," he says, without asking what kind it is. He eats a sandwich. You wait.' } }, outcome: '{filler} waves the guest list out the window.' }
      ] },
    { id: 'road_eu_border', type: 'road', speaker: '@front', title: 'The Border Check', gate: { region: ['uk_europe'], minKm: 200 },
      text: 'A border officer opens the back of the van and finds {front}\'s stage clothes. He holds them up to the light for a long time. "Purpose of visit?"',
      choices: [
        { label: '"Business." (Stage-clothes business.)', hint: 'The singer ↑', effects: { mood: { '@front': 5 } }, outcome: 'He folds everything with great care and hands it back. "Good luck with the business."' },
        { label: 'Let the singer explain the album', hint: 'Burnout ↑ · Buzz ↑', effects: { burnout: 4, buzz: 3 }, outcome: 'Forty minutes on the concept album. The officer asks for a signed copy. For his mother.' }
      ] },
    { id: 'road_eu_autobahn', type: 'road', speaker: '@soloist', title: 'The Autobahn', gate: { region: ['uk_europe'], minKm: 150 },
      text: 'No speed limit. The tiny rental van tops out at 104 km/h. Every car in Germany passes you, flashing its lights like a disco.',
      choices: [
        { label: 'Stay in the slow lane', hint: 'Burnout ↑', effects: { burnout: 3, chemistry: 2 }, outcome: 'Six hours of trucks. A game of license-plate bingo gets extremely competitive.' },
        { label: 'Stop at a rest stop with a museum', hint: 'Moods ↑', effects: { mood: { all: 4 }, fund: -60 }, outcome: 'A rest stop with a sausage museum. You do not ask questions. You buy the fridge magnet.' }
      ] },
    { id: 'road_jp_toll', type: 'road', speaker: '@filler', title: 'The Tolls', gate: { region: ['japan'], minKm: 150 },
      text: 'Tokyo to Osaka on the expressway. {filler} reads the toll receipts aloud. The tolls cost more than the first gig ever paid.',
      choices: [
        { label: 'Pay and admire the rest stops', hint: 'Fund ↓ · Moods ↑', effects: { fund: -150, mood: { all: 4 } }, outcome: 'The rest stops have gardens, hot food and a toilet with more buttons than the mixing desk.' },
        { label: 'Take the slow roads', hint: 'Burnout ↑', effects: { burnout: 5, chemistry: 2 }, outcome: 'Rice fields, mountains, a village festival. You arrive at soundcheck with thirty seconds to spare.' }
      ] },
    { id: 'road_jp_parking', type: 'road', speaker: 'dana', title: 'The Parking Tower', gate: { region: ['japan'], driver: ['kenji'] },
      text: 'The venue\'s parking is a robot tower that lifts cars into slots. The rental van is two centimetres too tall. The robot beeps politely.',
      choices: [
        { label: 'Let Kenji try anyway', hint: 'Gamble: two centimetres', roll: { chance: 0.5, stat: 'chemistry', statScale: 0.005,
          success: { effects: { buzz: 4, chemistry: 3 }, outcome: 'Kenji lets air out of the tyres. The van goes in with a millimetre to spare. The attendant bows to him.' },
          fail: { effects: { fund: -120, burnout: 3 }, outcome: 'The robot refuses. A very polite man directs you to a lot three km away.' } }, outcome: 'Kenji looks at the robot. The robot looks at Kenji.' },
        { label: 'Park far away and walk', hint: 'Burnout ↑', effects: { burnout: 4 }, outcome: 'You carry the kit through a train station. Commuters make way in perfect silence.' }
      ] },
    { id: 'road_au_roadtrain', type: 'road', speaker: '@filler', title: 'Road Train', gate: { region: ['australia'], minKm: 300 },
      text: 'A road train overtakes you: a truck pulling four trailers, fifty metres of it. It takes nine seconds. {filler} counts out loud.',
      choices: [
        { label: 'Wave at the driver', hint: 'Buzz ↑', effects: { buzz: 3, mood: { '@filler': 4 } }, outcome: 'The driver honks the horn in the rhythm of your single. He has the album. Nobody knows how.' },
        { label: 'Pull over and let it go', hint: 'Burnout ↑', effects: { burnout: 3 }, outcome: 'You wait in the red dirt. The dust takes ten minutes to settle. It is in the snare forever now.' }
      ] },
    { id: 'road_au_nothing', type: 'road', speaker: '@soloist', title: 'Eight Hundred km of Nothing', gate: { region: ['australia'], minKm: 500 },
      text: 'Red dirt, blue sky, a single tree every hundred km. The next fuel stop is 340 km away. The fuel gauge disagrees about the maths.',
      choices: [
        { label: 'Fill every jerry can', hint: 'Fund ↓', effects: { fund: -120 }, outcome: 'You roll into the roadhouse on fumes and pride. The owner has a guest book. You sign it as a band.' },
        { label: 'Risk it', hint: 'Gamble: fine, or a long walk', roll: { chance: 0.55, stat: 'chemistry', statScale: 0.005,
          success: { effects: { chemistry: 4 }, outcome: 'You coast in with the needle under E. The band cheers like it is a gig.' },
          fail: { effects: { burnout: 8, fund: -200 }, outcome: 'Out of fuel at km 322. A grey nomad couple in a caravan tows you in and makes you tea.' } }, outcome: 'You do the maths again. It still disagrees.' }
      ] },
    { id: 'road_au_kangaroo', type: 'road', speaker: '@front', title: 'Dusk', gate: { region: ['australia'], minKm: 150 },
      text: 'Dusk on a country road. Kangaroos everywhere, standing, staring. {front} has named nine of them.',
      choices: [
        { label: 'Crawl along at 40', hint: 'Burnout ↑', effects: { burnout: 4, mood: { '@front': 3 } }, outcome: 'Slow and safe. {front} narrates each kangaroo\'s life story. Some have tragic endings.' },
        { label: 'Stop for the night in a pub', hint: 'Fund ↓ · Moods ↑', effects: { fund: -150, mood: { all: 5 } }, outcome: 'A country pub with rooms upstairs. The locals ask for a song. You play one, acoustic, on bar stools.' }
      ] },
    { id: 'road_ru_taiga', type: 'road', speaker: 'dmitri', title: 'Breakdown in the Taiga', gate: { region: ['russia'], minKm: 300 },
      text: 'The old tour bus coughs, shudders and stops in the middle of the taiga. Birch trees for a thousand km. Dmitri sighs, opens a toolbox and a thermos.',
      choices: [
        { label: 'Help Dmitri fix it', hint: 'Chemistry ↑ · Burnout ↑', effects: { chemistry: 4, burnout: 5 }, outcome: 'Four hours, one borrowed part from a passing farmer, a lot of tea. The bus starts. Everybody cheers.' },
        { label: 'Flag down a truck', hint: 'Fund ↓', effects: { fund: -200, burnout: 3 }, outcome: 'A logging truck tows the bus to the next town. The driver plays your album on the way. Loud.' }
      ] },
    { id: 'road_ru_cold', type: 'road', speaker: '@filler', title: 'Minus Thirty-Eight', gate: { region: ['russia'], season: ['winter'] },
      text: 'Minus thirty-eight. The locals are worried about the band. The band plugs in the block heater they brought from home.',
      choices: [
        { label: 'Explain the block heater', hint: 'Buzz ↑', effects: { buzz: 4, chemistry: 2 }, outcome: 'A crowd gathers around the prairie block heater. It becomes a local legend. Someone writes a song about it.' },
        { label: 'Sleep in the warm bus', hint: 'Burnout ↓', effects: { burnout: -4 }, outcome: 'Everyone piles in under every coat. It is cosy. It smells like a hockey bag.' }
      ] },
    { id: 'road_ru_train', type: 'road', speaker: '@front', title: 'Tea on the Trans-Siberian', gate: { region: ['russia'], minKm: 800 },
      text: 'Day three on the train. Tea in glass holders, a chess game with a retired sailor, snow forever outside. {front} has written half an opera.',
      choices: [
        { label: 'Let the opera happen', hint: 'The singer ↑ · Chemistry ↓', effects: { mood: { '@front': 6 }, chemistry: -2 }, outcome: 'All night, by the light of a tea glass. It is about a moose on a train. Obviously.' },
        { label: 'Band chess tournament', hint: 'Chemistry ↑', effects: { chemistry: 4 }, outcome: 'The sailor beats everyone. Then he teaches {filler} a card game and loses his hat.' }
      ] }
  ];

  // v0.6.1 (Addendum 1 C1): the designated driver per band. v0.9: every band plays, so every driver drives.
  //   you.takeOver is the neutral line (no cactus: it is not always Kenji's van); you.byBand[bandId].takeOver is the band's
  //   own version, read as career.pool(state, drivers.you, 'takeOver') (Hail Damage keeps its tiny cactus; packs add theirs).
  //   { <memberId>: { id, band, name, dashboard (the dash item the van scene shows), dashName, blurb, effect,
  //     mods: { breakdown x, wear x, burnout x, comfort ±, repair x (0 = free), chemistry + per long drive, roadChance x },
  //     back (group-chat line when they take the wheel back) } } + you (the founder, when the driver quits).
  //   shades: true = the van scene draws the driver in sunglasses (Kenji; Earl keeps his own glasses).
  GG.content.drivers = {
    kenji: { id: 'kenji', band: 'hail_damage', name: 'Kenji', dashboard: 'cactus', dashName: 'a single tiny cactus', shades: true,
      blurb: 'Silent. Perfect record. Never uses GPS, always exactly on time. Nobody knows if he has a licence.',
      effect: 'Fewer breakdowns', mods: { breakdown: 0.5 },
      back: 'Kenji is back in the driver\'s seat. Nobody saw him get in. The tiny cactus has been watered.' },
    moth: { id: 'moth', band: 'frost_heave', name: 'Moth', dashboard: 'laundry', dashName: "Moth's laundry",
      blurb: 'It is her apartment. Nobody else may drive. Her stuff is everywhere.',
      effect: 'Free maintenance, terrible comfort', mods: { repair: 0, comfort: -2 },
      back: 'Moth is back. She has re-hung her laundry from the rear-view mirror. The van is her apartment again.' },
    tamara: { id: 'tamara', band: 'gravel_kings', name: 'T-Bone', dashboard: 'cassettes', dashName: "Chase's '80s cassettes",
      blurb: "The only adult in the van. Chase begs to drive and blasts '80s cassettes. The answer is no.",
      effect: 'Safe but slow', mods: { breakdown: 0.6, burnout: 1.3 },
      back: 'T-Bone has the keys again. Chase is in the back, sulking, with a Walkman.' },
    earl: { id: 'earl', band: 'grid_road_ramblers', name: 'Earl', dashboard: 'atlas', dashName: 'a 1987 road atlas',
      blurb: 'Twenty under the limit. Stops at every historical marker and reads it aloud.',
      effect: 'Slow, but road stories boost chemistry', mods: { burnout: 1.3, chemistry: 2 },
      back: 'Earl is driving again. First stop: a historical marker about a grain elevator that is no longer there.' },
    you: { id: 'you', band: null, name: 'You', dashboard: 'none', dashName: 'nothing but a fuel light',
      blurb: 'The founder, behind the wheel. You drive like you drum.',
      effect: 'More wrong turns, more gas-station arguments', mods: { breakdown: 1.15, roadChance: 1.25 },
      takeOver: 'You drive now. The seat is still warm. The mirrors are set for someone taller. Nobody touches the stuff on the dash.',
      byBand: { hail_damage: { takeOver: 'You drive now. The seat is still warm. The mirrors are set for someone taller. The tiny cactus stays on the dash.' } } }
  };
})(window.GG);
