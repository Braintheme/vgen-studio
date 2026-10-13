import { z } from 'zod';
import { FormatSchema, FpsSchema } from '../formats.js';

export const EngineDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  capabilities: z.object({
    formats: z.array(FormatSchema),
    fps: z.array(FpsSchema),
    codecs: z.array(z.literal('h264')),
    audio: z.boolean(),
    maxDurationSec: z.number(),
    browserPreview: z.boolean(),
  }),
  templateCount: z.number().int(),
});
export type EngineDto = z.infer<typeof EngineDtoSchema>;
