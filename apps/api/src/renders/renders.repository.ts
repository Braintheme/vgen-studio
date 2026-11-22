import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RenderJobEntity } from '@vgen/db';
import {
  READY_RENDERS_LIMIT,
  type RenderDayDto,
  type RenderDaysQuery,
  type RenderListQuery,
  type RenderReadyQuery,
  type RenderScope,
} from '@vgen/shared';
import { In, Repository, type SelectQueryBuilder } from 'typeorm';

const ALIAS = 'job';

/** The render's calendar day in a time zone (`:tz`), as `YYYY-MM-DD`. */
const DAY_SQL = `to_char(${ALIAS}.created_at AT TIME ZONE :tz, 'YYYY-MM-DD')`;

/** Narrows a query to the table's filters. */
export const applyScope = (
  query: SelectQueryBuilder<RenderJobEntity>,
  scope: RenderScope,
): SelectQueryBuilder<RenderJobEntity> => {
  if (scope.status) query.andWhere(`${ALIAS}.status = :status`, { status: scope.status });
  if (scope.templateId)
    query.andWhere(`${ALIAS}.template_id = :templateId`, { templateId: scope.templateId });
  if (scope.engine) query.andWhere(`${ALIAS}.engine = :engine`, { engine: scope.engine });
  if (scope.downloaded === 'yes') query.andWhere(`${ALIAS}.downloaded_at IS NOT NULL`);
  if (scope.downloaded === 'no') query.andWhere(`${ALIAS}.downloaded_at IS NULL`);
  return query;
};

interface DayRow {
  readonly day_key: string;
  readonly total: string;
  readonly ready: string;
  readonly not_downloaded: string;
}

@Injectable()
export class RendersRepository {
  constructor(@InjectRepository(RenderJobEntity) private readonly repository: Repository<RenderJobEntity>) {}

  create(job: Partial<RenderJobEntity>): Promise<RenderJobEntity> {
    return this.repository.save(this.repository.create(job));
  }

  findById(id: string): Promise<RenderJobEntity | null> {
    return this.repository.findOneBy({ id });
  }

  async list(query: RenderListQuery): Promise<{ items: RenderJobEntity[]; total: number }> {
    const [items, total] = await applyScope(this.repository.createQueryBuilder(ALIAS), query)
      .orderBy(`${ALIAS}.createdAt`, 'DESC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();
    return { items, total };
  }

  /** Renders per calendar day in `query.tz`, newest day first. */
  async days(query: RenderDaysQuery): Promise<RenderDayDto[]> {
    const rows = await applyScope(this.repository.createQueryBuilder(ALIAS), query)
      .select(DAY_SQL, 'day_key')
      .addSelect('count(*)', 'total')
      .addSelect(`count(*) FILTER (WHERE ${ALIAS}.status = 'done')`, 'ready')
      .addSelect(
        `count(*) FILTER (WHERE ${ALIAS}.status = 'done' AND ${ALIAS}.downloaded_at IS NULL)`,
        'not_downloaded',
      )
      .setParameter('tz', query.tz)
      .groupBy('day_key')
      .orderBy('day_key', 'DESC')
      .getRawMany<DayRow>();
    return rows.map((row) => ({
      date: row.day_key,
      total: Number(row.total),
      ready: Number(row.ready),
      notDownloaded: Number(row.not_downloaded),
    }));
  }

  /** Done renders in the scope (one day of it, if given), newest first; at most the limit. */
  ready(query: RenderReadyQuery): Promise<RenderJobEntity[]> {
    const builder = applyScope(this.repository.createQueryBuilder(ALIAS), query).andWhere(
      `${ALIAS}.status = 'done'`,
    );
    if (query.day) builder.andWhere(`${DAY_SQL} = :day`, { tz: query.tz, day: query.day });
    return builder.orderBy(`${ALIAS}.createdAt`, 'DESC').take(READY_RENDERS_LIMIT).getMany();
  }

  async markDownloaded(ids: readonly string[]): Promise<void> {
    await this.repository.update({ id: In([...ids]) }, { downloadedAt: new Date() });
  }

  /** queued|rendering -> cancelled, atomically. False if the job already reached a final state. */
  async markCancelled(id: string): Promise<boolean> {
    const result = await this.repository
      .createQueryBuilder()
      .update(RenderJobEntity)
      .set({ status: 'cancelled', finishedAt: new Date() })
      .where('id = :id', { id })
      .andWhere('status IN (:...statuses)', { statuses: ['queued', 'rendering'] })
      .execute();
    return (result.affected ?? 0) > 0;
  }

  /** Deletes a render in a final state; false if it is (again) active or gone. */
  async deleteFinished(id: string): Promise<boolean> {
    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .from(RenderJobEntity)
      .where('id = :id', { id })
      .andWhere('status IN (:...statuses)', { statuses: ['done', 'failed', 'cancelled'] })
      .execute();
    return (result.affected ?? 0) > 0;
  }

  async markEnqueueFailed(id: string, error: string): Promise<void> {
    await this.repository.update(
      { id, status: 'queued' },
      { status: 'failed', error, finishedAt: new Date() },
    );
  }
}
