// content_tutorial.test.js (v1.0 Lane T): src/content/tutorial.js — every lesson id, valid shapes, per-band voices,
// tokens, the E12 drum-word gate, no USA content, nobody from another band, Kenji never speaks.
// Run: node tests/content_tutorial.test.js
const { test, ok, eq, done } = require('./_t');
const load = require('./_load');
const GG = load();
const C = GG.contracts, T = GG.content.tutorial, BANDS = Object.keys(GG.content.bands);
const DRUM_RE = /\b(kit|kits|drums?|drummers?|drumming|sticks?|snares?|kicks?|kicking|cymbals?|hi-?hats?)\b/i;
const ALIASES = ['@front', '@soloist', '@filler', '@bassist', '@namer', '@grumbler', '@deadpan', '@driver', '@any'];
const US = /\b(USA|U\.S\.|America|Americans?|United States|the States|Nashville|Texas|Las Vegas|Vegas|New York|California|Hollywood|Los Angeles|Chicago|Detroit|Memphis|Seattle|Boston|Brooklyn|Fargo|Minneapolis|Montana|Dakota|Inglewood)\b/;
const own = bid => GG.content.bands[bid].members.map(m => m.id);
const allSteps = l => [['*', l.steps || []]].concat(Object.keys(l.byBand || {}).map(b => [b, l.byBand[b].steps || []]));

test('every lesson id from the contract is present, once, in order', () => {
  ok(Array.isArray(T), 'GG.content.tutorial is an array');
  eq(T.map(l => l.id), C.LESSONS, 'lesson ids = C.LESSONS');
  eq(GG.lessons.LESSONS, C.LESSONS, 'GG.lessons.LESSONS = C.LESSONS');
});

test('shapes: title, when, steps; byBand for all four bands; points and advances well-formed', () => {
  const POINT = ['hotspot', 'testid', 'member'];
  T.forEach(l => {
    ok(typeof l.title === 'string' && l.title.length > 3 && l.title.length <= 40, l.id + ' title');
    ok(l.when && typeof l.when === 'object' && (l.when.screen || l.when.tab || l.when.event), l.id + ' has a trigger');
    ok(Array.isArray(l.steps) && l.steps.length, l.id + ' base steps');
    BANDS.forEach(b => ok(l.byBand && l.byBand[b] && l.byBand[b].steps.length, l.id + ' has ' + b + ' steps (in character)'));
    allSteps(l).forEach(([b, steps]) => steps.forEach((s, i) => {
      const at = l.id + '/' + b + '#' + i;
      ok(typeof s.text === 'string' && s.text.length >= 8 && s.text.length <= 170, at + ' text length ' + (s.text || '').length);
      ok(typeof s.who === 'string' && s.who, at + ' who');
      if (s.point) ok(Object.keys(s.point).length === 1 && POINT.includes(Object.keys(s.point)[0]), at + ' point shape');
      if (s.advance && s.advance !== 'next') ok(s.advance.event || s.advance.hotspot, at + ' advance shape');
      if (s.seat) ok(Array.isArray(s.seat) && s.seat.every(x => typeof x === 'string'), at + ' seat gate');
    }));
  });
});

test('tokens: only C.TOKENS (incl. {instrument} / {drummer}); the player\'s kit is never hard-coded as "your drums"', () => {
  let instrument = 0;
  T.forEach(l => allSteps(l).forEach(([b, steps]) => steps.forEach((s, i) => {
    (s.text.match(/\{[^}]*\}/g) || []).forEach(tok => ok(C.TOKENS.includes(tok.slice(1, -1).split(':')[0]), l.id + '/' + b + '#' + i + ' token ' + tok));
    if (!s.seat) ok(!/\byour (drums|kit|sticks)\b/i.test(s.text), l.id + '/' + b + '#' + i + ' reads {instrument}, not the kit');
    if (/\{instrument\}|\{drummer\}/.test(s.text)) instrument++;
  })));
  ok(instrument >= 8, 'lessons use the seat tokens ({instrument}/{drummer}): ' + instrument);
  ok(C.TOKENS.includes('instrument') && C.TOKENS.includes('drummer'), 'stage 0 tokens present');
});

test('{instrument} reads right as a plural ("drums"): no "{instrument} lives", "That\'s your {instrument}" or "on it"', () => {
  T.forEach(l => allSteps(l).forEach(([b, steps]) => steps.forEach((s, i) => {
    if (!/\{instrument\}/.test(s.text)) return;
    ok(!/\{instrument\} (lives|is|was|has|sits)\b|that'?s your \{instrument\}|\bon it\b/i.test(s.text), l.id + '/' + b + '#' + i + ': singular grammar around {instrument}: ' + s.text);
  })));
});

// v1.3 "Songwriter" (plan_contract_1.3 §4.7): a Write block opens Quick song; the jam and the tools live in the header's ⋯ menu.
const IN_MENU = ['btn-seq-jam', 'btn-seq-metro', 'btn-seq-quick', 'btn-seq-beat', 'btn-seq-fill', 'btn-kit-shop', 'kit-practice', 'seq-clear'];
test('w1_write teaches Quick song: Play in every layer (for every seat), the jam via ⋯, no grid squares, nothing inside the closed menu', () => {
  const w = T.find(l => l.id === 'w1_write');
  allSteps(w).forEach(([b, steps]) => steps.forEach((s, i) => {
    ok(!/\bsquares?\b/i.test(s.text), 'w1_write/' + b + '#' + i + ': talks about squares');
    const ids = s.point && s.point.testid ? [].concat(s.point.testid) : [];
    ok(!ids.includes('seq-grid') && !ids.some(id => /^(part-|cell-|chord-)/.test(id)), 'w1_write/' + b + '#' + i + ': points at the editor grid (Quick song opens first)');
    ok(!ids.some(id => IN_MENU.includes(id)), 'w1_write/' + b + '#' + i + ': points inside the closed ⋯ menu ' + ids);
  }));
  allSteps(w).forEach(([b, steps]) => ['drums', 'bass', 'rhythm', 'lead'].forEach(seat => {
    const mine = steps.filter(s => !s.seat || s.seat.includes(seat));
    ok(mine.some(s => s.point && [].concat(s.point.testid || []).includes('btn-guide-play')), 'w1_write/' + b + ' points at Play for the ' + seat + ' seat');
    ok(mine.some(s => s.point && [].concat(s.point.testid || []).includes('btn-seq-tools') && /⋯/.test(s.text) && /jam/i.test(s.text)), 'w1_write/' + b + ': "Tap ⋯ and let the band jam one" for the ' + seat + ' seat');
  }));
  ok(allSteps(w).every(([, steps]) => steps.some(s => s.point && [].concat(s.point.testid || []).includes('btn-guide-play'))), 'every layer points at the Quick song Play button');
});

test('E12: drum words appear only in steps gated seat: [\'drums\'] (titles too)', () => {
  const bad = [];
  let gated = 0;
  T.forEach(l => {
    if (DRUM_RE.test(l.title) && !(l.seat && l.seat.join() === 'drums')) bad.push(l.id + ' title');
    allSteps(l).forEach(([b, steps]) => steps.forEach((s, i) => {
      const drum = s.seat && s.seat.length === 1 && s.seat[0] === 'drums';
      if (drum) gated++;
      if (DRUM_RE.test(s.text.replace(/\{[^}]*\}/g, '')) && !drum) bad.push(l.id + '/' + b + '#' + i + ': ' + s.text);
    }));
  });
  eq(bad, [], 'ungated drum words');
  ok(gated >= 8, 'drum-mechanics steps exist (w1_write, w1_gig, w1_walk): ' + gated);
});

test('per band: every speaker is a talker in that lineup (never a silent member, never another band\'s member)', () => {
  const bad = [];
  T.forEach(l => BANDS.forEach(bid => {
    const ids = own(bid);
    (l.byBand[bid].steps || []).forEach((s, i) => {
      const at = l.id + '/' + bid + '#' + i;
      if (s.who.charAt(0) === '@') { if (!ALIASES.includes(s.who)) bad.push(at + ' unknown alias ' + s.who); return; }
      if (!ids.includes(s.who)) bad.push(at + ' speaker ' + s.who + ' is not in ' + bid);
      const def = GG.content.bands[bid].members.find(m => m.id === s.who);
      if (def && def.silent) bad.push(at + ' silent ' + s.who + ' speaks');
    });
  }));
  eq(bad, [], 'speakers');
  // base steps only use aliases (they fall back for any band)
  T.forEach(l => l.steps.forEach((s, i) => ok(ALIASES.includes(s.who), l.id + ' base #' + i + ' uses a role alias: ' + s.who)));
});

test('Kenji never speaks (no step voiced by kenji in any layer)', () => {
  T.forEach(l => allSteps(l).forEach(([b, steps]) => steps.forEach(s => ok(s.who !== 'kenji', l.id + '/' + b + ' kenji speaks'))));
});

test('no other band\'s names in a band\'s lessons; no USA places', () => {
  const names = {};
  BANDS.forEach(b => {
    const band = GG.content.bands[b];
    names[b] = [band.name].concat(band.members.map(m => m.name.split(' ')[0]), band.members.map(m => m.nick).filter(n => n && n.length > 3));
  });
  const bad = [];
  T.forEach(l => {
    allSteps(l).forEach(([b, steps]) => steps.forEach((s, i) => { if (US.test(s.text)) bad.push(l.id + '/' + b + '#' + i + ' USA: ' + s.text); }));
    if (US.test(l.title)) bad.push(l.id + ' title USA');
    BANDS.forEach(bid => {
      const txt = l.byBand[bid].steps.map(s => s.text).join(' ');
      BANDS.filter(o => o !== bid).forEach(o => names[o].forEach(n => {
        if (names[bid].includes(n)) return;
        if (new RegExp('\\b' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(txt)) bad.push(l.id + '/' + bid + ' names ' + n + ' (' + o + ')');
      }));
    });
    // base steps (any band) name nobody
    const base = l.steps.map(s => s.text).join(' ');
    BANDS.forEach(o => names[o].forEach(n => { if (new RegExp('\\b' + n + '\\b').test(base)) bad.push(l.id + ' base names ' + n); }));
  });
  eq(bad, [], 'leaks');
});

test('no gong on the kit, no share/screenshot/download in lesson text', () => {
  T.forEach(l => allSteps(l).forEach(([b, steps]) => steps.forEach(s => {
    ok(!/\bgong\b/i.test(s.text), l.id + ' gong');
    ok(!/\b(share|screenshot|download)\b/i.test(s.text), l.id + ' share/screenshot/download');
  })));
});

done('content_tutorial');
