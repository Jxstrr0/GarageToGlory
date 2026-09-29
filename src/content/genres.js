// content/genres.js: what each genre wants from a drum pattern (the sequencer's Groove meter), the fixed
// patterns the sim builds songs from, and how the generated backing band plays along.
// Shape: GG.content.genres = { <genre>: {
//   name, tempo: [min, max, default], jamTempo: [lo, hi] (bands jam in this range),
//   groove: [ RULE ],  sync: max share of kick/snare hits on 16th off-beats before it feels jumpy,
//   signature: PATTERN (scores Groove >= 80 here, clearly lower elsewhere), starter: PATTERN (first Write),
//   parts: { verse: [BAR], chorus: [BAR], bridge: [BAR] }  (GG.songs.generate mixes these), BAR = [laneStr x 4],
//   backing: { root: midi, styles: [[bpmFrom, style, label]], progressions: { verse|chorus|bridge: [[semitones x 4 bars]] }, riffs },
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
      backing: {
        root: 40,   // E2, drop-anything tuning
        styles: [[0, 'doom', 'Doom sludge'], [100, 'chug', 'Palm-muted chugs'], [171, 'tremolo', 'Tremolo riffs']],
        progressions: {
          verse: [[0, 0, 1, 0], [0, 3, 5, 3], [0, 0, 8, 7], [0, 5, 3, 1], [0, 1, 0, 6]],
          chorus: [[5, 3, 0, 0], [8, 7, 5, 3], [0, 8, 5, 7], [3, 5, 7, 5], [10, 8, 7, 0]],
          bridge: [[1, 1, 0, 0], [6, 5, 6, 7], [0, 1, 3, 1], [8, 8, 7, 6]]
        },
        riffs: [[0, 0, 12, 0, 7, 0, 5, 0], [0, 1, 0, 3, 0, 5, 3, 1], [0, 12, 10, 7, 0, 5, 7, 8], [0, 0, 3, 0, 5, 0, 6, 5]]
      },
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
        riffs: [[0, 0, 0, 0, 7, 7, 5, 5]] },
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
        riffs: [[0, 0, 7, 0, 10, 0, 7, 5]] },
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
        riffs: [[0, 0, 7, 0, 5, 0, 7, 0]] },
      reactions: { great: 'Boot-scootin’.', good: 'Two-steppable.', meh: 'Lost the train.', bad: 'Derailed.' }
    }
  };
})(window.GG);
