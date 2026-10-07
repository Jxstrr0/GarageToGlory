// pw_nav.js (v1.5 "Desktop", Lane N; plan_contract_1.5 §4.5 / §5 Lane N): the menus on the keyboard in a real browser.
// Desktop contexts (open({ desktop: true }): no touch, fine pointer + hover) at 1280x720 (the PC layout) and 800x900 (the phone
// layout + gg-desk); the phone section in phone contexts (390x844, 844x390) presses keys and must change nothing.
// Sections (META_ONLY=career|esc|repeat|focus|seq|phone, comma-separated; default all). NAV_SIZES=1280x720,800x900 narrows the
// desktop sizes. Each section fits `timeout 500` on its own.
//   career : title -> slots -> genre -> intro (Esc back, the opener refocused) -> seat -> logo -> creator (typing "asdf " only
//            types) -> Enter through the cold open -> the Monday card on arrows + Enter -> digit 1 walks to the whiteboard
//            ('hotspot', the w1_walk lesson moves on) -> arrows + Enter fill the week -> Esc -> a key '&' / code Digit1 also
//            opens it -> Esc in the garage = ☰ -> a gig started with Enter (gig-set's Start) and never focused by show()
//   esc    : sticky screens ignore Esc; a confirm answers No; sheets close; full screens use their back; garage -> ☰; the
//            title does nothing; the tutorial card stays
//   repeat : 20 auto-repeat Enters on week results move exactly one screen on; the shop Buy fires once; a held Esc closes one
//            layer; a press that began before a screen opened never clicks it
//   focus  : focus kept across a planner re-render; the opener restored; the Tab trap; the ring only after keys (gone after a
//            click); text inputs never auto-focused; kb-hints only in the PC layout on keys; kb-spots + digits
//   seq    : the songwriter grid (roving tabindex, arrows, Space via the tap path, the kick rule); a toggled cell + Esc -> the
//            "Leave without saving?" ask, Esc -> still editing with the edit kept; the creator and the look editor alike;
//            untouched -> Esc leaves at once
//   phone  : 390x844 + 844x390 phone contexts: no gg-kbnav / kb-spots / kb-hints; pressSequentially('Tanner') + Enter in
//            creator-name and seq-title-input leave html.className as it was, kbSeen false, mode touch, no key UI in the DOM; a
//            CDP keydown (Unidentified, 229, code '') counts for nothing
// Run: node build.js && META_ONLY=career timeout 500 node tests/pw_nav.js
const { open, checker } = require('./_pw');
const ONLY = (process.env.META_ONLY || '').split(',').filter(Boolean);
const want = s => !ONLY.length || ONLY.includes(s);
const SIZES = (process.env.NAV_SIZES || '1280x720,800x900').split(',').map(x => { const m = /^(\d+)x(\d+)$/.exec(x.trim()); return { width: +m[1], height: +m[2] }; });
const tid = id => `[data-testid="${id}"]`;
const GAP = 260;   // > the router's 200 ms stale-press window after a programmatic focus move

async function press(page, k, wait) { await page.keyboard.press(k); await page.waitForTimeout(wait == null ? GAP : wait); }
const screen = page => page.evaluate(() => GG.debug('ui').screen);
const stackOf = page => page.evaluate(() => GG.debug('ui').stack.join(','));
const focused = page => page.evaluate(() => { const a = document.activeElement; return a && a !== document.body ? a.getAttribute('data-testid') || a.tagName.toLowerCase() : null; });
const waitScreen = (page, id, timeout) => page.waitForFunction(i => GG.debug('ui').screen === i, id, { timeout: timeout || 10000 });
const keys = page => page.evaluate(() => GG.debug('keys'));
async function tabTo(page, id, max, back) {
  await page.waitForTimeout(GAP);   // (the screen's own focus move is fresh: an Enter right after it would be stale)
  for (let i = 0; i < (max || 60); i++) {
    if (await focused(page) === id) return true;
    await press(page, back ? 'Shift+Tab' : 'Tab', 40);
  }
  return (await focused(page)) === id;
}
async function cdpKey(page, o) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, o));
  await cdp.send('Input.dispatchKeyEvent', Object.assign({}, o, { type: 'keyUp', autoRepeat: false }));
  await cdp.detach();
}
// One fresh Enter keydown, n auto-repeats, one keyup (CDP: what a held key sends; text '\r' makes it activate a button).
async function heldEnter(page, n) {
  const cdp = await page.context().newCDPSession(page), E = { key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r' };
  await cdp.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, E));
  for (let i = 0; i < n; i++) await cdp.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown', autoRepeat: true }, E));
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await cdp.detach();
}
async function quick(page, o) {
  await page.waitForSelector(tid('btn-new'));
  await page.evaluate(o => {
    GG.main.quickStart({ seed: o.seed || 5, slot: '1', openCard: false });
    GG.ui.closeAll();
    const s = GG.state; s.card = null; s.phase = 'plan';
    if (o.noGig) { s.gig = null; s.offer = null; }
    if (o.fund) s.fund = o.fund;
    GG.main.sync();
  }, o || {});
  await page.waitForTimeout(200);
}
function sizeTag(v) { return v.width + 'x' + v.height; }

/* ---- career -------------------------------------------------------------------------------------------------------- */
async function career(view) {
  const c = checker('career ' + sizeTag(view));
  const { page, errors, close, url } = await open({ desktop: true, viewport: view, query: '?tut=1' });
  try {
    await page.waitForSelector(tid('btn-new'));
    const h0 = await page.evaluate(() => ({ cls: document.documentElement.className, input: GG.debug('input') }));
    c.ok(/gg-desk/.test(h0.cls) && /gg-keys/.test(h0.cls) && !/gg-kbnav/.test(h0.cls), 'a computer: gg-desk + gg-keys, no ring yet ' + h0.cls);
    c.ok(/gg-wide/.test(h0.cls) === (view.width >= 1000), 'gg-wide only at >= 1000 px ' + h0.cls);
    c.ok(await focused(page) === null, 'the title opens with nothing focused');
    await press(page, 'Enter');
    c.ok(await focused(page) === 'btn-new' && await screen(page) === 'title', 'Enter with nothing focused only focuses the main button (no click)');
    c.ok(await page.evaluate(() => document.documentElement.classList.contains('gg-kbnav')), 'a real Enter turns the ring mode on');
    await press(page, 'Enter');
    await waitScreen(page, 'slots');
    c.ok(await focused(page) === 'slot-1', 'slots: focus on the first slot ' + await focused(page));
    await press(page, 'Enter');
    await waitScreen(page, 'genre');
    c.ok(await focused(page) === 'genre-metal', 'genre: the first card focused ' + await focused(page));
    await press(page, 'ArrowDown');
    c.ok(await focused(page) === 'genre-punk', 'ArrowDown -> the next card ' + await focused(page));
    await press(page, 'Enter');
    await waitScreen(page, 'intro');
    c.ok(await focused(page) === 'btn-intro-next', 'intro: its primary focused ' + await focused(page));
    await press(page, 'Escape');
    c.ok(await screen(page) === 'genre' && await focused(page) === 'genre-punk', 'Esc on the intro goes back, the opener refocused ' + await focused(page));
    await press(page, 'Enter'); await waitScreen(page, 'intro');
    await press(page, 'Enter'); await waitScreen(page, 'seat');
    c.ok(await focused(page) === 'seat-next', 'seat: next focused ' + await focused(page));
    await press(page, 'Enter');
    await page.waitForFunction(() => ['logo', 'creator'].includes(GG.debug('ui').screen), null, { timeout: 8000 });
    if (await screen(page) === 'logo') {
      c.ok(await focused(page) === 'btn-logo-done', 'logo: done focused ' + await focused(page));
      await press(page, 'Enter');
    }
    await waitScreen(page, 'creator');
    const f0 = await focused(page);
    c.ok(f0 && !/creator-name|creator-nick/.test(f0) && !/input/.test(f0), 'creator: a text input is never auto-focused ' + f0);
    c.ok(await tabTo(page, 'creator-name', 40, true), 'Shift+Tab reaches the name field');
    const before = await page.evaluate(() => ({ cls: document.documentElement.className, last: GG.debug('input').lastReal, stack: GG.debug('ui').stack.join() }));
    await page.keyboard.type('asdf ', { delay: 30 });
    await page.waitForTimeout(150);
    const after = await page.evaluate(() => ({ cls: document.documentElement.className, last: GG.debug('input').lastReal, stack: GG.debug('ui').stack.join(), v: document.querySelector('[data-testid="creator-name"]').value, f: document.activeElement.getAttribute('data-testid') }));
    c.ok(after.v === 'asdf ' && after.f === 'creator-name' && after.stack === before.stack && after.cls === before.cls, 'typing "asdf " only types (no nav, no click, classes kept) ' + JSON.stringify(after));
    await press(page, 'Escape');
    c.ok(await focused(page) === null && await screen(page) === 'creator' && (await keys(page)).lastEsc === 'blur', 'Esc in a text field only leaves the field');
    c.ok(await tabTo(page, 'btn-create', 60), 'Tab reaches Start the band');
    await press(page, 'Enter');
    await waitScreen(page, 'coldopen', 10000);
    c.ok(await focused(page) === 'btn-coldopen-next', 'cold open: Next focused ' + await focused(page));
    for (let i = 0; i < 6 && await screen(page) === 'coldopen'; i++) await press(page, 'Enter', 450);
    await page.waitForFunction(() => GG.state && GG.debug('ui').screen !== 'coldopen', null, { timeout: 10000 });
    if (await screen(page) !== 'card') {   // the Monday card comes from the dock
      await press(page, 'Enter');
      if (await focused(page) === 'btn-primary') await press(page, 'Enter');
    }
    await waitScreen(page, 'card', 8000);
    c.ok(await focused(page) === 'choice-0', 'Monday card: the first answer focused ' + await focused(page));
    await press(page, 'ArrowDown');
    c.ok(await focused(page) === 'choice-1', 'ArrowDown -> the next answer ' + await focused(page));
    await press(page, 'Digit1');
    c.ok(await page.evaluate(() => GG.state.card && !GG.state.card.resolved), 'a digit never picks a Monday answer');
    await press(page, 'Enter', 500);
    c.ok(await page.evaluate(() => GG.state.card && GG.state.card.resolved && GG.state.card.choice === 1), 'Enter picks the focused answer');
    c.ok(await focused(page) === 'btn-card-ok', 'then OK is focused ' + await focused(page));
    await press(page, 'Enter', 600);
    await page.waitForFunction(() => !GG.debug('ui').stack.length, null, { timeout: 6000 });
    c.ok(await page.evaluate(() => GG.state.phase) === 'plan', 'the week is in the plan phase');
    const kb = await page.evaluate(() => { const k = document.querySelector('[data-testid="kb-spots"]'); return k ? { shown: getComputedStyle(k).display !== 'none', n: k.querySelectorAll('button').length, first: k.querySelector('button').getAttribute('data-testid') } : null; });
    c.ok(kb && kb.shown && kb.n === 8 && kb.first === 'kb-hs-plan', 'kb-spots: 8 spots in the dock, 1 = the whiteboard ' + JSON.stringify(kb));
    const tut0 = await page.evaluate(() => GG.debug('tutorial'));
    await page.evaluate(() => { window.__hs = []; GG.on('hotspot', p => window.__hs.push(p.action)); });
    await press(page, 'Digit1', 50);
    await waitScreen(page, 'plan', 15000);
    const tut1 = await page.evaluate(() => ({ t: GG.debug('tutorial'), hs: window.__hs }));
    c.ok(tut1.hs[0] === 'plan', "digit 1 walks to the whiteboard and opens it through 'hotspot' " + JSON.stringify(tut1.hs));
    c.ok(!tut0.active || tut1.t.active !== tut0.active || tut1.t.step !== tut0.step || (tut1.t.done || []).length > (tut0.done || []).length, 'the tutorial moves on ' + JSON.stringify({ a: tut0.active, s: tut0.step, a1: tut1.t.active, s1: tut1.t.step }));
    // fill the week on the keyboard
    const pf = await focused(page);
    c.ok(pf && pf !== 'btn-close', 'plan: a control in the planner focused ' + pf);
    c.ok(await tabTo(page, 'act-rehearse', 40), 'Tab reaches Rehearse');
    if (process.env.NAV_DEBUG) await page.evaluate(() => { window.__fl = []; const f0 = GG.ui.focusEl; GG.ui.focusEl = function (n, o) { if (!(o && o.nav)) window.__fl.push([Math.round(performance.now()), n && n.getAttribute && n.getAttribute('data-testid'), (new Error().stack || '').split('\n').slice(2, 6).join(' | ')]); return f0.apply(this, arguments); };
      document.addEventListener('keydown', e => { if (e.key === 'Enter') window.__fl.push([Math.round(e.timeStamp), 'KEYDOWN', e.defaultPrevented]); }, true); });
    const trail = [];
    for (let i = 0; i < 3; i++) { await press(page, 'Enter', 450); trail.push(await focused(page)); }
    const pl = await page.evaluate(() => ({ plan: GG.state.plan, go: !document.querySelector('[data-testid="btn-go"]').disabled, k: GG.debug('keys') }));
    pl.trail = trail;
    if (process.env.NAV_DEBUG) console.log(JSON.stringify(await page.evaluate(() => window.__fl), null, 1));
    c.ok(pl.plan.filter(x => x === 'rehearse').length === 3 && pl.go, 'Enter x3 on Rehearse fills the week (focus kept across re-renders) ' + JSON.stringify(pl));
    await press(page, 'ArrowUp');
    c.ok(await focused(page) !== 'act-rehearse', 'ArrowUp moves off it ' + await focused(page));
    await press(page, 'Escape', 400);
    c.ok(!(await stackOf(page)) && await focused(page) === 'btn-primary', 'Esc closes the planner; focus on the dock button ' + await focused(page));
    // AZERTY: '&' on the Digit1 key
    await cdpKey(page, { key: '&', code: 'Digit1', text: '&', windowsVirtualKeyCode: 49 });
    await waitScreen(page, 'plan', 15000).catch(() => {});
    c.ok(await screen(page) === 'plan', "a key '&' with code Digit1 also opens the whiteboard");
    await press(page, 'Escape', 400);
    await press(page, 'Escape', 400);
    c.ok(await screen(page) === 'menu', 'Esc in the garage with nothing open = ☰');
    await press(page, 'Escape', 400);
    c.ok(!(await stackOf(page)), 'Esc closes ☰');
    // a gig started with Enter
    await page.evaluate(() => { const s = GG.state; GG.ui.gigAutoplay = false; s.gig = s.gig || GG.gig.makeGig(s, 'legion_63', 'book'); GG.ui.playGig(s.gig, () => {}); });
    await waitScreen(page, 'gig-set');
    await page.waitForTimeout(GAP);
    let gf = await focused(page);
    if (gf !== 'btn-gig-start') { c.ok(await tabTo(page, 'btn-gig-start', 40), 'Tab reaches Start on the setlist'); gf = await focused(page); }
    c.ok(gf === 'btn-gig-start', 'setlist: Start focused ' + gf);
    await press(page, 'Enter', 50);
    await page.waitForFunction(() => ['count', 'play'].includes(GG.debug('gigui').mode), null, { timeout: 8000 });
    const g = await page.evaluate(() => { const a = document.activeElement, L = document.querySelector('.layer[data-screen="gig"]'); return { mode: GG.debug('gigui').mode, inGig: !!(L && a && a !== document.body && L.contains(a)) }; });
    c.ok(['count', 'play'].includes(g.mode) && !g.inGig, 'Enter starts the gig; show() never focuses the gig screen ' + JSON.stringify(g));
    c.ok(!errors.length, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'career threw: ' + (e && e.stack || e)); }
  finally { await close(); c.done(); }
}

/* ---- esc ----------------------------------------------------------------------------------------------------------- */
async function esc(view) {
  const c = checker('esc ' + sizeTag(view));
  const { page, errors, close } = await open({ desktop: true, viewport: view, query: '?tut=1' });
  try {
    await page.waitForSelector(tid('btn-new'));
    await press(page, 'Escape');
    c.ok(await stackOf(page) === 'title', 'title: Esc does nothing');
    await page.evaluate(() => GG.ui.show('settings'));
    await waitScreen(page, 'settings');
    await press(page, 'Escape');
    c.ok(await stackOf(page) === 'title', 'settings (full): Esc = its back');
    await page.evaluate(() => GG.ui.show('genre'));
    await press(page, 'Escape');
    c.ok(await stackOf(page) === 'title', 'genre (full): Esc = its back');
    await page.evaluate(() => GG.ui.show('slots'));
    await press(page, 'Escape');
    c.ok(await stackOf(page) === 'title', 'a sheet closes on Esc');
    await page.evaluate(() => { window.__ans = 'pending'; GG.ui.confirm({ text: 'Sure?', yes: 'Yes', no: 'No' }).then(v => { window.__ans = v; }); });
    await press(page, 'Escape');
    c.ok(await page.evaluate(() => window.__ans) === false && await stackOf(page) === 'title', 'a confirm answers No on Esc');
    await quick(page, { noGig: true });
    for (const id of ['results', 'wrap']) {
      await page.evaluate(id => GG.ui.show(id, {}), id);
      await press(page, 'Escape');
      c.ok(await screen(page) === id, id + ' (sticky): Esc does nothing');
      await page.evaluate(() => GG.ui.closeAll());
    }
    await page.evaluate(() => { const s = GG.state; GG.ui.gigAutoplay = false; s.gig = GG.gig.makeGig(s, 'legion_63', 'book'); GG.ui.playGig(s.gig, () => {}); });
    await waitScreen(page, 'gig-set');
    await press(page, 'Escape');
    c.ok(await stackOf(page) === 'gig,gig-set', 'gig-set (sticky): Esc does nothing ' + await stackOf(page));
    await page.evaluate(() => { GG.ui.closeAll(); GG.state.liveGig = null; GG.state.gig = null; GG.main.sync(); });
    await page.waitForTimeout(200);
    await press(page, 'Escape');
    c.ok(await screen(page) === 'menu', 'garage, nothing open: Esc = ☰');
    await page.evaluate(() => GG.ui.show('laptop'));
    await press(page, 'Escape');
    c.ok(await screen(page) === 'menu', 'the laptop (sheet) closes on Esc, ☰ under it stays');
    await press(page, 'Escape');
    c.ok(!(await stackOf(page)), 'and ☰ closes');
    if (await page.evaluate(() => !!GG.ui.openBoard)) {
      await page.evaluate(() => GG.ui.openBoard({ mode: 'view' }));
      await page.waitForTimeout(200);
      await press(page, 'Escape');
      c.ok(!(await stackOf(page)), 'the gig board (full): Esc = its close');
    }
    // the tutorial card stays
    const t = await page.evaluate(() => { if (!GG.tutorial || !GG.tutorial.replay) return null; GG.tutorial.replay('w1_walk'); return GG.debug('tutorial').active; });
    if (t) {
      await page.waitForTimeout(300);
      await press(page, 'Escape');
      const t2 = await page.evaluate(() => GG.debug('tutorial').active);
      c.ok(t2 === t, 'Esc never closes the tutorial card ' + t + ' -> ' + t2);
      await page.evaluate(() => GG.ui.closeAll());
    }
    c.ok(!errors.length, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'esc threw: ' + (e && e.stack || e)); }
  finally { await close(); c.done(); }
}

/* ---- repeat -------------------------------------------------------------------------------------------------------- */
async function repeat(view) {
  const c = checker('repeat ' + sizeTag(view));
  const { page, errors, close } = await open({ desktop: true, viewport: view });
  try {
    await quick(page, { noGig: true, fund: 5000 });
    await page.evaluate(() => {
      const s = GG.state; GG.career.setPlan(s, ['rehearse', 'rehearse', 'rehearse']);
      const r = GG.career.runWeek(s); GG.main.sync();
      GG.ui.setKbnav(true);
      GG.ui.show('results', { result: r, instant: true });
      window.__opens = []; GG.on('screen:open', p => window.__opens.push(p.id));
      window.__week = s.totalWeek;
    });
    await page.waitForTimeout(GAP);
    c.ok(await focused(page) === 'btn-results-ok', 'results: OK focused ' + await focused(page));
    const r0 = await keys(page);
    await heldEnter(page, 20);
    await page.waitForTimeout(400);
    const r1 = await page.evaluate(() => ({ opens: window.__opens, top: GG.debug('ui').screen, week: GG.state.totalWeek, w0: window.__week, k: GG.debug('keys') }));
    c.ok(r1.top === 'wrap' && r1.opens.join() === 'wrap', 'one fresh Enter + 20 repeats: exactly one screen on (results -> wrap, its Next week untouched) ' + JSON.stringify({ opens: r1.opens, top: r1.top }));
    await page.evaluate(() => { window.__week = GG.state.totalWeek; });
    c.ok(r1.k.swallowed.repeat - r0.swallowed.repeat >= 20, '20 repeats swallowed ' + JSON.stringify(r1.k.swallowed));
    // a press that began before the screen opened never clicks it: Enter down on results' OK, the wrap's Next focused
    // programmatically right after; a fresh Enter within 200 ms is stale
    await page.evaluate(() => GG.ui.focusDefault());
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
    const r2 = await page.evaluate(() => ({ top: GG.debug('ui').screen, week: GG.state.totalWeek, w0: window.__week }));
    c.ok(r2.top === 'wrap' && r2.week === r2.w0, 'an Enter within 200 ms of a programmatic focus move is ignored ' + JSON.stringify(r2));
    await page.evaluate(() => GG.ui.closeAll());
    // the shop: Buy once
    const shop = await page.evaluate(() => { if (!GG.ui.openGear) return null; GG.state.fund = 5000; GG.ui.openGear(); return GG.debug('ui').screen; });
    if (shop) {
      await page.waitForTimeout(300);
      const buy = await page.evaluate(() => { const b = Array.from(document.querySelectorAll('[data-testid^="gear-buy-"]')).find(x => !x.disabled && x.getClientRects().length); return b ? b.getAttribute('data-testid') : null; });
      c.ok(!!buy, 'the shop has a Buy button ' + buy);
      if (buy) {
        await page.evaluate(id => { GG.ui.setKbnav(true); GG.ui.focusEl(document.querySelector('[data-testid="' + id + '"]'), { nav: true }); window.__fund = GG.state.fund; }, buy);
        await page.waitForTimeout(GAP);
        await heldEnter(page, 20);
        await page.waitForTimeout(400);
        const sp = await page.evaluate(() => ({ f0: window.__fund, f1: GG.state.fund, confirm: GG.debug('ui').screen }));
        const spent = sp.f0 - sp.f1;
        c.ok(spent > 0 || sp.confirm === 'confirm', 'Enter on Buy buys (or asks) ' + JSON.stringify(sp));
        if (sp.confirm === 'confirm') { await press(page, 'Escape'); }
        const prices = await page.evaluate(() => (GG.shop && GG.shop.items ? GG.shop.items(GG.state) : []).map(x => x.price || 0));
        c.ok(spent <= Math.max.apply(null, prices.concat([spent])) && (await keys(page)).swallowed.repeat >= 40, 'the repeats bought nothing more ' + spent);
      }
      await page.evaluate(() => GG.ui.closeAll());
    }
    // a held Esc closes one layer
    await page.evaluate(() => { GG.ui.show('menu'); GG.ui.show('settings'); });
    await page.waitForTimeout(GAP);
    const cdp3 = await page.context().newCDPSession(page);
    await cdp3.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    for (let i = 0; i < 10; i++) await cdp3.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, autoRepeat: true });
    await cdp3.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await cdp3.detach();
    await page.waitForTimeout(300);
    c.ok(await stackOf(page) === 'menu', 'a held Esc closes one layer (settings), ☰ stays ' + await stackOf(page));
    c.ok(!errors.length, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'repeat threw: ' + (e && e.stack || e)); }
  finally { await close(); c.done(); }
}

/* ---- focus --------------------------------------------------------------------------------------------------------- */
async function focus(view) {
  const c = checker('focus ' + sizeTag(view));
  const { page, errors, close } = await open({ desktop: true, viewport: view });
  try {
    await quick(page, { noGig: true });
    // the opener comes back: ☰ from the HUD by keys
    await press(page, 'Tab');
    c.ok(await page.evaluate(() => document.documentElement.classList.contains('gg-kbnav')), 'a real Tab turns the ring mode on');
    c.ok(await tabTo(page, 'btn-menu', 30), 'Tab walks the HUD to ☰');
    const ring = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
    c.ok(ring === 'solid', 'the ring shows on the focused control ' + ring);
    await press(page, 'Enter');
    await waitScreen(page, 'menu');
    const mf = await focused(page);
    c.ok(mf && mf !== 'btn-menu', 'the menu opens with its default focused ' + mf);
    // the Tab trap
    let out = 0;
    for (let i = 0; i < 25; i++) {
      await press(page, i % 3 === 2 ? 'Shift+Tab' : 'Tab', 30);
      if (!(await page.evaluate(() => { const L = document.querySelector('.layer[data-screen="menu"]'), a = document.activeElement, t = document.querySelector('#tut'); return !!(L && L.contains(a)) || !!(t && t.contains(a)); }))) out++;
    }
    c.ok(out === 0, 'Tab / Shift+Tab never leave the open sheet (' + out + ' escapes)');
    await press(page, 'Escape');
    c.ok(!(await stackOf(page)) && await focused(page) === 'btn-menu', 'closing it puts the focus back on its opener ' + await focused(page));
    // the ring goes with a click
    await page.mouse.click(Math.round(view.width / 2), Math.round(view.height / 2));
    await page.waitForTimeout(150);
    const r2 = await page.evaluate(() => ({ kb: document.documentElement.classList.contains('gg-kbnav'), ring: document.activeElement && getComputedStyle(document.activeElement).outlineStyle }));
    c.ok(!r2.kb, 'a click turns the ring mode off ' + JSON.stringify(r2));
    // focus kept across a planner re-render
    await page.evaluate(() => { GG.ui.closeAll(); GG.ui.setKbnav(true); GG.ui.openPlanner(); });
    await waitScreen(page, 'plan');
    await page.waitForTimeout(GAP);
    c.ok(await tabTo(page, 'act-write', 40), 'Tab reaches Write');
    await press(page, 'Enter');
    c.ok(await focused(page) === 'act-write' && await page.evaluate(() => GG.state.plan.indexOf('write') >= 0), 'Enter on Write fills a block; the focus stays on Write after the re-render');
    c.ok(await tabTo(page, 'plan-slot-0', 40, true), 'Shift+Tab reaches the first block');
    await press(page, 'Enter');
    c.ok(await focused(page) === 'plan-slot-0' && await page.evaluate(() => !GG.state.plan[0]), 'Enter on a filled block clears it; the focus stays');
    // kb-hints: only in the PC layout on keys
    const hints = await page.evaluate(() => { const h = document.querySelectorAll('[data-testid="kb-hints"]'); return { n: h.length, in: h[0] ? !!h[0].closest('.layer[data-screen="plan"]') : false, text: h[0] ? h[0].textContent : '' }; });
    const wide = view.width >= 1000;
    c.ok(wide ? hints.n === 1 && hints.in : hints.n === 0, 'kb-hints ' + (wide ? 'in the planner foot (PC layout, keys)' : 'absent in the phone layout') + ' ' + JSON.stringify(hints));
    // inputs never auto-focused
    await page.evaluate(() => { GG.ui.closeAll(); GG.ui.show('code', { mode: 'restore' }); });
    await page.waitForTimeout(GAP);
    const cf = await page.evaluate(() => { const a = document.activeElement; return a ? a.tagName + ':' + (a.getAttribute('data-testid') || '') : null; });
    c.ok(!/^(INPUT|TEXTAREA)/.test(cf), 'the code sheet never puts the focus in its text box ' + cf);
    await page.evaluate(() => GG.ui.closeAll());
    // kb-spots + the 2D garage path ('hotspot' right away when there is no 3D walk)
    await page.waitForTimeout(150);
    const sp = await page.evaluate(() => { const k = document.querySelector('[data-testid="kb-spots"]'); return k ? getComputedStyle(k).display : null; });
    c.ok(sp && sp !== 'none', 'kb-spots show in the garage with the ring mode on ' + sp);
    await page.evaluate(() => { GG.ui.setKbnav(true); GG.ui.focusDefault(); });
    await page.waitForTimeout(GAP);
    c.ok(await focused(page) === 'btn-primary', 'garage, nothing open: the default is the dock button');
    c.ok(!errors.length, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'focus threw: ' + (e && e.stack || e)); }
  finally { await close(); c.done(); }
}

/* ---- seq ----------------------------------------------------------------------------------------------------------- */
async function seq(view) {
  const c = checker('seq ' + sizeTag(view));
  const { page, errors, close } = await open({ desktop: true, viewport: view });
  try {
    await quick(page, { noGig: true });
    // untouched: Esc leaves at once
    await page.evaluate(() => { GG.ui.setKbnav(true); GG.ui.openSketch(); });
    await waitScreen(page, 'seq');
    await page.waitForTimeout(GAP);
    await press(page, 'Escape');
    c.ok(await screen(page) !== 'seq' && await screen(page) !== 'confirm', 'an untouched songwriter closes on Esc, no ask ' + await stackOf(page));
    await page.evaluate(() => { GG.ui.closeAll(); GG.ui.setKbnav(true); GG.ui.openSketch(); });
    await waitScreen(page, 'seq');
    if (await page.evaluate(() => GG.debug('seq').screen) === 'quick') { await page.evaluate(() => document.querySelector('[data-testid="btn-quick-tweak"]').click()); await page.waitForTimeout(GAP); }
    const g0 = await page.evaluate(() => { const g = document.querySelector('[data-testid="seq-grid"]'), z = g && g.querySelectorAll('.cell[tabindex="0"]'); return g ? { role: g.getAttribute('role'), own: g.getAttribute('data-keys'), roving: z.length, first: z[0] && z[0].getAttribute('data-testid'), cellRole: g.querySelector('.cell').getAttribute('role') } : null; });
    c.ok(g0 && g0.role === 'grid' && g0.own === 'own' && g0.roving === 1 && g0.cellRole === 'gridcell', 'the grid: role=grid, one roving tab stop, gridcells ' + JSON.stringify(g0));
    let ok = false;
    for (let i = 0; i < 60 && !ok; i++) { await press(page, 'Tab', 30); ok = await page.evaluate(() => document.activeElement && document.activeElement.getAttribute('role') === 'gridcell'); }
    c.ok(ok, 'Tab reaches the grid (one stop) ' + await focused(page));
    await page.evaluate(() => { const a = document.activeElement; a.blur(); const n = document.querySelector('[data-testid="cell-kick-0"]'); GG.ui.focusEl(n, { nav: true }); });
    await press(page, 'ArrowRight', 60); await press(page, 'ArrowDown', 60);
    c.ok(await focused(page) === 'cell-snare-1', '→ next drum, ↓ next step ' + await focused(page));
    await press(page, 'End', 60);
    c.ok(await focused(page) === 'cell-snare-15', 'End = the last step ' + await focused(page));
    await press(page, 'PageUp', 60);
    c.ok(await focused(page) === 'cell-snare-11', 'PgUp = 4 steps up ' + await focused(page));
    await press(page, 'Home', 60);
    c.ok(await focused(page) === 'cell-snare-0', 'Home = the first step ' + await focused(page));
    // Space toggles through the tap path
    const t0 = await page.evaluate(() => ({ on: document.querySelector('[data-testid="cell-snare-0"]').classList.contains('on'), sel: document.querySelector('[data-testid="cell-snare-0"]').getAttribute('aria-selected') }));
    await press(page, 'Space', 120);
    const t1 = await page.evaluate(() => ({ on: document.querySelector('[data-testid="cell-snare-0"]').classList.contains('on'), sel: document.querySelector('[data-testid="cell-snare-0"]').getAttribute('aria-selected'), dirty: GG.debug('seq').dirty, f: document.activeElement.getAttribute('data-testid') }));
    c.ok(t1.on !== t0.on && t1.sel === String(t1.on) && t1.dirty && t1.f === 'cell-snare-0', 'Space toggles the cell (aria-selected follows), the song is dirty ' + JSON.stringify(t1));
    // the kick rule (no double kick): two kicks in a row are refused, on keys too
    const kr = await page.evaluate(() => {
      const st = GG.state, sec = GG.debug('seq');
      const cells = Array.from(document.querySelectorAll('[data-testid^="cell-kick-"]'));
      for (let i = 0; i + 1 < cells.length; i++) if (cells[i].classList.contains('on') && !cells[i + 1].classList.contains('on')) {
        if (!GG.songs.kickBlocked) return null;
        GG.ui.focusEl(cells[i + 1], { nav: true });
        return cells[i + 1].getAttribute('data-testid');
      }
      return null;
    });
    if (kr && !(await page.evaluate(() => (GG.state.gear || {}).pedal || (GG.state.gear || {}).doubleKick))) {
      await press(page, 'Space', 120);
      const k1 = await page.evaluate(id => document.querySelector('[data-testid="' + id + '"]').classList.contains('on'), kr);
      c.ok(!k1, 'the kick rule holds on keys: ' + kr + ' stays off');
    }
    // Esc -> ask; Esc -> keep editing
    await press(page, 'Escape');
    c.ok(await screen(page) === 'confirm', 'a changed song: Esc asks first');
    c.ok(await focused(page) === 'btn-confirm-no', 'the ask starts on Keep editing ' + await focused(page));
    const askText = await page.evaluate(() => document.querySelector('.layer[data-screen="confirm"]').textContent);
    c.ok(/Leave without saving\?/.test(askText) && /Keep editing/.test(askText), 'the ask reads "Leave without saving?" / Keep editing');
    await press(page, 'Escape');
    const k2 = await page.evaluate(() => ({ top: GG.debug('ui').screen, on: document.querySelector('[data-testid="cell-snare-0"]').classList.contains('on'), f: document.activeElement && document.activeElement.getAttribute('data-testid') }));
    c.ok(k2.top === 'seq' && k2.on === t1.on, 'Esc on the ask = keep editing: still in the editor, the edit kept ' + JSON.stringify(k2));
    c.ok(k2.f === (kr || 'cell-snare-0'), 'the focus is back on the cell ' + k2.f);
    await press(page, 'Escape');
    c.ok(await tabTo(page, 'btn-confirm-yes', 6), 'Tab to Leave');
    await press(page, 'Enter');
    c.ok(await screen(page) !== 'seq', 'Leave closes the songwriter');
    // the creator: a typed name asks first
    await page.evaluate(() => { GG.ui.closeAll(); GG.ui.show('creator'); GG.ui.setKbnav(true); GG.ui.focusDefault(); });
    await waitScreen(page, 'creator');
    await page.waitForTimeout(GAP);
    await press(page, 'Escape');
    c.ok(await screen(page) !== 'creator' && await screen(page) !== 'confirm', 'an untouched creator closes on Esc');
    await page.evaluate(() => { GG.ui.closeAll(); GG.ui.show('creator'); GG.ui.setKbnav(true); document.querySelector('[data-testid="creator-name"]').focus(); });
    await page.keyboard.type('Tanner', { delay: 20 });
    await press(page, 'Escape');
    await press(page, 'Escape');
    c.ok(await screen(page) === 'confirm', 'creator with a name typed: Esc asks first');
    await press(page, 'Escape');
    c.ok(await screen(page) === 'creator' && await page.evaluate(() => document.querySelector('[data-testid="creator-name"]').value) === 'Tanner', 'Esc on the ask keeps the creator and the name');
    // the look editor: a pick asks first
    await page.evaluate(() => { GG.ui.closeAll(); GG.ui.openLook({ mode: 'career' }); GG.ui.setKbnav(true); });
    await waitScreen(page, 'look');
    await page.waitForTimeout(GAP);
    await press(page, 'Escape');
    c.ok(await screen(page) !== 'look' && await screen(page) !== 'confirm', 'an untouched look editor closes on Esc');
    await page.evaluate(() => { GG.ui.closeAll(); GG.ui.openLook({ mode: 'career' }); GG.ui.setKbnav(true); });
    await waitScreen(page, 'look');
    await page.waitForTimeout(GAP);
    const picked = await page.evaluate(() => { const b = Array.from(document.querySelectorAll('[data-testid^="lk-opt-"]')).find(x => !x.disabled && !x.classList.contains('on') && !x.classList.contains('locked') && x.getClientRects().length); if (!b) return null; GG.ui.focusEl(b, { nav: true }); return b.getAttribute('data-testid'); });
    c.ok(!!picked, 'a look option to pick ' + picked);
    await press(page, 'Enter');
    await press(page, 'Escape');
    c.ok(await screen(page) === 'confirm', 'the look editor after a pick: Esc asks first');
    await press(page, 'Escape');
    c.ok(await screen(page) === 'look', 'Esc on the ask keeps the look editor');
    c.ok(!errors.length, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'seq threw: ' + (e && e.stack || e)); }
  finally { await close(); c.done(); }
}

/* ---- phone --------------------------------------------------------------------------------------------------------- */
async function phone(view) {
  const c = checker('phone ' + sizeTag(view));
  const { page, errors, close } = await open({ viewport: view });
  try {
    await page.waitForSelector(tid('btn-new'));
    const h0 = await page.evaluate(() => document.documentElement.className);
    c.ok(!/gg-(desk|keys|wide|kbnav)/.test(h0), 'a phone: no desktop class ' + JSON.stringify(h0));
    await page.locator(tid('btn-new')).click();
    await page.locator(tid('slot-1')).click();
    await page.locator(tid('genre-metal')).click();
    await page.locator(tid('btn-intro-next')).click();
    await page.locator(tid('seat-next')).click();
    await page.waitForFunction(() => ['logo', 'creator'].includes(GG.debug('ui').screen), null, { timeout: 8000 });
    if (await screen(page) === 'logo') await page.locator(tid('btn-logo-done')).click();
    await waitScreen(page, 'creator');
    await page.locator(tid('creator-name')).pressSequentially('Tanner', { delay: 20 });
    await page.locator(tid('creator-name')).press('Enter');
    await page.waitForTimeout(150);
    const s1 = await page.evaluate(() => ({ cls: document.documentElement.className, inp: GG.debug('input'), keys: GG.debug('keys'), dom: ['set-keys', 'gig-keys', 'calib-input-touch', 'calib-input-keys', 'kb-spots', 'kb-hints'].filter(id => document.querySelector('[data-testid="' + id + '"]')) }));
    c.ok(s1.cls === h0, 'typing + Enter in creator-name: html.className unchanged ' + JSON.stringify(s1.cls));
    c.ok(s1.inp.kbSeen === false && s1.inp.mode === 'touch' && !s1.keys.kbnav, 'kbSeen false, mode touch, no ring mode ' + JSON.stringify({ kbSeen: s1.inp.kbSeen, mode: s1.inp.mode }));
    c.ok(!s1.dom.length, 'no key UI in the DOM ' + s1.dom.join());
    await page.locator(tid('btn-create')).click();
    await waitScreen(page, 'coldopen', 10000);
    await page.locator(tid('btn-coldopen-skip')).click();
    await page.waitForFunction(() => GG.state && GG.debug('ui').screen !== 'coldopen', null, { timeout: 10000 });
    await page.evaluate(() => { GG.ui.closeAll(); GG.ui.openSketch(); });
    await waitScreen(page, 'seq');
    if (await page.evaluate(() => GG.debug('seq').screen) === 'quick') await page.locator(tid('btn-quick-tweak')).click();
    const cells = await page.evaluate(() => { const c0 = document.querySelector('[data-testid="seq-grid"] .cell'); return c0 ? [c0.getAttribute('role'), c0.getAttribute('tabindex'), document.querySelector('[data-testid="seq-grid"]').getAttribute('data-keys')] : null; });
    c.ok(cells && cells.every(x => x === null), 'the phone grid has no key attributes (the 1.4 DOM) ' + JSON.stringify(cells));
    await page.locator(tid('seq-tab-song')).click();
    const ti = page.locator(tid('seq-title-input'));
    if (await ti.count()) {
      await ti.pressSequentially('Tanner', { delay: 20 });
      await ti.press('Enter');
      await page.waitForTimeout(150);
    }
    c.ok(await ti.count() > 0, 'the songwriter title field is there');
    // a Gboard-style keydown on the body counts for nothing
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await cdpKey(page, { key: 'Unidentified', code: '', windowsVirtualKeyCode: 229, nativeVirtualKeyCode: 229 });
    await page.waitForTimeout(150);
    const s2 = await page.evaluate(() => ({ cls: document.documentElement.className, inp: GG.debug('input'), top: GG.debug('ui').screen, dom: ['set-keys', 'gig-keys', 'calib-input-touch', 'calib-input-keys', 'kb-spots', 'kb-hints'].filter(id => document.querySelector('[data-testid="' + id + '"]')) }));
    c.ok(s2.cls === h0 && s2.inp.kbSeen === false && s2.inp.mode === 'touch' && s2.top === 'seq' && !s2.dom.length, 'title typing + a 229 / Unidentified keydown change nothing ' + JSON.stringify({ cls: s2.cls, kbSeen: s2.inp.kbSeen, mode: s2.inp.mode, top: s2.top, dom: s2.dom }));
    await page.evaluate(() => GG.ui.closeAll());
    await page.waitForTimeout(150);
    c.ok(await page.evaluate(() => !document.querySelector('[data-testid="kb-spots"]')), 'the garage has no kb-spots on a phone');
    c.ok(!errors.length, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'phone threw: ' + (e && e.stack || e)); }
  finally { await close(); c.done(); }
}

(async () => {
  for (const v of SIZES) {
    if (want('career')) await career(v);
    if (want('esc')) await esc(v);
    if (want('repeat')) await repeat(v);
    if (want('focus')) await focus(v);
    if (want('seq')) await seq(v);
  }
  if (want('phone')) for (const v of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) await phone(v);
})();
