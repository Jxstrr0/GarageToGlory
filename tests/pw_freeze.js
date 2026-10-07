// pw_freeze.js (v1.5 "Desktop" stage 0, lead): the phone law, recomputed. tools/phone_freeze.js walks the phone screens in a
// phone context and this test compares every recorded fact (rects, display, fonts, padding, grid columns, outline, shadow,
// opacity, visibility, transform, z-index, html classes, focus, 3D insets, garage hotspots + labels, gig highway + stage frame)
// with tests/fixtures/phone_freeze_<size>.json, recorded on the untouched 1.4.0.0 tree. In the pw matrix forever.
// Sections (META_ONLY=390|440|844l, comma-separated): default = the size in PW_VIEW when it is one of 390x844 / 440x956 /
// 844x390, else all three. Each finishes in ~75 s (844l ~35 s).
// A difference is a phone layout change: fix the code. Never edit a fixture to pass (a fixture change needs the lead + a logged
// reason in plan/status.md; re-record with `PW_VIEW=<size> node tools/phone_freeze.js --write`).
// Run: node build.js && META_ONLY=390 timeout 500 node tests/pw_freeze.js
const fs = require('fs'), path = require('path');
const { checker, VIEW } = require('./_pw');
const F = require('../tools/phone_freeze');

const ONLY = (process.env.META_ONLY || '').split(',').filter(Boolean);
const own = process.env.PW_VIEW ? F.tagOf(VIEW) : null;
const want = s => ONLY.length ? ONLY.includes(s) : own ? s === own : true;

async function section(tag) {
  const c = checker('freeze ' + tag);
  try {
    const file = F.fixturePath(tag);
    c.ok(fs.existsSync(file), 'fixture ' + path.basename(file));
    const fix = JSON.parse(fs.readFileSync(file, 'utf8'));
    const t0 = Date.now(), got = await F.capture(tag);
    const d = F.diff(fix, got);
    c.ok(Object.keys(got.screens).length === Object.keys(fix.screens).length, Object.keys(got.screens).length + ' screens walked (' + Object.keys(fix.screens).length + ' in the fixture) in ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s');
    c.ok(!got.skipped.length, 'nothing skipped ' + got.skipped.join(','));
    c.ok(!d.length, 'phone layout equal to the fixture' + (d.length ? ': ' + d.length + ' differences\n  ' + d.slice(0, 40).join('\n  ') : ''));
    c.ok(!got.errors.length, 'no console errors ' + got.errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'freeze ' + tag + ' threw: ' + (e && e.stack || e)); }
  c.done();
}

(async () => {
  for (const tag of Object.keys(F.SIZES)) if (want(tag)) await section(tag);
})();
