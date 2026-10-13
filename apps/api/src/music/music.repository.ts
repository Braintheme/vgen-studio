import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MusicTrackEntity } from '@vgen/db';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class MusicRepository {
  constructor(
    @InjectRepository(MusicTrackEntity) private readonly repository: Repository<MusicTrackEntity>,
    private readonly dataSource: DataSource,
  ) {}

  list(): Promise<MusicTrackEntity[]> {
    return this.repository.find({ order: { createdAt: 'DESC' } });
  }

  findById(id: string): Promise<MusicTrackEntity | null> {
    return this.repository.findOneBy({ id });
  }

  findByAsset(assetId: string): Promise<MusicTrackEntity | null> {
    return this.repository.findOneBy({ assetId });
  }

  findDefault(): Promise<MusicTrackEntity | null> {
    return this.repository.findOneBy({ isDefault: true });
  }

  async hasDefault(): Promise<boolean> {
    return (await this.repository.countBy({ isDefault: true })) > 0;
  }

  save(track: Partial<MusicTrackEntity>): Promise<MusicTrackEntity> {
    return this.repository.save(this.repository.create(track));
  }

  async rename(id: string, title: string): Promise<void> {
    await this.repository.update({ id }, { title });
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete({ id });
  }

  /** Exactly one default track: unset the old one and set the new one atomically. */
  async setDefault(id: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.update(MusicTrackEntity, { isDefault: true }, { isDefault: false });
      await manager.update(MusicTrackEntity, { id }, { isDefault: true });
    });
  }
}
