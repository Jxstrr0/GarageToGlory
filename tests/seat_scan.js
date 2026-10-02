// tests/seat_scan.js (v1.1 "Seats", Lane A; handoff E8, plan_contract_1.1 §5 A): the seat leak scan's shared pieces.
// Not a test file (run.js only runs *.test.js): tests/sim_bands.test.js (SEAT=) and tests/content_seats.test.js use it.
//   WORDS / TOMS   the drum vocabulary, read from tools/seat_audit.js (one source of truth; requiring the tool would
//                  rewrite plan/seat_audit.txt, so its two regex lines are parsed instead)
//   drumWords(t)   true when a text uses drum vocabulary
//   LEFT           phrases Lane A decided to LEAVE: they mean the band's drums in general (the swapped drummer plays them on
//                  a string seat), a venue's or a rival's drums, or words that only look like drum words (a first-aid kit, the
//                  Frozen Throne). A resolved text that contains one of them is not a leak.
//   seatAware(GG)  regexes for every content string written FOR a string seat (it, or an object above it, carries a seat gate
//                  without 'drums' or a swapped gate, or it sits under a bySeat / kit / seatLines key, or '@drummer' says it):
//                  those lines talk about the swapped drummer's kit on purpose. Tokens match anything ({drummer} -> .+?).
//   leak(text, aware) -> null | the drum word: a string-seat career's text that uses drum vocabulary and is neither LEFT nor
//                  seat-aware.
const fs = require('fs'), path = require('path');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'tools', 'seat_audit.js'), 'utf8');
function grab(name) {
  const m = SRC.match(new RegExp('const ' + name + ' = /(.+)/([a-z]*);'));
  if (!m) throw new Error('seat_scan: ' + name + ' not found in tools/seat_audit.js');
  return new RegExp(m[1], m[2]);
}
const WORDS = grab('WORDS'), TOMS = grab('TOMS');
const drumWords = t => WORDS.test(t) || TOMS.test(t);
const word = t => (String(t).match(WORDS) || String(t).match(TOMS) || [''])[0];

// [left] decisions (Lane A, v1.1): the phrase is matched against the resolved text (case-sensitive, tokens resolved).
const LEFT = [
  // words that only look like drum words
  'first-aid kit', 'press kit', 'Frozen Throne', 'Throne of', 'Trône', 'Drum Logic', 'tape your sticks', 'goal stick', 'hockey stick',
  'kicks in', 'kick on and', 'One good kick', 'kicks on', 'kick it off',
];
const LEFT_RE = LEFT.map(p => new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function toRe(raw) {
  const parts = String(raw).split(/\{[A-Za-z]+(?::[\w-]+)?\}/g).map(esc);
  return new RegExp(parts.join('.+?'));
}
function stringSeatGate(o) {
  if (!o || typeof o !== 'object') return false;
  const g = o.gate && typeof o.gate === 'object' ? o.gate : {};
  const seat = o.seat != null ? o.seat : g.seat, sw = o.swapped != null ? o.swapped : g.swapped;
  if (sw != null && sw !== false) return true;
  if (seat != null) { const l = [].concat(seat); return l.length > 0 && l.indexOf('drums') < 0; }
  if (o.speaker === '@drummer' || o.who === '@drummer') return true;
  if (o.when && o.when.seatRole && [].concat(o.when.seatRole).every(r => /^drums/.test(r))) return true;   // drum-seat epilogue variants
  return false;
}
const AWARE_KEYS = ['bySeat', 'kit', 'seatLines', 'drummerGear', 'drummers', 'swappedLines'];
function seatAware(GG) {
  const out = [], seen = new Set();
  (function walk(v, aware, depth) {
    if (depth > 14 || v == null) return;
    if (typeof v === 'string') { if (aware && /\s/.test(v) && drumWords(v) && !seen.has(v)) { seen.add(v); out.push(toRe(v)); } return; }
    if (typeof v !== 'object') return;
    const here = aware || stringSeatGate(v);
    if (Array.isArray(v)) { v.forEach(x => walk(x, here, depth + 1)); return; }
    Object.keys(v).forEach(k => walk(v[k], here || AWARE_KEYS.indexOf(k) >= 0, depth + 1));
  })(GG.content, false, 0);
  return out;
}
// The LEFT phrases and the seat-aware lines are cut out of the text first; whatever drum word is still there is a leak.
function leak(text, aware) {
  let t = String(text || '');
  if (!drumWords(t)) return null;
  LEFT_RE.forEach(re => { re.lastIndex = 0; t = t.replace(re, ' '); });
  if (!drumWords(t)) return null;
  (aware || []).forEach(re => { if (re.test(t)) t = t.replace(re, ' '); });
  return drumWords(t) ? word(t) || 'drum word' : null;
}
module.exports = { WORDS, TOMS, drumWords, word, LEFT, seatAware, leak, toRe, stringSeatGate };
