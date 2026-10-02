// pw_seat_audio.js (v1.1 "Seats", Lane D, plan_contract_1.1 §4.7 / §5 Lane D): your instrument in Chromium. Sections
// (META_ONLY=<a,b>; default all), each inside `timeout 500`, at 390x844 and PW_VIEW=440x956; every section asserts no
// console errors:
//   voices : A.pluck / strum / lead on a string-seat career in every genre: the first source starts within +-1 ms of the
//            requested band-clock time (ahead and 'now'), the band's own sound for the kind (sources per note), monophonic
//            (a new note chokes the last), a hold gated by A.release (its sources stop at the release + the 20 ms gate; a
//            non-hold / a second release: false; a release before 60 ms keeps 60 ms), A.hitCancel silences booked notes and
//            the next note still plays, a burst over a song + taps holds the voice cap (no tap dropped); offline: a released
//            hold is silent after its release, every genre x voice renders clean.
//   mute   : play() with opts.mute never schedules a muted kind (h.kinds / h.muted, per genre with the seat's kinds) and
//            offline every band kind muted = silence (no source started for a muted kind), the unmuted render is loud.
//   preview: A.seatPreview(band, seat): ~3 s, the seat's kinds at +6 dB / the rest -6 dB, the seat's kinds heard, quiet (not
//            the current song), one at a time (a second preview stops the first), stops itself, A.stopPreview().
//   noodle : a string seat's garage noodle is yours (A.noodleFor -> { who: 'player', style }), it plays in the garage.
// Run: node build.js && META_ONLY=voices timeout 500 node tests/pw_seat_audio.js
const { open, checker, VIEW } = require('./_pw');
const ONLY = (process.env.META_ONLY || '').split(',').filter(Boolean);
const want = s => !ONLY.length || ONLY.includes(s);
const tid = id => `[data-testid="${id}"]`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const W = VIEW.width;
const BANDS = { metal: 'hail_damage', punk: 'frost_heave', rock: 'gravel_kings', country: 'grid_road_ramblers' };

// Every source started on the live context: { k (call), s (start asked), e (last stop asked), on: [start, end] on the
// context clock (end: the stop, a buffer's natural end, or 'ended') }, in call order (the true voice peak, as pw_perf).
const SPY = () => {
  const S = window.__src = [];
  const BAC = window.BaseAudioContext || window.AudioContext, proto = BAC.prototype;
  ['createOscillator', 'createBufferSource'].forEach(k => {
    const f0 = proto[k];
    proto[k] = function () {
      const n = f0.apply(this, arguments);
      if (window.OfflineAudioContext && this instanceof OfflineAudioContext) return n;
      const ctx = this, rec = { k, s: null, e: null, on: [null, Infinity] }, st = n.start, sp = n.stop;
      n.start = function (w, off, dur) {
        rec.s = w || 0; rec.on[0] = Math.max(w || 0, ctx.currentTime); S.push(rec);
        if (k === 'createBufferSource' && !n.loop && n.buffer) rec.on[1] = rec.on[0] + (dur != null ? dur : n.buffer.duration - (off || 0)) / Math.max(0.01, n.playbackRate.value || 1);
        return st.apply(this, arguments);
      };
      n.stop = function (w) { rec.e = w || 0; rec.on[1] = Math.min(rec.on[1], Math.max(w || 0, ctx.currentTime)); return sp.apply(this, arguments); };
      n.addEventListener('ended', () => { rec.on[1] = Math.min(rec.on[1], ctx.currentTime); });
      return n;
    };
  });
};
async function boot(page) {
  await page.waitForSelector(tid('btn-new'), { timeout: 30000 });
  await page.waitForFunction(() => GG.render.title && GG.render.title.info().frame > 2, null, { timeout: 30000 });
}
async function career(page, band, seat) {
  await page.evaluate(([b, s]) => { GG.main.quickStart({ seed: 4242, slot: '1', openCard: false, name: 'Sam', bandId: b, seat: s }); GG.ui.closeAll(); GG.render.setPaused(false); }, [band, seat]);
  await page.mouse.click(Math.round(W / 2), 120);   // a first touch: the audio unlock
  await page.evaluate(() => GG.audio.unlock());
  await page.waitForFunction(() => GG.audio.context() && GG.audio.context().state === 'running', null, { timeout: 15000 });
}

/* ---- voices ---------------------------------------------------------------------------------------------------------- */
async function voices() {
  const c = checker('voices');
  const o = await open({ noGoto: true });
  const { page, errors } = o;
  try {
    await o.context.addInitScript(SPY);
    await page.goto(o.url);
    await boot(page);
    const per = {};
    for (const g of Object.keys(BANDS)) {
      const seat = g === 'country' ? 'lead' : g === 'rock' ? 'rhythm' : 'bass';
      await career(page, BANDS[g], seat);
      per[g] = await page.evaluate(async () => {
        const A = GG.audio, ctx = A.context(), S = window.__src, out = { genre: GG.state.genre, notes: [] };
        const wait = ms => new Promise(r => setTimeout(r, ms));
        for (const fn of ['pluck', 'strum', 'lead']) {
          // ahead on the band clock
          let s0 = S.length, when = ctx.currentTime + 0.3, h = A[fn](fn === 'pluck' ? 40 : 64, when, { len: 0.4 });
          let st = S.slice(s0).map(x => x.s);
          out.notes.push({ fn, kind: h && h.kind, n: h && h.n, srcs: st.length, dAhead: h ? Math.round((Math.min.apply(null, st) - when) * 1e5) / 100 : null, ht: h ? Math.round((h.t - when) * 1e5) / 100 : null });
          await wait(450);
          // 'now' (+5 ms)
          s0 = S.length; const now = ctx.currentTime; h = A[fn](fn === 'pluck' ? 43 : 67, undefined, { len: 0.3 });
          st = S.slice(s0).map(x => x.s);
          out.notes[out.notes.length - 1].dNow = h ? Math.round((Math.min.apply(null, st) - (now + 0.005)) * 1e5) / 100 : null;
          await wait(400);
        }
        return out;
      });
    }
    console.log('INFO voices booking ' + JSON.stringify(per));
    const all = [].concat(...Object.values(per).map(x => x.notes));
    c.ok(all.length === 12 && all.every(x => x.kind && x.n >= 1 && x.srcs >= 1 && x.srcs === x.n), 'every genre x voice plays its kind through the band voice (sources = voices booked) ' + JSON.stringify(all.map(x => x.kind + ':' + x.n)));
    c.ok(all.every(x => Math.abs(x.dAhead) <= 1 && Math.abs(x.ht) <= 1), 'booked ahead: the first source starts within +-1 ms of the band-clock time ' + JSON.stringify(all.map(x => x.dAhead)));
    c.ok(all.every(x => x.dNow != null && Math.abs(x.dNow) <= 1.5), "'now' = the context time + 5 ms (+-1 ms, + the read) " + JSON.stringify(all.map(x => x.dNow)));
    const kinds = Object.fromEntries(Object.entries(per).map(([g, x]) => [g, x.notes.map(n => n.kind).join(',')]));
    c.ok(kinds.metal === 'bass,gtr,lead' && kinds.punk === 'bass,gtr,lead' && kinds.rock === 'bass,gtr2,lead' && kinds.country === 'bass,clean,twang', 'default kinds per genre ' + JSON.stringify(kinds));
    c.ok(per.metal.notes[1].n === 2 && per.country.notes[1].n === 3, "metal's strum = the double-tracked pair (2), the country strum = 3 strings " + JSON.stringify([per.metal.notes[1].n, per.country.notes[1].n]));

    // holds, release, choke, hitCancel (country lead career: Earl's Tele + the acoustic)
    const hr = await page.evaluate(async () => {
      const A = GG.audio, ctx = A.context(), S = window.__src, wait = ms => new Promise(r => setTimeout(r, ms)), r = {};
      // a hold released early: its sources stop at the release + the gate (6 x 20 ms)
      let t = ctx.currentTime + 0.2, s0 = S.length, h = A.lead(69, t, { len: 2, hold: true });
      const rel = t + 0.5, ok = A.release(h, rel), stops = S.slice(s0).map(x => x.e);
      r.hold = { ok, cut: Math.round((h.cut - rel) * 1e5) / 100, end: Math.round((h.end - (rel + 0.12)) * 1e5) / 100, stops: stops.map(e => Math.round((e - (rel + 0.12)) * 1e5) / 100), again: A.release(h, rel + 0.1) };
      await wait(900);
      // a release before 60 ms keeps 60 ms
      t = ctx.currentTime + 0.2; h = A.pluck(45, t, { len: 1.5, hold: true });
      A.release(h, t + 0.01); r.early = Math.round((h.cut - (t + 0.06)) * 1e5) / 100;
      // a tap (not a hold): release says false, the note rings its length
      t = ctx.currentTime + 0.4; h = A.strum(55, t, { len: 0.3 }); const end0 = h.end;
      r.tap = { rel: A.release(h, t + 0.1), same: h.end === end0, hold: h.hold };
      await wait(900);
      // monophonic: a new pluck chokes the ringing one at its start
      t = ctx.currentTime + 0.2; const h1 = A.pluck(40, t, { len: 1.5 }), h2 = A.pluck(43, t + 0.3, { len: 0.5 });
      r.choke = { cut: Math.round((h1.cut - (t + 0.3)) * 1e5) / 100, end: Math.round((h1.end - (t + 0.3 + 0.036)) * 1e5) / 100, h2: !!h2 };
      await wait(1200);
      // hitCancel: booked notes are gone (sources stopped now), the ledger lets them go, the next note plays
      t = ctx.currentTime + 0.5; s0 = S.length;
      const b1 = A.pluck(40, t, { len: 1 }), b2 = A.strum(52, t + 0.1, { len: 1 }), b3 = A.lead(72, t + 0.2, { len: 1, hold: true });
      const cNow = ctx.currentTime; A.hitCancel();
      const st = S.slice(s0);
      r.cancel = { stopped: st.every(x => x.e != null && x.e < cNow + 0.05), n: st.length, live: GG.debug('audio').seat.live, ends: [b1, b2, b3].every(x => x.end < cNow + 0.02) };
      const nx = A.pluck(41, ctx.currentTime + 0.1, { len: 0.2 });
      r.after = !!nx && nx.n === 1;
      await wait(300);
      // a run (o.repeats): its notes on the grid under one handle; a release stops the ones not played yet
      t = ctx.currentTime + 0.2; s0 = S.length;
      const run = A.pluck(40, t, { len: 0.5, hold: true, repeats: [0.1, 0.2, 0.3] });
      const runSrc = S.slice(s0), runStarts = runSrc.map(x => Math.round((x.s - t) * 1000));
      A.release(run, t + 0.15);
      const stopAt = t + 0.15 + 0.12, late = runSrc.filter(x => x.s > stopAt);
      r.run = { n: run.n, repeats: run.repeats, starts: runStarts, cut: Math.round((run.cut - (t + 0.15)) * 1e5) / 100, lateSilent: late.length >= 1 && late.every(x => x.e < x.s), allStop: runSrc.every(x => x.e <= stopAt + 1e-6) };
      await wait(700);
      // muted game: null (like A.hit), no source
      A.setMuted(true); s0 = S.length; r.muted = [A.pluck(40), S.length - s0]; A.setMuted(false);
      r.dbg = GG.debug('audio').seat;
      return r;
    });
    console.log('INFO voices holds ' + JSON.stringify(hr));
    c.ok(hr.hold.ok === true && Math.abs(hr.hold.cut) <= 1 && Math.abs(hr.hold.end) <= 1 && hr.hold.stops.length && hr.hold.stops.every(e => Math.abs(e) <= 1), 'a hold is gated at its release (sources stop at release + 120 ms, +-1 ms) ' + JSON.stringify(hr.hold));
    c.ok(hr.hold.again === false, 'a second release: false');
    c.ok(Math.abs(hr.early) <= 1, 'a release before 60 ms keeps 60 ms ' + hr.early);
    c.ok(hr.tap.rel === false && hr.tap.same && hr.tap.hold === false, 'a tap is not gated by a release ' + JSON.stringify(hr.tap));
    c.ok(Math.abs(hr.choke.cut) <= 1 && Math.abs(hr.choke.end) <= 1 && hr.choke.h2, 'monophonic: the next pluck chokes the last at its start ' + JSON.stringify(hr.choke));
    c.ok(hr.cancel.stopped && hr.cancel.n >= 3 && hr.cancel.live === 0 && hr.cancel.ends && hr.after, 'hitCancel: booked notes stop now, the ledger lets them go, the next note plays ' + JSON.stringify(hr.cancel));
    c.ok(hr.run.n === 4 && hr.run.repeats === 3 && hr.run.starts.join() === '0,100,200,300' && Math.abs(hr.run.cut) <= 1 && hr.run.lateSilent && hr.run.allStop, 'a run: its repeats on the grid under one handle; the release stops the rest (they never play) ' + JSON.stringify(hr.run));
    c.ok(hr.muted[0] === null && hr.muted[1] === 0, 'muted: no note ' + JSON.stringify(hr.muted));
    c.ok(hr.dbg.released >= 2 && hr.dbg.choked >= 1 && hr.dbg.cancelled >= 1, "debug('audio').seat counts " + JSON.stringify(hr.dbg));

    // a burst over a song: the band (seat kinds muted) + your notes every 40 ms + drum taps: the cap holds, nothing of yours dropped
    const burst = await page.evaluate(async () => {
      const A = GG.audio, ctx = A.context(), s = GG.state, d0 = GG.debug('audio').counts.tapDrops, c0 = ctx.currentTime;
      const kinds = A.seatKinds(s.genre, s.seat), h = A.play(s.songs[0].pattern, { genre: s.genre, seat: s.seat, mute: kinds, drums: true });
      const t0 = performance.now(); let n = 0;
      while (performance.now() - t0 < 2500) {
        A.lead(64 + (n % 12), ctx.currentTime + 0.05, { len: 0.5, hold: n % 3 === 0 }); A.strum(52, ctx.currentTime + 0.06, { len: 0.4 }); A.pluck(40 + (n % 5), ctx.currentTime + 0.05, { len: 0.3 });
        A.hit('kick'); A.hit('hat'); n += 5;
        await new Promise(r => setTimeout(r, 40));
      }
      await new Promise(r => setTimeout(r, 900));
      const v = A.voiceStats(), c1 = ctx.currentTime, ev = [];
      for (const r of window.__src) { const [a, b] = r.on; if (a == null || b < c0 || a > c1) continue; ev.push([a, 1], [Math.min(b, c1 + 5), -1]); }
      ev.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
      let cur = 0, peak = 0; for (const x of ev) { cur += x[1]; if (cur > peak) peak = cur; }
      const out = { notes: n, tapDrops: GG.debug('audio').counts.tapDrops - d0, peak, ledgerPeak: v.peak, over: v.over, amb: GG.debug('audio').ambience, kinds: Object.assign({}, h.kinds), muted: Object.assign({}, h.muted) };
      A.stop();
      return out;
    });
    console.log('INFO voices burst ' + JSON.stringify(burst));
    // (the ledger counts a note booked ahead from its booking, so its own peak / 'over' read high when notes are booked 50 ms
    // ahead 75 times a second; what sounds at once is the cap that matters)
    c.ok(burst.notes > 200 && burst.tapDrops === 0 && burst.peak <= 32, 'a burst of your notes + taps over the band: <= 32 voices sounding at once, none dropped ' + JSON.stringify(burst));
    c.ok(!burst.kinds.twang && burst.muted.twang > 0 && burst.kinds.drum > 0, 'the band muted your kind and played the drums ' + JSON.stringify([burst.kinds, burst.muted]));

    // offline: a released hold is silent after the gate; every genre x voice renders clean
    const off = await page.evaluate(async () => {
      const A = GG.audio, res = {};
      const win = (buf, a, b) => { let s = 0, n = 0; for (let ch = 0; ch < buf.numberOfChannels; ch++) { const d = buf.getChannelData(ch); for (let i = Math.floor(a * buf.sampleRate); i < Math.min(d.length, b * buf.sampleRate); i++) { s += d[i] * d[i]; n++; } } return Math.sqrt(s / Math.max(1, n)); };
      for (const g of GG.contracts.GENRES) {
        const row = {};
        for (const fn of ['pluck', 'strum', 'lead']) {
          const midi = fn === 'pluck' ? 40 : 60;
          // (a dry room: the released note's reverb is gone 0.45 s after its gate)
          const held = await A.renderOffline({ genre: g, seconds: 2.4, room: 'dry', seatNotes: [{ fn, midi, at: 0.1, o: { len: 1.8, hold: true } }] });
          const rel = await A.renderOffline({ genre: g, seconds: 2.4, room: 'dry', seatNotes: [{ fn, midi, at: 0.1, o: { len: 1.8, hold: true }, release: 0.4 }] });
          row[fn] = { kind: held.seat[0].kind, nan: held.nan || rel.nan, peak: +held.peak.toFixed(3), held: +win(held.buffer, 1.1, 1.6).toFixed(6), rel: +win(rel.buffer, 1.1, 1.6).toFixed(7), early: +win(rel.buffer, 0.2, 0.4).toFixed(5), cut: rel.seat[0].cut };
        }
        res[g] = row;
      }
      return res;
    });
    console.log('INFO voices offline ' + JSON.stringify(off));
    const rows = [].concat(...Object.values(off).map(r => Object.values(r)));
    c.ok(rows.every(x => !x.nan && x.peak > 0.01 && x.peak < 1), 'offline: every genre x voice sounds, no NaN, no clipping ' + JSON.stringify(rows.map(x => x.kind + ':' + x.peak)));
    c.ok(rows.every(x => x.early > 1e-3 && x.held > 1e-5 && x.rel < Math.max(1e-6, x.held * 0.01)), 'offline: a released hold sounds, then is silent after its gate (the Tele\'s slapback echo dies under 1 %); the held one still sounds ' + JSON.stringify(rows.map(x => [x.early, x.held, x.rel])));
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'voices threw: ' + (e.stack || e)); }
  finally { await o.close(); c.done(); }
}

/* ---- mute ------------------------------------------------------------------------------------------------------------ */
async function mute() {
  const c = checker('mute');
  const o = await open();
  const { page, errors } = o;
  try {
    await boot(page);
    await career(page, 'hail_damage', 'rhythm');
    // live: a song per genre with the seat's kinds muted: the scheduler never plays them, the rest plays
    const live = await page.evaluate(async () => {
      const A = GG.audio, out = {};
      for (const g of GG.contracts.GENRES) for (const seat of ['bass', 'rhythm', 'lead']) {
        const p = JSON.parse(JSON.stringify(GG.songs.signature(g))), kinds = A.seatKinds(g, seat);
        const h = A.play(p, { genre: g, seat, mute: kinds, drums: true, section: 'chorus', loop: true });
        await new Promise(r => setTimeout(r, 2000));   // (country's lead licks answer at the half bar: 1.5 s at 100 BPM)
        out[g + '/' + seat] = { played: Object.assign({}, h.kinds), muted: Object.assign({}, h.muted), kinds, seat: h.seat, dbg: GG.debug('audio').seat.song };
        A.stop();
      }
      return out;
    });
    const bad = Object.entries(live).filter(([k, x]) => x.kinds.some(kd => x.played[kd]) || !x.kinds.some(kd => x.muted[kd] > 0) || !(x.played.drum > 0) || x.seat !== k.split('/')[1] || !x.dbg);
    console.log('INFO mute live ' + JSON.stringify(Object.fromEntries(Object.entries(live).map(([k, x]) => [k, [x.played, x.muted]]))));
    c.ok(Object.keys(live).length === 12 && bad.length === 0, 'live: a muted kind is never scheduled, the rest (drums too) plays, per genre x seat ' + JSON.stringify(bad.map(x => x[0])));
    // offline: every band kind muted = silence; unmuted = the band
    const off = await page.evaluate(async () => {
      const A = GG.audio, res = {}, ALL = ['gtr', 'gtr2', 'bass', 'lead', 'fiddle', 'clean', 'twang', 'vox', 'bvox'];
      for (const g of GG.contracts.GENRES) {
        const on = await A.renderOffline({ genre: g, section: 'chorus', bars: 2, drums: false });
        const offAll = await A.renderOffline({ genre: g, section: 'chorus', bars: 2, drums: false, mute: ALL });
        const drumsOff = await A.renderOffline({ genre: g, section: 'chorus', bars: 2, backing: false, vocals: false, mute: ['drum'] });
        const seatK = A.seatKinds(g, 'rhythm'), part = await A.renderOffline({ genre: g, section: 'chorus', bars: 2, drums: false, seat: 'rhythm', mute: seatK });
        res[g] = { on: +on.peak.toFixed(3), off: offAll.peak, drumsOff: drumsOff.peak, offCounts: offAll.counts, partCounts: part.counts, seatK, tlSeat: part.tlSeat };
      }
      return res;
    });
    console.log('INFO mute offline ' + JSON.stringify(off));
    c.ok(Object.values(off).every(x => x.on > 0.05 && x.off < 1e-5 && x.drumsOff < 1e-5 && Object.keys(x.offCounts).length === 0), 'offline: no source started for a muted kind (all muted = silence; drums muted = silence) ' + JSON.stringify(Object.values(off).map(x => [x.on, x.off, x.drumsOff])));
    c.ok(Object.values(off).every(x => x.tlSeat === 'rhythm' && x.seatK.every(k => !x.partCounts[k]) && Object.keys(x.partCounts).length > 0), 'offline: the seat muted, the rest still played ' + JSON.stringify(Object.values(off).map(x => x.partCounts)));
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'mute threw: ' + (e.stack || e)); }
  finally { await o.close(); c.done(); }
}

/* ---- preview --------------------------------------------------------------------------------------------------------- */
async function preview() {
  const c = checker('preview');
  const o = await open();
  const { page, errors } = o;
  try {
    await boot(page);
    await page.mouse.click(Math.round(W / 2), 120);
    await page.evaluate(() => GG.audio.unlock());
    await page.waitForFunction(() => GG.audio.context() && GG.audio.context().state === 'running', null, { timeout: 15000 });
    // every band x seat: the seat's kinds go to the +6 dB port and are heard; quiet (never the current song)
    const all = await page.evaluate(async () => {
      const A = GG.audio, out = {}, steps = { n: 0 }, on = () => steps.n++;
      GG.on('audio:step', on);
      for (const b of ['hail_damage', 'frost_heave', 'gravel_kings', 'grid_road_ramblers']) for (const seat of GG.contracts.SEATS) {
        const h = A.seatPreview(b, seat), g = GG.content.bands[b].genre, kinds = A.seatKinds(g, seat);
        const lv = [h.ports[0].bass.gain.value, h.ports[1].bass.gain.value];
        await new Promise(r => setTimeout(r, 2000));
        out[b + '/' + seat] = { secs: h.secs, kinds, heard: kinds.filter(k => h.kinds[k] > 0), other: Object.keys(h.kinds).filter(k => kinds.indexOf(k) < 0).length,
          lv, current: A.current(), seat: h.seat, tlSeat: h.timeline.seat || null, playing: h.playing };
      }
      A.stopPreview();
      GG.off && GG.off('audio:step', on);
      return { out, steps: steps.n };
    });
    const rows = Object.entries(all.out);
    console.log('INFO preview all ' + JSON.stringify(rows.map(([k, x]) => [k, x.secs, x.heard.join('+')])));
    c.ok(rows.length === 16 && rows.every(([, x]) => x.playing && x.secs >= 2.3 && x.secs <= 3.0001), 'every band x seat previews ~3 s (2 bars, capped at 3 s) ' + JSON.stringify(rows.map(([, x]) => x.secs)));
    c.ok(rows.every(([, x]) => x.heard.length >= 1 && x.other >= 1), "the seat's own kinds are heard over the band " + JSON.stringify(rows.filter(([, x]) => !x.heard.length).map(r => r[0])));
    c.ok(rows.every(([, x]) => Math.abs(x.lv[0] - 0.5) < 1e-6 && Math.abs(x.lv[1] - 2) < 1e-6), 'the rest at -6 dB (x0.5), the seat at +6 dB (x2) ' + JSON.stringify(rows[0][1].lv));
    c.ok(rows.every(([k, x]) => x.current === null && x.seat === k.split('/')[1]) && all.steps === 0, 'quiet: never the current song, no audio:step ' + all.steps);
    c.ok(rows.filter(([k]) => /\/(bass|rhythm|lead)$/.test(k)).every(([k, x]) => x.tlSeat === k.split('/')[1]), 'the seat layers are on (timeline seat)');
    // one at a time, stops itself, A.stopPreview, null for an unknown band
    const one = await page.evaluate(async () => {
      const A = GG.audio, ctx = A.context(), r = {};
      const h1 = A.seatPreview('hail_damage', 'bass'), h2 = A.seatPreview('grid_road_ramblers', 'lead');
      r.first = h1.playing; r.second = h2.playing; r.dbg = GG.debug('audio').seat.preview;
      const t0 = ctx.currentTime;
      await new Promise(res => { const f = () => (!h2.playing || ctx.currentTime - t0 > 6 ? res() : setTimeout(f, 50)); f(); });
      r.selfStop = !h2.playing; r.ranFor = Math.round((ctx.currentTime - t0) * 100) / 100; r.secs = h2.secs; r.dbgAfter = GG.debug('audio').seat.preview.playing;
      const h3 = A.seatPreview('gravel_kings', 'rhythm'); r.stopped = A.stopPreview(); r.h3 = h3.playing; r.again = A.stopPreview();
      const h4 = A.seatPreview('frost_heave', 'drums'); A.play(GG.songs.signature('punk'), { genre: 'punk', section: 'verse' }); r.byPlay = h4.playing; A.stop();
      r.unknown = A.seatPreview('no_such_band', 'bass');
      return r;
    });
    console.log('INFO preview one ' + JSON.stringify(one));
    c.ok(one.first === false && one.second === true && one.dbg.playing && one.dbg.last.bandId === 'grid_road_ramblers', 'one at a time: the second preview stops the first ' + JSON.stringify(one.dbg));
    c.ok(one.selfStop && one.ranFor >= one.secs - 0.1 && one.ranFor <= one.secs + 0.6 && one.dbgAfter === false, 'it stops itself after ~3 s ' + JSON.stringify([one.ranFor, one.secs]));
    c.ok(one.stopped === true && one.h3 === false && one.again === false && one.byPlay === false && one.unknown === null, 'A.stopPreview() / A.play end it; an unknown band = null ' + JSON.stringify(one));
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'preview threw: ' + (e.stack || e)); }
  finally { await o.close(); c.done(); }
}

/* ---- noodle ---------------------------------------------------------------------------------------------------------- */
async function noodle() {
  const c = checker('noodle');
  const o = await open();
  const { page, errors } = o;
  try {
    await boot(page);
    const want = { 'hail_damage/bass': 'walk', 'hail_damage/rhythm': 'chug', 'frost_heave/rhythm': 'power', 'grid_road_ramblers/rhythm': 'strum', 'gravel_kings/lead': 'lick', 'grid_road_ramblers/lead': 'twang' };
    const got = await page.evaluate(w => {
      const out = {};
      for (const k of Object.keys(w)) { const [b, s] = k.split('/'); const st = GG.career.newCareer({ seed: 3, bandId: b, seat: s, player: { name: 'N' } }); out[k] = GG.audio.noodleFor(st); }
      out.drums = GG.audio.noodleFor(GG.career.newCareer({ seed: 3, bandId: 'hail_damage', seat: 'drums', player: { name: 'N' } }));
      return out;
    }, want);
    c.ok(Object.keys(want).every(k => got[k] && got[k].who === 'player' && got[k].style === want[k]), 'string seats noodle their own instrument ' + JSON.stringify(got));
    c.ok(got.drums && got.drums.who === 'dana' && got.drums.style === 'pluck', 'the drum seat keeps the band\'s noodler (Dana) ' + JSON.stringify(got.drums));
    await career(page, 'hail_damage', 'bass');
    await page.waitForFunction(() => { const d = GG.debug('audio'); return d.ambience === 'garage' && d.noodle && d.counts.noodles >= 2; }, null, { timeout: 20000 });
    const d = await page.evaluate(() => { const d = GG.debug('audio'); return { amb: d.ambience, noodle: d.noodle, n: d.counts.noodles }; });
    c.ok(d.noodle.who === 'player' && d.noodle.style === 'walk' && d.n >= 2, 'the garage plays your bass noodle ' + JSON.stringify(d));
    const r = await page.evaluate(async () => (await GG.audio.renderOffline({ ambience: 'garage', space: 'garage', noodle: 'walk', seconds: 2 })).bed);
    c.ok(r && r.noodles >= 3, 'the walk noodle renders offline ' + JSON.stringify(r));
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'noodle threw: ' + (e.stack || e)); }
  finally { await o.close(); c.done(); }
}

(async () => {
  if (want('voices')) await voices();
  if (want('mute')) await mute();
  if (want('preview')) await preview();
  if (want('noodle')) await noodle();
})();
