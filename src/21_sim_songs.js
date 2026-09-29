// 21_sim_songs.js: the song catalog. v0.1: placeholder songs (a title + quality/polish numbers);
// v0.2 adds the step-sequencer `pattern` and rates it. No DOM; randomness only from the rng passed in.
//   SONG = { id, title, titleEn, quality 0..100, polish 0..100, plays, written: totalWeek, pattern: null }
(function (GG) {
  var U = GG.util;
  var songs = GG.songs = GG.songs || {};

  // Used only when content/song_titles.js is missing.
  var FALLBACK_TITLES = {
    metal: [
      { fr: 'Ma Pelouse, Mon Tombeau', en: 'My Lawn, My Tomb' },
      { fr: 'Les Pissenlits Éternels', en: 'The Eternal Dandelions' },
      { fr: 'Tondeuse de l’Apocalypse', en: 'Lawnmower of the Apocalypse' },
      { fr: 'Le Voisin a Coupé Trop Court', en: 'The Neighbour Cut It Too Short' },
      { fr: 'Arrosage Interdit', en: 'Watering Ban' },
      { fr: 'Chiendent Sanglant', en: 'Bloody Crabgrass' }
    ],
    punk: [{ fr: 'Council Meeting (Is a Lie)', en: 'Council Meeting (Is a Lie)' }],
    rock: [{ fr: 'Leather Pants at Minus Forty', en: 'Leather Pants at Minus Forty' }],
    country: [{ fr: 'My Truck Is in the Condo Lot', en: 'My Truck Is in the Condo Lot' }]
  };
  var ROMAN = ['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

  // Content entries may be { fr, en }, { title, titleEn } or plain strings.
  function norm(t) {
    if (typeof t === 'string') return { title: t, titleEn: t };
    return { title: t.fr || t.title || '???', titleEn: t.en || t.titleEn || t.fr || t.title || '???' };
  }
  function titlePool(genre) {
    var st = GG.content.songTitles, list = st && st[genre] && st[genre].length ? st[genre] : FALLBACK_TITLES[genre];
    return (list || FALLBACK_TITLES.metal).map(norm);
  }
  function nextId(state) {
    var max = 0;
    state.songs.forEach(function (s) { var n = parseInt(String(s.id).slice(1), 10); if (n > max) max = n; });
    return 's' + (max + 1);
  }
  // A fresh title from the genre pool; once every title is used, sequels: "Ma Pelouse, Mon Tombeau II".
  function pickTitle(state, rng) {
    var used = {}, pool = titlePool(state.genre);
    state.songs.forEach(function (s) { used[s.title] = true; });
    var fresh = pool.filter(function (t) { return !used[t.title]; });
    if (fresh.length) return rng.pick(fresh);
    var base = rng.pick(pool);
    for (var i = 0; i < ROMAN.length; i++) {
      if (!used[base.title + ' ' + ROMAN[i]]) return { title: base.title + ' ' + ROMAN[i], titleEn: base.titleEn + ' ' + ROMAN[i] };
    }
    return { title: base.title + ' ' + (state.songs.length + 1), titleEn: base.titleEn + ' ' + (state.songs.length + 1) };
  }
  function avgSkill(state) {
    var act = state.members.filter(function (m) { return m.status === 'active'; });
    if (!act.length) return 0;
    return act.reduce(function (t, m) { return t + m.skill; }, 0) / act.length;
  }
  function make(state, t, quality, polish) {
    var song = { id: nextId(state), title: t.title, titleEn: t.titleEn, quality: U.clamp(Math.round(quality), 1, 100),
      polish: U.clamp(Math.round(polish), 0, 100), plays: 0, written: state.totalWeek, pattern: null };
    state.songs.push(song);
    return song;
  }

  // Starter songs that come with the band (newCareer). t = { title, titleEn } (or { fr, en }).
  songs.addStarter = function (state, t, rng) {
    var E = GG.content.economy;
    var s = make(state, norm(t), rng.int(E.starterSongQuality[0], E.starterSongQuality[1]), E.starterSongPolish);
    s.written = 0;
    return s;
  };

  // Write block: a new song whose quality comes from the band's skills + chemistry + luck.
  // opts.repeatFactor < 1 (second write in a week) costs quality.
  songs.writePlaceholder = function (state, rng, opts) {
    var A = GG.content.activities.write, f = opts && opts.repeatFactor != null ? opts.repeatFactor : 1;
    var q = A.qualityBase + avgSkill(state) * A.qualitySkill + state.drumSkill * A.qualityDrum
      + state.chemistry * A.qualityChem + rng.range(A.qualityNoise[0], A.qualityNoise[1]) - (1 - f) * A.repeatPenalty;
    var song = make(state, pickTitle(state, rng), q, rng.int(A.polish[0], A.polish[1]));
    state.stats.songsWritten++;
    return song;
  };

  // Ranking used for setlists: quality matters most, polish shows on stage.
  songs.score = function (song) {
    var w = GG.content.economy.gig.songScore;
    return song.quality * w.quality + song.polish * w.polish;
  };
  // The n best songs (stable: earlier songs win ties).
  songs.best = function (state, n) {
    var list = state.songs.map(function (s, i) { return { s: s, i: i, v: songs.score(s) }; });
    list.sort(function (a, b) { return b.v - a.v || a.i - b.i; });
    return list.slice(0, n == null ? list.length : n).map(function (o) { return o.s; });
  };
  // Rehearsal polish: adds `amount` to up to `count` (default 3) of the highest-quality songs not yet at 100.
  songs.polish = function (state, amount, count) {
    var todo = state.songs.filter(function (s) { return s.polish < 100; });
    todo.sort(function (a, b) { return b.quality - a.quality; });
    todo = todo.slice(0, count == null ? 3 : count);
    todo.forEach(function (s) { s.polish = U.clamp(s.polish + amount, 0, 100); });
    return todo;
  };

  GG.registerDebug('songs', function () {
    var s = GG.state; if (!s) return { songs: 0 };
    var top = songs.best(s, 3);
    return { songs: s.songs.length, best: top.map(function (x) { return x.title + ' q' + x.quality + ' p' + x.polish; }) };
  });
})(window.GG);
