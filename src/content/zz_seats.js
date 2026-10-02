// content/zz_seats.js (v1.1 "Seats", Lane A; handoff E7 + E12, plan_contract_1.1 §4.3–§4.6, §5 A): what a string seat
// (bass, rhythm guitar, lead guitar) adds to the content. Loads after the band packs (zz_band_*), so it merges into their pools.
//   1. The three role arcs, one chain per seat (top-level seat: [seat]; shared by every band):
//        'arc_bass'   "Nobody Hears the Bass"  -> flags.bassArc   'legend' | 'secret' | 'quiet'
//        'arc_rhythm' "The Engine Room"        -> flags.rhythmArc 'credited' | 'unsung' | 'engine'
//        'arc_lead'   "Solo Too Long"          -> flags.leadArc   'guitarHero' | 'bandFirst' | 'soloAlbum'
//      Six steps each (garage -> the World), a hint on every choice, the arc flag set at step 5 (the decision), step 6 sets
//      <arc>Done (bassArcDone, rhythmArcDone, leadArcDone) and ends the chain. Every arc card carries a byBand line: one chat
//      line per band, gated swapped: <that band's swapped drummer> (so exactly one posts, in that band's voice; tokens only,
//      the cards are seen by every band).
//   2. The 12 band finales (one per band x string seat): Monday cards gated on <arc>Done + the band + the seat.
//   3. The player's epilogue per seat (endings.player.bass|rhythm|lead, every tier).
//   4. Shop names per seat (shop.gear[i].bySeat[seat] = { names: { <genre>: name }, blurb }, shop.kit[i].bySeat[seat]) at the
//      drum prices (owner E14b), the creator's "your gear" names (creator.gear), the songwriter's coach lines per seat
//      (grooves.coach.bySeat[seat][step] + grooves.coach[genre].bySeat[seat][step]; role 'drummer' = whoever is on the kit).
// The swapped drummers' own layers (week-two card, Monday cards, kit reactions, the shop's drum piece, epilogue variants)
// live in zz_seats_drummers.js. Tokens: C.TOKENS ({drummer} {instrument} {gear} {sticks} {yourPart} {seat} {front} ...).
// Rules: no USA content, parody names only, no gong on the kit, prairie tone.
(function (GG) {
  var K = GG.content;
  var HD = 'hail_damage', FH = 'frost_heave', GK = 'gravel_kings', GRR = 'grid_road_ramblers';
  var BANDS = [HD, FH, GK, GRR], GENRES = ['metal', 'punk', 'rock', 'country'];
  var GENRE = { hail_damage: 'metal', frost_heave: 'punk', gravel_kings: 'rock', grid_road_ramblers: 'country' };
  var SWAP = {   // bands.js seats (E3): who moves to the kit when you take the seat
    bass: { hail_damage: 'kenji', frost_heave: 'moth', gravel_kings: 'tamara', grid_road_ramblers: 'duke' },
    rhythm: { hail_damage: 'jaxon', frost_heave: 'rox', gravel_kings: 'chase', grid_road_ramblers: 'travis' },
    lead: { hail_damage: 'dana', frost_heave: 'benny', gravel_kings: 'lenny', grid_road_ramblers: 'earl' }
  };
  var GL = ['garage', 'local'], GLS = ['garage', 'local', 'signed'], LSW = ['local', 'signed', 'world'];
  function allGate(era) { return { era: era.slice(), genre: GENRES.slice(), band: BANDS.slice() }; }
  function bandGate(b, era, extra) {
    var g = { era: era.slice(), genre: [GENRE[b]], band: [b] };
    for (var k in extra || {}) g[k] = extra[k];
    return g;
  }
  function ch(label, effects, outcome, hint) {
    var o = { label: label, effects: effects, outcome: outcome };
    if (hint) o.hint = hint;
    return o;
  }
  function bet(label, hint, setup, effects, chance, stat, sFx, sOut, fFx, fOut) {
    var roll = { chance: chance, success: { effects: sFx, outcome: sOut }, fail: { effects: fFx, outcome: fOut } };
    if (stat) { roll.stat = stat; roll.statScale = 0.005; }
    return { label: label, hint: 'Gamble: ' + hint, effects: effects || {}, outcome: setup, roll: roll };
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  // An arc card. next = the step every choice moves to ('end' on the last step); delay = weeks until it is due.
  // byBand = { <bandId>: [who, text] }: the line goes on every choice, gated swapped: <that band's swapped member>.
  function arc(seat, step, id, type, speaker, title, era, text, choices, byBand, next, delay) {
    var chain = 'arc_' + seat, swap = SWAP[seat];
    var lines = BANDS.map(function (b) { return { who: byBand[b][0], text: byBand[b][1], swapped: swap[b] }; });
    choices.forEach(function (c) {
      var fx = c.effects = c.effects || {};
      var spec = next === 'end' ? { step: 'end' } : { step: next, delay: delay };
      fx.chain = {}; fx.chain[chain] = spec;
      fx.chat = clone(lines);
    });
    var c = { id: id, type: type, speaker: speaker, title: title, chain: chain, step: step, seat: [seat], gate: allGate(era), text: text, choices: choices };
    if (step === 1) c.weight = 3;
    return c;
  }
  function flags(o) { return { flags: o }; }
  function fx(base, more) { var o = {}; var k; for (k in base) o[k] = base[k]; for (k in more || {}) o[k] = more[k]; return o; }

  var cards = [
    /* ==== Nobody Hears the Bass (seat: bass) =================================================================== */
    arc('bass', 1, 'arc_bass_1_unmiked', 'scene', '@front', 'Nobody Mics the Bass', GL,
      "A real sound guy, for once. He mics {front}, the guitars, {drummer}'s kit and a dog that wandered in. Not you. Nobody " +
      'notices for three songs. Not the crowd, not the band. Not, if you are honest, you.',
      [ch('March over mid-song', { buzz: 3 }, "He squints at you. 'Oh, there's a bass?' He finds a cable. It was the dog's cable.", 'Buzz ↑ · the sound guy remembers you'),
       ch('Turn up. Stand closer.', { drumSkill: 1, burnout: 4 }, 'You stand so close to your amp it becomes a hat. The front row feels it in their fillings and blames the furnace.', 'Your chops ↑ · Burnout ↑'),
       ch('Let it go. Feel it instead.', { chemistry: 3 }, "Afterwards a man says 'great show, where was the bass coming from?' You say 'the floor'. He nods like that makes sense.", 'Chemistry ↑')],
      { hail_damage: ['@drummer', '({drummer} stares at the empty mic stand by your amp. After the set, the kick-drum mic is pointing at you.)'],
        frost_heave: ['@drummer', 'nobody mics the van either. we are the same, you and the van. both load-bearing'],
        gravel_kings: ['@drummer', 'I taped a mic to your cab at the break. Labelled the cable. You are welcome. Floss tonight.'],
        grid_road_ramblers: ['@drummer', "Nobody heard the bass. That's how you know it's working. The hat heard it. The hat hears everything."] },
      2, 4),
    arc('bass', 2, 'arc_bass_2_poll', 'fame', '@front', 'The Poll', GLS,
      "The band page ran a poll: 'Name the band.' {front} got 94 percent. {drummer} got 71. The bassist got zero. One person wrote in " +
      "'the tall one?' You are not the tall one.",
      [ch('Post a selfie with the bass', { fans: 15, buzz: 2 }, 'Forty-one likes. Thirty are for the bass. Somebody asks if it is for sale. Somebody else asks if you are.', 'Fans ↑'),
       ch('Start a mystery fan page', { buzz: 5, burnout: 3 }, "A page called 'Who Is the Bassist' gets eight hundred followers. You run it. Nobody knows. It is the best-run page in the scene.", 'Buzz ↑ · Burnout ↑'),
       ch('Print the shirt', { fund: -60, chemistry: 3, fans: 10 }, "A shirt that says THE TALL ONE? It outsells the band shirt in Lloydminster. Nobody can explain it.", '−$60 · Fans ↑')],
      { hail_damage: ['@drummer', '({drummer} got 4 percent, as "the guy in sunglasses". He taps your zero on the screen. Then taps his heart.)'],
        frost_heave: ['@drummer', 'i got 12 percent. people think i am a roadie who lives in the van. i am a drummer who lives in the van. big difference'],
        gravel_kings: ['@drummer', 'I got 63 percent. Most of them wrote "the one with the floss". I will take it.'],
        grid_road_ramblers: ['@drummer', "The hat got 40 percent. The hat isn't even in the band. The hat's in every band."] },
      3, 5),
    arc('bass', 3, 'arc_bass_3_funk', 'weird', 'mom', 'Thursday Night', GLS,
      "You have started a secret Thursday funk night at the Legion, under a fake name: Dr. Lowend and the Basement Committee. " +
      "It drew ninety people last week. The band's last show drew sixty. Mom found out from the Legion newsletter.",
      [ch('Keep the wig on', { fund: 80, burnout: 5 }, 'Every Thursday a different wig and a different first name. The Legion manager thinks you are four people. He pays all four.', '+$80 · Burnout ↑'),
       ch('Invite {drummer}', { chemistry: 4, mood: { '@drummer': 6 } }, '{drummer} plays a shuffle behind you on the Legion kit. It is the most fun anyone has had on a Thursday in this province.', 'Chemistry ↑ · {drummer} ↑'),
       ch('Tell the band', { mood: { all: 3 }, buzz: 3 }, "You tell them at rehearsal. {front} is hurt for exactly one song, then asks if Thursday needs a singer. It does not.", 'Moods ↑ · Buzz ↑')],
      { hail_damage: ['@drummer', '({drummer} is at the back of the Legion on Thursday, in sunglasses, in a different wig. He nods once. Every week.)'],
        frost_heave: ['@drummer', 'parked the van outside the legion thursday. you can hear dr lowend from the van. i give it four dryers out of four'],
        gravel_kings: ['@drummer', 'Dr. Lowend owes the Legion a security deposit. I paid it. It is on the band spreadsheet as "funk".'],
        grid_road_ramblers: ['@drummer', 'Went to Thursday. Danced with a widow from Gull Lake. The hat stayed on. The hat had a good night.'] },
      4, 6),
    arc('bass', 4, 'arc_bass_4_cropped', 'drama', '@front', 'Cropped', LSW,
      "The photographer sends the final shot for the new record cover. {front} is in focus. {drummer} is in focus behind the kit. " +
      'Your elbow is at the very edge. The elbow has been cropped.',
      [ch('Fight it', { buzz: 6, mood: { '@front': -5 } }, "You make them reshoot. Your face is on the cover now, a little too big. {front} calls it 'bold'. It is a word.", 'Buzz ↑ · {front} ↓'),
       ch('Embrace the mystery', { buzz: 4, chemistry: 3 }, 'The elbow becomes a logo. Fans draw it on their hands at shows. Nobody knows whose elbow it is. You know.', 'Buzz ↑ · Chemistry ↑'),
       ch('Wear something unforgettable', { fund: -150, buzz: 8 }, 'A sequined poncho, every show, forever. The next photo cannot crop you. The poncho gets its own fan mail.', '−$150 · Buzz ↑↑')],
      { hail_damage: ['@drummer', '({drummer} asks the photographer for the uncropped file. He frames it. Only the elbow.)'],
        frost_heave: ['@drummer', 'the elbow is the best part of that photo. the elbow is punk. it did not ask permission to be there'],
        gravel_kings: ['@drummer', 'I requested the full-resolution file for the band archive. Your elbow is in the archive. Properly filed.'],
        grid_road_ramblers: ['@drummer', 'They cropped the hat once. Once. The photographer works in Moose Jaw now. Just saying.'] },
      5, 5),
    arc('bass', 5, 'arc_bass_5_feature', 'fame', 'dj', 'Unsung Heroes of the Low End', LSW,
      "Rolling Scone wants you for a feature: 'Unsung Heroes of the Low End'. Half a page, a real photo, no elbows. If you go, " +
      'they will ask about Thursday nights. They always find out about Thursday nights.',
      [ch('Do the feature', fx({ buzz: 10, fans: 60 }, flags({ bassArc: 'legend' })), "The headline: 'DR. LOWEND UNMASKED'. Thursday night triples. The band reads it at the gas station, out loud.", 'Buzz ↑↑ · Fans ↑ · the legend'),
       ch('Stay a secret', fx({ chemistry: 4, burnout: -4 }, flags({ bassArc: 'secret' })), 'You send them a photo of your shoes. They run it. Thursday stays yours. Nobody knows, and somehow everybody knows.', 'Chemistry ↑ · the secret'),
       ch('Send {drummer} instead', fx({ mood: { '@drummer': 8 }, buzz: 3 }, flags({ bassArc: 'quiet' })), "The feature runs as 'Unsung Heroes of the Drum Riser'. You are quoted once: 'it's fine'. You meant it.", '{drummer} ↑ · the quiet one')],
      { hail_damage: ['@drummer', '({drummer} reads the feature with a highlighter. Every line about you is highlighted. It is all the lines.)'],
        frost_heave: ['@drummer', 'rolling scone wanted a photo of the van. i said the van is private. you can be in it though. that is new'],
        gravel_kings: ['@drummer', "I proofread the article for them. Two typos and a missing comma. The comma was yours. You're welcome."],
        grid_road_ramblers: ['@drummer', 'Rolling Scone asked me about the bass. I said ask the bassist. First time anybody asked me to pass. Felt good.'] },
      6, 4),
    arc('bass', 6, 'arc_bass_6_chant', 'scene', '@front', 'They Sing the Bass Line', LSW,
      'Somewhere far from {city}, a crowd that cannot pronounce your name sings your bass line back at you. All of it. In tune. ' +
      '{front} stops singing to listen.',
      [ch('Play it again', fx({ buzz: 10, fans: 80 }, flags({ bassArcDone: true })), "You play the line four more times. They sing it four more times. A local paper calls you 'the quiet engine'.", 'Buzz ↑↑ · Fans ↑'),
       ch('Point the bass at them', fx({ chemistry: 6, mood: { all: 4 } }, flags({ bassArcDone: true })), "You point the bass at them like a microphone. They roar. {drummer} hits the crash for you. Just for you.", 'Chemistry ↑ · Moods ↑'),
       ch('Nod. Coolly.', fx({ buzz: 6, burnout: -6 }, flags({ bassArcDone: true })), 'You nod once. The whole crowd nods back. It is the most bassist moment in recorded history.', 'Buzz ↑ · Burnout ↓')],
      { hail_damage: ['@drummer', '({drummer} keeps the beat for the crowd for an extra minute, so they can finish. Then a single nod. At you.)'],
        frost_heave: ['@drummer', 'they sang the bass line. nobody sings the drums. i am not jealous. i am a little jealous'],
        gravel_kings: ['@drummer', 'I counted. They sang it nine times. Nine. I will be putting it in the minutes.'],
        grid_road_ramblers: ['@drummer', "A whole field singing the bass. Three notes, like I always said. Three notes fit."] },
      'end'),

    /* ==== The Engine Room (seat: rhythm) ======================================================================= */
    arc('rhythm', 1, 'arc_rhythm_1_compliment', 'scene', '@front', 'Whose Riff', GL,
      "At the house party a guy in a toque grabs {soloist}: 'That riff! In the second song! Genius!' You wrote that riff. " +
      "{soloist} says 'thanks, man'. The toque guy buys {soloist} a pop.",
      [ch('Set the record straight', { buzz: 2, mood: { '@soloist': -4 } }, "You explain the riff, chord by chord. The toque guy says 'cool, cool' and asks {soloist} to sign his toque.", 'Buzz ↑ · {soloist} ↓'),
       ch('Let the riff speak', { chemistry: 3 }, 'You let it go. The riff knows who wrote it. You know who wrote it. That is two.', 'Chemistry ↑'),
       ch('Play it on the porch', { drumSkill: 1, burnout: 3 }, 'You play the riff on the porch until the toque guy turns around. He buys you a pop too. It is warm. You drink it anyway.', 'Your chops ↑ · Burnout ↑')],
      { hail_damage: ['@drummer', 'i knew it was ur riff. i put a sneaky fill under it. the fill is also ur riff now. sorry'],
        frost_heave: ['@drummer', 'Motion to credit the riff to the person who wrote it. Seconded by me. Carried. I am the drummer now. I have the gavel.'],
        gravel_kings: ['@drummer', 'In 1985 the rhythm guitarist got the girl. Or so I have been told. By myself. Repeatedly.'],
        grid_road_ramblers: ['@drummer', "I'll write a song about it. A riff gets stolen at a house party. It's about a truck, mostly."] },
      2, 4),
    arc('rhythm', 2, 'arc_rhythm_2_anyone', 'weird', '@grumbler', 'The Part Anyone Can Play', GLS,
      "The clerk at Riff Raff Music, the one with the goatee, watches you test strings and says rhythm guitar is 'the part " +
      "anyone can play'. There is a stool by the window. It is clearly for a strum-off.",
      [bet('Strum-off at the window', 'your right hand vs his goatee', 'You sit on the stool. He sits on the amp.', {}, 0.55, 'drumSkill',
         { buzz: 6, fans: 10 }, 'Eleven minutes of downstrokes. A crowd forms on the sidewalk. He concedes and gives you strings at cost.',
         { burnout: 6 }, 'He plays one chord so cleanly the window rattles. You buy strings at full price. Your wrist hurts for a week.'),
       ch('Buy your strings and go', { fund: -30, chemistry: 2 }, 'You pay, you leave, you write a riff about him on the bus. It is the best thing you write all month.', '−$30 · Chemistry ↑'),
       ch('Teach him the riff', { chemistry: 4, buzz: 2 }, "He can't play it. Not the notes, the feel. He hands you a business card: 'teaching inquiries'.", 'Chemistry ↑ · Buzz ↑')],
      { hail_damage: ['@drummer', 'anyone can play rhythm?? i played it for two years. very hard. drums are also very hard. everything is hard'],
        frost_heave: ['@drummer', 'I played rhythm guitar for nine years. Anyone can play it. Not everyone can play it while yelling about zoning.'],
        gravel_kings: ['@drummer', 'Anyone can play rhythm. Anyone can play drums. Not everyone can do it in leather. That is the separator.'],
        grid_road_ramblers: ['@drummer', "Strummed for years. The trick's not your hand. It's your heart. And your hand."] },
      3, 5),
    arc('rhythm', 3, 'arc_rhythm_3_click', 'drama', '@front', 'The Click Track Wars', GLS,
      "A producer from the city sits in on rehearsal and wants the whole band on a click. {front} wants you to BE the click. " +
      "{drummer} wants the click to be a cowbell. The producer has a laptop and a lot of feelings.",
      [ch('Play to the click', { drumSkill: 2, burnout: 4 }, 'Three hours with a beep in your ear. Your time is perfect. Your soul is a spreadsheet. The demo sounds great.', 'Your chops ↑ · Burnout ↑'),
       ch('Be the click', { chemistry: 5, mood: { '@front': 4 } }, 'The band locks to your right hand. The producer turns the laptop off and stares at you like a man seeing a sunrise.', 'Chemistry ↑ · {front} ↑'),
       ch('The click is a cowbell', { buzz: 5, mood: { '@drummer': 5 } }, '{drummer} plays a cowbell on every quarter note. The producer leaves. The cowbell stays on the record. No gong.', 'Buzz ↑ · {drummer} ↑')],
      { hail_damage: ['@drummer', 'i dont need a click. i have baba. she bangs on the ceiling on 2 and 4'],
        frost_heave: ['@drummer', 'Council has a click. It is called procedure. I hate it. Your right hand is better than procedure.'],
        gravel_kings: ['@drummer', 'In 1985 the click was a man named Dale with a stopwatch. We fired Dale. Dale is fine. He sells boats.'],
        grid_road_ramblers: ['@drummer', "Never played to a click in my life. Played to a truck idling once. Same thing, warmer."] },
      4, 6),
    arc('rhythm', 4, 'arc_rhythm_4_the_click', 'money', '@front', 'They Call Him the Click', LSW,
      "The producer suggests replacing your parts on the record with a session player everybody calls the Click. He has played on " +
      "four hundred records. He has never been in a band. He has a very tidy van.",
      [ch('Play it yourself', { drumSkill: 2, burnout: 6, mood: { all: 3 } }, 'You do forty takes until the producer stops looking at his watch. Take forty-one goes on the record. It is yours.', 'Your chops ↑ · Burnout ↑'),
       ch('Let the Click play', { fund: -200, burnout: -6 }, 'The Click plays everything in one afternoon, perfectly, and leaves. The record is tight. You listen to it once.', '−$200 · Burnout ↓'),
       bet('Play it better on the demo', 'outplay the Click', 'You record your part at home first, in one take, and send it in.', {}, 0.5, 'drumSkill',
         { buzz: 8, chemistry: 4 }, "The producer plays both. The room picks yours. The Click nods, shakes your hand, and asks who taught you. Nobody did.",
         { burnout: 5, mood: { all: -3 } }, 'The Click is better. Slightly. You know it. He knows it. He is very nice about it, which is worse.')],
      { hail_damage: ['@drummer', 'the click asked me to play to a click. i said i am the drummer now. he said thats why. rude'],
        frost_heave: ['@drummer', 'The Click once played a jingle for a councillor I despise. I have filed a complaint with myself. It was upheld.'],
        gravel_kings: ['@drummer', 'The Click played on a power ballad in 1986. Not 1985. 1986. We cannot trust him.'],
        grid_road_ramblers: ['@drummer', "Session fellas are fine. But a song knows who's playing it. Songs are like dogs that way."] },
      5, 4),
    arc('rhythm', 5, 'arc_rhythm_5_split', 'money', '@front', 'Who Wrote the Riff', LSW,
      "The royalty split meeting. A lawyer, a whiteboard and a muffin tray. Your biggest song's riff is yours, start to finish. " +
      "{front} wrote the words. Everyone looks at the whiteboard. The whiteboard says 'EVENLY?' with a question mark.",
      [ch('Ask for the credit', fx({ fund: 400, mood: { all: -4 } }, flags({ rhythmArc: 'credited' })), "Your name goes on the riff, in ink. The cheque is bigger. Rehearsal is quieter for a week. The riff is yours, officially.", '+$400 · Moods ↓ · credited'),
       ch('Split it evenly', fx({ chemistry: 8, mood: { all: 4 } }, flags({ rhythmArc: 'engine' })), "Four ways, even. {front} hugs you over the muffins. The band is an engine and you are the part that turns.", 'Chemistry ↑↑ · the engine'),
       ch('Say nothing', fx({ burnout: 6, chemistry: 2 }, flags({ rhythmArc: 'unsung' })), "The whiteboard stays as it is. Nobody asks. You eat a muffin. It is a bran muffin. Of course it is.", 'Burnout ↑ · unsung')],
      { hail_damage: ['@drummer', 'baba says the riff writer gets the biggest perogy. she has made you a perogy the size of a hubcap'],
        frost_heave: ['@drummer', 'I move that the riff be credited to its author. I am also the author of this motion. Two credits. Very efficient.'],
        gravel_kings: ['@drummer', 'In 1985 the drummer got credit for everything. I am honouring that tradition by giving it to you instead.'],
        grid_road_ramblers: ['@drummer', "Your name on the riff, my name on the tears. Fair's fair."] },
      6, 4),
    arc('rhythm', 6, 'arc_rhythm_6_trio', 'scene', '@front', 'Power Trio Night', LSW,
      "{soloist} is stuck on the wrong side of a highway closure with half the gear. Showtime is in an hour. You, {front} and " +
      '{drummer} are a power trio tonight. The setlist is now mostly you.',
      [ch('Carry the set', fx({ buzz: 10, fans: 80 }, flags({ rhythmArcDone: true })), 'Every song, the riff is the song. The crowd never misses a thing. {soloist} arrives for the encore and stands at the side, clapping.', 'Buzz ↑↑ · Fans ↑'),
       ch('Stretch the riffs', fx({ chemistry: 6, drumSkill: 1 }, flags({ rhythmArcDone: true })), 'You play every riff twice as long and the band locks in like a tractor in low gear. It is the tightest show of the year.', 'Chemistry ↑ · Your chops ↑'),
       ch('Make it an unplugged night', fx({ mood: { all: 5 }, burnout: -6 }, flags({ rhythmArcDone: true })), 'Stools, a lamp, your guitar. {front} sings the quiet versions. People film it. The quiet versions end up on the radio.', 'Moods ↑ · Burnout ↓')],
      { hail_damage: ['@drummer', 'power trio night. i did zero sneaky fills. ok four. but they were for you'],
        frost_heave: ['@drummer', 'Three people. One riff. Zero chords wasted. This is the most efficient government this band has ever had.'],
        gravel_kings: ['@drummer', 'A power trio! Like the great ones! I sang, I drummed, I did a knee slide off the riser. Do not tell the doctor.'],
        grid_road_ramblers: ['@drummer', "Sang from the kit all night and you carried us. Like a truck idling. A good truck."] },
      'end'),

    /* ==== Solo Too Long (seat: lead) ============================================================================ */
    arc('lead', 1, 'arc_lead_1_too_long', 'scene', '@front', 'Solo Too Long', GL,
      'Your first real solo, at your first real gig. Twelve people and a dog came. By minute six of the solo the twelve people ' +
      'leave for snacks. The dog stays. The dog gets it.',
      [ch('Finish the solo', { drumSkill: 1, burnout: 4 }, 'Minute nine. The twelve come back with nachos. You are still soloing. They clap, out of respect for the nachos.', 'Your chops ↑ · Burnout ↑'),
       ch('Land it early', { chemistry: 4 }, 'You end it at minute seven, on a big bend. {front} looks relieved in a way you will think about for years.', 'Chemistry ↑'),
       ch('Play to the dog', { fans: 12, buzz: 3 }, 'You turn and solo straight at the dog. The dog howls in key. That clip gets more views than the band.', 'Fans ↑ · Buzz ↑')],
      { hail_damage: ['@drummer', 'Your solo: 9 min 14 s. My record: 11 min 2 s. On guitar. Drum record pending. Specs to follow.'],
        frost_heave: ['@drummer', 'that solo had at least nine chords in it. i counted. i am disappointed and impressed'],
        gravel_kings: ['@drummer', 'That solo sounded like a famous solo. In a good way. In a way that did not sound like a lawsuit. Rare.'],
        grid_road_ramblers: ['@drummer', 'In 1979 I played a solo so long the bar closed around me. They let me finish. You get to finish too.'] },
      2, 4),
    arc('lead', 2, 'arc_lead_2_pedal', 'money', '@grumbler', 'The Pedal', GLS,
      "There is a pedal at the pawn shop: the Moose Fuzz Deluxe, hand-wired, $300. It makes your guitar sound like a snowmobile " +
      'falling down stairs. You need it. You do not have $300. You have a dream and a bus pass.',
      [ch('Buy it', { fund: -250, drumSkill: 2 }, 'You buy it. You play nothing but the Moose Fuzz for a week. The band asks you to play anything else. You play the Moose Fuzz.', '−$250 · Your chops ↑↑'),
       ch('Build one from a mail-order box', { burnout: 6, drumSkill: 1, buzz: 2 }, 'Three nights with a soldering iron. It hums, it smokes a little, it sounds like a goose. It is yours.', 'Burnout ↑ · Your chops ↑'),
       ch('Practise without it', { chemistry: 3, burnout: -3 }, 'You play the solo clean, a hundred times, until it sounds like it has a pedal. It does not need one. You still want one.', 'Chemistry ↑ · Burnout ↓')],
      { hail_damage: ['@drummer', 'Moose Fuzz Deluxe: germanium, true bypass, 9 V only. Do not run it off a daisy chain. I have opinions on daisy chains.'],
        frost_heave: ['@drummer', 'a pedal is a third chord you can step on. i have principles. i also have a broken one in the van you can have'],
        gravel_kings: ['@drummer', 'That pedal is on a famous record. I can hear it. Which famous record? Buy it and find out. Do not tell my lawyer.'],
        grid_road_ramblers: ['@drummer', "Played through a pedal like that in 1979. Set my amp on fire. Best solo I ever played. Buy it."] },
      3, 5),
    arc('lead', 3, 'arc_lead_3_quarterly', 'fame', 'dj', 'Shred Quarterly', GLS,
      "Shred Quarterly, the guitar magazine printed in a basement in Brandon, wants your rig rundown. Two pages. Pick weights, " +
      'string gauges, the works. Fair warning: everyone who does the rig rundown talks only in specs for a week.',
      [ch('Do the rundown', { buzz: 6, mood: { all: -3 } }, "You do it. For a week you answer every question in gauges. 'How are you?' 'Ten to forty-six.' The band starts a swear jar for specs.", 'Buzz ↑ · Moods ↓'),
       ch('Do it, but funny', { buzz: 4, fans: 20 }, "You list your main pick as 'a loonie' and your tone secret as 'fear'. Shred Quarterly prints it. Readers write in, furious and delighted.", 'Buzz ↑ · Fans ↑'),
       ch('Send them to {drummer}', { mood: { '@drummer': 6 }, chemistry: 3 }, "{drummer} gets a two-page spread about drums in a guitar magazine. The editor is confused. The readers love it.", '{drummer} ↑ · Chemistry ↑')],
      { hail_damage: ['@drummer', 'Rig rundown. Finally. Kick: 22 x 18. Snare: 14 x 6.5, maple. They did not ask about drums. I am telling them anyway.'],
        frost_heave: ['@drummer', 'my rig rundown: two sticks. i use both. no third stick. on principle'],
        gravel_kings: ['@drummer', 'Shred Quarterly once printed my riff next to a famous riff and asked readers to spot the difference. Nobody could.'],
        grid_road_ramblers: ['@drummer', "Shred Quarterly did my rig rundown in 1981. I said 'a guitar and a dream'. They printed 'a guitar and a dram'. Fair."] },
      4, 6),
    arc('lead', 4, 'arc_lead_4_poach', 'drama', 'rival_frontman', 'The Poach', LSW,
      "{rivalFront} slides into your messages: {rival} wants you on their next record. Session fee, their merch, their haircut. " +
      "'Just the solos,' the message says. 'You don't even have to leave your band. We would just like your hands.'",
      [ch('Tell the band', { chemistry: 6, mood: { all: 4 } }, 'You read the message out loud at rehearsal. {front} prints it, frames it and hangs it above the merch table as a warning.', 'Chemistry ↑ · Moods ↑'),
       ch('Take the session, once', { fund: 400, buzz: 4, mood: { all: -6 } }, "You play their solos for one afternoon. The cheque clears. Their record is better. Your band is very polite to you for a month.", '+$400 · Buzz ↑ · Moods ↓'),
       ch('Leave them on read', { buzz: 6 }, '{rival} sends a fruit basket, then a second message, then a third. You leave all of them on read. It becomes a scene legend.', 'Buzz ↑')],
      { hail_damage: ['@drummer', 'They want your hands? Your hands are under contract to me. I wrote the contract. In gear specs. It is binding.'],
        frost_heave: ['@drummer', 'they offered me a session once. i played two chords. they said thanks. they never called again. it was perfect'],
        gravel_kings: ['@drummer', 'They poached a drummer from us in 1985. Not me. A different drummer. It still hurts.'],
        grid_road_ramblers: ['@drummer', "Fellas have been poaching guitar players since the forties. Stay with the ones who drove you home."] },
      5, 4),
    arc('lead', 5, 'arc_lead_5_radio_edit', 'drama', '@front', 'The Radio Edit', LSW,
      'The label wants a radio edit of the single. They have marked the cut in red: your solo. All of it. The song goes from five ' +
      "minutes to three. 'Radio people,' says the label, 'have places to be.'",
      [ch('Keep the solo', fx({ buzz: 12, mood: { '@front': -4 } }, flags({ leadArc: 'guitarHero' })), "You refuse. The single goes out at five minutes. Two stations play it anyway, all of it. A trucker phones in to cry.", 'Buzz ↑↑ · the guitar hero'),
       ch('Cut it for the band', fx({ chemistry: 8, fans: 80 }, flags({ leadArc: 'bandFirst' })), "Three minutes, no solo. It is everywhere by Friday. {front} buys you a steak. You play the solo live, every night, twice as long.", 'Chemistry ↑↑ · Fans ↑ · band first'),
       ch('Save it for a solo album', fx({ fund: 300, buzz: 6 }, flags({ leadArc: 'soloAlbum' })), "You cut it, keep the tape and start a folder called SOLO ALBUM. The folder is already full.", '+$300 · Buzz ↑ · the solo album')],
      { hail_damage: ['@drummer', 'A radio edit without the solo is not a song. It is a jingle. I will play a drum solo where your solo was. In protest.'],
        frost_heave: ['@drummer', 'cut the solo. keep the two chords. that is what i have been saying for years and nobody listens'],
        gravel_kings: ['@drummer', 'In 1985 radio played the whole solo and then the DJ played it again. We must return to those values.'],
        grid_road_ramblers: ['@drummer', "They cut my solo out of a song in 1979. The song went gold. I'm still mad. Gold's not everything."] },
      6, 4),
    arc('lead', 6, 'arc_lead_6_clinic', 'fame', '@front', 'The Guitar Clinic', LSW,
      "A festival asks you to run a guitar clinic in a tent behind the main stage. Forty kids with guitars, one with a ukulele, " +
      'all of them looking at your hands. You can teach, or you can shred.',
      [ch('Teach them the solo', fx({ fans: 80, buzz: 6 }, flags({ leadArcDone: true })), 'You teach the solo slowly, one bend at a time. The ukulele kid gets it first. Forty kids play it back at you, terribly, beautifully.', 'Fans ↑ · Buzz ↑'),
       ch('Shred until the tent shakes', fx({ drumSkill: 2, buzz: 8 }, flags({ leadArcDone: true })), 'Twenty minutes, no breathing. The tent pole hums. A kid faints, then asks for a pick. You give him the pick.', 'Your chops ↑ · Buzz ↑'),
       ch('Bring the band in', fx({ chemistry: 6, mood: { all: 5 } }, flags({ leadArcDone: true })), 'You call the band into the tent and play the solo as a band. {front} sings the solo. {drummer} plays it on the toms. The kids lose it.', 'Chemistry ↑ · Moods ↑')],
      { hail_damage: ['@drummer', 'I ran the drum half of the clinic. Fourteen kids. All of them now speak in drum specs. I have built an army.'],
        frost_heave: ['@drummer', 'i taught the kids two beats. they asked for a third. i said no. they respected it. the future is safe'],
        gravel_kings: ['@drummer', 'A kid played me a beat and asked if it was original. I said no. I said nothing is. I said enjoy it anyway.'],
        grid_road_ramblers: ['@drummer', "Told the kids about the 1979 session. They didn't ask. They'll tell their kids. That's how it works."] },
      'end')
  ];

  /* ==== The 12 band finales (one per band x string seat, after <arc>Done) ========================================= */
  function fin(seat, b, id, speaker, title, text, choices) {
    var flag = { bass: 'bassArcDone', rhythm: 'rhythmArcDone', lead: 'leadArcDone' }[seat];
    return { id: id, type: 'drama', speaker: speaker, title: title, seat: [seat], once: true, weight: 6,
      gate: bandGate(b, LSW, { flags: [flag] }), text: text, choices: choices };
  }
  cards.push(
    // bass
    fin('bass', HD, 'fin_bass_hail_damage', 'marcel', 'Nice',
      'After the encore Kenji stands up behind the kit, takes off his sunglasses, looks straight at you and says one word: ' +
      "'Nice.' Then he puts the sunglasses back on and sits down. Marcel has to lie on the floor. Dana writes the date on her arm.",
      [ch('Say nothing back', { chemistry: 8, mood: { kenji: 12 } }, 'You say nothing. Kenji nods. It is the best conversation either of you has ever had.', 'Chemistry ↑↑ · Kenji ↑↑'),
       ch('Write it on the setlist', { buzz: 6, mood: { all: 6 } }, "You write NICE - KENJI on the setlist and frame it. It hangs in the garage between the moose and the cape.", 'Buzz ↑ · Moods ↑'),
       ch('Ask him to say it again', { mood: { kenji: -5 }, chemistry: 4 }, 'He does not. He never will. Jaxon claims he recorded it. He did not. Nobody did. It only happened once.', 'Kenji ↓ · Chemistry ↑')]),
    fin('bass', FH, 'fin_bass_frost_heave', 'moth', 'Permanent Permission',
      "Moth knocks on the basement door. In her hand: a laminated card, hole-punched, on a lanyard. It says PERMANENT " +
      "PERMISSION - VAN. Nobody in the band has ever had one. Rox asks where hers is. Moth does not answer.",
      [ch('Wear it everywhere', { chemistry: 6, mood: { moth: 12 } }, 'You wear it to the bank, to the dentist, to bed. Moth nods every time she sees it. You may enter the van. Forever.', 'Chemistry ↑ · Moth ↑↑'),
       ch('Knock anyway', { mood: { moth: 8, all: 3 } }, 'You still knock, every time. Moth says it is not necessary. Moth smiles, which she has done twice since 2019.', 'Moods ↑'),
       ch('Move in for a night', { burnout: -8, chemistry: 4 }, 'One night in the van. The heater ticks. Moth makes tea on a camp stove. It is the best sleep you have had in a year.', 'Burnout ↓↓ · Chemistry ↑')]),
    fin('bass', GK, 'fin_bass_gravel_kings', 'tamara', 'A Cleaning, as a Thank-You',
      "T-Bone hands you an appointment card: a dental cleaning, Tuesday, 8 a.m., her chair. 'As a thank-you,' she says. " +
      "'For the low end.' Then she calls you the band's second functioning adult. Chase and Lenny look at each other.",
      [ch('Go to the cleaning', { burnout: -6, mood: { tamara: 12 } }, 'Forty minutes, no cavities. She says your gums are "steady, like your playing". It is the nicest thing anyone has said to you.', 'Burnout ↓ · T-Bone ↑↑'),
       ch('Accept the title', { chemistry: 6, mood: { tamara: 8 } }, 'You get a key to the filing cabinet and a copy of the band budget. You read it. It is beautiful.', 'Chemistry ↑ · T-Bone ↑'),
       ch('Book the whole band', { fund: -80, chemistry: 8 }, 'Four cleanings, back to back. Chase sings in the chair. Lenny asks if the drill has a famous sound. It does. T-Bone is thrilled.', '−$80 · Chemistry ↑↑')]),
    fin('bass', GRR, 'fin_bass_grid_road_ramblers', 'duke', 'The Hat',
      'At the end of the last song Duke stands up from the kit, takes off the hat, and puts it on your head. The Quonset goes ' +
      "silent. Travis Lee starts crying. Clementine says 'well' and means a great deal by it. The hat is the character. Now you are.",
      [ch('Wear the hat', { buzz: 10, fans: 80 }, 'You wear the hat to every show. It gets more fan mail than you. You do not mind. It is the hat.', 'Buzz ↑↑ · Fans ↑'),
       ch('Give it back', { chemistry: 8, mood: { duke: 12 } }, "You put the hat back on Duke's head. He tips it to you. Nobody in the Quonset has a dry eye. Doris the horse included.", 'Chemistry ↑↑ · Duke ↑↑'),
       ch('Get your own hat', { fund: -120, mood: { all: 6 } }, 'A matching hat, from the Co-op. Duke inspects it, adjusts the brim a quarter inch, and declares it a real hat.', '−$120 · Moods ↑')]),
    // rhythm
    fin('rhythm', HD, 'fin_rhythm_hail_damage', 'baba', 'Two Lunches',
      "Baba arrives at the garage with two lunch bags. One says JAXON. The other has your name on it, spelled correctly, in " +
      "her best handwriting. Jaxon goes white. In this family, there is no higher honour than a tour lunch.",
      [ch('Eat it at the gig', { mood: { all: 6 }, burnout: -6 }, 'Cabbage rolls, a pickle and a note: "You keep the time. Good." You keep the note in your guitar case forever.', 'Moods ↑ · Burnout ↓'),
       ch('Thank Baba in person', { chemistry: 8, mood: { jaxon: 10 } }, "You thank her at the door. She pats your cheek and says the riff is 'not too much yelling'. That is a ten out of ten.", 'Chemistry ↑↑ · Jaxon ↑'),
       ch('Share it with Jaxon', { chemistry: 6, mood: { jaxon: 12 } }, 'You split both lunches down the middle. Jaxon says it is the best day of his life. He is on drums now. He plays like it.', 'Chemistry ↑ · Jaxon ↑↑')]),
    fin('rhythm', FH, 'fin_rhythm_frost_heave', 'rox', 'The Jingle',
      "Rox is running for council. Her campaign jingle is your riff, the one from the house party. It plays outside every " +
      "polling station in the ward. Councillor Pomeroy has filed a noise complaint about it. Rox has framed the complaint.",
      [ch('Play it at the rally', { buzz: 10, fans: 80, mood: { rox: 10 } }, 'You play the riff from a flatbed while Rox screams the platform from behind the kit. The ward hums it for weeks.', 'Buzz ↑↑ · Fans ↑ · Rox ↑'),
       ch('Ask for a royalty', { fund: 200, mood: { rox: -4 } }, "Rox pays you in campaign buttons and $200 from a jar. It is the most honest money in Regina politics.", '+$200 · Rox ↓'),
       ch('Write her a second verse', { chemistry: 8, mood: { rox: 8 } }, 'The second verse is about potholes. It is the most popular political song in Saskatchewan history. It is not close.', 'Chemistry ↑↑ · Rox ↑')]),
    fin('rhythm', GK, 'fin_rhythm_gravel_kings', 'chase', 'Very 1985',
      "Chase stops the rehearsal, stands up behind the kit in full leather and points a drumstick at you. 'That rhythm part,' " +
      "he says, voice shaking, 'is very 1985.' Lenny drops his pick. T-Bone writes it in the minutes. It is his highest praise.",
      [ch('Accept, humbly', { chemistry: 8, mood: { chase: 10 } }, 'You nod. Chase nods. A wind machine nobody owns turns on by itself. It is very 1985 in Unit 4B.', 'Chemistry ↑↑ · Chase ↑'),
       ch('Ask what 1986 would say', { buzz: 4, mood: { chase: -4 } }, "Chase says 1986 is a year he does not acknowledge. He says it kindly. He means it completely.", 'Buzz ↑ · Chase ↓'),
       ch('Get it on a jacket', { fund: -100, buzz: 8 }, 'VERY 1985, airbrushed across the back of a denim jacket. Chase cries when he sees it. Then he orders four more.', '−$100 · Buzz ↑')]),
    fin('rhythm', GRR, 'fin_rhythm_grid_road_ramblers', 'travis', 'Like a Truck Idling',
      "After the show Travis Lee climbs off the drum riser, wipes his eyes and says you strum 'like a truck idling'. Then he " +
      "explains he means it kindly. Then he explains it again. Then he writes a song about it. It is about a truck.",
      [ch('Take it as a compliment', { chemistry: 8, mood: { travis: 10 } }, 'It is a compliment. A truck idling means it will always start. Travis Lee hugs you for a full minute.', 'Chemistry ↑↑ · Travis Lee ↑'),
       ch('Rev it up', { buzz: 6, drumSkill: 1 }, 'You play the next song like a truck in a pull competition. Earl whoops. Clementine plays faster to keep up, and loves it.', 'Buzz ↑ · Your chops ↑'),
       ch('Learn the truck song', { fans: 80, buzz: 6 }, "The truck song goes in the set. The crowd sings 'idling, idling' at the chorus. Travis Lee weeps every single time.", 'Fans ↑ · Buzz ↑')]),
    // lead
    fin('lead', HD, 'fin_lead_hail_damage', 'dana', 'One Sentence',
      "Between songs Dana leans out from behind the kit. Everyone braces for a cymbal spec. Instead she says: 'I like playing " +
      "with you.' One sentence. No gear in it at all. Marcel drops the microphone. Jaxon checks if she has a fever.",
      [ch('Say it back', { chemistry: 10, mood: { dana: 10 } }, "You say it back. She nods. Then she says 'twenty-inch ride, by the way' to cover it. It does not cover it.", 'Chemistry ↑↑ · Dana ↑'),
       ch('Play her a solo', { buzz: 6, mood: { dana: 8 } }, 'You answer with eight bars. She answers with a drum fill eleven minutes long. The crowd stays for all of it.', 'Buzz ↑ · Dana ↑'),
       ch('Write it on the riser', { mood: { all: 6 } }, "You write I LIKE PLAYING WITH YOU on the drum riser in silver marker. She pretends not to see it. She sees it every night.", 'Moods ↑')]),
    fin('lead', FH, 'fin_lead_frost_heave', 'benny', 'A Third Chord, Once',
      "Benny takes you into the laundromat supply closet, closes the door, and says you may play a third chord. Once. In here. " +
      "Nobody can ever know. He looks at the mop bucket like it might tell.",
      [ch('Play the third chord', { chemistry: 8, mood: { benny: 10 } }, 'You play a D. It rings off the bleach. Benny closes his eyes. Then he says "never again" and means it, and also means thank you.', 'Chemistry ↑↑ · Benny ↑'),
       ch('Play it softly', { mood: { benny: 12 } }, 'You barely touch the strings. Benny nods. It is the quietest chord in punk history. He will talk about it for years.', 'Benny ↑↑'),
       ch('Decline, on principle', { buzz: 6, mood: { benny: 6 } }, "You say you respect the principle. Benny's eyes go wet. He gives you a pick with TWO written on it.", 'Buzz ↑ · Benny ↑')]),
    fin('lead', GK, 'fin_lead_gravel_kings', 'lenny', 'The Lawyers Call You',
      "Lenny's lawyers call. Not about Lenny. About you. Your solo in the single sounds like a famous solo, they say. Lenny is " +
      "beside himself with pride. 'They called YOU,' he keeps saying. 'You have arrived.'",
      [ch('Settle in style', { fund: -400, buzz: 12 }, 'You settle in a hotel ballroom with a cake shaped like a guitar. Lenny gives a speech. The lawyers cry a little.', '−$400 · Buzz ↑↑'),
       ch('Prove it is yours', { drumSkill: 2, buzz: 6 }, 'You play the solo backwards, then in a minor key, then on one string. The lawyers concede. Lenny is a little disappointed.', 'Your chops ↑ · Buzz ↑'),
       ch('Hire Lenny\'s lawyers', { fund: -200, mood: { lenny: 12 } }, 'You hire them. They are very good. They have had a lot of practice. Lenny calls it "a family business now".', '−$200 · Lenny ↑↑')]),
    fin('lead', GRR, 'fin_lead_grid_road_ramblers', 'earl', 'The Twangmaster',
      "Earl climbs off the drum riser holding his old guitar, the '72 Twangmaster with the cigarette burn on the headstock. He " +
      "puts it in your hands. 'I played it with everyone,' he says. 'Now you.' Clementine has to leave the Quonset.",
      [ch('Play it tonight', { buzz: 10, fans: 80, mood: { earl: 12 } }, 'The Twangmaster sounds like 1979 and next year at once. Earl tells the crowd about every session it played. Nobody leaves.', 'Buzz ↑↑ · Fans ↑ · Earl ↑'),
       ch('Hang it on the wall', { chemistry: 8, mood: { earl: 8 } }, 'It goes on the Quonset wall, above the hay bales. Earl tells it a story every rehearsal. The guitar listens.', 'Chemistry ↑↑ · Earl ↑'),
       ch('Give it back, for now', { mood: { earl: 6, all: 4 } }, "'Keep it till the last show,' you say. Earl nods slowly. 'That's what I said in 1979.' He does not explain.", 'Moods ↑')])
  );
  cards.forEach(function (c) { K.cards.push(c); });
})(window.GG);
