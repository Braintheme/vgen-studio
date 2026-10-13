import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AssetServer } from './asset-server.js';

describe('AssetServer', () => {
  let root: string;
  let server: AssetServer;

  beforeAll(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), 'vgen-assets-'));
    await mkdir(path.join(root, 'job-1'));
    await writeFile(path.join(root, 'job-1', 'music.mp3'), '0123456789');
    await writeFile(path.join(os.tmpdir(), 'vgen-outside.txt'), 'secret');
    server = new AssetServer(root);
    await server.start();
  });
  afterAll(async () => {
    await server.stop();
    await rm(root, { recursive: true, force: true });
  });

  it('serves files with content type and full body', async () => {
    const response = await fetch(server.urlFor(path.join(root, 'job-1', 'music.mp3')));
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('audio/mpeg');
    expect(await response.text()).toBe('0123456789');
  });

  it('honors byte ranges', async () => {
    const url = server.urlFor(path.join(root, 'job-1', 'music.mp3'));
    const partial = await fetch(url, { headers: { range: 'bytes=2-5' } });
    expect(partial.status).toBe(206);
    expect(partial.headers.get('content-range')).toBe('bytes 2-5/10');
    expect(await partial.text()).toBe('2345');
    const suffix = await fetch(url, { headers: { range: 'bytes=-3' } });
    expect(await suffix.text()).toBe('789');
    expect((await fetch(url, { headers: { range: 'bytes=50-' } })).status).toBe(416);
  });

  it('never serves files outside its root', async () => {
    expect((await fetch(`${server.baseUrl}/../vgen-outside.txt`)).status).not.toBe(200);
    // The URL parser collapses `%2e%2e`, so this one never even leaves the root.
    expect((await fetch(`${server.baseUrl}/%2e%2e/vgen-outside.txt`)).status).toBe(404);
    // An encoded slash survives URL parsing and must be rejected by the server itself.
    expect((await fetch(`${server.baseUrl}/..%2fvgen-outside.txt`)).status).toBe(403);
    expect((await fetch(`${server.baseUrl}/job-1/missing.jpg`)).status).toBe(404);
    expect(() => server.urlFor('/etc/passwd')).toThrow();
  });
});
