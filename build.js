// Garage to Glory build: concatenates src/ into one self-contained HTML file.
// ORDER rule: 01_ns, 02_contracts, then content/*.js, then every other src/*.js by name.
const fs = require('fs'), path = require('path');
const SRC = path.join(__dirname, 'src'), DIST = path.join(__dirname, 'dist');
const js = d => fs.readdirSync(d).filter(f => f.endsWith('.js')).sort();
const top = js(SRC), content = js(path.join(SRC, 'content')).map(f => 'content/' + f);
const ORDER = [...top.filter(f => f < '03'), ...content, ...top.filter(f => f >= '03')];
function build() {
  const ver = fs.readFileSync(path.join(__dirname, 'VERSION'), 'utf8').trim();
  const scripts = ORDER.map(f => `<script>/* ${f} */\n${fs.readFileSync(path.join(SRC, f), 'utf8')}\n</script>`).join('\n');
  const html = fs.readFileSync(path.join(SRC, '00_shell.html'), 'utf8')
    .replace('<!-- SCRIPTS -->', () => scripts).replace(/__VERSION__/g, ver);
  fs.mkdirSync(DIST, { recursive: true });
  for (const f of fs.readdirSync(DIST)) if (/^Garage to Glory - V.*\.html$/.test(f)) fs.unlinkSync(path.join(DIST, f));
  fs.writeFileSync(path.join(DIST, 'game.html'), html);
  fs.writeFileSync(path.join(DIST, 'game.artifact.html'), html.replace(/<!doctype html>|<\/?html[^>]*>|<\/?head>|<\/?body[^>]*>/gi, ''));
  fs.writeFileSync(path.join(DIST, `Garage to Glory - V${ver}.html`), html);
  console.log(`built V${ver}: ${ORDER.length} modules, ${(html.length / 1024).toFixed(1)} KB`);
}
if (require.main === module) build();
module.exports = { ORDER, build };
