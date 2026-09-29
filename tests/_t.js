// Tiny test harness. Each *.test.js: const { test, eq, ok, done } = require('./_t'); ...; done();
const results = [];
function test(name, fn) {
  try { fn(); results.push([name, null]); } catch (e) { results.push([name, e]); }
}
function ok(cond, msg) { if (!cond) throw new Error(msg || 'expected truthy'); }
function eq(a, b, msg) {
  const A = JSON.stringify(a), B = JSON.stringify(b);
  if (A !== B) throw new Error((msg ? msg + ': ' : '') + 'expected ' + B + ' got ' + A);
}
function done(label) {
  const fails = results.filter(r => r[1]);
  for (const [n, e] of fails) console.log('FAIL ' + (label ? label + ' > ' : '') + n + ' :: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e));
  console.log((fails.length ? 'FAILED ' + fails.length + '/' : 'ALL PASS ') + results.length + (label ? ' (' + label + ')' : ''));
  if (fails.length) process.exitCode = 1;
}
module.exports = { test, ok, eq, done };
