// Serves a directory's files to Chromium on loopback, like the worker's asset server.
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
};

export const serveDirectory = (root: string): Promise<StaticServer> =>
  new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const file = path.join(root, path.basename(req.url ?? ''));
      stat(file)
        .then((info) => {
          res.writeHead(200, {
            'content-type': MIME[path.extname(file)] ?? 'application/octet-stream',
            'content-length': info.size,
          });
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
