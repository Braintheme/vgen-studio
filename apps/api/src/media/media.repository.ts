import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MediaAssetEntity } from '@vgen/db';
import { LIBRARY_MEDIA_KINDS, type MediaLibraryQuery } from '@vgen/shared';
import { In, Repository } from 'typeorm';

/**
 * Media ids a render's props snapshot uses (`props.media`: one id or a list per slot), as a
 * set-returning SQL fragment over `render_job` aliased `r`.
 */
const RENDER_MEDIA_IDS = `
  SELECT ref
  FROM jsonb_each(CASE WHEN jsonb_typeof(r.props->'media') = 'object' THEN r.props->'media' ELSE '{}'::jsonb END) slot,
  LATERAL jsonb_array_elements_text(
    CASE jsonb_typeof(slot.value)
      WHEN 'array' THEN slot.value
      WHEN 'string' THEN jsonb_build_array(slot.value)
      ELSE '[]'::jsonb
    END
  ) ref`;

const ORDER = {
  newest: { column: 'asset.createdAt', direction: 'DESC' },
  oldest: { column: 'asset.createdAt', direction: 'ASC' },
  largest: { column: 'asset.size', direction: 'DESC' },
} as const;

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

  /** Uploaded photos / videos for the library page, plus the size of all of them. */
  async listLibrary(
    query: MediaLibraryQuery,
  ): Promise<{ items: MediaAssetEntity[]; total: number; totalBytes: number }> {
    const base = this.repository
      .createQueryBuilder('asset')
      .where('asset.role = :role', { role: 'upload' })
      .andWhere('asset.kind IN (:...kinds)', { kinds: query.kind ? [query.kind] : [...LIBRARY_MEDIA_KINDS] });
    const order = ORDER[query.sort];
    const [items, total] = await base
      .clone()
      .orderBy(order.column, order.direction)
      .addOrderBy('asset.id', 'ASC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();
    const sum = await base
      .clone()
      .select('COALESCE(SUM(asset.size), 0)', 'bytes')
      .getRawOne<{ bytes: string }>();
    return { items, total, totalBytes: Number(sum?.bytes ?? 0) };
  }

  /** How many renders use each of the given media ids (ids no render uses are absent). */
  async renderCounts(ids: readonly string[]): Promise<ReadonlyMap<string, number>> {
    if (ids.length === 0) return new Map();
    const rows: { id: string; count: number }[] = await this.repository.manager.query(
      `SELECT used.ref AS id, COUNT(DISTINCT r.id)::int AS count
       FROM render_job r, LATERAL (${RENDER_MEDIA_IDS}) used
       WHERE used.ref = ANY($1::text[])
       GROUP BY used.ref`,
      [[...ids]],
    );
    return new Map(rows.map((row) => [row.id, row.count]));
  }

  /** Uploaded photos / videos older than `before`, used by no render and not in `keepIds`. */
  findUnused(before: Date, keepIds: readonly string[]): Promise<MediaAssetEntity[]> {
    return this.repository
      .createQueryBuilder('asset')
      .where('asset.role = :role', { role: 'upload' })
      .andWhere('asset.kind IN (:...kinds)', { kinds: [...LIBRARY_MEDIA_KINDS] })
      .andWhere('asset.createdAt < :before', { before })
      .andWhere(keepIds.length > 0 ? 'asset.id NOT IN (:...keep)' : 'TRUE', { keep: [...keepIds] })
      .andWhere(
        `NOT EXISTS (SELECT 1 FROM render_job r, LATERAL (${RENDER_MEDIA_IDS}) used WHERE used.ref = asset.id::text)`,
      )
      .getMany();
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete({ id });
  }

  save(asset: Partial<MediaAssetEntity>): Promise<MediaAssetEntity> {
    return this.repository.save(this.repository.create(asset));
  }
}
