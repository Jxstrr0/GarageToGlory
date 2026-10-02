// Garage to Glory build: concatenates src/ into one self-contained HTML file.
// ORDER rule: 01_ns, 02_contracts, then content/*.js, then every other src/*.js by name.
// v1.0: full-line `//` comments are stripped from every JS module in dist/ (never a line inside a template literal or a
// block comment; trailing comments after code stay). NOSTRIP=1 keeps them. The size printed is bytes on disk (+ KiB).
const fs = require('fs'), path = require('path');
const SRC = path.join(__dirname, 'src'), DIST = path.join(__dirname, 'dist');
const js = d => fs.readdirSync(d).filter(f => f.endsWith('.js')).sort();
const top = js(SRC), content = js(path.join(SRC, 'content')).map(f => 'content/' + f);
const ORDER = [...top.filter(f => f < '03'), ...content, ...top.filter(f => f >= '03')];

// A small JS lexer (strings, template literals with ${} nesting, comments, regex literals by the previous token) that
// drops every line whose first non-blank characters are `//` while the lexer is in plain code at template depth 0.
// Returns { code, lines: [0-based line numbers stripped], bytes (UTF-8 bytes removed), ticks (template backticks seen),
// end: { mode, depth } } — a clean file ends with mode 'code' and depth 0 (the backtick-parity guard in tests/build.test.js).
const REGEX_AFTER = '(,=:[!&|?{};+-*%<>~^';
const REGEX_WORDS = ['return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void', 'throw', 'instanceof', 'yield', 'await'];
function strip(src) {
  const n = src.length, out = [], lines = [];
  let i = 0, seg = 0, line = 0, lineStart = true, bytes = 0, ticks = 0;
  let mode = 'code';          // 'code' | 'tpl' (inside a template literal's text)
  const stack = [];           // one brace depth per open ${ } expression; the template text resumes when it closes
  let prev = '', word = '';   // last significant code character / the identifier it ended
  function skipLine(from) { const e = src.indexOf('\n', from); return e < 0 ? n : e; }
  while (i < n) {
    if (lineStart) {
      lineStart = false;
      if (mode === 'code' && !stack.length) {
        let j = i;
        while (j < n && (src[j] === ' ' || src[j] === '\t' || src[j] === '\r')) j++;
        if (src[j] === '/' && src[j + 1] === '/') {
          let e = skipLine(j); e = e < n ? e + 1 : n;
          out.push(src.slice(seg, i));
          bytes += Buffer.byteLength(src.slice(i, e));
          lines.push(line);
          i = seg = e; line++; lineStart = true;
          continue;
        }
      }
    }
    const c = src[i];
    if (c === '\n') { line++; lineStart = true; i++; continue; }
    if (mode === 'tpl') {
      if (c === '\\') { if (src[i + 1] === '\n') { line++; lineStart = true; } i += 2; continue; }
      if (c === '`') { ticks++; mode = 'code'; prev = ')'; word = ''; i++; continue; }
      if (c === '$' && src[i + 1] === '{') { stack.push(0); mode = 'code'; prev = '{'; word = ''; i += 2; continue; }
      i++; continue;
    }
    // plain code
    if (c === ' ' || c === '\t' || c === '\r') { i++; continue; }
    if (c === '\'' || c === '"') {
      i++;
      while (i < n && src[i] !== c && src[i] !== '\n') { if (src[i] === '\\') { if (src[i + 1] === '\n') line++; i++; } i++; }
      i++; prev = '"'; word = ''; continue;
    }
    if (c === '`') { ticks++; mode = 'tpl'; i++; continue; }
    if (c === '/' && src[i + 1] === '/') { i = skipLine(i); continue; }
    if (c === '/' && src[i + 1] === '*') {
      const e = src.indexOf('*/', i + 2), end = e < 0 ? n : e + 2;
      for (let k = i; k < end; k++) if (src[k] === '\n') line++;
      i = end; continue;
    }
    if (c === '/') {
      const isRegex = prev === '' || REGEX_AFTER.indexOf(prev) >= 0 || (word && REGEX_WORDS.indexOf(word) >= 0);
      if (isRegex) {
        let j = i + 1, cls = false, ok = false;
        while (j < n && src[j] !== '\n') {
          const d = src[j];
          if (d === '\\') { j += 2; continue; }
          if (d === '[') cls = true; else if (d === ']') cls = false;
          else if (d === '/' && !cls) { ok = true; break; }
          j++;
        }
        if (ok) { j++; while (j < n && /[a-z]/i.test(src[j])) j++; i = j; prev = ')'; word = ''; continue; }
      }
      prev = '/'; word = ''; i++; continue;
    }
    if (c === '{') { if (stack.length) stack[stack.length - 1]++; prev = '{'; word = ''; i++; continue; }
    if (c === '}') {
      if (stack.length && stack[stack.length - 1] === 0) { stack.pop(); mode = 'tpl'; i++; continue; }
      if (stack.length) stack[stack.length - 1]--;
      prev = '}'; word = ''; i++; continue;
    }
    if (/[\w$]/.test(c)) {
      let j = i; while (j < n && /[\w$]/.test(src[j])) j++;
      word = src.slice(i, j); prev = 'a'; i = j; continue;
    }
    prev = c; word = ''; i++;
  }
  out.push(src.slice(seg));
  return { code: out.join(''), lines, bytes, ticks, end: { mode, depth: stack.length } };
}

function build() {
  const ver = fs.readFileSync(path.join(__dirname, 'VERSION'), 'utf8').trim();
  const keep = !!process.env.NOSTRIP;
  let nLines = 0, nBytes = 0;
  const scripts = ORDER.map(f => {
    let code = fs.readFileSync(path.join(SRC, f), 'utf8');
    if (!keep) { const s = strip(code); code = s.code; nLines += s.lines.length; nBytes += s.bytes; }
    return `<script>/* ${f} */\n${code}\n</script>`;
  }).join('\n');
  const html = fs.readFileSync(path.join(SRC, '00_shell.html'), 'utf8')
    .replace('<!-- SCRIPTS -->', () => scripts).replace(/__VERSION__/g, ver);
  fs.mkdirSync(DIST, { recursive: true });
  for (const f of fs.readdirSync(DIST)) if (/^Garage to Glory - V.*\.html$/.test(f)) fs.unlinkSync(path.join(DIST, f));
  fs.writeFileSync(path.join(DIST, 'game.html'), html);
  fs.writeFileSync(path.join(DIST, 'game.artifact.html'), html.replace(/<!doctype html>|<\/?html[^>]*>|<\/?head>|<\/?body[^>]*>/gi, ''));
  fs.writeFileSync(path.join(DIST, `Garage to Glory - V${ver}.html`), html);
  const size = fs.statSync(path.join(DIST, 'game.html')).size;
  console.log(`built V${ver}: ${ORDER.length} modules, ${size.toLocaleString('en-US')} B on disk (${(size / 1024).toFixed(1)} KiB)` +
    (keep ? ', comments kept (NOSTRIP=1)' : `, stripped ${nLines.toLocaleString('en-US')} comment lines (${nBytes.toLocaleString('en-US')} B)`));
}
if (require.main === module) build();
module.exports = { ORDER, build, strip };
