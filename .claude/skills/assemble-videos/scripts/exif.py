#!/usr/bin/env python3
"""Camera settings of photos, as preset-reel's before/after card shows them.

Usage: python3 -I exif.py <photo>... [--json]
Prints per photo: lens `18MM` (the focal length the shot used) and exposure
`1/400  F2.0  ISO 100` (shutter, aperture, ISO; two spaces between, like the card's default).
Reads the JPEG's EXIF directly (no dependencies). Use the Original (before); Lightroom's edit
keeps the same EXIF, so it is a fallback.
"""
import json, struct, sys
from fractions import Fraction

TAGS = {0x829A: 'exposure', 0x829D: 'fnumber', 0x8827: 'iso', 0x920A: 'focal', 0xA434: 'lensModel', 0x0110: 'model'}

def read_exif(path):
    with open(path, 'rb') as f:
        data = f.read(512 * 1024)
    i = data.find(b'Exif\x00\x00')
    if i < 0: return {}
    tiff = data[i + 6:]
    e = '<' if tiff[:2] == b'II' else '>'
    out = {}

    def value(typ, cnt, raw_offset_bytes, offset):
        if typ == 2:  # ASCII
            start = offset if cnt > 4 else None
            raw = tiff[start:start + cnt] if start is not None else raw_offset_bytes[:cnt]
            return raw.split(b'\x00')[0].decode('ascii', 'ignore').strip()
        if typ == 3:  # SHORT
            return struct.unpack(e + 'H', raw_offset_bytes[:2])[0]
        if typ == 4:  # LONG
            return struct.unpack(e + 'I', raw_offset_bytes)[0]
        if typ in (5, 10):  # (S)RATIONAL
            num, den = struct.unpack(e + ('II' if typ == 5 else 'ii'), tiff[offset:offset + 8])
            return Fraction(num, den) if den else None
        return None

    def walk(ifd, depth=0):
        count = struct.unpack(e + 'H', tiff[ifd:ifd + 2])[0]
        for n in range(count):
            p = ifd + 2 + n * 12
            tag, typ, cnt = struct.unpack(e + 'HHI', tiff[p:p + 8])
            raw = tiff[p + 8:p + 12]
            offset = struct.unpack(e + 'I', raw)[0]
            if tag == 0x8769 and depth == 0:
                walk(offset, 1)
            elif tag in TAGS and TAGS[tag] not in out:
                out[TAGS[tag]] = value(typ, cnt, raw, offset)
    walk(struct.unpack(e + 'I', tiff[4:8])[0])
    return out

def card(exif):
    parts = []
    t = exif.get('exposure')
    if t:
        parts.append(f'1/{round(1 / t)}' if t < 1 else f'{float(t):g}s')
    f = exif.get('fnumber')
    if f: parts.append(f'F{float(f):.1f}')
    iso = exif.get('iso')
    if iso: parts.append(f'ISO {iso}')
    focal = exif.get('focal')
    return {
        'lens': f'{round(float(focal))}MM' if focal else None,
        'exposure': '  '.join(parts) or None,
        'lensModel': exif.get('lensModel'),
        'camera': exif.get('model'),
    }

if __name__ == '__main__':
    paths = [p for p in sys.argv[1:] if p != '--json']
    result = {p: card(read_exif(p)) for p in paths}
    if '--json' in sys.argv:
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        for p, c in result.items():
            print(f"{p.rsplit('/', 1)[-1]:28} lens {c['lens']}  exposure {c['exposure']}  ({c['camera']}, {c['lensModel']})")
