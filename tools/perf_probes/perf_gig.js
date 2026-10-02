// perf_gig.js: a real gig at a big venue (Mudstonbury main stage, 60k fans => the 150-person crowd cap), Hail Damage (4 + you),
// Expert, 6 lanes + double-kick pedal, pyro kit, a bot that taps every note on the heard clock (pointer events on the
// highway, like pw_gig's tapAt). Measures during the first song: frame interval / JS per frame / renderer.render time,
// draw calls + triangles (stage) and the highway canvas, JS heap, and Web Audio: peak overlapping sources (every
// buffer/oscillator source's [start, end] on the context clock), GG.debug('audio') caps sampled every 200 ms
// (songVoices/bandVoices/crowdVoices/ambVoices/sfx voices, drops), nodes created per second.
// Run: THROTTLE=1|4 BAND=hail_damage VENUE=mudstonbury_fest SONG_S=45 node perf_gig.js  -> results/gig_t<T>_<band>.json
const fs = require('fs'), path = require('path');
const { open, heap } = require('./perf_lib');
const T = +(process.env.THROTTLE || 1), BAND = process.env.BAND || 'hail_damage', VENUE = process.env.VENUE || 'mudstonbury_fest';
const SONG_S = +(process.env.SONG_S || 45), VIEW = process.env.VIEW || '390x844', DIFF = process.env.DIFF || 'expert';
const [VW, VH] = VIEW.split('x').map(Number);

(async () => {
  const { page, cdp, errors, close } = await open({ w: VW, h: VH, throttle: T });
  const res = { throttle: T, band: BAND, venue: VENUE, diff: DIFF, view: VIEW };
  try {
    await page.waitForSelector('[data-testid="btn-new"]', { timeout: 60000 });
    res.setup = await page.evaluate(([band, venue, diff]) => {
      GG.prefs.set({ gigDifficulty: diff, calibSeen: true });
      GG.main.quickStart({ seed: 5150, openCard: false, bandId: band });
      const s = GG.state; s.card = null; s.phase = 'plan'; s.fund = 99999; s.fans = 60000; s.buzz = 90;
      ['toms', 'ride', 'pedal'].forEach(id => { try { GG.shop.buyGear(s, id); } catch (e) {} });
      s.player.kit = Object.assign({}, s.player.kit || {}, { extras: ['pyro', 'fan', 'cowbell'] });
      for (let i = 0; i < 3; i++) GG.songs.jam(s, GG.RNG(40 + i));
      s.songs.forEach(x => { x.pattern.bpm = Math.max(x.pattern.bpm || 0, 170); });   // fast metal: the busiest voices
      s.gig = GG.gig.makeGig(s, venue, 'book');
      window.__done = null; GG.ui.gigAutoplay = false;
      GG.ui.playGig(s.gig, r => { window.__done = r; });
      return { lanes: s.gear.lanes, dk: s.gear.doubleKick, gig: s.gig && s.gig.name, cap: s.gig && s.gig.capacity, members: s.members.length };
    }, [BAND, VENUE, DIFF]);
    await page.waitForFunction(() => GG.debug('ui').screen === 'gig-set', null, { timeout: 60000 });
    await page.locator('[data-testid="btn-gig-start"]').last().click();
    await page.waitForFunction(() => GG.debug('gigui').mode === 'play', null, { timeout: 60000 });
    // bot + samplers (in page)
    await page.evaluate(() => {
      const c = document.querySelector('[data-testid="gig-highway"]'), seen = new Set(), B = window.__bot = { taps: 0, judged: {}, aud: [], max: {} };
      B.moments = []; GG.on('crowd:moment', p => B.moments.push(p && p.kind));
      B.ctx0 = GG.audio.context().currentTime; B.created0 = JSON.parse(JSON.stringify(__perf.audio.created)); B.t0 = performance.now();
      const tapLane = li => { const r = c.getBoundingClientRect(), lanes = GG.debug('gigui').lanes, x = r.left + (li + 0.5) * r.width / lanes, y = r.bottom - 36;
        c.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y, pointerId: 7 + li, pointerType: 'touch', isPrimary: false, bubbles: true, cancelable: true }));
        setTimeout(() => c.dispatchEvent(new PointerEvent('pointerup', { clientX: x, clientY: y, pointerId: 7 + li, pointerType: 'touch', isPrimary: false, bubbles: true, cancelable: true })), 40);
        B.taps++; const l = GG.debug('gigui').last; if (l) B.judged[l.judgement] = (B.judged[l.judgement] || 0) + 1; };
      B.iv = setInterval(() => {
        const d = GG.debug('gigui'); if (d.mode !== 'play' || !d.soon) return;
        for (const n of d.soon) { const k = n.li + ':' + n.t.toFixed(3); if (seen.has(k)) continue; seen.add(k);
          const wait = (n.t - d.songT) * 1000 - 3; if (wait < 400) setTimeout(() => tapLane(n.li), Math.max(0, wait)); else seen.delete(k); }
      }, 60);
      B.au = setInterval(() => {
        const a = GG.debug('audio'), g = { song: a.songVoices, band: a.bandVoices, crowd: a.crowdVoices, amb: a.ambVoices, sfx: a.voices, level: a.crowd.level };
        for (const k in g) B.max[k] = Math.max(B.max[k] || 0, g[k] || 0);
        B.aud.push(g);
      }, 200);
      __perf.mark();
    });
    const t0 = Date.now();
    let mid = null, forced = false, between = 0;
    while (Date.now() - t0 < SONG_S * 1000) {
      await page.waitForTimeout(1000);
      const m = await page.evaluate(() => GG.debug('gigui').mode);
      // FORCE=1: at ~40% of the window, the genre's biggest crowd moments land on top of the band + taps (the peak case)
      if (!forced && process.env.FORCE !== '0' && Date.now() - t0 > SONG_S * 400) { forced = true; res.forced = await page.evaluate(() => { const n = __bot.moments.length; ['wallOfDeath', 'gangShout', 'headbang'].forEach((k, i) => setTimeout(() => GG.emit('crowd:moment', { kind: k }), i * 700)); return { naturalBefore: n }; }); }
      if (m === 'between' && ++between >= 6) { res.endedAt = 'between+6s'; break; }
      if (!mid && Date.now() - t0 > SONG_S * 500) mid = await page.evaluate(() => ({ info: __perf.info(), stage: GG.render.stage.info ? (() => { const i = GG.render.stage.info(); return { kind: i.kind, people: i.people }; })() : null,
        hw: (() => { const c = document.querySelector('[data-testid="gig-highway"]'); return c.width + 'x' + c.height; })(), dom: document.getElementsByTagName('*').length }));
      if (m !== 'play' && m !== 'between') { res.endedEarly = m; break; }
    }
    res.frame = await page.evaluate(() => __perf.read());
    res.mid = mid;
    res.heap = await heap(cdp);
    res.audio = await page.evaluate(() => {
      const B = window.__bot, now = GG.audio.context().currentTime, cr = __perf.audio.created, d = {}, secs = (performance.now() - B.t0) / 1000;
      for (const k in cr) d[k] = cr[k] - (B.created0[k] || 0);
      const tot = Object.values(d).reduce((a, b) => a + b, 0);
      clearInterval(B.iv); clearInterval(B.au);
      const dbg = GG.debug('audio');
      return { peak: __perf.audioPeak(B.ctx0, now), caps: B.max, counts: dbg.counts, crowd: dbg.crowd, room: dbg.room, genre: dbg.genre,
        nodesPerSec: Math.round(tot / secs), created: d, moments: B.moments, taps: B.taps, judged: B.judged, secs: +secs.toFixed(1),
        gig: (() => { const g = GG.debug('gigui'); return { mode: g.mode, stats: g.stats, lanes: g.lanes, auto: g.auto, autoPlayed: g.autoPlayed, doubles: g.doubles }; })() };
    });
    res.errors = errors.slice(0, 8);
    const f = res.frame, a = res.audio;
    console.log('gig x' + T, BAND, VENUE, DIFF, JSON.stringify(res.setup));
    console.log('  frames', f.frames, 'fps', f.fps, 'frame p50/p95/max', f.frame.p50 + '/' + f.frame.p95 + '/' + f.frame.max, 'js p50/p95/max', f.js.p50 + '/' + f.js.p95 + '/' + f.js.max, 'render p50/p95', f.render.p50 + '/' + f.render.p95);
    console.log('  mid', JSON.stringify(mid), 'heap', JSON.stringify(res.heap));
    console.log('  audio peak sources', JSON.stringify(a.peak), 'caps(max sampled)', JSON.stringify(a.caps), 'nodes/s', a.nodesPerSec, 'taps', a.taps, JSON.stringify(a.judged), 'moments', JSON.stringify(a.moments), 'forced', JSON.stringify(res.forced));
    console.log('  counts', JSON.stringify(a.counts), 'gig', JSON.stringify(a.gig));
    if (errors.length) console.log('  ERRORS', errors.slice(0, 4));
  } catch (e) { console.log('FAIL', e.stack || e); res.fail = String(e); }
  finally {
    fs.mkdirSync(path.join(__dirname, 'results'), { recursive: true });
    fs.writeFileSync(path.join(__dirname, 'results', 'gig_t' + T + '_' + BAND + '_' + VIEW + '.json'), JSON.stringify(res, null, 1));
    await close();
  }
})();
