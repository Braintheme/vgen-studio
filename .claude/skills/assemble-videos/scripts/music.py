#!/usr/bin/env python3
"""The music library for a batch: songs (not sound effects), how often each is already used in
projects, and good places to start each one.

Usage: python3 -I music.py [--video-sec 30] [--api http://localhost:3800/api/v1]
A good start is where the song lifts: the next seconds are clearly louder than the ones before
(a verse kicking in, a chorus, a drop) — from the track's waveform peaks. The start leaves at least
`--video-sec` of the song after it, so the video does not loop the track.
"""
import argparse, json, re, statistics as st, urllib.request

ap = argparse.ArgumentParser()
ap.add_argument('--video-sec', type=float, default=30.0)
ap.add_argument('--api', default='http://localhost:3800/api/v1')
a = ap.parse_args()
ORIGIN = a.api.split('/api/')[0]

def get(url):
    with urllib.request.urlopen(url if url.startswith('http') else ORIGIN + url) as response:
        return json.load(response)

tracks = get(f'{a.api}/music')
# Songs only: sound effects and short clips live in the same library.
songs, seen = [], set()
for track in sorted(tracks, key=lambda t: t['createdAt']):
    key = re.sub(r'\W+', ' ', track['title']).strip().lower()
    if track['durationSec'] >= 60 and key not in seen:
        seen.add(key)
        songs.append(track)

usage = {}
page = 1
while True:
    data = get(f'{a.api}/projects?pageSize=100&page={page}')
    for project in data['items']:
        track_id = (project['settings'].get('music') or {}).get('trackId')
        if track_id: usage[track_id] = usage.get(track_id, 0) + 1
    if page * data['pageSize'] >= data['total']: break
    page += 1

def starts(track):
    peaks = get(track['peaksUrl'])
    values, duration = peaks['peaks'], peaks['durationSec']
    step = duration / len(values)
    window = max(1, round(4 / step))  # 4 s before vs 4 s after
    floor = st.median(values)
    lifts, loud = [], []
    for i in range(window, len(values) - window):
        t = i * step
        if t < 3 or t > duration - a.video_sec: continue
        before = st.mean(values[i - window:i]); after = st.mean(values[i:i + window])
        if after > floor * 0.9: lifts.append((after / max(before, 0.02), t))
        loud.append((after, t))
    def pick(ranked, min_score):
        chosen = []
        for score, t in sorted(ranked, reverse=True):
            if score < min_score: break
            if all(abs(t - c) > 15 for c in chosen): chosen.append(t)
            if len(chosen) == 3: break
        return chosen
    # Clear lifts first; an even song: its loudest stretches.
    chosen = pick(lifts, 1.25) or pick(lifts, 1.1) or pick(loud, 0)
    return sorted(round(t, 1) for t in chosen) or [0.0]

print(f'songs: {len(songs)} of {len(tracks)} tracks (shorter ones are sound effects)')
for track in sorted(songs, key=lambda t: (usage.get(t['id'], 0), t['title'].lower())):
    flag = ' (library default)' if track['isDefault'] else ''
    print(f"{track['id']}  {track['title'][:44]:44} {track['durationSec']:6.1f}s  in {usage.get(track['id'], 0)} projects  "
          f"starts: {', '.join(str(s) for s in starts(track))}{flag}")
