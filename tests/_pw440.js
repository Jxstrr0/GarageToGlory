// Playwright helper: phone-portrait Chromium, local three.js cache, console-error capture.
// const { open } = require('./_pw'); const { page, errors, close } = await open(); ... await close();
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
let pw;
try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const ROOT = path.join(__dirname, '..');
const CACHE = path.join(__dirname, '.cache');
const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.149.0/three.min.js';
const THREE_FILE = path.join(CACHE, 'three-0.149.0.min.js');

function ensureThree() {
  if (fs.existsSync(THREE_FILE) && fs.statSync(THREE_FILE).size > 100000) return;
  fs.mkdirSync(CACHE, { recursive: true });
  execFileSync('curl', ['-sSfL', '-o', THREE_FILE, THREE_URL]);
}

async function open(opts) {
  opts = opts || {};
  ensureThree();
  const browser = await pw.chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const context = await browser.newContext({ viewport: { width: 440, height: 956 }, deviceScaleFactor: opts.dpr || 1, isMobile: true, hasTouch: true });
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
    ok(cond, msg) { res.push([msg, !!cond]); if (!cond) console.log('FAIL ' + label + ' > ' + msg); },
    done() { const f = res.filter(r => !r[1]).length; console.log((f ? 'FAILED ' + f + '/' : 'ALL PASS ') + res.length + ' (' + label + ')'); if (f) process.exitCode = 1; }
  };
}
module.exports = { open, checker, pw, ROOT, THREE_FILE };
