// content/zz_band_grid_road_ramblers.js (v0.9 "Genres", lane A1): the Grid Road Ramblers pack. Country, a five-piece in Duke's
// uncle's Quonset outside Swift Current: Travis Lee Beauchamp (vocals/acoustic, grew up in a Regina condo, has never owned a
// truck), Earl Nakamura-Pike (lead guitar, seventy, played on the original, drives twenty under), Clementine Beaudry (fiddle,
// classically trained, "slumming it", secretly loves every second), Duke Harlan (bass, the hat is the character); you on drums
// on a hay bale. Their rival: Buckle & Boot (Red Deer), truck-ad cousins Brayden and Colt Hartwell, ex-junior hockey. Brayden
// sings about tailgates, Colt "plays" a guitar that has never been plugged in, their sponsor's mascot Titan Tim (a guy in a foam
// pickup costume) is basically a third member, and an unnamed session drummer ("the session guy") keeps the time.
//
// The zz_ prefix loads this file after every base content file (build.js sorts content/*.js), so it only ADDS to the base
// structures, per plan_contract_0.9 §4.1: band extras go into <file>.byBand.grid_road_ramblers (career.pool: flat + byBand),
// member-keyed pools get entries for travis / earl / clementine / duke, card variants use '<baseId>_grid_road_ramblers'
// ('_buckle_and_boot' for rv_*), the rival's voice lives in rivalry.cast.buckle_and_boot. Every object is created
// defensively (the base lane builds the v0.9 shapes in parallel); nothing in a base pool is removed; a per-band key never
// replaces another band's. The one exception is lic_fury (plan §5 A1 item 10): its text and choices are rewritten in place.
//
// The pack installs unconditionally (v0.9 integration) onto the §4.1 base content (neutral flat pools + byBand layers).
//
// Q2 storyline "Travis Lee's First Truck" (chain 'truck', 6 steps, 11 cards):
//   1 grr_truck_1_classified ── band chips in ──> 2 grr_truck_2_gus (Honest Gus's lot, Gull Lake) ─┐
//                            ── Travis alone ───> 2 grr_truck_2_alone (it will not leave first gear) ┤ (any) ──>
//                            ── "you can't drive stick" ─> end (truckStory: never)                   │
//   3 grr_truck_3_stick (Earl teaches stick on the grid road: sets truckDrive smooth | stalled)      <┘
//   4 grr_truck_4_sheldon (Prairie Titan wants the '87 for a "heritage" ad: truckAd yes | no | star)
//   5 grr_truck_5_standoff (truckAd yes|star: Buckle & Boot and Titan Tim at the Quonset gate: truckWar won | lost | truce)
//     grr_truck_5_bb_ad    (truckAd no: Prairie Titan gives the ad to Buckle & Boot, filmed at your Quonset: truckWar spite | truce)
//   6 grr_truck_6_shoot (truckAd still set: the ad gets made) | grr_truck_6_home (truckAd cleared at step 5) -> end, truckStory =
//     ad | famous | mine. Helper flags truckPlan / truckDrive / truckAd / truckWar are cleared at every end.
//   The truck-ad war ties into the v0.8.1 licensing fury hook: Prairie Titan Trucks is the licensing brand 'truck', Buckle &
//   Boot's sponsor (cast.furyBrand = 'truck'); lic_fury is rewritten here with the cousins and the mascot.
// Q3 World payoff (chain 'outback', Signed era, starts once flags.truckStory is set): the '87 truck song goes big on Australian
//   country radio (utes) -> flags.outback = 'tumbleworth' | 'sold' | 'no'. 'tumbleworth' unlocks the tour package
//   au_country_circuit (Melbourne, Alice Springs, the Tumbleworth Country Music Festival; payoff there: flags.outbackPayoff,
//   the story card wt_grr_golden_banjo, Gong credit).
// Q5 home superfan: Wilf from coffee row (bandbook.homeSuperfan.grid_road_ramblers, npc grr_wilf, gift grr_seed_cap_quilt).
// Q6 misprint: THE GRID ROAD RUMBLERS. Q8 cameos: grr_cameo_frost_heave, grr_cameo_gravel_kings, grr_cameo_hail_damage.
// New flags (cards set them, cards/tour read them): truckStory, truckPlan, truckDrive, truckAd, truckWar, outback, outbackPlan,
//   outbackCall, outbackPayoff (tour), hatInsured, demandRadio / demandImage / demandFeature / demandShowcase.
// npcs (band- or rival-scoped): grr_vern, grr_wilf, grr_lloyd, grr_dolores, grr_gus (the Ramblers); bb_sheldon (Buckle & Boot's
//   sponsor). Cast member ids bb_brayden / bb_colt / bb_titan_tim (the frontman and the mascot double as npcs); the hired
//   session drummer bb_session is cast.drummer, not a member.
// No USA content, no gong on the kit, no real brands (Prairie Titan, Prairie Pedigree and the Southwest Bugle are parodies).
(function (GG) {
  var K = GG.content = GG.content || {};
  var B = 'grid_road_ramblers', RIVAL = 'buckle_and_boot', GENRE = 'country';

  var GL = ['garage', 'local'], GLS = ['garage', 'local', 'signed'], LS = ['local', 'signed'], L = ['local'], S = ['signed'];
  var ALL = ['garage', 'local', 'signed', 'world'], LSW = ['local', 'signed', 'world'], SW = ['signed', 'world'], W = ['world'];

  /* ---- helpers --------------------------------------------------------------------------------------------------- */
  // Monday-deck gate: the Ramblers only (country), garage era unless the card says otherwise.
  function g(extra) {
    var gate = { era: ['garage'], genre: [GENRE], band: [B] };
    for (var k in extra) gate[k] = extra[k];
    return gate;
  }
  function only(extra) { var gate = { band: [B] }; for (var k in extra) gate[k] = extra[k]; return gate; }
  function obj(o, k) { if (!o[k] || typeof o[k] !== 'object') o[k] = {}; return o[k]; }
  function list(o, k) { if (!Array.isArray(o[k])) o[k] = []; return o[k]; }
  function band(o) { return obj(obj(o, 'byBand'), B); }             // o.byBand.grid_road_ramblers
  function add(arr, items) { for (var i = 0; i < items.length; i++) arr.push(items[i]); return arr; }
  function addNew(arr, items) {                                      // push strings the pool doesn't hold yet
    for (var i = 0; i < items.length; i++) if (arr.indexOf(items[i]) < 0) arr.push(items[i]);
    return arr;
  }
  function assign(t, s) { for (var k in s) t[k] = s[k]; return t; }
  function merge(t, s) {                                             // deep-ish merge: arrays concat, objects recurse
    for (var k in s) {
      if (Array.isArray(s[k])) t[k] = (Array.isArray(t[k]) ? t[k] : []).concat(s[k]);
      else if (s[k] && typeof s[k] === 'object') merge(obj(t, k), s[k]);
      else t[k] = s[k];
    }
    return t;
  }
  // A per-band slot (§4.1 "per band, non-pool": awards.speech / speechWorstVan / carpet, world.gongCarpet): { <bandId>: value }.
  function perBand(o, k, v) {
    if (o[k] == null || typeof o[k] !== 'object') o[k] = {};
    o[k][B] = v;
    return v;
  }
  // Member-keyed pools: pool[memberId] = value (merge when the base lane already started one).
  function members(pool, byMember) {
    for (var id in byMember) {
      var v = byMember[id];
      if (Array.isArray(v)) pool[id] = (Array.isArray(pool[id]) ? pool[id] : []).concat(v);
      else merge(obj(pool, id), v);
    }
  }
  // Push cards whose id is not taken yet (a second load, or the base lane shipping the same variant id, never duplicates).
  function addCards(arr, cards) {
    var have = {};
    arr.forEach(function (c) { if (c && c.id) have[c.id] = true; });
    cards.forEach(function (c) { if (!have[c.id]) { arr.push(c); have[c.id] = true; } });
    return arr;
  }
  function END(ch) { var o = {}; o[ch] = { step: 'end' }; return o; }
  function NEXT(ch, step, delay) { var o = {}; o[ch] = { step: step, delay: delay || 1 }; return o; }
  // The truck chain ends: the story result + every helper flag cleared.
  function truck(result) { return { truckStory: result, truckPlan: false, truckDrive: false, truckAd: false, truckWar: false }; }
  function outback(result) { return { outback: result, outbackPlan: false, outbackCall: false }; }
  // A look (same helper shape as rivals.js): LOOK + top.
  function look(skin, hair, style, shirt, pants, h, b, extras, top) {
    return { skin: skin, hair: hair, hairStyle: style, shirt: shirt, pants: pants, height: h, build: b, extras: extras || [], top: top };
  }

  /* ======================================================================================================================
     NPCs. The Ramblers' Swift Current people are scoped to the band; Buckle & Boot's people to their rival (career.speakerOk).
     ====================================================================================================================== */
  var npcs = obj(K, 'npcs');
  [
    { id: 'grr_vern', name: 'Uncle Vern', band: [B],
      blurb: "Duke's uncle. Owns the Quonset, the quarter section around it and a blue heeler named Biscuit. Charges rent in field work." },
    { id: 'grr_wilf', name: 'Wilf from coffee row', band: [B],
      blurb: 'Farms four sections south of Swift Current. Holds court at coffee row every morning at 6:40. Your first superfan. Reports all band news to the row.' },
    { id: 'grr_lloyd', name: 'Lloyd from the auction mart', band: [B],
      blurb: 'Auctioneer at the Swift Current auction mart. Talks at 400 words a minute. Has sold a cow, a combine and, once, a fiddle.' },
    { id: 'grr_dolores', name: 'Dolores from Speedy Creek 97', band: [B],
      blurb: "Morning host on Speedy Creek Country 97. Reads the grain prices, the obituaries and the band's gig dates in the same warm voice." },
    { id: 'grr_gus', name: 'Honest Gus', band: [B],
      blurb: "Runs Honest Gus's Used Trucks & Bait in Gull Lake. Every truck \"ran when parked\". Every worm is fresh. He guarantees one of the two." },
    { id: 'bb_brayden', name: 'Brayden Hartwell', rival: RIVAL, frontman: true,
      blurb: "Buckle & Boot's singer, the Buckle. Ex-junior hockey (Red Deer, the penalty box). Sings about tailgates. Only tailgates." },
    { id: 'bb_colt', name: 'Colt Hartwell', rival: RIVAL,
      blurb: "Buckle & Boot's guitarist, the Boot. Brayden's cousin, ex-junior hockey backup goalie. His guitar has never been plugged in." },
    { id: 'bb_titan_tim', name: 'Titan Tim', rival: RIVAL,
      blurb: 'The Prairie Titan Trucks mascot: a man named Tim inside a foam pickup costume. At every Buckle & Boot show. Waves with a side mirror.' },
    { id: 'bb_sheldon', name: 'Sheldon from Prairie Titan', rival: RIVAL,
      blurb: "Regional marketing manager at Prairie Titan Trucks. Chews a toothpick. Calls every song \"a product\". Buckle & Boot's sponsor, and your problem." }
  ].forEach(function (n) { if (!npcs[n.id]) npcs[n.id] = n; });

  /* ======================================================================================================================
     The rival: Buckle & Boot (rivalry.cast.buckle_and_boot, §4.1 rival cast extension). Red Deer, bro-country, truck money.
     ====================================================================================================================== */
  // Their label: the rival-only label the base lane made for them (labels[id].rivalOnly, rival: buckle_and_boot), else our own.
  var LBL = K.labels && typeof K.labels === 'object' ? K.labels : obj(K, 'labels');
  var bbLabel = null;
  Object.keys(LBL).forEach(function (id) { var l = LBL[id]; if (!bbLabel && l && l.rivalOnly && l.rival === RIVAL) bbLabel = id; });
  if (!bbLabel) {
    bbLabel = 'titan_records';
    if (!LBL[bbLabel]) LBL[bbLabel] = { id: bbLabel, name: 'Prairie Titan Records', rivalOnly: true, rival: RIVAL,
      blurb: 'The record label of a truck company. Every contract has a towing-capacity clause. Every album ships with a floor mat.',
      rep: { name: 'Sheldon from Prairie Titan', blurb: 'Chews a toothpick. Calls every song "a product launch". Never says no to a tailgate.' } };
  }

  var RV = obj(K, 'rivalry');
  var cast = obj(RV, 'cast');
  cast[RIVAL] = assign(cast[RIVAL] || {}, {
    id: RIVAL, frontman: 'bb_brayden', label: bbLabel, faceStyle: 'hat', furyBrand: 'truck', mascot: 'bb_titan_tim',
    vehicle: 'a lifted Prairie Titan crew cab with both their faces on the tailgate, towing a flatbed for Titan Tim',
    minivan: 'a lifted Prairie Titan crew cab with both their faces on the tailgate, towing a flatbed for Titan Tim',
    members: [
      { id: 'bb_brayden', name: 'Brayden', short: 'Brayden', fullName: 'Brayden "Buckle" Hartwell', nick: 'Buckle', role: 'vocals', lane: 'front',
        dayJob: 'Prairie Titan brand ambassador (salaried)',
        bio: 'Two seasons of junior hockey in Red Deer, mostly in the penalty box. Now sings about tailgates. Every song. The tailgate is up, down, or a metaphor.',
        gags: ['His belt buckle is the size of a hubcap. It says BUCKLE. In case.', 'Has never finished a sentence without the word "tailgate".',
          'Still does a hockey stop at the end of every song. On stage. In boots.', 'Calls the Ramblers "the hay-bale guys" with total respect.'],
        look: look('#f0c9a4', '#d9b25a', 'short', '#3a6ea5', '#27324a', 1.06, 1.1, ['hat'], 'flannel'), corpsePaint: false, stageShirt: '#3a6ea5' },
      { id: 'bb_colt', name: 'Colt', short: 'Colt', fullName: 'Colt "Boot" Hartwell', nick: 'Boot', role: 'guitar (unplugged)', lane: 'left',
        dayJob: 'Prairie Titan brand ambassador (junior)',
        bio: "Brayden's cousin. Played junior hockey as a backup goalie; never went in. \"Plays\" a guitar that has never been plugged in. The cable goes to his boot.",
        gags: ['His guitar has no strings on the side facing away from the crowd.', 'Strums on the one and the three and the two and four. Whatever.',
          'Was asked to play a G chord at a radio station. Asked which one.', 'Polishes his boots between songs. Every song.'],
        look: look('#e6b890', '#6b4a2c', 'long', '#f2f2ee', '#3a4a6a', 1.04, 1.0, ['hat', 'sunglasses'], 'jacket'), corpsePaint: false, stageShirt: '#f2f2ee' },
      { id: 'bb_titan_tim', name: 'Titan Tim', short: 'Tim', fullName: 'Tim (inside Titan Tim)', nick: 'Titan Tim', role: 'mascot', lane: 'right',
        dayJob: 'Mascot, Prairie Titan Trucks (unionized)',
        bio: 'A man named Tim in a foam pickup-truck costume. On stage at every show. Waves with a side mirror. Has more fans than Colt. Possibly more talent.',
        gags: ['The costume has working headlights. Tim flashes them on the chorus.', 'Nobody has seen Tim\'s face. There are theories.',
          'Signs autographs with a tire tread stamp.', 'Once got stuck in a Legion doorway for forty minutes. Stayed in character.'],
        look: look('#d8a47a', '#3a2a1a', 'cap', '#c0392b', '#2a2a30', 1.1, 1.2, [], 'hoodie'), corpsePaint: false, stageShirt: '#c0392b' }
    ],
    // the session guy: a hired drummer, not a member (owner default): the rival set seats him on their throne (59d passes
    // cast.drummer when the lineup has no drummer; the stage's session path uses his id + look), never the player.
    drummer: { id: 'bb_session', hired: true, name: 'The Session Guy', short: 'Session guy', fullName: 'The Session Guy', nick: 'The Session Guy', role: 'drums', lane: 'back',
        dayJob: 'Session drummer, by the hour',
        bio: 'Hired by the hour. Nobody knows his name, including the cousins. Has drummed on four hundred truck commercials. Nods at you, one professional to another.',
        gags: ['Leaves at exactly the end of the booked hour. Mid-song, if needed.', 'Invoices Buckle & Boot for the encore separately.',
          'The only member of the band who can read music. Does not bring it up.'],
        look: look('#c68b5e', '#1c1c1c', 'bald', '#4a4a52', '#222228', 1.0, 1.05, ['beard'], 'tee'), corpsePaint: false, stageShirt: '#4a4a52' },
    songs: ['Tailgate Down (Heart Up)', 'Tailgate Nation', 'Four-Wheel Feelings', 'Mud on the Tailgate, Love in the Cab', 'Truck Yeah, Red Deer',
      'She Likes My Towing Capacity', 'Crew Cab Kisses', 'Tailgate Sunset (Sponsored)', 'Hitch It to My Heart', 'Built Titan Tough',
      'Penalty Box Blues', 'Lift Kit Love', 'Tailgate (Acoustic, Colt Unplugged)', 'Half-Ton of Heartache', 'Tailgate Again'],
    albums: [
      { title: 'Tailgate', kind: 'album' }, { title: 'Tailgate II: Tailgate Harder', kind: 'album' },
      { title: 'Crew Cab Chronicles', kind: 'album' }, { title: 'Built Titan Tough', kind: 'album' },
      { title: 'Four-Wheel Feelings', kind: 'album' }, { title: 'Live at the Dealership', kind: 'album' },
      { title: 'Penalty Box Sessions', kind: 'album' }, { title: 'Towing Capacity', kind: 'album' },
      { title: 'A Very Tailgate Christmas', kind: 'album' }, { title: 'Greatest Tailgates (So Far)', kind: 'album' },
      { title: 'Unplugged (Colt Always Is)', kind: 'album' }, { title: 'Lifted', kind: 'album' }
    ],
    rebrands: ['Buckle & Boot & Tim', 'B&B Presented by Prairie Titan', 'The Tailgate Boys', 'Buckle, Boot and the Session Guy',
      'Brayden & Colt (Formerly Buckle & Boot)'],

    // ---- News: every rivalry.news key (the sim picks with its own seeded RNG). ----
    news: {
      filler: [
        "{rival} played a dealership grand opening in Red Deer. Titan Tim cut the ribbon with a side mirror.",
        "{rival} released a single called 'Tailgate'. It is their fourth single called 'Tailgate'.",
        "Colt from {rival} was photographed plugging in his guitar. Prairie Titan says the photo was 'taken out of context'.",
        "Brayden from {rival} did a radio interview. He said {band} are 'the real hay-bale deal, bud'. Then he said tailgate nine times.",
        "{rival} filmed a truck commercial in a canola field near Swift Current. It was Uncle Vern's canola field. Nobody asked.",
        "{rival}'s session drummer left a show at exactly 10:00 p.m. The booked hour was over. The song was not.",
        "Titan Tim was voted Alberta's Most Beloved Mascot for a third year. Colt is reportedly 'fine with it'.",
        "{rival} launched a cologne. It is called Tailgate. It smells like diesel and body spray.",
        "{rival} sent {band} a gift basket: beef jerky, a Prairie Titan floor mat and a note that says 'no hard feelings (yet)'.",
        "Sheldon from Prairie Titan called {rival} 'the most on-brand band in the history of trucks'.",
        "{rival} played the national anthem at a junior hockey game. Brayden did a hockey stop at the end. He fell. It went viral.",
        "{rival} were spotted at the Swift Current Co-op buying hats. Wilf from coffee row says the hats were 'too clean'."
      ],
      local: ["{rival} hit two hundred and fifty fans. Prairie Titan threw them a barbecue in a dealership parking lot."],
      signed: ["{rival} signed with Prairie Titan's own record label. A truck company has a record label. The contract was signed on a tailgate. Obviously."],
      album: ["{rival} release '{album}'. It debuts at #{pos} on the Maple 100. Every copy comes with a Prairie Titan air freshener.",
        "'{album}' by {rival} enters the Maple 100 at #{pos}. Titan Tim promotes it by honking at people in a mall parking lot."],
      albumNoChart: ["{rival} release '{album}'. It misses the chart. Prairie Titan gives it away free with every oil change."],
      fans: ["{rival} passed {fans} fans. Brayden thanked them from a tailgate. Colt pretended to play a thank-you riff."],
      youPassed: ["You have more fans than {rival} now. Brayden posted a video of himself staring at a truck for four minutes."],
      theyPassed: ["{rival} have more fans than you again. Titan Tim flashed his headlights at your Quonset on the way past."],
      heatUp: ["The scene is calling it a feud. Prairie Titan is calling it 'a marketing opportunity'.",
        "Speedy Creek 97 runs 'Hay Bales or Tailgates?' as a call-in poll. Sheldon from Prairie Titan buys the ad break."],
      heatDown: ["Things are quiet with {rival}. Brayden is 'focusing on his craft'. His craft is a new song about tailgates."],
      forfeit: ["You skipped the Battle of the Bands. {rival} won by default and Brayden did a hockey stop across the stage to celebrate."],
      sameNightQuiet: ["{rival} played {venue} on Saturday. Titan Tim got stuck in the door for the first twenty minutes. Still sold out."],
      festivalMissed: ["{rival} headlined {venue}. Brayden thanked 'the Swift Current boys, who could not make it. Gas is expensive, bud.'"],
      opener: ["{rival} opened for you. They brought a sponsor tent, a free-truck raffle and about {n} fans in Prairie Titan caps.",
        "{rival} opened the show. Colt's guitar was, as usual, not plugged in. The crowd was, as usual, into it."],
      poached: ["{name} is in {rival} now. The welcome photo: a Prairie Titan cap, a hubcap buckle, a lease on a half-ton."],
      loonies: ["{rival} won {n} Loonie(s) this year. Brayden thanked Prairie Titan, his cousin and, 'for keeping us honest', {band}."],
      crack_breakup: ["Prairie Titan dropped {rival}. The cousins are coaching peewee hockey in Red Deer. Titan Tim kept the costume."],
      crack_rebrand: ["Buckle & Boot are now {rival}. Same cousins, same truck, a new logo that is also a truck."],
      crack_opener: ["{rival} want to open for you. Sheldon's email subject line is 'Synergy? (Towing Capacity)'."],
      finalSoon: ["The Sad Dome in Calgary wants a co-bill in week {n}: {band} and {rival}. Prairie Titan wants to park a truck on stage."],
      reunion: ["{rival} reunite for one night at the Sad Dome. Titan Tim is back in the costume. He never really left it."]
    },

    // ---- Showdowns: every C.SHOWDOWNS kind (the UI announcement + your-win / their-win lines). ----
    showdowns: {
      botb: { title: 'Battle of the Bands!', icon: '⚔️',
        text: "Battle of the Bands at {venue}, {city}. {rival} are in, with a sponsor tent and a truck parked on the stage. Winner takes {prize} and some of the loser's fans.",
        win: ["The crowd picks you. Brayden hockey-stops over to shake your hand and slides into the drum riser. You take {prize}.",
          "You win the Battle. Titan Tim flashes his headlights twice, which Sheldon says is 'not an endorsement'."],
        lose: ["The crowd picks {rival}. The truck on the stage did a lot of the work. Some of your fans leave with free caps.",
          "{rival} win the Battle. Brayden thanks 'the hay-bale boys' and the tailgate, in that order."] },
      sameNight: { title: 'Same night, same town', icon: '🌃',
        text: "{rival} are playing {venue} this Saturday too, with a free-truck raffle. The crowd will split. Whoever has the buzz gets the room.",
        win: ["Most of the scene came to your show. The raffle truck went to a man who does not have a licence. Karma."],
        lose: ["Half your crowd went for the raffle at the {rival} show. None of them won. They came back in Prairie Titan caps."] },
      stolenSlot: { title: 'Slot stolen', icon: '📌',
        text: "{rival} booked {venue} out from under you. Sheldon from Prairie Titan paid the booker in floor mats.",
        win: ["{venue} kept you. The booker says the floor mats were 'nice, but I drive a Buick'."],
        lose: ["{rival} took the {venue} slot. The booker's truck has new floor mats and he will not look at you."] },
      festival: { title: 'Festival clash', icon: '🎪',
        text: "{venue}: {rival} headline with a pickup on a turntable behind them. You're on at 2 p.m. Outplay them from the lower slot.",
        win: ["You outplayed the headliners from the 2 p.m. slot. By evening Titan Tim is dancing at the side of YOUR stage."],
        lose: ["{rival} close the festival as the turntable spins the truck. It is stupid. The crowd loves it. You hate that it works."] },
      loonies: { title: 'The Loonies', icon: '🏆',
        text: "{rival} are nominated against you. Their campaign is sponsored. Yours is Duke's hat.",
        win: ["You beat {rival} at the Loonies. Brayden claps. Colt claps. Titan Tim claps, which takes a while."],
        lose: ["{rival} beat you at the Loonies. Brayden thanks Prairie Titan by model number."] },
      poach: { title: 'The poach', icon: '🛻',
        text: "{rival} want {name}. There is a truck involved. There is always a truck involved.",
        win: ["{name} stays. Sheldon texts: 'Understood. The truck stays on the lot. With your name on it.'"],
        lose: ["{name} joins {rival}. By Thursday there is a Prairie Titan lease and a hubcap-sized buckle."] },
      final: { title: 'The Sad Dome', icon: '🏟️',
        text: "The Sad Dome, Calgary. A co-bill: {band} and {rival}. One set each. The crowd decides who headlines and who opens. Forever.",
        win: ["You headline the Sad Dome. {rival} open for you, forever. Titan Tim bows. It takes a forklift."],
        lose: ["{rival} headline the Sad Dome. You open. Brayden calls you 'the hay-bale guys' to fifty thousand people. Forever."] }
    },

    banter: {
      open: ["Brayden: \"What's up {city}! Tailgates DOWN!\"", "Brayden: \"Hello {city}! This one's about a tailgate!\" (They all are.)"],
      mid: ["Colt strums a guitar with no cable. The crowd screams anyway.", "Titan Tim flashes his headlights on the chorus.",
        "Brayden does a hockey stop across the stage. In boots. He mostly sticks it.", "The session guy checks his watch between songs.",
        "Brayden: \"This next one's about a tailgate. But sad.\""],
      final: ["Brayden: \"Calgary! Tailgates down for the last time tonight!\""],
      opening: ["Afterwards Brayden hands you a Prairie Titan keychain. 'No hard feelings, bud. Yet.'"]
    },
    openingSlot: ["Afterwards Brayden asks who plays {instrument}. You do. He asks if you do truck ads.",
      "After the set Sheldon offers the band a 'hay-bale partnership'. Duke asks what that is. Nobody knows."],

    ui: {
      heatLabels: ['Friendly (sponsored)', 'Tense', 'Heated', 'Boiling (with branding)', 'Blood feud, with a tow hitch'],
      vehicleLine: 'Buckle & Boot tour in a lifted Prairie Titan crew cab with their faces on the tailgate. Titan Tim rides on a flatbed behind it.',
      emptyNews: 'Nothing yet. Brayden is "writing". It is about a tailgate.',
      emptyAlbums: 'No records yet. Prairie Titan is "testing the tailgate market".',
      pass: 'You sit this one out. {rival} post a video of the empty stage with a truck parked on it.',
      finalWin: 'The Sad Dome is yours. Prairie Titan edits the broadcast so the truck gets the credit.',
      finalLose: "Brayden waves at you from the headliner's side of the stage. Titan Tim waves too, eventually.",
      solo: 'Colt: a solo, on a guitar that is not plugged in. The session guy covers it on the toms.',
      finish: '{rival} finish on a hockey stop. Titan Tim flashes his headlights. Your turn.',
      crack: { breakup: ['Prairie Titan dropped them.', 'The cousins are coaching peewee hockey in Red Deer. Titan Tim kept the costume.'],
        rebrand: ['They rebranded.', 'Same cousins, same truck, new logo: {rival}. Sheldon calls it "the new model year".'],
        opener: ['They want to open for you.', 'Sheldon ran the numbers. You are the bigger draw now. There is a truck in it for you.'] }
    },
    carpet: { intro: 'Buckle & Boot work the far end of the carpet: two cousins in matching hats and Titan Tim, sideways, to fit.', wave: 'tailgate', count: 3 },
    defector: { line: "By Thursday they have a Prairie Titan lease, a hubcap buckle and a new song about a tailgate. They look expensive. They look sad.", look: 'denim' },
    comments: [
      "love this bud!! real hay-bale energy 🤠 (Brayden, Buckle & Boot)",
      "great hustle boys. dm us about a collab. we have a truck. — B&B",
      "that tailgate at 0:12 is doing a lot of work. respect. — Colt",
      "Titan Tim here (typed with a side mirror). honk honk",
      "real ones recognize real ones. also check out our cologne",
      "love the fiddle. we tested fiddle. it tested well. — Sheldon, Prairie Titan",
      "is that a hay bale drum stool?? genius. we're stealing it"
    ],
    commentsExclusive: ["Subscribed at the Drumstick tier to support the scene! Expensing it to Prairie Titan. — Brayden",
      "Members-only content, love that. We have a members-only truck. Anyway."],

    // ---- The rival's forced Monday cards (career.variant: '<id>_buckle_and_boot'). ----
    cards: [
      { id: 'rv_poach_buckle_and_boot', type: 'drama', speaker: 'bb_sheldon', title: 'A Truck for {recruit}', once: false,
        text: "A brand-new Prairie Titan half-ton is parked at the Quonset gate with a bow on the hood. The note is addressed to {recruit}: " +
          "'Lease paid for three years. Just play with Buckle & Boot. — Sheldon.' {recruit} is sitting in the driver's seat.",
        choices: [
          { label: 'Match it: a loyalty bonus', hint: 'Cash from the band fund', effects: { fund: -150, mood: { recruit: 16 } },
            outcome: "You hand {recruit} an envelope with less in it and a speech with more in it. {recruit} gets out of the truck. Slowly." },
          { label: 'Promise {recruit} a spotlight', hint: 'Their name on the poster, a song of their own', effects: { mood: { recruit: 14 }, chemistry: -2, burnout: 4 },
            outcome: "New posters, {recruit}'s name under Duke's hat, a song built around them. {recruit} leaves the bow on the truck's hood." },
          { label: 'Call the bluff', hint: 'Gamble: they might take the truck',
            roll: { chance: 0.5, stat: 'chemistry', statScale: 0.01,
              success: { effects: { mood: { recruit: 6 }, buzz: 2 }, outcome: '{recruit} stays. Out of spite, mostly. The truck was an automatic.' },
              fail: { effects: { member: { id: 'recruit', act: 'poach' } },
                outcome: "{recruit} drives off in the half-ton. The welcome photo: a Prairie Titan cap and a hubcap buckle. You got tagged." } },
            outcome: 'You shrug and say "go, then".' }
        ] },
      { id: 'rv_crack_breakup_buckle_and_boot', type: 'scene', speaker: 'bb_brayden', title: 'Dropped by the Truck', once: true,
        text: "Prairie Titan dropped Buckle & Boot. The cousins are coaching peewee hockey in Red Deer. Brayden calls you from the rink: " +
          "'You beat us, bud. Every time. The truck noticed.' Titan Tim kept the costume. Nobody has the heart to ask for it back.",
        choices: [
          { label: 'Invite them to a Quonset jam', hint: 'Kindness, country style', effects: { buzz: 6, chemistry: 3, fans: 30 },
            outcome: 'Brayden and Colt come out in a borrowed car. Colt plugs in for the first time in his life. It is loud. He cries. Duke hugs him.' },
          { label: 'Take a victory lap', hint: 'Buzz now, karma later', effects: { buzz: 12, fans: 40, mood: { all: -3 } },
            outcome: 'Travis Lee posts a photo of his 1987 truck with the caption "still running". Brayden likes it. Then shares it. "Respect."' }
        ] },
      { id: 'rv_crack_rebrand_buckle_and_boot', type: 'scene', speaker: 'bb_sheldon', title: 'The New Model Year', once: true,
        text: "Buckle & Boot have a new name: {rival}. Same cousins, same crew cab, a logo that is also a truck. Sheldon presents it at a " +
          "dealership launch. Slide 14 is a photo of your Quonset, labelled 'COMPETITOR (HAY BALES)'.",
        choices: [
          { label: 'Congratulate them, sincerely', hint: 'Be the bigger band', effects: { chemistry: 3, buzz: 3 },
            outcome: 'You send a card. Brayden replies with a floor mat that says THANKS BUD. Duke puts it in front of the Quonset door.' },
          { label: 'Keep calling them Buckle & Boot', hint: 'Petty, and fun', effects: { buzz: 8, mood: { all: 2 } },
            outcome: 'You call them Buckle & Boot in every interview. Sheldon sends a cease-and-desist on truck letterhead. Earl frames it.' }
        ] },
      { id: 'rv_crack_opener_buckle_and_boot', type: 'scene', speaker: 'bb_sheldon', title: 'Synergy (Towing Capacity)', once: true,
        text: "Sheldon calls. 'We ran the numbers. You're the bigger draw now. Buckle & Boot would like to open for you. There's a truck on a " +
          "turntable. Titan Tim will stay on his side of the stage. We can put that in writing.'",
        choices: [
          { label: "Sure. You're opening.", hint: 'Their fans become your fans', effects: { buzz: 6, fans: 30, chemistry: 2 },
            outcome: 'Brayden whoops. Colt mimes excitement. Titan Tim flashes his headlights. Sheldon sends a stage plot with the truck already on it.' },
          { label: 'No truck on the stage', hint: 'A little payback', effects: { buzz: 10, mood: { all: 2 }, chemistry: -2 },
            outcome: 'Sheldon agrees to no truck. He negotiates one tailgate. It turns out to be a whole truck with one tailgate showing.' }
        ] },
      { id: 'rv_final_eve_buckle_and_boot', type: 'scene', speaker: 'bb_brayden', title: 'Sad Dome Eve', once: true,
        text: "This weekend: the Sad Dome, Calgary. {rival} and {band}, one night, one headliner. Brayden texts: 'good luck bud!! " +
          "(tailgate)'. Prairie Titan has booked a skywriter. The skywriter is writing TAILGATE.",
        choices: [
          { label: 'Rehearse until your hands bleed', hint: 'Sharper, more tired', effects: { chemistry: 4, burnout: 8, drumSkill: 1 },
            outcome: 'You run the set eleven times in the Quonset. Clementine allows herself one yeehaw. You are ready.' },
          { label: 'Send the cousins a hay bale', hint: 'Out-nice the brand', effects: { fund: -20, buzz: 8, mood: { all: 3 } },
            outcome: "You mail Brayden a square bale with a note: 'For the drum stool. Good luck.' He sits on it for the show. Sheldon is livid." }
        ] }
    ]
  });
  // cast.mascot is the member object itself ({ id, look, corpsePaint:false, ... }; cast.drummer is the hired session guy,
  // an object too): the rival screen, the stage and the carpet read .id / .name / .look (a bare id string reads as nobody).
  (function (c) {
    var find = function (id) { return (c.members || []).filter(function (m) { return m && m.id === id; })[0] || null; };
    if (typeof c.drummer === 'string') c.drummer = find(c.drummer);
    if (typeof c.mascot === 'string') c.mascot = find(c.mascot);
    if (c.mascot) c.mascot.mascot = true;
  })(cast[RIVAL]);

  // The Loonies: Buckle & Boot win and thank you; you beat them and they are gracious about it (on a tailgate).
  var AW = obj(K, 'awards');
  obj(AW, 'rivalThanks')[RIVAL] = [
    "Aw, buddy. First we want to thank Prairie Titan Trucks, the tailgate, and Tim. And {band}, for keeping us honest. Tailgates down!",
    "This {category} is for everybody in a truck tonight. And for {band}. The hay-bale boys. Respect, bud.",
    "Brayden here. Colt's here too. Shout-out to {band} from Swift Current! Next round's on the tailgate.",
    "We want to thank our sponsor, who is also our label, who is also a truck. And {band}, who are not a truck. Yet."
  ];
  obj(AW, 'rivalLoses')[RIVAL] = [
    "Buckle & Boot give you a standing ovation. Titan Tim stands too. It takes a while.",
    "Brayden hockey-stops over to your table to shake your hand. He mostly sticks it. Colt waves an unplugged cable.",
    "Sheldon sends a Prairie Titan floor mat to your table before your name is even read. It says CONGRATS BUD."
  ];

  /* ======================================================================================================================
     Monday deck (GG.content.cards), gated { band: [grid_road_ramblers], genre: [country] } through g(). Magnitudes follow
     the earliest era in the gate (MAG_BY_ERA). Year one: early cards (maxWeek), mid (minFans), late (minWeek / weekOfYear)
     and repeatables (once: false + cooldown).
     ====================================================================================================================== */
  var cards = list(K, 'cards');
  addCards(cards, [
    // ---- Week one (forced) -----------------------------------------------------------------------------------------
    { id: 'grr_week_one_truck', type: 'drama', speaker: 'travis', title: "A Truck He Doesn't Own", forceWeek: 1, gate: g({}),
      text: "First real rehearsal in the Quonset. Travis Lee has written a song about his truck. He does not have a truck. He grew up in a " +
        "Regina condo. Earl says he played on the original. There is no original. Duke's hat arrives a full second before Duke.",
      choices: [
        { label: "Sing it like you mean it", hint: 'Travis ↑ · Chemistry ↑', effects: { mood: { travis: 8 }, chemistry: 2 },
          outcome: 'Travis Lee sings about the truck with his eyes shut. By the second chorus Clementine is playing along. She says it was "an accident".' },
        { label: "Write about the condo instead", hint: 'Travis ↓ · Clementine ↑', effects: { mood: { travis: -5, clementine: 4 } },
          outcome: "'Condo Cowboy' has a bridge about the elevator. Clementine says it is the first honest country song she has heard. Travis is hurt." },
        { label: "Earl, which original?", hint: 'Earl ↑↑ · Burnout ↑', effects: { mood: { earl: 10 }, burnout: 4 },
          outcome: 'Forty minutes on a 1979 session in Lethbridge. The truck was a Mercury. The song was about a dog. You rehearse nothing. Earl glows.' }
      ] },

    // ---- Q2: Travis Lee's First Truck (chain 'truck', steps 1-6) ------------------------------------------------------
    { id: 'grr_truck_1_classified', type: 'drama', speaker: 'travis', title: 'For Sale: 1987 Half-Ton', chain: 'truck', step: 1, weight: 3,
      gate: g({ era: GLS, minWeek: 4 }),
      text: "Travis Lee has circled an ad in the Southwest Bugle: '1987 Prairie Titan half-ton. Runs (mostly). Standard. $900 OBO. Honest " +
        "Gus, Gull Lake.' He has $340 and a heart full of songs. He does not know what 'standard' means.",
      choices: [
        { label: 'The band chips in ($150)', hint: 'Travis ↑↑ · the band buys a truck', effects: { fund: -150, mood: { travis: 12 }, flags: { truckPlan: 'band' }, chain: NEXT('truck', 2, 2) },
          outcome: 'Duke puts in twenty and his hat. Earl puts in fifty and a story. Clementine puts in eighty and says it is "for the song". Deal.' },
        { label: 'Let him buy it alone', hint: 'Travis ↑ · Chemistry ↓', effects: { mood: { travis: 6 }, chemistry: -2, flags: { truckPlan: 'alone' }, chain: NEXT('truck', 2, 2) },
          outcome: "Travis Lee sells his parking stall back in Regina to a dentist. He drives to Gull Lake in Earl's car. Earl drives. Slowly." },
        { label: "Travis. You can't drive stick.", hint: 'Travis ↓↓', effects: { mood: { travis: -10, earl: 3 }, flags: truck('never'), chain: END('truck') },
          outcome: 'Travis Lee folds the Bugle very small and writes a song about the truck he almost had. It is his best one. That hurts more.' }
      ] },
    { id: 'grr_truck_2_gus', type: 'scene', speaker: 'grr_gus', title: "Honest Gus's Lot", chain: 'truck', step: 2,
      gate: g({ era: GLS, flagEquals: { truckPlan: 'band' } }),
      text: "Honest Gus's Used Trucks & Bait, Gull Lake. The '87 is rust-red, or red with rust. 'Ran when parked,' says Gus. 'When was it parked?' " +
        "asks Clementine. Gus looks at the sky for a long time. Travis Lee is already hugging the hood.",
      choices: [
        { label: 'Pay the full $900', hint: 'Travis ↑ · the truck is his', effects: { mood: { travis: 8 }, chemistry: 3, chain: NEXT('truck', 3, 2) },
          outcome: 'Gus throws in a tub of worms "for luck". Travis Lee names the truck Loretta. The worms ride home on the dash.' },
        { label: 'Let Earl haggle', hint: 'Gamble: Earl knew a guy',
          outcome: "Earl leans on the fender. 'I sold a truck just like this in 1979.'",
          roll: { chance: 0.55, stat: 'chemistry', statScale: 0.005,
            success: { effects: { buzz: 3, mood: { earl: 6 }, chain: NEXT('truck', 3, 2) }, outcome: 'Forty minutes later Gus knocks off $200 to make the story stop. Earl calls it a win for storytelling.' },
            fail: { effects: { burnout: 4, chain: NEXT('truck', 3, 2) }, outcome: 'Gus has a longer story. It is about 1978. Nobody wins. You pay full price at dusk.' } } },
        { label: 'Check under the hood first', hint: 'Duke ↑ · Burnout ↑', effects: { mood: { duke: 5 }, burnout: 3, chain: NEXT('truck', 3, 2) },
          outcome: 'Duke looks under the hood for ten minutes and says "yep". He does not know trucks. He knows how to look like he does. It is the hat.' }
      ] },
    { id: 'grr_truck_2_alone', type: 'drama', speaker: 'travis', title: 'Stuck in First', chain: 'truck', step: 2,
      gate: g({ era: GLS, flagEquals: { truckPlan: 'alone' } }),
      text: "The '87 is in the Quonset yard. Travis Lee got it home from Gull Lake in first gear, at eleven kilometres an hour, for three hours. " +
        "A combine passed him. Twice. He is sitting in it now, holding the gearshift like a hand.",
      choices: [
        { label: 'Sit with him a while', hint: 'Chemistry ↑ · Travis ↑', effects: { chemistry: 4, mood: { travis: 6 }, chain: NEXT('truck', 3, 2) },
          outcome: 'You sit in the cab with him until sundown. He plays you the truck song on the acoustic. It is better now that the truck is real.' },
        { label: 'Call Earl', hint: 'Earl ↑', effects: { mood: { earl: 8 }, chain: NEXT('truck', 3, 2) },
          outcome: "Earl arrives in nine minutes, which for Earl is a sprint. He looks at the truck. He looks at Travis. 'Tomorrow. Six a.m. Grid road.'" },
        { label: 'Put a bow on it anyway', hint: 'Buzz ↑ · Travis ↑', effects: { buzz: 4, mood: { travis: 5 }, chain: NEXT('truck', 3, 2) },
          outcome: 'Clementine ties a bow of baler twine on the hood. The photo gets two hundred likes. The truck is still in first gear.' }
      ] },
    { id: 'grr_truck_3_stick', type: 'drama', speaker: 'earl', title: 'Earl Teaches Stick', chain: 'truck', step: 3,
      gate: g({ era: GLS, flags: ['truckPlan'] }),
      text: "Six a.m. on the grid road. Earl in the passenger seat with a thermos, Travis Lee at the wheel, the rest of you on the tailgate. " +
        "'Clutch in. Easy. In 1979 I taught a man to drive stick on the way to the session. He cried. Clutch IN, son.'",
      choices: [
        { label: "Earl's way: a story per gear", hint: 'Gamble: patience vs. Travis',
          outcome: 'First gear is a story about Medicine Hat. Second gear is a story about a bus.',
          roll: { chance: 0.6, stat: 'chemistry', statScale: 0.005,
            success: { effects: { chemistry: 5, mood: { travis: 8, earl: 6 }, flags: { truckDrive: 'smooth' }, chain: NEXT('truck', 4, 2) },
              outcome: 'By fourth gear Travis Lee is driving. By the fifth story he is crying. The truck does not stall once. Earl pretends not to be proud.' },
            fail: { effects: { burnout: 5, mood: { travis: -5 }, flags: { truckDrive: 'stalled' }, chain: NEXT('truck', 4, 2) },
              outcome: 'He stalls it forty-one times. Earl counts out loud. A farmer stops to watch. The farmer is Wilf. Coffee row will know by 6:40.' } } },
        { label: 'Clementine takes over', hint: 'Clementine ↑ · Earl ↓', effects: { mood: { clementine: 6, earl: -4 }, flags: { truckDrive: 'smooth' }, chain: NEXT('truck', 4, 2) },
          outcome: "Clementine drove a stick Volvo through four Montreal winters. She teaches it like a scale: slow, then correct, then faster. Travis gets it." },
        { label: 'The auction-mart hill', hint: 'Gamble: the steepest hill in town',
          outcome: 'The hill behind the auction mart. Loretta at the bottom. Earl crossing himself.',
          roll: { chance: 0.45,
            success: { effects: { buzz: 6, mood: { travis: 10 }, flags: { truckDrive: 'smooth' }, chain: NEXT('truck', 4, 2) },
              outcome: 'Up the hill, no roll-back, into second at the top. Lloyd the auctioneer calls it like a sale: "SOLD, to the condo kid!"' },
            fail: { effects: { burnout: 6, flags: { truckDrive: 'stalled' }, chain: NEXT('truck', 4, 2) },
              outcome: 'Loretta rolls back down the hill, slowly, into a pen of very calm heifers. Lloyd sells a heifer mid-rescue.' } } }
      ] },
    { id: 'grr_truck_4_sheldon', type: 'money', speaker: 'bb_sheldon', title: 'Prairie Titan Calls', chain: 'truck', step: 4,
      gate: g({ era: GLS, flags: ['truckDrive'] }),
      text: "A video of Travis Lee and Loretta went around. Sheldon from Prairie Titan Trucks calls: a 'heritage' ad, the '87 next to a new one, " +
        "your song on top. Buckle & Boot have done every Prairie Titan ad for nine years. Sheldon says 'they will be fine'.",
      choices: [
        { label: "Say yes", hint: 'Buzz ↑ · Buckle & Boot will hear', effects: { buzz: 6, fund: 100, flags: { truckAd: 'yes' }, chain: NEXT('truck', 5, 2) },
          outcome: 'Sheldon chews his toothpick in approval. Somewhere in Red Deer, Brayden gets a text. He reads it in the penalty box of his heart.' },
        { label: 'Only if Loretta is the star', hint: 'Gamble: Sheldon has a brand book',
          outcome: 'Travis Lee says the old truck gets top billing or nothing.',
          roll: { chance: 0.5,
            success: { effects: { buzz: 10, mood: { travis: 8 }, flags: { truckAd: 'star' }, chain: NEXT('truck', 5, 2) },
              outcome: "Sheldon says 'that is so authentic it hurts'. Loretta gets a trailer on set. Buckle & Boot find out on Speedy Creek 97." },
            fail: { effects: { buzz: 4, flags: { truckAd: 'yes' }, chain: NEXT('truck', 5, 2) },
              outcome: "Sheldon agrees to 'co-star'. Loretta gets a folding chair. The new truck gets a trailer. Travis Lee takes it personally." } } },
        { label: "Loretta's not for sale", hint: 'Travis ↑ · Chemistry ↑', effects: { mood: { travis: 8 }, chemistry: 3, flags: { truckAd: 'no' }, chain: NEXT('truck', 5, 2) },
          outcome: "Sheldon says 'noted' and hangs up. You hear him dial Red Deer before the line goes dead." }
      ] },
    { id: 'grr_truck_5_standoff', type: 'drama', speaker: 'bb_brayden', title: 'Tailgates at Dawn', chain: 'truck', step: 5,
      gate: g({ era: GLS, flags: ['truckAd'], notFlags: ['truckWar'], flagEquals: { truckAd: 'yes' } }),
      text: "Buckle & Boot's crew cab is at the Quonset gate at dawn. Brayden, Colt and Titan Tim in full costume. 'That's our ad, bud.' " +
        "Biscuit the heeler is barking at Tim. Uncle Vern is on the porch with coffee, very interested.",
      choices: [
        { label: 'A truck pull, like adults', hint: 'Gamble: Loretta vs. a new crew cab',
          outcome: 'A chain between the tow hitches in the stubble field. Earl drives Loretta, twenty under.',
          roll: { chance: 0.4, stat: 'chemistry', statScale: 0.005,
            success: { effects: { buzz: 10, fans: 20, flags: { truckWar: 'won' }, chain: NEXT('truck', 6, 2) },
              outcome: "Loretta digs in and drags the crew cab two metres. Titan Tim falls over. Vern spills his coffee. Legend." },
            fail: { effects: { burnout: 6, mood: { travis: -6 }, flags: { truckWar: 'lost' }, chain: NEXT('truck', 6, 2) },
              outcome: "The crew cab drags Loretta across the field and through a slough. Brayden says 'no hard feelings'. There are hard feelings." } } },
        { label: 'Coffee on the tailgate', hint: 'Chemistry ↑ · a truce', effects: { chemistry: 4, mood: { duke: 5 }, flags: { truckWar: 'truce' }, chain: NEXT('truck', 6, 2) },
          outcome: "Duke pours coffee for everyone, including Tim, who drinks through the grille. Colt admits he can't play. Everyone knew." },
        { label: 'Let Biscuit handle it', hint: 'Buzz ↑ · Vern ↑', effects: { buzz: 6, burnout: 3, flags: { truckWar: 'won' }, chain: NEXT('truck', 6, 2) },
          outcome: 'Biscuit herds Titan Tim back into the crew cab like a steer. Vern gives Biscuit a whole sausage. Buckle & Boot leave in reverse.' }
      ] },
    { id: 'grr_truck_5_star', type: 'drama', speaker: 'bb_colt', title: 'Colt Comes Alone', chain: 'truck', step: 5,
      gate: g({ era: GLS, notFlags: ['truckWar'], flagEquals: { truckAd: 'star' } }),
      text: "Colt from Buckle & Boot shows up at the Quonset alone, on foot, carrying his guitar. It has never been plugged in. 'Brayden's real " +
        "mad about the ad,' he says. 'Can Earl show me a G chord? Don't tell Brayden.'",
      choices: [
        { label: 'Earl teaches him a G', hint: 'Earl ↑ · a truce', effects: { mood: { earl: 8 }, chemistry: 3, flags: { truckWar: 'truce' }, chain: NEXT('truck', 6, 2) },
          outcome: 'Earl plugs Colt in for the first time. The G is loud. Colt jumps a foot. Then he plays it again. Then he cries. Duke hugs him.' },
        { label: 'Send him home', hint: 'Buzz ↑ · Travis ↑', effects: { buzz: 5, mood: { travis: 4 }, flags: { truckWar: 'won' }, chain: NEXT('truck', 6, 2) },
          outcome: "Travis Lee drives Colt back to the highway in Loretta, in fourth gear, no stalls. Colt says 'nice truck' very quietly." },
        { label: 'Film it for Bandbook', hint: 'Gamble: content or a feud',
          outcome: 'Duke holds up his phone. Colt sees it.',
          roll: { chance: 0.5,
            success: { effects: { buzz: 10, fans: 15, flags: { truckWar: 'won' }, chain: NEXT('truck', 6, 2) }, outcome: '"Buckle & Boot guitarist learns guitar" is the clip of the month. Colt shares it. Brayden does not.' },
            fail: { effects: { burnout: 4, mood: { clementine: -5 }, flags: { truckWar: 'lost' }, chain: NEXT('truck', 6, 2) }, outcome: 'Colt runs. Brayden posts that the Ramblers "ambushed a cousin". Clementine is ashamed of all of you.' } } }
      ] },
    { id: 'grr_truck_5_bb_ad', type: 'drama', speaker: 'grr_vern', title: 'They Filmed It Here', chain: 'truck', step: 5,
      gate: g({ era: GLS, notFlags: ['truckWar'], flagEquals: { truckAd: 'no' } }),
      text: "Uncle Vern, from the porch: Prairie Titan gave the ad to Buckle & Boot, and they filmed it in HIS canola, behind YOUR Quonset. " +
        "Titan Tim is in the shot. So is Loretta, in the background, as 'the old way'. Travis Lee has gone very quiet.",
      choices: [
        { label: 'Write a better truck song', hint: 'Travis ↑ · Buzz ↑', effects: { mood: { travis: 8 }, buzz: 5, flags: { truckWar: 'spite', truckAd: false }, chain: NEXT('truck', 6, 2) },
          outcome: "'The Old Way' is about Loretta and it is devastating. Dolores plays it on Speedy Creek 97 right after their ad. Twice." },
        { label: 'Send Vern an invoice', hint: 'Gamble: Vern vs. a truck company',
          outcome: 'Vern writes "canola, trampled: $1,200" on a feed-store receipt.',
          roll: { chance: 0.5,
            success: { effects: { fund: 150, buzz: 4, flags: { truckWar: 'spite', truckAd: false }, chain: NEXT('truck', 6, 2) }, outcome: "Prairie Titan pays. Vern splits it with the band 'for the emotional damages to the truck'." },
            fail: { effects: { burnout: 4, flags: { truckWar: 'spite', truckAd: false }, chain: NEXT('truck', 6, 2) }, outcome: 'Sheldon sends a floor mat. Vern puts it in the pig barn. The pigs refuse it.' } } },
        { label: 'Let it go', hint: 'Chemistry ↑', effects: { chemistry: 4, mood: { travis: -4 }, flags: { truckWar: 'truce', truckAd: false }, chain: NEXT('truck', 6, 2) },
          outcome: "Earl says the ad will be forgotten by harvest, and the truck won't. It sounds wise. It is also true. Travis nods." }
      ] },
    { id: 'grr_truck_6_shoot', type: 'fame', speaker: 'travis', title: 'Built Grid Road Tough', chain: 'truck', step: 6,
      gate: g({ era: GLS, flags: ['truckWar', 'truckAd'], notFlags: ['truckStory'] }),
      text: "Shoot day. Two trucks, a coulee, a drone and a man named Sheldon with a toothpick. The new truck jumps the coulee. Then it is " +
        "Loretta's turn to drive slowly toward the sunset. She stalls. Travis Lee restarts her on camera, in one take.",
      choices: [
        { label: 'Keep the stall in', hint: 'Buzz ↑ · Travis ↑', effects: { buzz: 10, mood: { travis: 10 }, flags: truck('famous'), chain: END('truck') },
          outcome: "The ad runs during the hockey game with the stall in it. It is the most-talked-about truck ad in the province. Brayden writes a song about it." },
        { label: 'Take the fee and run', hint: '+$200 · Chemistry ↑', effects: { fund: 200, chemistry: 3, flags: truck('ad'), chain: END('truck') },
          outcome: 'The cheque buys a new clutch for Loretta and a round at the Legion. Earl gives a toast. It is about 1979.' },
        { label: 'Put the band in the box', hint: 'Fans ↑ · Burnout ↑', effects: { fans: 20, burnout: 5, flags: truck('ad'), chain: END('truck') },
          outcome: "The whole band rides in the truck box through the sunset shot. Duke's hat blows off. A second drone chases it. The hat is fine." }
      ] },
    { id: 'grr_truck_6_home', type: 'drama', speaker: 'travis', title: 'The Drive Home', chain: 'truck', step: 6,
      gate: g({ era: GLS, flags: ['truckWar'], notFlags: ['truckAd', 'truckStory'] }),
      text: "Travis Lee wants to drive Loretta to Regina, to his parents' condo, to show them. Three hours, all highway, no Earl. " +
        "'I'll be fine,' he says. He has a thermos, a map and a song he has not finished.",
      choices: [
        { label: 'Let him go alone', hint: 'Gamble: three hours of stick',
          outcome: 'Loretta pulls onto the Trans-Canada in second gear, then third.',
          roll: { chance: 0.6, stat: 'chemistry', statScale: 0.005,
            success: { effects: { mood: { travis: 12 }, chemistry: 3, flags: truck('mine'), chain: END('truck') },
              outcome: 'He parks in visitor parking. His mom cries. His dad asks where the power windows are. Travis Lee finishes the song in the lot.' },
            fail: { effects: { burnout: 5, mood: { travis: -4 }, flags: truck('mine'), chain: END('truck') },
              outcome: "Loretta dies in Chaplin. Earl comes to get him, twenty under. They get home at midnight. Travis calls it 'the best day'." } } },
        { label: 'Everyone goes', hint: 'Chemistry ↑ · Burnout ↑', effects: { chemistry: 5, burnout: 4, flags: truck('mine'), chain: END('truck') },
          outcome: "Five people in a two-seat cab. Clementine sits on Duke. Duke's hat rides in the box, belted in. His parents make cabbage rolls." },
        { label: 'Put Loretta in the Quonset', hint: 'Travis ↓ · Duke ↑', effects: { mood: { travis: -5, duke: 4 }, flags: truck('mine'), chain: END('truck') },
          outcome: 'Loretta gets a tarp and a spot by the hay bales. Travis Lee visits her every rehearsal. He says goodnight to her. Out loud.' }
      ] },

    // ---- Q3: the Australian country circuit (chain 'outback', Signed era; the World payoff: au_country_circuit) ----------
    { id: 'grr_outback_1_call', type: 'weird', speaker: 'grr_dolores', title: 'Utes Down Under', chain: 'outback', step: 1, weight: 2,
      gate: g({ era: S, flags: ['truckStory'] }),
      text: "Dolores from Speedy Creek 97, very excited: the truck song is number one on Australian country radio. Australians call trucks 'utes' " +
        "and love songs about them. A festival in a town called Tumbleworth wants the Ramblers. Clementine asks where Tumbleworth is. Nobody knows.",
      choices: [
        { label: 'Mail them a box of hats', hint: '−$120 · Duke ↑ · Buzz ↑', effects: { fund: -120, buzz: 6, mood: { duke: 6 }, flags: { outbackPlan: 'hats' }, chain: NEXT('outback', 2, 3) },
          outcome: "Forty hats go to Tumbleworth. Customs opens the box, tries on a hat and waves the rest through. Duke's hat approves." },
        { label: 'Record an Aussie version', hint: 'Travis ↑ · Chemistry ↑', effects: { mood: { travis: 8 }, chemistry: 3, flags: { outbackPlan: 'ute' }, chain: NEXT('outback', 2, 3) },
          outcome: "Travis Lee changes 'truck' to 'ute' in every line. It scans better. He is shaken. He has learned something about himself." },
        { label: "It's too far", hint: 'Travis ↓', effects: { mood: { travis: -6 }, flags: outback('no'), chain: END('outback') },
          outcome: 'You leave the email unanswered. In Tumbleworth they play the song anyway, louder, out of spite. Very country of them.' }
      ] },
    { id: 'grr_outback_2_earl', type: 'scene', speaker: 'earl', title: 'Earl Played Tumbleworth', chain: 'outback', step: 2,
      gate: g({ era: S, flags: ['outbackPlan'] }),
      text: "Earl says he played Tumbleworth in 1979, backing a yodeller named Slim Tumbleweed. Then the promoter calls: Shazza, who remembers " +
        "Earl. 'He drove the tour bus at forty k's for three weeks. Legend.' She wants the Ramblers on the main stage in January.",
      choices: [
        { label: 'Tell Shazza yes', hint: 'Buzz ↑ · Earl ↑', effects: { buzz: 8, mood: { earl: 8 }, flags: { outbackCall: 'main' }, chain: NEXT('outback', 3, 2) },
          outcome: "Shazza says 'too easy' and hangs up. Earl starts packing. It is October. He is packing for January." },
        { label: 'Ask for the Golden Banjo slot', hint: 'Gamble: the big one',
          outcome: 'Clementine takes the phone and negotiates in a very calm voice.',
          roll: { chance: 0.35,
            success: { effects: { buzz: 12, flags: { outbackCall: 'banjo' }, chain: NEXT('outback', 3, 2) }, outcome: "Shazza is silent for nine seconds. 'The awards night. Headline. Don't tell the yodeller.'" },
            fail: { effects: { mood: { clementine: -4 }, flags: { outbackCall: 'main' }, chain: NEXT('outback', 3, 2) }, outcome: "'Nah.' Shazza calls back. 'Main stage, Sunday arvo. Take it.' You take it." } } },
        { label: "We can't afford Australia", hint: 'Everyone ↓', effects: { mood: { all: -4 }, flags: outback('no'), chain: END('outback') },
          outcome: "Shazza says 'no worries' in a tone that means some worries. Earl unpacks. It takes him until spring." }
      ] },
    { id: 'grr_outback_3_titan', type: 'money', speaker: 'bb_sheldon', title: 'Sheldon Wants the Slot', chain: 'outback', step: 3,
      gate: g({ era: S, flags: ['outbackCall'] }),
      text: "Sheldon from Prairie Titan has heard about Tumbleworth. He wants to buy the Ramblers' slot for Buckle & Boot, who 'deserve " +
        "an international market': $1,200 and a floor mat. Brayden is already practising the word 'ute'.",
      choices: [
        { label: 'No. The utes are ours.', hint: 'Chemistry ↑ · Buzz ↑ · Tumbleworth on', effects: { chemistry: 6, buzz: 8, flags: outback('tumbleworth'), chain: END('outback') },
          outcome: "Sheldon says 'noted'. In Tumbleworth they hear you said no. They play the song louder. The circuit is on." },
        { label: 'Sell the slot ($1,200)', hint: '+$1,200 · Tumbleworth will hear', effects: { fund: 1200, mood: { travis: -8 }, flags: outback('sold'), chain: END('outback') },
          outcome: "Buckle & Boot play Tumbleworth. Titan Tim melts in the heat. Shazza emails one word: 'Mate.' It is not a compliment." },
        { label: 'Send Titan Tim instead', hint: 'Gamble: a mascot abroad',
          outcome: 'Duke suggests sending the mascot as an opening act.',
          roll: { chance: 0.5,
            success: { effects: { fans: 150, buzz: 10, flags: outback('tumbleworth'), chain: END('outback') }, outcome: 'Sheldon, confused, agrees. Titan Tim opens for you in Tumbleworth. Australia loves him. The circuit is on.' },
            fail: { effects: { buzz: 5, flags: outback('tumbleworth'), chain: END('outback') }, outcome: 'Sheldon hangs up. You keep the slot. Tim sends a postcard anyway. It is a drawing of a ute.' } } }
      ] },

    // ---- The garage era: the Quonset (early cards, maxWeek) ------------------------------------------------------------
    { id: 'grr_vern_rent', type: 'scene', speaker: 'grr_vern', title: 'Rent Is Field Work', gate: g({ maxWeek: 12 }),
      text: "Uncle Vern leans in the Quonset door. The rent is due. The rent is not money. The rent is picking rocks off the south quarter " +
        "before seeding. 'Bring the drummer,' he says. 'Drummers are good at lifting.'",
      choices: [
        { label: 'Pick the rocks', hint: 'Burnout ↑ · Chemistry ↑', effects: { burnout: 6, chemistry: 4 },
          outcome: 'Six hours, four hundred rocks, one very large one Duke names Gordie. Vern gives you all sandwiches. It is the best rehearsal all month.' },
        { label: 'Pay $40 instead', hint: '−$40 · Vern ↑', effects: { fund: -40, mood: { duke: 4 } },
          outcome: "Vern takes the forty, looks at it, and says 'huh'. He uses it to hire a teenager to pick the rocks. Everyone wins." },
        { label: 'Play Vern a song', hint: 'Gamble: Vern is a tough room',
          outcome: 'Travis Lee tunes up in the yard. Vern leans on the fence.',
          roll: { chance: 0.5,
            success: { effects: { mood: { travis: 6 }, fans: 3 }, outcome: "Vern listens to the whole thing and says 'that'll do'. It is the highest praise in Saskatchewan. Rent waived." },
            fail: { effects: { burnout: 5 }, outcome: "Vern says 'that's nice' and hands Travis a rock bucket. The rocks are still there. So is Vern." } } }
      ] },
    { id: 'grr_hay_throne', type: 'weird', speaker: 'duke', title: 'The Hay Bale Throne', seat: ['drums'], gate: g({ maxWeek: 10 }),
      text: "Your drum throne is a square bale. It is itchy. It sheds. It is slowly getting shorter because Vern's horse, Doris, comes in " +
        "through the side door and eats it during rehearsal. Duke says the bale 'has character'.",
      choices: [
        { label: 'Build a Doris-proof fence', hint: 'Burnout ↑ · Skill ↑', effects: { burnout: 4, drumSkill: 1 },
          outcome: 'A fence of pallets around the kit. Doris watches you from over it for the whole set, chewing. You play better with an audience.' },
        { label: 'Feed Doris first', hint: '−$15 · Chemistry ↑', effects: { fund: -15, chemistry: 3 },
          outcome: 'A flake of hay by the door before every rehearsal. Doris eats it and leaves. The throne survives. Doris becomes a fan.' },
        { label: 'Swap for a new bale weekly', hint: 'Duke ↑', effects: { mood: { duke: 6 } },
          outcome: 'Duke brings a fresh bale every Monday and ceremonially retires the old one to Doris. It is his favourite part of the week.' }
      ] },
    { id: 'grr_clem_bach', type: 'drama', speaker: 'clementine', title: 'Bach in the Case', gate: g({ minWeek: 2, maxWeek: 14 }),
      text: "Duke opened the wrong case and found sheet music: Bach's Partita No. 2, heavily annotated, in Clementine's handwriting. Clementine " +
        "says it is 'for emergencies'. She is looking at it the way people look at an ex.",
      choices: [
        { label: 'Ask her to play it', hint: 'Gamble: she might',
          outcome: 'The Quonset goes quiet. Even the wind stops.',
          roll: { chance: 0.4, stat: 'chemistry', statScale: 0.005,
            success: { effects: { chemistry: 6, skill: { clementine: 1 } }, outcome: 'She plays the Chaconne on the tailgate at sunset. Earl takes off his glasses. Doris the horse lies down.' },
            fail: { effects: { mood: { clementine: -8 } }, outcome: "She snaps the case shut. 'There is no Bach. There was never Bach.' She plays a hoedown so angry it tunes Duke's bass." } } },
        { label: 'Put it back. Say nothing.', hint: 'Clementine ↑', effects: { mood: { clementine: 6 } },
          outcome: 'The next morning there is a coffee on your hay bale. It has a note: "Merci." Nobody mentions it again.' },
        { label: 'Put a fiddle break in', hint: 'Clementine ↑ · Buzz ↑', effects: { mood: { clementine: 4 }, buzz: 3 },
          outcome: "A fiddle break in the new song. She plays it bored. On the last bar there's four notes of Bach in it. Nobody notices but you." }
      ] },
    { id: 'grr_earl_original', type: 'weird', speaker: 'earl', title: 'He Played on the Original', gate: g({ maxWeek: 12 }),
      text: "Travis Lee plays a new song. Earl stops him four bars in: 'I played on the original.' It is a new song. Travis wrote it last night. " +
        "Earl is already telling the story of the original. It was recorded in 1974. In Estevan. In a barn.",
      choices: [
        { label: 'Hear him out', hint: 'Earl ↑ · Burnout ↑', effects: { mood: { earl: 10 }, burnout: 4 },
          outcome: 'The story takes an hour and has a key change. By the end Travis is not sure he wrote his own song. Earl is very happy.' },
        { label: 'Put the story in the song', hint: 'Chemistry ↑ · Buzz ↑', effects: { chemistry: 4, buzz: 3 },
          outcome: 'The bridge is now Earl, spoken, about Estevan. It is the best part. The song now has an original. Everyone is happy.' },
        { label: 'Earl. It was written last night.', hint: 'Earl ↓ · Travis ↑', effects: { mood: { earl: -6, travis: 5 } },
          outcome: "Earl nods slowly. 'Then I'll play on the original now.' He does. The solo is perfect. He never mentions it again." }
      ] },
    { id: 'grr_first_poster', type: 'money', speaker: 'duke', title: "The Hat on the Poster", gate: g({ maxWeek: 10 }),
      text: "The poster for the first show is ready. Duke's hat takes up two thirds of it. The band's name is in the brim. Travis Lee is a " +
        "small figure under the hat. The printer at the Co-op says four hundred copies is $40.",
      choices: [
        { label: 'Print all 400 ($40)', hint: '−$40 · Buzz ↑', effects: { fund: -40, buzz: 5 },
          outcome: 'The hat goes up on every bulletin board from Swift Current to Maple Creek. People come to see the hat. They stay for the band.' },
        { label: 'Shrink the hat', hint: 'Duke ↓ · Travis ↑', effects: { mood: { duke: -5, travis: 5 } },
          outcome: 'The hat is now only half the poster. Duke says it is "a crime against the hat". Travis Lee is visible. Six people come.' },
        { label: 'Hand-letter them all', hint: 'Burnout ↑ · Chemistry ↑', effects: { burnout: 5, chemistry: 4 },
          outcome: 'Five people, four nights, four hundred posters. Clementine letters hers in calligraphy. Earl signs his "E.N.P., 1979".' }
      ] },
    { id: 'grr_coffee_row', type: 'scene', speaker: 'grr_wilf', title: 'Coffee Row', gate: g({ maxWeek: 14 }),
      text: "6:40 a.m. at the Co-op. Coffee row is seven farmers, one table and forty years of opinions. Wilf has invited the band to 'present'. " +
        "The farmers want to know if you are 'the Quonset kids' and if the fiddle is 'the good kind'.",
      choices: [
        { label: 'Play one song, quietly', hint: 'Fans ↑ · Clementine ↑', effects: { fans: 8, mood: { clementine: 4 } },
          outcome: "One song, unplugged, between the coffee urn and the seed display. Wilf wipes his eye. The table votes to 'allow it'." },
        { label: 'Talk about the weather', hint: 'Chemistry ↑ · Burnout ↑', effects: { chemistry: 3, burnout: 3 },
          outcome: 'Two hours on rain, the lack of rain and rain in 1988. Earl wins. The farmers say he is "all right". High praise.' },
        { label: 'Let Duke answer everything', hint: 'Gamble: the hat vs. the row',
          outcome: 'Duke adjusts the hat and leans back.',
          roll: { chance: 0.55,
            success: { effects: { fans: 10, mood: { duke: 6 } }, outcome: 'He says "yep" eleven times and "nope" twice, perfectly timed. The row adopts him. Wilf buys the coffee.' },
            fail: { effects: { burnout: 4 }, outcome: 'Duke falls asleep under the hat. The row finds this reasonable. Nobody learns anything.' } } }
      ] },
    { id: 'grr_earl_suburban', type: 'drama', speaker: 'earl', title: '{van} Needs a Driver', gate: g({ maxWeek: 12 }),
      text: "Earl has decided to drive {van} to every gig. Twenty under the limit. He has a 1987 road atlas and a thermos. He would like to " +
        "stop at every historical marker. There are a lot of historical markers.",
      choices: [
        { label: 'Earl drives. Leave early.', hint: 'Earl ↑ · Burnout ↑', effects: { mood: { earl: 8 }, burnout: 3 },
          outcome: 'You leave for a gig forty minutes away at noon. Earl reads six markers aloud. You arrive at 5:15, informed about wheat.' },
        { label: 'Markers on the way home only', hint: 'Chemistry ↑', effects: { chemistry: 3, mood: { earl: 3 } },
          outcome: 'The drive home becomes a history lesson at 2 a.m. By the third marker the whole band is asleep. Earl reads to the headlights.' },
        { label: 'Hide the atlas', hint: 'Earl ↓', effects: { mood: { earl: -6 } },
          outcome: 'Earl finds it in eleven minutes. He was a session player. He knows every hiding place a band has ever had.' }
      ] },
    { id: 'grr_quonset_echo', type: 'weird', speaker: 'clementine', title: 'The Quonset Reverb', gate: g({ maxWeek: 16 }),
      text: "The Quonset is a steel half-cylinder. Every snare hit comes back four times. Clementine has timed the echo: 0.8 seconds. " +
        "She would like to 'use it'. Travis Lee would like to hear himself sing, once.",
      choices: [
        { label: 'Hang blankets on the walls', hint: '−$30 · Skill ↑', effects: { fund: -30, skill: { all: 1 } },
          outcome: "Vern's old horse blankets on every rib of the Quonset. The echo is gone. The smell of horse is not. You play tighter anyway." },
        { label: 'Play with the echo', hint: 'Clementine ↑ · Your chops ↑', effects: { mood: { clementine: 6 }, drumSkill: 1 },
          outcome: "You play every fill so the echo finishes it. Clementine calls it 'ensemble'. Duke calls it 'the Quonset playing along'." },
        { label: 'Rehearse outside', hint: 'Burnout ↓ · Fans ↑', effects: { burnout: -4, fans: 4 },
          outcome: 'You set up in the yard. Two neighbours stop their trucks on the grid road to listen. One honks at the end. That is a review.' }
      ] },
    { id: 'grr_first_harvest', type: 'money', speaker: 'grr_vern', title: 'All Hands for Harvest', gate: g({ minWeek: 4, maxWeek: 10, weekOfYear: [5, 9] }),
      text: "Harvest. Vern's combine is running and his hired man quit. He needs a truck driver, a lunch runner and 'somebody who can steer'. " +
        "He'll pay. Earl can drive a grain truck. Earl can drive anything, at twenty under the limit.",
      choices: [
        { label: 'Everyone works harvest', hint: '+$180 · Burnout ↑', effects: { fund: 180, burnout: 8 },
          outcome: 'Two weeks of dust, sandwiches and sunsets. Earl drives the grain truck so slowly the combine laps him. $180 for the band.' },
        { label: 'Just Duke and Earl', hint: '+$90 · Duke ↑', effects: { fund: 90, mood: { duke: 5 } },
          outcome: "Duke runs lunches in his hat. Earl hauls grain at 60 on a 100 road. Vern calls it 'fine'. It is fine." },
        { label: 'Play Vern a harvest dance', hint: 'Fans ↑ · Chemistry ↑', effects: { fans: 12, chemistry: 3 },
          outcome: 'Vern throws a harvest supper in the Quonset. The band plays until midnight. The combine gets a round of applause too.' }
      ] },
  ]);
  addCards(cards, [
    // ---- Evergreen: garage through Signed (GLS; garage magnitudes) --------------------------------------------------------
    { id: 'grr_hat_rain', type: 'drama', speaker: 'duke', title: 'The Hat Got Wet', gate: g({ era: GLS, minWeek: 3 }),
      text: "It rained on the way to rehearsal and Duke's hat got wet. Duke will not play until the hat is dry. The hat is drying on the " +
        "Quonset heater. Duke is sitting next to it, watching it, like a man at a hospital bed.",
      choices: [
        { label: 'Wait for the hat', hint: 'Duke ↑ · Burnout ↑', effects: { mood: { duke: 8 }, burnout: 3 },
          outcome: 'Two hours. The hat dries. Duke puts it on and plays the best set of his life. It was the hat. It is always the hat.' },
        { label: 'Lend him a toque', hint: 'Duke ↓ · Skill ↑', effects: { mood: { duke: -6 }, skill: { duke: 1 } },
          outcome: 'Duke plays in a toque, small and diminished, like Samson. He is actually more accurate. He will never admit it.' },
        { label: 'Buy a hat dryer ($35)', hint: '−$35 · Duke ↑↑', effects: { fund: -35, mood: { duke: 12 } },
          outcome: 'A boot dryer from the Co-op, modified by Earl. The hat sits on it like a king. Duke calls it "the throne room".' }
      ] },
    { id: 'grr_auction_milk_can', type: 'weird', speaker: 'travis', title: 'Travis at the Auction', gate: g({ era: GLS, minWeek: 5 }),
      text: "A farm dispersal auction near Gull Lake. Travis Lee came to 'feel the land'. He has bid on a milk can, a horse collar and a box " +
        "of mystery wrenches. He does not know he is bidding. He thinks he is waving hello. Lloyd is very fast.",
      choices: [
        { label: 'Pay for the milk can ($40)', hint: '−$40 · Travis ↑', effects: { fund: -40, mood: { travis: 6 } },
          outcome: 'The milk can becomes a stool in the Quonset. Travis Lee writes a song about it. It has more feeling than a milk can deserves.' },
        { label: 'Sit on his hands', hint: 'Chemistry ↑', effects: { chemistry: 3, burnout: 3 },
          outcome: 'Clementine and Duke sit on either side of him holding his arms down. He sways to the auctioneer like it is a ballad.' },
        { label: 'Ask Lloyd for a job', hint: 'Gamble: auctioneers need rhythm',
          outcome: 'You ask Lloyd if the auction needs a rhythm section.',
          roll: { chance: 0.45,
            success: { effects: { fund: 60, drumSkill: 1, book: 'auction_mart_stage' }, outcome: 'You keep time on a feed pail. Lloyd sells at 150 BPM. Record auction. $60, lunch, and Saturday in his sale ring.' },
            fail: { effects: { burnout: 4 }, outcome: 'Lloyd says the auction has a rhythm and it is Lloyd. You go home with the mystery wrenches.' } } }
      ] },
    { id: 'grr_earl_hearing_aid', type: 'weird', speaker: 'earl', title: 'Earl Is Receiving', gate: g({ era: GLS }),
      text: "Earl's hearing aid is picking up Speedy Creek 97 again. Mid-song. He is soloing along to the grain prices. He says canola " +
        "is up four dollars. He says it with his guitar. It is, honestly, a great solo.",
      choices: [
        { label: 'Let him finish the report', hint: 'Earl ↑ · Buzz ↑', effects: { mood: { earl: 6 }, buzz: 3 },
          outcome: 'The solo ends on the barley price. Duke cheers. Somebody films it. Farmers share it with the caption "finally, useful music".' },
        { label: 'New batteries ($20)', hint: '−$20 · Skill ↑', effects: { fund: -20, skill: { earl: 1 } },
          outcome: 'New batteries. Earl hears everything now. He hears Duke miss a note. He hears it every time. Duke gets better, fast.' },
        { label: 'Tune the band to the station', hint: 'Chemistry ↑ · Burnout ↑', effects: { chemistry: 4, burnout: 3 },
          outcome: 'You rehearse to the Speedy Creek 97 playlist. Every song is in G. The band has never been so tight. Or so in G.' }
      ] },
    { id: 'grr_clem_yeehaw', type: 'drama', speaker: 'clementine', title: 'The Yeehaw on Tape', gate: g({ era: GLS, minWeek: 4 }),
      text: "Duke was recording rehearsal on his phone. At 2:14, on the fiddle break, someone yelled YEEHAW. It was Clementine. She says it " +
        "was 'the Quonset'. The Quonset does not yeehaw. Duke has played it back eleven times.",
      choices: [
        { label: 'Delete it, for her', hint: 'Clementine ↑', effects: { mood: { clementine: 8 } },
          outcome: 'Duke deletes it in front of her. She nods, once. The next rehearsal, on the fiddle break, you hear it again. Quieter.' },
        { label: 'Put it on the record', hint: 'Buzz ↑ · Clementine ↓', effects: { buzz: 6, mood: { clementine: -6 } },
          outcome: 'The yeehaw is the best part of the demo. Clementine refuses to be credited. It is credited to "the Quonset". Fans love the Quonset.' },
        { label: 'Everyone yeehaw, together', hint: 'Chemistry ↑', effects: { chemistry: 5 },
          outcome: 'Five yeehaws on the next break. Clementine rolls her eyes. On the last chorus she does it again, just a little. She is smiling.' }
      ] },
    { id: 'grr_gophers', type: 'weird', speaker: 'duke', title: 'Gophers Under the Kit', gate: g({ era: GLS }),
      text: "The kick drum is sinking. The Quonset floor is dirt under the plywood, and the gophers have been busy. The kick is now four " +
        "centimetres lower than the snare. Duke is on his belly, looking into a hole, making friends.",
      choices: [
        { label: 'Pour a concrete pad ($120)', hint: '−$120 · Skill ↑', effects: { fund: -120, drumSkill: 2 },
          outcome: 'Vern helps you pour a pad. The kit sits level for the first time. The kick has never sounded so solid. The gophers relocate.' },
        { label: 'Play around the tilt', hint: 'Your chops ↑ · Burnout ↑', effects: { drumSkill: 1, burnout: 4 },
          outcome: 'You adapt. You play downhill. At your next gig on a flat stage you overshoot every fill. The crowd thinks it is on purpose.' },
        { label: 'Let Duke negotiate', hint: 'Duke ↑ · Chemistry ↑', effects: { mood: { duke: 6 }, chemistry: 3 },
          outcome: "Duke leaves a peanut butter sandwich at the hole every rehearsal. The digging stops. Duke says it is 'an understanding'." }
      ] },
    { id: 'grr_dolores_live', type: 'fame', speaker: 'grr_dolores', title: 'Live at 6:05 a.m.', gate: g({ era: GLS, minFans: 20 }),
      text: "Dolores from Speedy Creek 97 wants a live song on the morning show: 6:05 a.m., right after the grain prices and before the " +
        "obituaries. 'Nothing sad,' she says. 'The obituaries are sad enough.' Earl is already awake. Earl is always awake.",
      choices: [
        { label: 'The happiest song we have', hint: 'Fans ↑ · Burnout ↑', effects: { fans: 12, burnout: 4 },
          outcome: 'You play the truck song at 6:05. Every farm kitchen from Gull Lake to Herbert has it on. Dolores reads your gig dates twice.' },
        { label: 'Something sad anyway', hint: 'Gamble: a weeper at dawn',
          outcome: "Travis Lee picks the one about his grandfather's hat.",
          roll: { chance: 0.5,
            success: { effects: { fans: 18, buzz: 5 }, outcome: 'The phones light up. Farmers crying into their porridge. Dolores has to go straight to an ad. A classic.' },
            fail: { effects: { buzz: -3, mood: { travis: -5 } }, outcome: 'Dolores plays the obituaries straight after. The whole province has a very bad morning.' } } },
        { label: 'Send Earl alone', hint: 'Earl ↑ · Chemistry ↓', effects: { mood: { earl: 10 }, chemistry: -3 },
          outcome: 'Earl plays one song and tells three stories. Dolores lets him. She was a fan in 1979. They talk until the noon news.' }
      ] },
    { id: 'grr_two_step', type: 'scene', speaker: 'earl', title: 'Two-Step Lessons', gate: g({ era: GLS, minWeek: 6 }),
      text: "The Legion runs a two-step night and wants a band that can play it. Nobody in the band can dance except Earl, who learned in " +
        "1962 and has not stopped. He would like to teach everyone first. In the Quonset. Now.",
      choices: [
        { label: 'Take the lesson', hint: 'Chemistry ↑ · Burnout ↑', effects: { chemistry: 5, burnout: 4 },
          outcome: 'Earl leads Duke. Clementine leads Travis. You keep the beat on a pail. It is chaos, then it is dancing, then it is lovely.' },
        { label: 'Just play the song', hint: 'Your chops ↑', effects: { drumSkill: 1, mood: { earl: -4 } },
          outcome: 'Boom-chick, boom-chick, three hours straight. Your left foot has never been so reliable. Earl dances alone. He is fine.' },
        { label: 'Film the lesson', hint: 'Buzz ↑ · Duke ↓', effects: { buzz: 5, mood: { duke: -4 } },
          outcome: "Duke's two-step, in the hat, is a sensation. He is mortified. The hat is not. The hat has never looked better." }
      ] },
    { id: 'grr_hat_mail', type: 'fame', speaker: 'duke', title: 'The Hat Got a Letter', gate: g({ era: GLS, minFans: 30 }),
      text: "A letter arrives at the Quonset addressed to 'The Hat, c/o the Grid Road Ramblers'. It is from a fan in Shaunavon. She has knit " +
        "the hat a hat. Duke wants to write back. As the hat. He has been drafting it for an hour.",
      choices: [
        { label: 'The hat writes back', hint: 'Duke ↑ · Fans ↑', effects: { mood: { duke: 8 }, fans: 6 },
          outcome: 'Duke writes in capitals, "FROM THE HAT". She frames it. Her whole curling team comes to the next show, in hats.' },
        { label: 'Travis writes back', hint: 'Travis ↑ · Duke ↓', effects: { mood: { travis: 4, duke: -5 } },
          outcome: "Travis Lee writes a lovely letter. The fan writes back asking to hear from the hat. Duke is vindicated. Travis is confused." },
        { label: 'Put the knit hat on the hat', hint: 'Buzz ↑ · Chemistry ↑', effects: { buzz: 4, chemistry: 3 },
          outcome: 'The hat wears its hat to the next gig. It is ridiculous. It is on every phone in the room. The fan cries. Good tears.' }
      ] },
    { id: 'grr_chinook_door', type: 'weird', speaker: 'grr_vern', title: 'The Wind Took the Door', gate: g({ era: GLS, weekOfYear: [11, 20] }),
      text: "A chinook blew through at a hundred kilometres an hour and took the Quonset door with it. Vern found it in the next quarter. " +
        "It is minus five and falling. The kit is covered in straw. Clementine is playing in mittens.",
      choices: [
        { label: 'Help Vern hang it back', hint: 'Burnout ↑ · Chemistry ↑', effects: { burnout: 5, chemistry: 4 },
          outcome: 'Five people, one door, one heeler supervising. It goes back on crooked. It whistles in the wind. The whistle is in A.' },
        { label: 'Rehearse in the wind', hint: 'Gamble: the wind has opinions',
          outcome: 'You play the set with the door open to the prairie.',
          roll: { chance: 0.5,
            success: { effects: { chemistry: 5, skill: { all: 1 } }, outcome: 'The wind carries the fiddle to the highway. A trucker honks along. It is the best rehearsal of the year.' },
            fail: { effects: { burnout: 6 }, outcome: 'The wind carries the setlist to Manitoba. Nobody can feel their hands. You go home at eight.' } } },
        { label: 'Call it a day', hint: 'Burnout ↓', effects: { burnout: -5 },
          outcome: "You go to Vern's kitchen instead. Coffee, pie, a crib board. Vern skunks everybody. The door can wait." }
      ] },
    { id: 'grr_canola_photo', type: 'fame', speaker: 'travis', title: 'The Canola Photo', gate: g({ era: GLS, weekOfYear: [1, 4] }),
      text: "The canola is in bloom and Travis Lee wants the band photo in the middle of it: five people in a sea of yellow, the Quonset in the " +
        "back. The bees are also in the canola. There are a lot of bees. Travis did not know about the bees.",
      choices: [
        { label: 'Take the photo, fast', hint: 'Buzz ↑ · Burnout ↑', effects: { buzz: 6, burnout: 4 },
          outcome: 'Four seconds, one click, everyone runs. The photo is gorgeous. Duke is mid-sprint, holding his hat. It becomes the poster.' },
        { label: 'Ask the beekeeper first', hint: '−$20 · Chemistry ↑', effects: { fund: -20, chemistry: 4 },
          outcome: 'The beekeeper moves the hives for an hour for a jar of honey and a signed setlist. Calm photo. Sweet ending.' },
        { label: 'Use the Quonset instead', hint: 'Travis ↓', effects: { mood: { travis: -4 }, chemistry: 2 },
          outcome: 'The band in front of the Quonset, squinting. It looks like a farm auction flyer. Coffee row loves it. Travis does not.' }
      ] },
    { id: 'grr_fiddle_string', type: 'money', speaker: 'clementine', title: 'No E String in Town', gate: g({ era: GLS }),
      text: "Clementine broke her E string an hour before the gig. The music store in town is closed. The only fiddle for sixty kilometres " +
        "belongs to a 4-H kid named Bailey, who is at the gig, and who worships Clementine. Clementine would rather die.",
      choices: [
        { label: "Ask Bailey, politely", hint: 'Clementine ↓ · Fans ↑', effects: { mood: { clementine: -4 }, fans: 8 },
          outcome: "Bailey hands over the fiddle like a sacred object. Clementine plays it perfectly and gives it back with a bow. Bailey will never be the same." },
        { label: 'Play on three strings', hint: 'Gamble: Clementine is classically trained',
          outcome: "'Fine,' she says. 'Paganini did it.'",
          roll: { chance: 0.55, stat: 'chemistry', statScale: 0.005,
            success: { effects: { buzz: 8, mood: { clementine: 6 } }, outcome: 'Three strings, no mistakes, one very smug fiddler. Earl says he saw that in 1979. He did not.' },
            fail: { effects: { mood: { clementine: -6 }, burnout: 3 }, outcome: 'The high notes are simply gone. She plays the whole set an octave down with great dignity.' } } },
        { label: 'Drive to Medicine Hat ($60)', hint: '−$60 · Burnout ↑', effects: { fund: -60, burnout: 5 },
          outcome: 'Earl drives there and back at twenty under. You start the set ninety minutes late. The crowd waited. The crowd had pie.' }
      ] },
    { id: 'grr_biscuit_herds', type: 'weird', speaker: 'grr_vern', title: 'Biscuit Is Herding Again', gate: g({ era: GLS }),
      text: "Biscuit the heeler has decided the band is cattle. Every time someone steps off their spot, she nips their heels back. Travis " +
        "Lee has been herded into the corner four times. Vern says she is 'just helping'. She is very good at it.",
      choices: [
        { label: 'Stay on your spots', hint: 'Chemistry ↑ · Skill ↑', effects: { chemistry: 3, skill: { all: 1 } },
          outcome: "Nobody moves. The band has never been so focused. Biscuit lies down, satisfied, by the kick drum. She is the band's stage manager now." },
        { label: 'Give Biscuit a job', hint: 'Buzz ↑ · Vern ↑', effects: { buzz: 4 },
          outcome: 'Biscuit herds fans toward the merch table at the next gig. Merch sells out. Vern takes a ten-percent cut in sausages.' },
        { label: 'Rehearse with the door shut', hint: 'Burnout ↑', effects: { burnout: 3 },
          outcome: 'Biscuit sits outside the door and howls on every chorus, perfectly in key. You leave it on the demo.' }
      ] },
    { id: 'grr_small_rodeo_anthem', type: 'fame', speaker: 'travis', title: 'The Anthem at the Rodeo', gate: g({ era: GLS, weekOfYear: [1, 4] }),
      text: "A small-town rodeo needs someone to sing the anthem before the bronc riding. The last guy has laryngitis. Travis Lee has " +
        "never sung the anthem in public. He has also never been this close to a bull. The bull is looking at him.",
      choices: [
        { label: 'Travis sings it straight', hint: 'Fans ↑ · Travis ↑', effects: { fans: 12, mood: { travis: 6 } },
          outcome: 'He nails it. Four hundred people in hats hold them over their hearts. The bull, respectfully, does not move. Fans for life.' },
        { label: 'Harmonies with Clementine', hint: 'Gamble: two voices, one bull',
          outcome: "Clementine takes the harmony. She insists it is 'musically necessary'.",
          roll: { chance: 0.5,
            success: { effects: { fans: 18, chemistry: 4 }, outcome: 'Goosebumps in the grandstand. The rodeo announcer is crying. So is a bronc rider.' },
            fail: { effects: { burnout: 4 }, outcome: 'Travis starts in one key and Clementine in another. They meet in the middle. The bull leaves.' } } },
        { label: 'Earl plays it on guitar', hint: 'Earl ↑', effects: { mood: { earl: 8 } },
          outcome: 'Earl plays it instrumental, slow and twangy. He tells the grandstand he played it for a prime minister once. Nobody checks.' }
      ] },
    { id: 'grr_lloyd_fundraiser', type: 'money', speaker: 'grr_lloyd', title: 'Sold to the Band', gate: g({ era: GLS, minFans: 25 }),
      text: "The rink fundraiser auction. Lloyd has put 'one live performance by the Grid Road Ramblers' up for bid. Nobody asked you. " +
        "The bidding is at $40 between a wedding party and a man who wants you to play his combine's retirement.",
      choices: [
        { label: 'Let the wedding win', hint: '+$60 · Burnout ↑', effects: { fund: 60, burnout: 5 },
          outcome: 'The wedding wins at $120 and splits it with you. The bride requests a Buckle & Boot song. Travis plays it with visible pain.' },
        { label: "Play the combine's retirement", hint: 'Fans ↑ · Chemistry ↑', effects: { fans: 10, chemistry: 4 },
          outcome: 'The combine is parked in a field with a bow on it. You play it a farewell. The farmer cries. The combine is sold Tuesday.' },
        { label: 'Bid on yourselves', hint: 'Gamble: outbid the room',
          outcome: "Duke raises his hat. Lloyd takes it as a bid.",
          roll: { chance: 0.5,
            success: { effects: { buzz: 6, fund: -30 }, outcome: 'You buy yourselves for $70 and play for the whole rink for free. Lloyd calls it "a first".' },
            fail: { effects: { fund: -100, mood: { duke: -4 } }, outcome: "Duke keeps raising the hat. It gets to $140. You own yourselves. You are poorer." } } }
      ] },
    { id: 'grr_earl_capo', type: 'drama', speaker: 'earl', title: "Earl's 1979 Capo", gate: g({ era: GLS }),
      text: "Earl's capo is missing. It is not just a capo. It is 'the capo from the 1979 session'. It is worth more than the Quonset, " +
        "he says. Everyone is searching the hay. Duke is checking his hat. Travis is checking his heart.",
      choices: [
        { label: 'Search all night', hint: 'Earl ↑ · Burnout ↑', effects: { mood: { earl: 10 }, burnout: 5 },
          outcome: "Found at 2 a.m. inside the kick drum. Nobody knows how. Earl holds it up to the light and tells you the story. All of it." },
        { label: 'Buy him a new one ($25)', hint: '−$25 · Earl ↓', effects: { fund: -25, mood: { earl: -5 } },
          outcome: "Earl thanks you, puts the new capo in his case and never uses it. The old one turns up a week later in Doris's feed." },
        { label: 'Check Doris the horse', hint: 'Gamble: horses eat anything',
          outcome: 'Duke leads Doris outside and waits.',
          roll: { chance: 0.4,
            success: { effects: { chemistry: 5, mood: { earl: 6 } }, outcome: 'Doris sneezes. The capo flies out, intact. Earl hugs the horse. The session of 1979 lives on.' },
            fail: { effects: { burnout: 4 }, outcome: 'Doris sneezes. It is just a sneeze. Earl looks at the horse with deep suspicion for a month.' } } }
      ] },
    { id: 'grr_travis_twang', type: 'drama', speaker: 'travis', title: 'Where the Twang Comes From', gate: g({ era: GLS, minWeek: 5 }),
      text: "Clementine has noticed that Travis Lee's twang only appears when he sings. When he talks, he sounds like a Regina condo. She " +
        "asks, politely, where the twang comes from. Travis says 'the heart'. Earl says 'the TV'.",
      choices: [
        { label: 'The twang stays', hint: 'Travis ↑', effects: { mood: { travis: 8 } },
          outcome: "Travis Lee sings the next song twangier than ever. Clementine admits it is 'effective'. Earl says Hank Snow did the same thing." },
        { label: 'Sing it in his real voice', hint: 'Gamble: the condo voice',
          outcome: 'Travis sings the truck song in his own voice for the first time.',
          roll: { chance: 0.5,
            success: { effects: { chemistry: 6, buzz: 4 }, outcome: 'It is plainer, and truer, and it breaks everyone a little. Clementine says nothing. She plays softer.' },
            fail: { effects: { mood: { travis: -6 } }, outcome: 'It sounds like a man reading a condo bylaw. The twang returns by verse two. Nobody mentions it again.' } } },
        { label: 'Drive him to a real farm', hint: 'Burnout ↑ · Travis ↑', effects: { burnout: 4, mood: { travis: 5 } },
          outcome: 'Vern lets him help with chores at dawn. By Friday he smells like a farm and talks like one, a little. The twang has a home.' }
      ] },
    { id: 'grr_fowl_supper', type: 'scene', speaker: 'grr_wilf', title: 'The Fowl Supper', gate: g({ era: GLS, weekOfYear: [5, 9] }),
      text: "The fall fowl supper at the church hall: turkey, three kinds of pie, a line out the door. Wilf is on the committee. He wants " +
        "the band to play 'something gentle' during the second sitting. The first sitting was loud. It was the pie.",
      choices: [
        { label: 'Play for pie', hint: 'Fans ↑ · Burnout ↓', effects: { fans: 10, burnout: -4 },
          outcome: 'Gentle songs, three sittings, unlimited pie. Duke eats six pieces. Coffee row reports the band "ate well and played well".' },
        { label: 'Serve instead', hint: 'Chemistry ↑', effects: { chemistry: 4 },
          outcome: 'You carry plates for four hours. Earl carves. Clementine runs the pie table like an orchestra. Wilf says you are "good kids".' },
        { label: 'A fiddle-only set', hint: 'Clementine ↑ · Buzz ↑', effects: { mood: { clementine: 6 }, buzz: 3 },
          outcome: "Clementine plays waltzes alone by the coffee urn. Three couples dance. One is ninety-one. It is the best night of her 'slumming'." }
      ] },
    { id: 'grr_duke_three_notes', type: 'drama', speaker: 'duke', title: 'Duke Knows Three Notes', gate: g({ era: GLS, minWeek: 3 }),
      text: "Earl has noticed that Duke plays the same three notes in every song. Duke has noticed Earl noticing. Earl offers a lesson. " +
        "Duke would rather adjust his hat. He adjusts his hat. He looks at you for help.",
      choices: [
        { label: 'Take the lesson, Duke', hint: 'Skill ↑ · Duke ↓', effects: { skill: { duke: 2 }, mood: { duke: -4 } },
          outcome: 'Duke learns a fourth note. He uses it once per song, like a treat. The band sounds noticeably less like three notes.' },
        { label: 'Three notes is a style', hint: 'Duke ↑ · Earl ↓', effects: { mood: { duke: 8, earl: -4 } },
          outcome: "You tell Earl it is 'the Swift Current sound'. Earl says he played with a bassist like that in 1979. 'He had a hat too.'" },
        { label: 'Put the notes on the hat', hint: 'Chemistry ↑ · Buzz ↑', effects: { chemistry: 3, buzz: 3 },
          outcome: 'Clementine writes the three notes on tape on the underside of the brim. Duke looks up to read them. It looks like soul.' }
      ] },
    { id: 'grr_mice_amp', type: 'weird', speaker: 'earl', title: 'Mice in the Amp', gate: g({ era: GLS, weekOfYear: [9, 16] }),
      text: "It got cold and the mice moved into Earl's amp. It is a 1974 tube amp. It is warm. The mice love it. Earl says the hum is " +
        "'the tone'. Clementine says the hum is 'a family of eleven'. Earl does not want to evict anyone.",
      choices: [
        { label: 'Evict them, gently', hint: 'Skill ↑ · Earl ↓', effects: { skill: { earl: 1 }, mood: { earl: -4 } },
          outcome: "You move them to a box of straw by the heater. The amp sounds clean again. Earl says it has 'lost something'. It has lost mice." },
        { label: 'Keep the tone', hint: 'Earl ↑ · Buzz ↑', effects: { mood: { earl: 6 }, buzz: 3 },
          outcome: "The hum is on the next recording. Reviewers call it 'lived-in'. It is literally lived in." },
        { label: 'Get a barn cat ($0)', hint: 'Gamble: Vern has several',
          outcome: 'Vern brings a cat named Biscuit.',
          roll: { chance: 0.5,
            success: { effects: { chemistry: 4 }, outcome: 'Biscuit clears the amp in one night and sleeps on it forever after. The tone is now "cat".' },
            fail: { effects: { burnout: 4 }, outcome: 'Biscuit moves into the amp too. The mice and Biscuit reach an agreement. The hum doubles.' } } }
      ] },
    { id: 'grr_lantern_rehearsal', type: 'scene', speaker: 'clementine', title: 'Power Out, Lanterns In', gate: g({ era: GLS }),
      text: "A thunderstorm took out the power on the whole road. The Quonset is dark. Vern has brought two coal-oil lanterns and says " +
        "'the old-timers played by lantern'. Travis Lee has an acoustic. Clementine has a fiddle. The amps are useless.",
      choices: [
        { label: 'Play unplugged', hint: 'Chemistry ↑ · Skill ↑', effects: { chemistry: 5, skill: { all: 1 } },
          outcome: "Acoustic, fiddle, you playing as quietly as you can, Duke humming along. Rain on the steel roof. Nobody wants the power back." },
        { label: 'Tell stories instead', hint: 'Earl ↑ · Burnout ↓', effects: { mood: { earl: 8 }, burnout: -4 },
          outcome: 'Earl tells the 1979 story by lantern. It is different this time. There is a woman in it. Nobody interrupts. Nobody breathes.' },
        { label: 'Drive to town', hint: '−$20 · Burnout ↑', effects: { fund: -20, burnout: 4 },
          outcome: "You drive to the Co-op to 'wait it out'. The Co-op power is also out. You eat cold pizza in the Suburban." }
      ] },
    { id: 'grr_shaunavon_wedding', type: 'money', speaker: 'travis', title: 'The Shaunavon Wedding', gate: g({ era: GLS, minFans: 40 }),
      text: "A wedding in Shaunavon wants the Ramblers. $150. The bride has sent a list of must-play songs. Every song on the list is by " +
        "Buckle & Boot. The first dance is 'Tailgate Down (Heart Up)'. Travis Lee has read the list four times.",
      choices: [
        { label: 'Play the list', hint: '+$150 · Travis ↓', effects: { fund: 150, mood: { travis: -6 } },
          outcome: 'You play every Buckle & Boot song, sincerely, beautifully. The bride weeps. Travis Lee weeps for a different reason.' },
        { label: 'Play our own songs', hint: 'Gamble: the bride has opinions',
          outcome: 'Travis Lee swaps the first dance for the truck song.',
          roll: { chance: 0.5,
            success: { effects: { fund: 150, fans: 15 }, outcome: 'The couple dances to your song and asks for it again. Buckle & Boot are never mentioned. A victory.' },
            fail: { effects: { fund: 60, burnout: 5 }, outcome: 'The bride stops the dance. You play the tailgate song. You get half the fee and a lecture.' } } },
        { label: 'Turn it down', hint: 'Chemistry ↑', effects: { chemistry: 3 },
          outcome: 'You say no. The bride books Buckle & Boot. Titan Tim gets stuck in the hall door during the first dance. You hear about it.' }
      ] },
    { id: 'grr_clem_mother', type: 'drama', speaker: 'clementine', title: 'Maman Calls', gate: g({ era: GLS, minWeek: 8 }),
      text: "Clementine's mother called from Montreal. The symphony has a vacancy in the second violins. 'You could stop,' her mother said, " +
        "'playing hoedowns in a shed.' Clementine is sitting on a hay bale with the phone, very still.",
      choices: [
        { label: 'Tell her we need her', hint: 'Clementine ↑ · Chemistry ↑', effects: { mood: { clementine: 8 }, chemistry: 3 },
          outcome: "Clementine says 'I know' in a flat voice and goes back to her spot. On the next song she plays the fill twice. It is a yes." },
        { label: 'Say it is her choice', hint: 'Clementine ↑', effects: { mood: { clementine: 5 } },
          outcome: 'She calls her mother back and says the shed has better acoustics. It does not. She stays. She does not explain.' },
        { label: 'Let Earl talk to her', hint: 'Gamble: Earl knew a violinist',
          outcome: "Earl sits next to her. 'In 1979...'",
          roll: { chance: 0.55,
            success: { effects: { mood: { clementine: 10, earl: 4 } }, outcome: 'The story is about a violinist who quit the symphony for a honky-tonk and never regretted it. She pretends she did not cry.' },
            fail: { effects: { mood: { clementine: -5 } }, outcome: 'The story is about a violinist who went back to the symphony and was very happy. Earl realizes too late.' } } }
      ] },
    { id: 'grr_songbook_rain', type: 'drama', speaker: 'travis', title: 'The Songbook Got Wet', gate: g({ era: GLS }),
      text: "Travis Lee left his songbook on the truck hood in the rain. Six years of truck songs, most of them written before he had a truck, " +
        "are now a blue blur. He is drying the pages on the Quonset heater one at a time, reading them aloud.",
      choices: [
        { label: 'Help him rewrite them', hint: 'Chemistry ↑ · Burnout ↑', effects: { chemistry: 5, burnout: 4 },
          outcome: 'You rewrite them together from memory. They come back different. Better, mostly. One of them is now about Clementine\'s Volvo.' },
        { label: 'Frame the best page', hint: 'Travis ↑', effects: { mood: { travis: 6 } },
          outcome: 'The one legible page goes on the Quonset wall in a frame from the Co-op. It says "tailgate" and then "no. never."' },
        { label: 'Start a new book', hint: 'Travis ↓ · Skill ↑', effects: { mood: { travis: -4 }, skill: { travis: 1 } },
          outcome: 'A new songbook, waterproof, from the fishing aisle. The first new song is about the old book. It is a good song.' }
      ] },
    { id: 'grr_hat_insurance', type: 'money', speaker: 'duke', title: 'Insure the Hat', gate: g({ era: GLS, minFans: 50 }),
      text: "Duke has been to the insurance office. He would like to insure the hat. The agent asked for its value. Duke said 'yes'. " +
        "The premium is $60 a year. The agent has never insured a hat. The agent is intrigued.",
      choices: [
        { label: 'Insure the hat ($60)', hint: '−$60 · Duke ↑↑', effects: { fund: -60, mood: { duke: 12 }, flags: { hatInsured: true } },
          outcome: 'The policy is framed in the Quonset. The hat is covered for hail, wind, theft and "being sat on (Earl)".' },
        { label: 'The band is the insurance', hint: 'Chemistry ↑ · Duke ↑', effects: { chemistry: 4, mood: { duke: 4 } },
          outcome: 'Everyone swears an oath on the hat to protect it. Clementine refuses, then does it anyway. Duke is moved.' },
        { label: "It's a hat, Duke", hint: 'Duke ↓↓', effects: { mood: { duke: -10 } },
          outcome: 'Duke does not speak for two days. The hat, somehow, also looks offended. It sits on his amp facing away from you.' }
      ] },
    { id: 'grr_line_dance_class', type: 'money', speaker: 'earl', title: 'The Tuesday Line Dancers', gate: g({ era: GLS, minWeek: 6 }),
      text: "The seniors' line-dance class at the Legion is tired of the CD player. They want a live band every Tuesday afternoon. $50 a week. " +
        "They have requests. They have a lot of requests. The instructor, Marg, is eighty-four and has a whistle.",
      choices: [
        { label: 'Take the Tuesday gig', hint: '+$50 · Your chops ↑', effects: { fund: 50, drumSkill: 1 },
          outcome: 'Marg blows the whistle when you drift off the tempo. You never drift again. You are now the tightest player in the southwest.' },
        { label: 'Just one Tuesday', hint: 'Fans ↑', effects: { fans: 8 },
          outcome: "Forty seniors, perfect lines, a boot-scoot so precise it's military. Marg says you 'show promise'. The whole class comes to your next gig." },
        { label: 'Earl goes alone', hint: 'Earl ↑ · Chemistry ↓', effects: { mood: { earl: 8 }, chemistry: -2 },
          outcome: 'Earl plays solo guitar every Tuesday and dances the last song with Marg. He is happier than you have ever seen him.' }
      ] },
    { id: 'grr_elevator_last_day', type: 'scene', speaker: 'grr_wilf', title: "The Elevator's Last Day", gate: g({ era: GLS, minFans: 35 }),
      text: "The old wooden grain elevator in Wilf's town comes down on Saturday. Ninety-one years. The town wants a send-off: a band on " +
        "a hay wagon beside it, one last song before the machines. Wilf asks you quietly. He hauled grain there for fifty years.",
      choices: [
        { label: 'Play the send-off', hint: 'Fans ↑ · Chemistry ↑', effects: { fans: 15, chemistry: 5 },
          outcome: 'You play a slow one on the hay wagon. The whole town sings. When it comes down, Wilf takes off his cap. So does Duke. The hat.' },
        { label: 'Write it a song', hint: 'Travis ↑ · Buzz ↑', effects: { mood: { travis: 8 }, buzz: 5 },
          outcome: "'Ninety-One Years' is written on the Suburban's hood the night before. Dolores plays it every Saturday morning for a year." },
        { label: 'Save a board', hint: 'Duke ↑ · Burnout ↑', effects: { mood: { duke: 6 }, burnout: 3 },
          outcome: 'Duke asks for one board with the town name on it. It hangs over the Quonset door now. Everyone touches it on the way in.' }
      ] },

    // ---- Repeatables (once: false + cooldown): no year runs dry ---------------------------------------------------------
    { id: 'grr_rep_earl_story', type: 'weird', speaker: 'earl', title: 'Earl, Mid-Song', once: false, cooldown: 8, gate: g({ era: GLS }),
      text: "Mid-song, mid-chorus, Earl stops playing and starts talking. 'This reminds me of a session in 1979.' The band keeps going. " +
        "Earl keeps going. They are now two different performances happening in the same Quonset.",
      choices: [
        { label: 'Let him finish', hint: 'Earl ↑ · Burnout ↑', effects: { mood: { earl: 6 }, burnout: 3 },
          outcome: 'The song ends. The story does not. It ends forty minutes later with a punchline about a banjo. It lands.' },
        { label: 'Play the story a backing track', hint: 'Chemistry ↑', effects: { chemistry: 3 },
          outcome: 'You play a soft groove under the story. Travis adds a melody. It becomes a song. It is called "1979". It is nine minutes.' },
        { label: "Earl. The song.", hint: 'Earl ↓ · Skill ↑', effects: { mood: { earl: -4 }, skill: { earl: 1 } },
          outcome: "Earl stops, nods, and plays the part he was supposed to play. It is perfect. 'I'll tell you after,' he says. He does." }
      ] },
    { id: 'grr_rep_hat_wind', type: 'weird', speaker: 'duke', title: 'The Hat Blew Off', once: false, cooldown: 10, gate: g({ era: GLS }),
      text: "An outdoor gig and a prairie gust. Duke's hat is gone: off his head, over the crowd, across the parking lot, into a field. " +
        "Duke has stopped playing. Duke is looking at the field. The song is still going.",
      choices: [
        { label: 'Stop the show. Find the hat.', hint: 'Duke ↑ · Buzz ↑', effects: { mood: { duke: 8 }, buzz: 3 },
          outcome: 'The whole crowd fans out across the field. A kid finds it. The show resumes to the biggest cheer of the night.' },
        { label: 'Keep playing', hint: 'Duke ↓ · Your chops ↑', effects: { mood: { duke: -6 }, drumSkill: 1 },
          outcome: 'You carry the song. Duke plays hatless, small, blinking in the sun. A farmer returns the hat after the show. Duke hugs him.' },
        { label: 'Send Biscuit', hint: 'Gamble: a heeler, a hat, a field',
          outcome: "Vern whistles. Biscuit is off like a shot.",
          roll: { chance: 0.6,
            success: { effects: { buzz: 6, fans: 6 }, outcome: 'Biscuit brings the hat back to the stage in her mouth, gently, during the last chorus. Crowd loses its mind.' },
            fail: { effects: { mood: { duke: -5 } }, outcome: 'Biscuit brings back a different hat. Duke wears it for one song, out of politeness. It is not the same.' } } }
      ] },
    { id: 'grr_rep_cattle_out', type: 'scene', speaker: 'grr_vern', title: 'Cattle on the Grid Road', once: false, cooldown: 10, gate: g({ era: GLS }),
      text: "Vern, at the Quonset door: the cows are out on the grid road again. Forty head. He needs everyone. Now. Rehearsal is cancelled. " +
        "Biscuit is already gone. Duke is putting on his hat, which he describes as 'work boots for the head'.",
      choices: [
        { label: 'Everyone chases cows', hint: 'Chemistry ↑ · Burnout ↑', effects: { chemistry: 4, burnout: 4 },
          outcome: 'Two hours, forty cows, one ditch. Travis Lee turns out to be a natural. He talks to the cows like they are an audience. They listen.' },
        { label: 'Play them back in', hint: 'Gamble: cows like fiddle',
          outcome: 'Clementine stands at the gate and plays a slow air.',
          roll: { chance: 0.5,
            success: { effects: { mood: { clementine: 6 }, buzz: 3 }, outcome: 'The cows walk in single file, calmly, to the fiddle. Vern takes off his cap. He has never seen that.' },
            fail: { effects: { burnout: 4 }, outcome: 'The cows walk toward Clementine, surround her, and stay. Vern has to rescue her. She is not amused.' } } },
        { label: 'Stay and rehearse', hint: 'Skill ↑ · Vern ↓', effects: { skill: { all: 1 }, mood: { duke: -4 } },
          outcome: 'You rehearse. Through the door you can see Vern running past, then a cow, then Vern. Duke keeps looking. The rent goes up.' }
      ] },
    { id: 'grr_rep_coffee_report', type: 'fame', speaker: 'grr_wilf', title: 'Coffee Row Has Notes', once: false, cooldown: 8, gate: g({ era: GLS, minFans: 15 }),
      text: "Wilf reports that coffee row has reviewed your last show. The review took forty minutes and two refills. The verdict: 'a bit loud, " +
        "good fiddle, the hat is a lot'. They would like to know why the drummer 'hits so hard'.",
      choices: [
        { label: 'Take the notes', hint: 'Skill ↑ · Duke ↓', effects: { skill: { all: 1 }, mood: { duke: -3 } },
          outcome: 'You turn down a notch. Clementine is audible. The hat stays exactly as big. Coffee row calls the next show "better, still loud".' },
        { label: 'Invite coffee row to a show', hint: 'Fans ↑ · Burnout ↑', effects: { fans: 8, burnout: 3 },
          outcome: 'Seven farmers in the front row with earplugs from the Co-op. They clap on one and three. They stay to the end. High praise.' },
        { label: 'Play louder, out of love', hint: 'Buzz ↑ · Your chops ↑', effects: { buzz: 3, drumSkill: 1 },
          outcome: 'Wilf reports back: "still loud, but on purpose now". The row respects a decision.' }
      ] },
    { id: 'grr_rep_truck_song', type: 'drama', speaker: 'travis', title: 'Another Truck Song', once: false, cooldown: 9, gate: g({ era: GLS }),
      text: "Travis Lee has written another truck song. It is the ninth this month. This one is about a truck that leaves a man for a better " +
        "man with a better truck. Clementine has asked if the band could write about something else. Anything else.",
      choices: [
        { label: 'Learn the truck song', hint: 'Travis ↑ · Clementine ↓', effects: { mood: { travis: 6, clementine: -4 } },
          outcome: 'It is actually good. The bridge is about the truck, alone, in a field. Clementine plays it perfectly and hates that it works.' },
        { label: 'A song about the fiddle', hint: 'Clementine ↑ · Travis ↓', effects: { mood: { clementine: 6, travis: -4 } },
          outcome: "Travis writes one about the fiddle. The fiddle leaves a man for a better man with a better truck. Clementine sighs. It's fine." },
        { label: 'Co-write something new', hint: 'Chemistry ↑', effects: { chemistry: 4 },
          outcome: 'You all write a song about Doris the horse. It has no trucks in it. Travis sneaks one into the last verse. Doris rides in it.' }
      ] },
    { id: 'grr_rep_clem_dawn', type: 'drama', speaker: 'clementine', title: 'Scales at Five A.M.', once: false, cooldown: 10, gate: g({ era: GLS }),
      text: "Clementine practises scales in the Quonset at five every morning. Classical scales. Three octaves. Vern's rooster has started " +
        "crowing in D minor to match. Duke, asleep in the loft, would like a word. With the rooster, mostly.",
      choices: [
        { label: 'Join her', hint: 'Your chops ↑ · Burnout ↑', effects: { drumSkill: 1, burnout: 4 },
          outcome: 'Five a.m. rudiments with a classical violinist. She counts you in with a glare. You have never been so precise or so tired.' },
        { label: 'Let her be', hint: 'Clementine ↑', effects: { mood: { clementine: 5 } },
          outcome: 'She plays in the dark until sunrise. When you come in at nine the coffee is on and she is playing a hoedown. She will deny both.' },
        { label: 'Earmuffs for Duke ($15)', hint: '−$15 · Duke ↑', effects: { fund: -15, mood: { duke: 5 } },
          outcome: "Duke sleeps through the scales in hunting earmuffs under the hat. The rooster is the only one who suffers." }
      ] },
    { id: 'grr_rep_duke_lunch', type: 'weird', speaker: 'duke', title: "Duke's Lunch", once: false, cooldown: 8, gate: g({ era: GLS }),
      text: "Duke has brought lunch to rehearsal. It is a roast. A whole roast, with potatoes, in a roaster, from his aunt. It is 11 a.m. " +
        "He would like to 'eat first, then rock'. The Quonset smells incredible. Nobody can concentrate.",
      choices: [
        { label: 'Eat first, then rock', hint: 'Burnout ↓ · Chemistry ↑', effects: { burnout: -5, chemistry: 3 },
          outcome: 'Roast beef on hay bales. Everyone naps. Rehearsal starts at three and is excellent. Duke was right.' },
        { label: 'Rock first, then eat', hint: 'Skill ↑ · Duke ↓', effects: { skill: { all: 1 }, mood: { duke: -4 } },
          outcome: 'You play with the smell of roast in the air. Every song gets faster. You finish in record time. The roast is still warm.' },
        { label: 'Invite Vern and Biscuit', hint: 'Chemistry ↑ · Duke ↑', effects: { chemistry: 3, mood: { duke: 4 } },
          outcome: 'Vern brings pickles. Biscuit gets the bone. It is less a rehearsal than a family dinner with a drum kit.' }
      ] },
    { id: 'grr_rep_bb_request', type: 'drama', speaker: 'travis', title: 'Play "Tailgate"', once: false, cooldown: 10, gate: g({ era: GLS, minFans: 20 }),
      text: "At the gig, a guy in a Prairie Titan cap has requested 'Tailgate' by Buckle & Boot four times. Then he wrote it on a napkin. " +
        "Then he wrote it on a twenty. The twenty is on the stage. Travis Lee is looking at the twenty.",
      choices: [
        { label: 'Play it, as a ballad', hint: '+$20 · Buzz ↑', effects: { fund: 20, buzz: 4 },
          outcome: "Travis Lee plays 'Tailgate' slow and sad, with a fiddle. It is devastating. The man cries. Brayden will hear about this." },
        { label: 'Play our truck song', hint: 'Travis ↑', effects: { mood: { travis: 6 } },
          outcome: 'The man listens to the whole thing, arms crossed. At the end he uncrosses them and takes off his cap. A convert.' },
        { label: 'Donate the twenty', hint: 'Chemistry ↑ · Fans ↑', effects: { chemistry: 3, fans: 4 },
          outcome: 'You give the twenty to the rink fund, announced from the stage. The man gets a round of applause. He buys a shirt.' }
      ] },
    { id: 'grr_rep_dust_storm', type: 'weird', speaker: 'clementine', title: 'Dust in Everything', once: false, cooldown: 10, gate: g({ era: GLS, weekOfYear: [1, 6] }),
      text: "A dry spell and a hard wind. The dust got into the Quonset, the amps, the snare wires and Clementine's fiddle case. She opens " +
        "the case and a small dune pours out. She is very calm. That is how you know.",
      choices: [
        { label: 'Clean everything', hint: 'Burnout ↑ · Skill ↑', effects: { burnout: 4, skill: { all: 1 } },
          outcome: 'A whole day with brushes and a shop vac. The gear shines. Clementine polishes her fiddle for two hours. It forgives you.' },
        { label: 'Play dusty', hint: 'Buzz ↑ · Clementine ↓', effects: { buzz: 3, mood: { clementine: -5 } },
          outcome: 'Every snare hit puffs a little cloud. It looks amazing in the photos. The fiddle sounds like sandpaper. She plays it anyway.' },
        { label: 'Seal the Quonset ($60)', hint: '−$60 · Chemistry ↑', effects: { fund: -60, chemistry: 3 },
          outcome: 'Weatherstripping and caulk from the Co-op. The dust stays out. So does the air. Rehearsal is warm and very focused.' }
      ] },
    { id: 'grr_rep_doris_setlist', type: 'weird', speaker: 'duke', title: 'Doris Ate the Setlist', once: false, cooldown: 12, gate: g({ era: GLS }),
      text: "Doris the horse came into the Quonset and ate the setlist off the floor. Also half of Travis Lee's lyric sheet and somebody's " +
        "guitar strap. She is standing by the kit now, chewing, looking at you like she would like to hear the new songs.",
      choices: [
        { label: 'Play the new songs for Doris', hint: 'Chemistry ↑ · Skill ↑', effects: { chemistry: 3, skill: { all: 1 } },
          outcome: 'Doris listens to the whole set. She nods at the waltz. She leaves during the truck song. Travis takes it personally.' },
        { label: 'Wing the setlist', hint: 'Gamble: memory vs. nerves',
          outcome: 'You play the gig from memory.',
          roll: { chance: 0.55,
            success: { effects: { buzz: 4, chemistry: 3 }, outcome: 'You call the songs by feel. The set flows better than any list. Doris is now the band\'s setlist editor.' },
            fail: { effects: { burnout: 4 }, outcome: 'Earl starts a different song than everyone else. Twice. The crowd thinks it is a medley. It is not.' } } },
        { label: 'A horse-proof latch ($20)', hint: '−$20 · Duke ↓', effects: { fund: -20, mood: { duke: -3 } },
          outcome: 'The latch works for a week. Then Doris learns it. Duke says she is "gifted". Duke leaves apples by the door now.' }
      ] },
    { id: 'grr_rep_dolores_shoutout', type: 'fame', speaker: 'grr_dolores', title: 'Dolores Wants a Jingle', once: false, cooldown: 12, gate: g({ era: GLS, minFans: 30 }),
      text: "Dolores from Speedy Creek 97 needs a new station jingle: 'Speedy Creek 97, the country you can count on'. Ten seconds, " +
        "sung, with fiddle. She can pay in airplay. She can also pay in muffins. She makes excellent muffins.",
      choices: [
        { label: 'Write the jingle', hint: 'Fans ↑ · Buzz ↑', effects: { fans: 10, buzz: 3 },
          outcome: 'Travis Lee sings it, Clementine plays it, you tap it on a coffee tin. It plays forty times a day. The whole southwest knows it.' },
        { label: 'Take the muffins', hint: 'Burnout ↓ · Chemistry ↑', effects: { burnout: -4, chemistry: 3 },
          outcome: 'A dozen saskatoon-berry muffins, every week, for a ten-second jingle. The best deal the band has ever made.' },
        { label: 'Earl sings it', hint: 'Gamble: Earl has a voice',
          outcome: "Earl clears his throat. 'I sang on a jingle in 1979.'",
          roll: { chance: 0.5,
            success: { effects: { mood: { earl: 8 }, fans: 6 }, outcome: 'His voice is gravel and honey. Farmers call in to ask who he is. Dolores gives him the Sunday show.' },
            fail: { effects: { mood: { earl: -4 } }, outcome: 'It is eleven seconds of a story about 1979. Dolores uses it anyway. It sounds like a lost broadcast.' } } }
      ] },
    { id: 'grr_rep_tuning', type: 'drama', speaker: 'clementine', title: 'The Tuning Argument', once: false, cooldown: 10, gate: g({ era: GLS }),
      text: "Clementine tunes to A440. Earl tunes to 'whatever the Wurlitzer was in 1979', which is a little flat. Every rehearsal starts " +
        "with ten minutes of them tuning at each other. Today it has been half an hour. Duke is tuning to the middle.",
      choices: [
        { label: 'Side with Clementine', hint: 'Clementine ↑ · Earl ↓', effects: { mood: { clementine: 6, earl: -4 } },
          outcome: 'Earl tunes up to 440 and says the guitar "sounds nervous". It sounds correct. Clementine says nothing, triumphantly.' },
        { label: 'Side with Earl', hint: 'Earl ↑ · Clementine ↓', effects: { mood: { earl: 6, clementine: -4 } },
          outcome: 'Clementine tunes down, audibly offended. The band sounds warmer. She admits nothing. She tunes that way every week after.' },
        { label: 'Buy a tuner for both ($30)', hint: '−$30 · Skill ↑', effects: { fund: -30, skill: { all: 1 } },
          outcome: 'Two clip-on tuners. They disagree with each other by two cents. Clementine and Earl bond over hating the tuners.' }
      ] }
  ]);
  addCards(cards, [
    // ---- Buckle & Boot's truck money comes for you too (gap #10: a sponsor-offer set, not only the poach) ----------------
    { id: 'grr_bb_floor_mats', type: 'money', speaker: 'bb_brayden', title: 'A Pallet of Floor Mats', gate: g({ era: GLS, minFans: 80 }),
      text: "A pallet of Prairie Titan floor mats has been delivered to the Quonset, addressed to 'the hay-bale guys'. A card from Brayden: " +
        "'No hard feelings bud!! Tag the brand?? (Sheldon says tag the brand.)' Vern wants it out of his yard.",
      choices: [
        { label: 'Tag the brand (+$150)', hint: '+$150 · Travis ↓ · Buzz ↓', effects: { fund: 150, mood: { travis: -8 }, buzz: -3 },
          outcome: 'One photo, one tag, $150 from Sheldon in an hour. The comments call you sellouts. Travis deletes it at 3 a.m. and cries at a truck.' },
        { label: 'Give them away at a gig', hint: 'Fans ↑ · Burnout ↑', effects: { fans: 12, burnout: 5 },
          outcome: 'Free floor mats for everyone. Every truck in the southwest now says PRAIRIE TITAN on the floor and GRID ROAD RAMBLERS on the bumper.' },
        { label: 'Ship them back, collect', hint: 'Buzz ↑ · Chemistry ↑', effects: { buzz: 6, chemistry: 3 },
          outcome: "The pallet goes back to Red Deer collect, with a note from Clementine in French. Brayden replies: 'lol what'." }
      ] },
    { id: 'grr_bb_hat_offer', type: 'money', speaker: 'bb_sheldon', title: 'Sheldon Wants the Hat', gate: g({ era: LS, minFans: 150 }),
      text: "Sheldon from Prairie Titan has an offer: $400 for Duke's hat. For Titan Tim. 'The mascot needs a signature look,' he says, chewing " +
        "the toothpick. 'Your hat tested very well.' Duke has taken the hat off and is holding it against his chest.",
      choices: [
        { label: 'Absolutely not', hint: 'Duke ↑↑ · Chemistry ↑', effects: { mood: { duke: 14 }, chemistry: 5 },
          outcome: 'Duke puts the hat back on, slowly, and walks out to the Suburban without a word. It is the most dramatic thing he has ever done.' },
        { label: 'Sell him a replica', hint: '+$300 · Duke ↓', effects: { fund: 300, mood: { duke: -6 } },
          outcome: "Vern's old hat, brushed up, sold as 'the hat'. Titan Tim wears it at every show. Duke knows. Duke sees it everywhere." },
        { label: 'Counter: $4,000', hint: 'Gamble: Sheldon has a budget',
          outcome: 'Earl writes "$4,000" on a napkin and slides it across.',
          roll: { chance: 0.15,
            success: { effects: { fund: 400, buzz: 12 }, outcome: 'Sheldon pays $400 to RENT the hat for one commercial. The hat is on TV. Duke is the proudest man in the province.' },
            fail: { effects: { buzz: 6, chemistry: 3 }, outcome: 'Sheldon laughs and keeps the napkin. It is framed at Prairie Titan now, next to a truck.' } } }
      ] },
    { id: 'grr_bb_duet', type: 'money', speaker: 'bb_brayden', title: 'Tailgate (Remix)', gate: g({ era: S }),
      text: "Brayden calls. Prairie Titan wants a 'Tailgate (Remix)' with Travis Lee on the second verse. $1,000. 'Hay bales and tailgates, bud. " +
        "Unity.' Colt will 'play' guitar on it. Travis Lee has picked up the phone and put it down again four times.",
      choices: [
        { label: 'Absolutely not', hint: 'Chemistry ↑ · Buzz ↑', effects: { chemistry: 6, buzz: 8 },
          outcome: "Travis Lee says no, politely, like a condo kid. Brayden says 'respect' and means it. Then he asks Earl. Earl says 1979." },
        { label: 'Take the $1,000', hint: '+$1,000 · Travis ↓', effects: { fund: 1000, mood: { travis: -10 } },
          outcome: "Travis sings one verse about a tailgate. It charts. His mother is proud. He writes three truck songs that night to cleanse himself." },
        { label: 'Only with a fiddle solo', hint: 'Gamble: Clementine vs. the remix',
          outcome: 'Clementine agrees, on the condition of a sixteen-bar solo.',
          roll: { chance: 0.5,
            success: { effects: { fund: 800, buzz: 12, mood: { clementine: 8 } }, outcome: 'The fiddle solo is the hit. Everyone calls it "the Clementine part". Brayden is thrilled. Colt mimes it live.' },
            fail: { effects: { fund: 500, mood: { clementine: -8 } }, outcome: 'Prairie Titan cuts the solo to four bars and puts a truck horn over it. She hears it at a Co-op. She leaves.' } } }
      ] },

    // ---- Guilt (only while you owe your parents; repay pays them back) ----------------------------------------------------
    { id: 'grr_guilt_gas_card', type: 'money', speaker: 'dad', title: "Dad's Gas Card", once: false, cooldown: 10,
      gate: g({ era: GLS, flags: ['parentsLoan'] }),
      text: "Dad has noticed that {van} has been filling up on his gas card. Earl drives at twenty under, which is efficient, but there are a " +
        "lot of historical markers. Dad has printed the statement. He has highlighted Maple Creek. Twice.",
      choices: [
        { label: 'Pay him back $120', hint: 'Debt ↓', effects: { repay: 120, chemistry: 2 },
          outcome: "Dad folds the cash into the statement and says 'Earl seems like a careful driver'. He means it as a compliment." },
        { label: 'Bring Earl to supper', hint: 'Gamble: Dad meets Earl',
          outcome: 'Earl arrives forty minutes early with a pie.',
          roll: { chance: 0.5,
            success: { effects: { repay: 60, mood: { earl: 6 } }, outcome: 'Dad and Earl talk road atlases for three hours. Dad forgives $60 of the loan "for the history lesson".' },
            fail: { effects: { burnout: 5 }, outcome: 'Earl tells the 1979 story. Dad tells a 1981 story. It escalates. It is still going when you leave.' } } },
        { label: 'Promise to take the highway', hint: 'Burnout ↑', effects: { burnout: 4 },
          outcome: 'Dad writes "HIGHWAY ONLY" on a sticky note and puts it on the gas card. Earl reads it and nods. Earl takes the grid road.' }
      ] },
    { id: 'grr_guilt_hay', type: 'money', speaker: 'mom', title: 'Mom Paid for the Hay', once: false, cooldown: 9,
      gate: g({ era: GLS, flags: ['parentsLoan'] }),
      text: "Mom has sent an itemized note: 'Square bales for drum stools, 6 @ $5. Coffee for coffee row, 40 @ $2. Hat dryer (Duke's).' It is " +
        "all out of the band loan. The note ends: 'Love you! P.S. the loan.' Wilf read it over your shoulder.",
      choices: [
        { label: 'Pay her back $100', hint: 'Debt ↓ · Chemistry ↑', effects: { repay: 100, chemistry: 2 },
          outcome: 'You mail $100 with a photo of the hay bale throne. Mom frames the photo. She sends a new note: "Thank you! P.S. the rest."' },
        { label: 'Invite her to the Quonset', hint: 'Everyone ↑ · Burnout ↓', effects: { mood: { all: 4 }, burnout: -4 },
          outcome: 'Mom visits. She sits on a bale. Duke gives her the hat to hold. She cries at the waltz. The loan is not mentioned. For an hour.' },
        { label: 'Work it off at Vern\'s', hint: 'Burnout ↑', effects: { burnout: 5, repay: 20 },
          outcome: 'Vern pays $20 for a day of fence posts, which you send to Mom. She says it is "a start". It is twenty dollars.' }
      ] },
    { id: 'grr_guilt_coffee_row', type: 'money', speaker: 'grr_wilf', title: 'Mom Called Coffee Row', once: false, cooldown: 12,
      gate: g({ era: GLS, flags: ['parentsLoan'], minWeek: 10 }),
      text: "Wilf, carefully: your mom phoned the Co-op. She asked coffee row to 'gently mention' the band loan. Coffee row does not do " +
        "gentle. It has been mentioned seven times this morning. Once by a man you have never met.",
      choices: [
        { label: 'Pay her $150, in front of the row', hint: 'Debt ↓ · Buzz ↑', effects: { repay: 150, buzz: 3 },
          outcome: 'You call Mom from the Co-op payphone and promise the money on speaker. The row applauds. Wilf buys you a coffee.' },
        { label: 'Laugh it off', hint: 'Burnout ↑', effects: { burnout: 5, mood: { duke: 4 } },
          outcome: 'Duke tells the row the loan is "under review". They find this very funny. Mom finds out by noon. She does not.' },
        { label: 'Write her a song', hint: 'Chemistry ↑ · Fans ↑', effects: { chemistry: 3, fans: 5 },
          outcome: "'Balance Owing' is a waltz. Travis Lee sings it to her on the phone. She plays it for her whole bridge club. They want copies." }
      ] },

    // ---- Holidays (appended to calendar.holidays[*].cards below; once a year) ---------------------------------------------
    { id: 'holiday_canada_day_grid_road_ramblers', type: 'scene', speaker: 'travis', title: 'Canada Day', once: false, cooldown: 20,
      gate: g({ era: GLS, weekOfYear: [1, 1] }),
      text: "Canada Day in Swift Current. A parade with combines in it, a free stage in the park, fireworks at dark. The organizers want a " +
        "band on a hay wagon in the parade. Duke's hat has been asked to be the grand marshal. Duke has said yes for it.",
      choices: [
        { label: 'Ride the hay wagon', hint: 'Buzz ↑ · Fans ↑ · Burnout ↑', effects: { buzz: 8, fans: 12, burnout: 5 },
          outcome: 'You play the parade route on a moving hay wagon at combine speed. Four songs, eleven blocks. The hat waves. The town waves back.' },
        { label: 'Anthem at the park', hint: 'Gamble: Travis and the national anthem',
          outcome: 'Travis Lee steps up to the mic in the park.',
          roll: { chance: 0.55,
            success: { effects: { fans: 15, mood: { travis: 8 } }, outcome: 'He nails it, with twang. Fireworks go off early by accident on the last note. It looks planned. Legend.' },
            fail: { effects: { burnout: 4, mood: { travis: -5 } }, outcome: 'He forgets the second line and hums it. The whole park hums with him. Kind, but mortifying.' } } },
        { label: 'Barbecue at the Quonset', hint: 'Everyone ↑ · Burnout ↓', effects: { mood: { all: 4 }, burnout: -6 },
          outcome: 'Vern grills. Wilf brings corn. Biscuit steals a hot dog. You watch the town fireworks from the Quonset roof. Nobody plays a note.' }
      ] },
    { id: 'holiday_thanksgiving_guilt_grid_road_ramblers', type: 'money', speaker: 'mom', title: 'Thanksgiving Dinner', once: false, cooldown: 20,
      gate: g({ era: GLS, weekOfYear: [7, 7], flags: ['parentsLoan'] }),
      text: "Thanksgiving at your parents'. Mom made the good stuffing. Dad says grace, and grace is about the loan. \"And thank you, Lord, " +
        "for repayment schedules.\" Earl came along and brought a pie. Earl would also like to say grace. It is a long one.",
      choices: [
        { label: 'Pay back $100 over pie', hint: 'Debt ↓ · guilt ↓', effects: { repay: 100, chemistry: 2 },
          outcome: "Five twenties under the pumpkin pie. Dad counts them twice. Earl says he paid off a loan like that in 1979. It helps, somehow." },
        { label: "Let Earl say grace", hint: 'Gamble: a seventy-year-old grace',
          outcome: 'Earl bows his head. Dad puts down his fork.',
          roll: { chance: 0.45,
            success: { effects: { mood: { all: 4 }, chemistry: 3 }, outcome: 'It is beautiful. It thanks the harvest, the band and Mom. Dad forgives the loan for a whole evening.' },
            fail: { effects: { burnout: 6 }, outcome: 'It is about 1979. The gravy goes cold. The loan comes up again, over the cold gravy.' } } },
        { label: 'Three plates, say nothing', hint: 'Burnout ↓', effects: { burnout: -5, mood: { duke: 3 } },
          outcome: 'Stuffing, turkey, stuffing again. The loan is not mentioned. It sits at the table. It has seconds.' }
      ] },
    { id: 'holiday_thanksgiving_grid_road_ramblers', type: 'scene', speaker: 'grr_vern', title: 'Thanksgiving in the Quonset', once: false, cooldown: 20,
      gate: g({ era: GLS, weekOfYear: [7, 7], notFlags: ['parentsLoan'] }),
      text: "Harvest is in and Vern is hosting Thanksgiving in the Quonset for everyone who worked it: the band, two neighbours, the hired man, " +
        "Wilf and Biscuit. The turkey is on a door on two sawhorses. Duke is carving with great ceremony, in the hat.",
      choices: [
        { label: 'Bring the whole band', hint: 'Chemistry ↑ · Burnout ↓', effects: { chemistry: 5, burnout: -4 },
          outcome: "Clementine brings tourtière from her grandmother's recipe. Travis says grace: 'thank you for trucks'. Earl adds a footnote." },
        { label: 'Play a set after pie', hint: 'Fans ↑', effects: { fans: 8, mood: { travis: 3 } },
          outcome: 'Waltzes in the Quonset, the harvest dust still in the air. Vern dances with Biscuit. The neighbours want you for Christmas.' },
        { label: 'Leftovers for the week', hint: '+$30 of food · moods ↑', effects: { fund: 30, mood: { all: 3 } },
          outcome: 'Eleven containers of leftovers in the Quonset fridge. Duke rations them fairly, mostly to Duke.' }
      ] },
    { id: 'holiday_halloween_grid_road_ramblers', type: 'fame', speaker: 'duke', title: 'Halloween Costume Gigs', once: false, cooldown: 20,
      gate: g({ era: GLS, weekOfYear: [8, 8] }),
      text: "Halloween. Every hall in the southwest wants costume bands, and the rule is you dress as ANOTHER band. Duke has a proposal and a " +
        "roll of cardboard. The proposal is Buckle & Boot. The cardboard is a truck.",
      choices: [
        { label: 'Go as Buckle & Boot', hint: 'Buzz ↑', effects: { buzz: 6, flags: { costume: '{rival} (with a cardboard mascot)' } },
          outcome: 'Duke goes as Titan Tim in a cardboard pickup. Travis Lee sings only about tailgates. Colt likes the photo. Brayden does not.' },
        { label: 'Go as a symphony orchestra', hint: 'Gamble: Clementine has concerns',
          outcome: 'Clementine rents four tuxedos. She is conducting.',
          roll: { chance: 0.5,
            success: { effects: { buzz: 10, fans: 15, flags: { costume: 'a symphony orchestra (Clementine conducting)' } }, outcome: 'Country songs, formal wear, a baton. The hall loves it. Clementine is the happiest she has ever been in public.' },
            fail: { effects: { burnout: 6, flags: { costume: 'an orchestra (tuning up)' } }, outcome: 'You spend the first set tuning. The crowd thinks it is avant-garde. Clementine says it was.' } } },
        { label: 'We ARE the costume', hint: 'Chemistry ↑', effects: { chemistry: 3, flags: { costume: 'the Grid Road Ramblers (nobody noticed)' } },
          outcome: "You go as yourselves. Three people compliment the costumes. One says Duke's hat is 'a bit much'. Duke is honoured." }
      ] },
    { id: 'holiday_grey_mug_grid_road_ramblers', type: 'fame', speaker: 'grr_dolores', title: 'The Grey Mug Halftime Show', once: true,
      gate: g({ era: S, weekOfYear: [10, 10], minFans: 20000, minYear: 4 }),
      text: "Dolores calls first: the Grey Mug wants the Ramblers for the halftime show. Four million people, twelve minutes, a stage on wheels " +
        "in the snow. The province is in watermelon helmets. Duke wants the hat on the jumbotron. The hat wants it too.",
      choices: [
        { label: 'Three songs, twelve minutes', hint: 'Fans ↑↑ · buzz ↑↑', effects: { fans: 400, buzz: 18, burnout: 10, flags: { greyMug: 'played' } },
          outcome: 'Four million people clap on two and four. Clementine yeehaws on national television. She will never live it down. She does not want to.' },
        { label: 'A truck on the stage', hint: 'Gamble: Loretta on the fifty-yard line',
          outcome: 'Travis Lee wants to drive his 1987 truck onto the field for the last song.',
          roll: { chance: 0.55, stat: 'chemistry', statScale: 0.005,
            success: { effects: { fans: 400, buzz: 18, flags: { greyMug: 'played' } }, outcome: 'The old truck rolls out, no stall, at twenty under. Four million people lose their minds. Brayden watches from a bar.' },
            fail: { effects: { fans: 250, buzz: 12, mood: { travis: -8 }, flags: { greyMug: 'played' } }, outcome: 'It stalls on the forty-yard line. The broadcast cuts to a Prairie Titan ad. It is a meme by Monday.' } } },
        { label: "We're a Quonset band. Pass.", hint: 'Chemistry ↑', effects: { chemistry: 6, burnout: -8 },
          outcome: 'You watch the game at the Legion with coffee row. The halftime band is terrible. Wilf heckles, lovingly. So does Earl.' }
      ] },
    { id: 'holiday_xmas_single_grid_road_ramblers', type: 'fame', speaker: 'travis', title: 'The Christmas Single', once: false, cooldown: 20,
      gate: g({ era: S, weekOfYear: [11, 12], flags: ['label'] }),
      text: "The label wants a Christmas single. The pitch: 'Santa Drives a Half-Ton'. (If you're DIY, it's Mom's pitch. Same song.) " +
        "Travis Lee is already writing it. Clementine says Christmas songs are 'the lowest form of music' and asks what key.",
      choices: [
        { label: 'Record it', hint: 'Fans ↑ · Travis ↑', effects: { fans: 250, fund: 400, mood: { travis: 8 } },
          outcome: "'Santa Drives a Half-Ton' plays in every Co-op in the country. Including the one in Red Deer. Brayden hears it buying cologne." },
        { label: "'Silent Night' on fiddle", hint: 'Gamble: a cult classic or a flop',
          outcome: 'Clementine records it alone, in the Quonset, at midnight.',
          roll: { chance: 0.5,
            success: { effects: { buzz: 15, fans: 300 }, outcome: 'Farmers play it in the barn at calving. Dolores plays it every hour. It becomes the song of a Saskatchewan winter.' },
            fail: { effects: { buzz: -6, fund: -300 }, outcome: 'It is too beautiful for radio. The label pressed two thousand copies. They are coasters in the Quonset now.' } } },
        { label: 'Refuse. Principles.', hint: 'Chemistry ↑ · label ↓', effects: { chemistry: 5, buzz: -4 },
          outcome: "The label sends a gift basket: 'Disappointed but festive.' Duke eats the fruit. Principles are one thing." }
      ] },
    { id: 'holiday_xmas_parties_grid_road_ramblers', type: 'money', speaker: 'grr_vern', title: 'Christmas Party Season', once: false, cooldown: 20,
      gate: g({ era: GLS, weekOfYear: [11, 12] }),
      text: "Every curling club, seed plant and 4-H club in the southwest wants a band for its Christmas party. Vern has an idea: a Christmas " +
        "yard party at the Quonset, bonfire, sleigh ride, the whole neighbourhood. 'Bring your own mitts.'",
      choices: [
        { label: "Vern's Quonset yard party", hint: 'Books this weekend (if free)', effects: { book: 'quonset_yard_party', chemistry: 2 },
          outcome: 'The yard is full of trucks and toques. You play in the Quonset door with a bonfire outside. Vern pulls a sleigh with the tractor.' },
        { label: 'The seed plant party (+$150)', hint: '+$150 · dignity ↓', effects: { fund: 150, mood: { all: -4 } },
          outcome: 'Four hours of carols for the seed plant, next to a pallet of canola seed. They tip in seed-company caps. Mostly caps.' },
        { label: "Skip it. It's family time.", hint: 'Burnout ↓', effects: { burnout: -6, chemistry: 2 },
          outcome: 'A quiet week. Duke strings lights in the Quonset. The band sits by the heater drinking cocoa. Earl tells a Christmas 1979 story.' }
      ] },
    { id: 'holiday_st_paddys_grid_road_ramblers', type: 'weird', speaker: 'clementine', title: "St. Paddy's Pub Crawl", once: false, cooldown: 20,
      gate: g({ era: GLS, weekOfYear: [18, 18] }),
      text: "St. Patrick's Day. Every bar in Swift Current is booking bands and dyeing everything green. Clementine has been asked to play jigs. " +
        "She knows every jig. She has refused to admit it for a year. Today she is wearing a green ribbon in her bow.",
      choices: [
        { label: 'Play the pub circuit', hint: 'Fans ↑ · burnout ↑', effects: { fans: 15, buzz: 4, burnout: 6 },
          outcome: "Three bars in one night. Clementine plays jigs so fast a man's hat catches fire. It is fine. It is Duke's. The hat is insured. Maybe." },
        { label: 'A fiddle-off', hint: 'Gamble: a fiddler from the Legion',
          outcome: 'An old fiddler at the Legion challenges Clementine.',
          roll: { chance: 0.5,
            success: { effects: { buzz: 8, mood: { clementine: 8 } }, outcome: 'She wins with a reel and a Bach partita disguised as a reel. The old man shakes her hand and gives her his bow.' },
            fail: { effects: { mood: { clementine: -6 } }, outcome: 'The old man wins. He is eighty-eight. She takes lessons from him every Tuesday afterwards. Secretly.' } } },
        { label: 'Hide in the Quonset', hint: 'Burnout ↓', effects: { burnout: -5 },
          outcome: 'You rehearse while the town goes green. Clementine plays one jig at the end, alone, and pretends nobody heard.' }
      ] },

    // ---- Local Heroes (L / LS; local magnitudes) ------------------------------------------------------------------------
    { id: 'grr_local_recognized', type: 'fame', speaker: 'travis', title: 'Recognized at the Co-op', once: false, cooldown: 9, gate: g({ era: LS }),
      text: "At the Co-op gas bar a kid in a 4-H jacket points at Travis Lee and yells 'THE TRUCK GUY!' Then the cashier. Then a man filling " +
        "a grain truck. Travis is holding a jerky stick. He has never been recognized before. He does not know what to do with the jerky.",
      choices: [
        { label: 'Sing them a verse', hint: 'Buzz ↑ · Travis ↑', effects: { buzz: 8, mood: { travis: 8 } },
          outcome: 'One verse by pump four. The grain truck honks along. A Co-op employee films it. It is the jerky that makes the clip.' },
        { label: 'Sign everything', hint: 'Fans ↑ · Burnout ↑', effects: { fans: 30, burnout: 5 },
          outcome: 'Forty autographs on receipts, a cap and one feed bag. Travis signs it "Travis Lee (the truck guy)". It sticks.' },
        { label: 'Stay humble', hint: 'Chemistry ↑', effects: { chemistry: 3, mood: { travis: -4 } },
          outcome: "Travis says he's 'just a condo kid with a truck song'. The kid says 'that's so country'. Travis thinks about it for a week." }
      ] },
    { id: 'grr_local_maple_creek_rodeo', type: 'money', speaker: 'duke', title: 'The Maple Creek Rodeo', gate: g({ era: LS, weekOfYear: [1, 4] }),
      text: "Duke's hometown rodeo wants the Ramblers for the beer-garden stage: $300 and all the chili you can eat. Duke is a legend in Maple " +
        "Creek. Or the hat is. Everyone there calls him 'Hat'. His own mother calls him 'Hat'.",
      choices: [
        { label: 'Play the beer garden (+$300)', hint: '+$300 · Fans ↑', effects: { fund: 300, fans: 40 },
          outcome: 'Four hundred people in hats, one hat above all the others. Maple Creek sings along. Duke is carried to the chili tent.' },
        { label: 'Duke enters the bronc riding', hint: 'Gamble: the hat has never fallen off',
          outcome: 'Duke climbs into the chute. The hat stays on. The crowd goes silent.',
          roll: { chance: 0.35,
            success: { effects: { buzz: 15, fans: 60, mood: { duke: 14 } }, outcome: 'Eight seconds. The hat never moves. Duke is carried out on shoulders. The hat is carried separately.' },
            fail: { effects: { burnout: 10, mood: { duke: -8 } }, outcome: 'Two seconds. Duke lands in the dirt. The hat lands on the bronc. The bronc wins the rodeo. Moving on.' } } },
        { label: 'Play for the chili only', hint: 'Chemistry ↑ · Burnout ↓', effects: { chemistry: 5, burnout: -5 },
          outcome: 'No fee, all the chili, a late-night jam with the rodeo clowns. Earl knew one of them in 1979. Of course he did.' }
      ] },
    { id: 'grr_local_hat_fanclub', type: 'fame', speaker: 'duke', title: 'The Hat Has a Fan Club', gate: g({ era: LS, minFans: 300 }),
      text: "The hat has a fan club. It has a newsletter, a Bandbook page with more followers than the band and a president in Gull Lake " +
        "named Bev. Bev would like the hat to attend the club's first meeting. Duke may come too.",
      choices: [
        { label: 'The hat attends', hint: 'Buzz ↑ · Duke ↑', effects: { buzz: 10, mood: { duke: 10 } },
          outcome: 'Forty people in a church basement. The hat sits on a cushion at the head table. Duke sits beside it. Bev reads the minutes to it.' },
        { label: 'Merch for the hat club', hint: '+$200 · Duke ↓', effects: { fund: 200, mood: { duke: -5 } },
          outcome: 'Tiny hat pins, $5 each. They sell out. Duke feels the hat is being commercialized. The hat, he says, is "conflicted".' },
        { label: 'The band attends too', hint: 'Chemistry ↑ · Fans ↑', effects: { chemistry: 4, fans: 30 },
          outcome: 'You play three songs for the hat club. They clap politely and ask the hat a question. Duke answers for it. Nobody minds.' }
      ] },
    { id: 'grr_local_harvest_dance', type: 'fame', speaker: 'earl', title: 'The Harvest Dance', gate: g({ era: LS, weekOfYear: [6, 9] }),
      text: "The harvest dance at the Cypress Hills hall: the crop is in, the floor is waxed, the whole district is in its good boots. Earl " +
        "played this hall in 1966. He says the floor has 'a bounce'. The organizer wants waltzes, polkas and 'one for the young people'.",
      choices: [
        { label: 'Play till the last waltz', hint: 'Fans ↑ · Burnout ↑', effects: { fans: 60, burnout: 8 },
          outcome: 'Five hours. Earl calls the dances from the stage. The floor bounces. At 2 a.m. the last waltz is Travis and a ninety-year-old.' },
        { label: 'Earl calls a square dance', hint: 'Earl ↑ · Buzz ↑', effects: { mood: { earl: 12 }, buzz: 8 },
          outcome: 'Earl calls it like it is 1966: fast, precise, merciless. Nobody gets it right. Everybody has the time of their life.' },
        { label: 'One for the young people', hint: 'Gamble: a very fast song',
          outcome: 'Travis Lee counts in the fastest song you have.',
          roll: { chance: 0.5,
            success: { effects: { fans: 50, buzz: 8 }, outcome: 'The teenagers take the floor. The seniors take it back. It becomes a dance-off. The seniors win.' },
            fail: { effects: { burnout: 6, mood: { travis: -5 } }, outcome: 'The young people have gone to the parking lot. The seniors sit it out. You play it to the coat rack.' } } }
      ] },
    { id: 'grr_local_yard_party', type: 'scene', speaker: 'grr_vern', title: 'The Quonset Yard Party', once: false, cooldown: 12, gate: g({ era: GL }),
      text: "Vern wants to throw a yard party at the Quonset: a bonfire, a flatbed stage, trucks parked in a circle with their headlights on, " +
        "the whole district invited by word of coffee row. He needs a band. He is looking at you. He has always been looking at you.",
      choices: [
        { label: 'Play the yard party', hint: 'Books this weekend (if free)', effects: { book: 'quonset_yard_party', chemistry: 3 },
          outcome: 'Vern calls coffee row. Coffee row calls everyone. By Saturday the yard is full of trucks, lawn chairs and Biscuit.' },
        { label: 'Help set it up', hint: 'Burnout ↑ · Chemistry ↑', effects: { burnout: 4, chemistry: 4 },
          outcome: 'You build a stage out of a flatbed and pallets. Clementine strings lights. Earl supervises and tells you how it was done in 1966.' },
        { label: 'Not this weekend', hint: 'Burnout ↓', effects: { burnout: -4 },
          outcome: 'Vern says "next time" and goes back to his tractor. He is already planning next time. He has a clipboard now.' }
      ] },
    { id: 'grr_local_earl_calgary', type: 'drama', speaker: 'earl', title: 'An Old Friend Calls', gate: g({ era: LS }),
      text: "An old session buddy of Earl's is producing a record in Calgary and wants Earl for three days: $400, cash. It is the week of the " +
        "Ramblers' biggest gig so far. Earl says 'I played on his first record in 1979. And his second. And the one he doesn't talk about.'",
      choices: [
        { label: 'Go. We will manage.', hint: '+$400 · Earl ↑ · Chemistry ↓', effects: { fund: 400, mood: { earl: 12 }, chemistry: -3 },
          outcome: 'Earl drives to Calgary at twenty under and arrives just in time to leave. He plays the session. He sends half the money home.' },
        { label: 'Stay. We need you.', hint: 'Earl ↓ · Chemistry ↑', effects: { mood: { earl: -6 }, chemistry: 6 },
          outcome: "Earl stays. He plays the gig of his life, to prove something to someone. Afterwards he calls Calgary. 'Next time,' he says." },
        { label: 'Ask if the band can come', hint: 'Gamble: a producer with a soft spot',
          outcome: 'Earl calls back with your question.',
          roll: { chance: 0.4,
            success: { effects: { buzz: 12, skill: { all: 2 } }, outcome: 'The whole band sits in on one song. You get a credit on a Calgary record. Earl frames it next to 1979.' },
            fail: { effects: { mood: { earl: -4 } }, outcome: 'The producer says "just Earl". Earl stays out of loyalty. He mentions it twice a week.' } } }
      ] },
    { id: 'grr_local_symphony_pops', type: 'drama', speaker: 'clementine', title: 'The Pops Night', gate: g({ era: LS, minFans: 300 }),
      text: "The Regina symphony is doing a 'Country Pops' night and wants Clementine as a guest soloist. With the orchestra. In a gown. Her " +
        "old teacher will be in the second violins. Clementine has read the email eleven times and not replied.",
      choices: [
        { label: 'Tell her to go', hint: 'Clementine ↑ · Buzz ↑', effects: { mood: { clementine: 10 }, buzz: 8 },
          outcome: 'She plays a hoedown with seventy musicians behind her. The second violins yeehaw on cue. Her old teacher gives her a standing ovation.' },
        { label: 'Offer the whole band', hint: 'Gamble: the symphony and a hay bale',
          outcome: 'You email the symphony: package deal.',
          roll: { chance: 0.45,
            success: { effects: { fans: 80, buzz: 12 }, outcome: 'The Ramblers with a full orchestra. Duke\'s hat has its own spotlight. You play {instrument} on a hay bale on a concert stage.' },
            fail: { effects: { mood: { clementine: -6 } }, outcome: '"Just the fiddler," says the symphony. Clementine declines out of loyalty and is quietly furious about it.' } } },
        { label: 'Say nothing', hint: 'Chemistry ↑', effects: { chemistry: 3 },
          outcome: 'She decides alone. She goes. She tells nobody. You find out from a review that calls her "slumming it, gloriously".' }
      ] },
    { id: 'grr_local_bugle_interview', type: 'fame', speaker: 'travis', title: 'The Bugle Interview', gate: g({ era: LS }),
      text: "The Southwest Bugle wants an interview. The reporter asks Travis Lee about 'growing up on the farm'. Travis Lee grew up on the ninth " +
        "floor of a condo in Regina. He is opening his mouth. The whole band is watching him.",
      choices: [
        { label: 'Tell the truth', hint: 'Chemistry ↑ · Buzz ↑', effects: { chemistry: 5, buzz: 6 },
          outcome: "'CONDO COWBOY TELLS ALL' is the headline. It is the most-read Bugle story of the year. Wilf clips it for coffee row." },
        { label: 'Let Earl answer', hint: 'Earl ↑ · Burnout ↑', effects: { mood: { earl: 8 }, burnout: 4 },
          outcome: 'Earl answers every question with a story about 1979. The reporter prints all of them. The band is barely mentioned. It is great.' },
        { label: 'Invent a farm', hint: 'Gamble: coffee row reads the Bugle',
          outcome: 'Travis Lee describes a farm near Kyle. In detail.',
          roll: { chance: 0.3,
            success: { effects: { buzz: 10 }, outcome: 'Nobody checks. The farm near Kyle becomes part of the legend. Travis is haunted by it forever.' },
            fail: { effects: { mood: { travis: -8 }, buzz: -4 }, outcome: 'Coffee row reads it at 6:40. By 6:45 Wilf has established there is no such farm near Kyle.' } } }
      ] },
    { id: 'grr_local_bonspiel', type: 'money', speaker: 'grr_wilf', title: 'The Bonspiel Banquet', gate: g({ era: LS, weekOfYear: [13, 16] }),
      text: "The district bonspiel banquet needs a band: two hundred curlers, a roast beef dinner and a sheet of ice next door. $250. Wilf's " +
        "rink won the C event. He would like the band to play his victory song. He does not have a victory song. Yet.",
      choices: [
        { label: 'Play the banquet (+$250)', hint: '+$250 · Fans ↑', effects: { fund: 250, fans: 40 },
          outcome: 'Two hundred curlers in team sweaters, square-dancing between courses. Wilf gets a standing ovation for the C event.' },
        { label: "Write Wilf's victory song", hint: 'Chemistry ↑ · Buzz ↑', effects: { chemistry: 5, buzz: 6 },
          outcome: "'The C Event' is two minutes long and names every rock Wilf threw. The whole banquet sings it. Wilf cries into the roast." },
        { label: 'Curl a game first', hint: 'Gamble: a band vs. a rink',
          outcome: 'The band challenges Wilf\'s rink.',
          roll: { chance: 0.3,
            success: { effects: { buzz: 12, fans: 50 }, outcome: 'Earl throws a perfect draw to the button with the last rock. He curled in 1979. The hall goes wild.' },
            fail: { effects: { burnout: 6 }, outcome: 'Wilf\'s rink wins 11-0 after six ends. Duke falls on the ice twice. The hat lands on the button.' } } }
      ] },
    { id: 'grr_local_4h', type: 'scene', speaker: 'clementine', title: '4-H Achievement Day', gate: g({ era: LS }),
      text: "Bailey from the 4-H club, the kid whose fiddle Clementine once borrowed, has asked her to judge the music category at Achievement " +
        "Day. There are four fiddlers, a kid on spoons and a boy who plays the saw. Clementine is taking it very seriously.",
      choices: [
        { label: 'Clementine judges, strictly', hint: 'Clementine ↑ · Buzz ↑', effects: { mood: { clementine: 8 }, buzz: 5 },
          outcome: "She writes a two-page critique for each child. They are devastated, then better. Bailey wins. Clementine claps once, very hard." },
        { label: 'The band plays after', hint: 'Fans ↑ · Burnout ↑', effects: { fans: 40, burnout: 4 },
          outcome: 'You play the 4-H barn with the saw kid sitting in. He is incredible. Earl says he played with a saw guy in 1979.' },
        { label: 'Everyone gets a ribbon', hint: 'Chemistry ↑', effects: { chemistry: 4, mood: { clementine: -4 } },
          outcome: "Duke gives every kid a ribbon from the Co-op. Clementine calls it 'grade inflation'. The spoons kid wears his to bed." }
      ] },
    { id: 'grr_local_truck_stop', type: 'scene', speaker: 'bb_colt', title: 'Colt at the Truck Stop', gate: g({ era: LS, minFans: 200 }),
      text: "A truck stop outside Medicine Hat at 1 a.m. Buckle & Boot's crew cab is at the next pump. Brayden is inside buying jerky. Colt is " +
        "outside, alone, holding his guitar. He nods at Earl. 'Can you tune this?' he asks. 'Nobody ever has.'",
      choices: [
        { label: 'Earl tunes it', hint: 'Earl ↑ · Chemistry ↑', effects: { mood: { earl: 8 }, chemistry: 3 },
          outcome: 'Earl tunes it in the headlights. Colt strums it. It sounds like a guitar for the first time. He says "whoa" very quietly.' },
        { label: 'Say nothing, pump gas', hint: 'Buzz ↑', effects: { buzz: 4 },
          outcome: 'You fill up in silence. Brayden comes out with jerky and says "hay-bale guys!" like it is a compliment. It might be.' },
        { label: 'Ask Colt to jam', hint: 'Gamble: a cousin with a secret',
          outcome: 'Travis Lee gets out the acoustic by pump six.',
          roll: { chance: 0.4,
            success: { effects: { fans: 30, buzz: 8 }, outcome: 'Colt can actually play. A little. Enough. A trucker films it. Brayden sees it and says nothing for days.' },
            fail: { effects: { burnout: 4 }, outcome: 'Colt strums with enormous confidence and no chords. Brayden honks from the truck. They leave.' } } }
      ] },
    { id: 'grr_local_wilf_birthday', type: 'scene', speaker: 'grr_wilf', title: "Wilf Turns Eighty", gate: g({ era: LS, minFans: 250 }),
      text: "Wilf is turning eighty. The party is at the Legion: coffee row, three generations of Wilf, a cake shaped like a combine. His " +
        "grandchildren ask if the band could play 'just one'. Wilf says it is not necessary. His eyes say it is very necessary.",
      choices: [
        { label: 'Play the whole night', hint: 'Chemistry ↑ · Burnout ↑', effects: { chemistry: 6, burnout: 6 },
          outcome: 'You play until midnight. Wilf dances with his wife of fifty-six years to the waltz. Coffee row declares it "a good party".' },
        { label: 'Write Wilf a song', hint: 'Fans ↑ · Travis ↑', effects: { fans: 30, mood: { travis: 8 } },
          outcome: "'Six-Forty A.M.' is about coffee row. Wilf does not say a word through the whole thing. After, he shakes every hand twice." },
        { label: 'Give him a signed hat', hint: 'Duke ↓ · Buzz ↑', effects: { mood: { duke: -4 }, buzz: 6 },
          outcome: "Duke signs a spare hat, the one before the hat. Wilf wears it to coffee row every morning. Duke says it is 'in good hands'." }
      ] },
    { id: 'grr_local_calving', type: 'drama', speaker: 'grr_vern', title: 'Calving Season', gate: g({ era: LS, weekOfYear: [17, 20] }),
      text: "Calving season. Vern needs someone in the barn at 2 a.m., every night, for two weeks. His hired man has the flu. The Quonset is " +
        "next to the barn. Travis Lee has volunteered before anyone else could speak. He has never seen a calf.",
      choices: [
        { label: 'Take turns on night check', hint: 'Burnout ↑ · Chemistry ↑', effects: { burnout: 8, chemistry: 6 },
          outcome: 'Two weeks of 2 a.m. Travis delivers a calf. He names it Loretta Two. He writes a song. It is the best thing he has ever written.' },
        { label: 'Rehearse in the barn', hint: 'Gamble: cows as an audience',
          outcome: 'You move the acoustic set into the barn for night check.',
          roll: { chance: 0.5,
            success: { effects: { chemistry: 5, mood: { clementine: 6 } }, outcome: 'The heifers love the fiddle. Vern says calving has never been so calm. He wants the waltz on a loop.' },
            fail: { effects: { burnout: 6 }, outcome: 'The heifers hate the snare. So does Vern. You are moved back to the Quonset by 3 a.m.' } } },
        { label: 'Let Vern handle it', hint: 'Burnout ↓ · Travis ↓', effects: { burnout: -4, mood: { travis: -5 } },
          outcome: 'Vern hires a neighbour. Travis Lee watches the barn light from the Quonset window every night. He writes about it anyway.' }
      ] },

    // ---- Signed (S; signed magnitudes) ---------------------------------------------------------------------------------
    { id: 'grr_s_big_stomp', type: 'fame', speaker: 'travis', title: 'The Big Stomp in Calgary', gate: g({ era: S }),
      text: "The Big Stomp, ten days of rodeo and midway in Calgary, wants the Ramblers on the North Stage, a mid-afternoon slot " +
        "between a chuckwagon race and a pancake breakfast. Buckle & Boot are headlining. Of course they are. On a truck.",
      choices: [
        { label: 'Take the afternoon slot', hint: 'Fans ↑ · Burnout ↑', effects: { fans: 300, burnout: 8 },
          outcome: 'Ten thousand people in white hats. Clementine plays a reel so fast a chuckwagon driver stops to listen. You steal the day.' },
        { label: 'Demand the headline', hint: 'Gamble: Sheldon has influence',
          outcome: 'Earl phones the Stomp board. He knew the chair in 1979.',
          roll: { chance: 0.3,
            success: { effects: { fans: 400, buzz: 18 }, outcome: 'Buckle & Boot are moved to the afternoon. Brayden says "respect, bud" and means about half of it.' },
            fail: { effects: { buzz: -5, mood: { earl: -6 } }, outcome: 'The chair remembers Earl. Not fondly. The afternoon slot is now 11 a.m. It is still a slot.' } } },
        { label: 'Play the pancake breakfast', hint: 'Chemistry ↑ · Fans ↑', effects: { chemistry: 6, fans: 150 },
          outcome: 'A 7 a.m. set for five thousand people eating pancakes off paper plates. Duke is served first. The hat gets a pancake.' }
      ] },
    { id: 'grr_s_canola_video', type: 'money', speaker: 'duke', title: 'The Video Shoot', gate: g({ era: S }),
      text: "The label wants a music video: the band in a canola field at golden hour, a drone, a slow-motion hat toss. $1,500 from the budget. " +
        "The director has never been to Saskatchewan. He has asked where the mountains are. Duke has said 'behind you'.",
      choices: [
        { label: 'Shoot it ($1,500)', hint: '−$1,500 · Fans ↑ · Buzz ↑', effects: { fund: -1500, fans: 300, buzz: 12 },
          outcome: 'The hat toss takes forty takes. The last one is perfect: the hat in the sun, the Quonset behind, Biscuit catching it. A classic.' },
        { label: 'Shoot it ourselves', hint: 'Gamble: a phone and a ladder',
          outcome: 'Vern holds the ladder. Duke throws the hat.',
          roll: { chance: 0.5,
            success: { effects: { buzz: 15, fans: 200 }, outcome: 'Shaky, honest, gorgeous. Fans call it "the real one". The label pretends it was their idea.' },
            fail: { effects: { burnout: 8, buzz: -4 }, outcome: 'Mostly footage of the ladder. The hat is in one frame. The label reshoots it. Everyone is annoyed.' } } },
        { label: 'No video. Play live.', hint: 'Chemistry ↑', effects: { chemistry: 5, buzz: -3 },
          outcome: 'You post one live take from the Quonset instead. It is loved by the people who already love you. The label sighs.' }
      ] },
    { id: 'grr_s_hat_endorsement', type: 'money', speaker: 'duke', title: 'Brim & Proper Wants Duke', gate: g({ era: S }),
      text: "Brim & Proper, the hat company, wants an endorsement: $1,200 and a signature model called 'The Duke'. The hat would have its own " +
        "line. Duke is torn. The hat on his head is not a Brim & Proper. It is his grandfather's. It is not for sale in any sense.",
      choices: [
        { label: 'Take it (+$1,200)', hint: '+$1,200 · Duke ↓', effects: { fund: 1200, mood: { duke: -8 } },
          outcome: "'The Duke' sells out in a week. Duke wears it once for the photo and then puts his grandfather's back on. It feels right." },
        { label: 'Only if they copy the real one', hint: 'Gamble: a hatmaker in the Quonset',
          outcome: 'A hatmaker drives out to measure the original.',
          roll: { chance: 0.5,
            success: { effects: { fund: 1000, buzz: 12, mood: { duke: 10 } }, outcome: 'The replica is perfect. Grandpa Harlan gets a credit on the label. Duke cries in the Quonset.' },
            fail: { effects: { mood: { duke: -10 } }, outcome: 'The replica is two sizes too small and "sporty". Duke declines. The hatmaker keeps calling.' } } },
        { label: 'No. The hat is not for sale.', hint: 'Duke ↑↑ · Chemistry ↑', effects: { mood: { duke: 16 }, chemistry: 5 },
          outcome: 'Duke says it in the voice of a man turning down a bribe. The band applauds. Clementine says "bravo" and means it.' }
      ] },
    { id: 'grr_s_earl_documentary', type: 'fame', speaker: 'earl', title: 'I Played on That', gate: g({ era: S }),
      text: "A filmmaker from Winnipeg wants to make a documentary about Earl: 'I Played on That: The Earl Nakamura-Pike Story'. Fifty years of " +
        "sessions. The filmmaker has checked. Earl really did play on most of them. Nobody believed him. Travis Lee is weeping.",
      choices: [
        { label: 'Do the documentary', hint: 'Buzz ↑ · Earl ↑↑', effects: { buzz: 15, mood: { earl: 18 }, burnout: 6 },
          outcome: 'Earl tells every story on camera, and the archive proves every one. The band watches the premiere. Nobody says "1979" the same way again.' },
        { label: 'Only if the band is in it', hint: 'Gamble: Earl shares the spotlight',
          outcome: 'Earl insists the Ramblers are "the last chapter".',
          roll: { chance: 0.6,
            success: { effects: { fans: 400, buzz: 12 }, outcome: 'The last twenty minutes are the Quonset. The film wins a prize in Winnipeg. Fans come for Earl, stay for the hat.' },
            fail: { effects: { buzz: 5, mood: { earl: -4 } }, outcome: 'The filmmaker cuts the band to one shot of Duke\'s hat. Earl is furious on your behalf. Very Earl.' } } },
        { label: 'Earl says no', hint: 'Chemistry ↑', effects: { chemistry: 6 },
          outcome: "Earl says the stories are for the van. The filmmaker leaves. Earl tells you the real version of 1979 on the drive home. It's better." }
      ] },
    { id: 'grr_s_masterclass', type: 'drama', speaker: 'clementine', title: 'The Masterclass', gate: g({ era: S }),
      text: "Clementine's old conservatory in Montreal has invited her to give a masterclass on 'folk fiddle'. The same faculty who told her " +
        "country music was 'a waste of a bow arm'. She is holding the letter with two fingers, like a dead mouse.",
      choices: [
        { label: 'Go, and play a hoedown', hint: 'Clementine ↑↑ · Buzz ↑', effects: { mood: { clementine: 16 }, buzz: 10 },
          outcome: 'She plays "Orange Blossom Special" at a concert hall tempo, then explains it with Bach. The faculty stands. She does not bow.' },
        { label: 'Take the band', hint: 'Gamble: a Quonset band in a conservatory',
          outcome: 'The Ramblers play the recital hall. You bring a hay bale.',
          roll: { chance: 0.5,
            success: { effects: { fans: 300, chemistry: 6 }, outcome: 'Forty violin students discover country. Three of them ask Clementine to teach them to yeehaw. She does, properly.' },
            fail: { effects: { mood: { clementine: -8 } }, outcome: 'The hay bale is not allowed on the stage. Neither is the hat. Clementine teaches the class alone, furious.' } } },
        { label: 'Decline, gracefully', hint: 'Chemistry ↑', effects: { chemistry: 4, mood: { clementine: 4 } },
          outcome: 'She writes a gracious decline and mails it with a Ramblers shirt. The dean wears it to a faculty meeting. It is noticed.' }
      ] },
    { id: 'grr_s_travis_farm', type: 'money', speaker: 'travis', title: 'Travis Wants a Farm', gate: g({ era: S }),
      text: "Travis Lee has found a quarter section for sale near Gull Lake: a house, a barn, a windbreak, $1,500 down to hold it. He wants the " +
        "band to have a real farm. He has never farmed. He has read four books. He has a very serious face.",
      choices: [
        { label: 'Put the money down ($1,500)', hint: '−$1,500 · Travis ↑↑ · Chemistry ↑', effects: { fund: -1500, mood: { travis: 18 }, chemistry: 4 },
          outcome: 'The band owns a barn. Travis Lee moves in with Loretta the truck. He learns to fix a fence. The songs get quieter and better.' },
        { label: 'Rent Vern\'s old house instead', hint: '−$300 · Travis ↑', effects: { fund: -300, mood: { travis: 10 } },
          outcome: "Vern's empty farmhouse, $300 for the year. Travis Lee paints it. He plants a garden. The deer eat it. He writes about the deer." },
        { label: 'Not yet, Travis', hint: 'Travis ↓', effects: { mood: { travis: -8 } },
          outcome: 'He drives past the quarter every Sunday in Loretta. One Sunday it sells. He writes "Somebody Else\'s Windbreak". It charts.' }
      ] },
    { id: 'grr_s_radio_tour', type: 'fame', speaker: 'grr_dolores', title: 'The Prairie Radio Tour', gate: g({ era: S }),
      text: "Dolores has set up a radio tour: twelve country stations in six days, Brandon to Lethbridge, every morning show, live. Earl wants " +
        "to drive. Twenty under. With markers. Dolores has done the math and it does not work.",
      choices: [
        { label: 'Earl drives. All twelve.', hint: 'Fans ↑ · Burnout ↑↑', effects: { fans: 300, burnout: 16 },
          outcome: 'You make all twelve by leaving at 2 a.m. every night. Every host asks about the hat. Every station plays the truck song.' },
        { label: 'Phone in from the Quonset', hint: 'Fans ↑ · Chemistry ↑', effects: { fans: 150, chemistry: 4 },
          outcome: 'Twelve phone-ins from the Quonset kitchen. Biscuit barks on three of them. Listeners ask about Biscuit.' },
        { label: 'Only the big three', hint: 'Buzz ↑', effects: { buzz: 10, burnout: 5 },
          outcome: 'Regina, Calgary, Winnipeg. Clementine plays live on each. The Winnipeg host asks her to marry him. On air. She says "non".' }
      ] },
    { id: 'grr_s_tribute_band', type: 'weird', speaker: 'duke', title: 'The Grid Road Rumblers', gate: g({ era: S }),
      text: "There is a tribute band. They call themselves the Grid Road Rumblers, after the misprint shirts, and they play the Legion circuit " +
        "in Manitoba. Their Duke has a bigger hat than Duke. Duke has seen the photo. Duke has been quiet for a day.",
      choices: [
        { label: 'Go see them play', hint: 'Chemistry ↑ · Buzz ↑', effects: { chemistry: 6, buzz: 8 },
          outcome: 'You sit in the back of a Brandon Legion. They are good. Their Earl tells a 1979 story. It is not Earl\'s story. Earl is livid.' },
        { label: 'Sue them', hint: 'Gamble: Lawyers vs. Legion',
          outcome: 'Earl knows a lawyer from 1979.',
          roll: { chance: 0.4,
            success: { effects: { fund: 600, buzz: 5 }, outcome: 'They settle for a licence fee: $600 a year, paid in Legion meal tickets and cash. Fair.' },
            fail: { effects: { buzz: -8, fund: -400 }, outcome: 'The judge is a fan. Of the Rumblers. You pay costs. Duke buys a bigger hat. It is too big.' } } },
        { label: 'Challenge them to a hat-off', hint: 'Duke ↑↑ · Fans ↑', effects: { mood: { duke: 16 }, fans: 200 },
          outcome: 'A hat-off at the Brandon fair. Measuring tape, a judge, a crowd. Their hat is bigger. Duke\'s hat is better. The crowd decides.' }
      ] },
    { id: 'grr_s_slim_duet', type: 'fame', speaker: 'earl', title: 'Slim Wants a Duet', gate: g({ era: S, minFans: 3000 }),
      text: "Slim Tumbleweed, the yodeller Earl backed in 1979, is eighty-one, touring one last time, and wants Earl for a duet at his farewell " +
        "show in Medicine Hat. Just Earl. Earl says Slim owes him forty dollars from 1979. He says it fondly.",
      choices: [
        { label: 'Earl goes', hint: 'Earl ↑↑ · Buzz ↑', effects: { mood: { earl: 18 }, buzz: 10 },
          outcome: 'Earl and Slim, two chairs, one mic. Slim yodels. Earl plays the solo from 1979, note for note. Slim pays him the forty dollars. On stage.' },
        { label: 'The Ramblers back them', hint: 'Fans ↑ · Burnout ↑', effects: { fans: 250, burnout: 8 },
          outcome: 'You back Slim for his whole farewell set. He calls you "the young people" and means Earl. Clementine yodels on the last one.' },
        { label: 'Record it for an album', hint: 'Gamble: a live duet',
          outcome: 'You set up two mics at the side of the stage.',
          roll: { chance: 0.5,
            success: { effects: { buzz: 15, fans: 300 }, outcome: 'The recording is perfect. It becomes the hidden last track on your next album. People play it at funerals. In a good way.' },
            fail: { effects: { mood: { earl: -6 } }, outcome: 'The batteries die before the yodel. Earl never says it was your fault. He says it with his eyes.' } } }
      ] },
    { id: 'grr_s_tour_bus', type: 'drama', speaker: 'earl', title: 'Earl Will Not Ride the Bus', gate: g({ era: S }),
      text: "The label has rented a tour bus. Earl will not ride in it. He wants to drive {van} behind the bus, at twenty under, alone, with " +
        "the atlas. 'I drove behind a bus for Slim Tumbleweed in 1979. The bus is where friendships go to die.'",
      choices: [
        { label: 'Everyone rides with Earl', hint: 'Chemistry ↑ · Burnout ↑', effects: { chemistry: 8, burnout: 10 },
          outcome: 'The bus carries the gear. The band rides in {van} behind it, reading markers. The bus driver waits at every one. He is learning a lot.' },
        { label: 'Earl drives alone', hint: 'Earl ↑ · Chemistry ↓', effects: { mood: { earl: 10 }, chemistry: -4 },
          outcome: 'Earl arrives at every gig an hour after soundcheck, happy, with a new story about a marker. He never misses the first song.' },
        { label: 'Bribe him with a bus atlas', hint: 'Gamble: Earl and a new atlas',
          outcome: "You give Earl the bus. And a brand-new road atlas.",
          roll: { chance: 0.4,
            success: { effects: { mood: { earl: 8 }, chemistry: 5 }, outcome: 'He takes the front seat of the bus and navigates for the driver. Twenty under. The bus is late everywhere. Everyone is happy.' },
            fail: { effects: { mood: { earl: -8 } }, outcome: 'He reads the new atlas, finds three errors, writes to the publisher and drives {van} anyway.' } } }
      ] },
    { id: 'grr_s_charity_hockey', type: 'fame', speaker: 'bb_brayden', title: 'Hockey Night vs. B&B', gate: g({ era: S }),
      text: "A charity hockey game at the Swift Current rink: the Ramblers against Buckle & Boot. Brayden and Colt played junior. You did not. " +
        "Duke insists on playing in the hat. Clementine has never skated. Earl says he played goal in 1966. He is seventy.",
      choices: [
        { label: 'Play to win', hint: 'Gamble: two junior players and a mascot',
          outcome: 'Titan Tim is their goalie. The costume covers the whole net.',
          roll: { chance: 0.3,
            success: { effects: { fans: 400, buzz: 18 }, outcome: 'Earl stops forty shots in borrowed pads. Travis scores off Titan Tim\'s bumper. The rink explodes. Brayden hugs Earl.' },
            fail: { effects: { fans: 150, burnout: 10 }, outcome: 'You lose 14-2. Both goals are Clementine, who skated like a figure skater. The charity makes $20,000. Everyone wins, except you.' } } },
        { label: 'Play for laughs', hint: 'Fans ↑ · Chemistry ↑', effects: { fans: 200, chemistry: 6 },
          outcome: 'Duke skates in the hat. It never falls off. Brayden falls doing a hockey stop. The crowd loves both teams. The rink gets new boards.' },
        { label: 'Sing the anthem instead', hint: 'Buzz ↑ · Travis ↑', effects: { buzz: 10, mood: { travis: 8 } },
          outcome: 'Travis Lee sings the anthem at centre ice with Clementine on fiddle. Brayden takes off his helmet. Colt takes off his helmet. Respect.' }
      ] },

    // ---- Signed: label cards (sim flag `label`); demand cards write flags.demand<Kind> (labels.demandsByBand below) --------
    { id: 'signed_grr_monolith_radio', type: 'drama', speaker: 'earl', title: 'The Radio Edit', weight: 2,
      gate: g({ era: S, flagEquals: { label: 'monolith' } }),
      text: "Monolith has notes. The single is 4:40. Radio wants 3:10. The cuts: the fiddle break, Earl's solo and 'the part where Earl " +
        "talks'. Earl has read the notes and is quietly polishing his guitar. That is how you know he is angry.",
      choices: [
        { label: 'Cut the talking only', hint: 'Fans ↑ · Earl ↓', effects: { fans: 150, mood: { earl: -8 }, flags: { demandRadio: 'half' } },
          outcome: "The radio edit keeps the solo and loses the story. It charts. Earl tells the story live every night instead. It gets longer." },
        { label: 'Refuse. It is 4:40.', hint: 'Earl ↑↑ · Buzz ↑ · promo ↓', effects: { mood: { earl: 14 }, buzz: 6, fund: -400, flags: { demandRadio: 'refused' } },
          outcome: 'Monolith trims the promo budget by $400. Dolores plays the full 4:40 on Speedy Creek 97 anyway. Every morning. Out of spite.' },
        { label: 'Earl edits it himself', hint: 'Gamble: a session legend with a razor',
          outcome: 'Earl asks for the tape and a razor blade. It is digital. He asks anyway.',
          roll: { chance: 0.5, stat: 'chemistry', statScale: 0.005,
            success: { effects: { fans: 250, buzz: 12, flags: { demandRadio: 'met' } }, outcome: 'Earl cuts it to 3:10 without losing a note that matters. The engineer applauds. Earl says he did it in 1979.' },
            fail: { effects: { buzz: -6, mood: { earl: -6 }, flags: { demandRadio: 'half' } }, outcome: 'His edit is 3:10, but it is only the solo. Monolith sends it back with a sad face emoji.' } } }
      ] },
    { id: 'signed_grr_monolith_image', type: 'drama', speaker: 'duke', title: 'The Hat Must Go', weight: 2,
      gate: g({ era: S, flagEquals: { label: 'monolith' } }),
      text: "An image consultant from Monolith has flown in. She has a mood board. The mood board has Duke on it, without the hat. 'It's " +
        "distracting,' she says. 'It's the brand,' says Duke. The consultant is looking at the hat. The hat is looking back.",
      choices: [
        { label: 'The hat stays', hint: 'Duke ↑↑ · Buzz ↑ · promo ↓', effects: { mood: { duke: 14 }, buzz: 6, fund: -400, flags: { demandImage: 'refused' } },
          outcome: "Duke puts the hat back on in front of the consultant, slowly. She writes 'non-negotiable' on the board. Monolith trims the promo." },
        { label: 'A smaller hat, for photos', hint: 'Fans ↑ · Duke ↓', effects: { fans: 150, mood: { duke: -10 }, flags: { demandImage: 'half' } },
          outcome: 'Duke wears a normal-sized hat for the press photos. He looks like a stranger. Fans write in asking if he is ill.' },
        { label: 'Make the hat the brand', hint: 'Gamble: the consultant is open-minded',
          outcome: 'Clementine argues, in fluent marketing, that the hat IS the image.',
          roll: { chance: 0.5, stat: 'buzz', statScale: 0.005,
            success: { effects: { fans: 250, buzz: 12, flags: { demandImage: 'met' } }, outcome: 'The consultant rebuilds the whole campaign around the hat. The album cover is the hat. Duke is overwhelmed.' },
            fail: { effects: { buzz: -4, mood: { duke: -6 }, flags: { demandImage: 'half' } }, outcome: 'The consultant agrees, then photoshops a smaller hat on. Duke finds out on a billboard in Regina.' } } }
      ] },
    { id: 'signed_grr_monolith_duet', type: 'drama', speaker: 'travis', title: 'A Duet for Reach', weight: 2,
      gate: g({ era: S, flagEquals: { label: 'monolith' } }),
      text: "Monolith wants a duet 'for reach'. The partner they have chosen is Brayden from Buckle & Boot, who is 'trending'. The song is " +
        "called 'Hay Bales and Tailgates'. Travis Lee has gone pale. Earl has gone out to the truck to be alone.",
      choices: [
        { label: 'Do the duet', hint: 'Fans ↑ · Travis ↓', effects: { fans: 250, mood: { travis: -10 }, flags: { demandFeature: 'met' } },
          outcome: 'Travis and Brayden sing it in the same booth, not looking at each other. It charts. Brayden texts "respect bud". Travis replies "ok".' },
        { label: 'A duet with Clementine instead', hint: 'Gamble: pitch it back to Monolith',
          outcome: 'You pitch a Travis and Clementine duet instead.',
          roll: { chance: 0.5,
            success: { effects: { fans: 200, buzz: 10, flags: { demandFeature: 'half' } }, outcome: 'Monolith agrees. It is the most beautiful thing on the album. Brayden covers it on a tailgate. It is not as good.' },
            fail: { effects: { buzz: -3, flags: { demandFeature: 'refused' } }, outcome: 'Monolith says "not trending". The duet stays in the Quonset. Duke says it is better that way.' } } },
        { label: 'No. Never.', hint: 'Chemistry ↑ · promo ↓', effects: { chemistry: 6, fund: -400, flags: { demandFeature: 'refused' } },
          outcome: 'Monolith cuts the promo. Brayden posts "their loss bud". Colt likes your post about it. Then unlikes it. Then likes it again.' }
      ] },
    { id: 'signed_grr_gopherwood_showcase', type: 'scene', speaker: 'earl', title: 'The Feed Store Showcase', weight: 2,
      gate: g({ era: S, flagEquals: { label: 'gopherwood' } }),
      text: "Gopherwood's Christmas showcase in Humboldt, in the old feed store: every band on the label, one song each, cider and a potluck. " +
        "Earl drives. It is a four-hour drive. Earl budgets seven. There are markers.",
      choices: [
        { label: 'Play the showcase', hint: 'Fans ↑ · Burnout ↑', effects: { fans: 150, burnout: 8, flags: { demandShowcase: 'met' } },
          outcome: 'One song, the waltz. The feed store goes silent. Wendell wipes his eye with a flannel sleeve and signs you for another year.' },
        { label: 'Play the whole potluck', hint: 'Chemistry ↑ · Fans ↑', effects: { chemistry: 6, fans: 100, flags: { demandShowcase: 'met' } },
          outcome: 'Two hours of carols and country for the whole label. Duke brings a roast. Earl tells the 1979 story. Wendell has heard it. He laughs anyway.' },
        { label: 'Skip it: weather', hint: 'Burnout ↓ · Gopherwood ↓', effects: { burnout: -6, flags: { demandShowcase: 'refused' } },
          outcome: 'A storm closes the highway. Wendell understands. He mails you a potluck plate wrapped in foil. It arrives in March.' }
      ] },
    { id: 'signed_grr_diy_quonset', type: 'money', speaker: 'duke', title: 'Mail Order From the Quonset', weight: 2,
      gate: g({ era: S, flagEquals: { label: 'diy' } }),
      text: "DIY means shipping the album yourselves: four hundred orders, one Quonset, one roll of packing tape. Duke has set up a table next " +
        "to the hay bales. Vern has offered the post-office run in the tractor. The post office is eleven kilometres away.",
      choices: [
        { label: 'Everyone packs', hint: '+$600 · Burnout ↑', effects: { fund: 600, burnout: 8 },
          outcome: 'Four hundred parcels in two nights. Each one has a hay stem in it by accident. Fans say it smells like a farm. They love it.' },
        { label: 'Hand-deliver the local ones', hint: '+$400 · Fans ↑', effects: { fund: 400, fans: 80, burnout: 6 },
          outcome: 'Earl delivers the southwest orders himself, at twenty under, with a story per doorstep. Some fans invite him in. He accepts all.' },
        { label: 'Wilf runs it', hint: '+$500 · Everyone ↑', effects: { fund: 500, mood: { all: 4 } },
          outcome: "Wilf runs it from coffee row with a clipboard. Credit on the album: 'Logistics: Wilf'. Two parcels go to Regina by mistake." }
      ] },

    // ---- Q8 cross-band cameos (they name another playable band) -------------------------------------------------------
    { id: 'grr_cameo_frost_heave', cameo: true, type: 'scene', speaker: 'earl', title: 'A Van Called the Pothole', gate: g({ era: LS, minFans: 300 }),
      text: "A punk band from Regina has broken down on the Trans-Canada outside Swift Current. It is Frost Heave. Their bassist lives in the " +
        "van and will not let anyone touch it. Their singer is at the Co-op with a megaphone, complaining about the highway.",
      choices: [
        { label: 'Earl helps with the van', hint: 'Chemistry ↑ · Earl ↑', effects: { chemistry: 5, mood: { earl: 8 } },
          outcome: 'Earl and their bassist fix the van without a word. She lets him in. Knocks first. It is the most respectful thing you have ever seen.' },
        { label: 'Invite them to the Quonset', hint: 'Fans ↑ · Buzz ↑', effects: { fans: 40, buzz: 8, burnout: 5 },
          outcome: 'Punk and country, one Quonset, two drummers. Their guitarist refuses to learn a third chord. Clementine respects it, somehow.' },
        { label: 'Let them sort it out', hint: 'Burnout ↓', effects: { burnout: -5 },
          outcome: 'They get towed to Moose Jaw. Their singer shouts about the tow fees from the tow truck. Duke tips his hat. It feels historic.' }
      ] },
    { id: 'grr_cameo_gravel_kings', cameo: true, type: 'weird', speaker: 'duke', title: "It's 1985 at the Rodeo", gate: g({ era: LS, weekOfYear: [1, 4] }),
      text: "At the Maple Creek rodeo a man in leather pants is asking to ride a bull. It is Chase from Gravel Kings, the Edmonton rock band, in " +
        "town for a show. He believes it is 1985. He would like to borrow Duke's hat 'for the ride'.",
      choices: [
        { label: 'Absolutely not', hint: 'Duke ↑ · Buzz ↑', effects: { mood: { duke: 8 }, buzz: 4 },
          outcome: "Chase rides in his own hair, which does not move either. He lasts four seconds and gets up yelling 'ROCK'. Duke respects him now." },
        { label: 'Lend him a spare hat', hint: 'Chemistry ↑', effects: { chemistry: 4, fund: -15 },
          outcome: "He sends it back from Edmonton with a note: 'Rock on, Swift Current. It's 1985 forever.' Duke frames the note, not the hat." },
        { label: 'Jam at the beer garden', hint: 'Gamble: country meets hair rock',
          outcome: 'Chase follows you to the beer-garden stage.',
          roll: { chance: 0.5,
            success: { effects: { fans: 30, buzz: 8 }, outcome: 'A power ballad with a fiddle solo. Chase and Travis sing into the same mic. The rodeo clowns cry.' },
            fail: { effects: { burnout: 5, mood: { earl: -4 } }, outcome: 'Chase plays a nine-minute solo on Earl\'s guitar. Earl says he played with a guy like that in 1985. It did not end well.' } } }
      ] },
    { id: 'grr_cameo_hail_damage', cameo: true, type: 'scene', speaker: 'grr_wilf', title: 'Metal at the Co-op', gate: g({ era: LS, minFans: 500 }),
      text: "Wilf reports that a metal band from Saskatoon, Hail Damage, stopped at the Co-op in a dented minivan with a moose painted on it. " +
        "Their singer was in a cape. At 6:40 a.m. Coffee row has been discussing the cape for two days.",
      choices: [
        { label: 'Invite them for coffee row', hint: 'Buzz ↑ · Chemistry ↑', effects: { buzz: 6, chemistry: 3 },
          outcome: 'The cape sits at the end of coffee row. The farmers ask about hail insurance. It turns out the singer adjusts claims. He is a hit.' },
        { label: 'Trade a hat for a cape', hint: 'Duke ↓ · Buzz ↑', effects: { buzz: 8, mood: { duke: -4 } },
          outcome: 'Duke trades a spare hat for a spare cape. He wears it once, at a harvest dance. It is a lot. The hat is still more.' },
        { label: 'Leave them be', hint: 'Burnout ↓', effects: { burnout: -4 },
          outcome: 'They drive off toward Medicine Hat. Wilf waves. Somewhere on the Trans-Canada the cape flies out of the sliding door.' }
      ] }
  ]);

  /* ======================================================================================================================
     Shop (forced by GG.shop through career.variant '<id>_grid_road_ramblers'; never drawn). Same gates as the base cards.
     ====================================================================================================================== */
  addCards(list(K, 'shopCards'), [
    { id: 'money_merch_misprint_grid_road_ramblers', type: 'money', speaker: 'duke', title: 'THE GRID ROAD RUMBLERS', gate: g({ era: ALL }),
      text: "Your first box of band shirts is back from the print shop in Swift Current. Every one says THE GRID ROAD RUMBLERS. The shop says " +
        "'that's what you wrote'. Clementine has the order form. It's what Duke wrote. Duke says 'Rumblers' is 'more rugged'.",
      choices: [
        { label: 'Box them up. Someday.', hint: 'Keep the misprints · maybe worth $$$ later', effects: { mood: { duke: 3 }, shop: { misprint: 'boxed' } },
          outcome: "The box goes in the Quonset behind the square baler with RUMBLERS on it in marker. Duke says misprints are worth money someday." },
        { label: 'Pay for a reprint ($100)', effects: { fund: -100, mood: { clementine: 5 }, shop: { misprint: 'reprint' } },
          outcome: 'The reprint says RAMBLERS, correctly, in western slab letters. Clementine proofread it three times. In two languages.' },
        { label: 'Wear them to rehearsal', effects: { chemistry: 5, mood: { all: 3 }, shop: { misprint: 'wear' } },
          outcome: "The Grid Road Rumblers becomes the band's secret name. Earl says he played in a band called the Rumblers in 1979. He did not." }
      ] },
    { id: 'shop_merch_start_grid_road_ramblers', type: 'money', speaker: 'travis', title: 'The Merch Table', gate: g({ era: ['garage', 'local'], minWeek: 4 }),
      text: "Travis Lee has designed a shirt: a grid road running to the horizon, a Quonset, a truck. It is his truck. He drew it before he had " +
        "one. Duke points out that bands pay for gas with merch. Duke would also like a hat design. Just a hat. On a shirt.",
      choices: [
        { label: 'Order a box of shirts', hint: '−$192 · 24 shirts for the merch table', effects: { fund: -192, shop: { stock: { shirt: 1 } } },
          outcome: 'Twenty-four shirts, the grid road and the truck. Travis Lee wears one to the Co-op. Somebody asks where he got it. He glows.' },
        { label: 'Stickers first', hint: '−$80 · 200 stickers', effects: { fund: -80, shop: { stock: { sticker: 1 } } },
          outcome: 'Two hundred stickers. Duke puts one on every grain bin between the Quonset and town. Vern finds eleven on his combine.' },
        { label: 'Not yet', effects: { mood: { travis: -4 } },
          outcome: 'Travis Lee tapes the design to the Quonset wall. It watches you rehearse. The truck on it is very shiny.' }
      ] },
    { id: 'shop_pawn_kit_grid_road_ramblers', type: 'money', speaker: 'earl', title: 'The Pawn Shop Kit', seat: ['drums'], gate: g({ era: ['garage', 'local'], minWeek: 8, minFund: 1100 }),
      text: "Earl calls from a pawn shop in Medicine Hat: a five-piece kit, shells that almost match, $800. 'Fella says $650 today. I played " +
        "with the drummer who pawned it. 1979. Good hands. The hay bale can stay, son. The milk crate cannot.'",
      choices: [
        { label: 'Buy it today ($650)', hint: '−$650 · a real kit: better sound', effects: { fund: -650, shop: { kit: 1 } },
          outcome: 'Earl drives it home at twenty under. It takes four hours. The first rehearsal on it sounds like a real band. Doris the horse approves.' },
        { label: 'Haggle', hint: 'Gamble: haggle him down',
          roll: { chance: 0.5, stat: 'chemistry', statScale: 0.005,
            success: { effects: { fund: -520, shop: { kit: 1 } }, outcome: "Earl tells the pawnbroker the whole 1979 story. $520, and he throws in a cowbell to make it stop. No gong." },
            fail: { effects: { mood: { earl: -5 } }, outcome: 'The pawnbroker sells it to a church drummer mid-story. Earl finishes the story anyway. For the drummer.' } },
          outcome: "Earl leans on the counter. 'Let me tell you about this kit.'" },
        { label: 'Not yet', effects: { mood: { earl: -4 } }, outcome: 'The milk crate creaks. Doris eats a corner of the hay bale. Earl drives home without the kit, slowly.' }
      ] },
    { id: 'shop_van_deal_grid_road_ramblers', type: 'money', speaker: 'grr_vern', title: 'The Hay Wagon', gate: g({ era: LSW, minFund: 4000 }),
      text: "The seed-cleaning co-op near Maple Creek is selling its 15-passenger van, trailer included: $3,000 and the old Suburban for parts. Vern " +
        "knows the manager. Earl has inspected the van twice and pronounced it 'a good honest vehicle'. It has a grain-dust smell.",
      choices: [
        { label: 'Buy the co-op van', hint: '−$3,000 · 15-passenger van + trailer', effects: { fund: -3000, shop: { van: 1 } },
          outcome: "Earl moves the atlas to the new dash first. Then the thermos. Then everyone else. The Suburban's stickers move over one by one." },
        { label: 'Let Vern haggle', hint: 'Gamble: Vern vs. the co-op manager',
          roll: { chance: 0.4,
            success: { effects: { fund: -2500, shop: { van: 1 } }, outcome: 'Vern throws in two days of harvest help. The manager knocks off $500 and a bag of seed oats.' },
            fail: { effects: { mood: { earl: -4 } }, outcome: 'The manager out-haggles Vern with silence. The van goes to a hockey team. Earl pats the Suburban all the way home.' } },
          outcome: 'Vern leans on the fence and says nothing for a long time.' },
        { label: 'Keep the old Suburban', effects: { chemistry: 2, mood: { earl: 3 } },
          outcome: "Earl pats the Suburban's dashboard. 'She has another million in her,' he says. At twenty under, she might." }
      ] },
    { id: 'shop_solo_grid_road_ramblers', type: 'drama', speaker: 'earl', title: 'Earl Insists', seat: ['drums', 'bass', 'rhythm'], gate: g({ era: LSW }),
      text: "Earl has written a solo. It is thirty-two bars. It has a story in the middle. He will only play it if the songs get a real solo " +
        "section. He is holding your {sticks} hostage. He has done this before. In 1979. To a better one, he says.",
      choices: [
        { label: 'Fine. A solo section.', hint: 'Solo section unlocked · Earl ↑', effects: { mood: { earl: 8 }, shop: { section: 'solo' } },
          outcome: 'Earl returns the {sticks} and plays you the solo. It is thirty-two bars of pure twang. The story in the middle is optional. It is not.' },
        { label: 'Only with a fiddle answer', hint: 'Solo unlocked · Earl ↑ · Clementine ↑', effects: { mood: { earl: 5, clementine: 5 }, chemistry: -2, shop: { section: 'solo' } },
          outcome: 'Guitar, then fiddle, trading fours. It turns into a duel. Nobody wins. The crowd is the winner. Earl says it was a tie. It was not.' },
        { label: 'No solos in this band', hint: 'Earl ↓↓', effects: { mood: { earl: -10 } },
          outcome: 'Earl returns the {sticks}. He plays the solo anyway, alone, in the Quonset, for Doris. She stays for the whole thing.' }
      ] },
    { id: 'shop_space_1_grid_road_ramblers', type: 'money', speaker: 'duke', title: 'A Room in Town', gate: g({ era: LSW }),
      text: "A real jam room has opened up in Swift Current, above the seed-cleaning plant: foam on the walls, a door that locks, $60 a week, " +
        "no horse. Uncle Vern is pretending not to listen from the tractor. Vern is listening.",
      choices: [
        { label: 'Move in ($60/week)', hint: 'Rent $60/wk · rehearsals count more', effects: { mood: { all: 4 }, shop: { move: 1 } },
          outcome: 'One trip in {van}, three trips in Vern\'s grain truck. Vern waves from the yard. He sends Biscuit along "for security".' },
        { label: 'Stay in the Quonset', hint: 'Free · move later from the Quonset door', effects: { chemistry: 2, mood: { duke: -3 } },
          outcome: 'The Quonset it is. Vern brings out a new heater without a word, like a peace treaty. Doris is visibly relieved.' }
      ] },
    { id: 'shop_space_2_grid_road_ramblers', type: 'money', speaker: 'clementine', title: 'A Real Studio Room', gate: g({ era: SW }),
      text: "A proper studio has a room: rehearsal space, an isolation booth, a coffee machine that works. $150 a week. Clementine has toured " +
        "the booth twice. She says the acoustics are 'nearly adequate'. It is the nicest thing she has ever said about a room.",
      choices: [
        { label: 'Move in ($150/week)', hint: 'Rent $150/wk · write + record better', effects: { mood: { all: 4 }, shop: { move: 2 } },
          outcome: "A real studio. The engineer hands out keys and a list of rules. Rule one: 'no livestock'. Duke asks about Biscuit. Exception granted." },
        { label: 'Not yet', effects: { mood: { clementine: -3 } }, outcome: 'Clementine keeps the brochure in her fiddle case, next to the Bach. For emergencies.' }
      ] },
    { id: 'shop_space_3_grid_road_ramblers', type: 'money', speaker: 'travis', title: 'Backstage, Forever', gate: g({ era: W }),
      text: "The arena offers a permanent room under the stands: a star on the door, showers, a loading bay big enough for a truck. $300 a week. " +
        "Travis Lee has already asked if the truck can live in the loading bay. The truck is his. It could live there.",
      choices: [
        { label: 'Move in ($300/week)', hint: 'Rent $300/wk · rest like royalty', effects: { mood: { all: 5 }, shop: { move: 3 } },
          outcome: 'Travis Lee parks his 1987 truck in the loading bay under the arena. The Zamboni driver admires it every morning. They are friends.' },
        { label: 'Stay where we are', effects: { mood: { travis: -5 } }, outcome: 'Travis Lee paints a star on the Quonset door himself. It is crooked. Duke says it is "country crooked". Good crooked.' }
      ] }
  ]);

  /* ======================================================================================================================
     Drama (27_sim_drama): wants (rules truck / stories / secretJoy / hat + spotlight / solos / practice / freedom), stage
     lines, exit storylines, epilogues, and the ultimatum / return / return-filled cards. Rival outcomes say {rival}.
     ====================================================================================================================== */
  function mfx(extra, id, act) { var o = { member: { id: id, act: act } }; for (var k in extra) o[k] = extra[k]; return o; }
  function back(id) { return { member: { id: id, act: 'return' } }; }
  var DR = obj(K, 'drama');
  members(obj(DR, 'members'), {
    travis: {
      wants: [
        { id: 'truck', text: 'A real truck, the truck ad, and rooms out where the grid roads are. Rural halls, not city bars.', gripe: 'trucks', rule: 'truck' },
        { id: 'spotlight', text: 'To sing the song he wrote, the whole way through, with the hat NOT in front of him.', gripe: 'the spotlight', rule: 'spotlight' }
      ],
      grumble: [
        "We played three city bars in a row. I haven't seen a grain elevator in two weeks. I can feel my twang leaving.",
        "Buckle & Boot are in another truck ad. That's five. I counted. I have a chart.",
        "Somebody parked in front of the Quonset and blocked my truck. It was me. I'm still upset."
      ],
      passive: [
        'Great show everyone! Especially the part where I sang. Behind the hat. 🙂',
        "No, it's fine. I'll just write another truck song about this. 🙂",
        "Updated my bio to 'available for ranch weddings'. No reason."
      ],
      ultimatum: 'ult_travis', 'return': 'ret_travis', returnFilled: 'ret_travis_filled',
      exit: {
        id: 'jingles', returnAfter: [12, 22],
        status: 'Writing truck jingles for Prairie Titan in Red Deer. Buckle & Boot sing them. He has never been more miserable or better paid.',
        quitLine: { who: 'travis', text: "Prairie Titan offered me a job writing jingles. In Red Deer. With a company truck. I'm sorry. It has power windows." },
        beats: [
          { at: 3, who: 'grr_dolores', text: "Heard the new Prairie Titan jingle on the air. That's Travis Lee's chorus. Buckle & Boot are singing it wrong." },
          { at: 8, who: 'travis', text: 'I wrote a jingle about a tailgate today. Brayden cried. Then he asked me to write another. I miss the hay.' },
          { at: 13, who: 'bb_brayden', text: "Travis Lee rhymed 'tailgate' with 'fate' in a jingle. Sheldon says it's 'too sad for trucks'. Respect, bud." }
        ],
        changed: 'Back from Red Deer. Can write a hook in eight seconds now, and hates that he can.',
        backLine: { who: 'travis', text: "I quit Prairie Titan. I left the company truck in the lot. I walked to the highway. Earl picked me up. Twenty under." }
      },
      epilogue: 'Travis Lee buys the farm near Gull Lake, drives a 1987 truck to church every Sunday and never once stalls it. He still lives in a song.'
    },
    earl: {
      wants: [
        { id: 'stories', text: 'Long drives, markers, and somebody in the passenger seat to hear the whole story. All of it.', gripe: 'the stories', rule: 'stories' },
        { id: 'solos', text: 'A proper solo in every song. Thirty-two bars. With room for a story in the middle.', gripe: 'solos', rule: 'solos' }
      ],
      grumble: [
        "Drove three hours yesterday. Nobody asked about the markers. There were eleven. One was about a flood.",
        "In 1979 a solo was thirty-two bars. Now it's eight. I'm not saying anything. I'm saying it.",
        "Somebody moved my atlas. It was on page 42. We live on page 42."
      ],
      passive: [
        'Lovely show, kids. Especially the solo. Which was cut. 🙂',
        "No, it's fine, I'll tell the story to the steering wheel. 🙂",
        "An old friend in Calgary called. Just to talk. About sessions. No reason."
      ],
      ultimatum: 'ult_earl', 'return': 'ret_earl', returnFilled: 'ret_earl_filled',
      exit: {
        id: 'memoir', returnAfter: [12, 20],
        status: "Writing his memoir, 'I Played on That', at his daughter's in Lethbridge. Chapter four is still 1979.",
        quitLine: { who: 'earl', text: "My daughter says I should write it all down before I forget. I won't forget. But she's right. I'm off to Lethbridge." },
        beats: [
          { at: 3, who: 'earl', text: 'Chapter one is done. It is about 1979. So is chapter two. My daughter says that is a lot of 1979.' },
          { at: 8, who: 'grr_wilf', text: "Earl mailed coffee row chapter three. It's forty pages about one session. We read it aloud. It was very good." },
          { at: 14, who: 'earl', text: 'Publisher wants to cut the stories. The book IS the stories. I have told them about 1979. They are reconsidering.' }
        ],
        changed: 'Back from Lethbridge with a finished memoir. Now tells the stories in chapter order, with page numbers.',
        backLine: { who: 'earl', text: "Book's done. Turns out I'd rather play on it than write about it. Pass me the atlas. We're on page 42." }
      },
      epilogue: 'At ninety, Earl plays his last session, for a kid from Swift Current. The liner notes say: "Earl Nakamura-Pike played on the original."'
    },
    clementine: {
      wants: [
        { id: 'secret_joy', text: 'To never be caught enjoying this. Rooms that go wild, so nobody notices her smiling.', gripe: 'being noticed', rule: 'secretJoy' },
        { id: 'practice', text: 'Proper rehearsal. Tuned instruments. A room that is not also a horse stall.', gripe: 'rehearsal', rule: 'practice' }
      ],
      grumble: [
        "Nobody tuned before the show. I tuned for everyone. Silently. You're welcome.",
        "The horse was in rehearsal again. The horse has better timing than some of us.",
        "Somebody posted a photo of me smiling. I was not smiling. It was the light."
      ],
      passive: [
        "Lovely show. I especially enjoyed not being photographed yeehawing. Oh wait. 🙂",
        "No, it's fine. I'll practise in the car. The car is in tune. 🙂",
        "Maman forwarded a symphony audition. I'm not going. I'm just saying it arrived."
      ],
      ultimatum: 'ult_clementine', 'return': 'ret_clementine', returnFilled: 'ret_clementine_filled',
      exit: {
        id: 'symphony', returnAfter: [12, 22],
        status: 'Second violins, back in the Montreal symphony. Nobody yeehaws. She has noticed.',
        quitLine: { who: 'clementine', text: "The symphony has a chair for me. It is a real chair. Not a hay bale. I'm going home. Tell Doris goodbye." },
        beats: [
          { at: 3, who: 'clementine', text: 'We played Mahler tonight. During the finale I tapped my foot on two and four. The conductor stopped the orchestra.' },
          { at: 8, who: 'grr_dolores', text: "A caller says the Montreal symphony did a pops night and the second violins yeehawed. One of them, anyway." },
          { at: 13, who: 'clementine', text: "I played a hoedown at the orchestra Christmas party. They loved it. I hated that they loved it. I miss the Quonset." }
        ],
        changed: 'Back from the symphony. Tunes the whole band before every show now, and yeehaws once a night, on purpose.',
        backLine: { who: 'clementine', text: "I yeehawed during Beethoven. They were very understanding. I was not. I'm back. Is the horse still here?" }
      },
      epilogue: 'Clementine founds the first classical-country fiddle school in the country, in a Quonset. The final exam is a yeehaw.'
    },
    duke: {
      wants: [
        { id: 'hat', text: 'Merch with the hat on it. Buzz about the hat. The hat, respected. A bigger hat, eventually.', gripe: 'the hat', rule: 'hat' },
        { id: 'freedom', text: 'Less rehearsal, more lunch. Three notes do not need that much practice.', gripe: 'rehearsing', rule: 'freedom' }
      ],
      grumble: [
        "The new shirts don't have the hat on them. I'm not upset. The hat is upset.",
        "Rehearsal ran through lunch again. A man has to eat. The hat has to eat.",
        "Somebody said 'nice cap' at the gig. Cap. I have been thinking about it for two days."
      ],
      passive: [
        'Great show! Loved the part where nobody mentioned the hat. 🙂',
        "No, it's fine, I'll wear a smaller hat. Just kidding. I would never. 🙂",
        "My uncle says the combine crew needs a hand. Just mentioning it."
      ],
      ultimatum: 'ult_duke', 'return': 'ret_duke', returnFilled: 'ret_duke_filled',
      exit: {
        id: 'harvest', returnAfter: [10, 18],
        status: "Custom combining across Manitoba with his uncle's crew. The hat rides on the combine cab. Farmers wave at it.",
        quitLine: { who: 'duke', text: "My uncle's crew needs a hand for harvest. Then another harvest. I'm taking the hat. The hat needs air." },
        beats: [
          { at: 3, who: 'grr_vern', text: "Duke's combining near Brandon. Says the hat got a sunburn. The hat. Not him. He says the hat is fine now." },
          { at: 9, who: 'duke', text: "Played bass at a harvest dance in Manitoba. Three notes. They loved it. Didn't feel the same. No drums.", seat: ['drums'] },
          { at: 9, who: 'duke', text: "Played bass at a harvest dance in Manitoba. Three notes. They loved it. Didn't feel the same. Nobody on {seat}.", seat: ['rhythm', 'lead'] },
          { at: 9, who: 'duke', text: "Sat in on drums at a harvest dance in Manitoba. The hat stayed on. They loved it. Didn't feel the same. No bass.", seat: ['bass'] }
        ],
        changed: "Back from harvest with a farmer's tan and a fourth note he learned from a fiddler in Brandon.",
        backLine: { who: 'duke', text: "Harvest's in. The hat and I talked it over. We're back. I brought a roast." }
      },
      epilogue: 'Duke opens a hat museum in Maple Creek. There is one exhibit. People drive from Alberta to see it. He charges nothing.'
    }
  });

  addCards(list(K, 'dramaCards'), [
    // ---- Ultimatums (stage 3): two fixes at a cost, or refuse and they quit ----
    { id: 'ult_travis', type: 'drama', speaker: 'travis', title: 'Travis Lee Has Demands',
      text: "Travis Lee has written his demands on the back of a Prairie Titan brochure. One: gigs in real country halls, not city bars. Two: " +
        "'RESPECT FOR THE TRUCK'. Prairie Titan has offered him a job writing jingles. He is holding the brochure very tightly.",
      choices: [
        { label: 'Country halls for a month', effects: mfx({ burnout: 4, mood: { travis: 15 } }, 'travis', 'settle'),
          outcome: 'The board is halls and rinks for a month. Travis Lee sings in every one like it is the Big Stomp. He has never been happier.' },
        { label: 'A truck song on the album', effects: mfx({ chemistry: 3, mood: { travis: 12 } }, 'travis', 'settle'),
          outcome: "The album opens with 'Loretta'. Nine minutes, about a truck. Clementine plays on it without complaint. Travis cries in the booth." },
        { label: 'Go write jingles, then', effects: mfx({ chemistry: -4 }, 'travis', 'quit'),
          outcome: "Travis Lee folds the brochure into a paper truck and drives it off the table. 'Fine. I'll write about tailgates. For money.'" }
      ] },
    { id: 'ult_earl', type: 'drama', speaker: 'earl', title: 'Earl Is Packing the Atlas',
      text: "Earl's guitar case is by the Quonset door. The atlas is on top. There is a note: 'Nobody listens to the stories anymore. " +
        "My daughter says I should write them down. In Lethbridge.' Earl is sitting in the Suburban with the engine off.",
      choices: [
        { label: 'A story at every show', effects: mfx({ mood: { earl: 15 }, buzz: -3 }, 'earl', 'settle'),
          outcome: 'Earl gets two minutes mid-set, every night, for a story. Crowds start requesting stories. He never uses just two minutes.' },
        { label: "Raise the band's cut (+5%)", effects: mfx({ payCut: 0.05, mood: { earl: 12 } }, 'earl', 'settle'),
          outcome: "Earl reads the new pay sheet. 'In 1979 they paid me in beer and a ride home. This is better.' He brings the case back in." },
        { label: 'Go to Lethbridge, then', effects: mfx({ chemistry: -4 }, 'earl', 'quit'),
          outcome: 'Earl nods, starts the Suburban and drives off at twenty under. It takes a very long time for him to be out of sight.' }
      ] },
    { id: 'ult_clementine', type: 'drama', speaker: 'clementine', title: 'The Symphony Letter',
      text: "Clementine has left a letter on your hay bale: an offer from the Montreal symphony, second violins, starting next month. On it, " +
        "in her handwriting: 'Convince me. Or don't. I will not be here next week either way unless something changes.'",
      choices: [
        { label: 'Tune everything, properly', effects: mfx({ fund: -180, mood: { clementine: 15 } }, 'clementine', 'settle'),
          outcome: 'New strings for everyone, a tuner on every instrument, the horse banned from rehearsal. She tears up the letter. Quietly.' },
        { label: 'A fiddle feature every show', effects: mfx({ burnout: -8, mood: { clementine: 12 } }, 'clementine', 'settle'),
          outcome: 'A solo spot every night. She plays Bach disguised as a reel. Nobody notices but you. She smiles at you once. Only once.' },
        { label: 'Take the chair, then', effects: mfx({ chemistry: -4 }, 'clementine', 'quit'),
          outcome: "Clementine packs the fiddle and the Bach. At the door she says 'tell Doris goodbye'. It is the saddest thing she has ever said." }
      ] },
    { id: 'ult_duke', type: 'drama', speaker: 'duke', title: 'The Hat Is on the Amp',
      text: "Duke has taken off the hat and put it on his amp, facing the wall. He has never done this. 'Nobody respects the hat,' he says. " +
        "'My uncle's harvest crew respects the hat. They leave Monday.' The Quonset is very quiet without the hat on.",
      choices: [
        { label: 'Hat merch, now ($180)', effects: mfx({ fund: -180, mood: { duke: 15 } }, 'duke', 'settle'),
          outcome: 'A hat pin, a hat shirt and a hat sticker by Friday. Duke puts the hat back on. The Quonset feels right again.' },
        { label: 'Less rehearsal, more lunch', effects: mfx({ burnout: -8, mood: { duke: 12 } }, 'duke', 'settle'),
          outcome: 'Rehearsal starts after lunch from now on. Lunch is long. Duke plays better fed. He says it was never about the lunch. It was.' },
        { label: 'Go combine, then', effects: mfx({ chemistry: -4 }, 'duke', 'quit'),
          outcome: 'Duke puts the hat back on, slowly, and walks to his uncle\'s truck. The hat does not look back. Duke does.' }
      ] },
    { id: 'ult_recruit_grid_road_ramblers', type: 'drama', speaker: 'recruit', title: '{recruit} Wants a Word', gate: only({}),
      text: "{recruit} catches you by the Quonset door. 'The ad said paid gigs and a rehearsal space. The space is a Quonset with a horse " +
        "in it. I've had other offers. Well, one. A wedding band in Medicine Hat. Their rehearsal space has a floor.'",
      choices: [
        { label: "Raise the band's cut (+5%)", effects: mfx({ payCut: 0.05, mood: { recruit: 15 } }, 'recruit', 'settle'),
          outcome: '{recruit} shakes your hand. The wedding band in Medicine Hat will have to find someone else to play the Chicken Dance.' },
        { label: 'Build a real floor ($60)', effects: mfx({ fund: -60, mood: { recruit: 12 } }, 'recruit', 'settle'),
          outcome: "Plywood over the dirt by {recruit}'s spot. {recruit} calls it 'the office'. Doris the horse stands on it anyway." },
        { label: 'The door is right there', effects: mfx({ chemistry: -3 }, 'recruit', 'quit'),
          outcome: '{recruit} packs up and pins a one-star review of the Quonset to the Co-op corkboard. Wilf leaves it up. It is fair.' }
      ] },

    // ---- Returns: an empty slot (welcome back / conditions / not yet) or a filled one (the original or the recruit) ----
    { id: 'ret_travis', type: 'drama', speaker: 'travis', title: 'The Condo Kid Comes Home',
      text: "Travis Lee is at the Quonset door with his acoustic and a Prairie Titan lanyard he is trying to take off. 'I wrote a jingle about " +
        "a tailgate,' he says. 'Brayden cried. I have to come home before I write another one.'",
      choices: [
        { label: 'Welcome home, Travis', effects: mfx({ chemistry: 4 }, 'travis', 'return'),
          outcome: 'Travis Lee sings the truck song in the doorway. Duke hums the bass. Clementine joins on the chorus. The Quonset is itself again.' },
        { label: 'Audition first', effects: mfx({ mood: { travis: -8 }, skill: { travis: 2 } }, 'travis', 'return'),
          outcome: 'He auditions with a new song about a jingle writer who misses a Quonset. He gets the gig. He was nervous. It showed. It helped.' },
        { label: 'Not yet, Travis', effects: mfx({ mood: { travis: -5 } }, 'travis', 'later'),
          outcome: 'Travis Lee sleeps in his truck in the Quonset yard for weeks, writing songs on the dash, until you are ready.' }
      ] },
    { id: 'ret_travis_filled', type: 'drama', speaker: 'travis', title: 'Somebody Sings My Truck Song',
      text: "Travis Lee is back from Red Deer. {recruit} is at his mic, singing his truck song. Singing it well. Travis is holding his guitar " +
        "case in the doorway. Somewhere in Red Deer, Sheldon is already dialling.",
      choices: [
        { label: 'Take Travis back', effects: back('travis'),
          outcome: '{recruit} hands back the song and leaves a thank-you card on the hay bale. Travis reads it aloud, with twang. The band is whole.' },
        { label: 'Keep {recruit}', effects: mfx({ mood: { recruit: 8 } }, 'travis', 'rival'),
          outcome: "Travis Lee leaves. Two weeks later {rival} announce a new songwriter: 'Travis Lee, formerly of the Ramblers'. He is holding a tailgate." }
      ] },
    { id: 'ret_earl', type: 'drama', speaker: 'earl', title: 'Page 42',
      text: "Earl is at the Quonset door with a finished manuscript under one arm and his guitar under the other. 'The book is done,' he says. " +
        "'Turns out I'd rather play on it than write about it. Where are we on the atlas?'",
      choices: [
        { label: 'Page 42, Earl. Welcome back.', effects: mfx({ chemistry: 4 }, 'earl', 'return'),
          outcome: 'Earl plugs in and plays the solo from 1979, note for note, then the one from last year. The band is whole. The atlas is open.' },
        { label: 'Back, but shorter stories', effects: mfx({ mood: { earl: -8 } }, 'earl', 'return'),
          outcome: 'He agrees. The next story is shorter. It is also much better. He will never say you were right. You were not, entirely.' },
        { label: 'Not yet', effects: mfx({ mood: { earl: -5 } }, 'earl', 'later'),
          outcome: 'Earl nods and drives to coffee row every morning to read chapter four to the farmers. They give notes.' }
      ] },
    { id: 'ret_earl_filled', type: 'drama', speaker: 'earl', title: 'Somebody Is Playing My Solo',
      text: "Earl is back from Lethbridge. {recruit} is playing his solo. The one from 1979. Almost right. Earl stands in the doorway listening " +
        "to the whole thing, very still. Then he says, gently: 'Second bar. It's a B.'",
      choices: [
        { label: 'Take Earl back', effects: back('earl'),
          outcome: '{recruit} is gracious and asks Earl to sign their guitar. Earl signs it "E.N.P., 1979 and now". The Quonset exhales.' },
        { label: 'Keep {recruit}', effects: mfx({ mood: { recruit: 8 } }, 'earl', 'rival'),
          outcome: "Earl leaves without a word. A month later {rival} have a new guitarist who 'played on the original'. It's Earl. He looks lost." }
      ] },
    { id: 'ret_clementine', type: 'drama', speaker: 'clementine', title: 'Is the Horse Still Here?',
      text: "Clementine is at the Quonset door with her fiddle case and a plane ticket stub from Montreal. 'I yeehawed during Beethoven,' she " +
        "says, flatly. 'They were very understanding. I was not. Is the horse still here?'",
      choices: [
        { label: 'Welcome back, Clem', effects: mfx({ chemistry: 4 }, 'clementine', 'return'),
          outcome: 'She tunes everyone before saying hello. Then she plays a reel so fast Doris the horse runs a lap of the yard. The band is whole.' },
        { label: 'Back, but you have to smile', effects: mfx({ mood: { clementine: -8 } }, 'clementine', 'return'),
          outcome: 'She agrees and does not smile for a month. On the thirty-first day she smiles during a waltz. Nobody says anything.' },
        { label: 'Not yet', effects: mfx({ mood: { clementine: -5 } }, 'clementine', 'later'),
          outcome: 'She rents a room in town and plays scales in the window every morning. Coffee row can hear it. Wilf reports daily.' }
      ] },
    { id: 'ret_clementine_filled', type: 'drama', speaker: 'clementine', title: 'Someone Has My Chair',
      text: "Clementine is back. {recruit} is sitting on her hay bale, playing her fills, out of tune. Clementine does not move. She just " +
        "listens. Then she opens her case, takes out her tuner and sets it on {recruit}'s knee.",
      choices: [
        { label: 'Take Clementine back', effects: back('clementine'),
          outcome: '{recruit} hands over the hay bale and the fills. Clementine tunes the whole band in silence and plays the first fill perfectly.' },
        { label: 'Keep {recruit}', effects: mfx({ mood: { recruit: 8 } }, 'clementine', 'rival'),
          outcome: "Clementine leaves. A month later {rival} have a fiddler. She is the only one plugged in. She looks furious. She sounds perfect." }
      ] },
    { id: 'ret_duke', type: 'drama', speaker: 'duke', title: "Harvest's In",
      text: "Duke is at the Quonset door with a roaster and a farmer's tan. The hat is on. The hat has a sunburn. 'Harvest's in,' he says. " +
        "'The hat and I talked it over. If you'll have us.'",
      choices: [
        { label: 'Welcome back, Duke', effects: mfx({ chemistry: 4 }, 'duke', 'return'),
          outcome: 'He plugs in and plays three notes, then a fourth he learned in Manitoba. Everyone cheers the fourth note. The hat nods.' },
        { label: 'Back, but rehearse more', effects: mfx({ mood: { duke: -8 } }, 'duke', 'return'),
          outcome: 'He agrees. He rehearses. He also eats during rehearsal. It is a compromise nobody negotiated. It works.' },
        { label: 'Not yet', effects: mfx({ mood: { duke: -5 } }, 'duke', 'later'),
          outcome: 'Duke helps Vern in the yard, hat on, every day, within earshot of rehearsal. He taps his foot. He waits.' }
      ] },
    { id: 'ret_duke_filled', type: 'drama', speaker: 'duke', title: 'A Different Hat',
      text: "Duke is back from harvest. {recruit} is playing his bass. {recruit} is wearing a hat. It is a smaller hat. Duke stands in the " +
        "doorway and looks at the smaller hat for a long time. Biscuit growls, quietly, at the smaller hat.",
      choices: [
        { label: 'Take Duke back', effects: back('duke'),
          outcome: '{recruit} hands back the bass and takes off the small hat, respectfully. Duke puts on the big one. The Quonset is right again.' },
        { label: 'Keep {recruit}', effects: mfx({ mood: { recruit: 8 } }, 'duke', 'rival'),
          outcome: "Duke leaves. Next month {rival} announce a bassist whose hat is 'basically a third member'. Titan Tim is furious. It is Duke." }
      ] }
  ]);
  // Fill-ins for the Ramblers' roles (the base lane owns the table; add only where it is missing).
  var FI = obj(DR, 'fillIns');
  if (!FI['vocals/acoustic']) FI['vocals/acoustic'] = ['Cody from the rodeo karaoke', 'A 4-H kid named Bailey', 'Randy, who does weddings in Herbert'];
  if (!FI.fiddle) FI.fiddle = ['Old Man Pelletier from the Legion', 'A girl from the Gravelbourg fiddle camp', 'Marg, the line-dance instructor'];
  if (!FI['lead guitar']) FI['lead guitar'] = ['Dwayne from the music store', 'A session guy from Medicine Hat', 'Clint, who knows one solo'];
  if (!FI.bass) FI.bass = ['Gus from the used-truck lot', 'A hired man named Lyle', 'Vern (reluctantly)'];

  /* ======================================================================================================================
     Bandbook (29_sim_fans): the home superfan (Q5), posts / viral / comments / handles / mail / gifts through byBand, the
     scripted gift, fan-card variants and the band's scandals. Tokens: {who} {song} {venue} {gcity} {views} {n} {money}.
     ====================================================================================================================== */
  var BB = obj(K, 'bandbook');
  obj(BB, 'homeSuperfan')[B] = {
    name: 'Wilf from coffee row', short: 'Wilf', icon: '☕', from: 'Swift Current (coffee row)',
    blurb: 'Farms four sections south of town. Holds court at coffee row every morning at 6:40. Heard you at a yard party and reported it to the row.',
    gigLines: [
      'Wilf from coffee row is in the front row in his seed cap, arms crossed, nodding on two and four. Show number {n}. He will report back.',
      'Wilf made it again ({n} shows). He knows every word. He does not sing them. He mouths them, seriously, like a hymn.',
      'Wilf holds up a sign made from a feed bag: "COFFEE ROW ♥ {band}". The row voted on the wording. This is sign {n}.',
      'Wilf is here. He drove his grain truck. It is parked across four spots, legally, because he asked the owner.'
    ],
    gigLinesFar: [
      'Wilf from coffee row made it to {gcity}. He drove through the night and brought a thermos for the band. Show {n}.',
      'Wilf is in {gcity}, front row, seed cap. First time this far from coffee row. He says the coffee here is "fine, I guess".'
    ],
    comments: [
      'Wilf from coffee row here. See you at 6:40. The row has questions.',
      'Good post. Printed it at the Co-op. It is on the corkboard next to the grain prices.',
      'Wilf again. Have not missed a show since the yard party. Not planning to start.',
      'I have liked this 40 times. The app only counts one. I have written to them. With a stamp.',
      'Read this to coffee row. Lorne says the fiddle is too fast. Lorne is wrong. Lorne is always wrong.'
    ],
    gift: 'grr_seed_cap_quilt'
  };
  obj(BB, 'scriptedGifts').grr_seed_cap_quilt = { from: 'Wilf from coffee row',
    text: 'A quilt made from forty years of seed caps, stitched by Wilf\'s wife, Irene. Every cap is from a different harvest. It hangs in the Quonset.' };
  merge(band(BB), {
    posts: {
      rehearsal: [
        'Rehearsal clip: {who} nails the bridge on take 14. Takes 1 to 13 are drowned out by Doris the horse, eating the set list.',
        'Quonset rehearsal, 40 seconds. At 0:22 Biscuit the heeler herds Travis back to his mark. She is now the most-liked part.'
      ],
      gig: [
        'THIS SATURDAY: {band} at {venue}, {gcity}. Doors at 8. Earl will be telling a story from 1979. Bring a hat. Not a bigger one than Duke\'s.',
        '{venue}, {gcity}, Saturday. Last time the crowd was 14 people and a heeler. Let\'s get it to 15.'
      ],
      teaser: [
        'New song teaser: nine seconds of "{song}". It is about a truck. You knew that.',
        '"{song}", work in progress. Written on the tailgate of a 1987 half-ton, at dusk, with a fiddle.'
      ],
      meme: [
        'Meme: a photo of Duke\'s hat blocking the entire sunset, captioned "prairie eclipse". That\'s it. That\'s the post.',
        'POLL: is a Quonset a building or a feeling? {who} has been arguing about it since Tuesday. Vern says "it\'s a Quonset".'
      ],
      bts: [
        'Behind the scenes: {who} picking rocks for rent. The rocks are heavier than the songs. Barely.',
        'BTS: loading out at minus 31. Earl carries his amp like a newborn and tells it a story on the way to the Suburban.'
      ],
      exclusive: [
        'Members only: forty minutes of Earl reading road markers aloud, with commentary. Members call it "strangely soothing".',
        'Exclusive: a guided tour of the hat. Featuring: the brim, the crown, the brim again. Narrated by Duke. Very serious.'
      ]
    },
    viral: {
      good: [
        'VIRAL: Duke tips his hat on the last chorus and two hundred people in hats tip theirs back. {views} views.',
        'VIRAL: Earl plays a perfect take while explaining, mid-song, the history of the song he is playing. {views} views.',
        'VIRAL: Clementine plays a reel so fast a man\'s boot flies off and lands on the stage in time. {views} views.',
        'VIRAL: Travis Lee restarts his 1987 truck on the first try, on camera, and weeps with joy. {views} views.',
        'VIRAL: a whole curling rink two-steps to the waltz while the ice crew keeps sweeping. {views} views.',
        'VIRAL: {player} plays {instrument} on a hay bale so hard it bursts on the last note, like confetti. {views} views.'
      ],
      cringe: [
        { who: 'travis', text: 'Wrong kind of viral: Travis Lee\'s "how to drive stick" tutorial. He stalls eleven times. {views} views.' },
        { who: 'travis', text: 'Wrong kind of viral: Travis Lee crying at a truck dealership, captioned "condo cowboy". {views} views.' },
        { who: 'earl', text: 'Wrong kind of viral: Earl\'s four-hour livestream "Every Session, 1979". It is just 1979. {views} views.' },
        { who: 'earl', text: 'Wrong kind of viral: Earl reading a historical marker to a traffic jam. {views} views, most of them honking.' },
        { who: 'clementine', text: 'Wrong kind of viral: Clementine caught yeehawing at a symphony fundraiser. {views} views.' },
        { who: 'clementine', text: 'Wrong kind of viral: Clementine\'s "fiddle is not a violin" rant. It is a violin. {views} views.' },
        { who: 'duke', text: 'Wrong kind of viral: Duke\'s hat stuck in a car wash. Duke went in after it. {views} views.' },
        { who: 'duke', text: 'Wrong kind of viral: Duke\'s "hat care routine". Twenty-two steps. He cries at step nine. {views} views.' }
      ]
    },
    comments: {
      good: ['saw them in a quonset with 14 people and a heeler. i was the heeler', 'best band on highway 1. fight me at the co-op',
        'played this at the auction mart. a cow sold for double. coincidence? no'],
      mixed: ['is this the band with the hat', 'decent. my uncle has a bigger hat. is that better. duke says no',
        'why does every video have a horse in it'],
      bad: ['they were better at the yard party (last week)', 'sounds like a grain truck in a steel shed. 3 stars'],
      hater: ['a hat is not a personality', 'buckle & boot do it better. ok they dont. i said it anyway',
        'the drummer sits on hay. what next. a gopher on bass']
    },
    handles: {
      fan: ['CoffeeRowCarl', 'Quonset4Life', 'CanolaKaren', 'GridRoadGrace', 'HatFanBev', 'SwiftCurrentSteve', 'HalfTonHarold', 'HeelerMom'],
      hater: ['TailgateTodd', 'BiggerHatBrad', 'TitanFan88', 'bootsnotboots']
    },
    mail: [
      { id: 'grr_mail_trucker', from: 'a long-haul trucker on Highway 1', text: '"I play you from Moose Jaw to Medicine Hat. Every time. The truck goes smoother. Thank you."' },
      { id: 'grr_mail_4h', from: 'Bailey from the 4-H club', text: '"I practise fiddle every day now. Mom says thank you. Dad says please stop. Thank you anyway."' },
      { id: 'grr_mail_condo', from: 'the condo board in Regina', text: '"Please remind Mr. Beauchamp that the visitor stall is not for trucks. Especially that truck."' },
      { id: 'grr_mail_marker', from: 'a heritage society in Herbert', text: '"Thank you, Mr. Nakamura-Pike, for reading our marker aloud. Nobody has since 1978. Enclosed: a pin."' },
      { id: 'grr_mail_symphony', from: 'a violin teacher in Montreal', text: '"I heard the Bach in your breakdown. So did my students. We are all very confused. Bravo."' }
    ],
    gifts: [
      { id: 'grr_gift_bale', from: 'a farmer near Kyle', text: 'A square bale "for the drum stool", tied with baler twine and a bow. Doris ate the bow.' },
      { id: 'grr_gift_jerky', from: 'the Gull Lake rink', text: 'Forty sticks of homemade jerky, labelled "for Duke". Duke shares one. With the hat.' },
      { id: 'grr_gift_hat_box', from: 'the hat fan club in Gull Lake', text: 'A hat box, hand-painted, lined with velvet. It is for the hat. Duke sleeps with it by the bed.' },
      { id: 'grr_gift_atlas', from: 'a trucker in Medicine Hat', text: 'A 1987 road atlas, still in the shrink wrap. "For Earl, in case." Earl weeps. He does not open it.' },
      { id: 'grr_gift_rosin', from: 'a fiddle camp in Gravelbourg', text: 'A cake of rosin with a note: "From the kids. Play the Bach part again." Clementine hides it in the case.' }
    ],
    chat: {
      viral: ['We are viral. Wilf read it to coffee row. The row said "huh". That is the highest praise the row has ever given.',
        'The clip is everywhere. Somebody showed it to Brayden at a dealership. He watched the whole thing. Twice.'],
      cringe: ['Everyone saw it. Everyone. Coffee row saw it at 6:40.', "I'm logging off forever. (Back in 20 minutes.)"]
    }
  });

  add(list(BB, 'scandals'), [
    { card: 'scandal_grr_truck_selfie', who: 'travis' }, { card: 'scandal_grr_earl_claim', who: 'earl' },
    { card: 'scandal_grr_bach', who: 'clementine' }, { card: 'scandal_grr_other_hat', who: 'duke' },
    { card: 'scandal_grr_noise', who: 'band' }
  ]);
  addCards(list(BB, 'cards'), [
    // ---- Scandals: a bandmate posts something dumb (forced by GG.fans) ----
    { id: 'scandal_grr_truck_selfie', type: 'fame', speaker: 'travis', title: 'Not His Truck', gate: only({}),
      text: "Travis Lee posted a photo of himself on the hood of a beautiful black pickup: 'my baby'. The truck's owner has commented. It is a " +
        "dentist in Regina. The truck is in the dentist's driveway. The comments are merciless.",
      choices: [
        { label: 'Travis apologizes on camera', hint: 'Haters ↓ · Travis ↓', effects: { buzz: -3, mood: { travis: -6 }, fan: { hater: -0.02 } },
          outcome: 'He apologizes to the dentist, the truck and the fans. The dentist forgives him and books the band for his daughter\'s wedding.' },
        { label: 'Double down: all trucks are his', hint: 'Buzz ↑ · Haters ↑', effects: { buzz: 6, mood: { travis: 4 }, fan: { hater: 0.03 } },
          outcome: '"Every truck is my baby, in my heart." Half the internet finds it moving. Half does not. The dentist frames the comment.' },
        { label: 'Post the real truck', hint: 'Gamble: the 1987 truck',
          outcome: 'Travis Lee posts a photo of his actual truck: rust, a tarp, a bungee cord.',
          roll: { chance: 0.55,
            success: { effects: { buzz: 8, fan: { super: 0.01 } }, outcome: 'The real truck gets ten times the likes. Fans call it "honest". The dentist sends a thumbs-up.' },
            fail: { effects: { buzz: -4 }, outcome: 'The comments ask why the band cannot afford a better truck. Travis takes it very personally.' } } }
      ] },
    { id: 'scandal_grr_earl_claim', type: 'fame', speaker: 'earl', title: 'The Estate Says No', gate: only({}),
      text: "Earl told a podcast he played on a famous country classic in 1979. The singer's estate has released a statement: 'he did not'. " +
        "Earl has released a statement: 'I did.' Coffee row has taken sides. The row is split four to three.",
      choices: [
        { label: 'Earl apologizes', hint: 'Haters ↓ · Earl ↓', effects: { buzz: -3, mood: { earl: -8 }, fan: { hater: -0.02 } },
          outcome: 'He apologizes for "the confusion". He does not say he was wrong. The estate accepts. Earl mutters "I did" for a week.' },
        { label: 'Find the session log', hint: 'Gamble: a 1979 paper trail',
          outcome: 'Earl digs through four boxes in his daughter\'s basement.',
          roll: { chance: 0.5,
            success: { effects: { buzz: 12, mood: { earl: 12 } }, outcome: 'A 1979 session log with his name on it. The estate apologizes. Earl frames both statements. Coffee row goes 7-0.' },
            fail: { effects: { buzz: -4, mood: { earl: -4 } }, outcome: 'The log says "E. Nakamura (?)". Inconclusive. Earl calls it proof. Nobody else does.' } } },
        { label: 'Ignore it. Play.', hint: 'Chemistry ↑', effects: { chemistry: 4, burnout: 3 },
          outcome: 'Earl plays the solo from the song at every show without comment. Fans who know, know. The estate stays quiet.' }
      ] },
    { id: 'scandal_grr_bach', type: 'fame', speaker: 'clementine', title: 'Caught Playing Bach', gate: only({}),
      text: "A video: Clementine at a symphony fundraiser in Regina, in a gown, playing Bach, perfectly. She told the band she was at the " +
        "dentist. The comments call her a 'fake country fiddler'. The symphony's comments call her 'wasted on a hay bale'.",
      choices: [
        { label: 'Clementine explains', hint: 'Haters ↓ · Clementine ↓', effects: { buzz: -3, mood: { clementine: -6 }, fan: { hater: -0.02 } },
          outcome: 'She explains that a fiddle and a violin are the same instrument. It is a lecture. It is twenty minutes. It is correct.' },
        { label: 'Play Bach at the next gig', hint: 'Buzz ↑ · Haters ↑', effects: { buzz: 7, mood: { clementine: 5 }, fan: { hater: 0.02 } },
          outcome: 'She plays the partita at a curling rink, then a reel. Half the crowd cries. The other half two-steps. Both are right.' },
        { label: 'The band backs her up', hint: 'Chemistry ↑ · Superfans ↑', effects: { chemistry: 4, fan: { super: 0.01 } },
          outcome: 'Earl posts "she played on the original". Duke posts a photo of the hat, holding a violin. The comments move on.' }
      ] },
    { id: 'scandal_grr_other_hat', type: 'fame', speaker: 'duke', title: 'The Other Hat', gate: only({}),
      text: "A photo of Duke at a Buckle & Boot concert in Red Deer, cheering, in a DIFFERENT hat. The internet is calling it 'hatgate'. Duke " +
        "says the other hat is 'a travel hat'. Titan Tim has shared the photo. With a heart.",
      choices: [
        { label: 'Duke apologizes to the hat', hint: 'Haters ↓ · Duke ↓', effects: { buzz: -3, mood: { duke: -6 }, fan: { hater: -0.02 } },
          outcome: 'He posts a sincere apology to the hat. The hat is photographed accepting it. Most people forgive him. Some ask about the travel hat.' },
        { label: '"I was scouting the rival"', hint: 'Buzz ↑ · Haters ↑', effects: { buzz: 6, mood: { duke: 4 }, fan: { hater: 0.02 } },
          outcome: 'Duke says he was "studying the enemy". Brayden replies "respect, bud". It makes it worse and funnier.' },
        { label: 'Burn the travel hat', hint: 'Gamble: a ceremony',
          outcome: 'Duke builds a small fire in the Quonset yard.',
          roll: { chance: 0.5,
            success: { effects: { buzz: 10, fan: { super: 0.01 } }, outcome: 'The travel hat goes up. Fans cheer on the livestream. The main hat watches from a fence post. Hatgate ends.' },
            fail: { effects: { burnout: 4, mood: { duke: -5 } }, outcome: 'He cannot do it. He puts the fire out with a hose and hugs the travel hat. It is on the livestream.' } } }
      ] },
    { id: 'scandal_grr_noise', type: 'fame', speaker: 'grr_vern', title: 'The Noise Complaint', gate: only({}),
      text: "A neighbour eleven kilometres away has filed a noise complaint about the Quonset. Eleven kilometres. The RM has sent a letter. " +
        "Bandbook has found out. The comments are split between 'too loud' and 'how is that even possible'.",
      choices: [
        { label: 'Apologize to the neighbour', hint: 'Haters ↓ · Burnout ↑', effects: { buzz: -3, burnout: 4, fan: { hater: -0.02 } },
          outcome: 'You drive over with a pie. The neighbour turns out to be a fan who wanted to be invited. You invite him. Complaint withdrawn.' },
        { label: 'Play louder', hint: 'Buzz ↑ · Haters ↑', effects: { buzz: 6, fan: { hater: 0.02 } },
          outcome: 'You play the next rehearsal with the Quonset door open, facing his farm. He files a second complaint. He also requests a song.' },
        { label: 'Let Vern handle the RM', hint: 'Chemistry ↑', effects: { chemistry: 4 },
          outcome: 'Vern goes to the RM meeting. He is the reeve. He has always been the reeve. The complaint is tabled indefinitely.' }
      ] },

    // ---- The home superfan and the fan club (variants of the base fan cards) ----
    { id: 'fans_dale_hello_grid_road_ramblers', type: 'fame', speaker: 'grr_wilf', title: 'Wilf From Coffee Row', gate: only({}),
      text: "A note under the Quonset door, in careful farmer's pencil: 'Wilf here. From coffee row. Heard you at the yard party. I will be at " +
        "every show. Every one. I have told the row. The row will want updates.'",
      choices: [
        { label: 'Welcome aboard, Wilf', effects: { chemistry: 3, fan: { superfan: { dale: 10 } } },
          outcome: 'Wilf leaves a second note: a thumbs-up drawn with a carpenter pencil. Then a third: coffee row has voted. You are "all right".' },
        { label: 'Guest list, forever', effects: { buzz: 2, fan: { superfan: { dale: 15 } } },
          outcome: 'He insists on paying anyway. He pays with a cheque. Nobody has seen a cheque in years. Earl cashes it, delighted.' },
        { label: 'Ask what the row said', effects: { chemistry: 2, fan: { superfan: { dale: 5 } } },
          outcome: '"Too loud," Wilf says. "Good fiddle. The hat is a lot." He pauses. "The row liked it." That is enough.' }
      ] },
    { id: 'fans_trucker_grid_road_ramblers', type: 'road', speaker: 'earl', title: 'The Jumper-Cable Story', gate: only({}),
      text: "Driving home from a gig, {van} dies at a gas station outside Swift Current at 2 a.m. Earl is reading the manual. A semi pulls in. " +
        "A man named Wendell produces jumper cables longer than the van. Earl says he knew a trucker like this in 1979.",
      choices: [
        { label: 'Let Wendell help Earl', effects: { fund: -12, mood: { earl: 4 }, fan: { superfan: { trucker: 10 } } },
          outcome: 'Earl holds the cables. Wendell holds the flashlight. They swap road stories until 3:40. Coffee is on you.' },
        { label: 'Play him a song in the lot', effects: { burnout: 4, chemistry: 3, fan: { superfan: { trucker: 15 } } },
          outcome: 'The waltz, acoustic and fiddle, under the gas-station lights. Wendell honks the air horn at the end. A coyote answers.' },
        { label: 'Sign his thermos', effects: { buzz: 2, fan: { superfan: { trucker: 8 } } },
          outcome: '"Now I can never wash it," says Wendell, who has clearly never washed it. Duke signs it with the hat.' }
      ] },
    { id: 'fans_macaroni_grid_road_ramblers', type: 'fame', speaker: 'grr_wilf', title: 'A Gift From Wilf', gate: only({}),
      text: "After the show Wilf hands over a garbage bag with great care. Inside: a quilt made from forty years of seed caps. His wife, Irene, " +
        "stitched it all winter. Every cap is a harvest. There is a hat-shaped patch in the middle, for Duke.",
      choices: [
        { label: 'Hang it in the Quonset', effects: { chemistry: 3, fan: { gift: 'grr_seed_cap_quilt', superfan: { dale: 10 } } },
          outcome: 'It goes up behind the kit. Vern stops in front of it every time he comes in. He finds his own cap from 1994.' },
        { label: 'Let Duke keep it', effects: { mood: { duke: 6 }, fan: { gift: 'grr_seed_cap_quilt', superfan: { dale: 8 } } },
          outcome: 'Duke drapes it over the Suburban\'s back seat. On long drives everybody sleeps under forty harvests. Earl reads the caps aloud.' }
      ] },
    { id: 'fans_hater_page_grid_road_ramblers', type: 'fame', speaker: 'grr_dolores', title: 'The Anti-Fan Club', gate: only({}),
      text: "Dolores reads it on air: a new page called '{band} Is Overrated (Fan Club)'. It has a logo, a tailgate anthem and a monthly meeting " +
        "at a Medicine Hat truck stop. Its founder is a man named Todd. It has more members than some of your gigs.",
      choices: [
        { label: 'Show up to their meeting', hint: 'Gamble: charm the haters',
          roll: { chance: 0.5, stat: 'chemistry', statScale: 0.005,
            success: { effects: { buzz: 8, fans: 20, fan: { hater: -0.04 } }, outcome: 'You bring a pie. By dessert Todd is on the mailing list and three members are at the next show in hats.' },
            fail: { effects: { buzz: -3, mood: { travis: -5 } }, outcome: 'They play their tailgate anthem at you. Travis Lee has to go sit in the truck.' } },
          outcome: 'You drive to Medicine Hat with a pie.' },
        { label: 'Ignore them. Play better.', effects: { burnout: 4, chemistry: 3 },
          outcome: 'They review your next show anyway. "Too much fiddle. Hat too big. 4 stars." It is their best review ever.' }
      ] },
    { id: 'fans_patreeon_grid_road_ramblers', type: 'money', speaker: 'travis', title: 'Patreeon', gate: only({ era: SW }),
      text: "Travis Lee found a website: Patreeon. 'Support your favourite band's van repairs.' Superfans pay monthly; you post exclusive stuff. " +
        "Tiers: Drumstick, Snare, Full Kit. Wilf has already asked if he can pay by cheque.",
      choices: [
        { label: 'Open the fan club', effects: { buzz: 3, fan: { club: 'open' } },
          outcome: 'Patreeon is live. First member: Wilf, Full Kit, by cheque, mailed. Second member: the hat fan club, collectively, Snare.' },
        { label: 'Every dollar to the Suburban', effects: { chemistry: 3, mood: { earl: 6 }, fan: { club: 'open' } },
          outcome: 'The tier descriptions all end with "(for the Suburban)". Earl reads the list of members aloud at every marker.' },
        { label: "Not yet. It's a racket.", effects: { chemistry: 3, mood: { clementine: 4 } },
          outcome: 'Clementine gives a speech about patronage in the eighteenth century. The Suburban makes a noise during it. Duke signs up anyway.' }
      ] },
    { id: 'fans_club_grumble_grid_road_ramblers', type: 'money', speaker: 'grr_wilf', title: 'Patreeon Grumbles', gate: only({ era: SW }),
      text: "A polite note from Wilf, on behalf of 'the members': it has been a while since an exclusive. Coffee row is asking what the money " +
        "is for. Wilf is not asking. Wilf would never. He just thought you should know. He underlined 'never'.",
      choices: [
        { label: 'Film an exclusive tonight', effects: { burnout: 5, fan: { clubHappy: 25 } },
          outcome: 'A 50-minute livestream of Earl changing the Suburban\'s oil and telling the story of every quart. Members love it.' },
        { label: 'Send every member a postcard', effects: { fund: -150, fan: { clubHappy: 15 } },
          outcome: 'Four hundred postcards of the Quonset at sunset. Wilf pins his to the Co-op corkboard. Duke signs each one with a hat.' },
        { label: "They'll live", effects: { burnout: -4, fan: { clubHappy: -10, super: -0.01 } },
          outcome: "Some cancel. Wilf doesn't. Wilf says it's fine. It sounds like it isn't fine. Coffee row is told." }
      ] }
  ]);

  /* ======================================================================================================================
     Licensing (2c_sim_licensing): the band's "employer" brand (a seed and implement dealer, brand.band filter), its sellout
     scandal (queued ahead of the neutral one: licenseScandals is first-match), and the lic_fury rewrite (plan §5 A1 item 10:
     the cousins and the mascot; the truck ad is the licensing brand 'truck', Buckle & Boot's sponsor, cast.furyBrand).
     ====================================================================================================================== */
  var LIC = obj(K, 'licensing');
  var brands = list(LIC, 'brands');
  if (!brands.some(function (x) { return x && x.id === 'seed_dealer'; })) brands.push(
    { id: 'seed_dealer', band: [B], name: 'Prairie Pedigree Seed & Implement', what: 'seed dealer ad',
      blurb: "The seed and implement dealer on the Trans-Canada, where Duke works the parts counter on weekdays. Their ads run during the grain prices.",
      fee: [1500, 3000], genres: { country: 3 }, sellout: 0.8, buzz: 5, reach: 0.012, speaker: 'duke', takeFx: { mood: { duke: -6 } },
      title: 'Your Parts Counter Is Calling',
      offer: 'Prairie Pedigree Seed & Implement wants "{adsong}" for a spot: a swather at sunset, then Duke at the parts counter, smiling, in the hat. ' +
        '{adfee}. Duke did not know. Duke is holding a gasket and staring at the storyboard.',
      take: 'The spot runs every morning after the grain prices. Duke, smiling at the parts counter. Farmers ask him for autographs and fan belts.',
      decline: 'You pass. Prairie Pedigree uses a yodel instead. Duke hugs everyone, one by one, then goes back to the parts counter, relieved.',
      counterWin: 'Prairie Pedigree pays more. The owner says it is "a good investment in the hat". Duke is flattered and horrified.',
      counterWalk: 'Prairie Pedigree goes with a jingle the owner\'s nephew wrote. Duke is so relieved he reorganizes the whole parts wall.',
      expire: 'Prairie Pedigree went with the nephew\'s jingle. Duke has never loved a bad jingle more.' });
  addCards(list(K, 'licenseCards'), [
    { id: 'lic_scandal_grr_seed', type: 'fame', speaker: 'duke', title: 'The Hat Sold Out', gate: only({}),
      text: "The Southwest Bugle's front page: 'THE HAT SELLS OUT TO SEED DEALER'. Someone spliced the {brand} spot with Duke saying 'the hat " +
        "is not for sale' at a gig. It is everywhere. Coffee row has discussed it for three mornings running.",
      choices: [
        { label: 'Duke explains on camera', hint: 'Haters ↓ · Duke ↓', effects: { buzz: 2, mood: { duke: -6 }, fan: { hater: -0.02 } },
          outcome: 'Fourteen minutes about how the fee paid for the Suburban\'s transmission. Most people forgive him. Earl forgives him the most.' },
        { label: '"The hat got paid"', hint: 'Buzz ↑ · Haters ↑', effects: { buzz: 7, mood: { duke: 4 }, fan: { hater: 0.02 } },
          outcome: 'Duke prints it on a shirt. It sells out. The comments are furious that it sold out. It sells out again.' },
        { label: 'Donate the fee to the 4-H', hint: 'Fund ↓ · Superfans ↑', effects: { fund: -250, chemistry: 3, fan: { super: 0.01 } },
          outcome: 'The 4-H club gets new fiddles. Bailey sends a thank-you card. The comments move on to a banjo band from Estevan.' }
      ] }
  ]);
  var LS_ = list(K, 'licenseScandals'), grrScandal = { card: 'lic_scandal_grr_seed', who: 'duke' }, si = -1;
  if (!LS_.some(function (x) { return x && x.card === grrScandal.card; })) {
    for (var li = 0; li < LS_.length; li++) if (LS_[li] && LS_[li].who === 'band') { si = li; break; }
    if (si < 0) LS_.push(grrScandal); else LS_.splice(si, 0, grrScandal);
  }
  // lic_fury (queued by GG.licensing when a truck ad goes to the Ramblers): the rival's names, the mascot, the truck-ad war.
  var FURY = {
    id: 'lic_fury', type: 'drama', speaker: 'travis', title: 'Buckle & Boot Are Furious', gate: { band: [B] },
    text: "Buckle & Boot saw the {brand} ad. They have done every Prairie Titan ad for nine years. Brayden posted a video throwing a boot " +
      "at a TV. Colt threw the other boot. Titan Tim is standing at the end of your grid road in the costume, headlights on.",
    choices: [
      { label: 'Rub it in', hint: 'Buzz ↑ · Rival heat ↑↑', effects: { buzz: 6, lic: { heat: 10 } },
        outcome: "Travis Lee posts a photo leaning on his 1987 truck with a straw hat tipped low: 'built grid road tough'. Brayden unfollows you twice." },
      { label: 'Bring Titan Tim a coffee', hint: 'Rival heat ↓ · a little cash', effects: { fund: -60, lic: { heat: -8 } },
        outcome: 'Duke walks a coffee and a sandwich down the grid road. Tim drinks it through the grille. The cousins send back the thermos, dented.' },
      { label: 'Say nothing', hint: 'Chemistry ↑', effects: { chemistry: 3 },
        outcome: 'Travis Lee says "a gentleman never gloats" and then gloats quietly in the Quonset for an hour. Earl tells a story about 1979.' }
    ]
  };
  var LC = list(K, 'licenseCards'), furyAt = -1;
  for (var fi = 0; fi < LC.length; fi++) if (LC[fi] && LC[fi].id === 'lic_fury') { furyAt = fi; break; }
  if (furyAt < 0) LC.push(FURY);
  else ['type', 'speaker', 'title', 'text', 'choices'].forEach(function (k) { LC[furyAt][k] = FURY[k]; });

  /* ======================================================================================================================
     The World (25_sim_tour): the Q3 payoff (Tumbleworth, the Australian country circuit; the town and its festival venue are
     places, so they live in the base world.js), region cards, the homesick variant, calls home, lines through byBand, the gong carpet.
     ====================================================================================================================== */
  var WO = obj(K, 'world');
  add(list(WO, 'packages'), WO.packages.some(function (p) { return p && p.id === 'au_country_circuit'; }) ? [] : [
    { id: 'au_country_circuit', region: 'australia', name: 'The Country Circuit', festival: true,
      needs: { flag: 'outback', is: ['tumbleworth'], band: [B] },
      needsText: 'Tumbleworth is still waiting for the truck song.',
      blurb: 'Melbourne, then the red centre, then Tumbleworth in January, where the whole town sings the truck song. They call it the ute song.',
      stops: [{ city: 'melbourne', venue: 'wrong_corner' }, { city: 'alice_springs', venue: 'red_centre_roadhouse' }, { city: 'tumbleworth', venue: 'tumbleworth_fest' }],
      payoff: { city: 'tumbleworth', flag: 'outbackPayoff', value: 'tumbleworth', trophy: 'Tumbleworth: the Golden Banjo', trophyKind: 'payoff',
        line: 'Forty-five thousand people in hats sing the truck song on a riverbank in Tumbleworth. They sing "ute". Travis Lee sings "truck". Both are right.',
        chat: '{band} at Tumbleworth: the truck song, the ute song, forty-five thousand hats. Earl says he played here in 1979. He did.',
        card: 'wt_grr_golden_banjo' } }
  ]);
  function wcard(id, region, speaker, title, text, choices, x) {
    var gate = { era: ['world'], band: [B] };
    if (region) gate.region = [region];
    var c = { id: id, type: (x && x.type) || 'road', speaker: speaker, title: title, text: text, gate: gate, once: true, choices: choices };
    for (var k in x || {}) if (k !== 'type') c[k] = x[k];
    return c;
  }
  addCards(list(WO, 'cards'), [
    wcard('wt_grr_uk_folk_club', 'uk_europe', 'clementine', 'A Folk Club in Glasgow',
      "Nigel has booked you into a folk club in Glasgow: a pub back room, forty people, eleven of them with fiddles in their laps. They " +
      "would like to 'sit in'. Clementine has gone very quiet. This is the most dangerous room she has ever been in.", [
        { label: 'Let them sit in', hint: 'Fans here ↑ · Burnout ↑', effects: { burnout: 5, tour: { regionFans: 250 } },
          outcome: 'Twelve fiddles, one reel, no mercy. Clementine leads it. Glasgow decides you are the real thing. Nigel pays in actual pounds.' },
        { label: 'Clementine duels them', hint: 'Clementine ↑↑ · Buzz ↑', effects: { mood: { clementine: 14 }, buzz: 6 },
          outcome: 'One by one, eleven Scottish fiddlers put down their bows. The twelfth buys her a whisky. She yeehaws. In Glasgow.' }
      ], { type: 'scene' }),
    wcard('wt_grr_jp_hat', 'japan', 'duke', 'The Hat in Tokyo',
      "A Tokyo department store has a display about Duke's hat: 'THE HAT OF SASKATCHEWAN'. The staff bow when he walks in. They have prepared " +
      "a hat stand, lacquered, as a gift. Duke is overwhelmed. Earl is reading the store directory like a historical marker.", [
        { label: 'Accept the hat stand', hint: 'Duke ↑↑ · Fans here ↑', effects: { mood: { duke: 18 }, tour: { regionFans: 200 } },
          outcome: 'Duke places the hat on the stand. The staff applaud. A customer weeps. Duke carries the stand to every gig for the rest of the tour.' },
        { label: 'A hat-tipping clinic', hint: 'Buzz ↑ · Burnout ↑', effects: { buzz: 10, burnout: 5 },
          outcome: 'Forty fans learn the proper hat tip in silence. They thank Duke deeply. Several of them bought hats for the occasion. Big ones.' }
      ], { type: 'fame' }),
    wcard('wt_grr_au_ute', 'australia', 'travis', 'The Ute',
      "The Australian rental is a ute: a truck, but, Travis Lee has learned, also a car, and also a way of life. It is a stick shift. " +
      "He drives it off the lot without stalling once. Earl is in the passenger seat, visibly moved.", [
        { label: 'Travis drives the tour', hint: 'Travis ↑↑ · Fund ↓', effects: { mood: { travis: 16 }, fund: -300 },
          outcome: 'Four thousand kilometres, one stall, in a car park in Adelaide. Travis Lee waves at every road train. They honk back.' },
        { label: 'Earl drives, twenty under', hint: 'Homesick ↓ · Travis ↓', effects: { mood: { travis: -6 }, tour: { homesick: -6 } },
          outcome: 'Earl drives the outback at twenty under. It is so far between towns that nobody notices. He finds a historical marker. It is about a camel.' }
      ], { type: 'road' }),
    wcard('wt_grr_ru_accordion', 'russia', 'earl', 'The Accordion Player',
      "In a small hall outside Novosibirsk an old accordion player waits by the stage. He says, through a translator, that he played a " +
      "session with Earl in 1979. In Moscow. Earl has never been to Moscow. Earl is looking at him very carefully.", [
        { label: 'Play a song together', hint: 'Gamble: two old session men',
          outcome: 'Earl straps on his guitar. The accordion starts a waltz.',
          roll: { chance: 0.55,
            success: { effects: { buzz: 12, mood: { earl: 14 }, tour: { regionFans: 250 } }, outcome: 'They play like they have always played together. Afterwards Earl says quietly, "maybe it was Moose Jaw". They hug.' },
            fail: { effects: { mood: { earl: -6 } }, outcome: 'The accordion is in a different key and a different decade. They finish anyway. The crowd applauds the effort. Loudly.' } } },
        { label: 'Swap 1979 stories', hint: 'Chemistry ↑ · Earl ↑', effects: { chemistry: 4, mood: { earl: 8 } },
          outcome: 'Three hours through a translator who gives up at hour two. The stories keep going without her. Earl has found his match.' }
      ], { type: 'scene' }),
    wcard('wt_homesick_grid_road_ramblers', null, 'recruit', 'Homesick',
      "Nobody has slept. Everybody has called home twice today. {recruit} says it out loud: 'Can we just go home?' Duke has been looking at a " +
      "photo of the Quonset for an hour. Travis misses his truck. Earl misses page 42 of the atlas.", [
        { label: 'Fly home early', hint: 'Skip the rest of the tour', effects: { mood: { all: 8 }, tour: { endTour: true, homesick: -20 } },
          outcome: 'You change the flights. The promoter is disappointed. Travis Lee goes straight from the airport to his truck and sits in it for an hour.' },
        { label: 'Finish what we started', hint: 'Moods ↓ · Burnout ↑', effects: { mood: { all: -5 }, burnout: 5, chemistry: 3 },
          outcome: 'Group hug in a hotel corridor. Earl tells a story about finishing a tour in 1979. You finish the tour. It gets into your bones.' },
        { label: 'Fly Wilf in', hint: 'Fund ↓ · Homesick ↓↓', effects: { fund: -1400, tour: { homesick: -25 } },
          outcome: 'Wilf arrives in his seed cap with a thermos and a report from coffee row. He sits front row. Everyone feels like 6:40 a.m.' }
      ], { type: 'drama', story: true }),
    wcard('wt_grr_golden_banjo', 'australia', 'travis', 'The Golden Banjo',
      "The Tumbleworth Country Music Festival. Forty-five thousand people in hats on a riverbank, and every one of them knows the truck song. " +
      "They call it the ute song. The festival's Golden Banjo is on a table by the stage. It has your band's name on it.", [
        { label: 'Travis sings it their way', hint: 'Travis ↑↑ · Buzz ↑', effects: { mood: { travis: 18 }, buzz: 12, tour: { regionFans: 600 } },
          outcome: 'He sings "ute" in every line. Forty-five thousand people sing "truck" back, for him. He cries. He does not stall. Legend.' },
        { label: 'Earl takes the solo', hint: 'Gamble: the moment demands it',
          outcome: 'Earl steps to the front of the stage. He has been waiting since 1979.',
          roll: { chance: 0.5,
            success: { effects: { chemistry: 10, fans: 400, mood: { earl: 12 } }, outcome: 'Thirty-two bars, no story, just the solo. The riverbank goes silent, then roars. Earl never mentions 1979 again. For a week.' },
            fail: { effects: { chemistry: 6, mood: { earl: 8 } }, outcome: 'He stops halfway to tell the crowd about 1979. They listen to every word. It is the best part of the festival.' } } }
      ], { type: 'fame', story: true })
  ]);
  members(obj(WO, 'callHome'), {
    travis: ['Called Mom and Dad at the condo. Dad asked if they have trucks here. They have utes. I am processing it.',
      'Called the Co-op. Asked them to check on Loretta. They said she is fine. She is a truck. She is fine.',
      'Mom says the condo board misses me. The condo board has never met me. She means well.'],
    earl: ['Called my daughter. Told her about the marker here. She said "Dad, it\'s midnight." It was a good marker.',
      'Called Wilf at coffee row. The row put me on speaker. I told them about 1979. They had heard it. They listened anyway.',
      'Called home. Told the answering machine a story. It is a good listener.'],
    clementine: ['Called Maman. She asked if I have come to my senses. I said the crowd tonight was eight thousand. She said "hm".',
      'Called my old teacher. Told her I played a reel for eight thousand. She hung up. Then called back: which reel?',
      'Called home. Practised a scale down the phone. Maman said it was sharp. It was not. It was a little.'],
    duke: ['Called Uncle Vern. He put Biscuit on. She barked twice. I think she misses me. I miss her.',
      'Called Maple Creek. My mom asked about the hat before she asked about me. That is correct.',
      'Called home. Asked about the canola. Vern said "yep". Best call of the tour.']
  });
  merge(band(WO), {
    lines: {
      depart: { uk_europe: ['Wheels up. Vern is keeping the truck, the Quonset and Biscuit. Earl has packed his atlas. It is of Saskatchewan.'],
        japan: ['Wheels up. Thirteen hours. Duke bought a seat for the hat. The airline has questions.'],
        australia: ['Wheels up. Twenty-two hours. Travis Lee has been told about utes. He is preparing himself emotionally.'],
        russia: ['Wheels up. Clementine packed four toques. Earl packed a story about Moscow. He has never been.'] },
      home: ['Home. The Quonset smells exactly the same: hay, diesel and old coffee. Travis Lee hugs his truck. For a while.',
        'Back in Swift Current. Wilf is waiting at the bus depot with a sign that says COFFEE ROW MISSED YOU.'],
      rival: ['{rival} just played {region} first. The locals keep asking if you know them. "The tailgate boys? With the truck man?"'],
      gongNominated: ['{band} is nominated for the Global Gong. The ceremony is in Amsterdam in May. Duke is choosing a hat. The hat.'],
      gongWon: ['{band} won the Global Gong. It is a real gong. It does not go on the drum kit. Duke hangs his hat on it.'],
      gongLost: ['The Global Gong went to {venue}. The band claps politely. Clementine claps on two and four, pointedly.']
    },
    cityLines: {
      tumbleworth: ['Tumbleworth in January: forty degrees, forty-five thousand hats, and one very large hat from Saskatchewan.'],
      glasgow: ['Glasgow, in the rain, in a room full of fiddlers. Clementine is the calmest she has been all tour. It is a threat.'],
      melbourne: ['Melbourne: four seasons in one day. Earl has a story for each one.']
    }
  });
  perBand(WO, 'gongCarpet', [
    { who: 'reporter', text: 'Dolores, Speedy Creek 97, live from Amsterdam! Who are you wearing?' },
    { who: 'duke', text: 'The hat. And a shirt. Mostly the hat.' },
    { who: 'grr_dolores', text: 'Is it true the Gong is a real gong?' }, { who: 'earl', text: 'I played one in 1979. Hit it once. Heard it for a week.' }
  ]);

  /* ======================================================================================================================
     Road cards (26_sim_world, mid-drive; garage magnitudes, van: { condition } needs a hint). Earl's pool (twenty under the
     limit, historical markers, road stories), the you-drive pool (when Earl is gone) and the band's own cards.
     ====================================================================================================================== */
  function road(extra) { var gate = { band: [B] }; for (var k in extra) gate[k] = extra[k]; return gate; }
  var EARL = ['earl'], YOU = ['you'];
  addCards(list(K, 'roadCards'), [
    // ---- Earl drives: twenty under, every marker, every story ----
    { id: 'road_grr_marker', type: 'road', speaker: 'earl', title: 'A Historical Marker', once: false, cooldown: 6, gate: road({ driver: EARL }),
      text: "Earl signals, slows from eighty to twenty, and pulls onto the shoulder beside a brown sign: 'SITE OF A GRAIN ELEVATOR, 1911-1978'. " +
        "There is no grain elevator. There is a field. Earl gets out and reads the whole sign aloud to the field.",
      choices: [
        { label: 'Listen respectfully', hint: 'Chemistry ↑ · Burnout ↑', effects: { chemistry: 4, burnout: 3 },
          outcome: 'Earl reads it twice, the second time with feeling. Duke takes off the hat. Travis writes a song called "1911-1978".' },
        { label: 'Take a band photo', hint: 'Buzz ↑', effects: { buzz: 4 },
          outcome: 'Five people in front of a sign about nothing, at sunset. Fans love it. Somebody starts a page of every marker Earl has stopped at.' },
        { label: 'Stay in the Suburban', hint: 'Earl ↓ · Burnout ↓', effects: { mood: { earl: -5 }, burnout: -3 },
          outcome: 'Earl reads it alone. When he gets back in he says nothing for forty kilometres. It is the loudest silence in the southwest.' }
      ] },
    { id: 'road_grr_twenty_under', type: 'road', speaker: 'clementine', title: 'Twenty Under', once: false, cooldown: 8, gate: road({ driver: EARL, minKm: 60 }),
      text: "Earl is doing eighty in a hundred-and-ten zone. A combine has passed you. A man on a riding mower has passed you. Clementine has " +
        "calculated that at this speed you will arrive during the encore. Earl is humming.",
      choices: [
        { label: 'Trust Earl', hint: 'Burnout ↑ · Earl ↑', effects: { burnout: 4, mood: { earl: 6 } },
          outcome: 'You arrive exactly as your set starts. Earl says he has never been late for a gig in fifty years. It appears to be true.' },
        { label: 'Ask him to speed up', hint: 'Gamble: Earl considers it',
          outcome: 'Clementine asks, very politely, for ninety.',
          roll: { chance: 0.35,
            success: { effects: { chemistry: 3 }, outcome: 'Earl goes to eighty-five. He calls it "letting her run". You arrive with forty minutes to spare. Nobody knows what to do.' },
            fail: { effects: { burnout: 4, mood: { clementine: -4 } }, outcome: 'Earl slows to seventy "to think about it". The mower passes again. The man on it waves.' } } },
        { label: 'Leave two hours earlier', hint: 'Burnout ↑ · Chemistry ↑', effects: { burnout: 3, chemistry: 3 },
          outcome: 'From now on the band leaves for every gig after lunch. You arrive early, rested, informed about local history.' }
      ] },
    { id: 'road_grr_1979', type: 'road', speaker: 'earl', title: 'The 1979 Story', once: false, cooldown: 8, gate: road({ driver: EARL, minKm: 100 }),
      text: "Two hundred kilometres to go and Earl has started the 1979 story. The whole one. It has a bus, a yodeller, a flood in Medicine " +
        "Hat and a woman named June. Nobody has heard the June part before. Everyone is leaning forward.",
      choices: [
        { label: 'Hear it all', hint: 'Chemistry ↑↑', effects: { chemistry: 7 },
          outcome: 'The story ends as you pull in. Nobody moves. Duke says "and June?" Earl says "another time". The whole band plays better that night.' },
        { label: 'Record it for the album', hint: 'Buzz ↑ · Earl ↑', effects: { buzz: 5, mood: { earl: 6 } },
          outcome: 'Travis records it on his phone. Two minutes of it become the intro to the next album. Earl pretends not to be proud.' },
        { label: 'Sleep through it', hint: 'Burnout ↓ · Earl ↓', effects: { burnout: -5, mood: { earl: -4 } },
          outcome: 'You wake up at the venue. Earl is still talking. He has been talking to the steering wheel for an hour. The wheel liked it.' }
      ] },
    { id: 'road_grr_atlas', type: 'road', speaker: 'earl', title: 'The 1987 Atlas', once: false, cooldown: 10, gate: road({ driver: EARL }),
      text: "Earl navigates by his 1987 road atlas. According to page 42 there is a town here with a café. There is no town. There is a " +
        "slough, a hawk and a very old sign. Earl is looking at the atlas, then the slough, then the atlas.",
      choices: [
        { label: 'Update the atlas in pen', hint: 'Earl ↑ · Chemistry ↑', effects: { mood: { earl: 5 }, chemistry: 3 },
          outcome: 'Earl writes "GONE, 2026" across the town in careful capitals. It is the ninth town he has written GONE across. He is keeping count.' },
        { label: 'Use a phone map', hint: 'Earl ↓ · Burnout ↓', effects: { mood: { earl: -6 }, burnout: -3 },
          outcome: 'The phone finds a café twelve kilometres away. Earl eats in silence. He says the pie in 1987 was better. He means the town.' },
        { label: 'Look for the café anyway', hint: 'Gamble: the prairie remembers',
          outcome: 'Earl follows the old grid road past the slough.',
          roll: { chance: 0.35,
            success: { effects: { fans: 10, chemistry: 4 }, outcome: 'There IS a café. It is in a farmhouse now. The farmer\'s wife still makes pie. She remembers Earl. From 1987.' },
            fail: { effects: { burnout: 5, van: { condition: -3 } }, outcome: 'The grid road becomes a trail, then a field. You back out for a kilometre. The Suburban is scratched.' } } }
      ] },
    { id: 'road_grr_hitchhiker', type: 'road', speaker: 'earl', title: 'A Fiddler on the Shoulder', once: false, cooldown: 12, gate: road({ driver: EARL, minKm: 80 }),
      text: "A young woman with a fiddle case is hitchhiking on the Trans-Canada. Earl stops before anyone can vote. 'Always pick up a " +
        "fiddler,' he says. 'I was one in 1964. Well. I knew one.' Clementine is sizing her up already.",
      choices: [
        { label: 'Give her a ride', hint: 'Chemistry ↑ · Burnout ↑', effects: { chemistry: 4, burnout: 3 },
          outcome: 'She plays reels in the back seat all the way to Moose Jaw. Clementine plays harmony. They exchange numbers. Rivals, maybe friends.' },
        { label: 'A fiddle duel in the back', hint: 'Gamble: Clementine takes it seriously',
          outcome: 'Clementine opens her case. The stranger opens hers.',
          roll: { chance: 0.5,
            success: { effects: { mood: { clementine: 8 }, buzz: 4 }, outcome: 'Clementine wins by one reel. The stranger bows. She says she will see Clementine at Tumbleworth. Ominous.' },
            fail: { effects: { mood: { clementine: -6 } }, outcome: 'The stranger wins. Clementine practises the losing reel for a week at 5 a.m.' } } },
        { label: 'Buy her a bus ticket', hint: '−$25 · Earl ↓', effects: { fund: -25, mood: { earl: -3 } },
          outcome: 'You drop her at the bus depot with a ticket. Earl says "in my day..." and does not finish it. She waves with her bow.' }
      ] },
    { id: 'road_grr_hearing_cb', type: 'road', speaker: 'duke', title: 'Earl Is on Channel 19', once: false, cooldown: 10, gate: road({ driver: EARL }),
      text: "Earl's hearing aid is picking up the CB radio. Truckers on channel 19 are talking about 'a Suburban doing eighty in the fast " +
        "lane'. Earl can hear them. Earl is answering them. Out loud. They cannot hear him. He is winning the argument.",
      choices: [
        { label: 'Get Earl a real CB ($40)', hint: '−$40 · Earl ↑↑', effects: { fund: -40, mood: { earl: 12 } },
          outcome: "Earl's handle is 'Twenty Under'. Within a month every trucker on Highway 1 knows him. They slow down to say hi. It helps." },
        { label: 'Move to the slow lane', hint: 'Burnout ↑ · Chemistry ↑', effects: { burnout: 3, chemistry: 3 },
          outcome: 'Earl moves over. The truckers thank him on the radio. He answers "you are welcome" to no one. Duke says it counts.' },
        { label: 'Let him argue', hint: 'Buzz ↑', effects: { buzz: 3 },
          outcome: 'Duke films Earl arguing with an invisible trucker for twenty minutes. Fans call it "the most Earl thing ever filmed".' }
      ] },
    { id: 'road_grr_roadside_giant', type: 'road', speaker: 'travis', title: 'The Giant Coffee Pot', once: false, cooldown: 12, gate: road({ driver: EARL, minKm: 60 }),
      text: "A giant roadside coffee pot, twenty-four feet tall, on the edge of a small town. Earl has already signalled. Travis Lee wants a " +
        "photo. Duke wants coffee. Clementine wants to know why the prairies build giant things. Earl has an answer. It is long.",
      choices: [
        { label: 'Photo with the pot', hint: 'Buzz ↑', effects: { buzz: 5 },
          outcome: 'Five people and a giant coffee pot. It becomes the album inner sleeve. Coffee row requests a print. Wilf pins it next to the grain prices.' },
        { label: 'Coffee in town', hint: '−$15 · Burnout ↓', effects: { fund: -15, burnout: -5 },
          outcome: 'Coffee at the café under the pot. The waitress has heard of the hat. She asks to touch it. Duke allows it. Once.' },
        { label: 'Hear the answer', hint: 'Chemistry ↑ · Earl ↑', effects: { chemistry: 3, mood: { earl: 6 } },
          outcome: 'The answer involves 1967, a centennial grant and a man with a welding torch. It is honestly fascinating. Clementine takes notes.' }
      ] },
    { id: 'road_grr_dust_squall', type: 'road', speaker: 'earl', title: 'A Dust Squall', once: false, cooldown: 12, gate: road({ driver: EARL, season: ['summer', 'spring'] }),
      text: "A wall of dust rolls across the highway out of a summerfallow field. Visibility is ten metres. Earl slows from eighty to twenty, " +
        "which for Earl is barely a change. 'Seen worse,' he says. 'Nineteen thirty-seven. My father told me. Vividly.'",
      choices: [
        { label: 'Crawl through', hint: 'Van ↓ · Chemistry ↑', effects: { chemistry: 3, van: { condition: -3 } },
          outcome: 'Twenty kilometres an hour through brown fog. Earl tells the 1937 story. You come out the other side coated and closer.' },
        { label: 'Pull over and wait', hint: 'Burnout ↑', effects: { burnout: 4 },
          outcome: 'Forty minutes on the shoulder. Clementine plays a slow air. The dust settles on everything, including the melody.' },
        { label: 'Clean the air filter', hint: 'Van ↑ · Burnout ↑', effects: { burnout: 3, van: { condition: 3 } },
          outcome: 'Earl pops the hood in the squall and knocks the filter clean on the bumper. Twice. "Nineteen thirty-seven," he says, satisfied.' }
      ] },

    // ---- You drive (Earl is gone): his atlas, your problem ----
    { id: 'road_grr_you_grid_maze', type: 'road', speaker: 'clementine', title: 'Lost on the Grid Roads', once: false, cooldown: 8, gate: road({ driver: YOU }),
      text: "You took a shortcut. Every grid road looks the same: gravel, fence, canola, gravel. Earl's 1987 atlas is on the dash. You cannot " +
        "read it. Clementine can, but she is refusing on principle. 'Earl would know,' she says. Earl is not here.",
      choices: [
        { label: 'Follow the atlas', hint: 'Gamble: page 42',
          outcome: 'Clementine relents and reads you the atlas, in a tone.',
          roll: { chance: 0.5,
            success: { effects: { chemistry: 4 }, outcome: 'The atlas is right. Of course it is right. You arrive on time. Clementine says "Earl" and nothing else.' },
            fail: { effects: { burnout: 5, van: { condition: -3 } }, outcome: 'The atlas sends you to a town that is gone. You back up a kilometre. The Suburban scrapes a culvert.' } } },
        { label: 'Ask a farmer', hint: 'Burnout ↑ · Fans ↑', effects: { burnout: 3, fans: 4 },
          outcome: 'A farmer on a tractor gives directions using only landmarks that no longer exist. He also asks for a CD. You arrive. Eventually.' },
        { label: 'Call Earl', hint: 'Chemistry ↑', effects: { chemistry: 3 },
          outcome: 'Earl answers on the first ring. He knows exactly where you are from your description of one fence post. He is thrilled to be asked.' }
      ] },
    { id: 'road_grr_you_stall', type: 'road', speaker: 'travis', title: 'You Stalled It', once: false, cooldown: 10, gate: road({ driver: YOU }),
      text: "You stalled {van} at the only traffic light in Gull Lake. Then again. Travis Lee, who learned stick from Earl, is leaning forward " +
        "from the back seat with the terrible patience of a new expert. 'Clutch in. Easy,' he says. 'Clutch IN.'",
      choices: [
        { label: 'Let Travis coach you', hint: 'Travis ↑ · Burnout ↑', effects: { mood: { travis: 8 }, burnout: 3 },
          outcome: 'He tells you a story per gear, like Earl did. It works. He is insufferable about it for a week. You have earned it.' },
        { label: 'Let Travis drive', hint: 'Gamble: the condo kid at the wheel',
          outcome: 'Travis Lee climbs over the seat before you can say no.',
          roll: { chance: 0.6,
            success: { effects: { mood: { travis: 10 }, chemistry: 3 }, outcome: 'He drives the rest of the way without one stall. He does twenty under. Nobody says a word. Everyone thinks it.' },
            fail: { effects: { burnout: 4, van: { condition: -3 } }, outcome: 'He stalls at the same light. Then he rolls back into a mailbox. The mailbox belongs to Honest Gus.' } } },
        { label: 'Just keep trying', hint: 'Your chops ↑', effects: { drumSkill: 1, burnout: 3 },
          outcome: "On the fourth try you feel it: clutch, gas, a rhythm. It's a groove. You're a musician. You drive in time from now on." }
      ] },
    { id: 'road_grr_you_gas_argument', type: 'road', speaker: 'duke', title: 'The Gas Station Argument', once: false, cooldown: 10, gate: road({ driver: YOU }),
      text: "Gas station outside Herbert. Duke wants jerky. Clementine wants to leave. Travis wants to look at the used trucks across the road. " +
        "Nobody agrees on the route. Earl always settled this with a story. There is no story. Only chaos.",
      choices: [
        { label: 'Driver decides', hint: 'Chemistry ↓ · Burnout ↓', effects: { chemistry: -3, burnout: -3 },
          outcome: 'You pick the highway. Everyone sulks for ten minutes. Then Duke shares the jerky and everyone is friends again.' },
        { label: 'Vote on it', hint: 'Gamble: democracy at a gas station',
          outcome: 'Four people, three routes, one jerky.',
          roll: { chance: 0.5,
            success: { effects: { chemistry: 4 }, outcome: 'The vote is 3-1 for the highway. Travis concedes gracefully. He buys the truck across the road anyway. Kidding.' },
            fail: { effects: { burnout: 5 }, outcome: 'The vote is 2-2. The hat abstains. You are still there forty minutes later. The jerky is gone.' } } },
        { label: 'Tell an Earl story', hint: 'Chemistry ↑ · Burnout ↑', effects: { chemistry: 5, burnout: 3 },
          outcome: 'You tell the 1979 story, badly, from memory. Everyone corrects you. By the end the band is laughing and back in the van.' }
      ] },
    { id: 'road_grr_you_atlas_dash', type: 'road', speaker: 'clementine', title: "Earl's Atlas Stays on the Dash", once: false, cooldown: 14, gate: road({ driver: YOU, minKm: 60 }),
      text: "Nobody has moved Earl's atlas off the dashboard. It is open to page 42. Every trip, somebody looks at it and goes quiet. Today " +
        "Clementine picks it up and reads the pencil notes in the margins. They are all about the band.",
      choices: [
        { label: 'Read them aloud', hint: 'Chemistry ↑↑', effects: { chemistry: 7 },
          outcome: '"Clementine smiled at the waltz, Maple Creek." "Duke: four notes, Gull Lake!" The band drives the rest of the way in silence.' },
        { label: 'Put it back on page 42', hint: 'Burnout ↓', effects: { burnout: -4 },
          outcome: 'She puts it back, open, exactly as it was. Nobody says anything. Everyone feels better.' },
        { label: 'Mail it to Earl', hint: '−$15 · Chemistry ↑', effects: { fund: -15, chemistry: 3 },
          outcome: 'Earl calls when it arrives. He does not say thank you. He tells you which markers you missed. It is the same thing.' }
      ] },

    // ---- The band on the road (any driver) ----
    { id: 'road_grr_hat_sunroof', type: 'road', speaker: 'duke', title: 'The Hat and the Roof', once: false, cooldown: 10, gate: road({ minKm: 40 }),
      text: "The hat does not fit in {van} with Duke under it. It never has. Duke rides with the hat through the sunroof, which is not a sunroof. " +
        "It is a hole Vern cut. It is minus twenty. The hat is fine. Duke's ears are not.",
      choices: [
        { label: 'Hat in the cargo area', hint: 'Duke ↓ · Burnout ↓', effects: { mood: { duke: -5 }, burnout: -3 },
          outcome: 'The hat rides in the back on the merch box, belted in. Duke checks on it every ten kilometres. He turns around fully to do it.' },
        { label: 'Duct-tape the gap', hint: 'Van ↑ · Chemistry ↑', effects: { chemistry: 3, van: { condition: 3 } },
          outcome: 'A duct-tape collar around the hat hole. Warm, sealed, ridiculous. {driver} says it is "the most weatherproof the van has ever been".' },
        { label: 'Toques for everyone', hint: '−$30 · Everyone ↑', effects: { fund: -30, mood: { all: 3 } },
          outcome: 'Five toques from the Co-op. Duke wears his over the hat. Nobody has seen anything like it. It is on the band page by Tuesday.' }
      ] },
    { id: 'road_grr_truck_lot', type: 'road', speaker: 'travis', title: 'Trucks for Sale', once: false, cooldown: 10, gate: road({ minKm: 60 }),
      text: "Every small town has a lot of used trucks for sale on the edge of it, and Travis Lee wants to stop at every one. 'Just to look.' " +
        "He has already looked at four today. He has named two of them. He owns a truck. He knows this.",
      choices: [
        { label: 'Stop. Just to look.', hint: 'Travis ↑ · Burnout ↑', effects: { mood: { travis: 6 }, burnout: 3 },
          outcome: 'Twenty minutes walking around a 1979 half-ton. Travis Lee pats it goodbye. He writes a song about it in the back seat.' },
        { label: 'Drive past. Fast.', hint: 'Travis ↓', effects: { mood: { travis: -5 } },
          outcome: 'Travis Lee presses his face to the window as you pass. He does not speak until the next town. Which has a lot.' },
        { label: 'Make it a band game', hint: 'Chemistry ↑', effects: { chemistry: 4 },
          outcome: '"Name that truck": one point for the year, two for the model, five for a sad backstory. Travis wins. Earl disputes a year.' }
      ] },
    { id: 'road_grr_cattle_drive', type: 'road', speaker: 'clementine', title: 'Cattle on the Road', once: false, cooldown: 10, gate: road({ minKm: 40 }),
      text: "A rancher is moving two hundred head of cattle down the grid road to new pasture. {van} is in the middle of them. The cattle are in " +
        "no hurry. A cow is looking in Clementine's window. Clementine is looking back. Neither of them blinks.",
      choices: [
        { label: 'Wait it out', hint: 'Burnout ↑ · Chemistry ↑', effects: { burnout: 3, chemistry: 3 },
          outcome: 'Forty minutes at cow speed. The rancher waves. Duke waves the hat. Two hundred cows look at the hat. It is a moment.' },
        { label: 'Play them a tune', hint: 'Gamble: fiddle for cattle',
          outcome: 'Clementine rolls down the window and plays a slow air.',
          roll: { chance: 0.55,
            success: { effects: { buzz: 5, mood: { clementine: 5 } }, outcome: 'The herd parts like a curtain and the Suburban rolls through. The rancher asks for her number. For the next drive.' },
            fail: { effects: { burnout: 4 }, outcome: 'The cows stop to listen. All of them. Right there. You are there for an encore, whether you want one or not.' } } },
        { label: 'Help the rancher', hint: 'Fans ↑ · Burnout ↑', effects: { fans: 6, burnout: 4 },
          outcome: 'Everyone gets out and walks cattle for a mile. The rancher comes to your gig that night. So do his three sons. They bring the dog.' }
      ] },
    { id: 'road_grr_shotgun', type: 'road', speaker: 'travis', title: 'The Fight for Shotgun', once: false, cooldown: 8, gate: road({}),
      text: "Shotgun is up for grabs. Travis wants it to 'watch the road, as a driver'. Duke wants it because the hat fits better in front. " +
        "Clementine wants it because she called it in French, which apparently counts. {driver} would like everyone to get in the van.",
      choices: [
        { label: 'The hat gets shotgun', hint: 'Duke ↑ · Travis ↓', effects: { mood: { duke: 6, travis: -4 } },
          outcome: 'Duke rides up front. The hat blocks the right mirror. {driver} navigates by feel. It works, somehow.' },
        { label: 'Clementine called it', hint: 'Clementine ↑ · Chemistry ↑', effects: { mood: { clementine: 5 }, chemistry: 2 },
          outcome: 'Clementine rides up front and reads every sign aloud in both languages. Duke and Travis share the back and make up.' },
        { label: 'Rock, paper, scissors', hint: 'Gamble: best of three',
          outcome: 'Three people, three hands, a gravel shoulder.',
          roll: { chance: 0.5,
            success: { effects: { chemistry: 4 }, outcome: 'Travis wins with paper, twice. He rides shotgun and watches the road like a driver. He is so proud.' },
            fail: { effects: { burnout: 4 }, outcome: 'Duke wins, but the hat is not allowed to play. Everyone argues. You leave twenty minutes late.' } } }
      ] },
    { id: 'road_grr_bb_pass', type: 'road', speaker: 'duke', title: 'The Crew Cab Passes You', once: false, cooldown: 14, gate: road({ minKm: 80 }),
      text: "A lifted crew cab with two faces on the tailgate blows past {van} on the Trans-Canada, towing a flatbed. On the flatbed, strapped " +
        "into a lawn chair, is Titan Tim, in full costume. He waves a side mirror at you. It is {rival}.",
      choices: [
        { label: 'Wave back', hint: 'Chemistry ↑', effects: { chemistry: 3 },
          outcome: 'Duke waves the hat. Tim waves the mirror. Brayden honks a tailgate-song rhythm. It is civil. It is almost friendly.' },
        { label: 'Race them', hint: 'Gamble: a Suburban vs. a crew cab',
          outcome: '{driver} floors it. {van} makes a sound like a combine.',
          roll: { chance: 0.25,
            success: { effects: { buzz: 8 }, outcome: 'They slow down to wave again and you get past for one glorious kilometre. Travis films it. It is enough.' },
            fail: { effects: { burnout: 3, van: { condition: -4 } }, outcome: 'The crew cab disappears. {van} overheats at the next hill. Titan Tim is waiting at the top, waving.' } } },
        { label: 'Film it for the fans', hint: 'Buzz ↑ · Travis ↓', effects: { buzz: 5, mood: { travis: -3 } },
          outcome: '"Our rivals, in their natural habitat." The clip gets more views than their last video. Brayden comments "lol respect".' }
      ] },
    { id: 'road_grr_canola_sunset', type: 'road', speaker: 'clementine', title: 'The Canola at Sunset', once: false, cooldown: 12, gate: road({ minKm: 40, season: ['summer'] }),
      text: "The sun is going down over a canola field so yellow it hurts. {driver} has pulled over without being asked. Clementine has " +
        "got out of the van and is standing in the ditch, very still, looking at it. She is not saying anything.",
      choices: [
        { label: 'Stand with her', hint: 'Chemistry ↑ · Burnout ↓', effects: { chemistry: 4, burnout: -3 },
          outcome: 'The whole band stands in the ditch until the light is gone. Clementine says "it is not bad" in a small voice. It is a confession.' },
        { label: 'Play something', hint: 'Clementine ↑ · Fans ↑', effects: { mood: { clementine: 6 }, fans: 3 },
          outcome: 'She plays a waltz into the field. A farmer on a quad stops at the fence line to listen, then waves, and drives off.' },
        { label: 'Keep driving', hint: 'Clementine ↓', effects: { mood: { clementine: -4 } },
          outcome: 'She gets back in. She watches the field until it is gone. She says nothing for fifty kilometres. It was important.' }
      ] }
  ]);

  /* ======================================================================================================================
     Studio events (24_sim_labels, one per studio week; effect key production ±n). Gated to the band, any studio.
     ====================================================================================================================== */
  addCards(list(K, 'studioEvents'), [
    { id: 'studio_grr_twang', type: 'drama', speaker: 'travis', title: 'More Twang, Please', once: false, cooldown: 10, gate: only({}),
      text: "The producer wants 'more twang' on the vocal. Travis Lee has given all the twang he has. He grew up on the ninth floor of a " +
        "condo. The engineer suggests a plug-in called 'Twang Pro'. Travis Lee has gone very pale.",
      choices: [
        { label: 'Natural twang only', hint: 'Production ↑ · Travis ↑', effects: { production: 3, mood: { travis: 6 } },
          outcome: 'Travis Lee sings it again, thinking about his truck. The twang arrives on its own. The producer says "that". Just "that".' },
        { label: 'Use Twang Pro', hint: 'Gamble: nobody will know',
          outcome: 'The engineer clicks it on at 30%.',
          roll: { chance: 0.4,
            success: { effects: { production: 5 }, outcome: 'Nobody can tell. Critics praise his "authentic prairie voice". Travis knows. He lives with it.' },
            fail: { effects: { production: -3, mood: { travis: -8 } }, outcome: 'It sounds like a robot at a rodeo. Clementine laughs for the first time on record. It stays on the B-side.' } } },
        { label: 'Let Earl coach him', hint: 'Production ↑ · Burnout ↑', effects: { production: 2, burnout: 4 },
          outcome: 'Earl explains twang for an hour with reference to 1979. Travis Lee sings it perfectly out of sheer exhaustion.' }
      ] },
    { id: 'studio_grr_earl_1979', type: 'weird', speaker: 'earl', title: "Earl's 1979 Story, Mid-Take", once: false, cooldown: 10, gate: only({}),
      text: "Take seven was perfect until the second verse, when Earl stopped playing to tell the engineer about a session in 1979, in this " +
        "exact studio, or one like it. The engineer is listening. The tape is rolling. The story is also perfect.",
      choices: [
        { label: 'Keep the story in', hint: 'Production ↑ · Earl ↑', effects: { production: 3, mood: { earl: 8 } },
          outcome: 'The story becomes a spoken bridge. Critics call it "the heart of the record". Earl calls it "the truth". Both are true.' },
        { label: 'Take eight, no stories', hint: 'Production ↑ · Earl ↓', effects: { production: 2, mood: { earl: -6 } },
          outcome: 'Take eight is clean and correct. Earl plays it like a man biting his tongue. You can hear the tongue. It is fine.' },
        { label: 'Record the story separately', hint: 'Production ↑ · Burnout ↑', effects: { production: 2, burnout: 4 },
          outcome: 'Earl records the full story, all forty minutes, in the vocal booth. It becomes a bonus track. Some fans only listen to that.' }
      ] },
    { id: 'studio_grr_hat_mic', type: 'weird', speaker: 'duke', title: 'The Hat Hits the Mic', once: false, cooldown: 10, gate: only({}),
      text: "Duke is singing a backing vocal. The brim of the hat keeps hitting the pop filter. The engineer asks, politely, if the hat could " +
        "come off for one take. Duke looks at the engineer the way you would look at someone who asked for a kidney.",
      choices: [
        { label: 'Raise the mic', hint: 'Production ↑ · Duke ↑', effects: { production: 3, mood: { duke: 6 } },
          outcome: 'The mic goes up eighteen inches. Duke sings into it from under the brim. It sounds huge. The hat is a natural reflection filter.' },
        { label: 'Hat off, one take', hint: 'Gamble: Duke without the hat',
          outcome: 'Duke removes the hat and places it on a stool, facing him.',
          roll: { chance: 0.4,
            success: { effects: { production: 5 }, outcome: 'He sings like a man with nothing left to hide. It is the best vocal on the record. He puts the hat back on immediately.' },
            fail: { effects: { production: -3, mood: { duke: -8 } }, outcome: 'He cannot do it. He sings flat, looking at the hat the whole time. The hat seems to be judging him.' } } },
        { label: 'Record the brim hits', hint: 'Production ↑ · Chemistry ↑', effects: { production: 2, chemistry: 3 },
          outcome: 'The brim tapping the filter is in time. You keep it as percussion. Liner notes: "Hat: Duke Harlan\'s hat".' }
      ] },
    { id: 'studio_grr_bach_break', type: 'drama', speaker: 'clementine', title: 'Bach in the Breakdown', once: false, cooldown: 12, gate: only({}),
      text: "Clementine has played the fiddle break perfectly eleven times. On take twelve, alone in the booth, she plays four bars of Bach " +
        "instead. She thinks the mic is off. It is not. The engineer is holding very still.",
      choices: [
        { label: 'Keep take twelve', hint: 'Production ↑ · Clementine ↓', effects: { production: 4, mood: { clementine: -5 } },
          outcome: 'The Bach goes on the record, hidden in the breakdown. Critics call it "sublime". Clementine refuses to discuss it. Ever.' },
        { label: 'Tell her. Let her decide.', hint: 'Production ↑ · Clementine ↑', effects: { production: 2, mood: { clementine: 8 } },
          outcome: "She listens back, twice. 'Keep it,' she says. 'But credit it to the Quonset.' The liner notes say: 'Bach: the Quonset'." },
        { label: 'Wipe it. Take eleven.', hint: 'Production ↑', effects: { production: 2 },
          outcome: 'Take eleven goes on the record. Nobody ever mentions twelve. Clementine buys the engineer a coffee for no reason.' }
      ] },
    { id: 'studio_grr_truck_engine', type: 'weird', speaker: 'travis', title: 'Record the Truck', once: false, cooldown: 12, gate: only({}),
      text: "Travis Lee wants the truck song to start with the sound of his actual 1987 truck starting. He has driven it to the studio. It is " +
        "parked at the loading door. The engineer has run a mic out to the tailpipe. The truck has to start on the first try.",
      choices: [
        { label: 'Record it', hint: 'Gamble: the truck starts or it doesn\'t',
          outcome: 'Travis turns the key. Everyone holds their breath.',
          roll: { chance: 0.5,
            success: { effects: { production: 5, mood: { travis: 8 } }, outcome: 'First try. The engine catches, coughs, roars. It is the intro. Travis Lee cries in the cab. The engineer does too.' },
            fail: { effects: { production: 2, mood: { travis: -4 } }, outcome: 'Eleven tries. Take eleven is the one. You can hear Earl saying "clutch in" on it. It stays.' } } },
        { label: 'Use a sample', hint: 'Production ↑ · Travis ↓', effects: { production: 2, mood: { travis: -6 } },
          outcome: 'The engineer uses a truck sample from a library. It is a Prairie Titan. Travis Lee finds out at the listening party.' },
        { label: 'Record it at the Quonset', hint: '−$60 · Production ↑', effects: { fund: -60, production: 3 },
          outcome: 'The engineer drives out to the Quonset with a portable rig. The truck starts in its own yard. Doris neighs. It is all on the record.' }
      ] },
    { id: 'studio_grr_bb_bleed', type: 'money', speaker: 'bb_brayden', title: 'Buckle & Boot Next Door', once: false, cooldown: 14, gate: only({}),
      text: "Buckle & Boot are recording in Studio B. Their tailgate song is bleeding through the wall into your ballad. Brayden pops in: " +
        "'Hey bud! Sheldon says we could do a split single. $400. Tailgates and hay bales!' Titan Tim is in the hallway.",
      choices: [
        { label: 'Take the $400', hint: '+$400 · Production ↑ · Travis ↓', effects: { fund: 400, production: 2, mood: { travis: -8 } },
          outcome: 'A split single: their tailgate on side A, your waltz on side B. Travis Lee scratches out side A on every copy he signs.' },
        { label: 'Offer Colt a real guitar part', hint: 'Gamble: Colt can play?',
          outcome: 'Earl hands Colt a plugged-in guitar.',
          roll: { chance: 0.4,
            success: { effects: { production: 4, buzz: 6 }, outcome: 'Colt plays one chord on your record. It is in tune. He cries. Brayden does not know. Nobody tells Brayden.' },
            fail: { effects: { production: -2 }, outcome: 'Colt plays air guitar on your record, very passionately. You can hear the strap creaking. It stays in.' } } },
        { label: 'Soundproof the wall', hint: '−$120 · Production ↑', effects: { fund: -120, production: 3 },
          outcome: 'Duke hangs Vern\'s horse blankets on the shared wall. The tailgate song fades to a hum. Your ballad breathes again.' }
      ] },
    { id: 'studio_grr_click', type: 'drama', speaker: 'earl', title: 'Earl Will Not Play to a Click', once: false, cooldown: 10, seat: ['drums'], gate: only({}),
      text: "The producer wants a click track. Earl has never played to a click. 'In 1979 we had a drummer,' he says, and points at you. " +
        "The producer points at the click. Earl points at you again. You are the drummer. Everyone is looking at you.",
      choices: [
        { label: 'No click. Follow the drummer.', hint: 'Drum skill ↑ · Production ↑', effects: { drumSkill: 1, production: 3 },
          outcome: 'You count it in off your own heartbeat. It breathes, a little. The producer says it feels "human". Earl says it feels "right".' },
        { label: 'Click for the drums only', hint: 'Production ↑ · Earl ↑', effects: { production: 2, mood: { earl: 4 } },
          outcome: 'You play to the click. Earl plays to you. It is tight and warm. Earl calls it "the 1979 method". It was not. It works.' },
        { label: 'Everybody plays to the click', hint: 'Gamble: Earl tries',
          outcome: 'Earl puts on the headphones like they are a hat he does not trust.',
          roll: { chance: 0.4,
            success: { effects: { production: 5 }, outcome: 'Perfect time, first take. Earl takes the headphones off and says "huh". It is the tightest record you have made.' },
            fail: { effects: { production: -3, mood: { earl: -6 } }, outcome: 'Earl plays behind the click on purpose, out of principle. It sounds like two songs. You go back to plan A.' } } }
      ] }
  ]);

  /* ======================================================================================================================
     The Loonies (24_sim_labels / 59c): outfit cards (flag-gated by the truck storyline and the hat; the first that passes is
     dealt), the speech and the Worst Van speech (Earl, the driver, accepts), the carpet, win / lose lines and the nominees.
     ====================================================================================================================== */
  var OUT = obj(AW, 'outfits');
  if (!OUT.pearl_snaps) OUT.pearl_snaps = 'Pearl-snap shirts and pressed jeans';
  if (!OUT.truck_jacket) OUT.truck_jacket = 'A jacket made from the old truck\'s seat covers';
  if (!OUT.the_hat) OUT.the_hat = 'The hat, and whatever is under it';
  function ofx(extra, outfit) { var o = { flags: { loonieOutfit: outfit } }; for (var k in extra) o[k] = extra[k]; return o; }
  addCards(list(AW, 'outfitCards'), [
    { id: 'loonie_outfit_grr_truck', type: 'fame', speaker: 'travis', title: 'The Carpet: The Truck Jacket', once: false, cooldown: 20,
      gate: only({ flags: ['truckStory'] }),
      text: "Travis Lee has had a jacket made from the old seat covers of his 1987 truck: rust-red vinyl, a cigarette burn from a previous " +
        "owner, the Prairie Titan logo on the back. He wants to wear it on the Loonies carpet. Clementine is speechless.",
      choices: [
        { label: 'The truck jacket', hint: 'Buzz ↑ · Travis ↑', effects: ofx({ buzz: 8, mood: { travis: 8 } }, 'truck_jacket'),
          outcome: "Forty photographers shout 'WHERE'S THE TRUCK?' Travis points at his jacket. It is the story of the night. Sheldon wants one." },
        { label: 'Park the truck on the carpet', hint: 'Gamble: security has opinions',
          outcome: 'Travis Lee drives the actual truck to the carpet entrance.',
          roll: { chance: 0.5, stat: 'buzz', statScale: 0.005,
            success: { effects: ofx({ buzz: 14, fans: 150 }, 'truck_jacket'), outcome: 'It does not stall. He parks it at the end of the carpet and poses on the hood. Best Dressed goes to the truck.' },
            fail: { effects: ofx({ buzz: 5, mood: { travis: -6 } }, 'truck_jacket'), outcome: 'It stalls in the valet lane. Security pushes it. Travis steers, in the jacket, with dignity.' } } },
        { label: 'Pearl snaps, like adults', hint: 'Chemistry ↑', effects: ofx({ chemistry: 4, fans: 100 }, 'pearl_snaps'),
          outcome: 'Matching pearl-snap shirts, pressed by Clementine. The band looks like a band. Travis keeps the jacket in the truck. Just in case.' }
      ] },
    { id: 'loonie_outfit_grr_hat', type: 'fame', speaker: 'duke', title: 'The Carpet: The Hat', once: false, cooldown: 20,
      gate: only({ flags: ['hatInsured'] }),
      text: "The hat is insured now, so the Loonies have asked the insurer to send an escort. There is a man in a suit whose only job tonight " +
        "is to walk beside the hat. Duke would like the hat to have its own spot on the carpet.",
      choices: [
        { label: 'The hat walks alone', hint: 'Buzz ↑ · Duke ↑', effects: ofx({ buzz: 8, mood: { duke: 8 } }, 'the_hat'),
          outcome: "The escort carries the hat down the carpet on a velvet cushion. Duke walks behind it. Photographers ask the hat who it's wearing." },
        { label: 'Matching hats for all', hint: 'Gamble: five hats, one carpet',
          outcome: 'Duke has bought four more hats, slightly smaller than his.',
          roll: { chance: 0.5, stat: 'chemistry', statScale: 0.005,
            success: { effects: ofx({ buzz: 12, fans: 120 }, 'the_hat'), outcome: "Five hats, descending in size, like a family portrait. A fashion site calls it 'prairie formal'. Best Dressed." },
            fail: { effects: ofx({ buzz: 4, burnout: 5 }, 'the_hat'), outcome: 'The hats block the step-and-repeat. Nobody can see the band. Only the hats are in the photos.' } } },
        { label: 'Pearl snaps and the hat', hint: 'Chemistry ↑', effects: ofx({ chemistry: 3, fans: 80 }, 'pearl_snaps'),
          outcome: 'Pressed shirts and one enormous hat. Classic. The escort stands at the side all night, looking at the hat. He is a fan now.' }
      ] },
    { id: 'loonie_outfit_grr_snaps', type: 'fame', speaker: 'clementine', title: 'The Carpet: What to Wear', once: false, cooldown: 20,
      gate: only({}),
      text: "The Loonies want 'formal attire'. The band owns pearl-snap shirts, one blazer (Earl's, from 1979) and Clementine's concert gown, " +
        "which she brought 'in case'. She is holding the gown in its bag. She is not saying why she brought it.",
      choices: [
        { label: "Clementine's gown", hint: 'Fans ↑ · Clementine ↑', effects: ofx({ fans: 100, mood: { clementine: 8 } }, 'pearl_snaps'),
          outcome: 'The gown, with cowboy boots. The band in pearl snaps around her. It is the most photographed outfit of the night. She hates that she loves it.' },
        { label: "Earl's 1979 blazer", hint: 'Gamble: vintage or dated',
          outcome: 'Earl produces the blazer. It is brown corduroy. It has elbow patches.',
          roll: { chance: 0.5, stat: 'buzz', statScale: 0.005,
            success: { effects: ofx({ buzz: 12, fans: 120 }, 'pearl_snaps'), outcome: "Best Dressed. The designer on the panel calls it 'the most honest blazer of the year'. Earl says he wore it on the original." },
            fail: { effects: ofx({ buzz: 4, burnout: 5 }, 'pearl_snaps'), outcome: 'A button comes off on the carpet. Then another. Earl tells the photographers about 1979 while Clementine sews.' } } },
        { label: 'Pressed pearl snaps', hint: 'Chemistry ↑', effects: ofx({ chemistry: 4, buzz: 5 }, 'pearl_snaps'),
          outcome: 'Five pearl-snap shirts, pressed that morning. The photographers smell fabric softener and hay. Duke\'s hat gets its own photo anyway.' }
      ] }
  ]);
  perBand(AW, 'speech', { id: 'loonie_speech_grid_road_ramblers', type: 'fame', speaker: 'travis', title: 'The Speech', once: false, cooldown: 20, gate: only({}),
    text: "They said your name. The band is on stage holding a loonie the size of a hubcap. Travis Lee, for the first time in his life, hands you " +
      "the microphone. Earl takes two steps back. Duke tips the hat. You have thirty seconds before the music plays you off.",
    choices: [
      { label: 'Thank your mom', effects: { fans: 120, chemistry: 6, mood: { all: 6 }, chat: { who: 'mom', text: 'I was the one crying in row M. The loan is forgiven. Mostly.' } },
        outcome: 'You thank your mom for the loans, the hay bales and the itemized notes. The camera finds her. She is holding up an itemized note.' },
      { label: 'Thank the Quonset', effects: { buzz: 12, fans: 80, chemistry: 4 },
        outcome: "'And to Uncle Vern, and Wilf, and coffee row, and Doris the horse.' Somewhere near Swift Current, a whole Co-op cafeteria cheers." },
      { label: 'Hand the mic to Earl', hint: 'Gamble: the longest thirty seconds',
        outcome: 'You pass the microphone to Earl. He clears his throat. "In 1979..."',
        roll: { chance: 0.55, stat: 'buzz', statScale: 0.005,
          success: { effects: { buzz: 16, fans: 200, mood: { earl: 10 } }, outcome: 'He tells the whole story in twenty-nine seconds. It is perfect. The room stands. The orchestra waits. Legend.' },
          fail: { effects: { buzz: -6, mood: { all: -4 } }, outcome: 'Ninety seconds in, the orchestra plays him off. He keeps going over the music. It is the best part of the broadcast.' } } }
    ] });
  perBand(AW, 'speechWorstVan', { id: 'loonie_speech_van_grid_road_ramblers', type: 'fame', speaker: 'earl', title: 'Worst Van', once: false, cooldown: 20, gate: only({}),
    text: "You won Worst Van. {van} is parked outside, with a hole in the roof for Duke's hat. Somebody has to accept. Earl, who has driven " +
      "every kilometre of it at twenty under, stands. The whole arena turns to look at him. He is smiling.",
    choices: [
      { label: 'Let Earl accept it', effects: { buzz: 10, chemistry: 6, mood: { earl: 10 } },
        outcome: "Earl takes the trophy and says: 'She has never once been late. Slow. Never late.' Silence. Then a standing ovation." },
      { label: 'Thank the van by name', effects: { buzz: 8, fans: 60, mood: { all: 4 } },
        outcome: 'You thank {van}, the atlas and the duct-tape hat collar. A mechanic in the crowd yells "THE TRANSMISSION, THOUGH". Fair.' },
      { label: 'Blame the grid roads', effects: { fans: 120, mood: { travis: 5 } },
        outcome: 'Travis Lee takes the mic and blames forty years of gravel. Every rural municipality in the province issues a statement. Defensive.' }
    ] });
  // (role aliases, so whoever is in the band that year walks the carpet: Duke and Earl while they're in it)
  perBand(AW, 'carpet', [
    { who: 'reporter', text: 'Dolores, Speedy Creek 97, on the carpet. Who are you wearing tonight?' },
    { who: '@bassist', text: 'The hat. The rest is a formality.' },
    { who: 'reporter', text: 'Any predictions?' },
    { who: '@grumbler', text: 'I was nominated once before. We lost to a yodeller. I have a good feeling about tonight.' }
  ]);
  merge(band(AW), {
    win: ['Travis Lee is on stage before the envelope is fully open. He is crying. He has a speech. It is about a truck.',
      'Earl holds the trophy up to the light. "I played on the original," he says, to no one. This time it is true.',
      'Duke tips the hat at the trophy. The trophy, somehow, tips back.',
      'Wilf stands on his chair in the balcony. An usher asks him to sit. He does not sit. Coffee row would not sit.'],
    lose: ['Travis Lee applauds the winner with enormous sincerity and slightly wet eyes.',
      'Earl says the winner "had a good tone". From Earl, that is a eulogy.',
      "Clementine's expression does not change. Somehow you feel better.",
      'Duke adjusts the hat. It is a very dignified adjustment. The camera finds it.']
  });
  var NOM = obj(AW, 'nominees');
  if (!Array.isArray(NOM)) {
    NOM.country = addNew(Array.isArray(NOM.country) ? NOM.country : [], ['The Summerfallow Strangers', 'Barley & the Bale Twine', 'Hank Swath',
      'The Culvert Kings', 'Loretta and the Lift Kits', 'The Stubble Jumpers', 'Grain Bin Gospel', 'The Coulee Crooners']);
  }

  /* ======================================================================================================================
     Shop: the misprint (Q6: THE GRID ROAD RUMBLERS) and the band's group-chat lines (shop.byBand.grid_road_ramblers.lines).
     ====================================================================================================================== */
  var SH = obj(K, 'shop');
  var MP = { typo: 'THE GRID ROAD RUMBLERS', find: 'RAMBLERS', replace: 'RUMBLERS', stash: 'in the Quonset, behind the square baler' };
  var mpItem = (Array.isArray(SH.merch) ? SH.merch : []).filter(function (m) { return m && m.id === 'misprint'; })[0];
  if (mpItem) { var mpBy = obj(mpItem, 'byBand'); if (!mpBy[B]) mpBy[B] = MP; }
  else { var mpAlt = obj(obj(SH, 'misprint'), 'byBand'); if (!mpAlt[B]) mpAlt[B] = MP; }
  merge(obj(band(SH), 'lines'), {
    outro: [{ who: 'clementine', text: 'An outro. A proper ending, with a ritardando. Not everyone just stopping when Earl starts a story.' },
      { who: 'earl', text: 'In 1979 every song had an outro. You faded out on the fiddle. Let the fiddle have it.' }],
    solo: [{ who: 'earl', text: 'Solo section unlocked. Thirty-two bars. I will try to keep the story under sixteen.' }],
    misprintCollector: [{ who: 'duke', text: 'There is a fan page for RUMBLERS shirts now. The box behind the baler is worth money. I said this.' }],
    move: [{ who: 'travis', text: 'A real room with a lock. Vern says he will miss the noise. Vern is lying. Doris is crying.' }],
    van: [{ who: 'earl', text: 'New van. I moved the atlas in first. Page 42. Twenty under. Same rules, more seats.' }],
    merchUnlock: [{ who: 'duke', text: 'New merch. Every design has the hat on it. I approved them. The hat approved them.' }],
    evicted: [{ who: 'travis', text: 'Landlord changed the locks. We are three weeks behind. Back to the Quonset. Vern already put the coffee on.' }]
  });

  /* ======================================================================================================================
     Calendar (28_sim_calendar): season news by week (byBand replaces the flat week), holiday gig lines, Halloween
     costumes, and the holiday cards appended to each holiday's list.
     ====================================================================================================================== */
  var CAL = obj(K, 'calendar');
  merge(band(CAL), {
    news: {
      3: { who: 'duke', text: 'Frontier Days in town this week. Rodeo, midway, a beer garden stage. My hat has been asked to judge.' },
      5: { who: 'grr_vern', text: 'Harvest is starting. Combine is greased. If the band needs the Quonset, work around the combine.' },
      7: { who: 'travis', text: 'Harvest dances every weekend now. Every hall in the southwest. I want to play all of them.' },
      9: { who: 'earl', text: 'First snow on the grid roads. I have slowed down to sixty. Adjust your arrival times.' },
      11: { who: 'clementine', text: 'The Quonset is minus twelve inside. I am rehearsing in mittens. The fiddle is not amused.' },
      13: { who: 'duke', text: 'Minus 38. The Suburban would not start. Vern towed it to the shop with the tractor. We are rehearsing in his kitchen.' },
      15: { who: 'grr_wilf', text: 'Bonspiel season. Coffee row has entered a rink. We are called the Ramblers. We did not ask permission.' },
      17: { who: 'grr_vern', text: 'Calving season. If you hear something in the barn at 2 a.m., it is a calf. Or Travis. Check both.' },
      19: { who: 'travis', text: 'Seeding started. Vern let me drive the tractor for one row. It is not straight. It is my row.' },
      23: { who: 'clementine', text: 'The canola is blooming. It is very yellow. I am not moved by it. I took forty photographs.' }
    },
    holidayLines: {
      canada_day: ['Canada Day in Swift Current. A parade with combines in it. Duke\'s hat rides on the lead tractor.'],
      halloween: ['Halloween: the band plays in costume. Duke goes as a bigger hat. Nobody can tell the difference. Coffee row wants a photo.'],
      christmas: ['Christmas party season: a rink full of ugly sweaters, a cash bar and Vern doing the two-step with a broom.'],
      nye: ["New Year's Eve. Earl counts down from ten with a story for each number. Midnight hits during 1979."],
      st_patricks: ["St. Paddy's: green beer, a guy in a leprechaun hat and Clementine playing jigs she swears she doesn't know."]
    },
    costumes: ['{rival} (with a cardboard mascot)', 'a symphony orchestra (Clementine conducting)', 'a combine (all five of us, one cardboard box)']
  });
  var HOL = { canada_day: ['holiday_canada_day_grid_road_ramblers'],
    thanksgiving: ['holiday_thanksgiving_guilt_grid_road_ramblers', 'holiday_thanksgiving_grid_road_ramblers'],
    halloween: ['holiday_halloween_grid_road_ramblers'], grey_mug: ['holiday_grey_mug_grid_road_ramblers'],
    christmas: ['holiday_xmas_single_grid_road_ramblers', 'holiday_xmas_parties_grid_road_ramblers'], st_patricks: ['holiday_st_paddys_grid_road_ramblers'] };
  // The first card whose gate passes wins, and the base lane may list shared (all-band) holiday cards: the band's own go first.
  list(CAL, 'holidays').forEach(function (h) {
    if (!h || !HOL[h.id]) return;
    var rest = list(h, 'cards').filter(function (id) { return HOL[h.id].indexOf(id) < 0; });
    h.cards = HOL[h.id].concat(rest);
  });

  /* ======================================================================================================================
     Labels (24_sim_labels): the Ramblers' demands per label (demandsByBand; same kind = the band's version wins). Each
     carded demand is dramatised by a signed_grr_* Monday card that writes flags.demand<Kind>.
     ====================================================================================================================== */
  var LB = K.labels && K.labels.labels ? K.labels.labels : obj(K, 'labels');
  if (LB.monolith) obj(LB.monolith, 'demandsByBand')[B] = [
    { kind: 'radio', text: 'The single is 4:40. Radio needs 3:10. The fiddle break, the solo and "the part where Earl talks" have to go.', card: 'signed_grr_monolith_radio' },
    { kind: 'image', text: 'An image consultant is flying in. The hat is "distracting".', card: 'signed_grr_monolith_image' },
    { kind: 'feature', text: 'A duet for reach with a trending act. The act is Buckle & Boot.', card: 'signed_grr_monolith_duet' }
  ];
  if (LB.gopherwood) obj(LB.gopherwood, 'demandsByBand')[B] = [
    { kind: 'showcase', text: "Play Wendell's Christmas showcase in the Humboldt feed store. Every year. Earl drives.", card: 'signed_grr_gopherwood_showcase' }
  ];

  /* ======================================================================================================================
     Recap (2d_sim_recap): "a good year" in the band's voices (year one), and a few band headlines.
     ====================================================================================================================== */
  var RC = obj(K, 'recap');
  var GOOD = [
    { topic: 'fans', who: ['travis'], target: 250,
      good: 'A good year? {target} new fans. We got {n}. That is a whole rodeo grandstand. I might cry. I am crying.',
      bad: 'A good year is {target} new fans. We got {n}. That is a church supper. A good church supper. Next year, the grandstand.' },
    { topic: 'songs', who: ['earl'], target: 6,
      good: 'Six songs makes a year. We wrote {n}. In 1979 we wrote {n} in a week. But these are better. Do not tell anyone.',
      bad: 'A good year is {target} songs. We wrote {n}. I have a story about a year like that. It ends well. Mostly.' },
    { topic: 'gigs', who: ['duke'], target: 10,
      good: 'Ten gigs is a real year. We played {n}. The hat has been to more halls than most people.',
      bad: 'A real band plays {target} gigs a year. We played {n}. The hat needs more air.' },
    { topic: 'loans', who: ['mom'], target: 0,
      good: 'A good year is one where you do not borrow from us. You did not! I am putting this on the fridge. Next to the hay receipt.',
      bad: 'A good year is one where you do not borrow from us. You borrowed {n} times. I have itemized it. It is on the fridge.' },
    { topic: 'chemistry', who: ['clementine'], target: 60,
      good: 'A good year. Everyone was in tune. Mostly. I was not unhappy. Do not quote me.',
      bad: 'A difficult year. Nobody tuned. The horse was in rehearsal. I stayed anyway. Note that I stayed.' }
  ];
  if (Array.isArray(RC.goodYear) || RC.goodYear == null) band(RC).goodYear = GOOD;
  else RC.goodYear[B] = GOOD;
  merge(band(RC), { headlines: {
    survive: ['{band} Survive Year {nth}; Quonset Still Standing', '{band} Complete Year {nth}; Hat Unharmed'],
    fans: ['{band} Add {n} Fans; Coffee Row Takes Credit', '{n} New Fans for {band}; Most of Them in Hats'],
    loans: ['{band} Borrow From Parents Again; Itemized Notes Arrive'],
    best_s: ['{band} Level {venue}; Earl Says He Played There in 1979']
  } });

  /* ======================================================================================================================
     Logo lines (2e_sim_logo): picked / rebrand, [{ who, text }] or { <memberId>: [text] }.
     ====================================================================================================================== */
  var LG = obj(obj(K, 'logo'), 'lines');
  function logoLines(key, byMember) {
    var cur = LG[key];
    if (Array.isArray(cur) || cur == null) {
      cur = LG[key] = Array.isArray(cur) ? cur : [];
      for (var id in byMember) byMember[id].forEach(function (t) {
        if (!cur.some(function (x) { return x && x.who === id && x.text === t; })) cur.push({ who: id, text: t });
      });
    } else for (var id2 in byMember) cur[id2] = addNew(Array.isArray(cur[id2]) ? cur[id2] : [], byMember[id2]);
  }
  logoLines('picked', {
    travis: ['The logo is done. I painted it on the truck door. Loretta has a logo now. She looks proud.', 'Logo approved. It looks like a brand on a steer. In a good way.'],
    earl: ['Good logo. In 1979 our logo was a guitar pick taped to a poster. This is better.', 'Logo is on the atlas cover now. Page 42 feels official.'],
    clementine: ['The lettering is acceptable. The kerning is not. I will allow it.', 'It is on the fiddle case now. Next to the Bach. Discreetly.'],
    duke: ['The logo fits on the hat band. That was my only requirement.', 'Good logo. The hat approves.']
  });
  logoLines('rebrand', {
    travis: ['New logo. I kept the old one on the truck. Loretta does not like change.', 'Rebranded. It still says Ramblers. I checked. Twice.'],
    earl: ['New logo. I have seen eleven rebrands. This is one of the good ones.', 'Rebrand done. The old sticker stays on the Suburban. The Suburban has seniority.'],
    clementine: ['A new logo. The kerning is fixed. I did it. You are welcome.', 'Rebrand. I preferred the old one. I will not elaborate.'],
    duke: ['New logo. The hat is bigger in this one. Correct decision.', 'Rebranded. The hat band has been updated. The hat is at peace.']
  });

  /* ======================================================================================================================
     Songs, album words and reviews (country is the Ramblers' genre; the pools are genre-keyed, reviews are byBand).
     ====================================================================================================================== */
  var TAKEN = [];   // never hand out a rival's title as ours
  Object.keys(cast).forEach(function (rid) { (cast[rid].songs || []).forEach(function (t) { TAKEN.push(String(t)); }); });
  var ST = obj(K, 'songTitles');
  addNew(list(ST, 'country'), [
    'Loretta (1987)', 'Clutch In, Son', 'Stalled at the Only Light in Town',
    'Page 42', 'Twenty Under the Limit', 'I Played on the Original', 'Nineteen Seventy-Nine', 'The Marker Where the Elevator Was',
    'Hat Too Big for the Suburban', 'Three Notes and a Hat', 'The Hat Is Not for Sale', 'Brim of My Heart',
    'Bach in the Breakdown', 'Slumming It (Secretly Loving It)', 'Fiddle Is a Violin', 'Maman, I Live in a Quonset',
    'Coffee Row at 6:40', 'Wilf Says We Are All Right', "Vern's Canola", 'Biscuit, Come By', 'Doris Ate the Setlist',
    'Picking Rocks for Rent', 'Summerfallow Heart', 'Hay Bale Throne', 'Quonset Echo', 'Chinook Took the Door',
    'Seed Cap Quilt', 'Ninety-One Years (The Elevator Song)', 'The Old Way', 'Balance Owing', 'Six-Forty A.M.',
    'Calving Season', 'Somebody Else\'s Windbreak', 'Harvest Supper Waltz', 'Gull Lake Traffic Light', 'Honest Gus',
    'Ute Song (Truck Song)', 'Tumbleworth in January', 'Rust-Red Half-Ton', 'Grid Road Tough', 'Frontier Days',
    'Southwest Bugle', 'Dust on the Dashboard'
  ].filter(function (t) { return TAKEN.indexOf(t) < 0; }));
  var AWC = obj(obj(obj(K, 'albumWords'), 'titles'), 'country');
  addNew(list(AWC, 'forms'), ['Twenty Under {place}', '{adj} Half-Ton', 'Songs for {noun}', 'Page 42: {place}']);
  addNew(list(AWC, 'adj'), ['Dusty', 'Faded', 'Honest', 'Lonesome', 'Golden', 'Prairie', 'Long', 'Broken', 'Sunday', 'Harvest',
    'Rust-Red', 'Summerfallow', 'Stalled', 'Twangy', 'Slow', 'Seeded', 'Unplugged', 'Sweet', 'Coulee', 'Southwest', 'Grid-Road', 'Bale-Twine']);
  addNew(list(AWC, 'noun'), ['Grain', 'Quonset', 'Tailgate', 'Barley', 'Tractor', 'Coffee Row', 'Fence Line', 'Wheat', 'Gravel', 'Dust',
    'Half-Ton', 'Hay Bale', 'Heeler', 'Canola', 'Combine', 'Seed Cap', 'Windbreak', 'Stubble', 'Culvert', 'Road Atlas', 'Clutch', 'Hat']);
  addNew(list(AWC, 'place'), ['the Quonset', 'Swift Current', 'the Grid Road', 'Coffee Row', 'the Auction Mart', 'Maple Creek', 'the Home Quarter',
    'Gull Lake', 'Shaunavon', 'Herbert', 'the Co-op', 'Highway 1', 'the Cypress Hills', 'the Legion', 'the Hay Loft', 'the Coulee',
    'Page 42', 'the Rodeo Grounds', 'the South Quarter', 'the Seed Plant', 'Vern\'s Yard', 'the Truck Stop']);

  var OUTL = obj(obj(K, 'reviews'), 'outlets');
  var REV = {
    rolling_scone: {
      awful: ['In my day country music was about trucks. {band} are also about trucks. That is the only thing they have in common with my day.',
        '{album} has a fiddle, a hat and a man singing about a truck he clearly bought last year. I could tell. My wife could tell.'],
      meh: ['There is a real song hiding in {single}. It needs a harmonica and a smaller hat. I suspect it will get neither.',
        '{band} are earnest young people who love trucks. I was once an earnest young person who loved trucks. It passes. The trucks remain.'],
      good: ['{single} reminds me of the first country record I ever heard, in a Quonset, in 1971. This one was recorded near one. Full circle.',
        'The guitarist on {album} is apparently seventy and claims to have played on everything. Having heard this, I believe him.'],
      great: ['I have heard ten thousand records. {album} is the first to make me want to buy a 1987 half-ton. I bought one. It stalled. Classic.',
        '{album} is the sound of a grid road at sunset with the windows down. Put it on. Drive twenty under. You will understand.']
    },
    proclaim: {
      awful: ['{album} is the sound of a grain truck idling in a steel shed! We love the ambition! We could not finish it!',
        'The Grid Road Ramblers sing about trucks for forty minutes! Saskatchewan deserves at least one song about a car!'],
      meh: ['{single} is a seed cap of a song: comfortable, a bit faded, one size fits all! Solid prairie twang!',
        'Twangy! Earnest! A very large hat! {album} is exactly as advertised, and the advertisement was a feed-store bulletin board!'],
      good: ['{album} is the sound of a Swift Current harvest: dust, sunsets, a fiddle on a tailgate! Canadian country is BACK!',
        '{single} will be sung at every harvest dance from Maple Creek to Moose Jaw! The Grid Road Ramblers are a prairie treasure!'],
      great: ['{album} is the most Canadian country record ever made! A truck! A Quonset! A fiddle! A HAT! A national anthem for grid roads!',
        'Travis Lee sings like the wind across a stubble field and {band} swing like a gate in a chinook! Essential! Perfect!']
    },
    pitchspork: {
      awful: ['Like a truck commercial scored by a regional arts council. {album} mistakes nostalgia for a personality and a hat for a thesis.',
        'The bassist reportedly knows three notes. On {album}, you believe him. You also wish someone had bought him a fourth.'],
      meh: ['{album} has the sincerity of a church supper and the shelf life of a seed catalogue. Still: {single} is a quietly devastating waltz.',
        'Somewhere between classic country and a heritage-minute voiceover. The fiddle is the most interesting thing here. By a prairie mile.'],
      good: ['A record of radical earnestness: one truck, one Quonset, no irony. {single} is a grid road you can two-step down.',
        'Recorded partly in a studio and partly in a Quonset, {album} sounds like both, in the best way. The horse is audible.'],
      great: ['{album} is the rare country record that understands the prairie as a feeling. A truck has never meant this much.',
        'The fiddler hides four bars of Bach in the breakdown of {single}. It is the most punk thing on any record this year. A landmark.']
    },
    deci_hell: {
      awful: ['NOT METAL. A FIDDLE. A HAT. THE SINGER CRIES ABOUT A TRUCK. THE DRUMMER SITS ON HAY. THE DRUMMER IS THE ONLY SURVIVOR.',
        '{album}: TOO NICE TO HATE PROPERLY. LISTENED ELEVEN TIMES TO BE SURE. STILL NICE. DISGUSTING.'],
      meh: ['COUNTRY. SLOW. SINCERE. THE GUITARIST IS SEVENTY AND SHREDS, WHICH IS METAL. THE REST IS NOT.',
        '{single} HAS A TRAIN BEAT. ALMOST A BLAST BEAT. ALMOST. THE DRUMMER IS TRYING. RESPECT THE DRUMMER.'],
      good: ['THE DRUMMER ON {album} PLAYS LIKE HAIL ON A QUONSET ROOF. WE ARE NOT COUNTRY. WE ARE LISTENING.',
        '{band} ARE NOT METAL BUT THE FIDDLE PLAYER IS TERRIFYING. SHE HID BACH IN A HOEDOWN. RESPECT.'],
      great: ['{album} MADE US CRY ABOUT A TRUCK. NO RECORD HAS DONE THIS. EVERY SKULL WE HAVE. FOR THE TRUCK.',
        'WE HATE COUNTRY. WE LOVE {album}. THIS IS A CRISIS. THE HAT GUY SHOULD START A DOOM BAND. WE WOULD REVIEW IT.']
    },
    tailgate_weekly: {
      awful: ['We at Tailgate Weekly respect a truck song. {album} has nine. The trucks deserved better. So did we.',
        'Young people from a Quonset singing about farms. Nice hat. Politely returned to the feed store.'],
      meh: ['{single} would be a fine two-step if it were a third less earnest. We tried. Our boots gave out. Middling.',
        'The Grid Road Ramblers are sincere. They are also very sincere. Graded as a yearling: promising, needs a season on grass.'],
      good: ['The singer loves his truck, and so do we. {album} is honest, like a good auctioneer. The fiddle made a farmer cry.',
        'Played {single} at the auction mart. Bids went up four dollars a head. That is respect. Blue ribbon, gladly.'],
      great: ['Grand champion. {band} play like our grandfathers played the Legion: all night, hat on, no apologies.',
        'We did not expect to be moved by a truck song written by a condo kid. {album} moved us. It moved Brayden, reportedly.']
    }
  };
  for (var oid in REV) if (OUTL[oid]) { var bb = obj(OUTL[oid], 'byBand'); if (!bb[B]) bb[B] = REV[oid]; }

  /* ======================================================================================================================
     Lines, member-keyed (ids are unique across bands): chat, gigReactions, tap, songReactions, writeTips, vanBanter,
     banter, live, labelReact, reviewReact. Every line <= 140 characters; Clementine is dry, Earl is 1979, Duke says little.
     ====================================================================================================================== */
  var LN = obj(K, 'lines');
  members(obj(LN, 'chat'), {
    travis: {
      happy: ['Great practice! I cried twice. Good crying.', 'Drove Loretta to rehearsal without stalling. Life is a country song.',
        'I love this band more than I love my truck. And I LOVE my truck.', 'We sounded like a sunset on a grid road. Best compliment I have.'],
      ok: ['Practice Thursday. I will bring the good coffee. From the Co-op.', 'Does anyone know how to change a tractor tire? Asking for a song.',
        'Writing a new one. It is about a truck. Do not say anything.', 'Vern says we are too loud. Vern is also a reeve. Noted.'],
      grumpy: ['Somebody moved my capo into Doris. Again.', "Buckle & Boot are on the radio again. Tailgates. I can't.",
        'Loretta will not start. Neither will I.', 'I am writing a sad song. It is about this group chat.'],
      sulking: ['Sitting in the truck. Do not knock.', "Not coming. I'm writing. Alone. In the truck.",
        'Fine. I will sing the tailgate song. For money. Like a jingle writer.', 'I have stopped twanging. Temporarily.']
    },
    earl: {
      happy: ['Lovely practice, kids. Reminded me of 1979. The good part of 1979.', "Found a new marker on the way home. I'll tell you Tuesday.",
        'That solo tonight was the best I have played since the original.', 'Good band. Good hat. Good night.'],
      ok: ['Leaving for the gig at noon. The gig is at eight. It is ninety kilometres.', 'Atlas is on page 42. We live on page 42.',
        'New strings. Same guitar since 1974. It likes the new strings.', 'Rehearsal Tuesday. I will bring the thermos and a story.'],
      grumpy: ['Somebody was doing a hundred and ten in my Suburban. I can tell by the seat.', 'The solo got cut to eight bars. Eight.',
        'Nobody listened to the marker story. There were eleven markers.', 'In 1979 people tuned.'],
      sulking: ["I'll be in the Suburban. Page 42.", 'Not coming. Writing it all down. For my daughter.',
        "Fine. I'll tell the story to the steering wheel.", '(Earl has turned off his hearing aid.)']
    },
    clementine: {
      happy: ['Good rehearsal. Everyone was in tune. I have nothing to add.', 'The crowd was acceptable. I did not smile. Much.',
        'I played Bach in the warm-up and nobody noticed. Perfect night.', 'Fine. I enjoyed it. Do not tell anyone.'],
      ok: ['Practice at seven. Tune before you arrive. I mean it.', 'Maman called. I said I was at the symphony. I was in a Quonset.',
        'New strings. The horse ate the old packet.', 'Rehearsal Thursday. I will bring a tuner. For everyone.'],
      grumpy: ['Somebody put hay in my case. It is in the F-holes.', 'Nobody tuned. I tuned for everybody. Silently.',
        'Another yeehaw photo. It was the light.', 'The Quonset is minus twelve. The fiddle has opinions.'],
      sulking: ['No comment.', "I'm practising scales in the car. It is in tune.", 'Fine. I will play the hoedown. Badly. On purpose.', '(Clementine has left the chat. She will be back. She will not admit it.)']
    },
    duke: {
      happy: ['Good one. Hat stayed on.', 'Nice show. Someone asked to touch the hat. I allowed it.',
        "Great practice. Great lunch. In that order. No, other order.", 'Good week. The hat is happy.'],
      ok: ["Practice after lunch? I'm bringing lunch.", 'Vern needs a hand Saturday. Rocks.', "Don't sit on the hat.", 'New string. Just the one. The one I use.'],
      grumpy: ['Somebody put the hat on the heater. Too long.', 'Someone called it a cap. Still thinking about it.',
        'Rehearsal ran through lunch.', 'Doris ate my sandwich.'],
      sulking: ['Hat is on the amp. Facing the wall.', 'Not coming. Helping Vern.', "Fine. I'll play the fourth note.", '(Duke has turned his hat around. Backwards. It is serious.)']
    }
  });
  members(obj(LN, 'gigReactions'), {
    travis: { great: ['That was the best night of my life. Again!', 'They sang the truck song back to me. All of it. The bridge too.', 'I did not stall once. Tonight I am a real cowboy.'],
      ok: ['Decent. Like a half-ton with a good heater.', 'Solid show. Nobody threw anything. That is a win in Herbert.', 'Fine. I cried only once.'],
      bad: ['That gig was a truck that will not start.', 'Worst crowd since the condo board meeting.', 'I am going to go sit in Loretta.'] },
    earl: { great: ['Best gig since 1979. And 1979 was very good.', 'Now THAT is how you close a hall.', 'I played on the original. Tonight I played on the sequel.'],
      ok: ['Fine show. The PA was from 1983. Good year for PAs.', 'Decent. I have played worse. In Estevan. Twice.', 'Middle of the road. Twenty under the limit.'],
      bad: ['Rough. Reminds me of a gig in 1977. We do not talk about 1977.', 'The sound guy was younger than my guitar strings.', 'Bad night. The drive home will be long. It is always long.'] },
    clementine: { great: ['Acceptable.', '(Clementine smiles for exactly one second, then stops.)', 'I yeehawed. It was the light.'],
      ok: ['Fine. My tuning held. Nobody else\'s did.', 'Adequate. The waltz was nice. The rest was a hoedown.', 'A reasonable performance.'],
      bad: ['I have played better in a symphony. On a bad night.', 'Out of tune. All of us. Mostly you.', 'I am going to practise in the car.'] },
    duke: { great: ['(Duke tips the hat. That is the whole review.)', 'Good one. Hat stayed on.', "That's a keeper."],
      ok: ['Fine.', 'Okay show. Okay chili.', '(Duke nods. The hat nods.)'],
      bad: ['Rough.', "Hat almost blew off. Hat's fine.", '(Duke adjusts the hat very slowly.)'] }
  });
  members(obj(LN, 'tap'), {
    travis: ['I bought a truck! A 1987! Want to see her? She is right outside. She is called Loretta.', 'Did you know I grew up on the ninth floor? I think about fields a lot.',
      'Earl taught me stick. I only stall on hills now. And flat ground.', "This song's about a truck. Well. They all are.",
      'I want to buy a farm someday. With a windbreak.', 'Every time I sing I think about a grain elevator.'],
    earl: ['I played on the original, you know.', 'In 1979 there was a session in Lethbridge. Pull up a bale.', 'Twenty under the limit is the safe limit.',
      'Page 42. Always page 42.', 'There is a historical marker nine kilometres from here. Want to hear about it?', 'This guitar is from 1974. It has been everywhere. So have I.'],
    clementine: ['A fiddle is a violin. The difference is attitude.', 'I am not enjoying this.', "Don't touch the case. The Bach is for emergencies.",
      'I am classically trained. This is slumming it. (She is smiling.)', 'Tune before you speak to me.', 'Maman thinks I am in the symphony.'],
    duke: ["Don't touch the hat.", "It's my grandfather's.", 'Three notes. The right three.', 'Want half a sandwich? Half.', 'My uncle owns this Quonset. And that horse.', '(Duke tips the hat. You feel blessed.)']
  });
  members(obj(LN, 'songReactions'), {
    travis: {
      name: ["It's about a truck. Obviously. It's called", 'I wrote this one in Loretta. It is called', 'This one is for coffee row. It is called',
        'I cried writing this. Twice. It is called', 'Earl says he played on the original. It is called', 'Every good country song needs a name. This one is'],
      custom: [{ when: 'any', text: 'Every word of that is true. Except the farm. And the truck. Well, the truck is true now.' },
        { when: 'difficultyHigh', text: 'Hard song. Good. Country is supposed to hurt.' }]
    },
    earl: {
      noSolo: ["No solo? In 1979 every song had thirty-two bars for the guitar. I'll wait.", "Fine. I'll put the solo in the story instead.",
        'No solo section. I will play one anyway. Quietly. Under Travis.'],
      solo: ['A solo section. Thirty-two bars. I will keep the story under sixteen.', 'Room for a solo. I played on the original of this.'],
      custom: [{ when: 'similarityHigh', text: 'I played on the original of this one. Literally. It sounds like a session in 1979.' },
        { when: 'any', text: 'I played on the original. Well. I will have, once we record it.' },
        { when: 'difficultyHigh', text: 'Busy kit. In 1979 the drummer played less and we sold more records.', seat: ['drums', 'bass', 'rhythm'] }]
    },
    clementine: {
      fills: ['(Clementine plays a fill. Four notes. One is Bach.)', 'I put a fiddle run in bar 12. Do not make it weird.', 'A small fill after the chorus. Tasteful. Unlike the rest.'],
      great: ['(Clementine nods once. From her, that is a standing ovation.)', 'That is acceptable. More than acceptable. Do not quote me.',
        '(Clementine plays it back twice. Silently. That is love.)'],
      custom: [{ when: 'difficultyHigh', text: 'Finally a challenge. I will play it in thirds. You will not notice.' },
        { when: 'any', text: 'It is a hoedown. I will play it like Paganini. That is my compromise.' }]
    },
    duke: {
      custom: [{ when: 'any', text: 'Three notes fit. They always fit.', seat: ['drums', 'rhythm', 'lead'] },
        { when: 'similarityHigh', text: 'Sounds like the last one. Same three notes. Efficient.', seat: ['drums', 'rhythm', 'lead'] },
        { when: 'difficultyHigh', text: 'Hard one. Might need the fourth note.', seat: ['drums', 'rhythm', 'lead'] }]
    }
  });
  members(obj(LN, 'writeTips'), {
    travis: ['Country loves a train beat: snare on every eighth, brushed if you can. It sounds like a truck on a grid road.',
      'Tap a square to add a hit. Leave room in the chorus so I can cry over it.'],
    earl: ['Boom-chick. Kick on one and three, snare on two and four. That is the two-step. It has worked since 1947.',
      'Stay between 90 and 130 BPM. Faster than that is a rodeo, and nobody dances at a rodeo.'],
    clementine: ['Keep the hats light. The fiddle lives in the high end. Do not crowd it.', 'Try a waltz: three beats, not four. It is not difficult. It only feels difficult.'],
    duke: ["Kick on the one. I'll be there. Probably.", 'Try the shuffle preset. It sounds like a horse walking. Doris approves.']
  });
  members(obj(LN, 'vanBanter'), {
    travis: ['That truck we just passed was a 1979. I can tell by the grille.', 'Can we stop at that lot? Just to look.',
      "When I have a farm, the grid road will have a mailbox with our name on it.", "Earl, what's that marker about? No, I want to hear it.",
      'I wrote a verse about that grain elevator. Then it was gone. The verse stays.', 'Turn up the radio. Not Buckle & Boot. Anything else.'],
    earl: ['Marker coming up. Two kilometres. I will slow down.', 'In 1979 this highway was two lanes and a prayer.',
      'We are doing eighty. That is plenty.', "That's page 43. We're off the page. Hang on.",
      'I drove a bus through this town for Slim Tumbleweed. It has not changed. Neither have I.', 'Coffee in the thermos. Pass it up. Carefully.'],
    clementine: ['Feet off the fiddle case.', 'We are doing eighty. The speed limit is a hundred and ten. I have done the math.',
      'That sign says "Welcome". In one language. I have notes.', "Nobody hum. The fiddle is sleeping.",
      'I am not looking at the canola. (She is looking at the canola.)', 'Rest stop in forty. The ditch is not a rest stop.'],
    duke: ['Mind the hat.', '(Duke adjusts the hat against the roof. It does not fit. It never fits.)', 'Jerky?',
      'That field is Vern\'s cousin\'s.', 'Hat hole is leaking again.', '(Duke falls asleep under the hat. The hat stays awake.)']
  });
  members(obj(LN, 'banter'), {
    travis: ['This one is about a truck. Surprise!', 'Thank you! I grew up in a condo! This is the best night of my life!', 'Hands up if you drive stick. Now teach me.'],
    earl: ['I played on the original of this one. In 1979. Ask me after.', 'This next song is older than your parents. So is the guitar.', 'Drive home safe. Twenty under.'],
    clementine: ['(Clementine tunes. The crowd waits. It is worth it.)', 'This one has a fiddle break. Try to keep up.', 'Merci. Thank you. Yeehaw. (She did not mean to say that.)'],
    duke: ['(Duke tips the hat. The crowd loses its mind.)', 'Buy a shirt. It has the hat on it.', 'Thanks, everybody.']
  });
  members(obj(LN, 'live'), {
    travis: {
      solo: ['Travis Lee takes a strum solo: eight bars of G, strummed like he means it. Nobody complains.', 'Travis Lee solos on his acoustic, eyes shut, thinking about the truck.',
        'Travis Lee hits a big open chord and holds it for eight bars. The room holds its breath.'],
      fill: ['Travis Lee fills the gap with a "yeah!" It counts.', 'Travis Lee slaps the acoustic on the fill. Right on time.', 'Travis Lee drops a little G run into the gap. It lands.'],
      signature: ['Travis Lee kneels at the lip of the stage and sings the chorus to the front row, crying.', 'Travis Lee holds the mic out and the whole room sings the truck song.',
        'Travis Lee jumps off the drum riser in his boots. He lands it. Mostly.'],
      flub: ['Travis Lee sings "tailgate" by accident. He stops. He shudders. He keeps going.', 'Travis Lee forgets the verse and sings the truck\'s model number instead.',
        'Travis Lee comes in a bar early and commits to it.']
    },
    earl: {
      solo: ['Earl takes the solo: thirty-two bars of pure twang, not a note wasted. The room goes silent.', 'Earl solos without looking down. He has played this since 1979.',
        'Earl bends one note so long the bar staff stop to listen.'],
      fill: ['Earl drops a chicken-pickin\' lick into the gap. Of course he does.', 'Earl answers your fill with a twangy double-stop. Perfect.',
        'Earl slides a little run into the fill and tips his head at you.'],
      signature: ['Earl steps forward for his solo and tells a four-second story in the middle of it. It works.', 'Earl plays the solo from the original. Note for note. The old-timers gasp.',
        'Earl nods at you mid-song. Seventy years of nod. It lands like a drop.'],
      flub: ['Earl plays the solo from a different song. It fits anyway.', 'Earl misses a cue. He calls it "1979 timing".', "Earl's hearing aid picks up the radio. He solos to the grain prices."]
    },
    clementine: {
      solo: ['Clementine takes the solo: a reel so fast a boot flies off in the second row.', 'Clementine solos with her eyes closed. There are four bars of Bach in it. Only you notice.',
        'Clementine plays the solo bored, flawless, and yeehaws at the end by accident.'],
      fill: ['Clementine answers the fill with a fiddle run. Tasteful. Devastating.', 'Clementine slides a double-stop into the gap and looks away like nothing happened.',
        'Clementine fills the silence with one long bowed note. The room sighs.'],
      signature: ['Clementine yeehaws on the break. The crowd screams it back. She pretends it was someone else.', 'Clementine plays the waltz alone, spotlit. A couple in the back starts dancing.',
        'Clementine duels Earl for eight bars. She wins. She always wins.'],
      flub: ['Clementine hits a wrong note and plays it again, on purpose, and now it is right.', 'Clementine\'s bow catches a hay stem. She plays through it. Dignified.',
        'Clementine breaks a string and finishes on three. Paganini would be proud.']
    },
    duke: {
      solo: ['Duke takes a bass solo. It is three notes, slowly. It is the heaviest thing all night.', 'Duke solos from under the hat. Nobody can see his hands. It is magic.',
        'Duke plays one low note and holds it. The whole room feels it in their boots.'],
      fill: ['Duke rolls a little walk-up into the fill. Three notes. The right three.', 'Duke thumps the low string on the fill. The floor answers.',
        'Duke answers your fill with a nod and one perfect note.'],
      signature: ['Duke tips the hat on the last chorus. Two hundred people tip theirs back.', 'Duke tips the hat at the front row. Someone faints.',
        'Duke takes off the hat, holds it high and puts it back on. The room roars.'],
      flub: ['Duke hits a fourth note by accident. He looks at it. He keeps it.', 'Duke\'s hat slips over his eyes. He plays the rest by feel.',
        'Duke misses the change. He plays the same note. It works. It always works.']
    }
  });
  members(obj(LN, 'labelReact'), {
    travis: { monolith: ["A glass tower in Toronto. I will wear my good boots. The ones without hay."], gopherwood: ["A feed store with a label in it. That is the most country thing I have ever heard."],
      diy: ["We ARE the label. I'll ship from the truck."], signed: ["Signed! I'm calling my mom. And the Co-op."] },
    earl: { monolith: ['I played for Monolith in 1979. They had notes then too.'], gopherwood: ["Wendell has good hands. I can tell from the contract. Carpenter pencil."],
      diy: ['Self-released. Like 1974. We sold forty. Out of a trunk.'], signed: ['Signed. Took fifty years. Worth it.'] },
    clementine: { monolith: ['A major label. Maman will finally be quiet. For a week.'], gopherwood: ['Small. Honest. Acceptable.'],
      diy: ['We do the accounting? I will do the accounting.'], signed: ['Signed. I am not excited. (She is excited.)'] },
    duke: { monolith: ['(Duke asks if the advance covers a hat. It covers eleven hats.)'], gopherwood: ['The label van has a gopher on it. Hat approves.'],
      diy: ['We ship from the Quonset. I know where everything is.'], signed: ['Signed. Lunch?'] }
  });
  members(obj(LN, 'reviewReact'), {
    travis: { great: ['They said "authentic". About me. From the condo. I am crying.'], meh: ['Mixed. Like a truck with a good engine and a bad heater.'],
      awful: ['They hated it. I am going to go sit in Loretta.'] },
    earl: { great: ['Good review. I have seen better. In 1979. For this band, though? Very good.'], meh: ["Mixed. They didn't understand the story. Nobody does. Yet."],
      awful: ["Bad review. The critic was born in 1998. I played on his parents' wedding album."] },
    clementine: { great: ["They noticed the Bach. I am mortified. I am delighted."], meh: ['Mixed reviews. The fiddle was praised. The rest was reviewed.'],
      awful: ['I will write to the editor. In French. At length.'] },
    duke: { great: ['(Duke tapes the review inside the hat.)'], meh: ['Fine. They liked the hat.'], awful: ['(Duke uses the review to level the amp.)'] }
  });

  /* ======================================================================================================================
     Band-level lines (lines.byBand.grid_road_ramblers: career.pool adds them to the neutral flat pools).
     ====================================================================================================================== */
  merge(band(LN), {
    activity: {
      rehearse: ['We ran the set in the Quonset with the door open. A combine stopped on the grid road to listen.',
        'Doris the horse came in during the waltz and stayed for the whole set. Our toughest critic.',
        'Earl stopped the song to tell a story. We kept playing. It became a new arrangement.',
        'Clementine made everyone tune for twenty minutes. Then we played the best set of our lives.',
        'Duke played his three notes perfectly. Then a fourth. Everyone cheered the fourth.',
        'We tightened the ending. It had four endings and a story. Now it has one ending and a story.'],
      write: ['Travis Lee brought in a new song. It is about a truck. It is his best one yet. They are all his best one.',
        'Earl wrote a riff. He says it is from 1979. It is new. It sounds like 1979. Everybody wins.',
        'We wrote a song about Vern\'s canola. It is a waltz. The canola deserved a waltz.',
        'Duke wrote one bass line and said "done". It was done.',
        'We built a song around your train beat. Travis found a truck that fits the rhythm.',
        'Clementine wrote a fiddle part with four bars of Bach hidden in it. Nobody will ever know.'],
      promote: ['We pinned flyers to every bulletin board from Swift Current to Maple Creek. Duke\'s hat is on all of them.',
        'Travis Lee did the morning show on Speedy Creek 97. He talked about his truck for eleven minutes.',
        'We left flyers at coffee row. Wilf read one aloud to the table. The table approved.',
        'Earl handed out flyers at every historical marker between here and Herbert. Nobody was at the markers.',
        'We put a sign on Loretta\'s tailgate and parked her at the Co-op. Free promo, one parking ticket.',
        'Duke wore the hat to the auction mart. Lloyd announced the gig between lots.'],
      book: ['Earl drove to every hall in the southwest at twenty under the limit. It took all week. Two said yes. One gave him pie.', 'We called every hall in {city} from Vern\'s kitchen phone. Vern took messages. He underlined "NO" twice.',
        'We pinned our number to the Co-op corkboard, under a litter of heeler pups. The pups got more calls.',
        'Earl called a booker he knew in 1979. The booker is retired. His daughter books now. She said yes.',
        'We emailed every Legion within two hundred kilometres. One replied "who is this". One replied "yes".',
        'Wilf asked coffee row. One of them books the rink. We are in.'],
      hustle: ['We picked rocks for Vern all day. Forty dollars and a pie. Duke picked the big ones.',
        'We hauled bales for a neighbour. Travis Lee drove the truck. He stalled once. Progress.',
        'We busked outside the Co-op and made gas money plus a dozen eggs from a lady from Pennant.',
        'We helped Lloyd set up the auction ring. He paid us in cash and a box of mystery wrenches.',
        'We cleaned a grain bin. Nobody wants to talk about it. Forty dollars each.',
        'Earl fixed three tractors in Vern\'s yard for cash. The band sat on the fence and cheered.'],
      rest: ['Nobody touched an instrument. We sat on the tailgate and watched the sun go down over the canola.',
        'We watched curling at the Legion. Earl said he curled in 1966. He explained every end.',
        'A lazy day. Earl read the atlas aloud. We fell asleep to it. Best sleep in weeks.',
        'Wilf\'s wife Irene sent over a pie. We ate it on hay bales. Perfect.',
        'We drove out to the Cypress Hills and watched the stars. Nobody said "truck" for an hour.',
        'Duke slept in the Quonset loft under the hat. The wind whistled in A all night.']
    },
    quietWeek: [
      'A quiet Monday. Earl is at a historical marker. Nobody knows which one. Neither does Earl.',
      'Nothing happened. Doris the horse did not come into the Quonset once. Suspicious.',
      'A slow week. Travis Lee washed his truck. Twice. It rained. He washed it again.',
      'Duke spent the week practising his three notes. They sound exactly the same. He is satisfied.',
      'The wind blew all week. The Quonset whistled in A. The band rested. Coffee row met every morning. Life goes on.',
      'Quiet week. Clementine practised Bach at five every morning. Vern\'s rooster learned it.',
      'Nothing on the calendar. Earl drove to Maple Creek and back at twenty under. It took the whole week.',
      'A quiet Monday on the prairie. The wind blew. Nothing else did.',
      'A slow week. Vern moved the cows. Biscuit supervised. Nobody else was needed.',
      "Quiet. Travis Lee wrote a song about a truck. He won't say which truck."
    ],
    yearEnd: [
      "Another year in the Quonset. Vern raises his coffee. It is always coffee.",
      'Earl toasts the year with a story about 1979. It is a good year to end on. It always is.',
      "Duke says it was a good year. The hat agrees. He didn't say how he knows.",
      'Clementine says it was "an acceptable year". Then she plays the waltz. She is smiling.',
      'Wilf brings a cake shaped like a grain elevator. Coffee row sings. Loudly. Badly.',
      'Mom calls to say happy new year and mention the loan, in that order.'
    ],
    milestones: {
      firstGig: ["First gig! Vern's yard party. Twenty trucks, a bonfire and Biscuit. The Quonset door was the stage."],
      firstSong: ['First original song. It is about a truck. Nobody is surprised.'],
      fans50: ['50 fans. More than coffee row, the Legion and the auction mart put together.'],
      fans100: ['100 fans. Someone you have never met wore your shirt to the Co-op.'],
      fans250: ['250 fans. {homeVenue} knows your name. Vern pretends not to.'],
      fans500: ['500 fans. People sing along. Mostly about the truck. Travis cries every time.'],
      fans1000: ['1,000 fans. The hat has its own fan club. The band is catching up.'],
      fund1000: ['First $1,000 in the band fund. Earl has already earmarked it for the Suburban\'s transmission.']
    },
    genreClash: [
      'Wrong crowd: a metal room. Clementine played a reel at 200 BPM. A man in corpse paint two-stepped.',
      'The punks found the waltz "too slow". The pit happened anyway. It was a polka.',
      'A rock bar. Somebody requested a guitar solo. Earl played thirty-two bars. They stopped requesting.',
      'The crowd wanted a mosh. You gave them a line dance. Close enough, apparently.'
    ],
    countIn: ["Earl counts you in: 'One, two, in 1979 we... three, four!'",
      "Travis Lee counts you in with a 'yee-one, two, three, four!' It's a whole new thing."],
    // UI bits (53 / 54 / 56 / 58 ports): countIn [text], empty { chat, catalog } text, noSolo [text], exposure { pitch, toast }, recruitAd [text]
    empty: { chat: 'No messages yet. Earl has read everything. Twice. Aloud.', catalog: 'No songs yet. Travis Lee is "writing about a truck".' },
    exposure: { pitch: 'Earl: "In 1979 we played for exposure. It is how I met everybody. Say yes."', toast: 'Exposure! Travis Lee is already telling his mom.' },
    noSolo: ['Earl will mention it. Gently. With a story about 1979.'],
    recruitAd: ['Rehearsals in a Quonset outside Swift Current (a horse may attend). Must respect the hat.'],
    guilt: ['Your mom asks if the Quonset "has heat yet". Then asks about the loan.',
      'Dad has started a folder labelled BAND. It is next to the folder labelled SUBURBAN GAS.',
      'Mom sent an itemized note to the Quonset. It says "the loan" at the bottom. Vern read it first.'],
    vanArrive: ['You made it. {driver} parks. Everybody unfolds. Duke checks the hat for dents.',
      '{van} rolls in at twenty under and exactly on time. Earl says "told you".',
      "Here. {driver} backs into the loading zone in one try. Travis Lee claps. Earl nods. Clementine is already unloading."],
    vanTired: ['{van} is tired. Earl says it is "thinking". It is making a noise like a baler with a stone in it.'],
    breakdown: ['{van} broke down. Earl fixed it with baler twine and a story. Forty minutes, zero dollars.'],
    sameCrowd: ['Same faces as last time. Wilf, front row, seed cap. Fewer new ones.'],
    openingSlot: ['Opening slot. Travis Lee thanked the headliner and then told the crowd about his truck.'],
    gigGrade: {
      S: ['The crowd two-stepped until the floor bounced. Earl said it was better than 1979. Legendary.', 'A fiddle, a hat and a truck song. Perfect night.'],
      A: ['Tight, warm, twangy. Nobody stalled, not even Travis.'],
      B: ['A good, sweaty, hat-tipping night.'],
      C: ['The crowd was there. Politely. Earl told them a story anyway.'],
      D: ['The bingo caller was louder than you. And better at two-step.']
    },
    moments: {
      clapAlong: ['The whole room claps on two and four. Earl nods like a man who has waited fifty years for this.',
        'Two hundred people clapping in time. Clementine is visibly moved. She denies it.'],
      yeehaw: ['The chorus lands and the whole room yells YEEHAW. Clementine yells it too. On the record.', 'A yeehaw goes up so loud Duke\'s hat lifts an inch.'],
      lineDance: ['A line dance breaks out: forty people, perfect rows, one very large hat at the front.',
        'The floor turns into a line dance. Earl calls the steps. Nobody asked him. Everyone follows.'],
      hatTip: ['Duke tips the hat and every hat in the room tips back.']
    },
    banter: ['This one is about a truck. They all are. Thank you for understanding.', 'Thank you {city}! We are {band}! Buy a shirt! It has the hat on it!',
      'If you drove here stick, you are our people.']
  });

  /* ======================================================================================================================
     Drivers (26_sim_world): Earl's own lines while he drives, and the take-over line for when he is gone (the same §4.1
     byBand layer on drivers.you: career.pool(state, drivers.you, 'takeOver')).
     ====================================================================================================================== */
  var DRV = obj(K, 'drivers');
  if (DRV.earl) {
    DRV.earl.banter = addNew(Array.isArray(DRV.earl.banter) ? DRV.earl.banter : [], [
      'Marker in two kilometres. Everybody wake up.', 'Eighty is plenty. The limit is a suggestion. A generous one.',
      'Page 42. Hang on. Page 43.', 'In 1979 I drove this road with a yodeller asleep on the amp.',
      'That field used to be a town. I will tell you about it.'
    ]);
  }
  if (DRV.you) band(DRV.you).takeOver = "You drive now. Earl's atlas is still on the dash, open to page 42. His thermos is in the cup holder. It is still warm.";
})(window.GG);
