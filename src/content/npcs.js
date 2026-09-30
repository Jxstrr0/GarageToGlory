// content/npcs.js: the supporting cast. Card `speaker` and chat `who` may be any id here (or a member id).
// Shape: GG.content.npcs = { <npcId>: { id, name, blurb } }. Pure data, no logic.
// Rival band members are an OPEN owner decision: refer to them by role only ("Tundra Wraith's frontman").
(function (GG) {
  var list = [
    { id: 'mom', name: 'Mom',
      blurb: 'Keeps the garage fridge full and a night-school pamphlet in every drawer. Your biggest fan, technically.' },
    { id: 'dad', name: 'Dad',
      blurb: 'Bought a new truck with the hail insurance money. Guards it like a dragon guards gold. Has opinions about the lawnmower.' },
    { id: 'baba', name: 'Baba Kowalchuk',
      blurb: "Jaxon's grandmother. Packs his lunches, sets his curfew, rates every song out of ten. Mostly fours. The drummer gets a nine." },
    { id: 'neighbour', name: 'Mr. Lindqvist',
      blurb: 'Next door. Works early shifts at the potash mine. Complains about the noise, then stays for the chorus.' },
    { id: 'dj', name: 'Deb Wiebe',
      blurb: "Soft-spoken librarian who hosts 'Midnight Mayhem' on CRUD 90.5 campus radio. Says 'brutal' like she's reading a bedtime story." },
    { id: 'wraith_frontman', name: "Tundra Wraith's frontman",
      blurb: "Corpse paint on stage, cardigan off it. A chartered accountant from Winnipeg who calls everyone 'buddy' and weaponizes fruit baskets." },
    { id: 'doreen', name: 'Doreen',
      blurb: "Runs the Legion Hall, Branch 63. Retired skip. House rules: one polka per set, and no 'throat thing' during the meat draw." },
    { id: 'reporter', name: 'Brent from the Star-Pheasant',
      blurb: "Covers city council, record zucchinis and now you, for Saskatoon's paper of record, the Star-Pheasant." },
    { id: 'gord', name: 'Gord',
      blurb: "Hail Damage's first superfan. Translates every lyric on the band's fan page. They're all about the lawn." },
    { id: 'zine', name: 'Deci-Hell',
      blurb: 'A metal zine photocopied at the downtown library. Rates shows in skulls. Nobody knows who writes it. Kenji might.' },
    { id: 'lorraine', name: 'Lorraine',
      blurb: 'Calls the numbers at the Bingo Palace. Voice like a gravel road at dawn. Has never once smiled at B-4.' },
    { id: 'barb', name: 'Barb',
      blurb: 'Runs the lounge at the Warman Curling Rink. Everyone there is named Barb or Dale. She has been both.' },
    { id: 'dale', name: 'Cousin Dale',
      blurb: 'Your cousin. Moves apartments every six months. Always owns a piano. Pays in cash and pizza.' },
    // v0.6.1 (FANS agent): recurring named superfans (content/bandbook.js superfans)
    { id: 'dale_warman', name: 'Dale from Warman',
      blurb: 'Your first superfan. At every show, front row, lawn chair. No relation to Cousin Dale; he wants that on the record.' },
    { id: 'wendell', name: 'Big Wendell',
      blurb: 'Long-haul trucker. Boosted the van at 2 a.m. in Davidson and never left. Follows the band on the CB.' },
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
