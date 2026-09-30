// pw_gig.js: the v0.3 live gig on a 390x844 phone viewport. Sections META_ONLY=gig|e2e|touch|double (default all); each inside `timeout 500`.
//   gig : quickStart + a booked gig → GG.ui.playGig: setlist sheet (slots = setSize, drop/auto-pick, opener/closer hints)
//         → Start → count-in → backing plays on the audio clock → timed in-page taps on lane zones judge Perfect/Good →
//         pause suspends the AudioContext and freezes the song, resume continues → screenshot tests/.cache/gig.png →
//         autoplay bot hook finishes the set ('gig:song' per song, state.liveGig) → results (grade, reactions) → applied →
//         Wrap up → done(result); a perfect autoplay gig scores S; a half-played liveGig resumes at its next song;
//         layout audit; no console errors.
//   e2e : the real weekend through the UI: planner (Book) → board → book → results → Load the van → 3D van (road card)
//         → setlist over the 3D stage → live song with on-time taps → song 1 autoplayed + saved → reload → Continue
//         resumes at song 2 → autoplay → results (rep) → Wrap up → wrap; contact sheet tests/.cache/v03_sheet.png
//   double (v0.7.2): a 176 BPM song with 8th-note kicks on Hard → the highway shows double-kick notes (screenshot
//         tests/.cache/double.png) → ONE on-time tap on a double = one judgement and two kicks heard (the tap's, then the
//         second t2 - hitT after the tap's heard kick on the audio clock via GG.audio.hit), the drummer's left foot kicks;
//         an untapped double plays no extra kick; tapping both kicks = a silent echo (still 2 kicks); headphones calibrated
//         +200 ms keep the pair spaced; closing cancels scheduled hits; Auto-kick plays both kicks of every double.
// Run: node build.js && timeout 500 node tests/pw_gig.js
const path = require('path');
const { open, checker } = require('./_pw');
const CACHE = path.join(__dirname, '.cache');
const ONLY = (process.env.META_ONLY || '').split(',').filter(Boolean);
const want = s => !ONLY.length || ONLY.includes(s);
const tid = id => `[data-testid="${id}"]`;
const tap = (page, id) => page.locator(tid(id)).last().click();
const dbg = (page, k) => page.evaluate(k => GG.debug(k), k);
const waitScreen = (page, id, timeout) => page.waitForFunction(i => GG.debug('ui').screen === i, id, { timeout: timeout || 10000 });

function audit(page) {
  return page.evaluate(() => {
    const W = document.documentElement.clientWidth, bad = [];
    const vis = e => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return null; const cs = getComputedStyle(e); return cs.visibility === 'hidden' || cs.display === 'none' ? null : r; };
    const name = e => (e.dataset.testid || e.className || e.tagName) + '';
    for (const e of document.querySelectorAll('#screens *')) { const r = vis(e); if (r && (r.right > W + 1 || r.left < -1)) bad.push('overflow ' + name(e)); }
    for (const sc of document.querySelectorAll('.full-body, .sheet-body')) if (sc.scrollWidth > sc.clientWidth + 1) bad.push('hscroll ' + sc.className);
    for (const b of document.querySelectorAll('#screens button')) { const r = vis(b); if (r && !b.closest('[hidden]') && (r.width < 43.5 || r.height < 43.5)) bad.push('small ' + name(b) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); }
    return bad.slice(0, 8);
  });
}

// Waits in the page until the heard song time reaches `at`, then taps the lane zone like a finger would.
function tapAt(page, li, at) {
  return page.evaluate(async ([li, at]) => {
    const c = document.querySelector('[data-testid="gig-highway"]'), r = c.getBoundingClientRect(), lanes = GG.debug('gigui').lanes;
    while (GG.debug('gigui').songT < at - 0.012) await new Promise(res => setTimeout(res, 4));
    while (GG.debug('gigui').songT < at) { /* spin the last few ms */ }
    const x = r.left + (li + 0.5) * r.width / lanes, y = r.bottom - 36;
    c.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y, pointerId: 7 + li, pointerType: 'touch', isPrimary: false, bubbles: true, cancelable: true }));
    return GG.debug('gigui').last;
  }, [li, at]);
}

async function gig() {
  const c = checker('gig');
  const { page, errors, close } = await open();
  try {
    await page.waitForSelector(tid('btn-new'));
    await page.evaluate(() => {
      GG.main.quickStart({ seed: 5150, openCard: false });
      const s = GG.state; s.card = null; s.phase = 'plan';
      for (let i = 0; i < 3; i++) GG.songs.jam(s, GG.RNG(40 + i));
      s.songs.forEach(x => ['verse', 'chorus', 'bridge'].forEach(n => { const sec = x.pattern.sections[n];   // v0.6.2: 4-note downbeats
        for (let l = 0; l < Math.min(4, sec.length); l++) sec[l] = 'x' + sec[l].slice(1); }));
      window.__ah = []; const h0 = GG.audio.hit;
      GG.audio.hit = (l, w) => { if (w != null) window.__ah.push(w - GG.audio.context().currentTime); return h0(l, w); };
      s.gig = GG.gig.makeGig(s, 'legion_63', 'book');
      window.__songs = []; GG.on('gig:song', p => window.__songs.push(p.index));
      window.__done = null; GG.ui.gigAutoplay = false;
      GG.ui.playGig(s.gig, r => { window.__done = r; });
    });
    await waitScreen(page, 'gig-set');
    const set0 = await page.evaluate(() => ({ size: GG.gig.setSize(GG.state, GG.state.gig), slots: document.querySelectorAll('.set-slot').length,
      filled: document.querySelectorAll('.set-slot:not(.empty)').length, hints: document.querySelector('[data-testid="set-slots"]').textContent,
      under: GG.debug('ui').stack, back: !document.querySelector('.gig-back').hidden, stage: GG.debug('gigui').stage }));
    c.ok(set0.size === 4 && set0.slots === 4 && set0.filled === 4, 'setlist sheet: 4 slots filled by auto-pick ' + JSON.stringify(set0));
    c.ok(/Strong opener/.test(set0.hints) && /Big closer/.test(set0.hints), 'opener/closer hints');
    c.ok(set0.under.join() === 'gig,gig-set', 'the sheet sits over the show ' + set0.under);
    c.ok(set0.stage || set0.back, '3D stage or the 2D backdrop behind it');
    await tap(page, 'set-drop-0');
    const set1 = await page.evaluate(() => ({ filled: document.querySelectorAll('.set-slot:not(.empty)').length, start: !document.querySelector('[data-testid="btn-gig-start"]').disabled }));
    c.ok(set1.filled === 3 && set1.start, 'drop a song: 3 left, still startable');
    await tap(page, 'btn-gig-auto');
    c.ok(await page.evaluate(() => document.querySelectorAll('.set-slot:not(.empty)').length) === 4, 'auto-pick refills');
    c.ok((await audit(page)).length === 0, 'setlist layout ' + (await audit(page)).join('; '));
    await tap(page, 'btn-gig-start');
    await page.waitForFunction(() => GG.debug('gigui').mode === 'count', null, { timeout: 5000 });
    c.ok(await page.evaluate(() => GG.state.liveGig && GG.state.liveGig.setlist.length === 4 && GG.state.liveGig.index === 0), 'state.liveGig holds the set');
    await page.waitForFunction(() => GG.debug('gigui').mode === 'play', null, { timeout: 8000 });
    const a0 = await page.evaluate(() => ({ g: GG.debug('gigui'), a: GG.debug('audio') }));
    c.ok(a0.g.audio && a0.g.ctx && a0.a.state === 'running' && a0.a.playing, 'backing plays on a running AudioContext ' + JSON.stringify({ a: a0.a.state, g: a0.g.audio }));
    c.ok(a0.g.songT >= 0 && a0.g.songT < 2 && a0.g.lat >= 0 && a0.g.lat < 0.3, 'song clock started ' + a0.g.songT);
    const clk = await page.evaluate(() => { const h = GG.audio.current(), cx = GG.audio.context(), d = GG.debug('gigui');
      return { diff: (cx.currentTime - d.lat - h.start) - d.songT, lat: d.lat }; });
    c.ok(Math.abs(clk.diff) < 0.03, 'song clock = AudioContext time - output latency - backing start ' + JSON.stringify(clk));
    // Timed taps: aim at three upcoming notes on the heard clock.
    const judged = [];
    for (let k = 0; k < 3; k++) {
      const n = (await dbg(page, 'gigui')).next;
      if (!n) break;
      const last = await tapAt(page, n.li, n.t);
      judged.push(last && last.judgement + ' ' + Math.round((last.at - n.t) * 1000) + 'ms');
    }
    if (process.env.VERBOSE) console.log('taps: ' + judged.join(', '));
    c.ok(judged.length === 3 && judged.every(j => /^(perfect|good) /.test(j)), 'taps at the right audio time judge Perfect/Good: ' + judged.join(', '));
    c.ok(judged.filter(j => /^perfect/.test(j)).length >= 2, 'mostly Perfect');
    const st1 = (await dbg(page, 'gigui')).stats;
    c.ok(st1 && st1.perfect + st1.good >= 3, 'session counted the hits ' + JSON.stringify(st1));
    await page.waitForTimeout(700);
    const au = await page.evaluate(() => ({ auto: GG.debug('gigui').auto, played: GG.debug('gigui').autoPlayed, lead: window.__ah.slice(0, 20) }));
    c.ok(au.auto > 0 && au.played > 0, 'two-thumb auto notes play themselves ' + JSON.stringify(au));
    c.ok(au.lead.length > 0 && au.lead.filter(x => x > -0.01).length >= au.lead.length * 0.6 && au.lead.every(x => x < 0.35), 'auto notes are scheduled ahead on the audio clock (headless clock is bursty) ' + au.lead.map(x => x.toFixed(3)));
    const meter = await page.evaluate(() => ({ w: document.querySelector('.gig-crowd .bar > i').style.width, lv: document.querySelector('.gig-crowd .lv').textContent,
      px: (() => { const cv = document.querySelector('[data-testid="gig-highway"]'), d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
        let lit = 0; for (let i = 0; i < d.length; i += 4 * 97) if (d[i] + d[i + 1] + d[i + 2] > 120) lit++; return lit; })() }));
    c.ok(/%$/.test(meter.w) && meter.lv.length > 2, 'crowd meter shows ' + meter.w + ' ' + meter.lv);
    c.ok(meter.px > 50, 'highway draws notes and zones (' + meter.px + ' lit samples)');
    await page.screenshot({ path: path.join(CACHE, 'gig.png') });
    c.ok((await audit(page)).length === 0, 'gig layout ' + (await audit(page)).join('; '));
    // Pause freezes the song on a suspended context; resume carries on.
    await tap(page, 'btn-gig-pause');
    await page.waitForFunction(() => GG.debug('gigui').paused, null, { timeout: 3000 });
    const p1 = await page.evaluate(() => GG.debug('gigui').songT);
    await page.waitForTimeout(400);
    const p2 = await page.evaluate(() => ({ t: GG.debug('gigui').songT, ctx: GG.audio.context().state, ov: !document.querySelector('[data-testid="gig-paused"]').hidden }));
    c.ok(p2.ov && p2.ctx === 'suspended' && Math.abs(p2.t - p1) < 0.03, 'pause: overlay, context suspended, song frozen ' + JSON.stringify([p1, p2]));
    await tap(page, 'btn-gig-resume');
    await page.waitForTimeout(400);
    const p3 = await page.evaluate(() => ({ t: GG.debug('gigui').songT, ctx: GG.audio.context().state, paused: GG.debug('gigui').paused }));
    c.ok(!p3.paused && p3.ctx === 'running' && p3.t > p2.t + 0.15, 'resume: the song carries on ' + JSON.stringify(p3));
    // Autoplay hook: a bot finishes the set instantly.
    await page.evaluate(() => { GG.ui.gigAutoplay = true; });
    await waitScreen(page, 'gig-results', 15000);
    const res = await page.evaluate(() => ({ r: GG.state.lastGig, songs: window.__songs, live: GG.state.liveGig, gigs: GG.state.stats.gigs,
      grade: document.querySelector('[data-testid="gig-grade"]').textContent, reacts: document.querySelectorAll('.gigres .react').length, playing: GG.audio.isPlaying() }));
    c.ok(res.songs.join() === '0,1,2,3', "'gig:song' after every song " + res.songs);
    c.ok(res.r && res.r.live && res.r.songResults.length === 4 && res.r.songResults[0].perfect >= 2, 'live GIG_RESULT with my taps in song 1');
    c.ok(res.live === null && res.gigs === 1 && res.grade === res.r.grade && res.reacts === 4 && !res.playing, 'results: applied, grade shown, 4 reactions, audio stopped');
    c.ok((await audit(page)).length === 0, 'results layout ' + (await audit(page)).join('; '));
    await tap(page, 'btn-gig-done');
    await page.waitForFunction(() => window.__done !== null, null, { timeout: 3000 });
    const after = await page.evaluate(() => ({ stack: GG.debug('ui').stack, open: GG.debug('gigui').open, grade: window.__done.grade, gig: GG.state.gig }));
    c.ok(after.stack.length === 0 && !after.open && after.grade === res.r.grade && after.gig === null, 'Wrap up: screens close, done(result) fires');
    // A perfect autoplay gig, then a resume from a half-played liveGig.
    const perfect = await page.evaluate(() => new Promise(res => {
      const s = GG.state; s.gig = GG.gig.makeGig(s, 'gopher_hole', 'offer'); GG.ui.gigAutoplay = { accuracy: 1, jitterMs: 0 };
      GG.ui.playGig(s.gig, r => res({ grade: r.grade, acc: r.accuracy, n: r.songResults.length }));
      const iv = setInterval(() => { const b = document.querySelector('[data-testid="btn-gig-done"]'); if (b) { clearInterval(iv); b.click(); } }, 20);
    }));
    c.ok(perfect.grade === 'S' && perfect.acc === 1, 'perfect autoplay: S, 100% ' + JSON.stringify(perfect));
    const resume = await page.evaluate(() => new Promise(res => {
      const s = GG.state; s.gig = GG.gig.makeGig(s, 'bingo_palace', 'book');
      const ses = GG.gig.session(s, s.gig, null, {}); const first = GG.gig.botPlay(ses, { accuracy: 0.5, jitterMs: 0, one: true }, GG.RNG(3));
      const saved = JSON.parse(JSON.stringify(s.liveGig)); GG.state.liveGig = saved;   // as if reloaded between songs
      GG.ui.gigAutoplay = true; window.__songs = [];
      GG.ui.playGig(s.gig, r => res({ first: first.score, got: r.songResults[0].score, n: r.songResults.length, idx: window.__songs }));
      const iv = setInterval(() => { const b = document.querySelector('[data-testid="btn-gig-done"]'); if (b) { clearInterval(iv); b.click(); } }, 20);
    }));
    c.ok(resume.first === resume.got && resume.n === 3 && resume.idx.join() === '1,2', 'reload mid-gig resumes at the next song ' + JSON.stringify(resume));
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  await close();
  c.done();
}

// Taps every upcoming note on time for `secs` (a steady player), in the page.
function playFor(page, secs) {
  return page.evaluate(async secs => {
    const c = document.querySelector('[data-testid="gig-highway"]'), end = performance.now() + secs * 1000;
    while (performance.now() < end) {
      const d = GG.debug('gigui'); if (!d.soon || !d.soon.length || d.mode !== 'play') { await new Promise(r => setTimeout(r, 20)); continue; }
      const r = c.getBoundingClientRect(), n = d.soon[0], chord = d.soon.filter(x => x.t - n.t < 0.002);
      while (GG.debug('gigui').songT < n.t - 0.012) await new Promise(res => setTimeout(res, 4));
      while (GG.debug('gigui').songT < n.t) { /* spin */ }
      for (const x of chord) c.dispatchEvent(new PointerEvent('pointerdown', { clientX: r.left + (x.li + 0.5) * r.width / d.lanes, clientY: r.bottom - 36, pointerId: 11 + x.li, pointerType: 'touch', bubbles: true, cancelable: true }));
    }
    return GG.debug('gigui').stats;
  }, secs);
}
// v0.5.1: REAL touch taps (page.touchscreen, not synthetic canvas events) reach the judge, even with a stray layer over
// the highway, and song time never runs backwards or leaps when the audio clock stalls.
async function touch() {
  const c = checker('touch');
  const { page, errors, close } = await open();
  try {
    await page.waitForSelector(tid('btn-new'));
    await page.evaluate(() => { GG.main.quickStart({ seed: 5, slot: '1', openCard: false }); GG.ui.closeAll(); GG.ui.gigAutoplay = false; GG.ui.playGig(GG.state.gig, () => {}); });
    await waitScreen(page, 'gig-set');
    c.ok(await page.evaluate(() => GG.debug('gigui').open) && await page.locator(tid('gig-diff-easy')).isVisible(), 'difficulty toggle on the setlist');
    await tap(page, 'btn-gig-start');
    await page.waitForFunction(() => GG.debug('gigui').mode === 'play', null, { timeout: 8000 });
    c.ok(await page.evaluate(() => GG.debug('gigui').diff) === 'easy', 'new players get Easy');
    await page.evaluate(() => { window.__hits = 0; const h = GG.audio.hit; GG.audio.hit = function () { window.__hits++; return h.apply(this, arguments); };
      const d = document.createElement('div'); d.id = 'stray'; d.style.cssText = 'position:fixed;inset:0;z-index:99;background:transparent'; document.body.appendChild(d); });
    const box = await page.locator(tid('gig-highway')).boundingBox();
    for (let i = 0; i < 6; i++) { await page.touchscreen.tap(box.x + box.width * (0.12 + 0.25 * (i % 4)), box.y + box.height - 40); await page.waitForTimeout(120); }
    c.ok(await page.evaluate(() => window.__hits) >= 6, 'real taps under a stray layer reach the drums (' + await page.evaluate(() => window.__hits) + ')');
    const ts = await page.evaluate(async () => { GG.audio.context().suspend(); const o = []; for (let i = 0; i < 8; i++) { await new Promise(r => setTimeout(r, 200)); o.push(GG.debug('gigui').songT); } return o; });
    const steps = ts.slice(1).map((t, i) => t - ts[i]);
    c.ok(steps.every(d => d > 0.1 && d < 0.4), 'with the audio clock stalled, song time still flows ~1x ' + steps.map(d => d.toFixed(2)).join(' '));
    c.ok(!errors.length, 'no console errors ' + errors.slice(0, 2));
  } finally { await close(); c.done(); }
}
async function e2e() {
  const c = checker('e2e');
  const { page, context, errors, close } = await open();
  const shots = [];
  const shot = async name => { await page.waitForTimeout(350); const f = path.join(CACHE, 'v03_' + name + '.png'); await page.screenshot({ path: f }); shots.push([name, f]); };
  try {
    await page.waitForSelector(tid('btn-new'));
    await page.evaluate(() => {
      GG.main.quickStart({ seed: 9090, slot: '2', openCard: false });
      const s = GG.state; s.card = null; s.phase = 'plan'; s.gig = null; s.offer = null; s.fans = 160; s.buzz = 20; s.flags.cape = 'velvet';
      for (let i = 0; i < 2; i++) GG.songs.jam(s, GG.RNG(70 + i));
      GG.ui.gigAutoplay = false; GG.main.sync();
    });
    await tap(page, 'btn-primary'); await waitScreen(page, 'plan');
    for (const a of ['book', 'rehearse', 'rest']) await tap(page, 'act-' + a);
    await tap(page, 'btn-go');
    await waitScreen(page, 'board');
    await shot('board');
    const book = await page.evaluate(() => [...document.querySelectorAll('[data-testid^="book-"]:not([disabled])')].map(b => b.dataset.testid)[0]);
    c.ok(!!book, 'the board has a gig to book');
    await tap(page, book); await waitScreen(page, 'confirm'); await tap(page, 'btn-confirm-yes');
    await waitScreen(page, 'results');
    c.ok(await page.evaluate(() => GG.state.phase === 'gig' && !!GG.state.gig), "runWeek leaves the gig to play live (phase 'gig')");
    const saved0 = await page.evaluate(() => { const r = GG.save.read('2'); return r && r.phase; });
    c.ok(saved0 === 'gig', "autosaved at 'gig:pending' (" + saved0 + ')');
    await tap(page, 'btn-results-skip');
    c.ok(await page.locator(tid('gig-pending')).isVisible() && /Load the van/.test(await page.textContent(tid('btn-results-ok'))), 'results: this weekend + Load the van');
    await tap(page, 'btn-results-ok');
    await waitScreen(page, 'van');
    const vm = await page.evaluate(() => ({ mode: GG.debug('van').mode, scene: GG.debug('render').scene, paused: GG.debug('render').paused }));
    c.ok(vm.mode === '3d' && vm.scene === 'van' && !vm.paused, 'the 3D van drives (live3d keeps it drawing) ' + JSON.stringify(vm));
    await page.waitForFunction(() => GG.debug('van').p > 0.3 || GG.debug('ui').screen === 'road', null, { timeout: 12000 });
    await shot('van');
    await tap(page, 'btn-van-skip');
    for (let k = 0; k < 20 && await page.evaluate(() => GG.debug('ui').screen) !== 'gig-set'; k++) {
      if (await page.evaluate(() => GG.debug('ui').screen) === 'road') { await tap(page, 'road-choice-0'); await tap(page, 'btn-road-ok'); }
      await page.waitForTimeout(250);
    }
    await waitScreen(page, 'gig-set');
    const st0 = await page.evaluate(() => ({ g: GG.debug('gigui'), r: GG.debug('render'), info: GG.render.stage.info() }));
    c.ok(st0.g.stage && st0.r.scene === 'stage' && !st0.r.paused, 'setlist sheet over the live 3D stage ' + JSON.stringify({ scene: st0.r.scene, paused: st0.r.paused }));
    await shot('setlist');
    await tap(page, 'btn-gig-start');
    await page.waitForFunction(() => GG.debug('gigui').mode === 'play', null, { timeout: 8000 });
    const hits = await playFor(page, 4);
    c.ok(hits && hits.perfect >= 10 && hits.maxCombo >= 12, 'on-time taps (chords = multitouch) land ' + JSON.stringify(hits));
    await shot('gig');
    const r3 = await page.evaluate(() => ({ r: GG.debug('render'), crowd: GG.debug('gigui').crowd }));
    c.ok(r3.r.scene === 'stage' && !r3.r.paused && r3.r.drawCalls < 80, 'stage drawing under the gig screen, ' + r3.r.drawCalls + ' draw calls');
    // Song 1 by the bot, then stop at song 2 and reload: Continue resumes the set.
    await page.evaluate(() => { GG.once('gig:song', () => { GG.ui.gigAutoplay = false; }); GG.ui.gigAutoplay = { accuracy: 1, jitterMs: 0 }; });
    await page.waitForFunction(() => GG.state.liveGig && GG.state.liveGig.index === 1 && GG.debug('gigui').mode === 'count', null, { timeout: 8000 });
    const saved1 = await page.evaluate(() => { const r = GG.save.read('2'); return r && r.liveGig && r.liveGig.index; });
    c.ok(saved1 === 1, "autosaved between songs ('gig:song') " + saved1);
    await page.reload();
    await page.waitForSelector(tid('btn-continue'));
    await tap(page, 'btn-continue');
    await page.waitForFunction(() => GG.debug('gigui').open && GG.debug('gigui').mode === 'between', null, { timeout: 8000 });
    const back = await page.evaluate(() => ({ t: document.querySelector('[data-testid="gig-between"]').textContent, idx: GG.debug('gigui').index, van: GG.ui.isOpen('van'), stage: GG.debug('gigui').stage }));
    c.ok(/Welcome back/.test(back.t) && back.idx === 1 && !back.van && back.stage, 'reload mid-gig: Continue resumes at song 2, no second drive ' + JSON.stringify(back));
    await page.evaluate(() => { GG.ui.gigAutoplay = true; });
    await tap(page, 'btn-gig-next');
    await waitScreen(page, 'gig-results', 15000);
    const res = await page.evaluate(() => ({ phase: GG.state.phase, r: GG.state.lastGig, rep: (document.querySelector('[data-testid="gig-rep"]') || {}).textContent }));
    c.ok(res.phase === 'wrap' && res.r.live && res.r.songResults[0].perfect >= 5 && res.r.songResults.length >= 2, 'finishGig applied the live result (song 1 kept my taps)');
    c.ok(res.r.rep != null && !!res.rep, 'venue rep on the results: ' + res.rep);
    await shot('results');
    await tap(page, 'btn-gig-done');
    await waitScreen(page, 'wrap');
    c.ok(await page.evaluate(() => GG.debug('render').scene === 'garage' && !GG.state.liveGig && !GG.state.gig), 'wrap: back in the garage, gig cleared');
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
    const sheet = await context.newPage();
    await sheet.setViewportSize({ width: shots.length * 200 + 10, height: 452 });
    await sheet.setContent('<style>body{margin:0;padding:5px;background:#05070c;display:flex;font:12px system-ui;color:#aaa}figure{margin:0;padding:4px 5px;width:190px}' +
      'img{width:190px;height:411px;display:block;border-radius:6px}figcaption{text-align:center;padding:3px}</style>' +
      shots.map(([n, f]) => `<figure><img src="data:image/png;base64,${require('fs').readFileSync(f).toString('base64')}"><figcaption>${n}</figcaption></figure>`).join(''));
    await sheet.screenshot({ path: path.join(CACHE, 'v03_sheet.png') });
    c.ok(shots.length === 5, 'contact sheet v03_sheet.png: ' + shots.map(x => x[0]).join(', '));
  } catch (e) { c.ok(false, 'threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  await close();
  c.done();
}

// v0.7.2 double kicks: tap once, hear two kicks (the second on the audio clock at t2); a missed double stays silent.
async function double() {
  const c = checker('double');
  const { page, errors, close } = await open();
  // the heard song time of each kick: scheduled hits at (when - ctx now) + latency after the call, immediate ones at the call
  const kicksIn = (page, t0, t1) => page.evaluate(([t0, t1]) => window.__kh.filter(h => h.at >= t0 && h.at <= t1), [t0, t1]);
  const nextDouble = page => page.waitForFunction(() => { const d = GG.debug('gigui'); return d.mode === 'play' && (d.soon || []).find(n => n.t2 && n.t > d.songT + 0.6) || null; }, null, { timeout: 8000 }).then(h => h.jsonValue());
  try {
    await page.waitForSelector(tid('btn-new'));
    const setup = await page.evaluate(() => {
      GG.prefs.set({ gigDifficulty: 'hard', autoKick: false, lefty: false });
      GG.main.quickStart({ seed: 7272, openCard: false });
      const s = GG.state, E = '................'; s.card = null; s.phase = 'plan';
      const bar = ['x.x.x.x.x.x.x.x.', '....x.......x...', E, E];
      const song = GG.songs.create(s, { bpm: 176, lanes: 4, arrangement: ['verse', 'chorus', 'verse', 'chorus'], sections: { verse: bar, chorus: bar, bridge: [E, E, E, E] } },
        'Double Trouble', { quality: 60, polish: 60 });
      s.songs = [song];
      window.__kh = []; window.__hc = 0; const h0 = GG.audio.hit, c0 = GG.audio.hitCancel;
      GG.audio.hit = function (l, w) {   // heard song time: ctx time (a past `when` plays at ctx now + 5 ms) + output latency
        if (l === 'kick') { const d = GG.debug('gigui'), cx = GG.audio.context(), dt = w != null ? w - cx.currentTime : 0;
          window.__kh.push({ w: w != null, at: d.songT + d.lat + (dt > 0.005 && dt < 1.005 ? dt : 0.005) }); }
        return h0.apply(this, arguments);
      };
      GG.audio.hitCancel = function () { window.__hc++; return c0.apply(this, arguments); };
      s.gig = GG.gig.makeGig(s, 'legion_63', 'book'); GG.ui.gigAutoplay = false;
      GG.ui.playGig(s.gig, () => {});
      const ch = GG.gig.chart(song, { difficulty: 'hard' });
      return { doubles: ch.doubles, kicks: ch.notes.filter(n => n.lane === 'kick' && !n.free).length, gap: GG.gig.DOUBLE_GAP };
    });
    c.ok(setup.doubles > 20 && setup.doubles === setup.kicks, '8th-note kicks at 176 BPM chart as doubles (every kick note is one) ' + JSON.stringify(setup));
    await waitScreen(page, 'gig-set');
    await tap(page, 'btn-gig-start');
    await page.waitForFunction(() => GG.debug('gigui').mode === 'play', null, { timeout: 8000 });
    const g0 = await dbg(page, 'gigui');
    c.ok(g0.diff === 'hard' && g0.doubles === setup.doubles && g0.doublesPlayed === 0, 'debug gigui: doubles on the chart ' + JSON.stringify([g0.diff, g0.doubles, g0.doublesPlayed]));
    // a double on screen
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(CACHE, 'double.png') });
    // ONE tap on a double: one judgement, two kicks heard (~t and ~t2)
    const n = await nextDouble(page);
    const before = (await dbg(page, 'gigui')).stats, info0 = await page.evaluate(() => GG.render.stage && GG.render.stage.info());
    const last = await tapAt(page, n.li, n.t);
    await page.waitForTimeout(700);
    const after = await dbg(page, 'gigui'), kh = await kicksIn(page, n.t - 0.15, n.t2 + 0.4);
    c.ok(last && /^(perfect|good)$/.test(last.judgement) && Math.abs(last.at - n.t) < 0.03, 'one tap on a double judges it ' + JSON.stringify(last));
    c.ok(after.stats.perfect + after.stats.good === before.perfect + before.good + 1, 'one judgement for two kicks ' + JSON.stringify([before.perfect + before.good, after.stats.perfect + after.stats.good]));
    c.ok(kh.length === 2 && !kh[0].w, 'two kicks heard: the tap and the double ' + JSON.stringify({ t: n.t, t2: n.t2, kh }));
    // the pair keeps its spacing from the tap's HEARD kick (t2 - hitT; frame-due adds up to a frame), so it lands ~t2 + latency
    const pairGap = (kh, tap, x) => kh.length === 2 ? +((kh[1].at - kh[0].at) - (x.t2 - tap.at)).toFixed(3) : null;
    const g1 = pairGap(kh, last, n);
    c.ok(g1 != null && g1 > -0.02 && g1 < 0.06 && kh[1].at - n.t2 > -0.02 && kh[1].at - n.t2 < after.lat + 0.07,
      'the second kick follows the tap\'s kick by t2 - hitT on the audio clock ' + JSON.stringify({ g1, sched: kh[1] && kh[1].w, vsT2: kh[1] && +(kh[1].at - n.t2).toFixed(3), lat: after.lat }));
    c.ok(after.doublesPlayed === 1, 'doublesPlayed counts it ' + after.doublesPlayed);
    const info1 = await page.evaluate(() => GG.render.stage && GG.render.stage.info());
    c.ok(!(info0 && info0.built) || info1.kick2s === info0.kick2s + 1, "the drummer's left foot kicks the second hit " + JSON.stringify([info0 && info0.kick2s, info1 && info1.kick2s]));
    // an untapped double plays nothing extra
    const m = await nextDouble(page);
    await page.waitForFunction(t => GG.debug('gigui').songT > t, m.t2 + 0.5, { timeout: 5000 });
    const km = await kicksIn(page, m.t - 0.15, m.t2 + 0.3), dm = await dbg(page, 'gigui');
    c.ok(km.length === 0 && dm.doublesPlayed === 1, 'a missed double: no extra kick ' + JSON.stringify({ km, played: dm.doublesPlayed }));
    // tapping BOTH kicks: the echo tap is forgiven and silent (the scheduled second kick is that hit: no flam, no third kick)
    const e = await nextDouble(page), e0 = (await dbg(page, 'gigui')).stats;
    const eFirst = await tapAt(page, e.li, e.t), eEcho = await tapAt(page, e.li, e.t2);
    await page.waitForTimeout(600);
    const ke = await kicksIn(page, e.t - 0.15, e.t2 + 0.4), de = await dbg(page, 'gigui');
    c.ok(/^(perfect|good)$/.test(eFirst.judgement) && eEcho && eEcho.echo && de.stats.perfect + de.stats.good === e0.perfect + e0.good + 1,
      'the echo tap: forgiven, one judgement ' + JSON.stringify({ eFirst, eEcho, e0, s: de.stats }));
    // (a frame stalled > 80 ms past the second kick drops it: then only the tap's kick; never a third one)
    c.ok(ke.length === 1 + de.doublesPlayed - dm.doublesPlayed && ke.length >= 1 && !ke[0].w, 'the echo tap plays no kick of its own (tap + second kick only) ' + JSON.stringify({ ke, played: de.doublesPlayed }));
    // Bluetooth headphones calibrated +200 ms: an on-time (to the player) tap still gets a spaced double, never a flam/silence
    await page.evaluate(() => { GG.ui.closeAll(); GG.state.liveGig = null; GG.prefs.set({ audioProfile: 'headphones' }); GG.prefs.setCalib('headphones', { audio: 200 });
      window.__kh = []; GG.ui.playGig(GG.state.gig, () => {}); });
    await waitScreen(page, 'gig-set');
    await tap(page, 'btn-gig-start');
    await page.waitForFunction(() => GG.debug('gigui').mode === 'play', null, { timeout: 8000 });
    const b = await nextDouble(page), bTap = await tapAt(page, b.li, b.t + 0.2);
    await page.waitForTimeout(800);
    const kb = await kicksIn(page, b.t + 0.05, b.t2 + 0.7), gb = pairGap(kb, bTap, b);
    c.ok(bTap && /^(perfect|good)$/.test(bTap.judgement) && Math.abs(bTap.at - b.t) < 0.03, 'calibrated +200 ms: a tap 200 ms after the note is on time ' + JSON.stringify(bTap));
    c.ok(kb.length === 2 && gb > -0.02 && gb < 0.06 && kb[1].at - kb[0].at >= 0.06,
      'calibrated +200 ms: two kicks, spaced t2 - t (no flam, no silent drop) ' + JSON.stringify({ gb, gap: kb.length === 2 && +(kb[1].at - kb[0].at).toFixed(3), want: +(b.t2 - b.t).toFixed(3), kb }));
    const hc0 = await page.evaluate(() => window.__hc);
    await page.evaluate(() => { GG.ui.closeAll(); GG.prefs.setCalib('headphones', { audio: 0 }); GG.prefs.set({ audioProfile: 'speaker' }); });
    c.ok(await page.evaluate(() => window.__hc) > hc0, 'closing the gig cancels hits scheduled ahead (GG.audio.hitCancel)');
    // Auto-kick plays both kicks of every double
    await page.evaluate(() => { GG.ui.closeAll(); GG.state.liveGig = null; GG.prefs.set({ autoKick: true }); window.__kh = []; GG.ui.playGig(GG.state.gig, () => {}); });
    await waitScreen(page, 'gig-set');
    await tap(page, 'btn-gig-start');
    await page.waitForFunction(() => GG.debug('gigui').mode === 'play' && GG.debug('gigui').songT > 3, null, { timeout: 12000 });
    const ak = await page.evaluate(() => ({ d: GG.debug('gigui'), kicks: window.__kh.length, sched: window.__kh.filter(h => h.w).length, kh: window.__kh.map(h => (h.w ? 'S' : 'I') + h.at.toFixed(3)).join(' ') }));
    const plays = ak.d.doublesPlayed; if (process.env.VERBOSE) console.log(ak.kh, plays, ak.d.songT);
    c.ok(plays >= 6 && ak.d.stats.good >= plays, 'auto-kick hits the doubles and plays their second kicks ' + JSON.stringify({ plays, good: ak.d.stats.good }));
    // every played double calls GG.audio.hit('kick') for its second kick; the first kicks are Auto-kick's (one per frame at most)
    c.ok(ak.kicks >= plays + Math.ceil(plays / 3) && ak.sched <= plays, 'two kicks per auto double ' + JSON.stringify({ kicks: ak.kicks, plays, scheduled: ak.sched, kh: ak.kh }));
    await page.evaluate(() => { GG.prefs.set({ autoKick: false }); GG.ui.closeAll(); });
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  await close();
  c.done();
}

(async () => { if (want('gig')) await gig(); if (want('e2e')) await e2e(); if (want('touch')) await touch(); if (want('double')) await double(); })();
