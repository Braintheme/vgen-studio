import type { MediaAssetEntity, ProjectEntity } from '@vgen/db';
import type { StylePresetDto } from '@vgen/shared';
import { describe, expect, it, vi } from 'vitest';
import { ValidationFailedError } from '../common/errors.js';
import type { MediaService } from '../media/media.service.js';
import type { PresetsService } from '../presets/presets.service.js';
import type { RendersService } from '../renders/renders.service.js';
import { createTestCatalog } from '../testing/catalog.js';
import type { ProjectsRepository } from './projects.repository.js';
import { ProjectsService } from './projects.service.js';

const BEFORE = '0b0d6c26-6d5a-4f43-9c8c-6a3f4cbbd8c1';
const AFTER = '2f1e5a4b-3c6d-4e7f-8a9b-0c1d2e3f4a5b';
const CLIP = '3a2b1c0d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';
const PRESET = '4b3c2d1e-5f6a-4b7c-8d9e-0f1a2b3c4d5e';
const P1 = '5c4d3e2f-6a7b-4c8d-9e0f-1a2b3c4d5e6f';
const P2 = '6d5e4f3a-7b8c-4d9e-8f0a-2b3c4d5e6f7a';

const asset = (id: string, kind: 'image' | 'video', name = `${id}.jpg`) =>
  ({
    id,
    kind,
    originalName: name,
    size: 10,
    meta: {},
    createdAt: new Date(),
  }) as unknown as MediaAssetEntity;

const preset = (overrides: Partial<StylePresetDto> = {}): StylePresetDto => ({
  id: PRESET,
  name: 'Moody',
  templateId: 'before-after',
  templateVersion: '1.0.0',
  props: {
    texts: { beforeLabel: { value: 'RAW' }, title: { value: 'content is never taken from presets' } },
  },
  isDefault: true,
  createdAt: '2026-11-22T10:00:00.000Z',
  updatedAt: '2026-11-22T10:00:00.000Z',
  ...overrides,
});

const projectEntity = (overrides: Partial<ProjectEntity> = {}): ProjectEntity => ({
  id: P1,
  name: 'Project',
  templateId: 'before-after',
  templateVersion: '0.9.0',
  settings: {},
  media: { before: BEFORE, after: AFTER },
  quality: 'social',
  scale: 1,
  presetId: null,
  createdAt: new Date('2026-11-22T10:00:00Z'),
  updatedAt: new Date('2026-11-22T10:00:00Z'),
  ...overrides,
});

const setup = (presets: StylePresetDto[] = [preset()]) => {
  const stored = new Map<string, ProjectEntity>();
  const repository = {
    create: vi.fn((project: Partial<ProjectEntity>) => {
      const created = projectEntity({ ...project, id: P1 });
      stored.set(created.id, created);
      return Promise.resolve(created);
    }),
    findById: vi.fn((id: string) => Promise.resolve(stored.get(id) ?? null)),
    findByIds: vi.fn((ids: readonly string[]) =>
      Promise.resolve(ids.flatMap((id) => (stored.has(id) ? [stored.get(id) as ProjectEntity] : []))),
    ),
    update: vi.fn(() => Promise.resolve()),
    delete: vi.fn((ids: readonly string[]) => Promise.resolve(ids.filter((id) => stored.has(id)))),
    lastRenders: vi.fn(() => Promise.resolve(new Map())),
  };
  const media = {
    findMany: vi.fn(() =>
      Promise.resolve([asset(BEFORE, 'image'), asset(AFTER, 'image'), asset(CLIP, 'video', 'clip.mp4')]),
    ),
  };
  const presetsService = {
    get: vi.fn((id: string) => {
      const found = presets.find((candidate) => candidate.id === id);
      return found ? Promise.resolve(found) : Promise.reject(new Error('not found'));
    }),
    list: vi.fn((templateId?: string) =>
      Promise.resolve(presets.filter((candidate) => candidate.templateId === templateId)),
    ),
  };
  const renders = { create: vi.fn() };
  const service = new ProjectsService(
    repository as unknown as ProjectsRepository,
    createTestCatalog(),
    media as unknown as MediaService,
    presetsService as unknown as PresetsService,
    renders as unknown as RendersService,
  );
  return { service, repository, renders, stored };
};

describe('ProjectsService.create', () => {
  it("starts from the template's default preset; the request's settings go on top", async () => {
    const { service, repository } = setup();
    const project = await service.create({
      templateId: 'before-after',
      settings: { texts: { title: { value: 'POV: they asked for the RAWs' } } },
      media: { before: BEFORE },
      quality: 'social',
      scale: 1,
    });
    const created = repository.create.mock.calls[0]?.[0];
    expect(created).toMatchObject({
      name: 'Moody',
      presetId: PRESET,
      templateVersion: createTestCatalog().getTemplate('before-after').version,
      media: { before: BEFORE, after: null },
    });
    expect(created?.settings).toMatchObject({
      texts: {
        beforeLabel: { value: 'RAW' },
        title: { value: 'POV: they asked for the RAWs' },
        afterLabel: { value: 'After' },
      },
    });
    expect(created?.settings).not.toHaveProperty('media');
    expect(project.id).toBe(P1);
  });

  it('starts from a given preset and takes its template', async () => {
    const { service, repository } = setup([preset({ isDefault: false })]);
    await service.create({ presetId: PRESET, name: 'Tatras', quality: 'social', scale: 1 });
    expect(repository.create.mock.calls[0]?.[0]).toMatchObject({
      name: 'Tatras',
      templateId: 'before-after',
    });
  });

  it('uses the template defaults and name without a default preset', async () => {
    const { service, repository } = setup([]);
    await service.create({ templateId: 'before-after', quality: 'social', scale: 1 });
    const created = repository.create.mock.calls[0]?.[0];
    expect(created).toMatchObject({
      presetId: null,
      name: createTestCatalog().getTemplate('before-after').name,
    });
    expect(created?.settings).toMatchObject({ texts: { beforeLabel: { value: 'Before' } } });
  });

  it('rejects settings that do not fit, naming the field', async () => {
    const { service } = setup([]);
    const result = service.create({
      templateId: 'before-after',
      settings: { texts: { beforeLabel: { value: 'x'.repeat(200) } } },
      quality: 'social',
      scale: 1,
    });
    await expect(result).rejects.toBeInstanceOf(ValidationFailedError);
    await expect(result).rejects.toMatchObject({
      details: [expect.objectContaining({ path: 'settings.texts.beforeLabel.value' })],
    });
  });

  it('rejects unknown slots, missing files and files of the wrong kind', async () => {
    const { service } = setup([]);
    const result = service.create({
      templateId: 'before-after',
      media: { before: CLIP, after: '7e6f5a4b-8c9d-4e0f-9a1b-3c4d5e6f7a8b', poster: BEFORE },
      quality: 'social',
      scale: 1,
    });
    const error: unknown = await result.catch((caught: unknown) => caught);
    const details = error instanceof ValidationFailedError ? (error.details ?? []) : [];
    const messageOf = (path: string) => details.find((detail) => detail.path === path)?.message;
    expect(messageOf('media.poster')).toContain('Unknown slot');
    expect(messageOf('media.before')).toContain('video');
    expect(messageOf('media.after')).toContain('not found');
  });
});

describe('ProjectsService.render', () => {
  it('queues every project it can and reports the others with the reason', async () => {
    const { service, renders, stored } = setup();
    stored.set(P1, projectEntity({ id: P1, settings: { format: '1:1' }, presetId: PRESET }));
    stored.set(P2, projectEntity({ id: P2, media: { before: BEFORE, after: null } }));
    const P3 = '8f7a6b5c-9d0e-4f1a-8b2c-4d5e6f7a8b9c';
    stored.set(P3, projectEntity({ id: P3 }));
    renders.create.mockImplementation((request: { projectId: string }) =>
      request.projectId === P3
        ? Promise.reject(
            new ValidationFailedError('Props do not match', [{ path: 'props.format', message: 'Bad' }]),
          )
        : Promise.resolve({ id: 'render-1' }),
    );
    const unknown = '7e6f5a4b-8c9d-4e0f-9a1b-3c4d5e6f7a8b';

    const result = await service.render([P1, P2, P3, unknown]);

    expect(renders.create).toHaveBeenCalledWith({
      templateId: 'before-after',
      props: { format: '1:1', media: { before: BEFORE, after: AFTER } },
      quality: 'social',
      scale: 1,
      presetId: PRESET,
      projectId: P1,
    });
    expect(result.queued).toEqual([{ projectId: P1, renderId: 'render-1' }]);
    expect(result.failed).toEqual([
      { projectId: P2, message: 'Missing media: After' },
      { projectId: P3, message: 'Props do not match: props.format: Bad' },
      { projectId: unknown, message: 'Project not found' },
    ]);
  });
});

describe('ProjectsService.update', () => {
  it('moves updatedAt and the template version on content changes only', async () => {
    const { service, repository, stored } = setup();
    stored.set(P1, projectEntity());

    await service.update(P1, { name: 'Renamed' });
    expect(repository.update).toHaveBeenLastCalledWith(P1, { name: 'Renamed' });

    await service.update(P1, { media: { before: AFTER, extra: BEFORE } });
    expect(repository.update).toHaveBeenLastCalledWith(P1, {
      media: { before: AFTER, after: null },
      updatedAt: expect.any(Date) as Date,
      templateVersion: createTestCatalog().getTemplate('before-after').version,
    });
  });
});

describe('ProjectsService.duplicate', () => {
  it('copies the content as it is, named "(copy)" unless a name is given', async () => {
    const { service, repository, stored } = setup();
    const settings = { texts: { title: { value: 'unfinished' } } };
    stored.set(P1, projectEntity({ name: 'Golden Lake', settings, presetId: PRESET, quality: 'high' }));

    await service.duplicate(P1);
    expect(repository.create).toHaveBeenLastCalledWith({
      name: 'Golden Lake (copy)',
      templateId: 'before-after',
      templateVersion: '0.9.0',
      settings,
      media: { before: BEFORE, after: AFTER },
      quality: 'high',
      scale: 1,
      presetId: PRESET,
    });
    // A deep copy: editing the copy never touches the source.
    expect(repository.create.mock.lastCall?.[0]?.settings).not.toBe(settings);

    await service.duplicate(P1, 'Golden Lake · v2');
    expect(repository.create.mock.lastCall?.[0]).toMatchObject({ name: 'Golden Lake · v2' });
  });
});
