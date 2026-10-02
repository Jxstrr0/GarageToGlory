// content/tutorial.js (v1.0 "Glory", Lane T; plan_contract_1.0 §4.7, handoff A15 + E12): the in-character lessons.
//   GG.content.tutorial = [ LESSON ]   (shape in 02_contracts.js V1.0 GLORY; the sim is 2h_sim_lessons.js, the UI 5p_ui_tutorial.js)
//   LESSON = { id, title, band?, seat?, when: { week?, minWeek?, maxWeek?, screen?, mode?, tab?, event? }, steps: [STEP],
//              byBand: { <bandId>: { steps } }, garage?: true (points at the room: shown only with no screen up),
//              mark?: true (auto-run marks it done with no bubbles; a replay shows the steps) }
//   STEP = { who: '@front'|'@deadpan'|'@grumbler'|'@driver'|'@soloist'|'@filler'|'@bassist'|'@any'|memberId, text, seat?,
//            point?: { hotspot } | { testid: id | [ids, first found] } | { member: alias|id }, advance?: 'next' | { event, id? } | { hotspot } }
// Triggers (when): screen / tab / event are alternatives (any one fires it); week / minWeek / maxWeek / mode must all hold.
// Rules (tests/content_tutorial.test.js): every band's speakers are talkers in its own lineup (never a silent member:
// Kenji is narration only, so Hail Damage's driver lines come from Jaxon); text goes through {instrument} / {drummer}
// (E12: v1.1 "Seats" swaps the player's seat); drum words (kit, drum, sticks, snare, kick, cymbal, hi-hat) only in steps
// gated seat: ['drums']; no USA places, parody names, nobody from another band.
(function (GG) {
  var D = ['drums'];   // the drum-mechanics gate (E12)
  GG.content.tutorial = [
    /* ---- Week one (A15: taught by playing, by bandmates in character) ------------------------------------------ */
    { id: 'w1_card', title: 'The Monday card', when: { week: 1, screen: 'card' },
      steps: [
        { who: '@front', text: 'Every Monday, something happens. Usually to us. Read it, then pick an answer.', point: { testid: 'choice-0' } },
        { who: '@deadpan', text: 'The little chips under each answer are what it costs and what it pays. Nothing is free. Not even the bad ideas.' }
      ],
      byBand: {
        hail_damage: { steps: [
          { who: 'marcel', text: 'Every Monday, fate knocks on the garage door. Also, from now on you call me Lord Abyssus. Pick an answer.', point: { testid: 'choice-0' } },
          { who: 'dana', text: 'The chips under each answer are the specs: what it costs, what it pays. Read the specs. Always read the specs.' }
        ] },
        frost_heave: { steps: [
          { who: 'rox', text: 'Monday means a new agenda item. Something happens, we vote. You vote. Pick an answer.', point: { testid: 'choice-0' } },
          { who: 'moth', text: 'Chips under each answer say what it costs and what it pays. I read them so you don\'t have to. But read them.' }
        ] },
        gravel_kings: { steps: [
          { who: 'chase', text: 'Monday, baby! Something big happens every week. It\'s like a music video, but slower. Pick an answer.', point: { testid: 'choice-0' } },
          { who: 'tamara', text: 'The chips under each answer are the receipts. Money, fans, moods. I keep the receipts. You read them first.' }
        ] },
        grid_road_ramblers: { steps: [
          { who: 'travis', text: 'Every Monday the Quonset gets a story. Sometimes it\'s a sad one. Pick how we answer it.', point: { testid: 'choice-0' } },
          { who: 'clementine', text: 'The chips under each answer are what it costs and what it pays. Think of it as sheet music for consequences.' }
        ] }
      } },
    { id: 'w1_walk', title: 'Walking around', garage: true, when: { week: 1, event: 'afterCard' },
      steps: [
        { who: '@front', text: 'This is {space}. Tap the floor to walk around. Tap stuff to use it.' },
        { who: '@front', text: 'The whiteboard plans the week: three blocks, Monday to Friday.', point: { hotspot: 'plan' } },
        { who: '@soloist', text: 'Your {instrument} lives over there. Practise on it any time.', point: { hotspot: 'kit' } },
        { who: '@filler', text: 'The gig board. That\'s where gigs come from, once anybody will have us.', point: { hotspot: 'gigboard' } },
        { who: '@front', text: 'When you\'re ready, tap the big button and plan the week.', point: { testid: 'btn-primary' }, advance: { event: 'screen:open', id: 'plan' } }
      ],
      byBand: {
        hail_damage: { steps: [
          { who: 'jaxon', text: 'ok so this is the garage. tap the floor to walk. tap stuff to use it. dont touch the lawn mower, its marcel\'s' },
          { who: 'marcel', text: 'The whiteboard. Here we plan the week of darkness: three blocks, no more. Even darkness has a schedule.', point: { hotspot: 'plan' } },
          { who: 'dana', text: 'Your {instrument}. Practise there any time. I would practise ten hours a day, but I\'m busy practising.', point: { hotspot: 'kit' } },
          { who: 'dana', text: 'Tap the {instrument} to sketch a beat. Kick, snare, hats, crash: the full spec sheet.', seat: D, point: { hotspot: 'kit' } },
          { who: 'jaxon', text: 'gig board. gigs come from there. baba says no gigs past eleven but she means weeknights. i think', point: { hotspot: 'gigboard' } },
          { who: 'marcel', text: 'Now: the big button. We plan. We conquer. We are home before Baba\'s curfew.', point: { testid: 'btn-primary' }, advance: { event: 'screen:open', id: 'plan' } }
        ] },
        frost_heave: { steps: [
          { who: 'rox', text: 'Welcome to the basement. Tap the floor to walk. Tap stuff to use it. Mind the dryer, it\'s load-bearing.' },
          { who: 'rox', text: 'The whiteboard is our agenda. Three blocks a week. No motions from the floor.', point: { hotspot: 'plan' } },
          { who: 'benny', text: 'That\'s your {instrument}. Practise on it whenever. I only practise two chords. Saves time.', point: { hotspot: 'kit' } },
          { who: 'benny', text: 'Tap the {instrument} and sketch a beat. Fast snare, flat hats. If it feels too fast it\'s almost fast enough.', seat: D, point: { hotspot: 'kit' } },
          { who: 'moth', text: 'Gig board. Gigs. I drive to them. Don\'t touch the van.', point: { hotspot: 'gigboard' } },
          { who: 'rox', text: 'Big button. Plan the week. Meeting adjourned.', point: { testid: 'btn-primary' }, advance: { event: 'screen:open', id: 'plan' } }
        ] },
        gravel_kings: { steps: [
          { who: 'chase', text: 'Welcome to Unit 4B, where it\'s always 1985. Tap the floor to walk. Tap stuff to use it.' },
          { who: 'tamara', text: 'The whiteboard plans the week: three blocks. I colour-coded it. Nobody else uses the colours.', point: { hotspot: 'plan' } },
          { who: 'lenny', text: 'Your {instrument}. Practise any time. Write something original. Trust me on the original part.', point: { hotspot: 'kit' } },
          { who: 'lenny', text: 'Tap the {instrument} and sketch a beat. Kick on one and three, snare on two and four. Nobody owns that one. I checked.', seat: D, point: { hotspot: 'kit' } },
          { who: 'chase', text: 'The gig board! Where legends get booked. And also where Legion halls get booked.', point: { hotspot: 'gigboard' } },
          { who: 'tamara', text: 'Big button. Plan the week. I\'ll be flossing.', point: { testid: 'btn-primary' }, advance: { event: 'screen:open', id: 'plan' } }
        ] },
        grid_road_ramblers: { steps: [
          { who: 'duke', text: 'This here\'s my uncle\'s Quonset. Tap the floor to walk around. Tap stuff to use it. Don\'t touch the hat.' },
          { who: 'travis', text: 'The whiteboard plans the week. Three blocks. Like a three-verse song, without the dead dog.', point: { hotspot: 'plan' } },
          { who: 'clementine', text: 'Your {instrument}. Practise any time. I practise Bach at midnight. Nobody needs to know that.', point: { hotspot: 'kit' } },
          { who: 'earl', text: 'Tap the {instrument} and sketch a beat. Train beat on the snare, kick on one and three. I played that for everybody in 1974.', seat: D, point: { hotspot: 'kit' } },
          { who: 'earl', text: 'Gig board. Every gig I ever played came off a board like that. Every single one. Let me tell you about the first.', point: { hotspot: 'gigboard' } },
          { who: 'travis', text: 'Big button, partner. Let\'s plan the week.', point: { testid: 'btn-primary' }, advance: { event: 'screen:open', id: 'plan' } }
        ] }
      } },
    { id: 'w1_plan', title: 'Planning the week', when: { week: 1, screen: 'plan' },
      steps: [
        { who: '@front', text: 'Three blocks a week. Tap an activity to drop it in the next empty block. Tap a block to clear it.', point: { testid: 'plan-slot-0' } },
        { who: '@soloist', text: 'Rehearse makes us tighter. Write makes a new song. This week, do both.', point: { testid: 'act-rehearse' } },
        { who: '@deadpan', text: 'Rest keeps everyone from snapping. Hustle pays. Then hit Go.', point: { testid: 'btn-go' } }
      ],
      byBand: {
        hail_damage: { steps: [
          { who: 'marcel', text: 'Three blocks. Tap an activity, it fills the next block. Tap a block to banish it.', point: { testid: 'plan-slot-0' } },
          { who: 'dana', text: 'Rehearse makes us tighter. Write makes a song. A song needs a solo. Several solos. Do both this week.', point: { testid: 'act-rehearse' } },
          { who: 'jaxon', text: 'rest stops people getting cranky. hustle = cash. baba says hustle. then hit go', point: { testid: 'btn-go' } }
        ] },
        frost_heave: { steps: [
          { who: 'rox', text: 'Three blocks. Tap an activity, it takes the next block. Tap a block to strike it from the record.', point: { testid: 'plan-slot-0' } },
          { who: 'benny', text: 'Rehearse makes us tight. Write makes a song. Two things. Like two chords. Do both.', point: { testid: 'act-rehearse' } },
          { who: 'moth', text: 'Rest is good. Hustle is money. Go is go.', point: { testid: 'btn-go' } }
        ] },
        gravel_kings: { steps: [
          { who: 'chase', text: 'Three blocks a week, baby. Tap an activity and it slides in. Tap a block to clear it.', point: { testid: 'plan-slot-0' } },
          { who: 'lenny', text: 'Rehearse makes us tighter. Write makes a song we actually own. Do both this week.', point: { testid: 'act-rehearse' } },
          { who: 'tamara', text: 'Rest keeps everyone civil. Hustle pays the bills. I\'ve seen the bills. Then hit Go.', point: { testid: 'btn-go' } }
        ] },
        grid_road_ramblers: { steps: [
          { who: 'travis', text: 'Three blocks a week. Tap an activity, it takes the next one. Tap a block to clear it.', point: { testid: 'plan-slot-0' } },
          { who: 'earl', text: 'Rehearse makes a band. Write makes a song. In 1971 we did both before breakfast. Do both.', point: { testid: 'act-rehearse' } },
          { who: 'clementine', text: 'Rest keeps us civil. Hustle pays for strings. Then hit Go.', point: { testid: 'btn-go' } }
        ] }
      } },
    { id: 'w1_write', title: 'Writing a song', when: { week: 1, screen: 'seq', mode: 'write' },
      steps: [
        { who: '@soloist', text: 'A Write block makes a song. Go one step at a time: pick a part, play it, tweak it, next.' },
        { who: '@soloist', text: 'Every square is a hit. Kick at the bottom of the beat, snare on the backbeat, hats to keep time. Play to hear it.', seat: D, point: { testid: 'seq-grid' } },
        { who: '@front', text: 'Stuck? Let the band jam one. You get a song either way.', point: { testid: 'btn-seq-jam' } }
      ],
      byBand: {
        hail_damage: { steps: [
          { who: 'dana', text: 'Write block. One part at a time: pick a groove, play it, tweak it, next. Like a solo, but shorter. Much shorter.' },
          { who: 'dana', text: 'Each square is a hit. Metal wants a busy kick, snare on two and four, a crash on the one. Play it before you judge it.', seat: D, point: { testid: 'seq-grid' } },
          { who: 'marcel', text: 'When it is done, I will name it. In French. It will be about darkness. (It will be about my lawn.)' },
          { who: 'jaxon', text: 'or just let the band jam one. we jam. it\'s fine. i add fills', point: { testid: 'btn-seq-jam' } }
        ] },
        frost_heave: { steps: [
          { who: 'rox', text: 'Write block. One part at a time: pick a groove, play it, tweak it, next. Faster than council.' },
          { who: 'moth', text: 'Each square is a hit. Kick on the beat, snare on the "and", hats flat out. Try the D-beat. Sounds like the dryers.', seat: D, point: { testid: 'seq-grid' } },
          { who: 'benny', text: 'Or let the band jam one. I\'ll play my two chords. They go with everything.', point: { testid: 'btn-seq-jam' } }
        ] },
        gravel_kings: { steps: [
          { who: 'chase', text: 'Write block! One part at a time: pick a groove, play it, tweak it, next. Then I add the slide.' },
          { who: 'tamara', text: 'Each square is a hit. Kick on one and three, snare on two and four, steady hats. Around 120 is a safe rock tempo.', seat: D, point: { testid: 'seq-grid' } },
          { who: 'lenny', text: 'Or let the band jam one. Don\'t worry, I\'ll make the riff original. Mostly.', point: { testid: 'btn-seq-jam' } }
        ] },
        grid_road_ramblers: { steps: [
          { who: 'travis', text: 'Write block. One part at a time: pick a groove, play it, tweak it, next. I\'ll bring the heartbreak.' },
          { who: 'earl', text: 'Each square is a hit. Train beat: snare chugging, kick on one and three. Play it back. I\'ll wait. I have stories.', seat: D, point: { testid: 'seq-grid' } },
          { who: 'clementine', text: 'Or let the band jam one. I will play something tasteful. Then something less tasteful. Crowds like that.', point: { testid: 'btn-seq-jam' } }
        ] }
      } },
    { id: 'w1_rehearse', title: 'The week\'s results', when: { week: 1, screen: 'results' },
      steps: [
        { who: '@front', text: 'That\'s the week: each block and what it did. Rehearse makes us tighter, and tight bands play better gigs.' },
        { who: '@deadpan', text: 'This week there\'s a gig on top. Tap through. The van is warming up.' }
      ],
      byBand: {
        hail_damage: { steps: [
          { who: 'dana', text: 'Results. Each block and what it did. Rehearse makes us tighter. Tighter means the solos land. All of them.' },
          { who: 'jaxon', text: 'and we have a gig! buddy\'s house party. twelve people and a dog. the dog is the important one' }
        ] },
        frost_heave: { steps: [
          { who: 'rox', text: 'The minutes of the week: each block and what it did. Rehearse makes us tighter. Tight is louder.' },
          { who: 'moth', text: 'Gig this week. Craig\'s basement. Low ceiling. Duck.' }
        ] },
        gravel_kings: { steps: [
          { who: 'tamara', text: 'Results: each block and what it did. Rehearse makes us tighter, and tighter gigs pay better. I did the math.' },
          { who: 'chase', text: 'And we have a gig! A basement party. Wood panelling. It\'s basically the Forum, baby.' }
        ] },
        grid_road_ramblers: { steps: [
          { who: 'clementine', text: 'Results: each block and what it did. Rehearse makes us tighter. Tighter is the whole point. Tell Earl.' },
          { who: 'duke', text: 'And we got a gig. Yard party. Bonfire. Bring the hat. I always bring the hat.' }
        ] }
      } },
    { id: 'w1_gig', title: 'Your first gig', when: { week: 1, screen: 'gig-set' },
      steps: [
        { who: '@front', text: 'First gig. Pick the setlist: one or two songs tonight. The slow one first.', point: { testid: 'set-slots' } },
        { who: '@soloist', text: 'Notes fall down the lanes. Tap each lane as its note hits the line. Wide window tonight. Nobody here can tell.', point: { testid: 'btn-gig-start' } },
        { who: '@soloist', text: 'Each lane is a piece of the kit: kick, snare, hats, crash. Your sticks, your night.', seat: D },
        { who: '@front', text: '{drummer} count us in. Tap Start when you\'re ready.', point: { testid: 'btn-gig-start' }, advance: { event: 'screen:open', id: 'gig' } }
      ],
      byBand: {
        hail_damage: { steps: [
          { who: 'marcel', text: 'Our first ritual. Pick the setlist: two songs. The slow one first, so the dog can settle.', point: { testid: 'set-slots' } },
          { who: 'dana', text: 'Notes fall down the lanes. Tap each lane as its note hits the line. The window is wide tonight. Twelve people won\'t notice.', point: { testid: 'btn-gig-start' } },
          { who: 'dana', text: 'Each lane is a piece of the kit: kick, snare, hats, crash. Hit them like you mean it.', seat: D },
          { who: 'jaxon', text: '{drummer} count us in. hit start. i promise no fills. (fills)', point: { testid: 'btn-gig-start' }, advance: { event: 'screen:open', id: 'gig' } }
        ] },
        frost_heave: { steps: [
          { who: 'rox', text: 'First gig. Pick the setlist: two songs. Save the scream for the second one.', point: { testid: 'set-slots' } },
          { who: 'benny', text: 'Notes fall down the lanes. Tap each lane when its note hits the line. Wide window tonight. Nobody in a basement can tell.', point: { testid: 'btn-gig-start' } },
          { who: 'benny', text: 'Each lane is a piece of the kit: kick, snare, hats, crash. Hit them hard. Like a third chord. Which I will never learn.', seat: D },
          { who: 'rox', text: '{drummer} count us in. Motion carried. Hit Start.', point: { testid: 'btn-gig-start' }, advance: { event: 'screen:open', id: 'gig' } }
        ] },
        gravel_kings: { steps: [
          { who: 'chase', text: 'First gig, baby! Pick the setlist: two songs. Open slow, build big. That\'s showbiz.', point: { testid: 'set-slots' } },
          { who: 'lenny', text: 'Notes fall down the lanes. Tap each lane as its note hits the line. Wide window tonight. It\'s a basement.', point: { testid: 'btn-gig-start' } },
          { who: 'tamara', text: 'Each lane is a piece of the kit: kick, snare, hats, crash. Steady. Like flossing.', seat: D },
          { who: 'chase', text: '{drummer} count us in. Hit Start. Leather pants on.', point: { testid: 'btn-gig-start' }, advance: { event: 'screen:open', id: 'gig' } }
        ] },
        grid_road_ramblers: { steps: [
          { who: 'travis', text: 'First gig. Pick the setlist: two songs. Open with the sad one. Then the sadder one.', point: { testid: 'set-slots' } },
          { who: 'earl', text: 'Notes fall down the lanes. Tap each lane when its note hits the line. Wide window tonight. It\'s a tailgate.', point: { testid: 'btn-gig-start' } },
          { who: 'earl', text: 'Each lane is a piece of the kit: kick, snare, hats, crash. Keep it simple. Every great one I backed kept it simple.', seat: D },
          { who: 'duke', text: '{drummer} count us in. Hit Start. The hat is ready.', point: { testid: 'btn-gig-start' }, advance: { event: 'screen:open', id: 'gig' } }
        ] }
      } },
    { id: 'w1_wrap', title: 'The week wrap', when: { week: 1, screen: 'wrap' },
      steps: [
        { who: '@deadpan', text: 'The fund is the one wallet we share. Gigs and Hustle fill it. Gas, strings and pizza drain it.', point: { testid: ['wrap-d-fund', 'hud-fund'] } },
        { who: '@front', text: 'Fans are people who would admit to liking us. They don\'t leave. Your mom counts.', point: { testid: ['wrap-d-fans', 'hud-fans'] } },
        { who: '@front', text: 'Buzz is how hard people are talking about us right now. It fades every week. Promote and play to pump it.', point: { testid: ['wrap-d-buzz', 'hud-buzz'] } },
        { who: '@soloist', text: 'Chem is how well we gel. Rehearse and good gigs help. Drama hurts.', point: { testid: ['wrap-d-chemistry', 'hud-chem'] } },
        { who: '@deadpan', text: 'Moods are down here. A grumpy bandmate is a problem. Two is a band meeting.', point: { testid: 'wrap-moods' } }
      ],
      byBand: {
        hail_damage: { steps: [
          { who: 'jaxon', text: 'fund = the one wallet. gigs and hustle fill it. gas strings and pizza drain it. baba keeps a spreadsheet', point: { testid: ['wrap-d-fund', 'hud-fund'] } },
          { who: 'marcel', text: 'Fans. Souls who would admit to liking us. They never leave. Your mother counts. Mine counts twice.', point: { testid: ['wrap-d-fans', 'hud-fans'] } },
          { who: 'marcel', text: 'Buzz: how loudly the city whispers our name. It fades each week. Promote, play, and it returns.', point: { testid: ['wrap-d-buzz', 'hud-buzz'] } },
          { who: 'dana', text: 'Chem is how well we gel. Rehearse and good gigs raise it. Drama lowers it. Short solos also lower it, apparently.', point: { testid: ['wrap-d-chemistry', 'hud-chem'] } },
          { who: 'dana', text: 'Moods are down there. Kenji\'s is a nod or no nod. That\'s the whole meter.', point: { testid: 'wrap-moods' } }
        ] },
        frost_heave: { steps: [
          { who: 'moth', text: 'The fund. One wallet. Gigs fill it, gas drains it. Mostly gas.', point: { testid: ['wrap-d-fund', 'hud-fund'] } },
          { who: 'rox', text: 'Fans are constituents. People who would admit to liking us. They never leave. Your mom counts.', point: { testid: ['wrap-d-fans', 'hud-fans'] } },
          { who: 'rox', text: 'Buzz is how loud Regina is about us this week. It fades. Promote and play to pump it.', point: { testid: ['wrap-d-buzz', 'hud-buzz'] } },
          { who: 'benny', text: 'Chem is how well we gel. Rehearse and good gigs help. Asking me to learn a third chord hurts.', point: { testid: ['wrap-d-chemistry', 'hud-chem'] } },
          { who: 'moth', text: 'Moods. Down there. Keep them up. A grumpy band is a long drive.', point: { testid: 'wrap-moods' } }
        ] },
        gravel_kings: { steps: [
          { who: 'tamara', text: 'The fund is our one wallet. Gigs and Hustle fill it. Rent, gas and strings drain it. I have a spreadsheet.', point: { testid: ['wrap-d-fund', 'hud-fund'] } },
          { who: 'chase', text: 'Fans, baby! People who would admit to liking us. They never leave. Your mom counts.', point: { testid: ['wrap-d-fans', 'hud-fans'] } },
          { who: 'chase', text: 'Buzz is how hard Edmonton is talking about us. It fades every week. Promote and play to pump it.', point: { testid: ['wrap-d-buzz', 'hud-buzz'] } },
          { who: 'lenny', text: 'Chem is how well we gel. Rehearse and good gigs help. Lawsuits hurt. Ask me how I know.', point: { testid: ['wrap-d-chemistry', 'hud-chem'] } },
          { who: 'tamara', text: 'Moods are down there. Keep them up, or I start scheduling band meetings. Nobody wants that.', point: { testid: 'wrap-moods' } }
        ] },
        grid_road_ramblers: { steps: [
          { who: 'clementine', text: 'The fund is the one wallet we share. Gigs and Hustle fill it. Gas, strings and rosin drain it.', point: { testid: ['wrap-d-fund', 'hud-fund'] } },
          { who: 'travis', text: 'Fans are folks who would admit to liking us. They don\'t leave. Your mom counts. Mine cried.', point: { testid: ['wrap-d-fans', 'hud-fans'] } },
          { who: 'duke', text: 'Buzz is how much folks are talking about us this week. It fades. Mostly they talk about the hat.', point: { testid: ['wrap-d-buzz', 'hud-buzz'] } },
          { who: 'earl', text: 'Chem is how well we gel. Rehearse and good gigs help. Drama hurts. I\'ve seen bands with less drama split up.', point: { testid: ['wrap-d-chemistry', 'hud-chem'] } },
          { who: 'clementine', text: 'Moods are down there. Keep them up. A happy band is a tight band.', point: { testid: 'wrap-moods' } }
        ] }
      } },

    /* ---- Weeks 2-4 (light: one short lesson the first time each thing comes up) ----------------------------- */
    { id: 'w2_board', title: 'The gig board', when: { maxWeek: 24, screen: 'board' },
      steps: [
        { who: '@front', text: 'The gig board: every room that will have us. Bigger rooms want more fans.', point: { testid: 'board-listing' } },
        { who: '@deadpan', text: 'Read the deal before you book. Exposure pays in fans. Door deals pay if people show up.' }
      ],
      byBand: {
        hail_damage: { steps: [
          { who: 'marcel', text: 'The gig board. Every stage in the kingdom that will tolerate us. Bigger rooms want more fans.', point: { testid: 'board-listing' } },
          { who: 'jaxon', text: 'read the deal first. exposure = fans no money. door = money if people come. baba says door' }
        ] },
        frost_heave: { steps: [
          { who: 'rox', text: 'The gig board: every room in town that hasn\'t banned us yet. Bigger rooms want more fans.', point: { testid: 'board-listing' } },
          { who: 'moth', text: 'Read the deal. Exposure pays in fans. Door pays if people come. Gas costs either way.' }
        ] },
        gravel_kings: { steps: [
          { who: 'chase', text: 'The gig board! Every stage in Edmonton that will have us. Bigger rooms want more fans.', point: { testid: 'board-listing' } },
          { who: 'tamara', text: 'Read the deal before you book. Exposure pays in fans. Door deals pay if people show up. I\'ll check the math.' }
        ] },
        grid_road_ramblers: { steps: [
          { who: 'travis', text: 'The gig board: every hall and bar that will have us. Bigger rooms want more fans.', point: { testid: 'board-listing' } },
          { who: 'earl', text: 'Read the deal first. Exposure pays in fans. Door pays if folks come. I once got paid in a goat.' }
        ] }
      } },
    { id: 'w2_money', title: 'Money and merch', when: { maxWeek: 24, tab: 'money', screen: 'merch' },
      steps: [
        { who: '@deadpan', text: 'Money: the fund, the upkeep, and what the band gets paid. Pay the band more and moods go up. The fund goes down.' },
        { who: '@front', text: 'Merch sells at gigs. Shirts with our name spelled right sell better.' }
      ],
      byBand: {
        hail_damage: { steps: [
          { who: 'dana', text: 'Money: the fund, the upkeep, what we get paid. Pay the band more, moods go up. The fund goes down. Strings are not free.' },
          { who: 'jaxon', text: 'merch sells at gigs. baba knitted toques. we\'re not selling those. she says we are' }
        ] },
        frost_heave: { steps: [
          { who: 'moth', text: 'Money. The fund, the upkeep, what we get paid. Pay the band more, moods go up, fund goes down. Gas goes up anyway.' },
          { who: 'rox', text: 'Merch sells at gigs. Shirts fund the movement. The movement is mostly gas.' }
        ] },
        gravel_kings: { steps: [
          { who: 'tamara', text: 'Money: the fund, the rent, what we get paid. Pay the band more and moods go up. The fund goes down. That\'s just math.' },
          { who: 'chase', text: 'Merch sells at gigs. Headbands, baby. Big ones.' }
        ] },
        grid_road_ramblers: { steps: [
          { who: 'clementine', text: 'Money: the fund, the upkeep, and what the band gets paid. Pay us more, moods go up, the fund goes down.' },
          { who: 'duke', text: 'Merch sells at gigs. Hats. We should sell hats. Smaller than mine. Nobody gets one as big as mine.' }
        ] }
      } },
    { id: 'w3_chat', title: 'Moods and the group chat', when: { minWeek: 2, maxWeek: 24, tab: 'chat', event: 'moodDrop' },
      steps: [
        { who: '@front', text: 'When somebody\'s mood drops, it shows up in the wrap and in the group chat on the laptop.', point: { testid: 'wrap-moods' } },
        { who: '@deadpan', text: 'Read the chat. Grumpy for long enough turns into a band meeting. Rest, a good gig or a raise fixes most of it.' }
      ],
      byBand: {
        hail_damage: { steps: [
          { who: 'jaxon', text: 'when someone\'s mood drops it shows up in the wrap and in the group chat on the laptop. i post a lot. sorry', point: { testid: 'wrap-moods' } },
          { who: 'dana', text: 'Read the chat. Grumpy long enough becomes a band meeting. Rest, a good gig or a raise fixes most of it. A longer solo fixes the rest.' }
        ] },
        frost_heave: { steps: [
          { who: 'rox', text: 'When somebody\'s mood drops, it\'s in the wrap and in the group chat on the laptop. Read the minutes.', point: { testid: 'wrap-moods' } },
          { who: 'benny', text: 'Grumpy long enough becomes a band meeting. Rest or a good gig fixes it. Not a third chord. Never a third chord.' }
        ] },
        gravel_kings: { steps: [
          { who: 'tamara', text: 'When somebody\'s mood drops, it shows in the wrap and in the group chat on the laptop. I mute nobody. I read everything.', point: { testid: 'wrap-moods' } },
          { who: 'lenny', text: 'Grumpy long enough becomes a band meeting. Rest, a good gig or a raise fixes most of it.' }
        ] },
        grid_road_ramblers: { steps: [
          { who: 'travis', text: 'When somebody\'s mood drops, it shows in the wrap and in the group chat on the laptop. I write songs about it.', point: { testid: 'wrap-moods' } },
          { who: 'earl', text: 'Grumpy long enough turns into a band meeting. Rest, a good gig or a raise fixes most of it. Listen to an old man.' }
        ] }
      } },
    { id: 'w4_van', title: 'The van', when: { minWeek: 2, maxWeek: 24, screen: 'van' },
      steps: [
        { who: '@front', text: 'The van. Every out-of-town gig costs gas and kilometres. Long drives wear people out.' },
        { who: '@any', text: 'Things happen on the road. Pick an answer when they do. Then we arrive. Hopefully.' }
      ],
      byBand: {
        hail_damage: { steps: [
          { who: 'jaxon', text: 'the van! kenji drives. kenji always drives. nobody has ever seen kenji get in' },
          { who: 'dana', text: 'Gigs out of town cost gas and kilometres. Long drives wear us out. Road stuff happens. Pick an answer when it does.' }
        ] },
        frost_heave: { steps: [
          { who: 'moth', text: 'This is my van. I live here. You\'re guests. Feet off the bed.' },
          { who: 'rox', text: 'Out-of-town gigs cost gas and kilometres. Long drives wear us out. Road stuff happens. Vote on it.' }
        ] },
        gravel_kings: { steps: [
          { who: 'tamara', text: 'I drive. I always drive. Out-of-town gigs cost gas and kilometres, and long drives wear people out.' },
          { who: 'chase', text: 'Things happen on the road, baby. Pick an answer when they do. Rock and roll.' }
        ] },
        grid_road_ramblers: { steps: [
          { who: 'earl', text: 'I drive. Drove for everybody, back in the day. Out-of-town gigs cost gas and kilometres. Long drives wear you down.' },
          { who: 'travis', text: 'Things happen on the road. Pick an answer when they do. Sometimes it\'s a song.' }
        ] }
      } },

    /* ---- Year one: the "good year" talk (the recap's year-one page; replayable) ------------------------------ */
    { id: 'y1_good_year', title: 'What a good year looks like', mark: true, when: { maxWeek: 26, screen: 'recap' },
      steps: [
        { who: '@front', text: 'A good first year: a couple of hundred new fans, half a dozen songs, about ten gigs.' },
        { who: '@deadpan', text: 'And no loans from your parents. That one\'s the hard one.' }
      ],
      byBand: {
        hail_damage: { steps: [
          { who: 'marcel', text: 'A good year? Hundreds of new souls. The spotlight finds us.' },
          { who: 'dana', text: 'Six new songs makes a year. Each one needs a solo. That\'s six solos.' },
          { who: 'jaxon', text: 'baba says a real band plays ten gigs a year. and doesn\'t borrow from your parents. she was looking at you' }
        ] },
        frost_heave: { steps: [
          { who: 'rox', text: 'A good year: hundreds of new constituents, half a dozen songs, ten gigs.' },
          { who: 'moth', text: 'And no loans from your parents. They already think I live in a van. I do. But still.' }
        ] },
        gravel_kings: { steps: [
          { who: 'chase', text: 'A good year, baby: hundreds of new fans, half a dozen songs, ten gigs.' },
          { who: 'tamara', text: 'And no loans from your parents. I\'m tracking that column. Everyone\'s tracking that column.' }
        ] },
        grid_road_ramblers: { steps: [
          { who: 'travis', text: 'A good year: hundreds of new folks, half a dozen sad songs, ten gigs.' },
          { who: 'clementine', text: 'And no loans from your parents. That is the hard part. Bach never borrowed. Probably.' }
        ] }
      } }
  ];
})(window.GG);
