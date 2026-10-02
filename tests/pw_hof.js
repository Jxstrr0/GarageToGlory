// pw_hof.js (v1.0 "Glory", Lane M; owner Q6): the Hall of Fame on a phone viewport (390x844 by default; PW_VIEW=440x956
// for the owner's iPhone). Sections META_ONLY=list|restore|empty (default all); each fits `timeout 500`.
//   list    : seeded meta (three finished careers built in node: Gravel Kings from the v0.9 ended fixture, a brutal Hail
//             Damage Arena Legends with Big in Japan, a Frost Heave career with seat 'bass') → the title's "Hall of Fame"
//             (btn-hof >= 48 px) → one row per career (data-band, the logo drawn, tier chip, score, difficulty badge, a seat
//             chip only on the bass row) → tap → the entry sheet (seven Legacy parts summing to the score, lineup avatars,
//             trophies, the year strip: tap a year → its card) → "Backup code" shows a GG1 code that reads back as a meta-only
//             code with every entry and its strip. No share / screenshot / download text. Screenshots hof_list.png,
//             hof_entry.png.
//   restore : a fresh phone: no Hall of Fame button → Restore code with the backup code → "Restore Hall of Fame and trophies?"
//             → the button appears, the entries (with strips + trophies) are back; a career code carrying the Hall of Fame
//             lite on another fresh phone → the career loads, then the lite entries merge (no strips: the entry says so).
//   empty   : empty storage: no title button, no errors; ☰ → Hall of Fame shows "No careers yet.".
// Every section: no console errors. Run: node build.js && META_ONLY=list timeout 500 node tests/pw_hof.js
const path = require('path'), fs = require('fs'), zlib = require('zlib');
const { open, checker, shotName } = require('./_pw');
const load = require('./_load');
const CACHE = path.join(__dirname, '.cache');
const ONLY = (process.env.META_ONLY || '').split(',').filter(Boolean);
const want = s => !ONLY.length || ONLY.includes(s);
const tid = id => `[data-testid="${id}"]`;
const tap = (page, id) => page.locator(tid(id)).last().click();
const waitScreen = (page, id, timeout) => page.waitForFunction(i => GG.debug('ui').screen === i, id, { timeout: timeout || 10000 });
const fixture = name => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'fixtures', name + '.json.gz'))).toString('utf8'));

// Three finished careers recorded by the real 12_meta in node (no GG.legacy needed: state.legacy feeds the basic entry).
function seedMeta() {
  const store = load.fakeStorage(), GG = load({ localStorage: store });
  GG.meta.load();
  const parts = (a) => ({ fans: a[0], units: a[1], awards: a[2], venue: a[3], regions: a[4], unity: a[5], final: a[6] });
  const sum = p => Object.values(p).reduce((a, b) => a + b, 0);
  const gk = GG.save.migrate(fixture('v09_ended').state);
  const p1 = parts([150, 120, 80, 70, 50, 60, 82]);
  gk.legacy = { v: 1, score: sum(p1), parts: p1, tier: 'canadian_institution', specials: ['original_lineup'] };
  gk.ach = { got: { twelve_people: 3, sold_out: 120 }, t: {} };
  const bot = (bandId, seed, weeks) => { const s = GG.career.newCareer({ seed, bandId, player: { name: 'Bot', nick: 'Sticks' } }); for (let i = 0; i < weeks; i++) GG.career.botWeek(s, 'good'); s.ended = true; s.phase = 'ended'; return s; };
  const hd = bot('hail_damage', 777, 50), p2 = parts([240, 190, 140, 100, 75, 80, 100]);
  hd.careerDifficulty = 'brutal'; hd.bonusYears = 3; hd.maxWeeks = 312;
  hd.legacy = { v: 1, score: sum(p2), parts: p2, tier: 'arena_legends', specials: ['big_in_japan', 'moose_opera'] };
  hd.ach = { got: { twelve_people: 2, buddy: 40, big_in_japan: 312 }, t: {} };
  const fh = bot('frost_heave', 31, 26), p3 = parts([20, 0, 8, 10, 0, 50, 0]);
  fh.seat = 'bass';
  fh.legacy = { v: 1, score: sum(p3), parts: p3, tier: 'still_in_the_garage', specials: [] };
  [gk, fh, hd].forEach(s => GG.meta.recordCareer(s));
  GG.meta.award(hd, ['buddy', 'twelve_people']);
  return { meta: store._map.get('gg.v1.meta'), hof: store._map.get('gg.v1.hof'), code: GG.save.metaCode(), ids: GG.meta.hof().map(e => e.id),
    scores: GG.meta.hof().map(e => e.score), bands: GG.meta.hof().map(e => e.bandId) };
}
async function boot(seed) {
  const o = await open({ noGoto: true });
  if (seed) await o.context.addInitScript(s => { try { if (!localStorage.getItem('gg.v1.hof')) { localStorage.setItem('gg.v1.meta', s.meta); localStorage.setItem('gg.v1.hof', s.hof); } } catch (e) { /* file:// */ } }, seed);
  await o.page.goto(o.url);
  await o.page.waitForSelector(tid('btn-new'), { timeout: 20000 });
  return o;
}
function audit(page) {
  return page.evaluate(() => {
    const W = document.documentElement.clientWidth, bad = [];
    const vis = e => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return null; const cs = getComputedStyle(e); return cs.visibility === 'hidden' || cs.display === 'none' ? null : r; };
    const name = e => (e.dataset && e.dataset.testid || e.className || e.tagName) + '';
    for (const e of document.querySelectorAll('#screens *')) { const r = vis(e); if (r && (r.right > W + 1 || r.left < -1)) bad.push('overflow ' + name(e) + ' ' + Math.round(r.left) + '..' + Math.round(r.right)); }
    for (const sc of document.querySelectorAll('.full-body, .sheet-body')) if (sc.scrollWidth > sc.clientWidth + 1) bad.push('hscroll ' + sc.className);
    for (const b of document.querySelectorAll('#screens button')) {
      const r = vis(b); if (!r || b.closest('[hidden]')) continue;
      const v10 = /^(btn-hof|menu-hof|hof-)/.test(b.dataset.testid || '');
      if (r.width < (v10 ? 47.5 : 43.5) || r.height < (v10 ? 47.5 : 43.5)) bad.push('small ' + name(b) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    }
    if (/share|screenshot|download/i.test([...document.querySelectorAll('#screens button, #screens a')].map(b => b.textContent).join(' '))) bad.push('a share/screenshot/download control');
    return bad.slice(0, 8);
  });
}

async function list(seed) {
  const c = checker('list');
  const { page, errors, close } = await boot(seed);
  try {
    const t = await page.evaluate(() => { const b = document.querySelector('[data-testid="btn-hof"]'); const r = b && b.getBoundingClientRect(); return b ? [r.width, r.height] : null; });
    c.ok(t && t[0] >= 47.5 && t[1] >= 47.5, 'the title shows Hall of Fame (>= 48 px) ' + t);
    await tap(page, 'btn-hof');
    await waitScreen(page, 'hof');
    await page.waitForFunction(() => [...document.querySelectorAll('[data-testid^="hof-logo-"]')].every(i => i.complete && i.naturalWidth > 0), null, { timeout: 10000 }).catch(() => {});
    const L = await page.evaluate(() => [...document.querySelectorAll('[data-testid^="hof-row-"]')].map((r, i) => {
      const img = r.querySelector('img'); const q = s => (r.querySelector('[data-testid="' + s + i + '"]') || {}).textContent || null;
      return { band: r.dataset.band, id: r.dataset.id, img: !!img && img.naturalWidth > 0 && /^data:image\/png/.test(img.src), tier: q('hof-tier-'), score: q('hof-score-'), diff: q('hof-diff-'), seat: q('hof-seat-'), text: r.textContent, h: r.getBoundingClientRect().height };
    }));
    c.ok(L.length === 3 && L.map(r => r.band).join() === seed.bands.join() && L.map(r => r.id).join() === seed.ids.join(), 'one row per career, newest first, data-band ' + JSON.stringify(L.map(r => r.band)));
    c.ok(L.every(r => r.img), 'every row draws its logo');
    c.ok(L.every((r, i) => r.score === String(seed.scores[i])), 'scores ' + L.map(r => r.score));
    const hd = L.find(r => r.band === 'hail_damage'), fh = L.find(r => r.band === 'frost_heave'), gk = L.find(r => r.band === 'gravel_kings');
    c.ok(hd.tier === 'Arena Legends' && hd.diff === 'Brutal' && /13 years \(\+3 bonus\)/.test(hd.text) && hd.seat === null, 'Hail Damage: tier, Brutal badge, bonus years, no seat chip ' + JSON.stringify(hd));
    c.ok(fh.seat === 'Bass' && fh.tier === 'Still in the Garage', 'the seat chip shows only when the seat is not the drums ' + JSON.stringify([fh.seat, gk.seat]));
    c.ok(gk.tier === 'Canadian Institution' && gk.diff === 'Normal' && gk.seat === null, 'Gravel Kings row');
    c.ok(L.every(r => r.h >= 47.5), 'rows >= 48 px');
    let bad = await audit(page);
    c.ok(bad.length === 0, 'list layout ' + bad.join('; '));
    await page.waitForTimeout(400);   // the screen's fade-in
    await page.screenshot({ path: path.join(CACHE, shotName('hof_list.png')) });
    // The entry sheet: the Arena Legends career.
    await page.locator('[data-band="hail_damage"]').first().click();
    await waitScreen(page, 'hof-entry');
    const E = await page.evaluate(() => {
      const parts = [...document.querySelectorAll('[data-testid^="hof-part-"]')].map(p => +p.querySelector('b').textContent);
      const years = [...document.querySelectorAll('[data-testid^="hof-year-"]')];
      return { parts, years: years.length, score: +document.querySelector('[data-testid="hof-entry"] .hof-top .sc').textContent, mem: document.querySelectorAll('[data-testid^="hof-member-"]').length,
        specials: [...document.querySelectorAll('[data-testid^="hof-special-"]')].map(s => s.textContent), tro: document.querySelector('[data-testid="hof-trophies"]').textContent,
        band: document.querySelector('[data-testid="hof-entry"]').dataset.band, logo: (() => { const i = document.querySelector('[data-testid="hof-entry-logo"]'); return !!i && i.naturalWidth > 0; })(),
        rival: document.querySelector('[data-testid="hof-rival"]').textContent, stats: document.querySelector('[data-testid="hof-stats"]').textContent };
    });
    c.ok(E.parts.length === 7 && E.parts.reduce((a, b) => a + b, 0) === E.score, 'seven Legacy parts sum to the score ' + JSON.stringify(E.parts) + ' = ' + E.score);
    c.ok(E.band === 'hail_damage' && E.logo, 'the entry is the Hail Damage career, logo drawn');
    c.ok(E.mem === 5, 'lineup avatars: you + four bandmates (' + E.mem + ')');
    c.ok(E.specials.length === 2 && /Big in Japan/.test(E.specials.join()), 'specials ' + E.specials);
    c.ok(/Buddy/.test(E.tro) && /Big in Japan/.test(E.tro), 'the trophies that career earned ' + E.tro);
    c.ok(E.years >= 2, 'a year strip (' + E.years + ' years)');
    await tap(page, 'hof-year-1');
    await page.waitForSelector(tid('hof-yearcard'));
    const card = await page.evaluate(() => ({ t: document.querySelector('[data-testid="hof-yearcard"]').textContent, on: document.querySelector('[data-testid="hof-year-1"]').getAttribute('aria-pressed') }));
    c.ok(/^Year 1: /.test(card.t) && /fans/.test(card.t) && card.on === 'true', 'tap a year: its card ' + JSON.stringify(card));
    bad = await audit(page);
    c.ok(bad.length === 0, 'entry layout ' + bad.join('; '));
    await page.screenshot({ path: path.join(CACHE, shotName('hof_entry.png')) });
    await tap(page, 'hof-entry-close');
    await waitScreen(page, 'hof');
    // The backup code: a meta-only GG1 code with every entry + its strip.
    await tap(page, 'hof-code');
    await waitScreen(page, 'code');
    const code = await page.evaluate(() => { const v = document.querySelector('[data-testid="code-text"]').value, r = GG.save.readCode(v);
      return { gg1: /^GG1:/.test(v), state: r.state, n: r.meta.entries.length, strips: r.meta.entries.every(e => Array.isArray(e.strip) && e.strip.length > 0), ach: Object.keys(r.meta.meta.ach).length,
        title: document.querySelector('.sheet-layer:not(.hidden) .sheet').textContent.slice(0, 80) }; });
    c.ok(code.gg1 && code.state === null && code.n === 3 && code.strips && code.ach >= 2, 'Backup code = a meta-only code with every entry and strip ' + JSON.stringify(code));
    bad = await audit(page);
    c.ok(bad.length === 0, 'code sheet layout ' + bad.join('; '));
    c.ok(errors.length === 0, 'no console errors ' + errors.join(' | '));
  } catch (e) { c.ok(false, 'list threw: ' + (e.stack || e)); }
  await close();
  c.done();
}

async function restore(seed) {
  const c = checker('restore');
  let career = null;
  {
    const { page, errors, close } = await boot(null);
    try {
      c.ok(await page.locator(tid('btn-hof')).count() === 0, 'a fresh phone: no Hall of Fame button');
      await tap(page, 'btn-code-restore');
      await waitScreen(page, 'code');
      await page.fill(tid('code-text'), 'Here you go:\n' + seed.code.slice(0, 40) + '\n' + seed.code.slice(40) + '\n');
      await tap(page, 'btn-code-load');
      await waitScreen(page, 'confirm');
      const q = await page.evaluate(() => document.querySelector('[data-screen="confirm"]').textContent);
      c.ok(/Restore Hall of Fame and trophies\?/.test(q) && /3 careers/.test(q), 'asks first ' + q.slice(0, 120));
      await tap(page, 'btn-confirm-yes');
      await page.waitForSelector(tid('btn-hof'), { timeout: 5000 }).catch(() => {});
      const r = await page.evaluate(() => ({ btn: !!document.querySelector('[data-testid="btn-hof"]'), n: GG.meta.hof().length, strips: GG.meta.hof().every(e => e.strip && e.strip.length),
        ach: GG.meta.has('buddy'), toast: document.getElementById('toast').textContent, screen: GG.debug('ui').screen }));
      c.ok(r.btn && r.n === 3 && r.strips && r.ach && r.screen === 'title', 'restored from the title: button, entries, strips, trophies ' + JSON.stringify(r));
      c.ok(/restored: 3 new/.test(r.toast), 'a toast says so ' + r.toast);
      await tap(page, 'btn-hof');
      await waitScreen(page, 'hof');
      c.ok(await page.locator('[data-testid^="hof-row-"]').count() === 3, 'the list shows them');
      // a career code from this phone carries the Hall of Fame lite
      career = await page.evaluate(() => { GG.main.quickStart({ seed: 99, openCard: false }); return GG.save.toCode(GG.state); });
      c.ok(errors.length === 0, 'no console errors ' + errors.join(' | '));
    } catch (e) { c.ok(false, 'restore threw: ' + (e.stack || e)); }
    await close();
  }
  {
    const { page, errors, close } = await boot(null);
    try {
      await tap(page, 'btn-code-restore');
      await waitScreen(page, 'code');
      await page.fill(tid('code-text'), career || '');
      await tap(page, 'btn-code-load');
      await page.waitForFunction(() => !!GG.state, null, { timeout: 10000 });
      const r = await page.evaluate(() => ({ seed: GG.state.seed, n: GG.meta.hof().length, strip: GG.meta.hof().some(e => e.strip), meta: '_meta' in GG.state }));
      c.ok(r.seed === 99 && r.n === 3 && !r.strip && !r.meta, 'a career code: the career loads, then the lite entries merge (no strips, no _meta on the state) ' + JSON.stringify(r));
      await page.evaluate(() => { GG.ui.closeAll(); GG.ui.show('hof'); });
      await waitScreen(page, 'hof');
      await tap(page, 'hof-row-0');
      await waitScreen(page, 'hof-entry');
      c.ok(/stayed on the other phone/.test(await page.evaluate(() => document.querySelector('[data-testid="hof-strip"]').textContent)), 'a lite entry says where its year strip is');
      // a broken code merges nothing
      await page.evaluate(() => { GG.ui.closeAll(); GG.ui.show('code', { mode: 'restore' }); });
      await waitScreen(page, 'code');
      await page.fill(tid('code-text'), (career || '').slice(0, -9) + 'xxxxxxxxx');
      await tap(page, 'btn-code-load');
      const err = await page.evaluate(() => ({ e: document.querySelector('[data-testid="code-error"]').textContent, n: GG.meta.hof().length, screen: GG.debug('ui').screen }));
      c.ok(err.e.length > 3 && err.n === 3 && err.screen === 'code', 'a damaged code: an error, nothing merged ' + JSON.stringify(err));
      c.ok(errors.length === 0, 'no console errors ' + errors.join(' | '));
    } catch (e) { c.ok(false, 'restore (career code) threw: ' + (e.stack || e)); }
    await close();
  }
  c.done();
}

async function empty() {
  const c = checker('empty');
  const { page, errors, close } = await boot(null);
  try {
    const t = await page.evaluate(() => ({ btn: !!document.querySelector('[data-testid="btn-hof"]'), n: GG.meta.hof().length, scanned: GG.meta.get().scanned === GG.VERSION }));
    c.ok(!t.btn && t.n === 0 && t.scanned, 'empty storage: no title button, scanned once ' + JSON.stringify(t));
  } catch (e) { c.ok(false, 'empty threw: ' + (e.stack || e)); }
  try {
    await page.evaluate(() => { GG.main.quickStart({ seed: 12, openCard: false }); GG.ui.closeAll(); GG.ui.show('menu'); });
    await waitScreen(page, 'menu');
    const sz = await page.evaluate(() => { const r = document.querySelector('[data-testid="menu-hof"]').getBoundingClientRect(); return [r.width, r.height]; });
    c.ok(sz[0] >= 47.5 && sz[1] >= 47.5, '☰ Hall of Fame >= 48 px ' + sz);
    await tap(page, 'menu-hof');
    await waitScreen(page, 'hof');
    const h = await page.evaluate(() => ({ empty: (document.querySelector('[data-testid="hof-empty"]') || {}).textContent, code: document.querySelector('[data-testid="hof-code"]').disabled }));
    c.ok(/No careers yet/.test(h.empty || '') && h.code, 'No careers yet; nothing to back up ' + JSON.stringify(h));
    const bad = await audit(page);
    c.ok(bad.length === 0, 'layout ' + bad.join('; '));
    await tap(page, 'hof-close');
    await waitScreen(page, 'menu');
    c.ok(errors.length === 0, 'no console errors ' + errors.join(' | '));
  } catch (e) { c.ok(false, 'empty (menu) threw: ' + (e.stack || e)); }
  await close();
  c.done();
}

(async () => {
  const seed = want('list') || want('restore') ? seedMeta() : null;
  if (want('list')) await list(seed);
  if (want('restore')) await restore(seed);
  if (want('empty')) await empty();
})();
