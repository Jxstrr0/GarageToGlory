// 40_render_core.js: three.js renderer, frame loop, camera, tap input, scene registry, shared helpers.
// Scenes register a factory with GG.render.defineScene(name, factory) — 41_render_garage.js now; stage,
// van, red carpet later. The core owns what they share: ONE WebGLRenderer, ONE PerspectiveCamera, ONE rAF
// loop (skipped while paused), resize/orientation, tap raycasting (labels, then hotspots/members, then the
// floor), the walk-target ring, label sprites and a mesh builder that merges primitives into one draw call.
// init() never throws: without THREE (offline) or WebGL it returns false and GG.render.available stays false.
// v0.8 (CREATOR): the one character-geometry builder lives here (R.charGeometry: the v0.7 builder verbatim for legacy LOOKs,
// every Part C2 part for v0.8 LOOKs; 41_render_garage makeCharacter / R.buildCharacter call it), plus R.kit (kit looks:
// shell finishes, hardware, thrones, cowbell / hair fan / pyro, kick-head art, R.kit.garage = the garage kit geometry)
// and R.pixelFont (the 3x5 font for knuckle tattoos). See "People (v0.8)" and "Kit looks (v0.8)" below.
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

  // ---- v0.6.1 (Addendum C4, SETTINGS): graphics quality, camera shake, reduced flashing ----------------------
  // R.prefs() -> { quality: 'low'|'med'|'high', shake, calm, pixelRatio, crowdScale } (cached; never reads storage per
  // frame) ; R.applySettings() re-reads GG.prefs and resizes. low = 1x pixels + 40% crowd, med = 1.5x + 70%, high = 2x + all.
  // Scenes read R.prefs().calm (no strobing lights / hit flashes), .shake (camera shake allowed) and .crowdScale.
  var QUALITY = { low: { px: 1, crowd: 0.4 }, med: { px: 1.5, crowd: 0.7 }, high: { px: 2, crowd: 1 } };
  var PREFS = null;
  R.prefs = function () {
    if (PREFS) return PREFS;
    var s = {}; try { s = GG.prefs ? GG.prefs.get() : {}; } catch (e) { s = {}; }
    var q = QUALITY[s.graphics] ? s.graphics : 'high';
    PREFS = { quality: q, shake: s.cameraShake !== false, calm: !!s.reducedFlash, pixelRatio: QUALITY[q].px, crowdScale: QUALITY[q].crowd };
    return PREFS;
  };
  function pixelRatio() { return Math.min(R.prefs().pixelRatio, (typeof window !== 'undefined' && window.devicePixelRatio) || 1); }
  R.applySettings = function () { PREFS = null; R.prefs(); if (R.available && renderer) { needsResize = true; applyResize(); } return PREFS; };
  if (GG.on) GG.on('settings:changed', function (p) {
    var k = (p && p.keys) || [];
    if (!k.length || k.indexOf('graphics') >= 0 || k.indexOf('cameraShake') >= 0 || k.indexOf('reducedFlash') >= 0) R.applySettings();
  });

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
      renderer.setPixelRatio(pixelRatio());
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
    renderer.setPixelRatio(pixelRatio());
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

  // ---- People (v0.8 "Kit": the full character creator) ------------------------------------------------------------
  // R.charGeometry(ctx, L, o, raw) -> skinned BufferGeometry. 41_render_garage.js normalises the legacy fields
  // (L = normLook(raw)) and calls this for every person (the garage, R.buildCharacter for stage / van / red carpet).
  //   * raw without any v0.8 field (members, rivals, recruits, fill-ins, old saves): legacyGeometry, the v0.7 builder
  //     moved here verbatim (same parts, same order, same jitter), so every old LOOK renders exactly as before.
  //   * a v0.8 LOOK (GG.creator.isV8): charV8 draws every Part C2 part (content/creator.js): build, height, age, face
  //     shape / eyes (+ colour) / brows / nose / mouth, facial hair, glasses, 17 hair styles under or without hats,
  //     tops / bottoms / shoes / headwear, stage outfits (shirtless, battle jacket, leather vest, Canadian tuxedo,
  //     spandex, rhinestone suit) + stage extras (cape, studded wristbands, corpse paint), tattoos (pixel-art designs
  //     on forearms / sleeves / neck / chest, the teardrop) and knuckle letters (3x5 pixel font, readable up close),
  //     piercings. o.sticks may be a colour (the kit's stick colour).
  // Bone indices match 41_render_garage.js (one rig for everyone).
  var B_HIPS = 1, B_SPINE = 2, B_HEAD = 3, B_ARM_L = 4, B_FORE_L = 5, B_ARM_R = 6, B_FORE_R = 7,
    B_LEG_L = 8, B_SHIN_L = 9, B_LEG_R = 10, B_SHIN_R = 11, B_CAPE1 = 12, B_CAPE2 = 13,
    B_GEAR = 14, B_PHONES = 15, B_HELD = 16, B_FLOOR = 17;
  var CAPES = {
    velvet: { out: 0x4a1d6e, lining: 0x9b1b2a, trim: 0xd4a940, collar: true, clasp: true },
    curtain: { out: 0xd6a53c, lining: 0xc99a36, dots: [0xc85a78, 0x5f8f45], rings: true },
    charred: { out: 0x1e1a18, lining: 0x2b2522, jagged: true, embers: true },
    fireproof: { out: 0xc3c8d0, lining: 0xb4bac4, bands: 0xd8e84a, collar: true },
    player: { out: 0x17171c, lining: 0x8a1420, trim: 0xb8bcc6, collar: true }        // v0.8: a cape of your own (stage extra)
  };
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  // The v0.7 builder, verbatim (was characterGeometry in 41_render_garage.js).
  function legacyGeometry(ctx, L, o) {
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
      if (o.sticks) b.box(0.024, 0.024, 0.42, s * sx, 0.77, 0.15, hexOf(o.sticks, 0xd8b27a), 0.25);   // v0.8: the kit's stick colour
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

  // ---- v0.8 builder ------------------------------------------------------------------------------------------------
  var INK = 0x1c2433, INK2 = 0x2f5a6a, METAL = 0xd8dde4, DENIM = 0x4a6a9a, LEATHER = 0x19191d, PAINT = 0xecebe6, TEETH = 0xf2efe6;
  var TOP_Y = 1.875;              // the crown: every face shape keeps it, so hair and hats fit them all
  var FACES = {                   // head half-width / half-depth / centre / half-height, mouth height (+ chin / jaw blocks)
    classic: { hw: 0.17, hd: 0.16, cy: 1.69, hh: 0.185, mouth: 1.585 },
    round: { hw: 0.185, hd: 0.165, cy: 1.7, hh: 0.175, mouth: 1.592, chin: [0.27, 0.05, 0.29, 1.51] },
    square: { hw: 0.18, hd: 0.16, cy: 1.69, hh: 0.185, mouth: 1.585, jaw: [0.38, 0.09, 0.3, 1.545] },
    long: { hw: 0.16, hd: 0.155, cy: 1.67, hh: 0.205, mouth: 1.56 }
  };
  // 3x5 pixel font (knuckles, the misspelled word, band initials, jersey numbers). Rows top to bottom, '#' = ink.
  var FONT = {
    A: '.#.|#.#|###|#.#|#.#', B: '##.|#.#|##.|#.#|##.', C: '.##|#..|#..|#..|.##', D: '##.|#.#|#.#|#.#|##.', E: '###|#..|##.|#..|###',
    F: '###|#..|##.|#..|#..', G: '.##|#..|#.#|#.#|.##', H: '#.#|#.#|###|#.#|#.#', I: '###|.#.|.#.|.#.|###', J: '..#|..#|..#|#.#|.#.',
    K: '#.#|#.#|##.|#.#|#.#', L: '#..|#..|#..|#..|###', M: '#.#|###|###|#.#|#.#', N: '##.|#.#|#.#|#.#|#.#', O: '.#.|#.#|#.#|#.#|.#.',
    P: '##.|#.#|##.|#..|#..', Q: '.#.|#.#|#.#|##.|.##', R: '##.|#.#|##.|#.#|#.#', S: '.##|#..|.#.|..#|##.', T: '###|.#.|.#.|.#.|.#.',
    U: '#.#|#.#|#.#|#.#|###', V: '#.#|#.#|#.#|#.#|.#.', W: '#.#|#.#|###|###|#.#', X: '#.#|#.#|.#.|#.#|#.#', Y: '#.#|#.#|.#.|.#.|.#.',
    Z: '###|..#|.#.|#..|###', 0: '###|#.#|#.#|#.#|###', 1: '.#.|##.|.#.|.#.|###', 2: '##.|..#|.#.|#..|###', 3: '##.|..#|.#.|..#|##.',
    4: '#.#|#.#|###|..#|..#', 5: '###|#..|##.|..#|##.', 6: '.##|#..|###|#.#|###', 7: '###|..#|.#.|.#.|.#.', 8: '###|#.#|###|#.#|###',
    9: '###|#.#|###|..#|##.'
  };
  // Tattoo designs as pixel art (palette keys below). ' ' / '.' = skin.
  var MOTIFS = {
    skull: [' WWWWW ', 'WWWWWWW', 'WKKWKKW', 'WKKWKKW', 'WWWKWWW', ' WWWWW ', ' W W W '],
    maple: ['   R   ', 'R RRR R', 'RRRRRRR', ' RRRRR ', 'RRRRRRR', '  RRR  ', '   B   '],
    wheat: ['G G G', 'GGGGG', ' GGG ', ' BBB ', ' GGG ', 'G G G', 'G   G'],
    mom: ['  RR   RR  ', ' RRRR RRRR ', 'RRRRRRRRRRR', 'RRRRRRRRRRR', ' RRRRRRRRR ', '  RRRRRRR  ', '   RRRRR   ', '    RRR    ', '     R     '],
    moose: ['A A     A A', 'AAA     AAA', ' AAANNNAAA ', '    NNN    ', '    NKN    ', '    NNN    ', '     N     '],
    flames: ['   Y   ', '  YO Y ', ' YOOYO ', ' OOROO ', 'OORRROO', 'ORRRRRO', ' RRRRR '],
    tear: ['K', 'K']
  };
  var PAL = { W: 0xe8e4dc, K: INK, R: 0xc0392b, G: 0xd9a520, B: 0x6b4a2e, N: 0x5a3a22, A: 0xc8a878, Y: 0xf2d24a, O: 0xe8782a, '#': INK };
  function textGrid(str) {
    var rows = ['', '', '', '', ''], s = String(str || '').toUpperCase(), first = true;
    for (var i = 0; i < s.length; i++) {
      var g = FONT[s.charAt(i)];
      if (!g) continue;
      var r = g.split('|');
      for (var k = 0; k < 5; k++) rows[k] += (first ? '' : '.') + r[k];
      first = false;
    }
    return rows[0] ? rows : null;
  }
  function rotGrid(grid) {         // 90° clockwise: text that runs down a forearm
    var out = [], h = grid.length, w = grid[0].length;
    for (var c = 0; c < w; c++) { var row = ''; for (var r = h - 1; r >= 0; r--) row += grid[r].charAt(c); out.push(row); }
    return out;
  }
  // Pixel art on an axis-aligned face: centre c, u = image right, v = image down, n = outward normal (unit axis vectors),
  // px = pixel size, t = thickness. Runs of one colour in a row merge into one box.
  function pixels(b, grid, px, c, u, v, n, t, pal, col) {
    var rows = grid.length, cols = 0, r, i;
    for (r = 0; r < rows; r++) cols = Math.max(cols, grid[r].length);
    for (r = 0; r < rows; r++) {
      var row = grid[r];
      for (i = 0; i < row.length;) {
        var ch = row.charAt(i);
        if (ch === ' ' || ch === '.') { i++; continue; }
        var j = i; while (j < row.length && row.charAt(j) === ch) j++;
        var len = j - i, cu = (i + (len - 1) / 2 - (cols - 1) / 2) * px, cv = (r - (rows - 1) / 2) * px, color = col != null ? col : (pal || PAL)[ch];
        var sz = [0, 0, 0], p = [0, 0, 0];
        for (var a = 0; a < 3; a++) {
          sz[a] = Math.abs(u[a]) * len * px + Math.abs(v[a]) * px + Math.abs(n[a]) * t;
          p[a] = c[a] + u[a] * cu + v[a] * cv + n[a] * t / 2;
        }
        b.box(sz[0], sz[1], sz[2], p[0], p[1], p[2], color == null ? INK : color);
        i = j;
      }
    }
  }
  function mix(a, bb, f) { var x = new THREE.Color(a), y = new THREE.Color(bb); return x.lerp(y, f).getHex(); }
  function hexOf(v, d) { return typeof v === 'number' ? v : typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : d; }
  function hatColor(L, V) { return V.capColor || L.capColor || '#c0392b'; }
  function bandInitials() {
    var st = GG.state, band = st && GG.content && GG.content.bands && GG.content.bands[st.bandId];
    var name = (band && band.name) || 'Hail Damage', w = name.replace(/^the\s+/i, '').split(/\s+/);
    return (w.length > 1 ? w[0].charAt(0) + w[1].charAt(0) : w[0].slice(0, 2)).toUpperCase();
  }
  function designGrid(design) {
    if (design === 'regerts') return rotGrid(textGrid((GG.content.creator && GG.content.creator.words && GG.content.creator.words.regerts) || 'REGERTS'));
    if (design === 'logo') { var t = textGrid(bandInitials()); return t ? ['K.K.K.K'.slice(0, t[0].length)].concat(t) : null; }
    return MOTIFS[design] || null;
  }
  function has(a, x) { return !!a && a.indexOf(x) >= 0; }

  // Where the clothes are: torso colour/kind, how bare the arms are, what the legs wear.
  function garment(L, V) {
    var o = V.outfit || 'none', G = { top: L.top || 'tee', torso: L.shirt, arms: 'long', sleeve: L.shirt, legs: V.bottom || 'jeans',
      pants: L.pants, skinTorso: false, vest: null, suit: false };
    if (G.top === 'tee') G.arms = 'short';
    else if (G.top === 'tank') G.arms = 'none';
    else if (G.top === 'denim') G.sleeve = DENIM;
    if (o === 'shirtless') { G.top = 'skin'; G.skinTorso = true; G.arms = 'none'; }
    else if (o === 'leathervest') { G.top = 'skin'; G.skinTorso = true; G.arms = 'none'; G.vest = LEATHER; }
    else if (o === 'battlejacket') { G.top = 'tee'; G.torso = L.shirt; G.arms = 'short'; G.vest = DENIM; G.patches = true; }
    else if (o === 'cdntux') { G.top = 'denim'; G.arms = 'long'; G.sleeve = DENIM; G.legs = 'jeans'; G.pants = 0x34507a; }
    else if (o === 'spandex') { G.top = 'tank'; G.arms = 'none'; G.legs = 'spandex'; }
    else if (o === 'rhinestone') { G.top = 'suit'; G.arms = 'long'; G.sleeve = L.shirt; G.legs = 'suit'; G.pants = L.shirt; G.suit = true; }
    if (G.top === 'denim') G.torso = DENIM;
    return G;
  }

  function charV8(ctx, L, o, V) {
    var b = new ctx.Builder({ skinned: true, jitter: 0.03, seed: ctx.hash(o.id || 'someone') });
    var sh = ctx.shade, bw = L.build, sx = 0.25 * bw + 0.075, hx = 0.11 * bw, fz = 0.135 * bw + 0.004;
    var G = garment(L, V), skin = L.skin, i, s;
    var paint = has(V.stageExtras, 'corpsepaint'), face = paint ? PAINT : skin;
    var F = FACES[(V.face && V.face.shape) || 'classic'] || FACES.classic;
    var hair = L.hair, grey = V.age === 'grizzled';
    // ---- Legs + shoes
    for (i = 0; i < 2; i++) {
      s = i ? -1 : 1;
      var lx = s * hx;
      b.bone = i ? B_SHIN_R : B_SHIN_L;
      legLower(b, G, L, lx, sh, skin);
      shoe(b, V.shoes || 'sneakers', lx, sh);
      b.bone = i ? B_LEG_R : B_LEG_L;
      legUpper(b, G, L, lx, sh, skin);
    }
    b.bone = B_HIPS;
    if (G.legs === 'kilt') {
      var tart = G.pants;
      b.box(0.44 * bw, 0.34, 0.29 * bw, 0, 0.75, 0, tart);
      b.box(0.445 * bw, 0.035, 0.295 * bw, 0, 0.78, 0, sh(tart, 0.55)); b.box(0.445 * bw, 0.02, 0.295 * bw, 0, 0.66, 0, sh(tart, 1.35));
      b.box(0.03, 0.34, 0.3 * bw, 0.08, 0.75, 0, sh(tart, 0.55)); b.box(0.03, 0.34, 0.3 * bw, -0.08, 0.75, 0, sh(tart, 0.55));
      b.box(0.08, 0.1, 0.02, 0, 0.72, 0.15 * bw, 0xe8e4dc);                        // sporran
      b.box(0.41 * bw, 0.04, 0.25 * bw, 0, 0.945, 0, 0x2a211b);
    } else {
      b.box(0.4 * bw, 0.17, 0.24 * bw, 0, 0.87, 0, G.pants);
      if (G.legs !== 'spandex' && G.legs !== 'sweats') b.box(0.41 * bw, 0.04, 0.25 * bw, 0, 0.945, 0, G.suit ? 0xe8e4dc : 0x2a211b);   // belt
      if (G.suit) b.box(0.06, 0.05, 0.02, 0, 0.945, 0.125 * bw + 0.004, 0xd4a940);   // the buckle
    }
    // ---- Torso
    b.bone = B_SPINE;
    torso(b, G, L, V, bw, fz, sh, skin);
    // ---- Head
    b.bone = B_HEAD;
    head(b, L, V, F, face, skin, hair, grey, paint, sh);
    // ---- Arms
    for (i = 0; i < 2; i++) {
      s = i ? -1 : 1;
      arm(b, G, L, V, s, i, sx, bw, sh, skin, o);
    }
    // ---- Held things, gear, headphones, capes (same as v0.7)
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
    b.bone = B_PHONES;
    b.box(F.hw * 2 + 0.04, 0.045, 0.07, 0, 1.915, 0, 0x202024);
    for (i = 0; i < 2; i++) {
      s = i ? -1 : 1;
      b.box(0.03, 0.18, 0.05, s * (F.hw + 0.025), 1.83, 0, 0x202024); b.box(0.07, 0.13, 0.13, s * (F.hw + 0.03), 1.69, 0, 0x2a2a30);
      b.box(0.012, 0.08, 0.08, s * (F.hw + 0.067), 1.69, 0, 0xd23c3c);
    }
    var cape = o.cape && CAPES[o.cape] ? CAPES[o.cape] : has(V.stageExtras, 'cape') ? CAPES.player : null;
    if (cape) capeParts(b, cape, bw, ctx);
    return b.build();
  }

  function legLower(b, G, L, lx, sh, skin) {
    var p = G.pants;
    switch (G.legs) {
      case 'cargo': b.box(0.135, 0.37, 0.15, lx, 0.265, 0, skin); b.box(0.14, 0.09, 0.155, lx, 0.13, 0, 0xe8e4dc); break;   // shins + tube socks
      case 'kilt': b.box(0.135, 0.12, 0.15, lx, 0.39, 0, skin); b.box(0.15, 0.26, 0.165, lx, 0.19, 0, 0xe0dccf); b.box(0.155, 0.03, 0.17, lx, 0.31, 0, 0xc0392b); break;
      case 'sweats': b.box(0.16, 0.37, 0.18, lx, 0.27, 0, p); b.box(0.15, 0.05, 0.17, lx, 0.1, 0, sh(p, 0.75)); b.box(0.01, 0.34, 0.03, lx + (lx > 0 ? 0.08 : -0.08), 0.28, 0, 0xe8e4dc); break;
      case 'spandex': b.box(0.135, 0.37, 0.155, lx, 0.265, 0, p); b.box(0.137, 0.03, 0.157, lx, 0.3, 0, sh(p, 1.4)); b.box(0.137, 0.03, 0.157, lx, 0.18, 0, sh(p, 1.4)); break;
      case 'suit': b.box(0.15, 0.37, 0.17, lx, 0.265, 0, p); rhinestones(b, lx + (lx > 0 ? 0.076 : -0.076), 0.265, 0, 'x', 3, 0.32); break;
      default: b.box(0.15, 0.37, 0.17, lx, 0.265, 0, p);                         // jeans (the v0.7 pants)
    }
  }
  function legUpper(b, G, L, lx, sh, skin) {
    var p = G.pants;
    switch (G.legs) {
      case 'cargo':
        b.box(0.18, 0.28, 0.2, lx, 0.7, 0, p); b.box(0.14, 0.14, 0.16, lx, 0.5, 0, skin);
        b.box(0.02, 0.09, 0.09, lx + (lx > 0 ? 0.091 : -0.091), 0.66, 0, sh(p, 0.8)); break;
      case 'kilt': b.box(0.15, 0.41, 0.17, lx, 0.645, 0, skin); break;
      case 'sweats': b.box(0.18, 0.41, 0.2, lx, 0.645, 0, p); b.box(0.01, 0.4, 0.03, lx + (lx > 0 ? 0.091 : -0.091), 0.645, 0, 0xe8e4dc); break;
      case 'spandex': b.box(0.16, 0.41, 0.175, lx, 0.645, 0, p); b.box(0.162, 0.03, 0.177, lx, 0.7, 0, sh(p, 1.4)); b.box(0.162, 0.03, 0.177, lx, 0.56, 0, sh(p, 1.4)); break;
      case 'suit': b.box(0.17, 0.41, 0.19, lx, 0.645, 0, p); rhinestones(b, lx + (lx > 0 ? 0.086 : -0.086), 0.645, 0, 'x', 3, 0.36); break;
      default: b.box(0.17, 0.41, 0.19, lx, 0.645, 0, p);
    }
  }
  function shoe(b, kind, lx, sh) {
    switch (kind) {
      case 'skate': b.box(0.18, 0.08, 0.29, lx, 0.05, 0.035, 0x1e1e24); b.box(0.185, 0.03, 0.295, lx, 0.015, 0.035, 0xf0ece4); b.box(0.184, 0.02, 0.1, lx, 0.06, 0.02, 0xf0ece4); break;
      case 'workboots': b.box(0.175, 0.16, 0.2, lx, 0.08, 0, 0x8a5a2a); b.box(0.175, 0.09, 0.3, lx, 0.045, 0.04, 0x8a5a2a); b.box(0.18, 0.025, 0.305, lx, 0.012, 0.04, 0x2a1f16); b.box(0.06, 0.1, 0.01, lx, 0.1, 0.101, 0xd9c27a); break;
      case 'cowboy':
        b.box(0.165, 0.22, 0.18, lx, 0.12, -0.01, 0x6b3a1e); b.box(0.15, 0.08, 0.27, lx, 0.04, 0.05, 0x6b3a1e); b.box(0.09, 0.06, 0.08, lx, 0.035, 0.2, 0x6b3a1e);
        b.box(0.17, 0.02, 0.19, lx, 0.225, -0.01, 0x4a2612); b.box(0.12, 0.045, 0.07, lx, 0.022, -0.06, 0x2a1f16); break;
      case 'crocs':
        b.box(0.18, 0.1, 0.29, lx, 0.05, 0.035, 0x3fbf4a);
        for (var k = 0; k < 3; k++) b.box(0.03, 0.008, 0.03, lx + (k - 1) * 0.05, 0.102, 0.1, 0x2a8a34);
        b.box(0.19, 0.03, 0.03, lx, 0.07, -0.08, 0x2a8a34); break;
      default: b.box(0.165, 0.085, 0.28, lx, 0.043, 0.035, 0x1f1b18);                // the v0.7 sneakers
    }
  }
  function rhinestones(b, x, y, z, axis, n, span) {       // a row of sparkles along y on a side face (axis 'x') or the front ('z')
    for (var k = 0; k < n; k++) {
      var yy = y - span / 2 + span * (k + 0.5) / n;
      if (axis === 'x') b.box(0.008, 0.018, 0.018, x, yy, z, 0xfff4c8); else b.box(0.018, 0.018, 0.008, x, yy, z, 0xfff4c8);
    }
  }

  function torso(b, G, L, V, bw, fz, sh, skin) {
    var c = G.skinTorso ? skin : G.torso, dark = sh(L.shirt, 0.55);
    b.box(0.4 * bw, 0.22, 0.24 * bw, 0, 1.06, 0, c);
    b.box(0.47 * bw, 0.3, 0.27 * bw, 0, 1.3, 0, c);
    if (bw >= 1.15) b.box(0.34 * bw, 0.18, 0.06, 0, 1.06, 0.12 * bw + 0.02, c);    // the big unit's belly
    var bz = bw >= 1.15 ? 0.12 * bw + 0.05 : fz;
    switch (G.top) {
      case 'tee': b.box(0.17 * bw, 0.13, 0.01, 0, 1.29, fz, teePrint({ shade: sh }, L.shirt)); break;
      case 'flannel':
        b.box(0.475 * bw, 0.035, 0.275 * bw, 0, 1.34, 0, dark); b.box(0.405 * bw, 0.035, 0.245 * bw, 0, 1.1, 0, dark);
        b.box(0.035, 0.3, 0.275 * bw, 0.1 * bw, 1.3, 0, dark); b.box(0.035, 0.3, 0.275 * bw, -0.1 * bw, 1.3, 0, dark);
        b.box(0.24, 0.05, 0.05, 0, 1.445, 0.11 * bw, dark); break;
      case 'hoodie':
        b.box(0.36 * bw, 0.17, 0.13, 0, 1.44, -0.165 * bw, sh(L.shirt, 0.9));
        b.box(0.3 * bw, 0.11, 0.012, 0, 1.07, 0.12 * bw + 0.006, sh(L.shirt, 0.84));
        b.box(0.016, 0.13, 0.012, 0.05, 1.36, fz + 0.004, 0xe8e4da); b.box(0.016, 0.13, 0.012, -0.05, 1.36, fz + 0.004, 0xe8e4da); break;
      case 'jacket':
        var inner = luminance(L.shirt) < 0.2 ? 0x3b3b41 : 0xe6e1d6;
        b.box(0.1, 0.28, 0.008, 0, 1.28, fz - 0.001, inner);
        b.box(0.07, 0.3, 0.012, 0.075, 1.29, fz + 0.002, sh(L.shirt, 1.25), 0, 0, -0.28);
        b.box(0.07, 0.3, 0.012, -0.075, 1.29, fz + 0.002, sh(L.shirt, 1.25), 0, 0, 0.28);
        b.box(0.42 * bw, 0.05, 0.255 * bw, 0, 0.965, 0, sh(L.shirt, 0.8)); break;
      case 'tank':
        b.box(0.14 * bw, 0.08, 0.01, 0, 1.415, fz, skin);                                  // scoop neck
        b.box(0.1 * bw, 0.06, 0.28 * bw, 0.19 * bw, 1.42, 0, skin); b.box(0.1 * bw, 0.06, 0.28 * bw, -0.19 * bw, 1.42, 0, skin); break;
      case 'jersey':
        var stripe = luminance(L.shirt) > 0.6 ? 0xb3262b : 0xf0ece4;
        b.box(0.405 * bw, 0.04, 0.245 * bw, 0, 1.0, 0, stripe); b.box(0.405 * bw, 0.02, 0.245 * bw, 0, 1.045, 0, sh(stripe, 0.8));
        b.box(0.26, 0.05, 0.05, 0, 1.445, 0.1 * bw, stripe);                               // lace-up collar
        b.box(0.13, 0.12, 0.01, 0, 1.28, fz, stripe);                                      // the crest: a gopher-ish maple
        pixels(b, MOTIFS.maple, 0.013, [0, 1.285, fz + 0.005], [1, 0, 0], [0, -1, 0], [0, 0, 1], 0.003, null, L.shirt);
        var num = textGrid('19');
        if (num) pixels(b, num, 0.03, [0, 1.25, -0.135 * bw - 0.004], [-1, 0, 0], [0, -1, 0], [0, 0, -1], 0.003, null, stripe);
        break;
      case 'denim':
        b.box(0.12, 0.28, 0.008, 0, 1.28, fz - 0.001, G.skinTorso ? skin : (V.outfit === 'cdntux' ? 0xe8e4dc : L.shirt));   // inner tee
        b.box(0.075, 0.3, 0.012, 0.08, 1.29, fz + 0.002, sh(DENIM, 1.12), 0, 0, -0.2); b.box(0.075, 0.3, 0.012, -0.08, 1.29, fz + 0.002, sh(DENIM, 1.12), 0, 0, 0.2);
        b.box(0.3, 0.05, 0.06, 0, 1.445, 0.1 * bw, sh(DENIM, 0.9));                       // collar
        b.box(0.07, 0.05, 0.008, 0.12 * bw, 1.33, fz + 0.004, sh(DENIM, 0.85)); b.box(0.07, 0.05, 0.008, -0.12 * bw, 1.33, fz + 0.004, sh(DENIM, 0.85));   // pockets
        b.box(0.42 * bw, 0.04, 0.255 * bw, 0, 0.965, 0, sh(DENIM, 0.85)); break;
      case 'suit':                                                                          // the rhinestone suit (a Nudie)
        var yoke = sh(L.shirt, 0.72);
        b.box(0.475 * bw, 0.07, 0.275 * bw, 0, 1.415, 0, yoke);
        b.box(0.1, 0.28, 0.008, 0, 1.28, fz - 0.001, 0xf0ece4); b.box(0.02, 0.12, 0.01, 0, 1.33, fz + 0.004, 0x2a211b);   // shirt + bolo tie
        b.box(0.03, 0.03, 0.012, 0, 1.4, fz + 0.006, 0xd4a940);
        b.box(0.07, 0.3, 0.012, 0.075, 1.29, fz + 0.002, yoke, 0, 0, -0.28); b.box(0.07, 0.3, 0.012, -0.075, 1.29, fz + 0.002, yoke, 0, 0, 0.28);
        for (var k = 0; k < 5; k++) { b.box(0.016, 0.016, 0.006, 0.15 * bw, 1.38 - k * 0.07, fz + 0.004, 0xfff4c8); b.box(0.016, 0.016, 0.006, -0.15 * bw, 1.38 - k * 0.07, fz + 0.004, 0xfff4c8); }
        b.box(0.42 * bw, 0.05, 0.255 * bw, 0, 0.965, 0, yoke); break;
      case 'skin':
        b.box(0.12 * bw, 0.012, 0.008, 0.07 * bw, 1.25, fz - 0.002, sh(skin, 0.82)); b.box(0.12 * bw, 0.012, 0.008, -0.07 * bw, 1.25, fz - 0.002, sh(skin, 0.82));   // pecs
        b.box(0.012, 0.012, 0.006, 0, 1.02, bz, sh(skin, 0.7));                          // belly button
        break;
    }
    if (G.vest) {                                                                          // leather vest / battle vest: open front, full back
      var vc = G.vest, vw = 0.13 * bw;
      b.box(vw, 0.46, 0.012, 0.17 * bw, 1.2, fz + 0.002, vc); b.box(vw, 0.46, 0.012, -0.17 * bw, 1.2, fz + 0.002, vc);
      b.box(0.49 * bw, 0.5, 0.012, 0, 1.2, -0.135 * bw - 0.004, vc);
      b.box(0.012, 0.5, 0.28 * bw, 0.237 * bw, 1.2, 0, vc); b.box(0.012, 0.5, 0.28 * bw, -0.237 * bw, 1.2, 0, vc);
      if (G.patches) {
        var PATCH = [0xb3262b, 0xe8e4dc, 0xd9a520, 0x141418, 0x3f7fe0];
        b.box(0.05, 0.04, 0.006, 0.19 * bw, 1.34, fz + 0.01, PATCH[0]); b.box(0.045, 0.06, 0.006, 0.15 * bw, 1.2, fz + 0.01, PATCH[1]);
        b.box(0.05, 0.035, 0.006, -0.19 * bw, 1.3, fz + 0.01, PATCH[2]); b.box(0.04, 0.05, 0.006, -0.15 * bw, 1.12, fz + 0.01, PATCH[4]);
        b.box(0.3 * bw, 0.2, 0.006, 0, 1.25, -0.135 * bw - 0.012, PATCH[3]);             // the back patch
        var ini = textGrid(bandInitials());
        if (ini) pixels(b, ini, 0.022, [0, 1.25, -0.135 * bw - 0.015], [-1, 0, 0], [0, -1, 0], [0, 0, -1], 0.003, null, 0xe8e4dc);
      } else {
        for (var st = 0; st < 5; st++) { b.box(0.014, 0.014, 0.008, 0.115 * bw, 1.4 - st * 0.09, fz + 0.01, METAL); b.box(0.014, 0.014, 0.008, -0.115 * bw, 1.4 - st * 0.09, fz + 0.01, METAL); }
      }
    }
    // Chest tattoo (shows with a bare torso).
    var chest = tat(V, 'chest');
    if (chest && G.skinTorso) {
      var cg = designGrid(chest.design);
      if (cg) pixels(b, cg, Math.min(0.016, 0.16 / Math.max(cg.length, cg[0].length)), [0, 1.3, fz - 0.002], [1, 0, 0], [0, -1, 0], [0, 0, 1], 0.004);
    }
  }
  function tat(V, spot) { var l = V.tattoos || []; for (var i = 0; i < l.length; i++) if (l[i].spot === spot) return l[i]; return null; }

  function arm(b, G, L, V, s, i, sx, bw, sh, skin, o) {
    var side = s > 0 ? 'L' : 'R', full = tat(V, 'sleeve' + side), half = tat(V, 'half' + side), ink = full || half;
    var ox = s * sx;
    b.bone = i ? B_ARM_R : B_ARM_L;
    if (G.arms === 'short') { b.box(0.145, 0.16, 0.155, ox, 1.3, 0, G.torso); b.box(0.12, 0.16, 0.13, ox, 1.15, 0, skin); }
    else if (G.arms === 'none') { b.box(0.125, 0.33, 0.135, ox, 1.215, 0, skin); }
    else b.box(0.135, 0.31, 0.145, ox, 1.225, 0, G.sleeve);
    if (G.top === 'flannel' && G.arms === 'long') b.box(0.14, 0.03, 0.15, ox, 1.2, 0, sh(L.shirt, 0.55));
    if (G.top === 'jersey' && G.arms === 'long') b.box(0.14, 0.04, 0.15, ox, 1.12, 0, luminance(L.shirt) > 0.6 ? 0xb3262b : 0xf0ece4);
    if (G.suit) { b.box(0.14, 0.05, 0.15, ox, 1.34, 0, sh(L.shirt, 0.72)); rhinestones(b, s * (sx + 0.07), 1.22, 0, 'x', 3, 0.2); }
    if (full && G.arms !== 'long') {                                   // a full sleeve shows on the bare upper arm
      var ux = s * (sx + (G.arms === 'none' ? 0.0625 : 0.06)), uy = G.arms === 'none' ? 1.2 : 1.15, ug = designGrid(full.design);
      if (ug) pixels(b, ug, Math.min(0.0085, 0.12 / Math.max(ug.length, ug[0].length)), [ux, uy, 0], [0, 0, -s], [0, -1, 0], [s, 0, 0], 0.003);
      swirls(b, ox, uy, G.arms === 'none' ? 0.0625 : 0.06, 0.068, G.arms === 'none' ? 0.1 : 0.05, i + 7);
    }
    b.bone = i ? B_FORE_R : B_FORE_L;
    var bare = G.arms !== 'long';
    b.box(0.12, 0.25, 0.13, ox, 0.955, 0, bare ? skin : G.sleeve);
    if (G.top === 'flannel' && G.arms === 'long') b.box(0.125, 0.03, 0.135, ox, 0.95, 0, sh(L.shirt, 0.55));
    if ((G.top === 'denim' || G.top === 'suit') && G.arms === 'long') b.box(0.126, 0.04, 0.136, ox, 0.845, 0, G.suit ? sh(L.shirt, 0.72) : sh(DENIM, 0.85));
    if (G.top === 'jersey' && G.arms === 'long') b.box(0.125, 0.035, 0.135, ox, 0.9, 0, luminance(L.shirt) > 0.6 ? 0xb3262b : 0xf0ece4);
    if (ink && bare) {
      var fg = designGrid(ink.design);
      if (fg) pixels(b, fg, Math.min(0.0085, 0.2 / Math.max(fg.length, fg[0].length * 1.6)), [s * (sx + 0.06), 0.96, 0], [0, 0, -s], [0, -1, 0], [s, 0, 0], 0.003);
      if (full) swirls(b, ox, 0.96, 0.06, 0.065, 0.09, i + 3);
    }
    if (has(V.stageExtras, 'wristbands')) {
      b.box(0.132, 0.05, 0.142, ox, 0.86, 0, LEATHER);
      for (var k = -1; k <= 1; k++) { b.box(0.008, 0.014, 0.014, s * (sx + 0.068), 0.86, k * 0.04, METAL); b.box(0.014, 0.014, 0.008, ox + k * 0.035, 0.86, 0.073, METAL); }
    }
    b.box(0.11, 0.1, 0.12, ox, 0.78, 0.005, skin);                                        // hand
    var kn = V.knuckles && (s > 0 ? V.knuckles.left : V.knuckles.right);
    if (kn) {
      var kg = textGrid(kn);
      if (kg) pixels(b, kg, 0.0062, [s * (sx + 0.055), 0.768, 0.005], [0, 0, -s], [0, -1, 0], [s, 0, 0], 0.003);
    }
    if (o.sticks) b.box(0.024, 0.024, 0.42, ox, 0.77, 0.15, hexOf(o.sticks, 0xd8b27a), 0.25);
  }
  // Sleeve filler: little ink strokes around the front, back and inside of a limb segment (deterministic).
  function swirls(b, ox, y, hwx, hwz, span, seed) {
    for (var k = 0; k < 7; k++) {
      var h = ((seed * 7 + k * 13) % 11) / 11, yy = y - span / 2 + span * (k + 0.5) / 7, c = k % 2 ? INK : INK2;
      if (k % 3 === 0) b.box(0.05, 0.012, 0.004, ox + (h - 0.5) * 0.05, yy, hwz + 0.002, c);
      else if (k % 3 === 1) b.box(0.05, 0.012, 0.004, ox + (h - 0.5) * 0.05, yy, -hwz - 0.002, c);
      else b.box(0.004, 0.012, 0.05, ox - (ox > 0 ? 1 : -1) * (hwx + 0.002), yy, (h - 0.5) * 0.05, c);
    }
  }

  function head(b, L, V, F, face, skin, hair, grey, paint, sh) {
    var hw = F.hw, hd = F.hd, fzz = hd, my = F.mouth, fc = V.face || {}, i, s;
    b.box(0.13, 0.1, 0.13, 0, 1.47, 0, paint ? face : skin);                                  // neck
    var nt = tat(V, 'neck');
    if (nt) { var ng = designGrid(nt.design); if (ng) pixels(b, ng, Math.min(0.007, 0.075 / Math.max(ng.length, ng[0].length)), [0.066, 1.47, 0], [0, 0, -1], [0, -1, 0], [1, 0, 0], 0.003); }
    b.box(hw * 2, F.hh * 2, hd * 2, 0, F.cy, 0, face);
    if (F.chin) b.box(F.chin[0], F.chin[1], F.chin[2], 0, F.chin[3], 0, face);
    if (F.jaw) b.box(F.jaw[0], F.jaw[1], F.jaw[2], 0, F.jaw[3], 0, face);
    b.box(0.04, 0.08, 0.06, hw + 0.015, 1.69, 0, sh(face, 0.92)); b.box(0.04, 0.08, 0.06, -hw - 0.015, 1.69, 0, sh(face, 0.92));
    if (paint) corpsePaintParts(b, hd, my);
    // Nose
    var nc = sh(face, 0.9);
    switch (fc.nose) {
      case 'big': b.box(0.075, 0.085, 0.07, 0, 1.65, hd + 0.025, nc); break;
      case 'long': b.box(0.045, 0.1, 0.055, 0, 1.643, hd + 0.02, nc); break;
      case 'pointy': b.cyl(0, 0.036, 0.075, 4, 0, 1.655, hd + 0.03, nc, Math.PI / 2, Math.PI / 4, 0); break;
      case 'broken': b.box(0.05, 0.075, 0.05, 0.008, 1.655, hd + 0.015, nc, 0, 0, 0.22); b.box(0.03, 0.02, 0.03, 0.012, 1.676, hd + 0.03, sh(face, 0.84)); break;
      default: b.box(0.05, 0.07, 0.05, 0, 1.655, hd + 0.015, nc);
    }
    // Mouth
    var mz = hd + 0.002, lip = sh(face, 0.6);
    switch (fc.mouth) {
      case 'grin': b.box(0.12, 0.034, 0.012, 0, my, mz, 0x3a1a1a); b.box(0.1, 0.012, 0.01, 0, my + 0.008, mz + 0.004, TEETH); break;
      case 'smirk': b.box(0.08, 0.018, 0.012, 0.012, my + 0.004, mz, lip, 0, 0, 0.22); break;
      case 'frown': b.box(0.05, 0.016, 0.012, 0.022, my - 0.004, mz, lip, 0, 0, -0.35); b.box(0.05, 0.016, 0.012, -0.022, my - 0.004, mz, lip, 0, 0, 0.35); break;
      case 'scream': b.box(0.085, 0.07, 0.012, 0, my - 0.012, mz, 0x2a0e0e); b.box(0.075, 0.014, 0.01, 0, my + 0.016, mz + 0.004, TEETH); b.box(0.05, 0.02, 0.01, 0, my - 0.036, mz + 0.004, 0xc0484a); break;
      default: b.box(0.09, 0.018, 0.012, 0, my, mz, lip);
    }
    // Eyes
    for (i = 0; i < 2; i++) {
      s = i ? -1 : 1;
      var ex = s * 0.075, ez = hd + 0.003, ec = fc.eyeColor || '#5a3a22';
      switch (fc.eyes) {
        case 'wide': b.box(0.07, 0.055, 0.012, ex, 1.715, ez, 0xf2efe8); b.box(0.034, 0.044, 0.012, ex, 1.713, ez + 0.004, ec); b.box(0.016, 0.02, 0.01, ex, 1.713, ez + 0.008, 0x0c0c0e); break;
        case 'narrow': b.box(0.07, 0.026, 0.012, ex, 1.713, ez, 0xf2efe8); b.box(0.03, 0.026, 0.012, ex, 1.713, ez + 0.004, ec); b.box(0.076, 0.01, 0.012, ex, 1.73, ez + 0.004, 0x16120f); break;
        case 'big': b.box(0.075, 0.085, 0.012, ex, 1.715, ez, 0xf2efe8); b.box(0.045, 0.06, 0.012, ex, 1.71, ez + 0.004, ec); b.box(0.022, 0.03, 0.01, ex, 1.71, ez + 0.008, 0x0c0c0e); b.box(0.012, 0.012, 0.008, ex + 0.012, 1.724, ez + 0.012, 0xffffff); break;
        case 'sleepy': b.box(0.068, 0.04, 0.012, ex, 1.71, ez, 0xf2efe8); b.box(0.032, 0.034, 0.012, ex, 1.707, ez + 0.004, ec); b.box(0.016, 0.018, 0.01, ex, 1.707, ez + 0.008, 0x0c0c0e); b.box(0.074, 0.022, 0.014, ex, 1.724, ez + 0.007, sh(face, 0.88)); break;
        default: b.box(0.05, 0.065, 0.02, ex, 1.715, ez, 0x16120f);
      }
    }
    // Brows
    var bc = sh(grey ? mix(hair, 0xb8b8b8, 0.5) : hair, 0.85), bz = hd + 0.003;
    switch (fc.brows) {
      case 'thick': b.box(0.095, 0.036, 0.02, 0.075, 1.775, bz, bc); b.box(0.095, 0.036, 0.02, -0.075, 1.775, bz, bc); break;
      case 'angry': b.box(0.09, 0.026, 0.02, 0.075, 1.766, bz, bc, 0, 0, 0.35); b.box(0.09, 0.026, 0.02, -0.075, 1.766, bz, bc, 0, 0, -0.35); break;
      case 'raised': b.box(0.085, 0.022, 0.02, 0.075, 1.795, bz, bc, 0, 0, 0.15); b.box(0.085, 0.022, 0.02, -0.075, 1.772, bz, bc); break;
      case 'unibrow': b.box(0.25, 0.03, 0.02, 0, 1.774, bz, bc); break;
      default: b.box(0.085, 0.022, 0.02, 0.075, 1.772, bz, bc); b.box(0.085, 0.022, 0.02, -0.075, 1.772, bz, bc);
    }
    // Age
    if (V.age === 'lived' || V.age === 'grizzled') {
      var wr = sh(face, 0.8);
      b.box(0.05, 0.008, 0.004, 0.075, 1.668, hd + 0.001, wr); b.box(0.05, 0.008, 0.004, -0.075, 1.668, hd + 0.001, wr);
      b.box(0.008, 0.05, 0.004, 0.068, my + 0.03, hd + 0.001, wr); b.box(0.008, 0.05, 0.004, -0.068, my + 0.03, hd + 0.001, wr);
      if (grey) { b.box(0.16, 0.007, 0.004, 0, 1.815, hd + 0.001, wr); b.box(0.12, 0.007, 0.004, 0, 1.835, hd + 0.001, wr); }
    }
    var tearT = tat(V, 'teardrop');
    if (tearT) pixels(b, MOTIFS.tear, 0.011, [-0.085, 1.662, hd + 0.001], [1, 0, 0], [0, -1, 0], [0, 0, 1], 0.004, null, 0x1f2c5a);
    // Facial hair
    var hc = grey ? mix(hair, 0xc4c4c4, 0.45) : hair;
    facialHair(b, V.facialHair, F, hc, face, my);
    // Glasses
    glassesParts(b, V.glasses, F, my);
    // Piercings
    (V.piercings || []).forEach(function (p) { piercing(b, p, F, my); });
    // Hair + headwear
    var hwr = V.headwear && V.headwear !== 'none' ? V.headwear : null, style = L.hairStyle;
    if (style === 'cap') { style = 'short'; if (!hwr) hwr = 'backcap'; }
    var hatted = hwr === 'toque' || hwr === 'trucker' || hwr === 'backcap' || hwr === 'cowboy' || hwr === 'bandana';
    hairV8(b, style, F, hair, skin, sh, hatted, grey);
    if (hwr) headwear(b, hwr, F, hatColor(L, V), sh);
  }
  function corpsePaintParts(b, hd, my) {
    var z = hd + 0.0015, blk = 0x0b0b0d;
    b.box(0.1, 0.12, 0.004, 0.075, 1.71, z, blk); b.box(0.1, 0.12, 0.004, -0.075, 1.71, z, blk);
    b.box(0.03, 0.08, 0.004, 0.09, 1.8, z, blk, 0, 0, -0.35); b.box(0.03, 0.08, 0.004, -0.09, 1.8, z, blk, 0, 0, 0.35);
    b.box(0.02, 0.07, 0.004, 0.075, 1.61, z, blk); b.box(0.02, 0.07, 0.004, -0.075, 1.61, z, blk);
    b.box(0.02, 0.09, 0.004, 0.03, my - 0.02, z, blk); b.box(0.02, 0.09, 0.004, -0.03, my - 0.02, z, blk);
  }
  function facialHair(b, kind, F, hc, face, my) {
    var dy = my - 1.585, zf = F.hd - 0.16, wf = F.hw / 0.17, hd = F.hd;
    switch (kind) {
      case 'stubble':
        var st = mix(face, hc, 0.42);
        b.box(0.13, 0.024, 0.004, 0, my + 0.024, hd + 0.001, st); b.box(0.22 * wf, 0.07, 0.004, 0, my - 0.05, hd + 0.001, st);
        b.box(0.006, 0.13, 0.2, F.hw + 0.001, 1.6 + dy * 0.5, 0.02, st); b.box(0.006, 0.13, 0.2, -F.hw - 0.001, 1.6 + dy * 0.5, 0.02, st); break;
      case 'goatee':
        b.box(0.11, 0.09, 0.05, 0, my - 0.055, 0.15 + zf, hc); b.box(0.13, 0.025, 0.03, 0, my + 0.032, 0.178 + zf, hc);
        b.box(0.022, 0.07, 0.03, 0.06, my - 0.005, 0.17 + zf, hc); b.box(0.022, 0.07, 0.03, -0.06, my - 0.005, 0.17 + zf, hc); break;
      case 'full': case 'viking':
        b.box(0.34 * wf, 0.15, 0.07, 0, 1.57 + dy, 0.14 + zf, hc); b.box(0.22 * wf, 0.08, 0.1, 0, 1.49 + dy, 0.12 + zf, hc);
        b.box(0.04, 0.16, 0.2, 0.17 * wf, 1.6 + dy * 0.5, 0.05 + zf, hc); b.box(0.04, 0.16, 0.2, -0.17 * wf, 1.6 + dy * 0.5, 0.05 + zf, hc);
        b.box(0.1, 0.012, 0.012, 0, my, hd + 0.075, 0x2a0e0e);                           // a mouth in the beard
        if (kind === 'viking') {
          for (var s = -1; s <= 1; s += 2) {
            for (var k = 0; k < 4; k++) b.box(0.045, 0.06, 0.045, s * 0.05, 1.42 + dy - k * 0.058, 0.15 + zf - k * 0.008, k % 2 ? hc : mix(hc, 0x000000, 0.2));
            b.box(0.05, 0.02, 0.05, s * 0.05, 1.42 + dy - 4 * 0.058 + 0.03, 0.12 + zf, METAL);
          }
        }
        break;
      case 'horseshoe':                                                                    // the v0.7 moustache
        b.box(0.17, 0.035, 0.035, 0, 1.617 + dy, 0.178 + zf, hc); b.box(0.035, 0.06, 0.03, 0.095, 1.597 + dy, 0.176 + zf, hc); b.box(0.035, 0.06, 0.03, -0.095, 1.597 + dy, 0.176 + zf, hc); break;
      case 'handlebar':
        b.box(0.15, 0.03, 0.035, 0, 1.617 + dy, 0.178 + zf, hc);
        b.box(0.05, 0.022, 0.03, 0.095, 1.625 + dy, 0.176 + zf, hc, 0, 0, 0.5); b.box(0.05, 0.022, 0.03, -0.095, 1.625 + dy, 0.176 + zf, hc, 0, 0, -0.5);
        b.box(0.02, 0.035, 0.025, 0.122, 1.648 + dy, 0.172 + zf, hc); b.box(0.02, 0.035, 0.025, -0.122, 1.648 + dy, 0.172 + zf, hc); break;
      case 'chops':
        b.box(0.07, 0.2, 0.2, F.hw - 0.01, 1.6 + dy * 0.5, 0.06 + zf, hc); b.box(0.07, 0.2, 0.2, -F.hw + 0.01, 1.6 + dy * 0.5, 0.06 + zf, hc);
        b.box(0.17, 0.03, 0.035, 0, 1.617 + dy, 0.178 + zf, hc); break;
    }
  }
  function glassesParts(b, kind, F, my) {
    var z = F.hd + 0.012, ax = F.hw + 0.003, i, s;
    switch (kind) {
      case 'shades':                                                                        // the v0.7 sunglasses
        b.box(0.33, 0.075, 0.03, 0, 1.712, z + 0.002, 0x0c0c0e); b.box(0.06, 0.014, 0.005, -0.09, 1.728, z + 0.018, 0x5a6a80);
        b.box(0.012, 0.025, 0.2, ax, 1.72, 0.07, 0x0c0c0e); b.box(0.012, 0.025, 0.2, -ax, 1.72, 0.07, 0x0c0c0e); break;
      case 'specs':                                                                         // the v0.7 glasses
        for (i = 0; i < 2; i++) {
          s = i ? -1 : 1;
          b.box(0.1, 0.08, 0.015, s * 0.075, 1.713, z, 0x2a2a2a); b.box(0.075, 0.055, 0.01, s * 0.075, 1.713, z + 0.006, 0xbcd0e0);
          b.box(0.035, 0.045, 0.01, s * 0.075, 1.713, z + 0.012, 0x16120f);
        }
        break;
      case 'round':
        for (i = 0; i < 2; i++) {
          s = i ? -1 : 1;
          b.cyl(0.044, 0.044, 0.01, 8, s * 0.075, 1.713, z, 0x2a2a2a, Math.PI / 2);
          b.cyl(0.035, 0.035, 0.01, 8, s * 0.075, 1.713, z + 0.004, 0xbcd0e0, Math.PI / 2);
          b.box(0.03, 0.036, 0.01, s * 0.075, 1.713, z + 0.009, 0x16120f);
          b.box(0.012, 0.022, 0.19, s * ax, 1.72, 0.07, 0x2a2a2a);
        }
        b.box(0.035, 0.01, 0.01, 0, 1.722, z, 0x2a2a2a); break;
      case 'aviators':
        for (i = 0; i < 2; i++) {
          s = i ? -1 : 1;
          b.box(0.104, 0.086, 0.01, s * 0.078, 1.708, z, 0xc9a23a, 0, 0, s * 0.12);
          b.box(0.088, 0.07, 0.012, s * 0.078, 1.708, z + 0.004, 0x3a2c22, 0, 0, s * 0.12);
          b.box(0.03, 0.012, 0.006, s * 0.06, 1.728, z + 0.011, 0x8a7a6a);
          b.box(0.01, 0.018, 0.19, s * ax, 1.73, 0.07, 0xc9a23a);
        }
        b.box(0.05, 0.008, 0.008, 0, 1.748, z, 0xc9a23a); b.box(0.04, 0.008, 0.008, 0, 1.726, z, 0xc9a23a); break;
    }
  }
  function piercing(b, kind, F, my) {
    var hw = F.hw, hd = F.hd, ex = hw + 0.037, s, i;
    switch (kind) {
      case 'studs': b.box(0.008, 0.02, 0.02, ex, 1.662, 0.012, METAL); b.box(0.008, 0.02, 0.02, -ex, 1.662, 0.012, METAL); break;
      case 'hoops':
        for (i = 0; i < 2; i++) {
          s = i ? -1 : 1;
          b.box(0.006, 0.026, 0.006, s * (ex + 0.002), 1.628, 0.022, METAL, 0.6); b.box(0.006, 0.026, 0.006, s * (ex + 0.002), 1.628, 0.002, METAL, -0.6);
          b.box(0.006, 0.006, 0.02, s * (ex + 0.002), 1.614, 0.012, METAL);
        }
        break;
      case 'gauges':
        b.cyl(0.024, 0.024, 0.012, 8, ex - 0.004, 1.655, 0.012, 0x121214, 0, 0, Math.PI / 2); b.cyl(0.024, 0.024, 0.012, 8, -ex + 0.004, 1.655, 0.012, 0x121214, 0, 0, Math.PI / 2);
        b.box(0.004, 0.05, 0.05, ex + 0.003, 1.655, 0.012, METAL); b.box(0.004, 0.05, 0.05, -ex - 0.003, 1.655, 0.012, METAL); break;
      case 'nosering': b.box(0.006, 0.02, 0.006, 0.03, 1.63, hd + 0.03, METAL); b.box(0.018, 0.006, 0.006, 0.037, 1.62, hd + 0.03, METAL); break;
      case 'septum': b.box(0.03, 0.007, 0.008, 0, 1.612, hd + 0.03, METAL); b.box(0.007, 0.018, 0.008, 0.015, 1.62, hd + 0.03, METAL); b.box(0.007, 0.018, 0.008, -0.015, 1.62, hd + 0.03, METAL); break;
      case 'eyebrow': b.box(0.013, 0.013, 0.012, 0.12, 1.79, hd + 0.006, METAL); b.box(0.013, 0.013, 0.012, 0.124, 1.755, hd + 0.006, METAL); break;
      case 'lip': b.box(0.006, 0.02, 0.008, 0.028, my - 0.016, hd + 0.01, METAL); b.box(0.016, 0.006, 0.008, 0.033, my - 0.026, hd + 0.01, METAL); break;
    }
  }
  // Hair in every style, sized to the face. hatted: only what shows under a hat (sides, back, long lengths).
  function hairV8(b, st, F, h, skin, sh, hatted, grey) {
    var hw = F.hw, hd = F.hd, T = TOP_Y, W = 2 * hw + 0.02, D = 2 * hd + 0.02, k, s;
    var cap = function (t, col) { if (!hatted) b.box(W, t || 0.07, D, 0, T + 0.02, -0.005, col == null ? h : col); };
    var fringe = function (len) { if (!hatted) b.box(2 * hw, len || 0.05, 0.04, 0, T - 0.02 - ((len || 0.05) - 0.05) / 2, hd, h); };
    var sides = function (len, col) { b.box(0.03, len, 0.2, hw + 0.01, T - 0.015 - len / 2, -0.05, col == null ? h : col); b.box(0.03, len, 0.2, -hw - 0.01, T - 0.015 - len / 2, -0.05, col == null ? h : col); };
    var back = function (w, len, y) { b.box(w, len, 0.06, 0, y, -hd, h); };
    var shaved = function () { b.box(2 * hw + 0.005, 0.02, 2 * hd + 0.005, 0, T + 0.001, 0, sh(skin, 0.85)); };
    switch (st) {
      case 'bald':
        b.box(0.12, 0.012, 0.1, 0.03, T + 0.002, 0.02, sh(skin, 1.12));
        if (grey) { sides(0.1, 0x9a9a9a); b.box(2 * hw, 0.1, 0.03, 0, 1.73, -hd - 0.005, 0x9a9a9a); }
        return;
      case 'buzz':
        var hb = mix(h, skin, 0.3);
        if (!hatted) b.box(W - 0.012, 0.022, D - 0.012, 0, T + 0.006, -0.005, hb);
        b.box(0.012, 0.14, 0.24, hw + 0.002, 1.8, -0.03, hb); b.box(0.012, 0.14, 0.24, -hw - 0.002, 1.8, -0.03, hb);
        b.box(2 * hw, 0.16, 0.012, 0, 1.79, -hd - 0.002, hb); break;
      case 'long': cap(); fringe(); b.box(W + 0.02, 0.62, 0.08, 0, 1.6, -hd - 0.01, h);
        b.box(0.05, 0.45, 0.27, hw + 0.02, 1.67, -0.02, h); b.box(0.05, 0.45, 0.27, -hw - 0.02, 1.67, -0.02, h); break;
      case 'mullet': cap(); fringe(); sides(0.12); b.box(2 * hw, 0.5, 0.07, 0, 1.64, -hd - 0.01, h); break;
      case 'bun': cap(); fringe(); sides(0.12); back(W, 0.2, 1.79); if (!hatted) b.box(0.13, 0.11, 0.1, 0, 1.86, -hd - 0.06, h); break;
      case 'mohawk': if (!hatted) b.box(0.08, 0.17, 2 * hd + 0.06, 0, T + 0.085, -0.01, h); shaved(); break;
      case 'spiky':
        cap(0.05); if (hatted) { sides(0.08); break; }
        var SP = [[0, 0.02], [0.1, 0.06], [-0.1, 0.06], [0.09, -0.09], [-0.09, -0.09], [0, -0.12], [0, 0.12]];
        for (k = 0; k < SP.length; k++) b.cyl(0, 0.06, 0.16, 4, SP[k][0], T + 0.105, SP[k][1], h, SP[k][1] * 2.5, 0, -SP[k][0] * 2.5);
        break;
      case 'mop': cap(0.09); fringe(0.09); sides(0.2); back(W, 0.3, 1.74); break;
      case 'curly':
        cap(0.06);
        for (k = 0; k < 16; k++) {
          var a = k / 16 * Math.PI * 2, top = k < 8, cz = Math.cos(a) * (top ? hd - 0.03 : hd + 0.015), cx = Math.sin(a) * (top ? hw - 0.03 : hw + 0.015);
          if (top && hatted) continue;
          if (!top && cz > hd * 0.35) continue;                                          // keep the face clear
          b.box(0.08, 0.08, 0.08, cx, top ? T + 0.05 : T - 0.07, cz, k % 2 ? h : sh(h, 0.82));
        }
        for (k = 0; k < 5; k++) b.box(0.08, 0.08, 0.08, (k - 2) * 0.075, T - 0.17, -hd - 0.02, k % 2 ? sh(h, 0.82) : h);
        break;
      case 'shaggy':
        cap(0.07);
        if (!hatted) { b.box(0.11, 0.09, 0.04, -0.11, T - 0.04, hd, h); b.box(0.12, 0.07, 0.04, 0, T - 0.03, hd, sh(h, 0.9)); b.box(0.11, 0.1, 0.04, 0.11, T - 0.045, hd, h); }
        sides(0.22); b.box(0.035, 0.1, 0.12, hw + 0.02, 1.62, -0.08, sh(h, 0.88)); b.box(0.035, 0.1, 0.12, -hw - 0.02, 1.62, -0.08, sh(h, 0.88));
        back(W, 0.36, 1.7); break;
      case 'manbun':
        cap(0.045); sides(0.08); back(W, 0.14, 1.8);
        if (!hatted) { b.box(0.12, 0.1, 0.11, 0, T + 0.06, -hd + 0.02, h); b.box(0.125, 0.02, 0.115, 0, T + 0.015, -hd + 0.02, 0x2a2a2e); }
        break;
      case 'hathair':
        if (!hatted) { b.box(W, 0.05, D, 0, T + 0.01, -0.005, h); b.box(W + 0.004, 0.012, D + 0.004, 0, T - 0.01, -0.005, sh(h, 0.8)); }
        sides(0.12); back(W, 0.22, 1.77); break;
      case 'dreads':
        cap(0.06);
        for (k = 0; k < 12; k++) {
          var th = (-110 + 220 * k / 11) * Math.PI / 180, len = 0.36 + 0.06 * ((k * 7) % 3);
          b.box(0.05, len, 0.05, Math.sin(th) * (hw + 0.02), T - 0.04 - len / 2, -Math.cos(th) * (hd + 0.02), k % 2 ? h : sh(h, 0.8));
        }
        b.box(0.045, 0.3, 0.045, hw + 0.015, T - 0.19, 0.07, sh(h, 0.9)); b.box(0.045, 0.3, 0.045, -hw - 0.015, T - 0.19, 0.07, h);
        break;
      case 'braids':
        cap(0.06); sides(0.1); back(W, 0.14, 1.8);
        for (s = -1; s <= 1; s += 2) {
          for (k = 0; k < 6; k++) b.box(0.05, 0.065, 0.05, s * (hw - 0.01), 1.74 - k * 0.06, -0.12 - k * 0.012, k % 2 ? h : sh(h, 0.84));
          b.box(0.055, 0.02, 0.055, s * (hw - 0.01), 1.37, -0.19, 0xd23c3c);
        }
        break;
      case 'spikes':
        shaved();
        if (hatted) break;
        b.box(0.08, 0.03, 2 * hd, 0, T + 0.01, 0, h);
        for (k = 0; k < 5; k++) b.cyl(0, 0.045, 0.26, 4, 0, T + 0.13, hd - 0.04 - k * (2 * hd - 0.08) / 4, k % 2 ? h : sh(h, 1.15), -0.3 + k * 0.15, Math.PI / 4, 0);
        break;
      case 'slick':
        if (!hatted) { b.box(W, 0.05, D, 0, T + 0.012, -0.005, sh(h, 1.12)); b.box(2 * hw - 0.04, 0.06, 0.09, 0, T + 0.035, hd - 0.06, sh(h, 1.2)); }
        sides(0.1); b.box(W, 0.2, 0.06, 0, 1.78, -hd, h); break;
      default:                                                                              // 'short'
        if (hatted) { sides(0.1); b.box(2 * hw, 0.1, 0.05, 0, 1.745, -hd, h); break; }
        cap(); fringe(); sides(0.13); back(W, 0.25, 1.76);
    }
    if (grey && st !== 'bald') { b.box(0.034, 0.08, 0.1, hw + 0.012, 1.77, 0.02, 0xb4b4b4); b.box(0.034, 0.08, 0.1, -hw - 0.012, 1.77, 0.02, 0xb4b4b4); }
  }
  function headwear(b, kind, F, c, sh) {
    var hw = F.hw, hd = F.hd, T = TOP_Y, W = 2 * hw, D = 2 * hd;
    switch (kind) {
      case 'backcap':                                                                       // the v0.7 backwards cap
        b.box(W + 0.03, 0.12, D + 0.03, 0, 1.92, 0, c); b.box(0.3, 0.05, 0.28, 0, 2.0, 0, c);
        b.box(0.3, 0.025, 0.17, 0, 1.875, -hd - 0.085, c); b.box(0.04, 0.03, 0.04, 0, 2.035, 0, sh(c, 0.75));
        b.box(0.1, 0.045, 0.01, 0, 1.9, hd + 0.017, sh(c, 0.6)); break;
      case 'cowboy':
        b.box(0.54, 0.03, 0.5, 0, 1.885, 0, 0x6b4a2e); b.box(W, 0.17, D, 0, 1.975, 0, 0x6b4a2e); b.box(W + 0.01, 0.04, D + 0.01, 0, 1.915, 0, 0x2a1d14);
        b.box(0.08, 0.025, 0.46, 0.29, 1.905, 0, 0x6b4a2e, 0, 0, 0.55); b.box(0.08, 0.025, 0.46, -0.29, 1.905, 0, 0x6b4a2e, 0, 0, -0.55);
        b.box(0.06, 0.03, D - 0.04, 0, 2.06, 0, sh(0x6b4a2e, 0.85)); break;
      case 'bandana': b.box(W + 0.025, 0.08, D + 0.025, 0, 1.845, 0, 0x2f5fb3); b.box(0.08, 0.06, 0.06, 0, 1.83, -hd - 0.03, 0x2f5fb3); break;
      case 'headband': b.box(W + 0.025, 0.05, D + 0.025, 0, 1.81, 0, 0xd23c3c); break;
      case 'toque':
        b.box(W + 0.045, 0.14, D + 0.045, 0, T - 0.005, -0.005, c); b.box(W + 0.055, 0.05, D + 0.055, 0, T - 0.075, -0.005, sh(c, 0.78));
        b.box(W - 0.03, 0.05, D - 0.03, 0, T + 0.085, -0.005, c); b.box(0.08, 0.08, 0.08, 0, T + 0.14, -0.005, 0xe8e4dc); break;
      case 'trucker':
        b.box(W + 0.03, 0.13, 0.13, 0, T + 0.02, hd - 0.05, 0xe8e4dc); b.box(W + 0.03, 0.12, D - 0.1, 0, T + 0.015, -0.07, c);
        b.box(W - 0.04, 0.04, D - 0.04, 0, T + 0.09, -0.01, c); b.box(0.3, 0.022, 0.16, 0, T - 0.035, hd + 0.075, c, -0.12);
        b.box(0.035, 0.025, 0.035, 0, T + 0.115, -0.01, sh(c, 0.75));
        b.box(0.11, 0.055, 0.008, 0, T + 0.025, hd + 0.017, c);
        for (var k = -1; k <= 1; k++) b.box(0.01, 0.036, 0.004, k * 0.018, T + 0.025, hd + 0.022, 0xd9a520, 0, 0, k * 0.3);
        break;
    }
  }

  // Public (valid after init()): the one character-geometry builder. 41_render_garage.js makeCharacter calls it.
  R.charGeometry = function (ctx, L, o, raw) {
    var C8 = GG.creator;
    if (raw && C8 && C8.isV8 && C8.isV8(raw)) {
      var V = C8.expand(raw);
      L = Object.assign({}, L, { hairStyle: V.hairStyle, top: V.top || L.top });
      return charV8(ctx, L, o || {}, V);
    }
    return legacyGeometry(ctx, L, o || {});
  };
  R.pixelFont = FONT;

  // ---- Kit looks (v0.8): shared by the garage kit (41 buildKit), the stage kit (42) and the creator preview (45) ------
  // R.kit.norm(kitLook|null, fallbackColor) -> KIT_LOOK (GG.creator.sanitizeKit, or the v0.7 kit) ; hardware(K) -> colour ;
  // shell(b, K, r, h, segs, x, y, z, rx, ry, rz) a drum shell with its finish ('paint' = exactly the v0.7 cylinder) ;
  // throne(b, K, x, z, chrome) crate | leather ('stool' stays each builder's own v0.7 code) ; cowbell(b, K, x, y, z) ;
  // fan(b, K, x, z, yaw, blades) the hair fan (blades: static blades too) ; fanBlades(ctx) -> geometry (spins on stage) ;
  // headArt(K, { r, band, genre, look }) -> Mesh|null (a lit disc with a CanvasTexture: band logo / your face / a moose /
  // custom text; 'plain' -> null; dispose with R.kit.disposeArt(mesh)) ; sticks(K) -> colour. No gong on any kit, ever.
  var WOOD = 0x9a6a3a, CAMO = [0x5f6b2e, 0x3d4a22, 0x8a7a4a, 0x2a2a1e];
  function h01(i, salt) { var x = Math.imul((i + 1) ^ Math.imul(salt + 11, 0x9e3779b1), 0x85ebca6b); x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16; return (x >>> 0) / 4294967296; }
  R.kit = {
    norm: function (k, fallback) {
      if (k && GG.creator) return GG.creator.sanitizeKit(k, fallback);
      return GG.creator ? GG.creator.legacyKit(fallback) : { shell: 'paint', color: fallback || '#b3262b', hardware: 'chrome', head: 'plain', headText: '', throne: 'stool', sticks: '#d8b27a', extras: [] };
    },
    hardware: function (K) { return K && K.hardware === 'black' ? 0x2a2a2e : 0xb9bec6; },
    sticks: function (K) { return (K && K.sticks) || 0xd8b27a; },
    has: function (K, x) { return !!(K && K.extras && K.extras.indexOf(x) >= 0); },
    shell: function (b, K, r, h, segs, x, y, z, rx, ry, rz) {
      var f = K.shell, c = K.color;
      var base = f === 'black' ? 0x16161a : f === 'wood' ? mix(WOOD, c, 0.18) : f === 'camo' ? CAMO[0] : c;
      b.cyl(r, r, h, segs, x, y, z, base, rx, ry, rz);
      if (f === 'paint' || f === 'black' || !f) return;
      b.push(x || 0, y || 0, z || 0, rx, ry, rz);
      var k, a, n, R2 = r + 0.003;
      if (f === 'wood') {
        for (k = 0; k < segs; k += 2) { a = (k + 0.5) / segs * Math.PI * 2; b.box(0.012, h * 0.94, 0.004, R2 * Math.sin(a), 0, R2 * Math.cos(a), mix(WOOD, 0x3a2412, 0.45), 0, a, 0); }
      } else if (f === 'sparkle') {
        n = Math.round(10 + r * 60);
        for (k = 0; k < n; k++) { a = h01(k, 3) * Math.PI * 2; b.box(0.016, 0.016, 0.004, R2 * Math.sin(a), (h01(k, 5) - 0.5) * h * 0.9, R2 * Math.cos(a), ctxShade(c, 1.7), 0, a, 0.7); }
      } else if (f === 'camo') {
        n = Math.round(8 + r * 30);
        for (k = 0; k < n; k++) { a = h01(k, 7) * Math.PI * 2; b.box(0.05 + h01(k, 9) * 0.06, 0.03 + h01(k, 11) * h * 0.4, 0.004, R2 * Math.sin(a), (h01(k, 13) - 0.5) * h * 0.8, R2 * Math.cos(a), CAMO[1 + (k % 3)], 0, a, 0); }
      } else if (f === 'flames') {
        n = Math.max(6, Math.round(segs * 0.75));
        var fw = Math.PI * R2 / n * 1.1;
        for (k = 0; k < n; k++) {
          a = (k + 0.5) / n * Math.PI * 2;
          var len = h * (0.55 + 0.35 * h01(k, 17)), y0 = -h / 2 + 0.004;
          b.push(R2 * Math.sin(a), 0, R2 * Math.cos(a), 0, a, 0);
          b.triC([-fw, y0, 0], [fw, y0, 0], [fw * 0.15, y0 + len, 0], 0xd8321e, 0xd8321e, 0xf2d24a);
          b.triC([-fw * 0.55, y0, 0.001], [fw * 0.55, y0, 0.001], [-fw * 0.1, y0 + len * 0.6, 0.001], 0xe8782a, 0xe8782a, 0xf6e27a);
          b.pop();
        }
      }
      b.pop();
    },
    throne: function (b, K, x, z, chrome) {
      var k;
      if (K.throne === 'leather') {
        b.box(0.04, 0.45, 0.04, x, 0.23, z, chrome);
        for (k = 0; k < 3; k++) { var a = k * 2.1; b.box(0.02, 0.02, 0.3, x + 0.13 * Math.sin(a), 0.03, z + 0.13 * Math.cos(a), chrome, 0, a); }
        b.cyl(0.2, 0.17, 0.1, 12, x, 0.5, z, 0x2a1810); b.cyl(0.19, 0.2, 0.02, 12, x, 0.555, z, 0x3a2216);
        for (k = 0; k < 4; k++) b.box(0.018, 0.012, 0.018, x + (k % 2 ? 0.07 : -0.07), 0.567, z + (k < 2 ? 0.07 : -0.07), 0x1a0e08);
        b.box(0.03, 0.26, 0.03, x, 0.62, z - 0.19, chrome); b.box(0.3, 0.2, 0.06, x, 0.78, z - 0.2, 0x2a1810);
        b.box(0.26, 0.012, 0.064, x, 0.78, z - 0.2, 0x1a0e08);
        return;
      }
      // Milk crates (two, zip-tied, a folded towel on top): the garage era.
      var cols = [0xc0392b, 0x2f5fb3];
      for (k = 0; k < 2; k++) {
        var c = cols[k], y0 = k * 0.27, dk = ctxShade(c, 0.5);
        b.box(0.34, 0.26, 0.34, x, y0 + 0.13, z, c);
        b.box(0.35, 0.03, 0.35, x, y0 + 0.255, z, ctxShade(c, 1.12));
        for (var sI = -1; sI <= 1; sI++) {
          b.box(0.06, 0.13, 0.004, x + sI * 0.1, y0 + 0.13, z + 0.172, dk); b.box(0.06, 0.13, 0.004, x + sI * 0.1, y0 + 0.13, z - 0.172, dk);
          b.box(0.004, 0.13, 0.06, x + 0.172, y0 + 0.13, z + sI * 0.1, dk); b.box(0.004, 0.13, 0.06, x - 0.172, y0 + 0.13, z + sI * 0.1, dk);
        }
      }
      b.box(0.3, 0.03, 0.26, x, 0.545, z, 0xe8e4dc); b.box(0.3, 0.012, 0.03, x, 0.55, z + 0.1, 0xd23c3c);
      b.box(0.012, 0.3, 0.012, x + 0.17, 0.27, z + 0.17, 0x111111);                     // the zip tie
    },
    cowbell: function (b, K, x, y, z) {
      b.box(0.018, 0.2, 0.018, x, y - 0.1, z - 0.02, R.kit.hardware(K));
      b.cyl(0.03, 0.05, 0.13, 4, x, y + 0.05, z + 0.02, 0x8a8e94, -0.35, Math.PI / 4, 0);
      b.box(0.05, 0.02, 0.02, x, y + 0.12, z + 0.05, 0x222226);
    },
    fan: function (b, K, x, z, yaw, blades) {
      var hwc = R.kit.hardware(K);
      b.push(x, 0, z, 0, yaw || 0, 0);
      b.cyl(0.14, 0.16, 0.04, 10, 0, 0.02, 0, 0x222226); b.box(0.03, 1.0, 0.03, 0, 0.52, 0, hwc);
      b.box(0.34, 0.34, 0.08, 0, 1.12, 0, 0x2a2a30); b.box(0.28, 0.28, 0.02, 0, 1.12, 0.045, 0x121216);
      for (var k = 0; k < 4; k++) b.box(0.29, 0.012, 0.012, 0, 1.0 + k * 0.08, 0.06, hwc);
      if (blades) { for (k = 0; k < 3; k++) b.box(0.24, 0.05, 0.01, 0, 1.12, 0.05, 0xd8dde4, 0, 0, k * Math.PI / 3); }
      b.pop();
    },
    fanBlades: function (ctx) {
      var bb = new ctx.Builder({ jitter: 0 });
      for (var k = 0; k < 3; k++) bb.box(0.24, 0.05, 0.01, 0, 0, 0, 0xd8dde4, 0, 0, k * Math.PI / 3);
      return bb.build();
    },
    // One pyro flame (origin at the nozzle, ~1.3 m tall): a yellow fireball at the base, an orange body, red tongues.
    flame: function (b, x, y, z, k) {
      k = k || 1;
      b.shape(new THREE.IcosahedronGeometry(0.2, 0), x, y + 0.16 * k, z, k, k, k, 0xfff07a);
      b.cyl(0, 0.19 * k, 0.95 * k, 7, x, y + 0.52 * k, z, 0xff8a2a);
      for (var i = 0; i < 3; i++) { var a = i * 2.1 + 0.4; b.cyl(0, 0.07 * k, 0.55 * k, 5, x + Math.cos(a) * 0.09 * k, y + 0.78 * k, z + Math.sin(a) * 0.09 * k, 0xe0401e, Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35); }
      b.cyl(0, 0.05 * k, 0.4 * k, 5, x, y + 1.12 * k, z, 0xd8321e);
    },
    pyroBase: function (b, x, y, z) {
      b.box(0.26, 0.16, 0.26, x, y + 0.08, z, 0x1a1a1e); b.cyl(0.05, 0.07, 0.12, 8, x, y + 0.22, z, 0x3a3a40);
      b.box(0.2, 0.02, 0.02, x, y + 0.14, z + 0.131, 0xf2d24a);
    },
    headArt: function (K, o) {
      if (!K || !K.head || K.head === 'plain' || typeof document === 'undefined') return null;
      o = o || {};
      var c = document.createElement('canvas'); c.width = c.height = 256;
      var g = c.getContext('2d');
      drawHead(g, K, o);
      var tex = new THREE.CanvasTexture(c);
      var mat = new THREE.MeshLambertMaterial({ map: tex });
      var m = new THREE.Mesh(new THREE.CircleGeometry(o.r || 0.25, 28), mat);
      m.userData.kitArt = K.head;
      return m;
    },
    disposeArt: function (m) {
      if (!m) return;
      if (m.parent) m.parent.remove(m);
      m.geometry.dispose(); if (m.material.map) m.material.map.dispose(); m.material.dispose();
    }
  };
  // The garage kit (and the creator preview's): the v0.7 geometry (was buildKit in 41_render_garage.js) with the look
  // applied. Kit-local frame: the drummer sits at z = -0.72 facing +z. Returns { geo, art: Mesh|null } (the art is a
  // child for the kit mesh). A legacy look (C.legacyKit) gives the v0.7 kit box for box.
  R.kit.garage = function (ctx, K, o) {
    o = o || {};
    var color = K.color, S = R.kit.shell, plain = !K.head || K.head === 'plain';
    var b = new ctx.Builder({ jitter: 0.03, seed: 5 }), head = 0xefe9dc, chrome = R.kit.hardware(K), dark = 0x26262a, bronze = 0xd2a43c, rim = shade(color, 0.55);
    var i, a;
    b.push(0, 0.3, 0.12, Math.PI / 2, 0, 0);                                   // kick drum on its side (kit-local frame)
    S(b, K, 0.28, 0.4, 16, 0, 0, 0);
    b.cyl(0.29, 0.29, 0.035, 16, 0, 0.2, 0, chrome); b.cyl(0.29, 0.29, 0.035, 16, 0, -0.2, 0, chrome);
    b.cyl(0.265, 0.265, 0.012, 16, 0, 0.214, 0, head);
    if (plain) { b.cyl(0.14, 0.14, 0.014, 14, 0, 0.221, 0, rim); b.cyl(0.1, 0.1, 0.016, 12, 0, 0.223, 0, head); }
    b.pop();
    b.box(0.02, 0.22, 0.02, 0.25, 0.08, 0.28, chrome, 0, 0, 0.45); b.box(0.02, 0.22, 0.02, -0.25, 0.08, 0.28, chrome, 0, 0, -0.45);
    b.box(0.03, 0.22, 0.03, 0, 0.63, 0.06, chrome);
    for (var s = -1; s <= 1; s += 2) {                                            // rack toms tilted at the drummer
      b.push(s * 0.15, 0.73, 0.03, -0.45, 0, -s * 0.15);
      S(b, K, 0.12, 0.15, 12, 0, 0, 0); b.cyl(0.125, 0.125, 0.02, 12, 0, 0.075, 0, chrome); b.cyl(0.117, 0.117, 0.01, 12, 0, 0.083, 0, head);
      b.pop();
    }
    S(b, K, 0.18, 0.3, 14, 0.46, 0.45, -0.22);                                   // floor tom
    b.cyl(0.185, 0.185, 0.02, 14, 0.46, 0.6, -0.22, chrome); b.cyl(0.175, 0.175, 0.01, 14, 0.46, 0.607, -0.22, head);
    for (i = 0; i < 3; i++) { a = i * 2.1 + 0.4; b.box(0.02, 0.32, 0.02, 0.46 + 0.2 * Math.cos(a), 0.16, -0.22 + 0.2 * Math.sin(a), chrome); }
    var stick = R.kit.sticks(K);
    b.box(0.02, 0.02, 0.36, 0.44, 0.615, -0.2, stick, 0, 0.3); b.box(0.02, 0.02, 0.36, 0.49, 0.617, -0.24, stick, 0, 0.5);   // spare sticks
    b.push(-0.36, 0.56, -0.25, -0.12, 0, 0.1);                                    // snare
    S(b, K, 0.16, 0.12, 14, 0, 0, 0); b.cyl(0.165, 0.165, 0.02, 14, 0, 0.06, 0, chrome); b.cyl(0.155, 0.155, 0.01, 14, 0, 0.066, 0, 0xf6f2ea);
    b.pop();
    b.box(0.025, 0.5, 0.025, -0.36, 0.25, -0.25, chrome);
    b.box(0.022, 0.9, 0.022, -0.63, 0.45, -0.08, chrome);                            // hi-hat
    b.cyl(0.17, 0.17, 0.014, 16, -0.63, 0.87, -0.08, bronze); b.cyl(0.17, 0.17, 0.014, 16, -0.63, 0.845, -0.08, shade(bronze, 0.85));
    b.box(0.1, 0.025, 0.24, -0.63, 0.015, -0.2, dark);
    b.box(0.022, 1.12, 0.022, -0.5, 0.56, 0.3, chrome, 0, 0, 0.06);                 // crash
    b.cyl(0.22, 0.22, 0.014, 16, -0.54, 1.13, 0.3, bronze, 0.28, 0, 0.22); b.cyl(0.05, 0.05, 0.03, 8, -0.54, 1.14, 0.3, bronze, 0.28, 0, 0.22);
    b.box(0.022, 1.02, 0.022, 0.64, 0.51, 0.18, chrome);                            // ride
    b.cyl(0.25, 0.25, 0.014, 16, 0.64, 1.03, 0.18, bronze, 0.2, 0, -0.25); b.cyl(0.05, 0.05, 0.03, 8, 0.64, 1.04, 0.18, bronze, 0.2, 0, -0.25);
    b.box(0.09, 0.03, 0.22, 0, 0.02, -0.17, dark);                                 // kick pedal
    if (!K.throne || K.throne === 'stool') {
      b.cyl(0.17, 0.16, 0.09, 12, 0, 0.5, -0.72, 0x1c1c1c); b.box(0.04, 0.45, 0.04, 0, 0.23, -0.72, chrome);   // throne
      for (i = 0; i < 3; i++) { a = i * 2.1; b.box(0.02, 0.02, 0.28, 0.12 * Math.sin(a), 0.03, -0.72 + 0.12 * Math.cos(a), chrome, 0, a); }
    } else R.kit.throne(b, K, 0, -0.72, chrome);
    if (R.kit.has(K, 'cowbell')) R.kit.cowbell(b, K, -0.02, 0.9, 0.22);
    if (R.kit.has(K, 'fan')) R.kit.fan(b, K, 0.78, 0.5, Math.atan2(-0.78, -1.22), true);
    if (o.preview && R.kit.has(K, 'pyro')) { R.kit.pyroBase(b, -0.95, 0, 0.55); R.kit.pyroBase(b, 0.95, 0, 0.55); }   // pyro only shows on arena stages (and in the creator)
    var art = plain ? null : R.kit.headArt(K, { r: 0.255, band: o.band, genre: o.genre, look: o.look });
    if (art) art.position.set(0, 0.3, 0.12 + 0.2215);
    return { geo: b.build(), art: art };
  };
  function ctxShade(hex, f) { return shade(hex, f); }
  function css(hex) { return typeof hex === 'number' ? '#' + ('000000' + hex.toString(16)).slice(-6) : hex; }
  // Kick-drum front head art on a 256px canvas (circle). Band logo by genre, your face (from your look), a moose, custom text.
  function drawHead(g, K, o) {
    var dark = K.head === 'logo' && o.genre === 'metal';
    g.fillStyle = dark ? '#121214' : '#efe9dc'; g.beginPath(); g.arc(128, 128, 128, 0, Math.PI * 2); g.fill();
    g.strokeStyle = dark ? '#3a3a42' : '#cfc6b2'; g.lineWidth = 8; g.beginPath(); g.arc(128, 128, 122, 0, Math.PI * 2); g.stroke();
    g.textAlign = 'center'; g.textBaseline = 'middle';
    var fit = function (txt, max, font, size) { do { g.font = font.replace('#', size); size -= 3; } while (g.measureText(txt).width > max && size > 12); };
    if (K.head === 'logo' || K.head === 'text') {
      var name = K.head === 'text' ? (K.headText || 'SASKATOON') : String(o.band || 'Hail Damage').toUpperCase();
      var words = name.split(' '), lines = words.length > 1 && name.length > 9 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : [name];
      var gen = K.head === 'text' ? 'rock' : o.genre, font, fill, stroke;
      if (gen === 'metal') { font = '900 #px Georgia, "Times New Roman", serif'; fill = '#f4f4f8'; stroke = '#9fb8ff'; }
      else if (gen === 'punk') { font = '900 #px Impact, "Arial Black", sans-serif'; fill = '#141418'; stroke = '#f06aa8'; }
      else if (gen === 'country') { font = 'italic 800 #px Georgia, serif'; fill = '#6b3a1e'; stroke = '#d9a520'; }
      else { font = '900 #px Impact, "Arial Black", sans-serif'; fill = css(K.color); stroke = '#141418'; }
      lines.forEach(function (ln, i) {
        fit(ln, 200, font, lines.length > 1 ? 58 : 70);
        var y = lines.length > 1 ? 98 + i * 64 : 128;
        g.lineWidth = 6; g.strokeStyle = stroke; g.strokeText(ln, 128, y); g.fillStyle = fill; g.fillText(ln, 128, y);
      });
      if (gen === 'metal') { g.fillStyle = '#f4f4f8'; for (var k = 0; k < 9; k++) g.fillRect(52 + k * 18, lines.length > 1 ? 58 : 88, 3, 14 + (k % 3) * 6); }
      if (gen === 'country') { g.fillStyle = '#d9a520'; [[60, 60], [196, 60], [60, 196], [196, 196]].forEach(function (p) { star(g, p[0], p[1], 10); }); }
    } else if (K.head === 'moose') {
      g.fillStyle = '#5a3a22';
      g.beginPath(); g.ellipse(128, 150, 42, 58, 0, 0, Math.PI * 2); g.fill();                  // head
      g.beginPath(); g.ellipse(128, 196, 34, 26, 0, 0, Math.PI * 2); g.fill();                  // snout
      [-1, 1].forEach(function (s) {                                                           // palmate antlers
        g.fillStyle = '#c8a878';
        g.beginPath(); g.moveTo(128 + s * 30, 108); g.lineTo(128 + s * 100, 60); g.lineTo(128 + s * 108, 92); g.lineTo(128 + s * 92, 110);
        g.lineTo(128 + s * 110, 118); g.lineTo(128 + s * 84, 128); g.lineTo(128 + s * 44, 124); g.closePath(); g.fill();
        g.fillStyle = '#5a3a22'; g.beginPath(); g.ellipse(128 + s * 44, 120, 14, 8, s * 0.5, 0, Math.PI * 2); g.fill();   // ears
        g.fillStyle = '#141414'; g.beginPath(); g.arc(128 + s * 18, 140, 6, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#2a1a10'; g.beginPath(); g.arc(128 + s * 12, 200, 5, 0, Math.PI * 2); g.fill();
      });
    } else if (K.head === 'face') {
      var L = o.look || {}, skin = L.skin || '#f0c9a4', hair = L.hair || '#5c3a22';
      g.fillStyle = hair; g.beginPath(); g.arc(128, 112, 78, Math.PI, 0); g.fill();
      g.fillStyle = skin; g.beginPath(); g.ellipse(128, 134, 66, 76, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = hair; g.fillRect(62, 70, 132, 26);
      var ex = L.extras || [], shades = L.glasses === 'shades' || L.glasses === 'aviators' || ex.indexOf('sunglasses') >= 0;
      g.fillStyle = '#141414';
      if (shades) { g.fillRect(78, 116, 42, 22); g.fillRect(136, 116, 42, 22); g.fillRect(118, 120, 20, 5); }
      else { g.beginPath(); g.arc(104, 126, 8, 0, Math.PI * 2); g.arc(152, 126, 8, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#7a1e1e'; g.beginPath(); g.arc(128, 168, 30, 0, Math.PI); g.fill();       // the big grin
      g.fillStyle = '#f2efe6'; g.fillRect(104, 168, 48, 8);
      if (L.facialHair === 'full' || L.facialHair === 'viking' || ex.indexOf('beard') >= 0) { g.fillStyle = hair; g.beginPath(); g.ellipse(128, 196, 58, 28, 0, 0, Math.PI); g.fill(); }
    }
  }
  function star(g, x, y, r) {
    g.beginPath();
    for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a)); }
    g.closePath(); g.fill();
  }

  // ---- Debug --------------------------------------------------------------------------------------------------
  // 41_render_garage.js adds scene fields through the scene's debug(); only this module registers 'render'.
  GG.registerDebug('render', function () {
    var d = { available: R.available, scene: cur ? curName : 'none', paused: paused, frames: frames, drawCalls: drawCalls, triangles: triangles };
    if (R.available) { d.viewport = { w: W, h: H }; d.insets = { top: insets.top, bottom: insets.bottom }; }
    if (cur && cur.debug) { var x = cur.debug(); for (var k in x) d[k] = x[k]; }
    return d;
  });
})(window.GG);
