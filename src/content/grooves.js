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
        { id: 'dkrun', name: 'Double-kick run', pedal: true, desc: 'Both feet, every 16th. Your calves file a complaint.',
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
    coach: {
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
    }
  };
})(window.GG);
