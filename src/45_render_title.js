// 45_render_title.js: the 3D title screen (v0.7.1). Night in Saskatoon during a hailstorm: your parents' garage with the
// door rolled up and the fluorescent tube on, Hail Damage inside (Marcel in the cape at the door throwing horns at the
// sky, Dana and Rip noodling, Kenji leaning in the doorway in sunglasses, you on the kit), Dad's hail-dented truck on the
// lawn, the bungalow with the TV flickering, a streetlight, spruces and power lines, and far away on the horizon an arena
// with searchlights sweeping the storm clouds (the glory). Hail falls, bounces and melts; lightning strikes now and then
// and thunder follows. The camera drifts slowly. Taps: the kit (a fill, real drum hits), Marcel (he summons lightning),
// the truck (horn + headlights), the house (Mom flicks the porch light).
// Built on enter(), everything disposed on exit() (the title is rarely re-entered).
// API (GG.render.title): setFrame({ top, bottom }) CSS px covered by the logo (top) and the menu (bottom) ;
//   strike() -> bool (a lightning strike now) ; tap(action) -> bool (same as tapping 'kit'|'marcel'|'truck'|'house') ;
//   info() -> { built, hail, falling, resting, strikes, taps, people, frame }.
// Draw calls ≈ sky 1 + clouds 1 + city 2 + arena 2 + beams 3 + ground/set 1 + unlit bits 1 + kit 1 + hail 1 + people 5
//   + glows ~8 + bolt 1 + windows 2 + headlights 1 ≈ 31. Per frame: numbers only (typed arrays), no allocation.
(function (GG) {
  var R = GG.render;
  if (!R || !R.defineScene) return;
  var THREE = null;
  var B_HIPS = 1, B_SPINE = 2, B_HEAD = 3, B_ARM_L = 4, B_FORE_L = 5, B_ARM_R = 6, B_FORE_R = 7,
    B_LEG_L = 8, B_SHIN_L = 9, B_LEG_R = 10, B_SHIN_R = 11, B_CAPE1 = 12, B_CAPE2 = 13, B_GEAR = 14, B_PHONES = 15, B_HELD = 16, B_FLOOR = 17;
  var HIPS_Y = 0.86;
  // Layout (metres). The garage door opens toward +z (the street and the camera).
  var GAR = { x0: -2.2, x1: 2.2, z0: -5.6, z1: 0, wall: 2.5, ridge: 3.45, doorW: 1.6, doorH: 2.15 };
  var HOUSE = { x0: 2.2, x1: 10.4, z0: -7.4, z1: -0.8, wall: 2.6, ridge: 4.3 };
  var KIT = { x: 0, z: -3.75, scale: 1.1 };
  var TRUCK = { x: -3.8, z: 2.6, yaw: 0.3 };
  var STREET_LIGHT = { x: 4.6, z: 10.2 };
  var ARENA = { x: -52, z: -330 };
  var FOCUS = { x: -1.05, y: 1.45, z: -0.6, hw: 4.0, hh: 1.9 };
  var HAIL_MAX = 720, HAIL_BOX = { x0: -11, x1: 9, z0: -7, z1: 13, top: 16 };
  var BOLT_SEGS = 64;

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function hash01(i, salt) {
    var h = Math.imul((i + 1) ^ Math.imul(salt + 11, 0x9e3779b1), 0x85ebca6b);
    h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function smooth(u) { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); }
  function bump(u) { return u <= 0 || u >= 1 ? 0 : Math.sin(Math.PI * u); }
  function rot(b, x, y, z) { b.rotation.set(x, y, z); }
  var rs = 1;   // run-time random (hail respawns, strike timing): a tiny LCG, no allocation
  function rnd() { rs = (Math.imul(rs, 1664525) + 1013904223) >>> 0; return rs / 4294967296; }

  // ---- Public API --------------------------------------------------------------------------------------------------
  var A = R.title = {};
  var inst = null;
  var pending = { top: 0, bottom: 0 };
  A.setFrame = function (o) {
    o = o || {};
    if (typeof o.top === 'number') pending.top = Math.max(0, o.top);
    if (typeof o.bottom === 'number') pending.bottom = Math.max(0, o.bottom);
    return !!(inst && inst.active);
  };
  A.strike = function () { return !!(inst && inst.active && inst.strike(0)); };
  A.tap = function (action) { return !!(inst && inst.active && inst.tap(action)); };
  A.info = function () { return inst ? inst.info() : { built: false }; };

  R.defineScene('title', function (ctx) {
    THREE = ctx.THREE;
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070d);
    var K = null;
    var pickables = [];
    var T = { t: 0, frame: 0, nextStrike: 3.5, flashT: 9, thunderAt: -1, shake: 0, strikes: 0, taps: { kit: 0, marcel: 0, truck: 0, house: 0 },
      fill: -1, fillStep: 0, summon: -1, honk: -1, porch: -1, camYaw: 0 };
    var tmp = new THREE.Vector3(), camTgt = new THREE.Vector3();

    function own(list, x) { list.push(x); return x; }
    function addMesh(geo, mat, parent) { var m = new THREE.Mesh(geo, mat); (parent || scene).add(m); return m; }
    function basicMat(o) { return own(K.mats, new THREE.MeshBasicMaterial(o)); }
    function glow(color, size, x, y, z, opacity) {
      var m = own(K.mats, new THREE.SpriteMaterial({ map: ctx.radialTexture('glow'), color: color, transparent: true, opacity: opacity == null ? 0.8 : opacity,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      var s = new THREE.Sprite(m); s.position.set(x, y, z); s.scale.set(size, size, 1); scene.add(s);
      return s;
    }
    function pool(color, w, d, x, z, opacity) {   // a soft light pool lying on the ground
      var geo = own(K.geos, new THREE.PlaneGeometry(1, 1)); geo.rotateX(-Math.PI / 2);
      var m = addMesh(geo, basicMat({ map: ctx.radialTexture('soft'), color: color, transparent: true, opacity: opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
      m.position.set(x, 0.03, z); m.scale.set(w, 1, d); m.renderOrder = 2;
      return m;
    }

    // ---- Build -------------------------------------------------------------------------------------------------------
    function build() {
      K = { geos: [], mats: [], texs: [], chars: [], people: [], lights: [] };
      rs = (GG.hashSeed ? GG.hashSeed('title|' + Date.now()) : 99) || 99;
      scene.fog = new THREE.Fog(0x161d2e, 40, 260);
      buildLights();
      buildSky();
      buildHorizon();
      buildSet();
      buildKit(0xb3372f);
      buildTruck();
      buildBolt();
      buildHail(HAIL_MAX);   // allocate the most we'll ever draw; applyPrefs() sets how many are live
      applyPrefs();
      buildPeople();
      buildPicks();
      T.nextStrike = 2.5 + rnd() * 2;
    }

    // Settings can change while the title is up (⚙ Settings opens over it and the scene survives), so reduced flashing,
    // camera shake and graphics quality are re-read every frame from the cached R.prefs() (no storage read, no allocation).
    function applyPrefs() {
      var pf = R.prefs ? R.prefs() : null;
      K.calm = !!(pf && pf.calm); K.shakeOk = !pf || pf.shake !== false;
      if (!K.shakeOk) T.shake = 0;
      if (K.hail) {
        var n = clamp(Math.round(HAIL_MAX * ((pf && pf.crowdScale) || 1)), 60, HAIL_MAX);
        if (n !== K.hail.n) { K.hail.n = n; K.hail.m.count = n; }
      }
    }

    function buildLights() {
      K.hemi = new THREE.HemisphereLight(0x4a5c8c, 0x0c0e14, 0.62); scene.add(K.hemi);
      K.moon = new THREE.DirectionalLight(0x8fa4d8, 0.22); K.moon.position.set(-6, 14, 8); scene.add(K.moon);
      K.flash = new THREE.DirectionalLight(0xdfe6ff, 0); K.flash.position.set(-20, 40, -30); scene.add(K.flash);
      K.garage = new THREE.PointLight(0xffd9a0, 1.6, 12, 1); K.garage.position.set(0, 2.25, -2.6); scene.add(K.garage);
      K.spill = new THREE.PointLight(0xffc27a, 0.9, 10, 1.2); K.spill.position.set(0, 1.7, 0.9); scene.add(K.spill);
      K.street = new THREE.PointLight(0xffb866, 1.1, 13, 1.1); K.street.position.set(STREET_LIGHT.x - 0.9, 4.3, STREET_LIGHT.z); scene.add(K.street);
    }

    // Sky dome: zenith → horizon gradient, warmer toward the city; storm clouds; the lightning bolt.
    function buildSky() {
      var geo = own(K.geos, new THREE.SphereGeometry(640, 32, 14));
      var pos = geo.attributes.position, n = pos.count, col = new Float32Array(n * 3);
      var zen = new THREE.Color(0x04060b), hor = new THREE.Color(0x161d2e), warm = new THREE.Color(0x5a3446), below = new THREE.Color(0x0a0d15), c = new THREE.Color();
      var cdx = ARENA.x, cdz = ARENA.z, cl = Math.sqrt(cdx * cdx + cdz * cdz); cdx /= cl; cdz /= cl;
      for (var i = 0; i < n; i++) {
        var x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), h = y / 640;
        if (h < 0) c.copy(hor).lerp(below, smooth(-h * 6));
        else {
          c.copy(hor).lerp(zen, smooth(h * 2.2));
          var l = Math.sqrt(x * x + z * z) || 1, d = Math.max(0, (x * cdx + z * cdz) / l);
          c.lerp(warm, Math.pow(d, 5) * (1 - smooth(h * 5)) * 0.8);
        }
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      K.skyMat = basicMat({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false });
      K.sky = addMesh(geo, K.skyMat); K.sky.renderOrder = -10;
      // Clouds: flattened lumps, lit only by lightning.
      var b = new ctx.Builder({ jitter: 0.18, seed: 41 }), ico = own(K.geos, new THREE.IcosahedronGeometry(1, 1));
      for (i = 0; i < 26; i++) {
        var cx = -260 + hash01(i, 1) * 420, cz = -90 - hash01(i, 2) * 300, cy = 50 + hash01(i, 3) * 55;
        b.shape(ico, cx, cy, cz, 50 + hash01(i, 4) * 60, 8 + hash01(i, 5) * 9, 30 + hash01(i, 6) * 36, i % 3 ? 0x1b2133 : 0x232a40, 0, hash01(i, 7) * 3, 0);
      }
      for (i = 0; i < 10; i++) {   // low scud right over the neighbourhood
        b.shape(ico, -40 + hash01(i, 11) * 70, 26 + hash01(i, 12) * 8, -20 - hash01(i, 13) * 50, 16 + hash01(i, 14) * 14, 3 + hash01(i, 15) * 3, 10 + hash01(i, 16) * 8, 0x151a28, 0, hash01(i, 17) * 3, 0);
      }
      K.cloudMat = basicMat({ vertexColors: true, fog: false, transparent: true, opacity: 0.92, depthWrite: false });
      var cm = addMesh(own(K.geos, b.build()), K.cloudMat); cm.renderOrder = -9;
    }

    // The horizon: a city skyline, the arena with its searchlights (the glory), a warm glow of light pollution.
    function buildHorizon() {
      var sil = new ctx.Builder({ jitter: 0.08, seed: 17 }), win = new ctx.Builder({ jitter: 0.25, seed: 19 }), i, k;
      for (i = 0; i < 44; i++) {
        var bx = -190 + i * 6.6 + hash01(i, 21) * 4, bz = -370 - hash01(i, 22) * 30, near = Math.abs(bx - ARENA.x) < 36;
        var bh = (near ? 6 : 9) + Math.pow(hash01(i, 23), 2.4) * (Math.abs(bx + 20) < 40 ? 52 : 26), bw = 4 + hash01(i, 24) * 6;
        sil.box(bw, bh, 5, bx, bh / 2, bz, 0x0b0e17);
        for (k = 0; k < 18; k++) {
          if (hash01(i * 31 + k, 25) < 0.55) continue;
          var wy = 1.5 + hash01(i * 31 + k, 26) * (bh - 2.5), wx = bx + (hash01(i * 31 + k, 27) - 0.5) * (bw - 0.8);
          win.rect(1.0, 1.3, wx, wy, bz + 2.55, hash01(i + k, 28) < 0.8 ? 0xffc46b : 0x9fc3ff);
        }
      }
      // The arena: a low dome with a ring of lights and a lit marquee band.
      sil.push(ARENA.x, 0, ARENA.z, 0, 0, 0);
      sil.shape(own(K.geos, new THREE.SphereGeometry(1, 20, 6, 0, Math.PI * 2, 0, Math.PI / 2)), 0, 4.2, 0, 24, 10, 24, 0x121521);
      sil.cyl(24.2, 24.8, 4.4, 20, 0, 2.2, 0, 0x0e111a);
      sil.pop();
      for (i = 0; i < 40; i++) {
        var a = i / 40 * Math.PI * 2;
        win.box(1.3, 1.3, 0.2, ARENA.x + Math.cos(a) * 24.9, 3.8, ARENA.z + Math.sin(a) * 24.9, i % 2 ? 0xffe08a : 0xff8a5c, 0, -a + Math.PI / 2, 0);
        win.box(0.9, 0.9, 0.2, ARENA.x + Math.cos(a) * 22.6, 10.4, ARENA.z + Math.sin(a) * 22.6, 0xfff1c9, 0, -a + Math.PI / 2, 0);
      }
      addMesh(own(K.geos, sil.build()), basicMat({ vertexColors: true, fog: false }));
      addMesh(own(K.geos, win.build()), basicMat({ vertexColors: true, fog: false }));
      glow(0xff9a5a, 230, ARENA.x + 20, 10, ARENA.z - 30, 0.28);   // light pollution
      glow(0xffd28a, 70, ARENA.x, 8, ARENA.z + 10, 0.5);           // the arena itself
      // Searchlights: open cones with a vertical fade, additive, sweeping.
      var c = document.createElement('canvas'); c.width = 4; c.height = 128;
      var g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 128);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.18)'); gr.addColorStop(1, 'rgba(255,255,255,0.75)');
      g.fillStyle = gr; g.fillRect(0, 0, 4, 128);
      var tex = own(K.texs, new THREE.CanvasTexture(c));
      var cone = own(K.geos, new THREE.CylinderGeometry(13, 0.8, 260, 14, 1, true)); cone.translate(0, 130, 0);
      K.beams = [];
      for (i = 0; i < 3; i++) {
        var m = addMesh(cone, basicMat({ map: tex, color: i === 1 ? 0xcfe0ff : 0xfff0d0, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending,
          depthWrite: false, side: THREE.DoubleSide, fog: false }));
        m.position.set(ARENA.x - 13 + i * 13, 8, ARENA.z + 6); m.renderOrder = -5;
        K.beams.push({ m: m, ph: i * 2.1, sp: 0.23 + i * 0.07 });
      }
    }

    // Ground, garage (inside and out), the house, driveway, street, streetlight, trees, power lines, hail on the lawn.
    function buildSet() {
      var b = new ctx.Builder({ jitter: 0.05, seed: 3 }), u = new ctx.Builder({ jitter: 0.1, seed: 5 }), i, x, z;
      var lawn = 0x1d2a1c, concrete = 0x55575c, asphalt = 0x1f2126, siding = 0xcdc4b0, trim = 0x4a3526, shingle = 0x2a2c31;
      // Ground: lawn out to the prairie, the driveway, sidewalk, curb, street.
      b.quad([-600, 0, 60], [600, 0, 60], [600, 0, -600], [-600, 0, -600], lawn);
      b.box(4.4, 0.04, 9.4, 0, 0.02, 4.7, concrete);
      b.box(80, 0.05, 1.6, 0, 0.025, 10.2, 0x5d5f63);
      b.box(80, 0.14, 0.25, 0, 0.07, 11.1, 0x6a6c70);
      b.box(80, 0.02, 9, 0, 0.01, 15.7, asphalt);
      for (x = -38; x < 40; x += 1.9) b.box(0.03, 0.045, 1.58, x, 0.03, 10.2, 0x44464a);    // sidewalk seams
      b.box(3.6, 0.03, 4.2, TRUCK.x, 0.015, TRUCK.z, 0x3c3b36, 0, TRUCK.yaw, 0);                      // gravel pad under the truck
      // Garage shell: floor, walls with the door opening, gable, roof, a hoop over the door.
      var g = GAR, w = 0.14, hw = (g.x1 - g.x0) / 2, depth = g.z1 - g.z0, zc = (g.z0 + g.z1) / 2;
      b.box(g.x1 - g.x0, 0.03, depth, 0, 0.015, zc, 0x7a7670);                             // slab
      b.box(w, g.wall, depth, g.x0 + w / 2, g.wall / 2, zc, siding);                        // left wall
      b.box(w, g.wall, depth, g.x1 - w / 2, g.wall / 2, zc, siding);                        // right wall (shared with the house)
      b.box(g.x1 - g.x0, g.wall, w, 0, g.wall / 2, g.z0 + w / 2, siding);                   // back wall
      b.box(hw - g.doorW, g.wall, w, g.x0 + (hw - g.doorW) / 2, g.wall / 2, g.z1 - w / 2, siding);   // front pillars
      b.box(hw - g.doorW, g.wall, w, g.x1 - (hw - g.doorW) / 2, g.wall / 2, g.z1 - w / 2, siding);
      b.box(2 * g.doorW, g.wall - g.doorH, w, 0, (g.wall + g.doorH) / 2, g.z1 - w / 2, siding);        // header
      b.tri([g.x0, g.wall, g.z1], [g.x1, g.wall, g.z1], [0, g.ridge, g.z1], siding);          // front gable
      b.tri([g.x1, g.wall, g.z0], [g.x0, g.wall, g.z0], [0, g.ridge, g.z0], siding);
      var ov = 0.35, rl = [g.x0 - ov, g.wall - 0.2], rr = [g.x1 + ov, g.wall - 0.2];
      b.quad([rl[0], rl[1], g.z1 + ov], [0, g.ridge + 0.05, g.z1 + ov], [0, g.ridge + 0.05, g.z0 - ov], [rl[0], rl[1], g.z0 - ov], shingle);
      b.quad([0, g.ridge + 0.05, g.z1 + ov], [rr[0], rr[1], g.z1 + ov], [rr[0], rr[1], g.z0 - ov], [0, g.ridge + 0.05, g.z0 - ov], shingle);
      b.quad([rl[0], rl[1] - 0.12, g.z1 + ov], [0, g.ridge - 0.07, g.z1 + ov], [0, g.ridge + 0.05, g.z1 + ov], [rl[0], rl[1], g.z1 + ov], trim);    // fascia
      b.quad([0, g.ridge - 0.07, g.z1 + ov], [rr[0], rr[1] - 0.12, g.z1 + ov], [rr[0], rr[1], g.z1 + ov], [0, g.ridge + 0.05, g.z1 + ov], trim);
      b.box(0.1, g.doorH, 0.18, -g.doorW, g.doorH / 2, g.z1 + 0.02, trim); b.box(0.1, g.doorH, 0.18, g.doorW, g.doorH / 2, g.z1 + 0.02, trim);
      b.box(2 * g.doorW + 0.1, 0.1, 0.18, 0, g.doorH + 0.05, g.z1 + 0.02, trim);
      b.box(2 * g.doorW - 0.1, 0.34, 0.06, 0, g.doorH - 0.12, g.z1 - 0.3, 0xe2ddd2);        // the rolled-up door's bottom panel
      b.box(2 * g.doorW - 0.1, 0.04, 2.6, 0, g.doorH + 0.02, g.z1 - 1.6, 0x9a9690);        // …and the rest of it, overhead
      b.box(1.1, 0.72, 0.05, 0, 2.86, g.z1 + 0.1, 0xeeeeea);                                // basketball hoop
      b.box(0.44, 0.32, 0.055, 0, 2.8, g.z1 + 0.11, 0xc84a2a); b.box(0.38, 0.26, 0.06, 0, 2.8, g.z1 + 0.115, 0xeeeeea);
      b.cyl(0.23, 0.23, 0.03, 12, 0, 2.58, g.z1 + 0.4, 0xe0602a);
      for (i = 0; i < 8; i++) { var a = i / 8 * Math.PI * 2; b.box(0.015, 0.32, 0.015, Math.cos(a) * 0.19, 2.42, g.z1 + 0.4 + Math.sin(a) * 0.19, 0xe8e8e8, 0, 0, Math.cos(a) * 0.2); }
      // Inside: pegboard, shelves, a beer fridge, two amp stacks, a rug, an old couch, a mirror for Marcel.
      b.box(1.4, 1.0, 0.03, g.x0 + 0.16, 1.45, -3.1, 0x9b7b52, 0, Math.PI / 2, 0);
      for (i = 0; i < 6; i++) b.box(0.05, 0.18 + hash01(i, 31) * 0.3, 0.05 + hash01(i, 32) * 0.1, g.x0 + 0.2, 1.3 + hash01(i, 33) * 0.4, -3.6 + i * 0.2, 0x3c3c40 + (i % 3) * 0x151008);
      for (i = 0; i < 3; i++) {
        b.box(0.35, 0.03, 1.5, g.x1 - 0.25, 0.9 + i * 0.5, -3.6, 0x7a6a50);
        for (var k = 0; k < 4; k++) b.cyl(0.08, 0.08, 0.16, 8, g.x1 - 0.25, 1.0 + i * 0.5, -4.1 + k * 0.33, [0x8a3a2a, 0x3a5a8a, 0xcfc8b0, 0x5a7a3a][(i + k) % 4]);
      }
      b.box(0.62, 1.45, 0.62, g.x0 + 0.45, 0.725, -1.25, 0xe8e2cf); b.box(0.04, 0.4, 0.04, g.x0 + 0.78, 1.0, -1.05, 0x9a9a9a);   // beer fridge
      b.box(0.6, 0.25, 0.02, g.x0 + 0.45, 1.2, -0.94, 0x2a6a3a);                                                                 // a Riders magnet
      for (x = -1; x <= 1; x += 2) {
        var ax = x * 1.4, az = g.z0 + 0.55;
        b.box(0.78, 0.78, 0.4, ax, 0.39, az, 0x151515); b.box(0.78, 0.78, 0.4, ax, 1.19, az, 0x151515);
        b.box(0.7, 0.7, 0.02, ax, 0.39, az + 0.205, 0x2c2c2c); b.box(0.7, 0.7, 0.02, ax, 1.19, az + 0.205, 0x2c2c2c);
        b.box(0.8, 0.26, 0.42, ax, 1.72, az, 0x1c1c1c); b.box(0.7, 0.05, 0.02, ax, 1.78, az + 0.215, 0xd4a940);
      }
      b.box(2.2, 0.02, 1.9, KIT.x, 0.04, KIT.z - 0.2, 0x5a1f22);
      b.box(0.72, 0.4, 1.5, g.x1 - 0.5, 0.2, -1.95, 0x5a4a38); b.box(0.18, 0.62, 1.5, g.x1 - 0.2, 0.55, -1.95, 0x4e4030);   // the couch from the basement
      b.box(0.72, 0.26, 0.16, g.x1 - 0.5, 0.53, -1.2, 0x4e4030); b.box(0.72, 0.26, 0.16, g.x1 - 0.5, 0.53, -2.7, 0x4e4030);
      // The house: a bungalow with a picture window (TV on), a red door with a porch light, a chimney.
      var h = HOUSE, hd = h.z1 - h.z0, hzc = (h.z0 + h.z1) / 2, hwd = h.x1 - h.x0, hxc = (h.x0 + h.x1) / 2, hs = 0x7f8b99;
      b.box(hwd, h.wall, hd, hxc, h.wall / 2, hzc, hs);
      b.box(hwd + 0.2, 0.35, hd + 0.2, hxc, 0.17, hzc, 0x4b4d52);                          // foundation
      b.tri([h.x1, h.wall, h.z1], [h.x1, h.wall, h.z0], [h.x1, h.ridge, hzc], hs);
      b.quad([h.x0 - 0.1, h.wall - 0.15, h.z1 + 0.45], [h.x1 + 0.45, h.wall - 0.15, h.z1 + 0.45], [h.x1 + 0.45, h.ridge, hzc], [h.x0 - 0.1, h.ridge, hzc], shingle);
      b.quad([h.x1 + 0.45, h.wall - 0.15, h.z0 - 0.45], [h.x0 - 0.1, h.wall - 0.15, h.z0 - 0.45], [h.x0 - 0.1, h.ridge, hzc], [h.x1 + 0.45, h.ridge, hzc], shingle);
      b.box(0.6, 1.4, 0.6, h.x0 + 5.6, h.ridge - 0.1, hzc - 1.2, 0x5a3a30);
      b.box(2.5, 1.35, 0.08, 5.2, 1.5, h.z1 + 0.03, trim);                                 // window frame (glass is its own mesh)
      b.box(0.07, 1.2, 0.05, 5.2, 1.5, h.z1 + 0.12, trim); b.box(2.35, 0.06, 0.05, 5.2, 1.72, h.z1 + 0.12, trim);   // mullions
      b.box(0.42, 1.15, 0.03, 4.25, 1.5, h.z1 + 0.1, 0x7a3a2a); b.box(0.42, 1.15, 0.03, 6.15, 1.5, h.z1 + 0.1, 0x7a3a2a);   // curtains
      b.box(0.95, 2.05, 0.08, 8.4, 1.03, h.z1 + 0.03, 0x7a2020);                           // door
      b.box(1.6, 0.18, 0.9, 8.4, 0.09, h.z1 + 0.45, 0x6a6a6a); b.box(1.6, 0.18, 0.5, 8.4, 0.27, h.z1 + 0.25, 0x6a6a6a);   // steps
      b.box(0.1, 1.2, 0.1, h.x0 + 0.9, 0.6, h.z1 + 0.55, 0x3a3a3e);                        // mailbox post (the parents' flag is up)
      b.box(0.28, 0.22, 0.42, h.x0 + 0.9, 1.25, h.z1 + 0.55, 0x2d4a6a); b.box(0.03, 0.2, 0.1, h.x0 + 1.06, 1.36, h.z1 + 0.62, 0xc0392b);
      // Streetlight, trees, power lines, a fence.
      var sl = STREET_LIGHT;
      b.cyl(0.08, 0.1, 4.6, 8, sl.x, 2.3, sl.z, 0x55585e); b.box(1.2, 0.08, 0.1, sl.x - 0.55, 4.55, sl.z, 0x55585e);
      b.box(0.5, 0.14, 0.26, sl.x - 1.1, 4.5, sl.z, 0x3a3c40);
      u.box(0.42, 0.04, 0.2, sl.x - 1.1, 4.42, sl.z, 0xffe2a8);
      var trees = [[-8.5, -9, 8.5], [-11.5, -6.5, 7], [-7.2, -13, 10], [12.5, -10, 9], [15, -6.8, 7.5], [-15, 2, 8], [-14, -12, 9.5], [9.5, -12.5, 8]];
      for (i = 0; i < trees.length; i++) {
        var t = trees[i], th = t[2];
        b.cyl(0.18, 0.22, 1.2, 6, t[0], 0.6, t[1], 0x3a2a1c);
        for (k = 0; k < 4; k++) b.cyl(0.02, (1.9 - k * 0.38) * th / 8, th * 0.34, 8, t[0], 1 + k * th * 0.2 + th * 0.17, t[1], k % 2 ? 0x16261c : 0x1a2c20);
      }
      for (x = -44; x <= 44; x += 14) {
        b.cyl(0.12, 0.15, 7.4, 6, x, 3.7, -13, 0x3a3024); b.box(1.8, 0.12, 0.12, x, 7.0, -13, 0x3a3024);
        if (x < 44) for (k = -1; k <= 1; k++) {
          var x0 = x + k * 0.8, x1 = x + 14 + k * 0.8, segs = 8;
          for (var sgi = 0; sgi < segs; sgi++) {
            var ua = sgi / segs, ub = (sgi + 1) / segs, ya = 7.1 - Math.sin(Math.PI * ua) * 0.6, yb = 7.1 - Math.sin(Math.PI * ub) * 0.6;
            var xa = x0 + (x1 - x0) * ua, xb = x0 + (x1 - x0) * ub, len = Math.sqrt((xb - xa) * (xb - xa) + (yb - ya) * (yb - ya));
            b.box(len, 0.025, 0.025, (xa + xb) / 2, (ya + yb) / 2, -13, 0x101014, 0, 0, Math.atan2(yb - ya, xb - xa));
          }
        }
      }
      for (z = -8; z <= 3; z += 1.1) b.box(0.08, 1.5, 1.05, -6.8, 0.75, z, 0x5a4632);   // fence along the lot line
      // Hail already on the ground: lawn, driveway, roofs, the truck's hood.
      for (i = 0; i < 520; i++) {
        x = -12 + hash01(i, 41) * 24; z = -7 + hash01(i, 42) * 18;
        if (x > GAR.x0 - 0.1 && x < GAR.x1 + 0.1 && z > GAR.z0 - 0.1 && z < GAR.z1 + 0.25) continue;
        if (x > HOUSE.x0 && x < HOUSE.x1 && z > HOUSE.z0 && z < HOUSE.z1) continue;
        var s = 0.035 + hash01(i, 43) * 0.04;
        b.box(s, s * 0.7, s, x, s * 0.35 + (z > 11 ? 0 : 0.02), z, 0xd6dde6, 0, hash01(i, 44) * 3, 0);
      }
      // Mini lights along the garage gable (Dad never took them down).
      var bulbs = [0xff4a3a, 0x3aff6a, 0x4a8aff, 0xffc23a];
      for (i = 0; i <= 18; i++) {
        var f = i / 18, bx2 = (g.x0 - ov) + f * ((g.x1 + ov) - (g.x0 - ov)), by = f <= 0.5 ? rl[1] - 0.15 + (g.ridge - rl[1]) * f * 2 : rl[1] - 0.15 + (g.ridge - rl[1]) * (1 - f) * 2;
        u.box(0.07, 0.1, 0.07, bx2, by - 0.03, g.z1 + ov + 0.02, bulbs[i % 4]);
      }
      u.box(1.25, 0.05, 0.09, 0, 2.43, -2.9, 0xf6fbff);                                     // the fluorescent tube
      u.box(0.12, 0.2, 0.02, 8.95, 2.15, h.z1 + 0.06, 0xffe6a8);                            // porch light
      K.set = addMesh(own(K.geos, b.build()), ctx.mats.vc);
      K.unlit = addMesh(own(K.geos, u.build()), ctx.mats.unlit);
      // Banner on the back wall: a bedsheet, spray-painted.
      var c = document.createElement('canvas'); c.width = 512; c.height = 160;
      var g2 = c.getContext('2d');
      g2.fillStyle = '#e9e4d6'; g2.fillRect(0, 0, 512, 160);
      g2.fillStyle = 'rgba(0,0,0,0.08)'; for (i = 0; i < 9; i++) g2.fillRect(i * 58 + 10, 0, 3, 160);
      g2.font = '900 78px Impact, "Arial Black", sans-serif'; g2.textAlign = 'center'; g2.textBaseline = 'middle';
      g2.fillStyle = '#b01e1e'; g2.fillText('HAIL DAMAGE', 258, 86);
      g2.fillStyle = '#111'; g2.fillText('HAIL DAMAGE', 254, 82);
      g2.fillStyle = '#111'; for (i = 0; i < 12; i++) g2.fillRect(40 + i * 38 + hash01(i, 51) * 14, 110, 3, 12 + hash01(i, 52) * 30);   // drips
      var tex = own(K.texs, new THREE.CanvasTexture(c));
      var ban = addMesh(own(K.geos, new THREE.PlaneGeometry(2.3, 0.72)), basicMat({ map: tex, color: 0xd8c9a8 }));
      ban.position.set(0, 1.5, GAR.z0 + 0.16); ban.rotation.z = -0.02;
      // The TV window (flickers) and warm glows.
      K.tvMat = basicMat({ color: 0xffc98a });
      var tv = addMesh(own(K.geos, new THREE.PlaneGeometry(2.3, 1.15)), K.tvMat); tv.position.set(5.2, 1.5, HOUSE.z1 + 0.08);
      K.porch = glow(0xffd28a, 1.6, 8.95, 2.15, HOUSE.z1 + 0.25, 0.9);
      glow(0xffe9c0, 3.2, 0, 2.4, -2.8, 0.55);                                             // fluorescent haze
      glow(0xffcf88, 2.2, STREET_LIGHT.x - 1.1, 4.35, STREET_LIGHT.z, 0.95);
      pool(0xffc27a, 7, 6, 0, 2.2, 0.5);                                                  // the garage spills onto the driveway
      pool(0xffb866, 8, 7, STREET_LIGHT.x - 1.1, STREET_LIGHT.z, 0.42);
      pool(0xffc98a, 3.5, 2.5, 5.2, HOUSE.z1 + 1.1, 0.25);
    }

    // Your kit (same parts as the garage scene's kit, merged into one mesh).
    function buildKit(color) {
      var b = new ctx.Builder({ jitter: 0.03, seed: 5 }), shell = color, head = 0xefe9dc, chrome = 0xb9bec6, dark = 0x26262a, bronze = 0xd2a43c, rim = ctx.shade(color, 0.55);
      var i, a;
      b.push(0, 0.3, 0.12, Math.PI / 2, 0, 0);
      b.cyl(0.28, 0.28, 0.4, 16, 0, 0, 0, shell);
      b.cyl(0.29, 0.29, 0.035, 16, 0, 0.2, 0, chrome); b.cyl(0.29, 0.29, 0.035, 16, 0, -0.2, 0, chrome);
      b.cyl(0.265, 0.265, 0.012, 16, 0, 0.214, 0, head);
      b.cyl(0.14, 0.14, 0.014, 14, 0, 0.221, 0, rim); b.cyl(0.1, 0.1, 0.016, 12, 0, 0.223, 0, head);
      b.pop();
      b.box(0.02, 0.22, 0.02, 0.25, 0.08, 0.28, chrome, 0, 0, 0.45); b.box(0.02, 0.22, 0.02, -0.25, 0.08, 0.28, chrome, 0, 0, -0.45);
      b.box(0.03, 0.22, 0.03, 0, 0.63, 0.06, chrome);
      for (var s = -1; s <= 1; s += 2) {
        b.push(s * 0.15, 0.73, 0.03, -0.45, 0, -s * 0.15);
        b.cyl(0.12, 0.12, 0.15, 12, 0, 0, 0, shell); b.cyl(0.125, 0.125, 0.02, 12, 0, 0.075, 0, chrome); b.cyl(0.117, 0.117, 0.01, 12, 0, 0.083, 0, head);
        b.pop();
      }
      b.cyl(0.18, 0.18, 0.3, 14, 0.46, 0.45, -0.22, shell);
      b.cyl(0.185, 0.185, 0.02, 14, 0.46, 0.6, -0.22, chrome); b.cyl(0.175, 0.175, 0.01, 14, 0.46, 0.607, -0.22, head);
      for (i = 0; i < 3; i++) { a = i * 2.1 + 0.4; b.box(0.02, 0.32, 0.02, 0.46 + 0.2 * Math.cos(a), 0.16, -0.22 + 0.2 * Math.sin(a), chrome); }
      b.push(-0.36, 0.56, -0.25, -0.12, 0, 0.1);
      b.cyl(0.16, 0.16, 0.12, 14, 0, 0, 0, shell); b.cyl(0.165, 0.165, 0.02, 14, 0, 0.06, 0, chrome); b.cyl(0.155, 0.155, 0.01, 14, 0, 0.066, 0, 0xf6f2ea);
      b.pop();
      b.box(0.025, 0.5, 0.025, -0.36, 0.25, -0.25, chrome);
      b.box(0.022, 0.9, 0.022, -0.63, 0.45, -0.08, chrome);
      b.cyl(0.17, 0.17, 0.014, 16, -0.63, 0.87, -0.08, bronze); b.cyl(0.17, 0.17, 0.014, 16, -0.63, 0.845, -0.08, ctx.shade(bronze, 0.85));
      b.box(0.1, 0.025, 0.24, -0.63, 0.015, -0.2, dark);
      b.box(0.022, 1.12, 0.022, -0.5, 0.56, 0.3, chrome, 0, 0, 0.06);
      b.cyl(0.22, 0.22, 0.014, 16, -0.54, 1.13, 0.3, bronze, 0.28, 0, 0.22); b.cyl(0.05, 0.05, 0.03, 8, -0.54, 1.14, 0.3, bronze, 0.28, 0, 0.22);
      b.box(0.022, 1.02, 0.022, 0.64, 0.51, 0.18, chrome);
      b.cyl(0.25, 0.25, 0.014, 16, 0.64, 1.03, 0.18, bronze, 0.2, 0, -0.25); b.cyl(0.05, 0.05, 0.03, 8, 0.64, 1.04, 0.18, bronze, 0.2, 0, -0.25);
      b.box(0.09, 0.03, 0.22, 0, 0.02, -0.17, dark);
      b.cyl(0.17, 0.16, 0.09, 12, 0, 0.5, -0.72, 0x1c1c1c); b.box(0.04, 0.45, 0.04, 0, 0.23, -0.72, chrome);
      K.kit = addMesh(own(K.geos, b.build()), ctx.mats.vc);
      K.kit.position.set(KIT.x, 0, KIT.z); K.kit.scale.setScalar(KIT.scale);
    }

    // Dad's truck: totalled by hail (dents everywhere, a cracked windshield), parked on the lawn out of shame.
    function buildTruck() {
      var b = new ctx.Builder({ jitter: 0.04, seed: 29 }), body = 0x6e2a24, stripe = 0xc9b48a, dark = 0x141416, chrome = 0xaab0b8, dent = 0x3f1612, glass = 0x1d2635, i;
      b.at(TRUCK.x, 0, TRUCK.z, TRUCK.yaw);
      b.box(1.92, 0.62, 5.3, 0, 0.78, 0, body);                                            // body
      b.box(1.94, 0.1, 5.32, 0, 0.9, 0, stripe);
      b.box(1.86, 0.22, 1.5, 0, 1.2, 1.85, body, -0.06);                                   // hood
      b.box(1.8, 0.72, 1.2, 0, 1.45, 0.3, body);                                            // cab
      b.box(1.76, 0.07, 1.2, 0, 1.83, 0.3, body); b.box(1.8, 0.25, 0.32, 0, 1.2, 1.02, body);
      b.quad([-0.84, 1.12, 1.25], [0.84, 1.12, 1.25], [0.8, 1.8, 0.9], [-0.8, 1.8, 0.9], glass);   // windshield
      b.box(1.82, 0.5, 0.05, 0, 1.47, -0.31, glass); b.box(0.05, 0.42, 0.9, 0.91, 1.48, 0.3, glass); b.box(0.05, 0.42, 0.9, -0.91, 1.48, 0.3, glass);
      b.box(0.08, 0.36, 2.2, 0.92, 1.2, -1.45, body); b.box(0.08, 0.36, 2.2, -0.92, 1.2, -1.45, body);   // bed walls
      b.box(1.92, 0.36, 0.08, 0, 1.2, -2.6, body); b.box(1.8, 0.04, 2.2, 0, 1.06, -1.45, 0x1b1b1b);
      b.box(2.0, 0.22, 0.2, 0, 0.55, 2.7, chrome); b.box(2.0, 0.22, 0.18, 0, 0.55, -2.7, chrome);       // bumpers
      b.box(1.3, 0.3, 0.04, 0, 0.98, 2.66, dark);                                           // grille
      for (i = 0; i < 4; i++) {
        var wx = i % 2 ? 0.9 : -0.9, wz = i < 2 ? 1.75 : -1.7;
        b.cyl(0.42, 0.42, 0.3, 14, wx, 0.42, wz, 0x121212, 0, 0, Math.PI / 2);
        b.cyl(0.2, 0.2, 0.32, 10, wx, 0.42, wz, 0x8a8e94, 0, 0, Math.PI / 2);
      }
      b.box(0.14, 0.2, 0.08, 1.02, 1.55, 1.0, dark, 0, 0, -0.5);                          // one mirror hanging by a thread
      b.box(0.14, 0.2, 0.08, -1.0, 1.62, 1.02, dark);
      for (i = 0; i < 38; i++) {                                                            // dents: hood, roof, bed walls
        var zone = i % 3, d = 0.07 + hash01(i, 61) * 0.08;
        if (zone === 0) b.box(d, 0.012, d, (hash01(i, 62) - 0.5) * 1.6, 1.32 + (hash01(i, 63) - 0.5) * 0.02, 1.25 + hash01(i, 64) * 1.2, dent, -0.06);
        else if (zone === 1) b.box(d, 0.012, d, (hash01(i, 62) - 0.5) * 1.55, 1.87, -0.2 + hash01(i, 64) * 1.0, dent);
        else b.box(0.012, d, d, (hash01(i, 62) < 0.5 ? -1 : 1) * 0.965, 1.1 + hash01(i, 63) * 0.24, -2.4 + hash01(i, 64) * 2, dent);
      }
      for (i = 0; i < 7; i++) {                                                             // windshield crack, star-shaped
        var ca = i / 7 * Math.PI * 2 + 0.3, cl = 0.18 + hash01(i, 66) * 0.3;
        b.push(-0.3, 1.46, 1.08, 1.1, 0, 0);
        b.box(cl, 0.012, 0.012, Math.cos(ca) * cl / 2, 0.012, Math.sin(ca) * cl / 2 * 0.8, 0xc9d6e6, 0, -ca, 0);
        b.pop();
      }
      K.truck = addMesh(own(K.geos, b.build()), ctx.mats.vc);
      // Headlights: their own mesh so a tap can flash them.
      var hb = new ctx.Builder({ jitter: 0 });
      hb.at(TRUCK.x, 0, TRUCK.z, TRUCK.yaw);
      hb.box(0.3, 0.2, 0.04, 0.7, 1.0, 2.67, 0xffffff); hb.box(0.3, 0.2, 0.04, -0.7, 1.0, 2.67, 0xffffff);
      K.headMat = basicMat({ color: 0x6a6450 });
      addMesh(own(K.geos, hb.build()), K.headMat);
      var c = Math.cos(TRUCK.yaw), s2 = Math.sin(TRUCK.yaw);
      K.headGlow = [];
      for (i = -1; i <= 1; i += 2) {
        var lx = i * 0.7, lz = 2.9;
        K.headGlow.push(glow(0xfff4d6, 2.4, TRUCK.x + lx * c + lz * s2, 1.0, TRUCK.z - lx * s2 + lz * c, 0));
      }
      K.headPool = pool(0xfff0cc, 3.2, 5, TRUCK.x + 5 * s2, TRUCK.z + 5 * c, 0);
    }

    // Lightning bolt: a jagged ribbon, rewritten on each strike (preallocated, facing +z).
    function buildBolt() {
      var geo = own(K.geos, new THREE.BufferGeometry());
      K.boltPos = new Float32Array(BOLT_SEGS * 6 * 3);
      geo.setAttribute('position', new THREE.BufferAttribute(K.boltPos, 3));
      geo.attributes.position.setUsage(THREE.DynamicDrawUsage);
      K.boltMat = basicMat({ color: 0xe8ecff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide });
      K.bolt = addMesh(geo, K.boltMat); K.bolt.frustumCulled = false; K.bolt.renderOrder = -4; K.bolt.visible = false;
      K.boltGlow = glow(0xb8c4ff, 140, 0, 60, -260, 0); K.boltGlow.renderOrder = -4;
    }
    function writeBolt(x0, z0) {
      var p = K.boltPos, n = 0, i, x = x0, y = 140, seg = 0, w = 1.6;
      function ribbon(ax, ay, bx, by, wd) {
        if (seg >= BOLT_SEGS) return;
        var o = seg * 18, dx = bx - ax, dy = by - ay, l = Math.sqrt(dx * dx + dy * dy) || 1, nx = -dy / l * wd, ny = dx / l * wd;
        p[o] = ax - nx; p[o + 1] = ay - ny; p[o + 2] = z0; p[o + 3] = bx - nx; p[o + 4] = by - ny; p[o + 5] = z0; p[o + 6] = bx + nx; p[o + 7] = by + ny; p[o + 8] = z0;
        p[o + 9] = ax - nx; p[o + 10] = ay - ny; p[o + 11] = z0; p[o + 12] = bx + nx; p[o + 13] = by + ny; p[o + 14] = z0; p[o + 15] = ax + nx; p[o + 16] = ay + ny; p[o + 17] = z0;
        seg++;
      }
      var main = 34, forkAt = 8 + Math.floor(rnd() * 10), fx = 0, fy = 0;
      for (i = 0; i < main; i++) {
        var ny2 = y - (140 / main) * (0.7 + rnd() * 0.6), nx2 = x + (rnd() - 0.5) * 10;
        if (i === main - 1) ny2 = -1;
        ribbon(x, y, nx2, ny2, w * (1 - i / main * 0.4));
        if (i === forkAt) { fx = nx2; fy = ny2; }
        x = nx2; y = ny2; n++;
      }
      for (var f = 0; f < 2; f++) {   // two forks that fizzle out
        x = f ? x0 + (rnd() - 0.5) * 14 : fx; y = f ? 105 + rnd() * 15 : fy;
        var dir = rnd() < 0.5 ? -1 : 1;
        for (i = 0; i < 12; i++) {
          var nx3 = x + dir * (1.5 + rnd() * 4), ny3 = y - (3 + rnd() * 4);
          ribbon(x, y, nx3, ny3, w * 0.55 * (1 - i / 12));
          x = nx3; y = ny3;
        }
      }
      for (i = seg * 18; i < p.length; i++) p[i] = 0;
      K.bolt.geometry.attributes.position.needsUpdate = true;
      K.bolt.geometry.computeBoundingSphere();
      K.boltGlow.position.set(x0, 60, z0 + 2);
    }

    // Hail: one instanced mesh; each stone falls, bounces once, rests, melts, respawns at the top.
    function buildHail(n) {
      n = clamp(n, 60, HAIL_MAX);
      var geo = own(K.geos, new THREE.IcosahedronGeometry(1, 0));
      var mat = own(K.mats, new THREE.MeshLambertMaterial({ color: 0xe6eef7, emissive: 0x36445a, flatShading: true }));
      var m = new THREE.InstancedMesh(geo, mat, n);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false;
      scene.add(m);
      var H = K.hail = { m: m, n: n, x: new Float32Array(n), y: new Float32Array(n), z: new Float32Array(n), vx: new Float32Array(n), vy: new Float32Array(n),
        vz: new Float32Array(n), s: new Float32Array(n), st: new Uint8Array(n), rest: new Float32Array(n), falling: 0, resting: 0 };
      for (var i = 0; i < n; i++) { spawn(i); H.y[i] = rnd() * HAIL_BOX.top; }
      for (i = 0; i < 60; i++) updateHail(0.1);   // warm up: a storm already in progress, not one starting
    }
    function spawn(i) {
      var H = K.hail;
      H.x[i] = HAIL_BOX.x0 + rnd() * (HAIL_BOX.x1 - HAIL_BOX.x0); H.z[i] = HAIL_BOX.z0 + rnd() * (HAIL_BOX.z1 - HAIL_BOX.z0);
      H.y[i] = HAIL_BOX.top + rnd() * 4;
      H.vx[i] = 1.4 + rnd() * 0.8; H.vy[i] = -(10 + rnd() * 4); H.vz[i] = 0.5 + rnd() * 0.4;
      H.s[i] = 0.03 + rnd() * rnd() * 0.05; H.st[i] = 0; H.rest[i] = 0;
    }
    // What a falling stone lands on: roofs, the truck, else the ground.
    function surface(x, z) {
      if (x > GAR.x0 - 0.35 && x < GAR.x1 + 0.35 && z > GAR.z0 - 0.35 && z < GAR.z1 + 0.35) return GAR.ridge - Math.abs(x) / (GAR.x1 + 0.35) * (GAR.ridge - GAR.wall + 0.2);
      if (x > HOUSE.x0 && x < HOUSE.x1 + 0.45 && z > HOUSE.z0 - 0.45 && z < HOUSE.z1 + 0.45) {
        var hz = (HOUSE.z0 + HOUSE.z1) / 2;
        return HOUSE.ridge - Math.abs(z - hz) / ((HOUSE.z1 - HOUSE.z0) / 2 + 0.45) * (HOUSE.ridge - HOUSE.wall + 0.15);
      }
      var dx = x - TRUCK.x, dz = z - TRUCK.z, c = Math.cos(TRUCK.yaw), s = Math.sin(TRUCK.yaw), lx = dx * c - dz * s, lz = dx * s + dz * c;
      if (lx > -0.96 && lx < 0.96 && lz > -2.65 && lz < 2.65) return lz > -0.3 && lz < 1.1 ? 1.87 : lz >= 1.1 ? 1.3 : 1.08;
      return 0;
    }
    function updateHail(dt) {
      var H = K.hail, a = H.m.instanceMatrix.array, falling = 0, resting = 0;
      for (var i = 0; i < H.n; i++) {
        var st = H.st[i], s = H.s[i], sy = s;
        if (st === 0) {
          H.x[i] += H.vx[i] * dt; H.y[i] += H.vy[i] * dt; H.z[i] += H.vz[i] * dt;
          var gy = surface(H.x[i], H.z[i]) + s;
          if (H.y[i] <= gy) {
            H.y[i] = gy; H.st[i] = 1;
            H.vy[i] = -H.vy[i] * (0.18 + rnd() * 0.22); H.vx[i] = (rnd() - 0.3) * 1.8; H.vz[i] = (rnd() - 0.5) * 1.8;
          } else { falling++; sy = s * (1 + 0.9 * -H.vy[i] * 0.06); }
        } else if (st === 1) {
          H.vy[i] -= 9.8 * dt;
          H.x[i] += H.vx[i] * dt; H.y[i] += H.vy[i] * dt; H.z[i] += H.vz[i] * dt;
          var gy2 = surface(H.x[i], H.z[i]) + s * 0.7;
          if (H.y[i] <= gy2 && H.vy[i] < 0) { H.y[i] = gy2; H.st[i] = 2; H.rest[i] = 0.8 + rnd() * 2.6; }
        } else {
          H.rest[i] -= dt; resting++;
          if (H.rest[i] < 0.4) s = sy = s * Math.max(0, H.rest[i] / 0.4);
          if (H.rest[i] <= 0) { spawn(i); s = sy = H.s[i]; }
        }
        var o = i * 16;
        a[o] = s; a[o + 5] = sy; a[o + 10] = s; a[o + 12] = H.x[i]; a[o + 13] = H.y[i]; a[o + 14] = H.z[i];
      }
      H.falling = falling; H.resting = resting;
      H.m.instanceMatrix.needsUpdate = true;
    }

    // The band: Hail Damage from content (falls back to nobody if the content is missing) + you on the kit.
    function buildPeople() {
      var band = (GG.content.bands || {}).hail_damage, members = (band && band.members) || [], presets = GG.content.presets || [];
      var you = null;
      for (var p = 0; p < presets.length; p++) if (presets[p].id === 'toque_flannel') you = presets[p];
      you = you || presets[0] || null;
      var SPOTS = {
        marcel: { x: -0.55, z: -0.35, yaw: 0.05, pose: 'storm', opts: { cape: 'velvet' } },
        dana: { x: 0.95, z: -2.75, yaw: -0.4, pose: 'noodle', opts: { gear: 'guitar' } },
        jaxon: { x: -1.3, z: -2.85, yaw: 0.45, pose: 'noodle', opts: { gear: 'guitar' } },
        kenji: { x: 1.62, z: -0.55, yaw: -0.35, pose: 'lean', opts: {} }
      };
      for (var i = 0; i < members.length; i++) {
        var m = members[i], sp = SPOTS[m.id];
        if (!sp) continue;
        var o = { id: m.id }; for (var k in sp.opts) o[k] = sp.opts[k];
        addPerson(m.id, m.look, o, sp, i);
      }
      if (you) addPerson('player', you.look, { id: 'player', sticks: true }, { x: KIT.x, z: KIT.z - 0.72 * KIT.scale, yaw: 0, pose: 'drums' }, 9);
    }
    function addPerson(id, look, opts, sp, i) {
      var ch = null;
      try { ch = R.buildCharacter(look, opts); } catch (e) { ch = null; console.warn('[title] character failed', e); }
      if (!ch) return;
      K.chars.push(ch);
      var bn = ch.bones;
      bn[B_PHONES].scale.setScalar(0); bn[B_HELD].scale.setScalar(0); bn[B_FLOOR].scale.setScalar(0);
      if (opts.gear !== 'guitar') bn[B_GEAR].scale.setScalar(0);
      ch.root.position.set(sp.x, 0, sp.z); ch.root.rotation.y = sp.yaw;
      scene.add(ch.root);
      K.people.push({ id: id, ch: ch, pose: sp.pose, ph: hash01(i, 71) * 10, scale: ch.root.scale.y, seat: 0.6, react: -1 });
    }
    function pose(p, t) {
      var bn = p.ch.bones, tt = t + p.ph, i;
      for (i = 1; i < bn.length; i++) bn[i].rotation.set(0, 0, 0);
      bn[B_HIPS].position.y = HIPS_Y;
      var br = Math.sin(tt * 1.8);
      if (p.pose === 'storm') {   // Marcel: arms up to the sky, cape in the wind; bigger when he's summoning
        var sum = T.summon >= 0 ? bump(T.summon / 1.6) : 0, cyc = tt % 6, up = cyc < 3.2 ? smooth(cyc / 0.5) * (1 - smooth((cyc - 2.7) / 0.5)) : 0;
        var k = Math.max(up, sum);
        rot(bn[B_ARM_L], -0.2 * (1 - k), 0, 0.2 + 2.3 * k); rot(bn[B_ARM_R], -0.2 * (1 - k), 0, -0.2 - 2.3 * k);
        rot(bn[B_FORE_L], -0.3 * (1 - k), 0, 0.4 * k); rot(bn[B_FORE_R], -0.3 * (1 - k), 0, -0.4 * k);
        bn[B_HEAD].rotation.x = -0.35 * k + 0.05; bn[B_SPINE].rotation.x = -0.08 * k;
        bn[B_CAPE1].rotation.x = 0.25 + 0.12 * Math.sin(tt * 3.1) + 0.3 * sum; bn[B_CAPE1].rotation.z = 0.12 * Math.sin(tt * 1.7);
        bn[B_CAPE2].rotation.x = 0.15 + 0.14 * Math.sin(tt * 3.7 + 1) + 0.2 * sum;
      } else if (p.pose === 'noodle') {
        var rk = p.react >= 0 ? bump(p.react / 1.4) : 0, solo = Math.max(rk, (tt % 8) > 5.5 ? bump(((tt % 8) - 5.5) / 2.5) : 0);
        var strum = Math.sin(tt * (11 + 8 * solo)) * (0.16 + 0.08 * solo);
        rot(bn[B_ARM_L], 0.1, 0, 0.14); rot(bn[B_FORE_L], -2.05, 0, 0.1 + 0.1 * solo * Math.sin(tt * 3));
        rot(bn[B_ARM_R], -0.35, 0, 0.12); rot(bn[B_FORE_R], -0.95 + strum, 0, 0.45);
        bn[B_SPINE].rotation.x = -0.2 * solo + 0.02 * br; bn[B_SPINE].rotation.z = 0.04 * Math.sin(tt * 2.2);
        bn[B_HEAD].rotation.x = 0.18 + (0.07 + 0.25 * rk) * Math.sin(tt * (5.5 + 6 * rk)) - 0.3 * solo;
      } else if (p.pose === 'lean') {   // Kenji: arms crossed, the rare nod
        rot(bn[B_ARM_L], -0.25, 0, 0.12); rot(bn[B_FORE_L], -1.5, 0, -1.25);
        rot(bn[B_ARM_R], -0.3, 0, -0.12); rot(bn[B_FORE_R], -1.62, 0, 1.25);
        var nod = (tt % 9) > 8.2 ? bump(((tt % 9) - 8.2) / 0.8) : 0, rk2 = p.react >= 0 ? bump(p.react / 1.2) : 0;
        bn[B_HEAD].rotation.x = 0.25 * Math.max(nod, rk2); bn[B_SPINE].rotation.z = 0.05; bn[B_SPINE].rotation.x = 0.01 * br;
      } else if (p.pose === 'drums') {   // you: seated, sticks going; a fill when the kit is tapped
        var hy = p.seat / p.scale + 0.08, ang = Math.acos(clamp((hy - 0.02 - 0.45) / 0.39, -0.6, 0.6));
        bn[B_HIPS].position.y = hy;
        bn[B_LEG_L].rotation.x = -ang; bn[B_SHIN_L].rotation.x = ang; bn[B_LEG_R].rotation.x = -ang; bn[B_SHIN_R].rotation.x = ang;
        var fill = T.fill >= 0, rate = fill ? 14 : 6.2, hr = Math.sin(tt * rate), hl = Math.sin(tt * rate * (fill ? 1 : 0.5) + Math.PI);
        var reach = fill ? 0.35 * Math.sin(T.fill * 6) : 0;
        rot(bn[B_ARM_R], -0.55 - 0.12 * Math.max(0, hr), 0, -0.25 - reach); rot(bn[B_FORE_R], -0.9 - 0.45 * Math.max(0, hr), 0, 0.25);
        rot(bn[B_ARM_L], -0.5 - 0.12 * Math.max(0, hl), 0, 0.2 + reach * 0.5); rot(bn[B_FORE_L], -0.95 - 0.45 * Math.max(0, hl), 0, -0.2);
        bn[B_SPINE].rotation.x = 0.1 + 0.03 * Math.sin(tt * rate * 0.5); bn[B_HEAD].rotation.x = 0.12 + 0.1 * Math.max(0, Math.sin(tt * rate * 0.5));
      }
      if (p.pose !== 'drums') bn[B_HIPS].position.y += 0.004 * br;
    }

    // Hit boxes for taps (never drawn).
    function buildPicks() {
      pickables.length = 0;
      function hit(action, w, h, d, x, y, z, yaw) {
        var geo = own(K.geos, new THREE.BoxGeometry(w, h, d));
        var m = addMesh(geo, ctx.mats.hidden); m.position.set(x, y, z); m.rotation.y = yaw || 0; m.userData.action = action;
        pickables.push(m);
      }
      hit('kit', 2.2, 1.9, 1.9, KIT.x, 0.95, KIT.z - 0.3);
      hit('marcel', 1.0, 2.1, 0.8, -0.55, 1.05, -0.3);
      hit('truck', 2.3, 2.1, 5.6, TRUCK.x, 1.0, TRUCK.z, TRUCK.yaw);
      hit('house', 8.2, 4.2, 6.6, (HOUSE.x0 + HOUSE.x1) / 2 + 0.2, 2.1, (HOUSE.z0 + HOUSE.z1) / 2);
    }

    // ---- Events ------------------------------------------------------------------------------------------------------
    function strike(delay) {
      if (!K) return false;
      var x0 = -115 + rnd() * 135, z0 = -230 - rnd() * 90;
      writeBolt(x0, z0);
      T.flashT = -(delay || 0); T.strikes++;
      T.thunderAt = (delay || 0) + 0.45 + rnd() * 1.3;
      T.nextStrike = (K.calm ? 11 : 6) + rnd() * (K.calm ? 8 : 7);
      K.flash.position.set(x0 * 0.3, 40, z0 * 0.2);
      return true;
    }
    function flashLevel(t) {   // a main flash, a re-strike, a flicker
      if (t < 0) return 0;
      var f = Math.exp(-t * 9) + (t > 0.11 ? 0.75 * Math.exp(-(t - 0.11) * 11) : 0) + (t > 0.27 ? 0.4 * Math.exp(-(t - 0.27) * 14) : 0);
      return Math.min(1.3, f);
    }
    function tap(action) {
      if (!K) return false;
      var audio = GG.audio;
      if (action === 'kit') {
        T.taps.kit++; T.fill = 0; T.fillStep = 0;
        for (var j = 0; j < K.people.length; j++) if (K.people[j].pose === 'noodle' || K.people[j].pose === 'lean') K.people[j].react = 0;   // the band reacts
        var ac = audio && audio.context && audio.context(), t0 = ac ? ac.currentTime + 0.02 : 0;
        var FILL = [['snare', 0], ['snare', 0.09], ['toms', 0.18], ['toms', 0.27], ['toms', 0.36], ['kick', 0.46], ['cymbal', 0.46]];
        var vo = audio.TAP_AUTO ? { vel: audio.TAP_AUTO.other } : undefined;   // (v1.2: the velocity kit; Classic ignores it)
        if (ac && audio.hit) for (var i = 0; i < FILL.length; i++) audio.hit(FILL[i][0], t0 + FILL[i][1], vo);
        return true;
      }
      if (action === 'marcel') { T.taps.marcel++; T.summon = 0; strike(0.7); return true; }
      if (action === 'truck') { T.taps.truck++; T.honk = 0; if (audio) audio.sfx('honk'); return true; }
      if (action === 'house') { T.taps.house++; T.porch = 0; if (audio) audio.sfx('tap'); return true; }
      return false;
    }
    function onTap(hit) {
      if (!hit || hit.type !== 'hotspot' || !tap(hit.action)) return;
      var lines = GG.ui && GG.ui.toast ? {
        marcel: 'Lord Abyssus summons the storm. (It was coming anyway.)',
        truck: "Dad's truck. Totalled. He still starts it every morning.",
        house: 'Mom flicks the porch light. Keep it down out there.'
      } : {};
      if (lines[hit.action] && T.taps[hit.action] === 1) GG.ui.toast(lines[hit.action]);
    }

    // ---- Camera ------------------------------------------------------------------------------------------------------
    // Fits the focus box (garage + band + the truck's nose) into the band between the logo and the menu, then drifts.
    function applyCam(dt) {
      var cam = ctx.camera, sz = ctx.size(), W = sz.w, H = sz.h, portrait = H >= W;
      var top = Math.min(pending.top, H * 0.45), bottom = Math.min(pending.bottom, H * 0.55), band = Math.max(120, H - top - bottom);
      var fov = portrait ? 38 : 34, tv = Math.tan(fov * Math.PI / 360), aspect = W / H;
      var d = Math.max(FOCUS.hh / tv * (H / band), FOCUS.hw / (tv * aspect)) * 1.04;
      var t = T.t, yaw = 0.1 + 0.15 * Math.sin(t * 0.045), pitch = 0.1 + 0.025 * Math.sin(t * 0.031 + 1);
      d *= 1 + 0.035 * Math.sin(t * 0.06 + 2);
      var cp = Math.cos(pitch);
      camTgt.set(FOCUS.x, FOCUS.y, FOCUS.z);
      tmp.set(Math.sin(yaw) * cp, Math.sin(pitch), Math.cos(yaw) * cp).multiplyScalar(d).add(camTgt);
      if (T.shake > 0) {
        var a = T.shake * 0.05;
        tmp.x += Math.sin(t * 61) * a; tmp.y += Math.sin(t * 47 + 1) * a;
        T.shake = Math.max(0, T.shake - dt * 1.4);
      }
      cam.fov = fov; cam.aspect = aspect; cam.near = 0.3; cam.far = 1400;
      cam.setViewOffset(W, H, 0, Math.round(H / 2 - (top + band / 2)), W, H);
      cam.updateProjectionMatrix();
      cam.position.copy(tmp); cam.lookAt(camTgt); cam.updateMatrixWorld();
    }

    // ---- Per frame ---------------------------------------------------------------------------------------------------
    function update(dt) {
      if (!K) return;
      applyPrefs();
      T.t += dt; T.frame++;
      var t = T.t, i;
      // Lightning
      T.nextStrike -= dt;
      if (T.nextStrike <= 0) strike(0);
      T.flashT += dt;
      var f = flashLevel(T.flashT) * (K.calm ? 0.3 : 1), sheet = 0.08 * Math.max(0, Math.sin(t * 0.7) * Math.sin(t * 2.3) - 0.6) * (K.calm ? 0.3 : 1);
      K.hemi.intensity = 0.62 + f * 1.5 + sheet * 2; K.flash.intensity = f * 2.2;
      var sk = 1 + f * 2.2 + sheet * 4; K.skyMat.color.setScalar(sk); K.cloudMat.color.setScalar(1 + f * 3.2 + sheet * 6);
      K.bolt.visible = f > 0.03 && T.flashT >= 0; K.boltMat.opacity = Math.min(1, f * (K.calm ? 1.5 : 1.1));
      K.boltGlow.material.opacity = Math.min(0.6, f * 0.5);
      if (T.thunderAt >= 0) { T.thunderAt -= dt; if (T.thunderAt < 0) { if (GG.audio) GG.audio.sfx('thunder'); if (K.shakeOk) T.shake = 1; } }
      // Searchlights sweep; the TV flickers; the fluorescent tube hums along.
      for (i = 0; i < K.beams.length; i++) {
        var bm = K.beams[i];
        bm.m.rotation.z = 0.42 * Math.sin(t * bm.sp + bm.ph); bm.m.rotation.x = -0.12 + 0.18 * Math.sin(t * bm.sp * 0.7 + bm.ph * 1.3);
      }
      var tvb = 0.55 + 0.3 * Math.sin(t * 7.3) * Math.sin(t * 2.9) + 0.15 * Math.sin(t * 23);
      K.tvMat.color.setRGB(0.62 + 0.1 * tvb, 0.45 + 0.2 * tvb, 0.3 + 0.42 * tvb);   // lamp-warm room, blue TV light
      K.garage.intensity = 1.6 + (Math.sin(t * 50) > 0.97 ? -0.25 : 0);
      // Easter eggs
      if (T.fill >= 0) { T.fill += dt; if (T.fill > 0.8) T.fill = -1; }
      if (T.summon >= 0) { T.summon += dt; if (T.summon > 1.6) T.summon = -1; }
      if (T.honk >= 0) {
        T.honk += dt;
        var on = T.honk < 0.25 || (T.honk > 0.4 && T.honk < 0.65) ? 1 : 0;
        K.headMat.color.setHex(on ? 0xfff6dc : 0x6a6450); K.headGlow[0].material.opacity = K.headGlow[1].material.opacity = on * 0.9; K.headPool.material.opacity = on * 0.6;
        if (T.honk > 0.8) { T.honk = -1; }
      }
      if (T.porch >= 0) { T.porch += dt; K.porch.material.opacity = Math.floor(T.porch * 5) % 2 ? 0.05 : 0.9; if (T.porch > 1.4) { T.porch = -1; K.porch.material.opacity = 0.9; } }
      for (i = 0; i < K.people.length; i++) {
        var p = K.people[i];
        if (p.react >= 0) { p.react += dt; if (p.react > 1.4) p.react = -1; }
        pose(p, t);
      }
      updateHail(dt);
      applyCam(dt);
    }

    function dispose() {
      if (!K) return;
      for (var i = 0; i < K.chars.length; i++) K.chars[i].dispose();
      for (i = scene.children.length - 1; i >= 0; i--) scene.remove(scene.children[i]);
      K.geos.forEach(function (g) { g.dispose(); });
      K.mats.forEach(function (m) { m.dispose(); });
      K.texs.forEach(function (x) { x.dispose(); });
      if (K.hail && K.hail.m.dispose) K.hail.m.dispose();
      pickables.length = 0;
      scene.fog = null;
      K = null;
    }

    var shell = {
      scene: scene, labels: [], pickables: pickables, floorY: null,
      enter: function () {
        if (!K) { try { build(); } catch (e) { console.error('[title] build failed', e); dispose(); } }
        inst.active = !!K; T.t = 0; T.frame = 0;
        if (K) applyCam(0);
      },
      exit: function () {
        inst.active = false;
        dispose();
        var cam = ctx.camera; cam.clearViewOffset(); cam.near = 0.1; cam.far = 120; cam.updateProjectionMatrix();
      },
      resize: function () { if (K) applyCam(0); },
      update: update,
      sync: function () {},
      onTap: onTap,
      debug: function () { return { title: inst.info() }; }
    };
    inst = {
      active: false,
      strike: function (d) { return strike(d); },
      tap: tap,
      info: function () {
        if (!K) return { built: false };
        return { built: true, hail: K.hail.n, calm: K.calm, shake: K.shakeOk, falling: K.hail.falling, resting: K.hail.resting, strikes: T.strikes, taps: { kit: T.taps.kit, marcel: T.taps.marcel, truck: T.taps.truck, house: T.taps.house },
          people: K.people.map(function (p) { return p.id; }), frame: T.frame, view: { top: pending.top, bottom: pending.bottom }, geos: K.geos.length, mats: K.mats.length };
      }
    };
    return shell;
  });
})(window.GG);
