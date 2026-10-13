import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LocalStorageService } from './local-storage.js';
import { StorageKeyError } from './storage.js';

const text = async (stream: Readable): Promise<string> => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk as Buffer));
  return Buffer.concat(chunks).toString('utf8');
};

describe('LocalStorageService', () => {
  let root: string;
  let storage: LocalStorageService;

  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), 'vgen-storage-'));
    storage = new LocalStorageService(root);
  });
  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('stores buffers, streams and files under nested keys', async () => {
    expect(await storage.put('a/b/one.txt', Buffer.from('hello'))).toEqual({ key: 'a/b/one.txt', size: 5 });
    await storage.put('a/two.txt', Readable.from(['str', 'eam']));
    const source = path.join(root, 'source.txt');
    await writeFile(source, 'file');
    await storage.putFile('c/three.txt', source);

    expect(await text(await storage.read('a/b/one.txt'))).toBe('hello');
    expect(await text(await storage.read('a/two.txt'))).toBe('stream');
    expect(await readFile(path.join(root, 'c', 'three.txt'), 'utf8')).toBe('file');
  });

  it('reads byte ranges and downloads to a file', async () => {
    await storage.put('x.txt', Buffer.from('0123456789'));
    expect(await text(await storage.read('x.txt', { start: 2, end: 5 }))).toBe('2345');
    const target = path.join(root, 'out', 'copy.txt');
    await storage.downloadTo('x.txt', target);
    expect(await readFile(target, 'utf8')).toBe('0123456789');
  });

  it('reports missing objects and deletes idempotently', async () => {
    expect(await storage.stat('missing.txt')).toBeNull();
    await storage.put('y.txt', Buffer.from('y'));
    await storage.delete('y.txt');
    await storage.delete('y.txt');
    expect(await storage.stat('y.txt')).toBeNull();
  });

  it('prunes directories that become empty, but never the root', async () => {
    await storage.put('renders/job-1/out.mp4', Buffer.from('x'));
    await storage.put('renders/job-2/out.mp4', Buffer.from('y'));
    await storage.delete('renders/job-1/out.mp4');
    const { readdir } = await import('node:fs/promises');
    expect(await readdir(path.join(root, 'renders'))).toEqual(['job-2']);
    await storage.delete('renders/job-2/out.mp4');
    expect(await readdir(root)).toEqual([]);
  });

  it('rejects keys that could escape the root', async () => {
    for (const key of ['../etc/passwd', '/abs', 'a/../b', 'a//b', '', 'a/./b']) {
      await expect(storage.put(key, Buffer.from('x'))).rejects.toThrow(StorageKeyError);
    }
  });
});
