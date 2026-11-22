import type { MediaAssetEntity } from '@vgen/db';
import { describe, expect, it, vi } from 'vitest';
import { NotFoundError, ValidationFailedError } from '../common/errors.js';
import type { MediaGroupsRepository } from './media-groups.repository.js';
import { MediaGroupsService } from './media-groups.service.js';
import type { MediaService } from './media.service.js';

const G = '9f8e7d6c-5b4a-4c3d-8e2f-1a0b9c8d7e6f';
const id = (n: number) => `0b0d6c26-6d5a-4f43-9c8c-6a3f4cbbd8${String(n).padStart(2, '0')}`;

const asset = (n: number, name: string, overrides: Partial<MediaAssetEntity> = {}) =>
  ({
    id: id(n),
    kind: 'image',
    role: 'upload',
    originalName: name,
    mime: 'image/png',
    size: 10,
    width: 1,
    height: 1,
    durationSec: null,
    meta: {},
    createdAt: new Date('2026-11-22T10:00:00Z'),
    ...overrides,
  }) as MediaAssetEntity;

const group = { id: G, name: 'Vintage preset', createdAt: new Date(), updatedAt: new Date() };

const setup = (assets: MediaAssetEntity[], assetIds: string[] = []) => {
  const repository = {
    find: vi.fn(() => Promise.resolve({ group, assetIds })),
    create: vi.fn(() => Promise.resolve(group)),
    update: vi.fn(() => Promise.resolve()),
    delete: vi.fn(() => Promise.resolve(false)),
  };
  const media = {
    findMany: vi.fn((ids: readonly string[]) => Promise.resolve(assets.filter((a) => ids.includes(a.id)))),
  };
  const service = new MediaGroupsService(
    repository as unknown as MediaGroupsRepository,
    media as unknown as MediaService,
  );
  return { service, repository };
};

describe('MediaGroupsService', () => {
  it('lists a group in natural file-name order', async () => {
    const files = [asset(1, 'Screenshot 10.png'), asset(2, 'Screenshot 2.png'), asset(3, 'screenshot 1.png')];
    const { service } = setup(files, [id(1), id(2), id(3)]);
    const dto = await service.get(G);
    expect(dto.items.map((item) => item.originalName)).toEqual([
      'screenshot 1.png',
      'Screenshot 2.png',
      'Screenshot 10.png',
    ]);
  });

  it('takes library photos and videos only', async () => {
    const files = [asset(1, 'a.png'), asset(2, 'out.mp4', { kind: 'video', role: 'render_output' })];
    const { service, repository } = setup(files);
    await expect(service.create({ name: 'x', assetIds: [id(1), id(2), id(3)] })).rejects.toBeInstanceOf(
      ValidationFailedError,
    );
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('caps a group at its limit when files are added', async () => {
    const many = Array.from({ length: 60 }, (_, n) => asset(n, `${String(n)}.png`));
    const { service } = setup(
      many,
      many.slice(0, 50).map((a) => a.id),
    );
    const extra = Array.from({ length: 51 }, (_, n) => asset(n + 60, `${String(n + 60)}.png`));
    const { service: full } = setup(
      [...many, ...extra],
      many.map((a) => a.id),
    );
    await expect(service.update(G, { addIds: many.slice(50).map((a) => a.id) })).resolves.toBeDefined();
    await expect(full.update(G, { addIds: extra.map((a) => a.id) })).rejects.toBeInstanceOf(
      ValidationFailedError,
    );
  });

  it('says when the group is gone', async () => {
    const { service } = setup([]);
    await expect(service.remove(G)).rejects.toBeInstanceOf(NotFoundError);
  });
});
