import type { Readable } from 'node:stream';

export interface StoredObject {
  readonly key: string;
  readonly size: number;
}

/** Inclusive byte range, as in HTTP `Range: bytes=start-end`. */
export interface ByteRange {
  readonly start: number;
  readonly end: number;
}

/**
 * Port for binary object storage. Everything outside the storage layer refers to
 * files by `key` (e.g. `uploads/2026/10/<uuid>.jpg`), never by absolute path, so a
 * local volume can later be swapped for S3/MinIO without data migrations.
 */
export interface StorageService {
  put(key: string, source: Readable | Buffer): Promise<StoredObject>;
  putFile(key: string, filePath: string): Promise<StoredObject>;
  read(key: string, range?: ByteRange): Promise<Readable>;
  downloadTo(key: string, filePath: string): Promise<void>;
  stat(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
}

export class StorageKeyError extends Error {}

const KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*(?:\/[A-Za-z0-9][A-Za-z0-9._-]*)*$/;

/** Keys are relative, slash-separated, without `..` segments or leading slashes. */
export const assertValidKey = (key: string): void => {
  if (!KEY_PATTERN.test(key) || key.split('/').some((segment) => segment === '..' || segment === '.')) {
    throw new StorageKeyError(`Invalid storage key: "${key}"`);
  }
};
