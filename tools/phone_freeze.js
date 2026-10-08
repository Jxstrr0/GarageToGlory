// tools/phone_freeze.js (v1.5 "Desktop" stage 0, lead): the phone freeze. Walks the game's phone screens in a phone context
// (tests/_pw.js: isMobile + hasTouch) and records the layout facts the v1.5 lanes must never change on a phone:
//   per screen (once every finite animation is done; infinite ones are held at 0, finite leftovers at their end):
//   html.className, the page + body scroll size, the data-testid of document.activeElement, and for every rendered
//   [data-testid], .layer, .sheet, .sheet-body, .modal-body, .full-body, .full-foot, .hud-bar, .dock, canvas, gig-* element and
//   the containers the wide rules aim at (.full, .modal, .scrim, .sheet-head/-grip, .title-wrap, .lt-tabs, .tw-map, .tut-card):
//   rect (0.5 px), display, font-size, padding, grid-template-columns, outline-style + width, box-shadow, opacity,
//   visibility, transform, z-index (+ the scroll offset / height of a scrolling one). No text (the version label changes).
//   + debug('render').insets; garage screens: R.hotspotScreenPos for every C.HOTSPOTS entry (1 px; every prop point seen in 8
//   reads, since a bandmate walking in front flips a hotspot to its label) + debug('render').labelBox (camera at rest);
//   gig screens: debug('gigui').lanes, the highway's CSS size / lane width / backing size + the last stage.setFrame args.
// The page's Date is pinned to 2026-10-07 12:00 UTC (it still ticks; dates on screen never move a rect between days).
// Sizes (PW_VIEW): 390x844 -> tests/fixtures/phone_freeze_390.json, 440x956 -> _440.json, 844x390 -> _844l.json (the landscape
// phone: garage, gig, settings only). tests/pw_freeze.js recomputes and compares (in the pw matrix forever).
// Run: node build.js && PW_VIEW=390x844 timeout 500 node tools/phone_freeze.js [--write] [--only=<screen,...>]
// Never edit a fixture to make a lane pass: a fixture change needs the lead and a logged reason (plan/status.md).
const fs = require('fs'), path = require('path');
const { open, ROOT } = require('../tests/_pw');

const SIZES = { '390': { width: 390, height: 844 }, '440': { width: 440, height: 956 }, '844l': { width: 844, height: 390 } };
const tagOf = v => Object.keys(SIZES).find(k => SIZES[k].width === v.width && SIZES[k].height === v.height) || null;
const fixturePath = tag => path.join(ROOT, 'tests', 'fixtures', 'phone_freeze_' + tag + '.json');
const PIN = Date.UTC(2026, 9, 7, 12, 0, 0);

// ---- in the page ----------------------------------------------------------------------------------------------------
function PROBE(o) {
  const H = v => Math.round(v * 2) / 2;
  const held = [];
  for (const a of document.getAnimations()) {
    if (a.playState !== 'running') continue;
    const inf = !isFinite(a.effect.getTiming().iterations);
    held.push([a, a.currentTime]);
    try { a.pause(); a.currentTime = inf ? 0 : a.effect.getComputedTiming().endTime; } catch (e) { /* ignore */ }
  }
  try {
    const de = document.documentElement, b = document.body, ae = document.activeElement;
    const out = { html: de.className, scroll: [de.scrollWidth, de.scrollHeight, b.scrollWidth, b.scrollHeight].join(' '),
      active: ae && ae !== b ? (ae.getAttribute('data-testid') || ae.tagName.toLowerCase()) : '', els: {} };
    // + the containers the v1.5 wide rules aim at, and every gig-* element (the gig screen has few test ids)
    const CLS = ['layer', 'sheet', 'sheet-body', 'modal-body', 'full', 'full-body', 'full-foot', 'hud-bar', 'dock', 'sheet-head', 'sheet-grip',
      'modal', 'scrim', 'title-wrap', 'lt-tabs', 'tw-map', 'tut-card', 'set-slot'];
    const SEL = '[data-testid], canvas, [class^="gig-"], [class*=" gig-"], ' + CLS.map(c => '.' + c).join(', ');
    const DEF = ['', '', '0px', 'none', 'none', '0px', 'none', '1', 'visible', 'none', 'auto'];
    const seen = {};
    for (const e of document.querySelectorAll(SEL)) {
      if (!e.getClientRects().length) continue;
      const tid = e.getAttribute('data-testid');
      const own = CLS.filter(c => e.classList.contains(c)), gc = [...e.classList].find(c => c.startsWith('gig-'));
      let k = tid || (e.tagName === 'CANVAS' ? 'canvas' : '.' + (own.length ? own.join('.') : gc));
      if (!tid && e.dataset && e.dataset.screen) k += '[' + e.dataset.screen + ']';
      const n = seen[k] = (seen[k] || 0) + 1;
      if (n > 1) k += '~' + n;
      const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
      const v = [cs.display, cs.fontSize, cs.padding, cs.gridTemplateColumns, cs.outlineStyle, cs.outlineWidth, cs.boxShadow, cs.opacity,
        cs.visibility, cs.transform, cs.zIndex].map((x, i) => (i > 1 && x === DEF[i] ? '' : x));
      if (/(auto|scroll)/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 1) v.push('sc ' + Math.round(e.scrollTop) + '/' + e.scrollHeight);
      while (v.length && v[v.length - 1] === '') v.pop();
      out.els[k] = [H(r.left), H(r.top), H(r.width), H(r.height)].join(' ') + '|' + v.join('|');
    }
    const d = GG.debug('render') || {};
    out.render = { insets: d.insets || null };
    if (o.garage) {
      out.labelBox = (d.labelBox || []).map(x => x.action + ' ' + [x.x, x.y, x.w, x.h].join(','));
    }
    if (o.gig) {
      const g = GG.debug('gigui') || {}, cv = document.querySelector('[data-testid="gig-highway"]');
      out.gig = { lanes: g.lanes, css: cv ? H(cv.clientWidth) + 'x' + H(cv.clientHeight) : null, laneW: cv && g.lanes ? H(cv.clientWidth / g.lanes) : null,
        backing: cv ? cv.width + 'x' + cv.height : null, frame: window.__ggFrame ? JSON.stringify(window.__ggFrame) : null };
    }
    return out;
  } finally {
    for (const [a, t] of held) { try { a.currentTime = t; a.play(); } catch (e) { /* ignore */ } }
  }
}

// ---- the walk -------------------------------------------------------------------------------------------------------
async function capture(tag, opts) {
  opts = opts || {};
  const view = SIZES[tag];
  if (!view) throw new Error('phone_freeze: unknown size ' + tag);
  const only = opts.only ? new Set(opts.only) : null, log = opts.log || (() => {});
  const { page, context, errors, close, url } = await open({ noGoto: true, viewport: view });
  const screens = {}, skipped = [];
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const screen = () => ev(() => GG.debug('ui').screen);
  const waitScreen = (id, t) => page.waitForFunction(i => GG.debug('ui').screen === i, id, { timeout: t || 15000 });
  const tap = async id => {
    await page.waitForSelector('[data-testid="' + id + '"]', { timeout: 15000 });
    await ev(i => { const n = [...document.querySelectorAll('[data-testid="' + i + '"]')].pop(); n.click(); }, id);
  };
  const settleAnims = () => page.waitForFunction(() => document.getAnimations().every(a => a.playState !== 'running' || !isFinite(a.effect.getTiming().iterations)), null, { timeout: 8000 }).catch(() => {});
  const labels = () => ev(() => JSON.stringify((GG.debug('render').labelBox || []).map(x => [x.x, x.y])));
  const settle3d = async () => {   // the garage camera / labels at rest: three equal readings 300 ms apart
    let last = null, same = 0;
    await page.waitForTimeout(600);
    for (let k = 0; k < 30 && same < 2; k++) {
      const cur = await labels();
      same = cur === last ? same + 1 : 0;
      last = cur; await page.waitForTimeout(300);
    }
  };
  // A hotspot's point is its prop, or its label while a bandmate stands in front: 8 reads keep every prop point seen; a read
  // on the label itself ('L', within 2 px of its labelBox centre) is noted only (labelBox is compared on its own).
  const hotspots = async () => {
    const seen = {};
    for (let k = 0; k < 8; k++) {
      const r = await ev(() => { const lb = {}; for (const x of GG.debug('render').labelBox || []) lb[x.action] = x;
        return GG.contracts.HOTSPOTS.map(a => { const p = GG.render.hotspotScreenPos(a), l = lb[a];
          if (!p) return [a, '-'];
          const x = Math.round(p.x), y = Math.round(p.y);
          return [a, l && l.x != null && Math.abs(l.x - x) <= 2 && Math.abs(l.y - y) <= 2 ? 'L' : x + ',' + y]; }); });
      for (const [a, p] of r) (seen[a] = seen[a] || new Set()).add(p);
      await page.waitForTimeout(150);
    }
    return Object.keys(seen).map(a => a + ' ' + [...seen[a]].sort().join(' '));
  };
  const snap = async (name, o) => {
    o = o || {};
    if (only && !only.has(name)) return;
    await ev(() => { if (GG.ui.clearToasts) GG.ui.clearToasts(); });
    await page.waitForTimeout(o.wait == null ? 450 : o.wait);
    if (!o.now) await settleAnims();
    for (let attempt = 0; attempt < 5; attempt++) {
      if (o.garage) await settle3d();
      screens[name] = await ev(PROBE, { garage: !!o.garage, gig: !!o.gig });
      if (!o.garage) break;
      screens[name].hot = await hotspots();
      const lb = await labels();   // the camera did not move while we read: else read again
      if (lb === JSON.stringify(screens[name].labelBox.map(x => x.split(' ')[1].split(',').slice(0, 2).map(v => v === '' || v === 'null' ? null : +v)))) break;
    }
    screens[name].screen = await screen();
    log(name.padEnd(18) + ' ' + screens[name].screen + ' · ' + Object.keys(screens[name].els).length + ' els');
  };
  const big = b => ev(x => GG.prefs.set({ bigText: x }), b);
  const land = tag === '844l';
  try {
    await context.addInitScript(pin => {   // the calendar date is fixed; time still flows (deltas unchanged)
      const D = Date, off = pin - D.now();
      class FD extends D { constructor(...a) { if (a.length) super(...a); else super(D.now() + off); } static now() { return D.now() + off; } }
      window.Date = FD;
    }, PIN);
    await page.goto(url);
    await page.waitForSelector('[data-testid="btn-new"]', { timeout: 60000 });
    await ev(() => { GG.prefs.set({ calibSeen: true, bigText: false }); GG.ui.rng = GG.RNG(1505); });   // ui.rng is seeded by the clock
    await ev(() => { const st = GG.render && GG.render.stage; if (st && st.setFrame && !st.__ggWrapped) { const f = st.setFrame; st.setFrame = function (o) { window.__ggFrame = Object.assign({}, o); return f.apply(this, arguments); }; st.__ggWrapped = true; } });

    if (!land) {
      // ---- title + the new-career flow (title, slots, genre, intro, seat, logo, creator, look) ----
      await snap('title');
      await tap('btn-new');
      await page.waitForFunction(() => ['slots', 'genre'].includes(GG.debug('ui').screen), null, { timeout: 15000 });
      if (await screen() === 'slots') { await snap('slots'); await tap('slot-3'); }
      await waitScreen('genre'); await snap('genre');
      await tap('genre-punk'); await waitScreen('intro'); await snap('intro');
      await tap('btn-intro-next'); await waitScreen('seat'); await snap('seat');
      await tap('seat-bass'); await ev(() => GG.audio && GG.audio.stopPreview && GG.audio.stopPreview());
      await tap('seat-next'); await waitScreen('logo'); await snap('logo');
      await tap('btn-logo-done'); await waitScreen('creator'); await snap('creator');
      await tap('btn-customize'); await waitScreen('look'); await snap('look');
      await ev(() => { GG.ui.closeAll(); GG.main.quitToTitle(); });
      await page.waitForSelector('[data-testid="btn-new"]', { timeout: 15000 });
    }

    // ---- the main career: Hail Damage, drums ----
    await ev(() => GG.main.quickStart({ seed: 4242, slot: '1', bandId: 'hail_damage' }));
    await page.waitForFunction(() => GG.state && (GG.state.phase === 'plan' || GG.debug('ui').screen === 'card'), null, { timeout: 15000 });
    if (await screen() === 'card') {
      if (!land) await snap('monday_card');
      await tap('choice-0'); await tap('btn-card-ok');
    }
    await page.waitForFunction(() => GG.state.phase === 'plan', null, { timeout: 15000 });
    await ev(() => { GG.ui.closeAll(); GG.main.sync && GG.main.sync(); });
    await snap('garage', { garage: true, wait: 800 });
    if (!land) {
      await ev(() => GG.ui.openPlanner()); await waitScreen('plan'); await snap('plan', { garage: true });
      await ev(() => { GG.ui.closeAll(); GG.ui.show('menu'); }); await waitScreen('menu'); await snap('menu');
      await ev(() => { GG.ui.closeAll(); GG.ui.confirm({ text: 'Quit to the title?', yes: 'Quit', no: 'Stay' }); }); await waitScreen('confirm'); await snap('confirm');
      await tap('btn-confirm-no');
      await ev(() => { GG.ui.closeAll(); GG.ui.show('laptop'); }); await waitScreen('laptop');
      await tap('laptop-tab-band'); await snap('laptop_band');
      await tap('laptop-tab-trophies'); await snap('laptop_trophies');
      await ev(() => { GG.ui.closeAll(); GG.ui.openGear(); }); await waitScreen('gear'); await snap('shop_gear');
      await ev(() => { GG.ui.closeAll(); GG.ui.openMerch(); }); await waitScreen('merch'); await snap('shop_merch');
      await ev(() => { GG.ui.closeAll(); GG.ui.openBoard({ mode: 'view' }); }); await waitScreen('board'); await snap('board');
      await ev(() => { GG.ui.closeAll(); GG.ui.showVan('van'); }); await waitScreen('van-info'); await snap('van_info');
    }
    for (const tab of [null, 'play', 'audio', 'look']) {
      if (land && tab) continue;
      await ev(t => { GG.ui.closeAll(); GG.ui.show('settings', t ? { tab: t } : {}); }, tab); await waitScreen('settings');
      await snap('settings' + (tab ? '_' + tab : ''));
    }
    if (!land) {
      await ev(() => { GG.ui.closeAll(); GG.ui.show('calib', { profile: GG.prefs.get().audioProfile }); }); await waitScreen('calib'); await snap('calib');
      await ev(() => GG.ui.closeAll());
      await ev(() => GG.ui.openSketch()); await waitScreen('seq'); await snap('seq_quick');
      await tap('btn-quick-tweak'); await page.waitForFunction(() => !document.querySelector('[data-testid="btn-quick-tweak"]'), null, { timeout: 15000 }).catch(() => {});
      await snap('seq_editor');
      await ev(() => GG.ui.closeAll());
      // Bigger text: settings, the plan sheet, the songwriter editor (the setlist below)
      await big(true);
      await ev(() => GG.ui.show('settings')); await waitScreen('settings'); await snap('big_settings');
      await ev(() => { GG.ui.closeAll(); GG.ui.openPlanner(); }); await waitScreen('plan'); await snap('big_plan', { garage: true });
      await ev(() => { GG.ui.closeAll(); GG.ui.openSketch(); }); await waitScreen('seq');
      if (await ev(() => !!document.querySelector('[data-testid="btn-quick-tweak"]'))) await tap('btn-quick-tweak');
      await snap('big_seq_editor');
      await ev(() => GG.ui.closeAll()); await big(false);
      // the week's results (rest x3), then the wrap
      await ev(() => { const s = GG.state; GG.ui.closeAll(); GG.career.setPlan(s, ['rest', 'rest', 'rest']); s.gig = null; const r = GG.career.runWeek(s); GG.main.sync(); GG.ui.show('results', { result: r }); });
      await waitScreen('results'); await snap('results');
      await ev(() => { GG.ui.closeAll(); GG.main.wrapWeek(); }); await waitScreen('wrap'); await snap('wrap');
      await ev(() => { GG.ui.closeAll(); GG.main.nextWeek(); GG.ui.closeAll(); const s = GG.state; if (s.phase === 'monday') { GG.career.startWeek(s); if (s.card && !s.card.resolved) GG.career.resolveCard(s, 0); } GG.main.sync(); GG.ui.closeAll(); });
    }

    // ---- a live gig: setlist, count-in, play, pause card, between card, results ----
    const startGig = () => ev(() => { const s = GG.state; GG.ui.closeAll(); s.card = null; s.phase = 'plan'; s.fund = Math.max(s.fund, 2000);
      while (s.songs.length < 4) GG.songs.jam(s, GG.RNG(40 + s.songs.length));
      s.gig = GG.gig.makeGig(s, GG.content.venues[0].id, 'book'); GG.ui.gigAutoplay = false; GG.ui.playGig(s.gig, () => {}); });
    if (!land) {
      await big(true); await startGig(); await waitScreen('gig-set', 30000); await snap('big_gig_set', { gig: true });
      await ev(() => GG.ui.closeAll()); await big(false);
    }
    await startGig(); await waitScreen('gig-set', 30000);
    if (!land) await snap('gig_set', { gig: true });
    await tap('btn-gig-start');
    if (!land) {
      await page.waitForFunction(() => GG.debug('gigui').mode === 'count', null, { timeout: 15000 });
      await page.waitForFunction(() => window.__ggFrame && (GG.debug('render').insets || {}).bottom !== -1, null, { timeout: 3000 }).catch(() => {});
      await snap('gig_count', { gig: true, wait: 0, now: true });
    }
    await page.waitForFunction(() => GG.debug('gigui').mode === 'play', null, { timeout: 20000 });
    await snap('gig_play', { gig: true, wait: 0, now: true });
    await tap('btn-gig-pause'); await page.waitForFunction(() => GG.debug('gigui').paused, null, { timeout: 5000 });
    if (!land) {
      await snap('gig_pause', { gig: true });
      // the between card: the bot plays the rest of song 1 on resume; the next song's 30 ms timer is held
      await ev(() => { const st0 = window.setTimeout; window.__ggST = st0;
        window.setTimeout = function (fn, ms) { if (fn && fn.name === 'nextSong' && !window.__ggNext) { window.__ggNext = fn; return 0; } return st0.apply(this, arguments); };
        GG.ui.gigAutoplay = { accuracy: 1, jitterMs: 0 }; });
      await tap('btn-gig-resume');
      await page.waitForFunction(() => GG.debug('gigui').mode === 'between' && window.__ggNext, null, { timeout: 15000 });
      await ev(() => { GG.ui.gigAutoplay = false; window.setTimeout = window.__ggST; });
      await snap('gig_between', { gig: true });
      await ev(() => { GG.ui.gigAutoplay = true; });
      await tap('btn-gig-next');
      await waitScreen('gig-results', 30000);
      await ev(() => { GG.ui.gigAutoplay = false; });
      await snap('gig_results', { gig: true, wait: 900 });
    }
    await ev(() => { GG.ui.closeAll(); GG.ui.gigAutoplay = false; });

    if (!land) {
      // ---- van + road: a drive with a road card ----
      await ev(() => { const s = GG.state, W = GG.world; GG.ui.closeAll(); s.phase = 'gig';
        s.gig = W.makeListing(s, GG.gig.venue('craigs_basement'), GG.RNG(1), {}); s.trip = null;
        const t = W.startTrip(s); t.cardId = 'road_van_noise'; t.resolved = false;
        window.__vanDone = null; GG.ui.playVan(s.gig, () => { window.__vanDone = 1; }); });
      await waitScreen('road', 30000); await snap('road');
      await tap('road-choice-0'); await tap('btn-road-ok');
      await page.waitForFunction(() => window.__vanDone, null, { timeout: 30000 }).catch(() => {});
      await ev(() => GG.ui.closeAll());
      // ---- the year's recap, the ending, the Hall of Fame ----
      await ev(() => { const s = GG.state; GG.ui.closeAll(); s.card = null; s.phase = 'monday'; s.weekStart = null; s.gig = null; s.trip = null;
        for (let i = 0; i < 30 && s.week !== 24; i++) GG.career.botWeek(s, 'avg');
        if (s.phase !== 'ended') { s.card = null; s.phase = 'plan'; GG.career.setPlan(s, ['rest', 'rest', 'rest']); s.gig = null; s.offer = null; GG.career.runWeek(s, { autoGig: true }); GG.career.endWeek(s); }
        GG.ui.closeAll(); GG.main.sync();
        const y = (GG.recap.list(s).slice(-1)[0] || {}).y; if (y) GG.ui.openRecap(y); });
      await waitScreen('recap'); await snap('recap', { wait: 900 });
      await ev(() => { GG.ui.closeAll(); GG.ui.show('end'); GG.ui.endGo(0); }); await waitScreen('end'); await snap('end_0', { wait: 700 });
      await ev(() => GG.ui.endGo('final')); await snap('end_final', { wait: 700 });
      await ev(() => { GG.ui.closeAll(); GG.meta.enabled = true; GG.meta.recordCareer(GG.state); GG.ui.show('hof'); }); await waitScreen('hof'); await snap('hof');
      await ev(() => { GG.ui.closeAll(); GG.main.quitToTitle(); });
      await page.waitForSelector('[data-testid="btn-new"]', { timeout: 15000 });
    }

    // ---- a 5-lane bass gig ----
    if (!land) {
      await ev(() => { GG.main.quickStart({ seed: 4242, slot: '2', bandId: 'hail_damage', seat: 'bass', openCard: false }); GG.ui.closeAll();
        const s = GG.state; s.gear.seatLanes = Object.assign({}, s.gear.seatLanes, { bass: 5 }); s.card = null; s.phase = 'plan'; GG.main.sync(); });
      await startGig(); await waitScreen('gig-set', 30000);
      await tap('btn-gig-start');
      await page.waitForFunction(() => GG.debug('gigui').mode === 'play', null, { timeout: 20000 });
      await snap('gig_bass5', { gig: true, wait: 0, now: true });
      await ev(() => { GG.ui.closeAll(); GG.main.quitToTitle(); });
      await page.waitForSelector('[data-testid="btn-new"]', { timeout: 15000 });

      // ---- the world: map, region, package, homecoming; a label offer ----
      await ev(() => { GG.main.quickStart({ seed: 707, slot: '2', openCard: false, bandId: 'hail_damage' }); GG.ui.closeAll();
        const s = GG.state, tw = 125; s.totalWeek = tw; s.year = Math.floor((tw - 1) / 24) + 1; s.week = (tw - 1) % 24 + 1;
        Object.assign(s, { era: 'world', protected: false, fans: 24000, fund: 60000, buzz: 60, phase: 'monday', gig: null, weekStart: null, card: null, offer: null });
        s.eraHistory.push({ era: 'local', week: 20 }, { era: 'signed', week: 40 }, { era: 'world', week: tw - 25 });
        s.milestones.worldReady = tw - 25; GG.tour.ensure(s); GG.tour.unlock(s, 'uk_europe', 'fans'); GG.main.sync(); GG.ui.closeAll(); });
      await ev(() => GG.ui.openWorld()); await waitScreen('world'); await snap('world');
      await tap('region-open-uk_europe'); await waitScreen('tour-region'); await snap('tour_region', { wait: 900 });
      await tap('pkg-open-uk_pub_crawl'); await waitScreen('tour-pkg'); await snap('tour_pkg');
      await ev(() => { GG.ui.closeAll(); GG.ui.show('tour-home', { summary: { id: 'freeze', region: 'uk_europe', gigs: 6, festivals: 1, best: 'Berlin', fans: 4200, pay: 12000, cost: 9000, net: 3000, start: 0 } }); });
      await waitScreen('tour-home'); await snap('tour_home');
      await ev(() => { GG.ui.closeAll(); const s = GG.state; s.label = null; if (s.flags) s.flags.label = null; s.labelOffers = [GG.labels.makeOffer(s, 'monolith', GG.RNG(1)), GG.labels.makeOffer(s, 'gopherwood', GG.RNG(2))]; GG.main.sync(); GG.ui.openOffers('monolith'); });
      await waitScreen('label-offer'); await snap('label_offer');
      await ev(() => { GG.ui.closeAll(); GG.main.quitToTitle(); });
      await page.waitForSelector('[data-testid="btn-new"]', { timeout: 15000 });

      // ---- the studio (a booked EP session) ----
      await ev(() => { GG.main.quickStart({ seed: 6161, slot: '2', bandId: 'hail_damage', openCard: false }); GG.ui.closeAll();
        const s = GG.state, rng = GG.RNG(99);
        s.totalWeek = 40; s.year = 2; s.week = 16; s.fans = 1500; s.protected = false; GG.career.setEra(s, 'local', 'test'); s.fund = 4000; s.drumSkill = 55;
        while (s.songs.length < 10) GG.songs.create(s, GG.songs.generate(s.genre, rng), null, { auto: true });
        s.labelOffers = [GG.labels.makeOffer(s, 'gopherwood', GG.RNG(4))]; GG.labels.sign(s, 'gopherwood');
        s.card = null; s.phase = 'plan'; GG.main.sync();
        GG.labels.book(s, { kind: 'ep', studioId: 'strip_mall_sound', producerId: 'solveig_birch', tracks: GG.labels.freshSongs(s).slice(0, 4).map(x => x.id), weeks: 2 });
        GG.ui.closeAll(); GG.ui.show('studio', {}); });
      await waitScreen('studio'); await snap('studio');
      // ---- the rival's set (a Battle of the Bands, from the crowd) ----
      await ev(() => { GG.ui.closeAll(); const st = GG.state; if (!st.rival && GG.rival && GG.rival.init) GG.rival.init(st); GG.ui.rivalSongMs = 600000;
        GG.ui.watchRival({ showdown: { kind: 'botb' }, venueId: 'legion_63', kind: 'legion', name: 'Legion Branch 63', capacity: 120 }, () => {}); });
      if (await ev(() => GG.ui.isOpen('rival-set'))) { await waitScreen('rival-set'); await snap('rival_set', { wait: 900 }); } else skipped.push('rival_set');
      await ev(() => { GG.ui.closeAll(); GG.main.quitToTitle(); });
      await page.waitForSelector('[data-testid="btn-new"]', { timeout: 15000 });

      // ---- the tutorial card (?tut=1) ----
      await page.goto(url + '?tut=1');
      await page.waitForSelector('[data-testid="btn-new"]', { timeout: 60000 });
      await ev(() => { GG.prefs.set({ calibSeen: true, bigText: false }); GG.ui.rng = GG.RNG(1506); GG.main.quickStart({ seed: 4243, slot: '3', bandId: 'hail_damage' }); });
      await page.waitForSelector('#tut [data-testid="tut-bubble"]', { timeout: 15000 });
      await snap('tutorial', { wait: 900 });
    }
    if (errors.length) log('console errors: ' + errors.slice(0, 3).join(' | '));
    return { view: view.width + 'x' + view.height, screens, skipped, errors };
  } finally { await close(); }
}

// ---- files + diff ---------------------------------------------------------------------------------------------------
// One screen per block, one element per line (readable git diffs).
function serialize(snap) {
  const lines = ['{', '  "v": 1,', '  "view": ' + JSON.stringify(snap.view) + ',', '  "screens": {'];
  const names = Object.keys(snap.screens);
  names.forEach((n, i) => {
    const s = snap.screens[n], keys = Object.keys(s).filter(k => k !== 'els');
    lines.push('    ' + JSON.stringify(n) + ': {');
    for (const k of keys) lines.push('      ' + JSON.stringify(k) + ': ' + JSON.stringify(s[k]) + ',');
    const ek = Object.keys(s.els);
    lines.push('      "els": {');
    ek.forEach((k, j) => lines.push('        ' + JSON.stringify(k) + ': ' + JSON.stringify(s.els[k]) + (j < ek.length - 1 ? ',' : '')));
    lines.push('      }');
    lines.push('    }' + (i < names.length - 1 ? ',' : ''));
  });
  lines.push('  }', '}');
  return lines.join('\n') + '\n';
}
// Hotspot points: equal when, per hotspot, some prop point seen now is within 1 px of one in the fixture. A side that only
// ever read the label ('L': a bandmate in front the whole time) proves nothing more than labelBox (compared on its own).
function hotDiff(A, B) {
  const pts = l => { const m = {}; for (const x of l || []) { const [a, ...p] = x.split(' '); m[a] = p.filter(q => q !== 'L').map(q => q === '-' ? [NaN, NaN] : q.split(',').map(Number)); } return m; };
  const a = pts(A), b = pts(B), bad = [];
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const pa = a[k], pb = b[k];
    if (!pa || !pb) { bad.push(k + ' missing'); continue; }
    if (!pa.length || !pb.length) continue;
    const near = pa.some(p => pb.some(q => (isNaN(p[0]) && isNaN(q[0])) || (Math.abs(p[0] - q[0]) <= 1 && Math.abs(p[1] - q[1]) <= 1)));
    if (!near) bad.push(k + ' ' + JSON.stringify(pa) + ' -> ' + JSON.stringify(pb));
  }
  return bad;
}
// -> [ 'screen: what differs' ] (empty when equal)
function diff(want, got) {
  const out = [], W = want.screens || {}, G = got.screens || {};
  for (const n of Object.keys(W)) {
    const a = W[n], b = G[n];
    if (!b) { out.push(n + ': screen not captured'); continue; }
    for (const k of Object.keys(a)) {
      if (k === 'els') continue;
      if (k === 'hot') { const bad = hotDiff(a.hot, b.hot); if (bad.length) out.push(n + ': hotspots moved ' + bad.join('; ')); continue; }
      if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) out.push(n + ': ' + k + ' ' + JSON.stringify(a[k]).slice(0, 300) + ' -> ' + JSON.stringify(b[k]).slice(0, 300));
    }
    for (const k of Object.keys(b)) if (k !== 'els' && !(k in a)) out.push(n + ': new ' + k + ' ' + JSON.stringify(b[k]).slice(0, 200));
    for (const k of Object.keys(a.els)) {
      if (!(k in b.els)) out.push(n + ': gone ' + k + ' (' + a.els[k] + ')');
      else if (a.els[k] !== b.els[k]) out.push(n + ': ' + k + ' ' + a.els[k] + ' -> ' + b.els[k]);
    }
    for (const k of Object.keys(b.els)) if (!(k in a.els)) out.push(n + ': new ' + k + ' (' + b.els[k] + ')');
  }
  for (const n of Object.keys(G)) if (!(n in W)) out.push(n + ': new screen');
  return out;
}

module.exports = { SIZES, tagOf, fixturePath, capture, serialize, diff, PROBE };

if (require.main === module) {
  (async () => {
    const { VIEW } = require('../tests/_pw');
    const tag = tagOf(VIEW);
    if (!tag) { console.error('phone_freeze: PW_VIEW must be one of 390x844, 440x956, 844x390'); process.exit(2); }
    const arg = k => (process.argv.find(a => a.startsWith('--' + k + '=')) || '').split('=')[1];
    const only = arg('only') ? arg('only').split(',') : null;
    const t0 = Date.now();
    const snap = await capture(tag, { only, log: s => console.log('  ' + s) });
    console.log(tag + ': ' + Object.keys(snap.screens).length + ' screens in ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s' + (snap.skipped.length ? ' · skipped ' + snap.skipped.join(',') : ''));
    if (snap.errors.length) { console.log('FAIL console errors: ' + snap.errors.slice(0, 3).join(' | ')); process.exitCode = 1; }
    if (process.argv.includes('--write')) {
      if (only) { console.error('phone_freeze: --write needs the whole walk (no --only)'); process.exit(2); }
      fs.writeFileSync(fixturePath(tag), serialize(snap));
      console.log('wrote ' + path.relative(ROOT, fixturePath(tag)) + ' (' + fs.statSync(fixturePath(tag)).size + ' B)');
    } else if (fs.existsSync(fixturePath(tag))) {
      const want = JSON.parse(fs.readFileSync(fixturePath(tag), 'utf8'));
      if (only) for (const n of Object.keys(want.screens)) if (!only.includes(n)) delete want.screens[n];
      const d = diff(want, snap);
      console.log(d.length ? 'DIFF ' + d.length + '\n' + d.slice(0, 60).join('\n') : 'EQUAL to ' + path.relative(ROOT, fixturePath(tag)));
      if (d.length) process.exitCode = 1;
    }
  })().catch(e => { console.error(e && e.stack || e); process.exit(1); });
}
