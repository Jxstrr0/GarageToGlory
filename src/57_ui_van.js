// 57_ui_van.js: the van trip to the gig (v0.3, WORLD agent) and the Moose Hearse sheet (garage door hotspot).
//   GG.ui.playVan(gig, done): a skippable drive in the Moose Hearse (Kenji at the wheel, silently). Uses the STAGE
//     agent's 3D van scene when it exists: GG.render.setScene('van') + GG.render.van.setTrip({ from, to, km, season,
//     night, highway }) / setProgress(0..1) (guarded); otherwise a 2D canvas windshield. The trip comes from
//     GG.world.startTrip (once per week, so a reload mid-trip gets the same road card). A road card pops up mid-drive
//     (screen 'road', resolved with GG.world.resolveRoad like a Monday card), 1–2 banter bubbles, an arrival line,
//     then done(trip). The scene is set back to 'garage' before done (the caller may switch to 'stage').
//   GG.ui.showVan(tab): screen 'van-info' (the garage door; v0.8 tabs van | space | dealer): the van (condition, merch space in
//     boxes, comfort, km; Cousin Dale's repair) + the v0.8 shop panels from 5k_ui_shop (van side + stickers, rename, upgrades;
//     rehearsal spaces + upgrades; the car lot).
// v0.6.1 (Addendum 1 C1/C7): the trip passes weather, temp, holiday, driver + dashboard item to the 3D scene
//   (setTrip { weather, driver, dashboard }); the route header shows the weather (van-weather); the 2D windshield draws
//   the weather (rain / snow / blizzard / hail / heat shimmer) and whoever drives; van-info shows the driver (van-driver).
// v0.7 (WORLDUI): abroad (trip.abroad) the rental goes to setTrip { region, look } and the header names it (van-rental).
//   testids: van-route, van-progress, btn-van-skip, van-say, van-arrive, road-choice-<i>, btn-road-ok, van-repair.
(function (GG) {
  var ui = GG.ui, el = ui.el, btn = ui.btn, U = GG.util;
  function S() { return GG.state; }
  function R() { return GG.render; }
  function fill(t) { return t && GG.career && S() ? GG.career.fillText(S(), t) : (t || ''); }
  function sfx(n) { if (GG.audio) GG.audio.sfx(n); }
  function lines(k) { return (GG.content.lines && GG.content.lines[k]) || []; }

  var CSS = [
    '.full.van { background: transparent; }',
    '.full.van.flat { background: #0f1420; }',
    '.full.van .full-body { position: relative; display: flex; flex-direction: column; overflow: hidden; padding: calc(var(--safe-top) + 10px) var(--gutter) 8px; }',
    '.full.van .full-foot { position: relative; z-index: 2; }',
    '.van-cv { position: absolute; left: 0; top: 0; width: 100%; height: 100%; z-index: 0; display: block; }',
    '.van-top { position: relative; z-index: 2; padding: 10px 12px; border-radius: 14px; background: rgba(12, 16, 27, .84); border: 1px solid var(--line); }',
    '.van-route { font: 900 18px/1.15 var(--display); text-transform: uppercase; }',
    '.van-sub { margin-top: 2px; font-size: 12px; color: var(--dim); }',
    '.van-top .bar { margin-top: 8px; }',
    '.van-says { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }',
    '.van-say { align-self: flex-start; max-width: 88%; padding: 8px 12px; border-radius: 14px 14px 14px 4px; background: rgba(243, 239, 230, .96); color: #1d1204; font-size: 14px; line-height: 1.35; box-shadow: 0 4px 12px rgba(0, 0, 0, .3); animation: gg-fade .2s ease-out; }',
    '.van-say b { display: block; font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: #8a5a1a; }',
    '.van-say.kenji { font-style: italic; background: rgba(12, 16, 27, .88); color: var(--dim); border: 1px solid var(--line); }',
    '.van-say.kenji b { color: var(--faint); }',
    '.van-arrive { position: relative; z-index: 2; margin-top: auto; padding: 12px 14px; border-radius: 14px; background: rgba(12, 16, 27, .9); border: 1px solid var(--amber); font-weight: 700; line-height: 1.35; }',
    '.van-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px; }',
    '.van-stats > div { padding: 8px 10px; border-radius: 12px; background: var(--bg2); border: 1px solid var(--line); }',
    '.van-stats b { display: block; font-size: 16px; }'
  ].join('\n');
  (function inject() {
    if (typeof document === 'undefined' || document.getElementById('gg-css-van')) return;
    var st = document.createElement('style'); st.id = 'gg-css-van'; st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  })();

  /* ---- 3D van scene (STAGE agent) with guards ------------------------------------------------------- */
  function has3D() {
    var r = R();
    return !!(r && r.available && r.van && typeof r.van.setTrip === 'function' && typeof r.van.setProgress === 'function'
      && (!r.sceneNames || r.sceneNames().indexOf('van') >= 0));
  }
  function safe(fn) { try { return fn(); } catch (e) { console.warn('[van] render', e); return null; } }
  // 60_main pauses the 3D loop under full screens; the van screen is see-through, so keep the scene drawing.
  function keepDrawing() { setTimeout(function () { if (cur && cur.mode === '3d' && R()) safe(function () { R().setPaused(false); }); }, 0); }
  GG.on('screen:open', keepDrawing); GG.on('screen:close', keepDrawing);

  /* ---- 2D fallback: the windshield view on a canvas ------------------------------------------------- */
  var SKY = { summer: ['#5ea8f0', '#cfe7ff'], fall: ['#e59a55', '#ffe0ae'], winter: ['#8fa4bd', '#e6edf5'], spring: ['#7aa2c2', '#d6e6ec'] };
  var GROUND = { summer: '#c9a83d', fall: '#a8823a', winter: '#e7edf3', spring: '#7f9150' };
  function draw2d(v, time) {
    var c = v.ctx, W = v.W, H = v.H, t = v.trip, night = t.night, season = t.season || 'summer';
    var hz = H * 0.5, s = v.el * 1.3;
    var sky = c.createLinearGradient(0, 0, 0, hz), sk = night ? ['#070b1c', '#22305a'] : SKY[season] || SKY.summer;
    sky.addColorStop(0, sk[0]); sky.addColorStop(1, sk[1]);
    c.fillStyle = sky; c.fillRect(0, 0, W, hz);
    c.fillStyle = night ? '#f3efe6' : '#fff6cf';
    c.beginPath(); c.arc(W * 0.78, hz * 0.32, night ? 10 : 16, 0, Math.PI * 2); c.fill();
    c.fillStyle = night ? '#1a2016' : GROUND[season] || GROUND.summer; c.fillRect(0, hz, W, H - hz);
    c.strokeStyle = night ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.08)'; c.lineWidth = 1;
    for (var i = 1; i < 9; i++) { var z = ((i + s) % 9) / 9, y = hz + (H - hz) * z * z; c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    // a grain elevator drifting along the horizon, power poles whipping by
    var ex = W * (1.15 - ((v.el * 0.035 + 0.3) % 1.4));
    c.fillStyle = night ? '#2b1c18' : '#8e3b2a'; c.fillRect(ex, hz - 46, 22, 46);
    c.beginPath(); c.moveTo(ex - 3, hz - 46); c.lineTo(ex + 11, hz - 60); c.lineTo(ex + 25, hz - 46); c.fill();
    c.fillStyle = night ? '#3a2a24' : '#b8574a'; c.fillRect(ex + 22, hz - 26, 14, 26);
    for (var k = 0; k < 4; k++) {
      var pz = (k / 4 + s * 0.35) % 1, py = hz + (H * 0.28) * pz * pz, px = W * 0.6 + W * 0.5 * pz * pz, ph = 10 + 110 * pz * pz;
      c.fillStyle = night ? '#111' : '#4b3a2a'; c.fillRect(px, py - ph, 2 + 3 * pz, ph);
      c.fillRect(px - 6 * pz - 2, py - ph, 14 * pz + 6, 2 + pz);
    }
    // the road
    c.fillStyle = night ? '#1c1c1f' : '#3b3b40';
    c.beginPath(); c.moveTo(W * 0.47, hz); c.lineTo(W * 0.53, hz); c.lineTo(W * 1.05, H); c.lineTo(W * -0.05, H); c.fill();
    c.fillStyle = '#f0c24a';
    for (var j = 0; j < 7; j++) {
      var dz = ((j + s * 1.6) % 7) / 7, dy = hz + (H - hz) * dz * dz, dh = 3 + 26 * dz * dz, dw = 1 + 6 * dz;
      c.fillRect(W / 2 - dw / 2, dy, dw, dh);
    }
    var wx = t.weather || (season === 'winter' ? 'snow' : season === 'spring' ? 'rain' : 'clear');   // v0.6.1: the week's weather
    if (wx === 'blizzard') { c.fillStyle = 'rgba(235,240,248,.55)'; c.fillRect(0, 0, W, H * 0.8); }
    if (wx === 'heat' && !night) { c.fillStyle = 'rgba(255,190,90,.12)'; c.fillRect(0, hz - 20, W, 40); }
    if (wx === 'snow' || wx === 'rain' || wx === 'blizzard' || wx === 'hail') {
      var snowy = wx !== 'rain', n = wx === 'blizzard' ? 120 : 40, fall = wx === 'rain' ? 420 : wx === 'hail' ? 300 : wx === 'blizzard' ? 90 : 60;
      c.fillStyle = wx === 'rain' ? 'rgba(170,200,230,.7)' : 'rgba(255,255,255,.85)';
      for (var f = 0; f < n; f++) {
        var fx = (f * 97.3 + v.el * (snowy ? (wx === 'blizzard' ? 140 : 30) : 12) * (f % 3 + 1)) % W, fy = (f * 53.1 + v.el * fall) % H;
        if (wx === 'rain') c.fillRect(fx, fy, 1, 9); else c.fillRect(fx, fy, wx === 'hail' ? 3 : 2, wx === 'hail' ? 3 : 2);
      }
    }
    // inside the Moose Hearse: dash, wheel, the driver (Kenji in sunglasses, or you), the bobblehead, the dash item
    c.fillStyle = '#121418'; c.fillRect(0, H * 0.8, W, H * 0.2);
    c.fillStyle = '#1b1e24'; c.fillRect(0, H * 0.78, W, H * 0.03);
    c.fillStyle = '#0b0c0f';
    c.beginPath(); c.arc(W * 0.24, H * 0.6, 34, 0, Math.PI * 2); c.fill();                  // Kenji's head
    c.fillRect(W * 0.24 - 46, H * 0.64, 92, H * 0.2);                                     // shoulders
    if (t.driver !== 'you') {                                                           // Kenji's sunglasses (you squint)
      c.fillStyle = '#000'; c.fillRect(W * 0.24 - 24, H * 0.595, 48, 9);
      c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(W * 0.24 - 20, H * 0.597, 10, 2);
    }
    if (v.dash === 'cactus') {                                                     // Kenji's single tiny cactus
      c.fillStyle = '#8a4a2a'; c.fillRect(W * 0.44, H * 0.78 - 8, 10, 8);
      c.fillStyle = '#3f8a3a'; c.fillRect(W * 0.44 + 3, H * 0.78 - 20, 4, 12); c.fillRect(W * 0.44, H * 0.78 - 16, 3, 5);
    }
    c.strokeStyle = '#2a2d33'; c.lineWidth = 9;
    c.beginPath(); c.arc(W * 0.26, H * 0.86, 48, Math.PI * 1.1, Math.PI * 1.9); c.stroke();  // the wheel
    var bob = Math.sin(time / 110) * 4;
    c.fillStyle = '#6b4a2b'; c.fillRect(W * 0.66, H * 0.78 - 14, 8, 14);                  // bobblehead (a moose, obviously)
    c.beginPath(); c.arc(W * 0.66 + 4, H * 0.78 - 20 + bob, 9, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#6b4a2b'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(W * 0.66 - 4, H * 0.78 - 26 + bob); c.lineTo(W * 0.66 - 12, H * 0.78 - 34 + bob); c.moveTo(W * 0.66 + 12, H * 0.78 - 26 + bob); c.lineTo(W * 0.66 + 20, H * 0.78 - 34 + bob); c.stroke();
    c.strokeStyle = '#0a0b0e'; c.lineWidth = 14; c.strokeRect(0, 0, W, H);                  // windshield frame
  }

  /* ---- The trip screen -------------------------------------------------------------------------------- */
  var cur = null, dbg = { open: false, mode: null, p: 0, card: null, resolved: null, arrived: false, skipped: false };
  function weatherText(t) {
    var k = GG.calendar.kind(t.weather), h = t.holiday && GG.calendar.holidayById(t.holiday), d = GG.world.driver(S());
    return k.icon + ' ' + k.label + ', ' + t.temp + '°C' + (h ? ' · ' + h.icon + ' ' + h.name : '') + ' · ' + (d.you ? 'You drive' : d.name + ' drives');
  }
  function vprefs() { try { return GG.prefs ? GG.prefs.get() : {}; } catch (e) { return {}; } }
  // v0.6.1 (Addendum C4): settings.fastAnim halves the drive; settings.skipVan skips it (the road card still comes up).
  function tripDur(km) { return U.clamp(2600 + km * 14, 3000, 9000) / 1000 * (vprefs().fastAnim ? 0.5 : 1); }
  function say(v, b) {
    if (!b || !v.says) return;
    var who = ui.who(b.who);
    v.says.appendChild(el('div.van-say' + (b.who === 'kenji' ? '.kenji' : ''), { testid: 'van-say' }, [el('b', who.short || who.name), fill(b.text)]));
    while (v.says.children.length > 2) v.says.removeChild(v.says.firstChild);
  }
  function showCard(v) {
    if (v.cardShown) return;
    v.cardShown = true; v.paused = true; sfx('card');
    ui.show('road', { onDone: function () { v.paused = false; if (v.skipping) arrive(v); } });
  }
  function arrive(v) {
    if (v.arrived || !v.alive) return;
    v.arrived = true; v.p = 1; dbg.arrived = true;
    var line = fill(ui.pick(lines('vanArrive')) || 'You made it.');
    if (v.arriveEl) { v.arriveEl.hidden = false; v.arriveEl.textContent = line; }
    if (v.skipBtn) v.skipBtn.textContent = 'Load in ▸';
    v.doneTimer = setTimeout(function () { finish(v); }, v.skipping ? 500 : 1300);
  }
  function finish(v) { if (v.alive && ui.isOpen('van')) ui.close('van'); }
  function skip(v) {
    if (!v.alive) return;
    dbg.skipped = true;
    if (v.arrived) { clearTimeout(v.doneTimer); finish(v); return; }
    v.skipping = true;
    if (v.trip.cardId && !v.trip.resolved) { if (!v.cardShown) showCard(v); return; }
    arrive(v);
  }
  // The drive runs on wall time (like the gig clock, v0.5.1): a 0.1 s cap per frame drove in slow motion below 10 fps (a
  // slow phone, a loaded test machine: under 40% of the drive after 26 s). Time with the app hidden doesn't count (no
  // frames; the clock re-bases when it comes back). A long frame still stops at the road card (CARD_AT, mid-drive).
  var CARD_AT = 0.45;
  document.addEventListener('visibilitychange', function () { if (cur && !document.hidden) cur.last = performance.now(); });
  function frame(now) {
    var v = cur;
    if (!v || !v.alive) return;
    var dt = document.hidden ? 0 : Math.max(0, (now - v.last) / 1000); v.last = now;
    if (!v.paused && !v.arrived) v.el += dt;
    v.p = v.arrived ? 1 : Math.min(1, v.el / v.dur);
    var cardDue = !v.cardShown && v.trip.cardId && !v.trip.resolved;
    if (cardDue && v.p >= CARD_AT) { v.p = CARD_AT; v.el = CARD_AT * v.dur; }
    dbg.p = v.p;
    if (v.bar) v.bar.firstChild.style.width = (v.p * 100).toFixed(1) + '%';
    if (v.kmEl) v.kmEl.textContent = Math.round(v.trip.km * v.p) + ' / ' + v.trip.km + ' km';
    if (cardDue && v.p >= CARD_AT) showCard(v);
    if (v.banter[0] && !v.said0 && v.p >= 0.18) { v.said0 = true; say(v, v.banter[0]); }
    if (v.banter[1] && !v.said1 && v.p >= 0.66) { v.said1 = true; say(v, v.banter[1]); }
    if (v.p >= 1 && !v.arrived && (!v.trip.cardId || v.trip.resolved)) arrive(v);
    if (v.mode === '3d') safe(function () { R().van.setProgress(v.p); });
    else if (v.ctx) draw2d(v, now);
    v.raf = requestAnimationFrame(frame);
  }
  ui.define('van', {
    kind: 'full', cls: 'van', live3d: true,   // see-through: the 3D van scene should keep drawing (60_main may honour this)
    build: function (s, d) {
      var t = d.trip, v = d.view;
      if (!v) return;
      v.bar = ui.bar(0, 100);
      v.bar.setAttribute('data-testid', 'van-progress');
      v.kmEl = el('span', '0 / ' + t.km + ' km');
      if (v.mode === '2d') { v.cv = el('canvas.van-cv'); s.body.appendChild(v.cv); }
      ui.append(s.body, el('div.van-top', { testid: 'van-route' }, [
        el('div.van-route', t.fromName === t.toName ? t.toName + ', across town' : t.fromName + ' → ' + t.toName),
        el('div.van-sub', [t.highway ? t.highway + ' · ' : '', v.kmEl, ' · ', d.gig.name]),
        t.abroad && t.vehicleName ? el('div.van-sub', { testid: 'van-rental' }, (t.vehicleLook === 'train' ? '🚄 ' : '🚐 ') + t.vehicleName + (t.vehicleLook === 'sardine' ? ', packed like sardines' : '')) : null,   // v0.7
        GG.calendar && t.weather ? el('div.van-sub', { testid: 'van-weather' }, weatherText(t)) : null,
        v.bar]));
      v.says = el('div.van-says'); s.body.appendChild(v.says);
      v.arriveEl = el('div.van-arrive', { testid: 'van-arrive', hidden: true }); s.body.appendChild(v.arriveEl);
      v.skipBtn = btn('.btn.block', { testid: 'btn-van-skip', onclick: function () { skip(v); } }, 'Skip the drive ▸▸');
      s.foot.appendChild(v.skipBtn);
      s.root.firstChild.classList.toggle('flat', v.mode === '2d');
    },
    onShow: function (s) {
      var v = s.data.view; if (!v) return;
      cur = v; v.alive = true; dbg.open = true; sfx('whoosh');
      if (v.mode === '3d') { keepDrawing(); }
      else if (v.cv) {
        var r = v.cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
        v.W = Math.max(1, Math.round(r.width)); v.H = Math.max(1, Math.round(r.height));
        v.cv.width = v.W * dpr; v.cv.height = v.H * dpr;
        v.ctx = v.cv.getContext('2d');
        if (v.ctx) v.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      v.last = (typeof performance !== 'undefined' ? performance.now() : 0);
      v.raf = requestAnimationFrame(frame);
      if (vprefs().skipVan) setTimeout(function () { if (cur === v && v.alive && !v.skipping && !v.arrived) skip(v); }, 60);
    },
    onClose: function (s) {
      var v = s.data.view, d = s.data;
      dbg.open = false;
      if (!v || !v.alive) return;
      v.alive = false; cancelAnimationFrame(v.raf); clearTimeout(v.doneTimer);
      if (cur === v) cur = null;
      if (v.mode === '3d' && R()) safe(function () { R().setScene(d.opts && d.opts.scene || 'garage'); });
      if (d.done) setTimeout(function () { d.done(d.trip); }, 0);
    }
  });

  // The trip to `gig` (default: the booked gig). done(trip) runs after arrival (or right away when there's no gig).
  ui.playVan = function (gig, done, opts) {
    var st = S(); gig = gig || (st && st.gig);
    if (!st || !gig || !GG.world) { if (done) setTimeout(function () { done(null); }, 0); return null; }
    var trip = GG.world.startTrip(st, gig);
    var v = { trip: trip, mode: has3D() ? '3d' : '2d', dur: tripDur(trip.km), el: 0, p: 0, banter: trip.banter || [] };
    var drv = GG.world.driver ? GG.world.driver(st) : null;
    v.dash = drv ? drv.dashboard || (drv.you ? 'cactus' : null) : 'cactus';   // the cactus stays on the dash when you drive
    if (v.mode === '3d') {
      var ok = safe(function () { return R().setScene('van'); });
      if (ok === false || ok === null) v.mode = '2d';
      else safe(function () {
        var dr = GG.world.driver ? GG.world.driver(st) : { id: 'kenji', dashboard: 'cactus' };
        R().van.setTrip({ from: trip.fromName, to: trip.toName, km: trip.km, season: trip.season, night: trip.night, highway: trip.highway,
          weather: trip.weather, driver: dr.id, dashboard: dr.dashboard || (dr.you ? 'cactus' : null),
          region: trip.abroad ? trip.region : null, look: trip.abroad ? trip.vehicleLook : null });   // v0.7: the rental + regional scenery
        R().van.setProgress(0);
      });
    }
    dbg.mode = v.mode; dbg.p = 0; dbg.card = trip.cardId; dbg.resolved = trip.resolved; dbg.arrived = false; dbg.skipped = false;
    return ui.show('van', { gig: gig, trip: trip, done: done, opts: opts || {}, view: v });
  };

  /* ---- The road card (a Monday card, on the highway) --------------------------------------------------- */
  ui.define('road', {
    kind: 'sheet', sticky: true,
    build: function (s) {
      var st = S(), card = st && GG.world.roadCard(st), t = st && GG.world.trip(st);
      if (!card || !t) { s.foot.appendChild(btn('.btn.primary.big.block', { testid: 'btn-road-ok', onclick: function () { ui.close(s.id); } }, 'Back on the road')); return; }
      s.setTitle('On the road', (t.highway || 'THE HIGHWAY').toUpperCase() + ' · ' + t.km + ' KM');
      var who = ui.who(card.speaker);
      ui.append(s.body, [el('div.card-head', [ui.avatar(who, 'lg'), el('div.grow', [el('div.who', who.name), el('div.role', who.role || '')]), el('span.tag', 'road')]),
        el('h3.card-title', fill(card.title)), el('p.card-text', fill(card.text))]);
      if (!t.resolved) {
        card.choices.forEach(function (ch, i) {
          s.body.appendChild(btn('.choice', { testid: 'road-choice-' + i, onclick: function () {
            var cur2 = S(), tt = cur2 && GG.world.trip(cur2);
            if (!tt || tt.resolved) return;   // double-tap guard
            var r = GG.world.resolveRoad(cur2, i);
            if (r && r.deltas && (r.deltas.fund || 0) > 0) sfx('cash');
            if (GG.main && GG.main.sync) GG.main.sync();
            s.rerender();
          } }, [el('span.cl', fill(ch.label)), el('span.ch', GG.career.choiceHint(st, ch) || 'Who knows?')]));
        });
        return;
      }
      var chosen = card.choices[t.choice], vc = t.deltas && t.deltas.van && t.deltas.van.condition;
      var chips = ui.deltaChips(t.deltas, { emptyText: vc ? false : 'Nothing changed. Somehow.' });
      if (vc) chips.appendChild(el('span.chip.' + (vc > 0 ? 'up' : 'down'), '🚐 Van ' + U.signed(vc)));
      ui.append(s.body, [chosen ? el('div.you', ['You picked: ', el('b', fill(chosen.label))]) : null,
        t.success === true ? el('span.tag.amber', { style: 'margin-bottom:8px' }, 'It worked!') : t.success === false ? el('span.tag', { style: 'margin-bottom:8px;color:var(--bad)' }, 'Welp.') : null,
        el('div.quote', fill(t.outcome || '')), el('div', { style: 'margin-top:12px' }, chips)]);
      s.foot.appendChild(btn('.btn.primary.big.block', { testid: 'btn-road-ok', onclick: function () { ui.close(s.id); } }, 'Back on the road'));
    },
    onClose: function (s) {
      var st = S(), t = st && GG.world.trip(st);
      dbg.resolved = t ? t.resolved : null;
      if (s.data.onDone) setTimeout(s.data.onDone, 0);
    }
  });

  /* ---- The garage door: the van, the rehearsal space, the car lot (v0.8 tabs) ---------------------------------- */
  // v0.8 (SHOPUI): tabs Van (the van-side view with its venue stickers, rename, driver, condition + Cousin Dale's repair,
  // merch space in boxes, van upgrades) · Space (GG.ui.spacePanel: rooms around town + move, this room's upgrades) ·
  // Car lot (GG.ui.dealerPanel: bigger vehicles, quote + trade-in). Panels live in 5k_ui_shop.js.
  var DOOR_TABS = [{ id: 'van', label: '🚐 Van' }, { id: 'space', label: '🏠 Space' }, { id: 'dealer', label: '🔑 Car lot' }];
  ui.define('van-info', {
    kind: 'sheet', tall: true, cls: 'shop',
    title: function () { var st = S(); return (st && st.van && st.van.name) || 'The van'; },
    build: function (s, d) {
      var st = S(); if (!st || !GG.world) return;
      var tab = d.tab || 'van', shop = !!(GG.shop && ui.vanSide);
      function rerender(o) { s.rerender(Object.assign({}, s.data, o || {})); }
      var home = (st.spaceTier || 0) === 0;
      s.setTitle(tab === 'space' && GG.shop ? GG.shop.spaceDef(st, st.spaceTier || 0).name : tab === 'dealer' ? 'Car lot' : (st.van && st.van.name) || 'The van', home ? 'THE GARAGE DOOR' : 'THE DOOR');
      if (shop) s.body.appendChild(el('div.shop-tabs', ui.tabs(DOOR_TABS, tab, function (id) { rerender({ tab: id }); s.body.scrollTop = 0; }, 'door-tab-')));
      if (shop && tab === 'space') { s.body.appendChild(ui.spacePanel(st, rerender)); s.foot.appendChild(btn('.btn.block', { testid: 'btn-door-done', onclick: function () { ui.close(s.id); } }, 'Done')); return; }
      if (shop && tab === 'dealer') { s.body.appendChild(ui.dealerPanel(st, rerender)); s.foot.appendChild(btn('.btn.block', { testid: 'btn-door-done', onclick: function () { ui.close(s.id); } }, 'Done')); return; }
      var W = GG.world, van = W.van(st), q = W.repairQuote(st), dr = W.driver ? W.driver(st) : { id: 'kenji', name: 'Kenji', def: {} };
      var col = van.condition >= 60 ? 'var(--good)' : van.condition >= 30 ? 'var(--amber)' : 'var(--bad)';
      var td = GG.shop ? GG.shop.vanTierDef(van.tier || 0) : { kind: 'Rusted minivan', blurb: 'A rusted minivan with a moose-shaped dent.' };
      var stick = GG.shop ? GG.shop.stickers(st) : [], banned = stick.filter(function (x) { return x.banned; }).length;
      var nameIn = el('input.seq-name', { testid: 'van-name-input', maxLength: 28, value: van.name || '', placeholder: (van.baseName || 'The Moose Hearse'), 'aria-label': 'Van name' });
      ui.append(s.body, [
        shop ? ui.vanSide(st) : null,
        shop ? el('div.small.dim.center', { testid: 'van-stickers' }, stick.length ? stick.length + ' venue sticker' + (stick.length === 1 ? '' : 's') + (banned ? ' · ' + banned + ' crossed out (banned)' : '') : 'No stickers yet. Every venue you play puts one on.') : null,
        shop ? el('div.row', { style: 'margin:8px 0' }, [nameIn, btn('.btn.small', { testid: 'van-rename', onclick: function () {
          var r = GG.shop.renameVan(S(), nameIn.value);
          if (GG.main && GG.main.sync) GG.main.sync();
          ui.toast('It is “' + r.name + '” now. Kenji will not say it out loud.', { who: 'Van' });
          rerender();
        } }, 'Rename')]) : null,
        el('p.dim', { style: 'margin-top:0' }, td.kind + '. ' + (td.blurb || '') + ' ' + (dr.you ? 'You drive now. The mirrors are still set for Kenji.'
          : dr.id === 'kenji' ? 'Kenji drives. Nobody has ever seen him get in or out.' : dr.name + ' drives.')),
        el('div.panel', { testid: 'van-driver' }, [el('div.row', [el('span.grow', { style: 'font-weight:800' }, 'Driver: ' + dr.name), el('span.tag', (dr.def && dr.def.effect) || '')]),
          el('div.small.dim', { style: 'margin-top:4px' }, ((dr.def && dr.def.blurb) || '') + (dr.def && dr.def.dashName ? ' On the dash: ' + dr.def.dashName + '.' : '')
            + ' Seating: ' + (dr.you ? 'you drive, ' : dr.name + ' drives, you ride shotgun, ') + 'the band in the back, gear and merch piled behind.')]),
        el('div.panel', { style: 'margin-top:10px' }, [el('div.row', [el('span.grow', { style: 'font-weight:800' }, 'Condition: ' + W.vanLabel(van.condition)), el('b', van.condition + '%')]),
          ui.bar(van.condition, 100, { color: col }),
          el('div.small.dim', { style: 'margin-top:6px' }, st.protected ? 'Garage era: it rattles, but it won’t break down (yet).' : 'Low condition means breakdowns on long drives.')]),
        el('div.van-stats', [
          el('div', { testid: 'van-space' }, [el('span.caps', 'Merch space'), el('b', van.space + ' box' + (van.space === 1 ? '' : 'es')), el('span.small.dim', 'hauled to every gig')]),   // v0.8: boxes, not "/ 5"
          el('div', [el('span.caps', 'Comfort'), el('b', van.comfort + ' / 5'), el('span.small.dim', 'long drives burn you out')]),
          el('div', [el('span.caps', 'Driven'), el('b', U.fmtNum(van.km) + ' km'), el('span.small.dim', (van.trips || 0) + ' trips')]),
          el('div', [el('span.caps', 'Breakdowns'), el('b', String(van.breakdowns || 0)), el('span.small.dim', 'and counting')])]),
        shop ? el('div.caps', { style: 'margin:14px 0 6px' }, 'Upgrades') : null,
        shop ? ui.vanUpgradesPanel(st, rerender) : null
      ]);
      s.foot.appendChild(btn('.btn.primary.block', { testid: 'van-repair', disabled: !q.gain || st.fund < q.cost, onclick: function () {
        var r = W.repairVan(S());
        if (!r) return;
        sfx('cash'); ui.toast('Cousin Dale fixed "most of it". +' + r.gain + ' condition for ' + U.fmtMoney(r.cost) + '.', { who: 'Dale' });
        if (GG.main && GG.main.sync) GG.main.sync();
        s.rerender();
      } }, q.gain ? "Cousin Dale's Garage: +" + q.gain + ' for ' + U.fmtMoney(q.cost) : 'Nothing to fix. Dale is disappointed.'));
    }
  });
  ui.showVan = function (tab) { return S() && GG.world ? ui.show('van-info', { tab: typeof tab === 'string' ? tab : 'van' }) : null; };

  GG.registerDebug('van', function () { return Object.assign({}, dbg); });
})(window.GG);
