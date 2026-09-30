// content/logo.js (v0.8.1, Addendum 2 D2, LOGO): the band logo. Emblems, lettering styles, curated colour pairs, each band's
// default logo, a fixed logo for every rival + scene band, the Rebrand price and the group-chat lines. Pure data: GG.logo
// (src/2e_sim_logo.js) reads it, GG.render.logo (src/46_render_logo.js) draws it (procedurally; no image files).
// Shape: GG.content.logo = {
//   emblems: [{ id (C.LOGO_EMBLEMS + additions), name, art: { scale, dy, spin } }]   art = how the renderer places the emblem
//     (scale 0.6..1.1 of the logo's box, dy = shift in box units, spin = tilt in radians). The list only grows (D6: add, don't
//     shrink); the first twelve are the owner's starting set in C.LOGO_EMBLEMS order.
//   styles: [{ id (C.LOGO_STYLES), name, blurb, genre }]   metal = spiky unreadable, punk = cut-out ransom, rock = chrome '80s,
//     country = western slab. Any genre may use any style; the band's default is its genre's.
//   palettes: [{ id, name, fg (the lettering), em (the emblem), ground (outlines + badge backgrounds; dark or light) }]
//   bands: { <bandId>: { emblem, style, palette } }   (the four playable bands' default logos)
//   rivals: { <rivalId | scene band id>: { emblem, style, palette } | { same: <rivalId> } }   (fixed; the renderer is the same)
//   rebrand: { cost: { <era>: $ }, buzz }   ("small fee + a little buzz")
//   lines: { picked: [{ who, text }], rebrand: [{ who, text }] }   (group chat; who falls back to the first active member)
// }
(function (GG) {
  GG.content.logo = {
    emblems: [
      { id: 'skull', name: 'Skull', art: { scale: 0.9, dy: 0 } },
      { id: 'wheat', name: 'Wheat sheaf', art: { scale: 0.95, dy: 0 } },
      { id: 'bolt', name: 'Lightning bolt', art: { scale: 0.95, dy: 0, spin: 0.08 } },
      { id: 'moose', name: 'Moose', art: { scale: 1, dy: 0.02 } },
      { id: 'maple', name: 'Maple leaf', art: { scale: 0.95, dy: 0 } },
      { id: 'gopher', name: 'Gopher', art: { scale: 0.95, dy: 0 } },
      { id: 'anvil', name: 'Anvil', art: { scale: 1, dy: 0.04 } },
      { id: 'hailstone', name: 'Hailstone', art: { scale: 0.95, dy: 0 } },
      { id: 'elevator', name: 'Grain elevator', art: { scale: 0.95, dy: 0 } },
      { id: 'cowboy_hat', name: 'Cowboy hat', art: { scale: 1.05, dy: 0 } },
      { id: 'safety_pin', name: 'Safety pin', art: { scale: 1, dy: 0, spin: -0.5 } },
      { id: 'flaming_tire', name: 'Flaming tire', art: { scale: 0.95, dy: 0.02 } },
      // v0.8.1 additions (D6: the list grows)
      { id: 'curling_stone', name: 'Curling stone', art: { scale: 0.95, dy: 0.02 } },
      { id: 'mosquito', name: 'Mosquito', art: { scale: 1, dy: 0 } },
      { id: 'toque', name: 'Toque', art: { scale: 0.95, dy: 0 } }
    ],
    styles: [
      { id: 'metal', name: 'Spiky', blurb: 'Unreadable. Perfect. Looks like a root system in a blizzard.', genre: 'metal' },
      { id: 'punk', name: 'Ransom note', blurb: 'Cut out of flyers and a church bulletin, one letter at a time.', genre: 'punk' },
      { id: 'rock', name: "Chrome '80s", blurb: 'Airbrushed chrome. A lens flare. Leather pants implied.', genre: 'rock' },
      { id: 'country', name: 'Western slab', blurb: 'Big slab letters on an arch, like a feed-store sign.', genre: 'country' }
    ],
    palettes: [
      { id: 'frost', name: 'Frostbite', fg: '#e6f6ff', em: '#3b8fd9', ground: '#0b1422' },
      { id: 'blood', name: 'Blood & bone', fg: '#f2ead8', em: '#b3141c', ground: '#130b0b' },
      { id: 'canola', name: 'Canola field', fg: '#ffd400', em: '#3f8a2e', ground: '#0f1d0c' },
      { id: 'rider', name: 'Rider green', fg: '#ffffff', em: '#1f8a3a', ground: '#0a2212' },
      { id: 'chrome', name: 'Chrome & neon', fg: '#eef3fa', em: '#ff3aa6', ground: '#170619' },
      { id: 'rust', name: 'Rust bucket', fg: '#f6c894', em: '#b24a1c', ground: '#1e1108' },
      { id: 'hazard', name: 'Hazard tape', fg: '#161616', em: '#f5c400', ground: '#f6efd8' },
      { id: 'denim', name: 'Denim & rhinestone', fg: '#f5f6fb', em: '#4a72b8', ground: '#0d1628' },
      { id: 'sunset', name: 'Prairie sunset', fg: '#ffd27a', em: '#e0521e', ground: '#2a0c12' },
      { id: 'ice', name: 'Black ice', fg: '#d8e0e8', em: '#6b7784', ground: '#08090d' },
      { id: 'pink', name: 'Punk pink', fg: '#16161a', em: '#f0609f', ground: '#fbe9f1' },
      { id: 'gold', name: 'Gold record', fg: '#ffd84a', em: '#9a7420', ground: '#140f04' },
      { id: 'maple', name: 'Maple red', fg: '#ffffff', em: '#d8281c', ground: '#2a0707' },
      { id: 'slime', name: 'Slough slime', fg: '#b8ff3c', em: '#7a34b0', ground: '#130a1c' }
    ],
    bands: {
      hail_damage: { emblem: 'hailstone', style: 'metal', palette: 'frost' },
      frost_heave: { emblem: 'safety_pin', style: 'punk', palette: 'hazard' },
      gravel_kings: { emblem: 'bolt', style: 'rock', palette: 'chrome' },
      grid_road_ramblers: { emblem: 'cowboy_hat', style: 'country', palette: 'sunset' }
    },
    rivals: {
      tundra_wraith: { emblem: 'skull', style: 'metal', palette: 'ice' },
      mall_rats: { emblem: 'safety_pin', style: 'punk', palette: 'slime' },
      chartbusters: { emblem: 'bolt', style: 'rock', palette: 'gold' },
      buckle_and_boot: { emblem: 'flaming_tire', style: 'country', palette: 'rust' },
      // the scene leaderboard's filler bands (content.rivalry.scene)
      snowplows: { emblem: 'toque', style: 'punk', palette: 'frost' },
      maple_syrup_riot: { emblem: 'maple', style: 'punk', palette: 'maple' },
      kettle_chips: { emblem: 'wheat', style: 'country', palette: 'canola' },
      dj_poutine: { emblem: 'bolt', style: 'rock', palette: 'slime' },
      grain_elevator_gods: { emblem: 'elevator', style: 'metal', palette: 'sunset' },
      pothole_prophets: { emblem: 'flaming_tire', style: 'rock', palette: 'hazard' },
      canola_coven: { emblem: 'wheat', style: 'metal', palette: 'canola' },
      the_gophers: { emblem: 'gopher', style: 'metal', palette: 'blood' },
      prairie_oysters: { emblem: 'cowboy_hat', style: 'country', palette: 'gold' },
      hoarfrost: { emblem: 'moose', style: 'metal', palette: 'frost' },
      block_heaters: { emblem: 'curling_stone', style: 'rock', palette: 'rider' },
      mall_rats_scene: { same: 'mall_rats' },
      chartbusters_scene: { same: 'chartbusters' },
      buckle_boot_scene: { same: 'buckle_and_boot' },
      // v0.9: Tundra Wraith's scene row, the playable bands' cameo rows (owner Q8: their default logos) and the new locals
      tundra_wraith_scene: { same: 'tundra_wraith' },
      hail_damage_scene: { emblem: 'hailstone', style: 'metal', palette: 'frost' },
      frost_heave_scene: { emblem: 'safety_pin', style: 'punk', palette: 'hazard' },
      gravel_kings_scene: { emblem: 'bolt', style: 'rock', palette: 'chrome' },
      grid_road_ramblers_scene: { emblem: 'cowboy_hat', style: 'country', palette: 'sunset' },
      pumpjacks: { emblem: 'anvil', style: 'rock', palette: 'rust' },
      chinook_arch_angels: { emblem: 'cowboy_hat', style: 'country', palette: 'denim' },
      coulee_crows: { emblem: 'mosquito', style: 'punk', palette: 'pink' },
      deerfoot_rush: { emblem: 'flaming_tire', style: 'metal', palette: 'blood' },
      cypress_hills_drifters: { emblem: 'wheat', style: 'country', palette: 'sunset' },
      gull_lake_gulls: { emblem: 'toque', style: 'punk', palette: 'rider' }
    },
    rebrand: { cost: { garage: 150, local: 300, signed: 600, world: 900 }, buzz: 3 },
    lines: {
      picked: [
        { who: 'marcel', text: 'The logo is final. I have already practised signing it. It takes eleven minutes.' },
        { who: 'rox', text: 'Logo is done. Photocopied it 400 times at the library. The librarian is now a fan.' },
        { who: 'chase', text: 'That logo is going on a jacket. My jacket. Maybe an airbrushed van. Dream big.' },
        { who: 'travis', text: 'Logo looks like it belongs on a feed-store sign. That is the highest compliment I know.' }
      ],
      rebrand: [
        { who: 'marcel', text: 'A new logo. The old one will live on in my heart, and on the 200 stickers in my trunk.' },
        { who: 'dana', text: 'New logo. I will be re-drawing it on every set list by hand. Worth it.' },
        { who: 'rox', text: 'Rebranded. Selling out, or buying in? Either way the old stickers are going on the fridge.' },
        { who: 'chase', text: 'New look, new us. I have told three radio stations. None of them asked.' },
        { who: 'travis', text: 'New logo. Mama says the old one was fine. Mama is not wrong, but here we are.' }
      ]
    }
  };
})(window.GG);
