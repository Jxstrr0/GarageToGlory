// venues.js: gig venues (owned by the SIM agent). v0.1: the garage era, all in and around Saskatoon.
// Contract fields: id, name, city, region, tier (1 DIY, 2 bars & clubs), kind, capacity,
//   deal 'exposure'|'flat'|'door', pay (flat: guarantee in $; door: $ per head for the band; exposure: 0),
//   minFans (fans needed to be booked or offered; 99999 = card-only), genreFit { metal, punk, rock, country } 0..1, quirk.
// Sim extras: walkIns (people who are there anyway), gas ($ round trip from the garage), setSize (songs played).
(function (GG) {
  GG.content.venues = [
    { id: 'buddys_house_party', name: "Buddy's House Party", city: 'Saskatoon', region: 'canada', tier: 1, kind: 'house',
      capacity: 15, deal: 'exposure', pay: 0, minFans: 0, walkIns: 8, gas: 5, setSize: 2,
      genreFit: { metal: 0.8, punk: 1, rock: 0.9, country: 0.7 },
      quirk: 'Twelve people and a dog.' },

    { id: 'gopher_hole_openmic', name: 'The Gopher Hole — Open Mic Night', city: 'Saskatoon', region: 'canada', tier: 1, kind: 'openmic',
      capacity: 40, deal: 'exposure', pay: 0, minFans: 0, walkIns: 12, gas: 5, setSize: 2,
      genreFit: { metal: 0.6, punk: 0.8, rock: 0.9, country: 0.9 },
      quirk: 'The host does slam poetry between acts. All of it is about his divorce.' },

    { id: 'martensville_skatepark', name: 'Martensville Skatepark (All-Ages)', city: 'Martensville', region: 'canada', tier: 1, kind: 'outdoor',
      capacity: 70, deal: 'exposure', pay: 0, minFans: 25, walkIns: 20, gas: 20, setSize: 3,
      genreFit: { metal: 0.9, punk: 1, rock: 0.8, country: 0.4 },
      quirk: 'The stage is a half-pipe. Nobody has ever finished a set without rolling in.' },

    { id: 'legion_63', name: 'Legion Hall, Branch 63', city: 'Saskatoon', region: 'canada', tier: 1, kind: 'hall',
      capacity: 60, deal: 'flat', pay: 80, minFans: 40, walkIns: 14, gas: 5, setSize: 4,
      genreFit: { metal: 0.4, punk: 0.5, rock: 0.8, country: 1 },
      quirk: 'The meat draw runs during your set, and it has the right of way.' },

    { id: 'bingo_palace', name: 'Bingo Palace', city: 'Saskatoon', region: 'canada', tier: 1, kind: 'hall',
      capacity: 80, deal: 'flat', pay: 100, minFans: 70, walkIns: 25, gas: 5, setSize: 3,
      genreFit: { metal: 0.5, punk: 0.6, rock: 0.8, country: 0.9 },
      quirk: 'You play between games. Every time someone yells BINGO, you stop.' },

    { id: 'warman_curling_lounge', name: 'Warman Curling Rink Lounge', city: 'Warman', region: 'canada', tier: 1, kind: 'lounge',
      capacity: 50, deal: 'flat', pay: 120, minFans: 90, walkIns: 15, gas: 25, setSize: 4,
      genreFit: { metal: 0.5, punk: 0.5, rock: 0.9, country: 1 },
      quirk: 'The window behind you overlooks sheet three. Nobody is watching you.' },

    { id: 'st_vlads_hall', name: "St. Vlad's Church Hall", city: 'Saskatoon', region: 'canada', tier: 1, kind: 'hall',
      capacity: 90, deal: 'flat', pay: 150, minFans: 99999, walkIns: 30, gas: 5, setSize: 4,   // card-only
      genreFit: { metal: 0.3, punk: 0.4, rock: 0.6, country: 0.8 },
      quirk: 'Perogies at intermission. No screaming during grace.' },

    { id: 'gopher_hole', name: 'The Gopher Hole', city: 'Saskatoon', region: 'canada', tier: 2, kind: 'bar',
      capacity: 150, deal: 'door', pay: 3, minFans: 150, walkIns: 20, gas: 5, setSize: 5,
      genreFit: { metal: 1, punk: 0.9, rock: 0.9, country: 0.6 },
      quirk: 'The sound guy hates drummers. Specifically you.' }
  ];
})(window.GG);
