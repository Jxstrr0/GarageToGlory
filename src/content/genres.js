// content/genres.js: what each genre wants from a drum pattern (the sequencer's Groove meter), the fixed
// patterns the sim builds songs from, and how the generated backing band plays along.
// Shape: GG.content.genres = { <genre>: {
//   name, tempo: [min, max, default], jamTempo: [lo, hi] (bands jam in this range),
//   groove: [ RULE ],  sync: max share of kick/snare hits on 16th off-beats before it feels jumpy,
//   signature: PATTERN (scores Groove >= 80 here, clearly lower elsewhere), starter: PATTERN (first Write),
//   parts: { verse: [BAR], chorus: [BAR], bridge: [BAR] }  (GG.songs.generate mixes these), BAR = [laneStr x 4],
//   backing: { root: midi, styles: [[bpmFrom, style, label]], progressions: { verse|chorus|bridge: [[semitones x 4 bars]] }, riffs,
//              keys: [lo, hi] (semitones around root: each song gets its own key, seeded by its id), mode, scale (lead notes),
//              roles: { verse|chorus|bridge: [role x 4 bars] } role = sparse | full | break (strip to the heavy parts) | solo,
//              vox: { hits: [[bar, step, voc, semis above the bar's chord, gang?]] (chorus only), drop: [voc, semis] | null,
//                     brk?: [[bar of the breakdown run, step, voc, semis above the tonic]] },
//              v0.7.2 (metal): tune { style: semitones } (tuning per tempo band), bassFloor (lowest bass midi), stabs, arps },
//   kit: { room, verb, level, six: 'ride'|'china', train (country rim/brush snare), kick, snare, hat, cymbal, toms, tomDec }
//        (v0.6.1 genre kit tuning, played by 30_audio; voc = hey | shout | growl | scream | yeah | yeehaw | ooh),
//   reactions: { great, good, meh, bad }  (one-word verdicts under the Groove meter) } }
// RULE = { f: feature, lo, hi, soft, w, tip, loDK? (lo when the double-kick pedal is owned), any?: [RULE] (best of) }
//   A feature inside [lo, hi] scores 1 and falls to 0 at `soft` beyond the range. Features (per bar, see 21_sim_songs):
//   kick, snare, time (hat + ride + cymbal hits), cym, kickDown (kick on 1 and 3, 0..1), backbeat (snare on 2 and 4),
//   snareOff (snares off 2/4), snareOdd (snares on 16th off-beats), snare8 / hat8 / hat16 (share of 8th / off-16th
//   steps with a hit; hat8 and hat16 count hat, ride and cymbal), hatBack (hat chick on 2 and 4), bpm.
// Only metal is playable before v0.9; all four ship now so tests prove each genre scores as designed.
(function (GG) {
  var E = '................';
  GG.content.genres = {
    metal: {
      name: 'Metal', tempo: [60, 240, 150], jamTempo: [80, 215], sync: 0.25,
      groove: [
        { f: 'kick', lo: 7, loDK: 11, hi: 16, soft: 5, w: 3, tip: 'Metal wants a busier kick. Try every 8th.' },
        { any: [{ f: 'backbeat', lo: 1, hi: 1, soft: 0.5 }, { f: 'snare8', lo: 0.75, hi: 1, soft: 0.3 }], w: 2,
          tip: 'Put the snare on 2 and 4, or go full blast.' },
        { f: 'time', lo: 6, hi: 24, soft: 4, w: 1.5, tip: 'Keep the hats or cymbals busy.' },
        { f: 'cym', lo: 1, hi: 8, soft: 2, w: 0.5, tip: 'A crash on the one gives it weight.' }
      ],
      signature: { bpm: 170, lanes: 4, arrangement: ['verse', 'chorus', 'verse', 'chorus', 'bridge', 'chorus'], sections: {
        verse: ['x.x.x.x.x.x.x.x.', '....x.......x...', 'xxxxxxxxxxxxxxxx', 'x.......x.......'],
        chorus: ['x.x.x.x.x.x.x.x.', '....x.......x...', E, 'x.x.x.x.x.x.x.x.'],
        bridge: ['x.x.x.x.x.x.x.x.', 'x.x.x.x.x.x.x.x.', 'x.x.x.x.x.x.x.x.', 'x...............'] } },
      // The first Write: a plain rock beat Marcel calls "a good start, for a polka". The tips teach the rest.
      starter: { bpm: 140, lanes: 4, arrangement: ['verse', 'chorus', 'verse', 'chorus', 'bridge', 'chorus'], sections: {
        verse: ['x...x...x...x...', '....x.......x...', 'x.x.x.x.x.x.x.x.', E],
        chorus: ['x...x...x...x...', '....x.......x...', 'x.x.x.x.x.x.x.x.', 'x...............'],
        bridge: ['x.......x.......', '........x.......', 'x...x...x...x...', E] } },
      parts: {
        verse: [
          ['x.x.x.x.x.x.x.x.', '....x.......x...', 'x.x.x.x.x.x.x.x.', E],
          ['x.x.x.x.x.x.x.x.', '....x.......x...', 'x...x...x...x...', 'x...............'],
          ['x.x.x...x.x.x...', '....x.......x...', 'x.x.x.x.x.x.x.x.', 'x...............'],
          ['x.x.x.x.x.x.x.x.', '..x...x...x...x.', 'x.x.x.x.x.x.x.x.', E],
          ['x.x.x.x.x.x.x.x.', '....x.......x...', 'xxxxxxxxxxxxxxxx', 'x.......x.......']
        ],
        chorus: [
          ['x.x.x.x.x.x.x.x.', '....x.......x...', E, 'x...x...x...x...'],
          ['x.x.x.x.x.x.x.x.', '..x...x...x...x.', E, 'x.x.x.x.x.x.x.x.'],
          ['x.x.x.x.x.x.x.x.', '....x.......x...', 'x.x.x.x.x.x.x.x.', 'x.......x.......'],
          ['x.x.x.x.x.x.x.x.', '....x.......x...', E, 'x.x.x.x.x.x.x.x.']
        ],
        bridge: [
          ['x..x..x...x..x..', '........x.......', E, 'x.......x.......'],
          ['x.x.x.x.x.x.x.x.', 'x.x.x.x.x.x.x.x.', 'x.x.x.x.x.x.x.x.', 'x...............'],
          ['x.......x.......', '........x.......', 'x.x.x.x.x.x.x.x.', 'x...............']
        ]
      },
      // Owner call: tempo decides. Slow = doom sludge, mid = palm-muted chugs locked to the kick, fast = tremolo riffs.
      // v0.7.2 "heavier" (owner): drop tuning (C2 = drop C; doom sinks a semitone toward drop B, tremolo rises one so
      // fast riffs stay tight), phrygian riffs with b2 / tritone accents and chromatic runs, breakdown drops, screams on
      // chorus downbeats and growls on the breakdowns. 30_audio plays metal through its own high-gain amp (two guitars).
      backing: {
        root: 36,   // C2: drop C
        tune: { doom: -1, chug: 0, tremolo: 1 },   // semitones per tempo band (keyFor(seed, genre, bpm))
        bassFloor: 23,   // B0, a five-string's low B: lower bass notes stay up with the guitars
        styles: [[0, 'doom', 'Doom sludge'], [100, 'chug', 'Palm-muted chugs'], [171, 'tremolo', 'Tremolo riffs']],
        progressions: {
          verse: [[0, 0, 1, 0], [0, 0, 6, 5], [0, 1, 0, 8], [0, 3, 1, 0], [0, 1, 0, 6]],
          chorus: [[0, 8, 5, 1], [8, 7, 5, 6], [0, 1, 8, 7], [3, 1, 0, 6], [10, 8, 6, 1]],
          bridge: [[1, 1, 0, 0], [6, 5, 6, 7], [0, 1, 3, 1], [8, 8, 7, 6]]
        },
        // Tremolo riffs: 8 pitches over the bar's chord, each tremolo-picked for an 8th (b2 pedals, tritones, chromatic
        // descents, a phrygian-dominant major third).
        riffs: [[0, 1, 0, 3, 0, 1, 0, 6], [0, 12, 11, 10, 9, 8, 7, 6], [0, 1, 4, 1, 0, 1, 6, 5], [0, 0, 3, 1, 0, 0, 6, 7], [7, 6, 5, 6, 0, 1, 0, 1]],
        stabs: [1, 6, 1, 3],        // chug accents / doom answers above the low string: b2, tritone, minor third
        arps: [[0, 3, 7, 12, 15, 12, 7, 3], [1, 5, 8, 13, 17, 13, 8, 5], [0, 3, 5, 8, 12, 8, 5, 3], [0, 3, 7, 10, 12, 10, 7, 3]],   // Dana's solos
        keys: [-2, 2], mode: 'phrygian', scale: [0, 1, 3, 5, 7, 8, 10],
        roles: { verse: ['sparse', 'sparse', 'sparse', 'sparse'], chorus: ['full', 'full', 'full', 'full'], bridge: ['break', 'break', 'solo', 'solo'] },
        // brk: [[bar of the breakdown run, step, voc, semis above the tonic]] (growls after the drop)
        vox: { hits: [[0, 0, 'scream', 24], [2, 0, 'scream', 24], [3, 8, 'scream', 19, true]], drop: ['growl', 12], brk: [[1, 8, 'growl', 7]] }
      },
      // Tight, clicky kick and a high, sharp snare: built for double-kick runs. China on lane 6.
      kit: { room: 'room', verb: 0.3, level: 1, six: 'china',
        kick: { f0: 190, f1: 55, glide: 0.04, dec: 0.26, body: 1, click: 0.75, clickHp: 3800, clickLen: 0.012 },
        snare: { f0: 290, f1: 220, body: 0.5, bodyDec: 0.08, noise: 0.75, hp: 2400, dec: 0.15 },
        hat: { hp: 8800, dec: 0.045, lv: 0.38 }, cymbal: { hp: 8500, f1: 5000, dec: 1.2, lv: 0.4 },
        toms: [260, 205, 160], tomDec: 0.3 },
      reactions: { great: 'Neck-snapping.', good: 'Heavy enough.', meh: 'Needs more heavy.', bad: 'That is a polka.' }
    },

    punk: {
      name: 'Punk', tempo: [150, 230, 190], jamTempo: [175, 215], sync: 0.2,
      groove: [
        { f: 'snare', lo: 4, hi: 8, soft: 3, w: 4, tip: 'Punk wants a fast, driving snare.' },
        { f: 'bpm', lo: 170, hi: 230, soft: 40, w: 3, tip: 'Faster. Punk lives above 170 BPM.' },
        { f: 'kick', lo: 3, hi: 6, soft: 3, w: 1, tip: 'Kick on the quarters keeps it moving.' },
        { f: 'hat8', lo: 0.75, hi: 1, soft: 0.5, w: 1, tip: 'Keep 8ths going on the hats.' },
        { f: 'hat16', lo: 0, hi: 0.25, soft: 0.5, w: 1, tip: 'Straight 8ths. Nobody has time for 16ths.' },
        { f: 'snareOdd', lo: 0, hi: 1, soft: 3, w: 1, tip: "That's a train, not a riot. Fewer 16th snares." }
      ],
      signature: { bpm: 200, lanes: 4, arrangement: ['verse', 'chorus', 'verse', 'chorus'], sections: {
        verse: ['x...x...x...x...', '..x...x...x...x.', 'x.x.x.x.x.x.x.x.', 'x...............'],
        chorus: ['x...x...x...x...', '..x.x.x...x.x.x.', 'x.x.x.x.x.x.x.x.', 'x.......x.......'],
        bridge: ['x...x...x...x...', '....x.......x...', 'x.x.x.x.x.x.x.x.', 'x...............'] } },
      starter: { bpm: 180, lanes: 4, arrangement: ['verse', 'chorus', 'verse', 'chorus'], sections: {
        verse: ['x.......x.......', '....x.......x...', 'x.x.x.x.x.x.x.x.', E],
        chorus: ['x.......x.......', '....x.......x...', 'x.x.x.x.x.x.x.x.', 'x...............'],
        bridge: ['x.......x.......', '....x.......x...', 'x...x...x...x...', E] } },
      parts: {
        verse: [
          ['x...x...x...x...', '..x...x...x...x.', 'x.x.x.x.x.x.x.x.', E],
          ['x...x...x...x...', '..x...x...x...x.', 'x...x...x...x...', 'x...............'],
          ['x.x...x.x.x...x.', '..x.x.x...x.x.x.', 'x.x.x.x.x.x.x.x.', E]
        ],
        chorus: [
          ['x...x...x...x...', '..x...x...x...x.', E, 'x.x.x.x.x.x.x.x.'],
          ['x...x...x...x...', '..x.x.x...x.x.x.', 'x.x.x.x.x.x.x.x.', 'x.......x.......']
        ],
        bridge: [
          ['x.......x.......', '....x.......x...', 'x.x.x.x.x.x.x.x.', E],
          ['x...x...x...x...', '....x.......x...', 'x.x.x.x.x.x.x.x.', 'x...............']
        ]
      },
      backing: { root: 45, styles: [[0, 'eighths', 'Downstroke 8ths']],
        progressions: { verse: [[0, 5, 7, 5], [0, 0, 5, 7], [0, 3, 5, 7]], chorus: [[5, 7, 0, 0], [3, 5, 7, 7], [7, 5, 0, 0]], bridge: [[5, 5, 7, 7], [3, 3, 5, 7]] },
        riffs: [[0, 0, 0, 0, 7, 7, 5, 5]], keys: [-5, 2], mode: 'major', scale: [0, 2, 4, 5, 7, 9, 11],
        roles: { verse: ['sparse', 'sparse', 'sparse', 'sparse'], chorus: ['full', 'full', 'full', 'full'], bridge: ['break', 'break', 'full', 'full'] },
        vox: { hits: [[1, 0, 'hey', 12, true], [3, 0, 'hey', 12, true], [3, 8, 'hey', 12, true]], drop: ['shout', 12] } },
      // Loose, trashy and bright: sloshy hats, a ringy snare, a china that sounds like a garbage-can lid.
      kit: { room: 'room', verb: 0.45, level: 1, six: 'china',
        kick: { f0: 150, f1: 48, glide: 0.08, dec: 0.36, body: 0.95, click: 0.35, clickHp: 2400 },
        snare: { f0: 215, f1: 165, body: 0.45, bodyDec: 0.12, noise: 0.9, hp: 1000, dec: 0.27 },
        hat: { hp: 6200, dec: 0.1, lv: 0.36 }, cymbal: { hp: 5200, f1: 3200, dec: 1.6, lv: 0.44 },
        toms: [215, 170, 130], tomDec: 0.36 },
      reactions: { great: 'Riot-grade.', good: 'Snotty enough.', meh: 'Too polite.', bad: 'Your mom likes this.' }
    },

    rock: {
      name: 'Rock', tempo: [90, 160, 120], jamTempo: [105, 140], sync: 0.3,
      groove: [
        { f: 'backbeat', lo: 1, hi: 1, soft: 0.5, w: 3, tip: 'Rock needs a solid backbeat: snare on 2 and 4.' },
        { f: 'kickDown', lo: 1, hi: 1, soft: 0.5, w: 2, tip: 'Kick on 1 and 3. Every time.' },
        { f: 'kick', lo: 2, hi: 5, soft: 3, w: 3, tip: 'Rock kick: less is more.' },
        { f: 'hat8', lo: 0.85, hi: 1, soft: 0.5, w: 3, tip: 'Rock wants steady 8th-note hats.' },
        { f: 'hat16', lo: 0, hi: 0.25, soft: 0.5, w: 1.5, tip: 'Straight 8ths on the hats, not 16ths.' },
        { f: 'snareOff', lo: 0, hi: 1, soft: 3, w: 2, tip: 'Too much snare clutter for rock.' },
        { f: 'bpm', lo: 100, hi: 150, soft: 30, w: 1, tip: 'Rock sits between 100 and 150 BPM.' }
      ],
      signature: { bpm: 120, lanes: 4, arrangement: ['verse', 'chorus', 'verse', 'chorus', 'bridge', 'chorus'], sections: {
        verse: ['x.......x.......', '....x.......x...', 'x.x.x.x.x.x.x.x.', 'x...............'],
        chorus: ['x.......x.x.....', '....x.......x...', E, 'x.x.x.x.x.x.x.x.'],
        bridge: ['x.......x.......', '....x.......x...', 'x.x.x.x.x.x.x.x.', E] } },
      starter: { bpm: 110, lanes: 4, arrangement: ['verse', 'chorus', 'verse', 'chorus', 'bridge', 'chorus'], sections: {
        verse: ['x.......x.......', '....x.......x...', 'x...x...x...x...', E],
        chorus: ['x.......x.......', '....x.......x...', 'x...x...x...x...', 'x...............'],
        bridge: ['x.......x.......', '....x.......x...', 'x...x...x...x...', E] } },
      parts: {
        verse: [
          ['x.......x.......', '....x.......x...', 'x.x.x.x.x.x.x.x.', E],
          ['x.......x.x.....', '....x.......x...', 'x.x.x.x.x.x.x.x.', 'x...............'],
          ['x.....x.x.......', '....x.......x...', 'x.x.x.x.x.x.x.x.', E]
        ],
        chorus: [
          ['x.......x.......', '....x.......x...', E, 'x.x.x.x.x.x.x.x.'],
          ['x.....x.x.......', '....x.......x...', 'x.x.x.x.x.x.x.x.', 'x...............']
        ],
        bridge: [
          ['x.......x.......', '....x.......x...', 'x...x...x...x...', 'x...............'],
          ['x...x...x...x...', '....x.......x...', 'x.x.x.x.x.x.x.x.', E]
        ]
      },
      backing: { root: 45, styles: [[0, 'rock', 'Big open chords']],
        progressions: { verse: [[0, 0, 5, 7], [0, 10, 5, 0], [0, 7, 5, 5]], chorus: [[5, 7, 0, 0], [0, 5, 7, 5], [10, 5, 0, 7]], bridge: [[3, 5, 7, 7], [9, 7, 5, 7]] },
        riffs: [[0, 0, 7, 0, 10, 0, 7, 5]], keys: [-5, 2], mode: 'major', scale: [0, 3, 5, 6, 7, 10],
        roles: { verse: ['sparse', 'sparse', 'sparse', 'sparse'], chorus: ['full', 'full', 'full', 'full'], bridge: ['break', 'break', 'solo', 'solo'] },
        vox: { hits: [[0, 0, 'yeah', 12], [2, 0, 'yeah', 19]], drop: null } },
      // Big, roomy kick and snare with lots of reverb (the strip-mall unit is all concrete). Ride bell on lane 6.
      kit: { room: 'hall', verb: 0.8, level: 1, six: 'ride',
        kick: { f0: 135, f1: 44, glide: 0.1, dec: 0.55, body: 1, click: 0.22, clickHp: 2000 },
        snare: { f0: 195, f1: 150, body: 0.6, bodyDec: 0.16, noise: 0.7, hp: 1200, dec: 0.32 },
        hat: { hp: 7400, dec: 0.06, lv: 0.38 }, cymbal: { hp: 7800, f1: 4200, dec: 1.9, lv: 0.42 },
        toms: [190, 145, 105], tomDec: 0.45 },
      reactions: { great: 'Stadium-sized.', good: 'Solid.', meh: 'A bit wobbly.', bad: 'Where is the backbeat?' }
    },

    country: {
      name: 'Country', tempo: [70, 130, 100], jamTempo: [85, 115], sync: 0.6,
      groove: [
        { f: 'snare', lo: 12, hi: 16, soft: 6, w: 5, tip: 'Country wants the train beat: snare on every 16th.' },
        { f: 'kickDown', lo: 1, hi: 1, soft: 0.5, w: 2, tip: 'Kick on 1 and 3 keeps the train rolling.' },
        { f: 'kick', lo: 2, hi: 4, soft: 3, w: 1.5, tip: 'Country kick stays simple.' },
        { f: 'hatBack', lo: 1, hi: 1, soft: 1, w: 1, tip: 'Accent 2 and 4 with a hat chick.' },
        { f: 'cym', lo: 0, hi: 1, soft: 2, w: 1, tip: 'Easy on the crashes, partner.' },
        { f: 'bpm', lo: 80, hi: 120, soft: 30, w: 1.5, tip: 'Country rolls between 80 and 120 BPM.' }
      ],
      signature: { bpm: 100, lanes: 4, arrangement: ['verse', 'chorus', 'verse', 'chorus', 'bridge', 'chorus'], sections: {
        verse: ['x.......x.......', 'xxxxxxxxxxxxxxxx', '....x.......x...', E],
        chorus: ['x...x...x...x...', 'xxxxxxxxxxxxxxxx', '....x.......x...', 'x...............'],
        bridge: ['x.......x.......', 'x.xxx.xxx.xxx.xx', '....x.......x...', E] } },
      starter: { bpm: 95, lanes: 4, arrangement: ['verse', 'chorus', 'verse', 'chorus', 'bridge', 'chorus'], sections: {
        verse: ['x.......x.......', '....x.......x...', 'x.x.x.x.x.x.x.x.', E],
        chorus: ['x.......x.......', '....x.......x...', 'x.x.x.x.x.x.x.x.', 'x...............'],
        bridge: ['x.......x.......', '....x.......x...', 'x...x...x...x...', E] } },
      parts: {
        verse: [
          ['x.......x.......', 'xxxxxxxxxxxxxxxx', '....x.......x...', E],
          ['x.......x.......', '.xxx.xxx.xxx.xxx', '....x.......x...', E],
          ['x...x...x...x...', 'xxxxxxxxxxxxxxxx', '....x.......x...', E]
        ],
        chorus: [
          ['x.......x.......', 'xxxxxxxxxxxxxxxx', '....x.......x...', 'x...............'],
          ['x...x...x...x...', 'xxxxxxxxxxxxxxxx', E, 'x...............']
        ],
        bridge: [
          ['x.......x.......', 'x.xxx.xxx.xxx.xx', '....x.......x...', E],
          ['x.......x.......', '....x.......x...', 'x.x.x.x.x.x.x.x.', E]
        ]
      },
      backing: { root: 43, styles: [[0, 'boomchick', 'Boom-chick']],
        progressions: { verse: [[0, 0, 5, 7], [0, 5, 0, 7], [0, 7, 5, 0]], chorus: [[5, 0, 7, 0], [5, 5, 0, 7], [0, 5, 7, 7]], bridge: [[9, 5, 7, 7], [2, 7, 0, 0]] },
        riffs: [[0, 0, 7, 0, 5, 0, 7, 0]], keys: [-3, 4], mode: 'major', scale: [0, 2, 4, 7, 9],
        roles: { verse: ['sparse', 'sparse', 'sparse', 'sparse'], chorus: ['full', 'full', 'full', 'full'], bridge: ['sparse', 'sparse', 'solo', 'solo'] },
        vox: { hits: [[0, 0, 'yeehaw', 19], [2, 0, 'ooh', 16]], drop: null } },
      // Soft and dry: rim clicks on the train beat's backbeats, brushes on the rest (settings.brushes, default on).
      kit: { room: 'dry', verb: 0.2, level: 0.8, six: 'ride', train: true,
        kick: { f0: 115, f1: 52, glide: 0.08, dec: 0.28, body: 0.8, click: 0.06, clickHp: 1800 },
        snare: { f0: 200, f1: 170, body: 0.35, bodyDec: 0.08, noise: 0.45, hp: 1800, dec: 0.16 },
        hat: { hp: 7200, dec: 0.04, lv: 0.28 }, cymbal: { hp: 7600, f1: 4800, dec: 1.0, lv: 0.3 },
        toms: [175, 145, 118], tomDec: 0.3 },
      reactions: { great: 'Boot-scootin’.', good: 'Two-steppable.', meh: 'Lost the train.', bad: 'Derailed.' }
    }
  };
})(window.GG);
