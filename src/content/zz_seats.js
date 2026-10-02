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
  var GLS = ['garage', 'local', 'signed'], ALL = ['garage', 'local', 'signed', 'world'], LSW = ['local', 'signed', 'world'];
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
    if (step === 1) c.weight = 12;   // the seat's own storyline: it should start in the first year or two
    return c;
  }
  function flags(o) { return { flags: o }; }
  function fx(base, more) { var o = {}; var k; for (k in base) o[k] = base[k]; for (k in more || {}) o[k] = more[k]; return o; }

  var cards = [
    /* ==== Nobody Hears the Bass (seat: bass) =================================================================== */
    arc('bass', 1, 'arc_bass_1_unmiked', 'scene', '@front', 'Nobody Mics the Bass', GLS,
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
    arc('bass', 2, 'arc_bass_2_poll', 'fame', '@front', 'The Poll', ALL,
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
    arc('bass', 3, 'arc_bass_3_funk', 'weird', 'mom', 'Thursday Night', ALL,
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
    arc('rhythm', 1, 'arc_rhythm_1_compliment', 'scene', '@front', 'Whose Riff', GLS,
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
    arc('rhythm', 2, 'arc_rhythm_2_anyone', 'weird', '@grumbler', 'The Part Anyone Can Play', ALL,
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
    arc('rhythm', 3, 'arc_rhythm_3_click', 'drama', '@front', 'The Click Track Wars', ALL,
      "A producer from the city sits in on rehearsal and wants the whole band on a click. {front} wants you to BE the click. " +
      "{drummer} wants the click to be a cowbell. The producer has a laptop and a lot of feelings.",
      [ch('Play to the click', { drumSkill: 2, burnout: 4 }, 'Three hours with a beep in your ear. Your time is perfect. Your soul is a spreadsheet. The demo sounds great.', 'Your chops ↑ · Burnout ↑'),
       ch('Be the click', { chemistry: 5, mood: { '@front': 4 } }, 'The band locks to your right hand. The producer turns the laptop off and stares at you like a man seeing a sunrise.', 'Chemistry ↑ · {front} ↑'),
       ch('The click is a cowbell', { buzz: 5, mood: { '@drummer': 5 } }, '{drummer} plays a cowbell on every quarter note. The producer leaves. The cowbell stays on the record.', 'Buzz ↑ · {drummer} ↑')],
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
    arc('lead', 1, 'arc_lead_1_too_long', 'scene', '@front', 'Solo Too Long', GLS,
      'Your longest solo yet, at a real gig in a real hall. Twelve people and a dog came. By minute six the twelve people ' +
      'leave for snacks. The dog stays. The dog gets it.',
      [ch('Finish the solo', { drumSkill: 1, burnout: 4 }, 'Minute nine. The twelve come back with nachos. You are still soloing. They clap, out of respect for the nachos.', 'Your chops ↑ · Burnout ↑'),
       ch('Land it early', { chemistry: 4 }, 'You end it at minute seven, on a big bend. {front} looks relieved in a way you will think about for years.', 'Chemistry ↑'),
       ch('Play to the dog', { fans: 12, buzz: 3 }, 'You turn and solo straight at the dog. The dog howls in key. That clip gets more views than the band.', 'Fans ↑ · Buzz ↑')],
      { hail_damage: ['@drummer', 'Your solo: 9 min 14 s. My record: 11 min 2 s. On guitar. Drum record pending. Specs to follow.'],
        frost_heave: ['@drummer', 'that solo had at least nine chords in it. i counted. i am disappointed and impressed'],
        gravel_kings: ['@drummer', 'That solo sounded like a famous solo. In a good way. In a way that did not sound like a lawsuit. Rare.'],
        grid_road_ramblers: ['@drummer', 'In 1979 I played a solo so long the bar closed around me. They let me finish. You get to finish too.'] },
      2, 4),
    arc('lead', 2, 'arc_lead_2_pedal', 'money', '@grumbler', 'The Pedal', ALL,
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
    arc('lead', 3, 'arc_lead_3_quarterly', 'fame', 'dj', 'Shred Quarterly', ALL,
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

  /* ==== The player's epilogue per seat (2f legacy: endings.player[seat][tier]; drums stays endings.js) ============ */
  var P = K.endings.player = K.endings.player || {};
  P.bass = {
    arena_legends: 'You retire the bass after the last arena show. It hangs above a fireplace in {city}. Guests swear they can feel it humming when nobody is playing it.',
    canadian_institution: 'You open a bass school in {city}. The sign just says LOW END. Every student wants the line from the song. You teach it one note at a time, like a glacier.',
    cult_heroes: 'You play every reunion show. The same three hundred people come every time, and they stand on your side of the stage. They know your bass lines better than you do.',
    one_album_wonders: 'You sell your bass, then buy it back the next week. It lives in {space} in its case, waiting for the second album.',
    still_in_the_garage: 'You still play bass in {space} on Tuesday nights. The neighbours stopped complaining years ago. Their windows hum along.'
  };
  P.rhythm = {
    arena_legends: 'You hang up your guitar after the last arena show. Your right hand keeps strumming on every steering wheel in {city}. Your dentist has asked you to stop doing it in the chair.',
    canadian_institution: 'You teach rhythm guitar in {city}. Lesson one is downstrokes. Lesson two is downstrokes. Your students are the tightest players in the province.',
    cult_heroes: 'You play every reunion show. The same three hundred people come every time. They know your riffs better than you do. They hum them at you in the grocery store.',
    one_album_wonders: 'You sell your guitar, then buy it back the next week. It lives in {space} under a tarp, waiting for the second album.',
    still_in_the_garage: 'You still strum in {space} on Tuesday nights. The neighbours stopped complaining years ago. They time their lawnmowers to your riffs.'
  };
  P.lead = {
    arena_legends: 'You play one last solo at the last arena show. It runs eleven minutes. Nobody leaves. A music store in {city} names a guitar pick after you. It is very thin.',
    canadian_institution: 'You open a guitar school in {city}. Every student wants to learn the solo from the song. You charge extra for the solo. It is worth it.',
    cult_heroes: 'You play every reunion show. The same three hundred people come every time. They air-guitar your solos note for note. They bring you soup.',
    one_album_wonders: 'You sell your guitar, then buy it back the next week. It lives in {space} under a tarp, waiting for the second album and a longer solo.',
    still_in_the_garage: 'You still solo in {space} on Tuesday nights. The neighbours stopped complaining years ago. They know when the solo ends. It does not end.'
  };

  /* ==== 4. Shop names per seat (owner E14b: parody names at the drum prices; 2a reads gear[i].bySeat / kit[i].bySeat) ==== */
  var SG = {
    bass: {
      toms: { names: { metal: 'Low B of Doom', punk: 'Five-String (Duct-Taped)', rock: 'The Five-String Thunder-Plank', country: 'The Five-String Boomer' },
        blurb: 'A fifth string, lower than your opinions. Lane 5: the bottom of the bottom end.' },
      ride: { names: { metal: 'The Cryo-Fridge 8x10', punk: 'A Church-Basement Fridge Cab', rock: 'The Walk-In Freezer', country: 'The Grain-Bin Cab' },
        blurb: 'Eight ten-inch speakers in a box the size of a fridge. No new lane. The front row feels it in their fillings.' },
      pedal: { names: { metal: 'Gallop Finger Tape', punk: 'Downstroke Wrist Brace', rock: 'Slap-Happy Tape', country: 'Walking-Boots Finger Picks' },
        blurb: 'Fast fingers: hold a run and it plays itself. Without them a run is thinned to the beat.' } },
    rhythm: {
      toms: { names: { metal: 'The Drop-Tune Neck', punk: 'Fresh Strings, All Six', rock: 'The Big Chord Neck', country: 'The Capo of Destiny' },
        blurb: 'More neck, more chords. Lane 5: higher voicings for the big moments.' },
      ride: { names: { metal: 'Seven-String of the Abyss', punk: 'A Second Pickup (Unwired)', rock: 'The Twelve-String Shimmer', country: 'Rodeo-Grade Strings' },
        blurb: 'Lane 6: the top of the neck, for the shimmer and the shout.' },
      pedal: { names: { metal: 'The Chug Glove', punk: 'The 8th-Note Wristband', rock: 'Turbo Shark-Fin Picks', country: 'Boom-Chick Thumb Pick' },
        blurb: 'Fast picking: hold a run and the chugs keep coming. Without it a run is thinned to the beat.' } },
    lead: {
      toms: { names: { metal: 'Jumbo Frets of Woe', punk: 'Frets Filed Flat', rock: 'The Fret Job Supreme', country: 'Grandpa-Approved Frets' },
        blurb: 'Big frets, easy bends. Lane 5: higher notes for the hook.' },
      ride: { names: { metal: 'Twenty-Four Frets of Fury', punk: 'The Extra Fret Nobody Uses', rock: 'The Dive-Bomb Neck', country: 'The Pedal-Steel Wannabe' },
        blurb: 'Lane 6: the very top of the neck. Dogs in three townships hear the solo.' },
      pedal: { names: { metal: 'Shred Picks', punk: 'Fast Picks (Borrowed Forever)', rock: 'The Sweep Machine', country: 'Chicken-Pickin’ Picks' },
        blurb: 'Shred picks: hold a run and it rips. Without them a run is thinned to the beat.' } }
  };
  var SK = {   // amp tiers 0..3 per seat at the kit tiers' prices (the lead's whammy comes with tier 2)
    bass: [['The Practice Amp With the Hum', 'It hums in E-flat. You tuned to it. The cat leaves the room.'],
      ['A Pawn Shop Bass Combo', 'Fifteen inches of speaker and one working knob. The knob is volume. That is the one you need.'],
      ['The Maple Leaf Bass Stack', 'A head and a cab with a maple leaf on the grille. The basement windows hum along.'],
      ['The Arena Rig', 'A wall of cabinets and an amp tech named Doug. Doug has opinions about low end.']],
    rhythm: [['The Practice Amp With the Hum', 'It hums in E-flat. You tuned to it.'],
      ['Pawn Shop Combo', 'Two knobs work. The third one is for show.'],
      ['The Maple Leaf Stack', 'A half-stack with a maple leaf on the grille. It does not go to eleven; it goes to "pardon?"'],
      ['The Arena Rig', 'A wall of cabinets and an amp tech named Doug. Doug has opinions.']],
    lead: [['The Practice Amp With the Hum', 'It hums in E-flat. You tuned to it. Your solos are now also in E-flat.'],
      ['Pawn Shop Combo', 'Two knobs work. The third one is for show. It still sustains for a week.'],
      ['The Maple Leaf Stack', 'A half-stack with a maple leaf on the grille, and a whammy bar thrown in: bends score a bonus.'],
      ['The Arena Rig', 'A wall of cabinets and an amp tech named Doug. Doug times your solos. Doug has given up.']]
  };
  (K.shop.gear || []).forEach(function (g) {
    ['bass', 'rhythm', 'lead'].forEach(function (seat) { if (SG[seat][g.id]) (g.bySeat = g.bySeat || {})[seat] = SG[seat][g.id]; });
  });
  (K.shop.kit || []).forEach(function (k) {
    ['bass', 'rhythm', 'lead'].forEach(function (seat) { var x = SK[seat][k.tier]; if (x) (k.bySeat = k.bySeat || {})[seat] = { name: x[0], blurb: x[1] }; });
  });

  /* ==== 5. The creator's "Your gear" names (2b gearNames: creator.gear.shapes[seat][id], guards, stickers) =========== */
  K.creator.gear = {
    shapes: {
      bass: { plank: 'The Fence Plank', offset: 'The Lazy Offset', arrow: 'The Thunder-Arrow', violin: 'The Violin Bass (Not That One)' },
      rhythm: { double_cut: 'The Twin Horns', single_cut: 'The Grain-Bin Slab', offset: 'The Wonky Waist', acoustic: 'The Campfire Dreadnought' },
      lead: { vee: 'The V of Doom', pointy: 'The Icicle', double_cut: 'The Twin Horns', single_cut: 'The Grain-Bin Slab' }
    },
    guards: { white: 'White pickguard', black: 'Black pickguard', tortoise: 'Tortoiseshell', none: 'No pickguard' },
    stickers: { none: 'Bare body', logo: 'Band logo sticker' }
  };

  /* ==== 6. Songwriter coach lines per seat (54 coachFor: coach[genre].bySeat[seat][step], then coach.bySeat[seat][step];
     role 'drummer' = whoever is on the kit, other roles match the lineup's seatRole). They may name genres.js progNames /
     hooks (Lane D). ================================================================================================ */
  var CO = K.grooves.coach;
  CO.bySeat = {
    bass: {
      drums: [{ role: 'drummer', text: 'I picked a groove for every part. Lock your bass to my kick and nobody can stop us.' }],
      verse: [{ role: 'vocals', text: 'Keep the verse low and steady. Roots on the one. Leave me room to sing.' }, { role: 'guitar', text: 'Pick a progression and stay under me. The low end is the floor we stand on.' }],
      chorus: [{ role: 'vocals', text: 'Chorus: jump to the octave. People feel it in their chests before they hear it.' }],
      bridge: [{ role: 'drummer', text: 'Bridge: try a different progression. Then walk us home to the last chorus.' }]
    },
    rhythm: {
      drums: [{ role: 'drummer', text: 'Groove picked. Your riff and my kick should agree on where the one is.' }],
      verse: [{ role: 'vocals', text: 'The verse riff carries the song. Chug it, so the words sit on top.' }, { role: 'bass', text: 'Pick a progression and I will follow your right hand.' }],
      chorus: [{ role: 'vocals', text: 'Chorus: let it ring. Open chords. Big. The kind you can see from the back.' }],
      bridge: [{ role: 'lead guitar|guitar', text: 'The bridge is my solo spot. Give me something to stand on. Sustained chords.' }]
    },
    lead: {
      drums: [{ role: 'drummer', text: 'Groove picked. Your hook goes on top. Try not to solo through my fills.' }],
      verse: [{ role: 'vocals', text: 'Keep the verse hook small. The verse is mine. The chorus is ours.' }, { role: 'bass', text: 'Pick a hook and leave some gaps. Gaps are where the hook lives.' }],
      chorus: [{ role: 'vocals', text: 'The chorus hook should repeat. That is what people sing back on the bus home.' }],
      bridge: [{ role: 'bass|rhythm guitar|guitar', text: 'Bridge: go somewhere else. High and short, then land it.' }]
    }
  };
  var GC = {
    metal: {
      bass: { drums: [{ role: 'drummer', text: 'Groove picked. Gallop with my kick. Two hands, two feet, one bass line. One beast.' }],
        verse: [{ role: 'vocals', text: 'Under my screaming the bass must be dark. Like a lawn at midnight. Try "the tritone drop".' }, { role: 'guitar', text: 'Double my riff an octave down. Low-end spec: everything.' }],
        chorus: [{ role: 'vocals', text: 'The chorus: "the big dark lift". The windows must shake. The neighbours must wonder.' }],
        bridge: [{ role: 'lead guitar', text: 'Bridge: hold the root and let me shred. One note, held for my whole solo. You can do it.' }] },
      rhythm: { drums: [{ role: 'drummer', text: 'ok i picked a groove. there are fills in it. your riff goes between the fills' }],
        verse: [{ role: 'vocals', text: 'Chug the verse. Palm-muted, like a storm far away. I will be the lightning.' }, { role: 'lead guitar', text: 'Lock the chug to the kick. Every hit. I will double you on the right.' }],
        chorus: [{ role: 'vocals', text: 'Chorus: let the chords ring out over everything. "The big dark lift". Magnifique.' }],
        bridge: [{ role: 'lead guitar', text: 'Bridge is my solo. Sustained chords under it, please. Gain at seven. Not eight.' }] },
      lead: { drums: [{ role: 'drummer', text: 'Groove picked: 210 bpm, the blast on the chorus. Your hook goes on top. Specs on request.' }],
        verse: [{ role: 'vocals', text: 'The verse hook: something cold, like a wind off the slough. Then get out of my way.' }, { role: 'rhythm guitar', text: 'pick a hook and i will chug under it. no fills. ok one fill' }],
        chorus: [{ role: 'vocals', text: 'The chorus hook must lift. "The big chorus lift". Repeat it until the crowd surrenders.' }],
        bridge: [{ role: 'rhythm guitar', text: 'bridge is ur solo now. go nuts. i will hold the riff. baba says do not go too long' }] }
    },
    punk: {
      bass: { drums: [{ role: 'drummer', text: 'groove picked. the fast one. lock to it. permission granted' }],
        verse: [{ role: 'vocals', text: 'Verse: "three chords and a grudge". Root notes, eighths, no mercy.' }, { role: '^guitar$', text: 'two chords from me. you play the low end of both. that is the whole song' }],
        chorus: [{ role: 'vocals', text: 'Chorus: faster and louder. If council can hear the bass, we did it right.' }],
        bridge: [{ role: '^guitar$', text: 'bridge: half-time so the pit can breathe. then we go fast again' }] },
      rhythm: { drums: [{ role: 'drummer', text: 'Groove picked. The chair moves that you play the riff. Seconded. Carried.' }],
        verse: [{ role: 'drummer', text: 'Steady eighths in the verse. I will scream the bylaw over it.' }, { role: 'bass', text: 'pick a progression. i will follow your right hand. it is a good hand' }],
        chorus: [{ role: '^guitar$', text: 'chorus: same chords, angrier. that is songwriting' }],
        bridge: [{ role: '^guitar$', text: 'bridge is my solo. it is two chords. very fast. just hold something under it' }] },
      lead: { drums: [{ role: 'drummer', text: 'groove picked. two beats. the fast one and the other fast one. hook goes on top' }],
        verse: [{ role: 'vocals', text: 'Verse hook: short and loud, like a good heckle. Then let me yell.' }, { role: 'bass', text: 'leave gaps in the hook. the van likes gaps' }],
        chorus: [{ role: 'vocals', text: 'Chorus hook: one you can chant outside city hall. Repeat it. Repeat it.' }],
        bridge: [{ role: 'bass', text: 'bridge: go high, go short. no third chord. i am told that matters' }] }
    },
    rock: {
      bass: { drums: [{ role: 'drummer', text: 'Groove scheduled. Kick on one and three. Lock in with it and we are home by midnight.' }],
        verse: [{ role: 'vocals', text: 'The verse bass line should strut, like leather pants walking into 1985. Try "the highway".' }, { role: 'guitar', text: 'Pick a line that is legally distinct. I will check with my people.' }],
        chorus: [{ role: 'vocals', text: 'Chorus: the octave jump! The lighters go up! It is 1985 in every chest in the room!' }],
        bridge: [{ role: 'guitar', text: 'Bridge is my solo. Hold the root. If it sounds familiar, that is a coincidence.' }] },
      rhythm: { drums: [{ role: 'drummer', text: 'I picked a groove! A big one! I will sing over it and also drum! Very 1985!' }],
        verse: [{ role: 'drummer', text: 'Verse: chug it under me so I can sing from the kit. I have a headset now.' }, { role: 'bass', text: 'Pick a progression. I have colour-coded the chords. Blue is safe.' }],
        chorus: [{ role: 'guitar', text: 'Chorus: big open chords. Let them ring. Totally original chords. Probably.' }],
        bridge: [{ role: 'guitar', text: 'Bridge: sustained chords under my solo. My lawyers prefer sustained chords.' }] },
      lead: { drums: [{ role: 'drummer', text: 'I picked a groove. It sounds like a famous groove, so it is good. Hook on top.' }],
        verse: [{ role: 'vocals', text: 'The verse hook: something to hum in a convertible in 1985. In January. In Edmonton.' }, { role: 'bass', text: 'Leave gaps in the hook. Gaps are healthy. Like flossing.' }],
        chorus: [{ role: 'vocals', text: 'Chorus: "the big chorus lift". Repeat it. The arena must sing it back!' }],
        bridge: [{ role: 'bass', text: 'Bridge: your solo. Keep it under a minute. I have a cleaning at 8.' }] }
    },
    country: {
      bass: { drums: [{ role: 'drummer', text: 'Groove picked. Slow and steady, how the hat likes it. Root and fifth on one and three.' }],
        verse: [{ role: 'vocals', text: 'Verse: walk it like a man going home. "Home on the grid road", actually.' }, { role: 'lead guitar', text: 'Boom-chick. Root, fifth. Played behind a line like that in 1979.' }],
        chorus: [{ role: 'vocals', text: 'Chorus: walk up to it. Make the crowd feel like they are coming home.' }],
        bridge: [{ role: 'fiddle', text: 'The bridge is mine. Keep it simple underneath. I will make it sound expensive.' }] },
      rhythm: { drums: [{ role: 'drummer', text: 'Picked a train beat. I sing from the kit now. Strum like a truck idling and we are set.' }],
        verse: [{ role: 'drummer', text: 'Verse strum: steady. Like a truck idling. I mean it kindly.' }, { role: 'bass', text: 'Pick a progression. "Back and forth to town" is a good one. The hat agrees.' }],
        chorus: [{ role: 'lead guitar', text: 'Chorus: open chords, let them ring. Every great one I backed let the chorus ring.' }],
        bridge: [{ role: 'fiddle', text: 'Bridge is the fiddle break. Hold the chords still. Do not watch me enjoy it.' }] },
      lead: { drums: [{ role: 'drummer', text: 'Picked a groove. Drummed one like it in 1974 on a cardboard box. Your lick goes on top.' }],
        verse: [{ role: 'vocals', text: 'Verse lick: small. Answer my lines, do not sing over them. Like a duet with a truck.' }, { role: 'fiddle', text: 'Leave gaps in your lick. I will fill them. Tastefully.' }],
        chorus: [{ role: 'vocals', text: 'Chorus lick: the one people hum at the gas station. Repeat it. Make me cry.' }],
        bridge: [{ role: 'fiddle', text: 'Bridge: trade bars with me. For the music. Not because it is fun.' }] }
    }
  };
  Object.keys(GC).forEach(function (g) { var o = CO[g] = CO[g] || {}; o.bySeat = GC[g]; });

  /* ==== 7. The seat achievements (handoff E12; Lane B's kinds seatCareer / soloTooLong / allSeats). They join
     content.achievements once the contracts list the kinds (the lead folds them into C.ACH_KINDS at integration, as Lane B
     asked; sim_achieve checks every row's kind against GG.achieve.KINDS); until then they wait in K.seatAchievements
     (content_seats checks them). No drum words, so no seat gate: a drum career's Trophies tab shows them as goals. ======= */
  var SEAT_ACH = [
    { id: 'low_end', name: 'Low End', icon: '🔊', when: 'end', test: { kind: 'seatCareer', seat: 'bass' },
      blurb: 'Finish a career on bass. Nobody heard you. Everybody felt you. That is the job.' },
    { id: 'the_engine_room', name: 'The Engine Room', icon: '⚙️', when: 'end', test: { kind: 'seatCareer', seat: 'rhythm' },
      blurb: 'Finish a career on rhythm guitar. The riff was yours the whole time. Now it is official.' },
    { id: 'solo_too_long', name: 'Solo Too Long', icon: '🎸', when: 'gig', test: { kind: 'soloTooLong' },
      blurb: 'On lead guitar, play a song where the solo is most of your part. The dog stayed. The dog gets it.' },
    { id: 'musical_chairs', name: 'Musical Chairs', icon: '🪑', when: 'meta', test: { kind: 'allSeats' },
      blurb: 'Finish a career in every seat in the band. Everybody has sat everywhere. Nobody wants the hay bale.' }
  ];
  K.seatAchievements = SEAT_ACH;
  var AK = GG.contracts && GG.contracts.ACH_KINDS;
  if (Array.isArray(AK) && Array.isArray(K.achievements) && ['seatCareer', 'soloTooLong', 'allSeats'].every(function (k) { return AK.indexOf(k) >= 0; }))
    SEAT_ACH.forEach(function (a) { if (!K.achievements.some(function (x) { return x.id === a.id; })) K.achievements.push(a); });
})(window.GG);
