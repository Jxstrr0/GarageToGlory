// 43_render_van.js: the drive. Inside the Moose Hearse, looking out the windshield at the prairie rolling by.
// Kenji drives (every trip, sunglasses on, never a word; his eyes only ever show in the rear-view mirror).
// The band sits as silhouettes against the bright glass; a moose bobblehead nods on the dash. Outside:
// scrolling fields, grain elevators, power poles, shelterbelts, farmyards, bales, road signs counting down
// the km, the odd moose, the destination's skyline rising at the end. Season from state.week (or setTrip),
// day or night. Built on enter()/setTrip(), disposed on exit().
// API (GG.render.van): setTrip({ from, to, km, season, night }) ; setProgress(0..1) ; moose() (one crosses
//   the road ahead, the van slows) ; talk(memberId, seconds) (a bandmate gestures while a banter line shows) ;
//   setFrame({ top, bottom }) ; info().
// v0.6.1 (WORLD, Addendum 1 C1/C7): setTrip also takes weather (C.WEATHER: clear/rain/snow/blizzard/heat/hail -> the
//   windshield: rain streaks, snow, a blizzard whiteout, hail bouncing off the glass, a heat haze), driver ('kenji' |
//   'you' | a member id; default: Kenji while active, else you) and dashboard ('cactus' | 'laundry' | 'cassettes' | 'atlas').
//   Seating: the driver up front, YOU riding shotgun as founder (or driving), the band in the back rows, gear + merch piled
//   behind. info() adds weatherId, driver, dashboard.
// v0.7 (WORLDUI): setTrip also takes region ('uk_europe' | 'japan' | 'australia' | 'russia'; abroad) and look (the rental:
//   'sardine' | 'splitter' | 'kei' | 'train' | 'ute' | 'camper' | 'bus'). Abroad the fields and roadside change: UK & Europe
//   hedgerows, sheep, cottages and castles; Japan neon shopping streets, blossom trees, vending machines; Australia red
//   outback, roadhouses, termite mounds, gum trees and kangaroos; Russia birch taiga (snow in winter), izbas, onion domes
//   and a bear. The tiny European van ('sardine') packs the band in like sardines (three abreast, gear to the roof);
//   rails replace the road for train passes (faster). info() adds region, look.
// v0.8 (SHOPUI): at home the band rides in its own vehicle tier (setTrip({ tier }) or state.van.tier; C.VAN_TIERS): 0 the rusted
//   minivan (the cabin above), 1 the 15-passenger ex-church van + trailer (two bench rows ahead, hymnals, ST. VLAD'S), 2 the
//   sprinter (high roof, captain seats, a touchscreen, LED strips, lockers), 3 the tour bus (the lounge: couches both sides, a
//   table, a TV, fairy lights; the band faces each other). The newest 12 venue stickers (state.van.stickers or setTrip
//   { stickers }) sit on the hood (the bus: over the driver's doorway), banned venues crossed out in red. info() adds tier, vehicle,
//   stickers, banned. A rental abroad (look) ignores the tier. v0.8 SPACES review: own cabins get a busy headliner (overhead
//   console, visor CD wallet + set list, seams), headrests + pocket stitching, per-vehicle clutter (the minivan's backpack, the
//   15-passenger's piped bench + crossed sticks, the sprinter's cab shelf + cup holders) and tighter cameras.
// v1.1 "Seats" (Lane C): on a string seat (state.seat) your instrument rides up front in its gig bag, wedged between the front
//   seats, neck up (a patch in your instrument's colour; +1 draw call); info().gigBag = the seat or null. Drums: unchanged.
// Draw calls ≈ sky 1 + sun/moon 1 + stars 1 + clouds 1 + ground 1 + road 1 + poles 1 + elevators 1 + farms 1
//   + farm lights 1 + belts 1 + bales 1 + moose 1 + sign 2 + skyline 1 + weather 1-2 + glass 1 + wipers 1
//   + headlight pool 1 + interior 2 + bobble 1 + freshener 1 + wheel 1 + people 4 ≈ 32.
(function (GG) {
  var R = GG.render;
  if (!R || !R.defineScene) return;
  var THREE = null;

  var B_HIPS = 1, B_SPINE = 2, B_HEAD = 3, B_ARM_L = 4, B_FORE_L = 5, B_ARM_R = 6, B_FORE_R = 7,
    B_LEG_L = 8, B_SHIN_L = 9, B_LEG_R = 10, B_SHIN_R = 11, B_CAPE1 = 12, B_CAPE2 = 13, B_GEAR = 14, B_PHONES = 15, B_HELD = 16, B_FLOOR = 17;
  var HIPS_Y = 0.86, PEOPLE_SCALE = 0.86;
  var SPEED = 26;                                   // m/s (~95 km/h on the Yellowhead)
  var NEAR = 30;                                    // props recycle once they pass this z (behind the van)
  var SEAT_Y = 0.46;
  var CAPE_OK = { velvet: 1, curtain: 1, charred: 1, fireproof: 1 };

  var SKY = {
    summer: { hor: 0xcfe6f7, zen: 0x3f86d8, hemi: [0xdcefff, 0x8a7a48, 0.95], sun: 0xfff1c0, sunEl: 0.32, fog: 0xcfe6f7 },
    fall: { hor: 0xf2d6a8, zen: 0x6a90c8, hemi: [0xffe8c8, 0x7a5a30, 0.9], sun: 0xffc878, sunEl: 0.16, fog: 0xf0d8b0 },
    winter: { hor: 0xe6ebf2, zen: 0x93a9c8, hemi: [0xeef4ff, 0x9aa4b8, 1.0], sun: 0xfff4e0, sunEl: 0.1, fog: 0xe4e9f0 },
    spring: { hor: 0xaab4c0, zen: 0x6a7888, hemi: [0xc8d2e0, 0x5a5a48, 0.85], sun: 0xe8ecf2, sunEl: 0.35, fog: 0xa8b2be },
    night: { hor: 0x1c2750, zen: 0x02040c, hemi: [0x5a6a9a, 0x0a0a12, 0.32], sun: 0xdfe8ff, sunEl: 0.42, fog: 0x151d3a }
  };
  var FIELDS = {
    summer: [0xd8b24a, 0xe8d63a, 0x6f9a3a, 0x8aa84a, 0xc9a24a, 0x5f8a34, 0xe4cc3c],
    fall: [0xc9a462, 0xb08a4a, 0x8a6a3a, 0xd6b870, 0x9a7a44, 0xc4964e],
    winter: [0xf2f5fa, 0xe8edf5, 0xf6f8fc, 0xdfe6f0],
    spring: [0x6a5236, 0x7a603e, 0x6f8e46, 0x5e4a30, 0x86a052]
  };
  var BELTS = { summer: 0x3f6e2e, fall: 0xd88a2a, winter: 0x4a4238, spring: 0x7aa24a };
  // v0.7: abroad. fields: non-winter patchwork (winter falls back to the snowy prairie unless `always`).
  var REGION = {
    uk_europe: { fields: [0x5f9a3e, 0x74a84a, 0x4e8a36, 0x88b456, 0x6a9a40, 0xc8b84a], elev: [0x9a968a, 0x8a8478, 0xa8a294] },
    japan: { fields: [0x6aa04a, 0x7fb258, 0x8a8a86, 0x6a6a70, 0x5a9a48, 0x9a9a96], elev: [0x3a3a48, 0x4a4a5a, 0x2e3440] },
    australia: { fields: [0xb8562a, 0xc4642e, 0xa84a22, 0xd07a3a, 0x9a4420, 0xc8883e], always: true, elev: [0xc8c8c0, 0xb0b0a8, 0xd0ccc0] },
    russia: { fields: [0x3e5e32, 0x4a6a3a, 0x5a7a44, 0x36502c, 0x6a8a4a, 0x5a6a3a], elev: [0xf0ece0, 0xe8e0d0, 0xf4f0e8] }
  };
  var LINERS = { sardine: 0xe8e8e4, splitter: 0x3a3a42, kei: 0xd8dce4, train: 0x9aa6b4, ute: 0xc8b8a0, camper: 0xf0e8d0, bus: 0xb8a888 };
  var ELEV_COLS = [0xb03a2e, 0x8a2a2a, 0x3a7a4a, 0xd8b24a, 0xa8a8a0];

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function bump(u) { return u <= 0 || u >= 1 ? 0 : Math.sin(Math.PI * u); }
  function ease(u) { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); }
  function hash01(i, salt) {
    var h = Math.imul((i + 1) ^ Math.imul(salt + 11, 0x9e3779b1), 0x85ebca6b);
    h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function seasonOf(week) {   // v0.6.1: the calendar's seasons (summer 23–4, fall 5–10, winter 11–16, spring 17–22)
    if (GG.calendar) return GG.calendar.season(week);
    var w = ((Math.max(1, week | 0) - 1) % 24) + 1;
    return w <= 4 || w >= 23 ? 'summer' : w <= 10 ? 'fall' : w <= 16 ? 'winter' : 'spring';
  }
  var WX = { clear: 1, rain: 1, snow: 1, blizzard: 1, heat: 1, hail: 1 };
  function hex(c) { return '#' + ('000000' + c.toString(16)).slice(-6); }
  function mod(a, n) { return ((a % n) + n) % n; }

  // ---- Public API --------------------------------------------------------------------------------------
  var A = R.van = {};
  var inst = null;
  var pending = { trip: null, progress: 0, frame: { top: 0, bottom: -1 } };
  A.setTrip = function (o) { pending.trip = o || {}; pending.progress = 0; if (inst && inst.active) inst.build(); return !!(inst && inst.active); };
  A.setProgress = function (p) { p = +p; if (!isFinite(p)) return; pending.progress = clamp(p, 0, 1); };
  A.moose = function () { return !!(inst && inst.active && inst.moose()); };
  A.talk = function (id, secs) { return !!(inst && inst.active && inst.talk(id, secs)); };
  A.setFrame = function (o) {
    o = o || {};
    if (typeof o.top === 'number') pending.frame.top = Math.max(0, o.top);
    if (typeof o.bottom === 'number') pending.frame.bottom = o.bottom;
    if (inst && inst.active) inst.frame();
  };
  A.info = function () { return inst ? inst.info() : { built: false }; };
  A.seasonOf = seasonOf;

  // ======================================================================================================
  R.defineScene('van', function (ctx) {
    THREE = ctx.THREE;
    var sh = ctx.shade;
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87b4e0);
    var lastState = null, K = null, camFov = 0, camOffY = 0;
    var dummy = new THREE.Object3D(), mA = new THREE.Matrix4(), mB = new THREE.Matrix4(), vA = new THREE.Vector3(), col = new THREE.Color();
    var zero = new THREE.Matrix4().makeScale(0, 0, 0);
    var S = { s: 0, t: 0, speedK: 1, bob: 0, bobV: 0, bobX: 0, bobXV: 0, fresh: 0, freshV: 0, wipe: 0, lastWipe: 0 };

    // ---------------------------------------------------------------------------------------------------
    function resolve() {
      var o = pending.trip || {}, st = lastState || GG.state || {};
      var season = o.season && FIELDS[o.season] ? o.season : seasonOf(st.week || 1);
      var gig = (st.liveGig && st.liveGig.gig) || st.gig || null;
      var band = GG.content && GG.content.bands && GG.content.bands[st.bandId || 'hail_damage'];
      var members = o.members || st.members || (band && band.members) || [], pl = st.player || {};
      var preset = (GG.content.presets || []).filter(function (x) { return x.id === pl.presetId; })[0];
      // v0.9: the band's own driver (GG.world.driver: Kenji / Moth / T-Bone / Earl while active, else you) and that driver's
      // dashboard item; when you drive, the absent driver's item stays on the dash (the tiny cactus, the laundry, ...).
      var kenjiOn = members.some(function (m) { return m && m.id === 'kenji' && (!m.status || m.status === 'active'); });
      var wd = null;
      try { wd = st && st.bandId && GG.world && GG.world.driver ? GG.world.driver(st) : null; } catch (e) { wd = null; }
      var driver = o.driver || (wd ? wd.id : kenjiOn ? 'kenji' : members.length ? 'you' : 'kenji');
      var DR = GG.content.drivers || {}, designated = (wd && wd.designated) || (DR[driver] && DR[driver].band ? driver : null) || (kenjiOn ? 'kenji' : null);
      var hdVan = !st.bandId || st.bandId === 'hail_damage';   // the tiny cactus is Hail Damage's; nobody else's dash gets it
      var dashItem = driver !== 'you' && DR[driver] ? DR[driver].dashboard : designated && DR[designated] ? DR[designated].dashboard : driver === 'kenji' || (driver === 'you' && hdVan) ? 'cactus' : null;
      if (dashItem === 'none') dashItem = null;
      return {
        bandId: (st && st.bandId) || (band && band.id) || 'hail_damage', vanName: (st.van && st.van.name) || (GG.shop && GG.shop.vanName ? safeVanName(st) : null),
        season: season, night: !!o.night, from: o.from || st.city || 'Saskatoon', to: o.to || (gig && gig.city) || 'Regina',
        km: +o.km > 0 ? +o.km : 150, members: members, band: band, flags: st.flags || {},
        weather: WX[o.weather] ? o.weather : null, driver: driver,
        dashboard: o.dashboard !== undefined && !(o.dashboard === 'cactus' && driver !== 'kenji' && (designated ? designated !== 'kenji' : !hdVan)) ? o.dashboard : dashItem,
        playerLook: pl.look || (preset && preset.look) || null,
        seat: st.seat === 'bass' || st.seat === 'rhythm' || st.seat === 'lead' ? st.seat : null,   // v1.1: your gig bag
        gearColor: (pl.gearLook && pl.gearLook.color) || (pl.kit && pl.kit.color) || pl.kitColor || '#b3262b',
        region: REGION[o.region] ? o.region : null, look: o.look || null,   // v0.7: abroad
        // v0.8 (SHOPUI): the band's own vehicle tier at home (a rental abroad), and its venue stickers (banned ones crossed out)
        tier: o.look ? null : clamp(isFinite(o.tier) ? Math.round(o.tier) : (st.van && isFinite(st.van.tier) ? st.van.tier : 0), 0, 3),
        stickers: (o.stickers || (st.van && st.van.stickers) || []).slice(-12).map(function (x) { return { name: String(x.name || x.venueId || ''), banned: !!(x.banned || (st.banned && st.banned.indexOf(x.venueId) >= 0)) }; })
      };
    }
    function safeVanName(st) { try { return GG.shop.vanName(st.bandId, 0); } catch (e) { return null; } }
    function contentMember(band, id) {
      var list = band && band.members;
      if (!list) return null;
      for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
      return null;
    }

    function teardown() {
      if (!K) return;
      scene.remove(K.root);
      scene.fog = null;
      for (var i = 0; i < K.chars.length; i++) K.chars[i].dispose();
      for (i = 0; i < K.geos.length; i++) K.geos[i].dispose();
      for (i = 0; i < K.mats.length; i++) K.mats[i].dispose();
      for (i = 0; i < K.texs.length; i++) K.texs[i].dispose();
      K = null;
    }
    function track(o) {
      if (o.geometry && K.geos.indexOf(o.geometry) < 0) K.geos.push(o.geometry);
      if (o.material && K.mats.indexOf(o.material) < 0 && !isShared(o.material)) K.mats.push(o.material);
      return o;
    }
    function isShared(m) { var s = ctx.mats; return m === s.vc || m === s.skin || m === s.unlit || m === s.hidden; }
    function mesh(geo, mat, parent) { var m = new THREE.Mesh(geo, mat); (parent || K.root).add(m); return track(m); }
    function ownMat(m) { K.mats.push(m); return m; }
    function instanced(geo, mat, n) {
      var m = new THREE.InstancedMesh(geo, mat, n);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false;
      for (var i = 0; i < n; i++) m.setMatrixAt(i, zero);
      K.root.add(m); return track(m);
    }

    function build() {
      teardown();
      var D = resolve(), sky = D.night ? SKY.night : SKY[D.season];
      K = { root: new THREE.Group(), chars: [], geos: [], mats: [], texs: [], D: D, sky: sky, people: [], props: {}, lastSign: -1, crossing: null };
      scene.add(K.root);
      scene.background.setHex(sky.hor);
      scene.fog = new THREE.Fog(sky.fog, 60, D.season === 'spring' && !D.night ? 330 : 460);
      if (D.weather === 'blizzard') { scene.fog.near = 8; scene.fog.far = 120; scene.fog.color.setHex(D.night ? 0x3a4258 : 0xdfe6ee); scene.background.setHex(D.night ? 0x2a3044 : 0xd8dfe8); }
      else if (D.weather === 'rain' || D.weather === 'hail') { scene.fog.far = 300; if (!D.night) scene.fog.color.setHex(0xa8b2be); }
      else if (D.weather === 'heat' && !D.night) scene.fog.color.setHex(0xf2dcae);
      buildSky(D, sky);
      buildLights(D, sky);
      buildGround(D);
      buildProps(D);
      buildSign(D);
      buildSkyline(D);
      buildWeather(D);
      buildInterior(D);
      buildPeople(D);
      buildGigBag(D);   // v1.1
      buildMirror(D);
      frame();
      return K;
    }

    // ---- Sky, sun/moon, stars, clouds ---------------------------------------------------------------------
    function buildSky(D, sky) {
      var g = new THREE.SphereGeometry(800, 24, 14), pos = g.attributes.position, cols = new Float32Array(pos.count * 3);
      var h = new THREE.Color(sky.hor), z = new THREE.Color(sky.zen);
      for (var i = 0; i < pos.count; i++) {
        var t = Math.pow(clamp(pos.getY(i) / 800 * 1.5, 0, 1), 0.7);
        col.copy(h).lerp(z, t); cols[i * 3] = col.r; cols[i * 3 + 1] = col.g; cols[i * 3 + 2] = col.b;
      }
      g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      var dome = mesh(g, ownMat(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })));
      dome.renderOrder = -2; K.dome = dome;
      var sm = ownMat(new THREE.SpriteMaterial({ map: ctx.radialTexture('glow'), color: sky.sun, transparent: true, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }));
      var sun = new THREE.Sprite(sm); K.root.add(sun);
      var el = sky.sunEl, az = D.night ? 0.45 : -0.42;
      sun.position.set(Math.sin(az) * 600 * Math.cos(el), Math.sin(el) * 600, -Math.cos(az) * 600 * Math.cos(el));
      sun.scale.setScalar(D.night ? 55 : D.season === 'spring' ? 90 : 150); sun.renderOrder = -1;
      if (D.season === 'spring' && !D.night) sm.opacity = 0.35;
      if (D.night) {
        var sp = new Float32Array(300 * 3);
        for (i = 0; i < 300; i++) {
          var a = hash01(i, 1) * Math.PI * 2, e = 0.08 + hash01(i, 2) * 1.3;
          sp[i * 3] = Math.cos(a) * Math.cos(e) * 700; sp[i * 3 + 1] = Math.sin(e) * 700; sp[i * 3 + 2] = Math.sin(a) * Math.cos(e) * 700;
        }
        var sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
        var stars = new THREE.Points(sg, ownMat(new THREE.PointsMaterial({ color: 0xeef2ff, size: 1.6, sizeAttenuation: false, fog: false, depthWrite: false })));
        K.root.add(track(stars)); stars.renderOrder = -1;
      }
      // Clouds: puffy clusters drifting in slower than the ground (parallax).
      var cb = new ctx.Builder({ jitter: 0.05, seed: 3 });
      for (i = 0; i < 5; i++) cb.shape(new THREE.IcosahedronGeometry(1, 0), (i - 2) * 9, (i % 2) * 2, (hash01(i, 5) - 0.5) * 8, 9 + hash01(i, 6) * 5, 4 + hash01(i, 7) * 2, 7, 0xffffff);
      var cm = ownMat(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, emissive: D.night ? 0x05070f : 0x6a7080 }));
      K.clouds = instanced(cb.build(), cm, 10);
      col.setHex(D.night ? 0x3a4260 : D.season === 'spring' ? 0x9aa2ae : 0xffffff);
      for (i = 0; i < 10; i++) K.clouds.setColorAt(i, col);
    }

    function buildLights(D, sky) {
      var L = K.lights = {};
      L.hemi = new THREE.HemisphereLight(sky.hemi[0], sky.hemi[1], sky.hemi[2]); K.root.add(L.hemi);
      L.sun = new THREE.DirectionalLight(D.night ? 0x8fa0d8 : 0xfff2dc, D.night ? 0.2 : 0.75);
      L.sun.position.set(40, 80, 60); K.root.add(L.sun);
      if (D.night) {
        L.head = new THREE.SpotLight(0xfff0d0, 2.4, 90, 0.42, 0.6, 1.1);
        L.head.position.set(0, 0.9, -2.4); L.head.target.position.set(0, 0, -30); K.root.add(L.head); K.root.add(L.head.target);
        L.dash = new THREE.PointLight(0x6ab8ff, 0.5, 2.2, 1.5); L.dash.position.set(-0.2, 1.0, -0.8); K.root.add(L.dash);
      }
    }

    // ---- Ground + road (scrolling canvas textures) ------------------------------------------------------------
    function buildGround(D) {
      var season = D.season, c = document.createElement('canvas'); c.width = c.height = 256;
      var RG = D.region && REGION[D.region], g = c.getContext('2d'), cols = RG && (season !== 'winter' || RG.always) ? RG.fields : FIELDS[season], i, j, k;
      for (i = 0; i < 4; i++) for (j = 0; j < 4; j++) {
        var cc = cols[Math.floor(hash01(i * 4 + j, 9) * cols.length)];
        g.fillStyle = hex(cc); g.fillRect(i * 64, j * 64, 64, 64);
        g.fillStyle = 'rgba(0,0,0,0.08)';
        var vert = hash01(i * 4 + j, 10) < 0.5;
        for (k = 0; k < 64; k += 4) { if (vert) g.fillRect(i * 64 + k, j * 64, 1, 64); else g.fillRect(i * 64, j * 64 + k, 64, 1); }
        if (season === 'winter') { g.fillStyle = 'rgba(150,160,180,0.18)'; for (k = 0; k < 6; k++) g.fillRect(i * 64 + hash01(k + i * 9 + j, 12) * 60, j * 64 + hash01(k + j * 9, 13) * 60, 18, 2); }
      }
      g.fillStyle = season === 'winter' ? 'rgba(120,130,150,0.35)' : 'rgba(90,70,40,0.55)';
      g.fillRect(0, 0, 256, 2); g.fillRect(0, 0, 2, 256); g.fillRect(128, 0, 1, 256); g.fillRect(0, 128, 256, 1);
      var tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.anisotropy = 4;
      tex.repeat.set(1600 / 220, 1600 / 220); K.texs.push(tex); K.groundTex = tex;
      var gg = new THREE.PlaneGeometry(1600, 1600); gg.rotateX(-Math.PI / 2);
      var ground = mesh(gg, ownMat(new THREE.MeshLambertMaterial({ map: tex })));
      ground.position.set(0, 0, -780);
      // Road: asphalt, gravel shoulders, white edges, dashed yellow centre line.
      var rc = document.createElement('canvas'); rc.width = 128; rc.height = 256;
      var r = rc.getContext('2d'), snow = season === 'winter';
      r.fillStyle = snow ? '#e9edf3' : D.region === 'australia' ? '#b0582a' : '#9a8e76'; r.fillRect(0, 0, 128, 256);
      r.fillStyle = snow ? '#7d828c' : '#3c3d42'; r.fillRect(16, 0, 96, 256);
      if (snow) { r.fillStyle = 'rgba(240,244,250,0.7)'; r.fillRect(16, 0, 8, 256); r.fillRect(104, 0, 8, 256); r.fillRect(58, 0, 12, 256); }
      r.fillStyle = 'rgba(0,0,0,0.12)'; for (k = 0; k < 40; k++) r.fillRect(16 + hash01(k, 20) * 94, hash01(k, 21) * 250, 2 + hash01(k, 22) * 4, 1 + hash01(k, 23) * 3);
      r.fillStyle = '#f2f2ea'; r.fillRect(20, 0, 3, 256); r.fillRect(105, 0, 3, 256);
      r.fillStyle = D.region === 'uk_europe' || D.region === 'japan' ? '#f2f2ea' : '#f2c832'; r.fillRect(62, 0, 4, 96);
      if (D.look === 'train') {                                               // v0.7: rail passes: ballast, sleepers, two rails
        r.fillStyle = snow ? '#c8ccd4' : '#7a746a'; r.fillRect(0, 0, 128, 256);
        r.fillStyle = '#4a3a2a'; for (k = 0; k < 256; k += 16) r.fillRect(22, k, 84, 7);
        r.fillStyle = '#b8bcc4'; r.fillRect(36, 0, 5, 256); r.fillRect(87, 0, 5, 256);
      }
      var rt = new THREE.CanvasTexture(rc); rt.wrapS = rt.wrapT = THREE.RepeatWrapping; rt.anisotropy = 4; rt.repeat.set(1, 1000 / 28);
      K.texs.push(rt); K.roadTex = rt;
      var rg = new THREE.PlaneGeometry(12, 1000); rg.rotateX(-Math.PI / 2);
      var road = mesh(rg, ownMat(new THREE.MeshLambertMaterial({ map: rt })));
      road.position.set(0, 0.03, -470);
      if (D.night) {                                                          // headlight pool on the road
        var hm = ownMat(new THREE.MeshBasicMaterial({ map: ctx.radialTexture('soft'), color: 0x6a6450, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
        var hg = new THREE.PlaneGeometry(9, 34); hg.rotateX(-Math.PI / 2);
        var pool = mesh(hg, hm); pool.position.set(0, 0.05, -18);
      }
    }

    // ---- Roadside props (instanced pools that scroll and recycle) ------------------------------------------
    function buildProps(D) {
      var P = K.props, i, b, season = D.season, night = D.night;
      var litMat = ownMat(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
      K.litMat = litMat;
      if (D.region) { buildRegionProps(D, P, litMat); return; }   // v0.7: abroad
      // Power poles (right side) with the wire span to the next pole.
      b = new ctx.Builder({ jitter: 0.04, seed: 5 });
      b.box(0.28, 9, 0.28, 0, 4.5, 0, 0x6a4a2e); b.box(2.4, 0.18, 0.18, 0, 8.4, 0, 0x5a3e26);
      for (i = -1; i <= 1; i += 2) {
        b.box(0.1, 0.18, 0.1, i * 1.0, 8.6, 0, 0xd8d8d0);
        for (var k = 0; k < 4; k++) { var z0 = -k * 45 / 4, z1 = -(k + 1) * 45 / 4, y0 = 8.6 - 0.9 * Math.sin(Math.PI * k / 4), y1 = 8.6 - 0.9 * Math.sin(Math.PI * (k + 1) / 4); b.box(0.035, 0.035, 45 / 4 + 0.05, i * 1.0, (y0 + y1) / 2, (z0 + z1) / 2, 0x222222, Math.atan2(y1 - y0, z0 - z1), 0, 0); }
      }
      P.poles = { m: instanced(b.build(), litMat, 12), n: 12, gap: 45, speed: 1 };
      // Grain elevators (the prairie sentinels) with a peaked roof, cupola and annex.
      b = new ctx.Builder({ jitter: 0.04, seed: 7 });
      b.box(7, 17, 7, 0, 8.5, 0, 0xffffff); b.box(7.2, 0.5, 7.2, 0, 3, 0, 0x777777);
      b.quad([-3.6, 17, 3.6], [3.6, 17, 3.6], [0, 20.5, 3.6], [0, 20.5, 3.6], 0x666666); b.tri([3.6, 17, -3.6], [-3.6, 17, -3.6], [0, 20.5, -3.6], 0x666666);
      b.tri([-3.6, 17, 3.6], [0, 20.5, 3.6], [-3.6, 17, 3.6], 0x666666);
      b.quad([-3.6, 17, -3.6], [-3.6, 17, 3.6], [0, 20.5, 3.6], [0, 20.5, -3.6], 0x555555); b.quad([3.6, 17, 3.6], [3.6, 17, -3.6], [0, 20.5, -3.6], [0, 20.5, 3.6], 0x5a5a5a);
      b.box(2.6, 3.4, 2.6, 0, 21.4, 0, 0xffffff); b.box(3, 0.6, 3, 0, 23.3, 0, 0x555555);
      b.box(5, 10, 6, 6, 5, 0, 0xe6e6e6); b.box(5.2, 0.6, 6.2, 6, 10.2, 0, 0x555555);
      b.box(3, 3, 3, -5, 1.5, 1, 0xdddddd); b.box(7.1, 1.1, 7.1, 0, 14.5, 0, 0xf0f0e0);
      P.elev = { m: instanced(b.build(), litMat, 3), n: 3, gap: 360, speed: 1, lastCycle: new Int32Array(3).fill(-99999) };
      // Farmyards: house, red barn, quonset, windbreak.
      b = new ctx.Builder({ jitter: 0.05, seed: 11 });
      b.box(7, 4, 6, 0, 2, 0, 0xf0ece0); b.quad([-3.6, 4, 3.1], [3.6, 4, 3.1], [3.6, 6, 0], [-3.6, 6, 0], 0x5a4a44); b.quad([3.6, 4, -3.1], [-3.6, 4, -3.1], [-3.6, 6, 0], [3.6, 6, 0], 0x4a3a34);
      b.box(9, 6, 12, 14, 3, -4, 0xa8322a); b.quad([9.4, 6, 2.1], [18.6, 6, 2.1], [14, 9.5, 2.1], [14, 9.5, 2.1], 0xa8322a);
      b.quad([9.4, 6, -10.1], [9.4, 6, 2.1], [14, 9.5, 2.1], [14, 9.5, -10.1], 0x5a5a5a); b.quad([18.6, 6, 2.1], [18.6, 6, -10.1], [14, 9.5, -10.1], [14, 9.5, 2.1], 0x4e4e4e);
      b.box(1.8, 3, 0.1, 14, 1.5, 2.06, 0xf0ece0);
      b.push(-12, 0, -6, 0, 0, 0); b.cyl(4, 4, 14, 10, 0, 0, 0, 0xb8bcc2, Math.PI / 2, 0, 0); b.pop();
      b.box(8, 0.2, 14, -12, 0.1, -6, 0x6a6a6a);
      b.box(0.5, 9, 0.5, -20, 4.5, 6, 0x9aa0a8); b.cyl(1.8, 1.8, 7, 10, -20, 12, 6, 0xc8ccd2);
      P.farm = { m: instanced(b.build(), litMat, 4), n: 4, gap: 250, speed: 1 };
      if (night) {
        var lb = new ctx.Builder({ jitter: 0 }); lb.box(0.6, 0.6, 0.6, 0, 7, 3.2, 0xffe2a0); lb.box(1.5, 1.2, 0.2, 2, 2.5, 3.05, 0xffd070); lb.box(0.8, 0.8, 0.8, 14, 7.8, 2.2, 0xffe8b0);
        K.farmLights = instanced(lb.build(), ctx.mats.unlit, 4);
      }
      // Shelterbelts: a long row of trees along a field edge (tinted by season).
      b = new ctx.Builder({ jitter: 0.1, seed: 13 });
      for (i = 0; i < 14; i++) {
        var tz = -i * 5, th = 6 + hash01(i, 3) * 3;
        b.box(0.5, th * 0.4, 0.5, 0, th * 0.2, tz, 0x5a4232);
        if (season !== 'winter') b.shape(new THREE.IcosahedronGeometry(2.4, 0), 0, th * 0.62, tz, 1.1, 1.3, 1.1, 0xffffff);
        else { b.box(0.2, th * 0.6, 0.2, 0.6, th * 0.55, tz, 0x5a4a3a, 0, 0, 0.5); b.box(0.2, th * 0.6, 0.2, -0.6, th * 0.55, tz, 0x5a4a3a, 0, 0, -0.5); b.box(0.2, th * 0.5, 0.2, 0, th * 0.6, tz - 0.5, 0x5a4a3a, 0.5, 0, 0); }
      }
      P.belt = { m: instanced(b.build(), litMat, 6), n: 6, gap: 170, speed: 1 };
      col.setHex(BELTS[season]); for (i = 0; i < 6; i++) P.belt.m.setColorAt(i, col);
      // Round bales (summer/fall), snow-capped lumps in winter.
      b = new ctx.Builder({ jitter: 0.06, seed: 17 });
      b.cyl(0.8, 0.8, 1.4, 10, 0, 0.8, 0, 0xffffff, 0, 0, Math.PI / 2); b.cyl(0.62, 0.62, 1.42, 10, 0, 0.8, 0, 0xe0e0e0, 0, 0, Math.PI / 2);
      P.bales = { m: instanced(b.build(), litMat, 24), n: 24, gap: 42, speed: 1, show: season === 'summer' || season === 'fall' ? 0.55 : season === 'winter' ? 0.25 : 0 };
      col.setHex(season === 'winter' ? 0xf4f6fa : season === 'fall' ? 0xc8a45a : 0xd8b862); for (i = 0; i < 24; i++) P.bales.m.setColorAt(i, col);
      // Moose (the odd one, standing in a field, side-on).
      b = new ctx.Builder({ jitter: 0.05, seed: 19 });
      var mc = 0x3a2616, md = 0x2a1a0e;
      b.box(0.9, 1.0, 2.2, 0, 1.75, 0, mc); b.box(0.95, 0.5, 0.9, 0, 2.2, 0.6, md);
      for (i = 0; i < 4; i++) b.box(0.2, 1.3, 0.2, (i % 2 ? 0.28 : -0.28), 0.65, i < 2 ? 0.8 : -0.8, md);
      b.box(0.5, 0.5, 0.9, 0, 2.2, 1.4, mc, 0.5, 0, 0); b.box(0.42, 0.42, 0.45, 0, 1.9, 1.85, md, 0.3, 0, 0);
      b.box(0.14, 0.5, 0.12, 0, 1.45, 1.55, md);                                  // the bell
      for (i = -1; i <= 1; i += 2) { b.box(0.9, 0.08, 0.45, i * 0.62, 2.62, 1.3, 0xb8a078, 0, 0, i * 0.35); for (k = 0; k < 3; k++) b.box(0.08, 0.3, 0.08, i * (0.35 + k * 0.28), 2.85, 1.3 + (k - 1) * 0.12, 0xb8a078); }
      P.moose = { m: instanced(b.build(), litMat, 3), n: 2, gap: 540, speed: 1 };
      col.setHex(0xffffff);
      for (var key in P) if (P[key].m && !P[key].m.instanceColor) for (i = 0; i < P[key].m.count; i++) P[key].m.setColorAt(i, col);
      for (i = 0; i < 3; i++) { col.setHex(ELEV_COLS[i % ELEV_COLS.length]); P.elev.m.setColorAt(i, col); }
      K.propMeshes = [P.poles.m, P.elev.m, P.farm.m, P.belt.m, P.bales.m, P.moose.m];
    }

    // v0.7: the roadside abroad. Same pools (and the same scrolling) as the prairie, new shapes, new distances.
    function buildRegionProps(D, P, litMat) {
      var i, k, b, season = D.season, reg = D.region, winter = season === 'winter', RG = REGION[reg];
      function pool(bld, n, gap, extra) { return Object.assign({ m: instanced(bld.build(), litMat, n), n: n, gap: gap, speed: 1 }, extra || {}); }
      // Poles: telegraph poles (UK, Russia), concrete poles with a transformer (Japan), fence posts + wire (Australia).
      b = new ctx.Builder({ jitter: 0.04, seed: 5 });
      if (reg === 'australia') { b.box(0.12, 1.2, 0.12, 0, 0.6, 0, 0x7a5a3a); for (k = 0; k < 3; k++) b.box(0.02, 0.02, 45, 0, 0.4 + k * 0.35, -22.5, 0x8a8a8a); }
      else { b.box(0.28, 9, 0.28, 0, 4.5, 0, reg === 'japan' ? 0xa8a8a0 : 0x6a4a2e); b.box(2.4, 0.18, 0.18, 0, 8.4, 0, 0x5a3e26); if (reg === 'japan') b.cyl(0.35, 0.35, 0.8, 8, 0.4, 7.2, 0, 0x8a9098); }
      P.poles = pool(b, 12, 45);
      // Landmarks: a castle (UK & Europe), a neon tower (Japan), a windmill + water tank (Australia), an onion-dome church (Russia).
      b = new ctx.Builder({ jitter: 0.04, seed: 7 });
      if (reg === 'uk_europe') {
        b.box(16, 7, 10, 0, 3.5, 0, 0xffffff); for (i = 0; i < 7; i++) b.box(1.2, 1.2, 10.2, -7.2 + i * 2.4, 7.6, 0, 0xffffff);
        for (k = -1; k <= 1; k += 2) { b.cyl(2.4, 2.6, 12, 10, k * 8, 6, 0, 0xffffff); b.cyl(0, 2.9, 3.2, 10, k * 8, 13.6, 0, 0x5a4a44); }
        b.box(3, 4, 0.4, 0, 2, 5.1, 0x3a2a1e); b.box(0.2, 3.5, 0.1, 8, 17, 0, 0x5a5a5a); b.box(1.8, 1.1, 0.05, 8.9, 18, 0, 0xc0302a);
      } else if (reg === 'japan') {
        b.box(9, 30, 9, 0, 15, 0, 0xffffff); b.box(9.4, 0.6, 9.4, 0, 30.3, 0, 0x777777);
        for (k = 0; k < 6; k++) b.box(8.4, 0.3, 9.2, 0, 4 + k * 4.5, 0, 0x5a6070);
        b.box(0.3, 6, 0.3, 3, 33.5, 3, 0x8a8a8a); b.box(6, 22, 6, -8, 11, 2, 0xdddddd);
      } else if (reg === 'australia') {
        b.box(0.3, 12, 0.3, 0, 6, 0, 0x8a8a8a); for (k = 0; k < 8; k++) b.box(0.4, 3.4, 0.08, 0, 12, 0.3, 0xd8d8d0, 0, 0, k * Math.PI / 4); b.box(0.4, 0.6, 3, 0, 12, -1.6, 0xc0c0b8);
        b.cyl(3, 3, 4, 12, 7, 3.5, 0, 0xffffff); b.box(0.4, 1.6, 0.4, 5, 0.8, 1, 0x7a5a3a); b.box(0.4, 1.6, 0.4, 9, 0.8, -1, 0x7a5a3a); b.cyl(3.1, 3.1, 0.3, 12, 7, 5.6, 0, 0x9a9a92);
      } else {
        b.box(8, 10, 8, 0, 5, 0, 0xffffff); b.cyl(2.2, 2.2, 5, 10, 0, 12.5, 0, 0xffffff);
        b.shape(new THREE.IcosahedronGeometry(2.6, 1), 0, 16.4, 0, 1, 1.25, 1, 0xd8a830); b.cyl(0, 0.9, 2.4, 8, 0, 19.6, 0, 0xd8a830); b.box(0.12, 1.6, 0.12, 0, 21.4, 0, 0xd8a830); b.box(0.8, 0.12, 0.12, 0, 21.6, 0, 0xd8a830);
        for (k = -1; k <= 1; k += 2) { b.cyl(1, 1, 5, 8, k * 3.4, 12, 3.4, 0xffffff); b.shape(new THREE.IcosahedronGeometry(1.2, 1), k * 3.4, 15.2, 3.4, 1, 1.3, 1, 0x3a6ab8); }
      }
      P.elev = pool(b, 3, 360, { lastCycle: new Int32Array(3).fill(-99999), cols: RG.elev, x0: reg === 'japan' ? 30 : 34, xr: 40 });
      // Buildings: cottages (UK), a neon shopping street (Japan: close to the road, lit signs), roadhouses (Australia), izbas (Russia).
      b = new ctx.Builder({ jitter: 0.05, seed: 11 });
      var fn = 4, fgap = 250, fx0 = 60, fxr = 90;
      if (reg === 'uk_europe') {
        b.box(8, 4.5, 5, 0, 2.25, 0, 0xf2eee2); b.quad([-4.3, 4.5, 2.8], [4.3, 4.5, 2.8], [4.3, 7.4, 0], [-4.3, 7.4, 0], 0x6a5a3a); b.quad([4.3, 4.5, -2.8], [-4.3, 4.5, -2.8], [-4.3, 7.4, 0], [4.3, 7.4, 0], 0x5a4a30);
        b.box(0.8, 2.2, 0.8, 2.5, 7.8, 0, 0x8a4a3a); b.box(1, 2, 0.1, 0, 1, 2.55, 0x2a4a6a); b.box(22, 1.2, 0.8, 0, 0.6, 7, 0x8a8478);
      } else if (reg === 'japan') {
        fn = 10; fgap = 60; fx0 = 14; fxr = 8;
        for (k = 0; k < 3; k++) { var hh = 8 + k * 3; b.box(9.6, hh, 8, -k * 10, hh / 2, 0, 0xe0dcd4 - k * 0x101010); b.box(9.8, 0.4, 8.2, -k * 10, hh, 0, 0x6a6a70); b.box(8.6, 2.4, 0.2, -k * 10, 1.2, 4.05, 0x2a2a30); }
      } else if (reg === 'australia') {
        b.box(12, 4, 8, 0, 2, 0, 0xe8e0c8); b.box(13, 0.4, 10, 0, 4.2, 1, 0x9a9a92); for (k = 0; k < 3; k++) b.box(0.3, 4, 0.3, -5 + k * 5, 2, 5.6, 0x7a5a3a);
        b.box(0.4, 7, 0.4, 9, 3.5, 4, 0x8a8a8a); b.box(5, 2.2, 0.3, 9, 7.5, 4, 0xd83a2a); b.box(1, 2, 1, -3, 1, 8, 0xc0c0b8); b.box(1, 2, 1, 3, 1, 8, 0xc0c0b8);
        fx0 = 30; fxr = 60;
      } else {
        b.box(7, 3.6, 6, 0, 1.8, 0, 0x7a5232); for (k = 0; k < 6; k++) b.box(7.1, 0.12, 6.1, 0, 0.3 + k * 0.6, 0, 0x5a3a22);
        b.quad([-3.8, 3.6, 3.3], [3.8, 3.6, 3.3], [3.8, 6, 0], [-3.8, 6, 0], winter ? 0xf0f4fa : 0x5a4a3a); b.quad([3.8, 3.6, -3.3], [-3.8, 3.6, -3.3], [-3.8, 6, 0], [3.8, 6, 0], winter ? 0xe4e8f0 : 0x4a3a2a);
        for (k = -1; k <= 1; k += 2) { b.box(1.1, 1.1, 0.1, k * 1.8, 2, 3.05, 0x3a6ab8); b.box(0.8, 0.8, 0.12, k * 1.8, 2, 3.07, 0xe8e0a0); }
        b.box(0.5, 1.6, 0.5, 2, 6.2, 0, 0x6a5a4a);
      }
      P.farm = pool(b, fn, fgap, { x0: fx0, xr: fxr });
      if (reg === 'japan') {                                                   // neon: vertical signs + shopfront strips (unlit, always on)
        var NE = [0xff3a8a, 0x3af0ff, 0xffe23a, 0x8a5aff, 0x5aff8a, 0xff7a2a], lb = new ctx.Builder({ jitter: 0 });
        for (k = 0; k < 3; k++) { var hk = 8 + k * 3; lb.box(1.2, hk * 0.55, 0.4, -k * 10 + 3.6, hk * 0.5, 4.4, NE[k * 2 % 6]); lb.box(8.4, 0.5, 0.25, -k * 10, 2.9, 4.3, NE[(k * 2 + 1) % 6]); lb.box(2.6, 0.9, 0.2, -k * 10 - 2, hk - 1.6, 4.2, NE[(k + 4) % 6]); }
        K.farmLights = instanced(lb.build(), ctx.mats.unlit, fn);
      } else if (D.night && reg !== 'australia') {
        var lw = new ctx.Builder({ jitter: 0 }); lw.box(1.2, 1, 0.2, 0, 2, reg === 'uk_europe' ? 2.6 : 3.1, 0xffd070); K.farmLights = instanced(lw.build(), ctx.mats.unlit, fn);
      }
      // Rows: hedgerows (UK), blossom / maple trees (Japan), gum trees (Australia), birch forest (Russia).
      b = new ctx.Builder({ jitter: 0.1, seed: 13 });
      var bcol = BELTS[season], bn = 6, bgap = 170;
      if (reg === 'uk_europe') { for (i = 0; i < 12; i++) b.shape(new THREE.IcosahedronGeometry(1.4, 0), 0, 1.1, -i * 2.4, 1.2, 1, 1.4, 0xffffff); bcol = winter ? 0x4a5a3a : 0x3f6e2e; bn = 8; bgap = 110; }
      else if (reg === 'japan') { for (i = 0; i < 6; i++) { b.box(0.4, 2.4, 0.4, 0, 1.2, -i * 7, 0x4a3226); b.shape(new THREE.IcosahedronGeometry(2.2, 0), 0, 3.6, -i * 7, 1.3, 0.9, 1.3, 0xffffff); } bcol = season === 'spring' ? 0xf4b8cc : season === 'fall' ? 0xd8502a : winter ? 0xe8ecf2 : 0x4a8a3a; }
      else if (reg === 'australia') { for (i = 0; i < 4; i++) { b.box(0.4, 5, 0.4, 0, 2.5, -i * 16, 0xe8e0d0, 0, 0, 0.1); b.shape(new THREE.IcosahedronGeometry(2.6, 0), 0.5, 5.8, -i * 16, 1.4, 0.7, 1.2, 0xffffff); } bcol = 0x7a8a6a; }
      else {
        for (i = 0; i < 20; i++) { var bz = -i * 2.6, bh = 7 + hash01(i, 4) * 4, bx = (hash01(i, 5) - 0.5) * 3;
          b.box(0.28, bh, 0.28, bx, bh / 2, bz, 0xf2f0ea); b.box(0.3, 0.2, 0.3, bx, bh * 0.3, bz, 0x1a1a1a); b.box(0.3, 0.14, 0.3, bx, bh * 0.62, bz, 0x1a1a1a);
          if (!winter) b.shape(new THREE.IcosahedronGeometry(1.3, 0), bx, bh * 0.85, bz, 0.9, 1.4, 0.9, 0xffffff); else b.box(0.9, 0.2, 0.9, bx, bh, bz, 0xf4f6fa); }
        bcol = season === 'fall' ? 0xe0b030 : 0x6a9a3a; bn = 8; bgap = 90;
      }
      P.belt = pool(b, bn, bgap, { x0: reg === 'russia' ? 16 : 22, xr: reg === 'russia' ? 40 : 70 });
      col.setHex(bcol); for (i = 0; i < bn; i++) P.belt.m.setColorAt(i, col);
      // Small things: sheep (UK), vending machines (Japan), termite mounds (Australia), snow drifts / haystacks (Russia).
      b = new ctx.Builder({ jitter: 0.06, seed: 17 });
      var show = 0.5, scol = 0xffffff;
      if (reg === 'uk_europe') { b.box(1.1, 0.7, 0.7, 0, 0.75, 0, 0xffffff); b.box(0.35, 0.4, 0.3, 0.7, 0.95, 0, 0x2a2a2a); for (k = 0; k < 4; k++) b.box(0.12, 0.45, 0.12, k < 2 ? 0.35 : -0.35, 0.22, k % 2 ? 0.2 : -0.2, 0x2a2a2a); scol = 0xf4f2ea; show = 0.6; }
      else if (reg === 'japan') { b.box(1, 1.9, 0.8, 0, 0.95, 0, 0xffffff); b.box(0.8, 1.1, 0.05, 0, 1.2, 0.42, 0xd8e8f0); scol = 0xd83a3a; show = 0.35; }
      else if (reg === 'australia') { b.cyl(0.2, 0.9, 2.6, 8, 0, 1.3, 0, 0xffffff); b.cyl(0.15, 0.5, 1.4, 6, 0.7, 0.7, 0.3, 0xffffff); scol = 0xb85a2a; show = 0.55; }
      else { b.shape(new THREE.IcosahedronGeometry(1, 0), 0, 0.4, 0, 1.6, 0.6, 1.2, 0xffffff); scol = winter ? 0xf4f6fa : 0xc8a45a; show = 0.35; }
      P.bales = pool(b, 24, 42, { show: show, x0: reg === 'japan' ? 7.6 : 12, xr: reg === 'japan' ? 1 : 50, face: reg === 'japan' });
      col.setHex(scol); for (i = 0; i < 24; i++) P.bales.m.setColorAt(i, col);
      // The animal: a kangaroo (Australia), a brown bear (Russia); none in the UK or Japan (the pool stays empty).
      b = new ctx.Builder({ jitter: 0.05, seed: 19 });
      if (reg === 'australia') { var kc = 0xa8683a; b.box(0.6, 1.1, 0.7, 0, 1.2, 0, kc, -0.35, 0, 0); b.box(0.35, 0.4, 0.5, 0, 1.95, 0.35, kc); b.box(0.1, 0.3, 0.08, 0.1, 2.25, 0.25, kc); b.box(0.1, 0.3, 0.08, -0.1, 2.25, 0.25, kc);
        b.box(0.3, 0.7, 0.9, 0, 0.35, 0.1, kc); b.box(0.2, 0.18, 1.4, 0, 0.45, -0.95, kc, 0.3, 0, 0); b.box(0.12, 0.4, 0.12, 0.15, 1.2, 0.45, kc, 0.8, 0, 0); b.box(0.12, 0.4, 0.12, -0.15, 1.2, 0.45, kc, 0.8, 0, 0); }
      else if (reg === 'russia') { var bc = 0x4a2e1a; b.box(1.1, 1.1, 2, 0, 1.2, 0, bc); b.box(0.7, 0.7, 0.7, 0, 1.6, 1.2, bc); b.box(0.35, 0.3, 0.3, 0, 1.45, 1.6, 0x3a2412);
        b.box(0.18, 0.18, 0.1, 0.25, 2.0, 1.1, bc); b.box(0.18, 0.18, 0.1, -0.25, 2.0, 1.1, bc); for (k = 0; k < 4; k++) b.box(0.3, 0.8, 0.3, k % 2 ? 0.35 : -0.35, 0.4, k < 2 ? 0.7 : -0.7, bc); }
      else b.box(0.01, 0.01, 0.01, 0, -5, 0, 0x000000);
      P.moose = pool(b, 3, 540, { n: 2, show: reg === 'australia' ? 0.7 : reg === 'russia' ? 0.3 : 0 });
      col.setHex(0xffffff);
      for (var key in P) if (P[key].m && !P[key].m.instanceColor) for (i = 0; i < P[key].m.count; i++) P[key].m.setColorAt(i, col);
      for (i = 0; i < 3; i++) { col.setHex(RG.elev[i % RG.elev.length]); P.elev.m.setColorAt(i, col); }
      K.propMeshes = [P.poles.m, P.elev.m, P.farm.m, P.belt.m, P.bales.m, P.moose.m];
    }

    // A green highway sign that counts down to the destination.
    function buildSign(D) {
      var c = document.createElement('canvas'); c.width = 256; c.height = 128;
      var tex = new THREE.CanvasTexture(c); K.texs.push(tex);
      K.sign = { c: c, tex: tex, g: c.getContext('2d') };
      var mat = ownMat(new THREE.MeshLambertMaterial({ map: tex, emissive: D.night ? 0x1a2a1a : 0x000000 }));
      var board = mesh(new THREE.PlaneGeometry(4.2, 2.1), mat);
      var pb = new ctx.Builder({ jitter: 0 });
      pb.box(0.14, 3.2, 0.14, -1.4, -2.6, -0.05, 0x9aa0a8); pb.box(0.14, 3.2, 0.14, 1.4, -2.6, -0.05, 0x9aa0a8); pb.box(4.3, 2.2, 0.06, 0, 0, -0.06, 0x2a5a3a);
      mesh(pb.build(), K.litMat, board);
      board.rotation.y = -0.35;
      K.sign.m = board;
      drawSign(D, D.km);
    }
    function drawSign(D, km) {
      var g = K.sign.g, name = String(D.to || '').toUpperCase(), size = 44;
      g.fillStyle = '#1f6a3c'; g.fillRect(0, 0, 256, 128);
      g.strokeStyle = '#f2f2ea'; g.lineWidth = 4; g.strokeRect(6, 6, 244, 116);
      g.fillStyle = '#f2f2ea'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '800 ' + size + 'px system-ui, Arial, sans-serif';
      while (g.measureText(name).width > 226 && size > 18) { size -= 2; g.font = '800 ' + size + 'px system-ui, Arial, sans-serif'; }
      g.fillText(name, 128, 44);
      g.font = '800 40px system-ui, Arial, sans-serif'; g.fillText(Math.max(1, Math.round(km)) + ' km', 128, 94);
      K.sign.tex.needsUpdate = true;
    }

    // The destination's skyline: rises on the horizon over the last part of the drive.
    function buildSkyline(D) {
      var b = new ctx.Builder({ jitter: 0.08, seed: 23 }), base = D.night ? 0x0c1022 : sh(K.sky.hor, 0.72), win = 0xffd890, i;
      for (i = 0; i < 16; i++) {
        var x = -70 + i * 9 + hash01(i, 1) * 5, h = 8 + hash01(i, 2) * (i > 5 && i < 11 ? 42 : 18), w = 5 + hash01(i, 3) * 5;
        b.box(w, h, 5, x, h / 2, 0, base);
        if (D.night) for (var k = 0; k < 6; k++) b.box(0.9, 0.9, 0.2, x + (hash01(i * 7 + k, 4) - 0.5) * (w - 1), 2 + hash01(i * 7 + k, 5) * (h - 3), 2.6, win);
      }
      b.box(8, 22, 8, 95, 11, 0, base); b.box(3, 5, 3, 95, 24.5, 0, base);            // an elevator on the edge of town
      b.cyl(4, 4, 5, 10, -95, 18, 0, base); b.box(0.8, 16, 0.8, -95, 8, 0, base);      // water tower
      var m = mesh(b.build(), ownMat(new THREE.MeshBasicMaterial({ vertexColors: true, fog: false })));
      m.position.set(0, 0, -520); m.scale.set(1, 0.001, 1); m.visible = false;
      K.skyline = m;
    }

    // ---- Weather: snow (+ ground drift), rain streaks, fall leaves; glass drops/splats; wipers -----------------
    function buildWeather(D) {
      var dflt = D.season === 'winter' ? 'snow' : D.season === 'spring' ? 'rain' : D.season === 'fall' ? 'leaves' : 'bugs';
      // v0.6.1: the week's weather picks the windshield (clear keeps the season's look: fireflies/bugs, leaves, light snow)
      var wx = D.weather, kind = !wx ? dflt : wx === 'rain' ? 'rain' : wx === 'snow' || wx === 'blizzard' || wx === 'hail' ? 'snow' : wx === 'heat' ? 'bugs' : dflt === 'rain' ? 'bugs' : dflt;
      var W = K.weather = { kind: kind, id: wx || null, heavy: wx === 'blizzard', hail: wx === 'hail', light: wx === 'clear' && kind === 'snow', n: 0 }, i;
      if (W.kind === 'snow' || W.kind === 'leaves') {
        var n = W.kind === 'snow' ? (W.light ? 160 : W.hail ? 300 : 520) : 140, pos = new Float32Array(n * 3), cols = new Float32Array(n * 3);
        for (i = 0; i < n; i++) {
          respawn(pos, i, true, W.kind);
          col.setHex(W.kind === 'snow' ? (W.hail ? 0xdfeaf6 : 0xffffff) : [0xd8702a, 0xe8b030, 0xb8401e, 0xc89a2a][i % 4]);
          cols[i * 3] = col.r; cols[i * 3 + 1] = col.g; cols[i * 3 + 2] = col.b;
        }
        var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
        g.attributes.position.setUsage(THREE.DynamicDrawUsage);
        var pm = ownMat(new THREE.PointsMaterial({ size: W.kind === 'snow' ? (W.hail ? 0.2 : W.heavy ? 0.16 : 0.13) : 0.3, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false }));
        W.points = new THREE.Points(g, pm); W.points.frustumCulled = false; K.root.add(track(W.points)); W.n = n; W.pos = pos;
      } else if (W.kind === 'rain') {
        var nr = 260, rp = new Float32Array(nr * 6);
        for (i = 0; i < nr; i++) respawnRain(rp, i, true);
        var rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(rp, 3)); rg.attributes.position.setUsage(THREE.DynamicDrawUsage);
        W.lines = new THREE.LineSegments(rg, ownMat(new THREE.LineBasicMaterial({ color: 0xc8d4e4, transparent: true, opacity: 0.5, depthWrite: false })));
        W.lines.frustumCulled = false; K.root.add(track(W.lines)); W.n = nr; W.pos = rp;
      }
      if (W.kind === 'snow') {                                                    // snow snakes blowing across the road
        var dm = ownMat(new THREE.MeshBasicMaterial({ map: ctx.radialTexture('soft'), color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }));
        var dg = new THREE.PlaneGeometry(1, 1); dg.rotateX(-Math.PI / 2);
        W.drift = instanced(dg, dm, 18);
        W.dx = new Float32Array(18); W.dz = new Float32Array(18);
        for (i = 0; i < 18; i++) { W.dx[i] = (hash01(i, 31) - 0.5) * 16; W.dz[i] = -hash01(i, 32) * 120; }
      }
    }
    function respawn(pos, i, anyZ, kind) {
      var j = i * 3, r = hash01(i + Math.floor(S.t * 7), 41);
      pos[j] = (hash01(i, 42 + Math.floor(S.t)) - 0.5) * (kind === 'leaves' ? 26 : 22);
      pos[j + 1] = kind === 'leaves' ? 0.3 + r * 3 : 0.3 + r * 9;
      pos[j + 2] = anyZ ? -3 - hash01(i, 43) * 70 : -70 - r * 8;
    }
    function respawnRain(p, i, anyZ) {
      var j = i * 6, x = (hash01(i, 51 + Math.floor(S.t)) - 0.5) * 20, y = 1 + hash01(i, 52 + Math.floor(S.t * 3)) * 9, z = anyZ ? -3 - hash01(i, 53) * 60 : -60 - hash01(i, 54) * 6;
      p[j] = x; p[j + 1] = y; p[j + 2] = z; p[j + 3] = x + 0.02; p[j + 4] = y - 0.9; p[j + 5] = z + 0.7;
    }

    // ---- The Moose Hearse's interior (one lit mesh, one glowing mesh) + moving bits -------------------------
    var WS = { y0: 0.9, z0: -1.4, y1: 1.86, z1: -0.9 };                         // windshield bottom/top edges
    function buildInterior(D) {
      var night = D.night, dim = night ? 0.5 : 0.55;
      var im = ownMat(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, color: new THREE.Color(dim, dim, dim * 1.02) }));
      K.inMat = im;
      var b = new ctx.Builder({ jitter: 0.05, seed: 29 }), gl = new ctx.Builder({ jitter: 0, seed: 2 }), i, s;
      var liner = LINERS[D.look] || 0xe6dac0, trim = 0x55565e, dash = 0x2e2f35, fabric = D.look === 'bus' ? 0x8a2a2a : 0x4f5a72, paint = D.look ? 0xe8e8e4 : 0x7a2a2a, rust = D.look ? 0xc8c8c0 : 0x9a5a2a;   // v0.7: rentals
      var VT = D.tier ? VTIER[D.tier] : null, RY = VT ? VT.roof : 1.94, dy = RY - 1.94;   // v0.8: the band's vehicle tier (roof height, palette)
      if (VT) { liner = VT.liner; trim = VT.trim; dash = VT.dash; fabric = VT.fabric; paint = VT.paint; rust = VT.rust; }
      // v0.9: the tier-0 vehicle is each band's own (content vanNames: the Moose Hearse / The Pothole / The Mullet Wagon /
      // Grandpa's Suburban): its paint, its hood ornament, its bobblehead, its clutter (tier0Ornaments below).
      var T0 = !VT && !D.look ? (VAN0[D.bandId] || VAN0.hail_damage) : null;
      if (T0) { paint = T0.paint; rust = T0.rust; }
      K.ornaments = T0 ? T0.list.slice() : null;
      // Roof, pillars, doors
      b.box(2.0, 0.06, VT ? 4.6 : 3.4, 0, RY, VT ? 1.15 : 0.55, liner); b.box(1.9, 0.02, 0.1, 0, 1.905 + dy, -0.3, sh(liner, 0.85)); b.box(1.9, 0.02, 0.1, 0, 1.905 + dy, 0.3, sh(liner, 0.85));
      gl.box(0.22, 0.03, 0.1, 0, 1.905 + dy, 0.15, night ? 0x3a3020 : 0xf6ead0);
      b.box(1.1, 0.012, 0.5, 0, 1.905 + dy, -0.45, 0x2a2a30); b.box(0.9, 0.013, 0.36, 0, 1.906 + dy, -0.45, 0xc0392b);           // a band poster on the ceiling
      b.box(0.5, 0.014, 0.08, 0, 1.907 + dy, -0.52, 0xf2e6c0); b.box(0.3, 0.014, 0.05, 0, 1.907 + dy, -0.4, 0xf2e6c0);                       // dome light (off at night, obviously)
      for (s = -1; s <= 1; s += 2) {
        b.push(s * 0.9, 0, 0, 0, 0, 0);
        b.box(0.1, 0.95, 3.6, 0, 0.475, 0.45, trim);
        b.box(0.06, 0.06, 3.6, -s * 0.03, 0.95, 0.45, sh(trim, 1.2));
        b.box(0.12, 1.0, 0.16, 0, 1.42, 0.05, trim); b.box(0.12, 1.0, 0.22, 0, 1.42, 1.2, trim);
        b.pop();
        // A-pillar
        b.push(s * 0.88, (WS.y0 + WS.y1) / 2, (WS.z0 + WS.z1) / 2, Math.atan2(WS.z1 - WS.z0, WS.y1 - WS.y0), 0, 0);
        b.box(0.14, 0.95, 0.12, 0, 0, 0, trim); b.pop();
        b.box(0.22, 0.14, 0.08, s * 1.08, 1.08, -1.22, 0x222226); b.box(0.2, 0.12, 0.02, s * 1.08, 1.08, -1.175, 0x8aa0b8); // side mirrors
        b.box(0.5, 0.02, 0.26, s * 0.42, 1.87, -0.8, 0x9a8e74, -0.25, 0, 0);                   // sun visors
      }
      b.box(1.9, 0.07, 0.14, 0, WS.y1 + 0.03, WS.z1, trim);                                       // header
      // v0.8 SPACES review: the headliner is not one flat slab: an overhead console with two map lights between the visors,
      // a CD wallet strapped to the driver's visor, a set list tucked in the other one, headliner seams, and (in the minivan)
      // the saggy bit held up with thumbtacks.
      if (!D.look && (D.tier || 0) < 3) {                                                       // (the band's own vehicles; the bus + rentals as they were)
        b.box(0.34, 0.06, 0.3, 0, RY - 0.06, -0.74, sh(trim, 0.8)); b.box(0.3, 0.012, 0.26, 0, RY - 0.095, -0.74, sh(trim, 1.15));
        for (i = -1; i <= 1; i += 2) gl.box(0.07, 0.008, 0.05, i * 0.08, RY - 0.103, -0.7, night ? 0x3a3020 : 0xf6e2b0);
        gl.box(0.03, 0.006, 0.02, 0, RY - 0.103, -0.82, 0x6ad0ff);
        b.push(-0.42, 1.87, -0.8, -0.25, 0, 0);                                                   // the driver's visor: a CD wallet
        b.box(0.26, 0.016, 0.16, 0.02, -0.018, 0.0, 0x1e1e22);
        for (i = 0; i < 5; i++) b.box(0.012, 0.012, 0.13, -0.08 + i * 0.035, -0.03, 0.03, [0xd8b030, 0xc0392b, 0xf2efe6, 0x2f6fd1, 0x6fe39a][i]);
        b.box(0.26, 0.02, 0.025, 0.02, -0.028, -0.06, 0x2a2a30);
        b.pop();
        b.push(0.42, 1.87, -0.8, -0.25, 0, 0);                                                    // the other visor: tonight's set list
        b.box(0.2, 0.006, 0.24, -0.06, -0.016, 0.06, 0xf2efe6, 0, 0.12, 0);
        for (i = 0; i < 6; i++) b.box(0.12 - (i % 3) * 0.025, 0.004, 0.012, -0.08, -0.021, -0.02 + i * 0.03, 0x2a2a2a, 0, 0.12, 0);
        b.pop();
        for (i = 0; i < 3; i++) b.box(1.86, 0.012, 0.03, 0, RY - 0.036, 0.1 + i * 0.4, sh(liner, 0.78));             // headliner seams
        if (!VT && !D.look) {
          b.box(0.62, 0.05, 0.46, -0.3, 1.9, 0.5, sh(liner, 0.92), 0.06, 0, 0.05);                  // the sag
          for (i = 0; i < 4; i++) b.cyl(0.014, 0.014, 0.012, 6, -0.56 + (i % 2) * 0.5, 1.922 - (i > 1 ? 0.01 : 0), 0.3 + (i > 1 ? 0.42 : 0), [0xd23c3c, 0x2f6fd1, 0xe8c531, 0x34c759][i]);
        }
      }
      // Dashboard
      b.box(1.86, 0.1, 0.46, 0, WS.y0 - 0.03, WS.z0 + 0.2, dash);
      b.box(1.86, 0.36, 0.08, 0, WS.y0 - 0.23, WS.z0 + 0.42, sh(dash, 1.1));
      b.box(0.44, 0.1, 0.22, -0.47, WS.y0 + 0.04, WS.z0 + 0.36, sh(dash, 0.8));                   // gauge hood
      b.box(0.3, 0.34, 0.06, 0.02, 0.62, WS.z0 + 0.46, sh(dash, 0.9));                           // centre stack
      gl.box(0.16, 0.035, 0.012, 0.02, 0.72, WS.z0 + 0.494, night ? 0x4ac8ff : 0x6a9a7a);
      for (i = 0; i < 2; i++) gl.cyl(0.045, 0.045, 0.01, 10, -0.5 + i * 0.16, WS.y0 - 0.05, WS.z0 + 0.47, night ? 0x7ad0ff : 0xd8dcd0, Math.PI / 2, 0, 0);
      b.box(0.4, 0.2, 0.05, 0.5, 0.72, WS.z0 + 0.46, sh(dash, 1.2));                             // glovebox
      b.box(0.14, 0.08, 0.02, 0.5, 0.74, WS.z0 + 0.49, T0 ? T0.sticker : 0xe8d8a8, 0, 0, 0.2);   // a "Moose Hearse" sticker (v0.9: the band's van's)
      b.box(0.3, 0.05, 0.2, -0.7, WS.y0 + 0.02, WS.z0 + 0.15, 0xd8c050, 0, 0.3, 0);              // chip bag on the dash
      // Moose bobblehead: base + body (head bobs separately)
      var bx = 0.3, bz = WS.z0 + 0.18, by = WS.y0 + 0.02;
      b.cyl(0.05, 0.055, 0.03, 8, bx, by + 0.015, bz, 0x2a2a2a); b.box(0.06, 0.07, 0.12, bx, by + 0.08, bz, 0x5a3a1e);
      for (i = 0; i < 4; i++) b.box(0.018, 0.05, 0.018, bx + (i % 2 ? 0.02 : -0.02), by + 0.04, bz + (i < 2 ? 0.04 : -0.04), 0x3a2410);
      // Steering column, console, coffee
      b.box(0.08, 0.08, 0.34, -0.47, 0.86, WS.z0 + 0.58, 0x1e1e22, -0.5, 0, 0);
      b.box(0.34, 0.3, 0.5, 0, 0.3, -0.35, sh(dash, 1.1));
      b.cyl(0.04, 0.03, 0.12, 8, -0.06, 0.51, -0.5, 0xc0302a); b.cyl(0.042, 0.042, 0.02, 8, -0.06, 0.575, -0.5, 0xf2f2f2);
      b.cyl(0.04, 0.03, 0.12, 8, 0.07, 0.51, -0.42, 0xc0302a); b.cyl(0.042, 0.042, 0.02, 8, 0.07, 0.575, -0.42, 0xf2f2f2);
      // Seats: front buckets (no headrests: it's that old), middle bench, duct tape. v0.8 polish: the seat backs you stare at
      // the whole drive have their detail (a rolled top, seams, a map pocket with a road map / ketchup chips), the console
      // has cup holders, the bench cushion has its belts and a set list; the 15-passenger's church bench and the sprinter's
      // captain chairs are their own (buildTier).
      for (s = -1; s <= 1; s += 2) {
        var FS = !VT && !D.look ? s * 0.45 : s * 0.48;                                        // (the minivan's buckets a touch inboard: their headrests show)
        b.box(0.56, 0.62, 0.12, FS, 0.77, -0.2, fabric, 0.12, 0, 0);
        b.box(0.56, 0.12, 0.5, FS, SEAT_Y - 0.06, -0.45, fabric);
        b.box(0.2, 0.2, 0.01, FS + 0.1, 0.9, -0.12, 0xb8bcc2, 0.12, 0, 0.3);
        seatBack(b, FS, 0.77, -0.2, 0.12, 0.56, 0.62, 0.06, fabric, s, null);   // (v0.8 SPACES review: no hoodie: it read as the driver's torso)
      }
      b.cyl(0.05, 0.05, 0.02, 10, -0.06, 0.452, -0.5, 0x121214); b.cyl(0.05, 0.05, 0.02, 10, 0.07, 0.452, -0.42, 0x121214);   // cup holders
      b.box(0.3, 0.012, 0.18, 0, 0.456, -0.22, sh(dash, 0.8)); b.box(0.12, 0.02, 0.07, -0.05, 0.47, -0.24, 0x2a2a2e);      // the console lid, somebody's phone
      if (!VT) {
        b.box(1.72, 0.66, 0.14, 0, 0.74, 0.98, sh(fabric, 0.9), 0.1, 0, 0); b.box(1.72, 0.12, 0.52, 0, SEAT_Y - 0.06, 0.66, sh(fabric, 0.9));
        for (s = -1; s <= 1; s += 2) { b.box(0.05, 0.02, 0.1, s * 0.22, SEAT_Y + 0.01, 0.9, 0x1e1e22); b.box(0.04, 0.012, 0.05, s * 0.22, SEAT_Y + 0.02, 0.84, 0xb8bcc2); }   // belt buckles
        b.box(0.2, 0.004, 0.27, -0.5, SEAT_Y + 0.002, 0.62, 0xf2efe6, 0, 0.25, 0);                                             // the set list
        for (i = 0; i < 6; i++) b.box(0.12 - (i % 3) * 0.02, 0.005, 0.012, -0.5 - 0.02 * i + 0.03, SEAT_Y + 0.004, 0.53 + i * 0.035, 0x3a3a3a, 0, 0.25, 0);
      } else if (VT.bench) b.box(1.72, 0.12, 0.52, 0, SEAT_Y - 0.06, 0.66, sh(fabric, 0.9));
      
      b.box(1.9, 0.9, 0.06, 0, 0.45, WS.z0 + 0.3, 0x1a1a1e);                                      // firewall                        // Dana's guitar case, wedged in
      if (!VT) {   // v0.8: bigger vehicles pack the gear further back (behind the camera)
        b.box(0.44, 0.3, 0.36, 0.55, 0.15, 1.2, 0xc8a870); b.box(0.46, 0.02, 0.2, 0.55, 0.31, 1.2, 0x2a2a2a);   // merch box
        // v0.6.1: gear and merch piled behind the back row (amp cases, the kick drum case, T-shirt boxes)
        b.box(0.62, 0.5, 0.4, -0.45, 0.25, 1.55, 0x1e1e22); b.box(0.5, 0.36, 0.36, -0.4, 0.68, 1.55, 0x26262c); b.cyl(0.3, 0.3, 0.3, 12, 0.35, 0.3, 1.6, 0x3a2a2a, Math.PI / 2, 0, 0);
        b.box(0.4, 0.26, 0.3, 0.45, 0.6, 1.6, 0xc8a870); b.box(0.36, 0.22, 0.3, 0.1, 0.7, 1.65, 0xd8b880);
      }
      if (!VT || VT.bench) b.box(0.26, 0.2, 0.2, 0.02, 0.56, 0.74, 0xc8a870, 0, 0.2, 0);                                // one merch box rides on the bench
      if (!VT && !D.look) {                                                                     // v0.8 SPACES review: somebody's backpack on the floor
        var bench = !!(T0 && T0.bobble === 'cow');   // v0.9: Grandpa's Suburban's front bench fills the middle; no backpack poking through it
        if (!bench) {
          b.push(0.04, 0.45, -0.24, -0.3, 0.25, 0);                                             // (slumped on the console lid, between the seats)
          b.box(0.22, 0.26, 0.13, 0, 0.13, 0, 0x2a3c5e); b.box(0.18, 0.11, 0.045, 0, 0.08, 0.08, 0x22314e);
          b.box(0.2, 0.01, 0.01, 0, 0.245, 0.067, 0xb8bcc2); b.box(0.14, 0.008, 0.01, 0, 0.135, 0.104, 0xb8bcc2);          // zips
          b.box(0.07, 0.07, 0.006, 0.05, 0.2, 0.068, 0xd23c3c); b.box(0.035, 0.035, 0.008, 0.05, 0.2, 0.071, 0xf2efe6);    // a patch
          b.box(0.035, 0.2, 0.02, -0.07, 0.14, -0.075, 0x1a2436, 0.2); b.box(0.035, 0.2, 0.02, 0.07, 0.14, -0.075, 0x1a2436, 0.2);   // straps
          b.box(0.07, 0.02, 0.035, 0, 0.27, -0.015, 0x1a2436);
          b.pop();
        }
        b.box(0.16, 0.2, 0.05, -0.2, 0.62, 0.55, 0xd8302a, -0.3, 0.4, 0); b.box(0.08, 0.04, 0.052, -0.2, 0.65, 0.55, 0xf2d15b, -0.3, 0.4, 0);   // ketchup chips on the bench
      }
      if (D.look === 'sardine') {                                   // v0.7: the tiny European van: gear to the roof, laps full
        b.box(1.7, 0.5, 0.45, 0, 1.25, 1.85, 0x1e1e22); b.box(1.5, 0.35, 0.4, 0.05, 1.68, 1.85, 0x2a2a30); b.box(0.9, 0.18, 0.3, -0.3, 1.9, 1.75, 0xc8a870);
        b.box(1.5, 0.12, 0.3, 0, 0.72, 0.5, 0x3a2a1e, 0, 0.15, 0); b.box(1.4, 0.1, 0.26, 0, 0.84, 0.46, 0x5a3a22, 0, -0.1, 0);   // guitar cases across the laps
        b.cyl(0.2, 0.2, 0.18, 10, 0.5, 0.72, -0.28, 0x8a2a2a, Math.PI / 2, 0, 0); b.box(0.3, 0.3, 0.3, -0.05, 0.42, -0.62, 0x26262c);   // a snare on your lap, an amp between the seats
      }
      buildDash(b, D.dashboard);
      b.box(2.0, 0.05, 3.8, 0, 0, 0.4, 0x2a2826);                                                 // floor
      // The hood (rust included) and the plastic antlers zip-tied to the front.
      b.push(0, WS.y0 - 0.04, WS.z0 - 0.5, 0.14, 0, 0);
      b.box(1.95, 0.08, 1.05, 0, 0, 0, paint);
      b.box(0.3, 0.012, 0.2, -0.5, 0.045, 0.2, rust); b.box(0.18, 0.012, 0.3, 0.6, 0.045, -0.2, rust); b.box(0.12, 0.012, 0.1, 0.1, 0.045, -0.35, rust);
      b.box(1.9, 0.02, 0.02, 0, 0.05, 0.1, sh(paint, 0.8));
      if (!T0 || T0.hood === 'antlers') for (i = -1; i <= 1; i += 2) { b.box(0.05, 0.22, 0.05, i * 0.1, 0.13, -0.45, 0xd8c8a0, 0, 0, i * 0.4); b.box(0.2, 0.04, 0.05, i * 0.2, 0.25, -0.45, 0xd8c8a0, 0, 0, i * 0.3); }
      else if (T0.hood === 'tape') { b.box(0.5, 0.012, 0.06, -0.2, 0.05, 0.0, 0xb9bdc4, 0, 0.6, 0); b.box(0.5, 0.012, 0.06, -0.2, 0.05, 0.0, 0xb9bdc4, 0, -0.6, 0); }   // duct-tape X over a dent
      else if (T0.hood === 'scoop') { b.box(0.5, 0.08, 0.4, 0, 0.07, -0.1, sh(paint, 0.8)); b.box(0.44, 0.04, 0.02, 0, 0.09, -0.3, 0x141414); }                        // a hood scoop (it's 1985)
      else if (T0.hood === 'guard') { for (i = -1; i <= 1; i += 2) b.box(0.05, 0.3, 0.05, i * 0.6, 0.12, -0.52, 0x2a2a2e); b.box(1.3, 0.05, 0.05, 0, 0.27, -0.52, 0x2a2a2e); b.box(0.012, 0.9, 0.012, 0.85, 0.45, -0.3, 0x1a1a1a, 0, 0, -0.1); }   // grille guard + the CB whip
      b.pop();
      if (T0) tier0Ornaments(b, gl, T0, fabric);
      if (VT) buildTier(b, gl, D, VT, liner, trim, fabric);                                     // v0.8: 15-passenger / sprinter / tour bus
      if (!D.look) buildStickers(b, D);                                                        // v0.8: venue stickers on the hood (the bus: over the doorway)
      // Rear-view mirror: Kenji's sunglasses, the only part of his face anyone ever sees.
      b.box(0.03, 0.08, 0.03, 0.02, 1.8, WS.z1 + 0.06, 0x1e1e22);
      b.box(0.3, 0.09, 0.04, 0.02, 1.73, WS.z1 + 0.08, 0x1e1e22);
      gl.box(0.27, 0.07, 0.005, 0.02, 1.73, WS.z1 + 0.103, 0xa8b8c8);
      mesh(b.build(), im); mesh(gl.build(), ctx.mats.unlit);
      if (!D.look) logoDecal(D, dim);                                                        // v0.8.1 LOGO: the band logo windshield sticker
      // Bobble head (spring), air freshener (pendulum), steering wheel (steers).
      var hb = new ctx.Builder({ jitter: 0.04, seed: 31 }), bob = T0 ? T0.bobble : 'moose';
      if (bob === 'skull') {                                                                         // The Pothole: a punk skull, pink mohawk
        hb.box(0.08, 0.075, 0.08, 0, 0.03, 0.03, 0xf2efe6); hb.box(0.02, 0.05, 0.08, 0, 0.09, 0.03, 0xff4fa0);
        hb.box(0.02, 0.02, 0.004, 0.018, 0.04, 0.071, 0x111111); hb.box(0.02, 0.02, 0.004, -0.018, 0.04, 0.071, 0x111111);
      } else if (bob === 'rocker') {                                                                 // The Mullet Wagon: a little rocker, big blond hair
        hb.box(0.06, 0.06, 0.06, 0, 0.03, 0.03, 0xecc7a0); hb.box(0.075, 0.035, 0.07, 0, 0.07, 0.02, 0xd9b25a); hb.box(0.07, 0.07, 0.02, 0, 0.02, -0.01, 0xd9b25a);
        hb.box(0.065, 0.012, 0.004, 0, 0.045, 0.061, 0x141414);
      } else if (bob === 'cow') {                                                                    // Grandpa's Suburban: a Holstein
        hb.box(0.07, 0.065, 0.09, 0, 0.03, 0.03, 0xf2efe6); hb.box(0.03, 0.03, 0.004, 0.02, 0.04, 0.076, 0x141414); hb.box(0.05, 0.03, 0.03, 0, 0.01, 0.09, 0xe8a8a8);
        for (i = -1; i <= 1; i += 2) hb.box(0.02, 0.02, 0.02, i * 0.045, 0.075, 0.02, 0xd8c8a0);
      } else {
        hb.box(0.075, 0.07, 0.1, 0, 0.03, 0.03, 0x6a4424); hb.box(0.05, 0.045, 0.05, 0, 0.02, 0.1, 0x4a2c16);
        for (i = -1; i <= 1; i += 2) { hb.box(0.07, 0.012, 0.035, i * 0.055, 0.075, 0.02, 0xd8c8a0, 0, 0, i * 0.3); hb.box(0.012, 0.03, 0.012, i * 0.07, 0.09, 0.02, 0xd8c8a0); }
        hb.box(0.012, 0.012, 0.004, 0.018, 0.045, 0.081, 0x111111); hb.box(0.012, 0.012, 0.004, -0.018, 0.045, 0.081, 0x111111);
      }
      K.bobble = mesh(hb.build(), im); K.bobble.position.set(bx, by + 0.12, bz + 0.03);
      var fb = new ctx.Builder({ jitter: 0 });
      if (T0 && T0.fresh === 'tree') {                                                                // a pine-tree air freshener (long dead)
        fb.box(0.004, 0.06, 0.004, 0, -0.03, 0, 0xeeeeee); fb.tri([0, -0.06, 0], [-0.04, -0.16, 0], [0.04, -0.16, 0], 0x2f8a3a); fb.tri([0, -0.06, 0], [0.04, -0.16, 0], [-0.04, -0.16, 0], 0x2f8a3a);
        fb.box(0.012, 0.02, 0.004, 0, -0.17, 0, 0x6a4424);
      } else {
        fb.box(0.004, 0.07, 0.004, -0.02, -0.035, 0, 0xeeeeee, 0, 0, 0.25); fb.box(0.004, 0.1, 0.004, 0.02, -0.05, 0, 0xeeeeee, 0, 0, -0.2);   // fuzzy dice
        fb.box(0.05, 0.05, 0.05, -0.04, -0.09, 0, 0xf2f0ea, 0.3, 0.4, 0); fb.box(0.05, 0.05, 0.05, 0.045, -0.12, 0.005, 0xe86a9a, 0.5, -0.3, 0.2);
        fb.box(0.012, 0.012, 0.004, -0.04, -0.09, 0.027, 0x151515, 0.3, 0.4, 0); fb.box(0.012, 0.012, 0.004, 0.045, -0.12, 0.032, 0x151515, 0.5, -0.3, 0.2);
      }
      K.fresh = mesh(fb.build(), im); K.fresh.position.set(0.02, 1.69, WS.z1 + 0.08);
      var wb = new ctx.Builder({ jitter: 0 });
      for (i = 0; i < 14; i++) { var a = i / 14 * Math.PI * 2; wb.box(0.1, 0.03, 0.035, Math.cos(a) * 0.19, Math.sin(a) * 0.19, 0, 0x151518, 0, 0, a + Math.PI / 2); }
      wb.box(0.36, 0.03, 0.02, 0, -0.02, 0, 0x1e1e22); wb.box(0.03, 0.18, 0.02, 0, -0.1, 0, 0x1e1e22); wb.cyl(0.05, 0.05, 0.04, 8, 0, 0, 0, 0x2a2a2e, Math.PI / 2, 0, 0);
      K.wheel = mesh(wb.build(), im); K.wheel.position.set(-0.47, 0.98, WS.z0 + 0.5); K.wheel.rotation.x = -0.45;
      // Glass: rain drops / bug splats / snow crust (instanced quads lying on the windshield).
      var W = K.weather, gm = ownMat(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: W.kind === 'rain' ? 0.55 : 0.9, depthWrite: false }));
      var qg = new THREE.CircleGeometry(0.018, 6);
      K.glass = instanced(qg, gm, 40);
      K.glassT = new Float32Array(40);
      var tilt = -Math.atan2(WS.z1 - WS.z0, WS.y1 - WS.y0) + Math.PI / 2;
      K.glassTilt = tilt;
      for (i = 0; i < 40; i++) {
        col.setHex(W.kind === 'rain' ? 0xd8e4f0 : W.kind === 'snow' ? 0xf4f8ff : W.kind === 'bugs' ? [0xc8d850, 0x9ab03a, 0xe8e0a0][i % 3] : [0xd8702a, 0xc84a1e][i % 2]);
        K.glass.setColorAt(i, col); K.glassT[i] = hash01(i, 61) * 3;
      }
      // Wipers (two instances), parked unless it's raining or snowing.
      var wp = new ctx.Builder({ jitter: 0 });
      wp.box(0.5, 0.018, 0.012, 0.25, 0, 0, 0x151515); wp.box(0.52, 0.03, 0.02, 0.28, 0.012, 0.01, 0x222222);
      K.wipers = instanced(wp.build(), im, 2);
      col.setHex(0xffffff); K.wipers.setColorAt(0, col); K.wipers.setColorAt(1, col);
    }
    // v0.8 (SHOPUI): the band's vehicle tiers (C.VAN_TIERS) from the inside. 0 = the rusted minivan above; 1 = the 15-passenger
    // ex-church van (+ trailer): two bench rows ahead, hymnals in the seat pockets, ST. VLAD'S on the ceiling; 2 = the sprinter:
    // a high roof, captain seats, a touchscreen, LED strips, overhead lockers; 3 = the tour bus: the lounge (couches along
    // both sides, a table with snacks, a TV, fairy lights), the band facing each other. cam = where you sit (the camera).
    var VTIER = [null,
      { id: 'fifteen', roof: 2.02, liner: 0xd8ccb0, trim: 0x6a6a72, dash: 0x2a2b30, fabric: 0x5a6a8a, paint: 0xf2efe6, rust: 0xb8b0a0, bench: true,
        cam: { pos: [0.0, 1.64, 1.6], look: [-0.02, 1.22, -8], bandFov: 50, minHFov: 37 } },      // v0.8 polish: over the bench (SPACES review: tighter, the bench's top lip)
      { id: 'sprinter', roof: 2.32, liner: 0xd4d6d8, trim: 0x44474e, dash: 0x26282e, fabric: 0x4a4f5a, paint: 0xe8e8ea, rust: 0xd0d2d6, bench: false,
        cam: { pos: [0.0, 1.74, 1.75], look: [-0.02, 1.22, -8], bandFov: 50, minHFov: 38 } },    // over the captain chairs' headrests
      { id: 'bus', roof: 2.45, liner: 0x3a2a22, trim: 0x2a2a2e, dash: 0x1e1e22, fabric: 0x8a2a2a, paint: 0x1e1e22, rust: 0x2a2a2e, bench: false,
        cam: { pos: [0.0, 1.7, 2.7], look: [-0.02, 1.2, -8], bandFov: 60, minHFov: 50 } }];
    function buildTier(b, gl, D, VT, liner, trim, fabric) {
      var t = D.tier, RY = VT.roof, s, i, night = D.night;
      for (s = -1; s <= 1; s += 2) {                                                              // walls up to the (higher) roof
        b.box(0.06, RY - 1.9, 4.4, s * 0.95, (RY + 1.9) / 2, 1.2, liner);
        b.box(0.1, 0.95, 2.4, s * 0.9, 0.475, 2.4, trim);
      }
      b.box(1.9, RY - WS.y1 - 0.02, 0.1, 0, (RY + WS.y1) / 2, WS.z1 - 0.02, sh(liner, 0.9));       // header over the windshield
      b.box(1.9, 0.03, 4.3, 0, 0.055, 1.3, t === 3 ? 0x4a3526 : t === 2 ? 0x8a7458 : 0x2a2826);   // a longer floor (over the road)
      if (t === 2) for (i = 0; i < 9; i++) b.box(0.012, 0.004, 4.3, -0.84 + i * 0.21, 0.071, 1.3, 0x5a4a38);   // the conversion's vinyl planks
      if (t === 1) for (i = 0; i < 12; i++) b.box(1.8, 0.004, 0.03, 0, 0.071, -0.3 + i * 0.3, 0x1c1a18);       // ribbed rubber mat
      if (t === 1) {
        // The church bench (row 2): a tall vinyl back with headrest humps over the window seats; its back (what you stare at) is
        // three tuck-and-roll cushions with piping round each, a gap between them, a chrome grab rail, two belts with their
        // buckles hanging over; on the ledge a pair of sticks (crossed), a double-double and a phone.
        var BF = sh(fabric, 0.9), PIPE = sh(fabric, 1.35), GAP = sh(fabric, 0.4);
        b.push(0, 0.74, 0.98, 0.1, 0, 0);
        b.box(1.72, 0.66, 0.14, 0, 0, 0, BF);
        for (i = -1; i <= 1; i++) {
          var cx = i * 0.575;
          b.box(0.52, 0.58, 0.02, cx, -0.01, 0.076, sh(BF, 1.08));
          for (var k2 = 0; k2 < 4; k2++) b.box(0.46, 0.012, 0.006, cx, -0.2 + k2 * 0.12, 0.088, sh(BF, 0.78));                     // pleats
          b.cyl(0.013, 0.013, 0.52, 6, cx, 0.28, 0.088, PIPE, 0, 0, Math.PI / 2); b.cyl(0.013, 0.013, 0.52, 6, cx, -0.3, 0.088, PIPE, 0, 0, Math.PI / 2);   // piping
          b.cyl(0.013, 0.013, 0.58, 6, cx - 0.26, -0.01, 0.088, PIPE); b.cyl(0.013, 0.013, 0.58, 6, cx + 0.26, -0.01, 0.088, PIPE);
        }
        b.box(0.03, 0.64, 0.03, -0.2875, 0, 0.078, GAP); b.box(0.03, 0.64, 0.03, 0.2875, 0, 0.078, GAP);                          // the gaps
        for (i = -1; i <= 1; i += 2) { b.box(0.4, 0.12, 0.12, i * 0.575, 0.38, -0.01, BF); b.cyl(0.06, 0.06, 0.4, 8, i * 0.575, 0.44, -0.01, sh(BF, 1.1), 0, 0, Math.PI / 2); }   // (the middle seat gets no headrest)
        b.cyl(0.016, 0.016, 1.5, 8, 0, 0.3, 0.12, 0xc8ccd2, 0, 0, Math.PI / 2); b.box(0.03, 0.05, 0.07, -0.74, 0.3, 0.09, 0xc8ccd2); b.box(0.03, 0.05, 0.07, 0.74, 0.3, 0.09, 0xc8ccd2);
        [-0.44, 0.16].forEach(function (bx) {                                                     // two belts over the back, buckles swinging
          b.box(0.045, 0.34, 0.008, bx, 0.17, 0.1, 0x1e1e22); b.box(0.075, 0.07, 0.02, bx, -0.02, 0.105, 0xdfe3e8); b.box(0.03, 0.02, 0.022, bx, -0.01, 0.108, 0xc0302a);
        });
        for (i = -1; i <= 1; i += 2) {                                                            // the sticks, crossed, tapered, tips on
          var th = i < 0 ? -0.3 : 0.62, sx0 = i < 0 ? -0.02 : 0.06, ex = -Math.cos(th) * 0.17, ez = Math.sin(th) * 0.17;
          b.cyl(0.0035, 0.006, 0.34, 6, sx0, 0.342 + (i > 0 ? 0.008 : 0), 0.0, 0xd8b27a, 0, th, Math.PI / 2); b.box(0.011, 0.01, 0.011, sx0 + ex, 0.342 + (i > 0 ? 0.008 : 0), ez, 0xe8d0a0);
        }
        b.cyl(0.04, 0.032, 0.12, 8, 0.36, 0.39, 0.0, 0xf2efe6); b.cyl(0.042, 0.042, 0.015, 8, 0.36, 0.455, 0.0, 0xc0302a);             // a double-double,
        b.box(0.08, 0.012, 0.15, -0.3, 0.34, 0.0, 0x1e1e22, 0, 0.3, 0); b.box(0.065, 0.004, 0.12, -0.3, 0.348, 0.0, 0x4a6a8a, 0, 0.3, 0);   // a phone
        b.pop();
        b.box(0.12, 0.95, 0.32, 0.74, 0.5, 1.2, 0x2a1c14, -0.12, 0, 0.1); b.box(0.13, 0.22, 0.18, 0.74, 0.95, 1.13, 0x2a1c14, -0.12, 0, 0.1);
        for (s = -1; s <= 1; s += 2) {                                                            // seat-back pockets with hymnals
          b.box(0.5, 0.26, 0.03, s * 0.5, 0.82, 1.07, sh(fabric, 0.7), 0.1, 0, 0);
          b.box(0.16, 0.22, 0.04, s * 0.5 - 0.08, 0.92, 1.08, 0x6a1a22, 0.1, 0, 0.08); b.box(0.16, 0.22, 0.04, s * 0.5 + 0.1, 0.9, 1.085, 0x1a3a6a, 0.1, 0, -0.05);
          b.box(0.1, 0.03, 0.045, s * 0.5 - 0.08, 0.98, 1.085, 0xc9a24a, 0.1, 0, 0.08);
        }
        b.box(0.02, 0.6, 0.02, 0, 0.74, 1.06, sh(fabric, 0.6), 0.1, 0, 0);                        // the bench's seam
        b.box(0.8, 0.012, 0.16, 0, RY - 0.035, 0.6, 0xf2efe6); b.box(0.6, 0.014, 0.05, 0, RY - 0.037, 0.6, 0x3a2a70);                 // ST. VLAD'S
        for (i = -1; i <= 1; i += 2) { b.box(0.03, 0.08, 0.03, i * 0.62 - 0.08, RY - 0.07, 0.9, 0x2a2a2e); b.box(0.03, 0.08, 0.03, i * 0.62 + 0.08, RY - 0.07, 0.9, 0x2a2a2e); b.box(0.2, 0.03, 0.035, i * 0.62, RY - 0.115, 0.9, 0x3a3a40); }   // grab handles
        b.box(0.22, 0.16, 0.02, 0.02, 1.18, -1.12, 0x8aa0b8);                                    // the trailer's reflector in the mirror (squeak)
      } else if (t === 2) {
        for (s = -1; s <= 1; s += 2) {                                                            // captain chairs, an aisle between
          // v0.8 polish: side bolsters, quilted channels, a seatback pocket with a tablet, a headrest up on chrome posts,
          // fold-down armrests both sides.
          b.box(0.62, 0.14, 0.52, s * 0.55, SEAT_Y - 0.05, 0.66, fabric);
          b.push(s * 0.55, 0.78, 0.98, 0.1, 0, 0);
          b.box(0.56, 0.7, 0.14, 0, 0, 0, fabric);
          b.box(0.08, 0.66, 0.17, -0.28, 0, 0, sh(fabric, 1.25)); b.box(0.08, 0.66, 0.17, 0.28, 0, 0, sh(fabric, 1.25));
          for (i = 0; i < 4; i++) b.box(0.012, 0.56, 0.006, -0.15 + i * 0.1, -0.02, 0.073, sh(fabric, 0.62));
          b.box(0.3, 0.5, 0.01, 0, 0.02, 0.076, sh(fabric, 1.3)); for (i = 0; i < 5; i++) b.box(0.28, 0.006, 0.006, 0, -0.18 + i * 0.1, 0.083, sh(fabric, 0.8));   // the stitched centre panel
          b.box(0.4, 0.2, 0.03, 0, -0.2, 0.085, sh(fabric, 0.72)); b.box(0.2, 0.13, 0.012, 0.05 * s, -0.13, 0.1, 0x1e1e24);
          b.cyl(0.012, 0.012, 0.14, 6, -0.08, 0.4, 0.0, 0xc8ccd2); b.cyl(0.012, 0.012, 0.14, 6, 0.08, 0.4, 0.0, 0xc8ccd2);
          b.box(0.36, 0.16, 0.12, 0, 0.5, 0.02, sh(fabric, 1.12)); b.box(0.28, 0.1, 0.006, 0, 0.5, 0.081, sh(fabric, 1.32)); b.box(0.3, 0.012, 0.004, 0, 0.5, 0.088, sh(fabric, 0.7));   // the headrest block, a lighter face
          b.pop();
          for (var a = -1; a <= 1; a += 2) b.box(0.07, 0.07, 0.44, s * 0.55 + a * 0.33, 0.76, 0.76, sh(fabric, 1.18));
          b.cyl(0.042, 0.042, 0.02, 10, s * 0.22, 0.8, 0.86, 0x121214); b.cyl(0.036, 0.03, 0.11, 8, s * 0.22, 0.85, 0.86, s < 0 ? 0xf2efe6 : 0x9ad13a);   // cup holders, a cup / a can
          b.box(0.34, 0.26, 3.2, s * 0.78, RY - 0.2, 1.0, sh(liner, 0.86));                      // overhead lockers
          gl.box(0.02, 0.02, 3.4, s * 0.55, RY - 0.035, 1.0, night ? 0x6ab8ff : 0xdff0ff);       // LED strips
        }
        b.box(0.3, 0.32, 0.42, 0, 0.16, 1.28, 0x2f6fd1); b.box(0.32, 0.05, 0.44, 0, 0.345, 1.28, 0xf2efe6);                 // the aisle: a cooler,
        b.cyl(0.03, 0.03, 0.1, 8, -0.06, 0.42, 1.22, 0x9ad13a); b.cyl(0.04, 0.035, 0.18, 8, 0.07, 0.46, 1.36, 0x8a8e94);   // a can, the thermos,
        b.box(0.34, 0.12, 0.95, 0.02, 0.07, 1.98, 0x151518, 0, 0.06, 0); b.box(0.1, 0.13, 0.3, 0.02, 0.08, 1.45, 0x151518, 0, 0.06, 0);   // a gig bag down the aisle
        // v0.8 SPACES review: the cab shelf over the windshield (the header was one flat slab): a lip, cubbies, a toque, set lists,
        // a lanyard of laminates, a roll of gaff tape.
        var SY = WS.y1 + 0.16, SZ = WS.z1 + 0.12;
        b.box(1.8, 0.03, 0.34, 0, SY, SZ, sh(liner, 0.7)); b.box(1.8, 0.1, 0.03, 0, SY + 0.05, SZ + 0.17, sh(trim, 1.1));
        for (i = -2; i <= 2; i++) b.box(0.03, 0.26, 0.3, i * 0.36, SY + 0.13, SZ, sh(liner, 0.62));
        b.box(0.22, 0.12, 0.2, -0.54, SY + 0.075, SZ, 0xc0392b); b.box(0.24, 0.03, 0.22, -0.54, SY + 0.03, SZ, 0xf2efe6);   // a toque
        b.box(0.24, 0.05, 0.2, -0.18, SY + 0.04, SZ, 0xf2efe6, 0, 0.1, 0); b.box(0.22, 0.03, 0.2, -0.18, SY + 0.08, SZ, 0xe8e2d0, 0, -0.08, 0);
        b.cyl(0.07, 0.07, 0.06, 12, 0.2, SY + 0.05, SZ, 0x8a8e94); b.cyl(0.035, 0.035, 0.062, 10, 0.2, SY + 0.05, SZ, 0x2a2a2e);   // gaff tape
        b.box(0.02, 0.2, 0.006, 0.5, SY - 0.08, SZ + 0.19, 0x2f6fd1); b.box(0.09, 0.12, 0.006, 0.5, SY - 0.22, SZ + 0.19, 0xf2efe6); b.box(0.07, 0.03, 0.007, 0.5, SY - 0.19, SZ + 0.192, 0xd23c3c);   // laminates
        gl.box(0.26, 0.15, 0.012, 0.02, 0.84, WS.z0 + 0.49, night ? 0x3a8ad8 : 0x6aaad8);       // the touchscreen
        b.box(0.3, 0.19, 0.03, 0.02, 0.84, WS.z0 + 0.475, 0x151518);
      } else if (t === 3) {
        for (s = -1; s <= 1; s += 2) {                                                            // lounge couches along both sides
          b.box(0.5, 0.36, 2.0, s * 0.66, 0.2, 1.3, fabric); b.box(0.16, 0.5, 2.0, s * 0.86, 0.6, 1.3, sh(fabric, 0.8));
          b.box(0.06, 0.4, 2.2, s * 0.94, 1.35, 1.3, 0x121418);                                  // dark side windows
          for (i = 0; i < 12; i++) gl.box(0.03, 0.03, 0.03, s * 0.9, RY - 0.08, -0.2 + i * 0.3, [0xffd46a, 0xff8a6a, 0x9ad0ff][i % 3]);   // fairy lights
        }
        b.box(0.4, 0.05, 0.7, 0, 0.62, 1.2, 0x5a3d25); b.box(0.08, 0.6, 0.08, 0, 0.31, 1.2, 0x2a2a2e);   // the table
        b.box(0.18, 0.03, 0.13, -0.06, 0.66, 1.05, 0xd8b030); b.cyl(0.03, 0.03, 0.1, 8, 0.1, 0.7, 1.32, 0x9ad13a); b.cyl(0.03, 0.03, 0.1, 8, -0.08, 0.7, 1.4, 0xc0302a);
        b.box(0.64, 0.4, 0.05, 0.62, 1.55, 0.35, 0x151518, 0, -0.5, 0); gl.box(0.56, 0.32, 0.01, 0.6, 1.55, 0.37, night ? 0x2a5a9a : 0x4a8ac8, 0, -0.5, 0);   // the TV
        for (s = -1; s <= 1; s += 2) b.box(0.24, RY - 0.1, 0.06, s * 0.83, (RY - 0.1) / 2, 0.05, sh(liner, 0.8));   // the driver's partition: a wide doorway
        b.box(1.9, RY - 1.95, 0.06, 0, (RY + 1.95) / 2, 0.05, sh(liner, 0.8));
      }
    }
    // Venue stickers (state.van.stickers, newest 12) on the hood; banned venues crossed out in red. The bus has no hood: they
    // go over the driver's doorway in the lounge partition, facing the band (moved over one by one, with a hair dryer).
    var STICK_COLS = [0xf2d15b, 0xe86a9a, 0x4fb8e8, 0x6fe39a, 0xf28c28, 0xf2efe6, 0xb98cff, 0xd23c3c];
    function buildStickers(b, D) {
      var list = D.stickers || [], bus = D.tier === 3, i;
      if (!list.length) return;
      if (bus) b.push(0, 2.21, 0.08, Math.PI / 2, 0, 0);                                       // the partition header's face (z 0.08), rows go down
      else b.push(0, WS.y0 - 0.04, WS.z0 - 0.5, 0.14, 0, 0);
      for (i = 0; i < list.length; i++) {
        var h = GG.hashSeed ? GG.hashSeed(list[i].name) : i * 7, col = STICK_COLS[h % STICK_COLS.length];
        var x = -0.72 + (i % 6) * 0.29 + ((h >>> 4) % 5 - 2) * 0.012, z = (bus ? -0.12 : -0.42) + Math.floor(i / 6) * (bus ? 0.16 : 0.2), rot = ((h >>> 8) % 9 - 4) * 0.08;
        var w = 0.18 + ((h >>> 12) % 3) * 0.02, d = bus ? 0.1 : 0.12, y = bus ? 0.004 : 0.046;
        b.box(w, 0.004, d, x, y, z, col, 0, rot, 0);
        b.box(w * 0.7, 0.005, 0.02, x, y + 0.001, z, 0x1a1a1a, 0, rot, 0);                       // the venue's name (a black bar)
        if (list[i].banned) { b.box(w * 1.15, 0.006, 0.022, x, y + 0.002, z, 0xd0201a, 0, rot + 0.55, 0); b.box(w * 1.15, 0.006, 0.022, x, y + 0.002, z, 0xd0201a, 0, rot - 0.55, 0); }
      }
      b.pop();
    }
    // v0.8.1 (LOGO): the band's logo as a sticker on the windshield, up on the passenger side (the tour bus: on the outside).
    function logoDecal(D, dim) {
      var st = lastState || GG.state || {}, lg = (pending.trip && pending.trip.logo) || st.logo;
      if (!lg || !GG.render.logo || D.tier === 3) return;
      var tex = GG.render.logo.texture(lg, (D.band && D.band.name) || 'The Band', 256); if (!tex) return;
      K.texs.push(tex);
      var k = Math.min(1, dim * 1.6), mat = ownMat(new THREE.MeshLambertMaterial({ map: tex, transparent: true, alphaTest: 0.08, color: new THREE.Color(k, k, k) }));
      var t = 0.8, m = mesh(new THREE.PlaneGeometry(0.24, 0.24), mat);   // stuck on the inside of the windshield, up in the passenger-side corner
      m.position.set(0.42, WS.y0 + (WS.y1 - WS.y0) * t, WS.z0 + (WS.z1 - WS.z0) * t + 0.012); m.rotation.x = Math.atan2(WS.z1 - WS.z0, WS.y1 - WS.y0);
      K.logo = m;
    }
    // v0.8 polish: a seat back's rear face (local +z at `half`): a rolled top, darker side bolsters, a lighter ribbed velour
    // insert between two seams, a map pocket (side < 0: a road map sticking out; > 0: a bag of ketchup chips); hoodie: one
    // draped over the top. x, y, z, tilt = the back's centre and recline.
    function seatBack(b, x, y, z, tilt, w, h, half, fabric, side, hoodie) {
      var seam = sh(fabric, 0.6), zf = half + 0.006, k;
      b.push(x, y, z, tilt, 0, 0);
      // v0.8 SPACES review: a headrest up on two chrome posts (its rear face stitched), the map pocket's elastic top + stitching.
      for (k = -1; k <= 1; k += 2) b.cyl(0.011, 0.011, 0.14, 6, k * 0.08, h / 2 + 0.06, -0.01, 0xc8ccd2);
      b.box(0.3, 0.19, 0.11, 0, h / 2 + 0.2, -0.015, sh(fabric, 1.08)); b.box(0.24, 0.13, 0.01, 0, h / 2 + 0.2, 0.045, sh(fabric, 1.3));
      b.box(0.26, 0.01, 0.012, 0, h / 2 + 0.27, 0.042, seam); b.box(0.26, 0.01, 0.012, 0, h / 2 + 0.13, 0.042, seam);
      b.box(w - 0.1, 0.022, 0.036, 0, -h / 2 + 0.25, half + 0.024, sh(fabric, 1.45));                        // the pocket's elastic
      for (k = 0; k < 9; k++) b.box(0.03, 0.006, 0.006, -w / 2 + 0.09 + k * (w - 0.18) / 8, -h / 2 + 0.05, half + 0.037, sh(fabric, 1.5));   // stitching
      b.cyl(0.06, 0.06, w - 0.02, 8, 0, h / 2 - 0.03, 0.005, sh(fabric, 1.15), 0, 0, Math.PI / 2);
      b.box(w * 0.2, h - 0.1, 0.012, -w * 0.4 + 0.01, -0.02, half + 0.003, sh(fabric, 0.78)); b.box(w * 0.2, h - 0.1, 0.012, w * 0.4 - 0.01, -0.02, half + 0.003, sh(fabric, 0.78));
      b.box(w * 0.4, h - 0.2, 0.01, 0, -0.03, half + 0.003, sh(fabric, 1.32));
      for (k = 0; k < 7; k++) b.box(w * 0.4, 0.01, 0.012, 0, -h / 2 + 0.16 + k * 0.065, zf, sh(fabric, 1.05));
      b.box(0.014, h - 0.2, 0.014, -w * 0.21, -0.03, zf, seam); b.box(0.014, h - 0.2, 0.014, w * 0.21, -0.03, zf, seam);
      b.box(w - 0.1, 0.2, 0.03, 0, -h / 2 + 0.14, half + 0.02, sh(fabric, 0.7)); b.box(w - 0.1, 0.02, 0.034, 0, -h / 2 + 0.245, half + 0.021, sh(fabric, 0.5));
      if (side < 0) { b.box(0.2, 0.17, 0.012, -0.1, -h / 2 + 0.3, half + 0.03, 0xeadfb4, 0, 0, 0.14); b.box(0.16, 0.014, 0.014, -0.1, -h / 2 + 0.31, half + 0.038, 0x2f6fd1, 0, 0, 0.14); b.box(0.014, 0.12, 0.014, -0.05, -h / 2 + 0.3, half + 0.038, 0xc0302a, 0, 0, 0.14); }
      else { b.box(0.17, 0.15, 0.035, 0.08, -h / 2 + 0.29, half + 0.03, 0xd8302a, 0, 0, -0.18); b.box(0.1, 0.035, 0.037, 0.08, -h / 2 + 0.31, half + 0.031, 0xf2d15b, 0, 0, -0.18); }
      if (hoodie) {                                                                                   // somebody's hoodie, slung over
        b.box(w * 0.7, 0.07, 0.22, -0.04, h / 2 + 0.02, 0.0, hoodie); b.box(0.12, 0.34, 0.03, -0.14, h / 2 - 0.16, half + 0.035, hoodie, 0, 0, 0.1);
        b.box(0.1, 0.3, 0.03, 0.12, h / 2 - 0.14, half + 0.035, sh(hoodie, 0.85), 0, 0, -0.08); b.box(0.2, 0.04, 0.02, 0.0, h / 2 - 0.05, half + 0.04, 0xf2efe6);
      }
      b.pop();
    }
    // v0.6.1: the driver's dashboard item (Kenji's single tiny cactus, Moth's laundry, Chase's cassettes, Earl's atlas).
    function buildDash(b, item) {
      var x = -0.12, y = WS.y0 + 0.02, z = WS.z0 + 0.22, i;
      if (item === 'cactus') {
        var k = 1.7;   // v0.6.1 verify: tiny, but it has to read from the back bench on a phone
        b.cyl(0.03 * k, 0.024 * k, 0.045 * k, 8, x, y + 0.022 * k, z, 0xb8603a); b.cyl(0.032 * k, 0.032 * k, 0.008 * k, 8, x, y + 0.046 * k, z, 0xa8502e);
        b.cyl(0.012 * k, 0.014 * k, 0.07 * k, 6, x, y + 0.085 * k, z, 0x4fae48); b.box(0.028 * k, 0.01 * k, 0.01 * k, x - 0.016 * k, y + 0.085 * k, z, 0x4fae48);
        b.box(0.008 * k, 0.024 * k, 0.008 * k, x - 0.028 * k, y + 0.097 * k, z, 0x4fae48); b.box(0.012 * k, 0.012 * k, 0.012 * k, x, y + 0.124 * k, z, 0xff7aae);
      } else if (item === 'laundry') {
        b.box(0.16, 0.02, 0.1, x, y + 0.01, z, 0x8a6aa8, 0, 0.3, 0); b.box(0.12, 0.02, 0.08, x + 0.04, y + 0.03, z + 0.01, 0xe8e0c8, 0, -0.4, 0);
        b.box(0.05, 0.12, 0.02, 0.02, 1.62, WS.z1 + 0.09, 0xd84a4a);   // a sock on the mirror
      } else if (item === 'cassettes') {
        for (i = 0; i < 5; i++) b.box(0.1, 0.016, 0.065, x + (i % 2) * 0.01, y + 0.008 + i * 0.017, z, [0x1e1e22, 0xd8b030, 0x2a5aa8, 0xc0392b, 0xf2f0ea][i], 0, i * 0.2, 0);
      } else if (item === 'atlas') {
        b.box(0.22, 0.02, 0.16, x, y + 0.01, z, 0x2a6a4a, 0, 0.15, 0); b.box(0.2, 0.004, 0.14, x, y + 0.022, z, 0xf2ead0, 0, 0.15, 0);
      }
    }
    function glassPoint(u, v, out) {                           // u across (-1..1), v up (0..1) on the windshield, a hair inside
      out.set(u * 0.82, WS.y0 + (WS.y1 - WS.y0) * v, WS.z0 + (WS.z1 - WS.z0) * v + 0.012);
      return out;
    }

    // v0.9: the tier-0 vehicles, per band. paint/rust = the hood; sticker = the glovebox sticker's colour; hood = the hood
    // ornament; bobble = the dash bobblehead; fresh = the mirror's air freshener; list = what's in there (info().ornaments).
    var VAN0 = {
      hail_damage: { paint: 0x7a2a2a, rust: 0x9a5a2a, sticker: 0xe8d8a8, hood: 'antlers', bobble: 'moose', fresh: 'dice', list: ['moose bobblehead', 'plastic antlers', 'Moose Hearse sticker'] },
      frost_heave: { paint: 0x3a6a6a, rust: 0x8a6a4a, sticker: 0xff4fa0, hood: 'tape', bobble: 'skull', fresh: 'tree', list: ['curtains', 'laundry line', 'sleeping bag', 'skull bobblehead'] },
      gravel_kings: { paint: 0x6a1e22, rust: 0x8a5a3a, sticker: 0x40c8e8, hood: 'scoop', bobble: 'rocker', fresh: 'dice', list: ['tape deck', 'fuzzy dice', 'wood-grain dash', 'rocker bobblehead'] },
      grid_road_ramblers: { paint: 0x8a6a4a, rust: 0x6a4a2a, sticker: 0xd9a520, hood: 'guard', bobble: 'cow', fresh: 'tree', list: ['bench seat', 'CB radio', 'hat on the dash', 'cow bobblehead'] }
    };
    function tier0Ornaments(b, gl, T0, fabric) {
      var i, k, night = K.D.night;
      if (T0.bobble === 'skull') {                                                             // The Pothole: Moth's apartment
        for (k = -1; k <= 1; k += 2) {                                                          // curtains on the side windows (tie-dye, half drawn)
          b.box(0.02, 0.62, 0.42, k * 0.86, 1.5, 0.55, 0x8a4aa8); b.box(0.022, 0.62, 0.12, k * 0.86, 1.5, 0.3, 0xe8a030); b.box(0.03, 0.03, 0.7, k * 0.85, 1.83, 0.5, 0x2a2a2e);
        }
        b.box(1.7, 0.008, 0.008, 0, 1.86, -0.62, 0xd8d4cc);                                      // the laundry line across the cab, up by the visors
        [[-0.7, 0x6a5a8a, 0.1, 0.12], [-0.56, 0xd84a4a, 0.04, 0.09], [0.62, 0xf2efe6, 0.1, 0.1], [0.74, 0x3a5a3a, 0.04, 0.09]].forEach(function (q) {
          b.box(q[2], q[3], 0.01, q[0], 1.855 - q[3] / 2, -0.62, q[1]); b.box(0.01, 0.015, 0.015, q[0], 1.86, -0.62, 0xd8b27a);
        });
        b.cyl(0.14, 0.14, 0.9, 10, 0, SEAT_Y + 0.12, 1.02, 0x3a5a8a, 0, 0, Math.PI / 2);        // the sleeping bag, rolled on the bench
        b.box(0.24, 0.16, 0.16, -0.62, SEAT_Y + 0.05, 1.35, 0x5b4f6e);                           // a pillow
      } else if (T0.bobble === 'rocker') {                                                       // The Mullet Wagon: 1985 forever
        b.box(1.4, 0.04, 0.02, 0, WS.y0 - 0.12, WS.z0 + 0.465, 0x8a5a2a); b.box(1.4, 0.012, 0.022, 0, WS.y0 - 0.1, WS.z0 + 0.466, 0x6a4020);   // wood-grain dash strip
        b.box(0.22, 0.07, 0.04, 0.02, 0.56, WS.z0 + 0.5, 0x1a1a1e); gl.box(0.08, 0.03, 0.005, 0.0, 0.57, WS.z0 + 0.522, night ? 0xff8a40 : 0xd8a040);   // the tape deck
        b.box(0.1, 0.012, 0.064, 0.08, 0.6, WS.z0 + 0.49, 0xd8b030);                             // a cassette half in
        for (i = 0; i < 3; i++) b.box(0.1, 0.016, 0.065, -0.7 + i * 0.03, WS.y0 + 0.07 + i * 0.017, WS.z0 + 0.2, [0xe8408a, 0x40c8e8, 0x1e1e22][i], 0, i * 0.3, 0);
      } else if (T0.bobble === 'cow') {                                                          // Grandpa's Suburban
        b.box(0.34, 0.12, 0.5, 0, SEAT_Y - 0.06, -0.45, fabric);                                   // the front bench (the middle filled in)
        b.box(0.34, 0.6, 0.12, 0, 0.77, -0.2, fabric, 0.12, 0, 0);
        b.box(0.2, 0.06, 0.14, 0.3, 0.58, WS.z0 + 0.52, 0x1e1e22); gl.box(0.05, 0.02, 0.005, 0.26, 0.59, WS.z0 + 0.59, 0xff3030);   // the CB radio
        b.box(0.05, 0.08, 0.03, 0.42, 0.52, WS.z0 + 0.6, 0x2a2a2e); for (i = 0; i < 5; i++) b.cyl(0.012, 0.012, 0.012, 6, 0.4 - i * 0.02, 0.45 - i * 0.02, WS.z0 + 0.6, 0x1a1a1a);
        b.push(0.55, WS.y0 + 0.05, WS.z0 + 0.22, 0, 0.3, 0);                                       // a spare cowboy hat on the dash
        b.box(0.34, 0.02, 0.28, 0, 0, 0, 0x8a5a2a); b.box(0.18, 0.1, 0.16, 0, 0.06, 0, 0x8a5a2a); b.box(0.19, 0.025, 0.17, 0, 0.025, 0, 0x2a1a10);
        b.pop();
      }
    }
    // v0.9: the rear-view mirror shows the actual driver: their skin, and their eyes (Kenji's shades, Earl's glasses, bare eyes).
    function hexNum(c, d) { return typeof c === 'number' ? c : typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c) ? parseInt(c.slice(1), 16) : d; }
    function buildMirror(D) {
      var L = K.driverLook || {}, mb = new ctx.Builder({ jitter: 0 }), z = WS.z1 + 0.107, ex = L.extras || [];
      var shadesOn = ex.indexOf('sunglasses') >= 0, glasses = ex.indexOf('glasses') >= 0;
      mb.box(0.12, 0.05, 0.004, 0.0, 1.73, z, hexNum(L.skin, 0xd8b08a));
      if (shadesOn) mb.box(0.13, 0.022, 0.004, 0.0, 1.738, z + 0.002, 0x0c0c0e);
      else {
        for (var s = -1; s <= 1; s += 2) {
          mb.box(0.016, 0.014, 0.004, s * 0.03, 1.738, z + 0.002, 0x16120f);
          if (glasses) { mb.box(0.04, 0.004, 0.004, s * 0.03, 1.749, z + 0.003, 0x2a2a2a); mb.box(0.04, 0.004, 0.004, s * 0.03, 1.727, z + 0.003, 0x2a2a2a); mb.box(0.004, 0.024, 0.004, s * 0.05, 1.738, z + 0.003, 0x2a2a2a); }
        }
        mb.box(0.12, 0.008, 0.004, 0, 1.752, z + 0.001, hexNum(L.hair, 0x3a2416));                                   // the brows
      }
      mesh(mb.build(), ctx.mats.unlit);
      K.mirror = shadesOn ? 'sunglasses' : glasses ? 'glasses' : 'eyes';
    }

    // ---- v1.1: your instrument in its gig bag between the front seats (string seats) ----------------------------------------
    function buildGigBag(D) {
      if (!D.seat) return;
      var b = new ctx.Builder({ jitter: 0.04, seed: 23 }), bag = 0x232327, seam = 0x3a3a40, patch = parseInt(String(D.gearColor).replace('#', ''), 16) || 0xb3262b;
      var bass = D.seat === 'bass', L = bass ? 0.62 : 0.5;
      b.push(0.0, 0.08, -0.12, 0.18, 0, 0.12);                                          // standing in the gap, leaning back a touch
      b.box(0.34, 0.46, 0.13, 0, 0.23, 0, bag); b.box(0.3, 0.02, 0.135, 0, 0.36, 0, seam);   // the body end, a zip seam
      b.box(0.1, L, 0.08, 0, 0.46 + L / 2, 0, bag); b.box(0.15, 0.17, 0.09, 0, 0.55 + L, 0, bag);   // the neck, the headstock end
      b.box(0.16, 0.12, 0.012, 0, 0.22, 0.07, patch); b.box(0.035, 0.6, 0.01, 0.09, 0.45, 0.072, seam);   // a patch in your colour, a strap
      b.pop();
      var m = mesh(b.build(), ctx.mats.vc);
      K.gigBag = D.seat; return m;
    }
    // ---- The band in the van -------------------------------------------------------------------------------------
    var HELD_VAN = { jaxon: 'sandwich', duke: 'sandwich', tamara: 'floss', earl: 'coffee' };
    function buildPeople(D) {
      var list = [], i, m;
      for (i = 0; i < D.members.length; i++) { m = D.members[i]; if (m && m.id && (!m.status || m.status === 'active')) list.push(m); }
      var roleOf = function (mm) { var cm = contentMember(D.band, mm.id); return String(mm.role || (cm && cm.role) || '').toLowerCase(); };
      // v0.6.1 (C1): the band's driver up front (Kenji, silently); YOU ride shotgun as founder (or drive, if the driver
      // quit); the band in the back rows; gear + merch piled behind.
      var you = { id: 'player', look: D.playerLook || { skin: '#e0b48c', hair: '#3a2416', hairStyle: 'short', shirt: '#b3262b', pants: '#1e2230', height: 1, build: 1, extras: [] } };
      var driver = null;
      if (D.driver !== 'you') for (i = 0; i < list.length; i++) if (list[i].id === (D.driver || 'kenji')) driver = list[i];
      if (!driver) driver = you;
      var rest = list.filter(function (x) { return x !== driver; });
      var voc = null;
      for (i = 0; i < rest.length; i++) if (/vocal/.test(roleOf(rest[i]))) { voc = rest[i]; break; }
      if (voc) { rest.splice(rest.indexOf(voc), 1); rest.unshift(voc); }
      var seats = [
        { x: -0.47, z: -0.47, role: 'driver' }, { x: 0.49, z: -0.47, role: 'shotgun' },
        { x: -0.6, z: 0.72, role: 'middleL' }, { x: 0.6, z: 0.72, role: 'middleR' }, { x: 0, z: 1.3, role: 'back' }
      ];
      if (D.look === 'sardine') seats = [{ x: -0.47, z: -0.47, role: 'driver' }, { x: 0.49, z: -0.47, role: 'shotgun' },   // v0.7: three abreast
        { x: -0.56, z: 0.68, role: 'middleL' }, { x: 0.56, z: 0.68, role: 'middleR' }, { x: 0, z: 0.64, role: 'back' }];
      else if (D.tier === 1) { seats[2].x = -0.5; seats[3].x = 0.5; seats[4] = { x: 0.64, z: 1.74, role: 'back' }; }   // v0.8: the 15-passenger: row 2 in view, beside you in row 3
      else if (D.tier === 2) { seats[2] = { x: -0.55, z: 0.72, role: 'middleL' }; seats[3] = { x: 0.55, z: 0.72, role: 'middleR' }; seats[4] = { x: -0.6, z: 2.2, role: 'back' }; }
      else if (D.tier === 3) seats = [seats[0], seats[1], { x: -0.6, z: 0.55, role: 'middleL', yaw: Math.PI / 2 },   // the bus lounge: facing each other
        { x: 0.6, z: 0.9, role: 'middleR', yaw: -Math.PI / 2 }, { x: -0.6, z: 1.3, role: 'back', yaw: Math.PI / 2 }];
      var cv = D.flags && D.flags.cape, cape = typeof cv === 'string' && cv !== 'none' ? (CAPE_OK[cv] ? cv : 'velvet') : null;
      var riders = [driver].concat(driver === you ? rest.slice(0, 4) : [you].concat(rest.slice(0, 3)));
      // v0.9: the cape is member.cape's (content), never "whoever rides shotgun"; the driver keeps their own face (shades only
      // when the driver def says so: Kenji); held things from the member (T-Bone's floss, Earl's double-double, Jaxon's lunch).
      var capeId = null;
      for (i = 0; i < riders.length; i++) { var cmx = contentMember(D.band, riders[i].id); if (riders[i].cape || (cmx && cmx.cape)) capeId = riders[i].id; }
      if (!capeId) for (i = 0; i < riders.length; i++) if (riders[i].id === 'marcel') capeId = 'marcel';
      var DR = GG.content.drivers || {}, ddef = DR[D.driver] || null;
      var shades = ddef && ddef.shades != null ? !!ddef.shades : D.driver === 'kenji';
      K.driverLook = null;
      var pm = ownMat(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, color: new THREE.Color(D.night ? 0.45 : 0.62, D.night ? 0.45 : 0.62, D.night ? 0.5 : 0.64) }));
      for (i = 0; i < riders.length; i++) {
        m = riders[i]; var seat = seats[i], cm = contentMember(D.band, m.id), look = m.look || (cm && cm.look) || null;
        if (seat.role === 'driver' && m !== you) {                                    // Kenji: sunglasses, whatever the look says
          look = JSON.parse(JSON.stringify(look || { skin: '#d8b28a', hair: '#0c0c0e', hairStyle: 'short', shirt: '#101014', pants: '#141418', height: 1.08, build: 1.05, extras: [] }));
          if (shades) {
            look.extras = (look.extras || []).filter(function (e) { return e !== 'glasses'; });
            if (look.extras.indexOf('sunglasses') < 0) look.extras.push('sunglasses');
          }
        }
        if (seat.role === 'driver') K.driverLook = look || you.look;
        var held = seat.role === 'middleR' || seat.role === 'middleL' ? (HELD_VAN[m.id] || 'phone') : seat.role === 'back' ? (HELD_VAN[m.id] || null) : null;
        var ch = R.buildCharacter(look, { id: m.id, held: held, cape: m.id === capeId ? cape : null, scale: PEOPLE_SCALE });
        if (!ch) continue;
        ch.mesh.material = pm;
        K.chars.push(ch);
        ch.bones[B_PHONES].scale.setScalar(0); ch.bones[B_FLOOR].scale.setScalar(0); ch.bones[B_GEAR].scale.setScalar(0);
        ch.root.position.set(seat.x, 0, seat.z); ch.root.rotation.y = seat.yaw != null ? seat.yaw : Math.PI;
        K.root.add(ch.root);
        var rec = { id: m.id, role: seat.role, ch: ch, ph: hash01(i, 71) * 10, talk: 0, talkDur: 0, held: held, bx: seat.x, bz: seat.z, lean: 0 };
        if (seat.role === 'driver') {
          var sc = ch.root.scale.y, bw = ch.look.build, sx = 0.25 * bw + 0.075, hipsY = SEAT_Y / sc + 0.08, shY = 1.37 - HIPS_Y + hipsY;
          var wz = (seat.z - (WS.z0 + 0.5)) / sc, wy = 0.98 / sc, arm = R.stage && R.stage.armPose;
          if (arm) {
            rec.wheelL = arm([sx, shY, 0], [0.15 / sc, wy + 0.08 / sc, wz - 0.03], 1, 0, 0);
            rec.wheelR = arm([-sx, shY, 0], [-0.15 / sc, wy + 0.08 / sc, wz - 0.03], -1, 0, 0);
          }
        }
        K.people.push(rec);
      }
    }

    // ---- Camera framing ------------------------------------------------------------------------------------------
    var CAM0 = { pos: [0.0, 1.44, 0.98], look: [-0.02, 1.22, -8], bandFov: 56, minHFov: 46 }, CAM = CAM0;
    var CAM_MINI = { pos: [0.0, 1.52, 1.0], look: [-0.02, 1.2, -8], bandFov: 50, minHFov: 38 };     // v0.8 polish: the band's own minivan (SPACES review: tighter)
    var CAM_SARDINE = { pos: [0.16, 1.7, 1.5], look: [0.0, 1.25, -8], bandFov: 58, minHFov: 50 };   // v0.7: behind the packed middle row
    function frame() {
      CAM = K && K.D && K.D.look === 'sardine' ? CAM_SARDINE : K && K.D && K.D.tier && VTIER[K.D.tier] ? VTIER[K.D.tier].cam : K && K.D && K.D.tier === 0 ? CAM_MINI : CAM0;   // v0.8: vehicle tiers
      var cam = ctx.camera, sz = ctx.size(), W = sz.w, H = sz.h, F = pending.frame;
      var top = F.top || 0, bottom = F.bottom < 0 ? Math.round(H * 0.3) : F.bottom, bandH = Math.max(80, H - top - bottom);
      var tb = Math.tan(CAM.bandFov * Math.PI / 360), minT = Math.tan(CAM.minHFov * Math.PI / 360) * bandH / W;
      if (minT > tb) tb = minT;
      cam.fov = 2 * Math.atan(tb * H / bandH) * 180 / Math.PI; cam.aspect = W / H; cam.near = 0.05; cam.far = 1000;
      camOffY = Math.round(H / 2 - (top + bandH / 2)); camFov = cam.fov;
      cam.setViewOffset(W, H, 0, camOffY, W, H); cam.updateProjectionMatrix();
      cam.position.set(CAM.pos[0], CAM.pos[1], CAM.pos[2]); cam.lookAt(CAM.look[0], CAM.look[1], CAM.look[2]); cam.updateMatrixWorld();
    }

    // ======================================================================================================
    // Per frame
    function place(P, i, x, y, z, yaw, s) {
      dummy.position.set(x, y, z); dummy.rotation.set(0, yaw, 0); dummy.scale.set(s, s, s); dummy.updateMatrix();
      P.m.setMatrixAt(i, dummy.matrix);
    }
    function update(dt, t) {
      if (!K) return;
      var cam = ctx.camera;
      if (cam.fov !== camFov || !cam.view || cam.view.offsetY !== camOffY) frame();
      S.t += dt;
      var cr = K.crossing, slow = cr && cr.z > -80 && cr.z < 10 ? 0.35 : 1;
      S.speedK += (slow - S.speedK) * (1 - Math.exp(-1.5 * dt));
      var ds = SPEED * S.speedK * dt * (K.D.look === 'train' ? 2.2 : 1);   // v0.7: rail passes are faster
      S.s += ds;
      K.roadTex.offset.y = (S.s / 28) % 1; K.groundTex.offset.y = (S.s / 220) % 1;
      scrollProps(t, dt, ds);
      updateSign();
      updateSkyline();
      updateWeather(dt, ds, t);
      updateCabin(dt, t);
      updatePeople(dt, t);
      // Road bumps: the whole cab bobs a little.
      var bumpy = 0.006 * Math.sin(t * 13.1) * Math.sin(t * 2.3) + 0.004 * Math.sin(t * 7.7);
      cam.position.y = CAM.pos[1] + bumpy * S.speedK; cam.position.x = CAM.pos[0] + 0.003 * Math.sin(t * 1.9);
      cam.updateMatrixWorld();
      S.bumpy = bumpy;
    }
    function cycle(P, i, s, span) { return Math.floor((s - i * P.gap) / span); }
    function zOf(P, i, s, span) { return NEAR - mod(i * P.gap - s, span); }
    function scrollProps(t, dt, ds) {
      var P = K.props, s = S.s, i, z, c, span, x, h;
      span = P.poles.n * P.poles.gap;
      for (i = 0; i < P.poles.n; i++) place(P.poles, i, 8.4, 0, zOf(P.poles, i, s, span), 0, 1);
      span = P.elev.n * P.elev.gap;
      for (i = 0; i < P.elev.n; i++) {
        c = cycle(P.elev, i, s, span); z = zOf(P.elev, i, s, span); h = hash01(c * 3 + i, 81);
        if (h < 0.2) { P.elev.m.setMatrixAt(i, zero); continue; }
        x = (h < 0.6 ? -1 : 1) * ((P.elev.x0 || 26) + hash01(c * 3 + i, 82) * (P.elev.xr || 30));
        place(P.elev, i, x, 0, z, hash01(c, 83) < 0.5 ? 0 : Math.PI / 2, 1);
        if (P.elev.lastCycle[i] !== c) { P.elev.lastCycle[i] = c; var EC = P.elev.cols || ELEV_COLS; col.setHex(EC[Math.floor(hash01(c * 5 + i, 84) * EC.length)]); P.elev.m.setColorAt(i, col); P.elev.m.instanceColor.needsUpdate = true; }
      }
      span = P.farm.n * P.farm.gap;
      for (i = 0; i < P.farm.n; i++) {
        c = cycle(P.farm, i, s, span); z = zOf(P.farm, i, s, span); h = hash01(c * 4 + i, 85);
        x = (h < 0.5 ? -1 : 1) * ((P.farm.x0 || 60) + hash01(c * 4 + i, 86) * (P.farm.xr != null ? P.farm.xr : 90));
        place(P.farm, i, x, 0, z, (P.farm.x0 ? 0 : (hash01(c * 4 + i, 87) - 0.5) * 1.2) + (x > 0 ? -Math.PI / 2 : Math.PI / 2), 1);
        if (K.farmLights) K.farmLights.setMatrixAt(i, dummy.matrix);
      }
      span = P.belt.n * P.belt.gap;
      for (i = 0; i < P.belt.n; i++) {
        c = cycle(P.belt, i, s, span); z = zOf(P.belt, i, s, span); h = hash01(c * 6 + i, 88);
        place(P.belt, i, (h < 0.5 ? -1 : 1) * ((P.belt.x0 || 32) + hash01(c * 6 + i, 89) * (P.belt.xr || 80)), 0, z, hash01(c * 6 + i, 90) < 0.3 ? Math.PI / 2 : 0, 1);
      }
      span = P.bales.n * P.bales.gap;
      for (i = 0; i < P.bales.n; i++) {
        c = cycle(P.bales, i, s, span); h = hash01(c * 24 + i, 91);
        if (h > P.bales.show) { P.bales.m.setMatrixAt(i, zero); continue; }
        place(P.bales, i, (hash01(c * 24 + i, 92) < 0.5 ? -1 : 1) * ((P.bales.x0 || 12) + hash01(c * 24 + i, 93) * (P.bales.xr || 50)), 0, zOf(P.bales, i, s, span), P.bales.face ? (hash01(c * 24 + i, 92) < 0.5 ? Math.PI / 2 : -Math.PI / 2) : hash01(i, 94) * 3, 1);
      }
      span = P.moose.n * P.moose.gap;
      for (i = 0; i < P.moose.n; i++) {
        c = cycle(P.moose, i, s, span); h = hash01(c * 2 + i, 95);
        if (h > (P.moose.show != null ? P.moose.show : 0.55)) { P.moose.m.setMatrixAt(i, zero); continue; }
        x = (h < 0.27 ? -1 : 1) * (14 + hash01(c * 2 + i, 96) * 22);
        place(P.moose, i, x, 0, zOf(P.moose, i, s, span), x > 0 ? -Math.PI / 2 + 0.3 : Math.PI / 2 - 0.3, 1);
      }
      var cr = K.crossing;                                                       // the moose on the road
      if (cr) {
        cr.z += ds; cr.x -= 1.6 * dt;
        if (cr.z > NEAR || cr.x < -16) { K.crossing = null; P.moose.m.setMatrixAt(2, zero); }
        else place(P.moose, 2, cr.x, 0, cr.z, -Math.PI / 2, 1);
      }
      span = 10 * 110;
      for (i = 0; i < 10; i++) {
        var cs = s * 0.12 + t * 2;
        c = Math.floor((cs - i * 110) / span); z = NEAR - 60 - mod(i * 110 - cs, span);
        dummy.position.set((hash01(c * 10 + i, 97) - 0.5) * 700, 80 + hash01(c * 10 + i, 98) * 60, z); dummy.rotation.set(0, hash01(i, 99) * 3, 0);
        dummy.scale.set(1 + hash01(i, 100), 1, 1 + hash01(i, 101)); dummy.updateMatrix(); K.clouds.setMatrixAt(i, dummy.matrix);
      }
      for (i = 0; i < K.propMeshes.length; i++) K.propMeshes[i].instanceMatrix.needsUpdate = true;
      if (K.farmLights) K.farmLights.instanceMatrix.needsUpdate = true;
      K.clouds.instanceMatrix.needsUpdate = true;
    }
    function updateSign() {
      var gap = 700, c = Math.floor((S.s + 400) / gap), z = NEAR - mod(-(S.s + 400), gap) - 20;
      if (c !== K.lastSign) { K.lastSign = c; drawSign(K.D, K.D.km * (1 - pending.progress)); }
      K.sign.m.position.set(6.8, 3.4, z);
    }
    function updateSkyline() {
      var p = pending.progress, k = ease((p - 0.55) / 0.45);
      K.skyline.visible = k > 0.001;
      K.skyline.scale.y = Math.max(0.001, k);
    }
    function updateWeather(dt, ds, t) {
      var W = K.weather, i, j, p = W.pos;
      if (W.kind === 'snow' || W.kind === 'leaves') {
        var fall = W.kind === 'snow' ? (W.hail ? 9 : W.heavy ? 2.6 : 1.6) : 0.5, sway = W.kind === 'snow' ? (W.hail ? 0.1 : W.heavy ? 1.8 : 0.6) : 2.2;
        for (i = 0; i < W.n; i++) {
          j = i * 3;
          p[j] += Math.sin(t * 1.3 + i) * sway * dt + (W.kind === 'leaves' ? 2.5 * dt : W.heavy ? -4 * dt : 0);
          p[j + 1] -= fall * dt * (0.6 + (i % 5) * 0.15);
          p[j + 2] += ds * (W.kind === 'snow' ? 1.05 : 1);
          if (p[j + 2] > -2.3 || p[j + 1] < 0.05) respawn(p, i, false, W.kind);
        }
        W.points.geometry.attributes.position.needsUpdate = true;
      } else if (W.kind === 'rain') {
        for (i = 0; i < W.n; i++) {
          j = i * 6;
          var dy = -14 * dt;
          p[j + 1] += dy; p[j + 4] += dy; p[j + 2] += ds; p[j + 5] += ds;
          if (p[j + 2] > -2.3 || p[j + 4] < 0) respawnRain(p, i, false);
        }
        W.lines.geometry.attributes.position.needsUpdate = true;
      }
      if (W.drift) {
        for (i = 0; i < 18; i++) {
          W.dx[i] -= 5 * dt; W.dz[i] += ds;
          if (W.dz[i] > 4 || W.dx[i] < -12) { W.dx[i] = 8 + hash01(i + Math.floor(t), 33) * 6; W.dz[i] = -110 - hash01(i + Math.floor(t), 34) * 30; }
          dummy.position.set(W.dx[i], 0.06, W.dz[i]); dummy.rotation.set(0, 0.15, 0); dummy.scale.set(7, 1, 1.2); dummy.updateMatrix();
          W.drift.setMatrixAt(i, dummy.matrix);
        }
        W.drift.instanceMatrix.needsUpdate = true;
      }
    }
    function updateCabin(dt, t) {
      // Bobblehead: a damped spring kicked by the bumps (and every so often a pothole).
      var pot = Math.sin(t * 0.37) > 0.995 ? 30 : 0;
      S.bobV += (-S.bob * 90 - S.bobV * 3.2 + (S.bumpy || 0) * 900 + pot) * dt; S.bob += S.bobV * dt;
      S.bobXV += (-S.bobX * 70 - S.bobXV * 2.6 + Math.sin(t * 0.9) * 2) * dt; S.bobX += S.bobXV * dt;
      K.bobble.rotation.set(clamp(S.bob, -0.6, 0.6), 0, clamp(S.bobX, -0.5, 0.5));
      S.freshV += (-S.fresh * 12 - S.freshV * 0.8 + Math.sin(t * 0.7) * 0.6 + (S.bumpy || 0) * 60) * dt; S.fresh += S.freshV * dt;
      K.fresh.rotation.set(clamp(S.fresh, -0.5, 0.5) * 0.6, S.fresh * 0.8, clamp(S.fresh, -0.5, 0.5));
      K.wheel.rotation.z = 0.05 * Math.sin(t * 0.5) + 0.02 * Math.sin(t * 1.7);
      // Wipers and glass.
      var W = K.weather, wet = (W.kind === 'rain' || W.kind === 'snow') && !W.light, period = W.heavy || W.hail ? 1.0 : 1.5;
      var wa = wet ? 1.55 * bump((t % period) / period) : 0, wiped = wet && (t % period) < dt * 1.5;
      for (i = 0; i < 2; i++) {
        mA.makeRotationZ(wa);
        mB.makeRotationX(-(Math.PI / 2 - K.glassTilt)); mB.multiply(mA);
        mB.setPosition(i ? 0.12 : -0.62, WS.y0 + 0.03, WS.z0 + 0.03);
        K.wipers.setMatrixAt(i, mB);
      }
      K.wipers.instanceMatrix.needsUpdate = true;
      var rate = W.kind === 'rain' ? 1.6 : W.kind === 'snow' ? (W.hail ? 2.4 : W.heavy ? 1.4 : W.light ? 0.1 : 0.6) : W.kind === 'bugs' ? (W.id === 'heat' ? 0.06 : 0.02) : 0.05;
      for (var i = 0; i < 40; i++) {
        if (wiped) K.glassT[i] = -hash01(i + Math.floor(t * 3), 62) * 1.2;
        K.glassT[i] += dt * rate;
        var sc = clamp(K.glassT[i], 0, 1) * (W.kind === 'bugs' ? 1.1 : W.kind === 'leaves' ? 2.2 : 1);
        if (sc <= 0 || (W.kind === 'leaves' && i > 5) || (W.kind === 'bugs' && i > 9)) { K.glass.setMatrixAt(i, zero); continue; }
        glassPoint((hash01(i, 63) - 0.5) * 1.9, W.kind === 'leaves' ? 0.04 + hash01(i, 64) * 0.08 : 0.08 + hash01(i, 64) * 0.85, vA);
        dummy.position.copy(vA); dummy.rotation.set(K.glassTilt - Math.PI / 2, 0, hash01(i, 65) * 3); dummy.scale.set(sc, sc * (W.kind === 'rain' ? 1.4 : 1), 1); dummy.updateMatrix();
        K.glass.setMatrixAt(i, dummy.matrix);
      }
      K.glass.instanceMatrix.needsUpdate = true;
    }
    function rot(b, x, y, z) { b.rotation.set(x, y, z); }
    function updatePeople(dt, t) {
      for (var i = 0; i < K.people.length; i++) {
        var r = K.people[i], bn = r.ch.bones, k, sc = r.ch.root.scale.y;
        for (k = 1; k < bn.length; k++) if (k !== B_PHONES && k !== B_HELD && k !== B_FLOOR && k !== B_GEAR) bn[k].rotation.set(0, 0, 0);
        var hy = SEAT_Y / sc + 0.08, a = Math.acos(clamp((hy - 0.02 - 0.45) / 0.39, -0.6, 0.6));
        bn[B_HIPS].position.y = hy + (S.bumpy || 0) * 1.5;
        bn[B_LEG_L].rotation.x = -a; bn[B_SHIN_L].rotation.x = a; bn[B_LEG_R].rotation.x = -a; bn[B_SHIN_R].rotation.x = a;
        var tt = t + r.ph, talking = r.talk > 0 ? 1 : 0;
        if (r.talk > 0) r.talk -= dt;
        if (r.role === 'driver') {                                         // hands at ten and two, eyes on the road
          if (r.wheelL) { rot(bn[B_ARM_L], r.wheelL[0], 0, r.wheelL[1]); rot(bn[B_FORE_L], r.wheelL[2], 0, r.wheelL[3]); rot(bn[B_ARM_R], r.wheelR[0], 0, r.wheelR[1]); rot(bn[B_FORE_R], r.wheelR[2], 0, r.wheelR[3]); }
          else { rot(bn[B_ARM_L], -1.0, 0, -0.2); rot(bn[B_FORE_L], -0.6, 0, 0); rot(bn[B_ARM_R], -1.0, 0, 0.2); rot(bn[B_FORE_R], -0.6, 0, 0); }
          var nod = (tt % 23) < 0.9 ? 0.18 * bump((tt % 23) / 0.9) : 0;
          bn[B_HEAD].rotation.x = 0.02 + nod; bn[B_SPINE].rotation.x = -0.05;
          if (talking) {                                                   // v0.9: a talking driver (Earl's road stories): the right hand off the wheel, a glance over
            rot(bn[B_ARM_R], -0.9 - 0.25 * Math.sin(tt * 6), 0, -0.35); rot(bn[B_FORE_R], -1.3, 0, 0.3 * Math.sin(tt * 4));
            bn[B_HEAD].rotation.y = 0.35 + 0.08 * Math.sin(tt * 3); bn[B_HEAD].rotation.x = 0.05 * Math.sin(tt * 9);
          }
        } else if (r.role === 'shotgun') {                                   // looks out the window; waves his hands when he talks
          rot(bn[B_ARM_L], -0.5, 0, 0.05); rot(bn[B_FORE_L], -0.9, 0, 0); rot(bn[B_ARM_R], -0.35, 0, -0.35); rot(bn[B_FORE_R], -1.2, 0, 0.3);
          bn[B_HEAD].rotation.y = talking ? 0.5 + 0.1 * Math.sin(tt * 6) : -0.55 + 0.15 * Math.sin(tt * 0.3);
          if (talking) { rot(bn[B_ARM_L], -1.3 - 0.3 * Math.sin(tt * 7), 0, 0.3); rot(bn[B_FORE_L], -1.2, 0, 0.4 * Math.sin(tt * 5)); bn[B_HEAD].rotation.x = 0.1 * Math.sin(tt * 9); }
          bn[B_CAPE1].rotation.x = 0.4; bn[B_CAPE2].rotation.x = 0.2;
        } else {
          var lunch = r.held === 'sandwich', c = tt % 5.5, up = lunch ? (c < 3 ? 0 : c < 3.5 ? ease((c - 3) / 0.5) : c < 4.4 ? 1 : 1 - ease((c - 4.4) / 0.5)) : 0.6;
          rot(bn[B_ARM_L], -0.55, 0, 0.05); rot(bn[B_FORE_L], -0.6, 0, 0);
          rot(bn[B_ARM_R], -0.35 - 0.5 * up, 0, 0.05 + 0.25 * up); rot(bn[B_FORE_R], -1.1 - 1.1 * up, 0, 0.25 + 0.1 * up);
          bn[B_HEAD].rotation.x = lunch ? 0.22 - 0.3 * up : 0.42;
          // Beside you in the middle row: they lean into view (and turn to you) when they have something to say.
          var sg = r.role === 'middleL' ? -1 : 1;
          r.lean += ((talking ? 1 : 0) - r.lean) * (1 - Math.exp(-5 * dt));
          r.ch.root.position.set(r.bx - sg * 0.1 * r.lean, 0, r.bz - 0.34 * r.lean);
          bn[B_SPINE].rotation.x = 0.3 * r.lean; bn[B_SPINE].rotation.z = -sg * 0.22 * r.lean; bn[B_SPINE].rotation.y = sg * 0.5 * r.lean;
          bn[B_HEAD].rotation.y = sg * 0.7 * r.lean + 0.06 * Math.sin(tt * 0.4);
          if (talking) { bn[B_HEAD].rotation.x = 0.05 * Math.sin(tt * 9); rot(bn[B_ARM_L], -1.1 - 0.3 * Math.sin(tt * 6), 0, 0.3); }
        }
      }
    }

    function silentDriver(id) {
      var cm = contentMember(K.D.band, id), m = null;
      for (var i = 0; i < K.D.members.length; i++) if (K.D.members[i] && K.D.members[i].id === id) m = K.D.members[i];
      if ((m && m.silent != null) || (cm && cm.silent != null)) return !!((m && m.silent) || (cm && cm.silent));
      return id === 'kenji';
    }
    function moose() {
      if (!K || K.crossing) return false;
      K.crossing = { x: 9, z: -150 };
      return true;
    }
    function talk(id, secs) {
      if (!K) return false;
      for (var i = 0; i < K.people.length; i++) {
        var r = K.people[i];
        if (r.id === id && !(r.role === 'driver' && silentDriver(r.id))) { r.talk = +secs > 0 ? +secs : 3; return true; }   // Kenji never talks (member.silent)
      }
      return false;
    }

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
      debug: function () { return { van: inst.info() }; }
    };
    inst = {
      active: false,
      build: function () { build(); },
      moose: moose, talk: talk, frame: function () { if (K) frame(); },
      info: function () {
        if (!K) return { built: false };
        return { built: true, season: K.D.season, night: K.D.night, from: K.D.from, to: K.D.to, km: K.D.km, progress: pending.progress,
          weather: K.weather.kind, weatherId: K.weather.id, dashboard: K.D.dashboard || null, region: K.D.region, look: K.D.look,
          tier: K.D.tier, vehicle: K.D.look ? K.D.look : (VTIER[K.D.tier || 0] || { id: 'minivan' }).id, stickers: K.D.look ? 0 : K.D.stickers.length, logo: !!K.logo, banned: K.D.look ? 0 : K.D.stickers.filter(function (x) { return x.banned; }).length,
          gigBag: K.gigBag || null,   // v1.1
          people: K.people.map(function (r) { return r.id + ':' + r.role; }), driver: ((K.people[0] || {}).id === 'player' ? 'you' : (K.people[0] || {}).id) || null,
          driverExtras: K.driverLook && K.driverLook.extras ? K.driverLook.extras.slice() : [], mirror: K.mirror || null, ornaments: K.ornaments || null, bandId: K.D.bandId,   // v0.9
          talking: K.people.filter(function (r) { return r.talk > 0; }).map(function (r) { return r.id; }),
          traveled: Math.round(S.s), skyline: K.skyline.visible, crossing: !!K.crossing, geos: K.geos.length, mats: K.mats.length, texs: K.texs.length,
          cam: CAM.pos.slice(), hfov: CAM.minHFov };                                                          // v0.8 polish: where you sit
      }
    };
    return shell;
  });
})(window.GG);
