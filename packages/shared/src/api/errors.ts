import { z } from 'zod';

export const API_ERROR_CODES = [
  'VALIDATION_FAILED',
  'NOT_FOUND',
  'CONFLICT',
  'PAYLOAD_TOO_LARGE',
  'UNSUPPORTED_MEDIA_TYPE',
  'RANGE_NOT_SATISFIABLE',
  'UNAUTHORIZED',
  'FORBIDDEN',
  /** The engine could not render (e.g. a preview frame); the message says why. */
  'RENDER_FAILED',
  /** No render worker answered in time (not running, or busy). */
  'WORKER_UNAVAILABLE',
  'INTERNAL',
] as const;
export const ApiErrorCodeSchema = z.enum(API_ERROR_CODES);
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;

export const ApiErrorDetailSchema = z.object({
  /** Dot path of the offending field, e.g. `props.media.before`. Empty for general issues. */
  path: z.string(),
  message: z.string(),
});
export type ApiErrorDetail = z.infer<typeof ApiErrorDetailSchema>;

/** The single error envelope every API endpoint uses. */
export const ApiErrorSchema = z.object({
  error: z.object({
    code: ApiErrorCodeSchema,
    message: z.string(),
    details: z.array(ApiErrorDetailSchema).optional(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
