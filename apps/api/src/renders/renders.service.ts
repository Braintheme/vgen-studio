import { Injectable, Logger, type MessageEvent } from '@nestjs/common';
import type { MediaAssetEntity, RenderJobEntity } from '@vgen/db';
import {
  buildOutputFileName,
  parseTemplateProps,
  type StillScale,
  type BaseProps,
  type CreateRenderResponse,
  type DuplicateRenderResponse,
  type MediaInfo,
  type MediaWarning,
  type Paginated,
  type QualityPreset,
  type RenderEvent,
  type RenderJobDto,
  type RenderListQuery,
  type TemplateDefinition,
} from '@vgen/shared';
import { concat, defer, from, interval, map, merge, type Observable } from 'rxjs';
import { CatalogService } from '../catalog/catalog.service.js';
import { ConflictError, NotFoundError, ValidationFailedError, issueToDetail } from '../common/errors.js';
import { MediaService } from '../media/media.service.js';
import { MusicService } from '../music/music.service.js';
import { PresetsService } from '../presets/presets.service.js';
import { RenderQueueService } from '../queue/render-queue.service.js';
import { RenderEventsService } from './render-events.service.js';
import { toRenderDto } from './renders.mapper.js';
import { RendersRepository } from './renders.repository.js';
import type { ZipEntry } from './zip-stream.js';

/** Keeps idle SSE connections alive through proxies. */
const HEARTBEAT_MS = 15_000;

const asList = (value: string | readonly string[] | null | undefined): string[] =>
  value === null || value === undefined ? [] : typeof value === 'string' ? [value] : [...value];

@Injectable()
export class RendersService {
  private readonly logger = new Logger(RendersService.name);

  constructor(
    private readonly repository: RendersRepository,
    private readonly catalog: CatalogService,
    private readonly media: MediaService,
    private readonly music: MusicService,
    private readonly presets: PresetsService,
    private readonly queue: RenderQueueService,
    private readonly events: RenderEventsService,
  ) {}

  async create(request: {
    templateId: string;
    props: Record<string, unknown>;
    quality: QualityPreset;
    scale: StillScale;
    presetId: string | null;
  }): Promise<CreateRenderResponse> {
    const template = this.catalog.getTemplate(request.templateId);
    const parsed = parseTemplateProps(template, request.props);
    if (!parsed.success) {
      throw new ValidationFailedError(
        `Props do not match template "${template.id}"`,
        parsed.error.issues.map((issue) => issueToDetail(issue, 'props')),
      );
    }
    return this.submit(template, parsed.data, request.quality, request.scale, request.presetId);
  }

  async duplicate(id: string): Promise<DuplicateRenderResponse> {
    const original = await this.require(id);
    const template = this.catalog.getTemplate(original.templateId);
    const parsed = parseTemplateProps(template, original.props);
    if (!parsed.success) {
      throw new ValidationFailedError(
        `The original props no longer match template "${template.id}" v${template.version}`,
        parsed.error.issues.map((issue) => issueToDetail(issue, 'props')),
      );
    }
    const ids = template.mediaSlots.flatMap((slot) => asList(parsed.data.media[slot.key]));
    const existing = await this.media.infoMap(ids);
    const missing = template.mediaSlots.flatMap((slot) =>
      asList(parsed.data.media[slot.key])
        .filter((assetId) => !existing.has(assetId))
        .map((assetId) => ({ path: `props.media.${slot.key}`, message: `Media "${assetId}" was deleted` })),
    );
    if (missing.length > 0) {
      throw new ConflictError('Cannot re-render: media used by this render has been deleted', missing);
    }
    const created = await this.submit(
      template,
      parsed.data,
      original.quality as QualityPreset,
      original.scale as StillScale,
      original.presetId,
    );
    return { ...created, templateVersionChanged: original.templateVersion !== template.version };
  }

  async list(query: RenderListQuery): Promise<Paginated<RenderJobDto>> {
    const { items, total } = await this.repository.list(query);
    const assets = await this.assetsOf(items);
    return {
      items: items.map((job) => toRenderDto(job, assets)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async get(id: string): Promise<RenderJobDto> {
    const job = await this.require(id);
    return toRenderDto(job, await this.assetsOf([job]));
  }

  async cancel(id: string): Promise<RenderJobDto> {
    const job = await this.require(id);
    // Flip the state first: a worker that picks the job up afterwards will skip it.
    if (!(await this.repository.markCancelled(id))) {
      const current = await this.require(id);
      throw new ConflictError(`Render is already ${current.status}`);
    }
    await this.queue.removeWaiting(job.engine, id);
    await this.queue.requestCancel(id);
    const cancelled = await this.require(id);
    await this.publishStatus(cancelled);
    return toRenderDto(cancelled, await this.assetsOf([cancelled]));
  }

  /**
   * Deletes a finished render with its MP4 and thumbnail. Active renders answer 409:
   * a worker could still be writing the output, so they must be cancelled first.
   */
  async remove(id: string): Promise<void> {
    const job = await this.require(id);
    if (!(await this.repository.deleteFinished(id))) {
      throw new ConflictError(`Render is ${job.status}; cancel it before deleting`);
    }
    const generated = [job.outputAssetId, job.thumbnailAssetId, ...job.slideAssetIds].filter(
      (assetId): assetId is string => assetId !== null,
    );
    await this.media.deleteGenerated(generated);
  }

  /** The slides of a finished image output, as ZIP entries (streamed by the controller). */
  async archive(id: string): Promise<{ fileName: string; entries: ZipEntry[] }> {
    const job = await this.require(id);
    if (job.status !== 'done' || job.slideAssetIds.length === 0) {
      throw new NotFoundError('Slides of render', id);
    }
    const assets = await this.media.findMany(job.slideAssetIds);
    const byId = new Map(assets.map((asset) => [asset.id, asset]));
    const entries = job.slideAssetIds.flatMap((assetId) => {
      const asset = byId.get(assetId);
      return asset
        ? [
            {
              name: asset.originalName,
              open: async () => (await this.media.openFile(assetId, 'original', undefined)).stream,
            },
          ]
        : [];
    });
    return { fileName: job.outputName, entries };
  }

  /** SSE for one render: current state first (nothing is missed), then live events. */
  watch(id: string): Observable<MessageEvent> {
    const snapshot = defer(() =>
      from(
        this.repository.findById(id).then((job): MessageEvent => {
          if (!job)
            return {
              type: 'error',
              data: { error: { code: 'NOT_FOUND', message: `Render "${id}" not found` } },
            };
          return { data: this.statusEvent(job) };
        }),
      ),
    );
    return this.events.untilShutdown(
      merge(
        concat(snapshot, this.events.stream(id).pipe(map((event): MessageEvent => ({ data: event })))),
        this.heartbeat(),
      ),
    );
  }

  /** SSE for all renders (list screens). */
  watchAll(): Observable<MessageEvent> {
    return this.events.untilShutdown(
      merge(this.events.stream().pipe(map((event): MessageEvent => ({ data: event }))), this.heartbeat()),
    );
  }

  private heartbeat(): Observable<MessageEvent> {
    return interval(HEARTBEAT_MS).pipe(map((): MessageEvent => ({ type: 'ping', data: '' })));
  }

  private async submit(
    template: TemplateDefinition,
    props: BaseProps,
    quality: QualityPreset,
    requestedScale: StillScale,
    presetId: string | null,
  ): Promise<CreateRenderResponse> {
    if (!template.formats.includes(props.format)) {
      throw new ValidationFailedError(`Template "${template.id}" does not support format ${props.format}`, [
        { path: 'props.format', message: `Supported: ${template.formats.join(', ')}` },
      ]);
    }
    const stills = template.output === 'stills';
    const warnings = [
      ...(await this.checkMedia(template, props)),
      // Image outputs have no audio.
      ...(stills ? [] : await this.checkMusic(props)),
    ];
    const presetName = presetId ? await this.presets.findName(presetId) : null;
    if (presetId && presetName === null) {
      throw new ValidationFailedError(`Style preset "${presetId}" not found`, [
        { path: 'presetId', message: 'Unknown preset' },
      ]);
    }

    const job = await this.repository.create({
      status: 'queued',
      engine: template.engine,
      templateId: template.id,
      templateVersion: template.version,
      props: props as unknown as Record<string, unknown>,
      format: props.format,
      quality,
      // Videos are always rendered at the format's size.
      scale: stills ? requestedScale : 1,
      presetId,
      outputName: buildOutputFileName({
        templateId: template.id,
        presetName,
        format: props.format,
        date: new Date(),
        extension: stills ? 'zip' : 'mp4',
      }),
    });
    try {
      await this.queue.enqueue(template.engine, job.id);
    } catch (error) {
      this.logger.error(`could not enqueue render ${job.id}: ${String(error)}`);
      await this.repository.markEnqueueFailed(job.id, 'Could not enqueue the render');
      throw error;
    }
    await this.publishStatus(job);
    return {
      ...toRenderDto(job, new Map()),
      warnings: warnings.map(({ slots, ...warning }) => ({
        ...warning,
        ...(slots ? { slots: [...slots] } : {}),
      })),
    };
  }

  /** Music on but the library has no default track: the video renders silent. */
  private async checkMusic(props: BaseProps): Promise<readonly MediaWarning[]> {
    if (!props.music.enabled || (await this.music.resolveForRender(props.music.trackId))) return [];
    return [
      {
        code: 'NO_MUSIC',
        severity: 'warning',
        message: 'Music is on, but the library has no default track: the video will be silent.',
      },
    ];
  }

  /** Every referenced asset must exist and fit its slot; template checks become warnings. */
  private async checkMedia(template: TemplateDefinition, props: BaseProps): Promise<readonly MediaWarning[]> {
    const ids = template.mediaSlots.flatMap((slot) => asList(props.media[slot.key]));
    const infos = await this.media.infoMap(ids);
    const problems: { path: string; message: string }[] = [];
    const bySlot: Record<string, MediaInfo | MediaInfo[] | null> = {};
    for (const slot of template.mediaSlots) {
      const items = asList(props.media[slot.key]).map((assetId, index) => {
        const info = infos.get(assetId);
        const path = slot.multiple ? `props.media.${slot.key}.${index}` : `props.media.${slot.key}`;
        if (!info) problems.push({ path, message: `Media "${assetId}" not found` });
        else if (info.kind !== slot.kind)
          problems.push({ path, message: `Expected ${slot.kind}, got ${info.kind}` });
        return info;
      });
      const present = items.filter((item): item is MediaInfo => item !== undefined);
      bySlot[slot.key] = slot.multiple ? present : (present[0] ?? null);
    }
    if (problems.length > 0) {
      throw new ValidationFailedError('Some media cannot be used', problems);
    }
    return template.checkMedia?.(bySlot) ?? [];
  }

  private statusEvent(job: RenderJobEntity): RenderEvent {
    return {
      type: 'status',
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      error: job.error,
      at: new Date().toISOString(),
    };
  }

  private async publishStatus(job: RenderJobEntity): Promise<void> {
    await this.queue.publishEvent(this.statusEvent(job)).catch((error: unknown) => {
      this.logger.warn(`could not publish status of ${job.id}: ${String(error)}`);
    });
  }

  private async assetsOf(jobs: readonly RenderJobEntity[]): Promise<Map<string, MediaAssetEntity>> {
    const ids = jobs
      .flatMap((job) => [job.outputAssetId, job.thumbnailAssetId, ...job.slideAssetIds])
      .filter((id): id is string => id !== null);
    return new Map((await this.media.findMany(ids)).map((asset) => [asset.id, asset]));
  }

  private async require(id: string): Promise<RenderJobEntity> {
    const job = await this.repository.findById(id);
    if (!job) throw new NotFoundError('Render', id);
    return job;
  }
}
