import {
  MediaAssetDtoSchema,
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

export const mediaApi = {
  upload: (files: readonly File[], options: UploadOptions = {}): Promise<MediaAssetDto[]> => {
    const form = new FormData();
    files.forEach((file) => {
      form.append(UPLOAD_FIELD, file);
    });
    return postJson(z.array(MediaAssetDtoSchema), '/media', form, {
      signal: options.signal,
      timeout: UPLOAD_TIMEOUT_MS,
      onUploadProgress: (event) => {
        options.onProgress?.(event.total ? event.loaded / event.total : 0);
      },
    });
  },

  get: (id: string, options: RequestOptions = {}): Promise<MediaAssetDto> =>
    getJson(MediaAssetDtoSchema, `/media/${id}`, { signal: options.signal }),

  remove: (id: string): Promise<void> => deleteResource(`/media/${id}`),

  /** `peaksUrl` from a DTO is already an absolute path, so the base URL is not prepended. */
  peaks: (peaksUrl: string, options: RequestOptions = {}): Promise<WaveformPeaksDto> =>
    getJson(WaveformPeaksDtoSchema, peaksUrl, { baseURL: '', signal: options.signal }),
};
