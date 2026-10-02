// content/zz_seats_drummers.js (v1.1 "Seats", Lane A; handoff E3/E6/E7, plan_contract_1.1 §4.2–§4.3, §5 A1–A2): the swapped
// drummers. When you take a string seat, the member whose seat it was moves to the kit (bands.<id>.seats); this file is their
// layer, written for a string-seat career only (every card is gated seat: [<their seat>] + swapped: <them> + their band):
//   1. a first-week card each (forceWeek 2: week 1 keeps the band's own forced card) — "they have never played drums"
//   2. four Monday cards each, with chat lines (sw_<member>_<n>)
//   3. songReactions[<member>].kit (the swapped drummer reacts to a new song from the kit; 21_sim_songs seatReactions) and
//      songReactions[<member>].bySeat[<seat>] (a bandmate reacts to your part)
//   4. shop.lines.drummerGear.byBand (the drum piece the swapped drummer gets with your gear: one line per member, gated
//      swapped: <them>, so exactly one posts)
//   5. epilogue variants (endings.epilogues[<member>]: when.seatRole 'drums' | 'drums/vocals'), inserted after the story-flag
//      entries so a story ending still wins
//   6. recruits.drummers (the drum-seat hole's recruits: nicks by genre) and drama.fillIns.drums
// Kenji never speaks (stage directions only). Rules: no USA content, parody names only, no gong on the kit, prairie tone.
(function (GG) {
  var K = GG.content;
  var BAND = { kenji: 'hail_damage', jaxon: 'hail_damage', dana: 'hail_damage', moth: 'frost_heave', rox: 'frost_heave',
    benny: 'frost_heave', tamara: 'gravel_kings', chase: 'gravel_kings', lenny: 'gravel_kings', duke: 'grid_road_ramblers',
    travis: 'grid_road_ramblers', earl: 'grid_road_ramblers' };
  var SEAT = { kenji: 'bass', moth: 'bass', tamara: 'bass', duke: 'bass', jaxon: 'rhythm', rox: 'rhythm', chase: 'rhythm',
    travis: 'rhythm', dana: 'lead', benny: 'lead', lenny: 'lead', earl: 'lead' };
  var GENRE = { hail_damage: 'metal', frost_heave: 'punk', gravel_kings: 'rock', grid_road_ramblers: 'country' };
  var ERA = { g: ['garage'], gl: ['garage', 'local'], gls: ['garage', 'local', 'signed'], ls: ['local', 'signed'],
    lsw: ['local', 'signed', 'world'], sw: ['signed', 'world'] };
  // A choice. who + line (optional) = one chat line from that member on this choice.
  function ch(label, hint, effects, outcome, who, line) {
    var fx = effects || {};
    if (who && line) fx.chat = [{ who: who, text: line }];
    return { label: label, hint: hint, effects: fx, outcome: outcome };
  }
  // A swapped drummer's card: seat [their seat], swapped: them, their band + genre.
  function sw(id, n, type, speaker, title, era, text, choices) {
    var c = { id: 'sw_' + id + '_' + n, type: type, speaker: speaker, title: title, seat: [SEAT[id]], swapped: id,
      gate: { era: ERA[era].slice(), genre: [GENRE[BAND[id]]], band: [BAND[id]] }, text: text, choices: choices, weight: 2 };
    if (n === 'first_week') { c.forceWeek = 2; delete c.weight; }
    return c;
  }

  var cards = [
    /* ==== Hail Damage ========================================================================================== */
    // Kenji (you play bass): silent, sunglasses, perfect. Never speaks.
    sw('kenji', 'first_week', 'scene', 'jaxon', 'The New Drummer', 'g',
      'Kenji has never played drums. He has a week. Monday he sits at the kit in his sunglasses. Tuesday he plays the whole set ' +
      'perfectly, without moving his face. Jaxon checks the kit for hidden speakers. There are none.',
      [ch('Ask where he learned', 'Chemistry ↑', { chemistry: 3 }, '(Kenji lowers his sunglasses one centimetre. That is the whole answer. A rumour starts by Thursday.)'),
       ch('Buy him a proper throne', '−$60 · Kenji ↑', { fund: -60, mood: { kenji: 6 } }, 'A padded throne from the pawn shop. Kenji sits on it once, nods, and never stands up again during rehearsal.', 'kenji', '(Kenji taps the new throne twice. Approval.)'),
       ch('Lock in with him all week', 'Your chops ↑ · Burnout ↑', { drumSkill: 1, burnout: 4 }, 'Bass and kick, every night, until you breathe together. Marcel says it is "a little frightening". It is.')]),
    sw('kenji', 1, 'weird', 'marcel', 'The Click', 'gl',
      "Kenji does not use a click track. Kenji IS a click track. Marcel set a metronome next to the kit as a joke. After three songs " +
      'the metronome was following Kenji.',
      [ch('Throw out the metronome', 'Chemistry ↑', { chemistry: 4 }, 'It goes in the garage bin. Kenji watches it go. Something like respect passes between them.', 'kenji', '(Kenji counts in the next song. With one finger. Silently. Everyone comes in right on time.)'),
       ch('Record the tempo map', 'Buzz ↑', { buzz: 4 }, "Dana graphs his tempo over a whole set. It is a flat line. She frames it and hangs it next to the moose."),
       ch('Try to rush him', 'Kenji ↓ · Fans ↑', { mood: { kenji: -4 }, fans: 8 }, 'You speed up. Kenji does not. The song ends with you a full bar ahead. The crowd thinks it was on purpose.')]),
    sw('kenji', 2, 'drama', 'dana', 'Sticks in the Mail', 'gls',
      'A package arrives for Kenji: a pair of drumsticks, very old, wrapped in a newspaper from Moose Jaw. No note. Dana says ' +
      'the sticks have a name burned into them. She will not say whose. She looks pale.',
      [ch('Let him keep the secret', 'Chemistry ↑ · Kenji ↑', { chemistry: 4, mood: { kenji: 6 } }, 'Nobody asks. Kenji plays the gig with the old sticks. The crowd goes very quiet in the right places.', 'kenji', '(Kenji holds up the old sticks after the encore. Just for a second. Then puts them away.)'),
       ch('Look up the name', 'Buzz ↑ · Kenji ↓', { buzz: 6, mood: { kenji: -5 } }, 'The name belongs to a session drummer who vanished in the eighties. Or a hockey coach. Or both. The internet fights about it for a week.'),
       ch('Frame the newspaper', 'Fans ↑', { fans: 20 }, 'The newspaper goes on the garage wall. Fans take photos of it. Nobody can read it. That makes it better.')]),
    sw('kenji', 3, 'fame', 'dj', 'Drummer of the Month', 'lsw',
      'Thunder Fist Monthly names Kenji its Drummer of the Month. They want an interview. Kenji has never given an interview. ' +
      'They are sending a reporter anyway. The reporter has prepared forty questions.',
      [ch('Do it as a photo essay', 'Buzz ↑ · Fans ↑', { buzz: 8, fans: 40 }, 'Forty questions, forty photos of Kenji not answering. It is the best-selling issue of the year.', 'kenji', '👍'),
       ch('You answer for him', 'Chemistry ↑ · Kenji ↑', { chemistry: 4, mood: { kenji: 8 } }, "You answer every question with 'he would rather play'. The reporter writes it down forty times."),
       ch('Send the reporter away', 'Burnout ↓ · Kenji ↑', { burnout: -5, mood: { kenji: 6 } }, 'The reporter leaves with nothing. The article runs anyway, as one sentence: "He nodded."')]),
    sw('kenji', 4, 'scene', 'marcel', 'The Fill', 'sw',
      'Mid-song, for the first time ever, Kenji plays a fill. One fill. Four beats long, perfect, and gone. Marcel stops singing. ' +
      'Jaxon drops his pick. The crowd does not know what happened, but they know something did.',
      [ch('Play it back on the bus', 'Chemistry ↑', { chemistry: 6 }, 'Somebody filmed it. You watch it eleven times on the bus. Kenji looks out the window the whole time.', 'kenji', '(Kenji lowers his sunglasses. Raises them. That was the only fill. There will not be another.)'),
       ch('Ask him for another', 'Kenji ↓ · Buzz ↑', { mood: { kenji: -4 }, buzz: 6 }, 'He does not play another. Not that night, not that year. The fill becomes a legend in three provinces.'),
       ch('Name the song after it', 'Buzz ↑ · Fans ↑', { buzz: 8, fans: 60 }, "The song is renamed 'The Fill'. Marcel insists on 'Le Roulement'. Both names are on the setlist now.")]),

    // Jaxon (you play rhythm): 19, Baba, sneaky fills. On the kit the fills are finally allowed.
    sw('jaxon', 'first_week', 'scene', 'marcel', 'Fills, Finally', 'g',
      "Jaxon has never played drums. He has a week. He sets up the kit in Baba's basement and plays fills for six days straight. " +
      'Baba bangs on the ceiling on two and four. He says it is the best click track in Saskatoon.',
      [ch('Tell him: fewer fills', 'Chemistry ↑ · Jaxon ↓', { chemistry: 3, mood: { jaxon: -4 } }, 'He agrees. Then plays a fill to agree. Then another to apologise.', 'jaxon', 'ok fewer fills. starting tomorrow. tonight is for fills'),
       ch('Let him fill everything', 'Jaxon ↑ · Buzz ↑', { mood: { jaxon: 8 }, buzz: 3 }, 'Every gap is a fill now. Some gaps are fills inside fills. The crowd loses its mind. So does Marcel.'),
       ch('Bring Baba a pie', '−$20 · Chemistry ↑', { fund: -20, chemistry: 4 }, 'Baba accepts the pie and keeps banging on the ceiling, but only on two and four. Very supportive.')]),
    sw('jaxon', 1, 'weird', 'jaxon', 'Baba Wants a Cowbell', 'gl',
      "Baba has heard the band on the radio and has one note: more cowbell. She has bought Jaxon a cowbell. It is engraved. It says " +
      "'FOR MY GRANDSON, WHO KEEPS THE TIME'. Jaxon has never been prouder or more scared.",
      [ch('Put it on the kit', 'Fans ↑ · Jaxon ↑', { fans: 20, mood: { jaxon: 6 } }, 'The cowbell goes on every song, including the ballad. Baba comes to the next gig and nods along. Only to the cowbell.', 'jaxon', 'baba says the cowbell is the best part. i agree. i am also the cowbell'),
       ch('One song only', 'Chemistry ↑', { chemistry: 4 }, 'One song gets the cowbell. Jaxon plays it like a solo. The crowd claps along for the whole thing.'),
       ch('Hide it in the van', 'Jaxon ↓ · Burnout ↓', { mood: { jaxon: -5 }, burnout: -4 }, 'The cowbell goes in the van. It rattles on every pothole. It is now the van cowbell. Baba is not told.')]),
    sw('jaxon', 2, 'drama', 'dana', 'The Riff He Gave Up', 'gls',
      "Jaxon wrote the main riff of your best song a year ago. You play it now. He plays drums under it. Tonight he says, quietly, " +
      "that he misses it a little. Not a lot. A little. He says it to the cymbal.",
      [ch('Give him the riff for one song', 'Chemistry ↑ · Jaxon ↑', { chemistry: 6, mood: { jaxon: 8 } }, 'You swap for one song: him on your guitar, you on the kit, badly. It is a mess. Everybody is grinning.', 'jaxon', 'that was the best mess of my life. do not tell baba i cried'),
       ch('Write him a drum riff', 'Your chops ↑', { drumSkill: 1 }, 'You write the riff into a drum part: the kick plays it. Jaxon plays it with both feet and a huge grin.'),
       ch('Tell him he still owns it', 'Jaxon ↑', { mood: { jaxon: 6 } }, 'You put his name back on the riff in the song notes. He reads it four times and says "cool" in a small voice.')]),
    sw('jaxon', 3, 'money', 'jaxon', 'The Drum Shop Upstairs', 'ls',
      "The music store's drum room has a kit Jaxon has visited every Saturday for a month. Black, sparkly, too expensive. He does not " +
      "ask. He just stands in front of it with his hands in his pockets. The clerk has started saying hi.",
      [ch('Band fund buys the kit', '−$400 · Jaxon ↑↑', { fund: -400, mood: { jaxon: 15 } }, 'The kit comes home. Baba makes a cake shaped like a snare. Jaxon plays the first gig on it like he has been waiting his whole life.', 'jaxon', 'i will pay the band back in fills. and also money. baba says money'),
       ch('Rent it for the tour', '−$150 · Jaxon ↑', { fund: -150, mood: { jaxon: 6 } }, 'A month with the sparkly kit. He polishes it every night. He gives it back with a thank-you note in the bass drum.'),
       ch('Help him save up', 'Chemistry ↑', { chemistry: 4 }, 'A jar in the garage that says SPARKLE FUND. Everyone drops in loonies. It takes a while. It gets there.')]),
    sw('jaxon', 4, 'scene', 'marcel', 'Behind the Kit, Grown Up', 'sw',
      "Somewhere big, in front of thousands, Jaxon plays a song with no fills at all. Not one. Just the beat, perfect, for the song. " +
      "Afterwards he looks surprised at himself. Marcel calls it 'maturité'. Dana checks if he is sick.",
      [ch('Tell him it was perfect', 'Chemistry ↑ · Jaxon ↑', { chemistry: 6, mood: { jaxon: 8 } }, 'He goes red and says thanks. Then plays one tiny fill at the end, just to keep everyone on their toes.', 'jaxon', 'no fills tonight. that was for the song. the next one is for me'),
       ch('Ask for the fills back', 'Buzz ↑', { buzz: 8 }, 'The next night he plays every fill he skipped, all at once, in the encore. It is magnificent. It is a lot.'),
       ch('Call Baba', 'Moods ↑', { mood: { all: 6 } }, 'You call Baba from backstage. She says she heard it on the radio and that it was "very tidy". He keeps the voicemail forever.')]),

    // Dana (you play lead): gear specs, solos. On the kit: drum specs, drum solos.
    sw('dana', 'first_week', 'scene', 'jaxon', 'Spec Sheet', 'g',
      'Dana has never played drums. She has a week. By Wednesday she has a binder: shell depths, head tensions, stick weights. ' +
      'By Friday she can play every song. By Saturday the binder has a second volume.',
      [ch('Read the binder', 'Chemistry ↑ · Burnout ↑', { chemistry: 4, burnout: 3 }, 'Two hundred pages. Page 140 is a diagram of the perfect hi-hat height. It is labelled "personal".', 'dana', 'Snare: 14 x 6.5, maple, tuned to the second fret of your low string. You are welcome.'),
       ch('Hand her your old solos', 'Dana ↑', { mood: { dana: 6 } }, 'She learns every one of your solos on the toms. Nobody asked her to. Nobody can stop her.'),
       ch('Book a drum lesson', '−$80 · Your chops ↑', { fund: -80, drumSkill: 1 }, 'The teacher teaches Dana for twenty minutes, then asks Dana for her binder.')]),
    sw('dana', 1, 'drama', 'dana', 'The Drum Solo', 'gl',
      "Dana has written a drum solo. It is eleven minutes long. She has drawn a diagram of where the band should stand while it " +
      "happens. You are in the parking lot.",
      [ch('Allow four minutes', 'Chemistry ↑ · Dana ↓', { chemistry: 4, mood: { dana: -4 } }, 'Four minutes, exactly. She uses a stopwatch. At 3:59 she plays the fastest fill in the history of the province.', 'dana', 'Four minutes accepted. Under protest. The protest will also be four minutes.'),
       ch('Allow all eleven', 'Dana ↑ · Fans ↓', { mood: { dana: 10 }, fans: 5 }, 'Eleven minutes. Half the crowd leaves for nachos and comes back. The other half will talk about it for years.'),
       ch('Solo together', 'Buzz ↑ · Your chops ↑', { buzz: 5, drumSkill: 1 }, 'Guitar and drums, trading bars. It turns into a war. A beautiful war. Nobody remembers who won.')]),
    sw('dana', 2, 'money', 'dana', 'The Cymbal Catalogue', 'gls',
      'Dana has circled a cymbal in a catalogue: a 22-inch ride hand-hammered by a man in Manitoba who only makes four a year. ' +
      'She has circled it nine times. The circles have circles.',
      [ch('Buy the ride', '−$250 · Dana ↑↑', { fund: -250, mood: { dana: 14 } }, 'It arrives in a wooden crate. She talks to it. The ride sounds like a church bell in a snowstorm. It is perfect.', 'dana', '22-inch, hand-hammered, 2,400 grams. It has a name now. The name is classified.'),
       ch('Find a used one', '−$100 · Dana ↑', { fund: -100, mood: { dana: 6 } }, 'A used ride with a small crack. Dana says the crack "adds character". She measures the character weekly.'),
       ch('Say no, kindly', 'Chemistry ↑ · Dana ↓', { chemistry: 3, mood: { dana: -5 } }, 'She closes the catalogue. She opens it again at night. You can hear the pages from the van.')]),
    sw('dana', 3, 'fame', 'dj', 'Rig Rundown, Drums', 'lsw',
      "A drum magazine asks for Dana's rig rundown. She has been waiting her whole life to be asked for a rig rundown. She was " +
      "expecting it to be about guitars. She has adapted. The answer is fourteen pages.",
      [ch('Print all fourteen', 'Buzz ↑ · Fans ↑', { buzz: 8, fans: 30 }, 'The magazine prints every page. Readers write in for months. A drum shop names a stool after her.', 'dana', 'Fourteen pages. They cut nothing. This is the happiest day of my life. Second happiest. The ride is first.'),
       ch('Mention the band too', 'Chemistry ↑', { chemistry: 5 }, 'She adds a paragraph about the band: "they are fine". From Dana that is a hug.'),
       ch('Mention your guitar rig', 'Buzz ↑ · Dana ↓', { buzz: 5, mood: { dana: -3 } }, 'Your rig gets one line. Dana wrote it. It is mostly a correction of your string gauge.')]),
    sw('dana', 4, 'scene', 'marcel', 'Two Solos at Once', 'sw',
      'At the biggest show of the year, Dana starts a drum solo at the exact moment you start your guitar solo. Neither of you ' +
      'stops. Marcel lies down on the stage and lets it happen.',
      [ch('Keep going', 'Buzz ↑↑', { buzz: 12 }, 'Nine minutes of two solos. The crowd splits into two halves, cheering for each. The sound guy just goes home.', 'dana', 'That was not a solo. That was a conversation. You lost. Respectfully.'),
       ch('Let her have it', 'Dana ↑ · Chemistry ↑', { mood: { dana: 10 }, chemistry: 5 }, 'You step back. She finishes. Then she plays the opening note of your solo on the toms and hands it back. Nobody breathes.'),
       ch('Land on the same note', 'Chemistry ↑ · Fans ↑', { chemistry: 6, fans: 60 }, 'You both hit the last crash and the last bend together, without looking. It is the clip of the year.')]),

    /* ==== Frost Heave ========================================================================================== */
    // Moth (you play bass): lives in the van. The kit is in the van now.
    sw('moth', 'first_week', 'scene', 'rox', 'The Van Kit', 'g',
      "Moth has never played drums. She has a week. She sets the kit up in the van, which nobody may enter without permission. " +
      'All week the van thumps in the parking lot. Nobody knows if she is practising or building something.',
      [ch('Knock on the van', 'Chemistry ↑ · Moth ↑', { chemistry: 3, mood: { moth: 5 } }, 'She opens the door one inch. The kit fills the whole van. She plays you a beat through the gap and shuts the door.', 'moth', 'permission granted to listen. not to enter. the kit and i have a lease'),
       ch('Move the kit to the basement', 'Moth ↓ · Burnout ↓', { mood: { moth: -5 }, burnout: -4 }, 'The kit moves to the basement. Moth visits it every day, like a pet she gave up for adoption.'),
       ch('Play along outside', 'Your chops ↑ · Burnout ↑', { drumSkill: 1, burnout: 4 }, 'You play bass in the parking lot. She plays drums in the van. The dryers inside keep time for both of you.')]),
    sw('moth', 1, 'weird', 'benny', 'Two Beats', 'gl',
      'Benny has been teaching Moth "the punk beats". There are two. He calls the first one the Fast One and the second one the Other ' +
      "Fast One. Moth has invented a third. Benny considers this a betrayal.",
      [ch('Side with Benny', 'Benny ↑ · Moth ↓', { mood: { benny: 6, moth: -4 } }, 'The third beat is banned. Moth plays it anyway, alone, in the van, at night.', 'moth', 'the third beat lives in the van now. it has permission'),
       ch('Side with Moth', 'Moth ↑ · Benny ↓', { mood: { moth: 6, benny: -4 } }, 'The third beat goes in a song. Benny plays both his chords over it, furiously. It is the best song on the record.'),
       ch('Put it to a vote', 'Chemistry ↑', { chemistry: 4 }, 'Rox runs the vote with Roberts Rules. It takes an hour. The third beat wins by one. Benny demands a recount.')]),
    sw('moth', 2, 'drama', 'rox', 'Permission', 'gls',
      'Moth leaves a note on your amp. It is a hand-drawn form: APPLICATION TO ENTER THE VAN. Box one: name. Box two: reason. ' +
      'Box three just says WHY. Nobody else in the band has ever been given the form.',
      [ch('Fill it out honestly', 'Moth ↑ · Chemistry ↑', { mood: { moth: 8 }, chemistry: 3 }, "You write 'to say thanks for playing drums'. She stamps it APPROVED with a potato stamp. You get one visit.", 'moth', 'application approved. visit length: one song. bring a sandwich'),
       ch('Draw a picture', 'Moth ↑', { mood: { moth: 6 } }, 'You draw the van with a heart on it. She pins it inside the van. You see it there on tour, every day, through the window.'),
       ch('Leave it blank', 'Buzz ↑', { buzz: 4 }, 'You hand it back blank. Moth stares at it for a long time and says "respect". Nobody knows what happened.')]),
    sw('moth', 3, 'money', 'rox', 'The Laundromat Gig', 'lsw',
      'The Suds-O-Rama wants to sponsor the band: free laundry for life, in exchange for one show a month upstairs, between the ' +
      "dryers. Moth has already measured the space for the kit. She has drawn it in chalk on the floor.",
      [ch('Take the deal', 'Fans ↑ · Moth ↑', { fans: 40, mood: { moth: 6 } }, 'Monthly shows in the laundromat. The dryers play along. Regulars bring their socks and stay for the set.', 'moth', 'played between dryer 4 and dryer 5. dryer 5 rushed. i stayed in time. i am a professional'),
       ch('Ask for cash too', '+$150', { fund: 150 }, 'The owner gives you $150 and a box of dryer sheets. The van has never smelled better.'),
       ch('Turn it down', 'Burnout ↓', { burnout: -5 }, 'You decline politely. Moth erases the chalk kit from the floor, slowly, with a sad sock.')]),
    sw('moth', 4, 'scene', 'rox', 'The Van in the Crowd', 'sw',
      'At an outdoor festival the van is parked behind the stage. Halfway through the set Moth stands up on the riser, points at it, ' +
      'and the crowd turns around to cheer for a van. It is the van that taught her drums.',
      [ch('Play a song for the van', 'Buzz ↑ · Moth ↑', { buzz: 10, mood: { moth: 8 } }, 'A song for the van. Moth plays it with the van door open, so the van can hear. The crowd sings to a vehicle.', 'moth', 'the van heard it. the van is emotional. do not knock tonight'),
       ch('Introduce the van', 'Fans ↑', { fans: 60 }, 'You introduce the van like a band member. It gets the biggest cheer of the night. It does not play anything.'),
       ch('Let Moth speak', 'Chemistry ↑ · Moth ↑', { chemistry: 6, mood: { moth: 6 } }, "Moth takes the mic and says 'thanks for coming' into it. Four words. It is the longest speech of her life.")]),

    // Rox (you play rhythm): council heckler, screams from behind the kit, procedure.
    sw('rox', 'first_week', 'drama', 'rox', 'Point of Order', 'g',
      "Rox has never played drums. She has a week. She has filed a motion to learn. The motion carried. She plays every song " +
      'standing up, screaming the lyrics at the ceiling. The basement has a new noise complaint. She has framed it.',
      [ch('Get her a boom mic', '−$80 · Rox ↑', { fund: -80, mood: { rox: 8 } }, 'A boom mic over the kit. Now she screams AND hits things. She calls it "the full democratic process".', 'rox', 'Motion to scream from the kit: carried. Motion to sit down: tabled indefinitely.'),
       ch('Ask her to sit down', 'Chemistry ↑ · Rox ↓', { chemistry: 3, mood: { rox: -4 } }, 'She sits. For one song. Then a councillor is mentioned in the lyrics and she is up again.'),
       ch('Practise the songs slowly', 'Your chops ↑ · Burnout ↑', { drumSkill: 1, burnout: 4 }, 'Half speed, all week. She screams at half speed too. It sounds like a council meeting on a cassette.')]),
    sw('rox', 1, 'weird', 'rox', 'The Drum Kit Bylaw', 'gl',
      'The city has a bylaw about the volume of drums in a mixed-use building. Rox has found it, read it nine times, and is now ' +
      'certain it was written about her personally. She wants to play the bylaw at council. On the drums.',
      [ch('Play at council', 'Buzz ↑ · Rox ↑', { buzz: 8, mood: { rox: 8 } }, "Five minutes of public comment, delivered on a snare. The clerk times it. The minutes say 'percussive'.", 'rox', 'The minutes say percussive. I have never felt more seen by local government.'),
       ch('Write a song about it', 'Fans ↑', { fans: 25 }, "'Bylaw 7.4.2 (Mixed-Use Volume)' is the band's new opener. People who have never been to council know it by heart."),
       ch('Buy practice pads', '−$60 · Rox ↓', { fund: -60, mood: { rox: -4 } }, 'Rubber pads on every drum. Rox calls them "muzzles". She plays them very, very hard.')]),
    sw('rox', 2, 'drama', 'benny', 'Who Leads Now', 'gls',
      "Rox used to play rhythm guitar and lead the band from the front. Now she leads from the kit, and you hold the riff. Benny " +
      "keeps looking at you for the next chord. You are not sure who is in charge. Neither is Rox.",
      [ch('Let Rox count everything in', 'Rox ↑ · Chemistry ↑', { mood: { rox: 6 }, chemistry: 3 }, "She counts every song in with a stick and a council-meeting voice. It works. Everyone watches the kit.", 'rox', 'The chair recognises the drummer. The drummer recognises the chair. Order is restored.'),
       ch('Lead with the riff', 'Your chops ↑ · Rox ↓', { drumSkill: 1, mood: { rox: -3 } }, 'You start every song on your own and the band falls in. Rox calls it a coup. She is a little proud.'),
       ch('Hold a band meeting', 'Chemistry ↑', { chemistry: 5 }, 'Rox brings an agenda. Item one: who leads. Item two: snacks. Item two takes most of the meeting.')]),
    sw('rox', 3, 'fame', 'dj', 'The Screaming Drummer', 'lsw',
      'A music site lists Rox as one of the Ten Best Singing Drummers in the country. She is number four. Number three is a man ' +
      "who sings through a tuba. Rox has opinions about the methodology. She is writing to the editor.",
      [ch('Help with the letter', 'Buzz ↑ · Rox ↑', { buzz: 6, mood: { rox: 6 } }, 'The letter is four pages and cites procedure. The site moves her to number two. The tuba man writes back. It escalates.', 'rox', 'Number two. On appeal. I will take number one at the next meeting.'),
       ch('Celebrate number four', 'Chemistry ↑', { chemistry: 5 }, 'Cake that says FOUR in the basement. Rox eats a slice and admits four is respectable. Off the record.'),
       ch('Book a tuba-off', 'Fans ↑', { fans: 50 }, 'Rox versus the tuba man, live, one song each. It sells out a curling rink. Rox wins on volume. The tuba wins on hats.')]),
    sw('rox', 4, 'scene', 'benny', 'Elected From the Kit', 'sw',
      'At a big outdoor show, between songs, Rox stands on the drum throne and gives a three-minute stump speech about potholes. ' +
      'The crowd cheers every sentence. A woman with a clipboard asks her to sign a nomination form.',
      [ch('Play the riff under it', 'Buzz ↑', { buzz: 10 }, 'You loop the riff while she talks. It becomes a campaign rally with distortion. Benny plays both chords for democracy.', 'rox', 'Three minutes. No notes. That riff under it was the best policy I have ever heard.'),
       ch('Sign the form as a witness', 'Rox ↑ · Fans ↑', { mood: { rox: 10 }, fans: 40 }, 'You sign. Benny signs. Moth signs with a potato stamp. Rox is officially nominated, from a drum throne.'),
       ch('Get back to the set', 'Chemistry ↑', { chemistry: 4 }, "You hit the riff before she finishes. She laughs, sits down, and counts in the next song. 'Motion to rock.'")]),

    // Benny (you play lead): two chords, refuses a third. On the kit: two beats.
    sw('benny', 'first_week', 'scene', 'rox', 'Two Beats Only', 'g',
      'Benny has never played drums. He has a week. He learns two beats and refuses to learn a third. On principle. The principle ' +
      'is still unclear. He says the drums are "basically two chords you hit".',
      [ch('Respect the principle', 'Benny ↑', { mood: { benny: 6 } }, 'Two beats. Every song is one or the other. Somehow it works. Rox calls it "minimalist governance".', 'benny', 'two beats. the fast one and the other fast one. that is all the beats there are'),
       ch('Teach him a third beat', 'Benny ↓ · Your chops ↑', { mood: { benny: -5 }, drumSkill: 1 }, 'He learns it. He plays it once. He apologises to the kit and never plays it again.'),
       ch('Write songs for two beats', 'Chemistry ↑', { chemistry: 4 }, 'You write three songs that need exactly two beats. Benny is moved. He calls you "a real songwriter".')]),
    sw('benny', 1, 'drama', 'benny', 'A Third Chord, Overheard', 'gl',
      "You play a third chord in your solo. Just once, at the end. Benny stops drumming. He stands up behind the kit and stares at " +
      'you for a full bar. The band keeps playing without drums. It sounds fine. That is worse.',
      [ch('Apologise to Benny', 'Benny ↑ · Chemistry ↑', { mood: { benny: 6 }, chemistry: 3 }, 'You apologise. He accepts. He says the third chord is "between you and your conscience".', 'benny', 'i forgive the chord. i do not forgive the guitar. the guitar knew'),
       ch('Play a fourth chord', 'Buzz ↑ · Benny ↓', { buzz: 6, mood: { benny: -6 } }, 'Benny lies down on the floor tom. The crowd thinks it is part of the show. It is now part of the show.'),
       ch('Blame the amp', 'Fans ↑', { fans: 15 }, 'You blame the amp. Benny glares at the amp for the rest of the year. The amp takes it well.')]),
    sw('benny', 2, 'weird', 'rox', 'The Drum Principle', 'gls',
      'Benny has written a manifesto on a laundromat receipt: THE DRUM PRINCIPLE. Point one: two beats. Point two: see point one. ' +
      'He wants to staple it to the drum riser at every gig.',
      [ch('Staple it up', 'Benny ↑ · Buzz ↑', { mood: { benny: 6 }, buzz: 4 }, 'The receipt goes on the riser. Fans photograph it. Someone gets it tattooed. Benny signs the tattoo.', 'benny', 'someone tattooed the principle. point two is on their elbow. that is correct'),
       ch('Add a point three', 'Chemistry ↑ · Benny ↓', { chemistry: 3, mood: { benny: -3 } }, "You add 'point three: the guitar may do whatever it wants'. Benny crosses it out. You write it again. It is a whole war on paper."),
       ch('Print it on shirts', '−$100 · Fans ↑', { fund: -100, fans: 30 }, 'The shirt sells out in Regina. The back says SEE POINT ONE. Nobody who buys it can explain it.')]),
    sw('benny', 3, 'fame', 'dj', 'The Minimalist', 'lsw',
      'A critic calls Benny "the most disciplined drummer in Canadian punk: two beats, zero mercy". Benny reads it out loud nine ' +
      'times. On the tenth he cries a little, on principle.',
      [ch('Frame the review', 'Benny ↑', { mood: { benny: 8 } }, 'Framed above the van seat. Benny salutes it every morning. Moth has started saluting it too.', 'benny', 'zero mercy. i did not know i had zero mercy. i have it now. i will use it'),
       ch('Ask for the third beat now', 'Buzz ↑ · Benny ↓', { buzz: 6, mood: { benny: -4 } }, 'He says the review proves he was right. You say the review was about the songs. He says the songs are two beats. Fair.'),
       ch('Send the critic two chords', 'Fans ↑', { fans: 40 }, 'You mail the critic a cassette: two chords, two beats, forty seconds. The critic calls it a masterpiece. It is.')]),
    sw('benny', 4, 'scene', 'rox', 'The Encore Beat', 'sw',
      "Last song, biggest crowd of the year. The encore needs a beat Benny does not have. He looks at you. You look at him. He " +
      'nods once and plays a third beat, perfectly, for exactly four bars.',
      [ch('Never mention it', 'Benny ↑ · Chemistry ↑', { mood: { benny: 10 }, chemistry: 5 }, 'Nobody mentions it. Ever. It is the most respectful silence in punk history.', 'benny', 'that never happened. if it happened it was a version of the other fast one'),
       ch('Mention it once, kindly', 'Chemistry ↑', { chemistry: 6 }, 'You say "nice beat" on the bus. Benny looks out the window for an hour and says "thanks". You both know.'),
       ch('Put it on the live album', 'Buzz ↑ · Benny ↓', { buzz: 10, mood: { benny: -4 } }, 'The live album includes the four bars. The liner notes call it "the third beat". Benny demands an asterisk.')]),

    /* ==== Gravel Kings ========================================================================================= */
    // Tamara "T-Bone" (you play bass): the functioning adult. Drums like a dental appointment: on time.
    sw('tamara', 'first_week', 'scene', 'chase', 'T-Bone Keeps Time', 'g',
      "Tamara has never played drums. She has a week. She colour-codes the kit, books herself eight practice slots on her phone " +
      "calendar and shows up four minutes early to every one. By Friday she is the tightest drummer in Edmonton.",
      [ch('Ask for the colour code', 'Chemistry ↑', { chemistry: 4 }, 'Red for the snare, blue for the hats, green for "do not touch". You are not sure what is green. You do not touch it.', 'tamara', 'I have scheduled our rehearsals for the year. Attendance is mandatory. Flossing is encouraged.'),
       ch('Bring her a coffee', '−$10 · T-Bone ↑', { fund: -10, mood: { tamara: 6 } }, "She accepts it, checks the time, and says you are 'right on schedule'. It is a compliment. You can tell."),
       ch('Lock in with her', 'Your chops ↑ · Burnout ↑', { drumSkill: 1, burnout: 3 }, 'Bass and kick in perfect sync, every night. Chase says you two sound "like a very loud clock". You take it.')]),
    sw('tamara', 1, 'money', 'tamara', 'The Drum Budget', 'gl',
      'Tamara has made a spreadsheet for the drum kit: stick replacement schedule, head wear, cost per beat. She has calculated ' +
      'that Chase singing at the kit costs the band eleven cents a song in spit damage.',
      [ch('Approve the budget', 'Chemistry ↑ · T-Bone ↑', { chemistry: 4, mood: { tamara: 6 } }, 'The budget is approved. Sticks are replaced on schedule. The band has never been this solvent.', 'tamara', 'Budget approved. Sticks replaced Tuesdays. Chase, please aim away from the snare.'),
       ch('Buy her the good sticks', '−$40 · T-Bone ↑', { fund: -40, mood: { tamara: 8 } }, 'Hickory, matched by weight. She keeps them in a labelled case. The label has a barcode.'),
       ch('Question the spit figure', 'Buzz ↑', { buzz: 4 }, 'She shows you the data. The data is convincing. Chase wears a little towel on stage now.')]),
    sw('tamara', 2, 'drama', 'lenny', 'Too On Time', 'gls',
      "Lenny says Tamara's drumming is \"too on time\". He wants it to swing like a famous record. Tamara says swing is just being " +
      "late on purpose. She does not believe in being late. On anything.",
      [ch("Side with Tamara", 'T-Bone ↑ · Lenny ↓', { mood: { tamara: 6, lenny: -4 } }, 'The band stays on the grid. The records sound precise. A critic calls it "surgical". Tamara frames that.', 'tamara', 'Surgical. Thank you. I also floss surgically.'),
       ch('Side with Lenny', 'Lenny ↑ · T-Bone ↓', { mood: { lenny: 6, tamara: -4 } }, 'Tamara agrees to swing, but she schedules it: two percent late, on beats two and four. It works. It is very her.'),
       ch('Try both at a gig', 'Chemistry ↑', { chemistry: 4 }, 'First set on time, second set swung. The crowd likes both. Tamara writes down which one they liked more.')]),
    sw('tamara', 3, 'fame', 'dj', 'The Hygienist Behind the Kit', 'lsw',
      'Local television wants a feature on Tamara: "The Hygienist Behind the Kit". They want to film her cleaning teeth and then ' +
      'playing drums, in the same outfit. Tamara has concerns about cross-contamination.',
      [ch('Do the feature', 'Fans ↑ · Buzz ↑', { fans: 50, buzz: 6 }, 'She plays in scrubs. The segment runs at six and again at eleven. Her clinic is booked solid for a year.', 'tamara', 'The clinic is booked for a year. I will need someone to cover my shifts. Not Chase.'),
       ch('Change outfits', 'T-Bone ↑', { mood: { tamara: 6 } }, 'Scrubs for teeth, leather for drums. Chase lends her a jacket. She returns it dry-cleaned.'),
       ch('Send Chase instead', 'Buzz ↑ · T-Bone ↓', { buzz: 4, mood: { tamara: -3 } }, 'Chase shows up in leather and talks about 1985. The station cuts it to ninety seconds. Tamara is relieved.')]),
    sw('tamara', 4, 'scene', 'chase', 'The Encore Schedule', 'sw',
      "At the biggest show of the year the crowd wants a third encore. Tamara checks her watch. It is 11:52. She has a 7 a.m. " +
      "patient. She looks at you. You hold the riff and wait.",
      [ch('One more, short', 'Buzz ↑ · T-Bone ↑', { buzz: 8, mood: { tamara: 6 } }, 'One song, two minutes forty. She ends it exactly at 11:59 and walks off waving. The crowd chants her name.', 'tamara', 'Encore ended 11:59. Home by 12:40. Patient at 7. This is what rock looks like.'),
       ch('A long one', 'Fans ↑ · T-Bone ↓', { fans: 60, mood: { tamara: -4 } }, 'Seven minutes. She plays it perfectly and texts her patient from the throne to reschedule. Professionally.'),
       ch('Call it a night', 'Burnout ↓', { burnout: -6 }, "You say goodnight. Tamara mouths 'thank you' from behind the kit. Then hands out floss to the front row.")]),

    // Chase (you play rhythm): 1985, leather pants, drums + sings from the kit.
    sw('chase', 'first_week', 'scene', 'tamara', 'Very 1985 Drums', 'g',
      'Chase has never played drums. He has a week. He buys a kit with a gold finish and two bass drums from a man in a parking ' +
      'lot. He wants a drum riser that rotates. It is 1985 behind the kit now.',
      [ch('Build the riser', '−$120 · Chase ↑', { fund: -120, mood: { chase: 8 } }, 'A riser on a lazy Susan. It rotates, slowly, during the chorus. Chase sings to every corner of the room.', 'chase', 'The riser turns. The world turns. It is 1985 in every direction.'),
       ch('Say no rotating', 'Chemistry ↑ · Chase ↓', { chemistry: 3, mood: { chase: -4 } }, 'The riser stays still. Chase rotates instead, on the throne, during fills. Tamara makes him wear a seatbelt.'),
       ch('Practise the songs', 'Your chops ↑ · Burnout ↑', { drumSkill: 1, burnout: 4 }, 'You play your riffs. He plays his drums. He sings the whole time. Somehow it all lands.')]),
    sw('chase', 1, 'weird', 'chase', 'The Headset Mic', 'gl',
      'Chase wants a headset microphone, like the great singing drummers. He has found one at a garage sale. It is from an ' +
      'aerobics instructor. It still smells of 1985 and sweatbands.',
      [ch('Let him wear it', 'Buzz ↑ · Chase ↑', { buzz: 5, mood: { chase: 6 } }, 'He wears it with a sweatband. He looks like he is about to teach a class. He sings like a stadium.', 'chase', 'The headset is perfect. It also counts my steps. I took nine thousand steps sitting down.'),
       ch('Get a proper boom mic', '−$80 · Chemistry ↑', { fund: -80, chemistry: 4 }, 'A boom mic over the kit. Chase keeps the headset on anyway, unplugged, for the look.'),
       ch('Clean it first', 'Burnout ↓', { burnout: -4 }, 'Tamara cleans the headset with professional products. It comes out a different colour. Chase calls it "remastered".')]),
    sw('chase', 2, 'drama', 'lenny', 'Singing and Drumming', 'gls',
      "Chase is singing and drumming at the same time and it is hard. He keeps singing the drum part. Last night he sang 'boom, " +
      "tsss, boom' into the chorus. The crowd sang it back.",
      [ch('Keep the boom-tsss', 'Fans ↑ · Chase ↑', { fans: 25, mood: { chase: 6 } }, "'Boom tsss boom' is in the chorus now, officially. People chant it in the parking lot. It is very 1985.", 'chase', 'Boom. Tsss. Boom. The future is a word you can sing with your hands.'),
       ch('Simplify the beats', 'Chemistry ↑', { chemistry: 4 }, 'You strip the drum parts down so he can sing over them. The songs get bigger, somehow. Less is more. Chase calls it "less is 1985".'),
       ch('Take a vocal line yourself', 'Your chops ↑ · Chase ↓', { drumSkill: 1, mood: { chase: -3 } }, 'You sing the harmony on the hard bits. Chase is grateful and a little jealous. He wears more leather to compensate.')]),
    sw('chase', 3, 'fame', 'dj', 'The Time Capsule', 'lsw',
      'A radio station is burying a time capsule and wants something "very current" from the band. Chase offers his drumsticks, ' +
      'signed, in a leather case. He believes they will be dug up in 1985. Nobody corrects him.',
      [ch('Bury the sticks', 'Buzz ↑ · Chase ↑', { buzz: 6, mood: { chase: 8 } }, 'The sticks go in the capsule with a note: "TO 1985, FROM 1985". The station reads it on air. People call in, moved.', 'chase', 'The sticks are in the ground. In 1985 someone will find them and understand everything.'),
       ch('Bury a setlist instead', 'Chemistry ↑', { chemistry: 4 }, 'A setlist with everyone signed on it. Chase signs it twice, once as himself and once as "The Chase".'),
       ch('Bury a cassette', 'Fans ↑', { fans: 40 }, 'Your demo on cassette. The station plays it before burying it. Three people call to ask where to buy it. The answer is: underground.')]),
    sw('chase', 4, 'scene', 'tamara', 'Knee Slide From the Riser', 'sw',
      'Mid-chorus at the biggest show of the year, Chase stands up behind the kit, steps off the riser, and knee-slides to the front ' +
      'of the stage, still singing, sticks in hand. The beat stops. You are holding the whole song alone.',
      [ch('Hold the riff', 'Buzz ↑↑', { buzz: 12 }, 'You hold it. Four bars, eight, sixteen. He slides back to the kit and crashes in on the one. The roof nearly comes off.', 'chase', 'You held it. Like the great rhythm guitarists of 1985. I had faith. Mostly.'),
       ch('Join him at the front', 'Fans ↑ · Chemistry ↑', { fans: 60, chemistry: 4 }, 'You slide too. Lenny slides too. Tamara stays at her post and keeps the band on time with her foot.'),
       ch('Play a drumless verse', 'Chemistry ↑ · Chase ↑', { chemistry: 6, mood: { chase: 6 } }, 'A whole verse with no drums. The crowd claps the beat. Chase conducts them from the floor, weeping happily.')]),

    // Lenny (you play lead): every riff sounds famous; now every fill does.
    sw('lenny', 'first_week', 'scene', 'tamara', 'A Familiar Beat', 'g',
      "Lenny has never played drums. He has a week. Every beat he plays sounds exactly like a famous one. By Thursday the lawyers " +
      'are calling about the drums. Lenny is thrilled. It means he is good at drums already.',
      [ch('Change the beat a little', 'Chemistry ↑', { chemistry: 4 }, 'He moves one kick drum by an eighth note. The lawyers stop calling. Lenny is a little disappointed.', 'lenny', 'The lawyers called about my drumming. On day four. That is a personal best.'),
       ch('Keep it famous', 'Buzz ↑ · Lenny ↑', { buzz: 4, mood: { lenny: 6 } }, 'The beat stays. The lawyers send a letter. Lenny frames it next to the riff letters. The wall is getting full.'),
       ch('Write him a weird beat', 'Your chops ↑ · Burnout ↑', { drumSkill: 1, burnout: 3 }, 'You write a beat in seven. Nobody has ever played it before. The lawyers have nothing to say. Lenny is unsettled.')]),
    sw('lenny', 1, 'money', 'tamara', 'The Lawyers, Again', 'gl',
      "A letter from a law firm: Lenny's drum fill in the second song resembles a famous fill. Tamara has opened a spreadsheet " +
      'tab for drum lawsuits. It is next to the guitar lawsuits tab. Both tabs are colour-coded red.',
      [ch('Settle quietly', '−$150 · T-Bone ↑', { fund: -150, mood: { tamara: 4 } }, 'You settle. Tamara closes the tab. Lenny opens a new tab on his own laptop called "future fills".', 'lenny', 'Settled. I have already written a new fill. It also sounds famous. I cannot help it.'),
       ch('Fight it', 'Buzz ↑ · Burnout ↑', { buzz: 6, burnout: 4 }, 'The band goes to mediation. Lenny plays the fill on a table with two pens. The mediator says "oh, that one". You lose, but famously.'),
       ch('Play it backwards', 'Chemistry ↑', { chemistry: 4 }, 'The fill, reversed, sounds like nothing anyone has heard. Lenny is mildly devastated. The lawyers go quiet.')]),
    sw('lenny', 2, 'drama', 'chase', 'Lenny Wants a Guitar Solo', 'gls',
      "Lenny watches you take the guitar solo every night from behind the kit. Tonight, in rehearsal, he asks if he can take one " +
      'song. On guitar. He has brought his guitar. It is in a case covered in cease-and-desist letters.',
      [ch('Give him one song', 'Lenny ↑ · Chemistry ↑', { mood: { lenny: 8 }, chemistry: 4 }, 'He plays one solo a night. It sounds like a famous one. You play drums, badly. Everyone loves it.', 'lenny', 'One solo a night. Do not tell the lawyers. They will send flowers.'),
       ch('Trade solos for fills', 'Your chops ↑', { drumSkill: 1 }, 'He takes a solo, you take a fill. You learn more about drums than you wanted. He learns that he misses lawyers.'),
       ch('Say not yet', 'Lenny ↓ · Burnout ↓', { mood: { lenny: -5 }, burnout: -3 }, 'He nods and puts the guitar back in the case. He pats the case. The case looks sad. The letters look smug.')]),
    sw('lenny', 3, 'fame', 'dj', 'Sounds Like Someone', 'lsw',
      'A magazine runs a quiz: "Which Famous Drummer Is Lenny?" Readers vote. The winner is "all of them, slightly". Lenny has ' +
      'never been happier. He wants to send the magazine a fruit basket.',
      [ch('Send the fruit basket', '−$50 · Lenny ↑', { fund: -50, mood: { lenny: 8 } }, 'The magazine receives a fruit basket shaped like a drum kit. They run a photo. More readers vote. He is still all of them.', 'lenny', 'All of them, slightly. That is the nicest thing anyone has ever said about my playing.'),
       ch('Lean into it', 'Fans ↑ · Buzz ↑', { fans: 40, buzz: 4 }, 'Every show now has a segment where Lenny plays "a beat you know". The crowd guesses. They are always right. They are always wrong.'),
       ch('Ask for an original beat', 'Chemistry ↑ · Lenny ↓', { chemistry: 4, mood: { lenny: -3 } }, 'He tries. It takes a month. The new beat sounds like nothing. He plays it once and calls it "brave".')]),
    sw('lenny', 4, 'scene', 'chase', 'The Lawyers in the Front Row', 'sw',
      "At the biggest show of the year, Lenny spots his lawyers in the front row. They have bought tickets. They are wearing the " +
      'band shirt. One is air-drumming the famous fill. Lenny cannot stop smiling.',
      [ch('Dedicate a song to them', 'Buzz ↑ · Lenny ↑', { buzz: 10, mood: { lenny: 8 } }, 'You dedicate the next song "to our legal team". The lawyers stand and cheer. One of them cries. Lenny plays the famous fill.', 'lenny', 'My lawyers cried. Billable, but sincere.'),
       ch('Invite them backstage', 'Chemistry ↑', { chemistry: 5 }, 'Backstage the lawyers ask for autographs. They bring their own pens. Expensive pens. They let Lenny keep one.'),
       ch('Play all-original', 'Your chops ↑ · Buzz ↑', { drumSkill: 2, buzz: 6 }, 'A set with nothing familiar in it. The lawyers have nothing to do. They dance instead. They are bad at it. It is wonderful.')]),

    /* ==== The Grid Road Ramblers ============================================================================== */
    // Duke (you play bass): the hat. The hat is on the kit now.
    sw('duke', 'first_week', 'scene', 'travis', 'The Hat Behind the Kit', 'g',
      "Duke has never played drums. He has a week. The hat does not fit under a cymbal. Duke raises every cymbal a foot. The kit " +
      'now looks like a hat stand. Duke plays it slowly and with enormous dignity.',
      [ch('Raise the cymbals more', 'Duke ↑', { mood: { duke: 6 } }, 'The cymbals go higher. Duke has to stand up to hit them. He says standing is "more respectful to the hat".', 'duke', 'Hat clears the crash by two inches. The hat is happy. I am happy. That is the order.'),
       ch('Suggest a smaller hat', 'Chemistry ↑ · Duke ↓', { chemistry: 3, mood: { duke: -5 } }, 'Duke considers it for a long time. Then says "no" very gently, like you suggested selling a horse.'),
       ch('Lock in with him', 'Your chops ↑ · Burnout ↑', { drumSkill: 1, burnout: 3 }, 'You play the bass he used to play. He plays a slow, steady beat. You two sound like a long road at dusk.')]),
    sw('duke', 1, 'weird', 'clementine', 'The Train Beat', 'gl',
      "Clementine has decided Duke must learn the train beat: the old country shuffle on the snare. Duke practises it in the " +
      "Quonset for six hours. Vern says the cows have started walking in time.",
      [ch('Check on the cows', 'Fans ↑', { fans: 20 }, "The cows are walking in time. Vern films it. The clip of the cows gets more views than the band's last single.", 'duke', 'The cows got it before I did. Cows are naturals. The hat and I are working on it.'),
       ch('Bring Duke a sandwich', 'Duke ↑', { mood: { duke: 6 } }, 'He eats it with one hand and keeps the train beat with the other. The sandwich is also in time.'),
       ch('Tell Clementine to ease up', 'Clementine ↓ · Burnout ↓', { mood: { clementine: -4 }, burnout: -4 }, "Clementine says she is not being strict, she is being 'classical'. She lets him rest. For eleven minutes.")]),
    sw('duke', 2, 'money', 'earl', 'The Hat Sponsorship', 'gls',
      'A western-wear store in Medicine Hat wants to sponsor the hat. Not Duke. Not the band. The hat. They will pay for a cymbal ' +
      "if the hat is in every photo. Duke has asked for a night to discuss it with the hat.",
      [ch('Take the deal', '+$200 · Duke ↑', { fund: 200, mood: { duke: 4 } }, 'The hat gets a sponsor patch. The band gets a new ride cymbal with a little hat engraved on it.', 'duke', "Hat signed the deal. I witnessed. The hat drives a hard bargain. Got us a cymbal."),
       ch('Turn it down', 'Chemistry ↑ · Duke ↑', { chemistry: 4, mood: { duke: 6 } }, 'Duke says the hat is "not for sale, not for rent, and not for advertising". Earl says it is the most country sentence he has ever heard.'),
       ch('Counter: sponsor the band', 'Buzz ↑', { buzz: 5 }, 'The store says the band is not the draw. The band agrees, quietly. The hat signs alone in the end.')]),
    sw('duke', 3, 'fame', 'dj', 'The Drumming Hat', 'lsw',
      'A country music channel runs a short piece on the "drumming hat" of the prairies. They film the hat for six minutes. Duke ' +
      'appears for eleven seconds, under it. He is delighted. He calls it his best work.',
      [ch('Watch it together', 'Chemistry ↑', { chemistry: 6 }, 'The whole band watches it in the Quonset. Duke watches only the eleven seconds, on repeat, with his hat off.', 'duke', 'Eleven seconds. Under the hat. My mother saw it. She said she would know that hat anywhere.'),
       ch('Book the TV crew a show', 'Fans ↑ · Buzz ↑', { fans: 50, buzz: 4 }, 'The crew films a gig. The hat gets close-ups. You get a wide shot. You are in focus. That is enough.'),
       ch('Order hat merch', '−$150 · Fans ↑', { fund: -150, fans: 40 }, 'Little felt hats for the merch table. They sell out. Kids wear them to the next show and air-drum at Duke.')]),
    sw('duke', 4, 'scene', 'travis', 'The Hat Flies Off', 'sw',
      'At a huge outdoor show the wind takes the hat off Duke mid-song. It sails over the crowd. Thousands of hands keep it in the ' +
      'air. Duke keeps the beat with his head bare and his eyes on the hat.',
      [ch('Keep the song going', 'Buzz ↑↑', { buzz: 12 }, 'You hold the bass line steady until the hat comes back over the crowd, hand to hand, and lands on Duke. He never misses a beat.', 'duke', 'The hat came home. Hand to hand. Like a song. I will think about it for the rest of my life.'),
       ch('Stop for the hat', 'Fans ↑ · Duke ↑', { fans: 60, mood: { duke: 8 } }, 'The band stops. The crowd passes the hat back carefully. Duke puts it on, nods, and counts in the song again.'),
       ch('Write a song about it', 'Chemistry ↑', { chemistry: 6 }, "'The Hat Came Home' is written on the bus that night. Travis Lee writes it. It is about a truck, mostly. And a hat.")]),

    // Travis Lee (you play rhythm): the truck songs, sings from the kit, cries.
    sw('travis', 'first_week', 'scene', 'earl', 'Drums Like a Truck', 'g',
      "Travis Lee has never played drums. He has a week. He says playing drums is like driving a truck, which he has also never " +
      'done. He sings every song from the kit. He cries once a song, on schedule.',
      [ch('Give him a boom mic', '−$80 · Travis Lee ↑', { fund: -80, mood: { travis: 8 } }, 'The boom mic swings over the kit. He sings to it like it is a person. It might be, to him.', 'travis', "Sang every song from the kit tonight. Cried twice. Once for the truck. Once for the snare."),
       ch('Teach him the shuffle', 'Your chops ↑ · Burnout ↑', { drumSkill: 1, burnout: 3 }, 'You strum the shuffle until he gets it. He gets it on Friday and hugs the snare drum.'),
       ch('Hand him a tissue box', 'Chemistry ↑', { chemistry: 4 }, 'A tissue box clamped to the hi-hat stand. He uses it between verses. Clementine refills it without being asked.')]),
    sw('travis', 1, 'weird', 'clementine', 'Learning Stick', 'gl',
      'Travis Lee has decided that if he can learn drums, he can learn to drive stick. He has borrowed Vern\'s truck. He is ' +
      "practising clutch work with his left foot on the hi-hat pedal. He says it is the same thing.",
      [ch('Drive with him', 'Travis Lee ↑ · Burnout ↑', { mood: { travis: 8 }, burnout: 4 }, 'He stalls nine times on the grid road. The tenth time he gets to third gear and sings the whole way home.', 'travis', 'Third gear!! Hi-hat foot works on a clutch. Earl says nobody has ever said that. Earl is wrong.'),
       ch('Let Earl teach him', 'Earl ↑', { mood: { earl: 6 } }, 'Earl teaches him stick in an afternoon, while telling the story of the 1979 session. Travis Lee learns both.'),
       ch('Stay on the drums', 'Chemistry ↑', { chemistry: 4 }, "You say the truck can wait. He agrees, and writes a song called 'The Truck Can Wait'. It is about waiting for a truck.")]),
    sw('travis', 2, 'drama', 'earl', 'Front of the Stage', 'gls',
      'Travis Lee used to sing at the front with his acoustic. Now he sings from the back, behind the kit, and you play his ' +
      "strum. Tonight he says he misses seeing the crowd's faces. He can only see the back of yours.",
      [ch('Move the kit forward', '−$60 · Travis Lee ↑', { fund: -60, mood: { travis: 8 } }, 'The kit moves to the front of the stage, beside you. He can see every face. He cries at most of them.', 'travis', 'Saw a lady in the front row mouthing the truck song. Couldn\'t see the kick for crying. Played it anyway.'),
       ch('Turn to face him', 'Chemistry ↑', { chemistry: 5 }, 'You play one song turned around, facing him. He sings it to you. The crowd thinks it is a duet. It is.'),
       ch('Give him one song up front', 'Fans ↑', { fans: 20 }, 'One song a night, he comes out with his acoustic and you take his strum. It becomes the most requested song of the set.')]),
    sw('travis', 3, 'fame', 'dj', 'The Singing Drummer Ballad', 'lsw',
      'Country radio wants Travis Lee to sing their anthem at a rodeo, from behind a drum kit, on a flatbed, at the start of the ' +
      'barrel racing. He has already said yes. He has already cried about it.',
      [ch('Play the flatbed', 'Buzz ↑ · Fans ↑', { buzz: 8, fans: 40 }, 'You play from a flatbed at the rodeo. Travis Lee sings beautifully. A horse stops to listen. The horse wins its race.', 'travis', 'A horse stopped to listen. A horse. Then it won. I am never getting over this.'),
       ch('Bring the whole band', 'Chemistry ↑', { chemistry: 5 }, 'The whole band on one flatbed. Clementine plays standing on a hay bale. Earl tells the barrel racers about 1979.'),
       ch('Keep it simple', 'Burnout ↓', { burnout: -5 }, 'Just him, the kit and your strum. Ninety seconds. Done before the dust settles. He cries in the truck afterwards. Happy tears.')]),
    sw('travis', 4, 'scene', 'clementine', 'The Truck Song, From the Kit', 'sw',
      "At the biggest show of the year the crowd asks for the truck song. Travis Lee sings it from behind the kit with his eyes " +
      'closed and his sticks barely moving. Thousands of people sing every word with him.',
      [ch('Strum it quieter', 'Chemistry ↑ · Travis Lee ↑', { chemistry: 6, mood: { travis: 8 } }, 'You bring the strum down to a whisper. He sings softer. The crowd carries the chorus by themselves.', 'travis', 'They sang it for me. All of them. I just held the beat and cried. That is the job now.'),
       ch('Let the crowd sing', 'Fans ↑', { fans: 60 }, 'The band stops. The crowd sings the last chorus alone. Travis Lee keeps a soft beat on the rim. Nobody breathes.'),
       ch('Bring it home big', 'Buzz ↑↑', { buzz: 12 }, 'You hit the last chorus with everything. He drums like a truck in a pull competition. Earl whoops. Clementine yeehaws, despite herself.')]),

    // Earl (you play lead): session legend, 1979 stories. He drummed on a session once, in 1974. Allegedly.
    sw('earl', 'first_week', 'scene', 'travis', 'Earl on the Kit', 'g',
      'Earl says he has played drums before: one session, 1974, when the drummer got stuck at a border crossing. He has a week to ' +
      'remember how. He remembers on Wednesday. He tells the story of the session on Thursday, Friday and Saturday.',
      [ch('Hear the whole story', 'Earl ↑ · Burnout ↑', { mood: { earl: 8 }, burnout: 4 }, 'Three hours. The drummer never got across the border. Earl played the session on a cardboard box. It went gold in Belgium.', 'earl', 'Played drums once in 1974. Cardboard box, two spoons. Kept the spoons. Brought them tonight.'),
       ch('Give him your old solos', 'Your chops ↑', { drumSkill: 1 }, 'You play the solos he used to play. He plays the drums under them and nods at every lick. Approval, from Earl.'),
       ch('Hand him real sticks', '−$20 · Chemistry ↑', { fund: -20, chemistry: 4 }, "He holds the new sticks like a rare guitar. 'Hickory,' he says. 'Like in 1974.' Then he tells you about 1974 again.")]),
    sw('earl', 1, 'drama', 'clementine', 'Every Lick, Commented', 'gl',
      "Earl plays drums behind you now, which means he can see your hands. He comments on every lick you play, live, over the " +
      'monitor. Tonight he said "that is the 1979 bend" four times. It was not the 1979 bend.',
      [ch('Play the 1979 bend for real', 'Earl ↑ · Your chops ↑', { mood: { earl: 6 }, drumSkill: 1 }, 'You learn the real 1979 bend. Earl stops playing for a moment to listen. Then nods and hits the crash for you.', 'earl', 'That was the 1979 bend. The real one. I have waited forty-five years to hear it from the back.'),
       ch('Turn his monitor down', 'Chemistry ↓ · Burnout ↓', { chemistry: -3, burnout: -5 }, 'Quiet. Blissful. Then you look back and he is still talking, just silently, with his hands. You can read it.'),
       ch('Comment back on his drums', 'Chemistry ↑', { chemistry: 5 }, 'You comment on his fills. He comments on your bends. It becomes a show inside the show. The crowd loves the bickering.')]),
    sw('earl', 2, 'money', 'travis', 'The Old Session Kit', 'gls',
      "A collector in Lethbridge is selling the drum kit from Earl's 1979 session. Earl wants it. It is $250. Earl says it still " +
      'has the original coffee ring on the floor tom. He has not seen it in forty-five years.',
      [ch('Buy it for him', '−$250 · Earl ↑↑', { fund: -250, mood: { earl: 15 } }, 'The kit comes to the Quonset. Earl runs his hand over the coffee ring. He plays it that night, every song, slowly, smiling.', 'earl', 'The coffee ring is still there. 1979. I know whose coffee. I am not telling. Some things stay in the studio.'),
       ch('Go see it together', 'Chemistry ↑ · Earl ↑', { chemistry: 4, mood: { earl: 6 } }, 'A drive to Lethbridge. Earl plays it in the collector\'s basement for an hour and leaves it there. "It has a home," he says.'),
       ch('Say not this year', 'Earl ↓', { mood: { earl: -5 } }, 'Earl says it is fine. He tells the coffee-ring story anyway, twice, on the way home. It is not fine. It is a little fine.')]),
    sw('earl', 3, 'fame', 'dj', 'The Legend Plays Drums', 'lsw',
      'A guitar magazine wants to interview Earl about his decades of guitar sessions. Earl insists the interview be about drums ' +
      "now. The magazine is confused. Earl is not. 'A good player plays what the band needs,' he says.",
      [ch('Let him talk drums', 'Buzz ↑ · Earl ↑', { buzz: 6, mood: { earl: 6 } }, 'The interview is twelve pages about drums. One line mentions guitar: "the kid on lead is the real thing". The kid is you.', 'earl', 'Told the magazine about you. Told them you are the real thing. Also told them about 1979. Mostly 1979.'),
       ch('Do it together', 'Chemistry ↑ · Fans ↑', { chemistry: 4, fans: 30 }, 'A joint interview: you on lead, him on drums. He answers your questions for you. Everyone loves it except your publicist.'),
       ch('Send them the 1974 tape', 'Fans ↑', { fans: 40 }, 'The cardboard-box session from 1974, on tape. The magazine prints a photo of the box. Collectors start looking for it.')]),
    sw('earl', 4, 'scene', 'travis', 'The Last Story', 'sw',
      'At the biggest show of the year, Earl stops the band between songs to tell the crowd a story. It is not about 1979. It is about ' +
      "the kid on lead guitar. Thousands of people listen to the whole thing. Nobody leaves.",
      [ch('Play under the story', 'Chemistry ↑ · Earl ↑', { chemistry: 6, mood: { earl: 8 } }, 'You play quiet licks under every sentence. He keeps a soft beat. It turns into a song by the end. It was always a song.', 'earl', "Told them about you tonight. First new story since 1979. It's a good one. It isn't finished."),
       ch('Answer with a solo', 'Buzz ↑↑', { buzz: 12 }, 'When he finishes you play the biggest solo of your life. He drums under it like 1974, cardboard box and all.'),
       ch('Tell one about him', 'Fans ↑', { fans: 60 }, "You take the mic and tell the crowd one story about Earl. It is short. It makes him cry. He says it's the best session he ever played.")])
  ];
  cards.forEach(function (c) { K.cards.push(c); });

  /* ==== Song reactions: the swapped drummer from the kit (.kit) and your part (.bySeat) ===================== */
  var SR = K.lines.songReactions = K.lines.songReactions || {};
  function sr(id) { SR[id] = SR[id] || {}; return SR[id]; }
  var KIT = {
    kenji: ['(Kenji plays the new song once, perfectly, with no expression. Then nods at you.)',
      '(Kenji adjusts one cymbal by a centimetre. That is his whole review.)', '(Kenji counts in the new song with one finger.)'],
    jaxon: ['ok i put a fill in bar 4. and bar 8. and bar 12. you said fills were allowed now', 'i did the drums for this one. there are fills. it is the drummer law',
      'baba heard it through the floor and banged on 2 and 4. she approves'],
    dana: ['Kick pattern for this one: 16ths, double, 210 bpm. I have also written a drum solo. It is optional. It is not optional.',
      'Good song. Where does my drum solo go? I am asking as the drummer now. The drummer asks too.', 'I tuned the toms to your riff. The floor tom is in your key. You are welcome.'],
    moth: ['played it in the van first. the van likes it', 'two beats under it. the fast one. it fits', 'good song. permission granted to play it'],
    rox: ['The drums second this song. Motion carried. I have also screamed the chorus. It was in the minutes.',
      'I will count this one in. Loudly. With a gavel if I have to.', 'This song is about potholes, whether you meant it or not. I drum accordingly.'],
    benny: ['two beats. it needs the fast one. good. it does not need a third', 'i played it with the other fast one. it is a masterpiece. two beats only',
      'it has a third chord in it. i will drum around the third chord. respectfully'],
    tamara: ['I have scheduled the drum part. Kick on one and three, snare on two and four. It is healthy.', 'Good song. It runs 3:42. I can drum it on time and be home by eleven.',
      'Tempo noted in the spreadsheet. I colour-coded the fills.'],
    chase: ['This song is very 1985. I will play it on the gold kit and sing it standing up.', 'I hear a drum break in bar 16. A big one. A rotating-riser one.',
      'Boom. Tsss. Boom. I sang the beat to make sure it works. It works.'],
    lenny: ['I played a beat under it. It sounds like a famous beat. That means it is good.', 'Great song. I already got a call about the drum part. Good sign.',
      'The fill at the end is legally distinct. I checked with my lawyers. They said "mostly".'],
    duke: ['Slow and steady under this one. The hat agrees.', 'Got a beat for it. Three hits. They fit. The hat nodded.', 'Good song. Drums fit like a hat.'],
    travis: ["Sang it from the kit. Cried at the bridge. That's how I know it's done.", 'This one needs a train beat and a heartbreak. I can do both at once now.',
      "It's about a truck. I know you didn't write it about a truck. It's about a truck now."],
    earl: ['Drummed one like this in 1974 on a cardboard box. This is better. Slightly.', 'Good song. I hear a 1979 lick in it. Play the lick. I will drum under it.',
      'Kept the beat simple. Every great one I backed kept it simple.']
  };
  Object.keys(KIT).forEach(function (id) { sr(id).kit = KIT[id]; });
  // bySeat: a bandmate (not the drummer) on your new part. Keyed member -> seat.
  var BY = {
    marcel: { bass: ['Your bass line is like a lawn at dawn. Dark. Wet. Magnifique.', 'The low notes. They speak to me. Of soil.'],
      rhythm: ['This riff. It marches like an army of garden gnomes. I approve.', 'I will scream over your riff. It can take it. It is very strong.'],
      lead: ['Your solo is very long. Like a French title. I respect this.', 'A melody! Finally someone in this band understands the opera.'] },
    dana: { bass: ['Your bass line is fine. Flatwounds would help. I have a list.', 'Good low end. I can solo over that. For a while.'],
      rhythm: ['Solid riff. Leaves room for a solo. Correct.', 'Tight. I would add a pinch harmonic. I would add nine.'] },
    jaxon: { bass: ['ur bass line has a little run in bar 7. i see u. i also do that', 'cool part. i would play it with a fill. but on bass. ok fine'],
      lead: ['ur solo is sick. it has fills in it. guitar fills. i taught u that'] },
    kenji: { rhythm: ['(Kenji nods at your riff. Once.)'], lead: ['(Kenji lowers his sunglasses during your solo. Then raises them again.)'] },
    rox: { bass: ['Bass line approved by the committee. The committee is me.', 'That bass line shakes the pipes. Council will hear about this.'],
      lead: ['Your lead line is like a good heckle: short, loud, and right.'] },
    benny: { bass: ['your bass line has two notes. respect', 'good. low. not too many notes. the fast one'],
      rhythm: ['your riff has three chords in it. i have looked away. i will look back when it is two'] },
    moth: { rhythm: ['the van likes your riff', 'good riff. permission granted'], lead: ['solo is long. the van has heard longer. not by much'] },
    chase: { bass: ['That bass line is very 1985. Thick, like a mullet.', 'Your bass part is the leather pants of this song. It holds everything together.'],
      lead: ['That solo! It sounds like a laser in a music video! VERY 1985!'] },
    lenny: { bass: ['Your bass line sounds a little like a famous one. I am so proud of you.'],
      rhythm: ['That riff sounds a lot like a famous riff. Welcome to the family. The lawyers will call.'] },
    tamara: { rhythm: ['Your riff is steady. Like a good brushing routine. Two minutes, every day.'], lead: ['Your solo runs forty seconds over. I timed it. I liked it. Still noting it.'] },
    travis: { bass: ["That bass line walks like a man going home to a farm. I've never had a farm. I cried."],
      lead: ["Your lick made me think of a truck I'll never own. Play it again."] },
    earl: { bass: ['Good walking line. I played behind a walking line like that in 1979.'], rhythm: ['That strum sits right. Like a session player. The good ones.'] },
    duke: { rhythm: ['Your strum is steady. The hat approves.'], lead: ['Your lick made the hat tip by itself. That has happened twice.'] },
    clementine: { bass: ['Your bass line is adequate. I am playing a counter-melody over it. You are welcome.'],
      rhythm: ['The strum is acceptable. I find myself tapping my foot. Do not mention it.'],
      lead: ['Your lead and my fiddle should trade bars. For the music. Not because it is fun.'] }
  };
  Object.keys(BY).forEach(function (id) { var o = sr(id); o.bySeat = o.bySeat || {}; Object.keys(BY[id]).forEach(function (s) { o.bySeat[s] = BY[id][s]; }); });

  /* ==== The shop: the drum piece the swapped drummer gets with your gear (2a buyGear; one line posts) ========= */
  // shop.byBand[<band>].lines.drummerGear layers onto the (empty) flat shop.lines.drummerGear (career.pool, 2a lineList)
  var SH = K.shop.lines = K.shop.lines || {};
  SH.drummerGear = SH.drummerGear || [];
  var SB = K.shop.byBand = K.shop.byBand || {};
  var GEAR = {
    hail_damage: [['kenji', '(Kenji unpacks the new drum piece that came with your gear. He sets it up in silence. It is perfect.)'],
      ['jaxon', 'the shop threw in a drum thing with your {gear} stuff. i have already done a fill on it'],
      ['dana', 'Your {gear} upgrade came with a drum piece. I have measured it. Acceptable. Mounted at 34 degrees.']],
    frost_heave: [['moth', 'the new drum bit lives in the van now. it has permission'],
      ['rox', 'Your {gear} came with a new drum piece. I have entered it into the minutes. Motion to hit it: carried.'],
      ['benny', 'new drum piece. it can do two things. that is enough things']],
    gravel_kings: [['tamara', 'Your {gear} upgrade included a drum piece. I have added it to the inventory, row 41. Colour: blue.'],
      ['chase', 'A new drum piece! It shines like 1985! I will play it standing up!'],
      ['lenny', 'The new drum piece already sounds famous. The lawyers will be thrilled.']],
    grid_road_ramblers: [['duke', 'The new drum piece clears the hat by a good inch. Thank you kindly.'],
      ['travis', "Your {gear} came with a new drum piece. I cried a little. It's beautiful. Like a truck."],
      ['earl', "New drum piece. Haven't seen one this nice since 1979. Different session. Different story."]]
  };
  Object.keys(GEAR).forEach(function (b) {
    var bb = SB[b] = SB[b] || {};
    (bb.lines = bb.lines || {}).drummerGear = GEAR[b].map(function (x) { return { who: x[0], text: x[1], swapped: x[0] }; });
  });

  /* ==== Epilogue variants: the swapped drummer stays on the kit (after the story-flag entries) =============== */
  var EP = {
    kenji: 'Kenji never plays bass again. Every Christmas a new drum kit arrives at your door. No note, no return address. Just the kit, assembled, perfectly tuned.',
    jaxon: 'Jaxon keeps drumming. Baba still bangs on the ceiling on two and four, and he still plays a fill every time she does.',
    dana: 'Dana writes the definitive drum spec book: 900 pages, two volumes. Volume two is just the drum solo. It is still going.',
    moth: 'Moth keeps a drum kit in the van forever. Nobody may play it without permission. Nobody ever gets permission. The van does.',
    rox: 'Rox brings a snare drum to every council meeting. Points of order are made with a rimshot. The clerk has learned to read them.',
    benny: 'Benny teaches drums at a community centre. Two beats only. His students are the most disciplined punks in Saskatchewan.',
    tamara: 'Tamara keeps time for the rest of her life: at the clinic, at home, at every family dinner. Nobody in her family is ever late again.',
    chase: 'Chase plays a gold drum kit on a rotating riser in a 1985 tribute show. It is still 1985 behind that kit. It always will be.',
    lenny: 'Lenny becomes the most sued drummer in Alberta. Every fill sounds famous. He has framed all the letters. He needs a bigger wall.',
    duke: "Duke keeps the drum stool he played on. The hat sits on it at home, in the place of honour. It still gets fan mail.",
    travis: "Travis Lee sings from behind a drum kit for the rest of his life. He finally learns to drive stick. He drums on the steering wheel and cries at every exit.",
    earl: 'Earl plays drums on one last session, in a studio in Lethbridge. He tells the whole room about you. Song by song. During their song.'
  };
  var EPS = K.endings.epilogues = K.endings.epilogues || {};
  Object.keys(EP).forEach(function (id) {
    var list = EPS[id] = EPS[id] || [], at = 0;
    while (at < list.length && list[at] && list[at].when && (list[at].when.flag != null || list[at].when.special)) at++;
    list.splice(at, 0, { when: { seatRole: ['drums', 'drums/vocals'], inLineup: true }, text: EP[id] });
  });

  /* ==== Recruits for the drum-seat hole (a string-seat career) and the drum fill-ins ======================= */
  K.recruits.drummers = {
    nicks: { metal: ['Thunder', 'Double-Kick', 'Blast', 'Hammer'], punk: ['Sticks', 'Crash', 'Rimshot', 'Sloppy'],
      rock: ['Boom', 'Snare', 'Tom-Tom', 'Big Kit'], country: ['Shuffle', 'Brushes', 'Train', 'Two-Step'] }
  };
  K.drama.fillIns = K.drama.fillIns || {};
  K.drama.fillIns.drums = ['Gus, who drums at the Legion on Fridays', 'A kid from the school band with a snare', 'Darlene, a wedding drummer', 'Ernie from the polka band'];
})(window.GG);
