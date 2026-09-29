// 40_render_core.js: three.js renderer, frame loop, camera, tap input, scene registry, shared helpers.
// Scenes register a factory with GG.render.defineScene(name, factory) — 41_render_garage.js now; stage,
// van, red carpet later. The core owns what they share: ONE WebGLRenderer, ONE PerspectiveCamera, ONE rAF
// loop (skipped while paused), resize/orientation, tap raycasting (labels, then hotspots/members, then the
// floor), the walk-target ring, label sprites and a mesh builder that merges primitives into one draw call.
// init() never throws: without THREE (offline) or WebGL it returns false and GG.render.available stays false.
//
// A scene factory receives `ctx` (see makeCtx) and returns:
//   { scene: THREE.Scene,                       required
//     enter(), exit(), resize(w, h), update(dt, t), sync(state),
//     labels: [Sprite], pickables: [Object3D],  userData.action (hotspot) or userData.memberId (bandmate)
//     floorY: number|null, onTap(hit),          hit = { type:'hotspot', action } | { type:'member', id } | { type:'floor', x, z }
//     anchor(kind, id, outVec3) -> bool,        world point; kind 'hotspot' | 'label' | 'member' | 'player'
//     goToHotspot(action) -> bool, debug() -> {} merged into GG.debug('render') }
(function (GG) {
  var R = GG.render = GG.render || {};
  var THREE = null;                       // resolved in init(); the CDN script may be missing

  R.available = false;

  // ---- Tunables ------------------------------------------------------------
  var TAP_SLOP = 12;                      // CSS px a finger may drift and still count as a tap
  var TAP_MS = 650;                       // longer presses are not taps
  var MAX_DT = 0.1;                       // clamp frame delta (tab switches, hitches)
  var LABEL_FONT = '800 40px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

  // ---- Core state ----------------------------------------------------------
  var renderer = null, camera = null, container = null, canvas = null, raycaster = null;
  var factories = {}, built = {};         // scene factories / built scene objects, by name
  var cur = null, curName = 'none';
  var paused = false, rafId = 0, lastTs = 0, clock = 0, frames = 0;
  var W = 1, H = 1, needsResize = true, contextLost = false;
  var insets = { top: 56, bottom: -1 };   // bottom -1 = default (30% of the height, where UI sheets sit)
  var lastState = null;
  var drawCalls = 0, triangles = 0;
  var labels = [];                        // every label sprite made by makeLabel (rescaled on resize)
  var down = { id: -1, x: 0, y: 0, t: 0, moved: false };
  var hits = [];                          // reused raycast result array
  var ctx = null;

  // Camera rig: fitCamera() picks a distance + view offset; placeCamera() moves it each frame.
  var rig = { dir: null, target: null, dist: 10, goalDist: 10, offX: 0, offY: 0, goalOffX: 0, goalOffY: 0, snap: true };

  // Temporaries (created in init, reused everywhere; nothing is allocated per frame).
  var tmpV, tmpV2, ndc, floorPlane;

  // ---- Scene registry --------------------------------------------------------
  R.defineScene = function (name, factory) { factories[name] = factory; };
  R.sceneNames = function () { return Object.keys(factories); };

  // ---- init ------------------------------------------------------------------
  R.init = function (el) {
    if (R.available) return true;
    try {
      THREE = typeof window !== 'undefined' ? window.THREE : null;
      if (!THREE || !THREE.WebGLRenderer || !el) return fail('three.js not loaded');
      var dpr = window.devicePixelRatio || 1;
      renderer = new THREE.WebGLRenderer({ antialias: dpr < 2, alpha: false, powerPreference: 'default' });
      renderer.setPixelRatio(Math.min(2, dpr));
      renderer.setClearColor(0x0b1020, 1);
      container = el;
      canvas = renderer.domElement;
      canvas.style.display = 'block'; canvas.style.width = '100%'; canvas.style.height = '100%';
      canvas.style.touchAction = 'none';
      container.appendChild(canvas);

      camera = new THREE.PerspectiveCamera(34, 1, 0.1, 120);
      raycaster = new THREE.Raycaster();
      tmpV = new THREE.Vector3(); tmpV2 = new THREE.Vector3(); ndc = new THREE.Vector2();
      floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      rig.dir = new THREE.Vector3(0, 0.7, 0.7).normalize(); rig.target = new THREE.Vector3();

      ctx = makeCtx();
      bindInput();
      window.addEventListener('resize', onResize);
      window.addEventListener('orientationchange', function () { onResize(); setTimeout(onResize, 300); });
      if (window.ResizeObserver) new ResizeObserver(onResize).observe(container);
      canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); contextLost = true; });
      canvas.addEventListener('webglcontextrestored', function () { contextLost = false; });

      R.available = true;
      applyResize();
      if (curName !== 'none') { var want = curName; curName = 'none'; R.setScene(want); }
      return true;
    } catch (e) {
      return fail(e && e.message);
    }
  };

  function fail(why) {
    R.available = false;
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    try { if (renderer) renderer.dispose(); } catch (e) { /* already broken */ }
    renderer = null; canvas = null;
    if (typeof console !== 'undefined') console.warn('[render] 3D unavailable: ' + (why || 'unknown'));
    return false;
  }

  // ---- Scenes ----------------------------------------------------------------
  // setScene('garage') builds the scene on first use (kept afterwards); 'none' stops drawing.
  R.setScene = function (name) {
    name = name || 'none';
    if (!R.available) { curName = name; return false; }  // remembered; applied by init()
    if (name === curName && (cur || name === 'none')) return true;
    if (cur && cur.exit) cur.exit();
    cur = null; curName = 'none';
    if (name === 'none') { canvas.style.visibility = 'hidden'; ring.attach(null); return true; }
    if (!built[name]) {
      if (!factories[name]) { console.warn('[render] unknown scene ' + name); return false; }
      try { built[name] = factories[name](ctx); } catch (e) { console.error('[render] scene "' + name + '" failed to build:', e); return false; }
    }
    cur = built[name]; curName = name;
    canvas.style.visibility = 'visible';
    ring.attach(cur.scene);
    if (cur.resize) cur.resize(W, H, false);
    rescaleLabels();
    if (lastState && cur.sync) safeSync(lastState);
    if (cur.enter) cur.enter();
    schedule();
    return true;
  };

  R.syncState = function (state) {
    lastState = state || null;
    if (cur && cur.sync && lastState) safeSync(lastState);
  };
  function safeSync(state) {
    try { cur.sync(state); } catch (e) { console.error('[render] syncState failed:', e); }
  }

  R.setPaused = function (p) {
    paused = !!p;
    if (paused) { if (rafId) cancelAnimationFrame(rafId); rafId = 0; }
    else { lastTs = 0; schedule(); }
  };
  R.isPaused = function () { return paused; };

  // The UI tells the renderer which CSS px strips are covered (HUD bar, bottom sheet); the camera
  // re-fits the room into the uncovered band with a short glide. bottom: -1 restores the default.
  R.setViewInsets = function (o) {
    o = o || {};
    if (typeof o.top === 'number') insets.top = Math.max(0, o.top);
    if (typeof o.bottom === 'number') insets.bottom = o.bottom;
    if (R.available && cur && cur.resize) { cur.resize(W, H, true); schedule(); }
  };

  R.goToHotspot = function (action) { return !!(R.available && cur && cur.goToHotspot && cur.goToHotspot(action)); };

  // CSS-pixel (client) centres, for tests, tutorial arrows and speech bubbles. null if unavailable.
  // A hotspot's prop centre, or its label when a bandmate stands in front of the centre, so that a
  // tap at the returned point always opens that hotspot.
  R.hotspotScreenPos = function (action) {
    var p = anchorScreen('hotspot', action);
    if (!p) return null;
    var h = pickAt(p.x, p.y);
    if (h && h.type === 'hotspot' && h.action === action) return p;
    return anchorScreen('label', action) || p;
  };
  R.memberScreenPos = function (id) { return anchorScreen('member', id); };
  R.playerScreenPos = function () { return anchorScreen('player', null); };
  R.worldToScreen = function (x, y, z) {
    if (!R.available || !cur) return null;
    tmpV2.set(x, y, z); return toScreen(tmpV2);
  };
  function anchorScreen(kind, id) {
    if (!R.available || !cur || !cur.anchor) return null;
    if (!cur.anchor(kind, id, tmpV2)) return null;
    return toScreen(tmpV2);
  }
  function toScreen(v) {
    tmpV.copy(v).project(camera);
    if (tmpV.z > 1 || tmpV.z < -1) return null;
    var r = canvas.getBoundingClientRect();
    return { x: Math.round(r.left + (tmpV.x + 1) / 2 * r.width), y: Math.round(r.top + (1 - tmpV.y) / 2 * r.height) };
  }

  // ---- Frame loop --------------------------------------------------------------
  function schedule() {
    if (!rafId && !paused && R.available && cur) rafId = requestAnimationFrame(frame);
  }
  function frame(ts) {
    rafId = 0;
    if (paused || !cur) return;
    var dt = lastTs ? Math.min(MAX_DT, (ts - lastTs) / 1000) : 1 / 60;
    lastTs = ts;
    if (needsResize) applyResize();
    clock += dt;
    stepRig(dt);
    if (cur.update) cur.update(dt, clock);
    ring.update(dt);
    if (!contextLost) {
      renderer.render(cur.scene, camera);
      drawCalls = renderer.info.render.calls;
      triangles = renderer.info.render.triangles;
      frames++;
    }
    schedule();
  }

  // ---- Resize / orientation ------------------------------------------------------
  function onResize() {
    needsResize = true;
    if (paused || !cur) applyResize();   // keep matrices valid for screen-position queries
  }
  function applyResize() {
    if (!R.available) return;
    needsResize = false;
    var w = container.clientWidth || window.innerWidth || 1, h = container.clientHeight || window.innerHeight || 1;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    W = w; H = h;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    if (cur && cur.resize) cur.resize(W, H, false);
    rescaleLabels();
  }

  // ---- Camera rig ------------------------------------------------------------------
  // fitCamera({ target, yaw, pitch, fov, points, pad, animate }): aims the camera at `target` from the
  // given yaw (0 = from +z, positive = from -x) and pitch, then finds the distance at which every point
  // fits inside the uncovered band (insets) and a view offset that centres them there.
  function fitCamera(o) {
    var cp = Math.cos(o.pitch);
    rig.dir.set(-Math.sin(o.yaw) * cp, Math.sin(o.pitch), Math.cos(o.yaw) * cp);
    rig.target.copy(o.target);
    camera.fov = o.fov || 34; camera.aspect = W / H;
    camera.clearViewOffset(); camera.updateProjectionMatrix();
    var pad = o.pad == null ? 14 : o.pad, top = insets.top;
    var bottom = insets.bottom < 0 ? Math.round(H * 0.3) : insets.bottom;
    if (W > H) bottom = Math.min(bottom, Math.round(H * 0.12));    // landscape: little room for sheets
    var bandH = Math.max(80, H - top - bottom);
    var lo = 1, hi = 150, box = measureBox;
    for (var i = 0; i < 26; i++) {
      var mid = (lo + hi) / 2;
      if (measure(mid, o.points) && box.w <= W - 2 * pad && box.h <= bandH - 2 * pad) hi = mid; else lo = mid;
    }
    measure(hi, o.points);
    rig.goalDist = hi;
    rig.goalOffX = (box.x0 + box.x1) / 2 - W / 2;
    rig.goalOffY = (box.y0 + box.y1) / 2 - (top + bandH / 2);
    if (!o.animate || rig.snap) { rig.dist = rig.goalDist; rig.offX = rig.goalOffX; rig.offY = rig.goalOffY; rig.snap = false; }
    applyRig(rig.target.x, rig.target.y, rig.target.z);
    return rig.goalDist;
  }
  var measureBox = { x0: 0, x1: 0, y0: 0, y1: 0, w: 0, h: 0 };
  function measure(d, pts) {
    camera.position.copy(rig.target).addScaledVector(rig.dir, d);
    camera.lookAt(rig.target);
    camera.updateMatrixWorld();
    var b = measureBox; b.x0 = b.y0 = Infinity; b.x1 = b.y1 = -Infinity;
    for (var i = 0; i < pts.length; i++) {
      tmpV.copy(pts[i]).applyMatrix4(camera.matrixWorldInverse);
      if (tmpV.z > -camera.near * 2) return false;                 // behind or too close
      tmpV.applyMatrix4(camera.projectionMatrix);
      var x = (tmpV.x + 1) / 2 * W, y = (1 - tmpV.y) / 2 * H;
      if (x < b.x0) b.x0 = x; if (x > b.x1) b.x1 = x; if (y < b.y0) b.y0 = y; if (y > b.y1) b.y1 = y;
    }
    b.w = b.x1 - b.x0; b.h = b.y1 - b.y0;
    return true;
  }
  // Glide distance/offset toward their goals (after setViewInsets) — no allocation.
  function stepRig(dt) {
    if (rig.dist === rig.goalDist && rig.offX === rig.goalOffX && rig.offY === rig.goalOffY) return;
    var k = 1 - Math.exp(-dt * 9);
    rig.dist += (rig.goalDist - rig.dist) * k; rig.offX += (rig.goalOffX - rig.offX) * k; rig.offY += (rig.goalOffY - rig.offY) * k;
    if (Math.abs(rig.dist - rig.goalDist) < 1e-3 && Math.abs(rig.offY - rig.goalOffY) < 0.05 && Math.abs(rig.offX - rig.goalOffX) < 0.05) {
      rig.dist = rig.goalDist; rig.offX = rig.goalOffX; rig.offY = rig.goalOffY;
    }
    camera.setViewOffset(W, H, rig.offX, rig.offY, W, H);
    camera.updateProjectionMatrix();
  }
  function applyRig(tx, ty, tz) {
    camera.setViewOffset(W, H, rig.offX, rig.offY, W, H);
    camera.updateProjectionMatrix();
    placeCamera(tx, ty, tz);
  }
  // Called by scenes every frame (camera follow). Keeps the fitted direction and distance.
  function placeCamera(tx, ty, tz) {
    tmpV.set(tx, ty, tz);
    camera.position.copy(tmpV).addScaledVector(rig.dir, rig.dist);
    camera.lookAt(tmpV);
    camera.updateMatrixWorld();
  }

  // ---- Tap input -----------------------------------------------------------------------
  function bindInput() {
    canvas.addEventListener('pointerdown', function (e) {
      if (!e.isPrimary) return;
      down.id = e.pointerId; down.x = e.clientX; down.y = e.clientY; down.t = now(); down.moved = false;
    });
    canvas.addEventListener('pointermove', function (e) {
      if (e.pointerId !== down.id) return;
      var dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (dx * dx + dy * dy > TAP_SLOP * TAP_SLOP) down.moved = true;
    });
    canvas.addEventListener('pointerup', function (e) {
      if (e.pointerId !== down.id) return;
      down.id = -1;
      if (!down.moved && now() - down.t < TAP_MS) tap(e.clientX, e.clientY);
    });
    canvas.addEventListener('pointercancel', function () { down.id = -1; });
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }
  function now() { return (typeof performance !== 'undefined' ? performance : Date).now(); }

  function tap(cx, cy) {
    if (!R.available || paused || !cur || !cur.onTap) return;
    var hit = pickAt(cx, cy);
    if (hit) cur.onTap(hit);
  }
  // What a tap at client (x, y) would hit, without acting on it: labels first (drawn on top), then
  // hotspot/member hit boxes (nearest wins), then the floor plane. Allocates the small result object.
  function pickAt(cx, cy) {
    var r = canvas.getBoundingClientRect();
    ndc.set((cx - r.left) / r.width * 2 - 1, -(cy - r.top) / r.height * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    var hit = pick(cur.labels) || pick(cur.pickables);
    if (hit) {
      var ud = hit.object.userData;
      return ud.memberId ? { type: 'member', id: ud.memberId } : { type: 'hotspot', action: ud.action };
    }
    if (cur.floorY != null) {
      floorPlane.constant = -cur.floorY;
      if (raycaster.ray.intersectPlane(floorPlane, tmpV)) return { type: 'floor', x: tmpV.x, z: tmpV.z };
    }
    return null;
  }
  R.pickAt = function (x, y) { return R.available && cur ? pickAt(x, y) : null; };
  function pick(list) {
    if (!list || !list.length) return null;
    hits.length = 0;
    raycaster.intersectObjects(list, false, hits);
    for (var i = 0; i < hits.length; i++) {
      var o = hits[i].object;
      if (o.visible && o.parent && o.parent.visible !== false && (o.userData.action || o.userData.memberId)) return hits[i];
    }
    return null;
  }

  // ---- Walk-target ring ---------------------------------------------------------------------
  // One amber ring moved between scenes; show() pops it in, hide() fades it out.
  var ring = {
    mesh: null, mode: 0, t: 0,             // mode 0 hidden, 1 popping in, 2 shown (pulsing), 3 fading out
    ensure: function () {
      if (this.mesh) return;
      var g = new THREE.RingGeometry(0.2, 0.28, 28); g.rotateX(-Math.PI / 2);
      var dot = new THREE.CircleGeometry(0.06, 12); dot.rotateX(-Math.PI / 2);
      var merged = mergeGeos([g, dot]);
      this.mesh = new THREE.Mesh(merged, new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.9, depthWrite: false }));
      this.mesh.renderOrder = 5; this.mesh.visible = false;
    },
    attach: function (scene) {
      this.ensure();
      if (this.mesh.parent) this.mesh.parent.remove(this.mesh);
      if (scene) scene.add(this.mesh);
      this.mode = 0; this.mesh.visible = false;
    },
    show: function (x, y, z) { this.ensure(); this.mesh.position.set(x, y + 0.03, z); this.mesh.visible = true; this.mode = 1; this.t = 0; },
    hide: function () { if (this.mode === 1 || this.mode === 2) { this.mode = 3; this.t = 0; } },
    update: function (dt) {
      if (!this.mesh || !this.mode) return;
      this.t += dt;
      var m = this.mesh, s = 1, a = 0.9;
      if (this.mode === 1) { var u = Math.min(1, this.t / 0.22); s = 0.4 + 0.75 * u - 0.15 * u * u; if (u >= 1) { this.mode = 2; this.t = 0; } }
      else if (this.mode === 2) { s = 1 + 0.08 * Math.sin(this.t * 7); }
      else if (this.mode === 3) { var f = Math.min(1, this.t / 0.3); s = 1 + 0.4 * f; a = 0.9 * (1 - f); if (f >= 1) { this.mode = 0; m.visible = false; } }
      m.scale.set(s, 1, s); m.material.opacity = a;
    }
  };

  // ---- Labels -------------------------------------------------------------------------------------
  // makeLabel(text, { px }) -> Sprite: an amber-edged pill drawn once to a canvas texture. It keeps a
  // constant CSS-pixel height at any zoom (sizeAttenuation off) and is drawn over everything.
  function makeLabel(text, o) {
    o = o || {};
    var c = document.createElement('canvas'), g = c.getContext('2d');
    g.font = LABEL_FONT;
    var tw = Math.ceil(g.measureText(text).width), h = 64, padL = 50, padR = 26;
    c.width = tw + padL + padR; c.height = h;
    g.font = LABEL_FONT; g.textBaseline = 'middle';
    pill(g, 3, 3, c.width - 6, h - 6, (h - 6) / 2);
    g.fillStyle = 'rgba(15,20,32,0.86)'; g.fill();
    g.lineWidth = 3; g.strokeStyle = o.stroke || '#ffb347'; g.stroke();
    g.beginPath(); g.arc(28, h / 2, 8, 0, Math.PI * 2); g.fillStyle = o.dot || '#ffb347'; g.fill();
    g.fillStyle = '#f3efe6'; g.fillText(text, padL, h / 2 + 2);
    var tex = new THREE.CanvasTexture(c);
    tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter;
    var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, sizeAttenuation: false }));
    s.renderOrder = 20;
    s.userData.px = o.px || 24; s.userData.aspect = c.width / h; s.userData.base = 0.05;
    labels.push(s);
    rescaleLabel(s);
    return s;
  }
  function pill(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.arcTo(x + w, y, x + w, y + r, r);
    g.lineTo(x + w, y + h - r); g.arcTo(x + w, y + h, x + w - r, y + h, r); g.lineTo(x + r, y + h);
    g.arcTo(x, y + h, x, y + h - r, r); g.lineTo(x, y + r); g.arcTo(x, y, x + r, y, r); g.closePath();
  }
  // Sprite height in NDC is scale.y * P[5], so scale.y = 2 * px / (P[5] * H) gives a constant px height.
  function rescaleLabel(s) {
    if (!camera) return;
    var b = 2 * s.userData.px / (camera.projectionMatrix.elements[5] * H);
    s.userData.base = b;
    s.scale.set(b * s.userData.aspect, b, 1);
  }
  function rescaleLabels() { for (var i = 0; i < labels.length; i++) rescaleLabel(labels[i]); }
  // Scenes pulse labels with this (m = 1 is the resting size).
  function scaleLabel(s, m) { var b = s.userData.base * m; s.scale.set(b * s.userData.aspect, b, 1); }
  // For scenes that throw a label away (the garage keeps its seven for the whole session).
  function disposeLabel(s) {
    var i = labels.indexOf(s); if (i >= 0) labels.splice(i, 1);
    if (s.parent) s.parent.remove(s);
    s.material.map.dispose(); s.material.dispose();
  }

  // ---- Textures ---------------------------------------------------------------------------------------
  var texCache = {};
  // Soft round sprites, made once per kind: 'glow' (white, fast falloff: halos, dust, weather),
  // 'shadow' (black: blob shadows), 'soft' (white, wide plateau: ground pools tinted by material colour).
  var RADIAL = { glow: ['255,255,255', 1, 0.25, 0.45], shadow: ['0,0,0', 0.5, 0.55, 0.32], soft: ['255,255,255', 1, 0.35, 0.85] };
  function radialTexture(kind) {
    if (texCache[kind]) return texCache[kind];
    var k = RADIAL[kind] || RADIAL.glow, c = document.createElement('canvas'); c.width = c.height = 64;
    var g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(' + k[0] + ',' + k[1] + ')');
    gr.addColorStop(k[2], 'rgba(' + k[0] + ',' + k[3] + ')');
    gr.addColorStop(1, 'rgba(' + k[0] + ',0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    var t = new THREE.CanvasTexture(c);
    return (texCache[kind] = t);
  }

  // ---- Mesh builder -------------------------------------------------------------------------------------
  // Merges flat-shaded, vertex-coloured primitives into ONE BufferGeometry, so a whole room or a whole
  // character costs one draw call. Build time only (allocates freely; never call it per frame).
  //   b.at(x, y, z, ry)                     base transform for the parts that follow (ry = yaw, radians)
  //   b.box(w, h, d, x, y, z, color, rx, ry, rz)
  //   b.cyl(rTop, rBot, h, segs, x, y, z, color, rx, ry, rz)
  //   b.tri(a, b, c, color) / b.quad(a, b, c, d, color)   points [x,y,z], counter-clockwise from the front
  //   b.triC(a, b, c, colA, colB, colC)     per-vertex colours (gradients), no jitter
  //   b.push(x, y, z, rx, ry, rz) / b.pop() nest a local frame (a tilted tom, a pinned flyer)
  //   b.bone = n                            skinned builders: following parts follow bone n
  //   b.build() -> BufferGeometry           (position, normal, color[, skinIndex, skinWeight])
  function Builder(o) {
    o = o || {};
    this.p = []; this.n = []; this.c = []; this.sk = o.skinned ? [] : null; this.stack = [];
    this.bone = 0; this.jit = o.jitter == null ? 0.05 : o.jitter; this.rs = (o.seed >>> 0) || 7;
    this.base = new THREE.Matrix4(); this.m = new THREE.Matrix4(); this.e = new THREE.Euler();
    this.q = new THREE.Quaternion(); this.v = new THREE.Vector3(); this.s = new THREE.Vector3();
    this.col = new THREE.Color(); this.a = new THREE.Vector3(); this.b2 = new THREE.Vector3(); this.c2 = new THREE.Vector3();
    this.unitBox = new THREE.BoxGeometry(1, 1, 1).toNonIndexed(); this.cyls = {};
  }
  Builder.prototype.at = function (x, y, z, ry) {
    this.stack.length = 0;
    this.base.makeRotationY(ry || 0).setPosition(x || 0, y || 0, z || 0);
    return this;
  };
  Builder.prototype.push = function (x, y, z, rx, ry, rz) {
    this.stack.push(this.base.clone());
    this.place(x, y, z, 1, 1, 1, rx, ry, rz);
    this.base.copy(this.m);
    return this;
  };
  Builder.prototype.pop = function () { if (this.stack.length) this.base.copy(this.stack.pop()); return this; };
  Builder.prototype.box = function (w, h, d, x, y, z, color, rx, ry, rz) {
    this.place(x, y, z, w, h, d, rx, ry, rz);
    return this.add(this.unitBox, color);
  };
  Builder.prototype.cyl = function (rt, rb, h, segs, x, y, z, color, rx, ry, rz) {
    var key = rt + ',' + rb + ',' + segs;
    var g = this.cyls[key] || (this.cyls[key] = new THREE.CylinderGeometry(rt, rb, 1, segs, 1, false).toNonIndexed());
    this.place(x, y, z, 1, h, 1, rx, ry, rz);
    return this.add(g, color);
  };
  // Any THREE geometry (converted to non-indexed), scaled/rotated/placed like box().
  Builder.prototype.shape = function (geo, x, y, z, sx, sy, sz, color, rx, ry, rz) {
    var g = geo.index ? geo.toNonIndexed() : geo;
    this.place(x, y, z, sx, sy, sz, rx, ry, rz);
    return this.add(g, color);
  };
  Builder.prototype.place = function (x, y, z, sx, sy, sz, rx, ry, rz) {
    this.e.set(rx || 0, ry || 0, rz || 0);
    this.q.setFromEuler(this.e);
    this.m.compose(this.v.set(x, y, z), this.q, this.s.set(sx, sy, sz));
    this.m.premultiply(this.base);
  };
  Builder.prototype.add = function (g, color) {
    var pos = g.attributes.position, n = pos.count;
    for (var i = 0; i < n; i += 3) {
      this.a.fromBufferAttribute(pos, i).applyMatrix4(this.m);
      this.b2.fromBufferAttribute(pos, i + 1).applyMatrix4(this.m);
      this.c2.fromBufferAttribute(pos, i + 2).applyMatrix4(this.m);
      this.pushTri(this.a, this.b2, this.c2, color, (i / 3) % 2 === 0);
    }
    return this;
  };
  Builder.prototype.tri = function (a, b, c, color) {
    this.a.fromArray(a).applyMatrix4(this.base); this.b2.fromArray(b).applyMatrix4(this.base); this.c2.fromArray(c).applyMatrix4(this.base);
    this.pushTri(this.a, this.b2, this.c2, color, true);
    return this;
  };
  Builder.prototype.triC = function (a, b, c, ca, cb, cc) {
    var pts = [a, b, c], cols = [ca, cb, cc], v = [this.a, this.b2, this.c2];
    for (var i = 0; i < 3; i++) v[i].fromArray(pts[i]).applyMatrix4(this.base);
    var start = this.c.length;
    this.pushTri(this.a, this.b2, this.c2, 0xffffff, false);
    for (i = 0; i < 3; i++) { this.col.set(cols[i]); this.c[start + i * 3] = this.col.r; this.c[start + i * 3 + 1] = this.col.g; this.c[start + i * 3 + 2] = this.col.b; }
    return this;
  };
  Builder.prototype.quad = function (a, b, c, d, color) {
    this.tri(a, b, c, color);
    this.a.fromArray(a).applyMatrix4(this.base); this.b2.fromArray(c).applyMatrix4(this.base); this.c2.fromArray(d).applyMatrix4(this.base);
    this.pushTri(this.a, this.b2, this.c2, color, false);
    return this;
  };
  // Flat rectangle facing +z in the current frame (decals: pegboard holes, stars, scribbles).
  Builder.prototype.rect = function (w, h, x, y, z, color) {
    var hw = w / 2, hh = h / 2;
    return this.quad([x - hw, y - hh, z], [x + hw, y - hh, z], [x + hw, y + hh, z], [x - hw, y + hh, z], color);
  };
  // newShade: pick a new jitter for this triangle (faces of a box share one: every other triangle).
  Builder.prototype.pushTri = function (a, b, c, color, newShade) {
    if (newShade) { this.rs = (Math.imul(this.rs, 1664525) + 1013904223) >>> 0; this.f = 1 + ((this.rs / 4294967296) - 0.5) * 2 * this.jit; }
    var f = this.f || 1;
    this.col.set(color);
    var r = Math.min(1, this.col.r * f), gg = Math.min(1, this.col.g * f), bb = Math.min(1, this.col.b * f);
    // face normal
    var ux = b.x - a.x, uy = b.y - a.y, uz = b.z - a.z, vx = c.x - a.x, vy = c.y - a.y, vz = c.z - a.z;
    var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    var l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1; nx /= l; ny /= l; nz /= l;
    this.p.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    for (var k = 0; k < 3; k++) {
      this.n.push(nx, ny, nz); this.c.push(r, gg, bb);
      if (this.sk) this.sk.push(this.bone);
    }
  };
  Builder.prototype.count = function () { return this.p.length / 3; };
  Builder.prototype.build = function () {
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    if (this.sk) {
      var n = this.sk.length, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
      for (var i = 0; i < n; i++) { si[i * 4] = this.sk[i]; sw[i * 4] = 1; }
      g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
      g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    }
    g.computeBoundingSphere();
    return g;
  };

  // Merge plain geometries (position/normal only) into one — used for small helper meshes.
  function mergeGeos(list) {
    var p = [], n = [];
    for (var i = 0; i < list.length; i++) {
      var g = list[i].index ? list[i].toNonIndexed() : list[i];
      p.push.apply(p, g.attributes.position.array); n.push.apply(n, g.attributes.normal.array);
    }
    var out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    out.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3));
    return out;
  }

  // ---- Small maths helpers (allocation-free) ---------------------------------------------------------
  function wrapAngle(a) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }
  // Exponential approach along the shortest arc; k = rate (1/s).
  function approachAngle(cur, goal, k, dt) { return wrapAngle(cur + wrapAngle(goal - cur) * (1 - Math.exp(-k * dt))); }
  function smooth(u) { u = u < 0 ? 0 : u > 1 ? 1 : u; return u * u * (3 - 2 * u); }
  function shade(hex, f) {             // multiply a colour's brightness; returns a hex number
    var c = new THREE.Color(hex);
    if (f > 1) c.lerp(new THREE.Color(0xffffff), Math.min(1, f - 1)); else c.multiplyScalar(f);
    return c.getHex();
  }
  function hashStr(s) { return GG.hashSeed ? GG.hashSeed(s) : 7; }

  // ---- ctx: what scene factories get --------------------------------------------------------------------
  function makeCtx() {
    var mats = {
      vc: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),   // lit, static meshes
      skin: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), // lit, skinned characters
      unlit: new THREE.MeshBasicMaterial({ vertexColors: true }),                      // glowing bits
      hidden: new THREE.MeshBasicMaterial({ visible: false })                          // hit boxes (never drawn)
    };
    return {
      THREE: THREE, renderer: renderer, camera: camera, mats: mats, ring: ring,
      size: function () { return { w: W, h: H }; },
      Builder: Builder, makeLabel: makeLabel, scaleLabel: scaleLabel, disposeLabel: disposeLabel, radialTexture: radialTexture,
      fitCamera: fitCamera, placeCamera: placeCamera,
      emit: function (ev, p) { GG.emit(ev, p); },
      wrapAngle: wrapAngle, approachAngle: approachAngle, smooth: smooth, shade: shade, hash: hashStr
    };
  }
  // Shared helpers for other modules (character builder, future scenes). Valid after init().
  R.util = {
    wrapAngle: wrapAngle, smooth: smooth,
    ctx: function () { return ctx; },
    currentScene: function () { return cur && cur.scene; }   // debugging aid (dev console, close-up renders)
  };

  // ---- Debug --------------------------------------------------------------------------------------------------
  // 41_render_garage.js adds scene fields through the scene's debug(); only this module registers 'render'.
  GG.registerDebug('render', function () {
    var d = { available: R.available, scene: cur ? curName : 'none', paused: paused, frames: frames, drawCalls: drawCalls, triangles: triangles };
    if (R.available) { d.viewport = { w: W, h: H }; d.insets = { top: insets.top, bottom: insets.bottom }; }
    if (cur && cur.debug) { var x = cur.debug(); for (var k in x) d[k] = x[k]; }
    return d;
  });
})(window.GG);
