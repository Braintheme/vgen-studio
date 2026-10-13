import { z } from 'zod';
import { RenderStatusSchema } from './status.js';

/** Redis pub/sub channel with render status/progress events (worker -> API -> SSE). */
export const RENDER_EVENTS_CHANNEL = 'vgen:render-events';

/** Redis pub/sub channel with cancel requests (API -> workers). */
export const RENDER_CANCEL_CHANNEL = 'vgen:render-cancel';

const ProgressSchema = z.number().int().min(0).max(100);

export const RenderEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('status'),
    jobId: z.uuid(),
    status: RenderStatusSchema,
    progress: ProgressSchema,
    error: z.string().nullable(),
    at: z.iso.datetime(),
  }),
  z.object({
    type: z.literal('progress'),
    jobId: z.uuid(),
    progress: ProgressSchema,
    at: z.iso.datetime(),
  }),
]);
export type RenderEvent = z.infer<typeof RenderEventSchema>;

export const RenderCancelMessageSchema = z.object({ jobId: z.uuid() });
export type RenderCancelMessage = z.infer<typeof RenderCancelMessageSchema>;
