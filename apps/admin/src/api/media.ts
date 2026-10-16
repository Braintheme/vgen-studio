import {
  BulkDeleteMediaResponseSchema,
  MAX_UPLOAD_FILES_PER_REQUEST,
  MediaAssetDtoSchema,
  MediaCleanupResponseSchema,
  MediaLibraryPageSchema,
  type BulkDeleteMediaResponse,
  type MediaCleanupRequest,
  type MediaCleanupResponse,
  type MediaLibraryPage,
  type MediaLibraryQuery,
  WaveformPeaksDtoSchema,
  type MediaAssetDto,
  type WaveformPeaksDto,
} from '@vgen/shared';
import { z } from 'zod';
import { UPLOAD_TIMEOUT_MS } from './config';
import { deleteResource, getJson, postJson, type RequestOptions } from './http';

export interface UploadOptions extends RequestOptions {
  /** Upload progress in the 0..1 range. */
  readonly onProgress?: (fraction: number) => void;
}

/** Multipart field name expected by `POST /media`. */
const UPLOAD_FIELD = 'files';

/** One `POST /media` request (at most `MAX_UPLOAD_FILES_PER_REQUEST` files). */
const uploadBatch = (
  files: readonly File[],
  options: UploadOptions,
  onBatchProgress: (loaded: number) => void,
): Promise<MediaAssetDto[]> => {
  const form = new FormData();
  files.forEach((file) => {
    form.append(UPLOAD_FIELD, file);
  });
  return postJson(z.array(MediaAssetDtoSchema), '/media', form, {
    signal: options.signal,
    timeout: UPLOAD_TIMEOUT_MS,
    onUploadProgress: (event) => {
      onBatchProgress(event.loaded);
    },
  });
};

export const mediaApi = {
  /**
   * Uploads any number of files: larger selections go in batches the API accepts, one after
   * another; progress covers all of them (by bytes) and the assets come back in file order.
   */
  upload: async (files: readonly File[], options: UploadOptions = {}): Promise<MediaAssetDto[]> => {
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0) || 1;
    const assets: MediaAssetDto[] = [];
    let doneBytes = 0;
    for (let start = 0; start < files.length; start += MAX_UPLOAD_FILES_PER_REQUEST) {
      const batch = files.slice(start, start + MAX_UPLOAD_FILES_PER_REQUEST);
      const batchBytes = batch.reduce((sum, file) => sum + file.size, 0);
      assets.push(
        ...(await uploadBatch(batch, options, (loaded) => {
          options.onProgress?.(Math.min(1, (doneBytes + Math.min(loaded, batchBytes)) / totalBytes));
        })),
      );
      doneBytes += batchBytes;
    }
    return assets;
  },

  get: (id: string, options: RequestOptions = {}): Promise<MediaAssetDto> =>
    getJson(MediaAssetDtoSchema, `/media/${id}`, { signal: options.signal }),

  remove: (id: string): Promise<void> => deleteResource(`/media/${id}`),

  /** The library: uploaded photos and videos with how many renders use each. */
  list: (query: MediaLibraryQuery, options: RequestOptions = {}): Promise<MediaLibraryPage> =>
    getJson(MediaLibraryPageSchema, '/media', { params: query, signal: options.signal }),

  removeMany: (ids: readonly string[]): Promise<BulkDeleteMediaResponse> =>
    postJson(BulkDeleteMediaResponseSchema, '/media/bulk-delete', { ids }),

  /** Counts (`dryRun`) or deletes the unused photos and videos older than N days. */
  cleanup: (request: MediaCleanupRequest): Promise<MediaCleanupResponse> =>
    postJson(MediaCleanupResponseSchema, '/media/cleanup', request),

  /** `peaksUrl` from a DTO is already an absolute path, so the base URL is not prepended. */
  peaks: (peaksUrl: string, options: RequestOptions = {}): Promise<WaveformPeaksDto> =>
    getJson(WaveformPeaksDtoSchema, peaksUrl, { baseURL: '', signal: options.signal }),
};
