// 01_ns.js: window.GG namespace, event bus, seeded RNG, small utils, debug registry.
// Loaded first. Works in the browser and in node (tests set window = globalThis).
(function (root) {
  var GG = root.GG = root.GG || {};
  GG.VERSION = '__VERSION__';
  GG.content = GG.content || {};

  // ---- Event bus -------------------------------------------------------
  var handlers = {};
  GG.on = function (ev, fn) {
    (handlers[ev] = handlers[ev] || []).push(fn);
    return function () { GG.off(ev, fn); };
  };
  GG.off = function (ev, fn) {
    var list = handlers[ev]; if (!list) return;
    var i = list.indexOf(fn); if (i >= 0) list.splice(i, 1);
  };
  GG.once = function (ev, fn) {
    var off = GG.on(ev, function (p) { off(); fn(p); });
    return off;
  };
  GG.emit = function (ev, payload) {
    var list = handlers[ev]; if (!list) return;
    list = list.slice();
    for (var i = 0; i < list.length; i++) {
      try { list[i](payload); } catch (e) { if (root.console) console.error('[GG] handler for "' + ev + '" failed:', e); }
    }
  };
  GG.clearHandlers = function () { handlers = {}; }; // tests only

  // ---- Seeded RNG (mulberry32) ----------------------------------------
  // The career's RNG state lives in state.rng (a uint32) so saves resume deterministically.
  function step(s) {
    s = (s + 0x6D2B79F5) >>> 0;
    var t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return { s: s, v: ((t ^ (t >>> 14)) >>> 0) / 4294967296 };
  }
  function api(get, set) {
    var r = {
      next: function () { var o = step(get()); set(o.s); return o.v; },
      int: function (lo, hi) { return lo + Math.floor(r.next() * (hi - lo + 1)); },
      range: function (lo, hi) { return lo + r.next() * (hi - lo); },
      chance: function (p) { return r.next() < p; },
      pick: function (arr) { return arr && arr.length ? arr[Math.floor(r.next() * arr.length)] : undefined; },
      weighted: function (arr, wfn) {
        var tot = 0, i; for (i = 0; i < arr.length; i++) tot += Math.max(0, wfn(arr[i]));
        if (tot <= 0) return undefined;
        var x = r.next() * tot;
        for (i = 0; i < arr.length; i++) { x -= Math.max(0, wfn(arr[i])); if (x < 0) return arr[i]; }
        return arr[arr.length - 1];
      },
      shuffle: function (arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r.next() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
        return a;
      }
    };
    return r;
  }
  // Standalone RNG with its own state.
  GG.RNG = function (seed) { var s = (seed >>> 0) || 1; return api(function () { return s; }, function (v) { s = v; }); };
  // RNG whose state is stored in obj[key] (default state.rng). Use this for the career.
  GG.rngFor = function (obj, key) { key = key || 'rng'; return api(function () { return obj[key] >>> 0; }, function (v) { obj[key] = v; }); };
  GG.hashSeed = function (str) { var h = 2166136261 >>> 0; str = String(str); for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h || 1; };

  // ---- Utils -----------------------------------------------------------
  GG.util = {
    clamp: function (v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; },
    clone: function (o) { return o == null ? o : JSON.parse(JSON.stringify(o)); },
    fmtMoney: function (n) { n = Math.round(n); var s = Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); return (n < 0 ? '−$' : '$') + s; },
    signed: function (n) { n = Math.round(n); return (n > 0 ? '+' : n < 0 ? '−' : '±') + Math.abs(n); },
    fmtNum: function (n) { n = Math.round(n); return Math.abs(n) >= 10000 ? (n / 1000).toFixed(n >= 100000 ? 0 : 1) + 'k' : n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  };

  // ---- Debug registry ----------------------------------------------------
  // Every module registers a debug() getter so tests assert state instead of screenshots.
  var dbg = {};
  GG.registerDebug = function (name, fn) { dbg[name] = fn; };
  GG.debug = function (name) {
    if (name) return dbg[name] ? dbg[name]() : undefined;
    var out = {}; for (var k in dbg) { try { out[k] = dbg[k](); } catch (e) { out[k] = { error: String(e) }; } } return out;
  };
})(typeof window !== 'undefined' ? window : globalThis);
