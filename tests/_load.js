// Node loader: runs the DOM-free modules (ns, contracts, content, save, sims) in a fresh vm context.
// const GG = require('./_load')({ localStorage: fakeStorage() });
// v1.0: { strip: true } loads each module with its full-line comments stripped, exactly as build.js ships it (build.test.js).
const fs = require('fs'), path = require('path'), vm = require('vm');
const { ORDER, strip } = require('../build.js');
const SRC = path.join(__dirname, '..', 'src');
const VERSION = fs.readFileSync(path.join(__dirname, '..', 'VERSION'), 'utf8').trim();
const SIM_SAFE = /^(0[12]_|1\d_|2[\da-z]_|content\/)/;   // v0.8: 2a_sim_shop, 2b_sim_creator

function fakeStorage(opts) {
  const m = new Map(), o = opts || {};
  return {
    getItem: k => { if (o.throwOnRead) throw new Error('blocked'); return m.has(k) ? m.get(k) : null; },
    setItem: (k, v) => { if (o.throwOnWrite) throw new Error('QuotaExceededError'); m.set(k, String(v)); },
    removeItem: k => { m.delete(k); },
    key: i => Array.from(m.keys())[i] || null,
    get length() { return m.size; },
    _map: m
  };
}

function load(opts) {
  opts = opts || {};
  const ctx = { console, Math, JSON, Date, Object, Array, String, Number, Boolean, Error, Map, Set, RegExp, parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent, TextEncoder, TextDecoder, Uint8Array, Uint16Array, Uint32Array };
  if (opts.localStorage !== undefined) ctx.localStorage = opts.localStorage;
  if (opts.globals) Object.assign(ctx, opts.globals);   // v1.6: e.g. { matchMedia } (fx.test: the OS's reduced motion)
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of ORDER.filter(f => SIM_SAFE.test(f))) {
    let code = fs.readFileSync(path.join(SRC, f), 'utf8');
    if (opts.strip) code = strip(code).code;
    code = code.replace(/__VERSION__/g, VERSION);
    vm.runInContext(code, ctx, { filename: f });
  }
  return ctx.GG;
}
load.fakeStorage = fakeStorage;
load.VERSION = VERSION;
module.exports = load;
