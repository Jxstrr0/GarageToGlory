// v1.5 "Desktop" (stage 0, lead): the phone-law CSS lint. The desktop styles may only ever apply under the desktop classes
// (contract §4.6 / §4.5), so a phone (none of them set) can never see one of them:
//   - src/5w_ui_wide.js (Lane W): every selector of its injected CSS starts with html.gg-wide or html.gg-desk;
//   - src/50k_ui_keys.js (Lane N): every selector starts with html.gg-kbnav or html.gg-wide;
//   - every other src/ file (00_shell.html included): .gg-wide / .gg-desk / .gg-keys / .gg-kbnav appear only on html, as a
//     selector's leading compound (html.gg-wide .x, html.gg-desk.gg-keys .y); JS class toggles ('gg-wide', no dot) are free.
// 5w and 50k declare ALL their CSS in one `var CSS = <expression>;` made of string literals (+, or an array + .join()), which
// this test evaluates with no globals. Absent files pass (stage 0); the lint then guards the lanes.
const fs = require('fs'), path = require('path');
const { test, ok, eq, done } = require('./_t');
const { strip } = require('../build.js');
const SRC = path.join(__dirname, '..', 'src');
const DESK = /\.gg-(wide|desk|keys|kbnav)\b/g;

// The source text of `var CSS = ...;` (to the first ';' outside strings / brackets), or null.
function cssExpr(src) {
  const m = /\bvar CSS\s*=\s*/.exec(src);
  if (!m) return null;
  let i = m.index + m[0].length, depth = 0;
  const start = i;
  while (i < src.length) {
    const c = src[i];
    if (c === '\'' || c === '"' || c === '`') { const q = c; i++; while (i < src.length && src[i] !== q) { if (src[i] === '\\') i++; i++; } i++; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i + 2) + 2; continue; }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (c === ';' && depth === 0) return src.slice(start, i);
    i++;
  }
  return null;
}
function evalCss(expr) { return String(new Function('"use strict"; return (' + expr + ');')()); }

// Every style-rule selector of a stylesheet (inside @media / @supports too; @keyframes / @font-face bodies skipped).
function selectors(css) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  (function walk(s) {
    let i = 0;
    while (i < s.length) {
      const open = s.indexOf('{', i);
      if (open < 0) break;
      const head = s.slice(i, open).trim();
      let d = 1, j = open + 1;
      while (j < s.length && d) { if (s[j] === '{') d++; else if (s[j] === '}') d--; j++; }
      const body = s.slice(open + 1, j - 1);
      if (/^@(media|supports|layer|container)\b/.test(head)) walk(body);
      else if (!/^@/.test(head) && head) {
        let p = 0, cur = '';
        for (const ch of head) { if (ch === '(' || ch === '[') p++; if (ch === ')' || ch === ']') p--; if (ch === ',' && !p) { out.push(cur.trim()); cur = ''; } else cur += ch; }
        if (cur.trim()) out.push(cur.trim());
      }
      i = j;
    }
  })(css);
  return out;
}
const leads = (sel, classes) => classes.some(c => new RegExp('^html\\.' + c + '(?![\\w-])').test(sel));

function checkOwned(file, classes) {
  const p = path.join(SRC, file);
  if (!fs.existsSync(p)) return { absent: true, bad: [] };
  const src = fs.readFileSync(p, 'utf8'), expr = cssExpr(src);
  if (expr == null) return { absent: false, bad: [file + ': no `var CSS = ...;`'] };
  let css;
  try { css = evalCss(expr); } catch (e) { return { absent: false, bad: [file + ': var CSS is not a plain string expression (' + e.message + ')'] }; }
  const sels = selectors(css);
  return { absent: false, n: sels.length, bad: sels.filter(s => !leads(s, classes)).map(s => file + ': ' + s) };
}

test('selectors() and leads() (the lint itself)', () => {
  eq(selectors('a, b > c { x: 1 } @media (min-width: 1px) { html.gg-wide .d:is(.e, .f) { y: 2 } } @keyframes k { from { o: 0 } to { o: 1 } }'),
    ['a', 'b > c', 'html.gg-wide .d:is(.e, .f)']);
  ok(leads('html.gg-wide .x', ['gg-wide']) && leads('html.gg-desk.gg-keys .y', ['gg-desk']) && leads('html.gg-wide', ['gg-wide']));
  ok(!leads('.x html.gg-wide', ['gg-wide']) && !leads('html.gg-wider .x', ['gg-wide']) && !leads('.gg-wide .x', ['gg-wide']) && !leads('html .x', ['gg-wide']));
  eq(evalCss(cssExpr("var A = 1; var CSS = ['html.gg-wide .a { b: c; }', 'html.gg-desk ::-webkit-scrollbar { d: e }'].join('\\n'); x();")), 'html.gg-wide .a { b: c; }\nhtml.gg-desk ::-webkit-scrollbar { d: e }');
  eq(evalCss(cssExpr("var CSS = 'html.gg-kbnav :focus-visible { a: b }' // c\n + 'html.gg-wide.gg-keys .kb-hints { d: e }';")), 'html.gg-kbnav :focus-visible { a: b }html.gg-wide.gg-keys .kb-hints { d: e }');
});

test('5w_ui_wide.js: every selector starts with html.gg-wide or html.gg-desk', () => {
  const r = checkOwned('5w_ui_wide.js', ['gg-wide', 'gg-desk']);
  ok(!r.bad.length, r.bad.slice(0, 8).join(' | '));
  if (!r.absent) ok(r.n > 0, '5w has CSS rules');
});

test('50k_ui_keys.js: every selector starts with html.gg-kbnav or html.gg-wide', () => {
  const r = checkOwned('50k_ui_keys.js', ['gg-kbnav', 'gg-wide']);
  ok(!r.bad.length, r.bad.slice(0, 8).join(' | '));
});

test('no other src/ file names a desktop class except as html.<class> leading a selector', () => {
  const bad = [];
  const files = fs.readdirSync(SRC).filter(f => /\.(js|html)$/.test(f) && f !== '5w_ui_wide.js' && f !== '50k_ui_keys.js')
    .concat(fs.readdirSync(path.join(SRC, 'content')).filter(f => f.endsWith('.js')).map(f => 'content/' + f));
  for (const f of files) {
    const raw = fs.readFileSync(path.join(SRC, f), 'utf8'), src = f.endsWith('.js') ? strip(raw).code : raw;   // (full-line comments are free)
    let m;
    DESK.lastIndex = 0;
    while ((m = DESK.exec(src))) {
      // the text from the selector's start up to this class: must be html(.class)* right after a selector boundary
      const before = src.slice(Math.max(0, m.index - 80), m.index);
      if (!/(^|[\s'"`,{}(]|\\n)html(\.[\w-]+)*$/.test(before)) {
        bad.push(f + ' ' + src.slice(Math.max(0, m.index - 30), m.index + 20).replace(/\s+/g, ' '));
      }
    }
  }
  ok(!bad.length, bad.slice(0, 8).join(' | '));
});

done('wide_css');
