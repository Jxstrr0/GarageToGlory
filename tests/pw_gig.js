// pw_gig.js: the v0.3 live gig on a 390x844 phone viewport. Sections META_ONLY=gig|e2e|touch|double|songend|sync|sync2|bridge|seat|chord|feel|kit|swing (default all); each inside `timeout 500`.
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
//   bridge (v1.0.1 smart bridge): a touch on the seam between two lanes hits both on a 2-note chord (two drums, booked per
//         lane), only the nearer lane when just one is due (no stray), one lane from a lane's centre; lefty mirrors the
//         columns (the right seam hits the chord, the left seam is a single stray); a 6-lane song bridges toms + ride.
//   sync (v0.8.3 drum sync): the count-in hats on the band grid, the band honours the count's zero (opts.at), perfect and
//         slightly late taps sound exactly on the band's grid, early ones keep their offset, the audio offset is ignored,
//         auto notes and Auto-kick's kicks are booked on the 16th grid (none from the frame), the Classic toggle = 0.8.2.
//   feel (v1.2 Soundcheck, Lane F, handoff F4 / F5): every tap carries a vel (A.tapVel: a Perfect downbeat ~ 1, a Good
//         offbeat ~ 0.86 x 0.9), the count-in hats 0.88 (A.TAP_AUTO), and the Perfect downbeat renders louder than the Good
//         offbeat (same drum at each vel: Lane I's offline velocity hit when renderOffline takes spec.vel, else the graph A.hit
//         builds on the pre-rendered path: the kit's hit -> a gain at A.velGain(vel)); the band plays with the gig's feel
//         (po.gig: plan.stats.gig, every |dt| <= 15 ms) while the 'step' events stay on the 16th grid; a string seat's taps
//         carry vel to A.pluck / strum / lead; the Classic switch = no vel, no plan; no console errors.
// Run: node build.js && timeout 500 node tests/pw_gig.js
const path = require('path');
const { open, checker, shotName } = require('./_pw');
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
(async () => { if (want('gig')) await gig(); if (want('e2e')) await e2e(); if (want('touch')) await touch(); if (want('double')) await double(); if (want('songend')) await songend(); if (want('sync')) await sync(); if (want('sync2')) await sync2(); if (want('bridge')) await bridge(); if (want('seat')) await seatGig(); if (want('chord')) await chordGig(); if (want('feel')) await feelGig(); if (want('kit')) await kitGig(); if (want('swing')) await swingGig(); })();

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

// v1.0.1 smart bridge (owner popup 2026-10-02): one touch on the seam between two lanes (within 1/6 lane of the boundary)
// hits BOTH only when both have a note due; otherwise the nearer lane alone. Probes dispatch one pointerdown at a column
// position x (in lane widths) at the note's time and diff the session stats + the drums booked.
async function bridge() {
  const c = checker('bridge');
  const { page, errors, close } = await open();
  const E = '................';
  const probe = (x, at) => page.evaluate(async ([x, at]) => {
    const cv = document.querySelector('[data-testid="gig-highway"]'), r = cv.getBoundingClientRect(), lanes = GG.debug('gigui').lanes;
    while (GG.debug('gigui').songT < at - 0.012) await new Promise(res => setTimeout(res, 4));
    while (GG.debug('gigui').songT < at) { /* spin */ }
    const d0 = GG.debug('gigui'), n0 = window.__h.length;
    cv.dispatchEvent(new PointerEvent('pointerdown', { clientX: r.left + x * r.width / lanes, clientY: r.bottom - 36, pointerId: 9, pointerType: 'touch', isPrimary: false, bubbles: true, cancelable: true }));
    const d1 = GG.debug('gigui'), a = d0.stats, b = d1.stats;
    return { hits: b.perfect + b.good - a.perfect - a.good, stray: b.stray - a.stray, drums: window.__h.slice(n0).map(h => h.l), bridged: d1.bridgeN - d0.bridgeN, disp: d1.dispN - d0.dispN };
  }, [x, at]);
  // the next moment (t > songT + 0.6) whose notes are exactly these lanes
  const next = lanes => page.waitForFunction(want => {
    const d = GG.debug('gigui'); if (d.mode !== 'play' || !d.soon) return null;
    for (const n of d.soon) {
      if (n.t < d.songT + 0.6 || n.t > d.dur - 2) continue;
      const at = d.soon.filter(m => Math.abs(m.t - n.t) < 0.002).map(m => m.li).sort().join();
      if (at === want) return n;
    }
    return null;
  }, lanes.join(), { timeout: 8000 }).then(h => h.jsonValue());
  const show = async (lanes, bar, lefty) => {
    await page.evaluate(([lanes, bar, lefty]) => {
      GG.ui.closeAll(); const s = GG.state; s.liveGig = null; GG.prefs.set({ lefty }); s.gear = Object.assign({}, s.gear, { lanes });
      const song = GG.songs.create(s, { bpm: 90, lanes, arrangement: ['verse', 'chorus', 'verse', 'chorus', 'verse', 'chorus', 'verse', 'chorus'],
        sections: { verse: bar, chorus: bar, bridge: bar.map(() => '................') } }, 'Seam Test ' + lanes, { quality: 60, polish: 60 });
      s.songs = [song]; s.gig = GG.gig.makeGig(s, 'legion_63', 'book'); window.__h = [];
      GG.ui.playGig(s.gig, () => {});
    }, [lanes, bar, lefty]);
    await waitScreen(page, 'gig-set');
    await tap(page, 'btn-gig-start');
    await page.waitForFunction(() => GG.debug('gigui').mode === 'play', null, { timeout: 8000 });
  };
  try {
    await page.waitForSelector(tid('btn-new'));
    await page.evaluate(() => {
      GG.prefs.set({ gigDifficulty: 'hard', autoKick: false, lefty: false });
      GG.main.quickStart({ seed: 1010, openCard: false });
      const s = GG.state; s.card = null; s.phase = 'plan'; GG.ui.gigAutoplay = false;
      window.__h = []; const h0 = GG.audio.hit;
      GG.audio.hit = function (l) { window.__h.push({ l }); return h0.apply(this, arguments); };
    });
    // kick + snare chords on 1 and 3, the snare alone on 2 and 4 (4 lanes: kick | snare | hat | cymbal)
    const bar4 = ['x.......x.......', 'x...x...x...x...', E, E];
    await show(4, bar4, false);
    c.ok((await dbg(page, 'gigui')).lanes === 4, '4-lane song on the highway');
    let n = await next([0, 1]), p = await probe(1.0, n.t);
    c.ok(p.hits === 2 && p.stray === 0 && p.bridged === 1 && p.drums.sort().join() === 'kick,snare', 'seam touch on a kick+snare chord hits both ' + JSON.stringify(p));
    c.ok(p.disp <= 1, 'one dispatch sample per touch ' + p.disp);
    n = await next([0, 1]); p = await probe(0.9, n.t);
    c.ok(p.hits === 2 && p.stray === 0 && p.bridged === 1, 'kick side of the seam (0.9) bridges too ' + JSON.stringify(p));
    n = await next([1]); p = await probe(1.9, n.t);
    c.ok(p.hits === 1 && p.stray === 0 && p.bridged === 0 && p.drums.join() === 'snare', 'seam touch with only the snare due: snare alone, no stray ' + JSON.stringify(p));
    n = await next([1]); p = await probe(1.1, n.t);
    c.ok(p.hits === 1 && p.stray === 0 && p.bridged === 0 && p.drums.join() === 'snare', 'kick|snare seam, only the snare due: snare alone ' + JSON.stringify(p));
    n = await next([0, 1]); p = await probe(0.5, n.t);
    c.ok(p.hits === 1 && p.stray === 0 && p.bridged === 0 && p.drums.join() === 'kick', 'centre touch on a chord hits its own lane only ' + JSON.stringify(p));
    n = await next([0, 1]); p = await probe(1.25, n.t);
    c.ok(p.hits === 1 && p.bridged === 0 && p.drums.join() === 'snare', 'outside the seam third (1.25): one lane ' + JSON.stringify(p));
    n = await next([1]); p = await probe(3.0, n.t);
    c.ok(p.hits === 0 && p.stray === 1 && p.bridged === 0 && p.drums.length === 1, 'hat|cymbal seam with nothing due: one stray, as before ' + JSON.stringify(p));
    // keys never bridge
    n = await next([0, 1]);
    const k = await page.evaluate(async at => { while (GG.debug('gigui').songT < at) await new Promise(r => setTimeout(r, 2)); const a = GG.debug('gigui').stats;
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', bubbles: true, cancelable: true })); const b = GG.debug('gigui').stats; return b.perfect + b.good - a.perfect - a.good; }, n.t);
    c.ok(k === 1, 'a key hits one lane ' + k);
    // lefty: kick in column 3, snare in column 2
    await show(4, bar4, true);
    n = await next([0, 1]); p = await probe(3.0, n.t);
    c.ok(p.hits === 2 && p.stray === 0 && p.bridged === 1 && p.drums.sort().join() === 'kick,snare', 'lefty: the mirrored seam (columns 2|3) hits the chord ' + JSON.stringify(p));
    n = await next([1]); p = await probe(2.1, n.t);
    c.ok(p.hits === 1 && p.stray === 0 && p.bridged === 0 && p.drums.join() === 'snare', 'lefty: snare alone due, the snare|hat seam hits the snare ' + JSON.stringify(p));
    n = await next([0, 1]); p = await probe(1.0, n.t);
    c.ok(p.hits === 0 && p.stray === 1 && p.bridged === 0, 'lefty: the unmirrored seam (hat|cymbal) is a single stray ' + JSON.stringify(p));
    // 6 lanes: toms + ride chords (lanes 4, 5), the right-most seam
    await show(6, [E, '....x.......x...', E, E, 'x.......x.......', 'x.......x.......'], false);
    c.ok((await dbg(page, 'gigui')).lanes === 6, '6-lane song on the highway');
    n = await next([4, 5]); p = await probe(5.05, n.t);
    c.ok(p.hits === 2 && p.stray === 0 && p.bridged === 1 && p.drums.sort().join() === 'ride,toms', '6 lanes: toms|ride seam hits both ' + JSON.stringify(p));
    n = await next([1]); p = await probe(1.95, n.t);
    c.ok(p.hits === 1 && p.stray === 0 && p.bridged === 0, '6 lanes: snare|hat seam, snare alone due: one hit ' + JSON.stringify(p));
    await page.evaluate(() => { GG.ui.closeAll(); GG.prefs.set({ lefty: false }); });
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  await close();
  c.done();
}

// v1.1 "Seats" (plan_contract_1.1 §4.5): a bass gig and a lead gig (Hail Damage, doom tempo so the parts ring) on Hard.
// The highway draws string lanes (GG.career.seatLanes) with hold tails; a timed press on a hold head judges it, keeping
// the finger down to the end rings it out ('gig:hold' ring), lifting early gates the voice (GG.audio.release on the tap's
// handle; held < 1, no miss, the combo stays); taps play your voice (pluck on bass, lead / strum on the lead seat), never a
// drum; the band plays the drums (GG.audio.play drums: true, your kinds muted); the rest autoplays to a results screen
// with the holds line; layout audit; no console errors. Screenshots tests/.cache/gig_seat_<seat>.png.
async function seatGig() {
  const c = checker('seat');
  const { page, errors, close } = await open();
  const press = (li, at, id) => page.evaluate(async ([li, at, id]) => {
    const cv = document.querySelector('[data-testid="gig-highway"]'), r = cv.getBoundingClientRect(), lanes = GG.debug('gigui').lanes;
    while (GG.debug('gigui').songT < at - 0.012) await new Promise(res => setTimeout(res, 4));
    while (GG.debug('gigui').songT < at) { /* spin */ }
    cv.dispatchEvent(new PointerEvent('pointerdown', { clientX: r.left + (li + 0.5) * r.width / lanes, clientY: r.bottom - 36, pointerId: id, pointerType: 'touch', isPrimary: false, bubbles: true, cancelable: true }));
    return GG.debug('gigui').last;
  }, [li, at, id]);
  const lift = (at, id) => page.evaluate(async ([at, id]) => {
    while (GG.debug('gigui').songT < at) await new Promise(res => setTimeout(res, 4));
    document.querySelector('[data-testid="gig-highway"]').dispatchEvent(new PointerEvent('pointerup', { pointerId: id, pointerType: 'touch', bubbles: true, cancelable: true }));
    return GG.debug('gigui');
  }, [at, id]);
  // the next judged hold (a plain hold, not a run, long enough to tell a ring from a lift)
  const nextHold = (minLen) => page.waitForFunction(m => {
    const d = GG.debug('gigui'); if (d.mode !== 'play' || !d.soon) return null;
    for (const n of d.soon) if (n.hold && !n.run && !n.chord && n.len >= m && n.t > d.songT + 0.5 && n.t + n.len < d.dur - 1) return n;
    return null;
  }, minLen, { timeout: 15000 }).then(h => h.jsonValue());
  const shows = [['bass', 'pluck'], ['lead', null]];
  try {
    await page.waitForSelector(tid('btn-new'));
    for (const [seat, voice] of shows) {
      await page.evaluate(seat => {
        GG.ui.closeAll();
        GG.prefs.set({ gigDifficulty: 'hard', autoKick: false, lefty: false, noFail: false });
        GG.main.quickStart({ seed: 2024, bandId: 'hail_damage', seat, openCard: false });
        const s = GG.state; s.card = null; s.phase = 'plan'; GG.ui.gigAutoplay = false;
        for (let i = 0; i < 2; i++) GG.songs.jam(s, GG.RNG(70 + i));
        s.songs.forEach(x => { x.pattern.bpm = 90; });   // doom: the chords ring (holds)
        const A = GG.audio, v = window.__v = { calls: [], rel: [], hits: [], holds: [], play: null };
        ['pluck', 'strum', 'lead'].forEach(k => { const f = A[k]; A[k] = function (midi, when, o) { const h = f.apply(this, arguments) || { spy: k, n: v.calls.length }; v.calls.push({ k, midi, hold: !!(o && o.hold) }); return h; }; });
        const r0 = A.release; A.release = function (h, w) { v.rel.push(h && h.spy ? h.spy : 'voice'); return r0.apply(this, arguments); };
        const h0 = A.hit; A.hit = function (l) { v.hits.push(l); return h0.apply(this, arguments); };
        const p0 = A.play; A.play = function (pat, o) { v.play = { drums: o.drums, seat: o.seat, mute: o.mute }; return p0.apply(this, arguments); };
        GG.on('gig:hold', p => v.holds.push(p)); v.judge = []; GG.on('gig:judge', p => v.judge.push({ lane: p.lane, judgement: p.judgement, t: GG.debug('gigui').songT }));
        s.gig = GG.gig.makeGig(s, 'legion_63', 'book');
        window.__done = null;
        GG.ui.playGig(s.gig, r => { window.__done = r; });
      }, seat);
      await waitScreen(page, 'gig-set');
      c.ok((await audit(page)).length === 0, seat + ': setlist layout ' + (await audit(page)).join('; '));
      await tap(page, 'btn-gig-start');
      await page.waitForFunction(() => GG.debug('gigui').mode === 'play', null, { timeout: 8000 });
      const d0 = await dbg(page, 'gigui');
      c.ok(d0.seat === seat && d0.lanes === 4 && d0.holds > 0, seat + ': string highway (' + d0.lanes + ' lanes, ' + d0.holds + ' holds)');
      const pl = await page.evaluate(() => window.__v.play);
      c.ok(pl && pl.drums === true && pl.seat === seat && Array.isArray(pl.mute) && pl.mute.length > 0, seat + ': the band plays the drums, your kinds muted ' + JSON.stringify(pl));
      // 1) hold to the end: rings
      let n = await nextHold(0.5);
      const v0 = await page.evaluate(() => window.__v.calls.length), st0 = (await dbg(page, 'gigui')).stats;
      let r = await press(n.li, n.t, 21);
      c.ok(r && /^(perfect|good)$/.test(r.judgement), seat + ': the hold head judges like a tap ' + (r && r.judgement));
      await page.waitForFunction(at => GG.debug('gigui').songT > at, n.t + 0.15);
      const dh = await dbg(page, 'gigui');
      c.ok(dh.holding.includes(n.li) && dh.tailN > 0, seat + ': held (the tail draws from the line) ' + JSON.stringify({ holding: dh.holding, tails: dh.tailN }));
      await page.screenshot({ path: path.join(CACHE, shotName('gig_seat_' + seat + '.png')) });
      let d1 = await lift(n.t + n.len + 0.12, 21);
      let hs = await page.evaluate(() => window.__v.holds.slice());
      c.ok(hs.length >= 1 && hs[hs.length - 1].ring === true && hs[hs.length - 1].held >= 0.9, seat + ': held to the end rings out ' + JSON.stringify(hs.slice(-1)));
      const vc = await page.evaluate(n0 => window.__v.calls.slice(n0), v0);
      c.ok(vc.length >= 1 && vc.some(x => x.hold) && (!voice || vc.every(x => x.k === voice)), seat + ': the tap plays your voice (hold) ' + JSON.stringify(vc.slice(0, 3)));
      // 2) lift early: gated, no miss, combo kept
      n = await nextHold(0.8);
      const rel0 = await page.evaluate(() => window.__v.rel.length);
      r = await press(n.li, n.t, 22);
      const j0 = await page.evaluate(() => window.__v.judge.length);
      d1 = await lift(n.t + n.len * 0.4, 22);
      await page.waitForFunction(at => GG.debug('gigui').songT > at, n.t + n.len + 0.4);
      // misses on the hold's lane while it is held (a lift-caused miss lands at the lift or at the end). Neighbours on the same
      // lane are excluded: the note before the head is only called a miss ~0.2 s after its time (just after this press), and a
      // part rings into its next onset, so the next note is due right at the end and called a miss ~0.2 s later.
      const jm = await page.evaluate(([j0, lane, from, end]) => window.__v.judge.slice(j0).filter(x => x.lane === lane && x.judgement === 'miss' && x.t > from && !(x.t > end)).length, [j0, 'str' + n.li, n.t + 0.25, n.t + n.len + 0.12]);
      hs = await page.evaluate(() => window.__v.holds.slice());
      const last = hs[hs.length - 1];
      c.ok(last && last.ring === false && last.held > 0.15 && last.held < 0.8, seat + ': lifting early gates the note (held < 1, no ring) ' + JSON.stringify(last));
      c.ok(r && /^(perfect|good)$/.test(r.judgement) && jm === 0, seat + ': an early lift is no miss (the hold stays a hit, no miss on its lane) ' + JSON.stringify({ head: r && r.judgement, miss: jm, n: { t: n.t, len: n.len, li: n.li }, j: jm ? await page.evaluate(([j0, lane]) => window.__v.judge.slice(j0).filter(x => x.lane === lane), [j0, 'str' + n.li]) : null }));
      c.ok(await page.evaluate(n0 => window.__v.rel.length > n0, rel0), seat + ': the voice is released on the lift');
      c.ok(!d1.holding.includes(n.li), seat + ': the lane stops holding');
      const drums = await page.evaluate(() => window.__v.hits.filter(l => l !== 'hat').length);
      c.ok(drums === 0, seat + ': your taps never play a drum (the count-in hats only) ' + drums);
      c.ok(st0 && (await dbg(page, 'gigui')).stats.stray === st0.stray, seat + ': no stray from holding');
      // the rest autoplays: results with the holds line
      await page.evaluate(() => { GG.ui.gigAutoplay = { accuracy: 1, jitterMs: 0 }; });
      await page.waitForFunction(() => GG.debug('ui').screen === 'gig-results', null, { timeout: 30000 });
      const res = await page.evaluate(() => document.querySelector('.gigres-songs').textContent);
      c.ok(/holds rang out/.test(res), seat + ': results show the holds ' + res.slice(0, 120));
      c.ok((await audit(page)).length === 0, seat + ': results layout ' + (await audit(page)).join('; '));
      await tap(page, 'btn-gig-done');
      await page.waitForFunction(() => window.__done, null, { timeout: 5000 });
      const dn = await page.evaluate(() => ({ seat: window.__done.songResults[0].seat, holds: window.__done.songResults.some(x => x.holds > 0) }));
      c.ok(dn.seat === seat && dn.holds, seat + ': song results carry the seat + holds ' + JSON.stringify(dn));
      await page.evaluate(() => { GG.ui.gigAutoplay = false; });
    }
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  await close();
  c.done();
}

// META_ONLY=chord (v1.1 review): held string notes keep sounding when they should. (1) Gravel Kings rhythm Hard: a held
// 2-lane chord in both tap orders is ONE sound (the root, power voicing), kept under the chord's root lane: no release
// before the lift, the session still holding. (2) Grid Road Ramblers rhythm Normal: the next same-lane hold tapped 30 ms
// early by the other thumb while the first is still down, then the first thumb lifts: the new hold stays held and rings.
// (3) Hail Damage rhythm Easy: a chorus hold whose same-voice partner (the gtr2 ring) shares its instant plays its whole length.
async function chordGig() {
  const c = checker('chord');
  const { page, errors, close } = await open();
  const start = (bandId, seat, diff, seed) => page.evaluate(([bandId, seat, diff, seed]) => {
    GG.ui.closeAll();
    GG.prefs.set({ gigDifficulty: diff, autoKick: false, lefty: false, noFail: false });
    GG.main.quickStart({ seed, bandId, seat, openCard: false });
    const s = GG.state; s.card = null; s.phase = 'plan'; GG.ui.gigAutoplay = false;
    const A = GG.audio, v = window.__v = { calls: [], rel: [], holds: [] };
    ['pluck', 'strum', 'lead'].forEach(k => { const f = A[k]; A[k] = function (midi, when, o) { const h = f.apply(this, arguments); v.calls.push({ k, midi, hold: !!(o && o.hold), len: o && o.len, h }); return h; }; });
    const r0 = A.release; A.release = function (h) { v.rel.push({ midi: h && h.midi, songT: GG.debug('gigui').songT }); return r0.apply(this, arguments); };
    GG.on('gig:hold', p => v.holds.push(Object.assign({ at: GG.debug('gigui').songT }, p)));
    s.gig = GG.gig.makeGig(s, 'legion_63', 'book');
    window.__done = null;
    GG.ui.playGig(s.gig, r => { window.__done = r; });
  }, [bandId, seat, diff, seed]);
  const go = async () => {
    await waitScreen(page, 'gig-set');
    await tap(page, 'btn-gig-start');
    await page.waitForFunction(() => GG.debug('gigui').mode === 'play', null, { timeout: 8000 });
  };
  const upAll = ids => page.evaluate(ids => ids.forEach(id => document.dispatchEvent(new PointerEvent('pointerup', { pointerId: id, pointerType: 'touch', bubbles: true }))), ids);
  const stop = () => page.evaluate(() => { GG.ui.gigAutoplay = { accuracy: 1, jitterMs: 0 }; });
  try {
    await page.waitForSelector(tid('btn-new'));
    // (1) chords, both tap orders
    await start('gravel_kings', 'rhythm', 'hard', 2024); await go();
    for (const order of [[0, 1], [1, 0]]) {
      const n = await page.waitForFunction(() => {
        const d = GG.debug('gigui'); if (d.mode !== 'play' || !d.soon) return null;
        for (const n of d.soon) if (n.hold && n.chord && n.len >= 0.6 && n.t > d.songT + 0.6) return n;
        return null;
      }, null, { timeout: 30000 }).then(h => h.jsonValue());
      const c0 = await page.evaluate(() => window.__v.calls.length);
      const res = await page.evaluate(async ([n, order]) => {
        const cv = document.querySelector('[data-testid="gig-highway"]'), r = cv.getBoundingClientRect(), lanes = GG.debug('gigui').lanes;
        const down = (li, id) => cv.dispatchEvent(new PointerEvent('pointerdown', { clientX: r.left + (li + 0.5) * r.width / lanes, clientY: r.bottom - 36, pointerId: id, pointerType: 'touch', isPrimary: false, bubbles: true, cancelable: true }));
        while (GG.debug('gigui').songT < n.t - 0.025) await new Promise(res => setTimeout(res, 3));
        down(n.chord[order[0]], 31);
        while (GG.debug('gigui').songT < n.t) { /* spin */ }
        down(n.chord[order[1]], 32);
        const j = GG.debug('gigui').last;
        await new Promise(res => setTimeout(res, 250));
        return { judgement: j && j.judgement, holding: GG.debug('gigui').holding };
      }, [n, order]);
      await page.waitForFunction(at => GG.debug('gigui').songT > at, n.t + n.len - 0.05);
      const early = await page.evaluate(n => window.__v.rel.filter(x => x.songT > n.t - 0.01 && x.songT < n.t + n.len - 0.06).length, n);
      await upAll([31, 32]);
      const calls = await page.evaluate(c0 => window.__v.calls.slice(c0).filter(x => x.h).map(x => ({ midi: x.midi, hold: x.hold, cut: x.h.cut })), c0);
      const tag = 'chord ' + JSON.stringify(n.chord) + ' order ' + order.join('');
      c.ok(/^(perfect|good)$/.test(res.judgement) && res.holding.includes(n.li), tag + ': judged, held under its root lane ' + JSON.stringify(res));
      c.ok(calls.length === 1 && calls[0].midi === n.midi && calls[0].hold, tag + ': one sound, the root (' + n.midi + ') ' + JSON.stringify(calls));
      c.ok(early === 0 && calls.every(x => x.cut == null || x.cut >= 0), tag + ': not released before the lift (' + early + ')');
    }
    await stop();
    // (2) legato: the next same-lane hold by the other thumb
    await start('grid_road_ramblers', 'rhythm', 'normal', 4242); await go();
    const pair = await page.waitForFunction(() => {
      const d = GG.debug('gigui'); if (d.mode !== 'play' || !d.soon) return null;
      const s = d.soon;
      for (let i = 0; i < s.length; i++) { const a = s[i]; if (!a.hold || a.chord || a.run || a.t < d.songT + 0.5) continue;
        const b = s.slice(i + 1).find(x => x.li === a.li); if (b && b.hold && !b.chord && !b.run && b.len >= 0.4 && Math.abs(b.t - (a.t + a.len)) < 0.01) return [a, b]; }
      return null;
    }, null, { timeout: 60000, polling: 20 }).then(h => h.jsonValue());
    const lg = await page.evaluate(async ([a, b]) => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const cv = document.querySelector('[data-testid="gig-highway"]'), rc = cv.getBoundingClientRect(), lanes = GG.debug('gigui').lanes;
      const down = (li, id) => cv.dispatchEvent(new PointerEvent('pointerdown', { clientX: rc.left + (li + 0.5) * rc.width / lanes, clientY: rc.bottom - 36, pointerId: id, pointerType: 'touch', isPrimary: false, bubbles: true, cancelable: true }));
      const up = id => document.dispatchEvent(new PointerEvent('pointerup', { pointerId: id, pointerType: 'touch', bubbles: true }));
      const waitT = async at => { while (GG.debug('gigui').songT < at - 0.012) await sleep(3); while (GG.debug('gigui').songT < at) { } };
      const h0 = window.__v.holds.length;
      await waitT(a.t); down(a.li, 61);
      await waitT(b.t - 0.03); down(b.li, 62); const jb = GG.debug('gigui').last.judgement;
      up(61);
      await sleep(120);
      const holding = GG.debug('gigui').holding;
      await waitT(b.t + b.len + 0.08); up(62);
      return { jb, holding, holds: window.__v.holds.slice(h0) };
    }, pair);
    const hb = lg.holds[lg.holds.length - 1];
    c.ok(/^(perfect|good)$/.test(lg.jb) && lg.holding.includes(pair[1].li), 'legato: the new hold stays held after the first thumb lifts ' + JSON.stringify({ jb: lg.jb, holding: lg.holding }));
    c.ok(lg.holds.length >= 2 && hb.ring === true && hb.held >= 0.9 && !lg.holds.some(x => x.held === 0), 'legato: it rings out (no held-0 hold) ' + JSON.stringify(lg.holds));
    await stop();
    // (3) a same-voice partner at the head's instant: the tap plays its whole length
    await start('hail_damage', 'rhythm', 'easy', 31); await go();
    const n3 = await page.waitForFunction(() => {
      const d = GG.debug('gigui'); if (d.mode !== 'play' || !d.soon) return null;
      for (const n of d.soon) if (n.hold && !n.chord && n.len >= 0.5 && n.t > d.songT + 0.5) return n;
      return null;
    }, null, { timeout: 40000 }).then(h => h.jsonValue());
    const r3 = await page.evaluate(async (n) => {
      const cv = document.querySelector('[data-testid="gig-highway"]'), rc = cv.getBoundingClientRect(), lanes = GG.debug('gigui').lanes;
      while (GG.debug('gigui').songT < n.t - 0.012) await new Promise(res => setTimeout(res, 3));
      while (GG.debug('gigui').songT < n.t) { }
      const before = window.__v.calls.length;
      cv.dispatchEvent(new PointerEvent('pointerdown', { clientX: rc.left + (n.li + 0.5) * rc.width / lanes, clientY: rc.bottom - 36, pointerId: 41, pointerType: 'touch', isPrimary: false, bubbles: true, cancelable: true }));
      const j = GG.debug('gigui').last, tc = window.__v.calls[before];
      while (GG.debug('gigui').songT < n.t + n.len + 0.1) await new Promise(res => setTimeout(res, 5));
      document.dispatchEvent(new PointerEvent('pointerup', { pointerId: 41, pointerType: 'touch', bubbles: true }));
      return { j: j && j.judgement, want: tc && +(+tc.len).toFixed(3), got: tc && tc.h ? +(tc.h.end - tc.h.t).toFixed(3) : null };
    }, n3);
    c.ok(/^(perfect|good)$/.test(r3.j) && r3.got != null && r3.got >= r3.want - 0.01, 'partner: an on-time chorus hold plays its whole length ' + JSON.stringify(r3));
    await stop();
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  await close();
  c.done();
}

// META_ONLY=feel (v1.2 Soundcheck, Lane F): tap velocity in the gig (see the header).
async function feelGig() {
  const c = checker('feel');
  const { page, errors, close } = await open();
  const tapF = (li, at) => page.evaluate(async ([li, at]) => {
    const cv = document.querySelector('[data-testid="gig-highway"]'), r = cv.getBoundingClientRect(), lanes = GG.debug('gigui').lanes;
    while (GG.debug('gigui').songT < at - 0.012) await new Promise(res => setTimeout(res, 4));
    while (GG.debug('gigui').songT < at) { /* spin */ }
    const n0 = window.__h.length;
    window.__inTap = true;
    try { cv.dispatchEvent(new PointerEvent('pointerdown', { clientX: r.left + (li + 0.5) * r.width / lanes, clientY: r.bottom - 36, pointerId: 7 + li, pointerType: 'touch', isPrimary: false, bubbles: true, cancelable: true })); }
    finally { window.__inTap = false; }
    return { last: GG.debug('gigui').last, h: window.__h.slice(n0).find(e => e.tap) || null, feel: GG.debug('gigui').feel };
  }, [li, at]);
  // the next unjudged note in lane li on one of `steps` (16ths in the bar), far enough ahead to aim at
  const nextOn = (li, steps) => page.waitForFunction(([li, steps]) => {
    const d = GG.debug('gigui'); if (d.mode !== 'play' || !d.soon) return null;
    for (const n of d.soon) { const st = Math.round(n.t / (d.spb / 4)) % 16; if (n.li === li && steps.includes(st) && n.t > d.songT + 0.4 && n.t < d.dur - 1) return Object.assign({ step: st }, n); }
    return null;
  }, [li, steps], { timeout: 12000 }).then(h => h.jsonValue());
  const startShow = async () => {
    await page.evaluate(() => { GG.ui.closeAll(); GG.state.liveGig = null; window.__h = []; window.__steps = []; GG.ui.playGig(GG.state.gig, () => {}); });
    await waitScreen(page, 'gig-set');
    await tap(page, 'btn-gig-start');
    await page.waitForFunction(() => GG.debug('gigui').mode === 'play' && GG.debug('gigui').tBand > 0.2, null, { timeout: 8000 });
  };
  const db = x => Math.round(20 * Math.log10(x) * 100) / 100;
  try {
    await page.waitForSelector(tid('btn-new'));
    await page.evaluate(() => {
      GG.audio.classic(false);
      GG.prefs.set({ gigDifficulty: 'hard', autoKick: false, lefty: false, drumSync: true });
      GG.main.quickStart({ seed: 1212, openCard: false });
      const s = GG.state, E = '................'; s.card = null; s.phase = 'plan';
      const bar = ['x.......x.......', '....x.......x...', '..x...x...x...x.', E];   // kick downbeats, snare backbeat, offbeat 8th hats
      const song = GG.songs.create(s, { bpm: 120, lanes: 4, arrangement: ['verse', 'chorus', 'verse', 'chorus', 'verse', 'chorus', 'verse', 'chorus'],
        sections: { verse: bar, chorus: bar, bridge: [E, E, E, E] } }, 'Feel Test', { quality: 60, polish: 60 });
      s.songs = [song];
      GG.prefs.set({ audioProfile: 'speaker' }); GG.prefs.setCalib('speaker', { audio: 0, visual: 0 });
      window.__h = []; window.__steps = []; const h0 = GG.audio.hit;
      GG.audio.hit = function (l, w, o) {
        window.__h.push({ l, w, tap: !!window.__inTap, vel: o && o.vel != null ? o.vel : null, o: o === undefined ? 'none' : 'obj' });
        return h0.apply(this, arguments);
      };
      GG.on('audio:step', p => { if (window.__steps.length < 400) window.__steps.push(p.time); });
      s.gig = GG.gig.makeGig(s, 'legion_63', 'book'); GG.ui.gigAutoplay = false;
    });
    await startShow();
    // (1) the count-in hats: the game's own strokes at A.TAP_AUTO.hat
    const cnt = await page.evaluate(() => window.__h.filter(e => e.l === 'hat' && !e.tap).map(e => e.vel));
    c.ok(cnt.length >= 3 && cnt.every(v => v === 0.88), 'count-in hats carry vel 0.88 ' + JSON.stringify(cnt));
    // (2) the band: the gig's feel (po.gig) applied on copies; the steps stay on the 16th grid
    await page.waitForFunction(() => window.__steps.length >= 12, null, { timeout: 8000 });
    const band = await page.evaluate(() => {
      const h = GG.audio.current(), st = h && h.plan ? h.plan.stats : null, by = h && h.feel ? h.feel.byKind : null;
      const g = 60 / h.timeline.bpm / 4, off = window.__steps.filter(t => Math.abs((t - h.start) / g - Math.round((t - h.start) / g)) * g > 1e-6).length;
      return { gig: st && st.gig, maxAbsDt: st && st.maxAbsDt, kick: by && by.kick.who, bass: by && by.bass.who, steps: window.__steps.length, off, dbg: GG.debug('gigui').feel.gig };
    });
    c.ok(band.gig === true && band.dbg === true && band.maxAbsDt > 0 && band.maxAbsDt <= 0.015 + 1e-6 && band.kick === 'player' && band.bass && band.bass !== 'player',
      'the band plays with the gig feel (|dt| <= 15 ms; your kit = your taps) ' + JSON.stringify(band));
    c.ok(band.steps >= 12 && band.off === 0, 'audio:step events stay on the 16th grid (the gig clock is sacred) ' + JSON.stringify({ steps: band.steps, off: band.off }));
    // (3) a Perfect downbeat and a Good offbeat
    const win = await page.evaluate(() => GG.gig.windows(GG.state));
    const nk = await nextOn(0, [0]), rp = await tapF(nk.li, nk.t);
    const nh = await nextOn(2, [2, 6, 10, 14]), lateBy = (win.perfect + win.good) / 2, rg = await tapF(nh.li, nh.t + lateBy);
    const want = await page.evaluate(([a, b]) => [GG.audio.tapVel({ judgement: 'perfect', step: a, lane: 'kick', rnd: 0.5 }), GG.audio.tapVel({ judgement: 'good', step: b, lane: 'hat', rnd: 0.5 })], [nk.step, nh.step]);
    const vp = rp.h && rp.h.vel, vg = rg.h && rg.h.vel;
    c.ok(rp.last && rp.last.judgement === 'perfect' && vp != null && Math.abs(vp - want[0]) <= 0.0301 && vp >= 0.97, 'a Perfect downbeat kick carries vel ~ 1 ' + JSON.stringify({ j: rp.last && rp.last.judgement, vel: vp, want: want[0], step: nk.step }));
    c.ok(rg.last && rg.last.judgement === 'good' && vg != null && Math.abs(vg - want[1]) <= 0.0301, 'a Good offbeat hat carries vel ~ 0.86 x 0.9 ' + JSON.stringify({ j: rg.last && rg.last.judgement, vel: vg, want: want[1], step: nh.step, lateMs: Math.round(lateBy * 1000) }));
    c.ok(rg.feel && rg.feel.velN >= 2 && rg.feel.last && Math.abs(rg.feel.last.vel - vg) < 1e-9 && rg.feel.last.judgement === 'good', 'debug(gigui).feel: the last tap ' + JSON.stringify(rg.feel && rg.feel.last));
    // (4) rendered level: the same drum at the two taps' velocities (and vs the 1.1 level, VEL_REF)
    const lv = await page.evaluate(async ([vp, vg]) => {
      const A = GG.audio, genre = GG.state.genre, lane = 'snare';
      const meas = b => { let pk = 0, s = 0, n = 0; for (let ch = 0; ch < b.numberOfChannels; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > pk) pk = a; s += d[i] * d[i]; n++; } } return { peak: pk, rms: Math.sqrt(s / n) }; };
      const r1 = await A.renderOffline({ genre, lane, vel: 1, quality: 2, hit: 0 }), r2 = await A.renderOffline({ genre, lane, vel: 0.5, quality: 2, hit: 0 });
      let how, lvl;
      if (Math.abs(r1.peak - r2.peak) > 1e-6) { how = 'renderOffline(spec.vel)'; lvl = async v => meas((await A.renderOffline({ genre, lane, vel: v, quality: 2, hit: 0 })).buffer); }
      else {   // A.hit's pre-rendered path on this branch: the kit's hit -> a gain at A.velGain(vel)
        how = 'pre x velGain'; const buf = await A.prerenderHit({ genre, lane, quality: 2 });
        lvl = async v => { const oc = new OfflineAudioContext(1, buf.length, buf.sampleRate), s = oc.createBufferSource(), g = oc.createGain();
          s.buffer = buf; g.gain.value = v == null ? 1 : A.velGain(v); s.connect(g); g.connect(oc.destination); s.start(0); return meas(await oc.startRendering()); };
      }
      return { how, p: await lvl(vp), g: await lvl(vg), ref: await lvl(GG.contracts.VEL_REF) };
    }, [vp, vg]);
    c.ok(lv.p.rms > lv.g.rms * 1.2 && lv.p.peak > lv.g.peak && lv.p.rms >= lv.ref.rms && lv.g.rms <= lv.ref.rms,
      'the Perfect downbeat renders louder than the Good offbeat (' + lv.how + '): ' + db(lv.p.rms / lv.g.rms) + ' dB rms; vs the 1.1 level ' + db(lv.p.rms / lv.ref.rms) + ' / ' + db(lv.g.rms / lv.ref.rms) + ' dB');
    console.log('feel numbers: perfect downbeat vel ' + vp + ', good offbeat vel ' + vg + ' (' + Math.round(lateBy * 1000) + ' ms late); ' + lv.how + ': '
      + db(lv.p.rms / lv.g.rms) + ' dB rms, vs 1.1 ' + db(lv.p.rms / lv.ref.rms) + ' / ' + db(lv.g.rms / lv.ref.rms) + ' dB; band maxAbsDt ' + Math.round(band.maxAbsDt * 1e4) / 10 + ' ms, steps ' + band.steps);
    // (5) the Classic switch: no vel, no plan (the 1.1 calls)
    await page.evaluate(() => { GG.ui.closeAll(); GG.audio.classic(true); });
    await startShow();
    const nc = await nextOn(0, [0]), rc = await tapF(nc.li, nc.t);
    const cl = await page.evaluate(() => { const h = GG.audio.current(); return { plan: !!(h && h.plan), feel: !!(h && h.feel), hats: window.__h.filter(e => e.l === 'hat' && !e.tap).map(e => e.o) }; });
    c.ok(rc.h && rc.h.o === 'none' && cl.hats.length >= 3 && cl.hats.every(o => o === 'none') && !cl.plan && !cl.feel, 'Classic: taps and the count-in call A.hit without o, the band has no plan ' + JSON.stringify({ tap: rc.h && rc.h.o, cl }));
    await page.evaluate(() => { GG.ui.closeAll(); GG.audio.classic(false); });
    // (6) a string seat: your taps carry vel to A.pluck / strum / lead
    await page.evaluate(() => {
      GG.prefs.set({ gigDifficulty: 'hard', autoKick: false, lefty: false, noFail: false });
      GG.main.quickStart({ seed: 2024, bandId: 'hail_damage', seat: 'bass', openCard: false });
      const s = GG.state; s.card = null; s.phase = 'plan'; GG.ui.gigAutoplay = false;
      for (let i = 0; i < 2; i++) GG.songs.jam(s, GG.RNG(70 + i));
      const A = GG.audio, v = window.__sv = [];
      ['pluck', 'strum', 'lead'].forEach(k => { const f = A[k]; A[k] = function (midi, when, o) { v.push({ k, vel: o && o.vel != null ? o.vel : null, tap: !!window.__inTap }); return f.apply(this, arguments); }; });
      s.gig = GG.gig.makeGig(s, 'legion_63', 'book');
    });
    await startShow();
    const ns = await page.waitForFunction(() => { const d = GG.debug('gigui'); if (d.mode !== 'play' || !d.soon) return null; for (const n of d.soon) if (n.t > d.songT + 0.4 && n.t < d.dur - 1) return n; return null; }, null, { timeout: 12000 }).then(h => h.jsonValue());
    const rs = await tapF(ns.li, ns.t);
    const sv = await page.evaluate(() => window.__sv.filter(x => x.tap));
    c.ok(rs.last && /^(perfect|good|fill)$/.test(rs.last.judgement) && sv.length >= 1 && sv.every(x => x.vel != null && x.vel >= 0.45 && x.vel <= 1), 'bass seat: the tap\'s note carries vel ' + JSON.stringify({ j: rs.last && rs.last.judgement, sv }));
    await page.evaluate(() => GG.ui.closeAll());
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  await close();
  c.done();
}

// META_ONLY=kit (v1.2 Lane I, handoff F17.3): the TMKD "Vortex" sampled kit in a metal gig on the arena kit (tier 3), drum
// seat. The kit decodes after the unlock (never mid-song); your kick / snare taps play its samples (one buffer source each,
// round robins in order), no tap is dropped, and every tap sounds exactly at the time the gig booked it (the drum-sync
// booking is unchanged). Taps only take the new path with a vel (F3.7): until Lane F's A.tapVel is merged the section adds
// { vel: 0.85 } to the gig's A.hit calls itself (logged), so the sampled path is what is measured either way.
async function kitGig() {
  const c = checker('kit');
  const { page, errors, close } = await open();
  try {
    await page.waitForSelector(tid('btn-new'));
    const setup = await page.evaluate(() => {
      GG.prefs.set({ gigDifficulty: 'hard', autoKick: false, lefty: false, noFail: true });
      GG.main.quickStart({ seed: 1702, openCard: false });
      const s = GG.state, E = '................'; s.card = null; s.phase = 'plan';
      s.gear.quality = 3;
      const bar = ['x...x...x...x...', '....x.......x...', E, E];
      const song = GG.songs.create(s, { bpm: 120, lanes: 4, arrangement: ['verse', 'chorus', 'verse', 'chorus', 'verse', 'chorus'],
        sections: { verse: bar, chorus: bar, bridge: [E, E, E, E] } }, 'Kit Test', { quality: 60, polish: 60 });
      s.songs = [song];
      const stub = GG.audio.tapVel({ judgement: 'perfect', step: 0, lane: 'kick' }) === undefined;
      window.__k = []; const h0 = GG.audio.hit;
      GG.audio.hit = function (l, w, o) {
        if (stub && !o) o = { vel: 0.85 };   // (Lane F wires A.tapVel into 55's playTap; until then the test passes the vel)
        const r = h0.call(this, l, w, o), k = GG.debug('audio').kit;
        window.__k.push({ l, w, now: GG.audio.context().currentTime, last: k.last });
        return r;
      };
      s.gig = GG.gig.makeGig(s, 'legion_63', 'book'); GG.ui.gigAutoplay = false;
      return { genre: s.genre, tier: s.gear.quality, kit: !!GG.audio.sampleKit(s.genre, 3), stub };
    });
    c.ok(setup.genre === 'metal' && setup.tier === 3 && setup.kit, 'metal career on the arena kit: the sampled kit applies ' + JSON.stringify(setup));
    if (setup.stub) console.log('  kit: A.tapVel is the stage-0 stub (Lane F not merged): the test adds vel 0.85 to the gig\'s taps');
    await page.mouse.click(200, 400);   // the unlock
    await page.evaluate(() => GG.audio.unlock());
    await page.waitForFunction(() => GG.debug('audio').kit.ready === true, null, { timeout: 20000 });
    const k0 = await page.evaluate(() => GG.debug('audio').kit);
    c.ok(k0.id === 'tmkd_vortex' && k0.n === 25 && k0.err === null && k0.onset <= 1 && k0.bytes > 1e6 && k0.bytes < 6e6,
      'the kit decoded after the unlock: 25 clips, onset <= 1 ms, under the 6 MB cap ' + JSON.stringify({ n: k0.n, onset: k0.onset, bytes: k0.bytes, ms: k0.ms }));
    // v1.2 review: a velocity tap longer than the tap cap (the arena crash: ~1.95 s vs the 0.9 s cap) has a decay ramp queued
    // on its slot; the next tap of the lane 0.25 s later must still choke it in ~6 ms (level near 0 by +20 ms), not let it ring
    // on until the hard stop at +50 ms.
    const ch = await page.evaluate(async () => {
      const A = GG.audio, c = A.context(), wait = ms => new Promise(r => setTimeout(r, ms));
      for (let i = 0; i < 150 && !GG.debug('audio').pre.first; i++) await wait(100);
      const t1 = c.currentTime + 0.2, t2 = t1 + 0.25;
      A.hit('cymbal', t1, { vel: 0.8 }); const g = A._tapGain('cymbal'), last = GG.debug('audio').kit.last;
      A.hit('cymbal', t2, { vel: 0.8 });
      while (c.currentTime < t2 - 0.03) await wait(4);
      const v0 = g ? g.gain.value : null;
      while (c.currentTime < t2 + 0.02) await wait(4);
      return { first: GG.debug('audio').pre.first, last, v0: v0 == null ? null : +v0.toFixed(4), v: g ? +g.gain.value.toFixed(4) : null, at: +((c.currentTime - t2) * 1000).toFixed(1) };
    });
    c.ok(ch.first && ch.last && ch.last.lane === 'cymbal' && !ch.last.kit && ch.v0 > 0.2 && ch.v < 0.05 * ch.v0,
      'a velocity crash tap is choked by the next one in ~6 ms (slot level near 0 by +20 ms) ' + JSON.stringify(ch));
    await page.evaluate(() => { GG.ui.closeAll(); GG.state.liveGig = null; GG.ui.playGig(GG.state.gig, () => {}); });
    await waitScreen(page, 'gig-set');
    await tap(page, 'btn-gig-start');
    await page.waitForFunction(() => GG.debug('gigui').mode === 'play', null, { timeout: 8000 });
    const next = () => page.waitForFunction(() => { const d = GG.debug('gigui'); return d.mode === 'play' && d.next && d.next.t < d.dur - 1 ? d.next : null; }, null, { timeout: 8000 }).then(h => h.jsonValue());
    const used0 = k0.used, n0 = await page.evaluate(() => window.__k.length);
    for (let i = 0; i < 12; i++) { const n = await next(); await tapAt(page, n.li, n.t); }
    await page.waitForTimeout(300);
    const r = await page.evaluate(n0 => { const k = GG.debug('audio').kit, v = GG.audio.voiceStats(); return { used: k.used, taps: window.__k.slice(n0), drops: v.tapDrops }; }, n0);
    const mine = r.taps.filter(x => x.l === 'kick' || x.l === 'snare'), viaKit = mine.filter(x => x.last && x.last.kit && x.last.lane === x.l);
    const gain = (r.used.kick - used0.kick) + (r.used.snare - used0.snare);
    c.ok(mine.length >= 10 && viaKit.length === mine.length && gain >= mine.length, 'your kick / snare taps play the samples ' + JSON.stringify({ taps: mine.length, kit: viaKit.length, used: gain }));
    const rr = mine.filter(x => x.l === 'snare').map(x => x.last.rr);
    c.ok(rr.every((v, i) => i === 0 || v === (rr[i - 1] + 1) % 5), 'snare round robins in order, no repeats ' + JSON.stringify(rr));
    const off = mine.map(x => x.w != null && x.w > x.now + 0.005 && x.w < x.now + 1 ? Math.abs(x.last.t - x.w) : Math.abs(x.last.t - (x.now + 0.005)));
    c.ok(off.every(d => d < 1e-6), 'every tap sounds exactly when the gig booked it (booking unchanged) max ' + Math.max(...off));
    c.ok(r.drops === 0, 'tap drops 0');
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'kit threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  await close();
  c.done();
}

// META_ONLY=swing (v1.3 "Songwriter", Lane A, plan_contract_1.3 §4.6): a Feel 4 song (a full triplet shuffle) on the drum
// seat with a bar-4 fill: the chart's off-beat notes sit at songs.swingBeat(grid) x spb and the band's timeline plays the
// same drums at the same times (its swing = 4); perfect taps on swung notes are judged Perfect and the drum books exactly
// at zeroBand + t (+-3 ms, drum sync); 10 ms late still snaps; two-thumb auto notes book ahead on their swung times (none
// from the frame); a perfect autoplay gig = S, 100 %. Then a rock rhythm-seat show on a swung song with Scratch: a tapped
// Scratch note plays your strum as a dead strum (A.strum o.dead), the perfect autoplay = 100 %; no console errors.
async function swingGig() {
  const c = checker('swing');
  const { page, errors, close } = await open();
  const tapS = (li, at) => page.evaluate(async ([li, at]) => {
    const cv = document.querySelector('[data-testid="gig-highway"]'), r = cv.getBoundingClientRect(), lanes = GG.debug('gigui').lanes;
    while (GG.debug('gigui').songT < at - 0.012) await new Promise(res => setTimeout(res, 4));
    while (GG.debug('gigui').songT < at) { /* spin */ }
    const x = r.left + (li + 0.5) * r.width / lanes, y = r.bottom - 36, n0 = (window.__h || []).length;
    window.__inTap = true;
    try { cv.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y, pointerId: 7 + li, pointerType: 'touch', isPrimary: false, bubbles: true, cancelable: true })); }
    finally { window.__inTap = false; }
    cv.dispatchEvent(new PointerEvent('pointerup', { pointerId: 7 + li, pointerType: 'touch', bubbles: true, cancelable: true }));
    return { last: GG.debug('gigui').last, h: (window.__h || []).slice(n0).find(e => e.tap) || null };
  }, [li, at]);
  // the next unjudged swung note (off the straight 16th grid), far enough ahead to aim at
  const nextSwung = () => page.waitForFunction(() => {
    const d = GG.debug('gigui'); if (d.mode !== 'play' || !d.soon) return null;
    for (const n of d.soon) { const q = n.t / (d.spb / 4); if (Math.abs(q - Math.round(q)) > 0.05 && n.t > d.songT + 0.4 && n.t < d.dur - 1) return n; }
    return null;
  }, null, { timeout: 12000 }).then(h => h.jsonValue());
  const startShow = async () => {
    await page.evaluate(() => { GG.ui.closeAll(); GG.state.liveGig = null; window.__h = []; GG.ui.playGig(GG.state.gig, () => {}); });
    await waitScreen(page, 'gig-set');
    await tap(page, 'btn-gig-start');
    await page.waitForFunction(() => GG.debug('gigui').mode === 'play' && GG.debug('gigui').tBand > 0.3, null, { timeout: 8000 });
  };
  const perfectGig = () => page.evaluate(() => new Promise(res => {
    GG.ui.closeAll(); const s = GG.state; s.liveGig = null; s.gig = GG.gig.makeGig(s, 'legion_63', 'book'); GG.ui.gigAutoplay = { accuracy: 1, jitterMs: 0 };
    GG.ui.playGig(s.gig, r => { GG.ui.gigAutoplay = false; res({ grade: r.grade, acc: r.accuracy, n: r.songResults.length, miss: r.songResults.reduce((t, x) => t + (x.miss || 0), 0) }); });
    const iv = setInterval(() => { const b = document.querySelector('[data-testid="btn-gig-done"]'); if (b) { clearInterval(iv); b.click(); } }, 20);
  }));
  const ms = x => Math.round(x * 10000) / 10;
  try {
    await page.waitForSelector(tid('btn-new'));
    await page.evaluate(() => {
      GG.audio.classic(false);
      GG.prefs.set({ gigDifficulty: 'hard', autoKick: false, lefty: false, drumSync: true, noFail: true });
      GG.main.quickStart({ seed: 8313, openCard: false });
      const s = GG.state, E = '................'; s.card = null; s.phase = 'plan';
      const bar = ['x..x..x.x..x....', '....x.......x...', 'x.x.x.x.x.x.x.x.', 'x...............'];   // off-beat kicks, 8th hats (swung)
      const fill = ['x...x...x.......', '....x...x.x.xxxx', 'x.x.x.x.........', E];
      const song = GG.songs.create(s, { bpm: 110, lanes: 4, swing: 4, arrangement: ['verse', 'chorus', 'verse', 'chorus'],
        sections: { verse: bar, chorus: bar, bridge: [E, E, E, E] }, fillBars: { chorus: fill } }, 'Swing Test', { quality: 60, polish: 60 });
      s.songs = [song];
      GG.prefs.set({ audioProfile: 'speaker' }); GG.prefs.setCalib('speaker', { audio: 60, visual: 40 });
      window.__h = []; const h0 = GG.audio.hit;
      GG.audio.hit = function (l, w) {
        const now = GG.audio.context().currentTime, d = GG.debug('gigui');
        window.__h.push({ l, w, now, zb: d.zeroBand, tap: !!window.__inTap, snd: w != null && w > now + 0.005 && w < now + 1.005 ? w : now + 0.005 });
        return h0.apply(this, arguments);
      };
      s.gig = GG.gig.makeGig(s, 'legion_63', 'book'); GG.ui.gigAutoplay = false;
      window.__song = song; window.__ch = GG.gig.chart(song, { difficulty: 'hard' });
    });
    // (1) the chart: swung off-beats at swingBeat(grid) x spb, the fields kept on the song
    const ch = await page.evaluate(() => {
      const ch = window.__ch, s = window.__song, all = ch.notes.concat(ch.auto), g = n => n.entry * 16 + n.bar * 4 + n.step / 4;
      return { swing: s.pattern.swing, fill: !!(s.pattern.fillBars && s.pattern.fillBars.chorus), n: all.length, spb: ch.spb,
        bad: all.filter(n => Math.abs(n.t - GG.songs.swingBeat(g(n), 4) * ch.spb) > 1e-9).length, swung: all.filter(n => g(n) % 1).length };
    });
    c.ok(ch.swing === 4 && ch.fill && ch.n > 100 && ch.bad === 0 && ch.swung > 30, 'chart: every note at swingBeat(grid) x spb, off-beats swung ' + JSON.stringify(ch));
    await startShow();
    // (2) the band plays the same drums at the same times (its timeline swing = 4)
    const band = await page.evaluate(() => {
      const h = GG.audio.current(), tl = h && h.timeline, ch = window.__ch, spb = ch.spb;
      // (until Lane S's toNotes brings the bar-4 fills into charts, the chorus fill bars are compared on the band side only)
      const tn = GG.songs.toNotes(window.__song), cnt = bar => tn.filter(n => n.section === 'chorus' && n.bar === bar).length, fillsIn = cnt(3) !== cnt(0);
      const keep = (sec, bar) => fillsIn || !(sec === 'chorus' && bar === 3);
      const want = ch.notes.concat(ch.auto).filter(n => keep(n.section, n.bar)).map(n => n.lane + '@' + (Math.round(n.t * 1e6) / 1e6)).sort();
      const dl = GG.audio.timeline(window.__song.pattern, { genre: GG.state.genre, songId: window.__song.id, backing: false, vocals: false });   // (the drum seat: the band plays no drums, you do)
      const got = dl.events.filter(e => e.kind === 'drum' && keep(e.section, Math.floor(((e.g != null ? e.g : e.beat) % 16) / 4))).map(e => e.lane + '@' + (Math.round(e.beat * spb * 1e6) / 1e6)).sort();
      return { swing: tl.swing, drums: tl.events.filter(e => e.kind === 'drum').length, same: JSON.stringify(want) === JSON.stringify(got), n: got.length, m: want.length, fillsIn, dbg: GG.debug('audio').swing };
    });
    c.ok(band.swing === 4 && band.dbg === 4 && band.drums === 0 && band.same, 'the band plays swung (swing 4; you have the drums), the song\'s drums sit at the chart\'s (swung) times ' + JSON.stringify(band));
    // (3) perfect taps on swung notes: judged perfect, the drum books on the band's swung grid (zeroBand + t)
    const per = [];
    for (let k = 0; k < 6; k++) { const n = await nextSwung(); const r = await tapS(n.li, n.t); per.push({ n, r }); }
    const rule = ({ n, r }) => { const e = r.last.at - n.t, inWin = e >= -0.015 && e <= 0.015;
      return r.last.snap === inWin && r.h && r.h.w != null && Math.abs(r.h.snd - (r.h.zb + (inWin ? n.t : r.last.at))) <= 0.003; };
    c.ok(per.filter(x => x.r.last && x.r.last.judgement === 'perfect' && rule(x)).length === 6 && per.filter(x => x.r.last.snap).length >= 5,
      'swung notes: perfect taps judged perfect, snapped, the drum books at zeroBand + t ' + JSON.stringify(per.map(({ n, r }) => [r.last && r.last.judgement, r.last && r.last.snap, r.h && ms(r.h.snd - (r.h.zb + n.t))])));
    const late = [];
    for (let k = 0; k < 3; k++) { const n = await nextSwung(); const r = await tapS(n.li, n.t + 0.010); late.push({ n, r }); }
    c.ok(late.every(x => x.r.last && /^(perfect|good)$/.test(x.r.last.judgement) && rule(x)) && late.filter(x => x.r.last.snap).length >= 2,
      'swung notes 10 ms late snap onto the swung grid ' + JSON.stringify(late.map(({ n, r }) => [r.last && r.last.judgement, r.last && r.last.snap, r.h && ms(r.h.snd - (r.h.zb + n.t))])));
    // (4) two-thumb auto notes: booked ahead, each on a chart auto note's (swung) time, none from the frame
    await page.waitForTimeout(600);
    const au = await page.evaluate(() => { const d = GG.debug('gigui'), ts = window.__ch.auto.map(n => n.t);
      const a = window.__h.filter(e => !e.tap && e.w != null && e.w - e.zb > -0.05);
      return { n: a.length, played: d.autoPlayed, off: a.filter(e => !ts.some(t => Math.abs(e.w - e.zb - t) <= 0.001)).length, late: a.filter(e => !(e.w - e.now > 0.005)).length,
        frame: window.__h.filter(e => !e.tap && e.w == null).length };
    });
    c.ok(au.n > 0 && au.n === au.played && au.off === 0 && au.late === 0 && au.frame === 0, 'auto notes booked ahead on their swung times, none from the frame ' + JSON.stringify(au));
    // (5) a perfect autoplay gig on the swung song = S, 100 %
    const pg = await perfectGig();
    c.ok(pg.acc === 1 && pg.miss === 0 && pg.grade === 'S', 'drum seat: the perfect bot on a swung song with a fill = S, 100 % ' + JSON.stringify(pg));
    // (6) rock rhythm seat: a swung song with Scratch (part v2); a tapped Scratch note plays a dead strum, perfect bot = 100 %
    await page.evaluate(() => {
      GG.ui.closeAll();
      GG.main.quickStart({ seed: 8314, bandId: 'gravel_kings', seat: 'rhythm', openCard: false });
      const s = GG.state, E = '................'; s.card = null; s.phase = 'plan'; GG.ui.gigAutoplay = false;
      const bar = ['x...x...x...x...', '....x.......x...', 'x.x.x.x.x.x.x.x.', 'x...............'];
      const rows = ['x.......x.......', E, '....x.......x...', E, E, '..x...x...x...x.'];   // chugs, Root singles, Scratch on the swung 8ths
      const song = GG.songs.create(s, { bpm: 100, lanes: 4, swing: 3, arrangement: ['verse', 'chorus', 'verse', 'chorus'], sections: { verse: bar, chorus: bar, bridge: [E, E, E, E] },
        part: { seat: 'rhythm', v: 2, sections: { verse: { prog: 0, rows }, chorus: { prog: 0, rows } } } }, 'Scratch Swing', { quality: 60, polish: 60 });
      s.songs = [song]; window.__song = song;
      const A = GG.audio, v = window.__v = { strums: [] }, f = A.strum;
      A.strum = function (midi, when, o) { v.strums.push({ midi, dead: !!(o && o.dead) }); return f.apply(this, arguments); };
      s.gig = GG.gig.makeGig(s, 'legion_63', 'book');
    });
    await startShow();
    const sc = await page.evaluate(() => { const d = GG.debug('gigui'); window.__sc = GG.gig.chart(window.__song, { seat: 'rhythm', genre: GG.state.genre, difficulty: 'hard', lanes: d.lanes });
      return { seat: d.seat, lanes: d.lanes, dead: window.__sc.notes.filter(n => n.dead).length, part: !!window.__song.pattern.part, v: window.__song.pattern.part && window.__song.pattern.part.v }; });
    c.ok(sc.seat === 'rhythm' && sc.dead > 4 && sc.v === 2, 'rhythm seat: the part keeps v2, its Scratch notes chart as dead ' + JSON.stringify(sc));
    const dn = await page.waitForFunction(() => { const d = GG.debug('gigui'); if (d.mode !== 'play') return null;
      return window.__sc.notes.find(n => n.dead && n.li < d.lanes && n.t > d.songT + 0.5 && n.t < d.dur - 1) || null; }, null, { timeout: 12000 }).then(h => h.jsonValue());
    const s0 = await page.evaluate(() => window.__v.strums.length);
    const tr = await tapS(dn.li, dn.t);
    const st = await page.evaluate(n0 => window.__v.strums.slice(n0), s0);
    c.ok(tr.last && /^(perfect|good)$/.test(tr.last.judgement) && st.some(x => x.dead && x.midi === dn.midi), 'a tapped Scratch note plays your strum as a dead strum ' + JSON.stringify({ j: tr.last && tr.last.judgement, st, midi: dn.midi }));
    const rg = await perfectGig();
    c.ok(rg.acc === 1 && rg.miss === 0, 'rhythm seat: the perfect bot on a swung Scratch song = 100 % ' + JSON.stringify(rg));
    await page.evaluate(() => { GG.ui.closeAll(); GG.prefs.set({ noFail: false }); GG.prefs.setCalib('speaker', { audio: 0, visual: 0 }); });
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  await close();
  c.done();
}
