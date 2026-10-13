import { z } from 'zod';
import { MEDIA_KINDS } from '../template/media-slots.js';
import { MEDIA_ROLES } from '../render/status.js';

/** Upload whitelist (by detected type, not by file extension). */
export const UPLOAD_MIME_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/webp'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a', 'audio/aac'],
} as const;

export const MediaAssetDtoSchema = z.object({
  id: z.uuid(),
  kind: z.enum(MEDIA_KINDS),
  role: z.enum(MEDIA_ROLES),
  originalName: z.string(),
  mime: z.string(),
  size: z.number().int(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  durationSec: z.number().nullable(),
  createdAt: z.iso.datetime(),
  /** Original file (supports HTTP Range). */
  url: z.string(),
  /** Lightweight preview (images only): ~1600 px WebP with EXIF orientation applied. */
  previewUrl: z.string().nullable(),
  /** Waveform peaks JSON (audio only), see WaveformPeaksDto. */
  peaksUrl: z.string().nullable(),
});
export type MediaAssetDto = z.infer<typeof MediaAssetDtoSchema>;

export const MediaFileQuerySchema = z.object({
  variant: z.enum(['original', 'preview', 'peaks']).default('original'),
  /** `1` -> `Content-Disposition: attachment`. */
  download: z.stringbool().default(false),
});

export const WaveformPeaksDtoSchema = z.object({
  /** Normalized 0..1 amplitude per bucket. */
  peaks: z.array(z.number().min(0).max(1)),
  durationSec: z.number(),
});
export type WaveformPeaksDto = z.infer<typeof WaveformPeaksDtoSchema>;
