// map.js: the stylized regional map for the gig board (owned by the WORLD agent). v0.3 = Saskatchewan core
// (owner decision 2026-09-29). Other provinces and regions add more maps later.
//   cities: { <cityId>: { id, name, x, y, blurb, label?: 'left'|'right'|'above' (label side on the map; default below) } }  x/y = pin position in a 0..1 box (0,0 = top-left, north up;
//           stylized: Warman and Martensville are nudged apart so their pins don't overlap)
//   roads:  [ [cityA, cityB, km, highway] ]  real-ish road distances; 26_sim_world finds shortest paths
//   rivers / lakes: decorative polylines / ellipses in the same box
(function (GG) {
  GG.content.map = {
    id: 'sask_core', name: 'Saskatchewan', sub: 'The core. Flat, wide, and full of gigs.',
    cities: {
      saskatoon: { id: 'saskatoon', name: 'Saskatoon', x: 0.3, y: 0.42, blurb: 'Home. Eight bridges, one garage.' },
      martensville: { id: 'martensville', name: 'Martensville', x: 0.24, y: 0.28, label: 'above', blurb: 'Ten minutes north. Has a skatepark and opinions.' },
      warman: { id: 'warman', name: 'Warman', x: 0.4, y: 0.28, label: 'right', blurb: 'Curling capital of the immediate area.' },
      prince_albert: { id: 'prince_albert', name: 'Prince Albert', x: 0.47, y: 0.1, label: 'right', blurb: 'Gateway to the North. Bring bug spray.' },
      north_battleford: { id: 'north_battleford', name: 'North Battleford', x: 0.08, y: 0.18, label: 'right', blurb: 'Where the Yellowhead gets serious.' },
      yorkton: { id: 'yorkton', name: 'Yorkton', x: 0.88, y: 0.54, label: 'left', blurb: 'Pyrohy country. Come hungry.' },
      regina: { id: 'regina', name: 'Regina', x: 0.64, y: 0.74, label: 'right', blurb: 'The Queen City. Flatter than a drum skin.' },
      moose_jaw: { id: 'moose_jaw', name: 'Moose Jaw', x: 0.47, y: 0.79, blurb: 'Tunnels, a giant moose, questionable history.' },
      swift_current: { id: 'swift_current', name: 'Swift Current', x: 0.15, y: 0.84, blurb: "Speedy Creek. It isn't speedy." }
    },
    roads: [
      ['saskatoon', 'martensville', 12, 'Hwy 12'],
      ['saskatoon', 'warman', 23, 'Hwy 11'],
      ['martensville', 'warman', 12, 'Hwy 305'],
      ['warman', 'prince_albert', 118, 'Hwy 11'],
      ['saskatoon', 'north_battleford', 138, 'Yellowhead (Hwy 16)'],
      ['north_battleford', 'prince_albert', 144, 'Hwy 40'],
      ['saskatoon', 'yorkton', 330, 'Yellowhead (Hwy 16)'],
      ['saskatoon', 'regina', 239, 'Hwy 11'],
      ['saskatoon', 'moose_jaw', 220, 'Hwy 11 / Hwy 2'],
      ['saskatoon', 'swift_current', 245, 'Hwy 7 / Hwy 4'],
      ['regina', 'moose_jaw', 71, 'Trans-Canada (Hwy 1)'],
      ['moose_jaw', 'swift_current', 174, 'Trans-Canada (Hwy 1)'],
      ['regina', 'yorkton', 187, 'Hwy 10']
    ],
    rivers: [
      [[0.0, 0.7], [0.1, 0.63], [0.2, 0.58], [0.25, 0.5], [0.3, 0.42], [0.36, 0.32], [0.44, 0.2], [0.52, 0.1], [0.62, 0.04]],
      [[0.0, 0.2], [0.08, 0.18], [0.2, 0.15], [0.34, 0.13], [0.47, 0.1], [0.62, 0.04]]
    ],
    lakes: [
      { x: 0.17, y: 0.6, rx: 0.07, ry: 0.022, name: 'Lake Diefenbaker' },
      { x: 0.56, y: 0.57, rx: 0.025, ry: 0.07, name: 'Last Mountain Lake' }
    ]
  };
})(window.GG);
