// 44_render_carpet.js: the Loonie Awards (v0.5). Two sets in one scene: the RED CARPET (a step-and-repeat wall of
// parody sponsors, velvet ropes, a press pen of photographers whose flashes pop, the band walking in wearing their
// outfits, Marcel's cape from flags.cape, Tundra Wraith in corpse paint and cardigans waving politely) and, 30 m to the
// right, the STAGE (curtains, a giant loonie, a lectern with a presenter holding the envelope, the band stage-left, the
// rival stage-right, confetti when you win). Built on enter()/setup(), everything disposed on exit().
// API (GG.render.carpet): setup({ members:[{id,look,role}], player, flags, outfit:'cape'|'tux'|'jumpsuit'|null, rival:{name},
//   genre, year, sign? (v0.7: the marquee text, default 'The Loonies'; the Global Gong uses 'The Global Gong') }) ; setMode('carpet'|'podium') ; flash(n) ; envelope(true|false|null) (won / lost / reset) ;
//   setFrame({ top, bottom }) ; info().
// Draw calls ≈ set 1 + glow 1 + wall 1 + photographers 1 + flashes 1 + confetti 1 + band ≤6 + rival 4 + paint 4
//   + presenter 1 + envelope 1 ≈ 22. Per frame: numbers only (preallocated dummies, typed arrays), no allocation.
(function (GG) {
  var R = GG.render;
  if (!R || !R.defineScene) return;
  var THREE = null;
  var B_HIPS = 1, B_SPINE = 2, B_HEAD = 3, B_ARM_L = 4, B_FORE_L = 5, B_ARM_R = 6, B_FORE_R = 7,
    B_LEG_L = 8, B_SHIN_L = 9, B_LEG_R = 10, B_SHIN_R = 11, B_CAPE1 = 12, B_CAPE2 = 13, B_GEAR = 14, B_PHONES = 15, B_HELD = 16, B_FLOOR = 17;
  var SCALE = 1.1, STAGE_X = 30, STAGE_Y = 0.6, N_PHOTO = 10, N_CONF = 160;
  var CAPE_OK = { velvet: 1, curtain: 1, charred: 1, fireproof: 1 };
  var SPONSORS = [
    ['THE LOONIES', '#b8860b', 'serif'], ["KAL'S MUFFLERS", '#c0392b', 'impact'], ['PRAIRIE POP', '#1f6fb2', 'round'], ['MOOSE JAW MUTUAL', '#2e7d32', 'serif'],
    ['MAPLE 100', '#c62828', 'impact'], ['CANOLA BROS.', '#d4a017', 'round'], ['TOQUE TELECOM', '#5e35b1', 'impact'], ['GOPHERWOOD', '#6d4c2f', 'serif'], ['MONOLITH', '#111111', 'impact']
  ];
  var CAM = {
    carpet: { tx: 0.2, ty: 1.45, tz: 0, halfW: 3.7, halfH: 1.6, dist: 8.8, lift: 0.9 },
    podium: { tx: STAGE_X, ty: STAGE_Y + 1.25, tz: 0, halfW: 3.75, halfH: 1.6, dist: 8.6, lift: 0.8 }
  };
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function hash01(i, salt) {
    var h = Math.imul((i + 1) ^ Math.imul(salt + 11, 0x9e3779b1), 0x85ebca6b);
    h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function copyLook(l) { return l ? JSON.parse(JSON.stringify(l)) : null; }   // build time only

  // ---- Public API --------------------------------------------------------------------------------------------------
  var A = R.carpet = {};
  var inst = null;
  var pending = { o: {}, mode: 'carpet', frame: { top: 0, bottom: -1 } };
  A.setup = function (o) { pending.o = o || {}; if (inst && inst.active) inst.people(); return !!(inst && inst.active); };
  A.setMode = function (m) { pending.mode = m === 'podium' ? 'podium' : 'carpet'; if (inst && inst.active) inst.mode(); };
  A.flash = function (n) { return !!(inst && inst.active && inst.flash(n || 4)); };
  A.envelope = function (won) { return !!(inst && inst.active && inst.envelope(won)); };
  A.setFrame = function (o) {
    o = o || {};
    if (typeof o.top === 'number') pending.frame.top = Math.max(0, o.top);
    if (typeof o.bottom === 'number') pending.frame.bottom = o.bottom;
    if (inst && inst.active) inst.frame(false);
  };
  A.info = function () { return inst ? inst.info() : { built: false }; };

  R.defineScene('carpet', function (ctx) {
    THREE = ctx.THREE;
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07070c);
    var K = null, P = null;           // K = the set (static), P = people (rebuilt by setup)
    var dummy = new THREE.Object3D(), zero = new THREE.Matrix4().makeScale(0, 0, 0);
    var camPos = new THREE.Vector3(), camTgt = new THREE.Vector3(), goalPos = new THREE.Vector3(), goalTgt = new THREE.Vector3();
    var T = { t: 0, mode: 'carpet', camK: 1, envelope: null, envT: 0, ambient: 0, fov: 40, goalFov: 40, offY: 0, goalOffY: 0 };

    function isShared(m) { var s = ctx.mats; return m === s.vc || m === s.skin || m === s.unlit || m === s.hidden; }
    function track(o) {
      if (o.geometry && K.geos.indexOf(o.geometry) < 0) K.geos.push(o.geometry);
      if (o.material && !isShared(o.material) && K.mats.indexOf(o.material) < 0) K.mats.push(o.material);
      return o;
    }
    function teardownPeople() {
      if (!P) return;
      for (var i = 0; i < P.chars.length; i++) P.chars[i].dispose();
      for (i = 0; i < P.geos.length; i++) P.geos[i].dispose();
      P = null;
    }
    function teardown() {
      teardownPeople();
      if (!K) return;
      scene.remove(K.root);
      for (var i = 0; i < K.geos.length; i++) K.geos[i].dispose();
      for (i = 0; i < K.mats.length; i++) K.mats[i].dispose();
      for (i = 0; i < K.texs.length; i++) K.texs[i].dispose();
      K = null;
    }

    // ---- The set (static) ------------------------------------------------------------------------------------------
    function wallTexture() {
      var c = document.createElement('canvas'); c.width = 1024; c.height = 512;
      var g = c.getContext('2d');
      g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, 1024, 512);
      var cw = 256, chh = 128;
      for (var r = 0; r < 4; r++) for (var k = 0; k < 4; k++) {
        var sp = SPONSORS[(r * 4 + k + (r % 2) * 2) % SPONSORS.length], x = k * cw + (r % 2) * cw / 2, y = r * chh + chh / 2;
        for (var wrap = -1; wrap <= 1; wrap++) {
          var xx = x + wrap * 1024 + cw / 2; if (xx < -cw || xx > 1024 + cw) continue;
          g.fillStyle = sp[1]; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.font = sp[2] === 'impact' ? '900 38px Impact, "Arial Black", sans-serif' : sp[2] === 'serif' ? 'italic 700 38px Georgia, "Times New Roman", serif' : '800 36px "Arial Rounded MT Bold", Arial, sans-serif';
          if (sp[0] === 'THE LOONIES') { g.beginPath(); g.arc(xx - 92, y, 16, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff'; g.font = '900 16px Georgia, serif'; g.fillText('1', xx - 92, y + 1); g.fillStyle = sp[1]; g.font = 'italic 700 30px Georgia, serif'; }
          g.fillText(sp[0], xx + (sp[0] === 'THE LOONIES' ? 14 : 0), y, cw - 30);
        }
      }
      var tex = new THREE.CanvasTexture(c); tex.wrapS = THREE.RepeatWrapping; tex.repeat.set(2.2, 1.15);
      K.texs.push(tex);
      return tex;
    }
    function drawSign(g, text) {
      var gr = g.createLinearGradient(0, 0, 0, 154);
      gr.addColorStop(0, '#2a1606'); gr.addColorStop(1, '#120a04'); g.fillStyle = gr; g.fillRect(0, 0, 1024, 154);
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'italic 900 ' + (text.length > 12 ? 76 : 92) + 'px Georgia, "Times New Roman", serif';
      g.lineWidth = 8; g.strokeStyle = '#6a4a10'; g.strokeText(text, 512, 80);
      g.fillStyle = '#ffd24a'; g.fillText(text, 512, 80);
      g.fillStyle = '#ffd24a'; g.beginPath(); g.arc(140, 78, 34, 0, Math.PI * 2); g.arc(884, 78, 34, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#2a1606'; g.font = '900 36px Georgia, serif'; g.fillText('1', 140, 80); g.fillText('1', 884, 80);
    }
    function signTexture() {
      var c = document.createElement('canvas'); c.width = 1024; c.height = 154;
      var g = c.getContext('2d'), text = pending.o.sign || 'The Loonies';
      drawSign(g, text);
      var tex = new THREE.CanvasTexture(c); K.texs.push(tex);
      K.sign = { g: g, tex: tex, text: text };
      return tex;
    }
    function resign() {   // v0.7: setup({ sign }) after the set is built redraws the marquee
      var text = pending.o.sign || 'The Loonies';
      if (!K || !K.sign || K.sign.text === text) return;
      drawSign(K.sign.g, text); K.sign.text = text; K.sign.tex.needsUpdate = true;
    }
    function buildSet() {
      var b = new ctx.Builder({ seed: 5 }), gl = new ctx.Builder({ seed: 6, jitter: 0 }), i, k;
      // Floor + red carpet + ropes
      b.box(80, 0.1, 30, 12, -0.05, 2, 0x16161c);
      b.box(16, 0.02, 2.2, 0, 0.01, 0.1, 0x9c1420); b.box(16, 0.021, 0.08, 0, 0.012, 1.2, 0xd4a940); b.box(16, 0.021, 0.08, 0, 0.012, -1.0, 0xd4a940);
      for (i = 0; i < 9; i++) {
        var px = -6 + i * 1.6;
        b.cyl(0.045, 0.045, 0.95, 8, px, 0.47, 1.75, 0xd4a940); b.cyl(0.07, 0.07, 0.06, 8, px, 0.96, 1.75, 0xe8c547); b.cyl(0.16, 0.18, 0.05, 10, px, 0.03, 1.75, 0xb8912e);
        if (i < 8) for (k = 0; k < 6; k++) { var u = (k + 0.5) / 6, sag = 0.18 * Math.sin(Math.PI * u); b.box(1.6 / 6 + 0.02, 0.05, 0.05, px + u * 1.6, 0.88 - sag, 1.75, 0x8a1020); }
      }
      // Step-and-repeat frame (the wall itself is a textured plane) + truss + uplights
      b.box(14.4, 0.14, 0.2, 0, 3.55, -1.62, 0x2a2a30); b.box(0.14, 3.6, 0.2, -7.2, 1.8, -1.62, 0x2a2a30); b.box(0.14, 3.6, 0.2, 7.2, 1.8, -1.62, 0x2a2a30);
      for (i = 0; i < 7; i++) { b.box(0.22, 0.16, 0.22, -6 + i * 2, 0.08, -1.3, 0x222228); gl.box(0.14, 0.02, 0.14, -6 + i * 2, 0.17, -1.3, 0xffd9a0); }
      // Marquee frame + bulbs around the sign above the wall (the sign itself is a textured plane)
      b.box(7.4, 1.25, 0.12, 0, 4.35, -1.72, 0x2a1d10);
      for (i = 0; i < 24; i++) { var mx = -3.55 + i * (7.1 / 23); gl.box(0.07, 0.07, 0.05, mx, 4.93, -1.64, 0xfff0b0); gl.box(0.07, 0.07, 0.05, mx, 3.77, -1.64, 0xfff0b0); }
      // Press pen: back rail + a sign
      b.box(4.2, 0.9, 0.08, -5.2, 0.45, 2.9, 0x2a2a30); b.box(4.2, 0.9, 0.08, 5.6, 0.45, 2.9, 0x2a2a30);
      b.box(1.4, 0.36, 0.04, -5.2, 1.1, 2.93, 0xe8e2d0); b.box(1.2, 0.08, 0.045, -5.2, 1.12, 2.95, 0x9c1420);
      // The stage (30 m right): floor, lip lights, curtains, giant loonie, lectern, audience heads
      b.at(STAGE_X, 0, 0, 0);
      b.box(9, STAGE_Y, 4.6, 0, STAGE_Y / 2, -0.4, 0x2a1d16); b.box(9.1, 0.06, 0.1, 0, STAGE_Y, 1.86, 0xd4a940);
      for (i = 0; i < 12; i++) gl.box(0.12, 0.06, 0.04, STAGE_X - 4.2 + i * 0.76, STAGE_Y - 0.12, 1.87, 0xfff0c0);
      for (i = 0; i < 22; i++) { var cx = -5.2 + i * 0.5; b.box(0.5, 5, 0.25, cx, 2.5, -2.8 + (i % 2) * 0.12, i % 2 ? 0x6e0d16 : 0x8a1420); }
      b.box(11, 0.8, 0.3, 0, 5.2, -2.4, 0x5a0a12);
      b.cyl(1.35, 1.35, 0.12, 11, 0, STAGE_Y + 2.45, -2.45, 0xc9a227, Math.PI / 2, 0, Math.PI / 22);   // the loonie (11 sides)
      b.cyl(1.15, 1.15, 0.13, 11, 0, STAGE_Y + 2.45, -2.43, 0xe0bb3a, Math.PI / 2, 0, Math.PI / 22);
      b.box(0.9, 0.22, 0.02, -0.05, STAGE_Y + 2.3, -2.35, 0x2a2016); b.box(0.28, 0.5, 0.02, 0.32, STAGE_Y + 2.55, -2.35, 0x2a2016, 0, 0, -0.35);   // the loon
      b.box(0.1, 0.06, 0.02, 0.5, STAGE_Y + 2.77, -2.35, 0x2a2016); b.box(1.3, 0.05, 0.02, 0, STAGE_Y + 2.12, -2.35, 0x2a2016);
      b.box(0.8, 1.15, 0.5, 0, STAGE_Y + 0.58, 0.3, 0x3a2a1e); b.box(0.84, 0.06, 0.56, 0, STAGE_Y + 1.18, 0.28, 0x2a1d16);
      b.cyl(0.26, 0.26, 0.03, 11, 0, STAGE_Y + 0.7, 0.56, 0xe0bb3a, Math.PI / 2, 0, Math.PI / 22);
      gl.box(0.03, 0.03, 0.3, 0.12, STAGE_Y + 1.35, 0.26, 0x404040);
      for (i = 0; i < 2; i++) for (k = 0; k < 16; k++) { var ax = -4.5 + k * 0.6 + (i % 2) * 0.3, ay = 0.18 + i * 0.16, az = 2.5 + i * 0.7; b.box(0.36, 0.3, 0.2, ax, ay, az, 0x0c0c12); b.cyl(0.1, 0.11, 0.2, 7, ax, ay + 0.27, az, [0x16161e, 0x1c1c26, 0x121218][(k + i) % 3]); }
      b.at(0, 0, 0, 0);
      var set = new THREE.Mesh(b.build(), ctx.mats.vc); K.root.add(track(set));
      var glow = new THREE.Mesh(gl.build(), ctx.mats.unlit); K.root.add(track(glow));
      var wall = new THREE.Mesh(new THREE.PlaneGeometry(14.2, 3.5), new THREE.MeshLambertMaterial({ map: wallTexture() }));
      wall.position.set(0, 1.78, -1.7); K.root.add(track(wall));
      var sign = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.05), new THREE.MeshBasicMaterial({ map: signTexture() }));
      sign.position.set(0, 4.35, -1.65); K.root.add(track(sign));
      // Photographers (instanced) + their flashes (instanced additive sprites-on-planes facing the camera)
      var pb = new ctx.Builder({ seed: 9 });
      pb.box(0.42, 0.7, 0.26, 0, 1.0, 0, 0x22222a); pb.box(0.36, 0.62, 0.24, 0, 0.35, 0, 0x18181e); pb.box(0.22, 0.24, 0.22, 0, 1.5, 0, 0xc9a07a);
      pb.box(0.2, 0.14, 0.14, 0, 1.46, 0.2, 0x0a0a0a); pb.box(0.08, 0.08, 0.12, 0, 1.46, 0.32, 0x333333); pb.box(0.1, 0.05, 0.08, 0, 1.58, 0.2, 0x0a0a0a);
      var photo = new THREE.InstancedMesh(pb.build(), ctx.mats.vc, N_PHOTO); photo.frustumCulled = false; K.root.add(track(photo));
      K.flashAt = new Float32Array(N_PHOTO * 3); K.flashV = new Float32Array(N_PHOTO); K.flashQ = new Float32Array(24);   // queued flash times
      for (i = 0; i < N_PHOTO; i++) {
        var left = i < N_PHOTO / 2, j = left ? i : i - N_PHOTO / 2;
        var x = left ? -2.4 - j * 0.46 : 2.6 + j * 0.46, z = 2.7 + (j % 2) * 0.35 + j * 0.08;
        var yaw = Math.atan2(0.3 - x, 0 - z);                     // face the carpet (their backs to us)
        dummy.position.set(x, 0, z); dummy.rotation.set(0, yaw, 0); dummy.scale.set(1, 0.95 + hash01(i, 3) * 0.12, 1); dummy.updateMatrix();
        photo.setMatrixAt(i, dummy.matrix);
        K.flashAt[i * 3] = x + Math.sin(yaw) * 0.42; K.flashAt[i * 3 + 1] = 1.5 * dummy.scale.y; K.flashAt[i * 3 + 2] = z + Math.cos(yaw) * 0.42;
      }
      photo.instanceMatrix.needsUpdate = true;
      var fm = new THREE.MeshBasicMaterial({ map: ctx.radialTexture('glow'), color: 0xfffaf0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
      var fl = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), fm, N_PHOTO); fl.instanceMatrix.setUsage(THREE.DynamicDrawUsage); fl.frustumCulled = false; fl.renderOrder = 3;
      for (i = 0; i < N_PHOTO; i++) fl.setMatrixAt(i, zero);
      K.root.add(track(fl)); K.flashes = fl;
      // Confetti (points; hidden until a win)
      var cg = new THREE.BufferGeometry(), pos = new Float32Array(N_CONF * 3), col = new Float32Array(N_CONF * 3), c3 = new THREE.Color();
      var CC = [0xe8c547, 0xff3b30, 0xffffff, 0x2e7d32, 0x4f8cff];
      for (i = 0; i < N_CONF; i++) { c3.setHex(CC[i % CC.length]); col[i * 3] = c3.r; col[i * 3 + 1] = c3.g; col[i * 3 + 2] = c3.b; }
      cg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); cg.setAttribute('color', new THREE.BufferAttribute(col, 3));
      cg.attributes.position.setUsage(THREE.DynamicDrawUsage);
      var conf = new THREE.Points(cg, new THREE.PointsMaterial({ size: 0.09, vertexColors: true })); conf.frustumCulled = false; conf.visible = false;
      K.root.add(track(conf)); K.conf = conf; K.confV = new Float32Array(N_CONF * 3); K.confT = 0;
      // Lights
      K.hemi = new THREE.HemisphereLight(0xfff2e0, 0x2a2030, 0.75); K.root.add(K.hemi);
      var key = new THREE.DirectionalLight(0xffffff, 0.8); key.position.set(2, 6, 7); K.root.add(key);
      var key2 = new THREE.DirectionalLight(0xffe0b0, 0.6); key2.position.set(STAGE_X - 3, 7, 6); key2.target.position.set(STAGE_X, 0, 0); K.root.add(key2); K.root.add(key2.target);
    }
    function build() {
      teardown();
      K = { root: new THREE.Group(), geos: [], mats: [], texs: [] };
      scene.add(K.root);
      buildSet();
      buildPeople();
      applyMode(true);
    }

    // ---- People --------------------------------------------------------------------------------------------------------
    var WRAITH_LOOKS = [
      { skin: '#eeece6', hair: '#0c0c0e', hairStyle: 'long', shirt: '#7a6a4e', pants: '#26262c', height: 1.08, build: 1.0, extras: [], top: 'flannel' },
      { skin: '#ecebe6', hair: '#0c0c0e', hairStyle: 'long', shirt: '#4e5e70', pants: '#222228', height: 1.0, build: 1.1, extras: ['glasses'], top: 'jacket' },
      { skin: '#efeee8', hair: '#101012', hairStyle: 'bald', shirt: '#6e3a3a', pants: '#26262c', height: 1.04, build: 1.15, extras: ['beard'], top: 'flannel' },
      { skin: '#eeede8', hair: '#0c0c0e', hairStyle: 'bun', shirt: '#5a6e4e', pants: '#222228', height: 0.96, build: 0.95, extras: [], top: 'jacket' }
    ];
    var HOST_LOOK = { skin: '#c99a74', hair: '#b8b8c0', hairStyle: 'short', shirt: '#1a1a24', pants: '#15151c', height: 1.02, build: 1.08, extras: ['moustache'], top: 'jacket' };
    function outfitLook(look, outfit, i) {
      var L = copyLook(look) || {};
      if (outfit === 'tux') { L.shirt = ['#15151b', '#1b1b24', '#121216'][i % 3]; L.pants = '#101014'; L.top = 'jacket'; }
      else if (outfit === 'jumpsuit') { L.shirt = '#e8702a'; L.pants = '#d8641f'; L.top = 'jacket'; }
      else if (outfit === 'robe') { L.shirt = ['#3a1f4a', '#4a1f2a', '#1f2a4a'][i % 3]; L.pants = L.shirt; L.top = 'jacket'; }
      else if (outfit === 'fur') { L.shirt = ['#7a5a3a', '#8a6a4a', '#5a4030'][i % 3]; L.top = 'jacket'; }
      else if (outfit === 'antlers') { L.shirt = '#2a2a30'; L.top = 'jacket'; L.extras = (L.extras || []).concat(['hat']); }
      return L;
    }
    function corpsePaint(ch, style) {
      var b = new ctx.Builder({ seed: 17 + style, jitter: 0 }), y = 0.295, z = 0.168, blk = 0x0b0b0d;
      b.box(0.1, 0.12, 0.012, 0.075, y, z, blk); b.box(0.1, 0.12, 0.012, -0.075, y, z, blk);             // eye sockets
      b.box(0.03, 0.08, 0.012, 0.09, y + 0.09, z, blk, 0, 0, -0.35); b.box(0.03, 0.08, 0.012, -0.09, y + 0.09, z, blk, 0, 0, 0.35);   // brow spikes
      b.box(0.02, 0.07, 0.012, 0.075, y - 0.1, z, blk); b.box(0.02, 0.07, 0.012, -0.075, y - 0.1, z, blk); // under-eye drips
      if (style % 2) b.box(0.1, 0.02, 0.012, 0, 0.165, z - 0.004, blk); else { b.box(0.02, 0.09, 0.012, 0.03, 0.14, z - 0.004, blk); b.box(0.02, 0.09, 0.012, -0.03, 0.14, z - 0.004, blk); }
      var m = new THREE.Mesh(b.build(), ctx.mats.vc);
      ch.bones[B_HEAD].add(m);
      P.geos.push(m.geometry);
    }
    function envelopeMesh(ch) {
      var b = new ctx.Builder({ seed: 23, jitter: 0 });
      b.box(0.2, 0.13, 0.015, 0, -0.1, 0.06, 0xf4f0e6); b.box(0.04, 0.04, 0.02, 0, -0.1, 0.07, 0xb3141c);
      var m = new THREE.Mesh(b.build(), ctx.mats.vc);
      ch.bones[B_HELD].add(m);
      P.geos.push(m.geometry);
      return m;
    }
    function contentMember(band, id) { var l = band && band.members || []; for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; }
    function person(look, opts, kind, i) {
      var ch = R.buildCharacter(look, opts);
      if (!ch) return null;
      ch.bones[B_PHONES].scale.setScalar(0); ch.bones[B_FLOOR].scale.setScalar(0);
      if (!opts.gear) ch.bones[B_GEAR].scale.setScalar(0);
      K.root.add(ch.root);
      P.chars.push(ch);
      var rec = { ch: ch, id: opts.id, kind: kind, i: i, x: 0, z: 0, x0: 0, cx: 0, cz: 0, px: 0, pz: 0, delay: 0, walk: 0, arrived: false,
        ph: hash01(i, kind === 'band' ? 31 : 37) * 6.28, cape: !!opts.cape, pose: 0, yaw: 0 };
      P.list.push(rec);
      return rec;
    }
    function buildPeople() {
      teardownPeople();
      if (!K) return;
      var o = pending.o || {}, st = GG.state || {}, band = GG.content && GG.content.bands && GG.content.bands[st.bandId || 'hail_damage'];
      var flags = o.flags || st.flags || {}, cv = flags.cape, outfit = o.outfit || null;
      var cape = typeof cv === 'string' && cv !== 'none' ? (CAPE_OK[cv] ? cv : 'velvet') : outfit === 'cape' ? 'velvet' : null;
      P = { chars: [], geos: [], list: [], band: [], rival: [], host: null, env: null };
      var mem = (o.members || st.members || (band && band.members) || []).filter(function (m) { return m && (!m.status || m.status === 'active'); }).slice(0, 5);
      var pl = o.player || st.player || {}, preset = GG.content && GG.content.presets && pl.presetId ? GG.content.presets.filter(function (x) { return x.id === pl.presetId; })[0] : null;
      var stageLook = function (m, cm) { return GG.creator ? GG.creator.stageLookFor(m, cm) : null; };   // v0.8: stage looks on the carpet
      var pLook = stageLook(pl) || pl.look || (preset && preset.look) || null;
      if (pLook && pLook.outfit && outfit && outfit !== 'cape') { pLook = copyLook(pLook); delete pLook.outfit; }   // the band's outfit card wins
      var roster = [{ id: 'player', look: pLook }].concat(mem);
      var capeId = null;
      for (var i = 0; i < roster.length; i++) if (roster[i].id === 'marcel') capeId = 'marcel';
      if (!capeId) for (i = 0; i < roster.length; i++) if (/vocal/i.test(roster[i].role || '')) { capeId = roster[i].id; break; }
      var n = roster.length, spread = n > 5 ? 0.68 : 0.76;
      for (i = 0; i < n; i++) {
        var m = roster[i], cm = contentMember(band, m.id), look = outfitLook((m.id !== 'player' && stageLook(m, cm)) || m.look || (cm && cm.look) || null, outfit, i);
        var rec = person(look, { id: m.id, scale: SCALE, cape: m.id === capeId ? cape : null }, 'band', i);
        if (!rec) continue;
        rec.cx = -3.05 + i * spread; rec.cz = 0.2 - (i % 2) * 0.28;
        rec.px = STAGE_X - 3.35 + i * 0.5; rec.pz = 0.5 - (i % 2) * 0.35;
        rec.x0 = -6.2 - i * 0.55; rec.delay = i * 0.14;
        P.band.push(rec);
      }
      for (i = 0; i < 4; i++) {
        var w = person(copyLook(WRAITH_LOOKS[i]), { id: 'wraith' + i, scale: SCALE }, 'rival', i);
        if (!w) continue;
        corpsePaint(w.ch, i);
        w.cx = 1.45 + i * 0.62; w.cz = -0.5 + (i % 2) * 0.22;
        w.px = STAGE_X + 1.25 + i * 0.52; w.pz = 0.3 - (i % 2) * 0.35;
        w.x0 = w.cx; w.arrived = true;
        P.rival.push(w);
      }
      var h = person(copyLook(HOST_LOOK), { id: 'host', scale: SCALE }, 'host', 0);
      if (h) { h.cx = h.px = STAGE_X; h.cz = h.pz = -0.25; h.x0 = STAGE_X; h.arrived = true; P.host = h; P.env = envelopeMesh(h.ch); }
      T.t = 0; T.envelope = null; T.envT = 0;
      placeAll(true);
    }
    function placeAll(snap) {
      if (!P) return;
      var pod = T.mode === 'podium';
      for (var i = 0; i < P.list.length; i++) {
        var r = P.list[i];
        if (r.kind === 'host') { r.ch.root.position.set(STAGE_X, pod ? STAGE_Y : -50, -0.25); r.ch.root.visible = pod; continue; }
        if (pod) { r.x = r.px; r.z = r.pz; r.arrived = true; r.ch.root.position.set(r.x, STAGE_Y, r.z); r.yaw = r.kind === 'band' ? 0.25 : -0.25; }
        else {
          if (snap) { r.x = r.kind === 'band' ? r.x0 : r.cx; r.z = r.cz; r.walk = 0; r.arrived = r.kind !== 'band'; }
          r.ch.root.position.set(r.x, 0, r.z); r.yaw = r.arrived ? (r.kind === 'rival' ? -0.2 : 0.1) : Math.PI / 2;
        }
        r.ch.root.rotation.y = r.yaw;
      }
    }

    // ---- Camera --------------------------------------------------------------------------------------------------------
    function goal() {
      var c = CAM[T.mode], sz = ctx.size(), F = pending.frame, W = sz.w, H = sz.h;
      var top = F.top || 0, bottom = F.bottom < 0 ? Math.round(H * 0.3) : F.bottom, bandH = Math.max(80, H - top - bottom);
      var tb = Math.max(c.halfH / c.dist, (c.halfW / c.dist) * bandH / W);
      T.goalFov = 2 * Math.atan(tb * H / bandH) * 180 / Math.PI;
      T.goalOffY = Math.round(H / 2 - (top + bandH / 2));
      goalTgt.set(c.tx, c.ty, c.tz); goalPos.set(c.tx, c.ty + c.lift, c.tz + c.dist);
    }
    function applyCam() {
      var cam = ctx.camera, sz = ctx.size();
      cam.fov = T.fov; cam.aspect = sz.w / sz.h; cam.near = 0.1; cam.far = 200;
      cam.setViewOffset(sz.w, sz.h, 0, T.offY, sz.w, sz.h); cam.updateProjectionMatrix();
      cam.position.copy(camPos); cam.lookAt(camTgt); cam.updateMatrixWorld();
    }
    function frame(snap) {
      goal();
      if (snap) { camPos.copy(goalPos); camTgt.copy(goalTgt); T.fov = T.goalFov; T.offY = T.goalOffY; }
      else { T.offY = T.goalOffY; }
      applyCam();
    }
    function applyMode(snap) {
      T.mode = pending.mode;
      placeAll(true);
      if (P && P.env) P.env.visible = true;
      frame(snap);
    }

    // ---- Per frame -----------------------------------------------------------------------------------------------------
    function flashOne(i, v) {   // v0.6.1 reduced flashing (GG.render.prefs().calm): camera flashes at a third, soft
      if (GG.render && GG.render.prefs && GG.render.prefs().calm) v *= 0.3;
      if (K) K.flashV[i] = Math.max(K.flashV[i], v);
    }
    function spawnConfetti() {
      var p = K.conf.geometry.attributes.position.array, v = K.confV;
      for (var i = 0; i < N_CONF; i++) {
        p[i * 3] = STAGE_X + (hash01(i, 41) - 0.5) * 6; p[i * 3 + 1] = 5 + hash01(i, 42) * 2; p[i * 3 + 2] = (hash01(i, 43) - 0.3) * 2.5;
        v[i * 3] = (hash01(i, 44) - 0.5) * 0.6; v[i * 3 + 1] = -0.6 - hash01(i, 45) * 0.9; v[i * 3 + 2] = (hash01(i, 46) - 0.5) * 0.4;
      }
      K.conf.geometry.attributes.position.needsUpdate = true; K.conf.visible = true; K.confT = 6;
    }
    function pose(r, t, dt) {
      var bn = r.ch.bones, s = Math.sin(t * 2 + r.ph), won = T.envelope === true, lost = T.envelope === false, pod = T.mode === 'podium';
      var aLx = 0, aLz = 0.08, aRx = 0, aRz = -0.08, fL = 0, fR = 0, lL = 0, lR = 0, hop = 0, spine = 0, head = 0.05 * s;
      if (!r.arrived) {                                                     // walking in
        var w = r.walk * 6.2;
        lL = Math.sin(w) * 0.5; lR = -lL; aLx = -lL * 0.5; aRx = lL * 0.5; hop = Math.abs(Math.cos(w)) * 0.03;
      } else if (r.kind === 'host') {
        var raise = T.envelope === null ? 0 : clamp(T.envT * 2, 0, 1);
        aRx = -0.9 - raise * 0.8; fR = -0.6; aLx = -0.3; head = 0.05 * s;
      } else if (r.kind === 'band') {
        if (pod && won) { aLz = 2.6 + 0.2 * Math.sin(t * 9 + r.ph); aRz = -aLz; hop = Math.max(0, Math.sin(t * 8 + r.ph)) * 0.18; }
        else if (pod && lost) { var c = Math.sin(t * 11 + r.ph); aLx = -1.1; aRx = -1.1; aLz = -0.35 - c * 0.12; aRz = 0.35 + c * 0.12; fL = -0.4; fR = -0.4; }
        else {
          var k = ((Math.floor((t + r.ph * 2) / 3.2) + r.i) % 4);            // photo poses: horns, point, hip, stand
          if (k === 0) { aLz = 2.4; aRz = -2.4; }
          else if (k === 1) { aRx = -1.5; aRz = -0.2; }
          else if (k === 2) { aLz = 0.6; fL = -1.3; aRz = -0.6; fR = 1.3; }
          if (r.cape && T.mode === 'carpet') { r.ch.root.rotation.y = r.yaw + Math.sin(t * 1.6) * 0.9; aLz = 1.3; aRz = -1.3; }
        }
      } else {                                                             // Tundra Wraith: polite
        if (pod && lost) { aLz = 1.6 + 0.2 * s; aRz = -1.6 - 0.2 * s; }
        else if (r.i === 0) { aRz = -2.3; fR = 0.5 * Math.sin(t * 7); }     // the frontman waves, buddy
        else { aLx = -0.6; aRx = -0.6; aLz = -0.4; aRz = 0.4; fL = -1.1; fR = -1.1; }   // hands folded, very polite
        spine = 0.04 * s;
      }
      bn[B_ARM_L].rotation.set(aLx, 0, aLz); bn[B_ARM_R].rotation.set(aRx, 0, aRz);
      bn[B_FORE_L].rotation.set(fL < 0 ? fL : 0, 0, fL > 0 ? fL : 0); bn[B_FORE_R].rotation.set(fR < 0 ? fR : 0, 0, fR > 0 ? -fR : 0);
      bn[B_LEG_L].rotation.x = lL; bn[B_LEG_R].rotation.x = lR; bn[B_SHIN_L].rotation.x = lL < 0 ? -lL * 0.8 : 0; bn[B_SHIN_R].rotation.x = lR < 0 ? -lR * 0.8 : 0;
      bn[B_SPINE].rotation.x = spine; bn[B_HEAD].rotation.y = head;
      bn[B_HIPS].position.y = 0.86 + hop;
      if (r.cape) { bn[B_CAPE1].rotation.x = 0.15 + 0.1 * Math.sin(t * 3); bn[B_CAPE2].rotation.x = 0.2 + 0.15 * Math.sin(t * 3 + 1); }
    }
    function update(dt, t) {
      if (!K) return;
      T.t += dt;
      // camera ease
      var k = 1 - Math.exp(-dt * 3);
      if (camPos.distanceToSquared(goalPos) > 1e-6 || Math.abs(T.fov - T.goalFov) > 0.01) {
        camPos.lerp(goalPos, k); camTgt.lerp(goalTgt, k); T.fov += (T.goalFov - T.fov) * k; applyCam();
      }
      // people
      if (P) {
        for (var i = 0; i < P.list.length; i++) {
          var r = P.list[i];
          if (!r.arrived && T.mode === 'carpet') {
            var go = T.t - r.delay;
            if (go > 0) {
              r.walk += dt * 0.9;
              r.x += dt * 2.5;
              if (r.x >= r.cx) { r.x = r.cx; r.arrived = true; r.yaw = 0.1; r.ch.root.rotation.y = r.yaw; flashOne((i * 3) % N_PHOTO, 1); flashOne((i * 7 + 2) % N_PHOTO, 0.9); }
              r.ch.root.position.x = r.x;
            }
          }
          pose(r, T.t, dt);
        }
        if (T.envelope !== null) T.envT += dt;
      }
      // ambient flashes on the carpet
      if (T.mode === 'carpet') { T.ambient -= dt; if (T.ambient <= 0) { T.ambient = 0.18 + hash01((T.t * 100) | 0, 51) * 0.7; flashOne(((T.t * 37) | 0) % N_PHOTO, 0.7 + hash01((T.t * 13) | 0, 52) * 0.3); } }
      for (i = 0; i < K.flashQ.length; i++) if (K.flashQ[i] > 0) { K.flashQ[i] -= dt; if (K.flashQ[i] <= 0) flashOne(i % N_PHOTO, 1); }
      var any = false, peak = 0;
      for (i = 0; i < N_PHOTO; i++) {
        var v = K.flashV[i];
        if (v > 0) {
          v = Math.max(0, v - dt * 7); K.flashV[i] = v; any = true; if (v > peak) peak = v;
          dummy.position.set(K.flashAt[i * 3], K.flashAt[i * 3 + 1], K.flashAt[i * 3 + 2]); dummy.rotation.set(0, 0, 0);
          var sc = 0.3 + v * 1.4; dummy.scale.set(sc, sc, sc); dummy.updateMatrix(); K.flashes.setMatrixAt(i, dummy.matrix);
        } else if (v === 0) { K.flashes.setMatrixAt(i, zero); K.flashV[i] = -1; any = true; }
      }
      if (any) K.flashes.instanceMatrix.needsUpdate = true;
      K.hemi.intensity = 0.75 + peak * 0.35;
      // confetti
      if (K.confT > 0) {
        K.confT -= dt;
        var p = K.conf.geometry.attributes.position.array, cv = K.confV;
        for (i = 0; i < N_CONF; i++) {
          p[i * 3] += (cv[i * 3] + Math.sin(T.t * 3 + i) * 0.3) * dt; p[i * 3 + 1] += cv[i * 3 + 1] * dt; p[i * 3 + 2] += cv[i * 3 + 2] * dt;
          if (p[i * 3 + 1] < STAGE_Y) p[i * 3 + 1] = STAGE_Y;
        }
        K.conf.geometry.attributes.position.needsUpdate = true;
        if (K.confT <= 0) K.conf.visible = false;
      }
    }
    function flash(n) {
      if (!K) return false;
      var q = K.flashQ, c = 0;
      for (var i = 0; i < q.length && c < n; i++) if (q[i] <= 0) { q[i] = 0.05 + c * 0.11 + hash01(i + ((T.t * 10) | 0), 61) * 0.1; c++; }
      return true;
    }
    function envelope(won) {
      if (!K) return false;
      T.envelope = won === true ? true : won === false ? false : null; T.envT = 0;
      if (T.envelope === true) spawnConfetti();
      if (T.envelope === null && K.conf) { K.conf.visible = false; K.confT = 0; }
      return true;
    }

    var shell = {
      scene: scene,
      enter: function () { if (!K) build(); inst.active = true; frame(true); },
      exit: function () {
        inst.active = false; teardown();
        var cam = ctx.camera; cam.near = 0.1; cam.far = 120; cam.clearViewOffset(); cam.updateProjectionMatrix();
      },
      resize: function () { if (K) frame(true); },
      update: update,
      sync: function () {},
      debug: function () { return { carpet: inst.info() }; }
    };
    inst = {
      active: false,
      people: function () { if (K) { resign(); buildPeople(); placeAll(true); } },
      mode: function () { if (K) applyMode(false); },
      flash: flash, envelope: envelope,
      frame: function (snap) { if (K) frame(!!snap); },
      info: function () {
        if (!K) return { built: false };
        return { built: true, mode: T.mode, band: P ? P.band.map(function (r) { return r.id; }) : [], rival: P ? P.rival.length : 0, host: !!(P && P.host),
          cape: !!(P && P.band.some(function (r) { return r.cape; })), walking: P ? P.band.filter(function (r) { return !r.arrived; }).length : 0,
          envelope: T.envelope, confetti: K.conf.visible, sign: K.sign ? K.sign.text : null, geos: K.geos.length + (P ? P.geos.length : 0), mats: K.mats.length, texs: K.texs.length };
      }
    };
    return shell;
  });
})(window.GG);
