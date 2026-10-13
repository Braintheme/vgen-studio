import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
};

/**
 * Serves prepared job assets to the headless browser over loopback HTTP
 * (`file://` is blocked from http origins; data URIs are too heavy). Supports
 * Range requests for audio/video. Only files inside `root` are reachable.
 */
export class AssetServer {
  private server: http.Server | null = null;
  private port = 0;

  constructor(private readonly root: string) {}

  get baseUrl(): string {
    return `http://127.0.0.1:${this.port}`;
  }

  /** URL for a file inside the served root. */
  urlFor(filePath: string): string {
    const relative = path.relative(this.root, filePath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error(`Asset ${filePath} is outside the served directory`);
    }
    return `${this.baseUrl}/${relative.split(path.sep).map(encodeURIComponent).join('/')}`;
  }

  async start(): Promise<void> {
    this.server = http.createServer((req, res) => {
      void this.handle(req, res);
    });
    await new Promise<void>((resolve) => {
      this.server?.listen(0, '127.0.0.1', resolve);
    });
    this.port = (this.server.address() as AddressInfo).port;
  }

  async stop(): Promise<void> {
    const server = this.server;
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => {
          resolve();
        });
      });
    }
    this.server = null;
  }

  private async handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const urlPath = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
    const file = path.resolve(this.root, `.${urlPath}`);
    if (!file.startsWith(this.root + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    let size: number;
    try {
      const info = await stat(file);
      if (!info.isFile()) throw new Error('not a file');
      size = info.size;
    } catch {
      res.writeHead(404).end();
      return;
    }

    const headers = {
      'content-type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
      'accept-ranges': 'bytes',
      'access-control-allow-origin': '*',
    };
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
    if (range) {
      const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
      const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
      if (start >= size || start > end) {
        res.writeHead(416, { 'content-range': `bytes */${size}` }).end();
        return;
      }
      res.writeHead(206, {
        ...headers,
        'content-range': `bytes ${start}-${end}/${size}`,
        'content-length': end - start + 1,
      });
      createReadStream(file, { start, end }).pipe(res);
      return;
    }
    res.writeHead(200, { ...headers, 'content-length': size });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    createReadStream(file).pipe(res);
  }
}
