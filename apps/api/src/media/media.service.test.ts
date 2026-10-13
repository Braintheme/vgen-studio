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
