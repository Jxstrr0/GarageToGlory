// Runs every tests/*.test.js in its own process. Usage: node tests/run.js [filter]
const { execFileSync } = require('child_process'), fs = require('fs'), path = require('path');
const filter = process.argv[2] || '';
let bad = 0;
for (const f of fs.readdirSync(__dirname).filter(f => f.endsWith('.test.js') && f.includes(filter)).sort()) {
  try { const out = execFileSync(process.execPath, [path.join(__dirname, f)], { encoding: 'utf8' }); process.stdout.write(out.split('\n').filter(l => /FAIL|ALL PASS/.test(l)).join('\n') + '\n'); }
  catch (e) { bad++; process.stdout.write((e.stdout || '') + (e.stderr || '').split('\n').slice(0, 8).join('\n') + '\n'); }
}
console.log(bad ? 'SUITE FAILED (' + bad + ' files)' : 'SUITE ALL PASS');
process.exitCode = bad ? 1 : 0;
