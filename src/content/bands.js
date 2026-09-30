// content/bands.js: the four hand-made bands (you are the drummer in each) and their rivals.
// Shapes (see CONTENT SCHEMAS in 02_contracts.js):
//   GG.content.bands  = { <bandId>: { id, name, genre, city, region, space, spaceName, size, rival, locked, comingIn,
//                                     blurb, coldOpen:[panel], starterSongs:[{ title, titleEn, fr? }], members:[MEMBER] } }
//   MEMBER = { id, name, fullName, nick, role, hometown, skill, mood, wants, bio, idle, look: LOOK }
//   GG.content.rivals = { <rivalId>: { id, name, city, genre, blurb } }
// Notes:
//   - `size` counts the player (the drummer): members.length + 1.
//   - Member ids are unique across ALL bands, so lines.* can be keyed by member id alone.
//   - `name` is the short name shown in the HUD and in effect summaries ("Marcel ↑"); `fullName` is for bios.
//   - `titleEn` is null for songs already in English (all of them since v0.7.2). Metal starters also carry `fr`:
//     Marcel's French original. It seeds the starter's drum pattern (unchanged since v0.1) and lets old saves that
//     still hold the French title rename it to the English one on load (GG.songs.migrateTitles).
//   - All four bands are playable from the start (owner, v0.9). v0.9 band fields (roles, firstGig, homeRing, spaceShort, door,
//     province, coldOpenFx, throne) and member fields (gear, silent, cape, signature, look.top) are applied by the table at
//     the bottom of this file (see CONTENT SCHEMAS in 02_contracts.js and plan/plan_contract_0.9.md §3-4).
(function (GG) {
  // LOOK helper: keeps member definitions on one line each.
  function look(skin, hair, hairStyle, shirt, pants, height, build, extras) {
    return { skin: skin, hair: hair, hairStyle: hairStyle, shirt: shirt, pants: pants,
      height: height, build: build, extras: extras || [] };
  }

  var bands = {};

  // ---- Metal: Hail Damage (playable) --------------------------------------
  bands.hail_damage = {
    id: 'hail_damage', name: 'Hail Damage', genre: 'metal', city: 'Saskatoon', region: 'canada',
    space: 'parents_garage', spaceName: "Your parents' garage", size: 5, rival: 'tundra_wraith',
    locked: false, comingIn: null,
    blurb: "Metal. Born in your parents' garage in Saskatoon and named after an insurance claim. " +
      'French screaming, endless solos, one silent bassist, and you holding it all together from behind the kit.',
    coldOpen: [
      'Saskatoon. July. The sky over Circle Drive turns the colour of a bruise.',
      "Hail the size of perogies. Eleven minutes later, your dad's brand-new truck looks like a golf ball.",
      "The insurance adjuster arrives in black eyeliner. He circles the truck twice and whispers the claim type like a curse: 'Hail. Damage.'",
      "'That,' says Marcel Fontaine, adjuster and screamer, 'is the name of our band.' You didn't have a band. You had a drum kit.",
      "Now you have both. The truck lives on the street. The garage is yours. Hail Damage is born."
    ],
    starterSongs: [   // English titles (v0.7.2); `fr` = Marcel's original (seeds the pattern, renames old saves)
      { title: 'My Lawn, My Tomb', titleEn: null, fr: 'Ma Pelouse, Mon Tombeau' },
      { title: 'Dandelions of the Apocalypse (On My Lawn)', titleEn: null, fr: "Les Pissenlits de l'Apocalypse" }
    ],
    members: [
      { id: 'marcel', name: 'Marcel', fullName: 'Marcel "Lord Abyssus" Fontaine', nick: 'Lord Abyssus', role: 'vocals',
        hometown: 'Gravelbourg', skill: 48, mood: 70,
        wants: 'The spotlight. Theatrics. A cape budget.',
        bio: 'Francophone insurance adjuster who screams every lyric in French. Nobody knows what the songs are about. ' +
          "When a fan finally translates them, they're all about his lawn.",
        idle: 'mirror',
        look: look('#e6c19c', '#15110f', 'long', '#1b1a22', '#26252e', 1.02, 0.95, ['moustache']) },
      { id: 'dana', name: 'Dana', fullName: 'Dana "Sweep" Okafor', nick: 'Sweep', role: 'lead guitar',
        hometown: 'Prince Albert', skill: 58, mood: 66,
        wants: 'Longer solos. Newer gear. Both, ideally.',
        bio: 'Practises ten hours a day and talks almost entirely in gear specs. Her solos run longer than the songs. ' +
          'She considers this a feature.',
        idle: 'noodle',
        look: look('#6b4429', '#141010', 'bun', '#7a2630', '#2b3346', 1.0, 1.0, ['glasses']) },
      { id: 'jaxon', name: 'Jaxon', fullName: 'Jaxon "Rip" Kowalchuk', nick: 'Rip', role: 'rhythm guitar',
        hometown: 'Saskatoon', skill: 44, mood: 72,
        wants: "Freedom. And Baba's approval. Mostly Baba's approval.",
        bio: "19-year-old prodigy who lives with his baba, who packs his lunches and sets his curfew. " +
          'Keeps sneaking shred fills into the simple parts and thinks nobody notices.',
        idle: 'lunch',
        look: look('#f1d0aa', '#a86e3a', 'cap', '#c0392b', '#3d5a80', 0.95, 0.9, []) },
      { id: 'kenji', name: 'Kenji', fullName: 'Kenji Blackbird', nick: 'Blackbird', role: 'bass',
        hometown: 'Moose Jaw (allegedly)', skill: 56, mood: 62,
        wants: "Nobody knows. That's the point.",
        bio: 'Sunglasses indoors. Never speaks, on stage or off. Rumoured to be a legend under another name. ' +
          'Highest praise possible: a single, silent nod.',
        idle: 'corner',
        look: look('#d8b28a', '#0c0c0e', 'short', '#101014', '#141418', 1.08, 1.05, ['sunglasses']) }
    ]
  };

  // ---- Punk: Frost Heave (playable, v0.9) --------------------------
  bands.frost_heave = {
    id: 'frost_heave', name: 'Frost Heave', genre: 'punk', city: 'Regina', region: 'canada',
    space: 'laundromat_basement', spaceName: 'The basement under the Suds-O-Rama', size: 4, rival: 'mall_rats',
    locked: false, comingIn: null,
    blurb: 'Punk. A four-piece out of a laundromat basement in Regina. Every song is about city council. ' +
      'The dryers are the rhythm section.',
    coldOpen: [
      'Regina. January. The city fills a pothole on Dewdney Avenue with a smaller pothole.',
      "Rox Delorme screams at the council meeting for eleven minutes. The minutes record it as 'public comment'.",
      'In the basement under the Suds-O-Rama, Benny plays both of his chords. Moth wanders in from the van. You bring a snare.',
      'The dryers thump in 4/4. Frost Heave is born, and council is on notice.'
    ],
    starterSongs: [
      { title: 'Council Meeting (Adjourned Forever)', titleEn: null },
      { title: 'Pothole Nation', titleEn: null }
    ],
    members: [
      { id: 'rox', name: 'Rox', fullName: 'Rox Delorme', nick: 'Rox', role: 'vocals/guitar',
        hometown: 'Regina', skill: 47, mood: 62,
        wants: 'A seat on city council, to burn it down from the inside.',
        bio: 'Screams exclusively about city council. Banned from every warehouse club in the province. ' +
          'Has attended 212 consecutive council meetings, all as a heckler.',
        idle: 'pace',
        look: look('#f0c9a4', '#d23b62', 'mohawk', '#232323', '#2c2c34', 0.98, 0.95, ['tattoos']) },
      { id: 'benny', name: 'Benny', fullName: 'Benny "Two Chords" Mahon', nick: 'Two Chords', role: 'guitar',
        hometown: 'Moose Jaw', skill: 34, mood: 70,
        wants: 'To never, ever learn a third chord.',
        bio: 'Knows two chords and refuses to learn a third on principle. The principle is unclear. He will fight you about it.',
        idle: 'phone',
        look: look('#e2b48c', '#e8d36a', 'spiky', '#4a6a3a', '#2a3550', 1.0, 1.05, ['bandana']) },
      { id: 'moth', name: 'Moth', fullName: 'Moth', nick: 'Moth', role: 'bass',
        hometown: 'The van (formerly Estevan)', skill: 44, mood: 58,
        wants: 'Permission to stay in the van. Forever.',
        bio: "Lives in the van full-time. You need permission to go in. Moth's mailing address is a parking spot.",
        idle: 'corner',
        look: look('#c99a72', '#4a3a2c', 'long', '#5b4f6e', '#3a3a3a', 1.05, 0.9, ['hat']) }
    ]
  };

  // ---- Rock: Gravel Kings (playable, v0.9) --------------------------
  bands.gravel_kings = {
    id: 'gravel_kings', name: 'Gravel Kings', genre: 'rock', city: 'Edmonton', region: 'canada',
    space: 'strip_mall_unit', spaceName: 'Unit 4B, Westgate Plaza', size: 4, rival: 'chartbusters',
    locked: false, comingIn: null,
    blurb: "Rock. A four-piece in an empty strip-mall unit in Edmonton. It's 1985 in there. It will always be 1985 in there.",
    coldOpen: [
      'Edmonton. Minus forty. A man in leather pants is jogging past a strip mall.',
      "That man is Chase Vanderhoek. He believes it's 1985. He's rented Unit 4B, between a nail salon and a vacuum repair.",
      "Lenny's riff sounds exactly like a famous one. Tamara hands out floss. You set up your kit where the till used to be.",
      'Gravel Kings are born. A lawyer calls before the first chorus ends.'
    ],
    starterSongs: [
      { title: 'Leather Pants at Forty Below', titleEn: null },
      { title: 'Legally Distinct Riff', titleEn: null }
    ],
    members: [
      { id: 'chase', name: 'Chase', fullName: 'Chase Vanderhoek', nick: 'The Chase', role: 'vocals',
        hometown: 'St. Albert', skill: 46, mood: 72,
        wants: 'For it to be 1985 again. Permanently.',
        bio: "Believes it's still 1985. Wears leather pants at minus 40 and calls his phone 'the future brick'.",
        idle: 'mirror',
        look: look('#ecc7a0', '#d9b25a', 'mullet', '#b9b9c2', '#1a1a1a', 1.04, 0.95, ['headband']) },
      { id: 'lenny', name: 'Lenny', fullName: 'Lenny Szabo', nick: 'Lawsuit', role: 'guitar',
        hometown: 'Leduc', skill: 55, mood: 60,
        wants: "One riff the lawyers don't call about.",
        bio: 'Every riff sounds a little too much like a famous one. The lawyers keep calling. ' +
          'He lets them go to voicemail, in the key of E.',
        idle: 'noodle',
        look: look('#dcae86', '#3b2a1e', 'long', '#2f4f6f', '#2a2a30', 1.0, 1.0, ['moustache']) },
      { id: 'tamara', name: 'Tamara', fullName: 'Tamara "T-Bone" Ruiz', nick: 'T-Bone', role: 'bass',
        hometown: 'Sherwood Park', skill: 52, mood: 66,
        wants: 'Everyone home by midnight, teeth flossed.',
        bio: 'The only functioning adult. A dental hygienist who flosses backstage and does the band taxes for fun.',
        idle: 'phone',
        look: look('#b98260', '#1c1412', 'bun', '#6aa7a0', '#34384a', 0.97, 1.0, ['glasses']) }
    ]
  };

  // ---- Country: The Grid Road Ramblers (playable, v0.9) --------------------------
  bands.grid_road_ramblers = {
    id: 'grid_road_ramblers', name: 'The Grid Road Ramblers', genre: 'country', city: 'Swift Current', region: 'canada',
    space: 'quonset', spaceName: "Duke's uncle's Quonset", size: 5, rival: 'buckle_and_boot',
    locked: false, comingIn: null,
    blurb: 'Country. A five-piece in a Quonset outside Swift Current. Heartbreak, trucks, a fiddle and a very large hat.',
    coldOpen: [
      'Outside Swift Current. A Quonset, a grid road, and a sunset the colour of canola.',
      "Travis Lee Beauchamp sings about a truck he's never owned. Earl says he played on the original. There is no original.",
      "Clementine tunes her fiddle like it's beneath her. Duke's hat enters the Quonset a full second before Duke.",
      'You drag a hay bale over as a drum throne. The Grid Road Ramblers are born.'
    ],
    starterSongs: [
      { title: "My Truck's Got Feelings", titleEn: null },
      { title: 'Condo Cowboy', titleEn: null }
    ],
    members: [
      { id: 'travis', name: 'Travis Lee', fullName: 'Travis Lee Beauchamp', nick: 'Travis Lee', role: 'vocals/acoustic',
        hometown: 'Regina (a condo)', skill: 47, mood: 68,
        wants: 'A real truck, a real farm, and to learn to drive stick.',
        bio: 'Writes heartbreaking songs about trucks and farms. Grew up in a Regina condo. Has never driven a truck. Has cried about one.',
        idle: 'noodle',
        look: look('#f0cda8', '#7a5230', 'short', '#8a5a3a', '#3b4f6b', 1.02, 0.95, ['hat']) },
      { id: 'earl', name: 'Earl', fullName: 'Earl Nakamura-Pike', nick: 'Earl', role: 'lead guitar',
        hometown: 'Lethbridge', skill: 60, mood: 64,
        wants: 'Someone to hear the whole story about the 1979 session.',
        bio: 'Seventy-year-old session legend who has played with everyone and will tell you about it, song by song, during your song.',
        idle: 'pace',
        look: look('#d9b894', '#cfcfcf', 'bald', '#4d6b4a', '#57504a', 0.95, 1.0, ['beard', 'glasses']) },
      { id: 'clementine', name: 'Clementine', fullName: 'Clementine Beaudry', nick: 'Clem', role: 'fiddle',
        hometown: 'Montréal', skill: 58, mood: 60,
        wants: 'To never be caught enjoying this.',
        bio: "Classically trained violinist 'slumming it'. Secretly loves every second. Keeps sheet music for Bach in her case in case anyone's watching.",
        idle: 'noodle',
        look: look('#f3d6be', '#b0452a', 'bun', '#2d3e66', '#1f1f28', 1.0, 0.95, []) },
      { id: 'duke', name: 'Duke', fullName: 'Duke Harlan', nick: 'Duke', role: 'bass',
        hometown: 'Maple Creek', skill: 32, mood: 74,
        wants: 'A bigger hat.',
        bio: 'Huge hat, modest bass skills. The hat is the character. The hat has more fans than the band.',
        idle: 'lunch',
        look: look('#c48d66', '#2a1f18', 'short', '#c9b27a', '#39465a', 1.1, 1.15, ['hat', 'moustache']) }
    ]
  };

  // ---- Rivals ------------------------------------------------------------
  // v0.6: Tundra Wraith's lineup (Gord "Grimnir" Penner + three accountants) lives in content/rivals.js; v0.9 (owner
  // decisions 2026-09-30): the other three rivals' casts come from the band packs (content/zz_band_*.js, rivalry.cast).
  var rivals = {
    tundra_wraith: { id: 'tundra_wraith', name: 'Tundra Wraith', city: 'Winnipeg', genre: 'metal',
      blurb: "Corpse paint on stage; off stage, four chartered accountants who are unbearably polite. Frontman Gord 'Grimnir' " +
        "Penner calls you 'buddy', sends fruit baskets, and wins every award you're up for." },
    mall_rats: { id: 'mall_rats', name: 'Mall Rats', city: 'Toronto', genre: 'punk',
      blurb: "TV-talent-show punk: frontman 'Blaze' (Kevin, from Oakville), a bassist who has never plugged in, a drummer picked " +
        'for his jawline, and Siobhan the stylist, who really runs it. Sponsored kickflips. Sponsor money for everyone.' },
    chartbusters: { id: 'chartbusters', name: 'Chartbusters', city: 'Vancouver', genre: 'rock',
      blurb: "Thirty years at the top. Rex Glamour wears a scarf in July. Four drummers, all named Steve. They quietly bought the " +
        'radio conglomerate. Every single is the same power ballad.' },
    buckle_and_boot: { id: 'buckle_and_boot', name: 'Buckle & Boot', city: 'Red Deer', genre: 'country',
      blurb: "Truck-ad cousins Brayden and Colt, ex-junior hockey. One sings about tailgates, the other 'plays' an unplugged guitar. " +
        "Their sponsor's mascot, a guy in a pickup costume, is basically the third member." }
  };

  // ---- v0.9 "Genres": band + member fields (stage 0, lead; Lane A owns this file from here) ----------------------
  // roles: who plays which text role when shared content uses {namer} / {grumbler} / {deadpan} (see C.TOKENS).
  var V09_BANDS = {
    hail_damage: { roles: { namer: 'marcel', grumbler: 'marcel', deadpan: 'kenji' }, firstGig: 'buddys_house_party', homeRing: 'sask',
      spaceShort: 'the garage', door: 'the garage door', province: 'SK', coldOpenFx: 'hail', throne: 'crate' },
    frost_heave: { roles: { namer: 'rox', grumbler: 'benny', deadpan: 'moth' }, firstGig: 'craigs_basement', homeRing: 'sask',
      spaceShort: 'the basement', door: 'the basement stairs', province: 'SK', coldOpenFx: 'snow', throne: 'bucket' },
    gravel_kings: { roles: { namer: 'chase', grumbler: 'chase', deadpan: 'tamara' }, firstGig: 'mill_woods_basement_party', homeRing: 'alberta',
      spaceShort: 'Unit 4B', door: 'the shop door', province: 'AB', coldOpenFx: 'neon', throne: 'crate' },
    grid_road_ramblers: { roles: { namer: 'travis', grumbler: 'earl', deadpan: 'clementine' }, firstGig: 'quonset_yard_party', homeRing: 'sask',
      spaceShort: 'the Quonset', door: 'the Quonset door', province: 'SK', coldOpenFx: 'dust', throne: 'haybale' }
  };
  // gear (C.GEAR; none = mic only), look.top, flags; signature = the member's once-a-gig stage action (combo >= 40).
  var V09_MEMBERS = {
    marcel: { cape: true, signature: { action: 'capeSpin', combo: 40, crowd: 8, flag: 'cape' } },
    dana: { gear: 'v' }, jaxon: { gear: 'v' }, kenji: { gear: 'bass', silent: true },
    rox: { gear: 'sg', top: 'jacket', signature: { action: 'stageDive', combo: 40, crowd: 8 } },
    benny: { gear: 'sg', top: 'tee' },
    moth: { gear: 'bass', top: 'hoodie', swapExtra: ['hat', 'toque'] },
    chase: { top: 'jacket', signature: { action: 'kneeSlide', combo: 40, crowd: 8 } },
    lenny: { gear: 'strat', top: 'tee' }, tamara: { gear: 'bass', top: 'tee' },
    travis: { gear: 'acoustic', top: 'flannel' }, earl: { gear: 'tele', top: 'flannel' },
    clementine: { gear: 'fiddle', top: 'jacket', idle: 'fiddle' },
    duke: { gear: 'bass', top: 'flannel', swapExtra: ['hat', 'bighat'], signature: { action: 'hatTip', combo: 40, crowd: 8 } }
  };
  Object.keys(V09_BANDS).forEach(function (id) {
    var b = bands[id], f = V09_BANDS[id];
    Object.keys(f).forEach(function (k) { b[k] = f[k]; });
    b.members.forEach(function (m) {
      var x = V09_MEMBERS[m.id]; if (!x) return;
      if (x.gear) m.gear = x.gear;
      if (x.silent) m.silent = true;
      if (x.cape) m.cape = true;
      if (x.signature) m.signature = x.signature;
      if (x.idle) m.idle = x.idle;
      if (x.top && m.look) m.look.top = x.top;
      if (x.swapExtra && m.look) m.look.extras = m.look.extras.map(function (e) { return e === x.swapExtra[0] ? x.swapExtra[1] : e; });
    });
  });

  GG.content.bands = bands;
  GG.content.rivals = rivals;
})(window.GG);
