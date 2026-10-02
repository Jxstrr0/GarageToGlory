// content/zz_band_gravel_kings.js (v0.9 "Genres", Lane A1): the Gravel Kings pack. Rock, Edmonton, Unit 4B at Westgate
// Plaza (between a nail salon and a vacuum repair), driver T-Bone (Tamara). Chase Vanderhoek believes it is 1985; Lenny
// "Lawsuit" Szabo's riffs sound a little too famous; Tamara "T-Bone" Ruiz is the only functioning adult. Their rival is
// Chartbusters (Vancouver): aging megastars, thirty years at the top, Rex Glamour's July scarf, drummer Steve #5, the
// radio conglomerate they quietly bought, and one power ballad released over and over.
//
// Pure data. The `zz_` prefix loads this after every base content file (build.js sorts content/ by name), so it pushes
// and assigns into GG.content.* with the plan_contract_0.9 §4.1 keying:
//   - band extras in <pool>.byBand.gravel_kings (flat pools stay neutral), member-keyed pools by member id;
//   - card variants '<baseId>_gravel_kings' (career.variant) and '<baseId>_chartbusters' for the rv_* cards;
//   - rivalry.cast.chartbusters with the full §4.1 cast shape.
// Every object is created defensively, so the pack never throws when a base structure is missing or not yet reshaped.
//
// Install: the pack installs unconditionally at load (v0.9 integration). GG.packs.gravel_kings.install() is idempotent.
// Tokens: the career ones + plan_contract_0.9 §4.2 ({front} {soloist} {filler} {bassist} {namer} {grumbler} {deadpan}
// {driver} {van} {space} {spaceName} {door} {province} {homeVenue} {superfan} {rivalFront}) and each file's own tokens.
// Tone: comedic prairie-Canadian parody. No USA content. No gong on the drum kit, ever. No share button, ever.
(function (GG) {
  var K = GG.content = GG.content || {};
  var B = 'gravel_kings', RV = 'chartbusters';
  var GL = ['garage', 'local'], GLS = ['garage', 'local', 'signed'], GLSW = ['garage', 'local', 'signed', 'world'],
    LS = ['local', 'signed'], L = ['local'], S = ['signed'], SW = ['signed', 'world'], W = ['world'], LSW = ['local', 'signed', 'world'];

  // Gate helper: every Gravel Kings card is { era:['garage'], genre:['rock'], band:['gravel_kings'] } + extras.
  function g(extra) {
    var gate = { era: ['garage'], genre: ['rock'], band: [B] };
    for (var k in extra) gate[k] = extra[k];
    return gate;
  }
  function gb(extra) { var gate = { band: [B] }; for (var k in extra) gate[k] = extra[k]; return gate; }   // band only
  function card(id, type, speaker, title, gate, text, choices, x) {
    var c = { id: id, type: type, speaker: speaker, title: title, text: text, gate: gate, choices: choices };
    for (var k in x || {}) c[k] = x[k];
    return c;
  }
  function ch(label, effects, outcome, hint) {
    var o = { label: label, effects: effects, outcome: outcome };
    if (hint) o.hint = hint;
    return o;
  }
  // A gamble: the choice's own outcome is the set-up; success/fail say what happened.
  function bet(label, hint, setup, chance, stat, sFx, sOut, fFx, fOut) {
    var roll = { chance: chance, success: { effects: sFx, outcome: sOut }, fail: { effects: fFx, outcome: fOut } };
    if (stat) { roll.stat = stat; roll.statScale = 0.005; }
    return { label: label, hint: 'Gamble: ' + hint, outcome: setup, roll: roll };
  }
  function obj(p, k) { if (!p[k] || typeof p[k] !== 'object') p[k] = {}; return p[k]; }
  function arr(p, k) { if (!Array.isArray(p[k])) p[k] = []; return p[k]; }
  function byId(list, id) { return (list || []).filter(function (x) { return x && x.id === id; })[0] || null; }
  function look(skin, hair, style, shirt, pants, h, b, extras, top) {
    return { skin: skin, hair: hair, hairStyle: style, shirt: shirt, pants: pants, height: h, build: b, extras: extras || [], top: top };
  }

  var P = {};   // the pack's data; install() below merges it into GG.content

  // ======================================================================================================================
  // NPCs (the Edmonton cast + Chartbusters' frontman). Added only when the base npcs.js has no entry with that id.
  // ======================================================================================================================
  P.npcs = [
    { id: 'gk_landlord', name: 'Mr. Petrenko', band: [B],
      blurb: 'Owns Westgate Plaza. Rents Unit 4B to the band "until a real business wants it". No real business has wanted it since 1991.' },
    { id: 'gk_nails', name: 'Trinh from Nails by Trinh', band: [B],
      blurb: 'Runs the nail salon on the left of Unit 4B. Can hear every snare hit through the wall. Charges Chase for cuticle work anyway.' },
    { id: 'gk_vacuum', name: "Gus from Gus's Vacuum Hospital", band: [B],
      blurb: 'The vacuum repair on the right. Tests every machine at full volume. Tunes his old uprights to B flat, out of spite.' },
    { id: 'gk_lawyer', name: 'Bryce Pruitt, Esq.', band: [B],
      blurb: 'Of Pruitt, Pruitt & Pruitt, entertainment law. Has left Lenny 212 voicemails. Hums the riff in question while he waits.' },
    { id: 'gk_reporter', name: 'Kyle from the Capital Courier', band: [B],
      blurb: "Edmonton's arts reporter. Also covers pothole season, the river valley and every mullet contest in the capital region." },
    { id: 'gk_dj', name: 'Rhonda on The Freeze 88.5', band: [B],
      blurb: 'Hosts the overnight rock show on the campus station. Plays anything that has not been bought by a conglomerate. Yet.' },
    { id: 'gk_dentist', name: 'Dr. Bhullar', band: [B],
      blurb: "Tamara's boss at the Sherwood Park Smile Centre. Approves her gig days if she brings back floss-usage data." },
    { id: 'gloria_mallwalk', name: 'Gloria from the Mall-Walkers', band: [B],
      blurb: 'Laps the Mega-Mall at 7 a.m. with the Early Birds Walking Club. Seventy-one. Front row at every show, in orthopaedic runners.' },
    { id: 'cb_rex', name: 'Rex Glamour', rival: RV, frontman: true,
      blurb: "Chartbusters' frontman for thirty years. Wears a silk scarf in July. Calls every band 'kid'. Owns, through a numbered company, your radio." }
  ];

  // ======================================================================================================================
  // RIVAL: Chartbusters (rivalry.cast.chartbusters, §4.1 cast shape). Frontman npc: cb_rex (the cast frontman id, rival-scoped).
  // ======================================================================================================================
  P.cast = {
    id: RV, frontman: 'cb_rex', label: 'airwave_dominion', faceStyle: 'scarf',   // Steve #5 is in members (role drums): no hired drummer
    vehicle: 'a silver 1994 tour bus called "The Ballad", towing a trailer full of scarves and a portable wind machine',
    minivan: 'a silver 1994 tour bus called "The Ballad", towing a trailer full of scarves and a portable wind machine',
    legacy: 'Thirty years at the top. Forty-one million records. One song.',
    members: [
      { id: 'cb_rex', name: 'Rex', fullName: 'Rex Glamour', nick: 'Rex Glamour', role: 'vocals', lane: 'front',
        dayJob: 'Megastar (retired twice, unretired twice)',
        bio: "Born Reginald Klassen in Chilliwack. Thirty years of hits, all the same power ballad. Wears a silk scarf in July. Calls you 'kid'.",
        gags: ['The scarf stays on at thirty-one degrees. He has a scarf for the scarf.',
          'Signs every autograph "Rex Glamour, Legend", then the date, then "you\'re welcome".',
          'Has a wind machine clause in every contract, including his lease.',
          'Owns, through a numbered company, the station playing your song. Or not playing it.'],
        look: look('#e9c4a0', '#e8d9a8', 'mullet', '#d8d2e6', '#1c1c24', 1.04, 0.95, ['sunglasses'], 'jacket'), corpsePaint: false, scarf: true, stageShirt: '#f2efe6' },
      { id: 'cb_dusty', name: 'Dusty', fullName: 'Dusty Van Kamp', nick: 'The Solo', role: 'guitar', lane: 'left',
        dayJob: 'Plays the same guitar solo, nightly, since 1994',
        bio: 'Has played one solo for three decades. It is a very good solo. He plays it on his knees, then needs help up.',
        gags: ['Travels with a physiotherapist named Trent for the knee slide.',
          'His guitar tech has only ever changed one string. The same one.'],
        look: look('#d9b08a', '#b8b2a6', 'long', '#2c2c38', '#232329', 1.0, 1.05, ['moustache'], 'jacket'), corpsePaint: false, stageShirt: '#1c1c22' },
      { id: 'cb_moira', name: 'Moira', fullName: 'Moira Chance', nick: 'The Board', role: 'bass', lane: 'right',
        dayJob: 'Chair of the board, Airwave Dominion Broadcasting',
        bio: 'The bassist, and quietly the reason the band owns the radio. Takes investor calls between songs. Never misses a note or a quarterly.',
        gags: ['Bought the radio conglomerate on a Tuesday. Told the band on Thursday.',
          'Her bass has a stock ticker on the strap.'],
        look: look('#c9906c', '#2a1f1a', 'bun', '#3a4f6e', '#1f2230', 0.98, 1.0, ['glasses'], 'jacket'), corpsePaint: false, stageShirt: '#27324a' },
      { id: 'cb_steve', name: 'Steve', fullName: 'Steve Pacholok', nick: 'Steve #5', role: 'drums', lane: 'back',
        dayJob: 'Chartbusters drummer (the fifth Steve)',
        bio: 'The fifth drummer, all of them named Steve. Nobody has asked his last name. The four previous Steves have a support group.',
        gags: ['His kit has a strip of masking tape that says STEVE, over four older strips that also say STEVE.',
          'Sends you a friend request every tour, just in case he needs a band soon.'],
        look: look('#f0d0ae', '#6b4a2e', 'short', '#6e2a36', '#26262c', 0.96, 1.0, [], 'tee'), corpsePaint: false, stageShirt: '#5a1f2a' }
    ],
    songs: ['Everything Tonight', 'Everything Tonight (Again)', 'Tonight Is Everything', 'Forever Tonight (Everything)',
      'Scarf in the Wind', 'Hold Me Like the Radio', 'Everything (Tonight\'s Version)', 'Heart on the Highway (Everything Tonight)',
      'The Night Is Everything', 'One More Tonight', 'Ballad of the Ballad', 'Everything Tonight (Acoustic in a Hangar)',
      'Tonight, Everything, Forever', 'Candle in the Wind Machine'],
    albums: [
      { title: 'Everything Tonight', kind: 'album' }, { title: 'Tonight Again', kind: 'album' },
      { title: 'The Scarf Sessions', kind: 'album' }, { title: 'Forty Million Tonights', kind: 'album' },
      { title: 'Greatest Hit', kind: 'album' }, { title: 'Greatest Hit, Vol. 2', kind: 'album' },
      { title: 'Everything Tonight: Live at the Sad Dome', kind: 'album' }, { title: 'Power Ballads for Power Outages', kind: 'album' },
      { title: 'A Very Chartbusters Christmas (Everything Tonight)', kind: 'album' }, { title: 'Unplugged (Plugged Back In)', kind: 'album' },
      { title: 'Steve #5 Is Here', kind: 'album' }, { title: 'The Farewell Tour, Part Four', kind: 'album' }
    ],
    rebrands: ['Chartbusters Legacy Experience', 'The Chartbusters Farewell Tour (Part Five)', 'Chartbusters feat. Rex Glamour',
      'Rex Glamour & the Steves', 'CHARTBUSTERS 2.0 (Same Song)'],
    news: {
      filler: [
        '{rival} released a new single. It is the power ballad. They changed the key and one word. The word was "tonight".',
        'Rex Glamour wore his scarf to a July heat-wave charity golf tournament. Two caddies fainted. Rex did not.',
        '{rival} announced a farewell tour. It is their fourth farewell tour. The merch says FAREWELL FOREVER (FOR NOW).',
        'Steve #5 from {rival} posted a selfie captioned "still here!". The four previous Steves all liked it.',
        'Every station in the Airwave Dominion network played "Everything Tonight" at 8:15 a.m. At the same time. Every station.',
        "Rex Glamour told a radio host {band} are 'cute, like a demo'. The radio host works for him. So did the radio.",
        "{rival}'s bassist Moira bought a regional billboard company. The billboards now show Rex's scarf blowing in no wind.",
        'Dusty from {rival} did the knee slide at a benefit gala and needed three volunteers to get up. It raised $40,000.',
        '{rival} sold out the Westcoast Coliseum in eleven minutes. Mostly to people who bought tickets for their parents in 1996.',
        'A {rival} tribute band played Red Deer. The real {rival} sent a cease-and-desist and then a signed scarf.'
      ],
      local: ['{rival} say they "remember being a local band". It was 1994. They had a wind machine even then.'],
      signed: ["{rival} renewed their deal with their own label, Airwave Dominion. Moira signed both sides of the contract.",
        '{rival} sent {band} a congratulations bouquet shaped like a scarf. The card says: "Welcome to the big leagues, kids. Stay out of our lane."'],
      album: ["{rival} release '{album}'. It debuts at #{pos} on the Maple 100. Every track is the ballad, reordered.",
        "{rival}'s '{album}' enters the Maple 100 at #{pos}. Their own stations call it 'the album of the decade'. Every decade."],
      albumNoChart: ["{rival} self-release '{album}' as a limited scarf box set. It comes with a scarf. The scarf outsells the album."],
      fans: ['{rival} passed {fans} fans in the new tally. Rex thanked "the ones who stayed since 1994, and their kids, who had no choice".'],
      youPassed: ['You have more fans than {rival} now, by the new count. Rex calls it "a rounding error, kid". His station plays you once, at 3 a.m.'],
      theyPassed: ['{rival} have more fans than you again. Their stations played the ballad every hour on the hour. That helps.'],
      heatUp: ["The Capital Courier calls it a feud: '{band} vs {rival}: Leather Pants vs the Scarf'. Rex bought the newspaper. Literally.",
        '{rival} pulled {band} off every Airwave Dominion playlist "by accident". The accident has a memo.'],
      heatDown: ['Things are quiet with {rival}. Rex sent a scarf. It is a warning scarf. Or a gift scarf. Hard to tell.'],
      forfeit: ["You skipped the Battle of the Bands. {rival} won by default and played the ballad twice, 'once for each of you'."],
      sameNightQuiet: ['{rival} played {venue} on Saturday. Every station simulcast it. You had the night off. Your car radio had no other choice.'],
      festivalMissed: ["{rival} headlined {venue}. Rex thanked 'the young band from Edmonton, wherever they are'. They were in the van, listening. No choice."],
      opener: ['{rival} opened for you. Rex wore a smaller scarf "out of respect". It was the same scarf, folded.',
        '{rival} opened the show. Rex told the crowd to "stick around for the kids". About {n} of their fans did.'],
      poached: ['{name} is in {rival} now. The welcome photo: four people in scarves and a cake shaped like a radio tower. You got tagged.'],
      loonies: ['{rival} won {n} Loonie(s) this year. Rex thanked the academy, the scarf and "whoever keeps voting". It is Moira.'],
      crack_breakup: ["{rival} announce a hiatus 'to focus on our catalogue'. Their catalogue is one song. Rex blames {band}, warmly, in a scarf."],
      crack_rebrand: ['{rival} have rebranded. Same four people, same scarf, same ballad, new font. Rex calls it "a whole new sound". It is not.'],
      crack_opener: ["Rex Glamour's assistant emails: Chartbusters would 'consider' opening for {band}. Moira attached a sponsorship deck and a scarf."],
      finalSoon: ['The Sad Dome wants a co-bill in week {n}: {band} and {rival}. One headlines. One opens. Rex has already ordered a longer scarf.'],
      reunion: ['{rival} reunite for one night at the Sad Dome. All five Steves are there. Only one of them is playing.']
    },
    showdowns: {
      botb: { title: 'Battle of the Bands!', icon: '⚔️',
        text: 'Battle of the Bands at {venue}, {city}. {rival} entered "for the young people". Winner takes {prize}. Their set is one song, twice.',
        enter: 'Enter the battle', pass: 'Sit this one out',
        win: ['The crowd picks you. Rex hands you the cheque and his scarf. "Keep the cheque, kid. I need the scarf back." You take {prize}.',
          'You win the Battle. {rival} play the ballad a third time anyway. The crowd sings along to yours instead.'],
        lose: ['The crowd picks {rival}. Rex dedicates the ballad "to the leather pants kids". Some of your fans sway.',
          '{rival} win the Battle and simulcast the victory on eleven stations. Your moms hear it in the car.'] },
      sameNight: { title: 'Same night, same town', icon: '🌃',
        text: '{rival} booked {venue} for the same Saturday. Every station is running ads for their show. Whoever has the buzz gets the room.',
        win: ['The city picked your show. {rival} played to their own stations\' prize winners. Rex sent a scarf to your green room. Unsigned.'],
        lose: ['Half your crowd went to {rival}. Their show was free with any radio contest entry. There were a lot of contests.'] },
      stolenSlot: { title: 'Slot stolen', icon: '📌',
        text: '{rival} booked {venue} out from under you "for a private listening party". It is the ballad. On loop.',
        win: ['{venue} said no to {rival}: "We have a rock band that night." Rex had never heard the word no. He wrote it down.'],
        lose: ['{rival} took the {venue} slot. The booker got a lifetime pass to every Airwave Dominion station. He cannot turn them off.'] },
      festival: { title: 'Festival clash', icon: '🎪',
        text: '{venue}: {rival} headline with a wind machine the size of a combine. You are on at 2 p.m. Outplay the legends from the low slot.',
        win: ['You outplayed the headliners from the 2 p.m. slot. By sunset the crowd is chanting your name. Rex turns the wind machine up. It does not help.'],
        lose: ['{rival} close the festival with fireworks, a wind machine and the ballad in three keys. They thank "the 2 p.m. kids".'] },
      loonies: { title: 'The Loonies', icon: '🏆',
        text: '{rival} are nominated against you. They have been nominated every year since the category existed. Some years, before.',
        win: ['You beat {rival} at the Loonies. Rex stands and applauds with his scarf, like a flag of surrender. Moira is already on the phone.'],
        lose: ['{rival} beat you at the Loonies. Rex thanks you from the stage: "The kids from Edmonton, keep it up, you\'re almost us."'] },
      poach: { title: 'The poach', icon: '🧣',
        text: '{rival} want {name}. There is a scarf involved, and a pension plan.',
        win: ['{name} stays. Rex replies in four minutes: "Respect, kid. The offer stays on the table. The table is ours."'],
        lose: ['{name} joins {rival}. There is a welcome cake shaped like a radio tower. They saved you a slice of the antenna.'] },
      final: { title: 'The Sad Dome', icon: '🏟️',
        text: 'The Sad Dome, Calgary. {band} and {rival}, one set each. The crowd decides who headlines and who opens. Forever.',
        win: ['You headline the Sad Dome. {rival} open. Rex introduces you himself: "Ladies and gentlemen, the future. Kid." He hands Chase the scarf.'],
        lose: ['{rival} headline the Sad Dome. You open. Rex introduces you with a slideshow of himself. Forever is a long time.'] }
    },
    banter: {
      open: ['Rex leans into the mic: "Evening. We are Chartbusters. You know this one. You know all of them. It is one."',
        'Rex adjusts the scarf. "This song got us through thirty years. Tonight it gets us through thirty minutes."'],
      mid: ['Dusty goes down on his knees for the solo. Two roadies wait in the wings to help him up.',
        'Steve #5 waves at the crowd. The crowd waves back, unsure which Steve.'],
      final: ['Rex holds the last note until the wind machine runs out of gas.',
        '"Goodnight! Buy the scarf!" The scarf is $85. People buy the scarf.']
    },
    ui: {
      heatLabels: ['A polite scarf', 'Scarf-cold', 'Radio silence', 'Blacklisted on eleven stations', 'Leather Pants vs the Scarf'],
      vehicleLine: 'Their bus, "The Ballad", idles outside every venue with the wind machine running, just in case.',
      emptyNews: 'Nothing from Chartbusters this week. Every station is playing the ballad anyway.',
      pass: 'Chartbusters sent a scarf. It means "we noticed".',
      finalWin: 'You headline the Sad Dome. Rex Glamour opens for you, forever, in the scarf.',
      finalLose: 'Chartbusters headline the Sad Dome. You open for the ballad. Forever.',
      emptyAlbums: 'No album this year. The label is remastering the ballad again.',
      solo: 'Dusty Van Kamp: the ballad solo, note for note, the same as 1991.',
      finish: '{rival} finish on the key change. Rex holds the scarf up to the wind machine. Your turn.',
      crack: {
        breakup: ['They are on hiatus.', 'Chartbusters are on hiatus "to protect the catalogue". The ballad stays on the radio anyway.'],
        rebrand: ['They rebranded.', 'Chartbusters rebranded: same song, new font, a new scarf for Rex.'],
        opener: ['They want to open for you.', 'Chartbusters offered to open for you. Rex says it is "a legacy move". Moira has the paperwork.']
      }
    },
    carpet: { intro: 'Chartbusters arrive by stretch limousine, one scarf each, waving like they own the network. They do.', wave: 'scarf', count: 4 },
    defector: { line: 'Your old bandmate is in Chartbusters now, wearing a scarf in July and playing the ballad.', look: 'denim' },
    comments: [
      'Rex Glamour here. Cute song, kid. Reminds me of us. Everything reminds me of us.',
      'Chartbusters Official: Thirty years. Forty-one million records. One song. Stream "Everything Tonight".',
      'Steve #5 here! Big fan. Are you hiring drummers? Asking for a Steve.',
      'Airwave Dominion Broadcasting: this post is not eligible for rotation at this time.',
      'Moira (Chartbusters, bass): please stop tagging our stations.'
    ]
  };

  // Rival Monday cards: variants of the base rv_* ids (career.variant tries '<id>_<rivalId>' first).
  P.rivalCards = [
    card('rv_poach_chartbusters', 'drama', 'cb_rex', 'A Scarf for {recruit}', {},
      "A courier delivers a silk scarf addressed to {recruit}, not the band. The card: 'Kid. Steve #5 is wobbling. Dental, a pension, " +
      "a tour bus with a wind machine. Call me. — Rex.' {recruit} is already wearing the scarf.",
      [ch('Match it: a loyalty bonus', { fund: -150, mood: { recruit: 16 } },
        "You hand {recruit} an envelope and a speech. {recruit} returns the scarf by courier. Rex replies: 'Respect, kid. Offer stands.'", 'Cash from the band fund'),
       ch('Promise {recruit} the spotlight', { mood: { recruit: 14 }, chemistry: -2, burnout: 4 },
        "{recruit}'s name goes on the poster, bigger than Chase's. Chase notices. {recruit} stays.", 'A song of their own, their name on the poster'),
       bet("Call Rex's bluff", 'they might go', 'You call Rex back.', 0.5, 'chemistry',
        { mood: { recruit: 6 }, buzz: 2 }, '{recruit} stays, out of spite. The scarf becomes a mic-stand decoration.',
        { member: { id: 'recruit', act: 'poach' } }, '{recruit} takes the job. The welcome photo: four scarves, a cake shaped like a radio tower. You got tagged.')],
      { once: false, cooldown: 12 }),
    card('rv_crack_breakup_chartbusters', 'scene', 'cb_rex', 'Chartbusters on Hiatus', {},
      "A press release on heavy paper: Chartbusters are 'stepping back to protect the catalogue'. The catalogue is one song. Rex calls you " +
      "himself. 'You beat us, kid. Fair and square. Moira ran the numbers.'",
      [ch('Send Rex a scarf', { fund: -60, buzz: 6, chemistry: 3 },
        'You send a scarf, knitted by Gloria from the Mall-Walkers. Rex wears it on the evening news. The scene calls it classy.', 'Kill them with kindness'),
       ch('Victory lap on the radio', { buzz: 12, fans: 40, mood: { all: -3 } },
        'You call in to The Freeze and play your single back-to-back with theirs. The difference is audible. Rex calls in too. It gets awkward.', 'Buzz now, karma later')],
      { once: true }),
    card('rv_crack_rebrand_chartbusters', 'scene', 'cb_rex', 'The Chartbusters Rebrand', {},
      'Chartbusters are now {rival}. Same four people, same bus, same ballad. The rebrand deck has 44 slides; slide 30 is a photo of Chase ' +
      "labelled 'the competition (1985)'.",
      [ch('Congratulate them, sincerely', { chemistry: 3, buzz: 3 },
        'You send a card. Rex sends back a signed photo of himself holding your card. The loop is complete.', 'They mean well, mostly'),
       ch('Keep calling them Chartbusters', { buzz: 8, mood: { all: 3 } },
        'Every interview, the old name. Every interview, Rex corrects it in a letter. Chase frames the letters.', 'Petty, and fun')],
      { once: true }),
    card('rv_crack_opener_chartbusters', 'scene', 'cb_rex', 'Can We Open for You, Kid?', {},
      "Rex calls, which he has never done. 'Kid. Moira ran the numbers. You're the bigger draw now. We'd consider opening. Legacy move.' " +
      'Behind him, Steve #5 is nodding very fast.',
      [ch("Sure. You're opening.", { buzz: 6, fans: 30, chemistry: 2 },
        'Rex wears a smaller scarf "out of respect". Dusty borrows your tuner. Steve #5 asks if you are hiring. It is perfect. It is terrifying.', 'Their fans become your fans'),
       ch('Make them send a demo', { buzz: 10, mood: { all: 3 }, chemistry: -2 },
        'They send a demo. It is the ballad. With a note: "You know this one." Chase writes back: "We do."', 'A little payback')],
      { once: true }),
    card('rv_final_eve_chartbusters', 'scene', 'cb_rex', 'Sad Dome Eve', {},
      "This weekend: the Sad Dome, Calgary. {rival} and {band}, one headliner. Rex texts from a landline: 'Break a leg, kid. " +
      "Not literally. Dusty already did that.'",
      [ch('Rehearse until your hands bleed', { chemistry: 4, burnout: 8, drumSkill: 1 },
        'You run the set eleven times in Unit 4B. Tamara brings sandwiches and a curfew. Chase ignores the curfew. So do you.', 'Sharper, more tired'),
       ch('Send Rex a scarf first', { fund: -80, buzz: 8, mood: { all: 3 } },
        'You beat him to the scarf for the first time in thirty years of scarves. Rex calls, audibly shaken. "Kid. KID."', 'Out-scarf the scarf')],
      { once: true })
  ];

  // Scene filler: install() flags the base 'chartbusters_scene' row with rivalId (Q4: skipped in this band's career).
  // Alberta filler rows and the Q8 cameo rows for the other playable bands are the base file's job (Lane A2).


  // ======================================================================================================================
  // MONDAY DECK (GG.content.cards). Magnitudes follow MAG_BY_ERA by the card's earliest era.
  // ======================================================================================================================
  P.cards = [
    // ---- Week one (forced) ------------------------------------------------------------------------------------------
    card('gk_its_1985', 'drama', 'chase', "It's 1985 in Here", g({}),
      "Chase arrives at the first rehearsal in Unit 4B in leather pants, at minus 38, carrying a boom box. He announces that in here " +
      'it is 1985, and it will stay 1985. Lenny is tuning. Tamara hands everyone floss.',
      [ch("'It's 1985, Chase.'", { mood: { chase: 8 }, chemistry: 2 },
        'He hits play on the boom box. It eats the tape. "Perfect," he whispers. "Just like the real 1985." Lenny plays along. Too well.'),
       ch("'Chase, you have a cellphone.'", { mood: { chase: -6, tamara: 3 } },
        "He holds it up. 'This? The future brick. I use it ironically.' He then checks it forty times during rehearsal."),
       ch("In here, it's 1985. Deal.", { mood: { chase: 4 }, chemistry: 3 },
        "Deal. Chase tapes a 1985 calendar over the plaza's fire exit sign. Mr. Petrenko will have notes. Tamara writes the notes down first.")],
      { forceWeek: 1 }),

    // ---- Early garage (year one, weeks 2-16) ---------------------------------------------------------------------------
    card('gk_early_landlord', 'money', 'gk_landlord', 'The Lease on Unit 4B', g({ minWeek: 2, maxWeek: 10 }),
      "Mr. Petrenko has typed up the house rules for Unit 4B: no drums before the nail salon closes, no pyrotechnics, and 'Chase " +
      "must stop calling the loading dock backstage'. He wants a signature and first month's goodwill.",
      [ch('Sign everything', { chemistry: 3, mood: { tamara: 4 } },
        'Tamara reads every clause, initials every page and asks for a copy. Mr. Petrenko has never been asked for a copy. He is moved.'),
       ch('Pay him in a band shirt', { fund: -40, mood: { chase: 5 } },
        'He wears it to the bank. The bank teller asks who the Gravel Kings are. He says "tenants". It is the nicest thing he has ever said.'),
       ch('Negotiate the loading dock', { buzz: 3, mood: { chase: 6, tamara: -4 } },
        'The loading dock is officially "backstage" from 6 p.m. to 10 p.m. Chase installs a door sign. Tamara installs a clock.')]),
    card('gk_early_nail_salon', 'scene', 'gk_nails', 'The Wall Is Thin', g({ minWeek: 2, maxWeek: 12 }),
      'Trinh from Nails by Trinh knocks on the shared wall during a pedicure appointment. Then she comes around. "Your {gear} is in my ' +
      "customer's toes. She is tapping along. It is ruining the polish.\"",
      [ch('Rehearse after salon hours', { burnout: 4, chemistry: 3 },
        'Rehearsals start at 8 p.m. now. Trinh leaves a thank-you note and a coupon. Chase uses the coupon. His cuticles have never looked better.'),
       ch('Play something slower', { mood: { lenny: 3 }, buzz: 2 },
        'Lenny plays a slow riff. The customer stops tapping and starts crying. Trinh says it sounds "familiar". Lenny says nothing.'),
       ch('Invite the salon to a show', { fans: 6, mood: { chase: 3 } },
        'Six nail technicians and three customers in toe separators come to your next gig. They are the loudest people there.')]),
    card('gk_early_vacuum', 'weird', 'gk_vacuum', 'The Vacuum Hospital', g({ minWeek: 3, maxWeek: 14 }),
      "Gus from Gus's Vacuum Hospital is testing a rebuilt canister vacuum at full power. It howls in B flat. Your whole set is in E. " +
      'Gus says he can test in E "for a small consideration".',
      [ch('Retune the set to B flat', { skill: { lenny: 1 }, burnout: 4 },
        'The whole set drops a half step. Lenny says it sounds "heavier". It also sounds a lot like the vacuum. Gus nods along.'),
       ch('Buy Gus a coffee', { fund: -15, chemistry: 2 },
        'Gus now tests in E. He also fixes your amp for free. The amp now sounds slightly like a vacuum. Nobody minds.'),
       ch('Record the vacuum', { buzz: 4, mood: { chase: 4 } },
        'Chase calls it "the sound of the city". It goes on the demo, under the intro. A reviewer calls it "industrial". It is a canister vacuum.')]),
    card('gk_early_voicemail', 'drama', 'lenny', 'One New Voicemail', g({ minWeek: 3, maxWeek: 12 }),
      "Lenny's phone buzzes mid-riff. One new voicemail from a law firm. He lets it ring out. It rings in E. He keeps playing, in E. " +
      "'It's nothing,' he says. It has happened eleven times this week.",
      [ch('Listen to it together', { chemistry: 3, mood: { lenny: -4 } },
        "It is a lawyer humming Lenny's riff, then a pause, then 'call us'. Tamara writes the number on the whiteboard. Nobody calls."),
       ch('Tell him to change the riff', { mood: { lenny: -6, tamara: 3 }, skill: { lenny: 1 } },
        "Lenny changes two notes. Now it sounds like a different famous riff. The voicemails get a new area code."),
       ch("It's fine. Play it louder.", { buzz: 3, mood: { lenny: 5, chase: 3 } },
        'He plays it louder. The phone vibrates off the amp. Chase says "this is what rock and roll sounds like". It sounds like a phone.')]),
    card('gk_early_floss', 'drama', 'tamara', 'The Floss Mandate', g({ minWeek: 2, maxWeek: 12 }),
      "Tamara has laminated a sign for the rehearsal room: 'NO FLOSS, NO JAM'. There is a dispenser by the door. It is full. Chase " +
      "says rock stars don't floss. Tamara says rock stars keep their teeth.",
      [ch('Everybody flosses', { chemistry: 4, mood: { chase: -4, tamara: 6 } },
        'Four people flossing in silence in a strip mall at 9 p.m. It is the most bonding thing that has ever happened to you.'),
       ch('Chase gets an exemption', { mood: { chase: 5, tamara: -5 } },
        'Chase wins. Tamara hands him a pamphlet about gum disease instead. He reads it in the van. He is quiet for a long time.'),
       ch('Floss on stage, as a bit', { buzz: 5, mood: { tamara: 3 } },
        'Between songs the band flosses in unison. The crowd cheers. A dentist in the back cries. Tamara gets three new patients.')]),
    card('gk_early_leather', 'weird', 'chase', 'Leather at Minus Forty', g({ minWeek: 4, maxWeek: 16, weekOfYear: [11, 16] }),
      'Chase waited for the bus in leather pants at minus 41. The pants froze to the bench. He is still at the bus stop. He sent a photo. ' +
      "It is a selfie. He looks proud.",
      [ch('Go get him with a kettle', { chemistry: 3, burnout: 3 },
        'Tamara brings a kettle of warm water. Lenny brings a camera. Chase is released to light applause from the bus shelter.'),
       ch('Buy him long johns', { fund: -30, mood: { chase: -4 } },
        'He wears them under the leather. He tells nobody. Everybody knows. He is noticeably warmer and noticeably less 1985.'),
       ch('Post the photo', { buzz: 6, mood: { chase: 5 } },
        '"Local Man Frozen to Bench, Looks Great" gets shared around the whole city. Chase was not rescued for forty minutes. Worth it, he says.')]),
    card('gk_early_receipts', 'money', 'tamara', 'The Receipt Shoebox', g({ minWeek: 3, maxWeek: 14 }),
      "Tamara has brought a shoebox labelled RECEIPTS and a second shoebox labelled RECEIPTS (CHASE). The second one is empty. Chase " +
      "has spent $140 on hairspray this month. 'Is it a business expense?' he asks.",
      [ch('Hairspray is a business expense', { fund: 60, mood: { chase: 4 } },
        'Tamara files it under "stage lighting". The tax refund comes back bigger. Chase buys more hairspray. The cycle continues.'),
       ch('Cut the hairspray budget', { fund: 40, mood: { chase: -6, tamara: 4 } },
        "Chase switches to the plaza's discount store brand. His hair drops two inches. He calls it 'the unplugged look'."),
       ch('Let Tamara handle it', { chemistry: 3, mood: { tamara: 5 } },
        'Tamara handles it. You do not know how. You find a colour-coded spreadsheet taped inside the kick drum.')]),
    card('gk_early_mill_woods', 'scene', 'chase', 'A Basement in Mill Woods', g({ minWeek: 2, maxWeek: 8, gigBooked: false }),
      "Chase met a guy at the bus stop whose sister is throwing a basement party in Mill Woods this weekend. 'Fifty people. A real " +
      "stage. Well, a ping-pong table.' Tamara wants to know who is driving. Tamara is driving.",
      [ch('Book it', { book: 'mill_woods_basement_party', mood: { chase: 5 } },
        'You are booked on a ping-pong table in Mill Woods. Chase practises his knee slide on the carpet. He gets carpet burn. Worth it, he says.'),
       ch('Not this week', { burnout: -3, mood: { chase: -3 } },
        'Chase goes to the party anyway, as a guest, in the leather pants. He sings one song on the ping-pong table. Now they want the band.')]),
    card('gk_early_boombox', 'weird', 'chase', 'The Boom Box Ate It', g({ minWeek: 4, maxWeek: 16 }),
      "Chase recorded your first demo on a cassette in his boom box. The boom box ate the cassette. Chase is pulling the tape out " +
      'with a pencil, slowly, like surgery. "Nobody breathe."',
      [ch('Nobody breathes', { chemistry: 4, burnout: 3 },
        'Four minutes of silence. The tape comes out whole. Chase winds it back with the pencil. The demo now has a warble. It is perfect.'),
       ch('Record it again, digitally', { skill: { chase: 1 }, mood: { chase: -4 } },
        "Tamara records it on her phone. It sounds great. Chase says it has 'no soul'. He keeps the chewed cassette in his jacket for luck."),
       ch('Mail the chewed tape to radio', { buzz: 5, fans: 4 },
        'The Freeze 88.5 plays it, warble and all. Rhonda calls it "haunted". Four people call in to ask if it is a ghost. It is Chase.')]),
    card('gk_early_parking', 'money', 'tamara', 'Plaza Parking', g({ minWeek: 5, maxWeek: 16 }),
      "Westgate Plaza has a two-hour parking limit and a man named Darrell with a clipboard. Your van has three tickets. Tamara wants a " +
      "plan. Chase wants to 'fight the system'. Darrell is right outside.",
      [ch('Pay the tickets', { fund: -60, mood: { tamara: 3 } },
        'Tamara pays and asks Darrell for a receipt. He has never been asked for a receipt. He tears one off a pad he has had since 2004.'),
       ch('Move the van every two hours', { burnout: 5, chemistry: 2 },
        'Rehearsals now have an intermission. Lenny moves the van, Chase critiques the parking. It works. Darrell looks disappointed.'),
       bet('Give Darrell a band shirt', 'bribery, but with cotton', 'Chase walks out holding a shirt like a flag.', 0.5, null,
        { fans: 3, buzz: 3 }, 'Darrell wears the shirt. The tickets stop. Darrell is at the next show, clipboard in hand, nodding.',
        { fund: -80 }, 'Darrell is offended by the attempted bribery and by the shirt size. Two more tickets. Medium, he says. He is a medium.')]),

    // ---- Evergreen (garage, Local Heroes and Signed) --------------------------------------------------------------------
    card('gk_future_brick', 'weird', 'chase', 'The Future Brick', g({ era: GLS, minWeek: 4 }),
      "Chase refuses to text. He calls the band from the payphone outside the Westgate laundromat. This week the city removed the " +
      'payphone. Chase is standing where it used to be, holding the cord they left behind.',
      [ch('Teach him to text', { chemistry: 3, mood: { chase: -5 } },
        'His first text is "HELLO THIS IS CHASE VANDERHOEK". His second is "HOW DO I STOP". He learns. He hates it. He uses only capitals.'),
       ch('Petition for the payphone', { buzz: 5, mood: { chase: 6 } },
        'Forty signatures, mostly mall-walkers. The city installs a replica payphone. It does not work. Chase calls you on it anyway.'),
       ch('Buy him a pager', { fund: -35, mood: { chase: 8 } },
        "A pawn-shop pager. Nobody has a pager to page it from. He wears it anyway. It never beeps. 'It's resting,' he says.")]),
    card('gk_voicemail_box', 'drama', 'lenny', 'Mailbox Full', g({ era: GLS, minWeek: 6 }),
      "Lenny's voicemail box is full. It is all lawyers. One of them has started leaving messages that are just the riff, sung, " +
      'with the lyrics "call us back" in place of the words. It is catchy. That is the problem.',
      [ch('Call them back, together', { chemistry: 4, mood: { lenny: -5, tamara: 3 } },
        'Tamara dials. The lawyer is surprised anyone called. He says it is "a courtesy follow-up". You agree to be courteous. Nothing else happens.'),
       ch('Delete all of them', { burnout: -3, mood: { lenny: 6 } },
        'Lenny deletes 212 voicemails in one sitting. He says it feels like sweeping a solo. The box is full again by Friday.'),
       ch('Use it as a song intro', { buzz: 6, mood: { chase: 4 } },
        'The lawyer\'s voicemail opens your set. The crowd sings along with the lawyer. A second lawyer calls about the first lawyer.')]),
    card('gk_tamara_taxes', 'money', 'tamara', 'Tax Night', g({ era: GLS, weekOfYear: [17, 22] }),
      "Tamara does the band's taxes for fun. She has a highlighter in each hand and a third behind her ear. She wants to deduct " +
      "Chase's leather pants as 'work wear'. The government may have questions.",
      [bet('Deduct the pants', 'the pants are a costume', 'Tamara attaches a photo of the pants to the return.', 0.55, null,
        { fund: 150, mood: { tamara: 5 } }, 'Accepted. The leather pants are now a registered business asset. Chase is thrilled. The pants are thrilled.',
        { fund: -80, burnout: 4 }, 'A letter asks for "further documentation of the pants". Chase sends a Polaroid. It does not help.'),
       ch('File it plain', { fund: 60, chemistry: 2 },
        'A small, honest refund. Tamara frames the confirmation page. She says it is the best thing the band has ever done.'),
       ch('Pay her in pizza', { fund: -40, mood: { tamara: 6 } },
        'She does it for pizza and a hug from the band. She files your personal ones too. You had no idea you were owed $38.')]),
    card('gk_whyte_busk', 'money', 'chase', 'Busking on Whyte Avenue', g({ era: GLS }),
      "Chase wants to busk on Whyte Avenue. It is minus 22. Lenny's fingers stop working after one song. Chase's hair is frozen in " +
      "place, which he says is 'the look'. The hat has four dollars in it and a mitten.",
      [ch('One more song', { fund: 35, burnout: 5 },
        'The mitten\'s owner comes back for it and drops in a twenty. You play until the hat has $35 and the hair has icicles.'),
       ch('Busk inside the pita shop', { fund: 20, fans: 5 },
        'The owner lets you play by the till in exchange for "a nice song about pitas". Chase writes one. It is a power ballad.'),
       ch('Pack it in, get poutine', { burnout: -4, chemistry: 3 },
        'Poutine at 1 a.m. on Whyte. Chase explains the plot of a 1985 movie nobody has seen. It is still the best night of the month.')]),
    card('gk_playoffs', 'scene', 'lenny', 'Playoff Fever', g({ era: GLS, weekOfYear: [19, 23] }),
      'The Edmonton Oilcans are in the playoffs. The whole city is in jerseys. Nobody is going to a rock show on a game night. ' +
      "Lenny has an idea. It involves the goal horn.",
      [ch('Play the sports bar party', { fund: 100, buzz: 4 },
        'You play between periods at a sports bar on 82nd Avenue. Every goal, the crowd chants your chorus. Every loss, they blame you.'),
       ch('Write a playoff anthem', { buzz: 7, mood: { lenny: 5 } },
        'Lenny writes "Oil Can\'t Stop Us". It sounds a lot like another playoff anthem. A lawyer calls. The team loses anyway.'),
       ch('Watch the game together', { chemistry: 5, burnout: -4 },
        'Four people and a drummer in Unit 4B, watching on Gus\'s repair-shop TV through the wall. You all yell. The vacuum yells back.')]),
    card('gk_high_level', 'weird', 'chase', 'High Level Bridge Video', g({ era: GLS }),
      "Chase wants to shoot a music video on the High Level Bridge in a snowstorm, with a wind machine. There is already wind. " +
      "'It's not the right wind,' he says. He has rented the wind machine.",
      [ch('Shoot it in the storm', { buzz: 8, burnout: 6 },
        'The wind machine blows the snow back into the storm. Chase\'s mullet achieves full extension. Kyle from the Courier calls it "art".'),
       ch('Shoot in Unit 4B instead', { fund: -30, chemistry: 3 },
        'Gus lends a vacuum on reverse. It is almost a wind machine. The nail salon lends ring lights. It looks expensive. It cost $30.'),
       ch('Return the wind machine', { fund: 40, mood: { chase: -6 } },
        'You get the deposit back. Chase stands on the bridge alone anyway, in the real wind, for eleven minutes. Someone films it.')]),
    card('gk_fog_alarm', 'weird', 'tamara', 'Fog Alarm', g({ era: GLS, minWeek: 6 }),
      "Chase's new fog machine set off the smoke alarm in Nails by Trinh. Trinh evacuated four customers mid-manicure. They are standing " +
      'in the parking lot with wet nails. Tamara is holding the fog machine like evidence.',
      [ch('Free manicures on the band', { fund: -80, chemistry: 3 },
        'You pay for four redos. The customers stay for rehearsal. One of them books you for her anniversary. Trinh forgives you, mostly.'),
       ch('Blame the vacuum shop', { mood: { chase: 4, tamara: -5 } },
        'Gus denies everything with his whole chest. The feud between the salon and the vacuum shop begins. You are now neutral territory.'),
       ch('Fog only on stage from now on', { mood: { tamara: 4, chase: -3 } },
        'Tamara writes it into the band bylaws. Chase signs it with a flourish. The fog machine gets its own locked case.')]),
    card('gk_leduc_wedding', 'money', 'lenny', 'An Eighties Wedding in Leduc', g({ era: GLS }),
      "A couple in Leduc wants an '80s cover band for their wedding. Chase is offended: 'They're not covers if you believe.' The " +
      'pay is $180 and a plate of perogies. Lenny already knows every song. That is a separate concern.',
      [ch('Take the gig', { fund: 180, mood: { chase: -4 } },
        'The dance floor is full. Chase sings every song as if he wrote it. Lenny plays them a little too accurately. Nobody sues. Tonight.'),
       ch('Originals only', { fans: 12, mood: { chase: 6 } },
        'You play your own songs. The couple\'s first dance is to "Leather Pants at Forty Below". They say it is "their song" now.'),
       bet('Mashups', 'a hit, or a legal letter', 'Lenny starts a mashup of your chorus and a famous riff.', 0.5, 'chemistry',
        { fund: 180, buzz: 5 }, 'The whole wedding sings along. The groom\'s uncle hires you for his retirement party.',
        { fund: 90, mood: { lenny: -5 } }, 'The groom is a paralegal. He hands Lenny a business card during the cake.')]),
    card('gk_airbrushed_van', 'drama', 'chase', 'The Airbrushed Van', g({ era: GLS, minWeek: 5 }),
      "Chase has found a guy in St. Albert who airbrushes vans. He wants a panther on the side, leaping over the Edmonton skyline, " +
      "lightning in its eyes. Tamara is the driver. Tamara has opinions about visibility.",
      [ch('The panther, full size', { fund: -180, buzz: 6, mood: { chase: 10, tamara: -5 } },
        'The panther covers both sides and half the windshield. Tamara drives looking through its mouth. Traffic stops to photograph it.'),
       ch('A small panther. On the bumper.', { fund: -60, mood: { chase: 3 }, chemistry: 2 },
        'The panther is the size of a housecat. Chase says it "has potential". Tamara approves. It is the first compromise of the year.'),
       ch('No panther', { mood: { chase: -8, tamara: 4 } },
        'Chase draws a panther on the van in dust with his finger. It rains. The panther cries down the doors. He is devastated.')]),
    card('gk_cleanings', 'drama', 'tamara', 'Everyone Gets a Cleaning', g({ era: GLS, minWeek: 6 }),
      "Tamara has booked the whole band for cleanings at the Sherwood Park Smile Centre, on her staff discount. Chase has not been " +
      "to the dentist since 1985. The real one. He was four.",
      [ch('Everybody goes', { chemistry: 4, burnout: 3, mood: { tamara: 6 } },
        'Chase screams at the scaler. Lenny hums the riff through the suction. Dr. Bhullar says it is the loudest Tuesday of her career.'),
       ch('Chase goes alone, bravely', { mood: { chase: -6, tamara: 5 }, buzz: 3 },
        'He wears the leather pants in the chair. He posts a selfie with the bib on. Twelve people ask where to book. Tamara is a hero.'),
       ch('Reschedule. Indefinitely.', { mood: { tamara: -8 } },
        'Tamara cancels, in writing, and mails each of you a toothbrush with your name on it. The message is received.')]),
    card('gk_anthem_riff', 'weird', 'lenny', 'The Anthem Riff', g({ era: GLS }),
      "Lenny has a new riff. He is very excited. He plays it. It is the national anthem, slightly faster. Chase is already standing, " +
      'hand on heart. Tamara wants to know if the anthem can sue.',
      [ch("It's a tribute. Keep it.", { buzz: 5, mood: { lenny: 5 } },
        'You play it at every show. Crowds stand. Hats come off. A retired colonel salutes. It is the most respected song you have.'),
       ch('Change it, Lenny', { skill: { lenny: 1 }, mood: { lenny: -4 } },
        'He changes it. Now it sounds like the theme from the evening news. The crowd expects a weather report. Chase gives one.'),
       ch('Make it a hockey intro', { fund: 60, buzz: 3 },
        'A junior hockey team in Spruce Grove buys it as their walk-out music for $60. It is technically public domain. Lenny is relieved.')]),
    card('gk_freeze_demo', 'fame', 'gk_dj', 'On The Freeze 88.5', g({ era: GLS, minWeek: 5 }),
      "Rhonda on The Freeze 88.5 got your demo. She will play it at 2 a.m. if someone from the band comes in to say hello. " +
      "Chase says he will do it. He says he will do it in character. He is always in character.",
      [ch('Send Chase', { buzz: 6, fans: 8, mood: { chase: 5 } },
        'Chase does the whole interview as a 1985 radio guest. He asks Rhonda if she has heard of "the compact disc". She plays two songs.'),
       ch('Send Tamara', { fans: 10, chemistry: 2 },
        "Tamara answers every question clearly, plugs the next show with the date and time, and tells listeners to floss. Record call-ins."),
       ch('Send Lenny', { buzz: 4, mood: { lenny: 4 } },
        'Lenny plays the riff live on air. The station phone lights up. Half of the callers are fans. One is a lawyer. Rhonda plays it again.')]),
    card('gk_courier_profile', 'fame', 'gk_reporter', 'Capital Courier Profile', g({ era: GLS, minFans: 25 }),
      "Kyle from the Capital Courier wants to profile 'the strip-mall band'. He wants a photo in front of Westgate Plaza, next to the " +
      "vacuum repair sign. Headline pitched: 'Stuck in 1985, and Fine With It'.",
      [ch('Pose with the vacuum sign', { buzz: 6, fans: 12 },
        'Gus gets in the photo. Trinh gets in the photo. The profile runs with the headline "The Pride of Westgate Plaza". Petrenko frames it.'),
       ch('Pose in Unit 4B', { buzz: 5, chemistry: 3 },
        'The photo shows the kit where the till used to be. Readers ask if the band is for sale. Chase says "only our souls".'),
       ch('Chase does the interview solo', { buzz: 8, mood: { chase: 6, lenny: -4 } },
        'The article is 1,200 words and 900 of them are Chase on the history of hairspray. Lenny is called "the other one". He takes it hard.')]),
    card('gk_mullet_contest', 'fame', 'chase', 'The Mullet Championship', g({ era: GLS, weekOfYear: [1, 4] }),
      'The St. Albert Mullet Championship is this Saturday at the curling rink. Chase has entered. He has been growing it since he was ' +
      "twelve. The judges include a retired barber and the mayor's cousin.",
      [bet('Chase competes', 'business in front, glory in back', 'Chase walks out to your single.', 0.5, 'buzz',
        { buzz: 10, fans: 18, mood: { chase: 10 } }, 'Chase wins Best Flow. The trophy is a hairbrush on a hockey puck. It goes on the amp.',
        { mood: { chase: -8 }, buzz: 3 }, "Second place to a nine-year-old from Morinville. Chase shakes his hand. He means it. Mostly."),
       ch('Play the halftime show', { fund: 80, fans: 10 },
        'You play between rounds. Forty mullets headbang in unison. The rink manager asks you back for the bonspiel.'),
       ch('Stay home. Rest.', { burnout: -5, mood: { chase: -4 } },
        'Chase watches the livestream in Unit 4B, brushing his hair, whispering "that should have been me".')]),
    card('gk_minutes', 'drama', 'tamara', 'Band Meeting Minutes', g({ era: GLS, minWeek: 8 }),
      "Tamara calls a band meeting with an agenda, a timekeeper and a motion to 'stop leaving the fog machine plugged in'. Chase " +
      "moves to amend the motion to 'more fog'. Lenny abstains. You are the tiebreaker.",
      [ch('Vote with Tamara', { chemistry: 3, mood: { tamara: 5, chase: -4 } },
        'The motion carries. Tamara reads it into the record. Chase asks for his dissent to be noted. It is noted, in red.'),
       ch('Vote with Chase', { buzz: 3, mood: { chase: 5, tamara: -4 } },
        'More fog. The fog machine is now on a timer, set by Tamara, labelled FOG (APPROVED). She is annoyed but thorough.'),
       ch('Table it until next week', { burnout: -3, chemistry: 2 },
        'The motion is tabled. The table is the kick drum. The agenda stays taped to it for a month. It becomes part of the look.')]),
    card('gk_leduc_reunion', 'scene', 'lenny', 'The Leduc Reunion', g({ era: GLS, minWeek: 10 }),
      "Lenny's high-school reunion in Leduc wants the band. Everyone there remembers the riff he 'wrote' in Grade 11. So does the band " +
      'who actually wrote it, who are also from Leduc, and also invited.',
      [ch('Play it anyway', { fans: 15, mood: { lenny: 5 } },
        'The real band comes up during the chorus and plays along. Afterwards they sign a napkin granting Lenny "Leduc rights only".'),
       ch('Only new riffs tonight', { skill: { lenny: 1 }, mood: { lenny: -3 } },
        'Lenny plays only brand-new riffs. People ask for "the old one". He says the old one has been "retired, legally".'),
       ch("Skip it. He'd rather not.", { mood: { lenny: 3 }, burnout: -3 },
        'Lenny stays home and watches the reunion slideshow online. There is a photo of him in Grade 11, playing the riff. Evidence.')]),
    card('gk_clinic_potluck', 'scene', 'tamara', 'The Clinic Potluck', g({ era: GLS }),
      "The Sherwood Park Smile Centre's staff potluck needs a band. Dr. Bhullar requests 'nothing too loud, the hygienists' ears are " +
      "sensitive instruments'. Chase has already asked if there is a stage. There is a buffet table.",
      [ch('Unplugged set by the buffet', { fund: 90, chemistry: 3 },
        'An acoustic set between the seven-layer dip and the Jell-O salad. Dr. Bhullar taps her foot. Tamara gets a raise. Not really. But almost.'),
       ch('Full volume. Rock is medicine.', { buzz: 5, mood: { tamara: -5, chase: 5 } },
        'The dental chairs vibrate in the next room. A hygienist starts a mosh pit of two. Tamara pretends she does not know you.'),
       ch('Play one song about teeth', { fans: 8, mood: { tamara: 5 } },
        'Chase improvises "Flossin\' in the Wind". The staff adopts it as the clinic anthem. It plays in the waiting room forever.')]),
    card('gk_cassette_only', 'weird', 'chase', 'Cassette Only', g({ era: GLS, minWeek: 8 }),
      "Chase wants the next release on cassette only. 'Digital is a fad.' Lenny points out nobody owns a tape deck. Chase points out " +
      "that he owns eleven. Tamara has done a cost analysis. It is laminated.",
      [ch('Cassettes. Commit.', { fund: -120, buzz: 7, mood: { chase: 8 } },
        'Two hundred cassettes in hand-cut sleeves. They sell out at shows to people who do not own tape decks. They buy them as art.'),
       ch('Both: tape and digital', { fund: -60, chemistry: 3 },
        'Fifty cassettes and a download code. The cassette has a hidden track of Chase saying "1985 forever" for forty seconds.'),
       ch('Digital only', { mood: { chase: -6 }, fans: 6 },
        'Chase records a protest song about it. The protest song is released digitally. He does not see the irony. Everyone else does.')]),
    card('gk_road_qe2', 'road', 'tamara', 'Highway 2, Safe and Slow', g({ era: GLS }),
      'The drive to Red Deer on Highway 2. Tamara drives exactly the limit, in the right lane, hands at ten and two. Everything passes ' +
      "you, including a combine. Chase is begging to drive. He does not have a licence. He has a 'spirit licence'.",
      [ch('Trust T-Bone', { chemistry: 3, burnout: 3 },
        'You arrive exactly on time, which is late for everyone else. The promoter is impressed. Nobody has ever been on time before.'),
       ch('Let Chase pick the music', { mood: { chase: 5, tamara: -3 } },
        'Chase plays one cassette the whole way. The same side. It is forty-five minutes of synthesizer. Tamara hums along against her will.'),
       ch('Stop at every rest stop', { burnout: -4, fund: -25 },
        'Four stops, four coffees, one giant fibreglass statue photo op. Chase poses like an album cover at every one.')]),
    card('gk_road_calgary', 'road', 'chase', 'Enemy Territory', g({ era: GLS, minFans: 40 }),
      "A gig in Calgary. Chase has been warned: an Edmonton band in Calgary is 'a political act'. The promoter asks you not to mention " +
      "hockey, the provincial capital, or which city has the better river. Chase is already mentioning all three.",
      [ch('Play nice, say nothing', { fans: 12, chemistry: 2 },
        'Not one word about Edmonton. Chase introduces the band as "from the North". The Calgary crowd lets it slide. Some even cheer.'),
       ch('Embrace the boos', { buzz: 8, mood: { chase: 6 } },
        'The boos turn into a chant. The chant turns into a sing-along. By the encore half of Calgary is secretly on your side.'),
       bet("Wear the other team's jersey", 'crowd-pleaser or traitor', 'Chase pulls on a Calgary jersey mid-set.', 0.45, 'buzz',
        { fans: 25, buzz: 6 }, 'The room explodes. Calgary loves you. Edmonton is disappointed but understands. Mostly.',
        { buzz: -5, mood: { chase: -6 } }, 'Kyle from the Courier runs a photo at home: TRAITOR. Chase has to apologize on The Freeze.')]),
    card('gk_road_lethbridge', 'road', 'lenny', 'Lethbridge Wind', g({ era: GLS, minFans: 30 }),
      'An outdoor gig in Lethbridge. The wind is ninety km/h, which the locals call "a breeze". The merch table has already blown into ' +
      'the coulee. Chase is thrilled: finally, the right wind.',
      [ch('Play with the wind', { buzz: 7, burnout: 5 },
        "Chase's mullet flies straight back for forty minutes. Lenny's cable pulls out twice. It is the most rock-and-roll photo you will ever own."),
       ch('Chase the merch into the coulee', { fund: 40, burnout: 6 },
        'You recover eighteen of twenty-four shirts from the coulee. A cow is wearing one. You leave it. It is a fan now.'),
       ch('Move the gig indoors', { chemistry: 3, mood: { chase: -4 } },
        'You play in the Legion instead. It is calm and warm. Chase opens the doors for "atmosphere". The wind comes back in.')]),
    card('gk_record_store', 'scene', 'lenny', 'Old Strathcona Records', g({ era: GLS }),
      "Lenny spends his afternoons in a used record store in Old Strathcona 'for research'. The clerk recognizes him. 'You're the guy " +
      "whose riff sounds like the other guy.' Lenny wants to know which other guy. There are several.",
      [ch('Buy the records', { fund: -50, skill: { lenny: 1 } },
        'He buys eight records and learns eight riffs he must never play. It is the most useful research he has ever done.'),
       ch('Leave a demo on consignment', { fans: 8, buzz: 3 },
        'The clerk puts your demo in the staff picks. It sits between two legends. Someone buys it by accident. They like it on purpose.'),
       ch('Sell your old CDs', { fund: 60, mood: { chase: -3 } },
        "You get $60. Chase's CD of 1985 hits is worth $4. He buys it back for $12. Tamara writes it down.")]),
    card('gk_amp_dies', 'money', 'lenny', 'The Amp Is Dead', g({ era: GLS, minWeek: 6 }),
      "Lenny's amp made a sound like a moose sneezing and died. Gus from the vacuum hospital says he can fix it. 'It's all just motors " +
      "and hope,' he says. The music store says $220.",
      [ch("Gus's Vacuum Hospital", { fund: -30, buzz: 3 },
        'Gus fixes it with a vacuum motor. The amp now has a faint whoosh. Lenny says it is "his tone now". It is patented. By Gus.'),
       ch('The music store', { fund: -200, mood: { lenny: 5 } },
        'Fixed properly. Lenny plays for three hours to test it. Every riff sounds famous. That was not the amp.'),
       ch('Borrow a practice amp', { mood: { lenny: -5 }, chemistry: 2 },
        "A ten-watt practice amp with a sticker of a unicorn. It is the only thing louder than Chase's hairspray. It will do.")]),
    card('gk_mall_signing', 'fame', 'chase', 'Signing at the Mega-Mall', g({ era: GLS, minFans: 20 }),
      'Chase booked an autograph signing at the Mega-Mall food court between the pretzel stand and the wave pool. He made a banner. ' +
      'He brought forty Sharpies. The mall-walkers arrive first. At 7 a.m.',
      [ch('Sign for the mall-walkers', { fans: 15, chemistry: 3 },
        'Eleven mall-walkers get autographs on their pedometers. One of them asks for a hug and a setlist. You will see her again.'),
       ch('Play an acoustic song', { buzz: 6, fans: 10 },
        'An unplugged song by the wave pool. The wave machine starts on the chorus. It is accidental. Chase says it is destiny.'),
       ch('Pack up at noon', { burnout: -4, mood: { chase: -4 } },
        'Chase leaves the banner up. It stays there for three weeks. Mall security uses it as a landmark.')]),
    card('gk_curfew', 'drama', 'tamara', 'Midnight Curfew', g({ era: GLS, minWeek: 10 }),
      "Tamara wants everyone home by midnight on work nights: 'Some of us clean teeth at 7 a.m.' Chase wants an after-party at the " +
      "plaza every show. 'Rock doesn't sleep.' Rock does sleep. Tamara has the van keys.",
      [ch('Midnight it is', { burnout: -6, mood: { tamara: 6, chase: -5 } },
        'Everyone is home by 12:01. Chase does an after-party alone in his apartment, with the lights off, "like a legend".'),
       ch('After-parties on weekends only', { chemistry: 4, mood: { tamara: 3, chase: 3 } },
        'A treaty. Tamara writes it up. Chase signs it with a signature that takes up the whole page. It is framed in Unit 4B.'),
       ch('Rock does not sleep', { buzz: 5, burnout: 6, mood: { tamara: -7 } },
        'The after-party goes until four. Tamara drives everyone home at four, silently. Nobody forgets that silence.')]),
    card('gk_time_capsule', 'weird', 'chase', 'The Time Capsule', g({ era: GLS, minWeek: 12 }),
      "Chase wants to bury a time capsule behind Westgate Plaza, to be opened in 1985. Lenny points out that 1985 was a while ago. " +
      "'Exactly,' says Chase. 'So we'll open it right away.'",
      [ch('Bury it, dig it up', { chemistry: 5, burnout: 3 },
        'You bury a setlist, a cassette and a lock of hair. You dig it up ten minutes later. Chase cries. It was a lot of hair.'),
       ch('Bury it for real, for 2085', { buzz: 4, mood: { chase: 4 } },
        'A letter to the future: "Dear 2085, please bring back leather pants." Mr. Petrenko is not told. It is under his dumpster.'),
       ch('Put it on the merch table', { fund: 50, mood: { chase: -3 } },
        'Time capsules for $10: a sticker, a guitar pick and a note from Chase. Nine sell. Chase is proud and furious at the same time.')]),
    card('gk_plaza_jingle', 'money', 'gk_landlord', 'A Jingle for Westgate', g({ era: GLS, minWeek: 6 }),
      "Mr. Petrenko will knock a month of 'goodwill' off if you write a jingle for Westgate Plaza. 'Something catchy. With the " +
      "vacuum shop in it. And the nails. And the discount store. And the parking.'",
      [ch('Write the jingle', { fund: 120, burnout: 4 },
        'Twenty-eight seconds, four businesses and one power chord. It plays on The Freeze at 3 a.m. Trinh gets two new customers.'),
       ch('Let Lenny write it', { fund: 120, mood: { lenny: 5 } },
        'It is catchy. It is very catchy. It is exactly as catchy as a famous jingle from 1989. Petrenko loves it. The lawyers love it too.'),
       ch('We are artists, sir', { mood: { chase: 5 }, chemistry: 2 },
        'Chase delivers a speech about artistic integrity. Petrenko nods through the whole thing and writes "maybe later" on his clipboard.')]),

    // ---- Local Heroes (L / LS) --------------------------------------------------------------------------------------------
    card('gk_l_freeze_rotation', 'fame', 'gk_dj', 'Heavy Rotation (Almost)', g({ era: LS, minFans: 250 }),
      "Rhonda wants to add your single to regular rotation on The Freeze. The catch: the transmitter tower is leased from Airwave " +
      "Dominion, which is owned by Chartbusters. A letter arrived. It has a scarf watermark.",
      [ch('Play it anyway', { buzz: 12, fans: 40, mood: { chase: 6 } },
        "Rhonda plays it every night at 2 a.m. The letter gets a reply on station letterhead: 'No.' Rex Glamour now knows your name."),
       ch('Play it quietly', { fans: 20, chemistry: 3 },
        'Rhonda plays it at a lower volume, "legally". Nobody can tell. Everyone can hear it. The letter people cannot prove anything.'),
       ch('Ask Tamara to read the lease', { mood: { tamara: 6 }, buzz: 6 },
        'Tamara finds a clause: campus stations may play "local content of any volume". She highlights it. Rhonda frames it.')]),
    card('gk_l_saddlery_pants', 'money', 'chase', 'Custom Leather', g({ era: LS, minFans: 300 }),
      "A saddlery in St. Albert makes custom leather. Mostly saddles. They have agreed to make Chase stage pants 'from the same hide as a " +
      "championship saddle'. The quote is $450. Chase has already been measured. Twice.",
      [ch('Buy the saddle pants ($450)', { fund: -450, buzz: 10, mood: { chase: 15 } },
        'They squeak like a saddle. They smell like a rodeo. Chase does the knee slide and goes eleven metres. A new record.'),
       ch('Resole the old ones', { fund: -120, chemistry: 3 },
        'The saddler patches the knees with rodeo leather. Chase says they now have "a history". They have a very long history.'),
       ch('No. The pants are fine.', { mood: { chase: -10 } },
        'Chase goes to the saddlery alone to "visit the leather". He comes back quiet. He has bought a leather belt. He is healing.')]),
    card('gk_l_retainer', 'money', 'lenny', 'A Lawyer on Retainer', g({ era: LS, minFans: 350 }),
      "Lenny wants to put a lawyer on retainer 'before something happens'. Something has been happening for years. The lawyer is " +
      "Tamara's cousin Marisol, who does real estate. She says a riff is 'basically a property line'.",
      [ch('Hire Marisol ($300)', { fund: -300, mood: { lenny: 10 }, chemistry: 3 },
        'Marisol surveys Lenny\'s riffs like a lot. She finds three that encroach. She draws a fence. Lenny sleeps through the night for the first time.'),
       ch('Tamara reads the law herself', { mood: { tamara: 5, lenny: 4 }, burnout: 6 },
        'Tamara borrows eleven law books from the library. By Friday she can say "tort" confidently. The voicemails get fewer. Coincidence.'),
       ch('Fight fire with originality', { skill: { lenny: 2 }, mood: { lenny: -6 } },
        'Lenny is banned from listening to the radio for a month. He writes riffs out of pure silence. They sound like wind. Wind cannot sue.')]),
    card('gk_l_airband', 'fame', 'chase', 'The Air-Band Championship', g({ era: L, minFans: 260 }),
      "The Legion in Stony Plain hosts the provincial air-band championship. Chase wants the band to enter, miming its own songs. " +
      "'It's performance art.' The prize is $300 and a trophy shaped like a cardboard guitar.",
      [bet('Enter as yourselves', 'mime your own songs', 'You take the stage with unplugged instruments.', 0.5, 'chemistry',
        { fund: 300, buzz: 10 }, 'You win. The judges say you "really look like you could play". Chase thanks the academy.',
        { buzz: 4, mood: { chase: -6 } }, 'You lose to a Chartbusters tribute act. They mimed the ballad. It is also how Chartbusters play it.'),
       ch('Play it real, in the parking lot', { fans: 40, buzz: 6 },
        'A real show in the parking lot while the air bands mime inside. Half the air bands come out to watch. The judges come too.'),
       ch('Judge it instead', { chemistry: 4, burnout: -4 },
        'You sit on the judging panel. Chase gives everyone a ten. Tamara gives everyone a precise and fair score. It evens out.')]),
    card('gk_l_buckle_boot', 'scene', 'chase', 'Tailgate Neighbours', g({ era: LS, minFans: 400 }),
      'A festival in Red Deer puts you in the tent next to Buckle & Boot. Their truck-costume mascot has parked in your stage spot. ' +
      "He will not move. 'Brand guidelines,' says the truck.",
      [ch('Share the stage with the truck', { buzz: 8, fans: 30 },
        'The mascot stands at the side of the stage for your set and honks on the downbeats. The crowd loves it. The truck is conflicted.'),
       ch('Push the truck', { buzz: 10, mood: { chase: 6 }, chemistry: -3 },
        'Chase and Lenny push the mascot six feet to the left. He keeps honking the whole way. A video goes around. Two bands now hate you.'),
       ch('Play the other tent', { chemistry: 4, burnout: 4 },
        'You move everything to the craft-beer tent. It is smaller. It is louder. The mascot visits, alone, during the encore.')],
      { cameo: true }),
    card('gk_l_hail_damage', 'scene', 'lenny', 'The Band from Saskatoon', g({ era: LS, minFans: 450 }),
      'A double bill in Lloydminster with Hail Damage, a metal band from Saskatoon. Their singer has a cape. Their bassist has not said ' +
      "a word in four hours. Their drummer asks yours about double-kick pedals. Lenny is intimidated.",
      [ch('Swap drummers for a song', { buzz: 8, drumSkill: 1 },
        'The drummers trade places: ours plays their blast beat, theirs plays our backbeat. Nobody notices for a full verse. Then everybody notices. It rules.'),
       ch('Split the green room pizza', { chemistry: 5, fans: 20 },
        'Their singer blesses the pizza in French. Chase blesses it in 1985. The bassist nods at Lenny once. Lenny will talk about it for years.'),
       ch('Outplay them', { buzz: 10, burnout: 6 },
        'You play the set of your lives. So do they. Lloydminster has never been this loud. Both provinces can hear it, technically.')],
      { cameo: true }),
    card('gk_l_frost_heave', 'scene', 'tamara', 'The Van in Our Lot', g({ era: LS, minFans: 380 }),
      "A punk band from Regina called Frost Heave broke down in the Westgate parking lot. Their bassist lives in the van. She has " +
      "asked, very politely, for permission to park 'for a few days'. Darrell with the clipboard is circling.",
      [ch('Let her park', { chemistry: 4, fans: 20 },
        "Their bassist fixes your van's heater in exchange. Their singer yells at Mr. Petrenko about parking bylaws. He loves it."),
       ch('Book them an opening slot', { buzz: 8, fans: 25 },
        'They open for you. Their guitarist plays two chords, all night. The crowd goes feral. Lenny asks how. He will never know.'),
       ch('Call a tow truck (for them)', { fund: -60, mood: { tamara: 4 } },
        'Tamara pays for a tow to the shop on 99th Street. They send a thank-you postcard from Regina. It is about city council.')],
      { cameo: true }),
    card('gk_l_anthem', 'fame', 'chase', 'The Anthem at the Rink', g({ era: LS, minFans: 500 }),
      "The Edmonton Oilcans want a local singer for the anthem. Chase has been asked. He wants to wear the leather pants and do " +
      "one small knee slide on the red line. 'Tasteful,' he says.",
      [ch('Sing it straight', { fans: 60, buzz: 8 },
        'Chase sings it perfectly, standing still, hair only slightly enormous. Eighteen thousand people applaud. Mom cries in section 104.'),
       bet('One tasteful knee slide', 'legend or penalty', 'Chase finishes the last note and drops to his knees.', 0.5, 'buzz',
        { fans: 80, buzz: 14 }, 'He slides from the red line to the blue line. The crowd roars. The team wins. Superstition begins.',
        { buzz: 5, mood: { chase: -8 } }, 'He slides into the Zamboni gate. The team loses. The city blames the pants.'),
       ch('Lenny plays it on guitar', { buzz: 10, mood: { lenny: 8 } },
        'A guitar anthem, arena style. It sounds like the anthem and only the anthem. No lawyer calls. Lenny weeps in the tunnel.')]),
    card('gk_l_dental_convention', 'money', 'tamara', 'The Dental Convention', g({ era: LS, minFans: 300 }),
      "The Western Dental Hygienists' Convention in Calgary needs a closing-night band. Tamara got you the gig. The dress code is " +
      "'business casual'. Chase owns no business and nothing casual.",
      [ch('Take it, dress up', { fund: 350, mood: { chase: -6 } },
        'Chase wears a blazer over the leather. Six hundred hygienists dance to rock. Tamara is carried around the room on a dental chair.'),
       ch('Take it, dress as you are', { fund: 300, buzz: 6 },
        'Leather pants at a dental convention. The keynote speaker joins you for a song about plaque. It goes weirdly viral.'),
       ch('Tamara presents a paper instead', { mood: { tamara: 10 }, chemistry: 4 },
        'Tamara gives a talk titled "Flossing on Tour: A Case Study". The band is the case study. The slides are unflattering. Standing ovation.')]),
    card('gk_l_mullets', 'fame', 'chase', 'The Mullet Army', g({ era: LS, minFans: 600 }),
      "Fans have started showing up with mullets. Real ones and wigs. Kyle from the Courier calls it 'the Mullet Army'. Chase is " +
      "overwhelmed. Barbers in St. Albert report a surge. Tamara reports a hairspray shortage.",
      [ch('Mullet night at every show', { buzz: 12, fans: 50 },
        'Free entry with a mullet. The line goes around the block. It is business in the front, a sold-out show in the back.'),
       ch('Chase cuts his hair for charity', { fans: 30, mood: { chase: -12 }, buzz: 10 },
        'He raises $4,000 for the children\'s hospital and cries on camera. It grows back in a month. It always does.'),
       ch('Stay humble', { chemistry: 4, mood: { chase: -4 } },
        'Tamara convinces Chase not to address the army directly. He writes them a letter. It is eleven pages. It is very humble, for Chase.')]),
    card('gk_l_similarity_app', 'drama', 'lenny', 'The App Says 94%', g({ era: LS, minFans: 300 }),
      'Someone ran your new single through a song-matching app. It says 94% similar to a famous riff. Lenny says the other 6% is ' +
      "'the soul'. The app does not measure soul. The lawyers do not care about soul.",
      [ch('Rewrite the riff', { skill: { lenny: 2 }, mood: { lenny: -8 } },
        'Lenny rewrites it until the app says 12%. It sounds like a completely new song. Lenny grieves the old one for a week.'),
       ch('Release it anyway', { buzz: 10, fans: 30, mood: { lenny: 5 } },
        'It charts locally. A letter arrives. It charts higher. A second letter arrives. Tamara starts a binder called LETTERS (RIFF).'),
       ch('Run the app on Chartbusters', { buzz: 12, mood: { chase: 6 } },
        "Chase runs every Chartbusters single through the app. They are 99% similar to each other. The Courier prints the chart. Rex is not amused.")]),
    card('gk_l_work_camp', 'money', 'lenny', 'The Work Camp Gig', g({ era: L, minFans: 280 }),
      "A work camp north of Fort McMurray wants a rock band for a Saturday night. Five hundred workers, a cafeteria stage, $400 and a " +
      'bunk. It is an eight-hour drive. Tamara has already checked the tires.',
      [ch('Go north', { fund: 400, burnout: 12, fans: 50 },
        'Five hundred people in coveralls singing your chorus in a cafeteria. The camp cook makes you a cake. It is the best gig of the year.'),
       ch('Send a video instead', { fund: 100, buzz: 5 },
        'You film a special set in Unit 4B, with shout-outs to the night shift. The camp plays it at every shift change for a month.'),
       ch('Too far', { burnout: -5, mood: { lenny: -3 } },
        'You stay home. Lenny had relatives at the camp. They send a photo of the empty cafeteria stage, captioned "nice".')]),
    card('gk_l_rex_scarf', 'scene', 'cb_rex', 'A Scarf in the Mail', g({ era: LS, minFans: 350 }),
      "A package from Vancouver: a silk scarf and a card. 'Heard you on the campus radio. Cute. Remember whose airwaves those are. " +
      "Stay warm, kid. — Rex Glamour.' It is thirty degrees out. Chase is already wearing the scarf.",
      [ch('Wear it on stage, ironically', { buzz: 10, mood: { chase: 6 } },
        'Chase wears the scarf and then throws it into the crowd. Gloria from the Mall-Walkers catches it. Rex hears about it. He is furious.'),
       ch('Send back a floss dispenser', { buzz: 8, mood: { tamara: 6 } },
        "Tamara mails Rex a floss dispenser and a pamphlet about gum disease. Rex's publicist issues a statement: 'Rex's gums are fine.'"),
       ch('Frame it', { chemistry: 3, mood: { lenny: 4 } },
        'The scarf goes on the wall of Unit 4B, next to the parking tickets. It is a trophy. It is a warning. It is both.')]),
    card('gk_l_pothole', 'weird', 'chase', 'Pothole Season', g({ era: LS, weekOfYear: [18, 22] }),
      'Spring. Edmonton has two seasons: winter and construction. The pothole outside Westgate Plaza has become a small lake. A duck ' +
      "lives in it. Chase has named it 'Lake 1985'. The city has put up one orange cone.",
      [ch('Play a pothole benefit', { fans: 30, buzz: 8 },
        'A concert for the pothole. People donate to fill it. The duck attends. The city fills it the next day, out of embarrassment.'),
       ch('Write a song about it', { buzz: 6, mood: { chase: 5 } },
        '"Lake 1985" is a seven-minute power ballad about a pothole. It is the best thing Chase has written. It is about a pothole.'),
       ch('Drive around it', { burnout: 4, chemistry: 3 },
        'Tamara drives around it for three weeks with perfect precision. The duck watches you go. It does not wave.')]),

    // ---- Signed (S, SW) --------------------------------------------------------------------------------------------------
    card('gk_s_video', 'fame', 'chase', 'The Music Video', g({ era: S }),
      "The label budget covers a real music video. Chase wants 1985: a wind machine, a rented sports hatchback, a smoke-filled " +
      'warehouse and a slow-motion knee slide through a wall of sparks. Tamara wants a helmet on him.',
      [ch('All of it', { fund: -900, buzz: 18, fans: 250, mood: { chase: 12 } },
        'Sparks, smoke, a hatchback, a mullet in a hurricane. It is the most 1985 thing made since 1985. It plays in bars across the country.'),
       ch('Half the sparks, all the helmet', { fund: -500, buzz: 12, mood: { tamara: 6 } },
        'Chase slides through sparks in a helmet painted to look like his hair. It somehow works. The helmet becomes merch.'),
       ch('Film it in Unit 4B', { fund: -150, buzz: 8, chemistry: 5 },
        'The whole plaza is in it. Trinh does the nails, Gus does the wind, Petrenko plays "man with clipboard". It is beloved.')]),
    card('gk_s_pyro_slide', 'drama', 'chase', 'The Pyro Knee Slide', g({ era: S, minFans: 2000 }),
      "Chase wants pyro for the knee slide: two flame columns at the end of the stage, timed to his arrival. The venue's fire marshal " +
      "has asked for 'a plan'. Chase's plan is 'confidence'.",
      [ch('Hire a real pyro tech', { fund: -800, buzz: 14, fans: 200 },
        "The flames go up exactly as Chase lands. It is perfect. It is on the news. Chase refuses to wash the smell of it off the pants."),
       bet('Confidence', 'a legend or a fire extinguisher', 'Chase starts his run from the drum riser.', 0.4, 'buzz',
        { buzz: 18, fans: 300 }, 'He lands between the flames on the downbeat. Nobody knows how. He does not know how.',
        { buzz: 6, burnout: 10, mood: { chase: -10 } }, 'He slides a metre short. The flames go up anyway. Tamara extinguishes his hair. It grows back.'),
       ch('No pyro. Just the slide.', { chemistry: 5, mood: { chase: -8 } },
        'The slide alone is still the best thing in the show. Chase says the flames were "in his heart". Tamara says that is where they stay.')],
      { seat: ['drums', 'bass', 'lead'] }),
    card('gk_s_royalty_audit', 'money', 'tamara', 'Tamara Audits the Label', g({ era: S, minWeek: 30 }),
      'Tamara has read the royalty statement. All forty pages. With a ruler. She has found a column that does not add up, a charge ' +
      "for 'catering (scarves)', and a line item called 'Rex'. She wants a meeting.",
      [ch('Send Tamara to the meeting', { fund: 900, mood: { tamara: 12 } },
        "Tamara walks into the label office with a binder. She walks out with a cheque and an apology letter. The label's accountant resigns."),
       ch('Let it go', { chemistry: 3, mood: { tamara: -10 } },
        'Tamara lets it go. She does not let it go. She sends one polite email a week for a year. They pay eventually, to make it stop.'),
       ch('Go public', { buzz: 12, fund: 300, fans: 100 },
        'Kyle from the Courier runs the story: "Hygienist Finds Scarf Charge on Rock Band\'s Bill". The label pays. Rex issues a denial.')]),
    card('gk_s_signature_guitar', 'drama', 'lenny', 'The Lenny Szabo Model', g({ era: S, minFans: 3000 }),
      "A guitar maker wants a Lenny Szabo signature model. Lenny is overjoyed. Then he sees the headstock design. It looks exactly like " +
      "a famous headstock. The guitar maker says 'it's an homage'. Tamara says 'it's evidence'.",
      [ch('Redesign the headstock', { fund: 600, mood: { lenny: 10 } },
        'Lenny designs his own: shaped like the province of Alberta. It is distinct. It is legal. It sells out in Leduc in a day.'),
       ch('Sign it as is', { fund: 1000, mood: { lenny: 8, tamara: -8 } },
        'The guitar ships. The letter ships a week later. Tamara adds a new tab to the binder: LETTERS (HEADSTOCK).'),
       ch('Turn it down', { skill: { lenny: 2 }, chemistry: 4 },
        '"I will have a signature guitar when I have a signature sound," Lenny says. The band applauds. Lenny practises all night.')]),
    card('gk_s_morning_tv', 'fame', 'gk_reporter', 'Good Morning Alberta', g({ era: S }),
      'Good Morning Alberta wants the band live at 6:40 a.m. on the patio set, between the weather and a segment about ' +
      'pickling. It is minus 25. Chase is already in the leather. He slept in it.',
      [ch('Play the single', { fans: 200, buzz: 10 },
        'You play at 6:40 in a cloud of your own breath. The pickling lady dances. The clip does numbers. Mom records it on three devices.'),
       ch('Chase does the weather', { buzz: 14, mood: { chase: 10 } },
        'Chase reads the forecast like a power ballad. The weather lady lets him finish. Viewers request him for the long weekend forecast.'),
       ch('Tamara plugs flossing', { fans: 120, mood: { tamara: 8 } },
        'Tamara uses her ninety seconds on gum health. The host is moved. The dental association sends the band a fruit basket.')]),
    card('gk_s_goal_song', 'fame', 'chase', 'The Goal Song', g({ era: S, minFans: 4000 }),
      "The Oilcans want a goal song. They want yours. Every goal, eighteen thousand people will hear the chorus of 'Leather Pants at " +
      "Forty Below'. Lenny is worried about the riff. The riff is the part they want.",
      [ch('Yes. Goal song.', { fund: 800, fans: 400, buzz: 12 },
        'Every goal, the chorus. The team goes on a streak. Chase attends every home game in the leather pants. He is now a mascot.'),
       ch('Only if Lenny writes a new riff', { fund: 500, skill: { lenny: 2 }, mood: { lenny: 6 } },
        'Lenny writes a brand-new riff for it. Nobody has heard it before. Not even the lawyers. It becomes the city\'s riff.'),
       ch('Keep it for the fans', { chemistry: 5, buzz: 6 },
        'You say no. The team picks a Chartbusters song. They lose eleven straight. The city blames Rex. Chase says nothing. Loudly.')]),
    card('gk_s_rider', 'money', 'tamara', "Tamara's Rider", g({ era: S, minFans: 1200 }),
      "The band has a rider now. Chase wants hairspray, a mirror and a fog machine. Lenny wants a lawyer's phone number, just in case. " +
      "Tamara wants fruit, water, floss and a sign-up sheet for bedtime.",
      [ch("Tamara's rider, as written", { burnout: -8, chemistry: 4 },
        'Every green room has floss and a bedtime chart. Promoters love you. You are the easiest band in Canada. Chase grieves privately.'),
       ch("Chase's rider", { fund: -400, buzz: 8, mood: { chase: 10 } },
        'Every green room has a full-length mirror and four cans of hairspray. One promoter adds a wind machine "just in case".'),
       ch('Split the difference', { mood: { all: 3 }, fund: -150 },
        'Fruit, floss, one mirror, one fog machine. The phone number is a real lawyer. Lenny calls her twice, just to say hi.')]),
    card('gk_s_junket', 'fame', 'lenny', 'Press Day', g({ era: S }),
      'A press junket in a hotel conference room: twelve interviews in six hours. Every interviewer asks Lenny about the lawsuit. Every ' +
      "interviewer hums the riff while they ask. Lenny has run out of ways to say 'no comment'.",
      [ch('Lenny tells the whole story', { buzz: 12, mood: { lenny: 6 } },
        'Lenny tells the truth: he never meant to, it just comes out that way. Twelve outlets print it. The public is on his side.'),
       ch('Chase answers every question', { buzz: 10, mood: { chase: 8, lenny: -5 } },
        'Every answer is about 1985. By interview eight nobody asks about the lawsuit. They ask about the pants. Mission accomplished.'),
       ch('Tamara hands out a fact sheet', { fans: 150, chemistry: 4 },
        "A one-page fact sheet, colour-coded, with 'NO COMMENT' in bold. Journalists love it. Two of them ask Tamara to do their taxes.")]),
    card('gk_s_part_time', 'drama', 'tamara', 'Part-Time Hygienist', g({ era: S, minWeek: 40 }),
      "Tamara has been doing cleanings at 7 a.m. and gigs at 11 p.m. for years. Dr. Bhullar offers her part-time: Tuesdays and " +
      "Thursdays. 'But the patients will ask for you.' Tamara has never not been needed.",
      [ch('Go part-time', { burnout: -12, mood: { tamara: 10 } },
        'Tamara sleeps eight hours for the first time since the band started. She is terrifyingly well-rested. The band is now on schedule.'),
       ch('Stay full-time', { mood: { tamara: -6 }, fund: 300 },
        'She keeps both lives. She falls asleep once, in the van, sitting upright, both hands on the wheel. The van was parked. Everyone is scared.'),
       ch('The band pays her a salary', { fund: -600, chemistry: 6, mood: { tamara: 12 } },
        'Tamara becomes the band\'s full-time manager, accountant and bassist. She makes a spreadsheet for it. The spreadsheet has a spreadsheet.')]),
    card('gk_s_leaving_4b', 'drama', 'chase', 'Leaving Unit 4B?', g({ era: S, minWeek: 48 }),
      "A proper rehearsal studio is available downtown. Chase will not leave Unit 4B. 'It's 1985 in here. It's 2020-something out there. " +
      "I have seen it.' Mr. Petrenko has a real business interested in the unit: a vape shop.",
      [ch('Keep Unit 4B forever', { fund: -500, chemistry: 6, mood: { chase: 12 } },
        'You buy out the vape shop\'s interest. Unit 4B is yours, forever. Chase kisses the till counter. Petrenko sheds one tear.'),
       ch('Move, but take the till', { mood: { chase: -6 }, fund: -200, buzz: 6 },
        'The drum kit moves downtown, onto the old till counter. Chase says 1985 lives wherever the counter goes. He may be right.'),
       ch('Rehearse in both', { fund: -400, burnout: 6, chemistry: 4 },
        'Weeknights downtown, weekends at Westgate. Trinh and Gus throw a "welcome back" party every Saturday. It never gets old.')]),
    card('gk_s_radio_owned', 'scene', 'cb_rex', 'Every Station, One Song', g({ era: S, minFans: 2500 }),
      'Your single is climbing. Then it vanishes from every Airwave Dominion station at once. The playlists now go: ballad, ad, ballad, ' +
      "weather, ballad. Rex sends a voice memo: 'Radio's a family business, kid.'",
      [ch('Go around the radio', { fans: 300, buzz: 12 },
        'Campus stations, a hockey broadcast, the Mega-Mall PA system. The single climbs anyway, with no help from the dial.'),
       ch('Buy an ad on their station', { fund: -700, fans: 200, buzz: 8 },
        'You buy thirty seconds on their own network. They have to play it. The ad is just the chorus. Rex hears it in his car. He changes the channel. It is the same network.'),
       ch('Rex, we need to talk', { chemistry: 4, buzz: 6 },
        'Rex agrees to one spin a week "for the kids". It airs at 3:14 a.m. on Sundays. You all stay up. It is worth it.')]),
    card('gk_s_fan_tattoo', 'fame', 'gk_reporter', 'The Tattoo', g({ era: S, minFans: 1500 }),
      "Kyle from the Courier found a fan with a tattoo of Chase's mullet on his calf. Business in the front of the calf, party in the " +
      'back. He wants a photo with the real mullet. Kyle wants the photo for the front page.',
      [ch('Photo with the real mullet', { fans: 150, buzz: 10, mood: { chase: 8 } },
        'Chase and the calf, side by side. The front page runs it. Three more people get the tattoo that week. A parlour starts a punch card.'),
       ch('Sign the calf', { buzz: 12, mood: { chase: 5 } },
        'Chase signs next to the mullet. The fan gets it tattooed over. Now the calf has a signature. Chase has never felt more immortal.'),
       ch('Tamara checks it for infection', { fans: 100, mood: { tamara: 6 } },
        'Tamara inspects the tattoo and recommends a better ointment. The fan is overwhelmed with care. He names his dog T-Bone.')]),
    card('gk_s_hot_tub', 'weird', 'chase', 'The Hotel Hot Tub', g({ era: S }),
      "The hotel has a hot tub on the roof, open until ten. It is eleven-thirty. Chase is in it, in the leather pants, with a boom box. " +
      "Security is here. Tamara is here. Security is deferring to Tamara.",
      [ch('Tamara negotiates', { chemistry: 4, burnout: -5 },
        'Tamara gets you fifteen minutes. The whole band sits in the hot tub under the stars in silence. It is the best quarter-hour of the tour.'),
       ch('Pay the fine', { fund: -250, buzz: 6, mood: { chase: 6 } },
        'The fine includes "leather in pool water" as a line item. Tamara keeps the receipt. It goes in the shoebox of legends.'),
       ch('Everyone out, now', { mood: { chase: -6 }, burnout: -4 },
        'Chase exits the hot tub like a man leaving his homeland. The pants take two days to dry. They are stiff now. He calls it "armour".')]),
    card('gk_s_farewell_tour', 'scene', 'cb_rex', "Chartbusters' Farewell Tour", g({ era: S, minFans: 3000 }),
      "Chartbusters announce their fourth farewell tour. Rex calls personally: they want {band} to open three dates in the prairies. " +
      "'Exposure, kid. Our fans are your fans. Well. Our fans' kids.'",
      [ch('Open for them', { fans: 350, buzz: 8, mood: { chase: -6 } },
        'Three nights in arenas. Their fans' + "'" + ' kids are real. They stay for your set, then leave during the ballad. Rex does not notice.'),
       ch('Only if you close one night', { buzz: 14, fans: 200 },
        'Rex agrees to one night in Red Deer. You close. The ballad opens. Rex wears a scarf that says OPENER on it. It is a gift from Chase.'),
       ch('No thanks, Rex', { chemistry: 5, mood: { chase: 8 } },
        'Chase declines on a payphone replica, just for the drama. Rex hangs up first. The feud is on the front page of the Courier.')]),

    // ---- Label cards (flagEquals label) ----------------------------------------------------------------------------------
    card('gk_label_gopherwood_bbq', 'scene', 'tamara', 'The Feed Store Barbecue', g({ era: S, flagEquals: { label: 'gopherwood' } }),
      "Gopherwood Records' annual label barbecue is behind the feed store in Humboldt. Every band on the label is there. The label van " +
      "has a gopher on it. Chase has brought a cassette of the label's own sampler, to be sure.",
      [ch('Play the barbecue', { fans: 120, chemistry: 5 },
        'You play on a hay wagon. The label owner flips burgers in time. A punk band and a polka trio join you for the last song.'),
       ch('Bring the plaza', { fund: -150, buzz: 10 },
        'Trinh, Gus and Petrenko carpool to Humboldt. Trinh does nails at the barbecue. Gus fixes the feed store vacuum. The label is thrilled.'),
       ch('Talk shop with the owner', { mood: { tamara: 8 }, fund: 200 },
        'Tamara and the label owner discuss distribution for three hours over a picnic table. You leave with a better deal and a pie.')]),
    card('gk_label_gopherwood_van', 'money', 'lenny', 'The Label Van', g({ era: S, flagEquals: { label: 'gopherwood' } }),
      "Gopherwood lends its bands the label van for tours. It has a gopher painted on it, 180,000 km on it and a tape deck. " +
      "Chase has seen the tape deck. Tamara has seen the tires.",
      [ch('Borrow it', { fund: 250, mood: { chase: 8, tamara: -4 } },
        'Chase plays cassettes the whole tour. The gopher gets you waved through a grain-town parade by mistake. You play the parade.'),
       ch('Our van is fine', { chemistry: 3, mood: { tamara: 5 } },
        'Tamara thanks them politely and keeps her own van, her own tires and her own mirrors. The gopher waves goodbye.'),
       ch('Borrow it, new tires first', { fund: -300, mood: { all: 4 } },
        'Four new tires on the label van. The owner is so moved he names a gopher on the next sampler cover after Tamara.')]),
    card('gk_label_monolith_hair', 'drama', 'chase', 'Notes on the Hair', g({ era: S, flagEquals: { label: 'monolith' } }),
      "Monolith's A&R guy has notes. 'Love the energy. Love the pants. Love the lawsuits, honestly. The mullet, though. Focus groups say " +
      "it reads as 1985.' Chase stands up. 'It IS 1985.'",
      [ch('The mullet stays', { buzz: 12, mood: { chase: 15 }, fund: -400 },
        'Monolith trims the promo budget. Chase trims nothing. The mullet has its own publicist now, unpaid. It is Chase.'),
       ch('A modern mullet', { fans: 250, mood: { chase: -10 } },
        'A stylist gives Chase a "contemporary mullet". It is the same mullet, with product. Chase is quietly relieved. He will not admit it.'),
       ch('Let the focus group meet Chase', { buzz: 14, fans: 150 },
        'Chase meets the focus group in person. He explains 1985. By the end, the focus group has mullets. Monolith changes its notes.')]),
    card('gk_label_monolith_lawyers', 'money', 'lenny', 'The Legal Department', g({ era: S, flagEquals: { label: 'monolith' } }),
      "Monolith's legal department has 60 lawyers. One of them has been assigned to Lenny full-time. She has a desk in the label " +
      "office with a sign: LENNY. She wants to hear every riff before anyone else does.",
      [ch('Every riff goes through her', { skill: { lenny: 2 }, mood: { lenny: -6 } },
        'She hears 400 riffs in a month and clears eleven. The eleven are the best riffs Lenny has ever written. He sends her flowers.'),
       ch('Some riffs go around her', { buzz: 10, fund: -600 },
        'The best riff goes around her. It is also the most famous-sounding. Monolith pays the settlement. It comes out of the advance.'),
       ch('Lenny and the lawyer write together', { fans: 200, chemistry: 5 },
        'Turns out she played guitar in law school. Their co-written riff is original, catchy and legally bulletproof. They become friends.')]),
    card('gk_label_diy_tapes', 'money', 'chase', 'The Cassette Mail-Out', g({ era: S, flagEquals: { label: 'diy' } }),
      "DIY means the band mails its own records. Chase insists on cassettes, hand-labelled. Tamara has a mailer list, a postage " +
      'scale and a label maker. Lenny has a hockey bag full of blank tapes.',
      [ch('Cassettes and zines, by hand', { fund: 400, fans: 150, burnout: 10 },
        'Four hundred tapes, each labelled by Chase in silver pen. Each envelope smells slightly of hairspray. Collectors notice.'),
       ch('Tamara builds a system', { fund: 600, chemistry: 4 },
        'An assembly line on the till counter. Tamara times each step. You mail 700 in a week. Canada Post sends a thank-you card.'),
       ch('Crowdfund a pressing', { fund: 800, buzz: 8, fans: 100 },
        'The crowdfund hits its goal in a day, mostly thanks to the Mall-Walkers. Gloria pledged at the "hug from Chase" tier.')]),
    card('gk_label_diy_warehouse', 'money', 'tamara', 'Unit 4B, Warehouse', g({ era: S, flagEquals: { label: 'diy' } }),
      "DIY distribution means boxes. Unit 4B is now half rehearsal space, half warehouse. The kit is still where the till was. The boxes " +
      "are where everything else was. Mr. Petrenko wants to know if you need a forklift permit.",
      [ch('Rent the unit next door', { fund: -500, chemistry: 4, burnout: -6 },
        'Unit 4C becomes the warehouse. Chase calls it "the vault". It is a former dollar store. There are still dollar-store signs.'),
       ch('Stack it to the ceiling', { burnout: 8, fund: 300 },
        'A box fort. Chase rehearses on top of it. Nobody falls. Everyone almost falls. The records ship on time.'),
       ch('Gus stores some in the vacuum shop', { fund: 200, mood: { all: 3 } },
        'Gus clears a shelf. Your records now ship with a faint smell of vacuum bags. A reviewer calls it "industrial". It is a vacuum bag.')]),

    // ---- Repeatables (once:false + cooldown) --------------------------------------------------------------------------
    card('gk_rep_lawyer', 'drama', 'gk_lawyer', 'A Courtesy Call', g({ era: GLS, minWeek: 6 }),
      "Bryce Pruitt, Esq., calls the band line. 'Just a courtesy call about the riff. Not that riff. The new riff. It is, and I mean " +
      "this kindly, extremely familiar.' He hums it. He hums it well.",
      [ch('Change the riff (again)', { skill: { lenny: 1 }, mood: { lenny: -4 } },
        'Lenny changes it. Bryce calls back to say the new version is "much better, legally and musically". He has become a fan.'),
       ch("Put Tamara on the phone", { mood: { tamara: 4 }, chemistry: 2 },
        'Tamara asks for everything in writing. Bryce, who has never been asked for anything in writing, promises to "circle back".'),
       ch('Let it ring in E', { buzz: 3, mood: { lenny: 4 } },
        'The phone rings through the whole rehearsal. It is in tune. You play along. It is the tightest the band has ever sounded.')],
      { once: false, cooldown: 10 }),
    card('gk_rep_floss_check', 'drama', 'tamara', 'Floss Check', g({ era: GLS, minWeek: 3 }),
      "Random floss check. Tamara is at the door of the rehearsal room with a flashlight and a clipboard. Chase says he flossed. " +
      "Tamara says 'show me'. Chase has spinach in his teeth from Tuesday.",
      [ch('Everyone passes', { chemistry: 3, mood: { tamara: 5 } },
        'Everyone floss-checks clean. Tamara gives out gold stars. Chase puts his on his mic stand. It stays there for a year.'),
       ch('Chase fails, publicly', { mood: { chase: -5 }, buzz: 3 },
        'Chase flosses on the loading dock while the band watches. A passing mall-walker applauds. He takes a bow.'),
       ch('Skip it this week', { mood: { tamara: -5 }, burnout: -3 },
        'Tamara lets it go. She is visibly unhappy about letting it go. The next check is twice as thorough.')],
      { once: false, cooldown: 8 }),
    card('gk_rep_payphone', 'weird', 'chase', 'Chase Calls Collect', g({ era: GLS, minWeek: 5 }),
      "Chase is calling collect from a payphone somewhere, which should be impossible. He will not say where he found a payphone. " +
      "'The important thing is I found one.' He wants a ride.",
      [ch('Accept the charges', { fund: -15, mood: { chase: 5 } },
        'Fifteen dollars for a four-minute call about a payphone. Tamara picks him up at a bowling alley in Beaumont. It had the last payphone.'),
       ch('Tell him to text', { mood: { chase: -4 }, chemistry: 2 },
        'He texts. In capitals. "I AM AT THE BOWLING ALLEY. THE PAYPHONE IS BEAUTIFUL." Tamara picks him up anyway.'),
       ch('Go find the payphone', { buzz: 4, burnout: 3 },
        'The whole band drives to Beaumont to see the payphone. You take a band photo with it. It becomes the album inner sleeve.')],
      { once: false, cooldown: 10 }),
    card('gk_rep_vacuum', 'weird', 'gk_vacuum', 'Vacuum Test Day', g({ era: GLS }),
      "Gus has twelve vacuums to test before Friday. They are all at full volume. They are all in different keys. He says he can " +
      "do them in a row 'in a scale, if that helps'. Lenny says it does, weirdly.",
      [ch('Jam with the vacuums', { buzz: 5, skill: { lenny: 1 } },
        'Twelve vacuums, one scale, one riff. It is avant-garde. Rhonda plays the recording at 3 a.m. Gus gets two calls.'),
       ch('Take the night off', { burnout: -5 },
        'You take the night off. The vacuums play on without you. Somewhere, a canister vacuum finds its purpose.'),
       ch('Help Gus test them', { chemistry: 3, fund: 40 },
        'He pays you $40 to push vacuums around the shop. Chase does it in slow motion. Gus calls it "the best test day ever".')],
      { once: false, cooldown: 8 }),
    card('gk_rep_nails', 'scene', 'gk_nails', 'Quiet Hours', g({ era: GLS }),
      "Trinh from Nails by Trinh has a bridal party booked all evening. Eight bridesmaids, one bride, one very nervous mother. She asks " +
      "for quiet. She says it with the look she uses on cuticles.",
      [ch('Unplugged rehearsal', { skill: { lenny: 1 }, chemistry: 2 },
        'An acoustic run-through. The bridesmaids ask for requests through the wall. You play three. The bride books you for the reception.'),
       ch('Play them a song first', { fans: 8, buzz: 3 },
        'One song for the bridal party, then silence. The mother of the bride cries. Trinh gives the band a group discount on cuticles.'),
       ch('Rehearse at full volume', { mood: { chase: 3 }, buzz: -2 },
        'Trinh cuts the power to the shared outlet. You find out there is a shared outlet. The feud with the salon lasts a week.')],
      { once: false, cooldown: 10 }),
    card('gk_rep_hairspray', 'weird', 'chase', 'Hairspray Shortage', g({ era: GLS }),
      "The drugstore in the plaza is out of Chase's hairspray, the one in the gold can that was discontinued in 1991. He has " +
      "half a can left. He is rationing it. He has made a chart. Tamara is proud of the chart and nothing else.",
      [ch('Road trip for hairspray', { burnout: 3, mood: { chase: 5 } },
        'Four drugstores and a beauty-supply shop in Leduc. The last one has a dusty case of it. Chase buys all of it. And the case.'),
       ch('Try a new brand', { buzz: 3, mood: { chase: -3 } },
        'The new brand holds for exactly one song. By the encore the mullet has gone flat. The crowd thinks it is a costume change.'),
       ch('Rehearse with flat hair', { skill: { chase: 1 }, chemistry: 2 },
        'Without the hair Chase has to sing it. He sings it. Lenny looks at Tamara. Tamara writes it down.')],
      { once: false, cooldown: 9 }),
    card('gk_rep_lot_show', 'scene', 'tamara', 'Parking Lot Show', g({ era: GLS, minWeek: 6 }),
      "Westgate Plaza is having a customer appreciation day: a bouncy castle, a hot dog stand, and a flatbed in the parking lot " +
      "with nobody on it. Mr. Petrenko asks if the band 'does daytime'. Chase is already carrying an amp.",
      [ch('Play the flatbed', { buzz: 4, book: 'westgate_parking_lot' },
        'Mr. Petrenko paints LIVE ROCK SATURDAY on the plaza sign. Gloria from the Mall-Walkers says she will walk over. Chase stretches his knees.',
        'Books this weekend (if free) · Buzz ↑'),
       ch('Run the hot dog stand', { fund: 60, chemistry: 2 },
        'Tamara runs the stand with a cash float and a spreadsheet. You sell out by two. Chase puts mustard on his knee pads somehow.'),
       ch('Stay in and rehearse', { skill: { lenny: 1 }, burnout: -3 },
        'The bouncy castle thumps through the wall all afternoon. It is roughly in time. Lenny writes a riff to it. It is legal.')],
      { once: false, cooldown: 10 }),
    card('gk_rep_rhonda_call', 'scene', 'gk_dj', 'Rhonda Takes Requests', g({ era: GLS, minFans: 40 }),
      "Rhonda's overnight rock show takes requests from 2 to 3 a.m. She says if enough people call in for {band} she will play the " +
      "demo. The band has one phone between them that works. Tamara's.",
      [ch('Everybody call. All night.', { buzz: 5, burnout: 3 },
        'Chase does eleven voices. Lenny does one, badly. Rhonda plays the demo at 2:58 a.m. and says "some very excited callers".'),
       ch('One honest request', { fans: 6, chemistry: 2 },
        'Tamara calls once, says who she is and asks politely. Rhonda plays it and says "that is how you do it". Chase sulks.'),
       ch('Sleep. It is 2 a.m.', { burnout: -4 },
        'You sleep. Rhonda plays the demo anyway, at 2:40, because Gloria called in. Gloria calls in every night.')],
      { once: false, cooldown: 9 }),
    card('gk_rep_minus_forty', 'weird', 'chase', 'Minus Forty (Both Scales)', g({ era: GLS, weekOfYear: [11, 16] }),
      'Minus forty. The van will not start. Chase will not wear a toque because of the hair. Lenny has lost feeling in his picking hand. ' +
      "Tamara has plugged in the block heater, the van and, somehow, Chase.",
      [ch('Rehearse in parkas', { chemistry: 4, burnout: 5 },
        'A full set in parkas and mittens. It sounds terrible. It feels incredible. Chase performs the knee slide in a snowsuit.'),
       ch('Cancel. Hot chocolate.', { burnout: -6, mood: { all: 3 } },
        'Hot chocolate at the mall food court. The mall-walkers join you. Gloria brings marshmallows from her purse.'),
       ch('Chase finally wears a toque', { mood: { chase: -6 }, chemistry: 3 },
        'He wears it over the mullet. Only the back sticks out. He calls it a "winter mullet". It trends locally for a week.')],
      { once: false, cooldown: 20 }),
    card('gk_rep_mixtape', 'drama', 'chase', 'The Mixtape', g({ era: GLS }),
      "Chase has made the band a mixtape for 'morale'. It is ninety minutes long. Side A is 1985. Side B is also 1985. The case has " +
      "a hand-drawn cover of the band as panthers.",
      [ch('Play it at rehearsal', { chemistry: 4, mood: { chase: 6 } },
        'The whole band sings along to every song. Even Tamara. Especially Tamara. She knows every word. Nobody asks why.'),
       ch('Play it in the van', { mood: { chase: 5, tamara: -3 }, burnout: -3 },
        'Tamara lets it play for one whole side. That is a record. Chase counts it as a victory. It is.'),
       ch('Make him one back', { chemistry: 5, fund: -10 },
        'You make Chase a mixtape of songs from after 1985. He listens to it once, in private, with the door closed. He never mentions it.')],
      { once: false, cooldown: 8 }),
    card('gk_rep_receipts', 'money', 'tamara', 'Receipt Day', g({ era: GLS }),
      "Tamara's monthly receipt day. The shoebox is full. The second shoebox (CHASE) has one receipt in it, for a comb, from 1998. " +
      "Lenny has a receipt for a lawyer's lunch. He did not eat it. He paid for it.",
      [ch('Sort them properly', { fund: 60, burnout: 3 },
        'Three hours of sorting. Tamara finds $60 in forgotten refunds. Chase finds the comb. He is emotional about the comb.'),
       ch('Let Tamara do it alone', { mood: { tamara: 3 }, burnout: -3 },
        'Tamara sorts them alone, humming. She says it is "restful". She means it. You worry about her. She is fine.'),
       ch('Buy a label maker', { fund: -40, chemistry: 3 },
        'Tamara labels everything, including Chase. He wears the label ("CHASE (VOCALS)") on his jacket for a month.')],
      { once: false, cooldown: 10 }),
    card('gk_rep_sidewalk_sale', 'money', 'gk_landlord', 'Sidewalk Sale Days', g({ era: GLS, weekOfYear: [1, 6] }),
      "Westgate Plaza's sidewalk sale. Every business puts a table outside. Mr. Petrenko has put one outside Unit 4B, for you. " +
      "'Sell something. Band things. Or play. Something.'",
      [ch('Sell merch on the sidewalk', { fund: 80, fans: 5 },
        'You sell shirts next to a table of discounted vacuum bags. Gus throws in a bag with every shirt. Customers are confused but happy.'),
       ch('Play the sale', { fans: 15, buzz: 4 },
        'A set in the parking lot. Shoppers stop. Trinh does free nail art in band colours. It is the best sidewalk sale in plaza history.'),
       ch('Stay inside', { burnout: -4, chemistry: 2 },
        'You watch the sale through the window like a band in an aquarium. People wave. You wave back. It is weirdly nice.')],
      { once: false, cooldown: 20 }),
    card('gk_rep_riff_night', 'scene', 'lenny', 'Riff Night at the Pub', g({ era: GLS, minWeek: 8 }),
      "A pub on Whyte runs 'Name That Riff' every Wednesday. Lenny has been banned twice for 'unfair advantage'. The new host doesn't " +
      "know him. Lenny has a fake moustache.",
      [bet('Enter in disguise', 'the moustache is weak', 'Lenny sits down in the moustache.', 0.5, null,
        { fund: 100, mood: { lenny: 6 } }, 'He names every riff and wins $100. The moustache falls off during the prize speech. Too late.',
        { mood: { lenny: -5 }, buzz: 3 }, 'The host recognizes him from the picture behind the bar. Banned a third time. The picture is updated.'),
       ch('Lenny hosts instead', { buzz: 6, fans: 10 },
        'Lenny plays riffs; the pub guesses. Half the riffs are his. Nobody can tell which. That is kind of the problem.'),
       ch('Stay home', { burnout: -3 },
        'Lenny stays home and names riffs on the radio alone. He gets them all. He tells nobody. It is enough.')],
      { once: false, cooldown: 12 }),
    card('gk_rep_wedding_social', 'money', 'tamara', 'Another Wedding Social', g({ era: GLS }),
      "Tamara's cousin's friend's wedding social in Sherwood Park. $200, a hall, a cash bar and a dance floor that has seen things. " +
      "They want the chicken dance. Chase wants a power ballad. You can probably do both.",
      [ch('Chicken dance, rock version', { fund: 160, buzz: 3 },
        'The heaviest chicken dance ever played in Sherwood Park. The grandparents love it. So do the grandchildren. It is a crossover.'),
       ch('Power ballad for the first dance', { fans: 10, mood: { chase: 5 } },
        'Chase sings the first dance. The couple cries. The best man cries. The caterer cries. Tamara hands out tissues from her kit.'),
       ch('Tamara runs the social', { fund: 200, mood: { tamara: 4 }, burnout: 5 },
        'Tamara runs the door, the float and the playlist. The social makes record money. The couple asks her to do their taxes.')],
      { once: false, cooldown: 8 }),
    card('gk_rep_construction', 'road', 'lenny', 'Construction Season', g({ era: GLS, weekOfYear: [19, 24] }),
      "Edmonton has two seasons, and this is the other one. Every road between Unit 4B and anywhere has orange cones on it. The " +
      "detour has a detour. Tamara has a paper map. Chase has a theory about shortcuts.",
      [ch("Follow Tamara's map", { burnout: 3, chemistry: 2 },
        'You arrive on time and in order. Tamara folds the map back perfectly. It is the most satisfying thing you have ever seen.'),
       bet("Chase's shortcut", 'he says he knows a guy', 'Chase directs you down an alley behind a car wash.', 0.35, null,
        { buzz: 3, mood: { chase: 6 } }, "It works. Nobody knows how. Chase says 'the city speaks to me'. It does not. He got lucky.",
        { burnout: 6, mood: { tamara: -4 } }, 'The alley ends in a second construction zone. You wait behind a paver for forty minutes.'),
       ch('Take the LRT with the gear', { burnout: 5, fans: 6 },
        'A full drum kit on the light rail at rush hour. Commuters help carry the floor tom. Six of them come to the gig.')],
      { once: false, cooldown: 20 }),

    // ---- Guilt (parents' loan) ------------------------------------------------------------------------------------------
    card('gk_guilt_hygiene', 'money', 'mom', 'Hygiene School', g({ era: GLS, flags: ['parentsLoan'] }),
      "Mom has met Tamara. Mom likes Tamara very much. Mom has now left a brochure for the dental hygiene program at the college " +
      "on your {gear}, with 'TAMARA DID IT!' written on it.",
      [ch('Pay her back $100', { repay: 100, chemistry: 2 },
        'You hand over a hundred dollars. Mom hands back the brochure. "Keep it. For later." It goes in the receipts shoebox.'),
       ch('Have Tamara talk to her', { mood: { tamara: 4 }, burnout: 3 },
        'Tamara explains that the band is also a career. With spreadsheets. Mom is reassured by the spreadsheets. For now.'),
       ch('Promise next month', { burnout: 3 },
        "Mom writes 'NEXT MONTH' on the brochure. In red. She also underlines 'Tamara'.")],
      { once: false, cooldown: 9 }),
    card('gk_guilt_oil_patch', 'money', 'dad', 'The Oil Patch Is Hiring', g({ era: GLS, flags: ['parentsLoan'] }),
      "Dad hands over the loan money with a newspaper folded open to the job ads: 'Rig hands wanted, Fort McMurray, great pay'. " +
      "He has circled one. Then circled the circle.",
      [ch('Pay back $120', { repay: 120, chemistry: 2 },
        'Dad takes the money and leaves the paper. "In case." You fold it into a paper airplane. It flies surprisingly well.'),
       ch('Play Dad a new song', { mood: { all: 3 }, burnout: 3 },
        'Dad listens with his arms crossed. At the bridge he uncrosses them. He does not say anything. He does take a shirt.'),
       ch('Ask about the circled job', { burnout: 4, chemistry: 2 },
        'Dad talks about his own years in the patch for two hours. You learn more about your dad than in twenty years. The loan stays.')],
      { once: false, cooldown: 10 }),

    // ---- Holidays (calendar.holidays[*].cards; yearly) --------------------------------------------------------------------
    card('holiday_canada_day_gravel_kings', 'scene', 'chase', 'Canada Day', g({ era: GLS, weekOfYear: [1, 1] }),
      "Canada Day at the Legislature grounds. Free stages, a hundred thousand people, fireworks over the river valley. Chase has " +
      "a leather jacket with a maple leaf on the back. It is thirty degrees. He is wearing it.",
      [ch('Flyer the grounds all day', { buzz: 8, fans: 12, burnout: 5 },
        'Four hundred flyers and a lot of sunscreen. A kid asks if Chase is "a hockey guy from the olden days". He says yes.'),
       ch('Play the side stage', { fans: 20, buzz: 6 },
        'A twenty-minute set on the side stage before the fireworks. Chase does the knee slide on the grass. Grass stains on leather. Worth it.'),
       ch('Fireworks from the High Level', { chemistry: 6, mood: { all: 4 } },
        'You watch the fireworks from the bridge. Nobody talks. Lenny hums something original. Tamara notices. She says nothing. Yet.')],
      { once: false, cooldown: 20 }),
    card('holiday_thanksgiving_guilt_gravel_kings', 'money', 'mom', 'Thanksgiving Dinner', g({ era: GLS, weekOfYear: [7, 7], flags: ['parentsLoan'] }),
      "Thanksgiving at your parents'. Turkey, stuffing, and Mom has invited Tamara 'as a good influence'. Tamara brought pie and a " +
      "repayment schedule. Mom is delighted by both.",
      [ch('Pay back $100 over pie', { repay: 100, chemistry: 2 },
        "Tamara's schedule works. Mom stamps it PAID (PARTIAL). Dad asks Tamara to look at his taxes. It is now a tradition."),
       ch('Chase gives a toast', { mood: { chase: 5 }, burnout: 3 },
        'Chase toasts "to 1985 and to Mom". Mom is charmed. Dad is not. The loan comes up during dessert anyway.'),
       ch('Eat fast, leave early', { burnout: -3 },
        'You leave before the pie. Mom sends the pie after you, by Tamara. The loan is mentioned on the card.')],
      { once: false, cooldown: 20 }),
    card('holiday_thanksgiving_gravel_kings', 'scene', 'tamara', 'Thanksgiving', g({ era: GLS, weekOfYear: [7, 7], notFlags: ['parentsLoan'] }),
      "Thanksgiving in Unit 4B. Tamara has organized a band potluck on the till counter. Trinh brought spring rolls, Gus brought a " +
      "turkey he cooked in a vacuum-repair oven, and Chase brought a cassette.",
      [ch('Invite the whole plaza', { chemistry: 5, fans: 8 },
        'Twenty people in Unit 4B. Mr. Petrenko carves. Darrell with the clipboard says grace. It is the best Thanksgiving of your life.'),
       ch('Band only', { chemistry: 4, burnout: -4 },
        'Four plates, one drummer, one cassette. Everyone says what they are thankful for. Chase says "1985". Lenny says "voicemail".'),
       ch('Play a Thanksgiving show', { fund: 120, buzz: 4 },
        'A holiday gig at a pub on Whyte. The turkey is served on stage. Chase uses a drumstick as a mic. You tip the chef.')],
      { once: false, cooldown: 20 }),
    card('holiday_halloween_gravel_kings', 'fame', 'chase', 'Halloween Costume Gigs', g({ era: GLS, weekOfYear: [8, 8] }),
      "Halloween: every bar wants costume bands, and the rule is you dress as ANOTHER band. Chase has a proposal, a glue gun and four " +
      'silk scarves.',
      [ch('Go as Chartbusters', { buzz: 6, flags: { costume: 'Chartbusters (four scarves, one ballad)' } },
        'Four scarves and one power ballad, played eleven times. The crowd sings along every time. Chase does a perfect Rex. It scares him.'),
       bet('Go as an eighties arena band', 'the hair might not fit', 'Chase brings out a can of hairspray the size of a fire extinguisher.', 0.5, null,
        { buzz: 10, fans: 15, flags: { costume: 'every 1985 arena band at once' } }, 'Four mullets, eight feet of hair. Best Costume. Chase says it is not a costume.',
        { burnout: 6, flags: { costume: 'half a hair metal band' } }, 'The hairspray runs out after two band members. The other two go as roadies.'),
       ch('We ARE the costume', { chemistry: 3, flags: { costume: 'Gravel Kings (nobody noticed)' } },
        'You go as yourselves. Four people say "great eighties costumes". Chase says "thank you" with enormous dignity.')],
      { once: false, cooldown: 20 }),
    card('holiday_grey_mug_gravel_kings', 'fame', 'gk_dj', 'The Grey Mug Halftime Show', g({ era: S, weekOfYear: [10, 10], minFans: 20000, minYear: 4 }),
      "The Grey Mug final is in Edmonton this year and the league wants a hometown band for halftime. Twelve minutes, three songs, " +
      "four million viewers, and a stage on wheels that has to be off the field in ninety seconds.",
      [ch('Three hits, twelve minutes', { fans: 400, buzz: 18, burnout: 10, flags: { greyMug: 'played' } },
        'Chase slides from the forty to the thirty-five. Fifty thousand people sing the chorus in the snow. It is replayed for years.'),
       bet('Add the pyro', 'flames or a flag', 'The fire marshal has signed off. Mostly.', 0.5, 'buzz',
        { fans: 400, buzz: 18, flags: { greyMug: 'played' } }, 'The flames hit on the downbeat. Chase lands between them. Four million people scream.',
        { fans: 250, buzz: 12, mood: { chase: -8 }, flags: { greyMug: 'played' } }, 'The pyro goes a bar early and singes the goalposts. It is a meme by Monday.')],
      { once: true }),
    card('holiday_xmas_single_gravel_kings', 'fame', 'gk_dj', 'The Christmas Single', g({ era: S, weekOfYear: [11, 12], flags: ['label'] }),
      "Rhonda heard the pitch first: a Christmas power ballad. Chase wants sleigh bells and a key change. Lenny's riff sounds like a " +
      "famous Christmas song. All Christmas songs sound like famous Christmas songs. That is the point, he says.",
      [ch('Record the ballad', { fund: 600, fans: 200, mood: { chase: 10 } },
        '"Leather Pants Under the Mistletoe" goes into holiday rotation on every station Chartbusters do not own. There are three.'),
       ch('Record it with the plaza', { fans: 150, buzz: 10, chemistry: 5 },
        'Trinh sings harmony, Gus plays a vacuum solo, Petrenko rings the sleigh bells. It is chaos. It is Christmas. It charts.'),
       ch("No Christmas single", { mood: { chase: -6 }, chemistry: 3 },
        'Chase records one alone, on cassette, and mails it to the band. It is beautiful. It is about Unit 4B. You all cry.')],
      { once: false, cooldown: 20 }),
    card('holiday_xmas_parties_gravel_kings', 'money', 'tamara', 'Christmas Party Season', g({ era: GLS, weekOfYear: [11, 12] }),
      "Christmas party season: every office, clinic and oil-services company in the capital region wants a band. The Sherwood Park Smile " +
      "Centre wants you on the 19th. Dr. Bhullar has requested 'the one about floss'.",
      [ch('Play every party', { fund: 200, burnout: 8 },
        'Six parties in five nights. Chase wears a Santa hat over the mullet. It sits on top like a small red boat.'),
       ch('Only the clinic party', { fund: 90, mood: { tamara: 6 } },
        'You play the clinic party. Dr. Bhullar dances. Tamara gets a gift card. Chase gets a new toothbrush and a stern look.'),
       ch('Take the week off', { burnout: -6, chemistry: 3 },
        'A week off. Tamara bakes. Lenny writes. Chase watches a 1985 Christmas special on a VCR he found. It is a good week.')],
      { once: false, cooldown: 20 }),
    card('holiday_st_paddys_gravel_kings', 'weird', 'lenny', "St. Paddy's on Whyte", g({ era: GLS, weekOfYear: [18, 18] }),
      "St. Patrick's Day on Whyte Avenue. Every pub wants a band, green beer is flowing, and one bar will pay double for a band that " +
      "can play a jig. Lenny can play a jig. It sounds like a famous jig.",
      [ch('Play the jig', { fund: 150, buzz: 4 },
        'Lenny plays the jig. It is familiar. Everyone dances. A man in a leprechaun hat tells Lenny it is "his cousin\'s jig". Lenny apologizes.'),
       ch('Rock versions only', { fans: 15, buzz: 5 },
        'You play your set, green-lit. A pub full of people in shamrock hats headbangs. The bar owner calls it "a new tradition".'),
       ch('Tamara drives everyone home', { chemistry: 4, mood: { tamara: 4 } },
        'Tamara drives four trips of friends home, safely, sober, singing. Everyone owes her. She keeps a list. It is long.')],
      { once: false, cooldown: 20 }),

    // ---- Signed demand cards (labels.<id>.demandsByBand.gravel_kings) -----------------------------------------------------
    card('signed_monolith_radio_gravel_kings', 'drama', 'lenny', 'The Radio Edit', g({ era: S, flagEquals: { label: 'monolith' } }),
      "Monolith wants a 3:30 radio edit. The single is 6:50, and two minutes of it is Chase's knee slide, which is silent on record. " +
      "Also, the edit has to get past Airwave Dominion. Which means it should sound less like rock.",
      [ch('Cut it to 3:30', { fans: 200, buzz: 6, mood: { chase: -10 }, flags: { demandRadio: 'met' } },
        'The knee slide is gone. The radio edit is tight. It gets on eleven stations. Chase listens to it once and goes for a long walk.'),
       ch('4:50 and not a second less', { fans: 100, mood: { chase: 5 }, flags: { demandRadio: 'half' } },
        'Monolith accepts 4:50 with a sigh you can hear through the email. Some stations fade it early. Chase counts the seconds.'),
       ch('Send the full version', { buzz: 8, mood: { chase: 10, lenny: 5 }, fund: -300, flags: { demandRadio: 'refused' } },
        "Monolith cuts the promo budget. The campus stations play all 6:50. Rhonda calls it 'a knee slide you can hear'.")]),
    card('signed_monolith_image_gravel_kings', 'drama', 'chase', 'The Image Consultant', g({ era: S, flagEquals: { label: 'monolith' } }),
      "Monolith has sent an image consultant to 'bring the band into the present'. She has a mood board. It has no leather on it. " +
      'Chase has read the mood board and is now lying on the floor of Unit 4B.',
      [ch('Full makeover', { fans: 250, mood: { chase: -14 }, flags: { demandImage: 'met' } },
        'Clean jeans, soft sweaters, a sensible haircut. The band looks like a bank ad. The label loves it. Chase grieves for a month.'),
       ch('New jackets, same pants', { fans: 120, chemistry: 3, flags: { demandImage: 'half' } },
        "A compromise: new denim jackets over the leather pants. The consultant calls it 'retro-forward'. Chase calls it 'survivable'."),
       ch('Chase makes HER over', { buzz: 12, mood: { chase: 12 }, flags: { demandImage: 'refused' } },
        'By the end of the day the consultant has a mullet. She quits Monolith and starts a vintage leather shop. Monolith is not amused.')]),
    card('signed_monolith_clearance_gravel_kings', 'drama', 'gk_lawyer', 'Clearance', g({ era: S, flagEquals: { label: 'monolith' } }),
      "Monolith's legal department wants every riff on the album cleared before release. Every riff. There are fourteen. Bryce Pruitt, " +
      'Esq., has somehow been hired as outside counsel. He waves at Lenny through the boardroom glass.',
      [ch('Clear all fourteen', { skill: { lenny: 2 }, burnout: 10, flags: { demandClearance: 'met' } },
        'Six weeks of legal review. Nine riffs are rewritten. The album is legally spotless. Lenny grows a grey hair, then another.'),
       ch('Clear the singles only', { fans: 100, mood: { lenny: -6 }, flags: { demandClearance: 'half' } },
        'The singles are cleared. The deep cuts are "at your own risk". Bryce sends a card: "Looking forward to the deep cuts!"'),
       ch("They're our riffs", { buzz: 10, fund: -800, mood: { lenny: 8 }, flags: { demandClearance: 'refused' } },
        'You release it uncleared. Two settlements come out of the advance. Lenny says it was worth it. Tamara has a new binder.')]),
    card('signed_gopherwood_showcase_gravel_kings', 'scene', 'tamara', 'The Feed Store Showcase', g({ era: S, flagEquals: { label: 'gopherwood' } }),
      "Gopherwood wants the band at its Christmas showcase in Humboldt, like every band on the label, every year, forever. It is a " +
      "five-hour drive. Tamara has already booked the motel. Chase has already packed the good leather.",
      [ch('Play the showcase', { fans: 150, burnout: 8, flags: { demandShowcase: 'met' } },
        'You play the feed store between a punk trio and a polka band. The label owner hands out gophers carved from pine. Chase cries.'),
       ch('Send a video', { mood: { chase: -5 }, flags: { demandShowcase: 'half' } },
        'A holiday video from Unit 4B, projected on a grain bin. The label owner says it is "almost like being there". Almost.'),
       ch("Humboldt in December? No.", { chemistry: 3, fund: -200, flags: { demandShowcase: 'refused' } },
        'The label docks you a promo budget and sends a sad Christmas card with a gopher in a toque on it. Tamara frames it anyway.')]),

    // ---- THE RIFF (chain 'riff'; Q2 storyline). Flags: riff = 'settled' | 'scrapped' | 'original'. ------------------------
    //   1 gk_riff_1_letter ── fight ─> 2 gk_riff_2_fight ── lawyer / Chase ─> 3 gk_riff_3_court ── won ─> 4 gk_riff_4_won ──┐
    //                      ── tweak ─> 2 gk_riff_2_tweak ── court (riffPlan fight) ──┘       ├─ lost ─> 4 gk_riff_4_fine ─┴─> 5 gk_riff_5_original ─> end (original)
    //                      ── settle ─> end (settled)          └─ scrap ─> end (scrapped)   └─ settle ─> end (settled)
    //   Helper flags riffPlan / riffCourt / riffVerdict are cleared (false) when the chain ends.
    card('gk_riff_1_letter', 'drama', 'gk_lawyer', 'Cease and Desist', g({ era: GLS, minWeek: 8, minFans: 60 }),
      "A courier delivers a letter on heavy paper to Unit 4B. Airwave Dominion Music Publishing, a Chartbusters company, says Lenny's " +
      "'Legally Distinct Riff' infringes 'Everything Tonight'. Cease and desist. Lenny reads it twice and puts on sunglasses.",
      [ch('We fight it. In court.', { mood: { lenny: 6 }, flags: { riffPlan: 'fight' }, chain: { riff: { step: 2, delay: 2 } } },
        'Chase stands on the till counter and declares war on the radio. Tamara writes "COURT?" on the whiteboard. Then underlines it.'),
       ch('Lenny changes two notes', { mood: { lenny: -4 }, flags: { riffPlan: 'tweak' }, chain: { riff: { step: 2, delay: 2 } } },
        'Two notes, moved. Lenny plays the new version. Everyone looks at each other. It sounds like a different famous song.'),
       ch('Settle. Drop the song.', { fund: -150, mood: { lenny: -10 }, flags: { riff: 'settled' }, chain: { riff: { step: 'end' } } },
        'You pay a small settlement and retire the song. Lenny keeps the letter in his guitar case. He does not play for a week.')],
      { chain: 'riff', step: 1, weight: 3 }),
    card('gk_riff_2_fight', 'drama', 'tamara', 'Finding a Lawyer', g({ era: GLS, flagEquals: { riffPlan: 'fight' } }),
      "Court is set for next month. Tamara has made a list of lawyers who will take a rock band's case for a price the band can afford. " +
      "The list has one name on it: her cousin Marisol, who does real estate. Chase has a second idea.",
      [ch('Hire Marisol', { fund: -150, mood: { tamara: 5 }, flags: { riffCourt: 'marisol' }, chain: { riff: { step: 3, delay: 3 } } },
        'Marisol treats the riff like a property line. She brings a surveyor\'s tape to Unit 4B and measures the notes. It is oddly convincing.'),
       ch('Chase represents the band', { buzz: 6, mood: { chase: 8, tamara: -5 }, flags: { riffCourt: 'chase' }, chain: { riff: { step: 3, delay: 3 } } },
        'Chase buys a leather suit for court. He practises his closing argument in the mirror. It is a power ballad. It is surprisingly moving.'),
       ch('Actually, settle', { fund: -200, mood: { lenny: -8 }, flags: { riff: 'settled', riffPlan: false }, chain: { riff: { step: 'end' } } },
        'You settle before court. Airwave Dominion sends a scarf with the paperwork. Lenny throws the scarf in the dumpster behind the plaza.')],
      { chain: 'riff', step: 2 }),
    card('gk_riff_2_tweak', 'drama', 'lenny', 'The Second Letter', g({ era: GLS, flagEquals: { riffPlan: 'tweak' } }),
      "A second letter, from a different publisher: Lenny's two-note fix now infringes a 1979 disco hit. Two companies want the same " +
      "riff to stop existing. Lenny has not slept. 'It's not fair. It came out of me.'",
      [ch('Fine. We go to court.', { mood: { lenny: 5 }, chemistry: 3, flags: { riffPlan: 'fight', riffCourt: 'marisol' }, chain: { riff: { step: 3, delay: 3 } } },
        "Tamara's cousin Marisol takes the case. She calls it 'a boundary dispute between two landlords'. Lenny feels seen."),
       ch('Scrap the riff forever', { mood: { lenny: -8 }, chemistry: 3, flags: { riff: 'scrapped', riffPlan: false }, chain: { riff: { step: 'end' } } },
        'Lenny holds a small funeral for the riff in the loading dock. Chase gives a eulogy. Gus plays taps on a vacuum. It is dignified.')],
      { chain: 'riff', step: 2 }),
    card('gk_riff_3_court', 'drama', 'lenny', 'The Court Date', g({ era: GLS, flagEquals: { riffPlan: 'fight' } }),
      "The Law Courts, downtown Edmonton. Airwave Dominion sent three lawyers and Rex Glamour's scarf, on its own chair. Lenny has " +
      "his guitar. The judge has agreed to hear both riffs. 'Play,' she says.",
      [bet('Lenny plays both riffs', 'the judge has ears', 'Lenny plays "Everything Tonight", then his riff. The room is silent.', 0.55, 'chemistry',
        { buzz: 10, mood: { lenny: 10 }, flags: { riffVerdict: 'won' }, chain: { riff: { step: 4, delay: 2 } } }, 'The judge rules the riffs are "cousins, not twins". Case dismissed. Lenny walks out into the snow and laughs.',
        { fund: -200, mood: { lenny: -6 }, flags: { riffVerdict: 'lost' }, chain: { riff: { step: 4, delay: 2 } } }, 'The judge rules against you, gently, with a small fine. "It is very catchy," she adds. Lenny goes home and does not sleep.'),
       ch("Tamara's spreadsheet", { mood: { tamara: 8 }, buzz: 6, flags: { riffVerdict: 'won' }, chain: { riff: { step: 4, delay: 2 } } },
        'Tamara submits a spreadsheet of every Chartbusters single since 1994. They are all the same song. The case is dismissed "with a smile".'),
       ch('Settle on the courthouse steps', { fund: -150, mood: { lenny: -8 }, flags: { riff: 'settled', riffPlan: false, riffCourt: false }, chain: { riff: { step: 'end' } } },
        "You settle on the steps. Rex's lawyer shakes your hand in a scarf. Lenny watches the snow for a long time.")],
      { chain: 'riff', step: 3 }),
    card('gk_riff_4_won', 'fame', 'chase', 'The Victory Lap', g({ era: GLS, flagEquals: { riffPlan: 'fight', riffVerdict: 'won' } }),
      "Case dismissed. The paper runs it on page three: LOCAL RIFF 'LEGALLY DISTINCT', JUDGE SAYS. Then every Airwave Dominion " +
      "station drops the band. Lenny hasn't played a note since. 'What if the next one is famous too?'",
      [ch('Victory lap round the plaza', { buzz: 6, mood: { chase: 6 }, chain: { riff: { step: 5, delay: 2 } } },
        'Chase drives the Mullet Wagon round the Westgate lot eleven times with the windows down. Trinh from the nail salon honks along.'),
       ch('Let Lenny be quiet a while', { chemistry: 3, mood: { lenny: 6 }, chain: { riff: { step: 5, delay: 3 } } },
        'Nobody asks Lenny for a riff. Tamara leaves his guitar on the couch, tuned. Every morning it has moved a little.')],
      { chain: 'riff', step: 4 }),
    card('gk_riff_4_fine', 'drama', 'tamara', 'The Fine Print', g({ era: GLS, flagEquals: { riffPlan: 'fight', riffVerdict: 'lost' } }),
      "The fine is small. The ruling is not: Lenny may never play the riff in public again. He has stopped playing anything. " +
      "Tamara found him in the plaza food court, staring at a pretzel, for an hour.",
      [ch('The band pays the fine together', { fund: -100, chemistry: 4, chain: { riff: { step: 5, delay: 2 } } },
        'Everybody puts in. Chase pays in quarters from the arcade. The clerk counts them all. Lenny watches and almost smiles.'),
       ch('Lenny takes a week off', { mood: { lenny: 5 }, chain: { riff: { step: 5, delay: 3 } } },
        'Lenny spends a week at his mom\'s in Leduc. He calls once, to say he is fine. In the background, someone is playing guitar.')],
      { chain: 'riff', step: 4 }),
    card('gk_riff_5_original', 'drama', 'lenny', 'The Original', g({ era: GLS, flagEquals: { riffPlan: 'fight' } }),
      "Three a.m. in Unit 4B. Lenny calls the band down in their pyjamas. He plays a riff. It sounds like nothing anyone has ever heard. " +
      "It is weird, and great, and his. Nobody's phone rings. 'Is it mine?' he whispers. It is his.",
      [ch('Record it tonight', { buzz: 10, skill: { lenny: 2 }, flags: { riff: 'original', riffOriginal: true, riffPlan: false, riffCourt: false, riffVerdict: false }, chain: { riff: { step: 'end' } } },
        'You record it in one take on Tamara\'s phone at 3:40 a.m. Chase names it "Lenny\'s Riff". It is the first song nobody can sue.'),
       ch('Chase screams over it', { buzz: 8, mood: { chase: 8, lenny: 6 }, flags: { riff: 'original', riffOriginal: true, riffPlan: false, riffCourt: false, riffVerdict: false }, chain: { riff: { step: 'end' } } },
        'Chase screams something wordless and perfect over it. Gus bangs on the wall. Not in anger. In time. It is the new set closer.'),
       ch('Play it for the lawyer', { chemistry: 5, mood: { lenny: 10 }, flags: { riff: 'original', riffOriginal: true, riffPlan: false, riffCourt: false, riffVerdict: false }, chain: { riff: { step: 'end' } } },
        'Lenny calls Bryce Pruitt at 4 a.m. and plays it down the phone. Long silence. "I have never heard that before," Bryce says. Lenny cries.')],
      { chain: 'riff', step: 5 }),

    // ---- MUDSTONBURY (chain 'mudstonbury'; Q3 World payoff). Sets flags.mudHeadline = true, which opens the package
    //      gk_mudstonbury_headline (world.packages, needs { flag: 'mudHeadline' }); wt_gk_mud_headline pays it off.
    card('gk_mud_1_call', 'fame', 'nigel', 'A Call from Mudstonbury', g({ era: S, minFans: 6000 }),
      "Nigel the promoter calls from England. 'Mudstonbury, my friend. The main stage headliner pulled out. Chartbusters. Rex wanted " +
      "a heated scarf tent. We want a rock band. Sixty thousand in a field. You in?'",
      [ch('We are in', { buzz: 10, mood: { chase: 12 }, flags: { mudPlan: 'yes' }, chain: { mudstonbury: { step: 2, delay: 2 } } },
        'Chase hangs up and slides across Unit 4B on his knees. He hits the till counter. He does not feel it. He is headlining.'),
       ch("Only if it's not in mud season", { mood: { tamara: 4 }, flags: { mudPlan: 'terms' }, chain: { mudstonbury: { step: 2, delay: 2 } } },
        'Nigel laughs for a full minute. "It is always mud season, my friend. Welly boots are provided." Tamara accepts the terms.'),
       ch("We're not ready", { chemistry: 3, mood: { chase: -10 }, flags: { mudstonbury: 'declined' }, chain: { mudstonbury: { step: 'end' } } },
        'You pass. Nigel books a Swedish band with a lot of fringe. Chase watches the stream alone, in the dark, in the leather.')],
      { chain: 'mudstonbury', step: 1, weight: 3 }),
    card('gk_mud_2_rex', 'scene', 'cb_rex', 'Rex Wants It Back', g({ era: S, flags: ['mudPlan'] }),
      "Rex Glamour calls. He has changed his mind about the scarf tent. He wants the Mudstonbury headline back. 'Tell you what, kid. " +
      "You can open. I'll lend you a scarf. That's a legacy move, for you.'",
      [ch("No, Rex. It's ours.", { buzz: 12, mood: { chase: 8 }, chain: { mudstonbury: { step: 3, delay: 2 } } },
        'Chase says no on a replica payphone, for drama. Rex says "we\'ll see, kid". Nigel says "we won\'t". The slot is yours.'),
       ch('Chartbusters can open', { buzz: 14, flags: { mudRex: 'opening' }, chain: { mudstonbury: { step: 3, delay: 2 } } },
        'Rex goes quiet for eleven seconds. Then: "Fine. But we get the wind machine." Chartbusters are opening for you. At Mudstonbury.'),
       ch('Give it back', { chemistry: 3, mood: { chase: -12 }, flags: { mudstonbury: 'gaveback', mudPlan: false }, chain: { mudstonbury: { step: 'end' } } },
        'You give it back. Rex sends a scarf. Chase burns the scarf in the plaza parking lot. Darrell with the clipboard writes him a ticket.')],
      { chain: 'mudstonbury', step: 2 }),
    card('gk_mud_3_wellies', 'money', 'tamara', 'Welly Boots and Leather Pants', g({ era: S, flags: ['mudPlan'] }),
      "The forecast for Mudstonbury: rain, then more rain, then mud. Tamara has bought four pairs of welly boots. Chase will wear " +
      "the leather pants. 'Leather is waterproof.' Leather is not waterproof. Tamara has a plan for that too.",
      [ch('Leather pants, into the mud', { buzz: 10, mood: { chase: 10 }, flags: { mudHeadline: true, mudPlan: false }, chain: { mudstonbury: { step: 'end' } } },
        'Chase packs two pairs, one for the set and one for "after the mud wins". Flights are booked. The main stage is waiting.'),
       ch('Wellies for everyone', { chemistry: 5, mood: { tamara: 8 }, flags: { mudHeadline: true, mudPlan: false }, chain: { mudstonbury: { step: 'end' } } },
        'Four pairs of wellies, painted silver by Chase to look like 1985. Tamara packs spare socks for everyone. The main stage is waiting.'),
       ch('Lenny writes a mud song', { skill: { lenny: 1 }, buzz: 8, flags: { mudHeadline: true, mudPlan: false }, chain: { mudstonbury: { step: 'end' } } },
        'Lenny writes "Knee Deep" on the flight plan. It is original. It is heavy. It is about mud. The main stage is waiting.')],
      { chain: 'mudstonbury', step: 3 })
  ];

  // ======================================================================================================================
  // SHOP CARDS (GG.content.shopCards; forced by GG.shop via career.variant '<baseId>_gravel_kings').
  // ======================================================================================================================
  var ALL = ['garage', 'local', 'signed', 'world'];
  P.shopCards = [
    card('money_merch_misprint_gravel_kings', 'money', 'tamara', 'GRAVY KINGS', g({ era: ALL }),
      "The first box of band shirts is back from the print shop in Leduc. Every one says 'GRAVY KINGS'. The shop says 'that's what you " +
      "wrote'. Tamara has the order form. Chase wrote it. On a napkin. At a poutine place.",
      [ch('Box them up. Someday.', { mood: { tamara: 3 }, shop: { misprint: 'boxed' } },
        "The box goes behind the old till with GRAVY written on it in Sharpie. Tamara logs it as 'inventory (future value)'. Nobody believes her.", 'Keep the misprints · maybe worth $$$ later'),
       ch('Pay for a reprint ($100)', { fund: -100, mood: { chase: 5 }, shop: { misprint: 'reprint' } },
        "The reprint says GRAVEL KINGS in chrome letters Chase describes as 'pure 1985'. It is a free font from 2011."),
       ch('Wear them to rehearsal', { chemistry: 5, mood: { all: 3 }, shop: { misprint: 'wear' } },
        'Gravy Kings becomes the band\'s secret name. The poutine place gives you a discount if you wear them. You always wear them.')]),
    card('shop_merch_start_gravel_kings', 'money', 'chase', 'The Merch Table', g({ era: GL, minWeek: 4 }),
      "Chase has designed a shirt: the logo in chrome, a panther, a lightning bolt and his own face, airbrushed. Tamara points out that " +
      'merch pays for gas. Lenny points out that the panther looks like a famous panther.',
      [ch('Order a box of shirts', { fund: -192, shop: { stock: { shirt: 1 } } },
        "Twenty-four shirts, logo only. Chase's face is 'held back for the deluxe edition'. The panther is 'under legal review'.", '−$192 · 24 shirts for the merch table'),
       ch('Stickers first', { fund: -80, shop: { stock: { sticker: 1 } } },
        "Two hundred stickers. Chase puts one on Darrell's clipboard. Darrell leaves it there. It is the start of something.", '−$80 · 200 stickers'),
       ch('Not yet', { mood: { chase: -4 } },
        'Chase tapes the design to the front window of Unit 4B. People think it is a store. Two of them come in to buy a shirt.')]),
    card('shop_pawn_kit_gravel_kings', 'money', 'lenny', 'The Pawn Shop Kit', g({ era: GL, minWeek: 8, minFund: 1100 }),
      "Lenny texts a photo from a pawn shop on 118th Avenue: a five-piece kit, shells that almost match, $800. Then: 'guy says $650 today. " +
      "the milk crate is hurting the brand.'",
      [ch('Buy it today ($650)', { fund: -650, shop: { kit: 1 } },
        'Three trips in the van. The first rehearsal sounds like a real band. The milk crate becomes a merch stand. Chase signs it.', '−$650 · a real kit: better sound'),
       bet('Haggle', 'haggle him down', 'Tamara takes the phone.', 0.5, 'chemistry',
        { fund: -520, shop: { kit: 1 } }, 'Tamara negotiates like a dental billing department. $520, and he throws in a cowbell. No gong.',
        { mood: { lenny: -5 } }, 'He sells it to a church drummer while you haggle. Lenny sulks until Thursday.'),
       ch('Not yet', { mood: { lenny: -4 } }, 'The milk crate creaks, as if it heard. Chase apologizes to it.')], { seat: ['drums'] }),
    card('shop_van_deal_gravel_kings', 'money', 'tamara', 'The Dental Clinic Van', g({ era: LSW, minFund: 4000 }),
      "The Sherwood Park Smile Centre is retiring its mobile-clinic van: fifteen seats, a trailer, a sink that still works. $3,000 and " +
      "the old van for parts. Tamara has already checked the tires. She has already named it.",
      [ch('Buy the clinic van', { fund: -3000, shop: { van: 1 } },
        'It smells like mint and fluoride. There is a poster of a happy molar inside. Chase wants to paint a panther over it. The molar stays.', '−$3,000 · 15-passenger van + trailer'),
       bet('Tamara haggles with her boss', 'Dr. Bhullar vs Tamara', 'Tamara books a meeting.', 0.45, null,
        { fund: -2500, shop: { van: 1 } }, 'Dr. Bhullar gives in after seeing the spreadsheet. $2,500. The molar poster is included free.',
        { mood: { tamara: -4 } }, 'Dr. Bhullar sells it to a mobile pet groomer. Tamara takes it professionally. And personally.'),
       ch('Keep the old van', { chemistry: 2 },
        'A curling team buys the clinic van. You see it at every bonspiel. The molar waves from the window.')]),
    card('shop_solo_gravel_kings', 'drama', 'lenny', 'Lenny Insists', g({ era: LSW }),
      "Lenny wants a real solo section. He promises the solo will be original. 'Completely original. From nothing.' He plays a sample. " +
      "It sounds like a famous solo. He plays a second sample. It sounds like a second famous solo.",
      [ch('Fine. A solo section.', { mood: { lenny: 8 }, shop: { section: 'solo' } },
        'Lenny gets his section. He writes a solo that sounds like nobody. It takes him a week. It is great. The phone does not ring.', 'Solo section unlocked · Lenny ↑'),
       ch('Only with a knee slide', { mood: { lenny: 5, chase: 5 }, chemistry: -2, shop: { section: 'solo' } },
        "Lenny's solo, Chase's slide, the same eight bars. Nobody can see Lenny's hands behind the leather. Everyone is happy, loudly.", 'Solo unlocked · Lenny ↑ · Chase ↑'),
       ch('No solos in this band', { mood: { lenny: -10 } },
        'Lenny plays the solo anyway, alone, in the loading dock, facing the dumpster. The dumpster is a good listener.', 'Lenny ↓↓')], { seat: ['drums', 'bass', 'rhythm'] }),
    card('shop_space_1_gravel_kings', 'money', 'gk_landlord', 'A Room with a Real Door', g({ era: LSW }),
      "A proper jam space across town: cinder block, egg-crate foam, a door that locks, $60 a week, and no nail salon on the other side " +
      "of the wall. Mr. Petrenko says Unit 4B 'will always be here'. He means it as a threat and a comfort.",
      [ch('Move in ($60/week)', { mood: { all: 4 }, shop: { move: 1 } },
        "One van trip and three trips for Chase's mirrors. Trinh and Gus wave from the plaza. Mr. Petrenko hangs a FOR LEASE sign. He takes it down that night.", 'Rent $60/wk · rehearsals count more'),
       ch('Stay in Unit 4B for now', { chemistry: 2, mood: { chase: 3 } },
        "Chase is relieved. It stays 1985 in here. Gus brings over a space heater he 'fixed'. It works. It hums in B flat.", 'Free · move later from the shop door')]),
    card('shop_space_2_gravel_kings', 'money', 'tamara', 'A Studio of Our Own', g({ era: SW }),
      "A rehearsal-and-recording studio downtown has a room free: an isolation booth, a real console, a coffee machine that works. " +
      "$150 a week. Tamara has toured it twice with a clipboard. Chase has toured the mirror.",
      [ch('Move in ($150/week)', { mood: { all: 4 }, shop: { move: 2 } },
        "A real studio. The engineer hands out keys and one rule: 'no hairspray near the console'. Chase negotiates it down to 'less'.", 'Rent $150/wk · write + record better'),
       ch('Not yet', { mood: { tamara: -3 } }, 'Tamara keeps the brochure on the fridge, under a magnet shaped like a tooth. It is a threat.')]),
    card('shop_space_3_gravel_kings', 'money', 'chase', 'Backstage, Forever', g({ era: W }),
      "The downtown arena offers a permanent room under the stands: a star on the door, showers, the hockey team's laundry next door. " +
      "$300 a week. Chase has already chosen his corner. It has a mirror and a panther poster.",
      [ch('Move in ($300/week)', { mood: { all: 5 }, shop: { move: 3 } },
        'You rehearse where the arena bands rehearse. The Zamboni driver brings coffee. He has requests. All of them are from 1985.', 'Rent $300/wk · rest like royalty'),
       ch('Stay where we are', { mood: { chase: -5 } }, 'Chase paints a star on the old door himself. It is crooked. It has a lightning bolt. He loves it.')])
  ];

  // ======================================================================================================================
  // FANS (bandbook.cards + scandals; forced by GG.fans). The home superfan (Q5) is Gloria, in Dale's state slot.
  // ======================================================================================================================
  P.fanCards = [
    card('fans_dale_hello_gravel_kings', 'fame', 'gloria_mallwalk', 'Gloria from the Mall-Walkers', gb({}),
      'A message on the band page: "Hello. Gloria from the Early Birds Walking Club. I heard you through the food court wall. I will be ' +
      'at every show. I walk nine kilometres a day. I can walk to all of them."',
      [ch('Welcome aboard, Gloria', { chemistry: 3, fan: { superfan: { dale: 10 } } },
        'Gloria replies with a thumbs-up, then her pedometer count for the day, then a photo of her runners. They have names. Left and Right.'),
       ch('Guest list, forever', { buzz: 2, fan: { superfan: { dale: 15 } } },
        'She insists on paying anyway, in exact change, from a coin purse shaped like a strawberry.'),
       ch('Ask how she found you', { chemistry: 2, fan: { superfan: { dale: 5 } } },
        'She heard the knee slide through two walls and a pretzel stand at 7 a.m. "It sounded like 1985," she says. Chase is speechless.')]),
    card('fans_macaroni_gravel_kings', 'fame', 'gloria_mallwalk', 'A Gift from Gloria', gb({}),
      "After the show Gloria hands over a package wrapped in a mall flyer: a portrait of Chase made entirely from food-court sugar " +
      "packets, glued to a cafeteria tray. It took her, she says, 'four hundred laps'.",
      [ch('Hang it in Unit 4B', { chemistry: 3, fan: { gift: 'gloria_portrait', superfan: { dale: 10 } } },
        'It goes up behind the till counter. Chase stares at it for a long time. "She got the hair," he whispers. She got the hair.'),
       ch('Let Chase decide', { mood: { chase: 5 }, fan: { gift: 'gloria_portrait', superfan: { dale: 8 } } },
        'Chase hangs it at eye level, next to his mirror, so he can see both of himself at once. It is the happiest he has ever been.')]),
    // The trucker superfan (fans_trucker's variant: the base card is Hail Damage's; superFanCard tries fans_trucker_<band> first).
    card('fans_trucker_gravel_kings', 'road', 'tamara', 'The Jumper-Cable Story', gb({}),
      "2 a.m., driving home from a gig, the Petro-Canuck in Innisfail. {van} has died at pump 4. T-Bone says it is 'just resting'. A semi pulls in. " +
      'A trucker named Wendell produces jumper cables longer than the van. "Heard you on the radio," he says. Once. By mistake.',
      [ch('Buy him a coffee and a donut', { fund: -12, fan: { superfan: { trucker: 10 } } },
        'He tells you about every band he has ever boosted. It is a long list. You are, he says, "top five, ahead of a band with a scarf".'),
       ch('Play him a song in the lot', { burnout: 4, chemistry: 3, fan: { superfan: { trucker: 15 } } },
        'Lenny plays the riff on an unplugged guitar under the gas-station lights. Chase does a knee slide on the pump island. Wendell honks the air horn.'),
       ch('Sign his thermos', { buzz: 2, fan: { superfan: { trucker: 8 } } },
        '"Now I can never wash it," says Wendell, who has clearly never washed it. Chase signs it twice, once from each side of his hair.')]),
    card('fans_hater_page_gravel_kings', 'fame', 'gk_reporter', 'The Anti-Fan Club', gb({}),
      'Kyle from the Courier reports on a new page: "{band} Are Stuck in 1985 (Derogatory)". It has a logo, a scarf avatar and a ' +
      'monthly meeting at a Calgary pub. Someone suspects it is run from a radio conglomerate.',
      [bet('Show up to their meeting', 'charm the haters', 'You drive to Calgary with a box of donuts.', 0.5, 'chemistry',
        { buzz: 8, fans: 20, fan: { hater: -0.04 } }, 'By dessert, three of them are in Gloria\'s group chat. One asks where Chase gets his hairspray.',
        { buzz: -3, mood: { chase: -5 } }, 'They vote to make Chase an honorary member. He is not honoured. The scarf avatar changes to his face.'),
       ch('Ignore them. Play louder.', { burnout: 4, chemistry: 3 },
        'They review your next show anyway. "Very 1985. Four stars." It is their best review ever.')]),
    card('fans_patreeon_gravel_kings', 'money', 'tamara', 'Patreeon', gb({ era: SW }),
      "Tamara found Patreeon: superfans pay monthly, the band posts exclusives. Tiers: Drumstick, Snare, Full Kit. She has already " +
      "drafted a budget. Gloria has already asked where to send the cheque. By mail.",
      [ch('Open the fan club', { buzz: 3, fan: { club: 'open' } },
        'Patreeon is live. First member: Gloria, Full Kit, at 7:01 a.m., mid-lap. Second member: Mom, Drumstick, "to be supportive".'),
       ch('Only if Gloria gets it free', { chemistry: 3, fan: { club: 'open', superfan: { dale: 15 } } },
        'Gloria refuses and pays double. Tamara records it as a donation. Patreeon is live.'),
       ch("Not yet. It's 1985.", { chemistry: 3, mood: { chase: 4 } },
        "Chase explains that in 1985 fan clubs were mailed newsletters. Tamara bookmarks the website anyway.")]),
    card('fans_club_grumble_gravel_kings', 'money', 'gloria_mallwalk', 'Patreeon Grumbles', gb({ era: SW }),
      "A polite message from Gloria, on behalf of 'the members': it has been a while since an exclusive. Some of the walkers are asking " +
      'what the money is for. Gloria is not asking. Gloria would never. She just thought you should know.',
      [ch('Film an exclusive tonight', { burnout: 5, fan: { clubHappy: 25 } },
        'A fifty-minute livestream of Tamara doing the band taxes, narrated by Chase. Members love it. It is somehow gripping.'),
       ch('Send every member a postcard', { fund: -150, fan: { clubHappy: 15 } },
        "Four hundred postcards of Unit 4B. Gloria frames hers. Mom frames hers. Lenny signs each one with a riff that nobody owns."),
       ch("They'll live", { burnout: -4, fan: { clubHappy: -10, super: -0.01 } },
        "Some cancel. Gloria doesn't. Gloria says it's fine. She walks an extra lap about it.")]),

    // ---- Scandals (who = the member who posted the dumb thing) ----
    card('scandal_gk_hairspray', 'fame', 'chase', 'The Hairspray Review', gb({}),
      'Chase posts an eleven-minute video reviewing hairsprays "by hold strength", ending with a ranking of every can since 1985. A hair ' +
      'salon chain calls him "a danger to the ozone". The comments are merciless.',
      [ch('Chase apologizes on camera', { buzz: -3, mood: { chase: -6 }, fan: { hater: -0.02 } },
        'He apologizes to the ozone. With perfect hair. Most people forgive him. Gloria mails a sympathy card and a travel-size can.'),
       ch('Double down: hair is rock', { buzz: 6, mood: { chase: 5 }, fan: { hater: 0.03 } },
        '"The ozone was fine in 1985." Half the next crowd chants it ironically. Half does not.'),
       ch('Switch to eco hairspray', { buzz: 4, chemistry: 3 },
        'Chase switches to a pump bottle. The hair drops half an inch. He posts a tribute to "the fallen inch". It is weirdly moving.')]),
    card('scandal_gk_riff_leak', 'fame', 'lenny', 'The Riff Leak', gb({}),
      "Lenny posts a clip of a new riff with the caption 'totally original'. Within an hour, a fan has posted it side by side with the " +
      "riff it sounds like. It is the Chartbusters ballad. Rex has reposted it with a scarf emoji.",
      [ch('Delete it. Quietly.', { buzz: -2, mood: { lenny: -5 }, chemistry: 3 },
        'Gone in ten minutes. The side-by-side is forever. Rex comments "cute, kid" and then deletes his own comment. Somehow worse.'),
       ch('Own it: every riff is a cousin', { buzz: 5, chemistry: -3, fan: { hater: 0.02 } },
        'Lenny posts an essay about how every riff is a cousin of another riff. Musicologists weigh in. It becomes a whole thing.'),
       bet('Challenge Rex to a riff-off', 'a feud, or a lesson', 'Lenny tags Rex and cracks his knuckles.', 0.5, null,
        { buzz: 8, mood: { lenny: 5 } }, "Rex does not reply. His guitarist Dusty does, with the ballad. Lenny's reply is original. The internet picks Lenny.",
        { buzz: -3, mood: { lenny: -6 } }, 'Rex replies with a video of forty thousand people singing the ballad. Lenny logs off for a week.')]),
    card('scandal_gk_floss_ad', 'fame', 'tamara', 'The Floss Endorsement', gb({}),
      "Tamara posted a flossing tutorial from the band account. It was sponsored by a floss brand. She forgot the #ad. A consumer " +
      "watchdog blog has written 900 words about 'the rock band shilling floss'. Tamara is mortified.",
      [ch('Tamara corrects the post', { buzz: -2, mood: { tamara: -4 }, fan: { hater: -0.02 } },
        'She adds #ad, a disclosure paragraph and a citation. The watchdog blog updates its post: "Handled with integrity." She frames it.'),
       ch('Chase flosses on stage', { buzz: 6, mood: { tamara: 4 } },
        'Chase flosses through an entire guitar solo, with feeling. The crowd cheers. Floss sales in Edmonton go up 30%.'),
       ch('Donate the fee to a dental clinic', { chemistry: 4, fan: { super: 0.01 } },
        'The fee goes to a free dental clinic downtown. Tamara volunteers there on Saturdays now. Nobody can stay mad at that.')]),
    card('scandal_gk_1985', 'fame', 'chase', '"It\'s Still 1985"', gb({}),
      "In a radio interview, Chase insisted it is still 1985 and would not be moved. The host asked about the internet. Chase said " +
      "'the what'. The clip is everywhere. People are unsure if it is a bit.",
      [ch('Confirm it is a bit', { buzz: 3, mood: { chase: -8 }, fan: { hater: -0.02 } },
        'Chase says it is a bit, then quietly asks Tamara what year it really is. She tells him. He does not believe her.'),
       ch('It is not a bit', { buzz: 8, mood: { chase: 6 }, fan: { hater: 0.03 } },
        'A 1985 appreciation account posts Chase as its mascot. Nobody is sure anymore. Chase has never been more sure.'),
       ch('Tamara issues a statement', { chemistry: 3, buzz: 4 },
        'Tamara releases a statement: "Chase is aware of the current year. He chooses 1985." It is the most respected press release of the year.')])
  ];
  P.scandals = [
    { card: 'scandal_gk_hairspray', who: 'chase' }, { card: 'scandal_gk_riff_leak', who: 'lenny' },
    { card: 'scandal_gk_floss_ad', who: 'tamara' }, { card: 'scandal_gk_1985', who: 'chase' }
  ];

  // ======================================================================================================================
  // LICENSING: the band's "employer" brand (Tamara's dental clinic) + its sellout scandal.
  // ======================================================================================================================
  P.brands = [
    { id: 'smile_centre', name: 'Sherwood Park Smile Centre', what: 'dental clinic ad', band: [B],
      blurb: "The dental clinic where Tamara cleans teeth. The ad is a slow-motion smile and a hygienist with a guitar. Tamara is the hygienist.",
      fee: [1500, 3000], genres: { rock: 3 }, sellout: 0.8, buzz: 4, reach: 0.01, speaker: 'tamara',
      takeFx: { mood: { tamara: -6 } },
      title: 'Your Employer Is Calling',
      offer: 'The Sherwood Park Smile Centre wants "{adsong}" for a regional ad: a slow-motion smile, a floss montage, a hygienist nodding along. ' +
        '{adfee}. The hygienist in the storyboard is Tamara. Dr. Bhullar did not ask. Tamara is pale.',
      take: 'The ad runs during the hockey. Patients hum the chorus in the chair. Tamara now cleans teeth to her own bass line. She wants to be swallowed by a spittoon.',
      decline: 'You pass. Tamara hugs everyone, one by one. Dr. Bhullar gives the spot to a harpist. Tamara sends the harpist floss.',
      counterWin: 'The clinic pays up. Dr. Bhullar calls it "an investment in smiles". Tamara scrubs a counter for an hour.',
      counterWalk: 'The clinic pulls out. Tamara is so relieved she cleans three patients in a row without mentioning the band.',
      expire: 'The Smile Centre went with a harp. Tamara has never been happier at work.' }
  ];
  P.licenseCards = [
    card('lic_scandal_leather', 'fame', 'chase', 'Leather Pants Sold Out', gb({}),
      'A rock forum thread: "GRAVEL KINGS SOLD THE RIFF TO {brand}". Someone made a meme of Chase in a business suit over the leather ' +
      "pants, with a price tag on the mullet. It is everywhere. Chase has read every comment. Twice. Out loud.",
      [ch('Chase explains on camera', { buzz: 2, mood: { chase: -6 }, fan: { hater: -0.02 } },
        "Fourteen minutes about the cost of hairspray and van tires. It is honest. It is long. Most people forgive him."),
       ch('"The pants got paid"', { buzz: 7, mood: { chase: 4 }, fan: { hater: 0.02 } },
        'Chase prints it on a shirt. It sells out. The forum is furious that it sold out. It sells out again.'),
       ch('Donate some to the mall-walkers', { fund: -250, chemistry: 3, fan: { super: 0.01 } },
        'The Early Birds Walking Club gets new benches for the rest stops. Gloria cuts the ribbon. The forum moves on to a polka band.')])
  ];
  P.licenseScandals = [{ card: 'lic_scandal_leather', who: 'chase' }];

  // ======================================================================================================================
  // STUDIO EVENTS (GG.content.studioEvents; drawn per studio week; band-gated).
  // ======================================================================================================================
  P.studioEvents = [
    card('studio_gk_riff_flag', 'drama', 'lenny', 'The Engineer Stops the Tape', gb({}),
      "Two bars into Lenny's riff the engineer stops the tape. 'Sorry. That's... isn't that...?' He hums a famous song. Lenny closes " +
      "his eyes. 'It came out of me,' he says quietly. 'It always comes out of me.'",
      [ch('Lenny writes a new one, now', { skill: { lenny: 1 }, production: 3, mood: { lenny: -4 } },
        'He sits in the booth for an hour and comes out with something nobody has heard. The engineer checks. Nobody has heard it.'),
       ch('Keep the take', { production: 2, buzz: 4 },
        'You keep it. The engineer writes "LEGAL?" on the track sheet with a question mark and a small skull.'),
       ch('Tamara checks the app', { production: 1, mood: { tamara: 4 } },
        'Tamara runs it through the matching app. 71%. "Under the threshold," she says. There is no threshold. Everyone relaxes anyway.')],
      { once: false, cooldown: 10 }),
    card('studio_gk_wind_machine', 'weird', 'chase', 'Wind Machine in the Booth', gb({}),
      "Chase has brought a wind machine into the vocal booth. 'The hair needs to move for the vocal to be true.' The microphone is " +
      'picking up a hurricane. The engineer is picking up his coat.',
      [ch('Let the hair move', { production: -2, mood: { chase: 8 } },
        'The take is full of wind noise. The vocal is incredible. The engineer calls it "atmospheric". He means windy.'),
       ch('Wind machine off, fan on low', { production: 3, chemistry: 2 },
        'A desk fan on low. The hair moves slightly. Chase says it is "enough to believe in". The vocal is clean and great.'),
       ch('Record in the parking lot', { production: -3, buzz: 6 },
        'Chase sings into a mic stand in the parking lot in the real wind. It is minus twenty. It is the take. You can hear his breath.')],
      { once: false, cooldown: 12 }),
    card('studio_gk_one_take', 'drama', 'tamara', 'Tamara Leaves at Nine', gb({}),
      "Tamara has a 7 a.m. cleaning. She is tracking her bass parts tonight in one take each and leaving at nine. It is 8:40. There " +
      'are four songs left. She is warming up with a metronome and a granola bar.',
      [ch('One take each, go', { production: 3, mood: { tamara: 6 } },
        'Four songs, four takes, zero mistakes. She is out the door at 8:59 with her bass and her granola bar. The engineer applauds.'),
       ch('Ask her to stay late', { production: 2, mood: { tamara: -8 }, burnout: 5 },
        'She stays until midnight, perfect every take, silent. At 7 a.m. she cleans teeth with a thousand-yard stare.'),
       ch('Finish them next week', { production: -1, burnout: -4 },
        'She leaves at nine. The songs wait. The band orders pizza and listens back. Everyone agrees the bass is the best part.')],
      { once: false, cooldown: 10 }),
    card('studio_gk_cassette_master', 'weird', 'chase', 'The Cassette Master', gb({}),
      "Chase wants the album mastered to cassette first, 'for warmth', then transferred back to digital. The engineer says that is " +
      "the opposite of mastering. Chase has brought his boom box. It is plugged into the console.",
      [ch('Master it to cassette', { production: -2, buzz: 5, mood: { chase: 8 } },
        'The album has a warm hiss and one tiny tape warble in track four. Reviewers call it "authentic". Chase calls it "1985".'),
       ch('Keep the digital master', { production: 3, mood: { chase: -5 } },
        'The master is clean and loud. Chase listens to it on the boom box anyway, from a cassette he dubbed himself. He is satisfied.'),
       ch('Hidden cassette bonus track', { production: 1, buzz: 3 },
        'The album is digital; the merch table sells a cassette with a secret track of Chase saying "1985 forever" for forty seconds.')],
      { once: false, cooldown: 12 }),
    card('studio_gk_modern_sound', 'drama', 'lenny', 'A Modern Sound', gb({}),
      "The producer wants 'a modern sound': drum samples, a click track, vocals tuned to perfection. Chase is appalled. Lenny is " +
      "intrigued. The drum samples came pre-installed. They sound a lot like Steve #5.",
      [ch('Real drums, real everything', { production: 2, drumSkill: 1 },
        'You play every take for real. The producer admits it sounds "alive". He keeps a copy for himself.'),
       ch('A little modern', { production: 3, chemistry: 2 },
        "A click track, no tuning. The songs are tight. Chase is allowed one untouched scream per song. He uses them well."),
       ch('Fully modern', { production: 4, mood: { chase: -8 } },
        'Polished, pristine, radio-ready. It sounds like everyone. Chase refuses to listen to the playback. He waits in the van.')],
      { once: false, cooldown: 10 }),
    card('studio_gk_radio_call', 'scene', 'cb_rex', 'A Call to the Studio', gb({}),
      "The studio phone rings. It is Rex Glamour. 'Heard you're recording, kid. My stations will need a clean edit, no swearing, no " +
      "songs about radio, no leather. You know. Standards.' He hangs up before anyone can answer.",
      [ch('Write a song about radio', { production: 2, buzz: 6, mood: { chase: 6 } },
        '"Turn Off Your Radio (It\'s Rex)" is written in forty minutes and recorded in one take. It is the angriest song on the album.'),
       ch('Make the clean edit', { production: 1, fans: 20 },
        'A clean edit for the stations. Rex never plays it. The campus stations play the other one. Both exist, forever.'),
       ch('Ignore him. Record.', { production: 3, chemistry: 3 },
        'You record. The phone rings twice more. Tamara unplugs it. The session is the best week of the year.')],
      { once: false, cooldown: 12 }),
    card('studio_gk_vacuum_motor', 'weird', 'lenny', "Gus's Amp", gb({}),
      "Lenny's amp is the one Gus fixed with a vacuum motor. On tape it has a faint whoosh under every note. The engineer wants to know " +
      "what it is. Lenny says it is 'his tone'. Technically, it is a vacuum.",
      [ch('Keep the whoosh', { production: 2, mood: { lenny: 6 } },
        'The whoosh is on every track. A gear forum spends a year trying to identify the pedal. There is no pedal. It is Gus.'),
       ch('Rent a studio amp', { production: 3, fund: -150 },
        'A studio amp, clean and loud. Lenny plays it beautifully. He calls Gus afterwards to apologize. Gus says "I understand".'),
       ch('Credit Gus on the album', { production: 1, chemistry: 4 },
        'The liner notes read: "Vacuum motor by Gus\'s Vacuum Hospital, Westgate Plaza." His business triples. He sends a fruit basket.')],
      { once: false, cooldown: 12 })
  ];

  // ======================================================================================================================
  // DRAMA (drama.members + dramaCards). Want rules from 27_sim_drama: eighties (Chase), lawsuit (Lenny), adulting (Tamara).
  // ======================================================================================================================
  function mx(extra, id, act) { var o = { member: { id: id, act: act } }; for (var k in extra) o[k] = extra[k]; return o; }
  P.drama = {
    chase: {
      wants: [
        { id: 'eighties', text: 'For it to be 1985: rock rooms, big hair, a buzz you can feel in your leather.', gripe: 'the band forgetting 1985', rule: 'eighties' },
        { id: 'spotlight', text: 'The spotlight. A knee slide in every set. The biggest letters on the poster.', gripe: 'the spotlight', rule: 'spotlight' }
      ],
      grumble: [
        'Just saying: the poster font is from the 2000s. I can tell.',
        'Nobody knee-slid last night. Nobody. Was I the only one who came to rock?',
        'Someone put my cassettes in alphabetical order. That is not how you order cassettes.'
      ],
      passive: [
        'Great show everyone!! Loved how we played it safe. Very modern. 🙂',
        "Totally fine that the fog machine is 'on a timer' now. Rock loves timers. 🙂",
        "An eighties tribute band from Lethbridge followed me. Unrelated. See you Tuesday. Probably."
      ],
      ultimatum: 'ult_chase', 'return': 'ret_chase', returnFilled: 'ret_chase_filled',
      exit: {
        id: 'tribute', returnAfter: [14, 24],
        status: 'Fronting Hairspray Nation, an eighties tribute act, in casino lounges. They cover 1987. He has noticed.',
        quitLine: { who: 'chase', text: 'Joined Hairspray Nation. Tribute act. Casino lounges. They respect the hair. Keep it 1985 without me. You cannot.' },
        beats: [
          { at: 3, who: 'gk_reporter', text: "Arts brief: Hairspray Nation's new singer does a knee slide at a casino buffet. Two shrimp trays lost." },
          { at: 8, who: 'chase', text: 'They only play songs from 1987. 1987. Two years too late. I sing them like it is 1985. Nobody notices. I notice.' },
          { at: 13, who: 'gloria_mallwalk', text: 'Saw Chase at the casino. He sang to me. He looked tired. His hair looked tired. Come home, Chase.' }
        ],
        changed: 'Back from the tribute circuit. Now knows every song from 1987 and refuses to admit it.',
        backLine: { who: 'chase', text: 'It was 1987 in there. Two years too late. I am back. It is 1985 again. I brought the good hairspray.' }
      },
      epilogue: 'Chase opens a leather repair shop in St. Albert. It is 1985 inside. The sign says so.'
    },
    lenny: {
      wants: [
        { id: 'lawsuit', text: "One riff the lawyers don't call about. Songs that sound like nobody. Some peace.", gripe: 'the lawyers', rule: 'lawsuit' },
        { id: 'solos', text: 'A real solo in every set. Original, if possible. Ideally.', gripe: 'solos', rule: 'solos' }
      ],
      grumble: [
        'Got another voicemail today. It was just someone humming. I knew the song. It was mine. It was also theirs.',
        'Can we please not play the one that sounds like the other one tonight. My phone is on.',
        'Nobody asked, but my solo got cut to four bars. Four. I counted in E.'
      ],
      passive: [
        'Great show everyone!! Loved the part where we played the riff Bryce Pruitt hums. 🙂',
        "No, it's fine. I'll just play the parts nobody can sue. The silent parts. 🙂",
        'A jingle house in Calgary called. Just saying. They pay per jingle. Anyway.'
      ],
      ultimatum: 'ult_lenny', 'return': 'ret_lenny', returnFilled: 'ret_lenny_filled',
      exit: {
        id: 'jingles', returnAfter: [12, 22],
        status: 'Writing jingles in a Calgary ad house. Every jingle sounds like a famous jingle. The ad house has a lawyer now.',
        quitLine: { who: 'lenny', text: 'Took a jingle job in Calgary. Thirty seconds, fewer lawyers. Probably. Keep the riffs original.' },
        beats: [
          { at: 3, who: 'gk_dj', text: 'Heard a new jingle for a car wash in Calgary. It rips. It also sounds like a famous riff. Lenny, is that you?' },
          { at: 8, who: 'gk_lawyer', text: 'Courtesy call: the car-wash jingle is, and I mean this kindly, extremely familiar. Please tell Lenny I miss him.' }
        ],
        changed: 'Back from jingle work. Can now write a hook in thirty seconds, and flinches at car washes.',
        backLine: { who: 'lenny', text: 'Thirty-second songs get sued just as much. I am back. I brought a riff. I checked it. Twice. It is mine.' }
      },
      epilogue: 'Lenny wins a songwriting award for an original riff. The lawyers send flowers. Only two of them.'
    },
    tamara: {
      wants: [
        { id: 'adulting', text: 'Everyone home by midnight. A savings account. Short drives, full tanks, flossed teeth.', gripe: 'adulting', rule: 'adulting' },
        { id: 'freedom', text: 'Fewer back-to-back nights. Sleep. One weekend a month with no van.', gripe: 'being worked like a rented mule', rule: 'freedom' }
      ],
      grumble: [
        'Reminder that I clean teeth at 7 a.m. and we got home at 3:40. I have logged it.',
        'The band fund has $11 in it. I have also logged that. With a sad face.',
        'Someone left the fog machine on in the van. The van is now a cloud. A cloud I drive.'
      ],
      passive: [
        'Great show everyone!! Loved driving six hours home in the dark while everyone slept. 🙂',
        'No, no, the receipts will sort themselves. They always do. (They do not.) 🙂',
        'Dr. Bhullar offered me full-time. With benefits. Just mentioning it. For no reason.'
      ],
      ultimatum: 'ult_tamara', 'return': 'ret_tamara', returnFilled: 'ret_tamara_filled',
      exit: {
        id: 'fulltime', returnAfter: [12, 22],
        status: 'Full-time at the Sherwood Park Smile Centre. Home by six. Asleep by ten. Suspiciously well-rested.',
        quitLine: { who: 'tamara', text: 'I took the full-time job. I will still do the band taxes, as a treat. The van keys are on the till. Drive safe. Floss.' },
        beats: [
          { at: 3, who: 'gk_dentist', text: 'Tamara is our best hygienist. She hums basslines while scaling. Patients have asked about the band.' },
          { at: 8, who: 'tamara', text: 'Slept eight hours again. Very rested. The clinic radio plays one Chartbusters song on a loop. Please. Call me.' }
        ],
        changed: 'Back from full-time hygiene. Rested, organised, and now carries a pocket scaler "for emergencies".',
        backLine: { who: 'tamara', text: 'The clinic radio played the ballad 400 times. I am back. I have the keys. Everyone home by midnight.' }
      },
      epilogue: 'Tamara opens her own clinic. The waiting-room music is the band. Patients floss out of respect.'
    }
  };

  P.dramaCards = [
    card('ult_chase', 'drama', 'chase', 'Chase Has Demands', gb({}),
      "Chase arrives with a typed list on hotel letterhead from a hotel he has never stayed in. Item one: a wind machine. Item two: a " +
      "knee slide in every set. Item three: 'RESPECT FOR 1985'. An eighties tribute act has 'expressed interest'.",
      [ch('Buy the wind machine ($150)', mx({ fund: -150, mood: { chase: 15 } }, 'chase', 'settle'),
        'Unit 4B now has weather. The nail salon complains about the draft. Chase has never been happier. His hair has never been bigger.'),
       ch('A knee slide every set', mx({ burnout: 4, buzz: 3, mood: { chase: 12 } }, 'chase', 'settle'),
        'Every set now has a knee slide. The pants take the damage. Tamara buys knee pads and sews them inside. He never knows.'),
       ch('Call his bluff', mx({ chemistry: -4 }, 'chase', 'quit'),
        "Chase folds the list into a paper airplane and throws it at the till. 'Hairspray Nation respects me.' The door closes on his scarf.")]),
    card('ult_lenny', 'drama', 'lenny', 'Terms and Conditions', gb({}),
      "Lenny has made a slideshow. Slide one: every voicemail, as a bar chart. Slide two: a lawyer's retainer quote. Slide three: " +
      "'A jingle house in Calgary wants me. Thirty seconds. Fewer lawsuits.' He looks exhausted.",
      [ch('Put a lawyer on retainer ($180)', mx({ fund: -180, mood: { lenny: 15 } }, 'lenny', 'settle'),
        'A real lawyer, for real riffs. Lenny sleeps through the night for the first time in two years. He wakes up and writes a solo.'),
       ch('A solo in every set', mx({ burnout: 5, mood: { lenny: 12 } }, 'lenny', 'settle'),
        'Sets run longer. Every solo is original, painfully so. Chase introduces each one. Everyone is tired and nobody can say why.'),
       ch('Tell him to go to Calgary', mx({ chemistry: -4 }, 'lenny', 'quit'),
        "He packs the guitar and the amp Gus fixed. 'Thirty seconds,' he says. 'Nobody sues a car-wash jingle.' Somebody will.")]),
    card('ult_tamara', 'drama', 'tamara', 'Tamara Has a Spreadsheet', gb({}),
      "Tamara has a spreadsheet. Tab one: hours driven. Tab two: hours slept. Tab three: 'Dr. Bhullar's full-time offer, with dental'. " +
      "She has highlighted a cell in red. The cell says MIDNIGHT.",
      [ch('Home by midnight, always', mx({ burnout: -8, mood: { tamara: 12 } }, 'tamara', 'settle'),
        'Tamara writes MIDNIGHT on the whiteboard and underlines it. Rehearsals end at 11:30 with a mandatory floss break.'),
       ch("Raise the band's cut (+5%)", mx({ payCut: 0.05, mood: { tamara: 12 } }, 'tamara', 'settle'),
        'She reads the new pay sheet, nods, and adds it to the spreadsheet. Everybody gets a raise. Chase notices. Lenny notices more.'),
       ch('We need you on the road', mx({ chemistry: -4 }, 'tamara', 'quit'),
        "Tamara puts the van keys on the till counter. 'I'll still do the taxes,' she says. 'As a treat.' She floats out. You are driving now.")]),
    card('ret_chase', 'drama', 'chase', 'The Return of the Mullet', gb({}),
      "Chase is in the Westgate parking lot in full leather, holding a boom box over his head. 'It was 1987 in there,' he says. " +
      "'Two years too late.' He looks at the empty mic stand in the window of Unit 4B.",
      [ch("Welcome back, it's 1985", mx({ chemistry: 4 }, 'chase', 'return'),
        'He knee-slides from the door to the mic stand. It is twelve metres. The band feels complete. The nail salon feels the floor shake.'),
       ch('Audition first', mx({ mood: { chase: -8 }, skill: { chase: 2 } }, 'chase', 'return'),
        'He auditions with a nine-minute ballad about a casino buffet. He gets the gig. He would like it known he was nervous.'),
       ch('Not yet, Chase', mx({ mood: { chase: -5 } }, 'chase', 'later'),
        'He nods, leaves the boom box on the till and waits in the parking lot. For weeks. Darrell tickets him daily. He pays in cassettes.')]),
    card('ret_chase_filled', 'drama', 'chase', 'Two Frontmen', gb({}),
      "Chase is back from the tribute circuit, leather jacket over one arm. He sees {recruit} at his mic stand, in HIS spot, by the " +
      "till. 'Oh,' he says. Somewhere in Vancouver, a man in a scarf is already dialling.",
      [ch('Take Chase back', { member: { id: 'chase', act: 'return' } },
        "{recruit} takes it well and leaves a thank-you card. Chase reads it aloud, as a power ballad. Unit 4B is 1985 again."),
       ch('Keep {recruit}', mx({ mood: { recruit: 8 } }, 'chase', 'rival'),
        'Chase sweeps out. Two weeks later {rival} announce a new hype man: Chase Vanderhoek, in a scarf. They send you the scarf.')]),
    card('ret_lenny', 'drama', 'lenny', 'Thirty Seconds Is Not Enough', gb({}),
      "Lenny is in the doorway of Unit 4B with his guitar and a stack of car-wash jingles. 'They sued the jingles too,' he says. 'I " +
      "need to write something long enough to be mine.'",
      [ch('Plug in, Lawsuit', mx({ chemistry: 4 }, 'lenny', 'return'),
        'He plugs in and plays a riff nobody has ever heard. Not even Bryce Pruitt, who is on speakerphone. It is good to have him back.'),
       ch('Only original riffs', mx({ mood: { lenny: -8 }, skill: { lenny: 2 } }, 'lenny', 'return'),
        'He agrees. He brings a notebook of riffs, each one checked by Tamara on the app. The band is legally spotless. And a bit quieter.'),
       ch("We're good for now", mx({ mood: { lenny: -5 } }, 'lenny', 'later'),
        'He nods and practises in the loading dock. Every riff he plays out there is original. It takes the dumpster to bring it out.')]),
    card('ret_lenny_filled', 'drama', 'lenny', 'Whose Riff Is It?', gb({}),
      "Lenny is back from Calgary. {recruit} is playing his guitar parts, note for note. Lenny listens for a while and makes a face. " +
      "'That riff,' he says. 'You play it like it's yours. It isn't. It isn't mine either. Long story.'",
      [ch('Take Lenny back', { member: { id: 'lenny', act: 'return' } },
        '{recruit} is gracious. Lenny re-tunes everything {recruit} touched, then writes a riff for them as a going-away present.'),
       ch('Keep {recruit}', mx({ mood: { recruit: 8 } }, 'lenny', 'rival'),
        "Lenny leaves without a word. A month later {rival}'s new single has a riff that sounds exactly like a Lenny riff. It is Lenny.")]),
    card('ret_tamara', 'drama', 'tamara', 'The Clinic Radio', gb({}),
      "Tamara is at the shop door with her bass and a thermos. 'The clinic radio plays one song on a loop. The ballad. I have " +
      "heard it four hundred times.' She holds out her hand for the van keys.",
      [ch('Welcome back, T-Bone', mx({ chemistry: 4 }, 'tamara', 'return'),
        'She takes the keys, adjusts every mirror and re-files every receipt from her absence. The band exhales for the first time in months.'),
       ch('Only if the curfew is 1 a.m.', mx({ mood: { tamara: -8 } }, 'tamara', 'return'),
        'She agrees to 1 a.m. She arrives at 11:59 every night to remind you. It is effective. It is haunting.'),
       ch('Not yet', mx({ mood: { tamara: -5 } }, 'tamara', 'later'),
        'Tamara nods, leaves a folder of your taxes on the till, and goes back to the clinic. The folder is perfect. You miss her.')]),
    card('ret_tamara_filled', 'drama', 'tamara', 'The Bass Spot', gb({}),
      "Tamara is back, bass case in one hand, van keys in the other. {recruit} is in her spot, playing her parts, using her strap. She " +
      "reads the setlist taped to the amp. It is not in her handwriting. She notices.",
      [ch('Take Tamara back', { member: { id: 'tamara', act: 'return' } },
        '{recruit} understands. Tamara gives {recruit} a floss kit and a reference letter. She is back at the wheel by Tuesday.'),
       ch('Keep {recruit}', mx({ mood: { recruit: 8 } }, 'tamara', 'rival'),
        "Tamara leaves politely. {rival} hire her as their tour accountant the next week. Their receipts have never been so clean.")])
  ];

  // ======================================================================================================================
  // AWARDS: outfit cards (first passing wins; riffOriginal routes), the speech, Worst Van, carpet lines, win/lose, nominees.
  // ======================================================================================================================
  function ofx(extra, outfit) { var o = { flags: { loonieOutfit: outfit } }; for (var k in extra) o[k] = extra[k]; return o; }
  P.outfits = { leather: 'The leather pants, obviously', courtsuit: 'The leather court suit' };
  P.outfitCards = [
    card('loonie_outfit_gk_courtsuit', 'fame', 'lenny', 'The Carpet: Court Suit', gb({ flags: ['riffOriginal'] }),
      "Lenny wants to wear the suit he wore to court, the day his riff became his own. Chase wants to wear the leather suit he bought " +
      "'in solidarity'. They want to walk the carpet together, like a legal team.",
      [ch('The legal team walks', ofx({ buzz: 10, mood: { lenny: 8 } }, 'courtsuit'),
        'Photographers shout "LAWSUIT!" and Lenny, for once, smiles. The court suit is Best Dressed on a blog run by a paralegal.'),
       ch('Lenny in the court suit, alone', ofx({ fans: 120, mood: { lenny: 10, chase: -4 } }, 'courtsuit'),
        'Lenny walks the carpet alone in the suit. Someone asks about the riff. He says "it is mine". It is the quote of the night.'),
       ch('Everyone in leather', ofx({ buzz: 8, chemistry: 4 }, 'leather'),
        'Four people in leather. Tamara wears it with a cardigan. The carpet squeaks for a full minute. Nobody forgets it.')]),
    card('loonie_outfit_gk_leather', 'fame', 'chase', 'The Carpet: The Leather', gb({ notFlags: ['riffOriginal'] }),
      "Chase has had the leather pants professionally conditioned for the Loonies. A saddlery did it. He wants a matching leather " +
      "jacket, a wind machine on the carpet and 'no scarves within ten metres'. Chartbusters are right behind you.",
      [ch('The leather, as intended', ofx({ buzz: 8, mood: { chase: 8 } }, 'leather'),
        'Forty photographers shout "CHASE!" at once. He walks the carpet in slow motion without a wind machine. Somehow the hair moves.'),
       bet('Bring the wind machine', 'fashion, or chaos', 'Gus drives the wind machine to the arena in his van.', 0.5, 'buzz',
        ofx({ buzz: 14, fans: 150 }, 'leather'), 'The hair goes horizontal. The photos are legendary. Rex Glamour\'s scarf blows off his neck. Justice.',
        ofx({ buzz: 5, fund: -300, mood: { chase: -6 } }, 'leather'), "The wind machine blows the step-and-repeat into the crowd. $300. The photo of the night is Rex, laughing."),
       ch('A rented tux, just once', ofx({ fans: 100, mood: { chase: -8 } }, 'tux'),
        "He looks like a man at his cousin's wedding, which he says is 'the darkest look possible'. He wears the leather underneath.")])
  ];
  P.speech = card('loonie_speech_gravel_kings', 'fame', 'chase', 'The Speech', gb({}),
    "They said your name. The band is on stage holding a loonie the size of a hubcap. Chase, for once in his life, hands you the mic. " +
    "Tamara checks her watch. You have thirty seconds before the music plays you off.",
    [ch('Thank your mom', { fans: 120, chemistry: 6, mood: { all: 6 }, chat: { who: 'mom', text: 'I was the one crying in row M. Tamara gave me a tissue.' } },
      "You thank your mom for the loan, the rides and the lasagna. The camera finds her in row M, holding a sign: 'THAT'S MY KID'."),
     ch('Thank Westgate Plaza', { buzz: 14, fans: 80 },
      "'And most of all: Unit 4B. Trinh. Gus. Mr. Petrenko. Darrell.' Silence. Then someone yells 'WESTGATE!' and the arena chants it."),
     bet('Take a shot at Chartbusters', 'roast, or roasted', 'You lean into the mic and find their table. The scarves.', 0.55, 'buzz',
      { buzz: 16, fans: 200, flags: { rivalFeud: true } }, "'Rex, buddy: nice scarf. It's July somewhere.' The room explodes. Rex laughs hardest. Moira takes a note.",
      { buzz: -6, mood: { all: -4 }, flags: { rivalFeud: true } }, 'It lands wrong. Rex stands and applauds you, magnanimously. Now you are the villain. A scarf is waiting at the hotel.')]);
  P.speechWorstVan = card('loonie_speech_van_gravel_kings', 'fame', 'tamara', 'Worst Van', gb({}),
    "You won Worst Van. {van} is parked outside with a panther half-painted on one side and a dental-clinic molar on the other. " +
    "Someone has to accept. Tamara, who has driven every kilometre at exactly the limit, stands up.",
    [ch('Let T-Bone accept it', { buzz: 10, chemistry: 6, mood: { tamara: 10 } },
      'Tamara accepts, thanks the tires by brand name, reminds the room to check their tire pressure, and sits down. Standing ovation.'),
     ch('Thank the van by name', { buzz: 8, fans: 60, mood: { all: 4 } },
      'You thank {van} by name. A mechanic in the crowd yells "THE TRANSMISSION, THOUGH". Tamara nods grimly. She knows.'),
     ch('Chase accepts, somehow', { fans: 120, mood: { chase: 6, tamara: -4 } },
      "Chase, who has never been allowed to drive it, gives a nine-minute speech about 'his' van. Tamara takes the trophy back in the lobby.")]);
  // (role aliases, so whoever is in the band that year walks the carpet: Chase, T-Bone and Lenny while they're in it)
  P.carpet = [
    { who: 'reporter', text: 'Who are you wearing tonight?' }, { who: '@front', text: 'Leather. 1985 leather. The leather is wearing the year.' },
    { who: 'reporter', text: 'Any predictions?' }, { who: '@deadpan', text: 'We lose to the scarves, we get home by midnight. I have planned for both.' },
    { who: 'reporter', text: 'And the riff?' }, { who: '@soloist', text: 'No comment on the riff. Our lawyer is in row twelve. Hi, Bryce.' }
  ];
  P.awardWin = ['Chase is already on stage. He knee-slid there. Nobody saw him move.',
    'Tamara hugs the trophy, then checks it for chips. Lenny calls his lawyer from the stage, just to share.',
    'Lenny holds the trophy up like a riff nobody can sue. The arena roars.'];
  P.awardLose = ['Chase applauds with his whole mullet, which is a lot of applause.',
    'Tamara whispers that the winners were twelve seconds over time. It does not help. It helps a little.',
    'Lenny hums the winning song. It sounds like his song. He decides not to mention it.'];
  P.nominees = ['Highway 2 Heartache', 'The Leather Horizon', 'Pipeline Prophets', 'Neon Parkade', 'Chinook Thunder',
    'The Yellowhead Kings', 'Rig Pig Rhapsody', 'Last Call at the Legion'];
  P.rivalThanks = [
    'First, a shout-out to {band}. Cute band. Reminds me of us, in 1994. Keep at it, kids. This {category} is for the scarf.',
    "We want to thank our fans, our label (it's us), our stations (also us) and {band}, who gave us a real scare. Almost.",
    'Thirty years, one song, and still they give us {category}. {band}, you will get one someday. Probably after we retire. Again.',
    "Special thanks to {band}. Their leather pants inspired a whole new scarf. Moira, get the kid a scarf.",
    "To {band}: we heard you. On campus radio. At 3 a.m. Beautiful stuff, kid. Almost made the playlist."
  ];
  P.rivalLoses = [
    'Chartbusters give you a standing ovation. Rex throws you his scarf from across the room. It lands on Chase. He keeps it.',
    'A scarf is waiting on your seat when you come back. The card says: "Well played, kids. Legacy is patient. — R." It was bought in advance.',
    "Rex shakes your hand for a long time. 'Enjoy it, kid. The radio will still be ours on Monday.' Moira is already dialling."
  ];

  // ======================================================================================================================
  // LINES: member-keyed pools (lines.<pool>[memberId]) and the band pools (lines.byBand.gravel_kings). Lines ≤ 140 chars.
  // ======================================================================================================================
  P.memberLines = {
    chat: {
      chase: {
        happy: ['ROCK AND ROLL. That is the whole message.', 'Just did forty knee slides in the parking lot. For practice. Darrell clapped.',
          'Found a jean jacket at the thrift store. It has a panther on the back. The panther found me.', 'Big night tonight. Wind machine is charged. Hair is ready.'],
        ok: ['Rehearsal at 7. I will arrive at 7:15, dramatically, through the loading dock.', 'Reminder: in Unit 4B it is 1985. Phones stay in pockets.',
          'Who used my hairspray. There was a whole can. It was a big can.', 'Tamara says I need to floss. I am flossing. It is not rock and roll.'],
        grumpy: ['Some of us came to ROCK. Some of us came to be home by midnight.', 'Nobody knee-slid last night. I saw. I see everything.',
          'The poster font is from 2004. I can FEEL it.', 'The fog machine timer went off mid-chorus. I have questions for whoever set it.'],
        sulking: ["(Chase has renamed the group chat 'CHASE AND THE OTHERS')", 'I will be at the payphone. Do not call. It cannot receive calls.',
          'Drafting my solo career. It is 1985 in there too. You are not invited.', 'An eighties tribute act called me. I have not said no. I have not said anything.']
      },
      lenny: {
        happy: ['Wrote a riff today. Checked it on the app. 8% match. EIGHT.', 'New strings, new pick, no voicemails today. Is this what peace feels like?',
          'Found a used overdrive in Leduc. It sounds like nobody. I love it.', 'Played the new riff for Gus. He said "never heard that one". Best review ever.'],
        ok: ['Rehearsal ok. Phone buzzed twice. Ignored both. Growth.', "Can we tune down a half step? Asking for a riff that isn't anyone's yet.",
          'Reminder: nobody hum anything near my amp. I pick it up. Then I play it. Then a lawyer calls.', 'Restringing. Back in 30.'],
        grumpy: ['Another voicemail. Just humming. I know the tune. That is the problem.', 'My solo got cut to four bars. I counted. In E.',
          'Someone played "Everything Tonight" in the van. On purpose. I have questions.', "If the band isn't paying for a lawyer, I am. With my rent money."],
        sulking: ['A jingle house in Calgary messaged me. Just saying.', 'Playing scales in the loading dock until one of them feels original.',
          "Don't need a band to get sued.", 'Turned my phone off. It rang anyway. I do not know how.']
      },
      tamara: {
        happy: ['Band fund balanced to the cent. I am so happy I could floss.', 'Everyone home by 11:52 last night. New record. Gold stars all round.',
          'Found a gas station with cheap diesel AND clean washrooms. Adding it to the map.', 'Receipts sorted, van inspected, teeth cleaned. Great week.'],
        ok: ['Rehearsal 7 to 10. 10 means 10.', "Reminder: the van needs an oil change Thursday. I booked it. You're welcome.",
          'Please put receipts in the shoebox. The shoebox, Chase. Not your jacket.', 'On shift at the clinic till 5. Back for sound check.'],
        grumpy: ['We got home at 3:40. I clean teeth at 7. I have logged it.', 'The band fund has $11 in it. I have also logged that.',
          "Someone left the fog machine running in the van. I drove through a cloud. My own van's cloud.", 'Who used the gas card for hairspray. I know who.'],
        sulking: ["Dr. Bhullar offered me full-time. With dental. I'm thinking about it.", 'I will be sorting receipts. Alone. Do not call.',
          'Updated my resume. No reason.', "Parked the van. Keys are on the till. I'm going home. On time."]
      }
    },
    gigReactions: {
      chase: {
        great: ['THAT is what 1985 felt like. I was there. Tonight I was there again.', 'Knee slide: twelve metres. Crowd: deafening. Pants: holding.',
          'They sang the chorus back to me. I will need a moment. And a mirror.'],
        ok: ['Decent. The hair did its job. The crowd did most of theirs.', 'Good, not great. We needed more fog. We always need more fog.',
          'Solid show. Somebody in the front row had a mullet. It was a sign.'],
        bad: ['The monitor was a lie. The room was a lie. 1985 would never.', 'Nobody moved. I knee-slid into silence. That sound will haunt me.',
          'That crowd was from the future. The bad future.']
      },
      lenny: {
        great: ['I played my riff and nobody looked at their phone to check it. Best night ever.', 'Solo went long. Crowd went with it. Lawyers stayed home.',
          'The riff hit. Everyone felt it. Original, tonight, I think.'],
        ok: ['Fine. My amp whooshed during the quiet part. Gus will be proud.', 'Tight enough. I kept it original. Mostly.', 'Good crowd, bad monitors. Next time.'],
        bad: ["I flubbed the riff. Honestly? Maybe it's a sign.", 'Someone yelled the name of a famous band during my solo. Rude. Accurate.',
          'My hands froze in the load-in. They did not unfreeze until the encore.']
      },
      tamara: {
        great: ['Great set. Also: we are home by 12:30. Double win.', 'Paid in full, merch up 40%, van parked legally. Beautiful night.',
          'That crowd was so loud my earplugs asked for earplugs.'],
        ok: ['Solid. The door count was off by six. I will find them.', 'Fine show. The bass cut out once. I was not the cause. I checked.',
          "Not bad. Let's pack fast, we have a four-hour drive."],
        bad: ['Rough one. Pay was light. I will be having a word with the promoter.', 'We rushed every song. Chase, I say this with love: breathe.',
          "Let's just get home safe. We'll talk about it tomorrow. In the minutes."]
      }
    },
    tap: {
      chase: ["It's 1985 in here, man. Always will be.", 'Wanna see a knee slide? Too late. Already did one.', 'This? The future brick. I use it ironically.',
        'Hairspray is not a product. It is a commitment.', 'Do not touch the boom box. It knows my moods.', 'Leather pants at minus forty. It is about sacrifice.'],
      lenny: ['Shh. Working on a riff. A new one. Brand new. Please be brand new.', "If my phone rings, I'm not here. Legally.",
        'Does this sound like anything to you? Be honest. No, be less honest.', 'Gus fixed my amp with a vacuum motor. Listen. Whoosh.',
        "Every riff sounds like something. That's what riffs do. Right? Right?", 'I have 212 voicemails. I have listened to none of them.'],
      tamara: ['Have you flossed today? You have not. I can tell.', 'Receipts in the shoebox, please. The shoebox.', 'The van is fuelled, checked and parked facing out. Always.',
        "Band fund's up $40 this week. Don't tell Chase.", 'I did the taxes for fun. Also yours. You owe $12.', 'Home by midnight. That is not a suggestion.']
    },
    songReactions: {
      chase: {
        name: ["It needs a name. A 1985 name. A name with a panther in it. It's called", 'I have named it on the drive over, in my heart:',
          'This one is going to be huge. Arenas. Lighters. It is called', 'Leather pants were made for this song. Its name is',
          'I wrote the chorus on a napkin at the poutine place. The song is called'],
        custom: [
          { when: 'difficultyHigh', text: "That's a lot of notes. I will be sliding through half of them on my knees.", seat: ['drums', 'bass', 'lead'] },
          { when: 'similarityHigh', text: "Didn't we... already write this one? It's fine. It's a callback. 1985 was full of callbacks." },
          { when: 'any', text: 'Somebody get the wind machine. This one needs weather.' }
        ]
      },
      lenny: {
        noSolo: ['Cool. Where does my solo go? The parking lot? Cool.', 'No room for a solo. My original, lawyer-proof solo. Gone.',
          'You filled every gap. I will solo quietly in the loading dock later.', "Great song. No solo. I'll take it up with the minutes."],
        fills: ['I snuck a little lick into bar four. It is new. I checked. Mostly checked.', 'The verse had room, so I put a slide there. An original slide.',
          "Don't listen to bar twelve too closely. Or do. It's the most original thing I own."],
        custom: [
          { when: 'similarityHigh', text: 'Hang on. This sounds like a famous riff. Which means it sounds like me. Which means a lawyer.', seat: ['drums', 'bass', 'rhythm'] },
          { when: 'difficultyHigh', text: "Fast. Real fast. I'll need new strings and a lawyer who is also fast.", seat: ['drums', 'bass', 'rhythm'] },
          { when: 'any', text: "I'm running it through the app tonight. Just to be safe. Everything is fine." }
        ]
      },
      tamara: {
        great: ['(Tamara nods once and writes it in the setlist binder in pen. Pen means forever.)', 'Good tempo. I can play it tired. That matters.',
          "It's done. It's good. Let's go home."],
        fills: ['I added a little bass run in bar four. It was lonely. Now it has company.', 'Snuck a walk-down into the bridge. Very tidy. Very legal.',
          'Put a pickup note before the chorus. Keeps everyone honest.'],
        custom: [
          { when: 'difficultyHigh', text: 'That is a lot of hits. I will be icing my wrists and yours. Floss first.' },
          { when: 'similarityHigh', text: 'It sounds like our last one. I have filed it next to the last one, alphabetically.' },
          { when: 'any', text: 'Noted, timed and filed. It is three minutes forty. We are home by midnight.' }
        ]
      }
    },
    writeTips: {
      chase: ['Rock wants the backbeat: snare on 2 and 4, kick on 1 and 3. Then the chorus crashes. Then I slide.',
        'Make the chorus bigger than the verse. Crash on the one. Lighters come out on their own.'],
      lenny: ['Keep the hats on 8ths and leave the snare on 2 and 4. Give me room in the bridge for a riff nobody owns.',
        "Tap a square to add a hit, drag down a lane to paint. Don't copy anything famous. Trust me."],
      tamara: ['Kick on 1 and 3, snare on 2 and 4, hats steady. Around 120 is a safe rock tempo. Save it often.',
        'Tap to add hits, drag to paint a row, press play to hear it. Keep it simple. We can play simple tired.']
    },
    vanBanter: {
      chase: ['T-Bone. Let me drive. Just to Leduc. Just to the end of the block.', 'This cassette is side B. Side B is where the real 1985 lives.',
        'Every oil derrick we pass is nodding along. Look. They are nodding.', 'When we are famous, this highway will play our song on loop.',
        "Can we roll the windows down? The hair wants to feel the Prairie.", 'Dibs on shotgun. Forever. I am writing it in the minutes.'],
      lenny: ['That song on the radio sounded like my riff. Or my riff sounds like it. Either way I am nervous.', 'Phone has no signal out here. No voicemails. Paradise.',
        'I counted sixty-one pumpjacks. I need a hobby that is not a riff.', "If we break down, I'm walking to the gig. I'll bring my amp.",
        'Tamara, can we stop at the record store in Red Deer? For research. Legal research.', 'Chase, the cassette is on side B again. It has been side B since Leduc.'],
      tamara: ['Hands at ten and two. Mirrors checked. Tank full. We are on schedule.', 'No, Chase. Still no. The answer has been no since 2019.',
        'Next rest stop in 42 km. Hold it, Lenny.', 'We will arrive at 6:58. Sound check is 7. I planned for traffic.',
        'Please stop putting your feet on the dash. It is a dash, not an ottoman.', 'I have a first-aid kit, a tire gauge, four toothbrushes and floss. We are fine.']
    },
    callHome: {
      chase: ['Called Mom. She asked if I am still wearing the leather pants abroad. I said "especially abroad".', 'Called the Westgate payphone replica. Nobody answered. It felt right.',
        'Facetimed Gus. He held the phone up to a vacuum so I could hear home. I cried a little.'],
      lenny: ['Called my dad in Leduc. He asked if the lawyers call internationally. They do.', 'Called home. Played Mom a new riff. She said it sounded like nothing. Best thing she ever said.',
        'Watched the Oilcans game at 5 a.m. in a hotel lobby. The night clerk became a fan.'],
      tamara: ['Called Dr. Bhullar to check on my patients. She said they miss me. They asked about floss.', 'Called home. Told Mom we are all flossing. Two of us are.',
        "It's 4 a.m. in Edmonton. I called anyway. The clinic answering machine was very comforting."]
    },
    live: {
      chase: { signature: ['Did everyone see the knee slide? Everyone saw the knee slide.', 'Twelve metres on my knees. The pants held. The pants always hold.',
          'That slide was for 1985. And for Gloria.'],
        solo: ['Air guitar solo. Totally counts.', 'I did a solo with my hair. You saw it.', 'That was a vocal solo. I held it until the wind stopped.'],
        fill: ['I clapped on the fill. You kept up. Respect.', 'Did you hear me yell during the fill? That was a fill.', 'The fill was great. I was behind it, spiritually.'],
        flub: ['I missed a cue. The fog was thick. I blame the fog.', 'That wrong note was a choice. A 1985 choice.', 'Forgot the second verse. Sang the first one again. With passion.'] },
      lenny: { signature: ['That riff was mine. Nobody called. Nobody.', 'Did you hear it? Original. I think.', 'I played it. They cheered. My phone stayed quiet.'],
        solo: ['That solo? Mine. Legally, I checked.', 'I closed my eyes during the solo and saw Leduc.', 'Longest solo of the tour. Most original too.'],
        fill: ['Snuck a lick into the fill. You caught it. Respect.', 'Did you notice the run in bar eight? That was new. That was me.', 'Fill was tight. Tighter than a court date.'],
        flub: ['Missed the riff. Maybe the universe did that on purpose. For legal reasons.', 'My hands froze. My amp whooshed. It was a lot.', 'Wrong note. Right feeling.'] },
      tamara: { signature: ['Walked the bass line up and down like a staircase. Safely.', 'Played the bass line with one hand and checked the time with the other.',
          'Nobody noticed the bass. Everybody felt it. That is the job.'],
        solo: ['A bass solo. Four bars. I scheduled it.', 'Short, clean, on time. Like a good cleaning.', 'You liked it? It was eight notes. Efficient.'],
        fill: ['Locked the fill with the kick. Clean. Hygienic.', 'I followed your fill. You were early. I forgave you.', 'Good fill. We are still home by midnight.'],
        flub: ['Missed one. I have logged it.', "Bass cut out. It was the cable. I'm replacing it.", 'I was tired. That was the 3 a.m. drive talking.'] }
    },
    banter: {
      chase: ['Make some noise for the bartender! And for 1985!', 'This next one is about leather pants. They are all about leather pants.', 'Is anyone here from Edmonton? No? Everyone is now.'],
      lenny: ['Is anyone else hot? It is so hot up here. The riff is also hot. Original, too.', 'This next riff is legally distinct. Please do not hum along.', 'Shout-out to our lawyer, Bryce, who is probably listening.'],
      tamara: ['Next one is faster. Sorry, {player}.', 'Please drink water. And floss. In that order.', 'Two more songs. Then we drive home safely. Thank you, {city}.']
    },
    labelReact: {
      chase: { monolith: ['A major label! A real one! With a lobby! Is the lobby from 1985?'], gopherwood: ['Their office has a tape deck. I trust them completely.'],
        diy: ['We are our own label. Like the punks. But in leather.'], signed: ['We are signed! Somebody call 1985. Tell them we made it.'] },
      lenny: { monolith: ['They have sixty lawyers. Sixty. Maybe one will be on my side.'], gopherwood: ['Small advance, but they said the riff "sounds like you". Nobody ever said that.'],
        diy: ['No label means no label lawyers. Just the other lawyers.'], signed: ['Signed. I read clause 12 four times. It says the riffs are my problem.'] },
      tamara: { monolith: ['I read the contract. All of it. Page 38 is a problem. I have highlighted it.'], gopherwood: ['Half of every sale is ours. I did the math twice. Sign it.'],
        diy: ['I can run a label. I run this band. Same spreadsheet, more tabs.'], signed: ['Signed. I have a new folder. It is labelled LABEL.'] }
    },
    reviewReact: {
      chase: { great: ['They said we sound like 1985. That is the highest praise in the language.'], meh: ['Mixed. Like a good cassette. Some songs chewed.'],
        awful: ['I will be writing letters. Handwritten. In the good pen.'] },
      lenny: { great: ['Nobody mentioned any famous riffs. NOBODY. I am framing all of them.'], meh: ['One critic said the riff was "familiar". I am lying down.'],
        awful: ['They said we sound like everyone. That means a lot of lawyers read it too.'] },
      tamara: { great: ['Great reviews. Also, sales are up 22%. I made a chart.'], meh: ['Mixed reviews. Mixed sales. I will adjust the budget.'],
        awful: ['(Tamara prints the worst review and files it under MOTIVATION.)'] }
    },
    studioWeek: {
      chase: ['Recorded my vocal with a desk fan pointed at my hair. The engineer says it is "in the track". Good. It earned it.',
        'Take nine. The mullet was not satisfied. Neither was the producer. Neither was I.', 'Tomorrow I sing the ballad. Tonight I rest my voice. And condition my hair.'],
      lenny: ['Tracked the solo. All of it. Original, I think. The engineer checked twice.', "Re-amped through Gus's vacuum amp. The engineer asked what the whoosh was. It was tone.",
        'Spent four hours on one riff. It sounds like nothing now. That was the goal.'],
      tamara: ['Tracked all my bass in one take each. Out by nine. Home by ten. Asleep by ten-oh-five.', 'Studio has a vending machine AND a couch. I have made a schedule for both.',
        'Did the studio invoice for them. They undercharged us. I told them. They were confused.']
    }
  };

  P.bandLines = {
    activity: {
      rehearse: ['We ran "Leather Pants at Forty Below" eleven times. On the twelfth, the nail salon clapped through the wall.',
        '{nick:chase} made us rehearse the knee slide. Everyone. Even whoever is on drums.',
        'Tamara ran rehearsal with a stopwatch. We were done at 9:59:40. Twenty seconds of silence. Beautiful.',
        "Lenny played the riff until it sounded like nobody's. It took two hours. It was worth it.",
        'Gus tested vacuums all night in B flat. We rehearsed in B flat. It works, somehow.',
        'We tightened the ending. It had a knee slide, a key change and a fake ending. Now it has two of those.'],
      write: ['We wrote a riff. Lenny checked it on the app. Then checked it again. Then again. 11%. Keeper.',
        '{nick:chase} wrote the lyrics on a napkin at the poutine place. The napkin is now framed.',
        'We built a song around a groove you found on {instrument}. Tamara timed it: 3:40. Radio length. Home by midnight.',
        'We wrote a power ballad. It lasted ninety seconds before Chase added a key change and a wind machine.',
        'Lenny brought a riff from a dream. He described the dream. It was about a lawyer.',
        'Tamara wrote a bass line so tidy you could eat off it. The song grew around it like a garden.'],
      promote: ['We stapled flyers to every pole on Whyte Avenue. Three went over Chartbusters posters. Oops.',
        "Chase posted a video of a knee slide in the parking lot. Darrell the parking guy is in it. He's a star now.",
        'We chalked GRAVEL KINGS outside the Mega-Mall. Mall security hosed it off at 7 a.m. The mall-walkers saw it first.',
        'Tamara mailed our demo to every campus station in Alberta with a tidy cover letter and a floss sample.',
        'Chase did a "mysterious" photoshoot on the High Level Bridge. A cyclist asked if he needed help.',
        "Lenny went on The Freeze and told the lawsuit story. The phone lines lit up. One of the calls was a lawyer."],
      book: ['Tamara drove the Mullet Wagon to every bar on Whyte Ave with a clipboard. Two said yes. One said "is that a mullet".', 'We called every bar in {city} from the payphone replica. It does not work. We used Tamara\'s phone.',
        'We pinned our number to the music-store corkboard, next to a lost cat and a used drum throne.',
        "Tamara emailed every venue in {city} with a PDF press kit. Formatted. Paginated. They replied out of respect.",
        'Chase booked a gig by walking into a bar in leather pants and saying "we rock". It worked. It was a pub.',
        'Lenny asked his cousin in Leduc to ask the Legion. The Legion is asking around.'],
      hustle: ['We played a wedding social in Sherwood Park. The chicken dance, in power chords. Cash and a pan of perogies.',
        'We shovelled the whole Westgate parking lot. Mr. Petrenko paid us in rent goodwill and a coffee.',
        'Tamara did three people\'s taxes. The band fund thanks her. The people thank her more.',
        "We helped Gus deliver twelve vacuums. Chase carried one on his shoulder like a guitar. It's a look.",
        'We busked outside the arena after an Oilcans win. Everyone was happy. Everyone tipped.',
        'Lenny sold a riff to a car wash for $50. It sounded like nothing. That was the selling point.'],
      rest: ['We watched hockey on Gus\'s repair-shop TV through the wall. Kept the volume at "vacuum".',
        'Nobody touched an instrument all night. Lenny touched his only five times.', 'Tamara made us all go to bed by ten. We did. It was incredible.',
        'We drove out to see the Northern Lights past St. Albert and said nothing for an hour.',
        'A lazy evening. {nick:chase} conditioned the leather pants while we watched a 1985 movie on a VCR.',
        'Mall-walking with Gloria at 7 a.m. Nine kilometres. We were so tired we slept all afternoon. Very restful.']
    },
    quietWeek: ['A quiet Monday. Chase is at the payphone replica. Nobody interrupts Chase at the payphone.',
      "Nothing happens. Lenny's phone rings. He lets it ring. It rings in E.", 'A slow week. Tamara balanced the books. They balanced. It was the event of the week.',
      'Gus tested a vacuum at 7 a.m. That was the news.', "The group chat is silent. Even Chase. Especially Chase. He's growing his hair out. Further.",
      'Quiet week in {city}. Construction on every road. Nobody can get anywhere. Nobody tries.',
      'Trinh from Nails by Trinh gave Chase a manicure. He wore black polish to rehearsal. Nobody mentioned it.',
      'Mr. Petrenko walked past Unit 4B three times. He waved each time. That is a lot of waving for him.',
      "Darrell with the clipboard ticketed a car that wasn't yours. Chase sent him a thank-you card anyway.",
      'The mall-walkers passed the shop window at 7 a.m. and waved. Nobody was there to see it. It still counts.'],
    yearEnd: ['Another year in Unit 4B. The till has heard every song. It has not complained. It cannot.',
      "{nick:chase} raises a glass: 'To the Gravel Kings. To 1985. To next year's hair.'",
      "Year's end. Tamara has closed the books. We made $214 in profit. She is framing it.",
      "Lenny's voicemail box is full for the fourth year in a row. He's calling it tradition.",
      "Gus gives the band a year-end vacuum tune-up for free. Nobody asked. Everyone appreciates it.",
      "Mr. Petrenko looks at Unit 4B, looks at the band, and says 'Another year, eh.' It's almost a lease renewal."],
    milestones: {
      firstGig: 'First gig! Gravel Kings are now technically a live act. Chase knee-slid on carpet. It burned.',
      firstSong: 'First original song. Lenny checked it on the app. 14%. Legally ours.',
      fans50: '50 fans. More than the Early Birds Walking Club. Gloria counts as two.',
      fans100: '100 fans. Somebody you have never met wore leather pants to your show.',
      fans250: '250 fans. The whole Westgate Plaza knows your name. So does Darrell.',
      fans500: '500 fans. People sing along. Mostly the right words. Chase sings the wrong ones.',
      fans1000: '1,000 fans. {city} is starting to notice. So is a radio conglomerate.',
      fund1000: 'First $1,000 in the band fund. Tamara has opened a savings account. It has a name.',
      localHeroes: 'Local heroes on the horizon. From now on people can quit and vans can die. Tamara has made a contingency plan.',
      signed: 'Signed! Gravel Kings are a real band now, with paperwork. Tamara read all of it.',
      diyAlbum: 'A whole album, made and paid for by you. Signed to nobody. Mailed from Unit 4B.'
    },
    genreClash: ['Wrong crowd. They wanted polka. Chase gave them a power ballad. They waltzed to it. You got paid.',
      'The regulars asked for something they could line dance to. Lenny played the riff. It was close enough.',
      'Half the room left. The other half requested "anything from 1985". Chase wept with joy.',
      'A cowboy hat hit the snare mid-fill. Chase put it on. He looked incredible. He kept it.'],
    countIn: ['ONE, TWO, ONE-TWO-THREE... ROCK!', 'Hit it!', '1985! Two! Three! Four!', 'A-one, a-two... knee slide!'],
    empty: { chat: 'No messages yet. Chase is at the payphone. Tamara is typing a very organised message.',
      catalog: 'No songs yet. Lenny has riffs. Some of them might even be his. Write one.' },
    exposure: ['Chase: "Exposure is basically radio play. Say yes."', 'Exposure! We are going to be SO exposed. In leather.',
      'Tamara: "Exposure does not pay for diesel." Chase: "It pays for the soul."'],
    noSolo: ['Where does my solo go? Nowhere? Cool. I will solo in the parking lot.', 'No solo section. Lenny is writing a letter. To the minutes.'],
    guilt: ["Your mom asks if you've thought about hygiene school. She has met Tamara.",
      'Your dad leaves the oil-patch job ads on your {gear}. Rig hand is circled. Twice.',
      "Your mom tells the neighbours you're 'in rock'. The neighbours ask which rock.",
      'Dad drives past Westgate Plaza, slows down at Unit 4B, and keeps going. Mom calls it progress.'],
    venueUp: ['The owner wants you back. Better money next time. Chase asks for a wind machine.', 'Handshake plus shoulder grab. Tamara confirms the date in writing.',
      '"Same time next month?" Chase says yes before Tamara can check the calendar. It is free. She checked.'],
    venueBanned: ['Your photo is going on the wall behind the bar. Under the word BANNED. Chase is posing.',
      'Banned. The owner laminated the poster first. Tamara asks for a copy for the archive.',
      "Banned for the knee slide. The floor is scratched. Chase's pants are fine."],
    vanTired: ['{van} makes a sound like a sad trombone. Tamara says it is "within tolerances".', '{van} is held together by duct tape, zip ties and Tamara.',
      'Something fell off {van}. Tamara stopped, picked it up and put it in the glovebox. Labelled.'],
    breakdown: ['{van} died on the shoulder of Highway 2. A tow truck, a long wait, a lighter band fund.',
      'The engine made one last power-ballad noise and stopped. Chase called it beautiful. The tow was not.',
      'Breakdown. Tamara opened the hood, looked, closed it, called roadside assistance. It still cost plenty.'],
    vanArrive: ['T-Bone parks exactly between the lines, facing out, handbrake on. Chase is already inside.',
      'You arrive two minutes early. Tamara sets a timer for sound check. Chase fixes his hair in the mirror.',
      'Tamara parks {van}. Chase begs to "just move it forward a bit". The answer is no.'],
    sameCrowd: ['Same faces as last time. Gloria is front row. She is always front row.', 'The regulars are loyal. The regulars also have mullets now.'],
    openingSlot: ['You played first. Half their crowd came early. Some of them wear leather now.',
      'Opening slot: short set, bad pay, big room. Chase knee-slid anyway. You stole fans on the way out.'],
    eraLocal: ['Local heroes. People in Edmonton know the name. Some of them even spell it right. Not the print shop.',
      "You're the band people mention at the Mega-Mall. Gloria has told the whole walking club. Twice."],
    eraSigned: {
      gopherwood: ['Signed to Gopherwood Records. The label van has a gopher on it and a tape deck. Chase cried.'],
      monolith: ['Signed to Monolith Records. Sixty lawyers. One of them is assigned to Lenny. Tamara read the whole contract.'],
      diy: ['No label. Your own album, your own money, mailed from Unit 4B. Tamara is the distribution department.']
    },
    releaseDay: ["It's out. Chase bought it on cassette, CD and download. He does not own a CD player.",
      'Release day. Lenny is refreshing the song-matching app every ninety seconds. Nobody has matched it yet.'],
    chartDebut: ["You debuted on the Maple 100! Not on any Airwave Dominion station, but on the chart. It counts.",
      'A chart debut. Tamara made a line graph. Chase made a speech. Lenny checked the app.'],
    loonies: { nominated: ['A Loonie nomination! Chase has already had the leather conditioned.', 'Nominated. Chartbusters are in the same category. Of course they are.'],
      snubbed: ['No Loonie nominations. Chase says awards are "from the future". Then watches the whole broadcast.'] }
  };

  // ======================================================================================================================
  // WORLD (content.world): region cards, the Q3 payoff (Mudstonbury main stage), homesick, lines, gong carpet.
  // ======================================================================================================================
  function wgate(region, extra) { var gt = { era: W, band: [B] }; if (region) gt.region = [region]; for (var k in extra) gt[k] = extra[k]; return gt; }
  P.worldCards = [
    card('wt_gk_uk_pub', 'fame', 'nigel', 'A Pub That Loves 1985', wgate('uk_europe'),
      "Nigel has booked a pub in Manchester whose regulars have not changed the jukebox since 1985. They see Chase walk in. A man at " +
      "the bar stands up slowly. 'Finally,' he says. 'One of us.'",
      [ch('Play the jukebox set', { buzz: 8, tour: { regionFans: 250 } },
        'You play every song on the jukebox, then your own. The regulars cannot tell the difference. They mean it as a compliment.', 'Buzz ↑ · Region fans ↑'),
       ch('Chase holds court', { mood: { chase: 12 }, tour: { regionFans: 150, homesick: -6 } },
        'Chase and the regulars talk about 1985 until closing. He has found his people. They are all sixty-four.', 'Chase ↑↑ · Homesick ↓')],
      { once: true }),
    card('wt_gk_jp_karaoke', 'weird', 'chase', 'Karaoke in Osaka', wgate('japan'),
      "A karaoke bar in Osaka has 'Everything Tonight' by Chartbusters on its list. Forty times. Chase finds it. He also finds your " +
      "song, number 11408. Mr. Kato is watching to see what he picks.",
      [ch('Sing our own song', { buzz: 8, fans: 150, tour: { regionFans: 300 } },
        'Chase sings number 11408 with a knee slide into the snack table. The bar goes silent, then erupts. The video travels.', 'Buzz ↑ · Region fans ↑'),
       ch('Sing the ballad, ironically', { buzz: 10, mood: { chase: 6 } },
        "Chase sings 'Everything Tonight' as a tragedy. The whole bar cries. Rex hears about it and sends a scarf to Osaka.", 'Buzz ↑↑'),
       ch('Tamara picks a song', { chemistry: 6, tour: { homesick: -8 } },
        'Tamara sings a gentle ballad in perfect pitch. Nobody knew. Lenny films it. It becomes the band\'s favourite memory of the tour.', 'Chemistry ↑ · Homesick ↓')],
      { once: true }),
    card('wt_gk_au_pub_rock', 'scene', 'shazza', 'Pub Rock Country', wgate('australia'),
      "Shazza says Australian pubs 'invented rock, mate'. The pub in Adelaide has a stage made of beer crates and a crowd that will " +
      "throw a schooner if the riff is weak. Lenny is sweating. The riff is not weak. Is it?",
      [bet("Lenny's original riff", 'the crowd is judging', 'Lenny steps up to the crates.', 0.6, 'chemistry',
        { buzz: 12, fans: 200, tour: { regionFans: 400 } }, 'The crowd goes silent, then roars. A man in a singlet says "never heard that one, mate". Lenny nearly faints.',
        { burnout: 6, buzz: 4 }, 'A schooner flies past his ear. Nobody is hurt. The crowd cheers anyway. It was a friendly schooner.'),
       ch('Play the hits', { fans: 120, tour: { regionFans: 250 } },
        'The pub sings along by the second chorus. Shazza says you are "honorary Aussies". It lasts one night.', 'Region fans ↑')],
      { once: true }),
    card('wt_gk_ru_leather', 'weird', 'chase', 'Leather at Minus Thirty', wgate('russia', { weekOfYear: [11, 18] }),
      "Minus thirty in Novosibirsk. Chase is in the leather pants. Dmitri is horrified. 'In Siberia we respect the cold,' he says. " +
      "'This is not respect.' Chase says it is the most respect he has ever shown anything.",
      [ch('Leather, full set', { buzz: 12, burnout: 6, tour: { regionFans: 400 } },
        'Chase plays the full set in leather at minus thirty. The Siberians decide he is a folk hero. There is a song about him by Friday.', 'Buzz ↑↑ · Burnout ↑'),
       ch('Borrow a fur coat', { mood: { chase: -4 }, burnout: -4, tour: { homesick: -6 } },
        'Dmitri lends Chase a fur coat. It is enormous. Chase looks like a 1985 bear. He admits, quietly, that he is warm.', 'Burnout ↓ · Homesick ↓')],
      { once: true }),
    card('wt_homesick_gravel_kings', 'drama', 'tamara', 'Homesick', { era: W, band: [B] },
      "Nobody has slept. Chase has called the Westgate payphone replica four times. Tamara has checked on her patients twice. She says " +
      "it out loud: 'Can we just go home? I miss my own bed. And my own floss.'",
      [ch('Fly home early', { mood: { all: 8 }, tour: { endTour: true, homesick: -20 } },
        'You change the flights. The promoter is disappointed. Tamara has all the rebooking done before anyone else wakes up.', 'Skip the rest of the tour'),
       ch('Finish what we started', { mood: { all: -5 }, burnout: 5, chemistry: 3 },
        'Group hug in a hotel hallway. Chase does a quiet knee slide on the carpet for morale. You finish the tour. It gets into your bones.', 'Moods ↓ · Burnout ↑'),
       ch('Fly Gloria in', { fund: -1400, tour: { homesick: -25 } },
        'Gloria arrives with a tin of butter tarts and a pedometer. She walks the hotel corridors every morning. Everyone feels at home.', 'Fund ↓ · Homesick ↓↓')],
      { story: true }),
    card('wt_gk_mud_headline', 'fame', 'chase', 'Main Stage, Mudstonbury', { era: W, band: [B], region: ['uk_europe'] },
      "Mudstonbury. The main stage. Sixty thousand people in knee-deep mud, chanting your name in English accents. Chase is in the " +
      "leather pants. Tamara is in wellies. Lenny is holding his riff. The riff is his. Go.",
      [ch('Play it like 1985', { buzz: 18, fans: 400, mood: { all: 8 }, flags: { mudstonbury: 'headlined' }, tour: { regionFans: 3000 } },
        'Chase knee-slides twelve metres through mud into the front row. Sixty thousand people roar. It is replayed on every channel in England.', 'Region fans ↑↑↑ · Buzz ↑↑'),
       ch("Lenny's riff opens the set", { buzz: 16, fans: 300, mood: { lenny: 12 }, flags: { mudstonbury: 'headlined' }, tour: { regionFans: 2500 } },
        "Lenny opens alone, on the riff nobody can sue. Sixty thousand people hear it for the first time at once. He will never recover.", 'Region fans ↑↑ · Lenny ↑↑'),
       ch('Dedicate it to Westgate', { chemistry: 8, fans: 250, flags: { mudstonbury: 'headlined' }, tour: { regionFans: 2000, homesick: -15 } },
        'Chase dedicates the set to Unit 4B, Trinh, Gus and Mr. Petrenko. Back home the whole plaza watches on the vacuum-shop TV. They cry.', 'Chemistry ↑↑ · Homesick ↓')],
      { story: true, city: ['mudstonbury'] })
  ];
  P.packages = [
    { id: 'gk_mudstonbury_headline', region: 'uk_europe', name: 'Mudstonbury: Main Stage', festival: true, band: [B],
      needs: { flag: 'mudHeadline', band: [B] }, needsText: 'Mudstonbury still needs a headliner. Nigel has not called yet.',
      // the payoff fires at the Mudstonbury gig (not the last stop): trophy, a line in the gig result, the story card
      payoff: { city: 'mudstonbury', flag: 'mudHeadlinePayoff', value: 'mudstonbury', trophy: 'Mudstonbury: the main stage', trophyKind: 'payoff',
        line: 'Sixty thousand people in knee-deep mud sing the power chorus back at {band}. Chase is in the leather pants. The mud is winning.',
        chat: '{band} headlined Mudstonbury: sixty thousand in the mud, one knee slide, zero scarves. Westgate Plaza watched on the vacuum-shop TV.',
        card: 'wt_gk_mud_headline' },
      blurb: 'The headline slot Chartbusters walked away from: a London warm-up, then the main stage at Mudstonbury, in the mud, in leather.',
      stops: [{ city: 'london', venue: 'hammersmyth_odium' }, { city: 'mudstonbury', venue: 'mudstonbury_fest' }, { city: 'manchester', venue: 'drizzle_factory' }] }
  ];
  P.worldLines = {
    depart: { uk_europe: 'Wheels up. Chase packed the leather pants in a garment bag. The pants have their own seat.',
      japan: 'Wheels up. Thirteen hours. Tamara has a sleep schedule for everyone, printed.',
      australia: 'Wheels up. Twenty-two hours. Chase asks if it is 1985 in Australia. Tamara says it is tomorrow.',
      russia: 'Wheels up. Tamara packed four toques. Chase packed zero. Tamara packed a fifth, for Chase.' },
    home: ['Home. Unit 4B smells exactly the same: hairspray, nail polish and vacuum bags.', 'Back in Edmonton. Gloria is waiting at the airport with a sign and a pedometer.'],
    rival: '{rival} just played {region} first. The locals keep asking if you know them. "Man with a scarf? In summer?"',
    gongNominated: '{band} is nominated for the Global Gong. The ceremony is in Amsterdam in May. Chase is already conditioning the leather.',
    gongWon: '{band} won the Global Gong. It is a real gong. It does not go on the drum kit. Tamara has made sure.',
    gongLost: 'The Global Gong went to {venue}. The band claps politely. Chase claps like it is 1985.'
  };
  P.gongCarpet = [
    { who: 'reporter', text: 'Live from Amsterdam! Who are you wearing?' }, { who: 'chase', text: 'Leather. From a saddlery in St. Albert. The saddle was jealous.' },
    { who: 'reporter', text: 'Is it true the Gong is a real gong?' }, { who: 'tamara', text: 'Yes. It does not go on the drum kit. I checked the contract.' }
  ];

  // ======================================================================================================================
  // ROAD (roadCards; driver T-Bone). Road-card magnitudes use the garage ranges. Van effects always carry a hint.
  // ======================================================================================================================
  function rg(extra) { var gt = { band: [B] }; for (var k in extra) gt[k] = extra[k]; return gt; }
  P.roadCards = [
    // ---- T-Bone drives: safe and slow, Chase begging to drive, cassettes ----
    card('road_gk_speed_limit', 'road', 'lenny', 'Exactly the Limit', rg({ driver: ['tamara'], minKm: 60 }),
      'T-Bone drives exactly the speed limit. A tractor passes you. The farmer waves. Lenny waves back, then puts his face in his hands.',
      [ch('Trust T-Bone', { chemistry: 3, burnout: 3 }, 'You arrive exactly on time. The promoter is stunned. "Nobody is ever on time," he says. "Nobody."', 'Burnout ↑ · safe'),
       ch('Ask her to speed up, gently', { mood: { tamara: -4 }, burnout: -3 }, 'She goes three over. She announces it. She looks nervous the whole way. Everyone is proud of her.')],
      { once: false, cooldown: 6 }),
    card('road_gk_chase_begs', 'road', 'chase', 'Chase Wants to Drive', rg({ driver: ['tamara'] }),
      "'Just to Leduc,' says Chase. 'Just to the end of the block. Just the parking lot.' Chase does not have a licence. He has a " +
      "'spirit licence', drawn on a napkin. T-Bone has not said a word. Her knuckles have gone white.",
      [ch('No.', { mood: { chase: -5, tamara: 3 } }, 'T-Bone says no. It is the only word she says for 200 km. Chase sulks with a cassette player.'),
       ch('He can steer in the lot', { mood: { chase: 8 }, chemistry: 2 }, 'Chase steers the van around an empty mall lot at 8 km/h with T-Bone on the brake. He cries. It is the happiest day of his life.')],
      { once: false, cooldown: 8 }),
    card('road_gk_cassette_war', 'road', 'lenny', 'Side B, Again', rg({ driver: ['tamara'], minKm: 100 }),
      "Chase has put side B of his 1985 mixtape in the deck. It is the fourth time since Red Deer. T-Bone has a rule: the driver picks " +
      "the music. Chase has a counter-rule. It is 'I was here first'.",
      [ch('Driver picks: silence', { burnout: -4, mood: { chase: -4 } }, 'T-Bone ejects the tape. Silence. Real silence. Everyone falls asleep but T-Bone. It is glorious.', 'Burnout ↓'),
       ch('Side B, one more time', { chemistry: 3, mood: { chase: 5 } }, 'Everyone sings side B word for word. Even T-Bone. She will deny it. Lenny has it on tape.'),
       ch('Lenny plays a new riff', { mood: { lenny: 5 }, skill: { lenny: 1 } }, 'Lenny plays acoustic in the back. It sounds like nothing anyone has heard. T-Bone nods. That is a rave.')],
      { once: false, cooldown: 6 }),
    card('road_gk_tire_check', 'road', 'tamara', 'Tire Pressure Stop', rg({ driver: ['tamara'], minKm: 150 }),
      "T-Bone pulls over at a gas station in Innisfail to check the tire pressure. All four. Twice. She has a gauge. She has a " +
      "backup gauge. The band is watching the sunset from the curb.",
      [ch('Everyone learns tire pressure', { chemistry: 4, van: { condition: 3 } }, 'T-Bone gives a tire-pressure workshop. Chase takes notes in lipstick. The van drives better. Everyone is safer.', 'Chemistry ↑ · Van ↑'),
       ch('Get snacks while she checks', { fund: -20, mood: { all: 3 } }, 'Twenty dollars of gas-station snacks. T-Bone gets a bag of trail mix. She files the receipt.')],
      { once: false, cooldown: 8 }),
    card('road_gk_floss_stop', 'road', 'tamara', 'The Floss Stop', rg({ driver: ['tamara'] }),
      "After the gig T-Bone pulls into a rest stop at 1 a.m. 'Floss. Everyone. Now. We are not going to sleep on gig teeth.' Chase " +
      'protests. Lenny is already flossing. The rest stop is lit like a dentist\'s office.',
      [ch('Everybody flosses', { chemistry: 3, mood: { tamara: 5 } }, 'Four people flossing at a rest stop in the dark. A trucker joins in. He thanks T-Bone. He means it.'),
       ch('Chase refuses', { mood: { chase: 3, tamara: -4 } }, 'Chase refuses. T-Bone drives the rest of the way in total silence. Chase flosses at home, alone, in shame.')],
      { once: false, cooldown: 8 }),
    card('road_gk_mirror_check', 'road', 'chase', 'The Mirrors', rg({ driver: ['tamara'] }),
      'T-Bone adjusts all three mirrors before leaving. Then again. Chase has been using the passenger mirror for his hair. It is now ' +
      "adjusted for his hair. T-Bone wants it back. Chase needs it for 'maintenance'.",
      [ch("T-Bone's mirror", { mood: { chase: -4 }, van: { condition: 2 } }, 'The mirror goes back to safety. Chase uses a compact mirror from his jacket. It has a panther on it.', 'Chase ↓ · Van ↑'),
       ch('Buy Chase a clip-on mirror', { fund: -15, mood: { chase: 5, tamara: 3 } }, 'A $15 clip-on visor mirror. Chase names it. Everyone gets their mirror. Peace in the van.')],
      { once: false, cooldown: 10 }),
    card('road_gk_early_arrival', 'road', 'lenny', 'Two Hours Early', rg({ driver: ['tamara'], minKm: 200 }),
      "T-Bone planned for traffic, weather, construction and a moose. There was no traffic, no weather, no construction and no moose. " +
      "You are two hours early. The venue is locked. Lenny wants to find a record store.",
      [ch('Find the record store', { fund: -30, skill: { lenny: 1 } }, 'A tiny record store in a small-town strip mall. Lenny finds a riff he must never play. He buys it anyway, for study.'),
       ch('Nap in the van', { burnout: -5 }, 'Two hours of perfect van sleep. T-Bone sets an alarm for sound check. Everyone wakes up a new person.'),
       ch('Knee-slide practice', { mood: { chase: 5 }, buzz: 3 }, 'Chase practises on the venue parking lot. Locals gather. By show time half of them have bought tickets.')],
      { once: false, cooldown: 8 }),
    card('road_gk_red_deer_slow', 'road', 'chase', 'Everything Passes You', rg({ driver: ['tamara'], minKm: 120 }),
      "On Highway 2 everything passes you: pickups, semis, a grandmother in a hatchback, a combine on a trailer. Chase is counting. " +
      "He is at 211. He is narrating each one like a race caller.",
      [ch('Let him call the race', { chemistry: 4, mood: { chase: 4 } }, "Chase calls every pass like a hockey goal. By Red Deer the whole van is cheering for the grandmother. She wins."),
       ch('Earplugs for everyone', { burnout: -3, mood: { chase: -3 } }, 'T-Bone hands out earplugs from the first-aid kit. Chase keeps calling the race, silently, with his hands.')],
      { once: false, cooldown: 8 }),
    // ---- You drive (the driver has quit) ----
    card('road_gk_you_leather_seat', 'road', 'chase', 'Finally, Chase Rides Shotgun', rg({ driver: ['you'] }),
      "With T-Bone gone, you are driving. Chase has claimed shotgun, the deck and the mirror. He has also, somehow, found the " +
      "keys to T-Bone's glovebox. There is a tire gauge in there, and a note: 'Drive safe. Floss.'",
      [ch('Follow the note', { chemistry: 3, burnout: 3 }, 'You drive exactly the limit, in her honour. It feels like church. Chase does not play side B once.'),
       ch('Side B, full volume', { mood: { chase: 6 }, burnout: -3 }, 'Chase plays side B at a volume T-Bone would never allow. It is liberating. It is also sad.')],
      { once: false, cooldown: 8 }),
    card('road_gk_you_wrong_exit', 'road', 'lenny', 'The Wrong Exit', rg({ driver: ['you'], minKm: 80 }),
      "You took the wrong exit off the Anthony Henday. Then the wrong exit off the wrong exit. You are now in a subdivision where every " +
      "street is called 'Something Crescent'. Lenny has the map. It is upside down.",
      [ch('Ask for directions', { burnout: 3, fans: 3 }, 'A man mowing his lawn gives directions and asks for a demo. He mows in time to it. You arrive late but with a fan.'),
       bet('Trust the crescents', 'they all loop', 'You turn left onto Wolf Willow Crescent.', 0.4, null,
        { buzz: 3 }, 'The crescents spit you out right next to the venue. You pretend it was the plan.',
        { burnout: 6, mood: { all: -3 } }, 'Forty minutes of crescents. You pass the same garden gnome four times. It judges you.')],
      { once: false, cooldown: 6 }),
    card('road_gk_you_speeding', 'road', 'chase', 'Photo Radar on the Henday', rg({ driver: ['you'], minKm: 40 }),
      'You drive like you play {instrument}: steady on the straights, too fast in the fills. A photo radar van blinks at you on the ring road. Chase ' +
      'strikes a pose.',
      [ch('Pay the ticket', { fund: -120 }, 'The photo is great. Chase is mid-pose, mullet up. It becomes the new press shot.', '−$120'),
       ch('Drive like T-Bone now', { burnout: 4, chemistry: 2 }, 'Exactly the limit, hands at ten and two. The band sits up straight. It feels like she is watching.', 'Burnout ↑ · safe')],
      { once: false, cooldown: 6 }),
    card('road_gk_you_gas_argument', 'road', 'lenny', 'The Gas-Station Argument', rg({ driver: ['you'], minKm: 100 }),
      "Nobody knows who pays for gas without T-Bone's spreadsheet. Chase says the singer never pays. Lenny says the lawsuits are " +
      "his contribution. The attendant is watching like it's the playoffs.",
      [ch('You pay. You drive.', { fund: -60, chemistry: 3 }, 'You pay. The argument ends. Chase buys you a gas-station coffee as a "sorry". It is terrible. You drink it all.'),
       ch('Call T-Bone for a ruling', { mood: { all: 3 }, burnout: 3 }, 'She answers on the first ring, from the clinic. She rules in two minutes, with a formula. It is fair. You all miss her.')],
      { once: false, cooldown: 8 }),
    // ---- Band road cards (any driver) ----
    card('road_gk_shotgun', 'road', 'chase', 'The Shotgun Fight', rg({}),
      "Chase has called shotgun 'for life, retroactively'. Lenny called it at the curb. They are both standing at the passenger door. " +
      "Lenny has cited precedent. Chase has cited 1985. The van is not moving until this is settled.",
      [ch('Chase gets shotgun', { mood: { chase: 5, lenny: -4 } }, 'Chase wins on "seniority". Lenny sits in the back and writes a riff about injustice. It is original.'),
       ch('Lenny gets shotgun', { mood: { lenny: 5, chase: -4 } }, 'Lenny wins on precedent. Chase lies across the back seat and delivers a monologue until Red Deer.'),
       ch('Rotate every hour', { chemistry: 4, burnout: 3 }, 'A strict rota, written by Tamara, taped to the dash. Everyone gets an hour of shotgun. Nobody is happy. Everyone is equal.')],
      { once: false, cooldown: 8 }),
    card('road_gk_pumpjacks', 'road', 'lenny', 'Nodding Pumpjacks', rg({ minKm: 80 }),
      'Pumpjacks nod along the highway, dozens of them, all in slightly different tempos. Lenny is trying to find one in time with the ' +
      "song on the radio. Chase says they're nodding to 1985.",
      [ch('Count them in time', { chemistry: 3, drumSkill: 1 }, 'You clap the tempo of every pumpjack. By Leduc you have a polyrhythm. It goes in the next song.'),
       ch('Film them for the video', { buzz: 4 }, "Chase films sixty pumpjacks nodding to your single. It is the best-edited video the band has ever made. By accident.")],
      { once: false, cooldown: 10 }),
    card('road_gk_chinook', 'road', 'chase', 'The Chinook', rg({ minKm: 150, season: ['winter'] }),
      'A chinook rolls in on the way south. It goes from minus twenty-five to plus eight in an hour. The snow turns to slush. Chase ' +
      'opens every window and lets the warm wind hit the mullet. He has never looked more alive.',
      [ch('Windows down, all of them', { mood: { all: 4 }, burnout: -3 }, 'Warm wind in February. Everyone takes off their jacket. Chase takes off his too. It is a leather jacket. He is still in leather pants.'),
       ch('Stop and play in the slush', { chemistry: 4, burnout: 3 }, 'A snowball fight in a gas station lot at plus eight. The band wins. There was no other team.')],
      { once: false, cooldown: 12 }),
    card('road_gk_mall_detour', 'road', 'chase', 'The Mega-Mall Detour', rg({ maxKm: 60 }),
      "The gig is across town. Chase insists on a 'quick' stop at the Mega-Mall for hairspray. The Mega-Mall has four hundred stores. " +
      'He knows exactly where the hairspray is. He takes the long way, past the wave pool.',
      [ch('Five minutes. Go.', { fund: -20, mood: { chase: 5 } }, 'Chase returns in five minutes with hairspray and a mall-walker named Gloria, who is now coming to the gig.'),
       ch('No stops', { mood: { chase: -4 }, burnout: -3 }, 'You drive past the mall. Chase presses his face to the window like a child passing a toy store.')],
      { once: false, cooldown: 10 }),
    card('road_gk_lawyer_on_speaker', 'road', 'lenny', 'The Lawyer on Speaker', rg({ minKm: 60 }),
      "Lenny's phone connects to the van speakers by itself. It is Bryce Pruitt, Esq., mid-voicemail, humming. The whole van hears " +
      'it. The riff is catchy. Everyone is humming it now. Lenny is lying on the floor of the van.',
      [ch('Answer it', { mood: { lenny: -4 }, chemistry: 3 }, 'Lenny answers. Bryce is surprised. They talk for an hour about riffs. It is almost friendly. Nothing is resolved.'),
       ch('Hum along, loudly', { buzz: 3, mood: { chase: 4 } }, 'Five people humming a disputed riff at 110 km/h. Chase adds harmony. Bryce, on the voicemail, adds a third part.')],
      { once: false, cooldown: 10 }),
    card('road_gk_deer_ditch', 'road', 'tamara', 'Deer in the Ditch', rg({ minKm: 100 }),
      "A mule deer stands in the ditch, staring at the van like it owes money. Then a second one. Then nine. It is dusk. Everyone " +
      "knows what dusk means in Alberta.",
      [ch('Slow to a crawl', { burnout: 4, van: { condition: 1 } }, 'You crawl past at 40. The deer watch you go. One of them has a mullet. Probably.', 'Burnout ↑ · safe'),
       bet('Honk the horn', 'they scatter or they charge', 'You lean on the horn.', 0.5, null,
        { chemistry: 3 }, 'They scatter into the canola. Chase says the horn was in E. Lenny says it was in E flat. It becomes a whole thing.',
        { van: { condition: -4 }, burnout: 4 }, 'One deer leaps across the hood. The mirror is gone. Chase is devastated. It was his mirror.')],
      { once: false, cooldown: 10 })
  ];
  P.takeOver = 'You drive now. The seat is still warm. The mirrors are set at exactly the right angle. The floss stays in the cupholder.';

  // ======================================================================================================================
  // BANDBOOK: home superfan (Q5), posts, viral (per member), comments/handles, mail, gifts, scripted gift.
  // ======================================================================================================================
  P.homeSuperfan = {
    id: 'gloria', name: 'Gloria from the Mall-Walkers', short: 'Gloria', icon: '👟', from: 'Edmonton',
    blurb: 'Laps the Mega-Mall at 7 a.m. with the Early Birds Walking Club. Seventy-one. Front row at every show, in orthopaedic runners.',
    gigLines: ['Gloria from the Mall-Walkers is in the front row. Runners laced, pedometer on. Show number {n}.',
      'Gloria made it again ({n} shows). She knows every word. She walked here. From the mall.',
      'Gloria holds up a sign: "GLORIA ♥ {band}". New sign every show. This is sign {n}.',
      'Gloria is here. She logged eleven thousand steps just dancing. She will tell you the exact number later.'],
    gigLinesFar: ['Gloria from the Mall-Walkers is in the front row in {gcity}. She took the bus. It took two days. Show number {n}.',
      'Gloria made it to {gcity}. First time she has walked a mall this far from home. She reports it is "adequate".'],
    comments: ["Gloria from the Mall-Walkers here. I'll be there Saturday. Front row. Runners laced.",
      'Great post. Printed it out. It is on the fridge next to my grandson and my step count.',
      "Gloria again. Haven't missed a show since the first one. Not planning to start.",
      'Gloria: I have liked this 40 times. The app only counts one. I have written to them. By hand.',
      'Played this on my walk. Did the whole mall in record time. Chase, you are a metronome.'],
    gift: 'gloria_portrait'
  };
  P.scriptedGifts = { gloria_portrait: { from: 'Gloria from the Mall-Walkers', text: 'A portrait of Chase made from food-court sugar packets, glued to a cafeteria tray. She got the hair. It hangs behind the till.' } };
  P.posts = {
    rehearsal: ['Rehearsal clip: {who} nails the knee slide on take 14. Takes 1 to 13 are in the vault. The vault is the old till.',
      'Rehearsal in Unit 4B. The nail salon is clapping through the wall. Tamara is timing it. We are two seconds fast.'],
    gig: ['This Saturday: {band} at {venue}, {gcity}. Leather is optional. Flossing is not.',
      'Gig alert: {venue}, {gcity}. Chase promises a knee slide. Tamara promises we end on time.'],
    teaser: ['New song teaser: "{song}". Lenny ran it through the app. It is ours. Probably.',
      "Ten seconds of \"{song}\". Chase is doing the high note. Gus's vacuum is doing the low one."],
    meme: ['Chase explaining the year to a calendar. The calendar is losing.', 'Lenny when the phone rings in E: 🫠. Lenny when it rings in B flat: it is Gus.'],
    bts: ['Behind the scenes: Tamara doing the band taxes. With three highlighters. It is somehow gripping.',
      'BTS: the payphone replica outside the laundromat. Chase visits it daily. It does not work. He knows.'],
    exclusive: ['Exclusive: Chase conditions the leather pants, step by step. Forty minutes. Gloria has already watched it twice.',
      "Members-only livestream from Unit 4B. 38 viewers. Gloria requests the same song six times. You play it six times."]
  };
  P.viral = {
    good: ["VIRAL: Chase knee-slides across the whole Westgate parking lot and stops exactly at Darrell's clipboard. {views} views.",
      'VIRAL: Chase holds a note so long the wind machine runs out of gas. {views} views.',
      "VIRAL: Lenny plays a riff so original the song-matching app crashes. {views} views.",
      'VIRAL: Lenny plays a solo through a vacuum motor at the sidewalk sale. Gus cries. {views} views.',
      'VIRAL: Tamara flosses mid-bass-solo without missing a note. {views} views, mostly from dentists.',
      'VIRAL: Tamara parallel-parks the van between two food trucks, first try. {views} views.'],
    cringe: [
      { who: 'chase', text: "Wrong kind of viral: Chase's eleven-minute hairspray review. {views} views, mostly laughing ones." },
      { who: 'chase', text: 'Wrong kind of viral: Chase tries to use a payphone that is actually a parking meter. {views} views.' },
      { who: 'lenny', text: 'Wrong kind of viral: Lenny\'s "totally original" riff, side by side with the one it sounds like. {views} views.' },
      { who: 'lenny', text: 'Wrong kind of viral: Lenny apologizes to a riff on camera. For forty minutes. {views} views.' },
      { who: 'tamara', text: "Wrong kind of viral: Tamara's 90-minute tire-pressure tutorial. {views} views, all of them truckers." },
      { who: 'tamara', text: 'Wrong kind of viral: Tamara reads the band minutes aloud at a gig. All of them. {views} views.' }
    ]
  };
  P.comments = {
    good: ['saw them at a strip mall in Edmonton, the nail salon next door was dancing',
      'my dad and I both like this. first thing we have agreed on since the oil price crash', 'BEST BAND IN THE 780 🔥🔥🔥',
      'this guy thinks it is 1985 and honestly? same'],
    hater: ['mullets were a mistake the first time', 'sounds like chartbusters but louder', 'my uncle had those pants. he regrets it']
  };
  P.handles = { fan: ['LeatherLarry780', 'WhyteAveWendy', 'OilCanOlivia', 'MullethMagic', 'HighLevelHank', 'SherwoodSue', 'PumpjackPam', 'RiverValleyRay'],
    hater: ['scarf_forever', 'TurnItDownTodd', 'NotIn1985Nate'] };
  P.mail = [
    { id: 'mail_gk_mallwalker', band: [B], from: 'a mall-walker in Spruce Grove', text: '"I walk faster to your album. My doctor is thrilled. My knees less so."' },
    { id: 'mail_gk_barber', band: [B], from: 'a barber in St. Albert', text: '"Twelve mullets this month. I owe you my mortgage. Please never cut your hair."' },
    { id: 'mail_gk_paralegal', band: [B], from: 'a paralegal in Calgary', text: '"I listened to the riff for work. Then I listened for fun. Please do not tell my boss."' }
  ];
  P.gifts = [
    { id: 'gk_hairspray', band: [B], from: 'a fan in Leduc', text: 'A can of hairspray the size of a fire extinguisher, with a bow on it. Chase names it.' },
    { id: 'gk_floss_bouquet', band: [B], from: 'the Sherwood Park Smile Centre', text: 'A bouquet made entirely of floss dispensers. Tamara puts it in a vase. It is the nicest thing in Unit 4B.' }
  ];

  // ======================================================================================================================
  // CALENDAR: band news by week of year (replaces the flat entry for that week) and holiday gig lines.
  // ======================================================================================================================
  P.news = {
    1: { who: 'chase', text: 'Canada Day at the Legislature. I will be in leather. It will be thirty degrees. That is commitment.' },
    3: { who: 'gk_landlord', text: 'Reminder from Westgate management: sidewalk sale this week. Tenants may set up one table. One.' },
    5: { who: 'lenny', text: 'Frosh week on campus. Every student has a lanyard, no money and a guitar that sounds like someone else.' },
    9: { who: 'tamara', text: 'Snow tires go on this week. I booked the van. Do not argue. It is booked.' },
    13: { who: 'chase', text: 'Minus 41. My pants froze to the bus bench again. I have become one with the bench.' },
    17: { who: 'gk_dj', text: 'The Freeze 88.5 is taking submissions for the spring local-music showcase. No scarves.' },
    20: { who: 'lenny', text: 'Playoff season. Nobody will come to a show on a game night. I wrote a riff for the team. It is catchy. Uh oh.' },
    23: { who: 'tamara', text: 'Construction season. Every road to Unit 4B is closed. I have printed three alternate routes.' }
  };
  P.holidayLines = {
    canada_day: ['Canada Day on the Legislature grounds. Chase does a knee slide on the lawn. The grass wins.', 'Fireworks over the river valley, mid-chorus. Chase takes credit.'],
    halloween: ['Costume night. Four people came dressed as Chase. None of them are Chase. One is Gloria.'],
    christmas: ['Christmas party circuit: a clinic party, a cash bar, and Dr. Bhullar doing the worm.'],
    nye: ["New Year's Eve. Chase counts down to 1985. Nobody corrects him. It feels right."],
    st_patricks: ["St. Paddy's on Whyte: green beer, a jig that sounds familiar, and Lenny apologizing to a leprechaun."]
  };

  // ======================================================================================================================
  // REVIEWS (reviews.outlets.<id>.byBand.gravel_kings; 2 per grade per outlet). Deci-Hell is ALL CAPS.
  // ======================================================================================================================
  P.reviews = {
    rolling_scone: {
      awful: ['{album} tries very hard to be 1985. I was there in 1985. It was better, and I had more hair.',
        'The riffs on {album} remind me of other riffs, which remind me of better records, which I am now going to play instead.'],
      meh: ['{nick:chase} has the voice and the pants. The songs on {album} have about half of each.',
        "There's a real rock record hiding in {album}. It just needs thirty years, a gatefold and fewer lawyers."],
      good: ['{single} is the kind of song they used to play at the Ex, with the lighters up. Real rock, real sweat, real Alberta.',
        'Guitar, bass, drums, a man in leather pants. {album} belongs on vinyl, next to your father\'s records. Next to mine.'],
      great: ['I wept at {single}. My wife came in to check on me. She wept too. Then she asked if it was 1985. I said yes.',
        '{album} is a classic. I say that about once a decade, usually about a record older than the band.']
    },
    proclaim: {
      awful: ['Oh no! {album} is a leather jacket with nobody in it! We wanted to love it! We tried! So hard!',
        'Look, {band} are adorable! But {album} sounds like a mixtape somebody found in a Red Deer parking lot!'],
      meh: ['{album} is FUN! Sometimes! When the riffs land, it is Edmonton in July! When they do not, it is Edmonton in January!',
        'The knee slides are great! On a record you cannot see them! We missed them!'],
      good: ['{band} are the best thing to come out of a strip mall since the dollar store! {single} is a SCREAMER!',
        'Lighters UP, Canada! {album} is big, loud, sincere rock and roll, and {nick:tamara} holds it all together!'],
      great: ['STOP EVERYTHING! {album} is the rock record of the year and it was made between a nail salon and a vacuum repair!',
        'We have played {single} forty times this week and our neighbours have started singing it back! GENIUS!']
    },
    pitchspork: {
      awful: ["{album} is a museum of other people's riffs, each lovingly labelled 'legally distinct'. It is not a museum anyone should visit.",
        "The band believes it is 1985. The record agrees, in the worst way: it sounds like a cassette someone else made."],
      meh: ["{album} works best when it forgets to be retro. Those moments exist. They are not the moments the band thinks are good.",
        'There is an intriguing record inside {album}, a riff-forward, strip-mall hymnal. The mullet keeps getting in the way.'],
      good: ['Against every instinct we had, {album} is sincere, sweaty and weirdly moving. {single} earns its key change.',
        "Beneath the leather, {album} is a rigorous study of the backbeat. The bassist's restraint is the record's secret thesis."],
      great: ['{album} is a knowing, unironic, fully committed act of rock devotion. We resisted. We lost. Best New Music, reluctantly.',
        "The riff that opens {single} sounds like nothing else. We checked. That alone makes {album} essential."]
    },
    deci_hell: {
      awful: ['NOT METAL. NOT EVEN NEAR METAL. {band} WEAR LEATHER PANTS FOR THE WRONG REASONS. ZERO SKULLS OF INTENT.',
        '{album} HAS MORE HAIRSPRAY THAN RIFFS. WE COUNTED. WE HAD TIME. IT WAS A LONG RECORD.'],
      meh: ['THE GUITARIST CAN PLAY. THE SINGER CAN SLIDE. {album} CAN BE ENDURED. PARTS OF IT RULE, BY ACCIDENT.',
        'NOT OUR GENRE. THE RIFF ON {single} IS HEAVY IF YOU PLAY IT AT THE WRONG SPEED. WE DID.'],
      good: ['GRUDGING RESPECT. {single} HAS A RIFF THAT HITS LIKE A SNOWPLOW. THE REST IS LEATHER. RESPECT THE LEATHER.',
        '{band} ARE NOT METAL BUT THEY ARE LOUD, SWEATY AND UNAFRAID. {album} GETS THE SKULLS IT EARNED.'],
      great: ['WE HATE TO SAY IT. {album} RULES. THE BASSIST IS A MACHINE. THE SINGER IS A WEATHER SYSTEM.',
        'ROCK, NOT METAL. BUT {single} MADE A GRIM MAN IN A BASEMENT RAISE HIS FIST. THAT IS ALL WE ASK.']
    },
    tailgate_weekly: {
      awful: ['Loud, long-haired and not one song about a truck. {album} left this reviewer looking for the fiddle.',
        "{band} sure do love leather. So does my saddle. My saddle has better hooks than {album}."],
      meh: ["There's a truck song in {album} somewhere. I kept waiting for it. It turned out to be about a van. Close enough.",
        'Not my kind of music, but {single} got my husband dancing in the Co-op parking lot. First time since 1985.'],
      good: ['{single} is a rock song you could play at a rodeo. We know, because they did, and nobody complained. High praise.',
        'Big guitars, a big chorus and a bassist who flosses. {album} is honest work. I respect honest work.'],
      great: ['I did not expect a rock record from Edmonton to make me cry into my coffee. {album} did. Twice. Once on the drive.',
        '{single} is the best driving song this paper has reviewed. And we mostly review songs about driving.']
    }
  };

  // ======================================================================================================================
  // SONGS + ALBUM WORDS (genre pools: rock) + LABELS (demandsByBand) + RECAP + LOGO + SHOP
  // ======================================================================================================================
  P.songTitles = ['Leather in the Wind Chill', 'Knee Slide to Heaven', 'Unit 4B Forever', 'Westgate Plaza Nights', 'Hairspray and Heartache',
    'Payphone on Whyte', 'Minus Forty Love Song', 'The Future Brick', 'Cease and Desist (My Heart)', 'Legally Yours',
    'Floss Me Tender', 'Midnight Curfew', 'Tire Pressure Blues', 'Oilcans in the Playoffs', 'Pumpjack Heartbeat',
    'High Level Bridge', 'Chinook Kiss', 'Mega-Mall Sunrise', 'Mullet of the North', 'Nail Salon Serenade',
    'Vacuum Repair Romance', 'Side B Forever', 'Back to 1985', 'Parkade Lights', 'Leduc Thunder', 'St. Albert Skyline',
    'Sherwood Park Fever', 'Construction Season', 'Two Seasons (Winter and Road Work)', 'Courtroom Riff', 'Original (For Real This Time)',
    'The Scarf Is a Lie', 'Radio, Give Me a Chance', 'Loading Dock Anthem', 'Gravy Kings (We Know)'];
  P.albumWords = {
    forms: ['{adj} Leather', 'Back to {place}', 'Knee Slide on {place}', '{noun} Tonight', 'Kings of {place}'],
    adj: ['Chrome', 'Frozen', 'Leather', 'Ninety-Five', 'Legally Distinct', 'Minus-Forty', 'Overdriven', 'Heavy-Duty', 'Unplugged', 'Sold-Out', 'Airbrushed', 'Retro'],
    noun: ['Mullet', 'Knee Slide', 'Payphone', 'Cassette', 'Riff', 'Panther', 'Hairspray', 'Pumpjack', 'Parkade', 'Floss', 'Lawsuit', 'Boom Box'],
    place: ['Westgate Plaza', 'the Mega-Mall', 'Leduc', 'St. Albert', 'Sherwood Park', 'the High Level', 'the Henday', '1985', 'Red Deer',
      'the Loading Dock', 'Old Strathcona', 'the River Valley', 'Lethbridge', 'the Parkade']
  };
  P.demands = {
    monolith: [
      { kind: 'radio', text: 'The single needs a 3:30 radio edit. Without the silent knee-slide section.', card: 'signed_monolith_radio_gravel_kings' },
      { kind: 'image', text: 'An image consultant will "bring the band into the present". The mullet is on the agenda.', card: 'signed_monolith_image_gravel_kings' },
      { kind: 'clearance', text: 'Every riff on the album must be cleared by legal before release. Every riff.', card: 'signed_monolith_clearance_gravel_kings' },
      { kind: 'feature', text: 'A duet with a Monolith pop act, for "reach". The pop act has a scarf.' }
    ],
    gopherwood: [
      { kind: 'showcase', text: 'Play the Gopherwood Christmas showcase in Humboldt. Every year. Forever.', card: 'signed_gopherwood_showcase_gravel_kings' },
      { kind: 'sampler', text: "One song on the label sampler, 'Songs from the Feed Store, Vol. 9'." }
    ]
  };
  P.goodYear = [
    { topic: 'fans', who: ['chase'], target: 250, good: 'A good year? {target} new fans. We got {n}. That is an arena, in 1985 numbers.',
      bad: 'A good year is {target} new fans. We got {n}. The mullet needs a bigger audience.' },
    { topic: 'songs', who: ['lenny'], target: 6, good: '{target} new songs makes a year. We wrote {n}. I checked every one on the app.',
      bad: 'A good year is {target} songs. We wrote {n}. I have more riffs, but I cannot prove they are mine.' },
    { topic: 'gigs', who: ['chase'], target: 10, good: 'Ten gigs is a real year. We played {n}. That is {n} knee slides.',
      bad: 'A real band plays {target} gigs a year. We played {n}. My knees are rested. My soul is not.' },
    { topic: 'loans', who: ['tamara', 'mom'], target: 0, good: "A good year is one without a loan from your parents. We had none. I've framed the bank statement.",
      bad: 'A good year is one with no loans. We had {n}. I have made a repayment schedule. It is laminated.' },
    { topic: 'chemistry', who: ['tamara'], target: 60, good: 'We still like each other. I measured. We are home by midnight and still friends.',
      bad: 'Band chemistry is low. I have scheduled a band dinner. Attendance is mandatory. There will be floss.' }
  ];
  P.recapHeadlines = {
    survive: ['{band} Survive Year {nth}; Unit 4B Still Smells Like Hairspray', '{band} Complete Year {nth}; Still 1985 Inside'],
    fans: ['{band} Add {n} Fans; Mullet Sales Surge', '{n} New Fans for {band}; Gloria Counts Them All'],
    crack: ['{rival} Crack; Scarf Sales Plummet', 'Scene Shaken as {rival} Fall Apart; {band} Pretend Not to Slide'],
    license: ['{band} Sell "{song}" to {brand}; Chase Defends the Pants', '"{song}" Now in a {brand} Ad; Lenny Checks the App']
  };
  P.logoLines = {
    picked: {
      chase: ['That logo is going on a jacket. My jacket. Airbrushed. With a panther.', 'Chrome letters. Lightning. 1985. Perfect. I am crying a little.'],
      lenny: ['Logo looks great. I ran it through a logo-matching app. It is ours.', 'I will put the logo on my guitar. The guitar has fewer lawyers than I do.'],
      tamara: ['Logo approved. I have ordered 200 stickers and a stamp for the envelopes.', 'I like it. It is legible. That is rare in rock.']
    },
    rebrand: {
      chase: ['New look, same 1985. I have told three radio stations. None of them are ours.', 'A new logo. The old one will live on, airbrushed on my heart.'],
      lenny: ['New logo. Checked it. Original. First try. I am suspicious.', 'Rebranded. The lawyers will need a new letterhead to send us letters.'],
      tamara: ['Rebrand invoiced, logged and filed. The old stickers go in the archive box.', 'New logo. I have updated every document. There were forty-one.']
    }
  };
  P.shopLines = {
    outro: [{ who: 'chase', text: 'What if the song... ended. On a knee slide. On purpose.' },
      { who: 'lenny', text: 'An outro. Let the last chord ring. I checked the chord. It is ours.' }],
    solo: [{ who: 'lenny', text: 'Solo section unlocked. You play quarter notes. I play something nobody can sue.' }],
    misprintCollector: [{ who: 'tamara', text: 'There is a fan page for GRAVY KINGS shirts now. The box behind the till is worth money. I have appraised it.' }],
    move: [{ who: 'chase', text: 'A real room. With a door that locks. I will need a mirror by the door. And a wind machine.' }],
    van: [{ who: 'tamara', text: 'New van. I have named it, inspected it and adjusted every mirror. Chase, do not touch the mirrors.' }],
    merchUnlock: [{ who: 'chase', text: 'New merch. I have approved the designs. I have also airbrushed the designs.' }],
    evicted: [{ who: 'tamara', text: 'The landlord changed the locks. Three weeks behind, apparently. I have the receipts. We are moving back to Unit 4B.' }],
    stickersMoved: 'Every sticker from the old van moved over, one by one, by Tamara, with a hair dryer and a level.'
  };
  P.misprint = { typo: 'GRAVY KINGS', find: 'GRAVEL', replace: 'GRAVY', name: 'GRAVY KINGS shirts (misprint)',
    stash: 'the box behind the old till', blurb: 'The first batch, misspelled. Now a collector\'s item. There will never be more gravy.' };
  P.merch = [
    { id: 'mullet_wig', name: 'Official Chase mullet wigs', tier: 'limited', band: [B], cost: 9, price: 30, perBox: 20, appeal: 0.9,
      blurb: 'Business in the front, merch in the back. One size fits most heads.' }
  ];
  P.spaces = { 1: { name: 'Rent-A-Riff, Room 9 (Whyte Ave)', blurb: 'A cinder-block room above a pita shop on Whyte. Egg-crate foam, a buzzing light, and a sign: NO KNEE SLIDES.' },
    2: { name: 'Chinook Sound', blurb: 'Rehearsal and recording in an old warehouse by the rail yards. An isolation booth, and an engineer named Priya who has heard it all.' },
    3: { name: 'Backstage at the Oilcans Arena', blurb: 'Your own room under the arena. A star on the door. The hockey team\'s laundry is next door.' } };
  P.upgradesBySpace = {
    curb_couch: { name: 'The plaza couch', blurb: 'Rescued from behind the discount store. Smells like 1997. Comes with you if you move.' },
    egg_foam: { name: 'Egg-crate foam', blurb: 'Stapled to the wall you share with the nail salon. Trinh stops knocking. Mostly.' },
    beer_fridge: { name: "The old till-counter fridge", blurb: 'A drink cooler from when Unit 4B was a convenience store. It still hums. Tamara stocks it with water.' },
    xmas_lights: { name: 'Neon beer signs', blurb: 'Two neon signs from a closed bar. One says OPEN. Chase says it means the heart.' }
  };

  // ======================================================================================================================
  // INSTALL: merge P into GG.content with the §4.1 keying. Never overwrites an entry another file already defined
  // (base files and Lane A2 win), never duplicates a card id, creates every missing container. Idempotent.
  // ======================================================================================================================
  // §4.1 per-band maps (awards.speech / speechWorstVan / carpet, recap.goodYear): a lone CARD or array becomes
  // { hail_damage: it } so Hail Damage keeps it (a no-op once the base file is keyed).
  function keyed(o, k) {
    var v = o[k];
    if (v && (Array.isArray(v) || v.choices)) o[k] = { hail_damage: v };
    return obj(o, k);
  }
  function addCards(list, cards) { cards.forEach(function (c) { if (!byId(list, c.id)) list.push(c); }); }
  function addUnique(list, items, keyFn) {
    keyFn = keyFn || function (x) { return typeof x === 'string' ? x : x.id || x.card || JSON.stringify(x); };
    var seen = {}; list.forEach(function (x) { seen[keyFn(x)] = true; });
    items.forEach(function (x) { var k = keyFn(x); if (!seen[k]) { seen[k] = true; list.push(x); } });
  }
  function fill(dst, src) { for (var k in src) if (dst[k] == null) dst[k] = src[k]; return dst; }
  var HOLIDAY_CARDS = {
    canada_day: ['holiday_canada_day_gravel_kings'], thanksgiving: ['holiday_thanksgiving_guilt_gravel_kings', 'holiday_thanksgiving_gravel_kings'],
    halloween: ['holiday_halloween_gravel_kings'], grey_mug: ['holiday_grey_mug_gravel_kings'],
    christmas: ['holiday_xmas_single_gravel_kings', 'holiday_xmas_parties_gravel_kings'], st_patricks: ['holiday_st_paddys_gravel_kings']
  };

  var PACK = { id: B, rival: RV, data: P, installed: false };
  PACK.install = function () {
    if (PACK.installed) return false;

    // ---- npcs, the rival cast, the rival-only label, rival cards, scene rows ----
    var npcs = obj(K, 'npcs');
    P.npcs.forEach(function (n) { if (!npcs[n.id]) npcs[n.id] = n; });
    var RY = obj(K, 'rivalry'), cast = obj(RY, 'cast');
    cast[RV] = cast[RV] ? fill(cast[RV], P.cast) : P.cast;
    var labels = obj(K, 'labels'), own = null;
    Object.keys(labels).forEach(function (id) { var l = labels[id]; if (!own && l && l.rivalOnly && (l.rival === RV || l.rivalId === RV)) own = id; });
    if (own) cast[RV].label = own;
    else if (!labels.airwave_dominion) labels.airwave_dominion = {
      id: 'airwave_dominion', name: 'Airwave Dominion Records', rivalOnly: true, rival: RV,
      blurb: "Chartbusters' own label, a subsidiary of the radio conglomerate they quietly bought. It signs one band. It is them.",
      advance: [0, 0], royalty: 0, albums: 0, deadlineWeeks: 0, demands: [], offerMinFans: 1e9, offerMinBuzz: 101, dropOnFlop: 0,
      rep: { name: 'Moira Chance', blurb: 'Chair of the board. Also the bassist. Never offers anyone anything.' },
      offer: 'Airwave Dominion does not sign other bands.', perks: [], catches: [] };
    addCards(arr(cast[RV], 'cards'), P.rivalCards);   // the rv_*_chartbusters variants live on the cast (like cast.tundra_wraith.cards)
    var scene = arr(RY, 'scene');
    scene.forEach(function (row) { if (row && row.id === 'chartbusters_scene' && !row.rivalId) row.rivalId = RV; });

    // ---- the Monday deck, holidays, calendar news ----
    addCards(arr(K, 'cards'), P.cards);
    var cal = obj(K, 'calendar');
    arr(cal, 'holidays').forEach(function (h) {
      if (!h || !HOLIDAY_CARDS[h.id]) return;
      // The band's own holiday cards go first (like Frost Heave and the Ramblers): the calendar deals the first card whose gate
      // passes, so the shared new-band cards (holiday_canada_day_park, ...) stay the fallback instead of always winning.
      var hc = arr(h, 'cards'), mine = HOLIDAY_CARDS[h.id].filter(function (id) { return hc.indexOf(id) < 0; });
      hc.splice.apply(hc, [0, 0].concat(mine));
    });
    arr(cal, 'holidays').forEach(function (h) {
      if (!h || !P.holidayLines[h.id] || !h.gig) return;   // only holidays that already shape gigs
      var gb2 = obj(obj(h.gig, 'byBand'), B);
      if (!gb2.lines) gb2.lines = P.holidayLines[h.id];
    });
    fill(obj(obj(obj(cal, 'byBand'), B), 'news'), P.news);   // calendar.byBand.gravel_kings.news[week] (replaces the flat week)

    // ---- shop cards + shop content ----
    addCards(arr(K, 'shopCards'), P.shopCards);
    var shop = obj(K, 'shop');
    fill(obj(obj(obj(shop, 'byBand'), B), 'lines'), P.shopLines);   // shop.byBand.gravel_kings.lines
    var merch = arr(shop, 'merch'), mp = byId(merch, 'misprint');
    if (mp) { var mb = obj(mp, 'byBand'); if (!mb[B]) mb[B] = P.misprint; }
    addCards(merch, P.merch);
    arr(shop, 'spaces').forEach(function (sp) {
      if (!sp || !P.spaces[sp.tier]) return;
      var bc = obj(sp, 'byCity'); if (!bc.Edmonton) bc.Edmonton = P.spaces[sp.tier];
    });
    arr(shop, 'upgrades').forEach(function (u) {
      if (!u || !P.upgradesBySpace[u.id]) return;
      var bs = obj(u, 'bySpace'); if (!bs.strip_mall_unit) bs.strip_mall_unit = P.upgradesBySpace[u.id];
    });

    // ---- fans (Bandbook) ----
    var bb = obj(K, 'bandbook');
    addCards(arr(bb, 'cards'), P.fanCards);
    addUnique(arr(bb, 'scandals'), P.scandals);
    var hs = obj(bb, 'homeSuperfan'); if (!hs[B]) hs[B] = P.homeSuperfan;
    fill(obj(bb, 'scriptedGifts'), P.scriptedGifts);
    var bbb = obj(obj(bb, 'byBand'), B);   // bandbook.byBand.gravel_kings: posts, viral, comments, handles, mail, gifts
    fill(obj(bbb, 'posts'), P.posts);
    fill(obj(bbb, 'viral'), P.viral);
    fill(obj(bbb, 'comments'), P.comments);
    fill(obj(bbb, 'handles'), P.handles);
    addUnique(arr(bbb, 'mail'), P.mail);
    addUnique(arr(bbb, 'gifts'), P.gifts);

    // ---- licensing ----
    var lic = obj(K, 'licensing');
    addUnique(arr(lic, 'brands'), P.brands);
    addCards(arr(K, 'licenseCards'), P.licenseCards);
    // The take path uses the first scandal whose speaker + gate pass, and lic_scandal_sellout (who 'band', gate {}) always does:
    // the band's own scandal goes in before the first who:'band' entry (the same splice as Frost Heave and the Ramblers).
    var LS = arr(K, 'licenseScandals'), mineLS = P.licenseScandals.filter(function (x) { return !LS.some(function (y) { return y && y.card === x.card; }); }), si = -1;
    for (var li = 0; li < LS.length; li++) if (LS[li] && LS[li].who === 'band') { si = li; break; }
    if (si < 0) LS.push.apply(LS, mineLS); else LS.splice.apply(LS, [si, 0].concat(mineLS));

    // ---- studio events, drama ----
    addCards(arr(K, 'studioEvents'), P.studioEvents);
    var dm = obj(obj(K, 'drama'), 'members');
    Object.keys(P.drama).forEach(function (id) { if (!dm[id]) dm[id] = P.drama[id]; });
    addCards(arr(K, 'dramaCards'), P.dramaCards);

    // ---- awards ----
    var AW = obj(K, 'awards');
    fill(obj(AW, 'outfits'), P.outfits);
    addCards(arr(AW, 'outfitCards'), P.outfitCards);
    var sp1 = keyed(AW, 'speech'); if (!sp1[B]) sp1[B] = P.speech;
    var sp2 = keyed(AW, 'speechWorstVan'); if (!sp2[B]) sp2[B] = P.speechWorstVan;
    var cp = keyed(AW, 'carpet'); if (!cp[B]) cp[B] = P.carpet;
    fill(obj(obj(AW, 'byBand'), B), { win: P.awardWin, lose: P.awardLose });
    var nm = obj(AW, 'nominees'); addUnique(arr(nm, 'rock'), P.nominees);
    var rt = obj(AW, 'rivalThanks'); if (!rt[RV]) rt[RV] = P.rivalThanks;
    var rl = obj(AW, 'rivalLoses'); if (!rl[RV]) rl[RV] = P.rivalLoses;

    // ---- lines: member-keyed pools + the band pools ----
    var L = obj(K, 'lines');
    Object.keys(P.memberLines).forEach(function (pool) {
      var p = obj(L, pool), src = P.memberLines[pool];
      Object.keys(src).forEach(function (id) { if (!p[id]) p[id] = src[id]; });
    });
    fill(obj(obj(L, 'byBand'), B), P.bandLines);

    // ---- world ----
    var WD = obj(K, 'world');
    addCards(arr(WD, 'cards'), P.worldCards);
    addUnique(arr(WD, 'packages'), P.packages);
    var chm = obj(WD, 'callHome');
    Object.keys(P.memberLines.callHome).forEach(function (id) { if (!chm[id]) chm[id] = P.memberLines.callHome[id]; });
    fill(obj(obj(obj(WD, 'lines'), 'byBand'), B), P.worldLines);
    var gc = obj(WD, 'gongCarpet'); if (!gc[B]) gc[B] = P.gongCarpet;

    // ---- road ----
    addCards(arr(K, 'roadCards'), P.roadCards);
    var drv = obj(K, 'drivers');
    var you = obj(drv, 'you'), tob = obj(obj(you, 'byBand'), B); if (!tob.takeOver) tob.takeOver = P.takeOver;   // career.pool(state, drivers.you, 'takeOver')

    // ---- reviews ----
    var outlets = obj(obj(K, 'reviews'), 'outlets');
    Object.keys(P.reviews).forEach(function (oid) {
      if (!outlets[oid]) return;
      var bb2 = obj(outlets[oid], 'byBand'); if (!bb2[B]) bb2[B] = P.reviews[oid];
    });

    // ---- song titles, album words (the rock pools) ----
    addUnique(arr(obj(K, 'songTitles'), 'rock'), P.songTitles);
    var rockWords = obj(obj(obj(K, 'albumWords'), 'titles'), 'rock');
    Object.keys(P.albumWords).forEach(function (slot) { addUnique(arr(rockWords, slot), P.albumWords[slot]); });

    // ---- labels: demands by band ----
    Object.keys(P.demands).forEach(function (lid) {
      if (!labels[lid]) return;
      var d = obj(labels[lid], 'demandsByBand'); if (!d[B]) d[B] = P.demands[lid];
    });

    // ---- recap, logo lines ----
    var RC = obj(K, 'recap');
    var rcb = obj(obj(RC, 'byBand'), B);   // recap.byBand.gravel_kings: goodYear (the flat list stays Hail Damage's) + headlines
    if (Array.isArray(RC.goodYear) || RC.goodYear == null) { if (!rcb.goodYear) rcb.goodYear = P.goodYear; }
    else if (!RC.goodYear[B]) RC.goodYear[B] = P.goodYear;
    fill(obj(rcb, 'headlines'), P.recapHeadlines);
    var LG = obj(obj(K, 'logo'), 'lines');
    ['picked', 'rebrand'].forEach(function (kind) {
      var src = P.logoLines[kind];
      if (!LG[kind]) LG[kind] = [];
      if (Array.isArray(LG[kind])) {
        var flat = [];
        Object.keys(src).forEach(function (id) { src[id].forEach(function (t) { flat.push({ who: id, text: t }); }); });
        addUnique(LG[kind], flat, function (x) { return x.who + '|' + x.text; });
      } else Object.keys(src).forEach(function (id) { if (!LG[kind][id]) LG[kind][id] = src[id]; });
    });

    PACK.installed = true;
    return true;
  };

  (GG.packs = GG.packs || {})[B] = PACK;   // on GG, not GG.content: the content validators walk GG.content
  PACK.install();
})(window.GG);
