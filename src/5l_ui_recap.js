// 5l_ui_recap.js (v0.8.1 "Addendum 2", LICRECAP): the year-end recap screen (D3) and the licensing offers UI (D1).
//  - 'recap' (full screen): one swipeable strip of pages (native horizontal scroll-snap; dots + Next): the cover (Rolling
//    Scone headline + the band photo), money + fans, best / worst gig, songs + records + awards, the band + the scene
//    (quits, returns, rank vs the rival, regions unlocked), and year one's "what a good year looks like" (the bandmates
//    explain it; the tutorial tie-in). Shown at the week-24 wrap (52_ui_week: the wrap's button opens it before the next
//    year) and again any time from the laptop's Years tab. Display only: no share, no download, no screenshot button.
//  - The band photo: a still of the current lineup posed in the current space, rendered from the garage scene with a
//    small render hook that lives here (GG.ui.recapPhoto): the garage's own people and labels are hidden for one frame,
//    posed figures (GG.render.buildCharacter) stand in front of the kit, one render into an offscreen target, pixels to a
//    2D canvas, everything restored. Kept in memory for the session (never saved); a drawn stand-in without WebGL.
//  - 'offer' (sheet): one licensing offer (brand, song, fee, the label's cut, weeks left) with Take / Counter / Decline,
//    then the outcome. The laptop shows an "Offers" line above its tabs while any offer is open (GG.ui.offersLine) and a
//    Years tab (GG.ui.recapPanel). The week wrap lists licensing news (GG.ui.licenseWrap).
// API: GG.ui.openRecap(year, then?) · recapPhoto(state) -> dataURL|null · openOffer(id) · offersLine(st, rerender) ·
//      recapPanel(st) · licenseWrap(wrap) -> [nodes]
(function (GG) {
  var ui = GG.ui, el = ui.el, btn = ui.btn, U = GG.util;
  function S() { return GG.state; }
  function fill(t) { return t && S() ? ui.fill(t, S()) : (t || ''); }
  function sfx(n) { if (GG.audio) GG.audio.sfx(n); }
  function money(n) { return U.fmtMoney(n); }
  function band(st) { var b = GG.content.bands && GG.content.bands[st.bandId]; return b ? b.name : 'The band'; }

  /* ======================================================================================================
     The band photo (render hook: display only, never saved)
     ====================================================================================================== */
  var photos = {};   // 'band|seed|year' -> dataURL (this session; per band, so a new career in the same seed gets its own room)
  var lastPhoto = null;   // v0.9: the last photo's lineup + room (GG.debug('recap').photo)
  var B = { SPINE: 2, HEAD: 3, ARM_L: 4, FORE_L: 5, ARM_R: 6, FORE_R: 7, PHONES: 15 };   // the one rig (40_render_core)
  var CAPES = { velvet: 1, curtain: 1, charred: 1, fireproof: 1 };
  function rot(b, x, y, z) { if (b) b.rotation.set(x, y, z); }
  var POSES = {
    fist: function (bn) { rot(bn[B.ARM_L], 0, 0, 0.1); rot(bn[B.ARM_R], 0, 0, -2.5); rot(bn[B.FORE_R], 0, 0, -0.35); rot(bn[B.HEAD], -0.12, 0, 0); },
    cross: function (bn) { rot(bn[B.ARM_L], -0.25, 0, 0.12); rot(bn[B.FORE_L], -1.5, 0, -1.25); rot(bn[B.ARM_R], -0.3, 0, -0.12); rot(bn[B.FORE_R], -1.62, 0, 1.25); },
    wide: function (bn) { rot(bn[B.ARM_L], 0, 0, 1.25); rot(bn[B.ARM_R], 0, 0, -1.25); rot(bn[B.FORE_L], 0, 0, 0.3); rot(bn[B.FORE_R], 0, 0, -0.3); rot(bn[B.HEAD], -0.2, 0, 0); },
    sticks: function (bn) { rot(bn[B.ARM_L], 0, 0, 2.55); rot(bn[B.ARM_R], 0, 0, -2.55); rot(bn[B.FORE_L], 0, 0, 0.5); rot(bn[B.FORE_R], 0, 0, -0.5); },
    hips: function (bn) { rot(bn[B.ARM_L], 0, 0, 0.55); rot(bn[B.FORE_L], -0.4, 0, -1.9); rot(bn[B.ARM_R], 0, 0, -0.55); rot(bn[B.FORE_R], -0.4, 0, 1.9); }
  };
  // v0.9: every playable band's members have a signature pose (recruits and fill-ins cycle the generic ones).
  var POSE_OF = { marcel: 'wide', kenji: 'cross', dana: 'fist', jaxon: 'hips',
    rox: 'fist', benny: 'hips', moth: 'cross', chase: 'wide', lenny: 'fist', tamara: 'cross', travis: 'hips', earl: 'cross', clementine: 'hips', duke: 'wide' };
  // The camera: the render's own rig for this room kind (GG.render.garage.photoRig(GG.render.garage.spaceKind(st)) -> { fov,
  // near, far, pos: [x, y, z], look: [x, y, z], x (the row's centre), gap, z: [even, odd] (members' depth), player (depth) }),
  // else the v0.8.1 garage framing (cut-away front wall).
  var RIG = { fov: 35, near: 4.7, far: 40, pos: [0.25, 1.6, 5.75], look: [0.05, 1.18, 0], x: 0.1, gap: 0.62, z: [0.34, 0.2], player: 0.45 };
  function photoKind(st) {
    if (st && (st.spaceTier | 0) > 0) return 'garage';   // the rented rooms share the garage's footprint (and its rig)
    try { var G = GG.render && GG.render.garage; if (G && typeof G.spaceKind === 'function') return G.spaceKind(st) || ui.spaceKind(st); } catch (e) { /* fall through */ }
    return ui.spaceKind(st);
  }
  function photoRig(st) {
    var r = null;
    try { var G = GG.render && GG.render.garage; r = G && typeof G.photoRig === 'function' ? G.photoRig(photoKind(st)) : null; } catch (e) { r = null; }
    return r && r.pos && r.look ? Object.assign({}, RIG, r) : RIG;
  }
  function lineup(st) {
    var b = GG.content.bands && GG.content.bands[st.bandId], cm = {};
    ((b && b.members) || []).forEach(function (m) { cm[m.id] = m; });
    var list = (st.members || []).filter(function (m) { return m.status === 'active'; }).map(function (m, i) {
      return { id: m.id, look: m.look || (cm[m.id] && cm[m.id].look) || null, pose: POSE_OF[m.id] || ['fist', 'hips', 'cross'][i % 3] };
    });
    var p = st.player || {}, preset = (GG.content.presets || []).filter(function (x) { return x.id === p.presetId; })[0];
    var mid = Math.floor(list.length / 2);
    list.splice(mid, 0, { id: 'player', look: p.look || (preset && preset.look) || null, pose: 'sticks', player: true });
    return list.slice(0, 7);
  }
  // Renders the photo once per year (cached for the session). null when there's no 3D.
  ui.recapPhoto = function (st, year) {
    st = st || S();
    var key = st ? (st.bandId || 'hail_damage') + '|' + (st.seed >>> 0) + '|' + (year || st.year) : null;
    if (!st) return null;
    if (photos[key]) return photos[key];
    var R = GG.render;
    if (!R || !R.available || !R.util || !R.buildCharacter || typeof document === 'undefined') return null;
    var made = [], hidden = [], rt = null, renderer = null;
    try {
      if ((GG.debug('render') || {}).scene !== 'garage') R.setScene('garage');
      R.syncState(st);
      var ctx = R.util.ctx(), scene = R.util.currentScene();
      if (!ctx || !scene || !ctx.THREE) return null;
      var THREE = ctx.THREE; renderer = ctx.renderer;
      scene.traverse(function (o) { if ((o.isSkinnedMesh || o.isSprite) && o.visible) hidden.push(o); });
      hidden.forEach(function (o) { o.visible = false; });
      var rig = photoRig(st), people = lineup(st), n = people.length, gap = rig.gap || 0.62, x0 = (rig.x != null ? rig.x : 0.1) - (n - 1) * gap / 2;
      var zs = Array.isArray(rig.z) && rig.z.length >= 2 ? rig.z : RIG.z, zp = rig.player != null ? rig.player : RIG.player;
      var cv = st.flags && st.flags.cape, cape = typeof cv === 'string' && cv !== 'none' ? (CAPES[cv] ? cv : 'velvet') : null;
      var kl = GG.render.kit && st.player ? GG.render.kit.norm(st.player.kit, st.player.kitColor) : null;
      people.forEach(function (p, i) {
        var md = p.player ? null : ui.memberDef(p.id, st);   // v0.9: the cape goes on whoever owns it (member.cape)
        var ch = R.buildCharacter(p.look, { id: p.id, scale: 1.18, lift: true, cape: md && md.cape ? cape : null, sticks: p.player ? (kl ? kl.sticks : true) : null });
        if (!ch) return;
        var front = p.player ? zp : (i % 2 ? zs[1] : zs[0]);
        ch.root.position.set(x0 + i * gap, 0, front);
        ch.root.rotation.y = -0.06 * (x0 + i * gap);
        (POSES[p.pose] || POSES.fist)(ch.bones);
        if (ch.bones[B.PHONES]) ch.bones[B.PHONES].scale.setScalar(0);   // the sulk headphones are a toggle bone: off for the photo
        scene.add(ch.root);
        made.push(ch);
      });
      scene.updateMatrixWorld(true);
      lastPhoto = { key: key, n: made.length, ids: people.map(function (p) { return p.id; }), kind: photoKind(st), rig: rig === RIG ? 'default' : 'render' };   // v0.9 (debug)
      var W = 1200, H = 760;
      rt = new THREE.WebGLRenderTarget(W, H);
      // From outside the cut-away front wall; the near plane clips everything between the lens and the band (cooler, couch).
      var cam = new THREE.PerspectiveCamera(rig.fov, W / H, rig.near, rig.far);
      cam.position.set(rig.pos[0], rig.pos[1], rig.pos[2]); cam.lookAt(rig.look[0], rig.look[1], rig.look[2]); cam.updateMatrixWorld(true);
      renderer.setRenderTarget(rt);
      renderer.clear();
      renderer.render(scene, cam);
      var px = new Uint8Array(W * H * 4);
      renderer.readRenderTargetPixels(rt, 0, 0, W, H, px);
      renderer.setRenderTarget(null);
      var full = document.createElement('canvas'); full.width = W; full.height = H;
      var fx = full.getContext('2d'), img = fx.createImageData(W, H), row = W * 4;
      for (var y = 0; y < H; y++) img.data.set(px.subarray((H - 1 - y) * row, (H - y) * row), y * row);   // GL rows are bottom-up
      fx.putImageData(img, 0, 0);
      var out = document.createElement('canvas'); out.width = W / 2; out.height = H / 2;   // 2x supersampled, drawn down
      var ox = out.getContext('2d'); ox.imageSmoothingQuality = 'high'; ox.drawImage(full, 0, 0, W / 2, H / 2);
      photos[key] = out.toDataURL('image/jpeg', 0.86);
    } catch (e) {
      console.warn('[recap] band photo failed', e);
      photos[key] = null;
    } finally {
      try { if (renderer) renderer.setRenderTarget(null); } catch (e2) { /* ignore */ }
      made.forEach(function (ch) { try { ch.dispose(); } catch (e3) { /* ignore */ } });
      hidden.forEach(function (o) { o.visible = true; });
      if (rt) rt.dispose();
    }
    return photos[key] || null;
  };
  function photoNode(st, rec) {
    var url = ui.recapPhoto(st, rec.y);   // an older year re-opened in a new session: today's lineup stands in
    var cap = band(st) + ' · ' + ui.spaceName(st);
    var pic = url ? el('img.rc-img', { src: url, alt: 'The band, year ' + rec.y, draggable: 'false' })
      : el('div.rc-img.rc-stand', lineup(st).map(function (p) { return ui.avatar(ui.who(p.id), 'lg'); }));
    return el('figure.rc-photo', { testid: 'recap-photo' }, [pic, el('figcaption', cap)]);
  }

  /* ======================================================================================================
     The recap screen
     ====================================================================================================== */
  function stat(label, value, cls) { return el('div.rc-stat', [el('span.caps', label), el('b' + (cls ? '.' + cls : ''), value)]); }
  function gigCard(label, g, cls) {
    if (!g) return null;
    return el('div.rc-gig.' + cls, [el('div.row', [el('span.caps.grow', label), el('span.rc-grade.g-' + g.grade, g.grade)]),
      el('div.rc-venue', g.name), g.quote ? el('div.rc-quote', fill(g.quote)) : null]);
  }
  function names(list) { return list.join(', '); }
  function pages(st, rec) {
    var R = GG.recap, net = rec.fundIn - rec.fundOut, out = [];
    out.push(el('div.rc-page', [
      el('div.rc-mast', [el('span', (GG.content.recap && GG.content.recap.masthead) || 'Rolling Scone'), el('span.tiny', 'YEAR-END ISSUE · YEAR ' + rec.y)]),
      el('h2.rc-head', { testid: 'recap-headline' }, rec.headline), photoNode(st, rec),
      el('p.small.dim.center', fill((GG.content.recap && GG.content.recap.intro || '').replace(/\{nth\}/g, R.nth(rec.y))))]));
    out.push(el('div.rc-page', [el('div.caps.rc-kicker', 'The money'),
      el('div.rc-grid', [stat('Money in', '+' + money(rec.fundIn), 'good'), stat('Money out', '−' + money(rec.fundOut), 'bad'),
        stat('Net', (net >= 0 ? '+' : '') + money(net), net >= 0 ? 'good' : 'bad'), stat('New fans', U.signed(rec.fans), rec.fans >= 0 ? 'good' : 'bad')]),
      el('div.rc-grid', [stat('Gigs played', String(rec.gigs || 0)), stat("Parents' loans", String(rec.loans || 0), rec.loans ? 'bad' : ''),
        rec.lic ? stat('Licensing', '+' + money(rec.lic), 'good') : null]),
      el('p.small.dim', rec.loans ? 'Mom has opinions about the loans.' : net >= 0 ? 'The fund grew. Nobody touch it.' : 'More went out than came in. The van ate some of it.')]));
    out.push(el('div.rc-page', [el('div.caps.rc-kicker', 'On stage'),
      gigCard('Best gig', rec.best, 'best') || el('p.dim', 'No gigs this year. ' + ui.space(st, true) + ' was very quiet.'),
      gigCard('Worst gig', rec.worst, 'worst')]));
    out.push(el('div.rc-page', [el('div.caps.rc-kicker', 'In the studio'),
      el('div.rc-grid', [stat('Songs written', String(rec.songs)), stat('Records out', String(rec.albums))]),
      el('div.caps', { style: 'margin-top:6px' }, 'Awards'),
      rec.awards.length ? el('div.rc-awards', rec.awards.map(function (a) { return el('span.rc-award', '🏆 ' + a); }))
        : el('p.small.dim', rec.noms ? 'Nominated ' + rec.noms + ' time' + (rec.noms > 1 ? 's' : '') + '. Robbed, probably.' : 'No trophies yet. The shelf waits.'),
      rec.awards.length && rec.noms ? el('p.small.dim', '+ ' + rec.noms + ' more nomination' + (rec.noms > 1 ? 's' : '')) : null]));
    var rv = rec.rival, moves = [];
    if (rec.quit.length) moves.push(el('div.rc-line', ['👋 Left: ', el('b', names(rec.quit))]));
    if (rec.back.length) moves.push(el('div.rc-line', ['🔁 Came back: ', el('b', names(rec.back))]));
    if (!moves.length) moves.push(el('div.rc-line.dim', 'Same lineup all year. A small miracle.'));
    out.push(el('div.rc-page', [el('div.caps.rc-kicker', 'The band & the scene'), el('div.stack.tight', moves),
      rv ? el('div.rc-grid', [stat('Scene rank', '#' + rv.rank + (rv.delta ? (rv.delta > 0 ? ' ▲' : ' ▼') + Math.abs(rv.delta) : ''), rv.delta > 0 ? 'good' : rv.delta < 0 ? 'bad' : ''),
        stat(GG.rival ? GG.rival.name(st) : 'The rival', rv.vs ? '#' + rv.vs : '—', rv.vs && rv.vs < rv.rank ? 'bad' : 'good')]) : null,
      rec.regions.length ? el('div.rc-line', ['🌍 Unlocked: ', el('b', names(rec.regions.map(R.regionName)))]) : null]));
    var gy = (R.goodYear(st, rec) || []).filter(function (g) {   // v0.9: only this band's people, about this band
      return g && !ui.foreignMember(ui.speaker(g.who, st), st) && ui.ownLines([g.text], st).length;
    });
    if (gy.length) {
      out.push(el('div.rc-page.rc-good', [el('div.caps.rc-kicker', 'What a good year looks like'),
        el('div.stack.tight', gy.map(function (g) {
          var who = ui.who(ui.speaker(g.who, st));
          return el('div.rc-say' + (g.good ? '.ok' : ''), [ui.avatar(who), el('div.grow', [el('b', { style: { color: who.text } }, who.short), el('div', fill(g.text))])]);
        }))]));
    }
    return out;
  }
  ui.define('recap', {
    kind: 'full', sticky: true,
    build: function (s, d) {
      var st = S(); if (!st || !GG.recap) return;
      var rec = GG.recap.get(st, d.year) || GG.recap.list(st).slice(-1)[0];
      if (!rec) { s.foot.appendChild(btn('.btn.primary.big.block', { testid: 'recap-done', onclick: done }, 'OK')); return; }
      var list = pages(st, rec), track = el('div.rc-track', { testid: 'recap' }, list.map(function (p, i) { p.setAttribute('data-testid', 'recap-page-' + i); return p; }));
      var dots = el('div.rc-dots', list.map(function (p, i) { return el('span' + (i ? '' : '.on')); }));
      var cur = 0, last = list.length - 1;
      var nextBtn = btn('.btn.primary.big.grow', { testid: 'recap-next', onclick: function () { if (cur < last) go(cur + 1); else done(); } }, 'Next ›');
      function label() {
        nextBtn.textContent = cur < last ? 'Next ›' : d.then ? (st.ended ? 'See how it ended →' : 'Start year ' + (rec.y + 1) + ' →') : 'Done';
        nextBtn.setAttribute('data-testid', cur < last ? 'recap-next' : 'recap-done');
        Array.prototype.forEach.call(dots.children, function (x, i) { x.classList.toggle('on', i === cur); });
      }
      function go(i) { cur = Math.max(0, Math.min(last, i)); track.scrollTo({ left: cur * track.clientWidth, behavior: 'smooth' }); label(); }
      track.addEventListener('scroll', function () {
        var i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
        if (i !== cur) { cur = Math.max(0, Math.min(last, i)); label(); }
      }, { passive: true });
      function done() { var then = d.then; ui.close(s.id); if (then) then(); }
      s.data._go = go;
      s.body.classList.add('rc-body');
      ui.append(s.body, track);
      ui.append(s.foot, [dots, el('div.row', [d.then ? null : btn('.btn.ghost', { testid: 'recap-close', onclick: done }, 'Close'), nextBtn])]);
      label();
    },
    onShow: function () { sfx('cheer'); }
  });
  // Opens the recap for `year` (default: the newest). then(): called when the player is done (the week flow continues).
  ui.openRecap = function (year, then) {
    var st = S(); if (!st || !GG.recap) { if (then) then(); return false; }
    var rec = year ? GG.recap.get(st, year) : GG.recap.list(st).slice(-1)[0];
    if (!rec) { if (then) then(); return false; }
    ui.recapPhoto(st, rec.y);   // render the still before the full screen pauses the scene
    ui.show('recap', { year: rec.y, then: then || null });
    return true;
  };
  // The laptop's Years tab: every recap so far, newest first.
  ui.recapPanel = function (st) {
    var list = GG.recap ? GG.recap.list(st).slice().reverse() : [];
    if (!list.length) return el('p.dim.center', { style: 'padding:30px 0' }, 'No years in the books yet. Ask again after week 24.');
    return el('div.stack.tight', { testid: 'laptop-years' }, list.map(function (r) {
      return btn('.rc-row', { testid: 'recap-open-' + r.y, onclick: function () { ui.openRecap(r.y); } }, [
        el('span.rc-yr', 'Y' + r.y), el('div.grow', [el('div.rc-row-head', r.headline), el('div.tiny.dim', U.signed(r.fans) + ' fans · ' + money(r.fundIn - r.fundOut) + ' net · ' + r.songs + ' songs')]), el('span.dim', '›')]);
    }));
  };

  /* ======================================================================================================
     Licensing offers: the laptop line, the offer sheet, the wrap news
     ====================================================================================================== */
  function offerView(st, o) {
    var L = GG.licensing, b = L.brand(o.brandId) || { name: o.brandId, what: 'ad' }, song = GG.songs.byId(st, o.songId);
    var left = Math.max(0, o.expires - st.totalWeek) + 1;
    return { brand: b, song: song, left: left, q: L.quote(st, o, false), qc: L.quote(st, o, true), walk: L.walkChance(st) };
  }
  ui.offersLine = function (st, rerender) {
    if (!GG.licensing || !st) return null;
    var open = GG.licensing.open(st);
    if (!open.length) return null;
    return el('div.stack.tight', { style: 'margin-bottom:10px' }, open.map(function (o) {
      var v = offerView(st, o);
      return btn('.lic-line', { testid: 'laptop-offer-' + o.id, onclick: function () { ui.openOffer(o.id, rerender); } }, [
        el('span', { style: 'font-size:22px' }, '📨'),
        el('div.grow', [el('div', [el('b', 'Offer: '), v.brand.name]), el('div.tiny.dim', '“' + (v.song ? v.song.title : 'a song') + '” · ' + money(o.fee) + ' · ' + v.left + ' week' + (v.left > 1 ? 's' : '') + ' left')]),
        el('span.amber', 'Answer ›')]);
    }));
  };
  ui.define('offer', {
    kind: 'sheet',
    build: function (s, d) {
      var st = S(), L = GG.licensing; if (!st || !L) return;
      var o = L.offer(st, d.id);
      s.setTitle('Licensing offer', 'THE LAPTOP · OFFERS');
      if (d.result) {
        var r = d.result;
        ui.append(s.body, [el('div.you', ['You picked: ', el('b', { take: 'Take it', counter: 'Counter', decline: 'Decline' }[r.choice] || r.choice)]),
          r.success === true ? el('span.tag.amber', { style: 'margin-bottom:8px' }, 'They said yes!') : r.success === false ? el('span.tag', { style: 'margin-bottom:8px;color:var(--bad)' }, 'They walked.') : null,
          el('div.quote', { testid: 'lic-outcome' }, r.outcome || r.why || ''),
          el('div', { style: 'margin-top:12px' }, ui.deltaChips(r.deltas, { emptyText: 'Nothing changed.' }))]);
        s.foot.appendChild(btn('.btn.primary.big.block', { testid: 'lic-ok', onclick: function () { ui.close(s.id); if (d.after) d.after(); } }, 'OK'));
        return;
      }
      if (!o || o.status !== 'open') { s.body.appendChild(el('p.dim', 'That offer is gone.')); return; }
      var v = offerView(st, o);
      L.ensure(st); st.licensing.cur = o.id;
      function answer(choice) {
        var cur = S(); if (!cur || !L.offer(cur, o.id) || L.offer(cur, o.id).status !== 'open') return;
        var r = L.answer(cur, o.id, choice);
        if (r && r.net > 0) sfx('cash');
        if (GG.main && GG.main.sync) GG.main.sync();
        s.rerender({ id: o.id, result: r, after: d.after });
      }
      ui.append(s.body, [
        el('div.lic-card', [el('div.caps', v.brand.what), el('h3.card-title', v.brand.name), el('p.small.dim', v.brand.blurb || ''),
          el('div.line-list', [
            el('div', [el('span', 'The song'), el('b', '“' + (v.song ? v.song.title : 'a song') + '”')]),
            el('div', [el('span', 'Their offer'), el('b.good', money(o.fee))]),
            v.q.cut ? el('div', [el('span', v.q.label + "'s cut"), el('span.bad', '−' + money(v.q.cut))]) : null,
            el('div', [el('span', 'Answer within'), el('span', v.left + ' week' + (v.left > 1 ? 's' : ''))])])]),
        btn('.choice', { testid: 'lic-take', onclick: function () { answer('take'); } }, [el('span.cl', 'Take it'), el('span.ch', '+' + money(v.q.net) + ' · Buzz ↑ · Haters ↑ · the song gets stale')]),
        btn('.choice', { testid: 'lic-counter', onclick: function () { answer('counter'); } }, [el('span.cl', 'Counter: ask ' + money(v.qc.fee)), el('span.ch', 'Gamble: ' + Math.round(v.walk * 100) + '% chance they walk')]),
        btn('.choice', { testid: 'lic-decline', onclick: function () { answer('decline'); } }, [el('span.cl', 'Decline'), el('span.ch', 'No money · Superfans ↑')])
      ]);
    }
  });
  ui.openOffer = function (id, after) { ui.show('offer', { id: id, after: after || null }); };
  // The wrap's licensing news: a new offer (answer on Monday or on the laptop), offers that expired.
  ui.licenseWrap = function (w) {
    var L = w && w.licensing, st = S(), out = [];
    if (!L || !GG.licensing || !st) return out;
    if (L.offer) {
      var b = GG.licensing.brand(L.offer.brandId);
      out.push(el('div.panel.warm.row', { testid: 'wrap-license' }, [el('span', { style: 'font-size:24px' }, '📨'),
        el('div.grow', [el('div', { style: 'font-weight:800' }, (b ? b.name : 'A brand') + ' wants one of your songs'), el('div.small.dim', 'A licensing offer. You\'ll hear about it Monday.')])]));
    }
    (L.expired || []).forEach(function (o) {
      var b = GG.licensing.brand(o.brandId);
      out.push(el('div.panel.row', [el('span', { style: 'font-size:20px' }, '📭'), el('div.grow.small.dim', (b ? b.name : 'A brand') + ' stopped waiting for an answer.')]));
    });
    return out;
  };
  GG.registerDebug('recapui', function () { return { photo: lastPhoto ? Object.assign({}, lastPhoto) : null }; });   // v0.9
})(window.GG);
