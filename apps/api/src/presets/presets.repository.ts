import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StylePresetEntity } from '@vgen/db';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class PresetsRepository {
  constructor(
    @InjectRepository(StylePresetEntity) private readonly repository: Repository<StylePresetEntity>,
    private readonly dataSource: DataSource,
  ) {}

  list(templateId?: string): Promise<StylePresetEntity[]> {
    return this.repository.find({
      where: templateId ? { templateId } : {},
      order: { templateId: 'ASC', name: 'ASC' },
    });
  }

  findById(id: string): Promise<StylePresetEntity | null> {
    return this.repository.findOneBy({ id });
  }

  /** Number of presets per music track they reference (`props.music.trackId`). */
  async countByTrack(): Promise<Map<string, number>> {
    const trackId = "preset.props -> 'music' ->> 'trackId'";
    const rows = await this.repository
      .createQueryBuilder('preset')
      .select(trackId, 'trackId')
      .addSelect('COUNT(*)::int', 'count')
      .where(`${trackId} IS NOT NULL`)
      .groupBy(trackId)
      .getRawMany<{ trackId: string; count: number }>();
    return new Map(rows.map((row) => [row.trackId, row.count]));
  }

  async hasDefault(templateId: string): Promise<boolean> {
    return (await this.repository.countBy({ templateId, isDefault: true })) > 0;
  }

  save(preset: Partial<StylePresetEntity>): Promise<StylePresetEntity> {
    return this.repository.save(this.repository.create(preset));
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete({ id });
  }

  /** Exactly one default per template: unset the old one and set the new one atomically. */
  async setDefault(id: string, templateId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.update(StylePresetEntity, { templateId, isDefault: true }, { isDefault: false });
      await manager.update(StylePresetEntity, { id }, { isDefault: true });
    });
  }
}
