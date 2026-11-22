import { Injectable } from '@nestjs/common';
import type { MediaAssetEntity, MediaGroupEntity } from '@vgen/db';
import {
  LIBRARY_MEDIA_KINDS,
  MEDIA_GROUP_LIMIT,
  type CreateMediaGroupRequest,
  type MediaGroupDto,
  type UpdateMediaGroupRequest,
} from '@vgen/shared';
import { NotFoundError, ValidationFailedError } from '../common/errors.js';
import { MediaGroupsRepository } from './media-groups.repository.js';
import { toMediaDto } from './media.mapper.js';
import { MediaService } from './media.service.js';

/** Natural file-name order: "Screenshot 2" before "Screenshot 10". */
const byName = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

const isLibraryFile = (asset: MediaAssetEntity): boolean =>
  asset.role === 'upload' && (LIBRARY_MEDIA_KINDS as readonly string[]).includes(asset.kind);

/** Media groups: named sets of library files, used to fill a list slot (e.g. screenshots) in one go. */
@Injectable()
export class MediaGroupsService {
  constructor(
    private readonly repository: MediaGroupsRepository,
    private readonly media: MediaService,
  ) {}

  async list(): Promise<MediaGroupDto[]> {
    const groups = await this.repository.list();
    const assets = await this.assetsOf(groups.flatMap((entry) => entry.assetIds));
    return groups.map((entry) => this.toDto(entry.group, entry.assetIds, assets));
  }

  async get(id: string): Promise<MediaGroupDto> {
    const entry = await this.repository.find(id);
    if (!entry) throw new NotFoundError('Media group', id);
    return this.toDto(entry.group, entry.assetIds, await this.assetsOf(entry.assetIds));
  }

  async create(request: CreateMediaGroupRequest): Promise<MediaGroupDto> {
    await this.checkFiles(request.assetIds);
    const group = await this.repository.create(request.name, request.assetIds);
    return this.get(group.id);
  }

  async update(id: string, request: UpdateMediaGroupRequest): Promise<MediaGroupDto> {
    const entry = await this.repository.find(id);
    if (!entry) throw new NotFoundError('Media group', id);
    if (request.addIds?.length) {
      await this.checkFiles(request.addIds);
      const size = new Set(
        [...entry.assetIds, ...request.addIds].filter((assetId) => !request.removeIds?.includes(assetId)),
      ).size;
      if (size > MEDIA_GROUP_LIMIT) {
        throw new ValidationFailedError(`A group holds at most ${String(MEDIA_GROUP_LIMIT)} files`, [
          { path: 'addIds', message: `${String(size)} files` },
        ]);
      }
    }
    await this.repository.update(id, request);
    return this.get(id);
  }

  /** Deletes the group only; its files stay in the library. */
  async remove(id: string): Promise<void> {
    if (!(await this.repository.delete(id))) throw new NotFoundError('Media group', id);
  }

  /** Library photos / videos only (not render outputs, not music). */
  private async checkFiles(ids: readonly string[]): Promise<void> {
    const found = new Map((await this.media.findMany(ids)).map((asset) => [asset.id, asset]));
    const problems = ids.flatMap((id) => {
      const asset = found.get(id);
      if (!asset) return [{ path: 'assetIds', message: `Media "${id}" not found` }];
      return isLibraryFile(asset)
        ? []
        : [{ path: 'assetIds', message: `"${asset.originalName}" is not a library photo or video` }];
    });
    if (problems.length > 0) throw new ValidationFailedError('Some files cannot go into a group', problems);
  }

  private async assetsOf(ids: readonly string[]): Promise<Map<string, MediaAssetEntity>> {
    return new Map((await this.media.findMany([...new Set(ids)])).map((asset) => [asset.id, asset]));
  }

  private toDto(
    group: MediaGroupEntity,
    assetIds: readonly string[],
    assets: ReadonlyMap<string, MediaAssetEntity>,
  ): MediaGroupDto {
    const items = assetIds
      .flatMap((id) => {
        const asset = assets.get(id);
        return asset ? [asset] : [];
      })
      .sort((a, b) => byName.compare(a.originalName, b.originalName));
    return {
      id: group.id,
      name: group.name,
      items: items.map(toMediaDto),
      createdAt: group.createdAt.toISOString(),
      updatedAt: group.updatedAt.toISOString(),
    };
  }
}
