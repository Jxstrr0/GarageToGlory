#!/usr/bin/env node
// tools/seat_audit.js (v1.1 "Seats" stage 0, handoff E8): lists every content line whose player-facing text uses drum
// vocabulary, so Lane A can decide per line: tokenise ({instrument} {gear} {sticks} {drummer} {yourPart} {seat}), gate
// (seat: ['drums']) or leave (it means the band's drums in general).
//   node tools/seat_audit.js [out]        (default out: plan/seat_audit.txt; '-' prints to stdout)
// Only string literals with a space (human text) are read, so ids and data keys ('kick', 'toms', pedal: true, throne:
// 'crate') never count. Full-line // comments are skipped. Tags: [gated] the line already carries a seat gate,
// [tok] it already uses a seat token. The header has the count per file (Lane A reports its decisions against it).
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), DIR = path.join(ROOT, 'src', 'content');
const OUT = process.argv[2] || path.join(ROOT, 'plan', 'seat_audit.txt');

// Drum vocabulary. Case-insensitive except the toms (a "Tom" is a name).
const WORDS = /\b(drums?|drummers?|drumming|drummed|drumsticks?|drum ?kits?|drum ?skill|kits?|sticks|snares?|kicks?|kick ?drums?|hi-?hats?|cymbals?|crash cymbal|ride cymbal|china cymbal|thrones?|double[- ]kick|kick pedal|rimshots?|paradiddles?|brushes|(?:drum|tom|a|that|the|your|his|her|big|sneaky|sneaks in a) fills?(?!-in)|the beat|your beat|backbeat|blast ?beats?|four-on-the-floor|behind the kit|on the kit)\b/i;
const TOMS = /\b(toms|floor tom|rack tom|tom fill|tom-toms?)\b/;
const STR = /'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g;

function texts(line) {
  const out = [];
  let m; STR.lastIndex = 0;
  while ((m = STR.exec(line))) { const s = m[0].slice(1, -1); if (/\s/.test(s)) out.push(s); }
  return out;
}
function scan() {
  const files = fs.readdirSync(DIR).filter(f => f.endsWith('.js')).sort(), rows = [], count = {};
  files.forEach(f => {
    const rel = 'src/content/' + f, lines = fs.readFileSync(path.join(DIR, f), 'utf8').split('\n');
    count[rel] = 0;
    lines.forEach((line, i) => {
      if (/^\s*\/\//.test(line)) return;
      const hit = texts(line).some(s => WORDS.test(s) || TOMS.test(s));
      if (!hit) return;
      count[rel]++;
      const tags = (/\bseat\s*:/.test(line) ? '[gated]' : '') + (/\{(instrument|gear|sticks|drummer|yourPart|seat)\}/.test(line) ? '[tok]' : '');
      const t = line.trim();
      rows.push(rel + ':' + (i + 1) + (tags ? '  ' + tags : '') + '  ' + (t.length > 240 ? t.slice(0, 237) + '...' : t));
    });
  });
  return { rows, count };
}
function report(r) {
  const files = Object.keys(r.count).filter(f => r.count[f] > 0).sort((a, b) => r.count[b] - r.count[a] || (a < b ? -1 : 1));
  const total = files.reduce((t, f) => t + r.count[f], 0);
  const head = ['# plan/seat_audit.txt: content lines with drum vocabulary (tools/seat_audit.js, v1.1 "Seats" stage 0, handoff E8)',
    '# Lane A decides per line: tokenise ({instrument} {gear} {sticks} {drummer} {yourPart} {seat}) | gate (seat: [\'drums\']) |',
    '# leave (the band\'s drums in general). Only human text in string literals is read (ids/data keys never count).',
    '# Tags: [gated] the line already has a seat gate; [tok] it already uses a seat token. Regenerate after edits.',
    '#', '# count per file (lines):'];
  files.forEach(f => head.push('#   ' + (f + ' ').padEnd(44, '.') + ' ' + r.count[f]));
  head.push('#   TOTAL ' + total + ' lines in ' + files.length + ' files', '');
  return { text: head.concat(r.rows).join('\n') + '\n', total, files: files.map(f => [f, r.count[f]]) };
}
// v1.1 review: the second pass. A swapped member (bands.<id>.seats, E3) named in the same sentence as their OLD instrument's
// words: on the seat that sends them to the kit the line shows them playing it. Decide per line: seat-neutral words, a seat
// gate without that seat (content/zz_seats_gates.js for whole cards), or leave (songwriting, someone else's instrument; the
// runtime scan's OLD_LEFT in tests/seat_scan.js). Tags: [seat] the line carries a seat gate; [swapped] a swapped gate.
const BASS = /\b(bass|basses|bassist|bass ?lines?)\b/i, GTR = /\b(guitars?|guitarist|solos?|riffs?|chords?|pedalboard|pedals|strap|7-string|frets?|acoustic)\b/i;
const SWAPPED = { kenji: [/\bKenji\b/, BASS], moth: [/\bMoth\b/, BASS], tamara: [/\b(Tamara|T-Bone)\b/, BASS], duke: [/\bDuke\b/, BASS],
  jaxon: [/\bJaxon\b/, GTR], rox: [/\bRox\b/, GTR], chase: [/\bChase\b/, GTR], travis: [/\bTravis\b/, GTR],
  dana: [/\b(Dana|Sweep)\b/, GTR], benny: [/\bBenny\b/, GTR], lenny: [/\bLenny\b/, GTR], earl: [/\bEarl\b/, GTR] };
function scanOld() {
  const files = fs.readdirSync(DIR).filter(f => f.endsWith('.js')).sort(), rows = [];
  files.forEach(f => {
    const rel = 'src/content/' + f;
    fs.readFileSync(path.join(DIR, f), 'utf8').split('\n').forEach((line, i) => {
      if (/^\s*\/\//.test(line)) return;
      const ids = new Set();
      texts(line).forEach(t => t.split(/(?<=[.!?])\s+/).forEach(sen => Object.keys(SWAPPED).forEach(id => { if (SWAPPED[id][0].test(sen) && SWAPPED[id][1].test(sen)) ids.add(id); })));
      if (!ids.size) return;
      const tags = (/\bseat\s*:/.test(line) ? '[seat]' : '') + (/\bswapped\s*:/.test(line) ? '[swapped]' : ''), t = line.trim();
      rows.push(rel + ':' + (i + 1) + '  {' + [...ids].join(',') + '}' + (tags ? ' ' + tags : '') + '  ' + (t.length > 200 ? t.slice(0, 197) + '...' : t));
    });
  });
  return rows;
}
const rep = report(scan()), old = scanOld();
rep.text += ['', '# ---- Pass 2 (v1.1 review): a swapped member next to their OLD instrument (' + old.length + ' lines) ----',
  '# On a string seat the member whose seat you took drums: decide per line (seat-neutral words | a seat gate without their',
  '# swap seat, content/zz_seats_gates.js for whole cards | leave: songwriting or someone else\'s instrument).', ''].concat(old).join('\n') + '\n';
if (OUT === '-') process.stdout.write(rep.text);
else {
  fs.writeFileSync(OUT, rep.text);
  console.log('pass 2 (old instrument): ' + old.length + ' lines');
  rep.files.forEach(([f, n]) => console.log((f + ' ').padEnd(44, '.') + ' ' + n));
  console.log('TOTAL ' + rep.total + ' lines -> ' + path.relative(ROOT, OUT));
}
module.exports = { scan, scanOld, report, WORDS, TOMS };
