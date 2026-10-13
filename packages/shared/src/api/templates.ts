import { z } from 'zod';
import { FormatSchema } from '../formats.js';

export const MediaSlotDtoSchema = z.object({
  key: z.string(),
  kind: z.enum(['image', 'video']),
  label: z.string(),
  description: z.string().optional(),
  required: z.boolean(),
  multiple: z.object({ min: z.number().int(), max: z.number().int() }).optional(),
});

export const UiHintsDtoSchema = z.object({
  groups: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        fields: z.array(z.string()),
        collapsed: z.boolean().optional(),
      }),
    )
    .optional(),
  slotActions: z
    .array(z.object({ type: z.literal('swap'), slots: z.tuple([z.string(), z.string()]), label: z.string() }))
    .optional(),
  hiddenFields: z.array(z.string()).optional(),
});

export const TemplateSummaryDtoSchema = z.object({
  id: z.string(),
  engine: z.string(),
  version: z.string(),
  name: z.string(),
  description: z.string(),
  thumbnailUrl: z.string().nullable(),
  formats: z.array(FormatSchema),
  mediaSlots: z.array(MediaSlotDtoSchema),
});
export type TemplateSummaryDto = z.infer<typeof TemplateSummaryDtoSchema>;

export const TemplateDetailDtoSchema = TemplateSummaryDtoSchema.extend({
  /** JSON Schema (draft 2020-12) of the props input, including field metadata (scope, widget...). */
  propsSchema: z.record(z.string(), z.unknown()),
  /** Fully resolved default props, without media. */
  defaults: z.record(z.string(), z.unknown()),
  ui: UiHintsDtoSchema.nullable(),
});
export type TemplateDetailDto = z.infer<typeof TemplateDetailDtoSchema>;

export const TemplateListQuerySchema = z.object({ engine: z.string().optional() });
