import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MediaAssetEntity } from '@vgen/db';
import { In, Repository } from 'typeorm';

/** Data access for media assets; only MediaService uses it (other modules go through the service). */
@Injectable()
export class MediaRepository {
  constructor(
    @InjectRepository(MediaAssetEntity) private readonly repository: Repository<MediaAssetEntity>,
  ) {}

  findById(id: string): Promise<MediaAssetEntity | null> {
    return this.repository.findOneBy({ id });
  }

  findByIds(ids: readonly string[]): Promise<MediaAssetEntity[]> {
    return ids.length === 0 ? Promise.resolve([]) : this.repository.findBy({ id: In([...ids]) });
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete({ id });
  }

  save(asset: Partial<MediaAssetEntity>): Promise<MediaAssetEntity> {
    return this.repository.save(this.repository.create(asset));
  }
}
