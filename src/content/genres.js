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
//              v0.7.2 (metal): tune { style: semitones } (tuning per tempo band), bassFloor (lowest bass midi), stabs, arps,
//              v0.9: amp (punk/rock: gain, level, pan, preHp, mid/presence [Hz, Q, dB], lp, detune, lag, ring; country: the
//                    Tele's gain, bright, slap, slapFb, slapLv, slapPan), fiddle { body, bow, vib, pan }, acoustic { body,
//                    sparkle, spread, level }, twoChords (punk), vox += resp, held, count, whoa (see the punk entry),
//              v1.1 "Seats" (Lane D; the songwriter's "Your part", plan_contract_1.1 §4.4): progNames { verse|chorus|bridge:
//                    [plain-words name per progressions entry, same order] } (bass + rhythm pick a progression by these),
//                    hooks { verse|chorus|bridge: [HOOK] } (the lead picks one; PART.sections[s].hook indexes it),
//                    HOOK = { name (plain words), deg: [5 scale degrees, low -> high: the five rows of the lead grid; indexes
//                    into backing.scale, wrapping an octave up past its end], rows: [5 x 16-char 'x'/'.'] (the hook's own
//                    melody, row 0 = the lowest degree; a starting point for songs.part.suggest) },
//              v1.3 "Songwriter" (plan_contract_1.3 §4.3, the Mood slider): moods [5 x { id, mode, scale (length ==
//                    backing.scale), third, seventh (semitones the bass 3rd / 7th rows and the hard-coded thirds play),
//                    remap?: { <semi>: semi } (progression chords per rung) }] bright -> dark, and moodNative (the rung equal
//                    to today's mode / scale: the 1.2 sound). scale / third / seventh are the stage-0 contract (Lane S tunes
//                    id names and remap only). },
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
        // v1.2 "Soundcheck" (Lane F, handoff F4): the band's feel. slop scales every player's timing spread; push = the mean
        // offset per part in ms (+ = laid back), scaled by (1 - 0.5 t). Metal locks in (only the singer leans back).
        feel: { slop: 0.6, push: { kick: 0, snare: 0, hat: 0, bass: 0, gtr: 0, vox: 4 } },
        tune: { doom: -1, chug: 0, tremolo: 1 },   // semitones per tempo band (keyFor(seed, genre, bpm))
        bassFloor: 23,   // B0, a five-string's low B: lower bass notes stay up with the guitars
        styles: [[0, 'doom', 'Doom sludge'], [100, 'chug', 'Palm-muted chugs'], [171, 'tremolo', 'Tremolo riffs']],
        progressions: {
          verse: [[0, 0, 1, 0], [0, 0, 6, 5], [0, 1, 0, 8], [0, 3, 1, 0], [0, 1, 0, 6]],
          chorus: [[0, 8, 5, 1], [8, 7, 5, 6], [0, 1, 8, 7], [3, 1, 0, 6], [10, 8, 6, 1]],
          bridge: [[1, 1, 0, 0], [6, 5, 6, 7], [0, 1, 3, 1], [8, 8, 7, 6]]
        },
        // v1.1 "Your part": the progressions in plain words (bass, rhythm) and the lead's hooks (phrygian degrees)
        progNames: {
          verse: ['one chord, one grudge', 'the tritone drop', 'up the cellar stairs', 'minor third, major grudge', "the devil's interval, twice"],
          chorus: ['the big dark lift', 'falling off the grain elevator', 'the storm rolls in', 'back down to the cellar', 'the long way down'],
          bridge: ['the half-step lurch', 'pacing the tritone', 'the crawl', 'sinking slowly']
        },
        hooks: {
          verse: [
            { name: 'dark and slow', deg: [0, 1, 2, 4, 5], rows: ['x.......x.......', '......x.........', '............x...', '..............x.', E] },
            { name: 'the creeping half-step', deg: [0, 1, 3, 4, 5], rows: ['x...x...........', '..x...x.........', '........x.......', '..........x.x...', '..............x.'] },
            { name: 'a cold wind off the slough', deg: [2, 4, 5, 7, 8], rows: ['x...........x...', '....x...........', '........x.......', '..........x.....', '..............x.'] }
          ],
          chorus: [
            { name: 'the big chorus lift', deg: [4, 5, 7, 8, 9], rows: ['x...............', '....x...........', '........x.......', '..........x.....', '............x...'] },
            { name: 'screaming into the hail', deg: [7, 8, 9, 11, 12], rows: ['x.......x.......', '..x.......x.....', '....x.......x...', '......x.........', '..............x.'] },
            { name: 'the grain-elevator drop', deg: [3, 4, 5, 6, 7], rows: ['........x.......', '......x.........', '....x...........', '..x.............', 'x...............'] }
          ],
          bridge: [
            { name: 'down into the cellar', deg: [0, 1, 2, 3, 4], rows: ['............x...', '.........x......', '......x.........', '...x............', 'x...............'] },
            { name: 'pacing the tritone', deg: [0, 3, 4, 5, 8], rows: ['x.......x.......', '...x.......x....', '......x.......x.', E, E] },
            { name: 'the long winter', deg: [0, 2, 4, 5, 7], rows: ['x...............', '....x...........', '........x.......', '............x...', E] }
          ]
        },
        // Tremolo riffs: 8 pitches over the bar's chord, each tremolo-picked for an 8th (b2 pedals, tritones, chromatic
        // descents, a phrygian-dominant major third).
        riffs: [[0, 1, 0, 3, 0, 1, 0, 6], [0, 12, 11, 10, 9, 8, 7, 6], [0, 1, 4, 1, 0, 1, 6, 5], [0, 0, 3, 1, 0, 0, 6, 7], [7, 6, 5, 6, 0, 1, 0, 1]],
        stabs: [1, 6, 1, 3],        // chug accents / doom answers above the low string: b2, tritone, minor third
        arps: [[0, 3, 7, 12, 15, 12, 7, 3], [1, 5, 8, 13, 17, 13, 8, 5], [0, 3, 5, 8, 12, 8, 5, 3], [0, 3, 7, 10, 12, 10, 7, 3]],   // Dana's solos
        keys: [-2, 2], mode: 'phrygian', scale: [0, 1, 3, 5, 7, 8, 10],
        moods: [{ id: 'heroic', mode: 'major', scale: [0, 2, 4, 5, 7, 9, 11], third: 4, seventh: 11 },
          { id: 'minor', mode: 'minor', scale: [0, 2, 3, 5, 7, 8, 10], third: 3, seventh: 10 },
          { id: 'phrygian', mode: 'phrygian', scale: [0, 1, 3, 5, 7, 8, 10], third: 3, seventh: 10 },
          { id: 'sinister', mode: 'phrygian dominant', scale: [0, 1, 4, 5, 7, 8, 10], third: 4, seventh: 10 },
          { id: 'abyss', mode: 'locrian', scale: [0, 1, 3, 5, 6, 8, 10], third: 3, seventh: 10 }], moodNative: 2,   // v1.3 Mood
        roles: { verse: ['sparse', 'sparse', 'sparse', 'sparse'], chorus: ['full', 'full', 'full', 'full'], bridge: ['break', 'break', 'solo', 'solo'] },
        // brk: [[bar of the breakdown run, step, voc, semis above the tonic]] (growls after the drop)
        // v0.9 vocal diversity: 'scream' / 'growl' here are slots; each song (seeded by its id) and each chorus / breakdown
        // picks its own scream type from GG.content.voices.types (shriek, mid scream, squeal, gang; growl, guttural, fry).
        vox: { hits: [[0, 0, 'scream', 24], [2, 0, 'scream', 24], [3, 8, 'scream', 19, true]], drop: ['growl', 12], brk: [[1, 8, 'growl', 7]],
          resp: [[1, 8, 'gang', 19]], held: [3, 8, 'held', 19, 8], count: ['shout', 12], whoa: [] }
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
          ['x.x...x.x.x...x.', '..x.x.x...x.x.x.', 'x.x.x.x.x.x.x.x.', E],
          // v0.9 (fixer): metal-sized library (5/4/3) so jammed punk songs don't read as recycled. A skank on the crash,
          // a d-beat-ish push on the crash; a busier skank chorus; the snare-on-every-8th thrash chorus with offbeat hats.
          ['x.x.....x.x.....', '....x.x.....x.x.', E, 'x.x.x.x.x.x.x.x.'],
          ['x.....x.x.....x.', '..x.x.....x.x...', E, 'x.x.x.x.x.x.x.x.']
        ],
        chorus: [
          ['x...x...x...x...', '..x...x...x...x.', E, 'x.x.x.x.x.x.x.x.'],
          ['x...x...x...x...', '..x.x.x...x.x.x.', 'x.x.x.x.x.x.x.x.', 'x.......x.......'],
          ['x.x...x.x.x...x.', '....x.x.....x.x.', E, 'x.x.x.x.x.x.x.x.'],
          ['x...x...x...x...', 'x.x.x.x.x.x.x.x.', '..x...x...x...x.', 'x...x...x...x...']
        ],
        bridge: [
          ['x.......x.......', '....x.......x...', 'x.x.x.x.x.x.x.x.', E],
          ['x...x...x...x...', '....x.......x...', 'x.x.x.x.x.x.x.x.', 'x...............'],
          ['x...x...x...x...', 'x.x.x.x.x.x.x.x.', 'x.x.x.x.x.x.x.x.', 'x...............']   // the snare-8ths break
        ]
      },
      // v0.9: tempo decides (downstrokes, a skate-punk gallop, hardcore thrash with a half-time mosh chorus); Benny's
      // two-chord "solo" takes the bridge; crunchy L/R double-tracked amps (amp), mid-forward, far less gain than metal.
      backing: { root: 45, styles: [[0, 'eighths', 'Downstroke 8ths'], [200, 'skate', 'Skate-punk gallop'], [220, 'hardcore', 'Hardcore thrash']],
        feel: { slop: 1.1, push: { kick: -3, snare: -5, hat: -4, bass: -3, gtr: -4, vox: -2 } },   // v1.2 (F4): punk rushes
        progressions: { verse: [[0, 5, 7, 5], [0, 0, 5, 7], [0, 3, 5, 7]], chorus: [[5, 7, 0, 0], [3, 5, 7, 7], [7, 5, 0, 0]], bridge: [[5, 5, 7, 7], [3, 3, 5, 7]] },
        progNames: { verse: ['three chords and a grudge', 'two on the one, then go', 'up the stairs, out the door'],
          chorus: ['the shout-along', 'climb and hang on', 'back home, hard'], bridge: ['stomp, stomp, go', 'the slow build'] },
        hooks: {
          verse: [
            { name: 'three notes and a grudge', deg: [0, 2, 4, 5, 7], rows: ['x.x.....x.x.....', '....x.......x...', '......x.......x.', E, E] },
            { name: 'the snotty little one', deg: [2, 3, 4, 5, 7], rows: ['x.......x.......', '..x.......x.....', '....x.......x...', '......x.........', '..............x.'] },
            { name: 'the laundromat lullaby', deg: [0, 1, 2, 4, 5], rows: ['x...x...........', '..x.............', '......x...x.....', '........x.......', '............x...'] }
          ],
          chorus: [
            { name: 'the shout-along', deg: [4, 5, 7, 8, 9], rows: ['x...x...x...x...', '..x.......x.....', '......x.......x.', E, E] },
            { name: 'the pogo ladder', deg: [0, 2, 4, 7, 9], rows: ['x...............', '..x.............', '....x...........', '......x.........', '........x.x.x.x.'] },
            { name: 'up yours, gravity', deg: [4, 5, 6, 7, 9], rows: ['x.......x.......', '..x.............', '....x...........', '......x.....x...', '..........x...x.'] }
          ],
          bridge: [
            { name: 'the slow build', deg: [0, 1, 2, 3, 4], rows: ['x...............', '....x...........', '........x.......', '............x...', '..............x.'] },
            { name: 'one more time, louder', deg: [3, 4, 5, 6, 7], rows: ['x.x.x.x.........', '........x.x.....', '............x...', '..............x.', E] }
          ]
        },
        riffs: [[0, 0, 0, 0, 7, 7, 5, 5]], keys: [-5, 2], mode: 'major', scale: [0, 2, 4, 5, 7, 9, 11],
        moods: [{ id: 'sunny', mode: 'lydian', scale: [0, 2, 4, 6, 7, 9, 11], third: 4, seventh: 11 },
          { id: 'major', mode: 'major', scale: [0, 2, 4, 5, 7, 9, 11], third: 4, seventh: 10 },
          { id: 'gritty', mode: 'mixolydian', scale: [0, 2, 4, 5, 7, 9, 10], third: 4, seventh: 10 },
          { id: 'bitter', mode: 'dorian', scale: [0, 2, 3, 5, 7, 9, 10], third: 3, seventh: 10 },
          { id: 'gloomy', mode: 'minor', scale: [0, 2, 3, 5, 7, 8, 10], third: 3, seventh: 10 }], moodNative: 1,   // v1.3 Mood
        roles: { verse: ['sparse', 'sparse', 'sparse', 'sparse'], chorus: ['full', 'full', 'full', 'full'], bridge: ['break', 'break', 'solo', 'solo'] },
        twoChords: [0, 5],   // Benny's entire vocabulary, relative to the bar's chord (I and IV)
        amp: { gain: 9, level: 0.085, pan: 0.62, preHp: 120, mid: [1100, 0.9, 5], presence: [3000, 1.1, 2], lp: 5200, detune: 6, lag: 0.009 },
        // hits: the singer's calls; resp: the band's gang answer (the crowd joins in when it's hot); held: the yell that
        // closes a chorus; count: the first downbeat of a song. whoa: [[bar, step, steps]] backing whoa-ohs (+ a harmony).
        vox: { hits: [[1, 0, 'hey', 12, true], [3, 0, 'hey', 12, true], [3, 8, 'hey', 12, true]], drop: ['shout', 12],
          resp: [[0, 8, 'hey', 12], [2, 8, 'hey', 12]], held: [3, 8, 'yell', 12, 8], count: ['shout', 12], whoa: [] } },
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
          ['x.....x.x.......', '....x.......x...', 'x.x.x.x.x.x.x.x.', E],
          // v0.9 (fixer): 5/4/3 like metal. Ride-cymbal rock; quarter hats with the bell on the offbeats; a push chorus
          // (quarter hats, crash + offbeat bell); four-on-the-floor with the hats on the "and"; a ride-pattern bridge.
          ['x.....x.x.......', '....x.......x...', E, 'x.x.x.x.x.x.x.x.'],
          ['x.......x...x...', '....x.......x...', 'x...x...x...x...', '..x...x...x...x.']
        ],
        chorus: [
          ['x.......x.......', '....x.......x...', E, 'x.x.x.x.x.x.x.x.'],
          ['x.....x.x.......', '....x.......x...', 'x.x.x.x.x.x.x.x.', 'x...............'],
          ['x.x.....x.x.....', '....x.......x...', 'x...x...x...x...', 'x.x...x...x...x.'],
          ['x...x...x...x...', '....x.......x...', '..x...x...x...x.', 'x...x...x...x...']
        ],
        bridge: [
          ['x.......x.......', '....x.......x...', 'x...x...x...x...', 'x...............'],
          ['x...x...x...x...', '....x.......x...', 'x.x.x.x.x.x.x.x.', E],
          ['x.x.....x.x.....', '....x.......x...', E, 'x.x.x.x.x.x.x.x.']
        ]
      },
      // v0.9: a power ballad under 90 BPM (also the Chartbusters' forced style 'ballad': every single they have), big open
      // chords, driving 8ths from 140. Crunch amps double-tracked L/R; the open chords ring (amp.ring) over the chorus.
      backing: { root: 45, styles: [[0, 'ballad', 'Power ballad'], [90, 'rock', 'Big open chords'], [140, 'drive', 'Driving 8ths']],
        feel: { slop: 1.0, push: { kick: 0, snare: 7, hat: 2, bass: 4, gtr: 2, vox: 6 } },   // v1.2 (F4): rock lays back (the snare most)
        progressions: { verse: [[0, 0, 5, 7], [0, 10, 5, 0], [0, 7, 5, 5]], chorus: [[5, 7, 0, 0], [0, 5, 7, 5], [10, 5, 0, 7]], bridge: [[3, 5, 7, 7], [9, 7, 5, 7]] },
        progNames: { verse: ['the highway', 'the flat-seven swagger', 'down from the top'],
          chorus: ['the big chorus lift', 'fist in the air', 'the long way home'], bridge: ['the minor turn', 'the sad-guy detour'] },
        hooks: {   // (blues scale degrees)
          verse: [
            { name: 'the strut', deg: [0, 1, 2, 4, 5], rows: ['x.....x.........', '..x.............', '....x...........', '........x.......', '..........x.x...'] },
            { name: 'parking-lot swagger', deg: [0, 1, 2, 3, 4], rows: ['x...........x...', '...x............', '......x.........', '........x.......', '..........x.....'] },
            { name: 'the strip-mall shuffle', deg: [4, 5, 6, 7, 8], rows: ['x.......x.......', '...x.......x....', '......x.......x.', E, E] }
          ],
          chorus: [
            { name: 'the big chorus lift', deg: [4, 5, 6, 7, 8], rows: ['x...............', '....x...........', '........x.......', '..........x.....', '............x...'] },
            { name: 'fist in the air', deg: [6, 7, 8, 9, 10], rows: ['x.......x.......', '..x.......x.....', '....x.......x...', '......x.........', '..............x.'] },
            { name: 'the encore wail', deg: [5, 6, 7, 8, 10], rows: ['........x.......', '......x.........', '....x...........', '..x.............', 'x...............'] }
          ],
          bridge: [
            { name: 'the sad-guy detour', deg: [0, 1, 2, 3, 4], rows: ['............x...', '........x.......', '......x.........', '...x............', 'x...............'] },
            { name: 'leather pants, slowly', deg: [1, 2, 4, 5, 6], rows: ['x...............', '....x...........', '........x.......', '..........x.....', '..............x.'] }
          ]
        },
        riffs: [[0, 0, 7, 0, 10, 0, 7, 5]], keys: [-5, 2], mode: 'major', scale: [0, 3, 5, 6, 7, 10],
        moods: [{ id: 'sunny', mode: 'major', scale: [0, 2, 4, 5, 7, 9], third: 4, seventh: 11 },
          { id: 'bright', mode: 'major blues', scale: [0, 2, 3, 4, 7, 9], third: 4, seventh: 10 },
          { id: 'bluesy', mode: 'major', scale: [0, 3, 5, 6, 7, 10], third: 4, seventh: 10 },
          { id: 'moody', mode: 'minor', scale: [0, 2, 3, 5, 7, 10], third: 3, seventh: 10 },
          { id: 'dark', mode: 'phrygian', scale: [0, 1, 3, 5, 7, 8], third: 3, seventh: 10 }], moodNative: 2,   // v1.3 Mood
        roles: { verse: ['sparse', 'sparse', 'sparse', 'sparse'], chorus: ['full', 'full', 'full', 'full'], bridge: ['break', 'break', 'solo', 'solo'] },
        amp: { gain: 5.5, level: 0.09, pan: 0.45, preHp: 90, mid: [800, 0.8, 3], presence: [2800, 1, 3], lp: 6000, detune: 4, lag: 0.012, ring: 0.2 },
        vox: { hits: [[0, 0, 'yeah', 12], [2, 0, 'yeah', 19]], drop: null,
          resp: [[1, 8, 'hey', 12]], held: [3, 8, 'wail', 19, 8], count: ['shout', 12], whoa: [[1, 0, 6], [3, 0, 6]] } },
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
          ['x...x...x...x...', 'xxxxxxxxxxxxxxxx', '....x.......x...', E],
          // v0.9 (fixer): 5/4/3 like metal. Train-beat snares with the rests moved around (each one its own shuffle), a
          // pushed kick, the hats on 8ths or quarters: so a jammed country song isn't the same three bars every time.
          ['x.....x.x.......', 'xx.xxx.xxx.xxx.x', '....x.......x...', E],
          ['x.......x.....x.', 'xxx.xxx.xxx.xxx.', 'x.x.x.x.x.x.x.x.', E]
        ],
        chorus: [
          ['x.......x.......', 'xxxxxxxxxxxxxxxx', '....x.......x...', 'x...............'],
          ['x...x...x...x...', 'xxxxxxxxxxxxxxxx', E, 'x...............'],
          ['x.......x.x.....', 'x.xxx.xxx.xxx.xx', 'x.x.x.x.x.x.x.x.', 'x...............'],
          ['x.....x.x.......', 'xx.xxx.xxx.xxx.x', 'x...x...x...x...', 'x...............']
        ],
        bridge: [
          ['x.......x.......', 'x.xxx.xxx.xxx.xx', '....x.......x...', E],
          ['x.......x.......', '....x.......x...', 'x.x.x.x.x.x.x.x.', E],
          ['x...x...x...x...', 'xxx.xxx.xxx.xxx.', 'x.x.x.x.x.x.x.x.', 'x...............']
        ]
      },
      // v0.9: the two-step (boom-chick) and, from 108 BPM, the train beat (a walking bass, chicka strums). Earl takes the
      // solo on a clean Tele with slapback (amp); Clementine's fiddle takes the fills and the outro (fiddle: body
      // formants [Hz, Q, level] + bow noise); Travis strums a fuller acoustic (acoustic: body, sparkle, stereo spread).
      backing: { root: 43, styles: [[0, 'twostep', 'Two-step'], [108, 'train', 'Train beat']],
        feel: { slop: 0.9, push: { kick: 0, snare: 4, hat: 2, bass: 2, gtr: 3, vox: 5 } },   // v1.2 (F4): country sits a hair behind
        progressions: { verse: [[0, 0, 5, 7], [0, 5, 0, 7], [0, 7, 5, 0]], chorus: [[5, 0, 7, 0], [5, 5, 0, 7], [0, 5, 7, 7]], bridge: [[9, 5, 7, 7], [2, 7, 0, 0]] },
        progNames: { verse: ['home on the grid road', 'back and forth to town', 'the long driveway'],
          chorus: ['the big sing-along', 'leaning on the fence', 'the truck-commercial lift'], bridge: ['the sad-letter turn', 'the hay-bale shuffle'] },
        hooks: {   // (pentatonic degrees)
          verse: [
            { name: 'down the grid road', deg: [0, 1, 2, 3, 4], rows: ['x.......x.......', '..x.............', '....x.......x...', '......x.........', '..............x.'] },
            { name: 'the porch swing', deg: [2, 3, 4, 5, 6], rows: ['x...........x...', '..x.............', '....x...x.......', '......x.........', '..........x.....'] },
            { name: 'the long driveway', deg: [0, 2, 3, 4, 5], rows: ['x...............', '....x...........', '........x.......', '..........x.....', '............x...'] }
          ],
          chorus: [
            { name: 'the big sing-along', deg: [3, 4, 5, 6, 7], rows: ['x.......x.......', '..x.......x.....', '....x.......x...', '......x.........', '..............x.'] },
            { name: 'the yee-haw climb', deg: [5, 6, 7, 8, 10], rows: ['x...............', '..x.............', '....x...........', '......x.........', '........x.x.x...'] },
            { name: 'Sunday at the Legion', deg: [2, 3, 4, 5, 7], rows: ['............x...', '........x.......', '....x...........', '..x.............', 'x...............'] }
          ],
          bridge: [
            { name: 'the sad letter', deg: [0, 1, 2, 3, 4], rows: ['..............x.', '..........x.....', '......x.........', '...x............', 'x...............'] },
            { name: 'the hay-bale shuffle', deg: [3, 4, 5, 6, 7], rows: ['x...x...x...x...', '..x.......x.....', '......x.......x.', E, E] }
          ]
        },
        riffs: [[0, 0, 7, 0, 5, 0, 7, 0]], keys: [-3, 4], mode: 'major', scale: [0, 2, 4, 7, 9],
        moods: [{ id: 'sweet', mode: 'major', scale: [0, 2, 4, 7, 9], third: 4, seventh: 11 },
          { id: 'major', mode: 'major', scale: [0, 2, 4, 7, 9], third: 4, seventh: 10 },
          { id: 'dusty', mode: 'mixolydian', scale: [0, 2, 4, 7, 10], third: 4, seventh: 10 },
          { id: 'lonesome', mode: 'minor', scale: [0, 3, 5, 7, 10], third: 3, seventh: 10 },
          { id: 'heartbreak', mode: 'minor', scale: [0, 2, 3, 7, 8], third: 3, seventh: 10 }], moodNative: 1,   // v1.3 Mood
        roles: { verse: ['sparse', 'sparse', 'sparse', 'sparse'], chorus: ['full', 'full', 'full', 'full'], bridge: ['sparse', 'sparse', 'solo', 'solo'] },
        amp: { gain: 1.6, level: 0.2, pan: 0.3, bright: [2800, 1.2, 6], lp: 7000, slap: 0.11, slapFb: 0.18, slapLv: 0.5, slapPan: -0.35 },
        fiddle: { body: [[290, 4, 1.3], [520, 3.5, 1], [1150, 3, 0.8], [2700, 2.5, 0.55]], bow: 0.22, vib: [5.6, 0.009], pan: -0.35 },
        acoustic: { body: [110, 1.2, 6], sparkle: [3600, 0.8, 4], spread: 0.35, level: 0.42 },
        vox: { hits: [[0, 0, 'yeehaw', 19], [2, 0, 'ooh', 16]], drop: null,
          resp: [[1, 8, 'yeah', 12]], held: [3, 8, 'holler', 16, 8], count: ['yeehaw', 19], whoa: [[1, 0, 6], [3, 0, 6]] } },
      // Soft and dry: rim clicks on the train beat's backbeats, brushes on the rest (settings.brushes, default on).
      kit: { room: 'dry', verb: 0.2, level: 0.8, six: 'ride', train: true,
        kick: { f0: 115, f1: 52, glide: 0.08, dec: 0.28, body: 0.8, click: 0.06, clickHp: 1800 },
        snare: { f0: 200, f1: 170, body: 0.35, bodyDec: 0.08, noise: 0.45, hp: 1800, dec: 0.16 },
        hat: { hp: 7200, dec: 0.04, lv: 0.28 }, cymbal: { hp: 7600, f1: 4800, dec: 1.0, lv: 0.3 },
        toms: [175, 145, 118], tomDec: 0.3 },
      reactions: { great: 'Boot-scootin’.', good: 'Two-steppable.', meh: 'Lost the train.', bad: 'Derailed.' }
    }
  };

  // v0.9 vocal diversity (owner popup 2026-09-30): who sings how, and what they shout. Played by 30_audio on the beat grid,
  // in the song's key, under the voice caps. Nothing here is free-running: the timeline places every hit.
  //   types[genre]: { chorus: [scream slot types], brk: [breakdown types], held: [section-end types] } (metal only; the
  //     other genres keep their content voc and vary the words). A song picks its own pair (seeded by its id), and each
  //     chorus entry / breakdown alternates between them, weighted by the singer's `screams`.
  //   words[genre]: shouted words, count[genre]: count-in yells; a singer's own `words` come in at `wordChance`.
  //   lex: word -> phonemes (vowels a e i o u ae oe ue; consonants h p t k b d g s z f v n m l r w y).
  //   defaults[genre] / profiles[memberId] / rivals[rivalId]: a voice profile. pitch (semitones, then back into the key),
  //     range [lo, hi] midi (octave-folded into it), formant (vowel-space scale: < 1 bigger throat), vowels (swaps: the
  //     French ones), rasp 0..1 (grit + pitch jitter), drive (extra distortion), vib [rate Hz, depth], twang (dB of nasal
  //     'ng' ring near 2 kHz; vib [r, 0] = dead flat, no vibrato at all), breath 0..1, scoop (semitones up into the note),
  //     yodel (false: no yodel flip on the yodel types, yeehaw/holler; true/absent: the flip), screams { type: weight }, pan.
  GG.content.voices = {
    types: {
      metal: { chorus: ['scream', 'shriek', 'squeal', 'gang'], brk: ['growl', 'guttural', 'fry'], held: ['held', 'shriekHeld'] }
    },
    words: {
      metal: ['HAIL', 'DOOM', 'RISE', 'BURN', 'FROST', 'NIGHT', 'STORM', 'NO', 'SLEET', 'COLD'],
      punk: ['HEY', 'OI', 'GO', 'NO', 'OUT', 'NOW', 'HO', 'YEAH', 'RIOT', 'LETS GO'],
      rock: ['YEAH', 'WHOA', 'HEY', 'OW', 'ALRIGHT', 'TONIGHT', 'BABY', 'OH', 'COME ON', 'ROCK'],
      country: ['YEEHAW', 'WHOO', 'HEY', 'YEP', 'LORD', 'HOWDY', 'OH', 'YEAH', 'GIDDYUP', 'HOME']
    },
    count: {
      metal: ['HAIL', 'RISE', 'ONE TWO'], punk: ['ONE TWO', 'LETS GO', 'OI', 'GO'], rock: ['ALRIGHT', 'OW', 'HELLO'],
      country: ['YEEHAW', 'HOWDY', 'ONE TWO']
    },
    lex: {
      HEY: 'h e i', OI: 'o i', GO: 'g o u', NO: 'n o u', OUT: 'ae u t', NOW: 'n ae u', HO: 'h o u', YEAH: 'y e ae', RIOT: 'r a i o t',
      'LETS GO': 'l e t s g o u', WHOA: 'w o o', OW: 'a u', ALRIGHT: 'a l r a i t', TONIGHT: 't u n a i t', BABY: 'b e i b i',
      OH: 'o u', 'COME ON': 'k a m o n', ROCK: 'r o k', YEEHAW: 'y i h a', WHOO: 'w u u', YEP: 'y e p', LORD: 'l o r d',
      HOWDY: 'h a u d i', GIDDYUP: 'g i d i a p', HOME: 'h o u m', HAIL: 'h e i l', DOOM: 'd u m', RISE: 'r a i z',
      BURN: 'b oe r n', FROST: 'f r o s t', NIGHT: 'n a i t', STORM: 's t o r m', SLEET: 's l i t', COLD: 'k o u l d',
      'ONE TWO': 'w a n t u', HELLO: 'h e l o u',
      // Marcel's (the odd French word)
      ALLEZ: 'a l e', NON: 'n o n', PELOUSE: 'p e l u z', ENCORE: 'a n k o r', OUI: 'w i', MERCI: 'm e r s i', 'MA PELOUSE': 'm a p e l u z',
      // Rox, Chase, Travis Lee, the rivals
      COUNCIL: 'k a u n s i l', VOTE: 'v o u t', COSTCO: 'k o s t k o', RECALL: 'r i k a l', LEATHER: 'l e d e r', FOREVER: 'f o r e v e r',
      TRUCK: 't r a k', MAMA: 'm a m a', GRAVEL: 'g r a v e l', BUDDY: 'b a d i', WINTER: 'w i n t e r', OKAY: 'o u k e i',
      TAILGATE: 't e i l g e i t', SPONSOR: 's p o n s e r'
    },
    defaults: {
      metal: { pitch: 0, range: [50, 76], formant: 1, rasp: 0.3, screams: { scream: 2, shriek: 1, squeal: 1, gang: 1, growl: 2, guttural: 1, fry: 1, held: 1, shriekHeld: 1 } },
      punk: { pitch: 0, range: [55, 74], formant: 1.05, rasp: 0.45, drive: 2, breath: 0.2 },
      rock: { pitch: 2, range: [57, 79], formant: 1.03, rasp: 0.15, vib: [5.4, 0.018] },
      country: { pitch: -2, range: [50, 71], formant: 1, twang: 4, vib: [5, 0.008], breath: 0.12 }
    },
    profiles: {
      // Marcel: theatrical French-flavoured shrieks (front-rounded vowels, a wide fast vibrato on the held notes).
      marcel: { pitch: 2, range: [55, 79], formant: 1.12, vowels: { u: 'ue', o: 'oe' }, rasp: 0.35, vib: [6.4, 0.014], scoop: -4,
        screams: { shriek: 4, scream: 2, squeal: 1, gang: 1, growl: 1, guttural: 0.3, fry: 1, held: 1, shriekHeld: 3 },
        words: ['ALLEZ', 'NON', 'PELOUSE', 'ENCORE', 'OUI', 'MERCI', 'MA PELOUSE'], wordChance: 0.3, count: ['ALLEZ'] },
      // Rox: hoarse punk yells about city council.
      rox: { pitch: -1, range: [53, 72], formant: 1.08, rasp: 0.75, drive: 5, breath: 0.35,
        words: ['COUNCIL', 'VOTE', 'RECALL', 'COSTCO'], wordChance: 0.2, count: ['ONE TWO'] },
      // Chase: it is still 1985. High tenor wails, wide vibrato, a scoop into every note.
      chase: { pitch: 5, range: [60, 81], formant: 1.06, rasp: 0.18, vib: [5.6, 0.032], scoop: -3,
        words: ['BABY', 'TONIGHT', 'LEATHER', 'FOREVER'], wordChance: 0.25, count: ['HELLO'] },
      // Travis Lee: condo-raised country twang, a yodel flip, low and nasal.
      travis: { pitch: -3, range: [48, 69], formant: 0.98, twang: 8, vib: [5, 0.01], breath: 0.15, yodel: true,
        words: ['TRUCK', 'MAMA', 'GRAVEL', 'LORD'], wordChance: 0.25, count: ['HOWDY'] },
      // The rivals' singers (their cast frontmen; 59d passes { rival } or { singer })
      tw_gord: { pitch: -7, range: [40, 64], formant: 0.84, rasp: 0.55, screams: { guttural: 4, growl: 3, fry: 1, scream: 1, gang: 1, held: 1 },
        words: ['BUDDY', 'WINTER', 'HAIL'], wordChance: 0.25, count: ['HAIL'] }
    },
    rivals: {
      tundra_wraith: 'tw_gord',
      // Blaze (really Kevin, from Oakville): a nasal, sponsor-approved pop-punk sneer, no grit at all.
      mall_rats: { pitch: 3, range: [57, 76], formant: 1.14, twang: 5, rasp: 0.05, breath: 0.1, words: ['OKAY', 'SPONSOR', 'WHOA'], wordChance: 0.3 },
      // Rex Glamour: a stadium falsetto in a July scarf; the same power ballad every single.
      chartbusters: { pitch: 7, range: [62, 84], formant: 1.12, vib: [5.9, 0.038], breath: 0.3, scoop: -3, words: ['FOREVER', 'BABY', 'TONIGHT'], wordChance: 0.35 },
      // Brayden: bro-country, dead-flat pitch (the truck brand paid for the tuning), every song about tailgates.
      buckle_and_boot: { pitch: -1, range: [50, 69], formant: 0.97, twang: 5, vib: [0, 0], yodel: false, rasp: 0.08, words: ['TAILGATE', 'TRUCK', 'YEAH'], wordChance: 0.35 }
    },
    // v1.2 "Soundcheck" (Lane V, handoff F10; GG.voice.profile): each singer's sound on top of the 1.1 profile, kept apart
    //   so A.timeline (which carries the 1.1 profile on every vocal event) never moves. Keys: 'genre:<g>' (the genre's
    //   default), a profiles id, 'rival:<rivalId>'. press 0..1 (the glottal wave: 0 breathy .. 1 belt; absent: the voc
    //   type's own: yell / wail belt, holler modal, whoa-ohs breathy; metal always belts), ring (dB of the singer's 3 kHz
    //   ring), double (chorus lead hits get a double take when there's room; default true), breath 0..1 (extra pulsed
    //   aspiration).
    sound: {
      'genre:rock': { ring: 3 },
      'genre:country': { ring: 4 },
      marcel: { ring: 2 },
      rox: { press: 0.95, ring: 2, breath: 0.1 },
      chase: { ring: 5 },
      travis: { ring: 6 },
      'rival:mall_rats': { press: 0.55, ring: 1 },
      'rival:chartbusters': { press: 0.3, ring: 3, breath: 0.15 },
      'rival:buckle_and_boot': { press: 0.45, double: false }
    }
  };
})(window.GG);
