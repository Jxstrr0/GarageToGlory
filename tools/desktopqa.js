// tools/desktopqa.js (v1.5 "Desktop", Lane W; plan_contract_1.5 §5 Lane W): the desktop QA walk. Walks every main screen in
// a desktop context (tests/_pw.js open({ desktop: true }): no touch, a fine pointer + hover) at PW_VIEW (default 1440x900)
// and checks each one with AUDIT (in the page):
//   - overflow: the page never scrolls sideways; every visible control of the top layer sits inside the window;
//   - clipped: no visible control is cut by an ancestor that hides its overflow (sideways, or downwards when not scrolling);
//   - small: no visible control under 32 px either way (the PC layout's floor; phones keep their own 44-48 px rules);
//   - hover (gg-desk): the mouse over the screen's first enabled .btn changes its look.
// --shots=<dir> saves one PNG per screen (<n>_<name>.png); --only=a,b walks every screen but checks / shoots only those.
// Run: node build.js && PW_VIEW=1440x900 timeout 500 node tools/desktopqa.js [--shots=<dir>] [--only=garage,plan]
// Exit code 1 when a check fails. tests/pw_wide.js reuses walk() (module.exports = { walk, AUDIT, ALLOW }).
const path = require('path'), fs = require('fs');
const { open, VIEW, checker } = require('../tests/_pw');
const PIN = Date.UTC(2026, 9, 7, 12, 0, 0);

// Known, deliberate small / clipped controls (selector -> why); everything else counts.
const ALLOW = {
  small: ['.seq-grid .cell', '[role="gridcell"]', 'input[type="range"]', 'input[type="checkbox"]', 'input[type="radio"]', '.slot .x', '.dots i', 'canvas'],
  clipped: ['[data-testid="gig-highway"]']
};

// ---- in the page ------------------------------------------------------------------------------------------------------
function AUDIT(allow) {
  const W = window.innerWidth, H = window.innerHeight, out = { overflow: [], clipped: [], small: [], top: null };
  const de = document.documentElement;
  if (de.scrollWidth > W + 1) out.overflow.push('page scrollWidth ' + de.scrollWidth + ' > ' + W);
  if (document.body.scrollWidth > W + 1) out.overflow.push('body scrollWidth ' + document.body.scrollWidth + ' > ' + W);
  const vis = e => { if (!e.getClientRects().length) return false; const cs = getComputedStyle(e); return cs.visibility !== 'hidden' && +cs.opacity > 0.05; };
  const layers = [...document.querySelectorAll('#screens > .layer')].filter(l => !l.classList.contains('hidden') && !l.inert && vis(l));
  const top = layers[layers.length - 1] || null;
  out.top = top ? top.getAttribute('data-screen') : null;
  const roots = top ? [top] : [document.getElementById('hud')];
  if (top && top.classList.contains('sheet-layer')) roots.push(document.querySelector('#hud .hud-bar'));
  const name = e => e.getAttribute('data-testid') || (e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : ''));
  const SEL = 'button, [role="button"], input, select, textarea, a[href], [role="gridcell"], [role="tab"]';
  for (const root of roots.filter(Boolean)) {
    for (const e of root.querySelectorAll(SEL)) {
      if (!vis(e) || e.closest('[hidden], .hidden')) continue;
      const r = e.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      if (r.right > W + 1 || r.left < -1) out.overflow.push(name(e) + ' x ' + Math.round(r.left) + '..' + Math.round(r.right));
      if ((r.width < 32 || r.height < 32) && !allow.small.some(s => e.matches(s) || e.closest(s))) out.small.push(name(e) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
      if (allow.clipped.some(s => e.matches(s))) continue;
      // sideways: any clipping ancestor counts (a desktop has no swipe); downwards: only up to the first scroller (it scrolls)
      let yDone = false;
      for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) {
        const cs = getComputedStyle(a);
        const ox = cs.overflowX !== 'visible', oyHide = cs.overflowY === 'hidden' || cs.overflowY === 'clip', oyScroll = cs.overflowY === 'auto' || cs.overflowY === 'scroll';
        if (!ox && !oyHide && !oyScroll) continue;
        const ar = a.getBoundingClientRect();
        if (ox && (r.left < ar.left - 1 || r.right > ar.right + 1)) { out.clipped.push(name(e) + ' by ' + name(a) + (cs.overflowX === 'hidden' || cs.overflowX === 'clip' ? ' (x)' : ' (x scroll)')); break; }
        if (!yDone && oyHide && (r.top < ar.top - 1 || r.bottom > ar.bottom + 1)) { out.clipped.push(name(e) + ' by ' + name(a) + ' (y)'); break; }
        if (oyScroll) yDone = true;
      }
    }
  }
  return out;
}
function LOOK(sel) {
  const e = document.querySelector(sel); if (!e) return null;
  const cs = getComputedStyle(e);
  return [cs.backgroundColor, cs.backgroundImage, cs.filter, cs.borderColor, cs.boxShadow, cs.color, cs.transform].join('|');
}

// ---- the walk ---------------------------------------------------------------------------------------------------------
// walk(page, snap): visits the screens in order and awaits snap(name, { gig }) on each one. Robust: a block that fails is
// logged into skipped[] and the walk goes on with the next block.
async function walk(page, snap, opts) {
  opts = opts || {};
  const skipped = [], log = opts.log || (() => {});
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const screen = () => ev(() => GG.debug('ui').screen);
  const waitScreen = (id, t) => page.waitForFunction(i => GG.debug('ui').screen === i, id, { timeout: t || 15000 });
  const tap = async id => {
    await page.waitForSelector('[data-testid="' + id + '"]', { timeout: 15000 });
    await ev(i => { const n = [...document.querySelectorAll('[data-testid="' + i + '"]')].pop(); n.click(); }, id);
  };
  const block = async (label, fn) => { try { await fn(); } catch (e) { skipped.push(label + ': ' + String(e && e.message || e).split('\n')[0]); log('skip ' + label + ': ' + String(e && e.message || e).split('\n')[0]); } };
  const toTitle = async () => { await ev(() => { GG.ui.closeAll(); GG.main.quitToTitle(); }); await page.waitForSelector('[data-testid="btn-new"]', { timeout: 15000 }); };
  const startGig = (lanes) => ev(n => { const s = GG.state; GG.ui.closeAll(); s.card = null; s.phase = 'plan'; s.fund = Math.max(s.fund, 2000);
    if (n && GG.career.seatOf(s) === 'drums') s.gear.lanes = n;
    while (s.songs.length < 4) GG.songs.jam(s, GG.RNG(40 + s.songs.length));
    s.gig = GG.gig.makeGig(s, GG.content.venues[0].id, 'book'); GG.ui.gigAutoplay = false; GG.ui.playGig(s.gig, () => {}); }, lanes || 0);

  await page.waitForSelector('[data-testid="btn-new"]', { timeout: 60000 });
  await ev(() => { GG.prefs.set({ calibSeen: true, bigText: false }); GG.ui.rng = GG.RNG(1505); });

  await block('new career', async () => {
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
  });
  await block('to title', toTitle);

  await block('garage', async () => {
    await ev(() => GG.main.quickStart({ seed: 4242, slot: '1', bandId: 'hail_damage' }));
    await page.waitForFunction(() => GG.state && (GG.state.phase === 'plan' || GG.debug('ui').screen === 'card'), null, { timeout: 15000 });
    if (await screen() === 'card') { await snap('monday_card'); await tap('choice-0'); await tap('btn-card-ok'); }
    await page.waitForFunction(() => GG.state.phase === 'plan', null, { timeout: 15000 });
    await ev(() => { GG.ui.closeAll(); GG.main.sync && GG.main.sync(); });
    await page.waitForTimeout(1200);
    await snap('garage', { garage: true });
    await ev(() => GG.ui.openPlanner()); await waitScreen('plan'); await page.waitForTimeout(900); await snap('plan', { garage: true });
    await ev(() => { GG.ui.closeAll(); GG.ui.show('menu'); }); await waitScreen('menu'); await snap('menu', { garage: true });
    await ev(() => { GG.ui.closeAll(); GG.ui.confirm({ text: 'Quit to the title?', yes: 'Quit', no: 'Stay' }); }); await waitScreen('confirm'); await snap('confirm');
    await tap('btn-confirm-no');
  });
  await block('laptop', async () => {
    await ev(() => { GG.ui.closeAll(); GG.ui.show('laptop'); }); await waitScreen('laptop');
    for (const t of ['chat', 'band', 'money', 'trophies']) { await tap('laptop-tab-' + t); await page.waitForTimeout(250); await snap('laptop_' + t); }
  });
  await block('shops', async () => {
    await ev(() => { GG.ui.closeAll(); GG.ui.openGear(); }); await waitScreen('gear'); await snap('shop_gear');
    await ev(() => { GG.ui.closeAll(); GG.ui.openMerch(); }); await waitScreen('merch'); await snap('shop_merch');
    await ev(() => { GG.ui.closeAll(); GG.ui.openBoard({ mode: 'view' }); }); await waitScreen('board'); await snap('board');
    await ev(() => { GG.ui.closeAll(); GG.ui.showVan('van'); }); await waitScreen('van-info'); await snap('van_info');
  });
  await block('settings', async () => {
    for (const tab of ['play', 'keys', 'audio', 'look', 'saves']) {
      await ev(t => { GG.ui.closeAll(); GG.ui.show('settings', { tab: t }); }, tab); await waitScreen('settings'); await page.waitForTimeout(300);
      await snap('settings_' + tab);
    }
    await ev(() => { GG.ui.closeAll(); GG.ui.show('calib', { profile: GG.prefs.get().audioProfile }); }); await waitScreen('calib'); await snap('calib');
    await ev(() => { GG.ui.closeAll(); GG.ui.show('settings', { tab: 'keys' }); }); await waitScreen('settings'); await page.waitForTimeout(300);
    if (await ev(() => !!document.querySelector('[data-testid="set-calibrate-keys"]'))) {
      await tap('set-calibrate-keys'); await waitScreen('calib'); await page.waitForTimeout(300); await snap('calib_keys');
    } else skipped.push('calib_keys: no set-calibrate-keys');
    await ev(() => GG.ui.closeAll());
  });
  await block('songwriter', async () => {
    await ev(() => GG.ui.openSketch()); await waitScreen('seq'); await snap('seq_quick');
    await tap('btn-quick-tweak'); await page.waitForFunction(() => !document.querySelector('[data-testid="btn-quick-tweak"]'), null, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(300);
    await snap('seq_editor');
    await ev(() => GG.ui.closeAll());
  });
  await block('week', async () => {
    await ev(() => { const s = GG.state; GG.ui.closeAll(); GG.career.setPlan(s, ['rest', 'rest', 'rest']); s.gig = null; const r = GG.career.runWeek(s); GG.main.sync(); GG.ui.show('results', { result: r }); });
    await waitScreen('results'); await page.waitForTimeout(600); await snap('results');
    await ev(() => { GG.ui.closeAll(); GG.main.wrapWeek(); }); await waitScreen('wrap'); await page.waitForTimeout(600); await snap('wrap');
    await ev(() => { GG.ui.closeAll(); GG.main.nextWeek(); GG.ui.closeAll(); const s = GG.state; if (s.phase === 'monday') { GG.career.startWeek(s); if (s.card && !s.card.resolved) GG.career.resolveCard(s, 0); } GG.main.sync(); GG.ui.closeAll(); });
  });
  await block('gig', async () => {
    await startGig(4); await waitScreen('gig-set', 30000); await page.waitForTimeout(400); await snap('gig_set', { gig: true });
    await tap('btn-gig-start');
    await page.waitForFunction(() => GG.debug('gigui').mode === 'count', null, { timeout: 15000 });
    await page.waitForTimeout(250); await snap('gig_count', { gig: true });
    await page.waitForFunction(() => GG.debug('gigui').mode === 'play', null, { timeout: 20000 });
    await page.waitForTimeout(1500); await snap('gig_play', { gig: true });
    await tap('btn-gig-pause'); await page.waitForFunction(() => GG.debug('gigui').paused, null, { timeout: 5000 });
    await snap('gig_pause', { gig: true });
    await ev(() => { const st0 = window.setTimeout; window.__ggST = st0;
      window.setTimeout = function (fn, ms) { if (fn && fn.name === 'nextSong' && !window.__ggNext) { window.__ggNext = fn; return 0; } return st0.apply(this, arguments); };
      GG.ui.gigAutoplay = { accuracy: 1, jitterMs: 0 }; });
    await tap('btn-gig-resume');
    await page.waitForFunction(() => GG.debug('gigui').mode === 'between' && window.__ggNext, null, { timeout: 30000 });
    await ev(() => { GG.ui.gigAutoplay = false; window.setTimeout = window.__ggST; });
    await page.waitForTimeout(400); await snap('gig_between', { gig: true });
    await ev(() => { GG.ui.gigAutoplay = true; });
    await tap('btn-gig-next');
    await waitScreen('gig-results', 60000);
    await ev(() => { GG.ui.gigAutoplay = false; });
    await page.waitForTimeout(900); await snap('gig_results', { gig: true });
    await ev(() => { GG.ui.closeAll(); GG.ui.gigAutoplay = false; });
  });
  await block('gig 6 lanes', async () => {
    await ev(() => { GG.ui.closeAll(); GG.main.quickStart({ seed: 4343, slot: '2', bandId: 'hail_damage', openCard: false }); GG.ui.closeAll();
      const s = GG.state; s.gear.lanes = 6; s.songs.length = 0; });   // a fresh career: its songs written for six drums
    await startGig(6); await waitScreen('gig-set', 30000);
    await tap('btn-gig-start');
    await page.waitForFunction(() => GG.debug('gigui').mode === 'play', null, { timeout: 20000 });
    await page.waitForTimeout(1500); await snap('gig_play6', { gig: true });
    await ev(() => { GG.ui.closeAll(); GG.ui.gigAutoplay = false; });
  });
  await block('road', async () => {
    await ev(() => { const s = GG.state, W = GG.world; GG.ui.closeAll(); s.phase = 'gig';
      s.gig = W.makeListing(s, GG.gig.venue('craigs_basement'), GG.RNG(1), {}); s.trip = null;
      const t = W.startTrip(s); t.cardId = 'road_van_noise'; t.resolved = false;
      window.__vanDone = null; GG.ui.playVan(s.gig, () => { window.__vanDone = 1; }); });
    await waitScreen('road', 30000); await page.waitForTimeout(600); await snap('road');
    await tap('road-choice-0'); await tap('btn-road-ok');
    await page.waitForFunction(() => window.__vanDone, null, { timeout: 30000 }).catch(() => {});
    await ev(() => GG.ui.closeAll());
  });
  await block('recap + ending', async () => {
    await ev(() => { const s = GG.state; GG.ui.closeAll(); s.card = null; s.phase = 'monday'; s.weekStart = null; s.gig = null; s.trip = null;
      for (let i = 0; i < 30 && s.week !== 24; i++) GG.career.botWeek(s, 'avg');
      if (s.phase !== 'ended') { s.card = null; s.phase = 'plan'; GG.career.setPlan(s, ['rest', 'rest', 'rest']); s.gig = null; s.offer = null; GG.career.runWeek(s, { autoGig: true }); GG.career.endWeek(s); }
      GG.ui.closeAll(); GG.main.sync();
      const y = (GG.recap.list(s).slice(-1)[0] || {}).y; if (y) GG.ui.openRecap(y); });
    await waitScreen('recap'); await page.waitForTimeout(900); await snap('recap');
    await ev(() => { GG.ui.closeAll(); GG.ui.show('end'); GG.ui.endGo(0); }); await waitScreen('end'); await page.waitForTimeout(700); await snap('end_0');
    await ev(() => GG.ui.endGo('final')); await page.waitForTimeout(700); await snap('end_final');
    await ev(() => { GG.ui.closeAll(); GG.meta.enabled = true; GG.meta.recordCareer(GG.state); GG.ui.show('hof'); }); await waitScreen('hof'); await snap('hof');
  });
  await block('to title 2', toTitle);
  await block('world', async () => {
    await ev(() => { GG.main.quickStart({ seed: 707, slot: '2', openCard: false, bandId: 'hail_damage' }); GG.ui.closeAll();
      const s = GG.state, tw = 125; s.totalWeek = tw; s.year = Math.floor((tw - 1) / 24) + 1; s.week = (tw - 1) % 24 + 1;
      Object.assign(s, { era: 'world', protected: false, fans: 24000, fund: 60000, buzz: 60, phase: 'monday', gig: null, weekStart: null, card: null, offer: null });
      s.eraHistory.push({ era: 'local', week: 20 }, { era: 'signed', week: 40 }, { era: 'world', week: tw - 25 });
      s.milestones.worldReady = tw - 25; GG.tour.ensure(s); GG.tour.unlock(s, 'uk_europe', 'fans'); GG.main.sync(); GG.ui.closeAll(); });
    await ev(() => GG.ui.openWorld()); await waitScreen('world'); await page.waitForTimeout(600); await snap('world');
    await tap('region-open-uk_europe'); await waitScreen('tour-region'); await page.waitForTimeout(900); await snap('tour_region');
    await tap('pkg-open-uk_pub_crawl'); await waitScreen('tour-pkg'); await snap('tour_pkg');
    await ev(() => { GG.ui.closeAll(); GG.ui.show('tour-home', { summary: { id: 'qa', region: 'uk_europe', gigs: 6, festivals: 1, best: 'Berlin', fans: 4200, pay: 12000, cost: 9000, net: 3000, start: 0 } }); });
    await waitScreen('tour-home'); await snap('tour_home');
    await ev(() => { GG.ui.closeAll(); const s = GG.state; s.label = null; if (s.flags) s.flags.label = null; s.labelOffers = [GG.labels.makeOffer(s, 'monolith', GG.RNG(1)), GG.labels.makeOffer(s, 'gopherwood', GG.RNG(2))]; GG.main.sync(); GG.ui.openOffers('monolith'); });
    await waitScreen('label-offer'); await snap('label_offer');
  });
  await block('to title 3', toTitle);
  await block('studio + rival', async () => {
    await ev(() => { GG.main.quickStart({ seed: 6161, slot: '2', bandId: 'hail_damage', openCard: false }); GG.ui.closeAll();
      const s = GG.state, rng = GG.RNG(99);
      s.totalWeek = 40; s.year = 2; s.week = 16; s.fans = 1500; s.protected = false; GG.career.setEra(s, 'local', 'test'); s.fund = 4000; s.drumSkill = 55;
      while (s.songs.length < 10) GG.songs.create(s, GG.songs.generate(s.genre, rng), null, { auto: true });
      s.labelOffers = [GG.labels.makeOffer(s, 'gopherwood', GG.RNG(4))]; GG.labels.sign(s, 'gopherwood');
      s.card = null; s.phase = 'plan'; GG.main.sync();
      GG.labels.book(s, { kind: 'ep', studioId: 'strip_mall_sound', producerId: 'solveig_birch', tracks: GG.labels.freshSongs(s).slice(0, 4).map(x => x.id), weeks: 2 });
      GG.ui.closeAll(); GG.ui.show('studio', {}); });
    await waitScreen('studio'); await page.waitForTimeout(600); await snap('studio');
    await ev(() => { GG.ui.closeAll(); const st = GG.state; if (!st.rival && GG.rival && GG.rival.init) GG.rival.init(st); GG.ui.rivalSongMs = 600000;
      GG.ui.watchRival({ showdown: { kind: 'botb' }, venueId: 'legion_63', kind: 'legion', name: 'Legion Branch 63', capacity: 120 }, () => {}); });
    if (await ev(() => GG.ui.isOpen('rival-set'))) { await waitScreen('rival-set'); await page.waitForTimeout(900); await snap('rival_set', { gig: true }); } else skipped.push('rival_set: not open');
    await ev(() => { GG.ui.closeAll(); });
  });
  await block('to title 4', toTitle);
  await block('tutorial', async () => {
    await page.goto(page.url().replace(/\?.*$/, '') + '?tut=1');
    await page.waitForSelector('[data-testid="btn-new"]', { timeout: 60000 });
    await ev(() => { GG.prefs.set({ calibSeen: true, bigText: false }); GG.ui.rng = GG.RNG(1506); GG.main.quickStart({ seed: 4243, slot: '3', bandId: 'hail_damage' }); });
    await page.waitForSelector('#tut [data-testid="tut-bubble"]', { timeout: 15000 });
    await page.waitForTimeout(900); await snap('tutorial', { garage: true });
  });
  return { skipped };
}

// ---- the QA run --------------------------------------------------------------------------------------------------------
async function main() {
  const arg = k => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : null; };
  const shots = arg('shots'), only = arg('only') ? new Set(arg('only').split(',')) : null;
  if (shots) fs.mkdirSync(shots, { recursive: true });
  const c = checker('desktopqa ' + VIEW.width + 'x' + VIEW.height);
  const { page, context, errors, close, url } = await open({ desktop: true, noGoto: true, viewport: { width: VIEW.width, height: VIEW.height } });
  let n = 0;
  try {
    await context.addInitScript(pin => {
      const D = Date, off = pin - D.now();
      class FD extends D { constructor(...a) { if (a.length) super(...a); else super(D.now() + off); } static now() { return D.now() + off; } }
      window.Date = FD;
    }, PIN);
    await page.goto(url);
    // hover: the top layer's first enabled, unobstructed .btn must look different under the mouse (gg-desk)
    const hover = async name => {
      const sel = await page.evaluate(() => {
        const ls = [...document.querySelectorAll('#screens > .layer')].filter(l => !l.classList.contains('hidden') && !l.inert);
        const root = ls[ls.length - 1] || document.getElementById('hud');
        const b = [...root.querySelectorAll('.btn:not(:disabled)')].find(x => { const r = x.getBoundingClientRect(); return r.width > 30 && r.height > 30 && r.top >= 0 && r.bottom <= innerHeight && document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === x; });
        if (!b) return null; b.setAttribute('data-qa-hover', '1'); return '[data-qa-hover="1"]';
      });
      if (!sel) return;
      const unmark = () => page.evaluate(s => { const e = document.querySelector(s); if (e) e.removeAttribute('data-qa-hover'); }, sel);
      await page.mouse.move(1, 1); await page.waitForTimeout(160);
      const before = await page.evaluate(LOOK, sel);
      const box = await page.locator(sel).boundingBox().catch(() => null);
      if (!box) { await unmark(); return; }
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.waitForTimeout(220);
      const after = await page.evaluate(LOOK, sel);
      await page.mouse.move(1, 1); await unmark();
      const desk = await page.evaluate(() => document.documentElement.classList.contains('gg-desk'));
      c.ok(!desk || (after != null && before !== after), name + ': hover changes a button\'s look');
    };
    const snap = async (name, o) => {
      n++;
      if (only && !only.has(name)) return;
      await page.evaluate(() => { if (GG.ui.clearToasts) GG.ui.clearToasts(); });
      await page.waitForTimeout(250);
      // finite animations (a screen's fade / slide-in) done first (infinite ones never count)
      await page.waitForFunction(() => document.getAnimations().every(a => a.playState !== 'running' || !isFinite(a.effect.getTiming().iterations)), null, { timeout: 4000 }).catch(() => {});
      if (shots) await page.screenshot({ path: path.join(shots, String(n).padStart(2, '0') + '_' + name + '.png') });
      const a = await page.evaluate(AUDIT, ALLOW);
      c.ok(!a.overflow.length, name + ': no overflow ' + a.overflow.slice(0, 4).join(' | '));
      c.ok(!a.clipped.length, name + ': nothing clipped ' + a.clipped.slice(0, 4).join(' | '));
      c.ok(!a.small.length, name + ': no control under 32 px ' + a.small.slice(0, 4).join(' | '));
      if (!(o && o.gig)) await hover(name);
      console.log(name.padEnd(16) + ' top=' + a.top + (a.overflow.length + a.clipped.length + a.small.length ? '  ' + [...a.overflow, ...a.clipped, ...a.small].slice(0, 3).join(' | ') : ''));
    };
    const r = await walk(page, snap, { log: s => console.log(s) });
    c.ok(!r.skipped.length, 'every screen walked ' + r.skipped.join(' ; '));
    c.ok(!errors.length, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } finally { await close(); }
  c.done();
}

module.exports = { walk, AUDIT, ALLOW, PIN };
if (require.main === module) main().catch(e => { console.error(e); process.exitCode = 1; });
