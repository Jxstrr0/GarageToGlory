// 5j_ui_creator.js (v0.8 "Kit", lane CREATOR): the full character creator. Screen 'look' (full): a live 3D preview
// (GG.render.preview, 45_render_creator), an Everyday ↔ Stage toggle, tabs Body / Face / Hair / Clothes / Stage / Ink / Kit,
// locked parts greyed with what unlocks them, knuckle-tattoo letters (4 per hand, A–Z), the kit look.
// The person (body, face, hair, ink, piercings) is shared by both looks; Clothes edits the look the toggle shows; Stage
// edits the stage look's outfit + extras. Rules and unlocks: GG.creator (2b_sim_creator.js).
// API: GG.ui.openLook({ mode: 'new'|'career', look, stageLook, kit, genre, band, carry, onDone({ look, stageLook, kit }) })
//   'new' (the new-career flow, 51_ui_menu 'creator'): unlocks from GG.creator.draftState(genre, carry); onDone gets the result.
//   'career' (☰ menu → Look): edits GG.state.player; Done = GG.creator.apply + GG.main.sync().
// testids: lk-cancel, lk-done, lk-random, lk-which-everyday|stage, lk-tab-<tab>, lk-view-full|face|hands, lk-opt-<cat>-<value>,
//   lk-sw-<field>-<i>, lk-height, lk-knuckles-right|left, lk-headtext, lk-arm-L|R-<none|half|full>, lk-count, lk-lock (why a part
//   is locked, over the preview). Debug 'creator-ui'.
// v1.0 (Q5): parts a finished career unlocked (GG.creator.metaPart) are open in every genre and wear a 🏆 chip (data-meta).
// v1.1 "Seats" (Lane C, plan_contract_1.1 §4.8): openLook({ ..., seat, gearLook, logo }) (career mode: GG.state.seat /
//   player.gearLook / the band logo). On a string seat the Kit tab is "Your gear" (lk-tab-gear): body shape (C.GEAR_SHAPES[seat],
//   names from GG.creator.gearNames: lk-gear-shape-<id>), colour (the kit swatches + "kit colour" = null: lk-gear-sw-<i>,
//   lk-gear-color-kit), pickguard (C.GEAR_GUARDS: lk-gear-guard-<id>), headstock sticker (lk-gear-sticker-none|logo); the
//   preview's 'gear' mode shows it played. onDone gets { look, stageLook, kit, gearLook } (string seats); career mode applies it
//   (GG.creator.apply). The drum seat is exactly v1.0 (the Kit tab, KIT_LOOK). New controls are >= 48 px (CSS injected here).
// v1.5 (Lane N): Esc (50k) = the ← (lk-cancel), after a "Leave without saving?" ask when any pick changed since it opened
// (ui.lookDirty(): a snapshot of look / stage look / kit / gear; Esc on the ask = Keep editing).
(function (GG) {
  var ui = GG.ui, el = ui.el, btn = ui.btn;
  var TABS = [
    { id: 'body', label: 'Body', icon: '🧍' }, { id: 'face', label: 'Face', icon: '🙂' }, { id: 'hair', label: 'Hair', icon: '💇' },
    { id: 'clothes', label: 'Clothes', icon: '👕' }, { id: 'stage', label: 'Stage', icon: '🎤' }, { id: 'ink', label: 'Ink', icon: '🖋️' },
    { id: 'kit', label: 'Kit', icon: '🥁' }
  ];
  var GEAR_TAB = { id: 'gear', label: 'Your gear', icon: '🎸' };   // v1.1: replaces the Kit tab on a string seat
  var E = null;            // the open editor: { mode, st, look, stage, kit, which, tab, view, genre, band, onDone, s, panel, tabs, ... }
  (function css() {   // v1.1: the gear tab's controls (>= 48 px)
    if (typeof document === 'undefined' || document.getElementById('lk-gear-css')) return;
    var st = document.createElement('style'); st.id = 'lk-gear-css';
    st.textContent = '.lk-chip.lk-big{min-height:48px}.lk-sw.lk-big{width:48px;height:48px}.lk-sw.lk-kitsw{display:inline-flex;align-items:center;justify-content:center;font:800 11px var(--font);color:#fff;text-shadow:0 1px 2px #000}';
    (document.head || document.documentElement).appendChild(st);
  })();
  function stringSeat(x) { return x === 'bass' || x === 'rhythm' || x === 'lead' ? x : null; }
  function tabs() { return E && E.seat ? TABS.map(function (t) { return t.id === 'kit' ? GEAR_TAB : t; }) : TABS; }
  function C() { return GG.creator; }
  function content() { return GG.content.creator || { swatches: {} }; }
  function cur() { return E.which === 'stage' ? E.stage : E.look; }
  function clone(o) { return GG.util.clone(o); }

  ui.openLook = function (o) { init(o); return ui.show('look'); };
  function init(o) {
    o = o || {};
    var st = o.mode === 'career' ? GG.state : null, pl = st ? st.player || {} : {};
    var bandDef = (GG.content.bands || {})[o.bandId || (st && st.bandId)] || null;   // v0.9: the draft's band (51 passes bandId)
    var genre = o.genre || (st && st.genre) || (bandDef && bandDef.genre) || 'metal';
    E = {
      mode: o.mode === 'career' ? 'career' : 'new', onDone: o.onDone || null, genre: genre, city: (st && st.city) || (bandDef && bandDef.city) || '',
      spaceShort: (bandDef && bandDef.spaceShort) || 'the garage',
      band: o.band || bandName(st), st: st || C().draftState(genre, !!o.carry),
      look: C().expand(o.look || pl.look || null), stage: C().expand(o.stageLook || pl.stageLook || o.look || pl.look || null),
      kit: C().sanitizeKit(o.kit || (st ? C().kitLook(pl) : C().newKit((o.kit && o.kit.color) || '#b3262b', bandDef && bandDef.id))),
      which: 'everyday', tab: 'body', view: 'full'
    };
    // v1.1: your seat + gear (string seats only; drums keep the kit tab).
    E.seat = stringSeat(o.seat || (st && st.seat));
    E.gearLook = C().sanitizeGearLook ? C().sanitizeGearLook(o.gearLook || pl.gearLook || null, E.seat) : null;
    E.logo = o.logo || (st && GG.logo ? GG.logo.get(st) : GG.logo && bandDef ? (GG.logo.pending(bandDef.id) || GG.logo.defaultFor(bandDef.id)) : null);
    delete E.look.outfit; E.look.stageExtras = [];
    C().syncPerson(E.look, E.stage);
    E.snap = lookSnap();   // v1.5: Esc asks first once a pick changed this
  }
  function lookSnap() { try { return JSON.stringify([E.look, E.stage, E.kit, E.gearLook || null]); } catch (e) { return ''; } }
  ui.lookDirty = function () { return !!(E && E.snap != null && lookSnap() !== E.snap); };
  function bandName(st) { var b = st && GG.content.bands && GG.content.bands[st.bandId]; return (b && b.name) || 'The band'; }

  /* ---- Screen ------------------------------------------------------------------------------------------------------ */
  ui.define('look', {
    kind: 'full', cls: 'lookx',
    // v1.5 (Lane N): Esc = ←, but any pick since opening asks "Leave without saving?" first (Esc = Keep editing).
    back: function () {
      if (!ui.lookDirty()) { cancel(); return; }
      ui.confirm({ text: 'Leave without saving?', yes: 'Leave', no: 'Keep editing', danger: true }).then(function (ok) { if (ok && ui.top() === 'look') cancel(); });
    },
    build: function (s) {
      if (!E) init({ mode: GG.state ? 'career' : 'new' });
      E.s = s;
      var total = C().parts(E.st).length, open = C().parts(E.st).filter(function (p) { return !p.locked; }).length;
      var host = el('div.lk-preview', { testid: 'lk-preview' });
      E.host = host;
      E.viewBar = el('div.lk-views');
      E.whichBar = el('div.lk-which', { role: 'tablist' });
      E.tabs = el('div.lk-tabs', { role: 'tablist' });
      E.panel = el('div.lk-panel', { testid: 'lk-panel' });
      E.note = el('div.lk-lock', { testid: 'lk-lock', role: 'status', 'aria-live': 'polite' });
      ui.append(s.body, [
        el('div.lk-head', [
          btn('.icon-btn', { testid: 'lk-cancel', 'aria-label': 'Back', onclick: cancel }, '←'),
          el('div.grow', [el('div.caps', E.mode === 'new' ? 'New career · your look' : 'Your look'), el('div.lk-title', E.seat === 'bass' ? 'Who’s on bass?' : E.seat ? 'Who’s on guitar?' : 'Who’s on drums?')]),
          el('span.tag', { testid: 'lk-count', title: 'Parts unlocked' }, '🔓 ' + open + '/' + total)
        ]),
        el('div.lk-stagewrap', [host, E.viewBar, E.note]),
        E.whichBar, E.tabs, E.panel
      ]);
      ui.append(s.foot, el('div.row', [
        btn('.btn.grow', { testid: 'lk-random', onclick: surprise }, '🎲 Surprise'),
        btn('.btn.primary.grow', { testid: 'lk-done', onclick: done }, E.mode === 'new' ? 'Looks good' : 'Done')
      ]));
      var ok = GG.render && GG.render.preview && GG.render.preview.mount(host);
      if (!ok) host.appendChild(el('div.lk-nopreview', 'No 3D here, but ' + E.spaceShort + ' will show it.'));
      refresh();
    },
    onClose: function () { if (GG.render && GG.render.preview) GG.render.preview.unmount(); if (E) clearTimeout(E.noteT); E = null; }
  });

  // Locked parts explain themselves in one line over the preview (one at a time, never a stack of toasts).
  function lockNote(text) {
    if (!E || !E.note) return;
    E.note.textContent = text; E.note.classList.add('on');
    clearTimeout(E.noteT); E.noteT = setTimeout(function () { if (E && E.note) E.note.classList.remove('on'); }, 3200);
  }
  function cancel() { ui.close('look'); }
  function done() {
    var out = { look: C().stageOnly(E.look), stageLook: clone(E.stage), kit: clone(E.kit) };
    if (E.seat && E.gearLook) out.gearLook = clone(E.gearLook);   // v1.1
    if (E.mode === 'career' && GG.state) {
      var res = C().apply(GG.state, out);
      if (GG.main && GG.main.sync) GG.main.sync();
      ui.close('look');
      ui.toast(res.stageLook.outfit && res.stageLook.outfit !== 'none' ? 'Looking sharp. The stage look comes out at gigs.' : 'Looking sharp.', { kind: 'good' });
      return;
    }
    var cb = E.onDone;
    ui.close('look');
    if (cb) cb(out);
  }
  function surprise() {
    var r = ui.rng, pick = function (cat) { var l = C().parts(E.st, cat).filter(function (p) { return !p.locked; }); return l.length ? l[Math.floor(r.next() * l.length)] : null; };
    var val = function (cat) { var p = pick(cat); return p ? p.value : undefined; };
    var sw = content().swatches, any = function (a) { return a[Math.floor(r.next() * a.length)]; };
    var L = E.look;
    L.build = content().builds[val('build')] || 1; L.height = Math.round((0.92 + r.next() * 0.16) * 100) / 100; L.skin = any(sw.skin); L.age = val('age');
    L.face = { shape: val('shape'), eyes: val('eyes'), eyeColor: any(sw.eyes), brows: val('brows'), nose: val('nose'), mouth: val('mouth') };
    L.facialHair = r.next() < 0.5 ? 'clean' : val('facialHair'); L.glasses = r.next() < 0.6 ? 'none' : val('glasses');
    L.hairStyle = val('hairStyle'); var hc = pick('hairColor'); if (hc) L.hair = hc.color;
    L.top = val('top'); L.bottom = val('bottom'); L.shoes = val('shoes'); L.headwear = r.next() < 0.5 ? 'none' : val('headwear');
    L.shirt = any(sw.clothes); L.pants = any(sw.clothes);
    E.stage.outfit = val('outfit');
    C().syncPerson(L, E.stage);
    if (E.seat && E.gearLook) {   // v1.1: a new instrument too
      var shapes = C().gearShapes(E.seat), guards = GG.contracts.GEAR_GUARDS || ['white'];
      E.gearLook.shape = shapes[Math.floor(r.next() * shapes.length)] || null; E.gearLook.color = r.next() < 0.3 ? null : any(sw.kit);
      E.gearLook.guard = guards[Math.floor(r.next() * guards.length)];
    }
    refresh();
  }

  /* ---- Rendering the editor ------------------------------------------------------------------------------------------ */
  function refresh() {
    if (!E || !E.s || E.busy) return;
    E.busy = true;
    try { bars(); panel(); preview(); } finally { E.busy = false; }
  }
  function preview() {
    if (GG.render && GG.render.preview) GG.render.preview.set({ look: cur(), kit: E.kit, mode: E.tab === 'kit' ? 'kit' : E.tab === 'gear' ? 'gear' : 'char', view: E.view, band: E.band, genre: E.genre,
      seat: E.seat, gearLook: E.gearLook, kitColor: E.kit && E.kit.color, logo: E.logo });   // v1.1: the gear mode
  }
  function panel() {
    var keep = E.panel.scrollTop;
    ui.clear(E.panel);
    PANELS[E.tab]();
    E.panel.scrollTop = keep;
  }
  function bars() {
    var kitMode = E.tab === 'kit' || E.tab === 'gear';
    ui.clear(E.whichBar);
    ui.append(E.whichBar, [['everyday', '👟 Everyday'], ['stage', '🎤 Stage']].map(function (w) {
      return btn('.lk-seg' + (E.which === w[0] ? '.on' : ''), { testid: 'lk-which-' + w[0], role: 'tab', 'aria-selected': E.which === w[0] ? 'true' : 'false',
        disabled: kitMode, onclick: function () { E.which = w[0]; if (w[0] === 'everyday' && E.tab === 'stage') E.tab = 'clothes'; refresh(); } }, w[1]);
    }));
    ui.clear(E.tabs);
    ui.append(E.tabs, tabs().map(function (t) {
      return btn('.lk-tab' + (E.tab === t.id ? '.on' : ''), { testid: 'lk-tab-' + t.id, role: 'tab', 'aria-selected': E.tab === t.id ? 'true' : 'false',
        onclick: function () { E.tab = t.id; if (t.id === 'stage') E.which = 'stage'; if (t.id === 'face' && E.view === 'full') E.view = 'face'; if (t.id !== 'face' && t.id !== 'ink' && E.view !== 'full') E.view = 'full'; refresh(); } },
        [el('span.i', t.icon), el('span.l', t.label)]);
    }));
    ui.clear(E.viewBar);
    if (!kitMode) ui.append(E.viewBar, [['full', 'Full'], ['face', 'Face'], ['hands', 'Hands']].map(function (v) {
      return btn('.lk-view' + (E.view === v[0] ? '.on' : ''), { testid: 'lk-view-' + v[0], onclick: function () { E.view = v[0]; refresh(); } }, v[1]);
    }));
    else ui.append(E.viewBar, el('span.lk-viewnote', E.tab === 'gear' ? 'Your ' + (E.seat === 'bass' ? 'bass' : 'guitar') : 'Your kit'));
  }
  function section(title, kids, note) {
    E.panel.appendChild(el('div.lk-sec', [el('div.caps', title), note ? el('div.small.dim', note) : null, kids]));
  }
  // A row of option chips for one category. get() -> current value ; set(value). multi: toggles (arrays).
  function chips(cat, get, set, o) {
    o = o || {};
    var cur = get();
    return el('div.lk-chips', C().parts(E.st, cat).filter(function (p) { return !o.only || o.only(p); }).map(function (p) {
      var on = o.multi ? (cur || []).indexOf(p.value) >= 0 : cur === p.value;
      return btn('.lk-chip' + (on ? '.on' : '') + (p.locked ? '.locked' : '') + (p.meta ? '.meta' : ''), { testid: 'lk-opt-' + cat + '-' + p.value, 'aria-pressed': on ? 'true' : 'false',
        title: p.locked ? 'Locked: ' + p.why : p.meta ? 'Unlocked by a finished career (every genre)' : p.hint || p.name, data: p.meta ? { meta: '1' } : null,
        onclick: function () {
          if (p.locked) { lockNote('🔒 ' + p.name + ': ' + p.why + '.'); return; }
          if (o.multi) { var a = (get() || []).slice(), i = a.indexOf(p.value); if (i >= 0) a.splice(i, 1); else a.push(p.value); set(a); }
          else set(p.value);
          refresh();
        } }, [p.color ? el('i.dot', { style: { background: p.color } }) : null, p.locked ? '🔒 ' : p.meta ? '🏆 ' : '', p.name]);   // v1.0: 🏆 = from a finished career
    }));
  }
  function swatches(field, list, get, set) {
    var v = String(get() || '').toLowerCase();
    return el('div.lk-swatches', list.map(function (c, i) {
      return btn('.lk-sw' + (v === c.toLowerCase() ? '.on' : ''), { testid: 'lk-sw-' + field + '-' + i, 'aria-label': field + ' ' + c, style: { background: c },
        onclick: function () { set(c); refresh(); } });
    }));
  }
  // Person fields go to both looks; clothes to the look being edited.
  function person(fn) { fn(E.look); C().syncPerson(E.look, E.stage); }
  function face(k) { return function () { return (E.look.face || {})[k]; }; }
  function setFace(k) { return function (v) { person(function (L) { L.face = Object.assign({}, L.face, (function () { var o = {}; o[k] = v; return o; })()); }); }; }

  var PANELS = {
    body: function () {
      var builds = content().builds, bNow = E.look.build, near = null, d = 9;
      for (var k in builds) if (Math.abs(builds[k] - bNow) < d) { d = Math.abs(builds[k] - bNow); near = k; }
      section('Build', chips('build', function () { return near; }, function (v) { person(function (L) { L.build = builds[v]; }); }));
      var h = el('input.lk-range', { testid: 'lk-height', type: 'range', min: '0.9', max: '1.1', step: '0.01', value: String(E.look.height || 1),
        oninput: function () { person(function (L) { L.height = +h.value; }); lab.textContent = heightLabel(+h.value); preview(); } });
      var lab = el('span.lk-rangelab', heightLabel(E.look.height || 1));
      section('Height', el('div.lk-rangerow', [el('span.small.dim', 'Short'), h, el('span.small.dim', 'Tall'), lab]));
      section('Skin', swatches('skin', content().swatches.skin, function () { return E.look.skin; }, function (c) { person(function (L) { L.skin = c; }); }));
      section('Age look', chips('age', function () { return E.look.age; }, function (v) { person(function (L) { L.age = v; }); }));
    },
    face: function () {
      ['shape', 'eyes', 'brows', 'nose', 'mouth'].forEach(function (k) {
        section(C().cats()[k].label, chips(k, face(k), setFace(k)));
        if (k === 'eyes') section('Eye colour', swatches('eyeColor', content().swatches.eyes, face('eyeColor'), setFace('eyeColor')), '(shows on every eye shape but Beady)');
      });
      section('Facial hair', chips('facialHair', function () { return E.look.facialHair; }, function (v) { person(function (L) { L.facialHair = v; }); }));
      section('Glasses', chips('glasses', function () { return E.look.glasses; }, function (v) { person(function (L) { L.glasses = v; }); }));
    },
    hair: function () {
      section('Style', chips('hairStyle', function () { return E.look.hairStyle; }, function (v) { person(function (L) { L.hairStyle = v; }); }));
      var hc = String(E.look.hair).toLowerCase();
      section('Colour', chips('hairColor', function () { var p = C().partsIn('hairColor').filter(function (x) { return x.color.toLowerCase() === hc; })[0]; return p ? p.value : null; },
        function (v) { person(function (L) { L.hair = C().partFor('hairColor', v).color; }); }), 'Dyes unlock as the band grows.');
    },
    clothes: function () {
      var L = cur(), stage = E.which === 'stage';
      var set = function (k) { return function (v) { cur()[k] = v; }; };
      if (stage) E.panel.appendChild(el('p.small.dim.lk-note', 'Stage clothes: what you wear under (or instead of) the stage outfit.'));
      section('Top', chips('top', function () { return L.top; }, set('top')));
      section('Shirt colour', swatches('shirt', content().swatches.clothes, function () { return L.shirt; }, set('shirt')));
      section('Bottoms', chips('bottom', function () { return L.bottom; }, set('bottom')));
      section('Pants colour', swatches('pants', content().swatches.clothes, function () { return L.pants; }, set('pants')));
      section('Shoes', chips('shoes', function () { return L.shoes; }, set('shoes')));
      section('Headwear', chips('headwear', function () { return L.headwear; }, set('headwear')));
      section('Hat colour', swatches('capColor', content().swatches.clothes, function () { return L.capColor; }, set('capColor')), 'Toques, trucker hats and caps.');
    },
    stage: function () {
      E.panel.appendChild(el('p.small.dim.lk-note', 'Your stage look switches on by itself at gigs, on the red carpet and on stage.'));
      section('Stage outfit', chips('outfit', function () { return E.stage.outfit; }, function (v) { E.stage.outfit = v; }));
      section('Stage extras', chips('stageExtra', function () { return E.stage.stageExtras; }, function (a) { E.stage.stageExtras = a; }, { multi: true }));
      section('Outfit colour', swatches('shirt', content().swatches.clothes, function () { return E.stage.shirt; }, function (c) { E.stage.shirt = c; }), 'Tints the suit, the shirt under a vest, the tank.');
      section('Spandex / pants colour', swatches('pants', content().swatches.clothes, function () { return E.stage.pants; }, function (c) { E.stage.pants = c; }));
    },
    ink: function () {
      var tats = function () { return E.look.tattoos || []; };
      var tat = function (spot) { return tats().filter(function (t) { return t.spot === spot; })[0] || null; };
      var setTat = function (spot, design) { person(function (L) { L.tattoos = (L.tattoos || []).filter(function (t) { return t.spot !== spot; }); if (design) L.tattoos.push({ spot: spot, design: design }); }); };
      ['L', 'R'].forEach(function (side) {
        var half = tat('half' + side), full = tat('sleeve' + side), now = full ? 'full' : half ? 'half' : 'none', d = (full || half || {}).design || 'maple';
        var fullOk = C().isUnlocked(E.st, 'tatSpot.sleeve' + side), halfOk = C().isUnlocked(E.st, 'tatSpot.half' + side);
        var cov = el('div.lk-chips', [['none', 'None'], ['half', 'Forearm'], ['full', 'Full sleeve']].map(function (c) {
          var locked = (c[0] === 'full' && !fullOk) || (c[0] === 'half' && !halfOk);
          return btn('.lk-chip' + (now === c[0] ? '.on' : '') + (locked ? '.locked' : ''), { testid: 'lk-arm-' + side + '-' + c[0], onclick: function () {
            if (locked) { lockNote('🔒 ' + C().part('tatSpot.' + (c[0] === 'full' ? 'sleeve' : 'half') + side).name + ': ' + C().gateText(C().part('tatSpot.' + (c[0] === 'full' ? 'sleeve' : 'half') + side).gate) + '.'); return; }
            setTat('half' + side, null); setTat('sleeve' + side, null);
            if (c[0] !== 'none') setTat((c[0] === 'full' ? 'sleeve' : 'half') + side, d);
            refresh();
          } }, [locked ? '🔒 ' : '', c[1]]);
        }));
        var kids = [cov];
        if (now !== 'none') kids.push(chips('tatDesign', function () { return d; }, function (v) { setTat((now === 'full' ? 'sleeve' : 'half') + side, v); }));
        section(side === 'L' ? 'Left arm' : 'Right arm', kids);
      });
      ['chest', 'neck'].forEach(function (spot) {
        var ok = C().isUnlocked(E.st, 'tatSpot.' + spot), t = tat(spot);
        if (!ok) { section(C().part('tatSpot.' + spot).name, el('div.small.dim', '🔒 ' + C().gateText(C().part('tatSpot.' + spot).gate))); return; }
        section(spot === 'chest' ? 'Chest (shows shirtless)' : 'Neck', el('div', [
          btn('.lk-chip' + (!t ? '.on' : ''), { testid: 'lk-opt-' + spot + '-none', onclick: function () { setTat(spot, null); refresh(); } }, 'None'),
          chips('tatDesign', function () { return t && t.design; }, function (v) { setTat(spot, v); })
        ]));
      });
      var tearOk = C().isUnlocked(E.st, 'tatSpot.teardrop'), tear = !!tat('teardrop');
      section('Face', btn('.lk-chip' + (tear ? '.on' : '') + (tearOk ? '' : '.locked'), { testid: 'lk-opt-teardrop', onclick: function () {
        if (!tearOk) { lockNote('🔒 Face teardrop: ' + C().gateText(C().part('tatSpot.teardrop').gate) + '.'); return; }
        setTat('teardrop', tear ? null : 'tear'); refresh();
      } }, [tearOk ? '' : '🔒 ', 'Teardrop']));
      // Knuckles: four letters per hand, A–Z only. The right hand reads first (it's on the left as you face them).
      var kOk = C().isUnlocked(E.st, 'tatSpot.knuckles'), kn = E.look.knuckles || { left: '', right: '' };
      var inp = function (hand) {
        var i = el('input.lk-knuckle', { testid: 'lk-knuckles-' + hand, type: 'text', maxLength: 8, value: kn[hand] || '', placeholder: hand === 'right' ? 'LOVE' : 'HATE',
          autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', disabled: !kOk, 'aria-label': (hand === 'right' ? 'Right' : 'Left') + ' hand knuckles',
          oninput: function () {
            var v = C().knuckles(i.value);
            if (i.value !== v) i.value = v;
            person(function (L) { L.knuckles = Object.assign({ left: '', right: '' }, L.knuckles); L.knuckles[hand] = v; });
            if (E.view !== 'hands') { E.view = 'hands'; bars(); }   // keep the panel (and the keyboard) where it is
            preview();
          } });
        return el('label.lk-kfield', [el('span.caps', hand === 'right' ? 'Right hand' : 'Left hand'), i]);
      };
      section('Knuckles', kOk ? el('div.lk-krow', [inp('right'), inp('left')]) : el('div.small.dim', '🔒 ' + C().gateText(C().part('tatSpot.knuckles').gate)),
        kOk ? 'Four letters per hand, A to Z. Tap Hands above to read them up close.' : null);
      section('Piercings', chips('piercing', function () { return E.look.piercings; }, function (a) { person(function (L) { L.piercings = a; }); }, { multi: true }));
    },
    kit: function () {
      var K = E.kit, set = function (k) { return function (v) { K[k] = v; }; };
      section('Shell finish', chips('shell', function () { return K.shell; }, set('shell')));
      section('Shell colour', swatches('kitColor', content().swatches.kit, function () { return K.color; }, set('color')));
      section('Hardware', chips('hardware', function () { return K.hardware; }, set('hardware')));
      section('Kick-drum head', chips('head', function () { return K.head; }, set('head')));
      if (K.head === 'text') {
        var t = el('input.lk-text', { testid: 'lk-headtext', type: 'text', maxLength: 20, value: K.headText || '', placeholder: String(E.city || 'YOUR TOWN').toUpperCase().slice(0, 14), autocomplete: 'off',
          oninput: function () { K.headText = C().headText(t.value); preview(); },
          onchange: function () { K.headText = C().headText(t.value); t.value = K.headText; preview(); } });
        section('Your text', t, 'Up to 14 letters, numbers or ! ? & \' . - #');
      }
      section('Throne', chips('throne', function () { return K.throne; }, set('throne')));
      var sk = String(K.sticks).toLowerCase();
      section('Sticks', chips('sticks', function () { var p = C().partsIn('sticks').filter(function (x) { return x.color.toLowerCase() === sk; })[0]; return p ? p.value : null; },
        function (v) { K.sticks = C().partFor('sticks', v).color; }));
      section('Extras', chips('kitExtra', function () { return K.extras; }, function (a) { K.extras = a; }, { multi: true }), 'Pyro only fires at arena shows. There is no gong. There will never be a gong.');
    },
    // v1.1: a string seat's instrument (player.gearLook). Every part is yours from day one.
    gear: function () {
      var G = E.gearLook, N = C().gearNames(E.seat), def = C().gearDefault(E.seat, E.genre), shape = G.shape || def;
      var pick = function (testid, on, label, fn) {
        return btn('.lk-chip.lk-big' + (on ? '.on' : ''), { testid: testid, 'aria-pressed': on ? 'true' : 'false', onclick: function () { fn(); refresh(); } }, label);
      };
      section('Body shape', el('div.lk-chips', C().gearShapes(E.seat).map(function (id) {
        return pick('lk-gear-shape-' + id, shape === id, N.shapes[id], function () { G.shape = id; });
      })), E.seat === 'bass' ? 'Four strings. The fifth comes from the shop.' : null);
      var v = String(G.color || '').toLowerCase(), list = content().swatches.kit || [];
      section('Colour', el('div.lk-swatches', [btn('.lk-sw.lk-big.lk-kitsw' + (!G.color ? '.on' : ''), { testid: 'lk-gear-color-kit', 'aria-label': 'Match the kit colour', 'aria-pressed': !G.color ? 'true' : 'false',
        style: { background: (E.kit && E.kit.color) || '#b3262b' }, onclick: function () { G.color = null; refresh(); } }, 'KIT')].concat(list.map(function (c, i) {
        return btn('.lk-sw.lk-big' + (v === c.toLowerCase() ? '.on' : ''), { testid: 'lk-gear-sw-' + i, 'aria-label': 'colour ' + c, 'aria-pressed': v === c.toLowerCase() ? 'true' : 'false', style: { background: c },
          onclick: function () { G.color = c; refresh(); } });
      }))), shape === 'acoustic' ? 'KIT on an acoustic means natural wood.' : null);
      section('Pickguard', el('div.lk-chips', (GG.contracts.GEAR_GUARDS || []).map(function (id) {
        return pick('lk-gear-guard-' + id, G.guard === id, N.guards[id], function () { G.guard = id; });
      })));
      section('Headstock sticker', el('div.lk-chips', ['none', 'logo'].map(function (id) {
        return pick('lk-gear-sticker-' + id, G.sticker === id, N.stickers[id], function () { G.sticker = id; });
      })), 'The band logo, slapped on crooked. Like a professional.');
    }
  };
  function heightLabel(h) { return h < 0.95 ? 'Compact' : h < 1.0 ? 'Average-ish' : h < 1.05 ? 'Average' : 'Tall'; }

  // Mid-week unlocks (a Loonie, a gold record, the Gong, a big gig): a toast; the week's wrap lists them too.
  GG.on('creator:unlocked', function (p) {
    if (!p || p.source === 'week' || !GG.state || !p.names || !p.names.length) return;
    ui.toast('New look unlocked: ' + p.names.slice(0, 3).join(', ') + (p.names.length > 3 ? '…' : '') + ' (☰ → Look)', { kind: 'good', ms: 4200 });
  });

  GG.registerDebug('creator-ui', function () {
    if (!E) return { open: false };
    return { open: true, mode: E.mode, which: E.which, tab: E.tab, view: E.view, look: clone(E.look), stage: clone(E.stage), kit: clone(E.kit),
      seat: E.seat || 'drums', gearLook: E.gearLook ? clone(E.gearLook) : null, tabs: tabs().map(function (t) { return t.id; }),   // v1.1
      preview: GG.render && GG.render.preview ? GG.render.preview.info() : null };
  });
})(window.GG);
