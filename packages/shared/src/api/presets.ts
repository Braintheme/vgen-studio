import { z } from 'zod';

export const StylePresetDtoSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  templateId: z.string(),
  templateVersion: z.string(),
  /** Style-scoped props only (content fields are never stored in presets). */
  props: z.record(z.string(), z.unknown()),
  isDefault: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type StylePresetDto = z.infer<typeof StylePresetDtoSchema>;

const NameSchema = z.string().trim().min(1).max(256);

export const CreateStylePresetRequestSchema = z.object({
  name: NameSchema,
  templateId: z.string(),
  /** Props (or settings) to take the style from; content fields are stripped server-side. */
  props: z.record(z.string(), z.unknown()),
});
export type CreateStylePresetRequest = z.infer<typeof CreateStylePresetRequestSchema>;

export const UpdateStylePresetRequestSchema = z
  .object({ name: NameSchema.optional(), props: z.record(z.string(), z.unknown()).optional() })
  .refine((value) => value.name !== undefined || value.props !== undefined, 'Nothing to update');
export type UpdateStylePresetRequest = z.infer<typeof UpdateStylePresetRequestSchema>;

export const StylePresetListQuerySchema = z.object({ templateId: z.string().optional() });
export type StylePresetListQuery = z.infer<typeof StylePresetListQuerySchema>;
