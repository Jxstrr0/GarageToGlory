// pw_gig.js: the v0.3 live gig on a 390x844 phone viewport. Sections META_ONLY=gig|e2e|touch|double|songend|sync|sync2 (default all); each inside `timeout 500`.
//   gig : quickStart + a booked gig → GG.ui.playGig: setlist sheet (slots = setSize, drop/auto-pick, opener/closer hints)
//         → Start → count-in (the numeral never widens the screen) → backing plays on the audio clock → timed in-page taps on
//         lane zones judge Perfect/Good → two-thumb auto notes booked ahead, also with frames 600 ms apart (timer pump) →
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
//   sync (v0.8.3 drum sync): the count-in hats on the band grid, the band honours the count's zero (opts.at), perfect and
//         slightly late taps sound exactly on the band's grid, early ones keep their offset, the audio offset is ignored,
//         auto notes and Auto-kick's kicks are booked on the 16th grid (none from the frame), the Classic toggle = 0.8.2.
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
    await page.evaluate(() => {   // samples the count-in: the numeral pops from 1.35x (was a full-width box, 68 px past the edge)
      const W = document.documentElement.clientWidth, cin = window.__cin = { n: 0, bad: [] };
      const id = setInterval(() => { const m = GG.debug('gigui').mode; if (m !== 'set' && m !== 'count') { clearInterval(id); return; } if (m !== 'count') return;
        cin.n++;
        for (const sc of document.querySelectorAll('.full-body')) if (sc.scrollWidth > sc.clientWidth + 1) cin.bad.push('hscroll ' + sc.scrollWidth);
        const r = document.querySelector('.gig-count').getBoundingClientRect(); if (r.width && (r.right > W + 1 || r.left < -1)) cin.bad.push('count ' + Math.round(r.left) + '..' + Math.round(r.right)); }, 16);
    });
    await tap(page, 'btn-gig-start');
    await page.waitForFunction(() => GG.debug('gigui').mode === 'count', null, { timeout: 5000 });
    c.ok(await page.evaluate(() => GG.state.liveGig && GG.state.liveGig.setlist.length === 4 && GG.state.liveGig.index === 0), 'state.liveGig holds the set');
    await page.waitForFunction(() => GG.debug('gigui').mode === 'play', null, { timeout: 8000 });
    const cin = await page.evaluate(() => window.__cin);
    c.ok(cin.n >= 5 && cin.bad.length === 0, 'count-in layout: the numeral pops without widening the screen ' + JSON.stringify({ n: cin.n, bad: cin.bad.slice(0, 3) }));
    const a0 = await page.evaluate(() => ({ g: GG.debug('gigui'), a: GG.debug('audio') }));
    c.ok(a0.g.audio && a0.g.ctx && a0.a.state === 'running' && a0.a.playing, 'backing plays on a running AudioContext ' + JSON.stringify({ a: a0.a.state, g: a0.g.audio }));
    c.ok(a0.g.songT >= 0 && a0.g.songT < 2 && a0.g.lat >= 0 && a0.g.lat < 0.3, 'song clock started ' + a0.g.songT);
    const clk = await page.evaluate(() => { const h = GG.audio.current(), cx = GG.audio.context(), d = GG.debug('gigui');
      return { diff: (cx.currentTime - d.lat - h.start) - (d.songT - d.D), lat: d.lat, zb: d.zeroBand - h.start, D: d.D }; });
    c.ok(Math.abs(clk.diff) < 0.03 && Math.abs(clk.zb) < 0.001, 'band time (song clock - D) = AudioContext time - output latency - backing start ' + JSON.stringify(clk));
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
    c.ok(au.lead.length > 0 && au.lead.filter(x => x > -0.01).length >= au.lead.length * 0.6 && au.lead.every(x => x < 0.75), 'auto notes (and v0.8.3 count-in hats, up to PRE more before the downbeat) are scheduled ahead on the audio clock (headless clock is bursty) ' + au.lead.map(x => x.toFixed(3)));
    // A GPU-bound phone: frames 600 ms apart while the main thread is free (headless software GL does this under load).
    // Auto notes are booked by a timer, not the frame loop: every one still lands ahead on the audio clock, none skipped.
    const slow = await page.evaluate(async () => {
      const raf0 = window.requestAnimationFrame, d0 = GG.debug('gigui'), n0 = window.__ah.length, t0 = performance.now();
      window.requestAnimationFrame = cb => setTimeout(() => raf0.call(window, cb), 600);
      try { while (window.__ah.length - n0 < 4 && GG.debug('gigui').autoSkipped - d0.autoSkipped < 4 && performance.now() - t0 < 9000) await new Promise(r => setTimeout(r, 30)); }
      finally { window.requestAnimationFrame = raf0; }
      const d1 = GG.debug('gigui');
      return { lead: window.__ah.slice(n0), played: d1.autoPlayed - d0.autoPlayed, skipped: d1.autoSkipped - d0.autoSkipped, mode: d1.mode };
    });
    c.ok(slow.mode === 'play' && slow.played >= 4 && slow.skipped === 0 && slow.lead.length >= 4 && slow.lead.every(x => x > -0.01 && x < 0.35),
      'frames 600 ms apart: auto notes still booked ahead, none skipped ' + JSON.stringify({ played: slow.played, skipped: slow.skipped, lead: slow.lead.map(x => +x.toFixed(3)) }));
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
    const rclk = await page.evaluate(() => { const h = GG.audio.current(), cx = GG.audio.context(), d = GG.debug('gigui');
      return { diff: +((cx.currentTime - d.lat - h.start) - (d.songT - d.D)).toFixed(4), pausedFor: 0.4 }; });
    c.ok(Math.abs(rclk.diff) < 0.03, 'v0.8.3 resume snaps the game clock back onto the band (not the pause length ahead) ' + JSON.stringify(rclk));
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
    if (await page.evaluate(() => GG.debug('ui').screen) === 'van' && await page.locator(tid('btn-van-skip')).isVisible()) await tap(page, 'btn-van-skip');
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
    // v1.0: the per-song save runs at the next idle moment (at most 1 s later), not on the frame the song ends
    await page.waitForFunction(() => { const r = GG.save.read('2'); return r && r.liveGig && r.liveGig.index === 1; }, null, { timeout: 2000 }).catch(() => {});
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
  // the band time of each kick's sound: its ctx time (a `when` outside now + 5 ms .. now + 1 s plays at now + 5 ms) - zeroBand
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
      GG.audio.hit = function (l, w) {   // band time of the sound (v0.8.3; = the 0.8.2 heard song time when D = 0)
        if (l === 'kick') { const d = GG.debug('gigui'), now = GG.audio.context().currentTime, snd = w != null && w > now + 0.005 && w < now + 1.005 ? w : now + 0.005;
          window.__kh.push({ w: w != null, at: snd - d.zeroBand, sp: d.spb }); }
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
    // v0.8.3 drum sync: the tap's kick is booked on the band's grid at t (snapped) or at J (a stalled tap outside the
    // snap window), the second kick the double's spacing after it
    const k0 = last.snap ? n.t : last.at, sp0 = Math.max(n.t2 - n.t, 0.06);
    c.ok(kh.length === 2 && kh[0].w && kh[1].w && Math.abs(kh[0].at - k0) <= 0.003 && Math.abs((kh[1].at - kh[0].at) - sp0) <= 0.003,
      'two kicks, both on the band grid: the tap at t (or J), the double its spacing later ' + JSON.stringify({ t: n.t, t2: n.t2, kh, snap: last.snap, at: last.at }));
    c.ok(last.snap || Math.abs(last.at - n.t) > 0.014, 'a tap inside the snap window snaps ' + JSON.stringify({ at: last.at, t: n.t, snap: last.snap }));
    const pairGap = (kh, tap, x) => kh.length === 2 ? +((kh[1].at - kh[0].at) - (x.t2 - tap.at)).toFixed(3) : null;
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
    c.ok(ke.length === 1 + de.doublesPlayed - dm.doublesPlayed && ke.length >= 1, 'the echo tap plays no kick of its own (tap + second kick only) ' + JSON.stringify({ ke, played: de.doublesPlayed }));
    // Bluetooth headphones calibrated +200 ms: an on-time (to the player) tap still gets a spaced double, never a flam/silence
    await page.evaluate(() => { GG.ui.closeAll(); GG.state.liveGig = null; GG.prefs.set({ audioProfile: 'headphones', drumSync: false }); GG.prefs.setCalib('headphones', { audio: 200 });   // classic timing
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
    await page.evaluate(() => { GG.ui.closeAll(); GG.prefs.setCalib('headphones', { audio: 0 }); GG.prefs.set({ audioProfile: 'speaker', drumSync: true }); });
    c.ok(await page.evaluate(() => window.__hc) > hc0, 'closing the gig cancels hits scheduled ahead (GG.audio.hitCancel)');
    // Auto-kick plays both kicks of every double
    await page.evaluate(() => { GG.ui.closeAll(); GG.state.liveGig = null; GG.prefs.set({ autoKick: true }); window.__kh = []; GG.ui.playGig(GG.state.gig, () => {}); });
    await waitScreen(page, 'gig-set');
    await tap(page, 'btn-gig-start');
    await page.waitForFunction(() => GG.debug('gigui').mode === 'play' && GG.debug('gigui').songT > 3, null, { timeout: 12000 });
    const ak = await page.evaluate(() => ({ d: GG.debug('gigui'), kicks: window.__kh.length, sched: window.__kh.filter(h => h.w).length, kh: window.__kh.map(h => (h.w ? 'S' : 'I') + h.at.toFixed(3)).join(' ') }));
    const plays = ak.d.doublesPlayed; if (process.env.VERBOSE) console.log(ak.kh, plays, ak.d.songT);
    c.ok(plays >= 6 && ak.d.stats.good >= plays, 'auto-kick hits the doubles and plays their second kicks ' + JSON.stringify({ plays, good: ak.d.stats.good }));
    // v0.8.3: Auto-kick's kicks and the second kicks are all booked ahead on the band's 16th grid (none from the frame)
    const offGrid = await page.evaluate(() => window.__kh.filter(h => { const g = h.sp / 4; return Math.abs(h.at - Math.round(h.at / g) * g) > 0.002; }).length);
    c.ok(ak.kicks >= 2 * plays - 1 && ak.sched >= ak.kicks - 1 && offGrid === 0 && ak.d.akN > 0 && ak.d.akSkip === 0,
      'two kicks per auto double, booked on the grid ' + JSON.stringify({ kicks: ak.kicks, plays, scheduled: ak.sched, offGrid, akN: ak.d.akN, akSkip: ak.d.akSkip, kh: ak.kh.slice(0, 200) }));
    await page.evaluate(() => { GG.prefs.set({ autoKick: false }); GG.ui.closeAll(); });
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  await close();
  c.done();
}

// v0.8: a song that plays to its end must never pause the gig, even when the frames are slow (the audio module's
// 'audio:end' carries natural:true; before, a frame over ~0.27 s at the end paused it and resume restarted the song).
async function songend() {
  const c = checker('songend');
  const { page, errors, close } = await open();
  try {
    await page.waitForSelector(tid('btn-new'));
    await page.evaluate(() => { GG.main.quickStart({ seed: 5, slot: '1', openCard: false }); GG.ui.closeAll(); GG.ui.gigAutoplay = false; GG.ui.playGig(GG.state.gig, () => {}); });
    await waitScreen(page, 'gig-set');
    await tap(page, 'btn-gig-start');
    await page.waitForFunction(() => GG.debug('gigui').mode === 'play', null, { timeout: 8000 });
    // The audio clock can finish a song a little before the gig's own clock does (drift, a hiccup): its natural end
    // must not read as an interruption. Deliver one as if the audio had drifted a whole song ahead (the gig at ~2 s).
    await page.waitForFunction(() => GG.debug('gigui').songT > 2, null, { timeout: 10000 });
    const early = await page.evaluate(() => { const h = GG.audio.current(); GG.emit('audio:end', { handle: h, natural: true }); return { paused: GG.debug('gigui').paused, t: GG.debug('gigui').songT }; });
    c.ok(early.paused === false, 'a natural end from an audio clock that ran ahead does not pause the gig ' + JSON.stringify(early));
    await page.evaluate(() => { window.__ends = []; GG.on('audio:end', p => window.__ends.push({ natural: p.natural, paused: GG.debug('gigui').paused })); });
    // Near the song's end, slow the FRAMES to one every 0.6 s while timers keep running (a GPU-bound phone: the audio's
    // own timer ends the song while the gig's last frame is up to 0.6 s old).
    const slowed = await page.evaluate(async () => {
      for (;;) {
        const d = GG.debug('gigui');
        if (d.mode !== 'play' || window.__ends.length) return null;
        if (d.dur && d.songT > d.dur - 1.2) break;
        await new Promise(r => setTimeout(r, 20));
      }
      const raf = window.requestAnimationFrame.bind(window);
      window.__raf = raf; window.requestAnimationFrame = cb => setTimeout(() => raf(cb), 600);
      return GG.debug('gigui').songT;
    });
    c.ok(slowed != null, 'frames slowed to 1 per 0.6 s from songT ' + slowed);
    await page.waitForFunction(() => window.__ends.length > 0, null, { timeout: 45000 });
    const ends = await page.evaluate(() => { if (window.__raf) window.requestAnimationFrame = window.__raf; return window.__ends; });
    c.ok(ends[0].natural === true, 'a song that plays out reports natural:true ' + JSON.stringify(ends));
    await page.waitForFunction(() => ['between', 'results'].includes(GG.debug('gigui').mode), null, { timeout: 15000 });
    const d = await page.evaluate(() => GG.debug('gigui'));
    c.ok(!d.paused && ['between', 'results'].includes(d.mode), 'the gig moves on after the song (no pause, no restart): ' + d.mode + ' paused=' + d.paused);
    c.ok(!errors.length, 'no console errors ' + errors.slice(0, 2));
  } finally { await close(); c.done(); }
}
// v0.8.3 drum sync: every drum sound is booked on the band's clock. Asserts on the scheduled AudioContext times (the `when`
// passed to GG.audio.hit), which are deterministic, rather than on wall-clock audio.
async function sync() {
  const c = checker('sync');
  const { page, errors, close } = await open();
  // taps like tapAt, flagged so the hit recorder knows the sound is the tap's
  const tapS = (li, at) => page.evaluate(async ([li, at]) => {
    const cv = document.querySelector('[data-testid="gig-highway"]'), r = cv.getBoundingClientRect(), lanes = GG.debug('gigui').lanes;
    while (GG.debug('gigui').songT < at - 0.012) await new Promise(res => setTimeout(res, 4));
    while (GG.debug('gigui').songT < at) { /* spin */ }
    const x = r.left + (li + 0.5) * r.width / lanes, y = r.bottom - 36, n0 = window.__h.length, sT = GG.debug('gigui').songT;
    window.__inTap = true;
    try { cv.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y, pointerId: 7 + li, pointerType: 'touch', isPrimary: false, bubbles: true, cancelable: true })); }
    finally { window.__inTap = false; }
    const h = window.__h.slice(n0).find(e => e.tap) || null;
    return { last: GG.debug('gigui').last, h, sT };
  }, [li, at]);
  const next = () => page.waitForFunction(() => { const d = GG.debug('gigui'); return d.mode === 'play' && d.next && d.next.t < d.dur - 1 ? d.next : null; }, null, { timeout: 8000 }).then(h => h.jsonValue());
  const startShow = async () => {
    await page.evaluate(() => { GG.ui.closeAll(); GG.state.liveGig = null; window.__h = []; GG.ui.playGig(GG.state.gig, () => {}); });
    await waitScreen(page, 'gig-set');
    await tap(page, 'btn-gig-start');
    await page.waitForFunction(() => GG.debug('gigui').mode === 'count', null, { timeout: 5000 });
  };
  const ms = x => Math.round(x * 10000) / 10;
  try {
    await page.waitForSelector(tid('btn-new'));
    await page.evaluate(() => {
      GG.prefs.set({ gigDifficulty: 'hard', autoKick: false, lefty: false });
      GG.main.quickStart({ seed: 8303, openCard: false });
      const s = GG.state, E = '................'; s.card = null; s.phase = 'plan';
      const bar = ['x...x...x...x...', '....x.......x...', 'x.x.x.x.x.x.x.x.', 'x...............'];   // chords of 3: two-thumb auto notes
      const song = GG.songs.create(s, { bpm: 120, lanes: 4, arrangement: ['verse', 'chorus', 'verse', 'chorus', 'verse', 'chorus', 'verse', 'chorus', 'verse', 'chorus'],
        sections: { verse: bar, chorus: bar, bridge: [E, E, E, E] } }, 'Sync Test', { quality: 60, polish: 60 });
      s.songs = [song];
      GG.prefs.set({ audioProfile: 'speaker' }); GG.prefs.setCalib('speaker', { audio: 60, visual: 40 });
      window.__h = []; const h0 = GG.audio.hit;
      GG.audio.hit = function (l, w) {
        const now = GG.audio.context().currentTime, d = GG.debug('gigui');
        window.__h.push({ l, w, now, zb: d.zeroBand, tap: !!window.__inTap, snd: w != null && w > now + 0.005 && w < now + 1.005 ? w : now + 0.005 });
        return h0.apply(this, arguments);
      };
      s.gig = GG.gig.makeGig(s, 'legion_63', 'book'); GG.ui.gigAutoplay = false;
      window.__ch = GG.gig.chart(song, { difficulty: 'hard' });
    });
    const ch = await page.evaluate(() => ({ auto: window.__ch.auto.length, spb: window.__ch.spb }));
    c.ok(ch.auto > 0 && Math.abs(ch.spb - 0.5) < 1e-9, '120 BPM song with two-thumb auto notes ' + JSON.stringify(ch));
    await startShow();
    // (1) the count-in: drum sync on, D = latD + K frozen, the game clock D ahead of the band, the light check drives the highway
    const d0 = await dbg(page, 'gigui');
    c.ok(d0.sync === true && d0.K >= 0.030 && d0.K <= 0.060 && Math.abs(d0.D - (d0.latD + d0.K)) < 1e-9 && Math.abs(d0.zero - (d0.zeroBand - d0.D)) < 1e-9 && Math.abs(d0.vis - 0.04) < 1e-9,
      'count-in: sync on, D = latD + K, zero = zeroBand - D, highway + visual 40 ms ' + JSON.stringify({ sync: d0.sync, D: d0.D, K: d0.K, latD: d0.latD, vis: d0.vis }));
    await page.waitForFunction(() => GG.debug('gigui').mode === 'play' && GG.debug('gigui').tBand > 0.3, null, { timeout: 8000 });
    const cnt = await page.evaluate(() => { const d = GG.debug('gigui'), h = GG.audio.current();
      const hats = window.__h.filter(e => e.l === 'hat' && !e.tap && e.snd - e.zb < -0.1).map(e => { const b = Math.round((e.snd - e.zb) / d.spb); return { b, err: e.snd - (e.zb + b * d.spb), ahead: e.w - e.now }; });
      return { start: h.start - d.zeroBand, hats, n: d.hats, skip: d.hatSkip };
    });
    c.ok(Math.abs(cnt.start) < 0.001, 'the band starts on the count-in\'s zero (opts.at honoured) ' + ms(cnt.start) + ' ms');
    c.ok(cnt.hats.length >= 3 && cnt.n === cnt.hats.length && cnt.hats.every(h => h.b >= -4 && h.b <= -1 && Math.abs(h.err) <= 0.002),
      'count-in hats on the band grid (beats -4..-1, +-2 ms) ' + JSON.stringify(cnt.hats.map(h => h.b + ':' + ms(h.err) + 'ms/' + ms(h.ahead))) + ' skip ' + cnt.skip);
    // (2) perfect taps at the note's game time (= the drawn crossing + the 40 ms eye lag the light check measured)
    const per = [];
    for (let k = 0; k < 6; k++) { const n = await next(); const r = await tapS(n.li, n.t); per.push({ n, r }); }
    // (headless taps can fire a few ms past the aim; a tap that really landed > 15 ms off must NOT snap and sounds at its J)
    const rule = ({ n, r }) => { const e = r.last.at - n.t, inWin = e >= -0.015 && e <= 0.015;
      return r.last.snap === inWin && r.h && r.h.w != null && Math.abs(r.h.snd - (r.h.zb + (inWin ? n.t : r.last.at))) <= 0.003; };
    const perOk = per.filter(x => x.r.last && x.r.last.judgement === 'perfect' && rule(x));
    c.ok(perOk.length === 6 && per.filter(x => x.r.last.snap).length >= 5, 'perfect taps: judged perfect, snapped, the drum books exactly on the band grid ' + JSON.stringify(per.map(({ n, r }) => [r.last && r.last.judgement, r.last && r.last.snap, r.h && ms(r.h.snd - (r.h.zb + n.t)), r.last && r.last.disp != null ? +r.last.disp.toFixed(1) : null])));
    // (5) the calibration's audio offset (60 ms) is not subtracted under drum sync
    c.ok(per.every(({ n, r }) => r.last && Math.abs(r.last.at - r.sT) < 0.005), 'audio offset ignored: a tap is judged at the game time it was made ' + JSON.stringify(per.map(({ n, r }) => r.last && ms(r.last.at - r.sT))));
    // (3) 10 ms late: still snapped onto the grid
    const late = [];
    for (let k = 0; k < 4; k++) { const n = await next(); const r = await tapS(n.li, n.t + 0.010); late.push({ n, r }); }
    c.ok(late.every(x => x.r.last && /^(perfect|good)$/.test(x.r.last.judgement) && rule(x)) && late.filter(x => x.r.last.snap).length >= 3,
      'taps 10 ms late snap onto the grid ' + JSON.stringify(late.map(({ n, r }) => [r.last && r.last.judgement, r.last && r.last.snap, r.h && ms(r.h.snd - (r.h.zb + n.t))])));
    // (4) 45 ms early: judged, not snapped, the drum keeps the tap's own offset
    const early = [];
    for (let k = 0; k < 3; k++) { const n = await next(); const r = await tapS(n.li, n.t - 0.045); early.push({ n, r }); }
    c.ok(early.every(({ n, r }) => r.last && /^(perfect|good)$/.test(r.last.judgement) && r.last.snap === false && r.h && Math.abs((r.h.snd - (r.h.zb + n.t)) - (r.last.at - n.t)) <= 0.004),
      'early taps sound early by their own offset ' + JSON.stringify(early.map(({ n, r }) => [r.last && r.last.judgement, r.last && r.last.snap, r.last && ms(r.last.at - n.t), r.h && ms(r.h.snd - (r.h.zb + n.t))])));
    // (6) two-thumb auto notes: booked ahead, on the 16th grid of the band
    await page.waitForTimeout(600);
    const au = await page.evaluate(() => { const d = GG.debug('gigui'), g = d.spb / 4;
      const a = window.__h.filter(e => !e.tap && e.w != null && e.w - e.zb > -0.05);
      return { n: a.length, played: d.autoPlayed, off: a.filter(e => { const x = e.w - e.zb; return Math.abs(x - Math.round(x / g) * g) > 0.001; }).length, late: a.filter(e => !(e.w - e.now > 0.005)).length,
        frame: window.__h.filter(e => !e.tap && e.w == null).length };
    });
    c.ok(au.n > 0 && au.n === au.played && au.off === 0 && au.late === 0 && au.frame === 0, 'auto notes booked ahead on the band\'s 16th grid, none from the frame ' + JSON.stringify(au));
    // (7) Auto-kick (a new show: the session's assist): every kick booked ahead on the grid, never from the frame
    await page.evaluate(() => GG.prefs.set({ autoKick: true }));
    await startShow();
    await page.waitForFunction(() => GG.debug('gigui').mode === 'play' && GG.debug('gigui').tBand > 4, null, { timeout: 12000 });
    const ak = await page.evaluate(() => { const d = GG.debug('gigui'), g = d.spb / 4;
      const k = window.__h.filter(e => e.l === 'kick' && !e.tap);
      return { akN: d.akN, akSkip: d.akSkip, dbl: d.doublesPlayed, kicks: k.length, ahead: k.filter(e => e.w != null && e.w - e.now > 0.005).length,
        off: k.filter(e => { const x = e.snd - e.zb; return Math.abs(x - Math.round(x / g) * g) > 0.001; }).length };
    });
    c.ok(ak.akN > 0 && ak.akSkip <= 1 && ak.kicks === ak.akN + ak.dbl && ak.ahead >= Math.ceil(0.9 * ak.kicks) && ak.off <= ak.kicks - ak.ahead,
      'Auto-kick: every kick booked ahead on the band grid by the pump (none from the frame) ' + JSON.stringify(ak));
    // (8) Drum sync off = classic (0.8.2): judged minus the audio offset, the highway + (visual - audio), taps sound now
    await page.evaluate(() => GG.prefs.set({ autoKick: false, drumSync: false }));
    await startShow();
    const d8 = await dbg(page, 'gigui');
    c.ok(d8.sync === false && d8.D === 0 && d8.zero === d8.zeroBand && Math.abs(d8.vis - (0.04 - 0.06)) < 1e-9, 'classic: sync off, D 0, zero = zeroBand, highway + visual - audio ' + JSON.stringify({ sync: d8.sync, D: d8.D, vis: d8.vis }));
    const n8 = await next(), r8 = await tapS(n8.li, n8.t + 0.060);
    c.ok(r8.last && Math.abs(r8.last.at - (r8.sT - 0.06)) < 0.005 && Math.abs(r8.last.at - n8.t) < 0.03 && r8.h && r8.h.w == null,
      'classic: a tap 60 ms late is judged on time (audio offset subtracted) and plays now ' + JSON.stringify({ at: r8.last && ms(r8.last.at - n8.t), off: r8.last && ms(r8.last.at - r8.sT), w: r8.h && r8.h.w }));
    await page.evaluate(() => { GG.ui.closeAll(); GG.prefs.set({ drumSync: true }); GG.prefs.setCalib('speaker', { audio: 0, visual: 0 }); });
    c.ok(await page.evaluate(() => GG.prefs.get().drumSync === true), 'prefs restored');
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  await close();
  c.done();
}
(async () => { if (want('gig')) await gig(); if (want('e2e')) await e2e(); if (want('touch')) await touch(); if (want('double')) await double(); if (want('songend')) await songend(); if (want('sync')) await sync(); if (want('sync2')) await sync2(); })();

// v0.8.3 drum sync, the paths around it: an 80 BPM count-in (a hat for every numeral), a measured-zero light check,
// Restart after a mid-song pause, the between screen after a suspended context, a band that starts on a suspended
// context, the same-lane booking order, the dispatch p90 saved at the song's end, and a pause while Resume is waking.
async function sync2() {
  const c = checker('sync2');
  const { page, errors, close } = await open();
  const tapS = (li, at) => page.evaluate(async ([li, at]) => {
    const cv = document.querySelector('[data-testid="gig-highway"]'), r = cv.getBoundingClientRect(), lanes = GG.debug('gigui').lanes;
    while (GG.debug('gigui').songT < at - 0.012) await new Promise(res => setTimeout(res, 4));
    while (GG.debug('gigui').songT < at) { /* spin */ }
    const x = r.left + (li + 0.5) * r.width / lanes, y = r.bottom - 36, n0 = window.__h.length;
    window.__inTap = true;
    try { cv.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y, pointerId: 7 + li, pointerType: 'touch', isPrimary: false, bubbles: true, cancelable: true })); }
    finally { window.__inTap = false; }
    return { last: GG.debug('gigui').last, h: window.__h.slice(n0).find(e => e.tap) || null };
  }, [li, at]);
  const next = () => page.waitForFunction(() => { const d = GG.debug('gigui'); return d.mode === 'play' && d.next && d.next.t < d.dur - 1.5 ? d.next : null; }, null, { timeout: 8000 }).then(h => h.jsonValue());
  const pick = d => ({ mode: d.mode, sync: d.sync, clockOk: d.clockOk, D: d.D, paused: d.paused, waking: d.waking });
  try {
    await page.waitForSelector(tid('btn-new'));
    await page.evaluate(() => {
      GG.prefs.set({ gigDifficulty: 'hard', autoKick: false, lefty: false, drumSync: true });
      GG.main.quickStart({ seed: 8304, openCard: false });
      const s = GG.state, E = '................'; s.card = null; s.phase = 'plan';
      const bar = ['x...x...x...x...', '....x.......x...', 'x.x.x.x.x.x.x.x.', E];
      const mk = t => GG.songs.create(s, { bpm: 80, lanes: 4, arrangement: ['verse', 'chorus'], sections: { verse: bar, chorus: bar, bridge: [E, E, E, E] } }, t, { quality: 60, polish: 60 });
      s.songs = [mk('Slow One'), mk('Slow Two')];
      GG.prefs.set({ audioProfile: 'speaker' }); GG.prefs.setCalib('speaker', { audio: 0, visual: 0, at: 1 });   // a light check that measured 0
      window.__h = []; const h0 = GG.audio.hit;
      GG.audio.hit = function (l, w) {
        const now = GG.audio.context().currentTime, d = GG.debug('gigui');
        window.__h.push({ l, w, now, zb: d.zeroBand, tap: !!window.__inTap, snd: w != null && w > now + 0.005 && w < now + 1.005 ? w : now + 0.005 });
        return h0.apply(this, arguments);
      };
      s.gig = GG.gig.makeGig(s, 'legion_63', 'book'); GG.ui.gigAutoplay = false;
      GG.ui.closeAll(); GG.state.liveGig = null; GG.ui.playGig(s.gig, () => {});
    });
    await waitScreen(page, 'gig-set');
    await page.evaluate(() => { window.__nums = [];
      new MutationObserver(() => { const e = document.querySelector('.gig-count.show'); if (e && window.__nums[window.__nums.length - 1] !== e.textContent) window.__nums.push(e.textContent); })
        .observe(document.body, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['class'] }); });
    await tap(page, 'btn-gig-start');
    await page.waitForFunction(() => GG.debug('gigui').mode === 'count', null, { timeout: 5000 });
    const d0 = await dbg(page, 'gigui');
    c.ok(d0.sync === true && Math.abs(d0.spb - 0.75) < 1e-9 && d0.vis === 0 && d0.songs >= 2, '80 BPM, sync on, a measured light check of 0 draws at 0 (not the 30 ms guess) ' + JSON.stringify({ spb: d0.spb, vis: d0.vis, songs: d0.songs }));
    await page.waitForFunction(() => GG.debug('gigui').mode === 'play' && GG.debug('gigui').tBand > 0.2, null, { timeout: 8000 });
    const cnt = await page.evaluate(() => { const d = GG.debug('gigui'); return { hats: d.hats, skip: d.hatSkip, nums: window.__nums.slice(),
      grid: window.__h.filter(e => e.l === 'hat' && !e.tap && e.snd - e.zb < -0.1).map(e => +((e.snd - e.zb) / d.spb).toFixed(3)) }; });
    // (headless frames can stall past a numeral: the ones seen count down from 4 at most, each with its hat)
    c.ok(cnt.hats === 4 && cnt.skip === 0 && cnt.nums.length >= 1 && cnt.nums.every((x, i) => +x >= 1 && +x <= 4 && (i === 0 || +x < +cnt.nums[i - 1])) && cnt.grid.join() === '-4,-3,-2,-1', '80 BPM count-in: 4 hats on the grid, a hat under every numeral ' + JSON.stringify(cnt));
    // Pause mid-song (the context suspends), then Restart this song: drum sync must stay on
    await page.waitForTimeout(500);
    await tap(page, 'btn-gig-pause');
    await page.waitForTimeout(1500);
    const ps = await page.evaluate(() => ({ st: GG.audio.context().state, d: GG.debug('gigui') }));
    await tap(page, 'btn-gig-restart');
    await page.waitForFunction(() => ['count', 'play'].includes(GG.debug('gigui').mode), null, { timeout: 5000 });
    const dr = await dbg(page, 'gigui');
    c.ok(ps.st === 'suspended' && dr.sync === true && dr.clockOk === true && dr.D > 0, 'Restart this song after a pause keeps drum sync ' + JSON.stringify({ paused: ps.st, restart: pick(dr) }));
    // same-lane booking order: a second tap whose snapped time would land before the first's booking goes after it
    const n1 = await next();
    const ord = await page.evaluate(async ([li, at]) => {
      const cv = document.querySelector('[data-testid="gig-highway"]'), r = cv.getBoundingClientRect(), lanes = GG.debug('gigui').lanes;
      while (GG.debug('gigui').songT < at) await new Promise(res => setTimeout(res, 2));
      const x = r.left + (li + 0.5) * r.width / lanes, y = r.bottom - 36, n0 = window.__h.length, snap0 = GG.prefs.syncSnap;
      const ev = () => cv.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y, pointerId: 7 + li, pointerType: 'touch', isPrimary: false, bubbles: true, cancelable: true }));
      window.__inTap = true;
      try { ev(); GG.prefs.syncSnap = J => J - 0.05; ev(); } finally { GG.prefs.syncSnap = snap0; window.__inTap = false; }
      return window.__h.slice(n0).filter(e => e.tap).map(e => e.w);
    }, [n1.li, n1.t]);
    c.ok(ord.length === 2 && ord[0] != null && ord[1] > ord[0], 'same-lane taps book in time order (the lane clamp) ' + JSON.stringify(ord));
    // touch taps feed the dispatch p90; the song's end saves it (the synthetic taps dispatch at once: it moves toward the 10 ms floor)
    const disp0 = await page.evaluate(() => GG.prefs.get().syncDisp);
    for (let k = 0; k < 10; k++) { const n = await next(); await tapS(n.li, n.t); }
    const dn = await dbg(page, 'gigui');
    await page.waitForFunction(() => GG.debug('gigui').mode === 'between', null, { timeout: 45000 }).catch(async e => { throw new Error('no between: ' + JSON.stringify(await dbg(page, 'gigui')).slice(0, 600)); });
    const de = await page.evaluate(() => ({ d: GG.debug('gigui'), disp: GG.prefs.get().syncDisp }));
    c.ok(dn.dispN >= 8 && de.d.dispP90 != null && de.d.dispP90 < disp0 && de.disp === de.d.dispP90 && de.disp >= 10, 'the song end blends the dispatch p90 into syncDisp ' + JSON.stringify({ n: dn.dispN, p90: de.d.dispP90, from: disp0, to: de.disp }));
    // the between screen: the context suspended a while (the phone locked), then back: the next song still syncs
    await page.evaluate(() => GG.audio.suspend());
    await page.waitForTimeout(1500);
    await page.evaluate(() => GG.audio.resume());
    await page.waitForTimeout(300);
    await tap(page, 'btn-gig-next');
    await page.waitForFunction(() => GG.debug('gigui').mode === 'count', null, { timeout: 5000 });
    const d2 = await dbg(page, 'gigui');
    c.ok(d2.sync === true && d2.clockOk === true, 'song 2 after a suspended between screen keeps drum sync ' + JSON.stringify(pick(d2)));
    // the band starts on a suspended context (count-in): the pump moves both zeros onto its real start
    await page.evaluate(() => GG.audio.context().suspend());
    await page.waitForFunction(() => GG.debug('gigui').audio, null, { timeout: 6000 });
    await page.waitForTimeout(300);
    await page.evaluate(() => GG.audio.context().resume());
    await page.waitForTimeout(600);
    const za = await page.evaluate(() => { const d = GG.debug('gigui'), h = GG.audio.current(); return { dz: h.start - d.zeroBand, dg: d.zeroBand - d.D - d.zero, mode: d.mode }; });
    c.ok(Math.abs(za.dz) < 0.001 && Math.abs(za.dg) < 1e-9, 'a band started on a suspended context: zeroBand = h.start, zero = zeroBand - D ' + JSON.stringify(za));
    // pause while Resume waits for the context, then the page hides: stays paused, overlay back, song frozen
    await page.waitForFunction(() => GG.debug('gigui').mode === 'play' && GG.debug('gigui').tBand > 0.5, null, { timeout: 8000 });
    await tap(page, 'btn-gig-pause');
    await page.waitForTimeout(200);
    await page.evaluate(() => { const c = GG.audio.context(); c.resume = () => new Promise(() => {}); });
    await tap(page, 'btn-gig-resume');
    const w0 = await dbg(page, 'gigui');
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
    const t0 = (await dbg(page, 'gigui')).songT;
    await page.waitForTimeout(1300);
    const w1 = await page.evaluate(() => ({ d: GG.debug('gigui'), over: !document.querySelector('[data-testid="gig-paused"]').hidden }));
    c.ok(w0.waking === true && w1.d.paused === true && !w1.d.waking && w1.over && Math.abs(w1.d.songT - t0) < 1e-6, 'hidden while Resume wakes: stays paused, the overlay is back, the song frozen ' + JSON.stringify({ w0: pick(w0), w1: pick(w1.d), over: w1.over, t0, t1: w1.d.songT }));
    await page.evaluate(() => { delete GG.audio.context().resume; delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForTimeout(300);
    await tap(page, 'btn-gig-resume');
    await page.waitForFunction(() => ['count', 'play'].includes(GG.debug('gigui').mode) && !GG.debug('gigui').paused, null, { timeout: 5000 });
    const w2 = await dbg(page, 'gigui');
    c.ok(w2.sync === true && !w2.paused, 'Resume after that restarts the song in sync ' + JSON.stringify(pick(w2)));
    // a profile with no light check draws with the 30 ms guess
    await page.evaluate(() => { GG.ui.closeAll(); GG.prefs.set({ audioProfile: 'headphones' }); GG.state.liveGig = null; GG.ui.playGig(GG.state.gig, () => {}); });
    await waitScreen(page, 'gig-set');
    await tap(page, 'btn-gig-start');
    await page.waitForFunction(() => GG.debug('gigui').mode === 'count', null, { timeout: 5000 });
    const dh = await dbg(page, 'gigui');
    c.ok(Math.abs(dh.vis - 0.03) < 1e-9, 'an unmeasured profile draws with the 30 ms guess ' + dh.vis);
    await page.evaluate(() => { GG.ui.closeAll(); GG.prefs.set({ audioProfile: 'speaker' }); GG.prefs.setCalib('speaker', { audio: 0, visual: 0 }); });
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  await close();
  c.done();
}
