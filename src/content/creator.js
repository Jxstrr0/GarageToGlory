// content/creator.js (v0.8 "Kit", Addendum 1 C2): the full character creator's part lists and kit looks, each with an
// unlock gate. Pure data. The sim (src/2b_sim_creator.js, GG.creator) reads it; the renderer (40_render_core
// R.charGeometry, the kit builders) draws every value listed here; the UI (5j_ui_creator.js) builds its tabs from it.
// Shape: GG.content.creator = {
//   cats: { <cat>: { label, field, group: 'person'|'clothes'|'stage'|'ink'|'kit' } }   field = where the value lives
//          (LOOK key, 'face.<key>', or 'kit.<key>'); person fields are shared by the everyday and the stage look.
//   parts: [ { id: '<cat>.<value>', cat, value, name, gate?: GATE, hint?, color? } ]   no gate = unlocked from the start;
//          color = the swatch for colour parts (hairColor, sticks)
//   GATE = { era: 'local'|'signed'|'world' } | { fans: n } | { milestone: key } | { award: trophy kind } | { gigs: n },
//          optional genreStart: [genre] (unlocked from day one in those genres). Never a gong on the kit.
//   swatches: { skin, eyes, clothes, kit } ([ '#rrggbb' ], always unlocked) ; hair / sticks are parts (dyes are gated).
//   builds: { <build value>: LOOK.build number } ; knuckleMax: 4 (letters per hand, A–Z only)
// }
(function (GG) {
  var parts = [];
  function P(cat, value, name, gate, hint) {
    var p = { id: cat + '.' + value, cat: cat, value: value, name: name };
    if (gate) p.gate = gate;
    if (hint && /^#[0-9a-f]{6}$/i.test(hint)) p.color = hint; else if (hint) p.hint = hint;   // colour parts (hair dyes, sticks)
    parts.push(p);
  }
  var FIRST_GIG = { milestone: 'firstGig' }, FIRST_SONG = { milestone: 'firstSong' };
  var LOCAL = { era: 'local' }, SIGNED = { era: 'signed' }, WORLD = { era: 'world' };

  // ---- Body ----------------------------------------------------------------------------------------------
  P('build', 'slim', 'Beanpole'); P('build', 'average', 'Average Joe'); P('build', 'stocky', 'Stocky'); P('build', 'big', 'Big unit');
  P('age', 'fresh', 'Fresh-faced'); P('age', 'lived', 'Lived-in'); P('age', 'grizzled', 'Grizzled', null, 'Forty prairie winters.');

  // ---- Face ----------------------------------------------------------------------------------------------
  P('shape', 'classic', 'Classic'); P('shape', 'round', 'Round'); P('shape', 'square', 'Square jaw'); P('shape', 'long', 'Long face');
  P('eyes', 'dot', 'Beady'); P('eyes', 'wide', 'Wide awake'); P('eyes', 'narrow', 'Squinty'); P('eyes', 'big', 'Puppy eyes'); P('eyes', 'sleepy', 'Half-asleep');
  P('brows', 'straight', 'Straight'); P('brows', 'thick', 'Bushy'); P('brows', 'angry', 'Furious'); P('brows', 'raised', 'Skeptical'); P('brows', 'unibrow', 'Unibrow');
  P('nose', 'button', 'Button'); P('nose', 'big', 'Honker'); P('nose', 'long', 'Long'); P('nose', 'pointy', 'Pointy'); P('nose', 'broken', 'Broken (beer league)');
  P('mouth', 'flat', 'Deadpan'); P('mouth', 'grin', 'Big grin'); P('mouth', 'smirk', 'Smirk'); P('mouth', 'frown', 'Frown'); P('mouth', 'scream', 'Mid-scream');
  P('facialHair', 'clean', 'Clean-shaven'); P('facialHair', 'stubble', 'Stubble'); P('facialHair', 'goatee', 'Goatee');
  P('facialHair', 'full', 'Full beard'); P('facialHair', 'horseshoe', "Horseshoe 'stache");
  P('facialHair', 'handlebar', 'Handlebar moustache', { fans: 100 });
  P('facialHair', 'chops', 'Mutton chops', FIRST_GIG);
  P('facialHair', 'viking', 'Braided Viking beard', { era: 'local', genreStart: ['metal'] });
  P('glasses', 'none', 'No glasses'); P('glasses', 'specs', 'Library specs'); P('glasses', 'round', 'Round specs');
  P('glasses', 'shades', 'Mystery shades', null, 'Indoors. At night. Always.');
  P('glasses', 'aviators', 'Aviators', { fans: 500, genreStart: ['rock'] });

  // ---- Hair (styles + colours) ------------------------------------------------------------------------------
  P('hairStyle', 'buzz', 'Buzz cut'); P('hairStyle', 'mop', 'Mop top'); P('hairStyle', 'short', 'Short'); P('hairStyle', 'mullet', 'Mullet');
  P('hairStyle', 'long', 'Long metal hair'); P('hairStyle', 'curly', 'Curly'); P('hairStyle', 'shaggy', 'Shaggy');
  P('hairStyle', 'bun', 'Top bun'); P('hairStyle', 'manbun', 'Man bun'); P('hairStyle', 'spiky', 'Gelled spikes');
  P('hairStyle', 'hathair', 'Hat hair', null, 'Pairs with any hat.'); P('hairStyle', 'bald', 'Bald');
  P('hairStyle', 'dreads', 'Dreadlocks', { fans: 100 });
  P('hairStyle', 'braids', 'Braids', { fans: 100 });
  P('hairStyle', 'mohawk', 'Mohawk', { milestone: 'firstGig', genreStart: ['punk'] });
  P('hairStyle', 'spikes', 'Liberty spikes', { fans: 250, genreStart: ['punk'] });
  P('hairStyle', 'slick', 'Slicked back', { era: 'signed', genreStart: ['rock'] });
  P('hairColor', 'black', 'Black', null, '#15110f'); P('hairColor', 'dark', 'Dark brown', null, '#2b1d14');
  P('hairColor', 'brown', 'Brown', null, '#5c3a22'); P('hairColor', 'chestnut', 'Chestnut', null, '#7a4b2a');
  P('hairColor', 'auburn', 'Auburn', null, '#8a3a1e'); P('hairColor', 'ginger', 'Ginger', null, '#c0622a');
  P('hairColor', 'sandy', 'Sandy', null, '#b89a5a'); P('hairColor', 'blonde', 'Blonde', null, '#d9c27a');
  P('hairColor', 'grey', 'Grey', null, '#8a8a8a'); P('hairColor', 'white', 'White', null, '#e6e2da');
  P('hairColor', 'bleach', 'Bleached', FIRST_SONG, '#f2ead0');
  P('hairColor', 'blue', 'Blue', { fans: 100 }, '#3f7fe0');
  P('hairColor', 'green', 'Green', { fans: 250, genreStart: ['punk'] }, '#3fbf4a');
  P('hairColor', 'pink', 'Pink', LOCAL, '#f06aa8');

  // ---- Everyday clothes -------------------------------------------------------------------------------------
  P('top', 'tee', 'Band tee'); P('top', 'longsleeve', 'Longsleeve'); P('top', 'flannel', 'Flannel'); P('top', 'hoodie', 'Hoodie');
  P('top', 'jacket', 'Bomber jacket'); P('top', 'tank', 'Tank top');
  P('top', 'denim', 'Denim jacket', FIRST_GIG);
  P('top', 'jersey', 'Hockey jersey', { fans: 500 }, 'The hometown junior team. Nobody has ever won anything in it.');
  P('bottom', 'jeans', 'Jeans'); P('bottom', 'cargo', 'Cargo shorts', null, 'Worn through January.'); P('bottom', 'sweats', 'Sweatpants');
  P('bottom', 'kilt', 'Kilt', { fans: 1000 });
  P('shoes', 'sneakers', 'Beater sneakers'); P('shoes', 'skate', 'Skate shoes'); P('shoes', 'workboots', 'Work boots'); P('shoes', 'crocs', 'Crocs');
  P('shoes', 'cowboy', 'Cowboy boots', { era: 'local', genreStart: ['country'] });
  P('headwear', 'none', 'Nothing'); P('headwear', 'toque', 'Toque'); P('headwear', 'trucker', 'Trucker hat'); P('headwear', 'backcap', 'Backwards cap');
  P('headwear', 'headband', 'Sweatband');
  P('headwear', 'bandana', 'Bandana', FIRST_GIG);
  P('headwear', 'cowboy', 'Cowboy hat', { fans: 250, genreStart: ['country'] });

  // ---- Stage outfits (the stage look only) -------------------------------------------------------------------------
  P('outfit', 'none', 'Street clothes'); P('outfit', 'shirtless', 'Shirtless', null, 'Drummers run hot.');
  P('outfit', 'battlejacket', 'Battle jacket', { milestone: 'firstGig', genreStart: ['metal'] }, 'Denim vest, forty patches, never washed.');
  P('outfit', 'leathervest', 'Leather vest', { fans: 250 });
  P('outfit', 'cdntux', 'Canadian tuxedo', { era: 'local', genreStart: ['rock'] }, 'Denim on denim. Formal wear.');
  P('outfit', 'spandex', 'Spandex', { fans: 1000, genreStart: ['rock'] }, 'It is 1985 somewhere. Specifically, on you.');
  P('outfit', 'rhinestone', 'Rhinestone suit', { era: 'signed', genreStart: ['country'] });
  P('stageExtra', 'wristbands', 'Studded wristbands', { fans: 100 });
  P('stageExtra', 'corpsepaint', 'Corpse paint', { era: 'local', genreStart: ['metal'] });
  P('stageExtra', 'cape', 'A cape of your own', { award: 'loonie' }, 'Your singer will have opinions.');

  // ---- Ink + piercings ---------------------------------------------------------------------------------------------
  P('tatSpot', 'halfL', 'Left forearm'); P('tatSpot', 'halfR', 'Right forearm'); P('tatSpot', 'chest', 'Chest');
  P('tatSpot', 'sleeveL', 'Full left sleeve', { fans: 250 }); P('tatSpot', 'sleeveR', 'Full right sleeve', { fans: 250 });
  P('tatSpot', 'neck', 'Neck', LOCAL);
  P('tatSpot', 'teardrop', 'Face teardrop', SIGNED);
  P('tatSpot', 'knuckles', 'Knuckles', FIRST_GIG, 'Four letters per hand.');
  P('tatDesign', 'skull', 'Skull'); P('tatDesign', 'maple', 'Maple leaf'); P('tatDesign', 'wheat', 'Wheat sheaf');
  P('tatDesign', 'mom', '"MOM" heart'); P('tatDesign', 'flames', 'Flames');
  P('tatDesign', 'regerts', 'One misspelled word', FIRST_GIG, 'It says REGERTS. You meant it.');
  P('tatDesign', 'moose', 'Moose', { fans: 500 });
  P('tatDesign', 'logo', 'Band logo', LOCAL);
  P('piercing', 'studs', 'Ear studs'); P('piercing', 'hoops', 'Hoops');
  P('piercing', 'nosering', 'Nose ring', { fans: 50 }); P('piercing', 'eyebrow', 'Eyebrow', { fans: 250 });
  P('piercing', 'lip', 'Lip ring', LOCAL); P('piercing', 'septum', 'Septum', { fans: 1000 });
  P('piercing', 'gauges', 'Gauges', SIGNED);

  // ---- The kit (KIT_LOOK). No gong, ever. ----------------------------------------------------------------------------
  P('shell', 'paint', 'Painted'); P('shell', 'wood', 'Natural wood'); P('shell', 'black', 'Black');
  P('shell', 'camo', 'Camo', { fans: 500 }); P('shell', 'sparkle', 'Sparkle', LOCAL); P('shell', 'flames', 'Hot-rod flames', { fans: 1000 });
  P('hardware', 'chrome', 'Chrome'); P('hardware', 'black', 'Blacked out', SIGNED);
  P('head', 'plain', 'Plain head'); P('head', 'logo', 'Band logo'); P('head', 'text', 'Custom text');
  P('head', 'moose', 'A moose', { fans: 500 }); P('head', 'face', 'Your face', { award: 'platinum' }, 'Go platinum and it goes on the kick.');
  P('throne', 'crate', 'Milk crate', null, 'Two of them, zip-tied.'); P('throne', 'stool', 'Throne stool', { fans: 100 });
  P('throne', 'leather', 'Leather saddle', SIGNED);
  // v0.9: the other bands' first thrones (bands.js throne): a laundromat pail and a Quonset hay bale.
  P('throne', 'bucket', 'Upturned bucket', { fans: 50, genreStart: ['punk'] }, 'A five-gallon pail. Punk-rock ergonomics.');
  P('throne', 'haybale', 'Hay bale', { fans: 50, genreStart: ['country'] }, 'Scratchy. Stable. Smells like August.');
  P('sticks', 'wood', 'Hickory', null, '#d8b27a'); P('sticks', 'black', 'Black', null, '#1c1c20'); P('sticks', 'white', 'White', null, '#f0ece4');
  P('sticks', 'red', 'Red', FIRST_GIG, '#c0392b'); P('sticks', 'gold', 'Gold', { award: 'gold' }, '#e0b640');
  P('sticks', 'glow', 'Glow-in-the-dark', WORLD, '#9aff5a');
  P('kitExtra', 'cowbell', 'More cowbell', { fans: 250, genreStart: ['country'] });
  P('kitExtra', 'fan', 'Hair fan', SIGNED, 'For that wind-tunnel headbang.');
  P('kitExtra', 'pyro', 'Pyro', WORLD, 'Arena shows only. The fire marshal insists.');

  GG.content.creator = {
    cats: {
      build: { label: 'Build', field: 'build', group: 'person' },
      age: { label: 'Age look', field: 'age', group: 'person' },
      shape: { label: 'Face shape', field: 'face.shape', group: 'person' },
      eyes: { label: 'Eyes', field: 'face.eyes', group: 'person' },
      brows: { label: 'Eyebrows', field: 'face.brows', group: 'person' },
      nose: { label: 'Nose', field: 'face.nose', group: 'person' },
      mouth: { label: 'Mouth', field: 'face.mouth', group: 'person' },
      facialHair: { label: 'Facial hair', field: 'facialHair', group: 'person' },
      glasses: { label: 'Glasses', field: 'glasses', group: 'person' },
      hairStyle: { label: 'Hair', field: 'hairStyle', group: 'person' },
      hairColor: { label: 'Hair colour', field: 'hair', group: 'person' },
      top: { label: 'Top', field: 'top', group: 'clothes' },
      bottom: { label: 'Bottoms', field: 'bottom', group: 'clothes' },
      shoes: { label: 'Shoes', field: 'shoes', group: 'clothes' },
      headwear: { label: 'Headwear', field: 'headwear', group: 'clothes' },
      outfit: { label: 'Stage outfit', field: 'outfit', group: 'stage' },
      stageExtra: { label: 'Stage extras', field: 'stageExtras', group: 'stage' },
      tatSpot: { label: 'Tattoo spots', field: 'tattoos', group: 'ink' },
      tatDesign: { label: 'Tattoo designs', field: 'tattoos', group: 'ink' },
      piercing: { label: 'Piercings', field: 'piercings', group: 'ink' },
      shell: { label: 'Shell finish', field: 'kit.shell', group: 'kit' },
      hardware: { label: 'Hardware', field: 'kit.hardware', group: 'kit' },
      head: { label: 'Kick-drum head', field: 'kit.head', group: 'kit' },
      throne: { label: 'Throne', field: 'kit.throne', group: 'kit' },
      sticks: { label: 'Sticks', field: 'kit.sticks', group: 'kit' },
      kitExtra: { label: 'Extras', field: 'kit.extras', group: 'kit' }
    },
    parts: parts,
    builds: { slim: 0.9, average: 1.0, stocky: 1.1, big: 1.2 },
    knuckleMax: 4,
    swatches: {
      skin: ['#f6dcc6', '#f1d0b1', '#e9c39b', '#e0b08a', '#d8a67c', '#c68c5f', '#b07a50', '#8d5a3b', '#7a4a2c', '#5e3a22', '#4a2c1a', '#3a2216'],
      eyes: ['#5a3a22', '#241812', '#3a78c8', '#3f8a4a', '#7a8a96', '#8a6a2a'],
      clothes: ['#141418', '#2c2c34', '#e8e4dc', '#8a8e96', '#b3262b', '#6e1f28', '#d96a1e', '#d9a520', '#1f6f43', '#5f6b2e',
        '#1f7a7a', '#233a66', '#3f5f8f', '#34507a', '#5a2a7a', '#d45a8a', '#6b4a2e', '#a89060'],
      kit: ['#b3262b', '#2f5aa8', '#1f8a4c', '#6a2a8a', '#d9a520', '#9aa2ad', '#141418', '#e8e4dc', '#d96a1e', '#d45a8a', '#1f7a7a', '#4a2c1a']
    },
    // The misspelled word, the band-logo fallback and the custom-text rules (the kit's kick head).
    words: { regerts: 'REGERTS', headTextMax: 14 }
  };
})(window.GG);
