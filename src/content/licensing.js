// content/licensing.js (v0.8.1 "Addendum 2", LICRECAP; handoff D1): parody brands that want to put your song in an ad.
// Pure data. The sim is 2c_sim_licensing.js (GG.licensing); the Monday card choices + the fury / scandal cards are in
// content/cards.js (GG.content.licenseChoices, GG.content.licenseCards). Owner money (popup 2026-09-30, "Nice bonus"):
// $1,500–$6,000 per offer (the hockey package low, the truck commercial high), 2–4 offers a career (more with fame),
// Counter = +40% with a ~30% walk-away (~15% with lots of fans or a label behind you).
// Shapes:
//   tune   : the numbers (GG.licensing.cfg() merges these over its defaults)
//   brands : [{ id, name, what (short: 'truck commercial'), blurb, fee: [lo, hi] $, genres: { metal|punk|rock|country: weight },
//             sellout 0..1 (haters + scandal odds), buzz, reach (share of fans gained, capped), speaker (member or npc id; falls
//             back to 'mom' when that member isn't in your band), takeFx? (EFFECT_KEYS, e.g. a mortified Marcel),
//             title, offer (card text), take, decline, counterWin, counterWalk, expire (chat lines; tokens below) }]
//   lines  : { later, walkChat, takeChat, declineChat } shared lines.
// Tokens (GG.licensing.fillText, plus the usual career ones): {brand} {adwhat} {adsong} {adfee} {adcounter} {adtake}
//   {adodds} {adleft}. Every brand is a parody: no real companies, no USA.
(function (GG) {
  GG.content.licensing = {
    tune: {
      minFans: 400,          // below this nobody is licensing anything, viral or not
      base: 0.012,           // weekly offer chance once eligible (plus fame below)
      fame: 0.014,           // + this x fame (0 at 1,000 fans .. 1 at 30,000)
      fameLo: 1000, fameHi: 30000,
      gap: 14,               // weeks between offers at least
      cap: [3, 4, 5],        // career cap on offers: base, fame >= 0.6, fame >= 0.9
      expires: 3,            // weeks to answer after the Monday it lands
      counter: 0.4,          // Counter asks +40%
      walk: 0.3, walkMin: 0.15, walkFansLo: 5000, walkFansHi: 30000,   // walk-away odds: 30% -> 15% with fans or a label
      labelCut: [0.15, 0.4], // a label's cut: (1 - royalty) / 2, clamped (Gopherwood 25%, Monolith 40%); counts toward recoup
      noise: 0.1,            // fee noise +-10%
      adStale: 25, adFloor: 20, adWeeks: 10,   // "in a commercial": stale bump, then kept at least this stale for a while
      streams: 0.6, streamsMin: 1500,          // album stream-rate bump (x fans) when the song is on a released record
      fansMax: 400, haters: 0.04, scandal: 0.5,   // fans cap, hater share x sellout, scandal odds x sellout
      loyalty: 0.004, daleMood: 4,             // decline: superfan share + Dale's mood
      fury: 20                                 // rival heat when a truck ad goes to the Ramblers
    },
    brands: [
      { id: 'truck', name: 'Prairie Titan Trucks', what: 'truck commercial',
        blurb: 'Half-ton pickups for people who say "half-ton" out loud. The ad is a truck jumping a coulee in slow motion.',
        fee: [3500, 6000], genres: { country: 3, rock: 3, metal: 0.6, punk: 0.3 }, sellout: 0.7, buzz: 8, reach: 0.015, speaker: 'dad',
        title: 'Built Grid Road Tough',
        offer: 'Prairie Titan Trucks wants "{adsong}" for a commercial: a pickup jumping a coulee in slow motion while a farmer nods. ' +
          'They offer {adfee}. Dad has already asked if the band gets a discount.',
        take: 'The ad airs during the hockey game. The truck jumps the coulee to your chorus forty times a weekend. Dad watches every one.',
        decline: 'You pass. Prairie Titan uses a banjo instead. Dad takes it personally and parks his truck facing the garage, sulking.',
        counterWin: '"Fine," says the marketing guy, chewing a toothpick. "Your chorus better be as loud as that engine." It is.',
        counterWalk: 'Prairie Titan goes with a jingle a guy in Estevan made on his phone. Dad does not bring it up. Dad brings it up daily.',
        expire: 'Prairie Titan stopped calling. The coulee jump now plays to a banjo. Dad sighs every time.' },
      { id: 'energy', name: 'Riot Juice', what: 'energy drink ad',
        blurb: 'An energy drink that tastes like a battery licked a Slurpee. Sponsors dirt bikes, snowmobiles and bad decisions.',
        fee: [2500, 4500], genres: { metal: 3, punk: 3, rock: 1, country: 0.3 }, sellout: 0.6, buzz: 7, reach: 0.02, speaker: 'mom',
        title: 'Now With 40% More Moose',
        offer: 'Riot Juice (tagline: "Now With 40% More Moose") wants "{adsong}" behind a snowmobile doing a backflip over a grain bin. ' +
          '{adfee}. Mom took the message. She wrote "RIOT JUICE??" and underlined it three times.',
        take: 'Twenty-nine seconds of snowmobile backflips to your song. The band gets a pallet of Riot Juice. Nobody sleeps for a week.',
        decline: 'You pass. The superfans notice. Dale from Warman posts "they said NO to the moose juice" with eleven flexing emojis.',
        counterWin: 'Riot Juice agrees before you finish the sentence. Their marketing guy is on his fourth can. He agrees to everything.',
        counterWalk: 'Riot Juice hangs up mid-sentence. Word is they signed a polka-core band from Gimli. Their backflips are worse.',
        expire: 'Riot Juice stopped calling. The pallet of free samples never came. Jaxon checks the porch anyway.' },
      { id: 'hockey', name: 'Saturday Night Puck', what: 'hockey highlight package',
        blurb: 'The highlight package on Sportsnut: glove saves, line brawls and a Zamboni at sunset, cut to a song.',
        fee: [1500, 2500], genres: { metal: 2, punk: 2, rock: 2, country: 2 }, sellout: 0.2, buzz: 6, reach: 0.012, speaker: 'neighbour',
        title: 'Glove Save, Big Riff',
        offer: 'Sportsnut wants "{adsong}" under the Saturday Night Puck highlight package: glove saves, line brawls, a Zamboni at sunset. ' +
          '{adfee}. Mr. Lindqvist from next door heard first. He is weirdly emotional about it.',
        take: 'A glove save lands exactly on your snare hit. The whole province hears you between periods. Mr. Lindqvist cries a little.',
        decline: 'You pass. Sportsnut uses stock music called "Hockey Rock 7". Mr. Lindqvist will not look at you.',
        counterWin: 'Sportsnut ups it. "For the playoffs," says a producer with a whistle around his neck. He blows it when you say yes.',
        counterWalk: 'Sportsnut goes with "Hockey Rock 7". It is fine. It is so, so fine. Mr. Lindqvist mows his lawn angrily.',
        expire: 'Saturday Night Puck went with "Hockey Rock 7". Mr. Lindqvist mutters about it over the fence.' },
      { id: 'insurance', name: 'Prairie Mutual Hail & Hardship', what: 'insurance ad',
        blurb: 'The regional insurer. Covers hail, grasshoppers and "acts of Saskatchewan". Marcel adjusts claims for them. Marcel is mortified.',
        fee: [2000, 3500], genres: { metal: 3, country: 0.5, rock: 0.3, punk: 0.1 }, sellout: 0.9, buzz: 4, reach: 0.01, speaker: 'marcel',
        takeFx: { mood: { marcel: -6 } },
        title: 'Your Employer Is Calling',
        offer: 'Prairie Mutual Hail & Hardship wants "{adsong}" for a regional ad: hail smashing a truck, then a calm adjuster with a clipboard. ' +
          '{adfee}. The adjuster in the storyboard is Marcel. He did not know. He is pale.',
        take: 'The ad runs on regional TV. Marcel\'s boss calls him "our little rock star" at the staff meeting. Marcel wants to be swallowed by hail.',
        decline: 'You pass. Marcel hugs everyone, one by one. His boss gives the spot to a harp player. Marcel sends her flowers.',
        counterWin: 'Prairie Mutual pays up. The regional manager calls it "a claim we are happy to settle". Marcel screams into a pillow.',
        counterWalk: 'Prairie Mutual pulls out. Marcel is so relieved he adjusts three claims in a row in favour of the policyholder.',
        expire: 'Prairie Mutual went with a harp. Marcel has never been happier at work.' },
      { id: 'game', name: 'Moosefall IV: Antler Protocol', what: 'video game trailer',
        blurb: 'A game about a cyborg moose defending a grain elevator from robots. Made by Gopherbyte, a studio above a vape shop in Montréal.',
        fee: [2000, 4000], genres: { metal: 2.5, punk: 2, rock: 2, country: 1 }, sellout: 0.3, buzz: 9, reach: 0.025, speaker: 'dj',
        title: 'The Moose Has Lasers',
        offer: 'Gopherbyte wants "{adsong}" for the Moosefall IV: Antler Protocol trailer: a cyborg moose defending a grain elevator from robots. ' +
          '{adfee}. Deb from CRUD 90.5 passed on the email. She says it is "very brutal, in a gentle way".',
        take: 'The trailer drops. A cyborg moose headbutts a robot on your downbeat. Millions of views. The comments are about the moose, and you.',
        decline: 'You pass. The trailer uses a synth track. The comments ask "where is the guitar??" for a week. You feel seen.',
        counterWin: 'Gopherbyte says yes and asks if the band wants to be playable characters. Kenji nods before anyone else can answer.',
        counterWalk: 'Gopherbyte goes quiet, then posts the trailer with a synth track. The moose looks disappointed. So does Dana.',
        expire: 'Moosefall IV shipped its trailer with a synth track. The moose deserved better.' }
    ],
    lines: {
      later: 'You tell them you need to "talk to the band". The offer sits on the laptop, under Offers, for {adleft}.',
      takeChat: 'Our song is in the {brand} ad. My cousin already texted. Twice.',
      walkChat: '{brand} walked. Maybe we should not have asked for {adcounter}.',
      declineChat: 'Real ones noticed we turned down {brand}. The comments are very proud of us.'
    }
  };
})(window.GG);
