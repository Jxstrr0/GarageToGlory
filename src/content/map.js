// map.js: Canada in rings for the gig board (owned by the WORLD agent). v0.3 = the Saskatchewan core; v0.6.1
// (Addendum 1, C6) = three rings: Saskatchewan from day one (+ Humboldt, Gravelbourg, Estevan; Warman and Martensville
// stay as Saskatoon satellites), the West in the Local Heroes era, the East & North in the Signed era. World maps: v0.7.
//   rings:  [ { id, name, sub, era (the first era it opens in), lock (teaser text), home?: { x, y, w, h, label }
//             (where the rings you already know sit in this ring's box), lakes?, rivers? } ]
//   cities: { <cityId>: { id, name, ring, x, y, blurb, label?: 'left'|'right'|'above' (label side; default below),
//             climate?: 'coast'|'north' (remaps the weekly weather, see content/calendar.js) } }
//           x/y = pin position in its ring's 0..1 box (0,0 = top-left, north up; stylized, not to scale)
//   roads:  [ [cityA, cityB, km, highway] ]  real-ish road distances; 26_sim_world finds shortest paths
//   rivers / lakes: decorative polylines / ellipses in the Saskatchewan box (ring 'sask')
// v0.9 "Genres" (owner Q1a): a fourth ring, 'alberta' (Edmonton + St. Albert, Sherwood Park, Leduc, Red Deer, Calgary,
//   Lethbridge), moved out of the West. bands.js homeRing is open from day one for that band (Gravel Kings: Alberta);
//   every other ring opens no earlier than Local Heroes for them (26_sim_world ringEra). ring.home is the "rings you know"
//   box for a Saskatchewan-home band, ring.home.labels[homeRing] renames it and ring.homeBy[homeRing] moves it (56_ui_board).
//   South-west Saskatchewan (the Ramblers' country) gains Maple Creek, Gull Lake and Shaunavon.
(function (GG) {
  GG.content.map = {
    id: 'canada_rings', name: 'Canada', sub: 'Flat, wide, and full of gigs. It gets wider.',
    rings: [
      { id: 'sask', name: 'Saskatchewan', short: 'Sask', era: 'garage', sub: 'Flat, wide, and full of gigs.',
        lock: 'Opens when you are Local Heroes (250 fans). The Trans-Canada is waiting.',
        homeBy: { alberta: { x: 0.0, y: 0.12, w: 0.06, h: 0.6, label: 'Alberta' } } },
      { id: 'alberta', name: 'Alberta', short: 'Alberta', era: 'local', sub: 'Oil money, chinooks and a mall with a wave pool.',
        lock: 'Opens when you are Local Heroes (250 fans). Somebody has already checked the tire pressure.',
        home: { x: 0.78, y: 0.15, w: 0.2, h: 0.7, label: 'Saskatchewan' } },
      { id: 'west', name: 'The West', short: 'West', era: 'local', sub: 'Mountains, a lake monster and a ferry.',
        lock: 'Opens when you are Local Heroes (250 fans). The mountains are not going anywhere.',
        home: { x: 0.32, y: 0.2, w: 0.44, h: 0.6, label: 'Alberta & Saskatchewan', labels: { sask: 'Alberta & Saskatchewan', alberta: 'Alberta & Saskatchewan' } } },
      { id: 'eastnorth', name: 'The East & North', short: 'East & North', era: 'signed', sub: 'Big cities, ferries, ice roads.',
        lock: 'Opens once you are Signed. Toronto has heard of you. Toronto has not listened yet.',
        home: { x: 0.03, y: 0.5, w: 0.24, h: 0.3, label: 'The Prairies & the West' } }
    ],
    cities: {
      /* ---- Saskatchewan (from day one) ---- */
      saskatoon: { id: 'saskatoon', ring: 'sask', name: 'Saskatoon', x: 0.3, y: 0.42, blurb: 'Eight bridges, a river valley and a lot of garages.' },
      martensville: { id: 'martensville', ring: 'sask', name: 'Martensville', x: 0.24, y: 0.28, label: 'above', blurb: 'Ten minutes north. Has a skatepark and opinions.' },
      warman: { id: 'warman', ring: 'sask', name: 'Warman', x: 0.4, y: 0.28, label: 'right', blurb: 'Curling capital of the immediate area.' },
      prince_albert: { id: 'prince_albert', ring: 'sask', name: 'Prince Albert', x: 0.47, y: 0.1, label: 'right', blurb: 'Gateway to the North. Bring bug spray.' },
      north_battleford: { id: 'north_battleford', ring: 'sask', name: 'North Battleford', x: 0.08, y: 0.18, label: 'right', blurb: 'Where the Yellowhead gets serious.' },
      humboldt: { id: 'humboldt', ring: 'sask', name: 'Humboldt', x: 0.55, y: 0.4, label: 'right', blurb: 'A water tower, a polka hall and very good sausage.' },
      yorkton: { id: 'yorkton', ring: 'sask', name: 'Yorkton', x: 0.88, y: 0.54, label: 'left', blurb: 'Pyrohy country. Come hungry.' },
      regina: { id: 'regina', ring: 'sask', name: 'Regina', x: 0.64, y: 0.74, label: 'right', blurb: 'The Queen City. Flatter than a drum skin.' },
      moose_jaw: { id: 'moose_jaw', ring: 'sask', name: 'Moose Jaw', x: 0.47, y: 0.79, blurb: 'Tunnels, a giant moose, questionable history.' },
      swift_current: { id: 'swift_current', ring: 'sask', name: 'Swift Current', x: 0.15, y: 0.84, blurb: "Speedy Creek. It isn't speedy." },
      gravelbourg: { id: 'gravelbourg', ring: 'sask', name: 'Gravelbourg', x: 0.36, y: 0.95, label: 'right', blurb: 'A cathedral on the bald prairie. Bonjour, tout le monde.' },
      // v0.9: south-west Saskatchewan (the Grid Road Ramblers' country)
      maple_creek: { id: 'maple_creek', ring: 'sask', name: 'Maple Creek', x: 0.02, y: 0.9, label: 'right', blurb: 'An old cow town under the Cypress Hills. Real boots, real wind.' },
      gull_lake: { id: 'gull_lake', ring: 'sask', name: 'Gull Lake', x: 0.08, y: 0.77, label: 'above', blurb: 'A grain elevator, a rink and one very ambitious community hall.' },
      shaunavon: { id: 'shaunavon', ring: 'sask', name: 'Shaunavon', x: 0.12, y: 0.97, label: 'right', blurb: 'The Boom Town of the southwest. Spring water and a rodeo every summer.' },
      estevan: { id: 'estevan', ring: 'sask', name: 'Estevan', x: 0.8, y: 0.95, label: 'left', blurb: 'Energy City. Sunniest place in Canada, allegedly.' },
      /* ---- Alberta (v0.9, owner Q1a: Gravel Kings' home ring; Local Heroes for everyone else) ---- */
      edmonton: { id: 'edmonton', ring: 'alberta', name: 'Edmonton', x: 0.5, y: 0.18, label: 'right', blurb: 'A mall with a city attached. Festival City, too.' },
      st_albert: { id: 'st_albert', ring: 'alberta', name: 'St. Albert', x: 0.36, y: 0.09, label: 'left', blurb: 'Just north of Edmonton. The biggest outdoor farmers\' market around.' },
      sherwood_park: { id: 'sherwood_park', ring: 'alberta', name: 'Sherwood Park', x: 0.66, y: 0.12, label: 'right', blurb: 'A hamlet of seventy thousand people. It insists it is not a city.' },
      leduc: { id: 'leduc', ring: 'alberta', name: 'Leduc', x: 0.5, y: 0.3, label: 'right', blurb: 'Where the oil boom started. Pumpjacks, a reservoir and the airport.' },
      red_deer: { id: 'red_deer', ring: 'alberta', name: 'Red Deer', x: 0.46, y: 0.5, label: 'left', blurb: 'Exactly halfway to everything. It knows.' },
      calgary: { id: 'calgary', ring: 'alberta', name: 'Calgary', x: 0.4, y: 0.7, label: 'left', blurb: 'Cowtown. Home of the Sad Dome.' },
      lethbridge: { id: 'lethbridge', ring: 'alberta', name: 'Lethbridge', x: 0.58, y: 0.9, label: 'right', blurb: 'The wind never stops. Hold on to your cymbals.' },
      /* ---- The West (Local Heroes) ---- */
      kelowna: { id: 'kelowna', ring: 'west', name: 'Kelowna', x: 0.2, y: 0.66, label: 'above', blurb: 'Wineries, a lake monster and your cousin\'s boat.' },
      vancouver: { id: 'vancouver', ring: 'west', name: 'Vancouver', x: 0.1, y: 0.8, label: 'right', blurb: 'It is raining. It was raining. It will be raining.', climate: 'coast' },
      victoria: { id: 'victoria', ring: 'west', name: 'Victoria', x: 0.05, y: 0.93, label: 'right', blurb: 'Tea, gardens and a ferry you will miss.', climate: 'coast' },
      brandon: { id: 'brandon', ring: 'west', name: 'Brandon', x: 0.84, y: 0.7, label: 'left', blurb: 'The Wheat City. Manitoba says hello, politely.' },
      winnipeg: { id: 'winnipeg', ring: 'west', name: 'Winnipeg', x: 0.94, y: 0.56, label: 'left', blurb: 'Portage and Main, coldest corner on earth. The politest metal scene in Canada.' },
      /* ---- The East & North (Signed) ---- */
      whitehorse: { id: 'whitehorse', ring: 'eastnorth', name: 'Whitehorse', x: 0.08, y: 0.12, label: 'right', blurb: 'Midnight sun in June, no sun in December.', climate: 'north' },
      yellowknife: { id: 'yellowknife', ring: 'eastnorth', name: 'Yellowknife', x: 0.3, y: 0.18, label: 'right', blurb: 'Ice roads, northern lights, a very long drive.', climate: 'north' },
      thunder_bay: { id: 'thunder_bay', ring: 'eastnorth', name: 'Thunder Bay', x: 0.42, y: 0.6, label: 'above', blurb: 'The Sleeping Giant. The drive here is the real tour.' },
      toronto: { id: 'toronto', ring: 'eastnorth', name: 'Toronto', x: 0.6, y: 0.92, label: 'right', blurb: 'The centre of the universe. Ask anyone from there.' },
      ottawa: { id: 'ottawa', ring: 'eastnorth', name: 'Ottawa', x: 0.66, y: 0.74, label: 'left', blurb: 'The capital. The canal freezes into a skating rink.' },
      montreal: { id: 'montreal', ring: 'eastnorth', name: 'Montréal', x: 0.74, y: 0.66, label: 'right', blurb: 'Bagels, bilingual moshing, a mountain in the middle.' },
      quebec_city: { id: 'quebec_city', ring: 'eastnorth', name: 'Québec City', x: 0.8, y: 0.5, label: 'left', blurb: 'A castle, a carnival and a snowman in a red sash.' },
      halifax: { id: 'halifax', ring: 'eastnorth', name: 'Halifax', x: 0.9, y: 0.8, label: 'left', blurb: 'Kitchen parties, fog and a noon gun.', climate: 'coast' },
      st_johns: { id: 'st_johns', ring: 'eastnorth', name: "St. John's", x: 0.95, y: 0.54, label: 'above', blurb: 'Jellybean houses and the edge of the continent.', climate: 'coast' }
    },
    roads: [
      /* Saskatchewan */
      ['saskatoon', 'martensville', 12, 'Hwy 12'],
      ['saskatoon', 'warman', 23, 'Hwy 11'],
      ['martensville', 'warman', 12, 'Hwy 305'],
      ['warman', 'prince_albert', 118, 'Hwy 11'],
      ['saskatoon', 'north_battleford', 138, 'Yellowhead (Hwy 16)'],
      ['north_battleford', 'prince_albert', 144, 'Hwy 40'],
      ['saskatoon', 'yorkton', 330, 'Yellowhead (Hwy 16)'],
      ['saskatoon', 'regina', 239, 'Hwy 11'],
      ['saskatoon', 'moose_jaw', 220, 'Hwy 11 / Hwy 2'],
      ['saskatoon', 'swift_current', 245, 'Hwy 7 / Hwy 4'],
      ['regina', 'moose_jaw', 71, 'Trans-Canada (Hwy 1)'],
      ['moose_jaw', 'swift_current', 174, 'Trans-Canada (Hwy 1)'],
      ['regina', 'yorkton', 187, 'Hwy 10'],
      ['saskatoon', 'humboldt', 113, 'Hwy 5'],
      ['humboldt', 'yorkton', 225, 'Hwy 5 / Hwy 9'],
      ['moose_jaw', 'gravelbourg', 115, 'Hwy 2 / Hwy 43'],
      ['swift_current', 'gravelbourg', 135, 'Hwy 4 / Hwy 43'],
      ['regina', 'estevan', 200, 'Hwy 39'],
      ['swift_current', 'gull_lake', 55, 'Trans-Canada (Hwy 1)'],
      ['gull_lake', 'maple_creek', 70, 'Trans-Canada (Hwy 1)'],
      ['gull_lake', 'shaunavon', 72, 'Hwy 37'],
      ['swift_current', 'shaunavon', 118, 'Hwy 4 / Hwy 13'],
      /* Alberta (v0.9) */
      ['edmonton', 'st_albert', 16, 'St. Albert Trail'],
      ['edmonton', 'sherwood_park', 20, 'Sherwood Park Freeway'],
      ['st_albert', 'sherwood_park', 32, 'Anthony Henday Drive'],
      ['edmonton', 'leduc', 33, 'QEII (Hwy 2)'],
      ['leduc', 'red_deer', 118, 'QEII (Hwy 2)'],
      /* The West */
      ['north_battleford', 'edmonton', 390, 'Yellowhead (Hwy 16)'],
      ['saskatoon', 'calgary', 620, 'Hwy 7'],
      ['swift_current', 'lethbridge', 390, 'Hwy 1 / Hwy 3'],
      ['edmonton', 'red_deer', 150, 'QEII (Hwy 2)'],
      ['red_deer', 'calgary', 145, 'QEII (Hwy 2)'],
      ['calgary', 'lethbridge', 210, 'Hwy 2 / Hwy 3'],
      ['calgary', 'kelowna', 605, 'Trans-Canada (Hwy 1)'],
      ['kelowna', 'vancouver', 390, 'Coquihalla (Hwy 5)'],
      ['vancouver', 'victoria', 115, 'The ferry (Hwy 17)'],
      ['regina', 'brandon', 355, 'Trans-Canada (Hwy 1)'],
      ['estevan', 'brandon', 300, 'Hwy 18 / Hwy 10'],
      ['brandon', 'winnipeg', 215, 'Trans-Canada (Hwy 1)'],
      ['yorkton', 'winnipeg', 455, 'Yellowhead (Hwy 16)'],
      /* The East & North */
      ['winnipeg', 'thunder_bay', 700, 'Trans-Canada (Hwy 17)'],
      ['thunder_bay', 'toronto', 1400, 'Hwy 11 / Hwy 400'],
      ['toronto', 'ottawa', 450, 'Hwy 401 / Hwy 416'],
      ['toronto', 'montreal', 540, 'Hwy 401'],
      ['ottawa', 'montreal', 200, 'Hwy 417'],
      ['montreal', 'quebec_city', 255, 'Autoroute 40'],
      ['quebec_city', 'halifax', 1000, 'Hwy 185 / Trans-Canada'],
      ['halifax', 'st_johns', 1480, 'The ferry + the TCH'],
      ['edmonton', 'yellowknife', 1500, 'Mackenzie Hwy (Hwy 35 / 1)'],
      ['edmonton', 'whitehorse', 1970, 'Hwy 43 / Hwy 97 / Hwy 1']
    ],
    rivers: [
      [[0.0, 0.7], [0.1, 0.63], [0.2, 0.58], [0.25, 0.5], [0.3, 0.42], [0.36, 0.32], [0.44, 0.2], [0.52, 0.1], [0.62, 0.04]],
      [[0.0, 0.2], [0.08, 0.18], [0.2, 0.15], [0.34, 0.13], [0.47, 0.1], [0.62, 0.04]]
    ],
    lakes: [
      { x: 0.17, y: 0.6, rx: 0.07, ry: 0.022, name: 'Lake Diefenbaker' },
      { x: 0.56, y: 0.57, rx: 0.025, ry: 0.07, name: 'Last Mountain Lake' }
    ]
  };
})(window.GG);
