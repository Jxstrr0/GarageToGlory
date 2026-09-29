// content/bandbook.js (v0.6.1, FANS agent; Addendum 1 C5): Bandbook, the one parody social app on the garage laptop.
// Pure data. The sim is 29_sim_fans.js (numbers: economy.fans). Tokens in post/comment/line text:
//   {who} (the featured member's first name) {song} (newest song) {venue} {gcity} (this weekend's gig) {views} {n}
//   + the usual career tokens ({player} {band} {city} {rival} {name:<id>}). Kenji never speaks (he is filmed, never quoted).
// Shapes:
//   posts[kind]      : [text]   kinds: rehearsal | gig | teaser | meme | bts | exclusive (fan club only)
//   kinds[kind]      : { label, icon }
//   viral.good       : [text]   viral.cringe: [{ who: memberId|'any', text }]  ('any' = a random active member, never Kenji)
//   comments.good|mixed|bad|hater|rival|rivalExclusive : [text];  handles.fan|hater: [name]
//   superfans        : [{ id, name, short, icon, blurb, start|story|reserved, comments: [text] }]
//   gigLines.*       : lines for the gig result (Dale at every show, superfans on tour, the trucker, a hater)
//   mail / gifts     : [{ id, from, text }] (random arrivals) ; scripted gifts come from cards (fan: { gift: id })
//   tiers            : Patreeon tiers [{ id, name, price ($/month), perk, minMembers }]
//   scandals         : [{ card, who }] (scandal card id -> the member who posted the dumb thing)
//   cards            : fan cards (Monday schema; forced only, never drawn): scandals + superfans + the fan club.
//                      Extra effect key: fan: { hater|super: ±share, superfan: { id: ±mood }, gift: id, club: 'open',
//                      clubHappy: ±n } (GG.fans.apply).
(function (GG) {
  var HD = { band: ['hail_damage'] };
  GG.content.bandbook = {
    name: 'Bandbook',
    tagline: 'Where bands post. Where uncles comment.',
    kinds: {
      rehearsal: { label: 'Rehearsal clip', icon: '🎬' }, gig: { label: 'Gig announcement', icon: '📣' },
      teaser: { label: 'Song teaser', icon: '🎵' }, meme: { label: 'Meme', icon: '🐿️' },
      bts: { label: 'Behind the scenes', icon: '📸' }, exclusive: { label: 'Patreeon exclusive', icon: '🔒' }
    },
    posts: {
      rehearsal: [
        'Rehearsal clip: {who} nails the bridge on take 14. Takes 1 to 13 are in the vault. The vault is Dad\'s deep freeze.',
        'Garage rehearsal, 40 seconds. Mom walks through the shot with a laundry basket at 0:22. She is now the most-liked part.',
        'Full run-through of “{song}”. The furnace kicks in during the quiet part. It\'s in the band now.',
        'Rehearsal clip: {player} counts in, drops a stick, counts in again. Nobody edits anything. Authentic.',
        'Practice footage: {who} and {player} lock in so tight the garage door rattles along in time.'
      ],
      gig: [
        'THIS SATURDAY: {band} at {venue}, {gcity}. Doors at 8. Parking is a field. Bring a toque.',
        'Gig announcement! {venue}, {gcity}. Poster by {who}. The font is illegible. That\'s the point.',
        'We\'re playing {venue} in {gcity} this weekend. Bring this post for nothing. We will wave, though.',
        '{venue}, {gcity}, Saturday. Last time the crowd was 12 people and a dog. Let\'s get it to 13.'
      ],
      teaser: [
        'New song teaser: nine seconds of “{song}”. The rest is coming. The rest is also louder.',
        '“{song}”, work in progress. The riff arrived in a grocery-store parking lot. The parking lot wants credit.',
        'Sneak peek: the chorus of “{song}”, recorded on a phone inside a sock drawer for the acoustics.',
        'Teaser for “{song}”. Turn it up. No, more. The neighbours will understand eventually.'
      ],
      meme: [
        'Meme: a photo of a frozen van captioned "tour support". That\'s it. That\'s the post.',
        'Which member of {band} are you, based on your favourite perogy filling? Wrong answers only.',
        'Meme: "Things I\'d do for a gig": drive six hours to Gravelbourg with my own extension cord.',
        'POLL: is a Saskatoon berry a berry? {who} has been arguing about it since Tuesday.',
        'Meme: our van parked next to a gopher. Caption: "the whole crew". The gopher did not consent.'
      ],
      bts: [
        'Behind the scenes: {who} ironing the backdrop with a waffle iron. Don\'t ask how. Don\'t ask why.',
        'BTS: the band eating perogies off a kick drum case. Catering has arrived.',
        'Behind the scenes: tonight\'s setlist is written on a pizza box. The pizza box is now framed.',
        'BTS: loading the van at −31. {who} carries the bass cab like a newborn.',
        'Behind the scenes: {player} practising on pillows at 2 a.m. so Mom can sleep. Mom cannot sleep.'
      ],
      exclusive: [
        'Members only: forty minutes of Kenji tuning his bass. Members call it "meditative". He does not look up once.',
        'Exclusive: the demo of “{song}” with the wrong lyrics. The wrong lyrics are better.',
        'Members only: a guided tour of the van. Featuring: the smell.',
        'Exclusive: {who}\'s perogy recipe. It\'s Baba\'s recipe, retyped, with one typo.',
        'Members-only livestream from the garage. 31 viewers. Dale requests the same song six times. You play it six times.'
      ]
    },
    viral: {
      good: [
        'VIRAL: {player} falls off the drum riser mid-fill and finishes the fill lying on the floor. {views} views.',
        'VIRAL: a moose wanders past the garage window during the breakdown and appears to headbang. It\'s eating. {views} views.',
        'VIRAL: {who}\'s string snaps, hits a light, the light falls, the crowd thinks it\'s pyro. {views} views.',
        'VIRAL: the garage door opens by itself mid-song and reveals Dad holding a leaf blower. {views} views.'
      ],
      cringe: [
        { who: 'marcel', text: 'Wrong kind of viral: Marcel\'s dance tutorial, "The Abyssal Two-Step". {views} views, mostly laughing ones.' },
        { who: 'marcel', text: 'Wrong kind of viral: Marcel reads his poetry over a smoke machine that will not stop. {views} views.' },
        { who: 'dana', text: 'Wrong kind of viral: Dana\'s eleven-minute unboxing of one guitar pick. {views} views.' },
        { who: 'jaxon', text: 'Wrong kind of viral: Jaxon\'s "how to look metal at a wedding", filmed at a real wedding. {views} views.' },
        { who: 'any', text: 'Wrong kind of viral: {who}\'s pre-gig hype speech. It\'s just yelling the band\'s name. {views} views.' }
      ]
    },
    comments: {
      good: [
        'saw them at a Legion hall, 12 people and a dog, I was the dog',
        'my mom and I both like this. first thing we\'ve agreed on since the flood',
        'played this in the combine. harvest went 20% faster',
        'BEST BAND IN THE 306 🔥🔥🔥',
        'drove in from Kindersley for the last show. worth the gas. mostly',
        'absolutely shredding. my dog left the room. respect',
        'my curling team warms up to this now. we are 0 and 6 but we are LOUD',
        'grandma asked me to turn it up. GRANDMA'
      ],
      mixed: [
        'not usually my thing but the drummer is working very hard',
        'is this the band from the grain elevator poster? the one that fell down?',
        'decent. my cousin\'s band is louder but they only know one song',
        'turn the vocals up. no, down. no, up. I\'ll get back to you',
        'saw them at the Legion. the perogies were great. the band was also there',
        'why is there a lawn mower in the background of every video'
      ],
      bad: [
        'they were better before anyone knew about them (last week)',
        'sounds like a hailstorm in a coffee can. 3 stars',
        'unfollowed. refollowed. I don\'t know what I want',
        'who let them near a microphone. who. I want names'
      ],
      hater: [
        'overrated. never heard them. still overrated',
        'my uncle could drum like that and he\'s a snowplow',
        'fake metal. real metal is cold. these guys have a space heater',
        'only here to hate-watch. 14th time this week. don\'t read into it',
        'ratio + you play the Legion + your van is a hearse',
        'this is why Saskatchewan has no mountains. they left'
      ],
      rival: [
        'So proud of you guys. Genuinely. We remember playing rooms that size! 🤘',
        'Love this!! Great hustle. Come see how it\'s done Saturday (kidding!!) (not kidding)',
        'Supportive comment! Keep going! We are rooting for you from the big stage.',
        'Honestly inspiring. Our intern showed us. We had to ask who you were. Love that for you.',
        'Great energy. A few notes: louder, tighter, more like us. But great energy!',
        'Can\'t wait to see where you guys end up. Probably opening for us! 😊'
      ],
      rivalExclusive: [
        'Subscribed at the Drumstick tier to support you guys! Every bit helps, right? 🤘',
        'Members-only content, wow! We had members-only content once. Now we have a building.'
      ]
    },
    handles: {
      fan: ['PrairieDoom88', 'GopherGrl', 'WheatKing306', 'CombineCarl', 'BerryPieBarb', 'CurlingKev', 'PotashPete', 'SloughQueen',
        'ToqueLord', 'CanolaChris', 'BunnockBev', 'GrainElevatorGuy', 'ZamboniZoe', 'MooseJawMel', 'HailYeahHelen', 'PerogyPrince'],
      hater: ['realmetal_only', 'OverratedOlaf', 'BootFromRegina', 'unfollow_ursula', 'HaterTad', 'ActuallyItsKevin']
    },
    superfans: [
      { id: 'dale', name: 'Dale from Warman', short: 'Dale', icon: '🧢', start: true,
        blurb: 'At every show. Front row. Lawn chair. No relation to Cousin Dale, and he would like that on the record.',
        comments: [
          'Dale from Warman here. I\'ll be there Saturday. Front row. Lawn chair. You know the drill.',
          'Great post. Printed it out. It\'s on the fridge next to my grandson.',
          'Dale again. Haven\'t missed a show since the first one. Not planning to start.',
          'Dale from Warman: I have liked this 40 times. The app only counts one. I\'ve written to them.',
          'Played this at my brother\'s retirement party. He retired again. Early.'
        ] },
      { id: 'trucker', name: 'Big Wendell', short: 'Wendell', icon: '🚛', story: true,
        blurb: 'The trucker with the jumper cables at the Petro-Canuck in Davidson. Follows the band on the CB now.',
        comments: [
          'Wendell here (the jumper cables). Playing this on the CB from Davidson to Dundurn. The whole convoy\'s hooked.',
          'Big Wendell: good highway beat on this one. Exactly 104 km/h.',
          'Honked twice for this post. You\'ll hear it Tuesday.',
          'Wendell: still got a set of cables with your name on them. Literally. I wrote on them.'
        ] },
      { id: 'japan', name: 'The president of your Japanese fan club', short: 'The President', icon: '🎌', reserved: 'v0.7',
        blurb: 'Somewhere overseas, somebody is already laminating membership cards. (Arrives with the world tour, v0.7.)',
        comments: [] }
    ],
    gigLines: {
      dale: [
        'Dale from Warman is in the front row. Lawn chair, thermos, a homemade shirt. Show number {n}.',
        'Dale from Warman made it again ({n} shows). He knows every word. Some of them are the real words.',
        'Dale from Warman holds up a sign: "DALE ♥ {band}". New sign every show. This is sign {n}.',
        'Dale from Warman is here. He drove the whole way at exactly the speed limit, he wants you to know.'
      ],
      daleFar: [
        'Dale from Warman is in the front row in {gcity}. He took the bus. It took two days. Show number {n}.',
        'Dale from Warman made it to {gcity}. First time this far from Warman. He brought his own lawn chair on the bus.'
      ],
      follow: [
        '{n} superfans followed you to {gcity}. One brought a banner. One brought a stick to hold up the banner.',
        '{n} superfans made the drive to {gcity}. They know the setlist better than Marcel does.'
      ],
      trucker: [
        'Big Wendell parks the rig across six stalls and watches from the cab with the door open. Two honks after every song.',
        'Big Wendell is at the back by the bar, jumper cables over one shoulder like a scarf. Just in case.'
      ],
      hater: [
        'A hater holds up a sign that says "TOO LOUD". He stays for the whole set. He stays for the encore.',
        'A guy in the back yells "OVERRATED" after every song. He also yells "ONE MORE". Complicated man.'
      ]
    },
    mail: [
      { id: 'mail_yorkton_kid', from: 'a 10-year-old in Yorkton', text: '"I started drums because of you. My parents would like a word."' },
      { id: 'mail_nan', from: 'someone\'s nan in Melfort', text: '"Too loud. Lovely kids. Enclosed: a doughnut-hole coupon from 1998." It\'s expired. It\'s perfect.' },
      { id: 'mail_poem', from: 'a poet in Biggar', text: 'A 12-page poem about the Moose Hearse. It rhymes "transmission" with "our mission". Twice.' },
      { id: 'mail_teacher', from: 'a music teacher in Unity', text: '"My students now play everything at double speed. Thank you. I think."' },
      { id: 'mail_farmer', from: 'a farmer near Rosetown', text: '"Your song got my cows to come in on time. Please write one for the chickens."' },
      { id: 'mail_hater', from: 'a hater in Regina', text: 'Four pages on why you\'re overrated. Handwritten. Double-sided. Signed "a fan (not a fan)".' }
    ],
    gifts: [
      { id: 'toque', from: 'a fan in Humboldt', text: 'A hand-knit toque in band colours. It says HALE DAMAGE. It\'s the thought.' },
      { id: 'jam', from: 'Barb from the curling rink', text: 'A jar of Saskatoon-berry jam labelled "for the drummer\'s wrists".' },
      { id: 'abyssus_doll', from: 'a crocheter in Kindersley', text: 'A crocheted Lord Abyssus with a tiny felt cape. Marcel keeps it on his pillow. He\'d deny it.' },
      { id: 'pizza_art', from: 'an art student in Regina', text: 'Fan art on a pizza box: the band as gophers. It\'s accurate.' },
      { id: 'casserole', from: 'somebody\'s grandma', text: 'A frozen casserole with no note. Just "EAT" in marker on the foil.' },
      { id: 'sticks', from: 'a school band in Lanigan', text: 'A pair of drumsticks signed by the entire Grade 7 band. Thirty-one signatures. One is a drawing of a horse.' }
    ],
    scriptedGifts: {
      macaroni_kenji: { from: 'Dale from Warman', text: 'A macaroni portrait of Kenji, spray-painted gold, glued to a cookie sheet. The eyes follow you. It hangs in the garage.' },
      cb_radio: { from: 'Big Wendell', text: 'An old CB radio. Channel 19. Wendell is always on it.' }
    },
    tiers: [
      { id: 'drumstick', name: 'Drumstick', icon: '🥢', price: 3, minMembers: 0, perk: 'Your name in the monthly thank-you post (small font).' },
      { id: 'snare', name: 'Snare', icon: '🥁', price: 8, minMembers: 8, perk: 'Exclusive posts and the monthly garage livestream.' },
      { id: 'full_kit', name: 'Full Kit', icon: '🎛️', price: 20, minMembers: 20, perk: 'All of it, plus a thank-you note from Kenji (a drawing of a bass).' }
    ],
    club: {
      name: 'Patreeon', pitch: 'Support your favourite band\'s van repairs.',
      locked: 'Patreeon opens in the Signed era. Until then, your superfans support you the old way: yelling.',
      payoutChat: [
        'Patreeon payout: {money} from {n} members. Dale is on the Full Kit tier. Of course he is.',
        'Patreeon paid {money} this month. {n} members. One of them is our mom, at the Drumstick tier.',
        'Patreeon: {money} from {n} members. As promised, some of it went to the van. The heater works now. Mostly.'
      ],
      grumbleChat: [
        'Patreeon members are asking where the exclusives went. One of them is Dale. He is being very polite about it.',
        'A Patreeon member posted "am I paying for a van repair I\'ll never see". Fair question.'
      ]
    },
    chat: {
      viral: [
        'We\'re viral. Mom\'s cousin in Yorkton sent it to Mom. Mom sent it to us. Three times.',
        'The post is everywhere. Someone at the Legion showed it to me on their phone. At the Legion.'
      ],
      cringe: [
        'Everyone saw it. Everyone. My dentist saw it.',
        'I\'m logging off forever. (Back in 20 minutes.)'
      ]
    },
    // scandal card -> who posted the dumb thing (must be an active member for the card to come up)
    scandals: [
      { card: 'scandal_turf', who: 'marcel' }, { card: 'scandal_cover', who: 'dana' },
      { card: 'scandal_chips', who: 'jaxon' }, { card: 'scandal_jazz', who: 'kenji' },
      { card: 'scandal_essay', who: 'player' }, { card: 'scandal_curling', who: 'band' }
    ],
    cards: [
      // ---- Scandals: a bandmate posts something dumb (forced by GG.fans after a post or a weekly roll) ----
      { id: 'scandal_turf', type: 'fame', speaker: 'marcel', title: 'The Lawn Is Turf', gate: HD,
        text: 'Marcel posts a lawn-care video: "My beloved lawn, hand-watered since 2019." A fan zooms in. It is artificial turf. ' +
          'The comments are merciless. Marcel has locked himself in the van.',
        choices: [
          { label: 'Marcel apologizes on camera', effects: { buzz: -3, mood: { marcel: -6 }, fan: { hater: -0.02 } },
            outcome: 'He cries a little. The turf looks great in the background. Most people forgive him. Dale mails a sympathy card.' },
          { label: 'Double down: turf is metal', effects: { buzz: 6, mood: { marcel: 5 }, fan: { hater: 0.03 } },
            outcome: '"Real grass dies. Turf is eternal." Half the next crowd chants it ironically. Half does not.' },
          { label: 'Roll the turf out on stage', hint: 'Gamble: a bit, or a bigger scandal',
            roll: { chance: 0.5, stat: 'buzz', statScale: 0.004,
              success: { effects: { buzz: 8, fans: 20, mood: { marcel: 6 } }, outcome: 'He mows it mid-set with a push mower. The crowd loses its mind.' },
              fail: { effects: { buzz: -4, mood: { marcel: -8 } }, outcome: 'The turf catches on the kick pedal. Marcel spends the encore untangling it.' } },
            outcome: 'Dana finds a staple gun.' }
        ] },
      { id: 'scandal_cover', type: 'fame', speaker: 'dana', title: 'Dana Covers the Enemy', gate: HD,
        text: 'Dana posts a guitar cover of a {rival} song. Caption: "honestly a banger." The group chat is on fire. ' +
          'Marcel has typed and deleted a message eleven times.',
        choices: [
          { label: 'Delete it. Quietly.', effects: { buzz: -2, mood: { dana: -5 }, chemistry: 3 },
            outcome: 'Gone in ten minutes. The screenshot is forever. {rival} comments "who deleted our song?? 😢".' },
          { label: 'Own it. It IS a banger.', effects: { buzz: 5, chemistry: -3, fan: { hater: 0.02 } },
            outcome: 'Dana plays it faster and better than they do. Nobody says it. Everybody thinks it.' },
          { label: 'Tag {rival} in it', hint: 'Gamble: a feud, or a collab',
            roll: { chance: 0.5, success: { effects: { buzz: 8, mood: { dana: 5 } }, outcome: 'They share it. Their fans find you. Some of them stay.' },
              fail: { effects: { buzz: -3, mood: { dana: -6 } }, outcome: 'They share it as "our biggest fan". Dana will never recover.' } },
            outcome: 'Dana hits post before anyone can grab the phone.' }
        ] },
      { id: 'scandal_chips', type: 'fame', speaker: 'jaxon', title: 'The Hot Take', gate: HD,
        text: 'At 1 a.m. Jaxon posts a hot take from the band page: "ketchup chips are overrated." ' +
          'The prairies respond by morning. Someone has made a petition. It has more signatures than you have fans.',
        choices: [
          { label: 'Jaxon eats a bag on camera', effects: { buzz: 4, mood: { jaxon: -4 }, fan: { hater: -0.02 } },
            outcome: 'He eats the whole bag. He admits they are "fine". The petition is closed. His fingers stay red for a week.' },
          { label: 'Stand with Jaxon', effects: { chemistry: 4, mood: { jaxon: 6 }, fan: { hater: 0.03 } },
            outcome: 'A band united. A province divided. Dale posts a photo of himself eating ketchup chips "in solidarity with both sides".' },
          { label: 'Blame a hacker', effects: { buzz: -2, mood: { jaxon: 3 } },
            outcome: 'Nobody believes it. Mom asks what a hacker is. Jaxon tells her. It takes an hour.' }
        ] },
      { id: 'scandal_jazz', type: 'fame', speaker: 'dana', title: 'Kenji Likes Smooth Jazz', gate: HD,
        text: 'Kenji\'s account liked a smooth-jazz page. One like. The metal forums have noticed. ' +
          'Threads are titled "IS HAIL DAMAGE COMPROMISED". Dana wants to know what to do. Kenji is eating a sandwich.',
        choices: [
          { label: 'Let Kenji handle it', effects: { buzz: 6, mood: { kenji: 5 } },
            outcome: 'Kenji posts one photo: his bass, standing in a snowbank. No caption. It gets more likes than the band page.' },
          { label: 'Post a "we are still metal" video', effects: { buzz: 3, burnout: 4 },
            outcome: 'Marcel screams at a blizzard for four minutes. The forums accept it. The neighbours do not.' },
          { label: 'Admit it: the whole band likes jazz', effects: { chemistry: 5, fan: { hater: 0.03 } },
            outcome: 'The forums melt down. A jazz club in Regina sends an invitation. Kenji keeps it.' }
        ] },
      { id: 'scandal_essay', type: 'fame', speaker: 'mom', title: 'The 3 a.m. Essay', gate: HD,
        text: 'At 3 a.m. you replied to a hater with a 900-word essay. You cited sources. There are footnotes. ' +
          'Mom saw it. Mom printed it. It is on the fridge, and she has highlighted the parts she liked.',
        choices: [
          { label: 'Delete it and sleep', effects: { burnout: -4, fan: { hater: -0.01 } },
            outcome: 'You sleep eleven hours. The hater posts "they deleted it lol". You let it go. Growth.' },
          { label: 'Post part two', effects: { buzz: 5, burnout: 5, fan: { hater: 0.03 } },
            outcome: 'Part two has a bibliography. The hater replies "ok". You have won. You feel terrible.' },
          { label: 'Let Mom reply for you', effects: { buzz: 4, chemistry: 3, fan: { hater: -0.02 } },
            outcome: 'Mom writes "He is a good boy and he practises". The hater apologizes. Mom now has 400 followers.' }
        ] },
      { id: 'scandal_curling', type: 'fame', speaker: 'reporter', title: 'Is Curling a Sport?', gate: HD,
        text: 'Brent from the Star-Pheasant has found an old poll on the band page: "is curling even a sport?" ' +
          'Curlers have seen it. Curlers are organized. Curlers have phone trees.',
        choices: [
          { label: 'Play a free bonspiel social', effects: { burnout: 5, fans: 15, fan: { hater: -0.02 } },
            outcome: 'Forty curlers, all named Barb or Dale. By the second set they are sweeping in time. Forgiven.' },
          { label: '"No comment."', effects: { buzz: -3 },
            outcome: 'Brent prints "no comment" as the headline. In curling font. The rink puts it on the corkboard.' },
          { label: 'Curling IS metal. Say it.', effects: { buzz: 6, mood: { marcel: 4 } },
            outcome: 'Marcel writes a song about granite. It is surprisingly heavy. The curlers adopt it as a walk-out song.' }
        ] },
      // ---- Superfans ----
      { id: 'fans_dale_hello', type: 'fame', speaker: 'dale_warman', title: 'Dale from Warman', gate: HD,
        text: 'A message on the band page: "Hi. Dale from Warman. I was the one in the lawn chair. I\'ll be at every show. ' +
          'Every one. This is not a threat. It is a promise. No relation to Cousin Dale."',
        choices: [
          { label: 'Welcome aboard, Dale', effects: { chemistry: 3, fan: { superfan: { dale: 10 } } },
            outcome: 'Dale replies with a thumbs-up, then a longer thumbs-up, then a photo of his lawn chair. It has a name. It is "Chair".' },
          { label: 'Put him on the guest list forever', effects: { buzz: 2, fan: { superfan: { dale: 15 } } },
            outcome: 'He insists on paying anyway. He pays in exact change. He brings a roll of dimes.' },
          { label: 'Ask how he found you', effects: { chemistry: 2, fan: { superfan: { dale: 5 } } },
            outcome: 'He heard you through the garage door from the highway. With his windows up.' }
        ] },
      { id: 'fans_trucker', type: 'road', speaker: 'wendell', title: 'The Jumper-Cable Story', gate: HD,
        text: 'Driving home from a gig, the van dies at the Petro-Canuck in Davidson at 2 a.m. A semi pulls in. ' +
          'A man named Wendell produces jumper cables longer than the van. "Heard you on the radio," he says. You have never been on the radio.',
        choices: [
          { label: 'Buy him a coffee and a donut', effects: { fund: -12, fan: { superfan: { trucker: 10 } } },
            outcome: 'He tells you about every band he has ever boosted. It is a long list. You are, he says, "top five".' },
          { label: 'Play him a song in the lot', effects: { burnout: 4, chemistry: 3, fan: { superfan: { trucker: 15 } } },
            outcome: 'One song on a practice pad under the gas-station lights. Wendell honks the air horn at the end. A dog in Davidson howls.' },
          { label: 'Sign his thermos', effects: { buzz: 2, fan: { superfan: { trucker: 8 } } },
            outcome: '"Now I can never wash it," says Wendell, who has clearly never washed it.' }
        ] },
      { id: 'fans_macaroni', type: 'fame', speaker: 'dale_warman', title: 'A Gift from Dale', gate: HD,
        text: 'After the show Dale hands over a package wrapped in a feed-store flyer: a macaroni portrait of Kenji. ' +
          'Spray-painted gold. Glued to a cookie sheet. It took him, he says, "most of the winter".',
        choices: [
          { label: 'Hang it in the garage', effects: { chemistry: 3, fan: { gift: 'macaroni_kenji', superfan: { dale: 10 } } },
            outcome: 'It goes up on the wall by the gig board. Kenji looks at it for a long time. He nods once. That\'s a rave.' },
          { label: 'Let Kenji decide', effects: { mood: { kenji: 5 }, fan: { gift: 'macaroni_kenji', superfan: { dale: 8 } } },
            outcome: 'Kenji hangs it himself, level to the millimetre, then adds one noodle that fell off. It is perfect now.' }
        ] },
      { id: 'fans_hater_page', type: 'fame', speaker: 'reporter', title: 'The Anti-Fan Club', gate: HD,
        text: 'Brent from the Star-Pheasant reports on a new page: "{band} Is Overrated (Fan Club)". It has an anthem, a logo and ' +
          'a monthly meeting at a Humboldt Legion. It has more members than some of your gigs.',
        choices: [
          { label: 'Show up to their meeting', hint: 'Gamble: charm the haters',
            roll: { chance: 0.5, stat: 'chemistry', statScale: 0.005,
              success: { effects: { buzz: 8, fans: 20, fan: { hater: -0.04 } }, outcome: 'You bring perogies. By dessert, three of them have joined Dale\'s group chat.' },
              fail: { effects: { buzz: -3, mood: { marcel: -5 } }, outcome: 'They vote to make Marcel an honorary member. He is not honoured.' } },
            outcome: 'You drive to Humboldt with a tray of perogies.' },
          { label: 'Ignore them. Play louder.', effects: { burnout: 4, chemistry: 3 },
            outcome: 'They review your next show anyway. "Too loud. 4 stars." It\'s their best review ever.' }
        ] },
      // ---- The fan club (Signed era) ----
      { id: 'fans_patreeon', type: 'money', speaker: 'jaxon', title: 'Patreeon', gate: { era: ['signed', 'world'], band: ['hail_damage'] },
        text: 'Jaxon found a website: Patreeon. "Support your favourite band\'s van repairs." Superfans pay monthly; you post ' +
          'exclusive stuff for them. Tiers: Drumstick, Snare, Full Kit. Dale has already asked where to send the cheque.',
        choices: [
          { label: 'Open the fan club', effects: { buzz: 3, fan: { club: 'open' } },
            outcome: 'Patreeon is live. First member: Dale, Full Kit, at 12:01 a.m. Second member: Mom, Drumstick, "to be supportive".' },
          { label: 'Only if Dale gets it free', effects: { chemistry: 3, fan: { club: 'open', superfan: { dale: 15 } } },
            outcome: 'Dale refuses the free membership and pays double. He has never been happier. Patreeon is live.' },
          { label: 'Not yet. We\'re artists.', effects: { chemistry: 3, mood: { marcel: 4 } },
            outcome: 'Marcel gives a speech about art. The van makes a noise during it. Jaxon bookmarks the website.' }
        ] },
      { id: 'fans_club_grumble', type: 'money', speaker: 'dale_warman', title: 'Patreeon Grumbles', gate: { era: ['signed', 'world'], band: ['hail_damage'] },
        text: 'A polite message from Dale, on behalf of "the members": it\'s been a while since an exclusive. Some folks are ' +
          'asking what the money\'s for. Dale is not asking. Dale would never. He just thought you should know.',
        choices: [
          { label: 'Film an exclusive tonight', effects: { burnout: 5, fan: { clubHappy: 25 } },
            outcome: 'A 50-minute livestream of the band fixing the van heater. Members love it. The heater still doesn\'t work.' },
          { label: 'Send every member a postcard', effects: { fund: -150, fan: { clubHappy: 15 } },
            outcome: 'Four hundred postcards of the Moose Hearse. Dale frames his. Mom frames hers. Kenji draws a bass on each.' },
          { label: 'They\'ll live', effects: { burnout: -4, fan: { clubHappy: -10, super: -0.01 } },
            outcome: 'Some cancel. Dale doesn\'t. Dale says it\'s fine. It sounds like it isn\'t fine.' }
        ] }
    ]
  };
})(window.GG);
