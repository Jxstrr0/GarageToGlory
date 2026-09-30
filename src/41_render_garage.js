// 41_render_garage.js: the parents' garage — the band's home base and the game's main menu.
// A cutaway diorama (floor slab + back and right walls) seen from the front-left: one warm bulb inside,
// cool moonlight through the garage-door windows, the yard outside changing with the seasons. Seven hotspots (C.HOTSPOTS) each get a
// floating label; tap the floor to walk, a hotspot to walk there and open it, a bandmate to chat.
// Characters are blocky low-poly people built from LOOK as ONE skinned mesh each (buildCharacter is
// exported for later scenes: stage, van, red carpet). Everything static is merged by material.
// Draw calls ≈ room 1 + glows 1 + moon shafts 1 + dust 1 + banner 1 + bulb 3 + kit 1 + people 5 + blob shadows 1
//              + yard (ground, weather, seasonal prop) 3 + labels 7 + walk ring 1 = 26.
(function (GG) {
  var R = GG.render;
  if (!R || !R.defineScene) return;
  var THREE = null;                          // set when the scene is first built (after init)

  // ---- Layout (metres, y up; back wall at z = z0, right wall at x = x1, front/left cut away) -------
  // A deep single-and-a-half garage: narrow enough that the whole room fills a portrait phone's width.
  var ROOM = { x0: -2.3, x1: 2.3, z0: -2.7, z1: 2.7, h: 2.7, wall: 0.15 };
  var CAM = { yaw: 0.36, pitch: 0.82, fov: 32, follow: 0.1, target: [0, 0.8, 0] };
  var WALK = { speed: 1.9, accel: 6, decel: 4.5, minSpeed: 0.3, margin: 0.3, inflate: 0.2, stride: 1.3 };
  var CHAR_SCALE = 1.18;                              // people read better a touch larger than life
  var SULK_MOOD = 30;                                 // mood below this: sulking on the couch, headphones on
  var MAX_PEOPLE = 8;
  var DEFAULT_KIT = '#b3262b';
  var CAPE_VARIANTS = { velvet: 1, curtain: 1, charred: 1, fireproof: 1 };
  // Outside the garage by season: ground tint + weather particles (count, colour, size, motion).
  var SEASONS = {
    summer: { ground: 0x17271c, color: 0xd8f06a, size: 0.13, opacity: 1, count: 60, hover: true, blink: true, glow: true },
    fall: { ground: 0x251f14, color: 0xd9822b, size: 0.12, opacity: 0.95, count: 80, speed: [0.3, 0.55], sway: 0.35 },
    winter: { ground: 0x243048, color: 0xe8efff, size: 0.11, opacity: 0.8, count: 150, speed: [0.25, 0.5], sway: 0.15 },
    spring: { ground: 0x1b261d, color: 0x9ab8e8, size: 0.065, opacity: 0.7, count: 150, speed: [2.6, 3.4], sway: 0.02 }
  };
  // Week of year (1..24) -> season (v0.6.1 calendar, C.SEASONS): summer 23–4, fall 5–10, winter 11–16, spring 17–22.
  function seasonOf(week) {
    if (GG.calendar) return GG.calendar.season(week);
    var w = ((Math.max(1, week | 0) - 1) % 24) + 1;
    return w <= 4 || w >= 23 ? 'summer' : w <= 10 ? 'fall' : w <= 16 ? 'winter' : 'spring';
  }

  // Every prop's place. Back-wall props take x (they hang on z = z0), right-wall props take z (x = x1),
  // floor props take x, z and yaw (their front faces local +z). Later upgrades (beer fridge, egg-crate
  // foam, better couch) slot in here.
  var PROPS = {
    trophies: { x: -1.5 }, amps: { x: -0.45 }, door: { x: 1.08, w: 2.3 }, bass: { x: -2.13 },
    cork: { z: -1.15 }, board: { z: 0.4 }, couch: { z: 1.85 }, outlet: { z: -0.45 },
    kit: { x: -0.55, z: -0.55, yaw: -0.35 }, mirror: { x: -1.74, z: 0.02, yaw: 0.54 },
    cooler: { x: 0.05, z: 1.72, yaw: 0 }, merch: { x: -1.85, z: 2.2, yaw: 0.3 }, mower: { x: 1.92, z: -2.08, yaw: -0.5 },
    crate: { x: -1.92, z: -2.22, yaw: 0.25 }, bucket: { x: 0.98, z: 0.95 }, heater: { x: 1.12, z: 2.42, yaw: 0.45 },
    pizza: { x: -0.8, z: 1.5, yaw: 0.35 }, bulb: { x: 0.2, z: -0.2 }
  };
  var KIT = PROPS.kit, X1 = ROOM.x1, Z0 = ROOM.z0, KIT_SCALE = 1.15;   // kit scaled like the people
  var DOOR_SEC = 2.15 / 4;                            // height of one garage-door section (4 sections)

  // Hotspots: hit box [cx, cy, cz, w, h, d] (world, generous for thumbs), label position, where the
  // player stands to use it and which way he faces there (yaw: 0 = +z, PI/2 = +x).
  var HOTSPOTS = [
    { action: 'door', label: 'Garage door', box: [PROPS.door.x, 1.08, Z0 + 0.1, 2.35, 2.16, 0.3], at: [PROPS.door.x, 2.42, Z0 + 0.12], stand: [1.0, -1.9], face: Math.PI },
    { action: 'trophies', label: 'Trophies', box: [PROPS.trophies.x, 1.72, Z0 + 0.18, 1.3, 0.62, 0.4], at: [PROPS.trophies.x, 2.16, Z0 + 0.2], stand: [-1.45, -1.72], face: Math.PI },
    { action: 'gigboard', label: 'Gig board', box: [X1 - 0.12, 1.38, PROPS.cork.z, 0.3, 0.9, 1.15], at: [X1 - 0.15, 1.98, PROPS.cork.z], stand: [1.62, PROPS.cork.z], face: Math.PI / 2 },
    { action: 'plan', label: 'Plan week', box: [X1 - 0.12, 1.4, PROPS.board.z, 0.3, 1.05, 1.6], at: [X1 - 0.15, 2.1, PROPS.board.z], stand: [1.6, PROPS.board.z], face: Math.PI / 2 },
    { action: 'kit', label: 'Drum kit', box: [KIT.x, 0.6, KIT.z, 1.5, 1.25, 1.35], at: [KIT.x - 0.05, 1.72, KIT.z + 0.05], stand: null, face: KIT.yaw },
    { action: 'laptop', label: 'Laptop', box: [PROPS.cooler.x, 0.5, PROPS.cooler.z, 0.8, 1.0, 0.65], at: [PROPS.cooler.x, 1.08, PROPS.cooler.z - 0.05], stand: [PROPS.cooler.x, 2.38], face: Math.PI },
    { action: 'merch', label: 'Merch', box: [PROPS.merch.x, 0.55, PROPS.merch.z, 0.85, 1.1, 0.85], at: [PROPS.merch.x, 1.32, PROPS.merch.z - 0.05], stand: [-1.2, 2.2], face: -Math.PI / 2 }
  ];

  // Where bandmates hang out, by idle type (content: member.idle). seat = seat height (sitting).
  var SPOTS = {
    mirror: { x: -1.32, z: 0.72, yaw: -2.6 },
    noodle: { x: -0.85, z: -1.95, yaw: -0.2 },
    lunch: { x: PROPS.bucket.x, z: PROPS.bucket.z, yaw: -0.6, seat: 0.4 },
    corner: { x: PROPS.crate.x, z: PROPS.crate.z, yaw: 0.25, seat: 0.34 },
    phone: { x: 0.95, z: -0.35, yaw: -0.6 },
    pace: { x: 0.55, z: 0.1, yaw: -0.4 }
  };
  var SPARE = [{ x: 0.9, z: -0.1, yaw: -0.5 }, { x: -0.35, z: 0.9, yaw: -0.3 }, { x: 1.25, z: -0.75, yaw: -0.9 }, { x: -1.6, z: -0.2, yaw: 0.3 }];
  var COUCH_SEATS = [{ x: X1 - 0.48, z: PROPS.couch.z - 0.49, yaw: -Math.PI / 2, seat: 0.42 }, { x: X1 - 0.48, z: PROPS.couch.z, yaw: -Math.PI / 2, seat: 0.42 },
    { x: X1 - 0.48, z: PROPS.couch.z + 0.49, yaw: -Math.PI / 2, seat: 0.42 }, { x: 1.15, z: 1.35, yaw: -1.9, seat: 0.12 }];
  var PLAYER_SPAWN = { x: 0.35, z: 0.35, yaw: -0.45 };

  // Built-in looks for when neither the save nor content has one (content usually does).
  var DEFAULT_LOOKS = {
    marcel: { skin: '#e8c09c', hair: '#1b1411', hairStyle: 'long', shirt: '#19191e', pants: '#26262e', height: 1.06, build: 1.0, extras: ['moustache'] },
    dana: { skin: '#8a5634', hair: '#17110d', hairStyle: 'bun', shirt: '#b52a2a', pants: '#2e3b5a', height: 0.97, build: 0.95, extras: [] },
    jaxon: { skin: '#f1d0b1', hair: '#7a4b24', hairStyle: 'cap', shirt: '#6d7f99', pants: '#2a2d36', height: 0.94, build: 0.92, extras: [] },
    kenji: { skin: '#d8b08a', hair: '#0d0d10', hairStyle: 'short', shirt: '#141417', pants: '#141417', height: 1.02, build: 1.0, extras: ['sunglasses'] },
    player: { skin: '#f0c9a4', hair: '#5c3a22', hairStyle: 'mullet', shirt: '#e1a236', pants: '#34405e', height: 1.0, build: 1.05, extras: [] }
  };
  // Optional renderer-only style hints (LOOK has no garment field; look.top overrides these).
  // top: 'tee' | 'longsleeve' | 'flannel' | 'hoodie' | 'jacket'
  var STYLE_HINTS = { marcel: { top: 'tee' }, dana: { top: 'flannel' }, jaxon: { top: 'hoodie' }, kenji: { top: 'jacket' } };
  var DEFAULT_IDLE = { marcel: 'mirror', dana: 'noodle', jaxon: 'lunch', kenji: 'corner' };
  var CAPES = {
    velvet: { out: 0x4a1d6e, lining: 0x9b1b2a, trim: 0xd4a940, collar: true, clasp: true },
    curtain: { out: 0xd6a53c, lining: 0xc99a36, dots: [0xc85a78, 0x5f8f45], rings: true },
    charred: { out: 0x1e1a18, lining: 0x2b2522, jagged: true, embers: true },
    fireproof: { out: 0xc3c8d0, lining: 0xb4bac4, bands: 0xd8e84a, collar: true }
  };

  // ---- Characters ------------------------------------------------------------------------------------------------
  // One skeleton for everyone. Toggle bones (gear, headphones, held item, floor prop) hide their parts by
  // scaling to 0, so moods and props never need a rebuild.
  var B_ROOT = 0, B_HIPS = 1, B_SPINE = 2, B_HEAD = 3, B_ARM_L = 4, B_FORE_L = 5, B_ARM_R = 6, B_FORE_R = 7,
    B_LEG_L = 8, B_SHIN_L = 9, B_LEG_R = 10, B_SHIN_R = 11, B_CAPE1 = 12, B_CAPE2 = 13,
    B_GEAR = 14, B_PHONES = 15, B_HELD = 16, B_FLOOR = 17;
  var HIPS_Y = 0.86;
  // [parent, x, y, z] joint positions in character space (feet at the origin, facing +z; left = +x).
  function jointLayout(bw) {
    var sx = 0.25 * bw + 0.075, hx = 0.11 * bw, cz = -0.15 * bw;
    return [
      [-1, 0, 0, 0], [0, 0, HIPS_Y, 0], [1, 0, 0.94, 0], [2, 0, 1.42, 0],
      [2, sx, 1.37, 0], [4, sx, 1.08, 0], [2, -sx, 1.37, 0], [6, -sx, 1.08, 0],
      [1, hx, 0.84, 0], [8, hx, 0.45, 0], [1, -hx, 0.84, 0], [10, -hx, 0.45, 0],
      [2, 0, 1.4, cz], [12, 0, 0.9, cz], [2, 0, 0.94, 0], [3, 0, 1.68, 0], [7, -sx, 0.78, 0], [0, 0, 0, 0]
    ];
  }

  // Fill a (possibly partial or missing) LOOK with defaults and clamp it.
  function normLook(look, id) {
    var d = DEFAULT_LOOKS[id] || DEFAULT_LOOKS.player, hint = STYLE_HINTS[id] || {};
    look = look || d;
    var col = function (v, dv) { return typeof v === 'number' || (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)) ? v : dv; };
    var cl = function (v, lo, hi, dv) { return typeof v === 'number' && isFinite(v) ? Math.min(hi, Math.max(lo, v)) : dv; };
    return {
      skin: col(look.skin, d.skin), hair: col(look.hair, d.hair), hairStyle: look.hairStyle || d.hairStyle,
      shirt: col(look.shirt, d.shirt), pants: col(look.pants, d.pants),
      height: cl(look.height, 0.85, 1.15, d.height || 1), build: cl(look.build, 0.85, 1.25, d.build || 1),
      extras: Array.isArray(look.extras) ? look.extras.slice(0, 6) : [],
      top: look.top || hint.top || 'tee', capColor: col(look.capColor, capFor(col(look.shirt, d.shirt)))
    };
  }
  // Cap colour: classic red, or navy when the shirt is already red-ish (so the cap still reads).
  function capFor(shirt) {
    var c = new THREE.Color(shirt), r = new THREE.Color(0xc0392b);
    return Math.abs(c.r - r.r) + Math.abs(c.g - r.g) + Math.abs(c.b - r.b) < 0.45 ? '#233a66' : '#c0392b';
  }
  // A stable made-up look for unknown member ids (other bands, recruits later).
  function genericLook(id) {
    var h = GG.hashSeed(String(id)), pick = function (a, k) { return a[(h >>> k) % a.length]; };
    return {
      skin: pick(['#f1d0b1', '#e0b08a', '#c68c5f', '#8a5634', '#5e3a22'], 1), hair: pick(['#1b1411', '#5c3a22', '#a86b32', '#d9c27a', '#6b6b6b'], 4),
      hairStyle: pick(['short', 'long', 'mohawk', 'bald', 'bun', 'mullet', 'spiky'], 7), shirt: pick(['#2f6fd1', '#3e8a5a', '#8a3fa0', '#c9772e', '#444a55'], 10),
      pants: pick(['#2a2d36', '#2e3b5a', '#3b3129'], 13), height: 0.95 + ((h >>> 16) % 10) / 100, build: 0.95 + ((h >>> 20) % 15) / 100, extras: []
    };
  }

  // Build the skinned geometry for a LOOK. o: { id, sticks, gear:'guitar', held:'sandwich'|'phone', floorProp:'lunchbox', cape, scale }
  function characterGeometry(ctx, L, o) {
    var b = new ctx.Builder({ skinned: true, jitter: 0.03, seed: ctx.hash(o.id || 'someone') });
    var sh = ctx.shade, bw = L.build, sx = 0.25 * bw + 0.075, hx = 0.11 * bw, fz = 0.135 * bw + 0.004;
    var top = L.top, sleeve = top === 'tee' ? L.skin : L.shirt, shoe = 0x1f1b18, dark = sh(L.shirt, 0.55);
    var i, s;
    // Legs: thighs on the leg bones, shins + shoes on the shin bones.
    for (i = 0; i < 2; i++) {
      s = i ? -1 : 1;
      b.bone = i ? B_SHIN_R : B_SHIN_L;
      b.box(0.15, 0.37, 0.17, s * hx, 0.265, 0, L.pants);
      b.box(0.165, 0.085, 0.28, s * hx, 0.043, 0.035, shoe);
      b.bone = i ? B_LEG_R : B_LEG_L;
      b.box(0.17, 0.41, 0.19, s * hx, 0.645, 0, L.pants);
    }
    b.bone = B_HIPS;
    b.box(0.4 * bw, 0.17, 0.24 * bw, 0, 0.87, 0, L.pants);
    b.box(0.41 * bw, 0.04, 0.25 * bw, 0, 0.945, 0, 0x2a211b);                   // belt
    // Torso: waist + broader chest.
    b.bone = B_SPINE;
    b.box(0.4 * bw, 0.22, 0.24 * bw, 0, 1.06, 0, L.shirt);
    b.box(0.47 * bw, 0.3, 0.27 * bw, 0, 1.3, 0, L.shirt);
    if (top === 'tee') b.box(0.17 * bw, 0.13, 0.01, 0, 1.29, fz, teePrint(ctx, L.shirt));
    else if (top === 'flannel') {
      b.box(0.475 * bw, 0.035, 0.275 * bw, 0, 1.34, 0, dark); b.box(0.405 * bw, 0.035, 0.245 * bw, 0, 1.1, 0, dark);
      b.box(0.035, 0.3, 0.275 * bw, 0.1 * bw, 1.3, 0, dark); b.box(0.035, 0.3, 0.275 * bw, -0.1 * bw, 1.3, 0, dark);
      b.box(0.035, 0.22, 0.245 * bw, 0.1 * bw, 1.06, 0, dark); b.box(0.035, 0.22, 0.245 * bw, -0.1 * bw, 1.06, 0, dark);
      b.box(0.24, 0.05, 0.05, 0, 1.445, 0.11 * bw, dark);                       // collar
    } else if (top === 'hoodie') {
      b.box(0.36 * bw, 0.17, 0.13, 0, 1.44, -0.165 * bw, sh(L.shirt, 0.9));        // hood
      b.box(0.3 * bw, 0.11, 0.012, 0, 1.07, 0.12 * bw + 0.006, sh(L.shirt, 0.84)); // pouch pocket
      b.box(0.016, 0.13, 0.012, 0.05, 1.36, fz + 0.004, 0xe8e4da); b.box(0.016, 0.13, 0.012, -0.05, 1.36, fz + 0.004, 0xe8e4da);
    } else if (top === 'jacket') {
      var inner = luminance(L.shirt) < 0.2 ? 0x3b3b41 : 0xe6e1d6;
      b.box(0.1, 0.28, 0.008, 0, 1.28, fz - 0.001, inner);
      b.box(0.07, 0.3, 0.012, 0.075, 1.29, fz + 0.002, sh(L.shirt, 1.25), 0, 0, -0.28);
      b.box(0.07, 0.3, 0.012, -0.075, 1.29, fz + 0.002, sh(L.shirt, 1.25), 0, 0, 0.28);
      b.box(0.42 * bw, 0.05, 0.255 * bw, 0, 0.965, 0, sh(L.shirt, 0.8));        // hem
    }
    // Neck, head, face.
    b.bone = B_HEAD;
    b.box(0.13, 0.1, 0.13, 0, 1.47, 0, L.skin);
    b.box(0.34, 0.37, 0.32, 0, 1.69, 0, L.skin);
    b.box(0.04, 0.08, 0.06, 0.185, 1.69, 0, sh(L.skin, 0.92)); b.box(0.04, 0.08, 0.06, -0.185, 1.69, 0, sh(L.skin, 0.92));
    b.box(0.05, 0.07, 0.05, 0, 1.655, 0.175, sh(L.skin, 0.9));                   // nose
    b.box(0.09, 0.018, 0.012, 0, 1.585, 0.162, sh(L.skin, 0.6));                 // mouth
    b.box(0.05, 0.065, 0.02, 0.075, 1.715, 0.163, 0x16120f); b.box(0.05, 0.065, 0.02, -0.075, 1.715, 0.163, 0x16120f);
    b.box(0.085, 0.022, 0.02, 0.075, 1.772, 0.163, sh(L.hair, 0.85)); b.box(0.085, 0.022, 0.02, -0.075, 1.772, 0.163, sh(L.hair, 0.85));
    hairParts(b, L, sh);
    extraParts(b, L, sh, sx, top);
    // Arms: tees show skin below the sleeve; everything else is sleeved to the wrist.
    for (i = 0; i < 2; i++) {
      s = i ? -1 : 1;
      b.bone = i ? B_ARM_R : B_ARM_L;
      if (top === 'tee') { b.box(0.145, 0.16, 0.155, s * sx, 1.3, 0, L.shirt); b.box(0.12, 0.16, 0.13, s * sx, 1.15, 0, L.skin); }
      else b.box(0.135, 0.31, 0.145, s * sx, 1.225, 0, L.shirt);
      if (top === 'flannel') b.box(0.14, 0.03, 0.15, s * sx, 1.2, 0, dark);
      b.bone = i ? B_FORE_R : B_FORE_L;
      b.box(0.12, 0.25, 0.13, s * sx, 0.955, 0, sleeve);
      if (top === 'flannel') b.box(0.125, 0.03, 0.135, s * sx, 0.95, 0, dark);
      if (top === 'tee' && L.extras.indexOf('tattoos') >= 0) b.box(0.125, 0.1, 0.135, s * sx, 0.99, 0, 0x2f5a6a);
      b.box(0.11, 0.1, 0.12, s * sx, 0.78, 0.005, L.skin);                      // hand
      if (o.sticks) b.box(0.024, 0.024, 0.42, s * sx, 0.77, 0.15, 0xd8b27a, 0.25);
    }
    if (o.gear === 'guitar') guitarParts(b);
    if (o.held === 'sandwich') {
      b.bone = B_HELD;
      b.box(0.15, 0.03, 0.11, -sx, 0.72, 0.1, 0xe3c38a); b.box(0.155, 0.018, 0.115, -sx, 0.742, 0.1, 0xe58a8e);
      b.box(0.165, 0.012, 0.12, -sx, 0.756, 0.1, 0x7cc251); b.box(0.15, 0.03, 0.11, -sx, 0.775, 0.1, 0xe3c38a);
    } else if (o.held === 'phone') {
      b.bone = B_HELD; b.box(0.075, 0.14, 0.014, -sx, 0.8, 0.075, 0x1d1d22);
    }
    if (o.floorProp === 'lunchbox') {
      b.bone = B_FLOOR;
      b.box(0.3, 0.19, 0.17, 0.44, 0.095, 0.25, 0xc0392b); b.box(0.305, 0.02, 0.175, 0.44, 0.16, 0.25, 0x8a2a20);
      b.box(0.12, 0.03, 0.03, 0.44, 0.205, 0.25, 0x222222); b.cyl(0.04, 0.04, 0.2, 8, 0.66, 0.1, 0.16, 0x3f7fbf);
    }
    // Headphones (shown while sulking).
    b.bone = B_PHONES;
    b.box(0.38, 0.045, 0.07, 0, 1.915, 0, 0x202024);
    for (i = 0; i < 2; i++) {
      s = i ? -1 : 1;
      b.box(0.03, 0.18, 0.05, s * 0.195, 1.83, 0, 0x202024); b.box(0.07, 0.13, 0.13, s * 0.2, 1.69, 0, 0x2a2a30);
      b.box(0.012, 0.08, 0.08, s * 0.237, 1.69, 0, 0xd23c3c);
    }
    if (o.cape && CAPES[o.cape]) capeParts(b, CAPES[o.cape], bw, ctx);
    return b.build();
  }
  function luminance(c) { var k = new THREE.Color(c); return k.r * 0.3 + k.g * 0.59 + k.b * 0.11; }
  function teePrint(ctx, c) { return luminance(c) < 0.35 ? 0xd9d4c8 : ctx.shade(c, 0.6); }

  function hairParts(b, L, sh) {
    var h = L.hair, st = L.hairStyle, i;
    var cap = function (t) { b.box(0.36, t || 0.07, 0.34, 0, 1.895, -0.005, h); };
    var fringe = function () { b.box(0.34, 0.05, 0.04, 0, 1.855, 0.16, h); };
    var sides = function (len) { b.box(0.03, len, 0.2, 0.18, 1.86 - len / 2, -0.05, h); b.box(0.03, len, 0.2, -0.18, 1.86 - len / 2, -0.05, h); };
    switch (st) {
      case 'bald': b.box(0.12, 0.012, 0.1, 0.03, 1.877, 0.02, sh(L.skin, 1.12)); break;
      case 'long':
        cap(); fringe(); b.box(0.38, 0.62, 0.08, 0, 1.6, -0.17, h);
        b.box(0.05, 0.45, 0.27, 0.19, 1.67, -0.02, h); b.box(0.05, 0.45, 0.27, -0.19, 1.67, -0.02, h); break;
      case 'mohawk': b.box(0.08, 0.17, 0.38, 0, 1.96, -0.01, h); b.box(0.345, 0.02, 0.325, 0, 1.876, 0, sh(L.skin, 0.85)); break;
      case 'bun': cap(); fringe(); sides(0.12); b.box(0.36, 0.2, 0.06, 0, 1.79, -0.16, h); b.box(0.13, 0.11, 0.1, 0, 1.86, -0.22, h); break;
      case 'mullet': cap(); fringe(); sides(0.12); b.box(0.34, 0.5, 0.07, 0, 1.64, -0.17, h); break;
      case 'spiky':
        cap(0.05);
        var SP = [[0, 0.02], [0.1, 0.06], [-0.1, 0.06], [0.09, -0.09], [-0.09, -0.09], [0, -0.12], [0, 0.12]];
        for (i = 0; i < SP.length; i++) b.cyl(0, 0.06, 0.16, 4, SP[i][0], 1.98, SP[i][1], h, SP[i][1] * 2.5, 0, -SP[i][0] * 2.5);
        break;
      case 'cap':                                  // backwards baseball cap
        var c = L.capColor;
        sides(0.1); b.box(0.34, 0.1, 0.05, 0, 1.745, -0.16, h);
        b.box(0.37, 0.12, 0.35, 0, 1.92, 0, c); b.box(0.3, 0.05, 0.28, 0, 2.0, 0, c);
        b.box(0.3, 0.025, 0.17, 0, 1.875, -0.245, c); b.box(0.04, 0.03, 0.04, 0, 2.035, 0, sh(c, 0.75));
        b.box(0.1, 0.045, 0.01, 0, 1.9, 0.177, sh(c, 0.6)); break;
      default: cap(); fringe(); sides(0.13); b.box(0.36, 0.25, 0.06, 0, 1.76, -0.16, h);  // 'short'
    }
  }

  function extraParts(b, L, sh, sx, top) {
    var ex = L.extras, h = L.hair, i;
    for (i = 0; i < ex.length; i++) {
      switch (ex[i]) {
        case 'sunglasses':
          b.box(0.33, 0.075, 0.03, 0, 1.712, 0.174, 0x0c0c0e); b.box(0.06, 0.014, 0.005, -0.09, 1.728, 0.19, 0x5a6a80);
          b.box(0.012, 0.025, 0.2, 0.173, 1.72, 0.07, 0x0c0c0e); b.box(0.012, 0.025, 0.2, -0.173, 1.72, 0.07, 0x0c0c0e); break;
        case 'glasses':
          b.box(0.1, 0.08, 0.015, 0.075, 1.713, 0.172, 0x2a2a2a); b.box(0.1, 0.08, 0.015, -0.075, 1.713, 0.172, 0x2a2a2a);
          b.box(0.075, 0.055, 0.01, 0.075, 1.713, 0.178, 0xbcd0e0); b.box(0.075, 0.055, 0.01, -0.075, 1.713, 0.178, 0xbcd0e0);
          b.box(0.035, 0.045, 0.01, 0.075, 1.713, 0.184, 0x16120f); b.box(0.035, 0.045, 0.01, -0.075, 1.713, 0.184, 0x16120f); break;
        case 'beard':
          b.box(0.34, 0.15, 0.07, 0, 1.57, 0.14, h); b.box(0.22, 0.08, 0.1, 0, 1.49, 0.12, h);
          b.box(0.04, 0.16, 0.2, 0.17, 1.6, 0.05, h); b.box(0.04, 0.16, 0.2, -0.17, 1.6, 0.05, h); break;
        case 'moustache':
          b.box(0.17, 0.035, 0.035, 0, 1.617, 0.178, h); b.box(0.035, 0.06, 0.03, 0.095, 1.597, 0.176, h); b.box(0.035, 0.06, 0.03, -0.095, 1.597, 0.176, h); break;
        case 'headband': b.box(0.365, 0.05, 0.345, 0, 1.81, 0, 0xd23c3c); break;
        case 'bandana': b.box(0.365, 0.08, 0.345, 0, 1.845, 0, 0x2f5fb3); b.box(0.08, 0.06, 0.06, 0, 1.83, -0.19, 0x2f5fb3); break;
        case 'hat':
        case 'cowboy':
          b.box(0.54, 0.03, 0.5, 0, 1.885, 0, 0x6b4a2e); b.box(0.34, 0.17, 0.32, 0, 1.975, 0, 0x6b4a2e); b.box(0.35, 0.04, 0.33, 0, 1.915, 0, 0x2a1d14); break;
        case 'tattoos':
          if (top === 'tee') { b.bone = B_ARM_L; b.box(0.125, 0.07, 0.135, sx, 1.13, 0, 0x2f5a6a); b.bone = B_ARM_R; b.box(0.125, 0.07, 0.135, -sx, 1.13, 0, 0x2f5a6a); b.bone = B_HEAD; }
          break;
      }
    }
  }

  // Dana's pointy white V (on the gear bone = spine frame, hidden while sulking). +x runs up the neck.
  function guitarParts(b) {
    var white = 0xe9e5dc, black = 0x151515;
    b.bone = B_GEAR;
    b.box(0.05, 0.64, 0.02, 0.02, 1.2, 0.15, 0x1c1714, 0, 0, 0.62);           // strap across the chest
    b.push(-0.08, 1.02, 0.21, 0, 0, 0.42);
    b.box(0.46, 0.1, 0.05, -0.19, 0.085, 0, white, 0, 0, -0.36);
    b.box(0.46, 0.1, 0.05, -0.19, -0.085, 0, white, 0, 0, 0.36);
    b.box(0.16, 0.14, 0.05, 0, 0, 0, white);
    b.box(0.05, 0.06, 0.012, -0.08, 0, 0.03, black); b.box(0.05, 0.06, 0.012, -0.17, 0, 0.03, black);
    b.box(0.6, 0.05, 0.03, 0.37, 0, 0.012, 0x2a1a10);
    b.box(0.15, 0.075, 0.03, 0.72, 0.015, 0.012, black, 0, 0, -0.25);
    b.pop();
  }

  // Marcel's cape: two hinged panels (cape bones) so it can sway and flare; variant from state.flags.cape.
  // Each panel is a strip curved around his back (edges closer to the body than the middle).
  function capeParts(b, C, bw, ctx) {
    var z = -0.15 * bw - 0.012, ht = 0.27 * bw, hm = 0.36 * bw, hb = 0.46 * bw, yb = 0.3, i;
    var bend = function (u) { var k = 2 * u - 1; return -0.07 * (1 - k * k); };        // extra depth at the middle
    var strip = function (bone, yt, wt, ybot, wb, jag) {
      b.bone = bone;
      for (var i = 0; i < 6; i++) {
        var u0 = i / 6, u1 = (i + 1) / 6, z0 = z + bend(u0), z1 = z + bend(u1);
        var j0 = jag ? ((i % 2) ? 0.12 : 0.02) : 0, j1 = jag ? (((i + 1) % 2) ? 0.12 : 0.02) : 0;
        var tx0 = -wt + 2 * wt * u0, tx1 = -wt + 2 * wt * u1, bx0 = -wb + 2 * wb * u0, bx1 = -wb + 2 * wb * u1;
        b.quad([tx0, yt, z0 - 0.01], [tx1, yt, z1 - 0.01], [bx1, ybot + j1, z1 - 0.01], [bx0, ybot + j0, z0 - 0.01], C.out);
        b.quad([bx0, ybot + j0, z0], [bx1, ybot + j1, z1], [tx1, yt, z1], [tx0, yt, z0], C.lining);
      }
    };
    strip(B_CAPE1, 1.42, ht, 0.9, hm, false);
    strip(B_CAPE2, 0.9, hm, yb, hb, C.jagged);
    // Trim, bands and dots go on both faces (from the front we mostly see the inner side), following
    // the curve: each decoration is cut into short segments placed at the cape's depth there.
    var depth = function (x, y) {
      var w = y >= 0.9 ? hm + (ht - hm) * (y - 0.9) / 0.52 : hb + (hm - hb) * (y - yb) / 0.6;
      return z + bend(clamp((x + w) / (2 * w), 0, 1));
    };
    var deco = function (bone, x0, y0, x1, y1, color) {
      b.bone = bone;
      var n = Math.max(1, Math.ceil((x1 - x0) / 0.1));
      for (var k = 0; k < n; k++) {
        var a = x0 + (x1 - x0) * k / n, c = x0 + (x1 - x0) * (k + 1) / n, dz = depth((a + c) / 2, (y0 + y1) / 2);
        b.quad([a, y1, dz - 0.016], [c, y1, dz - 0.016], [c, y0, dz - 0.016], [a, y0, dz - 0.016], color);
        b.quad([a, y0, dz + 0.006], [c, y0, dz + 0.006], [c, y1, dz + 0.006], [a, y1, dz + 0.006], color);
      }
    };
    if (C.trim) deco(B_CAPE2, -hb, yb, hb, yb + 0.05, C.trim);
    if (C.bands) { deco(B_CAPE1, -0.3 * bw, 1.07, 0.3 * bw, 1.12, C.bands); deco(B_CAPE2, -0.4 * bw, 0.52, 0.4 * bw, 0.58, C.bands); }
    if (C.dots || C.embers) {
      var rows = [[1.3, B_CAPE1], [1.08, B_CAPE1], [0.8, B_CAPE2], [0.58, B_CAPE2], [0.4, B_CAPE2]], d = 0.028;
      for (i = 0; i < rows.length; i++) {
        for (var k = 0; k < 5; k++) {
          if (C.embers && (i + k) % 3) continue;
          var x = -0.24 + k * 0.12 + (i % 2) * 0.06, y = rows[i][0];
          deco(rows[i][1], x - d, y - d, x + d, y + d, C.embers ? 0xff6a2a : C.dots[(i + k) % 2]);
        }
      }
    }
    b.bone = B_SPINE;
    if (C.rings) for (i = 0; i < 5; i++) b.box(0.035, 0.035, 0.035, -ht + i * ht / 2, 1.43, z - 0.005, 0x9a9a9a);
    if (C.collar) {
      b.box(0.16, 0.26, 0.02, 0.12, 1.53, -0.16 * bw, C.out, -0.3, 0, -0.35);
      b.box(0.16, 0.26, 0.02, -0.12, 1.53, -0.16 * bw, C.out, -0.3, 0, 0.35);
    }
    if (C.clasp) b.box(0.28, 0.022, 0.012, 0, 1.41, 0.14 * bw, 0xd4a940);
  }
  // Build a character: { root (Group, scaled by height), mesh (SkinnedMesh), bones[], dispose() }.
  function makeCharacter(ctx, look, o) {
    var L = normLook(look, o.id);
    var geo = R.charGeometry ? R.charGeometry(ctx, L, o, look) : characterGeometry(ctx, L, o), lay = jointLayout(L.build), bones = [], i;   // v0.8: 40_render_core
    for (i = 0; i < lay.length; i++) {
      var bn = new THREE.Bone(), p = lay[i][0];
      if (p >= 0) { bn.position.set(lay[i][1] - lay[p][1], lay[i][2] - lay[p][2], lay[i][3] - lay[p][3]); bones[p].add(bn); }
      bones.push(bn);
    }
    var mesh = new THREE.SkinnedMesh(geo, ctx.mats.skin);
    mesh.add(bones[0]);
    mesh.bind(new THREE.Skeleton(bones));
    mesh.frustumCulled = false;                  // bones move the body outside its bind-pose bounds
    var root = new THREE.Group();
    root.add(mesh);
    root.scale.setScalar(L.height * (o.scale || 1));
    return {
      root: root, mesh: mesh, bones: bones, look: L,
      dispose: function () { if (root.parent) root.parent.remove(root); geo.dispose(); mesh.skeleton.dispose(); }
    };
  }
  // Public: later scenes (stage, van, red carpet) reuse the same people. Valid after GG.render.init().
  R.buildCharacter = function (look, opts) {
    var ctx = R.util && R.util.ctx();
    if (!ctx) return null;
    THREE = ctx.THREE;
    return makeCharacter(ctx, look, opts || {});
  };

  // ---- Poses ---------------------------------------------------------------------------------------------------------
  // Marcel's mirror routine, one row per pose: [armL, foreL, armR, foreR, spine, head] × (x, y, z) radians.
  var MIRROR_POSES = [
    [0, 0, 2.5, 0, 0, 0.5, 0, 0, -2.5, 0, 0, -0.5, -0.06, 0, 0, -0.3, 0, 0],             // horns to the heavens
    [0, 0, 1.45, 0, 0, 1.65, 0, 0, -1.45, 0, 0, -1.65, 0, 0, 0, 0.12, 0, 0],             // double biceps
    [0, 0, 0.55, -0.3, 0, -1.3, -1.45, 0, -0.1, -0.1, 0, 0, 0, 0.3, 0, 0, -0.25, 0],     // hand on hip, points at himself
    [0, 0, 0.35, 0, 0, 0, -1.35, 0, 0.75, -1.0, 0, 0, 0.05, -0.4, 0, 0.2, 0.3, 0]        // Dracula swirl (cape flares)
  ];
  var POSE_BONES = [B_ARM_L, B_FORE_L, B_ARM_R, B_FORE_R, B_SPINE, B_HEAD];
  function blendPose(bn, P, Q, f) {
    for (var k = 0; k < 6; k++) {
      var j = k * 3;
      bn[POSE_BONES[k]].rotation.set(P[j] + (Q[j] - P[j]) * f, P[j + 1] + (Q[j + 1] - P[j + 1]) * f, P[j + 2] + (Q[j + 2] - P[j + 2]) * f);
    }
  }
  function rot(bone, x, y, z) { bone.rotation.set(x, y, z); }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function bump(u) { return u <= 0 || u >= 1 ? 0 : Math.sin(Math.PI * u); }

  // Rest pose + prop toggles. Called before every pose function.
  function resetPose(ch, pose) {
    var bn = ch.bones;
    for (var i = 1; i < bn.length; i++) bn[i].rotation.set(0, 0, 0);
    bn[B_HIPS].position.y = HIPS_Y;
    var sulk = pose === 'sulk';
    bn[B_GEAR].scale.setScalar(sulk ? 0 : 1);
    bn[B_HELD].scale.setScalar(sulk ? 0 : 1);
    bn[B_FLOOR].scale.setScalar(sulk ? 0 : 1);
    bn[B_PHONES].scale.setScalar(sulk ? 1 : 0);
  }
  // Seated: pelvis on the seat, thighs forward, shins vertical to the floor.
  function sit(bn, seat) {
    var hy = seat + 0.08, a = Math.acos(clamp((hy - 0.02 - 0.45) / 0.39, -0.6, 0.6));
    bn[B_HIPS].position.y = hy;
    bn[B_LEG_L].rotation.x = -a; bn[B_SHIN_L].rotation.x = a;
    bn[B_LEG_R].rotation.x = -a; bn[B_SHIN_R].rotation.x = a;
  }
  function armsCrossed(bn) {
    rot(bn[B_ARM_L], -0.25, 0, 0.12); rot(bn[B_FORE_L], -1.5, 0, -1.25);
    rot(bn[B_ARM_R], -0.3, 0, -0.12); rot(bn[B_FORE_R], -1.62, 0, 1.25);
  }
  function capeIdle(bn, tt, flare) {
    bn[B_CAPE1].rotation.x = 0.12 + flare + 0.03 * Math.sin(tt * 1.3);
    bn[B_CAPE2].rotation.x = 0.05 + flare * 0.5 + 0.03 * Math.sin(tt * 1.7 + 1);
  }

  // Idle behaviours by pose. p = person record, tt = personal time (energy-scaled).
  var IDLES = {
    stand: function (p, bn, tt) {                     // generic bandmate
      rot(bn[B_ARM_L], 0, 0, 0.08); rot(bn[B_ARM_R], 0, 0, -0.08);
      rot(bn[B_FORE_L], -0.15, 0, 0); rot(bn[B_FORE_R], -0.15, 0, 0);
      bn[B_HEAD].rotation.y = 0.3 * Math.sin(tt * 0.3) * Math.sin(tt * 0.71);
      breathe(bn, tt, 1);
    },
    mirror: function (p, bn, tt) {                    // cycles poses at the mirror
      var period = 2.3, n = MIRROR_POSES.length, k = Math.floor(tt / period), u = (tt - k * period) / 0.45;
      var cur = ((k % n) + n) % n, prev = (cur + n - 1) % n, f = GG.render.util.smooth(u);
      blendPose(bn, MIRROR_POSES[prev], MIRROR_POSES[cur], f);
      var sw = cur === 3 ? f : prev === 3 ? 1 - f : 0;   // cape flare while swirling
      capeIdle(bn, tt, 0.45 * sw);
      bn[B_CAPE1].rotation.z = 0.25 * sw;
      breathe(bn, tt, 1);
    },
    noodle: function (p, bn, tt) {                    // guitar noodling, with a solo lean every so often
      var cyc = tt % 7.5, solo = cyc > 5 ? bump((cyc - 5) / 2.5) : 0;
      var strum = Math.sin(tt * (11 + 7 * solo)) * (0.16 + 0.06 * solo) * (Math.sin(tt * 0.9) > -0.6 ? 1 : 0.2);
      rot(bn[B_ARM_L], 0.1, 0, 0.14); rot(bn[B_FORE_L], -2.05, 0, 0.1 + 0.1 * solo * Math.sin(tt * 3));
      rot(bn[B_ARM_R], -0.35, 0, 0.12); rot(bn[B_FORE_R], -0.95 + strum, 0, 0.45);
      bn[B_SPINE].rotation.x = -0.18 * solo; bn[B_SPINE].rotation.z = 0.04 * Math.sin(tt * 2.2);
      bn[B_HEAD].rotation.x = 0.18 + 0.07 * Math.sin(tt * 5.5) - 0.35 * solo;
      breathe(bn, tt, 1);
    },
    lunch: function (p, bn, tt) {                     // seated, baba's sandwich to mouth and back
      sit(bn, p.seat / p.scale);
      var c = tt % 4.4, up = c < 2.2 ? 0 : c < 2.7 ? GG.render.util.smooth((c - 2.2) / 0.5) : c < 3.5 ? 1 : 1 - GG.render.util.smooth((c - 3.5) / 0.5);
      rot(bn[B_ARM_L], -0.55, 0, 0.05); rot(bn[B_FORE_L], -0.5, 0, 0);
      rot(bn[B_ARM_R], -0.35 - 0.5 * up, 0, 0.05 + 0.25 * up); rot(bn[B_FORE_R], -1.1 - 1.1 * up, 0, 0.25 + 0.1 * up);
      var chew = c > 2.8 && c < 3.9 ? 0.04 * Math.sin(tt * 18) : 0;
      bn[B_HEAD].rotation.x = 0.22 - 0.3 * up + chew;
      bn[B_SPINE].rotation.x = 0.1 + 0.015 * Math.sin(tt * 1.8);
    },
    corner: function (p, bn, tt) {                    // seated, arms crossed, sunglasses, the rare nod
      sit(bn, p.seat / p.scale); armsCrossed(bn);
      bn[B_SPINE].rotation.x = -0.05;
      var c = (tt + 4) % 9.5;
      bn[B_HEAD].rotation.x = 0.06 + 0.28 * bump(c / 1.2);
    },
    phone: function (p, bn, tt) {
      rot(bn[B_ARM_R], -0.45, 0, 0.25); rot(bn[B_FORE_R], -1.35, 0, 0.35);
      rot(bn[B_ARM_L], 0, 0, 0.1); rot(bn[B_FORE_L], -0.2, 0, 0);
      bn[B_HEAD].rotation.x = 0.38; breathe(bn, tt, 1);
    },
    pace: function (p, bn, tt, dt) {                  // strolls back and forth
      var v = Math.cos(tt * 0.45);
      p.x = p.spot.x + 0.55 * Math.sin(tt * 0.45);
      p.baseYaw = GG.render.util.wrapAngle(v > 0 ? Math.PI / 2 : -Math.PI / 2);
      walkCycle(bn, tt * 5.2, Math.min(1, Math.abs(v) * 0.6));
    },
    sulk: function (p, bn, tt) {                      // couch, headphones, arms crossed, head down
      sit(bn, p.seat / p.scale); armsCrossed(bn);
      bn[B_SPINE].rotation.x = -0.2 + 0.03 * Math.sin(tt * 0.6);
      bn[B_HEAD].rotation.x = 0.32 + 0.05 * Math.sin(tt * 2.1);
      bn[B_CAPE1].rotation.x = 0; bn[B_CAPE2].rotation.x = -1.2;
    }
  };
  function breathe(bn, tt, k) {
    var s = Math.sin(tt * 1.8);
    bn[B_SPINE].rotation.x += 0.02 * s * k;
    bn[B_HIPS].position.y += 0.004 * s * k;
  }
  // Walk cycle: phase in radians (one stride = 2π), amp 0..1 blends from standing.
  function walkCycle(bn, ph, amp) {
    var s = Math.sin(ph), c = Math.cos(ph);
    bn[B_LEG_L].rotation.x = s * 0.55 * amp; bn[B_LEG_R].rotation.x = -s * 0.55 * amp;
    bn[B_SHIN_L].rotation.x = Math.max(0, -c) * 0.9 * amp; bn[B_SHIN_R].rotation.x = Math.max(0, c) * 0.9 * amp;
    bn[B_ARM_L].rotation.x = -s * 0.45 * amp; bn[B_ARM_R].rotation.x = s * 0.45 * amp;
    bn[B_ARM_L].rotation.z = 0.08; bn[B_ARM_R].rotation.z = -0.08;
    bn[B_FORE_L].rotation.x = -0.25 - 0.3 * amp; bn[B_FORE_R].rotation.x = -0.25 - 0.3 * amp;
    bn[B_HIPS].position.y = HIPS_Y + (Math.abs(c) - 0.6) * 0.06 * amp;
    bn[B_HIPS].rotation.y = -s * 0.1 * amp;
    bn[B_SPINE].rotation.x = 0.07 * amp; bn[B_SPINE].rotation.y = s * 0.14 * amp;
    bn[B_HEAD].rotation.y = -s * 0.07 * amp;
    bn[B_CAPE1].rotation.x = 0.1 + 0.3 * amp + 0.05 * Math.abs(c) * amp; bn[B_CAPE2].rotation.x = 0.05 + 0.2 * amp;
  }

  // ---- The garage scene -------------------------------------------------------------------------------------------------
  R.defineScene('garage', function (ctx) {
    THREE = ctx.THREE;
    var sh = ctx.shade, U = R.util;
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1020);

    // Lights: dim cool/warm hemisphere, the swinging bulb (below), moonlight from behind the door, heater.
    scene.add(new THREE.HemisphereLight(0x6f84b8, 0x3b2d22, 0.55));
    var moon = new THREE.DirectionalLight(0x8fa8ff, 0.32);
    moon.position.set(-1.2, 6, -6.5); scene.add(moon);
    var fill = new THREE.DirectionalLight(0xffe2c4, 0.28);     // soft fill from the viewer's side: faces stay readable
    fill.position.set(-3.5, 5, 7); scene.add(fill);
    var heater = new THREE.PointLight(0xff7a30, 0.55, 2.6, 1);
    heater.position.set(1.5, 0.45, 2.15); scene.add(heater);

    // ---- Static room: ONE lit mesh + ONE unlit (glowing) mesh ----
    var lit = new ctx.Builder({ jitter: 0.045, seed: 11 }), glow = new ctx.Builder({ jitter: 0, seed: 3 });
    var obstacles = [];                             // walking: [x0, z0, x1, z1] footprints (static + bandmates)
    var staticObstacles = [];
    var shadowSpots = [];                           // blob shadows under props: [x, z, sx, sz, yaw]
    function foot(x, z, w, d, yaw) {                // footprint of a w×d box centred at x,z rotated by yaw
      var c = Math.abs(Math.cos(yaw || 0)), s = Math.abs(Math.sin(yaw || 0));
      var hx = (w * c + d * s) / 2, hz = (w * s + d * c) / 2;
      staticObstacles.push([x - hx, z - hz, x + hx, z + hz]);
      shadowSpots.push([x, z, w * 1.15, d * 1.15, yaw || 0]);
    }
    buildShell(lit, glow);
    buildDoor(lit, glow);
    buildBackWall(lit, glow, foot);
    buildRightWall(lit, glow, foot);
    buildFloorProps(lit, glow, foot);
    scene.add(new THREE.Mesh(lit.build(), ctx.mats.vc));
    scene.add(new THREE.Mesh(glow.build(), ctx.mats.unlit));
    scene.add(buildShafts());
    var dust = buildDust(); scene.add(dust.points);
    var yard = buildYard();
    var decor = buildDecor();   // v0.6.1: snow at the window (winter), Christmas lights (December), a box fan (July / heat wave)
    var fanMail = buildFanMail();   // v0.6.1 (FANS): Dale's macaroni portrait of Kenji, the gift pile, the fan-mail stack

    // ---- Bulb on a cord (swings a little; carries the warm point light and a halo) ----
    var bulbPivot = new THREE.Group();
    bulbPivot.position.set(PROPS.bulb.x, 3.35, PROPS.bulb.z); scene.add(bulbPivot);
    var bc = new ctx.Builder({ jitter: 0 });
    bc.box(0.014, 1.0, 0.014, 0, -0.5, 0, 0x151515); bc.cyl(0.032, 0.036, 0.08, 8, 0, -1.03, 0, 0x2b2b2b);
    bulbPivot.add(new THREE.Mesh(bc.build(), ctx.mats.vc));
    var bg = new ctx.Builder({ jitter: 0 });
    bg.shape(new THREE.IcosahedronGeometry(0.075, 0), 0, -1.13, 0, 1, 1.25, 1, 0xfff1c9);
    bulbPivot.add(new THREE.Mesh(bg.build(), ctx.mats.unlit));
    var halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: ctx.radialTexture('glow'), color: 0xffc070, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.scale.set(1.0, 1.0, 1); halo.position.set(0, -1.13, 0); bulbPivot.add(halo);
    var bulb = new THREE.PointLight(0xffc27a, 1.55, 9.5, 1);
    bulb.position.set(0, -1.18, 0); bulbPivot.add(bulb);

    // ---- Band banner on the garage door (name from content; redrawn only when it changes) ----
    var banner = buildBanner(); scene.add(banner.mesh);
    // v0.5: the trophy wall (gold/platinum records, loonie trophies, banned-venue photos), rebuilt when state changes.
    var trophyWall = buildTrophyWall(); scene.add(trophyWall.mesh);

    // ---- Drum kit (own mesh: rebuilt when state.player.kitColor / player.kit (v0.8 KIT_LOOK) changes) ----
    var kit = { mesh: null, color: null, sig: null, art: null };
    var throne = rotLocal(KIT, 0, -0.72 * KIT_SCALE);
    HOTSPOTS[4].stand = [throne.x, throne.z];

    // ---- Blob shadows: one InstancedMesh for props + people ----
    var shGeo = new THREE.PlaneGeometry(1, 1); shGeo.rotateX(-Math.PI / 2);
    var shadows = new THREE.InstancedMesh(shGeo, new THREE.MeshBasicMaterial({ map: ctx.radialTexture('shadow'), transparent: true, depthWrite: false }), shadowSpots.length + MAX_PEOPLE);
    shadows.frustumCulled = false; shadows.renderOrder = 1;
    var _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
    function setShadow(i, x, z, sx, sz, yaw) {
      _q.setFromAxisAngle(_up, yaw); _m.compose(_p.set(x, 0.024, z), _q, _s.set(sx, 1, sz)); shadows.setMatrixAt(i, _m);
    }
    for (var si = 0; si < shadowSpots.length; si++) { var ss = shadowSpots[si]; setShadow(si, ss[0], ss[1], ss[2], ss[3], ss[4]); }
    scene.add(shadows);

    // ---- Hotspots: invisible hit boxes + floating labels ----
    var unitBox = new THREE.BoxGeometry(1, 1, 1);
    var hs = {}, hsList = [], pickables = [], labels = [], hotspotActions = [];
    for (var hi = 0; hi < HOTSPOTS.length; hi++) {
      var H = HOTSPOTS[hi], box = new THREE.Mesh(unitBox, ctx.mats.hidden);
      box.position.set(H.box[0], H.box[1], H.box[2]); box.scale.set(H.box[3], H.box[4], H.box[5]);
      box.userData.action = H.action; scene.add(box); box.updateMatrixWorld();
      var lab = ctx.makeLabel(H.label, { px: 20 });
      lab.position.set(H.at[0], H.at[1], H.at[2]); lab.userData.action = H.action; scene.add(lab);
      hs[H.action] = { def: H, box: box, label: lab, y: H.at[1], i: hi, fade: 1 };
      hsList.push(hs[H.action]);
      labels.push(lab); hotspotActions.push(H.action);
    }

    // ---- People ----
    var people = {}, peopleList = [];               // bandmates by member id (+ as a list for the frame loop)
    var memberHits = [];
    var player = {
      id: '__player', p: null, x: PLAYER_SPAWN.x, z: PLAYER_SPAWN.z, yaw: PLAYER_SPAWN.yaw, goalYaw: PLAYER_SPAWN.yaw,
      speed: 0, phase: 0, walking: false, path: [{ x: 0, z: 0 }, { x: 0, z: 0 }, { x: 0, z: 0 }], rest: [0, 0, 0],
      pathLen: 0, pathIdx: 0, pending: null, faceT: 0, pose: 'stand', idleT: 0
    };
    var state = null, capeShown = 'none';
    var camT = new THREE.Vector3(CAM.target[0], CAM.target[1], CAM.target[2]);
    var fitPoints = [];
    (function () {
      var y0 = -0.32, y1 = ROOM.h + 0.1, x0 = ROOM.x0, x1 = ROOM.x1 + ROOM.wall, z0 = ROOM.z0 - ROOM.wall, z1 = ROOM.z1;
      var P = [[x0, y0, z1], [x1, y0, z1], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z0]];
      for (var i = 0; i < P.length; i++) fitPoints.push(new THREE.Vector3(P[i][0], P[i][1], P[i][2]));
      for (i = 0; i < HOTSPOTS.length; i++) fitPoints.push(new THREE.Vector3(HOTSPOTS[i].at[0], HOTSPOTS[i].at[1] + 0.2, HOTSPOTS[i].at[2]));
    })();

    // ---- Scene API (see 40_render_core.js) ----
    var api = {
      scene: scene, labels: labels, pickables: pickables, floorY: 0,
      resize: function (w, h, animate) {
        ctx.fitCamera({ target: camT.set(CAM.target[0], CAM.target[1], CAM.target[2]), yaw: CAM.yaw, pitch: CAM.pitch, fov: CAM.fov, points: fitPoints, pad: 12, animate: animate });
        followT.copy(camT);
      },
      enter: function () {},
      exit: function () { ctx.ring.hide(); },
      sync: sync,
      update: update,
      onTap: onTap,
      goToHotspot: function (action) { return walkToHotspot(action); },
      anchor: anchor,
      debug: debug
    };
    var followT = new THREE.Vector3().copy(camT);
    var _pt = { x: 0, z: 0 };                       // pushOut() result (reused)

    // ======================================================================================================
    // Sync: cheap and idempotent — only rebuilds a character whose look/cape/props changed.
    function sync(st) {
      state = st;
      var band = GG.content && GG.content.bands && GG.content.bands[st.bandId];
      banner.set((band && band.name) || 'Hail Damage');
      trophyWall.set(st.trophies, st.banned);
      yard.set(seasonOf(st.week || 1));
      decor.set(st);
      fanMail.set(st);
      var pl = st.player || {}, preset = findPreset(pl.presetId);
      var kc = pl.kitColor || (preset && preset.kitColor) || DEFAULT_KIT;
      var kl = R.kit ? R.kit.norm(pl.kit, kc) : null, ksig = kc + (kl ? JSON.stringify(kl) : '');   // v0.8: the kit look (KIT_LOOK)
      if (ksig !== kit.sig) buildKit(kc, kl, ksig);
      ensurePerson(player, 'player', pl.look || (preset && preset.look) || DEFAULT_LOOKS.player, { sticks: kl ? kl.sticks : true });
      if (!player.p.placed) { player.p.placed = true; placePlayer(); }

      var flags = st.flags || {}, cv = flags.cape;
      var capeVariant = typeof cv === 'string' && cv !== 'none' ? (CAPE_VARIANTS[cv] ? cv : 'velvet') : null;
      // v0.4: fill-ins hang out too (after the roster, so they never take a hand-made member's idle spot)
      var list = (st.members || []).concat(GG.drama && GG.drama.fillInFigures ? GG.drama.fillInFigures(st) : []);
      var seen = {}, usedSpots = {}, couch = 0, spare = 0, capeId = null, i, m;
      for (i = 0; i < list.length; i++) if (list[i] && list[i].id === 'marcel') capeId = 'marcel';
      for (i = 0; !capeId && i < list.length; i++) { m = list[i]; if (m && memberIdle(band, m, i) === 'mirror') capeId = m.id; }
      capeShown = 'none';
      for (i = 0; i < list.length; i++) {
        m = list[i];
        if (!m || !m.id || (m.status && m.status !== 'active')) continue;
        var cm = contentMember(band, m.id, i), idle = memberIdle(band, m, i);
        var cape = m.id === capeId ? capeVariant : null;
        var opts = { gear: idle === 'noodle' ? 'guitar' : null, held: idle === 'lunch' ? 'sandwich' : idle === 'phone' ? 'phone' : null,
          floorProp: idle === 'lunch' ? 'lunchbox' : null, cape: cape };
        var rec = people[m.id] || (people[m.id] = { id: m.id, p: null, x: 0, z: 0, yaw: 0, baseYaw: 0, lookT: 0, lookW: 0, hopT: 0, nodT: -1 });
        ensurePerson(rec, m.id, m.look || (cm && cm.look) || DEFAULT_LOOKS[m.id] || genericLook(m.id), opts);
        if (cape) capeShown = cape;
        var mood = typeof m.mood === 'number' ? m.mood : 60;
        rec.mood = mood;
        rec.energy = mood >= 70 ? 1.15 : mood >= 45 ? 1 : 0.78;
        var pose = mood < SULK_MOOD ? 'sulk' : (SPOTS[idle] && !usedSpots[idle] ? idle : 'stand');
        var spot = pose === 'sulk' ? COUCH_SEATS[Math.min(couch++, COUCH_SEATS.length - 1)] : pose === 'stand' ? SPARE[spare++ % SPARE.length] : SPOTS[idle];
        if (pose !== 'sulk' && pose !== 'stand') usedSpots[idle] = true;
        setPose(rec, pose, spot);
        seen[m.id] = true;
      }
      for (var id in people) if (!seen[id]) { people[id].p.dispose(); delete people[id]; }
      memberHits.length = 0; obstacles.length = 0;
      for (i = 0; i < staticObstacles.length; i++) obstacles.push(staticObstacles[i]);
      for (id in people) {
        var r = people[id];
        memberHits.push(r.hit);
        if (r.pose === 'pace' || r.pose === 'sulk') continue;          // pacers move; the couch already blocks sulkers
        var ox = r.x + (r.seat ? Math.sin(r.baseYaw) * 0.15 : 0), oz = r.z + (r.seat ? Math.cos(r.baseYaw) * 0.15 : 0), rr = r.seat ? 0.3 : 0.28;
        obstacles.push([ox - rr, oz - rr, ox + rr, oz + rr]);
      }
      pickables.length = 0; peopleList.length = 0;
      for (i = 0; i < hsList.length; i++) pickables.push(hsList[i].box);
      for (id in people) peopleList.push(people[id]);
      for (i = 0; i < memberHits.length; i++) pickables.push(memberHits[i]);
    }

    function ensurePerson(rec, id, look, opts) {
      opts.id = id; opts.scale = CHAR_SCALE;
      var sig = JSON.stringify(look) + '|' + [opts.gear, opts.held, opts.floorProp, opts.cape, opts.sticks].join(',');
      if (rec.p && rec.sig === sig) return;
      var placed = rec.p && rec.p.placed;
      if (rec.p) rec.p.dispose();
      rec.p = makeCharacter(ctx, look, opts);
      rec.p.placed = placed;
      rec.sig = sig;
      rec.phase = (GG.hashSeed(id) % 1000) / 97;
      rec.scale = rec.p.root.scale.y;
      scene.add(rec.p.root);
      if (rec !== player) {
        var hit = new THREE.Mesh(unitBox, ctx.mats.hidden);
        hit.userData.memberId = id;
        rec.p.root.add(hit);
        rec.hit = hit;
        if (rec.pose) sizeHit(rec);
      }
    }
    function setPose(rec, pose, spot) {
      rec.spot = spot;
      if (rec.pose !== pose || rec.spotRef !== spot) { rec.x = spot.x; rec.z = spot.z; rec.baseYaw = rec.yaw = spot.yaw; }
      rec.pose = pose; rec.spotRef = spot; rec.seat = spot.seat || 0;
      sizeHit(rec);
    }
    function sizeHit(rec) {
      if (!rec.hit) return;
      if (rec.seat) { rec.hit.scale.set(0.75, 1.4, 0.95); rec.hit.position.set(0, 0.68, 0.15); }
      else { rec.hit.scale.set(0.62, 1.9, 0.62); rec.hit.position.set(0, 0.95, 0); }
    }
    function placePlayer() {
      player.x = PLAYER_SPAWN.x; player.z = PLAYER_SPAWN.z; player.yaw = player.goalYaw = PLAYER_SPAWN.yaw;
      player.walking = false; player.pending = null; player.pose = 'stand'; player.speed = 0;
    }
    function contentMember(band, id, i) {
      if (!band || !band.members) return null;
      for (var k = 0; k < band.members.length; k++) if (band.members[k] && band.members[k].id === id) return band.members[k];
      return band.members[i] || null;
    }
    function memberIdle(band, m, i) {
      var cm = contentMember(band, m.id, i);
      return (cm && cm.idle) || m.idle || DEFAULT_IDLE[m.id] || 'pace';
    }
    function findPreset(id) {
      var ps = GG.content && GG.content.presets;
      if (!id || !Array.isArray(ps)) return null;
      for (var i = 0; i < ps.length; i++) if (ps[i] && ps[i].id === id) return ps[i];
      return null;
    }

    // ======================================================================================================
    // Input and walking.
    function onTap(hit) {
      if (!state) return;
      if (hit.type === 'hotspot') { walkToHotspot(hit.action); return; }
      if (hit.type === 'member') {
        var r = people[hit.id];
        if (r) {
          r.lookT = 3.2;
          if (r.pose === 'corner' || r.pose === 'sulk') r.nodT = 0; else r.hopT = 0.35;
          if (!player.walking) player.goalYaw = Math.atan2(r.x - player.x, r.z - player.z);
        }
        ctx.emit('member:tap', { id: hit.id });
        return;
      }
      if (hit.type === 'floor') {
        var t = pushOut(clampX(hit.x), clampZ(hit.z));
        player.pending = null;
        startWalk(t.x, t.z);
      }
    }
    function walkToHotspot(action) {
      var h = hs[action];
      if (!h || !state || !player.p) return false;
      var st = h.def.stand;
      player.pending = action; player.faceT = 0; player.faceYaw = h.def.face;
      startWalk(st[0], st[1]);
      return true;
    }
    function clampX(x) { return clamp(x, ROOM.x0 + WALK.margin, ROOM.x1 - WALK.margin); }
    function clampZ(z) { return clamp(z, ROOM.z0 + WALK.margin, ROOM.z1 - WALK.margin); }
    function pushOut(x, z) {
      for (var n = 0; n < 2; n++) {
        for (var i = 0; i < obstacles.length; i++) {
          var o = obstacles[i];
          if (x > o[0] && x < o[2] && z > o[1] && z < o[3]) {
            var d0 = x - o[0], d1 = o[2] - x, d2 = z - o[1], d3 = o[3] - z, m = Math.min(d0, d1, d2, d3);
            if (m === d0) x = o[0] - 0.05; else if (m === d1) x = o[2] + 0.05; else if (m === d2) z = o[1] - 0.05; else z = o[3] + 0.05;
            x = clampX(x); z = clampZ(z);
          }
        }
      }
      _pt.x = x; _pt.z = z; return _pt;
    }
    function startWalk(tx, tz) {
      var p = player, dx = tx - p.x, dz = tz - p.z;
      if (dx * dx + dz * dz < 0.0025) {          // already there: just turn (and fire the hotspot)
        p.walking = false; p.x = tx; p.z = tz;
        if (p.pending) { p.goalYaw = p.faceYaw; p.faceT = 0; }
        p.pose = p.pending === 'kit' ? 'drum' : p.pose === 'drum' && !p.pending ? 'drum' : 'stand';
        ctx.ring.hide();
        return;
      }
      p.pose = 'stand';                          // (gets up from the throne if he was drumming)
      planPath(p.x, p.z, tx, tz);
      p.pathIdx = 0; p.walking = true;
      ctx.ring.show(tx, 0, tz);
    }
    // Straight line, or one/two detour corners around the first prop in the way.
    function planPath(ax, az, bx, bz) {
      var p = player, i, best = -1, bestLen = Infinity, o = blocked(ax, az, bx, bz);
      p.pathLen = 1; p.path[0].x = bx; p.path[0].z = bz;
      if (o) {
        var e = WALK.inflate + 0.06, cx = [o[0] - e, o[2] + e, o[2] + e, o[0] - e], cz = [o[1] - e, o[1] - e, o[3] + e, o[3] + e];
        for (i = 0; i < 4; i++) {
          if (!walkable(cx[i], cz[i]) || blocked(ax, az, cx[i], cz[i]) || blocked(cx[i], cz[i], bx, bz)) continue;
          var L = dist(ax, az, cx[i], cz[i]) + dist(cx[i], cz[i], bx, bz);
          if (L < bestLen) { bestLen = L; best = i; }
        }
        if (best >= 0) { setWp(0, cx[best], cz[best]); setWp(1, bx, bz); p.pathLen = 2; }
        else {
          for (i = 0; i < 4; i++) for (var s = -1; s <= 1; s += 2) {
            var j = (i + s + 4) % 4;
            if (!walkable(cx[i], cz[i]) || !walkable(cx[j], cz[j])) continue;
            if (blocked(ax, az, cx[i], cz[i]) || blocked(cx[i], cz[i], cx[j], cz[j]) || blocked(cx[j], cz[j], bx, bz)) continue;
            var L2 = dist(ax, az, cx[i], cz[i]) + dist(cx[i], cz[i], cx[j], cz[j]) + dist(cx[j], cz[j], bx, bz);
            if (L2 < bestLen) { bestLen = L2; best = i * 2 + (s > 0 ? 1 : 0); }
          }
          if (best >= 0) {
            var bi = best >> 1, bj = (bi + ((best & 1) ? 1 : -1) + 4) % 4;
            setWp(0, cx[bi], cz[bi]); setWp(1, cx[bj], cz[bj]); setWp(2, bx, bz); p.pathLen = 3;
          }
        }
      }
      var acc = 0;                                  // remaining length after each waypoint (for braking)
      for (i = p.pathLen - 1; i >= 0; i--) { p.rest[i] = acc; if (i > 0) acc += dist(p.path[i - 1].x, p.path[i - 1].z, p.path[i].x, p.path[i].z); }
    }
    function setWp(i, x, z) { player.path[i].x = x; player.path[i].z = z; }
    function dist(ax, az, bx, bz) { var dx = bx - ax, dz = bz - az; return Math.sqrt(dx * dx + dz * dz); }
    function walkable(x, z) { return x >= ROOM.x0 + 0.2 && x <= ROOM.x1 - 0.2 && z >= ROOM.z0 + 0.2 && z <= ROOM.z1 - 0.1; }
    function blocked(ax, az, bx, bz) {
      var f = WALK.inflate;
      for (var i = 0; i < obstacles.length; i++) {
        var o = obstacles[i], x0 = o[0] - f, z0 = o[1] - f, x1 = o[2] + f, z1 = o[3] + f;
        if ((ax > x0 && ax < x1 && az > z0 && az < z1) || (bx > x0 && bx < x1 && bz > z0 && bz < z1)) continue;
        if (segBox(ax, az, bx, bz, x0, z0, x1, z1)) return o;
      }
      return null;
    }
    function segBox(ax, az, bx, bz, x0, z0, x1, z1) {       // slab test: does segment a→b cross the box?
      var r = slab(ax, bx - ax, x0, x1, 0, 1);
      return r >= 0 && slab(az, bz - az, z0, z1, _slab.t0, _slab.t1) >= 0;
    }
    // Clips [t0, t1] to the parameter range where a + t·d lies within [lo, hi]; -1 when empty.
    var _slab = { t0: 0, t1: 1 };
    function slab(a, d, lo, hi, t0, t1) {
      if (Math.abs(d) < 1e-9) { if (a <= lo || a >= hi) return -1; _slab.t0 = t0; _slab.t1 = t1; return 1; }
      var u0 = (lo - a) / d, u1 = (hi - a) / d, t;
      if (u0 > u1) { t = u0; u0 = u1; u1 = t; }
      if (u0 > t0) t0 = u0; if (u1 < t1) t1 = u1;
      _slab.t0 = t0; _slab.t1 = t1;
      return t0 < t1 ? 1 : -1;
    }

    // Ease in (accelerate), cruise, ease out (brake to stop on the target); turn toward travel.
    function updatePlayer(dt, t) {
      var p = player, bn = p.p.bones;
      if (p.walking) {
        var wp = p.path[p.pathIdx], dx = wp.x - p.x, dz = wp.z - p.z, d = Math.sqrt(dx * dx + dz * dz);
        var remain = d + p.rest[p.pathIdx];
        var want = Math.max(WALK.minSpeed, Math.min(WALK.speed, Math.sqrt(2 * WALK.decel * remain)));
        p.speed += clamp(want - p.speed, -WALK.decel * 2 * dt, WALK.accel * dt);
        var step = p.speed * dt;
        if (d > 1e-4) p.goalYaw = Math.atan2(dx, dz);
        if (step >= d) {
          p.x = wp.x; p.z = wp.z;
          if (++p.pathIdx >= p.pathLen) arrive();
        } else { p.x += dx / d * step; p.z += dz / d * step; }
        p.phase += step / WALK.stride * Math.PI * 2;
      } else {
        p.speed = Math.max(0, p.speed - WALK.decel * 2 * dt);
      }
      p.yaw = ctx.approachAngle(p.yaw, p.goalYaw, p.walking ? 9 : 7, dt);
      if (p.pending && !p.walking) {
        p.faceT += dt;
        if (Math.abs(ctx.wrapAngle(p.goalYaw - p.yaw)) < 0.12 || p.faceT > 0.7) {
          var action = p.pending; p.pending = null;
          ctx.emit('hotspot', { action: action });
        }
      }
      // Pose
      resetPose(p.p, 'stand');
      var amp = clamp(p.speed / WALK.speed, 0, 1);
      if (p.pose === 'drum') drumPose(bn, t, p.scale / KIT_SCALE);
      else if (amp > 0.02) { walkCycle(bn, p.phase, amp); p.idleT = 0; }
      else { p.idleT += dt; playerIdle(bn, t, p.idleT); }
      p.p.root.position.set(p.x, 0, p.z);
      p.p.root.rotation.y = p.yaw;
    }
    function arrive() {
      var p = player;
      p.walking = false;
      ctx.ring.hide();
      if (p.pending) {
        p.goalYaw = p.faceYaw; p.faceT = 0;
        if (p.pending === 'kit') p.pose = 'drum';
      }
    }
    function playerIdle(bn, t, idleT) {
      rot(bn[B_ARM_L], 0, 0, 0.1); rot(bn[B_ARM_R], 0, 0, -0.1);
      rot(bn[B_FORE_L], -0.35, 0, 0); rot(bn[B_FORE_R], -0.35, 0, 0);
      var c = (idleT + 3) % 8;                           // an air-drum flourish every 8 s of idling
      if (idleT > 4 && c < 1.6) {
        var w = bump(c / 1.6);
        bn[B_ARM_L].rotation.x = -0.35 * w; bn[B_ARM_R].rotation.x = -0.35 * w;
        bn[B_FORE_L].rotation.x = -0.35 - (0.75 + 0.35 * Math.sin(t * 17)) * w;
        bn[B_FORE_R].rotation.x = -0.35 - (0.75 + 0.35 * Math.sin(t * 17 + Math.PI)) * w;
        bn[B_HEAD].rotation.x = 0.1 * w * Math.max(0, Math.sin(t * 8.5));
      }
      bn[B_HEAD].rotation.y = 0.25 * Math.sin(t * 0.37) * Math.sin(t * 0.23);
      breathe(bn, t, 1);
    }
    function drumPose(bn, t, scale) {                    // on the throne, playing a little groove
      sit(bn, 0.54 / scale);
      var hat = Math.max(0, Math.sin(t * 13)), back = bump(((t * 1.3) % 1) / 0.35);
      rot(bn[B_ARM_L], -0.5, 0, 0.3); rot(bn[B_FORE_L], -0.8 - 0.35 * back, 0, -0.4);
      rot(bn[B_ARM_R], -0.55, 0, -0.25); rot(bn[B_FORE_R], -0.95 - 0.3 * hat, 0, 0.4);
      bn[B_LEG_R].rotation.x -= 0.12 * bump(((t * 1.3 + 0.5) % 1) / 0.3);
      bn[B_HEAD].rotation.x = 0.08 + 0.08 * back;
      bn[B_SPINE].rotation.x = 0.1;
    }

    // ======================================================================================================
    // Frame update (no allocation).
    function update(dt, t) {
      if (!player.p) return;
      updatePlayer(dt, t);
      var n = shadowSpots.length;
      setShadow(n++, player.x, player.z, 0.62 * player.scale, 0.62 * player.scale, 0);
      for (var i = 0; i < peopleList.length; i++) {
        var r = peopleList[i], bn = r.p.bones, tt = t * r.energy + r.phase;
        resetPose(r.p, r.pose);
        (IDLES[r.pose] || IDLES.stand)(r, bn, tt, dt);
        if (r.pose !== 'sulk' && r.pose !== 'pace' && r.pose !== 'mirror') capeIdle(bn, tt, 0);
        if (r.mood < 45 && r.pose !== 'sulk') { bn[B_HEAD].rotation.x += 0.14; bn[B_SPINE].rotation.x += 0.06; }
        // Tapped: turn toward the player (seated people turn their head), hop or nod.
        r.lookT -= dt;
        r.lookW += ((r.lookT > 0 ? 1 : 0) - r.lookW) * (1 - Math.exp(-6 * dt));
        var yaw = r.baseYaw;
        if (r.lookW > 0.001) {
          var rel = ctx.wrapAngle(Math.atan2(player.x - r.x, player.z - r.z) - r.baseYaw);
          if (r.seat || r.pose === 'pace') bn[B_HEAD].rotation.y += clamp(rel, -1.1, 1.1) * r.lookW;
          else yaw = r.baseYaw + rel * r.lookW;
        }
        if (r.hopT > 0) { r.hopT -= dt; bn[B_HIPS].position.y += 0.07 * bump(1 - r.hopT / 0.35); }
        if (r.nodT >= 0) { r.nodT += dt; bn[B_HEAD].rotation.x += 0.3 * bump(r.nodT / 1.1); if (r.nodT > 1.1) r.nodT = -1; }
        r.yaw = yaw;
        r.p.root.position.set(r.x, 0, r.z);
        r.p.root.rotation.y = yaw;
        var fwd = r.seat ? 0.18 : 0;
        if (n < shadowSpots.length + MAX_PEOPLE) setShadow(n++, r.x + Math.sin(yaw) * fwd, r.z + Math.cos(yaw) * fwd, (r.seat ? 0.8 : 0.62) * r.scale, (r.seat ? 0.8 : 0.62) * r.scale, yaw);
      }
      for (; n < shadowSpots.length + MAX_PEOPLE; n++) setShadow(n, 0, 0, 0, 0, 0);
      shadows.instanceMatrix.needsUpdate = true;

      // Hotspot labels breathe; the one the player is heading for grows, the one he is using fades.
      for (i = 0; i < hsList.length; i++) {
        var h = hsList[i], k = h.i * 0.9, big = player.pending === h.def.action ? 1.12 : 1, st = h.def.stand;
        var here = !player.walking && Math.abs(player.x - st[0]) < 0.3 && Math.abs(player.z - st[1]) < 0.3;
        h.fade += ((here ? 0.3 : 1) - h.fade) * (1 - Math.exp(-5 * dt));
        h.label.material.opacity = h.fade;
        ctx.scaleLabel(h.label, big * (1 + 0.035 * Math.sin(t * 2.4 + k)));
        h.label.position.y = h.y + 0.025 * Math.sin(t * 1.7 + k);
      }
      // Bulb: slow swing and a tired-bulb flicker now and then.
      bulbPivot.rotation.z = 0.035 * Math.sin(t * 0.9); bulbPivot.rotation.x = 0.02 * Math.sin(t * 0.7 + 1);
      var fl = (t % 13) < 0.18 ? 0.72 + 0.2 * Math.sin(t * 90) : 1;
      bulb.intensity = 1.55 * fl * (1 + 0.025 * Math.sin(t * 23) * Math.sin(t * 3.1));
      halo.material.opacity = 0.5 * fl;
      dust.update(t); yard.update(t); decor.update(t);
      // Camera: gently follow the player.
      var k2 = 1 - Math.exp(-2.5 * dt);
      followT.x += (camT.x + (player.x - camT.x) * CAM.follow - followT.x) * k2;
      followT.z += (camT.z + (player.z - camT.z) * CAM.follow - followT.z) * k2;
      ctx.placeCamera(followT.x, followT.y, followT.z);
    }

    // ======================================================================================================
    // Queries.
    function anchor(kind, id, out) {
      if (kind === 'hotspot' || kind === 'label') {
        var h = hs[id]; if (!h) return false;
        out.copy(kind === 'label' ? h.label.position : h.box.position); return true;
      }
      if (kind === 'player') { if (!player.p) return false; out.set(player.x, 1.1 * player.scale, player.z); return true; }
      var r = people[id];
      if (!r) return false;
      var s = r.scale, fwd = r.seat ? 0.15 : 0;
      out.set(r.x + Math.sin(r.yaw) * fwd, (r.seat ? 0.8 : 1.12) * s, r.z + Math.cos(r.yaw) * fwd);
      return true;
    }
    function debug() {
      var ms = [];
      for (var id in people) ms.push({ id: id, pose: people[id].pose, mood: people[id].mood, x: rnd(people[id].x), z: rnd(people[id].z) });
      var w = player.walking ? player.path[player.pathLen - 1] : null;
      return {
        player: { x: rnd(player.x), z: rnd(player.z), pose: player.walking ? 'walk' : player.pose },
        target: w ? { x: rnd(w.x), z: rnd(w.z) } : null, walking: player.walking, pending: player.pending,
        hotspots: hotspotActions.slice(), members: ms, cape: capeShown, kitColor: kit.color, banner: banner.text, season: yard.season, decor: decor.state(), fanMail: fanMail.state(),
        trophyWall: trophyWall.counts
      };
    }
    function rnd(v) { return Math.round(v * 100) / 100; }

    // ======================================================================================================
    // Builders (run once, at scene build time).
    function rotLocal(F, lx, lz) {                  // frame-local (x, z) -> world, frame = { x, z, yaw }
      var c = Math.cos(F.yaw), s = Math.sin(F.yaw);
      return { x: F.x + lx * c + lz * s, z: F.z - lx * s + lz * c };
    }

    function buildShell(b, g) {
      var WALL = 0xa89f8c, LOW = 0x7f8b84, BASE = 0x4f463d, WOOD = 0x6b5236, CUT = 0x3b3530;
      var x0 = ROOM.x0, x1 = ROOM.x1, z0 = ROOM.z0, z1 = ROOM.z1, w = ROOM.wall, H = ROOM.h;
      // Slab + gravel edge (the cutaway sides show it).
      b.box(x1 - x0 + w, 0.3, z1 - z0 + w, (x0 + x1 + w) / 2, -0.155, (z0 - w + z1) / 2, 0x57544f);
      b.box(x1 - x0 + w + 0.01, 0.1, z1 - z0 + w + 0.01, (x0 + x1 + w) / 2, -0.26, (z0 - w + z1) / 2, 0x3e342b);
      // Concrete floor: a jittered grid so it reads as poured concrete, not a flat colour.
      var jit = b.jit; b.jit = 0.035;
      var nx = 9, nz = 10, dx = (x1 - x0) / nx, dz = (z1 - z0) / nz;
      for (var i = 0; i < nx; i++) for (var j = 0; j < nz; j++) {
        var ax = x0 + i * dx, az = z0 + j * dz;
        b.quad([ax, 0, az + dz], [ax + dx, 0, az + dz], [ax + dx, 0, az], [ax, 0, az], 0x77736d);
      }
      b.jit = jit;
      b.box(x1 - x0, 0.004, 0.025, (x0 + x1) / 2, 0.002, 0.3, 0x5b5853);           // expansion joints
      b.box(0.025, 0.004, z1 - z0, 0.55, 0.002, 0, 0x5b5853);
      stain(b, 0.75, 0.15, 0.45, 0x3d3935, 21); stain(b, 0.95, 0.35, 0.18, 0x2f2c29, 5);   // where Dad's truck used to leak
      // Walls: back (z0) and right (x1), painted drywall over a sage wainscot, wooden top plates.
      b.box(x1 - x0 + w, H, w, (x0 + x1 + w) / 2, H / 2, z0 - w / 2, WALL);
      b.box(w, H, z1 - z0 + w, x1 + w / 2, H / 2, (z0 - w + z1) / 2, WALL);
      b.box(x1 - x0, 0.95, 0.01, (x0 + x1) / 2, 0.475, z0 + 0.005, LOW);
      b.box(0.01, 0.95, z1 - z0, x1 - 0.005, 0.475, (z0 + z1) / 2, LOW);
      b.box(x1 - x0, 0.03, 0.02, (x0 + x1) / 2, 0.965, z0 + 0.01, BASE); b.box(0.02, 0.03, z1 - z0, x1 - 0.01, 0.965, (z0 + z1) / 2, BASE);
      b.box(x1 - x0, 0.12, 0.025, (x0 + x1) / 2, 0.06, z0 + 0.012, BASE); b.box(0.025, 0.12, z1 - z0, x1 - 0.012, 0.06, (z0 + z1) / 2, BASE);
      b.box(x1 - x0 + w + 0.06, 0.1, w + 0.08, (x0 + x1 + w) / 2, H + 0.05, z0 - w / 2, WOOD);
      b.box(w + 0.08, 0.1, z1 - z0 + w, x1 + w / 2, H + 0.05, (z0 - w + z1) / 2, WOOD);
      b.box(0.012, H, w, x0 - 0.006, H / 2, z0 - w / 2, CUT); b.box(w, H, 0.012, x1 + w / 2, H / 2, z1 + 0.006, CUT);
      b.box(0.09, H, 0.09, x1 - 0.045, H / 2, z0 + 0.045, WOOD);                     // corner trim
      // String lights along both wall tops (bulbs glow).
      stringLights(b, g, x0 + 0.1, z0 + 0.05, x1 - 0.1, z0 + 0.05, 20, 5);
      stringLights(b, g, x1 - 0.05, z0 + 0.1, x1 - 0.05, z1 - 0.1, 22, 5);
    }
    function stain(b, cx, cz, r, color, seed) {
      var rng = GG.RNG(seed), n = 12, pts = [];
      for (var i = 0; i < n; i++) { var a = i / n * Math.PI * 2, rr = r * (0.6 + 0.5 * rng.next()); pts.push([cx + Math.cos(a) * rr, 0.003, cz + Math.sin(a) * rr * 0.75]); }
      for (i = 0; i < n; i++) b.tri([cx, 0.003, cz], pts[(i + 1) % n], pts[i], color);
    }
    function stringLights(b, g, ax, az, bx, bz, n, hooks) {
      var COLS = [0xff4d4d, 0x4dff88, 0x4d8cff, 0xffc34d, 0xff66dd], px = 0, py = 0, pz = 0;
      for (var i = 0; i <= n; i++) {
        var u = i / n, x = ax + (bx - ax) * u, z = az + (bz - az) * u, f = u * hooks - Math.floor(u * hooks);
        var y = 2.58 - 0.11 * Math.sin(Math.PI * f);
        if (i > 0) {
          var mx = (x + px) / 2, my = (y + py) / 2, mz = (z + pz) / 2, dy = y - py;
          if (Math.abs(bx - ax) > Math.abs(bz - az)) { var dx = x - px; b.box(Math.sqrt(dx * dx + dy * dy), 0.012, 0.012, mx, my, mz, 0x1a1a1a, 0, 0, Math.atan2(dy, dx)); }
          else { var dz = z - pz; b.box(0.012, 0.012, Math.sqrt(dz * dz + dy * dy), mx, my, mz, 0x1a1a1a, -Math.atan2(dy, dz)); }
        }
        g.box(0.04, 0.06, 0.04, x, y - 0.045, z, COLS[i % COLS.length]);
        px = x; py = y; pz = z;
      }
    }

    // Garage door (sectional, windows in the top row) on the back wall.
    function buildDoor(b, g) {
      var DOOR = 0xa9a393, REC = sh(DOOR, 0.9), FRAME = 0x6e5a44, hw = PROPS.door.w / 2, pw = (PROPS.door.w - 0.12) / 3;
      b.at(PROPS.door.x, 0, Z0, 0); g.at(PROPS.door.x, 0, Z0, 0);
      b.box(0.1, 2.25, 0.06, hw + 0.05, 1.125, 0.03, FRAME); b.box(0.1, 2.25, 0.06, -hw - 0.05, 1.125, 0.03, FRAME);
      b.box(PROPS.door.w + 0.2, 0.1, 0.06, 0, 2.2, 0.03, FRAME);
      for (var i = 0; i < 4; i++) {
        var yc = i * DOOR_SEC + DOOR_SEC / 2;
        b.box(PROPS.door.w, DOOR_SEC - 0.02, 0.05, 0, yc, 0.035, DOOR);
        for (var k = -1; k <= 1; k++) {
          if (i === 3) {                              // top section: windows onto the moonlit night
            b.box(pw - 0.06, 0.33, 0.015, k * (pw + 0.03), yc, 0.066, 0x8f887c);
            gradRect(g, pw - 0.14, 0.26, k * (pw + 0.03), yc, 0.075, 0x4b66a4, 0x1f2f58);
          } else b.box(pw - 0.05, 0.32, 0.02, k * (pw + 0.03), yc, 0.066, REC);
        }
      }
      g.cyl(0.05, 0.05, 0.01, 12, pw + 0.12, 1.93, 0.08, 0xf2edd2, Math.PI / 2);        // the moon, in the right-hand pane
      var STARS = [[-0.95, 1.95], [-0.7, 1.84], [-0.85, 1.78], [-0.15, 1.96], [0.12, 1.82], [0.25, 1.93], [0.62, 1.8], [0.9, 1.84]];
      for (i = 0; i < STARS.length; i++) g.rect(0.012, 0.012, STARS[i][0], STARS[i][1], 0.084, 0xdfe6ff);
      b.box(0.28, 0.04, 0.05, 0, 0.32, 0.08, 0x3a3a3a);                                  // handle
      b.box(PROPS.door.w, 0.03, 0.07, 0, 0.015, 0.04, 0x222222);                        // weather seal
      b.box(0.05, 0.05, 0.05, -0.95, 1.46, 0.1, 0x8a7a5a); b.box(0.05, 0.05, 0.05, 0.95, 1.46, 0.1, 0x8a7a5a);   // banner ties
      b.at(0, 0, 0, 0); g.at(0, 0, 0, 0);
    }
    function gradRect(g, w, h, x, y, z, cTop, cBot) {
      var a = [x - w / 2, y - h / 2, z], bb = [x + w / 2, y - h / 2, z], c = [x + w / 2, y + h / 2, z], d = [x - w / 2, y + h / 2, z];
      g.triC(a, bb, c, cBot, cBot, cTop); g.triC(a, c, d, cBot, cTop, cTop);
    }

    function buildBackWall(b, g, foot) {
      var i;
      // Pegboard with Dad's tools, above the amps.
      b.at(PROPS.amps.x, 0, Z0, 0);
      b.box(1.0, 0.8, 0.02, 0, 1.7, 0.012, 0x9c7a52);
      for (var r = 0; r < 7; r++) for (var c = 0; c < 9; c++) b.rect(0.016, 0.016, -0.4 + c * 0.1, 1.37 + r * 0.11, 0.023, 0x5d4630);
      b.box(0.03, 0.26, 0.02, -0.33, 1.72, 0.04, 0x9b6b3a); b.box(0.12, 0.045, 0.035, -0.33, 1.86, 0.04, 0x55595f);   // hammer
      b.box(0.03, 0.24, 0.012, -0.17, 1.7, 0.035, 0x9aa0a8, 0, 0, 0.15); b.box(0.07, 0.05, 0.012, -0.19, 1.83, 0.035, 0x9aa0a8);
      b.box(0.34, 0.1, 0.008, 0.1, 1.53, 0.03, 0xb7bcc3); b.box(0.08, 0.1, 0.02, -0.1, 1.54, 0.035, 0x8b2d22);         // saw
      b.box(0.025, 0.12, 0.02, 0.05, 1.86, 0.035, 0xd23c3c); b.box(0.008, 0.1, 0.008, 0.05, 1.75, 0.035, 0x9aa0a8);
      b.box(0.025, 0.12, 0.02, 0.12, 1.86, 0.035, 0xe8c531); b.box(0.008, 0.1, 0.008, 0.12, 1.75, 0.035, 0x9aa0a8);
      b.box(0.08, 0.08, 0.04, 0.36, 1.86, 0.035, 0xe8c531);                                                           // tape measure
      b.cyl(0.1, 0.1, 0.03, 10, 0.3, 1.64, 0.04, 0x222226, Math.PI / 2);                                               // coiled cable
      // Half-stack amp.
      b.at(PROPS.amps.x, 0, Z0 + 0.2, 0); g.at(PROPS.amps.x, 0, Z0 + 0.2, 0);
      b.box(0.72, 0.72, 0.36, 0, 0.36, 0, 0x1b1b1d); b.box(0.64, 0.64, 0.01, 0, 0.36, 0.181, 0x2e2c2a);
      b.box(0.14, 0.04, 0.012, -0.2, 0.62, 0.186, 0xd9d4c8);
      b.box(0.7, 0.26, 0.3, 0, 0.85, -0.02, 0x1b1b1d); b.box(0.62, 0.08, 0.01, 0, 0.87, 0.131, 0xc9a24a);
      for (var k = 0; k < 6; k++) b.cyl(0.018, 0.018, 0.02, 6, -0.22 + k * 0.08, 0.87, 0.14, 0x111111, Math.PI / 2);
      g.box(0.03, 0.03, 0.01, 0.26, 0.8, 0.136, 0xff3b30);
      foot(PROPS.amps.x, Z0 + 0.2, 0.75, 0.4, 0);
      // Hockey stick leaning between the amps and the door (it's Saskatoon).
      b.at(PROPS.door.x - PROPS.door.w / 2 - 0.2, 0, Z0 + 0.12, 0);
      b.box(0.03, 1.35, 0.022, 0, 0.68, 0, 0x8b5a2b, -0.1, 0, 0.08); b.box(0.28, 0.07, 0.016, 0.1, 0.04, 0.07, 0x1a1a1a);
      b.box(0.032, 0.12, 0.024, -0.052, 1.3, -0.065, 0x1a1a1a, -0.1, 0, 0.08);
      // Trophy shelf: nearly empty (one tiny gold cup, a bowling trophy, a participation ribbon, one photo).
      b.at(PROPS.trophies.x, 0, Z0, 0);
      var GOLD = 0xd4a940;
      b.box(1.25, 0.04, 0.26, 0, 1.5, 0.13, 0x7a5a3a);
      b.box(0.03, 0.18, 0.2, -0.5, 1.4, 0.1, 0x444444); b.box(0.03, 0.18, 0.2, 0.5, 1.4, 0.1, 0x444444);
      b.box(0.12, 0.05, 0.12, -0.4, 1.545, 0.13, 0x5a3d25); b.cyl(0.015, 0.02, 0.08, 6, -0.4, 1.61, 0.13, GOLD);
      b.cyl(0.07, 0.035, 0.1, 8, -0.4, 1.7, 0.13, GOLD);
      b.box(0.1, 0.04, 0.1, -0.12, 1.54, 0.13, 0x5a3d25); b.box(0.04, 0.16, 0.04, -0.12, 1.64, 0.13, 0xc9ced6); b.box(0.07, 0.07, 0.07, -0.12, 1.75, 0.13, GOLD);
      b.cyl(0.07, 0.07, 0.015, 10, 0.18, 1.8, 0.02, 0x2f6fd1, Math.PI / 2); b.cyl(0.035, 0.035, 0.018, 8, 0.18, 1.8, 0.022, 0xe8c531, Math.PI / 2);
      b.box(0.04, 0.14, 0.01, 0.15, 1.68, 0.015, 0x2f6fd1, 0, 0, 0.15); b.box(0.04, 0.14, 0.01, 0.21, 1.68, 0.015, 0x2f6fd1, 0, 0, -0.15);
      b.box(0.22, 0.17, 0.025, 0.4, 1.6, 0.08, 0x3a2a1c, -0.18); b.box(0.18, 0.13, 0.01, 0.4, 1.6, 0.095, 0x8aa2b8, -0.18);
      // Kenji's bass leaning on the back wall in his corner.
      b.at(PROPS.bass.x, 0, Z0 + 0.1, 0.3);
      b.push(0, 0, 0, -0.16, 0, 0);
      b.box(0.3, 0.42, 0.07, 0, 0.3, 0, 0x111111); b.box(0.2, 0.12, 0.072, 0.06, 0.45, 0, 0x111111);
      b.box(0.055, 0.8, 0.035, 0, 0.9, 0.01, 0x2a1a10); b.box(0.1, 0.16, 0.03, 0, 1.36, 0.01, 0x111111);
      b.box(0.08, 0.05, 0.012, 0, 0.3, 0.04, 0xd9d4c8);
      b.pop();
      b.at(0, 0, 0, 0); g.at(0, 0, 0, 0);
    }

    function buildRightWall(b, g, foot) {
      var Q = -Math.PI / 2, i;                        // right-wall frame: local +z = into the room, local +x = toward the front
      // Corkboard gig board with flyers.
      b.at(X1, 0, PROPS.cork.z, Q);
      b.box(1.04, 0.79, 0.04, 0, 1.38, 0.02, 0x6e5236); b.box(0.96, 0.71, 0.02, 0, 1.38, 0.035, 0xb88a52);
      var FLY = [[-0.33, 1.56, 0.1, 0xf2e6a2], [-0.1, 1.6, -0.06, 0xf5b9c4], [0.14, 1.55, 0.08, 0xbfe0f2], [0.35, 1.58, -0.12, 0xf7f3ea],
        [-0.28, 1.22, -0.08, 0xc9f0b8], [0.02, 1.2, 0.12, 0xffb37a], [0.3, 1.24, 0.04, 0xe9d4ff]];
      for (i = 0; i < FLY.length; i++) {
        var f = FLY[i];
        b.push(f[0], f[1], 0.05, 0, 0, f[2]);
        b.box(0.19, 0.25, 0.006, 0, 0, 0, f[3]); b.box(0.13, 0.035, 0.004, 0, 0.07, 0.004, sh(f[3], 0.45));
        b.box(0.13, 0.012, 0.004, 0, 0.0, 0.004, 0x666666); b.box(0.1, 0.012, 0.004, 0, -0.04, 0.004, 0x666666);
        b.box(0.025, 0.025, 0.02, 0, 0.105, 0.01, 0xd23c3c);
        b.pop();
      }
      // Whiteboard: this week's plan in three columns, plus doodles.
      b.at(X1, 0, PROPS.board.z, Q);
      b.box(1.55, 0.95, 0.03, 0, 1.4, 0.015, 0xb9bdc4); b.box(1.49, 0.89, 0.02, 0, 1.4, 0.028, 0xf2f2ee);
      b.box(1.3, 0.03, 0.07, 0, 0.94, 0.05, 0xb9bdc4);
      b.box(0.1, 0.02, 0.02, -0.3, 0.965, 0.05, 0xd23c3c); b.box(0.1, 0.02, 0.02, -0.15, 0.965, 0.05, 0x2a4fa8); b.box(0.1, 0.02, 0.02, 0.2, 0.965, 0.05, 0x222222);
      var MK = 0x2a4fa8, INK = 0x333333, RED = 0xc62828;
      for (var col = -1; col <= 1; col++) {
        var cx = col * 0.48, L = [0.3, 0.22, 0.34, 0.18];
        b.box(0.22, 0.022, 0.004, cx, 1.74, 0.04, MK);
        for (var r = 0; r < 4; r++) b.box(L[(r + col + 4) % 4], 0.012, 0.004, cx - 0.2 + L[(r + col + 4) % 4] / 2, 1.62 - r * 0.1, 0.04, INK);
      }
      b.box(0.012, 0.66, 0.004, -0.24, 1.4, 0.04, INK); b.box(0.012, 0.66, 0.004, 0.24, 1.4, 0.04, INK);
      b.box(0.36, 0.01, 0.004, 0.46, 1.64, 0.042, RED); b.box(0.36, 0.01, 0.004, 0.46, 1.5, 0.042, RED);     // circled item
      b.box(0.01, 0.14, 0.004, 0.28, 1.57, 0.042, RED); b.box(0.01, 0.14, 0.004, 0.64, 1.57, 0.042, RED);
      b.box(0.1, 0.014, 0.004, -0.55, 1.12, 0.04, RED, 0, 0, 0.9); b.box(0.1, 0.014, 0.004, -0.5, 1.1, 0.04, RED, 0, 0, -0.3);   // lightning doodle
      b.box(0.1, 0.014, 0.004, -0.45, 1.08, 0.04, RED, 0, 0, 0.9);
      // Band poster above the couch.
      b.at(X1, 0, PROPS.couch.z, Q);
      b.box(0.66, 0.9, 0.01, 0, 1.62, 0.01, 0x17171c); b.box(0.5, 0.07, 0.004, 0, 1.94, 0.018, 0xb3141c);
      b.box(0.24, 0.22, 0.004, 0, 1.68, 0.018, 0xe9e5dc); b.box(0.16, 0.08, 0.004, 0, 1.54, 0.018, 0xe9e5dc);
      b.box(0.06, 0.06, 0.004, 0.06, 1.7, 0.022, 0x17171c); b.box(0.06, 0.06, 0.004, -0.06, 1.7, 0.022, 0x17171c);
      b.box(0.4, 0.03, 0.004, 0, 1.3, 0.018, 0x9a9a9a);
      // Beat-up couch against the wall (the sulk zone).
      var CO = 0x6a5a3c, CU = 0x7a6a48;
      b.at(X1 - 0.42, 0, PROPS.couch.z, Q);
      b.box(1.5, 0.25, 0.8, 0, 0.2, 0, CO);
      for (i = 0; i < 4; i++) b.box(0.06, 0.08, 0.06, (i % 2 ? 0.7 : -0.7), 0.04, (i < 2 ? 0.34 : -0.34), 0x2a1f16);
      for (i = -1; i <= 1; i++) { b.box(0.47, 0.14, 0.62, i * 0.49, 0.39, 0.06, CU); b.box(0.46, 0.36, 0.14, i * 0.49, 0.66, -0.22, CU, -0.12); }
      b.box(0.2, 0.012, 0.2, 0.45, 0.465, 0.12, 0x8c6f47); b.box(0.45, 0.012, 0.05, 0.49, 0.467, -0.02, 0xb9bdc4, 0, 0.5);  // patch + duct tape
      b.box(1.5, 0.5, 0.2, 0, 0.62, -0.33, CO);
      b.box(0.18, 0.5, 0.8, 0.83, 0.4, 0, CO); b.box(0.18, 0.5, 0.8, -0.83, 0.4, 0, CO);
      b.box(0.3, 0.26, 0.1, -0.46, 0.6, -0.08, 0x3f6f8f, -0.3, 0.3, 0.2);                                             // throw pillow
      foot(X1 - 0.42, PROPS.couch.z, 1.84, 0.85, Q);
      // Wall outlet + orange extension cord snaking to the amps.
      b.at(0, 0, 0, 0);
      b.box(0.02, 0.1, 0.07, X1 - 0.01, 0.35, PROPS.outlet.z, 0xeeeeee);
      cord(b, [[X1 - 0.02, PROPS.outlet.z], [1.55, -0.55], [0.95, -1.35], [0.25, -1.75], [-0.3, -2.3]], 0xe07a1f);
    }
    function cord(b, pts, color) {
      for (var i = 1; i < pts.length; i++) {
        var ax = pts[i - 1][0], az = pts[i - 1][1], bx = pts[i][0], bz = pts[i][1], dx = bx - ax, dz = bz - az;
        b.box(0.028, 0.02, Math.sqrt(dx * dx + dz * dz) + 0.02, (ax + bx) / 2, 0.01, (az + bz) / 2, color, 0, Math.atan2(dx, dz), 0);
      }
    }

    function buildFloorProps(b, g, foot) {
      var i, P;
      // Rug under the kit (the kit itself is its own mesh; see buildKit).
      b.at(KIT.x, 0, KIT.z, KIT.yaw);
      b.box(2.0, 0.014, 1.7, 0, 0.007, -0.12, 0x6e1f2b); b.box(1.78, 0.016, 1.46, 0, 0.008, -0.12, 0x9a3340);
      b.box(1.54, 0.018, 1.2, 0, 0.009, -0.12, 0x7a2533); b.box(0.52, 0.02, 0.52, 0, 0.01, -0.12, 0xc99a55, 0, Math.PI / 4);
      foot(KIT.x, KIT.z + 0.03, 1.45, 0.95, KIT.yaw);
      shadowSpots.pop(); shadowSpots.push([KIT.x, KIT.z + 0.05, 1.55, 1.25, KIT.yaw]);
      // Standing mirror (Marcel's stage): he poses into it with his back (and cape) to us.
      P = PROPS.mirror; b.at(P.x, 0, P.z, P.yaw);
      b.box(0.05, 1.55, 0.05, 0.32, 0.77, -0.12, 0x5a3d25, 0.12); b.box(0.05, 1.55, 0.05, -0.32, 0.77, -0.12, 0x5a3d25, 0.12);
      b.box(0.56, 1.3, 0.05, 0, 0.95, 0, 0x5a3d25, -0.08); b.box(0.48, 1.22, 0.012, 0, 0.95, 0.03, 0x9fb3c8, -0.08);
      b.box(0.08, 1.1, 0.004, -0.1, 0.97, 0.04, 0xd6e2ee, -0.08, 0, 0.3);                                            // sheen
      b.box(0.5, 1.24, 0.01, 0, 0.95, -0.03, 0x4a3322, -0.08);
      foot(P.x, P.z, 0.7, 0.35, P.yaw);
      // Cooler as a desk, laptop glowing on top (screen faces the camera side).
      P = PROPS.cooler; b.at(P.x, 0, P.z, P.yaw); g.at(P.x, 0, P.z, P.yaw);
      b.box(0.62, 0.4, 0.4, 0, 0.2, 0, 0xc0392b); b.box(0.64, 0.07, 0.42, 0, 0.435, 0, 0xf2f0ea);
      b.box(0.06, 0.05, 0.3, 0.33, 0.3, 0, 0xf2f0ea); b.box(0.06, 0.05, 0.3, -0.33, 0.3, 0, 0xf2f0ea);
      b.box(0.36, 0.02, 0.24, 0, 0.48, 0.04, 0x2c2f36); b.box(0.3, 0.004, 0.12, 0, 0.492, 0.07, 0x1b1d22);
      b.push(0, 0.49, -0.08, -0.28, 0, 0); g.push(0, 0.49, -0.08, -0.28, 0, 0);
      b.box(0.36, 0.23, 0.015, 0, 0.115, 0, 0x2c2f36); g.box(0.32, 0.19, 0.004, 0, 0.115, 0.009, 0x9fd0ff);
      g.box(0.14, 0.02, 0.002, -0.05, 0.16, 0.012, 0xffffff); g.box(0.2, 0.012, 0.002, -0.02, 0.12, 0.012, 0x5c8fd6);
      b.pop(); g.pop();
      b.cyl(0.035, 0.035, 0.12, 8, 0.22, 0.53, 0.05, 0x9ad13a); b.cyl(0.035, 0.035, 0.12, 8, -0.24, 0.53, 0.09, 0x1c1c1c);
      foot(P.x, P.z, 0.66, 0.44, P.yaw);
      // Merch: boxes of shirts nobody has bought yet.
      P = PROPS.merch; b.at(P.x, 0, P.z, P.yaw);
      var CB = 0xb08856;
      b.box(0.5, 0.36, 0.42, 0, 0.18, 0, CB); b.box(0.5, 0.05, 0.01, 0, 0.3, 0.212, 0xd9c29a);
      b.box(0.12, 0.12, 0.004, 0.12, 0.16, 0.213, 0x1a1a1a);
      b.box(0.46, 0.34, 0.4, 0.03, 0.53, -0.02, sh(CB, 0.94), 0, 0.15); b.box(0.12, 0.12, 0.004, 0.1, 0.52, 0.182, 0x1a1a1a, 0, 0.15);
      b.box(0.42, 0.24, 0.38, -0.02, 0.82, 0.02, sh(CB, 1.04), 0, -0.1);
      b.box(0.42, 0.012, 0.18, -0.02, 0.99, 0.28, sh(CB, 0.9), -0.7, -0.1); b.box(0.42, 0.012, 0.18, -0.02, 0.99, -0.24, sh(CB, 0.9), 0.7, -0.1);
      b.box(0.3, 0.04, 0.26, -0.02, 0.96, 0.02, 0x17171c, 0, -0.1); b.box(0.1, 0.1, 0.005, -0.02, 0.982, 0.02, 0xd9d4c8, -Math.PI / 2, -0.1);
      foot(P.x, P.z, 0.62, 0.55, P.yaw);
      // Dad's lawnmower (with a note), parked in front of the door.
      P = PROPS.mower; b.at(P.x, 0, P.z, P.yaw);
      b.box(0.5, 0.18, 0.55, 0, 0.17, 0, 0xc0392b); b.cyl(0.13, 0.15, 0.18, 8, 0, 0.35, -0.02, 0x2b2b2b);
      for (i = 0; i < 4; i++) b.cyl(0.09, 0.09, 0.05, 10, (i % 2 ? 0.27 : -0.27), 0.09, (i < 2 ? 0.2 : -0.2), 0x151515, 0, 0, Math.PI / 2);
      b.box(0.03, 0.85, 0.03, 0.2, 0.52, -0.46, 0x333333, -0.62); b.box(0.03, 0.85, 0.03, -0.2, 0.52, -0.46, 0x333333, -0.62);
      b.box(0.43, 0.03, 0.03, 0, 0.87, -0.7, 0x333333); b.box(0.34, 0.24, 0.3, 0, 0.3, -0.42, 0x3f5a3a);
      b.box(0.1, 0.004, 0.1, 0.12, 0.262, 0.1, 0xf2e27a);
      foot(P.x, P.z, 0.6, 0.95, P.yaw);
      // Kenji's milk crate and Jaxon's paint bucket.
      P = PROPS.crate; b.at(P.x, 0, P.z, P.yaw);
      b.box(0.4, 0.32, 0.4, 0, 0.16, 0, 0x2f5fb3);
      for (i = 0; i < 3; i++) b.box(0.402, 0.03, 0.402, 0, 0.07 + i * 0.09, 0, 0x234a8c);
      foot(P.x, P.z, 0.4, 0.4, P.yaw);
      P = PROPS.bucket; b.at(P.x, 0, P.z, 0);
      b.cyl(0.17, 0.15, 0.38, 10, 0, 0.19, 0, 0xe9e4d8); b.cyl(0.175, 0.175, 0.025, 10, 0, 0.372, 0, 0xc9c4b8);
      b.box(0.08, 0.1, 0.01, 0.0, 0.26, 0.162, 0x2f6fd1);
      foot(P.x, P.z, 0.36, 0.36, 0);
      // Space heater (orange glow) and an empty pizza box.
      P = PROPS.heater; b.at(P.x, 0, P.z, P.yaw); g.at(P.x, 0, P.z, P.yaw);
      b.box(0.3, 0.42, 0.18, 0, 0.23, 0, 0x8f8f8f); b.box(0.36, 0.03, 0.24, 0, 0.015, 0, 0x555555);
      g.box(0.24, 0.3, 0.01, 0, 0.25, 0.092, 0xff7a2a);
      for (i = 0; i < 4; i++) b.box(0.24, 0.012, 0.012, 0, 0.14 + i * 0.07, 0.1, 0x5a5a5a);
      foot(P.x, P.z, 0.34, 0.24, P.yaw);
      P = PROPS.pizza; b.at(P.x, 0, P.z, P.yaw);
      b.box(0.42, 0.05, 0.42, 0, 0.025, 0, 0xd8b98a); b.box(0.2, 0.004, 0.12, 0, 0.052, 0, 0xc0392b);
      b.at(0, 0, 0, 0); g.at(0, 0, 0, 0);
    }

    // Moon shafts: one additive mesh of light volumes from the three door windows down to the floor.
    function buildShafts() {
      var pw = (PROPS.door.w - 0.12) / 3, s = new ctx.Builder({ jitter: 0 }), dir = [0.15, -1, 1.05], wy = 3.5 * DOOR_SEC, hw = (pw - 0.14) / 2, hh = 0.13, z = Z0 + 0.08;
      var TOP = 0x1a2544, FLOOR = 0x0f1730, OFF = 0x000000;
      for (var k = -1; k <= 1; k++) {
        var wx = PROPS.door.x + k * (pw + 0.03);
        var W = [[wx - hw, wy + hh], [wx + hw, wy + hh], [wx + hw, wy - hh], [wx - hw, wy - hh]];
        var P = [], F = [];
        for (var i = 0; i < 4; i++) {
          var t = W[i][1];                       // drop to the floor
          P.push([W[i][0], W[i][1], z]); F.push([W[i][0] + dir[0] * t, 0.012, z + dir[2] * t]);
        }
        for (i = 0; i < 4; i++) {
          var j = (i + 1) % 4;
          s.triC(P[i], P[j], F[j], TOP, TOP, OFF); s.triC(P[i], F[j], F[i], TOP, OFF, OFF);
        }
        s.triC(F[3], F[2], F[1], FLOOR, FLOOR, FLOOR); s.triC(F[3], F[1], F[0], FLOOR, FLOOR, FLOOR);
      }
      var m = new THREE.Mesh(s.build(), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      m.renderOrder = 2;
      return m;
    }

    // Dust motes drifting in the bulb light (one Points object; positions updated in place).
    function buildDust() {
      var N = 44, rng = GG.RNG(99), base = new Float32Array(N * 3), fr = new Float32Array(N * 3), pos = new Float32Array(N * 3);
      for (var i = 0; i < N; i++) {
        base[i * 3] = -2.2 + rng.next() * 4.6; base[i * 3 + 1] = 0.4 + rng.next() * 1.9; base[i * 3 + 2] = -2.4 + rng.next() * 3.6;
        fr[i * 3] = 0.2 + rng.next() * 0.3; fr[i * 3 + 1] = 0.15 + rng.next() * 0.25; fr[i * 3 + 2] = rng.next() * 6.28;
      }
      var geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      var pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffdcaa, size: 0.035, map: ctx.radialTexture('glow'), transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending }));
      pts.frustumCulled = false;
      return {
        points: pts,
        update: function (t) {
          for (var i = 0; i < N; i++) {
            var j = i * 3, ph = fr[j + 2];
            pos[j] = base[j] + 0.18 * Math.sin(t * fr[j] + ph);
            pos[j + 1] = base[j + 1] + 0.12 * Math.sin(t * fr[j + 1] + ph * 1.7);
            pos[j + 2] = base[j + 2] + 0.14 * Math.cos(t * fr[j] * 0.8 + ph);
          }
          geo.attributes.position.needsUpdate = true;
        }
      };
    }

    // The yard outside, by season (02_contracts: week 1 = early July): a soft ground glow fading into the
    // night, one Points object for the weather (fireflies / leaves / snow / rain) and one seasonal prop
    // (lawn chair / leaf pile / snowman / puddles). set() is called from sync; update() every frame.
    function buildYard() {
      var ground = new THREE.Mesh(new THREE.PlaneGeometry(34, 34), new THREE.MeshBasicMaterial({ map: ctx.radialTexture('soft'), transparent: true, depthWrite: false }));
      ground.rotation.x = -Math.PI / 2; ground.position.y = -0.33;
      scene.add(ground);
      var props = { summer: yardProp(lawnChair), fall: yardProp(leafPile), winter: yardProp(snowman), spring: yardProp(puddles) };
      // Weather particles: fixed columns outside the room; motion is closed-form (no accumulation).
      var N = 150, rng = GG.RNG(7), base = new Float32Array(N * 4), pos = new Float32Array(N * 3), col = new Float32Array(N * 3), n = 0;
      while (n < N) {
        var x = -5.5 + rng.next() * 10, z = -3.5 + rng.next() * 10;
        if (x > ROOM.x0 - 0.25 && x < ROOM.x1 + 0.35 && z > ROOM.z0 - 0.35 && z < ROOM.z1 + 0.25) continue;
        base[n * 4] = x; base[n * 4 + 1] = z; base[n * 4 + 2] = rng.next(); base[n * 4 + 3] = rng.next() * 6.28; n++;
      }
      col.fill(1);
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      var mat = new THREE.PointsMaterial({ vertexColors: true, map: ctx.radialTexture('glow'), transparent: true, depthWrite: false });
      var pts = new THREE.Points(geo, mat); pts.frustumCulled = false; scene.add(pts);
      var cur = null, S = null;
      var self = {
        season: null,
        set: function (season) {
          if (season === self.season || !SEASONS[season]) return;
          self.season = season; S = SEASONS[season];
          ground.material.color.setHex(S.ground);
          for (var k in props) props[k].visible = k === season;
          mat.color.setHex(S.color); mat.size = S.size; mat.opacity = S.opacity;
          mat.blending = S.glow ? THREE.AdditiveBlending : THREE.NormalBlending;
          geo.setDrawRange(0, S.count);
          if (!S.blink) { col.fill(1); geo.attributes.color.needsUpdate = true; }
          cur = season;
        },
        update: function (t) {
          if (!cur) return;
          for (var i = 0; i < S.count; i++) {
            var j = i * 4, r = base[j + 2], ph = base[j + 3], p = i * 3;
            if (S.hover) {                                  // fireflies wander low over the lawn and blink
              pos[p] = base[j] + 0.35 * Math.sin(t * 0.3 + ph); pos[p + 1] = 0.1 + r * 1.3 + 0.2 * Math.sin(t * 0.5 + ph * 2);
              pos[p + 2] = base[j + 1] + 0.35 * Math.cos(t * 0.25 + ph);
              var bl = Math.max(0, Math.sin(t * (0.8 + r) + ph * 3)); bl = bl * bl * bl;
              col[p] = col[p + 1] = col[p + 2] = 0.1 + 0.9 * bl;
            } else {                                        // snow, leaves, rain fall and wrap to the top
              var span = 4.8, fall = (t * (S.speed[0] + r * (S.speed[1] - S.speed[0])) + ph) % span;
              pos[p] = base[j] + S.sway * Math.sin(t * 0.7 + ph * 3); pos[p + 1] = 4.4 - fall;
              pos[p + 2] = base[j + 1] + S.sway * 0.8 * Math.cos(t * 0.5 + ph * 2);
            }
          }
          geo.attributes.position.needsUpdate = true;
          if (S.blink) geo.attributes.color.needsUpdate = true;
        }
      };
      return self;
    }
    // v0.6.1 (Addendum 1 C7): the garage changes with the season. Three small meshes, shown only when they apply:
    // frost + a snow drift on the garage-door windows (winter or snowy weather), a string of Christmas lights across the
    // door header (December), a box fan by the couch with spinning blades (July or a heat wave). ≤ 4 extra draw calls,
    // only while shown. Hidden with an empty draw range (not visible=false) so their buffers upload with the garage once
    // and the GPU geometry count doesn't creep when the season changes.
    function buildDecor() {
      var hw = PROPS.door.w / 2, pw = (PROPS.door.w - 0.12) / 3, yc = 3.5 * DOOR_SEC, k, i;
      var sb = new ctx.Builder({ jitter: 0.01, seed: 41 });
      for (k = -1; k <= 1; k++) {
        var wx = PROPS.door.x + k * (pw + 0.03);
        sb.box(pw - 0.14, 0.05, 0.012, wx, yc - 0.105, Z0 + 0.083, 0xf2f6ff);                        // drift along the pane
        sb.box(0.08, 0.035, 0.012, wx - (pw - 0.14) / 2 + 0.04, yc - 0.07, Z0 + 0.083, 0xe6eefa);   // frosty corners
        sb.box(0.06, 0.03, 0.012, wx + (pw - 0.14) / 2 - 0.03, yc - 0.075, Z0 + 0.083, 0xe6eefa);
        sb.box(0.05, 0.02, 0.012, wx - (pw - 0.14) / 2 + 0.025, yc + 0.1, Z0 + 0.083, 0xdfe8f6);
      }
      function show(m, on) { m.geometry.setDrawRange(0, on ? Infinity : 0); }
      var snow = new THREE.Mesh(sb.build(), ctx.mats.unlit); show(snow, false); scene.add(snow);
      var lb = new ctx.Builder({ jitter: 0 }), COLS = [0xff3b30, 0x34c759, 0x2f7fff, 0xffcc00, 0xfff4e0];
      var n = 22;
      for (i = 0; i < n; i++) {
        var u = i / (n - 1), x = PROPS.door.x - hw - 0.05 + u * (PROPS.door.w + 0.1), sag = 0.07 * Math.sin(Math.PI * ((u * 3) % 1));
        lb.box(0.035, 0.05, 0.035, x, 2.18 - sag, Z0 + 0.1, COLS[i % COLS.length]);
        if (i < n - 1) lb.box(PROPS.door.w / (n - 1), 0.006, 0.006, x + PROPS.door.w / (n - 1) / 2, 2.2 - sag, Z0 + 0.1, 0x1a3a1a);
      }
      var lm = new THREE.MeshBasicMaterial({ vertexColors: true });
      var lights = new THREE.Mesh(lb.build(), lm); show(lights, false); scene.add(lights);
      var fb = new ctx.Builder({ jitter: 0.01, seed: 43 }), FAN = 0xe8e2d4;
      fb.box(0.5, 0.5, 0.14, 0, 0.27, 0, FAN); fb.box(0.42, 0.42, 0.15, 0, 0.27, 0, 0x2a2a2e);
      fb.box(0.12, 0.04, 0.3, 0, 0.02, 0, FAN); fb.box(0.06, 0.03, 0.02, 0.17, 0.5, 0.075, 0x9a9a9a);   // feet, the dial
      var fan = new THREE.Mesh(fb.build(), ctx.mats.vc);
      var bb = new ctx.Builder({ jitter: 0 });
      for (i = 0; i < 3; i++) bb.box(0.07, 0.17, 0.01, 0, 0.09, 0, 0xb8c4cc, 0, 0, i * Math.PI * 2 / 3);
      var blades = new THREE.Mesh(bb.build(), ctx.mats.vc); blades.position.set(0, 0.27, 0.08); fan.add(blades);
      fan.position.set(X1 - 0.45, 0, PROPS.couch.z - 1.2); fan.rotation.y = -Math.PI / 2 - 0.5; show(fan, false); show(blades, false); scene.add(fan);
      var cur = { snow: false, lights: false, fan: false };
      return {
        set: function (st) {
          var w = st.week || 1, season = seasonOf(w), month = GG.calendar ? GG.calendar.month(w) : null;
          var wx = GG.calendar && st.seed != null ? GG.calendar.weather(st).kind : null;
          cur.snow = season === 'winter' || wx === 'snow' || wx === 'blizzard';
          cur.lights = month === 'Dec';
          cur.fan = month === 'Jul' || wx === 'heat';
          show(snow, cur.snow); show(lights, cur.lights); show(fan, cur.fan); show(blades, cur.fan);
        },
        update: function (t) {
          if (cur.fan) blades.rotation.z = t * 14;
          if (cur.lights) { var b = 0.65 + 0.35 * (Math.sin(t * 2.2) > 0 ? 1 : 0.4); lm.color.setScalar(b); }
        },
        state: function () { return { snow: cur.snow, lights: cur.lights, fan: cur.fan }; }
      };
    }
    // v0.6.1 (FANS agent; Addendum 1 C5): fan mail + gifts in the garage. Dale's macaroni portrait of Kenji (gold,
    // on a cookie sheet, sunglasses, a bass) on the right wall by the gig board once state.gifts has 'macaroni_kenji';
    // a pile of wrapped gifts on the floor by the amps that grows with the gift count (1 / 3 / 6 boxes: one mesh per
    // size, only one shown); a stack of fan letters beside it. Hidden with an empty draw range (like buildDecor).
    function buildFanMail() {
      function show(m, on) { m.geometry.setDrawRange(0, on ? Infinity : 0); }
      var GOLD = 0xd9ab35, DARK = 0x8c6412, i, a;
      var pb = new ctx.Builder({ jitter: 0.004, seed: 57 });
      pb.at(X1, 0, -2.2, -Math.PI / 2);
      pb.box(0.48, 0.58, 0.015, 0, 1.5, 0.008, 0xb9bec6);                                      // the cookie sheet
      pb.box(0.44, 0.54, 0.006, 0, 1.5, 0.018, 0x6e5a2a);                                      // glue + cardboard backing
      for (i = 0; i < 18; i++) {                                                                // macaroni face outline (an oval)
        a = i / 18 * Math.PI * 2;
        pb.box(0.045, 0.02, 0.018, Math.cos(a) * 0.13, 1.56 + Math.sin(a) * 0.17, 0.03, GOLD, 0, 0, a + Math.PI / 2);
      }
      for (i = 0; i < 6; i++) pb.box(0.04, 0.02, 0.02, -0.12 + i * 0.048, 1.75, 0.032, DARK, 0, 0, (i % 2 ? 0.5 : -0.5));   // hair
      pb.box(0.09, 0.045, 0.02, -0.055, 1.6, 0.034, 0x2a2410); pb.box(0.09, 0.045, 0.02, 0.055, 1.6, 0.034, 0x2a2410);   // sunglasses
      pb.box(0.03, 0.012, 0.02, 0, 1.61, 0.034, DARK);
      pb.box(0.08, 0.018, 0.02, 0, 1.46, 0.032, GOLD);                                          // the mouth: a straight line (it's Kenji)
      pb.box(0.03, 0.34, 0.02, 0.1, 1.38, 0.03, GOLD, 0, 0, -0.9);                              // the bass neck
      pb.box(0.1, 0.12, 0.02, -0.03, 1.3, 0.03, GOLD, 0, 0, -0.9);                              // the bass body
      for (i = 0; i < 5; i++) pb.box(0.4 - i * 0.02, 0.018, 0.02, 0, 1.25 + i * 0.012 - 0.03, 0.028, i % 2 ? GOLD : DARK);   // the "frame" row
      var portrait = new THREE.Mesh(pb.build(), ctx.mats.vc); show(portrait, false); scene.add(portrait);
      var WRAP = [[0xc0392b, 0xf2d15b], [0x2f7fff, 0xffffff], [0x34a853, 0xd23c3c], [0x9b6bff, 0xffcc00], [0xf28c28, 0x2a2a2e], [0xe0e0e0, 0xd23c3c]];
      var SPOT = [[0, 0.11, 0, 0.26, 0.22, 0.24, 0.2], [0.24, 0.08, 0.05, 0.2, 0.16, 0.18, -0.3], [-0.2, 0.07, 0.08, 0.18, 0.14, 0.2, 0.5],
        [0.05, 0.3, 0.02, 0.18, 0.16, 0.16, -0.15], [0.12, 0.1, 0.26, 0.16, 0.2, 0.14, 0.1], [-0.12, 0.28, 0.06, 0.12, 0.12, 0.12, 0.7]];
      function pile(n) {
        var gb = new ctx.Builder({ jitter: 0.006, seed: 60 + n });
        gb.at(-1.22, 0, -2.3, 0.25);
        for (var k = 0; k < n; k++) {
          var q = SPOT[k], c = WRAP[k];
          gb.push(q[0], q[1], q[2], 0, q[6], 0);
          gb.box(q[3], q[4], q[5], 0, 0, 0, c[0]);
          gb.box(q[3] + 0.006, q[4] + 0.006, 0.03, 0, 0, 0, c[1]); gb.box(0.03, q[4] + 0.006, q[5] + 0.006, 0, 0, 0, c[1]);   // ribbon
          gb.box(0.07, 0.04, 0.05, 0, q[4] / 2 + 0.02, 0, c[1]);                                                               // bow
          gb.pop();
        }
        var m = new THREE.Mesh(gb.build(), ctx.mats.vc); show(m, false); scene.add(m);
        return m;
      }
      var piles = { 1: pile(1), 3: pile(3), 6: pile(6) };
      var mb = new ctx.Builder({ jitter: 0.01, seed: 66 });
      mb.at(-1.22, 0, -2.3, 0.25);                                                              // on the floor beside the pile
      for (i = 0; i < 5; i++) mb.box(0.24, 0.012, 0.15, 0.42 + (i % 2) * 0.02, 0.008 + i * 0.013, (i % 3) * 0.015, i % 2 ? 0xf4efe2 : 0xe8f0fa, 0, (i - 2) * 0.12, 0);
      mb.box(0.05, 0.004, 0.03, 0.48, 0.074, 0.02, 0xd23c3c);                                  // a stamp
      var mail = new THREE.Mesh(mb.build(), ctx.mats.vc); show(mail, false); scene.add(mail);
      var cur = { portrait: false, gifts: 0, mail: false };
      return {
        set: function (st) {
          var list = st.gifts || [], g = 0, m = 0, mac = false;
          for (var j = 0; j < list.length; j++) {
            if (list[j].id === 'macaroni_kenji') mac = true;
            else if (list[j].kind === 'mail') m++; else g++;
          }
          cur.portrait = mac; cur.mail = m > 0; cur.gifts = g >= 5 ? 6 : g >= 3 ? 3 : g >= 1 ? 1 : 0;
          show(portrait, mac); show(mail, cur.mail);
          for (var k in piles) show(piles[k], +k === cur.gifts);
        },
        state: function () { return { portrait: cur.portrait, gifts: cur.gifts, mail: cur.mail }; }
      };
    }
    function yardProp(fill) {
      var b = new ctx.Builder({ jitter: 0.04, seed: 17 });
      b.at(ROOM.x0 + 0.2, -0.33, ROOM.z1 + 1.25, -0.5);
      fill(b);
      var m = new THREE.Mesh(b.build(), ctx.mats.vc); m.visible = false; scene.add(m);
      return m;
    }
    function snowman(b) {
      var ball = new THREE.IcosahedronGeometry(1, 1), SNOW = 0xe4ebf7;
      b.shape(ball, 0, 0.33, 0, 0.38, 0.34, 0.38, SNOW); b.shape(ball, 0, 0.8, 0, 0.27, 0.25, 0.27, SNOW); b.shape(ball, 0, 1.15, 0, 0.19, 0.18, 0.19, SNOW);
      b.cyl(0.19, 0.2, 0.14, 8, 0, 1.3, 0, 0xc0392b); b.cyl(0.2, 0.2, 0.05, 8, 0, 1.24, 0, 0xf2f0ea); b.shape(ball, 0, 1.42, 0, 0.06, 0.06, 0.06, 0xf2f0ea);  // toque
      b.cyl(0, 0.035, 0.16, 5, 0, 1.13, 0.24, 0xe8782a, Math.PI / 2);                                                                                   // carrot
      b.box(0.035, 0.035, 0.02, 0.07, 1.2, 0.175, 0x111111); b.box(0.035, 0.035, 0.02, -0.07, 1.2, 0.175, 0x111111);
      b.box(0.36, 0.07, 0.36, 0, 0.99, 0, 0x2f6fd1, 0, 0.3); b.box(0.08, 0.26, 0.04, 0.12, 0.86, 0.2, 0x2f6fd1, 0.2);                                  // scarf
      b.box(0.5, 0.025, 0.025, 0.42, 0.9, 0, 0x5a3d25, 0, 0, 0.5); b.box(0.5, 0.025, 0.025, -0.42, 0.9, 0, 0x5a3d25, 0, 0, -0.4);
    }
    function leafPile(b) {
      var ball = new THREE.IcosahedronGeometry(1, 0);
      b.shape(ball, 0, 0.05, 0, 0.5, 0.22, 0.42, 0xc0612a); b.shape(ball, 0.25, 0.04, 0.2, 0.3, 0.16, 0.28, 0xd9a034, 0, 1); b.shape(ball, -0.25, 0.04, -0.15, 0.3, 0.14, 0.26, 0x8a3a22, 0, 2);
      b.box(0.03, 1.3, 0.03, 0.45, 0.62, -0.1, 0x9b6b3a, 0, 0, -0.35); b.box(0.36, 0.05, 0.06, 0.66, 0.05, -0.1, 0x6b6b6b);                              // rake
    }
    function puddles(b) {
      b.cyl(0.5, 0.5, 0.01, 12, 0, 0.005, 0, 0x1c2a44); b.cyl(0.3, 0.3, 0.01, 10, 0.55, 0.005, 0.45, 0x1c2a44); b.cyl(0.08, 0.08, 0.012, 8, -0.12, 0.008, 0.05, 0x9fb3d8);
      b.box(0.1, 0.28, 0.16, -0.5, 0.14, 0.2, 0xe8c531); b.box(0.1, 0.28, 0.16, -0.36, 0.14, 0.24, 0xe8c531);                                           // rubber boots
    }
    function lawnChair(b) {
      var W = 0xf2f0ea, G = 0x2f8a5a, M = 0xb9bec6, i;
      for (i = 0; i < 4; i++) b.box(0.52, 0.02, 0.1, 0, 0.32, -0.15 + i * 0.1, i % 2 ? W : G);
      for (i = 0; i < 4; i++) b.box(0.52, 0.12, 0.02, 0, 0.42 + i * 0.12, -0.24, i % 2 ? W : G, -0.25);
      b.box(0.03, 0.32, 0.03, 0.26, 0.16, 0.18, M); b.box(0.03, 0.32, 0.03, -0.26, 0.16, 0.18, M); b.box(0.03, 0.75, 0.03, 0.26, 0.4, -0.22, M, -0.25); b.box(0.03, 0.75, 0.03, -0.26, 0.4, -0.22, M, -0.25);
      b.cyl(0.035, 0.035, 0.12, 8, 0.36, 0.06, 0.3, 0x9ad13a);                                                                                           // somebody's pop can
    }

    // v0.5 trophy wall: framed gold/platinum records above the shelf (up to 4, platinum first), loonie trophies (giant
    // 11-sided coins with a loon) on a new lower shelf (up to 5), banned-venue polaroids with a red bar (up to 6) below.
    // One merged mesh (1 draw call), rebuilt only when the counts change.
    function buildTrophyWall() {
      var mesh = new THREE.Mesh(new THREE.BufferGeometry(), ctx.mats.vc); mesh.visible = false;
      var self = {
        mesh: mesh, sig: '', counts: { records: 0, loonies: 0, banned: 0, other: 0 },
        set: function (trophies, banned) {
          var list = Array.isArray(trophies) ? trophies : [], rec = [], loon = 0, other = 0, ban = (Array.isArray(banned) ? banned.length : 0);
          for (var i = 0; i < list.length; i++) {
            var k = list[i] && list[i].kind;
            if (k === 'gold' || k === 'platinum') rec.push(k); else if (k === 'loonie') loon++; else if (k === 'banned') ban++; else if (k) other++;
          }
          rec.sort(function (a, b) { return a === b ? 0 : a === 'platinum' ? -1 : 1; });
          var sig = rec.join(',') + '|' + loon + '|' + ban + '|' + other;
          if (sig === self.sig) return;
          self.sig = sig;
          self.counts = { records: rec.length, loonies: loon, banned: ban, other: other };
          var b = new ctx.Builder({ jitter: 0.02, seed: 29 }), x0 = PROPS.trophies.x, z = Z0, n = 0, GOLD = 0xd4a940, WOOD = 0x3a2616;
          for (i = 0; i < Math.min(4, rec.length); i++, n++) {             // framed records above the shelf
            var rx = x0 - 0.48 + i * 0.32, ry = 2.22, disc = rec[i] === 'platinum' ? 0xdfe3ea : 0xe0b63a;
            b.box(0.3, 0.36, 0.03, rx, ry, z + 0.02, WOOD); b.box(0.26, 0.32, 0.01, rx, ry, z + 0.038, 0x141414);
            b.cyl(0.1, 0.1, 0.01, 18, rx, ry + 0.03, z + 0.046, disc, Math.PI / 2); b.cyl(0.034, 0.034, 0.012, 12, rx, ry + 0.03, z + 0.048, 0xb3141c, Math.PI / 2);
            b.box(0.15, 0.035, 0.008, rx, ry - 0.12, z + 0.045, 0xc9a24a);
          }
          var nl = Math.min(5, loon + Math.min(other, 5 - Math.min(5, loon)));
          if (nl) {                                                          // lower shelf + loonies (and other cups)
            b.box(1.05, 0.04, 0.24, x0 + 0.08, 1.12, z + 0.12, 0x7a5a3a); b.box(0.03, 0.14, 0.18, x0 - 0.4, 1.04, z + 0.09, 0x444444); b.box(0.03, 0.14, 0.18, x0 + 0.56, 1.04, z + 0.09, 0x444444);
            for (i = 0; i < nl; i++, n++) {
              var lx = x0 - 0.3 + i * 0.2;
              b.box(0.12, 0.05, 0.1, lx, 1.165, z + 0.13, WOOD);
              if (i < loon) {
                b.box(0.025, 0.05, 0.025, lx, 1.21, z + 0.13, GOLD);
                b.cyl(0.075, 0.075, 0.02, 11, lx, 1.3, z + 0.13, 0xc9a227, Math.PI / 2); b.cyl(0.06, 0.06, 0.022, 11, lx, 1.3, z + 0.13, 0xe0bb3a, Math.PI / 2);
                b.box(0.06, 0.018, 0.01, lx - 0.005, 1.29, z + 0.143, 0x2a2016); b.box(0.014, 0.03, 0.01, lx + 0.025, 1.31, z + 0.143, 0x2a2016);
              } else { b.cyl(0.045, 0.025, 0.09, 8, lx, 1.24, z + 0.13, 0xc9ced6); b.cyl(0.012, 0.012, 0.05, 6, lx, 1.315, z + 0.13, 0xc9ced6); }
            }
          }
          for (i = 0; i < Math.min(6, ban); i++, n++) {                     // banned polaroids, pinned a bit crooked
            var bx = x0 - 0.32 + i * 0.18, by = 0.8 + (i % 2) * 0.05, tilt = ((i * 37) % 7 - 3) * 0.05;
            b.push(bx, by, z + 0.02, 0, 0, tilt);
            b.box(0.15, 0.18, 0.01, 0, 0, 0, 0xf0ece2); b.box(0.12, 0.11, 0.004, 0, 0.02, 0.007, 0x3a4a5a);
            b.box(0.15, 0.022, 0.006, 0, 0.02, 0.011, 0xd0201a, 0, 0, 0.72); b.box(0.02, 0.02, 0.012, 0, 0.08, 0.012, 0xe0403a);
            b.pop();
          }
          mesh.geometry.dispose();
          mesh.geometry = n ? b.build() : new THREE.BufferGeometry();
          mesh.visible = n > 0;
        }
      };
      return self;
    }

    // Bedsheet banner with the band name in red spray paint, tied across the garage door.
    function buildBanner() {
      var c = document.createElement('canvas'); c.width = 512; c.height = 176;
      var tex = new THREE.CanvasTexture(c);
      var bw = PROPS.door.w - 0.35, geo = new THREE.PlaneGeometry(bw, 0.72, 12, 2), pa = geo.attributes.position;
      for (var i = 0; i < pa.count; i++) {
        var x = pa.getX(i), y = pa.getY(i), u = x / (bw / 2);
        pa.setZ(i, 0.025 * Math.sin(x * 4.2) + 0.02 * (1 - u * u));
        if (y > 0) pa.setY(i, y - 0.05 * (1 - u * u));
      }
      geo.computeVertexNormals();
      var mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tex }));
      mesh.position.set(PROPS.door.x, 1.08, Z0 + 0.1);
      var self = {
        mesh: mesh, text: null,
        set: function (name) {
          if (name === self.text) return;
          self.text = name;
          var g = c.getContext('2d'), rng = GG.RNG(GG.hashSeed(name)), txt = String(name).toUpperCase(), size = 92;
          g.fillStyle = '#e8e1cf'; g.fillRect(0, 0, 512, 176);
          for (var k = 0; k < 14; k++) { g.fillStyle = 'rgba(120,100,70,' + (0.04 + rng.next() * 0.06) + ')'; g.fillRect(rng.next() * 512, rng.next() * 176, 20 + rng.next() * 90, 3 + rng.next() * 10); }
          g.textAlign = 'center'; g.textBaseline = 'middle';
          do { g.font = '900 ' + size + 'px Impact, "Arial Black", "Helvetica Neue", sans-serif'; size -= 4; } while (g.measureText(txt).width > 470 && size > 24);
          g.fillStyle = '#b3141c';
          for (k = 0; k < 12; k++) g.fillRect(40 + k * 38 + rng.next() * 20, 88 + size * 0.3, 4, 10 + rng.next() * 34);
          g.lineWidth = 7; g.strokeStyle = '#1a1414'; g.strokeText(txt, 256, 86);
          g.fillText(txt, 256, 86);
          tex.needsUpdate = true;
        }
      };
      return self;
    }

    // v0.8: the geometry lives in 40_render_core (R.kit.garage: shell finish, hardware, kick-head art, throne, cowbell, hair
    // fan; the v0.7 kit box for box when the look is the legacy one), shared with the creator's preview.
    function buildKit(color, K, sig) {
      if (kit.mesh) { scene.remove(kit.mesh); kit.mesh.geometry.dispose(); }
      if (kit.art) { R.kit.disposeArt(kit.art); kit.art = null; }
      kit.color = color; kit.sig = sig || color;
      var band = state && GG.content.bands && GG.content.bands[state.bandId];
      var built = R.kit.garage(ctx, K || R.kit.norm(null, color), { band: band && band.name, genre: state && state.genre, look: state && state.player && state.player.look });
      kit.mesh = new THREE.Mesh(built.geo, ctx.mats.vc);
      kit.mesh.position.set(KIT.x, 0, KIT.z); kit.mesh.rotation.y = KIT.yaw; kit.mesh.scale.setScalar(KIT_SCALE);
      if (built.art) { kit.art = built.art; kit.mesh.add(kit.art); }
      scene.add(kit.mesh);
    }

    return api;                                     // last, so every var above is initialised first
  });
})(window.GG);
