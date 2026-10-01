// content/world.js: the World stage (v0.7, WORLDSIM). Four regions abroad (Addendum 1 C6; no USA, ever), their cities
// on stylized regional maps (x/y in a 0..100 box, y down), parody venues + festivals, preset tour packages with a few
// choices (rental vehicle, where you sleep, one extra), region Monday cards, overseas seasons/weather/holidays (C7),
// the Japanese fan-club president (C5), the Global Gong and regional chart names. Read by 25_sim_tour.js (GG.tour).
// Shapes:
//   regions:  { <id>: { id, name, short, icon, blurb, fans (base unlock threshold), flight ($/person, return), scene (fans
//               gigs can reach there), breakAt (region fans = "broken"), kmScale (km per map unit), road, chart, home } }
//   fit:      { <genre>: { <region>: 0..1 } } genre-region fit (A10): thresholds x (1.6 - fit), venue genreFit, crowds
//   cities:   { <id>: { id, name, region, x, y, country, temp (°C offset), site? (festival grounds), blurb } }
//   venues:   [ { id, name, city, region, tier 2|3|4, kind (C.VENUE_KINDS), capacity, pay [lo, hi] (flat), quirk, catch,
//               festival?, hall?, outdoor?, weeks? [lo, hi] week of year, moose? (the Moose Opera), setSize } ]
//   packages: [ { id, region, name, blurb, stops: [ { city, venue|null (open date: pick from the regional board) } ],
//               showcase? (one week; the label covers part of the flights), festival? (festival stops fix the departure
//               week: GG.tour.departWindow), needs? 'moose', minRegionFans? } ]
//   vehicles: { <id>: { id, region, name, blurb, perWeek, comfort 1..5, breakdown 0..1 per leg, seats, look } }
//   stays / extras: { <id>: { id, name, blurb, perWeek|cost, homesick, mood, fans, score, burnout } }
//   cards:    Monday-card schema (type, speaker, gate { region, era, band?, weekOfYear? }) + city? [cityIds] + story?
//             (forced by the sim only). Extra effect key `tour`: { regionFans, homesick, gift, endTour, accept, big }.
//   Tokens: {band} {player} {city} {nick:id} {name:id} + {region} {song} {n} {rival} {venue} {festival} {money}.
// v0.9 "Genres" (plan_contract_0.9 §4.1): the flat text is neutral (no Hail Damage people); per band:
//   world.byBand[bandId] = { lines: { depart: { <region>: text }, home, rival, moose, gongNominated, gongLost, ... },
//     callHome: { generic: [text] }, cityLines: { <cityId>: [text] } } (added / replacing via career.pool),
//   world.gongCarpet[bandId] = [{ who, text }] (the Global Gong red carpet, 5i_ui_tour), callHome[memberId] (member-keyed),
//   story cards: a band's own '<id>_<bandId>' (packs) beats the base card; the bases wt_invite / wt_homesick read right for
//   every band (tokens), so Hail Damage keeps the base ids the tour sim and its tests expect;
//   region cards gated { band: [...] }. A band's World payoff package (owner Q3) comes from its pack: needs { flag, is?, band? }.
(function (GG) {
  var W = GG.content.world = {};

  W.regions = {
    uk_europe: { id: 'uk_europe', pin: [50, 28], name: 'UK & Europe', short: 'Europe', icon: '🏰', home: 'london',
      blurb: 'Rain, pub gigs, tiny vans and festival mud. Twelve cities, two festivals and one opera house with a moose problem.',
      fans: 38000, flight: 550, scene: 25000, breakAt: 5000, kmScale: 30, road: 'the M6 and the Autobahn',
      chart: 'The Official Chartz', currency: 'pounds, euros and drink tickets' },
    japan: { id: 'japan', pin: [90, 40], name: 'Japan', short: 'Japan', icon: '🗾', home: 'tokyo',
      blurb: 'Polite, silent crowds until the song ends. Then the roof comes off. Fan gifts. Bullet trains. Budokhan Hall.',
      fans: 42000, flight: 900, scene: 18000, breakAt: 4000, kmScale: 18, road: 'the Tomei Expressway',
      chart: 'Oricorn Weekly', currency: 'yen and tiny gift bags' },
    australia: { id: 'australia', pin: [88, 80], name: 'Australia', short: 'Australia', icon: '🦘', home: 'sydney',
      blurb: 'Seasons upside down: a Canadian winter is Aussie festival summer. Vast drives. Check the kick drum for spiders.',
      fans: 40000, flight: 1150, scene: 14000, breakAt: 3500, kmScale: 42, road: 'the Stuart Highway',
      chart: 'The AREA Top 50', currency: 'dollars (the other kind)' },
    russia: { id: 'russia', pin: [70, 18], name: 'Russia', short: 'Russia', icon: '🐻', home: 'moscow',
      blurb: 'Brutal winters, bright summer nights, a festival at minus forty by Lake Baikal and a bus that has seen things.',
      fans: 46000, flight: 650, scene: 15000, breakAt: 3500, kmScale: 95, road: 'the Trans-Siberian Highway',
      chart: 'The Red Square 40', currency: 'roubles and pickles' }
  };

  W.canadaPin = [18, 30];   // the world map: Canada on the left, the four regions around it (stylized, no USA)

  // A10: metal huge in Japan & Europe, strong in Russia; punk loves the UK, Australia solid; rock big in UK/Europe/
  // Australia; country huge in Australia, decent in the UK, cult in Japan.
  W.fit = {
    metal: { uk_europe: 1, japan: 1, australia: 0.7, russia: 0.88 },
    punk: { uk_europe: 0.98, japan: 0.65, australia: 0.82, russia: 0.55 },
    rock: { uk_europe: 0.95, japan: 0.7, australia: 0.95, russia: 0.6 },
    country: { uk_europe: 0.72, japan: 0.6, australia: 1, russia: 0.45 }
  };

  function city(id, name, region, x, y, country, temp, blurb, site) {
    return { id: id, name: name, region: region, x: x, y: y, country: country, temp: temp || 0, blurb: blurb, site: !!site };
  }
  W.cities = {};
  [
    city('london', 'London', 'uk_europe', 38, 60, 'England', 0, 'Pub gigs, a zebra crossing, Abbot Lane Studios. It is raining.'),
    city('manchester', 'Manchester', 'uk_europe', 34, 50, 'England', -1, 'Everyone here was in a band once. It is also raining.'),
    city('glasgow', 'Glasgow', 'uk_europe', 29, 36, 'Scotland', -2, 'The loudest crowds in the UK, and they sing the guitar solos.'),
    city('dublin', 'Dublin', 'uk_europe', 18, 48, 'Ireland', 0, 'Every pub has a band. Every band has a fiddle. Even yours, eventually.'),
    city('paris', 'Paris', 'uk_europe', 42, 72, 'France', 1, 'France loves a Canadian band with an accent. Nobody knows why.'),
    city('amsterdam', 'Amsterdam', 'uk_europe', 50, 58, 'the Netherlands', 0, 'Bikes, canals and a venue in a former church.'),
    city('berlin', 'Berlin', 'uk_europe', 64, 56, 'Germany', 0, 'The gear shops never close. Neither do the guitarists.'),
    city('prague', 'Prague', 'uk_europe', 66, 66, 'Czechia', -1, 'Cobblestones, castles and the best-sounding cellar on the continent.'),
    city('madrid', 'Madrid', 'uk_europe', 22, 92, 'Spain', 6, 'Doors at midnight. Nobody arrives before one.'),
    city('oslo', 'Oslo', 'uk_europe', 56, 24, 'Norway', -4, 'Black-metal royalty buys milk at the corner store here.'),
    city('stockholm', 'Stockholm', 'uk_europe', 70, 22, 'Sweden', -3, 'Everyone is taller than the band and politely pretends not to be.'),
    city('helsinki', 'Helsinki', 'uk_europe', 86, 18, 'Finland', -5, 'Metal on the radio, saunas everywhere, and a moose concept album on the charts?'),
    city('mudstonbury', 'Mudstonbury', 'uk_europe', 33, 64, 'England', 0, 'A farm in the English countryside. Once a year it becomes a festival made of mud.', true),
    city('wackelstein', 'Wackelstein', 'uk_europe', 58, 46, 'Germany', -1, 'A village in northern Germany. Pop. 1,800. Plus 75,000 metalheads every August.', true),
    city('tokyo', 'Tokyo', 'japan', 72, 56, 'Japan', 0, 'Neon, vending machines on every corner and Budokhan Hall.'),
    city('osaka', 'Osaka', 'japan', 46, 68, 'Japan', 1, 'The loud city. They cheer between the songs AND during the encore.'),
    city('nagoya', 'Nagoya', 'japan', 58, 64, 'Japan', 0, 'Halfway between everything. The band eats miso katsu twice a day.'),
    city('kyoto', 'Kyoto', 'japan', 50, 63, 'Japan', 0, 'Temples, gardens and one very small club in an old sake warehouse.'),
    city('sendai', 'Sendai', 'japan', 76, 38, 'Japan', -2, 'Grilled beef tongue and a crowd that learned your lyrics phonetically.'),
    city('sapporo', 'Sapporo', 'japan', 80, 10, 'Japan', -6, 'Snow festivals and a winter that makes the prairies nod in respect.'),
    city('fukuoka', 'Fukuoka', 'japan', 18, 80, 'Japan', 2, 'Street-stall ramen at 2 a.m. after the show. Every show.'),
    city('hiroshima', 'Hiroshima', 'japan', 32, 72, 'Japan', 1, 'A calm, kind city with a very loud little club.'),
    city('sydney', 'Sydney', 'australia', 86, 64, 'Australia', 0, 'The harbour, the bridge, and Big Day Inn every January.'),
    city('melbourne', 'Melbourne', 'australia', 74, 80, 'Australia', -2, 'Four seasons in one day and a pub on every corner with a band in it.'),
    city('brisbane', 'Brisbane', 'australia', 90, 46, 'Australia', 3, 'Hot, humid and one very large spider per room.'),
    city('adelaide', 'Adelaide', 'australia', 60, 70, 'Australia', 0, 'Churches, wineries and a sold-out metal night on a Tuesday.'),
    city('perth', 'Perth', 'australia', 8, 64, 'Australia', 1, 'The most isolated city on Earth. Four days\' drive from anywhere, and they know it.'),
    city('hobart', 'Hobart', 'australia', 78, 94, 'Australia', -5, 'Tasmania. Cold wind off the Southern Ocean. Feels like home, briefly.'),
    city('darwin', 'Darwin', 'australia', 48, 8, 'Australia', 8, 'Tropical. There are crocodiles on the signs and, the signs insist, in the water.'),
    city('alice_springs', 'Alice Springs', 'australia', 50, 42, 'Australia', 4, 'The red centre. Two thousand km of desert in every direction.'),
    city('moscow', 'Moscow', 'russia', 8, 50, 'Russia', 0, 'Onion domes, a ring road and a club with a real tank in the lobby.'),
    city('st_petersburg', 'St. Petersburg', 'russia', 10, 30, 'Russia', 0, 'Canals, palaces and white summer nights when nobody sleeps.'),
    city('kazan', 'Kazan', 'russia', 22, 50, 'Russia', -1, 'Where the Volga meets the Kazanka and a chak-chak meets your mouth.'),
    city('yekaterinburg', 'Yekaterinburg', 'russia', 34, 46, 'Russia', -3, 'Right on the line between Europe and Asia. The band takes a photo on it.'),
    city('novosibirsk', 'Novosibirsk', 'russia', 52, 56, 'Russia', -5, 'Siberia\'s big city. The opera house is bigger than most prairie airports.'),
    city('irkutsk', 'Irkutsk', 'russia', 68, 64, 'Russia', -8, 'Lake Baikal, the deepest lake on Earth, and Siberian Frostfest every January.'),
    city('vladivostok', 'Vladivostok', 'russia', 94, 76, 'Russia', -2, 'The end of the line. Nine thousand km from Moscow and still the same country.'),
    // v0.9: the Grid Road Ramblers' Q3 payoff town (their pack's au_country_circuit package ends here). Listed last so the
    // city order the sims iterate is the same as when the pack added it.
    city('tumbleworth', 'Tumbleworth', 'australia', 84, 56, 'Australia', 3,
      'A country town in New South Wales that becomes the country-music capital of the southern hemisphere every January.', true)
  ].forEach(function (c) { W.cities[c.id] = c; });

  function venue(id, name, cityId, tier, kind, capacity, pay, quirk, x) {
    var v = { id: id, name: name, city: cityId, region: W.cities[cityId].region, tier: tier, kind: kind, capacity: capacity,
      pay: pay, quirk: quirk, setSize: tier >= 3 ? 5 : 4, genreFit: {} };
    for (var g in W.fit) v.genreFit[g] = W.fit[g][v.region];
    for (var k in x || {}) v[k] = x[k];
    return v;
  }
  W.venues = [
    venue('dog_and_distortion', 'The Dog & Distortion', 'london', 2, 'bar', 320, [700, 1100], 'A pub in Camden. The promoter pays in drink tickets and a firm handshake.', { catch: 'Half the fee is drink tickets.' }),
    venue('hammersmyth_odium', 'The Hammersmyth Odium', 'london', 3, 'club', 2000, [2600, 4200], 'Every band you ever loved played here. Their sweat is still in the carpet.'),
    venue('drizzle_factory', 'The Drizzle Factory', 'manchester', 2, 'club', 450, [900, 1400], 'An old mill. The roof leaks onto the ride cymbal, in time.'),
    venue('barrowlads', 'The Barrowlads Ballroom', 'glasgow', 3, 'club', 1400, [2200, 3400], 'A sprung dance floor. When Glasgow jumps, the whole building bounces.'),
    venue('whelans_wake', "Whelan's Wake", 'dublin', 2, 'bar', 380, [800, 1200], 'A fiddler sits in whether you ask or not. He is quite good.'),
    venue('petit_chaos', 'Le Petit Chaos', 'paris', 2, 'club', 520, [1000, 1600], 'Paris loves a Canadian singer. The front row brought roses. For the singer. Only the singer.'),
    venue('paradiso_lost', 'Paradiso Lost', 'amsterdam', 3, 'church', 1300, [2200, 3300], 'A former church with stained glass. The reverb is holy.'),
    venue('kellerkatze', 'Klub Kellerkatze', 'berlin', 2, 'club', 650, [1100, 1700], 'A techno bunker lending its room to metal for one night. The DJ is sulking.'),
    venue('rattling_tram', 'The Rattling Tram', 'prague', 2, 'club', 420, [800, 1300], 'A cellar under a tram line. Every six minutes the floor keeps time.'),
    venue('sala_siesta', 'Sala Siesta', 'madrid', 2, 'club', 700, [1000, 1500], 'Doors at midnight, set at two, breakfast at the bar at five.'),
    venue('rockefjell', 'Rockefjell', 'oslo', 2, 'club', 800, [1200, 1800], 'A club carved into a hill. Norwegian black metal royalty is at the bar, drinking milk.'),
    venue('meatball_cellar', 'The Meatball Cellar', 'stockholm', 2, 'club', 450, [1000, 1500], 'Everyone is very tall and very polite. The pit apologizes.'),
    venue('sauna_inferno', 'Club Sauna Inferno', 'helsinki', 2, 'club', 700, [1100, 1700], 'There is a sauna backstage. Somebody goes in wearing the stage clothes.'),
    venue('moose_opera', 'The Finnish National Moose Opera', 'helsinki', 3, 'church', 1350, [3000, 4500], 'A real opera house. The chandelier is shaped like antlers. Nobody can explain it.', { moose: true }),
    venue('mudstonbury_fest', 'Mudstonbury', 'mudstonbury', 4, 'club', 60000, [5500, 9000], 'The mud is knee-deep by Saturday. A welly boot sails over the crowd during the chorus.', { festival: true, outdoor: true, weeks: [23, 24] }),
    venue('wackelstein_fest', 'Wackelstein Open Air', 'wackelstein', 4, 'club', 75000, [6500, 11000], 'Seventy-five thousand metalheads in a cow field. The cows have seen worse.', { festival: true, outdoor: true, weeks: [3, 4] }),
    venue('shinjuku_lofty', 'Shinjuku Lofty', 'tokyo', 2, 'club', 500, [1200, 1800], 'Down six flights of stairs. Silent crowd, perfect sound, a roar when the song ends.'),
    venue('budokhan', 'Budokhan Hall', 'tokyo', 4, 'club', 14000, [12000, 18000], 'The octagon. Every live album you grew up with was recorded here. Now yours.', { hall: true }),
    venue('big_kitten', 'Osaka Big Kitten', 'osaka', 3, 'club', 1500, [2400, 3600], 'Osaka crowds cheer between songs too. Rules are more of a suggestion here.'),
    venue('zircon_hall', 'Nagoya Zircon Hall', 'nagoya', 3, 'club', 1000, [1900, 2800], 'Next to a department store. Shoppers wander in during soundcheck.'),
    venue('tick_tock', 'Kyoto Tick Tock', 'kyoto', 2, 'club', 260, [700, 1100], 'An old sake warehouse. Take your shoes off at the door. Yes, the drummer too.'),
    venue('tongue_hall', 'Sendai Beef Tongue Hall', 'sendai', 2, 'club', 500, [900, 1400], 'Named after the local speciality. The rider is entirely grilled beef tongue.'),
    venue('snow_cellar', 'Sapporo Snow Cellar', 'sapporo', 2, 'club', 550, [1000, 1500], 'Under a snowbank. The crowd arrives dressed for a prairie January.'),
    venue('drum_logic', 'Fukuoka Drum Logic', 'fukuoka', 3, 'club', 1000, [1800, 2700], 'A drum shop upstairs lends you a gong. You politely decline. Kit rules.'),
    venue('club_okonomi', 'Club Okonomi', 'hiroshima', 2, 'club', 400, [800, 1200], 'Above an okonomiyaki restaurant. The whole set smells like cabbage and joy.'),
    venue('summer_sonicboom', 'Summer Sonicboom', 'tokyo', 4, 'club', 40000, [6000, 10000], 'A seaside festival. Towels with your band name on them sell out by noon.', { festival: true, outdoor: true, weeks: [3, 4] }),
    venue('metro_gnome', 'The Metro Gnome', 'sydney', 3, 'club', 1200, [2000, 3000], 'Down a lane off George Street. A gnome statue guards the stage door. Nobody knows why.'),
    venue('big_day_inn', 'Big Day Inn', 'sydney', 4, 'club', 50000, [6000, 10000], 'January, forty degrees, sunscreen on the snare. A Canadian winter, an Aussie summer.', { festival: true, outdoor: true, weeks: [13, 14] }),
    venue('wrong_corner', 'The Wrong Corner Hotel', 'melbourne', 2, 'bar', 800, [1100, 1700], 'A pub with a band room out back and a beer garden with opinions.'),
    venue('petting_zoo', 'The Petting Zoo', 'brisbane', 2, 'club', 600, [900, 1400], 'Humid. The fog machine is redundant. Something with too many legs lives behind the amp.'),
    venue('governors_shed', "The Governor's Shed", 'adelaide', 2, 'bar', 500, [800, 1300], 'A big shed behind a pub. Tuesday metal nights sell out. Nobody explains why.'),
    venue('isolated_pub', 'The Most Isolated Pub', 'perth', 2, 'bar', 450, [900, 1400], 'Four thousand km from the next gig. The crowd is grateful you came. Very grateful.'),
    venue('wrest_pointless', 'Wrest Pointless', 'hobart', 2, 'bar', 350, [700, 1100], 'A harbour bar. Cold wind, warm crowd, a bartender who used to play in a band called Yes Mate.'),
    venue('croc_pit', 'The Croc Pit', 'darwin', 2, 'bar', 300, [700, 1100], 'Outdoor stage. Warning signs about crocodiles. The bassist reads every single one.', { outdoor: true }),
    venue('red_centre_roadhouse', 'The Red Centre Roadhouse', 'alice_springs', 2, 'bar', 200, [600, 1000], 'A roadhouse in the desert. The crowd drove eight hundred km. You drove two thousand.'),
    venue('red_octopus', 'The Red Octopus', 'moscow', 3, 'club', 1500, [2200, 3400], 'A club with a decommissioned tank in the lobby. The crowd climbs on it after the show.'),
    venue('white_nights_hall', 'The White Nights Hall', 'st_petersburg', 3, 'club', 900, [1600, 2400], 'In June the show ends at 2 a.m. and the sun is still up. Nobody finds this strange but you.'),
    venue('chak_chak_club', 'The Chak-Chak Club', 'kazan', 2, 'club', 420, [700, 1100], 'Named after the honey dessert. There is honey on the monitors. Somehow.'),
    venue('urals_underground', 'The Urals Underground', 'yekaterinburg', 2, 'club', 600, [900, 1400], 'Half the crowd is in Europe, half in Asia. The mosh pit crosses continents.'),
    venue('siberian_station', 'Siberian Station Club', 'novosibirsk', 2, 'club', 500, [800, 1300], 'An old railway depot. The trains out back are louder than the PA.'),
    venue('baikal_frost_hall', 'Baikal Frost Hall', 'irkutsk', 2, 'club', 400, [800, 1200], 'A wooden hall with a wood stove on stage. The stove gets a solo.'),
    venue('siberian_frostfest', 'Siberian Frostfest', 'irkutsk', 4, 'club', 15000, [5000, 8000], 'On the frozen shore of Lake Baikal in January. Minus forty. The band is unimpressed; they are from the prairies.', { festival: true, outdoor: true, weeks: [13, 14] }),
    venue('last_stop', 'The Last Stop', 'vladivostok', 2, 'club', 450, [900, 1300], 'The end of the Trans-Siberian. The crowd has come a long way. So have you.'),
    // v0.9: the Ramblers' Q3 payoff festival (last, as above; country fits best)
    venue('tumbleworth_fest', 'Tumbleworth Country Music Festival', 'tumbleworth', 4, 'club', 45000, [5500, 9000],
      'Forty-five thousand people in hats on a riverbank in January. Utes parked for kilometres. Somebody is always yodelling.',
      { festival: true, outdoor: true, weeks: [13, 14], genreFit: { metal: 0.45, punk: 0.55, rock: 0.85, country: 1 } })
  ];

  // Rental vehicles abroad (you fly; your driver drives whatever they give you, on whichever side of the road).
  W.vehicles = {
    sardine_van: { id: 'sardine_van', region: 'uk_europe', name: 'A tiny European van', perWeek: 350, comfort: 1, breakdown: 0.04, seats: 6, look: 'sardine',
      blurb: 'The whole band, a drum kit and the merch in a van the size of a fridge. Packed like sardines.' },
    splitter_bus: { id: 'splitter_bus', region: 'uk_europe', name: 'A splitter bus with bunks', perWeek: 850, comfort: 3, breakdown: 0.02, seats: 9, look: 'splitter',
      blurb: 'Bunks in the front, gear in the back. Somebody else\'s band stickers on every surface.' },
    hiace: { id: 'hiace', region: 'japan', name: 'A rented high-roof van', perWeek: 500, comfort: 2, breakdown: 0.01, seats: 8, look: 'kei',
      blurb: 'Spotless, polite and it beeps when it reverses. Your driver takes the left side of the road without comment.' },
    bullet_pass: { id: 'bullet_pass', region: 'japan', name: 'Bullet-train rail passes', perWeek: 1200, comfort: 4, breakdown: 0, seats: 99, look: 'train',
      blurb: '300 km/h. The gear goes by courier. The stage clothes go in the overhead rack.' },
    ute_trailer: { id: 'ute_trailer', region: 'australia', name: 'A ute and a box trailer', perWeek: 400, comfort: 1, breakdown: 0.05, seats: 5, look: 'ute',
      blurb: 'Three in the cab, two in a borrowed station wagon behind, the kit in a trailer. Vast drives.' },
    campervan: { id: 'campervan', region: 'australia', name: 'A campervan the size of a road train', perWeek: 950, comfort: 3, breakdown: 0.03, seats: 7, look: 'camper',
      blurb: 'A kitchen, a fridge and air conditioning that works when it feels like it.' },
    paz_bus: { id: 'paz_bus', region: 'russia', name: 'An old Soviet tour bus', perWeek: 300, comfort: 1, breakdown: 0.12, seats: 20, look: 'bus',
      blurb: 'It has seen things. The heater has two settings: off and volcano. It will break down in the taiga.' },
    sleeper_train: { id: 'sleeper_train', region: 'russia', name: 'Trans-Siberian sleeper tickets', perWeek: 700, comfort: 3, breakdown: 0.01, seats: 99, look: 'train',
      blurb: 'Four bunks per cabin, tea in glass holders, nine time zones. The gear rides in the baggage car.' }
  };
  W.stays = {
    couch: { id: 'couch', name: "The promoter's floor", perWeek: 0, homesick: 4, mood: -2, blurb: 'Free. Sleeping bags, a cat that hates drummers, one bathroom.' },
    hostel: { id: 'hostel', name: 'Hostels', perWeek: 350, homesick: 1, mood: 0, blurb: 'Bunk beds, strangers, lockers. The drummer gets the top bunk.' },
    hotel: { id: 'hotel', name: 'Proper hotels', perWeek: 1000, homesick: -2, mood: 2, blurb: 'Room service, blackout curtains, a hotel-room rehearsal nobody complains about.' }
  };
  W.extras = {
    none: { id: 'none', name: 'Nothing extra', cost: 0, blurb: 'Just the band, the gear and a phrasebook.' },
    publicist: { id: 'publicist', name: 'A local publicist', cost: 1200, fans: 0.35, buzz: 3, blurb: 'Radio spots and a poster on every lamp post. More people at every show.' },
    guitar_tech: { id: 'guitar_tech', name: 'A tour tech + translator', cost: 900, score: 3, burnout: -2, blurb: 'Restrings, re-tapes, orders dinner in the local language. Fewer disasters.' }
  };

  // Preset tour packages: one stop a week (a weekend show; null venue = an open date you book from the regional board).
  W.packages = [
    { id: 'uk_showcase', region: 'uk_europe', name: 'London Showcase', showcase: true,
      blurb: 'One week, one industry showcase in Camden. Label people in the back pretending not to nod.',
      stops: [{ city: 'london', venue: 'dog_and_distortion' }] },
    { id: 'uk_pub_crawl', region: 'uk_europe', name: 'The Pub Crawl',
      blurb: 'Three weeks of rain, pub gigs and drink tickets: London, Manchester, Glasgow.',
      stops: [{ city: 'london', venue: 'dog_and_distortion' }, { city: 'manchester', venue: 'drizzle_factory' }, { city: 'glasgow', venue: 'barrowlads' }] },
    { id: 'eu_continental', region: 'uk_europe', name: 'The Continental',
      blurb: 'The tiny-van classic: Amsterdam, Berlin, Prague and Paris (where they love a Canadian accent).',
      stops: [{ city: 'amsterdam', venue: 'paradiso_lost' }, { city: 'berlin', venue: 'kellerkatze' }, { city: 'prague', venue: null }, { city: 'paris', venue: 'petit_chaos' }] },
    { id: 'eu_festival_summer', region: 'uk_europe', name: 'Mudstonbury Summer', festival: true,
      blurb: 'Mud season: a London warm-up at the Odium, Mudstonbury in June, then the old church in Amsterdam.',
      stops: [{ city: 'london', venue: 'hammersmyth_odium' }, { city: 'mudstonbury', venue: 'mudstonbury_fest' }, { city: 'amsterdam', venue: 'paradiso_lost' }] },
    { id: 'eu_wackelstein', region: 'uk_europe', name: 'Wackelstein August', festival: true,
      blurb: 'Berlin, an open date in Prague, then seventy-five thousand metalheads in a cow field at Wackelstein Open Air.',
      stops: [{ city: 'berlin', venue: 'kellerkatze' }, { city: 'prague', venue: null }, { city: 'wackelstein', venue: 'wackelstein_fest' }] },
    { id: 'eu_moose_run', region: 'uk_europe', name: 'The Nordic Moose Run', needs: 'moose',
      blurb: 'Oslo, Stockholm, then Helsinki, where the moose concept album is, somehow, on the radio. Finale at the opera.',
      stops: [{ city: 'oslo', venue: 'rockefjell' }, { city: 'stockholm', venue: 'meatball_cellar' }, { city: 'helsinki', venue: 'moose_opera' }] },
    { id: 'jp_showcase', region: 'japan', name: 'Tokyo Showcase', showcase: true,
      blurb: 'One week in Tokyo: a showcase in Shinjuku for a room of very polite industry people.',
      stops: [{ city: 'tokyo', venue: 'shinjuku_lofty' }] },
    { id: 'jp_bullet', region: 'japan', name: 'The Bullet Train',
      blurb: 'Tokyo to Fukuoka in four weekends: Tokyo, Nagoya, Osaka, then an open date down south.',
      stops: [{ city: 'tokyo', venue: 'shinjuku_lofty' }, { city: 'nagoya', venue: 'zircon_hall' }, { city: 'osaka', venue: 'big_kitten' }, { city: 'fukuoka', venue: null }] },
    { id: 'jp_north', region: 'japan', name: 'Snow Country',
      blurb: 'Sapporo and Sendai, then home to Tokyo for the big one: Budokhan Hall.', minRegionFans: 1500,
      stops: [{ city: 'sapporo', venue: 'snow_cellar' }, { city: 'sendai', venue: 'tongue_hall' }, { city: 'tokyo', venue: 'budokhan' }] },
    { id: 'jp_summer', region: 'japan', name: 'Summer Sonicboom', festival: true,
      blurb: 'Summer festival season: Kyoto, Osaka, then the seaside stage at Summer Sonicboom.',
      stops: [{ city: 'kyoto', venue: 'tick_tock' }, { city: 'osaka', venue: 'big_kitten' }, { city: 'tokyo', venue: 'summer_sonicboom' }] },
    { id: 'au_showcase', region: 'australia', name: 'Sydney Showcase', showcase: true,
      blurb: 'One week in Sydney: a showcase at the Metro Gnome for the festival bookers.',
      stops: [{ city: 'sydney', venue: 'metro_gnome' }] },
    { id: 'au_east_coast', region: 'australia', name: 'The East Coast Run',
      blurb: 'Brisbane, Sydney, Melbourne: three weeks, three pubs, one spider.',
      stops: [{ city: 'brisbane', venue: 'petting_zoo' }, { city: 'sydney', venue: 'metro_gnome' }, { city: 'melbourne', venue: 'wrong_corner' }] },
    { id: 'au_big_lap', region: 'australia', name: 'The Big Lap',
      blurb: 'The vast one: Darwin, Alice Springs, Adelaide, Perth. Thousands of km of red dirt between shows.',
      stops: [{ city: 'darwin', venue: 'croc_pit' }, { city: 'alice_springs', venue: 'red_centre_roadhouse' }, { city: 'adelaide', venue: 'governors_shed' }, { city: 'perth', venue: 'isolated_pub' }] },
    { id: 'au_big_day_inn', region: 'australia', name: 'Big Day Inn Summer', festival: true,
      blurb: 'Escape the prairie winter: Hobart, Melbourne, then Big Day Inn in Sydney in January.',
      stops: [{ city: 'hobart', venue: 'wrest_pointless' }, { city: 'melbourne', venue: 'wrong_corner' }, { city: 'sydney', venue: 'big_day_inn' }] },
    { id: 'ru_showcase', region: 'russia', name: 'Moscow Showcase', showcase: true,
      blurb: 'One week in Moscow: a showcase at the Red Octopus. There is a tank in the lobby.',
      stops: [{ city: 'moscow', venue: 'red_octopus' }] },
    { id: 'ru_two_capitals', region: 'russia', name: 'Two Capitals',
      blurb: 'Moscow and St. Petersburg, plus an open date on the Volga.',
      stops: [{ city: 'moscow', venue: 'red_octopus' }, { city: 'st_petersburg', venue: 'white_nights_hall' }, { city: 'kazan', venue: null }] },
    { id: 'ru_trans_siberian', region: 'russia', name: 'The Trans-Siberian',
      blurb: 'Nine time zones in four weekends: Yekaterinburg, Novosibirsk, Irkutsk, Vladivostok.',
      stops: [{ city: 'yekaterinburg', venue: 'urals_underground' }, { city: 'novosibirsk', venue: 'siberian_station' }, { city: 'irkutsk', venue: 'baikal_frost_hall' }, { city: 'vladivostok', venue: 'last_stop' }] },
    { id: 'ru_frostfest', region: 'russia', name: 'Siberian Frostfest', festival: true,
      blurb: 'January in Siberia: Novosibirsk, then Siberian Frostfest on the ice of Lake Baikal. Minus forty. Pack a toque.',
      stops: [{ city: 'novosibirsk', venue: 'siberian_station' }, { city: 'irkutsk', venue: 'siberian_frostfest' }] }
  ];

  // Overseas climate (C7): temperature per month (index 0 = July, like C.MONTHS) and weather tables per season (the
  // region's own season; Australia's are reversed: a Canadian winter is Aussie summer).
  W.climates = {
    uk_europe: { temps: [19, 19, 15, 11, 7, 4, 3, 4, 7, 10, 13, 17], seasonShift: 0,
      weather: { summer: { clear: 4, rain: 5, heat: 1 }, fall: { clear: 3, rain: 6 }, winter: { clear: 3, rain: 5, snow: 2 }, spring: { clear: 4, rain: 5, hail: 0.3 } } },
    japan: { temps: [27, 28, 24, 18, 12, 7, 5, 6, 9, 14, 19, 22], seasonShift: 0,
      weather: { summer: { clear: 4, rain: 4, heat: 3 }, fall: { clear: 6, rain: 3 }, winter: { clear: 5, snow: 3, blizzard: 0.5 }, spring: { clear: 6, rain: 3 } } },
    australia: { temps: [13, 14, 17, 20, 22, 25, 27, 27, 25, 22, 18, 15], seasonShift: 12,
      weather: { summer: { clear: 6, heat: 4, hail: 0.3 }, fall: { clear: 6, rain: 2 }, winter: { clear: 6, rain: 3 }, spring: { clear: 6, rain: 2, heat: 1 } } },
    russia: { temps: [19, 17, 10, 3, -5, -12, -18, -15, -6, 4, 12, 17], seasonShift: 0,
      weather: { summer: { clear: 7, rain: 3 }, fall: { clear: 3, rain: 4, snow: 2 }, winter: { clear: 2, snow: 5, blizzard: 3 }, spring: { clear: 4, rain: 3, snow: 1 } } }
  };
  // Regional holidays and seasons (shown instead of the Canadian ones while you are there). Weeks = week of year.
  W.holidays = [
    { id: 'bonfire_night', region: 'uk_europe', weeks: [9, 9], name: 'Bonfire Night', icon: '🎆', blurb: 'Fireworks all over England. The pyro is free tonight.', gig: { crowd: 4, fans: 1.1 } },
    { id: 'oktoberfest', region: 'uk_europe', weeks: [5, 6], name: 'Oktoberfest season', icon: '🍺', blurb: 'Every German bar has a brass band. You are the loud one.', pay: { bar: 1.3 } },
    { id: 'christmas_markets', region: 'uk_europe', weeks: [11, 12], name: 'Christmas markets', icon: '🎄', blurb: 'Mulled wine and wooden stalls. Very festive. Very cold.', gig: { crowd: 3 } },
    { id: 'midsummer', region: 'uk_europe', weeks: [24, 24], name: 'Nordic Midsummer', icon: '🌞', blurb: 'The sun never sets up north. Neither does the party.', gig: { crowd: 5, fans: 1.1 } },
    { id: 'hanami', region: 'japan', weeks: [19, 20], name: 'Cherry blossom season', icon: '🌸', blurb: 'Hanami picnics under the blossoms. Everyone is in a good mood.', gig: { crowd: 5, fans: 1.15 } },
    { id: 'golden_week', region: 'japan', weeks: [21, 21], name: 'Golden Week', icon: '🎏', blurb: 'The whole country is on holiday. Every train is full. Every show sells out.', gig: { crowd: 6, fans: 1.1 } },
    { id: 'natsu_matsuri', region: 'japan', weeks: [3, 4], name: 'Summer festivals', icon: '🏮', blurb: 'Lanterns, yukata and festival stages in every town.', gig: { crowd: 4, fans: 1.1 } },
    { id: 'shogatsu', region: 'japan', weeks: [13, 13], name: 'New Year', icon: '🎍', blurb: 'The quietest week of the year. Everyone is home with family. Including, emotionally, you.', gig: { crowd: -6 } },
    { id: 'aussie_christmas', region: 'australia', weeks: [11, 12], name: 'Christmas at the beach', icon: '🏖️', blurb: 'Thirty-five degrees, prawns on the barbie, Santa in board shorts.', gig: { crowd: 4 } },
    { id: 'summer_holidays', region: 'australia', weeks: [13, 15], name: 'The summer holidays', icon: '☀️', blurb: 'Everyone is on holiday and at a festival. Big crowds.', gig: { crowd: 5, fans: 1.1 } },
    { id: 'race_day', region: 'australia', weeks: [9, 9], name: 'Race day', icon: '🏇', blurb: 'The horse race that stops the nation. It stops soundcheck too.', gig: { crowd: -3 } },
    { id: 'novy_god', region: 'russia', weeks: [12, 13], name: 'New Year', icon: '🎄', blurb: 'The biggest holiday of the year. Fir trees, fireworks, a double fee.', pay: { all: 1.5 } },
    { id: 'maslenitsa', region: 'russia', weeks: [17, 17], name: 'Pancake week', icon: '🥞', blurb: 'Pancakes for seven days straight. The band is in heaven.', gig: { crowd: 3 } },
    { id: 'white_nights', region: 'russia', weeks: [23, 24], name: 'White nights', icon: '🌅', blurb: 'The sun barely sets over St. Petersburg. Shows run until dawn, which is at 3 a.m.', gig: { crowd: 5, fans: 1.1 } }
  ];

  // Invites (A12: a festival slot or a showcase unlocks a region before the fan threshold). {festival} {region}
  W.invites = {
    festival: [
      '{festival} wants {band}. A real slot, on a real stage, in {region}. The promoter even offered to cover half the flights.',
      'An email with too many exclamation marks: {festival} has a hole in the lineup and your name on the shortlist.'
    ],
    showcase: [
      'A label in {region} wants to see {band} play. One showcase, half the flights on them. The world just got bigger.',
      'Your record reached {region} somehow. A booking agent there wants a showcase. "Very big interest," she writes.'
    ],
    big: ['{song} is blowing up in {region}. Nobody knows how. Promoters are calling.']
  };

  // Members calling home from the road (group chat). Per member (member-keyed; packs add theirs) + generic; Kenji never speaks.
  W.callHome = {
    marcel: ['Called Maman. She asked if they have real bread here. I said yes. She hung up.', 'Wore the cape to call home on video. Maman said I look thin. Capes are slimming.',
      'I miss the lawn. Do not tell anyone I miss the lawn.', 'Facetimed the garage. Somebody put the webcam on the lawnmower. I cried a little.'],
    dana: ['Called my sister. Told her about the gear shops. She told me about her kids. Both of us were bored.', 'I would trade this entire hotel for Mom\'s kitchen and a bag of ketchup chips.',
      'Missed my cousin\'s wedding for this. Sent a video of a guitar solo. She played it at the reception.'],
    jaxon: ['Baba called. She wants to know if I am wearing the toque. I am not wearing the toque.', 'Baba sent a photo of perogies. That is psychological warfare.',
      'Called Baba. She rated the show from the livestream. Four out of ten. The drummer got a nine.'],
    generic: ['Called home. They asked when we are back. I didn\'t have an answer.', 'It\'s 4 a.m. back home. I called anyway. Mom picked up on the first ring.',
      'Homesick. Is that a thing adults are allowed to say? Asking for the band.', 'Watching hockey highlights in a hotel room at 6 a.m. This is who I am now.',
      'Found a Canadian flag patch in a shop. Bought six. Sewed one on my pillow.']
  };

  // Road lines per region (trip banter abroad) + news lines. Neutral; Hail Damage's own in W.byBand.hail_damage.lines.
  W.lines = {
    depart: { uk_europe: 'Wheels up. Next stop: rain.', japan: 'Wheels up. Thirteen hours. The stage clothes have a garment bag. The garment bag has its own seat.',
      australia: 'Wheels up. Twenty-two hours, two connections, one very confused sense of what season it is.', russia: 'Wheels up. Everybody packed three toques. Mom packed a fourth.' },
    home: ['Home. {space} smells exactly the same. Somebody hugs {van}.', 'Back in {city}. Mom made a lasagna the size of a snare case.'],
    broken: '{band} has broken {region}. Crowds sing along now. In the right accent.',
    rival: '{rival} just played {region} first. The locals keep asking if you know them.',
    big: '{song} is huge in {region}. Nobody at home believes it.',
    moose: 'The moose concept album just went platinum in Finland. The band has been crying at the Helsinki opera house for an hour. Good crying.',
    gongNominated: '{band} is nominated for the Global Gong. The ceremony is in Amsterdam in May. {front} is already writing the speech.',
    gongWon: '{band} won the Global Gong. It is a real gong. It does not go on the drum kit. Ever.',
    gongLost: 'The Global Gong went to {venue}. The band claps politely. {grumbler} claps sarcastically.'
  };
  // A band's moment in one city abroad (25_sim_tour cityLines; + byBand). Hail Damage's Paris roses live in byBand.
  W.cityLines = {};

  // v0.9: the Global Gong red carpet per band (5i_ui_tour; was the UI's GONG_CARPET). Packs add their bands.
  W.gongCarpet = {
    hail_damage: [
      { who: 'reporter', text: 'Live from Amsterdam! Who are you wearing?' }, { who: 'marcel', text: 'The cape. It has its own passport now.' },
      { who: 'reporter', text: 'Is it true the Gong is a real gong?' }, { who: 'jaxon', text: 'Yes. It does not go on the drum kit. We had a meeting about it.' }
    ]
  };

  // v0.9: Hail Damage's own World lines (on top of the neutral ones above).
  W.byBand = {
    hail_damage: {
      lines: {
        depart: { japan: 'Wheels up. Thirteen hours. Marcel packed the cape in a garment bag. The cape has its own seat.',
          russia: 'Wheels up. Jaxon packed three toques. Baba packed a fourth.' },
        home: ['Home. The garage smells exactly the same. Somebody hugs the Moose Hearse.', 'Back in Saskatoon. Mom made a lasagna the size of a snare case.'],
        rival: '{rival} just played {region} first. The locals keep asking if you know them. "Tall accountant? Veggie tray?"',
        moose: 'The moose concept album just went platinum in Finland. Marcel has been crying at the Helsinki opera house for an hour. Good crying.',
        gongNominated: '{band} is nominated for the Global Gong. The ceremony is in Amsterdam in May. Marcel is already writing the speech.',
        gongLost: 'The Global Gong went to {venue}. The band claps politely. Marcel claps sarcastically.'
      },
      callHome: { generic: ['It\'s 4 a.m. in Saskatoon. I called anyway. Mom picked up on the first ring.'] },
      cityLines: { paris: ['France loves Marcel. Roses land on stage. All of them are for Marcel.'] }
    }
  };

  // The Global Gong (A14): the one international award, World stage only. Nominees besides you and (if they toured) your rival.
  W.gong = {
    name: 'The Global Gong', week: 22, city: 'Amsterdam',
    blurb: 'The one international award. A bronze gong on a teak stand. It goes on a shelf, never on a drum kit.',
    nominees: [
      { id: 'krautbahn', name: 'Krautbahn', from: 'Germany', strength: 58 },
      { id: 'kawaii_apocalypse', name: 'Kawaii Apocalypse', from: 'Japan', strength: 62 },
      { id: 'dingo_fever', name: 'Dingo Fever', from: 'Australia', strength: 54 },
      { id: 'balalaika_overdrive', name: 'Balalaika Overdrive', from: 'Russia', strength: 52 },
      { id: 'fjordwrath', name: 'Fjordwrath', from: 'Norway', strength: 60 },
      { id: 'les_baguettes_maudites', name: 'Les Baguettes Maudites', from: 'France', strength: 50 }
    ]
  };

  // Region Monday cards (drawn on tour, one a week) + story cards (forced by the tour sim). Effect key `tour` (see top).
  var ERA = ['world'];
  function card(id, region, speaker, title, text, choices, x) {
    var c = { id: id, type: x && x.type || 'road', speaker: speaker, title: title, text: text, gate: { era: ERA, region: region ? [region] : undefined }, once: true, choices: choices };
    if (!region) delete c.gate.region;
    for (var k in x || {}) if (k !== 'type' && k !== 'gate') c[k] = x[k];
    if (x && x.gate) for (var g in x.gate) c.gate[g] = x.gate[g];
    return c;
  }
  W.cards = [
    // ---- UK & Europe ----
    card('wt_uk_drink_tickets', 'uk_europe', 'nigel', 'Paid in Drink Tickets', 'Nigel the promoter counts out your fee: forty pounds and a roll of drink tickets. "Standard," he says. "Very standard."', [
      { label: 'Take the tickets', hint: 'Moods ↑ · Fund ↓', effects: { fund: -150, mood: { all: 5 } }, outcome: 'The band drinks the fee. Glasgow is a blur. A good blur.' },
      { label: 'Negotiate like a Canadian', hint: 'Gamble: cash, or banned from his pubs', roll: { chance: 0.5, stat: 'buzz', statScale: 0.006,
        success: { effects: { fund: 400 }, outcome: 'You apologize four times and he pays in full out of sheer confusion.' },
        fail: { effects: { buzz: -3, mood: { all: -3 } }, outcome: 'Nigel is wounded. He tells every pub in Manchester. The tickets were real, at least.' } }, outcome: 'You clear your throat. "Sorry, but..."' }
    ], { type: 'money', once: false, cooldown: 12 }),
    card('wt_uk_rain', 'uk_europe', 'dana', 'It Is Raining', 'It has rained for nine days. The merch is wet, the cape is wet, the van smells like a wet dog made of cape. Dana wants a day off.', [
      { label: 'A day in a pub, drying off', hint: 'Burnout ↓ · Homesick ↓', effects: { burnout: -6, tour: { homesick: -6 } }, outcome: 'Pie, chips, a fire, a quiz machine. The cape steams gently by the hearth.' },
      { label: 'Busk in the rain for content', hint: 'Buzz ↑ · Burnout ↑', effects: { buzz: 6, burnout: 5, tour: { regionFans: 150 } }, outcome: 'Soaked, acoustic, filmed by a stranger. "Canadians Play Through Biblical Rain" does numbers.' }
    ], { type: 'weird', once: false, cooldown: 10, gate: { band: ['hail_damage'] } }),
    card('wt_uk_wet_gear', 'uk_europe', 'nigel', 'It Is Still Raining', 'Nigel the promoter says it has rained for nine days. It has. The merch is wet, the amps are damp, the van smells like a wet dog.', [
      { label: 'A day in a pub, drying off', hint: 'Burnout ↓ · Homesick ↓', effects: { burnout: -6, tour: { homesick: -6 } }, outcome: 'Pie, chips, a fire, a quiz machine. The band steams gently by the hearth.' },
      { label: 'Busk in the rain for content', hint: 'Buzz ↑ · Burnout ↑', effects: { buzz: 6, burnout: 5, tour: { regionFans: 150 } }, outcome: 'Soaked, unplugged, filmed by a stranger. "Canadians Play Through Biblical Rain" does numbers.' }
    ], { type: 'weird', once: false, cooldown: 10, gate: { band: ['frost_heave', 'gravel_kings', 'grid_road_ramblers'] } }),
    card('wt_eu_gear_shop', 'uk_europe', 'dana', 'Lost in a Gear Shop', 'Dana went into a Berlin gear shop at 10 a.m. It is now 6 p.m. Soundcheck was an hour ago. She is not answering her phone.', [
      { label: 'Send a search party', hint: 'Chemistry ↑ · Dana ↓', effects: { chemistry: 3, mood: { dana: -4 } }, outcome: 'Found in the basement, holding a fuzz pedal like a newborn. She has to put it back.' },
      { label: 'Let her buy the pedal', hint: 'Fund ↓ · Dana ↑↑', effects: { fund: -600, mood: { dana: 12 }, skill: { dana: 2 } }, outcome: 'It is a very expensive fuzz pedal. Tonight\'s solo sounds like a jet engine in love.' }
    ], { type: 'drama', gate: { band: ['hail_damage'] } }),
    card('wt_eu_france_marcel', 'uk_europe', 'marcel', 'France Loves Marcel', 'A Paris magazine wants Marcel alone for a cover shoot. Just Marcel. And the cape. "Ze rest of ze band can hold ze reflector."', [
      { label: 'Let Marcel have his moment', hint: 'Marcel ↑↑ · Chemistry ↓', effects: { mood: { marcel: 15 }, chemistry: -4, buzz: 8, tour: { regionFans: 250 } }, outcome: 'Marcel on the cover of Le Rockeur. The band holds the reflector. Jaxon is in the corner of one photo, blurry.' },
      { label: 'Whole band or nothing', hint: 'Chemistry ↑ · Marcel ↓', effects: { chemistry: 4, mood: { marcel: -6 }, buzz: 4 }, outcome: 'They agree, sadly. The cover is the band, with Marcel slightly larger than everyone else.' }
    ], { type: 'fame', city: ['paris'], gate: { band: ['hail_damage'] } }),
    card('wt_eu_mud', 'uk_europe', 'klaus', 'Festival Mud', 'Klaus from the festival: "The stage is fine. The path to the stage is mud. Knee deep. Also the path has a tractor in it."', [
      { label: 'Wade in with the gear', hint: 'Burnout ↑ · Buzz ↑', effects: { burnout: 6, buzz: 6, tour: { regionFans: 300 } }, outcome: 'You carry the kick drum over your head through the crowd like a trophy. They chant your name.' },
      { label: 'Pay for the golf cart', hint: 'Fund ↓', effects: { fund: -300, burnout: -3 }, outcome: 'Dry socks, a dignified arrival, and a golf cart driver who reviews your set from the side of the stage.' }
    ], { type: 'road', city: ['mudstonbury', 'wackelstein'] }),
    card('wt_eu_sardines', 'uk_europe', 'jaxon', 'Packed Like Sardines', 'The rental van fits the kit, the merch and exactly four and a half people. Jaxon has been sitting on the floor tom since Amsterdam.', [
      { label: 'Rotate seats every hour', hint: 'Chemistry ↑ · Burnout ↑', effects: { chemistry: 4, burnout: 3 }, outcome: 'A strict rota. Everyone gets an hour on the floor tom. Nobody is happy. Everyone is equal.' },
      { label: 'Ship the cape home', hint: 'Marcel ↓↓ · Burnout ↓', effects: { mood: { marcel: -10 }, burnout: -5 }, outcome: 'The cape goes home by courier. Marcel waves at the truck. There is room to breathe.' }
    ], { type: 'road', once: false, cooldown: 12, gate: { band: ['hail_damage'] } }),
    // ---- Japan ----
    card('wt_jp_silence', 'japan', 'marcel', 'The Silence', 'Song one ends. Total silence. Then a roar like a jet. Then silence again for song two. Marcel thinks they hate him. Nobody hates him.', [
      { label: 'Explain Japanese crowds to Marcel', hint: 'Marcel ↑ · Chemistry ↑', effects: { mood: { marcel: 6 }, chemistry: 3 }, outcome: '"They are listening," you say. "Listening?" says Marcel. "To ME?" He sings the best set of his life.' },
      { label: 'Fill the silence with banter', hint: 'Gamble: charming, or very awkward', roll: { chance: 0.45, stat: 'chemistry', statScale: 0.006,
        success: { effects: { buzz: 6, tour: { regionFans: 200 } }, outcome: 'Marcel tells a joke in French. Nobody understands. Everybody claps. It works.' },
        fail: { effects: { mood: { marcel: -5 }, burnout: 3 }, outcome: 'Four minutes of Marcel explaining the lawn. The silence becomes a different silence.' } }, outcome: 'Marcel steps up to the mic.' }
    ], { type: 'fame', gate: { band: ['hail_damage'] } }),
    card('wt_jp_gifts', 'japan', 'kato', 'Gift Mountain', 'Mr. Kato the promoter wheels in a trolley of fan gifts: letters, snacks, hand-drawn portraits, a towel with your band name on it.', [
      { label: 'Write back to every one', hint: 'Burnout ↑ · Fans ↑', effects: { burnout: 4, fans: 120, tour: { gift: 'jp_towel', regionFans: 250 } }, outcome: 'Three hundred thank-you notes on hotel stationery. The towel goes on the drum riser forever.' },
      { label: 'Share the snacks with the crew', hint: 'Moods ↑', effects: { mood: { all: 6 }, tour: { gift: 'jp_towel' } }, outcome: 'Matcha cookies, rice crackers, a melon that cost more than the rental van. A good night.' }
    ], { type: 'fame' }),
    card('wt_jp_vending', 'japan', 'jaxon', 'The Vending Machines', 'Jaxon has found a vending machine that sells hot corn soup in a can. He has now had eleven. He has plans for a twelfth.', [
      { label: 'Stage an intervention', hint: 'Jaxon ↓ · Chemistry ↑', effects: { mood: { jaxon: -4 }, chemistry: 3 }, outcome: 'The band stands between Jaxon and the machine. He respects it. He sneaks a thirteenth at 3 a.m.' },
      { label: 'Film the corn soup review', hint: 'Buzz ↑', effects: { buzz: 5, tour: { regionFans: 120 } }, outcome: '"Canadian Guitarist Rates Every Vending Machine in Osaka" becomes a series. Episode 4 is huge.' }
    ], { type: 'weird', gate: { band: ['hail_damage'] } }),
    card('wt_jp_blossoms', 'japan', 'emiko', 'Under the Blossoms', 'Emiko from the fan club has reserved a spot under the cherry blossoms for a band picnic. She has laminated a seating chart.', [
      { label: 'Go, follow the seating chart', hint: 'Moods ↑ · Homesick ↓', effects: { mood: { all: 8 }, tour: { homesick: -8 } }, outcome: 'Pink petals, a bento with the band logo in seaweed, and the best afternoon of the tour.' },
      { label: 'Rehearse instead', hint: 'Skill ↑ · Emiko sad', effects: { skill: { all: 1 }, burnout: 3 }, outcome: 'You rehearse in a hotel room. Emiko sends photos of the empty picnic mat. Every petal is a guilt trip.' }
    ], { type: 'drama', gate: { weekOfYear: [18, 21] } }),
    // ---- Australia ----
    card('wt_au_spider', 'australia', 'dana', 'Spider in the Kick Drum', 'Soundcheck. The kick drum sounds wrong. Dana looks through the port hole and goes very quiet. "Something in there has eight legs and a mortgage."', [
      { label: 'Ask a local for help', hint: 'Chemistry ↑', effects: { chemistry: 3, tour: { regionFans: 80 } }, outcome: 'The sound guy scoops it out with a pint glass and a coaster. "She\'s harmless, mate." She is the size of a hand.' },
      { label: 'Play around it', hint: 'Gamble: legend, or you scream on mic', roll: { chance: 0.5, stat: 'drumSkill', statScale: 0.006,
        success: { effects: { buzz: 8, fans: 150 }, outcome: 'You play the whole set with a spider in the kick. Someone films it. You are now "the spider drummer".' },
        fail: { effects: { burnout: 6, buzz: 3 }, outcome: 'Song two, she climbs out onto the pedal. You scream into the vocal mic. The crowd thinks it\'s a breakdown.' } }, outcome: 'You sit down. Carefully.' }
    ], { type: 'weird', gate: { band: ['hail_damage'] } }),
    card('wt_au_kick_spider', 'australia', 'shazza', 'Something in the Kick Drum', 'Soundcheck. The kick drum sounds wrong. Shazza looks through the port hole and goes very quiet. "Mate. It has eight legs and a mortgage."', [
      { label: 'Ask a local for help', hint: 'Chemistry ↑', effects: { chemistry: 3, tour: { regionFans: 80 } }, outcome: 'The sound guy scoops it out with a pint glass and a coaster. "She\'s harmless, mate." She is the size of a hand.' },
      { label: 'Play around it', hint: 'Gamble: legend, or you scream on mic', roll: { chance: 0.5, stat: 'drumSkill', statScale: 0.006,
        success: { effects: { buzz: 8, fans: 150 }, outcome: 'You play the whole set with a spider in the kick. Someone films it. You are now "the spider drummer".' },
        fail: { effects: { burnout: 6, buzz: 3 }, outcome: 'Song two, she climbs out onto the pedal. You scream into the vocal mic. The crowd thinks it\'s a breakdown.' } }, outcome: 'You sit down. Carefully.' }
    ], { type: 'weird', gate: { band: ['frost_heave', 'gravel_kings', 'grid_road_ramblers'] } }),
    card('wt_au_christmas', 'australia', 'marcel', 'Christmas at the Beach', 'It is Christmas and thirty-eight degrees. Marcel has put on the cape and a Santa hat and will not take either off.', [
      { label: 'Beach barbecue for the band', hint: 'Moods ↑ · Homesick ↓', effects: { mood: { all: 8 }, fund: -200, tour: { homesick: -6 } }, outcome: 'Prawns, sunburn and a Christmas cracker joke read aloud in five accents. Not home, but close.' },
      { label: 'Video call home for Christmas', hint: 'Homesick ↓↓ · Burnout ↑', effects: { burnout: 4, tour: { homesick: -12 } }, outcome: 'Snow in the garage window behind Mom. Sand in your sandwich. Everyone cries a little. It helps.' }
    ], { type: 'drama', gate: { weekOfYear: [11, 12], band: ['hail_damage'] } }),
    card('wt_au_drop_bears', 'australia', 'shazza', 'The Drop Bear Warning', 'Shazza the promoter warns the band about drop bears. Very seriously. Jaxon is now wearing a bike helmet everywhere.', [
      { label: 'Play along', hint: 'Buzz ↑ · Jaxon ↓', effects: { buzz: 4, mood: { jaxon: -4 } }, outcome: 'The crowd sees Jaxon on stage in a bike helmet and loses it. Shazza wins the tour.' },
      { label: 'Tell Jaxon the truth', hint: 'Jaxon ↑', effects: { mood: { jaxon: 5 } }, outcome: 'Jaxon removes the helmet with dignity. Shazza looks disappointed in you personally.' }
    ], { type: 'weird', gate: { band: ['hail_damage'] } }),
    // ---- Russia ----
    card('wt_ru_minus40', 'russia', 'dmitri', 'Minus Forty', 'Dmitri from Frostfest apologizes: it is minus forty on the ice today. The local bands are wearing three coats. Your band is in hoodies, unimpressed.', [
      { label: '"This is spring in Saskatoon"', hint: 'Buzz ↑↑ · Burnout ↑', effects: { buzz: 10, burnout: 5, tour: { regionFans: 400 } }, outcome: 'Hoodies, no gloves, full set. The Siberians decide you are their people. There is a chant.' },
      { label: 'Borrow the coats', hint: 'Burnout ↓ · Moods ↑', effects: { burnout: -4, mood: { all: 4 } }, outcome: 'Dmitri hands out fur hats. Marcel wears his over the cape. It is a look.' }
    ], { type: 'road', city: ['irkutsk'], gate: { band: ['hail_damage'] } }),
    card('wt_ru_ice_gig', 'russia', 'dmitri', 'Minus Forty, Again', 'Dmitri from Frostfest apologizes: it is minus forty on the ice today. The local bands are wearing three coats. Your band is in hoodies, unimpressed.', [
      { label: '"This is spring back home"', hint: 'Buzz ↑↑ · Burnout ↑', effects: { buzz: 10, burnout: 5, tour: { regionFans: 400 } }, outcome: 'Hoodies, no gloves, full set. The Siberians decide you are their people. There is a chant.' },
      { label: 'Borrow the coats', hint: 'Burnout ↓ · Moods ↑', effects: { burnout: -4, mood: { all: 4 } }, outcome: 'Dmitri hands out fur hats. {front} wears one on stage. It is a look.' }
    ], { type: 'road', city: ['irkutsk'], gate: { band: ['frost_heave', 'gravel_kings', 'grid_road_ramblers'] } }),
    card('wt_ru_white_nights', 'russia', 'marcel', 'White Nights', 'Midnight in St. Petersburg and the sun is still up. The band has not slept in two days. Marcel is writing a symphony about it.', [
      { label: 'Enforce blackout curtains', hint: 'Burnout ↓', effects: { burnout: -8 }, outcome: 'Tinfoil on the windows, earplugs, a strict bedtime. The symphony is postponed.' },
      { label: 'Stay up, see the bridges open', hint: 'Chemistry ↑ · Burnout ↑', effects: { chemistry: 5, burnout: 5 }, outcome: 'At 2 a.m. the bridges lift over the Neva in daylight. Nobody talks. Nobody needs to.' }
    ], { type: 'weird', city: ['st_petersburg'], gate: { band: ['hail_damage'] } }),
    card('wt_ru_babushka', 'russia', 'jaxon', 'A Babushka Adopts Jaxon', 'A babushka at the hotel has decided Jaxon is too thin. She follows him with a pot of borscht. She reminds him, strongly, of Baba.', [
      { label: 'Eat the borscht', hint: 'Jaxon ↑ · Homesick ↓', effects: { mood: { jaxon: 8 }, tour: { homesick: -6 } }, outcome: 'Jaxon eats three bowls, calls Baba, and describes the borscht in detail. Baba is jealous. Baba is proud.' },
      { label: 'Politely decline', hint: 'Jaxon ↓', effects: { mood: { jaxon: -5 } }, outcome: 'You cannot decline. Nobody can decline. Jaxon eats the borscht anyway.' }
    ], { type: 'drama', gate: { band: ['hail_damage'] } }),
    card('wt_ru_banya', 'russia', 'dmitri', 'The Banya', 'Dmitri invites the band to a banya: steam, birch branches, then a roll in the snow. "For the voice," he says to Marcel.', [
      { label: 'Everybody in', hint: 'Burnout ↓ · Chemistry ↑', effects: { burnout: -6, chemistry: 4 }, outcome: 'Hot, cold, hot, cold. Marcel hits a note afterwards that shatters a glass. Dmitri nods. "Told you."' },
      { label: 'Just watch from the door', hint: 'Nothing happens', effects: { mood: { all: 3 } }, outcome: 'You watch your band sprint into a snowbank in towels. You take photos. You will use them.' }
    ], { type: 'weird', gate: { band: ['hail_damage'] } }),
    card('wt_ru_steam', 'russia', 'dmitri', 'The Banya, for the Voice', 'Dmitri invites the band to a banya: steam, birch branches, then a roll in the snow. "For the voice," he says to {front}.', [
      { label: 'Everybody in', hint: 'Burnout ↓ · Chemistry ↑', effects: { burnout: -6, chemistry: 4 }, outcome: 'Hot, cold, hot, cold. {front} hits a note afterwards that rattles a glass. Dmitri nods. "Told you."' },
      { label: 'Just watch from the door', hint: 'Nothing happens', effects: { mood: { all: 3 } }, outcome: 'You watch your band sprint into a snowbank in towels. You take photos. You will use them.' }
    ], { type: 'weird', gate: { band: ['frost_heave', 'gravel_kings', 'grid_road_ramblers'] } }),
    // ---- Story cards (forced by the tour sim; story: true) ----
    card('wt_invite', null, 'dj', 'An Invite from Abroad', '{festival} wants {band} in {region}. The promoter covers half the flights if you come soon. The world just got bigger.', [
      { label: 'We are going', hint: 'Region unlocked · half flights', effects: { buzz: 5, tour: { accept: true } }, outcome: 'You print the email and pin it on the gig board. {front} measures the stage clothes for an overhead bin.' },
      { label: 'Not this year', hint: 'The region stays open', effects: { mood: { all: -3 } }, outcome: 'You say thank you, very politely. The region stays open. The offer of flights does not.' }
    ], { type: 'fame', story: true }),
    card('wt_big', null, 'dj', 'Big in One Place', '{song} is number one in {region}. Not at home. There. A radio DJ there plays it every hour. Nobody knows how it happened.', [
      { label: 'Fly over for surprise shows', hint: 'Fund ↓ · Region fans ↑↑', effects: { fund: -1200, burnout: 6, tour: { regionFans: 1500, big: 'fly' } }, outcome: 'Two sold-out surprise shows. The DJ cries on air. The song goes gold there.' },
      { label: 'Shoot a local video', hint: 'Fund ↓ · Region fans ↑', effects: { fund: -400, tour: { regionFans: 700, big: 'video' } }, outcome: 'A video of the band pointing at a map of {region}. It is somehow perfect.' },
      { label: 'Enjoy it from afar', hint: 'Buzz ↑', effects: { buzz: 6, tour: { regionFans: 300, big: 'shrug' } }, outcome: 'You screenshot the chart and put it on the fridge.' }
    ], { type: 'fame', story: true }),
    card('wt_president', 'japan', 'emiko', 'The President', 'A woman in a band shirt bows deeply. "Emiko Tanabe. President, {band} Fan Club Japan. Member number one." She hands you a laminated card. You are member number two.', [
      { label: 'Bow back, deeper', hint: 'Fans ↑ · the president ♥', effects: { fans: 150, mood: { all: 4 }, tour: { regionFans: 300, gift: 'jp_omamori' } }, outcome: 'A bowing contest. Emiko wins. She gives the van a good-luck charm "so it never breaks down again". It is too late for that.' },
      { label: 'Sign everything she brought', hint: 'Burnout ↑ · the president ♥♥', effects: { burnout: 3, fans: 200, tour: { regionFans: 400, gift: 'jp_omamori' } }, outcome: 'Forty-one items, including a rice cooker. She has a spreadsheet of the band\'s birthdays. It is correct.' }
    ], { type: 'fame', story: true }),
    card('wt_moose', 'uk_europe', 'marcel', 'Platinum in Finland', 'Backstage at the Moose Opera, a Finnish label rep hands Marcel a platinum disc. It is the moose concept album. Marcel cannot speak.', [
      { label: 'Let Marcel make a speech', hint: 'Marcel ↑↑ · Buzz ↑', effects: { mood: { marcel: 18 }, buzz: 10 }, outcome: 'Eleven minutes, in French, about a moose. The opera house gives a standing ovation. So does the moose on the chandelier.' },
      { label: 'Group hug', hint: 'Chemistry ↑↑', effects: { chemistry: 8, mood: { all: 6 } }, outcome: 'Five Canadians in a pile in a Finnish opera house. Somebody takes a photo. It becomes the next album cover.' }
    ], { type: 'fame', story: true, gate: { band: ['hail_damage'] } }),
    // wt_homesick: one base for every band (Mom on the phone, the guitarist says it); a band's own wt_homesick_<bandId> beats it.
    card('wt_homesick', null, 'mom', 'Homesick', 'Mom calls. It is 4 a.m. back home. Nobody has slept. Everybody has called home twice today. {soloist} says it out loud: "Can we just go home?"', [
      { label: 'Fly home early', hint: 'Skip the rest of the tour', effects: { mood: { all: 8 }, tour: { endTour: true, homesick: -20 } }, outcome: 'You change the flights. The promoter is disappointed. The band sleeps the whole way home.' },
      { label: 'Finish what we started', hint: 'Moods ↓ · Burnout ↑', effects: { mood: { all: -5 }, burnout: 5, chemistry: 3 }, outcome: 'Group hug in a hotel corridor. You finish the tour. It gets into the band\'s bones.' },
      { label: 'Book a day off, fly Mom in', hint: 'Fund ↓ · Homesick ↓↓', effects: { fund: -1400, tour: { homesick: -25 } }, outcome: 'Mom arrives with a cooler of frozen perogies and a toque for everyone. She tidies the tour bus.' }
    ], { type: 'drama', story: true })
  ];

})(window.GG);
