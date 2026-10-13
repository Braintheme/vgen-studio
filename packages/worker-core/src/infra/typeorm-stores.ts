import { MediaAssetEntity, MusicTrackEntity, RenderJobEntity } from '@vgen/db';
import type { RenderStatus } from '@vgen/shared';
import { In, type DataSource } from 'typeorm';
import type {
  MediaAssetRecord,
  MediaAssetStore,
  MusicLibrary,
  MusicTrackRecord,
  NewMediaAsset,
  RenderJobRecord,
  RenderJobStore,
} from '../ports.js';

const toAsset = (entity: MediaAssetEntity): MediaAssetRecord => ({
  id: entity.id,
  kind: entity.kind,
  mime: entity.mime,
  storageKey: entity.storageKey,
  width: entity.width,
  height: entity.height,
  durationSec: entity.durationSec,
});

export class TypeOrmRenderJobStore implements RenderJobStore {
  constructor(private readonly dataSource: DataSource) {}

  private get repository() {
    return this.dataSource.getRepository(RenderJobEntity);
  }

  /** Conditional transition: only applies when the job is in one of `from`. */
  private async transition(
    id: string,
    from: readonly RenderStatus[],
    values: Partial<
      Pick<
        RenderJobEntity,
        | 'status'
        | 'progress'
        | 'error'
        | 'engineVersion'
        | 'outputAssetId'
        | 'thumbnailAssetId'
        | 'startedAt'
        | 'finishedAt'
      >
    >,
    incrementAttempts = false,
  ): Promise<boolean> {
    const query = this.repository
      .createQueryBuilder()
      .update(RenderJobEntity)
      .set({ ...values, ...(incrementAttempts ? { attempts: () => 'attempts + 1' } : {}) })
      .where('id = :id', { id })
      .andWhere('status IN (:...from)', { from });
    const result = await query.execute();
    return (result.affected ?? 0) > 0;
  }

  async find(id: string): Promise<RenderJobRecord | null> {
    const job = await this.repository.findOneBy({ id });
    return job
      ? {
          id: job.id,
          status: job.status,
          engine: job.engine,
          templateId: job.templateId,
          templateVersion: job.templateVersion,
          props: job.props,
          quality: job.quality,
          outputName: job.outputName,
        }
      : null;
  }

  markRendering(id: string, engineVersion: string): Promise<boolean> {
    return this.transition(
      id,
      ['queued', 'rendering'],
      { status: 'rendering', progress: 0, error: null, engineVersion, startedAt: new Date() },
      true,
    );
  }

  async updateProgress(id: string, progress: number): Promise<void> {
    await this.transition(id, ['rendering'], { progress });
  }

  markDone(id: string, result: { outputAssetId: string; thumbnailAssetId: string | null }): Promise<boolean> {
    return this.transition(id, ['rendering'], {
      status: 'done',
      progress: 100,
      outputAssetId: result.outputAssetId,
      thumbnailAssetId: result.thumbnailAssetId,
      finishedAt: new Date(),
    });
  }

  markFailed(id: string, error: string): Promise<boolean> {
    return this.transition(id, ['queued', 'rendering'], { status: 'failed', error, finishedAt: new Date() });
  }

  markRetrying(id: string, error: string): Promise<boolean> {
    return this.transition(id, ['rendering'], { status: 'queued', progress: 0, error });
  }
}

export class TypeOrmMediaAssetStore implements MediaAssetStore {
  constructor(private readonly dataSource: DataSource) {}

  async findByIds(ids: readonly string[]): Promise<MediaAssetRecord[]> {
    if (ids.length === 0) return [];
    const assets = await this.dataSource.getRepository(MediaAssetEntity).findBy({ id: In([...ids]) });
    return assets.map(toAsset);
  }

  async create(asset: NewMediaAsset): Promise<MediaAssetRecord> {
    const repository = this.dataSource.getRepository(MediaAssetEntity);
    return toAsset(await repository.save(repository.create({ ...asset, meta: {} })));
  }
}

export class TypeOrmMusicLibrary implements MusicLibrary {
  constructor(private readonly dataSource: DataSource) {}

  async resolve(trackId: string | null): Promise<MusicTrackRecord | null> {
    const track = await this.dataSource.getRepository(MusicTrackEntity).findOne({
      where: trackId ? { id: trackId } : { isDefault: true },
      relations: { asset: true },
    });
    return track?.asset ? { asset: toAsset(track.asset), durationSec: track.durationSec } : null;
  }
}
