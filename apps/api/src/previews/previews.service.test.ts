import type { MediaInfo } from '@vgen/shared';
import type { StorageService } from '@vgen/storage';
import { describe, expect, it, vi } from 'vitest';
import { RenderFailedError, ValidationFailedError, WorkerUnavailableError } from '../common/errors.js';
import type { MediaService } from '../media/media.service.js';
import { PreviewTimeoutError, type RenderQueueService } from '../queue/render-queue.service.js';
import { createTestCatalog } from '../testing/catalog.js';
import { PreviewsService } from './previews.service.js';

const PHOTO = '00000000-0000-4000-8000-000000000001';
const request = { templateId: 'test-card', props: { media: { photo: PHOTO } } };

const setup = (cached: boolean) => {
  const storage = { stat: vi.fn(() => Promise.resolve(cached ? { size: 10 } : null)) };
  const queue = { renderPreview: vi.fn(() => Promise.resolve()) };
  const media = {
    infoMap: vi.fn((ids: readonly string[]) =>
      Promise.resolve(
        new Map(ids.filter((id) => id === PHOTO).map((id) => [id, { assetId: id } as MediaInfo])),
      ),
    ),
  };
  const service = new PreviewsService(
    createTestCatalog(),
    media as unknown as MediaService,
    queue as unknown as RenderQueueService,
    storage as unknown as StorageService,
  );
  return { service, queue };
};

describe('PreviewsService', () => {
  it('renders the poster frame once, without music, and reuses it by content hash', async () => {
    const { service, queue } = setup(false);
    const first = await service.create(request);
    expect(first).toMatchObject({ frame: 60, width: 1080, height: 1920 });
    expect(first.url).toMatch(/^\/api\/v1\/previews\/[a-f0-9]{64}$/);
    const [engine, , payload] = queue.renderPreview.mock.calls[0] as unknown as [
      string,
      string,
      { props: { music: { enabled: boolean } } },
    ];
    expect(engine).toBe('fake');
    expect(payload.props.music.enabled).toBe(false);

    const again = await setup(true).service.create(request);
    expect(again.url).toBe(first.url);
  });

  it('rejects deleted media and maps worker problems to clear errors', async () => {
    const { service, queue } = setup(false);
    const deleted = {
      templateId: 'test-card',
      props: { media: { photo: '00000000-0000-4000-8000-000000000002' } },
    };
    await expect(service.create(deleted)).rejects.toBeInstanceOf(ValidationFailedError);

    queue.renderPreview.mockRejectedValueOnce(new PreviewTimeoutError());
    await expect(service.create(request)).rejects.toBeInstanceOf(WorkerUnavailableError);
    queue.renderPreview.mockRejectedValueOnce(new Error('ffmpeg exited with code 1'));
    await expect(service.create(request)).rejects.toBeInstanceOf(RenderFailedError);
  });
});
