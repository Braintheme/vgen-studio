#!/usr/bin/env python3
"""Contact sheet of a clip, with the clip's own timestamps on every tile.

Usage: python3 -I sheet.py <clip> <out.jpg> [--from 0] [--to <end>] [--fps 1] [--cols 8]
                          [--crop x,y,w,h]   (fractions of the frame, e.g. the camera's screen)
                          [--width 300]      (tile width in px)
Whole clip at 1 fps first (story, hook, where the screen is); then the screen region at 4-6 fps
around the expected shot (blue AF square, remaining-shots counter dropping).
"""
import argparse, math, subprocess, json

ap = argparse.ArgumentParser()
ap.add_argument('clip'); ap.add_argument('out')
ap.add_argument('--from', dest='start', type=float, default=0.0); ap.add_argument('--to', type=float)
ap.add_argument('--fps', type=float, default=1.0); ap.add_argument('--cols', type=int, default=8)
ap.add_argument('--crop'); ap.add_argument('--width', type=int, default=300)
a = ap.parse_args()

duration = float(json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'json', a.clip],
                                           capture_output=True, text=True, check=True).stdout)['format']['duration'])
end = min(a.to or duration, duration)
frames = max(1, math.ceil((end - a.start) * a.fps))
rows = math.ceil(frames / a.cols)
filters = [f'fps={a.fps}']
if a.crop:
    x, y, w, h = (float(v) for v in a.crop.split(','))
    filters.append(f'crop=iw*{w}:ih*{h}:iw*{x}:ih*{y}')
filters += [f'scale={a.width}:-2',
            # %{pts:hms:OFFSET}: the clip's time, not the cut's.
            f"drawtext=text='%{{pts\\:hms\\:{a.start}}}':x=4:y=4:fontsize={max(12, a.width // 16)}:fontcolor=white:box=1:boxcolor=black@0.6",
            f'tile={a.cols}x{rows}']
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(a.start), '-to', str(end), '-i', a.clip,
                '-vf', ','.join(filters), '-frames:v', '1', a.out], check=True)
print(f'{a.out}: {frames} tiles, {a.cols}x{rows}, {a.start:.2f}-{end:.2f}s at {a.fps} fps')
