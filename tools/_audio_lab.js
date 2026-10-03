// tools/_audio_lab.js (v1.2 stage 0): the shared audio lab for tools/audio_hashes.js, tools/audio_numbers.js,
// tools/audio_clips.js and tests/pw_seq.js section `hash`. Node side: the case lists + openLab(); page side: labHelpers()
// (evaluated in the game page) -> window.__lab { resolve, render, sha1, stats, hashCase, bands, pcm16, mix }.
//
// Determinism (proved at stage 0, see plan/v12_stage0_report.md): 1.1 audio never calls Math.random (noise buffers and
// impulses come from a seeded LCG; arrangements from GG.RNG), so OfflineAudioContext renders are bit-identical run to run
// and browser to browser. As a belt-and-braces guard the lab page still replaces Math.random with a seeded PRNG BEFORE the
// game script loads (page.addInitScript), so a later change that reaches for Math.random stays reproducible here. The
// game code is never changed for this.
//
// Hash = SHA-1 of the rendered AudioBuffer's Float32 samples as raw bytes (native little-endian), channel 0 then channel 1
// (prerenderHit buffers are mono: channel 0 only). Every case renders on a fresh title screen (no career: GG.state is null,
// default mixer), at renderOffline's 44.1 kHz.
//
// SPEC_EXTRA='{"k":v}' (env) is merged into every renderOffline spec (1.2: e.g. feel / vel options the lanes add), never
// into the fixture's stored specs.
const path = require('path');
const { open } = require('../tests/_pw');

const GENRES = ['metal', 'punk', 'rock', 'country'];
const LANES = ['kick', 'snare', 'hat', 'cymbal', 'toms', 'ride'];   // C.LANES: the six tap lanes
const TIERS = [0, 1, 2, 3];                                          // kit quality: milk crate, pawn shop, pro, arena
const SONG_ID = 'v11hash';
const SIG = g => ({ signature: g });

// The classic-hash cases: key -> spec (JSON; `pattern: { signature }` / `{ starter }` and `bars: 'song'` resolve in the page).
//   song|g|full  : the genre's signature song, its whole arrangement (bars = sections x 4), drums + band + vocals
//   song|g|drums : the same, drums only (backing: false)
//   song|g|band  : the same, band only (drums: false; the band + vocals)
//   tap|g|lane|qN: one live tap (drumHit through the kit chain + room) per lane x kit tier (4 genres x 6 x 4)
//   pre|g|lane|qN: the pre-rendered tap buffer (A.prerenderHit, what PRE plays) per lane x tier
//   sec|g|q0arena, sec|g|q3dry: a 2-bar chorus at the extreme kit tiers / rooms
//   seat|g : your notes (A.pluck / strum / lead + a release), vox|g : one sung hit, probe|g|gtr|bass : sustained notes,
//   radio|g: the van radio chain (unity mix, no verb)
function hashCases() {
  const out = [];
  for (const g of GENRES) {
    const base = { genre: g, pattern: SIG(g), full: true, bars: 'song', songId: SONG_ID };
    out.push({ key: `song|${g}|full`, spec: base });
    out.push({ key: `song|${g}|drums`, spec: Object.assign({}, base, { backing: false }) });
    out.push({ key: `song|${g}|band`, spec: Object.assign({}, base, { drums: false }) });
  }
  for (const g of GENRES) for (const l of LANES) for (const q of TIERS) out.push({ key: `tap|${g}|${l}|q${q}`, spec: { genre: g, lane: l, quality: q } });
  for (const g of GENRES) for (const l of LANES) for (const q of TIERS) out.push({ key: `pre|${g}|${l}|q${q}`, spec: { prerender: { genre: g, lane: l, quality: q } } });
  for (const g of GENRES) {
    out.push({ key: `sec|${g}|q0arena`, spec: { genre: g, pattern: SIG(g), section: 'chorus', bars: 2, quality: 0, room: 'arena', songId: SONG_ID } });
    out.push({ key: `sec|${g}|q3dry`, spec: { genre: g, pattern: SIG(g), section: 'chorus', bars: 2, quality: 3, room: 'dry', songId: SONG_ID } });
    out.push({ key: `seat|${g}`, spec: { genre: g, quality: 2, seatNotes: [
      { fn: 'pluck', midi: 40, at: 0 }, { fn: 'pluck', midi: 43, at: 0.25 },
      { fn: 'strum', midi: 52, at: 0.5, o: { len: 0.45 } },
      { fn: 'lead', midi: 64, at: 1.0, o: { hold: true, len: 2 }, release: 1.6 }] } });
    out.push({ key: `vox|${g}`, spec: { probe: 'vox', genre: g } });
    out.push({ key: `probe|${g}|gtr`, spec: { probe: 'gtr', genre: g, midi: 40, seconds: 1.2 } });
    out.push({ key: `probe|${g}|bass`, spec: { probe: 'bass', genre: g, midi: 28, seconds: 1.2 } });
    out.push({ key: `radio|${g}`, spec: { ambience: 'radio', genre: g, pattern: SIG(g), songId: SONG_ID } });
  }
  return out;
}

// The F13 "Ears" clips: per genre, the band's first starter song (as A.seatPreview builds it), chorus -> verse, 15 s, at the
// pro kit (tier 2, the reference outside a career). The 1.2 integrator renders the same cases (SPEC_EXTRA for new options).
const CLIP_BANDS = { metal: 'hail_damage', punk: 'frost_heave', rock: 'gravel_kings', country: 'grid_road_ramblers' };
const CLIP_SECS = 15, CLIP_SR = 22050, CLIP_QUALITY = 2;
function clipCases() {
  return GENRES.map(g => ({ key: g, spec: { genre: g, pattern: { starter: CLIP_BANDS[g] }, arrangement: ['chorus', 'verse', 'chorus', 'verse'],
    full: true, bars: 'song', quality: CLIP_QUALITY, seconds: CLIP_SECS } }));
}
// The 8-hit "Perfect vs Good" tap demo: 120 bpm, kick / snare on the quarters; bar 1 Perfect (on the beat), bar 2 Good
// (35 ms late, as a Good tap lands). 1.1 has no velocity: both bars sound the same. 1.2: vel = A.tapVel(...) when it exists,
// passed as spec.vel (+ spec.hit = the hit's index for round robins); each hit renders alone and is summed at its time.
const TAP_DEMO = (function () {
  const spb = 0.5, hits = [];
  for (let i = 0; i < 8; i++) {
    const perfect = i < 4, beat = i % 4;
    hits.push({ i, lane: beat % 2 ? 'snare' : 'kick', at: 0.2 + i * spb + (perfect ? 0 : 0.035), judgement: perfect ? 'perfect' : 'good', step: beat * 4 });
  }
  return { genre: 'metal', quality: CLIP_QUALITY, bpm: 120, hits, secs: 0.2 + 8 * spb + 1.5 };
})();

// F13 band edges (Hz): 0-150, 150-500, 500-1.5k, 1.5-4k, 4k+.
const F13_EDGES = [150, 500, 1500, 4000];

// ---- page side ------------------------------------------------------------------------------------------------------
function labHelpers() {
  const GG = window.GG, A = GG.audio, L = window.__lab = {};
  const mono = b => { const n = b.length, m = new Float32Array(n); for (let ch = 0; ch < b.numberOfChannels; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) m[i] += d[i] / b.numberOfChannels; } return m; };
  L.extra = {};
  L.resolve = function (spec) {
    const s = JSON.parse(JSON.stringify(spec));
    if (s.pattern && s.pattern.signature) s.pattern = JSON.parse(JSON.stringify(GG.songs.signature(s.pattern.signature)));
    else if (s.pattern && s.pattern.starter) {   // = 30_audio starterPattern(bandId, genre) outside a career (+ bandSinger)
      const id = s.pattern.starter, band = GG.content.bands[id], first = (band.starterSongs || [])[0];
      const t = typeof first === 'string' ? first : first.fr || first.title || first.en;
      s.pattern = GG.songs.patternFor({ seed: 1, genre: band.genre, gear: null }, t);
      s.songId = 'preview|' + id + '|' + t;
      const m = (band.members || []).filter(x => /vocal/i.test(x.role || ''))[0];
      if (m) s.singer = m.id;
      s.title = t;
    }
    if (s.arrangement) { s.pattern = JSON.parse(JSON.stringify(s.pattern)); s.pattern.arrangement = s.arrangement.slice(); delete s.arrangement; }
    if (s.bars === 'song') s.bars = GG.songs.sanitize(s.pattern, null, null, true).arrangement.length * GG.contracts.BARS_PER_SECTION;
    return Object.assign(s, L.extra);
  };
  L.render = async function (spec) {
    if (spec.prerender) return { buffer: await A.prerenderHit(Object.assign({}, spec.prerender, L.extra)) };
    const s = L.resolve(spec), r = await A.renderOffline(s);
    r.title = s.title || null;
    return r;
  };
  L.sha1 = async function (buf) {
    const n = buf.length, ch = buf.numberOfChannels, bytes = new Uint8Array(n * ch * 4);
    for (let c = 0; c < ch; c++) { const d = buf.getChannelData(c); bytes.set(new Uint8Array(d.buffer, d.byteOffset, d.byteLength), c * n * 4); }
    const h = await crypto.subtle.digest('SHA-1', bytes);
    return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join('');
  };
  L.stats = function (buf) {
    let peak = 0, sum = 0, nan = false, n = 0;
    for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) { const v = d[i]; if (v !== v) { nan = true; continue; } const a = v < 0 ? -v : v; if (a > peak) peak = a; sum += v * v; } n += d.length; }
    return { n: buf.length, ch: buf.numberOfChannels, sr: buf.sampleRate, peak: +peak.toFixed(6), rms: +Math.sqrt(sum / Math.max(1, n)).toFixed(6), nan };
  };
  L.hashCase = async function (spec) { const r = await L.render(spec); return Object.assign({ sha1: await L.sha1(r.buffer) }, L.stats(r.buffer)); };
  function fft(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
    for (let len = 2; len <= n; len <<= 1) {
      const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a);
      for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const p = i + k, q = p + len / 2, br = re[q] * cr - im[q] * ci, bi = re[q] * ci + im[q] * cr; re[q] = re[p] - br; im[q] = im[p] - bi; re[p] += br; im[p] += bi; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } }
    }
  }
  // = tests/pw_seq.js __bands (Hann 8192, 50 % hop, mono; band dB = 10 log10(mean square x band share)), with edges as a
  // parameter (F13: 150 / 500 / 1.5k / 4k Hz) + RMS / peak in dBFS and stereo width (side / mid energy).
  L.bands = function (buf, edges) {
    const sr = buf.sampleRate, N = 8192, m = mono(buf), nb = edges.length + 1, E = new Array(nb).fill(0);
    let tot = 0; const w = new Float64Array(N); for (let i = 0; i < N; i++) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
    for (let s = 0; s + N <= m.length; s += N / 2) {
      const re = new Float64Array(N), im = new Float64Array(N); for (let i = 0; i < N; i++) re[i] = m[s + i] * w[i];
      fft(re, im);
      for (let k = 1; k < N / 2; k++) { const f = k * sr / N, p = re[k] * re[k] + im[k] * im[k]; let j = 0; while (j < edges.length && f >= edges[j]) j++; E[j] += p; tot += p; }
    }
    let ms = 0; for (let i = 0; i < m.length; i++) ms += m[i] * m[i]; ms /= m.length;
    let side = 0, mid = 0; if (buf.numberOfChannels > 1) { const Lc = buf.getChannelData(0), R = buf.getChannelData(1); for (let i = 0; i < Lc.length; i++) { mid += (Lc[i] + R[i]) ** 2; side += (Lc[i] - R[i]) ** 2; } }
    const st = L.stats(buf), db = x => +(20 * Math.log10(x + 1e-12)).toFixed(1);
    return { dB: E.map(e => +(10 * Math.log10(ms * e / (tot || 1) + 1e-12)).toFixed(1)), share: E.map(e => +(e / (tot || 1)).toFixed(3)),
      rmsDb: db(st.rms), peakDb: db(st.peak), rms: st.rms, peak: st.peak, width: mid ? +(side / mid).toFixed(3) : 0, secs: +(buf.length / sr).toFixed(2) };
  };
  // A buffer-like stereo sum: hits [{ buffer, at }] -> { numberOfChannels, length, sampleRate, getChannelData }.
  L.mix = function (hits, secs, sr) {
    const n = Math.ceil(secs * sr), Lc = new Float32Array(n), R = new Float32Array(n);
    hits.forEach(h => { const b = h.buffer, o = Math.round(h.at * sr), l = b.getChannelData(0), r = b.numberOfChannels > 1 ? b.getChannelData(1) : l; for (let i = 0; i < b.length && o + i < n; i++) { Lc[o + i] += l[i]; R[o + i] += r[i]; } });
    return { numberOfChannels: 2, length: n, sampleRate: sr, getChannelData: c => c ? R : Lc };
  };
  // 16-bit PCM, interleaved stereo, at sr/2 (a [1/4 1/2 1/4] half-band low-pass, then every other sample), the first
  // `secs` seconds with a `fade` s fade-out at the end -> base64 of the little-endian Int16 data.
  L.pcm16 = function (buf, secs, fade) {
    const sr = buf.sampleRate, n = Math.min(buf.length, Math.floor(secs * sr)), m = Math.floor(n / 2), out = new Int16Array(m * 2);
    const ch = [buf.getChannelData(0), buf.numberOfChannels > 1 ? buf.getChannelData(1) : buf.getChannelData(0)], fn = Math.floor(fade * sr / 2);
    for (let c = 0; c < 2; c++) {
      const d = ch[c];
      for (let i = 0; i < m; i++) {
        const j = 2 * i, x = 0.25 * (j ? d[j - 1] : d[j]) + 0.5 * d[j] + 0.25 * (j + 1 < n ? d[j + 1] : d[j]);
        const g = i >= m - fn ? (m - i) / fn : 1, v = Math.max(-1, Math.min(1, x * g));
        out[2 * i + c] = v < 0 ? Math.round(v * 32768) : Math.round(v * 32767);
      }
    }
    const u = new Uint8Array(out.buffer); let bin = ''; for (let i = 0; i < u.length; i += 32768) bin += String.fromCharCode.apply(null, u.subarray(i, i + 32768));
    return { b64: btoa(bin), sr: sr / 2, frames: m };
  };
  return true;
}

// Seeded Math.random (mulberry32) installed before any page script runs (see the header).
const SEED_RANDOM = `(function () { var s = 0x1105EED >>> 0; Math.random = function () { s = (s + 0x6D2B79F5) >>> 0; var t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();`;

// Deterministic summing (stage 0 finding): Chromium sums the connections into one node input (or AudioParam) in hash-set
// order (pointer addresses), so with 3+ connections the float additions run in a different order each render: the same
// graph differs in the last bits (|diff| <= ~4e-6) render to render. Every single node and every 2-input sum is exact.
// This lab-only patch (installed before the game loads; OfflineAudioContext nodes only; the live context is untouched)
// wires each fan-in as a binary tree of unity-gain adders (<= 2 inputs each) built in connection order, like a binary
// counter: equal-size subtrees merge, the remaining roots chain into the destination, so every sum has one fixed order
// and a voice passes through ~log2(N) adders. Exact semantics: unity gain is exact, up-mixing (mono copied) and
// down-mixing (linear) commute with the sum; duplicate connects stay no-ops; disconnect(dst) / disconnect() follow the
// routes. window.__labSum counts { connects, adders, disconnects }.
const SUM_ORDER = `(function () {
  if (typeof AudioNode === 'undefined' || typeof OfflineAudioContext === 'undefined') return;
  var P = AudioNode.prototype, conn = P.connect, disc = P.disconnect, FAN = new WeakMap(), ROUTES = new WeakMap();
  var stats = window.__labSum = { connects: 0, adders: 0, disconnects: 0 };
  function off(n) { try { return n.context instanceof OfflineAudioContext; } catch (e) { return false; } }
  function link(from, o, to, S) { if (to === S.dst) { if (S.param) conn.call(from, to, o); else conn.call(from, to, o, S.inp); } else conn.call(from, to, o, 0); }
  function unlink(from, o, to, S) { try { if (to === S.dst) { if (S.param) disc.call(from, to, o); else disc.call(from, to, o, S.inp); } else disc.call(from, to, o, 0); } catch (e) { /* already cut */ } }
  function place(e, to, S) { if (!(e.leaf && !e.leaf.alive)) link(e.node, e.out, to, S); e.parent = to; if (e.leaf) e.leaf.parent = to; }
  function adder(S) { stats.adders++; return S.ctx.createGain(); }
  P.connect = function (dst, out, inp) {
    if (!dst || !off(this) || !(dst instanceof AudioNode || dst instanceof AudioParam)) return conn.apply(this, arguments);
    var param = dst instanceof AudioParam; out = out | 0; inp = param ? 0 : inp | 0;
    var F = FAN.get(dst); if (!F) FAN.set(dst, F = {});
    var S = F[inp] || (F[inp] = { dst: dst, inp: inp, param: param, ctx: this.context, stack: [], comb: [], leaves: [] });
    for (var i = 0; i < S.leaves.length; i++) { var lf = S.leaves[i]; if (lf.alive && lf.src === this && lf.out === out) return param ? undefined : dst; }   // natively a no-op
    stats.connects++;
    S.stack.forEach(function (e) { if (e.parent && !(e.leaf && !e.leaf.alive)) unlink(e.node, e.out, e.parent, S); e.parent = null; });
    S.comb.forEach(function (a) { disc.call(a); }); S.comb = [];
    var leaf = { src: this, out: out, S: S, alive: true, parent: null };
    S.leaves.push(leaf); var R = ROUTES.get(this); if (!R) ROUTES.set(this, R = []); R.push(leaf);
    S.stack.push({ node: this, out: out, size: 1, leaf: leaf, parent: null });
    while (S.stack.length > 1 && S.stack[S.stack.length - 1].size === S.stack[S.stack.length - 2].size) {
      var y = S.stack.pop(), x = S.stack.pop(), m = adder(S);
      place(x, m, S); place(y, m, S);
      S.stack.push({ node: m, out: 0, size: x.size * 2, leaf: null, parent: null });
    }
    var acc = S.stack[0], k;
    for (k = 1; k < S.stack.length; k++) { var a = adder(S); S.comb.push(a); place(acc, a, S); place(S.stack[k], a, S); acc = { node: a, out: 0, leaf: null }; }
    if (acc === S.stack[0]) place(acc, dst, S); else link(acc.node, 0, dst, S);
    return param ? undefined : dst;
  };
  P.disconnect = function (dst, out, inp) {
    var R = off(this) ? ROUTES.get(this) : null;
    if (!R || !R.length) return disc.apply(this, arguments);
    stats.disconnects++;
    if (dst == null || typeof dst === 'number') {   // disconnect() / disconnect(output): natively, then the routes
      var r = disc.apply(this, arguments);
      R.forEach(function (lf) { if (dst == null || lf.out === dst) lf.alive = false; });
      return r;
    }
    var hit = R.filter(function (lf) { return lf.alive && lf.S.dst === dst && (out == null || lf.out === out) && (inp == null || lf.S.inp === inp); });
    if (!hit.length) return disc.apply(this, arguments);
    hit.forEach(function (lf) { if (lf.parent) unlink(lf.src, lf.out, lf.parent, lf.S); lf.alive = false; });
  };
})();`;

// Opens the game (dist/game.html) at the title screen with the lab helpers in. -> { page, errors, close }.
// classic: true calls GG.audio.classic(true) when it exists (1.2+; a no-op on 1.1). Always close() in a finally.
async function openLab(opts) {
  opts = opts || {};
  const lab = await open({ noGoto: true });
  try {
    await lab.page.addInitScript(SEED_RANDOM);
    if (!opts.nativeSum) await lab.page.addInitScript(SUM_ORDER);
    await lab.page.goto(lab.url);
    await lab.page.waitForSelector('[data-testid="btn-new"]', { timeout: 60000 });
    await lab.page.evaluate(labHelpers);
    const info = await lab.page.evaluate(a => {
      if (a.extra) window.__lab.extra = a.extra;
      const A = GG.audio, has = typeof A.classic === 'function';
      if (has) A.classic(!!a.classic);
      return { version: GG.VERSION || null, classicApi: has, classic: has ? !!A.isClassic() : null, state: !!GG.state };
    }, { classic: !!opts.classic, extra: opts.extra || null });
    lab.info = info;
  } catch (e) { await lab.close(); throw e; }
  return lab;
}
function specExtra() { const s = process.env.SPEC_EXTRA; if (!s) return null; try { return JSON.parse(s); } catch (e) { throw new Error('SPEC_EXTRA is not JSON: ' + s); } }

// A 16-bit PCM .wav file (stereo) from interleaved Int16 little-endian data.
function wavBytes(pcm, sr, ch) {
  ch = ch || 2;
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); h.writeUInt16LE(ch, 22); h.writeUInt32LE(sr, 24); h.writeUInt32LE(sr * ch * 2, 28); h.writeUInt16LE(ch * 2, 32);
  h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

const ROOT = path.join(__dirname, '..');
const FIXTURE = path.join(ROOT, 'tests', 'fixtures', 'audio_v11_hashes.json');
module.exports = { GENRES, LANES, TIERS, SONG_ID, hashCases, clipCases, CLIP_BANDS, CLIP_SECS, CLIP_SR, CLIP_QUALITY, TAP_DEMO, F13_EDGES,
  labHelpers, openLab, specExtra, wavBytes, SEED_RANDOM, SUM_ORDER, ROOT, FIXTURE };
