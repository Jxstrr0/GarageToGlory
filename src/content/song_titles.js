// content/song_titles.js: title pools for newly written songs (GG.songs.pickTitle).
// Shape: GG.content.songTitles = { metal: [ { en, fr } ], punk|rock|country: [ 'English title' ] }
//   metal:  titles are English (v0.7.2, owner: "English, Marcel rarely French"). `en` is the song title: overtly metal,
//           and every single one turns out to be about Marcel's lawn. `fr` is Marcel's French original: once in a
//           while (~1 in 8, GG.songs.FR_CHANCE, seeded per career) he sneaks it in anyway: title = fr, titleEn = en,
//           song.fr = true (and the band reacts). Marcel still SINGS everything in French; a fan translates the lyrics.
//           Keep every `fr` string stable: old saves' French titles are renamed to `en` on load by matching `fr`.
//   punk/rock/country: plain English strings (title only). These bands ship in v0.9.
// The two metal starter songs live in bands.js and are deliberately NOT in this pool (no duplicates).
(function (GG) {
  GG.content.songTitles = {
    metal: [
      { en: 'The Green Tomb (It Is the Lawn)', fr: 'Le Tombeau Vert' },
      { en: 'Blood on the Grass (Edging Accident)', fr: 'Sang sur le Gazon' },
      { en: 'Winter Devours My Lawn', fr: "L'Hiver Dévore Mon Gazon" },
      { en: 'Eternal Quackgrass', fr: 'Chiendent Éternel' },
      { en: 'The Lawnmower of Darkness', fr: 'La Tondeuse des Ténèbres' },
      { en: 'Sprinkler Ban (Odd-Numbered Days Only)', fr: 'Arrosage Interdit' },
      { en: 'Gophers from Hell (Are in My Lawn)', fr: "Les Gaufres de l'Enfer" },
      { en: 'Fertilizer of the Night (Slow-Release)', fr: 'Engrais de la Nuit' },
      { en: 'Requiem for a Lawn Mowed Too Short', fr: 'Le Voisin a Coupé Trop Court' },
      { en: 'Dandelion, My Enemy', fr: 'Pissenlit, Mon Ennemi' },
      { en: 'Deadly Dew (Front Lawn, 6 A.M.)', fr: 'Rosée Mortelle' },
      { en: 'Scorched Earth (Brown Patches on My Lawn)', fr: 'Brûlé par le Soleil de Juillet' },
      { en: 'The Fence of Despair (My Lawn Ends Here)', fr: 'La Clôture du Désespoir' },
      { en: 'Deep Roots, Dark Soul (Aerate Your Lawn)', fr: 'Racines Profondes, Âme Sombre' },
      { en: 'Hail upon the Lawn (Claim Pending)', fr: 'Grêle sur la Pelouse' },
      { en: 'Dawn of the Dead Lawn', fr: "L'Aube du Gazon Mort" },
      { en: 'Beneath the Snow, My Lawn Waits', fr: 'Sous la Neige, Mon Gazon Attend' },
      { en: 'The Pact of the Overseed', fr: 'Le Pacte du Semis' },
      { en: 'Sprinkler of Chaos', fr: 'Arroseur du Chaos' },
      { en: "The Neighbour's Dogs (Yellow Lawn Spots)", fr: 'Les Chiens du Voisin' },
      { en: 'Cursed Clover', fr: 'Trèfle Maudit' },
      { en: 'Black Mass for a Green Lawn', fr: 'Messe Noire pour un Gazon Vert' },
      { en: 'The Rake of the Abyss', fr: "Le Râteau de l'Abîme" },
      { en: 'Three Centimetres or Death (Mowing Height)', fr: 'Trois Centimètres ou la Mort' },
      { en: 'The Blood-Red Garden Hose', fr: "Le Tuyau d'Arrosage Sanglant" },
      { en: 'Eternal Thatch', fr: 'Chaume Éternel' },
      { en: 'King of the Weeds (Not on My Lawn)', fr: 'Le Roi des Mauvaises Herbes' },
      { en: 'Artificial Turf Is Blasphemy', fr: 'Gazon Synthétique: Blasphème' },
      { en: 'Ritual of the First Mow', fr: 'Rituel de la Première Tonte' },
      { en: 'Earthworm Brotherhood (Under the Lawn)', fr: 'Les Vers de Terre Sont Mes Frères' },
      { en: 'Rain Invocation (My Lawn Is Thirsty)', fr: 'Invocation de la Pluie' },
      { en: 'The Autumn Leaves Must Die (Rake the Lawn)', fr: "Les Feuilles d'Automne Doivent Mourir" },
      { en: 'My Lawn, My Queen', fr: 'Mon Gazon, Ma Reine' },
      { en: 'The Scarecrow of Gravelbourg (Lawn Guard)', fr: "L'Épouvantail de Gravelbourg" },
      { en: 'Midnight Mow', fr: 'Tonte à Minuit' },
      { en: 'The Last Blade of Grass', fr: 'Le Dernier Brin' },
      { en: 'Razor-Sharp Edging', fr: 'Bordures Tranchantes' },
      { en: 'Keep Off the Lawn (Or Perish)', fr: 'Pelouse Interdite' },
      { en: 'Reign of Sod', fr: 'Le Règne du Gazon' },
      { en: 'Crabgrass Apocalypse', fr: 'Apocalypse de la Digitaire' },
      { en: 'Throne of Sod', fr: 'Le Trône de Gazon' },
      { en: 'Hymn to the Riding Mower', fr: 'Hymne à la Tondeuse Autoportée' },
      { en: 'Grub Worms Must Burn (Save the Lawn)', fr: 'Les Vers Blancs Doivent Brûler' },
      { en: 'Doomsday Aeration (Lawn Plugs Everywhere)', fr: "L'Aération du Jugement Dernier" },
      { en: 'Bylaw of the Damned (Grass Over 15 cm)', fr: 'Le Règlement des Damnés' },
      { en: 'Where the Dandelions Scream', fr: 'Là Où Crient les Pissenlits' }
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
