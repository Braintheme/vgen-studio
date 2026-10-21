import type { MediaAssetEntity, RenderJobEntity } from '@vgen/db';
import { RENDER_STATUSES, type MediaInfo } from '@vgen/shared';
import { firstValueFrom, take, toArray } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { createTestCatalog } from '../testing/catalog.js';
import { ConflictError, NotFoundError, ValidationFailedError } from '../common/errors.js';
import type { MediaService } from '../media/media.service.js';
import type { MusicService } from '../music/music.service.js';
import type { PresetsService } from '../presets/presets.service.js';
import type { RenderQueueService } from '../queue/render-queue.service.js';
import type { RenderEventsService } from './render-events.service.js';
import type { RendersRepository } from './renders.repository.js';
import { RendersService } from './renders.service.js';

const BEFORE = '0b0d6c26-6d5a-4f43-9c8c-6a3f4cbbd8c1';
const AFTER = '2f1e5a4b-3c6d-4e7f-8a9b-0c1d2e3f4a5b';
const AUDIO = '3a2b1c0d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';

const image = (id: string, width = 4000, height = 6000) => ({
  assetId: id,
  kind: 'image' as const,
  mime: 'image/jpeg',
  width,
  height,
  durationSec: null,
});

const jobEntity = (overrides: Partial<RenderJobEntity> = {}): RenderJobEntity => ({
  id: '9f8e7d6c-5b4a-4c3d-8e2f-1a0b9c8d7e6f',
  status: 'queued',
  progress: 0,
  engine: 'remotion',
  engineVersion: null,
  templateId: 'before-after',
  templateVersion: '1.0.0',
  props: {},
  format: '9:16',
  quality: 'social',
  scale: 1,
  presetId: null,
  outputName: 'x.mp4',
  outputAssetId: null,
  slideAssetIds: [],
  thumbnailAssetId: null,
  error: null,
  attempts: 0,
  startedAt: null,
  finishedAt: null,
  createdAt: new Date('2026-10-12T10:00:00Z'),
  updatedAt: new Date('2026-10-12T10:00:00Z'),
  ...overrides,
});

const setup = (
  media: Map<string, MediaInfo> = new Map([
    [BEFORE, image(BEFORE)],
    [AFTER, image(AFTER)],
  ]),
) => {
  let saved: Partial<RenderJobEntity> = {};
  const repository = {
    create: vi.fn((job: Partial<RenderJobEntity>) => {
      saved = job;
      return Promise.resolve(jobEntity(job));
    }),
    findById: vi.fn(() => Promise.resolve(jobEntity({ props: saved.props ?? {} }))),
    markCancelled: vi.fn(() => Promise.resolve(true)),
    markEnqueueFailed: vi.fn(() => Promise.resolve()),
    deleteFinished: vi.fn(() => Promise.resolve(true)),
    list: vi.fn(),
  };
  const queue = {
    enqueue: vi.fn(() => Promise.resolve()),
    removeWaiting: vi.fn(() => Promise.resolve(true)),
    requestCancel: vi.fn(() => Promise.resolve()),
    publishEvent: vi.fn(() => Promise.resolve()),
  };
  const mediaService = {
    infoMap: vi.fn(() => Promise.resolve(media)),
    findMany: vi.fn(() => Promise.resolve([] as MediaAssetEntity[])),
    deleteGenerated: vi.fn(() => Promise.resolve()),
  };
  const music = {
    // A library with a default track unless a test says otherwise.
    resolveForRender: vi.fn((trackId: string | null): Promise<{ id: string } | null> =>
      Promise.resolve({ id: trackId ?? 'default-track' }),
    ),
  };
  const presets = { findName: vi.fn((id: string) => Promise.resolve(id === BEFORE ? 'Moody Film' : null)) };
  const service = new RendersService(
    repository as unknown as RendersRepository,
    createTestCatalog(),
    mediaService as unknown as MediaService,
    music as unknown as MusicService,
    presets as unknown as PresetsService,
    queue as unknown as RenderQueueService,
    {
      stream: vi.fn(() => ({ pipe: vi.fn() })),
      untilShutdown: <T>(source: T) => source,
    } as unknown as RenderEventsService,
  );
  return { service, repository, queue, mediaService, music, saved: () => saved };
};

const request = (props: Record<string, unknown>, extra: { presetId?: string | null } = {}) => ({
  templateId: 'before-after',
  props,
  quality: 'social' as const,
  scale: 1 as const,
  presetId: extra.presetId ?? null,
});

describe('RendersService.create', () => {
  it('stores a full props snapshot, enqueues with the job id and announces it', async () => {
    const { service, repository, queue, saved } = setup();
    const result = await service.create(
      request({ media: { before: BEFORE, after: AFTER }, format: '1:1' }, { presetId: BEFORE }),
    );

    expect(repository.create).toHaveBeenCalledOnce();
    const job = saved();
    expect(job).toMatchObject({
      status: 'queued',
      engine: 'remotion',
      templateId: 'before-after',
      templateVersion: createTestCatalog().getTemplate('before-after').version,
      format: '1:1',
    });
    expect(job.props).toMatchObject({ durationSec: 13, fps: 30, params: { revealEffect: 'diagonal-wipe' } });
    expect(job.outputName).toMatch(/^before-after_moody-film_1x1_\d{4}-\d{2}-\d{2}\.mp4$/);
    expect(queue.enqueue).toHaveBeenCalledWith('remotion', result.id);
    expect(queue.publishEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'status', status: 'queued' }),
    );
    expect(result.warnings).toEqual([]);
  });

  it('reports template media checks as warnings', async () => {
    const { service } = setup(
      new Map([
        [BEFORE, image(BEFORE, 4000, 6000)],
        [AFTER, image(AFTER, 3000, 4000)],
      ]),
    );
    const result = await service.create(request({ media: { before: BEFORE, after: AFTER } }));
    expect(result.warnings.map((warning) => warning.code)).toEqual(['ASPECT_MISMATCH']);
  });

  it('warns when music is on but there is no track to play', async () => {
    const { service, music } = setup();
    music.resolveForRender.mockResolvedValueOnce(null);
    const result = await service.create(request({ media: { before: BEFORE, after: AFTER } }));
    expect(result.warnings.map((warning) => warning.code)).toEqual(['NO_MUSIC']);

    const silent = await service.create(
      request({ media: { before: BEFORE, after: AFTER }, music: { enabled: false } }),
    );
    expect(silent.warnings).toEqual([]);
  });

  it('rejects unknown templates, invalid props and unusable media', async () => {
    const { service, queue } = setup(new Map([[AUDIO, { ...image(AUDIO), kind: 'audio' as const }]]));
    await expect(service.create({ ...request({}), templateId: 'nope' })).rejects.toBeInstanceOf(
      NotFoundError,
    );

    const invalid = service.create(request({ media: { before: BEFORE, after: AFTER }, durationSec: 99 }));
    await expect(invalid).rejects.toBeInstanceOf(ValidationFailedError);
    await expect(invalid).rejects.toMatchObject({
      details: [expect.objectContaining({ path: 'props.durationSec' })],
    });

    await expect(service.create(request({ media: { before: AUDIO, after: AFTER } }))).rejects.toMatchObject({
      details: [
        { path: 'props.media.before', message: 'Expected image, got audio' },
        { path: 'props.media.after', message: expect.stringContaining('not found') as string },
      ],
    });
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('rejects unknown presets', async () => {
    const { service } = setup();
    await expect(
      service.create(request({ media: { before: BEFORE, after: AFTER } }, { presetId: AFTER })),
    ).rejects.toMatchObject({ details: [{ path: 'presetId' }] });
  });

  it('marks the job failed when it cannot be enqueued', async () => {
    const { service, repository, queue } = setup();
    queue.enqueue.mockRejectedValueOnce(new Error('redis down'));
    await expect(service.create(request({ media: { before: BEFORE, after: AFTER } }))).rejects.toThrow(
      'redis down',
    );
    expect(repository.markEnqueueFailed).toHaveBeenCalledOnce();
  });
});

describe('RendersService.cancel', () => {
  it('flips the state first, then removes the queue job and signals workers', async () => {
    const { service, repository, queue } = setup();
    repository.findById.mockResolvedValue(jobEntity({ status: 'rendering' }));
    await service.cancel('id');
    expect(repository.markCancelled.mock.invocationCallOrder[0]).toBeLessThan(
      queue.removeWaiting.mock.invocationCallOrder[0] ?? 0,
    );
    expect(queue.requestCancel).toHaveBeenCalledWith('id');
  });

  it.each(RENDER_STATUSES.filter((status) => ['done', 'failed', 'cancelled'].includes(status)))(
    'refuses to cancel a %s render',
    async (status) => {
      const { service, repository, queue } = setup();
      repository.markCancelled.mockResolvedValue(false);
      repository.findById.mockResolvedValue(jobEntity({ status }));
      await expect(service.cancel('id')).rejects.toBeInstanceOf(ConflictError);
      expect(queue.requestCancel).not.toHaveBeenCalled();
    },
  );
});

describe('RendersService.watch', () => {
  it('starts with a status snapshot', async () => {
    const { service, repository } = setup();
    repository.findById.mockResolvedValue(jobEntity({ status: 'rendering', progress: 40 }));
    const { of } = await import('rxjs');
    (service as unknown as { events: { stream: () => unknown } }).events.stream = () => of();
    const [first] = await firstValueFrom(service.watch('id').pipe(take(1), toArray()));
    expect(first?.data).toMatchObject({ type: 'status', status: 'rendering', progress: 40 });
  });
});

describe('RendersService.remove', () => {
  it('deletes a finished render together with its output and thumbnail', async () => {
    const { service, repository, mediaService } = setup();
    repository.findById.mockResolvedValue(
      jobEntity({ status: 'done', outputAssetId: AFTER, thumbnailAssetId: BEFORE }),
    );
    await service.remove('id');
    expect(repository.deleteFinished).toHaveBeenCalledWith('id');
    expect(mediaService.deleteGenerated).toHaveBeenCalledWith([AFTER, BEFORE]);
  });

  it('refuses to delete an active render', async () => {
    const { service, repository, mediaService } = setup();
    repository.findById.mockResolvedValue(jobEntity({ status: 'rendering' }));
    repository.deleteFinished.mockResolvedValue(false);
    await expect(service.remove('id')).rejects.toBeInstanceOf(ConflictError);
    expect(mediaService.deleteGenerated).not.toHaveBeenCalled();
  });
});

describe('RendersService.duplicate', () => {
  it('fails clearly when media of the original render was deleted', async () => {
    const { service, repository, queue } = setup(new Map([[BEFORE, image(BEFORE)]]));
    repository.findById.mockResolvedValue(
      jobEntity({ status: 'done', props: { media: { before: BEFORE, after: AFTER } } }),
    );
    await expect(service.duplicate('id')).rejects.toMatchObject({
      code: 'CONFLICT',
      details: [{ path: 'props.media.after', message: `Media "${AFTER}" was deleted` }],
    });
    expect(queue.enqueue).not.toHaveBeenCalled();
  });
});
