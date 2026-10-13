import { createReadStream, createWriteStream } from 'node:fs';
import { copyFile, mkdir, rename, rm, rmdir, stat } from 'node:fs/promises';
import path from 'node:path';
import type { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { randomUUID } from 'node:crypto';
import { assertValidKey, type ByteRange, type StorageService, type StoredObject } from './storage.js';

/** StorageService backed by a local directory (the shared `media` Docker volume). */
export class LocalStorageService implements StorageService {
  constructor(private readonly root: string) {}

  private resolve(key: string): string {
    assertValidKey(key);
    return path.join(this.root, ...key.split('/'));
  }

  /** Writes go to a temp file first and are renamed into place (atomic for readers). */
  private async atomicWrite(key: string, write: (tempPath: string) => Promise<void>): Promise<StoredObject> {
    const target = this.resolve(key);
    await mkdir(path.dirname(target), { recursive: true });
    const temp = `${target}.${randomUUID()}.partial`;
    try {
      await write(temp);
      await rename(temp, target);
    } catch (error) {
      await rm(temp, { force: true });
      throw error;
    }
    const info = await stat(target);
    return { key, size: info.size };
  }

  put(key: string, source: Readable | Buffer): Promise<StoredObject> {
    return this.atomicWrite(key, async (temp) => {
      if (Buffer.isBuffer(source)) {
        const stream = createWriteStream(temp);
        await new Promise<void>((resolve, reject) => {
          stream.on('error', reject);
          stream.end(source, resolve);
        });
        return;
      }
      await pipeline(source, createWriteStream(temp));
    });
  }

  putFile(key: string, filePath: string): Promise<StoredObject> {
    return this.atomicWrite(key, (temp) => copyFile(filePath, temp));
  }

  async read(key: string, range?: ByteRange): Promise<Readable> {
    const file = this.resolve(key);
    await stat(file);
    return createReadStream(file, range ? { start: range.start, end: range.end } : undefined);
  }

  async downloadTo(key: string, filePath: string): Promise<void> {
    await mkdir(path.dirname(filePath), { recursive: true });
    await copyFile(this.resolve(key), filePath);
  }

  async stat(key: string): Promise<StoredObject | null> {
    try {
      const info = await stat(this.resolve(key));
      return info.isFile() ? { key, size: info.size } : null;
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    const file = this.resolve(key);
    await rm(file, { force: true });
    // Prune directories left empty (e.g. renders/<jobId>/); object stores have no directories.
    let dir = path.dirname(file);
    while (dir.startsWith(this.root + path.sep)) {
      try {
        await rmdir(dir);
      } catch {
        break;
      }
      dir = path.dirname(dir);
    }
  }
}
