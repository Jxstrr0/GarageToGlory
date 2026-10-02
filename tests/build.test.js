// Build tests (v1.0 stage 0): build.js strips full-line `//` comments from every JS module in dist/ (NOSTRIP=1 keeps them).
// Guards: backtick parity per module (the lexer ends outside any template literal), zero stripped lines inside template
// literals (checked against acorn's comment list when acorn is installed: exactly the full-line line comments go), every
// stripped module parses, and the stripped sims behave identically (GG.content and seeded 2-year bot careers per band).
const fs = require('fs'), path = require('path'), vm = require('vm');
const { test, ok, eq, done } = require('./_t');
const { ORDER, strip } = require('../build.js');
const load = require('./_load');
const SRC = path.join(__dirname, '..', 'src');
let acorn = null;
for (const p of ['acorn', '/opt/node22/lib/node_modules/eslint/node_modules/acorn', '/opt/node22/lib/node_modules/ts-node/node_modules/acorn']) {
  try { acorn = require(p); break; } catch (e) { /* next */ }
}
const src = f => fs.readFileSync(path.join(SRC, f), 'utf8');

test('strip(): synthetic cases (templates, block comments, trailing comments, strings, regexes)', () => {
  const cases = [
    ['a();\n// gone\nb();\n', 'a();\nb();\n', 1],
    ['  // indented gone\nx = 1; // trailing stays\n', 'x = 1; // trailing stays\n', 1],
    ['var t = `\n// kept: inside a template\n${ a }\n// kept too\n`;\n// gone\n', 'var t = `\n// kept: inside a template\n${ a }\n// kept too\n`;\n', 1],
    ['var t = `x ${ f(`\n// nested template keeps\n`) } y`;\n', null, 0],
    ['/* block\n// inside a block comment stays\n*/\n', null, 0],
    ["var s = '// not a comment';\nvar d = \"`\"; var e = '`';\n// gone\n", "var s = '// not a comment';\nvar d = \"`\"; var e = '`';\n", 1],
    ['var r = /[`\'"]/g, q = a / b / c;\n// gone\nvar u = `ok`;\n', 'var r = /[`\'"]/g, q = a / b / c;\nvar u = `ok`;\n', 1],
    ['if (x) return /\\/\\//.test(y);\n// gone', 'if (x) return /\\/\\//.test(y);\n', 1]
  ];
  cases.forEach(([inp, out, n], i) => {
    const r = strip(inp);
    eq(r.code, out == null ? inp : out, 'case ' + i);
    eq([r.lines.length, r.end], [n, { mode: 'code', depth: 0 }], 'case ' + i + ' lines/end');
  });
  eq(strip('// a\n// b\nx\n').bytes, 10, 'bytes removed (UTF-8)');
});

test('every module: backtick parity holds (the lexer ends outside any template literal)', () => {
  const bad = ORDER.filter(f => { const r = strip(src(f)); return r.end.mode !== 'code' || r.end.depth !== 0 || r.ticks % 2; });
  eq(bad, [], 'modules ending inside a template literal');
});

test('every module: exactly the full-line comments are stripped, none inside a template literal (acorn)', () => {
  if (!acorn) { console.log('note: acorn not installed; the exact comment check is skipped (parity + parse + equivalence still run)'); return; }
  let total = 0;
  ORDER.forEach(f => {
    const code = src(f), lines = code.split('\n'), full = new Set(), tpl = [];
    acorn.parse(code, { ecmaVersion: 'latest', locations: true, onComment: (block, text, s, e, ls) => {
      if (!block && /^\s*$/.test(lines[ls.line - 1].slice(0, ls.column))) full.add(ls.line - 1);
    }, onToken: t => { if (t.type.label === 'template') tpl.push([t.loc.start.line - 1, t.loc.end.line - 1]); } });
    const r = strip(code), mine = new Set(r.lines);
    eq([...full].filter(x => !mine.has(x)).map(x => x + 1), [], f + ': full-line comments left in');
    eq([...mine].filter(x => !full.has(x)).map(x => x + 1), [], f + ': lines stripped that are not comments');
    eq(r.lines.filter(L => tpl.some(([a, b]) => L > a && L <= b)).map(x => x + 1), [], f + ': stripped lines inside a template literal');
    total += r.lines.length;
  });
  ok(total > 3000, 'comment lines stripped: ' + total);
});

test('every stripped module parses; the stripped dist is smaller', () => {
  let before = 0, after = 0;
  ORDER.forEach(f => {
    const code = src(f), r = strip(code);
    before += Buffer.byteLength(code); after += Buffer.byteLength(r.code);
    let err = null; try { new vm.Script(r.code, { filename: f }); } catch (e) { err = e.message; }
    eq(err, null, f + ' parses after stripping');
  });
  ok(before - after > 300000, 'bytes saved: ' + (before - after));
});

test('strip-equivalence: GG.content and seeded 2-year bot careers are identical with and without comments', () => {
  const A = load({ localStorage: load.fakeStorage() }), B = load({ localStorage: load.fakeStorage(), strip: true });
  ok(JSON.stringify(A.content) === JSON.stringify(B.content), 'GG.content identical');
  eq(Object.keys(B), Object.keys(A), 'same GG modules');
  Object.keys(A.content.bands).forEach((bandId, i) => {
    const style = i % 2 ? 'good' : 'avg';
    const play = G => { const s = G.career.newCareer({ seed: 4242 + i, bandId, player: { name: 'Strip' } }); for (let w = 0; w < 48; w++) G.career.botWeek(s, style); return JSON.stringify(s); };
    const a = play(A), b = play(B);
    ok(a === b, bandId + ' (' + style + '): 2-year bot state identical');
    ok(JSON.parse(a).totalWeek === 49, bandId + ' played two years');
  });
});

done('build');
