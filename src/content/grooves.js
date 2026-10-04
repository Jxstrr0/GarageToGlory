// content/grooves.js (v0.6.2): the songwriter's groove presets, one-tap modifiers, tempo labels and coach tips.
// Shape: GG.content.grooves = { <genre>: {
//   presets: [{ id, name, desc (one plain line), bar: [laneStr x 4..6] (kick, snare, hat, cymbal, toms?, ride?),
//               signature?: true (scores Groove >= 70 in this genre), pedal?: true (needs the double-kick pedal) }],
//   mods: [{ id, name, desc, sections?: [offered only on these], ops: [OP] }]   (GG.songs.modify applies them to one section, then sanitizes for the gear)
//   tempo: [[bpmFrom, label]] (plain words for the Tempo step) } ,
//   coach: { verse|chorus|bridge|tempo|order|name: [{ role (regex on member role), text }] } }
// OP = { op: 'fill', lane, every, from? }  add a hit every `every` 16ths (from step `from`, default 0)
//      { op: 'hits', lane, steps: [] }       add hits           { op: 'clear', lane, steps?: [] } remove (all if no steps)
//      { op: 'thin', lane: name|'all', keep } keep only steps divisible by `keep`
//      { op: 'mirror' }                        second half of the bar = the first half (catchy, steady)
//      { op: 'bpm', by }                       nudges the whole song's tempo (clamped to the genre range)
//      { op: 'pedal', lane: 'kick' }          kick on every 16th with a double-kick pedal, else every 8th
// Lanes by name: kick snare hat cymbal toms ride. Patterns without the pedal lose back-to-back kicks (GG.songs.sanitize).
(function (GG) {
  var E = '................';
  var CATCHY = { id: 'catchy', name: 'Make it catchier', sections: ['chorus'], desc: 'Crash on the one, and the second half echoes the first.',
    ops: [{ op: 'mirror' }, { op: 'hits', lane: 'cymbal', steps: [0] }] };
  var SIMPLER = { id: 'simpler', name: 'Simpler', desc: 'Only the 8th notes survive, hats on the beat. Easier on the hands.',
    ops: [{ op: 'thin', lane: 'all', keep: 2 }, { op: 'thin', lane: 'hat', keep: 4 }, { op: 'clear', lane: 'toms' }] };
  GG.content.grooves = {
    metal: {
      presets: [
        { id: 'headbanger', name: 'Headbanger', signature: true, desc: 'Kick on every 8th, snare on 2 and 4. The neck-snapper.',
          bar: ['x.x.x.x.x.x.x.x.', '....x.......x...', 'x.x.x.x.x.x.x.x.', 'x...............'] },
        { id: 'blast', name: 'Blast beat', desc: 'Kick, snare and crash on every 8th. The neighbours will call someone.',
          bar: ['x.x.x.x.x.x.x.x.', 'x.x.x.x.x.x.x.x.', E, 'x.x.x.x.x.x.x.x.'] },
        { id: 'thrash', name: 'Thrash skank', desc: 'Kick on the beat, snare on the "and". Polka, but angry.',
          bar: ['x...x...x...x...', '..x...x...x...x.', 'x.x.x.x.x.x.x.x.', 'x...............'] },
        { id: 'doom', name: 'Half-time doom', desc: 'One snare a bar, big crashes. Play it slow, like a Regina February.',
          bar: ['x.....x.x.......', '........x.......', 'x...x...x...x...', 'x.......x.......'] },
        { id: 'gallop', name: 'Gallop', pedal: true, desc: 'Da-ga-da, da-ga-da. Horses, but metal.',
          bar: ['x.xxx.xxx.xxx.xx', '....x.......x...', E, 'x...x...x...x...'] },
        { id: 'dkrun', name: 'Double-kick run', pedal: true, desc: 'Both feet, every 16th. The calves file a complaint.',
          bar: ['xxxxxxxxxxxxxxxx', '....x.......x...', E, 'x.......x.......'] }
      ],
      mods: [
        { id: 'more', name: 'More metal', desc: 'Busier kick, a crash on the one, hats on every 8th.',
          ops: [{ op: 'pedal', lane: 'kick' }, { op: 'hits', lane: 'cymbal', steps: [0] }, { op: 'fill', lane: 'hat', every: 2 }] },
        CATCHY, SIMPLER,
        { id: 'busier', name: 'Busier', desc: 'Hats on every 16th and a tom roll to finish.',
          ops: [{ op: 'fill', lane: 'hat', every: 1 }, { op: 'hits', lane: 'toms', steps: [12, 13, 14, 15] }] }
      ],
      tempo: [[0, 'Doom crawl'], [95, 'Headbang'], [135, 'Mosh'], [175, 'Thrash'], [205, 'Blast']]
    },
    punk: {
      presets: [
        { id: 'skank', name: 'Punk skank', signature: true, desc: 'Kick on the beat, snare on the "and", hats flat out.',
          bar: ['x...x...x...x...', '..x...x...x...x.', 'x.x.x.x.x.x.x.x.', 'x...............'] },
        { id: 'dbeat', name: 'D-beat', desc: 'Boom, crack, ba-boom. Every crust punk in Moose Jaw knows it.',
          bar: ['x.....x.x.....x.', '....x.......x...', 'x.x.x.x.x.x.x.x.', 'x...............'] },
        { id: 'floor', name: 'Four on the floor', desc: 'Kick on every beat, open hats in between. Dance, you cowards.',
          bar: ['x...x...x...x...', '....x.......x...', '..x...x...x...x.', 'x...............'] },
        { id: 'buzzsaw', name: 'Buzzsaw 8ths', desc: 'Kick on every 8th under a plain backbeat. One speed: yes.',
          bar: ['x.x.x.x.x.x.x.x.', '....x.......x...', 'x.x.x.x.x.x.x.x.', E] },
        { id: 'hardcore', name: 'Hardcore two-step', desc: 'Stop-start snare hits for the circle pit.',
          bar: ['x.x...x.x.x...x.', '....x.x.....x.x.', 'x...x...x...x...', 'x...............'] }
      ],
      mods: [
        { id: 'more', name: 'More punk', desc: 'Faster, snare on the "and", straight 8th hats.',
          ops: [{ op: 'bpm', by: 15 }, { op: 'hits', lane: 'snare', steps: [2, 6, 10, 14] }, { op: 'fill', lane: 'hat', every: 2 }, { op: 'thin', lane: 'hat', keep: 2 }] },
        CATCHY, SIMPLER,
        { id: 'busier', name: 'Busier', desc: 'Kick on every 8th and a crash to kick it off.',
          ops: [{ op: 'fill', lane: 'kick', every: 2 }, { op: 'hits', lane: 'cymbal', steps: [0, 8] }] }
      ],
      tempo: [[0, 'Pogo'], [170, 'Mosh'], [195, 'Circle pit'], [215, 'Speed of sound']]
    },
    rock: {
      presets: [
        { id: 'backbeat', name: 'Rock backbeat', signature: true, desc: 'Kick on 1 and 3, snare on 2 and 4, 8th hats. The classic.',
          bar: ['x.......x.......', '....x.......x...', 'x.x.x.x.x.x.x.x.', 'x...............'] },
        { id: 'halftime', name: 'Half-time', desc: 'One big snare in the middle. Feels slow, sounds huge.',
          bar: ['x.........x.....', '........x.......', 'x.x.x.x.x.x.x.x.', 'x...............'] },
        { id: 'shuffle', name: 'Shuffle', desc: 'Swung hats, lazy and bluesy. Wear the good boots.',
          bar: ['x.......x.......', '....x.......x...', 'x..xx..xx..xx..x', E] },
        { id: 'floor', name: 'Four on the floor', desc: 'Kick on every beat, open hats on the "and".',
          bar: ['x...x...x...x...', '....x.......x...', '..x...x...x...x.', 'x...............'] },
        { id: 'stomp', name: 'Bleacher stomp', desc: 'Boom-boom-clap. The whole arena joins in, even the ushers.',
          bar: ['x.x.....x.x.....', '....x.......x...', E, 'x...............'] }
      ],
      mods: [
        { id: 'more', name: 'More rock', desc: 'Kick on 1 and 3, snare on 2 and 4, steady 8th hats.',
          ops: [{ op: 'hits', lane: 'kick', steps: [0, 8] }, { op: 'thin', lane: 'snare', keep: 4 }, { op: 'hits', lane: 'snare', steps: [4, 12] },
            { op: 'fill', lane: 'hat', every: 2 }, { op: 'thin', lane: 'hat', keep: 2 }] },
        CATCHY, SIMPLER,
        { id: 'busier', name: 'Busier', desc: 'Extra kicks on the "and" and a crash on the one.',
          ops: [{ op: 'hits', lane: 'kick', steps: [6, 10] }, { op: 'hits', lane: 'cymbal', steps: [0] }, { op: 'fill', lane: 'hat', every: 2 }] }
      ],
      tempo: [[0, 'Slow burn'], [105, 'Head nod'], [125, 'Fist pump'], [145, 'Air guitar']]
    },
    country: {
      presets: [
        { id: 'train', name: 'Train beat', signature: true, desc: 'Snare on every 16th, kick on 1 and 3. Chugga-chugga.',
          bar: ['x.......x.......', 'xxxxxxxxxxxxxxxx', '....x.......x...', E] },
        { id: 'twostep', name: 'Two-step', desc: 'Boom-chick, boom-chick. Grab a partner at the Legion.',
          bar: ['x.......x.......', '....x.......x...', 'x.x.x.x.x.x.x.x.', E] },
        { id: 'waltz', name: 'Waltz feel', desc: 'Boom-chick-chick. A waltz squeezed into four, like a Stetson in an overhead bin.',
          bar: ['x.......x.......', '....x.x.....x.x.', '....x.......x...', E] },
        { id: 'brush', name: 'Brush shuffle', desc: 'Swung brushes on the snare. Sounds like a dusty gravel road.',
          bar: ['x.......x.......', 'x..xx..xx..xx..x', '....x.......x...', E] },
        { id: 'hoedown', name: 'Hoedown', desc: 'Kick on the beat, snare on the "and". Fiddles optional, joy mandatory.',
          bar: ['x...x...x...x...', '..x...x...x...x.', E, E] }
      ],
      mods: [
        { id: 'more', name: 'More twang', desc: 'The train beat: snare on every 16th, kick on 1 and 3, a chick on 2 and 4.',
          ops: [{ op: 'fill', lane: 'snare', every: 1 }, { op: 'thin', lane: 'kick', keep: 8 }, { op: 'hits', lane: 'kick', steps: [0, 8] },
            { op: 'hits', lane: 'hat', steps: [4, 12] }, { op: 'clear', lane: 'cymbal' }] },
        CATCHY,
        { id: 'simpler', name: 'Simpler', desc: 'Only the 8th notes survive, hats on the beat. Easier on the wrists.', ops: SIMPLER.ops },
        { id: 'busier', name: 'Busier', desc: 'Snare on every 8th and a hat chick on 2 and 4.',
          ops: [{ op: 'fill', lane: 'snare', every: 2 }, { op: 'hits', lane: 'hat', steps: [4, 12] }] }
      ],
      tempo: [[0, 'Porch swing'], [85, 'Two-step'], [100, 'Line dance'], [115, 'Barn burner']]
    },
    // One line per screen from whoever fits (role regex on the active lineup; the first match speaks).
    // v0.9: coach[genre][step] per band voice (54_ui_sequencer reads coach[genre] first); the flat steps are the neutral
    // fallback for anything else (a lineup of fill-ins, a genre with no set).
    coach: {
      verse: [{ role: 'guitar', text: "Start with the verse. Pick a beat that makes you nod, then we'll play on top." },
        { role: 'bass', text: "Verse first. Keep it steady and I'll lock in with the kick." }],
      chorus: [{ role: 'vocals', text: 'The chorus should feel different from the verse. Bigger. Louder. Easier to yell along to.' },
        { role: 'guitar', text: "Pick something that isn't the verse again. Contrast is the hook, eh." }],
      bridge: [{ role: 'lead guitar|guitar|fiddle', text: "The bridge is the solo spot. Something wild, or something half-time. Surprise me." },
        { role: 'bass', text: 'Bridge time. Change it up so the last chorus hits like a snowplough.' }],
      tempo: [{ role: 'bass', text: "Tempo's the whole mood. Slide it and hit Play." },
        { role: 'guitar', text: "Faster is harder to play live. Just saying. My fingers have a union." }],
      order: [{ role: 'vocals', text: 'Short is punchy, Epic is a journey. Pick one before the coffee wears off.' },
        { role: 'bass', text: 'Classic has a bridge. Crowds like a bridge. Engineers too.' }],
      name: [{ role: 'vocals', text: 'Every song needs a name. Something you can yell into a microphone.' },
        { role: 'guitar', text: 'Name it something. Or let the singer name it. They will anyway.' }],
      // Hail Damage (the v0.6.2 lines, unchanged).
      metal: {
        verse: [{ role: 'guitar', text: "Start with the verse. Pick a beat that makes you nod, then we'll riff on top." },
          { role: 'bass', text: "Verse first. Keep it steady and I'll lock in with the kick." }],
        chorus: [{ role: 'vocals', text: 'The chorus should feel different from the verse. Bigger. Louder. More me.' },
          { role: 'guitar', text: "Pick something that isn't the verse again. Contrast is the hook, eh." }],
        bridge: [{ role: 'lead guitar|guitar|fiddle', text: "The bridge is my solo spot. Something wild, or something half-time. Surprise me." },
          { role: 'bass', text: 'Bridge time. Change it up so the last chorus hits like a snowplough.' }],
        tempo: [{ role: 'bass', text: "Tempo's the whole mood. Slide it and hit Play. Trust your neck." },
          { role: 'guitar', text: "Faster is harder to play live. Just saying. My fingers have a union." }],
        order: [{ role: 'vocals', text: 'Short is punchy, Epic is a journey. I have stamina for either. Probably.' },
          { role: 'bass', text: 'Classic has a bridge. Crowds like a bridge. Engineers too.' }],
        name: [{ role: 'vocals', text: 'I have titles. Dark ones. In English, for the radio. They are not about my lawn. Do not check.' },
          { role: 'guitar', text: 'Name it something. Or let the singer name it, before he sneaks a French one in again.' }]
      },
      // Frost Heave: Rox (vocals/guitar), Benny (guitar, two chords), Moth (bass, lives in the van).
      punk: {
        verse: [{ role: '^guitar$', text: "Verse. Pick a beat. I've got two chords ready and I'm not afraid to use both." },
          { role: 'bass', text: 'Keep the verse simple. The dryers upstairs are keeping better time than most drummers.' }],
        chorus: [{ role: 'vocals', text: 'The chorus is where I yell about the zoning bylaw. Make it loud enough to reach city hall.' },
          { role: '^guitar$', text: "Chorus is the same two chords, but angrier. That's called songwriting." }],
        bridge: [{ role: '^guitar$', text: "Bridge is my solo. It's two chords. Very fast. Don't tell anyone." },
          { role: 'bass', text: 'Bridge: go half-time so the pit can catch its breath. Then go faster.' }],
        tempo: [{ role: 'bass', text: 'Punk lives above 170. Below that the landlord can hear the words.' },
          { role: 'vocals', text: 'Faster. Council meetings are three hours. Our songs should be ninety seconds.' }],
        order: [{ role: 'vocals', text: 'Short. Always short. Nobody ever lost a vote by being brief.' },
          { role: 'bass', text: 'Classic has a bridge. Epic is a road trip, and I live in the van, so either.' }],
        name: [{ role: 'vocals', text: 'Name it after a council motion. Or a pothole. Ideally a specific pothole.' },
          { role: '^guitar$', text: "Two words max. Like my chords." }]
      },
      // Gravel Kings: Chase (vocals, 1985 forever), Lenny (guitar, the lawyers keep calling), Tamara (bass, the adult).
      rock: {
        verse: [{ role: 'guitar', text: "Verse first. Give me a beat and I'll play a riff that is legally distinct. Mostly." },
          { role: 'bass', text: 'Steady verse, please. Kick on 1 and 3. I have a cleaning at 8 a.m.' }],
        chorus: [{ role: 'vocals', text: 'The chorus is for the arena. Imagine the lighters. Imagine the leather. Imagine 1985.' },
          { role: 'guitar', text: 'Make the chorus bigger than the verse. Big open chords. Totally original ones.' }],
        bridge: [{ role: 'guitar', text: "Bridge is my solo. If it sounds familiar, that's a coincidence my lawyer can explain." },
          { role: 'bass', text: 'Bridge: change it up so the last chorus lands. Then we floss and go home.' }],
        tempo: [{ role: 'vocals', text: 'Under 90 is a power ballad. I have a scarf for that. Actually, do not give me ideas.' },
          { role: 'bass', text: 'Rock sits between 100 and 150. Anything faster and Chase runs out of air.' }],
        order: [{ role: 'vocals', text: 'Epic. Always Epic. The fans deserve a key change they can see from the parking lot.' },
          { role: 'bass', text: 'Classic has a bridge. Crowds like a bridge. So do dentists, professionally.' }],
        name: [{ role: 'vocals', text: 'It needs a name you can spray-paint on a van. Something with "Night" in it.' },
          { role: 'guitar', text: "Pick a name nobody's used. Let me check. Okay, pick a different one." }]
      },
      // The Grid Road Ramblers: Travis Lee (vocals/acoustic), Earl (lead guitar, played with everyone), Clementine (fiddle),
      // Duke (bass, the hat).
      country: {
        verse: [{ role: 'acoustic', text: "Start with the verse. Something that sounds like a gravel road and a broken heart. And a truck." },
          { role: 'lead guitar', text: "Verse first. Back in '79 I played a verse so steady the drummer fell asleep. Good drummer." }],
        chorus: [{ role: 'acoustic', text: 'The chorus is where the truck comes back. Or the girl. Ideally both, in the truck.' },
          { role: 'fiddle', text: 'Make the chorus lift. I will play something far too good for it and enjoy it very quietly.' }],
        bridge: [{ role: 'lead guitar', text: "Bridge is my solo. I'll twang. I once twanged for a very famous man. Can't say who. It was him." },
          { role: 'fiddle', text: 'The bridge wants contrast. Half-time, or a train. I have a Bach run that fits either.' }],
        tempo: [{ role: 'bass', text: 'Country rolls between 80 and 120. The hat stays on at any tempo.' },
          { role: 'lead guitar', text: 'Slow is a two-step, quick is a train. Pick one before the coffee gets cold. It already has.' }],
        order: [{ role: 'acoustic', text: 'Classic has a bridge. Every good truck song has a bridge. Usually one the truck drives over.' },
          { role: 'bass', text: 'Short is a two-step. Epic is a road trip to Medicine Hat.' }],
        name: [{ role: 'acoustic', text: 'Name it after a highway. Or a truck. Or a highway a truck is on.' },
          { role: 'fiddle', text: 'Let Travis name it. It will have a truck in it. I have made my peace with this.' }]
      }
    }
  };
  /* ---- v1.3 "Songwriter" (plan_contract_1.3 §4.3, Lane S): the Quick song. New keys only (presets, mods, tempo and the
     coach steps above are 1.2's). Per genre:
       recipes: [{ id, name, desc (<= 28 chars, seat-safe), pedal?, bpm, arr: 'short'|'classic'|'epic',
                   drums: { verse|chorus|bridge: [barId, ...opIds] }, alt: { <section>: [[barId, ...opIds], ...] } (the seeded
                   variants compose picks from), dk?: { <section>: [opIds] } (added once the double kick is owned),
                   sliders: { energy, mood, swing, fills } (the card's defaults),
                   parts: { prog: { verse, chorus, bridge }, hook: { verse, chorus, bridge }, mods?: { <section>: modId | { <seat>: modId } },
                            alt?: { <section>: [modId | { <seat>: modId } | null, ...] } } }]   exactly 5; the first = the signature recipe
       bars: { id: [laneStr x 4..6] }   recipe-only bars (barId resolves in presets first, then here)
       ops: { id: [OP] }                recipe-only OP lists (opId resolves in mods, then here, then grooveFx.ops)
       sliders: { energy|mood|swing|fills: [5 stop labels], bySeat?: { <seat>: { <slider>: [5] } } }
     OPs: the 0.6.2 ones + { op: 'roll', from, to?, every? } (a fill: toms when the kit has them, else the snare; the hats, ride
     and crash stop under it) + { op: 'swap', from, to, alt? } (one lane's hits move to another). Coach: coach.quick (neutral)
     + coach[genre].quick (+ zz_seats bySeat.quick): the Quick song bubble (colon-free: the first Write shows it). ---- */
  var X = '................', Q = GG.content.grooves;
  var K8 = 'x.x.x.x.x.x.x.x.', S24 = '....x.......x...', H8 = 'x.x.x.x.x.x.x.x.', H16 = 'xxxxxxxxxxxxxxxx', HQ = 'x...x...x...x...', C1 = 'x...............';
  Q.surprise = { name: 'Surprise me', desc: 'Roll the dice' };
  Q.coach.quick = [{ role: 'guitar', text: 'Pick a recipe, push the sliders around and hit Play. Save it when it makes you nod.' },
    { role: 'bass', text: 'Start from a recipe and tweak it after, or do not. It already works.' }];

  Q.metal.bars = {
    cr: [K8, S24, X, H8], crq: [K8, S24, H8, HQ], hb16: [K8, S24, H16, 'x.......x.......'], hbq: [K8, S24, HQ, 'x.......x.......'],
    blasth: [K8, H8, H8, C1], blast16: [K8, H8, H16, C1], doomc: [K8, S24, H8, HQ], doomv: [K8, S24, HQ, 'x.......x.......'],
    doomb: [K8, '....x.......x...', X, HQ], push: [K8, '....x.......x.x.', H8, C1], thrc: [K8, H8, X, 'x.x.x.x.x.x.x.x.'],
    gal: ['x.xxx.xxx.xxx.xx', S24, H8, C1], galc: ['x.xxx.xxx.xxx.xx', S24, X, H8], galb: [H16, S24, HQ, 'x.......x.......']
  };
  Q.metal.ops = { hat16: [{ op: 'fill', lane: 'hat', every: 1 }], hatq: [{ op: 'thin', lane: 'hat', keep: 4 }], crash3: [{ op: 'hits', lane: 'cymbal', steps: [8] }],
    ghost: [{ op: 'hits', lane: 'snare', steps: [14] }], dk: [{ op: 'pedal', lane: 'kick' }], crashride: [{ op: 'swap', from: 'hat', to: 'cymbal' }],
    gallop: [{ op: 'clear', lane: 'kick' }, { op: 'hits', lane: 'kick', steps: [0, 2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15] }] };
  Q.metal.recipes = [
    { id: 'neck-snapper', name: 'Neck-snapper', desc: 'Fast, tight, furious', bpm: 180, arr: 'classic',
      drums: { verse: ['headbanger'], chorus: ['cr'], bridge: ['blast'] },
      alt: { verse: [['hb16'], ['hbq'], ['blasth'], ['headbanger', 'crash3']], chorus: [['crq'], ['blast'], ['headbanger', 'hat16'], ['cr', 'ghost']],
        bridge: [['blasth'], ['doomc'], ['blast16']] },
      dk: { verse: ['dk'], chorus: ['dk'], bridge: ['dk'] }, sliders: { energy: 2, mood: 2, swing: 0, fills: 1 },
      parts: { prog: { verse: 1, chorus: 0, bridge: 0 }, hook: { verse: 1, chorus: 0, bridge: 0 }, mods: { verse: { rhythm: 'lock', bass: 'lock' } },
        alt: { verse: [{ rhythm: 'scratch', bass: 'double', lead: 'call' }, null], chorus: [{ bass: 'octave', lead: 'call' }, null], bridge: [{ rhythm: 'ring', lead: 'pickup' }, null] } } },
    { id: 'doom-crawl', name: 'Doom crawl', desc: 'Slow, heavy, no mercy', bpm: 75, arr: 'classic',
      drums: { verse: ['doomv'], chorus: ['doomc'], bridge: ['doomb'] },
      alt: { verse: [['doomv', 'ghost'], ['hbq', 'crash3']], chorus: [['cr'], ['crq', 'ghost']], bridge: [['blast'], ['doomc', 'hatq']] },
      dk: { verse: ['dk'], chorus: ['dk'], bridge: ['dk'] }, sliders: { energy: 1, mood: 4, swing: 0, fills: 1 },
      parts: { prog: { verse: 0, chorus: 1, bridge: 3 }, hook: { verse: 0, chorus: 2, bridge: 2 }, mods: { verse: { rhythm: 'ring', bass: 'ring' }, bridge: { rhythm: 'ring' } },
        alt: { verse: [{ lead: 'sparse' }, null], chorus: [{ rhythm: 'lock' }, null] } } },
    { id: 'thrash-attack', name: 'Thrash attack', desc: 'Breakneck and proud of it', bpm: 200, arr: 'short',
      drums: { verse: ['headbanger'], chorus: ['thrc'], bridge: ['blasth'] },
      alt: { verse: [['push'], ['hb16']], chorus: [['blast'], ['cr', 'ghost']], bridge: [['blast'], ['blast16']] },
      dk: { verse: ['dk'], chorus: ['dk'], bridge: ['dk'] }, sliders: { energy: 3, mood: 3, swing: 0, fills: 2 },
      parts: { prog: { verse: 4, chorus: 4, bridge: 1 }, hook: { verse: 2, chorus: 1, bridge: 1 }, mods: { verse: { rhythm: 'lock', bass: 'lock' } },
        alt: { verse: [{ rhythm: 'scratch', lead: 'double' }, null], chorus: [{ bass: 'double' }, null] } } },
    { id: 'stadium-anthem', name: 'Stadium anthem', desc: 'Fists up, lighters out', bpm: 140, arr: 'epic',
      drums: { verse: ['headbanger'], chorus: ['crq'], bridge: ['doomc'] },
      alt: { verse: [['hbq'], ['headbanger', 'crash3']], chorus: [['cr'], ['crq', 'ghost']], bridge: [['blasth'], ['doomb']] },
      dk: { verse: ['dk'], chorus: ['dk'], bridge: ['dk'] }, sliders: { energy: 2, mood: 0, swing: 0, fills: 2 },
      parts: { prog: { verse: 2, chorus: 2, bridge: 2 }, hook: { verse: 0, chorus: 0, bridge: 2 }, mods: { chorus: { rhythm: 'ring' } },
        alt: { verse: [{ lead: 'call', bass: 'walk' }, null], bridge: [{ rhythm: 'ring' }, null] } } },
    { id: 'gallop', name: 'Gallop', desc: 'Da-ga-da at full tilt', pedal: true, bpm: 165, arr: 'classic',
      drums: { verse: ['gal'], chorus: ['galc'], bridge: ['galb'] },
      alt: { verse: [['gal', 'hatq'], ['gal', 'crash3']], chorus: [['galc', 'ghost'], ['gal', 'hat16']], bridge: [['blast', 'gallop'], ['galb', 'crash3']] },
      sliders: { energy: 3, mood: 1, swing: 0, fills: 1 },
      parts: { prog: { verse: 3, chorus: 3, bridge: 1 }, hook: { verse: 2, chorus: 1, bridge: 1 }, mods: { verse: { rhythm: 'lock', bass: 'lock' }, chorus: { rhythm: 'lock' } },
        alt: { verse: [{ lead: 'double' }, null], chorus: [{ bass: 'lock' }, null] } } }
  ];
  Q.metal.sliders = { energy: ['Lumbering', 'Steady chug', 'Headbang', 'Frenzied', 'Unholy'], mood: ['Heroic', 'Grim', 'Midnight', 'Sinister', 'Abyss'],
    swing: ['Straight', 'Slight lurch', 'Lurch', 'Shuffle', 'Triplets'], fills: ['None', 'A few', 'Some', 'Plenty', 'All of them'] };
  Q.coach.metal.quick = [{ role: 'vocals', text: 'Pick a recipe. Neck-snapper is the one. Slide Mood toward Abyss and I bring the screams.' },
    { role: 'guitar', text: 'Doom crawl if you are tired, Thrash attack if you had coffee. Then hit Play.' }];

  Q.punk.bars = {
    sk8: ['x...x...x...x...', 'x.x.x.x.x.x.x.x.', X, 'x.x.x.x.x.x.x.x.'], skr: ['x...x...x...x...', '..x...x...x...x.', X, 'x.x.x.x.x.x.x.x.'],
    db4: ['x.x...x.x.x...x.', '....x.x.....x.x.', H8, C1], db4c: ['x.x...x.x.x...x.', '....x.x.....x.x.', X, 'x.x.x.x.x.x.x.x.'],
    two: ['x...x...x...x...', '..x.x.....x.x...', H8, C1], twoc: ['x...x...x...x...', '..x.x.....x.x...', X, 'x.x.x.x.x.x.x.x.'],
    pogo: ['x...x...x...x...', 'x.x.x.x.x.x.x.x.', H8, C1], pogoc: ['x.x.x...x.x.x...', '..x...x...x...x.', H8, 'x.......x.......'],
    pit: ['x.x...x.x.x...x.', '..x.x.x...x.x.x.', H8, C1], pitc: ['x.x...x.x.x...x.', '..x.x.x...x.x.x.', X, 'x.x.x.x.x.x.x.x.'],
    skq: ['x...x...x...x...', '..x...x...x...x.', HQ, C1]
  };
  Q.punk.ops = { crash3: [{ op: 'hits', lane: 'cymbal', steps: [8] }], hatq: [{ op: 'thin', lane: 'hat', keep: 4 }], crashride: [{ op: 'swap', from: 'hat', to: 'cymbal' }],
    kick8: [{ op: 'hits', lane: 'kick', steps: [2, 10] }] };
  Q.punk.recipes = [
    { id: 'three-chord-sprint', name: 'Three-chord sprint', desc: 'Loud, fast, done by lunch', bpm: 190, arr: 'short',
      drums: { verse: ['skank'], chorus: ['sk8'], bridge: ['two'] },
      alt: { verse: [['db4'], ['two'], ['skank', 'kick8'], ['pit']], chorus: [['skr'], ['db4c'], ['pogo', 'crash3'], ['twoc']], bridge: [['skq'], ['db4'], ['hardcore']] },
      sliders: { energy: 2, mood: 1, swing: 0, fills: 1 },
      parts: { prog: { verse: 0, chorus: 0, bridge: 0 }, hook: { verse: 0, chorus: 0, bridge: 1 },
        alt: { verse: [{ rhythm: 'scratch', bass: 'octave', lead: 'call' }, null], chorus: [{ lead: 'double', bass: 'pickup' }, null], bridge: [{ rhythm: 'ring' }, null] } } },
    { id: 'laundromat-d-beat', name: 'Laundromat D-beat', desc: 'Spin cycle on high', bpm: 185, arr: 'classic',
      drums: { verse: ['db4'], chorus: ['db4c'], bridge: ['skq'] },
      alt: { verse: [['db4', 'crash3']], chorus: [['pitc']], bridge: [['two']] }, sliders: { energy: 2, mood: 3, swing: 0, fills: 1 },
      parts: { prog: { verse: 2, chorus: 1, bridge: 1 }, hook: { verse: 2, chorus: 0, bridge: 0 }, alt: { verse: [{ bass: 'double' }, null] } } },
    { id: 'pogo-party', name: 'Pogo party', desc: 'Everybody up and bouncing', bpm: 175, arr: 'short',
      drums: { verse: ['pogo'], chorus: ['pogoc'], bridge: ['floor'] },
      alt: { verse: [['pogo', 'crash3']], chorus: [['sk8']], bridge: [['skq']] }, sliders: { energy: 2, mood: 0, swing: 1, fills: 2 },
      parts: { prog: { verse: 1, chorus: 2, bridge: 0 }, hook: { verse: 1, chorus: 1, bridge: 0 }, mods: { chorus: { lead: 'call' } } } },
    { id: 'circle-pit', name: 'Circle pit', desc: 'Faster than the bylaw allows', bpm: 220, arr: 'short',
      drums: { verse: ['pit'], chorus: ['pitc'], bridge: ['hardcore'] },
      alt: { verse: [['skank']], chorus: [['sk8']], bridge: [['two']] }, sliders: { energy: 3, mood: 2, swing: 0, fills: 2 },
      parts: { prog: { verse: 0, chorus: 1, bridge: 1 }, hook: { verse: 0, chorus: 2, bridge: 1 }, alt: { verse: [{ rhythm: 'scratch' }, null] } } },
    { id: 'skate-rat', name: 'Skate rat', desc: 'Kickflips and scraped knees', bpm: 205, arr: 'classic',
      drums: { verse: ['two'], chorus: ['twoc'], bridge: ['skank'] },
      alt: { verse: [['skank']], chorus: [['skr']], bridge: [['db4']] }, sliders: { energy: 3, mood: 1, swing: 0, fills: 3 },
      parts: { prog: { verse: 1, chorus: 2, bridge: 0 }, hook: { verse: 1, chorus: 2, bridge: 1 }, mods: { verse: { bass: 'walk' } } } }
  ];
  Q.punk.sliders = { energy: ['Lazy Sunday', 'Downstrokes', 'Fast', 'Faster', 'Fastest'], mood: ['Sunny', 'Cheery', 'Gritty', 'Bitter', 'Gloomy'],
    swing: ['Straight', 'Bouncy', 'Skanking', 'Swinging', 'Triplets'], fills: ['None', 'A few', 'Some', 'Plenty', 'Chaos'] };
  Q.coach.punk.quick = [{ role: 'vocals', text: 'Pick a recipe. Three-chord sprint, obviously. Push Energy up until the landlord knocks.' },
    { role: '^guitar$', text: 'All five recipes have two chords in them somewhere. I checked. Hit Play.' }];

  Q.rock.bars = {
    arv: ['x.......x.......', S24, H8, C1], arc: ['x.....x.x.......', S24, X, 'x.x.x.x.x.x.x.x.'], arc2: ['x.......x.x.....', S24, H8, 'x.......x.......'],
    ghost: ['x.......x.......', '....x.......x.x.', H8, C1], push: ['x.....x.x.......', S24, H8, C1], lift: ['x.......x.x.....', S24, X, 'x.x.x.x.x.x.x.x.'],
    lw: ['x.......x.......', S24, H8, X], lwc: ['x.......x.......', S24, X, 'x.x.x.x.x.x.x.x.'], lwb: ['x.......x.......', S24, HQ, '..x...x...x...x.'],
    boog: ['x.....x.x.....x.', S24, H8, C1], boogc: ['x.....x.x.....x.', S24, X, 'x.x.x.x.x.x.x.x.'],
    st: ['x.x.....x.x.....', S24, H8, C1], stc: ['x.x.....x.x.....', S24, X, 'x.x.x.x.x.x.x.x.'], split: ['x.......x.......', S24, HQ, '..x...x...x...x.'],
    hw: ['x.......x.x.....', S24, H8, C1], hwc: ['x.x.....x.x.....', S24, X, 'x.x.x.x.x.x.x.x.']
  };
  Q.rock.ops = { crash3: [{ op: 'hits', lane: 'cymbal', steps: [8] }], crashride: [{ op: 'swap', from: 'hat', to: 'cymbal' }], ghost: [{ op: 'hits', lane: 'snare', steps: [14] }] };
  Q.rock.recipes = [
    { id: 'arena-anthem', name: 'Arena anthem', desc: 'Big chorus, bigger hair', bpm: 125, arr: 'classic',
      drums: { verse: ['arv'], chorus: ['arc'], bridge: ['split'] },
      alt: { verse: [['ghost'], ['push'], ['hw'], ['split', 'crash3']], chorus: [['lift'], ['arc2', 'crashride'], ['stc'], ['boogc']], bridge: [['arv', 'crashride'], ['halftime'], ['st']] },
      sliders: { energy: 2, mood: 2, swing: 0, fills: 1 },
      parts: { prog: { verse: 0, chorus: 0, bridge: 0 }, hook: { verse: 0, chorus: 0, bridge: 1 }, mods: { chorus: { rhythm: 'ring' } },
        alt: { verse: [{ rhythm: 'fifths', bass: 'walk', lead: 'call' }, null], chorus: [{ bass: 'octave', lead: 'double' }, null], bridge: [{ rhythm: 'ring', lead: 'pickup' }, null] } } },
    { id: 'lighter-waver', name: 'Lighter-waver', desc: 'Slow, huge, a bit teary', bpm: 100, arr: 'epic',
      drums: { verse: ['lw'], chorus: ['lwc'], bridge: ['lwb'] },
      alt: { verse: [['lw', 'ghost']], chorus: [['arc']], bridge: [['split']] }, sliders: { energy: 1, mood: 3, swing: 0, fills: 1 },
      parts: { prog: { verse: 1, chorus: 1, bridge: 1 }, hook: { verse: 1, chorus: 2, bridge: 1 }, mods: { verse: { rhythm: 'ring', bass: 'ring' }, chorus: { rhythm: 'ring' } } } },
    { id: 'bar-boogie', name: 'Bar boogie', desc: 'Sticky floors, loose hips', bpm: 115, arr: 'classic',
      drums: { verse: ['boog'], chorus: ['boogc'], bridge: ['arv'] },
      alt: { verse: [['boog', 'crash3']], chorus: [['arc']], bridge: [['split']] }, sliders: { energy: 2, mood: 1, swing: 3, fills: 1 },
      parts: { prog: { verse: 1, chorus: 2, bridge: 1 }, hook: { verse: 2, chorus: 1, bridge: 0 }, mods: { verse: { bass: 'walk' } } } },
    { id: 'bleacher-stomp', name: 'Bleacher stomp', desc: 'Boom-boom-clap, all of you', bpm: 118, arr: 'short',
      drums: { verse: ['st'], chorus: ['stc'], bridge: ['arv'] },
      alt: { verse: [['st', 'crash3']], chorus: [['lift']], bridge: [['split']] }, sliders: { energy: 2, mood: 2, swing: 0, fills: 2 },
      parts: { prog: { verse: 2, chorus: 1, bridge: 0 }, hook: { verse: 0, chorus: 1, bridge: 0 }, mods: { verse: { rhythm: 'lock', bass: 'lock' } } } },
    { id: 'highway-driver', name: 'Highway driver', desc: 'Windows down, eyes front', bpm: 145, arr: 'classic',
      drums: { verse: ['hw'], chorus: ['hwc'], bridge: ['arv'] },
      alt: { verse: [['arv']], chorus: [['lift']], bridge: [['split']] }, sliders: { energy: 3, mood: 1, swing: 0, fills: 2 },
      parts: { prog: { verse: 0, chorus: 1, bridge: 0 }, hook: { verse: 1, chorus: 1, bridge: 1 }, mods: { verse: { rhythm: 'double' } } } }
  ];
  Q.rock.sliders = { energy: ['Slow burn', 'Cruising', 'Arena', 'Big', 'Showboat'], mood: ['Sunny', 'Bright', 'Bluesy', 'Moody', 'Dark'],
    swing: ['Straight', 'A strut', 'Boogie', 'Shuffle', 'Triplets'], fills: ['None', 'A few', 'Some', 'Plenty', 'Big finish'],
    bySeat: { drums: { fills: ['None', 'A few', 'Some', 'Plenty', 'Drum solo, sorry'] } } };
  Q.coach.rock.quick = [{ role: 'vocals', text: 'Pick a recipe. Arena anthem. It is always Arena anthem. Then make it louder.' },
    { role: 'bass', text: 'Pick one, slide Energy, hit Play. If it sounds like 1985, Chase will be happy.' }];

  Q.country.bars = {
    tr12: ['x.......x.......', 'xxx.xxx.xxx.xxx.', '....x.......x...', X], tr12b: ['x.......x.......', '.xxx.xxx.xxx.xxx', '....x.......x...', X],
    trc: ['x...x...x...x...', H16, H8, C1], trc2: ['x.....x.x.......', H16, H8, C1], trg: ['x.......x.......', 'x.xxx.xxx.xxx.xx', '....x.......x...', X],
    trgc: ['x.......x.....x.', H16, 'x.x.x.x.x.x.x.x.', C1], tw: ['x.......x.......', 'xx.xxx.xxx.xxx.x', '....x.......x...', X],
    twc: ['x...x...x...x...', 'xxxxxxxx.xxxxxxx', H8, C1], sw: ['x.......x.......', 'xxx.xxx.xxx.xxx.', 'x...x...x...x...', X],
    swc: ['x.......x.....x.', H16, H8, C1], bb: ['x...x...x...x...', H16, '....x.......x...', X], bbc: ['x...x...x...x...', H16, H8, C1],
    ps: ['x.......x.......', 'x.xxx.xxx.xxx.xx', '....x.......x...', X], psc: ['x.....x.x.......', 'xxxxxxxxxxxxxxxx', H8, C1]
  };
  Q.country.ops = { kick3: [{ op: 'hits', lane: 'kick', steps: [14] }], hat8: [{ op: 'fill', lane: 'hat', every: 2 }] };
  Q.country.recipes = [
    { id: 'train-song', name: 'Train song', desc: 'Chugga-chugga, all aboard', bpm: 112, arr: 'classic',
      drums: { verse: ['tr12'], chorus: ['trc'], bridge: ['trg'] },
      alt: { verse: [['tr12b'], ['train'], ['tw'], ['trg', 'kick3']], chorus: [['trc2'], ['trgc'], ['twc'], ['bbc']], bridge: [['tr12b'], ['train', 'hat8'], ['sw']] },
      sliders: { energy: 2, mood: 1, swing: 0, fills: 1 },
      parts: { prog: { verse: 0, chorus: 0, bridge: 1 }, hook: { verse: 0, chorus: 0, bridge: 1 },
        alt: { verse: [{ bass: 'walk', rhythm: 'fifths', lead: 'call' }, null], chorus: [{ lead: 'double', bass: 'octave' }, null], bridge: [{ rhythm: 'ring', lead: 'pickup' }, null] } } },
    { id: 'legion-two-step', name: 'Legion two-step', desc: 'Grab a partner, mind the punch', bpm: 95, arr: 'classic',
      drums: { verse: ['tw'], chorus: ['twc'], bridge: ['tr12'] },
      alt: { verse: [['tw', 'kick3']], chorus: [['trc']], bridge: [['trg']] }, sliders: { energy: 1, mood: 1, swing: 2, fills: 1 },
      parts: { prog: { verse: 1, chorus: 1, bridge: 1 }, hook: { verse: 1, chorus: 2, bridge: 0 }, mods: { verse: { bass: 'walk' } } } },
    { id: 'sad-waltz', name: 'Sad waltz', desc: 'Slow dance, wet eyes', bpm: 85, arr: 'classic',
      drums: { verse: ['sw'], chorus: ['swc'], bridge: ['tr12b'] },
      alt: { verse: [['tr12']], chorus: [['trc2']], bridge: [['ps']] }, sliders: { energy: 0, mood: 3, swing: 1, fills: 0 },
      parts: { prog: { verse: 2, chorus: 2, bridge: 0 }, hook: { verse: 2, chorus: 2, bridge: 0 }, mods: { verse: { rhythm: 'ring' }, chorus: { rhythm: 'ring' } } } },
    { id: 'barn-burner', name: 'Barn burner', desc: 'Fiddle on fire, boots on', bpm: 120, arr: 'short',
      drums: { verse: ['bb'], chorus: ['bbc'], bridge: ['train'] },
      alt: { verse: [['train']], chorus: [['twc']], bridge: [['trg']] }, sliders: { energy: 3, mood: 2, swing: 0, fills: 2 },
      parts: { prog: { verse: 2, chorus: 1, bridge: 0 }, hook: { verse: 1, chorus: 1, bridge: 1 }, mods: { verse: { rhythm: 'double' } } } },
    { id: 'porch-swing', name: 'Porch swing', desc: 'Iced tea and a slow creak', bpm: 88, arr: 'short',
      drums: { verse: ['ps'], chorus: ['psc'], bridge: ['tw'] },
      alt: { verse: [['tr12b']], chorus: [['swc']], bridge: [['sw']] }, sliders: { energy: 1, mood: 0, swing: 3, fills: 1 },
      parts: { prog: { verse: 0, chorus: 2, bridge: 1 }, hook: { verse: 1, chorus: 0, bridge: 1 }, mods: { verse: { lead: 'sparse' } } } }
  ];
  Q.country.sliders = { energy: ['Porch', 'Easy', 'Two-step', 'Rolling', 'Barn burner'], mood: ['Sweet', 'Sunny', 'Dusty', 'Lonesome', 'Heartbreak'],
    swing: ['Straight', 'A lilt', 'Shuffle', 'Swing', 'Triplets'], fills: ['None', 'A few', 'Some', 'Plenty', 'Hoedown'] };
  Q.coach.country.quick = [{ role: 'acoustic', text: 'Pick a recipe. Train song if you want them dancing, Sad waltz if you want them calling their mothers.' },
    { role: 'lead guitar', text: 'Slide Feel toward Swing. Back in 1979 everything swung. Even the tractors.' }];

  // The slider effects (compose reads them; byGenre overrides a key per genre). energy: [OPs x 5] on every main bar (stop 2 = the
  // recipe as written; stop 0 keeps >= 8 hits a bar), partEnergy / partFills: [part mod id | [ids] | null x 5] (21 modRows: sparse,
  // eighths, double, octave, pickup, ...), fills: [{ sections, ops, alt?: [[OP]], partSections? } x 5] (the bar-4 fill, Q2 = 1),
  // swap4 / swap6: sections where a variant may move the hats to the crash (4 lanes) / ride (6 lanes), ops: shared OP lists.
  GG.content.grooveFx = {
    energy: [[{ op: 'thin', lane: 'hat', keep: 4 }, { op: 'thin', lane: 'ride', keep: 4 }, { op: 'clear', lane: 'toms' }],
      [{ op: 'thin', lane: 'hat', keep: 2 }, { op: 'thin', lane: 'ride', keep: 2 }], [],
      [{ op: 'hits', lane: 'cymbal', steps: [8] }, { op: 'hits', lane: 'toms', steps: [14, 15] }],
      [{ op: 'hits', lane: 'cymbal', steps: [8] }, { op: 'hits', lane: 'snare', steps: [14] }, { op: 'hits', lane: 'toms', steps: [12, 13, 14, 15] }]],
    partEnergy: ['sparse', 'eighths', null, 'double', ['double', 'octave']],
    fills: [{ sections: [], ops: [] },
      { sections: ['verse'], ops: [{ op: 'roll', from: 14 }], alt: [[{ op: 'roll', from: 12, every: 2 }]] },
      { sections: ['verse', 'bridge'], ops: [{ op: 'roll', from: 12 }], alt: [[{ op: 'roll', from: 12, every: 2 }, { op: 'roll', from: 14 }]] },
      { sections: ['verse', 'chorus', 'bridge'], ops: [{ op: 'roll', from: 12 }], alt: [[{ op: 'roll', from: 8, every: 2 }, { op: 'roll', from: 12 }]] },
      { sections: ['verse', 'chorus', 'bridge'], ops: [{ op: 'roll', from: 8 }], alt: [[{ op: 'roll', from: 8, every: 2 }, { op: 'roll', from: 12 }]], partSections: ['verse'] }],
    partFills: [null, null, null, 'pickup', 'pickup'],
    swap4: ['chorus', 'bridge'], swap6: ['chorus', 'bridge'],
    ops: {},
    byGenre: {
      metal: { energy: [[{ op: 'thin', lane: 'hat', keep: 4 }, { op: 'thin', lane: 'ride', keep: 4 }, { op: 'thin', lane: 'snare', keep: 4 }, { op: 'clear', lane: 'toms' }],
        [{ op: 'thin', lane: 'hat', keep: 2 }, { op: 'thin', lane: 'snare', keep: 2 }], [],
        [{ op: 'hits', lane: 'cymbal', steps: [8] }, { op: 'hits', lane: 'snare', steps: [14] }],
        [{ op: 'fill', lane: 'hat', every: 1 }, { op: 'pedal', lane: 'kick' }, { op: 'hits', lane: 'snare', steps: [14] }, { op: 'hits', lane: 'toms', steps: [12, 13, 14, 15] }]] },
      punk: { energy: [[{ op: 'thin', lane: 'hat', keep: 4 }, { op: 'thin', lane: 'ride', keep: 4 }, { op: 'thin', lane: 'kick', keep: 4 }, { op: 'clear', lane: 'toms' }],
        [{ op: 'thin', lane: 'kick', keep: 4 }, { op: 'thin', lane: 'snare', keep: 2 }], [],
        [{ op: 'hits', lane: 'cymbal', steps: [8] }, { op: 'hits', lane: 'kick', steps: [10] }],
        [{ op: 'hits', lane: 'cymbal', steps: [0, 8] }, { op: 'fill', lane: 'snare', every: 2, from: 0 }, { op: 'hits', lane: 'toms', steps: [12, 13, 14, 15] }]] },
      rock: { energy: [[{ op: 'thin', lane: 'kick', keep: 8 }, { op: 'thin', lane: 'snare', keep: 4 }, { op: 'clear', lane: 'toms' }],
        [{ op: 'thin', lane: 'kick', keep: 4 }, { op: 'thin', lane: 'snare', keep: 4 }], [],
        [{ op: 'hits', lane: 'kick', steps: [10] }, { op: 'hits', lane: 'cymbal', steps: [8] }],
        [{ op: 'hits', lane: 'kick', steps: [6, 10] }, { op: 'hits', lane: 'cymbal', steps: [0, 8] }, { op: 'hits', lane: 'toms', steps: [12, 13, 14, 15] }]],
        swap4: ['chorus'] },
      country: { energy: [[{ op: 'clear', lane: 'snare', steps: [3, 7, 11, 15] }, { op: 'thin', lane: 'kick', keep: 8 }, { op: 'thin', lane: 'hat', keep: 4 }, { op: 'clear', lane: 'cymbal' }],
        [{ op: 'clear', lane: 'snare', steps: [7, 15] }, { op: 'thin', lane: 'kick', keep: 4 }], [],
        [{ op: 'fill', lane: 'snare', every: 1 }, { op: 'hits', lane: 'kick', steps: [14] }],
        [{ op: 'fill', lane: 'snare', every: 1 }, { op: 'hits', lane: 'kick', steps: [6, 14] }, { op: 'fill', lane: 'hat', every: 2 }, { op: 'hits', lane: 'toms', steps: [12, 13, 14, 15] }]],
        fills: [{ sections: [], ops: [] },
          { sections: ['verse'], ops: [{ op: 'roll', from: 14 }, { op: 'hits', lane: 'kick', steps: [14] }] },
          { sections: ['verse', 'bridge'], ops: [{ op: 'roll', from: 12 }, { op: 'hits', lane: 'kick', steps: [12] }], alt: [[{ op: 'clear', lane: 'snare', steps: [13, 15] }, { op: 'hits', lane: 'kick', steps: [14] }]] },
          { sections: ['verse', 'chorus', 'bridge'], ops: [{ op: 'roll', from: 12 }, { op: 'hits', lane: 'kick', steps: [12] }], alt: [[{ op: 'clear', lane: 'snare', steps: [13, 15] }, { op: 'hits', lane: 'kick', steps: [14] }]] },
          { sections: ['verse', 'chorus', 'bridge'], ops: [{ op: 'roll', from: 8 }, { op: 'hits', lane: 'kick', steps: [12] }], alt: [[{ op: 'roll', from: 12 }, { op: 'hits', lane: 'kick', steps: [12, 14] }]], partSections: ['verse'] }],
        swap4: [] }
    }
  };
})(window.GG);
