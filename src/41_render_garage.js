// 41_render_garage.js: the parents' garage — the band's home base and the game's main menu.
// A cutaway diorama (floor slab + back and right walls) seen from the front-left: one warm bulb inside,
// cool moonlight through the garage-door windows, the yard outside changing with the seasons. Seven hotspots (C.HOTSPOTS) each get a
// floating label; tap the floor to walk, a hotspot to walk there and open it, a bandmate to chat.
// Characters are blocky low-poly people built from LOOK as ONE skinned mesh each (buildCharacter is
// exported for later scenes: stage, van, red carpet). Everything static is merged by material.
// Draw calls ≈ room 1 + glows 1 + moon shafts 1 + dust 1 + banner 1 + bulb 3 + kit 1 + people 5 + blob shadows 1
//              + yard (ground, weather, seasonal prop) 3 + labels 7 + walk ring 1 = 26
//              + v0.8: garage-only 2 (or a rented room's lit + glow + fixture + light wash + decals lit/glow + corridor floor
//              = 7, with the yard's 3 hidden) + upgrades ≤ 2 + disco ball 1 + box pile 1.
// v0.8 (SHOPUI): the rehearsal space by state.spaceTier (0 = the band's own start: the parents' garage; 1 Rent-A-Riff, Jam
// Space 7; 2 Prairie Dog Sound; 3 backstage at the Potash Place) with its bought upgrades (state.spaceUpgrades) visible and
// the unsold merch box pile (GG.shop.pile(state).boxes) stacked along the open left edge; see buildSpace. v0.8 polish
// (SPACES): every tier is its own place from the fixed camera (walls, floor, light, door, props, the corridor out front
// instead of the yard). debug().space = { tier, kind, wall, floor, bg, fixture, riser, hall, decals, green, upgrades, boxes,
// pile (drawn), pileBox, pileSign, disco, door (the door hotspot's label), garage (garage-only shown), sign, signText, obstacles }.
// The drum kit (buildKit) is lane B's (R.kit.garage in 40_render_core). The character builder lives in 40 (R.charGeometry).
// v1.1 "Seats" (Lane C, plan_contract_1.1 §4.8): on a string seat (state.seat bass / rhythm / lead) the swapped drummer (the
// member whose seatRole is 'drums' / 'drums/vocals') sits at the kit and plays (sticks in the kit's colour); the 'kit' hotspot
// becomes "Your rig" in the amp corner (same action: it opens the songwriter as today) and you noodle your own instrument there
// (player.gearLook -> R.seatGear; the headstock sticker when gearLook.sticker is 'logo'); whoever noodled in that corner takes
// the spare noodle spot. You wear your instrument everywhere. No extra draw call but the sticker. debug().seat = { seat, rig,
// drummer, label, gear, sticker, playerPose }.
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
    kit: { x: -0.55, z: -0.55, yaw: -0.35 }, mirror: { x: -1.18, z: 0.5, yaw: 0.54 },   // (v0.8 SPACES review: a step forward-right, off the box pile)
    cooler: { x: 0.05, z: 1.72, yaw: 0 }, merch: { x: -1.85, z: 2.2, yaw: 0.3 }, mower: { x: 1.92, z: -2.08, yaw: -0.5 },
    crate: { x: -1.92, z: -2.22, yaw: 0.25 }, bucket: { x: 0.98, z: 0.95 }, heater: { x: 1.12, z: 2.42, yaw: 0.45 },
    pizza: { x: -0.8, z: 1.5, yaw: 0.35 }, bulb: { x: 0.2, z: -0.2 }
  };
  var KIT = PROPS.kit, X1 = ROOM.x1, Z0 = ROOM.z0, KIT_SCALE = 1.15;   // kit scaled like the people
  // v1.1: a string seat's rig corner by the amps (the 'kit' hotspot moves here, labelled "Your rig"), and where a displaced
  // noodler goes instead.
  var RIG = { label: 'Your rig', box: [-0.72, 0.72, Z0 + 0.62, 1.25, 1.3, 1.0], at: [-0.5, 1.35, Z0 + 0.75], stand: [-0.85, -1.95], face: -0.2 };
  var NOODLE2 = { x: 0.6, z: -1.2, yaw: -0.55 };
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
    mirror: { x: -0.82, z: 1.1, yaw: -2.6 },           // back to us, facing the mirror (clear of the pile, off every riser)
    noodle: { x: -0.85, z: -1.95, yaw: -0.2 },
    lunch: { x: PROPS.bucket.x, z: PROPS.bucket.z, yaw: -0.6, seat: 0.4 },
    corner: { x: PROPS.crate.x, z: PROPS.crate.z, yaw: 0.25, seat: 0.34 },
    phone: { x: 0.95, z: -0.35, yaw: -0.6 },
    pace: { x: 0.55, z: 0.1, yaw: -0.4 },
    fiddle: { x: 1.2, z: -0.72, yaw: -0.85 }            // v0.9 (Clementine), clear of the door and gig-board stands
  };
  var SPARE = [{ x: 0.9, z: -0.1, yaw: -0.5 }, { x: -0.35, z: 0.9, yaw: -0.3 }, { x: 1.25, z: -0.75, yaw: -0.9 }, { x: 1.3, z: -0.1, yaw: -0.8 }];   // (the last one clear of the box pile)
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
  // v0.9 "Genres": an idle by role for recruits and fill-ins with none (a lead guitarist noodles, a bassist takes the corner),
  // and per-member held things (T-Bone flosses, Earl paces with a double-double, Duke packs his own lunch pail).
  function idleByRole(role) {
    role = String(role || '').toLowerCase();
    if (/fiddle|violin/.test(role)) return 'fiddle';
    if (/bass/.test(role)) return 'corner';
    if (/guitar|acoustic|banjo/.test(role)) return 'noodle';
    if (/vocal/.test(role)) return 'pace';
    return 'pace';
  }
  var HELD_BY_ID = { tamara: 'floss', earl: 'coffee' };
  var FLOOR_BY_ID = { jaxon: 'lunchbox', duke: 'lunchpail' };
  // v0.9: the tier-0 rooms, keyed on C.SPACE_KINDS[band.space]; MOODS index for each (0 = the parents' garage; 1..3 = the
  // rented tiers; 4..6 = the other bands' own starts).
  var KIND_ROOM = { garage: 0, laundromat: 4, stripmall: 5, quonset: 6 };
  function spaceKindOf(band) {
    var K = (GG.contracts && GG.contracts.SPACE_KINDS) || {};
    return (band && K[band.space]) || 'garage';
  }
  function roomIndexOf(st) {
    var tier = st && isFinite(st.spaceTier) ? Math.max(0, Math.min(3, st.spaceTier | 0)) : 0;
    if (tier) return tier;
    var band = st && GG.content && GG.content.bands && GG.content.bands[st.bandId];
    return KIND_ROOM[spaceKindOf(band)] || 0;
  }

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

  // Build a character: { root (Group, scaled by height), mesh (SkinnedMesh), bones[], dispose() }.
  // v0.8 SPACES review: in the garage scene near-black clothes are lifted to a dark slate (#33333d at the least) so a figure
  // with its back to the camera keeps its shape instead of reading as a hole in the room (o.lift; stage / van unchanged).
  function liftDark(c) {
    if (c == null) return c;
    var col = new THREE.Color(c), m = Math.max(col.r, col.g, col.b);
    if (m >= 0x3a / 255) return c;
    col.setRGB(Math.max(col.r, 0x33 / 255), Math.max(col.g, 0x33 / 255), Math.max(col.b, 0x3d / 255));
    return '#' + col.getHexString();
  }
  function makeCharacter(ctx, look, o) {
    var L = normLook(look, o.id);
    if (o.lift) {
      L.shirt = liftDark(L.shirt); L.pants = liftDark(L.pants);
      if (look && (look.shirt || look.pants)) { look = Object.assign({}, look); if (look.shirt) look.shirt = liftDark(look.shirt); if (look.pants) look.pants = liftDark(look.pants); }
    }
    var geo = R.charGeometry(ctx, L, o, look), lay = jointLayout(L.build), bones = [], i;   // v0.8: the one builder lives in 40_render_core (R.charGeometry)
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
  // v0.9: mirror routines per genre (Chase's is 1985: the hair flip, the air-guitar windmill, the finger point, the lean).
  var MIRROR_SETS = {
    metal: MIRROR_POSES,
    rock: [
      [0, 0, 0.3, 0, 0, 0.2, -0.4, 0, -0.5, -0.9, 0, 0, -0.35, 0, 0, -0.6, 0.2, 0],       // hair flip: head back, a hand through the mullet
      [0, 0, 0.35, -1.6, 0, 0, -3.0, 0, -0.1, 0, 0, 0, -0.12, 0.3, 0, -0.2, 0.2, 0],      // the windmill: the right arm straight up
      [0.2, 0, 0.3, -0.9, 0, 0, -0.9, 0, 0.5, -0.1, 0, 0, 0.15, -0.3, 0, 0.1, -0.3, 0],   // the windmill comes down across the strings
      [-1.5, 0, 0.1, 0, 0, 0, 0, 0, -0.3, -0.2, 0, 0, 0.05, 0, 0.12, 0.1, 0, 0.15]        // the finger point: "you. yeah, you."
    ],
    punk: [
      [-0.9, 0, 0.3, -1.2, 0, 0, -0.9, 0, -0.3, -1.2, 0, 0, 0.3, 0, 0, 0.35, 0, 0],       // the snarl: hunched, fists up
      [0, 0, 1.2, -1.4, 0, 0.6, 0, 0, -1.2, -1.4, 0, -0.6, -0.1, 0, 0, -0.2, 0, 0],       // the flex
      [0, 0, 0.2, 0, 0, 0, -2.8, 0, -0.2, 0, 0, 0, 0.1, 0, 0.15, 0.2, 0.3, 0]              // the fist in the air
    ],
    country: [
      [0, 0, 0.15, 0, 0, 0, -2.2, 0, 0.3, -1.3, 0, 0, 0, 0, 0, 0.15, 0, 0],               // the hat tip
      [-0.3, 0, 0.4, -1.7, 0, -1.2, -0.3, 0, -0.4, -1.7, 0, 1.2, 0, 0, 0, 0.1, 0, 0],       // thumbs in the belt loops
      [0, 0, 0.2, 0, 0, 0, -1.4, 0, 0.1, -0.2, 0, 0, 0.05, -0.25, 0, 0, -0.3, 0]            // a finger gun at the mirror
    ]
  };
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
    mirror: function (p, bn, tt) {                    // cycles poses at the mirror (v0.9: the genre's routine)
      var P = MIRROR_SETS[p.genre] || MIRROR_POSES;
      var period = 2.3, n = P.length, k = Math.floor(tt / period), u = (tt - k * period) / 0.45;
      var cur = ((k % n) + n) % n, prev = (cur + n - 1) % n, f = GG.render.util.smooth(u);
      blendPose(bn, P[prev], P[cur], f);
      var sw = P === MIRROR_POSES ? (cur === 3 ? f : prev === 3 ? 1 - f : 0) : 0;   // cape flare while swirling
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
    fiddle: function (p, bn, tt) {                    // v0.9 (Clementine): bowing, head tilted onto the chin rest; a flourish now and then
      var cyc = tt % 8.5, flo = cyc > 6 ? bump((cyc - 6) / 2.5) : 0, bow = Math.sin(tt * (2.2 + 2.5 * flo));
      rot(bn[B_ARM_L], -1.25, 0.25, 0.55); rot(bn[B_FORE_L], -0.95, 0, -0.35 + 0.05 * Math.sin(tt * 3));
      rot(bn[B_ARM_R], -0.75 - 0.15 * flo, 0, -0.35 - 0.3 * bow); rot(bn[B_FORE_R], -1.05 + 0.35 * bow, 0, 0.25);
      bn[B_HEAD].rotation.z = 0.28; bn[B_HEAD].rotation.x = 0.12 - 0.15 * flo;
      bn[B_SPINE].rotation.x = -0.04 - 0.12 * flo; bn[B_SPINE].rotation.z = 0.05 * Math.sin(tt * 1.1);
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
      if (p.gear) {                                   // v0.9 (Rox): pacing with the guitar on, still playing it
        rot(bn[B_ARM_L], 0.1, 0, 0.14); rot(bn[B_FORE_L], -2.05, 0, 0.1);
        rot(bn[B_ARM_R], -0.35, 0, 0.12); rot(bn[B_FORE_R], -0.95 + 0.16 * Math.sin(tt * 12), 0, 0.45);
      }
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

  // v0.9: GG.render.garage.photoRig(spaceKind) -> the camera + where the band stands for the year-end photo (5l_ui_recap), per
  // tier-0 room (the rented tiers use the garage's rig). The camera sits outside the cut-away front wall; near clips everything
  // between the lens and the band. kind = C.SPACE_KINDS value ('garage' | 'laundromat' | 'stripmall' | 'quonset') or a space id.
  var PHOTO = {
    garage: { pos: [0.25, 1.6, 5.75], look: [0.05, 1.18, 0], fov: 35, near: 4.7, far: 40, x: 0.1, gap: 0.62, z: [0.34, 0.2], player: 0.45, backdrop: 'the garage door' },
    laundromat: { pos: [-0.1, 1.55, 5.7], look: [0.25, 1.2, 0], fov: 36, near: 4.6, far: 40, x: 0.0, gap: 0.6, z: [0.3, 0.16], player: 0.42, backdrop: 'the stairs + the SUDS-O-RAMA sign' },
    stripmall: { pos: [-0.35, 1.6, 5.75], look: [-0.2, 1.25, 0], fov: 36, near: 4.7, far: 40, x: -0.2, gap: 0.62, z: [0.34, 0.2], player: 0.45, backdrop: 'the shop window + the parking lot' },
    quonset: { pos: [0.3, 1.7, 5.9], look: [0.4, 1.3, 0], fov: 37, near: 4.7, far: 40, x: 0.3, gap: 0.62, z: [0.34, 0.2], player: 0.45, backdrop: 'the sliding door + the arch' }
  };
  R.garage = {
    photoRig: function (kind) {
      var K = (GG.contracts && GG.contracts.SPACE_KINDS) || {}, k = PHOTO[kind] ? kind : K[kind] || 'garage', P = PHOTO[k] || PHOTO.garage;
      return JSON.parse(JSON.stringify(Object.assign({ kind: k }, P)));
    },
    spaceKind: function (st) { var b = st && GG.content && GG.content.bands && GG.content.bands[st.bandId]; return spaceKindOf(b); },
    KINDS: Object.keys(PHOTO)
  };

  // ---- The garage scene -------------------------------------------------------------------------------------------------
  R.defineScene('garage', function (ctx) {
    THREE = ctx.THREE;
    var sh = ctx.shade, U = R.util;
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1020);

    // Lights: dim cool/warm hemisphere, the swinging bulb (below), moonlight from behind the door, heater. v0.8 polish: a
    // rented space re-tints all of them (space mood: the jam room's fluorescent, the studio's warm spots, the arena's work
    // lights); the moon becomes the room's key light and the heater its accent (the studio's control-room glow).
    var hemi = new THREE.HemisphereLight(0x6f84b8, 0x3b2d22, 0.55); scene.add(hemi);
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
    // v0.8 (SHOPUI): the parts only the parents' garage has (drywall + wainscot, the sectional door, Dad's pegboard, the
    // hockey stick, the mower, the heater, the oil stain) go in their own pair of meshes; a rented space hides them and
    // shows its own walls, floor, door and props instead (buildSpace below). Their footprints / blob shadows are tracked
    // so a bigger room doesn't keep an invisible mower in the way.
    var gLit = new ctx.Builder({ jitter: 0.045, seed: 12 }), gGlow = new ctx.Builder({ jitter: 0, seed: 4 });
    var garageObstacles = [], garageShadows = [], kitShadow = -1;
    function gFoot(x, z, w, d, yaw) {
      var c = Math.abs(Math.cos(yaw || 0)), s = Math.abs(Math.sin(yaw || 0));
      var hx = (w * c + d * s) / 2, hz = (w * s + d * c) / 2;
      garageObstacles.push([x - hx, z - hz, x + hx, z + hz]);
      garageShadows.push(shadowSpots.length);
      shadowSpots.push([x, z, w * 1.15, d * 1.15, yaw || 0]);
    }
    buildShell(lit, glow, gLit, gGlow);
    buildDoor(gLit, gGlow);
    buildBackWall(lit, glow, foot, gLit);
    buildRightWall(lit, glow, foot, gLit);
    buildFloorProps(lit, glow, foot, gLit, gFoot);
    scene.add(ctx.freeze(new THREE.Mesh(lit.build(), ctx.mats.vc)));   // (v1.0: static room meshes skip the per-frame matrix)
    scene.add(ctx.freeze(new THREE.Mesh(glow.build(), ctx.mats.unlit)));
    var garageOnly = [ctx.freeze(new THREE.Mesh(gLit.build(), ctx.mats.vc)), ctx.freeze(new THREE.Mesh(gGlow.build(), ctx.mats.unlit))];
    scene.add(garageOnly[0]); scene.add(garageOnly[1]);
    var shafts = buildShafts(); scene.add(shafts);
    var dust = buildDust(); scene.add(dust.points);
    var yard = buildYard();
    var decor = buildDecor();   // v0.6.1: snow at the window (winter), Christmas lights (December), a box fan (July / heat wave)
    var fanMail = buildFanMail();   // v0.6.1 (FANS): Dale's macaroni portrait of Kenji, the gift pile, the fan-mail stack
    var space = buildSpace();       // v0.8 (SHOPUI): the rehearsal space tier, its upgrades, the unsold merch box pile
    var bandProps = buildBandProps();   // v0.9: the band's seat props + the leaning instrument

    // ---- Bulb on a cord (swings a little; carries the warm point light and a halo) ----
    var bulbPivot = new THREE.Group();
    bulbPivot.position.set(PROPS.bulb.x, 3.35, PROPS.bulb.z); scene.add(bulbPivot);
    var bc = new ctx.Builder({ jitter: 0 });
    bc.box(0.014, 1.0, 0.014, 0, -0.5, 0, 0x151515); bc.cyl(0.032, 0.036, 0.08, 8, 0, -1.03, 0, 0x2b2b2b);
    var bulbCord = new THREE.Mesh(bc.build(), ctx.mats.vc); bulbPivot.add(bulbCord);
    var bg = new ctx.Builder({ jitter: 0 });
    bg.shape(new THREE.IcosahedronGeometry(0.075, 0), 0, -1.13, 0, 1, 1.25, 1, 0xfff1c9);
    var bulbGlass = new THREE.Mesh(bg.build(), ctx.mats.unlit); bulbPivot.add(bulbGlass);
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
    function setShadow(i, x, z, sx, sz, yaw, y) {
      _q.setFromAxisAngle(_up, yaw); _m.compose(_p.set(x, 0.024 + (y || 0), z), _q, _s.set(sx, 1, sz)); shadows.setMatrixAt(i, _m);
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
      id: '__player', p: null, x: PLAYER_SPAWN.x, y: 0, z: PLAYER_SPAWN.z, yaw: PLAYER_SPAWN.yaw, goalYaw: PLAYER_SPAWN.yaw,
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
      // v1.0 governor: 60 fps while someone moves (walking, turning to a hotspot, a tapped bandmate's hop / nod / look)
      busy: function () {
        if (player.walking || player.pending || player.speed > 0.01) return true;
        for (var i = 0; i < peopleList.length; i++) { var r = peopleList[i]; if (r.hopT > 0 || r.nodT >= 0 || r.lookW > 0.01 || r.lookT > 0) return true; }
        return false;
      },
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
      banner.set((band && band.name) || 'Hail Damage', st.logo);   // v0.8.1: the band logo on the bedsheet
      trophyWall.set(st.trophies, st.banned);
      yard.set(seasonOf(st.week || 1));
      decor.set(st);
      fanMail.set(st);
      space.set(st);
      var pl = st.player || {}, preset = findPreset(pl.presetId);
      var kc = pl.kitColor || (preset && preset.kitColor) || DEFAULT_KIT;
      var kl = R.kit ? R.kit.norm(pl.kit, kc) : null, ksig = kc + (kl ? JSON.stringify(kl) : '') + (kl && kl.head === 'logo' && st.logo ? JSON.stringify(st.logo) : '');   // v0.8: the kit look (KIT_LOOK); v0.8.1: + the logo
      if (ksig !== kit.sig) buildKit(kc, kl, ksig);
      if (kit.mesh) kit.mesh.position.y = space.riserH();          // v0.8 polish: the studio / arena kit stands on a riser
      var seat = stringSeat(st), genre0 = st.genre || (band && band.genre) || 'metal';   // v1.1
      setRig(!!seat);
      var pgear = seat && R.seatGear ? R.seatGear(seat, pl.gearLook, (kl && kl.color) || kc, genre0) : null, prevP = player.p;
      ensurePerson(player, 'player', pl.look || (preset && preset.look) || DEFAULT_LOOKS.player, seat ? { gear: pgear } : { sticks: kl ? kl.sticks : true });
      syncSticker(st, band, pgear, !!seat && !!pl.gearLook && pl.gearLook.sticker === 'logo', prevP !== player.p);
      if (!player.p.placed) { player.p.placed = true; placePlayer(); }
      if (!seat && player.pose === 'rig') player.pose = 'stand';
      if (seat && player.pose === 'drum') player.pose = 'rig';
      var kitId = seat ? drummerOf(st) : null;
      seatInfo = { seat: seat || 'drums', rig: !!seat, drummer: kitId, gear: pgear };

      var flags = st.flags || {}, cv = flags.cape;
      var capeVariant = typeof cv === 'string' && cv !== 'none' ? (CAPE_VARIANTS[cv] ? cv : 'velvet') : null;
      // v0.4: fill-ins hang out too (after the roster, so they never take a hand-made member's idle spot)
      var list = (st.members || []).concat(GG.drama && GG.drama.fillInFigures ? GG.drama.fillInFigures(st) : []);
      var seen = {}, usedSpots = {}, couch = 0, spare = 0, capeId = null, i, m, genre = st.genre || (band && band.genre) || 'metal';
      bandProps.set(band, list, st);   // v0.9: the seat props + the leaning instrument are the band's (the mirror, the crate, the bucket, ...)
      capeId = capeOwner(band, list);  // v0.9: member.cape (content), not "the first mirror idler"
      capeShown = 'none';
      if (seat) usedSpots.noodle = true;   // v1.1: the amp corner is your rig
      for (i = 0; i < list.length; i++) {
        m = list[i];
        if (!m || !m.id || (m.status && m.status !== 'active')) continue;
        var cm = contentMember(band, m.id, i), idle = memberIdle(band, m, i);
        var cape = m.id === capeId ? capeVariant : null;
        var held = HELD_BY_ID[m.id] || (idle === 'lunch' ? 'sandwich' : idle === 'phone' ? 'phone' : null);
        var gear = idle === 'noodle' || idle === 'fiddle' ? (R.gearOf ? R.gearOf(m, cm && cm.id === m.id ? cm : null, genre) : 'guitar') || (idle === 'fiddle' ? 'fiddle' : 'v')
          : idle === 'pace' && !held && R.gearOf ? R.gearOf(m, cm && cm.id === m.id ? cm : null, genre) : null;   // (a pacer with an instrument keeps it on: Rox)
        var opts = { gear: gear, held: held, floorProp: idle === 'lunch' ? (FLOOR_BY_ID[m.id] || (band && band.id !== 'hail_damage' ? 'lunchpail' : 'lunchbox')) : null, cape: cape };
        var onKit = !!kitId && m.id === kitId;   // v1.1: the swapped drummer, at the kit with sticks
        if (onKit) { opts = { gear: null, held: null, floorProp: null, cape: cape, sticks: kl ? kl.sticks : true }; gear = null; }
        var rec = people[m.id] || (people[m.id] = { id: m.id, p: null, x: 0, z: 0, yaw: 0, baseYaw: 0, lookT: 0, lookW: 0, hopT: 0, nodT: -1 });
        rec.genre = genre; rec.gear = gear;
        ensurePerson(rec, m.id, m.look || (cm && cm.look) || DEFAULT_LOOKS[m.id] || genericLook(m.id), opts);
        if (cape) capeShown = cape;
        var mood = typeof m.mood === 'number' ? m.mood : 60;
        rec.mood = mood;
        rec.energy = mood >= 70 ? 1.15 : mood >= 45 ? 1 : 0.78;
        var pose = mood < SULK_MOOD ? 'sulk' : onKit ? 'drum' : (SPOTS[idle] && !usedSpots[idle] ? idle : 'stand');
        if (seat && pose === 'stand' && idle === 'noodle' && !usedSpots.noodle2) { pose = 'noodle2'; usedSpots.noodle2 = true; }   // v1.1: the spare noodle spot
        var spot = pose === 'sulk' ? COUCH_SEATS[Math.min(couch++, COUCH_SEATS.length - 1)] : pose === 'drum' ? kitSpot : pose === 'noodle2' ? NOODLE2 : pose === 'stand' ? SPARE[spare++ % SPARE.length] : SPOTS[idle];
        if (pose === 'noodle2') pose = 'noodle';
        if (pose !== 'sulk' && pose !== 'stand') usedSpots[idle] = true;
        setPose(rec, pose, spot);
        seen[m.id] = true;
      }
      for (var id in people) if (!seen[id]) { people[id].p.dispose(); delete people[id]; }
      memberHits.length = 0; obstacles.length = 0;
      for (i = 0; i < staticObstacles.length; i++) obstacles.push(staticObstacles[i]);
      for (i = 0; i < space.obstacles.length; i++) obstacles.push(space.obstacles[i]);   // v0.8: this space's props, upgrades, the box pile
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
      opts.id = id; opts.scale = CHAR_SCALE; opts.lift = true;
      if (state) { var bd = GG.content.bands && GG.content.bands[state.bandId]; if (bd) opts.band = bd.name; }
      var sig = JSON.stringify(look) + '|' + [opts.gear, opts.held, opts.floorProp, opts.cape, opts.sticks, opts.band].join(',');
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
    // v1.1: string seats. The seat (null on drums), who sits at the kit (the lineup's drums seatRole), the rig hotspot, the
    // headstock sticker on your instrument.
    var seatInfo = { seat: 'drums', rig: false, drummer: null, gear: null }, rigOn = false;
    var kitSpot = (function () { var t = rotLocal(KIT, 0, -0.72 * KIT_SCALE); return { x: t.x, z: t.z, yaw: KIT.yaw, seat: 0.54 }; })();
    function stringSeat(st) { var x = st && st.seat; return x === 'bass' || x === 'rhythm' || x === 'lead' ? x : null; }
    function drummerOf(st) {
      var lu = null, i;
      try { lu = GG.career && GG.career.lineup ? GG.career.lineup(st) : null; } catch (e) { lu = null; }
      for (i = 0; lu && i < lu.length; i++) if (lu[i] && lu[i].id !== 'player' && /^drums/.test(String(lu[i].seatRole || ''))) return lu[i].id;
      var ms = st.members || [];
      for (i = 0; i < ms.length; i++) if (ms[i] && (!ms[i].status || ms[i].status === 'active') && /^drums/.test(String(ms[i].seatRole || ''))) return ms[i].id;
      // The swapped drummer quit: a drama fill-in for the 'drums' hole (id 'fill_drums') takes the kit until someone is hired.
      var fi = GG.drama && GG.drama.fillInFigures ? GG.drama.fillInFigures(st) : [];
      for (i = 0; i < fi.length; i++) if (fi[i] && /^drums/.test(String(fi[i].role || ''))) return fi[i].id;
      return null;
    }
    function setRig(on) {
      var h = hs.kit;
      if (!h || rigOn === on) return;
      rigOn = on;
      var D = on ? RIG : h.def, text = on ? RIG.label : h.def.label;
      h.box.position.set(D.box[0], D.box[1], D.box[2]); h.box.scale.set(D.box[3], D.box[4], D.box[5]); h.box.updateMatrixWorld();
      var lab = ctx.makeLabel(text, { px: 20 }), old = h.label, li = labels.indexOf(old);
      lab.position.set(D.at[0], D.at[1], D.at[2]); lab.userData.action = 'kit'; scene.add(lab);
      if (li >= 0) labels[li] = lab;
      ctx.disposeLabel(old); h.label = lab; h.y = D.at[1]; h.text = text;
    }
    function syncSticker(st, band, gear, want, rebuilt) {
      var S0 = player.sticker, sig = want && gear ? gear + '|' + JSON.stringify(st.logo || null) + '|' + ((band && band.name) || '') : '';
      if (S0 && (rebuilt || S0.sig !== sig)) {
        if (S0.mesh.parent) S0.mesh.parent.remove(S0.mesh);
        S0.mesh.geometry.dispose(); S0.mesh.material.dispose(); if (S0.tex) S0.tex.dispose();
        player.sticker = S0 = null;
      }
      if (!sig || S0 || !R.gearSticker || !R.logo || !R.logo.texture) return;
      var tex = null;
      try { tex = R.logo.texture(GG.logo ? GG.logo.get(st) : null, (band && band.name) || 'The Band', 128, { badge: 'round', mini: true }); } catch (e) { tex = null; }
      var m = tex ? R.gearSticker(ctx, player.p, gear, tex) : null;
      if (m) player.sticker = { mesh: m, tex: tex, sig: sig }; else if (tex) tex.dispose();
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
    // (v0.9: the content member only when the id matches: a fill-in never inherits the idle of whoever sat at that index.)
    function memberIdle(band, m, i) {
      var cm = contentMember(band, m.id, i);
      if (cm && cm.id !== m.id) cm = null;
      return (cm && cm.idle) || m.idle || DEFAULT_IDLE[m.id] || idleByRole(m.role || (cm && cm.role));
    }
    function capeOwner(band, list) {
      for (var k = 0; k < list.length; k++) {
        var x = list[k]; if (!x || !x.id) continue;
        var cm = contentMember(band, x.id, -1);
        if (x.cape || (cm && cm.id === x.id && cm.cape)) return x.id;
      }
      for (k = 0; k < list.length; k++) if (list[k] && list[k].id === 'marcel') return 'marcel';   // (older content)
      return null;
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
      var st = standOf(h.def);
      player.pending = action; player.faceT = 0; player.faceYaw = rigOn && action === 'kit' ? RIG.face : h.def.face;
      startWalk(st[0], st[1]);
      return true;
    }
    function standOf(def) { if (rigOn && def.action === 'kit') return RIG.stand; return (def.stand && space.stand(def.action)) || def.stand; }   // v0.8: a space can move a stand (the curb couch); v1.1: your rig
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
        var kp = rigOn ? 'rig' : 'drum';   // v1.1: your rig on a string seat
        p.pose = p.pending === 'kit' ? kp : p.pose === kp && !p.pending ? kp : 'stand';
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
      else if (p.pose === 'rig') IDLES.noodle(p, bn, t * 1.05);           // v1.1: noodling at your rig
      else if (amp > 0.02) { walkCycle(bn, p.phase, amp); p.idleT = 0; }
      else { p.idleT += dt; if (rigOn) seatIdle(bn, t, p.idleT); else playerIdle(bn, t, p.idleT); }
      p.y += (space.floorAt(p.x, p.z) - p.y) * (1 - Math.exp(-14 * dt));   // v0.8 polish: steps up onto a riser
      p.p.root.position.set(p.x, p.y, p.z);
      p.p.root.rotation.y = p.yaw;
    }
    function arrive() {
      var p = player;
      p.walking = false;
      ctx.ring.hide();
      if (p.pending) {
        p.goalYaw = p.faceYaw; p.faceT = 0;
        if (p.pending === 'kit') p.pose = rigOn ? 'rig' : 'drum';
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
    function seatIdle(bn, t, idleT) {                    // v1.1: hands on your instrument, a lazy strum every few seconds
      rot(bn[B_ARM_L], 0.1, 0, 0.16); rot(bn[B_FORE_L], -2.0, 0, 0.12);
      var c = (idleT + 2) % 6, w = idleT > 2 && c < 1.8 ? bump(c / 1.8) : 0;
      rot(bn[B_ARM_R], -0.3, 0, 0.12); rot(bn[B_FORE_R], -0.9 + w * 0.18 * Math.sin(t * 12), 0, 0.42);
      bn[B_HEAD].rotation.x = 0.08 + 0.12 * w; bn[B_HEAD].rotation.y = 0.2 * Math.sin(t * 0.37) * Math.sin(t * 0.23) * (1 - w);
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
      setShadow(n++, player.x, player.z, 0.62 * player.scale, 0.62 * player.scale, 0, player.y);
      for (var i = 0; i < peopleList.length; i++) {
        var r = peopleList[i], bn = r.p.bones, tt = t * r.energy + r.phase;
        resetPose(r.p, r.pose);
        if (r.pose === 'drum') drumPose(bn, tt, r.scale / KIT_SCALE);           // v1.1: the swapped drummer at the kit
        else (IDLES[r.pose] || IDLES.stand)(r, bn, tt, dt);
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
        var fy = space.floorAt(r.x, r.z);
        r.p.root.position.set(r.x, fy, r.z);
        r.p.root.rotation.y = yaw;
        var fwd = r.seat ? 0.18 : 0;
        if (n < shadowSpots.length + MAX_PEOPLE) setShadow(n++, r.x + Math.sin(yaw) * fwd, r.z + Math.cos(yaw) * fwd, (r.seat ? 0.8 : 0.62) * r.scale, (r.seat ? 0.8 : 0.62) * r.scale, yaw, fy);
      }
      for (; n < shadowSpots.length + MAX_PEOPLE; n++) setShadow(n, 0, 0, 0, 0, 0);
      shadows.instanceMatrix.needsUpdate = true;

      // Hotspot labels breathe; the one the player is heading for grows, the one he is using fades.
      for (i = 0; i < hsList.length; i++) {
        var h = hsList[i], k = h.i * 0.9, big = player.pending === h.def.action ? 1.12 : 1, st = standOf(h.def);
        var here = !player.walking && Math.abs(player.x - st[0]) < 0.3 && Math.abs(player.z - st[1]) < 0.3;
        h.fade += ((here ? 0.3 : 1) - h.fade) * (1 - Math.exp(-5 * dt));
        h.label.material.opacity = h.fade;
        ctx.scaleLabel(h.label, big * (1 + 0.035 * Math.sin(t * 2.4 + k)));
        h.label.position.y = h.y + 0.025 * Math.sin(t * 1.7 + k);
      }
      // Bulb: slow swing and a tired-bulb flicker now and then (v0.8 polish: the space sets the light: the jam room's tube buzzes).
      bulbPivot.rotation.z = 0.035 * Math.sin(t * 0.9); bulbPivot.rotation.x = 0.02 * Math.sin(t * 0.7 + 1);
      var fl = space.flicker(t);
      bulb.intensity = space.bulbI * fl * (1 + 0.025 * Math.sin(t * 23) * Math.sin(t * 3.1));
      halo.material.opacity = 0.5 * fl;
      dust.update(t); yard.update(t); decor.update(t); space.update(t);
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
      if (kind === 'player') { if (!player.p) return false; out.set(player.x, 1.1 * player.scale + player.y, player.z); return true; }
      var r = people[id];
      if (!r) return false;
      var s = r.scale, fwd = r.seat ? 0.15 : 0;
      out.set(r.x + Math.sin(r.yaw) * fwd, (r.seat ? 0.8 : 1.12) * s + space.floorAt(r.x, r.z), r.z + Math.cos(r.yaw) * fwd);
      return true;
    }
    function debug() {
      var ms = [];
      for (var id in people) ms.push({ id: id, pose: people[id].pose, mood: people[id].mood, x: rnd(people[id].x), z: rnd(people[id].z), gear: people[id].gear || null });
      var w = player.walking ? player.path[player.pathLen - 1] : null;
      return {
        player: { x: rnd(player.x), z: rnd(player.z), pose: player.walking ? 'walk' : player.pose },
        target: w ? { x: rnd(w.x), z: rnd(w.z) } : null, walking: player.walking, pending: player.pending,
        hotspots: hotspotActions.slice(), members: ms, cape: capeShown, kitColor: kit.color, banner: banner.text, season: yard.season, decor: decor.state(), fanMail: fanMail.state(), space: space.state(),
        labelAt: hsList.map(function (h) { var p = h.label.position; return { action: h.def.action, x: rnd(p.x), y: rnd(h.y), z: rnd(p.z) }; }),   // v0.8 polish: for label/prop overlap checks
        trophyWall: trophyWall.counts, bandProps: bandProps.state(),
        seat: Object.assign({}, seatInfo, { label: hs.kit ? hs.kit.text || HOTSPOTS[4].label : null, sticker: !!player.sticker, playerPose: player.walking ? 'walk' : player.pose })   // v1.1
      };
    }
    function rnd(v) { return Math.round(v * 100) / 100; }

    // ======================================================================================================
    // Builders (run once, at scene build time).
    function rotLocal(F, lx, lz) {                  // frame-local (x, z) -> world, frame = { x, z, yaw }
      var c = Math.cos(F.yaw), s = Math.sin(F.yaw);
      return { x: F.x + lx * c + lz * s, z: F.z - lx * s + lz * c };
    }

    // v0.8: gb/gg = the garage-only builders (drywall, wainscot, stain; v0.8 polish: the gravel edge, baseboards, wooden top
    // plates, corner trim and the string lights too, so a rented room shows none of them).
    function buildShell(b, g, gb, gg) {
      var WALL = 0xa89f8c, LOW = 0x7f8b84, BASE = 0x4f463d, WOOD = 0x6b5236, CUT = 0x3b3530;
      var x0 = ROOM.x0, x1 = ROOM.x1, z0 = ROOM.z0, z1 = ROOM.z1, w = ROOM.wall, H = ROOM.h;
      // Slab + gravel edge (the cutaway sides show it).
      b.box(x1 - x0 + w, 0.3, z1 - z0 + w, (x0 + x1 + w) / 2, -0.155, (z0 - w + z1) / 2, 0x57544f);
      gb.box(x1 - x0 + w + 0.01, 0.1, z1 - z0 + w + 0.01, (x0 + x1 + w) / 2, -0.26, (z0 - w + z1) / 2, 0x3e342b);
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
      stain(gb, 0.75, 0.15, 0.45, 0x3d3935, 21); stain(gb, 0.95, 0.35, 0.18, 0x2f2c29, 5);   // where Dad's truck used to leak
      // Walls: back (z0) and right (x1), painted drywall over a sage wainscot, wooden top plates.
      gb.box(x1 - x0 + w, H, w, (x0 + x1 + w) / 2, H / 2, z0 - w / 2, WALL);
      gb.box(w, H, z1 - z0 + w, x1 + w / 2, H / 2, (z0 - w + z1) / 2, WALL);
      gb.box(x1 - x0, 0.95, 0.01, (x0 + x1) / 2, 0.475, z0 + 0.005, LOW);
      gb.box(0.01, 0.95, z1 - z0, x1 - 0.005, 0.475, (z0 + z1) / 2, LOW);
      gb.box(x1 - x0, 0.03, 0.02, (x0 + x1) / 2, 0.965, z0 + 0.01, BASE); gb.box(0.02, 0.03, z1 - z0, x1 - 0.01, 0.965, (z0 + z1) / 2, BASE);
      gb.box(x1 - x0, 0.12, 0.025, (x0 + x1) / 2, 0.06, z0 + 0.012, BASE); gb.box(0.025, 0.12, z1 - z0, x1 - 0.012, 0.06, (z0 + z1) / 2, BASE);
      gb.box(x1 - x0 + w + 0.06, 0.1, w + 0.08, (x0 + x1 + w) / 2, H + 0.05, z0 - w / 2, WOOD);
      gb.box(w + 0.08, 0.1, z1 - z0 + w, x1 + w / 2, H + 0.05, (z0 - w + z1) / 2, WOOD);
      b.box(0.012, H, w, x0 - 0.006, H / 2, z0 - w / 2, CUT); b.box(w, H, 0.012, x1 + w / 2, H / 2, z1 + 0.006, CUT);
      gb.box(0.09, H, 0.09, x1 - 0.045, H / 2, z0 + 0.045, WOOD);                    // corner trim
      // String lights along both wall tops (bulbs glow).
      stringLights(gb, gg, x0 + 0.1, z0 + 0.05, x1 - 0.1, z0 + 0.05, 20, 5);
      stringLights(gb, gg, x1 - 0.05, z0 + 0.1, x1 - 0.05, z1 - 0.1, 22, 5);
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

    function buildBackWall(b, g, foot, gb) {        // v0.8: gb = garage-only (Dad's pegboard, the hockey stick)
      var i;
      // Pegboard with Dad's tools, above the amps.
      gb.at(PROPS.amps.x, 0, Z0, 0);
      gb.box(1.0, 0.8, 0.02, 0, 1.7, 0.012, 0x9c7a52);
      for (var r = 0; r < 7; r++) for (var c = 0; c < 9; c++) gb.rect(0.016, 0.016, -0.4 + c * 0.1, 1.37 + r * 0.11, 0.023, 0x5d4630);
      gb.box(0.03, 0.26, 0.02, -0.33, 1.72, 0.04, 0x9b6b3a); gb.box(0.12, 0.045, 0.035, -0.33, 1.86, 0.04, 0x55595f);   // hammer
      gb.box(0.03, 0.24, 0.012, -0.17, 1.7, 0.035, 0x9aa0a8, 0, 0, 0.15); gb.box(0.07, 0.05, 0.012, -0.19, 1.83, 0.035, 0x9aa0a8);
      gb.box(0.34, 0.1, 0.008, 0.1, 1.53, 0.03, 0xb7bcc3); gb.box(0.08, 0.1, 0.02, -0.1, 1.54, 0.035, 0x8b2d22);         // saw
      gb.box(0.025, 0.12, 0.02, 0.05, 1.86, 0.035, 0xd23c3c); gb.box(0.008, 0.1, 0.008, 0.05, 1.75, 0.035, 0x9aa0a8);
      gb.box(0.025, 0.12, 0.02, 0.12, 1.86, 0.035, 0xe8c531); gb.box(0.008, 0.1, 0.008, 0.12, 1.75, 0.035, 0x9aa0a8);
      gb.box(0.08, 0.08, 0.04, 0.36, 1.86, 0.035, 0xe8c531);                                                           // tape measure
      gb.cyl(0.1, 0.1, 0.03, 10, 0.3, 1.64, 0.04, 0x222226, Math.PI / 2);                                               // coiled cable
      // Half-stack amp.
      b.at(PROPS.amps.x, 0, Z0 + 0.2, 0); g.at(PROPS.amps.x, 0, Z0 + 0.2, 0);
      b.box(0.72, 0.72, 0.36, 0, 0.36, 0, 0x1b1b1d); b.box(0.64, 0.64, 0.01, 0, 0.36, 0.181, 0x2e2c2a);
      b.box(0.14, 0.04, 0.012, -0.2, 0.62, 0.186, 0xd9d4c8);
      b.box(0.7, 0.26, 0.3, 0, 0.85, -0.02, 0x1b1b1d); b.box(0.62, 0.08, 0.01, 0, 0.87, 0.131, 0xc9a24a);
      for (var k = 0; k < 6; k++) b.cyl(0.018, 0.018, 0.02, 6, -0.22 + k * 0.08, 0.87, 0.14, 0x111111, Math.PI / 2);
      g.box(0.03, 0.03, 0.01, 0.26, 0.8, 0.136, 0xff3b30);
      foot(PROPS.amps.x, Z0 + 0.2, 0.75, 0.4, 0);
      // Hockey stick leaning between the amps and the door (it's Saskatoon).
      gb.at(PROPS.door.x - PROPS.door.w / 2 - 0.2, 0, Z0 + 0.12, 0);
      gb.box(0.03, 1.35, 0.022, 0, 0.68, 0, 0x8b5a2b, -0.1, 0, 0.08); gb.box(0.28, 0.07, 0.016, 0.1, 0.04, 0.07, 0x1a1a1a);
      gb.box(0.032, 0.12, 0.024, -0.052, 1.3, -0.065, 0x1a1a1a, -0.1, 0, 0.08);
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
      b.at(0, 0, 0, 0); g.at(0, 0, 0, 0);
    }

    function buildRightWall(b, g, foot, gb) {       // v0.8 polish: gb = garage-only (the beat-up couch; a rented room has its own)
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
      // Beat-up couch against the wall (the sulk zone). Every space has a couch here (its own); the footprint is shared.
      var CO = 0x6a5a3c, CU = 0x7a6a48;
      gb.at(X1 - 0.42, 0, PROPS.couch.z, Q);
      gb.box(1.5, 0.25, 0.8, 0, 0.2, 0, CO);
      for (i = 0; i < 4; i++) gb.box(0.06, 0.08, 0.06, (i % 2 ? 0.7 : -0.7), 0.04, (i < 2 ? 0.34 : -0.34), 0x2a1f16);
      for (i = -1; i <= 1; i++) { gb.box(0.47, 0.14, 0.62, i * 0.49, 0.39, 0.06, CU); gb.box(0.46, 0.36, 0.14, i * 0.49, 0.66, -0.22, CU, -0.12); }
      gb.box(0.2, 0.012, 0.2, 0.45, 0.465, 0.12, 0x8c6f47); gb.box(0.45, 0.012, 0.05, 0.49, 0.467, -0.02, 0xb9bdc4, 0, 0.5);  // patch + duct tape
      gb.box(1.5, 0.5, 0.2, 0, 0.62, -0.33, CO);
      gb.box(0.18, 0.5, 0.8, 0.83, 0.4, 0, CO); gb.box(0.18, 0.5, 0.8, -0.83, 0.4, 0, CO);
      gb.box(0.3, 0.26, 0.1, -0.46, 0.6, -0.08, 0x3f6f8f, -0.3, 0.3, 0.2);                                             // throw pillow
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

    function cooler(b) {                              // the red cooler (the garage's laptop desk; the jam room's too), in the current frame
      b.box(0.62, 0.4, 0.4, 0, 0.2, 0, 0xc0392b); b.box(0.64, 0.07, 0.42, 0, 0.435, 0, 0xf2f0ea);
      b.box(0.06, 0.05, 0.3, 0.33, 0.3, 0, 0xf2f0ea); b.box(0.06, 0.05, 0.3, -0.33, 0.3, 0, 0xf2f0ea);
    }
    function buildFloorProps(b, g, foot, gb, gFoot) {   // v0.8: gb/gFoot = garage-only (Dad's mower, the space heater)
      var i, P;
      // Rug under the kit (the kit itself is its own mesh; see buildKit). v0.8 polish: the rug is the garage's (garage-only).
      gb.at(KIT.x, 0, KIT.z, KIT.yaw);
      gb.box(2.0, 0.014, 1.7, 0, 0.007, -0.12, 0x6e1f2b); gb.box(1.78, 0.016, 1.46, 0, 0.008, -0.12, 0x9a3340);
      gb.box(1.54, 0.018, 1.2, 0, 0.009, -0.12, 0x7a2533); gb.box(0.52, 0.02, 0.52, 0, 0.01, -0.12, 0xc99a55, 0, Math.PI / 4);
      foot(KIT.x, KIT.z + 0.03, 1.45, 0.95, KIT.yaw);
      shadowSpots.pop(); kitShadow = shadowSpots.length; shadowSpots.push([KIT.x, KIT.z + 0.05, 1.55, 1.25, KIT.yaw]);
      // v0.9: the mirror / crate / bucket / leaning instrument are the band's own (bandProps below); their footprints stay here.
      P = PROPS.mirror;
      foot(P.x, P.z, 0.7, 0.35, P.yaw);
      // Cooler as a desk, laptop glowing on top (screen faces the camera side). v0.8 SPACES review: the cooler is the garage's
      // (garage-only mesh); every rented room brings its own desk at the same height (buildSpace: laptopDesk).
      P = PROPS.cooler; b.at(P.x, 0, P.z, P.yaw); g.at(P.x, 0, P.z, P.yaw); gb.at(P.x, 0, P.z, P.yaw);
      cooler(gb);
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
      P = PROPS.mower; gb.at(P.x, 0, P.z, P.yaw);
      gb.box(0.5, 0.18, 0.55, 0, 0.17, 0, 0xc0392b); gb.cyl(0.13, 0.15, 0.18, 8, 0, 0.35, -0.02, 0x2b2b2b);
      for (i = 0; i < 4; i++) gb.cyl(0.09, 0.09, 0.05, 10, (i % 2 ? 0.27 : -0.27), 0.09, (i < 2 ? 0.2 : -0.2), 0x151515, 0, 0, Math.PI / 2);
      gb.box(0.03, 0.85, 0.03, 0.2, 0.52, -0.46, 0x333333, -0.62); gb.box(0.03, 0.85, 0.03, -0.2, 0.52, -0.46, 0x333333, -0.62);
      gb.box(0.43, 0.03, 0.03, 0, 0.87, -0.7, 0x333333); gb.box(0.34, 0.24, 0.3, 0, 0.3, -0.42, 0x3f5a3a);
      gb.box(0.1, 0.004, 0.1, 0.12, 0.262, 0.1, 0xf2e27a);
      gFoot(P.x, P.z, 0.6, 0.95, P.yaw);
      P = PROPS.crate; foot(P.x, P.z, 0.4, 0.4, P.yaw);
      P = PROPS.bucket; foot(P.x, P.z, 0.36, 0.36, 0);
      // Space heater (orange glow) and an empty pizza box.
      P = PROPS.heater; gb.at(P.x, 0, P.z, P.yaw); gGlow.at(P.x, 0, P.z, P.yaw);
      gb.box(0.3, 0.42, 0.18, 0, 0.23, 0, 0x8f8f8f); gb.box(0.36, 0.03, 0.24, 0, 0.015, 0, 0x555555);
      gGlow.box(0.24, 0.3, 0.01, 0, 0.25, 0.092, 0xff7a2a);
      for (i = 0; i < 4; i++) gb.box(0.24, 0.012, 0.012, 0, 0.14 + i * 0.07, 0.1, 0x5a5a5a);
      gFoot(P.x, P.z, 0.34, 0.24, P.yaw);
      P = PROPS.pizza; b.at(P.x, 0, P.z, P.yaw);
      b.box(0.42, 0.05, 0.42, 0, 0.025, 0, 0xd8b98a); b.box(0.2, 0.004, 0.12, 0, 0.052, 0, 0xc0392b);
      b.at(0, 0, 0, 0); g.at(0, 0, 0, 0);
    }

    // v0.9 "Genres": the band's own seat props in the shared spots (one lit mesh, rebuilt when the band changes). Four slots:
    // the mirror spot (Marcel's standing mirror / Chase's salon mirror / Frost Heave's laundry cart / the Ramblers' saddle on
    // a sawhorse), the corner seat (Kenji's milk crate / Moth's detergent jugs / a crate with a boombox / feed sacks), the lunch
    // seat (Jaxon's paint bucket / an orange detergent bucket / a paint can / Duke's hay bale) and the instrument leaning on
    // the back wall (Kenji's bass / a bass in a stickered gig bag / a keytar, it is 1985 / Clementine's fiddle case).
    var BAND_PROPS = {
      hail_damage: { mirror: 'standing', corner: 'crate', lunch: 'bucket', lean: 'bass' },
      frost_heave: { mirror: 'cart', corner: 'jugs', lunch: 'detergent', lean: 'gigbag' },
      gravel_kings: { mirror: 'salon', corner: 'boombox', lunch: 'paintcan', lean: 'keytar' },
      grid_road_ramblers: { mirror: 'saddle', corner: 'sacks', lunch: 'bale', lean: 'fiddlecase' }
    };
    var GENRE_PROPS = { metal: 'hail_damage', punk: 'frost_heave', rock: 'gravel_kings', country: 'grid_road_ramblers' };
    function buildBandProps() {
      var mesh = new THREE.Mesh(new THREE.BufferGeometry(), ctx.mats.vc); mesh.visible = false; scene.add(mesh);
      var self = { sig: '', kinds: null };
      self.set = function (band, list, st) {
        var id = band && BAND_PROPS[band.id] ? band.id : GENRE_PROPS[(st && st.genre) || (band && band.genre)] || 'hail_damage';
        if (id === self.sig) return;
        self.sig = id; self.kinds = BAND_PROPS[id];
        var b = new ctx.Builder({ jitter: 0.04, seed: 140 }), P, i, K = BAND_PROPS[id];
        // -- the mirror spot
        P = PROPS.mirror; b.at(P.x, 0, P.z, P.yaw);
        if (K.mirror === 'standing') {                         // Marcel's standing mirror: he poses into it with his back (and cape) to us
          b.box(0.05, 1.55, 0.05, 0.32, 0.77, -0.12, 0x5a3d25, 0.12); b.box(0.05, 1.55, 0.05, -0.32, 0.77, -0.12, 0x5a3d25, 0.12);
          b.box(0.56, 1.3, 0.05, 0, 0.95, 0, 0x5a3d25, -0.08); b.box(0.48, 1.22, 0.012, 0, 0.95, 0.03, 0x9fb3c8, -0.08);
          b.box(0.08, 1.1, 0.004, -0.1, 0.97, 0.04, 0xd6e2ee, -0.08, 0, 0.3); b.box(0.5, 1.24, 0.01, 0, 0.95, -0.03, 0x4a3322, -0.08);
        } else if (K.mirror === 'salon') {                     // Chase's salon mirror (from the nail place next door): bulbs round the edge, hairspray
          b.box(0.06, 0.8, 0.06, 0, 0.4, -0.05, 0x2a2a2e); b.box(0.5, 0.04, 0.34, 0, 0.8, 0.02, 0xe8e0d8);
          b.box(0.64, 0.84, 0.05, 0, 1.28, -0.08, 0xd8d0c8); b.box(0.54, 0.74, 0.012, 0, 1.28, -0.05, 0xa8c0d8); b.box(0.07, 0.62, 0.004, -0.12, 1.3, -0.042, 0xe0ecf6, 0, 0, 0.3);
          for (i = 0; i < 5; i++) { b.box(0.06, 0.06, 0.06, -0.3, 0.92 + i * 0.18, -0.06, 0xfff4d0); b.box(0.06, 0.06, 0.06, 0.3, 0.92 + i * 0.18, -0.06, 0xfff4d0); }
          b.cyl(0.035, 0.035, 0.2, 8, 0.15, 0.92, 0.08, 0xe8408a); b.cyl(0.02, 0.02, 0.04, 6, 0.15, 1.04, 0.08, 0xd8dce4);   // the hairspray (a whole can a week)
          b.box(0.12, 0.03, 0.06, -0.14, 0.835, 0.08, 0x1a1a1e);                                                             // a comb
        } else if (K.mirror === 'cart') {                      // a wire laundry cart on castors, full of Moth's laundry
          for (i = 0; i < 4; i++) b.box(0.03, 0.62, 0.03, (i % 2 ? 0.26 : -0.26), 0.36, (i < 2 ? 0.18 : -0.18), 0xb8bcc2);
          for (i = 0; i < 4; i++) b.cyl(0.04, 0.04, 0.04, 8, (i % 2 ? 0.26 : -0.26), 0.04, (i < 2 ? 0.18 : -0.18), 0x1a1a1e, 0, 0, Math.PI / 2);
          b.box(0.56, 0.36, 0.4, 0, 0.5, 0, 0x8a8e94); b.box(0.5, 0.3, 0.34, 0, 0.52, 0, 0x5a5e66);
          b.shape(new THREE.IcosahedronGeometry(1, 0), 0, 0.72, 0, 0.26, 0.14, 0.18, 0x6a5a8a); b.shape(new THREE.IcosahedronGeometry(1, 0), 0.12, 0.78, 0.05, 0.14, 0.1, 0.12, 0xd8d2c4);
          b.box(0.3, 0.02, 0.2, -0.1, 0.84, -0.05, 0xc0392b, 0.3, 0.4, 0);                                                    // a sock, on top
          b.box(0.03, 0.03, 0.46, 0.3, 0.98, 0, 0xb8bcc2); b.box(0.03, 0.34, 0.03, 0.3, 0.82, 0.22, 0xb8bcc2); b.box(0.03, 0.34, 0.03, 0.3, 0.82, -0.22, 0xb8bcc2);   // the hanger rail
        } else {                                               // 'saddle': an old saddle on a sawhorse, a lasso on the horn
          for (i = 0; i < 4; i++) b.box(0.05, 0.72, 0.05, (i % 2 ? 0.26 : -0.26), 0.34, (i < 2 ? 0.1 : -0.1), 0x8a6a3a, (i < 2 ? -0.18 : 0.18), 0, (i % 2 ? -0.12 : 0.12));
          b.box(0.64, 0.08, 0.1, 0, 0.7, 0, 0x9a7a4a);
          b.box(0.5, 0.12, 0.44, 0, 0.8, 0, 0x6a3a1a); b.box(0.16, 0.16, 0.3, 0.2, 0.88, 0, 0x5a3014); b.box(0.12, 0.2, 0.26, -0.2, 0.9, 0, 0x5a3014);
          b.box(0.05, 0.14, 0.05, 0.28, 0.98, 0, 0x4a2a10); b.box(0.06, 0.3, 0.2, 0, 0.62, 0.22, 0x6a3a1a); b.box(0.06, 0.3, 0.2, 0, 0.62, -0.22, 0x6a3a1a);
          b.box(0.44, 0.02, 0.5, 0, 0.73, 0, 0x2a5a8a);                                                                      // the saddle blanket
          b.cyl(0.12, 0.12, 0.03, 12, 0.34, 0.9, 0, 0xd8b870, 0, 0, Math.PI / 2);                                             // the lasso, coiled
        }
        // -- the corner seat
        P = PROPS.crate; b.at(P.x, 0, P.z, P.yaw);
        if (K.corner === 'crate' || K.corner === 'boombox') {  // Kenji's milk crate (Gravel Kings': with a boombox on top, beside the seat)
          b.box(0.4, 0.32, 0.4, 0, 0.16, 0, K.corner === 'crate' ? 0x2f5fb3 : 0xc0392b);
          for (i = 0; i < 3; i++) b.box(0.402, 0.03, 0.402, 0, 0.07 + i * 0.09, 0, K.corner === 'crate' ? 0x234a8c : 0x8a2a20);
          if (K.corner === 'boombox') {
            b.box(0.46, 0.2, 0.12, 0.05, 0.1, -0.33, 0x2a2a30); b.cyl(0.06, 0.06, 0.02, 10, -0.1, 0.1, -0.265, 0x141418, Math.PI / 2); b.cyl(0.06, 0.06, 0.02, 10, 0.2, 0.1, -0.265, 0x141418, Math.PI / 2);
            b.box(0.1, 0.05, 0.01, 0.05, 0.13, -0.265, 0xb8bcc2); b.box(0.4, 0.02, 0.02, 0.05, 0.24, -0.33, 0xb8bcc2);
          }
        } else if (K.corner === 'jugs') {                     // Moth's seat: a laundry basket upside down on detergent jugs
          for (i = 0; i < 4; i++) { var jx = (i % 2 ? 0.1 : -0.1), jz = (i < 2 ? 0.1 : -0.1); b.box(0.16, 0.2, 0.16, jx, 0.1, jz, [0xe8702a, 0x2f6fd1, 0xe8702a, 0x6fbf4a][i]); b.box(0.05, 0.03, 0.05, jx + 0.04, 0.215, jz, 0xf2efe6); }
          b.box(0.46, 0.14, 0.4, 0, 0.27, 0, 0x4aa0c8); for (i = 0; i < 5; i++) b.box(0.03, 0.1, 0.402, -0.18 + i * 0.09, 0.27, 0, 0x3a88b0);
          b.box(0.3, 0.03, 0.26, 0, 0.35, 0, 0x5b4f6e);                                                                      // a folded hoodie for a cushion
        } else {                                               // 'sacks': feed sacks (the seat), a pail of oats
          b.box(0.44, 0.14, 0.34, 0, 0.07, 0, 0xd8ccb0); b.box(0.44, 0.14, 0.34, 0.02, 0.2, 0.01, 0xcfc2a2, 0, 0.1, 0);
          b.box(0.2, 0.08, 0.004, 0.02, 0.2, 0.182, 0x3a6a3a); b.box(0.42, 0.06, 0.3, 0, 0.3, 0, 0xd8ccb0);
          b.cyl(0.1, 0.09, 0.18, 8, 0.32, 0.09, -0.12, 0x8a8e94);
        }
        // -- the lunch seat
        P = PROPS.bucket; b.at(P.x, 0, P.z, 0);
        if (K.lunch === 'bale') {                              // Duke's seat: a square bale
          b.box(0.5, 0.36, 0.38, 0, 0.18, 0, 0xd8b860); for (i = 0; i < 5; i++) b.box(0.505, 0.012, 0.02, 0, 0.05 + i * 0.07, 0.19, i % 2 ? 0xc8a448 : 0xe6c878);
          b.box(0.016, 0.37, 0.39, 0.13, 0.18, 0, 0x8a5a2a); b.box(0.016, 0.37, 0.39, -0.13, 0.18, 0, 0x8a5a2a);
        } else {
          var BC = K.lunch === 'detergent' ? 0xe8702a : K.lunch === 'paintcan' ? 0xb8bcc2 : 0xe9e4d8;
          b.cyl(0.17, 0.15, 0.38, 10, 0, 0.19, 0, BC); b.cyl(0.175, 0.175, 0.025, 10, 0, 0.372, 0, sh(BC, 0.85));
          b.box(0.08, 0.1, 0.01, 0.0, 0.26, 0.162, K.lunch === 'paintcan' ? 0xe8408a : 0x2f6fd1);
          if (K.lunch === 'paintcan') b.box(0.3, 0.012, 0.02, 0, 0.26, 0.165, 0x40c8e8);                                   // (neon pink + teal: 1985)
        }
        // -- the instrument leaning on the back wall
        b.at(PROPS.bass.x, 0, Z0 + 0.1, 0.3);
        b.push(0, 0, 0, -0.16, 0, 0);
        if (K.lean === 'bass') {                               // Kenji's black bass
          b.box(0.3, 0.42, 0.07, 0, 0.3, 0, 0x111111); b.box(0.2, 0.12, 0.072, 0.06, 0.45, 0, 0x111111);
          b.box(0.055, 0.8, 0.035, 0, 0.9, 0.01, 0x2a1a10); b.box(0.1, 0.16, 0.03, 0, 1.36, 0.01, 0x111111);
          b.box(0.08, 0.05, 0.012, 0, 0.3, 0.04, 0xd9d4c8);
        } else if (K.lean === 'gigbag') {                      // a bass in a gig bag, held together by stickers
          b.box(0.34, 1.3, 0.1, 0, 0.66, 0, 0x1e1e22); b.box(0.36, 0.5, 0.11, 0, 0.3, 0, 0x26262a);
          [[0.05, 0.35, 0xff4fa0], [-0.08, 0.55, 0x6fe35a], [0.06, 0.8, 0xffe23a], [-0.04, 1.05, 0xf2efe6]].forEach(function (q) { b.box(0.1, 0.07, 0.006, q[0], q[1], 0.058, q[2], 0, 0, q[0] * 3); });
        } else if (K.lean === 'keytar') {                      // a keytar. It is 1985 in here.
          b.push(0, 0.6, 0, 0, 0, 0.9);
          b.box(0.9, 0.14, 0.06, 0, 0, 0, 0xf2efe6); for (i = 0; i < 12; i++) b.box(0.05, 0.08, 0.02, -0.34 + i * 0.056, -0.02, 0.035, i % 3 === 1 ? 0x141414 : 0xfafafa);
          b.box(0.34, 0.06, 0.05, 0.56, 0.03, 0, 0x2a2a30); b.box(0.06, 0.03, 0.02, 0.5, 0.05, 0.03, 0xe8408a);
          b.pop();
        } else {                                               // Clementine's fiddle case (the Bach is inside, in case anyone's watching)
          b.box(0.28, 0.72, 0.14, 0, 0.36, 0, 0x2a1e18); b.box(0.2, 0.3, 0.145, 0, 0.62, 0, 0x3a2a20);
          b.box(0.24, 0.04, 0.02, 0, 0.36, 0.075, 0xb8a060); b.box(0.06, 0.08, 0.03, 0.05, 0.4, 0.08, 0x9a8040);
          b.box(0.16, 0.2, 0.006, 0, 0.2, 0.074, 0xe8e4d8, 0, 0, 0.1);                                                      // a sheet-music luggage tag
        }
        b.pop();
        mesh.geometry.dispose(); mesh.geometry = b.build(); mesh.visible = true;
      };
      self.state = function () { return self.kinds ? Object.assign({ band: self.sig }, self.kinds) : null; };
      return self;
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
      var cur = null, S = null, indoor = false, farm = false;
      var self = {
        season: null,
        // v0.9: the Quonset's farmyard keeps the lawn glow + the weather but not the lawn chair / snowman (its own props are
        // in the room: canola, bales, the grid road).
        farm: function (on) {
          on = !!on; if (on === farm) return;
          farm = on;
          for (var k in props) props[k].visible = !indoor && !farm && k === self.season;
        },
        // v0.8 polish: a rented space is indoors: no lawn, no weather, no lawn chair (the season is still tracked).
        indoor: function (on) {
          on = !!on; if (on === indoor) return;
          indoor = on; ground.visible = pts.visible = !on;
          for (var k in props) props[k].visible = !on && !farm && k === self.season;
        },
        set: function (season) {
          if (season === self.season || !SEASONS[season]) return;
          self.season = season; S = SEASONS[season];
          ground.material.color.setHex(S.ground);
          for (var k in props) props[k].visible = !indoor && !farm && k === season;
          mat.color.setHex(S.color); mat.size = S.size; mat.opacity = S.opacity;
          mat.blending = S.glow ? THREE.AdditiveBlending : THREE.NormalBlending;
          geo.setDrawRange(0, S.count);
          if (!S.blink) { col.fill(1); geo.attributes.color.needsUpdate = true; }
          cur = season;
        },
        update: function (t) {
          if (!cur || indoor) return;
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
      // v0.8 polish: December in a rented room. The jam room: one sad strand taped over the door, three bulbs dead; the studio:
      // warm-white fairy lights along the control-room window; backstage: a strand wound round the road cases.
      function strand(pts, cols, seed, wire) {
        var b = new ctx.Builder({ jitter: 0, seed: seed });
        for (var k = 0; k < pts.length; k++) {
          var p = pts[k]; b.box(0.034, 0.048, 0.034, p[0], p[1] - 0.03, p[2], cols[k % cols.length]);
          if (k) { var q = pts[k - 1], dx = p[0] - q[0], dy = p[1] - q[1], dz = p[2] - q[2], L = Math.sqrt(dx * dx + dy * dy + dz * dz);
            b.push((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2, 0, -Math.atan2(dz, dx), Math.atan2(dy, Math.sqrt(dx * dx + dz * dz)));
            b.box(L, 0.006, 0.006, 0, 0, 0, wire); b.pop(); }
        }
        return b;
      }
      function sagLine(ax, ay, az, bx, by, bz, n, sag, loops) {
        var out = [];
        for (var k = 0; k < n; k++) { var u = k / (n - 1); out.push([ax + (bx - ax) * u, ay + (by - ay) * u - sag * Math.sin(Math.PI * ((u * loops) % 1 || (u ? 1 : 0))), az + (bz - az) * u]); }
        return out;
      }
      // (v0.8 SPACES review: the jam room's strand droops across the top of the NO DRUMS sign, taped at its corners.)
      var DEAD = 0x2e2e30, sad = strand(sagLine(-0.55, 2.11, Z0 + 0.05, 0.41, 2.12, Z0 + 0.05, 9, 0.07, 1), [0xff3b30, 0x34c759, DEAD, 0xffcc00, 0x2f7fff, DEAD, 0xff3b30, 0xffcc00, DEAD], 44, 0x1a3a1a);
      sad.box(0.09, 0.055, 0.01, -0.55, 2.09, Z0 + 0.03, 0xb9bdc4); sad.box(0.09, 0.055, 0.01, 0.41, 2.1, Z0 + 0.03, 0xb9bdc4);   // duct tape
      var fairy = strand(sagLine(-0.7, 2.3, Z0 + 0.24, 0.46, 2.3, Z0 + 0.24, 15, 0.06, 4), [0xfff0c8, 0xffe2a0], 45, 0x3a2a1a);   // (along the window's deep head)
      var wound = [], w0;
      for (i = 0; i < 10; i++) { w0 = i / 9; wound.push([1.74 + 0.52 * (i % 2 ? 1 : 0.05) + 0.02 * i, 0.22 + w0 * 0.72, Z0 + 0.66 - (i % 2 ? 0.02 : 0)]); }   // (two cases now)
      wound = wound.concat(sagLine(2.28, 1.86, Z0 + 0.5, 1.4, 1.86, Z0 + 0.16, 9, 0.06, 2));   // then up and along the arena monitor's top edge
      var cases = strand(wound, [0xff3b30, 0x34c759, 0x2f7fff, 0xffcc00, 0xfff4e0], 46, 0x1a3a1a);
      var lights = new THREE.Mesh(lb.build(), lm);
      var tierLights = [lights, new THREE.Mesh(sad.build(), lm), new THREE.Mesh(fairy.build(), lm), new THREE.Mesh(cases.build(), lm)];
      show(lights, false); scene.add(lights);
      for (i = 1; i < 4; i++) { show(tierLights[i], false); scene.add(tierLights[i]); }
      var fb = new ctx.Builder({ jitter: 0.01, seed: 43 }), FAN = 0xe8e2d4;
      fb.box(0.5, 0.5, 0.14, 0, 0.27, 0, FAN); fb.box(0.42, 0.42, 0.15, 0, 0.27, 0, 0x2a2a2e);
      fb.box(0.12, 0.04, 0.3, 0, 0.02, 0, FAN); fb.box(0.06, 0.03, 0.02, 0.17, 0.5, 0.075, 0x9a9a9a);   // feet, the dial
      var fan = new THREE.Mesh(fb.build(), ctx.mats.vc);
      var bb = new ctx.Builder({ jitter: 0 });
      for (i = 0; i < 3; i++) bb.box(0.07, 0.17, 0.01, 0, 0.09, 0, 0xb8c4cc, 0, 0, i * Math.PI * 2 / 3);
      var blades = new THREE.Mesh(bb.build(), ctx.mats.vc); blades.position.set(0, 0.27, 0.08); fan.add(blades);
      fan.position.set(X1 - 0.45, 0, PROPS.couch.z - 1.2); fan.rotation.y = -Math.PI / 2 - 0.5; show(fan, false); show(blades, false); scene.add(fan);
      var cur = { snow: false, lights: false, fan: false, tier: 0, season: 'summer' };
      // v0.9: the tier-0 rooms (room index 4..6) dress for the season in their own geometry (the window well, the shop window,
      // the Quonset door + the farmyard): space.set reads flags() and rebuilds its room when they change.
      var WHERE = ['garage door', 'sad strand', 'control-room window', 'road cases', 'window well + stairs', 'shop window', 'Quonset door + farmyard'];
      return {
        set: function (st) {
          var w = st.week || 1, season = seasonOf(w), month = GG.calendar ? GG.calendar.month(w) : null;
          var wx = GG.calendar && st.seed != null ? GG.calendar.weather(st).kind : null, ri = roomIndexOf(st);
          cur.tier = ri; cur.season = season;
          cur.snow = (ri === 0 || ri >= 4) && (season === 'winter' || wx === 'snow' || wx === 'blizzard');   // v0.8: only rooms with windows
          cur.lights = month === 'Dec';
          cur.fan = (ri <= 1 || ri >= 4) && (month === 'Jul' || wx === 'heat');                             // v0.8 polish: the studio + arena have AC
          show(snow, cur.snow && ri === 0); show(fan, cur.fan); show(blades, cur.fan);
          for (var k = 0; k < 4; k++) show(tierLights[k], cur.lights && k === ri);
        },
        flags: function () { return { season: cur.season, snow: cur.snow, lights: cur.lights }; },
        update: function (t) {
          if (cur.fan) blades.rotation.z = t * 14;
          if (cur.lights) { var b = cur.tier === 2 ? 0.85 + 0.15 * Math.sin(t * 1.3) : 0.65 + 0.35 * (Math.sin(t * 2.2) > 0 ? 1 : 0.4); lm.color.setScalar(b); }
        },
        state: function () { return { snow: cur.snow, lights: cur.lights, fan: cur.fan, season: cur.season, where: WHERE[cur.tier] }; }
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
      // v0.9: the other bands' home-superfan gifts (Delphine's lint portrait, Gloria's sugar-packet tray, Wilf's quilt, any
      // homeSuperfan[bandId].gift): one generic homemade portrait in the same spot, no sunglasses and no bass (that's Kenji's).
      var ab = new ctx.Builder({ jitter: 0.004, seed: 58 }), CR = 0xe8dcc0, ED = 0x7a6a58;
      ab.at(X1, 0, -2.2, -Math.PI / 2);
      ab.box(0.5, 0.6, 0.02, 0, 1.5, 0.01, 0x8a6a3a);                                          // a plain wooden frame
      ab.box(0.42, 0.52, 0.006, 0, 1.5, 0.022, CR);                                             // the backing (lint / sugar / quilt: all cream)
      for (i = 0; i < 16; i++) {                                                                // the face, an oval of stitches
        a = i / 16 * Math.PI * 2;
        ab.box(0.04, 0.018, 0.016, Math.cos(a) * 0.12, 1.55 + Math.sin(a) * 0.15, 0.03, ED, 0, 0, a + Math.PI / 2);
      }
      ab.box(0.025, 0.025, 0.016, -0.045, 1.58, 0.032, ED); ab.box(0.025, 0.025, 0.016, 0.045, 1.58, 0.032, ED);   // two eyes
      ab.box(0.07, 0.016, 0.016, 0, 1.49, 0.032, ED, 0, 0, 0.12);                               // a lopsided smile
      ab.box(0.3, 0.12, 0.016, 0, 1.3, 0.03, 0x5a7aa8);                                         // shoulders (a band shirt)
      for (i = 0; i < 4; i++) ab.box(0.05, 0.05, 0.012, -0.16 + i * 0.105, 1.73, 0.03, [0xc0392b, 0x34a853, 0xf2d15b, 0x2f7fff][i]);   // corner patches
      var portraitAny = new THREE.Mesh(ab.build(), ctx.mats.vc); show(portraitAny, false); scene.add(portraitAny);
      function homeGift(id) {
        var H = (GG.content.bandbook && GG.content.bandbook.homeSuperfan) || {};
        for (var k in H) { var gf = H[k] && H[k].gift; if ((gf && typeof gf === 'object' ? gf.id : gf) === id) return true; }
        return false;
      }
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
          var list = st.gifts || [], g = 0, m = 0, mac = false, other = false;
          for (var j = 0; j < list.length; j++) {
            if (list[j].id === 'macaroni_kenji') mac = true;
            else if (list[j].id && homeGift(list[j].id)) other = true;
            else if (list[j].kind === 'mail') m++; else g++;
          }
          cur.portrait = mac ? 'kenji' : other ? 'fan' : false; cur.mail = m > 0; cur.gifts = g >= 5 ? 6 : g >= 3 ? 3 : g >= 1 ? 1 : 0;
          show(portrait, mac); show(portraitAny, !mac && other); show(mail, cur.mail);
          for (var k in piles) show(piles[k], +k === cur.gifts);
        },
        state: function () { return { portrait: cur.portrait, gifts: cur.gifts, mail: cur.mail }; }
      };
    }
    // ======================================================================================================
    // v0.8 (SHOPUI) + v0.8 polish (SPACES): the rehearsal space. state.spaceTier: 0 = the band's own start (Hail Damage: the
    // parents' garage, the static room above, untouched), 1 = Rent-A-Riff, Jam Space 7 (a strip-mall rehearsal complex:
    // painted cinder block, grey carpet tiles with stains, egg-crate foam patches, a buzzing fluorescent strip, a red steel
    // door with a stencilled 7, NO DRUMS / AFTER 11 PM, other bands' stickers + a spray tag + marker graffiti, a stack of plastic
    // chairs, the cooler desk; out front the corridor: dim VCT tiles, WET FLOOR, the next band's gear, lost + found, a low cut
    // wall with the neighbours' doors 6 + 8 and the EXIT), 2 = Prairie Dog Sound (an old grain co-op: bevelled fabric panels,
    // a skyline diffuser, pale oak planks, the control-room window (a deep reveal onto the console + Gwen), track lights washing
    // the walls, a gear rack, the kit on a carpeted riser, the house gold record, a walnut side desk; out front the lobby on
    // charcoal carpet: the logo rug, the organ + Leslie, a fern), 3 = backstage at the Potash Place (painted block under bare
    // concrete, BAND ROOM stencilled on the wall, the band's name on a placard on its door, stencilled road cases, a monitor
    // on an arm showing the empty arena, the bulb mirror, a sad catering table, caged work lights, a flight-case desk, the
    // kit on a black deck; out front the service corridor: yellow lines, cable ramps, the drum case, the forklift with a
    // shrink-wrapped pallet). Each tier also sets the room's light
    // (MOODS: hemisphere, key, fill, the bulb's colour + flicker, the accent), the background, the couch, the rug / riser and
    // where the band banner hangs; the yard (lawn, weather, lawn chair, moon shafts) is the garage's only.
    // Meshes: room lit + glow, fixture (its own material: the tube buzzes), light wash (additive pools on the walls), decals
    // lit + glow and the corridor floor (one 2048 x 1024 canvas atlas: every sign, sticker, stencil, the control-room view, the arena
    // monitor, the corridor floor), upgrades lit + glow, the disco ball, the box pile. Rebuilt (old geometry disposed) only
    // on a move, a purchase or a pile change. The bought upgrades (state.spaceUpgrades; content/shop.js) stand where they'd
    // stand: the curb loveseat (front edge, moves with you), Dad's beer fridge (by the outlet, moves), egg-crate foam,
    // Christmas lights round the whiteboard, a leather-ish couch, acoustic panels, a real PA, a disco ball (spins), the iso
    // booth, the band lounge, the espresso cart, mood LEDs, hot catering, green walls, a hot tub, a star on the door (and,
    // with no loveseat, the studio's office chair / backstage's director's chair). The unsold merch boxes
    // (GG.shop.pile(state).boxes) stack up along the open left edge between Kenji's corner and the merch stack (clear of every
    // label), one box per box, up to 15 in a staircase growing toward the camera (+ a MERCH sign rising out of the pile past
    // that), each with a white tape band; the boxed misprint batch is the one with a red X on its side.
    var SPACE_DOOR = { x: 1.0, w: 0.92, h: 2.08 };
    // v0.9 (Q7): the rented rooms keep their geometry but their painted names are the home city's (content: shop.spaces[tier]
    // .byCity[city].name), e.g. the studio's riser stencil, rug logo and gold-record plaque; the arena's stencil.
    var PAINT = { studio: 'PRAIRIE DOG SOUND', arena: 'POTASH PLACE', jam: 'JAM SPACE 7' };
    function spaceByCity(tier, city) {
      var sp = GG.content && GG.content.shop && GG.content.shop.spaces, e = null, i;
      if (!Array.isArray(sp) || !city) return null;
      for (i = 0; i < sp.length; i++) if (sp[i] && sp[i].tier === tier) e = sp[i];
      var by = e && e.byCity;
      if (!by) return null;
      var c = String(city), k = c.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      return by[c] || by[k] || by[c.toLowerCase()] || null;
    }
    function paintNames(band) {
      var st = GG.state, city = (st && st.city) || (band && band.city) || '';
      var s2 = spaceByCity(2, city), s3 = spaceByCity(3, city), s1 = spaceByCity(1, city);
      PAINT.studio = s2 && s2.name ? String(s2.name).toUpperCase() : 'PRAIRIE DOG SOUND';
      PAINT.arena = s3 && s3.name ? String(s3.name).replace(/^backstage (at|in|under)\s+(the\s+)?/i, '').toUpperCase() : 'POTASH PLACE';
      PAINT.jam = s1 && s1.name ? String(s1.name).toUpperCase() : 'JAM SPACE 7';
    }
    // Light + palette per tier. hemi [sky, ground, i], key = the moon light's [colour, i], bulb = the point light, accent = the
    // heater light [colour, i, x, y, z] (the garage heater / the studio's control-room glow), fixture = what hangs from the ceiling.
    var MOODS = [
      { kind: 'garage', wall: 0xa89f8c, floor: 0x77736d, bg: 0x0b1020, hemi: [0x6f84b8, 0x3b2d22, 0.55], key: [0x8fa8ff, 0.32], fill: [0xffe2c4, 0.28],
        bulb: [0xffc27a, 1.55], accent: [0xff7a30, 0.55, 1.5, 0.45, 2.15], dust: 0xffdcaa, fixture: 'bulb', hall: 'yard' },
      { kind: 'jam', wall: 0x8c98a6, floor: 0x5f636a, bg: 0x101216, hemi: [0xb0c0cc, 0x30333a, 0.56], key: [0xdff2ff, 0.28], fill: [0xe6eeff, 0.26],
        bulb: [0xdcecff, 1.4], accent: [0x000000, 0, 0, 0, 0], dust: 0xdcecff, fixture: 'fluorescent', hall: 'corridor' },
      { kind: 'studio', wall: 0x1c1d22, floor: 0xb09474, bg: 0x0b0a09, hemi: [0x847468, 0x1c1610, 0.52], key: [0xf0cca8, 0.26], fill: [0xf2dcc6, 0.3],
        bulb: [0xe8bc90, 1.45], accent: [0x8aa4c8, 0.45, -0.12, 1.5, -2.2], dust: 0xf0d0a8, fixture: 'track', hall: 'lobby' },   // (warm, ~30% less saturated)
      { kind: 'backstage', wall: 0x24457e, floor: 0x686c72, bg: 0x07090e, hemi: [0xc4d0e4, 0x3a3e46, 0.66], key: [0xf0f4ff, 0.34], fill: [0xf0f4ff, 0.3],
        bulb: [0xf2f6ff, 1.65], accent: [0x000000, 0, 0, 0, 0], dust: 0xe8eeff, fixture: 'work lights', hall: 'service corridor' },
      // v0.9: the other bands' own starts (tier 0). The basement under the Suds-O-Rama (a bare bulb, dryer heat glowing on the
      // stairs), Unit 4B at Westgate Plaza (a buzzing troffer, the parking lot's sodium light through the shop window), Duke's
      // uncle's Quonset (a bare bulb on a long cord, the yard light outside).
      { kind: 'laundromat', wall: 0x8a9a8c, floor: 0x6a7068, bg: 0x0a0d0c, hemi: [0x9aa8a0, 0x3a3228, 0.56], key: [0xc8d8ff, 0.2], fill: [0xffe2c4, 0.28],
        bulb: [0xffc98a, 1.5], accent: [0xff9a50, 0.5, 1.0, 1.9, -2.3], dust: 0xf0e8d8, fixture: 'bulb', hall: 'none' },
      { kind: 'stripmall', wall: 0xd8d2c4, floor: 0xb8b4aa, bg: 0x0d0c0a, hemi: [0xd0d8e0, 0x3a3630, 0.6], key: [0xffb060, 0.36], fill: [0xf0f0ff, 0.26],
        bulb: [0xe8f4ff, 1.45], accent: [0xff9a40, 0.6, -1.0, 1.6, -3.0], dust: 0xe8f0ff, fixture: 'fluorescent', hall: 'parking lot' },
      { kind: 'quonset', wall: 0x9aa0a4, floor: 0x6e6254, bg: 0x0a0d18, hemi: [0x8a9cc0, 0x3a2e22, 0.58], key: [0x9fb4ff, 0.3], fill: [0xffe2c4, 0.28],
        bulb: [0xffc27a, 1.55], accent: [0xffd070, 0.35, 1.1, 2.4, -2.9], dust: 0xffdcaa, fixture: 'bulb', hall: 'farmyard' }
    ];
    var GREEN_WALL = 0x5a9656;
    // The box pile (v0.8 SPACES review): along the open left edge between Kenji's corner and the merch stack, a staircase that
    // grows toward the camera (up to 3 high; 2 wide at the front, where the riser leaves room), under no label and in front
    // of nobody (Marcel's mirror moved a step forward-right). [x, z, yaw jitter]
    var PILE_CELLS = [[-2.07, -1.1, 0.06], [-2.07, -0.7, -0.05], [-2.07, -0.3, 0.08], [-2.07, 0.1, -0.04], [-1.64, 0.1, 0.07]];
    var PILE_ORDER = [[0, 0], [1, 0], [0, 1], [2, 0], [1, 1], [0, 2], [3, 0], [2, 1], [4, 0], [1, 2], [3, 1], [2, 2], [4, 1], [3, 2], [4, 2]];
    var PILE_MAX = PILE_ORDER.length, BOX = { w: 0.4, h: 0.3, d: 0.34 };
    var DOOR_LABELS = ['Garage door', 'Door', 'Door', 'Door', 'Basement stairs', 'Shop door', 'Quonset door'];
    // v0.9: the tier-0 door is the band's own (content band.door: 'the basement stairs' -> 'Basement stairs').
    function doorLabel(ri, band) {
      if (ri === 0 || ri >= 4) {
        var d = band && typeof band.door === 'string' ? band.door.replace(/^the\s+/i, '') : '';
        if (d) return d.charAt(0).toUpperCase() + d.slice(1);
      }
      return DOOR_LABELS[ri] || 'Door';
    }
    // Riser (kit-local rectangle, metres): the studio's carpeted riser, the arena's black deck.
    var RISERS = [null, null, { h: 0.16, x: 0.95, z0: -1.12, z1: 0.62 }, { h: 0.2, x: 1.0, z0: -1.15, z1: 0.66 }];
    function buildSpace() {
      function mk(mat, order) { var m = ctx.freeze(new THREE.Mesh(new THREE.BufferGeometry(), mat)); m.visible = false; if (order) m.renderOrder = order; scene.add(m); return m; }
      // (v0.8 SPACES review: 2048 wide, the signs got bigger.) v1.0 (Lane P): the atlas is made on the first room that paints
      // decals (a rented tier, or another band's tier-0 room), never for the parents' garage; 'low' graphics paint it at half
      // size (1024 x 512, the same 2048 x 1024 layout drawn through a 0.5 scale, so every region and UV stays put).
      var AW = 2048, AH = 1024, atlas = null, ag = null, atex = null;
      function ensureAtlas() {
        if (atlas) return;
        var k = R.prefs && R.prefs().quality === 'low' ? 0.5 : 1;
        atlas = document.createElement('canvas'); atlas.width = AW * k; atlas.height = AH * k;
        ag = atlas.getContext('2d'); if (k !== 1) ag.scale(k, k);
        atex = new THREE.CanvasTexture(atlas); atex.anisotropy = 4;
        [decal, decalGlow, hall].forEach(function (m) { m.material.map = atex; m.material.needsUpdate = true; });
      }
      var fixMat = new THREE.MeshBasicMaterial({ vertexColors: true });
      var washMat = new THREE.MeshBasicMaterial({ map: ctx.radialTexture('glow'), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
      var room = mk(ctx.mats.vc), roomGlow = mk(ctx.mats.unlit), fix = mk(fixMat), wash = mk(washMat, 3);
      var decal = mk(new THREE.MeshLambertMaterial({ map: null, alphaTest: 0.35 })), decalGlow = mk(new THREE.MeshBasicMaterial({ map: null, alphaTest: 0.35 }));
      var hall = mk(new THREE.MeshLambertMaterial({ map: null, transparent: true, depthWrite: false }), -1);
      var ups = mk(ctx.mats.vc), upsGlow = mk(ctx.mats.unlit), pile = mk(ctx.mats.vc);
      // The disco ball: a faceted ball on a chain (own mesh so it can spin).
      var bb = new ctx.Builder({ jitter: 0.35, seed: 71 });
      bb.shape(new THREE.IcosahedronGeometry(0.21, 1), 0, 0, 0, 1, 1, 1, 0xd8dde6);
      bb.box(0.012, 0.5, 0.012, 0, 0.45, 0, 0x8a8a8a);
      var ball = new THREE.Mesh(bb.build(), ctx.mats.unlit); ball.visible = false; ball.position.set(0.55, 2.1, 0.85); scene.add(ball);
      var cur = { tier: -1, ri: -1, city: '', exterior: null, room: '', ups: '', pile: '', boxes: 0, shown: 0, list: [], green: false, door: 'Garage door', signText: '', couch: false, decals: 0, hallProps: 0, pileBox: null, pileSign: null };
      var tierObs = [], upObs = [], pileObs = [];
      var self = { obstacles: [], bulbI: 1.55 }, mood = null, riser = null, fixBase = 1;   // (MOODS etc. are assigned after the scene builds this)
      function swap(mesh, b) {
        mesh.geometry.dispose();
        var n = b ? b.count() : 0;
        mesh.geometry = n ? b.build() : new THREE.BufferGeometry();
        mesh.visible = n > 0;
      }
      function obs(list, x, z, w, d, yaw) {
        var c = Math.abs(Math.cos(yaw || 0)), s = Math.abs(Math.sin(yaw || 0)), hx = (w * c + d * s) / 2, hz = (w * s + d * c) / 2;
        list.push([x - hx, z - hz, x + hx, z + hz]);
      }

      /* ---- the atlas: a guillotine packer over the 2048 x 1024 canvas (the corridor floor keeps the bottom-left 512²) ------ */
      var free;
      function resetAtlas() {
        if (ag) ag.clearRect(0, 0, AW, AH);
        free = [{ x: 0, y: 0, w: AW, h: 508 }, { x: 516, y: 512, w: AW - 516, h: 512 }];
      }
      // -> { x, y, w, h } (4 px transparent gutter all round). A best-fit guillotine packer (v0.8 SPACES review: the old shelf
      // packer let one tall sign waste most of a shelf and the jam room's corridor decals ran out of atlas).
      function region(w, h) {
        w = Math.ceil(w); h = Math.ceil(h);
        var W2 = w + 8, H2 = h + 8, best = -1, ba = Infinity, i;
        for (i = 0; i < free.length; i++) { var f = free[i]; if (f.w >= W2 && f.h >= H2 && f.w * f.h < ba) { ba = f.w * f.h; best = i; } }
        if (best < 0) { console.warn('garage: the decal atlas is full'); return { x: 0, y: 0, w: 1, h: 1 }; }
        var F = free.splice(best, 1)[0];
        if (F.w > W2) free.push({ x: F.x + W2, y: F.y, w: F.w - W2, h: H2 });
        if (F.h > H2) free.push({ x: F.x, y: F.y + H2, w: F.w, h: F.h - H2 });
        return { x: F.x + 4, y: F.y + 4, w: w, h: h };
      }
      var STENCIL = '900 {s}px "Arial Black", Impact, "DejaVu Sans", sans-serif', MARKER = '700 {s}px "Comic Sans MS", "Marker Felt", "DejaVu Sans", cursive';
      function font(f, s) { return f.replace('{s}', Math.round(s)); }
      function fitText(t, f, s, maxW) { ag.font = font(f, s); while (ag.measureText(t).width > maxW && s > 8) { s -= 2; ag.font = font(f, s); } return s; }
      // sq < 1: condensed lettering (the glyphs squeezed sideways), so a sign's words stay tall on a narrow patch of wall.
      function text(t, x, y, f, s, col, maxW, align, sq) {
        sq = sq || 1; fitText(t, f, s, (maxW || 9999) / sq); ag.fillStyle = col; ag.textAlign = align || 'center'; ag.textBaseline = 'middle';
        if (sq === 1) ag.fillText(t, x, y); else { ag.save(); ag.translate(x, y); ag.scale(sq, 1); ag.fillText(t, 0, 0); ag.restore(); }
      }
      function stencilGaps(r, n) {                              // stencil bridges: thin cuts through the letters
        ag.save(); ag.globalCompositeOperation = 'destination-out';
        for (var i = 1; i < n; i++) ag.fillRect(r.x + r.w * i / n - 1.5, r.y, 3, r.h);
        ag.restore();
      }
      function rrect(x, y, w, h, rad) { ag.beginPath(); ag.moveTo(x + rad, y); ag.arcTo(x + w, y, x + w, y + h, rad); ag.arcTo(x + w, y + h, x, y + h, rad); ag.arcTo(x, y + h, x, y, rad); ag.arcTo(x, y, x + w, y, rad); ag.closePath(); }
      // Painters: each returns its atlas region.
      function pSign(w, h, bg, fg, lines, border, sq) {
        var r = region(w, h);
        ag.fillStyle = bg; ag.fillRect(r.x, r.y, r.w, r.h);
        if (border) { ag.strokeStyle = border; ag.lineWidth = Math.max(4, h * 0.05); ag.strokeRect(r.x + 7, r.y + 7, r.w - 14, r.h - 14); }
        var tot = 0, i; for (i = 0; i < lines.length; i++) tot += lines[i][1];
        var y = r.y + (r.h - tot) / 2;
        for (i = 0; i < lines.length; i++) { var L = lines[i]; text(L[0], r.x + r.w / 2, y + L[1] / 2, L[2] || STENCIL, L[1] * 0.86, L[3] || fg, r.w - 26, null, sq); y += L[1]; }
        return r;
      }
      function pSticker(t, bg, fg, shape) {                     // a band sticker: pill, box or circle (chunky, a white die-cut edge)
        var circle = shape === 'circle', w = circle ? 128 : 200, h = circle ? 128 : 124, r = region(w, h), c = w / 2;
        ag.fillStyle = '#f7f5ee';
        if (circle) { ag.beginPath(); ag.arc(r.x + c, r.y + c, 63, 0, Math.PI * 2); ag.fill(); } else { rrect(r.x, r.y, w, h, shape === 'pill' ? 60 : 12); ag.fill(); }
        ag.fillStyle = bg;
        if (circle) { ag.beginPath(); ag.arc(r.x + c, r.y + c, 55, 0, Math.PI * 2); ag.fill(); }
        else { rrect(r.x + 8, r.y + 8, w - 16, h - 16, shape === 'pill' ? 52 : 6); ag.fill(); }
        ag.strokeStyle = fg; ag.lineWidth = 5;
        if (circle) { ag.beginPath(); ag.arc(r.x + c, r.y + c, 46, 0, Math.PI * 2); ag.stroke(); } else { rrect(r.x + 16, r.y + 16, w - 32, h - 32, shape === 'pill' ? 44 : 4); ag.stroke(); }
        var words = t.split(' '), two = words.length > 1 && t.length > 8;
        if (two) { var m = Math.ceil(words.length / 2); text(words.slice(0, m).join(' '), r.x + w / 2, r.y + h * 0.36, STENCIL, 40, fg, w - 34, null, 0.8); text(words.slice(m).join(' '), r.x + w / 2, r.y + h * 0.66, STENCIL, 40, fg, w - 34, null, 0.8); }
        else text(t, r.x + w / 2, r.y + h / 2 + 2, STENCIL, 52, fg, w - 34, null, 0.8);
        return r;
      }
      function pMarker(t, col, s, w) { var r = region(w || 420, s * 1.5); text(t, r.x + 6, r.y + r.h / 2, MARKER, s, col, r.w - 12, 'left'); return r; }
      function pStencil(lines, col, w, h, gaps, sq) {
        var r = region(w, h), y = r.y + h / (lines.length * 2);
        for (var i = 0; i < lines.length; i++) { text(lines[i], r.x + w / 2, y, STENCIL, h / lines.length * 0.78, col, w - 10, null, sq); y += h / lines.length; }
        if (gaps) stencilGaps(r, gaps);
        return r;
      }
      // A spray-paint tag: fat italic letters (one line per entry), a dark outline, drips.
      function pTag(lines, col, w, h, seed) {
        var r = region(w, h), rng = GG.RNG(seed || 7), F = '900 italic {s}px "Arial Black", Impact, "DejaVu Sans", sans-serif', lh = h * 0.8 / lines.length, i, k;
        ag.save(); ag.translate(r.x + w / 2, r.y + h * 0.1 + lh / 2); ag.rotate(-0.08);
        for (k = 0; k < lines.length; k++) {
          var s = fitText(lines[k], F, lh * 0.95, (w - 40) / 0.8), y = k * lh;
          ag.save(); ag.translate(k * 18 - 9, y); ag.scale(0.8, 1);
          ag.font = font(F, s); ag.textAlign = 'center'; ag.textBaseline = 'middle';
          ag.lineJoin = 'round'; ag.lineWidth = s * 0.2; ag.strokeStyle = '#141416'; ag.strokeText(lines[k], 0, 0);
          ag.fillStyle = col; ag.fillText(lines[k], 0, 0);
          var tw = ag.measureText(lines[k]).width;
          for (i = 0; i < 6; i++) { var dx = -tw / 2 + rng.next() * tw, L = lh * (0.15 + rng.next() * 0.3); ag.fillRect(dx, s * 0.32, 5 + rng.next() * 3, L); ag.beginPath(); ag.arc(dx + 4, s * 0.32 + L, 5, 0, Math.PI * 2); ag.fill(); }
          ag.restore();
        }
        ag.restore();
        return r;
      }

      /* ---- decal geometry: quads on the walls, the floor or a prop face, with atlas UVs --------------------------------- */
      var FR = {
        back: { o: [0, 0, Z0 + 0.014], r: [1, 0, 0], u: [0, 1, 0], n: [0, 0, 1] },
        right: { o: [X1 - 0.014, 0, 0], r: [0, 0, 1], u: [0, 1, 0], n: [-1, 0, 0] },
        floor: { o: [0, 0.012, 0], r: [1, 0, 0], u: [0, 0, -1], n: [0, 1, 0] },
        hall: { o: [0, -0.004, 0], r: [1, 0, 0], u: [0, 0, -1], n: [0, 1, 0] }
      };
      function face(x, y, z, yaw, tilt) {                        // a prop's face: +z turned by yaw, leaning back by tilt
        var c = Math.cos(yaw || 0), s = Math.sin(yaw || 0), ct = Math.cos(tilt || 0), st = Math.sin(tilt || 0);
        return { o: [x, y, z], r: [c, 0, -s], u: [-s * st, ct, -c * st], n: [s * ct, st, c * ct] };
      }
      function DecalSet() { this.p = []; this.n = []; this.uv = []; }
      DecalSet.prototype.add = function (R, F, x, y, w, h, rz) {   // h == null: keep the region's aspect
        if (h == null) h = w * R.h / R.w;
        var c = Math.cos(rz || 0), s = Math.sin(rz || 0), C = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]], P = [], k;
        var U = [[R.x / AW, 1 - (R.y + R.h) / AH], [(R.x + R.w) / AW, 1 - (R.y + R.h) / AH], [(R.x + R.w) / AW, 1 - R.y / AH], [R.x / AW, 1 - R.y / AH]];
        for (k = 0; k < 4; k++) {
          var lx = x + C[k][0] * c - C[k][1] * s, ly = y + C[k][0] * s + C[k][1] * c;
          P.push([F.o[0] + F.r[0] * lx + F.u[0] * ly, F.o[1] + F.r[1] * lx + F.u[1] * ly, F.o[2] + F.r[2] * lx + F.u[2] * ly]);
        }
        var T = [0, 1, 2, 0, 2, 3];
        for (k = 0; k < 6; k++) { var q = T[k]; this.p.push(P[q][0], P[q][1], P[q][2]); this.n.push(F.n[0], F.n[1], F.n[2]); this.uv.push(U[q][0], U[q][1]); }
        return this;
      };
      DecalSet.prototype.count = function () { return this.p.length / 3; };
      DecalSet.prototype.build = function () {
        var g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2)); g.computeBoundingSphere();
        return g;
      };
      // An additive light pool (a warm spot on a wall, a cold wash under the tube): a radial-glow quad, tinted.
      function pool(W, F, x, y, w, h, color) {
        var c = new THREE.Color(color), C = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]], UV = [[0, 0], [1, 0], [1, 1], [0, 1]], T = [0, 1, 2, 0, 2, 3];
        for (var k = 0; k < 6; k++) {
          var q = T[k], lx = x + C[q][0], ly = y + C[q][1];
          W.p.push(F.o[0] + F.r[0] * lx + F.u[0] * ly + F.n[0] * 0.01, F.o[1] + F.r[1] * lx + F.u[1] * ly + F.n[1] * 0.01, F.o[2] + F.r[2] * lx + F.u[2] * ly + F.n[2] * 0.01);
          W.n.push(F.n[0], F.n[1], F.n[2]); W.uv.push(UV[q][0], UV[q][1]); W.c.push(c.r, c.g, c.b);
        }
      }
      function buildWash(W) {
        if (!W.p.length) return null;
        var g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(W.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(W.n, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(W.uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(W.c, 3)); g.computeBoundingSphere();
        return g;
      }

      /* ---- the corridor floor (outside the cut walls): painted into the atlas's 512² corner, faded out at the edges ------ */
      var HALL = { x0: -5.3, z0: -3.6, size: 10 };               // world metres covered by the 512 px square
      function paintHall(tier) {
        var R = { x: 0, y: 512, w: 512, h: 512 }, px = 512 / HALL.size, X = function (x) { return R.x + (x - HALL.x0) * px; }, Y = function (z) { return R.y + (z - HALL.z0) * px; };
        var rng = GG.RNG(300 + tier), i, j;
        ag.save(); ag.beginPath(); ag.rect(R.x, R.y, R.w, R.h); ag.clip();
        if (tier === 1) {                                        // VCT tiles, dim + drab (strip-mall corridor, half the tubes out), scuffed
          var T = 0.305 * px;
          ag.fillStyle = '#34322e'; ag.fillRect(R.x, R.y, R.w, R.h);
          for (i = 0; i * T < R.w; i++) for (j = 0; j * T < R.h; j++) {
            var k = (i * 7 + j * 13) % 11;
            ag.fillStyle = k === 0 || k === 5 ? '#484d51' : (i + j) % 2 ? '#66625a' : '#605c55';
            ag.fillRect(R.x + i * T, R.y + j * T, T - 1, T - 1);
          }
          ag.fillStyle = 'rgba(20,18,16,0.22)';
          for (i = 0; i < 60; i++) ag.fillRect(R.x + rng.next() * R.w, Y(2.9) + rng.next() * 2.2 * px, 6 + rng.next() * 30, 1 + rng.next() * 2);
          ag.fillStyle = 'rgba(20,18,16,0.12)'; ag.fillRect(R.x, Y(3.25), R.w, 0.7 * px);                       // the worn path
        } else if (tier === 2) {                                 // the lobby: charcoal carpet tiles (the logo rug sits on it)
          ag.fillStyle = '#2b2c30'; ag.fillRect(R.x, R.y, R.w, R.h);
          var CT = 0.5 * px;
          for (i = 0; i * CT < R.w; i++) for (j = 0; j * CT < R.h; j++) { ag.fillStyle = (i + j) % 2 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.05)'; ag.fillRect(R.x + i * CT, R.y + j * CT, CT - 1, CT - 1); }
          for (i = 0; i < 400; i++) { ag.fillStyle = rng.next() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.12)'; ag.fillRect(R.x + rng.next() * R.w, R.y + rng.next() * R.h, 2, 2); }
        } else {                                                  // sealed concrete: mottled, joints, yellow walkway lines, stencils
          ag.fillStyle = '#6c7075'; ag.fillRect(R.x, R.y, R.w, R.h);
          for (i = 0; i < 90; i++) { ag.fillStyle = 'rgba(' + (rng.next() < 0.5 ? '255,255,255' : '0,0,0') + ',' + (0.03 + rng.next() * 0.05) + ')'; ag.beginPath(); ag.arc(R.x + rng.next() * R.w, R.y + rng.next() * R.h, 8 + rng.next() * 30, 0, Math.PI * 2); ag.fill(); }
          ag.fillStyle = 'rgba(30,32,36,0.6)'; for (i = 0; i < 4; i++) { ag.fillRect(X(-5 + i * 3), R.y, 2, R.h); ag.fillRect(R.x, Y(-3 + i * 3), R.w, 2); }
          ag.fillStyle = '#e0b830'; ag.fillRect(R.x, Y(3.0), R.w, 0.09 * px); ag.fillRect(R.x, Y(4.55), R.w, 0.09 * px); ag.fillRect(X(-2.75), R.y, 0.09 * px, R.h);
          ag.save(); ag.translate(X(-0.9), Y(3.8)); ag.fillStyle = 'rgba(240,236,220,0.85)'; ag.font = font(STENCIL, 0.34 * px); ag.textAlign = 'center'; ag.textBaseline = 'middle';
          ag.fillText('LOADING DOCK →', 0, 0); ag.restore();
          ag.save(); ag.translate(X(-3.6), Y(1.2)); ag.rotate(-Math.PI / 2); ag.fillStyle = 'rgba(224,184,48,0.9)'; ag.font = font(STENCIL, 0.26 * px); ag.textAlign = 'center'; ag.fillText('NO SKATES', 0, 0); ag.restore();
        }
        ag.restore();
        // Fade: fully there around the room, gone a few metres out (the building goes on into the dark). The jam room's corridor
        // fades sooner (it ends at the cut wall across the front).
        ag.save(); ag.beginPath(); ag.rect(R.x, R.y, R.w, R.h); ag.clip(); ag.globalCompositeOperation = 'destination-in';   // (clipped: destination-in clears everything it doesn't cover)
        var cx = X(-0.2), cy = Y(0.8), gr = ag.createRadialGradient(cx, cy, 0, cx, cy, (tier === 1 ? 4.6 : 5.2) * px);
        gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(tier === 1 ? 0.5 : 0.72, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        ag.fillStyle = gr; ag.fillRect(R.x, R.y, R.w, R.h); ag.restore();
        return R;
      }

      /* ---- shared room parts ---------------------------------------------------------------------------------------- */
      function walls(b, color) {
        var x0 = ROOM.x0, x1 = ROOM.x1, z0 = ROOM.z0, z1 = ROOM.z1, w = ROOM.wall, H = ROOM.h;
        b.box(x1 - x0 + w, H, w, (x0 + x1 + w) / 2, H / 2, z0 - w / 2, color);
        b.box(w, H, z1 - z0 + w, x1 + w / 2, H / 2, (z0 - w + z1) / 2, color);
      }
      function caps(b, color, h) {                               // the wall tops (the garage has wooden plates)
        var x0 = ROOM.x0, x1 = ROOM.x1, z0 = ROOM.z0, z1 = ROOM.z1, w = ROOM.wall, H = ROOM.h;
        b.box(x1 - x0 + w + 0.06, h, w + 0.08, (x0 + x1 + w) / 2, H + h / 2, z0 - w / 2, color);
        b.box(w + 0.08, h, z1 - z0 + w, x1 + w / 2, H + h / 2, (z0 - w + z1) / 2, color);
      }
      // The cut: the front and left walls are sectioned off at the floor (a low sill), so the corridor reads as outside.
      function sill(b, color) {
        var x0 = ROOM.x0, x1 = ROOM.x1, z1 = ROOM.z1, w = ROOM.wall;
        b.box(x1 - x0 + w + w, 0.12, w, (x0 - w + x1 + w) / 2, 0.06, z1 + w / 2, color);
        b.box(w, 0.12, ROOM.z1 - ROOM.z0 + w, x0 - w / 2, 0.06, (ROOM.z0 - w + z1) / 2, color);
        b.box(x1 - x0 + w + w, 0.012, w + 0.004, (x0 - w + x1 + w) / 2, 0.125, z1 + w / 2, 0x1a1a1c);
        b.box(w + 0.004, 0.012, ROOM.z1 - ROOM.z0 + w, x0 - w / 2, 0.125, (ROOM.z0 - w + z1) / 2, 0x1a1a1c);
      }
      function frame(b, which) { if (which === 'back') b.at(0, 0, Z0, 0); else b.at(X1, 0, 0, -Math.PI / 2); }
      var WALLS = [['back', ROOM.x1 - ROOM.x0], ['right', ROOM.z1 - ROOM.z0]];
      function blocks(b, y0, y1, mortar) {                       // cinder-block joints in the current wall frame
        for (var w = 0; w < 2; w++) {
          frame(b, WALLS[w][0]); var L = WALLS[w][1], k, i;
          for (var y = y0 + 0.2; y < y1 - 0.02; y += 0.2) b.rect(L, 0.014, 0, y, 0.0105, mortar);
          for (k = 0; y0 + 0.2 * k < y1 - 0.05; k++) for (i = 0; i <= L / 0.4; i++) {
            var x = -L / 2 + 0.4 * i + (k % 2 ? 0.2 : 0);
            if (x > -L / 2 + 0.02 && x < L / 2 - 0.02) b.rect(0.014, Math.min(0.2, y1 - y0 - 0.2 * k), x, y0 + 0.2 * k + Math.min(0.2, y1 - y0 - 0.2 * k) / 2, 0.0105, mortar);
          }
        }
        b.at(0, 0, 0, 0);
      }
      function tiles(b, nx, nz, cols, y, gap) {                  // floor tiles / plank-free grids
        var dx = (ROOM.x1 - ROOM.x0) / nx, dz = (ROOM.z1 - ROOM.z0) / nz, g = gap || 0;
        for (var i = 0; i < nx; i++) for (var j = 0; j < nz; j++) {
          var ax = ROOM.x0 + i * dx + g, az = ROOM.z0 + j * dz + g, bx = ax + dx - 2 * g, bz = az + dz - 2 * g;
          b.quad([ax, y, bz], [bx, y, bz], [bx, y, az], [ax, y, az], cols[(i + j * 3 + ((i * j) % 3)) % cols.length]);
        }
      }
      function blob(b, cx, cz, r, color, seed, y) {
        var rng = GG.RNG(seed), n = 11, pts = [], i;
        for (i = 0; i < n; i++) { var a = i / n * Math.PI * 2, rr = r * (0.55 + 0.55 * rng.next()); pts.push([cx + Math.cos(a) * rr, y, cz + Math.sin(a) * rr * 0.8]); }
        for (i = 0; i < n; i++) b.tri([cx, y, cz], pts[(i + 1) % n], pts[i], color);
      }
      function foamPatch(b, w, h, x, y, z, base, bump) {        // egg-crate foam (little pyramids as boxes), in the current frame
        b.box(w, h, 0.025, x, y, z + 0.012, base);
        var nx = Math.round(w / 0.1), ny = Math.round(h / 0.1);
        for (var i = 0; i < nx; i++) for (var j = 0; j < ny; j++) if ((i + j) % 2 === 0) b.box(0.07, 0.07, 0.04, x - w / 2 + 0.05 + i * 0.1, y - h / 2 + 0.05 + j * 0.1, z + 0.035, bump);
      }
      // Each space's own couch in the garage couch's spot (its footprint is shared): corduroy, leather, black leather.
      function couch(b, t) {
        var S = [null, { base: 0x8a4822, cush: 0x9c5a30, arm: 0x7e4020 }, { base: 0x6e4024, cush: 0x8a5632, arm: 0x643a20 }, { base: 0x1b1b1f, cush: 0x26262c, arm: 0x16161a }][t], i;
        b.at(X1 - 0.42, 0, PROPS.couch.z, -Math.PI / 2);
        b.box(1.54, 0.26, 0.82, 0, t === 3 ? 0.25 : 0.2, 0, S.base);
        for (i = 0; i < 4; i++) b.box(0.06, t === 3 ? 0.12 : 0.08, 0.06, (i % 2 ? 0.7 : -0.7), t === 3 ? 0.06 : 0.04, (i < 2 ? 0.34 : -0.34), t === 3 ? 0xc0c4ca : 0x2a1f16);
        var seatY = t === 3 ? 0.44 : 0.39;
        for (i = -1; i <= 1; i++) { b.box(0.48, 0.14, 0.62, i * 0.49, seatY, 0.06, S.cush); b.box(0.46, 0.38, 0.14, i * 0.49, seatY + 0.28, -0.22, S.cush, -0.12); }
        b.box(1.54, 0.54, 0.2, 0, 0.64, -0.33, S.base);
        if (t === 2) {                                            // rolled chesterfield arms + button tufts
          b.cyl(0.13, 0.13, 0.84, 10, 0.83, 0.58, 0, S.arm, Math.PI / 2); b.cyl(0.13, 0.13, 0.84, 10, -0.83, 0.58, 0, S.arm, Math.PI / 2);
          b.box(0.2, 0.46, 0.84, 0.83, 0.3, 0, S.arm); b.box(0.2, 0.46, 0.84, -0.83, 0.3, 0, S.arm);
          for (i = 0; i < 9; i++) b.box(0.025, 0.025, 0.01, -0.6 + (i % 5) * 0.3 + (i > 4 ? 0.15 : 0), 0.75 + (i > 4 ? 0.12 : 0), -0.225, 0x3a2012);
        } else { b.box(0.18, 0.5, 0.84, 0.83, 0.42, 0, S.arm); b.box(0.18, 0.5, 0.84, -0.83, 0.42, 0, S.arm); }
        if (t === 1) {                                            // duct tape, a hole with the stuffing out, a toque somebody forgot
          b.box(0.44, 0.012, 0.06, -0.49, seatY + 0.075, 0.05, 0xb9bdc4, 0, 0.4); b.box(0.44, 0.012, 0.06, -0.49, seatY + 0.075, 0.18, 0xb9bdc4, 0, -0.3);
          b.box(0.12, 0.012, 0.09, 0.5, seatY + 0.075, 0.1, 0x3a200e); b.box(0.07, 0.04, 0.05, 0.52, seatY + 0.09, 0.1, 0xefe8d8);
          b.box(0.16, 0.1, 0.14, 0.1, seatY + 0.12, 0.12, 0xc0392b); b.box(0.06, 0.05, 0.06, 0.1, seatY + 0.19, 0.12, 0xf2efe6);
        }
        if (t === 3) b.box(0.34, 0.24, 0.1, 0.46, 0.66, -0.1, 0x7a1a24, -0.3, -0.3, 0.2);    // a velvet cushion (Marcel's)
        b.at(0, 0, 0, 0);
      }
      function riserParts(b, t) {                                 // the kit's riser (kit-local frame)
        var R = RISERS[t]; if (!R) return;
        var cz = (R.z0 + R.z1) / 2, d = R.z1 - R.z0, w = 2 * R.x;
        b.at(KIT.x, 0, KIT.z, KIT.yaw);
        if (t === 2) {                                            // black carpet, maple edge
          b.box(w, R.h, d, 0, R.h / 2, cz, 0x1d1d22);
          b.box(w + 0.02, 0.03, 0.04, 0, R.h - 0.012, R.z1, 0xb88a52); b.box(w + 0.02, 0.03, 0.04, 0, R.h - 0.012, R.z0, 0xb88a52);
          b.box(0.04, 0.03, d, R.x, R.h - 0.012, cz, 0xb88a52); b.box(0.04, 0.03, d, -R.x, R.h - 0.012, cz, 0xb88a52);
          b.box(1.2, 0.006, 0.9, 0, R.h + 0.004, -0.1, 0x6a1f2e); b.box(1.1, 0.008, 0.8, 0, R.h + 0.006, -0.1, 0x8a3040);  // a good rug on top
        } else {                                                  // the arena's black deck: silver edge, hazard tape at the front
          b.box(w, R.h, d, 0, R.h / 2, cz, 0x17171a);
          b.box(w + 0.02, 0.04, 0.03, 0, R.h - 0.02, R.z1 + 0.005, 0xb8bcc2);
          for (var i = 0; i < 12; i++) b.box(0.14, 0.05, 0.006, -R.x + 0.09 + i * 0.165, R.h * 0.45, R.z1 + 0.004, i % 2 ? 0xe0b830 : 0x151515, 0, 0, 0.6);
          for (i = -1; i <= 1; i += 2) b.box(0.04, R.h, 0.04, i * (R.x - 0.02), R.h / 2, R.z1 - 0.02, 0x8a8e94);
        }
        b.at(0, 0, 0, 0);
      }
      function riserFront(t) { var R = RISERS[t], p = rotLocal(KIT, 0, R.z1 + 0.012); return face(p.x, 0, p.z, KIT.yaw); }
      // v0.8 SPACES review: the laptop's desk (the laptop itself is the static mesh's, 0.47 up): the jam room still has the
      // cooler, the studio a small walnut side desk, backstage a stencilled flight case.
      function laptopDesk(b, g, t, dl, name) {
        var P = PROPS.cooler, k;
        b.at(P.x, 0, P.z, P.yaw);
        if (t === 1) cooler(b);
        else if (t === 2) {
          var WAL = 0x4a2c18;
          b.box(0.7, 0.035, 0.46, 0, 0.452, 0, WAL); b.box(0.66, 0.1, 0.42, 0, 0.385, 0, 0x3e2414);
          b.box(0.4, 0.07, 0.012, 0, 0.385, 0.214, 0x5a3820); b.box(0.1, 0.015, 0.015, 0, 0.385, 0.225, 0xc9a24a);   // the drawer, a brass pull
          for (k = 0; k < 4; k++) b.box(0.04, 0.34, 0.04, (k % 2 ? 0.3 : -0.3), 0.17, (k < 2 ? 0.18 : -0.18), 0x2e1a0e);
          b.box(0.62, 0.02, 0.38, 0, 0.11, 0, WAL);                                                               // a shelf: tape boxes, headphones
          b.box(0.14, 0.09, 0.1, -0.18, 0.165, 0.02, 0xe8e2d4); b.box(0.14, 0.09, 0.1, -0.02, 0.165, 0.03, 0xd8d0bc);
          b.box(0.16, 0.05, 0.14, 0.18, 0.145, 0.0, 0x1a1a1e); b.cyl(0.05, 0.05, 0.04, 8, 0.13, 0.15, 0.0, 0x2a2a2e, Math.PI / 2);
        } else {
          b.box(0.66, 0.43, 0.44, 0, 0.215, 0, 0x18181b);
          for (k = -1; k <= 1; k += 2) {
            b.box(0.672, 0.03, 0.452, 0, 0.215 + k * 0.2, 0, 0xb8bcc2);                                          // aluminium rims
            b.box(0.03, 0.43, 0.03, k * 0.325, 0.215, 0.215, 0xb8bcc2); b.box(0.03, 0.43, 0.03, k * 0.325, 0.215, -0.215, 0xb8bcc2);
            b.box(0.06, 0.06, 0.06, k * 0.31, 0.4, 0.2, 0xe2e5ea); b.box(0.06, 0.06, 0.06, k * 0.31, 0.03, 0.2, 0xe2e5ea);   // corner caps
            b.box(0.07, 0.05, 0.02, k * 0.18, 0.37, 0.228, 0x9aa0a8);                                             // latches
          }
          b.box(0.14, 0.03, 0.05, 0, 0.3, 0.23, 0x2a2a2e);                                                       // the handle
          if (dl) dl.add(pStencil([name, 'LAPTOP · FRAGILE'], '#f2efe6', 420, 150, 0, 0.8), face(P.x, 0, P.z + 0.232, 0), 0, 0.18, 0.5, null);
        }
        b.at(0, 0, 0, 0);
      }

      function neighbours(band) {
        var bs = GG.content.bands || {}, me = band && band.id, out = [], k;
        var order = ['frost_heave', 'gravel_kings', 'hail_damage', 'grid_road_ramblers'];
        for (k = 0; k < order.length; k++) if (bs[order[k]] && order[k] !== me) out.push(String(bs[order[k]].name).toUpperCase());
        for (k in bs) if (bs[k] && k !== me && order.indexOf(k) < 0) out.push(String(bs[k].name).toUpperCase());
        while (out.length < 3) out.push(['PERMAFROST', 'WIND CHILL', 'THE SNOWBLOWERS'][out.length]);
        cur.neighbours = out.slice(0, 3);
        return out;
      }

      /* ---- the rooms ---------------------------------------------------------------------------------------------------- */
      function door(b, g, tier) {
        var D = SPACE_DOOR, hw = D.w / 2;
        b.at(D.x, 0, Z0, 0); g.at(D.x, 0, Z0, 0);
        var FR2 = [0, 0x3a3e46, 0x22262e, 0x3a4048][tier], COL = [0, 0x8a2626, 0x3b4250, 0x6c7684][tier];
        b.box(0.08, D.h + 0.08, 0.07, hw + 0.04, (D.h + 0.08) / 2, 0.035, FR2); b.box(0.08, D.h + 0.08, 0.07, -hw - 0.04, (D.h + 0.08) / 2, 0.035, FR2);
        b.box(D.w + 0.16, 0.08, 0.07, 0, D.h + 0.04, 0.035, FR2);
        b.box(D.w, D.h, 0.045, 0, D.h / 2, 0.03, COL);
        if (tier === 1) {                                        // a red steel door: wired-glass vision lite, lever, kick plate, closer
          b.box(0.2, 0.46, 0.02, 0.18, 1.5, 0.056, 0x2a2c30); g.box(0.15, 0.4, 0.006, 0.18, 1.5, 0.067, 0xcfe0d8);
          for (var q = 0; q < 4; q++) g.box(0.15, 0.006, 0.004, 0.18, 1.34 + q * 0.1, 0.071, 0x8a9690);
          b.box(0.16, 0.035, 0.06, 0.3, 1.0, 0.085, 0xc0c4ca); b.cyl(0.03, 0.03, 0.05, 8, 0.36, 1.0, 0.07, 0xc0c4ca, Math.PI / 2);
          b.box(D.w - 0.06, 0.26, 0.008, 0, 0.14, 0.056, 0xb9bec6);
          b.box(0.34, 0.06, 0.07, -0.2, D.h - 0.06, 0.09, 0x3a3a3e); b.box(0.3, 0.025, 0.025, -0.08, D.h - 0.11, 0.13, 0x3a3a3e, 0, 0.5);
        } else if (tier === 2) {                                 // padded studio door, a porthole, ON AIR above
          for (var r = 0; r < 4; r++) for (var c = 0; c < 3; c++) b.box(0.26, 0.4, 0.02, -0.29 + c * 0.29, 0.35 + r * 0.46, 0.058, sh(COL, 1.08));
          b.cyl(0.13, 0.13, 0.03, 12, 0, 1.55, 0.066, 0x9aa0a8, Math.PI / 2); g.cyl(0.1, 0.1, 0.01, 12, 0, 1.55, 0.083, 0x2a4a7a, Math.PI / 2);
          b.box(0.06, 0.34, 0.06, 0.34, 1.02, 0.09, 0xb9bec6);
          b.box(0.42, 0.16, 0.08, 0, D.h + 0.22, 0.04, 0x1a1a1e); g.box(0.36, 0.11, 0.01, 0, D.h + 0.22, 0.085, 0xff3030);
          g.box(0.22, 0.025, 0.004, 0, D.h + 0.22, 0.092, 0xffe0d8);
        } else {                                                 // steel door, push bar, kick plate, EXIT above
          b.box(0.72, 0.06, 0.08, 0, 1.0, 0.09, 0xc0c4ca); b.box(0.04, 0.06, 0.08, 0.34, 1.0, 0.07, 0x9aa0a8); b.box(0.04, 0.06, 0.08, -0.34, 1.0, 0.07, 0x9aa0a8);
          b.box(D.w - 0.06, 0.3, 0.01, 0, 0.16, 0.056, 0xb9bec6);
          b.box(0.36, 0.14, 0.06, 0, D.h + 0.24, 0.035, 0xe8e8e0); g.box(0.3, 0.09, 0.01, 0, D.h + 0.24, 0.068, 0x1fbf4a);
          g.box(0.16, 0.022, 0.004, 0, D.h + 0.24, 0.075, 0xeaffea);
        }
        b.at(0, 0, 0, 0); g.at(0, 0, 0, 0);
      }
      // Tier 1: Rent-A-Riff, Jam Space 7. (v0.8 SPACES review: the tube is a wide fixture high in the middle of the back wall, NO
      // DRUMS / AFTER 11 PM is big + condensed under the banner, the stickers are chunky and sit on the door and round the sign,
      // a spray tag right of the door; out front the corridor is dim, fades out, and ends at a low cut wall with the
      // neighbours' doors 6 and 8 and the EXIT; the next band's gear waits in the middle, clear of the merch corner.)
      function jamRoom(b, g, fx, W, dl, dg, band) {
        var H = ROOM.h, WALL = MOODS[1].wall, LOW = 0x46607c, i, k;
        walls(b, WALL);
        for (var w = 0; w < 2; w++) { frame(b, WALLS[w][0]); b.box(WALLS[w][1], 1.0, 0.008, 0, 0.5, 0.004, LOW); b.box(WALLS[w][1], 0.035, 0.012, 0, 1.0, 0.006, 0x2c3e56); b.box(WALLS[w][1], 0.1, 0.016, 0, 0.05, 0.012, 0x1e1f22); }
        blocks(b, 0, 1.0, 0x364c66); blocks(b, 1.0, H, 0x808c98);
        caps(b, 0x6a6e72, 0.1);
        tiles(b, 10, 11, [0x5d6168, 0x666a71, 0x61656c, 0x595d64], 0.005, 0.004);                 // carpet tiles (the gaps read as seams)
        b.box(ROOM.x1 - ROOM.x0, 0.002, ROOM.z1 - ROOM.z0, 0, 0.003, 0, 0x3a3c40);
        [[0.9, -1.25, 0.34, 0x4a4d52, 3], [-0.95, 0.75, 0.26, 0x4c4a44, 4], [1.35, 0.95, 0.3, 0x4f5156, 5], [-0.15, 1.9, 0.22, 0x54473a, 6], [0.45, -0.35, 0.18, 0x3e4046, 7]].forEach(function (p) { blob(b, p[0], p[1], p[2], p[3], p[4], 0.0068); });
        b.cyl(0.07, 0.07, 0.002, 12, 1.2, 0.0072, 1.55, 0x46403a); b.cyl(0.055, 0.055, 0.003, 12, 1.2, 0.0074, 1.55, 0x62666d);   // a coffee ring
        // A grubby rubber-backed rug under the kit, neon spike tape for the stands (nobody moves anything, ever).
        b.at(KIT.x, 0, KIT.z, KIT.yaw);
        b.box(1.95, 0.012, 1.6, 0, 0.009, -0.18, 0x34363c); b.box(1.95, 0.013, 0.05, 0, 0.0095, 0.62, 0x2a2b30);
        [[-0.85, 0.5, 0xff4fa0], [0.85, 0.45, 0x6fe35a], [0.9, -0.8, 0xffe23a], [-0.9, -0.85, 0xff4fa0]].forEach(function (t) { b.box(0.16, 0.004, 0.03, t[0], 0.017, t[1], t[2], 0, 0.78); b.box(0.16, 0.004, 0.03, t[0], 0.017, t[1], t[2], 0, -0.78); });
        b.at(0, 0, 0, 0);
        // Egg-crate foam patches, stapled wherever somebody complained: between the amp and the door, and the orange one (a
        // previous band's) on the right wall.
        frame(b, 'back'); foamPatch(b, 0.44, 0.6, 0.21, 0.95, 0.0, 0x3a3a42, 0x4a4a54);
        frame(b, 'right'); foamPatch(b, 0.4, 0.9, 2.42, 1.55, 0.0, 0x8a4a22, 0xa05a2e);
        b.at(0, 0, 0, 0);
        couch(b, 1);
        laptopDesk(b, g, 1);
        // The buzzing fluorescent: a wide two-tube fixture high in the middle of the back wall (between the Trophies and the
        // Door labels; fixture mesh: it flickers with the light), one tube's end dead, a cold #dff2ff bloom on the block, a cold
        // wash down the wall and over the carpet.
        var TX = -0.4, TY = 2.57;
        frame(b, 'back'); frame(fx, 'back');
        b.box(1.24, 0.08, 0.08, TX, TY, 0.04, 0xd4d6d0); b.box(1.3, 0.025, 0.12, TX, TY - 0.05, 0.06, 0xb8bbb4);
        for (k = -1; k <= 1; k += 2) b.box(0.04, 0.1, 0.14, TX + k * 0.6, TY - 0.03, 0.07, 0xc8cac4);
        fx.box(1.14, 0.045, 0.045, TX, TY - 0.005, 0.1, 0xf6fcff); fx.box(0.82, 0.045, 0.045, TX - 0.16, TY - 0.06, 0.1, 0xe8f6ff);
        b.box(0.32, 0.045, 0.045, TX + 0.41, TY - 0.06, 0.1, 0x5a605c);                                          // the dead end of the second tube
        b.at(0, 0, 0, 0); fx.at(0, 0, 0, 0);
        pool(W, FR.back, TX, TY - 0.08, 2.3, 0.8, 0x6f7a84);                                                     // bloom
        pool(W, FR.back, TX, 1.7, 3.4, 2.6, 0x26303a);
        pool(W, FR.floor, -0.2, 1.4, 4.4, 3.4, 0x18222a);
        // The house PA: one tired speaker on a bracket, high on the right wall.
        b.at(X1 - 0.02, 0, 0.95, -Math.PI / 2 - 0.35);
        b.box(0.06, 0.06, 0.3, 0, 2.32, 0.1, 0x2a2a2e); b.box(0.34, 0.46, 0.28, 0, 2.22, 0.3, 0x1c1c20, 0.3); b.box(0.28, 0.38, 0.01, 0, 2.22, 0.445, 0x2c2c30, 0.3);
        // A stack of plastic chairs in the back corner (every jam space has them).
        b.at(2.08, 0, -2.18, -0.3);
        for (k = 0; k < 4; k++) b.box(0.03, 0.42, 0.03, (k % 2 ? 0.19 : -0.19), 0.21, (k < 2 ? 0.19 : -0.19), 0xe6e4dc);
        for (k = 0; k < 6; k++) { b.box(0.44, 0.035, 0.44, 0, 0.43 + k * 0.055, 0.02 * (k % 2), 0xefede6); b.box(0.44, 0.46, 0.035, 0, 0.7 + k * 0.055, -0.21 + 0.02 * (k % 2), 0xe2e0d8, -0.12); }
        b.at(0, 0, 0, 0);
        obs(tierObs, 2.08, -2.18, 0.52, 0.52, -0.3);
        door(b, g, 1);
        sill(b, 0x3c4a5c);
        // Decals. NO DRUMS / AFTER 11 PM: bold red on white, condensed so the words stay big, under the banner in the one stretch
        // of wall no label covers; a stencilled 7 on the door; other bands' stickers on the door and stuck over the sign's
        // corners; a spray tag right of the door; marker graffiti on the right wall.
        dl.add(pSign(480, 372, '#f7f4ec', '#c0141c', [['NO DRUMS', 118], ['AFTER', 118], ['11 PM', 118]], '#c0141c', 0.6), FR.back, -0.07, 1.68, 1.0, null, 0.01);
        b.box(0.08, 0.05, 0.01, -0.55, 2.05, Z0 + 0.018, 0xb9bdc4); b.box(0.08, 0.05, 0.01, 0.41, 2.06, Z0 + 0.018, 0xb9bdc4);   // duct tape
        dl.add(pStencil(['7'], '#f2efe6', 150, 210, 3), face(0, 0, Z0 + 0.06, 0), SPACE_DOOR.x - 0.12, 1.36, 0.3, null);
        // v0.9 (Q8): the neighbours' stickers are the OTHER playable bands (your own band is the red one), Hail Damage included.
        var NB = neighbours(band);
        var ST = [['SLOUGH MONSTER', '#1a1a1a', '#e8d83a', 'box'], [NB[0], '#2f6fd1', '#ffffff', 'pill'], ['TOQUE MAFIA', '#c0392b', '#ffffff', 'circle'], ['GOPHER HOLE', '#f28c28', '#1a1a1a', 'box'],
          [String((band && band.name) || 'Hail Damage').toUpperCase(), '#1a1414', '#d8263a', 'box'], ['PERMAFROST', '#e8f4ff', '#2a4a7a', 'pill'], ['WIND CHILL', '#6fe39a', '#1a1a1a', 'circle'], ['THE SNOWBLOWERS', '#9b6bff', '#ffffff', 'pill']];
        // [x, y, rotation, where: 1 = the door, 2 = over the sign, 0 = the wall]
        var SP = [[0.74, 0.86, 0.14, 1], [1.24, 0.98, -0.12, 1], [0.8, 0.52, -0.18, 1], [1.2, 0.58, 0.2, 1], [1.02, 1.86, 0.06, 1],
          [0.37, 1.35, -0.22, 2], [-0.5, 1.34, 0.18, 2], [1.72, 1.02, -0.1, 0]];
        var DOORF = face(0, 0, Z0 + 0.061, 0), OVER = face(0, 0, Z0 + 0.022, 0);
        for (i = 0; i < ST.length; i++) {
          var s = ST[i], p = SP[i];
          dl.add(pSticker(s[0], s[1], s[2], s[3]), p[3] === 1 ? DOORF : p[3] === 2 ? OVER : FR.back, p[0], p[1], s[3] === 'circle' ? 0.2 : 0.27, null, p[2]);
        }
        var tw = NB[1].replace(/^THE\s+/, '').split(' '), th = Math.ceil(tw.length / 2);
        dl.add(pTag(tw.length > 1 ? [tw.slice(0, th).join(' '), tw.slice(th).join(' ')] : [tw[0]], '#ff4fa0', 440, 300, 21), FR.back, 1.92, 1.5, 0.76, null, 0.05);
        var GR = [['GARY TUNE YOUR GUITAR', '#1a1a1a', FR.back, -1.55, 0.52, 0.03, 0.75], ['SLOUGH MONSTER WAS HERE 2019', '#1a1a1a', FR.right, -0.1, 2.3, -0.03, 0.8],
          ['rip the good mic stand', '#3a3a3a', FR.right, 1.1, 2.35, 0.04, 0.6], ['Brenda ♥ whoever plays bass', '#b3141c', FR.right, 0.25, 0.62, 0.03, 0.62],
          ['no perogies in the PA  -mgmt', '#2a4a8a', FR.back, 1.92, 1.95, 0.02, 0.62]];
        for (i = 0; i < GR.length; i++) { var gq = GR[i]; dl.add(pMarker(gq[0], gq[1], 34, 470), gq[2], gq[3], gq[4], gq[6], null, gq[5]); }
        // The corridor out front, left to right (the merch corner stays clear): WET FLOOR (bilingual), the next band's gear
        // waiting, the mop bucket, lost + found.
        b.at(-0.62, 0, 3.3, 0.25);                                                                              // the WET FLOOR A-frame
        b.box(0.34, 0.62, 0.02, 0, 0.31, 0.09, 0xf2c21a, -0.28); b.box(0.34, 0.62, 0.02, 0, 0.31, -0.09, 0xf2c21a, 0.28);
        dl.add(pSign(200, 330, '#f2c21a', '#1a1a1a', [['⚠', 90], ['CAUTION', 40], ['WET FLOOR', 36], ['ATTENTION', 30], ['PLANCHER', 28], ['MOUILLÉ', 28]]), face(-0.62 + 0.1 * Math.sin(0.25), 0.31, 3.3 + 0.1 * Math.cos(0.25), 0.25, 0.28), 0, 0, 0.3, 0.5);
        b.at(0.2, 0, 3.36, 0.1);                                                                                // SLOUGH MONSTER's amp, kick case, cymbal bag
        b.box(0.62, 0.62, 0.42, 0, 0.31, 0, 0x1c1c1f); b.box(0.54, 0.5, 0.01, 0, 0.33, 0.215, 0x2e2e32);
        b.box(0.62, 0.22, 0.34, 0, 0.73, -0.02, 0x222226); b.box(0.5, 0.04, 0.01, 0, 0.75, 0.155, 0xc9a24a);
        b.cyl(0.3, 0.3, 0.44, 14, 0.66, 0.31, 0.02, 0x1a1a1e, 0, 0, Math.PI / 2); b.cyl(0.24, 0.24, 0.45, 14, 0.66, 0.31, 0.02, 0x2a2a2e, 0, 0, Math.PI / 2);
        b.cyl(0.27, 0.27, 0.05, 12, 0.02, 0.87, 0.04, 0x3a2a4a, 0.2, 0, 0.1);                                  // the cymbal bag, on top
        dl.add(pStencil(['SLOUGH MONSTER'], '#e8d83a', 360, 70), face(0.2 + 0.226 * Math.sin(0.1), 0, 3.36 + 0.226 * Math.cos(0.1), 0.1), 0, 0.33, 0.46, null);
        b.at(1.08, 0, 3.42, -0.2);
        b.cyl(0.2, 0.17, 0.32, 12, 0, 0.16, 0, 0xf2c21a); b.box(0.28, 0.2, 0.2, 0.3, 0.2, 0, 0xd8a818); b.box(0.025, 1.25, 0.025, -0.02, 0.8, 0.04, 0x9a7a4a, 0.12, 0, 0.1);
        b.at(1.78, 0, 3.28, -0.35);                                                                             // lost + found: a drumstick, a toque
        b.box(0.46, 0.34, 0.36, 0, 0.17, 0, 0xb08856); b.box(0.46, 0.012, 0.16, 0, 0.345, 0.24, 0xa07a4a, 0.8); b.box(0.02, 0.4, 0.02, 0.1, 0.42, 0.02, 0xd8b27a, 0.2, 0, 0.3);
        b.box(0.18, 0.1, 0.16, -0.1, 0.39, -0.04, 0x2f6fd1); b.box(0.06, 0.05, 0.06, -0.1, 0.46, -0.04, 0xf2efe6);
        dl.add(pMarker('LOST + FOUND', '#1a1a1a', 40, 300), face(1.78 - 0.19 * Math.sin(0.35), 0, 3.28 + 0.19 * Math.cos(0.35), -0.35), 0, 0.2, 0.4, null);
        b.at(0, 0, 0, 0);
        // The corridor's far side, cut low like the room's own walls: painted block, the neighbours' steel doors (Jam Space 6
        // and 8; the diorama shows them on the face we see), a lit EXIT between them.
        var CZ = 4.72, CH = 1.12, CX0 = -1.15, CX1 = 3.1, CW = CX1 - CX0, CC = (CX0 + CX1) / 2, FZ = CZ + 0.08;
        b.box(CW, CH, 0.16, CC, CH / 2, CZ, WALL); b.box(CW, 0.62, 0.006, CC, 0.31, FZ + 0.003, LOW); b.box(CW, 0.03, 0.01, CC, 0.62, FZ + 0.006, 0x2c3e56);
        b.box(CW + 0.004, 0.012, 0.164, CC, CH + 0.006, CZ, 0x1a1a1c);                                          // the cut
        b.box(0.16, CH, 0.16, CX0 + 0.08, CH / 2, CZ, 0x3c4a5c);
        [[-0.25, '6'], [1.75, '8']].forEach(function (d) {
          b.box(0.98, CH - 0.02, 0.03, d[0], (CH - 0.02) / 2, FZ + 0.01, 0x3a3e46);                              // frame
          b.box(0.86, CH - 0.03, 0.03, d[0], (CH - 0.03) / 2, FZ + 0.025, 0x5c6f84);                             // the steel door (cut at the section)
          b.box(0.8, 0.22, 0.008, d[0], 0.13, FZ + 0.043, 0xb9bec6);                                             // kick plate
          b.box(0.15, 0.035, 0.06, d[0] + 0.28, 0.98, FZ + 0.07, 0xc0c4ca);                                      // lever
          dl.add(pSign(150, 150, '#eceae2', '#1a1a1a', [[d[1], 130]]), face(d[0] - 0.12, 0, FZ + 0.042, 0), 0, 0.78, 0.2, 0.2);
        });
        dl.add(pSticker(NB[2] || NB[0], '#2f6fd1', '#ffffff', 'pill'), face(-0.25, 0, FZ + 0.043, 0), 0.2, 0.5, 0.26, null, -0.2);
        b.box(0.5, 0.2, 0.06, 0.75, 0.84, FZ + 0.02, 0xe8e8e0); g.box(0.44, 0.15, 0.01, 0.75, 0.84, FZ + 0.056, 0x1fbf4a);   // EXIT
        dg.add(pSign(300, 100, '#1fbf4a', '#eaffea', [['EXIT → SORTIE', 80]], null, 0.8), face(0.75, 0, FZ + 0.062, 0), 0, 0.84, 0.42, 0.14);
        cur.hallProps = 5; cur.signText = 'NO DRUMS / AFTER 11 PM';
      }
      // Tier 2: Prairie Dog Sound. (v0.8 SPACES review: the treatment reads now: bevelled fabric panels in a charcoal / slate /
      // burgundy rhythm with the dark wall in the gaps, a stepped skyline diffuser in pale wood where a track light hits it, the
      // house gold record on walnut with a brass plate; the control-room window is a deep reveal (sill, jamb, mullion, a glare
      // streak) onto a dim blue-grey room with the console glowing just over the sill and Gwen's silhouette; pale oak planks with
      // thin seams, warm (not orange) light; the lobby is charcoal carpet, the organ + Leslie stand right of the logo rug.)
      function studioRoom(b, g, fx, W, dl, dg, band) {
        var H = ROOM.h, WALL = MOODS[2].wall, i, k;
        var WX = -0.12, WY = 1.72, WW = 0.96, WH = 1.14, WD = 0.22, WOOD = 0x3a2616;   // the window: between the Trophies label and the door
        walls(b, WALL);
        // Fabric panels: a darker rim + a lighter face (the bevel), 5 cm gaps; thin on the back wall (the band's trophies hang
        // over them), deeper on the right wall (over the band poster: no bedsheets or posters at Prairie Dog Sound).
        var PANEL = [0x474b55, 0x58697c, 0x76323f, 0x4f535d, 0x5e6c7c, 0x6c2e3a], holes = {
          back: [[WX - WW / 2 - 0.2, WX + WW / 2 + 0.12, 0.98, 2.46], [0.42, 1.58, 0, 2.5], [1.56, 2.3, 0.9, 2.45], [-2.3, 2.3, 2.34, 2.7]],
          right: [[-1.72, -0.58, 0.95, 1.82], [-0.42, 1.22, 0.86, 1.94], [-2.48, -1.92, 1.18, 1.84], [-0.52, -0.38, 0.28, 0.42], [-2.7, 2.7, 2.34, 2.7]] };
        for (var w = 0; w < 2; w++) {
          frame(b, WALLS[w][0]); var L = WALLS[w][1], hs = holes[WALLS[w][0]], n = Math.floor(L / 0.6), dep = w ? 0.03 : 0.01;
          for (i = 0; i < n; i++) for (k = 0; k < 3; k++) {
            var px0 = -L / 2 + 0.05 + i * (L - 0.1) / n, px1 = px0 + (L - 0.1) / n - 0.05, py0 = 0.14 + k * 0.74, py1 = py0 + 0.69;
            var hit = hs.some(function (h) { return px1 > h[0] && px0 < h[1] && py1 > h[2] && py0 < h[3]; });
            if (hit) continue;
            var pc = PANEL[(i * 2 + k * 3 + w) % PANEL.length];
            b.box(px1 - px0, py1 - py0, dep, (px0 + px1) / 2, (py0 + py1) / 2, dep / 2, sh(pc, 0.62));
            b.box(px1 - px0 - 0.06, py1 - py0 - 0.06, 0.006, (px0 + px1) / 2, (py0 + py1) / 2, dep + 0.003, pc);
          }
          b.box(L, 0.16, 0.14, 0, H - 0.1, 0.07, 0x7a5a36);                                                  // the co-op's timber beam
          b.box(L, 0.08, 0.014, 0, 0.04, 0.007, 0x4a3420);
        }
        b.at(0, 0, 0, 0);
        b.box(0.14, H, 0.14, X1 - 0.07, H / 2, Z0 + 0.07, 0x7a5a36);                                          // corner post
        // The skyline diffuser (4 x 4 pale blocks at stepped depths) right of the door, where the last track light hits it.
        frame(b, 'back'); var DX = 1.93, DY = 2.02, SKY = [3, 1, 4, 2, 0, 3, 1, 4, 2, 4, 0, 1, 4, 2, 3, 0];
        b.box(0.7, 0.7, 0.03, DX, DY, 0.015, 0x4a3420);
        for (i = 0; i < 4; i++) for (k = 0; k < 4; k++) { var dd = 0.035 + SKY[i * 4 + k] * 0.04; b.box(0.15, 0.15, dd, DX - 0.24 + i * 0.16, DY - 0.24 + k * 0.16, 0.03 + dd / 2, [0xe2c498, 0xcfae80, 0xd9ba8c, 0xc4a070][(i + k * 3) % 4]); }
        // The house gold record ('Curling Night in Canada', 1987): walnut, a gold disc with its grooves and label, a brass plate.
        var RX = 1.93, RY = 1.31;
        b.box(0.54, 0.64, 0.04, RX, RY, 0.02, 0x3a2414); b.box(0.48, 0.58, 0.006, RX, RY, 0.043, 0x1e120a);
        b.cyl(0.19, 0.19, 0.01, 24, RX, RY + 0.05, 0.05, 0xd4af37, Math.PI / 2); b.cyl(0.155, 0.155, 0.004, 24, RX, RY + 0.05, 0.056, 0xa8862a, Math.PI / 2);
        b.cyl(0.14, 0.14, 0.006, 24, RX, RY + 0.05, 0.057, 0xd4af37, Math.PI / 2); b.cyl(0.075, 0.075, 0.004, 20, RX, RY + 0.05, 0.061, 0xa8862a, Math.PI / 2);
        b.cyl(0.058, 0.058, 0.008, 16, RX, RY + 0.05, 0.063, 0xb3141c, Math.PI / 2); b.cyl(0.012, 0.012, 0.01, 8, RX, RY + 0.05, 0.066, 0x1a1a1a, Math.PI / 2);
        b.box(0.36, 0.075, 0.012, RX, RY - 0.23, 0.05, 0xc49a40); b.box(0.28, 0.012, 0.004, RX, RY - 0.215, 0.058, 0x5a4214); b.box(0.2, 0.01, 0.004, RX, RY - 0.24, 0.058, 0x5a4214);
        b.at(0, 0, 0, 0);
        dl.add(pSign(300, 90, '#c49a40', '#2a1c08', [['CURLING NIGHT IN CANADA', 30, STENCIL], ['GOLD · ' + PAINT.studio + ' · 1987', 24, STENCIL, '#4a3410']]), face(0, 0, Z0 + 0.057, 0), RX, RY - 0.23, 0.34, null);
        // The control-room window: a deep reveal (the sill and the right jamb catch the light, the head hides the top of the view),
        // a mullion, one glare streak; the dim room behind the glass (its console glows just over the sill).
        frame(b, 'back'); frame(g, 'back');
        b.box(WW + 0.2, 0.09, WD, WX, WY + WH / 2 + 0.045, WD / 2, WOOD);                                    // head
        b.box(WW + 0.26, 0.06, WD + 0.08, WX, WY - WH / 2 - 0.03, (WD + 0.08) / 2, WOOD); b.box(WW + 0.02, 0.012, WD + 0.02, WX, WY - WH / 2 + 0.006, (WD + 0.02) / 2 + 0.01, 0x8a6a44);   // sill, its lit top
        b.box(0.08, WH, WD, WX - WW / 2 - 0.04, WY, WD / 2, WOOD); b.box(0.08, WH, WD, WX + WW / 2 + 0.04, WY, WD / 2, WOOD);   // jambs
        b.box(0.004, WH - 0.02, WD - 0.02, WX + WW / 2 - 0.002, WY, WD / 2, 0x6a4a2c);                       // the right jamb's inside face
        b.box(0.05, WH, 0.05, WX + 0.08, WY, 0.1, WOOD);                                                      // the mullion (two panes)
        g.box(0.045, 0.95, 0.004, WX - 0.22, WY + 0.04, 0.06, 0x5a6878, 0, 0, 0.62);                          // glare on the glass
        g.box(0.018, 0.7, 0.004, WX - 0.12, WY - 0.02, 0.06, 0x445260, 0, 0, 0.62);
        b.box(0.2, 0.05, 0.05, WX + 0.32, WY - WH / 2 + 0.035, WD - 0.02, 0x2a2a2e); b.box(0.02, 0.12, 0.02, WX + 0.36, WY - WH / 2 + 0.1, WD - 0.02, 0x2a2a2e);   // the talkback mic
        b.at(0, 0, 0, 0); g.at(0, 0, 0, 0);
        dg.add(paintControlRoom(), FR.back, WX, WY, WW, WH);
        // Track lights on the beams, warm (not orange) pools on the walls under them.
        var TB = [-1.95, -1.15, 0.62, 1.95], TR = [-2.1, -0.15, 1.75];
        for (i = 0; i < TB.length; i++) {                                                                     // a can on an arm off the beam, aimed at the wall
          b.box(0.025, 0.025, 0.2, TB[i], H - 0.2, Z0 + 0.22, 0x151518); b.box(0.025, 0.1, 0.025, TB[i], H - 0.26, Z0 + 0.3, 0x151518);
          b.cyl(0.055, 0.045, 0.15, 10, TB[i], H - 0.34, Z0 + 0.3, 0x151518, 0.6);
          fx.cyl(0.042, 0.042, 0.01, 10, TB[i], H - 0.405, Z0 + 0.255, 0xffe8c0, 0.6);
          pool(W, FR.back, TB[i], i === 3 ? 1.75 : H - 1.0, 1.2, 1.6, i === 3 ? 0x4a4234 : 0x3a3228);
        }
        for (i = 0; i < TR.length; i++) {
          b.box(0.2, 0.025, 0.025, X1 - 0.22, H - 0.2, TR[i], 0x151518); b.box(0.025, 0.1, 0.025, X1 - 0.3, H - 0.26, TR[i], 0x151518);
          b.cyl(0.055, 0.045, 0.15, 10, X1 - 0.3, H - 0.34, TR[i], 0x151518, 0, 0, 0.6);
          fx.cyl(0.042, 0.042, 0.01, 10, X1 - 0.255, H - 0.405, TR[i], 0xffe8c0, 0, 0, 0.6);
          pool(W, FR.right, TR[i], H - 1.0, 1.3, 1.6, 0x322a20);
        }
        pool(W, FR.back, WX, WY - 0.1, 2.0, 1.8, 0x16222e);                                                    // the control room's blue spill
        // The floor: pale oak planks, thin low-contrast seams.
        b.box(ROOM.x1 - ROOM.x0, 0.004, ROOM.z1 - ROOM.z0, 0, 0.004, 0, 0x7c664e);
        var rng = GG.RNG(222), PC = [0xb09474, 0xa88c6c, 0xb89c7a, 0xa48868, 0xae9270];
        for (var z = ROOM.z0; z < ROOM.z1 - 0.01; z += 0.2) {
          var x = ROOM.x0 - rng.next() * 0.9;
          while (x < ROOM.x1) { var len = 0.9 + rng.next() * 0.9, ax = Math.max(ROOM.x0, x) + 0.003, bx2 = Math.min(ROOM.x1, x + len) - 0.003; if (bx2 > ax) b.quad([ax, 0.0065, z + 0.197], [bx2, 0.0065, z + 0.197], [bx2, 0.0065, z + 0.003], [ax, 0.0065, z + 0.003], PC[Math.floor(rng.next() * PC.length)]); x += len; }
        }
        riserParts(b, 2);
        dl.add(pStencil([PAINT.studio], '#b88a52', 420, 60), riserFront(2), 0, 0.08, 0.7, 0.1);
        // The gear rack under the gig board: two towers of outboard, LEDs lit, a small submixer on top.
        b.at(X1 - 0.28, 0, -1.2, -Math.PI / 2); g.at(X1 - 0.28, 0, -1.2, -Math.PI / 2);
        for (k = -1; k <= 1; k += 2) {
          b.box(0.54, 0.86, 0.46, k * 0.29, 0.43, 0, 0x1a1a1e);
          for (i = 0; i < 5; i++) {
            var uy = 0.14 + i * 0.15, face2 = [0x2c2c32, 0x8a8c90, 0x3a3a42, 0x6a5a3a, 0x2c2c32][(i + (k > 0 ? 2 : 0)) % 5];
            b.box(0.48, 0.12, 0.012, k * 0.29, uy, 0.232, face2);
            for (var kn = 0; kn < 4; kn++) b.cyl(0.014, 0.014, 0.02, 6, k * 0.29 - 0.15 + kn * 0.07, uy, 0.245, 0x111111, Math.PI / 2);
            g.box(0.06, 0.018, 0.004, k * 0.29 + 0.16, uy + 0.02, 0.24, [0x6fe39a, 0xffb040, 0xff4a3a, 0x6ab8ff][(i + k + 4) % 4]);
          }
        }
        b.box(0.9, 0.06, 0.4, 0, 0.9, 0, 0x2a2a30, 0.2); for (i = 0; i < 8; i++) g.box(0.02, 0.008, 0.06, -0.3 + i * 0.085, 0.94, 0.02, [0x6fe39a, 0xffd23f, 0xff6b4a][i % 3], 0.2);
        b.at(0, 0, 0, 0); g.at(0, 0, 0, 0);
        obs(tierObs, X1 - 0.28, -1.2, 1.16, 0.5, -Math.PI / 2);
        b.at(0.28, 0, -2.2, 0.4);                                                                               // a mic on a boom stand
        for (k = 0; k < 3; k++) b.box(0.3, 0.02, 0.02, 0, 0.02, 0, 0x222226, 0, k * 2.1, 0);
        b.box(0.025, 1.45, 0.025, 0, 0.74, 0, 0x2a2a2e); b.box(0.6, 0.02, 0.02, 0.22, 1.45, 0, 0x2a2a2e, 0, 0, 0.25);
        b.cyl(0.035, 0.03, 0.12, 8, 0.5, 1.53, 0, 0x55595f, 0, 0, -0.9);
        b.at(0, 0, 0, 0);
        couch(b, 2);
        laptopDesk(b, g, 2);
        door(b, g, 2);
        sill(b, 0x2a1c12);
        // The lobby out front, on charcoal carpet: the logo rug in the middle, the house organ + its Leslie right of it, a fern.
        b.at(0.8, 0, 4.3, -0.3);
        b.box(1.1, 0.82, 0.52, 0, 0.41, 0, 0x5a3218); b.box(1.14, 0.05, 0.56, 0, 0.84, 0, 0x4a2812);
        b.box(0.96, 0.05, 0.2, 0, 0.9, 0.12, 0xf2efe6); b.box(0.96, 0.05, 0.18, 0, 0.98, 0.02, 0xf2efe6); for (i = 0; i < 12; i++) b.box(0.035, 0.03, 0.1, -0.44 + i * 0.08, 0.93, 0.09, 0x151515);
        b.box(1.0, 0.36, 0.05, 0, 1.2, -0.2, 0x5a3218); for (i = 0; i < 9; i++) b.box(0.03, 0.06, 0.03, -0.3 + i * 0.075, 1.05, -0.12, [0x8a3a2a, 0xe8e2d4, 0x1a1a1a][i % 3]);
        b.box(0.5, 0.95, 0.46, 0.95, 0.475, 0.05, 0x6a3a1c); b.box(0.4, 0.24, 0.01, 0.95, 0.75, 0.285, 0x2a1a10);
        b.at(-1.3, 0, 4.3, 0);
        b.cyl(0.2, 0.15, 0.34, 10, 0, 0.17, 0, 0xb8603a); b.shape(new THREE.IcosahedronGeometry(1, 0), 0, 0.62, 0, 0.42, 0.38, 0.42, 0x3f7a3a); b.shape(new THREE.IcosahedronGeometry(1, 0), 0.1, 0.9, 0.05, 0.26, 0.26, 0.26, 0x4f8a44);
        b.at(0, 0, 0, 0);
        b.cyl(0.78, 0.78, 0.01, 24, -0.45, 0.004, 3.62, 0x6a1f2e); b.cyl(0.7, 0.7, 0.012, 24, -0.45, 0.005, 3.62, 0x8a3040);
        var logo = paintRugLogo();
        dl.add(logo, FR.floor, -0.45, -3.62, 1.2, 1.2); dl.add(logo, face(SPACE_DOOR.x, 0, Z0 + 0.074, 0), 0, 0.98, 0.36, 0.36);   // the rug, and the logo on the door
        cur.hallProps = 4; var sw = PAINT.studio.split(' '), sh2 = Math.max(1, sw.length - 1); cur.signText = sw.slice(0, sh2).join(' ') + ' / ' + sw.slice(sh2).join(' ') + ' · EST. 1961';
      }
      // Tier 3: backstage at the Potash Place. (v0.8 SPACES review: BAND ROOM stencilled in the one stretch of wall no label
      // covers, the band's name big on a placard on their door; the arena monitor is bigger, brighter, on an arm angled at the
      // camera; out front the forklift carries a shrink-wrapped pallet, the band's drum case sits beside the cable ramps.)
      function backstageRoom(b, g, fx, W, dl, dg, band, green, catering) {
        var H = ROOM.h, LOW = green ? 0x4e8a4a : MOODS[3].wall, STRIPE = green ? 0x9ad07a : 0xd8a830, TOP = green ? 0x86b87a : 0x8d8e89, i, k;
        walls(b, TOP);
        for (var w = 0; w < 2; w++) {
          frame(b, WALLS[w][0]); var L = WALLS[w][1];
          b.box(L, 1.15, 0.008, 0, 0.575, 0.004, LOW); b.box(L, 0.14, 0.012, 0, 1.22, 0.006, STRIPE);
          for (i = 0; i < L / 0.6; i++) for (k = 0; k < 3; k++) b.cyl(0.018, 0.018, 0.006, 6, -L / 2 + 0.3 + i * 0.6, 1.62 + k * 0.4, 0.003, sh(TOP, 0.6), Math.PI / 2);   // form-tie holes
          for (k = 0; k < 3; k++) b.rect(L, 0.008, 0, 1.45 + k * 0.4, 0.0095, sh(TOP, 0.88));                                                              // board-form lines
          b.box(L, 0.1, 0.014, 0, 0.05, 0.012, 0x1a1c20);
        }
        b.at(0, 0, 0, 0);
        blocks(b, 0, 1.15, sh(LOW, 0.72));
        caps(b, 0x3a3e44, 0.12);
        for (w = 0; w < 2; w++) { frame(b, WALLS[w][0]); b.box(WALLS[w][1], 0.03, 0.2, 0, H - 0.1, 0.1, 0x2e3238); b.box(WALLS[w][1], 0.08, 0.03, 0, H - 0.1, 0.2, 0x2e3238); }   // the cable tray
        b.at(0, 0, 0, 0);
        b.box(ROOM.x1 - ROOM.x0 - 0.4, 0.035, 0.05, 0, H - 0.07, Z0 + 0.12, 0x1c1c20); b.box(ROOM.x1 - ROOM.x0 - 0.6, 0.03, 0.04, 0.1, H - 0.07, Z0 + 0.16, 0x7a2a2a);
        tiles(b, 8, 9, [0x686c72, 0x6e7278, 0x646870, 0x6a6e74], 0.005, 0.003);                                  // sealed concrete slabs
        b.box(ROOM.x1 - ROOM.x0, 0.002, ROOM.z1 - ROOM.z0, 0, 0.003, 0, 0x3e4046);
        b.box(ROOM.x1 - ROOM.x0 - 0.3, 0.002, 0.06, (ROOM.x0 + ROOM.x1) / 2 - 0.15, 0.0072, Z0 + 0.35, 0xe0b830);   // safety stripes
        b.box(0.06, 0.002, ROOM.z1 - ROOM.z0 - 0.35, X1 - 0.35, 0.0072, 0.18, 0xe0b830);
        b.box(0.05, 0.003, 2.6, -1.35, 0.0075, 1.2, 0x151515, 0, 0.12); b.box(1.8, 0.003, 0.05, 0.4, 0.0075, -1.95, 0x151515);                 // gaffer-taped cable runs
        riserParts(b, 3);
        dl.add(pStencil([PAINT.arena], '#d8dce2', 360, 60), riserFront(3), 0, 0.06, 0.6, 0.1);
        // BAND ROOM stencilled on the concrete between the Trophies and Door labels, an arrow at the door; the band's name big on
        // a placard on the door itself.
        var name = String((band && band.name) || 'Hail Damage').toUpperCase(), words = name.split(' '), half = Math.ceil(words.length / 2);
        var nl = words.length > 1 ? [words.slice(0, half).join(' '), words.slice(half).join(' ')] : [name];
        dl.add(pStencil(['BAND ROOM →'], green ? '#f4fff0' : '#16223a', 640, 150, 7, 0.72), FR.back, -0.08, 1.93, 1.0, null);
        b.box(0.8, 0.66, 0.012, SPACE_DOOR.x, 1.4, Z0 + 0.062, 0xf4f1e8);                                     // the placard, taped to the door
        for (k = -1; k <= 1; k += 2) { b.box(0.1, 0.05, 0.008, SPACE_DOOR.x + k * 0.38, 1.72, Z0 + 0.07, 0xb9bdc4, 0, 0, k * 0.5); b.box(0.1, 0.05, 0.008, SPACE_DOOR.x + k * 0.38, 1.08, Z0 + 0.07, 0xb9bdc4, 0, 0, -k * 0.5); }
        dl.add(pStencil(nl, '#141414', 400, nl.length > 1 ? 300 : 170, 0, 0.66), face(SPACE_DOOR.x, 0, Z0 + 0.07, 0), 0, 1.42, 0.74, null);
        cur.signText = 'BAND ROOM / ' + name;
        // Road cases (stencilled) in the corner; above them, on an arm, the monitor showing the empty arena, turned to us.
        b.at(2.0, 0, -2.32, 0);
        [[0, 0.25, 0, 0.56, 0.5, 0.46], [0, 0.72, 0.02, 0.5, 0.44, 0.42]].forEach(function (c) {
          b.box(c[3], c[4], c[5], c[0], c[1], c[2], 0x1c1c20);
          b.box(c[3] + 0.012, 0.03, c[5] + 0.012, c[0], c[1] - c[4] / 2 + 0.02, c[2], 0xb8bcc2); b.box(c[3] + 0.012, 0.03, c[5] + 0.012, c[0], c[1] + c[4] / 2 - 0.02, c[2], 0xb8bcc2);
          for (var q = -1; q <= 1; q += 2) b.box(0.04, c[4] - 0.02, 0.04, q * (c[3] / 2 - 0.01), c[1], c[2] + c[5] / 2 - 0.01, 0x9aa0a8);
        });
        b.at(0, 0, 0, 0);
        obs(tierObs, 2.0, -2.32, 0.56, 0.46, 0);
        dl.add(pStencil([name], '#f2efe6', 360, 60), face(2.0, 0, -2.32 + 0.235, 0), 0, 0.3, 0.42, 0.07);
        dl.add(pStencil(['DRUMS · FRAGILE'], '#e0b830', 360, 60), face(2.0, 0, -2.32 + 0.235, 0), 0, 0.76, 0.4, 0.066);
        var MX = 1.84, MY = 1.52, MZ = Z0 + 0.3, MYAW = -0.36, MW = 0.9, MH = 0.54;
        b.box(0.08, 0.08, 0.2, MX + 0.12, MY, Z0 + 0.1, 0x2a2a2e); b.box(0.16, 0.16, 0.02, MX + 0.12, MY, Z0 + 0.01, 0x2a2a2e);   // the arm
        b.at(MX, 0, MZ, MYAW);
        b.box(MW + 0.06, MH + 0.06, 0.06, 0, MY, -0.03, 0x0e0e11); b.box(0.2, 0.04, 0.012, 0, MY - MH / 2 - 0.012, 0.004, 0x2a2a2e);
        b.at(0, 0, 0, 0);
        var ms = Math.sin(MYAW), mc = Math.cos(MYAW);
        dg.add(paintArena(), face(MX + ms * 0.004, 0, MZ + mc * 0.004, MYAW), 0, MY, MW, MH);
        pool(W, FR.back, 1.9, 1.5, 1.5, 1.1, 0x1c3052);
        // Caged work lights; the catering table (sad, unless the hot catering came).
        [[-1.95, 'back'], [0.62, 'back'], [0.9, 'right']].forEach(function (L2) {
          frame(b, L2[1]); frame(fx, L2[1]);
          b.box(0.22, 0.14, 0.06, L2[0], H - 0.25, 0.03, 0x2a2e34); fx.box(0.17, 0.09, 0.04, L2[0], H - 0.25, 0.07, 0xf4f8ff);
          for (var q = 0; q < 3; q++) b.box(0.012, 0.13, 0.012, L2[0] - 0.07 + q * 0.07, H - 0.25, 0.095, 0x1a1a1e);
          pool(W, FR[L2[1]], L2[0], H - 0.9, 1.3, 1.7, 0x2a3040);
        });
        b.at(0, 0, 0, 0); fx.at(0, 0, 0, 0);
        if (!catering) {
          b.at(X1 - 0.3, 0, -1.2, -Math.PI / 2);
          b.box(1.0, 0.04, 0.5, 0, 0.74, 0, 0xf2efe6); b.box(1.0, 0.36, 0.01, 0, 0.56, 0.25, 0xf2efe6);
          for (k = 0; k < 4; k++) b.box(0.03, 0.72, 0.03, (k % 2 ? 0.45 : -0.45), 0.36, (k < 2 ? 0.2 : -0.2), 0x6a6a6a);
          b.cyl(0.19, 0.19, 0.03, 16, -0.22, 0.775, 0, 0xd8dcd0);                                               // the veggie tray (all celery)
          for (k = 0; k < 9; k++) b.box(0.05, 0.02, 0.05, -0.22 + Math.cos(k * 0.7) * 0.12, 0.8, Math.sin(k * 0.7) * 0.12, [0x9ad13a, 0xe8782a, 0xf2efe6][k % 3]);
          for (k = 0; k < 6; k++) b.cyl(0.028, 0.028, 0.16, 8, 0.2 + (k % 3) * 0.07, 0.84 + (k > 2 ? 0.16 : 0), (k > 2 ? 0.035 : 0) - 0.035 + (k % 2) * 0.07, 0x9ad0f0);
          b.at(0, 0, 0, 0);
          obs(tierObs, X1 - 0.3, -1.2, 1.0, 0.5, -Math.PI / 2);
          dl.add(pSign(200, 110, '#f4f1e8', '#1a1a1a', [['PERFORMERS ONLY', 32], ['this means you, Zamboni guy', 22, MARKER, '#333']]), face(X1 - 0.38, 0.84, -0.95, -Math.PI / 2 + 0.3), 0, 0, 0.22, null);
          b.box(0.2, 0.1, 0.02, X1 - 0.37, 0.83, -0.95, 0xf4f1e8, 0, -Math.PI / 2 + 0.3, 0);
        }
        // Marcel's mirror becomes a dressing-room mirror (bulbs all round).
        var MP = PROPS.mirror;
        g.at(MP.x, 0, MP.z, MP.yaw); g.push(0, 0.95, 0.035, -0.08, 0, 0);
        for (k = 0; k < 6; k++) { g.box(0.05, 0.05, 0.03, 0.31, -0.55 + k * 0.22, 0, 0xfff1c0); g.box(0.05, 0.05, 0.03, -0.31, -0.55 + k * 0.22, 0, 0xfff1c0); }
        for (k = 0; k < 3; k++) g.box(0.05, 0.05, 0.03, -0.18 + k * 0.18, 0.69, 0, 0xfff1c0);
        g.pop(); g.at(0, 0, 0, 0);
        couch(b, 3);
        laptopDesk(b, g, 3, dl, name);
        door(b, g, 3);
        sill(b, 0x2a2e36);
        // The service corridor out front (the merch corner stays clear): two cable ramps across, the cone between them, the band's
        // drum case beside them, the forklift with a shrink-wrapped pallet up on its forks.
        for (k = 0; k < 2; k++) {
          var rz = 3.1 + k * 0.62;
          b.box(1.7, 0.06, 0.44, -0.35, 0.03, rz, 0x1a1a1c); b.box(1.7, 0.012, 0.16, -0.35, 0.066, rz, 0xe0b830);
          b.box(1.7, 0.012, 0.16, -0.35, 0.03, rz - 0.25, 0x1a1a1c, 0.5); b.box(1.7, 0.012, 0.16, -0.35, 0.03, rz + 0.25, 0x1a1a1c, -0.5);
        }
        b.at(0.1, 0, 3.41, 0); b.cyl(0.03, 0.16, 0.42, 10, 0, 0.23, 0, 0xf06a1a); b.box(0.34, 0.03, 0.34, 0, 0.015, 0, 0xf06a1a); b.cyl(0.1, 0.12, 0.06, 10, 0, 0.26, 0, 0xf2efe6);
        b.at(1.0, 0, 3.3, -0.12);                                                                               // the drum case: black, white corners
        b.box(0.74, 0.56, 0.5, 0, 0.3, 0, 0x151517); for (k = 0; k < 4; k++) b.cyl(0.045, 0.045, 0.04, 8, (k % 2 ? 0.28 : -0.28), 0.02, (k < 2 ? 0.18 : -0.18), 0x2a2a2e);
        for (k = 0; k < 8; k++) b.box(0.08, 0.08, 0.08, (k % 2 ? 0.34 : -0.34), (k & 2 ? 0.54 : 0.06), (k & 4 ? 0.22 : -0.22), 0xeef0f2);   // corner caps
        b.box(0.752, 0.025, 0.512, 0, 0.3, 0, 0xd8dce2); b.box(0.12, 0.04, 0.03, 0.2, 0.3, 0.26, 0xb8bcc2); b.box(0.12, 0.04, 0.03, -0.2, 0.3, 0.26, 0xb8bcc2);
        dl.add(pStencil([name, 'DRUMS'], '#f4f4f0', 440, 220, 0, 0.72), face(1.0 + 0.253 * Math.sin(-0.12), 0, 3.3 + 0.253 * Math.cos(-0.12), -0.12), 0, 0.3, 0.6, 0.3);
        b.at(1.4, 0, 4.95, -Math.PI / 2 + 0.25);                                                                // the forklift (forks to the left)
        b.box(0.84, 0.62, 1.1, 0, 0.5, -0.1, 0xe0b020); b.box(0.86, 0.5, 0.3, 0, 0.52, -0.72, 0x3a3a3e);
        for (k = 0; k < 4; k++) b.cyl(0.19, 0.19, 0.16, 10, (k % 2 ? 0.42 : -0.42), 0.19, (k < 2 ? 0.3 : -0.55), 0x151515, 0, 0, Math.PI / 2);
        b.box(0.34, 0.1, 0.36, 0, 0.86, -0.2, 0x1a1a1a); b.box(0.34, 0.36, 0.08, 0, 1.02, -0.38, 0x1a1a1a);
        for (k = 0; k < 4; k++) b.box(0.04, 0.8, 0.04, (k % 2 ? 0.38 : -0.38), 1.2, (k < 2 ? 0.28 : -0.62), 0x222226);
        b.box(0.84, 0.04, 0.96, 0, 1.6, -0.17, 0x222226);
        b.box(0.08, 1.45, 0.08, 0.26, 0.73, 0.52, 0x3a3a3e); b.box(0.08, 1.45, 0.08, -0.26, 0.73, 0.52, 0x3a3a3e); b.box(0.6, 0.08, 0.06, 0, 0.42, 0.58, 0x2a2a2e);
        b.box(0.1, 0.45, 0.05, 0.18, 0.4, 0.6, 0x2a2a2e); b.box(0.1, 0.45, 0.05, -0.18, 0.4, 0.6, 0x2a2a2e);   // the carriage, raised
        b.box(0.08, 0.04, 0.9, 0.18, 0.2, 1.05, 0x2a2a2e); b.box(0.08, 0.04, 0.9, -0.18, 0.2, 1.05, 0x2a2a2e);   // the forks, up 0.2
        b.box(0.72, 0.03, 0.8, 0, 0.235, 1.06, 0x9a7a4a); b.box(0.72, 0.05, 0.1, 0, 0.275, 0.72, 0x8a6a3e); b.box(0.72, 0.05, 0.1, 0, 0.275, 1.4, 0x8a6a3e);   // the pallet
        b.box(0.66, 0.5, 0.74, 0, 0.55, 1.06, 0xc8cfd6); for (k = 0; k < 3; k++) b.box(0.672, 0.02, 0.752, 0, 0.36 + k * 0.17, 1.06, 0xe8eef2);   // shrink-wrapped boxes
        b.box(0.3, 0.12, 0.004, 0.1, 0.62, 1.435, 0xf2efe6);
        b.at(0, 0, 0, 0);
        cur.hallProps = 4;
      }
      // The control room behind the glass (v0.8 SPACES review): a dim blue-grey room, a lamp, the far wall's panels, the DAW
      // screen and two monitors on the meter bridge, Gwen from behind in her chair with her headphones on, and the sloped console
      // filling the bottom: its meters and fader caps glow just over the sill (the view is unlit: only the LEDs are bright).
      function paintControlRoom() {
        var r = region(400, 476), x = r.x, y = r.y, w = r.w, h = r.h, i, j;
        ag.save(); ag.beginPath(); ag.rect(x, y, w, h); ag.clip();
        var gr = ag.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#161d28'); gr.addColorStop(0.55, '#243040'); gr.addColorStop(1, '#1a2029'); ag.fillStyle = gr; ag.fillRect(x, y, w, h);
        for (i = 0; i < 5; i++) { ag.fillStyle = i % 2 ? '#2c3848' : '#25303e'; ag.fillRect(x + 6 + i * 80, y + h * 0.08, 70, h * 0.3); }   // the far wall's panels
        ag.fillStyle = 'rgba(255,196,120,0.2)'; ag.beginPath(); ag.arc(x + w * 0.1, y + h * 0.3, 52, 0, Math.PI * 2); ag.fill();   // a lamp
        ag.fillStyle = '#f0cc8a'; ag.fillRect(x + w * 0.1 - 9, y + h * 0.27, 18, 16); ag.fillStyle = '#3a3026'; ag.fillRect(x + w * 0.1 - 2, y + h * 0.3, 4, 40);
        ag.fillStyle = '#0a0c10'; ag.fillRect(x + w * 0.56, y + h * 0.3, w * 0.3, h * 0.18);                           // the DAW screen (dim)
        ag.fillStyle = '#132232'; ag.fillRect(x + w * 0.57, y + h * 0.31, w * 0.28, h * 0.16);
        for (i = 0; i < 4; i++) { ag.fillStyle = ['#3f8fd0', '#4fbf7a', '#3f8fd0', '#c8a040'][i]; for (j = 0; j < 10; j++) ag.fillRect(x + w * 0.58 + j * 10, y + h * 0.325 + i * 17, 8, 3 + ((i * 5 + j * 3) % 7)); }
        for (i = 0; i < 2; i++) {                                                                                   // nearfield monitors
          var mx = x + (i ? w * 0.9 : w * 0.3) - 22; ag.fillStyle = '#0e0f12'; ag.fillRect(mx, y + h * 0.42, 44, 62);
          ag.fillStyle = '#2a2c32'; ag.beginPath(); ag.arc(mx + 22, y + h * 0.42 + 40, 13, 0, Math.PI * 2); ag.fill(); ag.beginPath(); ag.arc(mx + 22, y + h * 0.42 + 14, 6, 0, Math.PI * 2); ag.fill();
        }
        var gx = x + w * 0.5, gy = y + h * 0.5;                                                                     // Gwen: chair back, shoulders, head, headphones
        ag.fillStyle = '#0c0d10'; ag.beginPath(); ag.moveTo(gx - 50, gy + 80); ag.lineTo(gx - 42, gy + 8); ag.lineTo(gx + 42, gy + 8); ag.lineTo(gx + 50, gy + 80); ag.fill();
        ag.fillStyle = '#111318'; ag.beginPath(); ag.moveTo(gx - 44, gy + 30); ag.quadraticCurveTo(gx, gy - 6, gx + 44, gy + 30); ag.lineTo(gx + 44, gy + 60); ag.lineTo(gx - 44, gy + 60); ag.fill();
        ag.beginPath(); ag.arc(gx, gy - 14, 24, 0, Math.PI * 2); ag.fill();
        ag.strokeStyle = '#3c4250'; ag.lineWidth = 7; ag.beginPath(); ag.arc(gx, gy - 16, 28, Math.PI * 1.08, Math.PI * 1.92); ag.stroke();
        ag.fillStyle = '#3c4250'; ag.fillRect(gx - 33, gy - 22, 11, 22); ag.fillRect(gx + 22, gy - 22, 11, 22);
        // The console: a sloped surface from its meter bridge (just above the sill) down to the front edge.
        var top = y + h * 0.66;
        ag.fillStyle = '#1e2126'; ag.beginPath(); ag.moveTo(x + 12, top); ag.lineTo(x + w - 12, top); ag.lineTo(x + w, y + h); ag.lineTo(x, y + h); ag.fill();
        ag.fillStyle = '#121418'; ag.fillRect(x + 12, top - 16, w - 24, 18);                                        // the meter bridge
        for (i = 0; i < 24; i++) {                                                                                  // LED meters, lit
          var lv = 3 + ((i * 7 + 3) % 6); for (j = 0; j < lv; j++) { ag.fillStyle = j > 6 ? '#ff5a4a' : j > 4 ? '#ffc040' : '#5aff8a'; ag.fillRect(x + 18 + i * 15.5, top - 4 - j * 1.6, 10, 1.2); }
        }
        for (i = 0; i < 24; i++) for (j = 0; j < 3; j++) { ag.fillStyle = ['#e85a5a', '#e8b23a', '#5ad06a', '#4aa8e8'][(i + j) % 4]; ag.beginPath(); ag.arc(x + 20 + i * 15.5 + (j - 1) * 0.5, top + 10 + j * 13, 3, 0, Math.PI * 2); ag.fill(); }   // knobs
        for (i = 0; i < 24; i++) {                                                                                  // fader slots + caps
          var fxx = x + 16 + i * 15.6 - (i - 12) * 0.2; ag.fillStyle = '#0a0b0d'; ag.fillRect(fxx + 3, top + 50, 3, 58);
          ag.fillStyle = i % 8 === 7 ? '#ff6a5a' : i % 4 === 3 ? '#ffe070' : '#f2f0e6'; ag.fillRect(fxx, top + 58 + ((i * 11) % 34), 10, 8);
        }
        ag.restore();
        return r;
      }
      // The arena on the backstage monitor (v0.8 SPACES review: brighter): the bowl's seating rings, the floor, the lit stage at
      // one end, a light rig, LIVE.
      function paintArena() {
        var r = region(420, 252), x = r.x, y = r.y, w = r.w, h = r.h, i, cx = x + w * 0.54, cy = y + h * 0.58;
        ag.save(); ag.beginPath(); ag.rect(x, y, w, h); ag.clip();
        ag.fillStyle = '#10203c'; ag.fillRect(x, y, w, h);
        var RC = ['#3a6ad0', '#2c58b4', '#4a7ae0', '#3462c4', '#5484e8', '#2c58b4', '#3a6ad0'];
        for (i = 0; i < 7; i++) { ag.fillStyle = RC[i]; ag.beginPath(); ag.ellipse(cx, cy, w * (0.5 - i * 0.045), h * (0.5 - i * 0.047), 0, 0, Math.PI * 2); ag.fill(); }
        ag.strokeStyle = 'rgba(16,24,48,0.8)'; ag.lineWidth = 3;
        for (i = 0; i < 12; i++) { var a = i / 12 * Math.PI * 2; ag.beginPath(); ag.moveTo(cx + Math.cos(a) * w * 0.2, cy + Math.sin(a) * h * 0.19); ag.lineTo(cx + Math.cos(a) * w * 0.5, cy + Math.sin(a) * h * 0.5); ag.stroke(); }   // aisles
        ag.fillStyle = '#b8c0cc'; ag.beginPath(); ag.ellipse(cx, cy, w * 0.19, h * 0.18, 0, 0, Math.PI * 2); ag.fill();   // the floor
        ag.fillStyle = 'rgba(255,236,170,0.4)'; ag.beginPath(); ag.ellipse(cx - w * 0.14, cy, w * 0.11, h * 0.2, 0, 0, Math.PI * 2); ag.fill();
        ag.fillStyle = '#fff4cc'; ag.fillRect(cx - w * 0.2, cy - h * 0.1, w * 0.08, h * 0.2);                           // the stage, lit
        ag.fillStyle = '#1a1a1a'; ag.fillRect(cx - w * 0.21, cy - h * 0.13, w * 0.1, 6);
        ag.fillStyle = 'rgba(255,244,210,0.22)'; for (i = 0; i < 4; i++) { ag.beginPath(); ag.moveTo(cx - w * 0.3 + i * 22, y); ag.lineTo(cx - w * 0.19 + i * 6, cy - h * 0.08); ag.lineTo(cx - w * 0.16 + i * 6, cy - h * 0.08); ag.fill(); }
        ag.fillStyle = 'rgba(0,0,0,0.55)'; ag.fillRect(x, y, w, 30);
        ag.fillStyle = '#ff2a2a'; ag.beginPath(); ag.arc(x + 20, y + 15, 8, 0, Math.PI * 2); ag.fill();
        ag.fillStyle = '#ffffff'; ag.font = font(STENCIL, 20); ag.textAlign = 'left'; ag.textBaseline = 'middle'; ag.fillText('LIVE', x + 34, y + 16);
        ag.textAlign = 'right'; ag.fillText('CAM 3 · BOWL', x + w - 10, y + 16);
        ag.restore();
        return r;
      }
      function paintRugLogo() {                                  // PRAIRIE DOG SOUND round logo: a prairie dog in headphones
        var r = region(300, 300), cx = r.x + 150, cy = r.y + 150;
        ag.strokeStyle = '#e8c070'; ag.lineWidth = 8; ag.beginPath(); ag.arc(cx, cy, 128, 0, Math.PI * 2); ag.stroke();
        ag.fillStyle = '#c08a4a'; ag.beginPath(); ag.ellipse(cx, cy + 30, 42, 58, 0, 0, Math.PI * 2); ag.fill(); ag.beginPath(); ag.arc(cx, cy - 42, 32, 0, Math.PI * 2); ag.fill();
        ag.fillStyle = '#1a1a1a'; ag.beginPath(); ag.arc(cx - 11, cy - 48, 4, 0, Math.PI * 2); ag.arc(cx + 11, cy - 48, 4, 0, Math.PI * 2); ag.fill();
        ag.strokeStyle = '#1a1a1a'; ag.lineWidth = 7; ag.beginPath(); ag.arc(cx, cy - 44, 38, Math.PI * 1.1, Math.PI * 1.9); ag.stroke();
        ag.fillStyle = '#1a1a1a'; ag.fillRect(cx - 44, cy - 50, 14, 24); ag.fillRect(cx + 30, cy - 50, 14, 24);
        ag.save(); ag.fillStyle = '#e8c070'; ag.font = font(STENCIL, 24); ag.textAlign = 'center'; ag.textBaseline = 'middle';
        var T = PAINT.studio + ' · ', a0 = -Math.PI * 0.95;
        for (var i = 0; i < T.length; i++) { var a = a0 + i * (Math.PI * 1.9 / T.length); ag.save(); ag.translate(cx + Math.cos(a) * 104, cy + Math.sin(a) * 104); ag.rotate(a + Math.PI / 2); ag.fillText(T[i], 0, 0); ag.restore(); }
        ag.restore();
        return r;
      }
      /* ---- v0.9 "Genres": the other bands' tier-0 rooms (room index 4..6). Same ROOM footprint, same seven hotspots (the door
         hotspot is each room's own door), the couch in the couch's spot, a laptop desk at the cooler's height; D = the decor
         flags (season, snow, lights) so the seasonal dressing lives in the room. --------------------------------------------- */
      function tierZeroCouch(b, kind) {                           // the sulk zone: seats at the garage couch's height
        b.at(X1 - 0.42, 0, PROPS.couch.z, -Math.PI / 2);
        var i;
        if (kind === 'plaid') {                                   // the basement couch: plaid, a crocheted blanket, a sleeping bag
          var PB = 0x5a4632, PC = 0x6e5a3e;
          b.box(1.52, 0.26, 0.82, 0, 0.2, 0, PB);
          for (i = 0; i < 4; i++) b.box(0.06, 0.08, 0.06, (i % 2 ? 0.7 : -0.7), 0.04, (i < 2 ? 0.34 : -0.34), 0x2a1f16);
          for (i = -1; i <= 1; i++) {
            b.box(0.48, 0.14, 0.62, i * 0.49, 0.39, 0.06, PC); b.box(0.46, 0.38, 0.14, i * 0.49, 0.67, -0.22, PC, -0.12);
            b.box(0.48, 0.012, 0.03, i * 0.49, 0.462, -0.05, 0x8a2a20); b.box(0.03, 0.012, 0.6, i * 0.49 - 0.1, 0.463, 0.06, 0x2a4a3a);   // the plaid
          }
          b.box(1.52, 0.54, 0.2, 0, 0.64, -0.33, PB); b.box(0.18, 0.5, 0.84, 0.83, 0.42, 0, PB); b.box(0.18, 0.5, 0.84, -0.83, 0.42, 0, PB);
          b.box(0.6, 0.04, 0.5, -0.4, 0.49, 0.05, 0xd89a3a, 0.1, 0.2, 0); for (i = 0; i < 4; i++) b.box(0.1, 0.045, 0.1, -0.6 + i * 0.13, 0.5, 0.05 + (i % 2) * 0.12, [0xc0392b, 0x2f6fd1, 0x6fbf4a, 0xe8c531][i]);   // granny squares
          b.cyl(0.13, 0.13, 0.5, 10, 0.45, 0.55, 0.05, 0x3a5a8a, 0, 0, Math.PI / 2);                       // a rolled sleeping bag
        } else if (kind === 'salon') {                            // three joined vinyl waiting-room chairs from the nail place (chrome legs)
          for (i = -1; i <= 1; i++) {
            b.box(0.46, 0.08, 0.5, i * 0.5, 0.4, 0.06, 0xb0304a); b.box(0.44, 0.44, 0.08, i * 0.5, 0.7, -0.2, 0xb0304a, -0.1);
            b.box(0.04, 0.36, 0.04, i * 0.5 - 0.19, 0.18, 0.25, 0xc8ccd2); b.box(0.04, 0.36, 0.04, i * 0.5 + 0.19, 0.18, 0.25, 0xc8ccd2);
          }
          b.box(1.5, 0.04, 0.06, 0, 0.35, -0.12, 0xc8ccd2); b.box(0.06, 0.2, 0.5, 0.76, 0.52, 0.06, 0xc8ccd2); b.box(0.06, 0.2, 0.5, -0.76, 0.52, 0.06, 0xc8ccd2);
          b.box(0.12, 0.012, 0.3, 0.5, 0.445, 0.1, 0xb9bdc4, 0, 0.4, 0);                                   // duct tape on a split
        } else {                                                  // 'bench': a bench seat out of an old grain truck, on cinder blocks
          for (i = -1; i <= 1; i += 2) { b.box(0.4, 0.2, 0.2, i * 0.5, 0.1, 0.05, 0x8a8a84); b.box(0.12, 0.12, 0.21, i * 0.5 - 0.1, 0.1, 0.05, 0x5a5a56); b.box(0.12, 0.12, 0.21, i * 0.5 + 0.1, 0.1, 0.05, 0x5a5a56); }
          b.box(1.5, 0.18, 0.58, 0, 0.3, 0.06, 0x7a4a2a); b.box(1.46, 0.06, 0.54, 0, 0.41, 0.06, 0x8a5a36);
          b.box(1.5, 0.62, 0.16, 0, 0.66, -0.25, 0x7a4a2a, -0.18); for (i = 0; i < 5; i++) b.box(0.012, 0.56, 0.17, -0.6 + i * 0.3, 0.66, -0.24, 0x5a3418, -0.18);   // tuck-and-roll
          b.box(0.3, 0.012, 0.06, 0.3, 0.447, 0.1, 0xb9bdc4, 0, 0.3, 0); b.box(0.05, 0.02, 0.1, -0.4, 0.45, 0.28, 0xb8bcc2);         // tape, a buckle
        }
        b.at(0, 0, 0, 0);
      }
      function tierZeroDesk(b, kind) {                            // the laptop's desk (the laptop is the static mesh's, 0.47 up)
        var P = PROPS.cooler, k;
        b.at(P.x, 0, P.z, P.yaw);
        if (kind === 'basket') {                                  // an upside-down laundry basket, a towel on top
          b.box(0.6, 0.42, 0.42, 0, 0.21, 0, 0xe8e4da); for (k = 0; k < 6; k++) b.box(0.05, 0.3, 0.43, -0.25 + k * 0.1, 0.2, 0, 0xc8c4b8);
          b.box(0.62, 0.03, 0.44, 0, 0.435, 0, 0x6aa0c8);
        } else if (kind === 'table') {                            // the nail salon's old coffee table, with 1985's magazines
          b.box(0.7, 0.04, 0.46, 0, 0.44, 0, 0x2a2a2e); for (k = 0; k < 4; k++) b.box(0.03, 0.42, 0.03, (k % 2 ? 0.32 : -0.32), 0.21, (k < 2 ? 0.2 : -0.2), 0xc8ccd2);
          b.box(0.2, 0.012, 0.26, 0.23, 0.466, 0.08, 0xe8408a, 0, 0.3, 0); b.box(0.2, 0.012, 0.26, 0.24, 0.478, 0.05, 0x40c8e8, 0, -0.1, 0);
        } else {                                                  // 'tire': a tractor tire lying flat, a sheet of plywood on it
          b.cyl(0.42, 0.42, 0.34, 14, 0, 0.17, 0, 0x1e1e20); b.cyl(0.24, 0.24, 0.35, 12, 0, 0.17, 0, 0x121214);
          for (k = 0; k < 14; k++) { var a = k / 14 * Math.PI * 2; b.box(0.06, 0.34, 0.05, Math.cos(a) * 0.42, 0.17, Math.sin(a) * 0.42, 0x2a2a2c, 0, -a, 0.3); }   // the lugs
          b.box(0.78, 0.03, 0.62, 0, 0.44, 0, 0xc8a870, 0, 0.1, 0);
        }
        b.at(0, 0, 0, 0);
      }
      // The window well seen through the basement window (right-wall frame, on the glass): the well's bottom by season.
      function wellView(b, D, WZ, WY) {
        var z = 0.062, y0 = WY - 0.16, i, rng = GG.RNG(51), s = D.snow ? 'winter' : D.season;
        b.box(0.72, 0.1, 0.004, WZ, WY + 0.12, z, 0x8a8e94);                                                          // the corrugated liner across the top
        for (i = 0; i < 8; i++) b.box(0.012, 0.1, 0.006, WZ - 0.33 + i * 0.095, WY + 0.12, z + 0.002, 0x6a6e74);
        if (s === 'winter') {                                                                                         // a drift up the glass
          b.box(0.72, 0.2, 0.004, WZ, y0 + 0.08, z, 0xeef2fa); b.box(0.4, 0.08, 0.005, WZ - 0.12, y0 + 0.21, z, 0xf6f8fc); b.box(0.2, 0.05, 0.005, WZ + 0.2, y0 + 0.19, z, 0xf6f8fc);
        } else if (s === 'fall') {
          b.box(0.72, 0.06, 0.004, WZ, y0 + 0.02, z, 0x5a4a2a); for (i = 0; i < 9; i++) b.box(0.05, 0.035, 0.005, WZ - 0.32 + rng.next() * 0.64, y0 + 0.05 + rng.next() * 0.04, z + 0.001, [0xd9822b, 0xc0612a, 0xe8b040][i % 3], 0, 0, rng.next() * 3);
        } else if (s === 'spring') {
          b.box(0.72, 0.06, 0.004, WZ, y0 + 0.02, z, 0x4a3a28); b.box(0.34, 0.025, 0.005, WZ + 0.1, y0 + 0.06, z + 0.001, 0x5a6a8a);
          for (i = 0; i < 5; i++) b.box(0.01, 0.06, 0.005, WZ - 0.3 + i * 0.13, y0 + 0.08, z + 0.001, 0x6aa84a);
        } else {
          b.box(0.72, 0.05, 0.004, WZ, y0 + 0.015, z, 0x3a5a2a); for (i = 0; i < 12; i++) b.box(0.012, 0.07 + rng.next() * 0.04, 0.005, WZ - 0.33 + i * 0.06, y0 + 0.06, z + 0.001, 0x5a8a3a, 0, 0, (rng.next() - 0.5) * 0.5);
          b.box(0.035, 0.035, 0.006, WZ - 0.1, y0 + 0.11, z + 0.002, 0xf2d24a); b.box(0.035, 0.035, 0.006, WZ + 0.18, y0 + 0.1, z + 0.002, 0xf2d24a);   // dandelions
        }
      }

      // Room 4: the basement under the Suds-O-Rama (Frost Heave, Regina). Painted block, a paint line, joists and pipes along the
      // wall tops, the upstairs dryers' foil vents coming down, a window well high on the right wall (grass / leaves / a snow
      // drift / a puddle by season), the stairs up along the back wall (the door hotspot: 'Basement stairs', light spilling down
      // from the laundromat), detergent on a shelf under the stairs, a dead dryer, coin-op signs, a floor drain, lint.
      function laundromatRoom(b, g, fx, W, dl, dg, band, D) {
        var H = ROOM.h, WALL = MOODS[4].wall, LOW = 0x4e6a5a, i, k;
        walls(b, WALL);
        for (var w = 0; w < 2; w++) { frame(b, WALLS[w][0]); b.box(WALLS[w][1], 0.9, 0.008, 0, 0.45, 0.004, LOW); b.box(WALLS[w][1], 0.03, 0.012, 0, 0.9, 0.006, 0x2e4236); }
        blocks(b, 0, 0.9, 0x3e5648); blocks(b, 0.9, H, 0x76867a);
        b.at(0, 0, 0, 0);
        // Joists over the wall tops (the low ceiling), a copper run + a black drain pipe, the foil dryer vents from upstairs.
        for (i = 0; i < 12; i++) b.box(0.05, 0.2, 0.55, -2.1 + i * 0.4, H - 0.02, Z0 + 0.27, 0x8a6a42);
        for (i = 0; i < 14; i++) b.box(0.55, 0.2, 0.05, X1 - 0.27, H - 0.02, -2.5 + i * 0.4, 0x8a6a42);
        b.box(ROOM.x1 - ROOM.x0, 0.045, 0.045, 0, 2.38, Z0 + 0.12, 0xc8783a); b.box(ROOM.x1 - ROOM.x0, 0.03, 0.03, 0, 2.31, Z0 + 0.18, 0xc8783a);
        for (i = 0; i < 6; i++) b.box(0.06, 0.08, 0.06, -2.0 + i * 0.8, 2.36, Z0 + 0.15, 0x2a2a2e);                               // pipe straps
        b.box(0.08, 0.08, ROOM.z1 - ROOM.z0, X1 - 0.12, 2.45, 0, 0x1e1e22); b.box(0.08, 2.45, 0.08, X1 - 0.12, 1.22, Z0 + 0.12, 0x1e1e22);   // the drain stack in the corner
        b.box(0.1, 0.06, 0.1, X1 - 0.12, 0.25, Z0 + 0.12, 0x2a2a2e);                                                                 // cleanout
        [-1.95, -0.1].forEach(function (vx) {                       // foil vents: a flex duct down from the joists to a box on the wall
          for (var s = 0; s < 5; s++) b.cyl(0.075, 0.075, 0.1, 10, vx + s * 0.02, 2.62 - s * 0.1, Z0 + 0.3 - s * 0.02, s % 2 ? 0xc8ccd2 : 0xb0b4ba);
          b.box(0.22, 0.16, 0.12, vx + 0.1, 2.05, Z0 + 0.08, 0xb8bcc2); b.box(0.2, 0.02, 0.1, vx + 0.1, 1.96, Z0 + 0.12, 0x9aa0a8);
          b.box(0.16, 0.05, 0.03, vx + 0.1, 1.9, Z0 + 0.16, 0xd8d4cc, 0.3);                                                    // lint on the flap
        });
        // Floor: painted concrete, worn to grey in the paths, a drain, lint bunnies.
        tiles(b, 8, 9, [0x6a7068, 0x666c64, 0x6e746c, 0x646a62], 0.004, 0);
        b.box(ROOM.x1 - ROOM.x0, 0.002, ROOM.z1 - ROOM.z0, 0, 0.002, 0, 0x4a5048);
        [[0.4, 0.2, 0.5, 0x7a7e76, 31], [-0.4, 1.6, 0.36, 0x767a72, 32], [1.5, -0.9, 0.3, 0x5a6058, 33]].forEach(function (p) { blob(b, p[0], p[1], p[2], p[3], p[4], 0.0068); });
        b.cyl(0.12, 0.12, 0.012, 12, 0.35, 0.008, 1.05, 0x2a2a2e); for (i = -1; i <= 1; i++) b.box(0.18, 0.006, 0.018, 0.35, 0.016, 1.05 + i * 0.05, 0x8a8e94);   // the floor drain
        for (i = 0; i < 6; i++) b.shape(new THREE.IcosahedronGeometry(1, 0), -1.6 + i * 0.62, 0.03, 2.0 - (i % 3) * 1.4, 0.07, 0.04, 0.06, 0xb8b4aa);   // lint bunnies
        // A rug under the kit: an old bath mat, a SUDS-O-RAMA towel on the throne side.
        b.at(KIT.x, 0, KIT.z, KIT.yaw);
        b.box(1.8, 0.012, 1.5, 0, 0.008, -0.15, 0x3a6a8a); b.box(1.6, 0.013, 1.3, 0, 0.009, -0.15, 0x4a7a9a);
        b.box(0.6, 0.014, 0.3, 0.2, 0.012, -0.85, 0xe8e4da); b.box(0.6, 0.015, 0.06, 0.2, 0.013, -0.85, 0xc0392b);
        b.at(0, 0, 0, 0);
        // The stairs up (door hotspot): rising along the back wall from x 0.3 to the landing in the back-right corner; an open
        // side with a railing, the stringer, a closed-in underside with the band's banner on it (hideGarage), a shelf of detergent.
        var SX0 = 0.32, SX1 = 2.2, SD = 0.68, n = 11, rise = 2.18 / n, run = (SX1 - SX0) / n, SZ = Z0 + SD / 2 + 0.01;
        for (i = 0; i < n; i++) {
          var sx = SX0 + (i + 0.5) * run, sy = (i + 1) * rise;
          b.box(run + 0.02, 0.04, SD, sx, sy - 0.02, SZ, 0x9a7a50); b.box(0.02, rise, SD - 0.02, SX0 + i * run + 0.01, sy - rise / 2, SZ, 0x7a6040);   // tread + riser
          b.box(run + 0.01, 0.012, 0.06, sx, sy + 0.002, SZ + SD / 2 - 0.05, 0xc8b048);                                                 // the yellow nosing strip
        }
        var SL = Math.sqrt((SX1 - SX0) * (SX1 - SX0) + 2.18 * 2.18), SA = Math.atan2(2.18, SX1 - SX0);
        b.box(SL + 0.08, 0.1, 0.06, (SX0 + SX1) / 2, 1.09, Z0 + SD + 0.03, 0x6a5238, 0, 0, SA);                                          // the stringer
        b.tri([SX0 + 0.3, 0, Z0 + SD], [SX1, 0, Z0 + SD], [SX1, 2.1, Z0 + SD], 0x6f5a3e);                                             // the closed-in underside (plywood)
        b.tri([SX0 + 0.3, 0, Z0 + SD], [SX1, 2.1, Z0 + SD], [SX0 + 0.3, 0.33, Z0 + SD], 0x6f5a3e);
        for (i = 0; i < 4; i++) { var px2 = SX0 + 0.9 + i * 0.3; b.box(0.02, 0.02 + (px2 - SX0) * 1.1, 0.02, px2, (px2 - SX0) * 0.55, Z0 + SD + 0.004, 0x5a4830); }   // plywood seams
        for (i = 0; i <= 5; i++) { var rx = SX0 + 0.2 + i * (SX1 - SX0 - 0.2) / 5; b.box(0.035, 0.9, 0.035, rx, (rx - SX0) / (SX1 - SX0) * 2.18 + 0.45, Z0 + SD - 0.02, 0x3a3a3e); }   // railing posts
        b.box(SL, 0.05, 0.05, (SX0 + SX1) / 2 + 0.1, 1.09 + 0.45 + 0.45 + 0.12, Z0 + SD - 0.02, 0x3a3a3e, 0, 0, SA);                      // the handrail
        b.box(0.5, 0.05, SD, SX1 + 0.1, 2.16, SZ, 0x9a7a50);                                                                              // the landing
        b.box(0.54, 0.62, 0.04, SX1 + 0.08, 2.42, Z0 + 0.02, 0x3a3226); g.box(0.46, 0.5, 0.01, SX1 + 0.08, 2.44, Z0 + 0.045, 0xffd9a0);    // the upstairs doorway, lit
        g.box(0.4, 0.035, 0.005, SX1 + 0.08, 2.2, Z0 + 0.05, 0xffe8c0);
        pool(W, FR.back, SX1 - 0.1, 2.2, 1.4, 1.2, 0x5a4020);                                                                             // warm spill down the stairs
        // Under the stairs, from the front: a steel shelf of detergent (the jugs Moth doesn't sit on), bleach, dryer sheets.
        b.at(1.72, 0, Z0 + SD + 0.2, 0);
        for (k = 0; k < 4; k++) b.box(0.03, 0.62, 0.03, (k % 2 ? 0.32 : -0.32), 0.31, (k < 2 ? 0.14 : -0.14), 0x8a8e94);
        for (k = 0; k < 2; k++) b.box(0.68, 0.025, 0.32, 0, 0.12 + k * 0.4, 0, 0x9aa0a8);
        for (k = 0; k < 5; k++) b.box(0.1, 0.2, 0.1, -0.24 + k * 0.12, 0.24, 0.02, [0xe8702a, 0x2f6fd1, 0xf2efe6, 0xe8702a, 0x6fbf4a][k]);
        for (k = 0; k < 3; k++) b.box(0.16, 0.12, 0.1, -0.2 + k * 0.2, 0.6, 0.0, [0xe8c531, 0x4aa0c8, 0xd23c3c][k]);
        b.at(0, 0, 0, 0);
        obs(tierObs, (SX0 + SX1) / 2 + 0.1, Z0 + SD / 2, SX1 - SX0 + 0.3, SD, 0);
        obs(tierObs, 1.72, Z0 + SD + 0.2, 0.7, 0.34, 0);
        // A dead dryer by the couch (OUT OF ORDER since 2009), facing the room.
        b.at(1.02, 0, 2.38, 0.1);
        b.box(0.6, 0.86, 0.6, 0, 0.43, 0, 0xe8e4dc); b.box(0.6, 0.14, 0.12, 0, 0.93, -0.24, 0xd8d4cc);
        b.cyl(0.2, 0.2, 0.02, 14, 0, 0.45, 0.305, 0x9aa0a8, Math.PI / 2); b.cyl(0.15, 0.15, 0.02, 14, 0, 0.45, 0.31, 0x2a3440, Math.PI / 2);
        b.box(0.08, 0.05, 0.02, 0.2, 0.93, -0.17, 0x2a2a2e);
        dl.add(pSign(240, 90, '#f2e24a', '#1a1a1a', [['OUT OF ORDER', 44], ['since 2009', 30, MARKER]]), face(1.02 + 0.305 * Math.sin(0.1), 0, 2.38 + 0.305 * Math.cos(0.1), 0.1), 0, 0.72, 0.36, null, -0.05);
        obs(tierObs, 1.02, 2.38, 0.64, 0.64, 0.1);
        // The window well, high on the right wall (right-wall frame: local x = world z): the frame, the glass, the well's
        // corrugated liner, and the season at the bottom of it (a snow drift when it snows).
        var WZ = -2.15, WY = 2.3;
        frame(b, 'right'); frame(g, 'right');
        b.box(0.84, 0.46, 0.06, WZ, WY, 0.02, 0x5a5048); gradRect(g, 0.74, 0.36, WZ, WY + 0.02, 0.055, 0x2a3a5c, 0x141c30);
        b.box(0.02, 0.36, 0.03, WZ, WY + 0.02, 0.06, 0x5a5048);                                                                          // the mullion
        wellView(b, D, WZ, WY);                                                                                                          // the season in the well, seen through the glass
        b.at(0, 0, 0, 0); g.at(0, 0, 0, 0);
        // Christmas lights up the stair railing (December).
        if (D.lights) {
          var LC = [0xff3b30, 0x34c759, 0x2f7fff, 0xffcc00, 0xfff4e0];
          for (i = 0; i < 16; i++) { var u = i / 15, lx = SX0 + 0.2 + u * (SX1 - SX0 - 0.2); g.box(0.04, 0.055, 0.04, lx, u * 2.18 + 0.88 - 0.06 * Math.sin(u * Math.PI * 5), Z0 + SD, LC[i % 5]); }
        }
        couchKindSet('plaid'); tierZeroCouch(b, 'plaid');
        tierZeroDesk(b, 'basket');
        sill(b, 0x55605a);
        // Decals: the SUDS-O-RAMA tin sign over the amp, the coin-op price list, NO DYEING, the laundromat's rules.
        dl.add(pSign(420, 150, '#c0141c', '#f7f4ec', [['SUDS-O-RAMA', 88], ['EST. 1972 · REGINA', 34]], '#f7f4ec', 0.8), FR.back, -0.45, 1.3, 0.62, null, -0.02);
        dl.add(pSign(260, 300, '#f7f4ec', '#1a1a1a', [['WASHERS', 44], ['$2.75', 56], ['DRYERS', 44], ['$2.00 / 30 MIN', 34], ['NO CHANGE', 30]], '#1a1a1a'), FR.back, -2.02, 0.62, 0.3, null, 0.04);
        dl.add(pSign(300, 150, '#f7f4ec', '#c0141c', [['NO DYEING', 60], ['no dying either -mgmt', 30, MARKER, '#1a1a1a']], '#c0141c'), FR.right, -2.22, 1.9, 0.44, null, 0.03);
        dl.add(pSign(340, 120, '#2f6fd1', '#ffffff', [['ATTENDANT ON DUTY', 44], ['(NOT)', 40, MARKER, '#f2e24a']]), FR.right, 1.55, 2.2, 0.5, null, -0.02);
        dl.add(pMarker('FROST HEAVE PRACTICE 7PM · DRYERS ARE THE RHYTHM SECTION', '#1a1a1a', 26, 700), FR.back, -1.5, 0.3, 0.9, null, 0);
        cur.signText = 'SUDS-O-RAMA'; cur.hallProps = 0;
        cur.exterior = 'window well: ' + (D.snow ? 'snow drift' : { summer: 'grass + dandelions', fall: 'leaves', winter: 'snow drift', spring: 'puddle' }[D.season] || D.season);
      }

      // Room 5: Unit 4B, Westgate Plaza (Gravel Kings, Edmonton). The storefront is the back wall: aluminium-framed glass (the
      // parking lot at night through it: the sodium light, the plaza pylon with the neighbours' names and the band's, snowbanks
      // or puddles by season), UNIT 4B in vinyl (backwards from in here), the glass shop door (the door hotspot). A drop-ceiling
      // strip with a buzzing troffer, cream VCT with the outline where the till counter was bolted (the kit sits there now), the
      // till itself pushed into the corner, the vacuum repair's overflow boxes, 1985 posters, the nail salon's waiting chairs.
      function stripMallRoom(b, g, fx, W, dl, dg, band, D) {
        var H = ROOM.h, WALL = MOODS[5].wall, i, k, x0 = ROOM.x0, w = ROOM.wall;
        var GX0 = x0, GX1 = 1.52, GL = 0.42, GT = 2.5, ALU = 0x9aa0a8;
        // Walls: the right wall (drywall over slatwall), the back wall only right of the storefront + over it (a transom band).
        b.box(w, H, ROOM.z1 - ROOM.z0 + w, X1 + w / 2, H / 2, (Z0 - w + ROOM.z1) / 2, WALL);
        b.box(X1 - GX1 + w, H, w, (GX1 + X1 + w) / 2, H / 2, Z0 - w / 2, WALL);
        b.box(GX1 - GX0, H - GT, w, (GX0 + GX1) / 2, (H + GT) / 2, Z0 - w / 2, 0x3a3a40);                                              // the sign band over the glass
        b.box(GX1 - GX0, GL, w, (GX0 + GX1) / 2, GL / 2, Z0 - w / 2, 0x6a6e76);                                                         // the kick panel
        frame(b, 'right'); for (k = 0; k < 14; k++) b.box(ROOM.z1 - ROOM.z0 - 0.2, 0.012, 0.012, 0, 0.35 + k * 0.1, 0.008, 0xc4bdae); b.at(0, 0, 0, 0);   // slatwall grooves
        caps(b, 0x8a8a86, 0.08);
        // The storefront: mullions, transom bar, the glass door with a push bar, UNIT 4B vinyl (mirrored), the parking lot view.
        for (i = 0; i <= 3; i++) { var mx = GX0 + 0.04 + i * (0.54 - GX0) / 3; b.box(0.06, GT - GL, 0.08, mx, (GL + GT) / 2, Z0 + 0.01, ALU); }
        b.box(GX1 - GX0, 0.06, 0.08, (GX0 + GX1) / 2, GL, Z0 + 0.01, ALU); b.box(GX1 - GX0, 0.06, 0.08, (GX0 + GX1) / 2, GT, Z0 + 0.01, ALU); b.box(GX1 - GX0, 0.05, 0.08, (GX0 + GX1) / 2, 2.12, Z0 + 0.01, ALU);
        b.box(0.07, GT, 0.09, 0.54, GT / 2, Z0 + 0.01, ALU); b.box(0.07, GT, 0.09, GX1, GT / 2, Z0 + 0.01, ALU);                        // the door frame
        b.box(0.9, 0.05, 0.05, 1.03, 1.02, Z0 + 0.06, 0xc8ccd2); b.box(0.9, 0.12, 0.02, 1.03, 0.08, Z0 + 0.02, ALU);                     // push bar, kick plate
        b.box(0.06, 0.1, 0.1, 1.42, 2.05, Z0 + 0.06, 0x3a3a3e);                                                                            // the closer
        var view = paintLotView(D, band);
        dg.add(view, face(0, 0, Z0 - 0.07, 0), (GX0 + GX1) / 2, (GL + GT) / 2, GX1 - GX0, GT - GL);                                      // (unlit: it's the night outside)
        var glare = [0.05, 0.08, 0.1];
        for (i = 0; i < 3; i++) g.box(0.03, 1.2, 0.004, -1.9 + i * 0.9, 1.4, Z0 + 0.012, 0x2a3440, 0, 0, 0.5 + glare[i]);             // glare streaks
        dl.add(pVinyl('UNIT 4B'), face(0, 0, Z0 + 0.02, 0), 1.03, 1.72, 0.66, null);
        dl.add(pVinyl('HRS: WHENEVER'), face(0, 0, Z0 + 0.02, 0), 1.03, 1.45, 0.5, null);
        dl.add(pSign(220, 120, '#1a1a1a', '#ff3a5a', [['CLOSED', 80]], '#ff3a5a'), face(0, 0, Z0 + 0.03, 0), 1.03, 1.25, 0.3, null);
        if (D.snow || D.season === 'winter') for (i = 0; i < 4; i++) dl.add(pFrost(), face(0, 0, Z0 + 0.015, 0), -2.1 + i * 0.85, GL + 0.18, 0.8, null);   // frost creeping up the glass
        // The drop ceiling (a strip along both walls), one tile missing, one water-stained; the troffer (fixture mesh).
        var CY = 2.64;
        for (i = 0; i < 8; i++) { b.box(0.6, 0.02, 0.5, -2.0 + i * 0.6, CY, Z0 + 0.25, i === 5 ? 0x2a2a2e : i === 2 ? 0xc8b890 : 0xe8e6e0); b.box(0.02, 0.03, 0.5, -2.3 + i * 0.6, CY - 0.02, Z0 + 0.25, 0xb8bcc2); }
        for (i = 0; i < 9; i++) { b.box(0.5, 0.02, 0.6, X1 - 0.25, CY, -2.1 + i * 0.6, i === 6 ? 0xc8b890 : 0xe8e6e0); b.box(0.5, 0.03, 0.02, X1 - 0.25, CY - 0.02, -2.4 + i * 0.6, 0xb8bcc2); }
        b.box(4.6, 0.03, 0.02, 0, CY - 0.02, Z0 + 0.5, 0xb8bcc2); b.box(0.02, 0.03, 5.4, X1 - 0.5, CY - 0.02, 0, 0xb8bcc2);
        b.box(0.62, 0.06, 0.34, 0.2, CY - 0.03, Z0 + 0.26, 0xd8dce2); fx.box(0.56, 0.02, 0.28, 0.2, CY - 0.065, Z0 + 0.26, 0xf2f8ff);
        pool(W, FR.back, 0.2, 2.1, 2.6, 1.3, 0x3a4450); pool(W, FR.floor, 0.1, 1.6, 3.6, 2.8, 0x1c2228);
        // Floor: cream VCT with a darker tile here and there; the lighter outline + bolt holes where the till counter stood.
        tiles(b, 12, 14, [0xd8d2c0, 0xd2ccba, 0xdcd6c4, 0xb8b2a0, 0xd6d0be], 0.004, 0.003);
        b.box(ROOM.x1 - ROOM.x0, 0.002, ROOM.z1 - ROOM.z0, 0, 0.002, 0, 0x8a8678);
        b.at(KIT.x, 0, KIT.z, KIT.yaw);
        b.box(1.9, 0.009, 1.2, 0, 0.0075, -0.2, 0xeae6da); b.box(1.9, 0.01, 0.04, 0, 0.008, 0.4, 0x6a665a); b.box(1.9, 0.01, 0.04, 0, 0.008, -0.8, 0x6a665a);
        for (i = 0; i < 6; i++) b.cyl(0.018, 0.018, 0.012, 6, -0.85 + (i % 3) * 0.85, 0.009, i < 3 ? 0.35 : -0.75, 0x3a3a3a);
        b.at(0, 0, 0, 0);
        [[0.9, 0.4, 0.22, 0xa8a290, 41], [-0.3, 1.8, 0.2, 0xaaa492, 42]].forEach(function (p) { blob(b, p[0], p[1], p[2], p[3], p[4], 0.0068); });
        // The old till counter, pushed into the back-right corner, the register still on it.
        b.at(2.0, 0, -2.18, -0.25);
        b.box(0.9, 0.9, 0.5, 0, 0.45, 0, 0x6a4a2e); b.box(0.94, 0.04, 0.54, 0, 0.92, 0, 0xd8d0b8); b.box(0.86, 0.04, 0.02, 0, 0.6, 0.26, 0x4a3420);
        b.box(0.36, 0.2, 0.32, -0.1, 1.04, 0, 0xd8d0b8); b.box(0.34, 0.1, 0.2, -0.1, 1.2, -0.04, 0xc8c0a8, -0.4); g.box(0.16, 0.05, 0.01, -0.1, 1.24, 0.07, 0x6ae88a, -0.4);
        for (i = 0; i < 9; i++) b.box(0.05, 0.02, 0.05, -0.22 + (i % 3) * 0.08, 0.95 + 0.012, 0.1 + Math.floor(i / 3) * 0.035 - 0.05, 0x2a2a2e);
        b.cyl(0.04, 0.04, 0.08, 8, 0.25, 0.97, 0.05, 0xf2efe6, 0, 0, Math.PI / 2);                                                         // receipt roll
        b.at(0, 0, 0, 0);
        obs(tierObs, 2.0, -2.18, 0.94, 0.56, -0.25);
        // The vacuum repair's overflow: boxes stacked against the right wall by the front (VAC-U-FIX RETURNS).
        b.at(X1 - 0.35, 0, 2.52, -Math.PI / 2 + 0.1);
        b.box(0.5, 0.4, 0.4, 0, 0.2, 0, 0xb08a5a); b.box(0.42, 0.34, 0.36, 0.02, 0.57, 0, 0xa27e52, 0, 0.12, 0); b.box(0.12, 0.6, 0.16, 0.34, 0.3, 0.08, 0x2a2a30);   // + an upright vacuum
        b.box(0.26, 0.2, 0.3, 0.36, 0.1, -0.12, 0x9a9ea6);
        b.at(0, 0, 0, 0);
        // Christmas lights taped round the storefront (December).
        if (D.lights) {
          var LC = [0xff3b30, 0x34c759, 0x2f7fff, 0xffcc00, 0xfff4e0], m = 0;
          for (i = 0; i <= 20; i++) g.box(0.04, 0.055, 0.04, GX0 + 0.1 + i * (GX1 - GX0 - 0.2) / 20, GT - 0.06 - 0.04 * Math.sin(i * 1.3), Z0 + 0.07, LC[m++ % 5]);
          for (i = 1; i < 8; i++) { g.box(0.04, 0.055, 0.04, GX0 + 0.1, GT - i * 0.28, Z0 + 0.07, LC[m++ % 5]); g.box(0.04, 0.055, 0.04, 0.5, GT - i * 0.28, Z0 + 0.07, LC[m++ % 5]); }
        }
        couchKindSet('salon'); tierZeroCouch(b, 'salon');
        tierZeroDesk(b, 'table');
        sill(b, 0x6a6a70);
        // 1985: posters on the right wall, the nail salon's note, a marker line on the slatwall.
        dl.add(pPoster('LEATHER & LACE', 'LIVE AT THE COLISEUM · \'85', '#1a1030', '#ff4fa0', '#40c8e8'), FR.right, -2.2, 1.95, 0.46, null, 0.02);
        dl.add(pPoster('HAIRSPRAY SUMMER', 'WEST EDMONTON · 1985', '#0e2a3a', '#ffd23a', '#ff6a2a'), FR.back, 1.92, 1.9, 0.42, null, -0.03);
        dl.add(pSign(360, 150, '#fff4f8', '#b0304a', [['PLEASE KEEP IT DOWN', 44], ['— NAILS BY TRINH', 32, MARKER]], '#e8408a'), FR.right, -0.2, 2.3, 0.46, null, 0.02);
        dl.add(pMarker('IT IS STILL 1985 IN HERE -C.', '#1a1a1a', 30, 520), FR.right, 2.25, 1.05, 0.62, null, 0.02);
        cur.signText = 'UNIT 4B · WESTGATE PLAZA'; cur.hallProps = 2;
        cur.exterior = 'parking lot: ' + (D.snow ? 'snowbanks' : { summer: 'dry, sodium light', fall: 'leaves', winter: 'snowbanks', spring: 'puddles' }[D.season] || D.season);
      }

      // Room 6: Duke's uncle's Quonset (the Grid Road Ramblers, outside Swift Current). The right wall is corrugated steel that
      // curves over into the arch at the top (cut at the section); the end wall is plywood + steel with its top following the
      // arch; the big sliding door on a track (the door hotspot), hay bales stacked in the back-right corner with a pitchfork, a
      // tractor tire for the laptop desk, the grain-truck bench seat; outside (the yard's weather and glow stay): the farmyard, a
      // grain bin behind, the yard light on its pole, the grid road along the front, and canola / stubble + round bales / snow /
      // mud by season.
      function quonsetRoom(b, g, fx, W, dl, dg, band, D) {
        var H = ROOM.h, i, k, w = ROOM.wall, STEEL = MOODS[6].wall, PLY = 0xb8966a, x0 = ROOM.x0;
        var HB = 2.05, top = function (x) { var c = X1 - 1.4, R2 = 1.4, u = (x - c) / R2; return x <= c ? HB + 0.8 : HB + 0.8 * Math.sqrt(Math.max(0, 1 - u * u)); };
        // The right wall: corrugated steel to HB, then the arch curving in (four panels), cut at the section.
        b.box(w, HB, ROOM.z1 - ROOM.z0 + w, X1 + w / 2, HB / 2, (Z0 - w + ROOM.z1) / 2, STEEL);
        for (k = 0; k < 36; k++) b.box(0.03, HB, 0.05, X1 - 0.005, HB / 2, Z0 + 0.08 + k * 0.15, k % 2 ? 0xb0b6ba : 0x7e8488);             // the corrugation
        var prevX = X1, prevY = HB;
        for (i = 1; i <= 4; i++) {
          var a = i / 4 * 0.9, cx = X1 - 1.4 + 1.4 * Math.cos(a), cy = HB + 0.8 * Math.sin(a);
          var mx2 = (prevX + cx) / 2, my2 = (prevY + cy) / 2, len = Math.sqrt((cx - prevX) * (cx - prevX) + (cy - prevY) * (cy - prevY));
          b.box(len + 0.02, 0.06, ROOM.z1 - ROOM.z0 + w, mx2, my2, (Z0 - w + ROOM.z1) / 2, i % 2 ? 0x8e9498 : 0x9aa0a4, 0, 0, Math.atan2(cy - prevY, cx - prevX));
          prevX = cx; prevY = cy;
        }
        for (k = 0; k < 9; k++) { var rz = Z0 + 0.3 + k * 0.6; b.box(0.05, HB, 0.06, X1 - 0.04, HB / 2, rz, 0x6a6e72); }                    // steel ribs inside
        // The end wall: plywood sheets up to 2.44, corrugated steel to the arch line; the cut shows its thickness.
        for (i = 0; i < 23; i++) {
          var ex = x0 + 0.1 + i * 0.2, eh = top(ex);
          b.box(0.2, eh, w, ex, eh / 2, Z0 - w / 2, eh > 2.44 ? 0x8a9094 : STEEL);
          b.box(0.2, Math.min(2.44, eh), 0.012, ex, Math.min(2.44, eh) / 2, Z0 + 0.006, i % 6 === 5 ? sh(PLY, 0.8) : PLY);
          if (eh > 2.44) b.box(0.19, eh - 2.44, 0.014, ex, (eh + 2.44) / 2, Z0 + 0.007, i % 2 ? 0xa8aeb2 : 0x8e9498);
        }
        b.box(4.6, 0.04, 0.03, 0, 2.44, Z0 + 0.015, 0x6a5238); b.box(0.09, 2.44, 0.09, X1 - 0.045, 1.22, Z0 + 0.045, 0x6a5238);
        // The sliding door (steel, a rail over it, two rollers, a handle, the gap underneath where the snow gets in).
        var DX = PROPS.door.x - 0.05, DW = 1.9, DH = 2.2;
        b.box(DW + 0.5, 0.08, 0.1, DX + 0.2, DH + 0.1, Z0 + 0.06, 0x3a3a3e);
        for (i = -1; i <= 1; i += 2) b.cyl(0.05, 0.05, 0.04, 10, DX + i * 0.7, DH + 0.04, Z0 + 0.11, 0x2a2a2e, Math.PI / 2);
        b.box(DW, DH - 0.04, 0.05, DX, DH / 2, Z0 + 0.06, 0x8a9094);
        for (k = 0; k < 13; k++) b.box(0.035, DH - 0.06, 0.02, DX - DW / 2 + 0.08 + k * 0.145, DH / 2, Z0 + 0.095, k % 2 ? 0xa0a6aa : 0x767c80);
        b.box(DW, 0.06, 0.03, DX, 1.1, Z0 + 0.1, 0x6a6e72); b.box(0.06, 0.3, 0.06, DX + DW / 2 - 0.15, 1.1, Z0 + 0.12, 0x2a2a2e);
        g.box(DW - 0.1, 0.03, 0.01, DX, 0.02, Z0 + 0.04, 0x2a3450);                                                                          // the gap
        if (D.snow || D.season === 'winter') { b.box(DW * 0.7, 0.07, 0.3, DX - 0.2, 0.035, Z0 + 0.25, 0xeef2fa); b.box(DW * 0.4, 0.05, 0.18, DX + 0.3, 0.025, Z0 + 0.2, 0xf6f8fc); }   // snow blown in under it
        if (D.lights) { var LC = [0xff3b30, 0x34c759, 0x2f7fff, 0xffcc00, 0xfff4e0]; for (i = 0; i < 16; i++) g.box(0.04, 0.055, 0.04, DX - DW / 2 + i * DW / 15, DH + 0.2 - 0.05 * Math.sin(i * 0.9), Z0 + 0.12, LC[i % 5]); }
        // Floor: the slab, straw everywhere, an oil stain, a tractor's tire tracks from the door.
        tiles(b, 6, 7, [0x6e6254, 0x6a5e50, 0x726658, 0x665a4c], 0.004, 0.006);
        b.box(ROOM.x1 - ROOM.x0, 0.002, ROOM.z1 - ROOM.z0, 0, 0.002, 0, 0x4a4034);
        var rng = GG.RNG(61);
        for (i = 0; i < 70; i++) b.box(0.06 + rng.next() * 0.08, 0.005, 0.012, x0 + 0.2 + rng.next() * 4.2, 0.009, Z0 + 0.2 + rng.next() * 5.1, rng.next() < 0.5 ? 0xd8b860 : 0xc8a448, 0, rng.next() * 3, 0);
        for (i = -1; i <= 1; i += 2) for (k = 0; k < 8; k++) b.box(0.3, 0.004, 0.08, DX + i * 0.55, 0.008, Z0 + 0.3 + k * 0.28, 0x564a3c);
        blob(b, 0.6, 0.5, 0.35, 0x3a342c, 71, 0.0068);
        // Hay bales in the back-right corner (three, stacked), a pitchfork against them, a coil of baler twine.
        [[2.02, 0.19, -2.35, 0], [2.02, 0.19, -1.95, 0], [2.0, 0.56, -2.15, 0.06]].forEach(function (q) {
          b.box(0.5, 0.36, 0.38, q[0], q[1], q[2], 0xd8b860, 0, Math.PI / 2 + q[3], 0);
          b.box(0.51, 0.012, 0.02, q[0] - 0.19, q[1] - 0.08, q[2], 0xc8a448, 0, Math.PI / 2, 0); b.box(0.51, 0.012, 0.02, q[0] - 0.19, q[1] + 0.06, q[2], 0xe6c878, 0, Math.PI / 2, 0);
          b.box(0.39, 0.37, 0.016, q[0], q[1], q[2] - 0.13, 0x8a5a2a, 0, Math.PI / 2, 0); b.box(0.39, 0.37, 0.016, q[0], q[1], q[2] + 0.13, 0x8a5a2a, 0, Math.PI / 2, 0);
        });
        b.box(0.03, 1.5, 0.03, 1.72, 0.75, -1.72, 0x8a6a3a, 0.1, 0, 0.35); for (i = -1; i <= 1; i++) b.box(0.012, 0.22, 0.012, 1.46 + i * 0.03, 1.5, -1.64, 0xb8bcc2, 0.1, 0, 0.35);
        b.cyl(0.1, 0.1, 0.08, 10, 1.72, 0.04, -2.4, 0xe8702a);
        obs(tierObs, 2.02, -2.15, 0.46, 0.84, 0);
        // Farm tools hung on the end wall left of the door: a shovel, a grain scoop, a coil of rope; a tractor seat on a spring stool.
        b.at(-0.02, 0, Z0 + 0.06, 0);
        b.box(0.03, 1.2, 0.03, -0.02, 1.35, 0, 0x8a6a3a); b.box(0.2, 0.26, 0.02, -0.02, 0.72, 0.01, 0x8a8e94);
        b.box(0.03, 1.0, 0.03, 0.02, 1.45, 0.03, 0x8a6a3a, 0, 0, 0.2); b.box(0.3, 0.2, 0.06, 0.12, 1.98, 0.04, 0xb8bcc2, 0, 0, 0.2);
        b.at(0, 0, 0, 0);
        couchKindSet('bench'); tierZeroCouch(b, 'bench');
        tierZeroDesk(b, 'tire');
        sill(b, 0x5a5048);
        // Outside: the grain bin behind, the yard light on its pole, the grid road along the front, the field by season.
        buildFarmyard(b, g, D);
        dl.add(pSign(320, 110, '#2a5a2a', '#f2efe6', [['HARLAN FARMS', 56], ['EST. 1952 · NO TRESPASSING (DUKE OK)', 22]], '#f2efe6'), face(0, 0, Z0 + 0.02, 0), -1.5, 0.62, 0.62, null, 0.02);
        dl.add(pSign(260, 150, '#f2efe6', '#1a1a1a', [['SHUT THE DOOR', 44], ['THE CATS GET OUT', 32], ['-UNCLE RAY', 30, MARKER]], '#1a1a1a'), FR.right, -2.15, 1.35, 0.42, null, -0.02);
        cur.signText = 'HARLAN FARMS'; cur.hallProps = 4;
        cur.exterior = 'farmyard: ' + (D.snow ? 'snow' : { summer: 'canola', fall: 'stubble + round bales', winter: 'snow', spring: 'mud' }[D.season] || D.season);
      }
      function buildFarmyard(b, g, D) {
        var s = D.snow ? 'winter' : D.season, i, k, rng = GG.RNG(83);
        // The grain bin behind the end wall (its roof shows over the arch), the yard light, the grid road + ditch in front.
        b.at(-1.2, 0, -4.3, 0);
        b.cyl(1.2, 1.2, 3.3, 16, 0, 1.4, 0, 0x9aa0a6); for (k = 0; k < 10; k++) b.cyl(1.215, 1.215, 0.03, 16, 0, 0 + k * 0.33, 0, 0x7a8086);
        b.cyl(0.12, 1.28, 0.8, 16, 0, 3.45, 0, 0xa8aeb4); b.box(0.2, 0.14, 0.2, 0, 3.9, 0, 0x8a9096);
        b.at(-3.3, 0, 3.4, 0);
        b.box(0.14, 5.0, 0.14, 0, 2.2, 0, 0x5a4432); b.box(1.2, 0.08, 0.08, 0, 4.5, 0, 0x5a4432); b.box(0.5, 0.06, 0.08, 0.3, 4.1, 0, 0x2a2a2e, 0, 0, -0.3);
        g.box(0.22, 0.1, 0.22, 0.52, 3.97, 0, 0xfff0c0);
        b.at(0, 0, 0, 0);
        var road = s === 'winter' ? 0xd8dce4 : s === 'spring' ? 0x6a5a48 : 0x8a7a64;
        b.box(16, 0.06, 1.3, -1.5, -0.3, 5.1, road, 0, 0.08, 0); b.box(16, 0.04, 0.6, -1.5, -0.33, 5.95, s === 'winter' ? 0xe6eaf2 : 0x3a4a2a, 0, 0.08, 0);   // the grid road, the ditch
        for (i = 0; i < 10; i++) b.box(0.18, 0.02, 0.1, -7 + i * 1.3 + rng.next() * 0.5, -0.26, 5.0 + rng.next() * 0.6, s === 'winter' ? 0xc8ccd6 : 0x9a8a74);   // gravel
        b.box(0.08, 1.1, 0.08, 2.9, 0.25, 4.2, 0x6a5238); b.box(0.36, 0.2, 0.2, 2.9, 0.86, 4.2, 0x2a2a2e); b.box(0.12, 0.08, 0.02, 3.06, 0.9, 4.28, 0xc0302a);   // the mailbox
        // The field (front-left, beyond the cut) + the season.
        var FX0 = -6.4, FX1 = -2.9, FZ0 = -3.4, FZ1 = 4.2;
        if (s === 'summer') {                                    // canola in bloom: rows of yellow
          for (i = 0; i < 9; i++) { b.box(0.3, 0.14, FZ1 - FZ0, FX0 + i * 0.42, -0.26, (FZ0 + FZ1) / 2, 0x3a6a2a); for (k = 0; k < 16; k++) { var ch = 0.1 + rng.next() * 0.08; b.box(0.26, ch, 0.34, FX0 + i * 0.42 + (rng.next() - 0.5) * 0.06, -0.19 + ch / 2, FZ0 + k * 0.48, rng.next() < 0.25 ? 0xd8b418 : 0xecca28); } }
          for (i = 0; i < 12; i++) b.box(0.62, 0.12, 0.3, -2.4 + i * 0.66, -0.24, 4.35 + (i % 2) * 0.08, i % 3 ? 0xecca28 : 0xd8b418);   // the headland along the road
        } else if (s === 'fall') {                               // stubble + round bales
          for (i = 0; i < 9; i++) b.box(0.3, 0.06, FZ1 - FZ0, FX0 + i * 0.42, -0.27, (FZ0 + FZ1) / 2, i % 2 ? 0xb89a5a : 0xa88a4a);
          [[-4.2, -1.2], [-5.2, 1.4], [-3.6, 2.8], [1.6, 3.8]].forEach(function (p) { b.cyl(0.55, 0.55, 0.9, 12, p[0], 0.25, p[1], 0xc8a458, 0, 0.3, Math.PI / 2); b.cyl(0.45, 0.45, 0.92, 10, p[0], 0.25, p[1], 0xb08a44, 0, 0.3, Math.PI / 2); });
        } else if (s === 'winter') {                             // snow over everything, drifts along the Quonset's side
          for (i = 0; i < 12; i++) b.box(0.8 + rng.next() * 0.8, 0.08 + rng.next() * 0.08, 0.7, FX0 + rng.next() * 3.6, -0.3, FZ0 + i * 0.65, 0xc8d0dc, 0, rng.next(), 0);
          for (i = 0; i < 6; i++) b.box(1.0, 0.12, 0.5, -1.6 + i * 1.2, -0.28, 4.3, 0xd0d6e2, 0, 0.1 * i, 0);
        } else {                                                 // spring: mud, puddles, the first green
          for (i = 0; i < 9; i++) b.box(0.3, 0.04, FZ1 - FZ0, FX0 + i * 0.42, -0.28, (FZ0 + FZ1) / 2, i % 2 ? 0x5a4632 : 0x4e3c2a);
          for (i = 0; i < 40; i++) b.box(0.03, 0.08, 0.03, FX0 + rng.next() * 3.6, -0.22, FZ0 + rng.next() * (FZ1 - FZ0), 0x6aa84a);
          b.cyl(0.6, 0.6, 0.01, 12, 1.0, -0.26, 4.95, 0x3a4a6a); b.cyl(0.4, 0.4, 0.01, 10, -3.0, -0.26, 5.2, 0x3a4a6a);
        }
      }
      var couchKind = null;
      function couchKindSet(k) { couchKind = k; }
      // Painters for the tier-0 rooms (the atlas): the storefront's night view, window vinyl, frost, a 1985 poster, the lot.
      function paintLotView(D, band) {
        var r = region(1000, 500), x = r.x, y = r.y, w = r.w, h = r.h, rng = GG.RNG(97), i, s = D.snow ? 'winter' : D.season;
        var sky = ag.createLinearGradient(0, y, 0, y + h * 0.5); sky.addColorStop(0, '#05070e'); sky.addColorStop(1, '#1a1e30');
        ag.fillStyle = sky; ag.fillRect(x, y, w, h * 0.5);
        ag.fillStyle = '#0c0d12'; ag.fillRect(x, y + h * 0.36, w, h * 0.14);                                                         // the far side of 170 Street
        for (i = 0; i < 14; i++) { ag.fillStyle = rng.next() < 0.5 ? '#ffcf70' : '#e8f0ff'; ag.fillRect(x + rng.next() * w, y + h * (0.38 + rng.next() * 0.08), 3, 3); }
        ag.fillStyle = 'rgba(255,60,40,0.6)'; ag.fillRect(x + w * 0.1, y + h * 0.48, w * 0.8, 2); ag.fillStyle = 'rgba(255,240,200,0.6)'; ag.fillRect(x + w * 0.05, y + h * 0.495, w * 0.9, 2);   // traffic
        var lot = ag.createLinearGradient(0, y + h * 0.5, 0, y + h); lot.addColorStop(0, s === 'winter' ? '#5a5e6a' : '#2a2a2e'); lot.addColorStop(1, s === 'winter' ? '#8a8e9a' : '#3e3c3a');
        ag.fillStyle = lot; ag.fillRect(x, y + h * 0.5, w, h * 0.5);
        ag.strokeStyle = s === 'winter' ? 'rgba(240,240,250,0.35)' : '#d8c040'; ag.lineWidth = 4;
        for (i = -6; i <= 6; i++) { ag.beginPath(); ag.moveTo(x + w / 2 + i * 40, y + h * 0.55); ag.lineTo(x + w / 2 + i * 150, y + h); ag.stroke(); }   // stall lines in perspective
        var lamp = ag.createRadialGradient(x + w * 0.3, y + h * 0.62, 0, x + w * 0.3, y + h * 0.62, h * 0.5);            // the sodium pool
        lamp.addColorStop(0, 'rgba(255,170,70,0.55)'); lamp.addColorStop(1, 'rgba(255,170,70,0)'); ag.fillStyle = lamp; ag.fillRect(x, y + h * 0.3, w, h * 0.7);
        ag.fillStyle = '#1a1a1e'; ag.fillRect(x + w * 0.3 - 3, y + h * 0.14, 6, h * 0.5); ag.fillRect(x + w * 0.3 - 2, y + h * 0.14, 50, 5);
        ag.fillStyle = '#ffb050'; ag.fillRect(x + w * 0.3 + 34, y + h * 0.14 + 4, 24, 8);
        // The plaza pylon: WESTGATE PLAZA, the tenants (the band on a paper sign taped over an old panel).
        var px = x + w * 0.72, py = y + h * 0.08, pw = w * 0.18;
        ag.fillStyle = '#2a2a30'; ag.fillRect(px + pw / 2 - 6, py + h * 0.5, 12, h * 0.1);
        ag.fillStyle = '#3a3a44'; ag.fillRect(px, py, pw, h * 0.5);
        ag.fillStyle = '#ff5a8a'; ag.font = font(STENCIL, 26); ag.textAlign = 'center'; ag.textBaseline = 'middle'; ag.fillText('WESTGATE', px + pw / 2, py + 22); ag.fillText('PLAZA', px + pw / 2, py + 50);
        var ten = ['NAILS BY TRINH', 'VAC-U-FIX', 'UNIT 4B: ' + String((band && band.name) || 'THE BAND').toUpperCase(), 'FOR LEASE'];
        for (i = 0; i < 4; i++) {
          ag.fillStyle = i === 2 ? '#f2efe6' : '#e8e4d8'; ag.fillRect(px + 8, py + 72 + i * 44, pw - 16, 36);
          fitText(ten[i], STENCIL, 22, pw - 26); ag.fillStyle = i === 2 ? '#c0141c' : '#1a1a1a'; ag.fillText(ten[i], px + pw / 2, py + 90 + i * 44);
        }
        // A parked '85 Camaro-ish coupe (Chase's), a stray cart, the season.
        ag.fillStyle = '#5a1a1a'; ag.beginPath(); ag.moveTo(x + w * 0.42, y + h * 0.86); ag.lineTo(x + w * 0.44, y + h * 0.78); ag.lineTo(x + w * 0.5, y + h * 0.74); ag.lineTo(x + w * 0.58, y + h * 0.74); ag.lineTo(x + w * 0.62, y + h * 0.79); ag.lineTo(x + w * 0.66, y + h * 0.8); ag.lineTo(x + w * 0.66, y + h * 0.86); ag.closePath(); ag.fill();
        ag.fillStyle = '#9ab0c8'; ag.fillRect(x + w * 0.5, y + h * 0.755, w * 0.07, h * 0.03);
        ag.fillStyle = '#111'; ag.beginPath(); ag.arc(x + w * 0.47, y + h * 0.87, 14, 0, Math.PI * 2); ag.arc(x + w * 0.62, y + h * 0.87, 14, 0, Math.PI * 2); ag.fill();
        ag.strokeStyle = '#8a8e94'; ag.lineWidth = 3; ag.strokeRect(x + w * 0.14, y + h * 0.8, 40, 26);
        if (s === 'winter') { ag.fillStyle = '#e8ecf4'; for (i = 0; i < 5; i++) { ag.beginPath(); ag.ellipse(x + w * (0.05 + i * 0.07), y + h * 0.66, 60, 30 + i * 4, 0, Math.PI, 0); ag.fill(); } for (i = 0; i < 90; i++) ag.fillRect(x + rng.next() * w, y + rng.next() * h, 3, 3); }
        else if (s === 'fall') { for (i = 0; i < 40; i++) { ag.fillStyle = ['#d9822b', '#c0612a', '#e8b040'][i % 3]; ag.fillRect(x + rng.next() * w, y + h * (0.6 + rng.next() * 0.4), 8, 5); } }
        else if (s === 'spring') { ag.fillStyle = 'rgba(120,150,200,0.35)'; for (i = 0; i < 5; i++) { ag.beginPath(); ag.ellipse(x + rng.next() * w, y + h * (0.7 + rng.next() * 0.25), 50 + rng.next() * 40, 10, 0, 0, Math.PI * 2); ag.fill(); } }
        return r;
      }
      function pVinyl(t) {                                        // white vinyl letters on glass, read backwards from inside
        var r = region(360, 70);
        ag.save(); ag.translate(r.x + r.w, r.y); ag.scale(-1, 1);
        fitText(t, STENCIL, 56, r.w - 20); ag.fillStyle = '#f2efe6'; ag.textAlign = 'center'; ag.textBaseline = 'middle'; ag.fillText(t, r.w / 2, r.h / 2);
        ag.restore();
        return r;
      }
      function pFrost() {
        var r = region(200, 90), gr = ag.createLinearGradient(0, r.y + r.h, 0, r.y);
        gr.addColorStop(0, 'rgba(236,244,255,0.95)'); gr.addColorStop(1, 'rgba(236,244,255,0)');
        ag.fillStyle = gr; ag.beginPath(); ag.moveTo(r.x, r.y + r.h);
        for (var i = 0; i <= 10; i++) ag.lineTo(r.x + i * r.w / 10, r.y + r.h * (0.25 + 0.35 * Math.abs(Math.sin(i * 1.7))));
        ag.lineTo(r.x + r.w, r.y + r.h); ag.closePath(); ag.fill();
        return r;
      }
      function pPoster(t1, t2, bg, c1, c2) {                     // a 1985 gig poster: grid sun, chrome title
        var r = region(240, 340), x = r.x, y = r.y, w = r.w, h = r.h, i;
        ag.fillStyle = bg; ag.fillRect(x, y, w, h);
        ag.fillStyle = c2; ag.beginPath(); ag.arc(x + w / 2, y + h * 0.5, w * 0.3, Math.PI, 0); ag.fill();
        ag.strokeStyle = c1; ag.lineWidth = 2; for (i = 0; i < 8; i++) { ag.beginPath(); ag.moveTo(x, y + h * 0.5 + i * i * 3); ag.lineTo(x + w, y + h * 0.5 + i * i * 3); ag.stroke(); }
        for (i = -5; i <= 5; i++) { ag.beginPath(); ag.moveTo(x + w / 2, y + h * 0.5); ag.lineTo(x + w / 2 + i * 50, y + h); ag.stroke(); }
        text(t1, x + w / 2, y + h * 0.18, STENCIL, 40, c1, w - 20, null, 0.8);
        text(t2, x + w / 2, y + h * 0.3, STENCIL, 22, '#f2efe6', w - 20);
        return r;
      }
      // The strip mall's parking lot outside the cut walls (the hall canvas corner): asphalt, stalls, a curb, the season.
      function paintLot(D) {
        var R0 = { x: 0, y: 512, w: 512, h: 512 }, px = 512 / HALL.size, X = function (x) { return R0.x + (x - HALL.x0) * px; }, Y = function (z) { return R0.y + (z - HALL.z0) * px; };
        var rng = GG.RNG(311), i, s = D.snow ? 'winter' : D.season;
        ag.save(); ag.beginPath(); ag.rect(R0.x, R0.y, R0.w, R0.h); ag.clip();
        ag.fillStyle = s === 'winter' ? '#5a606c' : '#34343a'; ag.fillRect(R0.x, R0.y, R0.w, R0.h);
        for (i = 0; i < 300; i++) { ag.fillStyle = rng.next() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.12)'; ag.fillRect(R0.x + rng.next() * R0.w, R0.y + rng.next() * R0.h, 3, 3); }
        ag.fillStyle = '#8a8680'; ag.fillRect(R0.x, Y(2.75), R0.w, 0.25 * px); ag.fillRect(X(-2.55), R0.y, 0.25 * px, R0.h);        // the sidewalk curb
        ag.fillStyle = s === 'winter' ? 'rgba(250,250,255,0.6)' : '#d8c040';
        for (i = 0; i < 8; i++) { ag.fillRect(X(-4.5 + i * 1.3), Y(3.4), 0.08 * px, 1.8 * px); ag.fillRect(X(-5.2), Y(-3 + i * 1.1), 1.8 * px, 0.08 * px); }
        if (s === 'winter') { ag.fillStyle = '#c8ccd8'; ag.beginPath(); ag.ellipse(X(-4.2), Y(4.4), 1.6 * px, 0.8 * px, 0, 0, Math.PI * 2); ag.fill(); }
        else if (s === 'fall') for (i = 0; i < 60; i++) { ag.fillStyle = ['#d9822b', '#c0612a', '#e8b040'][i % 3]; ag.fillRect(R0.x + rng.next() * R0.w, R0.y + rng.next() * R0.h, 5, 3); }
        else if (s === 'spring') { ag.fillStyle = 'rgba(90,110,150,0.5)'; ag.beginPath(); ag.ellipse(X(-1.2), Y(4.0), 0.9 * px, 0.4 * px, 0, 0, Math.PI * 2); ag.fill(); }
        ag.restore();
        ag.save(); ag.beginPath(); ag.rect(R0.x, R0.y, R0.w, R0.h); ag.clip(); ag.globalCompositeOperation = 'destination-in';
        var cx = X(-0.2), cy = Y(0.8), gr = ag.createRadialGradient(cx, cy, 0, cx, cy, 5.0 * px);
        gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.6, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        ag.fillStyle = gr; ag.fillRect(R0.x, R0.y, R0.w, R0.h); ag.restore();
        return R0;
      }

      function buildRoom(tier, green, band, catering, D) {   // (v0.9: tier = the room index: 1..3 rented, 4..6 the tier-0 rooms; D = decor flags)
        var b = new ctx.Builder({ jitter: 0.04, seed: 80 + tier }), g = new ctx.Builder({ jitter: 0, seed: 90 + tier }), fx = new ctx.Builder({ jitter: 0, seed: 95 + tier });
        var W = { p: [], n: [], uv: [], c: [] }, dl = new DecalSet(), dg = new DecalSet(), hl = new DecalSet();
        tierObs.length = 0; cur.hallProps = 0; cur.signText = ''; cur.exterior = null;
        if (tier) ensureAtlas();
        resetAtlas();
        paintNames(band);
        if (tier) {
          if (tier === 1) jamRoom(b, g, fx, W, dl, dg, band);
          else if (tier === 2) studioRoom(b, g, fx, W, dl, dg, band);
          else if (tier === 3) backstageRoom(b, g, fx, W, dl, dg, band, green, catering);
          else if (tier === 4) laundromatRoom(b, g, fx, W, dl, dg, band, D || {});
          else if (tier === 5) stripMallRoom(b, g, fx, W, dl, dg, band, D || {});
          else quonsetRoom(b, g, fx, W, dl, dg, band, D || {});
          if (tier <= 3) hl.add(paintHall(tier), FR.hall, HALL.x0 + HALL.size / 2, -(HALL.z0 + HALL.size / 2), HALL.size, HALL.size);
          else if (tier === 5) hl.add(paintLot(D || {}), FR.hall, HALL.x0 + HALL.size / 2, -(HALL.z0 + HALL.size / 2), HALL.size, HALL.size);
          atex.needsUpdate = true;
        }
        swap(room, tier ? b : null); swap(roomGlow, tier ? g : null); swap(fix, tier ? fx : null);
        wash.geometry.dispose(); var wg = tier && buildWash(W); wash.geometry = wg || new THREE.BufferGeometry(); wash.visible = !!wg;
        swap(decal, tier ? dl : null); swap(decalGlow, tier ? dg : null); swap(hall, tier ? hl : null);
        cur.decals = tier ? (dl.count() + dg.count()) / 6 : 0;
      }

      /* ---- upgrades ------------------------------------------------------------------------------------------- */
      function eggFoam(b, w, h, x, y, z) {                                    // a foam panel of little pyramids (boxes)
        b.box(w, h, 0.02, x, y, z, 0x6e5c64);
        var nx = Math.round(w / 0.1), ny = Math.round(h / 0.1);
        for (var i = 0; i < nx; i++) for (var j = 0; j < ny; j++) if ((i + j) % 2 === 0) b.box(0.07, 0.07, 0.035, x - w / 2 + 0.05 + i * 0.1, y - h / 2 + 0.05 + j * 0.1, z + 0.02, 0x86727c);
      }
      // v0.9 (fixer): the tier-0 upgrades look like what each space's shop sold them as (content/shop.js upgrades[].bySpace):
      // the laundromat's lint bags + pop machine, the strip mall's ceiling foam tiles + salon mini-fridge + neon OPEN sign,
      // the Quonset's tailgate bench + hay-bale baffles + chest freezer + yard lights. Same spots and footprints as the
      // parents' garage versions (the couch and the fridge move with the band, so they follow the band's space, not the room).
      function hayBale(b, w, h, d, x, y, z) {
        b.box(w, h, d, x, y, z, 0xd2ae4a);
        b.box(w + 0.012, h + 0.012, 0.025, x, y, z - d * 0.28, 0x8a6a2a); b.box(w + 0.012, h + 0.012, 0.025, x, y, z + d * 0.28, 0x8a6a2a);   // twine
        b.box(w * 0.3, 0.02, d * 0.4, x - w * 0.18, y + h / 2 + 0.008, z, 0xe6c86a, 0, 0.4, 0);                                          // loose straw
      }
      function lintBags(b, w, h, x, y, z) {                                 // clear bags of grey lint, stapled to the blocks
        var nx = Math.max(1, Math.round(w / 0.24)), ny = Math.max(1, Math.round(h / 0.3)), i, j;
        for (i = 0; i < nx; i++) for (j = 0; j < ny; j++) {
          var bx = x - w / 2 + (i + 0.5) * w / nx, by = y - h / 2 + (j + 0.5) * h / ny, sz = 0.9 + ((i * 7 + j * 3) % 5) * 0.03;
          b.box(w / nx * 0.92 * sz, h / ny * 0.88, 0.06, bx, by, z + 0.03, (i + j) % 2 ? 0x9ea4ae : 0x8c929e);
          b.box(w / nx * 0.5, 0.02, 0.065, bx, by + h / ny * 0.42, z + 0.035, 0xd8dce2);                                                 // the knotted top
        }
      }
      function balesOnLedge(b, w, x, y, z, rows) {                          // hay-bale baffles: bales stacked on a 2x8 ledge
        var n = Math.max(1, Math.round(w / 0.42)), i, j;
        b.box(w + 0.06, 0.04, 0.3, x, y - 0.02, z + 0.15, 0x7a5a3a);
        for (j = 0; j < rows; j++) for (i = 0; i < n - (j % 2); i++) hayBale(b, w / n * 0.96, 0.26, 0.28, x - w / 2 + (i + 0.5 + (j % 2) * 0.5) * w / n, y + 0.13 + j * 0.27, z + 0.15);
      }
      function buildUps(list, tier, ri, kind) {
        var b = new ctx.Builder({ jitter: 0.04, seed: 101 }), g = new ctx.Builder({ jitter: 0, seed: 102 }), i, k, has = function (id) { return list.indexOf(id) >= 0; };
        upObs.length = 0;
        kind = kind || 'garage';
        if (has('curb_couch')) {                                                            // floral loveseat, from the curb, facing the kit
          b.at(-0.55, 0, 2.42, Math.PI);                                                    // (between the merch + laptop stands: see stand())
          if (kind === 'quonset') {                                                         // the tailgate bench: a truck seat on two hay bales
            hayBale(b, 0.36, 0.28, 0.5, -0.19, 0.14, 0); hayBale(b, 0.36, 0.28, 0.5, 0.19, 0.14, 0);
            b.box(0.76, 0.1, 0.46, 0, 0.33, 0.02, 0x5a3a2a); b.box(0.76, 0.42, 0.11, 0, 0.58, -0.2, 0x4e3224, -0.1);
            b.box(0.72, 0.012, 0.014, 0, 0.385, 0.25, 0x2a1a10); b.box(0.16, 0.012, 0.1, 0.18, 0.386, 0.06, 0xb9bdc4, 0, 0.3, 0);   // piping, a duct-tape patch
          } else {
            var FB = kind === 'laundromat' ? 0xc0642a : kind === 'stripmall' ? 0xd87aa8 : 0xb08a3a;   // orange vinyl / salon pink / floral gold
            b.box(0.7, 0.22, 0.54, 0, 0.26, 0, FB); b.box(0.7, 0.46, 0.14, 0, 0.58, -0.21, sh(FB, 0.92), -0.08);
            b.box(0.1, 0.32, 0.56, 0.35, 0.44, 0, sh(FB, 0.85)); b.box(0.1, 0.32, 0.56, -0.35, 0.44, 0, sh(FB, 0.85));
            for (k = 0; k < 4; k++) b.box(0.05, 0.14, 0.05, (k % 2 ? 0.3 : -0.3), 0.07, (k < 2 ? 0.21 : -0.21), kind === 'stripmall' ? 0xc0c4ca : 0x3a2410);
            if (kind === 'laundromat') {                                                    // a dryer sheet and a lost sock on the cushion
              b.box(0.16, 0.006, 0.12, -0.14, 0.374, 0.05, 0xf2efe6, 0, 0.5, 0); b.box(0.06, 0.03, 0.16, 0.16, 0.385, 0.02, 0x7a9ad8, 0, -0.4, 0);
            } else if (kind === 'stripmall') {                                              // a waiting-room magazine, two years old
              b.box(0.18, 0.012, 0.24, 0.12, 0.377, 0.04, 0xe8e0d0, 0, 0.3, 0); b.box(0.18, 0.004, 0.06, 0.12, 0.385, -0.02, 0xd04a7a, 0, 0.3, 0);
            } else {
              for (k = 0; k < 7; k++) b.box(0.06, 0.06, 0.012, -0.24 + (k % 4) * 0.16 + (k > 3 ? 0.08 : 0), 0.46 + (k > 3 ? 0.2 : 0), -0.13, [0xc0392b, 0xe8d8b0, 0x5f8f45][k % 3], -0.08);
              b.box(0.24, 0.02, 0.18, 0.12, 0.375, 0.05, 0x8a6a2a, 0, 0.3, 0);             // a stain shaped like Manitoba
            }
          }
          obs(upObs, -0.55, 2.42, 0.8, 0.58, 0);
        }
        if (has('beer_fridge')) {                                                           // Dad's fridge, plugged into the outlet
          b.at(X1 - 0.25, 0, -0.45, -Math.PI / 2); g.at(X1 - 0.25, 0, -0.45, -Math.PI / 2);
          if (kind === 'laundromat') {                                                      // the pop machine, out of order since 1994
            b.box(0.5, 1.5, 0.44, 0, 0.75, 0, 0xb8282a); b.box(0.36, 0.78, 0.01, -0.05, 1.02, 0.222, 0xe8e2d0);
            for (k = 0; k < 6; k++) b.box(0.07, 0.05, 0.012, 0.18, 1.32 - k * 0.09, 0.226, k % 2 ? 0xf2efe6 : 0x2a2a2e);
            b.box(0.03, 0.08, 0.012, 0.18, 0.7, 0.226, 0x1a1a1e); b.box(0.3, 0.12, 0.06, -0.04, 0.2, 0.2, 0x1a1a1e);   // coin slot, the chute
            b.box(0.15, 0.09, 0.004, -0.06, 0.86, 0.229, 0xf6f2e2, 0, 0, 0.12);           // OUT OF ORDER (taped on)
            g.box(0.38, 0.06, 0.004, -0.04, 1.44, 0.229, 0xff6a5a);
          } else if (kind === 'stripmall') {                                                // the salon mini-fridge (it hums in E)
            b.box(0.46, 0.52, 0.42, 0, 0.26, 0, 0xf0eeea); b.box(0.46, 0.012, 0.012, 0, 0.4, 0.212, 0xb0aca4); b.box(0.03, 0.12, 0.04, 0.19, 0.3, 0.22, 0x9aa0a8);
            b.box(0.04, 0.07, 0.04, -0.12, 0.555, 0.02, 0xe0407a); b.box(0.04, 0.07, 0.04, -0.04, 0.555, -0.04, 0xa01a3a);   // nail polish on top
            b.box(0.02, 0.04, 0.02, -0.12, 0.61, 0.02, 0x1a1a1e); b.box(0.02, 0.04, 0.02, -0.04, 0.61, -0.04, 0x1a1a1e);
            b.box(0.12, 0.08, 0.004, 0.02, 0.2, 0.213, 0xff9ac8, 0, 0, 0.15);           // a sticker: a heart
          } else if (kind === 'quonset') {                                                  // the chest freezer: snacks one side, beef the other
            b.box(0.7, 0.6, 0.44, 0, 0.3, 0, 0xeceae2); b.box(0.72, 0.05, 0.46, 0, 0.625, 0, 0xf6f4ec);
            b.box(0.2, 0.03, 0.03, 0, 0.58, 0.235, 0x9aa0a8); b.box(0.7, 0.012, 0.012, 0, 0.6, 0.222, 0xb0aca4);
            b.box(0.18, 0.06, 0.004, -0.2, 0.42, 0.223, 0xe8dcb0, 0, 0, 0.05); b.box(0.18, 0.06, 0.004, 0.2, 0.42, 0.223, 0xe8dcb0, 0, 0, -0.05);   // two tape labels
            b.box(0.2, 0.05, 0.14, 0.18, 0.672, 0.02, 0xd8c050, 0, 0.3, 0);               // a bag of chips on the lid
          } else {
            b.box(0.5, 0.78, 0.44, 0, 0.4, 0, 0xe6e3da); b.box(0.5, 0.012, 0.012, 0, 0.56, 0.222, 0xa8a49a);
            b.box(0.03, 0.18, 0.04, 0.2, 0.42, 0.24, 0x9aa0a8);
            b.box(0.12, 0.08, 0.004, -0.1, 0.66, 0.223, 0xc0392b); b.box(0.08, 0.1, 0.004, 0.08, 0.3, 0.223, 0x2f6fd1, 0, 0, 0.2); b.box(0.1, 0.06, 0.004, -0.12, 0.2, 0.223, 0xe8c531, 0, 0, -0.15);
            b.box(0.05, 0.02, 0.05, -0.18, 0.02, 0.18, 0x222222); b.box(0.05, 0.02, 0.05, 0.18, 0.02, 0.18, 0x222222);
            b.cyl(0.03, 0.03, 0.12, 8, -0.12, 0.85, 0, 0x9ad13a); b.cyl(0.03, 0.03, 0.12, 8, 0.02, 0.85, 0.05, 0x7a4a1a);   // cans on top
          }
          obs(upObs, X1 - 0.25, -0.45, kind === 'quonset' ? 0.72 : 0.5, 0.46, -Math.PI / 2);
        }
        if (has('xmas_lights') && kind === 'stripmall') {                                   // the neon OPEN sign the last tenant left, in the window
          b.at(-0.2, 0, Z0, 0); g.at(-0.2, 0, Z0, 0);
          b.box(0.82, 0.36, 0.03, 0, 1.95, 0.16, 0x141418); b.box(0.008, 0.36, 0.008, -0.36, 2.3, 0.16, 0x9aa0a8); b.box(0.008, 0.36, 0.008, 0.36, 2.3, 0.16, 0x9aa0a8);
          var NP = 0xff4fb0, NB = 0x40e0ff, NZ = 0.18, NY = 1.95, sw = 0.024;
          g.box(0.76, sw, 0.01, 0, NY + 0.15, NZ, NB); g.box(0.76, sw, 0.01, 0, NY - 0.15, NZ, NB); g.box(sw, 0.3, 0.01, -0.37, NY, NZ, NB); g.box(sw, 0.3, 0.01, 0.37, NY, NZ, NB);
          [-0.255, -0.085, 0.085, 0.255].forEach(function (lx, li) {                         // O P E N
            var L = lx - 0.055, R = lx + 0.055, T = NY + 0.085, B2 = NY - 0.085;
            g.box(sw, 0.17, 0.01, L, NY, NZ, NP);
            if (li === 0) { g.box(sw, 0.17, 0.01, R, NY, NZ, NP); g.box(0.11, sw, 0.01, lx, T, NZ, NP); g.box(0.11, sw, 0.01, lx, B2, NZ, NP); }
            if (li === 1) { g.box(0.11, sw, 0.01, lx, T, NZ, NP); g.box(0.11, sw, 0.01, lx, NY, NZ, NP); g.box(sw, 0.085, 0.01, R, NY + 0.042, NZ, NP); }
            if (li === 2) { g.box(0.11, sw, 0.01, lx, T, NZ, NP); g.box(0.09, sw, 0.01, lx - 0.01, NY, NZ, NP); g.box(0.11, sw, 0.01, lx, B2, NZ, NP); }
            if (li === 3) { g.box(sw, 0.17, 0.01, R, NY, NZ, NP); g.box(sw, 0.2, 0.01, lx, NY, NZ, NP, 0, 0, 0.58); }
          });
        } else if (has('xmas_lights') && kind === 'quonset') {                              // two farm yard lights bolted to the arch
          [-1.7, 1.3].forEach(function (lz) {
            b.at(X1, 0, lz, -Math.PI / 2); g.at(X1, 0, lz, -Math.PI / 2);
            b.box(0.12, 0.12, 0.03, 0, 2.38, 0.015, 0x4a4e54); b.box(0.04, 0.04, 0.42, 0, 2.38, 0.22, 0x5a5e64);
            b.cyl(0.08, 0.17, 0.11, 10, 0, 2.33, 0.44, 0x6a7a6e); g.cyl(0.075, 0.075, 0.02, 10, 0, 2.27, 0.44, 0xfff1c0);
            for (k = 0; k < 3; k++) b.box(0.03, 0.006, 0.022, -0.1 + k * 0.1, 2.12 - (k % 2) * 0.08, 0.36 + k * 0.05, 0x8a7a60, 0, k * 0.9, 0);   // the moths
          });
        } else if (has('xmas_lights')) {                                                    // up all year, round the whiteboard (the laundromat's too)
          b.at(X1, 0, PROPS.board.z, -Math.PI / 2); g.at(X1, 0, PROPS.board.z, -Math.PI / 2);
          var XC = [0xff3b30, 0x34c759, 0x2f7fff, 0xffcc00, 0xff66dd], n = 0;
          for (k = 0; k <= 16; k++) { var u = -0.84 + k * 0.105, sag = 0.04 * Math.sin((k % 4) / 4 * Math.PI); g.box(0.04, 0.055, 0.04, u, 1.96 - sag, 0.06, XC[n++ % 5]); }
          for (k = 1; k <= 8; k++) { g.box(0.04, 0.055, 0.04, -0.86, 1.96 - k * 0.12, 0.06, XC[n++ % 5]); g.box(0.04, 0.055, 0.04, 0.86, 1.96 - k * 0.12, 0.06, XC[n++ % 5]); }
          b.box(1.72, 0.008, 0.008, 0, 1.95, 0.06, 0x1a3a1a);
        }
        if (has('egg_foam') && kind === 'stripmall' && ri === 5) {                          // foam tiles in Unit 4B's drop ceiling (stripMallRoom's CY strip)
          var FT = 0x4a4c56, FU = 0x5e606c, CY2 = 2.658;
          b.at(0, 0, 0, 0);
          for (i = 0; i < 8; i++) { b.box(0.56, 0.016, 0.46, -2.0 + i * 0.6, CY2, Z0 + 0.25, FT); for (k = 0; k < 4; k++) b.box(0.1, 0.035, 0.1, -2.12 + i * 0.6 + (k % 2) * 0.24, CY2 + 0.02, Z0 + 0.15 + (k > 1 ? 0.2 : 0), FU); }
          for (i = 0; i < 9; i++) { b.box(0.46, 0.016, 0.56, X1 - 0.25, CY2, -2.1 + i * 0.6, FT); for (k = 0; k < 4; k++) b.box(0.1, 0.035, 0.1, X1 - 0.35 + (k % 2) * 0.2, CY2 + 0.02, -2.22 + i * 0.6 + (k > 1 ? 0.24 : 0), FU); }
        } else if (has('egg_foam') && kind === 'laundromat') {                              // dryer-lint insulation: bags of it, stapled up
          b.at(0, 0, Z0, 0); lintBags(b, 1.0, 0.9, -0.45, 1.72, 0.07);
          b.at(X1, 0, 0, -Math.PI / 2); lintBags(b, 0.4, 1.3, 2.42, 1.65, 0.03);
        } else if (has('egg_foam') && kind === 'quonset') {                                 // hay-bale baffles along the steel walls
          b.at(0, 0, Z0, 0); balesOnLedge(b, 1.1, -0.45, 1.3, 0.04, 2);
          b.at(X1, 0, 0, -Math.PI / 2); balesOnLedge(b, 0.84, 2.3, 1.5, 0.0, 2);
        } else if (has('egg_foam')) {                                                       // stapled to every wall
          // (Unit 4B's back wall is the shop window left of x 1.52: its patch goes on the bit of drywall right of the door)
          b.at(0, 0, Z0, 0); if (ri === 5) eggFoam(b, 0.6, 0.9, 1.91, 1.72, 0.07); else eggFoam(b, 1.0, 0.9, -0.45, 1.72, 0.07);
          b.at(X1, 0, 0, -Math.PI / 2); eggFoam(b, 0.4, 1.3, 2.42, 1.65, 0.03);
        }
        if (has('leather_couch')) {                                                         // one cushion is leather, the rest are hope
          b.at(X1 - 0.42, 0, PROPS.couch.z, -Math.PI / 2);
          var LC = 0x3a2418;
          b.box(1.58, 0.3, 0.86, 0, 0.21, 0, LC); b.box(1.58, 0.56, 0.24, 0, 0.63, -0.33, LC);
          b.box(0.2, 0.56, 0.86, 0.84, 0.41, 0, sh(LC, 0.9)); b.box(0.2, 0.56, 0.86, -0.84, 0.41, 0, sh(LC, 0.9));
          for (k = -1; k <= 1; k++) { b.box(0.49, 0.16, 0.66, k * 0.49, 0.42, 0.07, k ? 0x2a1c14 : 0x6a3a22); b.box(0.48, 0.4, 0.17, k * 0.49, 0.69, -0.22, k ? 0x2a1c14 : 0x6a3a22, -0.12); }
        }
        if (has('acoustic_panels')) {                                                       // real ones, not egg crates
          b.at(0, 0, Z0, 0);
          [[1.0, 2.4, 0.8, 0.32]].forEach(function (p) { b.box(p[2] + 0.04, p[3] + 0.04, 0.05, p[0], p[1], 0.03, 0x2a3040); b.box(p[2], p[3], 0.04, p[0], p[1], 0.05, 0x5a6a86); });
          b.at(X1, 0, 0, -Math.PI / 2);
          [[2.42, 1.65, 0.42, 1.0], [-0.5, 1.45, 0.22, 0.6]].forEach(function (p) { b.box(p[2] + 0.04, p[3] + 0.04, 0.06, p[0], p[1], 0.04, 0x2a3040); b.box(p[2], p[3], 0.04, p[0], p[1], 0.07, 0x5a6a86); });
        }
        if (has('real_pa')) {                                                               // two speakers on tripods, flanking the door
          [[0.28, -2.38], [1.66, -2.42]].forEach(function (p) {
            b.at(p[0], 0, p[1], 0.2);
            for (k = 0; k < 3; k++) b.box(0.03, 0.02, 0.4, 0, 0.1, 0.1, 0x1e1e22, 0.45, k * 2.09, 0);
            b.box(0.03, 1.2, 0.03, 0, 0.7, 0, 0x2a2a2e);
            b.box(0.34, 0.5, 0.28, 0, 1.5, 0, 0x151518); b.cyl(0.12, 0.12, 0.02, 12, 0, 1.44, 0.145, 0x2e2e34, Math.PI / 2); b.cyl(0.05, 0.05, 0.02, 10, 0, 1.66, 0.145, 0x2e2e34, Math.PI / 2);
            obs(upObs, p[0], p[1], 0.4, 0.4, 0);
          });
        }
        if (has('iso_booth')) {                                                             // Marcel treats it as a dressing room
          b.at(1.88, 0, -2.25, 0); g.at(1.88, 0, -2.25, 0);
          var PO = 0x3a3a42, GL = 0x7fa8c8;
          [[-0.42, 0.42], [0.42, 0.42], [-0.42, -0.42]].forEach(function (p) { b.box(0.06, 2.0, 0.06, p[0], 1.0, p[1], PO); });
          b.box(0.9, 0.06, 0.9, 0, 2.0, 0, PO);
          b.box(0.78, 1.5, 0.02, 0, 1.05, 0.42, GL); b.box(0.02, 1.5, 0.78, -0.42, 1.05, 0, GL);
          b.box(0.5, 0.04, 0.004, -0.05, 1.3, 0.432, 0xe8f2fa, 0, 0, 0.7); b.box(0.004, 0.04, 0.4, -0.432, 1.2, 0.05, 0xe8f2fa, 0.7);   // glare
          b.box(0.84, 0.25, 0.02, 0, 0.13, 0.42, PO); b.box(0.02, 0.25, 0.84, -0.42, 0.13, 0, PO);
          b.box(0.36, 0.1, 0.02, 0, 1.9, 0.44, 0x1a1a1e); g.box(0.3, 0.06, 0.01, 0, 1.9, 0.452, 0xff3030);
          obs(upObs, 1.88, -2.25, 0.9, 0.9, 0);
        }
        if (has('band_lounge')) {                                                           // couch-adjacent: a table, a game, a lamp, a beanbag
          b.at(1.02, 0, 2.02, 0.2); g.at(1.02, 0, 2.02, 0.2);
          b.box(0.5, 0.05, 0.72, 0, 0.36, 0, 0x5a3d25); for (k = 0; k < 4; k++) b.box(0.05, 0.34, 0.05, (k % 2 ? 0.2 : -0.2), 0.17, (k < 2 ? 0.3 : -0.3), 0x3a2410);
          b.box(0.3, 0.02, 0.3, 0, 0.395, 0.05, 0xd8c8a0); b.box(0.05, 0.05, 0.05, 0.08, 0.43, 0.1, 0xc0392b); b.box(0.05, 0.05, 0.05, -0.06, 0.43, -0.02, 0x2f6fd1);
          b.at(1.3, 0, 2.52, 0); g.at(1.3, 0, 2.52, 0);
          b.cyl(0.12, 0.14, 0.03, 10, 0, 0.015, 0, 0x2a2a2e); b.box(0.03, 1.4, 0.03, 0, 0.72, 0, 0x2a2a2e); b.cyl(0.12, 0.2, 0.22, 10, 0, 1.45, 0, 0xe8d8a8);
          g.cyl(0.1, 0.1, 0.02, 10, 0, 1.34, 0, 0xfff1c0);
          b.at(0.5, 0, 2.35, 0);
          b.shape(new THREE.IcosahedronGeometry(1, 1), 0, 0.2, 0, 0.32, 0.22, 0.3, 0x8a3fa0);
          obs(upObs, 1.02, 2.02, 0.6, 0.8, 0.2);
        }
        if (has('espresso')) {                                                              // songs get written at 2 a.m. now
          b.at(X1 - 0.2, 0, 0.92, -Math.PI / 2); g.at(X1 - 0.2, 0, 0.92, -Math.PI / 2);
          b.box(0.44, 0.62, 0.36, 0, 0.31, 0, 0x5a3d25); b.box(0.46, 0.03, 0.38, 0, 0.635, 0, 0x2a2a2e);
          b.box(0.26, 0.26, 0.2, 0, 0.78, -0.02, 0xc0c4ca); b.box(0.2, 0.04, 0.1, 0, 0.72, 0.1, 0x2a2a2e); g.box(0.04, 0.02, 0.004, 0.08, 0.85, 0.082, 0x6fe39a);
          b.cyl(0.03, 0.025, 0.05, 8, 0, 0.68, 0.12, 0xf2efe6);
          obs(upObs, X1 - 0.2, 0.92, 0.44, 0.36, -Math.PI / 2);
        }
        if (has('mood_leds')) {                                                             // purple for metal, blue for Kenji (on the beams in the studio)
          g.at(0, 0, 0, 0);
          var LED = { metal: [0x9b5bff, 0x5b8bff], punk: [0x39e05a, 0xff4fb0], rock: [0xffa42e, 0x3c8cff], country: [0xffc860, 0xd9a520] }[(state && state.genre) || 'metal'] || [0x9b5bff, 0x5b8bff];   // v0.9: per genre
          g.box(ROOM.x1 - ROOM.x0, 0.025, 0.02, 0, 0.16, Z0 + 0.03, LED[0]); g.box(0.02, 0.025, ROOM.z1 - ROOM.z0, X1 - 0.03, 0.16, 0, LED[1]);
          g.box(ROOM.x1 - ROOM.x0, 0.025, 0.02, 0, 2.5, Z0 + 0.15, LED[1]); g.box(0.02, 0.025, ROOM.z1 - ROOM.z0, X1 - 0.15, 2.5, 0, LED[0]);
        }
        if (has('catering')) {                                                              // perogies, hot, every day
          b.at(X1 - 0.3, 0, -1.2, -Math.PI / 2); g.at(X1 - 0.3, 0, -1.2, -Math.PI / 2);
          b.box(1.0, 0.04, 0.5, 0, 0.74, 0, 0xf2efe6); b.box(1.0, 0.5, 0.02, 0, 0.5, 0.25, 0xf2efe6);
          for (k = 0; k < 4; k++) b.box(0.04, 0.72, 0.04, (k % 2 ? 0.45 : -0.45), 0.36, (k < 2 ? 0.2 : -0.2), 0x6a6a6a);
          for (k = 0; k < 3; k++) {
            b.box(0.26, 0.06, 0.2, -0.32 + k * 0.32, 0.79, 0, 0xb9bec6); b.cyl(0.13, 0.13, 0.04, 10, -0.32 + k * 0.32, 0.84, 0, 0xc9ced6, 0, 0, 0);
            g.box(0.2, 0.02, 0.02, -0.32 + k * 0.32, 0.765, 0.105, 0x2f7fff);
          }
          for (k = 0; k < 5; k++) b.box(0.05, 0.02, 0.035, -0.1 + k * 0.05, 0.795, 0.1, 0xf0dca0);
          obs(upObs, X1 - 0.3, -1.2, 1.0, 0.5, -Math.PI / 2);   // local sizes (1.0 wide, 0.5 deep), like the fridge
        }
        if (has('hot_tub')) {                                                               // next to the Zamboni; nobody asks how
          b.at(0.95, 0, 2.2, 0); g.at(0.95, 0, 2.2, 0);
          b.cyl(0.5, 0.5, 0.5, 16, 0, 0.25, 0, 0x7a5a3a); b.cyl(0.52, 0.52, 0.04, 16, 0, 0.5, 0, 0x5a3d25);
          g.cyl(0.44, 0.44, 0.01, 16, 0, 0.525, 0, 0x3fd0e0);
          for (k = 0; k < 5; k++) g.box(0.05, 0.012, 0.05, Math.cos(k * 1.3) * 0.25, 0.533, Math.sin(k * 1.3) * 0.25, 0xe8fbff);
          b.box(0.3, 0.02, 0.18, 0.62, 0.02, 0.1, 0xf2efe6, 0, 0.4, 0);                   // a towel on the floor
          obs(upObs, 0.95, 2.2, 1.0, 1.0, 0);
        }
        if (has('star_door') && tier === 3) {                                               // Marcel polishes it before every show
          b.at(SPACE_DOOR.x, 0, Z0, 0);
          var P5 = [], cx = 0, cy = 1.9, zz = 0.08;                                        // (over the band's name placard)
          for (k = 0; k < 10; k++) { var a = Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 0.07 : 0.17; P5.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, zz]); }
          for (k = 0; k < 10; k++) b.tri([cx, cy, zz], P5[k], P5[(k + 1) % 10], 0xe0b63a);
        }
        // v0.8 SPACES review: without the curb loveseat, the studio has a black leather office chair and backstage a folding
        // director's chair by the laptop (the loveseat, once bought, moves with the band and takes the spot).
        if (!has('curb_couch') && (tier === 2 || tier === 3)) {
          b.at(-0.5, 0, 2.3, 2.5);
          if (tier === 2) {
            for (k = 0; k < 5; k++) { var a5 = k * Math.PI * 2 / 5; b.box(0.3, 0.03, 0.04, Math.cos(a5) * 0.15, 0.05, Math.sin(a5) * 0.15, 0x1a1a1c, 0, -a5, 0); b.cyl(0.03, 0.03, 0.04, 6, Math.cos(a5) * 0.29, 0.02, Math.sin(a5) * 0.29, 0x111113, Math.PI / 2, -a5, 0); }
            b.cyl(0.03, 0.03, 0.34, 8, 0, 0.23, 0, 0x8a8e94);
            b.box(0.5, 0.1, 0.48, 0, 0.45, 0, 0x16161a); b.box(0.46, 0.04, 0.44, 0, 0.51, 0.01, 0x22222a);                   // seat
            b.box(0.48, 0.62, 0.1, 0, 0.86, -0.23, 0x16161a, -0.08); b.box(0.4, 0.5, 0.02, 0, 0.87, -0.175, 0x26262e, -0.08);   // back
            for (k = -1; k <= 1; k += 2) { b.box(0.05, 0.18, 0.05, k * 0.26, 0.6, -0.02, 0x2a2a2e); b.box(0.07, 0.04, 0.3, k * 0.26, 0.7, 0.0, 0x16161a); }
          } else {
            var DC = 0x2a2a2e, CAN = 0x1c1c20;
            for (k = -1; k <= 1; k += 2) { b.box(0.03, 0.62, 0.03, k * 0.24, 0.3, 0, DC, 0, 0, k * 0.28); b.box(0.03, 0.62, 0.03, k * 0.24, 0.3, 0, DC, 0.5, 0, 0); b.box(0.04, 0.03, 0.44, k * 0.26, 0.62, 0, 0x5a3d25); b.box(0.03, 0.5, 0.03, k * 0.24, 0.85, -0.2, DC); }
            b.box(0.46, 0.02, 0.4, 0, 0.46, 0, CAN); b.box(0.48, 0.2, 0.02, 0, 0.92, -0.2, CAN);                     // canvas seat + back
            b.box(0.3, 0.07, 0.004, 0, 0.92, -0.212, 0xf2efe6);                                                       // (a name on the back)
          }
          b.at(0, 0, 0, 0);
          obs(upObs, -0.5, 2.3, 0.5, 0.5, 0);
        }
        swap(ups, b); swap(upsGlow, g);
        ball.visible = has('disco_ball');
        cur.couch = has('curb_couch');
      }

      /* ---- the box pile: a staircase along the left edge, growing toward the camera ------------------------------------------ */
      function buildPile(n, misprint) {
        pileObs.length = 0; cur.pileBox = null; cur.pileSign = null;
        if (!n) { swap(pile, null); return; }
        var b = new ctx.Builder({ jitter: 0.08, seed: 131 }), used = {}, top = 0, CB = [0xb08a5a, 0xa27e52, 0xbc986a, 0x9a784e];
        for (var i = 0; i < Math.min(n, PILE_MAX); i++) {
          var o = PILE_ORDER[i], cell = PILE_CELLS[o[0]], lvl = o[1], col = CB[i % CB.length];
          var tilt = ((i * 37) % 7 - 3) * 0.03, y = BOX.h / 2 + lvl * (BOX.h + 0.004);
          used[o[0]] = true; top = Math.max(top, y + BOX.h / 2);
          b.at(cell[0], 0, cell[1], cell[2] + tilt);
          b.box(BOX.w, BOX.h, BOX.d, 0, y, 0, col);
          b.box(BOX.w + 0.006, 0.075, BOX.d + 0.006, 0, y + 0.02, 0, 0xf2efe6);               // the white packing-tape band round every box
          b.box(BOX.w + 0.004, 0.012, 0.07, 0, y + BOX.h / 2, 0, 0xe8e2d2);                   // tape along the lid
          b.box(0.13, 0.11, 0.004, 0.08, y - 0.08, BOX.d / 2 + 0.004, 0x1a1a1a); b.box(0.055, 0.05, 0.005, 0.08, y - 0.08, BOX.d / 2 + 0.005, 0xd8263a);   // the logo
          b.box(0.004, 0.05, 0.16, -BOX.w / 2 - 0.004, y + 0.02, 0, 0x2a2a2a);                 // SHIRTS L, in marker on the band
          if (misprint && i === 0) {                                                            // the misprint batch: a red X on the side we see
            b.box(0.006, 0.03, BOX.d * 1.05, -BOX.w / 2 - 0.008, y, 0, 0xd0201a, 0.72, 0, 0);
            b.box(0.006, 0.03, BOX.d * 1.05, -BOX.w / 2 - 0.008, y, 0, 0xd0201a, -0.72, 0, 0);
          }
        }
        var x0 = 9, z0 = 9, x1 = -9, z1 = -9;
        var hx = BOX.w / 2 + 0.02, hz = BOX.d / 2 + 0.02;                                        // (+ the yaw jitter)
        Object.keys(used).forEach(function (k) { var c = PILE_CELLS[k]; x0 = Math.min(x0, c[0] - hx); x1 = Math.max(x1, c[0] + hx); z0 = Math.min(z0, c[1] - hz); z1 = Math.max(z1, c[1] + hz); });
        if (n > PILE_MAX) {                                                                     // past the pile: MERCH on a stick, rising out of it
          var sc = PILE_CELLS[0];
          b.at(sc[0] + 0.12, 0, sc[1] - 0.12, 0.3);
          b.box(0.03, 2.25, 0.03, 0, 1.12, 0, 0x6b4a2e); b.box(0.5, 0.28, 0.02, 0, 2.15, 0, 0xf2efe6); b.box(0.4, 0.07, 0.004, 0, 2.2, 0.012, 0xb3141c); b.box(0.28, 0.035, 0.004, 0, 2.1, 0.012, 0x1a1a1a);
          cur.pileSign = [sc[0] + 0.02, sc[1] - 0.22, sc[0] + 0.22, sc[1] - 0.02]; top = Math.max(top, 2.29);
          pileObs.push(cur.pileSign.slice());
        }
        pileObs.push([x0, z0, x1, z1]);
        cur.pileBox = [x0, 0, z0, x1, top, z1];
        swap(pile, b);
      }

      /* ---- mood: the lights, the background, the bulb / tube / spots, the yard ---------------------------------------- */
      function applyMood(tier) {   // (tier = the room index)
        mood = MOODS[tier] || MOODS[0]; riser = RISERS[tier] || null;
        scene.background.setHex(mood.bg);
        hemi.color.setHex(mood.hemi[0]); hemi.groundColor.setHex(mood.hemi[1]); hemi.intensity = mood.hemi[2];
        moon.color.setHex(mood.key[0]); moon.intensity = mood.key[1];
        fill.color.setHex(mood.fill[0]); fill.intensity = mood.fill[1];
        bulb.color.setHex(mood.bulb[0]); self.bulbI = mood.bulb[1];
        heater.color.setHex(mood.accent[0] || 0xff7a30); heater.intensity = mood.accent[1];
        if (tier) heater.position.set(mood.accent[2], mood.accent[3], mood.accent[4]); else heater.position.set(1.5, 0.45, 2.15);
        bulbCord.visible = bulbGlass.visible = halo.visible = mood.fixture === 'bulb';   // (v0.9: the basement and the Quonset have bare bulbs too)
        dust.points.material.color.setHex(mood.dust);
        yard.indoor(tier > 0 && tier !== 6); yard.farm(tier === 6);                      // (v0.9: the Quonset keeps the outdoors: a farmyard)
        if (kitShadow >= 0) { var ks = shadowSpots[kitShadow]; setShadow(kitShadow, ks[0], ks[1], ks[2], ks[3], ks[4], riser ? riser.h : 0); }
      }
      function hideGarage(tier, band) {   // (tier = the room index)
        var on = tier === 0;
        for (var i = 0; i < garageOnly.length; i++) garageOnly[i].visible = on;
        shafts.visible = on;
        for (i = 0; i < garageShadows.length; i++) { var j = garageShadows[i], p = shadowSpots[j]; if (on) setShadow(j, p[0], p[1], p[2], p[3], p[4]); else setShadow(j, 0, 0, 0, 0, 0); }
        applyMood(tier);
        shadows.instanceMatrix.needsUpdate = true;
        // The band banner (a bedsheet): on the garage door at home, duct-taped beside the door in the jam room; the studio has
        // its window there and no bedsheets; backstage the band's name is stencilled on the wall instead.
        banner.mesh.visible = tier <= 1 || tier >= 4; banner.mesh.rotation.set(0, 0, 0);
        if (on) { banner.mesh.position.set(PROPS.door.x, 1.08, Z0 + 0.1); banner.mesh.scale.setScalar(1); }
        else if (tier === 1) { banner.mesh.position.set(-0.07, 2.29, Z0 + 0.06); banner.mesh.scale.setScalar(0.46); banner.mesh.rotation.z = 0.035; }   // under the tube, over NO DRUMS
        else if (tier === 4) { banner.mesh.position.set(1.8, 1.06, Z0 + 0.7); banner.mesh.scale.setScalar(0.42); banner.mesh.rotation.z = -0.02; }  // on the plywood under the stairs
        else if (tier === 5) { banner.mesh.position.set(-0.15, 2.28, Z0 + 0.12); banner.mesh.scale.setScalar(0.6); banner.mesh.rotation.z = 0.02; }   // hung inside the shop window
        else if (tier === 6) { banner.mesh.position.set(PROPS.door.x, 1.3, Z0 + 0.14); banner.mesh.scale.setScalar(0.86); }                        // on the sliding door
        var text = doorLabel(tier, band), h = hs.door;
        if (h && cur.door !== text) {                                                            // re-label the door hotspot
          var lab = ctx.makeLabel(text, { px: 20 }), old = h.label, li = labels.indexOf(old);
          lab.position.copy(old.position); lab.userData.action = 'door'; scene.add(lab);
          if (li >= 0) labels[li] = lab;
          ctx.disposeLabel(old); h.label = lab; cur.door = text;
        }
      }
      self.set = function (st) {
        var tier = st && isFinite(st.spaceTier) ? Math.max(0, Math.min(3, st.spaceTier | 0)) : 0, ri = roomIndexOf(st);
        var list = st && Array.isArray(st.spaceUpgrades) ? st.spaceUpgrades.slice().sort() : [];
        var green = tier === 3 && list.indexOf('green_room') >= 0, catering = tier === 3 && list.indexOf('catering') >= 0, band = GG.content.bands && GG.content.bands[st && st.bandId];
        // v0.9: the tier-0 rooms carry their seasonal dressing (the window well's snow, the shop window's frost, the canola) in
        // the room itself, so the season + December + the city (Q7 painted names) are part of the signature.
        var D = ri >= 4 ? decor.flags() : null, city = (st && st.city) || (band && band.city) || '';
        var roomSig = ri + '|' + green + '|' + catering + '|' + (band ? band.name : '') + '|' + city + (D ? '|' + D.season + '|' + D.snow + '|' + D.lights : '');
        if (roomSig !== cur.room) {
          cur.room = roomSig; cur.tier = tier; cur.ri = ri; cur.green = green; cur.city = city;
          buildRoom(ri, green, band, catering, D); hideGarage(ri, band);
        }
        var upKind = spaceKindOf(band), upSig = tier + '|' + ri + '|' + upKind + '|' + list.join(',');   // v0.9: the band's own space's upgrade art
        if (upSig !== cur.ups) { cur.ups = upSig; cur.list = list; buildUps(list, tier, ri, upKind); }
        var p = st && GG.shop && GG.shop.pile && st.merch ? GG.shop.pile(st) : { boxes: 0, items: [] };
        var mis = (p.items || []).some(function (x) { return x.misprint; }), shown = Math.min(p.boxes, PILE_MAX + 1);
        var pileSig = shown + '|' + mis;
        cur.boxes = p.boxes;
        if (pileSig !== cur.pile) { cur.pile = pileSig; cur.shown = Math.min(p.boxes, PILE_MAX); buildPile(shown, mis); }
        self.obstacles.length = 0;
        var src = ri ? tierObs : garageObstacles, i;
        for (i = 0; i < src.length; i++) self.obstacles.push(src[i]);
        for (i = 0; i < upObs.length; i++) self.obstacles.push(upObs[i]);
        for (i = 0; i < pileObs.length; i++) self.obstacles.push(pileObs[i]);
      };
      // Where the player stands at a hotspot in this space (null = the hotspot's own spot). The curb loveseat sits between the
      // merch stack and the laptop, so with it in the room he stands a step wider of it at both.
      var COUCH_STANDS = { laptop: [0.2, 2.38], merch: [-1.3, 2.2] };
      self.stand = function (action) { return cur.couch && COUCH_STANDS[action] || null; };
      // The riser: height under (x, z) (people step up onto it), and the kit's lift.
      self.riserH = function () { return riser ? riser.h : 0; };
      self.floorAt = function (x, z) {
        if (!riser) return 0;
        var dx = x - KIT.x, dz = z - KIT.z, c = Math.cos(KIT.yaw), s = Math.sin(KIT.yaw), lx = dx * c - dz * s, lz = dx * s + dz * c;
        return Math.abs(lx) <= riser.x && lz >= riser.z0 && lz <= riser.z1 ? riser.h : 0;
      };
      // The main light's flicker: the garage bulb's tired blink, the jam room tube's buzz (and a stutter every few seconds).
      self.flicker = function (t) {
        if (cur.ri === 1 || cur.ri === 5) { var c = t % 6.7; return c < 0.32 ? (Math.sin(t * 95) > 0 ? 1 : 0.38) : 0.97 + 0.03 * Math.sin(t * 377); }
        return cur.ri > 0 && cur.ri < 4 ? 1 : (t % 13) < 0.18 ? 0.72 + 0.2 * Math.sin(t * 90) : 1;
      };
      self.update = function (t) {
        if (ball.visible) { ball.rotation.y = t * 0.8; ball.position.y = 2.1 + 0.01 * Math.sin(t * 1.3); }
        if (fix.visible) { var f = cur.ri === 1 || cur.ri === 5 ? self.flicker(t) : 1; if (f !== fixBase) { fixBase = f; fixMat.color.setScalar(f); } }
      };
      function hex(c) { return '#' + ('000000' + (c >>> 0).toString(16)).slice(-6); }
      self.state = function () {
        var m = MOODS[Math.max(0, cur.ri)] || MOODS[0];
        return { tier: cur.tier, room: cur.ri, kind: m.kind, spaceKind: cur.ri >= 4 ? m.kind : cur.ri === 0 ? 'garage' : null, exterior: cur.exterior, city: cur.city, paint: PAINT.studio + ' / ' + PAINT.arena, wall: hex(cur.green ? GREEN_WALL : m.wall), floor: hex(m.floor), bg: hex(m.bg), fixture: m.fixture, hall: m.hall, hallProps: cur.hallProps,
          riser: riser ? riser.h : 0, decals: cur.decals, green: cur.green, upgrades: cur.list.slice(), boxes: cur.boxes, pile: cur.shown,
          pileBox: cur.pileBox && cur.pileBox.slice(), pileSign: cur.pileSign && cur.pileSign.slice(), disco: ball.visible, door: cur.door,
          garage: garageOnly[0].visible, yard: cur.ri === 0 || cur.ri === 6, banner: banner.mesh.visible, sign: cur.ri > 0 && cur.decals > 0, signText: cur.ri > 0 ? cur.signText : '',
          neighbours: (cur.neighbours || []).slice(), couchKind: cur.ri >= 4 ? couchKind : null,
          atlas: atlas ? atlas.width + 'x' + atlas.height : null,   // v1.0 (Lane P): made on the first decal room only
          obstacles: self.obstacles.map(function (o) { return o.slice(); }) };
      };
      return self;
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
        set: function (name, logo) {
          var sig = name + (logo ? '|' + JSON.stringify(logo) : '');
          if (sig === self.sig) return;
          self.text = name; self.sig = sig;
          var g = c.getContext('2d'), rng = GG.RNG(GG.hashSeed(name)), txt = String(name).toUpperCase(), size = 92;
          g.fillStyle = '#e8e1cf'; g.fillRect(0, 0, 512, 176);
          for (var k = 0; k < 14; k++) { g.fillStyle = 'rgba(120,100,70,' + (0.04 + rng.next() * 0.06) + ')'; g.fillRect(rng.next() * 512, rng.next() * 176, 20 + rng.next() * 90, 3 + rng.next() * 10); }
          if (logo && GG.render.logo) {   // v0.8.1: the band logo sprayed on the sheet (the name is in it)
            g.globalAlpha = 0.95; g.drawImage(GG.render.logo.canvas(logo, name, 176, { shape: 'wide', aspect: 2.9 }), 0, 0, 512, 176); g.globalAlpha = 1;
            tex.needsUpdate = true; return;
          }
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
