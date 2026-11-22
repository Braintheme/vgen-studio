import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProjectEntity } from '@vgen/db';
import {
  PROJECT_BULK_LIMIT,
  type ProjectDayDto,
  type ProjectDaysQuery,
  type ProjectListQuery,
  type ProjectScope,
  type ProjectSelectableQuery,
  type RenderStatus,
} from '@vgen/shared';
import { In, Repository, type SelectQueryBuilder } from 'typeorm';

const ALIAS = 'project';

/** The project's calendar day in a time zone (`:tz`), as `YYYY-MM-DD`. */
const DAY_SQL = `to_char(${ALIAS}.created_at AT TIME ZONE :tz, 'YYYY-MM-DD')`;

const HAS_RENDER_SQL = `EXISTS (SELECT 1 FROM render_job r WHERE r.project_id = ${ALIAS}.id)`;

/** Narrows a query to the table's filters. */
const applyScope = (
  query: SelectQueryBuilder<ProjectEntity>,
  scope: ProjectScope,
): SelectQueryBuilder<ProjectEntity> => {
  if (scope.templateId)
    query.andWhere(`${ALIAS}.template_id = :templateId`, { templateId: scope.templateId });
  if (scope.rendered === 'yes') query.andWhere(HAS_RENDER_SQL);
  if (scope.rendered === 'no') query.andWhere(`NOT ${HAS_RENDER_SQL}`);
  return query;
};

/** The newest render of a project, as the projects table shows it. */
export interface LastRenderRow {
  readonly id: string;
  readonly projectId: string;
  readonly status: RenderStatus;
  readonly progress: number;
  readonly error: string | null;
  readonly createdAt: Date;
  readonly finishedAt: Date | null;
}

interface DayRow {
  readonly day_key: string;
  readonly total: string;
  readonly not_rendered: string;
}

@Injectable()
export class ProjectsRepository {
  constructor(@InjectRepository(ProjectEntity) private readonly repository: Repository<ProjectEntity>) {}

  create(project: Partial<ProjectEntity>): Promise<ProjectEntity> {
    return this.repository.save(this.repository.create(project));
  }

  findById(id: string): Promise<ProjectEntity | null> {
    return this.repository.findOneBy({ id });
  }

  findByIds(ids: readonly string[]): Promise<ProjectEntity[]> {
    return ids.length === 0 ? Promise.resolve([]) : this.repository.findBy({ id: In([...ids]) });
  }

  async update(id: string, patch: Partial<ProjectEntity>): Promise<void> {
    // TypeORM's deep-partial type does not take jsonb records; the patch is a plain column subset.
    await this.repository.update({ id }, patch as Parameters<Repository<ProjectEntity>['update']>[1]);
  }

  async list(query: ProjectListQuery): Promise<{ items: ProjectEntity[]; total: number }> {
    const [items, total] = await applyScope(this.repository.createQueryBuilder(ALIAS), query)
      .orderBy(`${ALIAS}.createdAt`, 'DESC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();
    return { items, total };
  }

  /** Projects per calendar day in `query.tz`, newest day first. */
  async days(query: ProjectDaysQuery): Promise<ProjectDayDto[]> {
    const rows = await applyScope(this.repository.createQueryBuilder(ALIAS), query)
      .select(DAY_SQL, 'day_key')
      .addSelect('count(*)', 'total')
      .addSelect(`count(*) FILTER (WHERE NOT ${HAS_RENDER_SQL})`, 'not_rendered')
      .setParameter('tz', query.tz)
      .groupBy('day_key')
      .orderBy('day_key', 'DESC')
      .getRawMany<DayRow>();
    return rows.map((row) => ({
      date: row.day_key,
      total: Number(row.total),
      notRendered: Number(row.not_rendered),
    }));
  }

  /** Projects in the scope (one day of it, if given), newest first; at most the bulk limit. */
  selectable(query: ProjectSelectableQuery): Promise<ProjectEntity[]> {
    const builder = applyScope(this.repository.createQueryBuilder(ALIAS), query);
    if (query.day) builder.andWhere(`${DAY_SQL} = :day`, { tz: query.tz, day: query.day });
    return builder.orderBy(`${ALIAS}.createdAt`, 'DESC').take(PROJECT_BULK_LIMIT).getMany();
  }

  /** Deletes the projects; returns the ids that existed. Their renders stay (project_id -> null). */
  async delete(ids: readonly string[]): Promise<string[]> {
    if (ids.length === 0) return [];
    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .from(ProjectEntity)
      .where('id IN (:...ids)', { ids: [...ids] })
      .returning('id')
      .execute();
    return (result.raw as { id: string }[]).map((row) => row.id);
  }

  /** The newest render of each project that has one. */
  async lastRenders(projectIds: readonly string[]): Promise<Map<string, LastRenderRow>> {
    if (projectIds.length === 0) return new Map();
    const rows: {
      id: string;
      project_id: string;
      status: RenderStatus;
      progress: number;
      error: string | null;
      created_at: Date;
      finished_at: Date | null;
    }[] = await this.repository.manager.query(
      `SELECT DISTINCT ON (project_id) id, project_id, status, progress, error, created_at, finished_at
       FROM render_job
       WHERE project_id = ANY($1::uuid[])
       ORDER BY project_id, created_at DESC`,
      [[...projectIds]],
    );
    return new Map(
      rows.map((row) => [
        row.project_id,
        {
          id: row.id,
          projectId: row.project_id,
          status: row.status,
          progress: row.progress,
          error: row.error,
          createdAt: row.created_at,
          finishedAt: row.finished_at,
        },
      ]),
    );
  }
}
