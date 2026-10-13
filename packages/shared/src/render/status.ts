import { z } from 'zod';

export const RENDER_STATUSES = ['queued', 'rendering', 'done', 'failed', 'cancelled'] as const;
export const RenderStatusSchema = z.enum(RENDER_STATUSES);
export type RenderStatus = z.infer<typeof RenderStatusSchema>;

export const FINAL_RENDER_STATUSES: readonly RenderStatus[] = ['done', 'failed', 'cancelled'];

export const isFinalRenderStatus = (status: RenderStatus): boolean => FINAL_RENDER_STATUSES.includes(status);

/** What a stored media asset is used for; orthogonal to its media kind. */
export const MEDIA_ROLES = ['upload', 'render_output', 'thumbnail', 'derivative'] as const;
export type MediaRole = (typeof MEDIA_ROLES)[number];
