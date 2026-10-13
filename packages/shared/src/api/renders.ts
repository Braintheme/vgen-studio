import { z } from 'zod';
import { FormatSchema } from '../formats.js';
import { QualityPresetSchema } from '../render/quality.js';
import { RenderStatusSchema } from '../render/status.js';
import { PageQuerySchema } from './pagination.js';

export const CreateRenderRequestSchema = z.object({
  templateId: z.string(),
  /** Props input; missing values are filled from the template defaults. */
  props: z.record(z.string(), z.unknown()),
  quality: QualityPresetSchema.default('social'),
  /** Style preset the props were based on (used for the output file name). */
  presetId: z.uuid().nullable().default(null),
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
  presetId: z.uuid().nullable(),
  outputName: z.string(),
  output: RenderFileDtoSchema.extend({
    downloadUrl: z.string(),
    durationSec: z.number().nullable(),
  }).nullable(),
  thumbnail: RenderFileDtoSchema.nullable(),
  error: z.string().nullable(),
  attempts: z.number().int(),
  startedAt: z.iso.datetime().nullable(),
  finishedAt: z.iso.datetime().nullable(),
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

export const RenderListQuerySchema = PageQuerySchema.extend({
  status: RenderStatusSchema.optional(),
  templateId: z.string().optional(),
  engine: z.string().optional(),
});
export type RenderListQuery = z.infer<typeof RenderListQuerySchema>;
