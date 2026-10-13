import { createHash } from 'node:crypto';
import type { Readable } from 'node:stream';
import { Inject, Injectable } from '@nestjs/common';
import {
  parseTemplateProps,
  PreviewKeySchema,
  type CreatePreviewRequest,
  type PreviewDto,
} from '@vgen/shared';
import { storageKeys, type StorageService } from '@vgen/storage';
import { CatalogService } from '../catalog/catalog.service.js';
import {
  issueToDetail,
  NotFoundError,
  RenderFailedError,
  ValidationFailedError,
  WorkerUnavailableError,
} from '../common/errors.js';
import { MediaService } from '../media/media.service.js';
import { PreviewTimeoutError, RenderQueueService } from '../queue/render-queue.service.js';
import { STORAGE } from '../storage/storage.module.js';

/** How long a request waits for the worker (it may finish a running render first). */
const PREVIEW_TIMEOUT_MS = 60_000;

export const previewUrl = (key: string): string => `/api/v1/previews/${key}`;

const asList = (value: string | readonly string[] | null | undefined): string[] =>
  value === null || value === undefined ? [] : typeof value === 'string' ? [value] : [...value];

/**
 * Preview frames for engines without a browser player: the engine's worker renders one
 * still. Frames are cached by a hash of everything that affects them, so unchanged
 * settings never hit the worker again.
 */
@Injectable()
export class PreviewsService {
  constructor(
    private readonly catalog: CatalogService,
    private readonly media: MediaService,
    private readonly queue: RenderQueueService,
    @Inject(STORAGE) private readonly storage: StorageService,
  ) {}

  async create(request: CreatePreviewRequest): Promise<PreviewDto> {
    const template = this.catalog.getTemplate(request.templateId);
    const engine = this.catalog.getEngine(template.engine);
    const parsed = parseTemplateProps(template, request.props);
    if (!parsed.success) {
      throw new ValidationFailedError(
        `Props do not match template "${template.id}"`,
        parsed.error.issues.map((issue) => issueToDetail(issue, 'props')),
      );
    }
    // A still has no sound: leave music out (no download, and it does not split the cache).
    const props = { ...parsed.data, music: { ...parsed.data.music, enabled: false } };
    const ids = template.mediaSlots.flatMap((slot) => asList(props.media[slot.key]));
    const existing = await this.media.infoMap(ids);
    const missing = ids.filter((id) => !existing.has(id));
    if (missing.length > 0) {
      throw new ValidationFailedError('Some media of the preview was deleted', [
        { path: 'props.media', message: `Missing: ${missing.join(', ')}` },
      ]);
    }

    const metadata = template.resolveMetadata(props);
    const frame = Math.min(request.frame ?? template.posterFrame(props), metadata.durationInFrames - 1);
    const key = createHash('sha256')
      .update(
        JSON.stringify({
          template: template.id,
          version: template.version,
          engine: engine.version,
          frame,
          props,
        }),
      )
      .digest('hex');
    const storageKey = storageKeys.preview(key);

    if (!(await this.storage.stat(storageKey))) {
      try {
        await this.queue.renderPreview(
          template.engine,
          key,
          { templateId: template.id, props, frame, storageKey },
          PREVIEW_TIMEOUT_MS,
        );
      } catch (error) {
        if (error instanceof PreviewTimeoutError) {
          throw new WorkerUnavailableError(
            `The "${engine.name}" worker did not answer in ${String(PREVIEW_TIMEOUT_MS / 1000)} s (not running, or busy with a render)`,
          );
        }
        throw new RenderFailedError(
          `Preview failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    return { url: previewUrl(key), frame, width: metadata.width, height: metadata.height };
  }

  async open(key: string): Promise<{ stream: Readable; size: number }> {
    const storageKey = storageKeys.preview(PreviewKeySchema.parse(key));
    const stored = await this.storage.stat(storageKey);
    if (!stored) throw new NotFoundError('Preview', key);
    return { stream: await this.storage.read(storageKey), size: stored.size };
  }
}
