import { randomUUID } from 'node:crypto';
import { mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { encodeDeliveryJpeg, ensureDeliverySpec, extractFrame, shrinkJpeg } from '@vgen/media';
import {
  DEFAULT_QUALITY_PRESET,
  slideFileName,
  STILL_JPEG_QUALITY,
  type BaseProps,
  type PreviewJobPayload,
  type RenderEngine,
  type RenderStatus,
  type TemplateDefinition,
} from '@vgen/shared';
import { storageKeys, type StorageService } from '@vgen/storage';
import { throwIfCancelled } from './abort.js';
import type { AssetServer } from './assets/asset-server.js';
import { prepareJobAssets } from './assets/prepare-assets.js';
import { PermanentJobError } from './errors.js';
import type { Logger } from './logger.js';
import type {
  MediaAssetStore,
  MusicLibrary,
  RenderEventPublisher,
  RenderJobRecord,
  RenderJobResult,
  RenderJobStore,
} from './ports.js';
import { ProgressReporter } from './progress.js';
import { encodingFor } from './quality.js';

export interface PipelineDeps {
  readonly engine: RenderEngine;
  readonly jobs: RenderJobStore;
  readonly media: MediaAssetStore;
  readonly music: MusicLibrary;
  readonly storage: StorageService;
  readonly publisher: RenderEventPublisher;
  readonly assetServer: AssetServer;
  readonly workRoot: string;
  readonly progressThrottleMs: number;
  readonly logger: Logger;
}

/** Progress budget per phase (percent). */
const PREPARED = 8;
const RENDERED = 92;
const DELIVERED = 96;

/** Long side of an image output's thumbnail. */
const SLIDE_THUMBNAIL_SIDE = 1080;

/**
 * Engine-agnostic render pipeline: job state, asset preparation, engine render,
 * delivery post-processing, thumbnail, storage. Knows nothing about templates
 * beyond the TemplateDefinition contract.
 */
export class RenderPipeline {
  constructor(private readonly deps: PipelineDeps) {}

  async publishStatus(
    jobId: string,
    status: RenderStatus,
    progress: number,
    error: string | null,
  ): Promise<void> {
    await this.deps.publisher
      .publish({ type: 'status', jobId, status, progress, error, at: new Date().toISOString() })
      .catch((publishError: unknown) => {
        this.deps.logger.warn('failed to publish status', { jobId, error: publishError });
      });
  }

  async run(jobId: string, signal: AbortSignal): Promise<void> {
    const { engine, jobs } = this.deps;
    const logger = this.deps.logger.child({ jobId });
    const job = await jobs.find(jobId);
    if (!job) {
      throw new PermanentJobError(`Render job ${jobId} does not exist`);
    }
    if (job.status === 'cancelled' || job.status === 'done' || job.status === 'failed') {
      logger.info('skipping job in final state', { status: job.status });
      return;
    }
    if (job.engine !== engine.id) {
      throw new PermanentJobError(`Job belongs to engine "${job.engine}", not "${engine.id}"`);
    }
    const template = engine.templates.find((candidate) => candidate.id === job.templateId);
    if (!template) {
      throw new PermanentJobError(`Template "${job.templateId}" is not provided by engine "${engine.id}"`);
    }
    if (template.version !== job.templateVersion) {
      logger.warn('rendering with a newer template version', {
        stored: job.templateVersion,
        current: template.version,
      });
    }
    const parsed = template.schema.safeParse(job.props);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new PermanentJobError(
        `Stored props do not match template "${template.id}" v${template.version}: ${issue?.path.join('.') ?? ''} ${issue?.message ?? ''}`.trim(),
      );
    }

    if (!(await jobs.markRendering(jobId, engine.version))) {
      logger.info('job is no longer runnable (cancelled meanwhile?)');
      return;
    }
    await this.publishStatus(jobId, 'rendering', 0, null);
    logger.info('render started', { template: template.id, quality: job.quality });

    const workDir = path.join(this.deps.workRoot, jobId);
    const progress = new ProgressReporter(jobId, jobs, this.deps.publisher, this.deps.progressThrottleMs);
    const startedAt = Date.now();
    try {
      await mkdir(workDir, { recursive: true });
      const result =
        template.output === 'stills'
          ? await this.renderSlides(template, parsed.data, job, workDir, progress, signal)
          : await this.render(
              template,
              parsed.data,
              job.quality,
              job.outputName,
              workDir,
              progress,
              signal,
              jobId,
            );
      await progress.flush();
      if (await jobs.markDone(jobId, result)) {
        await this.publishStatus(jobId, 'done', 100, null);
      }
      logger.info('render finished', { seconds: Math.round((Date.now() - startedAt) / 100) / 10 });
    } finally {
      await progress.flush();
      await rm(workDir, { recursive: true, force: true });
    }
  }

  private async render(
    template: TemplateDefinition,
    props: BaseProps,
    quality: string,
    outputName: string,
    workDir: string,
    progress: ProgressReporter,
    signal: AbortSignal,
    jobId: string,
  ): Promise<RenderJobResult> {
    const { engine, logger } = this.deps;
    const metadata = template.resolveMetadata(props);
    const encoding = encodingFor(quality);

    const assets = await prepareJobAssets(this.deps, {
      jobId,
      template,
      props,
      frame: metadata,
      workDir,
      signal,
    });
    progress.report(PREPARED);

    throwIfCancelled(signal, jobId);
    const outputPath = path.join(workDir, 'output.mp4');
    await engine.render(
      { jobId, template, props, assets, metadata, encoding },
      {
        outputPath,
        signal,
        onProgress: (value) => {
          progress.report(PREPARED + value * (RENDERED - PREPARED));
        },
      },
    );
    throwIfCancelled(signal, jobId);

    const delivery = await ensureDeliverySpec(outputPath, {
      audioBitrate: encoding.audioBitrate,
      crf: encoding.crf,
      signal,
    });
    if (delivery.action !== 'none') {
      logger.info('output post-processed to the delivery spec', { action: delivery.action });
    }
    progress.report(DELIVERED);

    const thumbnailAssetId = await this.storeThumbnail(jobId, async (thumbnailPath) => {
      await extractFrame(outputPath, template.posterFrame(props) / metadata.fps, thumbnailPath);
      return metadata;
    });

    throwIfCancelled(signal, jobId);
    const stored = await this.deps.storage.putFile(storageKeys.renderOutput(jobId, outputName), outputPath);
    const output = await this.deps.media.create({
      kind: 'video',
      role: 'render_output',
      originalName: outputName,
      mime: 'video/mp4',
      size: (await stat(outputPath)).size,
      storageKey: stored.key,
      width: delivery.report.width,
      height: delivery.report.height,
      durationSec: delivery.report.durationSec,
    });
    return { outputAssetId: output.id, slideAssetIds: [], thumbnailAssetId };
  }

  /**
   * Image outputs (`output: 'stills'`): every frame is one slide. Photos are prepared for the
   * scaled frame, the engine writes lossless images, each is encoded once into the delivery
   * JPEG and stored as an output of its own; the API zips them on download.
   */
  private async renderSlides(
    template: TemplateDefinition,
    props: BaseProps,
    job: RenderJobRecord,
    workDir: string,
    progress: ProgressReporter,
    signal: AbortSignal,
  ): Promise<RenderJobResult> {
    const { engine } = this.deps;
    const jobId = job.id;
    if (!engine.renderStills) {
      throw new PermanentJobError(`Engine "${engine.id}" does not render image outputs`);
    }
    const metadata = template.resolveMetadata(props);
    const assets = await prepareJobAssets(this.deps, {
      jobId,
      template,
      props,
      frame: { width: metadata.width * job.scale, height: metadata.height * job.scale },
      workDir,
      signal,
    });
    progress.report(PREPARED);

    throwIfCancelled(signal, jobId);
    const framesDir = path.join(workDir, 'frames');
    await mkdir(framesDir, { recursive: true });
    const frames = await engine.renderStills(
      { jobId, template, props, assets, metadata, encoding: encodingFor(job.quality) },
      {
        outputDir: framesDir,
        scale: job.scale,
        signal,
        onProgress: (value) => {
          progress.report(PREPARED + value * (RENDERED - PREPARED));
        },
      },
    );
    if (frames.length === 0) {
      throw new PermanentJobError('The engine rendered no images');
    }

    const slideAssetIds: string[] = [];
    let first: string | null = null;
    for (const [index, frame] of frames.entries()) {
      throwIfCancelled(signal, jobId);
      const name = slideFileName(job.outputName, index, frames.length);
      const image = await encodeDeliveryJpeg(frame, path.join(workDir, name), {
        quality: STILL_JPEG_QUALITY,
      });
      first ??= image.path;
      const stored = await this.deps.storage.putFile(storageKeys.renderOutput(jobId, name), image.path);
      const asset = await this.deps.media.create({
        kind: 'image',
        role: 'render_output',
        originalName: name,
        mime: 'image/jpeg',
        size: image.size,
        storageKey: stored.key,
        width: image.width,
        height: image.height,
        durationSec: null,
      });
      slideAssetIds.push(asset.id);
      progress.report(RENDERED + ((index + 1) / frames.length) * (DELIVERED - RENDERED));
    }

    const firstSlide = first;
    const thumbnailAssetId = firstSlide
      ? await this.storeThumbnail(jobId, (thumbnailPath) =>
          shrinkJpeg(firstSlide, thumbnailPath, SLIDE_THUMBNAIL_SIDE),
        )
      : null;
    return { outputAssetId: null, slideAssetIds, thumbnailAssetId };
  }

  /** Writes and stores the job's thumbnail; a failure is logged, never fatal. */
  private async storeThumbnail(
    jobId: string,
    write: (thumbnailPath: string) => Promise<{ readonly width: number; readonly height: number }>,
  ): Promise<string | null> {
    const thumbnailPath = path.join(this.deps.workRoot, jobId, 'thumbnail.jpg');
    try {
      const size = await write(thumbnailPath);
      const stored = await this.deps.storage.putFile(storageKeys.renderThumbnail(jobId), thumbnailPath);
      return (
        await this.deps.media.create({
          kind: 'image',
          role: 'thumbnail',
          originalName: 'thumbnail.jpg',
          mime: 'image/jpeg',
          size: stored.size,
          storageKey: stored.key,
          width: size.width,
          height: size.height,
          durationSec: null,
        })
      ).id;
    } catch (error) {
      // A missing thumbnail must not fail an otherwise good render.
      this.deps.logger.warn('thumbnail extraction failed', { error, jobId });
      return null;
    }
  }

  /**
   * Renders one preview frame (engines without a browser player) into storage. No
   * database record: the API caches frames by content hash and waits for this job.
   */
  async preview(payload: PreviewJobPayload, signal: AbortSignal): Promise<void> {
    const { engine, logger } = this.deps;
    const template = engine.templates.find((candidate) => candidate.id === payload.templateId);
    if (!template) {
      throw new PermanentJobError(
        `Template "${payload.templateId}" is not provided by engine "${engine.id}"`,
      );
    }
    const parsed = template.schema.safeParse(payload.props);
    if (!parsed.success) {
      throw new PermanentJobError(`Preview props do not match template "${template.id}"`);
    }
    const props = parsed.data;
    const jobId = `preview-${randomUUID()}`;
    const workDir = path.join(this.deps.workRoot, jobId);
    const metadata = template.resolveMetadata(props);
    const startedAt = Date.now();
    try {
      await mkdir(workDir, { recursive: true });
      const assets = await prepareJobAssets(this.deps, {
        jobId,
        template,
        props,
        frame: metadata,
        workDir,
        signal,
      });
      const outputPath = path.join(workDir, 'preview.jpg');
      await engine.renderStill(
        { jobId, template, props, assets, metadata, encoding: encodingFor(DEFAULT_QUALITY_PRESET) },
        { outputPath, frame: Math.min(payload.frame, metadata.durationInFrames - 1), signal },
      );
      await this.deps.storage.putFile(payload.storageKey, outputPath);
      logger.info('preview frame rendered', { template: template.id, ms: Date.now() - startedAt });
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  }
}
