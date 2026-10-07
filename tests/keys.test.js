// v1.5 "Desktop" (stage 0, lead; plan_contract_1.5 §4.1 / §4.3 / §4.4): the pure key + layout helpers in 11_settings.
// Default keys (owner Q1 / Q2), the v1.4 settings blob, fallbacks per kind, key slots + lanes (bound, the v1.4 extras, code-less
// events, ShiftRight, off-rig keys), codeOf, rebinding (swap + refusals), reset, key calibration (calibFor / setCalib 'keys'),
// key labels, the PC-layout switch and the pixel budget.
const load = require('./_load');
const { test, ok, eq, done } = require('./_t');

const fresh = () => { const store = load.fakeStorage(); return { GG: load({ localStorage: store }), store }; };
const D = ['Space', 'KeyD', 'KeyF', 'KeyS', 'ShiftLeft', 'KeyA'], S = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'ShiftLeft', 'Space'];

test('defaults: owner Q1 "strong fingers" kit + Q2 A S D F + thumb on top; layout auto; nothing stored', () => {
  const { GG, store } = fresh(), P = GG.prefs;
  eq(P.KEY_KINDS, ['drums', 'strings']);
  eq(P.KEY_DEFAULTS, { drums: D, strings: S });
  eq(P.LAYOUTS, ['auto', 'phone', 'wide']);
  const s = P.get();
  eq(s.keymap, { drums: D, strings: S });
  eq(s.layout, 'auto');
  eq(s.calibKb, { speaker: { audio: 0, visual: 0, at: 0, vat: 0 }, headphones: { audio: 0, visual: 0, at: 0, vat: 0 } });
  eq(P.CLASSIC_KEYS, { d: 0, f: 1, j: 2, k: 3, s: 0, l: 3, g: 4, h: 5 });   // 55:60 verbatim
  ok(!store._map.has('gg.v1.settings'), 'normalize never writes');
  const raw = GG.save.settings();
  ok(!('keymap' in raw) && !('calibKb' in raw) && !('layout' in raw), 'GG.save DEFAULT_SETTINGS unchanged');
});

test('a v1.4 settings blob loads: new fields default, old ones kept, the blob is not rewritten', () => {
  const { GG, store } = fresh(), P = GG.prefs;
  const v14 = { gigDifficulty: 'hard', audioProfile: 'headphones', calib: { speaker: { audio: 20, visual: 10, at: 5 }, headphones: { audio: 60, visual: 40, at: 7, vat: 7 } }, calibSeen: true, lefty: true, drumSync: true, syncDisp: 18, bigText: true };
  store.setItem('gg.v1.settings', JSON.stringify(v14));
  const before = store.getItem('gg.v1.settings'), s = P.get();
  eq([s.gigDifficulty, s.audioProfile, s.calib.headphones.audio, s.lefty, s.syncDisp, s.bigText], ['hard', 'headphones', 60, true, 18, true]);
  eq(s.keymap, { drums: D, strings: S }); eq(s.layout, 'auto'); eq(s.calibKb.headphones, { audio: 0, visual: 0, at: 0, vat: 0 });
  eq(store.getItem('gg.v1.settings'), before, 'blob untouched');
  // offsets() / setCalib() without an input: exactly v1.4 (+ visM)
  const o = P.offsets();
  eq([o.audio, o.visual, o.visM], [0.06, 0.04, true]);
  P.setCalib('speaker', { audio: 30 });
  const c = P.get().calib.speaker;
  eq([c.audio, c.visual, c.at, c.vat], [30, 10, 5, 0], 'no input: at kept as v1.4 does (o.at absent), vat untouched');
});

test('keymap fallbacks per kind: invalid / duplicate / reserved / short lists -> that kind\'s default only', () => {
  const { GG } = fresh(), P = GG.prefs;
  const n = km => P.normalize({ keymap: km }).keymap;
  const mine = ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY'];
  eq(n({ drums: mine }), { drums: mine, strings: S });
  eq(n({ drums: mine, strings: ['KeyA', 'KeyA', 'KeyD', 'KeyF', 'ShiftLeft', 'Space'] }), { drums: mine, strings: S }, 'duplicate');
  eq(n({ drums: ['Tab', 'KeyD', 'KeyF', 'KeyS', 'ShiftLeft', 'KeyA'], strings: mine }), { drums: D, strings: mine }, 'reserved');
  eq(n({ drums: ['KeyQ', 'KeyW'] }).drums, D, 'short');
  eq(n({ drums: ['Key A', 'KeyD', 'KeyF', 'KeyS', 'ShiftLeft', 'KeyA'] }).drums, D, 'invalid chars');
  eq(n({ drums: [1, 2, 3, 4, 5, 6] }).drums, D, 'not strings');
  eq(n('nope'), { drums: D, strings: S });
  eq(n({ drums: ['F5', 'KeyD', 'KeyF', 'KeyS', 'ShiftLeft', 'KeyA'] }).drums, D, 'F5 reserved');
  eq(n({ drums: ['ControlLeft', 'KeyD', 'KeyF', 'KeyS', 'ShiftLeft', 'KeyA'] }).drums, D, 'Control* reserved');
  for (const c of ['Escape', 'Tab', 'Enter', 'NumpadEnter', 'CapsLock', 'ContextMenu', 'ControlRight', 'AltLeft', 'AltGraph', 'MetaLeft', 'OSLeft', 'F1', 'F12', 'F24', 'NumLock', 'ScrollLock', 'Pause', 'PrintScreen', 'Fn', 'FnLock', 'Unidentified', ''])
    ok(P.keyReserved(c), c + ' reserved');
  for (const c of ['KeyA', 'Space', 'ShiftLeft', 'ShiftRight', 'Digit1', 'Numpad4', 'Semicolon', 'F25x', 'Fx'])
    ok(!P.keyReserved(c), c + ' bindable');
  eq(P.normalize({ layout: 'huge' }).layout, 'auto');
  eq(P.normalize({ layout: 'wide' }).layout, 'wide');
});

test('keyKind / keySlot / keysFor (4, 5, 6 lanes)', () => {
  const { GG } = fresh(), P = GG.prefs, s = P.get();
  eq(['drums', 'bass', 'rhythm', 'lead', undefined].map(P.keyKind), ['drums', 'strings', 'strings', 'strings', 'drums']);
  eq([0, 1, 2, 3, 4, 5].map(l => P.keySlot('drums', l, 6)), [0, 1, 2, 3, 4, 5]);
  eq([0, 1, 2, 3].map(l => P.keySlot('strings', l, 4)), [0, 1, 2, 3]);
  eq([0, 1, 2, 3, 4].map(l => P.keySlot('strings', l, 5)), [0, 1, 2, 3, 5], '5 strings: the top is slot 5 (Space)');
  eq([0, 1, 2, 3, 4, 5].map(l => P.keySlot('strings', l, 6)), [0, 1, 2, 3, 4, 5]);
  eq(P.keysFor(s, 'drums', 4), ['Space', 'KeyD', 'KeyF', 'KeyS']);
  eq(P.keysFor(s, 'drums', 6), D);
  eq(P.keysFor(s, 'strings', 4), ['KeyA', 'KeyS', 'KeyD', 'KeyF']);
  eq(P.keysFor(s, 'strings', 5), ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'Space']);
  eq(P.keysFor(s, 'strings', 6), S);
});

test('keyLane: bound keys, off-rig keys, ShiftRight, code-less = v1.4, the J K L G H extras', () => {
  const { GG } = fresh(), P = GG.prefs, s = P.get();
  const L = (kind, lanes, code, key) => P.keyLane(s, kind, lanes, code, key);
  eq(L('drums', 4, 'Space', ' '), { lane: 0 }); eq(L('drums', 4, 'KeyD', 'd'), { lane: 1 });
  eq(L('drums', 4, 'KeyF', 'f'), { lane: 2 }); eq(L('drums', 4, 'KeyS', 's'), { lane: 3 });
  eq(L('drums', 6, 'ShiftLeft', 'Shift'), { lane: 4 }); eq(L('drums', 6, 'KeyA', 'a'), { lane: 5 });
  eq(L('drums', 4, 'ShiftLeft', 'Shift'), { lane: -1 }, 'toms key on a 4-drum kit: swallowed');
  eq(L('drums', 4, 'KeyA', 'a'), { lane: -1 }, 'ride key on a 4-drum kit: swallowed');
  eq(L('drums', 6, 'ShiftRight', 'Shift'), { lane: 4 }, 'ShiftRight plays the ShiftLeft lane while unbound');
  eq(L('strings', 4, 'Space', ' '), { lane: -1 }, 'Space on a 4-string rig: swallowed');
  eq(L('strings', 5, 'Space', ' '), { lane: 4 }); eq(L('strings', 5, 'ShiftLeft', 'Shift'), { lane: -1 });
  eq(L('strings', 6, 'ShiftLeft', 'Shift'), { lane: 4 }); eq(L('strings', 6, 'Space', ' '), { lane: 5 });
  eq(L('strings', 6, 'ShiftRight', 'Shift'), { lane: 4 });
  eq(L('strings', 4, 'KeyA', 'A'), { lane: 0 }, 'Shift held: the code still decides');
  // code-less events (synthetic, old browsers): the v1.4 table verbatim (pw_gig:793 dispatches { key: 'd' })
  eq(L('drums', 4, '', 'd'), { col: 0 }); eq(L('drums', 4, undefined, 'f'), { col: 1 }); eq(L('drums', 4, '', 'K'), { col: 3 });
  eq(L('drums', 6, '', 'h'), { col: 5 }); eq(L('drums', 4, '', 'h'), null, 'col >= lanes');
  eq(L('drums', 4, '', ' '), { lane: 0 }, 'code-less Space -> codeOf -> bound');
  eq(L('strings', 4, '', 'q'), null);
  // unbound codes: the v1.4 extras J K L G H as columns (pw_shop:211 presses real g / h), else nothing
  eq(L('drums', 4, 'KeyJ', 'j'), { col: 2 }); eq(L('drums', 4, 'KeyK', 'k'), { col: 3 }); eq(L('drums', 4, 'KeyL', 'l'), { col: 3 });
  eq(L('drums', 6, 'KeyG', 'g'), { col: 4 }); eq(L('drums', 6, 'KeyH', 'h'), { col: 5 }); eq(L('drums', 4, 'KeyG', 'g'), null);
  eq(L('drums', 4, 'KeyQ', 'q'), null); eq(L('drums', 4, 'Enter', 'Enter'), null);
  // a key rebound away from its lane no longer plays it; the extras step aside once bound
  const s2 = P.normalize({ keymap: P.bindKey(s, 'drums', 1, 'KeyJ').keymap });
  eq(P.keyLane(s2, 'drums', 4, 'KeyJ', 'j'), { lane: 1 });
  eq(P.keyLane(s2, 'drums', 4, 'KeyD', 'd'), null, 'D unbound now (not a v1.4 extra)');
  const s3 = P.normalize({ keymap: P.bindKey(s, 'drums', 4, 'ShiftRight').keymap });
  eq(P.keyLane(s3, 'drums', 6, 'ShiftRight', 'Shift'), { lane: 4 }); eq(P.keyLane(s3, 'drums', 6, 'ShiftLeft', 'Shift'), null);
});

test('codeOf', () => {
  const { GG } = fresh(), P = GG.prefs;
  eq(['a', 'A', 'z', '1', '0', ' ', 'Shift', 'Enter', 'é', '', null, undefined, 'ab'].map(P.codeOf),
    ['KeyA', 'KeyA', 'KeyZ', 'Digit1', 'Digit0', 'Space', 'ShiftLeft', null, null, null, null, null, null]);
});

test('bindKey: set, swap on a same-kind conflict (no lane unbound), refusals; unchanged kinds are not stored', () => {
  const { GG } = fresh(), P = GG.prefs, s = P.get();
  let r = P.bindKey(s, 'drums', 0, 'KeyJ');
  eq(r, { keymap: { drums: ['KeyJ', 'KeyD', 'KeyF', 'KeyS', 'ShiftLeft', 'KeyA'] }, swapped: null, refused: null });
  r = P.bindKey(s, 'drums', 2, 'KeyS');   // hats -> S, crash takes F
  eq(r.swapped, 3); eq(r.keymap.drums, ['Space', 'KeyD', 'KeyS', 'KeyF', 'ShiftLeft', 'KeyA']);
  eq(P.bindKey(s, 'drums', 2, 'KeyF'), { keymap: {}, swapped: null, refused: null }, 'same key: nothing changes');
  for (const c of ['Tab', 'Escape', 'Enter', 'F5', 'MetaLeft', '']) eq(P.bindKey(s, 'drums', 0, c).refused, 'reserved', c);
  for (const c of ['Key A', 'x', null]) eq(P.bindKey(s, 'drums', 0, c).refused, 'invalid', String(c));
  eq(P.bindKey(s, 'drums', 6, 'KeyJ').refused, 'invalid', 'slot out of range');
  eq(P.bindKey(s, 'piano', 0, 'KeyJ').refused, 'invalid', 'unknown kind');
  eq(P.bindKey(s, 'drums', 0, 'Tab').keymap, {}, 'a refusal changes nothing');
  // the other kind is untouched and the map round-trips through set()
  P.set({ keymap: P.bindKey(P.get(), 'strings', 5, 'KeyG').keymap });
  eq(GG.save.settings().keymap, { strings: ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'ShiftLeft', 'KeyG'] }, 'only the changed kind stored');
  P.set({ keymap: P.bindKey(P.get(), 'drums', 1, 'KeyK').keymap });
  eq(GG.save.settings().keymap, { drums: ['Space', 'KeyK', 'KeyF', 'KeyS', 'ShiftLeft', 'KeyA'], strings: ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'ShiftLeft', 'KeyG'] });
  // binding back to the defaults drops the kind
  P.set({ keymap: P.bindKey(P.get(), 'strings', 5, 'Space').keymap });
  ok(!('strings' in GG.save.settings().keymap), 'strings back to defaults: not stored');
});

test('resetKeys: the map without that kind', () => {
  const { GG } = fresh(), P = GG.prefs;
  P.set({ keymap: { drums: ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY'], strings: ['KeyU', 'KeyI', 'KeyO', 'KeyP', 'KeyJ', 'KeyK'] } });
  eq(P.resetKeys(P.get(), 'drums'), { strings: ['KeyU', 'KeyI', 'KeyO', 'KeyP', 'KeyJ', 'KeyK'] });
  P.set({ keymap: P.resetKeys(P.get(), 'strings') });
  eq(P.get().keymap.strings, S);
  eq(P.get().keymap.drums, ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY']);
  P.set({ keymap: P.resetKeys(P.get(), 'drums') });
  eq(GG.save.settings().keymap, {});
});

test('calibFor / offsets(input): each field from its own measured source; touch untouched', () => {
  const { GG } = fresh(), P = GG.prefs;
  P.set({ audioProfile: 'speaker', calib: { speaker: { audio: 0, visual: 12, at: 1, vat: 1 }, headphones: { audio: 30, visual: 0, at: 1, vat: 0 } } });
  eq(P.calibFor(P.get(), 'touch'), { audio: 0, visual: 12, visM: true });
  eq(P.calibFor(P.get(), 'keys'), { audio: 0, visual: 12, visM: true }, 'keys unmeasured: the touch values');
  P.set({ calibKb: { speaker: { audio: 60, visual: 40, at: 5, vat: 5 } } });
  eq(P.calibFor(P.get(), 'keys'), { audio: 60, visual: 40, visM: true });
  eq(P.calibFor(P.get(), 'touch'), { audio: 0, visual: 12, visM: true });
  // a light-check-only key calibration: audio from touch, visual from keys
  P.set({ calibKb: { speaker: { audio: 0, visual: 25, at: 0, vat: 9 } } });
  eq(P.calibFor(P.get(), 'keys'), { audio: 0, visual: 25, visM: true });
  // a click-test-only key calibration: audio from keys, visual (+ visM) from touch
  P.set({ calibKb: { speaker: { audio: 45, visual: 0, at: 9, vat: 0 } } });
  eq(P.calibFor(P.get(), 'keys'), { audio: 45, visual: 12, visM: true });
  // the headphones profile: touch visual unmeasured -> visM false
  P.set({ audioProfile: 'headphones' });
  eq(P.calibFor(P.get(), 'keys'), { audio: 30, visual: 0, visM: false });
  const o = P.offsets(P.get(), 'keys'), t = P.offsets(P.get(), 'touch'), n = P.offsets();
  eq([o.audio, o.visual, o.visM], [0.03, 0, false]); eq([t.audio, t.visual, t.visM], [0.03, 0, false]); eq(n, t);
  P.set({ audioProfile: 'speaker' });
  eq(P.offsets(P.get(), 'keys'), { audio: 0.045, visual: 0.012, visM: true });
});

test('setCalib(profile, o, "keys"): writes calibKb; at only with audio, vat only with visual; touch untouched', () => {
  const { GG } = fresh(), P = GG.prefs;
  const t0 = JSON.stringify(P.get().calib);
  let c = P.setCalib('speaker', { visual: 30 }, 'keys');
  eq([c.audio, c.visual, c.at > 0, c.vat > 0], [0, 30, false, true], 'light check only: no at');
  c = P.setCalib('speaker', { audio: 50, at: 123 }, 'keys');
  eq([c.audio, c.visual, c.at, c.vat > 0], [50, 30, 123, true]);
  c = P.setCalib('headphones', { audio: 400, visual: -400, at: 7 }, 'keys');
  eq([c.audio, c.visual, c.at, c.vat], [250, -250, 7, 7], 'clamped like touch');
  eq(JSON.stringify(P.get().calib), t0, 'touch calibration untouched');
  eq(P.get().calibSeen, true);
});

test('keyLabel: layout map > learned > the code', () => {
  const { GG } = fresh(), P = GG.prefs;
  const map = new Map([['KeyA', 'q'], ['KeyQ', 'a'], ['Semicolon', 'm']]);
  eq(P.keyLabel('KeyA', map, { KeyA: 'z' }), 'Q');
  eq(P.keyLabel('KeyA', { KeyA: 'q' }), 'Q', 'a plain object works as a map');
  eq(P.keyLabel('KeyA', null, { KeyA: 'q' }), 'Q', 'learned');
  eq(P.keyLabel('KeyA'), 'A'); eq(P.keyLabel('Digit1'), '1'); eq(P.keyLabel('ShiftLeft'), 'Shift'); eq(P.keyLabel('ShiftRight'), 'Shift');
  eq(P.keyLabel('Space'), 'Space'); eq(P.keyLabel('Space', null, { Space: ' ' }), 'Space'); eq(P.keyLabel('ShiftLeft', null, { ShiftLeft: 'Shift' }), 'Shift');
  eq(P.keyLabel('Semicolon', map), 'M'); eq(P.keyLabel('Semicolon'), ';'); eq(P.keyLabel('Numpad4'), 'Num 4'); eq(P.keyLabel('ArrowLeft'), '←');
  eq(P.keyLabel('IntlRo'), 'IntlRo');
});

test('layoutFor: Auto = a computer at >= 1000x560 and wider than 1.2 x tall; Phone / PC forced', () => {
  const { GG } = fresh(), P = GG.prefs;
  const sizes = [[390, 844], [844, 390], [956, 440], [800, 900], [1280, 720], [1440, 900], [1920, 1080], [1080, 1920], [1024, 1366]];
  eq(sizes.map(([w, h]) => P.layoutFor(w, h, true, 'auto')), [false, false, false, false, true, true, true, false, false]);
  eq(sizes.map(([w, h]) => P.layoutFor(w, h, false, 'auto')), sizes.map(() => false), 'phones / tablets (coarse pointer)');
  eq(sizes.map(([w, h]) => P.layoutFor(w, h, true, 'phone')), sizes.map(() => false));
  eq(sizes.map(([w, h]) => P.layoutFor(w, h, false, 'wide')), [false, false, false, false, true, true, true, true, true]);
  eq(P.layoutFor(1440, 900, true, undefined), true, 'missing pref = auto');
});

test('pxBudget: wide only, 2.4 MP', () => {
  const { GG } = fresh(), P = GG.prefs;
  ok(P.pxBudget(1024, 1366, false) >= 2, 'not wide: no budget');
  eq(P.pxBudget(390, 844, false), Infinity);
  for (const [w, h] of [[1280, 720], [1440, 900], [1920, 1080], [2560, 1440]]) {
    const b = P.pxBudget(w, h, true);
    ok(w * b * h * b <= 2.4e6 + 1 && w * b * h * b > 2.39e6, w + 'x' + h + ': ' + b);
  }
  ok(P.pxBudget(1280, 720, true) > 1.6 && P.pxBudget(1920, 1080, true) < 1.1);
});

done('keys');
