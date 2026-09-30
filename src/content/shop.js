// content/shop.js (v0.8 "Kit", KITSIM): the drum shop, rehearsal spaces, vans and the merch table. Prices and perks are
// content; rates, curves and the bots live in economy.shop. GG.shop (src/2a_sim_shop.js) reads all of it.
// Shape: GG.content.shop = {
//   gear: [{ id, name, names?: { <genre>: name }, lane?: 5|6, pedal?: true, needs?: gearId, cost, era, blurb }]
//     (toms = lane 5, ride/china = lane 6 (needs the toms), the double-kick pedal adds no lane)
//   kit: [{ tier 0..3, id (C.KIT_QUALITY), name, cost, era, blurb }]   (bought in order; tier 0 is what you start with)
//   sections: { outro: { name, blurb }, solo: { name, blurb } }   (C.EXTRA_SECTIONS; unlocked by the career, never bought)
//   spaces: [{ tier 0..3, id (C.SPACE_TIERS), name, rent ($/week), era, perk: PERK, blurb }]   (tier 0 = the band's own
//     start space: name + id come from content.bands[bandId].space / spaceName)
//   upgrades: [{ id, tier (the space tier it belongs to), name, cost, perk: PERK, moves?: true (comes along when you move), blurb }]
//   vanTiers: [{ tier 0..3, id (C.VAN_TIERS), kind, price, era, space (merch boxes hauled), comfort 1..5, condition (new), wear, breakdown, blurb }]
//   vanNames: { <bandId>: [tier0, tier1, tier2, tier3] }   (Addendum 1 Part C1; the player can rename any vehicle)
//   vanUpgrades: [{ id, name, cost, tiers: [vanTier..], space?, comfort?, wear?, breakdown?, chemistry?, blurb }]
//   merchTiers: [{ id (C.MERCH_TIERS), era, release?: true (needs a released EP/album), minFans?, blurb }]
//   merch: [{ id, name, tier, genre?: [..], band?: [..], cost ($/unit), price (suggested $), perBox (units per box), appeal
//     (0.5..2, how many people want one), season?: { winter|spring|summer|fall: mult }, blurb, hidden?: true (misprint only) }]
//   lines: { outro / solo / misprintCollector / move / van / merchUnlock / evicted: [{ who, text }] (group chat), stickersMoved }
// } PERK = { rehearse: +x (gain mult), rest: +x, write: +quality, record: +production per studio week, chemistry: + every
//            other week, mood: + every other week (everyone), recover: extra burnout recovery/week }
// No gong on the drum kit, ever.
(function (GG) {
  GG.content.shop = {
    gear: [
      { id: 'toms', name: 'Rack tom + floor tom', lane: 5, cost: 450, era: 'garage',
        blurb: 'Two pawn-shop toms from two different kits. Lane 5: fills that roll down the kit.' },
      { id: 'ride', name: 'Ride cymbal', names: { metal: 'China cymbal', punk: 'China cymbal', rock: 'Ride cymbal', country: 'Ride cymbal' },
        lane: 6, needs: 'toms', cost: 350, era: 'garage', blurb: 'Lane 6: a pinging bell (or a trashy china) for accents and big choruses.' },
      { id: 'pedal', name: 'Double-kick pedal', pedal: true, cost: 300, era: 'garage',
        blurb: 'Both feet on the kick. The kick lane can hit every 16th. Your calves file a complaint.' }
    ],
    kit: [
      { tier: 0, id: 'milk_crate', name: 'The Milk Crate Special', cost: 0, era: 'garage',
        blurb: 'A kick with a pillow in it, a snare, one hi-hat, a cracked crash. The throne is a milk crate.' },
      { tier: 1, id: 'pawn_shop', name: 'Pawn Shop Five-Piece', cost: 800, era: 'garage',
        blurb: 'From the pawn shop on 8th Street. The shells don\'t match. It sounds like a real kit, mostly.' },
      { tier: 2, id: 'pro', name: 'Maple Pro Kit', cost: 2800, era: 'local',
        blurb: 'Maple shells, fresh heads, hardware that doesn\'t slip mid-song. It punches.' },
      { tier: 3, id: 'arena', name: 'The Arena Kit', cost: 9000, era: 'world',
        blurb: 'Big shells, bigger cymbals, a drum tech named Doug. It sounds like a stadium, even in the garage.' }
    ],
    sections: {
      outro: { name: 'Outro', blurb: 'A proper ending: the last chord rings out and you get a big fill to finish.' },
      solo: { name: 'Solo', blurb: 'Dana\'s spotlight: you lay back on a stripped kit while the lead guitar shreds.' }
    },
    spaces: [
      { tier: 0, id: 'start', name: 'Home', rent: 0, era: 'garage', perk: {},
        blurb: 'Where it all started. Free, cold, and the neighbours have opinions.' },
      { tier: 1, id: 'jam_room', name: 'Rent-A-Riff, Jam Space 7', rent: 60, era: 'local', perk: { rehearse: 0.08 },
        blurb: 'A cinder-block room in a strip mall, next to the vacuum repair. Egg-crate foam, a light that buzzes, a sign that says NO DRUMS AFTER 11.' },
      { tier: 2, id: 'pro_studio', name: 'Prairie Dog Sound', rent: 150, era: 'signed', perk: { rehearse: 0.08, write: 1, record: 1 },
        blurb: 'Rehearsal and recording in an old grain co-op. An isolation booth, and an engineer named Gwen who has heard it all.' },
      { tier: 3, id: 'arena_backstage', name: 'Backstage at the Potash Place', rent: 300, era: 'world',
        perk: { rehearse: 0.08, write: 1, record: 1, rest: 0.2, recover: 1 },
        blurb: 'Your own room under the arena. A star on the door. The hockey team\'s laundry is next door.' }
    ],
    upgrades: [
      { id: 'curb_couch', tier: 0, name: 'The curb couch', cost: 40, perk: { rest: 0.05 }, moves: true,
        blurb: 'Free from the curb on garbage day, plus $40 to get it home. Smells like 1997. Comes with you if you move.' },
      { id: 'egg_foam', tier: 0, name: 'Egg-crate foam', cost: 80, perk: { rehearse: 0.03 },
        blurb: 'Stapled to every wall. The neighbours stop calling the city. Mostly.' },
      { id: 'beer_fridge', tier: 0, name: 'Dad\'s old beer fridge', cost: 120, perk: { chemistry: 1 }, moves: true,
        blurb: 'Hums in E flat. Holds pop, perogies and one mystery jar. Everyone hangs around it.' },
      { id: 'xmas_lights', tier: 0, name: 'Christmas lights', cost: 30, perk: { write: 1 },
        blurb: 'Up all year. Marcel says they are for the vibe. They are.' },
      { id: 'leather_couch', tier: 1, name: 'A leather-ish couch', cost: 250, perk: { rest: 0.08 },
        blurb: 'One cushion is leather. The rest are hope.' },
      { id: 'acoustic_panels', tier: 1, name: 'Acoustic panels', cost: 300, perk: { rehearse: 0.03 },
        blurb: 'Real ones, not egg crates. The vacuum repair man next door sends a thank-you card.' },
      { id: 'real_pa', tier: 1, name: 'A real PA', cost: 600, perk: { rehearse: 0.03, write: 1 },
        blurb: 'You can finally hear Marcel at rehearsal. Mixed blessing.' },
      { id: 'disco_ball', tier: 1, name: 'Disco ball', cost: 90, perk: { mood: 1 },
        blurb: 'Nobody admits who bought it. Everybody looks up when it turns.' },
      { id: 'iso_booth', tier: 2, name: 'Isolation booth', cost: 1200, perk: { record: 1 },
        blurb: 'A soundproof box for vocals. Marcel treats it as a dressing room.' },
      { id: 'band_lounge', tier: 2, name: 'Band lounge', cost: 900, perk: { rest: 0.08 },
        blurb: 'Couches, a lamp, a board game with half the pieces. Burnout melts.' },
      { id: 'espresso', tier: 2, name: 'Espresso machine', cost: 500, perk: { write: 1 },
        blurb: 'Songs get written at 2 a.m. now. Some of them are good.' },
      { id: 'mood_leds', tier: 2, name: 'Mood lighting', cost: 350, perk: { mood: 1 },
        blurb: 'Purple for metal, red for anger, blue for Kenji.' },
      { id: 'catering', tier: 3, name: 'Hot catering', cost: 2000, perk: { mood: 1 },
        blurb: 'Perogies, hot, every day. Baba inspects the kitchen and approves. Once.' },
      { id: 'green_room', tier: 3, name: 'A green room that is green', cost: 1500, perk: { rest: 0.08 },
        blurb: 'Someone finally painted it. The band rests like royalty.' },
      { id: 'hot_tub', tier: 3, name: 'A hot tub', cost: 4000, perk: { recover: 1 },
        blurb: 'Under the arena, next to the Zamboni. Nobody asks how.' },
      { id: 'star_door', tier: 3, name: 'A star on the door', cost: 600, perk: { write: 1 },
        blurb: 'A gold star with the band name on it. Marcel polishes it before every show.' }
    ],
    vanTiers: [
      { tier: 0, id: 'minivan', kind: 'Rusted minivan', price: 0, era: 'garage', space: 3, comfort: 2, condition: 72, wear: 1, breakdown: 1,
        blurb: 'Rust holds it together. Rust and faith. The side door opens from the outside only.' },
      { tier: 1, id: 'fifteen', kind: '15-passenger van + trailer', price: 3500, era: 'local', space: 6, comfort: 3, condition: 84, wear: 0.9, breakdown: 0.85,
        blurb: 'An ex-church van with a trailer whose hitch squeaks in every key. Room for the whole band and the merch.' },
      { tier: 2, id: 'sprinter', kind: 'Sprinter', price: 6500, era: 'signed', space: 9, comfort: 4, condition: 92, wear: 0.75, breakdown: 0.7,
        blurb: 'High roof. You can stand up inside. Nobody does, but you can.' },
      { tier: 3, id: 'bus', kind: 'Tour bus', price: 30000, era: 'world', space: 14, comfort: 5, condition: 96, wear: 0.65, breakdown: 0.6,
        blurb: 'Bunks, a lounge and a tiny toilet with a big sign. You made it. Kenji still drives.' }
    ],
    vanNames: {
      hail_damage: ['The Moose Hearse', 'The Claim Adjuster', 'Black Ice', 'Doom Coach'],
      frost_heave: ['The Pothole', 'Squat Van', 'The Eviction Notice', 'Frost Heave One'],
      gravel_kings: ['The Mullet Wagon', 'Night Rider', 'The Power Ballad', 'Thunderdome'],
      grid_road_ramblers: ['Grandpa\'s Suburban', 'The Hay Wagon', 'The Combine', 'The Prairie Palace']
    },
    vanUpgrades: [
      { id: 'roof_rack', name: 'Roof rack', cost: 150, tiers: [0, 1], space: 1,
        blurb: 'One more box of merch, strapped on with bungee cords and optimism.' },
      { id: 'cushions', name: 'Seat cushions', cost: 120, tiers: [0, 1, 2], comfort: 1,
        blurb: 'Memory foam. Your back remembers Moose Jaw a little less.' },
      { id: 'winter_tires', name: 'Winter tires', cost: 400, tiers: [0, 1, 2, 3], breakdown: 0.85, wear: 0.9,
        blurb: 'Real ones. The ditch outside Davidson misses you already.' },
      { id: 'block_heater', name: 'Block heater cord', cost: 90, tiers: [0, 1, 2], breakdown: 0.9,
        blurb: 'Plugged into every Legion outlet from here to Yorkton. It starts at minus forty.' },
      { id: 'tape_deck', name: 'A tape deck that works', cost: 80, tiers: [0, 1], chemistry: 1,
        blurb: 'Road trips get sing-alongs. Long drives build the band (+1 chemistry).' },
      { id: 'bunks', name: 'Bunks', cost: 2000, tiers: [2, 3], comfort: 1,
        blurb: 'Sleep lying down between cities. Dana sleeps with her guitar.' },
      { id: 'merch_pod', name: 'Merch pod', cost: 1500, tiers: [2, 3], space: 2,
        blurb: 'A roof pod just for merch boxes. Marcel wants it painted like a coffin.' }
    ],
    merchTiers: [
      { id: 'basics', era: 'garage', blurb: 'Stickers and shirts.' },
      { id: 'warm', era: 'local', blurb: 'Hoodies and toques. Winter is merch season.' },
      { id: 'vinyl', era: 'local', release: true, blurb: 'Vinyl, once you have a record out.' },
      { id: 'limited', era: 'signed', minFans: 5000, blurb: 'Silly limited editions. Collectors line up.' }
    ],
    merch: [
      { id: 'sticker', name: 'Stickers', tier: 'basics', cost: 0.4, price: 3, perBox: 200, appeal: 1.4,
        blurb: 'The logo on a sticker. They end up on hockey helmets, tail lights and one church.' },
      { id: 'shirt', name: 'Band shirts', tier: 'basics', cost: 8, price: 20, perBox: 24, appeal: 1,
        blurb: 'Black, logo on the front. The backbone of every merch table.' },
      { id: 'patch', name: 'Back patches', tier: 'basics', genre: ['metal', 'punk'], cost: 2, price: 8, perBox: 100, appeal: 0.9,
        blurb: 'For battle jackets. Sewn on crooked by people who love you.' },
      { id: 'longsleeve', name: 'Unreadable-logo longsleeves', tier: 'basics', genre: ['metal'], cost: 11, price: 30, perBox: 20, appeal: 0.8,
        blurb: 'The logo looks like a root system. Nobody can read it. Everyone wants one.' },
      { id: 'tape', name: 'DIY tapes', tier: 'basics', genre: ['punk'], cost: 2, price: 8, perBox: 50, appeal: 0.9,
        blurb: 'Dubbed one at a time on a boom box. Hand-cut covers.' },
      { id: 'trucker', name: 'Trucker hats', tier: 'basics', genre: ['country'], cost: 5, price: 22, perBox: 36, appeal: 1.1,
        blurb: 'Mesh back, logo front. Every farmer in the room already owns six. They buy a seventh.' },
      { id: 'tourshirt', name: 'Tour shirts (dates on the back)', tier: 'warm', genre: ['rock'], cost: 10, price: 28, perBox: 24, appeal: 1.1,
        blurb: 'Every city on the back, even the ones that got cancelled.' },
      { id: 'hoodie', name: 'Hoodies', tier: 'warm', cost: 22, price: 50, perBox: 12, appeal: 0.8,
        season: { winter: 1.4, fall: 1.2, spring: 1, summer: 0.6 }, blurb: 'Heavy, warm, logo on the hood. Prairie winter gear.' },
      { id: 'toque', name: 'Toques', tier: 'warm', cost: 5, price: 20, perBox: 40, appeal: 1,
        season: { winter: 1.6, fall: 1.2, spring: 0.9, summer: 0.4 }, blurb: 'With a pom-pom. Sells out in January, sits in July.' },
      { id: 'vinyl', name: 'Vinyl', tier: 'vinyl', cost: 12, price: 30, perBox: 25, appeal: 0.8,
        blurb: 'Your latest record on a slab of wax. People buy it and play it on nothing.' },
      { id: 'bobblehead', name: 'Lord Abyssus bobblehead', tier: 'limited', band: ['hail_damage'], cost: 14, price: 40, perBox: 12, appeal: 0.9,
        blurb: 'Marcel in his cape, nodding forever. He signed the first one to himself.' },
      { id: 'cape_replica', name: 'Replica capes', tier: 'limited', band: ['hail_damage'], cost: 25, price: 70, perBox: 10, appeal: 0.6,
        blurb: 'Velvet-ish. Fire-retardant-ish. Marcel inspects every one.' },
      { id: 'council_pins', name: 'City council enamel pins', tier: 'limited', band: ['frost_heave'], cost: 3, price: 12, perBox: 60, appeal: 1,
        blurb: 'One pin per councillor Rox has yelled about. Collect all nine.' },
      { id: 'pants_keychain', name: 'Leather-pants keychains', tier: 'limited', band: ['gravel_kings'], cost: 4, price: 15, perBox: 50, appeal: 0.9,
        blurb: 'Tiny leather pants. For your keys. At minus forty.' },
      { id: 'duke_hat', name: 'Duke\'s Hat (replica)', tier: 'limited', band: ['grid_road_ramblers'], cost: 30, price: 80, perBox: 8, appeal: 0.6,
        blurb: 'The hat is the character. Now it can be yours.' },
      { id: 'misprint', name: 'HALE DAMAGE shirts (misprint)', tier: 'limited', hidden: true, cost: 8, price: 60, perBox: 50, appeal: 2.5,
        blurb: 'The first batch, misspelled. Now a collector\'s item. There will never be more.' }
    ],
    lines: {
      outro: [{ who: 'jaxon', text: 'what if the song... ended. like on purpose. with a big finish' },
        { who: 'dana', text: 'An outro. I have been waiting for someone to say it. Let the last chord ring.' }],
      solo: [{ who: 'dana', text: 'Solo section unlocked. You play quarter notes. I play everything else.' }],
      misprintCollector: [{ who: 'dana', text: 'There is a fan page for HALE DAMAGE shirts now. People want the misprint. The box under the workbench is worth money.' }],
      move: [{ who: 'marcel', text: 'A real room. With a door that locks. I will need a mirror by the door.' }],
      van: [{ who: 'jaxon', text: 'NEW VAN. baba says it is "a lot of van". she means it as a compliment' }],
      merchUnlock: [{ who: 'marcel', text: 'New merch. I have approved the designs. I have also designed the designs.' }],
      evicted: [{ who: 'marcel', text: 'The landlord changed the locks. Three weeks behind on rent, apparently. We are moving back. My mirror is coming with us.' }],
      stickersMoved: 'Every sticker from the old van moved over, one by one, with a hair dryer.'
    }
  };
})(window.GG);
