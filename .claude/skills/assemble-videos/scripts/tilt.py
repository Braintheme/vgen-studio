#!/usr/bin/env python3
"""How much a clip's horizon leans, from the straight edges of the camera's screen image.

Usage: python3 -I tilt.py <clip> --box x0,y0,x1,y1 [--times 6,8,10] [--strips out.jpg]
  --box: the screen image (bright picture inside the dark bezel) in frame pixels as displayed
         (e.g. 820,1770,1540,2860 for a 2252x4000 portrait clip); find it on a sheet first.
Prints the lean of the top / left / right edges per time (+ = clockwise, i.e. "down to the right").
Straighten (`params.framing.tilt`) is the negative of the agreeing value. The bezel line is skewed
by perspective: trust the image edges. --strips renders the box's bottom edge at -0.5..-2.5° to
compare by eye.
"""
import argparse, math, statistics as st, subprocess, json

ap = argparse.ArgumentParser()
ap.add_argument('clip'); ap.add_argument('--box', required=True)
ap.add_argument('--times', default=''); ap.add_argument('--strips')
a = ap.parse_args()
x0, y0, x1, y1 = (int(v) for v in a.box.split(','))
info = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
                                  'format=duration', '-of', 'json', a.clip], capture_output=True, text=True, check=True).stdout)
duration = float(info['format']['duration'])
times = [float(t) for t in a.times.split(',')] if a.times else [duration * f for f in (0.4, 0.6, 0.8)]

def frame(t):
    # Decoded as displayed (rotation applied), grey.
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(t), '-i', a.clip, '-frames:v', '1', '-vf', 'format=gray',
                          '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], capture_output=True, check=True).stdout
    return raw

def dims(raw):
    # Width: the probe's displayed size; for rotated clips width/height swap.
    probe = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
                                       'stream=width,height:stream_side_data=rotation', '-of', 'json', a.clip],
                                      capture_output=True, text=True, check=True).stdout)['streams'][0]
    w, h = probe['width'], probe['height']
    rot = abs(int(next((d.get('rotation', 0) for d in probe.get('side_data_list', []) if 'rotation' in d), 0)))
    return (h, w) if rot in (90, 270) else (w, h)

def fit(points):  # v = a*u + b
    n = len(points); su = sum(p[0] for p in points); sv = sum(p[1] for p in points)
    suu = sum(p[0] ** 2 for p in points); suv = sum(p[0] * p[1] for p in points)
    return (n * suv - su * sv) / (n * suu - su * su)

def robust(points):
    k = fit(points); b = st.mean(p[1] - k * p[0] for p in points)
    inliers = [p for p in points if abs(p[1] - (k * p[0] + b)) < 4]
    return (fit(inliers), len(inliers)) if len(inliers) >= 10 else (k, len(points))

W = H = None
for t in times:
    raw = frame(t)
    if W is None: W, H = dims(raw)
    px = lambda x, y: raw[y * W + x]
    m = 60  # search band around the box edges
    top = []
    for x in range(x0 + 40, x1 - 40, 8):
        for y in range(max(6, y0 - m), y0 + m):
            if px(x, y) > 90 and px(x, y - 6) < 45: top.append((x, y)); break
    left, right = [], []
    for y in range(y0 + 60, y1 - 60, 8):
        for x in range(max(6, x0 - m), x0 + m):
            if px(x, y) > 90 and px(x - 6, y) < 45: left.append((y, x)); break
        for x in range(min(W - 7, x1 + m), x1 - m, -1):
            if px(x, y) > 90 and px(x + 6, y) < 45: right.append((y, x)); break
    parts = []
    for name, pts, sign in (('top', top, 1), ('left', left, -1), ('right', right, -1)):
        if len(pts) < 12: parts.append(f'{name} n/a'); continue
        k, n = robust(pts)
        parts.append(f'{name} {sign * math.degrees(math.atan(k)):+.2f}° ({n} pts)')
    print(f't={t:.1f}s: ' + '  '.join(parts))

if a.strips:
    t = times[len(times) // 2]
    angles = [0, -0.5, -1, -1.5, -2, -2.5]
    cw, ch = x1 - x0 + 120, 160
    parts, labels = [], []
    for i, ang in enumerate(angles):
        rot = f'rotate={ang}*PI/180,' if ang else ''
        parts.append(f"[s{i}]{rot}crop={cw}:{ch}:{x0 - 60}:{y1 - ch // 2},drawtext=text='{ang}':x=8:y=8:fontsize=32:fontcolor=yellow[o{i}]")
        labels.append(f'[o{i}]')
    graph = f"[0]split={len(angles)}" + ''.join(f'[s{i}]' for i in range(len(angles))) + ';' + ';'.join(parts) + ';' + \
            ''.join(labels) + f'vstack={len(angles)},drawgrid=w={cw}:h=20:t=1:c=red@0.7'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(t), '-i', a.clip, '-frames:v', '1', '-filter_complex', graph, a.strips], check=True)
    print(f'strips: {a.strips} (bottom edge at {", ".join(map(str, angles))}°)')
