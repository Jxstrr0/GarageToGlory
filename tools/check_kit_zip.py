#!/usr/bin/env python3
"""Safety-check a drum sample pack zip before it is unzipped (handoff F17.1).

Usage: python3 tools/check_kit_zip.py <pack.zip>

Checks every entry: no absolute paths or "..", no symlinks, no exec bits, no encryption, only
folders and .wav files; every .wav is a RIFF/WAVE PCM file whose RIFF length matches the entry
size (nothing hidden after the audio). Prints one row per wav and exits 1 on any failure.
Stdlib only. Reads the zip in place; never extracts.
"""
import stat
import struct
import sys
import zipfile

WAVE_PCM = 1
WAVE_EXT = 0xFFFE
PCM_GUID_TAIL = b'\x00\x00\x00\x00\x10\x00\x80\x00\x00\xaa\x00\x38\x9b\x71'


def check_wav(data):
    """Return (info dict, error string or None)."""
    if len(data) < 12 or data[:4] != b'RIFF' or data[8:12] != b'WAVE':
        return {}, 'not RIFF/WAVE'
    riff_len = struct.unpack('<I', data[4:8])[0]
    if riff_len + 8 != len(data):
        return {}, 'RIFF length %d + 8 != file size %d (trailing or missing data)' % (riff_len, len(data))
    pos, chunks, fmt, nframes = 12, [], None, None
    while pos + 8 <= len(data):
        cid = data[pos:pos + 4]
        clen = struct.unpack('<I', data[pos + 4:pos + 8])[0]
        body = data[pos + 8:pos + 8 + clen]
        if len(body) != clen:
            return {}, 'chunk %r runs past the end' % cid
        chunks.append(cid.decode('latin-1').strip())
        if cid == b'fmt ':
            tag, ch, sr, _, align, bits = struct.unpack('<HHIIHH', body[:16])
            if tag == WAVE_EXT and len(body) >= 40:
                if body[26:40] != PCM_GUID_TAIL or struct.unpack('<H', body[24:26])[0] != WAVE_PCM:
                    return {}, 'extensible format is not PCM'
            elif tag != WAVE_PCM:
                return {}, 'format tag %d is not PCM' % tag
            fmt = (ch, sr, bits, align)
        elif cid == b'data':
            nframes = clen // fmt[3] if fmt and fmt[3] else None
        pos += 8 + clen + (clen & 1)
    if pos != len(data):
        return {}, 'chunk walk ended at %d of %d bytes' % (pos, len(data))
    if not fmt or nframes is None:
        return {}, 'missing fmt or data chunk'
    ch, sr, bits, _ = fmt
    return {'ch': ch, 'sr': sr, 'bits': bits, 'secs': nframes / float(sr), 'chunks': ','.join(chunks)}, None


def main(path):
    bad = []
    rows = []
    with zipfile.ZipFile(path) as z:
        infos = z.infolist()
        for i in infos:
            name = i.filename
            mode = (i.external_attr >> 16) & 0xFFFF
            if name.startswith('/') or name.startswith('\\') or '..' in name.replace('\\', '/').split('/') or ':' in name:
                bad.append((name, 'unsafe path'))
            if mode and stat.S_ISLNK(mode):
                bad.append((name, 'symlink'))
            if mode & 0o111 and not name.endswith('/'):
                bad.append((name, 'exec bit set'))
            if i.flag_bits & 0x1:
                bad.append((name, 'encrypted'))
            if name.endswith('/'):
                continue
            if not name.lower().endswith('.wav'):
                bad.append((name, 'not a .wav file'))
                continue
            info, err = check_wav(z.read(i))
            if err:
                bad.append((name, err))
                continue
            rows.append((name, info, i.compress_type, i.file_size))
    print('%-58s %3s %6s %4s %6s  %s' % ('entry', 'ch', 'sr', 'bit', 'secs', 'chunks'))
    for name, info, _, _ in rows:
        print('%-58s %3d %6d %4d %6.2f  %s' % (name[-58:], info['ch'], info['sr'], info['bits'], info['secs'], info['chunks']))
    print('\n%d entries, %d wav ok, %d problems' % (len(infos), len(rows), len(bad)))
    for name, why in bad:
        print('FAIL %s: %s' % (name, why))
    return 1 if bad else 0


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(2)
    sys.exit(main(sys.argv[1]))
