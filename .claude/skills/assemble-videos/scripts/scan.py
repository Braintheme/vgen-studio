#!/usr/bin/env python3
"""Scan a shoot folder: clips, before/after photo pairs, the looks table; match photos to clips.

Usage: python3 -I scan.py <folder> [--mark any|'$$'] [--offset auto|<seconds>] [--json out.json]

Clips: *.mp4 / *.mov anywhere under the folder. A mark before the camera's name (`$$`, `&&`…,
any symbols) means the owner picked the clip; `--mark any` (default) takes every marked clip. Their start is the wall-clock time the phone
recorded (Blackmagic `dateRecorded`, else QuickTime `creationdate`, else `creation_time`).
Photos: `<stem>_Original.<ext>` (before) + `<stem>_Edited.<ext>` (after); capture time from EXIF
DateTimeOriginal. Both are compared as local wall-clock times (same place, same time zone).
The camera clock may differ from the phone's: `--offset auto` picks the shift that puts the most
photos inside the marked clips. Needs python3 and ffprobe only.
"""
import argparse, datetime as dt, glob, json, os, re, struct, subprocess, sys, zipfile
import xml.etree.ElementTree as ET

VIDEO_EXT = ('.mp4', '.mov', '.MP4', '.MOV')
PHOTO_RE = re.compile(r'^(?P<stem>.+)_(?P<kind>Original|Edited)\.(jpe?g|png|webp)$', re.I)

def probe(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration:format_tags',
                          '-show_entries', 'stream=width,height,codec_type:stream_side_data=rotation',
                          '-of', 'json', path], capture_output=True, text=True, check=True).stdout
    return json.loads(out)

def wall_clock(text):
    """'2026-11-15T16:47:56+0200' / '2026-11-15T14:47:56.000000Z' -> naive local datetime."""
    text = text.strip().replace('Z', '+0000')
    m = re.match(r'(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d)(?:\.\d+)?([+-]\d\d:?\d\d)?', text)
    if not m: return None
    local = dt.datetime.fromisoformat(m.group(1))
    if m.group(2) and m.group(2).replace(':', '') == '+0000' and 'creation_time' in WALL_SOURCE:
        # UTC: shift to this machine's zone (the shoot's zone is unknown here).
        local = local.replace(tzinfo=dt.timezone.utc).astimezone().replace(tzinfo=None)
    return local

WALL_SOURCE = set()

def clip_info(path):
    data = probe(path)
    tags = {k.lower(): v for k, v in data.get('format', {}).get('tags', {}).items()}
    start, source = None, None
    for key in ('com.blackmagic-design.camera.daterecorded', 'com.apple.quicktime.creationdate', 'creation_time'):
        if key in tags:
            WALL_SOURCE.clear(); WALL_SOURCE.add(key)
            start, source = wall_clock(tags[key]), key
            if start: break
    video = next((s for s in data.get('streams', []) if s.get('codec_type') == 'video'), {})
    name = os.path.basename(path)
    mark = re.match(r'^[^A-Za-z0-9]*', name).group(0)
    return {
        'path': path, 'name': name, 'mark': mark,
        'start': start.isoformat() if start else None, 'startSource': source,
        'duration': float(data.get('format', {}).get('duration', 0)),
        'width': video.get('width'), 'height': video.get('height'),
    }

def exif_datetime(path):
    """DateTimeOriginal (0x9003) from a JPEG's EXIF, as a naive datetime; None if absent."""
    with open(path, 'rb') as f:
        data = f.read(256 * 1024)
    i = data.find(b'Exif\x00\x00')
    if i < 0: return None
    tiff = data[i + 6:]
    endian = '<' if tiff[:2] == b'II' else '>'
    def ifd_entries(offset):
        count = struct.unpack(endian + 'H', tiff[offset:offset + 2])[0]
        for n in range(count):
            e = offset + 2 + n * 12
            tag, typ, cnt, val = struct.unpack(endian + 'HHII', tiff[e:e + 12])
            yield tag, typ, cnt, val
    ifd0 = struct.unpack(endian + 'I', tiff[4:8])[0]
    exif_ifd = next((val for tag, _, _, val in ifd_entries(ifd0) if tag == 0x8769), None)
    for ifd in [exif_ifd, ifd0]:
        if ifd is None: continue
        for tag, typ, cnt, val in ifd_entries(ifd):
            if tag in (0x9003, 0x0132):
                raw = tiff[val:val + 19].decode('ascii', 'ignore')
                try: return dt.datetime.strptime(raw, '%Y:%m:%d %H:%M:%S')
                except ValueError: pass
    return None

def photos_in(folder):
    pairs = {}
    for path in glob.glob(os.path.join(folder, '**', '*'), recursive=True):
        m = PHOTO_RE.match(os.path.basename(path))
        if m and not os.path.basename(path).startswith('._'):
            pairs.setdefault(m.group('stem'), {})[m.group('kind').lower()] = path
    out = []
    for stem, files in sorted(pairs.items()):
        before = files.get('original')
        taken = exif_datetime(before) if before else None
        out.append({'stem': stem, 'before': before, 'after': files.get('edited'),
                    'taken': taken.isoformat() if taken else None})
    return out

def read_looks(folder):
    """{photo stem: [look names]} from the first .xlsx with a 'Photo' column."""
    M = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
    for path in glob.glob(os.path.join(folder, '**', '*.xlsx'), recursive=True):
        if os.path.basename(path).startswith('._'): continue
        with zipfile.ZipFile(path) as z:
            shared = []
            if 'xl/sharedStrings.xml' in z.namelist():
                for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall(M + 'si'):
                    shared.append(''.join(t.text or '' for t in si.iter(M + 't')))
            rows = []
            for row in ET.fromstring(z.read('xl/worksheets/sheet1.xml')).iter(M + 'row'):
                cells = []
                for c in row.findall(M + 'c'):
                    v = c.find(M + 'v'); t = c.get('t')
                    if t == 'inlineStr': cells.append(''.join(x.text or '' for x in c.iter(M + 't')))
                    elif v is None: cells.append('')
                    else: cells.append(shared[int(v.text)] if t == 's' else v.text)
                rows.append(cells)
        if rows and rows[0] and rows[0][0].strip().lower() == 'photo':
            looks = {}
            for r in rows[1:]:
                if r and r[0]:
                    looks[r[0].strip()] = [x for x, h in zip(r[1:], rows[0][1:]) if x and h.lower().startswith('look')]
            return path, looks
    return None, {}

def seconds(iso): return dt.datetime.fromisoformat(iso).timestamp()

def matches(clips, photos, offset, margin):
    result = {}
    for c in clips:
        if not c['start']: continue
        s = seconds(c['start'])
        result[c['name']] = [
            {'stem': p['stem'], 'at': round(seconds(p['taken']) + offset - s, 1)}
            for p in photos if p['taken'] and s - margin <= seconds(p['taken']) + offset <= s + c['duration'] + margin
        ]
    return result

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('folder'); ap.add_argument('--mark', default='any')
    ap.add_argument('--offset', default='auto'); ap.add_argument('--margin', type=float, default=1.0)
    ap.add_argument('--json')
    args = ap.parse_args()
    clips = [clip_info(p) for p in sorted(glob.glob(os.path.join(args.folder, '**', '*'), recursive=True))
             if p.endswith(VIDEO_EXT) and not os.path.basename(p).startswith('._')]
    marked = [c for c in clips if (c['mark'] != '' if args.mark == 'any' else c['mark'] == args.mark)]
    photos = photos_in(args.folder)
    looks_path, looks = read_looks(args.folder)
    if args.offset == 'auto':
        def score(o):
            return sum(1 for v in matches(marked, photos, o, args.margin).values() if len(v) == 1)
        scores = {o: score(o) for o in range(-180, 181)}
        best = max(scores.values())
        # The middle of the best run: every offset there fits as many clips; its centre is safest.
        candidates = [o for o, s in scores.items() if s == best]
        runs, run = [], [candidates[0]]
        for o in candidates[1:]:
            if o == run[-1] + 1: run.append(o)
            else: runs.append(run); run = [o]
        runs.append(run)
        widest = max(runs, key=len)
        offset = widest[len(widest) // 2]
    else:
        offset = float(args.offset)
    found = matches(marked, photos, offset, args.margin)
    marks = sorted({c['mark'] or '(none)' for c in clips})
    print(f'clips: {len(clips)} (marks: {", ".join(marks)}), picked ({args.mark} mark): {len(marked)}; photo pairs: {len(photos)}')
    print(f'looks table: {looks_path or "none"} ({len(looks)} photos)')
    print(f'camera clock offset: {offset:+.0f} s (photo time + offset = phone time; refine on one clip by the shot frame)')
    # A photo matched to several clips: at most one of them is right.
    owners = {}
    for name, hits in found.items():
        for h in hits: owners.setdefault(h['stem'], []).append(name)
    for c in marked:
        hits = found.get(c['name'], [])
        desc = ', '.join(
            f"{h['stem']} @ {h['at']}s [{(looks.get(h['stem']) or ['?'])[0]}]"
            + (' (ALSO IN ' + ', '.join(n for n in owners[h['stem']] if n != c['name']) + ')' if len(owners[h['stem']]) > 1 else '')
            for h in hits) or 'no photo'
        if not hits and c['start']:
            # The nearest photo outside the clip: a hint for an offset off by a few seconds.
            s0 = seconds(c['start']); s1 = s0 + c['duration']
            near = min(((min(abs(seconds(p['taken']) + offset - s0), abs(seconds(p['taken']) + offset - s1)), p) for p in photos if p['taken']),
                       key=lambda x: x[0], default=None)
            if near and near[0] <= 30:
                at = round(seconds(near[1]['taken']) + offset - s0, 1)
                desc += f" (nearest: {near[1]['stem']} @ {at}s, {near[0]:.0f}s outside)"
        device = '' if c['startSource'] == 'com.blackmagic-design.camera.daterecorded' else f"  [other device: start from {c['startSource'] or 'nothing'}; confirm on frames]"
        print(f"  {c['name']:32} {c['duration']:5.1f}s {c['width']}x{c['height']}  -> {desc}{device}")
    if args.json:
        json.dump({'offset': offset, 'clips': clips, 'photos': photos, 'looks': looks, 'matches': found},
                  open(args.json, 'w'), indent=2)
        print(f'written: {args.json}')

if __name__ == '__main__':
    sys.exit(main())
