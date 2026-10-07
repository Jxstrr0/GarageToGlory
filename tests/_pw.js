// Playwright helper: phone-portrait Chromium, local three.js cache, console-error capture.
// const { open } = require('./_pw'); const { page, errors, close } = await open(); ... await close();
// v1.5: open({ desktop: true }) -> isMobile: false, hasTouch: false (pw_keys / pw_nav / pw_wide; viewport via opts.viewport).
// v1.0: PW_VIEW=<w>x<h> sets the viewport (default 390x844; the owner's iPhone is 440x956). PW_TAG is a suffix for screenshot
// names (shotName('x.png') -> 'x' + TAG + '.png'); with a non-default PW_VIEW and no PW_TAG it defaults to '_<w>' (also set
// in process.env.PW_TAG, so sections that read it directly keep the 390 shots).
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
let pw;
try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const ROOT = path.join(__dirname, '..');
const CACHE = path.join(__dirname, '.cache');
const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.149.0/three.min.js';
const THREE_FILE = path.join(CACHE, 'three-0.149.0.min.js');
const VIEW = (function () {
  const m = /^(\d+)x(\d+)$/.exec(String(process.env.PW_VIEW || '').trim());
  return m ? { width: +m[1], height: +m[2] } : { width: 390, height: 844 };
})();
const DEFAULT_VIEW = VIEW.width === 390 && VIEW.height === 844;
if (process.env.PW_TAG == null && !DEFAULT_VIEW) process.env.PW_TAG = '_' + VIEW.width;
const TAG = process.env.PW_TAG || '';
function shotName(name) { return TAG && !name.endsWith(TAG + '.png') ? name.replace(/(\.png)?$/, TAG + '.png') : name; }

function ensureThree() {
  if (fs.existsSync(THREE_FILE) && fs.statSync(THREE_FILE).size > 100000) return;
  fs.mkdirSync(CACHE, { recursive: true });
  execFileSync('curl', ['-sSfL', '-o', THREE_FILE, THREE_URL]);
}

async function open(opts) {
  opts = opts || {};
  ensureThree();
  const browser = await pw.chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  // v1.5: open({ desktop: true }) = a computer (no touch, fine pointer + hover); the default stays the phone context
  const phone = !opts.desktop;
  const context = await browser.newContext({ viewport: opts.viewport || { width: VIEW.width, height: VIEW.height }, deviceScaleFactor: opts.dpr || 1, isMobile: phone, hasTouch: phone });
  await context.route('**/three.min.js', r => r.fulfill({ path: THREE_FILE, contentType: 'application/javascript' }));
  const page = await context.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + (e.stack || e.message)));
  const url = 'file://' + path.join(ROOT, 'dist', opts.file || 'game.html') + (opts.query || '');
  if (!opts.noGoto) await page.goto(url);
  return { browser, context, page, errors, url, close: () => browser.close() };
}

// Minimal assertion collector for pw_* scripts.
function checker(label) {
  const res = [];
  return {
    ok(cond, msg) { res.push([msg, !!cond]); if (!cond) console.log('FAIL ' + label + ' > ' + msg); else if (process.env.PW_VERBOSE) console.log('ok ' + label + ' > ' + msg); },   // (PW_VERBOSE=1: passes too)
    done() { const f = res.filter(r => !r[1]).length; console.log((f ? 'FAILED ' + f + '/' : 'ALL PASS ') + res.length + ' (' + label + ')'); if (f) process.exitCode = 1; }
  };
}
// v1.3 "Songwriter": the songwriter's tools (the jam, the metronome, the shop, copy / clear, part tweaks, ...) live in the header's
// ⋯ menu (modal 'seq-tools'). openTools(page) taps ⋯ and waits for the menu; tap a tool inside it afterwards.
async function openTools(page) {
  await page.locator('[data-testid="btn-seq-tools"]').last().click();
  await page.waitForFunction(() => GG.debug('ui').screen === 'seq-tools', null, { timeout: 5000 });
}
module.exports = { open, checker, pw, ROOT, THREE_FILE, VIEW, TAG, shotName, openTools };
