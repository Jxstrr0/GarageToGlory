// activities.js: the six weekly blocks and their numbers (owned by the SIM agent; flavour lines live in lines.js).
// Gains (skill, chemistry, buzz, cash, polish, rest) shrink for a repeat in the same week (economy.repeatFactor);
// costs and burnout do not. Skill-type gains also shrink with headroom: gain * (1 - current / 100).
(function (GG) {
  GG.content.activities = {
    rehearse: {
      id: 'rehearse', name: 'Rehearse', icon: '🥁',
      blurb: 'Run the set until the neighbours complain. Skills, chemistry and your chops go up.',
      skill: 1.6,          // per member, before headroom
      drumSkill: 2.4,      // yours, before headroom
      chemistry: 2,
      polish: 14, polishSongs: 3,   // polish added to up to 3 of your best unfinished songs
      burnout: 5
    },
    write: {
      id: 'write', name: 'Write', icon: '✍️',
      blurb: 'Find a beat, let the singer scream over it. You get a new song.',
      // quality = base + avg skill * skill + drum skill * drum + chemistry * chem + noise, minus the repeat penalty
      qualityBase: 8, qualitySkill: 0.55, qualityDrum: 0.2, qualityChem: 0.15, qualityNoise: [-8, 12],
      repeatPenalty: 20,   // quality lost on a same-week repeat, times (1 - repeat factor)
      polish: [5, 15],     // starting polish
      chemistry: 1,
      burnout: 5
    },
    promote: {
      id: 'promote', name: 'Promote', icon: '📣',
      blurb: 'Flyers on every lamp post in the city. Buzz goes up; so does the photocopy bill.',
      cost: 25, buzz: 6, fans: [1, 4], burnout: 2
    },
    book: {
      id: 'book', name: 'Book', icon: '📞',
      blurb: 'Work the phones. Books a local gig this weekend if you have nothing on.',
      maxTier: 1,          // v0.1 placeholder: books a tier-1 venue you qualify for
      buzzIfBooked: 2,     // already booked: you hang posters for it instead
      burnout: 1
    },
    hustle: {
      id: 'hustle', name: 'Hustle', icon: '💵',
      blurb: 'Weddings, busking, bingo-hall covers. Cash in the fund, a little less art in your soul.',
      cash: [50, 100], burnout: 7,
      grumbler: 'marcel', grumble: -3   // this member hates playing the Chicken Dance at wedding socials (falls back to the first member)
    },
    rest: {
      id: 'rest', name: 'Rest', icon: '🛋️',
      blurb: 'Nobody touches an instrument. Burnout goes down, moods go up.',
      burnout: -14, mood: 4
    }
  };
})(window.GG);
