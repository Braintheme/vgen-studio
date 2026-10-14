import { z } from 'zod';
import { MEDIA_KINDS } from '../template/media-slots.js';
import { MEDIA_ROLES } from '../render/status.js';

/** Upload whitelist (by detected type, not by file extension). */
export const UPLOAD_MIME_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/webp'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a', 'audio/aac'],
  video: ['video/mp4', 'video/quicktime'],
} as const;

/** A strip of evenly spaced video frames in one image (scrubbing and trimming UI). */
export const FilmstripDtoSchema = z.object({
  url: z.string(),
  frames: z.number().int().min(1),
  frameWidth: z.number().int(),
  frameHeight: z.number().int(),
  /** Time of frame `i` is `(i + 0.5) * intervalSec`. */
  intervalSec: z.number(),
});
export type FilmstripDto = z.infer<typeof FilmstripDtoSchema>;

/** Video-only details of a media asset. */
export const VideoInfoDtoSchema = z.object({
  fps: z.number(),
  hasAudio: z.boolean(),
  /** Light H.264 copy (~720 p, dense keyframes) for browser previews and scrubbing. */
  proxyUrl: z.string().nullable(),
  filmstrip: FilmstripDtoSchema.nullable(),
});
export type VideoInfoDto = z.infer<typeof VideoInfoDtoSchema>;

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
  /**
   * Lightweight preview: ~1600 px WebP with EXIF orientation applied (images), a poster
   * frame of the same kind (videos).
   */
  previewUrl: z.string().nullable(),
  /** Waveform peaks JSON (audio only), see WaveformPeaksDto. */
  peaksUrl: z.string().nullable(),
  video: VideoInfoDtoSchema.nullable(),
});
export type MediaAssetDto = z.infer<typeof MediaAssetDtoSchema>;

export const MEDIA_FILE_VARIANTS = ['original', 'preview', 'peaks', 'proxy', 'filmstrip'] as const;
export type MediaFileVariant = (typeof MEDIA_FILE_VARIANTS)[number];

export const MediaFileQuerySchema = z.object({
  variant: z.enum(MEDIA_FILE_VARIANTS).default('original'),
  /** `1` -> `Content-Disposition: attachment`. */
  download: z.stringbool().default(false),
});

export const WaveformPeaksDtoSchema = z.object({
  /** Normalized 0..1 amplitude per bucket. */
  peaks: z.array(z.number().min(0).max(1)),
  durationSec: z.number(),
});
export type WaveformPeaksDto = z.infer<typeof WaveformPeaksDtoSchema>;
