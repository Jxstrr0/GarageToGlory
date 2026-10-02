// 10_save.js: save slots in localStorage (with an in-memory fallback), settings, and copy-paste save codes.
//   keys: gg.v1.slot.<auto|1|2|3>, gg.v1.settings, gg.v1.hof (Hall of Fame, 12_meta), gg.v1.meta (12_meta)
//   slot record: { savedAt, version, summary: { band, player, year, week, fans, fund }, state }
//   save code:   'GG1:' + base64url(LZW(UTF-8(JSON))) + 6-char checksum of that body
//   v1.0: a career code's JSON may carry `_meta` (GG.meta.exportLite(): the Hall of Fame lite + counters); a meta-only code
//   is { v: 1, metaOnly: true, _meta: GG.meta.exportFull() } (metaCode). readCode() splits them; fromCode() = the state.
// Every storage access is wrapped: when storage is missing or throws, saves live in memory for the session
// and GG.save.storageOk is false (the UI can warn that progress won't survive a reload).
(function (GG) {
  var C = GG.contracts, U = GG.util;
  var save = GG.save = GG.save || {};
  var PREFIX = 'gg.v1.';
  save.KEYS = { slot: function (s) { return PREFIX + 'slot.' + s; }, settings: PREFIX + 'settings', hof: PREFIX + 'hof', meta: PREFIX + 'meta' };
  var DAMAGED = 'That save code is damaged or incomplete. Copy the whole code and try again.';
  // v0.6.1 (Addendum C4, SETTINGS): every player preference has a default here (GG.prefs normalizes them); lane A's
  // mix / metronome / brushes default inside GG.audio. Only keys the player changed are stored.
  var DEFAULT_SETTINGS = { muted: false, gigDifficulty: 'easy', noteSpeed: 1, noFail: false, autoKick: false,
    audioProfile: 'speaker', calib: { speaker: { audio: 0, visual: 0, at: 0 }, headphones: { audio: 0, visual: 0, at: 0 } }, calibSeen: false,
    lefty: false, colourblind: false, bigText: false, reducedFlash: false, cameraShake: true, graphics: 'auto', skipVan: false, fastAnim: false };
  // v1.0 (§0 Q8): graphics defaults to 'auto' (adaptive pixel ratio; P.normalize maps it to 'high' until 'auto' is in P.GRAPHICS).

  /* ---- Storage backend ---------------------------------------------------- */
  var backend = null, memory = {};
  save.storageOk = false;
  // (Re)binds storage. Default: window.localStorage. Probes a write/read/remove; on failure uses memory only.
  save.init = function (storage) {
    backend = null; save.storageOk = false;
    try {
      var s = storage !== undefined ? storage : (typeof window !== 'undefined' ? window.localStorage : null);
      if (s) {
        var k = PREFIX + 'probe';
        s.setItem(k, '1');
        if (s.getItem(k) !== '1') throw new Error('storage probe failed');
        s.removeItem(k);
        backend = s; save.storageOk = true;
      }
    } catch (e) { backend = null; save.storageOk = false; }
    return save.storageOk;
  };
  function fail() { save.storageOk = false; }
  // v1.0: a full store (quota) is not "no storage": storageOk stays true and save.lastError = 'quota' (12_meta's retry path).
  function isQuota(e) { return !!e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22 || e.code === 1014); }
  save.lastError = null;
  function getRaw(key) {
    if (backend) {
      try { var v = backend.getItem(key); return v != null ? v : (memory[key] != null ? memory[key] : null); }
      catch (e) { fail(); }
    }
    return memory[key] != null ? memory[key] : null;
  }
  // Writes to memory always (so this session keeps working) and to storage when possible. Returns persisted?
  function setRaw(key, value) {
    memory[key] = value;
    if (!backend) return false;
    try { backend.setItem(key, value); save.lastError = null; return true; }
    catch (e) { if (isQuota(e)) save.lastError = 'quota'; else fail(); return false; }
  }
  function removeRaw(key) {
    delete memory[key];
    if (backend) { try { backend.removeItem(key); } catch (e) { fail(); } }
  }
  function getJSON(key) {
    var raw = getRaw(key);
    if (raw == null) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }
  save.getJSON = getJSON;
  save.setJSON = function (key, obj) { return setRaw(key, JSON.stringify(obj)); };

  /* ---- Slots ---------------------------------------------------------------- */
  function summary(state) {
    var band = GG.career && GG.career.band ? GG.career.band(state) : null;
    return { band: band ? band.name : state.bandId, player: state.player ? state.player.name : '',
      year: state.year, week: state.week, fans: state.fans, fund: state.fund };
  }
  function validSlot(slot) { return C.SLOTS.indexOf(String(slot)) >= 0; }

  // Saves a career into a slot. Returns true if it reached persistent storage. Emits save:done / save:failed.
  save.write = function (slot, state) {
    slot = String(slot);
    var ok = false, err = null;
    try {
      if (!validSlot(slot)) throw new Error('Unknown save slot ' + slot);
      var rec = { savedAt: Date.now(), version: GG.VERSION, summary: summary(state), state: state };
      ok = setRaw(save.KEYS.slot(slot), JSON.stringify(rec));
      if (!ok) err = 'Storage unavailable: saved for this session only.';
    } catch (e) { ok = false; err = String(e && e.message || e); }
    if (ok) GG.emit('save:done', { slot: slot }); else GG.emit('save:failed', { slot: slot, error: err });
    return ok;
  };
  // The full record ({ savedAt, version, summary, state }) or null. The state inside is migrated.
  save.readRecord = function (slot) {
    var rec = getJSON(save.KEYS.slot(slot));
    if (!rec || !rec.state) return null;
    try { rec.state = save.migrate(rec.state); } catch (e) { return null; }
    return rec;
  };
  save.read = function (slot) { var r = save.readRecord(slot); return r ? r.state : null; };
  save.list = function () {
    return C.SLOTS.map(function (slot) {
      var rec = getJSON(save.KEYS.slot(slot));
      var ok = !!(rec && rec.state);
      return { slot: slot, exists: ok, summary: ok ? rec.summary || summary(rec.state) : null, savedAt: ok ? rec.savedAt : null };
    });
  };
  save.remove = function (slot) { removeRaw(save.KEYS.slot(slot)); };
  save.autosave = function (state) { return save.write('auto', state); };

  /* ---- Settings --------------------------------------------------------------- */
  save.settings = function () {
    var s = getJSON(save.KEYS.settings), out = U.clone(DEFAULT_SETTINGS);
    if (s && typeof s === 'object') for (var k in s) out[k] = s[k];
    return out;
  };
  save.SETTINGS_DEFAULTS = DEFAULT_SETTINGS;
  save.saveSettings = function (obj) {
    var raw = getJSON(save.KEYS.settings); raw = raw && typeof raw === 'object' ? raw : {};
    for (var k in obj || {}) raw[k] = obj[k];
    setRaw(save.KEYS.settings, JSON.stringify(raw));
    return save.settings();
  };

  /* ---- Migration ---------------------------------------------------------------- */
  // Fills every field a current build expects, then runs version migrations. Idempotent.
  // Add a step here (and bump contracts.SAVE_SCHEMA) whenever the state shape changes.
  var MIGRATIONS = {
    // v0.1 -> v0.2: every song gets a drum pattern, generated from an RNG seeded by the career seed + song id
    // (never the career RNG, so the career replays the same). Old quality/polish stay; ratings, gear,
    // pendingSongs and draft are filled in by the defaults below.
    1: function (s) {
      if (GG.songs && Array.isArray(s.songs)) s.songs.forEach(function (x) {
        if (x && typeof x === 'object' && !x.pattern) { x.pattern = GG.songs.patternFor(s, x.id); x.auto = true; }
      });
      return s;
    },
    // v0.7 -> v0.8 (schema 8 -> 9, lane A "Kit"): gear { owned, sections, quality }, spaceTier + spaceUpgrades, the van's
    // tier / baseName / name / stickers (the venues you already played) / upgrades, and state.merch. Only missing fields
    // are filled (GG.shop.ensure, idempotent; it also runs on every load below). Lane B (creator) chains its own fill.
    8: function (s) { return GG.shop && GG.shop.migrate ? GG.shop.migrate(s) : s; }
  };
  function def(o, k, v) { if (o[k] === undefined || o[k] === null && v !== null) o[k] = v; }
  save.migrate = function (s) {
    if (!s || typeof s !== 'object' || Array.isArray(s)) throw new Error('Not a career');
    // v0.9: a save that names its band takes that band's genre / region / city / space (bands.js) before the steps below and
    // the Hail Damage defaults (metal, Saskatoon, the garage) fill them (was the career.migrateBand wrapper)
    var bd = typeof s.bandId === 'string' && GG.content && GG.content.bands ? GG.content.bands[s.bandId] : null;
    if (bd) [['genre', bd.genre], ['region', bd.region], ['city', bd.city], ['space', bd.space]].forEach(function (kv) { if (kv[1]) def(s, kv[0], kv[1]); });
    var v = typeof s.v === 'number' ? s.v : 1;
    while (v < C.SAVE_SCHEMA) { if (MIGRATIONS[v]) s = MIGRATIONS[v](s); v++; }
    s.v = Math.max(v, C.SAVE_SCHEMA);
    def(s, 'createdVersion', GG.VERSION); def(s, 'slot', 'auto');
    def(s, 'region', 'canada'); def(s, 'genre', 'metal'); def(s, 'city', 'Saskatoon'); def(s, 'space', 'parents_garage');
    def(s, 'maxWeeks', C.WEEKS_PER_YEAR * C.CAREER_YEARS);
    def(s, 'era', 'garage'); def(s, 'protected', true); def(s, 'ended', false);
    ['fund', 'fans', 'buzz', 'chemistry', 'burnout', 'debtToParents'].forEach(function (k) { if (!isFinite(s[k])) s[k] = 0; });
    if (!isFinite(s.drumSkill)) s.drumSkill = 10;
    if (!isFinite(s.totalWeek) || s.totalWeek < 1) s.totalWeek = 1;
    s.year = Math.floor((s.totalWeek - 1) / C.WEEKS_PER_YEAR) + 1;
    s.week = (s.totalWeek - 1) % C.WEEKS_PER_YEAR + 1;
    if (C.PHASES.indexOf(s.phase) < 0) s.phase = s.ended ? 'ended' : 'monday';
    ['members', 'songs', 'chat', 'history'].forEach(function (k) { if (!Array.isArray(s[k])) s[k] = []; });
    ['chains', 'flags', 'seenCards', 'milestones'].forEach(function (k) { if (!s[k] || typeof s[k] !== 'object') s[k] = {}; });
    ['card', 'gig', 'offer', 'lastGig', 'lastWeek', 'wrap', 'quiet', 'weekStart', 'yearStart'].forEach(function (k) { def(s, k, null); });
    if (!Array.isArray(s.plan)) s.plan = [];
    while (s.plan.length < C.BLOCKS_PER_WEEK) s.plan.push(null);
    s.plan.length = C.BLOCKS_PER_WEEK;
    s.stats = s.stats && typeof s.stats === 'object' ? s.stats : {};
    ['gigs', 'songsWritten', 'hustles', 'cards', 'earned', 'parentsLoans'].forEach(function (k) { if (!isFinite(s.stats[k])) s.stats[k] = 0; });
    def(s.stats, 'bestGrade', null);
    s.members.forEach(function (m) {
      def(m, 'status', 'active'); def(m, 'original', true); def(m, 'nick', ''); def(m, 'role', '');
      if (!isFinite(m.mood)) m.mood = 60; if (!isFinite(m.skill)) m.skill = 40;
    });
    if (!isFinite(s.seed)) s.seed = 1;
    if (!s.gear || typeof s.gear !== 'object') s.gear = { lanes: 4, doubleKick: false };
    if (!isFinite(s.gear.lanes)) s.gear.lanes = 4; s.gear.doubleKick = !!s.gear.doubleKick;
    if (!Array.isArray(s.pendingSongs)) s.pendingSongs = [];
    def(s, 'draft', null);
    s.songs = s.songs.filter(function (x) { return x && typeof x === 'object'; });
    s.songs.forEach(function (x) {
      def(x, 'plays', 0); def(x, 'polish', 0); def(x, 'quality', 30); def(x, 'written', 0);
      def(x, 'titleEn', x.title);
      def(x, 'stale', 0); def(x, 'hits', 0); def(x, 'classic', false); def(x, 'auto', true);
      if (x.lastPlayed === undefined) x.lastPlayed = null;
      if (!GG.songs) return;
      if (!x.pattern) x.pattern = GG.songs.patternFor(s, x.id);
      else if (GG.songs.validate(x.pattern, s.gear).length) x.pattern = GG.songs.sanitize(x.pattern, s.gear, s.genre);
      if (!x.rating) { var r = GG.songs.rate(x.pattern, s.genre, s.gear); x.rating = { groove: r.groove, hook: r.hook, difficulty: r.difficulty }; }
    });
    if (!isFinite(s.rng)) s.rng = s.seed;
    // v1.0 "Glory" (SAVE_SCHEMA stays 10): fill when missing, never overwrite, no events. Old saves never start the lessons;
    // a save past week 4 counts as past4 (the "Skip the lessons" offer).
    if (!isFinite(s.bonusYears)) s.bonusYears = 0;
    if (!s.legacyTrack || typeof s.legacyTrack !== 'object') s.legacyTrack = { bigHead: null };
    def(s.legacyTrack, 'bigHead', null);
    if (s.legacy === undefined || (s.legacy !== null && typeof s.legacy !== 'object')) s.legacy = null;
    if (!s.ach || typeof s.ach !== 'object') s.ach = { got: {}, t: {} };
    ['got', 't'].forEach(function (k) { if (!s.ach[k] || typeof s.ach[k] !== 'object') s.ach[k] = {}; });
    if (!s.tutorial || typeof s.tutorial !== 'object') s.tutorial = { on: false, done: {}, past4: s.totalWeek >= 4 };
    if (typeof s.tutorial.on !== 'boolean') s.tutorial.on = false;
    if (!s.tutorial.done || typeof s.tutorial.done !== 'object') s.tutorial.done = {};
    if (typeof s.tutorial.past4 !== 'boolean') s.tutorial.past4 = s.totalWeek >= 4;
    return s;   // v0.8: GG.shop (2a_sim_shop) chains onto this migrate and fills the lane-A fields last, on every load
  };

  /* ---- Save codes: UTF-8 -> LZW (9..16-bit codes) -> base64url ------------------ */
  var B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  var B64_INDEX = {};
  for (var bi = 0; bi < B64.length; bi++) B64_INDEX[B64.charAt(bi)] = bi;
  var MAX_CODES = 65536;

  function utf8Encode(str) {
    var out = [];
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c >= 0xD800 && c <= 0xDBFF && i + 1 < str.length) {          // surrogate pair -> one code point
        var lo = str.charCodeAt(i + 1);
        if (lo >= 0xDC00 && lo <= 0xDFFF) { c = 0x10000 + ((c - 0xD800) << 10) + (lo - 0xDC00); i++; }
      }
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xC0 | c >> 6, 0x80 | c & 63);
      else if (c < 0x10000) out.push(0xE0 | c >> 12, 0x80 | c >> 6 & 63, 0x80 | c & 63);
      else out.push(0xF0 | c >> 18, 0x80 | c >> 12 & 63, 0x80 | c >> 6 & 63, 0x80 | c & 63);
    }
    return out;
  }
  function utf8Decode(bytes) {
    var s = '', i = 0;
    while (i < bytes.length) {
      var b = bytes[i++], c;
      if (b < 0x80) c = b;
      else if (b < 0xE0) c = (b & 31) << 6 | bytes[i++] & 63;
      else if (b < 0xF0) c = (b & 15) << 12 | (bytes[i++] & 63) << 6 | bytes[i++] & 63;
      else c = (b & 7) << 18 | (bytes[i++] & 63) << 12 | (bytes[i++] & 63) << 6 | bytes[i++] & 63;
      if (c > 0xFFFF) { c -= 0x10000; s += String.fromCharCode(0xD800 + (c >> 10), 0xDC00 + (c & 1023)); }
      else s += String.fromCharCode(c);
    }
    return s;
  }
  function bitLength(n) { var b = 1; while (n >= 2) { n = n >>> 1; b++; } return b; }

  // Bits are packed MSB-first into 6-bit base64url characters; the tail is zero-padded.
  function bitWriter() {
    var out = [], acc = 0, nacc = 0;
    return {
      write: function (value, width) {
        for (var i = width - 1; i >= 0; i--) {
          acc = acc << 1 | (value >>> i & 1);
          if (++nacc === 6) { out.push(B64.charAt(acc)); acc = 0; nacc = 0; }
        }
      },
      finish: function () { if (nacc) out.push(B64.charAt(acc << (6 - nacc))); return out.join(''); }
    };
  }
  function bitReader(str) {
    var pos = 0, total = str.length * 6;
    return {
      left: function () { return total - pos; },
      read: function (width) {
        var v = 0;
        for (var i = 0; i < width; i++, pos++) {
          var d = B64_INDEX[str.charAt(pos / 6 | 0)];
          if (d === undefined) throw new Error('bad char');
          v = v * 2 + (d >> (5 - pos % 6) & 1);
        }
        return v;
      }
    };
  }
  // LZW over bytes. The code width is the bit length of the largest code the decoder could see next.
  function compress(bytes) {
    var w = bitWriter();
    if (!bytes.length) return w.finish();
    var dict = new Map(), next = 256, cur = bytes[0];
    for (var i = 1; i < bytes.length; i++) {
      var key = cur * 256 + bytes[i], hit = dict.get(key);
      if (hit !== undefined) { cur = hit; continue; }
      w.write(cur, bitLength(next - 1));
      if (next < MAX_CODES) dict.set(key, next++);
      cur = bytes[i];
    }
    w.write(cur, bitLength(next - 1));
    return w.finish();
  }
  function decompress(str) {
    var r = bitReader(str), out = [];
    if (r.left() < 8) return out;
    var prefix = [], suffix = [], first = [], size = 256, i;
    for (i = 0; i < 256; i++) { prefix.push(-1); suffix.push(i); first.push(i); }
    function emit(code) {                    // appends the bytes of `code` to out
      var start = out.length;
      while (code >= 0) { out.push(suffix[code]); code = prefix[code]; }
      for (var a = start, b = out.length - 1; a < b; a++, b--) { var t = out[a]; out[a] = out[b]; out[b] = t; }
    }
    var prev = r.read(8);
    if (prev > 255) throw new Error('bad code');
    emit(prev);
    for (;;) {
      var width = bitLength(Math.min(size, MAX_CODES - 1));
      if (r.left() < width) break;           // what's left is padding
      var code = r.read(width), firstByte;
      if (code < size) firstByte = first[code];
      else if (code === size) firstByte = first[prev];   // the KwKwK case
      else throw new Error('bad code');
      if (size < MAX_CODES) { prefix.push(prev); suffix.push(firstByte); first.push(first[prev]); size++; }
      emit(code);
      prev = code;
    }
    return out;
  }
  function checksum(body) {
    var h = GG.hashSeed(body), s = '';
    for (var i = 0; i < 6; i++) { s += B64.charAt(h & 63); h = Math.floor(h / 64); }
    return s;
  }
  save.compress = function (str) { return compress(utf8Encode(str)); };
  save.decompress = function (b64) { return utf8Decode(decompress(b64)); };

  // 'GG1:' + body + checksum. Safe to paste in chat apps and notes (base64url, no spaces).
  function encode(obj) { var body = save.compress(JSON.stringify(obj)); return 'GG1:' + body + checksum(body); }
  // v1.0: in the browser (GG.meta.enabled) the code also carries the Hall of Fame lite as `_meta`, on a shallow copy (the
  // state object is never mutated); node codes are unchanged.
  save.toCode = function (state) {
    return encode(GG.meta && GG.meta.enabled ? Object.assign({}, state, { _meta: GG.meta.exportLite() }) : state);
  };
  // v1.0: a meta-only code (the Hall of Fame "Backup code"): every entry with its year strip, trophies and unlocks.
  save.metaCode = function () {
    return encode({ v: 1, metaOnly: true, _meta: GG.meta && GG.meta.exportFull ? GG.meta.exportFull() : null });
  };
  // Tolerates spaces/line breaks/zero-width characters and text around the code. Throws Error(DAMAGED).
  // v1.0: -> { state: migrated state | null (a meta-only code), meta: the `_meta` object | null }. `_meta` is taken off
  // before migrate; merging it is the caller's job (GG.meta.mergeLite, after the player confirms).
  save.readCode = function (text) {
    var s = String(text == null ? '' : text).replace(/[\s​-‍⁠﻿]+/g, '');
    var at = s.indexOf('GG1:');
    if (at < 0) throw new Error(DAMAGED);
    s = s.slice(at + 4).replace(/[^A-Za-z0-9_-].*$/, '');   // drop trailing quotes/punctuation
    if (s.length < 7) throw new Error(DAMAGED);
    var body = s.slice(0, -6);
    if (checksum(body) !== s.slice(-6)) throw new Error(DAMAGED);
    var obj, meta = null, state = null;
    try { obj = JSON.parse(save.decompress(body)); } catch (e) { throw new Error(DAMAGED); }
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error(DAMAGED);
    if (obj._meta && typeof obj._meta === 'object') meta = obj._meta;
    delete obj._meta;
    if (obj.metaOnly) {
      if (!meta) throw new Error(DAMAGED);
      return { state: null, meta: meta };
    }
    try { state = save.migrate(obj); } catch (e) { throw new Error(DAMAGED); }
    if (typeof state.bandId !== 'string' || !state.members.length || !isFinite(state.fund)) throw new Error(DAMAGED);
    return { state: state, meta: meta };
  };
  save.fromCode = function (text) {
    var r = save.readCode(text);
    if (!r.state) throw new Error(DAMAGED);
    return r.state;
  };

  save.init();
  GG.registerDebug('save', function () {
    return { storageOk: save.storageOk, slots: save.list().map(function (x) { return x.slot + (x.exists ? '*' : ''); }) };
  });
})(window.GG);
