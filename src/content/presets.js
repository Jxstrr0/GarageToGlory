// content/presets.js: starting looks for the player (the drummer) in the character creator.
// Shape: GG.content.presets = [ { id, name, blurb, look: LOOK, kitColor: '#rrggbb' } ]. The first entry is the default.
(function (GG) {
  GG.content.presets = [
    { id: 'denim_tuxedo', name: 'Denim Tuxedo',
      blurb: 'Jean jacket, jeans, total confidence. Formal wear for the Legion.',
      look: { skin: '#e9c39b', hair: '#5a3a22', hairStyle: 'short', shirt: '#3f5f8f', pants: '#34507a',
        height: 1.0, build: 1.0, extras: [] },
      kitColor: '#2f5aa8' },
    { id: 'toque_flannel', name: 'Toque & Flannel',
      blurb: 'Red flannel and a toque, indoors, all year. Rated to minus forty.',
      look: { skin: '#f2d2b0', hair: '#7a4b2a', hairStyle: 'short', shirt: '#b3372f', pants: '#3b4a5e',
        height: 1.02, build: 1.1, extras: ['hat', 'beard'] },
      kitColor: '#b3372f' },
    { id: 'hockey_hair', name: 'Hockey Hair',
      blurb: 'Business in the front, bonspiel in the back. The moustache is load-bearing.',
      look: { skin: '#dcae86', hair: '#8a5a2b', hairStyle: 'mullet', shirt: '#1f6f43', pants: '#2c3440',
        height: 1.0, build: 1.05, extras: ['moustache'] },
      kitColor: '#1f8a4c' },
    { id: 'basement_goth', name: 'Basement Goth',
      blurb: "All black, eyeliner, SPF 100. Hasn't seen the sun since grade nine.",
      look: { skin: '#f4dcc8', hair: '#0e0e12', hairStyle: 'long', shirt: '#15151a', pants: '#1c1c22',
        height: 0.98, build: 0.92, extras: ['tattoos'] },
      kitColor: '#6a2a8a' },
    { id: 'farm_auction', name: 'Farm Auction Chic',
      blurb: 'Seed-company cap, work shirt, boots that have seen things. Bids on everything.',
      look: { skin: '#8d5a3b', hair: '#1e1612', hairStyle: 'cap', shirt: '#6b7f3a', pants: '#4a3f33',
        height: 1.05, build: 1.1, extras: ['sunglasses'] },
      kitColor: '#d9a520' },
    { id: 'curling_cardigan', name: 'Curling Cardigan',
      blurb: "Grandpa's lucky bonspiel sweater. Warm, slightly moth-eaten, undefeated.",
      look: { skin: '#c68b62', hair: '#2b2220', hairStyle: 'bun', shirt: '#8c6d4f', pants: '#303642',
        height: 0.95, build: 1.0, extras: ['glasses'] },
      kitColor: '#9aa2ad' }
  ];
})(window.GG);
