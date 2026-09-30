// 45_render_creator.js (v0.8 "Kit", lane CREATOR): the character creator's live 3D preview. A small WebGLRenderer of its
// own on a canvas inside the creator screen: the main loop is paused under full screens and has no career during a new
// career, so the preview never touches it. It reuses the one character builder (R.buildCharacter -> R.charGeometry) and
// the garage kit builder (R.kit.garage), so what you see here is what the garage, the stage and the carpet draw.
// API (GG.render.preview), safe before GG.render.init() (mount returns false without WebGL):
//   mount(el) -> bool ; set({ look, kit, mode: 'char'|'kit', view: 'full'|'face'|'hands', band, genre }) ; turn(dx) ;
//   unmount() ; info() -> { mounted, mode, view, frames, v8, kit, art, calls, pose }
// Views: 'full' (turntable, drag to turn), 'face' (close-up), 'hands' (fists to the camera: the knuckle letters read left
// to right, right hand first). Kit mode: the garage kit on a rug, pyro bases + flames shown (they only fire at arena shows).
(function (GG) {
  var R = GG.render;
  if (!R) return;
  var B_ARM_L = 4, B_FORE_L = 5, B_ARM_R = 6, B_FORE_R = 7, B_HEAD = 3, B_SPINE = 2, B_GEAR = 14, B_PHONES = 15, B_HELD = 16, B_FLOOR = 17, B_CAPE1 = 12, B_CAPE2 = 13;
  var P = R.preview = {};
  var V = null;              // live view: { THREE, renderer, scene, camera, host, canvas, ch, kit, art, raf, ... }
  var want = { look: null, kit: null, mode: 'char', view: 'full', band: '', genre: 'metal' };
  var CAMS = {
    full: { pos: [0, 1.1, 4.3], at: [0, 1.0, 0] },
    face: { pos: [0, 1.76, 1.75], at: [0, 1.73, 0] },
    hands: { pos: [0, 1.0, 1.85], at: [0, 0.88, 0] },
    kit: { pos: [0.7, 1.95, 4.3], at: [0, 0.62, -0.1] }
  };

  P.mount = function (el) {
    P.unmount();
    var ctx = R.util && R.util.ctx && R.util.ctx();
    if (!el || !ctx || !window.THREE) return false;
    var THREE = window.THREE, canvas = document.createElement('canvas'), renderer;
    canvas.className = 'lk-canvas';
    try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'low-power' }); }
    catch (e) { return false; }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    el.appendChild(canvas);
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x141a2a);
    scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x3b2d22, 0.95));
    var key = new THREE.DirectionalLight(0xfff2dc, 0.85); key.position.set(-2.2, 3.4, 3.2); scene.add(key);
    var rim = new THREE.DirectionalLight(0x8fb0ff, 0.35); rim.position.set(2.5, 2.2, -2.5); scene.add(rim);
    var fb = new ctx.Builder({ jitter: 0.02, seed: 3 });
    fb.cyl(1.25, 1.3, 0.06, 28, 0, -0.03, 0, 0x2a3350); fb.cyl(1.0, 1.0, 0.012, 28, 0, 0.004, 0, 0x34426a);
    var floor = new THREE.Mesh(fb.build(), ctx.mats.vc); scene.add(floor);
    var camera = new THREE.PerspectiveCamera(30, 1, 0.05, 40);
    V = { THREE: THREE, ctx: ctx, renderer: renderer, scene: scene, camera: camera, host: el, canvas: canvas, floor: floor,
      ch: null, kit: null, art: null, flames: null, yaw: 0.42, sig: '', frames: 0, t: 0, last: 0, drag: null, raf: 0, w: 0, h: 0 };
    bindDrag(canvas);
    apply();
    V.raf = requestAnimationFrame(frame);
    return true;
  };
  P.unmount = function () {
    if (!V) return;
    cancelAnimationFrame(V.raf);
    clearChar(); clearKit();
    V.floor.geometry.dispose();
    try { V.renderer.dispose(); if (V.renderer.forceContextLoss) V.renderer.forceContextLoss(); } catch (e) {}
    if (V.canvas.parentNode) V.canvas.parentNode.removeChild(V.canvas);
    V = null;
  };
  P.set = function (o) {
    o = o || {};
    for (var k in o) if (o[k] !== undefined) want[k] = o[k];
    if (V) apply();
  };
  P.turn = function (dx) { if (V) V.yaw += dx; };
  P.info = function () {
    return { mounted: !!V, mode: want.mode, view: want.view, frames: V ? V.frames : 0, v8: !!(GG.creator && GG.creator.isV8(want.look)),
      kit: !!(V && V.kit), art: !!(V && V.art), calls: V ? V.renderer.info.render.calls : 0, pose: V && V.ch ? V.pose : null };
  };

  function clearChar() { if (V && V.ch) { V.ch.dispose(); V.ch = null; } }
  function clearKit() {
    if (!V) return;
    if (V.kit) { V.scene.remove(V.kit); V.kit.geometry.dispose(); V.kit = null; }
    if (V.art) { R.kit.disposeArt(V.art); V.art = null; }
    if (V.flames) { V.scene.remove(V.flames); V.flames.geometry.dispose(); V.flames = null; }
  }
  // Rebuilds only what changed (look -> character, kit look -> kit).
  function apply() {
    var THREE = V.THREE, kitMode = want.mode === 'kit';
    var sig = JSON.stringify([want.look, want.view === 'hands']);
    if (!kitMode && (sig !== V.sig || !V.ch)) {
      clearChar();
      V.sig = sig;
      V.ch = R.buildCharacter(want.look, { id: 'player' });
      if (V.ch) {
        var bn = V.ch.bones;
        bn[B_GEAR].scale.setScalar(0); bn[B_PHONES].scale.setScalar(0); bn[B_HELD].scale.setScalar(0); bn[B_FLOOR].scale.setScalar(0);
        V.scene.add(V.ch.root);
      }
    }
    if (V.ch) V.ch.root.visible = !kitMode;
    var ksig = kitMode ? JSON.stringify([want.kit, want.band, want.genre, want.look && want.look.skin]) : '';
    if (kitMode && ksig !== V.ksig) {
      clearKit();
      V.ksig = ksig;
      var K = R.kit.norm(want.kit, (want.kit && want.kit.color) || '#b3262b');
      var built = R.kit.garage(V.ctx, K, { preview: true, band: want.band, genre: want.genre, look: want.look });
      V.kit = new THREE.Mesh(built.geo, V.ctx.mats.vc);
      V.kit.rotation.y = 0.35;
      if (built.art) { V.art = built.art; V.kit.add(V.art); }
      V.scene.add(V.kit);
      if (R.kit.has(K, 'pyro')) {                                                  // a frozen burst so you can see it
        var b = new V.ctx.Builder({ jitter: 0 });
        [-0.95, 0.95].forEach(function (x) { R.kit.flame(b, x, 0.28, 0.55, 0.85); });
        V.flames = new THREE.Mesh(b.build(), V.ctx.mats.unlit); V.flames.rotation.y = 0.35; V.scene.add(V.flames);
      }
    }
    if (!kitMode) { clearKit(); V.ksig = ''; }
  }

  function bindDrag(c) {
    c.addEventListener('pointerdown', function (e) { if (V) { V.drag = { x: e.clientX, id: e.pointerId }; try { c.setPointerCapture(e.pointerId); } catch (x) {} } });
    c.addEventListener('pointermove', function (e) { if (V && V.drag && V.drag.id === e.pointerId) { V.yaw += (e.clientX - V.drag.x) * 0.012; V.drag.x = e.clientX; } });
    var up = function () { if (V) V.drag = null; };
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
  }

  function resize() {
    var w = Math.max(1, V.host.clientWidth | 0), h = Math.max(1, V.host.clientHeight | 0);
    if (w === V.w && h === V.h) return;
    V.w = w; V.h = h;
    V.renderer.setSize(w, h, false);
    V.canvas.style.width = w + 'px'; V.canvas.style.height = h + 'px';
    V.camera.aspect = w / h; V.camera.updateProjectionMatrix();
  }
  function frame(ts) {
    if (!V) return;
    V.raf = requestAnimationFrame(frame);
    if (document.hidden) return;
    var dt = V.last ? Math.min(0.05, (ts - V.last) / 1000) : 0.016;
    V.last = ts; V.t += dt;
    resize();
    var kitMode = want.mode === 'kit', view = kitMode ? 'kit' : (want.view || 'full');
    var s = V.ch ? V.ch.root.scale.y : 1, cam = CAMS[view] || CAMS.full, lift = view === 'kit' ? 1 : s;
    var fit = Math.max(1, 0.8 / Math.max(0.3, V.camera.aspect));                      // a narrow preview backs the camera off
    V.camera.position.set(cam.pos[0], cam.pos[1] * lift, cam.pos[2] * (view === 'full' || view === 'kit' ? fit : 1));
    V.camera.lookAt(cam.at[0], cam.at[1] * lift, cam.at[2]);
    if (V.ch && !kitMode) pose(V.ch, view, V.t);
    if (V.kit) { V.kit.rotation.y = 0.35 + (V.yaw - 0.42); if (V.flames) { V.flames.rotation.y = V.kit.rotation.y; V.flames.scale.y = 0.9 + 0.1 * Math.sin(V.t * 30); } }
    V.renderer.render(V.scene, V.camera);
    V.frames++;
  }
  // Idle / fists poses. 'hands': the arms turn so the backs of the hands (the knuckles) face the camera.
  function pose(ch, view, t) {
    var bn = ch.bones, i;
    for (i = 1; i < bn.length; i++) bn[i].rotation.set(0, 0, 0);
    ch.root.rotation.y = view === 'hands' ? 0 : view === 'face' ? V.yaw * 0.6 : V.yaw;
    var br = Math.sin(t * 1.8);
    bn[B_SPINE].rotation.x = 0.015 * br;
    if (view === 'hands') {
      bn[B_ARM_L].rotation.set(-0.15, -Math.PI / 2, 0.02); bn[B_ARM_R].rotation.set(-0.15, Math.PI / 2, -0.02);
      bn[B_FORE_L].rotation.set(0, 0, 0.35); bn[B_FORE_R].rotation.set(0, 0, -0.35);   // elbows bend forward (local z = world ∓x here)
      V.pose = 'fists';
    } else {
      bn[B_ARM_L].rotation.z = 0.1; bn[B_ARM_R].rotation.z = -0.1;
      bn[B_FORE_L].rotation.x = -0.12; bn[B_FORE_R].rotation.x = -0.12;
      bn[B_HEAD].rotation.y = 0.12 * Math.sin(t * 0.5);
      V.pose = 'idle';
    }
    var cape = want.look && want.look.stageExtras && want.look.stageExtras.indexOf('cape') >= 0;
    bn[B_CAPE1].rotation.x = cape ? 0.08 + 0.03 * Math.sin(t * 1.3) : 0; bn[B_CAPE2].rotation.x = cape ? 0.04 + 0.03 * Math.sin(t * 1.7 + 1) : 0;
  }
})(window.GG);
