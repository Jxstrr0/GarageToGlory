#!/usr/bin/env python3
"""Build a sampled-kit module for the game from a folder of drum WAVs (handoff F17.1; reusable for any future kit).

Usage:
  python3 tools/make_kit.py                       # the TMKD "Vortex" DIRECT kit -> src/content/kit_tmkd_vortex.js
  python3 tools/make_kit.py --trim plan/kit_trim.json
  python3 tools/make_kit.py --src <folder> --id <id> --name <name> --credit <text> --terms <text> --map KD,SN,RT1,RT2,FT1

What it does, per lane (kick <- KD, snare <- SN, toms 0 high <- RT1, 1 mid <- RT2, 2 floor <- FT1; FT2 unused):
  - every round robin <PREFIX>_*_NN.wav (sorted; the pack has 5 per drum, one velocity),
  - start 1 ms before the onset (the first sample over 2 % of the peak), trim to the lane's length (kick 0.45 s, snare 0.65 s,
    rack toms 1.0 s, floor tom 1.2 s), the last 40 ms a cosine fade,
  - peak-normalise to -0.3 dBFS (velocity is the game's job),
  - encode mono MP3 112 kbps (libmp3lame, bit-exact flags, no tags), base64,
  - write src/content/kit_<id>.js: GG.content.kits.<id> = { id, name, credit, terms, genres, tiers, codec, sr, lanes: { kick:
    [b64 x5], snare: [b64 x5], toms: [[b64 x5] x3] }, trim: { kick, snare, toms: [3] } }. The licence file sits next to it
    (src/content/kit_<id>.LICENSE.md; build.js only concatenates .js).
  - trim (dB per lane): from --trim <json> ({ kick, snare, toms: [a, b, c] }), measured by tools/kit_trim.js so each lane's
    first-100 ms RMS at vel 0.85 matches the 1.1 synth hit on the pro tier within +-1 dB (plan/v12_audio_numbers.txt).
Needs numpy, soundfile and ffmpeg (libmp3lame). Never commit the raw WAVs (local/ is git-ignored).
"""
import argparse
import base64
import glob
import json
import os
import subprocess
import sys
import tempfile

import numpy as np
import soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEF_SRC = os.path.join(ROOT, 'local', 'kits', 'tmkd_vortex', 'src', 'TMKD-VORTEX_Free_Pack_Wav', 'DIRECT')
DEF_CREDIT = 'Drum samples: "Vortex" free pack by The Metal Kick Drum, recorded & processed by Rafa Prieto (© 2019)'
DEF_TERMS = 'free to share, credit required, not for sale (src/content/kit_tmkd_vortex.LICENSE.md)'
LENGTHS = {'kick': 0.45, 'snare': 0.65, 'toms': [1.0, 1.0, 1.2]}
FADE = 0.040
PEAK_DB = -0.3
SR = 44100
KBPS = 112


def onset_start(x, sr):
    pk = float(np.max(np.abs(x))) or 1.0
    on = int(np.argmax(np.abs(x) > 0.02 * pk))
    return max(0, on - int(round(0.001 * sr)))


def prepare(path, secs):
    x, sr = sf.read(path, always_2d=True, dtype='float64')
    x = x.mean(axis=1)
    if sr != SR:
        raise SystemExit('%s: %d Hz (expected %d)' % (path, sr, SR))
    s = onset_start(x, sr)
    n = int(round(secs * sr))
    y = np.zeros(n)
    seg = x[s:s + n]
    y[:len(seg)] = seg
    f = int(round(FADE * sr))
    y[n - f:] *= 0.5 + 0.5 * np.cos(np.pi * np.arange(f) / f)   # cosine fade to 0
    pk = float(np.max(np.abs(y))) or 1.0
    return y * (10 ** (PEAK_DB / 20) / pk)


def mp3_b64(y):
    with tempfile.TemporaryDirectory() as d:
        wav, mp3 = os.path.join(d, 'in.wav'), os.path.join(d, 'out.mp3')
        sf.write(wav, y.astype(np.float32), SR, subtype='FLOAT')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-ac', '1', '-ar', str(SR), '-codec:a', 'libmp3lame', '-b:a', '%dk' % KBPS,
                        '-map_metadata', '-1', '-fflags', '+bitexact', '-flags:a', '+bitexact', '-id3v2_version', '0', '-write_id3v1', '0', mp3], check=True)
        with open(mp3, 'rb') as fh:
            data = fh.read()
    return base64.b64encode(data).decode('ascii'), len(data)


def lane_files(src, prefix):
    files = sorted(glob.glob(os.path.join(src, prefix + '_*.wav')))
    if not files:
        raise SystemExit('no %s_*.wav in %s' % (prefix, src))
    return files


def js_str(s):
    return "'" + s.replace('\\', '\\\\').replace("'", "\\'") + "'"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', default=DEF_SRC)
    ap.add_argument('--id', default='tmkd_vortex')
    ap.add_argument('--name', default='TMKD Vortex')
    ap.add_argument('--credit', default=DEF_CREDIT)
    ap.add_argument('--terms', default=DEF_TERMS)
    ap.add_argument('--genres', default='metal')
    ap.add_argument('--tiers', default='2,3')
    ap.add_argument('--map', default='KD,SN,RT1,RT2,FT1', help='kick,snare,tom high,tom mid,tom floor file prefixes')
    ap.add_argument('--trim', default=None, help='JSON file { kick, snare, toms: [3] } (dB)')
    ap.add_argument('--out', default=None)
    a = ap.parse_args()
    if not os.path.isdir(a.src):
        raise SystemExit('kit source folder missing: %s (copy the git-ignored local/ folder in first)' % a.src)
    m = a.map.split(',')
    trim = {'kick': 0.0, 'snare': 0.0, 'toms': [0.0, 0.0, 0.0]}
    if a.trim:
        with open(a.trim) as fh:
            t = json.load(fh)
        trim = {'kick': round(float(t['kick']), 2), 'snare': round(float(t['snare']), 2), 'toms': [round(float(v), 2) for v in t['toms']]}
    lanes, total, secs = {}, 0, 0.0
    def enc(prefix, length):
        nonlocal total, secs
        out = []
        for f in lane_files(a.src, prefix):
            b64, n = mp3_b64(prepare(f, length))
            out.append(b64)
            total += n
            secs += length
        return out
    lanes['kick'] = enc(m[0], LENGTHS['kick'])
    lanes['snare'] = enc(m[1], LENGTHS['snare'])
    lanes['toms'] = [enc(m[2 + i], LENGTHS['toms'][i]) for i in range(3)]
    out = a.out or os.path.join(ROOT, 'src', 'content', 'kit_%s.js' % a.id)
    rr = lambda arr: '[\n      ' + ',\n      '.join(js_str(x) for x in arr) + ']'
    genres = [g for g in a.genres.split(',') if g]
    tiers = [int(t) for t in a.tiers.split(',') if t]
    src = []
    src.append('// content/kit_%s.js: a sampled drum kit (handoff F17; written by tools/make_kit.py, do not edit by hand).' % a.id)
    src.append('// %s. Terms: src/content/kit_%s.LICENSE.md (credit required, never sold).' % (a.credit, a.id))
    src.append('// %d round robins per lane, %s mono MP3 %d kbps, base64 (%d B of MP3, %.1f s); trim = dB per lane matched to the' % (len(lanes['kick']), 'DIRECT close mics,', KBPS, total, secs))
    src.append('// 1.1 synth on the pro tier (tools/kit_trim.js). Played by 30_audio.js A.sampleKit / SK (genres + tiers below).')
    src.append('(function (GG) {')
    src.append('  GG.content.kits = GG.content.kits || {};')
    src.append('  GG.content.kits.%s = { id: %s, name: %s,' % (a.id, js_str(a.id), js_str(a.name)))
    src.append('    credit: %s,' % js_str(a.credit))
    src.append('    terms: %s,' % js_str(a.terms))
    src.append('    genres: %s, tiers: %s, codec: \'mp3\', sr: %d,' % (json.dumps(genres).replace('"', "'"), json.dumps(tiers), SR))
    src.append('    trim: { kick: %s, snare: %s, toms: %s },' % (trim['kick'], trim['snare'], json.dumps(trim['toms'])))
    src.append('    lanes: {')
    src.append('    kick: %s,' % rr(lanes['kick']))
    src.append('    snare: %s,' % rr(lanes['snare']))
    src.append('    toms: [%s] } };' % ', '.join(rr(t) for t in lanes['toms']))
    src.append('})(window.GG);')
    with open(out, 'w') as fh:
        fh.write('\n'.join(src) + '\n')
    print('wrote %s: %d B (%d B of MP3, %.1f s of audio), trim %s' % (os.path.relpath(out, ROOT), os.path.getsize(out), total, secs, json.dumps(trim)))


if __name__ == '__main__':
    main()
