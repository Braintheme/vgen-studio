import type { MediaAssetEntity, MusicTrackEntity } from '@vgen/db';
import { describe, expect, it, vi } from 'vitest';
import { ConflictError, ValidationFailedError } from '../common/errors.js';
import type { MediaService } from '../media/media.service.js';
import type { PresetsService } from '../presets/presets.service.js';
import type { MusicRepository } from './music.repository.js';
import { MusicService } from './music.service.js';

const audio = {
  id: 'a1',
  kind: 'audio',
  role: 'upload',
  durationSec: 42,
  meta: { peaksKey: 'derivatives/a1/peaks.json' },
  createdAt: new Date(),
} as unknown as MediaAssetEntity;

const setup = () => {
  const repository = {
    findByAsset: vi.fn(() => Promise.resolve(null as MusicTrackEntity | null)),
    hasDefault: vi.fn(() => Promise.resolve(false)),
    save: vi.fn((track: Partial<MusicTrackEntity>) =>
      Promise.resolve({ id: 't1', createdAt: new Date(), ...track } as MusicTrackEntity),
    ),
    findById: vi.fn(() =>
      Promise.resolve({ id: 't1', assetId: 'a1', createdAt: new Date() } as MusicTrackEntity),
    ),
    delete: vi.fn(() => Promise.resolve()),
  };
  const media = {
    requireUploadedAudio: vi.fn(() => Promise.resolve(audio)),
    deleteUpload: vi.fn(() => Promise.resolve()),
    findMany: vi.fn(() => Promise.resolve([audio])),
  };
  const presets = { countByTrack: vi.fn(() => Promise.resolve(new Map([['t1', 2]]))) };
  return {
    repository,
    media,
    presets,
    service: new MusicService(
      repository as unknown as MusicRepository,
      media as unknown as MediaService,
      presets as unknown as PresetsService,
    ),
  };
};

describe('MusicService', () => {
  it('registers uploaded audio as a track; the first one becomes the default', async () => {
    const { service } = setup();
    const track = await service.create({ assetId: 'a1', title: 'Summer' });
    expect(track).toMatchObject({
      title: 'Summer',
      durationSec: 42,
      isDefault: true,
      peaksUrl: '/api/v1/media/a1/file?variant=peaks',
    });
  });

  it('refuses non-audio files and duplicates', async () => {
    const { service, media, repository } = setup();
    media.requireUploadedAudio.mockRejectedValueOnce(new ValidationFailedError('Not an uploaded audio file'));
    await expect(service.create({ assetId: 'img', title: 'X' })).rejects.toBeInstanceOf(
      ValidationFailedError,
    );
    repository.findByAsset.mockResolvedValueOnce({ id: 'other' } as MusicTrackEntity);
    await expect(service.create({ assetId: 'a1', title: 'X' })).rejects.toBeInstanceOf(ConflictError);
  });

  it('reports how many presets use a track', async () => {
    const { service } = setup();
    await expect(service.get('t1')).resolves.toMatchObject({ id: 't1', presetCount: 2 });
  });

  it('deletes the track before its file (the file is protected while referenced)', async () => {
    const { service, repository, media } = setup();
    await service.remove('t1');
    expect(repository.delete.mock.invocationCallOrder[0]).toBeLessThan(
      media.deleteUpload.mock.invocationCallOrder[0] ?? 0,
    );
    expect(media.deleteUpload).toHaveBeenCalledWith('a1');
  });
});
