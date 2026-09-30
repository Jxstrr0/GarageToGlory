// 42_render_stage.js: the gig stage. Portrait view from behind your kit, past the band, out at the crowd.
// Scene 'stage' is framed into the top two-thirds of the screen (the note highway covers the bottom third;
// GG.render.stage.setFrame({ top, bottom }) overrides). Everything is built by setup()/enter() and disposed
// by exit(), so going back to the garage hands the GPU memory back.
// API (GG.render.stage), safe to call before the scene exists (setup/level are remembered):
//   setup({ venue: GIG|venue|kind, crowd: attendance, members, flags, genre, player, bpm })
//   setCrowdLevel(0..100, snap) ; moment(kind in C.MOMENTS) ; hit(lane, judgement) ; bandAction(memberId|null, action)
//   action: 'capeSpin' | 'solo' | 'fill' | 'miss' ; setFrame({ top, bottom }) ; info() -> counts for tests
// v0.6 (RIVALUI): setup({ ..., rival: true, members: GG.rival.lineup (corpsePaint / stageShirt / defector), drummer: { look,
//   corpsePaint }, banner: 'TUNDRA WRAITH', sub, view: 'spectator' }) puts the rival's lineup on stage (corpse paint, black stage
//   shirts, their drummer on your throne) and frames it from the crowd (a spectator camera facing the stage, a backdrop wall
//   with their banner). view 'drummer' (default) is the v0.3 camera. info() adds { view, rival, painted }.
// v0.7 (WORLDUI): world venues dress the stage (by venueId, else venue.festival / venue.hall): kind 'festival' (a big
//   outdoor stage, PA towers, a daylight sky and a sea of heads to the horizon) with a ground: 'mud' (Mudstonbury,
//   Wackelstein: puddles, tents, flags, a flying welly), 'sun' (Big Day Inn), 'beach' (Summer Sonicboom: the sea),
//   'frost' (Siberian Frostfest: snow, pines, an ice sculpture, the frozen lake); kind 'hall' (Budokhan Hall: tiered
//   seating, a ring of lights); 'opera' (the Moose Opera: an antler chandelier). A silent crowd (venue.silent, Japan) stands
//   still while a song plays and claps, then bows, on 'applause' (C.MOMENTS + 'applause'). info() adds { dress, silent, bowing }.
// Bus: 'gig:judge' -> hit + crowd meter, 'crowd:level' -> setCrowdLevel, 'crowd:moment' -> moment,
//      'audio:step' -> beat phase (the crowd and band move on the song's beat).
// Draw calls ≈ room 2 + sign 1 + beams 3 + kit parts 4 + sticks 2 + band 4 + drummer 1 + crowd 6 + glows 1
//             + cups 1 + boos 1 + flashes 1 + shadows 1 + extras (dog 2 | fan | mirror ball) ≈ 30.
(function (GG) {
  var R = GG.render;
  if (!R || !R.defineScene) return;
  var THREE = null;
  var CT = GG.contracts || {};
  var LANES = CT.LANES || ['kick', 'snare', 'hat', 'cymbal', 'toms', 'ride'];
  var LEVELS = CT.CROWD_LEVELS || ['hostile', 'bored', 'warm', 'hyped', 'wild'];

  // Skeleton bone indices (same rig as 41_render_garage.js).
  var B_HIPS = 1, B_SPINE = 2, B_HEAD = 3, B_ARM_L = 4, B_FORE_L = 5, B_ARM_R = 6, B_FORE_R = 7,
    B_LEG_L = 8, B_SHIN_L = 9, B_LEG_R = 10, B_SHIN_R = 11, B_CAPE1 = 12, B_CAPE2 = 13, B_GEAR = 14, B_PHONES = 15, B_HELD = 16, B_FLOOR = 17;
  var HIPS_Y = 0.86;
  var MAX_CROWD = 150, MAX_CUPS = 12, MAX_BOOS = 6, N_FLASH = 6;
  var NO_PREFS = { calm: false, shake: true, crowdScale: 1 };
  function rprefs() { return (GG.render && GG.render.prefs && GG.render.prefs()) || NO_PREFS; }   // v0.6.1 (40_render_core)
  var KZ = 1.0, THRONE_Z = 0.62;                  // kit centre z; the drummer sits THRONE_Z behind it
  var STAGE_BACK = 2.6;
  var CAPE_OK = { velvet: 1, curtain: 1, charred: 1, fireproof: 1 };
  var DUR = { mosh: 6, circlePit: 7, wallOfDeath: 8.5, lineDance: 9.5, lighters: 8, boo: 4.5, capeSpin: 1.8, solo: 6, fill: 1.3, miss: 1.1, flinch: 0.7, cheer: 1.4 };
  var FORMATIONS = { mosh: 1, circlePit: 1, wallOfDeath: 1, lineDance: 1 };

  // ---- Venue kinds (C.VENUE_KINDS). hs = stage height, sw = stage half-width, w = room half-width. ----
  var KIND = {
    house: { hs: 0, sw: 2.0, w: 3.7, front: -1.8, back: -7.4, ceil: 2.9, floor: 0x7b5636, wall: 0xb7a67a, trim: 0x5b3f26, ceilCol: 0xd8d0b8, deck: 0x7a2f2a, amb: [0xffe2b8, 0x4a3a2a, 0.8], key: 0.5, wash: 0.55, beams: 0, bg: 0x1a140e, name: "Buddy's House Party", sub: "PLEASE DON'T MOSH ON THE COUCH" },
    legion: { hs: 0.45, sw: 2.9, w: 5.2, back: -10.5, ceil: 3.8, floor: 0x9c8e70, wall: 0x6e4827, trim: 0x3d2715, ceilCol: 0xcfc8b4, deck: 0x5a3f2a, amb: [0xfff2d8, 0x3a3020, 0.75], key: 0.4, wash: 0.8, beams: 0.35, bg: 0x120e0a, name: 'Legion Branch 63', sub: 'MEAT DRAW · SATURDAYS 3PM' },
    bingo: { hs: 0.35, sw: 2.8, w: 5.4, back: -10.5, ceil: 3.8, floor: 0x86958e, wall: 0xa9b19c, trim: 0x566150, ceilCol: 0xdde2d6, deck: 0x4c5a52, amb: [0xf4ffe8, 0x3a4038, 0.9], key: 0.35, wash: 0.6, beams: 0.15, bg: 0x0e120f, name: 'Bingo Palace', sub: 'EYES DOWN' },
    openmic: { hs: 0.25, sw: 2.3, w: 4.3, back: -8.4, ceil: 3.4, floor: 0x3e2b1d, wall: 0x7d3c29, trim: 0x2a1a12, ceilCol: 0x1c1512, deck: 0x2a211b, amb: [0xffc890, 0x1a120c, 0.5], key: 0.5, wash: 1.0, beams: 0.6, bg: 0x0d0907, name: 'Open Mic Night', sub: 'SIGN UP BY THE TIP JAR' },
    church: { hs: 0.4, sw: 2.8, w: 5.0, back: -10, ceil: 3.6, floor: 0xb8ad92, wall: 0xdcd2b2, trim: 0x8a6f4a, ceilCol: 0xe8e2d0, deck: 0x7a5c3c, amb: [0xfff4dc, 0x4a4030, 0.95], key: 0.35, wash: 0.5, beams: 0.12, bg: 0x14110c, name: "St. Vlad's Hall", sub: 'PEROGY SUPPER · SUNDAY 5PM' },
    curling: { hs: 0.2, sw: 2.7, w: 5.0, back: -9.4, ceil: 3.4, floor: 0x384d6e, wall: 0x8e7b5c, trim: 0x4a3a28, ceilCol: 0xd6d2c8, deck: 0x2e3a52, amb: [0xf2f6ff, 0x2a3040, 0.85], key: 0.4, wash: 0.6, beams: 0.2, bg: 0x0c1016, name: 'Curling Club Lounge', sub: 'HURRY HARD!' },
    skatepark: { hs: 0, sw: 2.6, w: 6.4, back: -11.5, ceil: 0, floor: 0x8a8a86, wall: 0x2c3140, deck: 0x2b4a7a, amb: [0x9ab4ff, 0x2a2a30, 0.6], key: 0.55, wash: 0.9, beams: 0.5, outdoor: true, bg: 0x0b1226, name: 'Skatepark', sub: 'ALL AGES · NO GLASS' },
    bar: { hs: 0.5, sw: 2.7, w: 4.9, back: -9.6, ceil: 3.6, floor: 0x3c2819, wall: 0x4c2d1c, trim: 0x2a180e, ceilCol: 0x16100c, deck: 0x221a15, amb: [0xffb878, 0x1a1008, 0.45], key: 0.55, wash: 1.1, beams: 0.75, bg: 0x0a0705, name: 'The Gopher Hole', sub: 'COLD BEER · LIVE MUSIC' },
    club: { hs: 0.85, sw: 3.1, w: 6.2, back: -12.2, ceil: 4.8, floor: 0x1e1c23, wall: 0x17151b, trim: 0x0e0d11, ceilCol: 0x0c0b0e, deck: 0x141318, amb: [0xb898ff, 0x0c0a12, 0.4], key: 0.55, wash: 1.3, beams: 1, bg: 0x060509, name: 'The Club', sub: 'LIVE TONIGHT' }
  };
  KIND.festival = { hs: 1.3, sw: 3.8, w: 8.5, front: -2.3, back: -16, ceil: 0, floor: 0x4a3620, wall: 0x1a1a1e, deck: 0x1c1c22, amb: [0xe8eef8, 0x4a3a28, 0.95], key: 0.9, wash: 0.7, beams: 0.5, outdoor: true, bg: 0x8aa6c8, name: 'Main Stage', sub: 'MAIN STAGE' };
  KIND.hall = { hs: 1.0, sw: 3.4, w: 8, front: -2.2, back: -15, ceil: 9, floor: 0x3a3440, wall: 0x2a2630, trim: 0x141218, ceilCol: 0x141218, deck: 0x1a1a20, amb: [0xfff0e0, 0x1a1418, 0.6], key: 0.5, wash: 1.2, beams: 1, bg: 0x08070a, name: 'Budokhan Hall', sub: 'THE OCTAGON' };
  // v0.7: world venues -> a dressing; grounds recolour the festival stage.
  var DRESS = { mudstonbury_fest: ['festival', 'mud'], wackelstein_fest: ['festival', 'mud'], big_day_inn: ['festival', 'sun'], summer_sonicboom: ['festival', 'beach'],
    siberian_frostfest: ['festival', 'frost'], budokhan: ['hall', 'hall'], moose_opera: ['church', 'opera'] };
  var GROUND = {
    mud: { floor: 0x4a3620, bg: 0x8aa6c8, sky: [0xb8c8dc, 0x5a7aa8], amb: [0xe8eef8, 0x4a3a28, 0.95], sub: 'MUD · WELLIES · MORE MUD' },
    sun: { floor: 0x6a9a3a, bg: 0x5aa8f0, sky: [0xb8e0ff, 0x2a78d8], amb: [0xfff4e0, 0x6a5a3a, 1.05], sub: 'SLIP · SLOP · SLAP' },
    beach: { floor: 0xd8c08a, bg: 0x6ab0f0, sky: [0xc8e8ff, 0x3a88e0], amb: [0xfff4e0, 0x8a7a5a, 1.05], sub: 'SEASIDE MAIN STAGE' },
    frost: { floor: 0xe8eef6, bg: 0x9ab0c8, sky: [0xe0e8f2, 0x7a90b0], amb: [0xeef4ff, 0x8a9ab0, 1.0], key: 0.7, sub: 'MINUS FORTY · LAKE BAIKAL' }
  };
  function dressOf(v) {
    if (!v || typeof v !== 'object') return null;
    var d = DRESS[v.venueId] || DRESS[v.id];
    if (d) return d;
    return v.festival ? ['festival', 'sun'] : v.hall ? ['hall', 'hall'] : v.moose ? ['church', 'opera'] : null;
  }
  var DEFAULT_FRONT = -2.05;

  var GENRE = {
    metal: { wash: [0xff2a2a, 0x8a3cff], bang: 1, jump: 0.8, hair: ['long', 'short'], hairA: 0.62, bpm: 150,
      shirts: [0x17171b, 0x17171b, 0x1d1d22, 0x17171b, 0x2b2b31, 0x3a1416, 0x1f2a3a, 0x4a4a4e, 0x5a1a1a],
      hairCols: [0x151110, 0x2a1a12, 0x4a2c18, 0xb89a5a, 0x151110], hairColsB: [0x151110, 0x3a2616, 0x6b4a2a] },
    punk: { wash: [0x39ff7a, 0xff3cc8], bang: 0.55, jump: 1, hair: ['mohawk', 'beanie'], hairA: 0.45, bpm: 170,
      shirts: [0x17171b, 0xd0302a, 0x2d6fd0, 0x2a9a4a, 0xe0d040, 0xe070b0, 0xf0f0f0, 0x333338],
      hairCols: [0x39e05a, 0xff4fb0, 0x3fa8ff, 0xff4a2a, 0xf2e14a], hairColsB: [0xc0302a, 0x222226, 0x2d6fd0, 0x2a9a4a] },
    rock: { wash: [0xffa42e, 0x3c8cff], bang: 0.5, jump: 0.7, hair: ['short', 'long'], hairA: 0.55, bpm: 128,
      shirts: [0x2e4a7a, 0x8a2a2a, 0x1a1a1e, 0xf0f0f0, 0x3a6a3a, 0x7a5a3a, 0x444a5a],
      hairCols: [0x2a1a12, 0x4a2c18, 0x8a5a2a, 0xc8a860, 0x151110], hairColsB: [0x2a1a12, 0x6b4a2a, 0xc8a860] },
    country: { wash: [0xffc860, 0x3cc4ff], bang: 0.15, jump: 0.45, hair: ['cowboy', 'cap'], hairA: 0.6, bpm: 112,
      shirts: [0x8a2a2a, 0x2e4a7a, 0xf0ece0, 0x6a4a2a, 0x3a5a8a, 0xb03a3a, 0x5a7a4a],
      hairCols: [0xc8a26a, 0x6a4424, 0x1e1a18, 0xefe6d2, 0x8a6a44], hairColsB: [0xc0392b, 0x233a66, 0x2a6a3a, 0xe0d8c8] }
  };
  var SKINS = [0xf1d0b1, 0xe0b08a, 0xc68c5f, 0x8a5634, 0x5e3a22, 0xf5dcc4, 0xd8a67c];
  var HIT_COL = { perfect: 0xffe46a, good: 0xbfe8ff, miss: 0xff5a4a };

  // Kit layout in kit space (the drummer faces +z; his left is +x). World: (-x, hs + y, KZ - z).
  var KIT = {
    kick: [0, 0.3, 0.1], snare: [0.24, 0.6, -0.2], hat: [0.5, 0.86, -0.08], tomL: [0.13, 0.74, 0.02], tomR: [-0.13, 0.74, 0.02],
    floor: [-0.4, 0.58, -0.18], crash: [0.44, 1.14, 0.22], ride: [-0.55, 1.02, 0.12], throne: [0, 0.5, -THRONE_Z]
  };
  // Which hand plays which lane, and where the stick tip lands (kit space).
  var STRIKE = {
    kick: null,
    snare: { hand: 'L', tip: [0.22, 0.64, -0.2], rest: 'snare' },
    hat: { hand: 'R', tip: [0.44, 0.9, -0.1] },
    cymbal: { hand: 'R', tip: [0.36, 1.12, 0.1] },
    toms: { hand: 'L', tip: [0.12, 0.8, 0.0], alt: { hand: 'R', tip: [-0.36, 0.64, -0.16] } },
    ride: { hand: 'R', tip: [-0.44, 1.02, 0.05] }
  };

  // ---- Small helpers (allocation-free) ------------------------------------------------------------
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function bump(u) { return u <= 0 || u >= 1 ? 0 : Math.sin(Math.PI * u); }
  function ease(u) { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); }
  function frac(x) { return x - Math.floor(x); }
  function approach(cur, goal, k, dt) { return cur + (goal - cur) * (1 - Math.exp(-k * dt)); }
  function hash01(i, salt) {
    var h = Math.imul((i + 1) ^ Math.imul(salt + 11, 0x9e3779b1), 0x85ebca6b);
    h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function pickOf(arr, i, salt) { return arr[Math.floor(hash01(i, salt) * arr.length) % arr.length]; }
  function laneName(l) { return typeof l === 'number' ? LANES[l] : l; }

  // Venue kind from a GIG / venue record / kind string; old v0.1 kinds map by id or name.
  function kindOf(v) {
    var k = typeof v === 'string' ? v : v && v.kind;
    if (k && KIND[k]) return k;
    var s = ((v && typeof v === 'object' ? (v.venueId || v.id || '') + ' ' + (v.name || '') : '') + ' ' + (k || '')).toLowerCase();
    if (/bingo/.test(s)) return 'bingo';
    if (/legion/.test(s)) return 'legion';
    if (/curl|lounge/.test(s)) return 'curling';
    if (/skate|outdoor|park/.test(s)) return 'skatepark';
    if (/house|party|basement/.test(s)) return 'house';
    if (/open ?mic|openmic|cafe|coffee/.test(s)) return 'openmic';
    if (/church|vlad|hall/.test(s)) return 'church';
    if (/club/.test(s)) return 'club';
    return 'bar';
  }

  // Two-bone arm IK in character space (facing +z, left = +x). Returns [armX, armZ, foreX, foreZ, stickX, stickY].
  // side: +1 left arm, -1 right arm. pitch: stick angle below horizontal (negative = tip up).
  // grip: stick length from the hand to the tip (0 = the hand goes to `tip`, e.g. a steering wheel).
  function armPose(S0, tip, side, pitch, grip) {
    var L1 = 0.29, L2 = 0.3, GRIP = grip == null ? 0.3 : grip;
    var hx = tip[0] - S0[0], hz = tip[2] - S0[2], hl = Math.sqrt(hx * hx + hz * hz) || 1;
    var cp = Math.cos(pitch), sp = Math.sin(pitch);
    var wx = hx / hl * cp, wy = -sp, wz = hz / hl * cp;                              // stick direction
    var T = [tip[0] - wx * GRIP, tip[1] - wy * GRIP, tip[2] - wz * GRIP];
    var dx = T[0] - S0[0], dy = T[1] - S0[1], dz = T[2] - S0[2], D = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    var nx = dx / D, ny = dy / D, nz = dz / D, Dc = clamp(D, 0.12, (L1 + L2) * 0.985);
    var px = side * 0.5, py = -1, pz = -0.35, dp = px * nx + py * ny + pz * nz;
    px -= dp * nx; py -= dp * ny; pz -= dp * nz;
    var pn = Math.sqrt(px * px + py * py + pz * pz) || 1; px /= pn; py /= pn; pz /= pn;
    var cosA = clamp((L1 * L1 + Dc * Dc - L2 * L2) / (2 * L1 * Dc), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
    var ex = S0[0] + L1 * (cosA * nx + sinA * px), ey = S0[1] + L1 * (cosA * ny + sinA * py), ez = S0[2] + L1 * (cosA * nz + sinA * pz);
    var hxp = S0[0] + nx * Dc, hyp = S0[1] + ny * Dc, hzp = S0[2] + nz * Dc;
    var ux = (ex - S0[0]) / L1, uy = (ey - S0[1]) / L1, uz = (ez - S0[2]) / L1;
    var b = Math.asin(clamp(ux, -1, 1)), a = Math.atan2(-uz, -uy);
    var f = local(hxp - ex, hyp - ey, hzp - ez, a, b), fl = Math.sqrt(f[0] * f[0] + f[1] * f[1] + f[2] * f[2]) || 1;
    f[0] /= fl; f[1] /= fl; f[2] /= fl;
    var b2 = Math.asin(clamp(f[0], -1, 1)), a2 = Math.atan2(-f[2], -f[1]);
    // stick direction from the actual hand to the tip, into forearm space
    var sx = tip[0] - hxp, sy = tip[1] - hyp, sz = tip[2] - hzp, sl = Math.sqrt(sx * sx + sy * sy + sz * sz) || 1;
    var w1 = local(sx / sl, sy / sl, sz / sl, a, b), w2 = local(w1[0], w1[1], w1[2], a2, b2);
    var sb = Math.asin(clamp(w2[0], -1, 1)), sa = Math.atan2(-w2[1], w2[2]);
    return [a, b, a2, b2, sa, sb];
  }
  // Vector into the frame of a bone rotated by Euler XYZ (a, 0, b): v' = Rz(-b) Rx(-a) v.
  function local(x, y, z, a, b) {
    var ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
    var y1 = y * ca + z * sa, z1 = -y * sa + z * ca;
    return [x * cb + y1 * sb, -x * sb + y1 * cb, z1];
  }

  // ---- Public API (the scene instance plugs in when it is built) ----------------------------------------
  var A = R.stage = {};
  var inst = null;
  var pending = { cfg: null, level: 50, frame: { top: 0, bottom: -1 } };
  A.setup = function (cfg) { pending.cfg = cfg || {}; if (inst && inst.active) inst.build(); return !!(inst && inst.active); };
  A.setCrowdLevel = function (v, snap) { v = +v; if (!isFinite(v)) return; pending.level = clamp(v, 0, 100); if (inst) inst.level(pending.level, snap); };
  A.moment = function (kind) { return !!(inst && inst.active && inst.moment(kind)); };
  A.hit = function (lane, judgement) { if (inst && inst.active) inst.hit(laneName(lane), judgement || 'good'); };
  A.bandAction = function (id, action) { return !!(inst && inst.active && inst.bandAction(id, action)); };
  A.setFrame = function (o) {
    o = o || {};
    if (typeof o.top === 'number') pending.frame.top = Math.max(0, o.top);
    if (typeof o.bottom === 'number') pending.frame.bottom = o.bottom;
    if (inst && inst.active) inst.frame();
  };
  A.info = function () { return inst ? inst.info() : { built: false }; };
  A.KINDS = Object.keys(KIND);
  A.armPose = armPose;                          // shared with 43_render_van.js (Kenji's hands on the wheel)

  // The gig session drives the scene through the bus, so the UI only needs setup().
  var lastHit = {};
  GG.on('gig:judge', function (p) {
    if (!p) return;
    if (typeof p.crowd === 'number') A.setCrowdLevel(p.crowd);
    var lane = laneName(p.lane), now = Date.now();
    if (lastHit[lane] && now - lastHit[lane] < 25) return;        // the UI may also call hit(): don't double up
    lastHit[lane] = now;
    if (inst && inst.active) inst.hit(lane, p.judgement || 'good');
  });
  GG.on('crowd:level', function (p) { if (p && typeof p.crowd === 'number') A.setCrowdLevel(p.crowd); });
  GG.on('crowd:moment', function (p) { if (p && p.kind) A.moment(p.kind); });
  GG.on('audio:step', function (p) { if (inst && inst.active && p && (p.step | 0) % 4 === 0) inst.beat(); });

  // ======================================================================================================
  R.defineScene('stage', function (ctx) {
    THREE = ctx.THREE;
    var sh = ctx.shade;
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07070b);
    var lastState = null;
    var K = null;                                   // built content (null when torn down)
    var camFov = 0, camOffY = 0;

    // Reusable temporaries (nothing below allocates per frame).
    var dummy = new THREE.Object3D(), mA = new THREE.Matrix4(), mB = new THREE.Matrix4(), mC = new THREE.Matrix4();
    var eul = new THREE.Euler(), vA = new THREE.Vector3(), col = new THREE.Color(), zero = new THREE.Matrix4().makeScale(0, 0, 0);
    var qCam = new THREE.Quaternion(), vScale = new THREE.Vector3();

    // Runtime state (kept across builds so levels/beat survive a rebuild).
    var S = {
      level: pending.level, smooth: pending.level, hype: pending.level / 100, idx: 2,
      beatLen: 0.45, beatT: 0, beats: 0, lastBeatAt: 0,
      form: { kind: null, t: 0, dur: 0 }, arms: { kind: null, t: 0, dur: 0 }, cheer: 0, kickPulse: 0, time: 0,
      moments: 0, hits: 0, bow: 0
    };
    var BOW = 3.4;   // v0.7: clap (1.6 s), then a bow

    // ---------------------------------------------------------------------------------------------------
    function resolve() {
      var cfg = pending.cfg || {}, st = lastState || GG.state || {};
      var venue = cfg.venue != null ? cfg.venue : (st.liveGig && st.liveGig.gig) || st.gig || null;
      var dress = dressOf(venue), kind = dress ? dress[0] : kindOf(venue || 'bar');   // v0.7: world stages
      var genre = cfg.genre || st.genre || 'metal';
      if (!GENRE[genre]) genre = 'metal';
      var band = GG.content && GG.content.bands && GG.content.bands[st.bandId || 'hail_damage'];
      var members = cfg.members || st.members || (band && band.members) || [];
      var flags = cfg.flags || st.flags || {};
      var player = cfg.player || st.player || {};
      var crowd = cfg.crowd != null ? +cfg.crowd : venue && typeof venue === 'object' ? +(venue.crowd || venue.capacity || 30) : 30;
      if (!isFinite(crowd)) crowd = 30;
      return {
        kind: kind, V: kind === 'festival' ? Object.assign({}, KIND.festival, GROUND[dress[1]] || GROUND.sun) : KIND[kind], genre: genre,
        dress: dress ? dress[1] : null, silent: !!(cfg.silent != null ? cfg.silent : venue && typeof venue === 'object' && venue.silent),   // v0.7 G: GENRE[genre], band: band, members: members, flags: flags, player: player,
        crowd: Math.round(clamp(crowd, 3, Math.max(12, MAX_CROWD * rprefs().crowdScale))), attendance: crowd, venueName: (venue && typeof venue === 'object' && venue.name) || KIND[kind].name,   // v0.6.1: graphics quality (v0.7: venueName was stuck inside this comment)
        bpm: +cfg.bpm || GENRE[genre].bpm,
        view: cfg.view === 'spectator' ? 'spectator' : 'drummer', rival: !!cfg.rival, drummer: cfg.drummer || null,   // v0.6
        banner: cfg.banner || '', bannerSub: cfg.sub || ''
      };
    }

    function contentMember(band, id) {
      var list = band && band.members;
      if (!list) return null;
      for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
      return null;
    }
    function findPreset(id) {
      var ps = GG.content && GG.content.presets;
      if (!id || !Array.isArray(ps)) return null;
      for (var i = 0; i < ps.length; i++) if (ps[i] && ps[i].id === id) return ps[i];
      return null;
    }

    // ---------------------------------------------------------------------------------------------------
    // Build / teardown
    function teardown() {
      if (!K) return;
      scene.remove(K.root);
      for (var i = 0; i < K.chars.length; i++) K.chars[i].dispose();
      for (i = 0; i < K.geos.length; i++) K.geos[i].dispose();
      for (i = 0; i < K.mats.length; i++) K.mats[i].dispose();
      for (i = 0; i < K.texs.length; i++) K.texs[i].dispose();
      K = null;
    }

    function build() {
      teardown();
      var D = resolve(), V = D.V, hs = V.hs, front = V.front || DEFAULT_FRONT;
      if (V.ceil && V.ceil < hs + CAM.pos[1] + 0.55) V.ceil = hs + CAM.pos[1] + 0.55;   // keep the camera under the roof
      K = { root: new THREE.Group(), chars: [], geos: [], mats: [], texs: [], D: D, V: V, hs: hs, front: front, painted: 0,
        band: [], spin: [], beamsL: null, beamsR: null, lights: {}, dog: null, surfer: -1 };
      scene.add(K.root);
      scene.background.setHex(V.bg);
      S.beatLen = 60 / clamp(D.bpm, 60, 240);

      var lit = new ctx.Builder({ jitter: 0.045, seed: 17 }), glow = new ctx.Builder({ jitter: 0, seed: 5 });
      buildRoom(lit, glow, V, D);
      buildDeck(lit, glow, V, D);
      buildDressing(lit, glow, D);
      buildKitStatic(lit, hs, kitColor(D));
      buildBackline(lit, glow, V, D);
      if (D.view === 'spectator') buildBackdrop(lit, V, D);   // v0.6: the crowd can see the back of the stage
      mesh(lit.build(), ctx.mats.vc);
      mesh(glow.build(), ctx.mats.unlit);
      buildSign(D);
      buildLights(D);
      buildBeams(D);
      buildKitParts(hs);
      buildBand(D);
      buildDrummer(D);
      buildCrowd(D);
      buildProps(D);
      if (D.kind === 'house') buildDog(D);
      if (D.view === 'spectator' && D.banner) buildBanner(D);
      frame();
      return K;
    }

    function track(o) {
      if (o.geometry) K.geos.push(o.geometry);
      if (o.material && K.mats.indexOf(o.material) < 0 && !isShared(o.material)) K.mats.push(o.material);
      return o;
    }
    function isShared(m) { var s = ctx.mats; return m === s.vc || m === s.skin || m === s.unlit || m === s.hidden; }
    function mesh(geo, mat, parent) { var m = new THREE.Mesh(geo, mat); (parent || K.root).add(m); return track(m); }
    function ownMat(m) { K.mats.push(m); return m; }
    function kitColor(D) {
      var pl = D.player || {}, pre = findPreset(pl.presetId);
      return pl.kitColor || (pre && pre.kitColor) || '#b3262b';
    }
    function kitW(p, hs, out) { out[0] = -p[0]; out[1] = hs + p[1]; out[2] = KZ - p[2]; return out; }

    // ---- Room ------------------------------------------------------------------------------------------
    function buildRoom(B, G, V, D) {
      var w = V.w, back = V.back, ceil = V.ceil, zEnd = STAGE_BACK + 1.2, d = zEnd - back, zc = (zEnd + back) / 2;
      B.box(2 * w + 0.4, 0.1, d, 0, -0.05, zc, V.floor);
      if (V.outdoor) return;
      B.box(2 * w + 0.4, ceil, 0.2, 0, ceil / 2, back - 0.1, V.wall);
      B.box(0.2, ceil, d, -w - 0.1, ceil / 2, zc, sh(V.wall, 0.82)); B.box(0.2, ceil, d, w + 0.1, ceil / 2, zc, sh(V.wall, 0.82));
      B.box(2 * w + 0.4, 0.12, d, 0, ceil + 0.06, zc, V.ceilCol);
      B.box(2 * w, 0.14, 0.05, 0, 0.07, back + 0.02, V.trim);
      B.box(0.05, 0.14, d, -w + 0.02, 0.07, zc, V.trim); B.box(0.05, 0.14, d, w - 0.02, 0.07, zc, V.trim);
      // Exit door + glowing sign (every indoor venue has one; nobody uses it).
      var ex = -w + 1.1;
      B.box(0.95, 2.05, 0.06, ex, 1.03, back + 0.03, sh(V.trim, 1.2)); B.box(0.08, 0.04, 0.05, ex + 0.3, 1.0, back + 0.08, 0xc0c0c0);
      G.box(0.5, 0.2, 0.04, ex, 2.3, back + 0.05, 0x3cff6a);
      // Ceiling lights (tube rows) for the hall kinds; the club/bar/openmic stay dark up there.
      if (V.ceilCol !== undefined && (D.kind === 'legion' || D.kind === 'bingo' || D.kind === 'church' || D.kind === 'curling')) {
        for (var z = back + 1.5; z < -1; z += 2.4) for (var x = -w + 1.4; x < w - 0.8; x += 2.6) G.box(1.2, 0.04, 0.16, x, ceil - 0.03, z, 0xf8fff2);
      }
    }

    // ---- Stage deck / rug ------------------------------------------------------------------------------
    function buildDeck(B, G, V, D) {
      var hs = V.hs, sw = V.sw, front = V.front || DEFAULT_FRONT, zc = (STAGE_BACK + front) / 2, d = STAGE_BACK - front;
      if (hs <= 0.01) {
        B.box(2 * sw, 0.02, d, 0, 0.01, zc, V.deck);
        B.box(2 * sw - 0.3, 0.021, d - 0.3, 0, 0.012, zc, sh(V.deck, 1.18));
      } else {
        B.box(2 * sw, hs, d, 0, hs / 2, zc, V.deck);
        B.box(2 * sw + 0.02, 0.05, 0.08, 0, hs - 0.02, front, 0x111114);
        B.box(2 * sw, hs - 0.06, 0.02, 0, hs / 2 - 0.02, front - 0.01, 0x121216);
        if (D.kind === 'club') for (var x = -sw + 0.4; x < sw; x += 0.9) G.box(0.3, 0.03, 0.03, x, hs - 0.1, front - 0.03, 0x6a4aff);
      }
      // Gaffer-tape marks and the taped setlist by the kit.
      B.box(0.28, 0.005, 0.05, -0.05, hs + 0.004, -0.95, 0xd8d0b0); B.box(0.05, 0.005, 0.28, -0.05, hs + 0.004, -0.95, 0xd8d0b0);
      B.box(0.2, 0.004, 0.28, 0.55, hs + 0.004, KZ - 0.55, 0xf2efe6, 0, 0.3, 0);
      for (var i = 0; i < 4; i++) B.box(0.14, 0.005, 0.012, 0.55, hs + 0.007, KZ - 0.64 + i * 0.05, 0x2a2a2a, 0, 0.3, 0);
    }

    // ---- Amps, monitors, mic stand, cables, stage-side lights ---------------------------------------
    function buildBackline(B, G, V, D) {
      var hs = V.hs, sw = V.sw, front = V.front || DEFAULT_FRONT, k = Math.min(1, sw / 2.8), i, s;
      var amp = function (x, z, big) {
        var hW = big ? 0.8 : 0.72, hH = big ? 1.05 : 0.72;
        B.box(hW, hH, 0.4, x, hs + hH / 2, z, 0x1a1a1c);
        B.box(hW - 0.08, hH - 0.1, 0.02, x, hs + hH / 2, z - 0.205, 0x2e2e30);
        if (!big) { B.box(hW, 0.3, 0.34, x, hs + hH + 0.15, z + 0.02, 0x1d1d20); B.box(hW - 0.1, 0.05, 0.02, x, hs + hH + 0.2, z + 0.19, 0xc9a64a); }
        G.box(0.03, 0.03, 0.02, x + hW / 2 - 0.08, hs + hH + (big ? -0.06 : 0.24), z + (big ? 0.205 : 0.195), 0xff3020);
      };
      amp(-2.05 * k, 0.55, false); amp(2.05 * k, 0.45, false); amp(1.95 * k, 1.55, true);
      // Monitor wedges along the front edge (we see their backs).
      for (i = -1; i <= 1; i++) {
        var mx = i * 1.05 * k, mz = front + 0.32;
        B.push(mx, hs, mz, 0, 0, 0);
        B.quad([-0.32, 0.02, 0.2], [0.32, 0.02, 0.2], [0.32, 0.34, -0.12], [-0.32, 0.34, -0.12], 0x1c1c1f);
        B.box(0.64, 0.34, 0.03, 0, 0.17, -0.14, 0x232326);
        B.box(0.64, 0.03, 0.34, 0, 0.015, 0.03, 0x19191b);
        B.pop();
      }
      // Cables snaking to the amps.
      for (i = 0; i < 5; i++) { s = i % 2 ? 1 : -1; B.box(0.025, 0.015, 0.7, s * (0.4 + i * 0.25) * k, hs + 0.008, -0.2 + i * 0.3, 0x0e0e10, 0, s * 0.5, 0); }
      // Stage-side light stands (rented cans) for small venues; a truss for the bigger ones.
      if (V.beams > 0) {
        if (D.kind === 'club' || D.kind === 'bar' || D.kind === 'openmic') {
          var ty = hs + 3.4;
          B.box(2 * sw + 0.6, 0.12, 0.12, 0, ty, front + 0.1, 0x2a2a2e); B.box(2 * sw + 0.6, 0.12, 0.12, 0, ty + 0.25, front + 0.1, 0x2a2a2e);
          for (i = 0; i < 6; i++) {
            var tx = -sw + 0.1 + i * (2 * sw - 0.2) / 5;
            B.box(0.02, 0.25, 0.02, tx, ty + 0.12, front + 0.1, 0x3a3a40);
            B.cyl(0.1, 0.12, 0.26, 8, tx, ty - 0.18, front + 0.1, 0x151518, 0.5, 0, 0);
            G.cyl(0.085, 0.085, 0.02, 8, tx, ty - 0.29, front + 0.04, i % 2 ? D.G.wash[0] : D.G.wash[1], 0.5, 0, 0);
          }
          if (D.kind === 'club') for (s = -1; s <= 1; s += 2) B.box(0.12, ty - hs, 0.12, s * (sw + 0.3), hs + (ty - hs) / 2, front + 0.1, 0x2a2a2e);
        } else {
          for (s = -1; s <= 1; s += 2) {
            var lx = s * (sw - 0.15);
            B.box(0.04, 2.2, 0.04, lx, hs + 1.1, front + 0.25, 0x2a2a2e);
            B.box(0.6, 0.05, 0.05, lx, hs + 2.2, front + 0.25, 0x2a2a2e);
            for (i = -1; i <= 1; i += 2) {
              B.cyl(0.08, 0.1, 0.2, 8, lx + i * 0.2, hs + 2.12, front + 0.2, 0x151518, 0.6, 0, 0);
              G.cyl(0.07, 0.07, 0.02, 8, lx + i * 0.2, hs + 2.05, front + 0.14, i > 0 ? D.G.wash[0] : D.G.wash[1], 0.6, 0, 0);
            }
          }
        }
      }
    }

    // ---- Venue dressing by kind ------------------------------------------------------------------------
    function buildDressing(B, G, D) {
      var V = D.V, w = V.w, back = V.back, ceil = V.ceil, i, x, z, s;
      var bz = back + 0.12;
      switch (D.kind) {
        case 'house':
          for (x = -w + 0.2; x < w; x += 0.4) B.box(0.1, ceil - 0.2, 0.01, x, ceil / 2, back + 0.005, sh(V.wall, 0.9));   // wallpaper stripes
          B.box(2.4, 0.45, 0.8, 1.1, 0.22, bz + 0.45, 0x5a6b3a); B.box(2.4, 0.5, 0.2, 1.1, 0.6, bz + 0.12, 0x52613a);       // couch
          B.box(0.25, 0.3, 0.8, -0.05, 0.45, bz + 0.45, 0x52613a); B.box(0.25, 0.3, 0.8, 2.25, 0.45, bz + 0.45, 0x52613a);
          B.box(1.0, 0.5, 0.4, -1.9, 0.25, bz + 0.2, 0x4a3322); B.box(0.95, 0.6, 0.08, -1.9, 0.85, bz + 0.2, 0x151517);    // TV on a stand
          G.box(0.84, 0.5, 0.01, -1.9, 0.85, bz + 0.25, 0x6fc3ff); G.box(0.84, 0.12, 0.012, -1.9, 0.66, bz + 0.25, 0xeaf6ff);
          B.box(0.03, 1.5, 0.03, -3.2, 0.75, bz + 0.3, 0x2a2a2a); G.cyl(0.14, 0.2, 0.25, 8, -3.2, 1.55, bz + 0.3, 0xffe2a8);   // floor lamp
          for (i = 0; i < 4; i++) { B.box(0.3, 0.38, 0.03, 1.4 + i * 0.55, 1.35 + (i % 2) * 0.12, bz, 0x6b4a2a); B.box(0.24, 0.3, 0.01, 1.4 + i * 0.55, 1.35 + (i % 2) * 0.12, bz + 0.02, pickOf([0x9ab4d8, 0xd8b49a, 0xa8c89a], i, 3)); }
          G.box(1.0, 0.8, 0.02, -w + 0.02, 1.6, -3.8, 0x1a2a55); B.box(0.06, 1.0, 1.25, -w + 0.05, 1.6, -3.8, 0x8a2a2a);  // window, curtains
          B.box(0.6, 0.45, 0.45, w - 0.4, 0.22, -3.2, 0x6a4a2a);                                                           // side table
          for (i = 0; i < 5; i++) B.cyl(0.03, 0.03, 0.12, 6, w - 0.6 + (i % 3) * 0.12, 0.51, -3.3 + i * 0.07, pickOf([0xc0392b, 0x2d6fd0, 0xd8d0b0], i, 7));
          // Ceiling fan (spins).
          var fb = new ctx.Builder({ jitter: 0 });
          fb.cyl(0.12, 0.12, 0.1, 8, 0, -0.05, 0, 0x6b4a2a);
          for (i = 0; i < 4; i++) fb.box(0.75, 0.02, 0.14, Math.cos(i * Math.PI / 2) * 0.45, -0.08, Math.sin(i * Math.PI / 2) * 0.45, 0x8a6a44, 0, -i * Math.PI / 2, 0);
          var fan = mesh(fb.build(), ctx.mats.vc); fan.position.set(0, ceil - 0.05, -4.0); K.spin.push({ m: fan, speed: 2.2 });
          break;
        case 'legion':
          for (x = -w + 0.3; x < w; x += 0.6) B.box(0.03, ceil - 1.2, 0.02, x, 1.6, back + 0.01, sh(V.wall, 0.75));        // panelling
          B.box(2 * w, 0.06, 0.04, 0, 1.0, back + 0.02, V.trim);
          flag(B, -w + 0.9, back + 0.3, 1.0); flag(B, w - 0.9, back + 0.3, 1.0);
          B.box(0.9, 1.1, 0.05, 2.1, 2.3, bz, 0xc9a64a); B.box(0.76, 0.96, 0.02, 2.1, 2.3, bz + 0.03, 0x3a5a3a);         // portrait: a moose in uniform
          B.box(0.3, 0.34, 0.02, 2.1, 2.3, bz + 0.05, 0x6b4424); B.box(0.36, 0.06, 0.02, 2.1, 2.5, bz + 0.05, 0x5a3a20);
          B.box(0.34, 0.28, 0.02, 2.1, 2.02, bz + 0.05, 0x2a3a6a);
          G.cyl(0.25, 0.25, 0.03, 12, -2.2, 1.6, bz, 0xe8d8a8, Math.PI / 2, 0, 0);                                           // dartboard
          B.cyl(0.18, 0.18, 0.035, 12, -2.2, 1.6, bz + 0.01, 0x1a1a1a, Math.PI / 2, 0, 0);
          for (s = -1; s <= 1; s += 2) for (z = back + 1.4; z < -3; z += 1.6) {
            B.box(0.7, 0.05, 1.3, s * (w - 0.45), 0.74, z, 0xd8d0b8); B.box(0.04, 0.72, 0.04, s * (w - 0.2), 0.36, z - 0.55, 0x777777); B.box(0.04, 0.72, 0.04, s * (w - 0.7), 0.36, z + 0.55, 0x777777);
            B.cyl(0.07, 0.06, 0.2, 8, s * (w - 0.45), 0.87, z + 0.2, 0xd8a83a);
          }
          break;
        case 'bingo':
          for (s = -1; s <= 1; s += 2) for (z = back + 1.2; z < -3.2; z += 1.4) {
            B.box(0.8, 0.05, 1.2, s * (w - 0.5), 0.74, z, 0xe8e4d8); B.box(0.05, 0.72, 0.05, s * (w - 0.5), 0.36, z, 0x777777);
            for (i = 0; i < 3; i++) B.cyl(0.035, 0.035, 0.14, 8, s * (w - 0.5) + (i - 1) * 0.18, 0.84, z + 0.3, pickOf([0xff3c8c, 0x3cff9a, 0xffd23c, 0x3c9aff], i + z * 3, 5));
          }
          B.box(0.8, 0.9, 0.5, -w + 1.4, 0.45, back + 1.0, 0x6b4a2a);                                                      // caller's desk + ball cage
          G.shape(new THREE.IcosahedronGeometry(0.22, 0), -w + 1.4, 1.15, back + 1.0, 1, 1, 1, 0xfff0a0);
          break;
        case 'openmic':
          for (var row = 0; row < 14; row++) for (x = -w; x < w; x += 0.5) B.box(0.46, 0.18, 0.02, x + (row % 2) * 0.25, 0.12 + row * 0.21, back + 0.01, pickOf([0x8a4430, 0x7a3a26, 0x94503a, 0x6e3222], row * 31 + Math.round(x * 4), 9));
          for (i = 0; i < 18; i++) {                                                                                         // string lights
            x = -w + 0.3 + i * (2 * w - 0.6) / 17; var sag = 0.25 * Math.sin(Math.PI * i / 17);
            G.box(0.07, 0.09, 0.07, x, ceil - 0.35 - sag, back + 0.8, 0xffd890); G.box(0.07, 0.09, 0.07, x, ceil - 0.3 - sag, -4.2, 0xffd890);
          }
          for (i = 0; i < 4; i++) { x = (i % 2 ? 1 : -1) * (w - 0.8); z = back + 1.4 + Math.floor(i / 2) * 2.2; B.cyl(0.35, 0.35, 0.04, 10, x, 0.74, z, 0x2a1a12); B.box(0.05, 0.72, 0.05, x, 0.36, z, 0x1a1a1a); G.box(0.05, 0.08, 0.05, x, 0.8, z, 0xffb050); }
          B.cyl(0.18, 0.2, 0.06, 10, -1.7, V.hs + 0.65, -1.0, 0x6b4a2a); B.box(0.03, 0.62, 0.03, -1.7, V.hs + 0.31, -1.0, 0x2a2a2a); // the poet's stool
          B.cyl(0.08, 0.07, 0.18, 8, -1.7, V.hs + 0.77, -1.0, 0xc8e0e8);                                                     // tip jar
          break;
        case 'church':
          arched(B, G, -3.3, 2.1, back + 0.08, 0);
          for (s = -1; s <= 1; s += 2) for (i = 0; i < 3; i++) arched(B, G, s * (w - 0.02), 2.1, back + 2.0 + i * 2.4, s);
          B.box(2.0, 0.9, 0.3, 3.2, 1.25, back + 0.16, 0x3a2a1a); G.box(1.8, 0.1, 0.05, 3.2, 1.3, back + 0.3, 0xfff3d8);    // kitchen pass-through
          B.cyl(0.14, 0.16, 0.42, 10, 2.8, 1.02 + 0.21, back + 0.45, 0xc0c4c8);                                              // coffee urn
          B.box(1.3, 1.25, 0.6, -w + 1.0, 0.62, -3.0, 0x2a1a12); B.box(1.2, 0.08, 0.3, -w + 1.0, 0.9, -2.65, 0xf2efe6);    // upright piano
          for (i = 0; i < 6; i++) B.box(0.45, 0.04, 0.45, w - 0.6, 0.1 + i * 0.08, back + 1.2, 0x8a6f4a);                 // stacked chairs
          break;
        case 'curling':
          // Picture window onto the ice: the sheet, two houses and a stone.
          B.box(2 * w + 0.4, 0.9, 0.22, 0, 0.45, back + 0.1, V.wall); B.box(2 * w + 0.4, 0.5, 0.22, 0, ceil - 0.25, back + 0.1, V.wall);
          for (x = -w; x <= w + 0.01; x += 2.1) B.box(0.1, ceil, 0.24, x, ceil / 2, back + 0.05, V.trim);
          G.box(2 * w, ceil - 1.4, 0.02, 0, 0.9 + (ceil - 1.4) / 2, back + 0.03, 0xdce8f2);
          for (s = -1; s <= 1; s += 2) {
            var hxp = s * 2.4;
            G.cyl(0.95, 0.95, 0.01, 20, hxp, 1.5, back + 0.05, 0x2a5ad8, Math.PI / 2, 0, 0);
            G.cyl(0.62, 0.62, 0.01, 20, hxp, 1.5, back + 0.058, 0xf4f8ff, Math.PI / 2, 0, 0);
            G.cyl(0.32, 0.32, 0.01, 20, hxp, 1.5, back + 0.066, 0xd82a2a, Math.PI / 2, 0, 0);
          }
          B.box(0.08, 1.4, 0.04, -w + 0.05, 1.3, -4.5, 0x8a6a44, 0, 0, 0.1); B.box(0.08, 0.35, 0.2, -w + 0.06, 0.55, -4.45, 0xc0392b, 0, 0, 0.1); // broom
          for (i = 0; i < 3; i++) { B.cyl(0.14, 0.15, 0.1, 10, w - 0.4, 0.95, -5.5 + i * 0.4, 0x6a6a6e); B.box(0.06, 0.05, 0.14, w - 0.4, 1.04, -5.5 + i * 0.4, i % 2 ? 0xd82a2a : 0xf2d23a); }
          B.box(0.8, 0.05, 1.4, w - 0.4, 0.88, -5.1, 0x6b4a2a);
          break;
        case 'skatepark':
          // Night sky backdrop, city glow, fence, quarter pipes, lamps, a generator doing its best.
          var sky = new ctx.Builder({ jitter: 0 });
          sky.triC([-30, 0, -25], [30, 0, -25], [30, 16, -25], 0x2a3a6a, 0x2a3a6a, 0x060a1c);
          sky.triC([-30, 0, -25], [30, 16, -25], [-30, 16, -25], 0x2a3a6a, 0x060a1c, 0x060a1c);
          for (i = 0; i < 70; i++) sky.box(0.06, 0.06, 0.01, (hash01(i, 1) - 0.5) * 56, 3 + hash01(i, 2) * 12, -24.9, 0xe8f0ff);
          for (i = 0; i < 40; i++) sky.box(0.4 + hash01(i, 4) * 0.8, 0.5 + hash01(i, 5) * 2.4, 0.01, (hash01(i, 3) - 0.5) * 50, 0.3, -24.8, 0x10142a);
          for (i = 0; i < 60; i++) sky.box(0.08, 0.08, 0.01, (hash01(i, 6) - 0.5) * 50, 0.2 + hash01(i, 7) * 2.0, -24.7, pickOf([0xffd890, 0xfff2c8, 0xffb060], i, 8));
          mesh(sky.build(), ctx.mats.unlit);
          B.box(60, 0.1, 30, 0, -0.06, -20, 0x2a2e26);
          for (x = -w; x <= w + 0.01; x += 1.6) B.box(0.05, 2.0, 0.05, x, 1.0, back, 0x8a8e94);
          B.box(2 * w, 0.04, 0.04, 0, 2.0, back, 0x8a8e94); B.box(2 * w, 0.04, 0.04, 0, 0.05, back, 0x8a8e94);
          for (x = -w; x < w; x += 0.25) B.box(0.012, 1.95, 0.012, x, 1.0, back, 0x6a6e74, 0, 0, 0.35);
          for (s = -1; s <= 1; s += 2) {
            for (i = 0; i < 6; i++) {                                                                                       // quarter pipe
              var a0 = i / 6 * Math.PI / 2, a1 = (i + 1) / 6 * Math.PI / 2, r = 1.4, cx = s * (w + 0.6);
              var x0 = cx - s * r * Math.cos(a0), y0 = r - r * Math.sin(a0) + 0.001, x1 = cx - s * r * Math.cos(a1), y1 = r - r * Math.sin(a1);
              var sl = Math.sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0));
              B.box(sl + 0.02, 0.08, -2.5 - back - 0.5, (x0 + x1) / 2, (y0 + y1) / 2, (-2.5 + back + 0.5) / 2, 0x9a9a96, 0, 0, Math.atan2(y1 - y0, x1 - x0));
            }
            B.box(0.08, 0.08, -2.5 - back, s * (w + 0.6 - 1.4), 1.42, (-2.5 + back) / 2, 0xb8bcc2);
            for (i = 0; i < 3; i++) B.box(0.02, 0.5 + hash01(i, s + 9) * 0.3, 1.0 + hash01(i, s + 3), s * (w - 0.1), 0.45, -4 - i * 2, pickOf([0xff3cc8, 0x3cc4ff, 0xffd23c, 0x39ff7a], i + s, 4));
            B.box(0.1, 4.0, 0.1, s * (w - 0.3), 2.0, -2.8, 0x3a3a40); B.box(0.6, 0.08, 0.1, s * (w - 0.55), 4.0, -2.8, 0x3a3a40);
            G.box(0.3, 0.08, 0.2, s * (w - 0.8), 3.94, -2.8, 0xfff2c8);
          }
          B.box(0.6, 0.45, 0.4, 2.4, 0.22, 1.8, 0xd8a83a); B.box(0.5, 0.1, 0.3, 2.4, 0.5, 1.8, 0x2a2a2a);               // generator
          break;
        case 'bar':
          for (x = -w + 0.3; x < w; x += 0.5) B.box(0.02, ceil, 0.02, x, ceil / 2, back + 0.01, sh(V.wall, 0.7));
          B.box(0.9, 1.05, 5.2, w - 0.5, 0.52, -6.0, 0x3a2012); B.box(1.0, 0.06, 5.3, w - 0.5, 1.08, -6.0, 0x5a3420);      // the bar
          G.box(0.05, 0.5, 5.0, w - 0.03, 1.9, -6.0, 0xffb060);                                                             // backlit shelf
          for (i = 0; i < 16; i++) B.cyl(0.04, 0.045, 0.28, 6, w - 0.12, 1.75, -8.2 + i * 0.29, pickOf([0x2a6a3a, 0x7a3a1a, 0xd8c8a8, 0x3a2a6a], i, 2));
          for (i = 0; i < 5; i++) { B.cyl(0.02, 0.02, 0.28, 6, w - 0.8, 1.25, -7.5 + i * 0.5, 0xc8c8c8); B.box(0.05, 0.1, 0.05, w - 0.8, 1.42, -7.5 + i * 0.5, 0x151515); }
          for (i = 0; i < 5; i++) { B.cyl(0.18, 0.15, 0.06, 8, w - 1.25, 0.72, -8.0 + i * 1.0, 0x8a2a2a); B.box(0.04, 0.7, 0.04, w - 1.25, 0.35, -8.0 + i * 1.0, 0x2a2a2a); }
          B.box(1.3, 0.1, 2.2, -w + 1.0, 0.8, back + 1.6, 0x2a5a2a); B.box(1.4, 0.22, 2.3, -w + 1.0, 0.68, back + 1.6, 0x4a2a16);   // pool table
          B.box(0.9, 0.55, 0.06, -3.4, 2.35, bz, 0x111111); G.box(0.8, 0.46, 0.01, -3.4, 2.35, bz + 0.04, 0xe8f2ff); G.box(0.8, 0.1, 0.012, -3.4, 2.2, bz + 0.045, 0x3a8a4a);
          break;
        case 'club':
          for (s = -1; s <= 1; s += 2) {                                                                                  // speaker stacks
            for (i = 0; i < 3; i++) {
              var sy = V.hs + 0.45 + i * 0.9;
              B.box(0.9, 0.86, 0.6, s * (V.sw + 0.55), sy, -1.6, 0x141416);
              B.cyl(0.26, 0.26, 0.03, 12, s * (V.sw + 0.55), sy, -1.91, 0x2a2a2e, Math.PI / 2, 0, 0);
            }
          }
          for (x = -w + 0.6; x < w; x += 1.2) B.box(0.05, 1.1, 0.05, x, 0.55, DEFAULT_FRONT - 0.9, 0x6a6e74);                   // crowd barrier
          B.box(2 * w - 1, 0.06, 0.06, 0, 1.1, DEFAULT_FRONT - 0.9, 0x6a6e74);
          G.box(2 * w - 2, 0.06, 0.02, 0, 3.4, bz, 0x6a3cff); G.box(2 * w - 2, 0.06, 0.02, 0, 0.3, bz, 0x3cc4ff);
          B.box(4, 1.1, 0.8, 0, 0.55, back + 0.6, 0x1a1820); G.box(3.9, 0.05, 0.05, 0, 1.12, back + 0.22, 0xff3cc8);         // back bar
          var bb = new ctx.Builder({ jitter: 0.25, seed: 4 });                                                               // mirror ball
          bb.shape(new THREE.IcosahedronGeometry(0.35, 1), 0, 0, 0, 1, 1, 1, 0xd8dce8);
          var ball = mesh(bb.build(), ctx.mats.vc); ball.position.set(0, V.ceil - 0.8, -6.5); K.spin.push({ m: ball, speed: 0.7 });
          B.box(0.02, 0.6, 0.02, 0, V.ceil - 0.3, -6.5, 0x444444);
          break;
        case 'festival': buildFestival(B, G, D); break;   // v0.7
        case 'hall': buildHall(B, G, D); break;           // v0.7
      }
      if (D.dress === 'opera') {                           // v0.7: the Moose Opera's antler chandelier
        var cy = V.ceil - 0.9;
        G.cyl(0.5, 0.5, 0.05, 16, 0, cy, -5.5, 0xffe2a0); B.box(0.03, 0.8, 0.03, 0, cy + 0.45, -5.5, 0x8a6a2a);
        for (s = -1; s <= 1; s += 2) { B.box(1.0, 0.08, 0.3, s * 0.8, cy + 0.15, -5.5, 0xd8c8a0, 0, 0, s * 0.35); for (i = 0; i < 3; i++) B.box(0.07, 0.35, 0.07, s * (0.55 + i * 0.3), cy + 0.45, -5.5 + (i - 1) * 0.1, 0xd8c8a0); }
        for (i = 0; i < 8; i++) G.box(0.08, 0.12, 0.08, Math.cos(i * Math.PI / 4) * 0.5, cy + 0.08, -5.5 + Math.sin(i * Math.PI / 4) * 0.5, 0xfff4c8);
      }
    }
    // v0.7: a sea of static heads from behind the live crowd to z1 (one merged mesh; neat rows when seated).
    function crowdSea(B, D, z0, z1, xw, gap, seated, y0, rise) {
      var G2 = D.G, j = 0, x, z, row = 0;
      for (z = z0; z > z1; z -= gap, row++) for (x = -xw; x <= xw; x += gap) {
        j++;
        if (!seated && hash01(j, 51) < 0.1) continue;
        var px = x + (seated ? 0 : (hash01(j, 52) - 0.5) * 0.3), pz = z + (seated ? 0 : (hash01(j, 53) - 0.5) * 0.3), yb = (y0 || 0) + row * (rise || 0);
        var h = seated ? 0.95 : 1.45 + hash01(j, 54) * 0.3, shirt = pickOf(G2.shirts, j, 55);
        if (D.dress === 'frost') shirt = pickOf([0xc0392b, 0x2d5fa0, 0x3a3a40, 0xe0d8c8, 0x2a6a3a], j, 56);
        B.box(0.42, h - 0.25, 0.26, px, yb + (h - 0.25) / 2, pz, shirt);
        B.box(0.24, 0.26, 0.24, px, yb + h - 0.1, pz, D.dress === 'frost' && hash01(j, 57) < 0.7 ? pickOf([0xc0392b, 0xf0f0f0, 0x2d5fa0], j, 58) : pickOf(SKINS, j, 59));
        if (!seated && !D.silent && hash01(j, 60) < 0.14) B.box(0.1, 0.55, 0.1, px + 0.2, yb + h + 0.1, pz, pickOf(SKINS, j, 61));
      }
    }
    function buildFestival(B, G, D) {
      var V = D.V, gd = D.dress, front = V.front || DEFAULT_FRONT, i, s, x, z;
      var sky = new ctx.Builder({ jitter: 0 }), zb = -38, top = 26;
      sky.triC([-60, -1, zb], [60, -1, zb], [60, top, zb], V.sky[0], V.sky[0], V.sky[1]);
      sky.triC([-60, -1, zb], [60, top, zb], [-60, top, zb], V.sky[0], V.sky[1], V.sky[1]);
      for (i = 0; i < 9; i++) sky.box(4 + hash01(i, 41) * 6, 0.9 + hash01(i, 42), 0.01, (hash01(i, 43) - 0.5) * 80, 11 + hash01(i, 44) * 10, zb + 0.3, gd === 'frost' ? 0xe8eef6 : 0xf8fbff);
      mesh(sky.build(), ctx.mats.unlit);
      B.box(140, 0.1, 50, 0, -0.07, -34, V.floor);
      crowdSea(B, D, front - 2.9, V.back - 2, V.w + 3.5, 0.62, false);
      for (s = -1; s <= 1; s += 2) {
        for (i = 0; i < 4; i++) B.box(1.3, 1.1, 1.0, s * (V.sw + 1.1), 0.55 + i * 1.12, front + 0.2, 0x141418);                 // PA towers
        B.box(0.3, 7, 0.3, s * 6.5, 3.5, -10, 0x6a6a70); B.box(1.2, 1.6, 1, s * 6.5, 6.4, -10, 0x1a1a1e);                        // delay towers
        B.box(0.25, 9, 0.25, s * (V.sw + 1.9), 4.5, 1.2, 0x3a3a42); B.box(0.25, 0.25, 6, s * (V.sw + 1.9), 9, -1.6, 0x3a3a42);    // roof truss legs
      }
      for (x = -V.w - 1; x <= V.w + 1.01; x += 1.4) B.box(0.06, 1.1, 0.06, x, 0.55, front - 0.7, 0x8a8e94);                    // crowd barrier
      B.box(2 * V.w + 2, 0.08, 0.08, 0, 1.1, front - 0.7, 0x8a8e94);
      for (i = 0; i < 7; i++) {                                                                                                  // flags over the crowd
        x = (hash01(i, 71) - 0.5) * 22; z = -7 - hash01(i, 72) * 12;
        B.box(0.06, 5.5, 0.06, x, 2.75, z, 0x5a5a5a); B.box(1.1, 0.7, 0.02, x + 0.56, 5.1, z, pickOf([0xc0392b, 0xe8c547, 0x2d6fd0, 0x2a9a4a, 0xf0f0f0], i, 73));
      }
      if (gd === 'mud' || gd === 'sun') for (i = 0; i < 9; i++) {                                                             // tents on the horizon
        x = -30 + i * 7.5 + hash01(i, 74) * 2; z = -26 - hash01(i, 75) * 4;
        B.box(3.4, 3.4, 4, x, 0, z, pickOf([0xf0f0f0, 0xc0392b, 0x2d6fd0, 0xe8c547], i, 76), 0, 0, Math.PI / 4);
      }
      if (gd === 'mud') {
        for (i = 0; i < 14; i++) B.cyl(0.5 + hash01(i, 77) * 0.9, 0.5 + hash01(i, 77) * 0.9, 0.02, 12, (hash01(i, 78) - 0.5) * 16, 0.012, -3.4 - hash01(i, 79) * 10, 0x2a1e12);   // puddles
        B.box(0.22, 0.42, 0.12, -1.6, 4.2, -6, 0x2a6a3a, 0.6, 0, 0.9); B.box(0.2, 0.1, 0.3, -1.6, 4.0, -5.85, 0x2a6a3a, 0.6, 0, 0.9);   // a welly, mid-air
        for (i = 0; i < 5; i++) B.shape(new THREE.IcosahedronGeometry(4, 0), -28 + i * 14, -1.5, -32, 1.6, 0.6, 1, 0x4a7a3a);        // hills
      } else if (gd === 'sun') {
        for (i = 0; i < 5; i++) { x = (hash01(i, 80) - 0.5) * 26; z = -15 - hash01(i, 81) * 6; B.box(0.08, 2.4, 0.08, x, 1.2, z, 0xd8d8d0); B.cyl(0, 1.3, 0.5, 8, x, 2.5, z, pickOf([0xe8c547, 0xc0392b, 0x2d6fd0], i, 82)); }   // sun umbrellas
        B.box(1.6, 3.2, 1.2, 9, 1.6, -18, 0xc07a3a); B.box(0.9, 1.1, 1.2, 9.3, 3.6, -17.6, 0xc07a3a); B.box(0.3, 0.8, 0.2, 9.2, 4.5, -17.8, 0xc07a3a); B.box(0.5, 0.5, 2.6, 9, 0.6, -19.6, 0xc07a3a, 0.4, 0, 0);   // an inflatable kangaroo
      } else if (gd === 'beach') {
        B.box(140, 0.06, 12, 0, 0.02, -31, 0x2a7ab8); B.box(140, 0.07, 0.4, 0, 0.03, -25.2, 0xf4f8ff);                             // the sea + surf
        for (i = 0; i < 6; i++) { x = (hash01(i, 83) - 0.5) * 30; B.box(0.08, 2.4, 0.08, x, 1.2, -17 - i, 0xd8d8d0); B.cyl(0, 1.3, 0.5, 8, x, 2.5, -17 - i, pickOf([0xff5a8a, 0x3ac8e0, 0xe8c547], i, 84)); }
      } else if (gd === 'frost') {
        for (i = 0; i < 12; i++) { x = -34 + i * 6 + hash01(i, 85) * 3; z = -24 - hash01(i, 86) * 6; var ph = 5 + hash01(i, 87) * 4;   // pines
          B.box(0.3, 1.2, 0.3, x, 0.6, z, 0x4a3a2a); B.cyl(0, 1.9, ph, 8, x, 1 + ph / 2, z, 0x2a4a3a); B.cyl(0, 1.2, ph * 0.4, 8, x, 1 + ph * 0.85, z, 0xf4f8ff); }
        B.box(140, 0.05, 6, 0, 0.02, -30, 0xc8dcec);                                                                            // Baikal, frozen
        for (i = 0; i < 8; i++) B.shape(new THREE.IcosahedronGeometry(1.4, 0), (hash01(i, 88) - 0.5) * 24, 0.1, -4 - hash01(i, 89) * 12, 1.6, 0.4, 1.2, 0xf4f8ff);   // snowbanks
        B.box(1.2, 2.6, 0.8, -8.5, 1.3, -9, 0xbfe0f4); B.box(0.8, 0.8, 1.6, -8.5, 2.7, -8.8, 0xbfe0f4); B.box(0.2, 1.0, 0.2, -8.2, 3.4, -8.3, 0xbfe0f4, 0, 0, 0.5); B.box(0.2, 1.0, 0.2, -8.8, 3.4, -8.3, 0xbfe0f4, 0, 0, -0.5);   // an ice moose
        B.box(2 * V.sw, 0.12, 2.6, 0, V.hs + 0.02, 0.3, 0xf4f8ff);                                                               // snow on the deck
      }
    }
    function buildHall(B, G, D) {
      var V = D.V, w = V.w, back = V.back, front = V.front || DEFAULT_FRONT, i, t, s;
      crowdSea(B, D, front - 2.9, -9.2, w - 0.6, 0.6, true);                                                                     // arena floor seats
      for (t = 0; t < 8; t++) B.box(2 * w, 0.5, 0.75, 0, 0.25 + t * 0.5, -9.8 - t * 0.7, t % 2 ? 0x5a2a2a : 0x6a3030);             // tiers at the back
      crowdSea(B, D, -9.8, -9.8 - 8 * 0.7 + 0.1, w - 0.4, 0.7, true, 0.5, 0.5);
      for (s = -1; s <= 1; s += 2) for (t = 0; t < 4; t++) B.box(0.8, 0.5, 7, s * (w - 0.4 - t * 0), 0.25 + t * 0.5, -5.5, 0x5a2a2a);   // side tiers
      for (i = 0; i < 16; i++) { var a = i / 16 * Math.PI * 2; G.box(0.5, 0.12, 0.12, Math.cos(a) * 3.2, V.ceil - 0.5, -8 + Math.sin(a) * 3.2, 0xfff2d8, 0, -a, 0); }   // the ring of lights
      B.box(6.8, 0.2, 6.8, 0, V.ceil - 0.2, -8, 0x1e1a22);
      G.box(4.4, 0.9, 0.05, 0, V.ceil - 2.4, back + 0.2, 0xd8323a); G.box(4.0, 0.08, 0.06, 0, V.ceil - 2.4, back + 0.24, 0xfff2d8);   // the red banner
    }
    function flag(B, x, z, h) {
      B.box(0.04, 2.6 * h, 0.04, x, 1.3 * h, z, 0xc9a64a);
      B.box(0.28, 0.6, 0.02, x + 0.16, 2.3 * h, z, 0xd52b1e); B.box(0.3, 0.6, 0.02, x + 0.45, 2.3 * h, z, 0xf2f2f2); B.box(0.28, 0.6, 0.02, x + 0.74, 2.3 * h, z, 0xd52b1e);
      B.box(0.14, 0.16, 0.025, x + 0.45, 2.3 * h, z, 0xd52b1e, 0, 0, Math.PI / 4);
    }
    function arched(B, G, x, y, z, side) {
      var ry = side ? -side * Math.PI / 2 : 0, cols = [0xd84a4a, 0x4a7ad8, 0xe8c84a, 0x4ab86a];
      B.push(x, y, z, 0, ry, 0);
      B.box(0.9, 1.5, 0.05, 0, 0, 0, 0x8a6f4a);
      for (var i = 0; i < 4; i++) G.box(0.34, 0.6, 0.02, (i % 2 ? 0.18 : -0.18), (i < 2 ? 0.33 : -0.33), 0.03, cols[i]);
      G.box(0.5, 0.2, 0.02, 0, 0.78, 0.03, 0xf2e8c8);
      B.pop();
    }

    // ---- Venue sign (one canvas texture) ---------------------------------------------------------------
    function buildSign(D) {
      var V = D.V, c = document.createElement('canvas'); c.width = 512; c.height = 256;
      var g = c.getContext('2d'), neon = D.kind === 'bar' || D.kind === 'club' || D.kind === 'openmic';
      var title = String(D.venueName || V.name).replace(/\s+[—-]\s+.*$/, '').toUpperCase();
      var fit = function (text, max, size, weight) {
        g.font = weight + ' ' + size + 'px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
        var wdt = g.measureText(text).width;
        if (wdt > max) { size = Math.max(18, Math.floor(size * max / wdt)); g.font = weight + ' ' + size + 'px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif'; }
        return size;
      };
      g.textAlign = 'center'; g.textBaseline = 'middle';
      if (D.kind === 'bingo') {
        g.fillStyle = '#16211b'; g.fillRect(0, 0, 512, 256);
        g.fillStyle = '#ffd23c'; g.font = '900 40px system-ui, Arial, sans-serif';
        var L = 'BINGO';
        for (var r = 0; r < 5; r++) {
          g.fillStyle = '#ffd23c'; g.fillText(L[r], 28, 36 + r * 46);
          for (var n = 0; n < 15; n++) {
            var lit = hash01(r * 15 + n, 77) < 0.3;
            g.fillStyle = lit ? '#fff4b0' : '#2c3a31'; g.beginPath(); g.arc(70 + n * 29, 36 + r * 46, 12, 0, Math.PI * 2); g.fill();
            if (lit) { g.fillStyle = '#16211b'; g.font = '800 13px system-ui, Arial, sans-serif'; g.fillText(String(r * 15 + n + 1), 70 + n * 29, 37 + r * 46); g.font = '900 40px system-ui, Arial, sans-serif'; }
          }
        }
      } else if (neon) {
        g.clearRect(0, 0, 512, 256);
        g.shadowColor = D.kind === 'club' ? '#b36bff' : '#ff4fb0'; g.shadowBlur = 18;
        g.strokeStyle = D.kind === 'club' ? '#e0c8ff' : '#ffd0ec'; g.lineWidth = 5;
        fit(title, 460, 64, '900'); g.fillStyle = g.strokeStyle; g.fillText(title, 256, 96); g.fillText(title, 256, 96);
        g.shadowColor = '#3cc4ff'; g.fillStyle = '#c8f0ff'; fit(V.sub, 440, 34, '800'); g.fillText(V.sub, 256, 186); g.fillText(V.sub, 256, 186);
      } else {
        var bgc = { house: '#efe8d8', legion: '#1d3a6a', church: '#2a2a2a', curling: '#c0392b', skatepark: '#2a2a2e', festival: D.dress === 'frost' ? '#1d3a6a' : D.dress === 'mud' ? '#2a1e12' : '#d8323a', hall: '#7a1418' }[D.kind] || '#222';
        var fg = { house: '#1a1a1a', legion: '#f2e6c0', church: '#f4f4f4', curling: '#ffffff', skatepark: '#39ff7a', festival: '#ffe27a', hall: '#fff6e0' }[D.kind] || '#fff';
        g.fillStyle = bgc; g.fillRect(8, 8, 496, 240);
        g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(20, 20, 472, 216);
        g.fillStyle = fg; fit(title, 440, 58, '900'); g.fillText(title, 256, 100);
        fit(V.sub, 430, 30, '800'); g.fillText(V.sub, 256, 178);
      }
      var tex = new THREE.CanvasTexture(c); K.texs.push(tex);
      var mat = ownMat(new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }));
      var wdt = D.kind === 'house' ? 2.4 : D.kind === 'bingo' ? 3.6 : D.kind === 'festival' ? 11 : D.kind === 'hall' ? 5 : 3.4;
      var geo = new THREE.PlaneGeometry(wdt, wdt / 2);
      var m = mesh(geo, mat);
      var y = D.kind === 'house' ? 2.0 : D.kind === 'curling' ? V.ceil - 0.25 : D.kind === 'skatepark' ? 2.9 : D.kind === 'bingo' ? 2.4 : Math.min(V.ceil - 1.0, 2.9);
      m.position.set(D.kind === 'house' ? -0.3 : 0, y, V.back + 0.16);
      if (D.kind === 'curling') { m.scale.set(0.9, 0.45, 1); m.position.z = V.back + 0.23; }
      if (D.kind === 'skatepark') { m.position.z = V.back + 0.05; }
      if (D.kind === 'festival') m.position.set(0, 8.5, V.back - 4);   // v0.7: the festival banner over the far crowd
      if (D.kind === 'hall') m.position.set(0, V.ceil - 1.2, V.back + 0.25);
      m.renderOrder = 1;
    }

    // ---- Lights ----------------------------------------------------------------------------------------
    function buildLights(D) {
      var V = D.V, hs = V.hs, L = K.lights;
      L.hemi = new THREE.HemisphereLight(V.amb[0], V.amb[1], V.amb[2]); K.root.add(L.hemi);
      L.key = new THREE.DirectionalLight(0xfff0dc, V.key); L.key.position.set(1.5, 7, 7); L.key.target.position.set(0, 0, -5);
      K.root.add(L.key); K.root.add(L.key.target);
      L.washL = new THREE.PointLight(D.G.wash[0], 0, 7, 1.2); L.washL.position.set(-1.6, hs + 2.6, -1.4); K.root.add(L.washL);
      L.washR = new THREE.PointLight(D.G.wash[1], 0, 7, 1.2); L.washR.position.set(1.6, hs + 2.6, -1.4); K.root.add(L.washR);
      L.crowd = new THREE.PointLight(0xffffff, 0, 12, 1.2); L.crowd.position.set(0, 3.2, (V.front || DEFAULT_FRONT) - 3.5); K.root.add(L.crowd);
      L.base = V.wash;
    }

    // ---- Light beams (additive cones) ------------------------------------------------------------------
    function buildBeams(D) {
      var V = D.V, hs = V.hs, front = V.front || DEFAULT_FRONT;
      if (V.beams <= 0) return;
      var mat = ownMat(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.22 * V.beams, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      K.beamMat = mat;
      var cone = function (b, ox, oy, oz, tx, ty, tz, r0, r1, c) {
        var dx = tx - ox, dy = ty - oy, dz = tz - oz, len = Math.sqrt(dx * dx + dy * dy + dz * dz);
        var ux = dx / len, uy = dy / len, uz = dz / len;
        var ax = Math.abs(uy) < 0.9 ? 0 : 1, ay = Math.abs(uy) < 0.9 ? 1 : 0;                 // a perpendicular basis
        var px = uy * 0 - uz * ay, py = uz * ax - ux * 0, pz = ux * ay - uy * ax;
        var pl = Math.sqrt(px * px + py * py + pz * pz); px /= pl; py /= pl; pz /= pl;
        var qx = uy * pz - uz * py, qy = uz * px - ux * pz, qz = ux * py - uy * px, n = 10;
        for (var i = 0; i < n; i++) {
          var a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
          var c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
          var A0 = [ox + (px * c0 + qx * s0) * r0, oy + (py * c0 + qy * s0) * r0, oz + (pz * c0 + qz * s0) * r0];
          var A1 = [ox + (px * c1 + qx * s1) * r0, oy + (py * c1 + qy * s1) * r0, oz + (pz * c1 + qz * s1) * r0];
          var B0 = [tx + (px * c0 + qx * s0) * r1, ty + (py * c0 + qy * s0) * r1, tz + (pz * c0 + qz * s0) * r1];
          var B1 = [tx + (px * c1 + qx * s1) * r1, ty + (py * c1 + qy * s1) * r1, tz + (pz * c1 + qz * s1) * r1];
          b.triC(A0, A1, B1, c, c, 0x000000); b.triC(A0, B1, B0, c, 0x000000, 0x000000);
        }
      };
      var sw = V.sw, top = hs + 3.4;
      // Front truss/stand beams down onto the band.
      var bf = new ctx.Builder({ jitter: 0 });
      var nF = D.kind === 'club' || D.kind === 'bar' || D.kind === 'openmic' ? 6 : 4;
      for (var i = 0; i < nF; i++) {
        var fx = nF === 6 ? -sw + 0.1 + i * (2 * sw - 0.2) / 5 : (i < 2 ? -1 : 1) * (sw - 0.15) + (i % 2 ? 0.2 : -0.2);
        var fy = nF === 6 ? top - 0.3 : hs + 2.05, fz = nF === 6 ? front + 0.05 : front + 0.15;
        cone(bf, fx, fy, fz, fx * 0.45, hs, -0.6 + (i % 3) * 0.4, 0.08, 0.6, i % 2 ? sh(D.G.wash[0], 0.9) : sh(D.G.wash[1], 0.9));
      }
      mesh(bf.build(), mat);
      // Back corners: fans of beams out over the crowd (they sweep when the room is wild).
      var mk = function (s) {
        var b = new ctx.Builder({ jitter: 0 }), cz = front - 4;
        for (var j = 0; j < 3; j++) cone(b, 0, 0, 0, (j - 1) * 2.2 - s * 0.6 - s * (sw + 0.6), 0.6 - (hs + 3.4), cz - STAGE_BACK + 0.6, 0.05, 0.75, j === 1 ? 0xffffff : s < 0 ? D.G.wash[0] : D.G.wash[1]);
        var m = mesh(b.build(), mat); m.position.set(s * (sw + 0.6), hs + 3.4, STAGE_BACK - 0.6);
        return m;
      };
      if (D.kind !== 'house') { K.beamsL = mk(-1); K.beamsR = mk(1); }
    }

    // ---- The kit ---------------------------------------------------------------------------------------
    function buildKitStatic(b, hs, color) {
      var shell = color, head = 0xefe9dc, chrome = 0xb9bec6, dark = 0x26262a, i, a, p;
      b.at(0, hs, KZ, Math.PI);
      p = KIT.tomL; b.push(p[0], p[1], p[2], -0.45, 0, -0.15); b.cyl(0.11, 0.11, 0.14, 12, 0, 0, 0, shell); b.cyl(0.115, 0.115, 0.02, 12, 0, 0.07, 0, chrome); b.cyl(0.107, 0.107, 0.01, 12, 0, 0.078, 0, head); b.pop();
      p = KIT.tomR; b.push(p[0], p[1], p[2], -0.45, 0, 0.15); b.cyl(0.11, 0.11, 0.14, 12, 0, 0, 0, shell); b.cyl(0.115, 0.115, 0.02, 12, 0, 0.07, 0, chrome); b.cyl(0.107, 0.107, 0.01, 12, 0, 0.078, 0, head); b.pop();
      b.box(0.03, 0.2, 0.03, 0, 0.6, 0.06, chrome);
      p = KIT.floor; b.cyl(0.16, 0.16, 0.28, 14, p[0], p[1] - 0.14, p[2], shell); b.cyl(0.165, 0.165, 0.02, 14, p[0], p[1], p[2], chrome); b.cyl(0.157, 0.157, 0.01, 14, p[0], p[1] + 0.007, p[2], head);
      for (i = 0; i < 3; i++) { a = i * 2.1 + 0.4; b.box(0.02, 0.3, 0.02, p[0] + 0.18 * Math.cos(a), 0.15, p[2] + 0.18 * Math.sin(a), chrome); }
      p = KIT.snare; b.push(p[0], p[1] - 0.05, p[2], -0.12, 0, -0.1);
      b.cyl(0.15, 0.15, 0.11, 14, 0, 0, 0, shell); b.cyl(0.155, 0.155, 0.02, 14, 0, 0.055, 0, chrome); b.cyl(0.145, 0.145, 0.01, 14, 0, 0.061, 0, 0xf6f2ea);
      b.pop();
      b.box(0.025, p[1] - 0.1, 0.025, p[0], (p[1] - 0.1) / 2, p[2], chrome);
      p = KIT.hat; b.box(0.022, p[1], 0.022, p[0], p[1] / 2, p[2], chrome); b.cyl(0.15, 0.15, 0.014, 16, p[0], p[1] - 0.03, p[2], sh(0xd2a43c, 0.85));
      b.box(0.1, 0.025, 0.24, p[0], 0.015, p[2] - 0.12, dark);
      p = KIT.crash; b.box(0.022, p[1] - 0.02, 0.022, p[0] + 0.04, (p[1] - 0.02) / 2, p[2], chrome, 0, 0, 0.05);
      p = KIT.ride; b.box(0.022, p[1] - 0.02, 0.022, p[0], (p[1] - 0.02) / 2, p[2], chrome);
      b.box(0.09, 0.03, 0.22, 0, 0.02, -0.12, dark);                                                   // kick pedal
      p = KIT.throne; b.cyl(0.16, 0.15, 0.09, 12, p[0], p[1], p[2], 0x1c1c1c); b.box(0.04, 0.45, 0.04, p[0], 0.23, p[2], chrome);
      for (i = 0; i < 3; i++) { a = i * 2.1; b.box(0.02, 0.02, 0.28, 0.12 * Math.sin(a), 0.03, p[2] + 0.12 * Math.cos(a), chrome, 0, a); }
      b.box(0.9, 0.012, 0.9, 0, 0.006, -0.2, 0x3a2e4a);                                                // drum rug
      b.at(0, 0, 0, 0);
    }
    // Moving kit parts: kick shell (pulses), hi-hat top, crash, ride (wobble). World-placed meshes.
    function buildKitParts(hs) {
      var chrome = 0xb9bec6, bronze = 0xd2a43c, head = 0xefe9dc, shell = kitColor(K.D), w = [0, 0, 0];
      var kb = new ctx.Builder({ jitter: 0.03, seed: 9 });
      kb.cyl(0.26, 0.26, 0.36, 16, 0, 0, 0, shell, Math.PI / 2, 0, 0);
      kb.cyl(0.27, 0.27, 0.035, 16, 0, 0, 0.18, chrome, Math.PI / 2, 0, 0); kb.cyl(0.27, 0.27, 0.035, 16, 0, 0, -0.18, chrome, Math.PI / 2, 0, 0);
      kb.cyl(0.25, 0.25, 0.012, 16, 0, 0, 0.194, head, Math.PI / 2, 0, 0); kb.cyl(0.25, 0.25, 0.012, 16, 0, 0, -0.194, head, Math.PI / 2, 0, 0);
      kb.cyl(0.1, 0.1, 0.014, 12, 0, 0, -0.2, sh(shell, 0.5), Math.PI / 2, 0, 0);
      K.kick = mesh(kb.build(), ctx.mats.vc); kitW(KIT.kick, hs, w); K.kick.position.set(w[0], w[1], w[2]);
      var cym = function (r, tiltX, tiltZ) {
        var b = new ctx.Builder({ jitter: 0.02, seed: 13 });
        b.cyl(r, r * 0.97, 0.014, 18, 0, 0, 0, bronze); b.cyl(0.045, 0.05, 0.03, 8, 0, 0.012, 0, sh(bronze, 1.1));
        var m = mesh(b.build(), ctx.mats.vc); m.rotation.set(tiltX, 0, tiltZ); m.userData.rx = tiltX; m.userData.rz = tiltZ;
        return m;
      };
      K.hatTop = cym(0.15, 0, 0); kitW(KIT.hat, hs, w); K.hatTop.position.set(w[0], w[1], w[2]);
      K.crash = cym(0.21, 0.22, -0.28); kitW(KIT.crash, hs, w); K.crash.position.set(w[0], w[1], w[2]);
      K.ride = cym(0.24, 0.18, 0.25); kitW(KIT.ride, hs, w); K.ride.position.set(w[0], w[1], w[2]);
      K.wob = { hat: 0, crash: 0, ride: 0, hatT: 9, crashT: 9, rideT: 9, kickT: 9 };
    }

    // ---- Band ------------------------------------------------------------------------------------------
    // Spots by role (world; yaw 0 faces the camera, PI faces the crowd).
    function spots(V) {
      var k = Math.min(1, V.sw / 2.8), front = V.front || DEFAULT_FRONT;
      return {
        vocals: { x: -0.45 * k, z: front + 0.95, yaw: Math.PI + 0.1 },
        lead: { x: -1.5 * k, z: front + 1.3, yaw: Math.PI - 0.6 },
        rhythm: { x: 1.62 * k, z: front + 1.05, yaw: Math.PI + 0.5 },
        bass: { x: 1.3 * k, z: KZ + 0.2, yaw: -1.0 },
        extra: { x: -1.45 * k, z: KZ - 0.45, yaw: 0.95 }
      };
    }
    function instFor(role) {
      role = String(role || '').toLowerCase();
      if (/bass/.test(role)) return 'bass';
      if (/guitar|acoustic|fiddle|banjo/.test(role)) return 'guitar';
      if (/vocal/.test(role)) return 'mic';
      return 'guitar';
    }
    function buildBand(D) {
      var list = D.members || [], sp = spots(D.V), used = {}, cv = D.flags && D.flags.cape, i, m;
      var capeVariant = typeof cv === 'string' && cv !== 'none' ? (CAPE_OK[cv] ? cv : 'velvet') : null;
      var active = [];
      for (i = 0; i < list.length; i++) { m = list[i]; if (m && m.id && (!m.status || m.status === 'active') && !/drum/i.test(String(m.role || ''))) active.push(m); }
      var capeId = null;
      for (i = 0; i < active.length; i++) if (active[i].id === 'marcel') capeId = 'marcel';
      for (i = 0; !capeId && i < active.length; i++) if (/vocal/.test(String(active[i].role || roleOf(D, active[i].id)))) capeId = active[i].id;
      // Assign slots: vocals, lead, rhythm, bass, extra.
      var order = [];
      for (i = 0; i < active.length; i++) {
        m = active[i];
        var role = String(m.role || roleOf(D, m.id) || '').toLowerCase(), slot = null;
        if (/vocal/.test(role) && !used.vocals) slot = 'vocals';
        else if (/bass/.test(role) && !used.bass) slot = 'bass';
        else if (/lead/.test(role) && !used.lead) slot = 'lead';
        else if (/guitar|acoustic|fiddle|banjo/.test(role)) slot = !used.lead ? 'lead' : !used.rhythm ? 'rhythm' : null;
        if (!slot) slot = !used.extra ? 'extra' : !used.rhythm ? 'rhythm' : !used.lead ? 'lead' : !used.vocals ? 'vocals' : !used.bass ? 'bass' : null;
        if (!slot) continue;                                                          // more than five: they watch from the side
        used[slot] = true;
        order.push({ m: m, slot: slot, role: role });
      }
      for (i = 0; i < order.length; i++) {
        var o = order[i], cm = contentMember(D.band, o.m.id), sp0 = sp[o.slot];
        var ins = o.slot === 'vocals' && !/guitar/.test(o.role) ? 'mic' : instFor(o.role || (cm && cm.role));
        if (o.slot === 'bass') ins = 'bass';
        var cape = o.m.id === capeId ? capeVariant : null;
        var lk = o.m.look || (cm && cm.look) || null;
        if (o.m.corpsePaint) lk = paintLook(lk, o.m.stageShirt);   // v0.6: the rival's lineup (and your defectors) in corpse paint
        var ch = R.buildCharacter(lk, { id: o.m.id, gear: ins === 'mic' ? null : 'guitar', cape: cape });
        if (!ch) continue;
        K.chars.push(ch);
        if (o.m.corpsePaint) corpsePaint(ch, i);
        if (ins !== 'mic') recolorGear(ch, ins === 'bass' ? 0x1d1d22 : o.slot === 'rhythm' ? 0xb8322a : o.slot === 'extra' ? 0x8a4a22 : null, ins === 'bass');
        ch.bones[B_PHONES].scale.setScalar(0); ch.bones[B_HELD].scale.setScalar(0); ch.bones[B_FLOOR].scale.setScalar(0);
        ch.root.position.set(sp0.x, K.hs, sp0.z); ch.root.rotation.y = sp0.yaw;
        K.root.add(ch.root);
        var mood = typeof o.m.mood === 'number' ? o.m.mood : 60;
        K.band.push({ id: o.m.id, slot: o.slot, inst: ins, ch: ch, cape: !!cape, x: sp0.x, z: sp0.z, yaw: sp0.yaw, bx: sp0.x, bz: sp0.z, byaw: sp0.yaw,
          mood: mood, energy: mood < 30 ? 0.45 : mood < 50 ? 0.8 : 1, ph: hash01(i, 31), act: null, actT: 0, actDur: 0 });
        if (ins === 'mic') micStand(sp0.x, sp0.z, sp0.yaw);
      }
    }
    function roleOf(D, id) { var cm = contentMember(D.band, id); return cm && cm.role; }
    // The guitar is Dana's white V; bass and rhythm get their own paint (vertex colours on the gear bone).
    function recolorGear(ch, color, isBass) {
      if (color == null && !isBass) return;
      var g = ch.mesh.geometry, c = g.attributes.color, si = g.attributes.skinIndex, tint = new THREE.Color(color == null ? 0xe9e5dc : color);
      for (var i = 0; i < c.count; i++) {
        if (si.getX(i) !== B_GEAR) continue;
        var r = c.getX(i), gg = c.getY(i), b = c.getZ(i);
        if (r > 0.7 && gg > 0.7 && b > 0.65) { var f = r / 0.914; c.setXYZ(i, Math.min(1, tint.r * f), Math.min(1, tint.g * f), Math.min(1, tint.b * f)); }
      }
      c.needsUpdate = true;
      if (isBass) {                                                              // a longer neck: stretch the gear bone along the body's width
        ch.bones[B_GEAR].scale.set(1.12, 1.05, 1);
      }
    }
    function micStand(x, z, yaw) {
      var b = new ctx.Builder({ jitter: 0 }), fx = Math.sin(yaw), fz = Math.cos(yaw), d = 0.36;
      b.at(x + fx * d, K.hs, z + fz * d, yaw);
      for (var i = 0; i < 3; i++) { var a = i * 2.1; b.box(0.02, 0.02, 0.3, 0.12 * Math.sin(a), 0.03, 0.12 * Math.cos(a), 0x1a1a1a, 0, a); }
      b.box(0.025, 1.45, 0.025, 0, 0.73, 0, 0x1a1a1a);
      b.box(0.022, 0.022, 0.34, 0, 1.46, -0.12, 0x1a1a1a, 0.5, 0, 0);
      b.cyl(0.03, 0.022, 0.12, 8, 0, 1.52, -0.26, 0x2a2a2a, -0.9, 0, 0); b.shape(new THREE.IcosahedronGeometry(0.035, 0), 0, 1.56, -0.3, 1, 1, 1, 0x8a8e94);
      b.at(0, 0, 0, 0);
      mesh(b.build(), ctx.mats.vc);
    }

    // ---- v0.6: corpse paint (white face, black sockets/spikes/drips; same rig as 44_render_carpet), black stage shirts ----
    function paintLook(l, shirt) {
      var o = {}, k; l = l || {};
      for (k in l) o[k] = l[k];
      o.skin = '#ecebe6'; o.shirt = shirt || '#101014'; o.pants = '#0e0e12'; o.top = 'jacket';
      o.extras = (l.extras || []).filter(function (x) { return x !== 'sunglasses' && x !== 'glasses'; });
      return o;
    }
    function corpsePaint(ch, style) {
      var b = new ctx.Builder({ seed: 17 + style, jitter: 0 }), y = 0.295, z = 0.168, blk = 0x0b0b0d;
      b.box(0.1, 0.12, 0.012, 0.075, y, z, blk); b.box(0.1, 0.12, 0.012, -0.075, y, z, blk);
      b.box(0.03, 0.08, 0.012, 0.09, y + 0.09, z, blk, 0, 0, -0.35); b.box(0.03, 0.08, 0.012, -0.09, y + 0.09, z, blk, 0, 0, 0.35);
      b.box(0.02, 0.07, 0.012, 0.075, y - 0.1, z, blk); b.box(0.02, 0.07, 0.012, -0.075, y - 0.1, z, blk);
      if (style % 2) b.box(0.1, 0.02, 0.012, 0, 0.165, z - 0.004, blk); else { b.box(0.02, 0.09, 0.012, 0.03, 0.14, z - 0.004, blk); b.box(0.02, 0.09, 0.012, -0.03, 0.14, z - 0.004, blk); }
      var m = new THREE.Mesh(b.build(), ctx.mats.vc);
      ch.bones[B_HEAD].add(m);
      K.geos.push(m.geometry); K.painted++;
    }
    // The stage end of the room (the v0.3 camera never looks there) + a truss for the banner.
    function buildBackdrop(B, V, D) {
      var zEnd = STAGE_BACK + 1.2, top = V.outdoor ? V.hs + 4.2 : V.ceil, w = V.outdoor ? V.sw + 0.6 : V.w;
      B.box(2 * w + 0.4, top, 0.2, 0, top / 2, zEnd + 0.1, V.outdoor ? 0x15161c : sh(V.wall, 0.7));
      B.box(2 * V.sw, 0.12, 0.12, 0, V.hs + 3.35, STAGE_BACK - 0.05, 0x2a2a2e);
    }
    function buildBanner(D) {
      var c = document.createElement('canvas'); c.width = 1024; c.height = 256;
      var g = c.getContext('2d'), title = String(D.banner).toUpperCase(), size = 132;
      g.fillStyle = '#060608'; g.fillRect(0, 0, 1024, 256);
      g.strokeStyle = '#3a3a44'; g.lineWidth = 6; g.strokeRect(10, 10, 1004, 236);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '900 ' + size + 'px Georgia, "Times New Roman", serif';
      var wdt = g.measureText(title).width;
      if (wdt > 940) { size = Math.max(40, Math.floor(size * 940 / wdt)); g.font = '900 ' + size + 'px Georgia, "Times New Roman", serif'; }
      g.shadowColor = '#9fb8ff'; g.shadowBlur = 16; g.fillStyle = '#f4f4f8'; g.fillText(title, 512, D.bannerSub ? 112 : 128);
      for (var i = 0; i < 14; i++) { var x = 70 + i * 68 + hash01(i, 5) * 20; g.fillRect(x, 40 + hash01(i, 9) * 12, 3, 18 + hash01(i, 11) * 22); }   // frost spikes
      if (D.bannerSub) { g.shadowBlur = 0; g.fillStyle = '#9aa0b4'; g.font = '800 34px system-ui, Arial, sans-serif'; g.fillText(String(D.bannerSub).toUpperCase(), 512, 206); }
      var tex = new THREE.CanvasTexture(c); K.texs.push(tex);
      var mat = ownMat(new THREE.MeshBasicMaterial({ map: tex, fog: false }));
      var wd = Math.min(2 * D.V.sw - 0.4, 5.2), m = mesh(new THREE.PlaneGeometry(wd, wd / 4), mat);
      m.position.set(0, D.V.hs + 2.72, STAGE_BACK - 0.02); m.rotation.y = Math.PI;
    }

    // ---- Drummer (you) with IK sticks -------------------------------------------------------------------
    function buildDrummer(D) {
      var pl = D.drummer || D.player || {}, pre = findPreset(pl.presetId), dl = pl.look || (pre && pre.look) || null;
      if (D.drummer && D.drummer.corpsePaint) dl = paintLook(dl, D.drummer.stageShirt);   // v0.6: their drummer on your throne
      var ch = R.buildCharacter(dl, { id: D.drummer ? D.drummer.id || 'rival_drums' : 'player', sticks: false });
      if (!ch) return;
      K.chars.push(ch);
      if (D.drummer && D.drummer.corpsePaint) corpsePaint(ch, 3);
      ch.bones[B_PHONES].scale.setScalar(0); ch.bones[B_HELD].scale.setScalar(0); ch.bones[B_FLOOR].scale.setScalar(0); ch.bones[B_GEAR].scale.setScalar(0);
      ch.root.position.set(0, K.hs, KZ + THRONE_Z); ch.root.rotation.y = Math.PI;
      K.root.add(ch.root);
      var sb = new ctx.Builder({ jitter: 0 });
      sb.box(0.024, 0.024, 0.42, 0, 0, 0.14, 0xd8b27a); sb.box(0.03, 0.03, 0.05, 0, 0, 0.34, 0xefe0c0);
      var sg = sb.build(); K.geos.push(sg);
      var sticks = [new THREE.Mesh(sg, ctx.mats.vc), new THREE.Mesh(sg, ctx.mats.vc)];
      ch.bones[B_FORE_L].add(sticks[0]); ch.bones[B_FORE_R].add(sticks[1]);
      sticks[0].position.set(0, -0.29, 0.03); sticks[1].position.set(0, -0.29, 0.03);
      var scale = ch.root.scale.y, bw = ch.look.build, sx = 0.25 * bw + 0.075, seat = KIT.throne[1] + 0.05, hipsY = seat / scale + 0.08;
      var shoulderY = 1.37 - HIPS_Y + hipsY;
      var SL = [sx, shoulderY, 0], SR = [-sx, shoulderY, 0];
      // Pose table per strike: [down pose 6 values, up pose 6 values] for the playing hand.
      var poses = {}, lane, st;
      var solve = function (key, spec) {
        var S0 = spec.hand === 'L' ? SL : SR, tip = [spec.tip[0] / scale, spec.tip[1] / scale, (spec.tip[2] + THRONE_Z) / scale];
        poses[key] = { hand: spec.hand, down: armPose(S0, tip, spec.hand === 'L' ? 1 : -1, 0.42), up: armPose(S0, [tip[0], tip[1] + 0.12, tip[2] - 0.05], spec.hand === 'L' ? 1 : -1, -0.55) };
      };
      for (lane in STRIKE) { st = STRIKE[lane]; if (!st) continue; solve(lane, st); if (st.alt) solve(lane + '2', st.alt); }
      K.drummer = { ch: ch, sticks: sticks, poses: poses, seat: seat / scale,
        L: { cur: new Float32Array(6), key: 'snare', t: 9 }, R: { cur: new Float32Array(6), key: 'hat', t: 9 }, kickT: 9, tomAlt: 0, flinch: 9 };
      copyPose(K.drummer.L.cur, poses.snare.up); copyPose(K.drummer.R.cur, poses.hat.up);
    }
    function copyPose(out, p) { for (var i = 0; i < 6; i++) out[i] = p[i]; }
    // ---- Crowd (instanced) -----------------------------------------------------------------------------
    function buildCrowd(D) {
      var V = D.V, G = D.G, front = (V.front || DEFAULT_FRONT) - (D.kind === 'club' ? 1.25 : 0.5), back = V.back + 0.8, xw = V.w - 0.45, i;
      // Slots: a jittered grid, nearest the stage first.
      var slots = [];
      for (var z = front; z > back; z -= 0.5) for (var x = -xw; x <= xw + 0.001; x += 0.5) {
        var j = slots.length, px = x + (hash01(j, 1) - 0.5) * 0.22 + ((Math.round((front - z) / 0.5) % 2) ? 0.25 : 0), pz = z + (hash01(j, 2) - 0.5) * 0.2;
        if (px < -xw || px > xw) continue;
        if (D.kind === 'house' && px > 0.0 && pz < V.back + 1.4) continue;               // the couch
        if (D.kind === 'bar' && px > V.w - 1.7 && pz < -3.2) continue;                     // the bar
        if (D.kind === 'curling' && px > V.w - 1.0 && pz < -4.5 && pz > -6.2) continue;
        if (D.kind === 'church' && px < -V.w + 1.8 && pz > -3.5 && pz < -2.5) continue;    // the piano
        if (D.view === 'spectator' && (px - SPEC.x) * (px - SPEC.x) + (pz - (V.front || DEFAULT_FRONT) + SPEC.back) * (pz - (V.front || DEFAULT_FRONT) + SPEC.back) < SPEC.clear * SPEC.clear) continue;   // v0.6: the riser
        slots.push({ x: px, z: pz, d: Math.sqrt(px * px * 0.35 + (pz - front) * (pz - front)) });
      }
      slots.sort(function (a, b) { return a.d - b.d; });
      var n = Math.min(D.crowd, slots.length, MAX_CROWD);
      var C = K.crowd = {
        n: n, front: front, back: back, xw: xw,
        hx: new Float32Array(MAX_CROWD), hz: new Float32Array(MAX_CROWD), px: new Float32Array(MAX_CROWD), pz: new Float32Array(MAX_CROWD),
        yaw: new Float32Array(MAX_CROWD), aLx: new Float32Array(MAX_CROWD), aLz: new Float32Array(MAX_CROWD), aRx: new Float32Array(MAX_CROWD), aRz: new Float32Array(MAX_CROWD),
        hp: new Float32Array(MAX_CROWD), ph: new Float32Array(MAX_CROWD), en: new Float32Array(MAX_CROWD), sc: new Float32Array(MAX_CROWD),
        ang: new Float32Array(MAX_CROWD), spd: new Float32Array(MAX_CROWD), ldx: new Float32Array(MAX_CROWD), ldz: new Float32Array(MAX_CROWD),
        hairType: new Uint8Array(MAX_CROWD), hairIdx: new Uint16Array(MAX_CROWD), glow: new Uint8Array(MAX_CROWD),
        pitX: 0.55, pitZ: front - 2.1, pitR: 1.6
      };
      if (D.kind === 'house') C.pitZ = front - 1.3;
      // Line-dance grid: rows facing the stage.
      var grid = [];
      for (z = front - 0.2; z > back; z -= 0.95) for (x = -xw + 0.3; x <= xw - 0.3; x += 0.8) grid.push({ x: x, z: z, d: Math.sqrt(x * x * 0.35 + (z - front) * (z - front)) });
      grid.sort(function (a, b) { return a.d - b.d; });
      var nA = 0, nB = 0;
      for (i = 0; i < n; i++) {
        C.hx[i] = C.px[i] = slots[i].x; C.hz[i] = C.pz[i] = slots[i].z;
        C.ph[i] = hash01(i, 3); C.en[i] = 0.75 + hash01(i, 4) * 0.5; C.sc[i] = 0.9 + hash01(i, 5) * 0.2;
        C.ang[i] = Math.atan2(slots[i].z - C.pitZ, slots[i].x - C.pitX); C.spd[i] = (hash01(i, 6) < 0.5 ? -1 : 1) * (1.3 + hash01(i, 7) * 1.2);
        var gp = grid[i % grid.length]; C.ldx[i] = gp.x; C.ldz[i] = gp.z;
        C.aLx[i] = 0.05; C.aRx[i] = 0.05; C.aLz[i] = 0.1; C.aRz[i] = -0.1;
        C.hairType[i] = hash01(i, 8) < G.hairA ? 0 : 1; C.hairIdx[i] = C.hairType[i] ? nB++ : nA++;
      }
      // Geometry: body (legs + torso), head (pivot at the neck), hair A/B, arm (pivot at the shoulder).
      var bb = new ctx.Builder({ jitter: 0.05, seed: 23 });
      bb.box(0.14, 0.78, 0.16, 0.1, 0.39, 0, 0x5a6478); bb.box(0.14, 0.78, 0.16, -0.1, 0.39, 0, 0x5a6478);
      bb.box(0.15, 0.07, 0.24, 0.1, 0.035, 0.04, 0x202020); bb.box(0.15, 0.07, 0.24, -0.1, 0.035, 0.04, 0x202020);
      bb.box(0.42, 0.56, 0.24, 0, 1.06, 0, 0xffffff); bb.box(0.5, 0.14, 0.26, 0, 1.3, 0, 0xf2f2f2);
      bb.box(0.18, 0.14, 0.012, 0, 1.14, 0.126, 0xb0b0b0);
      var hb = new ctx.Builder({ jitter: 0.04, seed: 29 });
      hb.box(0.11, 0.08, 0.11, 0, 0.02, 0, 0xe8e8e8); hb.box(0.25, 0.27, 0.25, 0, 0.18, 0, 0xffffff);
      hb.box(0.045, 0.05, 0.02, 0.06, 0.2, 0.126, 0x151515); hb.box(0.045, 0.05, 0.02, -0.06, 0.2, 0.126, 0x151515);
      hb.box(0.08, 0.016, 0.012, 0, 0.1, 0.126, 0x7a4a3a);
      var ab = new ctx.Builder({ jitter: 0.04, seed: 31 });
      ab.box(0.11, 0.5, 0.12, 0, -0.25, 0, 0xf0f0f0); ab.box(0.1, 0.1, 0.11, 0, -0.55, 0.01, 0xffffff);
      var mat = ownMat(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
      K.crowdMat = mat;
      C.body = instanced(bb.build(), mat, MAX_CROWD, n);
      C.head = instanced(hb.build(), mat, MAX_CROWD, n);
      C.hairA = instanced(hairGeo(G.hair[0]), mat, MAX_CROWD, nA);
      C.hairB = instanced(hairGeo(G.hair[1]), mat, MAX_CROWD, nB);
      var ag = ab.build();
      C.armL = instanced(ag, mat, MAX_CROWD, n); C.armR = instanced(ag, mat, MAX_CROWD, n, true);
      for (i = 0; i < MAX_CROWD; i++) {
        var party = D.kind === 'house' || D.kind === 'church' || D.kind === 'bingo';
        col.setHex(party && hash01(i, 12) < 0.4 ? pickOf([0xd8a04a, 0x5a8ad8, 0xe07a8a, 0x7ab86a, 0xefe8d8], i, 13) : pickOf(G.shirts, i, 9));
        C.body.setColorAt(i, col);
        col.setHex(pickOf(SKINS, i, 10)); C.head.setColorAt(i, col); C.armL.setColorAt(i, col); C.armR.setColorAt(i, col);
      }
      for (i = 0; i < n; i++) {
        col.setHex(C.hairType[i] ? pickOf(G.hairColsB, i, 11) : pickOf(G.hairCols, i, 12));
        (C.hairType[i] ? C.hairB : C.hairA).setColorAt(C.hairIdx[i], col);
      }
      // Fill unused hair slots so instanceColor exists for the full buffer.
      col.setHex(0x222222);
      for (i = nA; i < MAX_CROWD; i++) C.hairA.setColorAt(i, col);
      for (i = nB; i < MAX_CROWD; i++) C.hairB.setColorAt(i, col);
      C.nA = nA; C.nB = nB;
      // The crowd surfer (only when the room is wild) is someone near the front middle.
      C.surfer = n > 12 ? Math.min(n - 1, 5) : -1;
    }
    function instanced(geo, mat, max, count, own) {
      var m = new THREE.InstancedMesh(geo, mat, max);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.count = count; m.frustumCulled = false;
      for (var i = 0; i < max; i++) m.setMatrixAt(i, zero);
      K.root.add(m);
      if (!own) K.geos.push(geo);
      return m;
    }
    function hairGeo(style) {
      var b = new ctx.Builder({ jitter: 0.04, seed: 37 }), W = 0xffffff;
      switch (style) {
        case 'long': b.box(0.27, 0.07, 0.27, 0, 0.32, 0, W); b.box(0.28, 0.42, 0.06, 0, 0.13, -0.14, W); b.box(0.04, 0.3, 0.2, 0.14, 0.17, -0.02, W); b.box(0.04, 0.3, 0.2, -0.14, 0.17, -0.02, W); break;
        case 'mohawk': b.box(0.06, 0.2, 0.27, 0, 0.38, 0, W); break;
        case 'beanie': b.box(0.27, 0.12, 0.27, 0, 0.33, 0, W); b.box(0.28, 0.04, 0.28, 0, 0.27, 0, 0xdddddd); break;
        case 'cowboy': b.box(0.5, 0.025, 0.46, 0, 0.3, 0, W); b.box(0.27, 0.14, 0.25, 0, 0.38, 0, W); b.box(0.28, 0.03, 0.26, 0, 0.33, 0, 0x555555); break;
        case 'cap': b.box(0.27, 0.1, 0.27, 0, 0.33, 0, W); b.box(0.22, 0.02, 0.16, 0, 0.29, 0.18, W); break;
        default: b.box(0.27, 0.06, 0.27, 0, 0.32, 0, W); b.box(0.27, 0.16, 0.05, 0, 0.24, -0.13, W); b.box(0.03, 0.08, 0.2, 0.13, 0.26, -0.02, W); b.box(0.03, 0.08, 0.2, -0.13, 0.26, -0.02, W);
      }
      return b.build();
    }

    // ---- Props: glows (lighters/phones), cups, boo bubbles, hit flashes, shadows ------------------------
    function buildProps(D) {
      var C = K.crowd, i;
      var gm = ownMat(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      var gg = new THREE.OctahedronGeometry(0.09, 0); gg.scale(1, 1.6, 0.6);
      C.glows = instanced(gg, gm, MAX_CROWD, C.n);
      col.setHex(0xffa030); for (i = 0; i < MAX_CROWD; i++) C.glows.setColorAt(i, col);
      // Red cups.
      var cb = new ctx.Builder({ jitter: 0.02, seed: 41 });
      cb.cyl(0.05, 0.036, 0.12, 8, 0, 0, 0, 0xd02a2a); cb.cyl(0.052, 0.052, 0.02, 8, 0, 0.055, 0, 0xf2f2f2);
      K.cups = { mesh: instanced(cb.build(), K.crowdMat, MAX_CUPS, MAX_CUPS), list: [] };
      col.setHex(0xffffff); for (i = 0; i < MAX_CUPS; i++) { K.cups.mesh.setColorAt(i, col); K.cups.list.push({ on: false, t: 0, dur: 1, x0: 0, y0: 0, z0: 0, x1: 0, y1: 0, z1: 0, h: 1, spin: 0, lie: 0, delay: 0 }); }
      // BOO! bubbles.
      var c = document.createElement('canvas'); c.width = 128; c.height = 80;
      var g = c.getContext('2d');
      g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(20, 6); g.lineTo(108, 6); g.quadraticCurveTo(122, 6, 122, 20); g.lineTo(122, 50); g.quadraticCurveTo(122, 64, 108, 64);
      g.lineTo(52, 64); g.lineTo(34, 78); g.lineTo(38, 64); g.lineTo(20, 64); g.quadraticCurveTo(6, 64, 6, 50); g.lineTo(6, 20); g.quadraticCurveTo(6, 6, 20, 6); g.fill();
      g.fillStyle = '#d02a2a'; g.font = '900 40px system-ui, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('BOO!', 64, 36);
      var bt = new THREE.CanvasTexture(c); K.texs.push(bt);
      var bm = ownMat(new THREE.MeshBasicMaterial({ map: bt, transparent: true, depthWrite: false, fog: false }));
      K.boos = { mesh: instanced(new THREE.PlaneGeometry(0.62, 0.39), bm, MAX_BOOS, MAX_BOOS), list: [] };
      for (i = 0; i < MAX_BOOS; i++) K.boos.list.push({ on: false, t: 0, who: 0, dx: 0, delay: 0 });
      K.boos.mesh.renderOrder = 3;
      // Hit flashes on the drums (camera-facing glow quads).
      var fm = ownMat(new THREE.MeshBasicMaterial({ map: ctx.radialTexture('glow'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      K.flash = { mesh: instanced(new THREE.PlaneGeometry(0.5, 0.5), fm, N_FLASH, N_FLASH), t: new Float32Array(N_FLASH), pos: [] };
      K.flash.mesh.renderOrder = 4;
      var w = [0, 0, 0], keys = ['kick', 'snare', 'hat', 'cymbal', 'toms', 'ride'], at = { kick: [0, 0.62, 0.05], snare: KIT.snare, hat: KIT.hat, cymbal: KIT.crash, toms: KIT.tomL, ride: KIT.ride };
      for (i = 0; i < N_FLASH; i++) { kitW(at[keys[i]], K.hs, w); K.flash.pos.push([w[0], w[1] + 0.03, w[2]]); K.flash.t[i] = 9; col.setHex(0xffffff); K.flash.mesh.setColorAt(i, col); }
      // Floor pool that marks the pit / the wall-of-death corridor while a formation runs.
      var pm = ownMat(new THREE.MeshBasicMaterial({ map: ctx.radialTexture('soft'), color: D.G.wash[1], transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      var pg = new THREE.PlaneGeometry(1, 1); pg.rotateX(-Math.PI / 2);
      K.pit = mesh(pg, pm); K.pit.position.set(C.pitX, 0.02, C.pitZ); K.pit.visible = false; K.pit.renderOrder = 2;
      // Blob shadows: crowd + band + drummer.
      var sm = ownMat(new THREE.MeshBasicMaterial({ map: ctx.radialTexture('shadow'), transparent: true, depthWrite: false }));
      var sgeo = new THREE.PlaneGeometry(1, 1); sgeo.rotateX(-Math.PI / 2);
      K.shadows = instanced(sgeo, sm, MAX_CROWD + 8, C.n + K.band.length + 1);
    }

    // ---- The house-party dog ----------------------------------------------------------------------------
    function buildDog(D) {
      var b = new ctx.Builder({ jitter: 0.05, seed: 43 }), fur = 0xb07a3a, dark = 0x5a3a1c, white = 0xf2ead8;
      b.box(0.24, 0.2, 0.5, 0, 0.36, 0, fur); b.box(0.2, 0.12, 0.3, 0, 0.3, 0.05, white);
      b.box(0.2, 0.2, 0.22, 0, 0.5, 0.3, fur); b.box(0.12, 0.1, 0.14, 0, 0.45, 0.46, white); b.box(0.05, 0.04, 0.03, 0, 0.49, 0.535, 0x151515);
      b.box(0.04, 0.04, 0.02, 0.06, 0.55, 0.415, 0x151515); b.box(0.04, 0.04, 0.02, -0.06, 0.55, 0.415, 0x151515);
      b.box(0.06, 0.12, 0.08, 0.1, 0.62, 0.26, dark, 0, 0, -0.4); b.box(0.06, 0.12, 0.08, -0.1, 0.62, 0.26, dark, 0, 0, 0.4);
      b.box(0.07, 0.03, 0.03, 0, 0.42, 0.18, 0xd02a2a);                                           // collar
      for (var i = 0; i < 4; i++) b.box(0.07, 0.26, 0.07, (i % 2 ? 0.08 : -0.08), 0.13, (i < 2 ? 0.17 : -0.17), i < 2 ? fur : dark);
      var dog = mesh(b.build(), ctx.mats.vc);
      var tb = new ctx.Builder({ jitter: 0 }); tb.box(0.05, 0.05, 0.22, 0, 0, -0.1, fur, -0.5, 0, 0);
      var tail = mesh(tb.build(), ctx.mats.vc, dog); tail.position.set(0, 0.44, -0.24);
      var C = K.crowd;
      K.dog = { m: dog, tail: tail, x: 0.6, z: C.front - 0.6, yaw: 0, tx: 0.6, tz: C.front - 0.6, wait: 1, sit: 0, hop: 0 };
      dog.position.set(K.dog.x, 0, K.dog.z);
    }

    // ---- Camera framing ---------------------------------------------------------------------------------
    var CAM = { pos: [0.35, 3.25, 4.2], look: [-0.05, -0.05, -3.6], bandFov: 45, minHFov: 38 };
    var SPEC = { x: 0.85, y: 2.9, back: 5.2, clear: 1.6, look: [0.1, 1.2, -0.3], bandFov: 40, minHFov: 42 };   // v0.6: a riser in the crowd, facing the stage
    function frame() {
      var cam = ctx.camera, sz = ctx.size(), W = sz.w, H = sz.h, F = pending.frame, spec = K && K.D.view === 'spectator', CF = spec ? SPEC : CAM;
      var top = F.top || 0, bottom = F.bottom < 0 ? Math.round(H / 3) : F.bottom;
      var bandH = Math.max(80, H - top - bottom);
      var tb = Math.tan(CF.bandFov * Math.PI / 360), minT = Math.tan(CF.minHFov * Math.PI / 360) * bandH / W;
      if (minT > tb) tb = minT;
      var tFull = tb * H / bandH;
      cam.fov = 2 * Math.atan(tFull) * 180 / Math.PI; cam.aspect = W / H; cam.near = 0.1; cam.far = 90;
      camOffY = Math.round(H / 2 - (top + bandH / 2)); camFov = cam.fov;
      cam.setViewOffset(W, H, 0, camOffY, W, H);
      cam.updateProjectionMatrix();
      var hs = K ? K.hs : 0;
      if (spec) {
        cam.position.set(SPEC.x, Math.min(K.V.ceil ? K.V.ceil - 0.35 : 99, hs + SPEC.y), K.front - SPEC.back);
        cam.lookAt(SPEC.look[0], hs + SPEC.look[1], KZ + SPEC.look[2]);
      } else {
        cam.position.set(CAM.pos[0], hs + CAM.pos[1], CAM.pos[2]);
        cam.lookAt(CAM.look[0], hs * 0.5 + CAM.look[1], CAM.look[2]);
      }
      cam.updateMatrixWorld();
      qCam.copy(cam.quaternion);
    }

    // ======================================================================================================
    // Runtime
    function levelIdx(v) { return v < 20 ? 0 : v < 40 ? 1 : v < 60 ? 2 : v < 80 ? 3 : 4; }
    function setLevel(v, snap) { S.level = v; if (snap) { S.smooth = v; S.hype = v / 100; S.idx = levelIdx(v); } }
    function onBeat() {
      var now = S.time;
      if (S.lastBeatAt > 0) { var d = now - S.lastBeatAt; if (d > 0.22 && d < 1.3) S.beatLen += (d - S.beatLen) * 0.5; }
      S.lastBeatAt = now;
      if (S.beatT > 0.5) S.beats++;
      S.beatT = 0;
    }
    function moment(kind) {
      if (!K) return false;
      S.moments++;
      if (FORMATIONS[kind]) { S.form.kind = kind; S.form.t = 0; S.form.dur = DUR[kind]; if (kind === 'wallOfDeath') bandAct(frontman(), 'part', 3); return true; }
      if (kind === 'lighters' || kind === 'boo') {
        S.arms.kind = kind; S.arms.t = 0; S.arms.dur = DUR[kind];
        if (kind === 'boo') { spawnBoos(); throwCups(2); }
        return true;
      }
      if (kind === 'drinks') { throwCups(7); return true; }
      if (kind === 'applause') { if (K.D.silent) S.bow = BOW; else S.cheer = 1.4; return true; }   // v0.7: the song ends, the silence breaks
      if (kind === 'capeSpin') return bandAction(null, 'capeSpin');
      if (kind === 'solo') return bandAction(null, 'solo');
      return false;
    }
    function frontman() {
      for (var i = 0; i < K.band.length; i++) if (K.band[i].cape) return K.band[i];
      for (i = 0; i < K.band.length; i++) if (K.band[i].slot === 'vocals') return K.band[i];
      return K.band[0] || null;
    }
    function bySlot(slot) { for (var i = 0; i < K.band.length; i++) if (K.band[i].slot === slot) return K.band[i]; return null; }
    function bandAction(id, action) {
      if (!K || !K.band.length) return false;
      var r = null, i;
      if (id) for (i = 0; i < K.band.length; i++) if (K.band[i].id === id) r = K.band[i];
      if (!r) {
        if (action === 'capeSpin') r = frontman();
        else if (action === 'solo') r = bySlot('lead') || bySlot('rhythm') || K.band[0];
        else if (action === 'fill') r = bySlot('rhythm') || bySlot('lead') || K.band[0];
        else r = K.band[Math.floor(hash01(S.moments++, 51) * K.band.length)];
      }
      if (!r || !DUR[action]) return false;
      bandAct(r, action, DUR[action]);
      if (action === 'capeSpin' || action === 'solo') S.cheer = DUR.cheer;
      return true;
    }
    function bandAct(r, action, dur) { if (!r) return; r.act = action; r.actT = 0; r.actDur = dur; }

    function hit(lane, judgement) {
      if (!K || !K.drummer) return;
      S.hits++;
      var Dm = K.drummer, fi = LANES.indexOf(lane);
      if (judgement === 'miss') { Dm.flinch = 0; return; }
      if (lane === 'kick') { Dm.kickT = 0; K.wob.kickT = 0; S.kickPulse = 1; }
      else {
        var key = lane;
        if (lane === 'toms') { Dm.tomAlt ^= 1; if (Dm.tomAlt) key = 'toms2'; }
        var P = Dm.poses[key];
        if (!P) return;
        var hand = P.hand === 'L' ? Dm.L : Dm.R;
        hand.key = key; hand.t = 0;
        if (lane === 'hat') K.wob.hatT = 0; else if (lane === 'cymbal') K.wob.crashT = 0; else if (lane === 'ride') K.wob.rideT = 0;
      }
      if (fi >= 0 && fi < N_FLASH && !rprefs().calm) {   // v0.6.1 reduced flashing: no hit flashes
        K.flash.t[fi] = 0; col.setHex(HIT_COL[judgement] || HIT_COL.good);
        K.flash.mesh.setColorAt(fi, col); K.flash.mesh.instanceColor.needsUpdate = true;
      }
    }

    function throwCups(n) {
      var C = K.crowd, list = K.cups.list, spawned = 0;
      for (var i = 0; i < list.length && spawned < n; i++) {
        var c = list[i];
        if (c.on) continue;
        var who = Math.floor(hash01(S.moments * 7 + i, 61) * Math.max(1, C.n));
        c.on = true; c.t = 0; c.delay = spawned * 0.22; c.dur = 0.9 + hash01(i, S.moments) * 0.4; c.lie = 0;
        c.x0 = C.px[who] || 0; c.y0 = 1.8; c.z0 = C.pz[who] || C.front;
        c.x1 = (hash01(i, 62 + S.moments) - 0.5) * 2 * K.V.sw * 0.8; c.y1 = K.hs + 0.05; c.z1 = (K.front) + 0.3 + hash01(i, 63 + S.moments) * 1.8;
        c.h = 1.3 + hash01(i, 64) * 0.9; c.spin = (hash01(i, 65) - 0.5) * 20;
        spawned++;
      }
    }
    function spawnBoos() {
      var C = K.crowd;
      for (var i = 0; i < K.boos.list.length; i++) {
        var b = K.boos.list[i];
        b.on = true; b.t = 0; b.delay = i * 0.55; b.who = Math.floor(hash01(i + S.moments * 5, 71) * Math.max(1, Math.min(C.n, 40))); b.dx = (hash01(i, 72) - 0.5) * 0.3;
      }
    }

    // ---- Per-frame update ---------------------------------------------------------------------------------
    function update(dt, t) {
      if (!K) return;
      var cam = ctx.camera;
      if (cam.fov !== camFov || !cam.view || cam.view.offsetY !== camOffY) frame();   // core rig glide from the garage
      S.time += dt;
      S.smooth = approach(S.smooth, S.level, 2.2, dt);
      S.hype = S.smooth / 100; S.idx = levelIdx(S.smooth);
      S.beatT += dt / S.beatLen;
      if (S.beatT >= 1) { S.beatT -= Math.floor(S.beatT); S.beats++; }
      if (S.form.kind) { S.form.t += dt; if (S.form.t >= S.form.dur) S.form.kind = null; }
      if (S.arms.kind) { S.arms.t += dt; if (S.arms.t >= S.arms.dur) S.arms.kind = null; }
      if (S.cheer > 0) S.cheer -= dt;
      if (S.bow > 0) S.bow -= dt;
      S.kickPulse = Math.max(0, S.kickPulse - dt * 7);
      updateLights(dt, t);
      updateBand(dt, t);
      updateDrummer(dt, t);
      updateKit(dt);
      updateCrowd(dt, t);
      updateProps(dt, t);
      if (K.dog) updateDog(dt, t);
      for (var i = 0; i < K.spin.length; i++) K.spin[i].m.rotation.y += K.spin[i].speed * dt;
    }

    function updateLights(dt, t) {
      var L = K.lights, h = S.hype, bt = bump(S.beatT), base = L.base;
      var wild = S.idx >= 4, lit = S.arms.kind === 'lighters' ? 0.45 : 1, calm = rprefs().calm;   // v0.6.1: calm = no strobing washes
      var pulse = calm ? base * (0.5 + 0.6 * h) * lit : base * (0.5 + 0.6 * h) * (0.85 + 0.3 * bt * (0.3 + h)) * lit + S.kickPulse * 0.25 * base;
      L.washL.intensity = pulse * (wild && !calm && (S.beats % 2) ? 0.5 : 1.25);
      L.washR.intensity = pulse * (wild && !calm && !(S.beats % 2) ? 0.5 : 1.25);
      var F = S.form.kind, C = K.crowd;
      if (F) {                                                                  // a coloured spot follows the pit
        var fin = ease(Math.min(1, S.form.t / 0.6)) * ease(Math.min(1, (S.form.dur - S.form.t) / 0.8));
        L.crowd.position.set(C.pitX, 2.6, C.pitZ + 0.4); L.crowd.distance = 5.5;
        L.crowd.intensity = (0.3 + 2.6 * fin) * Math.max(0.6, base) * (0.8 + 0.4 * bt);
        col.setHex(F === 'lineDance' ? 0xffd070 : F === 'wallOfDeath' ? 0xff4030 : F === 'circlePit' ? 0x40ff90 : 0xffa040);
      } else {
        L.crowd.position.set(0, 3.2, C.front - 3.0); L.crowd.distance = 12;
        L.crowd.intensity = (0.25 + 0.5 * h) * base * (S.arms.kind === 'lighters' ? 0.4 : 1);
        if (wild) col.setHSL(frac(t * 0.07), 0.8, 0.6); else col.setHex(0xfff0e0);
      }
      L.crowd.color.copy(col);
      if (K.beamMat) {
        K.beamMat.opacity = K.V.beams * (0.06 + 0.12 * h + 0.07 * bt * h) * lit;
        var sw = wild ? 0.35 : S.idx >= 3 ? 0.15 : 0.05;
        if (K.beamsL) { K.beamsL.rotation.y = sw * Math.sin(t * 1.3); K.beamsL.rotation.z = sw * 0.3 * Math.sin(t * 0.9); }
        if (K.beamsR) { K.beamsR.rotation.y = -sw * Math.sin(t * 1.3 + 0.8); K.beamsR.rotation.z = -sw * 0.3 * Math.sin(t * 0.9 + 0.5); }
      }
    }

    function rot(b, x, y, z) { b.rotation.set(x, y, z); }
    function updateBand(dt, t) {
      var G = K.D.G, h = S.hype, bt = S.beatT, beat = bump(bt), total = S.beats + bt;
      for (var i = 0; i < K.band.length; i++) {
        var r = K.band[i], bn = r.ch.bones, e = r.energy, ph = r.ph, k;
        if (r.act) { r.actT += dt; if (r.actT >= r.actDur) r.act = null; }
        for (k = 1; k < bn.length; k++) if (k !== B_PHONES && k !== B_HELD && k !== B_FLOOR && k !== B_GEAR) bn[k].rotation.set(0, 0, 0);
        var bang = G.bang * clamp((h - 0.35) / 0.5, 0, 1) * e, bob = bump(frac(bt + ph * 0.1));
        bn[B_HIPS].position.y = HIPS_Y - 0.035 * bob * (0.4 + h) * e;
        rot(bn[B_LEG_L], 0, 0, 0.13); rot(bn[B_LEG_R], 0, 0, -0.13);
        bn[B_SHIN_L].rotation.x = 0.08 * bob * e; bn[B_SHIN_R].rotation.x = 0.08 * bob * e;
        bn[B_SPINE].rotation.x = 0.06 + 0.12 * bang * bob;
        bn[B_HEAD].rotation.x = (r.mood < 30 ? 0.35 : 0.05) + 0.55 * bang * bob + 0.12 * (1 - bang) * beat * e;
        var x = r.bx, z = r.bz, yaw = r.byaw, a = r.act, u = a ? r.actT / r.actDur : 0;
        if (r.inst === 'mic') {
          rot(bn[B_ARM_R], -1.05, 0, 0.18); rot(bn[B_FORE_R], -0.95, 0, 0.2);
          if (h > 0.55) { rot(bn[B_ARM_L], -2.3 - 0.5 * beat, 0, 0.25); rot(bn[B_FORE_L], -0.2, 0, 0); }
          else { rot(bn[B_ARM_L], -0.3 - 0.25 * Math.sin(t * 1.7 + ph), 0, 0.2); rot(bn[B_FORE_L], -0.6, 0, 0); }
          bn[B_HEAD].rotation.x -= 0.15;
        } else {
          var rate = r.inst === 'bass' ? 2 : 4, amp = r.inst === 'bass' ? 0.12 : 0.18;
          var strum = Math.sin((total * rate) * Math.PI) * amp * e;
          rot(bn[B_ARM_L], 0.1, 0, 0.14); rot(bn[B_FORE_L], -2.05, 0, 0.1 + 0.06 * Math.sin(t * 2 + ph * 5));
          rot(bn[B_ARM_R], -0.35, 0, 0.12); rot(bn[B_FORE_R], -0.95 + strum, 0, 0.45);
          if (r.slot === 'bass') { bn[B_HEAD].rotation.x = 0.05 + (hash01(Math.floor(t / 6), 81) < 0.35 && frac(t / 6) < 0.12 ? 0.3 * bump(frac(t / 6) / 0.12) : 0); bn[B_SPINE].rotation.x = 0.02; }
        }
        // Actions
        if (a === 'capeSpin') {
          var sp = ease(u);
          yaw = r.byaw + sp * Math.PI * 4;
          rot(bn[B_ARM_L], -0.2, 0, 1.3); rot(bn[B_ARM_R], -0.2, 0, -1.3); rot(bn[B_FORE_L], -0.2, 0, 0); rot(bn[B_FORE_R], -0.2, 0, 0);
          bn[B_HIPS].position.y = HIPS_Y + 0.08 * bump(u);
          bn[B_HEAD].rotation.x = -0.25;
        } else if (a === 'solo') {
          var f = ease(Math.min(1, r.actT / 0.6)) * ease(Math.min(1, (r.actDur - r.actT) / 0.6));
          x = r.bx + (0 - r.bx) * 0.45 * f; z = r.bz + (K.front + 0.5 - r.bz) * f; yaw = r.byaw + (Math.PI - r.byaw) * f;
          bn[B_SPINE].rotation.x = -0.3 * f; bn[B_HEAD].rotation.x = -0.35 * f + 0.1 * beat;
          rot(bn[B_ARM_L], 0.1 - 0.4 * f, 0, 0.14 + 0.2 * f); rot(bn[B_FORE_L], -2.05 - 0.4 * f, 0, 0.1 + 0.15 * Math.sin(t * 9));
          bn[B_FORE_R].rotation.x = -0.95 + Math.sin(t * 38) * 0.16;
          rot(bn[B_LEG_L], -0.25 * f, 0, 0.2); bn[B_SHIN_L].rotation.x = 0.35 * f;
        } else if (a === 'fill') {
          bn[B_HIPS].position.y = HIPS_Y + 0.14 * bump(u * 2 < 1 ? u * 2 : 0);
          bn[B_SPINE].rotation.x = -0.22; bn[B_HEAD].rotation.x = 0.35;
          rot(bn[B_ARM_L], -0.25, 0, 0.3); rot(bn[B_FORE_L], -2.3, 0, 0.3); bn[B_FORE_R].rotation.x = -0.95 + Math.sin(t * 44) * 0.2;
        } else if (a === 'miss') {
          var sh2 = bump(u);
          bn[B_HEAD].rotation.y = 0.45 * Math.sin(r.actT * 18) * sh2; bn[B_HEAD].rotation.x = 0.3 * sh2;
          bn[B_ARM_L].rotation.z += 0.3 * sh2; bn[B_ARM_R].rotation.z -= 0.3 * sh2; bn[B_FORE_R].rotation.x = -0.95;
        } else if (a === 'flinch') {
          var fl = bump(u);
          bn[B_SPINE].rotation.x = 0.4 * fl; bn[B_HEAD].rotation.x = 0.5 * fl; rot(bn[B_ARM_L], -2.2 * fl, 0, 0.3); rot(bn[B_ARM_R], -2.2 * fl, 0, -0.3);
        } else if (a === 'part') {
          var pf = bump(u);
          rot(bn[B_ARM_L], -1.2 * pf, 0, 1.2 * pf); rot(bn[B_ARM_R], -1.2 * pf, 0, -1.2 * pf); rot(bn[B_FORE_L], 0, 0, 0); rot(bn[B_FORE_R], 0, 0, 0);
        }
        // Cape
        if (r.cape) {
          var flare = a === 'capeSpin' ? 1.25 * bump(u) + 0.2 : 0.1 * h;
          bn[B_CAPE1].rotation.x = 0.12 + flare + 0.04 * Math.sin(t * 1.3 + ph) + 0.05 * beat * h;
          bn[B_CAPE2].rotation.x = 0.05 + flare * 0.55 + 0.04 * Math.sin(t * 1.7 + 1);
          bn[B_CAPE1].rotation.z = a === 'capeSpin' ? 0.3 * Math.sin(r.actT * 12) : 0;
        }
        r.x = x; r.z = z; r.yaw = yaw;
        r.ch.root.position.set(x, K.hs, z); r.ch.root.rotation.y = yaw;
      }
    }

    function updateDrummer(dt, t) {
      var Dm = K.drummer;
      if (!Dm) return;
      var bn = Dm.ch.bones, seat = Dm.seat, h = S.hype, beat = bump(S.beatT), k;
      for (k = 1; k < bn.length; k++) if (k !== B_PHONES && k !== B_HELD && k !== B_FLOOR && k !== B_GEAR) bn[k].rotation.set(0, 0, 0);
      var hy = seat + 0.08, a = Math.acos(clamp((hy - 0.02 - 0.45) / 0.39, -0.6, 0.6));
      bn[B_HIPS].position.y = hy;
      bn[B_LEG_L].rotation.x = -a; bn[B_SHIN_L].rotation.x = a; bn[B_LEG_R].rotation.x = -a; bn[B_SHIN_R].rotation.x = a;
      bn[B_LEG_L].rotation.z = 0.25; bn[B_LEG_R].rotation.z = -0.25;
      Dm.kickT += dt; Dm.flinch += dt;
      var kp = Dm.kickT < 0.14 ? bump(Dm.kickT / 0.14) : 0;
      bn[B_LEG_R].rotation.x = -a - 0.12 * (1 - kp); bn[B_SHIN_R].rotation.x = a + 0.1 * kp;
      bn[B_HEAD].rotation.x = 0.05 + 0.14 * beat * (0.3 + h) + (Dm.flinch < 0.4 ? 0.2 * bump(Dm.flinch / 0.4) : 0);
      bn[B_HEAD].rotation.y = Dm.flinch < 0.4 ? 0.3 * Math.sin(Dm.flinch * 30) * bump(Dm.flinch / 0.4) : 0;
      bn[B_SPINE].rotation.x = 0.04;
      handPose(Dm, Dm.L, bn[B_ARM_L], bn[B_FORE_L], Dm.sticks[0], dt, 'snare');
      handPose(Dm, Dm.R, bn[B_ARM_R], bn[B_FORE_R], Dm.sticks[1], dt, 'hat');
    }
    function handPose(Dm, H, arm, fore, stick, dt, restKey) {
      H.t += dt;
      if (H.t > 1.2 && H.key !== restKey) H.key = restKey;
      var P = Dm.poses[H.key] || Dm.poses[restKey];
      var lift = H.t < 0.03 ? 0 : ease((H.t - 0.03) / 0.13);
      var idle = H.t > 0.6 ? 0.04 * Math.sin(S.time * 6) : 0;
      var kk = 1 - Math.exp(-45 * dt), cur = H.cur;
      for (var i = 0; i < 6; i++) {
        var goal = P.down[i] + (P.up[i] - P.down[i]) * lift;
        cur[i] = H.t < 0.02 ? goal : cur[i] + (goal - cur[i]) * kk;
      }
      arm.rotation.set(cur[0], 0, cur[1]); fore.rotation.set(cur[2] + idle, 0, cur[3]); stick.rotation.set(cur[4], cur[5], 0);
    }

    function updateKit(dt) {
      var W = K.wob, e;
      W.hatT += dt; W.crashT += dt; W.rideT += dt; W.kickT += dt;
      e = W.hatT < 0.5 ? Math.exp(-W.hatT * 10) : 0;
      K.hatTop.position.y = K.hs + KIT.hat[1] + 0.012 * e; K.hatTop.rotation.x = K.hatTop.userData.rx + 0.08 * e * Math.sin(W.hatT * 40);
      e = W.crashT < 1.5 ? Math.exp(-W.crashT * 3) : 0;
      K.crash.rotation.x = K.crash.userData.rx + 0.3 * e * Math.sin(W.crashT * 22); K.crash.rotation.z = K.crash.userData.rz + 0.18 * e * Math.cos(W.crashT * 19);
      e = W.rideT < 1 ? Math.exp(-W.rideT * 5) : 0;
      K.ride.rotation.x = K.ride.userData.rx + 0.1 * e * Math.sin(W.rideT * 25);
      var kp = W.kickT < 0.15 ? 1 + 0.06 * bump(W.kickT / 0.15) : 1;
      K.kick.scale.set(kp, kp, 1);
      // Flashes
      var F = K.flash, cam = ctx.camera;
      for (var i = 0; i < N_FLASH; i++) {
        F.t[i] += dt;
        var ft = F.t[i];
        if (ft > 0.22) { F.mesh.setMatrixAt(i, zero); continue; }
        var s = (i === 0 ? 1.4 : i === 3 ? 1.3 : 0.9) * (0.6 + 0.9 * Math.sqrt(ft / 0.22)) * (1 - ft / 0.22);
        var p = F.pos[i];
        vA.set(p[0], p[1], p[2]); vScale.set(s, s, s);
        mA.compose(vA, cam.quaternion, vScale);
        F.mesh.setMatrixAt(i, mA);
      }
      F.mesh.instanceMatrix.needsUpdate = true;
    }

    // Crowd: level baseline, then formation (moment) overrides, then arm-mode overrides.
    function updateCrowd(dt, t) {
      var C = K.crowd, n = C.n, lvl = S.idx, h = S.hype, bt = S.beatT, total = S.beats + bt, G = K.D.G;
      var F = S.form.kind, ft = S.form.t, fd = S.form.dur, AM = S.arms.kind, at = S.arms.t, ad = S.arms.dur;
      var fin = F ? ease(Math.min(1, ft / 0.8)) * ease(Math.min(1, (fd - ft) / 1.2)) : 0;
      var amIn = AM ? ease(Math.min(1, at / 0.5)) * ease(Math.min(1, (ad - at) / 0.6)) : 0;
      var cheer = S.cheer > 0 ? ease(Math.min(1, S.cheer / 0.4)) : 0;
      var kPos = 1 - Math.exp(-3.2 * dt), kRun = 1 - Math.exp(-7 * dt), kArm = 1 - Math.exp(-12 * dt), kYaw = 1 - Math.exp(-5 * dt);
      var silent = K.D.silent, surfOn = lvl >= 4 && !F && C.surfer >= 0 && !silent;
      var glowOn = false, i;
      for (i = 0; i < n; i++) {
        var ph = C.ph[i], en = C.en[i], hx = C.hx[i], hz = C.hz[i];
        var bob = bump(frac(bt + ph * 0.18)), tx = hx, tz = hz, ty = 0, tyaw = 0, hp = 0, run = 0;
        var aLx = 0.06, aLz = 0.1, aRx = 0.06, aRz = -0.1, glow = 0;
        // --- baseline by crowd level
        if (lvl === 0) {
          tz = hz - 1.2 * (1 - S.smooth / 20); aLx = -1.25; aLz = -0.95; aRx = -1.2; aRz = 0.95; hp = 0.12;
          if (ph > 0.7) tyaw = 2.7;
        } else if (lvl === 1) {
          tz = hz - 0.6 * (1 - (S.smooth - 20) / 20);
          if (ph < 0.28) { aRx = -1.95; aRz = 0.35; hp = 0.3; glow = 2; }
          tx = hx + 0.03 * Math.sin(t * 0.8 + ph * 9);
        } else if (lvl === 2) {
          tx = hx + 0.07 * Math.sin((total * 0.5 + ph * 0.3) * Math.PI * 2); hp = 0.14 * bob * en;
          if (ph < 0.15) { aRx = -1.95; aRz = 0.35; glow = 2; }
        } else if (lvl === 3) {
          ty = 0.13 * bob * G.jump * en; hp = 0.28 * bob * G.bang;
          if (ph < 0.6) { aRx = -2.4 - 0.5 * bob; aRz = -0.15; }
          if (ph < 0.25) { aLx = -2.5 - 0.4 * bob; aLz = 0.2; }
          tz = hz + 0.2;
        } else {
          ty = 0.32 * bob * G.jump * en; hp = 0.5 * bob * G.bang + 0.1;
          aLx = -2.8 + 0.3 * bob; aLz = 0.35; aRx = -2.8 + 0.3 * bob; aRz = -0.35;
          if (ph > 0.75) { aLx = 0.1; aLz = 0.15; aRx = -2.6 - 0.4 * bob; }
          tz = hz + 0.45;
        }
        if (cheer > 0 && lvl >= 1) { aLx += (-2.8 - aLx) * cheer; aRx += (-2.8 - aRx) * cheer; aLz = 0.35; aRz = -0.35; ty = Math.max(ty, 0.2 * bob * cheer); }
        // --- formations
        if (F) {
          var dx = hx - C.pitX, dz = hz - C.pitZ, d = Math.sqrt(dx * dx + dz * dz), ox = tx, oz = tz;
          if (F === 'mosh' || (F === 'wallOfDeath' && ft > 3.9)) {
            var R0 = F === 'mosh' ? C.pitR : C.pitR + 0.6;
            if (d < R0) {
              var ang = C.ang[i] + ft * C.spd[i], rr = 0.3 + d * 0.8 + 0.28 * Math.sin(ft * 3.1 + ph * 9);
              ox = C.pitX + Math.cos(ang) * rr; oz = C.pitZ + Math.sin(ang) * rr * 0.8; run = 1;
              tyaw = Math.atan2(-Math.sin(ang) * C.spd[i], Math.cos(ang) * C.spd[i] * 0.8);
              aLx = -1.4 + 0.9 * Math.sin(t * 9 + ph * 20); aRx = -1.4 + 0.9 * Math.sin(t * 8.3 + ph * 13); aLz = 0.6; aRz = -0.6;
              ty = 0.14 * Math.abs(Math.sin(t * 7 + ph * 10)); hp = 0.3 * Math.sin(t * 6 + ph * 7);
            } else if (d < R0 + 1.3) {
              ox = C.pitX + dx / d * (R0 + 0.4 + (d - R0) * 0.6); oz = C.pitZ + dz / d * (R0 + 0.4 + (d - R0) * 0.6);
              tyaw = Math.atan2(-dx, -dz) * 0.6; aRx = -2.6 - 0.3 * bob; aRz = -0.2;
            }
          } else if (F === 'circlePit') {
            if (d < 3.1) {
              var ca = C.ang[i] + ft * 1.5, cr = clamp(1.3 + (d / 3.1) * 1.4, 1.3, 2.6);
              ox = C.pitX + Math.cos(ca) * cr; oz = C.pitZ + Math.sin(ca) * cr * 0.8; run = 1;
              tyaw = Math.atan2(-Math.sin(ca), Math.cos(ca) * 0.8);
              ty = 0.1 * Math.abs(Math.sin(t * 9 + ph * 6)); aLx = -0.6 * Math.sin(t * 9 + ph); aRx = 0.6 * Math.sin(t * 9 + ph);
              if (ph < 0.3) { aRx = -2.7; aRz = -0.2; }
            } else { aRx = -2.6 - 0.3 * bob; tyaw = Math.atan2(-dx, -dz) * 0.5; }
          } else if (F === 'wallOfDeath') {
            var side = hx < C.pitX ? -1 : 1;
            if (ft < 3.1) {
              ox = clamp(hx + side * 1.6 * ease(ft / 1.3), -C.xw, C.xw); tyaw = -side * Math.PI / 2 * ease(ft / 1.0);
              ty = 0.08 * bob; aRx = -2.5 - 0.4 * bob; aRz = -0.2; aLx = -1.6 - 0.3 * bob;
            } else {
              var cu = ease((ft - 3.1) / 0.8);
              ox = hx + side * 1.6 * (1 - cu) - side * 1.1 * cu * clamp(1 - Math.abs(hx) / 3, 0.2, 1); tyaw = -side * Math.PI / 2; run = 1;
              aLx = -2.7; aRx = -2.7; aLz = 0.4; aRz = -0.4; ty = 0.1 * Math.abs(Math.sin(t * 10 + ph * 5));
            }
          } else if (F === 'lineDance') {
            var cnt = Math.floor(total) % 8, turn = Math.floor(total / 8), sub = frac(total);
            var step = cnt < 2 ? (cnt + sub) / 2 : cnt < 4 ? 1 - (cnt - 2 + sub) / 2 : 0;
            ox = C.ldx[i] + 0.28 * (step - 0.5); oz = C.ldz[i];
            tyaw = (turn % 4) * Math.PI / 2; if (tyaw > Math.PI) tyaw -= Math.PI * 2;
            ty = cnt === 4 || cnt === 5 ? 0.08 * bump(sub) : 0;
            aLx = 0.25; aLz = 0.45; aRx = 0.25; aRz = -0.45;
            if (cnt === 3 || cnt === 7) { aLx = -1.3; aRx = -1.3; aLz = -0.35 * bump(sub); aRz = 0.35 * bump(sub); }
            hp = 0.08 * bump(sub);
          }
          tx += (ox - tx) * fin; tz += (oz - tz) * fin; tyaw *= fin;
        }
        // --- arm modes
        if (AM === 'lighters') {
          var lighter = ph < 0.7;
          aRx += ((lighter ? -2.75 : -2.1) - aRx) * amIn; aRz += (-0.12 - aRz) * amIn;
          tx += 0.14 * Math.sin(t * 1.6 + hx * 0.5) * amIn; tyaw += 0.12 * Math.sin(t * 1.6 + hx * 0.5) * amIn;
          if (amIn > 0.3) glow = lighter ? 1 : 2;
        } else if (AM === 'boo') {
          if (ph < 0.5) { aLx += (-1.25 - aLx) * amIn; aLz += (-0.95 - aLz) * amIn; aRx += (-1.2 - aRx) * amIn; aRz += (0.95 - aRz) * amIn; }
          else { aRx += (-0.9 - aRx) * amIn; aRz += (-0.1 - aRz) * amIn; aLx += (-0.9 - aLx) * amIn; }
          hp += 0.15 * amIn; ty *= 1 - amIn;
        }
        var lean = 0;
        if (silent) {   // v0.7: a polite crowd: still while the song plays; claps, then bows, when it ends
          tx = hx; tz = hz; ty = 0; tyaw = 0; run = 0; glow = 0; hp = 0.03 * bob; aLx = 0.06; aLz = 0.1; aRx = 0.06; aRz = -0.1;
          if (S.bow > 0) {
            var bt2 = BOW - S.bow;
            if (bt2 < 1.6) { var cl = Math.sin(t * 17 + ph * 2); aLx = -1.3; aRx = -1.3; aLz = -0.45 - 0.22 * cl; aRz = 0.45 + 0.22 * cl; ty = 0.02 * Math.abs(cl); }
            else { var bu = ease(Math.min(1, (bt2 - 1.6) / 0.35)) * ease(Math.min(1, S.bow / 0.5)); lean = 0.42 * bu; hp = 0.4 * bu; aLz = 0.05; aRz = -0.05; }
          }
        }
        // --- smooth + write matrices
        var kp = run ? kRun : kPos;
        C.px[i] += (tx - C.px[i]) * kp; C.pz[i] += (tz - C.pz[i]) * kp;
        C.yaw[i] += (tyaw - C.yaw[i]) * (run ? kRun : kYaw);
        C.aLx[i] += (aLx - C.aLx[i]) * kArm; C.aLz[i] += (aLz - C.aLz[i]) * kArm; C.aRx[i] += (aRx - C.aRx[i]) * kArm; C.aRz[i] += (aRz - C.aRz[i]) * kArm;
        C.hp[i] += (hp - C.hp[i]) * kArm;
        var px = C.px[i], pz = C.pz[i], py = run ? 0.06 * Math.abs(Math.sin(t * 11 + ph * 9)) + ty : ty, rx = lean, yw = C.yaw[i], s = C.sc[i];
        if (surfOn && i === C.surfer) {
          var su = frac(t * 0.08 + 0.3);
          px = C.pitX + 0.8 * Math.sin(t * 0.5); pz = C.front - 0.4 - 3.6 * bump(su); py = 1.55 + 0.05 * Math.sin(t * 4); rx = -1.45; yw = 0.3 * Math.sin(t * 0.7);
        }
        dummy.position.set(px, py, pz); dummy.rotation.set(rx, yw, 0); dummy.scale.set(s, s, s); dummy.updateMatrix();
        C.body.setMatrixAt(i, dummy.matrix);
        mB.makeRotationX(C.hp[i]); mB.setPosition(0, 1.4, 0); mA.multiplyMatrices(dummy.matrix, mB);
        C.head.setMatrixAt(i, mA);
        (C.hairType[i] ? C.hairB : C.hairA).setMatrixAt(C.hairIdx[i], mA);
        eul.set(C.aLx[i], 0, C.aLz[i]); mB.makeRotationFromEuler(eul); mB.setPosition(0.26, 1.32, 0); mA.multiplyMatrices(dummy.matrix, mB);
        C.armL.setMatrixAt(i, mA);
        eul.set(C.aRx[i], 0, C.aRz[i]); mB.makeRotationFromEuler(eul); mB.setPosition(-0.26, 1.32, 0); mC.multiplyMatrices(dummy.matrix, mB);
        C.armR.setMatrixAt(i, mC);
        // lighter flame / phone screen at the right hand
        if (glow && !(surfOn && i === C.surfer)) {
          vA.set(0, -0.64, 0.02).applyMatrix4(mC);
          var fl = glow === 1 ? 1 + 0.25 * Math.sin(t * 23 + ph * 40) : 0.8;
          vScale.set(glow === 1 ? 1 : 1.3, fl * (glow === 1 ? 1 : 0.8), 1);
          mA.compose(vA, qCam, vScale);
          C.glows.setMatrixAt(i, mA);
          if (C.glow[i] !== glow) { col.setHex(glow === 1 ? 0xffa030 : 0x9fd0ff); C.glows.setColorAt(i, col); C.glow[i] = glow; glowOn = true; }
        } else C.glows.setMatrixAt(i, zero);
        // shadow
        var ss = run ? 0.55 : 0.6;
        mA.makeScale(ss * s, 1, ss * s); mA.setPosition(px, 0.012, pz);
        K.shadows.setMatrixAt(i, mA);
      }
      if (glowOn) C.glows.instanceColor.needsUpdate = true;
      C.body.instanceMatrix.needsUpdate = true; C.head.instanceMatrix.needsUpdate = true; C.hairA.instanceMatrix.needsUpdate = true; C.hairB.instanceMatrix.needsUpdate = true;
      C.armL.instanceMatrix.needsUpdate = true; C.armR.instanceMatrix.needsUpdate = true; C.glows.instanceMatrix.needsUpdate = true;
      // Band + drummer shadows.
      for (i = 0; i < K.band.length; i++) { mA.makeScale(0.7, 1, 0.7); mA.setPosition(K.band[i].x, K.hs + 0.012, K.band[i].z); K.shadows.setMatrixAt(n + i, mA); }
      mA.makeScale(0.9, 1, 0.9); mA.setPosition(0, K.hs + 0.012, KZ + THRONE_Z - 0.2); K.shadows.setMatrixAt(n + K.band.length, mA);
      K.shadows.instanceMatrix.needsUpdate = true;
      // Pit glow
      var pit = K.pit;
      if (F && fin > 0.01) {
        pit.visible = true;
        pit.material.opacity = 0.55 * fin * (0.75 + 0.25 * bump(bt));
        if (F === 'wallOfDeath' && ft < 3.1) pit.scale.set(2.2, 1, 6.5);
        else if (F === 'lineDance') pit.scale.set(2 * C.xw, 1, 5);
        else pit.scale.set(F === 'circlePit' ? 5.6 : 4.2, 1, F === 'circlePit' ? 4.6 : 3.6);
        pit.material.color.setHex(F === 'lineDance' ? 0xffc860 : F === 'wallOfDeath' ? 0xff3a2a : K.D.G.wash[1]);
      } else pit.visible = false;
    }

    function updateProps(dt, t) {
      var list = K.cups.list, cm = K.cups.mesh, i, c;
      for (i = 0; i < list.length; i++) {
        c = list[i];
        if (!c.on) { cm.setMatrixAt(i, zero); continue; }
        c.t += dt;
        var u = (c.t - c.delay) / c.dur;
        if (u < 0) { cm.setMatrixAt(i, zero); continue; }
        if (u <= 1) {
          dummy.position.set(c.x0 + (c.x1 - c.x0) * u, c.y0 + (c.y1 - c.y0) * u + 4 * c.h * u * (1 - u), c.z0 + (c.z1 - c.z0) * u);
          dummy.rotation.set(c.spin * u, 0, c.spin * 0.7 * u); dummy.scale.set(1, 1, 1);
        } else {
          if (!c.lie) { c.lie = 1; splashNear(c.x1, c.z1); }
          var lt = c.t - c.delay - c.dur, s = lt > 2.4 ? Math.max(0, 1 - (lt - 2.4) / 0.4) : 1;
          if (s <= 0) { c.on = false; cm.setMatrixAt(i, zero); continue; }
          dummy.position.set(c.x1 + 0.1 * Math.min(1, lt * 3), c.y1 + 0.04, c.z1); dummy.rotation.set(0, c.spin, Math.PI / 2); dummy.scale.set(s, s, s);
        }
        dummy.updateMatrix(); cm.setMatrixAt(i, dummy.matrix);
      }
      cm.instanceMatrix.needsUpdate = true;
      var bl = K.boos.list, bm = K.boos.mesh, C = K.crowd;
      for (i = 0; i < bl.length; i++) {
        var b = bl[i];
        if (!b.on) { bm.setMatrixAt(i, zero); continue; }
        b.t += dt;
        var v = (b.t - b.delay) / 1.6;
        if (v < 0) { bm.setMatrixAt(i, zero); continue; }
        if (v > 1) { b.on = false; bm.setMatrixAt(i, zero); continue; }
        var sc = v < 0.15 ? ease(v / 0.15) * 1.15 : v > 0.8 ? (1 - v) / 0.2 : 1;
        vA.set((C.px[b.who] || 0) + b.dx, 2.05 + v * 0.7, (C.pz[b.who] || C.front) + 0.1); vScale.set(sc, sc, sc);
        mA.compose(vA, qCam, vScale); bm.setMatrixAt(i, mA);
      }
      bm.instanceMatrix.needsUpdate = true;
    }
    function splashNear(x, z) {
      for (var i = 0; i < K.band.length; i++) {
        var r = K.band[i], dx = r.x - x, dz = r.z - z;
        if (dx * dx + dz * dz < 0.5 && !r.act) bandAct(r, 'flinch', DUR.flinch);
      }
    }

    function updateDog(dt, t) {
      var d = K.dog, C = K.crowd, F = S.form.kind, speed = 0.9;
      d.wait -= dt;
      if (F === 'mosh' || F === 'circlePit' || F === 'wallOfDeath') {            // the dog joins the pit, obviously
        var a = t * 2.2; d.tx = C.pitX + Math.cos(a) * 0.9; d.tz = C.pitZ + Math.sin(a) * 0.7; speed = 2.4; d.wait = 0.5;
      } else if (d.wait <= 0) {
        d.tx = (hash01(Math.floor(t), 91) - 0.5) * 2 * (K.V.w - 0.8); d.tz = C.front - 0.3 - hash01(Math.floor(t), 92) * 2.2; d.wait = 2 + hash01(Math.floor(t), 93) * 3;
      }
      var dx = d.tx - d.x, dz = d.tz - d.z, dist = Math.sqrt(dx * dx + dz * dz), moving = dist > 0.08;
      if (moving) { var st = Math.min(dist, speed * dt); d.x += dx / dist * st; d.z += dz / dist * st; d.yaw = approachYaw(d.yaw, Math.atan2(dx, dz), 8 * dt); }
      else d.yaw = approachYaw(d.yaw, 0, 3 * dt);
      var hop = S.idx >= 3 && !moving ? 0.18 * bump(S.beatT) : moving ? 0.04 * Math.abs(Math.sin(t * 14)) : 0;
      d.m.position.set(d.x, hop, d.z); d.m.rotation.y = d.yaw;
      d.tail.rotation.y = Math.sin(t * (S.idx >= 2 ? 16 : 7)) * (S.idx >= 1 ? 0.7 : 0.2);
    }
    function approachYaw(cur, goal, k) {
      var d = goal - cur; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      return cur + d * Math.min(1, k);
    }

    // ---------------------------------------------------------------------------------------------------
    var shell = {
      scene: scene,
      enter: function () { if (!K) build(); inst.active = true; },
      exit: function () {
        inst.active = false; teardown();
        var cam = ctx.camera; cam.near = 0.1; cam.far = 120; cam.clearViewOffset(); cam.updateProjectionMatrix();
        camFov = 0;
      },
      resize: function () { if (K) frame(); },
      update: update,
      sync: function (st) { lastState = st || null; },
      debug: function () { return { stage: inst.info() }; }
    };
    inst = {
      active: false,
      build: function () { build(); },
      level: setLevel, moment: moment, hit: hit, bandAction: bandAction, beat: onBeat, frame: function () { if (K) frame(); },
      info: function () {
        if (!K) return { built: false };
        var C = K.crowd;
        return { built: true, kind: K.D.kind, genre: K.D.genre, people: C.n, band: K.band.map(function (r) { return r.id + ':' + r.slot + ':' + r.inst; }),
          cape: K.band.some(function (r) { return r.cape; }), crowd: Math.round(S.smooth), level: LEVELS[S.idx], formation: S.form.kind, arms: S.arms.kind,
          cupsFlying: K.cups.list.filter(function (c) { return c.on; }).length, boos: K.boos.list.filter(function (b) { return b.on; }).length,
          acting: K.band.filter(function (r) { return r.act; }).map(function (r) { return r.id + ':' + r.act; }), dog: !!K.dog, hits: S.hits, moments: S.moments,
          beatLen: +S.beatLen.toFixed(3), geos: K.geos.length, mats: K.mats.length, texs: K.texs.length,
          view: K.D.view, rival: K.D.rival, painted: K.painted, dress: K.D.dress, silent: K.D.silent, bowing: S.bow > 0 };
      }
    };
    return shell;
  });
})(window.GG);
