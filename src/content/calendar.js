// calendar.js: months, seasons, weather and Canadian holidays (owned by the WORLD agent, v0.6.1 / Addendum 1 C7).
// The 24-week year runs two weeks per month from early July (contracts C.MONTHS / C.SEASONS). 28_sim_calendar.js reads
// this; every number here has a default in the sim, so the tunables can move without code changes.
//   seasons:  { <season>: { name, icon, blurb, fx: { road, wear, outdoorOff } } }   fx: road = breakdown risk x,
//             wear = van wear x (spring potholes), outdoorOff = outdoor venues are off the board
//   temps:    daytime highs (°C) by month index (0 = Jul … 11 = Jun), Saskatoon-ish
//   weather:  { <season>: { <kind>: weight } }  rolled weekly (seeded by career seed + week; never cancels a gig)
//   climates: { coast|north: { <kind>: <kind> } } remaps a roll for cities with that climate (content/map.js)
//   kinds:    { <kind>: { label, icon, temp (°C shift), outdoor (turnout x at outdoor gigs), indoor (turnout x indoors),
//               crowd (live crowd meter ±), road (breakdown risk x), wear (van wear x), burnout (on drives ≥ 60 km) } }
//   genreSeason: { <genre>: { <season>: -1..1 } }  genre-season fit (+ doubled at genreKinds venue kinds / outdoor)
//   holidays: [ { id, name, icon, weeks: [lo, hi], blurb, cards?: [cardId], closed?: [venue kinds], pay?: { all|<kind>: x },
//               weight?: { <kind>: x }, gig?: { crowd, buzz, fans (x), lines: [] }, era?: [eras that see it], news? } ]
//   news:     { <weekOfYear>: { who, text } } a group-chat line posted on that week's Monday (season flavour)
//   lines:    gig-result lines by weather kind (+ hailBand: Hail Damage in a hailstorm; a band whose bands.js
//             weather { kind, crowd, lines } names a key here gets those), costume bands for Halloween
// v0.9 "Genres" (plan_contract_0.9 §4.1): flat news / lines / costumes / holiday gig lines are neutral and tokenised;
//   calendar.byBand[bandId] = { news: { <week>: { who, text } } (replaces that week), lines, costumes (added),
//   holidayLines: { <holidayId>: [text] } (added to that holiday's gig lines) } ; holidays[].byBand[bandId].news replaces
//   the holiday's note. Holiday card lists (first card whose gate passes wins): Hail Damage's cards, then the shared
//   cards for the other three bands (cards.js o(): holiday_*_park/_loan/_table/_swap/_halftime/_jingle/_staff_parties/
//   _green). A pack's own holiday card must go in FRONT of the shared one: h.cards.unshift('holiday_x_<bandId>').
(function (GG) {
  GG.content.calendar = {
    months: { Jul: 'July', Aug: 'August', Sep: 'September', Oct: 'October', Nov: 'November', Dec: 'December',
      Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April', May: 'May', Jun: 'June' },
    seasons: {
      summer: { name: 'Summer', icon: '☀️', blurb: 'Festivals, fairs, mosquitoes and road construction. Hailstorms take it personally.',
        fx: { road: 1, wear: 1 } },
      fall: { name: 'Fall', icon: '🍂', blurb: 'Frosh week, harvest dances, Thanksgiving guilt and Halloween.',
        fx: { road: 1.05, wear: 1 } },
      winter: { name: 'Winter', icon: '❄️', blurb: 'Whiteouts, icy roads, the forgotten block heater. Nobody plays outdoors. Metal season.',
        fx: { road: 1.25, wear: 1.05, outdoorOff: true } },
      spring: { name: 'Spring', icon: '🌱', blurb: 'Pothole season. Mud. The festival lineups come out and you are not on them. Yet.',
        fx: { road: 1.1, wear: 1.25 } }
    },
    temps: [25, 24, 18, 10, -1, -11, -15, -11, -3, 9, 17, 22],
    weather: {
      summer: { clear: 52, rain: 20, heat: 16, hail: 12 },
      fall: { clear: 46, rain: 34, snow: 16, hail: 4 },
      winter: { clear: 42, snow: 38, blizzard: 20 },
      spring: { clear: 38, rain: 36, snow: 20, hail: 6 }
    },
    climates: {
      coast: { snow: 'rain', blizzard: 'rain', heat: 'clear', hail: 'rain' },
      north: { rain: 'snow', heat: 'clear', hail: 'snow' }
    },
    kinds: {
      clear: { label: 'Clear', icon: '☀️', night: '🌙', temp: 2, outdoor: 1.1, indoor: 1, crowd: 2, road: 1, wear: 1, burnout: 0 },
      rain: { label: 'Rain', icon: '🌧️', temp: -3, outdoor: 0.7, indoor: 1, crowd: -2, road: 1.15, wear: 1, burnout: 0 },
      snow: { label: 'Snow', icon: '🌨️', temp: -4, outdoor: 0.55, indoor: 0.95, crowd: 0, road: 1.3, wear: 1.05, burnout: 0 },
      blizzard: { label: 'Blizzard', icon: '🌬️', temp: -12, outdoor: 0.35, indoor: 0.85, crowd: 5, road: 1.8, wear: 1.1, burnout: 2 },
      heat: { label: 'Heat wave', icon: '🥵', temp: 9, outdoor: 1, indoor: 0.95, crowd: 3, road: 1.2, wear: 1, burnout: 1 },
      hail: { label: 'Hail', icon: '🧊', temp: -6, outdoor: 0.5, indoor: 1, crowd: 1, road: 1.4, wear: 1.15, burnout: 0 }
    },
    // Genre-season fit: country thrives at summer fairs and rodeos, punk at summer skate parks and all-ages shows,
    // metal owns the dark winter months. Doubled at the genre's own kinds of room (and at outdoor shows in summer).
    genreSeason: {
      metal: { winter: 1, fall: 0.3, spring: 0, summer: -0.2 },
      punk: { summer: 0.7, fall: 0.2, spring: 0.1, winter: -0.3 },
      rock: { summer: 0.4, fall: 0.3, spring: 0.1, winter: 0 },
      country: { summer: 0.7, fall: 0.5, spring: 0.1, winter: -0.3 }
    },
    genreKinds: { punk: ['skatepark', 'house'], country: ['legion', 'church', 'bingo', 'curling'], metal: ['bar', 'club'], rock: ['bar', 'club'] },
    fitFx: { score: 1.5, crowd: 4, fans: 0.05, home: 1.5 },   // per unit of fit: gig score ±, live crowd ±, new fans x(1 ± …)
    fitLines: {
      metal: { winter: 'Metal owns the dark months. Crowds are hungry for it.', summer: 'Metal in July: the black leather is a choice.' },
      punk: { summer: 'Summer: skate parks and all-ages shows. Punk season.', winter: 'Winter punk: fewer skate parks, more parkas.' },
      rock: { summer: 'Patio season. Rock sells beer.', fall: 'Fall: frosh week and bar season.' },
      country: { summer: 'Fair and rodeo season. Country wins the summer.', fall: 'Harvest dances. Country crowds show up in pickups.', winter: 'Winter: the rodeo grounds are a snowfield.' }
    },
    holidays: [
      { id: 'canada_day', name: 'Canada Day', icon: '🍁', weeks: [1, 1],
        blurb: 'Free outdoor park shows. Huge buzz, zero pay, fireworks you will absolutely miss.',
        cards: ['holiday_canada_day', 'holiday_canada_day_park'], weight: { outdoor: 8 },
        gig: { crowd: 6, buzz: 4, fans: 1.15, lines: ['Canada Day. Four thousand people in red and white, one of them conducting with a sparkler.',
          'Somebody starts "O Canada" between songs. You play along. {front} takes the high note. Everybody regrets it.'] } },
      { id: 'thanksgiving', name: 'Thanksgiving', icon: '🦃', weeks: [7, 7],
        blurb: "Dinner at your parents' place. If you owe them money, it comes up. Over pie.",
        cards: ['holiday_thanksgiving_guilt', 'holiday_thanksgiving_loan', 'holiday_thanksgiving', 'holiday_thanksgiving_table'] },
      { id: 'halloween', name: 'Halloween', icon: '🎃', weeks: [8, 8],
        blurb: 'Costume gigs: every band dresses up as another band.', cards: ['holiday_halloween', 'holiday_halloween_swap'],
        gig: { crowd: 5, buzz: 2, lines: ['Halloween: the band plays dressed as {costume}. Nobody can tell the difference. That is the problem.',
          'Costume night. You play dressed as {costume}. The crowd came dressed as you. It is a lot of mirrors.'] } },
      { id: 'remembrance', name: 'Remembrance Day', icon: '🌺', weeks: [9, 9], closed: ['legion'],
        blurb: 'Legion halls are closed for Remembrance Day. No Legion gigs this week. Poppies on.',
        news: { who: 'dad', text: "Legion's closed this week for Remembrance Day. Wear your poppy. I'm going to the service. So are you." },
        byBand: { hail_damage: { news: { who: 'doreen', text: 'Legion is closed this week for Remembrance Day. Wear your poppies. Lunch after the service, egg salad.' } } } },
      { id: 'grey_mug', name: 'The Grey Mug', icon: '🏈', weeks: [10, 10],
        blurb: "The big football final. Somebody plays the halftime show. One day, it's you.", cards: ['holiday_grey_mug', 'holiday_grey_mug_halftime'] },
      { id: 'christmas', name: 'Christmas', icon: '🎄', weeks: [11, 12],
        blurb: 'Holiday party circuit: every office, curling club and potash mine wants a band. The label wants a Christmas single.',
        cards: ['holiday_xmas_single', 'holiday_xmas_jingle', 'holiday_xmas_parties', 'holiday_xmas_staff_parties'], pay: { bar: 1.2, curling: 1.25, legion: 1.2, church: 1.2, club: 1.15 },
        gig: { crowd: 3, lines: ['Christmas party circuit: an ugly-sweater crowd, a cash bar and a boss doing the worm.'] } },
      { id: 'nye', name: "New Year's Eve", icon: '🎆', weeks: [12, 12],
        blurb: "The best-paying gig of the year. Everyone's out, everyone's loud, everyone counts down wrong.",
        pay: { all: 2 }, gig: { crowd: 8, buzz: 2, lines: ["New Year's Eve. You count the crowd down to midnight at 11:58. Nobody minds.",
          "Midnight hits mid-song. {soloist} kisses the guitar. It was that kind of night."] } },
      { id: 'st_patricks', name: "St. Patrick's Day", icon: '☘️', weeks: [18, 18],
        blurb: 'Pub gig circuit: every bar in the province turns green and books a band.', cards: ['holiday_st_paddys', 'holiday_st_paddys_green'], weight: { bar: 2.5 }, pay: { bar: 1.3 },
        gig: { crowd: 4, lines: ["St. Paddy's: green beer, a guy in a leprechaun hat, and a mosh pit that is mostly a jig."] } },
      { id: 'loonies', name: 'The Loonies', icon: '🏆', weeks: [20, 20], blurb: "Canada's music awards. Tuxedos, a moose-shaped trophy, somebody's rival crying on purpose." }
    ],
    news: {
      5: { who: '@filler', text: 'Frosh week! The campus stages book bands all week. Every student has a lanyard and no money.' },
      9: { who: 'mom', text: 'Harvest dance season. Every rural hall wants a band. Country bands, mostly. Bring a casserole anyway.' },
      13: { who: '@soloist', text: 'Minus 38 with the wind. The van would not start. Dad says "plug it in next time". Plug WHAT in?' },
      17: { who: '@front', text: 'The summer festival lineups are out. We are not on them. I have written a strongly worded letter.' },
      23: { who: '@any', text: 'Mosquito season. I have been bitten 41 times. I counted. {deadpan} has not been bitten once.' }
    },
    lines: {
      rain: ['It rained. The outdoor crowd huddled under a tarp and cheered anyway.', 'Rain on the tin roof, perfectly in time with the hi-hat.'],
      snow: ['Snow all the way there. The crowd tracked half of it onto the dance floor.'],
      blizzard: ['A blizzard. Only the diehards made it. The diehards were INTO it.', 'Whiteout outside, meltdown inside. The ones who came meant it.'],
      heat: ['A heat wave. The drum throne was a frying pan. The crowd was a sauna with opinions.'],
      hail: ['Hail on the roof like a double-kick run. The crowd thought it was part of the show.'],
      hailBand: ['A hailstorm on a Hail Damage night. The band took it personally. The crowd went feral.'],
      clearOutdoor: ['Clear skies, a sunset over the elevators, a crowd on lawn chairs. Perfect.'],
      outdoorBad: ['Half the outdoor crowd went home when the weather turned.']
    },
    costumes: ['{rival} (the whole band, one costume)', 'Maple Syrup Riot', 'the Bunnock Kings', 'Combine Harvester of Sorrow',
      'a moose (all of you, one costume)', 'Kayla & the Kettle Chips', 'the Stubble Burners'],

    // ---- v0.9: per-band extras (packs add frost_heave / gravel_kings / grid_road_ramblers) ----
    byBand: {
      hail_damage: {
        news: {
          5: { who: 'jaxon', text: 'Frosh week! The campus bowl books bands all week. Every student has a lanyard and no money.' },
          9: { who: 'baba', text: 'Harvest dance season. Every rural hall wants a band. Country bands, mostly. Bring perogies anyway.' },
          13: { who: 'dana', text: 'Minus 38 with the wind. The van would not start. Dad says "plug it in next time". Plug WHAT in?' },
          17: { who: 'marcel', text: 'The summer festival lineups are out. We are not on them. I have written a strongly worded poem.' },
          23: { who: 'jaxon', text: 'Mosquito season. I have been bitten 41 times. I counted. Kenji has not been bitten once.' }
        },
        costumes: ['Tundra Wraith (veggie tray included)'],
        holidayLines: {
          canada_day: ['Somebody starts "O Canada" between songs. You play along. Marcel sings it in French. Twice.'],
          halloween: ['Costume night. The crowd came as you. There are six Marcels in the front row, all in capes.'],
          nye: ['Midnight hits mid-song. Jaxon kisses his guitar. It was that kind of night.']
        }
      }
    }
  };
})(window.GG);
