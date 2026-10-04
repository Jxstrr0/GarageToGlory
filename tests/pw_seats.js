// pw_seats.js: v1.1 "Seats" end to end (plan_contract_1.1 §5 Lead) on a phone viewport (390x844; PW_VIEW=440x956 for the
// owner's iPhone). Sections META_ONLY=pick|write|gig|studio|shop|garage|stage (default all); run each inside `timeout 500`.
//   pick  : title → slot → genre (Frost Heave) → intro → the seat picker: four cards (seat-drums|bass|rhythm|lead), Drums
//           preselected, who moves to the drums (the swapped member by name) + the stage spot, cards and seat-next >= 48 px; a
//           tap picks the card and plays GG.audio.seatPreview(bandId, seat); back stops the preview and keeps the pick; seat-next
//           stops it, emits 'seat:picked' { seat, swapped }, → logo → the creator asks "Who's on rhythm guitar?" → the career
//           is a rhythm career (Rox on the kit, singing). A second career through the same screens stays a drummer with
//           v1.0's gear object; ?quick=1&seat=bass still quick-starts a bass career. Layout audit; screenshot seats.png.
//   write : a country rhythm Write (v1.3): Quick song with your v2 part, Tweak → your part (6-row grid, Travis Lee on the kit),
//           Loop plays { seat, part }, Song tab title → save: the song keeps your rhythm part and charts on str lanes.
//   gig   : a Gravel Kings rhythm gig through GG.ui.playGig: the string highway (4 lanes), the band plays the drums with your
//           kinds muted, live taps judged on time (holds lifted at their end), autoplay to the results, the done() result
//           carries the seat. Also run at PW_VIEW=440x956.
//   studio: a Frost Heave lead EP session: "Guitar takes", a 🎸 take runs your seat's chart and counts.
//   shop  : a Hail Damage rhythm sketch pad → "Guitar shop": parody names at the drum prices, a buy grows your rig and the
//           band's kit, Jaxon (on the kit) posts about it, no drum names, no gong. v1.3.1 (Lane S), every seat: the garage's
//           green "Gear shop" label (render labelBox 'shop', 'hotspot' shop -> the gear sheet "<Instrument> shop" / "Drum shop")
//           and the sketch pad's header button btn-seq-shop (aria-label = the ⋯ row's text) open the same shop.
//   garage: (needs Lane C) the swapped drummer at the kit, "Your rig" on the 'kit' hotspot, your instrument; skipped with a
//           log line while GG.render.seatGear / the garage's seat debug are missing.
//   stage : (needs Lane C) a string-seat gig stage: view 'spot', the swapped drummer on the riser; skipped with a log line
//           while stage.info() has no 'spot' view.
// Every section asserts no console errors.
// Run: node build.js && META_ONLY=pick timeout 500 node tests/pw_seats.js
const path = require('path');
const { open, checker, shotName, openTools } = require('./_pw');
const CACHE = path.join(__dirname, '.cache');
const SCAN = require('./seat_scan');
const AWARE = SCAN.seatAware(require('./_load')());   // the seat-aware content lines (node-loaded content)
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
// A Monday card (if one is up) out of the way, then the plan phase with an empty stack.
async function toPlan(page) {
  await page.waitForFunction(() => GG.state && (GG.state.phase === 'plan' || GG.debug('ui').screen === 'card'), null, { timeout: 15000 });
  if ((await dbg(page, 'ui')).screen === 'card') { await tap(page, 'choice-0'); await tap(page, 'btn-card-ok'); }
  await page.waitForFunction(() => GG.state.phase === 'plan' && GG.debug('ui').stack.length === 0, null, { timeout: 10000 });
}

/* ---- pick: the seat picker in the real new-career flow -------------------------------------------------------------- */
async function pick() {
  const c = checker('pick');
  const { page, errors, close, url } = await open();
  try {
    await page.waitForSelector(tid('btn-new'));
    await page.evaluate(() => {
      const A = GG.audio, v = window.__seat = { prev: [], stops: 0, picked: [] };
      const p0 = A.seatPreview, s0 = A.stopPreview;
      A.seatPreview = function (b, s) { v.prev.push([b, s]); return p0 ? p0.apply(this, arguments) : null; };
      A.stopPreview = function () { v.stops++; return s0 ? s0.apply(this, arguments) : undefined; };
      GG.on('seat:picked', p => v.picked.push(p));
    });
    await tap(page, 'btn-new'); await tap(page, 'slot-1'); await waitScreen(page, 'genre');
    await tap(page, 'genre-punk'); await waitScreen(page, 'intro');
    await tap(page, 'btn-intro-next'); await waitScreen(page, 'seat');
    await page.waitForTimeout(450);   // the full screen's fade
    const s0 = await page.evaluate(() => {
      const B = GG.content.bands.frost_heave, first = id => { const m = B.members.find(x => x.id === id); return m ? m.name.split(' ')[0] : null; };
      const cards = GG.contracts.SEATS.map(seat => { const e = document.querySelector('[data-testid="seat-' + seat + '"]'); const r = e && e.getBoundingClientRect();
        return e ? { seat, on: e.getAttribute('aria-pressed'), text: e.textContent, h: Math.round(r.height), who: seat === 'drums' ? null : first(GG.career.seatSwap('frost_heave', seat)) } : { seat, missing: true }; });
      const nx = document.querySelector('[data-testid="seat-next"]').getBoundingClientRect();
      return { cards, next: { h: Math.round(nx.height), text: document.querySelector('[data-testid="seat-next"]').textContent }, fixed: !!document.querySelector('[data-testid="seat-fixed"]') };
    });
    c.ok(s0.cards.every(x => !x.missing), 'four seat cards ' + s0.cards.map(x => x.seat).join(','));
    c.ok(s0.cards[0].on === 'true' && s0.cards.slice(1).every(x => x.on === 'false') && /drums/i.test(s0.next.text), 'Drums preselected ' + s0.next.text);
    c.ok(s0.cards.slice(1).every(x => x.who && x.text.includes(x.who)), 'each string card names who moves to the drums ' + s0.cards.slice(1).map(x => x.who).join(', '));
    c.ok(s0.cards.every(x => /Stage spot/i.test(x.text)), 'each card shows the stage spot');
    c.ok(s0.cards.every(x => x.h >= 48) && s0.next.h >= 48 && s0.fixed, 'cards and seat-next >= 48 px; "fixed for the career" ' + JSON.stringify(s0.cards.map(x => x.h).concat(s0.next.h)));
    let bad = await audit(page); c.ok(!bad.length, 'seat screen layout ' + bad.join('; '));
    await tap(page, 'seat-rhythm');
    const s1 = await page.evaluate(() => ({ v: window.__seat, on: document.querySelector('[data-testid="seat-rhythm"]').getAttribute('aria-pressed'),
      drums: document.querySelector('[data-testid="seat-drums"]').getAttribute('aria-pressed'), next: document.querySelector('[data-testid="seat-next"]').textContent, prev: (GG.debug('audio').seat || {}).preview }));
    c.ok(JSON.stringify(s1.v.prev.slice(-1)[0]) === '["frost_heave","rhythm"]', 'a tap plays the seat preview ' + JSON.stringify(s1.v.prev));
    c.ok(s1.on === 'true' && s1.drums === 'false' && /rhythm guitar/i.test(s1.next), 'the tapped card is picked ' + s1.next);
    c.ok(!s1.prev || s1.prev.last == null || s1.prev.last.seat === 'rhythm', 'the preview is the rhythm seat ' + JSON.stringify(s1.prev && s1.prev.last));
    await page.waitForTimeout(400); await page.screenshot({ path: path.join(CACHE, shotName('seats.png')) });
    const st0 = await page.evaluate(() => window.__seat.stops);
    await tap(page, 'btn-back'); await waitScreen(page, 'intro');
    c.ok(await page.evaluate(n => window.__seat.stops > n, st0), 'leaving the picker stops the preview');
    await tap(page, 'btn-intro-next'); await waitScreen(page, 'seat');
    c.ok(await page.evaluate(() => document.querySelector('[data-testid="seat-rhythm"]').getAttribute('aria-pressed') === 'true'), 'back and forth keeps the pick (same band)');
    const st1 = await page.evaluate(() => window.__seat.stops);
    await tap(page, 'seat-next'); await waitScreen(page, 'logo');
    const s2 = await page.evaluate(() => window.__seat);
    c.ok(s2.stops > st1 && s2.picked.length === 1 && s2.picked[0].seat === 'rhythm' && s2.picked[0].swapped === 'rox', 'seat-next: preview stopped, seat:picked ' + JSON.stringify(s2.picked));
    await tap(page, 'btn-logo-done'); await waitScreen(page, 'creator');
    const head = await page.evaluate(() => document.querySelector('.screen-h') ? [...document.querySelectorAll('.screen-h')].pop().textContent : '');
    c.ok(/rhythm guitar\?/i.test(head), 'the creator asks for the seat: ' + head);
    bad = await audit(page); c.ok(!bad.length, 'creator layout ' + bad.join('; '));
    // v1.1 integration: Customize opens Lane C's "Your gear" tab for the seat picked on 'seat'; the pick reaches the career
    await tap(page, 'btn-customize'); await waitScreen(page, 'look');
    const lk = await page.evaluate(() => [...document.querySelectorAll('[data-testid^="lk-tab-"]')].map(e => e.dataset.testid));
    c.ok(lk.includes('lk-tab-gear') && !lk.includes('lk-tab-kit'), 'ui.openLook({ seat: rhythm }): "Your gear" replaces Kit ' + lk.join(','));
    await tap(page, 'lk-tab-gear'); await tap(page, 'lk-gear-shape-offset'); await tap(page, 'lk-done'); await waitScreen(page, 'creator');
    await page.fill(tid('creator-name'), 'Riff Raff');
    await tap(page, 'btn-create'); await waitScreen(page, 'coldopen');
    const st = await page.evaluate(() => { const s = GG.state; return { seat: s.seat, rox: s.members.find(m => m.id === 'rox').seatRole, lanes: GG.career.seatLanes(s), sl: s.gear.seatLanes, drummer: GG.career.drummerId(s), gl: s.player.gearLook }; });
    c.ok(st.seat === 'rhythm' && st.rox === 'drums/vocals' && st.drummer === 'rox' && st.sl && st.lanes === 4, 'a rhythm career: Rox drums and sings ' + JSON.stringify(st));
    c.ok(st.gl && st.gl.shape === 'offset', 'the creator\'s gear pick reaches player.gearLook ' + JSON.stringify(st.gl));
    // a second career through the same screens, left on Drums: v1.0's drummer
    await page.goto(url); await page.waitForSelector(tid('btn-new'));
    await tap(page, 'btn-new'); await tap(page, 'slot-2'); await waitScreen(page, 'genre');
    await tap(page, 'genre-metal'); await tap(page, 'btn-intro-next'); await waitScreen(page, 'seat');
    await tap(page, 'seat-next'); await waitScreen(page, 'logo'); await tap(page, 'btn-logo-done'); await waitScreen(page, 'creator');
    const h2 = await page.evaluate(() => [...document.querySelectorAll('.screen-h')].pop().textContent);
    c.ok(/Who's on drums\?/.test(h2), 'drums keeps the v1.0 heading: ' + h2);
    await page.fill(tid('creator-name'), 'Tanner'); await tap(page, 'btn-create'); await waitScreen(page, 'coldopen');
    const d = await page.evaluate(() => ({ seat: GG.state.seat, gear: GG.state.gear, swapped: GG.career.swapped(GG.state) }));
    c.ok(d.seat === 'drums' && d.swapped == null && JSON.stringify(d.gear) === JSON.stringify({ lanes: 4, doubleKick: false, owned: [], sections: [], quality: 0 }), 'the drum seat: nobody moves, v1.0 gear ' + JSON.stringify(d));
    // ?quick=1&seat=bass still quick-starts a bass career
    await page.goto(url + '?quick=1&seat=bass&band=hail_damage&seed=5');
    await page.waitForFunction(() => window.GG && GG.state, null, { timeout: 15000 });
    const q = await page.evaluate(() => ({ seat: GG.state.seat, kenji: GG.state.members.find(m => m.id === 'kenji').seatRole }));
    c.ok(q.seat === 'bass' && q.kenji === 'drums', '?quick=1&seat=bass ' + JSON.stringify(q));
    // v1.1 review: the laptop Band tab and card heads name your seat, and the swapped drummer's kit
    await toPlan(page);
    await page.evaluate(() => { GG.ui.closeAll(); GG.ui.show('laptop', { tab: 'band' }); });
    await waitScreen(page, 'laptop');
    await page.waitForSelector('.mem-card');
    const lb = await page.evaluate(() => ({ cards: [...document.querySelectorAll('.mem-card')].map(e => e.textContent), you: GG.ui.who('player').role, kenji: GG.ui.who('kenji').role }));
    const kc = lb.cards.find(t => /Kenji/.test(t)) || '';
    c.ok(lb.you === 'Bass (you)' && lb.kenji === 'drums', 'ui.who: you play bass, Kenji drums ' + JSON.stringify([lb.you, lb.kenji]));
    c.ok(lb.cards.some(t => /Bass · founder · unfireable/.test(t)) && !lb.cards.some(t => /Drums · founder/.test(t)), 'laptop Band tab: your row reads Bass, no Drums row');
    c.ok(/drums/.test(kc) && !/\bbass\b/.test(kc), 'laptop Band tab: Kenji is listed on drums ' + kc.slice(0, 80));
    bad = await audit(page); c.ok(!bad.length, 'laptop Band tab layout ' + bad.join('; '));
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'pick threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  await close();
  c.done();
}

/* ---- write: a rhythm part in the songwriter (v1.3: Quick song, then Tweak ✎ for your part) ------------------------------- */
async function write() {
  const c = checker('write');
  const { page, errors, close } = await open();
  try {
    await page.waitForSelector(tid('btn-new'));
    await page.evaluate(() => {
      GG.main.quickStart({ seed: 5150, bandId: 'grid_road_ramblers', seat: 'rhythm' });
      const A = GG.audio, p0 = A.play; window.__play = [];
      A.play = function (pat, o) { window.__play.push({ seat: o && o.seat, part: !!(o && o.part) }); return p0.apply(this, arguments); };
    });
    await toPlan(page);
    await tap(page, 'btn-primary'); await waitScreen(page, 'plan');
    for (const a of ['write', 'rehearse', 'rest']) await tap(page, 'act-' + a);
    await tap(page, 'btn-go'); await waitScreen(page, 'seq');
    const d0 = await page.evaluate(() => ({ dbg: GG.debug('seq') }));
    c.ok(d0.dbg.seat === 'rhythm' && d0.dbg.screen === 'quick' && d0.dbg.part && d0.dbg.part.seat === 'rhythm' && d0.dbg.part.v === 2, 'a rhythm Write opens Quick song with your (v2) rhythm part');
    let bad = await audit(page); c.ok(!bad.length, 'Quick song layout ' + bad.join('; '));
    await tap(page, 'btn-quick-tweak');
    const v0 = await page.evaluate(() => ({ dbg: GG.debug('seq'), cols: (document.querySelector('[data-testid="part-grid"]') || { dataset: {} }).dataset.lanes,
      drummer: (document.querySelector('[data-testid="seq-layer-drums"]') || {}).title || '', chords: (document.querySelector('[data-testid="seq-chords"]') || {}).textContent || '' }));
    c.ok(v0.dbg.layer === 'part' && v0.cols === '6' && /^Chords:/.test(v0.chords), 'Tweak: your verse on the 6-row rhythm grid + ' + v0.chords);
    c.ok(/Travis/.test(v0.drummer), 'Travis Lee is on the kit: ' + v0.drummer);
    const r0 = await page.evaluate(() => GG.ui.get('seq').data.pat.part.sections.verse.rows[1]);
    await page.locator(tid('part-cell-1-6')).click();
    const r1 = await page.evaluate(() => GG.ui.get('seq').data.pat.part.sections.verse.rows[1]);
    c.ok(r0 !== r1, 'a grid tap changes your open row ' + r0 + ' -> ' + r1);
    await tap(page, 'btn-seq-loop');
    await page.waitForFunction(() => GG.debug('seq').playing, null, { timeout: 5000 });
    const pl = await page.evaluate(() => window.__play[window.__play.length - 1]);
    c.ok(pl && pl.seat === 'rhythm' && pl.part, 'Loop plays your part ' + JSON.stringify(pl));
    await tap(page, 'btn-seq-loop');
    bad = await audit(page); c.ok(!bad.length, 'part editor layout ' + bad.join('; '));
    await tap(page, 'seq-tab-song');
    await page.locator(tid('seq-title-input')).fill('Idling Truck Blues');
    await tap(page, 'btn-seq-save');
    await waitScreen(page, 'results', 15000);
    const last = await page.evaluate(() => { const s = GG.state, x = s.songs[s.songs.length - 1], ch = GG.gig.chart(x, { seat: 'rhythm', genre: 'country', difficulty: 'normal' });
      return { title: x.title, part: x.pattern.part, open: x.pattern.part && x.pattern.part.sections.verse.rows[1], lane: ch.notes[0] && ch.notes[0].lane, seat: ch.seat }; });
    c.ok(last.title === 'Idling Truck Blues' && last.part && last.part.seat === 'rhythm' && last.open === r1, 'the song keeps the rhythm part you wrote');
    c.ok(last.seat === 'rhythm' && /^str\d$/.test(last.lane || ''), 'and charts on your string lanes ' + last.lane);
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'write threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  await close();
  c.done();
}

/* ---- gig: a rhythm gig through the real gig UI ---------------------------------------------------------------------- */
async function gig() {
  const c = checker('gig');
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
  }, [at, id]);
  const nextNote = () => page.waitForFunction(() => {
    const d = GG.debug('gigui'); if (d.mode !== 'play' || !d.soon) return null;
    for (const n of d.soon) if (!n.chord && !n.free && !n.run && n.t > d.songT + 0.6 && n.t + (n.len || 0) < d.dur - 1) return n;
    return null;
  }, null, { timeout: 15000 }).then(h => h.jsonValue());
  try {
    await page.waitForSelector(tid('btn-new'));
    await page.evaluate(() => {
      GG.ui.closeAll();
      GG.prefs.set({ gigDifficulty: 'normal', lefty: false, noFail: false });
      GG.main.quickStart({ seed: 3030, bandId: 'gravel_kings', seat: 'rhythm', openCard: false });
      const s = GG.state; s.card = null; s.phase = 'plan'; GG.ui.gigAutoplay = false;
      for (let i = 0; i < 2; i++) GG.songs.jam(s, GG.RNG(30 + i));
      const A = GG.audio, v = window.__v = { play: null, judge: [], hits: [] };
      const p0 = A.play; A.play = function (pat, o) { if (o && o.drums) v.play = { drums: o.drums, seat: o.seat, mute: o.mute }; return p0.apply(this, arguments); };
      const h0 = A.hit; A.hit = function (l) { v.hits.push(l); return h0.apply(this, arguments); };
      GG.on('gig:judge', p => v.judge.push(p.judgement));
      s.gig = GG.gig.makeGig(s, 'legion_63', 'book');
      window.__done = null;
      GG.ui.playGig(s.gig, r => { window.__done = r; });
    });
    await waitScreen(page, 'gig-set');
    let bad = await audit(page); c.ok(!bad.length, 'setlist layout ' + bad.join('; '));
    await tap(page, 'btn-gig-start');
    await page.waitForFunction(() => GG.debug('gigui').mode === 'play', null, { timeout: 8000 });
    const d0 = await dbg(page, 'gigui');
    c.ok(d0.seat === 'rhythm' && d0.lanes === 4, 'the string highway (' + d0.lanes + ' lanes, seat ' + d0.seat + ')');
    const pl = await page.evaluate(() => window.__v.play);
    c.ok(pl && pl.drums === true && pl.seat === 'rhythm' && Array.isArray(pl.mute) && pl.mute.includes('gtr2'), 'Chase drums for the band, your kinds muted ' + JSON.stringify(pl));
    let hit = 0;
    for (let k = 0; k < 3; k++) {
      const n = await nextNote();
      const r = await press(n.li, n.t, 30 + k);
      if (r && /^(perfect|good)$/.test(r.judgement)) hit++;
      if (n.hold) await lift(n.t + n.len + 0.05, 30 + k);
    }
    c.ok(hit === 3, 'three live taps judged on time (' + hit + '/3)');
    await page.screenshot({ path: path.join(CACHE, shotName('seats_gig.png')) });
    c.ok(await page.evaluate(() => window.__v.hits.filter(l => l !== 'hat').length === 0), 'your taps never play a drum');
    await page.evaluate(() => { GG.ui.gigAutoplay = { accuracy: 1, jitterMs: 0 }; });
    await page.waitForFunction(() => GG.debug('ui').screen === 'gig-results', null, { timeout: 60000 });
    bad = await audit(page); c.ok(!bad.length, 'results layout ' + bad.join('; '));
    await tap(page, 'btn-gig-done');
    await page.waitForFunction(() => window.__done, null, { timeout: 5000 });
    const dn = await page.evaluate(() => ({ seat: window.__done.songResults[0].seat, n: window.__done.songResults.length, acc: window.__done.songResults.slice(1).every(x => x.accuracy === 1) }));
    c.ok(dn.seat === 'rhythm' && dn.n >= 1 && dn.acc, 'the result carries the seat ' + JSON.stringify(dn));
    await page.evaluate(() => { GG.ui.gigAutoplay = false; });
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'gig threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  await close();
  c.done();
}

/* ---- studio: a lead take ---------------------------------------------------------------------------------------------- */
async function studio() {
  const c = checker('studio');
  const { page, errors, close } = await open();
  try {
    await page.waitForFunction(() => window.GG && GG.main && GG.ui && GG.labels && GG.labels.book, null, { timeout: 15000 });
    await page.evaluate(() => {
      GG.main.quickStart({ seed: 7171, bandId: 'frost_heave', seat: 'lead', openCard: false }); GG.ui.closeAll();
      const s = GG.state, rng = GG.RNG(17);
      s.totalWeek = 40; s.year = 2; s.week = 16; s.fans = 1500; s.protected = false; GG.career.setEra(s, 'local', 'test'); s.fund = 4000; s.drumSkill = 55;
      while (s.songs.length < 10) GG.songs.create(s, GG.songs.generate(s.genre, rng), null, { auto: true });
      s.labelOffers = [GG.labels.makeOffer(s, 'gopherwood', GG.RNG(4))]; GG.labels.sign(s, 'gopherwood');
      s.phase = 'plan'; GG.main.sync();
      GG.labels.book(s, { kind: 'ep', studioId: 'strip_mall_sound', producerId: 'solveig_birch', tracks: GG.labels.freshSongs(s).slice(0, 4).map(x => x.id), weeks: 2 });
      window.__charts = []; const ch0 = GG.gig.chart; GG.gig.chart = function (song, o) { const r = ch0.apply(this, arguments); window.__charts.push({ seat: r.seat, lane: r.notes[0] && r.notes[0].lane }); return r; };
      GG.ui.show('studio', {});
    });
    await waitScreen(page, 'studio');
    const head = await page.locator(tid('takes-head')).textContent(), first = await page.evaluate(() => GG.state.session.tracks[0]);
    c.ok(/^Guitar takes/.test(head), 'the studio says "Guitar takes": ' + head);
    c.ok(/🎸/.test(await page.locator(tid('btn-play-take-' + first)).textContent()), 'the take button plays your guitar');
    const bad = await audit(page); c.ok(!bad.length, 'studio layout ' + bad.join('; '));
    await page.evaluate(() => { GG.ui.gigAutoplay = { accuracy: 0.97, jitterMs: 10 }; });
    await tap(page, 'btn-play-take-' + first);
    await page.waitForFunction(id => (GG.state.session.takes[id] || 0) > 0, first, { timeout: 20000 });
    await page.waitForFunction(() => !GG.ui.isOpen('gig') && GG.ui.isOpen('studio'), null, { timeout: 15000 });
    const t = await page.evaluate(id => ({ take: GG.state.session.takes[id], live: GG.state.liveGig, chart: window.__charts.slice(-1)[0] }), first);
    c.ok(t.take > 60 && !t.live, 'a lead take counts (' + t.take + ')');
    c.ok(t.chart && t.chart.seat === 'lead' && /^str\d$/.test(t.chart.lane || ''), 'the take ran the lead chart ' + JSON.stringify(t.chart));
    await page.evaluate(() => { GG.ui.gigAutoplay = false; });
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'studio threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  await close();
  c.done();
}

/* ---- shop: the rhythm seat's gear line -------------------------------------------------------------------------------- */
async function shop() {
  const c = checker('shop');
  const { page, errors, close } = await open();
  try {
    await page.waitForSelector(tid('btn-new'), { timeout: 20000 });
    // v1.3.1: per seat, the garage label and the sketch pad's header button open your seat's shop
    for (const seat of ['drums', 'bass', 'rhythm', 'lead']) {
      const g = await page.evaluate(seat => {
        GG.ui.closeAll(); GG.main.quickStart({ seed: 808, bandId: 'hail_damage', seat, openCard: false }); GG.ui.closeAll();
        const s = GG.state; s.card = null; s.phase = 'plan'; GG.main.sync();
        const want = GG.career.seatOf(s) === 'drums' ? 'Drum shop' : GG.ui.cap(GG.career.tokenValue(s, 'instrument')) + ' shop';
        const d = GG.debug('render'), box = d && d.available ? (d.labelBox || []).find(b => b.action === 'shop') : null;
        GG.emit('hotspot', { action: 'shop' });
        const head = (document.querySelector('.sheet.shop .sheet-head') || {}).textContent || '';
        return { want, avail: !!(d && d.available), box, hs: d && d.hotspots, screen: GG.debug('ui').screen, head };
      }, seat);
      c.ok(!g.avail || (g.box && g.hs.includes('shop')), seat + ': the garage has the Gear shop label ' + JSON.stringify(g.box));
      c.ok(g.screen === 'gear' && g.head.includes(g.want), seat + ': the Gear shop hotspot opens "' + g.want + '" ' + JSON.stringify([g.screen, g.head.slice(0, 40)]));
      await page.evaluate(() => { GG.ui.closeAll(); GG.ui.openSketch(); });
      await waitScreen(page, 'seq');
      const aria = await page.locator(tid('btn-seq-shop')).getAttribute('aria-label');
      await openTools(page);
      const row = (await page.locator(tid('btn-kit-shop')).textContent()).trim();
      await tap(page, 'btn-seq-tools-cancel');
      c.ok(aria === g.want && row.includes(g.want), seat + ': the sketch pad header button "' + aria + '" = the ⋯ row "' + row + '"');
      await tap(page, 'btn-seq-shop'); await waitScreen(page, 'gear');
      c.ok((await page.locator('.sheet.shop .sheet-head').textContent()).includes(g.want), seat + ': the header button opens "' + g.want + '"');
      const bad = await audit(page); c.ok(!bad.length, seat + ': shop layout ' + bad.join('; '));
    }
    await page.evaluate(() => {
      GG.ui.closeAll();
      GG.main.quickStart({ seed: 808, bandId: 'hail_damage', seat: 'rhythm', openCard: false });
      GG.ui.closeAll();
      const s = GG.state; s.card = null; s.phase = 'plan'; s.fund = 20000; s.era = 'local'; s.protected = false;
      if (!s.eraHistory.some(x => x.era === 'local')) s.eraHistory.push({ era: 'local', week: 1 });
      GG.main.sync();
      GG.ui.openSketch();
    });
    await waitScreen(page, 'seq');
    await openTools(page);   // v1.3: the shop lives in the songwriter's ⋯ menu
    const shopBtn = await page.locator(tid('btn-kit-shop')).textContent();
    c.ok(/Guitar shop/.test(shopBtn), 'the sketch pad opens the guitar shop: ' + shopBtn);
    await tap(page, 'btn-kit-shop'); await waitScreen(page, 'gear');
    const g0 = await page.evaluate(() => {
      const st = JSON.parse(JSON.stringify(GG.state)); st.seat = 'drums';
      return { items: GG.shop.gearItems(GG.state).map(x => ({ id: x.id, name: x.name, cost: x.cost })), drum: GG.shop.gearItems(st).map(x => ({ id: x.id, name: x.name, cost: x.cost })),
        text: document.querySelector('.sheet.shop') ? document.querySelector('.sheet.shop').textContent : document.body.textContent };
    });
    c.ok(g0.items.length === g0.drum.length && g0.items.every((x, i) => x.cost === g0.drum[i].cost && x.name !== g0.drum[i].name), 'drum prices, your own names ' + g0.items.map(x => x.name + ' $' + x.cost).join(' · '));
    c.ok(!/\b(sticks|toms|cymbal|snare)\b/i.test(g0.items.map(x => x.name).join(' ')) && !/\bgong\b/i.test(g0.text.replace(/Global Gong/gi, '')), 'no drum names, no gong');
    const bad = await audit(page); c.ok(!bad.length, 'shop layout ' + bad.join('; '));
    const chat0 = await page.evaluate(() => GG.state.chat.length);
    await tap(page, 'gear-buy-toms');
    const b1 = await page.evaluate(() => ({ seat: GG.career.seatLanes(GG.state), kit: GG.state.gear.lanes, chat: GG.state.chat.slice(-1)[0], n: GG.state.chat.length, drummer: GG.career.drummerId(GG.state) }));
    c.ok(b1.seat === 5 && b1.kit === 5, 'one buy: lane 5 on your highway and the band’s kit ' + JSON.stringify([b1.seat, b1.kit]));
    c.ok(b1.drummer === 'jaxon' && b1.n > chat0 && b1.chat && b1.chat.who === 'jaxon', 'Jaxon, on the kit, posts about his new drum ' + JSON.stringify(b1.chat));
    await tap(page, 'btn-gear-done');
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'shop threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  await close();
  c.done();
}

/* ---- garage / stage: Lane C's render (skip with a log line until it is merged) ---------------------------------------- */
async function garage() {
  const c = checker('garage');
  const { page, errors, close } = await open();
  try {
    await page.waitForSelector(tid('btn-new'));
    const has = await page.evaluate(() => !!(GG.render && (GG.render.seatGear || GG.render.instrument)));
    c.ok(has, 'GG.render.seatGear / R.instrument (Lane C)');
    for (const [band, seat, drummer] of [['hail_damage', 'bass', 'kenji'], ['gravel_kings', 'rhythm', 'chase'], ['grid_road_ramblers', 'lead', 'earl']]) {
      await page.evaluate(([band, seat]) => { GG.ui.closeAll(); GG.main.quickStart({ seed: 11, bandId: band, seat, openCard: false }); GG.ui.closeAll(); }, [band, seat]);
      await page.waitForTimeout(1200);
      const g = await page.evaluate(() => { const d = GG.debug('render'); return { scene: d.scene, seat: d.seat || null, available: d.available }; });
      if (!g.available) { console.log('SKIP garage: no WebGL in this browser'); break; }
      if (!g.seat || !('rig' in g.seat)) { c.ok(false, 'the garage has no seat debug (Lane C) ' + JSON.stringify(g)); break; }
      c.ok(g.seat.seat === seat && g.seat.rig && g.seat.drummer === drummer, band + '/' + seat + ': ' + drummer + ' at the kit, your rig ' + JSON.stringify(g.seat));
      c.ok(!g.seat.label || /Your rig/.test(g.seat.label), band + '/' + seat + ': the kit hotspot reads "Your rig" ' + g.seat.label);
      await page.screenshot({ path: path.join(CACHE, shotName('seats_garage_' + seat + '.png')) });
      // Lane A's strict seat leak scan (tests/seat_scan.js) over the week UI's visible text on this string seat
      const lines = await page.evaluate(() => (document.body.innerText || '').split(/\n+/).map(t => t.trim()).filter(Boolean));
      const leaks = lines.map(t => [t, SCAN.leak(t, AWARE)]).filter(x => x[1]);
      c.ok(!leaks.length, band + '/' + seat + ': no drum words aimed at you in the week UI ' + JSON.stringify(leaks.slice(0, 3)));
    }
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'garage threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  await close();
  c.done();
}

async function stage() {
  const c = checker('stage');
  const { page, errors, close } = await open();
  try {
    await page.waitForSelector(tid('btn-new'));
    await page.evaluate(() => {
      GG.ui.closeAll(); GG.prefs.set({ gigDifficulty: 'easy' });
      GG.main.quickStart({ seed: 4040, bandId: 'frost_heave', seat: 'lead', openCard: false });
      const s = GG.state; s.card = null; s.phase = 'plan'; GG.ui.gigAutoplay = false;
      s.gig = GG.gig.makeGig(s, 'legion_63', 'book'); window.__done = null;
      GG.ui.playGig(s.gig, r => { window.__done = r; });
    });
    await waitScreen(page, 'gig-set');
    await page.waitForTimeout(800);
    const info = await page.evaluate(() => GG.render && GG.render.stage && GG.render.stage.info ? GG.render.stage.info() : null);
    c.ok(info.seat === 'lead' && info.view === 'spot', 'the lead seat stands at its spot ' + JSON.stringify({ seat: info.seat, view: info.view }));
    c.ok(info.drummer === 'benny' || (info.drummer && info.drummer.id === 'benny'), 'Benny on the riser ' + JSON.stringify(info.drummer));
    c.ok(info.you && info.you.seat === 'lead' && !!info.you.gear && info.camera === 'spot', 'you stand with your instrument, over-the-shoulder camera ' + JSON.stringify({ you: info.you, camera: info.camera }));
    await page.screenshot({ path: path.join(CACHE, shotName('seats_stage.png')) });
    await page.evaluate(() => { GG.ui.gigAutoplay = { accuracy: 1, jitterMs: 0 }; });
    await tap(page, 'btn-gig-start');
    await page.waitForFunction(() => GG.debug('ui').screen === 'gig-results', null, { timeout: 60000 });
    await page.evaluate(() => { GG.ui.gigAutoplay = false; });
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'stage threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  await close();
  c.done();
}

(async () => {
  if (want('pick')) await pick();
  if (want('write')) await write();
  if (want('gig')) await gig();
  if (want('studio')) await studio();
  if (want('shop')) await shop();
  if (want('garage')) await garage();
  if (want('stage')) await stage();
})();
