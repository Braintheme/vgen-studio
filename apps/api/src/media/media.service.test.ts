import type { MediaAssetEntity } from '@vgen/db';
import type { StorageService } from '@vgen/storage';
import { QueryFailedError } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { ConflictError } from '../common/errors.js';
import type { MediaIngestService } from './media-ingest.service.js';
import type { MediaRepository } from './media.repository.js';
import { MediaService } from './media.service.js';

const asset = (overrides: Partial<MediaAssetEntity> = {}): MediaAssetEntity =>
  ({
    id: 'a1',
    kind: 'image',
    role: 'upload',
    storageKey: 'uploads/2026/10/a1.jpg',
    meta: { previewKey: 'derivatives/a1/preview.webp' },
    ...overrides,
  }) as MediaAssetEntity;

const setup = (entity: MediaAssetEntity) => {
  const repository = {
    findById: vi.fn(() => Promise.resolve(entity)),
    findByIds: vi.fn(() => Promise.resolve([entity])),
    delete: vi.fn(() => Promise.resolve()),
  };
  const storage = { delete: vi.fn(() => Promise.resolve()) };
  const service = new MediaService(
    storage as unknown as StorageService,
    repository as unknown as MediaRepository,
    {} as MediaIngestService,
  );
  return { service, repository, storage };
};

describe('MediaService deletion', () => {
  it('deletes an upload and its files (original + preview)', async () => {
    const { service, repository, storage } = setup(asset());
    await service.deleteUpload('a1');
    expect(repository.delete).toHaveBeenCalledWith('a1');
    expect(storage.delete.mock.calls.map((call) => (call as unknown[])[0])).toEqual([
      'uploads/2026/10/a1.jpg',
      'derivatives/a1/preview.webp',
    ]);
  });

  it.each(['23001', '23503'])('answers 409 when a music track references the file (pg %s)', async (code) => {
    const { service, repository, storage } = setup(asset({ kind: 'audio', meta: {} }));
    repository.delete.mockRejectedValueOnce(
      new QueryFailedError('DELETE', [], Object.assign(new Error('fk'), { code })),
    );
    await expect(service.deleteUpload('a1')).rejects.toBeInstanceOf(ConflictError);
    expect(storage.delete).not.toHaveBeenCalled();
  });

  it('never deletes render outputs through the uploads endpoint', async () => {
    const { service, repository } = setup(asset({ role: 'render_output' }));
    await expect(service.deleteUpload('a1')).rejects.toBeInstanceOf(ConflictError);
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it('deleteGenerated skips uploads', async () => {
    const { service, repository } = setup(asset());
    await service.deleteGenerated(['a1']);
    expect(repository.delete).not.toHaveBeenCalled();
  });
});

describe('MediaService library cleanup', () => {
  it('deletes several uploads and reports the ones that cannot go', async () => {
    const { service, repository } = setup(asset({ size: 1000 }));
    repository.findById
      .mockResolvedValueOnce(asset({ id: 'a1', size: 1000 }))
      .mockResolvedValueOnce(asset({ id: 'a1', size: 1000 }))
      .mockResolvedValueOnce(asset({ id: 'r1', role: 'render_output', size: 5 }))
      .mockResolvedValueOnce(asset({ id: 'r1', role: 'render_output', size: 5 }));
    const result = await service.deleteUploads(['a1', 'r1', 'a1']);
    expect(result.deleted).toEqual(['a1']);
    expect(result.failed.map((failure) => failure.id)).toEqual(['r1']);
    expect(result.freedBytes).toBe(1000);
  });

  it('only counts on a dry run, and passes the protected ids and the cut-off date on', async () => {
    const { service, repository } = setup(asset());
    const findUnused = vi.fn((_before: Date, _keep: readonly string[]) =>
      Promise.resolve([asset({ id: 'a1', size: 300 }), asset({ id: 'a2', size: 200 })]),
    );
    Object.assign(repository, { findUnused });
    const result = await service.cleanup({ olderThanDays: 14, keepIds: ['k1'], dryRun: true });
    expect(result).toEqual({ count: 2, bytes: 500, deleted: false });
    expect(repository.delete).not.toHaveBeenCalled();
    const [before, keep] = findUnused.mock.calls[0] ?? [];
    expect(keep).toEqual(['k1']);
    expect(Date.now() - (before?.getTime() ?? 0)).toBeGreaterThanOrEqual(14 * 24 * 3600 * 1000 - 1000);
  });
});
