import { z } from 'zod';
import { FormatSchema } from '../formats.js';
import { DEFAULT_STILL_SCALE, QualityPresetSchema, StillScaleSchema } from '../render/quality.js';
import { RenderStatusSchema } from '../render/status.js';
import { PageQuerySchema } from './pagination.js';

export const CreateRenderRequestSchema = z.object({
  templateId: z.string(),
  /** Props input; missing values are filled from the template defaults. */
  props: z.record(z.string(), z.unknown()),
  quality: QualityPresetSchema.default('social'),
  /** Image outputs only: 2 renders the images at twice the format's size. */
  scale: StillScaleSchema.default(DEFAULT_STILL_SCALE),
  /** Style preset the props were based on (used for the output file name). */
  presetId: z.uuid().nullable().default(null),
  /** Project the render was made from, if any. */
  projectId: z.uuid().nullable().default(null),
});
export type CreateRenderRequest = z.input<typeof CreateRenderRequestSchema>;

export const MediaWarningDtoSchema = z.object({
  code: z.string(),
  message: z.string(),
  severity: z.enum(['info', 'warning']),
  slots: z.array(z.string()).optional(),
});

export const RenderFileDtoSchema = z.object({
  assetId: z.uuid(),
  url: z.string(),
  size: z.number().int(),
});
export type RenderFileDto = z.infer<typeof RenderFileDtoSchema>;

export const RenderJobDtoSchema = z.object({
  id: z.uuid(),
  status: RenderStatusSchema,
  progress: z.number().int().min(0).max(100),
  engine: z.string(),
  engineVersion: z.string().nullable(),
  templateId: z.string(),
  templateVersion: z.string(),
  props: z.record(z.string(), z.unknown()),
  format: FormatSchema,
  quality: QualityPresetSchema,
  scale: StillScaleSchema,
  presetId: z.uuid().nullable(),
  /** Project the render was made from; null for quick renders or deleted projects. */
  projectId: z.uuid().nullable(),
  outputName: z.string(),
  output: RenderFileDtoSchema.extend({
    downloadUrl: z.string(),
    durationSec: z.number().nullable(),
  }).nullable(),
  /** Image outputs (templates with `output: 'stills'`): the slides in order, plus a ZIP of all. */
  stills: z
    .object({
      slides: z.array(
        RenderFileDtoSchema.extend({
          name: z.string(),
          downloadUrl: z.string(),
          width: z.number().int().nullable(),
          height: z.number().int().nullable(),
        }),
      ),
      archiveUrl: z.string(),
    })
    .nullable(),
  thumbnail: RenderFileDtoSchema.nullable(),
  error: z.string().nullable(),
  attempts: z.number().int(),
  startedAt: z.iso.datetime().nullable(),
  finishedAt: z.iso.datetime().nullable(),
  /** Last time the owner saved the output from the admin; `null` = never. */
  downloadedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});
export type RenderJobDto = z.infer<typeof RenderJobDtoSchema>;

export const CreateRenderResponseSchema = RenderJobDtoSchema.extend({
  /** Non-blocking media checks from the template (e.g. aspect ratio mismatch). */
  warnings: z.array(MediaWarningDtoSchema),
});
export type CreateRenderResponse = z.infer<typeof CreateRenderResponseSchema>;

export const DuplicateRenderResponseSchema = CreateRenderResponseSchema.extend({
  /** True when the template changed since the original render (output may differ). */
  templateVersionChanged: z.boolean(),
});
export type DuplicateRenderResponse = z.infer<typeof DuplicateRenderResponseSchema>;

export const DOWNLOADED_FILTERS = ['yes', 'no'] as const;
export type DownloadedFilter = (typeof DOWNLOADED_FILTERS)[number];

/** Which renders a list, a day count or a selection covers (the table's filters). */
export const RenderScopeSchema = z.object({
  status: RenderStatusSchema.optional(),
  templateId: z.string().optional(),
  engine: z.string().optional(),
  downloaded: z.enum(DOWNLOADED_FILTERS).optional(),
});
export type RenderScope = z.infer<typeof RenderScopeSchema>;

export const RenderListQuerySchema = PageQuerySchema.extend(RenderScopeSchema.shape);
export type RenderListQuery = z.infer<typeof RenderListQuerySchema>;

const isTimeZone = (value: string): boolean => {
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
    return true;
  } catch {
    return false;
  }
};

/** An IANA time zone name, e.g. `Europe/Kyiv`: days are calendar days there. */
export const TimeZoneSchema = z.string().min(1).max(64).refine(isTimeZone, 'Unknown time zone');

/** A calendar day, `YYYY-MM-DD`. */
export const DayKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const RenderDaysQuerySchema = RenderScopeSchema.extend({ tz: TimeZoneSchema });
export type RenderDaysQuery = z.infer<typeof RenderDaysQuerySchema>;

/** One calendar day of renders, counted over every page. */
export const RenderDayDtoSchema = z.object({
  date: DayKeySchema,
  total: z.number().int().min(0),
  /** Done renders (the ones with a file to save). */
  ready: z.number().int().min(0),
  /** Done renders never downloaded. */
  notDownloaded: z.number().int().min(0),
});
export type RenderDayDto = z.infer<typeof RenderDayDtoSchema>;

/** Most renders one selection request returns. */
export const READY_RENDERS_LIMIT = 500;

/** Done renders in a scope, optionally of one day: what "select the day" picks. */
export const RenderReadyQuerySchema = RenderDaysQuerySchema.extend({ day: DayKeySchema.optional() });
export type RenderReadyQuery = z.infer<typeof RenderReadyQuerySchema>;

export const MarkRendersDownloadedRequestSchema = z.object({
  ids: z.array(z.uuid()).min(1).max(READY_RENDERS_LIMIT),
});
export type MarkRendersDownloadedRequest = z.infer<typeof MarkRendersDownloadedRequestSchema>;
