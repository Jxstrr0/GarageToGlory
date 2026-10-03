// content/zz_seats_drama.js (v1.1 "Seats", review fix): the swapped drummers' forced drama cards from the kit. On a string
// seat the member whose seat you took plays the drums, so their v1.0 ultimatum / return / returnFilled cards (bass case,
// "That's my bass", "{recruit} is playing his solo") get a kit variant: the same card (choices, effects, speaker) with the
// old-instrument words swapped for the kit's. GG.drama's cardFor picks drama.members[id].kit[kind] while that member is the
// swapped drummer (a string seat), else the v1.0 card. Loads after the band packs (zz_band_*), whose dramaCards it clones.
// Wants and grumbles stay the content role's (plan_contract_1.1 §4.1). Rules: no USA content, parody names only, no gong on
// the kit, prairie tone.
(function (GG) {
  var K = GG.content, cards = K.dramaCards = K.dramaCards || [], members = (K.drama = K.drama || {}).members = K.drama.members || {};
  function find(id) { for (var i = 0; i < cards.length; i++) if (cards[i] && cards[i].id === id) return cards[i]; return null; }
  function swap(s, pairs) {   // pairs: [[old, new], ...] applied in order (each old must be in the text)
    if (typeof s !== 'string') return s;
    (pairs || []).forEach(function (p) { s = s.split(p[0]).join(p[1]); });
    return s;
  }
  // kit(memberId, kind, baseId, patch): patch = { title?, text: pairs, c<i>: { label: pairs, outcome: pairs } }
  function kit(id, kind, baseId, patch) {
    var src = find(baseId);
    if (!src || !members[id]) return;
    var c = JSON.parse(JSON.stringify(src));
    c.id = baseId + '_kit';
    if (patch.title) c.title = patch.title;
    c.text = swap(c.text, patch.text);
    (c.choices || []).forEach(function (ch, i) {
      var p = patch['c' + i];
      if (!p || !ch) return;
      ch.label = swap(ch.label, p.label);
      ch.outcome = swap(ch.outcome, p.outcome);
    });
    cards.push(c);
    (members[id].kit = members[id].kit || {})[kind] = c.id;
  }
  var STICKS = [['bass case', 'stick bag']], CASE = [['the case', 'the stick bag'], ['The case', 'The stick bag']];

  /* ---- Hail Damage: Kenji (bass seat), Jaxon (rhythm), Dana (lead) ---- */
  kit('kenji', 'ultimatum', 'ult_kenji', { title: 'The Stick Bag', text: STICKS, c0: { outcome: CASE }, c1: { outcome: CASE }, c2: { outcome: CASE.concat([['His corner still smells', 'His throne still smells']]) } });
  kit('kenji', 'returnFilled', 'ret_kenji_filled', { title: 'The Throne',
    text: [['standing in his corner, sunglasses on, bass in hand', 'standing by the kit, sunglasses on, sticks in hand'], ['who is also standing in his corner', 'who is sitting on his throne']],
    c0: { label: [['his corner', 'his throne']], outcome: [['Kenji plugs in.', 'Kenji sits down behind the kit.']] } });
  kit('jaxon', 'ultimatum', 'ult_jaxon', { text: [['holding his guitar like a shield', 'holding his drumsticks like two tiny shields']] });
  kit('jaxon', 'return', 'ret_jaxon', { text: [['already holding his guitar', 'already holding his sticks']],
    c0: { outcome: [['Jaxon plugs in so fast he trips the breaker', 'Jaxon gets behind the kit so fast he knocks over the hi-hat']] } });
  kit('jaxon', 'returnFilled', 'ret_jaxon_filled', { text: [['holding a rhythm guitar', "behind the kit, on Jaxon's throne"]],
    c1: { outcome: [['the new rhythm guitarist in', 'the new drummer in']] } });
  kit('dana', 'ultimatum', 'ult_dana', {
    text: [["every solo she's been cut from, in minutes", 'every drum solo she has asked for and not been given, in minutes'], ['a 7-string with a 26.5-inch scale', 'a pair of china cymbals the size of hubcaps']],
    c0: { label: [['Buy her the 7-string', 'Buy her the china cymbals']], outcome: [['She names it Gwendolyn II and plays it', 'She names them Gwendolyn II and III and hits them']] },
    c1: { label: [['A solo in every song', 'A drum solo in every song']], outcome: [['Marcel introduces each solo', 'Marcel introduces each drum solo']] },
    c2: { outcome: [['She packs Gwendolyn and a pedalboard the size of a door', 'She packs her cymbal bag and a double pedal the size of a door']] } });
  kit('dana', 'return', 'ret_dana', { text: [['with Gwendolyn and a new pedalboard', 'with her cymbal bag and a new double pedal']],
    c0: { label: [['Plug in, Sweep', 'Sit in, Sweep']], outcome: [['She plugs in and plays a solo so long', 'She sits down at the kit and plays a drum solo so long']] },
    c1: { label: [['Solos stay short', 'Drum solos stay short']], outcome: [["'a short solo'", "'a short drum solo'"]] } });
  kit('dana', 'returnFilled', 'ret_dana_filled', { title: 'Throne Height',
    text: [['pedalboard under one arm', 'cymbal bag under one arm'], ['{recruit} is using her amp. Dana reads the amp settings', '{recruit} is on her throne. Dana reads the throne height']],
    c0: { outcome: [['Dana resets the amp to her exact settings and quietly re-strings everything {recruit} touched', 'Dana resets the throne to her exact height and quietly re-tunes every drum {recruit} touched']] },
    c1: { outcome: [['their new lead guitarist', 'their new drummer']] } });

  /* ---- Frost Heave: Moth (bass seat), Rox (rhythm: she sings from the kit), Benny (lead) ---- */
  kit('moth', 'return', 'ret_moth', { title: 'Knock If You Need a Drummer',
    text: [['a laundry basket and a bass', 'a laundry basket and a snare drum'], ['need a bassist', 'need a drummer']],
    c0: { outcome: [['a bassist and a driver', 'a drummer and a driver']] } });
  kit('moth', 'returnFilled', 'ret_moth_filled', { text: [["who is holding her bass. 'That's my bass,'", "who is sitting at her kit. 'That's my kit,'"]],
    c0: { outcome: [['hands over the bass and the van keys', 'hands over the sticks and the van keys']] },
    c1: { outcome: [['announce a bassist who', 'announce a drummer who']] } });
  kit('rox', 'return', 'ret_rox', { text: [['looking at the empty mic stand like it owes her money', 'looking at the empty drum throne and its mic like they owe her money']] });
  kit('rox', 'returnFilled', 'ret_rox_filled', { text: [['{recruit} is at her mic, holding her megaphone', '{recruit} is behind her kit, at her mic, holding her megaphone']] });
  kit('benny', 'ultimatum', 'ult_benny', { title: 'The Note on the Stick Bag',
    text: [["Benny's guitar case is packed", "Benny's stick bag is packed"]],
    c0: { outcome: [['Benny unpacks the case and plays both chords, gently', 'Benny unpacks the stick bag and plays it with two beats, gently']] },
    c2: { outcome: [['Benny picks up the case', 'Benny picks up the stick bag']] } });
  kit('benny', 'return', 'ret_benny', { text: [['guitar on his back', 'stick bag on his back']],
    c0: { outcome: [['Benny plugs in and plays chord one, then chord two, then chord one again', 'Benny sits down at the kit and plays beat one, then beat two, then beat one again']] },
    c1: { outcome: [['He plays it with two chords anyway', 'He drums it with two beats anyway']] },
    c2: { outcome: [['playing both chords softly', 'tapping both beats softly on a dryer']] } });
  kit('benny', 'returnFilled', 'ret_benny_filled', { title: 'Three Fills in the Basement',
    text: [['{recruit} is playing his part, with three chords', '{recruit} is on his kit, playing his part, with three fills']],
    c0: { outcome: [['Benny re-tunes everything {recruit} touched and plays the first song with exactly two chords', 'Benny re-tunes every drum {recruit} touched and plays the first song with exactly two beats']] },
    c1: { outcome: [["{rival}'s new guitarist is Benny Two Chords. Siobhan has taught him a third.", "{rival}'s new drummer is Benny Two Chords. Siobhan has taught him a third beat."]] } });

  /* ---- Gravel Kings: Tamara (bass seat), Chase (rhythm: he sings from the kit), Lenny (lead) ---- */
  kit('tamara', 'return', 'ret_tamara', { text: [['with her bass and a thermos', 'with her stick bag and a thermos']] });
  kit('tamara', 'returnFilled', 'ret_tamara_filled', { title: 'The Drum Riser',
    text: [['bass case in one hand', 'stick bag in one hand'], ['{recruit} is in her spot, playing her parts, using her strap', '{recruit} is on her throne, playing her parts, using her sticks'], ['taped to the amp', 'taped to the floor tom']] });
  kit('chase', 'return', 'ret_chase', { text: [['He looks at the empty mic stand', 'He looks at the empty drum riser and its mic']],
    c0: { outcome: [['He knee-slides from the door to the mic stand', 'He knee-slides from the door to the drum riser']] } });
  kit('chase', 'returnFilled', 'ret_chase_filled', { text: [['He sees {recruit} at his mic stand, in HIS spot, by the till', 'He sees {recruit} behind his kit, at his mic, in HIS spot by the till']] });
  kit('lenny', 'ultimatum', 'ult_lenny', {
    c0: { outcome: [['A real lawyer, for real riffs', 'A real lawyer, for real grooves'], ['He wakes up and writes a solo', 'He wakes up and writes a groove']] },
    c1: { label: [['A solo in every set', 'A drum solo in every set']], outcome: [['Every solo is original', 'Every drum solo is original']] },
    c2: { outcome: [['He packs the guitar and the amp Gus fixed', 'He packs his sticks and the snare Gus fixed']] } });
  kit('lenny', 'return', 'ret_lenny', { text: [['with his guitar and a stack', 'with his stick bag and a stack']],
    c0: { label: [['Plug in, Lawsuit', 'Sit in, Lawsuit']], outcome: [['He plugs in and plays a riff nobody has ever heard', 'He sits down at the kit and plays a groove nobody has ever heard']] },
    c1: { label: [['Only original riffs', 'Only original grooves']], outcome: [['a notebook of riffs', 'a notebook of grooves']] },
    c2: { outcome: [['Every riff he plays out there is original', 'Every groove he plays out there, on a practice pad, is original']] } });
  kit('lenny', 'returnFilled', 'ret_lenny_filled', { title: 'Whose Groove Is It?',
    text: [['{recruit} is playing his guitar parts, note for note', '{recruit} is on his kit, playing his drum parts, hit for hit'], ["'That riff,'", "'That groove,'"]],
    c0: { outcome: [['Lenny re-tunes everything {recruit} touched, then writes a riff for them', 'Lenny re-tunes every drum {recruit} touched, then writes a groove for them']] },
    c1: { outcome: [['has a riff that sounds exactly like a Lenny riff', 'has a drum part that sounds exactly like a Lenny groove']] } });

  /* ---- Grid Road Ramblers: Duke (bass seat), Travis Lee (rhythm: he sings from the kit), Earl (lead) ---- */
  kit('duke', 'ultimatum', 'ult_duke', { title: 'The Hat Is on the Floor Tom', text: [['put it on his amp', 'put it on his floor tom']] });
  kit('duke', 'return', 'ret_duke', { c0: { outcome: [['He plugs in and plays three notes, then a fourth', 'He sits down at the kit and plays three beats, then a fourth'], ['cheers the fourth note', 'cheers the fourth beat']] } });
  kit('duke', 'returnFilled', 'ret_duke_filled', { text: [['{recruit} is playing his bass', '{recruit} is playing his kit']],
    c0: { outcome: [['hands back the bass', 'hands back the sticks']] },
    c1: { outcome: [['announce a bassist whose hat', 'announce a drummer whose hat']] } });
  kit('travis', 'return', 'ret_travis', { text: [['with his acoustic and a Prairie Titan lanyard', 'with his sticks in his back pocket and a Prairie Titan lanyard']] });
  kit('travis', 'returnFilled', 'ret_travis_filled', { text: [['{recruit} is at his mic, singing his truck song', '{recruit} is behind his kit, at his mic, singing his truck song'], ['holding his guitar case in the doorway', 'holding his stick bag in the doorway']] });
  kit('earl', 'ultimatum', 'ult_earl', { text: [["Earl's guitar case is by the Quonset door", "Earl's stick bag is by the Quonset door"]], c1: { outcome: [['He brings the case back in', 'He brings the stick bag back in']] } });
  kit('earl', 'return', 'ret_earl', { text: [['his guitar under the other', 'his stick bag under the other']],
    c0: { outcome: [['Earl plugs in and plays the solo from 1979, note for note', 'Earl sits down at the kit and plays the groove from 1979, hit for hit']] } });
  kit('earl', 'returnFilled', 'ret_earl_filled', { title: 'Somebody Is Playing My Groove',
    text: [['{recruit} is playing his solo. The one from 1979.', '{recruit} is on his kit, playing his groove. The one from 1979.'], ["'Second bar. It's a B.'", "'Second bar. It's a rimshot.'"]],
    c0: { outcome: [['sign their guitar', 'sign their snare']] },
    c1: { outcome: [['a new guitarist who', 'a new drummer who']] } });
})(window.GG);
