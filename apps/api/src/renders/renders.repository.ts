import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RenderJobEntity } from '@vgen/db';
import type { RenderListQuery } from '@vgen/shared';
import { Repository } from 'typeorm';

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
    const [items, total] = await this.repository.findAndCount({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.templateId ? { templateId: query.templateId } : {}),
        ...(query.engine ? { engine: query.engine } : {}),
      },
      order: { createdAt: 'DESC' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });
    return { items, total };
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
