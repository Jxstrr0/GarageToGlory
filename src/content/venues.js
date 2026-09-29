// venues.js: gig venues (owned by the WORLD agent). v0.3: tier 1 (DIY) and tier 2 (bars & clubs) across the
// Saskatchewan core (cities in content/map.js). Every v0.1 venue id is kept (cards book them).
// v0.5 (CAREER agent): tier 3 theatres (500–2,000), bookable from the Signed era (economy.world.eraTier). They use
//   kind 'club' for the stage dressing until a 'theatre' kind exists; `theatre: true` marks them. The house takes its
//   cut up front, so door pay per head is lower than in the bars.
// Contract fields: id, name, city (a content/map.js city name), region, tier (1 DIY, 2 bars & clubs),
//   kind (contracts.VENUE_KINDS), capacity, minFans (fans needed to be listed/booked/offered; 99999 = card-only),
//   genreFit { metal, punk, rock, country } 0..1, quirk (one funny line), catch (the listing's small print),
//   walkIns (people there anyway), setSize (songs you play), deals (the deal options the board can list),
//   payRange { flat: [lo, hi] $ guarantee, door: [lo, hi] $ per head } (exposure always pays 0).
//   deal + pay = the default deal for GG.gig.makeGig (card bookings, v0.1); gas = v0.1 round-trip $ from Saskatoon
//   (the board computes gas from road km instead).
(function (GG) {
  var FIT = {   // genre-fit presets: [metal, punk, rock, country]
    loud: [1, 0.9, 0.9, 0.6], diy: [0.8, 1, 0.9, 0.7], hall: [0.4, 0.5, 0.8, 1], church: [0.3, 0.4, 0.7, 0.9],
    skate: [0.9, 1, 0.8, 0.4], country: [0.3, 0.4, 0.7, 1], club: [0.9, 0.8, 1, 0.5], any: [0.8, 0.8, 0.9, 0.8]
  };
  function fit(k) { var f = FIT[k]; return { metal: f[0], punk: f[1], rock: f[2], country: f[3] }; }

  GG.content.venues = [
    /* ---- Tier 1: DIY ------------------------------------------------------------------------------ */
    { id: 'buddys_house_party', name: "Buddy's House Party", city: 'Saskatoon', region: 'canada', tier: 1, kind: 'house',
      capacity: 15, deal: 'exposure', pay: 0, minFans: 0, walkIns: 8, gas: 5, setSize: 2,
      deals: ['exposure'], payRange: {},
      genreFit: { metal: 0.8, punk: 1, rock: 0.9, country: 0.7 },
      quirk: 'Twelve people and a dog.',
      catch: "Buddy's mom gets home at eleven. Hard stop." },

    { id: 'gopher_hole_openmic', name: 'The Gopher Hole — Open Mic Night', city: 'Saskatoon', region: 'canada', tier: 1, kind: 'openmic',
      capacity: 40, deal: 'exposure', pay: 0, minFans: 0, walkIns: 12, gas: 5, setSize: 2,
      deals: ['exposure'], payRange: {},
      genreFit: { metal: 0.6, punk: 0.8, rock: 0.9, country: 0.9 },
      quirk: 'The host does slam poetry between acts. All of it is about his divorce.',
      catch: 'Sign-up opens at six. You go on at 11:40.' },

    { id: 'martensville_skatepark', name: 'Martensville Skatepark (All-Ages)', city: 'Martensville', region: 'canada', tier: 1, kind: 'skatepark',
      capacity: 70, deal: 'exposure', pay: 0, minFans: 25, walkIns: 20, gas: 20, setSize: 3,
      deals: ['exposure'], payRange: {},
      genreFit: { metal: 0.9, punk: 1, rock: 0.8, country: 0.4 },
      quirk: 'The stage is a half-pipe. Nobody has ever finished a set without rolling in.',
      catch: 'Generator power. When the fries go on, the amps go off.' },

    { id: 'legion_63', name: 'Legion Hall, Branch 63', city: 'Saskatoon', region: 'canada', tier: 1, kind: 'legion',
      capacity: 60, deal: 'flat', pay: 80, minFans: 40, walkIns: 14, gas: 5, setSize: 4,
      deals: ['flat', 'door'], payRange: { flat: [60, 100], door: [1, 2] },
      genreFit: { metal: 0.4, punk: 0.5, rock: 0.8, country: 1 },
      quirk: 'The meat draw runs during your set, and it has the right of way.',
      catch: "Volume limit: whatever doesn't rattle the medals." },

    { id: 'bingo_palace', name: 'Bingo Palace', city: 'Saskatoon', region: 'canada', tier: 1, kind: 'bingo',
      capacity: 80, deal: 'flat', pay: 100, minFans: 70, walkIns: 25, gas: 5, setSize: 3,
      deals: ['flat'], payRange: { flat: [80, 120] },
      genreFit: { metal: 0.5, punk: 0.6, rock: 0.8, country: 0.9 },
      quirk: 'You play between games. Every time someone yells BINGO, you stop.',
      catch: 'Dabbers are not to be thrown at the band. This is enforced loosely.' },

    { id: 'warman_curling_lounge', name: 'Warman Curling Rink Lounge', city: 'Warman', region: 'canada', tier: 1, kind: 'curling',
      capacity: 50, deal: 'flat', pay: 120, minFans: 90, walkIns: 15, gas: 25, setSize: 4,
      deals: ['flat', 'exposure'], payRange: { flat: [90, 130] },
      genreFit: { metal: 0.5, punk: 0.5, rock: 0.9, country: 1 },
      quirk: 'The window behind you overlooks sheet three. Nobody is watching you.',
      catch: 'You set up after the last end. The last end never ends.' },

    { id: 'st_vlads_hall', name: "St. Vlad's Church Hall", city: 'Saskatoon', region: 'canada', tier: 1, kind: 'church',
      capacity: 90, deal: 'flat', pay: 150, minFans: 99999, walkIns: 30, gas: 5, setSize: 4,   // card-only
      deals: ['flat'], payRange: { flat: [150, 150] },
      genreFit: { metal: 0.3, punk: 0.4, rock: 0.6, country: 0.8 },
      quirk: 'Perogies at intermission. No screaming during grace.',
      catch: 'Father Mykola approves the setlist. In advance. In writing.' },

    { id: 'craigs_basement', name: "Craig's Basement", city: 'Regina', region: 'canada', tier: 1, kind: 'house',
      capacity: 25, deal: 'exposure', pay: 0, minFans: 0, walkIns: 10, gas: 120, setSize: 2,
      deals: ['exposure'], payRange: {},
      genreFit: fit('diy'),
      quirk: 'The ceiling is five foot eleven. Marcel is six foot one.',
      catch: "Craig's roommate works nights and is asleep directly above you." },

    { id: 'leaning_silo_openmic', name: 'The Leaning Silo — Open Stage', city: 'Regina', region: 'canada', tier: 1, kind: 'openmic',
      capacity: 45, deal: 'exposure', pay: 0, minFans: 20, walkIns: 10, gas: 120, setSize: 2,
      deals: ['exposure'], payRange: {},
      genreFit: { metal: 0.5, punk: 0.8, rock: 0.9, country: 1 },
      quirk: 'The stage leans four degrees west. So does the audience.',
      catch: "Every act gets a free pickle. It's not optional." },

    { id: 'speedy_creek_skate_bowl', name: 'Speedy Creek Skate Bowl', city: 'Swift Current', region: 'canada', tier: 1, kind: 'skatepark',
      capacity: 60, deal: 'exposure', pay: 0, minFans: 45, walkIns: 12, gas: 122, setSize: 3,
      deals: ['exposure'], payRange: {},
      genreFit: fit('skate'),
      quirk: 'The bowl echoes. Every snare hit comes back twice, slightly late.',
      catch: 'Wind gusts to seventy. Hold on to the cymbals.' },

    { id: 'st_olgas_hall', name: "St. Olga's Parish Hall", city: 'Prince Albert', region: 'canada', tier: 1, kind: 'church',
      capacity: 80, deal: 'flat', pay: 80, minFans: 60, walkIns: 15, gas: 70, setSize: 3,
      deals: ['flat'], payRange: { flat: [60, 100] },
      genreFit: fit('church'),
      quirk: 'The perogy committee runs the sound board. Mostly by feel.',
      catch: "No devil horns in the hall. They'll know." },

    { id: 'legion_59_moose_jaw', name: 'Moose Jaw Legion, Branch 59', city: 'Moose Jaw', region: 'canada', tier: 1, kind: 'legion',
      capacity: 70, deal: 'flat', pay: 90, minFans: 55, walkIns: 14, gas: 110, setSize: 3,
      deals: ['flat', 'door'], payRange: { flat: [70, 110], door: [1, 2] },
      genreFit: fit('hall'),
      quirk: 'A retired sergeant-major times your songs with a stopwatch.',
      catch: 'Anything over four minutes and he stands up. Nobody wants him to stand up.' },

    { id: 'battlefords_bingo_barn', name: 'Battlefords Bingo Barn', city: 'North Battleford', region: 'canada', tier: 1, kind: 'bingo',
      capacity: 90, deal: 'flat', pay: 90, minFans: 80, walkIns: 18, gas: 69, setSize: 3,
      deals: ['flat'], payRange: { flat: [70, 110] },
      genreFit: { metal: 0.5, punk: 0.6, rock: 0.8, country: 0.9 },
      quirk: 'The barn is an actual barn. The cows were never told.',
      catch: "Play too loud and the bingo balls jump. That's a riot waiting to happen." },

    { id: 'queen_city_bingo', name: 'Queen City Bingo-Rama', city: 'Regina', region: 'canada', tier: 1, kind: 'bingo',
      capacity: 100, deal: 'flat', pay: 110, minFans: 110, walkIns: 20, gas: 120, setSize: 3,
      deals: ['flat'], payRange: { flat: [90, 130] },
      genreFit: { metal: 0.4, punk: 0.5, rock: 0.8, country: 0.9 },
      quirk: 'The caller has a louder PA than you and knows it.',
      catch: 'Intermission is the $500 blackout game. You are not the main event.' },

    { id: 'holy_pyrohy_hall', name: 'Holy Pyrohy Ukrainian Hall', city: 'Yorkton', region: 'canada', tier: 1, kind: 'church',
      capacity: 120, deal: 'flat', pay: 100, minFans: 130, walkIns: 20, gas: 165, setSize: 3,
      deals: ['flat', 'door'], payRange: { flat: [80, 130], door: [1, 2] },
      genreFit: fit('church'),
      quirk: 'The dance troupe rehearses at the same time. They have swords.',
      catch: 'You play after the wedding speeches. There are eleven speeches.' },

    /* ---- Tier 2: bars & clubs (100–400) ------------------------------------------------------------ */
    { id: 'gopher_hole', name: 'The Gopher Hole', city: 'Saskatoon', region: 'canada', tier: 2, kind: 'bar',
      capacity: 150, deal: 'door', pay: 3, minFans: 150, walkIns: 20, gas: 5, setSize: 5,
      deals: ['door', 'flat'], payRange: { door: [2, 3], flat: [140, 200] },
      genreFit: { metal: 1, punk: 0.9, rock: 0.9, country: 0.6 },
      quirk: 'The sound guy hates drummers. Specifically you.',
      catch: 'The monitors face the bar, not the stage. On purpose.' },

    { id: 'club_permafrost', name: 'Club Permafrost', city: 'Saskatoon', region: 'canada', tier: 2, kind: 'club',
      capacity: 300, deal: 'door', pay: 3, minFans: 800, walkIns: 40, gas: 5, setSize: 5,
      deals: ['door', 'flat'], payRange: { door: [1.5, 2.5], flat: [200, 300] },
      genreFit: fit('club'),
      quirk: "The fog machine is stuck on. It's been on since the last ice age.",
      catch: "The DJ goes on at 12:30 sharp, even if you're mid-song." },

    { id: 'pile_o_bones_tavern', name: "Pile o' Bones Tavern", city: 'Regina', region: 'canada', tier: 2, kind: 'bar',
      capacity: 180, deal: 'door', pay: 2, minFans: 450, walkIns: 25, gas: 120, setSize: 4,
      deals: ['door', 'flat', 'exposure'], payRange: { door: [1.5, 2.5], flat: [150, 220] },
      genreFit: fit('loud'),
      quirk: 'The chicken wire in front of the stage is load-bearing.',
      catch: 'Load-in is through the kitchen. The cook charges a toll: one song request.' },

    { id: 'rum_runners_tunnel', name: "The Rum-Runner's Tunnel", city: 'Moose Jaw', region: 'canada', tier: 2, kind: 'bar',
      capacity: 120, deal: 'door', pay: 2, minFans: 260, walkIns: 20, gas: 110, setSize: 4,
      deals: ['door', 'flat'], payRange: { door: [1.5, 2.5], flat: [120, 170] },
      genreFit: { metal: 0.8, punk: 0.9, rock: 1, country: 0.7 },
      quirk: "The ceiling is so low Marcel's cape has caught fire twice. Both times during the chorus.",
      catch: 'The stage is underground. No phones work down here. Not even yours.' },

    { id: 'speedy_creek_saloon', name: 'Speedy Creek Saloon', city: 'Swift Current', region: 'canada', tier: 2, kind: 'bar',
      capacity: 140, deal: 'flat', pay: 150, minFans: 240, walkIns: 20, gas: 122, setSize: 4,
      deals: ['flat', 'door'], payRange: { flat: [120, 180], door: [1.5, 2.5] },
      genreFit: fit('country'),
      quirk: "A country bar. The crowd only wants covers, and only one: 'the one about the truck'.",
      catch: 'Wrong genre pays hazard rates here. The boots are steel-toed.' },

    { id: 'gateway_bar_and_bait', name: 'Gateway Bar & Bait', city: 'Prince Albert', region: 'canada', tier: 2, kind: 'bar',
      capacity: 110, deal: 'door', pay: 2, minFans: 220, walkIns: 18, gas: 70, setSize: 4,
      deals: ['door', 'flat', 'exposure'], payRange: { door: [1.5, 2.5], flat: [110, 160] },
      genreFit: fit('any'),
      quirk: 'Half bar, half bait shop. The minnow tank sits right next to the kick drum.',
      catch: 'Part of the pay is in walleye. You may decline the walleye.' },

    { id: 'yellowhead_inn_lounge', name: 'Yellowhead Inn Lounge', city: 'North Battleford', region: 'canada', tier: 2, kind: 'bar',
      capacity: 100, deal: 'flat', pay: 130, minFans: 200, walkIns: 15, gas: 69, setSize: 4,
      deals: ['flat', 'door'], payRange: { flat: [100, 150], door: [1.5, 2.5] },
      genreFit: { metal: 0.7, punk: 0.7, rock: 0.9, country: 0.9 },
      quirk: 'The VLTs are louder than the band and have a better light show.',
      catch: 'The set stops every time someone wins big. Nobody ever wins big.' },

    { id: 'grain_exchange', name: 'The Grain Exchange', city: 'Yorkton', region: 'canada', tier: 2, kind: 'club',
      capacity: 250, deal: 'door', pay: 2, minFans: 700, walkIns: 35, gas: 165, setSize: 5,
      deals: ['door', 'flat'], payRange: { door: [1.5, 2.5], flat: [180, 260] },
      genreFit: { metal: 0.8, punk: 0.8, rock: 1, country: 0.8 },
      quirk: 'A converted grain elevator. Seven storeys of reverb.',
      catch: "The stage is on the third floor. The freight elevator is 'mostly fine'." },

    /* ---- Tier 3: theatres (500–2,000), from the Signed era (v0.5) ------------------------------------ */
    { id: 'broadway_bijou', name: 'The Broadway Bijou', city: 'Saskatoon', region: 'canada', tier: 3, kind: 'club', theatre: true,
      capacity: 550, deal: 'door', pay: 1.5, minFans: 1500, walkIns: 60, gas: 5, setSize: 5,
      deals: ['door', 'flat'], payRange: { door: [1.2, 1.8], flat: [600, 850] },
      genreFit: { metal: 0.8, punk: 0.8, rock: 1, country: 0.8 },
      quirk: 'The velvet seats are older than your parents. Marcel has asked to wear one.',
      catch: 'A seated show. The ushers shush the mosh pit.' },

    { id: 'crescent_moose_theatre', name: 'The Crescent Moose Theatre', city: 'Moose Jaw', region: 'canada', tier: 3, kind: 'club', theatre: true,
      capacity: 500, deal: 'flat', pay: 650, minFans: 1400, walkIns: 55, gas: 110, setSize: 5,
      deals: ['flat', 'door'], payRange: { flat: [550, 800], door: [1.2, 1.8] },
      genreFit: { metal: 0.7, punk: 0.7, rock: 0.9, country: 1 },
      quirk: 'A 1916 vaudeville house. The ghost in the balcony only claps for ballads.',
      catch: 'The fly system drops a sandbag once a night. Nobody knows when.' },

    { id: 'perogy_palace_theatre', name: 'The Perogy Palace Theatre', city: 'Yorkton', region: 'canada', tier: 3, kind: 'club', theatre: true,
      capacity: 650, deal: 'door', pay: 1.4, minFans: 2000, walkIns: 70, gas: 165, setSize: 5,
      deals: ['door', 'flat'], payRange: { door: [1.1, 1.7], flat: [650, 950] },
      genreFit: { metal: 0.8, punk: 0.8, rock: 0.9, country: 0.9 },
      quirk: 'The concession sells perogies by the dozen. The front row throws them during solos.',
      catch: 'Half the crowd is here for the perogies. Win them over anyway.' },

    { id: 'northern_gateway_hall', name: 'Northern Gateway Performing Arts Barn', city: 'Prince Albert', region: 'canada', tier: 3, kind: 'club', theatre: true,
      capacity: 800, deal: 'door', pay: 1.3, minFans: 2600, walkIns: 80, gas: 70, setSize: 5,
      deals: ['door', 'flat'], payRange: { door: [1.0, 1.5], flat: [750, 1100] },
      genreFit: fit('any'),
      quirk: 'A real barn with real seats. The acoustics are great if you like hay.',
      catch: 'Blackflies get into the lighting rig. The lighting guy calls it "texture".' },

    { id: 'lucky_buffalo_showroom', name: 'Lucky Buffalo Casino Showroom', city: 'Regina', region: 'canada', tier: 3, kind: 'club', theatre: true,
      capacity: 950, deal: 'flat', pay: 1000, minFans: 3200, walkIns: 110, gas: 120, setSize: 5,
      deals: ['flat', 'door'], payRange: { flat: [850, 1250], door: [0.9, 1.4] },
      genreFit: { metal: 0.5, punk: 0.5, rock: 0.9, country: 1 },
      quirk: 'The slot machines ding in 4/4, always a hair behind your tempo.',
      catch: 'Part of the pay comes in buffet vouchers. The buffet is excellent.' },

    { id: 'wascana_performing_arts', name: "Pile o' Bones Performing Arts Centre", city: 'Regina', region: 'canada', tier: 3, kind: 'club', theatre: true,
      capacity: 1800, deal: 'door', pay: 0.9, minFans: 6500, walkIns: 150, gas: 120, setSize: 5,
      deals: ['door', 'flat'], payRange: { door: [0.7, 1.1], flat: [1300, 1800] },
      genreFit: { metal: 0.7, punk: 0.7, rock: 1, country: 0.9 },
      quirk: 'The symphony was here last night. Their timpani are still on stage, and you are not allowed to touch them.',
      catch: 'Union crew. Their lunch break is at 9:40 p.m., mid-song or not.' },

    { id: 'riverbend_auditorium', name: 'Riverbend Centennial Auditorium', city: 'Saskatoon', region: 'canada', tier: 3, kind: 'club', theatre: true,
      capacity: 2000, deal: 'door', pay: 0.9, minFans: 8000, walkIns: 160, gas: 5, setSize: 5,
      deals: ['door', 'flat'], payRange: { door: [0.7, 1.1], flat: [1400, 1900] },
      genreFit: fit('any'),
      quirk: 'There is an orchestra pit. Someone will fall in. It is usually Jaxon.',
      catch: 'Your mom bought forty tickets and will be introducing you.' }
  ];

  // Local bands you can open for (opening slots on the board). draw = the crowd they bring on their own.
  // The rival (bands[..].rival) can headline too, rarely; its draw is in 26_sim_world's config.
  GG.content.headliners = [
    { id: 'combine_of_sorrow', name: 'Combine Harvester of Sorrow', city: 'Saskatoon', genre: 'metal', draw: 120,
      blurb: 'Doom metal about crop insurance. Every song is eleven minutes long.' },
    { id: 'slough_monster', name: 'Slough Monster', city: 'Regina', genre: 'metal', draw: 100,
      blurb: 'Swamp sludge from the flattest place on earth. They bring their own fog, and it smells.' },
    { id: 'the_hoarfrosts', name: 'The Hoarfrosts', city: 'Saskatoon', genre: 'punk', draw: 90,
      blurb: 'Three chords, one parka each. They only play in winter, out of principle.' },
    { id: 'rm_344', name: 'Rural Municipality 344', city: 'Moose Jaw', genre: 'punk', draw: 80,
      blurb: 'Angry songs about gravel road maintenance. The reeve is a fan.' },
    { id: 'bunnock_kings', name: 'The Bunnock Kings', city: 'Regina', genre: 'rock', draw: 140,
      blurb: 'Bar rock named after a lawn game played with horse bones. Every show ends in a tournament.' },
    { id: 'gopher_derby', name: 'The Gopher Derby', city: 'Prince Albert', genre: 'rock', draw: 90,
      blurb: 'Garage rock with a mascot costume. Nobody knows who is inside the gopher.' },
    { id: 'stubble_burners', name: 'Stubble Burners', city: 'Swift Current', genre: 'country', draw: 130,
      blurb: 'Two brothers, one fiddle, a combined forty belt buckles.' }
  ];
})(window.GG);
