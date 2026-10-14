// Serves a directory's files to Chromium on loopback, like the worker's asset server
// (Range requests for audio/video, CORS for media fetched by the renderer).
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';

export interface StaticServer {
  readonly baseUrl: string;
  readonly close: () => void;
}

const MIME: Readonly<Record<string, string>> = {
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
};

export const serveDirectory = (root: string): Promise<StaticServer> =>
  new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const file = path.join(root, path.basename(decodeURIComponent(req.url ?? '')));
      stat(file)
        .then((info) => {
          const headers = {
            'content-type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
            'accept-ranges': 'bytes',
            'access-control-allow-origin': '*',
          };
          const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
          if (range) {
            const start = range[1] ? Number(range[1]) : Math.max(0, info.size - Number(range[2]));
            const end = range[1] && range[2] ? Math.min(Number(range[2]), info.size - 1) : info.size - 1;
            res.writeHead(206, {
              ...headers,
              'content-range': `bytes ${String(start)}-${String(end)}/${String(info.size)}`,
              'content-length': end - start + 1,
            });
            createReadStream(file, { start, end }).pipe(res);
            return;
          }
          res.writeHead(200, { ...headers, 'content-length': info.size });
          createReadStream(file).pipe(res);
        })
        .catch(() => {
          res.writeHead(404).end();
        });
    });
    server.listen(0, '127.0.0.1', () => {
      resolve({
        baseUrl: `http://127.0.0.1:${String((server.address() as AddressInfo).port)}`,
        close: () => {
          server.close();
        },
      });
    });
  });
