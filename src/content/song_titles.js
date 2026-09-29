// content/song_titles.js: title pools for newly written songs (GG.songs.pickTitle).
// Shape: GG.content.songTitles = { metal: [ { fr, en } ], punk|rock|country: [ 'English title' ] }
//   metal:  Marcel names every song in French ({ fr, en }). The English is ALWAYS about his lawn; nobody in
//           the band knows this until a fan translates it. Song title = fr, titleEn = en.
//   punk/rock/country: plain English strings (title only). These bands ship in v0.9.
// The two metal starter songs live in bands.js and are deliberately NOT in this pool (no duplicates).
(function (GG) {
  GG.content.songTitles = {
    metal: [
      { fr: 'Le Tombeau Vert', en: 'The Green Tomb (It Is the Lawn)' },
      { fr: 'Sang sur le Gazon', en: 'Blood on the Grass (Edging Accident)' },
      { fr: "L'Hiver Dévore Mon Gazon", en: 'Winter Devours My Lawn' },
      { fr: 'Chiendent Éternel', en: 'Eternal Quackgrass' },
      { fr: 'La Tondeuse des Ténèbres', en: 'The Lawnmower of Darkness' },
      { fr: 'Arrosage Interdit', en: 'Sprinkler Ban (Odd-Numbered Days Only)' },
      { fr: "Les Gaufres de l'Enfer", en: 'Gophers from Hell (Are in My Lawn)' },
      { fr: 'Engrais de la Nuit', en: 'Lawn Fertilizer of the Night (Slow-Release)' },
      { fr: 'Le Voisin a Coupé Trop Court', en: 'The Neighbour Mowed His Grass Too Short' },
      { fr: 'Pissenlit, Mon Ennemi', en: 'Dandelion, My Enemy (In My Lawn)' },
      { fr: 'Rosée Mortelle', en: 'Deadly Dew (On My Lawn at 6 A.M.)' },
      { fr: 'Brûlé par le Soleil de Juillet', en: 'Scorched by the July Sun (Brown Patches on My Lawn)' },
      { fr: 'La Clôture du Désespoir', en: 'The Fence of Despair (My Lawn Ends Here)' },
      { fr: 'Racines Profondes, Âme Sombre', en: 'Deep Roots, Dark Soul (Aerate Your Lawn Annually)' },
      { fr: 'Grêle sur la Pelouse', en: 'Hail on the Lawn' },
      { fr: "L'Aube du Gazon Mort", en: 'Dawn of the Dead Lawn' },
      { fr: 'Sous la Neige, Mon Gazon Attend', en: 'Beneath the Snow, My Lawn Waits' },
      { fr: 'Le Pacte du Semis', en: 'The Pact of the Overseed (Lawn Care)' },
      { fr: 'Arroseur du Chaos', en: 'Sprinkler of Chaos (Front Lawn)' },
      { fr: 'Les Chiens du Voisin', en: "The Neighbour's Dogs (Yellow Spots on My Lawn)" },
      { fr: 'Trèfle Maudit', en: 'Cursed Clover (In My Lawn)' },
      { fr: 'Messe Noire pour un Gazon Vert', en: 'Black Mass for a Green Lawn' },
      { fr: "Le Râteau de l'Abîme", en: 'The Rake of the Abyss (Leaves Off the Lawn)' },
      { fr: 'Trois Centimètres ou la Mort', en: 'Three Centimetres or Death (Proper Mowing Height)' },
      { fr: "Le Tuyau d'Arrosage Sanglant", en: 'The Blood-Red Garden Hose (For the Lawn)' },
      { fr: 'Chaume Éternel', en: 'Eternal Thatch (Dethatch Your Lawn)' },
      { fr: 'Le Roi des Mauvaises Herbes', en: 'King of the Weeds (Not on My Lawn)' },
      { fr: 'Gazon Synthétique: Blasphème', en: 'Artificial Turf Is Blasphemy' },
      { fr: 'Rituel de la Première Tonte', en: 'Ritual of the First Mow of Spring' },
      { fr: 'Les Vers de Terre Sont Mes Frères', en: 'The Earthworms Under My Lawn Are My Brothers' },
      { fr: 'Invocation de la Pluie', en: 'Rain Invocation (My Lawn Is Thirsty)' },
      { fr: "Les Feuilles d'Automne Doivent Mourir", en: 'The Autumn Leaves Must Die (Rake the Lawn)' },
      { fr: 'Mon Gazon, Ma Reine', en: 'My Lawn, My Queen' },
      { fr: "L'Épouvantail de Gravelbourg", en: 'The Scarecrow of Gravelbourg (Guards My Lawn)' },
      { fr: 'Tonte à Minuit', en: 'Midnight Mow' },
      { fr: 'Le Dernier Brin', en: 'The Last Blade of Grass' },
      { fr: 'Bordures Tranchantes', en: 'Razor-Sharp Lawn Edging' },
      { fr: 'Pelouse Interdite', en: 'Keep Off the Lawn' }
    ],
    punk: [
      'Bylaw 4471', 'Minutes of the Last Meeting', 'Snow Route Parking Ban',
      'Two Chords and a Grudge', 'Laundromat Riot', 'Transit Fare Hike (Must Die)',
      'The Mayor Owes Me a Bus', 'Banned from the Warehouse Club'
    ],
    rock: [
      'Big Sky, Bigger Hair', 'Highway 16 Heartache', 'Strip Mall Paradise',
      '1985 Forever', 'Floss Before the Encore', 'Hot Pavement, Cold Heart',
      'Riff (Settled Out of Court)', 'Block Heater Blues'
    ],
    country: [
      'Grid Road Goodbye', 'Quonset Hut Heart', 'Canola Yellow',
      'She Left Me for a Combine', 'The Hat Is the Song', 'Gravel in My Coffee',
      'Tailgates Are for Quitters', 'Twelve Grain Elevators to Home'
    ]
  };
})(window.GG);
