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
  // words that only look like drum words (a first-aid kit, a hockey stick, the Frozen Throne, "it sticks", "kicks in")
  'first-aid kit', 'press kit', 'floss kit', 'from her kit', 'Lift Kit', 'Frozen Throne', 'Throne of', 'Trône', 'like a throne', 'the throne room',
  'Hay Bale Throne', 'tape your sticks', 'sticks it', 'It sticks', 'back sticks out', 'sticks of homemade jerky', 'drumstick as a mic',
  'kicks in', 'kicks on', 'Kick it', 'kick it', 'Irma kicks', 'One good kick', 'Benny kicks it', 'brushes and a shop vac',
  // the Patreeon tiers (Drumstick, Snare, Full Kit) are the band's merch names
  'Drumstick', 'Full Kit', 'Snare, Full Kit', 'collectively, Snare',
  // the band's drums, kit, drummer and drum sound in general (on a string seat the swapped drummer plays them)
  'the drummer', 'The drummer', 'THE DRUMMER', 'your drummer', 'Drummers lose mitts', 'I name no drummers', 'What a Drummer Is', 'two drummers',
  'every drummer is named Steve', 'hiring drummers', "session drummer", 'a drummer with something to prove', 'Four people and a drummer',
  'one drummer, one cassette', 'Their drummer asks yours', 'Swap drummers', 'The drummers trade places', 'hates drummers', 'a cat that hates drummers',
  'drumming on the', 'air-drumming', 'lap drums', 'my uncle could drum',
  'the drums', 'The drums', 'drum kit', 'the kit', 'The kit', 'drum riser', 'drum throne', 'drum stool', 'drum cases', 'snare case', 'drum samples',
  'Real drums, real everything', 'Click for the drums', 'NO DRUMS AFTER', 'Guitar, bass, drums', 'whoever is on drums', 'clapped for the drums',
  'kick drum', 'Kick Drum', 'bass drum', 'the kick', 'The kick', 'kick pedal', 'snare hit', 'Every snare', 'the snare', 'The snare', 'snare wires',
  'Nine Seconds of Snare', 'a zipper hitting the drum', 'drum solos', 'drum loop', 'drum pattern', 'one drum kit', 'DRUM MACHINE',
  'hi-hat', 'the cymbals', 'The cymbals', 'cymbal stands', 'cymbals on', 'cymbals in', 'without cymbals', 'cracked cymbal', 'ride cymbal',
  'spare cymbal', 'The cymbal goes', 'a cymbal case', 'crash cymbal', 'in a cymbal', 'Hold on to the cymbals', 'floor tom', 'on the toms',
  'double-kick run', 'double bass', 'blast beat', 'Blast beats', 'blast beats', 'BLAST BEAT', 'backbeat', 'train beat', 'TRAIN BEAT',
  'on the beat', 'keep the beat', 'Gamble: a new drum loop', 'Gophers Under the Kit', 'Move the kit', 'move the drums',
  'Counts the song in from behind the kit', 'behind the kit', 'flatter than a drum skin', 'Flatter than a drum skin', 'drum shop upstairs',
  'Kit rules', 'Drum Logic', 'on the drum kit', 'never on a drum kit',
  // fills that are a guitar's, a bass's or a fiddle's (Jaxon's sneaky fills, Clementine's runs) and the fills of the songs
  'sneaky fill', 'Sneaky Fill', 'a fill', 'the fill', 'the fills', 'her fills', 'that fill', 'the fills come back', 'Then the fills',
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
// HARD: drum words aimed at the player are leaks even inside a LEFT phrase ("You are the drummer.", "your sticks").
const HARD = /\b(you(?:'re| are) (?:the|a|our) drummer|your (?:drums?|drum kit|kit|sticks|drumsticks|snare|kick|kick drum|hi-?hats?|cymbals?|fills?|double kick|blast beats?|backbeat|drum face|drum groove|drum throne|throne)|you drum|you drummed|like you drum)\b/i;
// The seat-aware lines are cut out first (written for a string seat), then HARD is checked, then the LEFT phrases are cut;
// whatever drum word is still there is a leak.
function leak(text, aware) {
  let t = String(text || '');
  if (!/\s/.test(t) || !drumWords(t)) return null;   // one word = an id (a club tier, a gift id), not text
  (aware || []).forEach(re => { if (re.test(t)) t = t.replace(re, ' '); });
  const h = t.match(HARD);
  if (h) return h[0];
  LEFT_RE.forEach(re => { re.lastIndex = 0; t = t.replace(re, ' '); });
  return drumWords(t) ? word(t) || 'drum word' : null;
}
module.exports = { WORDS, TOMS, HARD, drumWords, word, LEFT, seatAware, leak, toRe, stringSeatGate };
