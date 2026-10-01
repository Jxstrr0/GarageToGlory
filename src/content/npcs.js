// content/npcs.js: the supporting cast. Card `speaker` and chat `who` may be any id here (or a member id).
// Shape: GG.content.npcs = { <npcId>: { id, name, blurb, band?: [bandId], rival?: rivalId, frontman?: true } }. Pure data.
// v0.9 "Genres": band: [..] scopes a local character to that band's career (career.speakerOk: Baba never posts in Frost
//   Heave's chat); rival: <rivalId> scopes a rival's person (frontman: true = who posts for that rival, GG.rival.frontSpeaker).
//   Unscoped npcs (mom, dad, the radio DJ, the reporter, the world promoters) belong to every band. Mom and Dad stay the
//   player's parents in every city. Each home city has its own local cast (Saskatoon, Regina, Edmonton, Swift Current).
(function (GG) {
  var HD = ['hail_damage'], FH = ['frost_heave'], GK = ['gravel_kings'], GRR = ['grid_road_ramblers'];
  var list = [
    { id: 'mom', name: 'Mom',
      blurb: 'Keeps the band fed and a night-school pamphlet in every drawer. Your biggest fan, technically.' },
    { id: 'dad', name: 'Dad',
      blurb: 'Has opinions about the van, the volume and the band fund. Secretly has every one of your shows on his calendar.' },
    { id: 'dj', name: 'Deb Wiebe',
      blurb: "Soft-spoken librarian who hosts 'Midnight Mayhem' on CRUD 90.5 campus radio. Says 'brutal' like she's reading a bedtime story." },
    { id: 'reporter', name: 'Brent from the Star-Pheasant',
      blurb: "Covers city council, record zucchinis and now you, for the Star-Pheasant. Somehow gets sent to every awards night." },

    // ---- Saskatoon: Hail Damage's people (band-scoped) ----
    { id: 'baba', name: 'Baba Kowalchuk', band: HD,
      blurb: "Jaxon's grandmother. Packs his lunches, sets his curfew, rates every song out of ten. Mostly fours. The drummer gets a nine." },
    { id: 'neighbour', name: 'Mr. Lindqvist', band: HD,
      blurb: 'Next door. Works early shifts at the potash mine. Complains about the noise, then stays for the chorus.' },
    { id: 'wraith_frontman', name: "Tundra Wraith's frontman", rival: 'tundra_wraith', frontman: true,
      blurb: "Corpse paint on stage, cardigan off it. A chartered accountant from Winnipeg who calls everyone 'buddy' and weaponizes fruit baskets." },
    { id: 'doreen', name: 'Doreen', band: HD,
      blurb: "Runs the Legion Hall, Branch 63. Retired skip. House rules: one polka per set, and no 'throat thing' during the meat draw." },
    { id: 'gord', name: 'Gord', band: HD,
      blurb: "Hail Damage's first superfan. Translates every lyric on the band's fan page. They're all about the lawn." },
    { id: 'zine', name: 'Deci-Hell', band: HD,
      blurb: 'A metal zine photocopied at the downtown library. Rates shows in skulls. Nobody knows who writes it. Kenji might.' },
    { id: 'lorraine', name: 'Lorraine', band: HD,
      blurb: 'Calls the numbers at the Bingo Palace. Voice like a gravel road at dawn. Has never once smiled at B-4.' },
    { id: 'barb', name: 'Barb', band: HD,
      blurb: 'Runs the lounge at the Warman Curling Rink. Everyone there is named Barb or Dale. She has been both.' },
    { id: 'dale', name: 'Cousin Dale', band: HD,
      blurb: 'Your cousin. Moves apartments every six months. Always owns a piano. Pays in cash and pizza.' },
    // v0.6.1 (FANS agent): recurring named superfans (content/bandbook.js superfans)
    { id: 'dale_warman', name: 'Dale from Warman', band: HD,
      blurb: 'Your first superfan. At every show, front row, lawn chair. No relation to Cousin Dale; he wants that on the record.' },
    { id: 'wendell', name: 'Big Wendell',   // (every band's: the trucker superfan is not a home superfan)
      blurb: 'Long-haul trucker. Boosted the van at 2 a.m. in Davidson and never left. Follows the band on the CB.' },

    // ---- v0.9 Regina: Frost Heave's people ----
    { id: 'suds_owner', name: 'Mrs. Ferenc of the Suds-O-Rama', band: FH,
      blurb: 'Rents you the basement for fifty bucks and all the lint you can carry. Bangs on the ceiling with a broom when the dryers are losing.' },
    { id: 'councillor', name: 'Councillor Dwight Pankratz', band: FH,
      blurb: 'Ward 6. Chairs the parking committee. Has banned three of your posters and attended none of your shows. Rox keeps a folder on him.' },
    { id: 'city_clerk', name: "Linda from the Clerk's Office", band: FH,
      blurb: 'Takes the minutes at every council meeting. Has typed "public comment (screaming)" 212 times. Secretly a fan.' },
    { id: 'regina_reporter', name: 'Janelle from the Queen City Crier', band: FH,
      blurb: 'Covers city hall, potholes and, lately, the punk band that screams about both. Always gets the quote.' },
    { id: 'campus_dj_regina', name: 'DJ Slushbucket', band: FH,
      blurb: 'Hosts Frostbite Hour on CRUX 91.3 campus radio. Plays anything with a snare that sounds like a garbage can lid.' },

    // ---- v0.9 Edmonton: Gravel Kings' people ----
    { id: 'westgate_landlord', name: 'Mr. Gill, the Westgate landlord', band: GK,
      blurb: 'Owns the whole strip mall. Collects rent in person, on foot, in a parka. Still thinks Unit 4B is a gym.' },
    { id: 'nail_salon', name: 'Trinh from Polished Nails', band: GK,
      blurb: 'Runs the nail salon next to Unit 4B. Bangs on the wall during ballads. Does Chase\'s nails before every show.' },
    { id: 'vacuum_repair', name: "Stan from Stan's Vacuum Repair", band: GK,
      blurb: 'The other neighbour. Tests vacuums at full power during your quiet parts. Swears it is not on purpose.' },
    { id: 'lawyers', name: 'Blackwood, Keene & Associates', band: GK,
      blurb: 'The law firm that keeps calling about Lenny\'s riffs. They have a paralegal just for him. Her name is Debbie. She is tired.' },
    { id: 'edmonton_dj', name: 'Rhonda Ruel from Oil City Rock 105', band: GK,
      blurb: 'Afternoon drive on the classic-rock station. Also believes it is 1985. Chase\'s favourite person in the city.' },

    // ---- v0.9 Swift Current: the Grid Road Ramblers' people ----
    { id: 'uncle_vern', name: 'Uncle Vern Harlan', band: GRR,
      blurb: "Duke's uncle. Owns the Quonset, the quarter section around it and a heeler named Biscuit. Charges rent in field work." },
    { id: 'coffee_row', name: 'The coffee row at the Co-op', band: GRR,
      blurb: 'Six retired farmers at the Co-op café at 7 a.m. They rate every song, truck and forecast. Mostly two out of ten.' },
    { id: 'auctioneer', name: 'Lloyd from the auction mart', band: GRR,
      blurb: 'Can sell a combine in eleven seconds flat. Wants to auctioneer your merch table. You should let him.' },
    { id: 'swift_radio', name: 'Dolores from Speedy Creek Country 97', band: GRR,
      blurb: 'Morning show, farm report, obituaries and the trading post. Plays your song between the hog prices.' },
    { id: 'rodeo_chair', name: 'Marlene from the rodeo committee', band: GRR,
      blurb: 'Runs the Stampede with a clipboard and a whistle. Books the beer-gardens bands. Has opinions about your boots.' },
    // v0.9: the other rivals' frontman npcs (mr_blaze, cb_rex, bb_brayden: rival-scoped, frontman:true) live in their band packs.

    // v0.7 (WORLDSIM): the world stage cast
    { id: 'nigel', name: 'Nigel the promoter',
      blurb: 'Books every pub from London to Glasgow. Pays in drink tickets. Calls everyone "my friend" in a tone that means the opposite.' },
    { id: 'klaus', name: 'Klaus from the festival',
      blurb: 'Stage manager at Wackelstein Open Air. Clipboard, headset, knee-high boots, zero tolerance for lateness or clean shoes.' },
    { id: 'kato', name: 'Mr. Kato',
      blurb: 'Your Japanese promoter. Immaculate suit, immaculate schedule. Has never been late. Has never seen a band this late.' },
    { id: 'emiko', name: 'Emiko Tanabe',
      blurb: 'President of your Japanese fan club. Member number one. Laminates everything. Knows your birthdays better than your mom.' },
    { id: 'shazza', name: 'Shazza',
      blurb: 'Your Australian promoter. Tells tall tales about drop bears with a completely straight face. Drives a ute with a snake in the glovebox.' },
    { id: 'dmitri', name: 'Dmitri',
      blurb: 'Runs Siberian Frostfest. Apologizes for the cold. The band finds this very funny. Owns a banya and a bus with a past.' }
  ];

  var npcs = {};
  for (var i = 0; i < list.length; i++) npcs[list[i].id] = list[i];
  GG.content.npcs = npcs;
})(window.GG);
