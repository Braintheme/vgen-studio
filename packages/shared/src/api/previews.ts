import { z } from 'zod';

/** A preview frame of a template with the given props (engines without a browser player). */
export const CreatePreviewRequestSchema = z.object({
  templateId: z.string(),
  props: z.record(z.string(), z.unknown()),
  /** Frame to render; the template's poster frame when omitted. */
  frame: z.number().int().min(0).optional(),
});
export type CreatePreviewRequest = z.infer<typeof CreatePreviewRequestSchema>;

export const PreviewDtoSchema = z.object({
  /** JPEG of the frame; the same props always give the same URL (cached). */
  url: z.string(),
  frame: z.number().int(),
  width: z.number().int(),
  height: z.number().int(),
});
export type PreviewDto = z.infer<typeof PreviewDtoSchema>;

/** Preview file names are content hashes. */
export const PreviewKeySchema = z.string().regex(/^[a-f0-9]{64}$/);
