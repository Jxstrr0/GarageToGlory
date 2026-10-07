// content/zz_band_frost_heave.js (v0.9 "Genres", lane A1): the Frost Heave pack. Punk, Regina, the basement under the
// Suds-O-Rama; Rox Delorme (vocals/guitar), Benny "Two Chords" Mahon (guitar), Moth (bass, driver, lives in the van); you on
// drums. Their rival: the Mall Rats (Toronto), the focus-group four: Blaze (real name Kevin, from Oakville), Dex (bass, has never
// plugged in), Brody (drums, chosen for his jawline) and Siobhan (the stylist, the real leader). Sponsor-mandated kickflips.
// They throw sponsor money at everything, including you.
//
// The zz_ prefix loads this file after every base content file (build.js sorts content/*.js), so it only ADDS to the base
// structures, per plan_contract_0.9 §4.1: band extras go into <file>.byBand.frost_heave (career.pool: flat + byBand),
// member-keyed pools get entries for rox / benny / moth, card variants use '<baseId>_frost_heave' ('_mall_rats' for rv_*),
// the rival's voice lives in rivalry.cast.mall_rats. Every object is created defensively (the base lane builds some of the
// v0.9 shapes in parallel), nothing in a base pool is removed or rewritten, and a per-band key never replaces another band's.
//
// Q2 storyline "Rox for City Council" (chain 'council', 6 steps, 10 cards):
//   1 fh_council_1_filing ── deposit ──────> 2 fh_council_2_band ─┐
//                         ── laundromat ───> 2 fh_council_2_suds ─┤ (any) ──> 3 fh_council_3_debate (policy roll / heckle /
//                         ── "you're punk" ─> end (council: never)                stage-dive roll: sets councilOdds, roxDive)
//   4 fh_council_4_flyer (own it: odds good · benefit gig · drop out -> end (council: withdrew))
//   5 fh_council_5_good | fh_council_5_bad (flagEquals councilOdds): the count (rolls) -> councilResult won | lost | tie
//   6 fh_council_6_won | _lost | _tie -> end with flags.council = won | lost | tie. Helper flags councilPlan / councilDebate /
//     councilOdds / councilResult are cleared (false) at every end. flags.roxDive ('debate') is the stage dive born at the
//     debate (the story of Rox's signature stageDive: Pomeroy's dive bylaw, fh_local_dive_bylaw); flags.council feeds the
//     Loonies outfit cards (councillor / papers / sash), the Local cards (ward duties / committee) and the World (squat).
// Q3 World payoff (chain 'squat', Signed era, starts once flags.council is set): the council song becomes a Berlin squat's
//   anthem -> flags.squatAnthem = 'berlin' | 'sold' | 'no'. 'berlin' unlocks the tour package eu_squat_anthem_tour (Amsterdam,
//   Berlin, then Wackelstein Open Air; payoff at Wackelstein: flags.squatAnthemPayoff, story card wt_fh_squat_anthem, Gong
//   credit like the Moose Opera).
// Q5 home superfan: Delphine from the Suds-O-Rama (bandbook.homeSuperfan.frost_heave, npc fh_delphine, gift fh_lint_portrait).
// Q6 misprint: FROST HEAVY. Q8 cameos: fh_cameo_hail_damage, fh_cameo_gravel_kings (cameo: true).
// New flags (cards set them, cards/tour read them): council, councilPlan, councilDebate, councilOdds, councilResult, roxDive,
//   squatPlan, squatCall, squatAnthem, squatAnthemPayoff (tour), demandEnglish / demandRadio / demandImage / demandShowcase.
// npcs (band- or rival-scoped): fh_delphine, fh_irma, fh_pomeroy, fh_janice (Frost Heave); mr_blaze (frontman), mr_siobhan,
//   mr_preston (Mall Rats). Cast member ids mr_blaze / mr_siobhan / mr_dex / mr_brody (the npc ids double as cast ids).
//   The Mall Rats' label is the base's rival-only label for them ('network_nine', Network Nine Music), found by rivalOnly + rival.
// First-match lists (a holiday's cards, licenseScandals): the band's own entries go in front of the shared ones, so the
//   shared cards stay the fallback. Every string is <= the content limits; tokens are §4.2's.
// No USA content, no gong on the kit, no real brands (MegaBulk, Shredwood, Riot Juice and Network Nine are parodies).
(function (GG) {
  var K = GG.content = GG.content || {};
  var B = 'frost_heave', RIVAL = 'mall_rats';
  // The pack installs unconditionally (v0.9 integration): it is written against the v0.9 base content (plan_contract_0.9
  // §4.1: neutral flat pools, Hail Damage's voice in lines.byBand.hail_damage) and read through the v0.9 sims.
  var GL = ['garage', 'local'], GLS = ['garage', 'local', 'signed'], LS = ['local', 'signed'], L = ['local'], S = ['signed'];
  var ALL = ['garage', 'local', 'signed', 'world'], LSW = ['local', 'signed', 'world'], SW = ['signed', 'world'], W = ['world'];

  /* ---- helpers --------------------------------------------------------------------------------------------------- */
  // Monday-deck gate: Frost Heave only (punk), garage era unless the card says otherwise.
  function g(extra) {
    var gate = { era: ['garage'], genre: ['punk'], band: [B] };
    for (var k in extra) gate[k] = extra[k];
    return gate;
  }
  function only(extra) { var gate = { band: [B] }; for (var k in extra) gate[k] = extra[k]; return gate; }
  function obj(o, k) { if (!o[k] || typeof o[k] !== 'object') o[k] = {}; return o[k]; }
  function list(o, k) { if (!Array.isArray(o[k])) o[k] = []; return o[k]; }
  function band(o) { return obj(obj(o, 'byBand'), B); }             // o.byBand.frost_heave
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
  // A per-band slot (§4.1 "per band, non-pool": awards.speech / speechWorstVan / carpet, world.gongCarpet, ...). The slot is a
  // map { <bandId>: value }; if the base still holds one legacy value there (a single card or an array), it is left untouched
  // and the band's value waits on it as a property until the base becomes the map (handover in the lane report).
  function perBand(o, k, v) {
    if (o[k] == null) o[k] = {};
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
  function END(ch) { var o = {}; o[ch] = { step: 'end' }; return o; }
  function NEXT(ch, step, delay) { var o = {}; o[ch] = { step: step, delay: delay || 1 }; return o; }
  // The council chain ends: the result + every helper flag cleared.
  function council(result) { return { council: result, councilPlan: false, councilDebate: false, councilOdds: false, councilResult: false }; }
  function squat(result) { return { squatAnthem: result, squatPlan: false, squatCall: false }; }
  // A look (same helper shape as rivals.js): LOOK + top.
  function look(skin, hair, style, shirt, pants, h, b, extras, top) {
    return { skin: skin, hair: hair, hairStyle: style, shirt: shirt, pants: pants, height: h, build: b, extras: extras || [], top: top };
  }

  /* ======================================================================================================================
     NPCs. Frost Heave's Regina people are scoped to the band; the Mall Rats' people to their rival (career.speakerOk).
     ====================================================================================================================== */
  var npcs = obj(K, 'npcs');
  [
    { id: 'fh_delphine', name: 'Delphine from the Suds-O-Rama', band: [B],
      blurb: 'Retired school-bus driver. Does her laundry every Thursday at seven, machine 6, and has never once left during a spin cycle. Your first superfan.' },
    { id: 'fh_irma', name: 'Irma Toth', band: [B],
      blurb: 'Owns the Suds-O-Rama. Rents you the basement for $40 a month and a promise to fold. Hears every rehearsal through the floor. Has notes.' },
    { id: 'fh_pomeroy', name: 'Councillor Garth Pomeroy', band: [B],
      blurb: 'Ward 6 councillor for eighteen years, mostly by not answering the phone. Rox has screamed at him 212 times. He has named two bylaws after her.' },
    { id: 'fh_janice', name: 'Janice from the Leader-Pest', band: [B],
      blurb: "Covers city hall for the Leader-Pest, Regina's paper of record. Has quoted Rox in print forty times. Twelve of the quotes were printable." },
    { id: 'mr_blaze', name: 'Blaze', rival: RIVAL, frontman: true,
      blurb: 'Mall Rats frontman. Real name Kevin, from Oakville. Snarls on cue, apologizes off cue. Has a stylist for the snarl.' },
    { id: 'mr_siobhan', name: 'Siobhan', rival: RIVAL,
      blurb: "The Mall Rats' stylist and the one who actually runs the band. Headset, clipboard, sponsor budget. Speaks only in deliverables." },
    { id: 'mr_preston', name: 'Preston from the Network', rival: RIVAL,
      blurb: 'VP of Youth Content at Network Nine. Built the Mall Rats from a focus group of four hundred teens and a mood board.' }
  ].forEach(function (n) { if (!npcs[n.id]) npcs[n.id] = n; });

  /* ======================================================================================================================
     The rival: the Mall Rats (rivalry.cast.mall_rats, §4.1 rival cast extension). Toronto, manufactured on a TV talent show.
     ====================================================================================================================== */
  var RV = obj(K, 'rivalry');
  var cast = obj(RV, 'cast');
  cast[RIVAL] = assign(cast[RIVAL] || {}, {
    id: RIVAL, frontman: 'mr_blaze', faceStyle: 'cap', actions: ['kickflip'],
    vehicle: 'a tour bus wrapped in a photo of their own faces, sponsored by Shredwood Skateboards',
    minivan: 'a tour bus wrapped in a photo of their own faces, sponsored by Shredwood Skateboards',
    members: [
      { id: 'mr_blaze', name: 'Blaze', short: 'Blaze', fullName: 'Blaze (Kevin Dunsmore)', nick: 'Blaze', role: 'vocals', lane: 'front',
        dayJob: 'Former mall food-court employee (the pretzel place)',
        bio: 'Real name Kevin, from Oakville. Won the network\'s punk talent show with a snarl a focus group scored 8.4. Apologizes to the crowd after every insult.',
        gags: ['Signs every autograph "Stay rebellious! Blaze (Kevin)".', 'His mohawk has a personal assistant.',
          'Calls his mom from the stage during the encore. She is in the front row.', 'Has never been to a mall he did not like.'],
        look: look('#f1d2b4', '#f4e04d', 'spiky', '#e0457b', '#1d1d24', 1.02, 0.95, ['tattoos'], 'jacket'), corpsePaint: false, skate: true, stageShirt: '#e0457b' },
      { id: 'mr_siobhan', name: 'Siobhan', short: 'Siobhan', fullName: 'Siobhan Marchetti-Kerr', nick: 'Siobhan', role: 'guitar / stylist', lane: 'left',
        dayJob: 'Stylist, band manager, sponsor liaison, the real leader',
        bio: 'Hired to style them. Now runs them. Plays rhythm guitar on stage with an earpiece in, taking calls between songs. Her amp is the only one that is on.',
        gags: ['Has a clipboard with a clipboard on it.', 'Approves every safety pin personally. Hypoallergenic only.',
          'Throws sponsor money at problems until they stop being problems.', 'Kickflips are in the contract. She wrote the contract.'],
        look: look('#c98f6a', '#1a1414', 'bun', '#15151a', '#3a3a44', 1.0, 0.95, ['glasses'], 'jacket'), corpsePaint: false, stageShirt: '#15151a' },
      { id: 'mr_dex', name: 'Dex', short: 'Dex', fullName: 'Dex Pellerin', nick: 'Unplugged', role: 'bass', lane: 'right',
        dayJob: 'Brand ambassador (energy drinks)',
        bio: 'Has never plugged his bass in. The cable runs into his back pocket. Nobody has noticed in four seasons. He moves like he means it.',
        gags: ['His bass has never made a sound. He has a signature model.', 'Tunes by looking at it.',
          'Was asked to plug in once. Cried.'],
        look: look('#8d5a3b', '#0f0f12', 'cap', '#3fbf7f', '#2b2b33', 1.06, 1.0, ['hat'], 'hoodie'), corpsePaint: false, stageShirt: '#3fbf7f' },
      { id: 'mr_brody', name: 'Brody', short: 'Brody', fullName: 'Brody Van Alstyne', nick: 'The Jaw', role: 'drums', lane: 'back',
        dayJob: 'Model (jawline)',
        bio: 'Chosen by a focus group for his jawline. Plays to a click track the network owns. Nods at you, one professional to another, then checks his angles in the cymbal.',
        gags: ['The jawline has its own lighting cue.', 'Plays a skate-punk beat he learned from a tutorial, perfectly, forever.',
          'Brought a stylist to soundcheck. For the kit.'],
        look: look('#e8c4a0', '#6b4a2c', 'short', '#f2f2f2', '#22222a', 1.05, 1.05, [], 'tee'), corpsePaint: false, stageShirt: '#f2f2f2' }
    ],
    songs: ['Anarchy in the Food Court', 'Kickflip Into My Heart', 'Pre-Ripped', 'Safety Pin (Hypoallergenic)', 'Riot at the Pretzel Stand',
      'Brand New Rage', 'Parental Advisory (Parents Approved)', 'Oakville Is Burning (Metaphorically)', 'Skate or Die (Terms Apply)',
      'No Future (Q3 Forecast Strong)', 'Down With the System (Available on All Systems)', 'Mohawk Maintenance', 'Tested on Teens',
      'Rebel Yell (Sponsored)', 'Grind the Rail, Grind the System'],
    albums: [
      { title: 'Focus Group Approved', kind: 'album' }, { title: 'Anarchy (Deluxe Edition)', kind: 'album' },
      { title: 'Live From the Food Court', kind: 'album' }, { title: 'Season Two', kind: 'album' },
      { title: 'Sponsored Content', kind: 'album' }, { title: 'The Kickflip Sessions', kind: 'album' },
      { title: 'Rebellion (Registered Trademark)', kind: 'album' }, { title: 'Unplugged (Dex Finally Relevant)', kind: 'album' },
      { title: 'Pre-Ripped Heart', kind: 'album' }, { title: 'A Very Mall Rats Holiday', kind: 'album' },
      { title: 'Greatest Hits (Year Two)', kind: 'album' }, { title: 'Reboot', kind: 'album' }
    ],
    rebrands: ['Mall Rats 2.0', 'The Mall Rats Experience (Presented by Shredwood)', 'Mal Ratz', 'Food Court Rebellion',
      'Mall Rats: Outlet Edition'],

    // ---- News: every rivalry.news key (the sim picks with its own seeded RNG). ----
    news: {
      filler: [
        "{rival} opened a mall. Not played at one. Opened one. Blaze cut the ribbon with a skateboard.",
        "{rival} did a kickflip on a morning show. The host clapped. The kickflip was a stunt double.",
        "Siobhan from {rival} posted a mood board for the next album. It is mostly skateboards and your band's logo, circled.",
        "{rival} announced a limited-edition safety pin. It costs $40. It is sold out.",
        "Dex from {rival} was photographed plugging in his bass. The network says the photo was staged.",
        "Blaze from {rival} did a radio interview. He called {band} 'a real inspiration, legally speaking'.",
        "{rival} launched a sneaker. It comes pre-scuffed, for authenticity. Two hundred dollars.",
        "{rival}'s drummer Brody was voted Canada's Most Punk Jawline. There is a trophy. It is a jaw.",
        "{rival} played a charity show for skateparks. The skatepark they built has a Shredwood logo in the concrete.",
        "Siobhan sent {band} a gift basket of energy drinks. The card says 'Let's collab (legally)'.",
        "{rival} filmed a music video in a Regina laundromat. It is not the Suds-O-Rama. Irma is still furious.",
        "Preston from the network called {rival} 'the most authentic product we have ever launched'."
      ],
      local: ["{rival} hit two hundred and fifty fans. The network threw a party. The fans were catered."],
      signed: ["{rival} signed with Network Nine Music, the network's own label. The contract was signed on camera. Twice. Better lighting."],
      album: ["{rival} release '{album}'. It debuts at #{pos} on the Maple 100 with a sponsored kickflip in every video.",
        "'{album}' by {rival} enters the Maple 100 at #{pos}. Each copy comes with a skateboard sticker and a survey."],
      albumNoChart: ["{rival} release '{album}'. It misses the chart. The network re-releases it as a 'director's cut' the next week."],
      fans: ["{rival} passed {fans} fans. Siobhan thanked every one of them in a sponsored post."],
      youPassed: ["You have more fans than {rival} now. Siobhan sent a gift card. It is for a skateboard store. It is for $5."],
      theyPassed: ["{rival} have more fans than you again. Blaze posted 'no beef, only growth'. It was scheduled."],
      heatUp: ["The scene is calling it a feud. {rival}'s network is calling it 'content'.",
        "The Leader-Pest runs '{band} vs {rival}: Real Punk or Mall Punk?' Siobhan buys the ad space next to it."],
      heatDown: ["Things are quiet with {rival}. Siobhan is 'recalibrating the brand'. Nobody knows what that means. It is a threat."],
      forfeit: ["You skipped the Battle of the Bands. {rival} won by default and kickflipped off the stage to celebrate. Twice. For the camera."],
      sameNightQuiet: ["{rival} played {venue} on Saturday. Siobhan posted the crowd shot. There were more cameras than people."],
      festivalMissed: ["{rival} headlined {venue}. Blaze thanked 'our friends in Regina who could not afford the gas'."],
      opener: ["{rival} opened for you. They brought a sponsor tent, a cameraman and about {n} fans who still had the wristbands.",
        "{rival} opened the show. Blaze told the crowd to 'stay for the real punks'. The network cut that part."],
      poached: ["{name} is in {rival} now. The welcome photo: pre-ripped jeans, a Shredwood deck, a smile they practised."],
      loonies: ["{rival} won {n} Loonie(s) this year. Blaze thanked his sponsors, his stylist and, 'for the edge', {band}."],
      crack_breakup: ["The network cancelled {rival}. The press release says they are 'moving in a different direction'. The direction is a cooking show."],
      crack_rebrand: ["The Mall Rats are now {rival}. Same four people, new font, a new sponsor. Siobhan calls it 'a soft relaunch'."],
      crack_opener: ["{rival} want to open for you. Siobhan's email subject line: 'Synergy?' The budget is attached. It is large."],
      finalSoon: ["The Sad Dome in Calgary wants a co-bill in week {n}: {band} and {rival}. The network wants the broadcast rights."],
      reunion: ["{rival} reunite for one night at the Sad Dome. The network calls it 'a limited-time offer'."]
    },

    // ---- Showdowns: every C.SHOWDOWNS kind (the UI announcement + your-win / their-win lines). ----
    showdowns: {
      botb: { text: "Battle of the Bands at {venue}, {city}. {rival} are in, with a camera crew and a skateboard ramp. Winner takes {prize} and a chunk of the loser's fans.",
        win: ["The crowd picks you. Blaze kickflips off the stage in protest and misses. The network keeps the shot. You take {prize}.",
          "You win the Battle. Siobhan shakes your hand and gives you a business card. It says 'Let's talk'. It always says that."],
        lose: ["The crowd picks {rival}. The kickflip landed. Blaze thanks 'the real ones from Regina'. Some of your fans stay for the merch.",
          "{rival} win the Battle. The prize goes to a skatepark with their logo on it. Your fans get free energy drinks. Some switch sides."] },
      sameNight: { text: "{rival} are playing {venue} this Saturday too, with free pizza and a sponsor tent. The scene will split. Whoever has the buzz gets the room.",
        win: ["Most of the scene came to your show. {rival} played to a camera crew and a pizza. Siobhan posts a crowd shot from a different night."],
        lose: ["Half your crowd went for the free pizza at the {rival} show. They came back with lanyards."] },
      stolenSlot: { text: "{rival} booked {venue} out from under you. Siobhan paid the booker in skateboards.",
        win: ["{venue} kept you. The booker says the skateboards were 'a lot, but no'. Siobhan sends one anyway, signed."],
        lose: ["{rival} took the {venue} slot. The booker has a new skateboard and a guilty look."] },
      festival: { text: "{venue}: {rival} headline with a halfpipe on the main stage. You're on at 2 p.m. Outplay them from the lower slot and the festival will talk about it.",
        win: ["You outplayed the headliners from the 2 p.m. slot. By evening the halfpipe has your stickers on it."],
        lose: ["{rival} close the festival with fireworks and a sponsored kickflip over the crowd. The crowd loves it. You hate that it works."] },
      loonies: { text: "{rival} are nominated against you. Their campaign has a budget. Your campaign is Rox with a megaphone.",
        win: ["You beat {rival} at the Loonies. Blaze applauds. Siobhan writes something down. It is probably your name."],
        lose: ["{rival} beat you at the Loonies. Blaze thanks his sponsors in order of spend."] },
      poach: { icon: '💸', text: "{rival} want {name}. There is sponsor money involved. There is always sponsor money involved.",
        win: ["{name} stays. Siobhan replies in four minutes: 'Understood. The offer is evergreen.'"],
        lose: ["{name} joins {rival}. Siobhan has them in pre-ripped jeans by Thursday."] },
      final: { text: "The Sad Dome, Calgary. A co-bill: {band} and {rival}. One set each. The crowd decides who headlines and who opens. Forever. The network is filming either way.",
        win: ["You headline the Sad Dome. {rival} open for you, forever. Blaze kickflips once, quietly, in the loading bay. Nobody films it."],
        lose: ["{rival} headline the Sad Dome. You open. The broadcast calls you 'the local colour'. Forever is a long time."] }
    },

    banter: {
      open: ["Blaze: \"What's up {city}! We are {rival}, presented by Shredwood!\"", "Blaze: \"Hello {city}! Make some noise! The network is recording the noise!\""],
      mid: ["Blaze kickflips on cue. The cue is a light Siobhan turns on.", "Siobhan takes a call between songs. The band waits.",
        "Dex mimes a bass solo. Nothing comes out. The crowd screams anyway.", "Brody's jawline gets its own spotlight. It is a lot of spotlight.",
        "Blaze: \"This one's about rebellion! And our new sneaker!\""],
      final: ["Blaze: \"Calgary! This is for everybody who voted in the app!\""],
      opening: ["Afterwards Siobhan hands you her card. It says 'Let's talk'. It always says that."]
    },
    openingSlot: ["Afterwards Blaze shakes your hand for the cameras. Siobhan asks who plays {instrument}. You do. She asks if you do sponsorships.",
      "After the set Siobhan offers to 'elevate your look'. Moth hides the van keys."],

    ui: {
      heatLabels: ['Sponsored', 'Tense (for the cameras)', 'Heated', 'Boiling (content)', 'Blood feud, with branding'],
      vehicleLine: 'The Mall Rats tour in a bus wrapped in a photo of their own faces. Siobhan drives it with a headset on.',
      emptyNews: 'Nothing yet. Siobhan is "workshopping the narrative".',
      emptyAlbums: 'No records yet. The network is "testing the concept with audiences".',
      pass: 'You sit this one out. {rival} post a video of the empty stage: "Where were they??"',
      finalWin: 'The Sad Dome is yours. The network edits the broadcast so {rival} look like they let you win.',
      finalLose: 'Blaze waves at you from the headliner\'s side of the stage. Siobhan is already selling the rematch.',
      solo: 'Siobhan: a solo, one-handed, still on the phone.',
      finish: '{rival} finish on a kickflip. The network cuts to an ad. Your turn.',
      crack: { breakup: ['The network cancelled them.', 'The Mall Rats were "moving in a different direction". The direction was a cooking show.'],
        rebrand: ['They relaunched.', 'Same four people, new font, new sponsor: {rival}. Siobhan calls it a soft relaunch.'],
        opener: ['They want to open for you.', 'Siobhan ran the numbers. You are the bigger draw now. There is a budget.'] }
    },
    carpet: { intro: 'The Mall Rats work the far end of the carpet, all four of them holding sponsor cans at the same angle.', wave: 'sponsor', count: 4 },
    defector: { line: "Siobhan has them in pre-ripped jeans and a sponsor cap by Thursday. They look expensive. They look sad.", look: 'stylist' },
    comments: [
      "love this!! the raw energy is so on brand for you 🔥 (Siobhan, Mall Rats)",
      "great hustle guys. dm us about a collab. we have budget. — MR team",
      "so punk!! we used to play rooms like that. on the show. in the first episode.",
      "Blaze here. real ones recognize real ones. also check out our sneaker",
      "this is giving 'authentic'. we tested that word. it tested well.",
      "the kickflip at 0:14 would elevate this. just a thought. — Siobhan",
      "you guys are an inspiration, legally speaking 🛹"
    ],
    commentsExclusive: ["Subscribed at the Drumstick tier to support the scene! Expensing it as research. — Siobhan",
      "Members-only content, love that. We have a members-only content division. Anyway."],

    // ---- The rival's forced Monday cards (career.variant: '<id>_mall_rats'). ----
    cards: [
      { id: 'rv_poach_mall_rats', type: 'drama', speaker: 'mr_siobhan', title: 'Sponsor Money for {recruit}', once: false,
        text: "A Shredwood gift box arrives addressed to {recruit}: a skateboard, an energy drink and an envelope. 'Signing bonus. Health plan. " +
          "A stylist. We see you in pre-ripped. — Siobhan.' {recruit} is holding the skateboard and looking at you.",
        choices: [
          { label: 'Match it: a loyalty bonus', hint: 'Cash from the band fund', effects: { fund: -150, mood: { recruit: 16 } },
            outcome: "You hand {recruit} an envelope with less in it and a speech with more in it. {recruit} sends Siobhan a no. She replies: 'Evergreen offer.'" },
          { label: 'Promise {recruit} a spotlight', hint: 'Their name on the poster, a song of their own', effects: { mood: { recruit: 14 }, chemistry: -2, burnout: 4 },
            outcome: "New posters, {recruit}'s name bigger, a ninety-second song built around them. {recruit} gives the skateboard to Moth's cat." },
          { label: 'Call the bluff', hint: 'Gamble: they might go',
            roll: { chance: 0.5, stat: 'chemistry', statScale: 0.01,
              success: { effects: { mood: { recruit: 6 }, buzz: 2 }, outcome: '{recruit} stays. Out of spite, mostly. The energy drink was terrible.' },
              fail: { effects: { member: { id: 'recruit', act: 'poach' } },
                outcome: "{recruit} takes the deal. The welcome photo: pre-ripped jeans, a sponsor cap, a smile they practised. You got tagged." } },
            outcome: 'You shrug and say "go, then".' }
        ] },
      { id: 'rv_crack_breakup_mall_rats', type: 'scene', speaker: 'mr_blaze', title: 'Cancelled', once: true,
        text: "The network cancelled the Mall Rats. The press release says they are 'moving in a different direction'. Blaze calls you from " +
          "the pretzel place. He is Kevin again. 'You beat us, man. Every time. The focus group saw it.'",
        choices: [
          { label: 'Invite Kevin to a basement show', hint: 'Kindness, punk style', effects: { buzz: 6, chemistry: 3, fans: 30 },
            outcome: 'Kevin comes to the Suds-O-Rama, no stylist, no mohawk. He moshes. He cries. He buys a shirt with real money.' },
          { label: 'Take a victory lap', hint: 'Buzz now, karma later', effects: { buzz: 12, fans: 40, mood: { all: -3 } },
            outcome: "Rox posts the press release with the word CANCELLED circled in Sharpie. Siobhan likes it. Then shares it. 'Growth!'" }
        ] },
      { id: 'rv_crack_rebrand_mall_rats', type: 'scene', speaker: 'mr_siobhan', title: 'A Soft Relaunch', once: true,
        text: "The Mall Rats have a new name: {rival}. New sponsor, new font, same four people. Siobhan presents the relaunch in a forty-slide deck. " +
          "Slide 31 is your band, labelled 'COMPETITOR (AUTHENTIC)'.",
        choices: [
          { label: 'Congratulate them, sincerely', hint: 'Be the bigger band', effects: { chemistry: 3, buzz: 3 },
            outcome: "You send a card. Siobhan replies with a thank-you deck. Slide 12: 'Our friends in {band}.' There's a photo of Moth's van." },
          { label: 'Keep calling them Mall Rats', hint: 'Petty, and fun', effects: { buzz: 8, mood: { all: 2 } },
            outcome: 'You call them the Mall Rats in every interview. The network sends a cease-and-desist. Rox frames it next to the others.' }
        ] },
      { id: 'rv_crack_opener_mall_rats', type: 'scene', speaker: 'mr_siobhan', title: 'Synergy?', once: true,
        text: "Siobhan calls. 'We ran the numbers. You're the bigger draw now. The Mall Rats would like to open for you. There's a budget. " +
          "There's a halfpipe. Blaze will not kickflip during your set. That's a promise we can put in writing.'",
        choices: [
          { label: "Sure. You're opening.", hint: 'Their fans become your fans', effects: { buzz: 6, fans: 30, chemistry: 2 },
            outcome: 'Blaze whoops. Dex mimes excitement. Brody checks his jaw in a cymbal. Siobhan sends a stage plot before you hang up.' },
          { label: 'No halfpipe. No cameras.', hint: 'A little payback', effects: { buzz: 10, mood: { all: 2 }, chemistry: -2 },
            outcome: "Siobhan agrees to no halfpipe. She negotiates one camera. It turns out to be a very large camera." }
        ] },
      { id: 'rv_final_eve_mall_rats', type: 'scene', speaker: 'mr_blaze', title: 'Sad Dome Eve', once: true,
        text: "This weekend: the Sad Dome, Calgary. {rival} and {band}, one night, one headliner. Blaze texts: 'Good luck bro!! (this message " +
          "was approved by the network)'. Siobhan has booked a skywriter.",
        choices: [
          { label: 'Rehearse until your hands bleed', hint: 'Sharper, more tired', effects: { chemistry: 4, burnout: 8, drumSkill: 1 },
            outcome: 'You run the set eleven times in the Suds-O-Rama. Moth nods once. Rox screams at a dryer. You are ready.' },
          { label: 'Send Kevin a pretzel', hint: 'Out-nice the brand', effects: { fund: -20, buzz: 8, mood: { all: 3 } },
            outcome: "You mail Blaze a pretzel from his old food court with a note: 'Kevin, we remember.' He posts it. Siobhan deletes it. Too late." }
        ] }
    ]
  });

  // Their label: the base's rival-only label for this rival (labels[id].rivalOnly, rival: mall_rats; 'network_nine',
  // Network Nine Music), found by rivalOnly + rival so a rival never ends up with two labels; our own only if the base has none.
  var LBS = obj(K, 'labels'), mrLabel = null;
  Object.keys(LBS).forEach(function (id) { var l = LBS[id]; if (!mrLabel && l && l.rivalOnly && l.rival === RIVAL) mrLabel = id; });
  if (!mrLabel) {
    mrLabel = 'network_nine';
    LBS.network_nine = { id: 'network_nine', name: 'Network Nine Music', rivalOnly: true, rival: RIVAL,
      blurb: 'The record arm of the TV network that built the Mall Rats on a talent show. Every album ships with a reality special.',
      rep: { name: 'Preston from the Network', blurb: 'VP of Youth Content. Headset, mood board, a focus group on speed dial.' } };
  }
  cast[RIVAL].label = mrLabel;

  // The Loonies: the Mall Rats win and thank you; you beat them and they are gracious about it (on camera).
  var AW = obj(K, 'awards');
  obj(AW, 'rivalThanks')[RIVAL] = [
    "Oh wow. First we want to thank our sponsors: Shredwood, Riot Juice, the network. And {band}, for the edge. Stay rebellious!",
    "This {category} is for everyone who voted in the app. And for {band}. You guys keep us real. Legally, you keep us relevant.",
    "Blaze (Kevin) here. Shout-out to {band} from Regina! You taught us punk. We taught it to a focus group. Love you guys.",
    "We want to thank our stylist Siobhan, who is also our manager, and our label, which is our network, and {band}, who are not ours. Yet."
  ];
  obj(AW, 'rivalLoses')[RIVAL] = [
    "The Mall Rats give you a standing ovation. On a cue. The cue is a light Siobhan turns on.",
    "Blaze shakes your hand for the cameras, then again for a different camera. Siobhan hands you her card. It says 'Let's talk'.",
    "Siobhan sends a gift basket to your table before your name is even read. The card says 'Congrats! (Pre-approved)'."
  ];

  /* ======================================================================================================================
     Monday deck (GG.content.cards), gated { band: [frost_heave], genre: [punk] } through g(). Magnitudes follow the earliest
     era in the gate (MAG_BY_ERA). Year one: early cards (maxWeek), mid (minFans), late (minWeek / weekOfYear) and repeatables.
     ====================================================================================================================== */
  var cards = list(K, 'cards');
  add(cards, [
    // ---- Week one (forced) -----------------------------------------------------------------------------------------
    { id: 'fh_week_one_council', type: 'drama', speaker: 'rox', title: 'Public Comment', forceWeek: 1, gate: g({}),
      text: "First real rehearsal under the Suds-O-Rama. Rox arrives late from a council meeting with a megaphone and a printout: " +
        "'Bylaw 2026-14. Parking.' She wants every song to be about it. Benny has two chords written down. Moth is asleep in the van.",
      choices: [
        { label: 'Every song. About parking.', hint: 'Rox ↑ · Chemistry ↑', effects: { mood: { rox: 8 }, chemistry: 2 },
          outcome: "Rox screams the bylaw number over both chords. It rhymes with nothing. It's perfect. Irma bangs on the ceiling with a mop, in time." },
        { label: 'Maybe one song about us?', hint: 'Rox ↓ · Benny ↑', effects: { mood: { rox: -5, benny: 3 } },
          outcome: "Rox considers it. 'Fine. It's about how we got a parking ticket outside council.' Benny nods. From the van, Moth honks once." },
        { label: 'Only if the chorus is two chords', hint: 'Benny ↑↑ · Chemistry ↑', effects: { mood: { benny: 8 }, chemistry: 3 },
          outcome: "Benny weeps with joy. Rox agrees, on the condition that chord one is 'outrage' and chord two is 'more outrage'. Deal." }
      ] },

    // ---- Q2: Rox for City Council (chain 'council', steps 1-6) --------------------------------------------------------
    { id: 'fh_council_1_filing', type: 'drama', speaker: 'rox', title: 'Rox for Ward 6', chain: 'council', step: 1, weight: 3,
      gate: g({ era: GLS, minWeek: 5 }),
      text: "Rox has nomination papers for Ward 6, the ward with the Suds-O-Rama in it. She needs twenty-five signatures and a $100 deposit. " +
        "The incumbent, Councillor Garth Pomeroy, has held the seat eighteen years by never answering his phone.",
      choices: [
        { label: 'Pay the deposit ($100)', hint: 'The band runs the campaign', effects: { fund: -100, mood: { rox: 10 }, flags: { councilPlan: 'band' }, chain: NEXT('council', 2, 2) },
          outcome: "Rox signs the form with a Sharpie and the clerk's pen at the same time. The band is a campaign now. Benny asks if campaigns need a third chord. No." },
        { label: 'Signatures at the Suds-O-Rama', hint: 'The laundromat runs the campaign', effects: { chemistry: 3, mood: { rox: 6 }, flags: { councilPlan: 'suds' }, chain: NEXT('council', 2, 2) },
          outcome: 'Delphine signs first, then works the whole Thursday-night wash crowd between spin cycles. Twenty-five names, one lint smudge each.' },
        { label: "Rox. You're in a punk band.", hint: 'Rox ↓↓', effects: { mood: { rox: -10, benny: 3 }, flags: council('never'), chain: END('council') },
          outcome: "Rox tears up the papers and screams the pieces into the air vent. For a month every song is about 'the system that stopped her'. You are the system." }
      ] },
    { id: 'fh_council_2_band', type: 'drama', speaker: 'benny', title: 'Campaign HQ', chain: 'council', step: 2,
      gate: g({ era: GLS, flagEquals: { councilPlan: 'band' } }),
      text: "Campaign HQ is the basement. Benny has hand-painted forty lawn signs: ROX. WARD 6. NO. Moth says the van can be a campaign vehicle " +
        "'if nobody touches the laundry'. Irma wants to know why her ceiling says VOTE.",
      choices: [
        { label: 'Wrap the van: ROX FOR WARD 6', hint: '−$80 · Buzz ↑ · Moth ↓', effects: { fund: -80, buzz: 6, mood: { moth: -4 }, chain: NEXT('council', 3, 2) },
          outcome: 'Moth drives the Pothole past council chambers eleven times a day. Pomeroy files a complaint about "a van with opinions". Buzz.' },
        { label: 'Door-knock the whole ward', hint: 'Fans ↑ · Burnout ↑', effects: { burnout: 6, fans: 10, chain: NEXT('council', 3, 2) },
          outcome: 'Three hundred doors. Two hundred already know Rox from council meetings. Sixty are fans now. Forty are afraid of her.' },
        { label: 'A two-chord campaign song', hint: 'Benny ↑ · Buzz ↑ · a rally this weekend', effects: { mood: { benny: 8 }, buzz: 4, book: 'city_hall_steps', chain: NEXT('council', 3, 2) },
          outcome: "'Ward Six Forever' is ninety seconds long. It debuts Saturday at a pothole rally on the city hall steps. It is not, strictly, about policy." }
      ] },
    { id: 'fh_council_2_suds', type: 'scene', speaker: 'fh_irma', title: 'Suds-O-Rama HQ', chain: 'council', step: 2,
      gate: g({ era: GLS, flagEquals: { councilPlan: 'suds' } }),
      text: "The Suds-O-Rama is campaign HQ now. Irma charges $2 a load and $5 a lawn sign. Delphine runs the phone tree from machine 6. " +
        "The dryers have been renamed Ward 6 Dryer 1 through Ward 6 Dryer 9.",
      choices: [
        { label: 'A laundromat town hall', hint: 'Chemistry ↑ · Fans ↑', effects: { chemistry: 4, fans: 8, chain: NEXT('council', 3, 2) },
          outcome: 'Forty voters, two debates about bus routes and one about fabric softener. Rox wins all three. The fabric softener one got heated.' },
        { label: 'A flyer in every dryer', hint: '−$40 · Buzz ↑', effects: { fund: -40, buzz: 5, chain: NEXT('council', 3, 2) },
          outcome: "Every load in the ward comes out warm, clean and holding a flyer. Pomeroy's own socks come out endorsing Rox." },
        { label: 'Let Irma run the campaign', hint: 'Rox ↓ · Chemistry ↑', effects: { mood: { rox: -4 }, chemistry: 3, chain: NEXT('council', 3, 2) },
          outcome: 'Irma sets a budget, a curfew and a strict no-screaming-after-nine policy. Rox obeys two of them.' }
      ] },
    { id: 'fh_council_3_debate', type: 'drama', speaker: 'rox', title: 'The Ward 6 Debate', chain: 'council', step: 3,
      gate: g({ era: GLS, flags: ['councilPlan'] }),
      text: "The candidates' debate, in the rec-centre gym. Pomeroy brought cue cards and a grandson. Rox brought a megaphone 'in case the " +
        "microphone is political'. Janice from the Leader-Pest is live-posting. So is Delphine.",
      choices: [
        { label: 'Real policy. Potholes.', hint: 'Gamble: win the gym over',
          outcome: 'Rox unfolds a pothole map the size of a bedsheet.',
          roll: { chance: 0.5, stat: 'chemistry', statScale: 0.01,
            success: { effects: { buzz: 6, flags: { councilDebate: 'policy', councilOdds: 'good' }, chain: NEXT('council', 4, 2) },
              outcome: "Colour-coded by how angry each pothole makes her. The gym applauds. Pomeroy's grandson applauds." },
            fail: { effects: { mood: { rox: -6 }, flags: { councilDebate: 'policy', councilOdds: 'bad' }, chain: NEXT('council', 4, 2) },
              outcome: 'She reads all 212 potholes aloud. By pothole 90 the gym has emptied. Janice stays. Janice has to.' } } },
        { label: 'Heckle him back', hint: 'Buzz ↑ · votes ↓', effects: { buzz: 8, mood: { rox: 6 }, flags: { councilDebate: 'heckle', councilOdds: 'bad' }, chain: NEXT('council', 4, 2) },
          outcome: "'POINT OF ORDER!' she screams, from the podium, at herself. It is the best heckle in Ward 6 history. It is not a winning strategy." },
        { label: 'Stage dive off the podium', hint: 'Gamble: will the gym catch her?',
          outcome: "Rox climbs onto the podium. The moderator says 'please don't'.",
          roll: { chance: 0.55, stat: 'buzz', statScale: 0.005,
            success: { effects: { fans: 15, buzz: 10, flags: { councilDebate: 'dive', councilOdds: 'good', roxDive: 'debate' }, chain: NEXT('council', 4, 2) },
              outcome: 'The front row catches her: nine seniors and a lacrosse team. It makes the news. A move is born.' },
            fail: { effects: { burnout: 6, mood: { rox: -4 }, flags: { councilDebate: 'dive', councilOdds: 'bad', roxDive: 'debate' }, chain: NEXT('council', 4, 2) },
              outcome: 'Nobody catches her. She lands in the snack table. Pomeroy offers her a Nanaimo bar. She takes it. Worst night of her life.' } } }
      ] },
    { id: 'fh_council_4_flyer', type: 'scene', speaker: 'fh_pomeroy', title: 'The Attack Flyer', chain: 'council', step: 4,
      gate: g({ era: GLS, flags: ['councilDebate'] }),
      text: "Pomeroy's flyer lands in every mailbox in Ward 6: 'ROX DELORME IS BANNED FROM EVERY WAREHOUSE CLUB IN THE PROVINCE. WHAT IS " +
        "SHE HIDING?' It's all true. She isn't hiding it. She has it tattooed.",
      choices: [
        { label: "Own it: 'Banned for justice'", hint: 'Buzz ↑ · odds ↑', effects: { buzz: 6, mood: { rox: 6 }, flags: { councilOdds: 'good' }, chain: NEXT('council', 5, 2) },
          outcome: "Rox prints her own flyer: 'YES. ASK ME WHY.' Four hundred people ask. The answer involves a sample tray and a principle." },
        { label: 'Benefit gig at the Suds-O-Rama', hint: '+$60 · Fans ↑ · Burnout ↑', effects: { fund: 60, fans: 12, burnout: 5, chain: NEXT('council', 5, 2) },
          outcome: 'Forty people, nine dryers, one very long extension cord. You raise $60 and the humidity.' },
        { label: 'Rox drops out. The band needs her.', hint: 'Rox ↓↓ · Chemistry ↑', effects: { mood: { rox: -12 }, chemistry: 4, flags: council('withdrew'), chain: END('council') },
          outcome: 'Rox withdraws at a press conference held in the van. Moth charges admission. Pomeroy mails a thank-you card. Rox frames it upside down.' }
      ] },
    { id: 'fh_council_5_good', type: 'drama', speaker: 'rox', title: 'Election Night', chain: 'council', step: 5,
      gate: g({ era: GLS, flagEquals: { councilOdds: 'good' } }),
      text: "Election night. The Suds-O-Rama is packed: every dryer running for warmth, Delphine on the results page, Irma selling pop. " +
        "The polls say Ward 6 is close. The polls are Janice, and she is nervous.",
      choices: [
        { label: 'Watch the count come in', hint: 'Gamble: the voters decide',
          outcome: 'Delphine refreshes the page every nine seconds.',
          roll: { chance: 0.65, stat: 'buzz', statScale: 0.004,
            success: { effects: { flags: { councilResult: 'won' }, chain: NEXT('council', 6, 1) },
              outcome: 'Poll by poll, Ward 6 turns. At 11:52 the screen says DELORME. Rox screams so loud the dryer doors pop open.' },
            fail: { effects: { flags: { councilResult: 'lost' }, chain: NEXT('council', 6, 1) },
              outcome: 'Pomeroy by forty-one votes. Rox reads the number twice, then climbs onto a dryer.' } } },
        { label: 'Play a set before the count', hint: 'Gamble: a jinx or a legend',
          outcome: 'Benny plugs in next to the change machine.',
          roll: { chance: 0.5, stat: 'chemistry', statScale: 0.005,
            success: { effects: { fans: 20, flags: { councilResult: 'tie' }, chain: NEXT('council', 6, 1) },
              outcome: 'Mid-set the count comes in: a perfect tie. By law it goes to a draw. Rox takes it as a yes and stage-dives into the lint bin.' },
            fail: { effects: { buzz: 5, flags: { councilResult: 'lost' }, chain: NEXT('council', 6, 1) },
              outcome: 'The set is incredible. The count is not. Pomeroy by forty-one.' } } }
      ] },
    { id: 'fh_council_5_bad', type: 'drama', speaker: 'rox', title: 'Election Night', chain: 'council', step: 5,
      gate: g({ era: GLS, flagEquals: { councilOdds: 'bad' } }),
      text: "Election night at the Suds-O-Rama. The mood is 'underdog'. Irma baked a cake that says ROX, in case, and a second cake that " +
        "says NEXT TIME, in case. Moth has the van running outside. Also in case.",
      choices: [
        { label: 'Watch the count come in', hint: 'Gamble: long odds',
          outcome: 'Delphine refreshes the page every nine seconds.',
          roll: { chance: 0.35, stat: 'buzz', statScale: 0.004,
            success: { effects: { flags: { councilResult: 'won' }, chain: NEXT('council', 6, 1) },
              outcome: 'Nobody believed it, Janice least of all. DELORME, by nine votes. Irma cuts the wrong cake first.' },
            fail: { effects: { flags: { councilResult: 'lost' }, chain: NEXT('council', 6, 1) },
              outcome: 'Pomeroy by forty-one votes. Irma quietly slides the NEXT TIME cake forward.' } } },
        { label: 'Demand a recount (at 8 p.m.)', hint: 'Gamble: nobody has counted yet',
          outcome: 'Rox calls city hall. The clerk says they have not counted once yet.',
          roll: { chance: 0.4,
            success: { effects: { buzz: 6, flags: { councilResult: 'tie' }, chain: NEXT('council', 6, 1) },
              outcome: 'By midnight the count is a perfect tie. The clerk blames Rox, somehow. By law it goes to a draw.' },
            fail: { effects: { mood: { rox: -5 }, flags: { councilResult: 'lost' }, chain: NEXT('council', 6, 1) },
              outcome: 'The count and the recount agree: Pomeroy by forty-one. The clerk has never been so sure of anything.' } } }
      ] },
    { id: 'fh_council_6_won', type: 'fame', speaker: 'fh_janice', title: 'Councillor Delorme', chain: 'council', step: 6,
      gate: g({ era: GLS, flagEquals: { councilResult: 'won' } }),
      text: "Leader-Pest headline: 'PUNK TAKES WARD 6; CHAMBERS BRACES'. At her first meeting Councillor Delorme heckles from her own chair, " +
        "then rules herself out of order. The mayor asks if she will keep screaming. She screams 'YES'.",
      choices: [
        { label: 'Councillor by day, punk by night', hint: 'Buzz ↑ · Rox ↑ · Burnout ↑', effects: { buzz: 10, mood: { rox: 12 }, burnout: 6, flags: council('won'), chain: END('council') },
          outcome: 'Rox fixes forty potholes in her first month and writes a song about each one. The setlist is now municipal infrastructure.' },
        { label: 'Name a bylaw after the band', hint: 'Fans ↑ · Chemistry ↑', effects: { fans: 20, chemistry: 4, flags: council('won'), chain: END('council') },
          outcome: "Bylaw 2026-77: 'Frost Heave may rehearse under the Suds-O-Rama after 9 p.m.' Irma is outvoted by city council. Irma is livid." },
        { label: 'Fix the pothole out front', hint: 'Everyone ↑', effects: { chemistry: 6, mood: { all: 4 }, flags: council('won'), chain: END('council') },
          outcome: 'The pothole outside the Suds-O-Rama is filled on a Tuesday. The band holds a funeral for it. Moth drives over the patch twice, out of respect.' }
      ] },
    { id: 'fh_council_6_lost', type: 'drama', speaker: 'rox', title: 'Concession Stand', chain: 'council', step: 6,
      gate: g({ era: GLS, flagEquals: { councilResult: 'lost' } }),
      text: "Pomeroy by forty-one votes. Rox's concession speech, delivered from the top of a dryer, is a new song. It has two chords. " +
        "Benny cries. Janice calls it 'the most sincere thing said in Ward 6 since 1987'.",
      choices: [
        { label: 'Record the concession speech', hint: 'Buzz ↑ · Rox ↑', effects: { buzz: 8, mood: { rox: 6 }, flags: council('lost'), chain: END('council') },
          outcome: "'Concession Stand' is ninety seconds long and gets more plays than Pomeroy got votes. He hums it in council. He denies it." },
        { label: 'Run again in four years', hint: 'Rox ↑↑ · Chemistry ↑', effects: { mood: { rox: 10 }, chemistry: 3, flags: council('lost'), chain: END('council') },
          outcome: "Rox files papers for the next election that same night. The clerk says the window opens in four years. Rox says 'I'll wait here'." },
        { label: "Crash Pomeroy's victory party", hint: 'Gamble: a scene, or a scene',
          outcome: 'Rox grabs the megaphone and the van keys. Moth takes the van keys back.',
          roll: { chance: 0.5,
            success: { effects: { buzz: 10, fans: 12, flags: council('lost'), chain: END('council') },
              outcome: "She screams one verse at the Legion, leaves. Pomeroy's donors buy shirts." },
            fail: { effects: { burnout: 6, mood: { rox: -6 }, flags: council('lost'), chain: END('council') },
              outcome: 'Security walks her out past the cheese tray. She takes the cheese tray. It is a small victory.' } } }
      ] },
    { id: 'fh_council_6_tie', type: 'weird', speaker: 'fh_janice', title: 'Drawn From a Toque', chain: 'council', step: 6,
      gate: g({ era: GLS, flagEquals: { councilResult: 'tie' } }),
      text: "A perfect tie in Ward 6. By law the winner is drawn by lot. The clerk puts both names in a toque at council chambers. " +
        "Rox asks to use her own toque. Denied. Moth has the van running. Just in case.",
      choices: [
        { label: 'Let the toque decide', hint: 'Gamble: fifty-fifty, literally',
          outcome: 'The clerk rolls up her sleeve.',
          roll: { chance: 0.5,
            success: { effects: { buzz: 12, mood: { rox: 12 }, flags: council('won'), chain: END('council') },
              outcome: 'The clerk draws DELORME. Rox kisses the toque. The toque is entered into the minutes.' },
            fail: { effects: { mood: { rox: -8 }, chemistry: 4, flags: council('lost'), chain: END('council') },
              outcome: 'POMEROY. Rox demands best of three. The clerk says democracy is not a hockey series. Rox disagrees, at length.' } } },
        { label: 'Offer to share the seat', hint: 'Buzz ↑ · Chemistry ↑', effects: { buzz: 8, chemistry: 4, flags: council('tie'), chain: END('council') },
          outcome: 'Rox proposes job-sharing Ward 6: Pomeroy on weekdays, her on weekends. Council tables it. It is still on the table.' }
      ] },

    // ---- Q3: the squat anthem (chain 'squat', Signed era; the World payoff: tour package eu_squat_anthem) ---------------
    { id: 'fh_squat_1_berlin', type: 'weird', speaker: 'benny', title: 'An Email From Berlin', chain: 'squat', step: 1, weight: 2,
      gate: g({ era: S, flags: ['council'] }),
      text: "An email from Berlin, all capitals: a squat called Haus Kartoffelkeller has adopted Frost Heave's council song as its anthem. " +
        "Two thousand people sang it at an eviction standoff. Wrong words. Right chords. Both of them.",
      choices: [
        { label: 'Mail them a box of shirts', hint: '−$120 · Buzz ↑', effects: { fund: -120, buzz: 6, flags: { squatPlan: 'shirts' }, chain: NEXT('squat', 2, 3) },
          outcome: 'A box of shirts goes to Berlin. Customs opens it, reads one shirt, and waves the rest through out of respect.' },
        { label: 'Record a German version', hint: 'Benny ↑ · Chemistry ↑', effects: { mood: { benny: 8 }, chemistry: 3, flags: { squatPlan: 'german' }, chain: NEXT('squat', 2, 3) },
          outcome: "Rox learns the German for 'point of order'. Benny points out that chords are the same in every language. There are two." },
        { label: "Punk doesn't export", hint: 'Rox ↓', effects: { mood: { rox: -6 }, flags: squat('no'), chain: END('squat') },
          outcome: 'You leave the email unanswered. In Berlin they keep singing it anyway, louder, out of spite. Very punk of them.' }
      ] },
    { id: 'fh_squat_2_klaus', type: 'scene', speaker: 'klaus', title: 'Klaus Calls', chain: 'squat', step: 2,
      gate: g({ era: S, flags: ['squatPlan'] }),
      text: "A phone video from Berlin: five thousand people singing the anthem in the rain outside the squat. Then a call from Klaus at " +
        "Wackelstein Open Air. Seventy-five thousand metalheads, and this summer, one punk tent. 'For you. Clean shoes forbidden.'",
      choices: [
        { label: 'Tell Klaus yes', hint: 'Buzz ↑', effects: { buzz: 8, flags: { squatCall: 'tent' }, chain: NEXT('squat', 3, 2) },
          outcome: "Klaus says 'good' and hangs up. It is the warmest thing he has ever said. Moth asks if the van can come. It cannot swim." },
        { label: 'Ask for the main stage', hint: 'Gamble: Klaus has a clipboard',
          outcome: 'Rox takes the phone.',
          roll: { chance: 0.3,
            success: { effects: { buzz: 12, flags: { squatCall: 'main' }, chain: NEXT('squat', 3, 2) },
              outcome: "Klaus is silent for nine seconds. 'The punk tent is now a main stage.' He moves a metal band into a field." },
            fail: { effects: { mood: { rox: -4 }, flags: { squatCall: 'tent' }, chain: NEXT('squat', 3, 2) },
              outcome: "'No.' Klaus hangs up. He calls back. 'The tent. Take the tent.' You take the tent." } } },
        { label: "We can't afford Germany", hint: 'Everyone ↓', effects: { mood: { all: -4 }, flags: squat('no'), chain: END('squat') },
          outcome: "Klaus says 'next year' in a tone that means 'never'. Berlin sings it without you. Benny watches the video every night." }
      ] },
    { id: 'fh_squat_3_offer', type: 'money', speaker: 'mr_siobhan', title: 'Siobhan Wants the Anthem', chain: 'squat', step: 3,
      gate: g({ era: S, flags: ['squatCall'] }),
      text: "Siobhan from the Mall Rats has seen the Berlin video. She wants to buy the anthem outright for a Shredwood skateboard ad: " +
        "'$1,200 and we make it sound expensive.' Blaze is already learning the words. The wrong ones.",
      choices: [
        { label: "No. It's Berlin's song.", hint: 'Chemistry ↑ · Buzz ↑ · Wackelstein on', effects: { chemistry: 6, buzz: 8, flags: squat('berlin'), chain: END('squat') },
          outcome: "Siobhan says 'noted' and writes on her clipboard. In Berlin they hear you said no. They sing it louder. Wackelstein is on." },
        { label: 'Sell it ($1,200)', hint: '+$1,200 · Wackelstein will hear', effects: { fund: 1200, mood: { rox: -8 }, flags: squat('sold'), chain: END('squat') },
          outcome: "Blaze kickflips to your chorus on national TV. Klaus emails one word: 'NEIN.' The punk tent goes to a ska band." },
        { label: 'Tell her to pay the squat', hint: 'Fans ↑ · Buzz ↑ · Wackelstein on', effects: { fans: 150, buzz: 10, flags: squat('berlin'), chain: END('squat') },
          outcome: 'You tell Siobhan to send her $1,200 to Haus Kartoffelkeller. She does, for the optics. Berlin names a couch after you.' }
      ] },

    // ---- The garage era: the basement under the Suds-O-Rama (early cards, maxWeek) ---------------------------------------
    { id: 'fh_irma_ceiling', type: 'scene', speaker: 'fh_irma', title: 'Notes From Upstairs', weight: 2, gate: g({ minWeek: 2, maxWeek: 12 }),
      text: "Mid-song, a mop handle thumps the ceiling three times. Irma comes down the stairs with a notepad. She has been listening " +
        "through the floor for a week. 'The bridge drags. The singer is flat. The drummer is fine. I charge $40 a month.'",
      choices: [
        { label: 'Take the notes', hint: 'Skill ↑', effects: { skill: { all: 1 }, mood: { rox: -4 } },
          outcome: 'You fix the bridge. Rox is not flat, she says, she is "angry in a different key". Irma writes "better" on the notepad.' },
        { label: 'Pay rent early ($40)', hint: '−$40 · Chemistry ↑', effects: { fund: -40, chemistry: 3 },
          outcome: 'Irma folds the twenties into her apron and goes back upstairs. The mop stays quiet for a whole week.' },
        { label: 'Invite Irma to sing', hint: 'Gamble: a new fan, or a new critic',
          outcome: 'Rox hands Irma the megaphone.',
          roll: { chance: 0.5,
            success: { effects: { chemistry: 5, fans: 4 }, outcome: 'Irma screams one line about the price of quarters. It is terrifying. She tells her whole bingo group.' },
            fail: { effects: { burnout: 4 }, outcome: 'Irma sings the national anthem, slowly, in full. Nobody knows how to stop it. Nobody tries.' } } }
      ] },
    { id: 'fh_dryer_tempo', type: 'weird', speaker: 'moth', title: 'Dryer Number Four', weight: 2, gate: g({ minWeek: 2, maxWeek: 14 }),
      text: "Upstairs, dryer number four thumps at exactly 190 beats per minute when it has sneakers in it. Moth has noticed. " +
        "She wants to tune the whole band to dryer four. Rox wants to know who owns the sneakers.",
      choices: [
        { label: 'Rehearse to dryer four', hint: 'Your chops ↑', effects: { drumSkill: 1, chemistry: 2 },
          outcome: 'Three hours locked to a load of sneakers. Your eighth notes have never been tighter. The sneakers are very clean.' },
        { label: 'Buy the sneakers ($25)', hint: '−$25 · Moth ↑', effects: { fund: -25, mood: { moth: 6 } },
          outcome: 'The sneakers now live in the basement and go in the dryer before every rehearsal. They are a band member, sort of.' },
        { label: 'Use a real metronome', hint: 'Moth ↓', effects: { mood: { moth: -4 }, skill: { all: 1 } },
          outcome: 'The metronome is fine. Moth says it has no soul. She is not wrong. She keeps tapping at dryer speed anyway.' }
      ] },
    { id: 'fh_benny_third_chord', type: 'drama', speaker: 'benny', title: 'The Chord Chart', gate: g({ minWeek: 3, maxWeek: 16 }),
      text: "Somebody left a chord chart for G major taped to Benny's amp. Benny has not touched his guitar in an hour. " +
        "He is staring at it the way people stare at a snake. 'Who,' he says. 'Who did this.'",
      choices: [
        { label: 'It was a joke, Benny', hint: 'Benny ↑', effects: { mood: { benny: 6 }, chemistry: 2 },
          outcome: 'Benny burns the chart in a coffee can. Moth brings marshmallows. It becomes a small, weird, lovely ceremony.' },
        { label: 'Just try it once', hint: 'Gamble: growth or a meltdown',
          outcome: 'Benny puts one finger on the third fret. The basement goes silent.',
          roll: { chance: 0.25, stat: 'chemistry', statScale: 0.005,
            success: { effects: { skill: { benny: 2 }, mood: { benny: -5 } }, outcome: 'It works. It sounds good. Benny unplugs and walks around the block four times.' },
            fail: { effects: { mood: { benny: -12 }, burnout: 4 }, outcome: 'He cannot do it. He will not do it. He writes a manifesto instead. It is two pages.' } } },
        { label: 'Frame it as a warning', hint: 'Buzz ↑', effects: { buzz: 3, mood: { benny: 3 } },
          outcome: 'The chart goes on the wall under a sign: DO NOT. Fans ask about it at every show. Benny tells them. At length.' }
      ] },
    { id: 'fh_moth_permission', type: 'drama', speaker: 'moth', title: 'Permission to Enter', weight: 2, gate: g({ minWeek: 2, maxWeek: 12 }),
      text: "The cymbals are in the van. The van is Moth's apartment. Moth is asleep in it, and there is a sign on the side door: " +
        "KNOCK. WAIT. KNOCK AGAIN. It is ten minutes to rehearsal.",
      choices: [
        { label: 'Knock. Wait. Knock again.', hint: 'Moth ↑', effects: { mood: { moth: 8 } },
          outcome: 'Moth opens the door in a housecoat, hands you the cymbals and a cup of tea, and closes the door. It was a lovely visit.' },
        { label: 'Rehearse without cymbals', hint: 'Chemistry ↑ · Skill ↑', effects: { chemistry: 2, drumSkill: 1 },
          outcome: 'The band plays the whole set on the hi-hat. It is very punk. Rox says crashes are "a bourgeois luxury" and means it.' },
        { label: 'Climb in the window', hint: 'Moth ↓↓', effects: { mood: { moth: -10 }, burnout: 3 },
          outcome: 'You land in her sock drawer. It is also her kitchen. Moth does not speak to you until Thursday. She changes the locks. On a van.' }
      ] },
    { id: 'fh_first_flyer', type: 'money', speaker: 'rox', title: 'The Library Photocopier', weight: 2, gate: g({ minWeek: 2, maxWeek: 10 }),
      text: "Rox wants four hundred flyers for the first show, photocopied at the central library at ten cents a page. Her design is the " +
        "council chamber, on fire, with the band's name in the smoke. The librarian is looking at it very carefully.",
      choices: [
        { label: 'Print all 400 ($40)', hint: '−$40 · Buzz ↑', effects: { fund: -40, buzz: 5 },
          outcome: 'Four hundred flyers on every pole on Albert Street. The librarian keeps one. She comes to the show.' },
        { label: 'Tone down the fire', hint: 'Rox ↓ · Fans ↑', effects: { mood: { rox: -5 }, fans: 6 },
          outcome: 'The chamber is now merely smouldering. It is still the best flyer in Regina. Six people come because of it.' },
        { label: 'Hand-draw them all', hint: 'Burnout ↑ · Chemistry ↑', effects: { burnout: 6, chemistry: 4 },
          outcome: 'Four people, four nights, four hundred flyers. Benny draws his with two lines each. They are somehow the best ones.' }
      ] },
    { id: 'fh_quarter_jar', type: 'money', speaker: 'fh_irma', title: 'The Quarter Jar', gate: g({ minWeek: 2, maxWeek: 16 }),
      text: "The band fund is a pickle jar of quarters from the Suds-O-Rama change machine: tips, found money, and one Rox 'liberated' " +
        "from a parking meter as a protest. Irma has noticed the jar. Irma owns the change machine.",
      choices: [
        { label: 'Give Irma her cut', hint: '−$20 · Chemistry ↑', effects: { fund: -20, chemistry: 3 },
          outcome: 'Irma counts out eighty quarters, bites one, and leaves the rest. It is the most respect she has ever shown you.' },
        { label: 'Roll them and deposit', hint: '+$45', effects: { fund: 45, burnout: 3 },
          outcome: 'Two hours rolling quarters on the basement floor. The bank teller asks if you robbed a laundromat. Technically no.' },
        { label: 'Keep the protest quarter', hint: 'Rox ↑', effects: { mood: { rox: 6 } },
          outcome: 'Rox glues it to her guitar. It is the only thing on the guitar that is not a sticker about potholes.' }
      ] },
    { id: 'fh_basement_flood', type: 'weird', speaker: 'fh_irma', title: 'Machine 7 Overflows', gate: g({ minWeek: 6, maxWeek: 16 }),
      text: "Washer 7 upstairs has overflowed. Two centimetres of soapy water are spreading across the basement toward the extension cord " +
        "that powers everything. Rox is standing in it, still singing. Moth has already gone for the mop.",
      choices: [
        { label: 'Unplug everything. Now.', hint: 'Burnout ↑ · Chemistry ↑', effects: { burnout: 5, chemistry: 3 },
          outcome: 'You save the amps, the PA and possibly Rox. The basement smells like Spring Meadow for a month. It is an improvement.' },
        { label: 'Put the gear on the dryers', hint: '−$30 · Moth ↑', effects: { fund: -30, mood: { moth: 5 } },
          outcome: 'The amps spend the night on top of the dryers upstairs. Irma charges storage. Moth builds a shelf out of a pallet.' },
        { label: 'Film it. Soap-core.', hint: 'Gamble: a genre, or a zap',
          outcome: 'Benny hits record.',
          roll: { chance: 0.5,
            success: { effects: { buzz: 8, fans: 10 }, outcome: 'The clip of a punk band playing ankle-deep in suds goes around Regina. Someone coins "soap-core". It sticks.' },
            fail: { effects: { burnout: 6, mood: { benny: -4 } }, outcome: "A spark, a pop, a smell. Benny's pedal is gone. He says he never needed a pedal. He did." } } }
      ] },
    { id: 'fh_folding_duty', type: 'drama', speaker: 'rox', title: 'Part of the Rent', gate: g({ minWeek: 2, maxWeek: 12 }),
      text: "Part of the rent is folding. Irma has left three baskets of towels at the bottom of the basement stairs. Rox refuses to fold " +
        "'on principle'. Nobody knows which principle. Benny is already folding. Badly.",
      choices: [
        { label: 'Everybody folds', hint: 'Chemistry ↑ · Rox ↓', effects: { chemistry: 4, mood: { rox: -4 } },
          outcome: 'Forty towels, one hour, one argument about corners. Rox folds hers into tiny fists. Irma says it is acceptable.' },
        { label: 'You fold. Alone.', hint: 'Burnout ↑ · Everyone ↑', effects: { burnout: 5, mood: { all: 3 } },
          outcome: 'You fold every towel while the band rehearses without you. It is weirdly relaxing. Moth brings you a clean one.' },
        { label: 'Pay Irma $20 instead', hint: '−$20 · Rox ↑', effects: { fund: -20, mood: { rox: 5 } },
          outcome: 'Irma takes the money and says principles are expensive. Rox agrees. Rox says that is the whole point.' }
      ] },
    { id: 'fh_first_zine', type: 'fame', speaker: 'benny', title: 'The First Zine', gate: g({ minWeek: 2, maxWeek: 16, minFans: 15 }),
      text: "A zine from the university called Slush Pile has reviewed your first show. The review is two sentences long. The second " +
        "sentence is 'Two chords, no mercy.' Benny has read it forty times. He wants it on a shirt.",
      choices: [
        { label: 'Put it on a shirt', hint: '−$50 · Benny ↑ · Buzz ↑', effects: { fund: -50, mood: { benny: 8 }, buzz: 4 },
          outcome: 'TWO CHORDS, NO MERCY, in white, on black. Benny wears it every day. It is the band\'s first bestseller.' },
        { label: 'Write back to the zine', hint: 'Fans ↑', effects: { fans: 8, chemistry: 2 },
          outcome: 'Rox writes a letter to the editor. It is about council. They print it anyway. Eight new people come to the next show.' },
        { label: 'Photocopy it everywhere', hint: 'Buzz ↑ · Burnout ↑', effects: { buzz: 6, burnout: 4 },
          outcome: 'The two sentences end up on every bulletin board downtown. Slush Pile\'s circulation doubles, to sixty.' }
      ] },

    // ---- Evergreen: garage through Signed (GLS; garage magnitudes) --------------------------------------------------------
    { id: 'fh_rox_megabulk', type: 'drama', speaker: 'rox', title: 'Banned From MegaBulk', gate: g({ era: GLS }),
      text: "The band needs 200 hot dogs for a benefit show. Only MegaBulk sells hot dogs by the pallet. Rox is banned from every MegaBulk " +
        "in the province over a free-sample incident she calls 'a matter of principle'. She wants to go in anyway. In disguise.",
      choices: [
        { label: 'Rox in a disguise', hint: 'Gamble: a fake moustache',
          outcome: 'Rox puts on a fake moustache and one of Moth\'s hoodies.',
          roll: { chance: 0.4,
            success: { effects: { fund: 40, mood: { rox: 8 } }, outcome: 'She gets in, gets the hot dogs, and gets out. She eats one free sample on the way, on principle.' },
            fail: { effects: { mood: { rox: -6 }, burnout: 3 }, outcome: 'The greeter recognizes her at the door, moustache and all. There is a photo of her by the till.' } } },
        { label: 'Benny goes in alone', hint: 'Benny ↑ · Chemistry ↑', effects: { mood: { benny: 5 }, chemistry: 3 },
          outcome: 'Benny comes back with the hot dogs and a membership card. He considers the card "a second chord of the wallet".' },
        { label: 'Cheaper: the corner store', hint: '−$60', effects: { fund: -60 },
          outcome: 'The corner store sells hot dogs in eights. It takes twenty-five trips. The owner starts calling you "the hot dog people".' }
      ] },
    { id: 'fh_rox_minutes', type: 'drama', speaker: 'rox', title: 'Reading of the Minutes', once: false, cooldown: 10, gate: g({ era: GLS }),
      text: "Rox opens rehearsal by reading the minutes of last night's council meeting aloud, in full, with commentary. It has been forty minutes. " +
        "Benny has tuned twice. Moth has fallen asleep standing up.",
      choices: [
        { label: 'Let her finish', hint: 'Rox ↑ · Burnout ↑', effects: { mood: { rox: 8 }, burnout: 4 },
          outcome: 'Item 14 is a new snow-route bylaw. Rox writes a song about it on the spot. It is the best thing she has written all month.' },
        { label: 'Put the minutes to music', hint: 'Chemistry ↑ · Skill ↑', effects: { chemistry: 3, skill: { all: 1 } },
          outcome: 'Benny plays chord one under the old business and chord two under the new business. It works terrifyingly well.' },
        { label: "Motion to adjourn", hint: 'Rox ↓', effects: { mood: { rox: -5 }, drumSkill: 1 },
          outcome: 'You count in over her. She keeps reading through the first song. You tried.' }
      ] },
    { id: 'fh_rox_heckle_gig', type: 'scene', speaker: 'rox', title: 'A Councillor in the Crowd', gate: g({ era: GLS, minFans: 40 }),
      text: "A city councillor (not Pomeroy, a different one, Ward 3) is at your show with his teenage daughter. He's wearing earplugs and a " +
        "polite face. Rox has spotted him. Rox has a microphone.",
      choices: [
        { label: 'Dedicate a song to him', hint: 'Buzz ↑ · Fans ↑', effects: { buzz: 6, fans: 10 },
          outcome: "'This one's for Ward 3 and his position on transit fares!' The daughter screams along. The councillor claps on one and three." },
        { label: 'Leave him alone. His kid is here.', hint: 'Chemistry ↑ · Rox ↓', effects: { chemistry: 4, mood: { rox: -5 } },
          outcome: 'Rox holds it in for a whole set. Afterwards she hands him a pamphlet. It is eleven pages. He takes it.' },
        { label: 'Invite him on stage', hint: 'Gamble: politics is theatre',
          outcome: 'Rox hands him the megaphone.',
          roll: { chance: 0.5, stat: 'buzz', statScale: 0.005,
            success: { effects: { buzz: 10, fans: 15 }, outcome: "He screams 'PROPERTY TAX!' at the top of his lungs. The room goes wild. He is re-elected in a landslide." },
            fail: { effects: { buzz: -4, mood: { rox: -4 } }, outcome: 'He reads a prepared statement. It is about recycling. The mood does not recover.' } } }
      ] },
    { id: 'fh_rox_megaphone', type: 'drama', speaker: 'rox', title: 'The Megaphone Is Seized', gate: g({ era: GLS, minWeek: 10 }),
      text: "Council security has confiscated Rox's megaphone after the public-comment period ran 'forty minutes over, all of it Rox'. " +
        "It is in a locked cabinet at city hall. She can pick it up Monday. She cannot wait until Monday.",
      choices: [
        { label: 'Buy her a new one ($60)', hint: '−$60 · Rox ↑↑', effects: { fund: -60, mood: { rox: 12 } },
          outcome: 'The new one is louder. It has a siren setting. Rox uses it to call rehearsal to order. Irma calls the police. Twice.' },
        { label: 'Stage a rescue', hint: 'Gamble: a heist at city hall',
          outcome: 'Moth idles the van outside city hall.',
          roll: { chance: 0.4,
            success: { effects: { buzz: 8, chemistry: 5 }, outcome: 'Benny distracts security with a question about the third floor. Rox walks out with the megaphone held high.' },
            fail: { effects: { fund: -80, burnout: 4 }, outcome: 'Security is nice about it. The fine for "loitering in a civic building" is not.' } } },
        { label: 'Wait for Monday', hint: 'Chemistry ↑ · Rox ↓', effects: { chemistry: 3, mood: { rox: -6 } },
          outcome: "Rox spends a weekend without a megaphone. She discovers she is still the loudest person in any room. It's a revelation." }
      ] },
    { id: 'fh_benny_lessons', type: 'drama', speaker: 'benny', title: 'A Student', gate: g({ era: GLS, minFans: 30 }),
      text: "A twelve-year-old from the Cathedral neighbourhood wants guitar lessons from Benny. Her mom has $20 an hour and one question: " +
        "'How many chords will she learn?' Benny looks at you. He looks at the mom. He says 'two' very quietly.",
      choices: [
        { label: 'Benny teaches (+$60)', hint: '+$60 · Benny ↑', effects: { fund: 60, mood: { benny: 8 } },
          outcome: 'Three lessons, two chords. The kid starts a band called Parking Ban. They are already better than you. Benny is thrilled.' },
        { label: 'Teach her three. Secretly.', hint: 'Gamble: Benny finds out',
          outcome: 'Moth teaches her a third chord in the van, between lessons.',
          roll: { chance: 0.5,
            success: { effects: { chemistry: 4, fans: 6 }, outcome: 'Benny never finds out. The kid writes a song with three chords. Benny calls it "derivative".' },
            fail: { effects: { mood: { benny: -10, moth: 4 } }, outcome: 'Benny hears the third chord from across the parking lot. He sits in the van until Moth apologizes. She does not.' } } },
        { label: 'Refer her elsewhere', hint: 'Chemistry ↑', effects: { chemistry: 2, burnout: -3 },
          outcome: 'You send her to the music store on Broad Street. She comes back a month later with seven chords. Benny mourns.' }
      ] },
    { id: 'fh_benny_capo', type: 'weird', speaker: 'benny', title: 'The Capo', gate: g({ era: GLS }),
      text: "Benny has discovered the capo. It lets him play his two chords higher. Technically they are different chords. Spiritually they " +
        "are the same two. He has been sitting on the basement stairs for an hour, working out what this means.",
      choices: [
        { label: "It's the same two chords, Benny", hint: 'Benny ↑', effects: { mood: { benny: 8 } },
          outcome: "Benny exhales. 'The same two,' he whispers. He plays them at fret five for the rest of the night, grinning." },
        { label: 'So... four chords now?', hint: 'Benny ↓↓ · Buzz ↑', effects: { mood: { benny: -10 }, buzz: 4 },
          outcome: 'Benny throws the capo into the lint bin upstairs. Delphine finds it and wears it as a hair clip. It is a whole thing now.' },
        { label: 'Write a song about it', hint: 'Chemistry ↑ · Fans ↑', effects: { chemistry: 3, fans: 5 },
          outcome: "'Capo (Crisis of Faith)' is 71 seconds long. It is the most emotional thing the band has recorded. It has two chords." }
      ] },
    { id: 'fh_benny_string', type: 'money', speaker: 'benny', title: 'Snapped', once: false, cooldown: 8, gate: g({ era: GLS }),
      text: "Benny broke a string again. He only uses three of them, so he has been playing with four for a month, but this was one of " +
        "the three. A new set is $12. He wants to replace just the one, on principle.",
      choices: [
        { label: 'Buy the whole set ($12)', hint: '−$12 · Benny ↓', effects: { fund: -12, mood: { benny: -3 }, skill: { benny: 1 } },
          outcome: 'Six new strings. Benny stares at the three he does not need. "Decorative," he says. It sounds great.' },
        { label: 'Just the one ($3)', hint: '−$3 · Benny ↑', effects: { fund: -3, mood: { benny: 4 } },
          outcome: 'One shiny string among five dead ones. It sounds like a guitar with a secret. Benny loves it.' },
        { label: 'Play on four strings', hint: 'Burnout ↓', effects: { burnout: -3, chemistry: 2 },
          outcome: 'Four strings, two chords. The math works. Benny says it is "cleaner". It is not. Nobody minds.' }
      ] },
    { id: 'fh_benny_manifesto', type: 'drama', speaker: 'benny', title: 'The Manifesto', gate: g({ era: GLS, minWeek: 12 }),
      text: "Benny has written a manifesto. It is titled 'TWO', photocopied on pink paper, and it explains his principle: 'A third chord is " +
        "a choice. I have made mine.' He wants to hand it out at the next show. He has printed five hundred.",
      choices: [
        { label: 'Hand them out', hint: 'Buzz ↑ · Benny ↑', effects: { buzz: 6, mood: { benny: 6 } },
          outcome: 'People read it between songs. Someone starts a two-chord band on the spot. Someone else starts a three-chord band out of spite.' },
        { label: 'Staple it to the merch', hint: 'Fans ↑ · Burnout ↑', effects: { fans: 10, burnout: 4 },
          outcome: 'Every shirt comes with a manifesto. The shirts sell out. The manifestos end up on fridges all over Regina.' },
        { label: 'Edit it down to one line', hint: 'Chemistry ↑ · Benny ↓', effects: { chemistry: 4, mood: { benny: -5 } },
          outcome: "The new manifesto reads: 'TWO.' Benny says it lost something. Rox says it gained everything. They are both right." }
      ] },
    { id: 'fh_moth_mail', type: 'weird', speaker: 'moth', title: 'A Letter for the Van', gate: g({ era: GLS }),
      text: "A letter has arrived for Moth, addressed to 'The Van, Parking Spot 4, Behind the Suds-O-Rama'. It is from the province. " +
        "It is a census form. Moth would like to know how many people live in the van. The answer depends on the day.",
      choices: [
        { label: 'Fill it in honestly: one', hint: 'Moth ↑', effects: { mood: { moth: 6 } },
          outcome: "Moth writes 'one (plus band, Tuesdays and Thursdays)'. The province sends a thank-you card. Moth puts it on the dash." },
        { label: 'List the whole band', hint: 'Gamble: a visit from the province',
          outcome: 'Rox signs as "occupant 2".',
          roll: { chance: 0.5,
            success: { effects: { chemistry: 5, buzz: 3 }, outcome: 'Officially, five people live in the van. The province is fine with it. Moth is less fine with it.' },
            fail: { effects: { burnout: 5, mood: { moth: -5 } }, outcome: 'A census worker visits. He is very thorough. He counts the laundry. It takes three hours.' } } },
        { label: 'Frame the envelope', hint: 'Chemistry ↑', effects: { chemistry: 3 },
          outcome: 'The envelope goes above the kit. It is proof: the van is a real address. Moth has never looked so proud.' }
      ] },
    { id: 'fh_moth_ticket', type: 'road', speaker: 'moth', title: 'Parking Enforcement', gate: g({ era: GLS, minWeek: 6 }),
      text: "Parking enforcement has ticketed the van for 'extended residential occupation of a commercial lot'. It is $85. " +
        "Moth wants to appeal. Rox wants to appeal harder. Rox has already written a speech. It has sections.",
      choices: [
        { label: 'Pay the ticket ($85)', hint: '−$85 · Moth ↓', effects: { fund: -85, mood: { moth: -4 } },
          outcome: 'Moth pays with quarters. The clerk counts every one. Moth watches her count every one.' },
        { label: 'Rox handles the appeal', hint: 'Gamble: Rox vs. the city',
          outcome: 'Rox arrives at the appeal hearing with a megaphone and a binder.',
          roll: { chance: 0.5,
            success: { effects: { mood: { moth: 8, rox: 6 } }, outcome: 'Ticket dismissed. The adjudicator says it is "easier than listening to the rest". Rox counts it as a win.' },
            fail: { effects: { fund: -120, mood: { rox: -4 } }, outcome: 'Ticket upheld. Plus a fee for "conduct". Rox frames the receipt.' } } },
        { label: 'Move the van. Every day.', hint: 'Burnout ↑ · Moth ↑', effects: { burnout: 5, mood: { moth: 4 } },
          outcome: 'Moth moves her apartment every morning at 8. Some days it is behind the Suds-O-Rama. Some days it is on Dewdney. It is fine.' }
      ] },
    { id: 'fh_moth_laundry_day', type: 'drama', speaker: 'moth', title: 'Laundry Day', once: false, cooldown: 9, gate: g({ era: GLS }),
      text: "Moth is doing her laundry upstairs at the Suds-O-Rama, which means she is not in the van, which means the band's merch box, " +
        "the PA and her sock drawer are all briefly accessible. Rox wants the PA. Benny wants a snack.",
      choices: [
        { label: 'Wait for Moth', hint: 'Moth ↑ · Burnout ↓', effects: { mood: { moth: 6 }, burnout: -3 },
          outcome: 'Forty minutes on the stairs. When Moth comes back, everything smells like Spring Meadow. Including the PA.' },
        { label: 'Help her fold', hint: 'Chemistry ↑', effects: { chemistry: 4, mood: { moth: 3 } },
          outcome: 'The whole band folds Moth\'s laundry. She re-folds all of it. It is still the nicest thing you have done as a band.' },
        { label: 'Take the PA (quickly)', hint: 'Skill ↑ · Moth ↓', effects: { skill: { all: 1 }, mood: { moth: -6 } },
          outcome: 'You get the PA and a great rehearsal. Moth finds a footprint on her bed. She says nothing. That is worse.' }
      ] },
    { id: 'fh_moth_cat', type: 'weird', speaker: 'moth', title: 'A Houseguest', gate: g({ era: GLS, minWeek: 8 }),
      text: "A cat has moved into the van. Orange, one ear, extremely calm. Moth says it pays rent in mice. It sleeps on the bass amp. " +
        "Benny is allergic. Rox has already named it Councillor.",
      choices: [
        { label: 'Councillor stays', hint: 'Moth ↑ · Benny ↓', effects: { mood: { moth: 10, benny: -4 } },
          outcome: 'Councillor attends every rehearsal and every meeting. Benny takes antihistamines and calls it "a tax".' },
        { label: 'Find him a home', hint: 'Chemistry ↑', effects: { chemistry: 3, mood: { moth: -4 } },
          outcome: 'Delphine adopts Councillor. He now lives on top of machine 6. Moth visits him every Thursday.' },
        { label: 'Put him on the merch', hint: '−$60 · Fans ↑', effects: { fund: -60, fans: 12 },
          outcome: 'A shirt with a one-eared cat and the words VOTE COUNCILLOR. It outsells everything, including the band.' }
      ] },
    { id: 'fh_money_bottles', type: 'money', speaker: 'rox', title: 'Bottle Drive', once: false, cooldown: 8, gate: g({ era: GLS }),
      text: "The football team played at home. The Exhibition parking lot is a sea of empties and watermelon helmets. The band fund " +
        "is low. Rox has garbage bags. Benny has gloves. Moth has the van, which holds more bags than anyone should.",
      choices: [
        { label: 'Work the whole lot', hint: '+$70 · Burnout ↑', effects: { fund: 70, burnout: 5 },
          outcome: 'Eleven bags, four hours, one watermelon helmet that Benny now wears. The depot pays $70 in coins.' },
        { label: 'Flyers with every bag', hint: '+$40 · Fans ↑', effects: { fund: 40, fans: 6 },
          outcome: 'You hand a flyer to everyone who hands you a bottle. Six of them come to the next show. One brings bottles.' },
        { label: 'Skip it. Rehearse.', hint: 'Skill ↑', effects: { skill: { all: 1 }, burnout: 3 },
          outcome: 'You rehearse instead. Rox writes a song called "Deposit Refund". It is about something else entirely.' }
      ] },
    { id: 'fh_money_change_machine', type: 'money', speaker: 'fh_irma', title: 'The Change Machine', once: false, cooldown: 10, gate: g({ era: GLS }),
      text: "The Suds-O-Rama change machine has jammed again. There is a line of angry people holding bills and wet laundry. Irma " +
        "offers the band $30 to fix it, or $50 to fix it 'and entertain the line'.",
      choices: [
        { label: 'Fix it and entertain ($50)', hint: '+$50 · Fans ↑ · Burnout ↑', effects: { fund: 50, fans: 5, burnout: 4 },
          outcome: 'Moth fixes the machine with a coat hanger while the band plays an acoustic set. The line claps. Two join the mailing list.' },
        { label: 'Just fix it ($30)', hint: '+$30', effects: { fund: 30 },
          outcome: 'Moth reaches into the machine up to her shoulder and pulls out a jammed loonie and a 1998 transit transfer.' },
        { label: 'Let Irma kick it', hint: 'Chemistry ↑', effects: { chemistry: 3, burnout: -3 },
          outcome: 'Irma kicks it once. It works. She looks at you all as if this proves something. It does.' }
      ] },
    { id: 'fh_money_zine', type: 'money', speaker: 'benny', title: 'Our Own Zine', gate: g({ era: GLS, minWeek: 6 }),
      text: "Benny wants to make the band's own zine: 'TWO', monthly, eight pages, photocopied at the library. Rox wants a council " +
        "column. Moth wants a section called 'Van Tips'. It will cost $30 a month and no one will make money. That is the point.",
      choices: [
        { label: 'Print issue one ($30)', hint: '−$30 · Buzz ↑ · Fans ↑', effects: { fund: -30, buzz: 5, fans: 6 },
          outcome: 'Issue one: the manifesto, a pothole map and "Van Tip #1: knock". It is in every coffee shop in Regina by Friday.' },
        { label: 'Charge a toonie for it', hint: '+$20 · Benny ↓', effects: { fund: 20, mood: { benny: -4 } },
          outcome: 'You sell ten at two dollars. Benny says charging for a zine is "a third chord of commerce". He does not mean it kindly.' },
        { label: 'Digital only', hint: 'Chemistry ↑', effects: { chemistry: 2, buzz: 2 },
          outcome: 'The zine is a post on Bandbook now. It gets eleven likes. Delphine prints it out anyway and staples it.' }
      ] },
    { id: 'fh_money_benefit', type: 'money', speaker: 'rox', title: 'Benefit for the Photocopier', gate: g({ era: GLS, minFans: 60 }),
      text: "The central library's photocopier (the one that made every flyer you ever printed) has died. Rox wants to play a benefit " +
        "to buy them a new one. The librarian is moved. The librarian would also like it to be quieter than your last show.",
      choices: [
        { label: 'Play it loud', hint: 'Fans ↑ · Buzz ↑', effects: { fans: 15, buzz: 6, fund: -40 },
          outcome: 'You raise $900 and the roof. The new photocopier has a plaque with your name on it. It jams in your honour.' },
        { label: 'Play it acoustic', hint: 'Chemistry ↑ · Fans ↑', effects: { chemistry: 5, fans: 8 },
          outcome: 'Unplugged punk in the reading room. Benny whispers both chords. The librarian cries a little. The photocopier is funded.' },
        { label: 'Donate $100 instead', hint: '−$100 · Rox ↑', effects: { fund: -100, mood: { rox: 5 } },
          outcome: 'A cheque from the band fund, signed by Rox with a flourish. The library thanks "Frost Heavy". Close enough.' }
      ] },
    { id: 'fh_money_busk', type: 'money', speaker: 'benny', title: 'Busking on Scarth Street', once: false, cooldown: 8, gate: g({ era: GLS }),
      text: "Benny wants to busk on Scarth Street at lunch. Two chords, an open guitar case and a sign that says 'WILL STOP FOR MONEY'. " +
        "Rox wants to come and do public comment. Moth wants to stay in the van, which is parked right there.",
      choices: [
        { label: 'Benny busks alone', hint: '+$35 · Benny ↑', effects: { fund: 35, mood: { benny: 5 } },
          outcome: 'Thirty-five dollars, a sandwich and a business card from a man who wants a jingle for his tire shop. Two chords, obviously.' },
        { label: 'The whole band busks', hint: '+$60 · Burnout ↑ · Fans ↑', effects: { fund: 60, burnout: 5, fans: 5 },
          outcome: 'A full punk band on a pedestrian mall at noon. Office workers eat lunch at a safe distance and pay generously to be left alone.' },
        { label: 'Rox does public comment', hint: 'Gamble: tips or a bylaw officer',
          outcome: 'Rox climbs onto a planter.',
          roll: { chance: 0.5,
            success: { effects: { buzz: 6, fund: 25 }, outcome: 'She gets a crowd, a cheer and $25. A retired alderman shakes her hand and says "finally".' },
            fail: { effects: { fund: -50, mood: { rox: -3 } }, outcome: 'A bylaw officer arrives. The bylaw is one Rox has personally complained about. The irony costs $50.' } } }
      ] },
    { id: 'fh_road_wind', type: 'road', speaker: 'moth', title: 'The Wind', gate: g({ era: GLS }),
      text: "It is a normal Regina day, which means the wind is doing sixty. On Albert Street the van's side door blows open and the " +
        "merch box empties across four lanes. Shirts are wrapping themselves around lamp posts. Rox calls it 'distribution'.",
      choices: [
        { label: 'Run after every shirt', hint: 'Burnout ↑ · Chemistry ↑', effects: { burnout: 6, chemistry: 4 },
          outcome: 'You recover thirty-one shirts. Four are never found. Months later you see a man at the Legion wearing one. You let him keep it.' },
        { label: 'Let the wind have them', hint: '−$50 · Fans ↑', effects: { fund: -50, fans: 12 },
          outcome: 'Shirts land in yards all over the Heritage neighbourhood. Twelve people come to a show to "return" them. They keep them.' },
        { label: 'Moth fixes the door. Forever.', hint: 'Moth ↑', effects: { mood: { moth: 6 }, fund: -20 },
          outcome: 'Moth wires the door shut with a coat hanger and a bungee cord. Everyone now enters through the passenger side. It is her apartment.' }
      ] },
    { id: 'fh_road_moose_jaw', type: 'road', speaker: 'benny', title: 'Moose Jaw Tunnels', gate: g({ era: GLS, minFans: 30 }),
      text: "A gig in Moose Jaw, in a bar that used to be part of the old tunnels. The ceiling is low, the history is dubious and the " +
        "owner insists a famous gangster once 'used the washroom here'. Benny wants to play the tunnels themselves.",
      choices: [
        { label: 'Play in the tunnel', hint: 'Gamble: acoustics or claustrophobia',
          outcome: 'You set up in a stone corridor under Main Street.',
          roll: { chance: 0.55, stat: 'chemistry', statScale: 0.005,
            success: { effects: { buzz: 8, fans: 12 }, outcome: 'Two chords in a stone tunnel sound like an army. The recording becomes the band\'s best bootleg.' },
            fail: { effects: { burnout: 6, mood: { rox: -4 } }, outcome: 'Rox hits her head on a beam during the dive. She keeps singing. The owner adds her to the tour.' } } },
        { label: 'Play upstairs like normal', hint: 'Fans ↑', effects: { fans: 8, chemistry: 2 },
          outcome: 'A good, sweaty night. The owner tells the gangster story four times. It changes each time.' },
        { label: 'Take the tunnel tour', hint: '−$20 · Everyone ↑', effects: { fund: -20, mood: { all: 4 } },
          outcome: 'An actor in a fedora gives you a tour. Moth asks sensible questions about ventilation. The actor breaks character.' }
      ] },
    { id: 'fh_road_pothole', type: 'road', speaker: 'rox', title: 'The Pothole Swallows the Pothole', once: false, cooldown: 10, gate: g({ era: GLS }),
      text: "The van, which is called the Pothole, has hit a pothole so deep that the front wheel is below street level. Rox is standing on the " +
        "curb, measuring it, dictating a complaint into her phone. Moth is lying under the van, talking to it gently.",
      choices: [
        { label: 'Everyone pushes', hint: 'Burnout ↑ · Chemistry ↑', effects: { burnout: 5, chemistry: 4 },
          outcome: 'Four people and a passing curling team push the van out. Rox files a report. The pothole gets a name: Pomeroy.' },
        { label: 'Call a tow ($90)', hint: '−$90 · Moth ↑', effects: { fund: -90, mood: { moth: 4 } },
          outcome: 'The tow driver says it is the third van this week. Moth asks about the other two. She wants to know they are okay.' },
        { label: 'Film it for council', hint: 'Buzz ↑ · Rox ↑', effects: { buzz: 5, mood: { rox: 6 } },
          outcome: 'Rox narrates like a nature documentary. The clip is played at the next council meeting. The pothole is fixed in a week.' }
      ] },
    { id: 'fh_scene_snowplows', type: 'scene', speaker: 'rox', title: 'The Snowplows Challenge', gate: g({ era: GLS, minFans: 25, weekOfYear: [11, 18] }),
      text: "The Snowplows, Regina's other punk band, have challenged you to a sidewalk-shovelling race down 13th Avenue. Loser opens for " +
        "winner at the next all-ages show. They have their own shovels. They have trained.",
      choices: [
        { label: 'Accept. Shovels up.', hint: 'Gamble: cardio',
          outcome: 'Moth brings a shovel she found in the van. Nobody knew it was there.',
          roll: { chance: 0.5, stat: 'chemistry', statScale: 0.008,
            success: { effects: { buzz: 8, fans: 12 }, outcome: 'You win by one driveway. Thirty seniors have clean walks and a new favourite band. The Snowplows open, graciously.' },
            fail: { effects: { burnout: 8, fans: 5 }, outcome: 'The Snowplows win. You open for them. Your back hurts. The seniors come to both sets anyway.' } } },
        { label: 'Challenge them to a gig instead', hint: 'Fans ↑ · Chemistry ↑', effects: { fans: 10, chemistry: 3 },
          outcome: 'A double bill in a church basement. Both bands play two-chord songs about snow. It is basically a festival.' },
        { label: 'Decline. Too cold.', hint: 'Burnout ↓ · Rox ↓', effects: { burnout: -5, mood: { rox: -4 } },
          outcome: 'The Snowplows shovel the whole avenue alone and tell everyone. Rox writes a song called "Warm Inside". It is bitter.' }
      ] },
    { id: 'fh_scene_all_ages', type: 'scene', speaker: 'benny', title: 'All-Ages at the Skate Park', gate: g({ era: GLS, weekOfYear: [1, 4] }),
      text: "Summer. The city has let a youth group run an all-ages show at the skate park. A generator, a folding table, a PA borrowed " +
        "from a church. Forty kids on boards. Benny has never been happier to see so many people who know two chords.",
      choices: [
        { label: 'Headline it', hint: 'Fans ↑ · Buzz ↑', effects: { fans: 15, buzz: 5, burnout: 4 },
          outcome: 'A pit forms on the half-pipe. A kid kickflips over Rox mid-dive. Nobody is hurt. Everyone is a fan.' },
        { label: 'Let the kids play first', hint: 'Chemistry ↑ · Fans ↑', effects: { chemistry: 4, fans: 8 },
          outcome: 'Three twelve-year-olds play a song called "Mom Said No". It is better than anything you have written. You tell them so.' },
        { label: 'Run the merch table', hint: '+$45', effects: { fund: 45, chemistry: 2 },
          outcome: 'Moth runs the table with ruthless efficiency. Forty-five dollars in toonies and one skateboard traded for a shirt.' }
      ] },
    { id: 'fh_scene_open_stage', type: 'scene', speaker: 'rox', title: 'The Leaning Silo', once: false, cooldown: 9, gate: g({ era: GLS }),
      text: "Open stage night at the Leaning Silo. The stage leans four degrees west, the sign-up sheet leans further. Rox wants to do a " +
        "spoken-word piece. It is the council minutes again, with feeling.",
      choices: [
        { label: 'Play two songs', hint: 'Fans ↑', effects: { fans: 6, chemistry: 2 },
          outcome: 'Two songs, three minutes total. The folk duo after you have to wait for the room to stop vibrating.' },
        { label: 'Rox does the spoken word', hint: 'Gamble: poetry or a heckle',
          outcome: 'Rox takes the stool. The room leans in, four degrees.',
          roll: { chance: 0.5,
            success: { effects: { buzz: 6, mood: { rox: 6 } }, outcome: 'The minutes, read like Shakespeare. The room gives a standing ovation. Someone asks for a copy.' },
            fail: { effects: { mood: { rox: -5 } }, outcome: 'The host plays her off with a ukulele after item nine. Rox demands the rest be entered into the record.' } } },
        { label: 'Just watch tonight', hint: 'Burnout ↓', effects: { burnout: -5 },
          outcome: 'You watch a man play the saw. It is beautiful. Benny asks how many chords a saw has. The man says "one". Benny is shaken.' }
      ] },
    { id: 'fh_fame_leader_pest', type: 'fame', speaker: 'fh_janice', title: 'The Leader-Pest Feature', gate: g({ era: GLS, minFans: 100 }),
      text: "Janice from the Leader-Pest wants to do a feature: 'The Loudest Band in the Queen City'. She needs a photo. Rox wants it taken " +
        "at council chambers. Moth wants it taken in the van. Benny wants it taken in front of a sign with two letters on it.",
      choices: [
        { label: 'Council chambers', hint: 'Buzz ↑ · Rox ↑', effects: { buzz: 8, mood: { rox: 6 } },
          outcome: 'Security lets you stand on the steps for nine minutes. The photo has a councillor in the background, visibly worried.' },
        { label: 'In the van', hint: 'Fans ↑ · Moth ↑', effects: { fans: 15, mood: { moth: 8 } },
          outcome: 'Four people and a cat in a minivan, lit by the dome light. It is the best band photo in the history of the paper.' },
        { label: 'In the basement', hint: 'Chemistry ↑ · Fans ↑', effects: { chemistry: 4, fans: 10 },
          outcome: 'Under the Suds-O-Rama, dryers thumping above. Irma insists on being in it. She looks the most punk of anyone.' }
      ] },
    { id: 'fh_fame_campus_radio', type: 'fame', speaker: 'rox', title: 'Campus Radio', gate: g({ era: GLS, minFans: 50 }),
      text: "The campus station has you in for an interview at 2 a.m. The host wants to talk about the music. Rox wants to talk about snow " +
        "routes. Benny wants to talk about restraint. Moth has fallen asleep in the studio's one good chair.",
      choices: [
        { label: 'Talk about the music', hint: 'Fans ↑', effects: { fans: 10, mood: { rox: -3 } },
          outcome: 'You talk about the music. It turns out you have opinions. Twelve listeners call in. One is Delphine.' },
        { label: 'Let Rox talk snow routes', hint: 'Buzz ↑ · Rox ↑', effects: { buzz: 6, mood: { rox: 8 } },
          outcome: 'Forty minutes on the snow-route map. Callers join in. It becomes a municipal call-in show. The station renews it.' },
        { label: 'Play live in the studio', hint: 'Gamble: the soundboard is old',
          outcome: 'You set up in a studio the size of a closet.',
          roll: { chance: 0.55,
            success: { effects: { buzz: 8, fans: 12 }, outcome: 'It sounds huge. The host says it is the loudest thing that has ever happened in the building. Probably true.' },
            fail: { effects: { fund: -60, burnout: 3 }, outcome: 'The board blows a fuse. The station bills you $60 for "a fuse and trauma".' } } }
      ] },
    { id: 'fh_weird_frost_heave', type: 'weird', speaker: 'moth', title: 'The Real Frost Heave', gate: g({ era: GLS, weekOfYear: [17, 20] }),
      text: "Spring. The road outside the Suds-O-Rama has buckled into a hump a metre high: an actual frost heave. Cars are launching off it. " +
        "The city put a sign up. Somebody has already spray-painted the band's name on the sign.",
      choices: [
        { label: 'Band photo on the heave', hint: 'Buzz ↑ · Fans ↑', effects: { buzz: 8, fans: 10 },
          outcome: 'Four people on top of a frost heave, arms crossed. It is the album cover now. Nobody decided that. It just is.' },
        { label: 'Play a show on it', hint: 'Gamble: a traffic hazard',
          outcome: 'Moth backs the van up to the hump for power.',
          roll: { chance: 0.45,
            success: { effects: { fans: 20, buzz: 10 }, outcome: 'A punk show on a buckled road. Traffic stops to watch. A city crew sits on their truck and nods along.' },
            fail: { effects: { fund: -150, mood: { all: -4 } }, outcome: 'A city crew arrives to fix the road mid-song. The fine for "obstructing repairs" is $150. They fix it during the encore.' } } },
        { label: 'Report it to council', hint: 'Rox ↑ · Chemistry ↑', effects: { mood: { rox: 6 }, chemistry: 2 },
          outcome: "Rox reports it at council, in person, for eleven minutes. They fix it. She is devastated. It was the band's hump." }
      ] },
    { id: 'fh_weird_wind_chill', type: 'weird', speaker: 'benny', title: 'Minus Forty-Five', gate: g({ era: GLS, weekOfYear: [13, 16] }),
      text: "Minus forty-five with the wind chill. The van won't start, the buses are late and half of Ward 6 has come to the Suds-O-Rama " +
        "because it is the warmest room in the neighbourhood. They can hear you rehearsing through the floor.",
      choices: [
        { label: 'Bring the show upstairs', hint: 'Fans ↑ · Chemistry ↑', effects: { fans: 15, chemistry: 4 },
          outcome: 'A free set among the dryers for thirty frozen strangers. They clap with mittens on. It sounds like pillows. It is wonderful.' },
        { label: 'Rehearse through it', hint: 'Skill ↑ · Burnout ↑', effects: { skill: { all: 1 }, burnout: 5 },
          outcome: 'You play the set nine times. Upstairs, thirty people learn every word through a floor. Four of them come to the next show.' },
        { label: 'Help Moth start the van', hint: 'Moth ↑ · Burnout ↑', effects: { mood: { moth: 8 }, burnout: 4 },
          outcome: 'Two hours, a hair dryer and an extension cord from the laundromat. The Pothole wheezes to life. Moth pats its dashboard.' }
      ] },
    { id: 'fh_scene_rival_tv', type: 'scene', speaker: 'rox', title: 'The Mall Rats Are On TV', once: false, cooldown: 12, gate: g({ era: GLS, minWeek: 8 }),
      text: "{rival} are on the TV above the Suds-O-Rama folding table, kickflipping in slow motion for a sponsor. Everyone doing laundry has " +
        "stopped to watch. Rox is standing on a chair. Benny is counting their chords out loud. There are four. He is disgusted.",
      choices: [
        { label: 'Heckle the TV', hint: 'Buzz ↑ · Rox ↑', effects: { buzz: 4, mood: { rox: 6 } },
          outcome: 'Rox heckles the TV for the whole episode. The laundromat joins in. It becomes a weekly thing. Irma sells popcorn.' },
        { label: 'Change the channel', hint: 'Chemistry ↑', effects: { chemistry: 3 },
          outcome: 'You switch to curling. The laundromat relaxes. Benny says curling has "the right number of rocks".' },
        { label: 'Play a counter-show', hint: 'Fans ↑ · Burnout ↑', effects: { fans: 8, burnout: 4 },
          outcome: 'You play live, downstairs, every time their show airs. Soon more people come for you than for the TV. The TV is unplugged.' }
      ] },
    { id: 'fh_drama_setlist', type: 'drama', speaker: 'benny', title: 'The Setlist Fight', once: false, cooldown: 10, gate: g({ era: GLS }),
      text: "Setlist fight. Rox wants fourteen songs about city council. Benny points out that all fourteen use the same two chords, " +
        "so it doesn't matter which fourteen. Moth wants the set over by eleven so she can go home. Home is outside.",
      choices: [
        { label: "Rox's fourteen", hint: 'Rox ↑ · Benny ↓', effects: { mood: { rox: 6, benny: -4 } },
          outcome: 'Fourteen songs, twenty-two minutes. Benny calls it "a municipal agenda". Rox takes that as praise.' },
        { label: 'Shuffle them. Literally.', hint: 'Chemistry ↑', effects: { chemistry: 4 },
          outcome: 'You write every song on a coaster and draw them from a toque. It is the best set you have played. Randomness is punk.' },
        { label: 'Over by eleven', hint: 'Moth ↑ · Burnout ↓', effects: { mood: { moth: 6 }, burnout: -4 },
          outcome: 'The set ends at 10:58. Moth is home at 10:59. She blinks the van\'s headlights twice: good night.' }
      ] },
    { id: 'fh_drama_moth_home', type: 'drama', speaker: 'moth', title: 'Moth Stayed Home', once: false, cooldown: 8, seat: ['drums', 'rhythm', 'lead'], gate: g({ era: GLS, minWeek: 6 }),
      text: "Moth has not come down for rehearsal. She is home. Home is the van, parked forty feet from the basement door, lights on, curtains " +
        "drawn. There is a note on the door: 'NOT TODAY. BASS PARTS ARE THE SAME AS LAST TIME.'",
      choices: [
        { label: 'Rehearse without her', hint: 'Skill ↑ · Moth ↑', effects: { skill: { all: 1 }, mood: { moth: 5 } },
          outcome: 'You rehearse without bass. It sounds like a band with a hole in it. Moth hears it from the van and feels needed.' },
        { label: 'Knock (politely)', hint: 'Chemistry ↑', effects: { chemistry: 4, mood: { moth: 3 } },
          outcome: 'Moth opens the window a crack and passes out four mugs of tea. She does not come in. It is a good rehearsal anyway.' },
        { label: 'Move rehearsal to the van', hint: 'Gamble: it is small in there',
          outcome: 'You carry the snare to the van.',
          roll: { chance: 0.5,
            success: { effects: { chemistry: 6, mood: { moth: 8 } }, outcome: 'Four people and a snare in a minivan. It is the tightest the band has ever sounded. Moth makes popcorn.' },
            fail: { effects: { mood: { moth: -8 }, burnout: 4 }, outcome: 'The snare knocks over a plant. The plant was important. Moth asks everyone to leave. Everyone leaves.' } } }
      ] },

    // ---- The Mall Rats throw sponsor money at you, too (gap #10: a sponsor-offer set, not only the poach) ------------------
    { id: 'fh_mr_riot_juice', type: 'money', speaker: 'mr_blaze', title: 'A Pallet of Riot Juice', gate: g({ era: GLS, minFans: 80 }),
      text: "A pallet of Riot Juice energy drinks has been delivered to the Suds-O-Rama, addressed to 'the Regina punks'. There is a card " +
        "from Blaze of {rival}: 'Stay hydrated, bros!! Tag the brand?? (Siobhan says tag the brand.)' Irma wants it off her floor.",
      choices: [
        { label: 'Tag the brand (+$150)', hint: '+$150 · Rox ↓ · Haters ↑', effects: { fund: 150, mood: { rox: -8 }, buzz: -3 },
          outcome: 'One photo, one tag, $150 from Siobhan within the hour. The comments call you sellouts. Rox deletes the photo at 3 a.m.' },
        { label: 'Give it away at a show', hint: 'Fans ↑ · Burnout ↑', effects: { fans: 12, burnout: 5 },
          outcome: 'Free Riot Juice for everyone. The pit has never been faster. Nobody sleeps. It was a mistake. It was a great show.' },
        { label: 'Ship it back, postage due', hint: 'Buzz ↑ · Chemistry ↑', effects: { buzz: 6, chemistry: 3 },
          outcome: "The pallet goes back to Toronto collect, with a note from Rox. Siobhan replies: 'Love the energy. Evergreen offer.'" }
      ] },
    { id: 'fh_mr_shredwood', type: 'money', speaker: 'mr_siobhan', title: 'The Shredwood Offer', gate: g({ era: LS, minFans: 150 }),
      text: "Siobhan from {rival} emails: Shredwood Skateboards will pay $400 for Frost Heave to keep a Shredwood deck on stage at every show. " +
        "'Visible. Tasteful. Center-left.' Benny wants to know if he has to ride it. Rox wants to know who Shredwood donates to.",
      choices: [
        { label: 'Take the $400', hint: '+$400 · Benny ↓ · Rox ↓', effects: { fund: 400, mood: { benny: -5, rox: -5 } },
          outcome: 'The deck sits by the kick drum, center-left. A kid in the pit asks if you are the Mall Rats now. Benny kicks it off the stage.' },
        { label: 'Only if we can break it', hint: 'Gamble: Siobhan reads the fine print',
          outcome: 'Rox writes "we will break it" into the contract.',
          roll: { chance: 0.5,
            success: { effects: { fund: 300, buzz: 10 }, outcome: 'Siobhan signs without reading. Rox snaps the deck over her knee at the first show. The clip is huge.' },
            fail: { effects: { buzz: 4, mood: { rox: -4 } }, outcome: 'Siobhan reads the fine print. She adds a clause: "Breaking is a deliverable." The fun is gone.' } } },
        { label: 'No. Obviously no.', hint: 'Chemistry ↑ · Rox ↑', effects: { chemistry: 5, mood: { rox: 6 } },
          outcome: "Siobhan replies within four minutes: 'Understood. The offer is evergreen.' It is evergreen. It will come back." }
      ] },
    { id: 'fh_mr_buy_the_name', type: 'money', speaker: 'mr_siobhan', title: 'Siobhan Wants Your Name', gate: g({ era: S }),
      text: "{rival} are launching a 'raw, unfiltered' side project and Siobhan wants to buy the name Frost Heave for it. $1,200 now, and you " +
        "can keep using it 'for legacy purposes'. Blaze has already made a logo. It is your logo, but shinier.",
      choices: [
        { label: 'Absolutely not', hint: 'Chemistry ↑ · Buzz ↑', effects: { chemistry: 6, buzz: 8 },
          outcome: "Rox trademarks the name that afternoon for $400 she doesn't have. Worth it. Siobhan sends a gift basket: 'No hard feelings (legally).'" },
        { label: 'Sell them "Frost Heavy"', hint: '+$800 · Benny ↑', effects: { fund: 800, mood: { benny: 8 } },
          outcome: 'You sell them the misprint. The side project launches as Frost Heavy. Nobody notices the difference. That hurts a little.' },
        { label: 'Counter: $12,000', hint: 'Gamble: Siobhan has budget',
          outcome: 'Rox writes "$12,000" on a napkin and slides it across.',
          roll: { chance: 0.15,
            success: { effects: { fund: 1200, buzz: 12 }, outcome: 'Siobhan laughs, then pays a licence fee instead of buying it. $1,200 a year, forever. The band has an endowment.' },
            fail: { effects: { buzz: 6, chemistry: 3 }, outcome: 'Siobhan laughs, pockets the napkin and walks away. The napkin is framed in their office now.' } } }
      ] },

    // ---- Guilt (only while you owe your parents; repay pays them back) ----------------------------------------------------
    { id: 'fh_guilt_parking', type: 'money', speaker: 'dad', title: "Dad Paid Moth's Tickets", once: false, cooldown: 10,
      gate: g({ era: GLS, flags: ['parentsLoan'] }),
      text: "Dad has been quietly paying the van's parking tickets out of the band loan. He has a folder. It is labelled MOTH. He slides it " +
        "across the kitchen table without a word. There are eleven tickets in it. One is from Moose Jaw.",
      choices: [
        { label: 'Pay him back $120', hint: 'Debt ↓', effects: { repay: 120, chemistry: 2 },
          outcome: "Dad puts the cash in the MOTH folder, closes it and says 'she seems like a nice girl'. He means the van." },
        { label: 'Bring Moth to supper', hint: 'Gamble: Dad meets Moth',
          outcome: 'Moth arrives, knocks twice, waits, knocks again.',
          roll: { chance: 0.5,
            success: { effects: { repay: 60, mood: { moth: 6 } }, outcome: 'Dad and Moth talk carburetors for three hours. He forgives $60 of the loan "for the education".' },
            fail: { effects: { burnout: 5, mood: { moth: -4 } }, outcome: 'Moth eats in silence and leaves at 7:30 because "home closes at eight". Dad adds a ticket to the folder.' } } },
        { label: 'Promise to park legally', hint: 'Burnout ↑', effects: { burnout: 4 },
          outcome: 'Dad writes the promise on a sticky note and puts it in the folder. The folder is getting thick.' }
      ] },
    { id: 'fh_guilt_casserole', type: 'money', speaker: 'mom', title: 'The Casserole Note', once: false, cooldown: 9,
      gate: g({ era: GLS, flags: ['parentsLoan'] }),
      text: "Mom dropped off a casserole at the Suds-O-Rama for 'the band'. Taped to the foil is a note: 'Eat well! Love, Mom. P.S. the loan.' " +
        "Irma read the note. Delphine read the note. The whole Thursday wash crowd has read the note.",
      choices: [
        { label: 'Pay her back $100', hint: 'Debt ↓ · Chemistry ↑', effects: { repay: 100, chemistry: 2 },
          outcome: 'You return the dish with $100 inside it. Mom sends a second casserole with a new note: "Thank you! P.S. the rest of the loan."' },
        { label: 'Eat it together', hint: 'Everyone ↑ · Burnout ↓', effects: { mood: { all: 4 }, burnout: -4 },
          outcome: 'Four forks, one casserole, on top of dryer six. It is the best meal the band has had in a year. Guilt is delicious.' },
        { label: 'Mow her lawn instead', hint: 'Burnout ↑', effects: { burnout: 5, repay: 20 },
          outcome: 'You mow, rake and edge. Mom counts it as $20. Rox helps and critiques the city bylaw on hedge height the whole time.' }
      ] },
    { id: 'fh_guilt_gallery', type: 'money', speaker: 'mom', title: 'Mom at Council', once: false, cooldown: 12,
      gate: g({ era: GLS, flags: ['parentsLoan'], minWeek: 10 }),
      text: "Mom went to a council meeting to watch Rox. During public comment she stood up and mentioned, to the whole gallery, that her " +
        "child's band 'still owes her from the spring'. It is in the minutes. Janice from the Leader-Pest quoted it.",
      choices: [
        { label: 'Pay her $150, publicly', hint: 'Debt ↓ · Buzz ↑', effects: { repay: 150, buzz: 3 },
          outcome: 'You pay her back at the next meeting, during public comment. It is also in the minutes. Council applauds. First time for everything.' },
        { label: 'Laugh it off', hint: 'Burnout ↑', effects: { burnout: 5, mood: { rox: 4 } },
          outcome: "Rox says it's the best public comment she's heard all year. Mom says 'thank you, dear, and the loan'." },
        { label: 'Write her a song', hint: 'Chemistry ↑ · Fans ↑', effects: { chemistry: 3, fans: 5 },
          outcome: "'Outstanding Balance' has two chords and one verse that is just her name. She plays it for her book club. They want copies." }
      ] },

    // ---- Holidays (appended to calendar.holidays[*].cards below; once a year) ---------------------------------------------
    { id: 'holiday_canada_day_frost_heave', type: 'scene', speaker: 'rox', title: 'Canada Day', once: false, cooldown: 20,
      gate: g({ era: GLS, weekOfYear: [1, 1], minWeek: 2 }),
      text: "Canada Day by the lake. The free stage has a sponsor banner, a speech from a councillor that has run twenty minutes long and " +
        "four thousand people in red. Rox is in the crowd with the megaphone. Moth has parked the van, and her kitchen, on the grass.",
      choices: [
        { label: 'Flyer the whole lakeshore', hint: 'Buzz ↑ · Fans ↑ · Burnout ↑', effects: { buzz: 8, fans: 12, burnout: 5 },
          outcome: 'Four hundred flyers and one sunburn. A kid asks if you are "the laundromat band". You are now.' },
        { label: "Heckle the councillor's speech", hint: 'Gamble: cheers or security',
          outcome: 'Rox waits for a pause. There is never a pause. She makes one.',
          roll: { chance: 0.5,
            success: { effects: { buzz: 10, mood: { rox: 8 } }, outcome: "'WRAP IT UP, WARD 2!' Four thousand people cheer. The councillor wraps it up. Rox is a folk hero by the fireworks." },
            fail: { effects: { mood: { rox: -6 }, burnout: 3 }, outcome: 'Security asks Rox to enjoy the holiday "further away". She enjoys it from the van roof, loudly.' } } },
        { label: 'Barbecue at the van', hint: 'Everyone ↑ · Burnout ↓', effects: { mood: { all: 4 }, burnout: -6 },
          outcome: 'Moth grills on a camp stove out the side door. Burgers, corn, a watermelon. Delphine brings a lawn chair and stays for the fireworks.' }
      ] },
    { id: 'holiday_thanksgiving_guilt_frost_heave', type: 'money', speaker: 'mom', title: 'Thanksgiving Dinner', once: false, cooldown: 20,
      gate: g({ era: GLS, weekOfYear: [7, 7], flags: ['parentsLoan'] }),
      text: "Thanksgiving at your parents'. Mom made the good stuffing. Dad says grace, and grace is about the loan. \"And thank you, Lord, for " +
        "repayment schedules.\" Rox came along and is taking notes on the grace for a song.",
      choices: [
        { label: 'Pay back $100 over pie', hint: 'Debt ↓ · guilt ↓', effects: { repay: 100, chemistry: 2 },
          outcome: 'Five twenties under the pumpkin pie. Dad counts them twice. Rox leads a slow clap. Mom cries a little.' },
        { label: 'Let Rox talk politics', hint: 'Gamble: family dinner',
          outcome: 'Rox clears her throat. Dad puts down his fork.',
          roll: { chance: 0.45,
            success: { effects: { mood: { all: 4 }, chemistry: 3 }, outcome: 'Dad and Rox agree on potholes. They agree loudly. By dessert they are drafting a letter to the city together.' },
            fail: { effects: { burnout: 6 }, outcome: 'Dad has opinions on the snow-route bylaw. So does Rox. The gravy goes cold. The loan comes up again.' } } },
        { label: 'Three plates, say nothing', hint: 'Burnout ↓', effects: { burnout: -5, mood: { benny: 3 } },
          outcome: 'Stuffing, turkey, stuffing again. The loan is not mentioned. It sits at the table. It has seconds.' }
      ] },
    { id: 'holiday_thanksgiving_frost_heave', type: 'scene', speaker: 'fh_delphine', title: 'Laundromat Thanksgiving', once: false, cooldown: 20,
      gate: g({ era: GLS, weekOfYear: [7, 7], notFlags: ['parentsLoan'] }),
      text: "Delphine is hosting Thanksgiving at the Suds-O-Rama for everyone with nowhere else to go: the Thursday wash crowd, two cab " +
        "drivers, a man who only speaks in crossword clues and the band. The turkey is on the folding table. Irma is carving.",
      choices: [
        { label: 'Bring the whole band', hint: 'Chemistry ↑ · Burnout ↓', effects: { chemistry: 5, burnout: -4 },
          outcome: "Moth brings a pie she baked in the van. Nobody asks how. Benny says grace: 'two things I'm thankful for.' He stops at two." },
        { label: 'Play an acoustic set after pie', hint: 'Fans ↑', effects: { fans: 8, mood: { rox: 3 } },
          outcome: 'Punk, unplugged, among the dryers. The crossword man says the set was "a seven-letter word for loud". It was.' },
        { label: 'Leftovers for the week', hint: '+$30 of food · moods ↑', effects: { fund: 30, mood: { all: 3 } },
          outcome: 'Eleven containers of leftovers in the van fridge. Moth rations them fairly. The basement smells like gravy until Tuesday.' }
      ] },
    { id: 'holiday_halloween_frost_heave', type: 'fame', speaker: 'rox', title: 'Halloween Costume Gigs', once: false, cooldown: 20,
      gate: g({ era: GLS, weekOfYear: [8, 8] }),
      text: "Halloween. Every bar in Regina wants costume bands, and the rule is you dress as ANOTHER band. Rox has a proposal, a glue gun " +
        "and four skateboards she found somewhere. Benny is afraid of the proposal.",
      choices: [
        { label: 'Go as the Mall Rats', hint: 'Buzz ↑', effects: { buzz: 6, flags: { costume: '{rival} (the kickflips are mandatory)' } },
          outcome: 'Pre-ripped jeans, sponsor caps, four skateboards. Benny kickflips once and sprains his pride. Siobhan likes the photo.' },
        { label: 'Go as city council', hint: 'Gamble: satire or a summons',
          outcome: 'Rox rents four suits and a gavel.',
          roll: { chance: 0.5,
            success: { effects: { buzz: 10, fans: 15, flags: { costume: 'Regina City Council (in session)' } }, outcome: 'You play the whole set as a council meeting. The crowd votes on the encore. The motion passes.' },
            fail: { effects: { burnout: 6, flags: { costume: 'city council (tabled)' } }, outcome: 'The gavel breaks in song two. The set is tabled. Rox objects to her own costume.' } } },
        { label: 'We ARE the costume', hint: 'Chemistry ↑', effects: { chemistry: 3, flags: { costume: 'Frost Heave (nobody noticed)' } },
          outcome: 'You go as yourselves. Three people compliment the costumes. One says the van is "a bit much". Moth is honoured.' }
      ] },
    { id: 'holiday_grey_mug_frost_heave', type: 'fame', speaker: 'fh_janice', title: 'The Grey Mug Halftime Show', once: true,
      gate: g({ era: S, weekOfYear: [10, 10], minFans: 20000, minYear: 4 }),
      text: "Janice from the Leader-Pest calls first: the Grey Mug wants Frost Heave for the halftime show. Four million people, twelve minutes, " +
        "a stage on wheels in a snowstorm. The whole province is in watermelon helmets. Rox has been preparing for this her entire life.",
      choices: [
        { label: 'Three songs, twelve minutes', hint: 'Fans ↑↑ · buzz ↑↑', effects: { fans: 400, buzz: 18, burnout: 10, flags: { greyMug: 'played' } },
          outcome: 'Six songs, actually. They are ninety seconds each. The whole country hears two chords at once. Rox stage-dives into the band on the field.' },
        { label: 'Council speech at halftime', hint: 'Gamble: history or a meme',
          outcome: 'Rox has a speech about stadium parking. It has sections.',
          roll: { chance: 0.55, stat: 'chemistry', statScale: 0.005,
            success: { effects: { fans: 400, buzz: 18, flags: { greyMug: 'played' } }, outcome: 'Four million people hear about stadium parking. They agree with her. The stadium changes the parking.' },
            fail: { effects: { fans: 250, buzz: 12, mood: { rox: -8 }, flags: { greyMug: 'played' } }, outcome: 'The network cuts to an ad mid-speech. It is a Mall Rats ad. It is a meme by Monday.' } } },
        { label: "We're a basement band. Pass.", hint: 'Chemistry ↑', effects: { chemistry: 6, burnout: -8 },
          outcome: 'You watch the game at the Suds-O-Rama on the TV above the folding table. The halftime band is terrible. You heckle, lovingly.' }
      ] },
    { id: 'holiday_xmas_single_frost_heave', type: 'fame', speaker: 'benny', title: 'The Christmas Single', once: false, cooldown: 20,
      gate: g({ era: S, weekOfYear: [11, 12], flags: ['label'] }),
      text: "The label wants a Christmas single. The pitch: 'Grandma Got Run Over by a Snowplow', with sleigh bells. (If you're DIY, it's " +
        "Mom's pitch. Same song.) Benny points out that 'Jingle Bells' has three chords. He will not be playing it.",
      choices: [
        { label: 'Record it. Two chords only.', hint: 'Fans ↑ · Benny ↑', effects: { fans: 250, fund: 400, mood: { benny: 8 } },
          outcome: 'The two-chord "Jingle Bells" is somehow a hit. It plays in every mall in the country. Including the Mall Rats\' mall.' },
        { label: "'Silent Night (Snow Route)'", hint: 'Gamble: a cult classic or a flop',
          outcome: 'Rox rewrites the lyrics as a snow-route parking ban.',
          roll: { chance: 0.5,
            success: { effects: { buzz: 15, fans: 300 }, outcome: 'Every city worker in the country adopts it. Plow drivers play it on the radio at 4 a.m. A legend.' },
            fail: { effects: { buzz: -6, fund: -300 }, outcome: 'Nobody wants a Christmas song about towing. The label pressed two thousand copies. They are ice scrapers now.' } } },
        { label: 'Refuse. Principles.', hint: 'Chemistry ↑ · label ↓', effects: { chemistry: 5, buzz: -4 },
          outcome: "The label sends a gift basket: 'Disappointed but festive.' Moth eats the fruit. Principles are one thing." }
      ] },
    { id: 'holiday_xmas_parties_frost_heave', type: 'money', speaker: 'fh_irma', title: 'Christmas Party Season', once: false, cooldown: 20,
      gate: g({ era: GLS, weekOfYear: [11, 12] }),
      text: "Irma, holding a clipboard: every office, curling club and laundromat in the district wants a band for its Christmas party, including " +
        "hers. Craig from Craig's Basement is having his annual 'Ugly Sweater Riot'. 'Ugly sweaters mandatory. No screaming at the elderly.'",
      choices: [
        { label: "Craig's Ugly Sweater Riot", hint: 'Books this weekend (if free)', effects: { book: 'craigs_basement', chemistry: 2 },
          outcome: "Craig books you for Saturday. Your sweaters have reindeer. Rox's reindeer is holding a sign that says NO." },
        { label: "Irma's staff party (+$150)", hint: '+$150 · dignity ↓', effects: { fund: 150, mood: { all: -4 } },
          outcome: 'Four hours of carols for three laundromat employees and Delphine. They tip in quarters. Mostly quarters.' },
        { label: "Skip it. It's family time.", hint: 'Burnout ↓', effects: { burnout: -6, chemistry: 2 },
          outcome: "A quiet week. Moth strings lights inside the van. The band sits in it drinking cocoa. Nobody says 'council'. For a whole hour." }
      ] },
    { id: 'holiday_st_paddys_frost_heave', type: 'weird', speaker: 'benny', title: "St. Paddy's Pub Crawl", once: false, cooldown: 20,
      gate: g({ era: GLS, weekOfYear: [18, 18] }),
      text: "St. Patrick's Day. Every pub on Dewdney is booking bands and dyeing everything green. Benny has learned that most jigs can be played " +
        "with two chords 'if you believe'. He has dyed his guitar strap. And his eyebrows.",
      choices: [
        { label: 'Play the pub circuit', hint: 'Fans ↑ · burnout ↑', effects: { fans: 15, buzz: 4, burnout: 6 },
          outcome: 'Three pubs in one night. A fiddle player follows you between them. Benny teaches him two chords. The fiddler cries.' },
        { label: 'Punk jig night', hint: 'Buzz ↑', effects: { buzz: 6, mood: { benny: 4 } },
          outcome: 'A two-chord jig at 220 BPM. The dancers try. The dancers fail gloriously. A new genre is born and immediately regretted.' },
        { label: 'Hide in the basement', hint: 'Burnout ↓', effects: { burnout: -5 },
          outcome: 'You rehearse while the city goes green overhead. Benny keeps the eyebrows. For months.' }
      ] },

    // ---- Local Heroes (L / LS; local magnitudes) ------------------------------------------------------------------------
    { id: 'fh_local_recognized', type: 'fame', speaker: 'rox', title: 'Recognized at Council', once: false, cooldown: 9, gate: g({ era: LS }),
      text: "At council, during public comment, a teenager in the gallery shouts 'FROST HEAVE!' before Rox has said a word. The mayor asks " +
        "who Frost Heave is. Half the gallery turns around to explain. Rox has four minutes left on the clock.",
      choices: [
        { label: 'Use the four minutes', hint: 'Buzz ↑ · Rox ↑', effects: { buzz: 8, mood: { rox: 8 } },
          outcome: 'Four minutes on snow routes, then one line of a chorus. The gallery sings the rest. It is in the minutes as "applause (sustained)".' },
        { label: 'Sign autographs in the lobby', hint: 'Fans ↑ · Burnout ↑', effects: { fans: 30, burnout: 5 },
          outcome: 'Forty autographs on the backs of council agendas. One on a parking ticket. Rox signs it "appeal this".' },
        { label: 'Stay on topic', hint: 'Chemistry ↑', effects: { chemistry: 3, mood: { rox: -4 } },
          outcome: 'Rox finishes her comment on sidewalk salt. It is very good. The teenager stays for the whole meeting. That is love.' }
      ] },
    { id: 'fh_local_loudest_export', type: 'fame', speaker: 'fh_janice', title: "Regina's Loudest Export", gate: g({ era: L, minFans: 300 }),
      text: "The Leader-Pest runs a weekend cover story: 'REGINA'S LOUDEST EXPORT'. The photo is the band on the frost heave. Janice wants a " +
        "follow-up interview, 'something personal'. Moth has already said no for everyone.",
      choices: [
        { label: 'Rox gives the interview', hint: 'Buzz ↑ · Fans ↑', effects: { buzz: 10, fans: 60 },
          outcome: "The 'personal' interview is about the snow-route bylaw. It is the most-read story of the month. Janice gets a raise." },
        { label: 'Benny gives the interview', hint: 'Benny ↑ · Fans ↑', effects: { mood: { benny: 8 }, fans: 40 },
          outcome: "Benny answers every question in two words. Janice runs it as a poem. It wins a regional journalism award." },
        { label: "Respect Moth's no", hint: 'Moth ↑ · Chemistry ↑', effects: { mood: { moth: 10 }, chemistry: 4 },
          outcome: "The follow-up is cancelled. Janice runs 'NO COMMENT FROM REGINA'S LOUDEST EXPORT'. It is somehow even more punk." }
      ] },
    { id: 'fh_local_fight_song', type: 'scene', speaker: 'rox', title: 'The Football Team Calls', gate: g({ era: L, minFans: 400 }),
      text: "The city's football team wants a new song to play when the defence runs out. Forty thousand people in watermelon helmets. Rox " +
        "will do it on one condition: the song is about the stadium's parking plan. The team's marketing guy is sweating.",
      choices: [
        { label: 'Write it about parking', hint: 'Buzz ↑ · Rox ↑', effects: { buzz: 12, mood: { rox: 10 }, fund: 300 },
          outcome: "'Lot C Is Full' plays after every sack. Forty thousand people scream about parking. The stadium changes its parking plan." },
        { label: 'Write a normal fight song', hint: '+$400 · Rox ↓', effects: { fund: 400, mood: { rox: -8 } },
          outcome: "It is catchy and generic and pays well. Rox refuses to be credited. The credit reads 'Frost Heave (minus one)'." },
        { label: 'Decline. We play for ourselves.', hint: 'Chemistry ↑', effects: { chemistry: 5, buzz: 3 },
          outcome: 'The team goes with a jingle. It is terrible. Every time they play it, someone in the stands yells "WE WANT FROST HEAVE".' }
      ] },
    { id: 'fh_local_house_show', type: 'scene', speaker: 'benny', title: 'A Cathedral House Show', once: false, cooldown: 10, gate: g({ era: LS }),
      text: "A house show in the Cathedral neighbourhood: a basement ceiling of five foot eleven, a furnace in the corner and eighty people on " +
        "the stairs. The host's parents are 'at the lake'. The host's parents have not been told there is a lake.",
      choices: [
        { label: 'Play it. Mind the ceiling.', hint: 'Fans ↑ · Burnout ↑', effects: { fans: 40, burnout: 6 },
          outcome: 'Rox stage-dives and immediately hits the ceiling. The crowd catches her anyway. It is the best show of the month.' },
        { label: 'Charge a toonie at the door', hint: '+$160 · Chemistry ↓', effects: { fund: 160, chemistry: -2 },
          outcome: 'Eighty toonies in a cereal bowl. Benny says charging at a house show is "a third chord of the heart".' },
        { label: 'Unplugged, for the neighbours', hint: 'Chemistry ↑', effects: { chemistry: 5, fans: 15 },
          outcome: 'An unplugged set in a basement. You can hear the furnace. You can hear the crowd singing. Nobody calls the police. A miracle.' }
      ] },
    { id: 'fh_local_patches', type: 'money', speaker: 'moth', title: 'Sewing Patches', gate: g({ era: LS }),
      text: "Moth has a sewing machine in the van. She has offered to sew Frost Heave patches, by hand, for the merch table: a pothole with a " +
        "crown on it. She will need $80 in fabric and nobody may talk to her for a week.",
      choices: [
        { label: 'Fund the patches ($80)', hint: '−$80 · Fans ↑ · Moth ↑', effects: { fund: -80, fans: 30, mood: { moth: 8 } },
          outcome: 'Two hundred patches, each slightly different. They sell out in two shows. People sew them onto everything, including a dog.' },
        { label: 'Everyone learns to sew', hint: 'Chemistry ↑ · Burnout ↑', effects: { chemistry: 6, burnout: 6 },
          outcome: "Four people, one sewing machine, one van. Benny's patches have two stitches each. Rox sews a manifesto onto hers." },
        { label: 'Order them online', hint: '−$120 · Moth ↓', effects: { fund: -120, mood: { moth: -6 } },
          outcome: 'The patches arrive perfect and soulless. Moth unpicks one and re-sews it by hand, just to make a point.' }
      ] },
    { id: 'fh_local_dive_bylaw', type: 'weird', speaker: 'fh_pomeroy', title: 'The Stage Dive Bylaw', gate: g({ era: LS, flags: ['roxDive'] }),
      text: "Council has passed a bylaw banning 'recreational descents from elevated platforms into assembled persons' within city limits. " +
        "It is aimed at exactly one person. Pomeroy moved it. Rox has read it nine times and highlighted the loophole.",
      choices: [
        { label: 'Dive just outside city limits', hint: 'Buzz ↑ · Fans ↑', effects: { buzz: 10, fans: 40, fund: -60 },
          outcome: 'A show in a field one metre past the city limit sign. Two hundred people. One stage dive. Legal. Historic.' },
        { label: 'Dive anyway. Get fined.', hint: 'Gamble: civil disobedience',
          outcome: 'Rox climbs the speaker stack at the Pile o\' Bones.',
          roll: { chance: 0.5,
            success: { effects: { buzz: 15, mood: { rox: 12 } }, outcome: 'The bylaw officer in the crowd catches her. He says "I didn\'t see anything" and puts her down.' },
            fail: { effects: { fund: -250, mood: { rox: 6 } }, outcome: 'A $250 fine. Rox frames it. The frame costs more than the fine.' } } },
        { label: 'Challenge it at council', hint: 'Rox ↑ · Chemistry ↑', effects: { mood: { rox: 10 }, chemistry: 4 },
          outcome: 'Rox argues for ninety minutes. The bylaw is amended to allow dives "into consenting assemblies". She considers it a win.' }
      ] },
    { id: 'fh_local_copycats', type: 'scene', speaker: 'rox', title: 'Two-Chord Copycats', gate: g({ era: L, minFans: 500 }),
      text: "There are three new punk bands in Moose Jaw and all of them use exactly two chords. One is called Frost Heaving. One is called " +
        "The Potholes. One is Benny's cousin. Benny is torn between pride and a lawsuit.",
      choices: [
        { label: 'Book them all as openers', hint: 'Fans ↑ · Chemistry ↑', effects: { fans: 50, chemistry: 4 },
          outcome: 'A four-band bill, eight chords total. The scene has a name now: Two-Chord City. Janice uses it in a headline.' },
        { label: 'Send a cease-and-desist', hint: 'Buzz ↑ · Benny ↓', effects: { buzz: 6, mood: { benny: -6 } },
          outcome: 'Rox writes it. It is mostly about council. Frost Heaving changes its name to Frost Heaved. Nobody wins.' },
        { label: 'Teach them a third chord', hint: 'Gamble: sabotage',
          outcome: 'You leave a G chord chart at their rehearsal space.',
          roll: { chance: 0.5,
            success: { effects: { buzz: 8, mood: { benny: 8 } }, outcome: 'Two bands learn it. They are ruined. They start sounding like the Mall Rats. Benny is at peace.' },
            fail: { effects: { mood: { benny: -8 } }, outcome: "Benny's cousin writes a hit with three chords. Benny doesn't speak to him until Christmas." } } }
      ] },
    { id: 'fh_local_van_offer', type: 'money', speaker: 'moth', title: 'Someone Wants the Van', gate: g({ era: LS, minFans: 250 }),
      text: "A man in a fleece vest has offered $2,000 for the Pothole, cash, as a 'vintage camper conversion'. The band could use $2,000. " +
        "The Pothole is Moth's apartment. Moth has gone very, very quiet.",
      choices: [
        { label: "It's not for sale. It's a home.", hint: 'Moth ↑↑ · Chemistry ↑', effects: { mood: { moth: 15 }, chemistry: 6 },
          outcome: "Moth thanks everyone, individually, which she has never done. The man in the vest buys a shirt and leaves." },
        { label: 'Ask what he thinks it is worth', hint: 'Gamble: flattery',
          outcome: 'Rox asks him to describe the van\'s best feature.',
          roll: { chance: 0.5,
            success: { effects: { buzz: 6, mood: { moth: 8 } }, outcome: 'He describes the curtains for five minutes. Moth invites him in for tea. He leaves with a new respect.' },
            fail: { effects: { mood: { moth: -8 } }, outcome: "He calls the curtains 'removable'. Moth closes the door on him. Gently. Permanently." } } },
        { label: 'Take the money', hint: '+$400 deposit · Moth ↓↓', effects: { fund: 400, mood: { moth: -18 } },
          outcome: 'You take a deposit. Moth locks herself in the van until you give it back. You give it back. The man keeps the vest.' }
      ] },
    { id: 'fh_local_two_string', type: 'drama', speaker: 'benny', title: 'The Two-String Guitar', gate: g({ era: L, minFans: 350 }),
      text: "A small guitar company in Winnipeg wants to build Benny a signature model: two strings, two frets, no dots. They want to call it " +
        "The Principle. Benny has to demo it at a trade show. There will be people there who know seven chords.",
      choices: [
        { label: 'Build The Principle', hint: 'Benny ↑↑ · Buzz ↑', effects: { mood: { benny: 15 }, buzz: 8 },
          outcome: 'It is beautiful. It is useless. It sells forty units to people who want to make a point. Benny sleeps with it.' },
        { label: 'Negotiate a third string', hint: 'Benny ↓↓ · Fans ↑', effects: { mood: { benny: -12 }, fans: 40 },
          outcome: 'Benny walks out of the meeting. The company builds a three-string version and sells it to jazz kids. It is a hit. Benny is ruined.' },
        { label: 'Just the free guitar, please', hint: 'Skill ↑ · Chemistry ↑', effects: { skill: { benny: 2 }, chemistry: 3 },
          outcome: "They send a regular guitar as a thank-you. Benny tapes over four strings and calls it 'a restoration'." }
      ] },
    { id: 'fh_local_ward_duties', type: 'drama', speaker: 'rox', title: 'Councillor Duties', gate: g({ era: LS, flagEquals: { council: 'won' } }),
      text: "Councillor Delorme has a budget meeting on the same night as the Pile o' Bones show. The meeting is about potholes. The show is " +
        "sold out. Rox is standing in the basement in a blazer over a band shirt, holding both agendas.",
      choices: [
        { label: 'The meeting. Potholes first.', hint: 'Rox ↑ · Fans ↓ risk', effects: { mood: { rox: 10 }, buzz: -3 },
          outcome: 'You play the show as a three-piece with a cardboard cutout of Rox. The pothole budget passes. Everyone is a winner.' },
        { label: 'The show. Council can wait.', hint: 'Fans ↑ · Rox ↓', effects: { fans: 50, mood: { rox: -8 } },
          outcome: 'A great show. The pothole budget passes without her. Rox is furious at democracy for working without her.' },
        { label: 'Livestream both', hint: 'Gamble: split screen',
          outcome: 'Rox sets up two phones and a megaphone.',
          roll: { chance: 0.45,
            success: { effects: { buzz: 14, fans: 40 }, outcome: 'She votes from the stage between songs. The motion passes 7-3. The crowd chants the vote count.' },
            fail: { effects: { burnout: 8, mood: { rox: -6 } }, outcome: 'The feeds get crossed. Council hears the chorus. The crowd hears the budget. Both are confused.' } } }
      ] },
    { id: 'fh_local_committee', type: 'drama', speaker: 'fh_pomeroy', title: 'A Committee Seat', gate: g({ era: LS, flagEquals: { council: 'lost' } }),
      text: "Councillor Pomeroy calls. He wants Rox on the Transit Advisory Committee. 'Keep your enemies close,' he says, 'and on a committee.' " +
        "It meets Tuesdays. Rehearsal is Tuesdays. Rox has never been happier or more conflicted.",
      choices: [
        { label: 'Take the seat', hint: 'Rox ↑↑ · Burnout ↑', effects: { mood: { rox: 14 }, burnout: 6 },
          outcome: "Rox gets a lanyard. She wears it on stage. Three bus routes are fixed within a year. 'Concession Stand' gets a second verse." },
        { label: 'Move rehearsal to Wednesdays', hint: 'Chemistry ↑', effects: { chemistry: 5, mood: { moth: -4 } },
          outcome: 'Wednesdays are laundry day. Moth is grumpy. Rox is on a committee. Balance, of a kind.' },
        { label: 'Refuse. On principle.', hint: 'Buzz ↑ · Rox ↓', effects: { buzz: 6, mood: { rox: -6 } },
          outcome: 'Rox refuses by megaphone, from the gallery. Pomeroy says the offer stands. Rox writes a song called "The Offer Stands".' }
      ] },
    { id: 'fh_local_record_store', type: 'fame', speaker: 'benny', title: 'In the Window', gate: g({ era: L, minFans: 300 }),
      text: "The record store on Broad Street has put your tape in the front window, between a jazz legend and a polka compilation. There is a " +
        "hand-written card: 'LOCAL! LOUD! TWO CHORDS!' Benny has visited it every day this week. He just stands there.",
      choices: [
        { label: 'Play an in-store', hint: 'Fans ↑ · Buzz ↑', effects: { fans: 50, buzz: 6 },
          outcome: 'Sixty people in the aisles. A box of polka records falls over during the dive. The owner says it is the best day of his year.' },
        { label: 'Sign the tapes', hint: '+$120', effects: { fund: 120, chemistry: 2 },
          outcome: 'Forty signed tapes. Benny signs his with two lines. The owner charges double for his.' },
        { label: 'Buy the jazz record', hint: 'Gamble: Benny listens',
          outcome: 'Benny buys the jazz legend\'s album. He takes it home.',
          roll: { chance: 0.5,
            success: { effects: { skill: { benny: 2 }, mood: { benny: 4 } }, outcome: 'He listens once. He hears the space between the notes. His two chords get better. Still two.' },
            fail: { effects: { mood: { benny: -8 } }, outcome: 'He counts the chords. He loses count at forty. He does not come to rehearsal for a week.' } } }
      ] },
    { id: 'fh_local_winnipeg', type: 'road', speaker: 'moth', title: 'The Winnipeg Run', gate: g({ era: LS, minFans: 500 }),
      text: "A real show in Winnipeg: five hundred and seventy kilometres of Trans-Canada, a headwind the whole way and a van that is also " +
        "somebody's home. Moth wants to leave at 5 a.m. Rox wants to stop at every town hall on the way to 'observe'.",
      choices: [
        { label: '5 a.m. Moth rules the road.', hint: 'Moth ↑ · Burnout ↑', effects: { mood: { moth: 8 }, burnout: 6, fans: 30 },
          outcome: 'You arrive nine hours early and nap in the van, in shifts, in Moth\'s bed, with permission. The show is excellent.' },
        { label: 'Stop at every town hall', hint: 'Rox ↑ · Buzz ↑', effects: { mood: { rox: 10 }, buzz: 6, burnout: 8 },
          outcome: 'Eleven town halls. Rox makes public comment at two of them. You arrive at 9:58 for a 10:00 set. It is the best set of the year.' },
        { label: 'Take the bus. Leave the van.', hint: '−$240 · Moth ↓↓', effects: { fund: -240, mood: { moth: -12 } },
          outcome: 'Moth refuses to leave her home and drives alone behind the bus the whole way. It costs more and saves nothing.' }
      ] },

    // ---- Signed (S; signed magnitudes) ---------------------------------------------------------------------------------
    { id: 'fh_signed_video', type: 'fame', speaker: 'rox', title: 'The Music Video', gate: g({ era: S }),
      text: "The label is paying for a real music video. Rox wants to shoot it in council chambers during a meeting. City hall has said no, " +
        "in writing, twice. The director suggests 'a laundromat, for authenticity'. Irma is already negotiating her fee.",
      choices: [
        { label: 'Shoot it in the Suds-O-Rama', hint: 'Fans ↑ · −$300', effects: { fans: 250, fund: -300, buzz: 10 },
          outcome: "Nine dryers spinning in slow motion, lint in the air like snow, Delphine as the lead actress. Irma's fee is a new change machine." },
        { label: 'Shoot at council anyway', hint: 'Gamble: guerrilla filmmaking',
          outcome: 'You walk in during the public gallery with a camera hidden in a bag of lawn signs.',
          roll: { chance: 0.4, stat: 'buzz', statScale: 0.005,
            success: { effects: { buzz: 18, fans: 350 }, outcome: 'Four minutes of footage before security notices. It is the most-watched video in the province.' },
            fail: { effects: { fund: -800, mood: { rox: 10 } }, outcome: 'The fine is $800. The footage is of a security guard\'s hand. Rox calls it art.' } } },
        { label: 'A video in the van', hint: 'Chemistry ↑ · Moth ↑', effects: { chemistry: 6, mood: { moth: 12 }, fans: 150 },
          outcome: "A whole video in a minivan: four people, one cat, forty socks. Moth approves the final cut. It's her place." }
      ] },
    { id: 'fh_signed_royalties', type: 'money', speaker: 'benny', title: 'The Royalty Statement', gate: g({ era: S }),
      text: "The first royalty statement is eleven pages. Benny has read it with a highlighter and found the line he was looking for: a " +
        "songwriting split. He believes each chord should be credited. There are two. He would like his name on both.",
      choices: [
        { label: 'Credit the chords', hint: 'Benny ↑ · Chemistry ↓', effects: { mood: { benny: 14 }, chemistry: -3 },
          outcome: "Every song now lists 'Chord 1: Benny Mahon. Chord 2: Benny Mahon.' The label's lawyer asks if this is a joke. It isn't." },
        { label: 'Split it four ways', hint: 'Chemistry ↑↑', effects: { chemistry: 8, mood: { benny: -5 } },
          outcome: 'Equal splits, forever. Benny grumbles, then buys everyone a pizza with his cut. He says it is "an investment in two slices each".' },
        { label: 'Spend it on the van', hint: '+$600 to the fund · Moth ↑', effects: { fund: 600, mood: { moth: 10 } },
          outcome: 'The royalties go into the band fund, earmarked "van". Moth installs a small shelf and an actual smoke detector.' }
      ] },
    { id: 'fh_signed_tour_bus', type: 'drama', speaker: 'moth', title: 'The Label Offers a Bus', gate: g({ era: S }),
      text: "The label wants to put the band on a rented tour bus: bunks, a lounge, a driver named Gary. Moth has been told this in person. " +
        "She has not said anything. She has gone to the van and locked the doors. The curtains are closed.",
      choices: [
        { label: 'Stay in the van', hint: 'Moth ↑↑ · Burnout ↑', effects: { mood: { moth: 18 }, burnout: 8 },
          outcome: "You tell the label no. Moth opens the curtains, then the door, then the fridge. There is a cake inside that says THANK YOU." },
        { label: 'Bus for the band, van for Moth', hint: '−$600 · Chemistry ↓', effects: { fund: -600, chemistry: -4, mood: { moth: 6 } },
          outcome: 'The bus drives ahead. Moth follows in the Pothole, alone, happily, every mile. Gary waves at her at every rest stop.' },
        { label: 'Take the bus. Moth will adjust.', hint: 'Gamble: Moth adjusts?',
          outcome: 'You carry Moth\'s laundry basket onto the bus.',
          roll: { chance: 0.3,
            success: { effects: { chemistry: 6, burnout: -8 }, outcome: 'Moth takes the bottom bunk and hangs her laundry in the lounge. It is her apartment now. Gary is evicted.' },
            fail: { effects: { mood: { moth: -18 }, chemistry: -6 }, outcome: 'Moth rides the bus in total silence for one day, then walks back to the van at a truck stop. She is gone for a week.' } } }
      ] },
    { id: 'fh_signed_parents', type: 'drama', speaker: 'mom', title: 'Mom Saw the Video', gate: g({ era: S, minWeek: 70 }),
      text: "Mom saw the band on TV. She has called everyone she knows, including the dentist. Dad bought a band shirt and wears it to the " +
        "hardware store. They want to host a listening party at the house. The neighbours have already been invited. By Mom.",
      choices: [
        { label: 'Host the listening party', hint: 'Chemistry ↑ · Everyone ↑', effects: { chemistry: 6, mood: { all: 8 } },
          outcome: 'Forty people in the living room, the album on Dad\'s stereo. Rox stage-dives onto the couch. Mom puts it in the family newsletter.' },
        { label: 'Bring them to a show', hint: 'Fans ↑', effects: { fans: 200, burnout: 4 },
          outcome: 'Mom and Dad stand at the back in earplugs. Dad nods on two and four. Mom films the whole thing, vertically.' },
        { label: 'Just say thank you', hint: 'Burnout ↓', effects: { burnout: -8, chemistry: 3 },
          outcome: "You call and say thank you, for everything, for the loan and the casseroles. Mom cries. Dad says 'don't make it weird, bud'." }
      ] },
    { id: 'fh_signed_morning_tv', type: 'fame', speaker: 'rox', title: 'Morning TV in Toronto', gate: g({ era: S, minFans: 4000 }),
      text: "A national morning show has booked Frost Heave: one song, live, at 7:40 a.m. in Toronto. It is the Mall Rats' network. The host " +
        "has a card that says 'ask about the Mall Rats'. Siobhan is in the green room, eating the band's fruit.",
      choices: [
        { label: 'Play it straight', hint: 'Fans ↑↑', effects: { fans: 400, buzz: 10 },
          outcome: 'Ninety seconds, two chords, one dive into the studio audience of forty seniors. They catch her. The whole country is awake now.' },
        { label: 'Rox answers the Mall Rats card', hint: 'Gamble: live TV',
          outcome: "The host asks: 'So, the Mall Rats...?'",
          roll: { chance: 0.5,
            success: { effects: { buzz: 18, fans: 300 }, outcome: "Rox: 'Kevin is a lovely boy from Oakville.' The clip plays for a week. Blaze reposts it. He means it." },
            fail: { effects: { buzz: 8, mood: { rox: -8 } }, outcome: 'The network cuts to weather mid-sentence. The weather is also on their network. It is sunny in Toronto.' } } },
        { label: 'Steal back the fruit', hint: 'Chemistry ↑ · Buzz ↑', effects: { chemistry: 6, buzz: 6 },
          outcome: 'Moth reclaims the fruit tray from Siobhan without a word. Siobhan respects it. The segment goes great. The fruit was great.' }
      ] },
    { id: 'fh_signed_rent_hike', type: 'money', speaker: 'fh_irma', title: 'Irma Raises the Rent', gate: g({ era: S }),
      text: "Irma has seen you on TV. The basement rent is now $400 a month, 'celebrity rate'. She has also put a plaque on the stairs: " +
        "FROST HEAVE PRACTISED HERE (AND STILL DOES) (RENT DUE THE FIRST). Delphine is selling tours of the basement for $5.",
      choices: [
        { label: 'Pay it. It is home.', hint: '−$400 · Chemistry ↑', effects: { fund: -400, chemistry: 6 },
          outcome: 'Irma folds the cheque into her apron. The mop stays silent. She sometimes comes down to listen now, without notes.' },
        { label: 'Negotiate: a free show a month', hint: 'Fans ↑ · Burnout ↑', effects: { fans: 150, burnout: 6 },
          outcome: 'One free show a month upstairs, among the dryers. Irma sells pop at double price. Everyone makes money. Especially Irma.' },
        { label: 'Take a cut of the tours', hint: '+$300 · Moth ↓', effects: { fund: 300, mood: { moth: -5 } },
          outcome: "Delphine gives the band a cut. Tourists take photos of the lint bin. One asks to see 'where Moth lives'. Moth says no." }
      ] },
    { id: 'fh_signed_network_party', type: 'scene', speaker: 'mr_blaze', title: "The Network's Party", gate: g({ era: S }),
      text: "{rival} have invited you to their network's industry party in Toronto: an open bar, a halfpipe and a DJ who is also a skateboard. " +
        "Blaze's text says 'u guys HAVE to come!! (Siobhan says u have to come)'. Rox is already writing a speech.",
      choices: [
        { label: 'Go, and behave', hint: 'Fans ↑ · Rox ↓', effects: { fans: 200, mood: { rox: -8 } },
          outcome: "You network. Moth talks to a VP about carburetors. You leave with three business cards and a free sneaker, one only." },
        { label: 'Go, and misbehave', hint: 'Gamble: a scene, on camera',
          outcome: 'Rox takes the DJ\'s microphone.',
          roll: { chance: 0.5,
            success: { effects: { buzz: 18, fans: 250 }, outcome: 'A two-chord set on the halfpipe, unplanned, unpermitted. Blaze joins in. He kickflips. He lands it. Everyone films it.' },
            fail: { effects: { buzz: 8, fund: -500 }, outcome: 'Security, a halfpipe repair bill and a clip of Rox being carried out, still singing. Siobhan sends it to the label.' } } },
        { label: 'Stay home. Play a basement show.', hint: 'Chemistry ↑', effects: { chemistry: 8, fans: 60 },
          outcome: 'The same night, same hour, under the Suds-O-Rama. Sixty people, no halfpipe. Blaze watches the livestream and sends a heart.' }
      ] },
    { id: 'fh_signed_delphine_tattoo', type: 'fame', speaker: 'fh_delphine', title: "Delphine's Tattoo", gate: g({ era: S }),
      text: "Delphine, seventy-one, has gotten her first tattoo: washing machine number 6, with the band's name in the window. She wants to show " +
        "it to the band. It is on her ankle. It took three hours. She says it didn't hurt. It hurt.",
      choices: [
        { label: 'Put her on the album cover', hint: 'Fans ↑ · Buzz ↑', effects: { fans: 200, buzz: 10 },
          outcome: "The next record's cover is Delphine's ankle. It is the most beautiful thing the band has ever released. Delphine signs copies." },
        { label: 'The whole band gets one', hint: 'Chemistry ↑↑', effects: { chemistry: 10, fund: -400 },
          outcome: 'Four tiny washing machines. Benny gets two, one for each chord. Moth gets hers on the van\'s dashboard, somehow.' },
        { label: 'A lifetime guest-list spot', hint: 'Superfan ♥', effects: { chemistry: 4, mood: { all: 5 } },
          outcome: 'Delphine gets a laminated card: DELPHINE, ALL SHOWS, FOREVER. She has laminated the lamination.' }
      ] },
    { id: 'fh_signed_rider', type: 'money', speaker: 'moth', title: 'The Rider', gate: g({ era: S }),
      text: "Venues are asking for a rider now. Rox wants a copy of every local bylaw. Benny wants two picks, 'no more'. Moth has written one " +
        "line: 'Access to a washer and dryer.' The promoter in Calgary has called to ask if this is a joke. It isn't.",
      choices: [
        { label: 'Send the rider as written', hint: 'Buzz ↑ · Moth ↑', effects: { buzz: 8, mood: { moth: 10 } },
          outcome: "Word gets around. Venues start keeping a washer backstage for 'the Regina punks'. Moth rates each one in a notebook." },
        { label: 'Add a real rider', hint: '−$300 · Everyone ↑', effects: { fund: -300, mood: { all: 6 } },
          outcome: 'Hot food, water, towels. Rox adds "one (1) bylaw". The promoters find this charming. Rox finds it necessary.' },
        { label: 'No rider. Punk.', hint: 'Chemistry ↑ · Burnout ↑', effects: { chemistry: 5, burnout: 6 },
          outcome: 'You eat gas-station sandwiches in the van before every show. Moth does the laundry at twenty-four-hour laundromats. It is home.' }
      ] },
    { id: 'fh_signed_japan_zine', type: 'fame', speaker: 'benny', title: 'A Zine From Tokyo', gate: g({ era: S, minFans: 3000 }),
      text: "A zine has arrived from Tokyo, forty pages, entirely about Benny's two chords. There are diagrams. There is a four-page interview " +
        "with Benny that Benny does not remember giving. The translation of the cover is 'THE MAN WHO STOPPED AT TWO'.",
      choices: [
        { label: 'Frame it', hint: 'Benny ↑↑', effects: { mood: { benny: 18 } },
          outcome: 'It goes on the basement wall next to the manifesto. Benny touches it for luck before every show.' },
        { label: 'Write back, in two words', hint: 'Buzz ↑ · Fans ↑', effects: { buzz: 10, fans: 200 },
          outcome: "Benny writes 'THANK YOU'. The zine prints it as the cover of issue two. Japan is waiting for you now." },
        { label: 'Answer the interview for real', hint: 'Gamble: Benny talks',
          outcome: 'Benny sits down to write real answers.',
          roll: { chance: 0.5,
            success: { effects: { buzz: 12, mood: { benny: 8 } }, outcome: 'The answers are profound and very short. The zine calls him "a minimalist sage". He buys a new hat about it.' },
            fail: { effects: { mood: { benny: -6 }, burnout: 5 }, outcome: 'He writes nine pages about the third chord. Why he hates it. He realizes he has thought about it a lot.' } } }
      ] },
    { id: 'fh_signed_old_basement', type: 'drama', speaker: 'rox', title: 'Back in the Basement', gate: g({ era: S, minWeek: 100 }),
      text: "You have a real rehearsal space now, but Rox has asked everyone to meet in the old basement under the Suds-O-Rama, for one night. " +
        "Nothing has changed. The dryers still thump at 190. Irma still has the mop. Somebody left the G chord chart on the wall.",
      choices: [
        { label: 'Play the first set again', hint: 'Chemistry ↑↑ · Everyone ↑', effects: { chemistry: 10, mood: { all: 10 } },
          outcome: 'You play the first eight songs you ever wrote, in order, to nobody. Irma bangs the ceiling in time. Nobody talks for a while after.' },
        { label: 'Record it for the fans', hint: 'Fans ↑ · Buzz ↑', effects: { fans: 300, buzz: 12 },
          outcome: "'Live Under the Suds-O-Rama' is released as a surprise. The dryer is credited on percussion. Irma demands royalties." },
        { label: 'Leave the chart. Just go.', hint: 'Burnout ↓', effects: { burnout: -10, mood: { benny: 6 } },
          outcome: 'Benny takes the G chord chart down, folds it and puts it in his pocket. He will never say why. He keeps it forever.' }
      ] },
    { id: 'fh_signed_third_chord_offer', type: 'drama', speaker: 'benny', title: 'A Very Large Offer', gate: g({ era: S, minFans: 5000 }),
      text: "A famous producer, the one with the sunglasses and the hits, has offered Benny $1,000 to play a third chord on one song. One " +
        "chord. One bar. Nobody will know. Benny has not slept. He has been sitting in Moth's van with the curtains closed.",
      choices: [
        { label: 'Benny, it is your call', hint: 'Gamble: the principle',
          outcome: 'Benny steps out of the van at dawn. He has decided.',
          roll: { chance: 0.5,
            success: { effects: { mood: { benny: 18 }, buzz: 12 }, outcome: 'He says no. The producer calls it "the most punk thing I have ever seen" and uses the story in his memoir.' },
            fail: { effects: { fund: 1000, mood: { benny: -15 } }, outcome: 'He takes it. He plays the chord. It sounds fine. He donates the money and never speaks of it again.' } } },
        { label: 'Counter: two chords, double pay', hint: '+$1,200 · Benny ↑', effects: { fund: 1200, mood: { benny: 10 } },
          outcome: "The producer laughs and pays for two chords. Benny's two. On a pop song. It goes gold. Benny is quietly unbearable." },
        { label: "Tell him to get lost", hint: 'Chemistry ↑ · Rox ↑', effects: { chemistry: 8, mood: { rox: 8 } },
          outcome: "Rox tells him with the megaphone, from the curb. The producer takes it well. His sunglasses do not." }
      ] },

    // ---- Signed: label cards (sim flag `label`); demand cards write flags.demand<Kind> (labels.demandsByBand below) --------
    { id: 'signed_fh_monolith_bylaws', type: 'drama', speaker: 'rox', title: 'Notes From Monolith', weight: 2,
      gate: g({ era: S, flagEquals: { label: 'monolith' } }),
      text: "Monolith has notes on the demos. 'Love the energy. Love the anger. Can the lyrics be in plain English? Fewer bylaw numbers, " +
        "more feelings?' Rox has not blinked in four minutes. Moth has moved to stand between Rox and the speakerphone.",
      choices: [
        { label: 'Tell Monolith no', hint: 'Rox ↑↑ · Buzz ↑ · promo ↓', effects: { mood: { rox: 14 }, buzz: 6, fund: -400, flags: { demandEnglish: 'refused' } },
          outcome: 'Rox writes the reply herself. It cites three bylaws by number. Monolith trims the promo budget by $400. Rox frames the email.' },
        { label: 'One song about feelings', hint: 'Fans ↑ · Rox ↓', effects: { fans: 150, mood: { rox: -8 }, flags: { demandEnglish: 'half' } },
          outcome: "Rox writes one song about feelings. The feeling is rage about a zoning variance. Radio plays it anyway. It charts." },
        { label: 'Feelings ABOUT bylaws', hint: 'Gamble: the compromise',
          outcome: 'Rox writes a love song to a bylaw.',
          roll: { chance: 0.5, stat: 'chemistry', statScale: 0.005,
            success: { effects: { fans: 250, buzz: 12, flags: { demandEnglish: 'met' } }, outcome: "'Bylaw, Be Mine' is a hit. Critics call it 'the most romantic song about municipal government ever'. Monolith calls it a strategy." },
            fail: { effects: { buzz: -6, mood: { rox: -6 }, flags: { demandEnglish: 'half' } }, outcome: 'It is a love song. To Pomeroy. By accident. Nobody recovers. Especially Pomeroy.' } } }
      ] },
    { id: 'signed_fh_monolith_radio', type: 'drama', speaker: 'benny', title: 'The Radio Edit (Longer)', weight: 2,
      gate: g({ era: S, flagEquals: { label: 'monolith' } }),
      text: "Monolith needs a radio edit of the lead single. The problem: the single is 1:12. Radio needs at least 2:30. Monolith wants " +
        "'a bridge, a key change and maybe a third chord for the lift'. Benny has locked himself in the van. Moth let him.",
      choices: [
        { label: 'Play it twice. Back to back.', hint: 'Fans ↑ · Benny ↑', effects: { fans: 200, mood: { benny: 8 }, flags: { demandRadio: 'met' } },
          outcome: 'The radio edit is the song, twice, with a four-second gap. Radio plays it every hour. Nobody notices. Benny is vindicated.' },
        { label: 'Add a bridge (two chords)', hint: 'Gamble: a bridge, or a crisis',
          outcome: 'Benny comes out of the van for the bridge. Only for the bridge.',
          roll: { chance: 0.5,
            success: { effects: { buzz: 14, fans: 180, flags: { demandRadio: 'met' } }, outcome: 'The bridge is chord two, then chord one. It changes everything. It changes nothing. It charts.' },
            fail: { effects: { fund: -600, mood: { benny: -8 }, flags: { demandRadio: 'refused' } }, outcome: 'Benny cannot find a bridge that is not a third chord. Monolith sends a memo and an invoice for $600.' } } },
        { label: 'Refuse the lift', hint: 'Benny ↑↑ · label ↓', effects: { mood: { benny: 14 }, buzz: 4, flags: { demandRadio: 'refused' } },
          outcome: "Benny writes 'NO LIFT' on the master tape box. Monolith releases the 1:12 version as 'a statement'. It is one." }
      ] },
    { id: 'signed_fh_monolith_image', type: 'drama', speaker: 'moth', title: 'The Image Consultant', gate: g({ era: S, flagEquals: { label: 'monolith' } }),
      text: "Monolith has flown in an image consultant from Toronto, and it is Siobhan. She is freelancing. Her notes: matching jackets, fewer " +
        "safety pins, 'more smiling from the bassist', and 'the van needs to go'. The bassist is Moth. The van is Moth's home.",
      choices: [
        { label: 'Let Siobhan try', hint: 'Fans ↑ · everyone ↓', effects: { fans: 200, mood: { all: -8 }, flags: { demandImage: 'met' } },
          outcome: 'Matching jackets. The photos test brilliantly. The band looks like a real estate team. Moth keeps a safety pin in her mouth all day.' },
        { label: 'The van stays', hint: 'Moth ↑↑ · Buzz ↑', effects: { mood: { moth: 14 }, buzz: 6, flags: { demandImage: 'refused' } },
          outcome: "Moth explains the van to Siobhan for two hours, with a floor plan. Siobhan leaves and files one word: 'HOME'." },
        { label: 'Moth meets her alone', hint: 'Buzz ↑ · Moth ↑', effects: { buzz: 10, mood: { moth: 6 }, flags: { demandImage: 'half' } },
          outcome: 'Ten minutes in the van. Siobhan comes out holding a mug of tea and a new respect for curtains. Monolith drops the matter.' }
      ] },
    { id: 'signed_fh_gopherwood_showcase', type: 'scene', speaker: 'benny', title: 'The Feed Store Showcase', gate: g({ era: S, flagEquals: { label: 'gopherwood' }, weekOfYear: [11, 14] }),
      text: "Wendell's Christmas showcase at the feed store in Humboldt: every Gopherwood act on a stage of pallets, a wood stove, and Wendell " +
        "in an apron that says LABEL BOSS. The drive from Regina is three hours. Moth has already packed the van. And her kitchen.",
      choices: [
        { label: 'Headline the showcase', hint: 'Fans ↑ · Chemistry ↑ · Burnout ↑', effects: { fans: 120, chemistry: 6, burnout: 6, flags: { demandShowcase: 'met' } },
          outcome: "Three hundred people in a feed store, steam rising off their parkas. Rox dives into the chick-starter aisle. Wendell weeps." },
        { label: 'Play, then help clean up', hint: 'Fans ↑ · Everyone ↑', effects: { fans: 80, mood: { all: 5 }, flags: { demandShowcase: 'met' } },
          outcome: 'You sweep the feed store until 2 a.m. with Wendell. He plays you every Gopherwood record. Benny approves of three of them.' },
        { label: 'Skip it this year', hint: 'Burnout ↓ · Benny ↓', effects: { burnout: -6, mood: { benny: -4 }, flags: { demandShowcase: 'refused' } },
          outcome: "Wendell says 'no problem'. It is a problem. Benny drives up alone on the bus to apologize and ends up playing both chords." }
      ] },
    { id: 'signed_fh_gopherwood_van', type: 'money', speaker: 'moth', title: 'Two Label Vans', gate: g({ era: S, flagEquals: { label: 'gopherwood' } }),
      text: "Wendell drives the Gopherwood label van, the one with a gopher painted on the side, down to Regina to meet Moth's van. He has " +
        "heard it is 'an apartment'. The two vans are parked nose to nose behind the Suds-O-Rama. Moth and Wendell are circling them.",
      choices: [
        { label: 'Let them talk shop', hint: 'Moth ↑ · Chemistry ↑', effects: { mood: { moth: 10 }, chemistry: 4 },
          outcome: 'Four hours about gaskets. Wendell leaves a spare alternator "as a signing gift". Moth calls it the most romantic thing she has seen.' },
        { label: 'Ask Wendell for the cheque', hint: '+$600', effects: { fund: 600 },
          outcome: "The cheque is written in carpenter pencil and clears on Wednesday. Wendell says 'Tuesday's bad for cheques'. He is right." },
        { label: 'Paint a gopher on the Pothole', hint: 'Gamble: Moth consents?',
          outcome: 'Wendell produces a paint can.',
          roll: { chance: 0.4,
            success: { effects: { buzz: 8, mood: { moth: 8 } }, outcome: 'Moth allows one small gopher, above the fuel door. It has two teeth. Benny says "two is correct".' },
            fail: { effects: { mood: { moth: -10 } }, outcome: 'Moth says no before the lid comes off. Wendell apologizes to the van directly. Moth accepts.' } } }
      ] },
    { id: 'signed_fh_diy_laundromat_label', type: 'money', speaker: 'fh_irma', title: 'Suds-O-Rama Records', gate: g({ era: S, flagEquals: { label: 'diy' } }),
      text: "No label, so Irma has offered to be one. 'Suds-O-Rama Records': the basement is the office, the folding table is the warehouse, " +
        "the change machine is accounts receivable. Her terms: 10% and the band folds towels on Sundays. Forever.",
      choices: [
        { label: 'Sign with Irma', hint: '+$400 · Burnout ↑', effects: { fund: 400, burnout: 6 },
          outcome: 'Irma ships every order with a dryer sheet in it. Fans say the records smell like home. Sales go up. Towels get folded.' },
        { label: 'Just rent the folding table', hint: '−$100 · Chemistry ↑', effects: { fund: -100, chemistry: 5 },
          outcome: 'The folding table becomes a mail room. Delphine volunteers Thursdays. She is faster than all of you combined.' },
        { label: 'Counter: 5% and no towels', hint: 'Gamble: Irma negotiates',
          outcome: 'Rox slides a napkin across the folding table.',
          roll: { chance: 0.4,
            success: { effects: { fund: 500, mood: { rox: 6 } }, outcome: "Irma respects the counter. She says 'finally, a real negotiator' and shakes Rox's hand for a long time." },
            fail: { effects: { burnout: 8 }, outcome: 'Irma counters with 15% and towels on Saturdays too. You accept. You are not good at this.' } } }
      ] },
    { id: 'signed_fh_diy_mailout', type: 'money', speaker: 'moth', title: 'Mailing From the Van', gate: g({ era: S, flagEquals: { label: 'diy' } }),
      text: "Four hundred online orders and no warehouse. Moth has converted the van into a shipping department: tape gun on the dash, mailers " +
        "in the bunk, labels on the ceiling. The post office on Albert Street knows the Pothole by sight now.",
      choices: [
        { label: 'Ship them all this week', hint: '+$800 · Burnout ↑', effects: { fund: 800, burnout: 10 },
          outcome: 'Four hundred parcels, eleven trips, one tape-gun injury. The postal clerk gives Moth a pin. Moth wears it.' },
        { label: 'Hand-deliver the Regina ones', hint: '+$600 · Fans ↑', effects: { fund: 600, fans: 80, burnout: 6 },
          outcome: 'Rox delivers in person with the megaphone. Several fans invite you in. Several call the police. It evens out.' },
        { label: 'Delphine runs it', hint: '+$500 · Everyone ↑', effects: { fund: 500, mood: { all: 4 } },
          outcome: "Delphine does it all from machine 6 between loads. Credit on the album: 'Logistics: Delphine'. Two parcels go to Saskatoon by mistake." }
      ] },

    // ---- Q8 cross-band cameos (cameo: true; they name another playable band) ------------------------------------------------
    { id: 'fh_cameo_hail_damage', type: 'scene', speaker: 'rox', title: 'A Van Shaped Like a Hearse', cameo: true, gate: g({ era: LS, minFans: 300 }),
      text: "A dented minivan with a moose painted on it has broken down outside the Suds-O-Rama. It is Hail Damage, the metal band from " +
        "Saskatoon, in town for a gig. Their singer, in a cape, is asking Irma if a cape can go in dryer number four.",
      choices: [
        { label: 'Help them fix the van', hint: 'Chemistry ↑ · Moth ↑', effects: { chemistry: 5, mood: { moth: 8 } },
          outcome: 'Moth and their silent bassist fix the van without speaking a word to each other. It is the most beautiful thing you have ever seen.' },
        { label: 'Invite them to a basement jam', hint: 'Fans ↑ · Buzz ↑', effects: { fans: 40, buzz: 8, burnout: 5 },
          outcome: 'Metal and punk, one basement, two drummers. The cape goes in dryer four after all. It comes out a little smaller and very soft.' },
        { label: 'Let them sort it out', hint: 'Burnout ↓', effects: { burnout: -5 },
          outcome: 'They get towed to Moose Jaw. Their singer waves from the tow truck, cape flying. Rox salutes. It feels historic, somehow.' }
      ] },
    { id: 'fh_cameo_gravel_kings', type: 'weird', speaker: 'benny', title: 'Leather Pants at Minus 30', cameo: true, gate: g({ era: LS, weekOfYear: [11, 16] }),
      text: "A man in leather pants is jogging down Dewdney at minus thirty, singing a power ballad. It is Chase from Gravel Kings, the Edmonton " +
        "rock band, in town for a show. He believes it is 1985. He stops Benny to ask what 'the third chord' in punk is.",
      choices: [
        { label: "Benny: 'There isn't one.'", hint: 'Benny ↑ · Buzz ↑', effects: { mood: { benny: 8 }, buzz: 4 },
          outcome: 'Chase takes this very seriously. He writes it on his hand. Months later a Gravel Kings song has a two-chord verse. Benny weeps.' },
        { label: 'Lend him a toque', hint: 'Chemistry ↑', effects: { chemistry: 4, fund: -15 },
          outcome: "He wears the toque over his hair like a crown. He sends it back from Edmonton with a note: 'Rock on, Regina. It's 1985 forever.'" },
        { label: 'Jam in the laundromat', hint: 'Gamble: punk meets hair metal',
          outcome: 'Chase follows you downstairs.',
          roll: { chance: 0.5,
            success: { effects: { fans: 30, buzz: 8 }, outcome: 'A punk song with a power-ballad bridge. Rox and Chase scream the chorus into the same mic. Irma films it.' },
            fail: { effects: { burnout: 5, mood: { rox: -4 } }, outcome: 'Chase does a nine-minute guitar solo on Benny\'s guitar. Using nine chords. Benny has to go for a walk.' } } }
      ] }
  ]);

  /* ======================================================================================================================
     Shop (forced by GG.shop through career.variant '<id>_frost_heave'; never drawn). Same gates as the base cards.
     ====================================================================================================================== */
  add(list(K, 'shopCards'), [
    { id: 'money_merch_misprint_frost_heave', type: 'money', speaker: 'benny', title: 'FROST HEAVY', gate: g({ era: ALL }),
      text: "Your first box of band shirts is back from the print shop on Dewdney. Every one says FROST HEAVY. The shop says 'that's what you " +
        "wrote'. Rox has the order form. It's what Benny wrote. Benny says the new name is 'more honest'.",
      choices: [
        { label: 'Box them up. Someday.', hint: 'Keep the misprints · maybe worth $$$ later', effects: { mood: { benny: 3 }, shop: { misprint: 'boxed' } },
          outcome: 'The box goes behind dryer number six with HEAVY written on it in Sharpie. Benny says misprints are worth money someday. Nobody believes him.' },
        { label: 'Pay for a reprint ($100)', effects: { fund: -100, mood: { rox: 5 }, shop: { misprint: 'reprint' } },
          outcome: 'The reprint says FROST HEAVE, correctly, in letters cut out of a council agenda. Rox approves. Irma wants the scraps.' },
        { label: 'Wear them to rehearsal', effects: { chemistry: 5, mood: { all: 3 }, shop: { misprint: 'wear' } },
          outcome: "Frost Heavy becomes the band's secret name. Moth is seen in one, inside out, exactly once. It is confirmed by Delphine." }
      ] },
    { id: 'shop_merch_start_frost_heave', type: 'money', speaker: 'rox', title: 'The Merch Table', gate: g({ era: ['garage', 'local'], minWeek: 4 }),
      text: "Rox has designed a shirt: council chambers, on fire (metaphorically), with the band's name in the smoke. Moth points out that bands " +
        "pay for the van with merch. Moth also points out that the van is her home, so the merch pays her rent, sort of.",
      choices: [
        { label: 'Order a box of shirts', hint: '−$192 · 24 shirts for the merch table', effects: { fund: -192, shop: { stock: { shirt: 1 } } },
          outcome: 'Twenty-four shirts, the chamber on fire. Rox wears one to council. Pomeroy asks where he can buy one. She says "nowhere".' },
        { label: 'Stickers first', hint: '−$80 · 200 stickers', effects: { fund: -80, shop: { stock: { sticker: 1 } } },
          outcome: 'Two hundred stickers. Benny puts one on every pothole on Albert Street. The city removes the potholes. Not the stickers.' },
        { label: 'Not yet', effects: { mood: { rox: -4 } },
          outcome: 'Rox tapes the design to the basement wall. It watches you rehearse. It is, metaphorically, on fire.' }
      ] },
    { id: 'shop_pawn_kit_frost_heave', type: 'money', speaker: 'moth', title: 'The Pawn Shop Kit', seat: ['drums'], gate: g({ era: ['garage', 'local'], minWeek: 8, minFund: 1100 }),
      text: "Moth texts a photo from the pawn shop on Dewdney: a five-piece kit, shells that almost match, $800. Then: 'guy says $650 today. " +
        "the milk crate has to go. it's been in my van for a month.'",
      choices: [
        { label: 'Buy it today ($650)', hint: '−$650 · a real kit: better sound', effects: { fund: -650, shop: { kit: 1 } },
          outcome: 'Three trips in the van to get it home. The first rehearsal sounds like a real band. The milk crate becomes a merch stand.' },
        { label: 'Haggle', hint: 'Gamble: haggle him down',
          roll: { chance: 0.5, stat: 'chemistry', statScale: 0.005,
            success: { effects: { fund: -520, shop: { kit: 1 } }, outcome: "Moth stares at him in silence until he gives in. $520, and he throws in a cowbell. No gong." },
            fail: { effects: { mood: { moth: -5 } }, outcome: 'He sells it to a church drummer while Moth is still staring. Moth takes it personally.' } },
          outcome: 'Moth cracks her knuckles. Slowly.' },
        { label: 'Not yet', effects: { mood: { moth: -4 } }, outcome: 'The milk crate creaks. Moth moves it out of her kitchen with a look.' }
      ] },
    { id: 'shop_van_deal_frost_heave', type: 'money', speaker: 'moth', title: 'An Apartment Viewing', gate: g({ era: LSW, minFund: 4000 }),
      text: "A church in Moose Jaw is selling its 15-passenger van, trailer included: $3,000 and the old van for parts. Moth has asked to " +
        "view it like an apartment. She is inspecting the closets. It has no closets. She is taking notes anyway.",
      choices: [
        { label: 'Buy the church van', hint: '−$3,000 · 15-passenger van + trailer', effects: { fund: -3000, shop: { van: 1 } },
          outcome: "Moth moves in that night: curtains, laundry line, a plant. The Pothole's stickers move over one by one. It is home." },
        { label: 'Let Moth haggle', hint: 'Gamble: Moth vs. the church',
          roll: { chance: 0.4,
            success: { effects: { fund: -2500, shop: { van: 1 } }, outcome: 'Moth points out a draft by the rear window. The minister, rattled, knocks off $500 and blesses the van.' },
            fail: { effects: { mood: { moth: -4 } }, outcome: 'Moth decides the van has "bad energy in the second row". She refuses to live in it. Deal off.' } },
          outcome: 'Moth crosses her arms by the sliding door.' },
        { label: 'Keep the old van', effects: { chemistry: 2, mood: { moth: 3 } },
          outcome: 'A skate crew buys the church van instead. Moth pats the Pothole\'s dashboard all the way home.' }
      ] },
    { id: 'shop_solo_frost_heave', type: 'drama', speaker: 'benny', title: 'Benny Insists', seat: ['drums', 'bass', 'rhythm'], gate: g({ era: LSW }),
      text: "Benny has written a solo. It is both of his chords, alternating, very fast, for eight bars. He will only play it if the songs " +
        "get a real solo section. He is holding your {sticks} hostage. He is also holding the setlist hostage.",
      choices: [
        { label: 'Fine. A solo section.', hint: 'Solo section unlocked · Benny ↑', effects: { mood: { benny: 8 }, shop: { section: 'solo' } },
          outcome: 'Benny returns your {sticks} and plays you the solo. Chord one. Chord two. Chord one. It is, somehow, exhilarating.' },
        { label: 'Only with a stage dive', hint: 'Solo unlocked · Benny ↑ · Rox ↑', effects: { mood: { benny: 5, rox: 5 }, chemistry: -2, shop: { section: 'solo' } },
          outcome: 'His solo, her dive, the same eight bars. Nobody watches Benny. Benny prefers it that way. Everyone is happy, loudly.' },
        { label: 'No solos in this band', hint: 'Benny ↓↓', effects: { mood: { benny: -10 } },
          outcome: 'Benny returns the {sticks}. He plays the solo anyway, alone, in the laundromat, for Delphine. She claps both times.' }
      ] },
    { id: 'shop_space_1_frost_heave', type: 'money', speaker: 'rox', title: 'A Room With a Lock', gate: g({ era: LSW }),
      text: "A real jam room across town has opened up: cinder block, egg-crate foam, a door that locks, $35 a week until you sign (then $60), no dryers. Irma is " +
        "pretending not to listen at the top of the basement stairs. Irma is listening.",
      choices: [
        { label: 'Move in ($35/week)', hint: 'Rent $35/wk ($60 once signed) · rehearse better', effects: { mood: { all: 4 }, shop: { move: 1 } },
          outcome: 'One van trip and three couch trips. Irma watches from the laundromat window. She sends a mop along "in case".' },
        { label: 'Stay in the basement', hint: 'Free · move later from the stairs', effects: { chemistry: 2, mood: { rox: -3 } },
          outcome: 'The basement it is. Irma brings down a space heater without a word, like a peace treaty. The dryers thump approval.' }
      ] },
    { id: 'shop_space_2_frost_heave', type: 'money', speaker: 'benny', title: 'A Real Studio Room', gate: g({ era: SW }),
      text: "A proper studio has a room: rehearsal space, an isolation booth, a coffee machine that works. $150 a week. Benny has toured the " +
        "booth twice. He says it is the right size for two chords. Moth asks if the parking lot is safe overnight.",
      choices: [
        { label: 'Move in ($150/week)', hint: 'Rent $150/wk · write + record better', effects: { mood: { all: 4 }, shop: { move: 2 } },
          outcome: "A real studio. The engineer hands out keys and a list of rules. Rule one is 'no stage dives off the console'." },
        { label: 'Not yet', effects: { mood: { benny: -3 } }, outcome: 'Benny keeps the brochure in his back pocket. He takes it out and looks at the booth sometimes.' }
      ] },
    { id: 'shop_space_3_frost_heave', type: 'money', speaker: 'moth', title: 'Backstage, Forever', gate: g({ era: W }),
      text: "The arena offers a permanent room under the stands: a star on the door, showers, a loading bay big enough for the van. $300 a week. " +
        "Moth has already measured the loading bay. The van fits. The van could live there.",
      choices: [
        { label: 'Move in ($300/week)', hint: 'Rent $300/wk · rest like royalty', effects: { mood: { all: 5 }, shop: { move: 3 } },
          outcome: 'Moth parks her home in the loading bay under the arena. It has never been warmer. The Zamboni driver brings coffee.' },
        { label: 'Stay where we are', effects: { mood: { moth: -5 } }, outcome: 'Moth paints a star on the van door herself. It is crooked. She loves it.' }
      ] }
  ]);

  /* ======================================================================================================================
     Drama (27_sim_drama): wants (rules council / spotlight / twoChords / freedom / van), stage lines, exit storylines,
     epilogues, and the ultimatum / return / return-filled cards. Rival outcomes say {rival}.
     ====================================================================================================================== */
  function mfx(extra, id, act) { var o = { member: { id: id, act: act } }; for (var k in extra) o[k] = extra[k]; return o; }
  function back(id) { return { member: { id: id, act: 'return' } }; }
  var DR = obj(K, 'drama');
  members(obj(DR, 'members'), {
    rox: {
      wants: [
        { id: 'council', text: 'City council, from the inside or the outside. Posters on every lamp post. Shows in her own city.', gripe: 'city council', rule: 'council' },
        { id: 'spotlight', text: 'The mic, the megaphone and the last word. Every time.', gripe: 'the spotlight', rule: 'spotlight' }
      ],
      grumble: [
        'Point of order: we have not played Regina in two weeks. Council has noticed. I have noticed.',
        'The flyers went up on Albert Street crooked. I have filed a note. With myself.',
        'I sang my heart out and the sound guy turned me down. Like council. Exactly like council.'
      ],
      passive: [
        'Great show everyone! Especially the part where I was audible. Briefly. 🙂',
        "No, it's fine. I'll scream into a pillow. Council meets Wednesday anyway. 🙂",
        "Updated my bio to 'available for committees'. No reason."
      ],
      ultimatum: 'ult_rox', 'return': 'ret_rox', returnFilled: 'ret_rox_filled',
      exit: {
        id: 'parking_board', returnAfter: [14, 24],
        status: 'Sitting on the Parking Appeals Board. Still screaming, but from a chair with a nameplate.',
        quitLine: { who: 'rox', text: "I've been appointed to the Parking Appeals Board. I will burn it down from the inside. Don't wait up." },
        beats: [
          { at: 3, who: 'fh_janice', text: 'Leader-Pest brief: a Parking Appeals Board meeting ran eleven hours. One member screamed. You know which one.' },
          { at: 8, who: 'rox', text: 'I have overturned 400 tickets. I have become the system. I hate it here.' },
          { at: 13, who: 'fh_pomeroy', text: 'Ms. Delorme has been asked to leave the Parking Appeals Board. She has asked the Board to leave.' }
        ],
        changed: 'Back from the Parking Appeals Board. Knows every bylaw by number now, and screams them in order.',
        backLine: { who: 'rox', text: "They made me chair. Chairs can't scream. I'm back. I brought the nameplate." }
      },
      epilogue: 'Rox is elected mayor of Regina in a landslide, then heckles her own swearing-in. The megaphone is in a museum.'
    },
    benny: {
      wants: [
        { id: 'two_chords', text: 'Two chords. Forever. Easy songs, fast songs, never a key change.', gripe: 'too many notes', rule: 'twoChords' },
        { id: 'freedom', text: 'Less rehearsal. Two chords take no time to practise.', gripe: 'rehearsing two chords', rule: 'freedom' }
      ],
      grumble: [
        'that last song had a key change. i felt it in my teeth',
        "why are we rehearsing. i know both chords. i've known them since grade 8",
        "someone said 'modulate' at practice. not naming names. rox"
      ],
      passive: [
        'great practice everyone!! loved the part with too many notes 🙂',
        "no its cool, i'll learn the new part. oh wait, i won't 🙂",
        'a one-chord band in moose jaw followed me. unrelated. see you tuesday. maybe'
      ],
      ultimatum: 'ult_benny', 'return': 'ret_benny', returnFilled: 'ret_benny_filled',
      exit: {
        id: 'one_chord', returnAfter: [12, 22],
        status: 'Playing in Uno, a one-chord drone band in Moose Jaw. Purer. Colder. Much quieter.',
        quitLine: { who: 'benny', text: "i've joined uno. a one-chord band in moose jaw. it's purer. two was always one too many. sorry" },
        beats: [
          { at: 4, who: 'benny', text: 'uno played for 40 minutes. one chord. the crowd left. i understand now. i understand everything' },
          { at: 10, who: 'fh_delphine', text: "Saw Benny's new band in Moose Jaw. One chord. I timed it. He looked lonely. I brought him a sandwich." }
        ],
        changed: 'Back from the one-chord band. Treats his second chord like a long-lost friend now.',
        backLine: { who: 'benny', text: "uno added a second chord. SELLOUTS. i'm back. both chords are back. i missed chord two" }
      },
      epilogue: 'Benny opens a guitar school in Regina: two chords, two lessons, full refund if you ask for a third.'
    },
    moth: {
      wants: [
        { id: 'van', text: 'The van, running well, driven by her, parked somewhere quiet. It is her home.', gripe: 'the van', rule: 'van' }
      ],
      grumble: [
        "Van's making a noise. Nobody asked. That's the problem.",
        'Someone left a coffee cup on my dashboard. My kitchen counter. Who.',
        'Parking ticket number twelve. The city and I are not speaking.'
      ],
      passive: [
        "Great show. Loved sleeping in a parking lot that isn't mine. 🙂",
        "No, it's fine, the van needs a muffler, it can wait, like everything. 🙂",
        'Looking at campsites. For no reason. Just looking.'
      ],
      ultimatum: 'ult_moth', 'return': 'ret_moth', returnFilled: 'ret_moth_filled',
      exit: {
        id: 'econoline', returnAfter: [10, 20],
        status: 'Living in a 1994 camper van by the lake. Different van. Same curtains.',
        quitLine: { who: 'moth', text: "I've moved out. Into a different van. It's not you. It's the upholstery. Take care of the Pothole." },
        beats: [
          { at: 3, who: 'fh_delphine', text: "Saw Moth's new van by the lake. Nice curtains. She waved. She looked like she missed the old one." },
          { at: 8, who: 'moth', text: "New van leaks. Old van didn't. Just saying." }
        ],
        changed: 'Back in the Pothole. Re-hung every sock. Knocks before entering her own home now, out of respect.',
        backLine: { who: 'moth', text: "The Econoline got towed. I'm back. I knocked first. From outside. It's my apartment." }
      },
      epilogue: 'Moth still lives in the van. It has a mailbox, a porch light and a postal code. The city tried to tow it once. The city lost.'
    }
  });

  add(list(K, 'dramaCards'), [
    // ---- Ultimatums (stage 3): two fixes at a cost, or refuse and they quit ----
    { id: 'ult_rox', type: 'drama', speaker: 'rox', title: 'Rox Has Demands',
      text: "Rox has typed her demands on city letterhead she 'obtained legally'. One: a song about the transit fare hike. Two: every show in " +
        "Regina. Three: 'RESPECT', underlined twice. A city committee has 'expressed interest' in her. She is not bluffing.",
      choices: [
        { label: 'Every show in Regina', effects: mfx({ burnout: 4, mood: { rox: 15 } }, 'rox', 'settle'),
          outcome: 'The board is Regina only for a month. Rox screams at every venue she has ever complained about. She has never been happier.' },
        { label: 'The transit song, tonight', effects: mfx({ chemistry: 3, mood: { rox: 12 } }, 'rox', 'settle'),
          outcome: "'Fare Hike (Die)' is written in one hour and fifty seconds long. Rox reads it into the record at the next council meeting." },
        { label: 'Go join the committee', effects: mfx({ chemistry: -4 }, 'rox', 'quit'),
          outcome: "Rox folds the letter into a paper airplane and throws it down the basement stairs. 'Fine. I'll fix this city without you.'" }
      ] },
    { id: 'ult_benny', type: 'drama', speaker: 'benny', title: 'The Note on the Case',
      text: "Benny's guitar case is packed and sitting by the stairs. There is a note taped to it: 'the new song has four chords. i counted. " +
        "i can't. there's a band in moose jaw that only uses one.' Benny is sitting on the case, looking at the floor.",
      choices: [
        { label: 'Cut the song to two chords', effects: mfx({ mood: { benny: 15 }, buzz: -3 }, 'benny', 'settle'),
          outcome: 'You cut two chords from the new song. It is better. Benny unpacks the case and plays both chords, gently, like an apology.' },
        { label: "Raise the band's cut (+5%)", effects: mfx({ payCut: 0.05, mood: { benny: 12 } }, 'benny', 'settle'),
          outcome: "Benny looks at the new pay sheet for a long time. 'two percent per chord,' he says. 'fair.' He unpacks." },
        { label: 'Go to Moose Jaw, then', effects: mfx({ chemistry: -4 }, 'benny', 'quit'),
          outcome: 'Benny picks up the case and walks out through the laundromat. Delphine holds the door. She glares at you over her shoulder.' }
      ] },
    { id: 'ult_moth', type: 'drama', speaker: 'moth', title: 'The Van Is Across the Street',
      text: "Moth has parked the van across the street instead of behind the Suds-O-Rama. The curtains are shut. There is a note on the windshield: " +
        "'The van needs a muffler. I need a quiet week. Or I move out. Of the band. Not the van.'",
      choices: [
        { label: 'Buy the muffler ($180)', effects: mfx({ fund: -180, mood: { moth: 15 } }, 'moth', 'settle'),
          outcome: 'Moth installs it herself in the laundromat lot at dawn. The van purrs. Moth opens the curtains. The van is back where it lives.' },
        { label: 'A quiet week for Moth', effects: mfx({ burnout: -8, mood: { moth: 12 } }, 'moth', 'settle'),
          outcome: 'No gigs, no rehearsals, nobody knocks. On Sunday Moth leaves a thermos of soup on the basement stairs. You are forgiven.' },
        { label: "We'll find another driver", effects: mfx({ chemistry: -4 }, 'moth', 'quit'),
          outcome: 'Moth moves her curtains, her plant and her laundry into a different van. She leaves the Pothole behind, clean, keys on the seat.' }
      ] },
    { id: 'ult_recruit_frost_heave', type: 'drama', speaker: 'recruit', title: '{recruit} Wants a Word', gate: only({}),
      text: "{recruit} catches you on the basement stairs. 'The ad said paid gigs, a real band and a heated rehearsal space. The heat is the dryers. " +
        "I've had other offers. Well, one. A wedding band. Their van is only a van.'",
      choices: [
        { label: "Raise the band's cut (+5%)", effects: mfx({ payCut: 0.05, mood: { recruit: 15 } }, 'recruit', 'settle'),
          outcome: '{recruit} shakes your hand. The wedding band will have to find someone else to play the Chicken Dance.' },
        { label: 'Buy a space heater ($60)', effects: mfx({ fund: -60, mood: { recruit: 12 } }, 'recruit', 'settle'),
          outcome: "{recruit} sits right next to the heater at every rehearsal and calls it 'the office'. Irma charges for the power." },
        { label: 'The stairs are right there', effects: mfx({ chemistry: -3 }, 'recruit', 'quit'),
          outcome: '{recruit} packs up and pins a one-star review of the basement to the laundromat corkboard. Irma leaves it up. It is fair.' }
      ] },

    // ---- Returns: an empty slot (welcome back / conditions / not yet) or a filled one (the original or the recruit) ----
    { id: 'ret_rox', type: 'drama', speaker: 'rox', title: 'Madam Chair Returns',
      text: "Rox is at the top of the basement stairs holding a nameplate that says R. DELORME, CHAIR. 'They made me chair,' she says. " +
        "'Chairs can't scream.' She is looking at the empty mic stand like it owes her money.",
      choices: [
        { label: 'Welcome back, Madam Chair', effects: mfx({ chemistry: 4 }, 'rox', 'return'),
          outcome: 'Rox screams one note so loud the dryers upstairs stop. Irma bangs the mop in welcome. The basement is itself again.' },
        { label: 'Audition first', effects: mfx({ mood: { rox: -8 }, skill: { rox: 2 } }, 'rox', 'return'),
          outcome: 'She auditions with a nine-minute song about parking appeals. She gets the gig. She would like it noted that she was nervous.' },
        { label: 'Not yet, Rox', effects: mfx({ mood: { rox: -5 } }, 'rox', 'later'),
          outcome: 'Rox leaves the nameplate on your {gear} and sits in the laundromat for weeks, filing complaints about the wait.' }
      ] },
    { id: 'ret_rox_filled', type: 'drama', speaker: 'rox', title: 'Point of Order',
      text: "Rox is back, nameplate under one arm. {recruit} is at her mic, holding her megaphone. 'Point of order,' Rox says, very quietly. " +
        "Somewhere in Toronto, Siobhan is already typing an email.",
      choices: [
        { label: 'Take Rox back', effects: back('rox'),
          outcome: '{recruit} hands back the megaphone and leaves a thank-you card. Rox reads it aloud, into the megaphone. The basement is complete.' },
        { label: 'Keep {recruit}', effects: mfx({ mood: { recruit: 8 } }, 'rox', 'rival'),
          outcome: "Rox storms out. Two weeks later {rival} announce a new singer: 'Rox, formerly of Frost Heave'. She is in pre-ripped jeans. She looks furious." }
      ] },
    { id: 'ret_benny', type: 'drama', speaker: 'benny', title: 'Both Chords Are Back',
      text: "Benny is in the laundromat, guitar on his back, next to machine 6. 'Uno added a second chord,' he says. 'Sellouts. I'm back if " +
        "you'll have me. Both chords are back.' Delphine is holding his hand.",
      choices: [
        { label: 'Welcome back, Two Chords', effects: mfx({ chemistry: 4 }, 'benny', 'return'),
          outcome: 'Benny plugs in and plays chord one, then chord two, then chord one again, eyes closed. Nobody says anything. Nobody needs to.' },
        { label: 'Back, but learn the new song', effects: mfx({ mood: { benny: -8 } }, 'benny', 'return'),
          outcome: 'He learns it. He plays it with two chords anyway. It is better. He says nothing. He is right.' },
        { label: 'Not yet', effects: mfx({ mood: { benny: -5 } }, 'benny', 'later'),
          outcome: 'Benny nods and sits in the laundromat every Tuesday, playing both chords softly, until you are ready.' }
      ] },
    { id: 'ret_benny_filled', type: 'drama', speaker: 'benny', title: 'Three Chords in the Basement',
      text: "Benny is back from Moose Jaw. {recruit} is playing his part, with three chords. Benny's face does something nobody has seen before. " +
        "The dryers upstairs go quiet, as if they know.",
      choices: [
        { label: 'Take Benny back', effects: back('benny'),
          outcome: '{recruit} is gracious. Benny re-tunes everything {recruit} touched and plays the first song with exactly two chords. The room exhales.' },
        { label: 'Keep {recruit}', effects: mfx({ mood: { recruit: 8 } }, 'benny', 'rival'),
          outcome: "Benny leaves without a word. A month later {rival}'s new guitarist is Benny Two Chords. Siobhan has taught him a third. He looks haunted." }
      ] },
    { id: 'ret_moth', type: 'drama', speaker: 'moth', title: 'Knock If You Need a Bassist',
      text: "Moth is standing behind the Suds-O-Rama with a laundry basket and a bass. There is a note taped to the Pothole's windshield in her " +
        "handwriting: 'Econoline got towed. Knock if you still need a bassist.'",
      choices: [
        { label: 'Knock twice. Wait.', effects: mfx({ chemistry: 4 }, 'moth', 'return'),
          outcome: 'Moth opens the van door from the outside, steps in, hangs a sock on the mirror and says "home". The band has a bassist and a driver again.' },
        { label: 'Knock, then negotiate', effects: mfx({ mood: { moth: -8 } }, 'moth', 'return'),
          outcome: 'You ask for shorter drives. Moth asks for a new muffler. You both lose. She is back anyway.' },
        { label: 'Not yet', effects: mfx({ mood: { moth: -5 } }, 'moth', 'later'),
          outcome: 'Moth nods and sleeps in the laundromat lot in a borrowed tent. The Pothole looks lonely. So does she.' }
      ] },
    { id: 'ret_moth_filled', type: 'drama', speaker: 'moth', title: "That's My House",
      text: "Moth is back, standing by the van, looking at {recruit}, who is holding her bass. 'That's my bass,' Moth says. 'And that's my " +
        "house.' Nobody moves. Upstairs, the dryers thump.",
      choices: [
        { label: 'Take Moth back', effects: back('moth'),
          outcome: '{recruit} hands over the bass and the van keys. Moth re-hangs every sock in the right order. The Pothole is home again.' },
        { label: 'Keep {recruit}', effects: mfx({ mood: { recruit: 8 } }, 'moth', 'rival'),
          outcome: "Moth takes her curtains and her plant and walks away. Next week {rival} announce a bassist who 'lives in the tour bus'. It's Moth." }
      ] }
  ]);
  // Fill-ins stay the base table's (drama.fillIns is role-keyed, and 27_sim_drama fillPool normalises 'vocals/guitar').

  /* ======================================================================================================================
     Bandbook (29_sim_fans): the home superfan (Q5), posts / viral / comments / handles / mail / gifts through byBand, the
     scripted gift, fan-card variants and the band's scandals. Tokens: {who} {song} {venue} {gcity} {views} {n} {money}.
     ====================================================================================================================== */
  var BB = obj(K, 'bandbook');
  obj(BB, 'homeSuperfan')[B] = {
    name: 'Delphine from the Suds-O-Rama', short: 'Delphine', icon: '🧺', from: 'Regina (the Suds-O-Rama)',
    blurb: 'Retired school-bus driver. Thursday nights, machine 6, never leaves during a spin cycle. Heard you through the floor and never left.',
    gigLines: [
      'Delphine from the Suds-O-Rama is in the front row with a lawn chair and a laundry bag. Show number {n}. The bag is for merch.',
      'Delphine made it again ({n} shows). She knows every word. She sings them at a school-bus-driver volume.',
      'Delphine holds up a sign: "MACHINE 6 ♥ {band}". She made it from a detergent box. This is sign {n}.',
      'Delphine is here. She drove her own school bus. It is retired too. She parked it across three spots, legally.'
    ],
    gigLinesFar: [
      'Delphine from the Suds-O-Rama made it to {gcity}. She took the bus. Two buses. She brought her own lawn chair on both. Show {n}.',
      'Delphine is in {gcity}, front row, lawn chair. First time this far from machine 6. She says it is "a lot of road".'
    ],
    comments: [
      'Delphine from the Suds-O-Rama here. See you Thursday. Machine 6. You know the drill.',
      'Great post. Printed it at the library. It is on the fridge next to my bus-driver pin.',
      'Delphine again. Have not missed a show since I heard you through the floor. Not planning to start.',
      'I have liked this 40 times. The app only counts one. I wrote to them. On paper.',
      'Played this for the Thursday wash crowd. Irma turned it down. I turned it back up.'
    ],
    gift: 'fh_lint_portrait'
  };
  obj(BB, 'scriptedGifts').fh_lint_portrait = { from: 'Delphine from the Suds-O-Rama',
    text: 'A portrait of the whole band made entirely from dryer lint, glued to a pizza box. Six months of Thursdays. It hangs in the basement.' };
  merge(band(BB), {
    posts: {
      rehearsal: [
        'Rehearsal clip: {who} nails the bridge on take 14. Takes 1 to 13 are drowned out by dryer number four.',
        'Basement rehearsal, 40 seconds. At 0:22 Irma bangs the ceiling with a mop, perfectly on the beat. She is now the most-liked part.'
      ],
      gig: [
        'THIS SATURDAY: {band} at {venue}, {gcity}. Doors at 8. Rox will be yelling about parking. Bring a toque.',
        '{venue}, {gcity}, Saturday. Last time the crowd was 12 people and a cat named Councillor. Let\'s get it to 13.'
      ],
      teaser: [
        'New song teaser: nine seconds of "{song}". Two chords. The rest is the same two chords, faster.',
        '"{song}", work in progress. Written in the van, in Moth\'s kitchen, with permission.'
      ],
      meme: [
        'Meme: a photo of the Pothole in a snowbank, captioned "our tour bus". That\'s it. That\'s the post.',
        'POLL: is a frost heave a speed bump? {who} has been arguing about it since Tuesday. Council has not responded.'
      ],
      bts: [
        'Behind the scenes: {who} folding towels for rent. The towels are cleaner than the songs.',
        'BTS: loading out at minus 31. Moth carries the heaviest case like a newborn and the amp like a grudge.'
      ],
      exclusive: [
        'Members only: forty minutes of Rox reading council minutes with commentary. Members call it "cathartic".',
        'Exclusive: a guided tour of Moth\'s van. Featuring: the kitchen, the bedroom, the kitchen again. Shoes off.'
      ]
    },
    viral: {
      good: [
        'VIRAL: Rox stage-dives off a speaker stack and the crowd carries her all the way to the bar and back. {views} views.',
        'VIRAL: a clip of Benny refusing a third chord on camera, calmly, for a full minute. {views} views.',
        'VIRAL: Moth fixes the van\'s alternator with a coat hanger in eleven seconds, in the rain, without a word. {views} views.',
        'VIRAL: a whole laundromat sings the chorus while the dryers keep time. {views} views.',
        'VIRAL: the band plays on top of an actual frost heave while traffic launches over it. {views} views.',
        'VIRAL: {player} counts in so hard one of the {sticks} flies into a dryer and keeps spinning. {views} views.',
        'VIRAL: Rox heckles a city council livestream from the gallery and the mayor answers her, live. {views} views.',
        'VIRAL: Benny teaches a room of forty kids both chords in ninety seconds. The kids start a band on the spot. {views} views.',
        'VIRAL: a news crew knocks on the van. Moth opens the curtain one inch, says "no", closes it. {views} views.'
      ],
      cringe: [
        { who: 'rox', text: 'Wrong kind of viral: Rox reads a 38-page bylaw aloud, in full, on a livestream. {views} views, most of them asleep.' },
        { who: 'rox', text: 'Wrong kind of viral: Rox heckles a snowplow for eleven minutes. The snowplow wins. {views} views.' },
        { who: 'benny', text: 'Wrong kind of viral: Benny\'s tutorial, "Both Chords, Explained". It is four hours long. {views} views.' },
        { who: 'benny', text: 'Wrong kind of viral: Benny, crying at a jazz concert, captioned "too many notes". {views} views.' },
        { who: 'moth', text: 'Wrong kind of viral: Moth\'s van tour. It is just the curtains, for nine minutes. {views} views.' },
        { who: 'moth', text: 'Wrong kind of viral: Moth refusing to let a news crew into the van. She says "knock" forty times. {views} views.' }
      ]
    },
    comments: {
      good: ['saw them in a laundromat basement, 12 people and a cat, i was the cat', 'best band in the queen city. fight me in the lint bin',
        'played this at a council meeting during public comment. got a standing ovation. got escorted out'],
      mixed: ['is this the band that yelled at my dad at the rec centre', 'decent. my cousin knows three chords. is that better. benny says no',
        'why does every video have a dryer in it'],
      bad: ['they were better in the basement (last week)', 'sounds like a snowplow in a tin shed. 3 stars'],
      hater: ['two chords is not a band it is a hostage situation', 'this is why the potholes never get fixed. too busy yelling',
        'mall rats do it better. ok they dont. i said it anyway']
    },
    handles: {
      fan: ['QueenCityKaren', 'Ward6Forever', 'LintBinLarry', 'PotholePatrol', 'SnowRouteSusan', 'DryerFourDiehard', 'TwoChordTony', 'WascanaWendy'],
      hater: ['ThreeChordThad', 'MallRatStan', 'ParkingEnforcer22', 'bylaw_bob']
    },
    mail: [
      { id: 'fh_mail_clerk', from: 'a city clerk in Regina', text: '"Please stop mailing the band\'s demo to council. We have eleven. They are good. Please stop."' },
      { id: 'fh_mail_plow', from: 'a snowplow driver on the night shift', text: '"I play you at 4 a.m. on Victoria Avenue. The plow goes faster. Thank you."' },
      { id: 'fh_mail_ward6', from: 'a retired alderman in Ward 6', text: '"Your singer reminds me of me in 1974. I lost that election too. Keep screaming."' }
    ],
    gifts: [
      { id: 'fh_gift_pothole', from: 'a fan in the Heritage neighbourhood', text: 'A chunk of asphalt from a real Regina pothole, labelled "for the band". It is the heaviest gift you own.' },
      { id: 'fh_gift_quarters', from: 'the Thursday wash crowd', text: 'A pickle jar of quarters "for the van". There is a note: "for Moth\'s muffler". Moth cries a little.' },
      { id: 'fh_gift_toques', from: 'a knitting circle in Moose Jaw', text: 'Four hand-knit toques, one each. Benny\'s has two pom-poms. They knew.' }
    ],
    chat: {
      viral: ['We are viral. Irma saw it. Irma said "huh". That is the highest praise Irma has ever given.',
        'The clip is everywhere. Someone showed it to Pomeroy at council. He watched the whole thing. He hummed.'],
      cringe: ['Everyone saw it. Everyone. The city clerk saw it.', "I'm logging off forever. (Back in 20 minutes.)"]
    }
  });

  add(list(BB, 'scandals'), [
    { card: 'scandal_fh_bylaw', who: 'rox' }, { card: 'scandal_fh_third_chord', who: 'benny' },
    { card: 'scandal_fh_address', who: 'moth' }, { card: 'scandal_fh_warehouse', who: 'rox' },
    { card: 'scandal_fh_skateboard', who: 'band' }
  ]);
  add(list(BB, 'cards'), [
    // ---- Scandals: a bandmate posts something dumb (forced by GG.fans) ----
    { id: 'scandal_fh_bylaw', type: 'fame', speaker: 'rox', title: 'The Annotated Bylaw', gate: only({}),
      text: "Rox posted the entire 212-page city budget on the band page with her annotations. There are 1,400 of them. Some are swear words. " +
        "Some are drawings of Pomeroy. The comments are merciless. The city solicitor has also commented.",
      choices: [
        { label: 'Rox apologizes on camera', hint: 'Haters ↓ · Rox ↓', effects: { buzz: -3, mood: { rox: -6 }, fan: { hater: -0.02 } },
          outcome: 'She apologizes for the drawings, not the annotations. Most people accept it. The solicitor asks for a copy "for reference".' },
        { label: 'Double down: it is art', hint: 'Buzz ↑ · Haters ↑', effects: { buzz: 6, mood: { rox: 5 }, fan: { hater: 0.03 } },
          outcome: 'Rox prints the annotated budget as a zine. It sells out. The city buys two copies. For the archive.' },
        { label: 'Read it aloud at a show', hint: 'Gamble: a bit, or a bigger scandal',
          outcome: 'Rox brings the binder on stage.',
          roll: { chance: 0.5, stat: 'buzz', statScale: 0.004,
            success: { effects: { buzz: 8, fans: 20, mood: { rox: 6 } }, outcome: 'She reads line items over a two-chord drone. The crowd chants the page numbers. It is a new ritual.' },
            fail: { effects: { buzz: -4, mood: { rox: -8 } }, outcome: 'Forty minutes on capital expenditures. The crowd leaves for the bar. The bartender reads along.' } } }
      ] },
    { id: 'scandal_fh_third_chord', type: 'fame', speaker: 'benny', title: 'Benny Played a Third Chord', gate: only({}),
      text: "A video from a wedding in Moose Jaw: Benny, filling in with a cover band, clearly playing a D. A third chord. It has been viewed " +
        "forty thousand times. The comments are all one word: 'HYPOCRITE'. Benny has not left the van in two days.",
      choices: [
        { label: 'Benny explains', hint: 'Haters ↓ · Benny ↓', effects: { buzz: 2, mood: { benny: -6 }, fan: { hater: -0.02 } },
          outcome: "'It was a wedding. The bride asked. I'm not a monster.' Most people forgive him. The bride sends a thank-you card." },
        { label: 'Deny it. Deepfake.', hint: 'Buzz ↑ · Haters ↑', effects: { buzz: 6, mood: { benny: 4 }, fan: { hater: 0.03 } },
          outcome: 'Nobody believes it. Benny starts believing it himself. By Friday he has no memory of the D.' },
        { label: 'Stand with Benny', hint: 'Chemistry ↑', effects: { chemistry: 4, mood: { benny: 8 } },
          outcome: 'The whole band posts a photo holding up two fingers. It becomes a symbol. Of what, nobody is sure. It sells shirts.' }
      ] },
    { id: 'scandal_fh_address', type: 'fame', speaker: 'moth', title: 'Home Address: Van', gate: only({}),
      text: "Moth listed 'the van, parking spot 4' as her home address on a government form, and the form was leaked to a local blog. Now " +
        "strangers are knocking on the van at night. Moth has taped a sign to the door: 'I CAN HEAR YOU.'",
      choices: [
        { label: 'Move the van for a week', hint: 'Haters ↓ · Moth ↓', effects: { burnout: 4, mood: { moth: -6 }, fan: { hater: -0.02 } },
          outcome: 'Moth parks somewhere secret for a week. Nobody knows where. Not even the band. The knocking stops.' },
        { label: 'Open house, one night only', hint: 'Buzz ↑ · Fans ↑', effects: { buzz: 6, fans: 12, mood: { moth: -4 } },
          outcome: 'Forty fans tour the van in socks, single file. Moth serves tea. It is the strangest, sweetest night of the year.' },
        { label: 'Rox yells at the blog', hint: 'Buzz ↑ · Haters ↑', effects: { buzz: 5, mood: { rox: 5 }, fan: { hater: 0.02 } },
          outcome: 'Rox writes a 3,000-word reply about privacy law. The blog takes the post down "to make it stop".' }
      ] },
    { id: 'scandal_fh_warehouse', type: 'fame', speaker: 'rox', title: 'The Sample Tray Video', gate: only({}),
      text: "Security footage has leaked: Rox, three years ago, at a MegaBulk, taking the entire free-sample tray and giving a speech about " +
        "'the commodification of the snack'. It explains the ban. It is also extremely funny. It is everywhere.",
      choices: [
        { label: 'Own it', hint: 'Buzz ↑ · Haters ↑', effects: { buzz: 8, mood: { rox: 6 }, fan: { hater: 0.02 } },
          outcome: 'Rox reposts it with the caption "I STAND BY THE SPEECH". The speech becomes a song. The song is ninety seconds long.' },
        { label: 'Apologize to MegaBulk', hint: 'Haters ↓ · Rox ↓', effects: { mood: { rox: -8 }, fan: { hater: -0.02 } },
          outcome: 'Rox writes a formal apology. MegaBulk replies with a formal lifetime ban, laminated. She frames it.' },
        { label: 'Free samples at the next show', hint: '−$60 · Fans ↑', effects: { fund: -60, fans: 15 },
          outcome: 'A table of free samples at the merch booth, cubed cheese on toothpicks. Rox gives the speech again. The crowd takes it all.' }
      ] },
    { id: 'scandal_fh_skateboard', type: 'fame', speaker: 'rox', title: 'Caught on a Skateboard', gate: only({}),
      text: "A photo is going around: the band, backstage at a festival, riding Shredwood skateboards. Shredwood sponsors the Mall Rats. " +
        "The caption: 'FROST HEAVE SOLD OUT TO THE MALL.' Siobhan has already reposted it with a heart.",
      choices: [
        { label: 'Explain: we found them', hint: 'Haters ↓', effects: { buzz: 2, fan: { hater: -0.02 } },
          outcome: 'The boards were left behind the stage. Moth confirms this in a single sentence. People believe Moth.' },
        { label: 'Snap the boards on stage', hint: 'Buzz ↑ · Haters ↑', effects: { buzz: 8, fan: { hater: 0.02 }, mood: { rox: 6 } },
          outcome: 'Four boards snapped over four knees at the next show. The clip outdoes the photo. Siobhan reposts that too.' },
        { label: 'Ignore it. Play.', hint: 'Chemistry ↑', effects: { chemistry: 4, burnout: 3 },
          outcome: 'It blows over in a week. Benny keeps one board and uses it as a shelf for his two picks.' }
      ] },

    // ---- The home superfan and the fan club (variants of the base fan cards) ----
    { id: 'fans_dale_hello_frost_heave', type: 'fame', speaker: 'fh_delphine', title: 'Delphine From the Suds-O-Rama', gate: only({}),
      text: "A note under the basement door, in careful school-bus-driver handwriting: 'Hello. Delphine, from machine 6. I heard you through " +
        "the floor. I will be at every show. Every one. This is not a threat. It is a schedule.'",
      choices: [
        { label: 'Welcome aboard, Delphine', effects: { chemistry: 3, fan: { superfan: { dale: 10 } } },
          outcome: 'Delphine slides a second note under the door: a thumbs-up, drawn with a ruler. Then a third: her lawn chair has a name. It is "Chair".' },
        { label: 'Guest list, forever', effects: { buzz: 2, fan: { superfan: { dale: 15 } } },
          outcome: 'She insists on paying anyway. She pays in quarters. From machine 6. She brings a roll.' },
        { label: 'Ask what she heard', effects: { chemistry: 2, fan: { superfan: { dale: 5 } } },
          outcome: '"Everything," she says. "Since the first night. The bridge was bad. It\'s better now." She is right.' }
      ] },
    { id: 'fans_trucker_frost_heave', type: 'road', speaker: 'moth', title: 'The Jumper-Cable Story', gate: only({}),
      text: "Driving home from a gig, the Pothole dies at the Petro-Canuck in Davidson at 2 a.m. Moth is already under the hood. A semi pulls in. " +
        "A trucker named Wendell produces jumper cables longer than the van. Moth does not want help. Moth needs help.",
      choices: [
        { label: 'Let Wendell help Moth', effects: { fund: -12, mood: { moth: -3 }, fan: { superfan: { trucker: 10 } } },
          outcome: 'Moth holds the cables. Wendell holds the flashlight. They respect each other deeply by 2:20. Coffee is on you.' },
        { label: 'Play him a song in the lot', effects: { burnout: 4, chemistry: 3, fan: { superfan: { trucker: 15 } } },
          outcome: 'Two chords on a practice amp under the gas-station lights. Wendell honks the air horn at the end. A dog in Davidson howls.' },
        { label: 'Sign his thermos', effects: { buzz: 2, fan: { superfan: { trucker: 8 } } },
          outcome: '"Now I can never wash it," says Wendell, who has clearly never washed it. Moth signs the jumper cables.' }
      ] },
    { id: 'fans_macaroni_frost_heave', type: 'fame', speaker: 'fh_delphine', title: 'A Gift From Delphine', gate: only({}),
      text: "After the show Delphine hands over a pizza box wrapped in a laundromat flyer. Inside: a portrait of the whole band made entirely of " +
        "dryer lint. Six months of Thursdays. Moth's hair is the grey lint. Benny's is the blue.",
      choices: [
        { label: 'Hang it in the basement', effects: { chemistry: 3, fan: { gift: 'fh_lint_portrait', superfan: { dale: 10 } } },
          outcome: 'It goes up by the stairs. Irma says it is a fire hazard. Irma also stops in front of it every time she comes down.' },
        { label: 'Let Moth hang it in the van', effects: { mood: { moth: 6 }, fan: { gift: 'fh_lint_portrait', superfan: { dale: 8 } } },
          outcome: 'Moth hangs it on the van ceiling, level to the millimetre, then adds a strand of lint that fell off. It is perfect now.' }
      ] },
    { id: 'fans_hater_page_frost_heave', type: 'fame', speaker: 'fh_janice', title: 'The Anti-Fan Club', gate: only({}),
      text: "Janice from the Leader-Pest reports on a new page: '{band} Is Overrated (Fan Club)'. It has an anthem with three chords, a logo and a " +
        "monthly meeting at a Moose Jaw Legion. Its founder is a man named Thad. It has more members than some of your gigs.",
      choices: [
        { label: 'Show up to their meeting', hint: 'Gamble: charm the haters',
          roll: { chance: 0.5, stat: 'chemistry', statScale: 0.005,
            success: { effects: { buzz: 8, fans: 20, fan: { hater: -0.04 } }, outcome: 'You bring a pizza. By dessert, Thad is in the mailing list and three members are in the pit.' },
            fail: { effects: { buzz: -3, mood: { benny: -5 } }, outcome: 'They play their three-chord anthem at you. Benny has to leave the building.' } },
          outcome: 'You drive to Moose Jaw with a pizza.' },
        { label: 'Ignore them. Play louder.', effects: { burnout: 4, chemistry: 3 },
          outcome: 'They review your next show anyway. "Too loud. Two chords. 4 stars." It is their best review ever.' }
      ] },
    { id: 'fans_patreeon_frost_heave', type: 'money', speaker: 'rox', title: 'Patreeon', gate: only({ era: SW }),
      text: "Rox found a website: Patreeon. 'Support your favourite band's van repairs.' Superfans pay monthly; you post exclusive stuff. Tiers: " +
        "Drumstick, Snare, Full Kit. Delphine has already asked if she can pay in quarters.",
      choices: [
        { label: 'Open the fan club', effects: { buzz: 3, fan: { club: 'open' } },
          outcome: 'Patreeon is live. First member: Delphine, Full Kit, 12:01 a.m. Second member: Irma, Drumstick, "to keep an eye on things".' },
        { label: 'Every dollar to the van', effects: { chemistry: 3, mood: { moth: 6 }, fan: { club: 'open' } },
          outcome: 'The tier descriptions all end with "(for the van)". Moth reads the list of members every night. Patreeon is live.' },
        { label: "Not yet. It's a racket.", effects: { chemistry: 3, mood: { rox: 4 } },
          outcome: 'Rox gives a speech about the gig economy. The van makes a noise during it. Benny bookmarks the website anyway.' }
      ] },
    { id: 'fans_club_grumble_frost_heave', type: 'money', speaker: 'fh_delphine', title: 'Patreeon Grumbles', gate: only({ era: SW }),
      text: "A polite note from Delphine, on behalf of 'the members': it has been a while since an exclusive. Some are asking what the money is " +
        "for. Delphine is not asking. Delphine would never. She just thought you should know. She underlined 'never'.",
      choices: [
        { label: 'Film an exclusive tonight', effects: { burnout: 5, fan: { clubHappy: 25 } },
          outcome: 'A 50-minute livestream of Moth replacing the van\'s muffler. Members love it. Moth does not look at the camera once.' },
        { label: 'Send every member a postcard', effects: { fund: -150, fan: { clubHappy: 15 } },
          outcome: 'Four hundred postcards of the frost heave. Delphine frames hers. Benny signs each one with two lines.' },
        { label: "They'll live", effects: { burnout: -4, fan: { clubHappy: -10, super: -0.01 } },
          outcome: "Some cancel. Delphine doesn't. Delphine says it's fine. It sounds like it isn't fine." }
      ] }
  ]);

  /* ======================================================================================================================
     Licensing (2c_sim_licensing): the band's "employer" brand (a city-hall PSA, brand.band filter) and its sellout scandal,
     queued ahead of the neutral sellout scandal (licenseScandals is first-match).
     ====================================================================================================================== */
  var LIC = obj(K, 'licensing');
  add(list(LIC, 'brands'), [
    { id: 'fh_city_psa', band: [B], name: 'City Hall Waste Wise', what: 'city PSA',
      blurb: "The city's new blue-bin campaign. A public service announcement, with your song, and Rox's face on every bus bench. Next to Pomeroy's.",
      fee: [1500, 3000], genres: { punk: 3 }, sellout: 0.8, buzz: 5, reach: 0.012, speaker: 'rox', takeFx: { mood: { rox: -6 } },
      title: 'Your City Needs You (To Recycle)',
      offer: 'City Hall wants "{adsong}" for a blue-bin PSA: a recycling truck in slow motion, then Rox, smiling, holding a bin. ' +
        '{adfee}. The storyboard has Pomeroy in it. Rox is pale. Rox is never pale.',
      take: 'The PSA runs on every bus bench and between periods. Rox, smiling, next to Pomeroy, holding a bin. She wears a toque over her face in public.',
      decline: 'You pass. The city uses a jingle about bins. Rox hugs everyone, one by one, then goes to council to heckle the jingle.',
      counterWin: 'City Hall pays more. The communications manager says "it is within the budget". Rox asks to see the budget. They hang up.',
      counterWalk: 'City Hall goes with a ukulele cover of a public-domain song. Rox is so relieved she recycles for a week without complaining.',
      expire: 'City Hall went with a ukulele. Rox has never loved a ukulele more.' }
  ]);
  add(list(K, 'licenseCards'), [
    { id: 'lic_scandal_fh_psa', type: 'fame', speaker: 'rox', title: 'Punk Sells Out', gate: only({}),
      text: "The Leader-Pest's front page: 'PUNK SELLS OUT'. Someone spliced the {brand} spot with an old clip of Rox screaming at council " +
        "about corporate influence. It is everywhere. Pomeroy has shared it. With a thumbs-up.",
      choices: [
        { label: 'Rox explains on camera', hint: 'Haters ↓ · Rox ↓', effects: { buzz: 2, mood: { rox: -6 }, fan: { hater: -0.02 } },
          outcome: 'Fourteen minutes about how the fee paid for the van\'s muffler. Most people forgive her. Moth forgives her the most.' },
        { label: '"The van got a muffler"', hint: 'Buzz ↑ · Haters ↑', effects: { buzz: 7, mood: { rox: 4 }, fan: { hater: 0.02 } },
          outcome: 'Rox prints it on a shirt. It sells out. The comments are furious that it sold out. It sells out again.' },
        { label: 'Donate the fee to the library', hint: 'Fund ↓ · Superfans ↑', effects: { fund: -250, chemistry: 3, fan: { super: 0.01 } },
          outcome: 'The library gets a new photocopier. The one that made all your flyers. The comments move on to a ska band.' }
      ] }
  ]);
  var LS_ = list(K, 'licenseScandals'), fhScandal = { card: 'lic_scandal_fh_psa', who: 'rox' }, si = -1;
  for (var li = 0; li < LS_.length; li++) if (LS_[li] && LS_[li].who === 'band') { si = li; break; }
  if (si < 0) LS_.push(fhScandal); else LS_.splice(si, 0, fhScandal);

  /* ======================================================================================================================
     The World (25_sim_tour): the Q3 payoff package, region cards, the homesick variant, calls home, lines through byBand.
     ====================================================================================================================== */
  var WO = obj(K, 'world');
  add(list(WO, 'packages'), [
    { id: 'eu_squat_anthem_tour', region: 'uk_europe', name: 'The Squat Anthem Tour', festival: true,
      needs: { flag: 'squatAnthem', is: ['berlin'], band: [B] },
      needsText: 'Berlin is still waiting for its anthem.',
      blurb: 'Amsterdam, then Berlin, where a squat sings your council song every night, then the punk tent at Wackelstein Open Air.',
      stops: [{ city: 'amsterdam', venue: 'paradiso_lost' }, { city: 'berlin', venue: 'kellerkatze' }, { city: 'wackelstein', venue: 'wackelstein_fest' }],
      payoff: { city: 'wackelstein', flag: 'squatAnthemPayoff', value: 'wackelstein', trophy: 'Wackelstein: the squat anthem', trophyKind: 'payoff',
        line: 'Seventy-five thousand metalheads sing the squat anthem at Wackelstein. Two chords. Wrong words. The whole field.',
        chat: '{band} at Wackelstein: the squat anthem, sung by seventy-five thousand people in a cow field. Berlin wept. So did Benny.',
        card: 'wt_fh_squat_anthem' } }
  ]);
  function wcard(id, region, speaker, title, text, choices, x) {
    var gate = { era: ['world'], band: [B] };
    if (region) gate.region = [region];
    var c = { id: id, type: (x && x.type) || 'road', speaker: speaker, title: title, text: text, gate: gate, once: true, choices: choices };
    for (var k in x || {}) if (k !== 'type') c[k] = x[k];
    return c;
  }
  add(list(WO, 'cards'), [
    wcard('wt_fh_uk_squat_gig', 'uk_europe', 'rox', 'A Squat Gig in London',
      "Nigel the promoter has booked you a 'proper punk' gig in a squatted former bank in London. There is no stage, just the vault. Rox has " +
      'found the old council meeting minutes of the borough in a drawer. She is reading them aloud. The crowd is listening.', [
        { label: 'Play in the vault', hint: 'Fans here ↑ · Burnout ↑', effects: { burnout: 5, tour: { regionFans: 250 } },
          outcome: 'Two chords in a bank vault. The acoustics are criminal. London decides you are the real thing. Nigel pays in actual pounds.' },
        { label: 'Rox reads the minutes', hint: 'Rox ↑ · Buzz ↑', effects: { mood: { rox: 10 }, buzz: 6 },
          outcome: 'The borough minutes from 1983, read over a drone. The squatters take notes. A local councillor in the crowd resigns. Unrelated, probably.' }
      ], { type: 'scene' }),
    wcard('wt_fh_jp_bow', 'japan', 'benny', 'Two Chords in Tokyo',
      "A Tokyo guitar shop has a wall display about Benny: 'THE MAN WHO STOPPED AT TWO'. The staff bow when he walks in. They have prepared a " +
      "guitar with only two strings, as a gift. Benny is overwhelmed. Moth is inspecting the shop's parking.", [
        { label: 'Accept the guitar', hint: 'Benny ↑↑ · Fans here ↑', effects: { mood: { benny: 18 }, tour: { regionFans: 200 } },
          outcome: 'Benny plays both chords in the shop. The staff applaud. A customer weeps. Benny sleeps with the guitar for the rest of the tour.' },
        { label: 'Play a two-chord clinic', hint: 'Buzz ↑ · Burnout ↑', effects: { buzz: 10, burnout: 5 },
          outcome: 'Forty guitarists learn two chords in silence. They thank him deeply. Some of them already knew more. They unlearn them.' }
      ], { type: 'fame' }),
    wcard('wt_fh_au_van', 'australia', 'moth', 'The Rental Van',
      "The Australian rental van has a bull bar, a fridge and a sticker that says NO SLEEPING IN VEHICLE. Moth has read the sticker. She has " +
      'moved in anyway: curtains, a laundry line, a plant from a service station. The rental company has called twice.', [
        { label: "Let Moth live in it", hint: 'Moth ↑↑ · Fund ↓', effects: { mood: { moth: 16 }, fund: -300 },
          outcome: 'The deposit is gone. Moth is happy for the first time since Regina. She waves at every road train. They honk back.' },
        { label: 'Book Moth a hotel room', hint: 'Homesick ↓ · Moth ↓', effects: { mood: { moth: -6 }, tour: { homesick: -6 } },
          outcome: 'Moth sleeps in the hotel car park, in the van, with the curtains. The hotel room is used to store merch.' }
      ], { type: 'road' }),
    wcard('wt_fh_ru_council', 'russia', 'rox', 'A Town Council in Siberia',
      "A small-town council near Novosibirsk has invited Rox to observe a meeting, as a guest of honour. There is a translator. There is a " +
      'samovar. There is a lengthy item about potholes. Rox is quietly overcome. She has found her people.', [
        { label: 'Rox makes public comment', hint: 'Gamble: diplomacy',
          outcome: 'Rox asks the translator to keep up.',
          roll: { chance: 0.55,
            success: { effects: { buzz: 12, mood: { rox: 14 }, tour: { regionFans: 250 } }, outcome: 'The council passes a pothole motion "in honour of our Canadian guest". Rox is given a medal. It is a real medal.' },
            fail: { effects: { mood: { rox: -6 } }, outcome: 'The translator gives up at minute nine. Rox finishes anyway. The mayor claps politely and gives her a jar of pickles.' } } },
        { label: 'Just watch. Take notes.', hint: 'Chemistry ↑ · Rox ↑', effects: { chemistry: 4, mood: { rox: 8 } },
          outcome: 'Rox fills a notebook. Back in Regina she will quote it at Pomeroy for years. Pomeroy will not know how to respond.' }
      ], { type: 'scene' }),
    wcard('wt_homesick_frost_heave', null, 'mom', 'Homesick',
      "Mom calls. It is 4 a.m. in Regina. Nobody has slept. {soloist} says it out loud: 'can we just go home.' Moth has been staring at a " +
      'photo of the Pothole on her phone for an hour. Rox misses council. Even the council minutes. Especially the minutes.', [
        { label: 'Fly home early', hint: 'Skip the rest of the tour', effects: { mood: { all: 8 }, tour: { endTour: true, homesick: -20 } },
          outcome: 'You change the flights. The promoter is disappointed. Moth goes straight from the airport to the van and does not come out for a day.' },
        { label: 'Finish what we started', hint: 'Moods ↓ · Burnout ↑', effects: { mood: { all: -5 }, burnout: 5, chemistry: 3 },
          outcome: 'Group hug in a hotel corridor. Rox gives a speech. You finish the tour. It gets into the band\'s bones.' },
        { label: 'Fly Delphine in', hint: 'Fund ↓ · Homesick ↓↓', effects: { fund: -1400, tour: { homesick: -25 } },
          outcome: 'Delphine arrives with a laundry bag of snacks and a lawn chair. She sits front row. Everyone feels like Thursday.' }
      ], { type: 'drama', story: true }),
    wcard('wt_fh_squat_anthem', 'uk_europe', 'rox', 'The Squat Anthem',
      "Wackelstein Open Air. Seventy-five thousand metalheads in a cow field, and one tent full of punks from Berlin who walked here. By the " +
      'second chorus the tent has emptied onto the field and the whole festival is singing your council song. Wrong words. Both chords.', [
        { label: 'Rox leads it', hint: 'Rox ↑↑ · Buzz ↑', effects: { mood: { rox: 18 }, buzz: 12, tour: { regionFans: 600 } },
          outcome: 'Rox stage-dives off the tent pole and is carried across a cow field by seventy-five thousand people. She lands by the beer tent. Legend.' },
        { label: 'Benny plays a third chord', hint: 'Gamble: the moment demands it',
          outcome: 'Benny looks at the field. He looks at his hand. He moves one finger.',
          roll: { chance: 0.5,
            success: { effects: { chemistry: 10, fans: 400, mood: { benny: 12 } }, outcome: 'One third chord, once, on the last chorus. The field roars. Benny never plays it again. He never needs to.' },
            fail: { effects: { chemistry: 6, mood: { benny: 8 } }, outcome: 'He cannot do it. He plays chord two, very loudly. Seventy-five thousand people agree it was the right call.' } } }
      ], { type: 'fame', story: true })
  ]);
  members(obj(WO, 'callHome'), {
    rox: ['Called Mom. She asked if they have potholes here. They do. Different potholes. Worse, honestly.',
      'Tried to call council from here. Long distance. They still did not pick up.',
      'Mom says the ward misses me. Ward 6 specifically. She checked.'],
    benny: ['called my brother. told him about the show. he asked "which chord". both, man. both',
      'facetimed the suds-o-rama. delphine held the phone up to machine 6. i cried a little',
      'mom asked if i am eating. i had a pretzel. it was shaped like a chord'],
    moth: ['Checked the van cam. It is snowing on the Pothole. It looks peaceful.',
      'Called Irma to ask about the van. She said it is fine. She said it like it is not fine.',
      'Called home. Home is a van. Nobody answered. Good.']
  });
  // world.lines.byBand.frost_heave: the tour sim (career.pool over world) and the tour screen (world.lines.byBand, ui.pool on
  // world.lines) both read this shape; cityLines sit on world.byBand (career.pool over world).
  merge(band(obj(WO, 'lines')), {
    depart: { uk_europe: ['Wheels up. Moth left the Pothole with Irma and a two-page list of instructions.'],
      japan: ['Wheels up. Thirteen hours. Rox has a pamphlet about Japanese municipal government. She is highlighting it.'],
      australia: ['Wheels up. Twenty-two hours. Benny has asked if Australia has the same two chords. It does.'],
      russia: ['Wheels up. Moth packed four toques. Rox packed a megaphone. Customs is going to have questions.'] },
    home: ['Home. The basement smells exactly the same: detergent and feedback. Moth hugs the Pothole. For a while.',
      'Back in Regina. Delphine is waiting at the airport with a sign that says MACHINE 6 MISSED YOU.'],
    rival: ['{rival} just played {region} first. The locals keep asking if you know them. "The kickflip band? With the jaw?"'],
    gongNominated: ['{band} is nominated for the Global Gong. The ceremony is in Amsterdam in May. Rox is drafting a speech about Regina potholes.'],
    gongWon: ['{band} won the Global Gong. It is a real gong. It does not go on the drum kit. Benny hits it twice. Once per chord.'],
    gongLost: ['The Global Gong went to {venue}. The band claps politely. Rox claps like a heckle.']
  });
  merge(band(WO), {
    cityLines: {
      berlin: ['Berlin knows the council song. Half the room sings it in German, half in English, all of it wrong. Rox cries a little.'],
      wackelstein: ['A cow field full of metalheads, and one punk tent that will not stop jumping.'],
      london: ['London, in the rain, in a room the size of the basement. It feels like home. It smells like home, actually.']
    }
  });
  perBand(WO, 'gongCarpet', [
    { who: 'reporter', text: 'Janice, Leader-Pest, live from Amsterdam! I flew here on air miles to ask you this: who are you wearing?' },
    { who: '@front', text: 'A blazer from a council rummage sale. It has been to more meetings than you.' },
    { who: 'reporter', text: 'Is it true the Gong is a real gong?' }, { who: '@soloist', text: 'Yes. It only makes one sound. We respect that. It does not go on the drum kit.' }
  ]);

  /* ======================================================================================================================
     Road cards (26_sim_world, mid-drive; garage magnitudes, van: { condition } needs a hint). Moth's pool (her apartment,
     her laundry, free fixes), the you-drive pool (when Moth is gone) and the band's own cards ({driver} = whoever drives).
     ====================================================================================================================== */
  function road(extra) { var gate = { band: [B] }; for (var k in extra) gate[k] = extra[k]; return gate; }
  var MOTH = ['moth'], YOU = ['you'];
  add(list(K, 'roadCards'), [
    // ---- Moth drives: it is her apartment ----
    { id: 'road_fh_moth_laundry', type: 'road', speaker: 'moth', title: 'The Laundry Line', once: false, cooldown: 8, gate: road({ driver: MOTH }),
      text: "Moth's laundry line runs the length of the van. At a hundred kilometres an hour a sock slides down it and lands on the windshield, " +
        "directly in Moth's line of sight. She does not slow down. She does not blink. She says: 'Somebody get that.'",
      choices: [
        { label: 'Somebody gets that', hint: 'Moth ↑', effects: { mood: { moth: 5 } },
          outcome: 'Benny retrieves the sock and hangs it back in its exact place. Moth nods at him in the mirror. Benny will talk about that nod for a week.' },
        { label: 'Take the laundry down', hint: 'Moth ↓ · Chemistry ↑', effects: { mood: { moth: -6 }, chemistry: 3 },
          outcome: 'You take the line down. Moth drives the next hundred kilometres in total silence. At the gas station, the line goes back up.' },
        { label: 'Leave it. It is a vibe.', hint: 'Burnout ↑', effects: { burnout: 3, chemistry: 2 },
          outcome: 'The sock rides the windshield all the way to Moose Jaw like a hood ornament. Rox salutes it every ten kilometres.' }
      ] },
    { id: 'road_fh_moth_shoes', type: 'road', speaker: 'moth', title: 'Shoes Off', once: false, cooldown: 10, gate: road({ driver: MOTH, season: ['winter'] }),
      text: "It is minus thirty and the van's rule is shoes off at the door, because the van is Moth's home and the floor is her carpet. " +
        "Four people's boots are in a pile on the passenger seat. The heater does not reach the back. Toes are at risk.",
      choices: [
        { label: 'Follow the rule', hint: 'Moth ↑ · Burnout ↑', effects: { mood: { moth: 8 }, burnout: 4 },
          outcome: 'Everyone rides in socks, feet under the merch box. Moth hands out slippers from a drawer nobody knew was there.' },
        { label: 'Ask for an exception', hint: 'Gamble: Moth considers it',
          outcome: "Rox asks, formally, for a winter exception.",
          roll: { chance: 0.4,
            success: { effects: { chemistry: 4, burnout: -3 }, outcome: "Moth thinks for forty kilometres, then says 'boots on the mat only'. There is a mat now. There was always a mat." },
            fail: { effects: { mood: { rox: -4 } }, outcome: "Moth says 'no' and turns the heater up one notch as a kindness. It is the most she can give." } } },
        { label: 'Buy everyone wool socks', hint: '−$30 · Everyone ↑', effects: { fund: -30, mood: { all: 3 } },
          outcome: 'Four pairs of wool socks at a gas station in Chamberlain. Moth approves the purchase. It goes in the van rules as an amendment.' }
      ] },
    { id: 'road_fh_moth_coat_hanger', type: 'road', speaker: 'moth', title: 'The Coat Hanger', once: false, cooldown: 10, gate: road({ driver: MOTH, minKm: 60 }),
      text: "A clunk, a rattle, and the tailpipe is dragging on the highway. Moth pulls over, gets out, lies down on the gravel shoulder and " +
        "slides under the van holding a coat hanger. Rox holds a flashlight. It is unclear if Moth needs it.",
      choices: [
        { label: 'Let Moth work', hint: 'Van ↑ · Moth ↑', effects: { mood: { moth: 6 }, van: { condition: 6 } },
          outcome: 'Four minutes. The tailpipe is attached more firmly than it was at the factory. Moth wipes her hands on a sock. It was her laundry.' },
        { label: 'Hand her tools', hint: 'Van ↑ · Chemistry ↑', effects: { chemistry: 3, van: { condition: 4 } },
          outcome: 'You pass her pliers, a zip tie and a second coat hanger. She says "thank you". You feel like a surgeon\'s assistant.' },
        { label: 'Call a tow instead', hint: '−$90 · Moth ↓', effects: { fund: -90, mood: { moth: -8 } },
          outcome: 'The tow driver arrives to find the tailpipe fixed and Moth sitting on the bumper, waiting to tell him. He charges anyway.' }
      ] },
    { id: 'road_fh_moth_mail', type: 'road', speaker: 'moth', title: 'Mail Call', gate: road({ driver: MOTH, minKm: 60 }),
      text: "At a gas station outside Chamberlain the clerk says there is mail for Moth. Somebody forwarded it here. It is a letter from the " +
        "province about her 'residential vehicle status'. The clerk wants to know if Moth lives in the van. The clerk has a form.",
      choices: [
        { label: 'Moth fills in the form', hint: 'Moth ↑', effects: { mood: { moth: 6 }, burnout: 3 },
          outcome: "Under 'dwelling type' Moth writes 'the Pothole'. Under 'occupants' she writes 'me, and guests (Tuesdays)'. It is accepted." },
        { label: 'Rox handles the clerk', hint: 'Gamble: the gas station bureaucracy',
          outcome: 'Rox asks to see the clerk\'s authority.',
          roll: { chance: 0.5,
            success: { effects: { buzz: 4, chemistry: 3 }, outcome: 'The clerk has no authority. He just liked the form. He gives everyone a free coffee to end the conversation.' },
            fail: { effects: { burnout: 5 }, outcome: 'The clerk has a lot of authority. It takes an hour. You buy a lot of jerky to make it stop.' } } },
        { label: 'Frame the envelope', hint: 'Chemistry ↑', effects: { chemistry: 3 },
          outcome: 'Proof of residence, stamped by the province. Moth tapes it to the dash next to her laundry.' }
      ] },
    { id: 'road_fh_moth_rest_stop', type: 'road', speaker: 'moth', title: 'A Very Nice Rest Stop', once: false, cooldown: 10, gate: road({ driver: MOTH, minKm: 100 }),
      text: "Moth has pulled into a rest stop on the Trans-Canada and turned the engine off. There is a picnic table, a view of a slough and " +
        "a sunset. She says it is 'a very nice rest stop'. She would like to stay the night. The gig is in three hours.",
      choices: [
        { label: 'Twenty minutes. Then we go.', hint: 'Moth ↑ · Burnout ↓', effects: { mood: { moth: 6 }, burnout: -4 },
          outcome: 'Twenty minutes of sunset over a slough. Nobody talks. Moth makes tea on a camp stove. You make the gig with eleven minutes to spare.' },
        { label: 'Stay the night. Skip soundcheck.', hint: 'Moth ↑↑ · Chemistry ↑ · Burnout ↑', effects: { mood: { moth: 12 }, chemistry: 4, burnout: 4 },
          outcome: 'You leave at dawn and play without a soundcheck. It sounds terrible and nobody cares. Moth is the happiest she has been all year.' },
        { label: 'Keep driving', hint: 'Moth ↓', effects: { mood: { moth: -6 }, drumSkill: 1 },
          outcome: 'Moth starts the van without a word. At the gig she plays every note perfectly and looks at the slough in her head.' }
      ] },
    { id: 'road_fh_moth_crumbs', type: 'road', speaker: 'moth', title: 'Crumbs in the Kitchen', once: false, cooldown: 8, gate: road({ driver: MOTH }),
      text: "Benny has opened a family-size bag of ketchup chips in the back of the van. The back of the van is Moth's kitchen. A single chip " +
        "has fallen between the seats. Moth has noticed it in the mirror. She is driving slower now, which is worse.",
      choices: [
        { label: 'Benny vacuums at the next stop', hint: 'Moth ↑ · Benny ↓', effects: { mood: { moth: 6, benny: -4 } },
          outcome: 'Benny vacuums the whole van with a gas-station vacuum for two loonies. Moth inspects. She finds the chip. Benny is devastated.' },
        { label: 'Share the chips with Moth', hint: 'Gamble: a peace offering',
          outcome: 'Benny holds the bag forward, very slowly.',
          roll: { chance: 0.5,
            success: { effects: { chemistry: 5, mood: { moth: 4 } }, outcome: 'Moth takes one chip, eats it, and says "fine". The van relaxes. Benny has never felt so forgiven.' },
            fail: { effects: { mood: { moth: -6 } }, outcome: 'Moth does not take a chip. She puts on the hazards. You all eat in the ditch.' } } },
        { label: 'No food in the van. Ever.', hint: 'Chemistry ↓ · Moth ↑', effects: { chemistry: -2, mood: { moth: 8 } },
          outcome: 'A new van rule. It is written on masking tape above the sliding door. Rox tries to amend it at every stop.' }
      ] },
    { id: 'road_fh_moth_named_potholes', type: 'road', speaker: 'moth', title: 'The Named Potholes', gate: road({ driver: MOTH, season: ['spring'] }),
      text: "Spring on Highway 6. Moth knows every pothole by name and drives around each one like an old friend: Gary, the Twins, Big Deb. " +
        "Rox is taking notes for council. Benny is carsick. There is a new one ahead. Moth has not named it yet.",
      choices: [
        { label: 'Let Rox name it', hint: 'Rox ↑ · Buzz ↑', effects: { mood: { rox: 6 }, buzz: 3 },
          outcome: "Rox names it Pomeroy. Moth approves. She drives around it with extra care, out of spite." },
        { label: 'Hit it. Test the van.', hint: 'Van ↓ · Burnout ↑', effects: { burnout: 4, van: { condition: -5 } },
          outcome: 'The van leaves the ground for half a second. Everyone screams. Moth says "Gary would never" and pulls over to check the axle.' },
        { label: 'Report it to the RM', hint: 'Chemistry ↑', effects: { chemistry: 3 },
          outcome: 'You call the rural municipality from the next gas station. A man named Wes says he will "go have a look". He sounds sincere.' }
      ] },
    { id: 'road_fh_moth_plant', type: 'road', speaker: 'moth', title: 'The Plant', gate: road({ driver: MOTH, minKm: 60 }),
      text: "A gravel detour. On the first washboard stretch Moth's plant, a spider plant named Ward, falls off the dash and scatters soil across " +
        "the setlist. Moth pulls over immediately. She is kneeling in the van, re-potting Ward with her hands.",
      choices: [
        { label: 'Help re-pot Ward', hint: 'Moth ↑ · Chemistry ↑', effects: { mood: { moth: 8 }, chemistry: 3 },
          outcome: 'Four people re-pot a spider plant on the shoulder of a gravel road. Ward survives. Moth says "thank you" twice.' },
        { label: 'Buy Ward a seatbelt', hint: '−$20 · Moth ↑', effects: { fund: -20, mood: { moth: 10 } },
          outcome: 'A bungee cord and a cup holder from the next gas station. Ward is secured. Moth checks on him every ten minutes.' },
        { label: 'Keep going, it is a plant', hint: 'Moth ↓↓', effects: { mood: { moth: -10 }, drumSkill: 1 },
          outcome: "Moth drives on, holding Ward in one hand. Nobody speaks. Later she tells Ward, loudly, that some people 'don't get it'." }
      ] },
    { id: 'road_fh_moth_quiet_hours', type: 'road', speaker: 'moth', title: 'Quiet Hours', once: false, cooldown: 9, gate: road({ driver: MOTH, minKm: 100 }),
      text: "It is 10:01 p.m. The van has quiet hours from ten, because it is an apartment building with one resident. Rox is mid-song in the " +
        "back, rehearsing the chorus at full volume. Moth has turned off the radio and is looking at the clock.",
      choices: [
        { label: 'Quiet hours are quiet hours', hint: 'Moth ↑ · Burnout ↓', effects: { mood: { moth: 6 }, burnout: -4 },
          outcome: 'Everyone whispers until Brandon. It is the most peaceful drive of the tour. Rox mouths the chorus silently. It is still loud.' },
        { label: 'One more chorus', hint: 'Rox ↑ · Moth ↓', effects: { mood: { rox: 6, moth: -6 } },
          outcome: 'One more chorus. Moth pulls onto the shoulder and waits it out with the hazards on. Then she drives on. In silence.' },
        { label: 'Headphones for everyone', hint: '−$40 · Chemistry ↑', effects: { fund: -40, chemistry: 4 },
          outcome: 'Four pairs of gas-station headphones. The band rehearses silently, air-drumming, air-screaming. Moth approves.' }
      ] },

    // ---- You drive (Moth is gone): her apartment, your problem ----
    { id: 'road_fh_you_socks', type: 'road', speaker: 'rox', title: "Moth's Socks", once: false, cooldown: 8, gate: road({ driver: YOU }),
      text: "You are driving Moth's apartment without Moth. Her laundry still hangs from the rear-view mirror and you cannot see anything behind " +
        "you. Taking it down feels wrong. Leaving it up feels dangerous. Rox says it is 'a matter of respect'.",
      choices: [
        { label: 'Leave the laundry up', hint: 'Gamble: blind spots',
          outcome: 'You adjust the side mirrors instead.',
          roll: { chance: 0.6,
            success: { effects: { chemistry: 3 }, outcome: 'You drive the whole way on side mirrors. It works. The socks stay. Moth would be proud.' },
            fail: { effects: { van: { condition: -4 }, burnout: 4 }, outcome: 'You back into a snowbank at the gas station. The socks are fine. The bumper is not.' } } },
        { label: 'Fold it and put it away', hint: 'Chemistry ↑', effects: { chemistry: 4, burnout: 3 },
          outcome: 'You fold every sock the way Moth folds them. It takes forty minutes. You finally understand something about her.' },
        { label: "Text Moth a photo", hint: 'Everyone ↑', effects: { mood: { all: 3 } },
          outcome: 'Moth replies from wherever she is: "leave it". Then: "and water Ward". Ward is the plant. You water Ward.' }
      ] },
    { id: 'road_fh_you_detour', type: 'road', speaker: 'rox', title: 'The Albert Street Detour', once: false, cooldown: 10, gate: road({ driver: YOU }),
      text: "Albert Street is closed for construction. The detour sign points into a parking lot. You follow it. Rox is furious: she voted " +
        "against this detour at council, in spirit. She has opinions about every turn. Mostly left.",
      choices: [
        { label: "Follow Rox's directions", hint: 'Gamble: Rox knows the city',
          outcome: "Rox says 'left, left, left, trust me'.",
          roll: { chance: 0.5,
            success: { effects: { mood: { rox: 6 }, chemistry: 3 }, outcome: 'Rox knows every back lane in the city. You arrive early. She gives a speech about it.' },
            fail: { effects: { burnout: 5, fund: -20 }, outcome: 'Three lefts put you back in the parking lot. You pay for parking. Rox writes a letter.' } } },
        { label: 'Follow the signs', hint: 'Burnout ↑', effects: { burnout: 4 },
          outcome: 'The signs lead you around the entire city once. You pass council chambers twice. Rox waves both times.' },
        { label: 'Park and walk the gear', hint: 'Chemistry ↑ · Burnout ↑', effects: { chemistry: 4, burnout: 5 },
          outcome: 'You carry the drum kit six blocks through a construction site. A crew member helps. He wants to be on the guest list.' }
      ] },
    { id: 'road_fh_you_gas_station', type: 'road', speaker: 'benny', title: 'The Gas-Station Argument', once: false, cooldown: 8, gate: road({ driver: YOU, minKm: 60 }),
      text: "Gas station, Indian Head. Benny wants ketchup chips. Rox wants to boycott the gas station on principle; the principle is about " +
        "its sign. You are at pump four with the nozzle in your hand and the fund card in your mouth. It is minus twenty.",
      choices: [
        { label: 'Chips for everyone', hint: '−$15 · Everyone ↑', effects: { fund: -15, mood: { all: 3 } },
          outcome: 'Four bags of ketchup chips. Rox eats hers "under protest". Benny eats his in two bites. Two.' },
        { label: 'Side with Rox. Next station.', hint: 'Rox ↑ · Benny ↓', effects: { mood: { rox: 6, benny: -5 } },
          outcome: 'The next station is 60 kilometres away. You make it on fumes and principle. The sign there is worse. Rox says nothing.' },
        { label: 'Everyone stays in the van', hint: 'Burnout ↑ · Chemistry ↑', effects: { burnout: 4, chemistry: 3 },
          outcome: 'You pump the gas alone in the wind while the band argues in the van with the windows up. It is like watching a silent film.' }
      ] },
    { id: 'road_fh_you_moth_calls', type: 'road', speaker: 'rox', title: 'Moth Is Calling', once: false, cooldown: 10, gate: road({ driver: YOU, minKm: 60 }),
      text: "Your phone rings. It is Moth, wherever Moth is now. She has a feeling you are driving her van too fast in fourth gear. You are. " +
        "She would like you to know the brakes 'pull left a little, like me'. She would like to stay on the line.",
      choices: [
        { label: 'Put her on speaker', hint: 'Chemistry ↑ · Moth ↑', effects: { chemistry: 4, mood: { moth: 6 } },
          outcome: 'Moth talks you through three towns. She knows every pothole. The band cheers when she says "left, now". It is like she never left.' },
        { label: "Tell her you've got it", hint: 'Moth ↓ · Your chops ↑', effects: { mood: { moth: -5 }, drumSkill: 1 },
          outcome: 'You have got it, mostly. The brakes pull left. You pull right. It is a partnership now, you and her van.' },
        { label: 'Pull over and listen', hint: 'Van ↑', effects: { burnout: 3, van: { condition: 4 } },
          outcome: 'Moth diagnoses a loose belt over the phone from the sound alone. You tighten it. She hangs up without saying goodbye. That is love.' }
      ] },

    // ---- The band on the road (any driver) ----
    { id: 'road_fh_shotgun', type: 'road', speaker: 'rox', title: 'The Fight Over Shotgun', once: false, cooldown: 8, gate: road({}),
      text: "Rox and Benny reach the passenger door at the same moment. Rox says shotgun is a right, 'like assembly'. Benny says he called it in " +
        "Regina, in his head. {driver} is waiting. The engine is running. The heater is not.",
      choices: [
        { label: 'Rock paper scissors', hint: 'Gamble: best of three',
          outcome: 'Benny throws rock. He always throws rock.',
          roll: { chance: 0.5,
            success: { effects: { mood: { benny: 6 }, chemistry: 2 }, outcome: 'Benny wins with rock, twice. He calls it "a two-rock victory". Rox demands a recount.' },
            fail: { effects: { mood: { rox: 6, benny: -4 } }, outcome: 'Rox throws paper both times. She covers the rock like a motion covers an amendment. Benny sulks in the back.' } } },
        { label: 'Neither. You take it.', hint: 'Chemistry ↑ · Everyone ↓', effects: { chemistry: 3, mood: { rox: -3, benny: -3 } },
          outcome: 'You sit up front. Rox and Benny share the back seat in silence for a hundred kilometres, then share a bag of chips. Peace.' },
        { label: 'Alternate by town', hint: 'Burnout ↑ · Everyone ↑', effects: { burnout: 3, mood: { all: 3 } },
          outcome: 'They swap seats at every town sign. There are a lot of towns. It takes forever. Nobody complains, somehow.' }
      ] },
    { id: 'road_fh_frost_heaves', type: 'road', speaker: 'benny', title: 'Frost Heaves Ahead', gate: road({ minKm: 100, season: ['spring', 'winter'] }),
      text: "The sign says FROST HEAVES NEXT 40 KM. The highway rolls like the sea. The van leaves the ground at the first one. Benny is filming. " +
        "Rox is screaming the band's name at every bump. {driver} is gripping the wheel very hard.",
      choices: [
        { label: 'Slow down. Respect the heaves.', hint: 'Burnout ↑ · Van ↑', effects: { burnout: 4, van: { condition: 3 } },
          outcome: 'Forty kilometres at sixty. The van survives. The band poses under the sign for a photo. It is the new profile picture.' },
        { label: 'Film the jumps', hint: 'Gamble: content or a cracked axle',
          outcome: 'Benny holds the phone steady. It is not steady.',
          roll: { chance: 0.55,
            success: { effects: { buzz: 8, fans: 10 }, outcome: 'The clip of the van catching air on "FROST HEAVES" goes around the prairies. The highways ministry reposts it.' },
            fail: { effects: { van: { condition: -6 }, burnout: 4 }, outcome: 'The fourth heave cracks the exhaust. The rest of the drive sounds like a tuba.' } } },
        { label: 'Write a song about it', hint: 'Chemistry ↑', effects: { chemistry: 4, mood: { rox: 4 } },
          outcome: "'Next 40 KM' has two chords and forty bumps. It is the only song the band has ever written in the van. It is a banger." }
      ] },
    { id: 'road_fh_megabulk', type: 'road', speaker: 'rox', title: 'The MegaBulk Parking Lot', gate: road({ minKm: 60 }),
      text: "You have stopped for gas next to a MegaBulk. The band needs supplies: water, batteries, forty granola bars. Rox is banned from " +
        "every MegaBulk in the province. She is standing at the edge of the parking lot like a vampire at a doorstep.",
      choices: [
        { label: 'Everyone else goes in', hint: 'Rox ↓ · Chemistry ↑', effects: { mood: { rox: -5 }, chemistry: 3 },
          outcome: 'You come out with supplies and a free sample for Rox, smuggled in a sock. She eats it slowly, triumphantly, in the van.' },
        { label: 'Skip it in solidarity', hint: 'Rox ↑ · Burnout ↑', effects: { mood: { rox: 8 }, burnout: 3 },
          outcome: 'You drive on without supplies. Rox is so moved she buys the gas. You eat gas-station jerky for dinner. Worth it.' },
        { label: 'Rox tries the door', hint: 'Gamble: the greeter',
          outcome: 'Rox walks toward the entrance, head held high.',
          roll: { chance: 0.25,
            success: { effects: { buzz: 6, mood: { rox: 10 } }, outcome: 'A new greeter. She gets in. She buys one granola bar and leaves, arms raised. It is her greatest victory.' },
            fail: { effects: { mood: { rox: -6 } }, outcome: 'The greeter has her photo. He says "ma\'am" and nothing else. It is enough.' } } }
      ] },
    { id: 'road_fh_three_chords', type: 'road', speaker: 'benny', title: 'A Three-Chord Song', once: false, cooldown: 10, gate: road({}),
      text: "The radio is playing a song with three chords in it. Benny has gone rigid in the back seat. He is reaching for the dial. The radio " +
        "is up front. He is reaching over Rox. Rox is enjoying the song. This is going to be a problem.",
      choices: [
        { label: 'Change the station', hint: 'Benny ↑ · Rox ↓', effects: { mood: { benny: 6, rox: -4 } },
          outcome: 'Curling commentary. Benny relaxes. Rox sulks. {driver} secretly prefers the curling.' },
        { label: 'Make Benny listen', hint: 'Gamble: growth',
          outcome: 'Rox holds the dial. Benny holds his breath.',
          roll: { chance: 0.3,
            success: { effects: { skill: { benny: 1 }, mood: { benny: 4 } }, outcome: 'Benny listens to the whole song. He says "the bridge was okay". Nobody has ever heard him say that before.' },
            fail: { effects: { mood: { benny: -8 } }, outcome: 'Benny puts his fingers in his ears and hums one of his two chords until the song ends. For three minutes. One note.' } } },
        { label: 'Radio off. Sing.', hint: 'Chemistry ↑', effects: { chemistry: 4, burnout: -3 },
          outcome: 'The band sings its own songs, a cappella, both chords implied. {driver} taps the steering wheel on two and four.' }
      ] },
    { id: 'road_fh_skater', type: 'road', speaker: 'rox', title: 'A Hitchhiking Skater', gate: road({ minKm: 60, season: ['summer', 'fall'] }),
      text: "A teenager on the shoulder, thumb out, holding a Shredwood skateboard with a Mall Rats sticker on it. He is going to the same town " +
        "as you. He is wearing a {rival} shirt. Rox has already rolled down the window. Nobody knows what she will say.",
      choices: [
        { label: 'Give him a lift', hint: 'Fans ↑ · Chemistry ↑', effects: { fans: 5, chemistry: 3 },
          outcome: 'By the next town he has heard both chords and the whole council story. He gets out wearing one of your shirts over the other one.' },
        { label: 'Rox debates him first', hint: 'Gamble: a convert',
          outcome: "Rox asks him to 'explain the kickflip, politically'.",
          roll: { chance: 0.5,
            success: { effects: { fans: 10, mood: { rox: 6 } }, outcome: 'He cannot. By the end of the ride he has joined your mailing list and peeled off the sticker.' },
            fail: { effects: { mood: { rox: -4 } }, outcome: 'He explains it very well. Rox is quiet for sixty kilometres. At the gig she tries a kickflip. She does not land it.' } } },
        { label: 'Drive on', hint: 'Burnout ↓', effects: { burnout: -3 },
          outcome: 'He waves the skateboard as you pass. In the mirror you see a tour bus with Blaze\'s face on it pull over for him instead.' }
      ] },
    { id: 'road_fh_town_hall', type: 'road', speaker: 'rox', title: 'A Small-Town Council', gate: road({ minKm: 100 }),
      text: "You are driving through a town of four hundred people and its council is meeting tonight, in the curling rink, with the doors " +
        "open. Rox has seen the sign. Rox has asked {driver} to pull over. Rox has never asked for anything so politely.",
      choices: [
        { label: 'Stop. Ten minutes.', hint: 'Rox ↑ · Burnout ↑', effects: { mood: { rox: 10 }, burnout: 3 },
          outcome: 'Forty minutes. Rox makes public comment about their sidewalk salt. They thank her and ask her to come back. She will.' },
        { label: 'Stop and play for them', hint: 'Gamble: a council concert',
          outcome: 'Benny plugs a practice amp into the curling rink wall.',
          roll: { chance: 0.5,
            success: { effects: { fans: 15, buzz: 5 }, outcome: 'The council adjourns for a two-song set. The reeve dances. The minutes record "a musical interlude (approved)".' },
            fail: { effects: { burnout: 5 }, outcome: 'The council votes 3-2 against the set. Rox respects democracy. She sulks for a hundred kilometres.' } } },
        { label: 'Keep driving', hint: 'Rox ↓', effects: { mood: { rox: -6 }, drumSkill: 1 },
          outcome: 'Rox watches the curling rink until it is gone. Then she watches where it was.' }
      ] },
    { id: 'road_fh_crosswind', type: 'road', speaker: 'benny', title: 'The Crosswind', gate: road({ minKm: 60 }),
      text: "A crosswind on the Trans-Canada is pushing the van into the next lane every thirty seconds. The merch box has slid to one side. " +
        "Benny is leaning the other way to 'balance it'. So is Rox. {driver} is fighting the wheel with both hands.",
      choices: [
        { label: 'Everyone lean left', hint: 'Chemistry ↑ · Burnout ↑', effects: { chemistry: 4, burnout: 3 },
          outcome: 'Four people leaning in unison for eighty kilometres. It does nothing. It feels like it does everything.' },
        { label: 'Wait it out at a café', hint: '−$25 · Burnout ↓', effects: { fund: -25, burnout: -5 },
          outcome: 'Pie and coffee in a small-town café while the wind screams. The waitress says it is "a bit breezy". It is 90 km/h.' },
        { label: 'Push on. Hold the line.', hint: 'Van ↓ · Your chops ↑', effects: { drumSkill: 1, van: { condition: -3 } },
          outcome: 'You make it. The side mirror does not. Moth, if she is there, is already sketching a replacement out of a hubcap.' }
      ] }
  ]);

  /* ======================================================================================================================
     Studio events (24_sim_labels, one per studio week; effect key production ±n). Gated to the band, any studio.
     ====================================================================================================================== */
  add(list(K, 'studioEvents'), [
    { id: 'studio_fh_one_take', type: 'drama', speaker: 'rox', title: 'Rox Will Not Do Take Two', once: false, cooldown: 10, gate: only({}),
      text: "Rox has sung the song once, perfectly, furiously, and walked out of the booth. The engineer wants a second take 'for safety'. " +
        "Rox says a second take is 'the first step toward a committee'. She has locked the booth from outside.",
      choices: [
        { label: 'Keep take one', hint: 'Production ↑ · Rox ↑', effects: { production: 3, mood: { rox: 6 } },
          outcome: 'Take one goes on the record, breath, cough and all. Critics will call it "unpolished and alive". Rox calls it "the minutes".' },
        { label: 'Trick her into take two', hint: 'Gamble: tell her it is a soundcheck',
          outcome: "The engineer says 'just a mic check, Rox'.",
          roll: { chance: 0.5,
            success: { effects: { production: 5 }, outcome: 'She screams the whole song as a "mic check". It is even better. Nobody ever tells her. Moth knows.' },
            fail: { effects: { production: -3, mood: { rox: -8 } }, outcome: 'She knows. She sings the phone book instead. It is on the B-side now.' } } },
        { label: 'Comp it from rehearsals', hint: 'Production ↑ · Burnout ↑', effects: { production: 2, burnout: 4 },
          outcome: 'You stitch the vocal together from nine basement recordings. You can hear a dryer buzzer in the bridge. It stays.' }
      ] },
    { id: 'studio_fh_third_chord', type: 'drama', speaker: 'benny', title: 'The Engineer Suggests a Chord', once: false, cooldown: 12, gate: only({}),
      text: "The engineer, trying to help, suggests the chorus might 'open up' with 'maybe a C in there'. The room goes silent. Benny puts his " +
        "guitar down very gently, like it has been insulted, which it has. Moth moves between Benny and the console.",
      choices: [
        { label: 'Explain the principle', hint: 'Benny ↑ · Production ↓', effects: { mood: { benny: 8 }, production: -2 },
          outcome: 'Benny explains for forty minutes. The engineer takes notes. By the end he agrees. He removes a chord from his own band.' },
        { label: 'Let the engineer play it', hint: 'Gamble: Benny might not notice',
          outcome: 'The engineer overdubs a single C at 2 a.m. while Benny sleeps in the van.',
          roll: { chance: 0.35,
            success: { effects: { production: 5 }, outcome: 'Benny never notices. The chorus soars. You will take this secret to the grave.' },
            fail: { effects: { production: -4, mood: { benny: -12 } }, outcome: 'Benny notices on the first playback. He stares at the speaker for a full minute. He takes a walk to Moose Jaw.' } } },
        { label: 'Double the two chords', hint: 'Production ↑ · Chemistry ↑', effects: { production: 3, chemistry: 3 },
          outcome: 'Four guitars, two chords. It is enormous. The engineer says "oh". Just "oh". Benny is vindicated forever.' }
      ] },
    { id: 'studio_fh_van_booth', type: 'weird', speaker: 'moth', title: 'The Van Is the Booth', once: false, cooldown: 10, gate: only({}),
      text: "Moth refuses to record bass in the studio's live room. She would like to record in the van, in the parking lot, where she 'can hear " +
        "herself think'. The engineer has run a cable through the loading door. It is forty metres long.",
      choices: [
        { label: 'Record in the van', hint: 'Production ↑ · Moth ↑', effects: { production: 3, mood: { moth: 8 } },
          outcome: 'The bass sounds warm, close and faintly of fabric softener. The engineer says it is the best bass tone he has ever recorded.' },
        { label: 'Bring the van inside', hint: 'Gamble: the loading door',
          outcome: 'Moth measures the loading door. Then the van.',
          roll: { chance: 0.3,
            success: { effects: { production: 5, buzz: 6 }, outcome: 'It fits with one centimetre to spare. The van is in the studio. The photo becomes the album\'s inner sleeve.' },
            fail: { effects: { fund: -150, production: -2 }, outcome: 'It does not fit. The side mirror now lives in the studio. $150.' } } },
        { label: 'Live room. Please.', hint: 'Moth ↓ · Production ↑', effects: { mood: { moth: -6 }, production: 2 },
          outcome: 'Moth plays in the live room, facing the wall, with a sock from the van on the mic stand. It helps. Nobody asks.' }
      ] },
    { id: 'studio_fh_dryers', type: 'weird', speaker: 'fh_irma', title: 'Record the Dryers', once: false, cooldown: 12, gate: only({}),
      text: "The new song sounds wrong in the studio. Too clean. Irma has driven over with a portable recorder and a solution: the Suds-O-Rama " +
        "dryers, all nine, recorded at full spin, as percussion. She wants a credit. And a fee.",
      choices: [
        { label: 'Record the dryers', hint: '−$60 · Production ↑', effects: { fund: -60, production: 4 },
          outcome: "'Dryers 1-9: Suds-O-Rama. Arranged by Irma Toth.' The song finally sounds like home. Irma buys ten copies." },
        { label: 'Use the old basement demo', hint: 'Production ↑ · Chemistry ↑', effects: { production: 2, chemistry: 4 },
          outcome: 'The dryers were always on the demo. You fly them into the new recording. The song breathes again.' },
        { label: 'No dryers. We are professionals.', hint: 'Production ↓ · Chemistry ↓', effects: { production: -2, chemistry: -2 },
          outcome: 'The song is clean. It is correct. Everyone agrees it is missing something. Irma says "I told you" and bills you anyway.' }
      ] },
    { id: 'studio_fh_minutes_intro', type: 'drama', speaker: 'rox', title: 'The Spoken-Word Intro', once: false, cooldown: 12, gate: only({}),
      text: "Rox wants the album to open with eleven minutes of her reading actual council minutes over a single sustained feedback note. The " +
        "producer wants it cut to thirty seconds. Rox has printed the minutes on a scroll. The scroll is taped to the booth window.",
      choices: [
        { label: 'All eleven minutes', hint: 'Rox ↑↑ · Production ↓', effects: { mood: { rox: 14 }, production: -3 },
          outcome: 'The intro is eleven minutes long. Critics are divided. Council is not: they play it at a staff retreat, as a warning.' },
        { label: 'Thirty seconds, best bits', hint: 'Production ↑', effects: { production: 3, mood: { rox: -4 } },
          outcome: "Thirty seconds: 'Motion carried. Motion carried. Motion defeated.' Then the band crashes in. It is perfect. Rox knows it." },
        { label: 'A hidden track at the end', hint: 'Production ↑ · Rox ↑', effects: { production: 2, mood: { rox: 6 } },
          outcome: 'The full eleven minutes, hidden after track twelve. Fans find it in a week. They start quoting it at shows.' }
      ] },
    { id: 'studio_fh_siobhan_visit', type: 'money', speaker: 'mr_siobhan', title: 'Siobhan Stops By', once: false, cooldown: 14, gate: only({}),
      text: "Siobhan from {rival} is in the studio lounge. She was 'in the area'. She has a proposal: one Shredwood product placement on the record " +
        "sleeve, $400, and 'a whisper of a kickflip sound effect' on track three. Blaze is in the car, waving.",
      choices: [
        { label: 'Take the $400', hint: '+$400 · Production ↑ · Rox ↓', effects: { fund: 400, production: 2, mood: { rox: -8 } },
          outcome: "A tiny skateboard on the back of the sleeve. A kickflip sound on track three. Rox scratches it out of every copy she signs." },
        { label: 'Offer her a tambourine part', hint: 'Gamble: Siobhan can play',
          outcome: 'Moth hands Siobhan a tambourine.',
          roll: { chance: 0.5,
            success: { effects: { production: 4, buzz: 6 }, outcome: 'She is great. She is actually great. She plays it on track three instead of a kickflip. Nobody tells Blaze.' },
            fail: { effects: { production: -2 }, outcome: 'She plays it on the phone the whole time. It is off-beat. It is in the mix. It is her revenge.' } } },
        { label: 'Show her the door', hint: 'Chemistry ↑ · Production ↑', effects: { chemistry: 4, production: 1 },
          outcome: "Siobhan leaves a business card on the console. It says 'Let's talk'. It always says that. You use it as a guitar pick." }
      ] },
    { id: 'studio_fh_too_fast', type: 'weird', speaker: 'benny', title: 'Too Fast for the Machine', once: false, cooldown: 10, gate: only({}),
      text: "The producer's click track tops out at 220 BPM. The new song is 236. The producer says it is 'not a tempo, it is a medical event'. " +
        "Benny says the song has two chords so it is 'basically half as fast'. That is not how tempo works.",
      choices: [
        { label: 'Record without a click', hint: 'Your chops ↑ · Production ↑', effects: { drumSkill: 1, production: 3 },
          outcome: 'You count it in off the dryer thump in your head. It speeds up by the end. It sounds like a riot. It is the single.' },
        { label: 'Slow it to 220', hint: 'Production ↑ · Benny ↓', effects: { production: 2, mood: { benny: -4 } },
          outcome: 'At 220 it sounds like a ballad to the band. To everyone else, still a medical event. The producer is relieved.' },
        { label: 'Speed up the tape after', hint: 'Gamble: chipmunk risk',
          outcome: 'The producer records it at 200 and speeds it up.',
          roll: { chance: 0.5,
            success: { effects: { production: 4, buzz: 5 }, outcome: 'It sounds inhuman. Rox sounds like a hornet with a grievance. Critics love it.' },
            fail: { effects: { production: -3 }, outcome: 'Rox sounds like a cartoon squirrel reading a bylaw. It is a B-side. It is a fan favourite, weirdly.' } } }
      ] }
  ]);

  /* ======================================================================================================================
     The Loonies (24_sim_labels / 59c): outfit cards (flag-gated by the council storyline; the first that passes is dealt),
     the speech and the Worst Van speech (Moth accepts), the carpet, win / lose lines and the punk nominees.
     ====================================================================================================================== */
  var OUT = obj(AW, 'outfits');
  if (!OUT.chain) OUT.chain = 'The chain of office, over a band shirt';
  if (!OUT.sash) OUT.sash = 'A campaign sash (VOTE ROX), worn anyway';
  if (!OUT.jacket) OUT.jacket = 'The jacket, with every safety pin';
  function ofx(extra, outfit) { var o = { flags: { loonieOutfit: outfit } }; for (var k in extra) o[k] = extra[k]; return o; }
  add(list(AW, 'outfitCards'), [
    { id: 'loonie_outfit_fh_councillor', type: 'fame', speaker: 'rox', title: 'The Carpet: Councillor', once: false, cooldown: 20,
      gate: only({ flagEquals: { council: 'won' } }),
      text: "Councillor Delorme is walking the Loonies carpet. She wants to wear the ward's chain of office over her band shirt. The city " +
        "clerk has said the chain 'is not a costume'. Rox has said nothing, which means she has already packed it.",
      choices: [
        { label: 'The chain of office', hint: 'Buzz ↑ · Rox ↑', effects: ofx({ buzz: 8, mood: { rox: 8 } }, 'chain'),
          outcome: "Forty photographers shout 'COUNCILLOR!' She answers questions about snow routes on the red carpet. It is the story of the night." },
        { label: 'A blazer and a megaphone', hint: 'Gamble: the carpet is a public forum',
          outcome: 'Rox brings the megaphone "for accessibility".',
          roll: { chance: 0.5, stat: 'buzz', statScale: 0.005,
            success: { effects: ofx({ buzz: 14, fans: 150 }, 'jacket'), outcome: 'Her red-carpet interview is a town hall. The host joins in. Best Dressed, somehow.' },
            fail: { effects: ofx({ buzz: 5, mood: { rox: -6 } }, 'jacket'), outcome: 'Security confiscates the megaphone at the carpet. Again. Rox is shaken. Loonies security is better than city hall.' } } },
        { label: 'Leave the chain at city hall', hint: 'Chemistry ↑', effects: ofx({ chemistry: 4, fans: 100 }, 'jacket'),
          outcome: 'She wears the jacket with every safety pin. The clerk sends a thank-you note. Rox frames it next to the others.' }
      ] },
    { id: 'loonie_outfit_fh_papers', type: 'fame', speaker: 'rox', title: 'The Carpet: The Papers', once: false, cooldown: 20,
      gate: only({ flagEquals: { council: 'never' } }),
      text: "Rox never ran for council. She kept the torn-up nomination papers, though, and she has glued them to her jacket as a " +
        "corsage. She calls it 'the road not taken, laminated'. Benny thinks it is beautiful. Moth thinks it is flammable.",
      choices: [
        { label: 'The corsage of regret', hint: 'Buzz ↑ · Rox ↑', effects: ofx({ buzz: 8, mood: { rox: 8 } }, 'jacket'),
          outcome: "Photographers ask what it is. Rox explains ward boundaries for four minutes. The papers are the most talked-about accessory of the night." },
        { label: 'Frame it instead', hint: 'Chemistry ↑', effects: ofx({ chemistry: 4, fans: 80 }, 'jacket'),
          outcome: 'The papers go in a frame in the basement. Rox wears the jacket with every safety pin. She looks relieved. Mostly.' }
      ] },
    { id: 'loonie_outfit_fh_sash', type: 'fame', speaker: 'rox', title: 'The Carpet: The Sash', once: false, cooldown: 20,
      gate: only({ flags: ['council'] }),
      text: "Rox has a campaign sash. It says VOTE ROX, WARD 6. Whatever happened with the election, she wants to wear it to the Loonies. " +
        "Benny says it is 'a bit much'. Moth says it matches the van.",
      choices: [
        { label: 'VOTE ROX, on the carpet', hint: 'Buzz ↑ · Rox ↑', effects: ofx({ buzz: 8, mood: { rox: 8 } }, 'sash'),
          outcome: "Photographers ask which election. Rox says 'the next one'. The sash is the most searched outfit of the night." },
        { label: 'Matching sashes for all', hint: 'Gamble: a campaign or a costume',
          outcome: 'Moth sews four sashes in the van on the way to the show.',
          roll: { chance: 0.5, stat: 'chemistry', statScale: 0.005,
            success: { effects: ofx({ buzz: 12, fans: 120 }, 'sash'), outcome: "VOTE ROX, VOTE BENNY, VOTE MOTH, VOTE {player}. A fashion site calls it 'municipal chic'." },
            fail: { effects: ofx({ buzz: 4, burnout: 5 }, 'sash'), outcome: 'The sashes are mistaken for a pageant. Someone hands Benny a tiara. He keeps it.' } } },
        { label: 'Just the jacket', hint: 'Chemistry ↑', effects: ofx({ chemistry: 3, fans: 80 }, 'jacket'),
          outcome: 'The jacket with every safety pin. Classic. Rox keeps the sash in her pocket, just in case someone asks. Someone asks.' }
      ] },
    { id: 'loonie_outfit_fh_jacket', type: 'fame', speaker: 'moth', title: 'The Carpet: What to Wear', once: false, cooldown: 20,
      gate: only({}),
      text: "The Loonies want 'formal attire'. The band owns one blazer, two jackets covered in safety pins and whatever Moth has in the van. " +
        "Moth has opened a drawer nobody has seen before. It contains four pressed shirts. Nobody knows where they came from.",
      choices: [
        { label: "Moth's mystery shirts", hint: 'Fans ↑ · Moth ↑', effects: ofx({ fans: 100, mood: { moth: 8 } }, 'tux'),
          outcome: 'Four pressed shirts, perfectly fitted. Nobody asks. The band looks like a punk band at a funeral. It is a great look.' },
        { label: 'Safety pins, all of them', hint: 'Gamble: fashion or first aid',
          outcome: 'Rox brings a jar of five hundred safety pins.',
          roll: { chance: 0.5, stat: 'buzz', statScale: 0.005,
            success: { effects: ofx({ buzz: 12, fans: 120 }, 'jacket'), outcome: "Best Dressed. The designer on the panel calls it 'the most honest jacket of the year'." },
            fail: { effects: ofx({ buzz: 4, burnout: 5 }, 'jacket'), outcome: 'Benny sits down and discovers forty safety pins at once. He stands for the rest of the night.' } } },
        { label: 'Laundromat-fresh band shirts', hint: 'Chemistry ↑', effects: ofx({ chemistry: 4, buzz: 5 }, 'jacket'),
          outcome: 'Four band shirts, washed that morning at the Suds-O-Rama, still warm. Delphine ironed them. The photographers smell fabric softener.' }
      ] }
  ]);
  perBand(AW, 'speech', { id: 'loonie_speech_frost_heave', type: 'fame', speaker: 'rox', title: 'The Speech', once: false, cooldown: 20, gate: only({}),
    text: "They said your name. The band is on stage holding a loonie the size of a hubcap. Rox, for the first time in her life, hands you the " +
      "microphone. Moth takes two steps back. Benny is holding up two fingers. You have thirty seconds before the music plays you off.",
    choices: [
      { label: 'Thank your mom', effects: { fans: 120, chemistry: 6, mood: { all: 6 }, chat: { who: 'mom', text: 'I was the one crying in row M. The loan is forgiven. Mostly.' } },
        outcome: 'You thank your mom for the loans, the casseroles and the note taped to the foil. The camera finds her. She is waving the note.' },
      { label: 'Thank the Suds-O-Rama', effects: { buzz: 12, fans: 80, chemistry: 4 },
        outcome: "'And to Irma, and Delphine, and machine 6.' Somewhere in Regina, a laundromat full of people screams. Irma pretends not to." },
      { label: 'Hand the mic back to Rox', hint: 'Gamble: the longest thirty seconds',
        outcome: 'You pass the microphone back. Rox takes a deep breath.',
        roll: { chance: 0.55, stat: 'buzz', statScale: 0.005,
          success: { effects: { buzz: 16, fans: 200, mood: { rox: 10 } }, outcome: 'Twenty-nine seconds on Regina potholes. The orchestra waits. The room gives a standing ovation. The mayor calls.' },
          fail: { effects: { buzz: -6, mood: { all: -4 } }, outcome: 'Ninety seconds on snow routes. The orchestra plays her off. She keeps going. They play louder. She wins.' } } }
    ] });
  perBand(AW, 'speechWorstVan', { id: 'loonie_speech_van_frost_heave', type: 'fame', speaker: 'moth', title: 'Worst Van', once: false, cooldown: 20, gate: only({}),
    text: "You won Worst Van. {van} is parked outside with laundry hanging in the windows. Somebody has to accept. Moth, who has driven every " +
      "kilometre and lives in it, stands. The whole arena turns to look at her. She has never looked more offended.",
    choices: [
      { label: 'Let Moth accept it', effects: { buzz: 10, chemistry: 6, mood: { moth: 10 } },
        outcome: "Moth walks up, takes the trophy and says one sentence: 'It's not the worst van. It's my home.' Silence. Then a standing ovation." },
      { label: 'Thank the van by name', effects: { buzz: 8, fans: 60, mood: { all: 4 } },
        outcome: 'You thank the van, the coat hangers and Ward the spider plant. A mechanic in the crowd yells "THE MUFFLER, THOUGH". Fair.' },
      { label: 'Blame the potholes', effects: { fans: 120, mood: { rox: 5 } },
        outcome: 'Rox takes the mic and blames city council for the van\'s condition. Council, watching at home, issues a statement. It is defensive.' }
    ] });
  perBand(AW, 'carpet', [
    { who: 'reporter', text: 'Janice, Leader-Pest, on the carpet. Who are you wearing tonight?' },
    { who: '@front', text: 'Safety pins. And a grudge against the parking authority.' },
    { who: 'reporter', text: 'Any predictions?' },
    { who: '@soloist', text: 'Two outcomes: we win or we do not. Like two chords. I like our chances.' }
  ]);
  merge(band(AW), {
    win: ['Rox is on stage before the envelope is fully open. She has a speech. It has sections.',
      'Benny holds the trophy with two fingers. "Two," he says, to no one.',
      'Moth nods once, takes the trophy and puts it in the van for safekeeping. It lives there now.',
      'Delphine stands on her chair in the balcony. An usher asks her to sit. She does not sit.'],
    lose: ['Rox applauds the winner with the precise energy of a heckle.',
      'Benny says the winner used "at least four chords". It does not help. It helps a little.',
      "Moth's expression does not change. Somehow you feel better.",
      'Rox writes a strongly worded letter to the Loonies on the program. She mails it from the lobby.']
  });
  var NOM = obj(AW, 'nominees');
  if (!Array.isArray(NOM)) {
    NOM.punk = addNew(Array.isArray(NOM.punk) ? NOM.punk : [], ['The Slush Fund', 'Bus Pass Riot', 'Snow Route Tow Zone', 'The Transfer Slips',
      'Parking Garage Choir', 'Minimum Wage Maniacs', 'The Boil Water Advisory', 'Sidewalk Salt']);
  }

  /* ======================================================================================================================
     Shop: the misprint (Q6: FROST HEAVY) and the band's group-chat lines (shop.byBand.frost_heave.lines).
     ====================================================================================================================== */
  var SH = obj(K, 'shop');
  var MP = { typo: 'FROST HEAVY', find: 'HEAVE', replace: 'HEAVY', stash: 'behind dryer number six' };
  var mpItem = (Array.isArray(SH.merch) ? SH.merch : []).filter(function (m) { return m && m.id === 'misprint'; })[0];
  if (mpItem) { var mpBy = obj(mpItem, 'byBand'); if (!mpBy[B]) mpBy[B] = MP; }
  else { var mpAlt = obj(obj(SH, 'misprint'), 'byBand'); if (!mpAlt[B]) mpAlt[B] = MP; }
  merge(obj(band(SH), 'lines'), {
    outro: [{ who: 'benny', text: 'what if the song ended. on purpose. on chord two. with a big crash' },
      { who: 'rox', text: 'An outro. Every good meeting needs an adjournment. Motion to end loud.' }],
    solo: [{ who: 'benny', text: 'solo section unlocked. you play {yourPart}. i play both chords. fast', seat: ['drums', 'bass', 'rhythm'] }],
    misprintCollector: [{ who: 'benny', text: 'there is a fan page for FROST HEAVY shirts now. the box behind dryer six is worth money. i said this' }],
    move: [{ who: 'rox', text: 'A real room. With a lock. Irma says she will miss the noise. Irma is lying. Irma is crying.' }],
    van: [{ who: 'moth', text: 'New van. I moved in last night. Knock first. Same rules. Bigger kitchen.' }],
    merchUnlock: [{ who: 'rox', text: 'New merch. I approved the designs. Every one has a pothole on it. That is non-negotiable.' }],
    evicted: [{ who: 'rox', text: 'Landlord changed the locks. We are three weeks behind. Back to the basement. Irma already put the kettle on.' }]
  });

  /* ======================================================================================================================
     Calendar (28_sim_calendar): season news by week (byBand replaces the flat week), holiday gig lines, Halloween
     costumes, and the holiday cards appended to each holiday's list.
     ====================================================================================================================== */
  var CAL = obj(K, 'calendar');
  merge(band(CAL), {
    news: {
      3: { who: 'rox', text: 'Council is on summer recess. I am not. I have written three songs and one complaint about the recess.' },
      5: { who: 'benny', text: 'frosh week at the university. the campus bowl books bands. every student has a lanyard and 2 chords' },
      9: { who: 'moth', text: 'First frost. Winterizing the van. If you need anything from my place, now is the time. Knock.' },
      11: { who: 'rox', text: 'Snow-route parking ban starts tonight. I have memorized the map. I will be checking.' },
      13: { who: 'benny', text: 'minus 38. the van would not start. we are rehearsing next to the dryers upstairs. irma is charging admission' },
      15: { who: 'moth', text: 'Block heater is plugged into the Suds-O-Rama. Irma is billing me for it. By the minute.' },
      17: { who: 'rox', text: 'The summer festival lineups are out. We are not on them. I have written to the festival. And to council.' },
      21: { who: 'rox', text: 'Frost heave season. The road outside the laundromat is a ski jump again. It is the band\'s mascot now.' },
      23: { who: 'benny', text: 'skate park all-ages shows are back. forty kids, a generator, two chords. my favourite season' }
    },
    costumes: ['{rival} (the kickflips are mandatory)', 'Regina City Council (in session)', 'nine dryers and a lint trap']
  });
  // Holiday gig lines ({costume} on Halloween) go on the holiday itself, holidays[i].gig.byBand.frost_heave.lines (career.pool);
  // a holiday note on its Monday, holidays[i].byBand.frost_heave.news (wins over the neutral note).
  var HOL_LINES = {
    canada_day: ['Canada Day by the lake. Rox leads four thousand people in a chant about the bus schedule. It rhymes with nothing. Perfect.'],
    halloween: ['Halloween: the band plays dressed as {costume}. Nobody can tell the difference. The Suds-O-Rama wants a photo.'],
    christmas: ['Christmas party season: an ugly-sweater crowd, a cash bar and Irma doing the worm on a folding table.'],
    nye: ["New Year's Eve. Rox counts down from ten as a list of council resolutions. Midnight hits on 'motion carried'."],
    st_patricks: ["St. Paddy's: green beer, a guy in a leprechaun hat and a pit that is mostly a two-chord jig."]
  };
  var HOL_NEWS = {
    halloween: { who: 'rox', text: 'Costume rule: we go as another band. I have a glue gun and a grudge. Benny, stop hiding.' },
    remembrance: { who: 'moth', text: 'No gig this week. The Legion is closed for Remembrance Day. I will drive anyone to the cenotaph.' },
    nye: { who: 'benny', text: 'new years resolution: two chords. same as last year. same as next year' }
  };
  // The band's own holiday cards go first in each holiday's list: the calendar deals the first card whose gate passes, so the
  // shared cards the base lists for every new band stay the fallback (e.g. once Frost Heave's card is on its cooldown).
  var HOL = { canada_day: ['holiday_canada_day_frost_heave'],
    thanksgiving: ['holiday_thanksgiving_guilt_frost_heave', 'holiday_thanksgiving_frost_heave'],
    halloween: ['holiday_halloween_frost_heave'], grey_mug: ['holiday_grey_mug_frost_heave'],
    christmas: ['holiday_xmas_single_frost_heave', 'holiday_xmas_parties_frost_heave'], st_patricks: ['holiday_st_paddys_frost_heave'] };
  list(CAL, 'holidays').forEach(function (h) {
    if (!h || !h.id) return;
    if (HOL[h.id]) {
      var hc = list(h, 'cards'), mine = HOL[h.id].filter(function (id) { return hc.indexOf(id) < 0; });
      hc.splice.apply(hc, [0, 0].concat(mine));
    }
    if (HOL_LINES[h.id]) {
      if (h.gig && typeof h.gig === 'object') addNew(list(band(h.gig), 'lines'), HOL_LINES[h.id]);
      else addNew(list(obj(band(CAL), 'holidayLines'), h.id), HOL_LINES[h.id]);
    }
    if (HOL_NEWS[h.id]) band(h).news = HOL_NEWS[h.id];
  });

  /* ======================================================================================================================
     Labels (24_sim_labels): Frost Heave's demands per label (demandsByBand; same kind = the band's version wins). Each
     carded demand is dramatised by a signed_fh_* Monday card that writes flags.demand<Kind>.
     ====================================================================================================================== */
  var LB = K.labels && K.labels.labels ? K.labels.labels : obj(K, 'labels');
  if (LB.monolith) obj(LB.monolith, 'demandsByBand')[B] = [
    { kind: 'english', text: 'The lyrics in "plain English": fewer bylaw numbers, more feelings.', card: 'signed_fh_monolith_bylaws' },
    { kind: 'radio', text: 'The single is 1:12. Radio needs 2:30, a bridge and "a lift".', card: 'signed_fh_monolith_radio' },
    { kind: 'image', text: 'An image consultant is flying in. The van "needs to go".', card: 'signed_fh_monolith_image' }
  ];
  if (LB.gopherwood) obj(LB.gopherwood, 'demandsByBand')[B] = [
    { kind: 'showcase', text: "Play Wendell's Christmas showcase in Humboldt. Every year. Bring the van.", card: 'signed_fh_gopherwood_showcase' }
  ];

  /* ======================================================================================================================
     Recap (2d_sim_recap): "a good year" in the band's voices (year one), and a few band headlines.
     ====================================================================================================================== */
  var RC = obj(K, 'recap');
  var GOOD = [
    { topic: 'fans', who: ['rox'], target: 250,
      good: 'A good year? {target} new fans. We got {n}. That is a voting bloc.',
      bad: 'A good year is {target} new fans. We got {n}. That is a strongly worded petition. Not a movement. Yet.' },
    { topic: 'songs', who: ['benny'], target: 6,
      good: 'six songs is a year. we wrote {n}. twelve chords total. no, two. two chords total',
      bad: 'a good year is {target} songs. we wrote {n}. that is fine. each one only needs two chords' },
    { topic: 'gigs', who: ['rox'], target: 10,
      good: 'Ten gigs is a real year. We played {n}. The motion carries.',
      bad: 'A real band plays {target} gigs a year. We played {n}. I am filing a complaint. With us.' },
    { topic: 'loans', who: ['mom'], target: 0,
      good: 'A good year is one where you do not borrow from us. You did not! I am taping this to the fridge.',
      bad: 'A good year is one where you do not borrow from us. You borrowed {n} times. I left a casserole. And a note.' },
    { topic: 'chemistry', who: ['moth'], target: 60,
      good: 'Good year. The van ran. Nobody fought in my kitchen. Much.',
      bad: 'Rough year. Too many fights in my kitchen. The van noticed.' }
  ];
  if (Array.isArray(RC.goodYear) || RC.goodYear == null) band(RC).goodYear = GOOD;
  else RC.goodYear[B] = GOOD;
  merge(band(RC), { headlines: {
    survive: ['{band} Survive Year {nth}; Council Declines to Comment', '{band} Complete Year {nth}; Laundromat Still Standing'],
    fans: ['{band} Add {n} Fans; Irma Raises the Rent', '{n} New Fans for {band}; Most of Them From Ward 6'],
    loans: ['{band} Borrow From Parents Again; Casseroles Arrive With Notes'],
    best_s: ['{band} Level {venue}; Rox Files Noise Complaint Against Herself']
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
    rox: ['Logo is done. Photocopied it 400 times at the library. The librarian is now a fan.', 'Logo approved. I have already stencilled it on the council building. Kidding. Mostly.'],
    benny: ['the logo has two parts. like everything good', 'i drew the logo on my guitar. with a sharpie. it is permanent. so are we'],
    moth: ['Logo is on the van now. Small. Tasteful. Above the fuel door.', 'Good logo. It fits on a mailbox. Mine.']
  });
  logoLines('rebrand', {
    rox: ['Rebranded. Selling out, or buying in? Either way the old stickers are going on the fridge.', 'New logo. I have filed the old one with the city archives. They did not ask.'],
    benny: ['new logo. still two chords. the logo is not a chord', 'rebrand done. i miss the old one. i will keep the old sticker on my amp forever'],
    moth: ['New logo. I peeled the old one off the van. It took two hours. It left a mark. Like all goodbyes.', 'Rebrand. The van keeps its old sticker. The van has seniority.']
  });

  /* ======================================================================================================================
     Songs, album words and reviews (punk is Frost Heave's genre; the pools are genre-keyed, reviews are byBand).
     ====================================================================================================================== */
  var TAKEN = [];   // never hand out a rival's title as ours
  Object.keys(cast).forEach(function (rid) { (cast[rid].songs || []).forEach(function (t) { TAKEN.push(String(t)); }); });
  var ST = obj(K, 'songTitles');
  addNew(list(ST, 'punk'), [
    'Point of Order', 'Ward Six Forever', 'Concession Stand', 'Motion to Table (Your Face)', 'Snow Route Tow Zone',
    'The Pothole on Dewdney', 'Minus Forty Wind Chill', 'Suds-O-Rama', 'Dryer Number Four', 'Lint Trap',
    'Two Chords Is Plenty', 'Capo (Crisis of Faith)', 'No Third Chord', 'Knock Before You Enter', 'The Van Is My Apartment',
    'Parking Appeals Board', 'Fare Hike (Die)', 'Public Comment Period', 'Read Into the Record', 'Bylaw, Be Mine',
    'Banned From MegaBulk', 'Sample Tray Riot', 'Quarter Jar', 'Frost Heave Ahead', 'Next 40 KM',
    'Queen City Nobody', 'Wascana Goose Patrol', 'Sidewalk Salt', 'Plug In the Block Heater (Or Else)', 'Whose Sock Is This',
    'Council Chambers Are on Fire (Metaphorically)', 'Recount!', 'Drawn From a Toque', 'Kevin From Oakville', 'Pre-Ripped Is Not Punk',
    'Spin Cycle', 'Delphine (Machine 6)', 'The Leader-Pest Got It Wrong', 'Sprinkler Bylaw Blues', 'Lot C Is Full',
    'Heritage District Heatwave', 'Mop on the Ceiling'
  ].filter(function (t) { return TAKEN.indexOf(t) < 0; }));
  var AWP = obj(obj(obj(K, 'albumWords'), 'titles'), 'punk');
  addNew(list(AWP, 'forms'), ['Motion to {noun}', '{adj} in {place}', 'Minutes of {noun}', 'Point of Order: {noun}']);
  addNew(list(AWP, 'adj'), ['Broke', 'Cheap', 'Frozen', 'Loud', 'Useless', 'Angry', 'Late', 'Used', 'Sick', 'Bored', 'Tabled', 'Towed',
    'Salted', 'Municipal', 'Overdue', 'Spun', 'Lint-Free', 'Recounted', 'Heaved', 'Unanimous', 'Adjourned', 'Plowed', 'Warm (Dryer)', 'Banned']);
  addNew(list(AWP, 'noun'), ['Landlord', 'Parking Ticket', 'Bus Pass', 'Laundromat', 'Minimum Wage', 'Snowplow', 'Condo', 'Rent', 'Slush',
    'Suburb', 'Bylaw', 'Pothole', 'Council', 'Megaphone', 'Recount', 'Spin Cycle', 'Lint', 'Quarter', 'Detour', 'Tow Truck', 'Motion',
    'Ward', 'Dryer', 'Snow Route']);
  addNew(list(AWP, 'place'), ['Regina', 'the Suburbs', 'the Laundromat', 'the Food Court', 'Albert Street', 'the Bus Shelter', 'Grade Eleven',
    'Ward 6', 'Dewdney Avenue', 'the Suds-O-Rama', 'Council Chambers', 'the Basement', 'Lot C', 'the Frost Heave', 'Scarth Street',
    'the Rec Centre Gym', 'the Van', 'Machine 6', 'the Exhibition Lot', 'the Snow Route', 'the Public Gallery', 'Parking Spot 4', 'the Lint Bin']);

  var OUTL = obj(obj(K, 'reviews'), 'outlets');
  var REV = {
    rolling_scone: {
      awful: ['In my day a punk band had at least three chords and a manager. {band} have neither, and they seem proud of it.',
        '{album} is ninety seconds of shouting about parking, twelve times. I timed it. My wife asked me to stop timing it.'],
      meh: ['There is a real song hiding in {single}. It needs a harmonica and a third chord. I suspect it will get neither.',
        '{band} are young and angry about municipal bylaws. I was once young and angry about municipal bylaws. It passes.'],
      good: ['{single} reminds me of the first punk record I ever heard, in a laundromat, in 1977. This one was recorded in one. Full circle.',
        'Two chords, played like they owe you money. {album} is short, loud and correct. I played it twice. It took eleven minutes.'],
      great: ['I have heard ten thousand records. I have never heard a band make two chords sound like a revolution. {album} is a classic.',
        '{album} is the sound of a city arguing with itself, and winning. Put it on. Call your councillor. I did. He hung up.']
    },
    proclaim: {
      awful: ['{album} is the sound of a snowplow stuck in a laundromat! We love the ambition! We could not finish it!',
        'Frost Heave scream about potholes for twenty-two minutes! Regina deserves better potholes! And maybe a bridge!'],
      meh: ['{single} is a toque of a song: warm, scratchy, one size fits all! Solid Saskatchewan fury!',
        'Loud! Short! Angry at council! {album} is exactly as advertised, and the advertisement was a flyer on a lamp post!'],
      good: ['{album} is the sound of a Regina January: minus forty, dryers thumping, a van idling outside! Canadian punk is BACK!',
        '{single} will be screamed at every snow-route parking ban from here to Moose Jaw! Frost Heave are a municipal treasure!'],
      great: ['{album} is the most Canadian punk record ever made! Two chords! Nine dryers! One megaphone! A national anthem for potholes!',
        'Rox Delorme screams like the wind on Albert Street and {band} hit like a frost heave at a hundred klicks! Essential! Perfect!']
    },
    pitchspork: {
      awful: ['Like early Crass played by a zoning committee. {album} mistakes volume for politics and politics for a personality.',
        'The guitarist reportedly refuses to learn a third chord. On {album}, you believe him. You also wish someone had asked twice.'],
      meh: ['{album} has the energy of a manifesto and the shelf life of a parking ticket. Still: {single} slaps, municipally.',
        'Somewhere between hardcore and a city-council livestream. The dryer samples are the most interesting thing here. Unironically.'],
      good: ['A record of radical minimalism: two chords, one grievance, zero wasted seconds. {single} is a bylaw you can mosh to.',
        'Recorded partly in a laundromat and partly in a van, {album} sounds like both, in the best way. The lint is audible.'],
      great: ['{album} is the rare punk record that understands local government as a genre. Two chords have never meant this much.',
        'Frost Heave have made the most important record about civic infrastructure since... ever, actually. {single} is a landmark.']
    },
    deci_hell: {
      awful: ['NOT METAL. NOT EVEN TRYING. TWO CHORDS. THE SINGER SCREAMS ABOUT PARKING. THE DRUMMER IS THE ONLY SURVIVOR.',
        '{album}: TOO SHORT TO HATE PROPERLY. LISTENED ELEVEN TIMES TO BE SURE. STILL SURE.'],
      meh: ['PUNK. FAST. SHORT. THE BASSIST LIVES IN A VAN, WHICH IS METAL. THE REST IS NOT.',
        '{single} IS ALMOST A BLAST BEAT. ALMOST. THE DRUMMER IS TRYING. RESPECT THE DRUMMER.'],
      good: ['THE DRUMMER ON {album} PLAYS LIKE A HAILSTORM ON A LAUNDROMAT ROOF. WE ARE NOT PUNK. WE ARE LISTENING.',
        '{band} ARE NOT METAL BUT THEIR RAGE IS. THE COUNCIL SONGS SLAP. DO NOT TELL ANYONE WE SAID THAT.'],
      great: ['{album} IS SO FAST WE CHECKED IF IT WAS BLACK METAL. IT IS NOT. EVERY SKULL WE HAVE ANYWAY. FOR THE DRYERS.',
        'WE HATE PUNK. WE LOVE {album}. THIS IS A CRISIS. THE BASSIST SHOULD START A DOOM BAND. WE WOULD REVIEW IT.']
    },
    tailgate_weekly: {
      awful: ['We at Tailgate Weekly do not understand {album}. It was over before the coffee was poured.',
        'Loud young people from Regina yelling about city council. We have a city council too. We do not yell. Politely returned.'],
      meh: ['{single} would be a fine two-step if it were a third the speed. We tried. Our boots gave out. Middling.',
        'Frost Heave are sincere. They are also very fast. Like a runaway grain truck. Graded as a yearling: promising, skittish.'],
      good: ['The singer cares about snow routes, and so do we. {album} is fast but honest, like a good auctioneer.',
        'Played {single} at the auction mart. Nobody bid on anything for four minutes. That is respect. Blue ribbon, reluctantly.'],
      great: ['We did not expect a punk record to understand rural roads. {album} does. The frost heave song made a farmer cry.',
        'Grand champion. {band} play two chords like our grandfathers played the fiddle: all night, no apologies.']
    }
  };
  for (var oid in REV) if (OUTL[oid]) obj(OUTL[oid], 'byBand')[B] = REV[oid];

  /* ======================================================================================================================
     Lines, member-keyed (ids are unique across bands): chat, gigReactions, tap, songReactions, writeTips, vanBanter,
     banter, live, labelReact, reviewReact. Every line <= 140 characters; Moth speaks little and plainly.
     ====================================================================================================================== */
  var LN = obj(K, 'lines');
  members(obj(LN, 'chat'), {
    rox: {
      happy: ['COUNCIL IS ON NOTICE. Also: great practice.', 'Good show. Filed three complaints on the way home. Productive day.',
        'I love this band more than I hate Bylaw 2026-14. And I HATE Bylaw 2026-14.', 'We sounded like a riot at a public hearing. Best compliment I have.'],
      ok: ['Practice Tuesday. Bring a shovel, the basement stairs are a disgrace.', 'Is the library photocopier fixed? Asking for 400 flyers.',
        'Council Wednesday, practice Thursday. Priorities are correct.', 'Irma says we are too loud. Irma is a registered voter. Noted.'],
      grumpy: ['Somebody moved my megaphone. I will find you. I will file a motion.', 'Great. Another week of not being on the news.',
        'The pothole outside got bigger. So did my grudge.', 'I am writing a strongly worded song. It is about this group chat.'],
      sulking: ['No comment. Read the minutes.', "I'm going to council alone tonight. Don't come. (Come.)",
        'Fine. FINE. Motion to sulk. Seconded by me.', 'I have stopped screaming. Temporarily. Enjoy the silence while it lasts.']
    },
    benny: {
      happy: ['two chords. zero regrets. great practice', "a kid at the show asked what chord that was. i said 'the first one'",
        'tonight both chords were perfect. both of them', "we're so tight. tighter than my chord vocabulary"],
      ok: ["new strings. same two chords. don't get excited", "who took my capo. i don't use it. i just want it back",
        "practice at 7? i'll be there at 7:40. punk time", 'irma asked me to turn down. i turned the other way'],
      grumpy: ['someone wrote a song with THREE chords in it. not naming names. rox', 'cool. cool. another bridge. bridges are a slippery slope',
        "if i hear the word 'modulate' one more time", 'my amp is making a noise. it might be a third chord. it has to go'],
      sulking: ['not coming. learning nothing new. on principle', "i'm sitting in the van. moth said i could. for 20 minutes",
        "i've unplugged. that's the whole message", "i'm fine. i have two chords and they have each other"]
    },
    moth: {
      happy: ['Good week. The van started every time.', 'Nice show. Please wipe your feet before you get in.',
        'Laundry is done. So is the song. Both came out fine.', "We're good. The van is good. I'm good."],
      ok: ['Parked on Dewdney. Knock first.', 'Practice is fine. My sock is on the amp. Leave it.',
        "Don't put the cymbals on my bed.", 'Oil change Tuesday. Rehearse around it.'],
      grumpy: ['Someone ate my cereal. In my kitchen. Which is the van.', "Stop calling it 'the van'. It's my home. It's also the van.",
        'Parking ticket again. City hall and I are not speaking.', 'Who moved the seat. Who moved my house.'],
      sulking: ["Locked the doors. Don't knock.", "I'm home. Home is closed.", 'Out of the band chat. Still in the parking lot.', '(Moth has closed the curtains.)']
    }
  });
  members(obj(LN, 'gigReactions'), {
    rox: { great: ['THAT is what democracy sounds like!', 'I stage-dived and nobody dropped me. Motion carried.', 'Put that in the minutes. Put it in ALL the minutes.'],
      ok: ['Decent. Like a budget surplus: rare and a bit suspicious.', "Solid. Council would call it 'adequate'. I call it Tuesday.", 'Fine show. Nobody got arrested. A missed opportunity.'],
      bad: ['That gig was a public consultation. Nobody was consulted.', 'Worst crowd since the snow-route hearing.', "I'm filing a complaint. Against us."] },
    benny: { great: ['both chords. flawless. i need to lie down', 'they sang my two chords back to me. both of them', 'i almost played a third chord from joy. almost'],
      ok: ['fine. my chords were there. were yours', 'it was ok. like a g chord. dependable', "pretty good. somebody yelled 'more chords'. i ignored him"],
      bad: ["i played the second chord first. it's been a night", 'they wanted a solo. i gave them chord two. slowly', 'bad. but my principles are intact'] },
    moth: { great: ['(Moth nods and goes to warm up the van.)', 'Good one. Everybody in. Shoes off.', "That was loud. I'll allow it."],
      ok: ['Fine. Loading out.', '(Moth coils a cable perfectly and says nothing.)', 'Okay show. Okay parking.'],
      bad: ['Rough. Van leaves in ten. With or without the setlist.', '(Moth sits in the van with the lights off for a while.)', 'Bad. Nobody touch my stuff.'] }
  });
  members(obj(LN, 'tap'), {
    rox: ['Did you know Ward 6 has 212 potholes? I have them mapped.', "Point of order: you're standing in my spot.",
      "I'm writing a song about the transit fare hike. The chorus is NO.", 'Banned from MegaBulk for life. For one free sample. It was a principle.',
      'Council meets in two hours. I am stretching my voice.', 'If you are bored, read Bylaw 2026-14. Then you will be angry. Better.'],
    benny: ['want to see a chord? i have two', "this one's G. the other one's also around here somewhere", 'i tried a third chord once. i was twelve. never again',
      "the secret is you don't need more. you need LOUDER", "people say 'learn some theory'. i say 'learn some restraint'", "don't touch the capo. it's decorative"],
    moth: ['Knock before you enter the van.', '(Moth holds up one finger: wait. She finishes folding a shirt.)', "The van has a mailbox now. Don't use it.",
      'Rent is due. It is one cup of coffee.', 'I can fix that. I can fix anything with a coat hanger.', '(Moth hands you a clean towel for no reason.)']
  });
  members(obj(LN, 'songReactions'), {
    rox: {
      name: ["It's about council. Obviously. It's called", 'This one is for the parking authority. It is called', 'Motion to name this song. Seconded. It is called',
        'Read into the record: the new song is called', 'Pothole season needs an anthem. It is called', 'I screamed the title at the mayor this morning. It is called'],
      custom: [{ when: 'any', text: 'Every word of that is a real quote from a council meeting. I checked. Twice.' },
        { when: 'difficultyHigh', text: 'Hard song. Good. Council should have to work this hard.' }]
    },
    benny: {
      noSolo: ['no solo? good. solos have too many notes', "cool, no room for a solo. i'll play chord two where it would've been",
        'no solo section. finally someone gets it'],
      solo: ["a solo section. i'll play both chords. alternating. fast", 'eight bars of solo. chord one, chord two, chord one, chord... two'],
      custom: [{ when: 'difficultyHigh', text: 'this is hard. hard songs need more chords. i refuse. play it easier', seat: ['drums', 'bass', 'rhythm'] },
        { when: 'difficultyHigh', text: "too many notes on the kit. i'm protesting with fewer notes on the guitar", seat: ['drums', 'bass', 'rhythm'] },
        { when: 'any', text: 'i played it with two chords. it works. it always works', seat: ['drums', 'bass', 'rhythm'] }]
    },
    moth: {
      fills: ['(Moth played a fill. One note. It was the right one.)', "Put a little bass run in bar 12. Don't make it weird.", 'Snuck a note into the verse. It lives there now.'],
      great: ['(Moth nods. Then she lets you ride in the front seat. The front seat.)', "That's a good one. I'll play it in the van.",
        '(Moth taps the dash twice. The highest honour in the Pothole.)'],
      custom: [{ when: 'similarityHigh', text: 'Sounds like the last one. Same bassline works. Efficient.', seat: ['drums', 'rhythm', 'lead'] },
        { when: 'any', text: '(Moth writes the title on the van ceiling with the others.)' }]
    }
  });
  members(obj(LN, 'writeTips'), {
    rox: ['Punk is fast. Snare on every "and", never below 170 BPM. Council is slower. Be faster than council.',
      'Tap a square to add a hit. Put a crash on the one in the chorus so I can scream over it.'],
    benny: ["kick on the beat, snare in between, hats going 8ths. that's the whole secret. like two chords",
      "go above 170 bpm. if it feels too fast it's almost fast enough"],
    moth: ["Keep the hats straight 8ths. I'll follow the kick. Don't get clever.", 'Try the D-beat preset. Boom, crack, ba-boom. Sounds like the dryers.']
  });
  members(obj(LN, 'vanBanter'), {
    rox: ["That sign says 'Welcome to Moose Jaw'. Who approved that font?", 'Every pothole on this highway was a council decision. Every. One.',
      "When I'm on council, the Trans-Canada gets a mosh lane.", 'Moth, does the van get a vote? It should get a vote.',
      "I'm drafting a complaint about that rest stop. How do you spell 'unacceptable'?", 'Turn it up. Not the radio. The politics.'],
    benny: ['the wipers are going in two beats. inspiring', 'wrote a song on the drive. same two chords. new feelings',
      'can we stop? i need a slurpee and a moment', 'rox, the rumble strip is not a drum roll. ok it kind of is',
      "i'm not touching moth's stuff. i'm not touching moth's stuff", 'that truck honked in G. respect'],
    moth: ['Feet off the curtains.', '(Moth adjusts a sock hanging from the mirror. It improves nothing.)', "Quarter tank. Don't breathe so much.",
      "This is my kitchen. You're eating in my kitchen. Crumbs.", 'That noise is normal. Everything is normal.', "Rest stop in 40. The bathroom is not in the van. Never has been."]
  });
  members(obj(LN, 'banter'), {
    rox: ['This one goes out to the parking authority!', 'Point of order: everybody jump.', 'Ward 6, make some noise! Everybody else, make some noise too!'],
    benny: ['this song has two chords. you know them. you love them', 'if you want a third chord, the merch table is that way', 'broke a string. still have five. only need two'],
    moth: ['(Moth tunes a string that was already in tune.)', 'Van leaves at one. Buy a shirt.', '(Moth waves once. The crowd loses its mind.)']
  });
  members(obj(LN, 'live'), {
    rox: {
      signature: ['Rox stage-dives on the second chorus. The front row catches her like a motion to table.',
        'Rox leaps into the crowd with the megaphone. It comes back without her. Then she comes back.',
        'Rox dives. The crowd carries her to the back of the room and returns her, like a library book.'],
      solo: ['Rox grabs the solo: one chord, screamed, for eight bars. Nobody complains.', 'Rox takes the solo and reads a bylaw over it. It rips.',
        'Rox solos on the megaphone siren. It is in key. Somehow.'],
      fill: ['Rox fills the gap with a scream. It is a fill. It counts.', 'Rox hits the crash with the megaphone on the fill. Perfect timing.',
        'Rox drops a two-note fill and points at the council member in row three.'],
      flub: ['Rox forgets the words and screams the bylaw number instead. Nobody notices.', 'Rox misses the cue. She calls it a point of order.',
        'Rox comes in a bar early. She stays there. The band catches up.']
    },
    benny: {
      signature: ['Benny holds up two fingers during the chorus. Two hundred people hold up two fingers back.',
        'Benny plays chord two so hard a string breaks. He does not need that string.', 'Benny stands perfectly still for the whole break. Principle.'],
      solo: ['Benny takes the solo: chord one, chord two, chord one, chord two. The crowd loses its mind.',
        "Benny's solo is the same two chords, faster. It is the best solo of the night.", 'Benny solos with his eyes closed. Two chords, total conviction.'],
      fill: ['Benny sneaks a chord in the gap. It is one of the two. Relief.', 'Benny rakes the strings on the fill. No chord at all. Pure noise.',
        'Benny fills the silence with feedback and a satisfied nod.'],
      flub: ['Benny plays the second chord first. He calls it "a remix".', 'Benny almost plays a third chord by accident. He stops. He shudders.',
        "Benny's string snaps mid-song. He keeps going on four."]
    },
    moth: {
      signature: ['Moth steps forward for one bar, plays one perfect note and steps back. The room screams.',
        'Moth plays the whole song with her eyes on the exit, like a lifeguard. The low end is flawless.', 'Moth nods at you once, mid-song. It lands like a drop.'],
      solo: ["Moth takes the solo. It is one low note, held. It is the heaviest thing you've heard.", 'Moth solos without looking up. Short. Correct.',
        "Moth's solo is a bassline so steady the crowd starts to sway."],
      fill: ['Moth slides a fill into the gap. One note. The right note.', 'Moth rolls a little bass run into the fill and looks away like nothing happened.',
        'Moth answers your fill with a low thump that shakes the floor.'],
      flub: ['Moth hits a wrong note and immediately plays it again, on purpose. Now it is right.', 'Moth misses a cue. She looks at the exit. She comes back in.',
        "Moth's strap slips. She finishes the song kneeling. Nobody helps. She wouldn't want it."]
    }
  });
  members(obj(LN, 'labelReact'), {
    rox: { monolith: ["A glass tower in Toronto. I'll bring the megaphone. For the lobby."], gopherwood: ["A feed store with a label in it. That's grassroots. Literally."],
      diy: ["We ARE the label. Motion carried. I'll chair."], signed: ["Signed! I'm reading the fine print at council. Out loud."] },
    benny: { monolith: ['they have a guy for chords. i asked. i have two. he cried'], gopherwood: ["wendell said 'play what you want'. i want two chords. he said ok"],
      diy: ["diy means we photocopy the album. i'm in"], signed: ["we're signed. i'm still learning nothing new"] },
    moth: { monolith: ['(Moth asks if the advance covers a new muffler. It does. She signs.)'], gopherwood: ['The label van has a gopher on it. The Pothole approves.'],
      diy: ['We ship from the van. I know where everything is.'], signed: ['Signed. The van still comes first.'] }
  });
  members(obj(LN, 'reviewReact'), {
    rox: { great: ['The critics understand the bylaw content now. The system works.'], meh: ['Mixed reviews. Like a council vote. I demand a recount.'],
      awful: ['I am writing letters. To the editor. In capitals.'] },
    benny: { great: ["they said 'deceptively simple'. there's no deception. it's two chords"], meh: ["someone said 'needs more range'. range is a stove"],
      awful: ["bad review. i read it twice. that's more than they listened"] },
    moth: { great: ['(Moth tapes the review to the van ceiling.)'], meh: ['Fine. The van is still paid off.'], awful: ['(Moth uses the review to level the amp.)'] }
  });

  /* ======================================================================================================================
     Band-level lines (lines.byBand.frost_heave: career.pool adds them to the neutral flat pools).
     ====================================================================================================================== */
  merge(band(LN), {
    activity: {
      rehearse: ['We ran the set to dryer number four. Every song at 190 BPM. The sneakers in the dryer kept perfect time.',
        'Irma banged the ceiling with the mop three times. We took it as a count-in.',
        'Rox rehearsed her stage dive onto the old couch. The couch has filed a complaint.',
        'Benny played both chords for two hours. They have never been tighter.',
        'Moth rehearsed from the van with the window cracked and a very long cable. It worked.',
        'We tightened the ending. It had four endings. Now it has one, very loud.'],
      write: ['Rox brought in a new song. It is the minutes of Tuesday\'s council meeting, screamed. It rules.',
        'Benny wrote a riff. It has two chords. They are the same two chords. It is new, somehow.',
        'We wrote a song about the pothole on Dewdney. It is eighty seconds long. So is the pothole.',
        'Moth wrote one bass line and said "done". It was done.',
        'We built a song around a groove you found on {instrument}. Rox found a bylaw that fits the rhythm.',
        'We tried a ballad. It lasted forty seconds before Rox turned it into a protest.'],
      promote: ['We stapled flyers to every pole on Albert Street. Rox stapled one to a council notice. It stayed up.',
        'Rox did a "public comment" on the campus radio call-in show. It was about the band. Mostly.',
        'We chalked the band name on the sidewalk outside city hall. It rained. Now it says FROST HE.',
        'Benny handed out two hundred flyers. Each one has two lines on it. For the chords.',
        'We left flyers in every dryer at the Suds-O-Rama. Warm, folded, persuasive.',
        'Moth parked the van downtown with a banner on it. It got a ticket. The ticket had our name on it. Free promo.'],
      book: ['We called every hall in {city} from the laundromat payphone. Irma took messages. She underlined "NO" twice.',
        'We pinned our number to the Suds-O-Rama corkboard, just under a lost cat. The cat got more calls.',
        'Rox negotiated with a booker using a megaphone. We got the gig. We also got a restraining order. Kidding.',
        'We emailed every bar in {city} with "Bones" or "Tavern" in the name. One replied "who is this".',
        'Delphine asked the Thursday wash crowd. One of them books a curling rink. We are in.',
        'Moth drove the van to every venue in {city} and knocked. Politely. Three times each. Two bookers said yes out of respect.'],
      hustle: ['We folded towels for Irma all night. Forty dollars and a free wash. Rox folded hers into fists.',
        'We shovelled the whole block on 13th Avenue. Rox gave a speech about snow routes to each homeowner.',
        'We busked on Scarth Street and made gas money plus a sandwich from a man in a suit.',
        'We helped Delphine move a washing machine. Up the basement stairs. It took four people and one prayer.',
        'We returned bottles from the football game. Benny kept a watermelon helmet as a bonus.',
        'Moth fixed three cars in the laundromat lot for cash. The band sat on the curb and cheered.'],
      rest: ['Nobody touched an instrument. We sat in the van with Moth and watched the snow. She made tea.',
        'We watched curling on the laundromat TV. Benny said it had "the right number of rocks".',
        'A lazy night. Rox read council minutes aloud for fun. We fell asleep to them. Best sleep in weeks.',
        'Delphine brought cinnamon buns. We ate them on top of a warm dryer. Perfect.',
        'We drove out past the city limits and watched the northern lights. Nobody said "council" for an hour.',
        'Benny slept on the basement couch. Upstairs, the dryers thumped like a heartbeat.']
    },
    quietWeek: [
      'A quiet Monday. Rox is at a council committee meeting. Nobody knows which one. Neither does the committee.',
      'Nothing happened. Irma did not bang the ceiling once. Suspicious.',
      'A slow week. Moth re-organized the van. Everything is in a different place. It is better. Nobody can find anything.',
      'Benny spent the week counting both chords. They sound exactly the same. He is satisfied.',
      'The dryers thumped all week. The band rested. Delphine did her laundry on Thursday. Life goes on.',
      'Quiet week. Rox wrote four letters to the editor. Three were printed. One was about the band.',
      'Nothing on the calendar. Moth parked somewhere new. Nobody knows where. She seems happy.',
      'A quiet Monday in the Queen City. The wind blew. Nothing else did.',
      'A slow week. The pothole outside the Suds-O-Rama got bigger. Rox measured it daily.',
      "Quiet. Benny found his capo. He put it back where he found it. He won't say where."
    ],
    yearEnd: [
      "Another year under the Suds-O-Rama. Irma raises a glass. It's a mop. Same thing.",
      'Rox toasts the year with a reading of every council resolution she opposed. It takes an hour.',
      "Benny says it was a good year. Two good things happened. He didn't say which.",
      'Moth nods at the year. Then she nods at the van. The van made it too.',
      'Delphine brings a cake shaped like machine 6. The whole wash crowd sings. Loudly.',
      'Mom calls to say happy new year and mention the loan, in that order.'
    ],
    milestones: {
      firstGig: ["First gig! Craig's Basement. The ceiling was five-eleven. Rox dove anyway."],
      firstSong: ["First original song. It's about council. Nobody is surprised."],
      fans50: ['50 fans. More than attend a council meeting.'],
      fans100: ['100 fans. Someone you have never met wore your shirt to city hall.'],
      fans250: ['250 fans. {homeVenue} knows your name. Irma pretends not to.'],
      fans500: ['500 fans. People sing along. Mostly the wrong words. Both chords, though.'],
      fans1000: ['1,000 fans. Council is starting to notice. So is the parking authority.'],
      fund1000: ['First $1,000 in the band fund. Moth has already earmarked it for a muffler.']
    },
    genreClash: [
      'Wrong crowd: a country room. Rox screamed about snow routes. A cowboy agreed with her. Loudly.',
      'The metal crowd found two chords "insufficient". The pit happened anyway.',
      'A rock bar. Somebody requested a guitar solo. Benny looked at him for the length of two chords.',
      'The crowd wanted a two-step. You gave them two chords. Close enough, apparently.'
    ],
    countIn: ["Rox counts you in through the megaphone: 'ONE, TWO, point of order, FOUR!'",
      "Benny counts you in: 'one, two.' He stops at two. On principle."],
    empty: { chat: ['No messages yet. Moth has read everything anyway.', 'Quiet chat. Rox is at council.'],
      catalog: ['No songs yet. Rox is "drafting a motion".', 'No songs yet. Benny is choosing between his two chords.'] },
    exposure: { pitch: 'Rox: "Exposure is basically public comment. Free, loud, and nobody can stop us. Say yes."',
      toast: 'Exposure! Rox is drafting the speech already. It has sections.' },
    noSolo: ['Benny will mention it. Gently. With two chords.'],
    recruitAd: ['Rehearsals in a laundromat basement (heated by dryers). Must knock before entering the van.'],
    guilt: ['Your mom asks if Moth "has a real address yet". Then asks about the loan.',
      'Dad has started a folder labelled BAND. It is next to the folder labelled MOTH.',
      'Mom sent a casserole to the Suds-O-Rama. The note says "the loan". Irma read it first.'],
    vanArrive: ['You made it. {driver} parks. Everybody unfolds. Moth says "wipe your feet" to no one.',
      '{van} rolls in on fumes and principle. Rox is out before it stops.',
      "Here. {driver} backs into the loading zone in one try. Rox reads the parking sign aloud, disapprovingly."],
    vanTired: ['{van} is tired. Moth says it is "resting its eyes". It is making a noise like a dryer with a shoe in it.'],
    breakdown: ['{van} broke down. Moth fixed it with a coat hanger and a look. Forty minutes, zero dollars.'],
    sameCrowd: ['Same faces as last time. Delphine, front row, lawn chair. Fewer new ones.'],
    openingSlot: ['Opening slot. Rox thanked the headliner and then gave a speech about their parking lot.'],
    gigGrade: {
      S: ['The crowd carried Rox from the stage to the bar and back. Twice. Legendary.', 'Two chords. One riot. Perfect night.'],
      A: ['Tight, loud, fast. Nobody fell off the stage who did not mean to.'],
      B: ['A good, sweaty, municipal night.'],
      C: ['The crowd was there. Physically. Rox addressed them anyway.'],
      D: ['The bingo caller was louder than you. And better organized.']
    },
    moments: {
      circlePit: ['The pit spins so fast it takes the merch table with it. Moth rescues the merch. The pit keeps going.',
        'A circle pit the size of a council chamber. Rox runs laps of it with the megaphone.'],
      pogo: ['The whole room pogos on chord one and lands on chord two. The floor bounces.', 'Two hundred people jumping at 200 BPM. The ceiling tiles jump too.'],
      gangShout: ['The crowd shouts the chorus back so hard Rox stops singing and just points at them.', 'Gang vocals: "POINT OF ORDER!" Two hundred voices.'],
      stageDive: ['Rox dives. The crowd catches her. It is basically a motion carried.']
    },
    banter: ['This one is ninety seconds long. Like a council recess.', 'Thank you {city}! We are {band}! Buy a shirt! It pays for a muffler!',
      'If you parked on a snow route, run.']
  });

  /* ======================================================================================================================
     Drivers (26_sim_world): Moth's own lines while she drives, and the take-over line for when she is gone (the same
     §4.1 byBand layer on drivers.you: career.pool(state, drivers.you, 'takeOver')).
     ====================================================================================================================== */
  var DRV = obj(K, 'drivers');
  if (DRV.moth) {
    DRV.moth.banter = addNew(Array.isArray(DRV.moth.banter) ? DRV.moth.banter : [], [
      'Mirror check. Laundry check. Road check. In that order.', 'This is a residential zone. My residence. Slow down, me.',
      'Next town has a laundromat. We are stopping. Non-negotiable.', 'The van likes this highway. I can tell.',
      "Somebody's knee is on my pillow. Remove the knee."
    ]);
  }
  // The take-over line: the §4.1 byBand layer on drivers.you (career.pool(state, drivers.you, 'takeOver')).
  var TAKE = "You drive now. Moth's laundry still hangs from the mirror. Her rules are taped to the dash. The first rule is KNOCK.";
  if (DRV.you) band(DRV.you).takeOver = TAKE;
})(window.GG);
