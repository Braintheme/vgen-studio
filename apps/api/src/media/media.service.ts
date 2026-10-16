import { rm } from 'node:fs/promises';
import type { Readable } from 'node:stream';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { MediaAssetEntity } from '@vgen/db';
import type {
  BulkDeleteMediaResponse,
  MediaAssetDto,
  MediaCleanupResponse,
  MediaFileVariant,
  MediaInfo,
  MediaLibraryPage,
  MediaLibraryQuery,
} from '@vgen/shared';
import type { StorageService } from '@vgen/storage';
import { QueryFailedError } from 'typeorm';
import { AppError, ConflictError, NotFoundError, ValidationFailedError } from '../common/errors.js';
import { parseRange } from '../common/range.js';
import { STORAGE } from '../storage/storage.module.js';
import { MediaIngestService, type IncomingFile } from './media-ingest.service.js';
import { toMediaDto } from './media.mapper.js';
import { MediaRepository } from './media.repository.js';

export interface MediaFile {
  readonly stream: Readable;
  readonly mime: string;
  readonly size: number;
  readonly fileName: string;
  readonly range: { readonly start: number; readonly end: number } | null;
}

/** Where derivative files are recorded in `MediaAsset.meta`, and how they are served. */
const VARIANTS = {
  preview: { metaKey: 'previewKey', mime: 'image/webp', suffix: 'preview.webp' },
  peaks: { metaKey: 'peaksKey', mime: 'application/json', suffix: 'peaks.json' },
  proxy: { metaKey: 'proxyKey', mime: 'video/mp4', suffix: 'proxy.mp4' },
  filmstrip: { metaKey: 'filmstripKey', mime: 'image/jpeg', suffix: 'filmstrip.jpg' },
} as const satisfies Record<Exclude<MediaFileVariant, 'original'>, unknown>;

/** Postgres `foreign_key_violation` and `restrict_violation` (FKs declared ON DELETE RESTRICT). */
const REFERENCED_ROW_CODES: readonly unknown[] = ['23503', '23001'];

const isReferencedRowError = (error: unknown): boolean =>
  error instanceof QueryFailedError &&
  REFERENCED_ROW_CODES.includes((error.driverError as { code?: unknown }).code);

/** Public API of the media module (other modules use this, never the repository). */
@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    @Inject(STORAGE) private readonly storage: StorageService,
    private readonly repository: MediaRepository,
    private readonly ingest: MediaIngestService,
  ) {}

  async upload(files: readonly IncomingFile[]): Promise<MediaAssetDto[]> {
    if (files.length === 0) {
      throw new ValidationFailedError('No files uploaded (multipart field "files")');
    }
    try {
      const assets: MediaAssetDto[] = [];
      for (const file of files) {
        assets.push(toMediaDto(await this.ingest.ingest(file)));
      }
      return assets;
    } finally {
      await Promise.all(files.map((file) => rm(file.path, { force: true })));
    }
  }

  /** Imports a local file (seeding); unlike uploads, the source file is kept. */
  async importLocalFile(file: IncomingFile): Promise<MediaAssetDto> {
    return toMediaDto(await this.ingest.ingest(file));
  }

  async get(id: string): Promise<MediaAssetDto> {
    return toMediaDto(await this.require(id));
  }

  findMany(ids: readonly string[]): Promise<MediaAssetEntity[]> {
    return this.repository.findByIds(ids);
  }

  /** Media metadata in the shape template media checks expect. */
  async infoMap(ids: readonly string[]): Promise<Map<string, MediaInfo>> {
    const assets = await this.repository.findByIds(ids);
    return new Map(
      assets.map((asset) => [
        asset.id,
        {
          assetId: asset.id,
          kind: asset.kind,
          mime: asset.mime,
          width: asset.width,
          height: asset.height,
          durationSec: asset.durationSec,
        },
      ]),
    );
  }

  async openFile(id: string, variant: MediaFileVariant, rangeHeader: string | undefined): Promise<MediaFile> {
    const asset = await this.require(id);
    const source = this.variantSource(asset, variant);
    const stored = await this.storage.stat(source.key);
    if (!stored) {
      throw new NotFoundError('File of media', id);
    }
    const range = parseRange(rangeHeader, stored.size);
    if (range === 'unsatisfiable') {
      throw new AppError('RANGE_NOT_SATISFIABLE', 416, `Range not satisfiable (size ${stored.size})`);
    }
    return {
      stream: await this.storage.read(source.key, range ?? undefined),
      mime: source.mime,
      size: stored.size,
      fileName: source.fileName,
      range,
    };
  }

  /** An uploaded audio file (for the music library); a 400 otherwise. */
  async requireUploadedAudio(id: string): Promise<MediaAssetEntity> {
    const asset = await this.repository.findById(id);
    if (asset?.kind !== 'audio' || asset.role !== 'upload') {
      throw new ValidationFailedError('Not an uploaded audio file', [
        { path: 'assetId', message: `Media "${id}" is not uploaded audio` },
      ]);
    }
    return asset;
  }

  private variantSource(
    asset: MediaAssetEntity,
    variant: MediaFileVariant,
  ): { key: string; mime: string; fileName: string } {
    if (variant === 'original') {
      return { key: asset.storageKey, mime: asset.mime, fileName: asset.originalName };
    }
    const spec = VARIANTS[variant];
    const key = asset.meta[spec.metaKey];
    if (typeof key !== 'string') {
      throw new NotFoundError(`${variant} of media`, asset.id);
    }
    return { key, mime: spec.mime, fileName: `${asset.id}-${spec.suffix}` };
  }

  /**
   * Deletes an uploaded file. Assets referenced by a music track are protected by the
   * database (FK RESTRICT) and answer 409. Old renders keep their props snapshot; a
   * duplicate of such a render fails later with a clear "media was deleted" error.
   */
  async deleteUpload(id: string): Promise<void> {
    const asset = await this.require(id);
    if (asset.role !== 'upload') {
      throw new ConflictError('Render outputs and thumbnails are deleted together with their render');
    }
    try {
      await this.repository.delete(id);
    } catch (error) {
      if (isReferencedRowError(error)) {
        throw new ConflictError('This file is used by a music track; delete the track first');
      }
      throw error;
    }
    await this.removeFiles(asset);
  }

  /** The library page: uploaded photos and videos, with how many renders use each. */
  async listLibrary(query: MediaLibraryQuery): Promise<MediaLibraryPage> {
    const { items, total, totalBytes } = await this.repository.listLibrary(query);
    const counts = await this.repository.renderCounts(items.map((asset) => asset.id));
    return {
      items: items.map((asset) => ({ ...toMediaDto(asset), renderCount: counts.get(asset.id) ?? 0 })),
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalBytes,
    };
  }

  /** Deletes several uploads; each one that cannot go (e.g. a music track's) is reported. */
  async deleteUploads(ids: readonly string[]): Promise<BulkDeleteMediaResponse> {
    const deleted: string[] = [];
    const failed: { id: string; message: string }[] = [];
    let freedBytes = 0;
    for (const id of new Set(ids)) {
      try {
        const asset = await this.require(id);
        await this.deleteUpload(id);
        deleted.push(id);
        freedBytes += asset.size;
      } catch (error) {
        if (!(error instanceof AppError)) throw error;
        failed.push({ id, message: error.message });
      }
    }
    return { deleted, failed, freedBytes };
  }

  /**
   * Unused photos and videos older than `olderThanDays` (no render uses them, not in `keepIds`):
   * counted, or deleted unless `dryRun`.
   */
  async cleanup(input: {
    readonly olderThanDays: number;
    readonly keepIds: readonly string[];
    readonly dryRun: boolean;
  }): Promise<MediaCleanupResponse> {
    const before = new Date(Date.now() - input.olderThanDays * 24 * 60 * 60 * 1000);
    const unused = await this.repository.findUnused(before, input.keepIds);
    const bytes = unused.reduce((sum, asset) => sum + asset.size, 0);
    if (input.dryRun) return { count: unused.length, bytes, deleted: false };
    const result = await this.deleteUploads(unused.map((asset) => asset.id));
    this.logger.log(`cleanup: ${String(result.deleted.length)} unused uploads deleted`);
    return { count: result.deleted.length, bytes: result.freedBytes, deleted: true };
  }

  /** Deletes generated assets (render output, thumbnail) and their files; for the renders module. */
  async deleteGenerated(ids: readonly string[]): Promise<void> {
    for (const asset of await this.repository.findByIds(ids)) {
      if (asset.role === 'upload') continue;
      await this.repository.delete(asset.id);
      await this.removeFiles(asset);
    }
  }

  /** Files are removed after the row: a leftover file is harmless, a dangling row is not. */
  private async removeFiles(asset: MediaAssetEntity): Promise<void> {
    const derivatives = Object.values(VARIANTS).map((spec) => asset.meta[spec.metaKey]);
    const keys = [asset.storageKey, ...derivatives].filter((key): key is string => typeof key === 'string');
    for (const key of keys) {
      await this.storage.delete(key).catch((error: unknown) => {
        this.logger.warn(`could not delete file ${key}: ${String(error)}`);
      });
    }
  }

  private async require(id: string): Promise<MediaAssetEntity> {
    const asset = await this.repository.findById(id);
    if (!asset) throw new NotFoundError('Media', id);
    return asset;
  }
}
