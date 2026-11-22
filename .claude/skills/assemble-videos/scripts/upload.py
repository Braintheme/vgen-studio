#!/usr/bin/env python3
"""Upload files to the vgen media library, skipping the ones already there (same name and size).

Usage: python3 -I upload.py <file>... [--api http://localhost:3800/api/v1]
Prints a JSON object {path: asset id}. Several files go in one request (videos get their proxy,
poster and filmstrip in the background).
"""
import argparse, json, os, subprocess, sys, urllib.request

ap = argparse.ArgumentParser()
ap.add_argument('files', nargs='+'); ap.add_argument('--api', default='http://localhost:3800/api/v1')
a = ap.parse_args()

def library():
    items, page = [], 1
    while True:
        with urllib.request.urlopen(f'{a.api}/media?pageSize=100&page={page}') as r:
            data = json.load(r)
        items += data['items']
        if page * data['pageSize'] >= data['total']: return items
        page += 1

known = {(i['originalName'], i['size']): i['id'] for i in library()}
result, todo = {}, []
for path in a.files:
    key = (os.path.basename(path), os.path.getsize(path))
    if key in known: result[path] = known[key]
    else: todo.append(path)

MIME = {'.mp4': 'video/mp4', '.mov': 'video/quicktime', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.png': 'image/png', '.webp': 'image/webp'}
BATCH = 10  # the API takes at most 10 files per request (MAX_UPLOAD_FILES_PER_REQUEST)
for start in range(0, len(todo), BATCH):
    batch = todo[start:start + BATCH]
    # curl: multipart with real file names (the library shows them); no shell involved.
    args = ['curl', '-s', '-m', '1800', '-X', 'POST', f'{a.api}/media']
    for path in batch:
        args += ['-F', f'files=@{path};type={MIME.get(os.path.splitext(path)[1].lower(), "application/octet-stream")}']
    out = json.loads(subprocess.run(args, capture_output=True, text=True, check=True).stdout)
    if isinstance(out, dict):
        sys.exit(f'upload failed: {out}')
    by_name = {asset['originalName']: asset['id'] for asset in out}
    for path in batch:
        result[path] = by_name[os.path.basename(path)]
print(json.dumps(result, indent=2))
print(f'uploaded {len(todo)}, already in the library {len(a.files) - len(todo)}', file=sys.stderr)
