import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MediaGroupEntity, MediaGroupItemEntity } from '@vgen/db';
import { DataSource, In, Repository } from 'typeorm';

@Injectable()
export class MediaGroupsRepository {
  constructor(
    @InjectRepository(MediaGroupEntity) private readonly groups: Repository<MediaGroupEntity>,
    @InjectRepository(MediaGroupItemEntity) private readonly items: Repository<MediaGroupItemEntity>,
    private readonly dataSource: DataSource,
  ) {}

  /** Every group, newest first, with its asset ids. */
  async list(): Promise<{ group: MediaGroupEntity; assetIds: string[] }[]> {
    const groups = await this.groups.find({ order: { createdAt: 'DESC' } });
    const items =
      groups.length > 0 ? await this.items.findBy({ groupId: In(groups.map((group) => group.id)) }) : [];
    return groups.map((group) => ({
      group,
      assetIds: items.filter((item) => item.groupId === group.id).map((item) => item.assetId),
    }));
  }

  async find(id: string): Promise<{ group: MediaGroupEntity; assetIds: string[] } | null> {
    const group = await this.groups.findOneBy({ id });
    if (!group) return null;
    const items = await this.items.findBy({ groupId: id });
    return { group, assetIds: items.map((item) => item.assetId) };
  }

  /** A group with its files, in one transaction. */
  create(name: string, assetIds: readonly string[]): Promise<MediaGroupEntity> {
    return this.dataSource.transaction(async (manager) => {
      const group = await manager.save(manager.create(MediaGroupEntity, { name }));
      await manager.insert(
        MediaGroupItemEntity,
        [...new Set(assetIds)].map((assetId) => ({ groupId: group.id, assetId })),
      );
      return group;
    });
  }

  /** Renames and / or adds and removes files; touches `updatedAt`. */
  async update(
    id: string,
    patch: { name?: string; addIds?: readonly string[]; removeIds?: readonly string[] },
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      if (patch.removeIds?.length) {
        await manager.delete(MediaGroupItemEntity, { groupId: id, assetId: In([...patch.removeIds]) });
      }
      if (patch.addIds?.length) {
        await manager
          .createQueryBuilder()
          .insert()
          .into(MediaGroupItemEntity)
          .values([...new Set(patch.addIds)].map((assetId) => ({ groupId: id, assetId })))
          .orIgnore()
          .execute();
      }
      // `save` bumps `updatedAt` even when only the files changed.
      await manager.update(
        MediaGroupEntity,
        { id },
        { ...(patch.name ? { name: patch.name } : {}), updatedAt: new Date() },
      );
    });
  }

  async delete(id: string): Promise<boolean> {
    return ((await this.groups.delete({ id })).affected ?? 0) > 0;
  }
}
