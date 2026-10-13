import { z } from 'zod';

/**
 * One queue per engine. BullMQ forbids `:` in queue names, hence `render-<engine>`
 * rather than `render:<engine>`.
 */
export const renderQueueName = (engineId: string): string => `render-${engineId}`;

export const RenderJobPayloadSchema = z.object({ renderJobId: z.uuid() });
export type RenderJobPayload = z.infer<typeof RenderJobPayloadSchema>;

/** BullMQ job names on an engine queue. */
export const RENDER_JOB_NAMES = {
  /** A full render tracked in the database (payload: RenderJobPayload). */
  render: 'render',
  /** A single preview frame for engines without a browser player (payload: PreviewJobPayload). */
  preview: 'preview',
} as const;

/**
 * Queue priorities (lower runs first). Previews are small and someone is waiting for
 * them, so they go before queued renders.
 */
export const RENDER_JOB_PRIORITY = { preview: 1, render: 10 } as const;

export const PreviewJobPayloadSchema = z.object({
  templateId: z.string(),
  /** Props input; validated by the worker against the template schema. */
  props: z.record(z.string(), z.unknown()),
  frame: z.number().int().min(0),
  /** Where the worker stores the JPEG. */
  storageKey: z.string(),
});
export type PreviewJobPayload = z.infer<typeof PreviewJobPayloadSchema>;
