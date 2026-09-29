// pw_gig.js: the v0.3 live gig on a 390x844 phone viewport. Section META_ONLY=gig (default). Must finish inside `timeout 500`.
//   gig : quickStart + a booked gig → GG.ui.playGig: setlist sheet (slots = setSize, drop/auto-pick, opener/closer hints)
//         → Start → count-in → backing plays on the audio clock → timed in-page taps on lane zones judge Perfect/Good →
//         pause suspends the AudioContext and freezes the song, resume continues → screenshot tests/.cache/gig.png →
//         autoplay bot hook finishes the set ('gig:song' per song, state.liveGig) → results (grade, reactions) → applied →
//         Wrap up → done(result); a perfect autoplay gig scores S; a half-played liveGig resumes at its next song;
//         layout audit; no console errors.
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

(async () => { if (want('gig')) await gig(); })();
