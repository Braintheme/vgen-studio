import { z } from 'zod';
import { MEDIA_KINDS } from '../template/media-slots.js';
import { MEDIA_ROLES } from '../render/status.js';
import { PageQuerySchema, paginated } from './pagination.js';

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

/** Files one `POST /media` request accepts; clients upload larger selections in batches. */
export const MAX_UPLOAD_FILES_PER_REQUEST = 10;

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

// ---------------------------------------------------------------------------------------------
// Media library (the admin's "Media" page): uploaded photos and videos, their use, cleanup.

/** Kinds the library lists (music has its own page). */
export const LIBRARY_MEDIA_KINDS = ['image', 'video'] as const;
export const MEDIA_LIBRARY_SORTS = ['newest', 'oldest', 'largest'] as const;

export const MediaLibraryQuerySchema = PageQuerySchema.extend({
  kind: z.enum(LIBRARY_MEDIA_KINDS).optional(),
  sort: z.enum(MEDIA_LIBRARY_SORTS).default('newest'),
});
export type MediaLibraryQuery = z.infer<typeof MediaLibraryQuerySchema>;

export const MediaLibraryItemDtoSchema = MediaAssetDtoSchema.extend({
  /** Renders whose settings use this file (they keep their video; re-rendering them needs it). */
  renderCount: z.number().int().min(0),
});
export type MediaLibraryItemDto = z.infer<typeof MediaLibraryItemDtoSchema>;

export const MediaLibraryPageSchema = paginated(MediaLibraryItemDtoSchema).extend({
  /** Size of every listed file (all pages), bytes. */
  totalBytes: z.number().int().min(0),
});
export type MediaLibraryPage = z.infer<typeof MediaLibraryPageSchema>;

export const BulkDeleteMediaRequestSchema = z.object({ ids: z.array(z.uuid()).min(1).max(500) });
export type BulkDeleteMediaRequest = z.infer<typeof BulkDeleteMediaRequestSchema>;

export const BulkDeleteMediaResponseSchema = z.object({
  deleted: z.array(z.uuid()),
  failed: z.array(z.object({ id: z.uuid(), message: z.string() })),
  freedBytes: z.number().int().min(0),
});
export type BulkDeleteMediaResponse = z.infer<typeof BulkDeleteMediaResponseSchema>;

/**
 * "Delete unused files older than N days": photos and videos no render uses and no draft holds
 * (drafts live in the admin, which sends their files as `keepIds`). `dryRun` only counts.
 */
export const MediaCleanupRequestSchema = z.object({
  olderThanDays: z.number().int().min(0).max(3650),
  keepIds: z.array(z.uuid()).max(5000).default([]),
  dryRun: z.boolean().default(true),
});
export type MediaCleanupRequest = z.input<typeof MediaCleanupRequestSchema>;

export const MediaCleanupResponseSchema = z.object({
  count: z.number().int().min(0),
  bytes: z.number().int().min(0),
  deleted: z.boolean(),
});
export type MediaCleanupResponse = z.infer<typeof MediaCleanupResponseSchema>;
